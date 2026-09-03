import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { createNewPatientRequestSchema, captureNewPatientReferralSourceSchema, newPatientListQuerySchema, newPatientReferralIdParamSchema } from "../validators/newPatientSchemas";
import {
  captureNewPatientReferralSource,
  createNewPatientRequest,
  getNewPatientRequest,
  listNewPatientRequests
} from "../services/newPatientService";
import { writeStaffAuditLog } from "../services/staffAuditService";

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
  const result = await listNewPatientRequests(query);
  await writeStaffAuditLog({ action: "NEW_PATIENT_DIRECTORY_VIEWED", actorId: req.staffUser!.id, resourceType: "NEW_PATIENT_DIRECTORY", metadata: { returnedCount: result.data.length, hasSearch: Boolean(query.search) } });
  res.json(result);
});

export const getNewPatient = asyncHandler(async (req: Request, res: Response) => {
  const { id } = newPatientReferralIdParamSchema.parse(req.params);
  const patient = await getNewPatientRequest(id);
  await writeStaffAuditLog({ action: "NEW_PATIENT_DETAIL_VIEWED", actorId: req.staffUser!.id, resourceType: "NEW_PATIENT_REQUEST", resourceId: id });
  res.json(patient);
});
