"use client";

import { getTheme, type BriefingTheme } from "@/lib/themes";

interface BriefingData {
  quick_brief: string;
  smart_summary: string;
  deep_dive: string | null;
  topics: string[];
  top_accounts: string[];
  posts_analyzed: number;
  created_at: string;
}

interface NewspaperProps {
  briefing: BriefingData;
  themeId: string;
}

function Divider({ theme }: { theme: BriefingTheme }) {
  switch (theme.dividerStyle) {
    case "double":
      return (
        <div className="my-6">
          <div
            style={{ borderColor: theme.border }}
            className="border-t border-double border-t-2"
          />
          <div
            style={{ borderColor: theme.border }}
            className="border-t mt-0.5"
          />
        </div>
      );
    case "dots":
      return (
        <div
          className="my-6 text-center tracking-[0.5em] text-sm"
          style={{ color: theme.muted }}
        >
          ···············
        </div>
      );
    case "thick":
      return (
        <div
          className="my-6 h-[3px]"
          style={{ backgroundColor: theme.fg }}
        />
      );
    case "gradient":
      return (
        <div
          className="my-6 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`,
          }}
        />
      );
    case "none":
      return <div className="my-6" />;
    default:
      return (
        <div
          className="my-6 h-px"
          style={{ backgroundColor: theme.border }}
        />
      );
  }
}

function parseMarkdownSection(text: string) {
  const lines = text.split("\n");
  const sections: { heading: string; content: string[] }[] = [];
  let current: { heading: string; content: string[] } | null = null;

  for (const line of lines) {
    if (line.startsWith("## ") || line.startsWith("### ")) {
      if (current) sections.push(current);
      current = { heading: line.replace(/^#{2,3}\s*/, ""), content: [] };
    } else if (line.trim()) {
      if (!current) current = { heading: "", content: [] };
      current.content.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

export function NewspaperView({ briefing, themeId }: NewspaperProps) {
  const theme = getTheme(themeId);
  const date = new Date(briefing.created_at);
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const smartSections = parseMarkdownSection(briefing.smart_summary);

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{
        backgroundColor: theme.bg,
        color: theme.fg,
        fontFamily: theme.bodyFont,
      }}
    >
      <div className="max-w-3xl mx-auto px-6 py-10 md:py-16">
        {/* Masthead */}
        <header className="text-center mb-2">
          <p
            className="text-xs tracking-[0.3em] mb-3"
            style={{
              color: theme.muted,
              fontFamily: theme.monoFont,
              textTransform: "uppercase",
            }}
          >
            {dateStr}
          </p>
          <h1
            className="text-4xl md:text-5xl font-bold tracking-tight"
            style={{
              fontFamily: theme.headingFont,
              textTransform: theme.uppercase ? "uppercase" : "none",
              letterSpacing: theme.uppercase ? "0.05em" : "-0.02em",
            }}
          >
            XFeed Briefing
          </h1>
          <div
            className="flex items-center justify-center gap-4 mt-3 text-xs tracking-wider"
            style={{
              color: theme.muted,
              fontFamily: theme.monoFont,
              textTransform: "uppercase",
            }}
          >
            <span>{briefing.posts_analyzed} posts analyzed</span>
            <span style={{ color: theme.border }}>|</span>
            <span>{briefing.topics.length} topics</span>
            <span style={{ color: theme.border }}>|</span>
            <span>{briefing.top_accounts.length} accounts</span>
          </div>
        </header>

        <Divider theme={theme} />

        {/* Topics bar */}
        <div className="flex flex-wrap justify-center gap-2 mb-2">
          {briefing.topics.map((topic) => (
            <span
              key={topic}
              className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: theme.accent + "18",
                color: theme.accent,
                fontFamily: theme.monoFont,
              }}
            >
              {topic}
            </span>
          ))}
        </div>

        <Divider theme={theme} />

        {/* Quick Brief */}
        <section>
          <h2
            className="text-xl font-bold mb-4"
            style={{
              fontFamily: theme.headingFont,
              textTransform: theme.uppercase ? "uppercase" : "none",
              letterSpacing: theme.uppercase ? "0.05em" : "0",
            }}
          >
            Headlines
          </h2>
          <div
            className="space-y-2.5 text-[15px] leading-relaxed"
            style={{
              fontFamily: theme.serifBody
                ? theme.bodyFont
                : theme.bodyFont,
            }}
          >
            {briefing.quick_brief.split("\n").map((line, i) => {
              const trimmed = line.trim();
              if (!trimmed) return null;
              return (
                <p key={i} style={{ color: theme.fg + "e6" }}>
                  {trimmed}
                </p>
              );
            })}
          </div>
        </section>

        <Divider theme={theme} />

        {/* Smart Summary — sectioned */}
        <section>
          <h2
            className="text-xl font-bold mb-6"
            style={{
              fontFamily: theme.headingFont,
              textTransform: theme.uppercase ? "uppercase" : "none",
              letterSpacing: theme.uppercase ? "0.05em" : "0",
            }}
          >
            In Detail
          </h2>

          <div className="space-y-8">
            {smartSections.map((section, i) => (
              <article key={i}>
                {section.heading && (
                  <h3
                    className="text-lg font-semibold mb-2"
                    style={{
                      fontFamily: theme.headingFont,
                      color: theme.accent,
                    }}
                  >
                    {section.heading}
                  </h3>
                )}
                <div
                  className="space-y-2 text-[15px] leading-relaxed"
                  style={{ color: theme.fg + "d9" }}
                >
                  {section.content.map((line, j) => (
                    <p key={j}>{line}</p>
                  ))}
                </div>
              </article>
            ))}

            {smartSections.length === 0 && (
              <div
                className="text-[15px] leading-relaxed whitespace-pre-wrap"
                style={{ color: theme.fg + "d9" }}
              >
                {briefing.smart_summary}
              </div>
            )}
          </div>
        </section>

        {/* Deep Dive */}
        {briefing.deep_dive && (
          <>
            <Divider theme={theme} />
            <section>
              <h2
                className="text-xl font-bold mb-4"
                style={{
                  fontFamily: theme.headingFont,
                  textTransform: theme.uppercase ? "uppercase" : "none",
                  letterSpacing: theme.uppercase ? "0.05em" : "0",
                }}
              >
                Deep Dive
              </h2>
              <div
                className="text-[15px] leading-relaxed whitespace-pre-wrap"
                style={{ color: theme.fg + "d9" }}
              >
                {briefing.deep_dive}
              </div>
            </section>
          </>
        )}

        <Divider theme={theme} />

        {/* Key Accounts */}
        {briefing.top_accounts.length > 0 && (
          <section className="text-center">
            <h2
              className="text-sm font-medium mb-3 tracking-wider"
              style={{
                color: theme.muted,
                fontFamily: theme.monoFont,
                textTransform: "uppercase",
              }}
            >
              Key Voices
            </h2>
            <div className="flex flex-wrap justify-center gap-2">
              {briefing.top_accounts.map((account) => (
                <a
                  key={account}
                  href={`https://x.com/${account}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:opacity-70 transition-opacity"
                  style={{ color: theme.accent }}
                >
                  @{account}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p
            className="text-xs tracking-wider"
            style={{
              color: theme.muted,
              fontFamily: theme.monoFont,
              textTransform: "uppercase",
            }}
          >
            Generated by XFeed
          </p>
        </div>
      </div>
    </div>
  );
}
