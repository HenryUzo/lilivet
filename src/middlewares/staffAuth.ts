import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import type { StaffPermissionKey, StaffRole } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../prisma/client";
import { getEffectivePermissions } from "../services/staffPermissions";
import { HttpError } from "../utils/httpError";
import type { StaffJwtPayload } from "../services/staffAuthService";

function parseBearerToken(header: string | undefined) {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

export async function requireStaffAuth(req: Request, _res: Response, next: NextFunction) {
  const token = parseBearerToken(req.header("authorization"));
  if (!token) {
    next(new HttpError(401, "Missing staff authorization token"));
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE
    }) as StaffJwtPayload;
    const user = await prisma.staffUser.findUnique({
      where: { id: decoded.sub },
      include: { permissions: { select: { key: true } } }
    });
    if (!user || !user.isActive) {
      next(new HttpError(401, "Invalid or inactive staff authorization token"));
      return;
    }
    req.staffUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: getEffectivePermissions(user.role, user.permissions.map((permission) => permission.key))
    };
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired staff authorization token"));
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
