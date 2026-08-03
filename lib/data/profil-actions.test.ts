import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const updateUserMock = vi.fn();
const uploadMock = vi.fn();
const storageFromMock = vi.fn(() => ({ upload: uploadMock }));
const selectApresUpdateMock = vi.fn();
const eqMock = vi.fn(() => ({ select: selectApresUpdateMock }));
const updateMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ update: updateMock }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser: getUserMock, updateUser: updateUserMock },
    storage: { from: storageFromMock },
    from: fromMock,
  }),
}));

// Le géocodage part sur le réseau : le feindre garde ces tests hors ligne.
const geocoderMock = vi.fn().mockResolvedValue(null);
vi.mock("@/lib/geocodage", () => ({ geocoderAdresse: geocoderMock }));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("uploadAvatarAction", () => {
  it("envoie la photo, met à jour les métadonnées utilisateur et invalide le cache", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    uploadMock.mockResolvedValue({ data: { path: "u1/avatar.jpg" }, error: null });
    updateUserMock.mockResolvedValue({ data: {}, error: null });

    const { uploadAvatarAction } = await import("./profil-actions");
    const { revalidatePath } = await import("next/cache");

    const photo = new File(["contenu"], "moi.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.set("photo", photo);

    await uploadAvatarAction(formData);

    expect(storageFromMock).toHaveBeenCalledWith("avatars");
    expect(uploadMock).toHaveBeenCalledWith("u1/avatar.jpg", photo, { upsert: true, contentType: "image/jpeg" });
    expect(updateUserMock).toHaveBeenCalledWith({ data: { avatar_path: "u1/avatar.jpg" } });
    expect(revalidatePath).toHaveBeenCalledWith("/compte");
  });

  it("ne fait rien si aucun fichier n'est fourni", async () => {
    const { uploadAvatarAction } = await import("./profil-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();

    await uploadAvatarAction(formData);

    expect(uploadMock).not.toHaveBeenCalled();
    expect(updateUserMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("ne fait rien si l'utilisateur n'est pas authentifié", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });

    const { uploadAvatarAction } = await import("./profil-actions");
    const { revalidatePath } = await import("next/cache");

    const photo = new File(["contenu"], "moi.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.set("photo", photo);

    await uploadAvatarAction(formData);

    expect(uploadMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("ne met rien à jour si l'envoi Storage échoue", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    uploadMock.mockResolvedValue({ data: null, error: { message: "boom" } });

    const { uploadAvatarAction } = await import("./profil-actions");
    const { revalidatePath } = await import("next/cache");

    const photo = new File(["contenu"], "moi.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.set("photo", photo);

    await uploadAvatarAction(formData);

    expect(updateUserMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("enregistrerCabinetAction", () => {
  it("enregistre un code postal valide et rafraîchit la tournée", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    selectApresUpdateMock.mockResolvedValue({ data: [{ id: "u1" }], error: null });

    const { enregistrerCabinetAction } = await import("./profil-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("codePostal", "97110");
    await enregistrerCabinetAction(formData);

    expect(fromMock).toHaveBeenCalledWith("profiles");
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ code_postal: "97110" }));
    expect(eqMock).toHaveBeenCalledWith("id", "u1");
    // Les montants affichés dépendent de la zone : la tournée doit se refaire.
    expect(revalidatePath).toHaveBeenCalledWith("/ma-tournee");
  });

  it("efface le code postal quand le champ est vidé", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    selectApresUpdateMock.mockResolvedValue({ data: [{ id: "u1" }], error: null });

    const { enregistrerCabinetAction } = await import("./profil-actions");

    const formData = new FormData();
    formData.set("codePostal", "  ");
    await enregistrerCabinetAction(formData);

    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ code_postal: null }));
  });

  it("n'enregistre rien d'une saisie qui n'est pas un code postal", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });

    const { enregistrerCabinetAction } = await import("./profil-actions");

    const formData = new FormData();
    formData.set("codePostal", "971");
    await enregistrerCabinetAction(formData);

    // Enregistrer « 971 » rangerait le cabinet en métropole sans le dire, et
    // fausserait tous les montants en silence.
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("ne fait rien sans utilisateur connecté", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });

    const { enregistrerCabinetAction } = await import("./profil-actions");

    const formData = new FormData();
    formData.set("codePostal", "75001");
    await enregistrerCabinetAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("adresse du cabinet", () => {
  it("géocode l'adresse et enregistre sa position", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    selectApresUpdateMock.mockResolvedValue({ data: [{ id: "u1" }], error: null });
    geocoderMock.mockResolvedValueOnce({ latitude: 16.2415, longitude: -61.5343 });

    const { enregistrerCabinetAction } = await import("./profil-actions");

    const formData = new FormData();
    formData.set("codePostal", "97110");
    formData.set("adresseCabinet", "15 rue Schoelcher, 97110 Pointe-à-Pitre");
    await enregistrerCabinetAction(formData);

    expect(updateMock).toHaveBeenCalledWith({
      code_postal: "97110",
      adresse_cabinet: "15 rue Schoelcher, 97110 Pointe-à-Pitre",
      cabinet_latitude: 16.2415,
      cabinet_longitude: -61.5343,
    });
  });

  it("efface la position quand l'adresse n'est plus localisable", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    selectApresUpdateMock.mockResolvedValue({ data: [{ id: "u1" }], error: null });
    geocoderMock.mockResolvedValueOnce(null);

    const { enregistrerCabinetAction } = await import("./profil-actions");

    const formData = new FormData();
    formData.set("codePostal", "97110");
    formData.set("adresseCabinet", "adresse illisible");
    await enregistrerCabinetAction(formData);

    // Garder l'ancienne position ferait partir les trajets d'un point qui
    // n'est plus le cabinet, sans que rien ne le dise.
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ cabinet_latitude: null, cabinet_longitude: null })
    );
  });

  it("n'interroge pas le géocodeur pour une adresse vidée", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    selectApresUpdateMock.mockResolvedValue({ data: [{ id: "u1" }], error: null });
    geocoderMock.mockClear();

    const { enregistrerCabinetAction } = await import("./profil-actions");

    const formData = new FormData();
    formData.set("codePostal", "75001");
    formData.set("adresseCabinet", "  ");
    await enregistrerCabinetAction(formData);

    expect(geocoderMock).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ adresse_cabinet: null, cabinet_latitude: null })
    );
  });
});

describe("enregistrerCabinetAction — ce que l'écran doit dire", () => {
  it("refuse un code postal incomplet en le disant", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });

    const { enregistrerCabinetAction } = await import("./profil-actions");

    const formData = new FormData();
    formData.set("codePostal", "9711");
    formData.set("adresseCabinet", "15 rue Schoelcher");
    const resultat = await enregistrerCabinetAction(formData);

    // Auparavant l'action abandonnait tout en silence, adresse comprise : les
    // champs revenaient vides sans que rien n'explique pourquoi.
    expect(resultat.succes).toBe(false);
    expect(resultat.erreur).toMatch(/cinq chiffres/);
  });

  it("tolère les espaces d'une saisie au doigt", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    selectApresUpdateMock.mockResolvedValue({ data: [{ id: "u1" }], error: null });

    const { enregistrerCabinetAction } = await import("./profil-actions");

    const formData = new FormData();
    formData.set("codePostal", "97 110");
    const resultat = await enregistrerCabinetAction(formData);

    expect(resultat.succes).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ code_postal: "97110" }));
  });

  it("signale un profil introuvable plutôt qu'un faux succès", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    // Un update qui ne trouve aucune ligne ne lève pas d'erreur : sans cette
    // vérification, l'écran annoncerait un enregistrement qui n'a pas eu lieu.
    selectApresUpdateMock.mockResolvedValue({ data: [], error: null });

    const { enregistrerCabinetAction } = await import("./profil-actions");

    const formData = new FormData();
    formData.set("codePostal", "97110");
    const resultat = await enregistrerCabinetAction(formData);

    expect(resultat.succes).toBe(false);
    expect(resultat.erreur).toMatch(/profil est introuvable/);
  });

  it("prévient quand l'adresse est enregistrée mais non localisée", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    selectApresUpdateMock.mockResolvedValue({ data: [{ id: "u1" }], error: null });
    geocoderMock.mockResolvedValueOnce(null);

    const { enregistrerCabinetAction } = await import("./profil-actions");

    const formData = new FormData();
    formData.set("codePostal", "97110");
    formData.set("adresseCabinet", "adresse illisible");
    const resultat = await enregistrerCabinetAction(formData);

    // Succès partiel : la fiche est à jour, mais les kilomètres ne suivront pas.
    expect(resultat.succes).toBe(true);
    expect(resultat.erreur).toMatch(/non localisée/);
  });
});
