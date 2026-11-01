import { Router, Response } from "express";
import { z } from "zod";
import { AuthRequest } from "../middleware/auth.js";
import { prisma } from "../config/prisma.js";
import { ApiError } from "../middleware/error.js";

const router = Router();

router.get("/:repoId", async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const type = req.query.type as string | undefined;
  const skip = (page - 1) * limit;

  const where = { repoId: req.params.repoId, ...(type ? { type } : {}) };

  const [commits, total] = await Promise.all([
    prisma.commitRecord.findMany({
      where,
      orderBy: { committedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.commitRecord.count({ where }),
  ]);

  res.json({
    success: true,
    data: commits,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

router.get("/:repoId/stats", async (req: AuthRequest, res: Response) => {
  const repo = await prisma.repo.findFirst({ where: { id: req.params.repoId, userId: req.user!.id } });
  if (!repo) throw new ApiError("NOT_FOUND", "Repo not found", 404);

  const since = req.query.since ? new Date(req.query.since as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [byType, byDay, aiStats] = await Promise.all([
    prisma.commitRecord.groupBy({
      by: ["type"],
      where: { repoId: repo.id, committedAt: { gte: since } },
      _count: { type: true },
    }),
    prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT DATE("committedAt") as day, COUNT(*) as count
      FROM "CommitRecord"
      WHERE "repoId" = ${repo.id} AND "committedAt" >= ${since}
      GROUP BY DATE("committedAt")
      ORDER BY day ASC
    `,
    prisma.commitRecord.aggregate({
      where: { repoId: repo.id, aiGenerated: true, committedAt: { gte: since } },
      _count: { id: true },
    }),
  ]);

  res.json({
    success: true,
    data: {
      byType: byType.map((t) => ({ type: t.type, count: t._count.type })),
      byDay: byDay.map((d) => ({ day: d.day, count: Number(d.count) })),
      aiCommits: aiStats._count.id,
    },
  });
});

router.post("/:repoId", async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    hash: z.string().length(40),
    shortHash: z.string().length(7),
    message: z.string(),
    type: z.string().optional(),
    scope: z.string().optional(),
    description: z.string().optional(),
    body: z.string().optional(),
    breaking: z.boolean().default(false),
    aiGenerated: z.boolean().default(false),
    aiProvider: z.string().optional(),
    aiModel: z.string().optional(),
    author: z.string(),
    authorLogin: z.string().optional(),
    committedAt: z.coerce.date(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Invalid commit data", 400);

  const repo = await prisma.repo.findFirst({ where: { id: req.params.repoId, userId: req.user!.id } });
  if (!repo) throw new ApiError("NOT_FOUND", "Repo not found", 404);

  const commit = await prisma.commitRecord.upsert({
    where: { repoId_hash: { repoId: repo.id, hash: parsed.data.hash } },
    create: { ...parsed.data, repoId: repo.id },
    update: { ...parsed.data, repoId: repo.id },
  });

  res.status(201).json({ success: true, data: commit });
});

export default router;