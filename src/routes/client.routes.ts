import { Router } from "express";
import multer from "multer";
import { StaffPermissionKey } from "@prisma/client";
import { getClient, importClientTracker, listClientDirectory, listImports, updateClientLifecycle } from "../controllers/clientController";
import { requirePermission, requireStaffAuth } from "../middlewares/staffAuth";

export const clientRoutes = Router();
const clientImportUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });
clientRoutes.use(requireStaffAuth);
clientRoutes.get("/", requirePermission(StaffPermissionKey.CLIENTS_VIEW), listClientDirectory);
clientRoutes.get("/import-history", requirePermission(StaffPermissionKey.CLIENTS_MANAGE), listImports);
clientRoutes.post("/import", requirePermission(StaffPermissionKey.CLIENTS_MANAGE), clientImportUpload.single("file"), importClientTracker);
clientRoutes.get("/:ownerId", requirePermission(StaffPermissionKey.CLIENTS_VIEW), getClient);
clientRoutes.patch("/:ownerId/lifecycles/:lifecycleId", requirePermission(StaffPermissionKey.CLIENTS_MANAGE), updateClientLifecycle);
