import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

export const DEFAULT_JWT_SECRET = "development-only-jwt-secret-change-before-production";
export const DEFAULT_STAFF_SEED_PASSWORD = "ChangeMe123!";

const booleanEnv = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return value;
}, z.boolean());

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
  SMTP_SECURE: booleanEnv.default(false),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  JWT_SECRET: z.string().min(32).default(DEFAULT_JWT_SECRET),
  JWT_EXPIRES_IN: z.string().min(1).default("8h"),
  JWT_ISSUER: z.string().min(1).default("lili-vet-backend"),
  JWT_AUDIENCE: z.string().min(1).default("lili-vet-staff"),
  STAFF_SEED_EMAIL: z.string().email().default("admin@lilivethospital.example"),
  STAFF_SEED_PASSWORD: z.string().min(8).default(DEFAULT_STAFF_SEED_PASSWORD)
});

export const env = envSchema.parse(process.env);

export function assertSecureProductionEnv() {
  if (env.NODE_ENV !== "production") {
    return;
  }

  const insecureVariables: string[] = [];

  if (env.JWT_SECRET === DEFAULT_JWT_SECRET) {
    insecureVariables.push("JWT_SECRET");
  }

  if (env.STAFF_SEED_PASSWORD === DEFAULT_STAFF_SEED_PASSWORD) {
    insecureVariables.push("STAFF_SEED_PASSWORD");
  }

  if (insecureVariables.length > 0) {
    throw new Error(`Refusing to boot in production with default secrets: ${insecureVariables.join(", ")}`);
  }
}
