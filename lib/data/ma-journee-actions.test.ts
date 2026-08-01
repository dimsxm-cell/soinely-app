import { beforeEach, describe, expect, it, vi } from "vitest";

const eqSelectMock = vi.fn();
const selectMock = vi.fn(() => ({ eq: () => ({ maybeSingle: eqSelectMock }) }));
// Deux niveaux de `.eq()` : le premier filtre sur l'id (comme avant), le
// second porte désormais le garde-fou sur le statut. Les actions qui
// n'enchaînent qu'un seul `.eq()` continuent d'utiliser eqUpdateMock seul,
// via mockResolvedValue, exactement comme avant.
const eqUpdateMock2 = vi.fn();
const eqUpdateMock = vi.fn();
const updateMock = vi.fn(() => ({ eq: eqUpdateMock }));
const fromMock = vi.fn(() => ({ select: selectMock, update: updateMock }));
const getUserMock = vi.fn();
const uploadMock = vi.fn();
const storageFromMock = vi.fn(() => ({ upload: uploadMock }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    from: fromMock,
    auth: { getUser: getUserMock },
    storage: { from: storageFromMock },
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateMissionStatutAction", () => {
  it("applique une transition valide (a_faire vers en_cours) et invalide le cache des deux écrans", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "a_faire" }, error: null });
    eqUpdateMock.mockReturnValue({ eq: eqUpdateMock2 });
    eqUpdateMock2.mockResolvedValue({ error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "en_cours");

    await updateMissionStatutAction(formData);

    expect(fromMock).toHaveBeenCalledWith("missions_du_jour");
    expect(updateMock).toHaveBeenCalledWith({ statut: "en_cours" });
    expect(eqUpdateMock).toHaveBeenCalledWith("id", "m1");
    // Le garde-fou porte sur le statut lu avant l'écriture : ferme la fenêtre
    // entre la lecture et la mise à jour.
    expect(eqUpdateMock2).toHaveBeenCalledWith("statut", "a_faire");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee/m1");
  });

  it("applique la transition a_faire vers absent et invalide le cache", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "a_faire" }, error: null });
    eqUpdateMock.mockReturnValue({ eq: eqUpdateMock2 });
    eqUpdateMock2.mockResolvedValue({ error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "absent");

    await updateMissionStatutAction(formData);

    expect(updateMock).toHaveBeenCalledWith({ statut: "absent" });
    expect(eqUpdateMock2).toHaveBeenCalledWith("statut", "a_faire");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee/m1");
  });

  it("n'applique pas absent depuis en_cours", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "en_cours" }, error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "absent");

    await updateMissionStatutAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("n'applique pas absent depuis terminee", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "terminee" }, error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "absent");

    await updateMissionStatutAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("applique une transition valide (en_cours vers terminee) et invalide le cache", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "en_cours" }, error: null });
    eqUpdateMock.mockReturnValue({ eq: eqUpdateMock2 });
    eqUpdateMock2.mockResolvedValue({ error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "terminee");

    await updateMissionStatutAction(formData);

    expect(updateMock).toHaveBeenCalledWith({ statut: "terminee" });
    expect(eqUpdateMock2).toHaveBeenCalledWith("statut", "en_cours");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee/m1");
  });

  it("n'applique pas une transition invalide (a_faire directement vers terminee)", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "a_faire" }, error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "terminee");

    await updateMissionStatutAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("n'applique pas une transition invalide (en_cours vers a_faire)", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "en_cours" }, error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "a_faire");

    await updateMissionStatutAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("n'applique rien si la mission n'existe pas", async () => {
    eqSelectMock.mockResolvedValue({ data: null, error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "inconnue");
    formData.set("nouveauStatut", "en_cours");

    await updateMissionStatutAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("annule une validation en ramenant la mission à « à faire »", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "terminee" }, error: null });
    eqUpdateMock.mockReturnValue({ eq: eqUpdateMock2 });
    eqUpdateMock2.mockResolvedValue({ error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "a_faire");

    await updateMissionStatutAction(formData);

    // Le motif part avec l'absence qu'il expliquait.
    expect(updateMock).toHaveBeenCalledWith({ statut: "a_faire", motif_absence: null });
    expect(eqUpdateMock2).toHaveBeenCalledWith("statut", "terminee");
  });

  it("annule une absence en ramenant la mission à « à faire »", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "absent" }, error: null });
    eqUpdateMock.mockReturnValue({ eq: eqUpdateMock2 });
    eqUpdateMock2.mockResolvedValue({ error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "a_faire");

    await updateMissionStatutAction(formData);

    expect(updateMock).toHaveBeenCalledWith({ statut: "a_faire", motif_absence: null });
    expect(eqUpdateMock2).toHaveBeenCalledWith("statut", "absent");
  });

  it("marque absente une mission à faire, sans toucher au motif", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "a_faire" }, error: null });
    eqUpdateMock.mockReturnValue({ eq: eqUpdateMock2 });
    eqUpdateMock2.mockResolvedValue({ error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "absent");

    await updateMissionStatutAction(formData);

    expect(updateMock).toHaveBeenCalledWith({ statut: "absent" });
    expect(eqUpdateMock2).toHaveBeenCalledWith("statut", "a_faire");
  });

  it("refuse de passer directement de « validé » à « absent »", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "terminee" }, error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "absent");

    await updateMissionStatutAction(formData);

    // La correction passe par « À faire » : deux gestes valent mieux qu'une
    // bascule déclenchée par mégarde.
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("updateConsignesAction", () => {
  it("met à jour les consignes du patient lié à la mission et invalide le cache", async () => {
    eqSelectMock.mockResolvedValue({ data: { patient_id: "p1" }, error: null });
    eqUpdateMock.mockResolvedValue({ error: null });

    const { updateConsignesAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("consignes", "Sonner au portail.");

    await updateConsignesAction(formData);

    expect(fromMock).toHaveBeenCalledWith("missions_du_jour");
    expect(fromMock).toHaveBeenCalledWith("patients");
    expect(updateMock).toHaveBeenCalledWith({ consignes: "Sonner au portail." });
    expect(eqUpdateMock).toHaveBeenCalledWith("id", "p1");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee/m1");
  });

  it("ne fait rien si la mission n'existe pas", async () => {
    eqSelectMock.mockResolvedValue({ data: null, error: null });

    const { updateConsignesAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "inconnue");
    formData.set("consignes", "Peu importe");

    await updateConsignesAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateTransmissionAction", () => {
  it("met à jour la transmission de la mission et invalide le cache", async () => {
    eqSelectMock.mockResolvedValue({ data: { id: "m1" }, error: null });
    eqUpdateMock.mockResolvedValue({ error: null });

    const { updateTransmissionAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("transmission", "RAS, patient stable.");

    await updateTransmissionAction(formData);

    expect(updateMock).toHaveBeenCalledWith({ transmission: "RAS, patient stable." });
    expect(eqUpdateMock).toHaveBeenCalledWith("id", "m1");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee/m1");
  });

  it("ne fait rien si la mission n'existe pas", async () => {
    eqSelectMock.mockResolvedValue({ data: null, error: null });

    const { updateTransmissionAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "inconnue");
    formData.set("transmission", "Peu importe");

    await updateTransmissionAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateRappelAction", () => {
  it("met à jour le rappel de la mission et invalide le cache", async () => {
    eqSelectMock.mockResolvedValue({ data: { id: "m1" }, error: null });
    eqUpdateMock.mockResolvedValue({ error: null });

    const { updateRappelAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("rappel", "Vérifier la cicatrisation dans 3 jours.");

    await updateRappelAction(formData);

    expect(updateMock).toHaveBeenCalledWith({ rappel: "Vérifier la cicatrisation dans 3 jours." });
    expect(eqUpdateMock).toHaveBeenCalledWith("id", "m1");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee/m1");
  });

  it("ne fait rien si la mission n'existe pas", async () => {
    eqSelectMock.mockResolvedValue({ data: null, error: null });

    const { updateRappelAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "inconnue");
    formData.set("rappel", "Peu importe");

    await updateRappelAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("uploadPhotoAction", () => {
  it("envoie la photo, met à jour photo_path et invalide le cache", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    eqSelectMock.mockResolvedValue({ data: { id: "m1" }, error: null });
    uploadMock.mockResolvedValue({ data: { path: "u1/m1.jpg" }, error: null });
    eqUpdateMock.mockResolvedValue({ error: null });

    const { uploadPhotoAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const photo = new File(["contenu"], "plaie.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("photo", photo);

    await uploadPhotoAction(formData);

    expect(storageFromMock).toHaveBeenCalledWith("photos-visites");
    expect(uploadMock).toHaveBeenCalledWith("u1/m1.jpg", photo, { upsert: true, contentType: "image/jpeg" });
    expect(updateMock).toHaveBeenCalledWith({ photo_path: "u1/m1.jpg" });
    expect(eqUpdateMock).toHaveBeenCalledWith("id", "m1");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee/m1");
  });

  it("ne fait rien si aucun fichier n'est fourni", async () => {
    const { uploadPhotoAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");

    await uploadPhotoAction(formData);

    expect(uploadMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("ne fait rien si la mission n'existe pas", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    eqSelectMock.mockResolvedValue({ data: null, error: null });

    const { uploadPhotoAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const photo = new File(["contenu"], "plaie.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.set("missionId", "inconnue");
    formData.set("photo", photo);

    await uploadPhotoAction(formData);

    expect(uploadMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("ne met rien à jour si l'envoi Storage échoue", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    eqSelectMock.mockResolvedValue({ data: { id: "m1" }, error: null });
    uploadMock.mockResolvedValue({ data: null, error: { message: "boom" } });

    const { uploadPhotoAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const photo = new File(["contenu"], "plaie.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("photo", photo);

    await uploadPhotoAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateMotifAbsenceAction", () => {
  it("enregistre le motif sur une mission absente", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "absent" }, error: null });
    eqUpdateMock.mockReturnValue({ eq: eqUpdateMock2 });
    eqUpdateMock2.mockResolvedValue({ error: null });

    const { updateMotifAbsenceAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("motif", "Hospitalisée depuis hier");

    await updateMotifAbsenceAction(formData);

    expect(updateMock).toHaveBeenCalledWith({ motif_absence: "Hospitalisée depuis hier" });
    expect(eqUpdateMock).toHaveBeenCalledWith("id", "m1");
    // Le garde-fou referme la fenêtre entre la relecture du statut et
    // l'écriture du motif.
    expect(eqUpdateMock2).toHaveBeenCalledWith("statut", "absent");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-tournee");
  });

  it("efface le motif quand le champ est vidé", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "absent" }, error: null });
    eqUpdateMock.mockReturnValue({ eq: eqUpdateMock2 });
    eqUpdateMock2.mockResolvedValue({ error: null });

    const { updateMotifAbsenceAction } = await import("./ma-journee-actions");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("motif", "");

    await updateMotifAbsenceAction(formData);

    expect(updateMock).toHaveBeenCalledWith({ motif_absence: null });
  });

  it("efface le motif quand le champ ne contient que des espaces", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "absent" }, error: null });
    eqUpdateMock.mockReturnValue({ eq: eqUpdateMock2 });
    eqUpdateMock2.mockResolvedValue({ error: null });

    const { updateMotifAbsenceAction } = await import("./ma-journee-actions");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("motif", "   ");

    await updateMotifAbsenceAction(formData);

    // Un motif composé uniquement d'espaces ne doit pas survivre : il
    // produirait un encart amber vide, pire qu'aucun encart.
    expect(updateMock).toHaveBeenCalledWith({ motif_absence: null });
  });

  it("n'écrit rien sur une mission qui n'est pas absente", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "terminee" }, error: null });

    const { updateMotifAbsenceAction } = await import("./ma-journee-actions");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("motif", "Hospitalisée");

    await updateMotifAbsenceAction(formData);

    // Un motif ailleurs que sur une absence serait une explication orpheline,
    // qu'aucun écran n'afficherait.
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("n'écrit rien quand la mission est introuvable", async () => {
    eqSelectMock.mockResolvedValue({ data: null, error: null });

    const { updateMotifAbsenceAction } = await import("./ma-journee-actions");

    const formData = new FormData();
    formData.set("missionId", "inconnue");
    formData.set("motif", "Hospitalisée");

    await updateMotifAbsenceAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("updateDistanceAction", () => {
  it("enregistre la distance corrigée", async () => {
    eqSelectMock.mockResolvedValue({ data: { id: "m1" }, error: null });
    eqUpdateMock.mockResolvedValue({ error: null });

    const { updateDistanceAction } = await import("./ma-journee-actions");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("distanceKm", "12.4");
    await updateDistanceAction(formData);

    expect(updateMock).toHaveBeenCalledWith({ distance_km_corrigee: 12.4 });
  });

  it("accepte la virgule d'un clavier français", async () => {
    eqSelectMock.mockResolvedValue({ data: { id: "m1" }, error: null });
    eqUpdateMock.mockResolvedValue({ error: null });

    const { updateDistanceAction } = await import("./ma-journee-actions");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("distanceKm", "12,4");
    await updateDistanceAction(formData);

    expect(updateMock).toHaveBeenCalledWith({ distance_km_corrigee: 12.4 });
  });

  it("rend la main au calcul quand le champ est vidé", async () => {
    eqSelectMock.mockResolvedValue({ data: { id: "m1" }, error: null });
    eqUpdateMock.mockResolvedValue({ error: null });

    const { updateDistanceAction } = await import("./ma-journee-actions");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("distanceKm", "");
    await updateDistanceAction(formData);

    // Null et non zéro : vider le champ annule la correction, il ne supprime
    // pas les kilomètres.
    expect(updateMock).toHaveBeenCalledWith({ distance_km_corrigee: null });
  });

  it("refuse une saisie qui n'est pas un nombre", async () => {
    eqSelectMock.mockResolvedValue({ data: { id: "m1" }, error: null });
    updateMock.mockClear();

    const { updateDistanceAction } = await import("./ma-journee-actions");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("distanceKm", "loin");
    await updateDistanceAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("refuse une distance négative", async () => {
    eqSelectMock.mockResolvedValue({ data: { id: "m1" }, error: null });
    updateMock.mockClear();

    const { updateDistanceAction } = await import("./ma-journee-actions");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("distanceKm", "-3");
    await updateDistanceAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
  });
});
