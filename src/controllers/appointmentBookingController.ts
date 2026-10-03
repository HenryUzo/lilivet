import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/httpError";
import { appointmentBookingModeSchema, simplifiedAppointmentSchema } from "../validators/appointmentBookingSchemas";
import { APPOINTMENT_MAX_DAYS_AHEAD, APPOINTMENT_TIMEZONE, getAppointmentBookingSetting, submitSimplifiedAppointment, updateAppointmentBookingSetting } from "../services/appointmentBookingService";
import { hasValidSmsWebhookSecret, recordAppointmentSmsWebhook } from "../services/appointmentSmsService";
import { writeStaffAuditLog } from "../services/staffAuditService";

function publicSettings(mode: string) {
  return { mode, timezone: APPOINTMENT_TIMEZONE, maxDaysAhead: APPOINTMENT_MAX_DAYS_AHEAD, hours: { weekdays: { open: "08:00", close: "19:00" }, saturday: { open: "08:00", close: "16:00" }, sunday: null } };
}

export const getPublicAppointmentBookingSettings = asyncHandler(async (_req: Request, res: Response) => {
  const setting = await getAppointmentBookingSetting();
  res.json(publicSettings(setting.mode));
});

export const createSimplifiedAppointment = asyncHandler(async (req: Request, res: Response) => {
  const result = await submitSimplifiedAppointment(simplifiedAppointmentSchema.parse(req.body));
  res.status(201).json(result);
});

export const getAdminAppointmentBookingSettings = asyncHandler(async (_req: Request, res: Response) => {
  const setting = await getAppointmentBookingSetting();
  res.json({ ...publicSettings(setting.mode), updatedAt: setting.updatedAt });
});

export const patchAdminAppointmentBookingSettings = asyncHandler(async (req: Request, res: Response) => {
  const { mode } = appointmentBookingModeSchema.parse(req.body);
  const setting = await updateAppointmentBookingSetting(mode, req.staffUser!.id);
  await writeStaffAuditLog({ action: "APPOINTMENT_BOOKING_MODE_UPDATED", actorId: req.staffUser!.id, resourceType: "APPOINTMENT_BOOKING_SETTING", resourceId: setting.id, metadata: { mode } });
  res.json({ ...publicSettings(setting.mode), updatedAt: setting.updatedAt });
});

export const receiveAppointmentSmsWebhook = asyncHandler(async (req: Request, res: Response) => {
  if (!hasValidSmsWebhookSecret(req.header("x-lilivet-webhook-secret"))) throw new HttpError(401, "Invalid SMS webhook secret");
  await recordAppointmentSmsWebhook({ messageId: String(req.body.messageId ?? req.body.message_id ?? ""), event: req.body.event, status: req.body.status, reason: req.body.reason ?? req.body.description });
  res.status(204).send();
});
