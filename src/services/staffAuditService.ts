import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../prisma/client";

type AuditEvent = {
  action: string;
  actorId?: string | null;
  targetUserId?: string | null;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, boolean | number | string | string[] | null | undefined>;
};

function cleanMetadata(metadata: AuditEvent["metadata"]) {
  if (!metadata) return undefined;
  return Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined)) as Prisma.InputJsonValue;
}

export function fingerprintAuditValue(value: string) {
  return crypto.createHmac("sha256", env.JWT_SECRET).update(value.trim().toLowerCase()).digest("hex");
}

// This service intentionally accepts only operational metadata, never client content or contact details.
export async function writeStaffAuditLog(event: AuditEvent) {
  await prisma.staffAccessAuditLog.create({
    data: {
      action: event.action,
      actorId: event.actorId ?? null,
      targetUserId: event.targetUserId ?? null,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      metadata: cleanMetadata(event.metadata)
    }
  });
}
