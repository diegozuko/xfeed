# XFeed — Your X Feed Briefing

XFeed reads your X/Twitter timeline, filters the noise, and delivers what matters — as a text brief or a podcast-style audio you can listen to on the go. Briefings are sent to Telegram automatically.

## Features

- **Smart Summaries**: AI-powered briefs that group topics, detect trends, and skip the noise
- **Quick Brief**: 5-10 bullet points, readable in 30-60 seconds
- **Smart Summary**: Topics grouped with context and key accounts
- **Deep Dive**: Extended analysis when one topic dominates
- **Audio Briefings**: Flash (2-4 min) or Podcast (5-8 min) format
- **Telegram Delivery**: Auto or manual send, morning/evening schedule
- **User Preferences**: Language, tone, topics, favorite/ignored accounts

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend + Backend | Next.js 16 (App Router) |
| Database + Auth + Storage | Supabase |
| AI Summaries | OpenAI GPT-4o |
| Text-to-Speech | OpenAI TTS (swappable) |
| X/Twitter | Twitter API v2 (OAuth 2.0 PKCE) |
| Telegram | Bot API |
| Scheduling | Vercel Cron Jobs |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project (free tier works)
- Twitter API credentials (Basic tier for full timeline, Free tier with fallback)
- OpenAI API key
- Telegram Bot (create via @BotFather)

### Setup

1. **Clone and install**

```bash
git clone <repo-url>
cd xfeed
npm install
```

2. **Configure environment**

```bash
cp .env.example .env.local
```

Fill in your credentials in `.env.local`.

3. **Setup Supabase**

- Create a project at [supabase.com](https://supabase.com)
- Run `supabase/schema.sql` in the SQL Editor
- Create a storage bucket named `audio` (public)
- Enable Google OAuth in Auth > Providers (optional)
- Copy your project URL and keys to `.env.local`

4. **Setup SocialData.tools (recommended)** or Twitter API

- Sign up at [socialdata.tools](https://socialdata.tools)
- Get your API key and add to `.env.local` as `SOCIALDATA_API_KEY`
- This is the primary tweet fetcher — no Twitter API tier restrictions, ~$0.001/request
- Alternatively, use Twitter API: go to [developer.twitter.com](https://developer.twitter.com), create OAuth 2.0 project, set callback to `http://localhost:3000/api/auth/twitter/callback`

5. **Setup Telegram Bot**

- Message @BotFather on Telegram, create a bot
- Copy the bot token to `.env.local`
- Users will need to message the bot and get their Chat ID

6. **Run locally**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── (app)/            # Authenticated app pages
│   │   ├── dashboard/    # Main dashboard
│   │   ├���─ briefings/    # Briefing viewer
│   │   ├── audio/        # Audio player
│   │   └── settings/     # User preferences
│   ├─�� api/
│   │   ├── auth/twitter/ # X OAuth flow
│   │   ├── briefing/     # Generate + send endpoints
│   │   ├── telegram/     # Telegram connection
│   │   └─��� cron/         # Scheduled briefings
│   ├��─ auth/callback/    # Supabase auth callback
│   ├���─ login/            # Login page
│   └── page.tsx          # Landing page
├���─ components/
│   ├── layout/           # Sidebar, mobile nav
│   └── ui/               # Button, Card, Badge, Input
└── lib/
    ├── ai/
    │   ├── summarizer.ts  # Content filtering + AI summaries
    ���   └── tts.ts         # Text-to-speech generation
    ├── twitter/
    │   ├── socialdata.ts  # SocialData.tools fetcher (primary)
    │   └── client.ts      # Twitter API client (fallback)
    ├── telegram/
    │   ���── client.ts      # Telegram bot messaging
    ├── supabase/
    │   ├── client.ts      # Browser client
    │   ├── server.ts      # Server client
    │   └── middleware.ts   # Auth middleware
    ├── hooks/
    │   └── use-profile.ts # Profile hook
    ├── themes.ts          # 10 design themes for newspaper view
    └── types.ts           # TypeScript types
```

## Tweet Fetching Strategy

**Primary: SocialData.tools** — No Twitter API tier restrictions. Uses search endpoints to fetch recent tweets from accounts in the user's "Favorite Accounts" list. ~$0.001/request, reliable, and works without Twitter OAuth.

**Fallback: Twitter API v2** — Used when SocialData is unavailable. Requires Basic tier ($100/mo) for home timeline, or fetches from favorite accounts with lower tiers.

The system automatically falls back from SocialData → Twitter API → error if both fail.

## Briefing Themes

10 built-in design themes for the newspaper view:

| Theme | Style |
|-------|-------|
| Midnight | Dark, modern, indigo accents |
| Broadsheet | Classic newspaper, serif, double rules |
| Swiss | Helvetica, red accent, grid-based |
| Bauhaus | Bold geometry, primary colors |
| Terminal | Green-on-black hacker aesthetic |
| Ink | Warm paper, elegant serif |
| Neon | Cyberpunk, electric magenta |
| Golden | Premium dark, gold accents (default) |
| Editorial | Magazine style, bold headers |
| Arctic | Icy blue, ultra-clean |

Themes are switchable from the Briefings page or Settings. Stored in localStorage.

## Audio TTS

The TTS module (`src/lib/ai/tts.ts`) uses OpenAI's TTS API. To switch providers:

1. Replace the `generateAudio` function with your provider's API call
2. Keep the same `Buffer` return type
3. The rest of the pipeline (storage, delivery) works unchanged

## Cron Jobs

Configured in `vercel.json` to run at 8:00 and 20:00 UTC daily. Processes all users with `auto_send_telegram` enabled.

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add all env vars from `.env.example`
4. Deploy

The cron jobs will activate automatically on Vercel.

## Next Steps

- [ ] Add markdown rendering for summaries (react-markdown)
- [ ] Regenerate audio with different voice/tone
- [ ] Choose audio duration preference
- [ ] Tags/favorites on briefings
- [ ] Weekly digest email
- [ ] Multi-language audio voices
