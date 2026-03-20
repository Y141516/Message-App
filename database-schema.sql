-- ============================================================
-- MESSENGER APP - COMPLETE DATABASE SCHEMA
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- GROUPS TABLE
-- Internal groups (e.g. "BR Members", "Sentinels")
-- ============================================================
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TELEGRAM GROUP MAPPINGS
-- Maps Telegram group names/IDs to internal groups
-- ============================================================
CREATE TABLE telegram_group_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_group_id TEXT NOT NULL,        -- Telegram's chat ID (negative number)
  telegram_group_name TEXT NOT NULL,      -- e.g. "BR MARCH 2026"
  internal_group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(telegram_group_id)
);

-- ============================================================
-- USERS TABLE
-- Primary identifier is telegram_id
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id TEXT NOT NULL UNIQUE,       -- Telegram user ID (string for safety)
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT,                             -- Optional, user can skip
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'leader', 'admin')),
  is_active BOOLEAN DEFAULT TRUE,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================
-- USER GROUPS (Many-to-Many)
-- Which internal groups each user belongs to (verified via bot)
-- ============================================================
CREATE TABLE user_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  verified BOOLEAN DEFAULT TRUE,          -- Verified via bot membership check
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, group_id)
);

CREATE INDEX idx_user_groups_user_id ON user_groups(user_id);
CREATE INDEX idx_user_groups_group_id ON user_groups(group_id);

-- ============================================================
-- LEADERS TABLE
-- Extended info for users with leader role
-- ============================================================
CREATE TABLE leaders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,             -- e.g. "Rajesh ji"
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- QUEUES TABLE
-- Each leader can open/close their queue independently
-- ============================================================
CREATE TABLE queues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  leader_id UUID NOT NULL REFERENCES leaders(id) ON DELETE CASCADE,
  is_open BOOLEAN DEFAULT FALSE,
  message_limit INTEGER NOT NULL DEFAULT 100,
  messages_received INTEGER DEFAULT 0,   -- Auto-incremented on each message
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_queues_leader_id ON queues(leader_id);
CREATE INDEX idx_queues_is_open ON queues(is_open);

-- ============================================================
-- MESSAGES TABLE
-- All messages from users to leaders
-- ============================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  leader_id UUID NOT NULL REFERENCES leaders(id) ON DELETE RESTRICT,
  queue_id UUID REFERENCES queues(id) ON DELETE SET NULL,  -- NULL for emergency
  content TEXT,                           -- Text content (nullable if media only)
  message_type TEXT NOT NULL DEFAULT 'regular' CHECK (message_type IN ('regular', 'emergency_medical', 'emergency_transport', 'emergency_urgent')),
  media_url TEXT,                         -- Supabase storage URL
  media_type TEXT CHECK (media_type IN ('photo', 'video', 'audio', 'document', 'voice')),
  is_emergency BOOLEAN DEFAULT FALSE,
  is_replied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_leader_id ON messages(leader_id);
CREATE INDEX idx_messages_is_replied ON messages(is_replied);
CREATE INDEX idx_messages_is_emergency ON messages(is_emergency);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- ============================================================
-- REPLIES TABLE
-- Leader replies to messages (text or audio)
-- ============================================================
CREATE TABLE replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL UNIQUE REFERENCES messages(id) ON DELETE RESTRICT,
  leader_id UUID NOT NULL REFERENCES leaders(id) ON DELETE RESTRICT,
  content TEXT,                           -- Text reply content
  audio_url TEXT,                         -- Supabase storage URL for audio
  reply_type TEXT NOT NULL CHECK (reply_type IN ('text', 'audio')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_replies_message_id ON replies(message_id);
CREATE INDEX idx_replies_leader_id ON replies(leader_id);
CREATE INDEX idx_replies_created_at ON replies(created_at DESC);

-- ============================================================
-- NOTIFICATIONS TABLE
-- Track sent notifications
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('queue_opened', 'reply_received', 'system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  telegram_message_id TEXT,              -- Telegram message ID after sending
  is_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- ============================================================
-- VACHANS TABLE
-- Spiritual quotes shown in Vachan Generator
-- ============================================================
CREATE TABLE vachans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vachan_text TEXT NOT NULL,             -- The Vachan itself
  explanation_en TEXT NOT NULL,          -- English explanation
  explanation_hi TEXT NOT NULL,          -- Hindi explanation
  category TEXT,                         -- Optional category
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EMERGENCY MESSAGE LIMITS
-- Track daily emergency message count per user
-- ============================================================
CREATE TABLE emergency_daily_counts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER DEFAULT 0,
  UNIQUE(user_id, date)
);

CREATE INDEX idx_emergency_counts_user_date ON emergency_daily_counts(user_id, date);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaders ENABLE ROW LEVEL SECURITY;
ALTER TABLE queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE vachans ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_daily_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_group_mappings ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by API routes)
CREATE POLICY "Service role full access" ON users FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON groups FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON user_groups FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON leaders FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON queues FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON messages FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON replies FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON notifications FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON vachans FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON emergency_daily_counts FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON telegram_group_mappings FOR ALL TO service_role USING (true);

-- ============================================================
-- SEED DATA - PLACEHOLDER GROUP MAPPINGS
-- Update these with your real Telegram group IDs later
-- ============================================================

INSERT INTO groups (name, description) VALUES
  ('BR Members', 'BR batch members'),
  ('Sentinels', 'Sentinel batch members'),
  ('General', 'General members');

-- Placeholder mappings — update telegram_group_id with real IDs from BotFather
INSERT INTO telegram_group_mappings (telegram_group_id, telegram_group_name, internal_group_id)
VALUES
  ('-1001000000001', 'BR MARCH 2026', (SELECT id FROM groups WHERE name = 'BR Members')),
  ('-1001000000002', 'BR APRIL 2026', (SELECT id FROM groups WHERE name = 'BR Members')),
  ('-1001000000003', 'SENTINEL BATCH 1', (SELECT id FROM groups WHERE name = 'Sentinels')),
  ('-1001000000004', 'SENTINEL BATCH 2', (SELECT id FROM groups WHERE name = 'Sentinels'));

-- Sample Vachan (add more when you have data)
INSERT INTO vachans (vachan_text, explanation_en, explanation_hi) VALUES
  ('સત્ય જ ઈશ્વર છે', 'Truth is God. By living truthfully in every moment, we connect with the divine.', 'सत्य ही ईश्वर है। हर पल सत्यता से जीने से हम ईश्वर से जुड़ते हैं।'),
  ('સેવા એ જ પૂજા છે', 'Service is worship. When we serve others, we serve the divine in them.', 'सेवा ही पूजा है। जब हम दूसरों की सेवा करते हैं, तो हम उनमें ईश्वर की सेवा करते हैं।');

-- ============================================================
-- STORAGE BUCKETS (Run separately in Supabase Dashboard)
-- ============================================================
-- 1. Create bucket: "message-media"  (public: false, max size: 50MB)
-- 2. Create bucket: "reply-audio"    (public: false, max size: 20MB)
-- ============================================================

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER queues_updated_at
  BEFORE UPDATE ON queues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-increment queue messages_received when a message is sent
CREATE OR REPLACE FUNCTION increment_queue_messages()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.queue_id IS NOT NULL THEN
    UPDATE queues
    SET messages_received = messages_received + 1
    WHERE id = NEW.queue_id;
    
    -- Auto-close queue if limit reached
    UPDATE queues
    SET is_open = FALSE, closed_at = NOW()
    WHERE id = NEW.queue_id
      AND messages_received >= message_limit;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_message_sent
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION increment_queue_messages();

-- Mark message as replied when reply is inserted
CREATE OR REPLACE FUNCTION mark_message_replied()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE messages SET is_replied = TRUE WHERE id = NEW.message_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_reply_sent
  AFTER INSERT ON replies
  FOR EACH ROW EXECUTE FUNCTION mark_message_replied();

-- ============================================================
-- PHASE 2 ADDITIONS
-- Run these in Supabase SQL Editor if upgrading from Phase 1
-- ============================================================

-- Function to increment emergency count (upsert pattern)
CREATE OR REPLACE FUNCTION increment_emergency_count(p_user_id UUID, p_date DATE)
RETURNS VOID AS $$
BEGIN
  INSERT INTO emergency_daily_counts (user_id, date, count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET count = emergency_daily_counts.count + 1;
END;
$$ LANGUAGE plpgsql;
