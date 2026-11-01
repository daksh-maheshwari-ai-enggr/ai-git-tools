import { Router, Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { prisma } from "../config/prisma.js";
import { ApiError } from "../middleware/error.js";

const router = Router();

router.get("/:repoId/overview", async (req: AuthRequest, res: Response) => {
  const repo = await prisma.repo.findFirst({ where: { id: req.params.repoId, userId: req.user!.id } });
  if (!repo) throw new ApiError("NOT_FOUND", "Repo not found", 404);

  const days = Math.max(1, Math.min(365, Number(req.query.days) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [commitStats, prStats, issueStats, aiUsage] = await Promise.all([
    prisma.commitRecord.aggregate({
      where: { repoId: repo.id, committedAt: { gte: since } },
      _count: { id: true },
    }),
    prisma.pullRequestRecord.aggregate({
      where: { repoId: repo.id, createdAt: { gte: since } },
      _count: { id: true },
    }),
    prisma.issueRecord.aggregate({
      where: { repoId: repo.id, createdAt: { gte: since } },
      _count: { id: true },
    }),
    prisma.commitRecord.aggregate({
      where: { repoId: repo.id, aiGenerated: true, committedAt: { gte: since } },
      _count: { id: true },
    }),
  ]);

  res.json({
    success: true,
    data: {
      periodDays: days,
      commits: commitStats._count.id,
      pullRequests: prStats._count.id,
      issues: issueStats._count.id,
      aiGeneratedCommits: aiUsage._count.id,
      aiUsageRatio: commitStats._count.id ? aiUsage._count.id / commitStats._count.id : 0,
    },
  });
});

router.get("/:repoId/commits-by-type", async (req: AuthRequest, res: Response) => {
  const repo = await prisma.repo.findFirst({ where: { id: req.params.repoId, userId: req.user!.id } });
  if (!repo) throw new ApiError("NOT_FOUND", "Repo not found", 404);

  const days = Math.max(1, Math.min(365, Number(req.query.days) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const byType = await prisma.commitRecord.groupBy({
    by: ["type"],
    where: { repoId: repo.id, committedAt: { gte: since }, type: { not: null } },
    _count: { type: true },
  });

  res.json({
    success: true,
    data: byType.map((t) => ({ type: t.type, count: t._count.type })),
  });
});

router.get("/:repoId/pr-cycle-time", async (req: AuthRequest, res: Response) => {
  const repo = await prisma.repo.findFirst({ where: { id: req.params.repoId, userId: req.user!.id } });
  if (!repo) throw new ApiError("NOT_FOUND", "Repo not found", 404);

  const days = Math.max(1, Math.min(365, Number(req.query.days) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const mergedPrs = await prisma.pullRequestRecord.findMany({
    where: { repoId: repo.id, state: "MERGED", mergedAt: { gte: since } },
    select: { createdAt: true, mergedAt: true },
  });

  const cycleTimes = mergedPrs
    .map((pr) => (pr.mergedAt!.getTime() - pr.createdAt.getTime()) / (1000 * 60 * 60))
    .filter((h) => h > 0);

  const avg = cycleTimes.length ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : 0;
  const median = cycleTimes.length
    ? cycleTimes.sort((a, b) => a - b)[Math.floor(cycleTimes.length / 2)]
    : 0;

  res.json({
    success: true,
    data: { averageHours: Math.round(avg * 10) / 10, medianHours: Math.round(median * 10) / 10, sampleSize: cycleTimes.length },
  });
});

export default router;