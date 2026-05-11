import { Router } from "express";
import {
  createDraft,
  getDraft,
  patchStep1,
  patchStep2,
  patchStep3,
  patchStep4,
  patchStep5,
  submitDraft,
  uploadDraftFiles
} from "../controllers/appointmentDraftController";
import { publicMutationRateLimit, publicUploadRateLimit } from "../middlewares/rateLimit";
import { upload } from "../middlewares/upload";

export const appointmentDraftRoutes = Router();

appointmentDraftRoutes.post("/", publicMutationRateLimit, createDraft);
appointmentDraftRoutes.get("/:sessionToken", getDraft);
appointmentDraftRoutes.patch("/:sessionToken/step-1", patchStep1);
appointmentDraftRoutes.patch("/:sessionToken/step-2", patchStep2);
appointmentDraftRoutes.patch("/:sessionToken/step-3", patchStep3);
appointmentDraftRoutes.patch("/:sessionToken/step-4", patchStep4);
appointmentDraftRoutes.patch("/:sessionToken/step-5", patchStep5);
appointmentDraftRoutes.post("/:sessionToken/files", publicUploadRateLimit, upload.array("files", 10), uploadDraftFiles);
appointmentDraftRoutes.post("/:sessionToken/submit", publicMutationRateLimit, submitDraft);
