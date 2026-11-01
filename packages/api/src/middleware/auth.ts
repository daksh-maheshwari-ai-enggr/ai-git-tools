import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    githubId: string;
    githubLogin: string;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.["access_token"] ?? req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; githubId: string; githubLogin: string };
    req.user = { id: payload.sub, githubId: payload.githubId, githubLogin: payload.githubLogin };
    next();
  } catch {
    return res.status(401).json({ success: false, error: { code: "TOKEN_EXPIRED", message: "Token expired or invalid" } });
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const token = req.cookies?.["access_token"] ?? req.headers.authorization?.replace("Bearer ", "");
  if (!token) return next();
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; githubId: string; githubLogin: string };
    req.user = { id: payload.sub, githubId: payload.githubId, githubLogin: payload.githubLogin };
  } catch {
    // ignore
  }
  next();
}

export async function requireRepoAccess(req: AuthRequest, res: Response, next: NextFunction) {
  const repoId = req.params.repoId;
  if (!repoId) return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "repoId required" } });

  const repo = await prisma.repo.findFirst({
    where: { id: repoId, userId: req.user!.id },
    select: { id: true },
  });

  if (!repo) {
    return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Repo not found or access denied" } });
  }
  next();
}