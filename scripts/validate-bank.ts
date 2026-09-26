// Checks every question file against the schema and flags duplicates and thin topics.
// Run: npm run validate
import fs from "node:fs";
import path from "node:path";
import { QuestionSchema, TopicSchema, GlossarySchema, ReadingSchema, InsightSchema, VideosSchema } from "../src/lib/content";
import { z } from "zod";

const dir = path.join(process.cwd(), "content");
const topics = z.array(TopicSchema).parse(JSON.parse(fs.readFileSync(path.join(dir, "topics.json"), "utf8")));
GlossarySchema.parse(JSON.parse(fs.readFileSync(path.join(dir, "glossary.json"), "utf8")));
const reading = ReadingSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, "reading.json"), "utf8")));

let errors = 0;
const ids = new Set<string>();
const texts = new Map<string, string>();
const rows: { topic: string; total: number; cases: number; free: number; volatile: number }[] = [];

for (const t of topics) {
  const file = path.join(dir, "questions", `${t.id}.json`);
  if (!fs.existsSync(file)) {
    console.error(`✗ missing file for topic ${t.id}`);
    errors++;
    continue;
  }
  const arr = JSON.parse(fs.readFileSync(file, "utf8")) as unknown[];
  let cases = 0, free = 0, vol = 0;
  for (const raw of arr) {
    const r = QuestionSchema.safeParse(raw);
    if (!r.success) {
      console.error(`✗ ${(raw as { id?: string }).id}: ${r.error.issues.map((i) => i.message).join("; ")}`);
      errors++;
      continue;
    }
    const q = r.data;
    if (ids.has(q.id)) (console.error(`✗ duplicate id ${q.id}`), errors++);
    ids.add(q.id);
    if (q.topic !== t.id) (console.error(`✗ ${q.id} has topic ${q.topic} but is in ${t.id}.json`), errors++);
    if (!t.subtopics.includes(q.sub)) (console.error(`✗ ${q.id} subtopic "${q.sub}" isn't listed for ${t.id}`), errors++);
    const norm = q.q.toLowerCase().replace(/\W+/g, " ").trim();
    if (texts.has(norm)) console.warn(`! ${q.id} looks like a duplicate of ${texts.get(norm)}`);
    texts.set(norm, q.id);
    if (q.case || q.type === "scenario") cases++;
    if (q.type === "scenario") free++;
    if (q.volatile) vol++;
  }
  rows.push({ topic: t.id, total: arr.length, cases, free, volatile: vol });
}

const insights = InsightSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, "insights.json"), "utf8")));
for (const i of [...insights.facts, ...insights.cases])
  if (!topics.some((t) => t.id === i.topic)) (console.error(`✗ insight "${i.title}" points to unknown topic ${i.topic}`), errors++);
const factTitles = new Set<string>();
for (const f of insights.facts) {
  if (factTitles.has(f.title)) (console.error(`✗ duplicate fact title "${f.title}" (titles track what's been discovered)`), errors++);
  factTitles.add(f.title);
}
for (const t of topics) if (!t.group) (console.error(`✗ topic ${t.id} has no group`), errors++);
const videos = VideosSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, "videos.json"), "utf8")));
for (const id of Object.keys(videos))
  if (!topics.some((t) => t.id === id)) (console.error(`✗ videos.json lists videos for unknown topic ${id}`), errors++);
for (const id of Object.keys(reading.topics))
  if (!topics.some((t) => t.id === id)) (console.error(`✗ reading.json lists links for unknown topic ${id}`), errors++);

console.table(rows);
const total = rows.reduce((s, r) => s + r.total, 0);
const cases = rows.reduce((s, r) => s + r.cases, 0);
console.log(`${total} questions, ${cases} situational (${Math.round((cases / total) * 100)}%), ${errors} errors`);
process.exit(errors ? 1 : 0);
