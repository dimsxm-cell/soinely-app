"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

interface PersistanceRechercheProps {
  cle: string;
  requeteActuelle: string;
}

export function PersistanceRecherche({ cle, requeteActuelle }: PersistanceRechercheProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (requeteActuelle) {
      window.localStorage.setItem(cle, requeteActuelle);
      return;
    }

    const derniereRequete = window.localStorage.getItem(cle);
    if (derniereRequete) {
      router.replace(`${pathname}?q=${encodeURIComponent(derniereRequete)}`);
    }
  }, [cle, requeteActuelle, pathname, router]);

  return null;
}
