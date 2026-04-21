export interface BriefingTheme {
  id: string;
  name: string;
  description: string;
  // Colors
  bg: string;
  fg: string;
  accent: string;
  muted: string;
  border: string;
  cardBg: string;
  // Typography
  headingFont: string;
  bodyFont: string;
  monoFont: string;
  // Style traits
  uppercase: boolean;
  serifBody: boolean;
  dividerStyle: "line" | "dots" | "double" | "none" | "thick" | "gradient";
}

export const THEMES: Record<string, BriefingTheme> = {
  midnight: {
    id: "midnight",
    name: "Midnight",
    description: "Dark, modern, minimal",
    bg: "#09090b",
    fg: "#fafafa",
    accent: "#6366f1",
    muted: "#71717a",
    border: "#27272a",
    cardBg: "#18181b",
    headingFont: "'Inter', system-ui, sans-serif",
    bodyFont: "'Inter', system-ui, sans-serif",
    monoFont: "'JetBrains Mono', monospace",
    uppercase: false,
    serifBody: false,
    dividerStyle: "line",
  },
  broadsheet: {
    id: "broadsheet",
    name: "Broadsheet",
    description: "Classic newspaper, serif",
    bg: "#faf8f2",
    fg: "#1a1a1a",
    accent: "#8b0000",
    muted: "#6b6b6b",
    border: "#d4d0c8",
    cardBg: "#ffffff",
    headingFont: "'Playfair Display', Georgia, serif",
    bodyFont: "'Source Serif 4', Georgia, serif",
    monoFont: "'JetBrains Mono', monospace",
    uppercase: true,
    serifBody: true,
    dividerStyle: "double",
  },
  swiss: {
    id: "swiss",
    name: "Swiss",
    description: "Clean, Helvetica, grid",
    bg: "#ffffff",
    fg: "#000000",
    accent: "#ff0000",
    muted: "#666666",
    border: "#000000",
    cardBg: "#f5f5f5",
    headingFont: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    bodyFont: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    monoFont: "'SF Mono', monospace",
    uppercase: true,
    serifBody: false,
    dividerStyle: "thick",
  },
  bauhaus: {
    id: "bauhaus",
    name: "Bauhaus",
    description: "Bold geometry, primary colors",
    bg: "#f5f0e8",
    fg: "#1a1a1a",
    accent: "#e63946",
    muted: "#6d6d6d",
    border: "#1a1a1a",
    cardBg: "#ffffff",
    headingFont: "'DM Sans', sans-serif",
    bodyFont: "'DM Sans', sans-serif",
    monoFont: "'Space Mono', monospace",
    uppercase: true,
    serifBody: false,
    dividerStyle: "thick",
  },
  terminal: {
    id: "terminal",
    name: "Terminal",
    description: "Hacker green-on-black",
    bg: "#0a0a0a",
    fg: "#00ff41",
    accent: "#00ff41",
    muted: "#00aa2a",
    border: "#1a3a1a",
    cardBg: "#0f1a0f",
    headingFont: "'JetBrains Mono', 'Courier New', monospace",
    bodyFont: "'JetBrains Mono', 'Courier New', monospace",
    monoFont: "'JetBrains Mono', monospace",
    uppercase: false,
    serifBody: false,
    dividerStyle: "dots",
  },
  ink: {
    id: "ink",
    name: "Ink",
    description: "Warm paper, elegant serif",
    bg: "#f7f3ee",
    fg: "#2c2c2c",
    accent: "#1a5276",
    muted: "#7f8c8d",
    border: "#d5cec3",
    cardBg: "#fffdf8",
    headingFont: "'Libre Baskerville', Georgia, serif",
    bodyFont: "'Libre Baskerville', Georgia, serif",
    monoFont: "'JetBrains Mono', monospace",
    uppercase: false,
    serifBody: true,
    dividerStyle: "line",
  },
  neon: {
    id: "neon",
    name: "Neon",
    description: "Cyberpunk, electric accents",
    bg: "#0d0d1a",
    fg: "#e0e0ff",
    accent: "#ff00ff",
    muted: "#7777aa",
    border: "#2a2a4a",
    cardBg: "#14142a",
    headingFont: "'Inter', system-ui, sans-serif",
    bodyFont: "'Inter', system-ui, sans-serif",
    monoFont: "'JetBrains Mono', monospace",
    uppercase: false,
    serifBody: false,
    dividerStyle: "gradient",
  },
  golden: {
    id: "golden",
    name: "Golden",
    description: "Premium dark, gold accents",
    bg: "#0c0c0c",
    fg: "#e0e0e0",
    accent: "#d4a843",
    muted: "#737373",
    border: "#262626",
    cardBg: "#141414",
    headingFont: "'Inter', system-ui, sans-serif",
    bodyFont: "'Inter', system-ui, sans-serif",
    monoFont: "'JetBrains Mono', monospace",
    uppercase: false,
    serifBody: false,
    dividerStyle: "line",
  },
  editorial: {
    id: "editorial",
    name: "Editorial",
    description: "Magazine style, bold headers",
    bg: "#ffffff",
    fg: "#1a1a2e",
    accent: "#e94560",
    muted: "#8f8f8f",
    border: "#eaeaea",
    cardBg: "#fafafa",
    headingFont: "'DM Serif Display', Georgia, serif",
    bodyFont: "'Inter', system-ui, sans-serif",
    monoFont: "'JetBrains Mono', monospace",
    uppercase: false,
    serifBody: false,
    dividerStyle: "thick",
  },
  arctic: {
    id: "arctic",
    name: "Arctic",
    description: "Icy blue, ultra-clean",
    bg: "#f0f4f8",
    fg: "#1a2a3a",
    accent: "#2563eb",
    muted: "#64748b",
    border: "#cbd5e1",
    cardBg: "#ffffff",
    headingFont: "'Inter', system-ui, sans-serif",
    bodyFont: "'Inter', system-ui, sans-serif",
    monoFont: "'JetBrains Mono', monospace",
    uppercase: false,
    serifBody: false,
    dividerStyle: "line",
  },
};

export const THEME_LIST = Object.values(THEMES);

export function getTheme(id: string): BriefingTheme {
  return THEMES[id] || THEMES.midnight;
}
