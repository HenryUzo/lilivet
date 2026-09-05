import crypto from "node:crypto";
import { MarketingAudienceMode, MarketingConsentAction, MarketingConsentStatus, MarketingDeliveryStatus, MarketingCampaignStatus, Prisma } from "@prisma/client";
import { env } from "../config/env";
import { addBrevoContactsToList, createBrevoMarketingCampaign, createBrevoMarketingList, hashEmail, sendBrevoMarketingCampaign, sendBrevoTransactionalEmail } from "../integrations/brevo/brevoClient";
import { prisma } from "../prisma/client";
import { HttpError } from "../utils/httpError";

type ContentBlock = { id: string; type: "TITLE" | "TEXT" | "IMAGE" | "BUTTON" | "DIVIDER" | "LOGO" | "SOCIAL" | "SPACER"; text?: string; url?: string; alt?: string; align?: "left" | "center" | "right" };
type CampaignInput = { name: string; subject: string; previewText?: string | null; htmlContent: string; textContent: string; contentBlocks?: ContentBlock[]; templateId?: string | null; recipientSelectionConfirmed?: boolean; designConfigured?: boolean; audienceMode: MarketingAudienceMode; recipientEmails: string[] };
type AudienceRecipient = { email: string; clientProfileId: string | null };

const starterTemplates = [
  { id: "starter:clinic-update", name: "Clinic update", contentBlocks: [{ id: "title", type: "TITLE", text: "A note from Lili Veterinary Hospital", align: "center" }, { id: "text", type: "TEXT", text: "Share a timely update with your pet families.", align: "left" }, { id: "button", type: "BUTTON", text: "Book an appointment", url: "https://www.liliveterinaryhospital.com/book-appointment", align: "center" }] },
  { id: "starter:wellness-reminder", name: "Wellness reminder", contentBlocks: [{ id: "title", type: "TITLE", text: "Your pet's wellness visit", align: "center" }, { id: "text", type: "TEXT", text: "Regular wellness visits help us keep your pet healthy and comfortable.", align: "left" }, { id: "button", type: "BUTTON", text: "Schedule a visit", url: "https://www.liliveterinaryhospital.com/book-appointment", align: "center" }] },
  { id: "starter:seasonal-offer", name: "Seasonal offer", contentBlocks: [{ id: "title", type: "TITLE", text: "Care for every season", align: "center" }, { id: "text", type: "TEXT", text: "Tell your clients about a current Lili Veterinary Hospital offer.", align: "left" }, { id: "button", type: "BUTTON", text: "Learn more", url: "https://www.liliveterinaryhospital.com", align: "center" }] }
] satisfies Array<{ id: string; name: string; contentBlocks: ContentBlock[] }>;

function campaignFooter(address: string) {
  return `<hr><p style="font-size:12px;color:#59665f">Lili Veterinary Hospital<br>${address}<br><a href="{{ unsubscribe }}">Unsubscribe from promotional emails</a></p>`;
}

function sender() {
  return { name: env.BREVO_MARKETING_SENDER_NAME, email: env.BREVO_MARKETING_SENDER_EMAIL };
}

export function getMarketingSender() {
  return { ...sender(), address: env.BREVO_MARKETING_SENDER_ADDRESS };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function safeUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:", "mailto:", "tel:"].includes(url.protocol) ? url.toString() : null;
  } catch { return null; }
}

function renderBlocks(blocks: ContentBlock[]) {
  const html = blocks.map((block) => {
    const align = block.align ?? "left";
    const text = escapeHtml(block.text ?? "").replace(/\n/g, "<br>");
    const url = safeUrl(block.url);
    if (block.type === "TITLE") return `<h1 style="margin:0 0 20px;color:#102E24;font:700 28px Arial,sans-serif;text-align:${align}">${text}</h1>`;
    if (block.type === "TEXT") return `<p style="margin:0 0 18px;color:#33463d;font:16px/1.55 Arial,sans-serif;text-align:${align}">${text}</p>`;
    if ((block.type === "IMAGE" || block.type === "LOGO") && url) return `<p style="margin:0 0 20px;text-align:${align}"><img src="${escapeHtml(url)}" alt="${escapeHtml(block.alt ?? "Lili Veterinary Hospital")}" style="max-width:${block.type === "LOGO" ? "180px" : "100%"};height:auto;border:0" /></p>`;
    if (block.type === "BUTTON" && url) return `<p style="margin:0 0 22px;text-align:${align}"><a href="${escapeHtml(url)}" style="display:inline-block;border-radius:8px;background:#087C48;color:#ffffff;padding:13px 20px;font:bold 15px Arial,sans-serif;text-decoration:none">${text || "Learn more"}</a></p>`;
    if (block.type === "DIVIDER") return `<hr style="border:0;border-top:1px solid #DDEBE2;margin:24px 0">`;
    if (block.type === "SPACER") return `<div style="height:24px;line-height:24px">&nbsp;</div>`;
    if (block.type === "SOCIAL") return `<p style="margin:0 0 18px;color:#087C48;font:14px Arial,sans-serif;text-align:${align}">Follow Lili Veterinary Hospital online</p>`;
    return "";
  }).join("");
  const text = blocks.map((block) => block.text ?? block.url ?? "").filter(Boolean).join("\n\n");
  return { htmlContent: `<div style="max-width:640px;margin:0 auto;padding:28px;background:#ffffff">${html}</div>`, textContent: text || "Lili Veterinary Hospital" };
}

function formatCampaign(input: CampaignInput) {
  const { recipientEmails: _recipientEmails, contentBlocks = [], ...campaign } = input;
  const rendered = contentBlocks.length ? renderBlocks(contentBlocks) : { htmlContent: input.htmlContent, textContent: input.textContent };
  return { ...campaign, contentBlocks: contentBlocks.length ? contentBlocks : Prisma.JsonNull, htmlContent: `${rendered.htmlContent}${campaignFooter(env.BREVO_MARKETING_SENDER_ADDRESS)}`, textContent: rendered.textContent };
}

function enabled() {
  if (!env.BREVO_MARKETING_ENABLED) throw new HttpError(503, "Email campaigns are not configured yet. Complete the Brevo sender setup first.");
}

async function eligibleAudience() {
  return prisma.clientProfile.findMany({
    where: { emailMarketingStatus: MarketingConsentStatus.SUBSCRIBED, owner: { email: { not: null } } },
    select: { id: true, owner: { select: { email: true } } }
  });
}

export async function searchMarketingRecipients(search?: string) {
  const profiles = await prisma.clientProfile.findMany({
    where: {
      emailMarketingStatus: MarketingConsentStatus.SUBSCRIBED,
      owner: { email: { not: null }, ...(search ? { OR: [{ firstName: { contains: search, mode: "insensitive" } }, { lastName: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}) }
    },
    take: 30,
    orderBy: { updatedAt: "desc" },
    select: { id: true, owner: { select: { firstName: true, lastName: true, email: true } } }
  });
  return profiles.map((profile) => ({ id: profile.id, name: `${profile.owner.firstName} ${profile.owner.lastName}`.trim(), email: profile.owner.email! }));
}

export async function validateMarketingRecipients(emails: string[]) {
  const normalized = normalizeRecipientEmails(emails);
  const allowed = await unsuppressedAudience(normalized.map((email) => ({ email, clientProfileId: null })));
  const allowedSet = new Set(allowed.map((recipient) => recipient.email));
  return { recipientEmails: allowed.map((recipient) => recipient.email), acceptedCount: allowed.length, suppressedCount: normalized.length - allowed.length, duplicateCount: emails.length - normalized.length };
}

export async function listMarketingTemplates() {
  const saved = await prisma.marketingEmailTemplate.findMany({ orderBy: { updatedAt: "desc" }, take: 100 });
  return { starterTemplates, savedTemplates: saved };
}

export async function createMarketingTemplate(createdById: string, input: Pick<CampaignInput, "contentBlocks" | "htmlContent" | "textContent"> & { name: string }) {
  const rendered = input.contentBlocks?.length ? renderBlocks(input.contentBlocks) : { htmlContent: input.htmlContent, textContent: input.textContent };
  return prisma.marketingEmailTemplate.create({ data: { name: input.name, contentBlocks: input.contentBlocks ?? [], htmlContent: rendered.htmlContent, textContent: rendered.textContent, createdById } });
}

function normalizeRecipientEmails(emails: string[]) {
  return [...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))];
}

async function unsuppressedAudience(recipients: AudienceRecipient[]) {
  const hashes = recipients.map((recipient) => hashEmail(recipient.email));
  const suppressed = await prisma.marketingEmailSuppression.findMany({ where: { emailHash: { in: hashes } }, select: { emailHash: true } });
  const suppressedHashes = new Set(suppressed.map((entry) => entry.emailHash));
  return recipients.filter((recipient) => !suppressedHashes.has(hashEmail(recipient.email)));
}

async function audienceForCampaign(campaign: { audienceMode: MarketingAudienceMode; customAudience: unknown }) {
  if (campaign.audienceMode === MarketingAudienceMode.CONSENTED_CLIENTS) {
    const profiles = await eligibleAudience();
    return unsuppressedAudience(profiles.map((profile) => ({ email: profile.owner.email!, clientProfileId: profile.id })));
  }
  const emails = Array.isArray(campaign.customAudience) ? campaign.customAudience.filter((email): email is string => typeof email === "string") : [];
  const profiles = await prisma.clientProfile.findMany({ where: { owner: { email: { in: emails } } }, select: { id: true, owner: { select: { email: true } } } });
  const profileByEmail = new Map(profiles.filter((profile) => profile.owner.email).map((profile) => [profile.owner.email!.toLowerCase(), profile.id]));
  return unsuppressedAudience(normalizeRecipientEmails(emails).map((email) => ({ email, clientProfileId: profileByEmail.get(email) ?? null })));
}

export async function listMarketingCampaigns() {
  return prisma.marketingCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { _count: { select: { deliveries: true } } } });
}

export async function getMarketingCampaign(id: string) {
  return prisma.marketingCampaign.findUnique({ where: { id }, include: { _count: { select: { deliveries: true } } } });
}

export async function createMarketingCampaign(createdById: string, input: CampaignInput) {
  if (input.audienceMode === MarketingAudienceMode.SELECTED_EMAILS && !input.recipientEmails.length) throw new HttpError(422, "Add at least one email address for a selected-email campaign");
  const formatted = formatCampaign(input);
  const campaign = await prisma.marketingCampaign.create({ data: { ...formatted, customAudience: input.audienceMode === MarketingAudienceMode.SELECTED_EMAILS ? normalizeRecipientEmails(input.recipientEmails) : undefined, senderName: env.BREVO_MARKETING_SENDER_NAME, senderEmail: env.BREVO_MARKETING_SENDER_EMAIL || "pending-configuration@invalid.local", senderAddress: env.BREVO_MARKETING_SENDER_ADDRESS || "Pending sender configuration", audienceCount: 0, createdById } });
  return prisma.marketingCampaign.update({ where: { id: campaign.id }, data: { audienceCount: (await audienceForCampaign(campaign)).length } });
}

export async function updateMarketingCampaign(id: string, input: Partial<CampaignInput>) {
  const current = await prisma.marketingCampaign.findUnique({ where: { id } });
  if (!current) return null;
  if (current.status !== MarketingCampaignStatus.DRAFT) throw new HttpError(409, "Only draft campaigns can be edited");
  const audienceMode = input.audienceMode ?? current.audienceMode;
  const recipientEmails = input.recipientEmails ?? (Array.isArray(current.customAudience) ? current.customAudience.filter((email): email is string => typeof email === "string") : []);
  if (audienceMode === MarketingAudienceMode.SELECTED_EMAILS && !recipientEmails.length) throw new HttpError(422, "Add at least one email address for a selected-email campaign");
  const contentChanged = input.htmlContent !== undefined || input.textContent !== undefined || input.name !== undefined || input.subject !== undefined || input.previewText !== undefined || input.contentBlocks !== undefined || input.templateId !== undefined || input.recipientSelectionConfirmed !== undefined || input.designConfigured !== undefined;
  const currentBlocks = Array.isArray(current.contentBlocks) ? current.contentBlocks as unknown as ContentBlock[] : [];
  const formatted = contentChanged ? formatCampaign({ name: input.name ?? current.name, subject: input.subject ?? current.subject, previewText: input.previewText === undefined ? current.previewText : input.previewText, htmlContent: input.htmlContent ?? current.htmlContent.replace(campaignFooter(current.senderAddress), ""), textContent: input.textContent ?? current.textContent, contentBlocks: input.contentBlocks ?? currentBlocks, templateId: input.templateId === undefined ? current.templateId : input.templateId, recipientSelectionConfirmed: input.recipientSelectionConfirmed ?? current.recipientSelectionConfirmed, designConfigured: input.designConfigured ?? current.designConfigured, audienceMode, recipientEmails }) : {};
  const next = await prisma.marketingCampaign.update({ where: { id }, data: { ...formatted, audienceMode, customAudience: audienceMode === MarketingAudienceMode.SELECTED_EMAILS ? normalizeRecipientEmails(recipientEmails) : Prisma.JsonNull } });
  return prisma.marketingCampaign.update({ where: { id }, data: { audienceCount: (await audienceForCampaign(next)).length } });
}

export async function sendMarketingCampaignTest(id: string, email: string) {
  const campaign = await getMarketingCampaign(id);
  if (!campaign) return null;
  const result = await sendBrevoTransactionalEmail({ to: { email, name: "Lili Vet campaign reviewer" }, subject: `[TEST] ${campaign.subject}`, htmlContent: campaign.htmlContent, textContent: campaign.textContent });
  if (!result.ok) throw new HttpError(503, "The test email could not be sent");
  return campaign;
}

export async function dispatchMarketingCampaign(id: string, staffUserId: string) {
  enabled();
  const campaign = await prisma.marketingCampaign.findUnique({ where: { id } });
  if (!campaign) return null;
  if (campaign.status !== MarketingCampaignStatus.DRAFT && campaign.status !== MarketingCampaignStatus.READY_TO_SEND) throw new HttpError(409, "This campaign has already been sent or is being sent");
  if (!campaign.recipientSelectionConfirmed || !campaign.designConfigured || campaign.subject.trim().length < 3) throw new HttpError(422, "Complete recipients, subject, and design before sending this campaign");
  const audience = await audienceForCampaign(campaign);
  if (!audience.length) throw new HttpError(422, "There are no eligible email addresses after opt-outs and suppressions are applied");
  const emails = audience.map((recipient) => recipient.email);
  const list = await createBrevoMarketingList(`Lili Vet campaign ${campaign.id}`);
  if (!list.ok) throw new HttpError(503, "Brevo could not prepare the campaign audience");
  const listId = Number(list.data?.id);
  if (!Number.isInteger(listId)) throw new HttpError(503, "Brevo could not prepare the campaign audience");
  const contacts = await addBrevoContactsToList(listId, emails);
  if (!contacts.ok) throw new HttpError(503, "Brevo could not prepare the campaign audience");
  const remote = await createBrevoMarketingCampaign({ name: campaign.name, subject: campaign.subject, previewText: campaign.previewText, htmlContent: campaign.htmlContent, textContent: campaign.textContent, sender: sender(), listId });
  if (!remote.ok) throw new HttpError(503, "Brevo could not create the campaign");
  const brevoCampaignId = Number(remote.data?.id);
  if (!Number.isInteger(brevoCampaignId)) throw new HttpError(503, "Brevo could not create the campaign");
  await prisma.$transaction(async (tx) => {
    await tx.marketingCampaign.update({ where: { id }, data: { status: MarketingCampaignStatus.SENDING, audienceCount: audience.length, brevoCampaignId, brevoListId: listId, approvedAt: new Date(), approvedById: staffUserId, sentById: staffUserId } });
    await tx.marketingCampaignDelivery.createMany({ data: audience.map((recipient) => ({ campaignId: id, clientProfileId: recipient.clientProfileId, recipientHash: hashEmail(recipient.email), status: MarketingDeliveryStatus.QUEUED })), skipDuplicates: true });
  });
  const sent = await sendBrevoMarketingCampaign(brevoCampaignId);
  if (!sent.ok) { await prisma.marketingCampaign.update({ where: { id }, data: { status: MarketingCampaignStatus.FAILED, failureReason: `Brevo response ${sent.status}` } }); throw new HttpError(503, "Brevo could not start the campaign"); }
  return prisma.marketingCampaign.update({ where: { id }, data: { status: MarketingCampaignStatus.SENT, sentAt: new Date() } });
}

export async function processBrevoMarketingWebhook(body: Record<string, unknown>) {
  const event = typeof body.event === "string" ? body.event.toLowerCase() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const campaignId = Number(body["campaign_id"]);
  if (!email || !Number.isInteger(campaignId)) return;
  const deliveryStatus = event.includes("delivered") ? MarketingDeliveryStatus.DELIVERED : event.includes("bounce") ? MarketingDeliveryStatus.BOUNCED : event.includes("spam") || event.includes("complaint") ? MarketingDeliveryStatus.COMPLAINED : event.includes("unsubscribe") ? MarketingDeliveryStatus.UNSUBSCRIBED : MarketingDeliveryStatus.SENT;
  const campaign = await prisma.marketingCampaign.findUnique({ where: { brevoCampaignId: campaignId } });
  if (!campaign) return;
  const emailHash = hashEmail(email);
  const profile = await prisma.clientProfile.findFirst({ where: { owner: { email: { equals: email, mode: "insensitive" } } }, select: { id: true } });
  await prisma.marketingCampaignDelivery.updateMany({ where: { campaignId: campaign.id, recipientHash: emailHash }, data: { status: deliveryStatus, eventAt: new Date() } });
  if (deliveryStatus === MarketingDeliveryStatus.UNSUBSCRIBED || deliveryStatus === MarketingDeliveryStatus.BOUNCED || deliveryStatus === MarketingDeliveryStatus.COMPLAINED) {
    const status = deliveryStatus === MarketingDeliveryStatus.UNSUBSCRIBED ? MarketingConsentStatus.UNSUBSCRIBED : MarketingConsentStatus.SUPPRESSED;
    const action = deliveryStatus === MarketingDeliveryStatus.UNSUBSCRIBED ? MarketingConsentAction.OPTED_OUT : MarketingConsentAction.SUPPRESSED;
    await prisma.$transaction(async (tx) => {
      await tx.marketingEmailSuppression.upsert({ where: { emailHash }, create: { emailHash, reason: deliveryStatus, source: `brevo:${event || "webhook"}` }, update: { reason: deliveryStatus, source: `brevo:${event || "webhook"}`, suppressedAt: new Date() } });
      if (profile) {
        await tx.clientProfile.update({ where: { id: profile.id }, data: { emailMarketingStatus: status } });
        await tx.clientCommunicationConsent.create({ data: { clientProfileId: profile.id, channel: "EMAIL", action, source: `brevo:${event || "webhook"}` } });
      }
    });
  }
}

export function verifyMarketingWebhook(secret: string | undefined) {
  const expected = env.BREVO_MARKETING_WEBHOOK_SECRET;
  return Boolean(expected && secret && secret.length === expected.length && crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(expected)));
}
