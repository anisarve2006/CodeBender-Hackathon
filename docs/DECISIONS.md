# Architectural Decisions Record (ADR)

## ADR 1: Neon Serverless Postgres with Branching
- **Decision:** Use Neon Serverless Postgres (Postgres 17) in `aws-ap-southeast-1` (Singapore).
- **Context:** Closest Neon cloud region to India with low latency (<70 ms). Branching enables each team member (`dev-a`, `dev-b`) and Vercel preview deploys to operate on isolated database branches without data collision.

## ADR 2: In-House Custom Authentication
- **Decision:** Build custom session-based authentication rather than third-party SaaS auth (e.g. Supabase, Clerk).
- **Context:** Full control over credential verification, session revocation, constant-time dummy password checks, Argon2id hashing, DPDP Act 2023 compliance, and zero external vendor lock-in.

## ADR 3: Upstash Redis for Rate Limiting & Version Counters
- **Decision:** Use Upstash Serverless Redis in Singapore.
- **Context:** Provides sliding window rate-limiting across distributed serverless functions, caches authenticated sessions for 60 seconds, and maintains circle version counter `cv:{circleId}`.

## ADR 4: Polling Version Counter over WebSockets
- **Decision:** Implement live circle updates via lightweight polling (`/api/circles/[id]/version`) every 10 seconds while the browser tab is visible.
- **Context:** Avoids persistent WebSocket server maintenance and edge connection limits on serverless infrastructure while delivering sub-10s reactivity for remote family members.

## ADR 5: Upstash QStash for Scheduled Workflows
- **Decision:** Use Upstash QStash to invoke signed Vercel API routes for reminders, daily digests, and refill checkers.
- **Context:** Idempotent, durable message delivery with signature verification and retry semantics suited for serverless execution.

## ADR 6: Vercel Private Blob Storage
- **Decision:** Store medical prescriptions, lab reports, and discharge summaries in Vercel Blob with `access: 'private'`.
- **Context:** Direct asset URLs are never exposed. Access is gated by circle membership and sensitivity grants, dispensing short-lived (60-second) signed download URLs.


## ADR 7: Document Upload Architecture
- **Decision:** Document uploads stream through a dedicated Route Handler (`/api/documents/upload`) with strict validation via `lib/utils/blob.ts`.
- **Context:** Allows uploading up to 10 MB files (PDF, JPEG, PNG, HEIC) without mutating shared `next.config.ts`. Validates magic bytes using `file-type`, auto-orients and strips EXIF using `sharp`, calculates SHA-256 checksums, and persists to private Vercel Blob with immediate orphan rollback on failure.
