import { EnTeteMarketing } from "@/components/marketing/EnTeteMarketing";
import { Hero } from "@/components/marketing/Hero";
import { RangeeFonctionnalites } from "@/components/marketing/RangeeFonctionnalites";
import { JourneeAvecSoinely } from "@/components/marketing/JourneeAvecSoinely";
import { EnTempsReel } from "@/components/marketing/EnTempsReel";
import { VideoDemo } from "@/components/marketing/VideoDemo";
import { ListeAttente } from "@/components/marketing/ListeAttente";
import { PiedDePageMarketing } from "@/components/marketing/PiedDePageMarketing";

export default function Page() {
  return (
    <main className="flex flex-col bg-[#F6F7F5] text-navy">
      <EnTeteMarketing />
      <Hero />
      <RangeeFonctionnalites />
      <JourneeAvecSoinely />
      <EnTempsReel />
      <VideoDemo />
      <ListeAttente />
      <PiedDePageMarketing />
    </main>
  );
}
