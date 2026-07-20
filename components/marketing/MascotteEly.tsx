export function MascotteEly({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 150" aria-hidden="true" focusable="false" className={className}>
      <defs>
        <linearGradient id="mascotte-degrade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A78BFA" />
          <stop offset="1" stopColor="#F472B6" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="140" rx="34" ry="6" fill="#000" opacity="0.08" />
      <rect x="26" y="60" width="68" height="62" rx="26" fill="#fff" stroke="url(#mascotte-degrade)" strokeWidth="3" />
      <path d="M40 78c8-6 32-6 40 0" stroke="url(#mascotte-degrade)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="60" cy="96" r="9" fill="url(#mascotte-degrade)" opacity="0.15" />
      <path
        d="M60 91.5c1.6-2.4 6.5-2.4 6.5 1.6 0 3-4 5.4-6.5 7.6-2.5-2.2-6.5-4.6-6.5-7.6 0-4 4.9-4 6.5-1.6Z"
        fill="url(#mascotte-degrade)"
      />
      <circle cx="26" cy="90" r="7" fill="#fff" stroke="url(#mascotte-degrade)" strokeWidth="3" />
      <circle
        cx="98"
        cy="88"
        r="9"
        fill="#fff"
        stroke="url(#mascotte-degrade)"
        strokeWidth="3"
        className="origin-[98px_88px] animate-[wiggle_2.4s_ease-in-out_infinite]"
      />
      <rect x="42" y="30" width="36" height="34" rx="17" fill="#fff" stroke="url(#mascotte-degrade)" strokeWidth="3" />
      <line x1="60" y1="30" x2="60" y2="18" stroke="url(#mascotte-degrade)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="14" r="4" fill="url(#mascotte-degrade)" />
      <circle cx="52" cy="46" r="4" fill="#0F172A" />
      <circle cx="68" cy="46" r="4" fill="#0F172A" />
      <path d="M53 55c3 2.5 11 2.5 14 0" stroke="#0F172A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
