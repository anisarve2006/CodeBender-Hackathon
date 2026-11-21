# MEMBER B PROMPT: Records, Medicines, Notifications and Platform

> **Your area:** Appointments, the shared timeline, documents (secure uploads), medicines and the refill tracker, the reminder and notification pipeline (scheduled jobs, email, push), data export and deletion, the PWA, and care-recipient mode.
> **Your partner (Member A)** builds onboarding, invitations and roles, tasks, family updates, the activity feed and the Home Status Board.
> **Branch naming:** `b/<feature>`, e.g. `b/appointments`, `b/documents`, `b/notifications`.
> **Start only after Setup Prompts 1–3 are merged into `main`.**

---

## Prompt (paste everything below into the coding agent)

You are **Member B** on a two-person team building Family Care Hub. Read `CLAUDE.md`, `docs/DATA_MODEL.md` and `docs/COLLABORATION.md` before writing code.

### Hard rules for this session
1. Only create or edit files that `docs/COLLABORATION.md` assigns to **Member B**. If a shared file must change, stop and tell me the exact change so I can agree it with my teammate. Do not edit it yourself.
2. Never edit files owned by Member A (tasks UI, onboarding, invitations, family, updates, Status Board, activity).
3. Use the frozen contracts as-is: `getCircleContext`, `createTaskCore` (to auto-create tasks), `enqueueNotification`, `useCircleChannel`, `createAction`, `can()`, and the RPCs `circle_timeline`, `enqueue_reminder`, `can_view_document`.
4. If you need a database change, add a **new** migration prefixed with your area (e.g. `..._b_cron_jobs.sql`), run `npm run db:reset && npm run db:types`, and mention it in the PR.
5. **Medical guardrail, strictly enforced in your area:** medicine instructions are stored and shown **verbatim as written on the prescription** (`instructions_as_written`). Never compute dosage, never suggest, flag or interpret results, never label anything "normal/abnormal". Refill maths uses only the numbers the family enters (quantity on hand and daily usage as written).
6. Notifications must never contain medicine names, diagnoses or document titles; the details are visible only after login.

### Milestone B1: Appointments (`b/appointments`)
- `/c/[circleId]/appointments`: **Upcoming** and **Past** tabs; cards with date/time (viewer's timezone), doctor, specialty, location (with a Google Maps link), who is accompanying (avatar), status.
- Real `quick-add-appointment.tsx` dialog (title/doctor, date and time, location; optional specialty, accompanied by, notes, sensitivity) and a full edit sheet.
- On create, offer two checkboxes (default on): "Create task: prepare documents" and "Create task: accompany" → call `createTaskCore` with `linked_entity_type = 'appointment'` and assign to the chosen person.
- On create/update, enqueue reminders 24 h and 2 h before for the accompanying person and the coordinator via `enqueueNotification` (kind `appointment`); reschedule replaces pending ones.
- After `ends_at` passes, show a "How did it go?" prompt on the card: mark **Completed** (optional notes + attach report, which opens the document upload prefilled), **Missed**, or **Rescheduled**.
- `/api/calendar/[appointmentId]` route: returns an `.ics` file after checking membership with the user's session (RLS), with a neutral title such as "Doctor appointment – Kamala".

### Milestone B2: Medicines and refill tracker (`b/meds`)
- `/c/[circleId]/meds`: list of active medicines; each card shows name and strength, instructions shown verbatim in a quoted block labelled "As written on prescription", prescribed by, and a **refill countdown** ("12 days left", amber at ≤ 5, red when overdue) with a small progress bar.
- Add/edit medicine form (link to a prescription document optional). Inactive/past medicines in a collapsed section.
- Refill workflow buttons: **Mark ordered** → **Mark refilled** (asks for the new quantity, sets `last_refilled_on = today`); the DB trigger recomputes `next_refill_due` and status.
- When a refill becomes `due_soon` or `overdue`, a task must exist: implement this in the scheduled job in B4 using `createTaskCore` with `category = 'medication'`, `linked_entity_type = 'refill'`, assigned to `refills.assigned_to` or the coordinator. Avoid duplicates (check for an open task linked to the same refill).
- Use a neutral, clearly separated layout. Add the disclaimer line under the page header.

### Milestone B3: Documents and the timeline (`b/documents-timeline`)
- **Upload** (`quick-add-document.tsx` + `/c/[circleId]/documents`):
  - Mobile camera capture (`accept="image/*,application/pdf" capture="environment"`), drag-and-drop on desktop, preview before save.
  - Fields: title (prefilled from the file name), kind (`doc_kind`), report date, sensitivity toggle with a short explanation of who can see restricted files.
  - Server action flow: rate-limit with `uploadLimiter` → validate size and **magic bytes** (not just extension) → create the `documents` row → upload to `medical-docs` at `circle/{circle_id}/{document_id}/{filename}` → compute SHA-256 checksum → strip EXIF from images (`sharp`; this is a new dependency, so agree it with your teammate first) → on failure, delete the row (no orphans).
  - Viewing: server action returns a **60-second signed URL** only after `can_view_document`; log every view/download to `document_access_log`. Show a "Viewed by" list for owners and coordinators.
  - Restricted documents: owner/coordinator can grant access to specific members (`restricted_document_grants`).
  - Documents page: filter by kind, search by title (uses the trigram index), grid on desktop, list on mobile.
- **Timeline** (`/c/[circleId]/timeline`):
  - Uses `circle_timeline` with **cursor pagination** and infinite scroll (TanStack `useInfiniteQuery`); filter chips: Appointments, Prescriptions, Reports, Updates.
  - Grouped by month with sticky month headers; each entry has an icon per kind, title, subtitle, actor avatar and relative time; restricted items show "Restricted document" to people without access.
  - Clicking an entry opens the related detail (appointment sheet, document viewer). Family updates link to Member A's Family page.

### Milestone B4: Reminder and notification pipeline (`b/notifications`)
- **Edge Functions** in `supabase/functions/`:
  - `send-reminders`: every 15 minutes, claim due rows with `SELECT … WHERE sent_at IS NULL AND remind_at <= now() ORDER BY remind_at LIMIT 500 FOR UPDATE SKIP LOCKED`; send by channel (email via Resend, Web Push via `web-push` with VAPID keys); set `sent_at`, or increase `attempt_count` and store `last_error`; give up after 5 attempts. Idempotent: a retried run must never send twice.
  - `refill-checker`: daily 07:00 IST (01:30 UTC); recompute refill statuses, create refill tasks (see B2), and enqueue `refill` reminders for all caregivers when overdue.
  - `daily-digest`: daily 20:00 IST; one email per user listing counts of their pending and overdue items across circles, plus a login button. No medical details.
  - `escalation`: hourly; for tasks overdue > 24 h, enqueue a reminder to the circle's coordinator (once per task).
- Schedule all four with `pg_cron` + `pg_net` in a new migration; store the function URL and service key in Supabase Vault, not in SQL.
- Use the shared `admin` client pattern only inside Edge Functions.
- Email templates: simple, accessible HTML with the circle name, a neutral message, a button to the app, and an unsubscribe link to settings.
- **Settings → Notifications** page: per-user channel toggles (email, push), digest on/off and time, quiet hours; stored in `profiles.notification_prefs`; the sender respects them.
- **Web Push**: subscribe/unsubscribe button that saves to `push_subscriptions`; remove subscriptions that return 404/410.

### Milestone B5: PWA, care-recipient mode and data rights (`b/platform`)
- **PWA:** `app/manifest.ts` (name, icons, theme colour, `display: standalone`), `public/sw.js` caching the app shell and the last-loaded dashboard and today's tasks for **read-only offline** viewing; show an "Offline: showing last saved info" banner. Install prompt on mobile.
- **Care-recipient mode** (`/c/[circleId]/care-mode`): large text (≥ 20 px), high contrast, two big cards only: "Today's medicines" (names and verbatim instructions) and "Next appointment" (date, doctor, who is coming with you); one large "Call family" button using the emergency contact's `tel:` link. Users with role `care_recipient` are redirected here by default.
- **Settings → Data** (owner only): **Export** creates a ZIP of all circle records as JSON plus the document files (streamed, generated on the server with the user's session); **Delete circle** requires typing the circle name, purges storage objects and then the circle (cascade). Log both actions.

### Milestone B6: Tests and hardening (`b/tests`)
- Unit tests: refill countdown and status display, ICS generation, magic-byte file validation, reminder idempotency (process the same batch twice → one send), notification text contains no medicine names.
- Playwright E2E: (1) caregiver uploads a PDF and a viewer can open it; (2) a restricted document is hidden from a viewer and the caregiver, visible after a grant; (3) adding an appointment creates linked tasks; (4) marking a refill refilled updates the countdown; (5) timeline infinite scroll loads more entries.
- Security checks: try to fetch another circle's signed URL and expect a denial; upload a renamed `.exe` as `.pdf` and expect a rejection; confirm `SUPABASE_SERVICE_ROLE_KEY` is not present in any client bundle (`grep` the `.next` build output).
- Lighthouse on Timeline, Meds and Documents (mobile): ≥ 90 on Performance, Accessibility, Best Practices.

### Integration checkpoints with Member A
- **Checkpoint 1 (after B2 / A2):** confirm tasks you create via `createTaskCore` show up correctly in A's task list, with chips that link back to your appointment and meds pages.
- **Checkpoint 2 (after B4 / A4):** pair for 20 minutes: confirm A's Status Board shows your appointments and refills correctly, and that A's nudges are delivered by your pipeline (email inbox + push).
- **Checkpoint 3 (final):** you own `docs/DEMO.md`: write a 3-minute demo script (log in as Anjali in Bengaluru → Status Board shows red "BP refill overdue, Rohit" → switch to Rohit → mark refilled → Anjali's board turns green live → upload a report → show the viewer's restricted view → care-recipient mode). Run it together on the deployed URL and fix bugs in your own files.

When each milestone is finished: run lint, typecheck, tests and build; commit with Conventional Commits; push the branch; and print a PR description (summary, screenshots to take, any migration or new dependency, anything A needs to know).
