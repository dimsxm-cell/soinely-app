import { describe, expect, it, vi } from "vitest";
import { getAllFichesDossierSoins, getFicheDossierDetail, SECTIONS_DOSSIER_SOINS } from "./dossierSoins";

function buildRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    section: "protocoles_urgence",
    titre: "Douleur — conduite à tenir",
    resume: "Résumé de test",
    contenu: [{ titre: "Bloc", items: ["item 1", "item 2"] }],
    sources: ["HAS"],
    ordre: 1,
    niveau_confiance: "valide",
    version: 1,
    published: true,
    created_at: "2026-07-19T00:00:00Z",
    updated_at: "2026-07-19T00:00:00Z",
    ...overrides,
  };
}

function buildSupabaseStub(rows: ReturnType<typeof buildRow>[], singleRow: ReturnType<typeof buildRow> | null = null) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          // getAllFichesDossierSoins chains .order("section").order("ordre") —
          // the first order() must return an object with a second order()
          // that resolves, not resolve directly itself.
          order: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: rows, error: null })),
          })),
          // getFicheDossierDetail chains .eq("id", id).eq("published", true).maybeSingle()
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: singleRow, error: null })),
          })),
        })),
      })),
    })),
  };
}

describe("SECTIONS_DOSSIER_SOINS", () => {
  it("lists all 9 sections in binder order", () => {
    expect(SECTIONS_DOSSIER_SOINS.map((s) => s.valeur)).toEqual([
      "identification_patient",
      "traitements",
      "surveillance_clinique",
      "protocoles_urgence",
      "transmissions_infirmieres",
      "prescriptions_liaisons_medicales",
      "administratif",
      "allergies_alertes",
      "contacts_utiles",
    ]);
  });
});

describe("getAllFichesDossierSoins", () => {
  it("maps rows to camelCase FicheDossierSoin, ordered by section then ordre", async () => {
    const rows = [buildRow(), buildRow({ id: "22222222-2222-2222-2222-222222222222", ordre: 2 })];
    const supabase = buildSupabaseStub(rows) as unknown as Parameters<typeof getAllFichesDossierSoins>[0];

    const result = await getAllFichesDossierSoins(supabase);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      section: "protocoles_urgence",
      titre: "Douleur — conduite à tenir",
      resume: "Résumé de test",
      contenu: [{ titre: "Bloc", items: ["item 1", "item 2"] }],
      sources: ["HAS"],
      ordre: 1,
      niveauConfiance: "valide",
      version: 1,
      published: true,
    });
  });

  it("returns an empty array when no fiche is published", async () => {
    const supabase = buildSupabaseStub([]) as unknown as Parameters<typeof getAllFichesDossierSoins>[0];

    const result = await getAllFichesDossierSoins(supabase);

    expect(result).toEqual([]);
  });
});

describe("getFicheDossierDetail", () => {
  it("returns the mapped fiche when found and published", async () => {
    const row = buildRow();
    const supabase = buildSupabaseStub([], row) as unknown as Parameters<typeof getFicheDossierDetail>[0];

    const result = await getFicheDossierDetail(supabase, row.id);

    expect(result?.id).toBe(row.id);
    expect(result?.titre).toBe(row.titre);
  });

  it("returns null when not found", async () => {
    const supabase = buildSupabaseStub([], null) as unknown as Parameters<typeof getFicheDossierDetail>[0];

    const result = await getFicheDossierDetail(supabase, "does-not-exist");

    expect(result).toBeNull();
  });
});
