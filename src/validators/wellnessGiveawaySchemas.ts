import { z } from "zod";
import { petSpeciesSchema, phoneSchema } from "./common";

const petSchema = z.object({ name: z.string().trim().min(1).max(100), species: petSpeciesSchema.refine((value) => value === "DOG" || value === "CAT"), age: z.string().trim().max(80).optional(), breed: z.string().trim().max(100).optional() });

export const giveawayEntrySchema = z.object({
  fullName: z.string().trim().min(2).max(200),
  email: z.string().trim().toLowerCase().email().max(254),
  phoneNumber: phoneSchema,
  pets: z.array(petSchema).min(1).max(8),
  currentPatient: z.boolean(),
  marketingOptIn: z.boolean().default(false),
  acceptTerms: z.literal(true),
  website: z.string().max(200).optional().default("")
}).strict().superRefine((value, context) => { if (value.website.trim()) context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid giveaway request", path: ["website"] }); });

export const giveawayCampaignUpdateSchema = z.object({
  name: z.string().trim().min(3).max(160).optional(), isPublished: z.boolean().optional(), raffleEnabled: z.boolean().optional(), prizeDescription: z.string().trim().min(3).max(300).optional(), discountPercent: z.number().int().min(1).max(100).optional(), expiresAt: z.string().datetime().nullable().optional(), termsSummary: z.string().trim().min(10).max(800).optional(), termsContent: z.string().trim().min(20).max(12000).optional(), termsVersion: z.string().trim().min(1).max(100).optional()
}).strict();

export type GiveawayEntryInput = z.infer<typeof giveawayEntrySchema>;
export type GiveawayCampaignUpdateInput = z.infer<typeof giveawayCampaignUpdateSchema>;
