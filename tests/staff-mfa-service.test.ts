import { describe, expect, it } from "vitest";
import { verifyTotp } from "../src/services/staffMfaService";

describe("staff authenticator MFA", () => {
  it("accepts the published RFC 6238 six-digit test vector", () => {
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    expect(verifyTotp(secret, "287082", 59_000)).toBe(true);
    expect(verifyTotp(secret, "287083", 59_000)).toBe(false);
  });
});
