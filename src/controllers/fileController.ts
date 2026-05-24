import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { getStaffFileAccess } from "../services/fileAccessService";
import { createUploadedFiles } from "../services/fileService";
import { idParamSchema } from "../validators/common";

export const uploadFiles = asyncHandler(async (req: Request, res: Response) => {
  const files = await createUploadedFiles((req.files as Express.Multer.File[]) ?? []);
  res.status(201).json({ files });
});

function buildContentDisposition(type: "attachment" | "inline", fileName: string) {
  const asciiFileName = fileName.replace(/["\\]/g, "_");
  return `${type}; filename="${asciiFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export const getFileContent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const { file, absolutePath } = await getStaffFileAccess(id);
  const shouldDownload = req.query.download === "1" || req.query.download === "true";

  res.type(file.mimeType);
  res.setHeader(
    "Content-Disposition",
    buildContentDisposition(shouldDownload ? "attachment" : "inline", file.originalName)
  );

  await new Promise<void>((resolve, reject) => {
    res.sendFile(absolutePath, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});
