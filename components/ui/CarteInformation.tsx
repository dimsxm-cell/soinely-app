interface CarteInformationProps {
  label: string;
  value: string | number;
}

export function CarteInformation({ label, value }: CarteInformationProps) {
  return (
    <div className="rounded-card border border-navy/10 bg-white p-6">
      <p className="text-sm text-navy/60">{label}</p>
      <p className="text-2xl font-semibold text-navy">{value}</p>
    </div>
  );
}
