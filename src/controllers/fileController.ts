import type { Request, Response } from "express";
import { pipeline } from "stream/promises";
import { asyncHandler } from "../utils/asyncHandler";
import { getStaffFileAccess } from "../services/fileAccessService";
import { createUploadedFiles } from "../services/fileService";
import { idParamSchema } from "../validators/common";
import { writeStaffAuditLog } from "../services/staffAuditService";

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
  const { file, target } = await getStaffFileAccess(id, req.staffUser!.permissions);
  const shouldDownload = req.query.download === "1" || req.query.download === "true";
  await writeStaffAuditLog({ action: shouldDownload ? "SENSITIVE_FILE_DOWNLOADED" : "SENSITIVE_FILE_VIEWED", actorId: req.staffUser!.id, resourceType: "UPLOADED_FILE", resourceId: file.id, metadata: { appointmentRequestId: file.appointmentRequestId, newPatientRequestId: file.newPatientRequestId } });

  res.type(file.mimeType);
  res.setHeader(
    "Content-Disposition",
    buildContentDisposition(shouldDownload ? "attachment" : "inline", file.originalName)
  );

  if (target.kind === "local") {
    await new Promise<void>((resolve, reject) => {
      res.sendFile(target.absolutePath, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
    return;
  }

  if (target.sizeBytes) {
    res.setHeader("Content-Length", String(target.sizeBytes));
  }

  await pipeline(target.stream as NodeJS.ReadableStream, res);
});
