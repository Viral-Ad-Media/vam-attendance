# VAM Attendance

A multi-tenant attendance management system for educators and institutions. VAM Attendance provides a marketing site, authentication, and an org-scoped dashboard for managing teachers, students, courses, sessions, enrollments, and attendance, with optional Stripe billing.

## Contents
1. Product Overview
2. Tech Stack
3. Project Structure
4. Local Development
5. Environment Variables
6. Database Setup
7. Auth, Orgs, and Roles
8. API Reference
9. UI Routes
10. Billing (Stripe)
11. Security Notes
12. Deployment
13. Known Gaps
14. Scripts and Verification
15. Security Migration

## Product Overview
- Multi-tenant, org-scoped attendance management.
- Admin dashboard for courses, sessions, enrollments, teachers, students, and attendance.
- Teacher dashboard with quick access to sessions and attendance.
- Attendance tracking with list and calendar views, KPIs, and charts.
- Supabase Auth + Postgres with Row Level Security (RLS).
- Optional Stripe subscription workflow.

## Tech Stack
- Next.js 16 App Router
- React 19
- Supabase (Auth + Postgres + RLS)
- Stripe (subscriptions + billing portal + webhooks)
- Tailwind CSS 4 + Radix UI
- Zod for input validation
- Recharts for dashboards

## Project Structure
- `app`: Next.js App Router pages and API routes.
- `app/api`: Server endpoints for auth, resources, and billing.
- `app/dashboard`: Admin and teacher dashboards.
- `components`: UI building blocks and layout.
- `lib`: Supabase clients, data access helpers, utilities.
- `database`: SQL schema and RLS policies.
- `public`: Static assets.

## Local Development
1. Install dependencies.
```
npm ci
```
2. Copy `.env.example` to `.env.local` and fill in the required values. Keep service-role, Stripe, and Resend keys server-side.
3. Start the dev server.
```
npm run dev
```
4. Visit `http://localhost:3000`.

## Environment Variables
| Name | Required | Description | Used By |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL | Supabase clients, middleware |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon public key | Supabase clients, middleware |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes for signup, teachers, invitations, feedback, billing, and superadmin | Service role key for admin operations | Signup flow, teacher creation, Stripe, service client |
| `NEXT_PUBLIC_APP_URL` | Recommended | Public base URL for redirects | Stripe checkout/portal, signup redirect |
| `VERCEL_URL` | Optional | Vercel-provided URL fallback | Signup redirect |
| `RESEND_API_KEY` | Optional (required for custom teacher setup email) | Resend API key used to send custom teacher setup emails | Teacher create/update password setup email |
| `TEACHER_SETUP_EMAIL_FROM` | Optional (required with `RESEND_API_KEY`) | From address for teacher setup email, e.g. `VAM Attendance <no-reply@yourdomain.com>` | Teacher create/update password setup email |
| `TEACHER_SETUP_EMAIL_REPLY_TO` | Optional | Reply-to address for teacher setup email | Teacher create/update password setup email |
| `EMAIL_FROM` | Optional fallback | Fallback sender if `TEACHER_SETUP_EMAIL_FROM` is not set | Teacher setup email fallback sender |
| `RESEND_FROM_EMAIL` | Optional | Preferred sender for invitation email | Invitation email |
| `STUDENT_FEEDBACK_EMAIL_FROM` | Optional (required unless another sender fallback is configured) | Sender for attendance feedback requests | Feedback email |
| `STUDENT_FEEDBACK_EMAIL_REPLY_TO` | Optional | Reply-to address for feedback requests | Feedback email |
| `STRIPE_SECRET_KEY` | Optional | Stripe secret key | Billing endpoints |
| `STRIPE_PRICE_ID` | Optional | Stripe price id for subscriptions | Checkout endpoint |
| `STRIPE_WEBHOOK_SECRET` | Optional | Stripe webhook secret | Webhook endpoint |

## Database Setup
1. Create a Supabase project.
2. Run the schema in `database/schema.sql` using the Supabase SQL editor.
3. Confirm RLS is enabled and policies are installed. The schema includes the latest authorization hardening.

For an existing installation, follow the Security Migration section instead of rerunning the full schema. The migration replaces policies on the listed application tables and leaves unrelated public tables untouched.

## Seed Data
- `database/seed-data/amazon-walmart-schedule.csv` contains the Amazon/Walmart schedule sheet as repo seed data.
- Preview the parsed seed plan:
```
npm run seed:amazon-walmart -- --dry-run
```
- Seed it into a specific organization:
```
SEED_ORG_ID=<organization-id> npm run seed:amazon-walmart
```
- The script reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `.env`/`.env.local`, creates teachers and students, groups matching coach/day/time rows into courses, generates eight sessions per course, then upserts enrollments and attendance.
- Optional settings: `SEED_START_DATE` defaults to `2026-01-05`; `SEED_TIMEZONE_OFFSET` defaults to `+00:00`.

## Schema Summary
- `organizations`: Tenant boundary, owned by a Supabase auth user.
- `memberships`: Org membership and roles (`owner`, `admin`, `teacher`, `student`, `viewer`).
- `invites`: Invite tokens for org membership, managed through `/dashboard/invites`.
- `subscriptions`: Stripe subscription state per org.
- `audit_logs`: Admin audit trail for mutations.
- `users`: Profile table tied to `auth.users`.
- `teachers`: Teacher directory; can map to auth users.
- `students`: Student directory.
- `courses`: Course definitions and metadata.
- `sessions`: Scheduled sessions (optionally tied to courses and teachers).
- `enrollments`: Student enrollment in courses.
- `attendance`: Attendance records per session + student.
- `student_feedback`: Internal notes and student-submitted session feedback.
- `student_feedback_requests`: Expiring, hashed-token feedback links tied to attendance records.

## Auth, Orgs, and Roles
- Signup (`POST /api/auth/signup`) creates an org, membership, and user profile using the service role key.
- `getRouteContext` validates the auth user with Supabase, selects the organization from `vam_active_org` before metadata defaults, and verifies membership or ownership. Cookies and user metadata are selection hints, never proof of access.
- Organization roles come from `memberships`. The legacy `owner` role is normalized to `admin` in application code.
- Platform `superadmin` privileges come only from server-managed `app_metadata.role`. Provision them through a trusted administrative workflow, never through signup or user-editable metadata.
- `middleware.ts` protects dashboard pages and restricts teacher navigation to the permitted teaching/profile/settings routes. RLS independently enforces access for direct Supabase requests.

| Capability | Org admin / owner | Teacher | Student / viewer |
| --- | --- | --- | --- |
| Read teaching data | Organization-wide | Own sessions/attendance and related assignments | Organization-wide read access |
| Manage teachers, students, courses, enrollments | Yes | No | No |
| Manage sessions and attendance | Yes | Own sessions only | No |
| Write feedback | Yes | Assigned students and related records | No |
| Manage invitations and membership roles | Yes | No | No |
| Open Stripe checkout or billing portal | Yes | No | No |

Platform superadmins may perform these operations in any selected organization. Subscription rows are writable only by trusted server workflows, including the verified Stripe webhook.

## API Reference
Authenticated endpoints return JSON and are org-scoped via Supabase RLS. Invitation validation and public feedback use expiring tokens; the billing webhook verifies a Stripe signature. Most endpoints use Zod validation and return standard errors from `lib/api/errors.ts`.

## Auth
- `POST /api/auth/signup` Create user, org, membership, and profile.
- `POST /api/auth/login` Sign in and set org cookies.
- `POST /api/auth/logout` Sign out and clear org cookies.

## Attendance
- `GET /api/attendance` List attendance. Supports `session_id` and `student_id` query params.
- `POST /api/attendance` Create a record. Rate limited.
- `GET /api/attendance/:id` Fetch a single record.
- `PATCH /api/attendance/:id` Update status or notes.
- `DELETE /api/attendance/:id` Delete a record.

## Students
- `GET /api/students`
- `POST /api/students` Create student. Rate limited.
- `GET /api/students/:id`
- `PATCH /api/students/:id`
- `DELETE /api/students/:id`

## Teachers
- `GET /api/teachers`
- `POST /api/teachers` Create teacher + Supabase auth user. Requires `SUPABASE_SERVICE_ROLE_KEY`.
- `GET /api/teachers/:id`
- `PATCH /api/teachers/:id`
- `DELETE /api/teachers/:id`

When `sendPasswordSetup` is enabled, teacher create/update now generates a recovery link with Supabase Admin API and sends a custom email through Resend (instead of Supabase default reset template).

## Courses
- `GET /api/courses`
- `POST /api/courses` Create course, auto-generate sessions, and seed attendance placeholders.
- `GET /api/courses/:id`
- `PATCH /api/courses/:id`
- `DELETE /api/courses/:id`

## Sessions
- `GET /api/sessions`
- `POST /api/sessions` Create session and seed attendance for enrolled students.
- `GET /api/sessions/:id`
- `PATCH /api/sessions/:id`
- `DELETE /api/sessions/:id`

## Enrollments
- `GET /api/enrollments`
- `POST /api/enrollments`
- `GET /api/enrollments/:id`
- `PATCH /api/enrollments/:id`
- `DELETE /api/enrollments/:id`

## Invites & Membership (Org Onboarding)
- `GET /api/invites` List pending and accepted organization invitations.
- `POST /api/invites` Create and send new invitation emails (requires `email`, `role`).
- `POST /api/invite/validate` Validate invitation token (returns invite details or error).
- `POST /api/invite/accept` Accept an unexpired invitation using the matching verified email. Existing membership roles are preserved.
- `GET /api/memberships` List current org members with roles and timestamps.
- `PATCH /api/memberships/:id` Change an organization role (admins only).
- `PATCH /api/superadmin/users/:id` Grant or revoke platform superadmin (existing superadmins only).

## Student Feedback
- `GET /api/student-feedback` List accessible feedback; supports student, teacher, course, session, category, and sentiment filters.
- `POST /api/student-feedback` Create internal feedback.
- `GET`, `PATCH`, `DELETE /api/student-feedback/:id` Read, update, or delete accessible feedback.
- `GET`, `POST /api/public/student-feedback/:token` Load or submit feedback through an expiring link.

## Account and Import
- `GET`, `PATCH /api/account/profile` Read or update the current profile.
- `GET`, `PATCH /api/account/settings` Read or update account preferences.
- `POST /api/import/students` Import CSV data, with a maximum of 1,000 rows (admins only).

## Feedback Requests
- `GET /api/student-feedback-requests` List feedback requests for org with status filtering.
- `PATCH /api/student-feedback-requests/:id` Resend feedback request email (action: `resend`), restricted to admins or the session’s teacher.
- `DELETE /api/student-feedback-requests/:id` Delete feedback request.

## Audit Logs
- `GET /api/audit` Fetch organization audit trail with filtering by `action`, `entity`, and `actor_id`.

## Billing (Stripe)
- `POST /api/billing/checkout` Create a Stripe Checkout session (admins only).
- `POST /api/billing/portal` Create a Stripe Billing Portal session (admins only).
- `POST /api/billing/webhook` Stripe webhook handler (Node runtime).
- `GET /api/billing/status` Read organization billing status.

## Admin dashboard
- `/dashboard/audit` Audit logs with filtering by action and entity
- `/dashboard/feedback-requests` Manage student feedback request workflows (resend, delete)
- `/dashboard/invites` Send and manage organization invitations
- `/dashboard/reports` Analytics and attendance reports
- `/dashboard/import-export` Bulk export to CSV and import templates
- `/` Landing page
- `/features`, `/pricing`, `/about`, `/contact`, `/privacy`, `/terms`
- `/login`, `/signup`

## Dashboard
- `/dashboard` Admin overview
- `/dashboard/attendance` Attendance management (list and calendar)
- `/dashboard/students`, `/dashboard/teachers`
- `/dashboard/courses`, `/dashboard/sessions`, `/dashboard/enrollments`
- `/dashboard/profile` Persistent account profile
- `/dashboard/settings` Persistent preferences and member management
- `/dashboard/teacher` Teacher view

## Billing (Stripe)
1. Create a product and recurring price in Stripe.
2. Set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET`.
3. Set `NEXT_PUBLIC_APP_URL` to your public base URL (used in checkout and portal redirects).
4. Add a webhook endpoint for `https://<your-domain>/api/billing/webhook` and subscribe to `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, and `checkout.session.completed`.

## Security Notes
- Postgres RLS enforces org scoping and role-based access (see `database/schema.sql`).
- Server routes validate payloads with Zod.
- API rate limiting uses an in-memory bucket (`lib/api/rate-limit.ts`).
- Security headers and CSP are defined in `next.config.ts`.

## Deployment

The Docker image uses Node.js 22 and the Next.js standalone output. To run locally with Docker:

```bash
docker compose --env-file .env.local up --build
```

The two `NEXT_PUBLIC_SUPABASE_*` values must be present at build time; they are included in the
browser bundle. Service-role, Resend, and Stripe secrets belong only in the runtime environment.
Configure `NEXT_PUBLIC_APP_URL` for invitation, feedback, password setup, and billing redirects.

- Set all required environment variables in your hosting provider.
- Ensure the Supabase schema and RLS policies have been applied.
- If using Stripe, configure the webhook and use the Node.js runtime (already set in the webhook route).

## Known Gaps

- The full ESLint check currently reports existing errors in legacy utilities and UI files; changed security files are linted separately.
- API rate limiting is in-memory and not suitable for multi-instance production without a shared store.
- CSV student import is wired to `/api/import/students`; other import types are not implemented.
- Student/viewer roles currently have organization-wide read access to teaching data; there is no per-student auth-to-student mapping.
- Feedback token submission currently uses separate insert/update operations; it is not a transactional, single-use database operation.

## Scripts and Verification
- `npm run dev` Start dev server
- `npm run build` Build for production
- `npm run start` Run production server
- `npm run lint` Run ESLint
- `npx tsc --noEmit` Check TypeScript types
- `npm run test:security` Run authorization and executable PostgreSQL regression tests using PGlite (no production credentials)
- `npm run seed:amazon-walmart` Seed Amazon/Walmart schedule demo data

## Security Migration (2026-10-05)

For existing databases, apply `database/migrations/20261005_authorization_tenant_isolation.sql`
as the database owner before deploying this change. Fresh installs include it in `database/schema.sql`.
The migration is transactional and repeatable. It aborts if existing related records cross
organization boundaries; inspect the named table/column and correct those records before retrying.
It replaces RLS policies on the listed application tables (review any custom policies first),
without touching other public tables. No records are deleted.

Platform superadmins must be provisioned through trusted `app_metadata.role` only; user metadata
never grants platform privileges. Organization switching is a selection hint verified against
membership or ownership. Teachers see their own sessions and attendance, assigned courses,
related students/enrollments, and feedback within those assignments. Student directory, course,
enrollment, and teacher administration is reserved for org admins. Teachers may manage their own
sessions and attendance and write feedback for their assigned students. Invitations are admin-only;
acceptance requires the matching verified email. Stripe subscription state is writable only by
trusted server workflows. Tenant IDs cannot be changed and related records must share a tenant.

Before rollout:
1. Run `npm ci`, `npm run test:security`, and `npx tsc --noEmit`.
2. Apply the migration in a staging database as the database owner, then verify admin and teacher workflows with separate accounts.
3. Apply the same migration to the production database before deploying the application changes.
4. Verify teacher attendance, invitation acceptance, and the billing workflow after deployment.

The migration tests cover fresh installs, repeat application, teacher assignment restrictions,
cross-tenant link rejection, existing cascade deletes, and safe failure when legacy data is inconsistent.
Tests do not access or change the deployed Supabase database.
