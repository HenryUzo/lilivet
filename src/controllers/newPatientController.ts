import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { createNewPatientRequestSchema, captureNewPatientReferralSourceSchema, newPatientListQuerySchema, newPatientReferralIdParamSchema } from "../validators/newPatientSchemas";
import {
  captureNewPatientReferralSource,
  createNewPatientRequest,
  getNewPatientRequest,
  listNewPatientRequests
} from "../services/newPatientService";

export const createNewPatient = asyncHandler(async (req: Request, res: Response) => {
  const input = createNewPatientRequestSchema.parse(req.body);
  const request = await createNewPatientRequest(input);
  res.status(201).json(request);
});

export const captureReferralSource = asyncHandler(async (req: Request, res: Response) => {
  const { id } = newPatientReferralIdParamSchema.parse(req.params);
  const input = captureNewPatientReferralSourceSchema.parse(req.body);
  res.json(await captureNewPatientReferralSource(id, input));
});

export const listNewPatients = asyncHandler(async (req: Request, res: Response) => {
  const query = newPatientListQuerySchema.parse(req.query);
  res.json(await listNewPatientRequests(query));
});

export const getNewPatient = asyncHandler(async (req: Request, res: Response) => {
  const { id } = newPatientReferralIdParamSchema.parse(req.params);
  res.json(await getNewPatientRequest(id));
});
