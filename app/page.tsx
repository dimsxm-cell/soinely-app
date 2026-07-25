import { EnTeteMarketing } from "@/components/marketing/EnTeteMarketing";
import { Hero } from "@/components/marketing/Hero";
import { RangeeFonctionnalites } from "@/components/marketing/RangeeFonctionnalites";
import { JourneeAvecSoinely } from "@/components/marketing/JourneeAvecSoinely";
import { EnTempsReel } from "@/components/marketing/EnTempsReel";
import { VideoDemo } from "@/components/marketing/VideoDemo";
import { ListeAttente } from "@/components/marketing/ListeAttente";
import { PiedDePageMarketing } from "@/components/marketing/PiedDePageMarketing";
import { Reveal } from "@/components/marketing/Reveal";

export default function Page() {
  return (
    <main className="flex flex-col overflow-x-hidden bg-[#F6F7F5] text-navy">
      <EnTeteMarketing />
      <Hero />
      <Reveal variant="up">
        <RangeeFonctionnalites />
      </Reveal>
      <Reveal variant="zoom">
        <JourneeAvecSoinely />
      </Reveal>
      <Reveal variant="left">
        <EnTempsReel />
      </Reveal>
      <Reveal variant="blur">
        <VideoDemo />
      </Reveal>
      <Reveal variant="rise">
        <ListeAttente />
      </Reveal>
      <PiedDePageMarketing />
    </main>
  );
}
