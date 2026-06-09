import { z } from "zod";
import {
  dateStringSchema,
  idParamSchema,
  newPatientReferralSourceSchema,
  optionalEmailSchema,
  petSexSchema,
  petSpeciesSchema,
  phoneSchema,
  referralSourceCaptureTokenSchema,
  timezoneSchema,
  weightSchema
} from "./common";

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

export const captureNewPatientReferralSourceSchema = z.object({
  token: referralSourceCaptureTokenSchema,
  source: newPatientReferralSourceSchema,
  otherText: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal("").transform(() => undefined))
}).superRefine((value, ctx) => {
  if (value.source !== "OTHER") {
    return;
  }

  if (value.otherText && value.otherText.length > 200) {
    ctx.addIssue({
      code: z.ZodIssueCode.too_big,
      maximum: 200,
      inclusive: true,
      path: ["otherText"],
      type: "string",
      message: "Other referral text must be 200 characters or fewer"
    });
  }
});

export const newPatientListQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
  referralSource: z.union([newPatientReferralSourceSchema, z.literal("NOT_CAPTURED")]).optional()
});

export const newPatientReferralIdParamSchema = idParamSchema;

export type CreateNewPatientRequestInput = z.infer<typeof createNewPatientRequestSchema>;
export type CaptureNewPatientReferralSourceInput = z.infer<typeof captureNewPatientReferralSourceSchema>;
export type NewPatientListQueryInput = z.infer<typeof newPatientListQuerySchema>;
