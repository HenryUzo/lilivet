import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { openApiDocument } from "./docs/openapi";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { adminWellnessPlanRoutes } from "./routes/adminWellnessPlan.routes";
import { appointmentDraftRoutes } from "./routes/appointmentDraft.routes";
import { appointmentRequestRoutes } from "./routes/appointmentRequest.routes";
import { fileRoutes } from "./routes/file.routes";
import { newPatientRoutes } from "./routes/newPatientRequest.routes";
import { staffAuthRoutes } from "./routes/staffAuth.routes";

export const app = express();

const allowedCorsOrigins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowAllCorsOrigins = allowedCorsOrigins.includes("*");

app.use(helmet());
app.use(
  cors({
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

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    commit: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? null,
    uploadDir: env.UPLOAD_DIR
  });
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.get("/api/openapi.json", (_req, res) => res.json(openApiDocument));

app.use("/api/admin/wellness-plans", adminWellnessPlanRoutes);
app.use("/api/appointment-drafts", appointmentDraftRoutes);
app.use("/api/staff/auth", staffAuthRoutes);
app.use("/api/appointment-requests", appointmentRequestRoutes);
app.use("/api/new-patient-requests", newPatientRoutes);
app.use("/api/files", fileRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
