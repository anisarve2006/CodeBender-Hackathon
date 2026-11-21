# SETUP PROMPT 3 of 3: Custom Authentication, App Shell and Team Contracts

> **Who runs this:** Both members together on branch `main`, after Setup 2 is merged.
> **Goal:** a working sign-up/sign-in system, the app shell, every route as a stub, and frozen contracts, so Member A and Member B can split up without editing the same files.
> **Time box:** about 2 hours (auth is most of it).

---

## Prompt (paste everything below into the coding agent)

Read `CLAUDE.md` (especially Sections 3, 5, 6 and 8) and `docs/DATA_MODEL.md`. Build the **custom authentication system**, the shared foundation and route stubs. Do not build feature logic beyond what is listed.

### Part 1: Custom authentication (`lib/auth/`, all `server-only`, uses `db/admin`)

**Crypto and tokens (`lib/auth/crypto.ts`)**
- `generateToken()`: 32 bytes from `crypto.getRandomValues`, base64url.
- `hashToken(token)`: SHA-256 hex.
- `hashPassword` / `verifyPassword`: Argon2id via `@node-rs/argon2` (memoryCost 19456, timeCost 2, parallelism 1).
- `encrypt` / `decrypt`: AES-256-GCM with `AUTH_ENCRYPTION_KEY` (used later for TOTP secrets).
- `timingSafeEqual` helper for comparisons.

**Sessions (`lib/auth/session.ts`)**
- `createSession(userId, meta)`: insert `sessions` row with `id = hashToken(token)`, 30-day expiry, user agent and a hashed IP; set cookie `__Host-fch_session` (`httpOnly`, `secure` in production, `sameSite: 'lax'`, `path: '/'`, `maxAge` 30 days).
- `validateSession()`: read the cookie → check the Redis cache `sess:{hash}` (60 s TTL) → fall back to the DB joined with `users` → reject expired sessions → extend the expiry when under 15 days remain → return `{ user: { id, email, fullName, timezone, emailVerified }, session }` or `null`. Wrap in React `cache()` so it runs once per request.
- `invalidateSession(id)`, `invalidateAllUserSessions(userId, exceptId?)`; both delete the Redis cache entries.
- `requireUser()`: redirects to `/login?next=…` if no session. `requireVerifiedUser()`: redirects to `/verify-email` if not verified.

**Auth flows (Server Actions in `app/(auth)/actions.ts`, using `createAction` from Part 2)**
- **Sign up** (`/signup`): full name, email, password + confirm. Zod: email normalised to lowercase, password 10–128 chars, rejected if in `lib/auth/common-passwords.ts` (top 1,000 list) or if it contains the email name. Rate limit `signupLimiter` by IP. If the email exists, behave identically to success (send a "someone tried to sign up with your email" message instead) to avoid account enumeration. Create the user, create a session, send the verification email, redirect to `/verify-email`.
- **Verify email** (`/verify-email` page + `/verify-email/[token]` route): single-use token (`auth_tokens`, purpose `verify_email`, 24 h). "Resend email" button rate-limited to once per minute.
- **Sign in** (`/login`): email + password; generic error "Email or password is incorrect"; limiters per IP and per email; on 5 consecutive failures set `locked_until = now() + 15 min` and say "Too many attempts, try again in 15 minutes"; when the user doesn't exist, still run `verifyPassword` against a dummy hash. On success: reset counters, rotate session, respect `?next=` (only allow same-site relative paths). If `totp_enabled`, store a short-lived "pending 2FA" marker in Redis and redirect to `/login/2fa` (the 2FA screen itself is Member A's later work; leave a stub that explains this).
- **Sign out**: invalidate the current session, clear the cookie.
- **Forgot password** (`/forgot-password`): always shows "If an account exists, we've sent a link"; token 30 min; rate-limited.
- **Reset password** (`/reset-password/[token]`): new password with the same rules; on success hash, mark the token used, **invalidate all sessions**, create a new one, and send a "your password was changed" email.
- Auth pages: centred card, product logo, friendly copy, password visibility toggle, a strength meter, accessible error messages linked with `aria-describedby`, and a "Demo accounts" helper box on `/login` **only when `NEXT_PUBLIC_DEMO_MODE=true`** listing the seed emails.

**Proxy / middleware** (`middleware.ts`, or `proxy.ts` on Next.js 16+)
- For `/c/*`, `/onboarding`, `/account/*`: if the session cookie is absent, redirect to `/login?next=…`. If present on `/login` or `/signup`, redirect to `/`. **Never touch the database here.**

**Email (`lib/notifications/email.ts`, shared)**
- `sendEmail({ to, subject, html, text })` via Resend, with simple branded HTML templates in `lib/notifications/templates/` for verification, reset and password-changed. In development without a key, log the email to the console instead of sending.

### Part 2: Shared foundation and frozen contracts

**Types and helpers**
- `lib/types/app.ts`: aliases from Drizzle inferred types plus:
  ```ts
  export type ActionResult<T = void> =
    | { ok: true; data: T }
    | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
  export type CircleContext = { circleId: string; role: CircleRole; userId: string; circleName: string; recipientName: string };
  ```
- `lib/utils/action.ts`: `createAction(schema, handler, { auth: 'none' | 'user' | 'verified' })`: parse with Zod, resolve the user, catch errors, map DB/RLS errors to friendly messages, return `ActionResult`. Never leak raw errors.
- `lib/utils/rbac.ts`: `can(role, capability)` mirroring CLAUDE.md Section 5 (UI hiding only).
- `lib/utils/dates.ts`: `formatRelative`, `formatDateTime`, `toUtc`; default `Asia/Kolkata`.
- `lib/query-keys.ts`: TanStack key factory for `tasks, appointments, documents, meds, refills, timeline, dashboard, members, updates, activity`.

**Frozen contracts (finished now; signatures must not change without both members agreeing)**
- `lib/data/circle-context.ts`: `requireCircleRole(circleId, allowed?: CircleRole[]): Promise<CircleContext>`; uses `requireVerifiedUser` + `withUserTx`; `notFound()` for non-members; cached per request.
- `db/client.ts` `withUserTx(userId, fn)` (from Setup 1): the only way feature code touches the DB.
- `lib/data/tasks-core.ts`: `createTaskCore(ctx, input)` inserts one validated task. **Member B calls it** for appointment and refill tasks; Member A owns everything else about tasks.
- `lib/notifications/enqueue.ts`: `enqueueNotification(ctx | {circleId}, { targetUserId, kind, channel, entityType, entityId, remindAt, payload })` wrapping `enqueue_reminder`. **Member A calls it** for nudges; **Member B owns delivery**.
- `lib/live/version.ts`: `bumpCircleVersion(circleId)` (Redis `INCR cv:{circleId}`); **every mutation in either member's code calls it after commit**. Route `app/api/circles/[circleId]/version/route.ts`: checks membership (cache the membership check in Redis for 60 s), rate-limited with `pollLimiter`, returns `{ v }` with `Cache-Control: no-store`.
- `lib/live/use-live-circle.ts`: client hook `useLiveCircle(circleId, onChange)` that polls the version endpoint every 10 s while `document.visibilityState === 'visible'`, also on window focus, and calls `onChange` (default `router.refresh()` + invalidate circle queries) when `v` changes.

**Zod schemas (`lib/schemas/`)**: base create/update schemas per domain: `tasks.ts, circles.ts, invitations.ts, updates.ts, account.ts` (Member A) and `appointments.ts, documents.ts, medications.ts, refills.ts, notifications.ts` (Member B). Plain, friendly messages.

### Part 3: App shell (shared)
- `app/layout.tsx`: fonts, ThemeProvider, QueryClientProvider, Toaster.
- `app/(app)/c/[circleId]/layout.tsx`: `requireCircleRole`, a `CircleProvider` context, **sidebar on desktop / bottom nav on mobile**, circle switcher, user menu (Account, theme toggle, Sign out), the persistent medical disclaimer footer, and `useLiveCircle` mounted once.
- `lib/nav.ts`: Home, Timeline, Tasks, Meds & Refills, Family, Settings (complete now; nobody edits it later).
- `app/globals.css`: semantic tokens `--status-ok`, `--status-attention`, `--status-overdue` (AA contrast in light and dark), 16 px base, visible focus rings, reduced-motion handling.
- `components/shared/`: `StatusPill`, `MemberAvatar`, `AvatarStack`, `RelativeTime`, `EmptyState`, `PageHeader`, `SectionCard`, `ConfirmDialog`, `RoleBadge`, `SensitivityBadge`, `LoadingSkeletons`, `ErrorState`, `PasswordInput` (with toggle and strength meter), `QuickAddButton`.
- `QuickAddButton` imports four dialogs; create them as **stubs** now: `components/features/tasks/quick-add-task.tsx` (A), `components/features/updates/quick-add-update.tsx` (A), `components/features/appointments/quick-add-appointment.tsx` (B), `components/features/documents/quick-add-document.tsx` (B).

### Part 4: Route stubs (each renders `PageHeader` + `EmptyState` "Coming soon")
| Route | Owner |
|---|---|
| `/login`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password/[token]` | **Done in this prompt** |
| `/login/2fa`, `/account`, `/account/security` | A |
| `/invite/[token]`, `/onboarding`, `/` (redirect to last circle or onboarding) | A |
| `/c/[circleId]` (Status Board), `/c/[circleId]/tasks`, `/c/[circleId]/family`, `/c/[circleId]/settings` | A |
| `/c/[circleId]/timeline`, `/appointments`, `/documents`, `/meds`, `/care-mode` | B |
| `/c/[circleId]/settings/notifications`, `/c/[circleId]/settings/data` | B |
| `app/api/calendar/[appointmentId]/route.ts`, `app/api/documents/[documentId]/url/route.ts`, `app/api/jobs/*` | B |

Each area gets an empty `actions.ts` beside its page and an empty `lib/data/<domain>.ts` with an owner header comment.

### Part 5: `docs/COLLABORATION.md`
1. **Ownership**: Member A: `components/features/{tasks,dashboard,family,onboarding,updates,activity,account,settings-members}`, `lib/data/{circles,members,invitations,tasks,dashboard,updates,activity,account}.ts`, `lib/schemas/{tasks,circles,invitations,updates,account}.ts`, `db/schema/{circles,tasks,updates}.ts`, routes listed for A. Member B: `components/features/{appointments,timeline,documents,meds,notifications,care-mode,pwa,settings-data}`, `lib/data/{appointments,documents,medications,refills,timeline,export}.ts`, `lib/schemas/{appointments,documents,medications,refills,notifications}.ts`, `db/schema/{appointments,medications,documents,notifications}.ts`, `lib/jobs/**`, `lib/utils/blob.ts`, `app/api/jobs/**`, `public/sw.js`, `app/manifest.ts`, routes listed for B.
2. **Shared files** (PR approved by both): `lib/auth/**` (except A may add 2FA and session-management functions in `lib/auth/totp.ts` and `lib/auth/sessions-admin.ts`), `db/client.ts`, `db/admin.ts`, `db/schema/{enums,auth,activity,index}.ts`, `lib/types/app.ts`, `lib/utils/*` (except `blob.ts`), `lib/data/{circle-context,tasks-core}.ts`, `lib/notifications/{email,enqueue}.ts`, `lib/live/*`, `lib/nav.ts`, `components/ui/*`, `components/shared/*`, both layouts, middleware/proxy, `next.config.ts`, `package.json`.
3. **Databases**: each member works on their own Neon branch (`dev-a`, `dev-b`); after pulling a new migration run `npm run db:migrate`; reset your branch from `main` in Neon if it drifts.
4. **Git**: branches `a/<feature>` and `b/<feature>`; small PRs; CI green; squash merge; `git pull --rebase origin main` twice a day; never force-push `main`.
5. **Migrations**: never edit merged migrations; follow the regenerate-after-rebase rule in `docs/DATA_MODEL.md`.
6. **Every mutation**: goes through `withUserTx`, then `bumpCircleVersion`, then `revalidatePath`/`revalidateTag`.
7. **Definition of done per PR**: lint, typecheck, tests pass; checked as owner and viewer; mobile layout checked; empty, loading and error states present.

### Part 6: Tests and finish
- Unit tests: password rules, token hashing, `can()`, `createAction`, `next` redirect sanitiser.
- Playwright: sign up → verification link (read from the dev console log or a test-only email capture) → verified; wrong password 5 times → locked message; forgot → reset → old session invalid; sign in as `anjali@example.com` sees the shell with all nav items; `vikram@example.com` (viewer) has no Quick Add button.
- Run everything, commit `feat: custom auth, app shell, contracts and route stubs`, push, deploy to Vercel (set all env vars for Production and Preview), and confirm sign-in with seed users on the deployed URL. Print a summary of the frozen contract signatures for both members.
