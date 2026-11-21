-- 0002_rls_helpers_and_policies.sql

-- Helper: Retrieve current application user ID
CREATE OR REPLACE FUNCTION app_uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.user_id', true), '')::uuid;
$$;

-- Helper: Check if user is a member of circle
CREATE OR REPLACE FUNCTION is_circle_member(c uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM circle_members
    WHERE circle_id = c AND user_id = app_uid()
  );
$$;

-- Helper: Get user's role in circle
CREATE OR REPLACE FUNCTION circle_role_of(c uuid)
RETURNS circle_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM circle_members
  WHERE circle_id = c AND user_id = app_uid();
$$;

-- Helper: Check if user has one of the specified roles in circle
CREATE OR REPLACE FUNCTION has_circle_role(c uuid, roles circle_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM circle_members
    WHERE circle_id = c AND user_id = app_uid() AND role = ANY(roles)
  );
$$;

-- Helper: Check document visibility
CREATE OR REPLACE FUNCTION can_view_document(d uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_circle uuid;
  v_sensitivity sensitivity_level;
  v_role circle_role;
BEGIN
  SELECT circle_id, sensitivity INTO v_circle, v_sensitivity FROM documents WHERE id = d;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  v_role := circle_role_of(v_circle);
  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  IF v_sensitivity = 'normal' THEN
    RETURN true;
  END IF;

  IF v_role IN ('owner', 'coordinator') THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM restricted_document_grants
    WHERE document_id = d AND user_id = app_uid()
  );
END;
$$;

-- View: member_profiles
CREATE OR REPLACE VIEW member_profiles AS
SELECT
  u.id,
  u.full_name,
  u.avatar_url,
  u.timezone
FROM users u
WHERE u.id = app_uid()
   OR EXISTS (
     SELECT 1 FROM circle_members cm1
     JOIN circle_members cm2 ON cm1.circle_id = cm2.circle_id
     WHERE cm1.user_id = app_uid() AND cm2.user_id = u.id
   );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    GRANT SELECT ON member_profiles TO app_user;
  END IF;
END $$;

-- Trigger: Prevent removing or demoting the last owner of a circle
CREATE OR REPLACE FUNCTION check_last_owner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_owner_count integer;
BEGIN
  IF (TG_OP = 'DELETE' AND OLD.role = 'owner') OR (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND NEW.role != 'owner') THEN
    SELECT COUNT(*) INTO v_owner_count
    FROM circle_members
    WHERE circle_id = OLD.circle_id AND role = 'owner' AND user_id != OLD.user_id;

    IF v_owner_count < 1 THEN
      RAISE EXCEPTION 'Cannot remove or demote the last owner of a circle.';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_owner ON circle_members;
CREATE TRIGGER trg_prevent_last_owner
BEFORE UPDATE OR DELETE ON circle_members
FOR EACH ROW EXECUTE FUNCTION check_last_owner();

-- Enable Row Level Security on all circle-scoped tables
ALTER TABLE care_circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE refills ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE restricted_document_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- 1. care_circles policies
CREATE POLICY care_circles_select ON care_circles
  FOR SELECT USING (is_circle_member(id) OR created_by = app_uid());

CREATE POLICY care_circles_insert ON care_circles
  FOR INSERT WITH CHECK (created_by = app_uid());

CREATE POLICY care_circles_update ON care_circles
  FOR UPDATE USING (has_circle_role(id, ARRAY['owner', 'coordinator']::circle_role[]));

CREATE POLICY care_circles_delete ON care_circles
  FOR DELETE USING (has_circle_role(id, ARRAY['owner']::circle_role[]));

-- 2. care_recipients policies
CREATE POLICY care_recipients_select ON care_recipients
  FOR SELECT USING (is_circle_member(circle_id));

CREATE POLICY care_recipients_insert ON care_recipients
  FOR INSERT WITH CHECK (has_circle_role(circle_id, ARRAY['owner', 'coordinator']::circle_role[]));

CREATE POLICY care_recipients_update ON care_recipients
  FOR UPDATE USING (has_circle_role(circle_id, ARRAY['owner', 'coordinator']::circle_role[]));

CREATE POLICY care_recipients_delete ON care_recipients
  FOR DELETE USING (has_circle_role(circle_id, ARRAY['owner']::circle_role[]));

-- 3. circle_members policies
CREATE POLICY circle_members_select ON circle_members
  FOR SELECT USING (is_circle_member(circle_id));

CREATE POLICY circle_members_insert ON circle_members
  FOR INSERT WITH CHECK (has_circle_role(circle_id, ARRAY['owner', 'coordinator']::circle_role[]) OR user_id = app_uid());

CREATE POLICY circle_members_update ON circle_members
  FOR UPDATE USING (has_circle_role(circle_id, ARRAY['owner', 'coordinator']::circle_role[]));

CREATE POLICY circle_members_delete ON circle_members
  FOR DELETE USING (has_circle_role(circle_id, ARRAY['owner', 'coordinator']::circle_role[]) OR user_id = app_uid());

-- 4. invitations policies
CREATE POLICY invitations_select ON invitations
  FOR SELECT USING (has_circle_role(circle_id, ARRAY['owner', 'coordinator']::circle_role[]));

CREATE POLICY invitations_insert ON invitations
  FOR INSERT WITH CHECK (has_circle_role(circle_id, ARRAY['owner', 'coordinator']::circle_role[]));

CREATE POLICY invitations_update ON invitations
  FOR UPDATE USING (has_circle_role(circle_id, ARRAY['owner', 'coordinator']::circle_role[]));

CREATE POLICY invitations_delete ON invitations
  FOR DELETE USING (has_circle_role(circle_id, ARRAY['owner', 'coordinator']::circle_role[]));

-- 5. tasks policies
CREATE POLICY tasks_select ON tasks
  FOR SELECT USING (is_circle_member(circle_id));

CREATE POLICY tasks_insert ON tasks
  FOR INSERT WITH CHECK (
    has_circle_role(circle_id, ARRAY['owner', 'coordinator']::circle_role[])
    OR (
      has_circle_role(circle_id, ARRAY['caregiver']::circle_role[])
      AND (assigned_to = app_uid() OR assigned_to IS NULL)
    )
  );

CREATE POLICY tasks_update ON tasks
  FOR UPDATE USING (
    has_circle_role(circle_id, ARRAY['owner', 'coordinator']::circle_role[])
    OR (
      has_circle_role(circle_id, ARRAY['caregiver']::circle_role[])
      AND (assigned_to = app_uid() OR assigned_to IS NULL)
    )
  );

CREATE POLICY tasks_delete ON tasks
  FOR DELETE USING (
    has_circle_role(circle_id, ARRAY['owner', 'coordinator']::circle_role[])
    OR (
      has_circle_role(circle_id, ARRAY['caregiver']::circle_role[])
      AND created_by = app_uid()
    )
  );

-- 6. task_comments policies
CREATE POLICY task_comments_select ON task_comments
  FOR SELECT USING (is_circle_member(circle_id));

CREATE POLICY task_comments_insert ON task_comments
  FOR INSERT WITH CHECK (
    is_circle_member(circle_id)
    AND author_id = app_uid()
    AND circle_role_of(circle_id) NOT IN ('viewer', 'care_recipient')
  );

-- 7. updates policies
CREATE POLICY updates_select ON updates
  FOR SELECT USING (is_circle_member(circle_id));

CREATE POLICY updates_insert ON updates
  FOR INSERT WITH CHECK (
    is_circle_member(circle_id)
    AND author_id = app_uid()
    AND circle_role_of(circle_id) != 'viewer'
  );

CREATE POLICY updates_update ON updates
  FOR UPDATE USING (
    author_id = app_uid()
    OR has_circle_role(circle_id, ARRAY['owner', 'coordinator']::circle_role[])
  );

CREATE POLICY updates_delete ON updates
  FOR DELETE USING (
    author_id = app_uid()
    OR has_circle_role(circle_id, ARRAY['owner', 'coordinator']::circle_role[])
  );

-- 8. appointments policies
CREATE POLICY appointments_select ON appointments
  FOR SELECT USING (is_circle_member(circle_id));

CREATE POLICY appointments_insert ON appointments
  FOR INSERT WITH CHECK (has_circle_role(circle_id, ARRAY['owner', 'coordinator', 'caregiver']::circle_role[]));

CREATE POLICY appointments_update ON appointments
  FOR UPDATE USING (has_circle_role(circle_id, ARRAY['owner', 'coordinator', 'caregiver']::circle_role[]));

CREATE POLICY appointments_delete ON appointments
  FOR DELETE USING (
    has_circle_role(circle_id, ARRAY['owner', 'coordinator']::circle_role[])
    OR (has_circle_role(circle_id, ARRAY['caregiver']::circle_role[]) AND created_by = app_uid())
  );

-- 9. prescriptions policies
CREATE POLICY prescriptions_select ON prescriptions
  FOR SELECT USING (is_circle_member(circle_id));

CREATE POLICY prescriptions_insert ON prescriptions
  FOR INSERT WITH CHECK (has_circle_role(circle_id, ARRAY['owner', 'coordinator', 'caregiver']::circle_role[]));

CREATE POLICY prescriptions_update ON prescriptions
  FOR UPDATE USING (has_circle_role(circle_id, ARRAY['owner', 'coordinator', 'caregiver']::circle_role[]));

CREATE POLICY prescriptions_delete ON prescriptions
  FOR DELETE USING (has_circle_role(circle_id, ARRAY['owner', 'coordinator']::circle_role[]));

-- 10. medications policies
CREATE POLICY medications_select ON medications
  FOR SELECT USING (is_circle_member(circle_id));

CREATE POLICY medications_insert ON medications
  FOR INSERT WITH CHECK (has_circle_role(circle_id, ARRAY['owner', 'coordinator', 'caregiver']::circle_role[]));

CREATE POLICY medications_update ON medications
  FOR UPDATE USING (has_circle_role(circle_id, ARRAY['owner', 'coordinator', 'caregiver']::circle_role[]));

CREATE POLICY medications_delete ON medications
  FOR DELETE USING (has_circle_role(circle_id, ARRAY['owner', 'coordinator']::circle_role[]));

-- 11. refills policies
CREATE POLICY refills_select ON refills
  FOR SELECT USING (is_circle_member(circle_id));

CREATE POLICY refills_insert ON refills
  FOR INSERT WITH CHECK (has_circle_role(circle_id, ARRAY['owner', 'coordinator', 'caregiver']::circle_role[]));

CREATE POLICY refills_update ON refills
  FOR UPDATE USING (has_circle_role(circle_id, ARRAY['owner', 'coordinator', 'caregiver']::circle_role[]));

CREATE POLICY refills_delete ON refills
  FOR DELETE USING (has_circle_role(circle_id, ARRAY['owner', 'coordinator']::circle_role[]));

-- 12. documents policies
CREATE POLICY documents_select ON documents
  FOR SELECT USING (is_circle_member(circle_id) AND can_view_document(id));

CREATE POLICY documents_insert ON documents
  FOR INSERT WITH CHECK (has_circle_role(circle_id, ARRAY['owner', 'coordinator', 'caregiver']::circle_role[]));

CREATE POLICY documents_update ON documents
  FOR UPDATE USING (
    has_circle_role(circle_id, ARRAY['owner', 'coordinator']::circle_role[])
    OR (has_circle_role(circle_id, ARRAY['caregiver']::circle_role[]) AND uploaded_by = app_uid())
  );

CREATE POLICY documents_delete ON documents
  FOR DELETE USING (
    has_circle_role(circle_id, ARRAY['owner', 'coordinator']::circle_role[])
    OR (has_circle_role(circle_id, ARRAY['caregiver']::circle_role[]) AND uploaded_by = app_uid())
  );

-- 13. restricted_document_grants policies
CREATE POLICY restricted_document_grants_select ON restricted_document_grants
  FOR SELECT USING (
    user_id = app_uid()
    OR EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_id
        AND has_circle_role(d.circle_id, ARRAY['owner', 'coordinator']::circle_role[])
    )
  );

CREATE POLICY restricted_document_grants_insert ON restricted_document_grants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_id
        AND has_circle_role(d.circle_id, ARRAY['owner', 'coordinator']::circle_role[])
    )
  );

CREATE POLICY restricted_document_grants_delete ON restricted_document_grants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_id
        AND has_circle_role(d.circle_id, ARRAY['owner', 'coordinator']::circle_role[])
    )
  );

-- 14. document_access_log policies
CREATE POLICY document_access_log_select ON document_access_log
  FOR SELECT USING (is_circle_member(circle_id));

-- 15. reminders policies
CREATE POLICY reminders_select ON reminders
  FOR SELECT USING (target_user_id = app_uid());

CREATE POLICY reminders_insert ON reminders
  FOR INSERT WITH CHECK (is_circle_member(circle_id));

CREATE POLICY reminders_update ON reminders
  FOR UPDATE USING (
    target_user_id = app_uid()
    OR has_circle_role(circle_id, ARRAY['owner', 'coordinator']::circle_role[])
  );

CREATE POLICY reminders_delete ON reminders
  FOR DELETE USING (
    target_user_id = app_uid()
    OR has_circle_role(circle_id, ARRAY['owner', 'coordinator']::circle_role[])
  );

-- 16. activity_log policies (care recipients cannot view activity log)
CREATE POLICY activity_log_select ON activity_log
  FOR SELECT USING (
    is_circle_member(circle_id)
    AND circle_role_of(circle_id) != 'care_recipient'
  );
