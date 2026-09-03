import bcrypt from "bcryptjs";
import type { StaffPermissionKey, StaffRole } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../prisma/client";
import { HttpError } from "../utils/httpError";
import type { StaffLoginInput } from "../validators/staffAuthSchemas";
import { createMfaToken, createStaffSession } from "./staffMfaService";
import { fingerprintAuditValue, writeStaffAuditLog } from "./staffAuditService";

export type StaffJwtPayload = {
  sub: string;
  email: string;
  role: StaffRole;
  permissions: StaffPermissionKey[];
  sessionVersion?: number;
  purpose?: "staff_session" | "mfa_setup" | "mfa_challenge";
};

export async function loginStaff(input: StaffLoginInput) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const user = await prisma.staffUser.findUnique({
    where: { email: normalizedEmail },
    include: { permissions: { select: { key: true } } }
  });

  if (!user || !user.isActive) {
    await writeStaffAuditLog({ action: "STAFF_LOGIN_FAILED", metadata: { emailFingerprint: fingerprintAuditValue(normalizedEmail), reason: "invalid_credentials" } });
    throw new HttpError(401, "Invalid email or password");
  }

  const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValidPassword) {
    await writeStaffAuditLog({ action: "STAFF_LOGIN_FAILED", actorId: user.id, targetUserId: user.id, resourceType: "STAFF_USER", resourceId: user.id, metadata: { emailFingerprint: fingerprintAuditValue(normalizedEmail), reason: "invalid_credentials" } });
    throw new HttpError(401, "Invalid email or password");
  }

  if (user.mfaEnabledAt && user.mfaSecretEncrypted) {
    await writeStaffAuditLog({ action: "STAFF_LOGIN_MFA_CHALLENGE_ISSUED", actorId: user.id, targetUserId: user.id, resourceType: "STAFF_USER", resourceId: user.id });
    return { mfaRequired: true as const, challengeToken: createMfaToken(user, "mfa_challenge") };
  }

  if (env.MFA_REQUIRED_FOR_STAFF) {
    await writeStaffAuditLog({ action: "STAFF_MFA_ENROLLMENT_REQUIRED", actorId: user.id, targetUserId: user.id, resourceType: "STAFF_USER", resourceId: user.id });
    return { mfaEnrollmentRequired: true as const, setupToken: createMfaToken(user, "mfa_setup") };
  }

  await writeStaffAuditLog({ action: "STAFF_LOGIN_SUCCEEDED", actorId: user.id, targetUserId: user.id, resourceType: "STAFF_USER", resourceId: user.id });
  return createStaffSession(user);
}
