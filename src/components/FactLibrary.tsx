"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Fact } from "./FactCard";

type Item = Fact & { topicName: string; group: string };

const KEY = "facts-seen";

/** Every fact, filterable, with answers hidden until opened. Shares the discovered list with the dashboard card. */
export default function FactLibrary({ facts, groups }: { facts: Item[]; groups: string[] }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<string[]>([]);
  const [seen, setSeen] = useState<string[]>([]);

  useEffect(() => {
    try {
      setSeen(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
    } catch {
      setSeen([]);
    }
  }, []);

  function discover(title: string) {
    setOpen((o) => (o.includes(title) ? o.filter((x) => x !== title) : [...o, title]));
    if (seen.includes(title)) return;
    const next = [...seen, title];
    setSeen(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Storage blocked: discoveries just won't persist.
    }
  }

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return facts.filter(
      (f) =>
        (!group || f.group === group) &&
        (!q || [f.hook, f.title, f.text, f.example, f.topicName, f.ref].some((s) => s?.toLowerCase().includes(q)))
    );
  }, [facts, group, query]);

  const found = facts.filter((f) => seen.includes(f.title)).length;

  return (
    <div className="library">
      <div className="library-bar">
        <div className="fact-progress">
          <div className="fact-meter" aria-hidden>
            <i style={{ width: `${facts.length ? (found / facts.length) * 100 : 0}%` }} />
          </div>
          <p className="small">
            <b className="num">{found}</b> of {facts.length} discovered
          </p>
        </div>
        <label className="library-search">
          <span className="visually-hidden">Search facts</span>
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search, e.g. exempt, e-way bill, reverse charge" />
        </label>
        <button type="button" role="switch" aria-checked={showAll} className="theme-toggle" onClick={() => setShowAll(!showAll)}>
          <span className="theme-track" aria-hidden>
            <span className="theme-thumb" />
          </span>
          <span>Answers {showAll ? "shown" : "hidden"}</span>
        </button>
      </div>

      <div className="deck-filter" role="group" aria-label="Filter by group">
        <button type="button" aria-pressed={group === ""} onClick={() => setGroup("")}>
          All <span className="num">{facts.length}</span>
        </button>
        {groups.map((g) => {
          const n = facts.filter((f) => f.group === g).length;
          return n ? (
            <button key={g} type="button" aria-pressed={group === g} onClick={() => setGroup(g)}>
              {g} <span className="num">{n}</span>
            </button>
          ) : null;
        })}
      </div>

      <p className="small muted" aria-live="polite" style={{ margin: "4px 0 14px" }}>
        {shown.length === facts.length ? `Showing all ${facts.length}` : `${shown.length} match`}
      </p>

      <ol className="library-list">
        {shown.map((f) => {
          const isOpen = showAll || open.includes(f.title);
          const isSeen = seen.includes(f.title);
          return (
            <li key={f.title} className={`lib-fact ${isOpen ? "is-open" : ""}`}>
              <button type="button" className="lib-q" aria-expanded={isOpen} onClick={() => discover(f.title)}>
                <span className="lib-meta">
                  <span className="lib-topic">{f.topicName}</span>
                  {isSeen && <span className="lib-seen">Discovered</span>}
                </span>
                <span className="lib-hook">{f.hook ?? f.title}</span>
                {!isOpen && <span className="flip-cta">Guess, then tap to reveal</span>}
              </button>
              {isOpen && (
                <div className="lib-answer">
                  <p className="fact-title">{f.title}</p>
                  <p>{f.text}</p>
                  <div className="fact-example">
                    <p className="fact-example-label">For example</p>
                    <p>{f.example}</p>
                  </div>
                  <p className="small note-meta">
                    {f.ref && <span className="tag">{f.ref}</span>}
                    {f.volatile && <span className="warn-text">Depends on notifications; check the current position.</span>}
                    <Link href={`/topics/${f.topic}`}>Explore the topic</Link>
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {shown.length === 0 && <p className="muted">No facts match that search.</p>}
    </div>
  );
}
