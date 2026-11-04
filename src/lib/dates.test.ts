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

describe('daily report date labels', () => {
  it('formats the long day heading', async () => {
    const { formatLongDay } = await import('./dates');
    expect(formatLongDay('2026-11-04')).toBe('Wed, 04 Nov 2026');
  });
  it('formats the recorded time in Asia/Kolkata', async () => {
    const { formatRecordedTime } = await import('./dates');
    // 09:15Z = 2:45 pm IST
    expect(formatRecordedTime('2026-11-04T09:15:00.000Z', '2026-11-04')).toBe('2:45 pm');
    // 20:00Z on 3 Nov is already 4 Nov in IST
    expect(formatRecordedTime('2026-11-03T20:00:00.000Z', '2026-11-04')).toBe('1:30 am');
    // back-dated entry saved the next day shows the save date
    expect(formatRecordedTime('2026-11-04T09:15:00.000Z', '2026-11-03')).toBe('4 Nov, 2:45 pm');
    expect(formatRecordedTime(undefined)).toBeNull();
    expect(formatRecordedTime('not a date')).toBeNull();
  });
});
