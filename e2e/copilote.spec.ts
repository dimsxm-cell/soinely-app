import { test, expect } from "@playwright/test";

test("redirige /copilote vers /login", async ({ page }) => {
  await page.goto("/copilote");
  await expect(page).toHaveURL(/\/login/);
});
