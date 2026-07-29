"use client";

export function BoutonImprimer() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-glace print:hidden flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-violet to-purple-500 px-5 py-3 text-[14.5px] font-semibold text-white shadow-[0_8px_20px_rgba(124,58,237,0.28)]"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9V2h12v7" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
      Imprimer
    </button>
  );
}
