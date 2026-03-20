# 🚀 Deployment Guide — Messenger App

## PHASE 1 SETUP (Auth + Onboarding + Home)

---

## STEP 1 — Create Telegram Bot

1. Open Telegram → search **@BotFather**
2. Send `/newbot`
3. Choose a name: e.g. `Messenger App`
4. Choose a username: e.g. `MessengerOrgBot`
5. Copy the **Bot Token** — you'll need it
6. Send `/setmenubutton` → select your bot → set URL to your app URL
7. Send `/setdomain` → set your Vercel domain

---

## STEP 2 — Setup Supabase

1. Go to **supabase.com** → Create new project (free)
2. Wait for setup to complete
3. Go to **SQL Editor**
4. Copy entire contents of `database-schema.sql`
5. Paste and click **Run**
6. Go to **Project Settings → API**
7. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

### Create Storage Buckets:
1. Go to **Storage** in Supabase
2. Create bucket: `message-media` (make it private)
3. Create bucket: `reply-audio` (make it private)

---

## STEP 3 — Get Telegram Group IDs

For each Telegram group your bot should monitor:

1. Add the bot to the group as admin
2. Send any message in the group
3. Visit: `https://api.telegram.org/bot{YOUR_TOKEN}/getUpdates`
4. Look for `"chat":{"id": -100XXXXXXXXX}` — that's the group ID
5. Update the `telegram_group_mappings` table with real group IDs:

```sql
UPDATE telegram_group_mappings 
SET telegram_group_id = '-1001234567890'  -- real ID
WHERE telegram_group_name = 'BR MARCH 2026';
```

---

## STEP 4 — Add Leaders to Database

After running schema, add your 2 leaders:

```sql
-- Step 1: Create user accounts for leaders
INSERT INTO users (telegram_id, name, city, role, onboarding_complete)
VALUES 
  ('LEADER_1_TELEGRAM_ID', 'Rajesh Ji', 'Ahmedabad', 'leader', true),
  ('LEADER_2_TELEGRAM_ID', 'Suresh Ji', 'Surat', 'leader', true);

-- Step 2: Create leader profiles
INSERT INTO leaders (user_id, display_name)
VALUES
  ((SELECT id FROM users WHERE telegram_id = 'LEADER_1_TELEGRAM_ID'), 'Rajesh ji'),
  ((SELECT id FROM users WHERE telegram_id = 'LEADER_2_TELEGRAM_ID'), 'Suresh ji');
```

Replace `LEADER_1_TELEGRAM_ID` with the actual Telegram ID (number) of each leader.

---

## STEP 5 — Deploy to Vercel

1. Push your code to **GitHub**
2. Go to **vercel.com** → Import project
3. Add Environment Variables (Settings → Environment Variables):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
TELEGRAM_BOT_TOKEN=123456789:ABCxxx...
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

4. Click **Deploy**
5. After deploy, copy your Vercel URL
6. Update `NEXT_PUBLIC_APP_URL` with the real URL
7. Redeploy

---

## STEP 6 — Setup Bot Menu Button

Once deployed:
1. Message @BotFather
2. Send `/setmenubutton`
3. Select your bot
4. Send your app URL: `https://your-app.vercel.app`

---

## STEP 7 — Test the App

1. Open Telegram
2. Find your bot → click **Start**
3. Tap **Open App**
4. Complete onboarding
5. Check Supabase → users table to see new user created

---

## Environment Variables Reference

| Variable | Where to get |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `TELEGRAM_BOT_TOKEN` | @BotFather |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL |

---

## Folder Structure

```
messenger-app/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Entry point (auth check)
│   ├── globals.css
│   ├── home/page.tsx           # Home screen ✅
│   ├── onboarding/page.tsx     # New user setup ✅
│   ├── dashboard/page.tsx      # Messages & Replies (Phase 2)
│   ├── send-message/page.tsx   # Send message (Phase 2)
│   ├── vachan/page.tsx         # Vachan generator ✅
│   ├── profile/page.tsx        # User profile ✅
│   ├── not-authorized/page.tsx ✅
│   ├── error/page.tsx          ✅
│   └── api/
│       ├── auth/route.ts       # Telegram auth ✅
│       ├── users/route.ts      # Create user ✅
│       ├── queues/route.ts     # Queue status ✅
│       ├── leaders/route.ts    # Leaders list ✅
│       └── vachan/route.ts     # Random vachan ✅
├── components/
│   ├── ui/
│   │   ├── Button.tsx ✅
│   │   ├── Card.tsx ✅
│   │   ├── Badge.tsx ✅
│   │   ├── Input.tsx ✅
│   │   └── LoadingScreen.tsx ✅
│   └── layout/
│       ├── AppShell.tsx ✅
│       ├── BottomNav.tsx ✅
│       └── PageHeader.tsx ✅
├── lib/
│   ├── supabase.ts ✅
│   ├── telegram.ts ✅
│   └── utils.ts ✅
├── hooks/
│   └── useTelegram.ts ✅
├── store/
│   └── userStore.ts ✅
├── types/
│   └── index.ts ✅
├── bot/
│   └── index.js ✅
├── database-schema.sql ✅
├── .env.example ✅
└── DEPLOYMENT_GUIDE.md ✅
```

---

## What's Coming in Phase 2

- Send Message screen (with media upload, leader selection)
- Emergency message flow
- User Dashboard (Current Message + Messages & Replies tabs)
- Filters + Download (audio → .mp3, text → .pdf)
- Real-time notifications via bot

