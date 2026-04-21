-- XFeed Database Schema
-- Run this in Supabase SQL Editor

-- Users profile (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  -- X/Twitter connection
  x_user_id TEXT,
  x_username TEXT,
  x_access_token TEXT,
  x_refresh_token TEXT,
  x_token_expires_at TIMESTAMPTZ,
  -- Telegram connection
  telegram_chat_id TEXT,
  telegram_username TEXT,
  telegram_connected BOOLEAN DEFAULT FALSE,
  -- Preferences
  preferred_language TEXT DEFAULT 'es',
  summary_tone TEXT DEFAULT 'professional',
  posts_to_analyze INTEGER DEFAULT 50,
  output_mode TEXT DEFAULT 'text_and_audio', -- text_only, text_and_audio
  morning_briefing_time TIME DEFAULT '08:00',
  evening_briefing_time TIME DEFAULT '20:00',
  auto_send_telegram BOOLEAN DEFAULT FALSE,
  priority_topics TEXT[] DEFAULT '{}',
  favorite_accounts TEXT[] DEFAULT '{}',
  ignored_accounts TEXT[] DEFAULT '{}',
  briefing_theme TEXT DEFAULT 'golden',
  timezone TEXT DEFAULT 'America/Argentina/Buenos_Aires',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Briefings (generated summaries)
CREATE TABLE public.briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  -- Content
  quick_brief TEXT,
  smart_summary TEXT,
  deep_dive TEXT,
  -- Audio
  audio_script TEXT,
  audio_url TEXT,
  audio_duration_seconds INTEGER,
  audio_format TEXT DEFAULT 'flash', -- flash, podcast
  -- Metadata
  posts_analyzed INTEGER DEFAULT 0,
  topics TEXT[] DEFAULT '{}',
  top_accounts TEXT[] DEFAULT '{}',
  -- Status
  status TEXT DEFAULT 'generating', -- generating, ready, sent, failed
  sent_to_telegram BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cached tweets/posts for analysis
CREATE TABLE public.cached_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tweet_id TEXT NOT NULL,
  author_id TEXT,
  author_username TEXT,
  author_name TEXT,
  text TEXT,
  created_at_twitter TIMESTAMPTZ,
  likes INTEGER DEFAULT 0,
  retweets INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  has_media BOOLEAN DEFAULT FALSE,
  has_links BOOLEAN DEFAULT FALSE,
  urls TEXT[] DEFAULT '{}',
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tweet_id)
);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cached_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own briefings"
  ON public.briefings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own briefings"
  ON public.briefings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own briefings"
  ON public.briefings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own cached posts"
  ON public.cached_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own cached posts"
  ON public.cached_posts FOR ALL
  USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_briefings_user_id ON public.briefings(user_id);
CREATE INDEX idx_briefings_created_at ON public.briefings(created_at DESC);
CREATE INDEX idx_cached_posts_user_id ON public.cached_posts(user_id);
CREATE INDEX idx_cached_posts_fetched_at ON public.cached_posts(fetched_at DESC);
