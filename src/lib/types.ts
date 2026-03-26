export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  x_user_id: string | null;
  x_username: string | null;
  x_access_token: string | null;
  x_refresh_token: string | null;
  x_token_expires_at: string | null;
  telegram_chat_id: string | null;
  telegram_username: string | null;
  telegram_connected: boolean;
  preferred_language: string;
  summary_tone: string;
  posts_to_analyze: number;
  output_mode: string;
  morning_briefing_time: string;
  evening_briefing_time: string;
  auto_send_telegram: boolean;
  priority_topics: string[];
  favorite_accounts: string[];
  ignored_accounts: string[];
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Briefing {
  id: string;
  user_id: string;
  quick_brief: string;
  smart_summary: string;
  deep_dive: string | null;
  audio_script: string | null;
  audio_url: string | null;
  audio_duration_seconds: number | null;
  audio_format: string;
  posts_analyzed: number;
  topics: string[];
  top_accounts: string[];
  status: "generating" | "ready" | "sent" | "failed";
  sent_to_telegram: boolean;
  sent_at: string | null;
  created_at: string;
}

export interface CachedPost {
  id: string;
  user_id: string;
  tweet_id: string;
  author_id: string;
  author_username: string;
  author_name: string;
  text: string;
  created_at_twitter: string;
  likes: number;
  retweets: number;
  replies: number;
  has_media: boolean;
  has_links: boolean;
  urls: string[];
  fetched_at: string;
}
