import { db } from "../store/inMemoryDb.js";
import type { AiDraft } from "../types/domain.js";

export function listAiDrafts(): AiDraft[] {
  return db.aiDrafts;
}

export function updateAiDraftStatus(id: string, status: AiDraft["status"]): AiDraft {
  const draft = db.aiDrafts.find((item) => item.id === id);
  if (!draft) throw new Error("AI draft not found");
  draft.status = status;
  return draft;
}
