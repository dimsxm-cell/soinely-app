import { beforeEach, describe, expect, it, vi } from "vitest";

const eqSelectMock = vi.fn();
const selectMock = vi.fn(() => ({ eq: () => ({ maybeSingle: eqSelectMock }) }));
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
    eqUpdateMock.mockResolvedValue({ error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "en_cours");

    await updateMissionStatutAction(formData);

    expect(fromMock).toHaveBeenCalledWith("missions_du_jour");
    expect(updateMock).toHaveBeenCalledWith({ statut: "en_cours" });
    expect(eqUpdateMock).toHaveBeenCalledWith("id", "m1");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee");
    expect(revalidatePath).toHaveBeenCalledWith("/ma-journee/m1");
  });

  it("applique la transition a_faire vers absent et invalide le cache", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "a_faire" }, error: null });
    eqUpdateMock.mockResolvedValue({ error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "absent");

    await updateMissionStatutAction(formData);

    expect(updateMock).toHaveBeenCalledWith({ statut: "absent" });
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

  it("n'applique pas une transition invalide (terminee vers a_faire)", async () => {
    eqSelectMock.mockResolvedValue({ data: { statut: "terminee" }, error: null });

    const { updateMissionStatutAction } = await import("./ma-journee-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("missionId", "m1");
    formData.set("nouveauStatut", "a_faire");

    await updateMissionStatutAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
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
