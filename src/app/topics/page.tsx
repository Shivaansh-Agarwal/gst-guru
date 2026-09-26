import Link from "next/link";
import { GROUP_BLURBS, loadContent, topicGroups } from "@/lib/content";
import { topicStats } from "@/lib/progress";

export const dynamic = "force-dynamic";

export default function Topics() {
  const { topics } = loadContent();
  const stats = topicStats();
  return (
    <>
      <h1 style={{ marginBottom: 12 }}>All topics</h1>
      <p className="muted" style={{ maxWidth: "60ch", marginBottom: 30 }}>
        {topics.length} topics in {topicGroups(topics).length} groups. Each topic has reading material and questions to practise.
      </p>
      <div className="groups">
        {topicGroups(topics).map((g, gi) => (
          <section key={g.label} className={`group g${(gi % 7) + 1}`} aria-labelledby={`group-${gi}`}>
            <header className="group-head">
              <span className="group-num num" aria-hidden>
                {String(gi + 1).padStart(2, "0")}
              </span>
              <div>
                <h2 id={`group-${gi}`}>{g.label}</h2>
                {GROUP_BLURBS[g.label] && <p className="muted small">{GROUP_BLURBS[g.label]}</p>}
              </div>
            </header>
            <ul className="topic-grid">
              {g.topics.map((t) => {
                const s = stats.find((x) => x.topic === t.id)!;
                return (
                  <li key={t.id}>
                    <Link href={`/topics/${t.id}`} className="topic-card">
                      <span className="topic-name">{t.name}</span>
                      <span className="muted small num">
                        {s.attempts ? `${s.seen} of ${s.total} answered` : `${s.total} questions`}
                      </span>
                      <span className="bar" aria-hidden>
                        <i style={{ width: `${s.total ? Math.round((s.seen / s.total) * 100) : 0}%` }} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
