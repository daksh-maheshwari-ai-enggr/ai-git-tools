import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { authMiddleware, optionalAuth } from "./middleware/auth.js";
import { errorMiddleware } from "./middleware/error.js";
import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import repoRoutes from "./routes/repos.js";
import commitRoutes from "./routes/commits.js";
import prRoutes from "./routes/prs.js";
import releaseRoutes from "./routes/releases.js";
import issueRoutes from "./routes/issues.js";
import metricsRoutes from "./routes/metrics.js";

const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Routes ──────────────────────────────────────────────────────────────
app.use("/health", healthRoutes);
app.use("/auth", authRoutes);

// Protected routes
app.use("/repos", authMiddleware, repoRoutes);
app.use("/commits", authMiddleware, commitRoutes);
app.use("/prs", authMiddleware, prRoutes);
app.use("/releases", authMiddleware, releaseRoutes);
app.use("/issues", authMiddleware, issueRoutes);
app.use("/metrics", authMiddleware, metricsRoutes);

// 404 (must come after all routes)
app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: `Route not found: ${req.method} ${req.path}` } });
});

// Error handler (must be last)
app.use(errorMiddleware);

const port = Number(env.PORT) || 3000;

const server = app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[api] SIGTERM received, shutting down...");
  server.close(() => {
    prisma.$disconnect().then(() => process.exit(0));
  });
});

export default app;