import Link from "next/link";

interface LienRetourProps {
  href: string;
  label: string;
}

export function LienRetour({ href, label }: LienRetourProps) {
  return (
    <Link
      href={href}
      className="btn-glace-clair inline-flex items-center gap-1.5 rounded-[10px] border border-navy/15 bg-white py-1.5 pl-2 pr-3 text-[12.5px] font-semibold text-navy print:hidden"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-3.5 w-3.5 text-brand-violet"
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
      {label}
    </Link>
  );
}
