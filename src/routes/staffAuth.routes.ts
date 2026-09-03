import { Router } from "express";
import { confirmStaffMfaEnrollment, staffLogin, startStaffMfaEnrollment, verifyStaffMfa } from "../controllers/staffAuthController";
import { staffLoginRateLimit } from "../middlewares/rateLimit";

export const staffAuthRoutes = Router();

staffAuthRoutes.post("/login", staffLoginRateLimit, staffLogin);
staffAuthRoutes.post("/mfa/setup", staffLoginRateLimit, startStaffMfaEnrollment);
staffAuthRoutes.post("/mfa/setup/verify", staffLoginRateLimit, confirmStaffMfaEnrollment);
staffAuthRoutes.post("/mfa/verify", staffLoginRateLimit, verifyStaffMfa);
