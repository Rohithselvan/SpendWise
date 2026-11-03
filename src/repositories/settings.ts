/** Key-value settings with typed defaults. */
import { db } from '@/db/schema';
import type { AppSettings } from '@/types';

export const DEFAULT_SETTINGS: AppSettings = {
  dateFormat: 'DD/MM/YYYY',
  theme: 'dark',
  lastBackupAt: null,
};

export function settingsFromRows(rows: { key: string; value: unknown }[]): AppSettings {
  const out: AppSettings = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    if (r.key === 'dateFormat' && (r.value === 'DD/MM/YYYY' || r.value === 'YYYY-MM-DD')) out.dateFormat = r.value;
    if (r.key === 'theme' && (r.value === 'dark' || r.value === 'light' || r.value === 'system')) out.theme = r.value;
    if (r.key === 'lastBackupAt' && (typeof r.value === 'string' || r.value === null)) out.lastBackupAt = r.value;
  }
  return out;
}

export async function getSettings(): Promise<AppSettings> {
  return settingsFromRows(await db.settings.toArray());
}

export async function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
  await db.settings.put({ key, value });
}
