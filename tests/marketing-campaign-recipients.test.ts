import { beforeEach, describe, expect, it, vi } from "vitest";
import { MarketingConsentStatus, OwnerDirectoryType } from "@prisma/client";
import { hashEmail } from "../src/integrations/brevo/brevoClient";

const { ownerFindManyMock, potentialFindManyMock, suppressionFindManyMock } = vi.hoisted(() => ({
  ownerFindManyMock: vi.fn(),
  potentialFindManyMock: vi.fn(),
  suppressionFindManyMock: vi.fn()
}));

vi.mock("../src/prisma/client", () => ({
  prisma: {
    owner: { findMany: ownerFindManyMock },
    potentialClient: { findMany: potentialFindManyMock },
    marketingEmailSuppression: { findMany: suppressionFindManyMock }
  }
}));

import { validateMarketingRecipients } from "../src/services/marketingCampaignService";

describe("marketing campaign recipient eligibility", () => {
  beforeEach(() => {
    ownerFindManyMock.mockResolvedValue([
      { email: "imported-client@example.com", directoryType: OwnerDirectoryType.CLIENT, clientProfile: null },
      { email: "opted-out@example.com", directoryType: OwnerDirectoryType.CLIENT, clientProfile: { emailMarketingStatus: MarketingConsentStatus.UNSUBSCRIBED } },
      { email: "subscriber@example.com", directoryType: OwnerDirectoryType.CLIENT, clientProfile: { emailMarketingStatus: MarketingConsentStatus.SUBSCRIBED } }
    ]);
    potentialFindManyMock.mockResolvedValue([{ normalizedEmail: "potential@example.com", emailMarketingOptIn: false, emailMarketingConfirmed: false }]);
    suppressionFindManyMock.mockResolvedValue([{ emailHash: hashEmail("suppressed@example.com") }]);
  });

  it("allows known clients and potential clients without an opt-out while still rejecting opt-outs, suppressions, and unknown emails", async () => {
    const result = await validateMarketingRecipients([
      "imported-client@example.com",
      "potential@example.com",
      "subscriber@example.com",
      "opted-out@example.com",
      "suppressed@example.com",
      "unknown@example.com"
    ]);

    expect(result.recipientEmails).toEqual([
      "imported-client@example.com",
      "potential@example.com",
      "subscriber@example.com"
    ]);
    expect(result.acceptedCount).toBe(3);
    expect(result.suppressedCount).toBe(3);
  });
});

