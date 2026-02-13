import { db } from "../store/inMemoryDb.js";
import type { CommunicationLog } from "../types/domain.js";
import { makeId } from "../utils/id.js";
import { nowIso } from "../utils/time.js";

export function queueCommunication(input: {
  channel: "EMAIL" | "SMS";
  recipient: string;
  template: string;
  context?: Record<string, unknown>;
}): CommunicationLog {
  const row: CommunicationLog = {
    id: makeId("msg"),
    channel: input.channel,
    recipient: input.recipient,
    template: input.template,
    status: "QUEUED",
    context: input.context,
    createdAt: nowIso()
  };
  db.communications.unshift(row);
  return row;
}

export function listCommunications(limit = 100): CommunicationLog[] {
  return db.communications.slice(0, limit);
}

export function markCommunicationStatus(id: string, status: CommunicationLog["status"]): CommunicationLog {
  const row = db.communications.find((item) => item.id === id);
  if (!row) throw new Error("Communication log not found");
  row.status = status;
  return row;
}

export function processQueuedCommunications(batchSize = 20): CommunicationLog[] {
  const queued = db.communications.filter((item) => item.status === "QUEUED").slice(0, batchSize);
  queued.forEach((row) => {
    row.status = "SENT";
  });
  return queued;
}
