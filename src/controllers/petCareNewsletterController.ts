import type { Request, Response } from "express";
import { subscribeToPetCareNewsletter } from "../services/petCareNewsletterService";
import { asyncHandler } from "../utils/asyncHandler";
import { petCareNewsletterSubscriptionSchema } from "../validators/petCareNewsletterSchemas";

export const createPetCareNewsletterSubscription = asyncHandler(
  async (req: Request, res: Response) => {
    const input = petCareNewsletterSubscriptionSchema.parse(req.body);
    const result = await subscribeToPetCareNewsletter(input);
    res.status(202).json(result);
  }
);
