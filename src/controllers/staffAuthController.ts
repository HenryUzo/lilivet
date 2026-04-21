import type { Request, Response } from "express";
import { loginStaff } from "../services/staffAuthService";
import { asyncHandler } from "../utils/asyncHandler";
import { staffLoginSchema } from "../validators/staffAuthSchemas";

export const staffLogin = asyncHandler(async (req: Request, res: Response) => {
  const input = staffLoginSchema.parse(req.body);
  const result = await loginStaff(input);
  res.json(result);
});
