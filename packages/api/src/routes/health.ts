import { Router, Response } from "express";
import { prisma } from "../config/prisma.js";

const router = Router();

router.get("/", async (_req, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, data: { status: "ok", db: "connected" } });
  } catch {
    res.status(503).json({ success: false, data: { status: "degraded", db: "disconnected" } });
  }
});

export default router;