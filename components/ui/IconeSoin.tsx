interface IconeSoinProps {
  typeSoin: string;
  className?: string;
}

export function IconeSoin({ typeSoin, className = "h-5 w-5" }: IconeSoinProps) {
  const t = typeSoin.toLowerCase();

  if (t.includes("injection")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path
          d="m18 2 4 4M17 7l3-3M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5M9 11l4 4M5 19l-3 3M14 4l6 6"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (t.includes("pansement")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M4.6 13.11a5.5 5.5 0 0 0 7.78 7.78l6.9-6.9a5.5 5.5 0 0 0-7.79-7.77z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m14.5 4.5-8 8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="17.5" cy="6.5" r="1" stroke="currentColor" strokeWidth="2" fill="none" />
        <circle cx="6.5" cy="17.5" r="1" stroke="currentColor" strokeWidth="2" fill="none" />
      </svg>
    );
  }
  if (t.includes("glyc") || t.includes("sang")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M12 2.69 17.66 8.35a8 8 0 1 1-11.31 0z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (t.includes("tension") || t.includes("activit")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
