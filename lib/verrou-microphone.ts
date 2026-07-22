export type ProprietaireMicrophone = "ecoute-fond" | "declenchement-manuel" | "dictee";

interface Detenteur {
  proprietaire: ProprietaireMicrophone;
  liberer: () => void;
}

let detenteurActuel: Detenteur | null = null;

export function acquerirMicrophone(proprietaire: ProprietaireMicrophone, liberer: () => void): boolean {
  if (detenteurActuel !== null) return false;
  detenteurActuel = { proprietaire, liberer };
  return true;
}

export function acquerirMicrophoneForce(proprietaire: ProprietaireMicrophone, liberer: () => void): void {
  detenteurActuel?.liberer();
  detenteurActuel = { proprietaire, liberer };
}

export function relacherMicrophone(proprietaire: ProprietaireMicrophone): void {
  if (detenteurActuel?.proprietaire === proprietaire) {
    detenteurActuel = null;
  }
}

export function _reinitialiserVerrouPourTests(): void {
  detenteurActuel = null;
}
