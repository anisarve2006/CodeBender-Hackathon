# SETUP PROMPT 2 of 3: Neon Database, Row Level Security, SQL Contracts and Seed Data

> **Who runs this:** Both members together on branch `main`, after Setup 1 is merged. Run migrations against the **`main` Neon branch** first, then reset `dev-a` and `dev-b` from `main` in the Neon console.
> **Why both of you:** the schema is the contract between your work. Get it complete now so neither of you has to change the other's tables later.
> **Time box:** about 75 minutes.

---

## Prompt (paste everything below into the coding agent)

Read `CLAUDE.md` Sections 3–7. Build the **complete** database for Family Care Hub with Drizzle ORM on Neon Postgres. Two developers will build features in parallel against this schema, so every table, enum, index, policy and SQL function either of them needs must exist after this step. No UI.

### 1. Drizzle schema (`db/schema/`), one file per domain, re-exported from `db/schema/index.ts`
| File | Tables | Owner after setup |
|---|---|---|
| `enums.ts` | all `pgEnum`s from CLAUDE.md Section 4 | shared |
| `auth.ts` | `users`, `sessions`, `auth_tokens`, `push_subscriptions` | shared |
| `circles.ts` | `care_circles`, `care_recipients`, `circle_members`, `invitations` | Member A |
| `tasks.ts` | `tasks`, `task_comments` | Member A |
| `updates.ts` | `updates` | Member A |
| `appointments.ts` | `appointments` | Member B |
| `medications.ts` | `medications`, `prescriptions`, `refills` | Member B |
| `documents.ts` | `documents`, `restricted_document_grants`, `document_access_log` | Member B |
| `notifications.ts` | `reminders` | Member B |
| `activity.ts` | `activity_log` | shared |

Use `uuid().defaultRandom()`, `timestamp({ withTimezone: true })`, `citext` for email (enable the extension), foreign keys with `onDelete: 'cascade'` from `care_circles` down, `CHECK` constraints (`ends_at > starts_at`, `quantity_on_hand >= 0`, `daily_usage > 0`, `size_bytes <= 10485760`), and every index in CLAUDE.md Section 4 (partial indexes via `.where(sql\`...\`)`, trigram via a custom migration). Export inferred types (`$inferSelect`, `$inferInsert`) from each file. Add `relations()` for convenient queries.

Run `npm run db:generate` to create the base migration.

### 2. Custom SQL migrations (`npm run db:custom -- --name=<name>`), in this order

**`extensions_and_roles`**
- `CREATE EXTENSION IF NOT EXISTS pgcrypto, citext, pg_trgm;` (put this before the base migration if needed).
- Grants: `GRANT USAGE ON SCHEMA public TO app_user; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user; GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;` plus `ALTER DEFAULT PRIVILEGES` for future tables.
- Then **revoke** auth tables from the app role: `REVOKE ALL ON users, sessions, auth_tokens FROM app_user;` and `REVOKE INSERT, UPDATE, DELETE ON activity_log, document_access_log FROM app_user;`.

**`rls_helpers_and_policies`**
- `app_uid() returns uuid`: `nullif(current_setting('app.user_id', true), '')::uuid`, `STABLE`.
- `is_circle_member(c uuid)`, `circle_role_of(c uuid)`, `has_circle_role(c uuid, roles circle_role[])`, `can_view_document(d uuid)`: `SECURITY DEFINER`, `STABLE`, `SET search_path = public`, owned by the owner role.
- `ALTER TABLE … ENABLE ROW LEVEL SECURITY` on **every** circle-scoped table; default deny.
- Policies per operation implementing the matrix in CLAUDE.md Section 5. Key rules:
  - caregivers insert tasks only with `assigned_to = app_uid()` or null, and update tasks only if assignee or claiming an unassigned task;
  - viewers select only; care recipients select non-restricted content and no `activity_log`;
  - `documents` select uses `can_view_document(id)`;
  - `circle_members` insert only via `accept_invitation` or by owner/coordinator.
- `member_profiles` **view** (owned by owner, so it can read `users`): `id, full_name, avatar_url, timezone` for users who share a circle with `app_uid()` (and the user themself). `GRANT SELECT ON member_profiles TO app_user`.
- Trigger: prevent removing or demoting the last owner of a circle.

**`audit_triggers`**
- `log_activity()` trigger `AFTER INSERT OR UPDATE OR DELETE` on `tasks, appointments, medications, refills, documents, prescriptions, updates, circle_members`. Writes `actor_id = app_uid()`, an action (`created, updated, completed, assigned, claimed, uploaded, deleted, joined, role_changed`), `entity_type`, `entity_id`, a short human summary, and a `diff` of changed columns. `SECURITY DEFINER` so it can insert despite the revoke. For `restricted` items the summary says "a restricted document" and never includes names.
- `updated_at` trigger on every table with that column.
- Refill trigger: compute `next_refill_due = last_refilled_on + floor(quantity_on_hand / daily_usage)` and `status` (`overdue` if past, `due_soon` if ≤ 5 days, else `ok`; keep `ordered` until refilled).
- Recurring task trigger: when a task with `recurrence_rule` (`daily|weekly|monthly`) becomes `done`, insert the next instance.

**`sql_contracts`** (all `SECURITY INVOKER`, so RLS applies; add `COMMENT ON FUNCTION` for each)
- `circle_dashboard(p_circle uuid) returns jsonb` with keys `status` (`green|amber|red`), `status_reason`, `overdue_tasks`, `next_appointments` (3), `refills_due` (≤ 7 days), `pending_by_member` (`{user_id, full_name, avatar_url, open, overdue, done_this_week}`), `recent_activity` (10), `latest_update`.
- `who_did_what(p_circle, p_from, p_to)` returns per-member completed / open / overdue counts.
- `circle_timeline(p_circle, p_cursor timestamptz default null, p_kinds text[] default null, p_limit int default 20)`: a `UNION ALL` of appointments, prescriptions, documents and updates as `{kind, id, occurred_at, title, subtitle, actor_id, sensitivity}`, newest first, cursor-based. Restricted items the viewer can't see return the title "Restricted document".
- `claim_task(p_task)`, `complete_task(p_task)`.
- `create_invitation(p_circle, p_email, p_role) returns text` (raw token returned once; stores `encode(digest(token,'sha256'),'hex')`; 72 h) and `accept_invitation(p_token text)` (`SECURITY DEFINER`, checks the token, expiry and that `app_uid()`'s verified email matches).
- `enqueue_reminder(...)`: insert into `reminders` with `ON CONFLICT DO NOTHING` on a unique index `(kind, entity_id, target_user_id, remind_at)`.

Then run `npm run db:migrate`.

### 3. Seed (`db/seed/index.ts`, runs with the owner connection)
- Refuse to run unless `ALLOW_SEED=true` or the database host is not the production branch.
- Hash `Demo@1234` once with Argon2id and use it for all seed users; set `email_verified_at = now()`.
- Users and roles in the Sharma circle: `anjali@example.com` owner (Bengaluru), `meera@example.com` coordinator, `rohit@example.com` caregiver (Pune), `vikram@example.com` viewer (Dubai), `kamala@example.com` care_recipient. `iyer.owner@example.com` owns a separate Iyer circle (isolation test).
- Data relative to `now()`: 3 active medicines (one refill overdue, one due in 3 days), an appointment tomorrow, one completed and one missed appointment, 8 tasks across all statuses and members, 3 family updates, 4 sample PDFs from `db/seed/files/` (generated with a "SAMPLE – NOT REAL DATA" watermark) uploaded to the **private Blob store under a `seed/` prefix** (skip the upload if `BLOB_READ_WRITE_TOKEN` is missing and leave `blob_pathname` pointing to a placeholder), one of them `restricted`, and backfilled activity entries.
- Set `app.user_id` per insert batch so audit triggers record realistic actors.

### 4. Database tests (`tests/db/`, Vitest, connecting as **`app_user`** with `withUserTx`)
For each seeded role assert allowed and denied operations, at minimum:
- viewer cannot insert or update tasks; caregiver cannot read the restricted document until a grant exists;
- the Iyer owner sees **zero** Sharma rows in every table and gets an error or empty result from `circle_dashboard(sharma)`;
- `app_user` cannot select from `users`, `sessions`, `auth_tokens`, and cannot update or delete `activity_log`;
- a query with no `app.user_id` set returns zero rows;
- the last owner cannot be demoted; `accept_invitation` rejects expired, used, or wrong-email tokens; the refill trigger computes the right dates.

### 5. Finish
1. `npm run db:reset && npm run test:db` on your branch until green.
2. Write `docs/DATA_MODEL.md`: a Mermaid ER diagram, the role matrix, a table of every SQL function with arguments and return shape, and the **migration rules**: never edit a merged migration; if your branch's generated migration conflicts with one merged on `main` (number or `meta/_journal.json`), delete your generated migration and snapshot, rebase on `main`, and run `npm run db:generate` again. Custom SQL migrations are never regenerated, only renumbered.
3. Commit `feat(db): schema, RLS, SQL contracts, audit and seed`, push, run `db:migrate` and `db:seed` against the Neon `main` branch, then **reset `dev-a` and `dev-b` from `main`** in the Neon console.
