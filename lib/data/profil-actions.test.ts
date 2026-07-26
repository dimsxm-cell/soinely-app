import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const updateUserMock = vi.fn();
const uploadMock = vi.fn();
const storageFromMock = vi.fn(() => ({ upload: uploadMock }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser: getUserMock, updateUser: updateUserMock },
    storage: { from: storageFromMock },
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
