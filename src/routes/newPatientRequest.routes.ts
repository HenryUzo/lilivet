import { Router } from "express";
import { captureReferralSource, createNewPatient, getNewPatient, listNewPatients } from "../controllers/newPatientController";
import { publicMutationRateLimit } from "../middlewares/rateLimit";
import { requireStaffAuth } from "../middlewares/staffAuth";
import { requirePermission } from "../middlewares/staffAuth";
import { StaffPermissionKey } from "@prisma/client";

export const newPatientRoutes = Router();

newPatientRoutes.post("/", publicMutationRateLimit, createNewPatient);
newPatientRoutes.post("/:id/referral-source", publicMutationRateLimit, captureReferralSource);
newPatientRoutes.use(requireStaffAuth);
newPatientRoutes.get("/", requirePermission(StaffPermissionKey.NEW_PATIENTS_VIEW), listNewPatients);
newPatientRoutes.get("/:id", requirePermission(StaffPermissionKey.NEW_PATIENTS_VIEW), getNewPatient);
