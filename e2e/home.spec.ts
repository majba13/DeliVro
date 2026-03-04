import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads and shows hero section", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/DeliVro/);
    await expect(page.getByRole("heading", { name: /faster & smarter/i })).toBeVisible();
  });

  test("navigation links are present", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Shop Now" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Become a Seller" })).toBeVisible();
  });

  test("sign in link navigates to login", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("footer shows legal links", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Terms of Service" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Privacy Policy" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Refund & Return" }).or(page.getByRole("link", { name: "Refunds" }))).toBeVisible();
  });
});
