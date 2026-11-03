/** Browser storage helpers: persistence requests, usage estimates, and local file export. */

export async function isStoragePersisted(): Promise<boolean | null> {
  if (!navigator.storage?.persisted) return null;
  try {
    return await navigator.storage.persisted();
  } catch {
    return null;
  }
}

export async function requestPersistentStorage(): Promise<boolean | null> {
  if (!navigator.storage?.persist) return null;
  try {
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null;
  try {
    const e = await navigator.storage.estimate();
    return { usage: e.usage ?? 0, quota: e.quota ?? 0 };
  } catch {
    return null;
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(1)} GB`;
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export type SaveOutcome = 'saved' | 'shared' | 'cancelled';

/**
 * Save a file entirely on-device. On iPhone the share sheet is used (Save to Files, AirDrop…)
 * because standalone web apps handle downloads inconsistently. Elsewhere a normal download is triggered.
 * Nothing is uploaded anywhere.
 */
export async function saveFileLocally(filename: string, content: string, mime: string): Promise<SaveOutcome> {
  const blob = new Blob([content], { type: mime });
  if (isIOS() && typeof navigator.share === 'function' && typeof File !== 'undefined') {
    const file = new File([blob], filename, { type: mime });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename });
        return 'shared';
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
        // fall through to download
      }
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'saved';
}
