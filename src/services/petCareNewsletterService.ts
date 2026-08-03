import crypto from "crypto";
import { env } from "../config/env";
import {
  hashEmail,
  maskEmail,
  sendPetCareDoubleOptIn
} from "../integrations/brevo/brevoClient";
import { HttpError } from "../utils/httpError";
import type { PetCareNewsletterSubscriptionInput } from "../validators/petCareNewsletterSchemas";

type NewsletterSubscriptionResult = {
  success: true;
  status: "confirmation_required";
  message: string;
};

const confirmationRequiredResponse: NewsletterSubscriptionResult = {
  success: true,
  status: "confirmation_required",
  message: "Please check your email to confirm your subscription."
};

function isSafeExistingSubscriptionResponse(status: number, bodyText: string) {
  if (![400, 409].includes(status)) {
    return false;
  }

  const normalized = bodyText.toLowerCase();

  if (/(blocklist|blacklist|unsubscrib|opt.?out|forbidden|denied)/i.test(normalized)) {
    return false;
  }

  return /(?:contact|email|subscriber).*(?:already (?:exists|subscribed)|duplicate|pending)|(?:already (?:exists|subscribed)|duplicate|pending).*(?:contact|email|subscriber)/i.test(
    normalized
  );
}

function logBrevoFailure(input: {
  correlationId: string;
  status: number;
  email: string;
  errorMessage?: string;
}) {
  console.error(JSON.stringify({
    event: "pet_care_newsletter_brevo_failed",
    correlationId: input.correlationId,
    status: input.status,
    emailHash: hashEmail(input.email),
    emailMasked: maskEmail(input.email),
    error: input.errorMessage ?? "Brevo request failed"
  }));
}

export async function subscribeToPetCareNewsletter(
  input: PetCareNewsletterSubscriptionInput
): Promise<NewsletterSubscriptionResult> {
  if (!env.PET_CARE_NEWSLETTER_ENABLED) {
    throw new HttpError(503, "Pet care newsletter signup is temporarily unavailable.");
  }

  const result = await sendPetCareDoubleOptIn({
    email: input.email,
    petPreference: input.petPreference
  });

  if (result.ok) {
    return confirmationRequiredResponse;
  }

  if (isSafeExistingSubscriptionResponse(result.status, result.bodyText)) {
    return confirmationRequiredResponse;
  }

  const correlationId = crypto.randomUUID();

  logBrevoFailure({
    correlationId,
    status: result.status,
    email: input.email,
    errorMessage: result.errorMessage
  });

  throw new HttpError(
    503,
    "Pet care newsletter signup is temporarily unavailable.",
    { correlationId }
  );
}
