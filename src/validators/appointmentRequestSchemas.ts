import { z } from "zod";
import { appointmentStep4Schema } from "./appointmentDraftSchemas";
import { appointmentStatusSchema, dateStringSchema, timezoneSchema } from "./common";

export const updateAppointmentStatusSchema = z.object({
  status: appointmentStatusSchema,
  confirmedStartAt: dateStringSchema.optional(),
  confirmedEndAt: dateStringSchema.optional(),
  confirmedTimezone: timezoneSchema.optional()
}).superRefine((value, ctx) => {
  if (value.status !== "CONFIRMED") {
    return;
  }

  if (!value.confirmedStartAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmedStartAt"],
      message: "Confirmed start time is required when confirming an appointment"
    });
  }

  if (!value.confirmedEndAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmedEndAt"],
      message: "Confirmed end time is required when confirming an appointment"
    });
  }

  if (!value.confirmedTimezone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmedTimezone"],
      message: "Confirmed timezone is required when confirming an appointment"
    });
  }

  if (value.confirmedStartAt && value.confirmedEndAt) {
    const start = new Date(value.confirmedStartAt);
    const end = new Date(value.confirmedEndAt);

    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmedEndAt"],
        message: "Confirmed end time must be after the confirmed start time"
      });
    }
  }
});

export const appointmentRequestListQuerySchema = z.object({
  status: appointmentStatusSchema.optional(),
  search: z.string().trim().min(1).max(200).optional(),
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional()
});

export const sendAppointmentRescheduleLinkSchema = z.object({
  responseDeadline: dateStringSchema
});

export const submitAppointmentRescheduleSchema = appointmentStep4Schema;
