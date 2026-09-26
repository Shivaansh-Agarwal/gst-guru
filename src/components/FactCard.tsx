"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export type Fact = {
  title: string;
  hook?: string;
  text: string;
  example: string;
  ref?: string;
  volatile?: boolean;
  topic: string;
  topicName?: string;
};

const KEY = "facts-seen";

function readSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** A teaser question first, then the reveal. Discovered facts are remembered in this browser only. */
export default function FactCard({ facts, start }: { facts: Fact[]; start: number }) {
  const [i, setI] = useState(start % facts.length);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string[]>([]);
  const f = facts[i];

  useEffect(() => setSeen(readSeen()), []);

  function reveal() {
    setOpen(true);
    if (seen.includes(f.title)) return;
    const next = [...seen, f.title];
    setSeen(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Storage blocked: the count just won't persist.
    }
  }

  function go(k: number) {
    setOpen(false);
    setI(k);
  }

  // A random fact you haven't discovered yet; once you've seen them all, any other fact.
  function nextFact() {
    const unseen = facts.map((x, k) => k).filter((k) => k !== i && !seen.includes(facts[k].title));
    const pool = unseen.length ? unseen : facts.map((x, k) => k).filter((k) => k !== i);
    if (pool.length) go(pool[Math.floor(Math.random() * pool.length)]);
  }

  const found = facts.filter((x) => seen.includes(x.title)).length;

  return (
    <article className={`fact ${open ? "is-open" : ""}`} aria-live="polite">
      <span className="fact-mark" aria-hidden>
        {open ? "!" : "?"}
      </span>
      <p className="fact-sticker">Did you know?</p>
      {f.topicName && <span className="fact-topic">{f.topicName}</span>}

      <h2 className="fact-hook">{f.hook ?? f.title}</h2>

      {!open ? (
        <button type="button" className="fact-reveal" onClick={reveal}>
          Reveal the answer
        </button>
      ) : (
        <div className="fact-body">
          <p className="fact-title">{f.title}</p>
          <p>{f.text}</p>
          <div className="fact-example">
            <p className="fact-example-label">For example</p>
            <p>{f.example}</p>
          </div>
          {(f.ref || f.volatile) && (
            <p className="small note-meta">
              {f.ref && <span className="tag fact-tag">{f.ref}</span>}
              {f.volatile && <span>Depends on notifications; check the current position.</span>}
            </p>
          )}
        </div>
      )}

      <div className="fact-foot">
        <div className="fact-progress">
          <div className="fact-meter" aria-hidden>
            <i style={{ width: `${facts.length ? (found / facts.length) * 100 : 0}%` }} />
          </div>
          <p className="small fact-count">
            <b className="num">{found}</b> of {facts.length} discovered ·{" "}
            <Link href="/facts" className="fact-all">
              See all
            </Link>
          </p>
        </div>
        <div className="fact-actions">
          {open && f.topicName && (
            <Link href={`/topics/${f.topic}`} className="fact-link">
              Explore {f.topicName}
            </Link>
          )}
          <button type="button" className="fact-next" onClick={nextFact}>
            Next fact <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </article>
  );
}
