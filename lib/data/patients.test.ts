import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("getPatients", () => {
  it("mappe les patients triés par nom", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () =>
              Promise.resolve({
                data: [
                  {
                    id: "p1",
                    nom_complet: "Mme Dupont",
                    adresse: "12 rue des Lilas",
                    telephone: "0601020304",
                    allergies: null,
                    consignes: null,
                    date_naissance: null,
                    numero_secu: null,
                    sexe: null,
                    medecin_nom: null,
                    medecin_telephone: null,
                    personne_confiance_nom: null,
                    personne_confiance_telephone: null,
                    note_soin: null,
                    antecedents: null,
                    traitements_en_cours: null,
                  },
                ],
                error: null,
              }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getPatients } = await import("./patients");
    const patients = await getPatients(fakeClient, "u1");

    expect(patients).toEqual([
      {
        id: "p1",
        nomComplet: "Mme Dupont",
        adresse: "12 rue des Lilas",
        telephone: "0601020304",
        allergies: null,
        consignes: null,
        dateNaissance: null,
        numeroSecu: null,
        sexe: null,
        medecinNom: null,
        medecinTelephone: null,
        personneConfianceNom: null,
        personneConfianceTelephone: null,
        noteSoin: null,
        antecedents: null,
        traitementsEnCours: null,
      },
    ]);
  });

  it("retourne un tableau vide si aucun patient", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: null, error: { message: "boom" } }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getPatients } = await import("./patients");
    const patients = await getPatients(fakeClient, "u1");

    expect(patients).toEqual([]);
  });
});

describe("getPatient", () => {
  it("mappe la fiche patient complète", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: {
                  id: "p1",
                  nom_complet: "Mme Dupont",
                  adresse: "12 rue des Lilas",
                  telephone: "0601020304",
                  allergies: "Pénicilline",
                  consignes: "Sonner au portail",
                  date_naissance: "1950-03-12",
                  numero_secu: "1500375123456",
                  sexe: "femme",
                  medecin_nom: "Dr Martin",
                  medecin_telephone: "0102030405",
                  personne_confiance_nom: "M. Dupont",
                  personne_confiance_telephone: "0605040302",
                  note_soin: "Pansement quotidien",
                  antecedents: "Diabète type 2",
                  traitements_en_cours: "Metformine",
                },
                error: null,
              }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getPatient } = await import("./patients");
    const patient = await getPatient(fakeClient, "p1");

    expect(patient).toEqual({
      id: "p1",
      nomComplet: "Mme Dupont",
      adresse: "12 rue des Lilas",
      telephone: "0601020304",
      allergies: "Pénicilline",
      consignes: "Sonner au portail",
      dateNaissance: "1950-03-12",
      numeroSecu: "1500375123456",
      sexe: "femme",
      medecinNom: "Dr Martin",
      medecinTelephone: "0102030405",
      personneConfianceNom: "M. Dupont",
      personneConfianceTelephone: "0605040302",
      noteSoin: "Pansement quotidien",
      antecedents: "Diabète type 2",
      traitementsEnCours: "Metformine",
    });
  });

  it("retourne null si le patient n'existe pas", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getPatient } = await import("./patients");
    const patient = await getPatient(fakeClient, "inconnu");

    expect(patient).toBeNull();
  });
});

describe("getSoinsPrescrits", () => {
  it("mappe les soins prescrits, actifs et arrêtés", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () =>
              Promise.resolve({
                data: [
                  {
                    id: "s1",
                    patient_id: "p1",
                    type_soin: "Pansement",
                    frequence_type: "jours_semaine",
                    jours_semaine: [1, 3, 5],
                    intervalle_jours: null,
                    heures: ["10:00:00"],
                    date_debut: "2026-07-01",
                    date_fin: null,
                    actif: true,
                  },
                  {
                    id: "s2",
                    patient_id: "p1",
                    type_soin: "Injection",
                    frequence_type: "quotidien",
                    jours_semaine: null,
                    intervalle_jours: null,
                    heures: ["08:00:00"],
                    date_debut: "2026-06-01",
                    date_fin: "2026-06-30",
                    actif: false,
                  },
                ],
                error: null,
              }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const { getSoinsPrescrits } = await import("./patients");
    const soins = await getSoinsPrescrits(fakeClient, "p1");

    expect(soins).toEqual([
      {
        id: "s1",
        patientId: "p1",
        typeSoin: "Pansement",
        frequenceType: "jours_semaine",
        joursSemaine: [1, 3, 5],
        intervalleJours: null,
        heures: ["10:00:00"],
        dateDebut: "2026-07-01",
        dateFin: null,
        actif: true,
      },
      {
        id: "s2",
        patientId: "p1",
        typeSoin: "Injection",
        frequenceType: "quotidien",
        joursSemaine: null,
        intervalleJours: null,
        heures: ["08:00:00"],
        dateDebut: "2026-06-01",
        dateFin: "2026-06-30",
        actif: false,
      },
    ]);
  });
});
