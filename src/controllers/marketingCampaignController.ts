import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { campaignIdParamsSchema, createMarketingCampaignSchema, createMarketingTemplateSchema, recipientSearchSchema, sendMarketingCampaignSchema, sendTestCampaignSchema, updateMarketingCampaignSchema, validateRecipientsSchema } from "../validators/marketingCampaignSchemas";
import { createMarketingCampaign, createMarketingTemplate, dispatchMarketingCampaign, getMarketingCampaign, getMarketingSender, listMarketingCampaigns, listMarketingTemplates, processBrevoMarketingWebhook, searchMarketingRecipients, sendMarketingCampaignTest, updateMarketingCampaign, validateMarketingRecipients, verifyMarketingWebhook } from "../services/marketingCampaignService";
import { HttpError } from "../utils/httpError";
import { writeStaffAuditLog } from "../services/staffAuditService";

export const listCampaigns = asyncHandler(async (req: Request, res: Response) => {
  const campaigns = await listMarketingCampaigns();
  await writeStaffAuditLog({ action: "MARKETING_CAMPAIGNS_VIEWED", actorId: req.staffUser!.id, resourceType: "MARKETING_CAMPAIGN_DIRECTORY", metadata: { returnedCount: campaigns.length } });
  res.json({ items: campaigns });
});

export const getSender = asyncHandler(async (_req: Request, res: Response) => {
  res.json(getMarketingSender());
});

export const getCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { id } = campaignIdParamsSchema.parse(req.params);
  const campaign = await getMarketingCampaign(id);
  if (!campaign) throw new HttpError(404, "Campaign not found");
  await writeStaffAuditLog({ action: "MARKETING_CAMPAIGN_VIEWED", actorId: req.staffUser!.id, resourceType: "MARKETING_CAMPAIGN", resourceId: id });
  res.json(campaign);
});

export const searchRecipients = asyncHandler(async (req: Request, res: Response) => {
  const { search } = recipientSearchSchema.parse(req.query);
  res.json({ items: await searchMarketingRecipients(search) });
});

export const validateRecipients = asyncHandler(async (req: Request, res: Response) => {
  const { emails } = validateRecipientsSchema.parse(req.body);
  const result = await validateMarketingRecipients(emails);
  await writeStaffAuditLog({ action: "MARKETING_RECIPIENTS_VALIDATED", actorId: req.staffUser!.id, resourceType: "MARKETING_RECIPIENTS", metadata: { acceptedCount: result.acceptedCount, suppressedCount: result.suppressedCount, duplicateCount: result.duplicateCount } });
  res.json(result);
});

export const listTemplates = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await listMarketingTemplates());
});

export const saveTemplate = asyncHandler(async (req: Request, res: Response) => {
  const template = await createMarketingTemplate(req.staffUser!.id, createMarketingTemplateSchema.parse(req.body));
  await writeStaffAuditLog({ action: "MARKETING_TEMPLATE_CREATED", actorId: req.staffUser!.id, resourceType: "MARKETING_TEMPLATE", resourceId: template.id });
  res.status(201).json(template);
});

export const createCampaign = asyncHandler(async (req: Request, res: Response) => {
  const campaign = await createMarketingCampaign(req.staffUser!.id, createMarketingCampaignSchema.parse(req.body));
  await writeStaffAuditLog({ action: "MARKETING_CAMPAIGN_CREATED", actorId: req.staffUser!.id, resourceType: "MARKETING_CAMPAIGN", resourceId: campaign.id });
  res.status(201).json(campaign);
});

export const updateCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { id } = campaignIdParamsSchema.parse(req.params);
  const campaign = await updateMarketingCampaign(id, updateMarketingCampaignSchema.parse(req.body));
  if (!campaign) throw new HttpError(404, "Campaign not found");
  await writeStaffAuditLog({ action: "MARKETING_CAMPAIGN_UPDATED", actorId: req.staffUser!.id, resourceType: "MARKETING_CAMPAIGN", resourceId: id, metadata: { changedFields: Object.keys(req.body) } });
  res.json(campaign);
});

export const sendCampaignTest = asyncHandler(async (req: Request, res: Response) => {
  const { id } = campaignIdParamsSchema.parse(req.params);
  const { email } = sendTestCampaignSchema.parse(req.body);
  const campaign = await sendMarketingCampaignTest(id, email);
  if (!campaign) throw new HttpError(404, "Campaign not found");
  await writeStaffAuditLog({ action: "MARKETING_CAMPAIGN_TEST_SENT", actorId: req.staffUser!.id, resourceType: "MARKETING_CAMPAIGN", resourceId: id, metadata: { recipientHash: "redacted" } });
  res.status(202).json({ status: "test_sent" });
});

export const sendCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { id } = campaignIdParamsSchema.parse(req.params);
  sendMarketingCampaignSchema.parse(req.body);
  const campaign = await dispatchMarketingCampaign(id, req.staffUser!.id);
  if (!campaign) throw new HttpError(404, "Campaign not found");
  await writeStaffAuditLog({ action: "MARKETING_CAMPAIGN_SENT", actorId: req.staffUser!.id, resourceType: "MARKETING_CAMPAIGN", resourceId: id, metadata: { audienceCount: campaign.audienceCount } });
  res.json(campaign);
});

export const receiveBrevoMarketingWebhook = asyncHandler(async (req: Request, res: Response) => {
  const secret = req.header("x-lilivet-webhook-secret") || (typeof req.query.secret === "string" ? req.query.secret : undefined);
  if (!verifyMarketingWebhook(secret)) throw new HttpError(401, "Invalid webhook credentials");
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) throw new HttpError(400, "Invalid webhook payload");
  await processBrevoMarketingWebhook(req.body as Record<string, unknown>);
  res.status(204).end();
});
