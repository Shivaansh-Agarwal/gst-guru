import Link from "next/link";
import { loadContent } from "@/lib/content";
import { answeredToday, streak, topicStats } from "@/lib/progress";
import { availableModels } from "@/lib/providers";
import { greeting } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function Home() {
  const { topics } = loadContent();
  const stats = topicStats();
  const done = answeredToday();
  const s = streak();
  const total = stats.reduce((a, b) => a + b.total, 0);
  const seen = stats.reduce((a, b) => a + b.seen, 0);
  const models = availableModels();
  const weakest = [...stats].filter((x) => x.accuracy !== null).sort((a, b) => a.mastery - b.mastery)[0];
  const untouched = stats.filter((x) => x.attempts === 0).length;

  return (
    <>
      <section className="hero">
        <p className="muted">
          {greeting()}
          {process.env.LEARNER_NAME ? `, ${process.env.LEARNER_NAME}` : ""}.
        </p>
        <div className="count">{done >= 10 ? "Done for today" : `${10 - Math.min(done, 10)} questions`}</div>
        <p style={{ maxWidth: "52ch" }}>
          {done >= 10
            ? "You've finished today's set. Go deeper on a topic, or run another round if you're in the mood."
            : "Today's set mixes questions you're due to review with fresh ones from your weakest topics."}
        </p>
        <div className="row">
          <Link href="/practice?mode=daily" className="btn">
            {done >= 10 ? "Run another round" : done > 0 ? "Continue today's set" : "Start today's set"}
          </Link>
          <Link href="/practice?mode=scenarios" className="btn ghost">
            Situations only
          </Link>
          {weakest && (
            <Link href={`/topics/${weakest.topic}`} className="btn ghost">
              Work on {topics.find((t) => t.id === weakest.topic)?.name}
            </Link>
          )}
        </div>
        <div className="facts">
          <span><b>{s}</b> day streak</span>
          <span><b className="num">{seen}</b> of {total} questions seen</span>
          <span><b>{untouched}</b> topics not started</span>
        </div>
        {!models.length && (
          <p className="note">
            The question bank works without AI. To unlock grading, new questions and deep dives, <Link href="/setup">connect a model</Link>. Free options are available.
          </p>
        )}
      </section>

      <section>
        <h2 style={{ marginBottom: 14 }}>Where you stand</h2>
        <table className="ledger">
          <thead>
            <tr>
              <th>Topic</th>
              <th className="hide-sm">Seen</th>
              <th>Mastery</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((t) => {
              const st = stats.find((x) => x.topic === t.id)!;
              return (
                <tr key={t.id}>
                  <td>
                    <Link href={`/topics/${t.id}`}>{t.name}</Link>
                  </td>
                  <td className="num muted hide-sm">
                    {st.seen} / {st.total}
                  </td>
                  <td style={{ width: "34%" }}>
                    <div className="row" style={{ gap: 10, flexWrap: "nowrap" }}>
                      <div className="bar" style={{ flex: 1 }} aria-hidden>
                        <i style={{ width: `${st.mastery}%` }} />
                      </div>
                      <span className="num small">{st.attempts ? `${st.mastery}%` : "new"}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
