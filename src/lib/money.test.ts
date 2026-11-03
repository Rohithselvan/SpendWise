import { describe, expect, it } from 'vitest';
import {
  formatINR,
  formatINRCompact,
  groupIndian,
  isValidPositivePaise,
  paiseToRupeeString,
  paiseToRupees,
  parseRupeesToPaise,
  rupeesToPaise,
  sumPaise,
} from './money';

describe('rupee → paise conversion', () => {
  it('parses whole and decimal rupee strings exactly', () => {
    expect(parseRupeesToPaise('1250.50')).toBe(125050);
    expect(parseRupeesToPaise('1250.5')).toBe(125050);
    expect(parseRupeesToPaise('500')).toBe(50000);
    expect(parseRupeesToPaise('0.01')).toBe(1);
    expect(parseRupeesToPaise('.5')).toBe(50);
    expect(parseRupeesToPaise('10.')).toBe(1000);
  });
  it('accepts ₹, Rs and Indian separators', () => {
    expect(parseRupeesToPaise('₹1,25,000')).toBe(12500000);
    expect(parseRupeesToPaise('Rs. 1,250.50')).toBe(125050);
    expect(parseRupeesToPaise('  2 500 ')).toBe(250000);
  });
  it('rejects invalid input', () => {
    for (const bad of ['', '.', 'abc', '-5', '1.234', '1e5', '12.3.4', '₹', '99999999999999']) {
      expect(parseRupeesToPaise(bad), bad).toBeNull();
    }
  });
  it('avoids floating point drift', () => {
    expect(parseRupeesToPaise('0.29')).toBe(29); // 0.29*100 = 28.999999999999996 in floats
    expect(rupeesToPaise(0.29)).toBe(29);
    expect(rupeesToPaise(19.99)).toBe(1999);
    expect(sumPaise([10, 20])).toBe(30);
  });
  it('validates positive paise', () => {
    expect(isValidPositivePaise(1)).toBe(true);
    expect(isValidPositivePaise(0)).toBe(false);
    expect(isValidPositivePaise(-5)).toBe(false);
    expect(isValidPositivePaise(1.5)).toBe(false);
    expect(isValidPositivePaise('100')).toBe(false);
  });
});

describe('paise → rupee conversion', () => {
  it('converts exactly', () => {
    expect(paiseToRupees(125050)).toBe(1250.5);
    expect(paiseToRupeeString(125050)).toBe('1250.50');
    expect(paiseToRupeeString(5)).toBe('0.05');
    expect(paiseToRupeeString(50000, false)).toBe('500');
    expect(paiseToRupeeString(50050, false)).toBe('500.50');
  });
});

describe('Indian currency formatting', () => {
  it('groups digits the Indian way', () => {
    expect(groupIndian('500')).toBe('500');
    expect(groupIndian('1250')).toBe('1,250');
    expect(groupIndian('125000')).toBe('1,25,000');
    expect(groupIndian('12345678')).toBe('1,23,45,678');
  });
  it('formats rupee amounts', () => {
    expect(formatINR(50000)).toBe('₹500');
    expect(formatINR(125000)).toBe('₹1,250');
    expect(formatINR(2500000)).toBe('₹25,000');
    expect(formatINR(12500000)).toBe('₹1,25,000');
    expect(formatINR(125050)).toBe('₹1,250.50');
    expect(formatINR(125000, { decimals: 'always' })).toBe('₹1,250.00');
    expect(formatINR(125050, { decimals: 'never' })).toBe('₹1,251');
    expect(formatINR(0)).toBe('₹0');
    expect(formatINR(-50000)).toBe('−₹500');
    expect(formatINR(50000, { signed: true })).toBe('+₹500');
  });
  it('formats compact axis labels', () => {
    expect(formatINRCompact(95000)).toBe('₹950');
    expect(formatINRCompact(1200000)).toBe('₹12K');
    expect(formatINRCompact(12000000)).toBe('₹1.2L');
    expect(formatINRCompact(3400000000)).toBe('₹3.4Cr');
  });
});
