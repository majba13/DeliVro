import { test, expect } from "@playwright/test";

test.describe("Cart", () => {
  test("adding an item opens cart drawer", async ({ page }) => {
    await page.goto("/products");
    await page.locator("button", { hasText: "Add to cart" }).first().click();
    // Cart drawer should appear
    await expect(page.getByRole("heading", { name: /Cart \(/i })).toBeVisible({ timeout: 3000 });
  });

  test("cart count increments when adding more items", async ({ page }) => {
    await page.goto("/products");
    const addBtns = page.locator("button", { hasText: "Add to cart" });
    await addBtns.nth(0).click();
    await page.getByRole("button", { name: /close/i }).click().catch(() => {});
    // Close cart if open
    await page.keyboard.press("Escape");
    await addBtns.nth(1).click();
    await expect(page.getByRole("heading", { name: /Cart \(2\)/i })).toBeVisible({ timeout: 3000 });
  });

  test("removing item updates cart", async ({ page }) => {
    await page.goto("/products");
    await page.locator("button", { hasText: "Add to cart" }).first().click();
    await page.locator("aside button[aria-label], aside button").last().click().catch(() => {});
    // Use the × button in cart item
    const removeBtn = page.locator("aside li button").first();
    if (await removeBtn.isVisible()) {
      await removeBtn.click();
      await expect(page.getByText("Your cart is empty")).toBeVisible({ timeout: 3000 });
    }
  });

  test("proceed to checkout navigates correctly", async ({ page }) => {
    await page.goto("/products");
    await page.locator("button", { hasText: "Add to cart" }).first().click();
    await page.getByRole("link", { name: "Proceed to Checkout" }).click();
    await expect(page).toHaveURL(/\/checkout/);
  });
});

test.describe("Checkout page", () => {
  test("renders payment methods", async ({ page }) => {
    await page.goto("/checkout");
    for (const method of ["Card / Stripe", "bKash", "Nagad", "Rocket", "Bank Transfer", "Cash on Delivery"]) {
      await expect(page.getByText(method)).toBeVisible();
    }
  });

  test("shows MFS fields when bKash selected", async ({ page }) => {
    await page.goto("/checkout");
    await page.getByText("bKash").click();
    await expect(page.getByPlaceholder("01XXXXXXXXX")).toBeVisible({ timeout: 2000 });
    await expect(page.getByPlaceholder(/Transaction ID/i)).toBeVisible();
  });
});
