import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock("../src/prisma/client", () => ({
  prisma: { staffAccessAuditLog: { create: createMock } }
}));

vi.mock("../src/config/env", () => ({
  env: { JWT_SECRET: "test-audit-key" }
}));

import { fingerprintAuditValue, writeStaffAuditLog } from "../src/services/staffAuditService";

describe("staff audit log service", () => {
  beforeEach(() => createMock.mockReset());

  it("writes operational metadata without undefined values", async () => {
    createMock.mockResolvedValue({ id: "audit-1" });

    await writeStaffAuditLog({
      action: "CLIENT_DETAIL_VIEWED",
      actorId: "staff-1",
      resourceType: "OWNER",
      resourceId: "owner-1",
      metadata: { returnedCount: 1, omitted: undefined }
    });

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "CLIENT_DETAIL_VIEWED",
        actorId: "staff-1",
        resourceType: "OWNER",
        resourceId: "owner-1",
        metadata: { returnedCount: 1 }
      })
    });
  });

  it("creates a stable keyed fingerprint instead of retaining an email address", () => {
    expect(fingerprintAuditValue("Admin@Example.com")).toBe(fingerprintAuditValue("admin@example.com"));
    expect(fingerprintAuditValue("admin@example.com")).not.toContain("admin@example.com");
  });
});
