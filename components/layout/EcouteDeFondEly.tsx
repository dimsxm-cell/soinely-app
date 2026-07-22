"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  creerReconnaissanceVocale,
  lireSupportVocalClient,
  type SpeechRecognitionInstance,
} from "@/lib/reconnaissance-vocale";
import { lireTexteAVoixHaute } from "@/lib/synthese-vocale";
import { acquerirMicrophone, relacherMicrophone } from "@/lib/verrou-microphone";

const PHRASE_ACTIVATION = "dis moi ely";
const NOUVELLE_TENTATIVE_MS = 2000;

function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface EcouteDeFondElyProps {
  ecoutePermanenteActivee: boolean;
}

export function EcouteDeFondEly({ ecoutePermanenteActivee }: EcouteDeFondElyProps) {
  const router = useRouter();
  const abandonneRef = useRef(false);

  useEffect(() => {
    if (!ecoutePermanenteActivee || !lireSupportVocalClient()) return;

    let arrete = false;
    let recognitionActif: SpeechRecognitionInstance | null = null;
    abandonneRef.current = false;

    function ecouterMotActivation() {
      if (arrete || abandonneRef.current) return;

      if (!acquerirMicrophone("ecoute-fond", () => recognitionActif?.stop())) {
        setTimeout(ecouterMotActivation, NOUVELLE_TENTATIVE_MS);
        return;
      }

      const recognition = creerReconnaissanceVocale({ continuous: true });
      if (!recognition) {
        relacherMicrophone("ecoute-fond");
        if (!arrete && !abandonneRef.current) {
          setTimeout(ecouterMotActivation, NOUVELLE_TENTATIVE_MS);
        }
        return;
      }
      recognitionActif = recognition;

      recognition.onresult = (event) => {
        if (recognitionActif !== recognition) return;
        const dernier = event.results[event.results.length - 1]?.[0]?.transcript ?? "";
        if (normaliser(dernier).includes(PHRASE_ACTIVATION)) {
          recognitionActif = null;
          relacherMicrophone("ecoute-fond");
          recognition.stop();
          declencherSequence();
        }
      };
      recognition.onerror = (event) => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          abandonneRef.current = true;
        }
      };
      recognition.onend = () => {
        if (recognitionActif !== recognition) return;
        relacherMicrophone("ecoute-fond");
        recognitionActif = null;
        if (!arrete && !abandonneRef.current) {
          ecouterMotActivation();
        }
      };

      recognition.start();
    }

    function declencherSequence() {
      navigator.vibrate?.(50);
      lireTexteAVoixHaute("Je t'écoute", () => {}, demarrerEcouteQuestion);
    }

    function demarrerEcouteQuestion() {
      if (arrete) return;

      if (!acquerirMicrophone("ecoute-fond", () => recognitionActif?.stop())) {
        ecouterMotActivation();
        return;
      }

      const recognition = creerReconnaissanceVocale();
      if (!recognition) {
        relacherMicrophone("ecoute-fond");
        ecouterMotActivation();
        return;
      }
      recognitionActif = recognition;

      recognition.onresult = (event) => {
        if (recognitionActif !== recognition) return;
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          router.push(`/ely?q=${encodeURIComponent(transcript)}`);
        }
      };
      recognition.onerror = (event) => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          abandonneRef.current = true;
          return;
        }
        lireTexteAVoixHaute("Je n'ai pas compris, réessaie.", () => {}, () => {});
      };
      recognition.onend = () => {
        if (recognitionActif !== recognition) return;
        relacherMicrophone("ecoute-fond");
        recognitionActif = null;
        if (!arrete && !abandonneRef.current) {
          ecouterMotActivation();
        }
      };

      recognition.start();
    }

    ecouterMotActivation();

    return () => {
      arrete = true;
      recognitionActif?.stop();
      relacherMicrophone("ecoute-fond");
    };
  }, [ecoutePermanenteActivee, router]);

  return null;
}
