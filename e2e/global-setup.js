// Must match playwright.config.js's API_PORT resolution.
const API_URL = `http://localhost:${process.env.E2E_API_PORT || '5000'}/api`;

// Fixed, well-known credentials/ids for the fixture data this suite reads
// back by title/email — deterministic fixtures are easier to debug than
// randomly-generated ones when a spec fails.
const EMPLOYER_FIXTURE = {
  firstName: 'Fixture',
  lastName: 'Employer',
  email: 'e2e-fixture-employer@example.com',
  password: 'FixturePassword1!',
  role: 'employer'
};

const JOB_FIXTURE_TITLE = 'E2E Fixture — Senior Full Stack Engineer';

/**
 * Runs once before the whole E2E suite, against the fresh, uniquely-named
 * database `playwright.config.js` generates for this run (see that file's
 * comment for why this database is never dropped/reset here — the API
 * server, started before this function runs, has already connected and
 * built its indexes against it, and dropping it out from under a running
 * server reproduces a real `text index required for $text query` error).
 * Seeds the one piece of fixture data the specs need but cannot create
 * through the UI themselves: an active job to apply to (there is no
 * job-posting UI in this client — see docs/architecture.md's Known
 * Technical Debt — so this uses the same API a real integration would).
 */
module.exports = async () => {
  const registerRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(EMPLOYER_FIXTURE)
  });
  const registerBody = await registerRes.json();
  if (!registerRes.ok) {
    throw new Error(`E2E fixture setup: employer registration failed: ${JSON.stringify(registerBody)}`);
  }
  const employerToken = registerBody.token;

  const companyRes = await fetch(`${API_URL}/companies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${employerToken}` },
    body: JSON.stringify({
      name: 'E2E Fixture Company',
      description: 'A company created by Playwright global setup for E2E fixtures.',
      industry: 'Technology',
      size: '11-50'
    })
  });
  const companyBody = await companyRes.json();
  if (!companyRes.ok) {
    throw new Error(`E2E fixture setup: company creation failed: ${JSON.stringify(companyBody)}`);
  }
  const companyId = companyBody.data._id;

  const jobRes = await fetch(`${API_URL}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${employerToken}` },
    body: JSON.stringify({
      title: JOB_FIXTURE_TITLE,
      description: 'A fixture job posting created by Playwright global setup.',
      requirements: '3+ years of full stack experience.',
      responsibilities: 'Build and ship features end to end.',
      category: 'Technology',
      type: 'full-time',
      level: 'senior',
      location: { type: 'remote' },
      // WHY explicit: Job.status defaults to 'draft' (server/models/Job.js),
      // and GET /api/jobs always filters to `status: 'active'` — a fixture
      // job created without this would be invisible to every list/search
      // query, which is exactly the failure this line fixes.
      status: 'active',
      company: companyId
    })
  });
  const jobBody = await jobRes.json();
  if (!jobRes.ok) {
    throw new Error(`E2E fixture setup: job creation failed: ${JSON.stringify(jobBody)}`);
  }

};

// WHY spec files import these constants directly (`require('./global-setup')`)
// rather than reading them back from `process.env`: Playwright test workers
// run as separate child processes, and there is no guarantee a plain
// `process.env` mutation made here is visible to a worker spawned after
// this function returns. Exporting the same fixed constants both functions
// use avoids that whole class of cross-process-env fragility.

module.exports.EMPLOYER_FIXTURE = EMPLOYER_FIXTURE;
module.exports.JOB_FIXTURE_TITLE = JOB_FIXTURE_TITLE;
