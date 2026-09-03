import type { Request, Response } from "express";
import { beginMfaEnrollment, completeMfaChallenge, confirmMfaEnrollment } from "../services/staffMfaService";
import { loginStaff } from "../services/staffAuthService";
import { env } from "../config/env";
import { prisma } from "../prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/httpError";
import { staffLoginSchema, staffMfaCodeSchema } from "../validators/staffAuthSchemas";

function bearerToken(req: Request) {
  const [scheme, token] = (req.header("authorization") ?? "").split(" ");
  if (scheme !== "Bearer" || !token) throw new HttpError(401, "Missing MFA authorization token");
  return token;
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api",
    maxAge: env.STAFF_SESSION_MAX_AGE_HOURS * 60 * 60 * 1000
  };
}

function clearSessionCookieOptions() {
  const { maxAge: _maxAge, ...options } = sessionCookieOptions();
  return options;
}

function sendSession(res: Response, session: { token: string; user: { id: string; email: string; role: import("@prisma/client").StaffRole; permissions: import("@prisma/client").StaffPermissionKey[] } }) {
  res.cookie("lilivet_staff_session", session.token, sessionCookieOptions());
  return { user: session.user };
}

export const staffLogin = asyncHandler(async (req: Request, res: Response) => {
  const input = staffLoginSchema.parse(req.body);
  const result = await loginStaff(input);
  res.json("token" in result ? sendSession(res, result) : result);
});

export const startStaffMfaEnrollment = asyncHandler(async (req: Request, res: Response) => {
  res.json(await beginMfaEnrollment(bearerToken(req)));
});

export const confirmStaffMfaEnrollment = asyncHandler(async (req: Request, res: Response) => {
  const result = await confirmMfaEnrollment(bearerToken(req), staffMfaCodeSchema.parse(req.body).code);
  res.json({ ...result, session: sendSession(res, result.session) });
});

export const verifyStaffMfa = asyncHandler(async (req: Request, res: Response) => {
  res.json(sendSession(res, await completeMfaChallenge(bearerToken(req), staffMfaCodeSchema.parse(req.body).code)));
});

export const getStaffSession = asyncHandler(async (req: Request, res: Response) => {
  res.json({ user: req.staffUser });
});

export const logoutStaff = asyncHandler(async (req: Request, res: Response) => {
  const staffUser = req.staffUser!;
  await prisma.staffUser.update({ where: { id: staffUser.id }, data: { sessionVersion: { increment: 1 } } });
  await prisma.staffAccessAuditLog.create({ data: { actorId: staffUser.id, targetUserId: staffUser.id, action: "STAFF_LOGGED_OUT" } });
  res.clearCookie("lilivet_staff_session", clearSessionCookieOptions());
  res.status(204).send();
});
