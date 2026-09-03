import { Router } from "express";
import { confirmStaffMfaEnrollment, getStaffSession, logoutStaff, staffLogin, startStaffMfaEnrollment, verifyStaffMfa } from "../controllers/staffAuthController";
import { requireStaffAuth } from "../middlewares/staffAuth";
import { staffLoginRateLimit } from "../middlewares/rateLimit";

export const staffAuthRoutes = Router();

staffAuthRoutes.post("/login", staffLoginRateLimit, staffLogin);
staffAuthRoutes.post("/mfa/setup", staffLoginRateLimit, startStaffMfaEnrollment);
staffAuthRoutes.post("/mfa/setup/verify", staffLoginRateLimit, confirmStaffMfaEnrollment);
staffAuthRoutes.post("/mfa/verify", staffLoginRateLimit, verifyStaffMfa);
staffAuthRoutes.get("/session", requireStaffAuth, getStaffSession);
staffAuthRoutes.post("/logout", requireStaffAuth, logoutStaff);
