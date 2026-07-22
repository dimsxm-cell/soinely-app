"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  couperLecture,
  lireSupportSyntheseClient,
  lireSupportSyntheseServeur,
  lireTexteAVoixHaute,
  souscrireSupportSynthese,
} from "@/lib/synthese-vocale";

interface LectureVocaleReponseProps {
  texte: string;
}

export function LectureVocaleReponse({ texte }: LectureVocaleReponseProps) {
  const [enCours, setEnCours] = useState(false);
  const supporte = useSyncExternalStore(
    souscrireSupportSynthese,
    lireSupportSyntheseClient,
    lireSupportSyntheseServeur
  );

  useEffect(() => {
    if (!supporte || !texte.trim()) return;

    lireTexteAVoixHaute(
      texte,
      () => setEnCours(true),
      () => setEnCours(false)
    );

    return () => {
      if (lireSupportSyntheseClient()) {
        couperLecture();
      }
    };
  }, [texte, supporte]);

  if (!supporte || !enCours) return null;

  return (
    <button
      type="button"
      onClick={() => couperLecture()}
      className="inline-flex items-center gap-1.5 rounded-full bg-navy/10 px-3 py-1.5 text-sm font-medium text-navy transition-colors hover:bg-navy/15"
    >
      <span aria-hidden="true">🔇</span> Couper
    </button>
  );
}
