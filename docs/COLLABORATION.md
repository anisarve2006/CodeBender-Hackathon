# Team Collaboration Agreement & File Ownership

> Master division of responsibilities for two-person parallel engineering on **Family Care Hub**.

---

## 1. File & Domain Ownership

### Member A Ownership
- **UI Components:**
  - `components/features/tasks/**`
  - `components/features/dashboard/**`
  - `components/features/family/**`
  - `components/features/onboarding/**`
  - `components/features/updates/**`
  - `components/features/activity/**`
  - `components/features/account/**`
  - `components/features/settings-members/**`
- **Data Access:**
  - `lib/data/{circles,members,invitations,tasks,dashboard,updates,activity,account}.ts`
- **Zod Schemas:**
  - `lib/schemas/{tasks,circles,invitations,updates,account}.ts`
- **Database Schema:**
  - `db/schema/{circles,tasks,updates}.ts`
- **Application Routes:**
  - `/login/2fa`
  - `/account`, `/account/security`
  - `/invite/[token]`
  - `/onboarding`
  - `/c/[circleId]` (Status Board)
  - `/c/[circleId]/tasks`
  - `/c/[circleId]/family`
  - `/c/[circleId]/settings`

### Member B Ownership
- **UI Components:**
  - `components/features/appointments/**`
  - `components/features/timeline/**`
  - `components/features/documents/**`
  - `components/features/meds/**`
  - `components/features/notifications/**`
  - `components/features/care-mode/**`
  - `components/features/pwa/**`
  - `components/features/settings-data/**`
- **Data Access:**
  - `lib/data/{appointments,documents,medications,refills,timeline,export}.ts`
- **Zod Schemas:**
  - `lib/schemas/{appointments,documents,medications,refills,notifications}.ts`
- **Database Schema:**
  - `db/schema/{appointments,medications,documents,notifications}.ts`
- **Storage, Jobs & Progressive Web App:**
  - `lib/jobs/**`
  - `lib/utils/blob.ts`
  - `app/api/jobs/**`
  - `public/sw.js`
  - `app/manifest.ts`
- **Application Routes:**
  - `/c/[circleId]/timeline`
  - `/c/[circleId]/appointments`
  - `/c/[circleId]/documents`
  - `/c/[circleId]/meds`
  - `/c/[circleId]/care-mode`
  - `/c/[circleId]/settings/notifications`
  - `/c/[circleId]/settings/data`
  - `app/api/calendar/[appointmentId]/route.ts`
  - `app/api/documents/[documentId]/url/route.ts`

---

## 2. Shared Files (Requires Agreement & Review by Both Members)

The following files are foundational contracts. Changes must be agreed upon before modification:
- `lib/auth/**` (except Member A may add 2FA logic in `lib/auth/totp.ts`)
- `db/client.ts` & `db/admin.ts`
- `db/schema/{enums,auth,activity,index}.ts`
- `lib/types/app.ts`
- `lib/utils/*` (except `blob.ts`)
- `lib/data/{circle-context,tasks-core}.ts`
- `lib/notifications/{email,enqueue}.ts`
- `lib/live/*`
- `lib/nav.ts`
- `components/ui/*` & `components/shared/*`
- `app/layout.tsx` & `app/(app)/c/[circleId]/layout.tsx`
- `middleware.ts`, `next.config.ts`, `package.json`

---

## 3. Database Branching Protocol

- Each member operates strictly against their dedicated Neon branch (`dev-a` and `dev-b`).
- Production and `main` branches remain protected.
- After pulling new migrations, run `npm run db:migrate`.
- If a developer branch drifts or encounters local anomalies, run `npm run db:reset` or re-branch from `main` in the Neon console.

---

## 4. Git Workflow

- Feature branches: `a/<feature-name>` and `b/<feature-name>`.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`).
- Always `git pull --rebase origin main` before creating a pull request.
- Never force-push to `main`.
- Squash merge pull requests once CI is green.

---

## 5. Frozen Inter-Team Contract Signatures

1. **Circle Context & Role Verification:**
   ```ts
   requireCircleRole(circleId: string, allowed?: CircleRole[]): Promise<CircleContext>
   ```
2. **Linked Task Creation (Member B -> Member A):**
   ```ts
   createTaskCore(ctx: CircleContext, input: TaskCoreInput): Promise<schema.Task>
   ```
3. **Notification Enqueuing (Member A -> Member B):**
   ```ts
   enqueueNotification(ctx: CircleContext, input: EnqueueNotificationInput): Promise<void>
   ```
4. **Live Version Invalidation (Both):**
   ```ts
   bumpCircleVersion(circleId: string): Promise<number>
   ```

---

## 6. Definition of Done per PR

- [x] Linting passes: `npm run lint`
- [x] Typechecking passes: `npm run typecheck`
- [x] Tests pass: `npm run test`
- [x] Tested with multiple user roles (Owner, Caregiver, Viewer).
- [x] Tested responsive mobile layout and touch interactions.
- [x] Empty states, loading skeletons, and error handling present.
