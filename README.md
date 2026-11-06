# VAM Attendance

An attendance workspace for managing organizations, teachers, students, courses, sessions,
enrollments, attendance, and student feedback. The application includes a marketing website,
protected administrator and teacher dashboards, email workflows, CSV import/export, reports,
and optional Stripe subscriptions.

## Stack

- Next.js 16, React 19, TypeScript, Tailwind CSS 4, and Radix UI
- **Neon PostgreSQL** accessed from server routes using `pg`
- **Better Auth** hosted inside the Next.js application, with database-backed sessions
- Resend for email verification, password recovery, invitations, and student feedback
- Stripe for optional subscriptions and customer billing portal

Supabase is not a runtime dependency. Historical SQL lives under `database/legacy` and
`database/migrations` only to document the previous deployment. Do not apply those historical
Supabase migrations to Neon.

## Local setup

Use Node.js 22.13 or newer and npm.

```bash
npm ci
cp .env.example .env.local
openssl rand -base64 32
```

Put the generated value in `BETTER_AUTH_SECRET`, and configure the remaining required values:

| Variable                                                        | Purpose                                                                      |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `DATABASE_URL`                                                  | Pooled Neon PostgreSQL URL for the application; use TLS                      |
| `DATABASE_URL_UNPOOLED`                                         | Direct Neon URL for schema migration and importing existing data             |
| `BETTER_AUTH_URL`                                               | Public application origin, including scheme; localhost for local development |
| `BETTER_AUTH_SECRET`                                            | Persistent, randomly generated secret of at least 32 characters              |
| `NEXT_PUBLIC_APP_URL`                                           | Public origin used for invitation, feedback, and billing links               |
| `RESEND_API_KEY`                                                | Email delivery credential                                                    |
| `RESEND_FROM_EMAIL` or `EMAIL_FROM`                             | Verified sender address                                                      |
| `TEACHER_SETUP_EMAIL_FROM`                                      | Optional fallback sender for account setup                                   |
| `STUDENT_FEEDBACK_EMAIL_FROM`                                   | Optional feedback sender                                                     |
| `STUDENT_FEEDBACK_EMAIL_REPLY_TO`                               | Optional feedback reply-to address                                           |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` | Optional subscription configuration                                          |
| `SEED_ORG_ID`, `SEED_START_DATE`, `SEED_TIMEZONE_OFFSET`        | Optional demo-data settings                                                  |

Keep credentials out of git. PostgreSQL credentials and the Better Auth secret are server-only;
there are no public database keys or Supabase build arguments.

```bash
npm run db:migrate
npm run dev
```

The schema command applies `database/schema.sql` atomically, uses an advisory lock, and records
its version in `vam_migrations`. Running it again skips an already-applied version. Use the direct
Neon connection for migrations. Do not use this command to modify an existing Supabase database.

## Authentication

- Sign up creates the auth identity, credential, organization, owner membership, and profile in
  one PostgreSQL transaction. Email verification follows account creation; delivery failure
  leaves the account intact so verification can be retried by signing in.
- Sign in, sign out, session validation, verification, and reset tokens use Better Auth.
- Sessions use HTTP-only cookies, secure cookies in production, and database validation.
- Password recovery uses expiring, single-use tokens and invalidates active sessions after reset.
- Teacher account setup uses the same password recovery mechanism. Administrators can create
  linked teacher accounts and update passwords; identity changes invalidate active sessions.
- Direct Better Auth signup is disabled so identities cannot be created without an organization.
- New passwords use Better Auth's scrypt hashing. The verifier also accepts imported bcrypt
  passwords from the previous identity system. Accounts without a password require recovery.
- Verification and recovery require a working Resend sender. No email delivery is simulated in production.

## Permissions and tenant boundaries

Every protected API validates the Better Auth session and resolves the organization against
membership or ownership. The active-organization cookie is a selection hint. Platform superadmin
status comes only from server-managed `auth_users.app_metadata`, never user-editable metadata.

| Capability                                      | Org admin / owner | Teacher                                        | Student / viewer              |
| ----------------------------------------------- | ----------------- | ---------------------------------------------- | ----------------------------- |
| Read teaching data                              | Organization-wide | Assigned teaching records                      | Organization-wide read access |
| Manage teachers, students, courses, enrollments | Yes               | No                                             | No                            |
| Manage sessions and attendance                  | Yes               | Own assigned sessions                          | No                            |
| Write feedback                                  | Yes               | Assigned students and related teaching records | No                            |
| Manage invitations and organization roles       | Yes               | No                                             | No                            |
| Open Stripe checkout or portal                  | Yes               | No                                             | No                            |

Server data queries run in independent transactions with `SET LOCAL ROLE authenticated` and a
transaction-local `app.user_id`. Existing PostgreSQL RLS policies enforce organization and teacher
access. Role and identity reset at the transaction boundary before a pooled connection is reused.
Auth credential/session tables are inaccessible to the data role. Privileged server workflows
use a separate code path, with authorization checks before invoking account or billing operations.

Tenant IDs are immutable. Database triggers reject links to records from another organization,
including when privileged server jobs write data. These checks retain normal FK cascade behavior.
HTTP request-origin checks protect browser mutations; Stripe webhooks use signature verification.

## Migration from the previous database

1. Create a dedicated Neon project and choose its production branch. Test the schema and import
   on an isolated Neon branch before production cutover.
2. Apply the Neon schema with `npm run db:migrate`.
3. Set `SOURCE_DATABASE_URL` to the **direct** PostgreSQL connection for the previous database,
   and `DATABASE_URL_UNPOOLED` to the **direct** destination connection. Do not commit either value.
4. Pause application writes during the final copy to avoid changes after the source snapshot.
5. Run `npm run db:import` and inspect the printed counts.
6. Configure the runtime variables in Render, build and deploy the application, then verify login,
   protected APIs, teacher attendance, invitations, email verification/recovery, and billing if enabled.
7. Keep the previous database available until data counts and real user workflows have been verified.

The importer uses a consistent, read-only source snapshot and a single destination transaction.
It refuses a populated destination, preserves UUIDs and organization relationships, copies all
application tables that exist in the source, and validates row counts before committing.
Unsupported password formats abort the import. It does not print password hashes, transfer legacy
sessions, delete source data, or turn user metadata into platform privileges. Users must sign in again.
OAuth-only accounts need a password reset or a separately configured social provider.

Live migration/deployment is a separate operational step: code and passing local tests do not mean
production data has been copied or Render environment variables have been updated.

## Application routes

Public pages: `/`, `/features`, `/pricing`, `/about`, `/contact`, `/privacy`, `/terms`, `/login`,
`/signup`, `/forgot-password`, `/auth/reset-password`, `/invite/:token`, and `/feedback/:token`.

Protected pages under `/dashboard` include attendance, students, teachers, courses, sessions,
enrollments, feedback, feedback requests, invitations, reports, audit, CSV import/export, billing,
profile, settings, and the teacher dashboard. The dashboard's server layout validates the session;
a cookie in middleware alone does not grant access.

## API overview

| Area              | Endpoints                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| Authentication    | `POST /api/auth/signup`, `/login`, `/logout`, `/forgot-password`; Better Auth endpoints under `/api/auth/*` |
| Session           | `GET /api/auth/get-session`                                                                                 |
| Health            | `GET /api/health`; returns 503 when configuration or database schema is unavailable                         |
| Directory         | CRUD `/api/students`, `/api/teachers`, and `/:id`                                                           |
| Teaching          | CRUD `/api/courses`, `/api/sessions`, `/api/enrollments`, and `/:id`                                        |
| Attendance        | CRUD `/api/attendance` and `/:id`; GET/POST `/api/sessions/:id/attendance-bulk`                             |
| Feedback          | CRUD `/api/student-feedback` and `/:id`; public GET/POST `/api/public/student-feedback/:token`              |
| Feedback requests | GET/POST `/api/student-feedback-requests`; PATCH/DELETE `/:id`                                              |
| Invitations       | GET/POST `/api/invites`; POST `/api/invite/validate` and `/api/invite/accept`                               |
| Members           | GET `/api/memberships`; PATCH `/api/memberships/:id`                                                        |
| Platform roles    | PATCH `/api/superadmin/users/:id` (superadmins only)                                                        |
| Account           | GET/PATCH `/api/account/profile` and `/api/account/settings`                                                |
| Import            | POST `/api/import/students` (CSV, maximum 1,000 rows)                                                       |
| Reports           | GET `/api/audit` and `/api/students/at-risk`                                                                |
| Billing           | POST `/api/billing/checkout`, `/portal`, `/webhook`; GET `/api/billing/status`                              |

Invitation acceptance requires the matching verified email. Existing membership roles are preserved.
Attendance edits use protected server APIs. Attendance refreshes every 30 seconds while the page
is visible and when the window regains focus; there is no Supabase Realtime connection.

## Deployment on Render

Use the repository Dockerfile. Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to
`https://vam-attendance.onrender.com` (or the verified custom production origin). Set the pooled
`DATABASE_URL` and persistent `BETTER_AUTH_SECRET` as runtime environment variables. Build images
without production credentials. Supply email and billing secrets only to the runtime.

Run migrations before deploying the application, using a direct connection. Set the service's
HTTP health-check path to `/api/health`; a listening container alone does not prove readiness.
Do not generate a new Better Auth secret on every deploy or boot.

For local Docker:

```bash
docker compose --env-file .env.local up --build
```

Stripe webhooks should subscribe to `customer.subscription.created`, `customer.subscription.updated`,
`customer.subscription.deleted`, and `checkout.session.completed` at `/api/billing/webhook`.

## Verification and scripts

```bash
npm run test:security
npx tsc --noEmit
npm run build
```

Security tests execute PostgreSQL policies and tenant triggers using PGlite. They also test
parameterized SQL, imported password verification, real Better Auth session/recovery operations,
and cross-origin request rejection. Tests do not use production credentials or modify Neon.

Other commands: `npm run dev`, `npm run start`, `npm run lint`, and
`npm run seed:amazon-walmart -- --dry-run`. The seed script supports `SEED_ORG_ID` for writing demo
schedule data into a chosen Neon organization.

## Current limitations

- Student/viewer roles have organization-wide teaching-data read access; there is no per-student
  auth-to-student mapping yet.
- Rate limiting on custom signup/recovery routes uses an in-memory store; multi-instance
  deployments need a shared rate-limit store.
- Internal student-feedback creation and feedback-token submission are separate workflows; public
  token submission is not yet a single atomic insert-and-consume database operation.
- Profile/settings persist, but notification preferences are not an implementation of MFA.
- Existing unrelated lint findings in older UI and utility code are tracked separately.
