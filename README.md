# Family Care Hub 🏥

> Coordinate medical care, appointments, prescriptions, and daily tasks for elderly or chronically ill relatives across cities with complete peace of mind.

Built for the **CodeBenders ACE Builders' Hackathon 2026** (Problem Statement 4: Health and Family Care).

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Server Actions, TypeScript Strict) |
| **Styling & UI** | Tailwind CSS v4, shadcn/ui, Lucide Icons, next-themes |
| **Database** | Neon Serverless Postgres (Region: Singapore `aws-ap-southeast-1`) |
| **ORM & Migrations** | Drizzle ORM + Drizzle Kit |
| **Security & Auth** | In-house custom auth (Argon2id, sliding sessions in Redis + DB, Postgres RLS) |
| **Cache & Realtime** | Upstash Redis (rate limiting, session cache, version counters) |
| **Background Jobs** | Upstash QStash (cron webhooks with signature verification) |
| **Storage** | Vercel Blob (Private store, signed time-limited access URLs) |
| **Email & Push** | Resend (transactional email) + Web Push (VAPID) |
| **Quality Gates** | Vitest, Playwright, GitHub Actions CI with Postgres 17 container |

---

## Quickstart (≤ 5 Commands)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local

# 3. Run database migrations
npm run db:migrate

# 4. Seed demo data
npm run db:seed

# 5. Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

---

## Available Scripts

- `npm run dev`: Launch local development server with Turbopack.
- `npm run build`: Production Next.js build.
- `npm run start`: Launch production server.
- `npm run lint`: Run ESLint checks (enforcing restricted admin imports and TypeScript rules).
- `npm run typecheck`: Run TypeScript compilation check.
- `npm run format`: Check code style with Prettier.
- `npm run format:fix`: Auto-format all code files.
- `npm run test`: Run Vitest unit test suite.
- `npm run test:db`: Run database integration tests with Row Level Security checks.
- `npm run test:e2e`: Run Playwright end-to-end tests.
- `npm run db:generate`: Generate new Drizzle SQL migration from schemas.
- `npm run db:custom`: Generate custom named SQL migration.
- `npm run db:migrate`: Apply pending migrations to database.
- `npm run db:studio`: Launch Drizzle Studio database viewer.
- `npm run db:seed`: Populate database with realistic synthetic Sharma & Iyer family circles.
- `npm run db:reset`: Drop and recreate public schema on individual developer branch.
