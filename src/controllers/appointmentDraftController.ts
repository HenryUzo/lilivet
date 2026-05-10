import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sessionTokenParamSchema } from "../validators/common";
import {
  appointmentStep1Schema,
  appointmentStep2Schema,
  appointmentStep3Schema,
  appointmentStep4Schema,
  appointmentStep5Schema
} from "../validators/appointmentDraftSchemas";
import {
  createAppointmentDraft,
  getAppointmentDraft,
  submitAppointmentDraft,
  updateStep1,
  updateStep2,
  updateStep3,
  updateStep4,
  updateStep5
} from "../services/appointmentDraftService";
import { attachFilesToDraft, createUploadedFiles } from "../services/fileService";

function sessionToken(req: Request) {
  return sessionTokenParamSchema.parse(req.params).sessionToken;
}

export const createDraft = asyncHandler(async (_req: Request, res: Response) => {
  const startedAt = Date.now();
  const draft = await createAppointmentDraft();
  console.log(JSON.stringify({
    event: "appointment_draft_create_request",
    draftId: draft.id,
    durationMs: Date.now() - startedAt
  }));
  res.status(201).json(draft);
});

export const getDraft = asyncHandler(async (req: Request, res: Response) => {
  const draft = await getAppointmentDraft(sessionToken(req));
  res.json(draft);
});

export const patchStep1 = asyncHandler(async (req: Request, res: Response) => {
  const draft = await updateStep1(sessionToken(req), appointmentStep1Schema.parse(req.body));
  res.json(draft);
});

export const patchStep2 = asyncHandler(async (req: Request, res: Response) => {
  const draft = await updateStep2(sessionToken(req), appointmentStep2Schema.parse(req.body));
  res.json(draft);
});

export const patchStep3 = asyncHandler(async (req: Request, res: Response) => {
  const draft = await updateStep3(sessionToken(req), appointmentStep3Schema.parse(req.body));
  res.json(draft);
});

export const patchStep4 = asyncHandler(async (req: Request, res: Response) => {
  const draft = await updateStep4(sessionToken(req), appointmentStep4Schema.parse(req.body));
  res.json(draft);
});

export const patchStep5 = asyncHandler(async (req: Request, res: Response) => {
  const draft = await updateStep5(sessionToken(req), appointmentStep5Schema.parse(req.body));
  res.json(draft);
});

export const uploadDraftFiles = asyncHandler(async (req: Request, res: Response) => {
  const draft = await getAppointmentDraft(sessionToken(req));
  const files = await createUploadedFiles((req.files as Express.Multer.File[]) ?? []);
  await attachFilesToDraft(
    files.map((file) => file.id),
    draft.id,
    draft.expiresAt
  );
  res.status(201).json({ files });
});

export const submitDraft = asyncHandler(async (req: Request, res: Response) => {
  const request = await submitAppointmentDraft(sessionToken(req));
  res.status(201).json(request);
});
