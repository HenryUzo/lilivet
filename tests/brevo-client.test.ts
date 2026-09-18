import { beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

function configureBrevoEnv() {
  process.env = {
    ...originalEnv,
    NODE_ENV: "test",
    DATABASE_URL: originalEnv.DATABASE_URL ?? "postgresql://test:test@localhost:5432/lilivet_test?sslmode=disable",
    JWT_SECRET: originalEnv.JWT_SECRET ?? "test-secret-value-that-is-long-enough",
    BREVO_API_KEY: "test-brevo-api-key",
    BREVO_API_BASE_URL: "https://api.brevo.com/v3"
  };
}

describe("Brevo campaign image delivery", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("enables inline images for campaign delivery", async () => {
    configureBrevoEnv();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 42 }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const { createBrevoMarketingCampaign } = await import("../src/integrations/brevo/brevoClient.js");

    await createBrevoMarketingCampaign({
      name: "Wellness update",
      subject: "A healthier season",
      htmlContent: '<img src="https://example.com/banner.png" alt="Banner">',
      textContent: "A healthier season",
      sender: { name: "Lili Veterinary Hospital", email: "hello@example.com" },
      listId: 7
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.inlineImageActivation).toBe(true);
    expect(body.htmlContent).toContain("banner.png");
  });

  it("uses Brevo campaign tests and removes the temporary draft", async () => {
    configureBrevoEnv();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 84 }), { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const {
      createBrevoMarketingTestCampaign,
      deleteBrevoMarketingCampaign,
      sendBrevoMarketingCampaignTest
    } = await import("../src/integrations/brevo/brevoClient.js");

    const created = await createBrevoMarketingTestCampaign({
      name: "Wellness update",
      subject: "A healthier season",
      htmlContent: '<img src="https://example.com/banner.png" alt="Banner">',
      textContent: "A healthier season",
      sender: { name: "Lili Veterinary Hospital", email: "hello@example.com" }
    });
    expect(created.ok).toBe(true);
    await sendBrevoMarketingCampaignTest(84, "reviewer@example.com");
    await deleteBrevoMarketingCampaign(84);

    const createBody = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    const sendBody = JSON.parse(String(fetchMock.mock.calls[1][1].body));
    expect(createBody.inlineImageActivation).toBe(true);
    expect(sendBody).toEqual({ emailTo: ["reviewer@example.com"] });
    expect(fetchMock.mock.calls[1][0]).toContain("/emailCampaigns/84/sendTest");
    expect(fetchMock.mock.calls[2][1].method).toBe("DELETE");
  });
});
