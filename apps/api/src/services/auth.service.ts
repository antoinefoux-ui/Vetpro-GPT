import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import { db } from "../store/inMemoryDb.js";
import type { User, UserRole } from "../types/domain.js";
import { makeId } from "../utils/id.js";
import { nowIso } from "../utils/time.js";

interface AuthTokenPayload {
  sub: string;
  role: UserRole;
  email: string;
  exp: number;
}

function signPayload(payload: AuthTokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", env.JWT_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token: string): AuthTokenPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = createHmac("sha256", env.JWT_SECRET).update(body).digest("base64url");
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AuthTokenPayload;
  if (payload.exp < Date.now()) return null;
  return payload;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, encoded: string): boolean {
  const [salt, hash] = encoded.split(":");
  const candidate = scryptSync(password, salt, 32).toString("hex");
  const hashBuf = Buffer.from(hash);
  const candBuf = Buffer.from(candidate);
  return hashBuf.length === candBuf.length && timingSafeEqual(hashBuf, candBuf);
}

function issueRefreshToken(userId: string): string {
  const token = randomBytes(24).toString("base64url");
  db.refreshTokens.push({ token, userId, expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 14 });
  return token;
}

function issueAccessToken(user: User): string {
  const payload: AuthTokenPayload = {
    sub: user.id,
    role: user.role,
    email: user.email,
    exp: Date.now() + 1000 * 60 * 60 * 8
  };

  return signPayload(payload);
}

export function registerUser(input: {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}): User {
  const existing = db.users.find((u) => u.email.toLowerCase() === input.email.toLowerCase());
  if (existing) throw new Error("User already exists");

  const user: User = {
    id: makeId("usr"),
    fullName: input.fullName,
    email: input.email.toLowerCase(),
    role: input.role,
    passwordHash: hashPassword(input.password),
    createdAt: nowIso()
  };

  db.users.push(user);
  return user;
}

export function loginUser(email: string, password: string): {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, "passwordHash">;
} {
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash)) throw new Error("Invalid credentials");

  const accessToken = issueAccessToken(user);
  const refreshToken = issueRefreshToken(user.id);
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return { accessToken, refreshToken, user: safeUser };
}

export function rotateRefreshToken(refreshToken: string): { accessToken: string; refreshToken: string } {
  const tokenRow = db.refreshTokens.find((row) => row.token === refreshToken);
  if (!tokenRow || tokenRow.expiresAt < Date.now()) throw new Error("Invalid refresh token");

  const user = db.users.find((u) => u.id === tokenRow.userId);
  if (!user) throw new Error("User not found for refresh token");

  db.refreshTokens = db.refreshTokens.filter((row) => row.token !== refreshToken);
  return { accessToken: issueAccessToken(user), refreshToken: issueRefreshToken(user.id) };
}

export function revokeRefreshToken(refreshToken: string): void {
  db.refreshTokens = db.refreshTokens.filter((row) => row.token !== refreshToken);
}

export function requestPasswordReset(email: string): { resetToken: string } {
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return { resetToken: "REQUEST_ACCEPTED" };
  }

  const resetToken = randomBytes(24).toString("base64url");
  db.passwordResetTokens.push({ token: resetToken, userId: user.id, expiresAt: Date.now() + 1000 * 60 * 30 });
  return { resetToken };
}

export function resetPassword(resetToken: string, newPassword: string): void {
  const tokenRow = db.passwordResetTokens.find((row) => row.token === resetToken);
  if (!tokenRow || tokenRow.expiresAt < Date.now()) throw new Error("Invalid or expired reset token");

  const user = db.users.find((u) => u.id === tokenRow.userId);
  if (!user) throw new Error("User not found");

  user.passwordHash = hashPassword(newPassword);
  db.passwordResetTokens = db.passwordResetTokens.filter((row) => row.token !== resetToken);
}

export function listUsers(): Array<Omit<User, "passwordHash">> {
  return db.users.map(({ passwordHash: _passwordHash, ...safe }) => safe);
}

export function updateUserRole(userId: string, role: UserRole): Omit<User, "passwordHash"> {
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error("User not found");
  user.role = role;
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

export function authenticateToken(token: string): Omit<User, "passwordHash"> | null {
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = db.users.find((u) => u.id === payload.sub);
  if (!user) return null;
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}
