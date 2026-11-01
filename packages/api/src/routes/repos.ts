import { Router, Response } from "express";
import { z } from "zod";
import { AuthRequest } from "../middleware/auth.js";
import { prisma } from "../config/prisma.js";
import { ApiError } from "../middleware/error.js";

const router = Router();

const repoSchema = z.object({
  githubId: z.string(),
  owner: z.string(),
  name: z.string(),
  fullName: z.string(),
  defaultBranch: z.string().optional(),
  isPrivate: z.boolean().default(false),
});

router.get("/", async (req: AuthRequest, res: Response) => {
  const repos = await prisma.repo.findMany({
    where: { userId: req.user!.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      githubId: true,
      owner: true,
      name: true,
      fullName: true,
      defaultBranch: true,
      isPrivate: true,
      aiProvider: true,
      aiModel: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { commitRecords: true, releaseNotes: true, prRecords: true } },
    },
  });

  res.json({ success: true, data: repos });
});

router.post("/", async (req: AuthRequest, res: Response) => {
  const parsed = repoSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Invalid repo data", 400);

  const existing = await prisma.repo.findUnique({ where: { githubId: parsed.data.githubId } });
  if (existing) {
    if (existing.userId !== req.user!.id) {
      throw new ApiError("FORBIDDEN", "Repo already registered by another user", 403);
    }
    // Update existing
    const updated = await prisma.repo.update({
      where: { id: existing.id },
      data: parsed.data,
    });
    return res.json({ success: true, data: updated });
  }

  const repo = await prisma.repo.create({
    data: { ...parsed.data, userId: req.user!.id },
  });
  res.status(201).json({ success: true, data: repo });
});

router.get("/:repoId", async (req: AuthRequest, res: Response) => {
  const repo = await prisma.repo.findFirst({
    where: { id: req.params.repoId, userId: req.user!.id },
    include: {
      _count: { select: { commitRecords: true, releaseNotes: true, prRecords: true, issueRecords: true } },
    },
  });

  if (!repo) throw new ApiError("NOT_FOUND", "Repo not found", 404);
  res.json({ success: true, data: repo });
});

router.patch("/:repoId", async (req: AuthRequest, res: Response) => {
  const updateSchema = z.object({
    aiProvider: z.string().optional(),
    aiModel: z.string().optional(),
    contextPrompt: z.string().optional(),
    defaultBranch: z.string().optional(),
  });
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Invalid update data", 400);

  const repo = await prisma.repo.findFirst({ where: { id: req.params.repoId, userId: req.user!.id } });
  if (!repo) throw new ApiError("NOT_FOUND", "Repo not found", 404);

  const updated = await prisma.repo.update({
    where: { id: repo.id },
    data: parsed.data,
  });
  res.json({ success: true, data: updated });
});

router.delete("/:repoId", async (req: AuthRequest, res: Response) => {
  const repo = await prisma.repo.findFirst({ where: { id: req.params.repoId, userId: req.user!.id } });
  if (!repo) throw new ApiError("NOT_FOUND", "Repo not found", 404);

  await prisma.repo.delete({ where: { id: repo.id } });
  res.json({ success: true, data: { deleted: true } });
});

export default router;