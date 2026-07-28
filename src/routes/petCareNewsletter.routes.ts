import { Router } from "express";
import { createPetCareNewsletterSubscription } from "../controllers/petCareNewsletterController";
import { petCareNewsletterRateLimit } from "../middlewares/rateLimit";

export const petCareNewsletterRoutes = Router();

petCareNewsletterRoutes.post(
  "/newsletter-subscriptions",
  petCareNewsletterRateLimit,
  createPetCareNewsletterSubscription
);
