import { NextResponse } from "next/server";
import { buildDailySet, buildScenarioSet, buildTopicSet } from "@/lib/progress";
import { shuffleOptions } from "@/lib/shuffle";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "daily";
  const size = Math.min(30, Number(url.searchParams.get("size") ?? 10));
  const questions =
    mode === "topic"
      ? buildTopicSet(url.searchParams.get("topic") ?? "", size, url.searchParams.get("sub") ?? undefined)
      : mode === "scenarios"
        ? buildScenarioSet(size, url.searchParams.get("topic") ?? undefined)
        : buildDailySet(size);
  return NextResponse.json({ questions: questions.map((q) => shuffleOptions(q)) });
}
