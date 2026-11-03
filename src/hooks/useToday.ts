import { useEffect, useState } from 'react';
import { todayIST } from '@/lib/dates';

/** Current Asia/Kolkata calendar date; updates when the day rolls over or the app returns to the foreground. */
export function useToday(): string {
  const [today, setToday] = useState(todayIST);
  useEffect(() => {
    const tick = () => setToday((prev) => {
      const next = todayIST();
      return next === prev ? prev : next;
    });
    const id = window.setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return today;
}
