"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { ReponseEly } from "@/lib/types/clinical";
import { poserQuestionElyAction } from "@/lib/data/ely-actions";
import { IconeMicro } from "@/components/ui/IconeMicro";
import { BadgeNiveauConfiance } from "@/components/ui/BadgeNiveauConfiance";
import { BadgeSyntheseIA } from "@/components/ui/BadgeSyntheseIA";
import { LectureVocaleReponse } from "@/components/ui/LectureVocaleReponse";
import { PersistanceRecherche } from "@/components/ui/PersistanceRecherche";
import { EnTeteEly } from "@/components/ui/EnTeteEly";
import {
  creerReconnaissanceVocale,
  lireSupportVocalClient,
  lireSupportVocalServeur,
  souscrireSupportVocal,
} from "@/lib/reconnaissance-vocale";
import { acquerirMicrophoneForce, relacherMicrophone } from "@/lib/verrou-microphone";
import { couperLecture } from "@/lib/synthese-vocale";

const SUGGESTIONS = [
  {
    label: "Une plaie qui s'infecte",
    sous: "Pansement · traçabilité",
    icone: "M12 2v20M2 12h20",
    fond: "#f1ebfd",
    couleur: "#6d28d9",
  },
  {
    label: "Mon patient a chuté",
    sous: "Évaluation · relevé",
    icone: "M8 21v-6l4-3 4 3v6M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
    fond: "#eef4fb",
    couleur: "#1f6fb2",
  },
  {
    label: "Douleur thoracique",
    sous: "Urgence · appeler le 15",
    icone: "M20.8 6.6a5 5 0 0 0-8.8-1.6A5 5 0 0 0 3.2 6.6c-1 2.6.6 5 2.4 6.8L12 20l6.4-6.6c1.8-1.8 3.4-4.2 2.4-6.8Z",
    fond: "#fdeceb",
    couleur: "#c0392b",
  },
  {
    label: "Signes d'hypoglycémie",
    sous: "Resucrage · surveillance",
    icone: "M12 2 6 9a7 7 0 1 0 12 0Z",
    fond: "#fdf4e6",
    couleur: "#a1670c",
  },
] as const;

const MESSAGE_AUCUN_RESULTAT = "Je n'ai pas trouvé de réponse à cette question. Essaie de la reformuler.";

function texteAVoixHaute(reponse: ReponseEly): string {
  if (reponse.synthese) {
    return [
      reponse.synthese.situationComprise,
      ...reponse.synthese.actionsRetenues,
      ...reponse.synthese.signesAlerteRetenus,
    ].join(". ");
  }
  if (reponse.situationBrute) {
    return [
      reponse.situationBrute.titre,
      reponse.situationBrute.observation,
      ...reponse.situationBrute.conduiteATenir.slice(0, 3),
    ].join(". ");
  }
  return MESSAGE_AUCUN_RESULTAT;
}

interface MessageUtilisateur {
  id: number;
  role: "utilisateur";
  texte: string;
}
interface MessageEly {
  id: number;
  role: "ely";
  reponse: ReponseEly;
}
type Message = MessageUtilisateur | MessageEly;

interface ConversationElyProps {
  requeteInitiale: string;
  reponseInitiale: ReponseEly;
  patientContexte?: string | null;
  soinContexte?: string | null;
  nombreFiches?: number;
}

export function ConversationEly({
  requeteInitiale,
  reponseInitiale,
  patientContexte,
  soinContexte,
  nombreFiches = 0,
}: ConversationElyProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [brouillon, setBrouillon] = useState("");
  const [enChargement, setEnChargement] = useState(false);
  const [ecoute, setEcoute] = useState(false);
  const [derniereReponseId, setDerniereReponseId] = useState<number | null>(null);
  const compteurId = useRef(0);
  const requeteTraitee = useRef<string | null>(null);
  const ancreScroll = useRef<HTMLDivElement>(null);

  const supporteVocal = useSyncExternalStore(souscrireSupportVocal, lireSupportVocalClient, lireSupportVocalServeur);

  function idSuivant() {
    compteurId.current += 1;
    return compteurId.current;
  }

  useEffect(() => {
    if (!requeteInitiale || requeteTraitee.current === requeteInitiale) return;
    requeteTraitee.current = requeteInitiale;
    const idUser = idSuivant();
    const idEly = idSuivant();
    setMessages((m) => [
      ...m,
      { id: idUser, role: "utilisateur", texte: requeteInitiale },
      { id: idEly, role: "ely", reponse: reponseInitiale },
    ]);
    setDerniereReponseId(idEly);
  }, [requeteInitiale, reponseInitiale]);

  useEffect(() => {
    ancreScroll.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, enChargement]);

  async function envoyerQuestion(texte: string) {
    const q = texte.trim();
    if (!q || enChargement) return;
    setMessages((m) => [...m, { id: idSuivant(), role: "utilisateur", texte: q }]);
    setBrouillon("");
    setEnChargement(true);
    const reponse = await poserQuestionElyAction(q);
    const idEly = idSuivant();
    setMessages((m) => [...m, { id: idEly, role: "ely", reponse }]);
    setEnChargement(false);
    setDerniereReponseId(idEly);
  }

  function nouvelleConversation() {
    couperLecture();
    setMessages([]);
    setBrouillon("");
    setDerniereReponseId(null);
    requeteTraitee.current = null;
    window.localStorage.removeItem("ely_derniere_requete");
    router.replace("/ely");
  }

  function demarrerEcoute() {
    const recognition = creerReconnaissanceVocale();
    if (!recognition) return;

    acquerirMicrophoneForce("dictee", () => recognition.stop());

    recognition.onstart = () => setEcoute(true);
    recognition.onend = () => {
      relacherMicrophone("dictee");
      setEcoute(false);
    };
    recognition.onerror = () => {
      relacherMicrophone("dictee");
      setEcoute(false);
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) envoyerQuestion(transcript);
    };

    recognition.start();
  }

  const aDesMessages = messages.length > 0 || enChargement;

  return (
    <>
      {!patientContexte && (
        <PersistanceRecherche cle="ely_derniere_requete" requeteActuelle={requeteInitiale} onRestaurer={setBrouillon} />
      )}
      <EnTeteEly aDesMessages={aDesMessages} onReset={nouvelleConversation} nombreFiches={nombreFiches} />
      <div className="mx-auto flex max-w-2xl flex-col px-6 py-6 sm:py-8">
        <p className="text-[12px] leading-relaxed text-navy/40">
          Ely t'aide à analyser la situation ; la décision et la responsabilité restent à toi.
        </p>

        {patientContexte && (
          <p className="mt-3 text-[13px] font-semibold text-navy/55">
            Pour {patientContexte}
            {soinContexte ? ` · ${soinContexte}` : ""}
          </p>
        )}

        <div className="py-6">
          {!aDesMessages ? (
            <div className="flex flex-col items-center px-4 pt-6 text-center">
              <span className="relative flex h-[160px] w-[160px] items-center justify-center">
                <span
                  aria-hidden="true"
                  className="ely-glow absolute h-[110px] w-[110px] rounded-full bg-gradient-to-br from-brand-violet/40 to-brand-rose/40 blur-xl"
                />
                <span className="relative">
                  <Image
                    src="/marketing/ely-colibri-heureux.webp"
                    alt=""
                    width={323}
                    height={304}
                    className="h-[150px] w-auto object-contain drop-shadow-[0_18px_28px_rgba(124,58,237,0.32)]"
                  />
                </span>
              </span>
              <h1 className="mt-5 font-display text-[24px] font-bold tracking-tight text-navy">Bonjour, je suis ELY</h1>
              <p className="mt-2 max-w-[280px] text-[15px] leading-relaxed text-navy/55">
                Ton assistant de tournée. Pose-moi une question de terrain, je te guide sur la conduite à tenir.
              </p>

              <div className="mt-6 flex w-full flex-col gap-2 text-left">
                <div className="flex items-center gap-2 px-0.5">
                  <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-navy/40">
                    Questions fréquentes
                  </span>
                  <span aria-hidden="true" className="h-px flex-1 bg-navy/10" />
                </div>
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion.label}
                    type="button"
                    onClick={() => envoyerQuestion(suggestion.label)}
                    className="btn-glace-clair flex w-full items-center gap-2.5 rounded-[16px] border border-navy/10 bg-white px-3.5 py-3 text-left shadow-[0_1px_2px_rgba(15,23,42,.04)]"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[12px]"
                      style={{ background: suggestion.fond, color: suggestion.couleur }}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={suggestion.icone} />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-bold tracking-tight text-navy">{suggestion.label}</span>
                      <span className="mt-0.5 block text-[11.5px] text-navy/45">{suggestion.sous}</span>
                    </span>
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[15px] w-[15px] shrink-0 text-navy/25">
                      <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((message) =>
                message.role === "utilisateur" ? (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[80%] rounded-[18px] rounded-br-[5px] bg-gradient-to-r from-brand-violet to-brand-rose px-4 py-3 text-[15px] text-white shadow-[0_6px_16px_rgba(124,58,237,0.24)]">
                      {message.texte}
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="flex items-end gap-2.5">
                    <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-brand-violet/70">
                      <Image
                        src="/marketing/ely-colibri-heureux.webp"
                        alt=""
                        width={323}
                        height={304}
                        className="h-[26px] w-[26px] rounded-full object-cover"
                      />
                    </span>
                    <div className="max-w-[80%] rounded-[18px] rounded-bl-[5px] border border-navy/[0.06] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,.04)]">
                      {message.reponse.synthese ? (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <BadgeSyntheseIA />
                          </div>
                          <p className="mt-1.5 text-[15px] leading-relaxed text-navy/85">
                            {message.reponse.synthese.situationComprise}
                          </p>
                          {message.reponse.synthese.informationsManquantes.length > 0 && (
                            <div className="mt-2.5">
                              <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-navy/45">
                                À préciser
                              </p>
                              <ul className="mt-1 flex flex-col gap-1">
                                {message.reponse.synthese.informationsManquantes.map((info) => (
                                  <li key={info} className="text-[14px] leading-relaxed text-navy/75">
                                    {info}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {message.reponse.synthese.controlesRetenus.length > 0 && (
                            <div className="mt-2.5">
                              <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-navy/45">
                                Contrôles
                              </p>
                              <ul className="mt-1 flex flex-col gap-1.5">
                                {message.reponse.synthese.controlesRetenus.map((item) => (
                                  <li key={item} className="flex items-start gap-2 text-[14px] leading-relaxed text-navy/75">
                                    <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-violet/50" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {message.reponse.synthese.actionsRetenues.length > 0 && (
                            <div className="mt-2.5">
                              <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-navy/45">
                                Actions
                              </p>
                              <ul className="mt-1 flex flex-col gap-1.5">
                                {message.reponse.synthese.actionsRetenues.map((item) => (
                                  <li key={item} className="flex items-start gap-2 text-[14px] leading-relaxed text-navy/75">
                                    <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-violet/50" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {message.reponse.synthese.signesAlerteRetenus.length > 0 && (
                            <div className="mt-2.5">
                              <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-navy/45">
                                Signes d&apos;alerte
                              </p>
                              <ul className="mt-1 flex flex-col gap-1.5">
                                {message.reponse.synthese.signesAlerteRetenus.map((item) => (
                                  <li key={item} className="text-[14px] leading-relaxed text-danger">
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {message.reponse.situationsSources
                            .filter((s) => message.reponse.synthese!.fichesUtiliseesIds.includes(s.id))
                            .length > 0 && (
                            <div className="mt-3 flex flex-col gap-1.5 border-t border-navy/[0.06] pt-2.5">
                              {message.reponse.situationsSources
                                .filter((s) => message.reponse.synthese!.fichesUtiliseesIds.includes(s.id))
                                .map((source) => (
                                  <div key={source.id} className="flex items-center justify-between gap-2">
                                    <Link
                                      href={`/situations/${source.id}`}
                                      className="text-[13px] font-semibold text-brand-violet"
                                    >
                                      {source.titre}
                                    </Link>
                                    <BadgeNiveauConfiance niveau={source.niveauConfiance} />
                                  </div>
                                ))}
                            </div>
                          )}
                          {message.id === derniereReponseId && (
                            <div className="mt-2.5">
                              <LectureVocaleReponse key={message.id} texte={texteAVoixHaute(message.reponse)} />
                            </div>
                          )}
                        </>
                      ) : message.reponse.situationBrute ? (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <BadgeNiveauConfiance niveau={message.reponse.situationBrute.niveauConfiance} />
                          </div>
                          <p className="mt-1.5 text-[14.5px] font-bold tracking-tight text-brand-violet">
                            {message.reponse.situationBrute.titre}
                          </p>
                          <p className="mt-1.5 text-[15px] leading-relaxed text-navy/85">
                            {message.reponse.situationBrute.observation}
                          </p>
                          {message.reponse.situationBrute.conduiteATenir.length > 0 && (
                            <ul className="mt-2.5 flex flex-col gap-1.5">
                              {message.reponse.situationBrute.conduiteATenir.slice(0, 3).map((etape) => (
                                <li key={etape} className="flex items-start gap-2 text-[14px] leading-relaxed text-navy/75">
                                  <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-violet/50" />
                                  {etape}
                                </li>
                              ))}
                            </ul>
                          )}
                          <Link
                            href={`/situations/${message.reponse.situationBrute.id}`}
                            className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-violet"
                          >
                            Voir la fiche complète
                            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5">
                              <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </Link>
                          {message.id === derniereReponseId && (
                            <div className="mt-2.5">
                              <LectureVocaleReponse key={message.id} texte={texteAVoixHaute(message.reponse)} />
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="text-[15px] leading-relaxed text-navy/85">{MESSAGE_AUCUN_RESULTAT}</p>
                          {message.id === derniereReponseId && (
                            <div className="mt-2.5">
                              <LectureVocaleReponse key={message.id} texte={MESSAGE_AUCUN_RESULTAT} />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              )}
              {enChargement && (
                <div className="flex items-end gap-2.5">
                  <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-brand-violet/70">
                    <Image
                      src="/marketing/ely-colibri-concentre.webp"
                      alt=""
                      width={318}
                      height={305}
                      className="h-[26px] w-[26px] rounded-full object-cover"
                    />
                  </span>
                  <div className="flex gap-1.5 rounded-[18px] rounded-bl-[5px] border border-navy/[0.06] bg-white px-4 py-3.5">
                    <span className="h-[7px] w-[7px] animate-bounce rounded-full bg-brand-violet" />
                    <span className="h-[7px] w-[7px] animate-bounce rounded-full bg-brand-violet [animation-delay:0.15s]" />
                    <span className="h-[7px] w-[7px] animate-bounce rounded-full bg-brand-violet [animation-delay:0.3s]" />
                  </div>
                </div>
              )}
              <div ref={ancreScroll} />
            </div>
          )}
        </div>

        {aDesMessages && (
          <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-10 -mx-6 flex justify-center px-6 pb-2">
            <button
              type="button"
              onClick={nouvelleConversation}
              className="btn-glace flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-violet to-brand-rose px-4 py-2 text-[12.5px] font-bold text-white shadow-[0_8px_20px_rgba(124,58,237,0.34)]"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Nouvelle conversation
            </button>
          </div>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            envoyerQuestion(brouillon);
          }}
          className="mt-2 flex items-center gap-2.5"
        >
          <div className="flex min-h-[48px] flex-1 items-center gap-2 rounded-full border border-navy/10 bg-white py-1 pl-4 pr-1.5">
            <input
              type="text"
              value={brouillon}
              onChange={(event) => setBrouillon(event.target.value)}
              placeholder="Ex. : une plaie qui s'infecte, que faire ?"
              aria-label="Poser une question à Ely"
              className="min-w-0 flex-1 border-0 bg-transparent py-2 text-[15px] text-navy outline-none placeholder:text-navy/40"
            />
            {supporteVocal && (
              <button
                type="button"
                onClick={demarrerEcoute}
                aria-label="Dicter la question au micro"
                aria-pressed={ecoute}
                className={`baguette flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${
                  ecoute ? "bg-danger/15 text-danger" : "bg-brand-violet/10 text-brand-violet"
                }`}
              >
                <IconeMicro />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={!brouillon.trim() || enChargement}
            className="btn-glace shrink-0 rounded-full bg-gradient-to-r from-brand-violet to-brand-rose px-5 py-3 text-[15px] font-semibold text-white shadow-[0_6px_16px_rgba(124,58,237,0.28)] disabled:opacity-40 disabled:saturate-50"
          >
            Demander
          </button>
        </form>
      </div>
    </>
  );
}
