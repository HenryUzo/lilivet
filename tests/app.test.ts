import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryRawMock, loginStaffMock } = vi.hoisted(() => ({
  queryRawMock: vi.fn(),
  loginStaffMock: vi.fn()
}));

vi.mock("../src/prisma/client", () => ({
  prisma: {
    $queryRaw: queryRawMock
  }
}));

vi.mock("../src/services/staffAuthService", () => ({
  loginStaff: loginStaffMock
}));

async function loadApp() {
  vi.resetModules();
  const { app } = await import("../src/app.js");
  return app;
}

describe("app readiness and auth", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
    loginStaffMock.mockReset();
  });

  it("returns 503 when the database readiness probe fails", async () => {
    queryRawMock.mockRejectedValue(new Error("db down"));
    const app = await loadApp();

    const response = await request(app).get("/health");

    expect(response.status).toBe(503);
    expect(response.body.error.message).toBe("Database readiness check failed");
  });

  it("rejects missing and invalid staff tokens on protected routes", async () => {
    queryRawMock.mockResolvedValue([{ "?column?": 1 }]);
    const app = await loadApp();

    const missingTokenResponse = await request(app).get("/api/appointment-requests");
    const missingFileTokenResponse = await request(app).get("/api/files/file-1/content");
    const invalidTokenResponse = await request(app)
      .get("/api/appointment-requests")
      .set("Authorization", "Bearer invalid-token");

    expect(missingTokenResponse.status).toBe(401);
    expect(missingFileTokenResponse.status).toBe(401);
    expect(invalidTokenResponse.status).toBe(401);
  });

  it("rate limits repeated staff login attempts", async () => {
    queryRawMock.mockResolvedValue([{ "?column?": 1 }]);
    loginStaffMock.mockResolvedValue({
      token: "signed-token",
      user: {
        id: "staff-1",
        email: "admin@example.com",
        role: "ADMIN"
      }
    });
    const app = await loadApp();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request(app)
        .post("/api/staff/auth/login")
        .send({ email: "admin@example.com", password: "secret" });
      expect(response.status).toBe(200);
      expect(response.body.token).toBeUndefined();
      expect(response.headers["set-cookie"]?.[0]).toContain("lilivet_staff_session=signed-token");
      expect(response.headers["set-cookie"]?.[0]).toContain("HttpOnly");
      expect(response.headers["set-cookie"]?.[0]).toContain("SameSite=Lax");
    }

    const blockedResponse = await request(app)
      .post("/api/staff/auth/login")
      .send({ email: "admin@example.com", password: "secret" });

    expect(blockedResponse.status).toBe(429);
  });
});
