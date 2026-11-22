-- Migration 0006: User Notification Preferences and Push Subscriptions RLS
-- Allows app_user to manage their own push_subscriptions and update their own notification_prefs

GRANT SELECT, UPDATE(notification_prefs) ON users TO app_user;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_self_read'
  ) THEN
    CREATE POLICY users_self_read ON users
      FOR SELECT USING (id = app_uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_self_update_prefs'
  ) THEN
    CREATE POLICY users_self_update_prefs ON users
      FOR UPDATE USING (id = app_uid())
      WITH CHECK (id = app_uid());
  END IF;
END $$;

GRANT SELECT, INSERT, DELETE ON push_subscriptions TO app_user;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'push_subs_self_all'
  ) THEN
    CREATE POLICY push_subs_self_all ON push_subscriptions
      FOR ALL USING (user_id = app_uid())
      WITH CHECK (user_id = app_uid());
  END IF;
END $$;


-- Fix log_activity trigger for tables without 'role' column
CREATE OR REPLACE FUNCTION log_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_circle_id uuid;
  v_actor_id uuid;
  v_action text;
  v_entity_type text;
  v_entity_id uuid;
  v_summary text;
  v_diff jsonb := '{}'::jsonb;
  v_is_restricted boolean := false;
BEGIN
  v_actor_id := app_uid();
  v_entity_type := TG_TABLE_NAME;

  IF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id;
    v_circle_id := OLD.circle_id;
    v_action := 'deleted';
  ELSE
    v_entity_id := NEW.id;
    v_circle_id := NEW.circle_id;
    IF TG_OP = 'INSERT' THEN
      v_action := 'created';
      IF TG_TABLE_NAME = 'documents' THEN
        v_action := 'uploaded';
      ELSIF TG_TABLE_NAME = 'circle_members' THEN
        v_action := 'joined';
      END IF;
    ELSE
      v_action := 'updated';
      IF TG_TABLE_NAME = 'tasks' THEN
        IF NEW.status = 'done' AND OLD.status != 'done' THEN
          v_action := 'completed';
        ELSIF NEW.assigned_to IS NOT DISTINCT FROM v_actor_id AND OLD.assigned_to IS NULL THEN
          v_action := 'claimed';
        ELSIF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
          v_action := 'assigned';
        END IF;
      ELSIF TG_TABLE_NAME = 'circle_members' THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
          v_action := 'role_changed';
        END IF;
      END IF;
    END IF;
  END IF;

  -- Check if restricted document
  IF TG_TABLE_NAME = 'documents' THEN
    IF (TG_OP = 'DELETE' AND OLD.sensitivity = 'restricted') OR (TG_OP != 'DELETE' AND NEW.sensitivity = 'restricted') THEN
      v_is_restricted := true;
    END IF;
  END IF;

  IF v_is_restricted THEN
    v_summary := format('a restricted document was %s', v_action);
  ELSE
    IF TG_TABLE_NAME = 'tasks' THEN
      v_summary := format('Task "%s" was %s', COALESCE(NEW.title, OLD.title), v_action);
    ELSIF TG_TABLE_NAME = 'appointments' THEN
      v_summary := format('Appointment "%s" was %s', COALESCE(NEW.title, OLD.title), v_action);
    ELSIF TG_TABLE_NAME = 'medications' THEN
      v_summary := format('Medication "%s" was %s', COALESCE(NEW.name, OLD.name), v_action);
    ELSIF TG_TABLE_NAME = 'documents' THEN
      v_summary := format('Document "%s" was %s', COALESCE(NEW.title, OLD.title), v_action);
    ELSIF TG_TABLE_NAME = 'updates' THEN
      v_summary := format('Family update was %s', v_action);
    ELSIF TG_TABLE_NAME = 'circle_members' THEN
      v_summary := format('Member was %s', v_action);
    ELSE
      v_summary := format('%s was %s', v_entity_type, v_action);
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_diff := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  END IF;

  INSERT INTO activity_log (
    circle_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    summary,
    diff,
    created_at
  ) VALUES (
    v_circle_id,
    v_actor_id,
    v_action,
    v_entity_type,
    v_entity_id,
    v_summary,
    v_diff,
    now()
  );

  RETURN NULL;
END;
$$;
