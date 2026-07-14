import { test, expect } from "@playwright/test";

test("un visiteur non connecté est redirigé de /ma-journee vers /login", async ({ page }) => {
  await page.goto("/ma-journee");
  await expect(page).toHaveURL(/\/login/);
});

test("la page de connexion affiche le formulaire", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByPlaceholder("Adresse email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
});
