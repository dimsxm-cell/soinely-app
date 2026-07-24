"use client";

import { useEffect, useRef, type ReactNode } from "react";

const VARIANTS = {
  up: "rv-up",
  zoom: "rv-zoom",
  left: "rv-left",
  blur: "rv-blur",
  rise: "rv-rise",
} as const;

export function Reveal({
  children,
  variant = "up",
  className = "",
}: {
  children: ReactNode;
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && node.classList.add("in"),
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${VARIANTS[variant]} ${className}`}>
      {children}
    </div>
  );
}
