# Family Care Hub: Master Specification (v2: Neon + Upstash + Vercel + custom auth)

> CodeBenders ACE Builders' Hackathon 2026, Problem Statement 4 (Health and Family Care).
> Commit this file to the repo root as `CLAUDE.md`. Every build prompt refers to it. It replaces the earlier Supabase-based spec.
> Repo: https://github.com/anisarve2006/CodeBender-Hackathon.git

---

## 0. How the AI agent must work
1. Plan before coding; build one milestone at a time; run lint, typecheck, tests and build before every commit; use Conventional Commits.
2. No secrets in code. Everything goes through environment variables validated in `lib/env.ts`; `.env.example` is committed.
3. When a choice is ambiguous, pick the simplest option that scales, log it in `docs/DECISIONS.md`, and continue.
4. Respect file ownership in `docs/COLLABORATION.md` (two-person team).

---

## 1. Product summary and guardrails
**Problem:** care for an elderly or chronically ill parent is scattered across siblings in different cities, prescriptions, reports and appointments; things get missed.
**Users:** adult children coordinating care for a relative (the care recipient).
**North-star test:** a sibling 2,000 km away understands the state of care in **10 seconds**: what is overdue, what is next, who owns it.

**Mandatory features:** shared records and a timeline (appointments, prescriptions, reports); task assignment, reminders, and a refill / appointment tracker; role-based access; a clear "who did what, and what is still pending" view.

**Guardrails (non-negotiable):**
- The product organises information only. It never diagnoses, interprets results, suggests dosages or gives medical advice. Medicine instructions are stored and shown **verbatim** as written on the prescription.
- A persistent footer disclaimer: *"Family Care Hub organises information only and does not provide medical advice. Always consult a doctor."*
- Notifications (email, push) never contain medicine names, diagnoses or document titles.
- **Synthetic data only**, with fake names, `example.com` emails and documents watermarked "SAMPLE – NOT REAL DATA".

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| App | **Next.js (latest stable, App Router) + TypeScript strict**, Server Components + Server Actions |
| UI | Tailwind CSS + shadcn/ui + lucide-react, `next-themes` (dark mode), sonner toasts |
| Forms / validation | React Hook Form + Zod (schemas shared by client and server) |
| Client cache | TanStack Query |
| Database | **Neon serverless Postgres**, region `aws-ap-southeast-1` (Singapore, the closest Neon region to India) |
| DB access | **Drizzle ORM** + `@neondatabase/serverless` (`Pool` over WebSockets, so transactions work) + `drizzle-kit` migrations |
| Auth | **Custom, built in-house** (Section 6): email + password with Argon2id, database sessions, email verification, password reset, optional TOTP 2FA |
| Cache, rate limiting, live-update signals | **Upstash Redis** (`@upstash/redis`, `@upstash/ratelimit`), region Singapore |
| Scheduled and background jobs | **Upstash QStash** schedules calling signed Vercel route handlers |
| File storage | **Vercel Blob, private store** (`@vercel/blob` ≥ 2.3, `access: 'private'`, short-lived signed URLs) |
| Hosting | **Vercel**, functions region `sin1` (same city as the database), preview deploy per PR |
| Email | Resend (or Gmail SMTP via Nodemailer as a fallback); required for verification, password reset and reminders |
| Push | Web Push with VAPID keys (`web-push`), no third-party service |
| Testing / CI | Vitest, Playwright, GitHub Actions with a Postgres service container |

---

## 3. Architecture

```
Browser / installable PWA
   │ HTTPS (session cookie __Host-fch_session)
   ▼
Vercel (region sin1)
 ├─ proxy/middleware: cheap cookie-presence check + security headers
 ├─ Server Components / Server Actions → Data Access Layer (lib/data/*)
 │     requireUser() → requireCircleRole() → withUserTx(userId, tx => …)
 │        SET LOCAL app.user_id = <user>   ← Postgres RLS enforces again
 ├─ /api/circles/[id]/version  ← polled every 10 s for live updates
 ├─ /api/documents/[id]/url    ← permission check, then 60 s signed Blob URL
 └─ /api/jobs/*                ← called only by QStash (signature verified)
   │                 │                     │
   ▼                 ▼                     ▼
Neon Postgres     Upstash Redis          Vercel Blob (private)
(Singapore)       rate limits, session   medical documents
 RLS + triggers   cache, circle version
 audit log        counters
                  Upstash QStash ── schedules → /api/jobs/send-reminders (15 min),
                                     refill-checker (daily), daily-digest (daily),
                                     escalation (hourly)
                         └→ Resend email / Web Push
```

**Principles**
- **Defence in depth.** Every query goes through the Data Access Layer (DAL), which checks the session and circle role. The app connects as a restricted Postgres role (`app_user`) and sets `app.user_id` in each transaction, so **Row Level Security** blocks anything the DAL misses.
- **Privileged connection is quarantined.** The Neon owner role is used only by migrations, the seed script, `lib/auth/*` (login needs to read password hashes before a user is known) and `/api/jobs/*`. It is imported only from `server-only` modules.
- **Stateless app tier.** Sessions are in Postgres (cached briefly in Redis); any Vercel instance can serve any request.
- **Append-only audit log** written by Postgres triggers using `app.user_id`.
- **Idempotent jobs.** Jobs use `FOR UPDATE SKIP LOCKED` and `sent_at` markers, so retries never double-send.
- **Live updates without websockets.** Each mutation increments a Redis counter `cv:{circleId}`; clients poll a tiny endpoint every 10 s (only while the tab is visible) and refetch when the number changes. This is cheap, works on serverless and scales.

---

## 4. Data model (Drizzle schema in `db/schema/*.ts`, one file per domain)

UUID primary keys (`gen_random_uuid()`), `timestamptz` everywhere (store UTC, display `Asia/Kolkata` or the user's timezone), `created_at`, `updated_at`, `created_by`, `deleted_at` (soft delete) on user content.

```
-- Identity and auth (accessed only by lib/auth via the owner connection)
users (id, email citext unique, email_verified_at, password_hash, full_name, phone, avatar_url,
       timezone default 'Asia/Kolkata', notification_prefs jsonb, failed_login_count, locked_until,
       totp_secret_enc, totp_enabled, created_at, updated_at)
sessions (id text PK = sha256(token), user_id, expires_at, last_seen_at, user_agent, ip_hash, created_at)
auth_tokens (token_hash PK, user_id, purpose enum('verify_email','reset_password'), expires_at, used_at)
member_profiles VIEW (id, full_name, avatar_url, timezone) limited to users who share a circle with app.user_id

-- Circles
care_circles (id, name, consent_confirmed_at, consent_confirmed_by, created_by, ...)
care_recipients (id, circle_id unique, full_name, date_of_birth, blood_group, allergies text[],
                 emergency_contact jsonb, primary_doctor jsonb, notes)
circle_members (circle_id, user_id, role, relationship, city, invited_by, joined_at, PK(circle_id,user_id))
invitations (id, circle_id, email, role, token_hash, expires_at, accepted_at, invited_by)

-- Records (organisational only)
appointments (id, circle_id, title, doctor_name, specialty, location, starts_at, ends_at, status,
              accompanied_by, notes, sensitivity)
medications (id, circle_id, name, strength, form, instructions_as_written, prescribed_by,
             prescription_id, start_date, end_date, is_active)
prescriptions (id, circle_id, document_id, prescribed_on, doctor_name, notes)
refills (id, circle_id, medication_id, quantity_on_hand, daily_usage, last_refilled_on,
         next_refill_due, assigned_to, status)
documents (id, circle_id, kind, title, blob_pathname, mime_type, size_bytes, checksum_sha256,
           report_date, sensitivity, uploaded_by)
restricted_document_grants (document_id, user_id, granted_by, created_at)

-- Coordination
tasks (id, circle_id, title, description, category, priority, status, due_at, assigned_to,
       completed_by, completed_at, linked_entity_type, linked_entity_id, recurrence_rule)
task_comments (id, task_id, circle_id, author_id, body, created_at)
updates (id, circle_id, author_id, body, mood_tag, created_at)
reminders (id, circle_id, target_user_id, kind, channel, entity_type, entity_id, remind_at,
           payload jsonb, sent_at, attempt_count, last_error)
push_subscriptions (id, user_id, endpoint unique, p256dh, auth, created_at)

-- Accountability (append-only)
activity_log (id bigserial, circle_id, actor_id, action, entity_type, entity_id, summary, diff jsonb, created_at)
document_access_log (id bigserial, document_id, circle_id, user_id, action, accessed_at)
```

**Enums:** `circle_role` (owner, coordinator, caregiver, viewer, care_recipient); `sensitivity_level` (normal, restricted); `task_status` (todo, in_progress, done, cancelled); `task_category` (medication, appointment, errand, payment, paperwork, other); `task_priority` (low, normal, high); `appt_status` (scheduled, completed, missed, rescheduled, cancelled); `refill_status` (ok, due_soon, overdue, ordered, refilled); `doc_kind` (prescription, lab_report, scan, discharge_summary, insurance, bill, other); `reminder_kind` (task_due, appointment, refill, nudge, digest, escalation); `notification_channel` (email, push, in_app).

**Indexes:** partial `(circle_id, due_at) WHERE status IN ('todo','in_progress') AND deleted_at IS NULL` on tasks; `(circle_id, starts_at)` on appointments; `(circle_id, created_at DESC)` on activity_log and updates; `(remind_at) WHERE sent_at IS NULL` on reminders; `(circle_id, next_refill_due)` on refills; `(user_id)` and `(expires_at)` on sessions; GIN trigram on `documents.title` and `tasks.title`; an index on every foreign key.

**SQL functions (shared contracts, `SECURITY INVOKER`, so RLS applies):** `circle_dashboard(circle)`, `who_did_what(circle, from, to)`, `circle_timeline(circle, cursor, kinds, limit)`, `claim_task(task)`, `complete_task(task)`, `enqueue_reminder(...)` (idempotent). Exact shapes are in `docs/DATA_MODEL.md`.

---

## 5. Roles and permissions

| Capability | Owner | Coordinator | Caregiver | Viewer | Care recipient |
|---|---|---|---|---|---|
| Manage members and roles | ✅ | Invite only | ❌ | ❌ | ❌ |
| View dashboard and timeline | ✅ | ✅ | ✅ | ✅ | ✅ (simplified) |
| Create/edit appointments, medicines, refills | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create and assign tasks | ✅ | ✅ | Self only | ❌ | ❌ |
| Complete tasks assigned to them / claim unassigned | ✅ | ✅ | ✅ | ❌ | ❌ |
| View normal documents | ✅ | ✅ | ✅ | ✅ | ✅ |
| View restricted documents | ✅ | ✅ | If granted | ❌ | If granted |
| Delete records | ✅ | ✅ (soft) | Own uploads | ❌ | ❌ |
| View activity log | ✅ | ✅ | ✅ | ✅ | ❌ |
| Export / delete circle | ✅ | ❌ | ❌ | ❌ | ❌ |

Enforced three times: UI hiding (`can()`), DAL checks (`requireCircleRole()`), and Postgres RLS (`app_uid()` + `is_circle_member()` / `has_circle_role()` helpers). The last owner cannot leave or be demoted.

---

## 6. Custom authentication (built in-house)

- **Sign up:** email, full name, password (min 10 chars, max 128, not in a common-password list; strength meter in the UI). Hash with **Argon2id** (`@node-rs/argon2`, memoryCost ≥ 19 MiB, timeCost 2). Send a verification link (token: 32 random bytes, only its SHA-256 stored, 24 h, single use). Unverified users can sign in but cannot create or join circles until verified.
- **Sign in:** generic error "Email or password is incorrect" (no user enumeration). Rate-limit per IP and per email with Upstash; after 5 failures lock for 15 minutes; always run a dummy hash when the user doesn't exist (constant-ish time).
- **Sessions:** 32 random bytes encoded base64url in cookie `__Host-fch_session` (`HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`); database stores only `sha256(token)`; 30-day sliding expiry, extended when under 15 days remain; session lookups cached in Redis for 60 s and evicted on logout. Rotate the session on login, password change and 2FA change.
- **Password reset:** request page always says "If an account exists, we sent a link"; token 30 min, single use; on reset, delete all the user's sessions.
- **Account security page:** change password, list active sessions (device, last seen) and revoke them, sign out everywhere, optional **TOTP 2FA** (`otplib`; secret encrypted with AES-256-GCM using `AUTH_ENCRYPTION_KEY`; 10 one-time recovery codes stored hashed).
- **CSRF:** Server Actions get Next.js's built-in origin check; route handlers that change data check the `Origin` header; cookies are `SameSite=Lax`.
- **The proxy/middleware only checks that the cookie exists** (fast redirect). Real validation happens in `requireUser()` on the server.

---

## 7. Security and privacy
DPDP Act 2023 principles (consent, purpose limitation, erasure) and OWASP Top 10.
- Strict CSP, HSTS, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `poweredByHeader: false`.
- Zod validation on every input; Drizzle parameterised queries only; plain-text user content.
- Files: private Blob store, MIME check by magic bytes (`file-type`), allow PDF/JPEG/PNG/HEIC, 10 MB, strip EXIF (`sharp`), SHA-256 checksum, 60-second signed URLs, every view logged.
- Rate limits (Upstash): sign-up, sign-in, reset request, invites, uploads, nudges, version polling.
- Consent checkbox on circle creation (timestamp stored). Owner can export (JSON + documents ZIP) and permanently delete a circle.
- Data stored in Singapore (Neon has no India region); record this in `docs/DECISIONS.md` and the privacy note.
- gitleaks in CI; `.env*.local` ignored.

---

## 8. UX requirements
Mobile-first, calm, low cognitive load; WCAG 2.2 AA; ≥ 44 px touch targets; 16 px base font; dark mode; `prefers-reduced-motion`; skeleton loaders; friendly empty states; relative times in the viewer's timezone.

**Navigation:** Home (Status Board), Timeline, Tasks, Meds & Refills, Family, plus Settings. Bottom nav on mobile, sidebar on desktop. A floating Quick Add button offers Task / Appointment / Upload / Update.

**Status Board (the 10-second view):** a traffic-light status banner (colour + icon + text), Next up appointment with "Add to calendar", Needs attention (overdue tasks, refills due ≤ 3 days) with one-tap actions (Mark done, I'll take it, Nudge), Who's on what per member, Recent activity, Latest family update.

**Other:** a 3-step onboarding wizard, WhatsApp share for invites, care-recipient mode (large text, today's medicines, next appointment, call family), installable PWA with read-only offline cache.

---

## 9. Workflows
1. Sign up → verify email → create circle (consent) → care recipient profile → invite members → they sign up or sign in → accept → Status Board.
2. Appointment: schedule → optional auto-tasks (prepare documents, accompany) → reminders 24 h and 2 h before → "How did it go?" after → timeline.
3. Prescription → medicines (verbatim instructions) → refill countdown → `due_soon` (≤ 5 days) / `overdue` → auto-task + reminders → ordered → refilled.
4. Task: create → assign/claim → comments → reminders → complete (`completed_by`, `completed_at`) → activity and who-did-what; simple recurrence.
5. Daily digest email at 20:00 IST; escalation to the coordinator when a task is overdue by > 24 h.

---

## 10. Performance and scalability
- Status Board = one SQL function call; p95 server time < 300 ms from `sin1`.
- Cursor pagination everywhere (never OFFSET); `revalidateTag` per circle after mutations.
- Neon pooled connection string for the app; unpooled owner connection only for migrations.
- Neon branching: every developer gets their own database branch; Vercel preview deployments get their own branch (Neon–Vercel integration).
- Jobs work in batches of 500 with `SKIP LOCKED`, so several runs can proceed in parallel.
- Neon free-tier compute suspends when idle; open the app a minute before the demo to warm it.

---

## 11. Seed data
Sharma family (owner Anjali in Bengaluru, caregiver Rohit in Pune, coordinator Meera, viewer Vikram in Dubai, care recipient Kamala, 74, in Pune) and an Iyer family for the isolation test. All dates relative to now; password `Demo@1234` for every seed user; seed refuses to run in production unless `ALLOW_SEED=true`.

---

## 12. Business model (for the pitch)
Families (freemium) → employer benefit programmes (strongest channel) → care agencies (multi-family dashboard). Circles are already tenant-isolated, so the schema supports all three.

---

## 13. Definition of done
All four mandatory features work on the deployed URL; guardrail visible; synthetic data only; RLS and auth tests pass in CI; the Status Board passes the 10-second test; mobile Lighthouse ≥ 90 for Performance, Accessibility and Best Practices; README with architecture diagram, setup steps, demo credentials per role and `docs/DEMO.md`.
