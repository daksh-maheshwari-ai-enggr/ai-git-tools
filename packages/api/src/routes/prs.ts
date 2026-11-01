import { Router, Response } from "express";
import { z } from "zod";
import { AuthRequest } from "../middleware/auth.js";
import { prisma } from "../config/prisma.js";
import { ApiError } from "../middleware/error.js";

const router = Router();

router.get("/:repoId", async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const state = req.query.state as string | undefined;
  const skip = (page - 1) * limit;

  const where = { repoId: req.params.repoId, ...(state ? { state } : {}) };

  const [prs, total] = await Promise.all([
    prisma.pullRequestRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.pullRequestRecord.count({ where }),
  ]);

  res.json({
    success: true,
    data: prs,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

router.get("/:repoId/:prId", async (req: AuthRequest, res: Response) => {
  const pr = await prisma.pullRequestRecord.findFirst({
    where: { id: req.params.prId, repoId: req.params.repoId },
  });
  if (!pr) throw new ApiError("NOT_FOUND", "PR not found", 404);
  res.json({ success: true, data: pr });
});

router.post("/:repoId", async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    githubId: z.string(),
    number: z.number().int().positive(),
    title: z.string(),
    body: z.string().optional(),
    state: z.enum(["OPEN", "CLOSED", "MERGED"]).default("OPEN"),
    baseRef: z.string().optional(),
    headRef: z.string().optional(),
    authorLogin: z.string(),
    aiGenerated: z.boolean().default(false),
    mergedAt: z.coerce.date().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Invalid PR data", 400);

  const repo = await prisma.repo.findFirst({ where: { id: req.params.repoId, userId: req.user!.id } });
  if (!repo) throw new ApiError("NOT_FOUND", "Repo not found", 404);

  const pr = await prisma.pullRequestRecord.upsert({
    where: { repoId_githubId: { repoId: repo.id, githubId: parsed.data.githubId } },
    create: { ...parsed.data, repoId: repo.id },
    update: { ...parsed.data, repoId: repo.id },
  });

  res.status(201).json({ success: true, data: pr });
});

export default router;