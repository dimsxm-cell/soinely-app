"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { SituationTerrain } from "@/lib/types/clinical";
import { poserQuestionElyAction } from "@/lib/data/ely-actions";
import { IconeMicro } from "@/components/ui/IconeMicro";
import { LectureVocaleReponse } from "@/components/ui/LectureVocaleReponse";
import {
  creerReconnaissanceVocale,
  lireSupportVocalClient,
  lireSupportVocalServeur,
  souscrireSupportVocal,
} from "@/lib/reconnaissance-vocale";
import { acquerirMicrophoneForce, relacherMicrophone } from "@/lib/verrou-microphone";
import { couperLecture } from "@/lib/synthese-vocale";

const SUGGESTIONS = [
  "Une plaie qui s'infecte",
  "Mon patient a chuté",
  "Douleur thoracique",
  "Signes d'hypoglycémie",
];

const MESSAGE_AUCUN_RESULTAT = "Je n'ai pas trouvé de réponse à cette question. Essayez de la reformuler.";

function texteAVoixHaute(situation: SituationTerrain | null): string {
  if (!situation) return MESSAGE_AUCUN_RESULTAT;
  return [situation.titre, situation.observation, ...situation.conduiteATenir.slice(0, 3)].join(". ");
}

interface MessageUtilisateur {
  id: number;
  role: "utilisateur";
  texte: string;
}
interface MessageEly {
  id: number;
  role: "ely";
  situation: SituationTerrain | null;
}
type Message = MessageUtilisateur | MessageEly;

interface ConversationElyProps {
  requeteInitiale: string;
  situationInitiale: SituationTerrain | null;
}

export function ConversationEly({ requeteInitiale, situationInitiale }: ConversationElyProps) {
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
      { id: idEly, role: "ely", situation: situationInitiale },
    ]);
    setDerniereReponseId(idEly);
  }, [requeteInitiale, situationInitiale]);

  useEffect(() => {
    ancreScroll.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, enChargement]);

  async function envoyerQuestion(texte: string) {
    const q = texte.trim();
    if (!q || enChargement) return;
    setMessages((m) => [...m, { id: idSuivant(), role: "utilisateur", texte: q }]);
    setBrouillon("");
    setEnChargement(true);
    const situation = await poserQuestionElyAction(q);
    const idEly = idSuivant();
    setMessages((m) => [...m, { id: idEly, role: "ely", situation }]);
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
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-navy/10 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-brand-violet/70">
            <Image
              src="/app/ely-mascot.png"
              alt=""
              width={936}
              height={1400}
              className="h-[38px] w-auto object-contain"
            />
          </span>
          <div>
            <p className="font-display text-[17px] font-bold leading-none tracking-tight text-navy">ELY</p>
            <p className="mt-1 flex items-center gap-1.5 text-[12px] text-navy/45">
              <span aria-hidden="true" className="h-[6px] w-[6px] rounded-full bg-[#1a7f37]" />
              Assistant de tournée
            </p>
          </div>
        </div>
        {aDesMessages && (
          <button
            type="button"
            onClick={nouvelleConversation}
            aria-label="Nouvelle conversation"
            className="btn-glace-clair flex h-[38px] w-[38px] items-center justify-center rounded-[12px] border border-navy/10 bg-white text-brand-violet"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[19px] w-[19px]">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 3v5h5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

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
                  src="/app/ely-mascot.png"
                  alt=""
                  width={936}
                  height={1400}
                  className="h-[150px] w-auto object-contain drop-shadow-[0_18px_28px_rgba(124,58,237,0.32)]"
                />
              </span>
            </span>
            <h1 className="mt-5 font-display text-[24px] font-bold tracking-tight text-navy">Bonjour, je suis ELY</h1>
            <p className="mt-2 max-w-[280px] text-[15px] leading-relaxed text-navy/55">
              Votre assistant de tournée. Posez-moi une question de terrain, je vous guide sur la conduite à tenir.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => envoyerQuestion(label)}
                  className="btn-glace-clair rounded-[12px] border border-navy/10 bg-white px-4 py-2.5 text-[13.5px] font-semibold text-navy shadow-[0_1px_2px_rgba(15,23,42,.04)]"
                >
                  {label}
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
                      src="/app/ely-mascot.png"
                      alt=""
                      width={936}
                      height={1400}
                      className="h-[26px] w-auto object-contain"
                    />
                  </span>
                  <div className="max-w-[80%] rounded-[18px] rounded-bl-[5px] border border-navy/[0.06] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,.04)]">
                    {message.situation ? (
                      <>
                        <p className="text-[14.5px] font-bold tracking-tight text-brand-violet">{message.situation.titre}</p>
                        <p className="mt-1.5 text-[15px] leading-relaxed text-navy/85">{message.situation.observation}</p>
                        {message.situation.conduiteATenir.length > 0 && (
                          <ul className="mt-2.5 flex flex-col gap-1.5">
                            {message.situation.conduiteATenir.slice(0, 3).map((etape) => (
                              <li key={etape} className="flex items-start gap-2 text-[14px] leading-relaxed text-navy/75">
                                <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-violet/50" />
                                {etape}
                              </li>
                            ))}
                          </ul>
                        )}
                        <Link
                          href={`/situations/${message.situation.id}`}
                          className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-violet"
                        >
                          Voir la fiche complète
                          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5">
                            <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </Link>
                        {message.id === derniereReponseId && (
                          <div className="mt-2.5">
                            <LectureVocaleReponse key={message.id} texte={texteAVoixHaute(message.situation)} />
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
                    src="/app/ely-mascot.png"
                    alt=""
                    width={936}
                    height={1400}
                    className="h-[26px] w-auto object-contain"
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

      <form
        onSubmit={(event) => {
          event.preventDefault();
          envoyerQuestion(brouillon);
        }}
        className="mt-2 flex items-center gap-2.5"
      >
        <div className="flex min-h-[48px] flex-1 items-center gap-2 rounded-[12px] border border-navy/10 bg-white pl-4 pr-1.5">
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
              className={`baguette flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-base ${
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
          className="btn-glace shrink-0 rounded-[12px] bg-gradient-to-r from-brand-violet to-brand-rose px-5 py-3 text-[15px] font-semibold text-white shadow-[0_6px_16px_rgba(124,58,237,0.28)] disabled:opacity-40 disabled:saturate-50"
        >
          Demander
        </button>
      </form>
    </div>
  );
}
