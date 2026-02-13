import { db } from "../store/inMemoryDb.js";
import type { AuditEntry } from "../types/domain.js";
import { makeId } from "../utils/id.js";
import { nowIso } from "../utils/time.js";

export interface AuditEvent {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export async function logAuditEvent(event: AuditEvent): Promise<AuditEntry> {
  const record: AuditEntry = {
    id: makeId("audit"),
    createdAt: nowIso(),
    ...event
  };

  db.auditLogs.unshift(record);
  return record;
}

export function listAuditEvents(limit = 100): AuditEntry[] {
  return db.auditLogs.slice(0, limit);
}
