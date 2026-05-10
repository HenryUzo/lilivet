-- CreateEnum
CREATE TYPE "WellnessPlanSpecies" AS ENUM ('DOG', 'CAT');

-- CreateEnum
CREATE TYPE "WellnessPlanLifeStage" AS ENUM ('PUPPY', 'KITTEN', 'ADULT');

-- CreateEnum
CREATE TYPE "WellnessPlanTier" AS ENUM ('ESSENTIAL', 'COMPLETE');

-- CreateEnum
CREATE TYPE "WellnessPlanBenefitType" AS ENUM ('SERVICE', 'DISCOUNT', 'CREDIT', 'OPTIONAL_DISCOUNTED_ITEM');

-- CreateEnum
CREATE TYPE "WellnessPlanServiceType" AS ENUM ('COMPREHENSIVE_WELLNESS_EXAM', 'WELLNESS_PUPPY_EXAM', 'WELLNESS_KITTEN_EXAM', 'DOG_CORE_VACCINE_SERIES', 'CAT_CORE_VACCINE_SERIES', 'FECAL_PARASITE_EXAM_AND_DEWORMING', 'FECAL_PARASITE_EXAM', 'HEARTWORM_TEST', 'FELV_FIV_TEST', 'EARLY_DIAGNOSTIC_BLOODWORK', 'ANNUAL_WELLNESS_BLOODWORK', 'URINALYSIS', 'BLOOD_PRESSURE_SCREENING', 'TECH_VISIT');

-- CreateTable
CREATE TABLE "WellnessPlan" (
    "id" TEXT NOT NULL,
    "planKey" TEXT NOT NULL,
    "species" "WellnessPlanSpecies" NOT NULL,
    "lifeStage" "WellnessPlanLifeStage" NOT NULL,
    "tier" "WellnessPlanTier" NOT NULL,
    "displayName" TEXT NOT NULL,
    "enrollmentFee" DECIMAL(10,2) NOT NULL,
    "monthlyFee" DECIMAL(10,2) NOT NULL,
    "annualPrice" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WellnessPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WellnessPlanBenefit" (
    "id" TEXT NOT NULL,
    "wellnessPlanId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "benefitType" "WellnessPlanBenefitType" NOT NULL,
    "serviceType" "WellnessPlanServiceType",
    "includedQuantity" INTEGER,
    "coverageLabel" TEXT,
    "discountPercent" INTEGER,
    "creditAmount" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WellnessPlanBenefit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WellnessPlanMilestoneTemplate" (
    "id" TEXT NOT NULL,
    "wellnessPlanId" TEXT NOT NULL,
    "wellnessPlanBenefitId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "displayName" TEXT NOT NULL,
    "serviceType" "WellnessPlanServiceType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WellnessPlanMilestoneTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WellnessPlan_planKey_key" ON "WellnessPlan"("planKey");

-- CreateIndex
CREATE INDEX "WellnessPlan_species_lifeStage_tier_idx" ON "WellnessPlan"("species", "lifeStage", "tier");

-- CreateIndex
CREATE INDEX "WellnessPlan_isActive_idx" ON "WellnessPlan"("isActive");

-- CreateIndex
CREATE INDEX "WellnessPlanBenefit_wellnessPlanId_sortOrder_idx" ON "WellnessPlanBenefit"("wellnessPlanId", "sortOrder");

-- CreateIndex
CREATE INDEX "WellnessPlanMilestoneTemplate_wellnessPlanId_sortOrder_idx" ON "WellnessPlanMilestoneTemplate"("wellnessPlanId", "sortOrder");

-- CreateIndex
CREATE INDEX "WellnessPlanMilestoneTemplate_wellnessPlanBenefitId_idx" ON "WellnessPlanMilestoneTemplate"("wellnessPlanBenefitId");

-- AddForeignKey
ALTER TABLE "WellnessPlanBenefit" ADD CONSTRAINT "WellnessPlanBenefit_wellnessPlanId_fkey" FOREIGN KEY ("wellnessPlanId") REFERENCES "WellnessPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WellnessPlanMilestoneTemplate" ADD CONSTRAINT "WellnessPlanMilestoneTemplate_wellnessPlanId_fkey" FOREIGN KEY ("wellnessPlanId") REFERENCES "WellnessPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WellnessPlanMilestoneTemplate" ADD CONSTRAINT "WellnessPlanMilestoneTemplate_wellnessPlanBenefitId_fkey" FOREIGN KEY ("wellnessPlanBenefitId") REFERENCES "WellnessPlanBenefit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
