import { z } from "zod";
import {
  dateStringSchema,
  optionalEmailSchema,
  petSexSchema,
  petSpeciesSchema,
  phoneSchema,
  preferredContactMethodSchema,
  timezoneSchema,
  visitTypeSchema,
  weightSchema
} from "./common";

export const preferredSlotsSchema = z
  .array(dateStringSchema)
  .min(1)
  .max(3)
  .superRefine((slots, ctx) => {
    const seen = new Set<string>();
    for (const [index, slot] of slots.entries()) {
      if (seen.has(slot)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate preferred slots are not allowed",
          path: [index]
        });
      }
      seen.add(slot);
    }
  });

export const appointmentStep1Schema = z.object({
  visitType: visitTypeSchema
});

export const appointmentStep2Schema = z.object({
  petName: z.string().trim().min(1).max(100),
  species: petSpeciesSchema,
  breed: z.string().trim().max(100).optional(),
  approximateAgeYears: z.coerce.number().int().min(0).max(80).optional(),
  sex: petSexSchema,
  weightLbs: weightSchema
});

export const appointmentStep3Schema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: optionalEmailSchema,
  phoneNumber: phoneSchema,
  preferredContactMethod: preferredContactMethodSchema
});

export const appointmentStep4Schema = z.object({
  preferredSlots: preferredSlotsSchema,
  timezone: timezoneSchema
});

export const appointmentStep5Schema = z.object({
  symptomsOrConcerns: z.string().trim().max(5000).optional(),
  currentMedications: z.string().trim().max(2000).optional(),
  previousVeterinarian: z.string().trim().max(200).optional(),
  symptomDuration: z.string().trim().max(200).optional()
});

export const fullAppointmentDraftSchema = z.object({
  visitType: visitTypeSchema,
  petName: z.string().trim().min(1).max(100),
  species: petSpeciesSchema,
  breed: z.string().trim().max(100).nullish(),
  approximateAgeYears: z.coerce.number().int().min(0).max(80).nullish(),
  sex: petSexSchema,
  weightLbs: weightSchema.nullish(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: optionalEmailSchema.nullish(),
  phoneNumber: phoneSchema,
  preferredContactMethod: preferredContactMethodSchema,
  preferredSlots: preferredSlotsSchema,
  timezone: timezoneSchema,
  symptomsOrConcerns: z.string().trim().max(5000).nullish(),
  currentMedications: z.string().trim().max(2000).nullish(),
  previousVeterinarian: z.string().trim().max(200).nullish(),
  symptomDuration: z.string().trim().max(200).nullish()
});

export type AppointmentStep1 = z.infer<typeof appointmentStep1Schema>;
export type AppointmentStep2 = z.infer<typeof appointmentStep2Schema>;
export type AppointmentStep3 = z.infer<typeof appointmentStep3Schema>;
export type AppointmentStep4 = z.infer<typeof appointmentStep4Schema>;
export type AppointmentStep5 = z.infer<typeof appointmentStep5Schema>;
export type FullAppointmentDraft = z.infer<typeof fullAppointmentDraftSchema>;
