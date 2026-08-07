/**
 * Frontière de chargement standard du App Router : la présence de ce
 * fichier suffit à englober `page.tsx` dans une Suspense boundary. Affiché
 * pendant que la page résout l'appel LLM (jusqu'à 8s) sur un premier
 * chargement de /ely?q=... (lien profond, appui long vocal, restauration
 * de la dernière recherche) — sans ça l'écran reste figé sans indicateur,
 * potentiellement en 4G chez un patient.
 */
export default function ChargementEly() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F7F5]">
      <div className="flex gap-1.5">
        <span className="h-[7px] w-[7px] animate-bounce rounded-full bg-brand-violet" />
        <span className="h-[7px] w-[7px] animate-bounce rounded-full bg-brand-violet [animation-delay:0.15s]" />
        <span className="h-[7px] w-[7px] animate-bounce rounded-full bg-brand-violet [animation-delay:0.3s]" />
      </div>
    </main>
  );
}
