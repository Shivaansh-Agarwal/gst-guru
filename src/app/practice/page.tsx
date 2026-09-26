import QuizRunner from "@/components/QuizRunner";
import { availableModels } from "@/lib/providers";
import { loadGlossary, topicById } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function Practice({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const mode = sp.mode === "topic" ? "topic" : sp.mode === "scenarios" ? "scenarios" : "daily";
  const topic = sp.topic ? topicById(sp.topic) : undefined;
  return (
    <>
      <h1 style={{ marginBottom: 24, fontSize: "2rem" }}>{mode === "daily" ? "Today's set" : mode === "scenarios" ? (topic ? `${topic.name}: situations` : "Situations") : topic?.name ?? "Practice"}</h1>
      <QuizRunner mode={mode} topic={topic?.id} sub={sp.sub} aiReady={(await availableModels()).length > 0} glossary={loadGlossary()} />
    </>
  );
}
