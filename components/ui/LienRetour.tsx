import Link from "next/link";

interface LienRetourProps {
  href: string;
  label: string;
}

export function LienRetour({ href, label }: LienRetourProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-full border border-navy/15 bg-white py-1 pl-1 pr-2.5 text-[12.5px] font-semibold text-navy shadow-[0_1px_2px_rgba(15,23,42,.06)] transition-colors hover:border-brand-violet/40 hover:bg-brand-violet/5"
    >
      <span
        aria-hidden="true"
        className="flex h-4 w-4 items-center justify-center rounded-full bg-navy/5 text-[10px] leading-none"
      >
        ‹
      </span>
      {label}
    </Link>
  );
}
