import { Router } from "express";
import { createPetCareNewsletterSubscription } from "../controllers/petCareNewsletterController";
import { getPublishedArticle, listPublishedArticles } from "../controllers/petCareArticleController";
import { petCareNewsletterRateLimit } from "../middlewares/rateLimit";

export const petCareNewsletterRoutes = Router();

petCareNewsletterRoutes.get("/articles", listPublishedArticles);
petCareNewsletterRoutes.get("/articles/:slug", getPublishedArticle);

petCareNewsletterRoutes.post(
  "/newsletter-subscriptions",
  petCareNewsletterRateLimit,
  createPetCareNewsletterSubscription
);
