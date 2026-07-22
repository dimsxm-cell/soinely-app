import { afterEach, describe, expect, it, vi } from "vitest";
import {
  acquerirMicrophone,
  acquerirMicrophoneForce,
  relacherMicrophone,
  _reinitialiserVerrouPourTests,
} from "./verrou-microphone";

afterEach(() => {
  _reinitialiserVerrouPourTests();
});

describe("verrou-microphone", () => {
  it("acquiert le micro quand il est libre", () => {
    const liberer = vi.fn();
    expect(acquerirMicrophone("dictee", liberer)).toBe(true);
  });

  it("refuse l'acquisition si déjà détenu par un autre propriétaire", () => {
    acquerirMicrophone("ecoute-fond", vi.fn());
    expect(acquerirMicrophone("dictee", vi.fn())).toBe(false);
  });

  it("relâche le micro pour son propriétaire", () => {
    acquerirMicrophone("dictee", vi.fn());
    relacherMicrophone("dictee");
    expect(acquerirMicrophone("ecoute-fond", vi.fn())).toBe(true);
  });

  it("ne relâche pas le micro d'un autre propriétaire", () => {
    acquerirMicrophone("ecoute-fond", vi.fn());
    relacherMicrophone("dictee");
    expect(acquerirMicrophone("dictee", vi.fn())).toBe(false);
  });

  it("l'acquisition forcée appelle le rappel de libération du détenteur précédent", () => {
    const liberer = vi.fn();
    acquerirMicrophone("ecoute-fond", liberer);
    acquerirMicrophoneForce("declenchement-manuel", vi.fn());
    expect(liberer).toHaveBeenCalledTimes(1);
  });

  it("l'acquisition forcée réussit même si le micro est déjà détenu", () => {
    acquerirMicrophone("ecoute-fond", vi.fn());
    acquerirMicrophoneForce("declenchement-manuel", vi.fn());
    expect(acquerirMicrophone("dictee", vi.fn())).toBe(false);
  });

  it("l'acquisition forcée fonctionne aussi quand le micro est déjà libre", () => {
    const liberer = vi.fn();
    acquerirMicrophoneForce("declenchement-manuel", liberer);
    expect(liberer).not.toHaveBeenCalled();
    expect(acquerirMicrophone("dictee", vi.fn())).toBe(false);
  });

  it("l'ancien détenteur ne peut plus relâcher après une acquisition forcée par un autre", () => {
    acquerirMicrophone("ecoute-fond", vi.fn());
    acquerirMicrophoneForce("declenchement-manuel", vi.fn());
    relacherMicrophone("ecoute-fond");
    expect(acquerirMicrophone("dictee", vi.fn())).toBe(false);
  });
});
