"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Send, Headphones, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Briefing {
  id: string;
  quick_brief: string;
  smart_summary: string;
  deep_dive: string | null;
  audio_url: string | null;
  audio_duration_seconds: number | null;
  posts_analyzed: number;
  topics: string[];
  top_accounts: string[];
  status: string;
  sent_to_telegram: boolean;
  created_at: string;
}

export default function BriefingsPage() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [selected, setSelected] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadBriefings();
  }, []);

  useEffect(() => {
    if (selectedId && briefings.length > 0) {
      const found = briefings.find((b) => b.id === selectedId);
      setSelected(found || briefings[0]);
    } else if (briefings.length > 0) {
      setSelected(briefings[0]);
    }
  }, [selectedId, briefings]);

  async function loadBriefings() {
    const { data } = await supabase
      .from("briefings")
      .select("*")
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setBriefings(data);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted">Loading...</div>
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Briefings</h1>
        <Card>
          <div className="text-center py-12 text-muted">
            <p>No briefings yet.</p>
            <Link href="/dashboard">
              <Button className="mt-4">Go to Dashboard</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Briefings</h1>
        <div className="flex items-center gap-2 text-sm text-muted">
          <Clock className="w-4 h-4" />
          {new Date(selected.created_at).toLocaleString()}
        </div>
      </div>

      {/* Briefing tabs/list */}
      {briefings.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {briefings.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelected(b)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
                selected.id === b.id
                  ? "bg-accent/10 text-accent-light"
                  : "text-muted hover:text-foreground hover:bg-card-hover"
              }`}
            >
              {new Date(b.created_at).toLocaleDateString()}
            </button>
          ))}
        </div>
      )}

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="accent">{selected.posts_analyzed} posts</Badge>
        {selected.topics.map((topic) => (
          <Badge key={topic}>{topic}</Badge>
        ))}
        {selected.audio_url && (
          <Link href={`/audio?id=${selected.id}`}>
            <Badge variant="success">
              <Headphones className="w-3 h-3 mr-1" />
              Audio available
            </Badge>
          </Link>
        )}
        {selected.sent_to_telegram && (
          <Badge variant="success">
            <Send className="w-3 h-3 mr-1" />
            Sent
          </Badge>
        )}
      </div>

      {/* Quick Brief */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Brief</CardTitle>
        </CardHeader>
        <div className="whitespace-pre-wrap text-sm text-muted leading-relaxed">
          {selected.quick_brief}
        </div>
      </Card>

      {/* Smart Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Smart Summary</CardTitle>
        </CardHeader>
        <div className="prose prose-invert prose-sm max-w-none text-muted leading-relaxed">
          <div
            dangerouslySetInnerHTML={{
              __html: selected.smart_summary.replace(/\n/g, "<br/>"),
            }}
          />
        </div>
      </Card>

      {/* Deep Dive */}
      {selected.deep_dive && (
        <Card>
          <CardHeader>
            <CardTitle>Deep Dive</CardTitle>
          </CardHeader>
          <div className="prose prose-invert prose-sm max-w-none text-muted leading-relaxed">
            <div
              dangerouslySetInnerHTML={{
                __html: selected.deep_dive.replace(/\n/g, "<br/>"),
              }}
            />
          </div>
        </Card>
      )}

      {/* Top accounts */}
      {selected.top_accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Accounts</CardTitle>
          </CardHeader>
          <div className="flex flex-wrap gap-2">
            {selected.top_accounts.map((account) => (
              <Badge key={account} variant="default">
                @{account}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
