"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NewspaperView } from "@/components/briefing/newspaper";
import { ThemeSelector } from "@/components/briefing/theme-selector";
import { createClient } from "@/lib/supabase/client";
import {
  Send,
  Headphones,
  Clock,
  Newspaper,
  LayoutList,
  Palette,
  ChevronDown,
} from "lucide-react";
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

type ViewMode = "newspaper" | "cards";

export default function BriefingsPage() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [selected, setSelected] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("newspaper");
  const [themeId, setThemeId] = useState("golden");
  const [showThemes, setShowThemes] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadBriefings();
    const saved = localStorage.getItem("xfeed_theme");
    if (saved) setThemeId(saved);
  }, []);

  useEffect(() => {
    if (selectedId && briefings.length > 0) {
      setSelected(briefings.find((b) => b.id === selectedId) || briefings[0]);
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

  function handleThemeChange(id: string) {
    setThemeId(id);
    localStorage.setItem("xfeed_theme", id);
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
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Briefings</h1>
          <div className="flex items-center gap-1 text-xs text-muted">
            <Clock className="w-3.5 h-3.5" />
            {new Date(selected.created_at).toLocaleString()}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-card border border-border rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("newspaper")}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                viewMode === "newspaper"
                  ? "bg-accent/10 text-accent-light"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Newspaper className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                viewMode === "cards"
                  ? "bg-accent/10 text-accent-light"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Theme button */}
          {viewMode === "newspaper" && (
            <button
              onClick={() => setShowThemes(!showThemes)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-medium text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <Palette className="w-3.5 h-3.5" />
              Theme
              <ChevronDown
                className={`w-3 h-3 transition-transform ${showThemes ? "rotate-180" : ""}`}
              />
            </button>
          )}

          {selected.audio_url && (
            <Link href={`/audio?id=${selected.id}`}>
              <Button size="sm" variant="secondary">
                <Headphones className="w-3.5 h-3.5" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Date tabs */}
      {briefings.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
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

      {/* Theme selector */}
      {showThemes && viewMode === "newspaper" && (
        <Card className="!p-4">
          <p className="text-xs font-medium text-muted mb-3 uppercase tracking-wider">
            Choose a design
          </p>
          <ThemeSelector
            currentTheme={themeId}
            onSelect={handleThemeChange}
          />
        </Card>
      )}

      {/* Meta badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="accent">{selected.posts_analyzed} posts</Badge>
        {selected.topics.map((topic) => (
          <Badge key={topic}>{topic}</Badge>
        ))}
        {selected.sent_to_telegram && (
          <Badge variant="success">
            <Send className="w-3 h-3 mr-1" />
            Sent
          </Badge>
        )}
      </div>

      {/* Content */}
      {viewMode === "newspaper" ? (
        <div className="rounded-xl overflow-hidden border border-border">
          <NewspaperView briefing={selected} themeId={themeId} />
        </div>
      ) : (
        <CardsView briefing={selected} />
      )}
    </div>
  );
}

function CardsView({ briefing }: { briefing: Briefing }) {
  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">Quick Brief</h3>
        </div>
        <div className="whitespace-pre-wrap text-sm text-muted leading-relaxed">
          {briefing.quick_brief}
        </div>
      </Card>

      <Card>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Smart Summary
          </h3>
        </div>
        <div className="whitespace-pre-wrap text-sm text-muted leading-relaxed">
          {briefing.smart_summary}
        </div>
      </Card>

      {briefing.deep_dive && (
        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Deep Dive</h3>
          </div>
          <div className="whitespace-pre-wrap text-sm text-muted leading-relaxed">
            {briefing.deep_dive}
          </div>
        </Card>
      )}

      {briefing.top_accounts.length > 0 && (
        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Key Accounts
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {briefing.top_accounts.map((account) => (
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
