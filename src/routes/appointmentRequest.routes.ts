import { Router } from "express";
import { getRequest, listRequests, patchRequestStatus } from "../controllers/appointmentRequestController";
import { requireStaffAuth } from "../middlewares/staffAuth";

export const appointmentRequestRoutes = Router();

appointmentRequestRoutes.use(requireStaffAuth);
appointmentRequestRoutes.get("/", listRequests);
appointmentRequestRoutes.get("/:id", getRequest);
appointmentRequestRoutes.patch("/:id/status", patchRequestStatus);
