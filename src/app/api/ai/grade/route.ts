import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJSON, NoModelError } from "@/lib/ai";
import { TUTOR_BASE } from "@/lib/prompts";

const Body = z.object({ question: z.string(), modelAnswer: z.string(), points: z.array(z.string()).optional(), answer: z.string().min(1).max(4000) });
const Grade = z.object({
  verdict: z.enum(["correct", "partial", "incorrect"]),
  score: z.number().min(0).max(100),
  feedback: z.string(),
  missed: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  const b = Body.parse(await req.json());
  const prompt = `Grade the learner's answer to a GST scenario question.

Question: ${b.question}
Reference answer: ${b.modelAnswer}
${b.points?.length ? `Key points a full answer covers:\n${b.points.map((p) => `- ${p}`).join("\n")}` : ""}

Learner's answer: """${b.answer}"""

Judge the reasoning, not the wording. "correct" means the conclusion and main reasoning are right, "partial" means the direction is right but something important is missing or wrong.
Reply with ONLY JSON: {"verdict":"correct"|"partial"|"incorrect","score":0-100,"feedback":"2-4 sentences, direct and specific","missed":["key points they missed"]}`;
  try {
    const { data, modelKey } = await generateJSON({ task: "grade", instructions: TUTOR_BASE, prompt, schema: Grade });
    return NextResponse.json({ ...data, model: modelKey });
  } catch (e) {
    const status = e instanceof NoModelError ? 412 : 502;
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status });
  }
}
