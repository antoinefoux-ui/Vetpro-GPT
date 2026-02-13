import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import { db } from "../store/inMemoryDb.js";
import type { User, UserRole } from "../types/domain.js";
import { makeId } from "../utils/id.js";
import { nowIso } from "../utils/time.js";
import { findUserByEmail, findUserById, insertUser, listUsersRepo } from "../persistence/user.repository.js";

interface AuthTokenPayload {
  sub: string;
  role: UserRole;
  email: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
}

function encode(obj: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function signPayload(payload: AuthTokenPayload): string {
  const header = encode({ alg: "HS256", typ: "JWT" });
  const body = encode(payload as unknown as Record<string, unknown>);
  const sig = createHmac("sha256", env.JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

function verifyToken(token: string): AuthTokenPayload | null {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) return null;

  const expected = createHmac("sha256", env.JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AuthTokenPayload;
  if (payload.exp < Date.now()) return null;
  if (payload.iss !== env.JWT_ISSUER || payload.aud !== env.JWT_AUDIENCE) return null;
  return payload;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, encoded: string): boolean {
  const [salt, hash] = encoded.split(":");
  if (!salt || !hash) return false;
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
  const now = Date.now();
  const payload: AuthTokenPayload = {
    sub: user.id,
    role: user.role,
    email: user.email,
    iss: env.JWT_ISSUER,
    aud: env.JWT_AUDIENCE,
    iat: now,
    exp: now + 1000 * 60 * 60 * 8
  };

  return signPayload(payload);
}

export async function registerUser(input: { fullName: string; email: string; password: string; role: UserRole }): Promise<User> {
  const existing = await findUserByEmail(input.email);
  if (existing) throw new Error("User already exists");

  const user: User = {
    id: makeId("usr"),
    fullName: input.fullName,
    email: input.email.toLowerCase(),
    role: input.role,
    passwordHash: hashPassword(input.password),
    createdAt: nowIso()
  };

  await insertUser(user);
  return user;
}

export async function loginUser(email: string, password: string): Promise<{ accessToken: string; refreshToken: string; user: Omit<User, "passwordHash"> }> {
  const user = await findUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) throw new Error("Invalid credentials");

  const accessToken = issueAccessToken(user);
  const refreshToken = issueRefreshToken(user.id);
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return { accessToken, refreshToken, user: safeUser };
}

export async function oauthLogin(googleIdToken: string): Promise<{ accessToken: string; refreshToken: string; user: Omit<User, "passwordHash"> }> {
  if (!googleIdToken || googleIdToken.length < 10) throw new Error("Invalid OAuth token");
  const pseudoEmail = `${googleIdToken.slice(0, 8)}@oauth.vetpro.local`;
  let user = await findUserByEmail(pseudoEmail);
  if (!user) user = await registerUser({ fullName: "OAuth User", email: pseudoEmail, password: randomBytes(12).toString("hex"), role: "RECEPTIONIST" });
  const accessToken = issueAccessToken(user);
  const refreshToken = issueRefreshToken(user.id);
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return { accessToken, refreshToken, user: safeUser };
}

export async function rotateRefreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const tokenRow = db.refreshTokens.find((row) => row.token === refreshToken);
  if (!tokenRow || tokenRow.expiresAt < Date.now()) throw new Error("Invalid refresh token");

  const user = await findUserById(tokenRow.userId);
  if (!user) throw new Error("User not found for refresh token");

  db.refreshTokens = db.refreshTokens.filter((row) => row.token !== refreshToken);
  return { accessToken: issueAccessToken(user), refreshToken: issueRefreshToken(user.id) };
}

export function revokeRefreshToken(refreshToken: string): void {
  db.refreshTokens = db.refreshTokens.filter((row) => row.token !== refreshToken);
}

export async function requestPasswordReset(email: string): Promise<{ resetToken: string }> {
  const user = await findUserByEmail(email);
  if (!user) return { resetToken: "REQUEST_ACCEPTED" };
  const resetToken = randomBytes(24).toString("base64url");
  db.passwordResetTokens.push({ token: resetToken, userId: user.id, expiresAt: Date.now() + 1000 * 60 * 30 });
  return { resetToken };
}

export async function resetPassword(resetToken: string, newPassword: string): Promise<void> {
  const tokenRow = db.passwordResetTokens.find((row) => row.token === resetToken);
  if (!tokenRow || tokenRow.expiresAt < Date.now()) throw new Error("Invalid or expired reset token");

  const user = await findUserById(tokenRow.userId);
  if (!user) throw new Error("User not found");

  user.passwordHash = hashPassword(newPassword);
  db.passwordResetTokens = db.passwordResetTokens.filter((row) => row.token !== resetToken);
}

export async function listUsers(): Promise<Array<Omit<User, "passwordHash">>> {
  const users = await listUsersRepo();
  return users.map(({ passwordHash: _passwordHash, ...safe }) => safe);
}

export async function updateUserRole(userId: string, role: UserRole): Promise<Omit<User, "passwordHash">> {
  const user = await findUserById(userId);
  if (!user) throw new Error("User not found");
  user.role = role;
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

export async function authenticateToken(token: string): Promise<Omit<User, "passwordHash"> | null> {
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await findUserById(payload.sub);
  if (!user) return null;
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}
