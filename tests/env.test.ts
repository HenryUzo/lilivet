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
