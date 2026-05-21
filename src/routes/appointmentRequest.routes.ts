import { Router } from "express";
import {
  getRequest,
  getPublicRescheduleContext,
  listRequests,
  patchRequestStatus,
  retryRequestCalendarSync,
  sendRequestRescheduleLink,
  submitPublicReschedule
} from "../controllers/appointmentRequestController";
import { requireStaffAuth } from "../middlewares/staffAuth";

export const appointmentRequestRoutes = Router();

appointmentRequestRoutes.get("/reschedule/:token", getPublicRescheduleContext);
appointmentRequestRoutes.post("/reschedule/:token/submit", submitPublicReschedule);

appointmentRequestRoutes.use(requireStaffAuth);
appointmentRequestRoutes.get("/", listRequests);
appointmentRequestRoutes.get("/:id", getRequest);
appointmentRequestRoutes.patch("/:id/status", patchRequestStatus);
appointmentRequestRoutes.post("/:id/calendar-sync", retryRequestCalendarSync);
appointmentRequestRoutes.post("/:id/reschedule-link", sendRequestRescheduleLink);
