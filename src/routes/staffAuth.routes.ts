import { Router } from "express";
import { staffLogin } from "../controllers/staffAuthController";
import { staffLoginRateLimit } from "../middlewares/rateLimit";

export const staffAuthRoutes = Router();

staffAuthRoutes.post("/login", staffLoginRateLimit, staffLogin);
