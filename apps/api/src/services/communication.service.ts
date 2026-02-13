import { db } from "../store/inMemoryDb.js";
import type { CommunicationLog } from "../types/domain.js";
import { makeId } from "../utils/id.js";
import { nowIso } from "../utils/time.js";

function shouldFailDelivery(row: CommunicationLog): boolean {
  const forceFail = typeof row.context?.forceFail === "boolean" ? row.context.forceFail : false;
  return forceFail || row.recipient.toLowerCase().includes("invalid");
}

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
    attempts: 0,
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
  if (status === "QUEUED") {
    row.errorMessage = undefined;
  }
  return row;
}

export function processQueuedCommunications(batchSize = 20): CommunicationLog[] {
  const maxAttempts = db.settings.communicationPolicy.maxAttempts;
  const queued = db.communications.filter((item) => item.status === "QUEUED").slice(0, batchSize);
  queued.forEach((row) => {
    row.attempts += 1;
    row.lastAttemptAt = nowIso();
    if (shouldFailDelivery(row)) {
      row.status = "FAILED";
      row.errorMessage = row.attempts >= maxAttempts ? "Delivery failed: max attempts reached" : "Simulated delivery failure";
      return;
    }
    row.status = "SENT";
    row.errorMessage = undefined;
  });
  return queued;
}

export function retryFailedCommunications(batchSize = 20): CommunicationLog[] {
  const maxAttempts = db.settings.communicationPolicy.maxAttempts;
  const failed = db.communications
    .filter((item) => item.status === "FAILED" && item.attempts < maxAttempts)
    .slice(0, batchSize);
  failed.forEach((row) => {
    row.status = "QUEUED";
    row.errorMessage = undefined;
  });
  return failed;
}
