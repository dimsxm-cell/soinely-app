import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const uploadMock = vi.fn();
const removeMock = vi.fn();
const storageFromMock = vi.fn(() => ({ upload: uploadMock, remove: removeMock }));

const maybeSingleMock = vi.fn();
const insertMock = vi.fn();
const fromMock = vi.fn(() => ({
  select: () => ({ eq: () => ({ maybeSingle: maybeSingleMock }) }),
  insert: insertMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser: getUserMock },
    storage: { from: storageFromMock },
    from: fromMock,
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  maybeSingleMock.mockResolvedValue({ data: { id: "p1" }, error: null });
  uploadMock.mockResolvedValue({ error: null });
  insertMock.mockResolvedValue({ error: null });
});

function formulaire(fichier: File | null, champs: Record<string, string> = {}): FormData {
  const formData = new FormData();
  formData.set("patientId", "p1");
  if (fichier) formData.set("fichier", fichier);
  for (const [cle, valeur] of Object.entries(champs)) formData.set(cle, valeur);
  return formData;
}

function photo(type = "image/jpeg", octets = 1000, nom = "ordonnance.jpg"): File {
  return new File([new Uint8Array(octets)], nom, { type });
}

describe("ajouterOrdonnanceAction", () => {
  it("envoie le fichier et enregistre la ligne", async () => {
    const { ajouterOrdonnanceAction } = await import("./ordonnances-actions");

    const resultat = await ajouterOrdonnanceAction(
      formulaire(photo(), { datePrescription: "2026-08-01", note: "Dr Martin" })
    );

    expect(resultat.succes).toBe(true);
    expect(storageFromMock).toHaveBeenCalledWith("ordonnances");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        patient_id: "p1",
        idel_id: "u1",
        date_prescription: "2026-08-01",
        note: "Dr Martin",
      })
    );
  });

  it("range le fichier sous l'identifiant de l'IDEL, que la sécurité vérifie", async () => {
    const { ajouterOrdonnanceAction } = await import("./ordonnances-actions");

    await ajouterOrdonnanceAction(formulaire(photo()));

    // Le premier segment du chemin est ce que la politique du bucket contrôle :
    // le changer ouvrirait les ordonnances d'une IDEL à une autre.
    const chemin = String(uploadMock.mock.calls[0][0]);
    expect(chemin.startsWith("u1/p1/")).toBe(true);
  });

  it("refuse un format que le bucket n'accepte pas", async () => {
    const { ajouterOrdonnanceAction } = await import("./ordonnances-actions");

    const resultat = await ajouterOrdonnanceAction(
      formulaire(photo("application/msword", 1000, "ordonnance.doc"))
    );

    expect(resultat.succes).toBe(false);
    expect(resultat.erreur).toMatch(/Format accepté/);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("refuse un fichier de plus de dix mégaoctets", async () => {
    const { ajouterOrdonnanceAction } = await import("./ordonnances-actions");

    const resultat = await ajouterOrdonnanceAction(
      formulaire(photo("image/jpeg", 11 * 1024 * 1024))
    );

    expect(resultat.succes).toBe(false);
    expect(resultat.erreur).toMatch(/trop lourd/);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("réclame un fichier quand aucun n'est joint", async () => {
    const { ajouterOrdonnanceAction } = await import("./ordonnances-actions");

    const resultat = await ajouterOrdonnanceAction(formulaire(null));

    expect(resultat.succes).toBe(false);
    expect(resultat.erreur).toMatch(/Choisissez une photo/);
  });

  it("retire le fichier envoyé quand l'enregistrement échoue", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    insertMock.mockResolvedValue({ error: { message: "colonne absente" } });

    const { ajouterOrdonnanceAction } = await import("./ordonnances-actions");

    const resultat = await ajouterOrdonnanceAction(formulaire(photo()));

    // Sans ce retrait, le fichier resterait dans le bucket sans qu'aucune
    // ligne ne le désigne : invisible, et impossible à supprimer.
    expect(resultat.succes).toBe(false);
    expect(removeMock).toHaveBeenCalled();
  });

  it("n'enregistre rien quand le patient n'appartient pas à l'IDEL", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });

    const { ajouterOrdonnanceAction } = await import("./ordonnances-actions");

    const resultat = await ajouterOrdonnanceAction(formulaire(photo()));

    expect(resultat.succes).toBe(false);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("ne fait rien sans utilisatrice connectée", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });

    const { ajouterOrdonnanceAction } = await import("./ordonnances-actions");

    const resultat = await ajouterOrdonnanceAction(formulaire(photo()));

    expect(resultat.succes).toBe(false);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("accepte un PDF, forme courante d'une ordonnance transmise par mail", async () => {
    const { ajouterOrdonnanceAction } = await import("./ordonnances-actions");

    const resultat = await ajouterOrdonnanceAction(
      formulaire(photo("application/pdf", 2000, "ordonnance.pdf"))
    );

    expect(resultat.succes).toBe(true);
  });
});

describe("les deux champs de dépôt", () => {
  it("accepte un fichier venu du bouton « Choisir un fichier »", async () => {
    const { ajouterOrdonnanceAction } = await import("./ordonnances-actions");

    // Le champ de l'appareil photo reste vide quand on joint un PDF déjà
    // enregistré : c'est l'autre qui porte le fichier.
    const formData = new FormData();
    formData.set("patientId", "p1");
    formData.set("fichierJoint", photo("application/pdf", 2000, "ordo.pdf"));

    const resultat = await ajouterOrdonnanceAction(formData);

    expect(resultat.succes).toBe(true);
    expect(uploadMock).toHaveBeenCalled();
  });

  it("retient la photo quand les deux champs sont remplis", async () => {
    const { ajouterOrdonnanceAction } = await import("./ordonnances-actions");

    const formData = new FormData();
    formData.set("patientId", "p1");
    formData.set("fichier", photo("image/jpeg", 3000, "photo.jpg"));
    formData.set("fichierJoint", photo("application/pdf", 2000, "ordo.pdf"));

    await ajouterOrdonnanceAction(formData);

    // Le geste le plus récent l'emporte : on vient de prendre la photo.
    expect(String(uploadMock.mock.calls[0][0])).toMatch(/\.jpg$/);
  });

  it("réclame un fichier quand les deux champs sont vides", async () => {
    const { ajouterOrdonnanceAction } = await import("./ordonnances-actions");

    const formData = new FormData();
    formData.set("patientId", "p1");

    const resultat = await ajouterOrdonnanceAction(formData);

    expect(resultat.succes).toBe(false);
    expect(resultat.erreur).toMatch(/Choisissez une photo/);
  });
});
