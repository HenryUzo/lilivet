import { z } from "zod";

export const visitTypeSchema = z.enum([
  "URGENT_CARE",
  "WELLNESS_EXAM",
  "VACCINATIONS",
  "DENTAL_CARE",
  "SURGERY",
  "DIAGNOSTICS",
  "NEW_PATIENT_VISIT",
  "OTHER"
]);

export const petSpeciesSchema = z.enum(["DOG", "CAT"]);
export const petSexSchema = z.enum(["MALE", "FEMALE"]);
export const preferredContactMethodSchema = z.enum(["CALL", "TEXT", "EMAIL"]);
export const appointmentStatusSchema = z.enum([
  "PENDING_REVIEW",
  "CONFIRMED",
  "OVERDUE",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW"
]);
export const newPatientReferralSourceSchema = z.enum([
  "PET_PARADISE",
  "WEBSITE",
  "GOOGLE",
  "PET_BARN",
  "WELCOME_HOME_MAGAZINE",
  "REFERRED_BY_ANOTHER_VETERINARIAN",
  "REFERRED_BY_FRIEND_OR_FAMILY_MEMBER",
  "OTHER"
]);

export const phoneSchema = z.string().trim().min(7).max(30);
export const optionalEmailSchema = z
  .string()
  .trim()
  .email()
  .optional()
  .or(z.literal("").transform(() => undefined));

export const dateStringSchema = z.string().datetime({ offset: true });
export const timezoneSchema = z.string().trim().min(1).max(100);

export const weightSchema = z.coerce.number().positive().max(300).optional();

export const idParamSchema = z.object({
  id: z.string().min(1)
});

export const sessionTokenParamSchema = z.object({
  sessionToken: z.string().length(64)
});

export const rescheduleTokenParamSchema = z.object({
  token: z.string().length(64)
});

export const referralSourceCaptureTokenSchema = z.string().length(64);

export const listQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional()
});
