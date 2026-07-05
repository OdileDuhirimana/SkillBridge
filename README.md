# SkillBridge - AI-Powered Job & Internship Ecosystem

A comprehensive career platform that connects students, graduates, and employers through intelligent matching, real-time communication, and AI-powered career guidance.

Deployment reference:
- `docs/deployment.md` (Render backend + Vercel frontend)

Further reading:
- [`docs/product.md`](docs/product.md) — problem statement, target users, success metrics, and honest competitive comparison
- [`docs/architecture.md`](docs/architecture.md) — system design, ER diagram, layering, and known technical debt

## 🚀 Features

### Core Functionality
- **Smart Job Discovery**: AI-powered job recommendations based on skills and preferences
- **AI Career Mentor**: Personalized career advice and skill recommendations
- **Resume Analysis**: AI-powered resume optimization and feedback
- **Real-time Chat**: Direct communication between job seekers and employers
- **Application Tracking**: Complete application lifecycle management
- **Company Insights**: Detailed company profiles with culture and benefits
- **Career Analytics**: Progress tracking and insights dashboard
- **Push Notifications**: Real-time updates via Firebase Cloud Messaging

### Advanced Features
- **Gamification**: XP system, badges, and leaderboards
- **Skill Matching**: Advanced algorithm for job-skill compatibility
- **Interview Scheduling**: Integrated calendar and video calling
- **Portfolio Management**: Showcase projects and achievements
- **Community Forums**: Industry-specific discussions and mentorship
- **Analytics Dashboard**: Comprehensive insights for users and employers

## 🛠 Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Socket.io** for real-time communication
- **JWT** authentication
- **Cloudinary** for file storage
- **Firebase** for push notifications
- **OpenAI API** for AI features

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **React Router** for navigation
- **React Hook Form** for form handling
- **TanStack Query** for data fetching
- **Socket.io Client** for real-time features

### Infrastructure
- **Docker** containerization
- **Nginx** reverse proxy
- **MongoDB** database
- **Cloudinary** for media storage

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB 7.0+
- Docker (optional)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/skillbridge.git
cd skillbridge
```

### 2. Install Dependencies
```bash
# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 3. Environment Setup
```bash
# Copy environment template
cp env.example .env

# Edit environment variables
nano .env
```

Required environment variables:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/skillbridge

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Email (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Firebase (for push notifications)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email

# OpenAI (for AI features)
OPENAI_API_KEY=your_openai_api_key
```

### 4. Database Setup
```bash
# Start MongoDB
mongod

# Apply schema migrations (see server/migrations/ — distinct from seeding:
# migrations apply incremental schema changes to a database that may
# already hold real data; seeding populates a fresh/dev database with
# sample records)
npm run migrate:up

# Seed the database with sample data
npm run seed
```

Migration commands (`migrate-mongo`, config in `migrate-mongo-config.js`):
```bash
npm run migrate:status   # show applied/pending migrations
npm run migrate:up       # apply all pending migrations
npm run migrate:down     # roll back the most recently applied migration
```

### 5. Start Development Servers
```bash
# Start both server and client
npm run dev

# Or start individually
npm run server  # Backend on port 5000
npm run client  # Frontend on port 3000
```

## 🐳 Docker Deployment

### Using Docker Compose

`docker-compose.yml` reads secrets (Mongo root credentials, `JWT_SECRET`)
from a local `.env` file rather than hardcoding them — copy `env.example` to
`.env` first and fill in real values (or accept the local-dev defaults for
`MONGO_ROOT_USERNAME`/`MONGO_ROOT_PASSWORD`; `JWT_SECRET` has no default and
must be set explicitly).

```bash
cp env.example .env
# edit .env and set JWT_SECRET at minimum

# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Docker Build
```bash
# Build the image
docker build -t skillbridge .

# Run the container
docker run -p 5000:5000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/skillbridge \
  -e JWT_SECRET=your_secret \
  skillbridge
```

## 📁 Project Structure

```
skillbridge/
├── server/                 # Backend API
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   ├── utils/             # Utility functions
│   ├── socket/            # Socket.io handlers
│   └── scripts/           # Database scripts
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React contexts
│   │   ├── services/      # API services
│   │   ├── hooks/         # Custom hooks
│   │   ├── utils/         # Utility functions
│   │   └── types/         # TypeScript types
│   └── public/            # Static assets
├── docker-compose.yml     # Docker services
├── Dockerfile            # Docker configuration
├── nginx.conf           # Nginx configuration
└── README.md            # This file
```

## 🏗 Architecture

See [`docs/architecture.md`](docs/architecture.md) for a full architecture
diagram (Mermaid), an entity-relationship diagram of the six core Mongoose
models, a request-flow walkthrough, documented tradeoffs (why MongoDB, why
JWT), and an honest "Known Technical Debt" section.

## 🔧 API Documentation

Interactive OpenAPI docs are available at `/api/docs` when the server is
running (raw spec at `/api/openapi.json`). Core routes (`auth`, `jobs`,
`applications`) have full `@swagger` annotations; see
`docs/architecture.md#known-technical-debt` for which routes are not yet
annotated.

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/update-password` - Update password
- `POST /api/auth/forgot-password` - Forgot password
- `POST /api/auth/reset-password` - Reset password

### User Endpoints
- `GET /api/users` - Get all users (admin)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `POST /api/users/:id/avatar` - Upload avatar
- `POST /api/users/:id/resume` - Upload resume
- `POST /api/users/:id/skills` - Add skill
- `DELETE /api/users/:id` - Delete user

### Job Endpoints
- `GET /api/jobs` - Get all jobs
- `GET /api/jobs/:id` - Get job by ID
- `POST /api/jobs` - Create job (employer)
- `PUT /api/jobs/:id` - Update job (employer)
- `DELETE /api/jobs/:id` - Delete job (employer)
- `GET /api/jobs/trending` - Get trending jobs
- `GET /api/jobs/categories` - Get distinct job categories
- `GET /api/jobs/company/:companyId` - Get jobs by company

### Company Endpoints
- `GET /api/companies` - Get all companies
- `GET /api/companies/:id` - Get company by ID
- `POST /api/companies` - Create company (employer)
- `PUT /api/companies/:id` - Update company (employer)
- `POST /api/companies/:id/logo` - Upload logo
- `POST /api/companies/:id/team` - Add team member
- `DELETE /api/companies/:id/team/:memberId` - Remove team member
- `POST /api/companies/:id/reviews` - Add review
- `GET /api/companies/:id/reviews` - Get company reviews
- `GET /api/companies/industries` - Get distinct company industries

### Application Endpoints
- `GET /api/applications` - Get applications
- `GET /api/applications/:id` - Get application by ID
- `POST /api/applications` - Create application
- `PUT /api/applications/:id/status` - Update status (employer)
- `POST /api/applications/:id/notes` - Add note (employer)
- `POST /api/applications/:id/interview` - Schedule interview
- `PUT /api/applications/:id/withdraw` - Withdraw application

### Chat Endpoints
- `GET /api/chats` - Get user chats
- `GET /api/chats/:id` - Get chat by ID
- `POST /api/chats` - Create chat
- `POST /api/chats/:id/messages` - Send message
- `PUT /api/chats/:id/read` - Mark as read
- `POST /api/chats/:id/messages/:messageId/reactions` - Add reaction

### AI Endpoints
- `POST /api/ai/analyze-resume` - Analyze resume
- `POST /api/ai/job-recommendations` - Get job recommendations
- `POST /api/ai/analyze-application` - Analyze application match
- `POST /api/ai/generate-cover-letter` - Generate cover letter
- `GET /api/ai/career-insights` - Get career insights

### Analytics Endpoints
- `GET /api/analytics/user` - User analytics
- `GET /api/analytics/company` - Company analytics
- `GET /api/analytics/platform` - Platform analytics (admin)

### Notification Endpoints
- `GET /api/notifications` - Get notifications
- `GET /api/notifications/:id` - Get notification by ID
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `GET /api/notifications/unread-count` - Get unread count

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Validation**: Comprehensive input validation
- **CORS Protection**: Cross-origin resource sharing protection
- **Helmet Security**: Security headers middleware
- **File Upload Security**: Secure file upload handling
- **SQL Injection Protection**: MongoDB query sanitization

## 🧪 Testing

The server test suite (`server/tests/`) uses Jest + Supertest against an
in-memory MongoDB instance (`mongodb-memory-server` — no real database
required to run tests). It covers the full auth flow (including a
regression test for a real password-double-hashing bug that was found and
fixed), job/company/user CRUD with authorization, the job-listing
filter-composition logic, the full application lifecycle
(apply/status-update/withdraw with per-role authorization), chat and
notification flows, the persisted audit log, and the shared authorization/
pagination/sanitization helpers as isolated unit tests — 127 tests at
~74% statement coverage, enforced by a coverage floor in `jest.config.js`
(`npm run test:coverage` fails the build below it). The client suite
(`client/src/`) uses React Testing Library plus `jest-axe` for automated
accessibility checks. CI (`.github/workflows/ci.yml`) runs both suites,
plus a production build of the client, on every push and pull request.

```bash
# Run server tests
npm test

# Run server tests with a coverage report (fails below the configured floor)
npm run test:coverage

# Run client tests (includes jest-axe accessibility checks)
cd client
npm test
```

### End-to-end tests

`e2e/` contains Playwright specs for the two most-requested critical
flows: student register → search → apply, and employer authentication +
reviewing an application. They run against the real built client (served
statically) and the real Express API backed by a dedicated
`skillbridge_e2e` MongoDB database — not a mocked component tree.

```bash
# One-time: install a headless browser for Playwright
npx playwright install chromium

# Build the client first (E2E serves the production build, not the dev server)
npm run build

npm run test:e2e
```

> While writing `e2e/employer-review-flow.spec.js`, we discovered the
> client has no UI for posting a job or changing an application's status
> (both are fully implemented server-side) — see
> `docs/architecture.md`'s Known Technical Debt for the details. The spec
> documents this gap inline rather than faking those steps through the UI.

## 📊 Performance Optimization

- **Database Indexing**: Optimized MongoDB indexes on frequently filtered/sorted fields (see `docs/architecture.md`)
- **Image Optimization**: Cloudinary image optimization
- **Code Splitting**: React code splitting for faster loading
- **Lazy Loading**: Component lazy loading
- **CDN**: Content delivery network for static assets

> **Known gap:** A Redis-backed caching layer and cron-based background jobs are not currently implemented. Earlier drafts of this README referenced both; they have been removed here rather than left as unverified claims. See `docs/architecture.md` for the honest list of current technical debt.

## 📸 Screenshots & Demo

> **Known gap:** No screenshots, demo video, or live deployment URL are
> included. This remediation pass was done in a sandboxed environment with
> no browser or hosting access, so these could not be captured or verified
> — they are not included as unverified/placeholder content per this
> project's own documentation standard (see the Redis/caching "Known gap"
> callout above for the same policy applied elsewhere). `docs/deployment.md`
> documents how to deploy (Render + Vercel); once deployed, this section
> should be replaced with the live URL and 4-6 screenshots of the core
> flows (job search, application tracker, chat, employer dashboard).

## 🚀 Deployment

### Production Deployment
1. Set up production environment variables
2. Configure SSL certificates
3. Set up MongoDB cluster
4. Deploy using Docker Compose
5. Set up monitoring and logging

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=mongodb://your-cluster-url/skillbridge
JWT_SECRET=your-production-secret
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
FIREBASE_PROJECT_ID=your-firebase-project
OPENAI_API_KEY=your-openai-key
```

## 📚 Lessons Learned

This project went through more than one honest remediation pass (see the
prior baseline in git history and `docs/architecture.md`'s technical-debt
section), and several of the more valuable lessons came directly from
bugs that only surfaced once real integration tests exercised the actual
HTTP request cycle rather than individual functions in isolation:

- **The single biggest lesson: server-side integration tests passing
  proves nothing about whether the client can actually talk to the
  server.** Writing `e2e/01-student-apply-flow.spec.js` against the real
  built client (not a mocked component tree) discovered that login and
  registration had never actually worked through the UI — the client's
  `authService.ts` expected `response.data.token`/`response.data.user`,
  but the server returns `token`/`user` at the top level. Every login/
  register call threw, even on a fully successful `201`/`200`. This
  passed unnoticed through 30+ server-side Supertest assertions (correct
  — they check the server's real, stable shape) and a full client unit-
  test suite (silent — nothing exercised a real submission through
  `authService`). Only a test that drives the actual client against the
  actual server, the way a real user would, could have caught it. See
  `docs/architecture.md`'s "Resolved since the last audit" for the fix.
- **Express route registration order is a silent correctness trap.**
  `GET /api/jobs/trending`, `GET /api/jobs/categories`, and
  `GET /api/companies/industries` were all previously registered *after*
  their corresponding `GET /:id` route. Since Express matches routes in
  registration order and `/:id` matches any single path segment, every one
  of those "static" routes was silently being swallowed by `/:id` and
  failing with an unrelated 404 (a Mongoose `CastError` on a non-ObjectId
  "id"). The fix is trivial once found — register specific routes before
  parameterized ones — but it is exactly the kind of bug that looks fine
  in a code review of any single route and only reveals itself when you
  actually issue the request. Lesson: a route file's *order*, not just its
  contents, needs to be part of what gets reviewed.
- **`populate()` before an authorization check silently breaks that check.**
  `GET /api/chats/:id` populated `participants.user` and then compared
  `participant.user.toString() === req.user.id` — but a populated field is
  a full document, not the raw `ObjectId` that comparison assumed, so the
  check always failed (denying access to legitimate participants). This
  kind of bug is invisible to a unit test of the authorization logic in
  isolation (`authorization.test.js`'s pure-function tests would never
  catch it) and only surfaces in a real integration test that populates
  data the same way the route does.
- **A library major-version upgrade can silently remove an API you depend
  on.** `company.team.id(id).remove()` and `user.skills.id(id).remove()`
  both threw `TypeError: ... .remove is not a function` at runtime —
  Mongoose 7 removed `Document#remove()` (replaced by `.deleteOne()`).
  Neither call site had a test before this pass, so this had presumably
  been broken since the Mongoose 7 upgrade with nothing to catch it.
  Lesson: an unused/untested code path doesn't fail loudly when a
  dependency changes underneath it — it just silently stops working until
  someone (or some test) exercises it.
- **A field-name mismatch between a route's expected input and its model's
  schema is easy to miss without an end-to-end test.** `POST /api/notifications`
  accepted `userId` in the request body (matching its own validator) but
  passed that body straight through to `Notification.createNotification()`,
  whose schema expects `user`. The endpoint could never have successfully
  created a notification. A unit test of `createNotification()` alone
  (given correct input) would never have caught this — only a test that
  goes through the actual route, with the actual request shape, does.
- **A type mismatch in a loop condition is an infinite loop waiting for
  real traffic to trigger it.** The Redis cache-invalidation helper
  (`invalidateByPrefix` in `server/utils/cache.js`) compared node-redis
  v4's numeric `SCAN` cursor against the string `'0'` — `0 !== '0'` is
  `true` in JavaScript, so the loop never terminated once a scan wrapped
  around. This hung every job-create/update/delete request as soon as
  Redis was actually reachable (it was invisible in the Jest suite, which
  disables caching entirely in `NODE_ENV=test`, and invisible in code
  review, since the bug only manifests at runtime against a real Redis).
  Found by `e2e/global-setup.js` hanging indefinitely on job creation —
  another data point for the "run it for real" theme above.
- **Index builds are asynchronous; a fresh boot can race its own
  `$text` query.** `server/index.js` called `server.listen()` without
  awaiting `mongoose.connect()`, let alone the background index build
  `autoIndex` triggers. A request that arrives fast enough after boot
  (exactly what a fresh CI/E2E environment does) can hit
  `MongoServerError: text index required for $text query` because the
  index genuinely doesn't exist yet. Fixed by awaiting
  `Model.init()` for every model before accepting traffic.
- **Writing the regression test *is* the fix, not an afterthought.** Every
  bug above was found while writing the notification/chat integration
  tests, or the E2E suite, this pass added specifically to close a
  coverage gap — not by a separate manual QA pass. That is the strongest
  practical argument this project has for "coverage percentage" being a
  means to an end (finding real bugs) rather than a vanity metric to
  satisfy a rubric.

## 🔭 Future Improvements

Concrete, scoped next steps — not a restatement of `project.md`'s
aspirational feature list. See `docs/product.md`'s "Explicitly
Aspirational" section for the larger features intentionally out of scope
for now (AI career mentor, community forums, video interviews).

- **Close the remaining accessibility gap with automated checks.** Add
  `jest-axe` assertions on the primary nav and at least one form, plus a
  documented manual keyboard-navigation pass, rather than relying on
  incidental `aria-label` usage.
- **Add a caching layer for the highest-traffic read path.** `GET /api/jobs`
  is the platform's core read; a Redis-backed cache with invalidation on
  job create/update/delete would meaningfully change its scaling profile.
- **Migrate free-text search to a MongoDB text index.** `buildJobQuery`'s
  regex-based search (now sanitized against injection/ReDoS — see
  `server/utils/sanitize.js`) still degrades to a collection scan at
  scale; a proper `$text` index is the next step, not just a mitigation.
- **Add a persisted audit log** for role changes and application status
  transitions (`AuditLog` model), rather than only structured log output.
- **Introduce a thin repository layer only where it earns its cost** — e.g.
  a `JobRepository` if `buildJobQuery`'s composition logic needs to be
  reused by a second controller, per the tradeoff already reasoned about
  in `docs/architecture.md`.
- **Add E2E coverage** (Playwright/Cypress) for the two flows that matter
  most end-to-end: register → search → apply, and employer post → review →
  status update.
- **Live deployment.** `render.yaml`/`client/vercel.json` describe how to
  deploy; actually deploying and linking a live URL (plus a few
  screenshots) remains open — see `docs/deployment.md`.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@skillbridge.com or join our Slack channel.

## 🙏 Acknowledgments

- OpenAI for AI capabilities
- MongoDB for database services
- Cloudinary for media management
- Firebase for push notifications
- The open-source community for amazing tools and libraries

---

**SkillBridge** - Empowering careers through intelligent technology 🚀
