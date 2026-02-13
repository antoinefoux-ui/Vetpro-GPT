import { db } from "../store/inMemoryDb.js";
import type { SystemSettings } from "../types/domain.js";

type SettingsPatch = Partial<Omit<SystemSettings, "integrations" | "reminderPolicy">> & {
  integrations?: Partial<SystemSettings["integrations"]>;
  reminderPolicy?: Partial<SystemSettings["reminderPolicy"]>;
};

export function getSettings(): SystemSettings {
  return db.settings;
}

export function updateSettings(patch: SettingsPatch): SystemSettings {
  db.settings = {
    ...db.settings,
    ...patch,
    integrations: {
      ...db.settings.integrations,
      ...(patch.integrations ?? {})
    },
    reminderPolicy: {
      ...db.settings.reminderPolicy,
      ...(patch.reminderPolicy ?? {})
    }
  };
  return db.settings;
}
