import { ChartColumn, House, ListOrdered, Settings2 } from 'lucide-react';

export const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: House, end: true },
  { to: '/transactions', label: 'Transactions', icon: ListOrdered, end: false },
  { to: '/reports', label: 'Reports', icon: ChartColumn, end: false },
  { to: '/settings', label: 'Settings', icon: Settings2, end: false },
] as const;
