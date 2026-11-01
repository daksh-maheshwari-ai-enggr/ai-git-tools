import { Router, Response } from "express";
import { optionalAuth, AuthRequest } from "../middleware/auth.js";
import { prisma } from "../config/prisma.js";

const router = Router();

router.get("/", optionalAuth, async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.json({ success: true, data: { authenticated: false } });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, githubId: true, githubLogin: true, avatarUrl: true, name: true, email: true, createdAt: true },
  });

  if (!user) {
    return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "User not found" } });
  }

  res.json({ success: true, data: { authenticated: true, user } });
});

export default router;