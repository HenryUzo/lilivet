import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { idParamSchema, listQuerySchema } from "../validators/common";
import { createNewPatientRequestSchema } from "../validators/newPatientSchemas";
import { createNewPatientRequest, getNewPatientRequest, listNewPatientRequests } from "../services/newPatientService";

export const createNewPatient = asyncHandler(async (req: Request, res: Response) => {
  const input = createNewPatientRequestSchema.parse(req.body);
  const request = await createNewPatientRequest(input);
  res.status(201).json(request);
});

export const listNewPatients = asyncHandler(async (req: Request, res: Response) => {
  const query = listQuerySchema.parse(req.query);
  res.json(await listNewPatientRequests(query));
});

export const getNewPatient = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await getNewPatientRequest(id));
});
