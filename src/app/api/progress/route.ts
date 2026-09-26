import { NextResponse } from "next/server";
import { todaySummary } from "@/lib/progress";
import { availableModels } from "@/lib/providers";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ...todaySummary(), aiReady: availableModels().length > 0 });
}
