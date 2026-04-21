import { Router } from "express";
import { staffLogin } from "../controllers/staffAuthController";

export const staffAuthRoutes = Router();

staffAuthRoutes.post("/login", staffLogin);
