import { redirect } from "next/navigation";

// Deep dive is now GST GPT; keep old links working.
export default async function DeepDive({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const q = new URLSearchParams(await searchParams).toString();
  redirect(`/gpt${q ? `?${q}` : ""}`);
}
