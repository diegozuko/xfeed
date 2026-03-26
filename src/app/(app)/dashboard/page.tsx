"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/lib/hooks/use-profile";
import { createClient } from "@/lib/supabase/client";
import {
  Zap,
  Send,
  Headphones,
  AtSign,
  MessageCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

interface Briefing {
  id: string;
  quick_brief: string;
  status: string;
  posts_analyzed: number;
  topics: string[];
  audio_url: string | null;
  sent_to_telegram: boolean;
  created_at: string;
}

export default function DashboardPage() {
  const { profile, loading } = useProfile();
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadBriefings();
  }, []);

  async function loadBriefings() {
    const { data } = await supabase
      .from("briefings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setBriefings(data);
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/briefing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          includeAudio: profile?.output_mode !== "text_only",
        }),
      });
      if (res.ok) {
        await loadBriefings();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to generate briefing");
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleSendTelegram(briefingId: string) {
    setSending(briefingId);
    try {
      const res = await fetch("/api/briefing/send-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefingId }),
      });
      if (res.ok) {
        await loadBriefings();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to send");
      }
    } finally {
      setSending(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted">Loading...</div>
      </div>
    );
  }

  const latestBriefing = briefings[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted text-sm mt-1">
          {profile?.full_name
            ? `Welcome back, ${profile.full_name}`
            : "Your feed briefing center"}
        </p>
      </div>

      {/* Connection Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card hover>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AtSign className="w-5 h-5 text-accent-light" />
              <div>
                <p className="text-sm font-medium">X / Twitter</p>
                <p className="text-xs text-muted">
                  {profile?.x_username
                    ? `@${profile.x_username}`
                    : "Not connected"}
                </p>
              </div>
            </div>
            {profile?.x_username ? (
              <Badge variant="success">Connected</Badge>
            ) : (
              <Link href="/api/auth/twitter">
                <Button size="sm" variant="secondary">
                  Connect
                </Button>
              </Link>
            )}
          </div>
        </Card>

        <Card hover>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-accent-light" />
              <div>
                <p className="text-sm font-medium">Telegram</p>
                <p className="text-xs text-muted">
                  {profile?.telegram_connected
                    ? profile.telegram_username || "Connected"
                    : "Not connected"}
                </p>
              </div>
            </div>
            {profile?.telegram_connected ? (
              <Badge variant="success">Connected</Badge>
            ) : (
              <Link href="/settings">
                <Button size="sm" variant="secondary">
                  Setup
                </Button>
              </Link>
            )}
          </div>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleGenerate}
            loading={generating}
            disabled={!profile?.x_username}
          >
            <Zap className="w-4 h-4" />
            Generate Briefing
          </Button>
          {latestBriefing && (
            <>
              <Button
                variant="secondary"
                onClick={() => handleSendTelegram(latestBriefing.id)}
                loading={sending === latestBriefing.id}
                disabled={!profile?.telegram_connected}
              >
                <Send className="w-4 h-4" />
                Send to Telegram
              </Button>
              {latestBriefing.audio_url && (
                <Link href={`/audio?id=${latestBriefing.id}`}>
                  <Button variant="secondary">
                    <Headphones className="w-4 h-4" />
                    Listen
                  </Button>
                </Link>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Latest Briefing Preview */}
      {latestBriefing && latestBriefing.status === "ready" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Latest Briefing</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted">
              <Clock className="w-3.5 h-3.5" />
              {new Date(latestBriefing.created_at).toLocaleString()}
            </div>
          </CardHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted">
              <TrendingUp className="w-4 h-4" />
              {latestBriefing.posts_analyzed} posts analyzed
            </div>
            {latestBriefing.topics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {latestBriefing.topics.map((topic) => (
                  <Badge key={topic} variant="accent">
                    {topic}
                  </Badge>
                ))}
              </div>
            )}
            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-sm text-muted leading-relaxed">
              {latestBriefing.quick_brief}
            </div>
            <Link
              href={`/briefings?id=${latestBriefing.id}`}
              className="inline-block text-sm text-accent-light hover:text-accent transition-colors"
            >
              View full briefing →
            </Link>
          </div>
        </Card>
      )}

      {/* History */}
      {briefings.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {briefings.slice(1).map((b) => (
              <Link
                key={b.id}
                href={`/briefings?id=${b.id}`}
                className="flex items-center justify-between py-2 px-3 -mx-3 rounded-lg hover:bg-card-hover transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-sm">
                    {new Date(b.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex gap-1.5">
                    {b.topics.slice(0, 3).map((t) => (
                      <Badge key={t} variant="default">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {b.audio_url && (
                    <Headphones className="w-4 h-4 text-muted" />
                  )}
                  {b.sent_to_telegram && (
                    <Send className="w-4 h-4 text-muted" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
