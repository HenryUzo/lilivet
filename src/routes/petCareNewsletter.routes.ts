import { Router } from "express";
import { createPetCareNewsletterSubscription } from "../controllers/petCareNewsletterController";
import {
  approvePublicPreview,
  createPublicPreviewComment,
  getPublicPetCareImage,
  getPublicPreview,
  updatePublicPreviewReviewerQuote,
  getPublishedArticle,
  listPublishedArticles
} from "../controllers/petCareArticleController";
import { petCareNewsletterRateLimit } from "../middlewares/rateLimit";

export const petCareNewsletterRoutes = Router();

petCareNewsletterRoutes.get("/articles", listPublishedArticles);
petCareNewsletterRoutes.get("/images/:token", getPublicPetCareImage);
petCareNewsletterRoutes.get("/articles/:slug", getPublishedArticle);
petCareNewsletterRoutes.get("/previews/:token", getPublicPreview);
petCareNewsletterRoutes.post("/previews/:token/comments", createPublicPreviewComment);
petCareNewsletterRoutes.patch("/previews/:token/reviewer-quote", updatePublicPreviewReviewerQuote);
petCareNewsletterRoutes.post("/previews/:token/approve", approvePublicPreview);

petCareNewsletterRoutes.post(
  "/newsletter-subscriptions",
  petCareNewsletterRateLimit,
  createPetCareNewsletterSubscription
);
