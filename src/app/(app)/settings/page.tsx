"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/lib/hooks/use-profile";
import { ThemeSelector } from "@/components/briefing/theme-selector";
import {
  AtSign,
  MessageCircle,
  Globe,
  Clock,
  Hash,
  UserPlus,
  UserMinus,
  Save,
  Check,
  Sparkles,
  Plus,
  Palette,
} from "lucide-react";
import Link from "next/link";

interface AccountSuggestion {
  username: string;
  name: string;
  reason: string;
  score: number;
  source: "timeline" | "curated";
}

const AVAILABLE_TOPICS = [
  "markets",
  "startups",
  "politics",
  "tech",
  "crypto",
  "sports",
  "AI",
  "science",
  "culture",
  "business",
];

const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "pt", label: "Português" },
];

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "analytical", label: "Analytical" },
  { value: "concise", label: "Ultra-concise" },
];

export default function SettingsPage() {
  const { profile, loading, updateProfile } = useProfile();
  const [telegramChatId, setTelegramChatId] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [connectingTelegram, setConnectingTelegram] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newFavorite, setNewFavorite] = useState("");
  const [newIgnored, setNewIgnored] = useState("");
  const [suggestions, setSuggestions] = useState<AccountSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [themeId, setThemeId] = useState("golden");

  const loadSuggestions = useCallback(async () => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch("/api/accounts/suggest");
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch {
      // silently fail — suggestions are optional
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    if (profile) loadSuggestions();
  }, [profile, loadSuggestions]);

  // Load saved theme on mount
  useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("xfeed_theme");
      if (saved) setThemeId(saved);
    }
  });

  function addSuggestedAccount(username: string) {
    if (!profile) return;
    const updated = [...(profile.favorite_accounts || []), username];
    updateProfile({ favorite_accounts: updated });
    setSuggestions((prev) =>
      prev.filter((s) => s.username.toLowerCase() !== username.toLowerCase())
    );
  }

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted">Loading...</div>
      </div>
    );
  }

  async function handleConnectTelegram() {
    setConnectingTelegram(true);
    try {
      const res = await fetch("/api/telegram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: telegramChatId,
          username: telegramUsername,
        }),
      });
      if (res.ok) {
        await updateProfile({
          telegram_chat_id: telegramChatId,
          telegram_username: telegramUsername,
          telegram_connected: true,
        });
      } else {
        const err = await res.json();
        alert(err.error || "Connection failed");
      }
    } finally {
      setConnectingTelegram(false);
    }
  }

  async function handleSave() {
    if (profile) await updateProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function toggleTopic(topic: string) {
    if (!profile) return;
    const current = profile.priority_topics || [];
    const updated = current.includes(topic)
      ? current.filter((t) => t !== topic)
      : [...current, topic];
    updateProfile({ priority_topics: updated });
  }

  function addFavoriteAccount() {
    if (!profile || !newFavorite.trim()) return;
    const clean = newFavorite.replace("@", "").trim();
    const updated = [...(profile.favorite_accounts || []), clean];
    updateProfile({ favorite_accounts: updated });
    setNewFavorite("");
  }

  function removeFavoriteAccount(username: string) {
    if (!profile) return;
    const updated = (profile.favorite_accounts || []).filter(
      (u) => u !== username
    );
    updateProfile({ favorite_accounts: updated });
  }

  function addIgnoredAccount() {
    if (!profile || !newIgnored.trim()) return;
    const clean = newIgnored.replace("@", "").trim();
    const updated = [...(profile.ignored_accounts || []), clean];
    updateProfile({ ignored_accounts: updated });
    setNewIgnored("");
  }

  function removeIgnoredAccount(username: string) {
    if (!profile) return;
    const updated = (profile.ignored_accounts || []).filter(
      (u) => u !== username
    );
    updateProfile({ ignored_accounts: updated });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Button onClick={handleSave} disabled={saved}>
          {saved ? (
            <>
              <Check className="w-4 h-4" /> Saved
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Save
            </>
          )}
        </Button>
      </div>

      {/* Connections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AtSign className="w-5 h-5" /> X / Twitter
          </CardTitle>
        </CardHeader>
        {profile.x_username ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">
                Connected as <strong>@{profile.x_username}</strong>
              </p>
            </div>
            <Badge variant="success">Connected</Badge>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Connect your X account to read your feed.
            </p>
            <Link href="/api/auth/twitter">
              <Button variant="secondary">
                <AtSign className="w-4 h-4" /> Connect X Account
              </Button>
            </Link>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" /> Telegram
          </CardTitle>
        </CardHeader>
        {profile.telegram_connected ? (
          <div className="flex items-center justify-between">
            <p className="text-sm">
              Chat ID: <strong>{profile.telegram_chat_id}</strong>
            </p>
            <Badge variant="success">Connected</Badge>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              1. Search for your XFeed bot on Telegram and start a conversation.
              <br />
              2. Send <code>/start</code> to the bot.
              <br />
              3. Enter your Chat ID below (the bot will tell you your ID).
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Chat ID (e.g. 123456789)"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
              />
              <Input
                placeholder="Username (optional)"
                value={telegramUsername}
                onChange={(e) => setTelegramUsername(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              onClick={handleConnectTelegram}
              loading={connectingTelegram}
              disabled={!telegramChatId}
            >
              Verify & Connect
            </Button>
          </div>
        )}
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" /> Language & Tone
          </CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted">Language</label>
            <select
              value={profile.preferred_language}
              onChange={(e) =>
                updateProfile({ preferred_language: e.target.value })
              }
              className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted">Tone</label>
            <select
              value={profile.summary_tone}
              onChange={(e) => updateProfile({ summary_tone: e.target.value })}
              className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              {TONES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" /> Briefing Theme
          </CardTitle>
        </CardHeader>
        <p className="text-sm text-muted mb-4">
          Choose how your daily briefing looks in the newspaper view.
        </p>
        <ThemeSelector
          currentTheme={themeId}
          onSelect={(id) => {
            setThemeId(id);
            localStorage.setItem("xfeed_theme", id);
          }}
        />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5" /> Priority Topics
          </CardTitle>
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_TOPICS.map((topic) => {
            const active = (profile.priority_topics || []).includes(topic);
            return (
              <button
                key={topic}
                onClick={() => toggleTopic(topic)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? "bg-accent text-white"
                    : "bg-card-hover text-muted hover:text-foreground"
                }`}
              >
                {topic}
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" /> Favorite Accounts
          </CardTitle>
        </CardHeader>
        <p className="text-sm text-muted mb-3">
          These accounts will be prioritized in your briefing. Also used as
          fallback when the full timeline API is not available.
        </p>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="@username"
            value={newFavorite}
            onChange={(e) => setNewFavorite(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addFavoriteAccount()}
          />
          <Button variant="secondary" onClick={addFavoriteAccount}>
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(profile.favorite_accounts || []).map((username) => (
            <Badge key={username} variant="accent">
              @{username}
              <button
                onClick={() => removeFavoriteAccount(username)}
                className="ml-1 text-accent-light hover:text-white cursor-pointer"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>

        {/* Suggested Accounts */}
        {suggestions.length > 0 && (
          <div className="mt-5 pt-5 border-t border-border">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-accent-light" />
              <span className="text-sm font-medium">Suggested accounts</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {suggestions.slice(0, 12).map((s) => (
                <button
                  key={s.username}
                  onClick={() => addSuggestedAccount(s.username)}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-card-hover hover:bg-border/50 transition-colors text-left cursor-pointer group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {s.name}
                    </p>
                    <p className="text-xs text-muted truncate">
                      @{s.username}
                      {s.source === "timeline" ? (
                        <span className="ml-1.5 text-accent-light">
                          {s.reason}
                        </span>
                      ) : (
                        <span className="ml-1.5 opacity-60">{s.reason}</span>
                      )}
                    </p>
                  </div>
                  <Plus className="w-4 h-4 text-muted group-hover:text-accent-light shrink-0 transition-colors" />
                </button>
              ))}
            </div>
            {loadingSuggestions && (
              <p className="text-xs text-muted mt-2 animate-pulse">
                Loading suggestions...
              </p>
            )}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserMinus className="w-5 h-5" /> Ignored Accounts
          </CardTitle>
        </CardHeader>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="@username"
            value={newIgnored}
            onChange={(e) => setNewIgnored(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addIgnoredAccount()}
          />
          <Button variant="secondary" onClick={addIgnoredAccount}>
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(profile.ignored_accounts || []).map((username) => (
            <Badge key={username} variant="error">
              @{username}
              <button
                onClick={() => removeIgnoredAccount(username)}
                className="ml-1 hover:text-white cursor-pointer"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" /> Scheduling
          </CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Posts to analyze"
              type="number"
              min={10}
              max={200}
              value={profile.posts_to_analyze}
              onChange={(e) =>
                updateProfile({
                  posts_to_analyze: parseInt(e.target.value) || 50,
                })
              }
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted">
                Output mode
              </label>
              <select
                value={profile.output_mode}
                onChange={(e) =>
                  updateProfile({ output_mode: e.target.value })
                }
                className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                <option value="text_and_audio">Text + Audio</option>
                <option value="text_only">Text only</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.auto_send_telegram}
                onChange={(e) =>
                  updateProfile({ auto_send_telegram: e.target.checked })
                }
                className="rounded border-border bg-card text-accent focus:ring-accent"
              />
              <span className="text-sm">
                Auto-send briefings to Telegram
              </span>
            </label>
          </div>
          {profile.auto_send_telegram && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Morning briefing"
                type="time"
                value={profile.morning_briefing_time}
                onChange={(e) =>
                  updateProfile({ morning_briefing_time: e.target.value })
                }
              />
              <Input
                label="Evening briefing"
                type="time"
                value={profile.evening_briefing_time}
                onChange={(e) =>
                  updateProfile({ evening_briefing_time: e.target.value })
                }
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
