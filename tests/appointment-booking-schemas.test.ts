import { describe, expect, it } from "vitest";
import { appointmentBookingModeSchema, simplifiedAppointmentSchema } from "../src/validators/appointmentBookingSchemas";

describe("simplified appointment validation", () => {
  const valid = {
    clientFullName: "Taylor Morgan",
    petName: "Milo",
    petType: "DOG",
    email: "taylor@example.com",
    phoneNumber: "(210) 555-0123",
    reasonForVisit: "Annual wellness exam",
    preferredDate: "2026-10-12",
    preferredTime: "10:30",
    website: ""
  };

  it("accepts the public simplified booking payload", () => {
    expect(simplifiedAppointmentSchema.parse(valid)).toEqual(valid);
  });

  it("rejects honeypot submissions and malformed slots", () => {
    expect(simplifiedAppointmentSchema.safeParse({ ...valid, website: "spam" }).success).toBe(false);
    expect(simplifiedAppointmentSchema.safeParse({ ...valid, preferredTime: "10:15:00" }).success).toBe(false);
  });

  it("limits admin mode changes to supported modes", () => {
    expect(appointmentBookingModeSchema.parse({ mode: "SIMPLIFIED" }).mode).toBe("SIMPLIFIED");
    expect(appointmentBookingModeSchema.safeParse({ mode: "AUTO" }).success).toBe(false);
  });
});
