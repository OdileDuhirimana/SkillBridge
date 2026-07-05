import { formatSalary, formatLocation, formatDate } from './formatters';
import type { Job } from '../types';

/**
 * Unit tests for the shared display-formatting helpers extracted from
 * JobsPage/DashboardPage/JobDetailPage/CompanyDetailPage/ApplicationsPage
 * (see formatters.ts doc comment for the duplication this replaced).
 * These are pure functions, so no rendering/mocking is required.
 */
describe('formatSalary', () => {
  it('formats a full min-max range with thousands separators', () => {
    const salary = { min: 60000, max: 80000, currency: 'USD', period: 'yearly' } as Job['salary'];
    expect(formatSalary(salary)).toBe('$60,000 - $80,000');
  });

  it('falls back to a single bound when only one is provided', () => {
    const minOnly = { min: 50000, currency: 'USD', period: 'yearly' } as Job['salary'];
    const maxOnly = { max: 90000, currency: 'USD', period: 'yearly' } as Job['salary'];
    expect(formatSalary(minOnly)).toBe('$50,000');
    expect(formatSalary(maxOnly)).toBe('$90,000');
  });

  it('returns "Not specified" when salary is absent or has no bounds', () => {
    expect(formatSalary(undefined)).toBe('Not specified');
    expect(formatSalary({} as Job['salary'])).toBe('Not specified');
  });
});

describe('formatLocation', () => {
  it('returns "Remote" for remote jobs regardless of any address on file', () => {
    const location = { type: 'remote', address: { city: 'Austin', state: 'TX' } } as Job['location'];
    expect(formatLocation(location)).toBe('Remote');
  });

  it('formats "city, state" when both are present', () => {
    const location = { type: 'on-site', address: { city: 'Austin', state: 'TX' } } as Job['location'];
    expect(formatLocation(location)).toBe('Austin, TX');
  });

  it('falls back to "Not specified" when no usable location data exists', () => {
    expect(formatLocation(undefined)).toBe('Not specified');
  });
});

describe('formatDate', () => {
  it('formats a valid date string', () => {
    // Constructed in local time (not a UTC-midnight ISO string) so this
    // assertion is not sensitive to the timezone the test runner executes
    // in — a UTC-midnight timestamp could roll over to the previous day
    // in negative-offset timezones and make this test flaky in CI.
    const localDate = new Date(2026, 0, 5); // Jan 5, 2026, local time
    expect(formatDate(localDate.toISOString())).toBe('Jan 5, 2026');
  });

  it('returns "Unknown date" for an unparseable value instead of throwing', () => {
    expect(formatDate('not-a-date')).toBe('Unknown date');
  });
});
