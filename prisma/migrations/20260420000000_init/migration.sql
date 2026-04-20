CREATE TYPE "AppointmentRequestStatus" AS ENUM ('PENDING_REVIEW', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');
CREATE TYPE "VisitType" AS ENUM ('URGENT_CARE', 'WELLNESS_EXAM', 'VACCINATIONS', 'DENTAL_CARE', 'SURGERY', 'DIAGNOSTICS', 'NEW_PATIENT_VISIT', 'OTHER');
CREATE TYPE "PetSpecies" AS ENUM ('DOG', 'CAT');
CREATE TYPE "PetSex" AS ENUM ('MALE', 'FEMALE');
CREATE TYPE "PreferredContactMethod" AS ENUM ('CALL', 'TEXT', 'EMAIL');
CREATE TYPE "FileAttachmentStatus" AS ENUM ('UNATTACHED', 'ATTACHED_TO_DRAFT', 'ATTACHED');

CREATE TABLE "Owner" (
  "id" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT,
  "phoneNumber" TEXT NOT NULL,
  "preferredContactMethod" "PreferredContactMethod",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Owner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Pet" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "species" "PetSpecies" NOT NULL,
  "breed" TEXT,
  "approximateAgeYears" INTEGER,
  "age" TEXT,
  "sex" "PetSex" NOT NULL,
  "weightLbs" DECIMAL(6,2),
  "spayedNeutered" BOOLEAN,
  "currentMedications" TEXT,
  "existingConditions" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppointmentDraft" (
  "id" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "visitType" "VisitType",
  "petName" TEXT,
  "species" "PetSpecies",
  "breed" TEXT,
  "approximateAgeYears" INTEGER,
  "sex" "PetSex",
  "weightLbs" DECIMAL(6,2),
  "firstName" TEXT,
  "lastName" TEXT,
  "email" TEXT,
  "phoneNumber" TEXT,
  "preferredContactMethod" "PreferredContactMethod",
  "selectedDate" TIMESTAMP(3),
  "selectedTimeSlots" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "timezone" TEXT,
  "symptomsOrConcerns" TEXT,
  "currentMedications" TEXT,
  "previousVeterinarian" TEXT,
  "symptomDuration" TEXT,
  "lastCompletedStep" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "appointmentRequestId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppointmentDraft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppointmentRequest" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "petId" TEXT NOT NULL,
  "visitType" "VisitType" NOT NULL,
  "status" "AppointmentRequestStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "selectedDate" TIMESTAMP(3) NOT NULL,
  "selectedTimeSlots" TEXT[],
  "timezone" TEXT NOT NULL,
  "symptomsOrConcerns" TEXT,
  "currentMedications" TEXT,
  "previousVeterinarian" TEXT,
  "symptomDuration" TEXT,
  "possibleDuplicate" BOOLEAN NOT NULL DEFAULT false,
  "duplicateOfId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppointmentRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NewPatientRequest" (
  "id" TEXT NOT NULL,
  "ownerFullName" TEXT NOT NULL,
  "ownerEmail" TEXT,
  "ownerPhoneNumber" TEXT NOT NULL,
  "petName" TEXT NOT NULL,
  "species" "PetSpecies" NOT NULL,
  "breed" TEXT,
  "age" TEXT,
  "sex" "PetSex" NOT NULL,
  "weightLbs" DECIMAL(6,2),
  "spayedNeutered" BOOLEAN,
  "currentMedications" TEXT,
  "existingConditions" TEXT,
  "reasonForVisit" TEXT NOT NULL,
  "isUrgent" BOOLEAN NOT NULL DEFAULT false,
  "preferredDateTime" TIMESTAMP(3),
  "timezone" TEXT,
  "previousVetClinic" TEXT,
  "consentToElectronicComms" BOOLEAN NOT NULL DEFAULT false,
  "ownerId" TEXT,
  "petId" TEXT,
  "possibleDuplicate" BOOLEAN NOT NULL DEFAULT false,
  "duplicateOfId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NewPatientRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UploadedFile" (
  "id" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "storedName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storageProvider" TEXT NOT NULL DEFAULT 'local',
  "storageKey" TEXT NOT NULL,
  "publicUrl" TEXT,
  "attachmentStatus" "FileAttachmentStatus" NOT NULL DEFAULT 'UNATTACHED',
  "expiresAt" TIMESTAMP(3),
  "appointmentDraftId" TEXT,
  "appointmentRequestId" TEXT,
  "newPatientRequestId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Owner_email_idx" ON "Owner"("email");
CREATE INDEX "Owner_phoneNumber_idx" ON "Owner"("phoneNumber");
CREATE INDEX "Pet_ownerId_idx" ON "Pet"("ownerId");
CREATE INDEX "Pet_name_idx" ON "Pet"("name");
CREATE UNIQUE INDEX "AppointmentDraft_sessionToken_key" ON "AppointmentDraft"("sessionToken");
CREATE UNIQUE INDEX "AppointmentDraft_appointmentRequestId_key" ON "AppointmentDraft"("appointmentRequestId");
CREATE INDEX "AppointmentDraft_sessionToken_idx" ON "AppointmentDraft"("sessionToken");
CREATE INDEX "AppointmentDraft_expiresAt_idx" ON "AppointmentDraft"("expiresAt");
CREATE INDEX "AppointmentDraft_submittedAt_idx" ON "AppointmentDraft"("submittedAt");
CREATE INDEX "AppointmentDraft_phoneNumber_idx" ON "AppointmentDraft"("phoneNumber");
CREATE INDEX "AppointmentDraft_email_idx" ON "AppointmentDraft"("email");
CREATE INDEX "AppointmentDraft_petName_idx" ON "AppointmentDraft"("petName");
CREATE INDEX "AppointmentRequest_status_idx" ON "AppointmentRequest"("status");
CREATE INDEX "AppointmentRequest_createdAt_idx" ON "AppointmentRequest"("createdAt");
CREATE INDEX "AppointmentRequest_selectedDate_idx" ON "AppointmentRequest"("selectedDate");
CREATE INDEX "AppointmentRequest_ownerId_idx" ON "AppointmentRequest"("ownerId");
CREATE INDEX "AppointmentRequest_petId_idx" ON "AppointmentRequest"("petId");
CREATE INDEX "AppointmentRequest_duplicateOfId_idx" ON "AppointmentRequest"("duplicateOfId");
CREATE INDEX "NewPatientRequest_createdAt_idx" ON "NewPatientRequest"("createdAt");
CREATE INDEX "NewPatientRequest_preferredDateTime_idx" ON "NewPatientRequest"("preferredDateTime");
CREATE INDEX "NewPatientRequest_ownerEmail_idx" ON "NewPatientRequest"("ownerEmail");
CREATE INDEX "NewPatientRequest_ownerPhoneNumber_idx" ON "NewPatientRequest"("ownerPhoneNumber");
CREATE INDEX "NewPatientRequest_petName_idx" ON "NewPatientRequest"("petName");
CREATE INDEX "NewPatientRequest_ownerId_idx" ON "NewPatientRequest"("ownerId");
CREATE INDEX "NewPatientRequest_petId_idx" ON "NewPatientRequest"("petId");
CREATE INDEX "NewPatientRequest_duplicateOfId_idx" ON "NewPatientRequest"("duplicateOfId");
CREATE INDEX "UploadedFile_attachmentStatus_idx" ON "UploadedFile"("attachmentStatus");
CREATE INDEX "UploadedFile_expiresAt_idx" ON "UploadedFile"("expiresAt");
CREATE INDEX "UploadedFile_appointmentDraftId_idx" ON "UploadedFile"("appointmentDraftId");
CREATE INDEX "UploadedFile_appointmentRequestId_idx" ON "UploadedFile"("appointmentRequestId");
CREATE INDEX "UploadedFile_newPatientRequestId_idx" ON "UploadedFile"("newPatientRequestId");

ALTER TABLE "Pet" ADD CONSTRAINT "Pet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentDraft" ADD CONSTRAINT "AppointmentDraft_appointmentRequestId_fkey" FOREIGN KEY ("appointmentRequestId") REFERENCES "AppointmentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppointmentRequest" ADD CONSTRAINT "AppointmentRequest_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AppointmentRequest" ADD CONSTRAINT "AppointmentRequest_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AppointmentRequest" ADD CONSTRAINT "AppointmentRequest_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "AppointmentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NewPatientRequest" ADD CONSTRAINT "NewPatientRequest_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NewPatientRequest" ADD CONSTRAINT "NewPatientRequest_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NewPatientRequest" ADD CONSTRAINT "NewPatientRequest_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "NewPatientRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_appointmentDraftId_fkey" FOREIGN KEY ("appointmentDraftId") REFERENCES "AppointmentDraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_appointmentRequestId_fkey" FOREIGN KEY ("appointmentRequestId") REFERENCES "AppointmentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_newPatientRequestId_fkey" FOREIGN KEY ("newPatientRequestId") REFERENCES "NewPatientRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
