import { z } from "zod";

const campaignText = z.string().trim().max(12000);
const recipientEmail = z.string().trim().email().max(320).transform((value) => value.toLowerCase());
const blockSchema = z.object({
  id: z.string().trim().min(1).max(80),
  type: z.enum(["TITLE", "TEXT", "IMAGE", "BUTTON", "DIVIDER", "LOGO", "SOCIAL", "SPACER"]),
  text: z.string().max(4000).optional(),
  url: z.string().url().max(2000).optional(),
  alt: z.string().max(240).optional(),
  align: z.enum(["left", "center", "right"]).optional()
}).strict();

const campaignFields = {
  name: z.string().trim().min(3).max(120),
  subject: z.string().trim().max(180).default(""),
  previewText: z.string().trim().max(180).nullable().optional(),
  htmlContent: campaignText,
  textContent: campaignText,
  contentBlocks: z.array(blockSchema).max(60).default([]),
  templateId: z.string().cuid().nullable().optional(),
  recipientSelectionConfirmed: z.boolean().default(false),
  designConfigured: z.boolean().default(false),
  audienceMode: z.enum(["CONSENTED_CLIENTS", "SELECTED_EMAILS"]).default("CONSENTED_CLIENTS"),
  recipientEmails: z.array(recipientEmail).max(5000).default([])
};

export const createMarketingCampaignSchema = z.object(campaignFields).strict();

export const updateMarketingCampaignSchema = createMarketingCampaignSchema.partial().strict();
export const campaignIdParamsSchema = z.object({ id: z.string().cuid() });
export const sendTestCampaignSchema = z.object({ email: z.string().trim().email().max(320) }).strict();
export const sendMarketingCampaignSchema = z.object({ confirm: z.literal(true) }).strict();
export const recipientSearchSchema = z.object({ search: z.string().trim().min(1).max(160).optional() });
export const validateRecipientsSchema = z.object({ emails: z.array(recipientEmail).min(1).max(5000) }).strict();
export const createMarketingTemplateSchema = z.object({
  name: z.string().trim().min(3).max(120),
  contentBlocks: z.array(blockSchema).min(1).max(60),
  htmlContent: campaignText,
  textContent: campaignText
}).strict();
