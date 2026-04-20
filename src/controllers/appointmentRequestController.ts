import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { idParamSchema } from "../validators/common";
import { appointmentRequestListQuerySchema, updateAppointmentStatusSchema } from "../validators/appointmentRequestSchemas";
import {
  getAppointmentRequest,
  listAppointmentRequests,
  updateAppointmentRequestStatus
} from "../services/appointmentRequestService";

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
  const { status } = updateAppointmentStatusSchema.parse(req.body);
  res.json(await updateAppointmentRequestStatus(id, status));
});
