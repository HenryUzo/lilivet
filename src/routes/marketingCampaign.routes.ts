import { Router } from "express";
import { StaffPermissionKey, StaffRole } from "@prisma/client";
import { createCampaign, getCampaign, getSender, listCampaigns, listTemplates, receiveBrevoMarketingWebhook, saveTemplate, searchRecipients, sendCampaign, sendCampaignTest, updateCampaign, validateRecipients } from "../controllers/marketingCampaignController";
import { requirePermission, requireRole, requireStaffAuth } from "../middlewares/staffAuth";

export const marketingCampaignRoutes = Router();
marketingCampaignRoutes.post("/brevo/webhook", receiveBrevoMarketingWebhook);
marketingCampaignRoutes.use(requireStaffAuth);
marketingCampaignRoutes.get("/campaigns", requirePermission(StaffPermissionKey.CAMPAIGNS_VIEW), listCampaigns);
marketingCampaignRoutes.get("/sender", requirePermission(StaffPermissionKey.CAMPAIGNS_VIEW), getSender);
marketingCampaignRoutes.get("/recipients", requireRole(StaffRole.SUPER_ADMIN), requirePermission(StaffPermissionKey.CAMPAIGNS_MANAGE), searchRecipients);
marketingCampaignRoutes.post("/recipients/validate", requireRole(StaffRole.SUPER_ADMIN), requirePermission(StaffPermissionKey.CAMPAIGNS_MANAGE), validateRecipients);
marketingCampaignRoutes.get("/templates", requirePermission(StaffPermissionKey.CAMPAIGNS_VIEW), listTemplates);
marketingCampaignRoutes.post("/templates", requireRole(StaffRole.SUPER_ADMIN), requirePermission(StaffPermissionKey.CAMPAIGNS_MANAGE), saveTemplate);
marketingCampaignRoutes.get("/campaigns/:id", requirePermission(StaffPermissionKey.CAMPAIGNS_VIEW), getCampaign);
marketingCampaignRoutes.post("/campaigns", requireRole(StaffRole.SUPER_ADMIN), requirePermission(StaffPermissionKey.CAMPAIGNS_MANAGE), createCampaign);
marketingCampaignRoutes.patch("/campaigns/:id", requireRole(StaffRole.SUPER_ADMIN), requirePermission(StaffPermissionKey.CAMPAIGNS_MANAGE), updateCampaign);
marketingCampaignRoutes.post("/campaigns/:id/test", requireRole(StaffRole.SUPER_ADMIN), requirePermission(StaffPermissionKey.CAMPAIGNS_MANAGE), sendCampaignTest);
marketingCampaignRoutes.post("/campaigns/:id/send", requireRole(StaffRole.SUPER_ADMIN), requirePermission(StaffPermissionKey.CAMPAIGNS_MANAGE), sendCampaign);
