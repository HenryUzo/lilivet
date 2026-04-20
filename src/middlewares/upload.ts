import fs from "fs";
import os from "os";
import path from "path";
import multer from "multer";
import { env } from "../config/env";
import { allowedMimeTypes } from "../constants/files";
import { HttpError } from "../utils/httpError";

const tempDir = path.join(os.tmpdir(), "lili-vet-uploads");
fs.mkdirSync(tempDir, { recursive: true });

export const upload = multer({
  storage: multer.diskStorage({
    destination: tempDir,
    filename: (_req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  }),
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: 10
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype as (typeof allowedMimeTypes)[number])) {
      cb(new HttpError(415, "Only PDF, JPG, and PNG uploads are accepted"));
      return;
    }
    cb(null, true);
  }
});
