"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import QuestionHelp from "./QuestionHelp";
import { TermText, useGlossaryMatcher, type Gloss } from "./Terms";

type Q = {
  id: string;
  topic: string;
  sub: string;
  diff: number;
  type: "mcq" | "tf" | "scenario";
  q: string;
  options?: string[];
  answer?: number;
  model?: string;
  points?: string[];
  exp: string;
  ref?: string;
  volatile?: boolean;
  case?: boolean;
  source?: "bank" | "ai";
  model_used?: string;
};

type Result = "ok" | "bad" | "mid";
type Grade = { verdict: "correct" | "partial" | "incorrect"; score: number; feedback: string; missed: string[]; model: string };

const LETTERS = "ABCDE";
const DIFF = ["", "Easy", "Medium", "Tricky"];

// Feedback lines rotate by question so the round doesn't feel canned.
const CHEERS = ["Nailed it!", "Sharp!", "Spot on.", "That's the one.", "Exactly right."];
const NUDGES = ["Not quite. Here's the twist.", "Close, but no.", "Tricky one. Here's why.", "Good guess, wrong answer."];
const PARTLY = ["Partly there.", "Half the story."];

function streakAt(results: Result[], upto: number) {
  let n = 0;
  for (let k = upto; k >= 0 && results[k] === "ok"; k--) n++;
  return n;
}

function bestStreak(results: Result[]) {
  let best = 0;
  let run = 0;
  for (const r of results) {
    run = r === "ok" ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

function kindOf(q: Q) {
  if (q.type === "scenario") return { label: "Write it out", cls: "violet" };
  if (q.case) return { label: "Client situation", cls: "coral" };
  if (q.type === "tf") return { label: "True or false", cls: "sun" };
  return { label: "Quick check", cls: "mint" };
}

function verdictFor(ok: number, total: number) {
  const r = total ? ok / total : 0;
  if (r === 1) return { title: "Clean sheet!", line: "Every one right. The scheduler will push these further out." };
  if (r >= 0.8) return { title: "Strong round", line: "Only a couple slipped. They'll come back tomorrow so they stick." };
  if (r >= 0.5) return { title: "Solid work", line: "More right than wrong. The misses return tomorrow for another go." };
  return { title: "Every miss is tomorrow's win", line: "These come back soon, and a second look is when things click." };
}

export default function QuizRunner(props: {
  mode: "daily" | "topic" | "scenarios";
  topic?: string;
  sub?: string;
  aiReady: boolean;
  glossary: Gloss[];
  size?: number;
}) {
  const [qs, setQs] = useState<Q[] | null>(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [written, setWritten] = useState("");
  const [grade, setGrade] = useState<Grade | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [flagged, setFlagged] = useState(false);
  const [term, setTerm] = useState<Gloss | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpSeed, setHelpSeed] = useState<string | undefined>();
  const matcher = useGlossaryMatcher(props.glossary);

  useEffect(() => {
    const p = new URLSearchParams({ mode: props.mode, size: String(props.size ?? 10) });
    if (props.topic) p.set("topic", props.topic);
    if (props.sub) p.set("sub", props.sub);
    fetch(`/api/session?${p}`)
      .then((r) => r.json())
      .then((d) => setQs(d.questions));
  }, [props.mode, props.topic, props.sub, props.size]);

  // Keyboard: A–E or 1–5 picks an option; Enter moves on once answered.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (!qs || i >= qs.length || e.metaKey || e.ctrlKey || e.altKey || el.closest("textarea, input, select")) return;
      const cur = qs[i];
      if (cur.type === "scenario" || !cur.options || picked !== null) return;
      const k = e.key.toUpperCase();
      const idx = LETTERS.indexOf(k) >= 0 && k.length === 1 ? LETTERS.indexOf(k) : Number(e.key) - 1;
      if (idx >= 0 && idx < cur.options.length) {
        e.preventDefault();
        document.getElementById(`opt-${idx}`)?.click();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [qs, i, picked]);

  if (!qs) return <p className="muted">Shuffling your questions…</p>;
  if (!qs.length)
    return (
      <p>
        No questions here yet. <Link href="/topics">Pick another topic</Link>.
      </p>
    );

  if (i >= qs.length) {
    const ok = results.filter((r) => r === "ok").length;
    const mid = results.filter((r) => r === "mid").length;
    const v = verdictFor(ok, qs.length);
    const party = ok / qs.length >= 0.8;
    return (
      <div className="finish">
        {party && (
          <div className="confetti" aria-hidden>
            {Array.from({ length: 28 }, (_, k) => (
              <i key={k} style={{ left: `${(k * 37) % 100}%`, animationDelay: `${(k % 7) * 90}ms`, ["--r" as string]: `${(k * 53) % 360}deg` }} />
            ))}
          </div>
        )}
        <p className="finish-sticker">Round complete</p>
        <p className="finish-score num">
          {ok}
          <small>/{qs.length}</small>
        </p>
        <h2>{v.title}</h2>
        <p className="finish-line">{v.line}</p>
        <ul className="finish-stats">
          <li>
            <b className="num">{bestStreak(results)}</b> best streak
          </li>
          <li>
            <b className="num">{Math.round((ok / qs.length) * 100)}%</b> accuracy
          </li>
          {mid > 0 && (
            <li>
              <b className="num">{mid}</b> partly right
            </li>
          )}
        </ul>
        <div className="coins finish-coins" aria-hidden>
          {qs.map((_, k) => (
            <i key={k} className={results[k] === "ok" ? "ok" : results[k] === "mid" ? "mid" : "bad"} />
          ))}
        </div>
        <div className="row" style={{ justifyContent: "center" }}>
          <button className="btn" onClick={() => location.reload()}>
            Play another round
          </button>
          <Link className="btn ghost" href="/">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const q = qs[i];
  const answered = q.type === "scenario" ? results[i] !== undefined : picked !== null;
  const result = results[i];

  async function record(r: Result) {
    setResults((prev) => {
      const next = [...prev];
      next[i] = r;
      return next;
    });
    await fetch("/api/answer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questionId: q.id, topic: q.topic, correct: r === "ok", mode: props.mode }),
    });
  }

  function choose(idx: number) {
    if (picked !== null) return;
    setPicked(idx);
    record(idx === q.answer ? "ok" : "bad");
  }

  async function aiGrade() {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/ai/grade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q.q, modelAnswer: q.model, points: q.points, answer: written }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setGrade(d);
      setRevealed(true);
      record(d.verdict === "correct" ? "ok" : d.verdict === "partial" ? "mid" : "bad");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function next() {
    setI(i + 1);
    setPicked(null);
    setWritten("");
    setGrade(null);
    setRevealed(false);
    setErr("");
    setFlagged(false);
    setTerm(null);
    setHelpOpen(false);
    setHelpSeed(undefined);
    window.scrollTo({ top: 0 });
  }

  async function flag() {
    const note = prompt("What looks wrong? (optional)") ?? undefined;
    await fetch("/api/flag", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId: q.id, note }) });
    setFlagged(true);
  }

  const seen = new Set<string>();
  const stampText = result === "ok" ? "Correct" : result === "mid" ? "Partly" : "Not quite";
  const kind = kindOf(q);
  const score = results.filter((r) => r === "ok").length;
  const combo = streakAt(results, result ? i : i - 1);

  return (
    <div>
      <div className="hud">
        <p className="hud-count">
          Question <b className="num">{i + 1}</b> of {qs.length}
        </p>
        <p className="hud-score">
          Score <b className="num">{score}</b>
        </p>
        {combo >= 2 && (
          <p className="hud-combo" key={combo}>
            {combo} in a row!
          </p>
        )}
        <div className="coins" aria-hidden>
          {qs.map((_, k) => (
            <i key={k} className={k === i && !result ? "now" : results[k] === "ok" ? "ok" : results[k] === "mid" ? "mid" : results[k] ? "bad" : ""} />
          ))}
        </div>
      </div>

      <article className={`sheet play ${result ? `is-${result}` : ""}`}>
        {result && (
          <div className={`stamp ${result}`} role="status">
            {stampText}
          </div>
        )}
        <div className="sheet-head">
          <span className={`q-sticker ${kind.cls}`}>{kind.label}</span>
          <span className="q-meta">
            {q.sub}
            <span className="diff" aria-label={`Difficulty: ${DIFF[q.diff]}`}>
              {[1, 2, 3].map((d) => (
                <i key={d} className={d <= q.diff ? "on" : ""} />
              ))}
              <span>{DIFF[q.diff]}</span>
            </span>
          </span>
        </div>

        <p className="q-text">
          <TermText text={q.q} matcher={matcher} onPick={setTerm} seen={seen} />
        </p>
        {term && (
          <div className="definition" role="note">
            <p>
              <b>{term.term}</b>: {term.def}
            </p>
            <div className="row" style={{ marginTop: 8, gap: 8 }}>
              {props.aiReady && (
                <button
                  className="btn small ghost"
                  onClick={() => {
                    setHelpOpen(true);
                    setHelpSeed(`Explain "${term.term}" in the context of this question.`);
                  }}
                >
                  Explain it in this context
                </button>
              )}
              <button className="btn small ghost" onClick={() => setTerm(null)}>
                Close
              </button>
            </div>
          </div>
        )}

        {q.type !== "scenario" && q.options && picked === null && (
          <p className="q-hint">Trust your gut. Press {LETTERS.slice(0, q.options.length).split("").join(", ")} or tap an answer.</p>
        )}
        {q.type !== "scenario" && q.options && (
          <div className="opts">
            {q.options.map((o, k) => {
              const cls = picked === null ? "" : k === q.answer ? "right" : k === picked ? "wrong" : "faded";
              return (
                <button id={`opt-${k}`} key={k} className={`opt ${cls}`} onClick={() => choose(k)} disabled={picked !== null}>
                  <span className="key">{LETTERS[k]}</span>
                  <span className="opt-text">{o}</span>
                  {cls === "right" && <span className="opt-mark">✓</span>}
                  {cls === "wrong" && <span className="opt-mark">✗</span>}
                </button>
              );
            })}
          </div>
        )}

        {q.type === "scenario" && (
          <div className="stack">
            <div>
              <label htmlFor="ans">Your answer</label>
              <textarea
                id="ans"
                value={written}
                onChange={(e) => setWritten(e.target.value)}
                disabled={revealed}
                placeholder="Explain your reasoning like you would to a colleague."
              />
            </div>
            {!revealed && (
              <div className="row">
                {props.aiReady && (
                  <button className="btn" onClick={aiGrade} disabled={busy || written.trim().length < 5}>
                    {busy ? "Grading…" : "Check my answer"}
                  </button>
                )}
                <button className={props.aiReady ? "btn ghost" : "btn"} onClick={() => setRevealed(true)}>
                  Show the model answer
                </button>
              </div>
            )}
            {err && <p className="error">{err}</p>}
          </div>
        )}

        {((q.type !== "scenario" && answered) || (q.type === "scenario" && revealed)) && (
          <div className="explain">
            {result && (
              <p className={`feedback ${result}`} role="status">
                {result === "ok" ? (combo >= 3 ? `${combo} in a row! You're on a roll.` : CHEERS[i % CHEERS.length]) : result === "mid" ? PARTLY[i % PARTLY.length] : NUDGES[i % NUDGES.length]}
              </p>
            )}
            {grade && (
              <>
                <p>{grade.feedback}</p>
                {grade.missed.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: "1.2em" }}>
                    {grade.missed.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                )}
                <p className="muted small">Graded by {grade.model}. Compare with the model answer below.</p>
              </>
            )}
            {q.type === "scenario" && (
              <>
                <h3>Model answer</h3>
                <p>{q.model}</p>
              </>
            )}
            <div className="why">
              <p className="why-label">Why</p>
              <p>
                <TermText text={q.exp} matcher={matcher} onPick={setTerm} seen={seen} />
              </p>
              {q.ref && <p className="small why-ref">{q.ref}</p>}
            </div>
            {q.volatile && <p className="note">This depends on current rates, limits or dates, which change by notification. Verify against the latest CBIC notification before relying on it.</p>}
            {q.source === "ai" && <p className="note">Written by {q.model_used} and not yet reviewed. Double-check it.</p>}
            {q.type === "scenario" && !grade && !result && (
              <div className="row">
                <span className="muted">How did you do?</span>
                <button className="btn small" onClick={() => record("ok")}>
                  I got it
                </button>
                <button className="btn small ghost" onClick={() => record("mid")}>
                  Partly
                </button>
                <button className="btn small ghost" onClick={() => record("bad")}>
                  I missed it
                </button>
              </div>
            )}
          </div>
        )}
      </article>

      {props.aiReady ? (
        <div className="help-toggle">
          {!helpOpen ? (
            <button className="btn ghost small ask-btn" onClick={() => setHelpOpen(true)}>
              {answered ? "Still curious? Ask about this" : "Stuck? Get a hint without the answer"}
            </button>
          ) : (
            <QuestionHelp key={q.id} question={q} answered={answered} seed={helpSeed} onSeedUsed={() => setHelpSeed(undefined)} />
          )}
        </div>
      ) : (
        <p className="muted small help-toggle">
          Tap an underlined term for its meaning. <Link href="/setup">Connect a model</Link> to ask questions about any question.
        </p>
      )}

      {answered && (
        <div className="next-row">
          <p className="small curious">
            <span>Curious?</span>
            <Link href={`/gpt?topic=${q.topic}&q=${encodeURIComponent(q.id)}`}>Go deeper with GST GPT</Link>
            <Link href={`/topics/${q.topic}`}>Open the topic</Link>
            <button className="linkish" onClick={flag} disabled={flagged}>
              {flagged ? "Flagged for review" : "This looks wrong"}
            </button>
          </p>
          <button className="btn next-btn" onClick={next} autoFocus>
            {i + 1 === qs.length ? "See my results" : "Next question"} <span aria-hidden>→</span>
          </button>
        </div>
      )}
    </div>
  );
}
