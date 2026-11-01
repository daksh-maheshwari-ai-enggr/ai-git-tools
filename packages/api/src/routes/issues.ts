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

  const [issues, total] = await Promise.all([
    prisma.issueRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.issueRecord.count({ where }),
  ]);

  res.json({
    success: true,
    data: issues,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

router.post("/:repoId", async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    githubId: z.string(),
    number: z.number().int().positive(),
    title: z.string(),
    body: z.string().optional(),
    state: z.enum(["OPEN", "CLOSED"]).default("OPEN"),
    labels: z.array(z.string()).default([]),
    assigneeLogins: z.array(z.string()).default([]),
    authorLogin: z.string(),
    aiSuggestions: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Invalid issue data", 400);

  const repo = await prisma.repo.findFirst({ where: { id: req.params.repoId, userId: req.user!.id } });
  if (!repo) throw new ApiError("NOT_FOUND", "Repo not found", 404);

  const issue = await prisma.issueRecord.upsert({
    where: { repoId_githubId: { repoId: repo.id, githubId: parsed.data.githubId } },
    create: { ...parsed.data, repoId: repo.id },
    update: { ...parsed.data, repoId: repo.id },
  });

  res.status(201).json({ success: true, data: issue });
});

export default router;