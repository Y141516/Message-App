-- ============================================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- This enables instant real-time updates in the app
-- ============================================================

-- Enable Realtime on all critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE queues;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE replies;
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;

-- Verify which tables are enabled (run this to check)
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
