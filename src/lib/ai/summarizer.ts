import OpenAI from "openai";
import type { TwitterPost } from "@/lib/twitter/client";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export interface BriefingContent {
  quickBrief: string;
  smartSummary: string;
  deepDive: string | null;
  topics: string[];
  topAccounts: string[];
}

export interface AudioScript {
  flashScript: string;
  podcastScript: string;
}

/**
 * Filter and rank posts by relevance before summarizing.
 */
function filterAndRankPosts(posts: TwitterPost[]): TwitterPost[] {
  return posts
    .filter((post) => {
      // Remove very short posts (likely spam or reactions)
      if (post.text.length < 20) return false;
      // Remove pure retweet text
      if (post.text.startsWith("RT @")) return false;
      return true;
    })
    .map((post) => ({
      ...post,
      _score: calculateRelevanceScore(post),
    }))
    .sort((a, b) => (b as any)._score - (a as any)._score);
}

function calculateRelevanceScore(post: TwitterPost): number {
  let score = 0;
  // Engagement signals
  score += Math.log1p(post.likes) * 2;
  score += Math.log1p(post.retweets) * 3;
  score += Math.log1p(post.replies) * 1.5;
  // Content signals
  if (post.hasLinks) score += 5; // Links often = substance
  if (post.text.length > 100) score += 3; // Longer = more content
  // Recency boost
  const hoursAgo =
    (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 6) score += 10;
  else if (hoursAgo < 12) score += 5;
  else if (hoursAgo < 24) score += 2;

  return score;
}

/**
 * Generate all briefing content from posts.
 */
export async function generateBriefing(
  posts: TwitterPost[],
  options: {
    language?: string;
    tone?: string;
    priorityTopics?: string[];
  } = {}
): Promise<BriefingContent> {
  const { language = "es", tone = "professional", priorityTopics = [] } = options;

  const rankedPosts = filterAndRankPosts(posts);
  const topPosts = rankedPosts.slice(0, 40);

  const postsText = topPosts
    .map(
      (p, i) =>
        `[${i + 1}] @${p.authorUsername}: "${p.text}" (♥${p.likes} 🔁${p.retweets} 💬${p.replies})`
    )
    .join("\n\n");

  const topicFilter =
    priorityTopics.length > 0
      ? `\nPriority topics to focus on: ${priorityTopics.join(", ")}`
      : "";

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content: `You are XFeed, an expert content curator that creates intelligent briefings from social media feeds.
You excel at detecting themes, grouping related ideas, filtering noise, and delivering clear summaries.
Language: ${language === "es" ? "Spanish" : "English"}
Tone: ${tone}${topicFilter}

IMPORTANT: Do NOT just compress text. Detect topics, group ideas, prioritize relevance, and sound useful and intelligent.`,
      },
      {
        role: "user",
        content: `Here are the most relevant posts from the user's X feed:

${postsText}

Generate a JSON response with this exact structure:
{
  "quickBrief": "5-10 bullet points with the most important items. Each bullet starts with an emoji. Very concise — readeable in 30-60 seconds.",
  "smartSummary": "A well-structured summary grouped by topic. Each topic has a heading, 2-3 sentences of context, why it matters, and which accounts discussed it. Use clear markdown formatting.",
  "deepDive": "If one topic dominates, write a deeper analysis: what happened, who said what, and implications. Otherwise null.",
  "topics": ["array", "of", "main", "topics", "detected"],
  "topAccounts": ["array", "of", "most", "relevant", "accounts"]
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
  };
}

/**
 * Generate audio scripts optimized for listening.
 */
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
