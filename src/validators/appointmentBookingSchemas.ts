import { z } from "zod";
import { attributionSchema } from "./attributionSchemas";

export const appointmentBookingModeSchema = z.object({
  mode: z.enum(["STANDARD", "SIMPLIFIED"])
});

export const simplifiedAppointmentSchema = z.object({
  clientFullName: z.string().trim().min(2).max(120),
  petName: z.string().trim().min(1).max(80),
  petType: z.enum(["DOG", "CAT"]),
  email: z.union([z.string().trim().email(), z.literal("")]).optional().default(""),
  phoneNumber: z.string().trim().min(10).max(30),
  reasonForVisit: z.string().trim().min(3).max(2000),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/),
  preferredSelections: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{2}:\d{2}$/)
  })).min(1).max(3).superRefine((selections, ctx) => {
    const uniqueSelections = new Set(selections.map((selection) => `${selection.date}T${selection.time}`));
    if (uniqueSelections.size !== selections.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choose three different appointment times." });
    }
  }).optional(),
  website: z.string().max(0).optional().default(""),
  attribution: attributionSchema.optional()
});

export type SimplifiedAppointmentInput = z.infer<typeof simplifiedAppointmentSchema>;
