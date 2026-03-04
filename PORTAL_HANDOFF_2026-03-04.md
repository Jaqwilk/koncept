# Koncept Agency Portal Handoff

Date: 2026-03-04

## Current project context

This repository started as a static marketing site:

- plain HTML pages
- shared CSS in `css/style.css`
- shared JS in `js/main.js`
- no framework
- no database
- no authentication
- no backend API

To support a real secure client portal, a backend/application layer was added into the same repo rather than faking the feature on the client side.

## What was built

### 1. Portal UI

A new portal was added under:

- `portal/index.html`
- `portal/project/index.html`
- `portal/admin/index.html`
- `portal/login/index.html`
- `portal/invite/index.html`
- `portal/portal.css`
- `portal/shared.js`

Implemented portal areas:

- login
- invite activation
- dashboard
- project workspace
- admin panel

Project workspace tabs implemented:

- overview
- materials
- timeline
- feedback
- messages
- files
- invoices
- approvals

### 2. Backend/API

New Vercel-style API handlers were added under `api/`.

Important files:

- `api/auth-login.js`
- `api/auth-logout.js`
- `api/auth-me.js`
- `api/auth-invite.js`
- `api/auth-accept-invite.js`
- `api/dashboard.js`
- `api/admin-overview.js`
- `api/admin-projects.js`
- `api/project-workspace.js`
- `api/project-brief.js`
- `api/project-tasks.js`
- `api/project-messages.js`
- `api/project-feedback.js`
- `api/project-approvals.js`
- `api/project-stages.js`
- `api/project-files.js`
- `api/project-invoices.js`
- `api/notifications.js`
- `api/file-download.js`

Shared backend helpers:

- `api/_lib/auth.js`
- `api/_lib/db.js`
- `api/_lib/http.js`
- `api/_lib/permissions.js`
- `api/_lib/activity.js`
- `api/_lib/email.js`
- `api/_lib/notifications.js`
- `api/_lib/tasks.js`
- `api/_lib/project-queries.js`
- `api/_lib/storage.js`
- `api/_lib/constants.js`

### 3. Database/data model

Prisma was added:

- `prisma/schema.prisma`
- `prisma/seed.js`

Core entities modeled:

- users
- invites
- projects
- project members
- brief
- tasks
- milestones
- project stages
- files
- file comments
- message threads
- messages
- feedback
- approvals
- invoices
- notifications
- activity logs

### 4. Deployment/runtime files

Added:

- `package.json`
- `.env.example`
- `vercel.json`

### 5. Public site integration

Portal links were added into the public site nav/footer:

- `index.html`
- `uslugi.html`
- `portfolio.html`
- `o-mnie.html`
- `kontakt.html`
- `polityka-prywatnosci.html`

### 6. Documentation

`README.md` was updated with:

- new architecture
- env vars
- install steps
- seed accounts
- API overview
- testing steps

## Product behavior implemented

### Roles

- `ADMIN`
- `TEAM_MEMBER`
- `CLIENT`

### Access control

- clients only see their own projects
- team/admin can manage projects they are assigned to
- admin has full access
- internal project notes/messages are hidden from clients at the API layer

### Dashboard

Dashboard shows:

- active projects
- completed projects
- pending tasks
- notifications
- recent activity
- pending approvals

### Project workspace

Implemented features:

- project overview
- brief editing
- checklist/task tracking
- project milestones
- project stage timeline
- feedback creation and resolution
- project messaging
- file hub
- invoice listing
- approval workflow

### Materials system

Implemented:

- upload by category/folder
- comments per file
- replace file flow
- version tracking in backend
- protected file download

### Invoices

Implemented v1 invoice flow:

- admin/team uploads invoice PDF
- invoice status is tracked manually
- client can download invoice PDF

### Notifications/activity

Implemented:

- in-app notifications
- activity log entries for important actions
- optional email hooks through Resend

## Security/hardening already done

- HTTP-only session cookie
- auth required for portal APIs
- project membership checks on project-scoped endpoints
- protected file download route
- no direct client-side access to other clients’ project data
- internal messages filtered out for clients server-side
- upload size and MIME allowlist
- security headers added in `vercel.json`

## Checks that were run

Completed:

- `npm install`
- `node --check` on portal/api JS files
- `npx prisma validate`
- `npm run prisma:generate`
- import-level API module load check

Not completed:

- no real database migration run
- no real seed run against a configured DB
- no live Vercel deployment
- no live Blob upload test
- no live Resend email test
- no browser E2E pass in production

## Important things still to do before real deployment

### Required for deployment

1. Provision a real PostgreSQL database.
2. Provision Vercel Blob.
3. Provision Resend if invite/email notifications are required.
4. Set production environment variables in Vercel.
5. Run Prisma migration against the real database.
6. Decide whether to run the current demo seed in production.

### Strongly recommended before public launch

1. Replace placeholder legal/business/profile content still present on the public site.
2. Replace the fake contact form behavior with a real backend flow.
3. Fix remaining navigation ARIA misuse (`menubar` / `menuitem`) on the marketing site.
4. Test portal flows in a real deployed environment.
5. Add a safer production seed strategy.

## Current deployment env vars needed

From `.env.example`:

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `APP_BASE_URL`
- `BLOB_READ_WRITE_TOKEN`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `ENABLE_EMAIL_NOTIFICATIONS`
- `MAX_UPLOAD_MB`

## Current demo accounts

Defined in `prisma/seed.js`:

- `admin@koncept.pl` / `demo12345`
- `team@koncept.pl` / `demo12345`
- `client@koncept.pl` / `demo12345`

These are useful for local/dev only.

## Recommended next steps

### Immediate next step

Make deployment safe:

1. create a production-safe seed or remove demo seed accounts from production flow
2. configure env vars
3. run migrations
4. deploy to Vercel

### Then do a production-hardening pass

Recommended scope:

1. replace placeholder public-site legal/profile/contact content
2. implement real contact form submission backend
3. fix accessibility issues in public nav semantics
4. run real mobile/desktop QA on the portal
5. run full end-to-end test of:
   - login
   - invite activation
   - file upload
   - brief update
   - feedback
   - approvals
   - invoice upload/download
   - notifications

## Suggested commands for next session

```bash
cd /Users/natansmogor/koncept-agency
npm install
cp .env.example .env
```

After env is configured:

```bash
npm run prisma:migrate
npm run seed
npm run dev
```

## Notes for the next engineer/agent

- The repo is no longer just a static site; it now expects Vercel serverless APIs plus Prisma/Postgres.
- The implementation intentionally preserves the current marketing pages instead of migrating the whole site into a JS framework.
- The portal is integrated visually but operationally separate under `/portal`.
- If deployment target changes away from Vercel, the `api/` and Blob assumptions will need adaptation.
