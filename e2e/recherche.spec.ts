import { test, expect } from "@playwright/test";

test.describe("Recherche (non authentifié)", () => {
  test("redirige /recherche vers /login", async ({ page }) => {
    await page.goto("/recherche");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirige /situations/[id] vers /login", async ({ page }) => {
    await page.goto("/situations/00000000-0000-0000-0000-000000000000");
    await expect(page).toHaveURL(/\/login/);
  });
});
