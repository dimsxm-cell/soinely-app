import Image from "next/image";
import Link from "next/link";

const TESTEURS = [
  {
    titre: "100% gratuit",
    desc: "Accès complet à toutes les fonctionnalités pendant la bêta, sans frais.",
    d: "M20 6 9 17l-5-5",
  },
  {
    titre: "Influence le produit",
    desc: "Vos retours façonnent directement les fonctionnalités de SOINELY.",
    d: "m12 2 2.4 7.4H22l-6 4.4 2.3 7.2L12 16.6 5.7 21l2.3-7.2-6-4.4h7.6z",
  },
  {
    titre: "Accompagnement dédié",
    desc: "Une équipe à votre écoute, proche de votre quotidien d'IDEL.",
    d: "M12 21s-7-4.4-9.5-8.5C.5 9 2 5 5.5 5 7.8 5 9 6.5 12 9c3-2.5 4.2-4 6.5-4C22 5 23.5 9 21.5 12.5 19 16.6 12 21 12 21z",
  },
];

export function ListeAttente() {
  return (
    <section
      style={{ padding: "0 0 60px", background: "#fff" }}
    >
      <div className="mx-auto w-full max-w-[1180px] px-6">
        <div
          style={{
            borderRadius: 26,
            overflow: "hidden",
            background: "linear-gradient(115deg,#4c1d95 0%,#7c3aed 42%,#c026d3 78%,#ec4899 100%)",
            padding: "40px 44px",
            display: "grid",
            gridTemplateColumns: "0.5fr 1.15fr repeat(3, 0.72fr)",
            gap: 26,
            alignItems: "center",
          }}
        >
          {/* Mascotte ELY */}
          <div style={{ width: 130, height: 150 }}>
            <Image
              src="/marketing/ely-mascot-2.webp"
              alt="Mascotte ELY"
              width={130}
              height={150}
              className="h-full w-full object-cover"
              style={{ borderRadius: 20 }}
            />
          </div>

          {/* Texte + CTA */}
          <div>
            <h3 style={{ fontSize: 27, fontWeight: 800, letterSpacing: "-0.7px", lineHeight: 1.12, color: "#fff", margin: "0 0 6px" }}>
              Rejoignez les 100 premiers IDEL testeurs
            </h3>
            <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,.82)", marginBottom: 18 }}>
              Bêta privée · Ouverture bientôt
            </div>
            <Link
              href="/login"
              className="btn-lift mb-3 inline-flex items-center gap-[9px] rounded-full font-extrabold"
              style={{ background: "#fff", color: "#7c3aed", fontSize: 15, padding: "14px 26px", boxShadow: "0 10px 26px rgba(0,0,0,.18)", display: "inline-flex", marginBottom: 12 }}
            >
              Rejoindre la liste d&apos;attente
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.75)" }}>
              100% gratuit · Sans engagement
            </div>
          </div>

          {/* 3 avantages */}
          {TESTEURS.map((t) => (
            <div key={t.titre} style={{ textAlign: "center", color: "#fff" }}>
              <div style={{ width: 44, height: 44, borderRadius: 9999, background: "rgba(255,255,255,.16)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={t.d} />
                </svg>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 6 }}>{t.titre}</div>
              <div style={{ fontSize: 11.5, lineHeight: 1.5, color: "rgba(255,255,255,.78)" }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
