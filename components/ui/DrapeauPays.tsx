export type CodePays = "fr" | "be" | "ch" | "lu" | "mc" | "ca";

const CLASSE = "h-3 w-4 shrink-0 rounded-[1px]";

function DrapeauFrance() {
  return (
    <svg viewBox="0 0 3 2" aria-hidden="true" focusable="false" className={CLASSE}>
      <rect width="1" height="2" x="0" fill="#002654" />
      <rect width="1" height="2" x="1" fill="#fff" />
      <rect width="1" height="2" x="2" fill="#ED2939" />
    </svg>
  );
}

function DrapeauBelgique() {
  return (
    <svg viewBox="0 0 3 2" aria-hidden="true" focusable="false" className={CLASSE}>
      <rect width="1" height="2" x="0" fill="#000" />
      <rect width="1" height="2" x="1" fill="#FDDA24" />
      <rect width="1" height="2" x="2" fill="#EF3340" />
    </svg>
  );
}

function DrapeauSuisse() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false" className={CLASSE}>
      <rect width="20" height="20" fill="#D52B1E" />
      <rect x="8" y="4" width="4" height="12" fill="#fff" />
      <rect x="4" y="8" width="12" height="4" fill="#fff" />
    </svg>
  );
}

function DrapeauLuxembourg() {
  return (
    <svg viewBox="0 0 3 3" aria-hidden="true" focusable="false" className={CLASSE}>
      <rect width="3" height="1" y="0" fill="#ED2939" />
      <rect width="3" height="1" y="1" fill="#fff" />
      <rect width="3" height="1" y="2" fill="#00A1DE" />
    </svg>
  );
}

function DrapeauMonaco() {
  return (
    <svg viewBox="0 0 3 2" aria-hidden="true" focusable="false" className={CLASSE}>
      <rect width="3" height="1" y="0" fill="#CE1126" />
      <rect width="3" height="1" y="1" fill="#fff" />
    </svg>
  );
}

function DrapeauCanada() {
  return (
    <svg viewBox="0 0 24 16" aria-hidden="true" focusable="false" className={CLASSE}>
      <rect width="24" height="16" fill="#fff" />
      <rect width="6" height="16" x="0" fill="#D52B1E" />
      <rect width="6" height="16" x="18" fill="#D52B1E" />
      <path
        d="M12 3.5l1.1 2.3 2.5-1-.6 2.6 2.4.7-1.9 1.7 1.3 2.1-2.6-.3.3 2.6-1.8-1.8-.7 2.4-.7-2.4-1.8 1.8.3-2.6-2.6.3 1.3-2.1-1.9-1.7 2.4-.7-.6-2.6 2.5 1z"
        fill="#D52B1E"
      />
    </svg>
  );
}

const DRAPEAUX: Record<CodePays, () => React.JSX.Element> = {
  fr: DrapeauFrance,
  be: DrapeauBelgique,
  ch: DrapeauSuisse,
  lu: DrapeauLuxembourg,
  mc: DrapeauMonaco,
  ca: DrapeauCanada,
};

export function DrapeauPays({ code }: { code: CodePays }) {
  const Drapeau = DRAPEAUX[code];
  return <Drapeau />;
}
