"use client";

import { useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { couperLecture, lireTexteAVoixHaute } from "@/lib/synthese-vocale";
import {
  creerReconnaissanceVocale,
  lireSupportVocalClient,
  type SpeechRecognitionInstance,
} from "@/lib/reconnaissance-vocale";

const SEUIL_APPUI_LONG_MS = 500;

function IconeEly() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[22px] w-[22px]"
    >
      <path d="M5 5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H10l-4.5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

interface OngletElyProps {
  actif: boolean;
}

export function OngletEly({ actif }: OngletElyProps) {
  const router = useRouter();
  const minuteurRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const declencheRef = useRef(false);
  const annuleRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [enSequence, setEnSequence] = useState(false);

  function demarrerMinuteur() {
    declencheRef.current = false;
    minuteurRef.current = setTimeout(() => {
      declencheRef.current = true;
      demarrerSequence();
    }, SEUIL_APPUI_LONG_MS);
  }

  function annulerMinuteur() {
    if (minuteurRef.current) {
      clearTimeout(minuteurRef.current);
      minuteurRef.current = null;
    }
  }

  function demarrerSequence() {
    if (enSequence) return;
    if (!lireSupportVocalClient()) {
      declencheRef.current = false;
      return;
    }
    annuleRef.current = false;
    navigator.vibrate?.(50);
    setEnSequence(true);
    lireTexteAVoixHaute("Je t'écoute", () => {}, demarrerEcouteQuestion);
  }

  function demarrerEcouteQuestion() {
    if (annuleRef.current) return;

    const recognition = creerReconnaissanceVocale();
    if (!recognition) {
      setEnSequence(false);
      return;
    }
    recognitionRef.current = recognition;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        router.push(`/ely?q=${encodeURIComponent(transcript)}`);
      }
    };
    recognition.onerror = () => {
      if (!annuleRef.current) {
        lireTexteAVoixHaute("Je n'ai pas compris, réessaie.", () => {}, () => {});
      }
    };
    recognition.onend = () => {
      setEnSequence(false);
      recognitionRef.current = null;
    };
    recognition.start();
  }

  function annulerSequence() {
    annuleRef.current = true;
    couperLecture();
    recognitionRef.current?.stop();
    setEnSequence(false);
  }

  function handleClick(e: MouseEvent) {
    if (declencheRef.current) {
      e.preventDefault();
      declencheRef.current = false;
      return;
    }
    if (enSequence) {
      e.preventDefault();
      annulerSequence();
    }
  }

  return (
    <Link
      href="/ely"
      onPointerDown={demarrerMinuteur}
      onPointerUp={annulerMinuteur}
      onPointerLeave={annulerMinuteur}
      onClick={handleClick}
      aria-current={actif ? "page" : undefined}
      className={`flex w-14 flex-col items-center gap-1 py-1 text-[11px] font-medium transition-colors ${
        actif ? "text-brand-violet" : "text-navy/40"
      }`}
    >
      <IconeEly />
      Ely
    </Link>
  );
}
