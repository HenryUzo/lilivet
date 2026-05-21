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

export const listRequests = asyncHandler(async (req: Request, res: Response) => {
  const query = appointmentRequestListQuerySchema.parse(req.query);
  res.json(await listAppointmentRequests(query));
});

export const getRequest = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await getAppointmentRequest(id));
});

export const patchRequestStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const input = updateAppointmentStatusSchema.parse(req.body);
  res.json(
    await updateAppointmentRequestStatus({
      id,
      ...input,
      staffUserId: req.staffUser!.id
    })
  );
});

export const retryRequestCalendarSync = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await retryAppointmentCalendarSync(id));
});

export const runManualOverdueSweep = asyncHandler(async (_req: Request, res: Response) => {
  const markedCount = await markOverdueAppointments();
  res.json({ markedCount });
});

export const sendRequestRescheduleLink = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const input = sendAppointmentRescheduleLinkSchema.parse(req.body);
  res.json(
    await issueAppointmentRescheduleLink({
      appointmentRequestId: id,
      responseDeadline: input.responseDeadline,
      staffUserId: req.staffUser!.id
    })
  );
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
