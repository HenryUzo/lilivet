import bcrypt from "bcryptjs";
import type { StaffPermissionKey, StaffRole } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../prisma/client";
import { HttpError } from "../utils/httpError";
import type { StaffLoginInput } from "../validators/staffAuthSchemas";
import { createMfaToken, createStaffSession } from "./staffMfaService";

export type StaffJwtPayload = {
  sub: string;
  email: string;
  role: StaffRole;
  permissions: StaffPermissionKey[];
  sessionVersion?: number;
  purpose?: "staff_session" | "mfa_setup" | "mfa_challenge";
};

export async function loginStaff(input: StaffLoginInput) {
  const user = await prisma.staffUser.findUnique({
    where: { email: input.email.trim().toLowerCase() },
    include: { permissions: { select: { key: true } } }
  });

  if (!user || !user.isActive) {
    throw new HttpError(401, "Invalid email or password");
  }

  const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValidPassword) {
    throw new HttpError(401, "Invalid email or password");
  }

  if (user.mfaEnabledAt && user.mfaSecretEncrypted) {
    return { mfaRequired: true as const, challengeToken: createMfaToken(user, "mfa_challenge") };
  }

  if (env.MFA_REQUIRED_FOR_STAFF) {
    return { mfaEnrollmentRequired: true as const, setupToken: createMfaToken(user, "mfa_setup") };
  }

  return createStaffSession(user);
}
