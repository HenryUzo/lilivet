import { describe, expect, it } from "vitest";
import { validateRequestedSlot } from "../src/services/appointmentBookingService";

describe("simplified appointment hours", () => {
  const now = new Date("2026-10-08T12:00:00Z");

  it("accepts Saturday at 4:30 PM Central", () => {
    expect(validateRequestedSlot("2026-10-10", "16:30", now)).toBeInstanceOf(Date);
  });

  it("rejects Saturday at 5 PM Central", () => {
    expect(() => validateRequestedSlot("2026-10-10", "17:00", now)).toThrow("Choose a time during clinic hours.");
  });
});
