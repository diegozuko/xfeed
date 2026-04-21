"use client";

import { THEME_LIST, type BriefingTheme } from "@/lib/themes";

interface ThemeSelectorProps {
  currentTheme: string;
  onSelect: (themeId: string) => void;
}

function ThemePreview({
  theme,
  active,
  onClick,
}: {
  theme: BriefingTheme;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative rounded-xl overflow-hidden transition-all duration-200 cursor-pointer ${
        active
          ? "ring-2 ring-offset-2 ring-offset-background scale-[1.02]"
          : "hover:scale-[1.01]"
      }`}
      style={
        active
          ? ({ "--tw-ring-color": theme.accent } as React.CSSProperties)
          : undefined
      }
    >
      {/* Mini preview */}
      <div
        className="w-full aspect-[4/3] p-3 flex flex-col gap-1.5"
        style={{ backgroundColor: theme.bg }}
      >
        {/* Mini masthead */}
        <div className="text-center">
          <div
            className="text-[8px] tracking-widest mb-0.5"
            style={{
              color: theme.muted,
              fontFamily: theme.monoFont,
              textTransform: "uppercase",
            }}
          >
            APR 21
          </div>
          <div
            className="text-[11px] font-bold"
            style={{
              color: theme.fg,
              fontFamily: theme.headingFont,
              textTransform: theme.uppercase ? "uppercase" : "none",
            }}
          >
            XFeed Briefing
          </div>
        </div>
        {/* Mini divider */}
        <div
          className="h-px mx-2"
          style={{
            backgroundColor:
              theme.dividerStyle === "thick" ? theme.fg : theme.border,
            height: theme.dividerStyle === "thick" ? "2px" : "1px",
          }}
        />
        {/* Mini lines */}
        <div className="space-y-1 px-1">
          <div
            className="h-[3px] rounded-full w-3/4"
            style={{ backgroundColor: theme.fg + "30" }}
          />
          <div
            className="h-[3px] rounded-full w-full"
            style={{ backgroundColor: theme.fg + "20" }}
          />
          <div
            className="h-[3px] rounded-full w-2/3"
            style={{ backgroundColor: theme.fg + "20" }}
          />
          <div
            className="h-[2px] rounded-full w-1/3 mt-1"
            style={{ backgroundColor: theme.accent + "60" }}
          />
        </div>
      </div>
      {/* Label */}
      <div
        className="px-3 py-2 border-t"
        style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.border,
        }}
      >
        <p
          className="text-xs font-medium"
          style={{ color: theme.fg }}
        >
          {theme.name}
        </p>
        <p
          className="text-[10px] mt-0.5"
          style={{ color: theme.muted }}
        >
          {theme.description}
        </p>
      </div>
    </button>
  );
}

export function ThemeSelector({ currentTheme, onSelect }: ThemeSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {THEME_LIST.map((theme) => (
        <ThemePreview
          key={theme.id}
          theme={theme}
          active={currentTheme === theme.id}
          onClick={() => onSelect(theme.id)}
        />
      ))}
    </div>
  );
}
