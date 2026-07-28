import { z } from "zod";

export const petCareNewsletterSourceSchema = z.enum(["pet-care-library"]);
export const petCareNewsletterPetPreferenceSchema = z.enum(["DOG", "CAT", "BOTH"]);

export const petCareNewsletterSubscriptionSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(254),
  petPreference: petCareNewsletterPetPreferenceSchema,
  consent: z.literal(true),
  source: petCareNewsletterSourceSchema.default("pet-care-library"),
  website: z
    .string()
    .max(200)
    .optional()
    .default("")
}).strict().superRefine((value, context) => {
  if (value.website.trim().length > 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid subscription request",
      path: ["website"]
    });
  }
});

export type PetCareNewsletterSubscriptionInput = z.infer<
  typeof petCareNewsletterSubscriptionSchema
>;
