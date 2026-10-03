import { StaffRole } from "@prisma/client";
import { Router } from "express";
import { createSimplifiedAppointment, getAdminAppointmentBookingSettings, getPublicAppointmentBookingSettings, patchAdminAppointmentBookingSettings, receiveAppointmentSmsWebhook } from "../controllers/appointmentBookingController";
import { publicMutationRateLimit } from "../middlewares/rateLimit";
import { requireRole, requireStaffAuth } from "../middlewares/staffAuth";

export const appointmentBookingRoutes = Router();
appointmentBookingRoutes.get("/settings", getPublicAppointmentBookingSettings);
appointmentBookingRoutes.post("/simplified", publicMutationRateLimit, createSimplifiedAppointment);
appointmentBookingRoutes.post("/brevo-sms/webhook", receiveAppointmentSmsWebhook);
appointmentBookingRoutes.get("/admin/settings", requireStaffAuth, requireRole(StaffRole.SUPER_ADMIN), getAdminAppointmentBookingSettings);
appointmentBookingRoutes.patch("/admin/settings", requireStaffAuth, requireRole(StaffRole.SUPER_ADMIN), patchAdminAppointmentBookingSettings);
