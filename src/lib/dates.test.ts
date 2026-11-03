import { describe, expect, it } from 'vitest';
import { daysInRange, formatDisplayDate, isValidISODate, monthRange, shiftMonthKey, todayIST, weekStartISO } from './dates';

describe('dates', () => {
  it('computes today in Asia/Kolkata', () => {
    // 2026-11-02T20:00Z is 01:30 on 3 Nov in IST
    expect(todayIST(new Date('2026-11-02T20:00:00Z'))).toBe('2026-11-03');
    expect(todayIST(new Date('2026-11-02T18:00:00Z'))).toBe('2026-11-02');
  });
  it('validates calendar dates', () => {
    expect(isValidISODate('2026-02-28')).toBe(true);
    expect(isValidISODate('2026-02-29')).toBe(false);
    expect(isValidISODate('2024-02-29')).toBe(true);
    expect(isValidISODate('2026-13-01')).toBe(false);
    expect(isValidISODate('03/11/2026')).toBe(false);
  });
  it('handles month ranges and weeks', () => {
    expect(monthRange('2026-02-14')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12');
    expect(weekStartISO('2026-11-08')).toBe('2026-11-02'); // Sunday → Monday
    expect(daysInRange({ start: '2026-11-01', end: '2026-11-30' })).toBe(30);
  });
  it('formats display dates', () => {
    expect(formatDisplayDate('2026-11-03')).toBe('03/11/2026');
    expect(formatDisplayDate('2026-11-03', 'YYYY-MM-DD')).toBe('2026-11-03');
  });
});
