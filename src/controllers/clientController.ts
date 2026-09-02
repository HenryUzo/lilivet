import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { getClientDetail, importClientTrackerCsv, listClientImportHistory, listClients, updateClientLifecycleRecord } from "../services/clientCommunicationService";
import { clientImportFileSchema, clientListQuerySchema, updateClientLifecycleSchema } from "../validators/clientSchemas";
import { HttpError } from "../utils/httpError";

export const listClientDirectory = asyncHandler(async (req: Request, res: Response) => {
  res.json(await listClients(clientListQuerySchema.parse(req.query)));
});

export const listImports = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await listClientImportHistory());
});

export const getClient = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = req.params.ownerId;
  if (typeof ownerId !== "string") throw new HttpError(400, "Invalid client identifier");
  const client = await getClientDetail(ownerId);
  if (!client) throw new HttpError(404, "Client not found");
  res.json(client);
});

export const updateClientLifecycle = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = req.params.ownerId;
  const lifecycleId = req.params.lifecycleId;
  if (typeof ownerId !== "string" || typeof lifecycleId !== "string") throw new HttpError(400, "Invalid client lifecycle identifier");
  const updated = await updateClientLifecycleRecord(
    ownerId,
    lifecycleId,
    updateClientLifecycleSchema.parse(req.body)
  );
  if (!updated) throw new HttpError(404, "Client lifecycle record not found");
  res.json(updated);
});

export const importClientTracker = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) throw new HttpError(400, "Choose a CSV file to import");
  clientImportFileSchema.parse(file);
  if (!/\.(csv|xlsx)$/i.test(file.originalname)) throw new HttpError(415, "Upload a CSV or Excel file exported from the New Client Tracker");
  res.status(201).json(await importClientTrackerCsv(file, req.staffUser!.id));
});
