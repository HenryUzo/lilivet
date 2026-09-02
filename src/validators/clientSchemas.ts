import { z } from "zod";

export const clientListQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  consent: z.enum(["EMAIL", "SMS", "NONE"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional()
});

const optionalText = (max: number) => z.preprocess(
  (value) => typeof value === "string" && !value.trim() ? null : value,
  z.string().trim().max(max).nullable().optional()
);

const optionalDate = z.preprocess(
  (value) => value === "" || value === null ? null : value,
  z.coerce.date().nullable().optional()
);

export const updateClientLifecycleSchema = z.object({
  leadSource: optionalText(120),
  referredBy: optionalText(160),
  regularVeterinarian: optionalText(160),
  firstVisitType: optionalText(160),
  doctorSeen: optionalText(160),
  recheckRecommended: z.boolean().optional(),
  recheckScheduled: z.boolean().optional(),
  recheckDate: optionalDate,
  recheckCompleted: z.boolean().optional(),
  followUpNeeded: z.boolean().optional(),
  firstVisitRevenue: z.coerce.number().min(0).max(1000000).nullable().optional(),
  additionalServicesRevenue: z.coerce.number().min(0).max(1000000).nullable().optional(),
  wellnessPlan: optionalText(160),
  clientStatus: z.enum(["ACTIVE", "INACTIVE", "DECEASED"]).optional(),
  lastVisitAt: optionalDate,
  nextAppointmentAt: optionalDate,
  notes: optionalText(5000)
}).strict();

export const clientImportFileSchema = z.object({
  mimetype: z.string(),
  originalname: z.string().max(255),
  size: z.number().int().positive().max(2 * 1024 * 1024)
});
