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

describe("createSoinPrescritAction", () => {
  it("crée un soin quotidien avec plusieurs heures", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    singleInsertMock.mockResolvedValue({ data: { id: "s1" }, error: null });

    const { createSoinPrescritAction } = await import("./patients-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("patientId", "p1");
    formData.set("typeSoin", "Glycémie");
    formData.set("frequenceType", "quotidien");
    formData.set("heures", "07:00, 19:00");
    formData.set("dateDebut", "2026-07-15");

    await createSoinPrescritAction(formData);

    expect(fromMock).toHaveBeenCalledWith("soins_prescrits");
    expect(insertMock).toHaveBeenCalledWith({
      patient_id: "p1",
      idel_id: "u1",
      type_soin: "Glycémie",
      frequence_type: "quotidien",
      jours_semaine: null,
      intervalle_jours: null,
      heures: ["07:00", "19:00"],
      date_debut: "2026-07-15",
      date_fin: null,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/patients/p1");
  });

  it("crée un soin à jours de semaine précis avec les jours cochés", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    singleInsertMock.mockResolvedValue({ data: { id: "s2" }, error: null });

    const { createSoinPrescritAction } = await import("./patients-actions");

    const formData = new FormData();
    formData.set("patientId", "p1");
    formData.set("typeSoin", "Pansement");
    formData.set("frequenceType", "jours_semaine");
    formData.append("joursSemaine", "1");
    formData.append("joursSemaine", "3");
    formData.append("joursSemaine", "5");
    formData.set("heures", "10:00");
    formData.set("dateDebut", "2026-07-15");

    await createSoinPrescritAction(formData);

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ jours_semaine: [1, 3, 5], intervalle_jours: null })
    );
  });

  it("crée un soin tous les X jours avec l'intervalle", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    singleInsertMock.mockResolvedValue({ data: { id: "s3" }, error: null });

    const { createSoinPrescritAction } = await import("./patients-actions");

    const formData = new FormData();
    formData.set("patientId", "p1");
    formData.set("typeSoin", "Pansement");
    formData.set("frequenceType", "tous_les_x_jours");
    formData.set("intervalleJours", "2");
    formData.set("heures", "10:00");
    formData.set("dateDebut", "2026-07-15");

    await createSoinPrescritAction(formData);

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ intervalle_jours: 2, jours_semaine: null })
    );
  });

  it("crée un soin ponctuel", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    singleInsertMock.mockResolvedValue({ data: { id: "s4" }, error: null });

    const { createSoinPrescritAction } = await import("./patients-actions");

    const formData = new FormData();
    formData.set("patientId", "p1");
    formData.set("typeSoin", "Prise de sang");
    formData.set("frequenceType", "ponctuel");
    formData.set("heures", "08:30");
    formData.set("dateDebut", "2026-07-20");

    await createSoinPrescritAction(formData);

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ frequence_type: "ponctuel", date_debut: "2026-07-20" })
    );
  });

  it("rejette une date de fin antérieure à la date de début", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });

    const { createSoinPrescritAction } = await import("./patients-actions");

    const formData = new FormData();
    formData.set("patientId", "p1");
    formData.set("typeSoin", "Pansement");
    formData.set("frequenceType", "quotidien");
    formData.set("heures", "10:00");
    formData.set("dateDebut", "2026-07-15");
    formData.set("dateFin", "2026-07-01");

    await createSoinPrescritAction(formData);

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejette un soin jours_semaine sans aucun jour coché", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });

    const { createSoinPrescritAction } = await import("./patients-actions");

    const formData = new FormData();
    formData.set("patientId", "p1");
    formData.set("typeSoin", "Pansement");
    formData.set("frequenceType", "jours_semaine");
    formData.set("heures", "10:00");
    formData.set("dateDebut", "2026-07-15");

    await createSoinPrescritAction(formData);

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejette un format d'heure invalide", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });

    const { createSoinPrescritAction } = await import("./patients-actions");

    const formData = new FormData();
    formData.set("patientId", "p1");
    formData.set("typeSoin", "Pansement");
    formData.set("frequenceType", "quotidien");
    formData.set("heures", "pas une heure");
    formData.set("dateDebut", "2026-07-15");

    await createSoinPrescritAction(formData);

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejette une heure hors plage (99:99)", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });

    const { createSoinPrescritAction } = await import("./patients-actions");

    const formData = new FormData();
    formData.set("patientId", "p1");
    formData.set("typeSoin", "Pansement");
    formData.set("frequenceType", "quotidien");
    formData.set("heures", "99:99");
    formData.set("dateDebut", "2026-07-15");

    await createSoinPrescritAction(formData);

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("ne revalide pas le cache si l'insertion échoue", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    singleInsertMock.mockResolvedValue({ data: null, error: { message: "boom" } });

    const { createSoinPrescritAction } = await import("./patients-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("patientId", "p1");
    formData.set("typeSoin", "Pansement");
    formData.set("frequenceType", "quotidien");
    formData.set("heures", "10:00");
    formData.set("dateDebut", "2026-07-15");

    await createSoinPrescritAction(formData);

    expect(insertMock).toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("arreterSoinPrescritAction", () => {
  it("passe le soin à inactif et invalide le cache", async () => {
    eqUpdateMock.mockResolvedValue({ error: null });

    const { arreterSoinPrescritAction } = await import("./patients-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("soinId", "s1");
    formData.set("patientId", "p1");

    await arreterSoinPrescritAction(formData);

    expect(fromMock).toHaveBeenCalledWith("soins_prescrits");
    expect(updateMock).toHaveBeenCalledWith({ actif: false });
    expect(eqUpdateMock).toHaveBeenCalledWith("id", "s1");
    expect(revalidatePath).toHaveBeenCalledWith("/patients/p1");
  });
});
