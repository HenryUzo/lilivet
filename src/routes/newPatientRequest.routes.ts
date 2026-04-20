import { Router } from "express";
import { createNewPatient, getNewPatient, listNewPatients } from "../controllers/newPatientController";

export const newPatientRoutes = Router();

newPatientRoutes.post("/", createNewPatient);
newPatientRoutes.get("/", listNewPatients);
newPatientRoutes.get("/:id", getNewPatient);
