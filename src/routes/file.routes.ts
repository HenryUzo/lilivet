import { Router } from "express";
import { uploadFiles } from "../controllers/fileController";
import { publicUploadRateLimit } from "../middlewares/rateLimit";
import { upload } from "../middlewares/upload";

export const fileRoutes = Router();

fileRoutes.post("/", publicUploadRateLimit, upload.array("files", 10), uploadFiles);
