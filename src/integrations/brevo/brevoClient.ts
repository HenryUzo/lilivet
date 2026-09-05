import crypto from "crypto";
import { env } from "../../config/env";

type DoubleOptInInput = {
  email: string;
  petPreference: "DOG" | "CAT" | "BOTH";
};

type TransactionalEmailInput = {
  to: { email: string; name: string };
  subject: string;
  htmlContent: string;
  textContent: string;
};

type BrevoResult =
  | { ok: true }
  | { ok: false; status: number; bodyText: string; errorMessage?: string };

type BrevoRequestResult =
  | { ok: true; status: number; bodyText: string; data?: Record<string, unknown> }
  | { ok: false; status: number; bodyText: string; errorMessage?: string };

const BREVO_TIMEOUT_MS = 8000;

type BrevoMarketingCampaignInput = {
  name: string;
  subject: string;
  previewText?: string | null;
  htmlContent: string;
  textContent: string;
  sender: { name: string; email: string };
  listId: number;
};

async function brevoRequest(path: string, method: "POST", body: unknown): Promise<BrevoRequestResult> {
  if (!env.BREVO_API_KEY) return { ok: false, status: 0, bodyText: "", errorMessage: "BREVO_API_KEY is not configured" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BREVO_TIMEOUT_MS);
  try {
    const response = await fetch(`${normalizeBrevoBaseUrl()}${path}`, {
      method,
      headers: { accept: "application/json", "api-key": env.BREVO_API_KEY, "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify(body)
    });
    const bodyText = (await response.text()).slice(0, 1000);
    if (!response.ok) return { ok: false, status: response.status, bodyText };
    try { return { ok: true, status: response.status, bodyText, data: bodyText ? JSON.parse(bodyText) as Record<string, unknown> : undefined }; }
    catch { return { ok: true, status: response.status, bodyText }; }
  } catch (error) {
    return { ok: false, status: 0, bodyText: "", errorMessage: error instanceof Error ? error.message : "Brevo request failed" };
  } finally { clearTimeout(timeout); }
}

export function maskEmail(email: string) {
  const [localPart = "", domain = ""] = email.split("@");
  const localPrefix = localPart.slice(0, 2);
  return `${localPrefix}${localPart.length > 2 ? "***" : "*"}@${domain}`;
}

export function hashEmail(email: string) {
  return crypto.createHash("sha256").update(email).digest("hex").slice(0, 16);
}

function normalizeBrevoBaseUrl() {
  return env.BREVO_API_BASE_URL.replace(/\/+$/, "");
}

function parseSender() {
  const match = env.MAIL_FROM.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return match
    ? { name: match[1].replace(/^['"]|['"]$/g, "") || "Lili Veterinary Hospital", email: match[2] }
    : { name: "Lili Veterinary Hospital", email: env.MAIL_FROM.trim() };
}

export async function sendBrevoTransactionalEmail(input: TransactionalEmailInput): Promise<BrevoResult> {
  if (!env.BREVO_API_KEY) {
    return { ok: false, status: 0, bodyText: "", errorMessage: "BREVO_API_KEY is not configured" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BREVO_TIMEOUT_MS);
  try {
    const response = await fetch(`${normalizeBrevoBaseUrl()}/smtp/email`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": env.BREVO_API_KEY,
        "content-type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        sender: parseSender(),
        to: [input.to],
        subject: input.subject,
        htmlContent: input.htmlContent,
        textContent: input.textContent
      })
    });
    if (response.ok) return { ok: true };
    return { ok: false, status: response.status, bodyText: (await response.text()).slice(0, 1000) };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      bodyText: "",
      errorMessage: error instanceof Error ? error.message : "Brevo request failed"
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendPetCareDoubleOptIn(input: DoubleOptInInput): Promise<BrevoResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BREVO_TIMEOUT_MS);

  try {
    const response = await fetch(`${normalizeBrevoBaseUrl()}/contacts/doubleOptinConfirmation`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": env.BREVO_API_KEY,
        "content-type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        email: input.email,
        includeListIds: [env.BREVO_PET_CARE_LIST_ID],
        templateId: env.BREVO_DOI_TEMPLATE_ID,
        redirectionUrl: env.BREVO_DOI_REDIRECT_URL,
        attributes: {
          [env.BREVO_PET_PREFERENCE_ATTRIBUTE]: input.petPreference
        }
      })
    });

    if (response.ok) {
      return { ok: true };
    }

    return {
      ok: false,
      status: response.status,
      bodyText: (await response.text()).slice(0, 1000)
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      bodyText: "",
      errorMessage: error instanceof Error ? error.message : "Brevo request failed"
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function createBrevoMarketingList(name: string) {
  return brevoRequest("/contacts/lists", "POST", { name, folderId: 1 });
}

export async function addBrevoContactsToList(listId: number, emails: string[]) {
  return brevoRequest(`/contacts/lists/${listId}/contacts/add`, "POST", { emails });
}

export async function createBrevoMarketingCampaign(input: BrevoMarketingCampaignInput) {
  return brevoRequest("/emailCampaigns", "POST", {
    name: input.name,
    subject: input.subject,
    previewText: input.previewText || undefined,
    sender: input.sender,
    type: "classic",
    htmlContent: input.htmlContent,
    textContent: input.textContent,
    recipients: { listIds: [input.listId] },
    inlineImageActivation: false,
    mirrorActive: false
  });
}

export async function sendBrevoMarketingCampaign(campaignId: number) {
  return brevoRequest(`/emailCampaigns/${campaignId}/sendNow`, "POST", {});
}
