import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import type { StaffRole } from "@prisma/client";
import { env } from "../config/env";
import { HttpError } from "../utils/httpError";
import type { StaffJwtPayload } from "../services/staffAuthService";

function parseBearerToken(header: string | undefined) {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

export function requireStaffAuth(req: Request, _res: Response, next: NextFunction) {
  const token = parseBearerToken(req.header("authorization"));
  if (!token) {
    next(new HttpError(401, "Missing staff authorization token"));
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as StaffJwtPayload;
    req.staffUser = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired staff authorization token"));
  }
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
