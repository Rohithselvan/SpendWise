export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="16" fill="#151a19" />
      <circle cx="32" cy="32" r="17" fill="none" stroke="#2a3230" strokeWidth="7" />
      <path d="M32 15 A17 17 0 0 1 48.2 37.3" fill="none" stroke="#2fd08a" strokeWidth="7" strokeLinecap="round" />
      <circle cx="32" cy="32" r="4.5" fill="#2fd08a" />
    </svg>
  );
}
