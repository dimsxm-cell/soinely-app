const BADGES = [
  { icone: "🇫🇷", texte: "Hébergé en France · Certifié HDS" },
  { icone: "🛡️", texte: "Conforme RGPD" },
  { icone: "🔒", texte: "Données chiffrées de bout en bout" },
  { icone: "💜", texte: "Conçu avec des IDEL, pour des IDEL" },
];

export function PiedDePageMarketing() {
  return (
    <footer id="a-propos" className="border-t border-navy/5 px-6 py-8">
      <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[12.5px] font-medium text-navy/45">
        {BADGES.map((badge) => (
          <span key={badge.texte} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true">{badge.icone}</span>
            {badge.texte}
          </span>
        ))}
      </div>
    </footer>
  );
}
