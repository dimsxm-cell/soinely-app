"use client";

import { useEffect } from "react";

export function ActiverAppuiTactile() {
  useEffect(() => {
    const declencheur = () => {};
    document.addEventListener("touchstart", declencheur, { passive: true });
    return () => document.removeEventListener("touchstart", declencheur);
  }, []);

  return null;
}
