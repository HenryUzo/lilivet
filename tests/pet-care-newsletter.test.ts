import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryRawMock } = vi.hoisted(() => ({
  queryRawMock: vi.fn()
}));

vi.mock("../src/prisma/client", () => ({
  prisma: {
    $queryRaw: queryRawMock
  }
}));

const originalEnv = { ...process.env };

function configureNewsletterEnv(enabled: boolean) {
  process.env = {
    ...originalEnv,
    NODE_ENV: "test",
    DATABASE_URL:
      originalEnv.DATABASE_URL ??
      "postgresql://test:test@localhost:5432/lilivet_test?sslmode=disable",
    JWT_SECRET:
      originalEnv.JWT_SECRET ?? "test-secret-value-that-is-long-enough",
    JWT_ISSUER: originalEnv.JWT_ISSUER ?? "lili-vet-backend",
    JWT_AUDIENCE: originalEnv.JWT_AUDIENCE ?? "lili-vet-staff",
    PET_CARE_NEWSLETTER_ENABLED: enabled ? "true" : "false",
    BREVO_API_KEY: enabled ? "test-brevo-api-key" : "",
    BREVO_PET_CARE_LIST_ID: enabled ? "42" : "",
    BREVO_DOI_TEMPLATE_ID: enabled ? "101" : "",
    BREVO_DOI_REDIRECT_URL: "https://liliveterinaryhospital.com/pet-care?subscription=confirmed",
    BREVO_PET_PREFERENCE_ATTRIBUTE: "PET_PREFERENCE",
    BREVO_API_BASE_URL: "https://api.brevo.com/v3"
  };
}

async function loadApp() {
  vi.resetModules();
  const { app } = await import("../src/app.js");
  return app;
}

describe("pet care newsletter subscriptions", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    queryRawMock.mockReset();
    vi.restoreAllMocks();
  });

  it("returns 202 and calls Brevo double opt-in for a valid signup", async () => {
    configureNewsletterEnv(true);
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const app = await loadApp();

    const response = await request(app)
      .post("/api/pet-care/newsletter-subscriptions")
      .send({
        email: " OWNER@Example.com ",
        petPreference: "DOG",
        consent: true,
        source: "pet-care-library",
        website: ""
      });

    expect(response.status).toBe(202);
    expect(response.body).toEqual({
      success: true,
      status: "confirmation_required",
      message: "Please check your email to confirm your subscription."
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(requestInit.body))).toMatchObject({
      email: "owner@example.com",
      includeListIds: [42],
      templateId: 101,
      attributes: { PET_PREFERENCE: "DOG" }
    });
  });

  it("rejects invalid email, missing consent, invalid pet preference, and honeypot submissions", async () => {
    configureNewsletterEnv(true);
    vi.stubGlobal("fetch", vi.fn());
    const app = await loadApp();

    const invalidEmail = await request(app)
      .post("/api/pet-care/newsletter-subscriptions")
      .send({ email: "not-email", petPreference: "DOG", consent: true, website: "" });
    const missingConsent = await request(app)
      .post("/api/pet-care/newsletter-subscriptions")
      .send({ email: "owner@example.com", petPreference: "DOG", consent: false, website: "" });
    const invalidPreference = await request(app)
      .post("/api/pet-care/newsletter-subscriptions")
      .send({ email: "owner@example.com", petPreference: "BIRD", consent: true, website: "" });
    const honeypot = await request(app)
      .post("/api/pet-care/newsletter-subscriptions")
      .send({ email: "owner@example.com", petPreference: "DOG", consent: true, website: "bot" });

    expect(invalidEmail.status).toBe(400);
    expect(missingConsent.status).toBe(400);
    expect(invalidPreference.status).toBe(400);
    expect(honeypot.status).toBe(400);
  });

  it("returns 503 without calling Brevo when the feature is disabled", async () => {
    configureNewsletterEnv(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const app = await loadApp();

    const response = await request(app)
      .post("/api/pet-care/newsletter-subscriptions")
      .send({ email: "owner@example.com", petPreference: "CAT", consent: true, website: "" });

    expect(response.status).toBe(503);
    expect(response.body.error.message).toBe("Pet care newsletter signup is temporarily unavailable.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats duplicate or pending Brevo responses as confirmation required", async () => {
    configureNewsletterEnv(true);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("contact already exists", { status: 409 }))
    );
    const app = await loadApp();

    const response = await request(app)
      .post("/api/pet-care/newsletter-subscriptions")
      .send({ email: "owner@example.com", petPreference: "BOTH", consent: true, website: "" });

    expect(response.status).toBe(202);
    expect(response.body.status).toBe("confirmation_required");
  });

  it("returns a generic 503 for Brevo failures and does not leak the API key", async () => {
    configureNewsletterEnv(true);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("upstream includes test-brevo-api-key", { status: 500 }))
    );
    const app = await loadApp();

    const response = await request(app)
      .post("/api/pet-care/newsletter-subscriptions")
      .send({ email: "owner@example.com", petPreference: "DOG", consent: true, website: "" });

    expect(response.status).toBe(503);
    expect(JSON.stringify(response.body)).not.toContain("test-brevo-api-key");
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(String(consoleErrorSpy.mock.calls[0][0])).not.toContain("owner@example.com");
    expect(String(consoleErrorSpy.mock.calls[0][0])).not.toContain("test-brevo-api-key");
  });

  it("rate limits repeated newsletter requests", async () => {
    configureNewsletterEnv(true);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 201 })));
    const app = await loadApp();

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await request(app)
        .post("/api/pet-care/newsletter-subscriptions")
        .send({ email: `owner${attempt}@example.com`, petPreference: "DOG", consent: true, website: "" });
      expect(response.status).toBe(202);
    }

    const blocked = await request(app)
      .post("/api/pet-care/newsletter-subscriptions")
      .send({ email: "blocked@example.com", petPreference: "DOG", consent: true, website: "" });

    expect(blocked.status).toBe(429);
  });
});
