import { NextResponse } from "next/server";
import { todaySummary } from "@/lib/progress";
import { availableModels } from "@/lib/providers";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ...todaySummary(), aiReady: (await availableModels()).length > 0 });
}
