import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("journaliserEchec", () => {
  it("écrit sur la console d'erreur en portant le contexte et la cause", async () => {
    const espion = vi.spyOn(console, "error").mockImplementation(() => {});

    const { journaliserEchec } = await import("./journal");
    journaliserEchec("getMissionsDuJour", { message: "boom" });

    expect(espion).toHaveBeenCalledTimes(1);
    const [prefixe, contexte, cause] = espion.mock.calls[0];
    expect(prefixe).toContain("soinely");
    expect(contexte).toBe("getMissionsDuJour");
    expect(cause).toEqual({ message: "boom" });
  });
});

describe("echouer", () => {
  it("lève une erreur nommant la lecture concernée", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { echouer } = await import("./journal");

    expect(() => echouer("getPatients", { message: "boom" })).toThrow(/getPatients/);
  });

  it("conserve l'erreur d'origine en cause", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { echouer } = await import("./journal");
    const origine = { code: "PGRST200", message: "relation introuvable" };

    try {
      echouer("getMissionsTourneeVue", origine);
      expect.unreachable("echouer doit lever");
    } catch (erreur) {
      expect((erreur as Error).cause).toBe(origine);
    }
  });

  it("journalise avant de lever", async () => {
    const espion = vi.spyOn(console, "error").mockImplementation(() => {});

    const { echouer } = await import("./journal");

    expect(() => echouer("getPatient", { message: "boom" })).toThrow();
    expect(espion).toHaveBeenCalledTimes(1);
  });
});
