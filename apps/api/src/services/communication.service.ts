import { db } from "../store/inMemoryDb.js";
import type { CommunicationLog } from "../types/domain.js";
import { makeId } from "../utils/id.js";
import { nowIso } from "../utils/time.js";

function plusMinutesIso(baseIso: string, minutes: number): string {
  return new Date(new Date(baseIso).getTime() + minutes * 60_000).toISOString();
}

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
    row.nextRetryAt = undefined;
  }
  return row;
}

export function processQueuedCommunications(batchSize = 20): CommunicationLog[] {
  const { maxAttempts, retryBackoffMinutes } = db.settings.communicationPolicy;
  const queued = db.communications.filter((item) => item.status === "QUEUED").slice(0, batchSize);
  queued.forEach((row) => {
    row.attempts += 1;
    row.lastAttemptAt = nowIso();
    if (shouldFailDelivery(row)) {
      row.status = "FAILED";
      if (row.attempts >= maxAttempts) {
        row.errorMessage = "Delivery failed: max attempts reached";
        row.nextRetryAt = undefined;
      } else {
        row.errorMessage = "Simulated delivery failure";
        row.nextRetryAt = plusMinutesIso(row.lastAttemptAt, retryBackoffMinutes);
      }
      return;
    }
    row.status = "SENT";
    row.errorMessage = undefined;
    row.nextRetryAt = undefined;
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
    row.nextRetryAt = undefined;
  });
  return failed;
}


export function retryDueFailedCommunications(referenceDateIso = nowIso(), batchSize = 20): CommunicationLog[] {
  const maxAttempts = db.settings.communicationPolicy.maxAttempts;
  const due = db.communications
    .filter((item) => item.status === "FAILED" && item.attempts < maxAttempts)
    .filter((item) => !item.nextRetryAt || new Date(item.nextRetryAt).getTime() <= new Date(referenceDateIso).getTime())
    .slice(0, batchSize);

  due.forEach((row) => {
    row.status = "QUEUED";
    row.errorMessage = undefined;
    row.nextRetryAt = undefined;
  });

  return due;
}
