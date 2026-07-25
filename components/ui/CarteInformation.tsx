interface CarteInformationProps {
  label: string;
  value: string | number;
  accentuee?: boolean;
}

export function CarteInformation({ label, value, accentuee = false }: CarteInformationProps) {
  const enAccent = accentuee && Number(value) > 0;

  return (
    <div className="rounded-[20px] border border-navy/[0.04] bg-white p-4 shadow-[0_8px_22px_rgba(80,50,140,0.1)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-navy/45">{label}</p>
      <p
        className={`mt-1 font-display text-[30px] font-semibold tabular-nums leading-none sm:text-[34px] ${
          enAccent ? "text-brand-violet" : "text-navy"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
