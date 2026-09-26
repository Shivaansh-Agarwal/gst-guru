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

  if (!qs) return <p className="muted">Pulling your questions…</p>;
  if (!qs.length)
    return (
      <p>
        No questions here yet. <Link href="/topics">Pick another topic</Link>.
      </p>
    );

  if (i >= qs.length) {
    const ok = results.filter((r) => r === "ok").length;
    const mid = results.filter((r) => r === "mid").length;
    return (
      <div className="stack">
        <div className="count" style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "4rem", lineHeight: 1 }}>
          {ok}/{qs.length}
        </div>
        <p>
          {mid ? `Plus ${mid} partly right. ` : ""}
          {ok === qs.length
            ? "Clean sheet. The scheduler will push these further out."
            : "The ones you missed will come back tomorrow, so they stick."}
        </p>
        <div className="row">
          <Link className="btn" href="/">
            Back to today
          </Link>
          <button className="btn ghost" onClick={() => location.reload()}>
            Run another set
          </button>
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

  return (
    <div>
      <div className="progress" aria-label={`Question ${i + 1} of ${qs.length}`}>
        {qs.map((_, k) => (
          <i key={k} className={k === i ? "now" : results[k] === "ok" ? "done-ok" : results[k] ? "done-bad" : ""} />
        ))}
      </div>

      <article className="sheet">
        {result && (
          <div className={`stamp ${result}`} role="status">
            {stampText}
          </div>
        )}
        <div className="sheet-head">
          <span className="ref">{q.id}</span>
          <span>
            {(q.case || q.type === "scenario") && <span className="kind">Situation. </span>}
            {q.sub}, {DIFF[q.diff]}
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

        {q.type !== "scenario" && q.options && (
          <div className="opts">
            {q.options.map((o, k) => {
              const cls = picked === null ? "" : k === q.answer ? "right" : k === picked ? "wrong" : "";
              return (
                <button key={k} className={`opt ${cls}`} onClick={() => choose(k)} disabled={picked !== null}>
                  <span className="key">{q.type === "tf" ? "" : LETTERS[k]}</span>
                  <span>{o}</span>
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
            <p>
              <TermText text={q.exp} matcher={matcher} onPick={setTerm} seen={seen} />
            </p>
            {q.ref && <p className="muted small">Reference: {q.ref}</p>}
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
            <button className="btn ghost small" onClick={() => setHelpOpen(true)}>
              Ask about this question
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
        <div className="row" style={{ marginTop: 18, justifyContent: "space-between" }}>
          <button className="btn ghost small" onClick={flag} disabled={flagged}>
            {flagged ? "Flagged for review" : "This looks wrong"}
          </button>
          <div className="row">
            <Link className="btn ghost small" href={`/deep-dive?topic=${q.topic}&q=${encodeURIComponent(q.id)}`}>
              Explain this more
            </Link>
            <button className="btn" onClick={next} autoFocus>
              {i + 1 === qs.length ? "See results" : "Next question"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
