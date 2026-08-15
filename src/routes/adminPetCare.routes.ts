import { StaffPermissionKey } from "@prisma/client";
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
import { requirePermission, requireStaffAuth } from "../middlewares/staffAuth";
import { petCareImageUpload } from "../middlewares/upload";

export const adminPetCareRoutes = Router();

adminPetCareRoutes.use(requireStaffAuth);
adminPetCareRoutes.get("/articles", requirePermission(StaffPermissionKey.PET_CARE_VIEW), listAdminArticles);
adminPetCareRoutes.post("/articles", requirePermission(StaffPermissionKey.PET_CARE_EDIT), createAdminArticle);
adminPetCareRoutes.post("/images", requirePermission(StaffPermissionKey.PET_CARE_EDIT), petCareImageUpload.single("image"), uploadAdminHeroImage);
adminPetCareRoutes.get("/articles/:id", requirePermission(StaffPermissionKey.PET_CARE_VIEW), getAdminArticle);
adminPetCareRoutes.patch("/articles/:id", requirePermission(StaffPermissionKey.PET_CARE_EDIT), updateAdminArticle);
adminPetCareRoutes.post("/articles/:id/submit-review", requirePermission(StaffPermissionKey.PET_CARE_EDIT), submitAdminArticleForReview);
adminPetCareRoutes.post("/articles/:id/preview-shares", requirePermission(StaffPermissionKey.PET_CARE_EDIT), createAdminPreviewShare);
adminPetCareRoutes.post("/articles/:id/review-invitation", requirePermission(StaffPermissionKey.PET_CARE_EDIT), sendAdminReviewInvitation);
adminPetCareRoutes.post("/articles/:id/publish", requirePermission(StaffPermissionKey.PET_CARE_PUBLISH), publishAdminArticle);
adminPetCareRoutes.post("/articles/:id/archive", requirePermission(StaffPermissionKey.PET_CARE_PUBLISH), archiveAdminArticle);
adminPetCareRoutes.get("/reviewers", requirePermission(StaffPermissionKey.PET_CARE_REVIEWERS), listAdminReviewers);
adminPetCareRoutes.post("/reviewers", requirePermission(StaffPermissionKey.PET_CARE_REVIEWERS), createAdminReviewer);
adminPetCareRoutes.patch("/reviewers/:id", requirePermission(StaffPermissionKey.PET_CARE_REVIEWERS), updateAdminReviewer);
