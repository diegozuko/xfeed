"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Play, Pause, SkipBack, SkipForward, Clock } from "lucide-react";

interface Briefing {
  id: string;
  audio_url: string | null;
  audio_script: string | null;
  audio_duration_seconds: number | null;
  audio_format: string;
  topics: string[];
  created_at: string;
}

export default function AudioPage() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [selected, setSelected] = useState<Briefing | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const supabase = createClient();

  useEffect(() => {
    loadBriefings();
  }, []);

  useEffect(() => {
    if (briefings.length > 0) {
      const found = selectedId
        ? briefings.find((b) => b.id === selectedId)
        : briefings[0];
      setSelected(found || briefings[0]);
    }
  }, [selectedId, briefings]);

  async function loadBriefings() {
    const { data } = await supabase
      .from("briefings")
      .select(
        "id, audio_url, audio_script, audio_duration_seconds, audio_format, topics, created_at"
      )
      .not("audio_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setBriefings(data);
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  }

  function skip(seconds: number) {
    if (!audioRef.current) return;
    audioRef.current.currentTime += seconds;
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audio Briefings</h1>

      {!selected?.audio_url ? (
        <Card>
          <div className="text-center py-12 text-muted">
            <p>No audio briefings yet.</p>
            <p className="text-sm mt-2">
              Generate a briefing with audio from the Dashboard.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Player */}
          <Card className="!p-8">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-lg font-semibold">
                  {selected.audio_format === "podcast"
                    ? "Podcast Briefing"
                    : "Flash Briefing"}
                </h2>
                <p className="text-sm text-muted mt-1">
                  {new Date(selected.created_at).toLocaleDateString()}
                </p>
                {selected.topics.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 mt-3">
                    {selected.topics.slice(0, 5).map((t) => (
                      <Badge key={t} variant="accent">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div
                  className="h-1.5 bg-border rounded-full overflow-hidden cursor-pointer"
                  onClick={(e) => {
                    if (!audioRef.current || !duration) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = (e.clientX - rect.left) / rect.width;
                    audioRef.current.currentTime = pct * duration;
                  }}
                >
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{
                      width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={() => skip(-15)}
                  className="text-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  <SkipBack className="w-6 h-6" />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-14 h-14 rounded-full bg-accent hover:bg-accent-dark flex items-center justify-center transition-colors cursor-pointer"
                >
                  {playing ? (
                    <Pause className="w-6 h-6 text-white" />
                  ) : (
                    <Play className="w-6 h-6 text-white ml-1" />
                  )}
                </button>
                <button
                  onClick={() => skip(30)}
                  className="text-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  <SkipForward className="w-6 h-6" />
                </button>
              </div>

              <audio
                ref={audioRef}
                src={selected.audio_url}
                onTimeUpdate={() =>
                  setCurrentTime(audioRef.current?.currentTime || 0)
                }
                onLoadedMetadata={() =>
                  setDuration(audioRef.current?.duration || 0)
                }
                onEnded={() => setPlaying(false)}
              />
            </div>
          </Card>

          {/* Script */}
          {selected.audio_script && (
            <Card>
              <CardHeader>
                <CardTitle>Episode Script</CardTitle>
              </CardHeader>
              <div className="whitespace-pre-wrap text-sm text-muted leading-relaxed max-h-96 overflow-y-auto">
                {selected.audio_script}
              </div>
            </Card>
          )}

          {/* Episode list */}
          {briefings.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>All Episodes</CardTitle>
              </CardHeader>
              <div className="space-y-2">
                {briefings.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setSelected(b);
                      setPlaying(false);
                      setCurrentTime(0);
                    }}
                    className={`w-full text-left flex items-center justify-between py-3 px-3 -mx-3 rounded-lg transition-colors cursor-pointer ${
                      selected.id === b.id
                        ? "bg-accent/10"
                        : "hover:bg-card-hover"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Play className="w-4 h-4 text-muted" />
                      <span className="text-sm">
                        {new Date(b.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-muted capitalize">
                        {b.audio_format}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted">
                      <Clock className="w-3 h-3" />
                      {b.audio_duration_seconds
                        ? formatTime(b.audio_duration_seconds)
                        : "—"}
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
