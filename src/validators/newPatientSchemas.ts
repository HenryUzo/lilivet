import { z } from "zod";
import { dateStringSchema, optionalEmailSchema, petSexSchema, petSpeciesSchema, phoneSchema, timezoneSchema, weightSchema } from "./common";

export const createNewPatientRequestSchema = z.object({
  owner: z.object({
    fullName: z.string().trim().min(1).max(200),
    email: optionalEmailSchema,
    phoneNumber: phoneSchema
  }),
  visit: z.object({
    reasonForVisit: z.string().trim().min(1).max(5000),
    isUrgent: z.coerce.boolean().default(false),
    preferredDateTime: dateStringSchema.optional(),
    timezone: timezoneSchema.optional(),
    previousVetClinic: z.string().trim().max(200).optional(),
    consentToElectronicComms: z.coerce.boolean().default(false)
  }),
  pet: z.object({
    petName: z.string().trim().min(1).max(100),
    species: petSpeciesSchema,
    breed: z.string().trim().max(100).optional(),
    age: z.string().trim().max(80).optional(),
    sex: petSexSchema,
    weightLbs: weightSchema,
    spayedNeutered: z.coerce.boolean().optional(),
    currentMedications: z.string().trim().max(2000).optional(),
    existingConditions: z.string().trim().max(2000).optional()
  }),
  uploadedFileIds: z.array(z.string().min(1)).optional().default([])
});

export type CreateNewPatientRequestInput = z.infer<typeof createNewPatientRequestSchema>;
