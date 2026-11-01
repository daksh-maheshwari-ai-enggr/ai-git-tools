import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorMiddleware(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, error: { code: err.code, message: err.message } });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid request", details: err.flatten() },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ success: false, error: { code: "DUPLICATE", message: "Record already exists" } });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Record not found" } });
    }
  }

  console.error("[error]", err);
  return res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
}