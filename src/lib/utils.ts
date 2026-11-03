import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** RFC4122 v4 id. Uses crypto.randomUUID where available. */
export function newId(): string {
  const c: Crypto = globalThis.crypto;
  if (typeof c.randomUUID === 'function') return c.randomUUID();
  const b = new Uint8Array(16);
  c.getRandomValues(b);
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

/** Turn unknown errors into a short user-facing message without leaking data. */
export function friendlyError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof Error && err.message && err.message.length < 200) return err.message;
  return fallback;
}
