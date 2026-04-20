import { Router } from "express";
import { uploadFiles } from "../controllers/fileController";
import { upload } from "../middlewares/upload";

export const fileRoutes = Router();

fileRoutes.post("/", upload.array("files", 10), uploadFiles);
