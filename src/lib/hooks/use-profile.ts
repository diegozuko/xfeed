"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  x_username: string | null;
  x_user_id: string | null;
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
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(data);
      setLoading(false);
    }
    loadProfile();
  }, []);

  async function updateProfile(updates: Partial<Profile>) {
    if (!profile) return;
    const { data } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id)
      .select()
      .single();
    if (data) setProfile(data);
  }

  return { profile, loading, updateProfile };
}
