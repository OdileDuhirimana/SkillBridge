import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import { AuthProvider } from './context/AuthContext';

expect.extend(toHaveNoViolations);

/**
 * Automated accessibility checks (jest-axe / axe-core) for the primary
 * navigation and the login form.
 *
 * WHY these two specifically: both prior audits' FE-04/FE-05 findings
 * singled out exactly these as unverified — "icon-only buttons do carry
 * aria-label... but there is no accessibility tooling (no axe-core,
 * jest-axe) anywhere in the repo" and "Layout.tsx's two <nav> regions are
 * unlabeled and indistinguishable to assistive tech." This closes that
 * gap with real, automated, CI-enforceable checks rather than incidental
 * `aria-label` usage alone — and this test would have caught the
 * unlabeled-nav-regions issue directly (axe-core's `landmark-unique` rule
 * flags exactly that).
 *
 * Scope note: axe-core catches a meaningful subset of accessibility
 * issues (missing labels, color-contrast-in-DOM violations, landmark
 * structure, ARIA misuse) but not everything — it is not a substitute for
 * a manual keyboard-navigation pass, which this codebase does not yet
 * have. This test suite is the automated half of that gap being closed,
 * not the whole of it.
 */
describe('Accessibility (jest-axe)', () => {
  it('Layout has no detectable accessibility violations', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Layout>
            <p>Page content</p>
          </Layout>
        </AuthProvider>
      </MemoryRouter>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Layout labels its two navigation landmarks distinctly', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Layout>
            <p>Page content</p>
          </Layout>
        </AuthProvider>
      </MemoryRouter>
    );

    const navs = container.querySelectorAll('nav');
    expect(navs).toHaveLength(2);
    const labels = Array.from(navs).map((nav) => nav.getAttribute('aria-label'));
    expect(labels.every(Boolean)).toBe(true);
    // Distinct labels, not both landmarks sharing the same name — two navs
    // with identical accessible names are still indistinguishable to a
    // screen reader's landmark list even if both technically have a label.
    expect(new Set(labels).size).toBe(2);
  });

  it('Layout includes a skip-to-content link targeting the main landmark', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Layout>
            <p>Page content</p>
          </Layout>
        </AuthProvider>
      </MemoryRouter>
    );

    const skipLink = container.querySelector('a[href="#main-content"]');
    expect(skipLink).not.toBeNull();
    expect(container.querySelector('#main-content')).not.toBeNull();
  });

  it('LoginPage form has no detectable accessibility violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
