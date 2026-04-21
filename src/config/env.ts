import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().default("*"),
  UPLOAD_DIR: z.string().default("./uploads"),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(10),
  DRAFT_EXPIRY_HOURS: z.coerce.number().positive().default(72),
  UNATTACHED_FILE_EXPIRY_HOURS: z.coerce.number().positive().default(24),
  DUPLICATE_WINDOW_HOURS: z.coerce.number().positive().default(48),
  CLINIC_NOTIFICATION_EMAIL: z.string().email().default("frontdesk@lilivethospital.example"),
  MAIL_FROM: z.string().min(1).default("Lili Vet Hospital <no-reply@lilivethospital.example>"),
  SMTP_HOST: z.string().min(1).default("localhost"),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  JWT_SECRET: z.string().min(32).default("development-only-jwt-secret-change-before-production"),
  JWT_EXPIRES_IN: z.string().min(1).default("8h"),
  STAFF_SEED_EMAIL: z.string().email().default("admin@lilivethospital.example"),
  STAFF_SEED_PASSWORD: z.string().min(8).default("ChangeMe123!")
});

export const env = envSchema.parse(process.env);
