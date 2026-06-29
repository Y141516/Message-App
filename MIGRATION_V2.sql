-- ============================================================
-- MIGRATION V2 — Run in Supabase SQL Editor
-- Run ONCE after deploying this update
-- ============================================================

-- 1. Add group_ids column to announcements (replaces single group_id)
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS group_ids UUID[];

-- 2. Remove old single group_id if it exists (keep backward compat)
-- ALTER TABLE announcements DROP COLUMN IF EXISTS group_id; -- optional

-- 3. Remove character limit on announcement body (TEXT is already unlimited in Postgres)
-- Nothing needed — TEXT in Postgres has no limit by default

-- 4. Add user_voice_url to messages if not already there
ALTER TABLE messages ADD COLUMN IF NOT EXISTS user_voice_url TEXT;

-- 5. Enable Realtime on all critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE queues;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE replies;
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;

-- 6. Verify which tables have Realtime enabled
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- ============================================================
-- Storage buckets needed (create in Supabase Dashboard):
-- 1. "message-media" — public: TRUE
-- 2. "reply-audio"   — public: TRUE
-- 3. "resources"     — public: TRUE
-- ============================================================
