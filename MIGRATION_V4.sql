-- ============================================================
-- MIGRATION V4 — Run in Supabase SQL Editor
-- Heavy-load readiness: fixes real race conditions that only show up
-- under concurrent traffic (e.g. a queue opening to 1,000s of users at once)
-- ============================================================

-- 1. Prevent duplicate mass-broadcasts when a queue auto-closes.
--    Previously, EVERY concurrent request landing right as the queue hits
--    its limit would independently detect "queue just closed" and each
--    kick off its own full broadcast to every user — under heavy concurrent
--    traffic this could fire the same "queue closed" notification to
--    everyone many times over. This flag lets exactly one request claim
--    the notification job atomically.
ALTER TABLE queues ADD COLUMN IF NOT EXISTS auto_close_notified BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Atomic, race-condition-safe message submission.
--    Previously the "is queue open / under limit / not a duplicate" checks
--    happened in application code as separate read-then-write steps. Under
--    heavy concurrent load (many people submitting the instant a queue
--    opens), many requests could all read "29 of 30 slots used" at the same
--    moment, before any of their inserts landed — and all of them would then
--    proceed, overshooting the queue limit and potentially letting the same
--    sender slip in twice.
--
--    This function does the whole check-and-insert as ONE atomic operation
--    using `SELECT ... FOR UPDATE` to lock the queue row. Concurrent
--    requests for the SAME leader's queue now safely queue up on that lock
--    instead of racing past the checks — each one fully completes (in
--    milliseconds) before the next one proceeds, so the limit is enforced
--    exactly even with thousands of simultaneous submissions. Different
--    leaders' queues use different rows, so they don't block each other.
CREATE OR REPLACE FUNCTION submit_message(
  p_sender_id UUID,
  p_leader_id UUID,
  p_content TEXT,
  p_message_type TEXT,
  p_media_url TEXT,
  p_media_type TEXT,
  p_user_voice_url TEXT,
  p_is_emergency BOOLEAN,
  p_is_always_open_member BOOLEAN
) RETURNS JSON AS $$
DECLARE
  v_queue RECORD;
  v_existing_id UUID;
  v_new_message_id UUID;
BEGIN
  -- Emergency messages always bypass the queue entirely, no locking needed.
  IF p_is_emergency THEN
    INSERT INTO messages (sender_id, leader_id, queue_id, content, message_type, media_url, media_type, user_voice_url, is_emergency, is_replied)
    VALUES (p_sender_id, p_leader_id, NULL, p_content, p_message_type, p_media_url, p_media_type, p_user_voice_url, TRUE, FALSE)
    RETURNING id INTO v_new_message_id;
    RETURN json_build_object('message_id', v_new_message_id, 'queue_id', NULL, 'error', NULL);
  END IF;

  -- Lock the leader's currently-open queue row, if any. Concurrent calls
  -- for the same leader now execute one at a time from this point on.
  SELECT * INTO v_queue FROM queues
  WHERE leader_id = p_leader_id AND is_open = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    IF p_is_always_open_member THEN
      INSERT INTO messages (sender_id, leader_id, queue_id, content, message_type, media_url, media_type, user_voice_url, is_emergency, is_replied)
      VALUES (p_sender_id, p_leader_id, NULL, p_content, p_message_type, p_media_url, p_media_type, p_user_voice_url, FALSE, FALSE)
      RETURNING id INTO v_new_message_id;
      RETURN json_build_object('message_id', v_new_message_id, 'queue_id', NULL, 'error', NULL);
    ELSE
      RETURN json_build_object('message_id', NULL, 'queue_id', NULL, 'error', 'queue_closed');
    END IF;
  END IF;

  IF v_queue.messages_received >= v_queue.message_limit THEN
    RETURN json_build_object('message_id', NULL, 'queue_id', v_queue.id, 'error', 'queue_limit_reached');
  END IF;

  SELECT id INTO v_existing_id FROM messages WHERE sender_id = p_sender_id AND queue_id = v_queue.id LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    RETURN json_build_object('message_id', NULL, 'queue_id', v_queue.id, 'error', 'already_sent');
  END IF;

  -- The existing `on_message_sent` trigger still fires on this INSERT and
  -- handles incrementing messages_received / auto-closing at the limit —
  -- no changes needed there.
  INSERT INTO messages (sender_id, leader_id, queue_id, content, message_type, media_url, media_type, user_voice_url, is_emergency, is_replied)
  VALUES (p_sender_id, p_leader_id, v_queue.id, p_content, p_message_type, p_media_url, p_media_type, p_user_voice_url, FALSE, FALSE)
  RETURNING id INTO v_new_message_id;

  RETURN json_build_object('message_id', v_new_message_id, 'queue_id', v_queue.id, 'error', NULL);
END;
$$ LANGUAGE plpgsql;

-- 3. Indexes that matter once traffic is heavy. Most of these likely
--    already exist from earlier migrations — IF NOT EXISTS makes this safe
--    to re-run.
CREATE INDEX IF NOT EXISTS idx_messages_sender_queue ON messages(sender_id, queue_id);
CREATE INDEX IF NOT EXISTS idx_messages_leader_id ON messages(leader_id);
CREATE INDEX IF NOT EXISTS idx_messages_queue_id ON messages(queue_id);
CREATE INDEX IF NOT EXISTS idx_queues_leader_open ON queues(leader_id, is_open);
CREATE INDEX IF NOT EXISTS idx_user_groups_user_id ON user_groups(user_id);

-- ============================================================
-- Verify
-- ============================================================
SELECT proname FROM pg_proc WHERE proname = 'submit_message';
SELECT column_name FROM information_schema.columns WHERE table_name = 'queues' AND column_name = 'auto_close_notified';

-- ============================================================
-- 4. BOOTSTRAP YOUR FIRST ADMIN — one-time manual step
-- ============================================================
-- The app has no self-service way to become an admin (by design — it's a
-- security boundary). The very first admin has to be set directly here.
-- After that, this first admin can promote/demote anyone else (to leader
-- OR admin) straight from the in-app Admin > Users screen — no more SQL
-- needed after this one time.
--
-- 1. Have the person open the app once via Telegram so their account
--    exists in `users` (role defaults to 'user' on first login).
-- 2. Find their numeric Telegram user ID (ask them to message
--    @userinfobot on Telegram, or check the `users` table by name/phone).
-- 3. Run:
--
-- UPDATE users SET role = 'admin' WHERE telegram_id = 'PASTE_TELEGRAM_ID_HERE';
--
-- That's it — next time they open the app they'll land in the admin panel.

