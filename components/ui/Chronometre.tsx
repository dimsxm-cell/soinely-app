"use client";

import { useEffect, useState } from "react";

function formatDuree(secondes: number): string {
  const min = String(Math.floor(secondes / 60)).padStart(2, "0");
  const sec = String(secondes % 60).padStart(2, "0");
  return `${min}:${sec}`;
}

export function Chronometre() {
  const [secondes, setSecondes] = useState(0);

  useEffect(() => {
    const intervalle = setInterval(() => setSecondes((s) => s + 1), 1000);
    return () => clearInterval(intervalle);
  }, []);

  return (
    <p className="text-center font-display text-[40px] font-light tabular-nums tracking-tight text-brand-violet">
      {formatDuree(secondes)}
    </p>
  );
}
