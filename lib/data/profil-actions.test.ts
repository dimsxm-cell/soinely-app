import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const updateUserMock = vi.fn();
const uploadMock = vi.fn();
const storageFromMock = vi.fn(() => ({ upload: uploadMock }));
const eqMock = vi.fn();
const updateMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ update: updateMock }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser: getUserMock, updateUser: updateUserMock },
    storage: { from: storageFromMock },
    from: fromMock,
  }),
}));

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

describe("enregistrerCodePostalAction", () => {
  it("enregistre un code postal valide et rafraîchit la tournée", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    eqMock.mockResolvedValue({ error: null });

    const { enregistrerCodePostalAction } = await import("./profil-actions");
    const { revalidatePath } = await import("next/cache");

    const formData = new FormData();
    formData.set("codePostal", "97110");
    await enregistrerCodePostalAction(formData);

    expect(fromMock).toHaveBeenCalledWith("profiles");
    expect(updateMock).toHaveBeenCalledWith({ code_postal: "97110" });
    expect(eqMock).toHaveBeenCalledWith("id", "u1");
    // Les montants affichés dépendent de la zone : la tournée doit se refaire.
    expect(revalidatePath).toHaveBeenCalledWith("/ma-tournee");
  });

  it("efface le code postal quand le champ est vidé", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    eqMock.mockResolvedValue({ error: null });

    const { enregistrerCodePostalAction } = await import("./profil-actions");

    const formData = new FormData();
    formData.set("codePostal", "  ");
    await enregistrerCodePostalAction(formData);

    expect(updateMock).toHaveBeenCalledWith({ code_postal: null });
  });

  it("n'enregistre rien d'une saisie qui n'est pas un code postal", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });

    const { enregistrerCodePostalAction } = await import("./profil-actions");

    const formData = new FormData();
    formData.set("codePostal", "971");
    await enregistrerCodePostalAction(formData);

    // Enregistrer « 971 » rangerait le cabinet en métropole sans le dire, et
    // fausserait tous les montants en silence.
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("ne fait rien sans utilisateur connecté", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });

    const { enregistrerCodePostalAction } = await import("./profil-actions");

    const formData = new FormData();
    formData.set("codePostal", "75001");
    await enregistrerCodePostalAction(formData);

    expect(updateMock).not.toHaveBeenCalled();
  });
});
