-- 0004_sql_contracts.sql

-- 1. claim_task(p_task)
CREATE OR REPLACE FUNCTION claim_task(p_task uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE tasks
  SET assigned_to = app_uid()
  WHERE id = p_task
    AND is_circle_member(circle_id)
    AND (assigned_to IS NULL OR assigned_to = app_uid());
END;
$$;
COMMENT ON FUNCTION claim_task(uuid) IS 'Claims an unassigned task for the calling authenticated member.';

-- 2. complete_task(p_task)
CREATE OR REPLACE FUNCTION complete_task(p_task uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE tasks
  SET status = 'done',
      completed_by = app_uid(),
      completed_at = now()
  WHERE id = p_task
    AND is_circle_member(circle_id);
END;
$$;
COMMENT ON FUNCTION complete_task(uuid) IS 'Marks a task completed by the calling user.';

-- 3. create_invitation(p_circle, p_email, p_role)
CREATE OR REPLACE FUNCTION create_invitation(
  p_circle uuid,
  p_email text,
  p_role circle_role
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_raw_token text;
  v_token_hash text;
BEGIN
  IF NOT has_circle_role(p_circle, ARRAY['owner', 'coordinator']::circle_role[]) THEN
    RAISE EXCEPTION 'Not authorized to create invitations in this circle';
  END IF;

  v_raw_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_raw_token, 'sha256'), 'hex');

  INSERT INTO invitations (
    circle_id,
    email,
    role,
    token_hash,
    expires_at,
    invited_by
  ) VALUES (
    p_circle,
    lower(trim(p_email)),
    p_role,
    v_token_hash,
    now() + interval '72 hours',
    app_uid()
  );

  RETURN v_raw_token;
END;
$$;
COMMENT ON FUNCTION create_invitation(uuid, text, circle_role) IS 'Generates a secure 72h invitation token for a circle.';

-- 4. accept_invitation(p_token)
CREATE OR REPLACE FUNCTION accept_invitation(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_hash text;
  v_invitation record;
  v_user_email text;
  v_user_verified timestamptz;
BEGIN
  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  SELECT * INTO v_invitation
  FROM invitations
  WHERE token_hash = v_token_hash
    AND accepted_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid, expired, or already used invitation token';
  END IF;

  SELECT email, email_verified_at INTO v_user_email, v_user_verified
  FROM users
  WHERE id = app_uid();

  IF v_user_email IS NULL OR v_user_verified IS NULL THEN
    RAISE EXCEPTION 'Must be signed in with a verified email to accept invitation';
  END IF;

  IF lower(v_user_email) != lower(v_invitation.email) THEN
    RAISE EXCEPTION 'Invitation was issued to a different email address';
  END IF;

  INSERT INTO circle_members (circle_id, user_id, role, invited_by, joined_at)
  VALUES (v_invitation.circle_id, app_uid(), v_invitation.role, v_invitation.invited_by, now())
  ON CONFLICT (circle_id, user_id)
  DO UPDATE SET role = EXCLUDED.role;

  UPDATE invitations
  SET accepted_at = now()
  WHERE id = v_invitation.id;

  RETURN v_invitation.circle_id;
END;
$$;
COMMENT ON FUNCTION accept_invitation(text) IS 'Validates invitation token, verifies email match, and admits user to circle.';

-- 5. enqueue_reminder(...)
CREATE OR REPLACE FUNCTION enqueue_reminder(
  p_circle uuid,
  p_target_user uuid,
  p_kind reminder_kind,
  p_channel notification_channel,
  p_entity_type text,
  p_entity_id uuid,
  p_remind_at timestamptz,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  INSERT INTO reminders (
    circle_id,
    target_user_id,
    kind,
    channel,
    entity_type,
    entity_id,
    remind_at,
    payload
  ) VALUES (
    p_circle,
    p_target_user,
    p_kind,
    p_channel,
    p_entity_type,
    p_entity_id,
    p_remind_at,
    p_payload
  )
  ON CONFLICT (kind, entity_id, target_user_id, remind_at) DO NOTHING;
END;
$$;
COMMENT ON FUNCTION enqueue_reminder(uuid, uuid, reminder_kind, notification_channel, text, uuid, timestamptz, jsonb) IS 'Enqueues a reminder with idempotent deduplication.';

-- 6. who_did_what(p_circle, p_from, p_to)
CREATE OR REPLACE FUNCTION who_did_what(
  p_circle uuid,
  p_from timestamptz DEFAULT (now() - interval '30 days'),
  p_to timestamptz DEFAULT now()
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  avatar_url text,
  role circle_role,
  completed_count bigint,
  open_count bigint,
  overdue_count bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.full_name,
    u.avatar_url,
    cm.role,
    COUNT(t_comp.id) AS completed_count,
    COUNT(t_open.id) AS open_count,
    COUNT(t_over.id) AS overdue_count
  FROM circle_members cm
  JOIN users u ON cm.user_id = u.id
  LEFT JOIN tasks t_comp ON t_comp.circle_id = p_circle
                        AND t_comp.assigned_to = u.id
                        AND t_comp.status = 'done'
                        AND t_comp.completed_at >= p_from
                        AND t_comp.completed_at <= p_to
  LEFT JOIN tasks t_open ON t_open.circle_id = p_circle
                        AND t_open.assigned_to = u.id
                        AND t_open.status IN ('todo', 'in_progress')
                        AND (t_open.due_at IS NULL OR t_open.due_at >= now())
  LEFT JOIN tasks t_over ON t_over.circle_id = p_circle
                        AND t_over.assigned_to = u.id
                        AND t_over.status IN ('todo', 'in_progress')
                        AND t_over.due_at < now()
  WHERE cm.circle_id = p_circle
  GROUP BY u.id, u.full_name, u.avatar_url, cm.role;
END;
$$;
COMMENT ON FUNCTION who_did_what(uuid, timestamptz, timestamptz) IS 'Calculates member task accountability metrics.';

-- 7. circle_timeline(p_circle, p_cursor, p_kinds, p_limit)
CREATE OR REPLACE FUNCTION circle_timeline(
  p_circle uuid,
  p_cursor timestamptz DEFAULT NULL,
  p_kinds text[] DEFAULT NULL,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  kind text,
  id uuid,
  occurred_at timestamptz,
  title text,
  subtitle text,
  actor_id uuid,
  sensitivity sensitivity_level
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  WITH items AS (
    -- Appointments
    SELECT
      'appointment'::text AS kind,
      a.id,
      a.starts_at AS occurred_at,
      a.title,
      COALESCE(a.doctor_name, a.location, '') AS subtitle,
      a.created_by AS actor_id,
      a.sensitivity
    FROM appointments a
    WHERE a.circle_id = p_circle
      AND (p_kinds IS NULL OR 'appointment' = ANY(p_kinds))

    UNION ALL

    -- Prescriptions
    SELECT
      'prescription'::text AS kind,
      pr.id,
      pr.created_at AS occurred_at,
      format('Prescription by %s', COALESCE(pr.doctor_name, 'Doctor')) AS title,
      COALESCE(pr.notes, '') AS subtitle,
      pr.created_by AS actor_id,
      'normal'::sensitivity_level AS sensitivity
    FROM prescriptions pr
    WHERE pr.circle_id = p_circle
      AND (p_kinds IS NULL OR 'prescription' = ANY(p_kinds))

    UNION ALL

    -- Documents
    SELECT
      'document'::text AS kind,
      d.id,
      COALESCE(d.report_date::timestamptz, d.created_at) AS occurred_at,
      CASE
        WHEN d.sensitivity = 'restricted' AND NOT can_view_document(d.id)
          THEN 'Restricted document'
        ELSE d.title
      END AS title,
      d.kind::text AS subtitle,
      d.uploaded_by AS actor_id,
      d.sensitivity
    FROM documents d
    WHERE d.circle_id = p_circle
      AND (p_kinds IS NULL OR 'document' = ANY(p_kinds))

    UNION ALL

    -- Updates
    SELECT
      'update'::text AS kind,
      up.id,
      up.created_at AS occurred_at,
      substring(up.body from 1 for 60) AS title,
      COALESCE(up.mood_tag, '') AS subtitle,
      up.author_id AS actor_id,
      'normal'::sensitivity_level AS sensitivity
    FROM updates up
    WHERE up.circle_id = p_circle
      AND (p_kinds IS NULL OR 'update' = ANY(p_kinds))
  )
  SELECT
    items.kind,
    items.id,
    items.occurred_at,
    items.title,
    items.subtitle,
    items.actor_id,
    items.sensitivity
  FROM items
  WHERE (p_cursor IS NULL OR items.occurred_at < p_cursor)
  ORDER BY items.occurred_at DESC
  LIMIT p_limit;
END;
$$;
COMMENT ON FUNCTION circle_timeline(uuid, timestamptz, text[], int) IS 'Cursor-based unified activity and record timeline.';

-- 8. circle_dashboard(p_circle)
CREATE OR REPLACE FUNCTION circle_dashboard(p_circle uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_overdue_tasks jsonb;
  v_overdue_count int;
  v_next_appts jsonb;
  v_refills_due jsonb;
  v_refills_overdue_count int;
  v_pending_members jsonb;
  v_recent_activity jsonb;
  v_latest_update jsonb;
  v_status text := 'green';
  v_status_reason text := 'All care items are on schedule.';
BEGIN
  -- Overdue tasks
  SELECT
    COALESCE(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb),
    COUNT(*)
  INTO v_overdue_tasks, v_overdue_count
  FROM tasks t
  WHERE t.circle_id = p_circle
    AND t.status IN ('todo', 'in_progress')
    AND t.due_at < now()
    AND t.deleted_at IS NULL;

  -- Next appointments (up to 3)
  SELECT COALESCE(jsonb_agg(to_jsonb(a.*)), '[]'::jsonb)
  INTO v_next_appts
  FROM (
    SELECT id, title, doctor_name, specialty, location, starts_at, ends_at, status
    FROM appointments
    WHERE circle_id = p_circle
      AND starts_at >= now()
      AND status = 'scheduled'
      AND deleted_at IS NULL
    ORDER BY starts_at ASC
    LIMIT 3
  ) a;

  -- Refills due (<= 7 days or overdue)
  SELECT
    COALESCE(jsonb_agg(to_jsonb(r.*)), '[]'::jsonb),
    COUNT(*) FILTER (WHERE r.next_refill_due < CURRENT_DATE)
  INTO v_refills_due, v_refills_overdue_count
  FROM (
    SELECT ref.id, m.name AS medication_name, ref.quantity_on_hand, ref.daily_usage, ref.next_refill_due, ref.status
    FROM refills ref
    JOIN medications m ON ref.medication_id = m.id
    WHERE ref.circle_id = p_circle
      AND (ref.next_refill_due <= (CURRENT_DATE + 7) OR ref.status IN ('overdue', 'due_soon'))
    ORDER BY ref.next_refill_due ASC
  ) r;

  -- Pending by member
  SELECT COALESCE(jsonb_agg(to_jsonb(pm.*)), '[]'::jsonb)
  INTO v_pending_members
  FROM (
    SELECT
      u.id AS user_id,
      u.full_name,
      u.avatar_url,
      COUNT(t_open.id) AS open,
      COUNT(t_over.id) AS overdue,
      COUNT(t_done.id) AS done_this_week
    FROM circle_members cm
    JOIN users u ON cm.user_id = u.id
    LEFT JOIN tasks t_open ON t_open.circle_id = p_circle AND t_open.assigned_to = u.id AND t_open.status IN ('todo', 'in_progress')
    LEFT JOIN tasks t_over ON t_over.circle_id = p_circle AND t_over.assigned_to = u.id AND t_over.status IN ('todo', 'in_progress') AND t_over.due_at < now()
    LEFT JOIN tasks t_done ON t_done.circle_id = p_circle AND t_done.assigned_to = u.id AND t_done.status = 'done' AND t_done.completed_at >= (now() - interval '7 days')
    WHERE cm.circle_id = p_circle
    GROUP BY u.id, u.full_name, u.avatar_url
  ) pm;

  -- Recent activity (10 items)
  SELECT COALESCE(jsonb_agg(to_jsonb(act.*)), '[]'::jsonb)
  INTO v_recent_activity
  FROM (
    SELECT id, actor_id, action, entity_type, summary, created_at
    FROM activity_log
    WHERE circle_id = p_circle
    ORDER BY created_at DESC
    LIMIT 10
  ) act;

  -- Latest update
  SELECT to_jsonb(up.*)
  INTO v_latest_update
  FROM (
    SELECT id, author_id, body, mood_tag, created_at
    FROM updates
    WHERE circle_id = p_circle
      AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  ) up;

  -- Calculate traffic-light status
  IF v_overdue_count > 0 OR v_refills_overdue_count > 0 THEN
    v_status := 'red';
    v_status_reason := format('%s overdue task(s) and %s overdue refill(s) need attention.', v_overdue_count, v_refills_overdue_count);
  ELSIF (jsonb_array_length(v_refills_due) > 0) THEN
    v_status := 'amber';
    v_status_reason := 'Medications due for refill within 7 days.';
  END IF;

  RETURN jsonb_build_object(
    'status', v_status,
    'status_reason', v_status_reason,
    'overdue_tasks', v_overdue_tasks,
    'next_appointments', v_next_appts,
    'refills_due', v_refills_due,
    'pending_by_member', v_pending_members,
    'recent_activity', v_recent_activity,
    'latest_update', v_latest_update
  );
END;
$$;
COMMENT ON FUNCTION circle_dashboard(uuid) IS '10-second high-level circle status board data.';
