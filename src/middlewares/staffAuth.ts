import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import type { StaffPermissionKey, StaffRole } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../prisma/client";
import { getEffectivePermissions } from "../services/staffPermissions";
import { HttpError } from "../utils/httpError";
import type { StaffJwtPayload } from "../services/staffAuthService";

const STAFF_SESSION_COOKIE = "lilivet_staff_session";
const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const trustedStaffOrigins = new Set([
  ...env.STAFF_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean),
  new URL(env.STAFF_DASHBOARD_URL).origin
]);

function parseSessionCookie(header: string | undefined) {
  if (!header) return null;
  const cookie = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${STAFF_SESSION_COOKIE}=`));
  return cookie ? decodeURIComponent(cookie.slice(`${STAFF_SESSION_COOKIE}=`.length)) : null;
}

function hasTrustedOrigin(req: Request) {
  const origin = req.header("origin");
  return Boolean(origin && trustedStaffOrigins.has(origin));
}

export async function requireStaffAuth(req: Request, _res: Response, next: NextFunction) {
  const token = parseSessionCookie(req.header("cookie"));
  if (!token) {
    next(new HttpError(401, "Missing staff session"));
    return;
  }

  let decoded: StaffJwtPayload;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE
    }) as StaffJwtPayload;
  } catch {
    next(new HttpError(401, "Invalid or expired staff authorization token"));
    return;
  }

  if (decoded.purpose !== "staff_session" || !Number.isInteger(decoded.sessionVersion)) {
    next(new HttpError(401, "Complete multi-factor authentication to access the dashboard"));
    return;
  }

  try {
    const user = await prisma.staffUser.findUnique({
      where: { id: decoded.sub },
      include: { permissions: { select: { key: true } } }
    });
    if (!user || !user.isActive || user.sessionVersion !== decoded.sessionVersion) {
      next(new HttpError(401, "Invalid or inactive staff authorization token"));
      return;
    }
    if (unsafeMethods.has(req.method) && !hasTrustedOrigin(req)) {
      next(new HttpError(403, "Staff request origin is not allowed"));
      return;
    }
    req.staffUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: getEffectivePermissions(user.role, user.permissions.map((permission) => permission.key))
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requirePermission(...permissions: StaffPermissionKey[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.staffUser) {
      next(new HttpError(401, "Missing staff authorization token"));
      return;
    }
    if (!permissions.every((permission) => req.staffUser!.permissions.includes(permission))) {
      next(new HttpError(403, "Staff user is not allowed to access this resource"));
      return;
    }
    next();
  };
}

export function requireRole(...roles: StaffRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.staffUser) {
      next(new HttpError(401, "Missing staff authorization token"));
      return;
    }
    if (!roles.includes(req.staffUser.role)) {
      next(new HttpError(403, "Staff user is not allowed to access this resource"));
      return;
    }
    next();
  };
}
