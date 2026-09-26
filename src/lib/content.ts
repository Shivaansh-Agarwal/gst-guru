import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

export const TopicSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  blurb: z.string(),
  subtopics: z.array(z.string()),
  group: z.string().optional(),
});
export type Topic = z.infer<typeof TopicSchema>;

/** Topics bucketed by their `group`, named groups first, the ungrouped rest last. */
export function topicGroups<T extends { group?: string }>(topics: T[]): { label: string; topics: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const t of topics) {
    const label = t.group ?? "";
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(t);
  }
  const named = [...groups].filter(([label]) => label).map(([label, ts]) => ({ label, topics: ts }));
  const rest = groups.get("");
  return rest ? [...named, { label: "The rest of GST", topics: rest }] : named;
}

export const QuestionSchema = z
  .object({
    id: z.string(),
    topic: z.string(),
    sub: z.string(),
    diff: z.number().int().min(1).max(3),
    type: z.enum(["mcq", "tf", "scenario"]),
    q: z.string().min(8),
    options: z.array(z.string()).optional(),
    answer: z.number().int().optional(),
    model: z.string().optional(),
    points: z.array(z.string()).optional(),
    exp: z.string().min(8),
    ref: z.string().optional(),
    volatile: z.boolean().optional(),
    case: z.boolean().optional(),
  })
  .superRefine((q, ctx) => {
    if (q.type === "scenario") {
      if (!q.model) ctx.addIssue({ code: "custom", message: "scenario needs model answer" });
    } else {
      if (!q.options || q.options.length < 2) ctx.addIssue({ code: "custom", message: "needs options" });
      if (q.answer === undefined || !q.options || q.answer < 0 || q.answer >= q.options.length)
        ctx.addIssue({ code: "custom", message: "answer index out of range" });
    }
  });
export type Question = z.infer<typeof QuestionSchema> & { source?: "bank" | "ai"; model_used?: string };

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(process.cwd(), "content");

let cache: { topics: Topic[]; questions: Question[] } | null = null;

export function loadContent() {
  if (cache) return cache;
  const topics = z.array(TopicSchema).parse(JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, "topics.json"), "utf8")));
  const qdir = path.join(CONTENT_DIR, "questions");
  const questions: Question[] = [];
  for (const file of fs.readdirSync(qdir).filter((f) => f.endsWith(".json")).sort()) {
    const arr = JSON.parse(fs.readFileSync(path.join(qdir, file), "utf8"));
    for (const raw of arr) {
      const parsed = QuestionSchema.safeParse(raw);
      if (parsed.success) questions.push({ ...parsed.data, source: "bank" });
      else console.warn(`[content] skipped ${raw?.id ?? "?"} in ${file}: ${parsed.error.issues[0]?.message}`);
    }
  }
  cache = { topics, questions };
  return cache;
}

export function topicById(id: string) {
  return loadContent().topics.find((t) => t.id === id);
}

export const GlossarySchema = z.array(z.object({ term: z.string(), aliases: z.array(z.string()), def: z.string() }));
export type GlossaryEntry = z.infer<typeof GlossarySchema>[number];

let glossaryCache: GlossaryEntry[] | null = null;
export function loadGlossary(): GlossaryEntry[] {
  if (glossaryCache) return glossaryCache;
  const file = path.join(CONTENT_DIR, "glossary.json");
  glossaryCache = fs.existsSync(file) ? GlossarySchema.parse(JSON.parse(fs.readFileSync(file, "utf8"))) : [];
  return glossaryCache;
}

// Further reading: official manuals first, then a few independent sources. Every link is checked by hand.
export const ReadingLinkSchema = z.object({
  title: z.string(),
  url: z.url(),
  source: z.string(),
  kind: z.enum(["official", "article"]),
  note: z.string().optional(),
});
export type ReadingLink = z.infer<typeof ReadingLinkSchema>;
export const ReadingSchema = z.object({ general: z.array(ReadingLinkSchema), topics: z.record(z.string(), z.array(ReadingLinkSchema)) });

let readingCache: z.infer<typeof ReadingSchema> | null = null;
export function loadReading() {
  if (readingCache) return readingCache;
  const file = path.join(CONTENT_DIR, "reading.json");
  readingCache = fs.existsSync(file) ? ReadingSchema.parse(JSON.parse(fs.readFileSync(file, "utf8"))) : { general: [], topics: {} };
  return readingCache;
}

/** One line under each group heading on the topics page. Keyed by the `group` label in topics.json. */
export const GROUP_BLURBS: Record<string, string> = {
  Foundations: "What GST is, what counts as a supply, where and when it's taxed.",
  "Registration and invoicing": "Getting registered, and the documents every sale or movement of goods needs.",
  "Tax credit and payment": "Claiming credit on purchases, reverse charge and paying the tax.",
  Reconciliation: "Matching books with returns, and returns with each other: the monthly and annual checks every CA runs.",
  Returns: "One section per return, from monthly GSTR-1 and 3B to the annual GSTR-9 and 9C.",
  "Special situations": "Exports, SEZs and refunds, and tax deducted or collected at source.",
  "GST in practice": "How CAs run compliance for clients, notices and appeals, and the tech behind it.",
};

// Dashboard content: a fact and a small case study, rotated daily.
const InsightSchema = z.object({
  facts: z.array(
    z.object({
      title: z.string(),
      hook: z.string().optional(),
      text: z.string(),
      example: z.string(),
      ref: z.string().optional(),
      volatile: z.boolean().optional(),
      topic: z.string(),
    })
  ),
  cases: z.array(
    z.object({
      title: z.string(),
      topic: z.string(),
      situation: z.string(),
      question: z.string(),
      answer: z.string(),
      ref: z.string().optional(),
      volatile: z.boolean().optional(),
    })
  ),
});
export type Insights = z.infer<typeof InsightSchema>;
export { InsightSchema };

let insightsCache: Insights | null = null;
export function loadInsights(): Insights {
  if (insightsCache) return insightsCache;
  const file = path.join(CONTENT_DIR, "insights.json");
  insightsCache = fs.existsSync(file) ? InsightSchema.parse(JSON.parse(fs.readFileSync(file, "utf8"))) : { facts: [], cases: [] };
  return insightsCache;
}

// Curated videos per topic. YouTube entries were checked against YouTube's oEmbed API when added;
// GST software vendors' channels are left out to keep the app neutral.
const VideoSchema = z
  .object({
    youtube: z.string().regex(/^[\w-]{11}$/).optional(),
    url: z.url().optional(),
    title: z.string(),
    channel: z.string(),
    kind: z.enum(["official", "professional", "educator", "course"]),
    lang: z.string().optional(),
  })
  .refine((v) => !!v.youtube !== !!v.url, "a video needs exactly one of youtube or url");
export type Video = z.infer<typeof VideoSchema>;
export const VideosSchema = z.record(z.string(), z.array(VideoSchema));

let videosCache: Record<string, Video[]> | null = null;
export function loadVideos(): Record<string, Video[]> {
  if (videosCache) return videosCache;
  const file = path.join(CONTENT_DIR, "videos.json");
  videosCache = fs.existsSync(file) ? VideosSchema.parse(JSON.parse(fs.readFileSync(file, "utf8"))) : {};
  return videosCache;
}
