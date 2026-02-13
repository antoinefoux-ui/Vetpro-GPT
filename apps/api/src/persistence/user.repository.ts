import { env } from "../config/env.js";
import { db } from "../store/inMemoryDb.js";
import type { User, UserRole } from "../types/domain.js";
import { prisma } from "./prisma.js";

function mapPrismaRole(role: string): UserRole {
  if (role === "ADMIN" || role === "VETERINARIAN" || role === "NURSE" || role === "RECEPTIONIST" || role === "SHOP_STAFF") return role;
  return "RECEPTIONIST";
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  if (env.PERSISTENCE_MODE === "postgres") {
    const row = await prisma().user.findUnique({ where: { email: email.toLowerCase() } });
    if (!row) return undefined;
    const mem = db.users.find((u) => u.email === row.email.toLowerCase());
    if (mem) return mem;
    return {
      id: row.id,
      fullName: row.fullName,
      email: row.email.toLowerCase(),
      role: mapPrismaRole(row.role),
      passwordHash: "",
      createdAt: row.createdAt.toISOString()
    };
  }
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function insertUser(user: User): Promise<void> {
  db.users.push(user);
  if (env.PERSISTENCE_MODE === "postgres") {
    await prisma().user.upsert({
      where: { email: user.email.toLowerCase() },
      update: { fullName: user.fullName, role: user.role },
      create: { id: user.id, email: user.email.toLowerCase(), fullName: user.fullName, role: user.role }
    });
  }
}

export async function listUsersRepo(): Promise<User[]> {
  return db.users;
}

export async function findUserById(id: string): Promise<User | undefined> {
  return db.users.find((u) => u.id === id);
}
