# MEMBER A PROMPT: Coordination, People, Account Security and the Status Board

> **Your area:** onboarding, circles, invitations and roles, tasks, family updates, activity feed, the "who did what" view, the Home Status Board, and account security (sessions, password change, 2FA).
> **Partner (Member B):** appointments, timeline, documents (Vercel Blob), medicines and refills, background jobs and notifications (QStash), PWA, care-recipient mode, data export.
> **Branches:** `a/<feature>`. **Database:** your Neon branch `dev-a`.
> **Start after Setup Prompts 1–3 are merged into `main`.**

---

## Prompt (paste everything below into the coding agent)

You are **Member A** on a two-person team building Family Care Hub. Read `CLAUDE.md`, `docs/DATA_MODEL.md` and `docs/COLLABORATION.md` first.

### Hard rules
1. Edit only files `docs/COLLABORATION.md` assigns to **Member A**. If a shared file must change, stop and tell me the exact change; do not edit it.
2. Never edit Member B's files.
3. All DB access goes through `requireCircleRole` + `withUserTx` (never `db/admin`). After every successful mutation call `bumpCircleVersion(circleId)` and revalidate the affected paths.
4. Use the frozen contracts as-is: `requireUser`, `requireVerifiedUser`, `requireCircleRole`, `withUserTx`, `createTaskCore`, `enqueueNotification`, `bumpCircleVersion`, `useLiveCircle`, `createAction`, `can()`, and SQL functions `circle_dashboard`, `who_did_what`, `claim_task`, `complete_task`, `create_invitation`, `accept_invitation` (call them with Drizzle `sql\`select ...\``).
5. Schema changes only in your schema files (`db/schema/{circles,tasks,updates}.ts`) or a new custom migration; run `npm run db:generate` / `db:migrate` on `dev-a`; follow the regenerate-after-rebase rule.
6. Guardrail: nothing you build interprets medical information.

### A1: Onboarding, circles and invitations (`a/onboarding`)
- `/onboarding` (verified users only): 3-step wizard with progress: (1) circle name + consent checkbox (store `consent_confirmed_at/by`); (2) care recipient profile; (3) invite members (email, role, relationship, city; multiple rows; skippable).
- Invites: `create_invitation`, rate-limited with `inviteLimiter`; email the link with `sendEmail` (neutral template: "Anjali invited you to help coordinate care on Family Care Hub"), plus **Share on WhatsApp** (`https://wa.me/?text=`) and **Copy link** buttons.
- `/invite/[token]`: show circle name, inviter, role. Logged out → "Create account" / "Sign in" with `next` back to the invite. Unverified → prompt to verify first. Then `accept_invitation`; friendly errors for expired, used or wrong-email invites.
- `/`: redirect to the last-used circle (cookie) or `/onboarding`.
- Circle switcher data in `lib/data/circles.ts`.

### A2: Tasks (`a/tasks`)
- `/c/[circleId]/tasks`: filters **Mine / Everyone / Unassigned / Overdue / Done**; **List** and **Board** views (List default on mobile); cursor pagination for Done.
- Task card: title, category icon, due as `RelativeTime` (red "2 days late" when overdue), priority, assignee avatar, linked-entity chip ("Appointment: Dr Rao" / "Refill") linking to Member B's pages.
- Detail sheet: description, comments, task history (from `activity_log`), buttons **I'll take it** (`claim_task`), **Mark done** (`complete_task`), **Reassign**, **Nudge**.
- **Nudge:** `enqueueNotification` with kind `nudge`, channels email + push, `remindAt = now()`; `nudgeLimiter` once per 12 h per task; neutral text without medical details.
- Real `quick-add-task.tsx` (title, assignee, due; defaults: due tomorrow 10:00, priority normal) and recurrence (daily/weekly/monthly; the DB trigger creates the next instance).
- Optimistic updates with rollback; when `useLiveCircle` fires, refetch and briefly highlight rows changed by someone else.
- Roles via `can()`: viewers read-only; caregivers can assign only to themselves.

### A3: Family, roles and updates (`a/family`)
- `/c/[circleId]/family`: member cards (avatar, name, relationship, city, role badge) and **Who did what** via `who_did_what` for "This week / Last 30 days" with compact bars; clicking a member filters Tasks.
- `/c/[circleId]/settings`: circle info, care recipient edit, member management (change role, remove, resend/revoke invites) with `ConfirmDialog`; show the last-owner error nicely.
- Family updates feed: real `quick-add-update.tsx` (short text + mood tag `good|okay|tired|unwell`); latest 20 on the Family page.

### A4: Status Board, the 10-second view (`a/status-board`)
`/c/[circleId]` from **one** `circle_dashboard` call in a Server Component:
1. Status banner (`StatusPill`, large) from `status` / `status_reason`.
2. Next up: `next_appointments[0]`, link to B's appointments page and to `/api/calendar/[appointmentId]` (B builds it).
3. Needs attention: overdue tasks + `refills_due` with one-tap actions (tasks: Mark done, I'll take it, Nudge; refills: link to `/c/[circleId]/meds`).
4. Who's on what (`pending_by_member`).
5. Recent activity (5) in plain sentences + "See all" (full activity list with cursor pagination).
6. Latest family update.
- Live updates via the layout's `useLiveCircle` (no extra polling here).
- Skeletons; empty states for a brand-new circle ("Invite your siblings", "Add the next doctor visit"); no action buttons for viewers and care recipients.
- Measure server time and note it in the PR (target < 300 ms).

### A5: Account and security (`a/account`)
- `/account`: profile (name, phone, avatar initials, timezone).
- `/account/security`:
  - **Change password** (current + new, same rules); invalidates all other sessions; sends a notification email.
  - **Active sessions** list (device from user agent, last seen, "This device") with **Sign out** per session and **Sign out everywhere else**. Implement helpers in `lib/auth/sessions-admin.ts`.
  - **Two-factor authentication (TOTP)** in `lib/auth/totp.ts`: setup shows a QR code (`qrcode`) and manual key, confirm with a 6-digit code (`otplib`, ±1 step window), store the secret encrypted with `encrypt()`, show 10 recovery codes once (store hashed); disable requires password + code.
- `/login/2fa`: complete sign-in using the Redis "pending 2FA" marker from Setup 3; accept a TOTP or a recovery code (single use); rate-limited; then create the session.

### A6: Polish and tests (`a/polish`)
- Unit: task filters, overdue derivation, recurrence dates, role-based button visibility, TOTP verify window.
- Playwright: (1) sign up → verify → onboarding → invite; (2) second user accepts the invite and lands on the Status Board; (3) caregiver claims and completes a task, a second browser context sees it within ~10 s; (4) viewer sees no action buttons; (5) enable 2FA, sign out, sign in with a code; (6) "sign out everywhere else" kills the other context's session.
- axe accessibility checks on Home, Tasks, Family, Account; mobile check at 360 px.

### Integration checkpoints with Member B
- **CP1 (after A2 / B2):** pull `main`, migrate `dev-a`; tasks created by B's appointment and refill flows appear with correct chips and links.
- **CP2 (after A4 / B4):** pair 20 minutes: Status Board shows B's appointments and refills correctly; your nudges are delivered by B's QStash job (email + push); live updates fire on B's mutations.
- **CP3 (final):** run `docs/DEMO.md` together on the deployed URL as each role; fix bugs in your own files and report others.

After each milestone: lint, typecheck, tests, build; Conventional Commit; push; print a PR description (summary, screenshots to take, migrations added, notes for B).
