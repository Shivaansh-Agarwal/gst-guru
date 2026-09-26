import Link from "next/link";
import { notFound } from "next/navigation";
import { loadContent, loadReading, loadVideos, topicById, topicGroups } from "@/lib/content";
import { allQuestions, isCase, levelFor, seenQuestionIds, topicStats } from "@/lib/progress";
import { availableModels } from "@/lib/providers";
import GeneratePanel from "@/components/GeneratePanel";
import FlipDeck from "@/components/FlipDeck";
import VideoShelf from "@/components/VideoShelf";

export const dynamic = "force-dynamic";

type Tab = "learn" | "questions";

function Ring({ value, size = 96, label }: { value: number; size?: number; label: string }) {
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  return (
    <svg className="ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        className="ring-fill"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(value, 100) / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="ring-text">
        {value}%
      </text>
    </svg>
  );
}

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const t = topicById(id);
  if (!t) notFound();
  const tab: Tab = sp.tab === "questions" ? "questions" : "learn";
  const s = topicStats().find((x) => x.topic === id)!;
  const qs = allQuestions().filter((q) => q.topic === id);
  const bank = loadContent().questions.filter((q) => q.topic === id);
  const seen = seenQuestionIds();
  const caseCount = qs.filter(isCase).length;
  const aiReady = (await availableModels()).length > 0;
  const reading = loadReading();
  const links = [...(reading.topics[id] ?? []), ...reading.general];
  const videos = loadVideos()[id] ?? [];
  const groupIndex = topicGroups(loadContent().topics).findIndex((g) => g.label === t.group);
  const accent = `g${(Math.max(groupIndex, 0) % 7) + 1}`;
  const started = s.attempts > 0;
  // Topic score: share of the topic answered, times recent accuracy. Levels have to be earned across the whole topic.
  const score = s.accuracy === null || !s.total ? 0 : Math.round((s.seen / s.total) * s.accuracy * 100);
  const level = levelFor(score, started);
  const parts = t.subtopics
    .map((sub) => {
      const inPart = qs.filter((q) => q.sub === sub);
      const done = inPart.filter((q) => seen.has(q.id)).length;
      return { sub, total: inPart.length, done };
    })
    .filter((p) => p.total > 0);
  const cleared = parts.filter((p) => p.done === p.total).length;

  return (
    <>
      <p className="muted small crumbs">
        <Link href="/topics">All topics</Link>
        {t.group && <span aria-hidden> / </span>}
        {t.group && <span>{t.group}</span>}
      </p>

      <header className={`topic-hero ${accent}`}>
        <div className="hero-main">
          {t.group && <p className="hero-sticker">{t.group}</p>}
          <h1>{t.name}</h1>
          <p className="hero-blurb">{t.blurb}</p>
          <ul className="hero-chips">
            <li>
              <b className="num">{qs.length}</b> questions
            </li>
            <li>
              <b className="num">{s.seen}</b> answered
            </li>
            <li>
              <b className="num">{caseCount}</b> situations
            </li>
            <li>
              <b className="num">
                {cleared}/{parts.length}
              </b>{" "}
              parts cleared
            </li>
          </ul>
        </div>
        <div className="hero-level">
          <Ring value={score} label={`Topic score ${score}%`} />
          <p className="small level-caption">Topic score</p>
          <p className="level-badge">{level.name}</p>
          <p className="small level-next">
            {level.next ? (started ? `${level.next.name} at ${level.next.at}%` : "Answer one question to start") : "Top level reached"}
          </p>
          <p className="small level-help">
            How much you've answered, times how accurate you've been.
          </p>
        </div>
      </header>

      <nav className="seg-tabs" aria-label="Topic sections">
        <Link href={`/topics/${t.id}?tab=learn`} aria-current={tab === "learn" ? "page" : undefined}>
          Learn
        </Link>
        <Link href={`/topics/${t.id}?tab=questions`} aria-current={tab === "questions" ? "page" : undefined}>
          Questions
        </Link>
      </nav>

      {tab === "learn" ? (
        <>
          <section className="panel panel-sun" aria-labelledby="cards-title">
            <p className="panel-sticker">01 · Flip cards</p>
            <h2 id="cards-title">Guess first, then flip</h2>
            <p className="panel-lede">
              Every question in this topic, with the answer on the back. Guessing before you look makes it stick far better than just reading.
            </p>
            <FlipDeck
              topic={t.id}
              parts={t.subtopics}
              cards={bank.map((q) => ({
                id: q.id,
                sub: q.sub,
                q: q.q,
                answer: q.type === "scenario" ? q.model ?? "" : q.options?.[q.answer ?? 0] ?? "",
                scenario: q.type === "scenario",
                exp: q.exp,
                ref: q.ref,
                volatile: q.volatile,
                situation: isCase(q),
              }))}
            />
          </section>

          {videos.length > 0 && (
            <section className="panel panel-coral" aria-labelledby="watch-title">
              <p className="panel-sticker">02 · Watch</p>
              <h2 id="watch-title">Watch it explained</h2>
              <p className="panel-lede">
                Hand-picked videos, official channels first. Nothing loads from YouTube until you press play. Videos can age faster than the law, so check dates against the latest notifications.
              </p>
              <VideoShelf videos={videos} />
            </section>
          )}

          <section className="panel panel-mint" aria-labelledby="source-title">
            <p className="panel-sticker">{videos.length > 0 ? "03" : "02"} · Go deeper</p>
            <h2 id="source-title">Read from the source</h2>
            <p className="panel-lede">Official manuals and the law first, then practitioners' articles. Links open in a new tab.</p>
            <ul className="source-grid">
              {links.map((l) => (
                <li key={l.url}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className={`source-tile ${l.kind}`}>
                    <span className="source-badge">{l.kind === "official" ? "Official" : "Article"}</span>
                    <span className="source-title">{l.title}</span>
                    <span className="source-from">
                      {l.source} <span aria-hidden>↗</span>
                      <span className="visually-hidden"> (opens in a new tab)</span>
                    </span>
                    {l.note && <span className="source-note">{l.note}</span>}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <p className="tab-next">
            Ready to test yourself? <Link href={`/topics/${t.id}?tab=questions`}>Go to the questions</Link>
          </p>
        </>
      ) : (
        <>
          <section className="panel panel-coral" aria-labelledby="play-title">
            <p className="panel-sticker">01 · Play</p>
            <h2 id="play-title">{started ? "Keep going" : "Start your first round"}</h2>
            <div className="play-grid">
              <Link className="play-card primary" href={`/practice?mode=topic&topic=${t.id}`}>
                <span className="play-title">{started ? "Practise 10 more" : "Practise 10 questions"}</span>
                <span className="play-sub">Unseen questions first, then the ones you're due to review.</span>
              </Link>
              {caseCount > 0 && (
                <Link className="play-card" href={`/practice?mode=scenarios&topic=${t.id}`}>
                  <span className="play-title">Client situations</span>
                  <span className="play-sub">{caseCount} real-world cases from a CA's desk.</span>
                </Link>
              )}
              {aiReady && (
                <Link className="play-card" href={`/gpt?topic=${t.id}`}>
                  <span className="play-title">Ask GST GPT</span>
                  <span className="play-sub">Stuck on something? Chat about this topic.</span>
                </Link>
              )}
            </div>
          </section>

          <section className="panel panel-violet" aria-labelledby="levels-title">
            <p className="panel-sticker">02 · Levels</p>
            <h2 id="levels-title">Clear every part</h2>
            <p className="panel-lede">
              {cleared === parts.length ? "Every part cleared. Nicely done." : `${cleared} of ${parts.length} cleared. Answer every question in a part to clear it.`}
            </p>
            <ol className="level-grid">
              {parts.map((p, k) => {
                const pct = Math.round((p.done / p.total) * 100);
                const done = p.done === p.total;
                return (
                  <li key={p.sub}>
                    <Link
                      className={`level-tile ${done ? "cleared" : ""}`}
                      href={`/practice?mode=topic&topic=${t.id}&sub=${encodeURIComponent(p.sub)}`}
                    >
                      <span className="level-num">Level {k + 1}</span>
                      <Ring value={pct} size={64} label={`${p.done} of ${p.total} answered`} />
                      <span className="level-name">{p.sub}</span>
                      <span className="small muted num">
                        {p.done} / {p.total} answered
                      </span>
                      {done && (
                        <span className="level-stamp" aria-hidden>
                          Cleared
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>

          <details className="fold">
            <summary>Write more questions with AI</summary>
            <div style={{ marginTop: 16 }}>
              {aiReady ? (
                <GeneratePanel topic={t.id} />
              ) : (
                <p className="muted">
                  Connect a model on the <Link href="/setup">Connect AI page</Link> to write new questions for this topic, including from notes or articles you paste in.
                </p>
              )}
            </div>
          </details>
        </>
      )}
    </>
  );
}
