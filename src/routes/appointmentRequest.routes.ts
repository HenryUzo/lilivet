import { Router } from "express";
import { getRequest, listRequests, patchRequestStatus } from "../controllers/appointmentRequestController";

export const appointmentRequestRoutes = Router();

appointmentRequestRoutes.get("/", listRequests);
appointmentRequestRoutes.get("/:id", getRequest);
appointmentRequestRoutes.patch("/:id/status", patchRequestStatus);
