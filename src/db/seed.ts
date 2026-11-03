/**
 * Default categories. These are labels only — no financial data is ever seeded.
 * IDs are deterministic so that backups from different devices merge cleanly.
 */
import type { Category, TxType } from '@/types';

type Seed = { id: string; name: string; icon: string; color: string };

export const FATHER_RECIPIENT_ID = 'tr-father';

const SEEDS: Record<TxType, Seed[]> = {
  expense: [
    { id: 'exp-food', name: 'Food & Dining', icon: 'utensils', color: '#f59e6b' },
    { id: 'exp-transport', name: 'Transportation', icon: 'bus', color: '#60a5fa' },
    { id: 'exp-petrol', name: 'Petrol', icon: 'fuel', color: '#f2706b' },
    { id: 'exp-shopping', name: 'Shopping', icon: 'shopping-bag', color: '#f472b6' },
    { id: 'exp-entertainment', name: 'Entertainment', icon: 'clapperboard', color: '#c08cf5' },
    { id: 'exp-gaming', name: 'Gaming', icon: 'gamepad', color: '#818cf8' },
    { id: 'exp-personal-care', name: 'Personal Care', icon: 'sparkles', color: '#f0abfc' },
    { id: 'exp-bills', name: 'Bills & Subscriptions', icon: 'receipt', color: '#38bdf8' },
    { id: 'exp-health', name: 'Health & Fitness', icon: 'heart-pulse', color: '#4ade80' },
    { id: 'exp-household', name: 'Family & Household', icon: 'home', color: '#fbbf24' },
    { id: 'exp-travel', name: 'Travel', icon: 'plane', color: '#2dd4bf' },
    { id: 'exp-education', name: 'Education', icon: 'graduation-cap', color: '#a3e635' },
    { id: 'exp-misc', name: 'Miscellaneous', icon: 'shapes', color: '#94a3b8' },
  ],
  income: [
    { id: 'inc-salary', name: 'Salary', icon: 'briefcase', color: '#2fd08a' },
    { id: 'inc-cashback', name: 'Cashback', icon: 'badge-percent', color: '#4ade80' },
    { id: 'inc-refund', name: 'Refund', icon: 'rotate-ccw', color: '#86efac' },
    { id: 'inc-other', name: 'Other Income', icon: 'coins', color: '#a7f3d0' },
  ],
  transfer: [
    { id: FATHER_RECIPIENT_ID, name: 'Father', icon: 'user-round', color: '#7aa7ff' },
    { id: 'tr-family', name: 'Family', icon: 'users', color: '#93c5fd' },
    { id: 'tr-friends', name: 'Friends', icon: 'handshake', color: '#a5b4fc' },
    { id: 'tr-other', name: 'Other', icon: 'send', color: '#bfdbfe' },
  ],
  savings: [
    { id: 'sav-emergency', name: 'Emergency Fund', icon: 'shield', color: '#e8c25a' },
    { id: 'sav-general', name: 'General Savings', icon: 'piggy-bank', color: '#fcd34d' },
    { id: 'sav-other', name: 'Other Savings', icon: 'wallet', color: '#fde68a' },
  ],
  investment: [
    { id: 'inv-mf', name: 'Mutual Funds', icon: 'chart-pie', color: '#c08cf5' },
    { id: 'inv-sip', name: 'SIP', icon: 'repeat', color: '#d8b4fe' },
    { id: 'inv-stocks', name: 'Stocks', icon: 'trending-up', color: '#a78bfa' },
    { id: 'inv-other', name: 'Other Investments', icon: 'landmark', color: '#e9d5ff' },
  ],
};

export function defaultCategories(now: string = new Date().toISOString()): Category[] {
  const out: Category[] = [];
  (Object.keys(SEEDS) as TxType[]).forEach((type) => {
    SEEDS[type].forEach((s, i) => {
      out.push({ ...s, type, isDefault: true, sortOrder: i, createdAt: now, updatedAt: now });
    });
  });
  return out;
}
