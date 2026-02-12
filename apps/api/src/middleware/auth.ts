import type { NextFunction, Request, Response } from "express";
import { authenticateToken } from "../services/auth.service.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;
  const queryToken = typeof req.query.token === "string" ? req.query.token : undefined;
  const token = bearerToken ?? queryToken;

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  const user = authenticateToken(token);
  if (!user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.user = user;
  return next();
}
