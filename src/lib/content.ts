import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

export const TopicSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  blurb: z.string(),
  subtopics: z.array(z.string()),
});
export type Topic = z.infer<typeof TopicSchema>;

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
