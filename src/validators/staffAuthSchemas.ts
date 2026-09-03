import { z } from "zod";

export const staffLoginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1)
});

export type StaffLoginInput = z.infer<typeof staffLoginSchema>;

export const staffMfaCodeSchema = z.object({
  code: z.string().trim().min(6).max(16)
});
