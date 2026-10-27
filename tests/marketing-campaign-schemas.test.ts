import { describe, expect, it } from "vitest";
import { createMarketingCampaignSchema } from "../src/validators/marketingCampaignSchemas";

const campaign = {
  name: "Dental offer reminder",
  subject: "A gentle reminder about your pet’s dental health",
  previewText: "Ask our team about dental care.",
  htmlContent: "<p>Ask our team about dental care.</p>",
  textContent: "Ask our team about dental care.",
  contentBlocks: [
    { id: "title", type: "TITLE", text: "Dental health starts with a conversation" },
    { id: "text", type: "TEXT", text: "Contact our team to ask about the offer." },
    { id: "button", type: "BUTTON", text: "Visit our website", url: "https://www.liliveterinaryhospital.com" }
  ],
  recipientSelectionConfirmed: true,
  designConfigured: true,
  audienceMode: "SELECTED_EMAILS",
  recipientEmails: ["client@example.com"]
};

describe("marketing campaign schema", () => {
  it.each([
    "starter:clinic-update",
    "starter:wellness-reminder",
    "starter:seasonal-offer"
  ])("accepts built-in template id %s", (templateId) => {
    expect(createMarketingCampaignSchema.safeParse({ ...campaign, templateId }).success).toBe(true);
  });

  it("accepts saved template CUIDs and no template", () => {
    expect(createMarketingCampaignSchema.safeParse({ ...campaign, templateId: "clw5b7j9a0000qzrmn2e1x4vp" }).success).toBe(true);
    expect(createMarketingCampaignSchema.safeParse({ ...campaign, templateId: null }).success).toBe(true);
  });

  it("rejects unknown template ids", () => {
    expect(createMarketingCampaignSchema.safeParse({ ...campaign, templateId: "starter:unknown" }).success).toBe(false);
  });
});
