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

export const appointmentRequestRoutes = Router();

appointmentRequestRoutes.get("/reschedule/:token", getPublicRescheduleContext);
appointmentRequestRoutes.post("/reschedule/:token/submit", submitPublicReschedule);

appointmentRequestRoutes.use(requireStaffAuth);
appointmentRequestRoutes.post("/mark-overdue", requireRole("ADMIN"), runManualOverdueSweep);
appointmentRequestRoutes.get("/", listRequests);
appointmentRequestRoutes.get("/:id", getRequest);
appointmentRequestRoutes.patch("/:id/status", patchRequestStatus);
appointmentRequestRoutes.post("/:id/calendar-sync", retryRequestCalendarSync);
appointmentRequestRoutes.post("/:id/reschedule-link", sendRequestRescheduleLink);
