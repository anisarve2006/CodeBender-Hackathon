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
