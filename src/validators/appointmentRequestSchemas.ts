import { z } from "zod";
import { appointmentStatusSchema, dateStringSchema } from "./common";

export const updateAppointmentStatusSchema = z.object({
  status: appointmentStatusSchema
});

export const appointmentRequestListQuerySchema = z.object({
  status: appointmentStatusSchema.optional(),
  search: z.string().trim().min(1).max(200).optional(),
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional()
});
