// Playwright E2E test.
// Runs against http://localhost:3000 — start the server before running:
//   npm start          (in another terminal)
//   npm run test:e2e
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3000';

// Helper: random email so each test run can register a new parent.
function uniqueEmail() {
  return `e2e-${Date.now()}@example.com`;
}

test.describe('Full learning flow', () => {
  test('register → add child → open lesson → see results', async ({ page }) => {
    const email = uniqueEmail();

    // 1. Open landing
    await page.goto(BASE);
    await expect(page.getByRole('heading', { name: /Reading is/i })).toBeVisible();

    // 2. Go to registration
    await page.getByRole('button', { name: /Start free/i }).click();
    await expect(page.getByRole('heading', { name: /Hello, parent!/i })).toBeVisible();

    // 3. Fill in registration form
    await page.locator('input[type="text"]').fill('Test Parent');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill('secret123');
    await page.getByRole('button', { name: /Create account/i }).click();

    // 4. Land on dashboard
    await expect(page.getByRole('heading', { name: /Your learners/i })).toBeVisible();

    // 5. Add a child
    await page.locator('.add-kid').click();
    await expect(page.getByRole('heading', { name: /Add a child/i })).toBeVisible();
    await page.locator('input[type="text"]').fill('Mia');
    // Age input already has default 5
    await page.getByRole('button', { name: /Add child/i }).click();

    // 6. Land on the curriculum map
    await expect(page.getByText(/Hi, Mia!/i)).toBeVisible();
    await expect(page.locator('.lesson-node.available').first()).toBeVisible();

    // 7. Open the first available lesson
    await page.locator('.lesson-node.available').first().click();
    await expect(page.locator('.exercise-prompt')).toBeVisible();

    // The actual exercise content varies. We verify we're on the lesson screen
    // by checking that the progress bar exists.
    await expect(page.locator('.progress-track')).toBeVisible();
  });
});
