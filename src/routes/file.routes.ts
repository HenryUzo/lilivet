import { Router } from "express";
import { getFileContent, uploadFiles } from "../controllers/fileController";
import { publicUploadRateLimit } from "../middlewares/rateLimit";
import { requireStaffAuth } from "../middlewares/staffAuth";
import { upload } from "../middlewares/upload";

export const fileRoutes = Router();

fileRoutes.post("/", publicUploadRateLimit, upload.array("files", 10), uploadFiles);
fileRoutes.get("/:id/content", requireStaffAuth, getFileContent);
