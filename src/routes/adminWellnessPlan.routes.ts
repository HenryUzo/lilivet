import { StaffRole } from "@prisma/client";
import { Router } from "express";
import {
  getAdminWellnessPlan,
  getAdminWellnessPlanByKey,
  listAdminWellnessPlans
} from "../controllers/adminWellnessPlanController";
import { requireRole, requireStaffAuth } from "../middlewares/staffAuth";

export const adminWellnessPlanRoutes = Router();

adminWellnessPlanRoutes.use(requireStaffAuth, requireRole(StaffRole.SUPER_ADMIN));
adminWellnessPlanRoutes.get("/", listAdminWellnessPlans);
adminWellnessPlanRoutes.get("/key/:planKey", getAdminWellnessPlanByKey);
adminWellnessPlanRoutes.get("/:id", getAdminWellnessPlan);
