import type { Metadata } from "next";
import { EnTeteMarketing } from "@/components/marketing/EnTeteMarketing";
import { Hero } from "@/components/marketing/Hero";
import { Benefices } from "@/components/marketing/Benefices";
import { RangeeFonctionnalites } from "@/components/marketing/RangeeFonctionnalites";
import { JourneeAvecSoinely } from "@/components/marketing/JourneeAvecSoinely";
import { EnTempsReel } from "@/components/marketing/EnTempsReel";
import { SecuriteConfiance } from "@/components/marketing/SecuriteConfiance";
import { VideoDemo } from "@/components/marketing/VideoDemo";
import { ListeAttente } from "@/components/marketing/ListeAttente";
import { CtaFinal } from "@/components/marketing/CtaFinal";
import { PiedDePageMarketing } from "@/components/marketing/PiedDePageMarketing";
import { Reveal } from "@/components/marketing/Reveal";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: SITE_URL },
};

export default function Page() {
  return (
    <main className="flex flex-col overflow-x-hidden" style={{ background: "#fff", color: "#1e1b3c" }}>
      <EnTeteMarketing />
      <Hero />
      <Benefices />
      <Reveal variant="up">
        <RangeeFonctionnalites />
      </Reveal>
      <Reveal variant="zoom">
        <JourneeAvecSoinely />
      </Reveal>
      <Reveal variant="left">
        <EnTempsReel />
      </Reveal>
      <Reveal variant="up">
        <SecuriteConfiance />
      </Reveal>
      <Reveal variant="blur">
        <VideoDemo />
      </Reveal>
      <Reveal variant="rise">
        <ListeAttente />
      </Reveal>
      <CtaFinal />
      <PiedDePageMarketing />
    </main>
  );
}
