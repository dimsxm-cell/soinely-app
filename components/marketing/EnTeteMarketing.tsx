import Link from "next/link";

const LIENS_NAV = [
  { href: "#feat", label: "Fonctionnalités" },
  { href: "#ely", label: "ELY, votre copilote" },
  { href: "/abonnement", label: "Tarifs" },
];

export function EnTeteMarketing() {
  return (
    <header className="lg-nav sticky top-0 z-50 border-b border-white/40">
      {/* couche distorsion verre */}
      <div className="lg-effect" aria-hidden="true" />
      {/* couche teinte blanche */}
      <div className="lg-tint" aria-hidden="true" />
      {/* reflet supérieur */}
      <div className="lg-shine" aria-hidden="true" />

      <div className="lg-content mx-auto flex w-full max-w-[1180px] items-center justify-between gap-6 px-6" style={{ height: "76px" }}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-[11px]">
          <span
            className="flex shrink-0 items-center justify-center rounded-[11px]"
            style={{
              width: 38,
              height: 38,
              background: "linear-gradient(135deg,#7c3aed,#a855f7)",
              boxShadow: "0 4px 12px rgba(124,58,237,.35)",
            }}
          >
            {/* icône cœur */}
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s-7-4.4-9.5-8.5C.5 9 2 5 5.5 5 7.8 5 9 6.5 12 9c3-2.5 4.2-4 6.5-4C22 5 23.5 9 21.5 12.5 19 16.6 12 21 12 21z" />
            </svg>
          </span>
          <span style={{ lineHeight: 1 }}>
            <span className="block text-[19px] font-extrabold tracking-[-0.5px]" style={{ color: "#1e1b3c" }}>SOINELY</span>
            <span className="hidden text-[8.5px] font-bold uppercase tracking-[0.05em] sm:block" style={{ color: "#9a92b3", marginTop: 2 }}>
              Le copilote des infirmiers libéraux
            </span>
          </span>
        </Link>

        {/* Nav links */}
        <nav aria-label="Navigation principale" className="hidden items-center gap-[30px] text-[14.5px] font-semibold lg:flex" style={{ color: "#4b4763" }}>
          {LIENS_NAV.map((lien) => (
            <Link
              key={lien.label}
              href={lien.href}
              className="navlink flex items-center gap-1 transition-colors hover:text-[#7c3aed]"
            >
              {lien.label}
            </Link>
          ))}
        </nav>

        {/* CTA — Se connecter */}
        <Link
          href="/login"
          className="btn-glace whitespace-nowrap rounded-[12px] text-[14.5px] font-bold text-white"
          style={{
            background: "linear-gradient(135deg,#7c3aed,#a855f7)",
            padding: "12px 22px",
            boxShadow: "0 6px 18px rgba(124,58,237,.32)",
          }}
        >
          Se connecter
        </Link>
      </div>
    </header>
  );
}
