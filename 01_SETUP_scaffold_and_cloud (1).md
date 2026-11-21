# SETUP PROMPT 1 of 3: Scaffold, Tooling and Cloud Wiring (Neon + Upstash + Vercel)

> **Who runs this:** Both members together on branch `main`.
> **Before you start:** put the v2 `CLAUDE.md` in the repo root.
> **Time box:** about 45 minutes.

---

## Manual prerequisites (humans do these in the dashboards)

| Service | What to create | Values for `.env.local` |
|---|---|---|
| **Neon** | Project `family-care-hub`, region **AWS Asia Pacific (Singapore)**, Postgres 17. Create branches `dev-a` and `dev-b` from `main` (one per member). In **Roles**, create a role `app_user` (this is the restricted role the app connects as). | `DATABASE_URL` (pooled, `app_user`), `DATABASE_URL_OWNER` (pooled, owner role), `DATABASE_URL_UNPOOLED` (owner, direct, for migrations) |
| **Upstash Redis** | Database `fch-cache`, region Singapore (ap-southeast-1) | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| **Upstash QStash** | Enable QStash (same account) | `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` |
| **Vercel** | Import the GitHub repo. Settings → Functions → region **Singapore (sin1)**. Storage → create a **Blob store with access: Private** and connect it to the project. Install the **Neon integration** so preview deployments get their own database branch. | `BLOB_READ_WRITE_TOKEN` (pull with `vercel env pull`) |
| **Resend** | API key (sender `onboarding@resend.dev` is fine for the demo) | `RESEND_API_KEY` |

Each member uses **their own Neon branch** connection strings in their own `.env.local`, so you never break each other's database while working in parallel.

---

## Prompt (paste everything below into the coding agent)

You are setting up the repository for **Family Care Hub**. Read `CLAUDE.md` first; it is the master specification. In this step build only the scaffold, tooling and cloud wiring. **No product features yet.**

### 1. Scaffold
- Create a Next.js app (latest stable, App Router) in the repo root: TypeScript strict, Tailwind, ESLint, no `src/` folder, alias `@/*`, npm.
- Initialise **shadcn/ui** (new-york, slate, CSS variables) and add: `button card badge avatar dialog sheet drawer dropdown-menu input input-otp textarea label select checkbox switch tabs tooltip popover calendar form sonner skeleton separator scroll-area alert alert-dialog progress command table`.
- Runtime deps: `drizzle-orm @neondatabase/serverless ws @node-rs/argon2 @upstash/redis @upstash/ratelimit @upstash/qstash @vercel/blob resend web-push otplib qrcode file-type sharp zod react-hook-form @hookform/resolvers @tanstack/react-query date-fns date-fns-tz lucide-react next-themes clsx tailwind-merge server-only`. Make sure `@vercel/blob` is version 2.3 or newer (needed for private stores).
- Dev deps: `drizzle-kit tsx dotenv vitest @vitejs/plugin-react @testing-library/react jsdom @playwright/test @axe-core/playwright prettier prettier-plugin-tailwindcss eslint-config-prettier husky lint-staged @types/ws @types/web-push @types/qrcode`.
- Set `"engines": { "node": ">=20" }` and in `vercel.json` set `"regions": ["sin1"]`.

### 2. Folder structure (add a short README in each empty folder)
```
app/(auth)/  app/(app)/  app/api/
components/ui/  components/shared/  components/features/
db/schema/        # Drizzle schema, one file per domain
db/migrations/    # generated + custom SQL migrations
db/seed/          # seed script and sample PDFs
lib/auth/  lib/data/  lib/schemas/  lib/types/  lib/utils/  lib/jobs/  lib/notifications/
tests/unit/  tests/e2e/  tests/db/
docs/  .github/workflows/  scripts/
```

### 3. Database clients (`db/`)
- `db/client.ts` (`server-only`): a Drizzle client using `Pool` from `@neondatabase/serverless` with `DATABASE_URL` (role `app_user`). Set `neonConfig.webSocketConstructor = ws` when `globalThis.WebSocket` is missing. Export `withUserTx(userId, fn)`, which opens a transaction, runs `select set_config('app.user_id', $userId, true)`, then calls `fn(tx)`. **All app reads and writes must go through `withUserTx`.**
- `db/admin.ts` (`server-only`): Drizzle client using `DATABASE_URL_OWNER`. Header comment: "Privileged: bypasses RLS. Only for lib/auth, app/api/jobs, the seed script and migrations." Add an ESLint `no-restricted-imports` rule that blocks importing `@/db/admin` everywhere except `lib/auth/**`, `lib/jobs/**`, `app/api/jobs/**`, `db/seed/**`.
- `drizzle.config.ts`: schema `./db/schema/*`, out `./db/migrations`, dialect postgresql, credentials from `DATABASE_URL_UNPOOLED`.
- Scripts: `db:generate` (`drizzle-kit generate`), `db:custom` (`drizzle-kit generate --custom --name`), `db:migrate` (`drizzle-kit migrate`), `db:studio`, `db:seed` (`tsx db/seed/index.ts`), `db:reset` (drop + recreate the `public` schema on **your own branch only**, refusing if the host matches the production branch, then migrate + seed).

### 4. Upstash and Blob helpers (`lib/utils/`)
- `redis.ts`: a single `Redis.fromEnv()` instance.
- `rate-limit.ts`: sliding-window limiters `signupLimiter`, `signinIpLimiter`, `signinEmailLimiter`, `resetLimiter`, `inviteLimiter`, `uploadLimiter`, `nudgeLimiter`, `pollLimiter`; a no-op fallback when Upstash env vars are missing in local tests.
- `blob.ts` placeholder that exports nothing yet (Member B implements it).

### 5. Environment (`lib/env.ts`)
Zod-validated, split into `serverEnv` (guarded by `server-only`) and `clientEnv`. Create `.env.example`:
```
DATABASE_URL=                 # pooled, role app_user (RLS applies)
DATABASE_URL_OWNER=           # pooled, owner role (privileged paths only)
DATABASE_URL_UNPOOLED=        # direct, owner role (migrations only)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=
BLOB_READ_WRITE_TOKEN=
RESEND_API_KEY=
EMAIL_FROM="Family Care Hub <onboarding@resend.dev>"
AUTH_ENCRYPTION_KEY=          # 32 bytes base64, for TOTP secrets: openssl rand -base64 32
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:team@example.com
ALLOW_SEED=false
```
Add `scripts/gen-secrets.ts` that prints a fresh `AUTH_ENCRYPTION_KEY` and a VAPID key pair.

### 6. Security headers (`next.config.ts`)
CSP (`default-src 'self'`; `img-src 'self' data: blob: https://*.blob.vercel-storage.com`; `connect-src 'self' https://*.blob.vercel-storage.com`; `frame-ancestors 'none'`; `form-action 'self'`), HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(self), microphone=(), geolocation=()`, `poweredByHeader: false`. Add `serverExternalPackages: ['@node-rs/argon2', 'sharp']`.

### 7. Quality gates
Prettier (+ Tailwind plugin, single quotes, width 100); ESLint (`next/core-web-vitals`, `next/typescript`, `prettier`, `no-explicit-any: error`, the import restriction above); Husky + lint-staged; Vitest (jsdom, `@/` alias, one sanity test); Playwright (Chromium + Pixel 7, one smoke test). Scripts: `dev build start lint typecheck format test test:e2e test:db`.

### 8. CI (`.github/workflows/ci.yml`)
On PRs and pushes to `main`: Node 20 + npm cache → `npm ci` → lint → typecheck → unit tests → **Postgres 17 service container**: create role `app_user` with a password, run `db:migrate` as the owner, run `db:seed` with `ALLOW_SEED=true`, run `test:db` (RLS and auth tests connecting as `app_user`) → `npm run build` (with dummy env values) → gitleaks. Add `.github/pull_request_template.md` with checkboxes: owned files only or shared change agreed; migration regenerated after rebase; no real patient data; screenshots for UI.

### 9. Docs and finish
- `README.md`: one-liner, stack table, setup in ≤ 5 commands (`npm i`, copy env, `npm run db:migrate`, `npm run db:seed`, `npm run dev`), scripts list.
- `docs/DECISIONS.md`: entries for Neon (serverless Postgres, branching), Singapore region (closest Neon region to India), custom auth, Upstash QStash for jobs, Vercel private Blob, live updates via polling a Redis counter.
- Run lint, typecheck, tests and build; commit `chore: scaffold, tooling, CI and cloud wiring (Neon, Upstash, Vercel)`; push. Print the remaining manual steps (Vercel env vars for Production and Preview, Neon integration check).
