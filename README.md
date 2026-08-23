# 📱 Messenger App — Telegram Mini App

A full-featured organizational messaging platform built as a **Telegram Mini App**. Enables structured communication between members and leaders of an organization — with real-time messaging, voice notes, announcements, and a resource library.

---

## 🌐 Live App

- **Production URL:** `https://message-app-tau-one.vercel.app`
- **Access:** Via Telegram Bot → Menu Button → Open App

---

## 🧭 Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Roles & Permissions](#roles--permissions)
4. [Features](#features)
5. [App Structure](#app-structure)
6. [Database Schema](#database-schema)
7. [Environment Variables](#environment-variables)
8. [Supabase Setup](#supabase-setup)
9. [Deployment](#deployment)
10. [Real-Time Architecture](#real-time-architecture)
11. [Telegram Bot](#telegram-bot)
12. [File Storage](#file-storage)
13. [Known Limitations](#known-limitations)

---

## Overview

This app allows members of an organization to send messages to their leaders through a controlled queue system. Leaders open a queue with a set limit (e.g. 50 messages), users rush to send their message, leaders reply with text or audio, and users receive a Telegram notification when their reply arrives.

### How the flow works

```
User opens app
    ↓
Sees queue status (open/closed) — updates in real-time
    ↓
Queue opens → user types message + records mandatory voice note → sends
    ↓
Leader receives message instantly via Supabase Realtime websocket
    ↓
Leader listens to voice note + reads text → replies (text or audio)
    ↓
User receives Telegram notification → opens app → sees reply instantly
    ↓
User can download reply as PDF or audio file
```

### Emergency Messages
Users can bypass the queue at any time to send emergency messages (Medical, Transport, Urgent). Leader is notified immediately via Telegram bot regardless of queue status.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), React, TypeScript |
| **Styling** | Tailwind CSS, CSS Variables (dark/light theme system) |
| **Animations** | Framer Motion |
| **Backend** | Next.js API Routes (serverless) |
| **Database** | Supabase (PostgreSQL) |
| **Real-time** | Supabase Realtime (websockets) + 3s polling fallback |
| **Auth** | Telegram WebApp `initData` HMAC-SHA256 validation |
| **Storage** | Supabase Storage (audio, images, PDFs, resources) |
| **Bot** | Telegram Bot API (HTML parse mode) |
| **PDF** | jsPDF (client-side real PDF generation) |
| **State** | Zustand (with safe localStorage persistence) |
| **Hosting** | Vercel (free tier) |

---

## Roles & Permissions

### 👤 User
- View queue status (open/closed) — updates instantly
- Send one message per queue (text + mandatory voice note + optional media)
- Send unlimited emergency messages (Medical / Transport / Urgent)
- View current pending message and all past replies
- Download replies as PDF or audio
- Access Resources tab (files uploaded by admin/leader)
- Receive Telegram notifications for queue events and replies
- Clear their own data (messages only OR full reset)

### 👑 Leader
- Open/close their own message queue (limits: 20 / 30 / 40 / 50)
- View all received messages (unreplied/replied tabs)
- Listen to user voice notes directly in reply screen
- Reply to messages with text or audio recording
- Send announcements to all users or specific groups
- Upload resources (audio, PDF, image, video, links)
- View own profile + clear data + settings
- Receive Telegram notifications (queue stats, emergency alerts)

### 🔧 Admin
- Everything a leader can do, plus:
- Manage all users (view, change roles, deactivate)
- Manage groups and Telegram group mappings
- View analytics (total users, messages, reply rate, charts)
- Full resource management

---

## Features

### 🔴 Real-Time Messaging
- Supabase Realtime websockets on `queues`, `messages`, `replies`, `announcements`
- 3-second polling fallback if websocket drops
- Instant fetch when user returns to app (focus/visibility trigger)
- Leader sees new messages the moment user taps Send
- User sees reply immediately when leader sends it — moves from Current to Replies tab instantly

### 🎤 Mandatory Voice Notes
- 1-minute maximum voice recording when sending a message
- In-browser recording using MediaRecorder API
- Red progress bar with auto-stop at 60 seconds
- User can preview and re-record before sending
- Uploaded to Supabase Storage
- Leader sees inline audio player with progress bar in reply screen
- Voice badge shown on leader's message list

### 📁 Resources Tab
- Organized by categories (collapsible folder view)
- Supported file types: Audio (inline player), PDF, Image, Video, External Links
- Global resources (visible to all users) OR group-specific
- All files downloadable via server-side proxy (works in Telegram WebApp)
- Admin and Leaders can upload via their dashboards
- Admin sets category, visibility (global/group), title, description

### 📢 Announcement Broadcast
- Admin/Leader sends one-way broadcast message
- Target: All Users OR specific groups (multi-select checkboxes)
- Groups loaded dynamically from database
- Delivered via Telegram bot message instantly to selected users
- Appears as dismissible banner inside the app
- No character limit on announcement body
- Users can dismiss per-announcement (won't show again)

### 💬 Vachans (Inspirational Quotes)
- 57 curated quotes in Hindi and English
- Random quote on tap
- Purple gradient card design

### 🌙 Theme System
- **Dark mode** (default) — deep navy with gold accent
- **Light mode** — lavender background, orange accent (Figma-designed)
- Instant switch with CSS variables — every component updates
- Persisted in localStorage across sessions

### 🌐 Language Support
- English and Hindi (हिंदी)
- Full translation for all UI text via ThemeContext
- Persisted in localStorage

### 🗑️ Clear Data
- Option 1: Delete messages + files + voice recordings (keep name, city, groups)
- Option 2: Full reset — delete everything, redirect to onboarding
- Deletes all associated files from Supabase Storage buckets
- Confirmation dialog with mode selector before deletion
- Available for both users and leaders

### 🚨 Emergency Messages
- Bypass queue entirely — always available
- Three types: Medical, Transport, Urgent
- Leader receives instant Telegram notification with type + preview
- Appears in leader's message list with emergency badge
- No limit on emergency messages per day

---

## App Structure

```
messenger-app/
├── app/
│   ├── page.tsx                    # Entry — Telegram auth + routing by role
│   ├── layout.tsx                  # ThemeProvider, Telegram SDK, Toaster
│   ├── globals.css                 # CSS variables (dark + light themes)
│   ├── error.tsx                   # Global error boundary
│   │
│   ├── home/                       # User home screen
│   │   ├── page.tsx
│   │   └── HomeClient.tsx          # Queue status, Send btn, Resources, Emergency
│   │
│   ├── dashboard/                  # User message + replies
│   │   ├── page.tsx
│   │   └── DashboardClient.tsx     # Current tab + Msgs & Replies tab + PDF download
│   │
│   ├── send-message/               # Send message flow
│   │   ├── page.tsx
│   │   └── SendMessageClient.tsx   # Text + mandatory voice note + media attach
│   │
│   ├── vachan/page.tsx             # Inspirational quotes
│   ├── profile/page.tsx            # User profile + settings + clear data
│   ├── resources/                  # Resource library
│   ├── announcements/              # Broadcast UI (leader/admin)
│   ├── onboarding/page.tsx         # First-time name/city setup
│   ├── not-authorized/page.tsx     # Not a group member
│   ├── error/page.tsx              # Error page
│   │
│   ├── leader/
│   │   ├── page.tsx / LeaderDashboardClient.tsx   # Queue control + stats
│   │   ├── messages/               # Received messages list
│   │   ├── reply/                  # Reply screen (text + audio)
│   │   └── profile/                # Leader profile + settings + clear data
│   │
│   ├── admin/
│   │   ├── page.tsx / AdminClient.tsx             # Admin panel home
│   │   ├── users/                  # Manage users + roles
│   │   ├── groups/                 # Manage groups
│   │   ├── leaders/                # Manage leaders
│   │   ├── analytics/              # Stats + charts
│   │   └── resources/              # Upload resources
│   │
│   └── api/
│       ├── auth/route.ts           # Telegram initData validation + user creation
│       ├── messages/route.ts       # Send message (voice upload, queue check)
│       ├── dashboard/route.ts      # User dashboard — strict replied/unreplied split
│       ├── queues/route.ts         # Open queue status
│       ├── leaders/route.ts        # Leaders list
│       ├── download/route.ts       # Server-side file download proxy
│       ├── resources/route.ts      # Resources CRUD + storage upload
│       ├── announcements/route.ts  # Broadcast with group_ids[] targeting
│       ├── groups/route.ts         # Groups list (dynamic, from DB)
│       ├── vachan/route.ts         # Random vachan
│       ├── users/clear-data/       # Clear user data + storage cleanup
│       ├── leader/queue/           # Open/close queue + Telegram notifications
│       ├── leader/messages/        # Leader message list with filters
│       ├── leader/reply/           # Send reply + mark is_replied + notify user
│       ├── leader/stats/           # Leader queue statistics
│       └── admin/                  # Admin-only management routes
│
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx            # Page wrapper with bottom nav
│   │   ├── BottomNav.tsx           # Role-based navigation (user/leader/admin)
│   │   └── PageHeader.tsx          # Header with back button + help popup
│   └── ui/
│       ├── AnnouncementBanner.tsx  # Dismissible in-app announcement banner
│       ├── HelpPopup.tsx           # Screen-specific contextual help
│       └── LoadingScreen.tsx       # Full-screen loading state
│
├── hooks/
│   ├── usePolling.ts               # 3s polling + focus/visibility triggers
│   ├── useRealtimeQueue.ts         # Supabase Realtime subscriptions
│   └── useTelegram.ts              # Telegram SDK init with error handling
│
├── contexts/
│   └── ThemeContext.tsx            # Dark/Light theme + EN/HI translations
│
├── lib/
│   ├── supabase.ts                 # Client (Realtime) + Admin (service role)
│   ├── telegram.ts                 # Bot API, HTML formatting, message templates
│   ├── generatePDF.ts              # jsPDF reply PDF generation
│   └── utils.ts                   # formatRelativeTime, getEmergencyColor, etc.
│
├── store/
│   └── userStore.ts                # Zustand — user, queues, hydration tracking
│
├── types/index.ts                  # TypeScript interfaces
├── database-schema.sql             # Full DB schema with all tables
├── MIGRATION_V2.sql                # Latest migration (group_ids, realtime)
├── ENABLE_REALTIME.sql             # Supabase Realtime setup SQL
└── DEPLOYMENT_GUIDE.md             # Step-by-step deployment
```

---

## Database Schema

### Tables

| Table | Purpose |
|---|---|
| `users` | All users — stores role (user/leader/admin), name, city, phone |
| `groups` | Internal organization groups (e.g. "BR Members", "Foreigners") |
| `telegram_group_mappings` | Maps Telegram group chat IDs to internal groups |
| `user_groups` | Many-to-many join: users ↔ groups |
| `leaders` | Leader profiles (display_name, linked to users table) |
| `queues` | One queue per leader per session (open/close, limit, count) |
| `messages` | User messages (text, media_url, user_voice_url, is_emergency) |
| `replies` | Leader replies (text content or audio_url) |
| `notifications` | In-app notification records |
| `resources` | Uploaded files/links (audio, pdf, image, video, link) |
| `announcements` | Broadcast announcements with group_ids[] targeting |
| `announcement_dismissals` | Tracks which users dismissed which announcements |
| `emergency_daily_counts` | Legacy — emergency tracking (limit removed) |
| `vachans` | Inspirational quotes |

### Key Columns

```sql
-- Messages
messages.user_voice_url    TEXT        -- Mandatory voice note URL (Supabase storage)
messages.media_url         TEXT        -- Optional attachment URL
messages.is_emergency      BOOLEAN     -- Emergency bypass flag
messages.message_type      TEXT        -- regular / emergency_medical / emergency_transport / emergency_urgent
messages.is_replied        BOOLEAN     -- Updated immediately when leader replies

-- Queues
queues.message_limit       INTEGER     -- Max messages (20/30/40/50)
queues.messages_received   INTEGER     -- Auto-incremented via DB trigger
queues.is_open             BOOLEAN     -- Realtime watches this

-- Announcements
announcements.group_ids    UUID[]      -- Array of target group UUIDs (null = all)
announcements.target       TEXT        -- 'all' or 'group'

-- Resources
resources.file_type        TEXT        -- audio / pdf / image / video / link
resources.is_global        BOOLEAN     -- TRUE = all users, FALSE = group only
resources.group_id         UUID        -- Target group if not global
resources.category         TEXT        -- Folder name (e.g. 'Spiritual', 'Training')
```

---

## Environment Variables

Set these in **Vercel → Project → Settings → Environment Variables** (select "Production"):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...   (long JWT from Supabase)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...       (different long JWT — server only)
TELEGRAM_BOT_TOKEN=123456789:ABCdef...     (from @BotFather)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

> ⚠️ The `NEXT_PUBLIC_` prefix is required for variables used in browser code. Missing this prefix is the most common cause of the "supabaseKey required" error.

---

## Supabase Setup

### Step 1 — Run the database schema
In **Supabase → SQL Editor**, paste and run `database-schema.sql` in full.

### Step 2 — Run migrations
Then run `MIGRATION_V2.sql` for the latest columns and indexes.

### Step 3 — Enable Realtime
Run each line separately (skip any that say "already member"):
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE queues;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE replies;
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
```

### Step 4 — Create Storage Buckets
In **Supabase → Storage → New Bucket**, create these three (all set to **Public: ON**):

| Bucket name | Contents | Max size |
|---|---|---|
| `message-media` | User message attachments + voice notes | 50 MB |
| `reply-audio` | Leader audio replies | 50 MB |
| `resources` | Admin/leader uploaded resources | 100 MB |

### Step 5 — Row Level Security
RLS is enabled on all tables. The app uses the **service role key** (server-side only) for all DB operations, so no additional RLS policies are needed beyond the defaults.

---

## Deployment

### Prerequisites
- GitHub account (or upload zip directly to Vercel)
- Vercel account — [vercel.com](https://vercel.com) (free tier works)
- Supabase project — [supabase.com](https://supabase.com) (free tier works)
- Telegram Bot created via [@BotFather](https://t.me/BotFather)

### Deploy steps

```bash
# 1. Push code to GitHub
git init && git add . && git commit -m "Initial deploy"
git push origin main

# 2. Import in Vercel
# vercel.com → New Project → Import Git Repository

# 3. Add environment variables in Vercel dashboard

# 4. Deploy (Vercel runs npm run build automatically)
```

### Set up Telegram Bot Menu Button
In [@BotFather](https://t.me/BotFather):
```
/setmenubutton
→ Select your bot
→ Enter URL: https://your-app.vercel.app
→ Button text: Open App
```

### After deploying
1. Run Supabase schema + migrations
2. Enable Realtime on tables
3. Create storage buckets
4. Add your admin user's Telegram ID to the `users` table with `role = 'admin'`
5. Add leader Telegram IDs with `role = 'leader'` and create entries in `leaders` table

---

## Real-Time Architecture

The app uses a **dual-layer** approach ensuring zero missed updates:

```
Layer 1 — Supabase Realtime (websocket)
  ├── Instant — fires the moment a DB row changes
  ├── Subscribed tables: queues, messages, replies, announcements
  └── Requires Realtime enabled in Supabase (see setup above)

Layer 2 — Smart Polling (3 second interval)
  ├── Fallback if websocket connection drops
  ├── Pauses when browser tab is hidden (saves server load)
  └── Fires immediately when user returns to app (focus + visibility events)
```

### What triggers real-time updates

| Event | User sees | Leader sees |
|---|---|---|
| Leader opens queue | Queue banner turns green instantly | — |
| Leader closes queue | Queue banner turns grey instantly | — |
| User sends message | Current message appears in dashboard | New message in unreplied list |
| Leader sends reply | Reply appears, message moves to Replies tab | Message moves to replied list |
| Admin sends announcement | Banner appears at top of home screen | — |

---

## Telegram Bot

### Notification events

**Sent to users:**
| Event | Message |
|---|---|
| Queue opened | 🟢 **Queue Opened!** — Leader name + limit |
| Queue closed | 🔴 **Queue Closed** — Message count + "reply coming soon" |
| Reply received (text) | 🔔 **Reply Received!** — Preview of reply text |
| Reply received (audio) | 🔔 **Reply Received!** — Audio reply notification |

**Sent to leaders:**
| Event | Message |
|---|---|
| Queue auto-closed | ✅ **Queue Auto-Closed** — Total received vs limit |
| Queue manually closed | 📊 **Queue Summary** — Stats for the session |
| Emergency message received | 🚨/🏥/🚗 **EMERGENCY** — Type, sender name, preview |

### Message format
All messages use **HTML parse mode** — renders bold, italic, links correctly in Telegram:
```html
🟢 <b>Queue Opened!</b>

<b>Leader Name ji</b> has opened the queue for <b>50 messages</b>.

Open the app now to send your message! 🙏
```

### Batch sending
Messages are sent in batches of 25 with 1-second delays between batches to avoid Telegram rate limits (30 messages/second).

---

## File Storage

### Upload flow (user voice note)
```
User records audio in browser
    ↓
MediaRecorder API → Blob → File object
    ↓
Appended to FormData as 'voice'
    ↓
POST /api/messages (multipart/form-data)
    ↓
supabaseAdmin.storage.from('message-media').upload()
    ↓
Public URL stored in messages.user_voice_url
```

### Download flow
```
User taps Download button
    ↓
/api/download?url={supabase_url}&filename={name}
    ↓
Server fetches file from Supabase (bypasses CORS)
    ↓
Returns with Content-Disposition: attachment header
    ↓
window.open(proxyUrl, '_blank') — opens in Telegram's browser
    ↓
User saves file from browser
```

> ℹ️ `window.open()` is used instead of `<a download>` because Telegram WebApp's sandbox blocks programmatic anchor clicks.

---

## Known Limitations

| Limitation | Reason | Workaround / Fix |
|---|---|---|
| Downloads open in browser tab | Telegram WebApp sandbox blocks `<a>.click()` | User saves from browser after it opens |
| Voice recording requires HTTPS | Browser MediaRecorder API security requirement | Always use production Vercel URL |
| Max ~4.5MB API body | Vercel serverless function limit | Keep voice notes under 1 min (enforced) |
| Supabase free: 500MB storage | Free plan limit | Upgrade Supabase if storage fills |
| Supabase free: 200 concurrent Realtime connections | Free plan limit | Upgrade for 10,000+ simultaneous users |
| Bot notifications delayed for large user lists | Telegram rate limit: 30 msg/sec | Batch sending with 1s delays (already implemented) |

---

## Development Notes

```bash
# Install dependencies
npm install

# Run locally
npm run dev
# Note: Telegram auth won't work locally without real initData
# The useTelegram hook uses a mock user in development mode

# Build check (same as Vercel runs)
npm run build

# Type check only
npx tsc --noEmit
```

### Adding a new group
1. Add to `groups` table in Supabase
2. Add Telegram group chat ID to `telegram_group_mappings`
3. Assign users to the group in `user_groups`
4. Group automatically appears in Announcement multi-select

### Adding a new leader
1. Add user with `role = 'leader'` in `users` table
2. Create entry in `leaders` table with `display_name` and `user_id`
3. They can now open queues and receive messages

---

## Security

| Measure | Implementation |
|---|---|
| Telegram auth validation | HMAC-SHA256 of initData with bot token secret key |
| Auth token expiry | Tokens older than 24 hours are rejected |
| Server-only secrets | `SUPABASE_SERVICE_ROLE_KEY` and `TELEGRAM_BOT_TOKEN` never sent to browser |
| Download proxy security | Only Supabase storage URLs accepted (domain whitelist) |
| Role checks | Every API route verifies user role from DB before any action |
| RLS | Row Level Security enabled on all Supabase tables |

---

## Changelog Summary

| Version | Key Changes |
|---|---|
| v1 | Initial app — auth, messaging, leader dashboard, admin panel |
| v2 | Realtime updates, light theme, Telegram HTML notifications |
| v3 | Build fixes, TypeScript fixes, UI polish |
| v4 (upgrade) | Voice notes, Resources tab, Announcements, download fix |
| v4-fixed | jsPDF real PDF, clear data, leader profile, reply sync fix, HTML formatting, group multi-select, 20/30/40/50 limits |

---

*Built with ❤️ — Jay Bhagwanji 🙏*
