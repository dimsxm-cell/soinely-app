import Link from "next/link";

export function CtaFinal() {
  return (
    <section
      className="py-16 sm:py-20"
      style={{ background: "var(--color-soinely-purple-900)" }}
    >
      <div className="mx-auto w-full max-w-[720px] px-6 text-center">
        <h2
          className="font-display"
          style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.6px", lineHeight: 1.18, color: "#fff", margin: "0 0 6px" }}
        >
          Vous prenez soin de vos patients.
        </h2>
        <p
          className="font-display"
          style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.6px", lineHeight: 1.18, color: "var(--color-soinely-lilac-200)", margin: "0 0 18px" }}
        >
          ELY prend soin de votre journée.
        </p>
        <p style={{ fontSize: 15.5, lineHeight: 1.55, color: "rgba(255,255,255,.78)", margin: "0 auto 28px", maxWidth: "48ch" }}>
          Rejoignez la bêta privée de SOINELY et participez aux dernières étapes de construction
          du copilote pensé pour les IDEL.
        </p>
        <Link
          href="/login"
          className="btn-glace-clair inline-flex items-center gap-[9px] rounded-[12px] font-extrabold"
          style={{ background: "#fff", color: "var(--color-soinely-purple-700)", fontSize: 16, padding: "16px 32px", boxShadow: "0 14px 32px rgba(0,0,0,.22)" }}
        >
          Rejoindre la bêta privée
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-soinely-purple-700)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
        <p style={{ marginTop: 16, fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,.7)" }}>
          Gratuit pendant la bêta • Sans engagement
        </p>
      </div>
    </section>
  );
}
