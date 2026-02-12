import { db } from "../store/inMemoryDb.js";
import type { SystemSettings } from "../types/domain.js";

export function getSettings(): SystemSettings {
  return db.settings;
}

export function updateSettings(patch: Partial<SystemSettings>): SystemSettings {
  db.settings = { ...db.settings, ...patch };
  return db.settings;
}
