import { test, expect } from "@playwright/test";

test.describe("404 page", () => {
  test("shows custom 404 for unknown routes", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText(/Page not found/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "Go Home" })).toBeVisible();
  });
});

test.describe("Legal pages", () => {
  test("terms page renders", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();
  });

  test("privacy page renders", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
  });

  test("refund page renders", async ({ page }) => {
    await page.goto("/refund");
    await expect(page.getByRole("heading", { name: /Refund/i })).toBeVisible();
  });
});

test.describe("Tracking page", () => {
  test("renders tracking UI", async ({ page }) => {
    await page.goto("/tracking");
    await expect(page.getByRole("heading", { name: /Live Delivery Tracking/i })).toBeVisible();
    await expect(page.getByText("Live Updates")).toBeVisible({ timeout: 5000 });
  });

  test("accepts orderId query param", async ({ page }) => {
    await page.goto("/tracking?orderId=TEST-ORDER-123");
    await expect(page.getByText("TEST-ORDER-123")).toBeVisible({ timeout: 5000 });
  });
});
