-- 0005_member_b_enhancements.sql
-- Fix reminder unique constraint to include channel so parallel email & push notifications succeed
DROP INDEX IF EXISTS "reminders_kind_entity_user_time_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "reminders_kind_entity_user_channel_time_idx"
  ON "reminders" USING btree ("kind", "entity_id", "target_user_id", "channel", "remind_at");

-- Update enqueue_reminder function with channel in ON CONFLICT target
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
  ON CONFLICT (kind, entity_id, target_user_id, channel, remind_at) DO NOTHING;
END;
$$;
COMMENT ON FUNCTION enqueue_reminder(uuid, uuid, reminder_kind, notification_channel, text, uuid, timestamptz, jsonb)
  IS 'Enqueues a reminder with channel-aware idempotent deduplication.';

-- Allow caregivers with record management capability to delete unsent reminders on appointment reschedule
DROP POLICY IF EXISTS reminders_delete ON reminders;
CREATE POLICY reminders_delete ON reminders
  FOR DELETE USING (
    target_user_id = app_uid()
    OR has_circle_role(circle_id, ARRAY['owner', 'coordinator', 'caregiver']::circle_role[])
  );
