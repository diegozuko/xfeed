import OpenAI from "openai";
import type { TwitterPost } from "@/lib/twitter/socialdata";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export interface ExtractedInsight {
  theme: string;
  summary: string;
  confidence: "high" | "medium" | "low";
  sourceIndices: number[];
  sourceUrls: string[];
}

export interface BriefingContent {
  quickBrief: string;
  smartSummary: string;
  deepDive: string | null;
  topics: string[];
  topAccounts: string[];
  insights: ExtractedInsight[];
}

export interface AudioScript {
  flashScript: string;
  podcastScript: string;
}

// --- Filtering & Ranking ---

function filterAndRankPosts(posts: TwitterPost[]): TwitterPost[] {
  return posts
    .filter((post) => {
      if (post.text.length < 20) return false;
      if (post.text.startsWith("RT @")) return false;
      if (post.type === "retweet") return false;
      return true;
    })
    .sort((a, b) => scorePost(b) - scorePost(a));
}

function scorePost(post: TwitterPost): number {
  let score = 0;

  // Engagement (log scale prevents viral posts from drowning quality content)
  score += Math.log1p(post.likes) * 2;
  score += Math.log1p(post.retweets) * 3;
  score += Math.log1p(post.replies) * 1.5;
  score += Math.log1p(post.views) * 0.3;

  // Content quality signals
  if (post.hasLinks) score += 5;
  if (post.text.length > 100) score += 3;
  if (post.text.length > 280) score += 2;

  // Recency
  const hoursAgo =
    (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 3) score += 15;
  else if (hoursAgo < 6) score += 10;
  else if (hoursAgo < 12) score += 5;
  else if (hoursAgo < 24) score += 2;

  return score;
}

// --- Batch Insight Extraction (inspired by keeping-tabs) ---

const BATCH_SIZE = 20;

async function extractInsightsFromBatch(
  posts: TwitterPost[],
  batchIndex: number,
  language: string,
  priorityTopics: string[]
): Promise<ExtractedInsight[]> {
  const postsText = posts
    .map(
      (p, i) =>
        `[Post ${batchIndex * BATCH_SIZE + i + 1}] @${p.authorUsername}: "${p.text}" (❤${p.likes} 🔁${p.retweets} 👁${p.views})\nURL: ${p.postUrl}`
    )
    .join("\n\n");

  const topicHint =
    priorityTopics.length > 0
      ? `\nPriority topics to focus on: ${priorityTopics.join(", ")}`
      : "";

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: `You are an expert at extracting newsworthy insights from social media posts.
Your job: analyze each post and determine if it contains something worth reporting.
Language: ${language === "es" ? "Spanish" : "English"}${topicHint}

Rules:
- Extract posts that contain: breaking news, important opinions from key people, data/numbers, trends, product launches, market moves, notable events.
- Group related posts under the same theme when they discuss the same topic.
- Skip: motivational quotes, memes without substance, self-promotion, casual banter, retweets without added context.
- Confidence levels: "high" = clear news/data/announcement, "medium" = interesting opinion or trend, "low" = might be relevant but less certain.

Return JSON: { "insights": [{ "theme": "short topic label", "summary": "1-2 sentence summary of the insight", "confidence": "high|medium|low", "postIndices": [1, 2] }] }.
postIndices refers to the [Post N] numbers. If no posts contain insights, return: { "insights": [] }`,
      },
      {
        role: "user",
        content: postsText,
      },
    ],
    response_format: { type: "json_object" },
  });

  try {
    const result = JSON.parse(completion.choices[0].message.content || "{}");
    return (result.insights || []).map(
      (insight: { theme: string; summary: string; confidence: string; postIndices: number[] }) => ({
        theme: insight.theme,
        summary: insight.summary,
        confidence: insight.confidence as "high" | "medium" | "low",
        sourceIndices: insight.postIndices || [],
        sourceUrls: (insight.postIndices || [])
          .map((idx: number) => {
            const post = posts[idx - 1 - batchIndex * BATCH_SIZE];
            return post?.postUrl || "";
          })
          .filter(Boolean),
      })
    );
  } catch {
    return [];
  }
}

// --- Main Briefing Generation ---

export async function generateBriefing(
  posts: TwitterPost[],
  options: {
    language?: string;
    tone?: string;
    priorityTopics?: string[];
  } = {}
): Promise<BriefingContent> {
  const {
    language = "es",
    tone = "professional",
    priorityTopics = [],
  } = options;

  const rankedPosts = filterAndRankPosts(posts);
  const topPosts = rankedPosts.slice(0, 60);

  // Step 1: Extract insights in batches
  const allInsights: ExtractedInsight[] = [];
  for (let i = 0; i < topPosts.length; i += BATCH_SIZE) {
    const batch = topPosts.slice(i, i + BATCH_SIZE);
    const batchInsights = await extractInsightsFromBatch(
      batch,
      Math.floor(i / BATCH_SIZE),
      language,
      priorityTopics
    );
    allInsights.push(...batchInsights);
  }

  // Step 2: Synthesize insights into briefing
  const insightsForSynthesis = allInsights
    .filter((i) => i.confidence !== "low")
    .map(
      (i, idx) =>
        `[${idx + 1}] [${i.confidence.toUpperCase()}] ${i.theme}: ${i.summary} (sources: ${i.sourceUrls.join(", ")})`
    )
    .join("\n");

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content: `You are XFeed, an expert content curator creating a daily briefing from extracted social media insights.
Language: ${language === "es" ? "Spanish" : "English"}
Tone: ${tone}

Rules:
- The Quick Brief should feel like a morning news flash: punchy, fast, emoji-prefixed bullets.
- The Smart Summary should read like a premium newsletter: grouped by theme, with context and why-it-matters.
- The Deep Dive should only exist if one topic truly dominates and deserves extra analysis.
- Deduplicate overlapping insights. Merge related items.
- Be specific: names, numbers, quotes when available.
- Do NOT just list posts. Create an intelligent editorial overview.`,
      },
      {
        role: "user",
        content: `Here are ${allInsights.length} extracted insights from ${topPosts.length} posts analyzed:

${insightsForSynthesis}

Generate JSON:
{
  "quickBrief": "5-10 emoji-prefixed bullets. The most important items. Readable in 30-60 seconds.",
  "smartSummary": "Well-structured markdown summary grouped by topic. Each topic: heading (##), 2-3 sentences of context, why it matters, key accounts mentioned. Premium newsletter quality.",
  "deepDive": "If one topic dominates, write an extended analysis (what happened, who said what, implications). Otherwise null.",
  "topics": ["main", "topics", "as", "short", "labels"],
  "topAccounts": ["most", "relevant", "usernames"]
}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(completion.choices[0].message.content || "{}");
  return {
    quickBrief: result.quickBrief || "",
    smartSummary: result.smartSummary || "",
    deepDive: result.deepDive || null,
    topics: result.topics || [],
    topAccounts: result.topAccounts || [],
    insights: allInsights,
  };
}

// --- Audio Script Generation ---

export async function generateAudioScript(
  briefing: BriefingContent,
  options: { language?: string; tone?: string } = {}
): Promise<AudioScript> {
  const { language = "es", tone = "professional" } = options;

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.5,
    messages: [
      {
        role: "system",
        content: `You write scripts for audio briefings — like a short podcast episode.
Language: ${language === "es" ? "Spanish" : "English"}
Tone: ${tone}, clear, natural, dynamic.

Rules for audio scripts:
- Short sentences. Easy to follow while driving or exercising.
- Natural transitions between topics (no "bullet 1, bullet 2").
- Avoid lists — use narrative flow instead.
- Sound conversational, NOT robotic.
- Prioritize auditory comprehension.
- Start with a brief greeting and date context.
- End with a quick wrap-up.`,
      },
      {
        role: "user",
        content: `Here's the briefing content to convert to audio scripts:

QUICK BRIEF:
${briefing.quickBrief}

SMART SUMMARY:
${briefing.smartSummary}

${briefing.deepDive ? `DEEP DIVE:\n${briefing.deepDive}` : ""}

Generate a JSON response:
{
  "flashScript": "A 2-4 minute script. Direct, dynamic, covers the highlights. About 300-500 words.",
  "podcastScript": "A 5-8 minute script. More conversational, with smooth transitions. About 700-1100 words."
}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(completion.choices[0].message.content || "{}");
  return {
    flashScript: result.flashScript || "",
    podcastScript: result.podcastScript || "",
  };
}
