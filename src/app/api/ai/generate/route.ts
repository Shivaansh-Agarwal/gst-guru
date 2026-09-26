import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { generateJSON, NoModelError } from "@/lib/ai";
import { loadContent, topicById, QuestionSchema } from "@/lib/content";
import { factSheet, TUTOR_BASE } from "@/lib/prompts";

const Body = z.object({ topic: z.string(), count: z.number().int().min(1).max(10).default(5), notes: z.string().max(12000).optional() });

const Gen = z.array(
  z.object({
    sub: z.string(),
    diff: z.number().int().min(1).max(3),
    type: z.enum(["mcq", "tf"]),
    q: z.string(),
    options: z.array(z.string()).min(2).max(5),
    answer: z.number().int(),
    exp: z.string(),
    ref: z.string().optional(),
    volatile: z.boolean().optional(),
  })
);

export async function POST(req: Request) {
  const b = Body.parse(await req.json());
  const topic = topicById(b.topic);
  if (!topic) return NextResponse.json({ error: "Unknown topic" }, { status: 400 });
  const bank = loadContent().questions;
  const existing = bank.filter((q) => q.topic === topic.id).map((q) => `- ${q.q}`).slice(0, 60).join("\n");

  const prompt = `${factSheet(topic, bank)}

${b.notes ? `The learner pasted these notes. Base the questions on them where they are accurate:\n"""${b.notes}"""\n` : ""}
Write ${b.count} NEW quiz questions on this topic. Make them tricky in the way an examiner would: edge cases, common confusions, "which of these is NOT", realistic scenarios. Do not repeat these existing questions:
${existing}

Reply with ONLY a JSON array. Each item:
{"sub": one of ${JSON.stringify(topic.subtopics)}, "diff": 1|2|3, "type": "mcq" or "tf", "q": "...", "options": ["..."], "answer": index of correct option (0-based), "exp": "why the answer is right, 1-3 sentences", "ref": "section/rule if known", "volatile": true if it depends on rates, thresholds or dates that change}
For "tf" use options ["True","False"].`;

  try {
    const { data, modelKey } = await generateJSON({ task: "generate", instructions: TUTOR_BASE, prompt, schema: Gen });
    const now = Date.now();
    const saved = [];
    const insert = db().prepare("INSERT INTO ai_questions(id, topic, json, model_used, created_at) VALUES(?,?,?,?,?)");
    for (const [i, g] of data.entries()) {
      const q = { ...g, id: `AI-${topic.code}-${now.toString(36)}-${i}`, topic: topic.id };
      const valid = QuestionSchema.safeParse(q);
      if (!valid.success) continue;
      insert.run(q.id, topic.id, JSON.stringify(valid.data), modelKey, now);
      saved.push({ ...valid.data, source: "ai", model_used: modelKey });
    }
    return NextResponse.json({ questions: saved, model: modelKey });
  } catch (e) {
    const status = e instanceof NoModelError ? 412 : 502;
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status });
  }
}
