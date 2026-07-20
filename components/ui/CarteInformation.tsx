interface CarteInformationProps {
  label: string;
  value: string | number;
}

export function CarteInformation({ label, value }: CarteInformationProps) {
  return (
    <div className="rounded-[20px] border border-navy/10 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.04),0_18px_40px_rgba(15,23,42,.06)]">
      <p className="text-[12.5px] font-bold uppercase tracking-wider text-navy/45">{label}</p>
      <p className="mt-1 font-display text-[28px] font-medium tabular-nums text-navy">{value}</p>
    </div>
  );
}
