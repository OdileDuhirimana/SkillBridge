// @ts-check
const { test, expect } = require('@playwright/test');
const { EMPLOYER_FIXTURE, JOB_FIXTURE_TITLE } = require('./global-setup');

/**
 * E2E: employer registration/authentication, and reviewing applications.
 *
 * SCOPE NOTE (read before extending this spec): while writing this suite,
 * the client was found to have NO UI for either (a) creating a job posting
 * or (b) changing an application's status — both are fully implemented
 * and covered by integration tests at the API layer (see
 * server/routes/jobs.js, server/routes/applications.js,
 * server/tests/jobs.test.js, server/tests/applications.test.js) but have
 * no corresponding page/form anywhere in client/src/pages/. This is a
 * real product gap this E2E-writing effort surfaced, now recorded in
 * docs/architecture.md's Known Technical Debt — not something this test
 * papers over by driving those steps through the API and pretending they
 * were UI-driven.
 *
 * What this spec DOES verify end-to-end through the real UI: an employer
 * can log in with an account that owns a company job applicants have
 * applied to, and see that application surfaced in their applications
 * list. The job posting and the student's application are created via
 * `e2e/global-setup.js` / `student-apply-flow.spec.js` respectively,
 * exactly as they would need to be today absent that missing UI.
 */
test.describe('Employer: authenticate and review applications', () => {
  test('an employer can log in and see an application to their job', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder(/email address/i).fill(EMPLOYER_FIXTURE.email);
    await page.getByPlaceholder('Password', { exact: true }).fill(EMPLOYER_FIXTURE.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Depends on student-apply-flow.spec.js having already run and applied
    // to the fixture job — Playwright runs spec files within a project
    // sequentially in the order listed by default under `workers: 1`
    // (see playwright.config.js), so this ordering is deliberate, not
    // incidental.
    await page.goto('/applications');
    await expect(page.getByRole('heading', { name: JOB_FIXTURE_TITLE })).toBeVisible({ timeout: 10000 });
  });
});
