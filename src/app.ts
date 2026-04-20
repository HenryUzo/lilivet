import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { openApiDocument } from "./docs/openapi";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { appointmentDraftRoutes } from "./routes/appointmentDraft.routes";
import { appointmentRequestRoutes } from "./routes/appointmentRequest.routes";
import { fileRoutes } from "./routes/file.routes";
import { newPatientRoutes } from "./routes/newPatientRequest.routes";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.get("/api/openapi.json", (_req, res) => res.json(openApiDocument));

app.use("/api/appointment-drafts", appointmentDraftRoutes);
app.use("/api/appointment-requests", appointmentRequestRoutes);
app.use("/api/new-patient-requests", newPatientRoutes);
app.use("/api/files", fileRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
