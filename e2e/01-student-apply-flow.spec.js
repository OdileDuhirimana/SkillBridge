// @ts-check
const { test, expect } = require('@playwright/test');
const { JOB_FIXTURE_TITLE } = require('./global-setup');

/**
 * E2E: register → search for a job → apply → see the application recorded.
 *
 * This is the single most-requested "critical flow" across both prior
 * audits' "Fastest Path" sections. It runs against the real built client
 * (client/build, served statically — see playwright.config.js) and the
 * real Express API backed by a dedicated `skillbridge_e2e` MongoDB
 * database, not a mocked component tree — the same integration surface a
 * real user would exercise.
 */
test.describe('Student: register, search, apply', () => {
  test('a newly registered student can find and apply to a job, and see it in their applications', async ({ page }) => {
    const uniqueEmail = `e2e-student-${Date.now()}@example.com`;

    // --- Register ---
    await page.goto('/register');
    await page.getByPlaceholder('First name').fill('Ada');
    await page.getByPlaceholder('Last name').fill('Lovelace');
    await page.getByPlaceholder('Email address').fill(uniqueEmail);
    await page.getByPlaceholder('Password', { exact: true }).fill('E2ePassword1!');
    await page.getByPlaceholder('Confirm password').fill('E2ePassword1!');
    // Role select defaults to "student" — the persona this spec needs —
    // so it is intentionally left untouched here.
    await page.locator('input[name="agreeToTerms"]').check();
    await page.getByRole('button', { name: /create account|sign up|register/i }).click();

    // A successful registration redirects to /dashboard (see RegisterPage.tsx).
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // --- Search for the fixture job ---
    await page.goto('/jobs');
    await page.getByPlaceholder(/search jobs, companies, or keywords/i).fill(JOB_FIXTURE_TITLE);
    await page.getByRole('button', { name: 'Search', exact: true }).click();

    const jobLink = page.getByRole('link', { name: JOB_FIXTURE_TITLE });
    await expect(jobLink).toBeVisible({ timeout: 10000 });
    await jobLink.click();

    await expect(page).toHaveURL(/\/jobs\/[a-f0-9]+/);
    await expect(page.getByRole('heading', { name: JOB_FIXTURE_TITLE })).toBeVisible();

    // --- Apply ---
    await page.getByRole('button', { name: 'Apply Now' }).click();
    await page.getByRole('button', { name: 'Submit Application' }).click();

    // `exact: true` disambiguates from the (also-visible) toast notification
    // "Application submitted successfully!", which otherwise both match a
    // loose substring query against "Application Submitted".
    await expect(page.getByText('Application Submitted', { exact: true })).toBeVisible({ timeout: 10000 });

    // --- Verify it shows up in the applications list ---
    await page.goto('/applications');
    await expect(page.getByRole('heading', { name: JOB_FIXTURE_TITLE })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/applied/i).first()).toBeVisible();
  });
});
