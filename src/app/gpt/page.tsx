import Link from "next/link";
import { loadContent, topicGroups } from "@/lib/content";
import { allQuestions } from "@/lib/progress";
import { availableModels } from "@/lib/providers";
import { modelKeyFor } from "@/lib/ai";
import GstGpt from "@/components/GstGpt";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { topics } = loadContent();
  const models = await availableModels();
  const q = sp.q ? allQuestions().find((x) => x.id === sp.q) : undefined;
  const seed = q
    ? `I just answered this question and want to understand it properly:\n\n"${q.q}"\n${q.options ? `Options: ${q.options.join(" | ")}\nCorrect: ${q.options[q.answer ?? 0]}\n` : ""}Explanation given: ${q.exp}\n\nWalk me through the underlying concept and the edge cases around it.`
    : "";

  return (
    <>
      <h1 style={{ marginBottom: 12 }}>GST GPT</h1>
      <p className="muted" style={{ maxWidth: "60ch", marginBottom: 26 }}>
        Chat with an AI tutor about any GST topic. Pick a topic to ground it in this app's reviewed explanations. It can still be wrong, so check anything important against the law.
      </p>
      {models.length === 0 ? (
        <div className="stat-card" style={{ maxWidth: 560 }}>
          <p>
            <b>No model is available yet.</b> Start Ollama or LM Studio on this machine, or add a key for a hosted provider. Free options work fine.
          </p>
          <p>
            <Link className="btn small" href="/setup">
              How to connect a model
            </Link>
          </p>
        </div>
      ) : (
        <GstGpt
          models={models.map((m) => ({ key: m.key, label: m.note ? `${m.model} (${m.note})` : m.model, group: m.providerName }))}
          initialModel={(await modelKeyFor("chat")) ?? models[0].key}
          groups={topicGroups(topics).map((g) => ({ label: g.label, topics: g.topics.map((t) => ({ id: t.id, name: t.name })) }))}
          initialTopic={sp.topic}
          seed={seed}
        />
      )}
    </>
  );
}
