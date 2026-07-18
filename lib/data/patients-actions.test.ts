import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const singleInsertMock = vi.fn();
const selectAfterInsertMock = vi.fn(() => ({ single: singleInsertMock }));
const insertMock = vi.fn(() => ({ select: selectAfterInsertMock }));
const eqUpdateMock = vi.fn();
const updateMock = vi.fn(() => ({ eq: eqUpdateMock }));
const fromMock = vi.fn(() => ({ insert: insertMock, update: updateMock }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const redirectMock = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createPatientAction", () => {
  it("crée le patient avec tous les champs et redirige vers sa fiche", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    singleInsertMock.mockResolvedValue({ data: { id: "p1" }, error: null });

    const { createPatientAction } = await import("./patients-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("nomComplet", "Mme Dupont");
    formData.set("adresse", "12 rue des Lilas");
    formData.set("telephone", "0601020304");
    formData.set("dateNaissance", "1950-03-12");
    formData.set("allergies", "Pénicilline");
    formData.set("medecinNom", "Dr Martin");

    await createPatientAction(formData);

    expect(fromMock).toHaveBeenCalledWith("patients");
    expect(insertMock).toHaveBeenCalledWith({
      idel_id: "u1",
      nom_complet: "Mme Dupont",
      adresse: "12 rue des Lilas",
      telephone: "0601020304",
      date_naissance: "1950-03-12",
      allergies: "Pénicilline",
      consignes: null,
      medecin_nom: "Dr Martin",
      medecin_telephone: null,
      contact_urgence_nom: null,
      contact_urgence_telephone: null,
      antecedents: null,
      traitements_en_cours: null,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/patients");
    expect(redirectMock).toHaveBeenCalledWith("/patients/p1");
  });

  it("ne fait rien si un champ obligatoire est manquant", async () => {
    const { createPatientAction } = await import("./patients-actions");

    const formData = new FormData();
    formData.set("nomComplet", "Mme Dupont");

    await createPatientAction(formData);

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("ne fait rien si l'utilisateur n'est pas authentifié", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const { createPatientAction } = await import("./patients-actions");

    const formData = new FormData();
    formData.set("nomComplet", "Mme Dupont");
    formData.set("adresse", "12 rue des Lilas");
    formData.set("telephone", "0601020304");

    await createPatientAction(formData);

    expect(insertMock).not.toHaveBeenCalled();
  });
});

describe("updatePatientAction", () => {
  it("met à jour tous les champs de la fiche patient et invalide le cache", async () => {
    eqUpdateMock.mockResolvedValue({ error: null });

    const { updatePatientAction } = await import("./patients-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("patientId", "p1");
    formData.set("nomComplet", "Mme Dupont");
    formData.set("adresse", "12 rue des Lilas");
    formData.set("telephone", "0601020304");
    formData.set("medecinNom", "Dr Martin");

    await updatePatientAction(formData);

    expect(fromMock).toHaveBeenCalledWith("patients");
    expect(updateMock).toHaveBeenCalledWith({
      nom_complet: "Mme Dupont",
      adresse: "12 rue des Lilas",
      telephone: "0601020304",
      date_naissance: null,
      allergies: null,
      consignes: null,
      medecin_nom: "Dr Martin",
      medecin_telephone: null,
      contact_urgence_nom: null,
      contact_urgence_telephone: null,
      antecedents: null,
      traitements_en_cours: null,
    });
    expect(eqUpdateMock).toHaveBeenCalledWith("id", "p1");
    expect(revalidatePath).toHaveBeenCalledWith("/patients/p1");
  });

  it("ne fait rien si un champ obligatoire est manquant", async () => {
    const { updatePatientAction } = await import("./patients-actions");

    const formData = new FormData();
    formData.set("patientId", "p1");
    formData.set("nomComplet", "Mme Dupont");

    await updatePatientAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
  });
});
