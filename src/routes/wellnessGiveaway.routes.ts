import { StaffRole } from "@prisma/client";
import { Router } from "express";
import { drawAdminGiveawayWinner, getAdminGiveaway, getPublicGiveaway, listAdminGiveawayEntries, redeemAdminGiveawayCode, submitPublicGiveaway, updateAdminGiveaway } from "../controllers/wellnessGiveawayController";
import { requireRole, requireStaffAuth } from "../middlewares/staffAuth";
import { publicMutationRateLimit } from "../middlewares/rateLimit";

export const wellnessGiveawayRoutes = Router();
wellnessGiveawayRoutes.get("/public", getPublicGiveaway);
wellnessGiveawayRoutes.post("/public/entries", publicMutationRateLimit, submitPublicGiveaway);
wellnessGiveawayRoutes.use(requireStaffAuth, requireRole(StaffRole.SUPER_ADMIN));
wellnessGiveawayRoutes.get("/", getAdminGiveaway);
wellnessGiveawayRoutes.patch("/", updateAdminGiveaway);
wellnessGiveawayRoutes.get("/entries", listAdminGiveawayEntries);
wellnessGiveawayRoutes.post("/entries/redeem", redeemAdminGiveawayCode);
wellnessGiveawayRoutes.post("/draw", drawAdminGiveawayWinner);
