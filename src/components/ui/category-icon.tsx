import {
  BadgePercent, Baby, Banknote, Beer, Bike, BookOpen, Briefcase, Building2, Bus, Car, ChartPie, Clapperboard, Coffee, Coins,
  CreditCard, Dog, Droplets, Dumbbell, Fuel, Gamepad2, Gift, GraduationCap, Hammer, Handshake, HeartPulse, House, Landmark,
  Music, Pill, PiggyBank, Pizza, Plane, Receipt, Repeat, RotateCcw, Scissors, Send, Shapes, Shield, Shirt, ShoppingBag,
  ShoppingCart, Smartphone, Sparkles, Ticket, Train, TrendingUp, Tv, UserRound, Users, Utensils, Wallet, Wifi, Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils, coffee: Coffee, pizza: Pizza, beer: Beer, 'shopping-cart': ShoppingCart,
  bus: Bus, train: Train, car: Car, bike: Bike, fuel: Fuel, plane: Plane,
  'shopping-bag': ShoppingBag, shirt: Shirt, gift: Gift, smartphone: Smartphone,
  clapperboard: Clapperboard, tv: Tv, music: Music, ticket: Ticket, gamepad: Gamepad2,
  sparkles: Sparkles, scissors: Scissors, 'heart-pulse': HeartPulse, pill: Pill, dumbbell: Dumbbell,
  receipt: Receipt, wifi: Wifi, zap: Zap, droplets: Droplets, 'credit-card': CreditCard,
  home: House, hammer: Hammer, baby: Baby, dog: Dog, 'graduation-cap': GraduationCap, book: BookOpen,
  shapes: Shapes, briefcase: Briefcase, 'badge-percent': BadgePercent, 'rotate-ccw': RotateCcw, coins: Coins, banknote: Banknote,
  'user-round': UserRound, users: Users, handshake: Handshake, send: Send,
  shield: Shield, 'piggy-bank': PiggyBank, wallet: Wallet, 'chart-pie': ChartPie, repeat: Repeat, 'trending-up': TrendingUp,
  landmark: Landmark, building: Building2,
};

export const ICON_KEYS = Object.keys(CATEGORY_ICONS);

export const CATEGORY_COLORS = [
  '#f59e6b', '#f2706b', '#f472b6', '#c08cf5', '#818cf8', '#60a5fa', '#38bdf8', '#2dd4bf',
  '#2fd08a', '#a3e635', '#fbbf24', '#e8c25a', '#94a3b8', '#f0abfc',
];

export function CategoryIcon({ icon, color, size = 'md', className }: { icon: string; color: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const Icon = CATEGORY_ICONS[icon] ?? Shapes;
  const box = size === 'sm' ? 'h-8 w-8 rounded-lg' : size === 'lg' ? 'h-12 w-12 rounded-2xl' : 'h-10 w-10 rounded-xl';
  const glyph = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  return (
    <span className={cn('grid shrink-0 place-items-center', box, className)} style={{ backgroundColor: `${color}22`, color }} aria-hidden>
      <Icon className={glyph} strokeWidth={2} />
    </span>
  );
}
