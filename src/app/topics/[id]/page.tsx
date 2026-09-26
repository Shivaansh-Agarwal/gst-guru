import Link from "next/link";
import { notFound } from "next/navigation";
import { topicById } from "@/lib/content";
import { allQuestions, topicStats } from "@/lib/progress";
import { availableModels } from "@/lib/providers";
import GeneratePanel from "@/components/GeneratePanel";

export const dynamic = "force-dynamic";

export default async function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = topicById(id);
  if (!t) notFound();
  const s = topicStats().find((x) => x.topic === id)!;
  const qs = allQuestions().filter((q) => q.topic === id);
  const aiCount = qs.filter((q) => q.source === "ai").length;
  const caseCount = qs.filter((q) => q.type === "scenario" || q.case).length;
  const aiReady = availableModels().length > 0;

  return (
    <>
      <p className="muted small" style={{ marginBottom: 10 }}>
        <Link href="/topics">Topics</Link>
      </p>
      <h1 style={{ marginBottom: 14 }}>{t.name}</h1>
      <p style={{ maxWidth: "60ch" }}>{t.blurb}</p>
      <div className="facts" style={{ margin: "20px 0 26px" }}>
        <span><b className="num">{qs.length}</b> questions{aiCount ? ` (${aiCount} AI-written)` : ""}</span>
        <span><b className="num">{s.seen}</b> seen</span>
        <span><b className="num">{s.attempts ? `${s.mastery}%` : "new"}</b> mastery</span>
      </div>
      <div className="row">
        <Link className="btn" href={`/practice?mode=topic&topic=${t.id}`}>
          Practise 10 questions
        </Link>
        {caseCount > 0 && (
          <Link className="btn ghost" href={`/practice?mode=scenarios&topic=${t.id}`}>
            Situations only ({caseCount})
          </Link>
        )}
        <Link className="btn ghost" href={`/deep-dive?topic=${t.id}`}>
          Start a deep dive
        </Link>
      </div>

      <section className="section">
        <h2>Practise one area</h2>
        <div className="chips">
          {t.subtopics.map((sub) => {
            const n = qs.filter((q) => q.sub === sub).length;
            return n ? (
              <Link key={sub} className="chip" href={`/practice?mode=topic&topic=${t.id}&sub=${encodeURIComponent(sub)}`}>
                {sub} <span className="muted">{n}</span>
              </Link>
            ) : null;
          })}
        </div>
      </section>

      <section className="section">
        <h2>Add questions</h2>
        {aiReady ? (
          <GeneratePanel topic={t.id} />
        ) : (
          <p className="muted">
            Connect a model on the <Link href="/setup">Connect AI page</Link> to write new questions for this topic, including from notes or articles you paste in.
          </p>
        )}
      </section>
    </>
  );
}
