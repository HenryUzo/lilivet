import type { Request, Response } from "express";
import { beginMfaEnrollment, completeMfaChallenge, confirmMfaEnrollment } from "../services/staffMfaService";
import { loginStaff } from "../services/staffAuthService";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/httpError";
import { staffLoginSchema, staffMfaCodeSchema } from "../validators/staffAuthSchemas";

function bearerToken(req: Request) {
  const [scheme, token] = (req.header("authorization") ?? "").split(" ");
  if (scheme !== "Bearer" || !token) throw new HttpError(401, "Missing MFA authorization token");
  return token;
}

export const staffLogin = asyncHandler(async (req: Request, res: Response) => {
  const input = staffLoginSchema.parse(req.body);
  const result = await loginStaff(input);
  res.json(result);
});

export const startStaffMfaEnrollment = asyncHandler(async (req: Request, res: Response) => {
  res.json(await beginMfaEnrollment(bearerToken(req)));
});

export const confirmStaffMfaEnrollment = asyncHandler(async (req: Request, res: Response) => {
  res.json(await confirmMfaEnrollment(bearerToken(req), staffMfaCodeSchema.parse(req.body).code));
});

export const verifyStaffMfa = asyncHandler(async (req: Request, res: Response) => {
  res.json(await completeMfaChallenge(bearerToken(req), staffMfaCodeSchema.parse(req.body).code));
});
