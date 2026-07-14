import Link from "next/link";
import type { SituationTerrain } from "@/lib/types/clinical";
import { Button } from "@/components/ui/Button";

interface CarteReponseProps {
  situation: SituationTerrain;
}

export function CarteReponse({ situation }: CarteReponseProps) {
  const apercu = situation.conduiteATenir.slice(0, 3);

  return (
    <div className="rounded-card border border-primary/30 bg-primary/5 p-6">
      <p className="text-sm font-medium text-primary">Réponse la plus proche</p>
      <h2 className="mt-2 text-xl font-semibold text-navy">{situation.titre}</h2>
      <p className="mt-2 text-navy/80">{situation.observation}</p>
      {apercu.length > 0 && (
        <ul className="mt-4 list-disc pl-6 text-navy/80">
          {apercu.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      <Link href={`/situations/${situation.id}`} className="mt-4 inline-block">
        <Button variant="secondary">Voir la fiche complète</Button>
      </Link>
    </div>
  );
}
