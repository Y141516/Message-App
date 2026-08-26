-- ============================================================
-- MIGRATION V3 — Run in Supabase SQL Editor
-- Run ONCE after deploying this round of fixes
-- ============================================================

-- 1. Add "always open" flag to groups. Members of a group with this set to
--    TRUE can send a message even when the leader's queue is currently
--    closed (used for e.g. a "Foreigners" group with tighter turnout during
--    the normal queue window). While an actual queue IS open, everyone —
--    including always-open members — is still limited to one message per
--    session; the exemption only applies once the queue is closed.
ALTER TABLE groups ADD COLUMN IF NOT EXISTS always_open BOOLEAN NOT NULL DEFAULT FALSE;

-- Optional: mark an existing group as always-open right now, e.g.
-- UPDATE groups SET always_open = TRUE WHERE name = 'Foreigners';

-- 2. Re-affirm Realtime is enabled on everything the app subscribes to.
--    (Re-running ADD TABLE on an already-added table is a harmless no-op.)
ALTER PUBLICATION supabase_realtime ADD TABLE queues;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE replies;
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;

-- 3. Verify
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

SELECT id, name, always_open FROM groups ORDER BY name;

-- ============================================================
-- No other schema changes needed for this round — the PDF download fix,
-- audio-file-upload option, clear-data fixes, realtime fixes, and leader
-- profile nav fix are all application-code changes only.
-- ============================================================
