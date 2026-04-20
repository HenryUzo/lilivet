import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { createUploadedFiles } from "../services/fileService";

export const uploadFiles = asyncHandler(async (req: Request, res: Response) => {
  const files = await createUploadedFiles((req.files as Express.Multer.File[]) ?? []);
  res.status(201).json({ files });
});
