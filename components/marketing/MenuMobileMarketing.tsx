"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface LienNav {
  href: string;
  label: string;
}

export function MenuMobileMarketing({ liens }: { liens: LienNav[] }) {
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    if (!ouvert) return;
    function surEchap(event: KeyboardEvent) {
      if (event.key === "Escape") setOuvert(false);
    }
    document.addEventListener("keydown", surEchap);
    return () => document.removeEventListener("keydown", surEchap);
  }, [ouvert]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-label="Menu"
        aria-expanded={ouvert}
        className="flex h-10 w-10 items-center justify-center rounded-[10px] text-[#1e1b3c]"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          {ouvert ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
        </svg>
      </button>

      {ouvert && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navigation"
          className="menu-mobile-panel fixed inset-0 z-[60] flex flex-col"
          style={{ background: "#fff" }}
        >
          <div className="flex items-center justify-end px-6" style={{ height: 76 }}>
            <button
              type="button"
              onClick={() => setOuvert(false)}
              aria-label="Fermer le menu"
              className="flex h-10 w-10 items-center justify-center rounded-[10px] text-[#1e1b3c]"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex flex-1 flex-col items-center justify-center gap-7 px-6" aria-label="Navigation principale mobile">
            {liens.map((lien) => (
              <Link
                key={lien.label}
                href={lien.href}
                onClick={() => setOuvert(false)}
                className="text-[22px] font-bold"
                style={{ color: "#1e1b3c" }}
              >
                {lien.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOuvert(false)}
              className="btn-glace mt-4 rounded-[12px] text-[16px] font-bold text-white"
              style={{
                background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                padding: "14px 30px",
                boxShadow: "0 10px 26px rgba(124,58,237,.35)",
              }}
            >
              Rejoindre la bêta privée
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
