import { loadContent, topicGroups } from "@/lib/content";
import { allQuestions } from "@/lib/progress";
import { availableModels } from "@/lib/providers";
import DeepDive from "@/components/DeepDive";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { topics } = loadContent();
  const q = sp.q ? allQuestions().find((x) => x.id === sp.q) : undefined;
  const seed = q
    ? `I just answered this question and want to understand it properly:\n\n"${q.q}"\n${q.options ? `Options: ${q.options.join(" | ")}\nCorrect: ${q.options[q.answer ?? 0]}\n` : ""}Explanation given: ${q.exp}\n\nWalk me through the underlying concept and the edge cases around it.`
    : "";
  if (!availableModels().length)
    return (
      <>
        <h1 style={{ marginBottom: 14 }}>Deep dive</h1>
        <p style={{ maxWidth: "58ch" }}>
          Deep dives need a model. <Link href="/setup">Set one up</Link>. Ollama and Gemini's free tier both work without paying anything.
        </p>
      </>
    );
  return (
    <>
      <h1 style={{ marginBottom: 12 }}>Deep dive</h1>
      <p className="muted" style={{ maxWidth: "58ch", marginBottom: 26 }}>
        Pick a topic or describe what you want to understand. It teaches in layers and checks your understanding as it goes.
      </p>
      <DeepDive
        groups={topicGroups(topics).map((g) => ({ label: g.label, topics: g.topics.map((t) => ({ id: t.id, name: t.name })) }))}
        initialTopic={sp.topic}
        seed={seed}
      />
    </>
  );
}
