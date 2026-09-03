import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { getClientDetail, importClientTrackerCsv, listClientImportHistory, listClients, updateClientLifecycleRecord } from "../services/clientCommunicationService";
import { clientImportFileSchema, clientListQuerySchema, updateClientLifecycleSchema } from "../validators/clientSchemas";
import { HttpError } from "../utils/httpError";
import { writeStaffAuditLog } from "../services/staffAuditService";

export const listClientDirectory = asyncHandler(async (req: Request, res: Response) => {
  const query = clientListQuerySchema.parse(req.query);
  const result = await listClients(query);
  await writeStaffAuditLog({ action: "CLIENT_DIRECTORY_VIEWED", actorId: req.staffUser!.id, resourceType: "CLIENT_DIRECTORY", metadata: { hasSearch: Boolean(query.search), consent: query.consent ?? null, returnedCount: result.data.length } });
  res.json(result);
});

export const listImports = asyncHandler(async (req: Request, res: Response) => {
  const result = await listClientImportHistory();
  await writeStaffAuditLog({ action: "CLIENT_IMPORT_HISTORY_VIEWED", actorId: req.staffUser!.id, resourceType: "CLIENT_IMPORT_HISTORY", metadata: { returnedCount: result.length } });
  res.json(result);
});

export const getClient = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = req.params.ownerId;
  if (typeof ownerId !== "string") throw new HttpError(400, "Invalid client identifier");
  const client = await getClientDetail(ownerId);
  if (!client) throw new HttpError(404, "Client not found");
  await writeStaffAuditLog({ action: "CLIENT_DETAIL_VIEWED", actorId: req.staffUser!.id, resourceType: "OWNER", resourceId: ownerId });
  res.json(client);
});

export const updateClientLifecycle = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = req.params.ownerId;
  const lifecycleId = req.params.lifecycleId;
  if (typeof ownerId !== "string" || typeof lifecycleId !== "string") throw new HttpError(400, "Invalid client lifecycle identifier");
  const input = updateClientLifecycleSchema.parse(req.body);
  const updated = await updateClientLifecycleRecord(ownerId, lifecycleId, input);
  if (!updated) throw new HttpError(404, "Client lifecycle record not found");
  await writeStaffAuditLog({ action: "CLIENT_LIFECYCLE_UPDATED", actorId: req.staffUser!.id, resourceType: "CLIENT_LIFECYCLE", resourceId: lifecycleId, metadata: { ownerId, changedFields: Object.keys(input) } });
  res.json(updated);
});

export const importClientTracker = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) throw new HttpError(400, "Choose a CSV file to import");
  clientImportFileSchema.parse(file);
  if (!/\.(csv|xlsx)$/i.test(file.originalname)) throw new HttpError(415, "Upload a CSV or Excel file exported from the New Client Tracker");
  const result = await importClientTrackerCsv(file, req.staffUser!.id);
  await writeStaffAuditLog({ action: "CLIENT_IMPORT_COMPLETED", actorId: req.staffUser!.id, resourceType: "CLIENT_IMPORT", resourceId: result.id, metadata: { imported: result.imported, updated: result.updated, skipped: result.skipped.length } });
  res.status(201).json(result);
});
