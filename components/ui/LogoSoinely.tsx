"use client";

import { useId } from "react";

export function LogoSoinely({ className = "h-6 w-6" }: { className?: string }) {
  const idDegrade = useId();

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <defs>
        <linearGradient id={idDegrade} x1="3" y1="3" x2="21" y2="20.5">
          <stop offset="0" stopColor="#7C3AED" />
          <stop offset="1" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <path
        d="M12 20.5S3 15 3 8.8C3 5.6 5.5 3 8.6 3c1.9 0 3.3 1 3.4 1.1C12.1 4 13.5 3 15.4 3 18.5 3 21 5.6 21 8.8c0 6.2-9 11.7-9 11.7Z"
        fill={`url(#${idDegrade})`}
      />
    </svg>
  );
}
