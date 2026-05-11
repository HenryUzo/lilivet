import { PrismaClient, type Owner, type Pet, type Prisma } from "@prisma/client";
import { normalizePhoneNumber } from "../src/utils/phone";

const prisma = new PrismaClient();

type OwnerWithRelations = Owner & {
  pets: Pet[];
  _count: {
    appointmentRequests: number;
    newPatientRequests: number;
  };
};

type Args = {
  apply: boolean;
  phone?: string;
};

function parseArgs(argv: string[]): Args {
  const apply = argv.includes("--apply");
  const phoneArg = argv.find((value) => value.startsWith("--phone="));
  const phone = phoneArg ? normalizePhoneNumber(phoneArg.slice("--phone=".length)) : undefined;
  return { apply, phone };
}

function hasValue<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function summarizeOwner(owner: OwnerWithRelations) {
  return {
    id: owner.id,
    createdAt: owner.createdAt.toISOString(),
    firstName: owner.firstName,
    lastName: owner.lastName,
    email: owner.email,
    phoneNumber: owner.phoneNumber,
    normalizedPhone: owner.normalizedPhone,
    preferredContactMethod: owner.preferredContactMethod,
    petCount: owner.pets.length,
    appointmentRequestCount: owner._count.appointmentRequests,
    newPatientRequestCount: owner._count.newPatientRequests,
    pets: owner.pets.map((pet) => ({
      id: pet.id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      approximateAgeYears: pet.approximateAgeYears,
      age: pet.age,
      sex: pet.sex
    }))
  };
}

async function getDuplicateNormalizedPhones(targetPhone?: string) {
  const rows = await prisma.$queryRaw<Array<{ normalizedPhone: string; duplicateCount: bigint }>>`
    SELECT "normalizedPhone", COUNT(*)::bigint AS "duplicateCount"
    FROM "Owner"
    WHERE "normalizedPhone" IS NOT NULL
      AND (${targetPhone ?? null}::text IS NULL OR "normalizedPhone" = ${targetPhone ?? null})
    GROUP BY "normalizedPhone"
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC, "normalizedPhone" ASC
  `;

  return rows.map((row) => ({
    normalizedPhone: row.normalizedPhone,
    duplicateCount: Number(row.duplicateCount)
  }));
}

async function getOwnersForPhone(normalizedPhone: string) {
  return prisma.owner.findMany({
    where: { normalizedPhone },
    include: {
      pets: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }]
      },
      _count: {
        select: {
          appointmentRequests: true,
          newPatientRequests: true
        }
      }
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }]
  });
}

function buildAuditOutput(normalizedPhone: string, owners: OwnerWithRelations[]) {
  const [canonicalOwner, ...duplicateOwners] = owners;

  return {
    normalizedPhone,
    canonicalOwnerId: canonicalOwner?.id ?? null,
    canonicalOwnerCreatedAt: canonicalOwner?.createdAt.toISOString() ?? null,
    ownerCount: owners.length,
    owners: owners.map(summarizeOwner),
    mergePlan: duplicateOwners.map((owner) => ({
      sourceOwnerId: owner.id,
      targetOwnerId: canonicalOwner.id,
      appointmentRequestsToMove: owner._count.appointmentRequests,
      newPatientRequestsToMove: owner._count.newPatientRequests,
      petsToReview: owner.pets.length
    }))
  };
}

function buildOwnerUpdate(canonicalOwner: Owner, duplicateOwners: Owner[]): Prisma.OwnerUpdateInput {
  const ownerUpdate: Prisma.OwnerUpdateInput = {};

  if (!canonicalOwner.email) {
    const email = duplicateOwners.map((owner) => owner.email).find(hasValue);
    if (email) {
      ownerUpdate.email = email;
    }
  }

  if (!canonicalOwner.preferredContactMethod) {
    const preferredContactMethod = duplicateOwners
      .map((owner) => owner.preferredContactMethod)
      .find(hasValue);
    if (preferredContactMethod) {
      ownerUpdate.preferredContactMethod = preferredContactMethod;
    }
  }

  return ownerUpdate;
}

function buildPetUpdate(canonicalPet: Pet, duplicatePet: Pet): Prisma.PetUpdateInput {
  const petUpdate: Prisma.PetUpdateInput = {};

  if (!canonicalPet.breed && duplicatePet.breed) {
    petUpdate.breed = duplicatePet.breed;
  }

  if (canonicalPet.approximateAgeYears === null && duplicatePet.approximateAgeYears !== null) {
    petUpdate.approximateAgeYears = duplicatePet.approximateAgeYears;
  }

  if (!canonicalPet.age && duplicatePet.age) {
    petUpdate.age = duplicatePet.age;
  }

  if (canonicalPet.weightLbs === null && duplicatePet.weightLbs !== null) {
    petUpdate.weightLbs = duplicatePet.weightLbs;
  }

  if (canonicalPet.spayedNeutered === null && duplicatePet.spayedNeutered !== null) {
    petUpdate.spayedNeutered = duplicatePet.spayedNeutered;
  }

  if (!canonicalPet.currentMedications && duplicatePet.currentMedications) {
    petUpdate.currentMedications = duplicatePet.currentMedications;
  }

  if (!canonicalPet.existingConditions && duplicatePet.existingConditions) {
    petUpdate.existingConditions = duplicatePet.existingConditions;
  }

  return petUpdate;
}

async function mergeGroup(normalizedPhone: string) {
  const owners = await getOwnersForPhone(normalizedPhone);
  if (owners.length < 2) {
    return {
      normalizedPhone,
      merged: false,
      reason: "No duplicates found"
    };
  }

  const [canonicalOwner, ...duplicateOwners] = owners;

  await prisma.$transaction(async (tx) => {
    const ownerUpdate = buildOwnerUpdate(canonicalOwner, duplicateOwners);
    if (Object.keys(ownerUpdate).length > 0) {
      await tx.owner.update({
        where: { id: canonicalOwner.id },
        data: ownerUpdate
      });
    }

    for (const duplicateOwner of duplicateOwners) {
      const duplicatePets = await tx.pet.findMany({
        where: { ownerId: duplicateOwner.id },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }]
      });

      for (const duplicatePet of duplicatePets) {
        const canonicalPet = await tx.pet.findFirst({
          where: {
            ownerId: canonicalOwner.id,
            species: duplicatePet.species,
            name: { equals: duplicatePet.name, mode: "insensitive" }
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }]
        });

        if (!canonicalPet) {
          await tx.pet.update({
            where: { id: duplicatePet.id },
            data: { ownerId: canonicalOwner.id }
          });
          continue;
        }

        const petUpdate = buildPetUpdate(canonicalPet, duplicatePet);
        if (Object.keys(petUpdate).length > 0) {
          await tx.pet.update({
            where: { id: canonicalPet.id },
            data: petUpdate
          });
        }

        await tx.appointmentRequest.updateMany({
          where: { petId: duplicatePet.id },
          data: { petId: canonicalPet.id }
        });

        await tx.newPatientRequest.updateMany({
          where: { petId: duplicatePet.id },
          data: { petId: canonicalPet.id }
        });

        await tx.pet.delete({
          where: { id: duplicatePet.id }
        });
      }

      await tx.appointmentRequest.updateMany({
        where: { ownerId: duplicateOwner.id },
        data: { ownerId: canonicalOwner.id }
      });

      await tx.newPatientRequest.updateMany({
        where: { ownerId: duplicateOwner.id },
        data: { ownerId: canonicalOwner.id }
      });

      await tx.owner.delete({
        where: { id: duplicateOwner.id }
      });
    }
  });

  const remainingOwners = await getOwnersForPhone(normalizedPhone);

  return {
    normalizedPhone,
    merged: true,
    remainingOwnerCount: remainingOwners.length,
    canonicalOwnerId: remainingOwners[0]?.id ?? null
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const duplicateGroups = await getDuplicateNormalizedPhones(args.phone);

  if (duplicateGroups.length === 0) {
    console.log(JSON.stringify({
      mode: args.apply ? "merge" : "audit",
      duplicateGroups: []
    }, null, 2));
    return;
  }

  if (!args.apply) {
    const audit = [];
    for (const group of duplicateGroups) {
      const owners = await getOwnersForPhone(group.normalizedPhone);
      audit.push(buildAuditOutput(group.normalizedPhone, owners));
    }

    console.log(JSON.stringify({
      mode: "audit",
      duplicateGroups: audit
    }, null, 2));
    return;
  }

  const mergedGroups = [];
  for (const group of duplicateGroups) {
    mergedGroups.push(await mergeGroup(group.normalizedPhone));
  }

  console.log(JSON.stringify({
    mode: "merge",
    mergedGroups
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
