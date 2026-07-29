import { test, expect } from "@playwright/test";

test("un visiteur non connecté est redirigé de /ma-journee vers /login", async ({ page }) => {
  await page.goto("/ma-journee");
  await expect(page).toHaveURL(/\/login/);
});

test("la page de connexion affiche le formulaire", async ({ page }) => {
  await page.goto("/login");
  // Recherche par label (et non par placeholder) : c'est ce qu'annonce un
  // lecteur d'écran, donc le test échoue si l'association label/champ casse.
  await expect(page.getByLabel("Adresse email")).toBeVisible();
  await expect(page.getByLabel("Mot de passe")).toBeVisible();
  await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
});
