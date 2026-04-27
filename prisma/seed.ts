import bcrypt from "bcryptjs";
import { AppointmentRequestStatus, PetSex, PetSpecies, PreferredContactMethod, PrismaClient, StaffRole, VisitType } from "@prisma/client";
import { env } from "../src/config/env";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash(env.STAFF_SEED_PASSWORD, 12);
  await prisma.staffUser.upsert({
    where: { email: env.STAFF_SEED_EMAIL.toLowerCase() },
    update: {
      passwordHash,
      role: StaffRole.ADMIN,
      isActive: true
    },
    create: {
      email: env.STAFF_SEED_EMAIL.toLowerCase(),
      passwordHash,
      role: StaffRole.ADMIN,
      isActive: true
    }
  });

  const owner = await prisma.owner.create({
    data: {
      firstName: "Amara",
      lastName: "Okafor",
      email: "amara.okafor@example.com",
      phoneNumber: "+2348012345678",
      preferredContactMethod: PreferredContactMethod.CALL,
      pets: {
        create: {
          name: "Milo",
          species: PetSpecies.DOG,
          breed: "Mixed breed",
          approximateAgeYears: 4,
          sex: PetSex.MALE,
          weightLbs: "38.50"
        }
      }
    },
    include: { pets: true }
  });

  await prisma.appointmentRequest.create({
    data: {
      ownerId: owner.id,
      petId: owner.pets[0].id,
      visitType: VisitType.WELLNESS_EXAM,
      status: AppointmentRequestStatus.PENDING_REVIEW,
      preferredSlots: ["2026-05-05T09:00:00.000Z", "2026-05-05T10:30:00.000Z"],
      timezone: "Africa/Lagos",
      symptomsOrConcerns: "Annual wellness check and updated vaccination review.",
      currentMedications: "None",
      previousVeterinarian: "Greenfields Vet Clinic",
      symptomDuration: "Not applicable"
    }
  });

  await prisma.newPatientRequest.create({
    data: {
      ownerFullName: "Daniel Mensah",
      ownerEmail: "daniel.mensah@example.com",
      ownerPhoneNumber: "+2348098765432",
      reasonForVisit: "New puppy wellness exam and vaccination schedule.",
      isUrgent: false,
      preferredDateTime: new Date("2026-05-07T14:00:00.000Z"),
      timezone: "Africa/Lagos",
      previousVetClinic: "None",
      consentToElectronicComms: true,
      petName: "Luna",
      species: PetSpecies.DOG,
      breed: "Golden Retriever",
      age: "12 weeks",
      sex: PetSex.FEMALE,
      weightLbs: "15.20",
      spayedNeutered: false,
      currentMedications: "None",
      existingConditions: "None known"
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
