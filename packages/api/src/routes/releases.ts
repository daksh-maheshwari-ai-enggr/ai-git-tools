import { Router, Response } from "express";
import { z } from "zod";
import { AuthRequest } from "../middleware/auth.js";
import { prisma } from "../config/prisma.js";
import { ApiError } from "../middleware/error.js";

const router = Router();

router.get("/:repoId", async (req: AuthRequest, res: Response) => {
  const releases = await prisma.releaseNote.findMany({
    where: { repoId: req.params.repoId },
    orderBy: { generatedAt: "desc" },
  });
  res.json({ success: true, data: releases });
});

router.get("/:repoId/:releaseId", async (req: AuthRequest, res: Response) => {
  const release = await prisma.releaseNote.findFirst({
    where: { id: req.params.releaseId, repoId: req.params.repoId },
  });
  if (!release) throw new ApiError("NOT_FOUND", "Release not found", 404);
  res.json({ success: true, data: release });
});

router.post("/:repoId", async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    version: z.string(),
    previousVersion: z.string().optional(),
    changelog: z.string(),
    commitIds: z.array(z.string()).optional(),
    aiGenerated: z.boolean().default(false),
    aiProvider: z.string().optional(),
    aiModel: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Invalid release data", 400);

  const repo = await prisma.repo.findFirst({ where: { id: req.params.repoId, userId: req.user!.id } });
  if (!repo) throw new ApiError("NOT_FOUND", "Repo not found", 404);

  const release = await prisma.releaseNote.upsert({
    where: { repoId_version: { repoId: repo.id, version: parsed.data.version } },
    create: { ...parsed.data, repoId: repo.id },
    update: { ...parsed.data, repoId: repo.id },
  });

  res.status(201).json({ success: true, data: release });
});

export default router;