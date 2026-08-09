import Link from "next/link";
import { LogoSoinely } from "@/components/ui/LogoSoinely";

export function PiedDePageMarketing() {
  return (
    <footer style={{ borderTop: "1px solid #f0ecfb", background: "#fff", padding: "26px 0" }}>
      <div className="mx-auto flex w-full max-w-[1180px] items-center justify-center gap-[11px] px-6">
        <LogoSoinely variante="carre" className="h-7 w-7" />
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.3px", color: "#1e1b3c" }}>SOINELY</span>
      </div>

      <div className="mx-auto mt-5 flex w-full max-w-[1180px] flex-wrap items-center justify-center gap-x-5 gap-y-2 px-6">
        <Link href="/conditions" className="text-[12.5px] font-semibold text-[#8a83a0] hover:text-[#7c3aed]">
          Conditions générales
        </Link>
        <Link href="/confidentialite" className="text-[12.5px] font-semibold text-[#8a83a0] hover:text-[#7c3aed]">
          Politique de confidentialité
        </Link>
      </div>

      <div className="mx-auto mt-4 w-full max-w-[1180px] px-6 text-center" style={{ fontSize: 11.5, color: "#9a92b3" }}>
        © SOINELY {new Date().getFullYear()}
      </div>
    </footer>
  );
}
