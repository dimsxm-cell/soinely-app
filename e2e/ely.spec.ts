import { test, expect } from "@playwright/test";

test("redirige /ely vers /login", async ({ page }) => {
  await page.goto("/ely");
  await expect(page).toHaveURL(/\/login/);
});
