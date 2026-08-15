import { Router } from "express";
import {
  getRequest,
  getPublicRescheduleContext,
  listRequests,
  patchRequestStatus,
  runManualOverdueSweep,
  retryRequestCalendarSync,
  sendRequestRescheduleLink,
  submitPublicReschedule
} from "../controllers/appointmentRequestController";
import { requireRole, requireStaffAuth } from "../middlewares/staffAuth";
import { requirePermission } from "../middlewares/staffAuth";
import { StaffPermissionKey, StaffRole } from "@prisma/client";

export const appointmentRequestRoutes = Router();

appointmentRequestRoutes.get("/reschedule/:token", getPublicRescheduleContext);
appointmentRequestRoutes.post("/reschedule/:token/submit", submitPublicReschedule);

appointmentRequestRoutes.use(requireStaffAuth);
appointmentRequestRoutes.post("/mark-overdue", requireRole(StaffRole.SUPER_ADMIN), runManualOverdueSweep);
appointmentRequestRoutes.get("/", requirePermission(StaffPermissionKey.APPOINTMENTS_VIEW), listRequests);
appointmentRequestRoutes.get("/:id", requirePermission(StaffPermissionKey.APPOINTMENTS_VIEW), getRequest);
appointmentRequestRoutes.patch("/:id/status", requirePermission(StaffPermissionKey.APPOINTMENTS_MANAGE), patchRequestStatus);
appointmentRequestRoutes.post("/:id/calendar-sync", requirePermission(StaffPermissionKey.APPOINTMENTS_MANAGE), retryRequestCalendarSync);
appointmentRequestRoutes.post("/:id/reschedule-link", requirePermission(StaffPermissionKey.APPOINTMENTS_MANAGE), sendRequestRescheduleLink);
