import type { Job } from '../types';

/**
 * Shared display-formatting helpers for job/company data.
 *
 * WHY this exists: `formatSalary` was duplicated verbatim across
 * `JobsPage.tsx`, `DashboardPage.tsx`, `JobDetailPage.tsx`, and
 * `CompanyDetailPage.tsx`; `formatLocation` was duplicated across
 * `JobsPage.tsx` and `JobDetailPage.tsx`. Any change to how a salary range
 * or job location is displayed required editing every page in lockstep —
 * the same maintainability risk the code-review audit flagged for the
 * server-side pagination logic. Centralizing here means the rule is
 * defined once and every caller stays in sync automatically.
 *
 * These are pure, framework-agnostic functions (no React, no I/O), so they
 * are trivially unit-testable in isolation from any component.
 */

/**
 * Format a job's salary range for display.
 *
 * @param salary - The job's salary object (may be entirely absent, or have
 *   only a min or only a max — e.g. "up to $80,000" roles omit `min`).
 * @returns A human-readable range (e.g. "$60,000 - $80,000"), a single
 *   bound (e.g. "$80,000"), or "Not specified" when no bound is present.
 */
export const formatSalary = (salary: Job['salary']): string => {
  if (!salary || (salary.min === undefined && salary.max === undefined)) {
    return 'Not specified';
  }
  const min = salary.min !== undefined ? `$${salary.min.toLocaleString()}` : '';
  const max = salary.max !== undefined ? `$${salary.max.toLocaleString()}` : '';
  if (min && max) return `${min} - ${max}`;
  return min || max;
};

/**
 * Format a job's location for display.
 *
 * @param location - The job's location object. Remote jobs are shown as
 *   "Remote" regardless of any address on file; otherwise falls back from
 *   "city, state" down to whatever partial information is available.
 * @returns A human-readable location string, or "Not specified" when no
 *   usable location data exists.
 */
export const formatLocation = (location: Job['location']): string => {
  if (location?.type === 'remote') return 'Remote';
  const city = location?.address?.city;
  const state = location?.address?.state;
  if (city && state) return `${city}, ${state}`;
  return city || location?.type || 'Not specified';
};

/**
 * Format an ISO date string for display (e.g. "Jan 5, 2026").
 *
 * @param dateString - An ISO 8601 date string, as returned by the API.
 * @returns A short, locale-formatted date, or "Unknown date" if the input
 *   cannot be parsed (defensive: API responses should always be valid
 *   dates, but a malformed value should never crash the page).
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
