import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { idParamSchema, rescheduleTokenParamSchema } from "../validators/common";
import {
  appointmentRequestListQuerySchema,
  sendAppointmentRescheduleLinkSchema,
  submitAppointmentRescheduleSchema,
  updateAppointmentStatusSchema
} from "../validators/appointmentRequestSchemas";
import {
  getAppointmentRequest,
  listAppointmentRequests,
  markOverdueAppointments,
  retryAppointmentCalendarSync,
  updateAppointmentRequestStatus
} from "../services/appointmentRequestService";
import {
  getAppointmentRescheduleContext,
  issueAppointmentRescheduleLink,
  submitAppointmentReschedule
} from "../services/appointmentRescheduleService";
import { writeStaffAuditLog } from "../services/staffAuditService";

export const listRequests = asyncHandler(async (req: Request, res: Response) => {
  const query = appointmentRequestListQuerySchema.parse(req.query);
  const result = await listAppointmentRequests(query);
  await writeStaffAuditLog({ action: "APPOINTMENT_DIRECTORY_VIEWED", actorId: req.staffUser!.id, resourceType: "APPOINTMENT_DIRECTORY", metadata: { returnedCount: result.data.length, hasSearch: Boolean(query.search) } });
  res.json(result);
});

export const getRequest = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const appointment = await getAppointmentRequest(id);
  await writeStaffAuditLog({ action: "APPOINTMENT_DETAIL_VIEWED", actorId: req.staffUser!.id, resourceType: "APPOINTMENT_REQUEST", resourceId: id });
  res.json(appointment);
});

export const patchRequestStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const input = updateAppointmentStatusSchema.parse(req.body);
  const appointment = await updateAppointmentRequestStatus({ id, ...input, staffUserId: req.staffUser!.id });
  await writeStaffAuditLog({ action: "APPOINTMENT_STATUS_UPDATED", actorId: req.staffUser!.id, resourceType: "APPOINTMENT_REQUEST", resourceId: id, metadata: { status: input.status } });
  res.json(appointment);
});

export const retryRequestCalendarSync = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const appointment = await retryAppointmentCalendarSync(id);
  await writeStaffAuditLog({ action: "APPOINTMENT_CALENDAR_SYNC_RETRIED", actorId: req.staffUser!.id, resourceType: "APPOINTMENT_REQUEST", resourceId: id });
  res.json(appointment);
});

export const runManualOverdueSweep = asyncHandler(async (req: Request, res: Response) => {
  const markedCount = await markOverdueAppointments();
  await writeStaffAuditLog({ action: "APPOINTMENT_OVERDUE_SWEEP_RUN", actorId: req.staffUser!.id, resourceType: "APPOINTMENT_DIRECTORY", metadata: { markedCount } });
  res.json({ markedCount });
});

export const sendRequestRescheduleLink = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const input = sendAppointmentRescheduleLinkSchema.parse(req.body);
  const result = await issueAppointmentRescheduleLink({ appointmentRequestId: id, responseDeadline: input.responseDeadline, staffUserId: req.staffUser!.id });
  await writeStaffAuditLog({ action: "APPOINTMENT_RESCHEDULE_LINK_SENT", actorId: req.staffUser!.id, resourceType: "APPOINTMENT_REQUEST", resourceId: id });
  res.json(result);
});

export const getPublicRescheduleContext = asyncHandler(async (req: Request, res: Response) => {
  const { token } = rescheduleTokenParamSchema.parse(req.params);
  res.json(await getAppointmentRescheduleContext(token));
});

export const submitPublicReschedule = asyncHandler(async (req: Request, res: Response) => {
  const { token } = rescheduleTokenParamSchema.parse(req.params);
  const input = submitAppointmentRescheduleSchema.parse(req.body);
  res.status(201).json(await submitAppointmentReschedule(token, input));
});
