# Product: Problem Validation

This document exists for the same reason `docs/architecture.md` does: to
describe SkillBridge as it is actually built and evidenced by working code
today, not the aspirational feature list in `project.md` or the marketing
copy in the top-level `README.md`. Where a feature named in those documents
(AI career mentor chatbot, community forums, video interview scheduling,
blockchain credentials) is not backed by working code in `server/` or
`client/src/`, it is called out explicitly below as aspirational rather than
silently implied to exist. This split — real vs. aspirational — is itself
part of the product discipline this document is trying to demonstrate.

## Problem Statement

Entry-level job seekers (new graduates, bootcamp graduates, and early-career
career-changers) apply to jobs with almost no visibility into whether a
given application is actually being reviewed, and no structured way to see
how their application history maps to real outcomes over time. General-
purpose job boards (LinkedIn, Indeed) optimize for posting volume and reach,
not for giving either side of the hiring funnel a clear, structured view of
where an application actually stands.

On the other side, small-to-mid-size employers and startups without a
dedicated ATS (Applicant Tracking System) budget manage applications over
email threads and spreadsheets, which does not scale past a handful of open
roles and gives candidates no visibility into their status — a bad candidate
experience that a smaller company can least afford, since employer brand and
word-of-mouth matter disproportionately more for companies without existing
name recognition.

SkillBridge addresses the specific, narrower slice of this problem that a
single full-stack application can credibly solve: a structured, real-time,
status-transparent application pipeline connecting students/job-seekers and
employers, with company-side team collaboration and a lightweight
engagement/progression mechanic (XP, levels) to encourage job seekers to
keep their profile current.

## Users

### Primary user: the student / early-career job seeker

- Applies to internships and entry-level roles, often for the first time.
- Needs: search/filter jobs by category, type, seniority level, location,
  and salary; apply with a resume and cover letter; see application status
  change over time (`applied → under-review → shortlisted → interview-*
  → offer-* / rejected / withdrawn`) instead of silence; message an employer
  directly once a conversation is warranted.
- Evidenced in code: `client/src/pages/JobsPage.tsx`, `ApplicationsPage.tsx`,
  `server/models/Application.js`'s `status` enum and `timeline` array,
  `server/routes/applications.js`.

### Secondary user: the employer / hiring team member

- Posts jobs under a company profile, reviews incoming applications, moves
  candidates through a pipeline, and collaborates with teammates who share
  ownership of that company's postings (with per-permission access —
  `create_jobs`, `edit_jobs`, `view_applications`, `manage_company` — rather
  than all-or-nothing access).
- Needs: a company profile that presents culture/benefits to candidates;
  a scoped team so more than one person can manage postings without sharing
  a single login; a clear queue of applications per job; a way to schedule
  interviews and leave internal notes on a candidate.
- Evidenced in code: `server/controllers/companyController.js`'s
  `addTeamMember`/`removeTeamMember`, `server/utils/authorization.js`'s
  permission model, `server/routes/applications.js`'s `/notes` and
  `/interview` endpoints.

### Tertiary (present, but not the design center): the platform admin

- Can view all applications/users, moderate content, and has escalated
  authorization (`role: 'admin'` in `server/middleware/auth.js`'s
  `authorize()`). Not a primary design target for this project — no
  dedicated admin UI exists in `client/src/pages/`, only API-level access.

## Success Metrics

These are the metrics the product is *designed* to move, chosen because
each one maps to a concrete, already-instrumented data point in the schema
— not aspirational metrics with no corresponding field to compute them from.

1. **Application-to-response rate**: the percentage of submitted
   applications that transition out of `applied` within a bounded window
   (i.e. the employer actually acted on it), computed from
   `Application.timeline`. This is the core "silence vs. visibility"
   problem the product exists to address — a job board can report
   applications sent; SkillBridge's differentiator is the fraction that
   receive a real status change.
2. **Time-to-first-response**: median time between `Application.createdAt`
   and the first `timeline` entry after `applied`. Directly measurable from
   existing schema fields with no additional instrumentation.
3. **Employer team adoption**: percentage of active companies with more
   than one `team` member (`Company.team`), as a proxy for whether the
   product is being used as shared infrastructure by a hiring team rather
   than a single recruiter's personal tool.
4. **Seeker engagement retention**: 7-day and 30-day return rate of
   students who have applied to at least one job, using `User.stats` (XP,
   level, `applicationsSent`) as the existing engagement signal — chosen
   because the gamification mechanic (`addXP`, level-up) already exists
   specifically to drive this behavior, so it is a legitimate metric to
   validate that mechanic's effect rather than a vanity number.

## Competitive Comparison

| | **SkillBridge** | **LinkedIn Jobs** | **Handshake** | **Wellfound (AngelList Talent)** |
|---|---|---|---|---|
| Primary audience | Students/early-career + small-mid employers without an ATS | General workforce, all levels | University students, career-services-partnered employers | Startup-focused candidates and hiring teams |
| Application status transparency | Structured `timeline` with explicit stages, visible to the candidate | Often silent after "Applied" unless the employer manually updates it | Status visible where the employer opts in; inconsistent | Status visible, similar structured pipeline (closest comparator) |
| Employer team collaboration | Built-in scoped team permissions per company (`create_jobs`/`view_applications`/etc.) | Requires a paid Recruiter/Talent Hub seat per user | Career-services-mediated, not direct team permissions | Team accounts available on paid tiers |
| Real-time candidate-employer chat | Built-in (Socket.io), included at no extra tier | Only via InMail (credit-limited, paid) | Not a core feature | Available, similar to SkillBridge's approach |
| Cost/access model | N/A (portfolio project — no monetization) | Freemium; most useful employer features are paid | Free to students; employers typically pay via institutional partnership | Free for candidates; employer tiers are paid |

**Explicit differentiation**: SkillBridge's bet is that the two features
most job boards paywall or omit — cross-team collaborative applicant
review and transparent, structured status tracking — should be table
stakes for a platform serving early-career candidates and the employers
without a dedicated ATS, rather than a paid add-on. Wellfound is the
closest real-world analog in structure (pipeline transparency, team
accounts), but is scoped to startup hiring specifically; SkillBridge does
not have Wellfound's investor/startup-discovery angle, and is not trying
to compete on job volume or reach with LinkedIn/Indeed.

## What Is Explicitly Aspirational (Not Implemented)

For honesty and to avoid the exact "installed but not wired up" pattern
`docs/architecture.md` flags elsewhere in this codebase (e.g. the earlier
Redis/`@tanstack/react-query` findings), the following items named in
`project.md` and the top-level `README.md`'s feature list are **not**
backed by working code as of this document and should not be read as
current capabilities:

- AI Career Mentor chatbot / conversational career coaching.
- AI resume analyzer producing a "role-fit score."
- Community discussion forums / "Ask a Mentor" Q&A.
- Video/voice interview conducted in-app (interview *scheduling* metadata
  exists on `Application.interview`, but no video/calling integration).
- Blockchain-verified credentials.
- Offline/PWA mode with background sync.

These remain reasonable future-roadmap items (see the README's "Future
Improvements" section) but are called out here so this document is not
itself guilty of the problem-validation gap it exists to close.
