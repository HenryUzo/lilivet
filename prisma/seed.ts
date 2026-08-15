import bcrypt from "bcryptjs";
import {
  AppointmentRequestStatus,
  PetSex,
  PetSpecies,
  PreferredContactMethod,
  PrismaClient,
  StaffRole,
  VisitType,
  WellnessPlanBenefitType,
  WellnessPlanLifeStage,
  WellnessPlanServiceType,
  WellnessPlanSpecies,
  WellnessPlanTier
} from "@prisma/client";
import { env } from "../src/config/env";
import { normalizePhoneNumber } from "../src/utils/phone";

const prisma = new PrismaClient();

type SeedBenefit = {
  label: string;
  benefitType: WellnessPlanBenefitType;
  serviceType?: WellnessPlanServiceType;
  includedQuantity?: number;
  coverageLabel?: string;
  discountPercent?: number;
  creditAmount?: string;
  notes?: string;
};

type SeedPlan = {
  planKey: string;
  species: WellnessPlanSpecies;
  lifeStage: WellnessPlanLifeStage;
  tier: WellnessPlanTier;
  displayName: string;
  enrollmentFee: string;
  monthlyFee: string;
  annualPrice: string;
  benefits: SeedBenefit[];
};

const coreCoverageLabel = "CORE";

const wellnessPlanSeedData: SeedPlan[] = [
  {
    planKey: "PUPPY_ESSENTIAL",
    species: WellnessPlanSpecies.DOG,
    lifeStage: WellnessPlanLifeStage.PUPPY,
    tier: WellnessPlanTier.ESSENTIAL,
    displayName: "Puppy Essential",
    enrollmentFee: "75.00",
    monthlyFee: "45.00",
    annualPrice: "540.00",
    benefits: [
      {
        label: "Comprehensive Wellness Exam",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.COMPREHENSIVE_WELLNESS_EXAM,
        includedQuantity: 2
      },
      {
        label: "Wellness Puppy Exam",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.WELLNESS_PUPPY_EXAM,
        includedQuantity: 3
      },
      {
        label: "Core vaccine series (DHPP, Rabies, Lepto and Bord)",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.DOG_CORE_VACCINE_SERIES,
        coverageLabel: coreCoverageLabel
      },
      {
        label: "Fecal Parasite exams and Deworming",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.FECAL_PARASITE_EXAM_AND_DEWORMING,
        includedQuantity: 2
      },
      {
        label: "Heartworm Testing (Age Appropriate)",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.HEARTWORM_TEST,
        includedQuantity: 1
      }
    ]
  },
  {
    planKey: "PUPPY_COMPLETE",
    species: WellnessPlanSpecies.DOG,
    lifeStage: WellnessPlanLifeStage.PUPPY,
    tier: WellnessPlanTier.COMPLETE,
    displayName: "Puppy Complete",
    enrollmentFee: "75.00",
    monthlyFee: "70.00",
    annualPrice: "840.00",
    benefits: [
      {
        label: "Comprehensive Wellness Exam",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.COMPREHENSIVE_WELLNESS_EXAM,
        includedQuantity: 2
      },
      {
        label: "Wellness Puppy Exam",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.WELLNESS_PUPPY_EXAM,
        includedQuantity: 3
      },
      {
        label: "Core vaccine series (DHPP, Rabies, Lepto and Bord)",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.DOG_CORE_VACCINE_SERIES,
        coverageLabel: coreCoverageLabel
      },
      {
        label: "Fecal Parasite exams and Deworming",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.FECAL_PARASITE_EXAM_AND_DEWORMING,
        includedQuantity: 2
      },
      {
        label: "Heartworm Testing (Age Appropriate)",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.HEARTWORM_TEST,
        includedQuantity: 1
      },
      {
        label: "Early Diagnostic Bloodwork",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.EARLY_DIAGNOSTIC_BLOODWORK,
        includedQuantity: 1
      },
      {
        label: "Spay/Neuter Surgical Credit",
        benefitType: WellnessPlanBenefitType.CREDIT,
        creditAmount: "150.00"
      }
    ]
  },
  {
    planKey: "ADULT_DOG_ESSENTIAL",
    species: WellnessPlanSpecies.DOG,
    lifeStage: WellnessPlanLifeStage.ADULT,
    tier: WellnessPlanTier.ESSENTIAL,
    displayName: "Adult Dog Essential",
    enrollmentFee: "75.00",
    monthlyFee: "45.00",
    annualPrice: "540.00",
    benefits: [
      {
        label: "Comprehensive Wellness Exam",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.COMPREHENSIVE_WELLNESS_EXAM,
        includedQuantity: 2
      },
      {
        // Corrected from the PDF inconsistency that mentioned Fvrcp for adult dogs.
        label: "Core vaccine series (Rabies, DHPP, Lepto, Bordetella)",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.DOG_CORE_VACCINE_SERIES,
        coverageLabel: coreCoverageLabel
      },
      {
        label: "Annual Fecal Parasite exams",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.FECAL_PARASITE_EXAM,
        includedQuantity: 1
      },
      {
        label: "Annual Heartworm Test",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.HEARTWORM_TEST,
        includedQuantity: 1
      },
      {
        label: "Additional Tech Visit",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.TECH_VISIT,
        includedQuantity: 2
      },
      {
        label: "Additional (out of plan) Discounts",
        benefitType: WellnessPlanBenefitType.DISCOUNT,
        discountPercent: 10
      }
    ]
  },
  {
    planKey: "ADULT_DOG_COMPLETE",
    species: WellnessPlanSpecies.DOG,
    lifeStage: WellnessPlanLifeStage.ADULT,
    tier: WellnessPlanTier.COMPLETE,
    displayName: "Adult Dog Complete",
    enrollmentFee: "75.00",
    monthlyFee: "70.00",
    annualPrice: "840.00",
    benefits: [
      {
        label: "Comprehensive Wellness Exam",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.COMPREHENSIVE_WELLNESS_EXAM,
        includedQuantity: 2
      },
      {
        // Corrected from the PDF inconsistency that mentioned Fvrcp for adult dogs.
        label: "Core vaccine series (Rabies, DHPP, Lepto, Bordetella)",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.DOG_CORE_VACCINE_SERIES,
        coverageLabel: coreCoverageLabel
      },
      {
        label: "Annual Fecal Parasite exams",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.FECAL_PARASITE_EXAM,
        includedQuantity: 2
      },
      {
        label: "Annual Heartworm Test",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.HEARTWORM_TEST,
        includedQuantity: 1
      },
      {
        label: "Annual Wellness Bloodwork (CBC/Chem)",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.ANNUAL_WELLNESS_BLOODWORK,
        includedQuantity: 1
      },
      {
        label: "Urinalysis",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.URINALYSIS,
        includedQuantity: 1
      },
      {
        label: "Dental Cleaning Discount",
        benefitType: WellnessPlanBenefitType.DISCOUNT,
        discountPercent: 50
      },
      {
        label: "Additional Tech Visit",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.TECH_VISIT,
        includedQuantity: 4
      },
      {
        label: "Additional (out of plan) Discounts",
        benefitType: WellnessPlanBenefitType.DISCOUNT,
        discountPercent: 15
      }
    ]
  },
  {
    planKey: "KITTEN_ESSENTIAL",
    species: WellnessPlanSpecies.CAT,
    lifeStage: WellnessPlanLifeStage.KITTEN,
    tier: WellnessPlanTier.ESSENTIAL,
    displayName: "Kitten Essential",
    enrollmentFee: "75.00",
    monthlyFee: "45.00",
    annualPrice: "540.00",
    benefits: [
      {
        label: "Comprehensive Wellness Exam",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.COMPREHENSIVE_WELLNESS_EXAM,
        includedQuantity: 2
      },
      {
        label: "Wellness Kitten Exam",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.WELLNESS_KITTEN_EXAM,
        includedQuantity: 4
      },
      {
        label: "Core vaccine series (Fvrcp and Rabies)",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.CAT_CORE_VACCINE_SERIES,
        coverageLabel: coreCoverageLabel
      },
      {
        label: "Fecal Parasite exams and Deworming",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.FECAL_PARASITE_EXAM_AND_DEWORMING,
        includedQuantity: 2
      },
      {
        label: "FeLV/FIV Testing",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.FELV_FIV_TEST,
        includedQuantity: 1
      }
    ]
  },
  {
    planKey: "KITTEN_COMPLETE",
    species: WellnessPlanSpecies.CAT,
    lifeStage: WellnessPlanLifeStage.KITTEN,
    tier: WellnessPlanTier.COMPLETE,
    displayName: "Kitten Complete",
    enrollmentFee: "75.00",
    monthlyFee: "70.00",
    annualPrice: "840.00",
    benefits: [
      {
        label: "Comprehensive Wellness Exam",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.COMPREHENSIVE_WELLNESS_EXAM,
        includedQuantity: 2
      },
      {
        label: "Wellness Kitten Exam",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.WELLNESS_KITTEN_EXAM,
        includedQuantity: 4
      },
      {
        label: "Core vaccine series (Fvrcp and Rabies)",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.CAT_CORE_VACCINE_SERIES,
        coverageLabel: coreCoverageLabel
      },
      {
        label: "Fecal Parasite exams and Deworming",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.FECAL_PARASITE_EXAM_AND_DEWORMING,
        includedQuantity: 2
      },
      {
        label: "FeLV/FIV Testing",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.FELV_FIV_TEST,
        includedQuantity: 1
      },
      {
        label: "Early Diagnostic Bloodwork",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.EARLY_DIAGNOSTIC_BLOODWORK,
        includedQuantity: 1
      },
      {
        label: "Spay/Neuter Surgical Credit",
        benefitType: WellnessPlanBenefitType.CREDIT,
        creditAmount: "150.00"
      }
    ]
  },
  {
    planKey: "ADULT_CAT_ESSENTIAL",
    species: WellnessPlanSpecies.CAT,
    lifeStage: WellnessPlanLifeStage.ADULT,
    tier: WellnessPlanTier.ESSENTIAL,
    displayName: "Adult Cat Essential",
    enrollmentFee: "75.00",
    monthlyFee: "45.00",
    annualPrice: "540.00",
    benefits: [
      {
        label: "Comprehensive Wellness Exam",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.COMPREHENSIVE_WELLNESS_EXAM,
        includedQuantity: 2
      },
      {
        label: "Core vaccine series (Fvrcp and Rabies)",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.CAT_CORE_VACCINE_SERIES,
        coverageLabel: coreCoverageLabel
      },
      {
        label: "Fecal Parasite exams",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.FECAL_PARASITE_EXAM,
        includedQuantity: 1
      },
      {
        label: "Additional (out of plan) Discounts",
        benefitType: WellnessPlanBenefitType.DISCOUNT,
        discountPercent: 10
      }
    ]
  },
  {
    planKey: "ADULT_CAT_COMPLETE",
    species: WellnessPlanSpecies.CAT,
    lifeStage: WellnessPlanLifeStage.ADULT,
    tier: WellnessPlanTier.COMPLETE,
    displayName: "Adult Cat Complete",
    enrollmentFee: "75.00",
    monthlyFee: "70.00",
    annualPrice: "840.00",
    benefits: [
      {
        label: "Comprehensive Wellness Exam",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.COMPREHENSIVE_WELLNESS_EXAM,
        includedQuantity: 2
      },
      {
        label: "Core vaccine series (Fvrcp and Rabies)",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.CAT_CORE_VACCINE_SERIES,
        coverageLabel: coreCoverageLabel
      },
      {
        label: "Fecal Parasite exams",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.FECAL_PARASITE_EXAM,
        includedQuantity: 2
      },
      {
        label: "Annual Wellness Bloodwork (CBC/Chem)",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.ANNUAL_WELLNESS_BLOODWORK,
        includedQuantity: 1
      },
      {
        label: "Urinalysis",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.URINALYSIS,
        includedQuantity: 1
      },
      {
        label: "Blood Pressure Screening",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.BLOOD_PRESSURE_SCREENING,
        includedQuantity: 1
      },
      {
        label: "Dental Cleaning Discount",
        benefitType: WellnessPlanBenefitType.DISCOUNT,
        discountPercent: 50
      },
      {
        label: "Additional Tech Visit",
        benefitType: WellnessPlanBenefitType.SERVICE,
        serviceType: WellnessPlanServiceType.TECH_VISIT,
        includedQuantity: 4
      },
      {
        label: "Additional (out of plan) Discounts",
        benefitType: WellnessPlanBenefitType.DISCOUNT,
        discountPercent: 15
      }
    ]
  }
];

async function seedWellnessPlans() {
  for (const plan of wellnessPlanSeedData) {
    const wellnessPlan = await prisma.wellnessPlan.upsert({
      where: { planKey: plan.planKey },
      update: {
        species: plan.species,
        lifeStage: plan.lifeStage,
        tier: plan.tier,
        displayName: plan.displayName,
        enrollmentFee: plan.enrollmentFee,
        monthlyFee: plan.monthlyFee,
        annualPrice: plan.annualPrice,
        isActive: true
      },
      create: {
        planKey: plan.planKey,
        species: plan.species,
        lifeStage: plan.lifeStage,
        tier: plan.tier,
        displayName: plan.displayName,
        enrollmentFee: plan.enrollmentFee,
        monthlyFee: plan.monthlyFee,
        annualPrice: plan.annualPrice,
        isActive: true
      }
    });

    await prisma.wellnessPlanMilestoneTemplate.deleteMany({
      where: { wellnessPlanId: wellnessPlan.id }
    });
    await prisma.wellnessPlanBenefit.deleteMany({
      where: { wellnessPlanId: wellnessPlan.id }
    });

    for (const [index, benefit] of plan.benefits.entries()) {
      const createdBenefit = await prisma.wellnessPlanBenefit.create({
        data: {
          wellnessPlanId: wellnessPlan.id,
          sortOrder: index + 1,
          label: benefit.label,
          benefitType: benefit.benefitType,
          serviceType: benefit.serviceType,
          includedQuantity: benefit.includedQuantity,
          coverageLabel: benefit.coverageLabel,
          discountPercent: benefit.discountPercent,
          creditAmount: benefit.creditAmount,
          notes: benefit.notes
        }
      });

      if (benefit.benefitType === WellnessPlanBenefitType.SERVICE && benefit.serviceType) {
        await prisma.wellnessPlanMilestoneTemplate.create({
          data: {
            wellnessPlanId: wellnessPlan.id,
            wellnessPlanBenefitId: createdBenefit.id,
            sortOrder: index + 1,
            displayName: benefit.label,
            serviceType: benefit.serviceType,
            isActive: true
          }
        });
      }
    }
  }
}

async function main() {
  const passwordHash = await bcrypt.hash(env.STAFF_SEED_PASSWORD, 12);
  await prisma.staffUser.upsert({
    where: { email: env.STAFF_SEED_EMAIL.toLowerCase() },
    update: {
      passwordHash,
      role: StaffRole.SUPER_ADMIN,
      isActive: true
    },
    create: {
      email: env.STAFF_SEED_EMAIL.toLowerCase(),
      passwordHash,
      role: StaffRole.SUPER_ADMIN,
      isActive: true
    }
  });

  await seedWellnessPlans();

  const owner = await prisma.owner.create({
    data: {
      firstName: "Amara",
      lastName: "Okafor",
      email: "amara.okafor@example.com",
      phoneNumber: "+2348012345678",
      normalizedPhone: normalizePhoneNumber("+2348012345678"),
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
      preferredSelections: [
        {
          date: "2026-05-05T00:00:00.000Z",
          timeSlots: ["09:00", "10:30"]
        }
      ],
      preferredDateSelections: {
        create: [{ dateKey: "2026-05-05" }]
      },
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
