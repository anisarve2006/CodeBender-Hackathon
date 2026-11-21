# Family Care Hub: Data Model & SQL Contracts

## 1. Entity-Relationship Diagram (Mermaid)

```mermaid
erDiagram
    users ||--o{ sessions : has
    users ||--o{ auth_tokens : has
    users ||--o{ push_subscriptions : has
    users ||--o{ circle_members : belongs_to
    care_circles ||--o{ circle_members : has
    care_circles ||--|| care_recipients : monitors
    care_circles ||--o{ invitations : invites
    care_circles ||--o{ tasks : contains
    tasks ||--o{ task_comments : has
    care_circles ||--o{ appointments : schedules
    care_circles ||--o{ prescriptions : includes
    prescriptions ||--o{ medications : details
    medications ||--o{ refills : tracks
    care_circles ||--o{ documents : stores
    documents ||--o{ restricted_document_grants : gates
    documents ||--o{ document_access_log : logs
    care_circles ||--o{ updates : posts
    care_circles ||--o{ reminders : dispatches
    care_circles ||--o{ activity_log : records

    users {
        uuid id PK
        string email UK
        timestamptz email_verified_at
        string password_hash
        string full_name
        string timezone
    }

    care_circles {
        uuid id PK
        string name
        timestamptz consent_confirmed_at
        uuid created_by FK
    }

    care_recipients {
        uuid id PK
        uuid circle_id FK
        string full_name
        date date_of_birth
        string blood_group
    }

    tasks {
        uuid id PK
        uuid circle_id FK
        string title
        task_category category
        task_priority priority
        task_status status
        timestamptz due_at
        uuid assigned_to FK
    }

    medications {
        uuid id PK
        uuid circle_id FK
        string name
        string instructions_as_written
        boolean is_active
    }

    refills {
        uuid id PK
        uuid circle_id FK
        uuid medication_id FK
        int quantity_on_hand
        int daily_usage
        date next_refill_due
        refill_status status
    }

    documents {
        uuid id PK
        uuid circle_id FK
        string title
        string blob_pathname
        sensitivity_level sensitivity
    }
```

---

## 2. Role-Based Permissions Matrix

| Capability | Owner | Coordinator | Caregiver | Viewer | Care Recipient |
|---|---|---|---|---|---|
| Manage members and roles | ✅ | Invite only | ❌ | ❌ | ❌ |
| View dashboard and timeline | ✅ | ✅ | ✅ | ✅ | ✅ (simplified) |
| Create/edit appointments, meds, refills | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create and assign tasks | ✅ | ✅ | Self only | ❌ | ❌ |
| Complete / claim tasks | ✅ | ✅ | ✅ | ❌ | ❌ |
| View normal documents | ✅ | ✅ | ✅ | ✅ | ✅ |
| View restricted documents | ✅ | ✅ | If granted | ❌ | If granted |
| Delete records | ✅ | ✅ (soft) | Own uploads | ❌ | ❌ |
| View activity log | ✅ | ✅ | ✅ | ✅ | ❌ |
| Export / delete circle | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 3. SQL Functions & Contracts

| Function | Security Mode | Arguments | Return Type | Description |
|---|---|---|---|---|
| `circle_dashboard(p_circle)` | `SECURITY INVOKER` | `p_circle: uuid` | `jsonb` | 10-second high-level circle status board data |
| `who_did_what(p_circle, p_from, p_to)` | `SECURITY INVOKER` | `p_circle: uuid, p_from: timestamptz, p_to: timestamptz` | `table(...)` | Per-member task completion and accountability metrics |
| `circle_timeline(p_circle, p_cursor, p_kinds, p_limit)` | `SECURITY INVOKER` | `p_circle: uuid, p_cursor: timestamptz, p_kinds: text[], p_limit: int` | `table(...)` | Cursor-based unified timeline of events and records |
| `claim_task(p_task)` | `SECURITY INVOKER` | `p_task: uuid` | `void` | Assigns an unassigned task to `app_uid()` |
| `complete_task(p_task)` | `SECURITY INVOKER` | `p_task: uuid` | `void` | Marks task completed by `app_uid()` |
| `create_invitation(p_circle, p_email, p_role)` | `SECURITY INVOKER` | `p_circle: uuid, p_email: text, p_role: circle_role` | `text` | Returns single-use token; stores SHA-256 hash (72h expiry) |
| `accept_invitation(p_token)` | `SECURITY DEFINER` | `p_token: text` | `uuid` | Validates token, email verification, joins circle |
| `enqueue_reminder(...)` | `SECURITY INVOKER` | `circle, target, kind, channel, entity, remind_at, payload` | `void` | Idempotent reminder enqueue |

---

## 4. Migration Rules

1. **Never edit a merged migration file.**
2. If your branch's generated migration conflicts with one merged on `main` (number or `meta/_journal.json`):
   - Delete your generated migration and snapshot in `db/migrations/meta/`.
   - Rebase your branch on `main`.
   - Run `npm run db:generate` again.
3. Custom SQL migrations (`0001_extensions_and_roles.sql`, `0002_rls_helpers_and_policies.sql`, `0003_audit_triggers.sql`, `0004_sql_contracts.sql`) are **never regenerated**, only renumbered if needed.
