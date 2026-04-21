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

const MAX_POSTS_TO_RANK = 200;
const MAX_POSTS_FOR_AI = 50;
const MAX_POST_TEXT_LENGTH = 280;
const BATCH_SIZE = 20;

function filterAndRankPosts(posts: TwitterPost[]): TwitterPost[] {
  return posts
    .filter((post) => {
      if (post.text.length < 20) return false;
      if (post.text.startsWith("RT @")) return false;
      if (post.type === "retweet") return false;
      return true;
    })
    .slice(0, MAX_POSTS_TO_RANK)
    .sort((a, b) => scorePost(b) - scorePost(a));
}

function scorePost(post: TwitterPost): number {
  let score = 0;
  score += Math.log1p(post.likes) * 2;
  score += Math.log1p(post.retweets) * 3;
  score += Math.log1p(post.replies) * 1.5;
  score += Math.log1p(post.views) * 0.3;
  if (post.hasLinks) score += 5;
  if (post.text.length > 100) score += 3;
  if (post.text.length > 280) score += 2;
  const hoursAgo =
    (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 3) score += 15;
  else if (hoursAgo < 6) score += 10;
  else if (hoursAgo < 12) score += 5;
  else if (hoursAgo < 24) score += 2;
  return score;
}

function truncateText(text: string): string {
  if (text.length <= MAX_POST_TEXT_LENGTH) return text;
  return text.slice(0, MAX_POST_TEXT_LENGTH) + "...";
}

async function extractInsightsFromBatch(
  posts: TwitterPost[],
  batchIndex: number,
  language: string,
  priorityTopics: string[]
): Promise<ExtractedInsight[]> {
  const postsText = posts
    .map(
      (p, i) =>
        `[Post ${batchIndex * BATCH_SIZE + i + 1}] @${p.authorUsername}: "${truncateText(p.text)}" (❤${p.likes} 🔁${p.retweets} 👁${p.views})\nURL: ${p.postUrl}`
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
      (insight: {
        theme: string;
        summary: string;
        confidence: string;
        postIndices: number[];
      }) => ({
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

  const insightsForSynthesis = allInsights
    .filter((i) => i.confidence !== "low")
    .map(
      (i, idx) =>
        `[${idx + 1}] [${i.confidence.toUpperCase()}] ${i.theme}: ${i.summary} (sources: ${i.sourceUrls.join(", ")})`
    )
    .join("\n");

  const topicFilter =
    priorityTopics.length > 0
      ? `\nPriority topics the user cares about: ${priorityTopics.join(", ")}`
      : "";

  const langLabel =
    language === "es"
      ? "Spanish"
      : language === "pt"
        ? "Portuguese"
        : "English";

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content: `You are XFeed, an expert content curator. Your job is to take extracted insights from the user's X/Twitter timeline and produce a crisp briefing — like a person who quickly scrolled through X and extracted the key updates.

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
        content: `Here are ${allInsights.length} extracted insights from ${topPosts.length} posts analyzed:

${insightsForSynthesis}

Generate JSON:
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
    insights: allInsights,
  };
}

export async function generateAudioScript(
  briefing: BriefingContent,
  options: { language?: string; tone?: string } = {}
): Promise<AudioScript> {
  const { language = "es", tone = "professional" } = options;

  const langLabel =
    language === "es"
      ? "Spanish"
      : language === "pt"
        ? "Portuguese"
        : "English";

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
