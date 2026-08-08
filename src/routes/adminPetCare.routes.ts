import { StaffRole } from "@prisma/client";
import { Router } from "express";
import {
  archiveAdminArticle,
  createAdminPreviewShare,
  createAdminArticle,
  createAdminReviewer,
  getAdminArticle,
  listAdminArticles,
  listAdminReviewers,
  publishAdminArticle,
  submitAdminArticleForReview,
  sendAdminReviewInvitation,
  updateAdminArticle,
  updateAdminReviewer,
  uploadAdminHeroImage
} from "../controllers/petCareArticleController";
import { requireRole, requireStaffAuth } from "../middlewares/staffAuth";
import { petCareImageUpload } from "../middlewares/upload";

export const adminPetCareRoutes = Router();

adminPetCareRoutes.use(requireStaffAuth, requireRole(StaffRole.ADMIN));
adminPetCareRoutes.get("/articles", listAdminArticles);
adminPetCareRoutes.post("/articles", createAdminArticle);
adminPetCareRoutes.post("/images", petCareImageUpload.single("image"), uploadAdminHeroImage);
adminPetCareRoutes.get("/articles/:id", getAdminArticle);
adminPetCareRoutes.patch("/articles/:id", updateAdminArticle);
adminPetCareRoutes.post("/articles/:id/submit-review", submitAdminArticleForReview);
adminPetCareRoutes.post("/articles/:id/preview-shares", createAdminPreviewShare);
adminPetCareRoutes.post("/articles/:id/review-invitation", sendAdminReviewInvitation);
adminPetCareRoutes.post("/articles/:id/publish", publishAdminArticle);
adminPetCareRoutes.post("/articles/:id/archive", archiveAdminArticle);
adminPetCareRoutes.get("/reviewers", listAdminReviewers);
adminPetCareRoutes.post("/reviewers", createAdminReviewer);
adminPetCareRoutes.patch("/reviewers/:id", updateAdminReviewer);
