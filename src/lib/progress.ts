import { db } from "./db";
import { loadContent, type Question } from "./content";

export function allQuestions(): Question[] {
  const bank = loadContent().questions;
  const ai = (db().prepare("SELECT json, model_used FROM ai_questions").all() as { json: string; model_used: string }[]).map(
    (r) => ({ ...JSON.parse(r.json), source: "ai" as const, model_used: r.model_used })
  );
  return [...bank, ...ai];
}

export type TopicStat = { topic: string; total: number; seen: number; attempts: number; accuracy: number | null; mastery: number };

export function topicStats(): TopicStat[] {
  const { topics } = loadContent();
  const qs = allQuestions();
  const seenRows = db().prepare("SELECT DISTINCT question_id FROM attempts").all() as { question_id: string }[];
  const seen = new Set(seenRows.map((r) => r.question_id));
  // Attempts store the topic at answer time, but questions can move between topics,
  // so file each attempt under the question's current topic.
  const topicOf = new Map(qs.map((q) => [q.id, q.topic]));
  const recentBy = new Map<string, { correct: number }[]>();
  const rows = db().prepare("SELECT question_id, topic, correct FROM attempts ORDER BY answered_at DESC").all() as {
    question_id: string;
    topic: string;
    correct: number;
  }[];
  for (const r of rows) {
    const topic = topicOf.get(r.question_id) ?? r.topic;
    const list = recentBy.get(topic) ?? [];
    if (list.length < 30) list.push(r);
    recentBy.set(topic, list);
  }
  return topics.map((t) => {
    const tq = qs.filter((q) => q.topic === t.id);
    const recent = recentBy.get(t.id) ?? [];
    const accuracy = recent.length ? recent.filter((r) => r.correct).length / recent.length : null;
    const seenCount = tq.filter((q) => seen.has(q.id)).length;
    const coverage = tq.length ? seenCount / tq.length : 0;
    // Mastery blends how much of the topic you've seen with how well you've done recently.
    const mastery = accuracy === null ? 0 : Math.round((0.4 * coverage + 0.6 * accuracy) * 100);
    return { topic: t.id, total: tq.length, seen: seenCount, attempts: recent.length, accuracy, mastery };
  });
}

export function streak(now = new Date()): number {
  const rows = db().prepare("SELECT DISTINCT date(answered_at/1000,'unixepoch','localtime') d FROM attempts ORDER BY d DESC").all() as { d: string }[];
  const days = new Set(rows.map((r) => r.d));
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const cur = new Date(now);
  if (!days.has(fmt(cur))) cur.setDate(cur.getDate() - 1); // today not done yet doesn't break the streak
  let n = 0;
  while (days.has(fmt(cur))) {
    n++;
    cur.setDate(cur.getDate() - 1);
  }
  return n;
}

export function answeredToday(): number {
  const r = db()
    .prepare("SELECT COUNT(*) c FROM attempts WHERE date(answered_at/1000,'unixepoch','localtime') = date('now','localtime') AND mode='daily'")
    .get() as { c: number };
  return r.c;
}

function shuffle<T>(a: T[]): T[] {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Daily set: due reviews first, then fresh questions skewed toward weak or untouched topics. */
export function buildDailySet(size = 10): Question[] {
  const qs = allQuestions();
  const byId = new Map(qs.map((q) => [q.id, q]));
  const due = (db().prepare("SELECT question_id FROM reviews WHERE due_at <= ? ORDER BY due_at LIMIT ?").all(Date.now(), Math.ceil(size / 2)) as {
    question_id: string;
  }[])
    .map((r) => byId.get(r.question_id))
    .filter(Boolean) as Question[];

  const reviewed = new Set((db().prepare("SELECT question_id FROM reviews").all() as { question_id: string }[]).map((r) => r.question_id));
  const stats = topicStats();
  const weight = new Map(stats.map((s) => [s.topic, s.accuracy === null ? 3 : 1 + (1 - s.accuracy) * 4]));
  const fresh = qs.filter((q) => !reviewed.has(q.id) && !due.includes(q));

  const picked: Question[] = [...due];
  const pool = shuffle(fresh);
  while (picked.length < size && pool.length) {
    const total = pool.reduce((s, q) => s + (weight.get(q.topic) ?? 1), 0);
    let r = Math.random() * total;
    const idx = pool.findIndex((q) => (r -= weight.get(q.topic) ?? 1) <= 0);
    picked.push(pool.splice(idx < 0 ? 0 : idx, 1)[0]);
  }
  // If you've seen everything, fall back to anything not already picked.
  if (picked.length < size) picked.push(...shuffle(qs.filter((q) => !picked.includes(q))).slice(0, size - picked.length));
  // Keep at least 40% of the set situational, so it isn't all definitions.
  const minCases = Math.ceil(size * 0.4);
  let cases = picked.filter(isCase).length;
  if (cases < minCases) {
    const spare = shuffle(qs.filter((q) => isCase(q) && !picked.includes(q) && !reviewed.has(q.id)));
    for (let k = picked.length - 1; k >= 0 && cases < minCases && spare.length; k--) {
      if (!isCase(picked[k]) && !due.includes(picked[k])) {
        picked[k] = spare.pop()!;
        cases++;
      }
    }
  }
  return shuffle(picked);
}

export const isCase = (q: Question) => q.type === "scenario" || !!q.case;

/** Situational questions only, optionally within one topic. */
export function buildScenarioSet(size = 10, topic?: string): Question[] {
  const qs = allQuestions().filter((q) => isCase(q) && (!topic || q.topic === topic));
  const reviewed = new Set((db().prepare("SELECT question_id FROM reviews").all() as { question_id: string }[]).map((r) => r.question_id));
  return [...shuffle(qs.filter((q) => !reviewed.has(q.id))), ...shuffle(qs.filter((q) => reviewed.has(q.id)))].slice(0, size);
}

export function buildTopicSet(topic: string, size = 10, sub?: string): Question[] {
  const qs = allQuestions().filter((q) => q.topic === topic && (!sub || q.sub === sub));
  const reviewed = new Set((db().prepare("SELECT question_id FROM reviews").all() as { question_id: string }[]).map((r) => r.question_id));
  const unseen = shuffle(qs.filter((q) => !reviewed.has(q.id)));
  const rest = shuffle(qs.filter((q) => reviewed.has(q.id)));
  return [...unseen, ...rest].slice(0, size);
}

export const DAILY_GOAL = 10;

export function dueCount(now = Date.now()): number {
  return (db().prepare("SELECT COUNT(*) c FROM reviews WHERE due_at <= ?").get(now) as { c: number }).c;
}

/** What the sidebar and home page need to say where today stands. */
export function todaySummary() {
  return { done: answeredToday(), goal: DAILY_GOAL, streak: streak(), due: dueCount() };
}

/** Ids of every question answered at least once. */
export function seenQuestionIds(): Set<string> {
  return new Set((db().prepare("SELECT DISTINCT question_id FROM attempts").all() as { question_id: string }[]).map((r) => r.question_id));
}

/** Level names for a topic's mastery, with the threshold for the next one. */
const LEVELS = [
  { at: 0, name: "Newcomer" },
  { at: 1, name: "Explorer" },
  { at: 35, name: "Practitioner" },
  { at: 60, name: "Pro" },
  { at: 85, name: "Master" },
];
export function levelFor(mastery: number, started: boolean) {
  const score = started ? Math.max(mastery, 1) : 0;
  let i = 0;
  while (i + 1 < LEVELS.length && score >= LEVELS[i + 1].at) i++;
  const next = LEVELS[i + 1];
  return { name: LEVELS[i].name, rank: i, next: next ? { name: next.name, at: next.at } : null };
}
