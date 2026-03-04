import { test, expect } from "@playwright/test";

test.describe("Products page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/products");
  });

  test("shows product grid", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
    // At least demo products should load
    await expect(page.locator(".grid > div").first()).toBeVisible({ timeout: 10_000 });
  });

  test("search filters products", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Search products…");
    await searchInput.fill("salmon");
    await expect(page.getByText(/Fresh Atlantic Salmon/i)).toBeVisible({ timeout: 5000 });
    await expect(page.locator(".grid > div")).toHaveCount(1, { timeout: 5000 });
  });

  test("category filter shows correct items", async ({ page }) => {
    await page.getByRole("button", { name: "Medicine" }).click();
    await expect(page.getByText(/Vitamin Pack|Paracetamol/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("sort by price works", async ({ page }) => {
    await page.getByRole("button", { name: "All" }).click();
    await page.locator("select").selectOption("price_asc");
    // First product should be cheapest
    const firstPrice = await page.locator(".grid .text-lg.font-bold").first().textContent();
    expect(Number(firstPrice?.replace("$", ""))).toBeLessThanOrEqual(10);
  });

  test("add to cart shows cart badge", async ({ page }) => {
    const addBtn = page.locator("button", { hasText: "Add to cart" }).first();
    await addBtn.click();
    await expect(page.locator("[aria-label='Open cart'] + span, .absolute.-right-1")).toBeVisible({ timeout: 3000 });
  });
});
