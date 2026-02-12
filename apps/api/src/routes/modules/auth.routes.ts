import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import {
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  revokeRefreshToken,
  rotateRefreshToken
} from "../../services/auth.service.js";

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "VETERINARIAN", "NURSE", "RECEPTIONIST", "SHOP_STAFF"])
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

const resetRequestSchema = z.object({
  email: z.string().email()
});

const resetSchema = z.object({
  resetToken: z.string().min(1),
  newPassword: z.string().min(8)
});

export const authRouter = Router();

authRouter.post("/register", (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const user = registerUser(parsed.data);
    return res.status(201).json({ id: user.id, email: user.email, role: user.role, fullName: user.fullName });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

authRouter.post("/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const result = loginUser(parsed.data.email, parsed.data.password);
    return res.json(result);
  } catch (error) {
    return res.status(401).json({ error: (error as Error).message });
  }
});

authRouter.post("/refresh", (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    return res.json(rotateRefreshToken(parsed.data.refreshToken));
  } catch (error) {
    return res.status(401).json({ error: (error as Error).message });
  }
});

authRouter.post("/logout", (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  revokeRefreshToken(parsed.data.refreshToken);
  return res.status(204).send();
});

authRouter.post("/password-reset/request", (req, res) => {
  const parsed = resetRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const result = requestPasswordReset(parsed.data.email);
  return res.status(202).json(result);
});

authRouter.post("/password-reset/confirm", (req, res) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    resetPassword(parsed.data.resetToken, parsed.data.newPassword);
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  return res.json({ user: req.user });
});
