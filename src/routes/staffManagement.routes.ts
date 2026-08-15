import { Router } from "express";
import { acceptInvitation, getInvitation, inviteStaff, listStaff, resendInvitation, updateStaff } from "../controllers/staffManagementController";
import { requireRole, requireStaffAuth } from "../middlewares/staffAuth";
import { StaffRole } from "@prisma/client";

export const staffManagementRoutes = Router();
staffManagementRoutes.get("/invitations/:token", getInvitation);
staffManagementRoutes.post("/invitations/:token/accept", acceptInvitation);
staffManagementRoutes.use(requireStaffAuth, requireRole(StaffRole.SUPER_ADMIN));
staffManagementRoutes.get("/users", listStaff);
staffManagementRoutes.post("/users", inviteStaff);
staffManagementRoutes.patch("/users/:id", updateStaff);
staffManagementRoutes.post("/users/:id/resend-invitation", resendInvitation);
