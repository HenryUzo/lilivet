import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

async function loadEnvModule() {
  vi.resetModules();
  return import("../src/config/env.js");
}

describe("env SMTP boolean parsing", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("parses SMTP_SECURE=false as false", async () => {
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
      SMTP_SECURE: "false",
    };

    const { env } = await loadEnvModule();

    expect(env.SMTP_SECURE).toBe(false);
  });

  it("parses SMTP_SECURE=true as true", async () => {
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
      SMTP_SECURE: "true",
    };

    const { env } = await loadEnvModule();

    expect(env.SMTP_SECURE).toBe(true);
  });
});

describe("env clinic notification recipients", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("accepts comma-separated clinic notification emails", async () => {
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
      CLINIC_NOTIFICATION_EMAIL: "frontdesk@example.com, manager@example.com",
    };

    const { env } = await loadEnvModule();

    expect(env.CLINIC_NOTIFICATION_EMAIL).toBe("frontdesk@example.com, manager@example.com");
  });

  it("rejects invalid addresses in clinic notification emails", async () => {
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
      CLINIC_NOTIFICATION_EMAIL: "frontdesk@example.com, not-an-email",
    };

    await expect(loadEnvModule()).rejects.toThrow("Invalid email address: not-an-email");
  });
});

describe("env Pet Care newsletter configuration", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("allows blank Brevo values when the optional newsletter feature is disabled", async () => {
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
      PET_CARE_NEWSLETTER_ENABLED: "false",
      BREVO_API_KEY: "",
      BREVO_PET_CARE_LIST_ID: "",
      BREVO_DOI_TEMPLATE_ID: "",
    };

    const { env } = await loadEnvModule();

    expect(env.PET_CARE_NEWSLETTER_ENABLED).toBe(false);
  });

  it("fails closed when the optional newsletter feature is enabled without Brevo config", async () => {
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
      PET_CARE_NEWSLETTER_ENABLED: "true",
      BREVO_API_KEY: "",
      BREVO_PET_CARE_LIST_ID: "",
      BREVO_DOI_TEMPLATE_ID: "",
    };

    await expect(loadEnvModule()).rejects.toThrow("BREVO_API_KEY is required");
  });
});
