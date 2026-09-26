import { NextResponse } from "next/server";
import { z } from "zod";
import { setSetting } from "@/lib/db";
import { availableModels } from "@/lib/providers";
import { TASKS } from "@/lib/ai";

const Body = z.object({ task: z.enum(Object.keys(TASKS) as [keyof typeof TASKS]), model: z.string() });

export async function POST(req: Request) {
  const b = Body.parse(await req.json());
  if (!(await availableModels()).some((m) => m.key === b.model)) return NextResponse.json({ error: "That model isn't enabled." }, { status: 400 });
  setSetting(`model:${b.task}`, b.model);
  return NextResponse.json({ ok: true });
}
