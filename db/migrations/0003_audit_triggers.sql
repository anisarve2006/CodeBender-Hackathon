-- 0003_audit_triggers.sql

-- 1. updated_at auto-updating trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables
           WHERE schemaname = 'public'
             AND tablename IN ('users', 'care_circles', 'care_recipients', 'tasks', 'updates', 'appointments', 'prescriptions', 'medications', 'refills', 'documents')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON %I; CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at();', t, t);
  END LOOP;
END $$;

-- 2. Refill calculations trigger
CREATE OR REPLACE FUNCTION compute_refill_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_days_supply integer;
BEGIN
  IF NEW.daily_usage > 0 AND NEW.quantity_on_hand IS NOT NULL THEN
    v_days_supply := floor(NEW.quantity_on_hand / NEW.daily_usage)::integer;
    IF NEW.last_refilled_on IS NOT NULL THEN
      NEW.next_refill_due := NEW.last_refilled_on + v_days_supply;
    ELSE
      NEW.next_refill_due := CURRENT_DATE + v_days_supply;
    END IF;
  END IF;

  -- Maintain 'ordered' status until refilled (i.e., unless quantity increased or last_refilled_on changed)
  IF OLD IS NOT NULL AND OLD.status = 'ordered' AND (NEW.quantity_on_hand = OLD.quantity_on_hand) AND (NEW.last_refilled_on IS NOT DISTINCT FROM OLD.last_refilled_on) THEN
    NEW.status := 'ordered';
  ELSIF NEW.next_refill_due IS NOT NULL THEN
    IF NEW.next_refill_due < CURRENT_DATE THEN
      NEW.status := 'overdue';
    ELSIF NEW.next_refill_due <= (CURRENT_DATE + 5) THEN
      NEW.status := 'due_soon';
    ELSE
      NEW.status := 'ok';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_refill_status ON refills;
CREATE TRIGGER trg_compute_refill_status
BEFORE INSERT OR UPDATE ON refills
FOR EACH ROW EXECUTE FUNCTION compute_refill_status();

-- 3. Recurring task trigger
CREATE OR REPLACE FUNCTION handle_recurring_task()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_due timestamptz;
BEGIN
  IF NEW.status = 'done' AND (OLD.status IS DISTINCT FROM 'done') AND NEW.recurrence_rule IS NOT NULL AND NEW.recurrence_rule != '' THEN
    IF NEW.due_at IS NOT NULL THEN
      CASE lower(NEW.recurrence_rule)
        WHEN 'daily' THEN v_next_due := NEW.due_at + interval '1 day';
        WHEN 'weekly' THEN v_next_due := NEW.due_at + interval '1 week';
        WHEN 'monthly' THEN v_next_due := NEW.due_at + interval '1 month';
        ELSE v_next_due := NEW.due_at + interval '1 week';
      END CASE;
    END IF;

    INSERT INTO tasks (
      circle_id,
      title,
      description,
      category,
      priority,
      status,
      due_at,
      assigned_to,
      linked_entity_type,
      linked_entity_id,
      recurrence_rule,
      created_by
    ) VALUES (
      NEW.circle_id,
      NEW.title,
      NEW.description,
      NEW.category,
      NEW.priority,
      'todo',
      v_next_due,
      NEW.assigned_to,
      NEW.linked_entity_type,
      NEW.linked_entity_id,
      NEW.recurrence_rule,
      NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recurring_task ON tasks;
CREATE TRIGGER trg_recurring_task
AFTER UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION handle_recurring_task();

-- 4. Central Audit Log Trigger
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
      ELSIF TG_TABLE_NAME = 'circle_members' AND NEW.role IS DISTINCT FROM OLD.role THEN
        v_action := 'role_changed';
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

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach log_activity triggers
DROP TRIGGER IF EXISTS trg_audit_tasks ON tasks;
CREATE TRIGGER trg_audit_tasks AFTER INSERT OR UPDATE OR DELETE ON tasks FOR EACH ROW EXECUTE FUNCTION log_activity();

DROP TRIGGER IF EXISTS trg_audit_appointments ON appointments;
CREATE TRIGGER trg_audit_appointments AFTER INSERT OR UPDATE OR DELETE ON appointments FOR EACH ROW EXECUTE FUNCTION log_activity();

DROP TRIGGER IF EXISTS trg_audit_medications ON medications;
CREATE TRIGGER trg_audit_medications AFTER INSERT OR UPDATE OR DELETE ON medications FOR EACH ROW EXECUTE FUNCTION log_activity();

DROP TRIGGER IF EXISTS trg_audit_refills ON refills;
CREATE TRIGGER trg_audit_refills AFTER INSERT OR UPDATE OR DELETE ON refills FOR EACH ROW EXECUTE FUNCTION log_activity();

DROP TRIGGER IF EXISTS trg_audit_documents ON documents;
CREATE TRIGGER trg_audit_documents AFTER INSERT OR UPDATE OR DELETE ON documents FOR EACH ROW EXECUTE FUNCTION log_activity();

DROP TRIGGER IF EXISTS trg_audit_prescriptions ON prescriptions;
CREATE TRIGGER trg_audit_prescriptions AFTER INSERT OR UPDATE OR DELETE ON prescriptions FOR EACH ROW EXECUTE FUNCTION log_activity();

DROP TRIGGER IF EXISTS trg_audit_updates ON updates;
CREATE TRIGGER trg_audit_updates AFTER INSERT OR UPDATE OR DELETE ON updates FOR EACH ROW EXECUTE FUNCTION log_activity();
