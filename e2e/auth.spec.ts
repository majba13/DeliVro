import { test, expect } from "@playwright/test";

const TEST_EMAIL = `test_${Date.now()}@delivro-test.com`;
const TEST_PASSWORD = "TestPass123!";
const TEST_NAME = "Playwright Tester";

test.describe("Authentication", () => {
  test("register page renders correctly", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /Create your account/i })).toBeVisible();
    await expect(page.getByPlaceholder("John Doe")).toBeVisible();
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
  });

  test("register form validates password mismatch", async ({ page }) => {
    await page.goto("/register");
    await page.getByPlaceholder("John Doe").fill(TEST_NAME);
    await page.getByPlaceholder("you@example.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("min 8 chars").fill("Password1!");
    await page.getByPlaceholder("repeat password").fill("DifferentPass!");
    await page.getByRole("button", { name: /Create account/i }).click();
    // Toast error should appear
    await expect(page.getByText(/Passwords do not match/i)).toBeVisible({ timeout: 5000 });
  });

  test("register form validates short password", async ({ page }) => {
    await page.goto("/register");
    await page.getByPlaceholder("John Doe").fill(TEST_NAME);
    await page.getByPlaceholder("you@example.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("min 8 chars").fill("short");
    await page.getByPlaceholder("repeat password").fill("short");
    await page.getByRole("button", { name: /Create account/i }).click();
    await expect(page.getByText(/8 characters/i)).toBeVisible({ timeout: 5000 });
  });

  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /Sign in to DeliVro/i })).toBeVisible();
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
  });

  test("login link to register works", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Sign up" }).click();
    await expect(page).toHaveURL(/\/register/);
  });

  test("forgot password page renders", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("heading", { name: /Forgot your password/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Send reset link/i })).toBeVisible();
  });
});
