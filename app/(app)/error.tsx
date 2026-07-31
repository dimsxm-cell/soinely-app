"use client";

export default function ErreurEspaceConnecte({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-[22px] font-bold text-navy/80">
        Impossible de charger ces données
      </h1>
      <p className="mx-auto mt-3 max-w-[340px] text-[14px] leading-relaxed text-navy/55">
        Le serveur n&apos;a pas répondu. Rien n&apos;est perdu : vos données sont
        intactes, seul l&apos;affichage a échoué.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-[14px] bg-gradient-to-r from-brand-violet to-brand-rose px-6 py-3 text-[14px] font-semibold text-white shadow-[0_4px_16px_rgba(124,58,237,0.32)]"
      >
        Réessayer
      </button>
    </main>
  );
}
