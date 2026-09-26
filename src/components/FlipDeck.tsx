"use client";
import { useEffect, useState } from "react";

export type Card = {
  id: string;
  sub: string;
  q: string;
  answer: string;
  scenario: boolean;
  exp: string;
  ref?: string;
  volatile?: boolean;
  situation: boolean;
};

/** The topic's study notes as flip cards: guess, then flip. Flipped cards are remembered in this browser. */
export default function FlipDeck({ topic, parts, cards }: { topic: string; parts: string[]; cards: Card[] }) {
  const key = `flipped:${topic}`;
  const [part, setPart] = useState("");
  const [flipped, setFlipped] = useState<string[]>([]);

  useEffect(() => {
    try {
      setFlipped(JSON.parse(localStorage.getItem(key) ?? "[]"));
    } catch {
      setFlipped([]);
    }
  }, [key]);

  function save(next: string[]) {
    setFlipped(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Storage blocked: flips just won't persist.
    }
  }

  const toggle = (id: string) => save(flipped.includes(id) ? flipped.filter((x) => x !== id) : [...flipped, id]);
  const shown = part ? cards.filter((c) => c.sub === part) : cards;
  const count = cards.filter((c) => flipped.includes(c.id)).length;
  const pct = cards.length ? Math.round((count / cards.length) * 100) : 0;

  return (
    <div>
      <div className="deck-head">
        <div className="deck-meter">
          <p className="small">
            <b className="num">{count}</b> of {cards.length} flipped
          </p>
          <div className="bar deck-bar" aria-hidden>
            <i style={{ width: `${pct}%` }} />
          </div>
        </div>
        {count > 0 && (
          <button type="button" className="deck-reset small" onClick={() => save([])}>
            Turn all back over
          </button>
        )}
      </div>

      <div className="deck-filter" role="group" aria-label="Show cards from">
        <button type="button" aria-pressed={part === ""} onClick={() => setPart("")}>
          All parts <span className="num">{cards.length}</span>
        </button>
        {parts.map((p) => {
          const n = cards.filter((c) => c.sub === p).length;
          return n ? (
            <button key={p} type="button" aria-pressed={part === p} onClick={() => setPart(p)}>
              {p} <span className="num">{n}</span>
            </button>
          ) : null;
        })}
      </div>

      <ul className="deck">
        {shown.map((c) => {
          const open = flipped.includes(c.id);
          return (
            <li key={c.id}>
              <button type="button" className={`flip ${open ? "is-open" : ""}`} onClick={() => toggle(c.id)} aria-expanded={open}>
                <span className="flip-top">
                  <span className="flip-part">{c.sub}</span>
                  {c.situation && <span className="flip-kind">Situation</span>}
                </span>
                <span className="flip-q">{c.q}</span>
                {open ? (
                  <span className="flip-back">
                    <span className="flip-answer">
                      <b>{c.scenario ? "Model answer" : "Answer"}</b>
                      {c.answer}
                    </span>
                    <span className="flip-exp">{c.exp}</span>
                    {(c.ref || c.volatile) && (
                      <span className="flip-meta">
                        {c.ref && <span className="tag">{c.ref}</span>}
                        {c.volatile && <span className="warn-text">Depends on notifications; check the current position.</span>}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="flip-cta">Make a guess, then tap to flip</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
