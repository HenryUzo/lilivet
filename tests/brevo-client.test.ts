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

  it("uses a persistent Brevo campaign draft for asynchronous test rendering", async () => {
    configureBrevoEnv();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 84 }), { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const {
      createBrevoMarketingTestCampaign,
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

    const createBody = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    const sendBody = JSON.parse(String(fetchMock.mock.calls[1][1].body));
    expect(createBody.inlineImageActivation).toBe(true);
    expect(sendBody).toEqual({ emailTo: ["reviewer@example.com"] });
    expect(fetchMock.mock.calls[1][0]).toContain("/emailCampaigns/84/sendTest");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("can leave images remote when an email exceeds Brevo's inline image limit", async () => {
    configureBrevoEnv();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 85 }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const { createBrevoMarketingTestCampaign } = await import("../src/integrations/brevo/brevoClient.js");

    await createBrevoMarketingTestCampaign({
      name: "Large image campaign",
      subject: "Clinic update",
      htmlContent: '<img src="https://example.com/large-banner.png" alt="Banner">',
      textContent: "Clinic update",
      sender: { name: "Lili Veterinary Hospital", email: "hello@example.com" },
      inlineImageActivation: false
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.inlineImageActivation).toBe(false);
    expect(body.htmlContent).toContain("large-banner.png");
  });

  it("syncs campaign contacts in rate-limited batches", async () => {
    vi.useFakeTimers();
    configureBrevoEnv();
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const { upsertBrevoContactsToList } = await import("../src/integrations/brevo/brevoClient.js");

    const resultPromise = upsertBrevoContactsToList(7, Array.from({ length: 6 }, (_, index) => `client${index}@example.com`));
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(fetchMock.mock.calls.slice(0, 5).every((call) => String(call[0]).endsWith("/contacts"))).toBe(true);
    vi.useRealTimers();
  });
});
