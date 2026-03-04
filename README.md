# VAM Attendance

A multi-tenant attendance management system for educators and institutions. VAM Attendance provides a marketing site, authentication, and an org-scoped dashboard for managing teachers, students, courses, sessions, enrollments, and attendance, with optional Stripe billing.

**Contents**
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

**Product Overview**
- Multi-tenant, org-scoped attendance management.
- Admin dashboard for courses, sessions, enrollments, teachers, students, and attendance.
- Teacher dashboard with quick access to sessions and attendance.
- Attendance tracking with list and calendar views, KPIs, and charts.
- Supabase Auth + Postgres with Row Level Security (RLS).
- Optional Stripe subscription workflow.

**Tech Stack**
- Next.js 16 App Router
- React 19
- Supabase (Auth + Postgres + RLS)
- Stripe (subscriptions + billing portal + webhooks)
- Tailwind CSS 4 + Radix UI
- Zod for input validation
- Recharts for dashboards

**Project Structure**
- `app`: Next.js App Router pages and API routes.
- `app/api`: Server endpoints for auth, resources, and billing.
- `app/dashboard`: Admin and teacher dashboards.
- `components`: UI building blocks and layout.
- `lib`: Supabase clients, data access helpers, utilities.
- `database`: SQL schema and RLS policies.
- `public`: Static assets.

**Local Development**
1. Install dependencies.
```
npm install
```
2. Create `.env.local` with the environment variables listed below.
3. Start the dev server.
```
npm run dev
```
4. Visit `http://localhost:3000`.

**Environment Variables**
| Name | Required | Description | Used By |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL | Supabase clients, middleware |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon public key | Supabase clients, middleware |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes for signup/teacher/billing | Service role key for admin operations | Signup flow, teacher creation, Stripe, service client |
| `NEXT_PUBLIC_APP_URL` | Recommended | Public base URL for redirects | Stripe checkout/portal, signup redirect |
| `VERCEL_URL` | Optional | Vercel-provided URL fallback | Signup redirect |
| `RESEND_API_KEY` | Optional (required for custom teacher setup email) | Resend API key used to send custom teacher setup emails | Teacher create/update password setup email |
| `TEACHER_SETUP_EMAIL_FROM` | Optional (required with `RESEND_API_KEY`) | From address for teacher setup email, e.g. `VAM Attendance <no-reply@yourdomain.com>` | Teacher create/update password setup email |
| `TEACHER_SETUP_EMAIL_REPLY_TO` | Optional | Reply-to address for teacher setup email | Teacher create/update password setup email |
| `EMAIL_FROM` | Optional fallback | Fallback sender if `TEACHER_SETUP_EMAIL_FROM` is not set | Teacher setup email fallback sender |
| `STRIPE_SECRET_KEY` | Optional | Stripe secret key | Billing endpoints |
| `STRIPE_PRICE_ID` | Optional | Stripe price id for subscriptions | Checkout endpoint |
| `STRIPE_WEBHOOK_SECRET` | Optional | Stripe webhook secret | Webhook endpoint |

**Database Setup**
1. Create a Supabase project.
2. Run the schema in `database/schema.sql` using the Supabase SQL editor.
3. Confirm RLS is enabled and policies are installed (the migration handles this).

**Schema Summary**
- `organizations`: Tenant boundary, owned by a Supabase auth user.
- `memberships`: Org membership and roles (`owner`, `admin`, `teacher`, `student`, `viewer`).
- `invites`: Invite tokens for org membership (not yet wired in UI).
- `subscriptions`: Stripe subscription state per org.
- `audit_logs`: Admin audit trail for mutations.
- `users`: Profile table tied to `auth.users`.
- `teachers`: Teacher directory; can map to auth users.
- `students`: Student directory.
- `courses`: Course definitions and metadata.
- `sessions`: Scheduled sessions (optionally tied to courses and teachers).
- `enrollments`: Student enrollment in courses.
- `attendance`: Attendance records per session + student.

**Auth, Orgs, and Roles**
- Signup (`POST /api/auth/signup`) creates an org, membership, and user profile using the service role key.
- Users are scoped to an org via `app_metadata` or `user_metadata` and a `vam_active_org` cookie.
- `lib/api/supabase.ts` (`getRouteContext`) enforces authentication and resolves the active org.
- `middleware.ts` protects dashboard routes and restricts teachers to `/dashboard/teacher`.

**API Reference**
All endpoints are JSON and org-scoped via Supabase RLS. Most endpoints use Zod validation and return standard errors from `lib/api/errors.ts`.

**Auth**
- `POST /api/auth/signup` Create user, org, membership, and profile.
- `POST /api/auth/login` Sign in and set org cookies.
- `POST /api/auth/logout` Sign out and clear org cookies.

**Attendance**
- `GET /api/attendance` List attendance. Supports `session_id` and `student_id` query params.
- `POST /api/attendance` Create a record. Rate limited.
- `GET /api/attendance/:id` Fetch a single record.
- `PATCH /api/attendance/:id` Update status or notes.
- `DELETE /api/attendance/:id` Delete a record.

**Students**
- `GET /api/students`
- `POST /api/students` Create student. Rate limited.
- `GET /api/students/:id`
- `PATCH /api/students/:id`
- `DELETE /api/students/:id`

**Teachers**
- `GET /api/teachers`
- `POST /api/teachers` Create teacher + Supabase auth user. Requires `SUPABASE_SERVICE_ROLE_KEY`.
- `GET /api/teachers/:id`
- `PATCH /api/teachers/:id`
- `DELETE /api/teachers/:id`

When `sendPasswordSetup` is enabled, teacher create/update now generates a recovery link with Supabase Admin API and sends a custom email through Resend (instead of Supabase default reset template).

**Courses**
- `GET /api/courses`
- `POST /api/courses` Create course, auto-generate sessions, and seed attendance placeholders.
- `GET /api/courses/:id`
- `PATCH /api/courses/:id`
- `DELETE /api/courses/:id`

**Sessions**
- `GET /api/sessions`
- `POST /api/sessions` Create session and seed attendance for enrolled students.
- `GET /api/sessions/:id`
- `PATCH /api/sessions/:id`
- `DELETE /api/sessions/:id`

**Enrollments**
- `GET /api/enrollments`
- `POST /api/enrollments`
- `GET /api/enrollments/:id`
- `PATCH /api/enrollments/:id`
- `DELETE /api/enrollments/:id`

**Billing (Stripe)**
- `POST /api/billing/checkout` Create a Stripe Checkout session.
- `POST /api/billing/portal` Create a Stripe Billing Portal session.
- `POST /api/billing/webhook` Stripe webhook handler (Node runtime).

**UI Routes**
**Public**
- `/` Landing page
- `/features`, `/pricing`, `/about`, `/contact`, `/privacy`, `/terms`
- `/login`, `/signup`

**Dashboard**
- `/dashboard` Admin overview
- `/dashboard/attendance` Attendance management (list and calendar)
- `/dashboard/students`, `/dashboard/teachers`
- `/dashboard/courses`, `/dashboard/sessions`, `/dashboard/enrollments`
- `/dashboard/profile` Profile UI (local state placeholder)
- `/dashboard/settings` Settings UI (local state placeholder)
- `/dashboard/teacher` Teacher view

**Billing (Stripe)**
1. Create a product and recurring price in Stripe.
2. Set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET`.
3. Set `NEXT_PUBLIC_APP_URL` to your public base URL (used in checkout and portal redirects).
4. Add a webhook endpoint for `https://<your-domain>/api/billing/webhook` and subscribe to `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, and `checkout.session.completed`.

**Security Notes**
- Postgres RLS enforces org scoping and role-based access (see `database/schema.sql`).
- Server routes validate payloads with Zod.
- API rate limiting uses an in-memory bucket (`lib/api/rate-limit.ts`).
- Security headers and CSP are defined in `next.config.ts`.

**Deployment**
- Set all required environment variables in your hosting provider.
- Ensure the Supabase schema and RLS policies have been applied.
- If using Stripe, configure the webhook and use the Node.js runtime (already set in the webhook route).

**Known Gaps**
- `/dashboard/profile` and `/dashboard/settings` are UI-only and do not persist data yet.
- Invite workflows (`invites` table) are not wired to UI.
- API rate limiting is in-memory and not suitable for multi-instance production without a shared store.

**Scripts**
- `npm run dev` Start dev server
- `npm run build` Build for production
- `npm run start` Run production server
- `npm run lint` Run ESLint
