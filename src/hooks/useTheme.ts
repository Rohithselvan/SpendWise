import { useEffect } from 'react';
import type { ThemePref } from '@/types';

const THEME_COLORS = { dark: '#0f1211', light: '#f4f6f5' };

/** Applies the theme preference to <html> and mirrors it to localStorage for flash-free startup. */
export function useApplyTheme(pref: ThemePref): void {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = pref === 'dark' || (pref === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? THEME_COLORS.dark : THEME_COLORS.light);
    };
    apply();
    try {
      localStorage.setItem('spendwise-theme', pref);
    } catch {
      /* storage may be unavailable; theme still applies for this session */
    }
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [pref]);
}
