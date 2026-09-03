import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { openApiDocument } from "./docs/openapi";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { prisma } from "./prisma/client";
import { adminWellnessPlanRoutes } from "./routes/adminWellnessPlan.routes";
import { adminPetCareRoutes } from "./routes/adminPetCare.routes";
import { appointmentDraftRoutes } from "./routes/appointmentDraft.routes";
import { appointmentRequestRoutes } from "./routes/appointmentRequest.routes";
import { fileRoutes } from "./routes/file.routes";
import { newPatientRoutes } from "./routes/newPatientRequest.routes";
import { petCareNewsletterRoutes } from "./routes/petCareNewsletter.routes";
import { staffAuthRoutes } from "./routes/staffAuth.routes";
import { staffManagementRoutes } from "./routes/staffManagement.routes";
import { clientRoutes } from "./routes/client.routes";
import { HttpError } from "./utils/httpError";

export const app = express();
app.set("trust proxy", 1);

const allowedCorsOrigins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowAllCorsOrigins = allowedCorsOrigins.includes("*");

app.use(helmet());
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowAllCorsOrigins) {
        callback(null, true);
        return;
      }

      callback(
        null,
        allowedCorsOrigins.includes(origin),
      );
    },
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      commit: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? null,
      storageProvider: env.STORAGE_PROVIDER,
      uploadDir: env.UPLOAD_DIR
    });
  } catch (error) {
    next(new HttpError(503, "Database readiness check failed", error));
  }
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.get("/api/openapi.json", (_req, res) => res.json(openApiDocument));

app.use("/api/admin/wellness-plans", adminWellnessPlanRoutes);
app.use("/api/admin/pet-care", adminPetCareRoutes);
app.use("/api/appointment-drafts", appointmentDraftRoutes);
app.use("/api/staff/auth", staffAuthRoutes);
app.use("/api/staff", staffManagementRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/appointment-requests", appointmentRequestRoutes);
app.use("/api/new-patient-requests", newPatientRoutes);
app.use("/api/pet-care", petCareNewsletterRoutes);
app.use("/api/files", fileRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
