import { Router } from "express";
import { createNewPatient, getNewPatient, listNewPatients } from "../controllers/newPatientController";
import { publicMutationRateLimit } from "../middlewares/rateLimit";
import { requireStaffAuth } from "../middlewares/staffAuth";

export const newPatientRoutes = Router();

newPatientRoutes.post("/", publicMutationRateLimit, createNewPatient);
newPatientRoutes.use(requireStaffAuth);
newPatientRoutes.get("/", listNewPatients);
newPatientRoutes.get("/:id", getNewPatient);
