import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const Body = z.object({ questionId: z.string(), note: z.string().max(1000).optional() });

export async function POST(req: Request) {
  const b = Body.parse(await req.json());
  db().prepare("INSERT INTO flags(question_id, note, created_at) VALUES(?,?,?)").run(b.questionId, b.note ?? null, Date.now());
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ flags: db().prepare("SELECT * FROM flags ORDER BY created_at DESC").all() });
}
