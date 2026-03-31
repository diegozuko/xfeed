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

/** Hard caps to prevent token overflow */
const MAX_POSTS_TO_RANK = 200;
const MAX_POSTS_FOR_AI = 50;
const MAX_POST_TEXT_LENGTH = 280;

/**
 * Filter and rank posts by relevance before summarizing.
 */
function filterAndRankPosts(posts: TwitterPost[]): TwitterPost[] {
  return posts
    .filter((post) => {
      if (post.text.length < 20) return false;
      if (post.text.startsWith("RT @")) return false;
      return true;
    })
    .slice(0, MAX_POSTS_TO_RANK)
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
  if (post.hasLinks) score += 5;
  if (post.text.length > 100) score += 3;
  // Recency boost
  const hoursAgo =
    (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 6) score += 10;
  else if (hoursAgo < 12) score += 5;
  else if (hoursAgo < 24) score += 2;

  return score;
}

/**
 * Truncate post text to stay within token budget.
 */
function truncateText(text: string): string {
  if (text.length <= MAX_POST_TEXT_LENGTH) return text;
  return text.slice(0, MAX_POST_TEXT_LENGTH) + "...";
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
  const {
    language = "es",
    tone = "professional",
    priorityTopics = [],
  } = options;

  const rankedPosts = filterAndRankPosts(posts);
  const topPosts = rankedPosts.slice(0, MAX_POSTS_FOR_AI);

  const postsText = topPosts
    .map(
      (p, i) =>
        `[${i + 1}] @${p.authorUsername}: "${truncateText(p.text)}" (♥${p.likes} 🔁${p.retweets})`
    )
    .join("\n\n");

  const topicFilter =
    priorityTopics.length > 0
      ? `\nPriority topics the user cares about: ${priorityTopics.join(", ")}`
      : "";

  const langLabel = language === "es" ? "Spanish" : language === "pt" ? "Portuguese" : "English";

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content: `You are XFeed, an expert content curator. Your job is to read a batch of posts from the user's X/Twitter timeline and produce a crisp briefing — like a person who quickly scrolled through X and extracted the key updates.

STYLE RULES:
- BREADTH over depth: cover as many distinct stories/news items as possible (aim for 8–15 items).
- Each item gets 1–2 sentences MAX. Be precise and factual.
- Do NOT write long paragraphs or deep dives on any single topic.
- Sound like a sharp, well-informed friend giving you a rapid-fire update.
- Lead with the most important/surprising facts. No filler.
- If a number, name, date, or valuation is mentioned, include it exactly.
- Group items loosely by theme but keep each one short.
- Skip noise, promotional tweets, and low-substance opinions.

Language: ${langLabel}
Tone: ${tone}${topicFilter}`,
      },
      {
        role: "user",
        content: `Here are the top ${topPosts.length} posts from the user's X timeline:

${postsText}

Generate a JSON response with this exact structure:
{
  "quickBrief": "10-15 bullet points. Each starts with a relevant emoji. Each bullet is ONE concise sentence capturing a distinct story or update. Readable in 60-90 seconds. Cover as many different topics as possible.",
  "smartSummary": "Group the updates into 4-6 theme sections. Each section has a bold heading and 2-4 bullet points underneath (one sentence each). Think: rapid news ticker grouped by category. Use markdown formatting.",
  "deepDive": null,
  "topics": ["array", "of", "5-8", "topic", "tags"],
  "topAccounts": ["array", "of", "most", "relevant", "usernames"]
}

IMPORTANT: deepDive should always be null. Focus on breadth and precision. Do not repeat the same story in quickBrief and smartSummary — they should complement each other.`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(completion.choices[0].message.content || "{}");
  return {
    quickBrief: result.quickBrief || "",
    smartSummary: result.smartSummary || "",
    deepDive: null,
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

  const langLabel = language === "es" ? "Spanish" : language === "pt" ? "Portuguese" : "English";

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.5,
    messages: [
      {
        role: "system",
        content: `You write scripts for audio briefings — like a quick news flash from someone who just scrolled through X/Twitter.

Language: ${langLabel}
Tone: ${tone}, clear, natural, rapid.

Rules:
- Cover ALL the stories mentioned in the briefing — breadth is key.
- Each story gets 1-2 sentences spoken aloud. Move on quickly.
- Natural transitions but fast-paced. No lengthy intros or outros.
- Sound like a sharp, well-informed friend giving you the quick rundown.
- Include specific numbers, names, and facts.
- Short sentences. Easy to follow while driving or walking.
- Start with a brief "Here's what's happening on X right now" greeting.
- End with a 1-sentence wrap-up.
- Do NOT go deep on any single story — the value is the breadth.`,
      },
      {
        role: "user",
        content: `Here's the briefing to convert to audio:

QUICK BRIEF:
${briefing.quickBrief}

SMART SUMMARY:
${briefing.smartSummary}

Generate a JSON response:
{
  "flashScript": "A 2-3 minute script. Rapid-fire, covers ALL the highlights. About 300-450 words. Every story gets mentioned.",
  "podcastScript": "A 4-6 minute script. Slightly more conversational but still covers everything. About 600-900 words. Breadth first."
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
