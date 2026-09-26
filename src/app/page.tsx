import Link from "next/link";
import { loadContent, loadInsights, topicById } from "@/lib/content";
import { todaySummary, topicStats } from "@/lib/progress";
import { greeting } from "@/lib/format";
import FactCard from "@/components/FactCard";

export const dynamic = "force-dynamic";

// The fact and case study change once a day; "Another" steps through the rest.
function pick<T>(list: T[], step: string | undefined): { item: T | undefined; next: number } {
  const day = Math.floor(Date.now() / 86_400_000);
  const n = Number(step) || 0;
  return { item: list.length ? list[(day + n) % list.length] : undefined, next: n + 1 };
}

function Meter({ value, total }: { value: number; total: number }) {
  return (
    <div className="bar" aria-hidden>
      <i style={{ width: `${total ? Math.round((value / total) * 100) : 0}%` }} />
    </div>
  );
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { topics } = loadContent();
  const stats = topicStats();
  const { done, goal } = todaySummary();
  const covered = stats.filter((x) => x.attempts > 0).length;
  const answered = stats.reduce((a, b) => a + b.seen, 0);
  const total = stats.reduce((a, b) => a + b.total, 0);
  const insights = loadInsights();
  const kase = pick(insights.cases, sp.case);
  const caseTopic = kase.item && topicById(kase.item.topic);
  const finished = done >= goal;

  return (
    <>
      <p className="muted">
        {greeting()}
        {process.env.LEARNER_NAME ? `, ${process.env.LEARNER_NAME}` : ""}.
      </p>
      <h1 style={{ margin: "4px 0 26px" }}>Dashboard</h1>

      <section className="dash-stats" aria-label="Your progress">
        <div className="stat-card">
          <p className="stat-label">Topics covered</p>
          <p className="stat-value num">
            {covered}
            <small> / {topics.length}</small>
          </p>
          <Meter value={covered} total={topics.length} />
          <p className="muted small">A topic counts once you've answered a question in it.</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Questions answered</p>
          <p className="stat-value num">
            {answered}
            <small> / {total}</small>
          </p>
          <Meter value={answered} total={total} />
          <p className="muted small">Each question counts once, however often you repeat it.</p>
        </div>
        <div className="stat-card today-mini">
          <p className="stat-label">Today</p>
          <p className="stat-value num">
            {Math.min(done, goal)}
            <small> / {goal}</small>
          </p>
          <Link href="/today" className="btn small">
            {finished ? "Run another round" : done > 0 ? "Continue" : "Start today's 10"}
          </Link>
        </div>
      </section>

      <div className="insights">
        {insights.facts.length > 0 && (
          <FactCard
            facts={insights.facts.map((f) => ({ ...f, topicName: topicById(f.topic)?.name }))}
            start={Math.floor(Date.now() / 86_400_000)}
          />
        )}
        {kase.item && (
          <article className="insight case">
            <p className="insight-kind">Case study</p>
            <h2>{kase.item.title}</h2>
            <p>{kase.item.situation}</p>
            <p className="insight-q">{kase.item.question}</p>
            <details className="case-reveal">
              <summary>Think it through, then reveal</summary>
              <p>{kase.item.answer}</p>
            </details>
            <InsightFoot
              refText={kase.item.ref}
              volatile={kase.item.volatile}
              topic={caseTopic ? { id: caseTopic.id, name: caseTopic.name } : undefined}
              another={`/?case=${kase.next}`}
              label="Another case study"
            />
          </article>
        )}
      </div>
    </>
  );
}

function InsightFoot(p: { refText?: string; volatile?: boolean; topic?: { id: string; name: string }; another: string; label: string }) {
  return (
    <div className="insight-foot">
      {(p.refText || p.volatile) && (
        <p className="small note-meta">
          {p.refText && <span className="tag">{p.refText}</span>}
          {p.volatile && <span className="warn-text">Depends on notifications; check the current position.</span>}
        </p>
      )}
      <p className="small row" style={{ gap: 18 }}>
        {p.topic && <Link href={`/topics/${p.topic.id}`}>Learn more: {p.topic.name}</Link>}
        <Link href={p.another} scroll={false}>
          {p.label}
        </Link>
      </p>
    </div>
  );
}
