import crypto from "crypto";
import { env } from "../../config/env";

type DoubleOptInInput = {
  email: string;
  petPreference: "DOG" | "CAT" | "BOTH";
};

type BrevoResult =
  | { ok: true }
  | { ok: false; status: number; bodyText: string; errorMessage?: string };

const BREVO_TIMEOUT_MS = 8000;

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
