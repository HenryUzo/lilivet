import { StaffRole } from "@prisma/client";
import { Router } from "express";
import {
  approveAdminArticle,
  archiveAdminArticle,
  createAdminArticle,
  createAdminReviewer,
  getAdminArticle,
  listAdminArticles,
  listAdminReviewers,
  publishAdminArticle,
  submitAdminArticleForReview,
  updateAdminArticle,
  updateAdminReviewer
} from "../controllers/petCareArticleController";
import { requireRole, requireStaffAuth } from "../middlewares/staffAuth";

export const adminPetCareRoutes = Router();

adminPetCareRoutes.use(requireStaffAuth, requireRole(StaffRole.ADMIN));
adminPetCareRoutes.get("/articles", listAdminArticles);
adminPetCareRoutes.post("/articles", createAdminArticle);
adminPetCareRoutes.get("/articles/:id", getAdminArticle);
adminPetCareRoutes.patch("/articles/:id", updateAdminArticle);
adminPetCareRoutes.post("/articles/:id/submit-review", submitAdminArticleForReview);
adminPetCareRoutes.post("/articles/:id/approve", approveAdminArticle);
adminPetCareRoutes.post("/articles/:id/publish", publishAdminArticle);
adminPetCareRoutes.post("/articles/:id/archive", archiveAdminArticle);
adminPetCareRoutes.get("/reviewers", listAdminReviewers);
adminPetCareRoutes.post("/reviewers", createAdminReviewer);
adminPetCareRoutes.patch("/reviewers/:id", updateAdminReviewer);
