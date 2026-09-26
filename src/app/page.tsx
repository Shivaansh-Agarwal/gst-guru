import Link from "next/link";
import { loadContent, topicGroups } from "@/lib/content";
import { todaySummary, topicStats } from "@/lib/progress";
import { availableModels } from "@/lib/providers";
import { greeting } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function Home() {
  const { topics } = loadContent();
  const stats = topicStats();
  const { done, goal, streak, due } = todaySummary();
  const total = stats.reduce((a, b) => a + b.total, 0);
  const seen = stats.reduce((a, b) => a + b.seen, 0);
  const started = stats.filter((x) => x.attempts > 0).length;
  const models = availableModels();
  const weakest = [...stats].filter((x) => x.accuracy !== null).sort((a, b) => a.mastery - b.mastery)[0];
  const finished = done >= goal;
  // The daily set fills up to half of itself with due reviews, then adds fresh questions.
  const reviews = Math.min(due, Math.ceil(goal / 2));

  return (
    <>
      <section className="today" aria-labelledby="today-title">
        <p className="muted">
          {greeting()}
          {process.env.LEARNER_NAME ? `, ${process.env.LEARNER_NAME}` : ""}.
        </p>
        <h1 id="today-title">Today's practice</h1>
        <div className="today-card">
          <div className="today-count">
            <span className="count num">
              {Math.min(done, goal)}
              <small>/{goal}</small>
            </span>
            <span className="muted">{finished ? "done for today" : "answered today"}</span>
          </div>
          <div className="segments" role="img" aria-label={`${Math.min(done, goal)} of ${goal} answered today`}>
            {Array.from({ length: goal }, (_, i) => (
              <i key={i} className={i < done ? "on" : undefined} />
            ))}
          </div>
          <p style={{ maxWidth: "56ch" }}>
            {finished
              ? "You've finished today's set. Run another round, or go deeper on one topic."
              : reviews
                ? `${reviews} ${reviews === 1 ? "question is" : "questions are"} due for review. The rest are new, picked from topics you haven't started or find hard.`
                : "New questions, picked from topics you haven't started or find hard. At least 4 are client situations."}
          </p>
          <div className="row">
            <Link href="/practice?mode=daily" className="btn">
              {finished ? "Run another round" : done > 0 ? "Continue today's set" : "Start today's set"}
            </Link>
            <Link href="/practice?mode=scenarios" className="btn ghost">
              Client situations only
            </Link>
          </div>
        </div>
        {!models.length && (
          <p className="note">
            The question bank works without AI. To unlock grading, new questions and deep dives, <Link href="/setup">connect a model</Link>. Free options are available.
          </p>
        )}
      </section>

      <section aria-labelledby="progress-title">
        <div className="section-head">
          <h2 id="progress-title">Your progress</h2>
          <p className="muted">Across the whole question bank, not just today's set.</p>
        </div>
        <dl className="stats">
          <div>
            <dt>Streak</dt>
            <dd className="num">
              {streak} {streak === 1 ? "day" : "days"}
            </dd>
          </div>
          <div>
            <dt>Questions answered</dt>
            <dd className="num">
              {seen} <small>of {total}</small>
            </dd>
          </div>
          <div>
            <dt>Topics started</dt>
            <dd className="num">
              {started} <small>of {topics.length}</small>
            </dd>
          </div>
        </dl>
        {weakest && (
          <p className="small" style={{ marginBottom: 18 }}>
            Weakest so far: <Link href={`/topics/${weakest.topic}`}>{topics.find((t) => t.id === weakest.topic)?.name}</Link>
          </p>
        )}
        <table className="ledger">
          <caption className="muted small">
            <b>Answered</b> counts questions you've tried at least once. <b>Mastery</b> combines how much of the topic you've covered with how accurate your recent answers were.
          </caption>
          <thead>
            <tr>
              <th scope="col">Topic</th>
              <th scope="col" className="hide-sm">
                Answered
              </th>
              <th scope="col">Mastery</th>
            </tr>
          </thead>
          {topicGroups(topics).map((g) => (
            <tbody key={g.label}>
              <tr className="group-row">
                <th colSpan={3} scope="rowgroup">
                  {g.label}
                </th>
              </tr>
              {g.topics.map((t) => {
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
                        <span className="num small mastery">{st.attempts ? `${st.mastery}%` : "Not started"}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </section>
    </>
  );
}
