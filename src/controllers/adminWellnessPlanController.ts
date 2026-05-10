import type { Request, Response } from "express";
import { idParamSchema } from "../validators/common";
import { wellnessPlanKeyParamSchema } from "../validators/wellnessPlanSchemas";
import { asyncHandler } from "../utils/asyncHandler";
import { getWellnessPlan, getWellnessPlanByKey, listWellnessPlans } from "../services/adminWellnessPlanService";

export const listAdminWellnessPlans = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await listWellnessPlans());
});

export const getAdminWellnessPlan = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await getWellnessPlan(id));
});

export const getAdminWellnessPlanByKey = asyncHandler(async (req: Request, res: Response) => {
  const { planKey } = wellnessPlanKeyParamSchema.parse(req.params);
  res.json(await getWellnessPlanByKey(planKey));
});
