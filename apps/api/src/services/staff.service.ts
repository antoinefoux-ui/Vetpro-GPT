import { db } from "../store/inMemoryDb.js";
import type { StaffCredential } from "../types/domain.js";
import { makeId } from "../utils/id.js";
import { nowIso } from "../utils/time.js";

export function listCredentials(userId?: string): StaffCredential[] {
  return userId ? db.staffCredentials.filter((row) => row.userId === userId) : db.staffCredentials;
}

export function createCredential(input: Omit<StaffCredential, "id" | "createdAt" | "status">): StaffCredential {
  const user = db.users.find((u) => u.id === input.userId);
  if (!user) throw new Error("User not found");
  const expiresAtMs = input.expiresAt ? new Date(input.expiresAt).getTime() : undefined;
  const now = Date.now();
  const status: StaffCredential["status"] = !expiresAtMs
    ? "ACTIVE"
    : expiresAtMs < now
      ? "EXPIRED"
      : expiresAtMs - now < 1000 * 60 * 60 * 24 * 60
        ? "EXPIRING_SOON"
        : "ACTIVE";

  const row: StaffCredential = { ...input, id: makeId("cred"), createdAt: nowIso(), status };
  db.staffCredentials.push(row);
  return row;
}
