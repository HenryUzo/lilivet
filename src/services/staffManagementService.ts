import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma, StaffPermissionKey, StaffRole } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../prisma/client";
import { HttpError } from "../utils/httpError";
import { sendStaffInvitation } from "./mailService";
import { getEffectivePermissions } from "./staffPermissions";
import type { CreateStaffInvitationInput } from "../validators/staffManagementSchemas";

const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const PENDING_PASSWORD_HASH = "$2a$12$JTQblNk2p9SVABgYGyH1B.woCStrOnBeXMocvpiyv8BNOXqXx4Piu";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function newInvitation() {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + INVITATION_EXPIRY_MS) };
}

function invitationUrl(token: string) {
  return `${env.STAFF_DASHBOARD_URL.replace(/\/$/, "")}/accept-invitation?token=${encodeURIComponent(token)}`;
}

function serializeUser(user: {
  id: string; email: string; role: StaffRole; isActive: boolean; invitationExpiresAt: Date | null; invitationAcceptedAt: Date | null;
  createdAt: Date; updatedAt: Date; permissions: Array<{ key: StaffPermissionKey }>;
}) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    invitationStatus: user.invitationAcceptedAt ? "ACCEPTED" : user.invitationExpiresAt && user.invitationExpiresAt > new Date() ? "PENDING" : "NONE",
    invitationExpiresAt: user.invitationExpiresAt,
    invitationAcceptedAt: user.invitationAcceptedAt,
    permissions: getEffectivePermissions(user.role, user.permissions.map((permission) => permission.key)),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

async function audit(actorId: string | null, targetUserId: string, action: string, metadata?: Record<string, unknown>) {
  await prisma.staffAccessAuditLog.create({ data: { actorId, targetUserId, action, metadata: metadata as Prisma.InputJsonValue | undefined } });
}

async function assertCanChangeSuperAdmin(targetUserId: string, nextIsActive?: boolean) {
  const target = await prisma.staffUser.findUnique({ where: { id: targetUserId } });
  if (!target) throw new HttpError(404, "Staff user not found");
  if (target.role !== StaffRole.SUPER_ADMIN || nextIsActive !== false) return target;
  const activeSuperAdmins = await prisma.staffUser.count({ where: { role: StaffRole.SUPER_ADMIN, isActive: true } });
  if (activeSuperAdmins <= 1) throw new HttpError(409, "At least one active Super Admin must remain");
  return target;
}

export async function listStaffUsers() {
  const users = await prisma.staffUser.findMany({ include: { permissions: { select: { key: true } } }, orderBy: { createdAt: "desc" } });
  return { items: users.map(serializeUser) };
}

export async function inviteStaffUser(actorId: string, input: CreateStaffInvitationInput) {
  const existing = await prisma.staffUser.findUnique({ where: { email: input.email } });
  if (existing?.invitationAcceptedAt || (existing?.isActive && existing.passwordHash !== PENDING_PASSWORD_HASH)) {
    throw new HttpError(409, "A staff account already exists for this email");
  }
  const invitation = newInvitation();
  const user = await prisma.staffUser.upsert({
    where: { email: input.email },
    update: {
      role: StaffRole.ADMIN,
      isActive: false,
      passwordHash: PENDING_PASSWORD_HASH,
      invitationTokenHash: invitation.tokenHash,
      invitationExpiresAt: invitation.expiresAt,
      invitationAcceptedAt: null,
      invitedByStaffUserId: actorId,
      permissions: { deleteMany: {}, create: input.permissions.map((key) => ({ key })) }
    },
    create: {
      email: input.email,
      role: StaffRole.ADMIN,
      isActive: false,
      passwordHash: PENDING_PASSWORD_HASH,
      invitationTokenHash: invitation.tokenHash,
      invitationExpiresAt: invitation.expiresAt,
      invitedByStaffUserId: actorId,
      permissions: { create: input.permissions.map((key) => ({ key })) }
    },
    include: { permissions: { select: { key: true } } }
  });
  await audit(actorId, user.id, "STAFF_INVITED", { permissions: input.permissions });
  await sendStaffInvitation({ email: user.email, invitationUrl: invitationUrl(invitation.token) });
  return serializeUser(user);
}

export async function updateStaffUser(actorId: string, id: string, input: { isActive?: boolean; permissions?: StaffPermissionKey[] }) {
  const target = await assertCanChangeSuperAdmin(id, input.isActive);
  if (input.permissions && target.role === StaffRole.SUPER_ADMIN) {
    throw new HttpError(400, "Super Admin access cannot be restricted by permissions");
  }
  const user = await prisma.staffUser.update({
    where: { id },
    data: {
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      ...(input.permissions ? { permissions: { deleteMany: {}, create: input.permissions.map((key) => ({ key })) } } : {}),
      ...(input.isActive === undefined && !input.permissions ? {} : { sessionVersion: { increment: 1 } })
    },
    include: { permissions: { select: { key: true } } }
  });
  await audit(actorId, id, "STAFF_ACCESS_UPDATED", { isActive: input.isActive, permissions: input.permissions });
  return serializeUser(user);
}

export async function resendStaffInvitation(actorId: string, id: string) {
  const target = await prisma.staffUser.findUnique({ where: { id }, include: { permissions: { select: { key: true } } } });
  if (!target) throw new HttpError(404, "Staff user not found");
  if (target.invitationAcceptedAt) throw new HttpError(409, "This invitation has already been accepted");
  const invitation = newInvitation();
  const user = await prisma.staffUser.update({
    where: { id },
    data: { isActive: false, invitationTokenHash: invitation.tokenHash, invitationExpiresAt: invitation.expiresAt, invitedByStaffUserId: actorId },
    include: { permissions: { select: { key: true } } }
  });
  await audit(actorId, id, "STAFF_INVITATION_RESENT");
  await sendStaffInvitation({ email: user.email, invitationUrl: invitationUrl(invitation.token) });
  return serializeUser(user);
}

export async function getStaffInvitation(token: string) {
  const user = await prisma.staffUser.findUnique({ where: { invitationTokenHash: hashToken(token) } });
  if (!user || user.invitationAcceptedAt || !user.invitationExpiresAt || user.invitationExpiresAt <= new Date()) {
    throw new HttpError(404, "This invitation is invalid or has expired");
  }
  return { email: user.email, expiresAt: user.invitationExpiresAt };
}

export async function acceptStaffInvitation(token: string, password: string) {
  const user = await prisma.staffUser.findUnique({ where: { invitationTokenHash: hashToken(token) } });
  if (!user || user.invitationAcceptedAt || !user.invitationExpiresAt || user.invitationExpiresAt <= new Date()) {
    throw new HttpError(400, "This invitation is invalid or has expired");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.staffUser.update({
    where: { id: user.id },
    data: { passwordHash, isActive: true, invitationAcceptedAt: new Date(), invitationTokenHash: null, invitationExpiresAt: null }
  });
  await audit(user.invitedByStaffUserId, user.id, "STAFF_INVITATION_ACCEPTED");
  return { accepted: true };
}
