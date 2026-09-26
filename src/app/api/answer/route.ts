import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { recordReview } from "@/lib/srs";

const Body = z.object({ questionId: z.string(), topic: z.string(), correct: z.boolean(), mode: z.string() });

export async function POST(req: Request) {
  const b = Body.parse(await req.json());
  db().prepare("INSERT INTO attempts(question_id, topic, correct, mode, answered_at) VALUES(?,?,?,?,?)").run(b.questionId, b.topic, b.correct ? 1 : 0, b.mode, Date.now());
  recordReview(b.questionId, b.correct);
  return NextResponse.json({ ok: true });
}
