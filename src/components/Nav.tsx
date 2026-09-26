"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Summary = { done: number; goal: number; streak: number; due: number; aiReady: boolean };
type ReturnLink = { id: string; label: string };

const ICONS = {
  today: "M4 5h16v15H4zM4 10h16M9 3v4M15 3v4",
  topics: "M4 5h7v14H4zM13 5h7v6h-7zM13 13h7v6h-7z",
  dive: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4",
  connect: "M9 7V3M15 7V3M6 7h12v4a6 6 0 0 1-12 0zM12 17v4",
  settings: "M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4",
};

function Icon({ d }: { d: string }) {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Nav({ returns }: { returns: ReturnLink[] }) {
  const path = usePathname();
  const [s, setS] = useState<Summary | null>(null);

  // Refresh on every navigation so the counts catch up after a practice round.
  useEffect(() => {
    let live = true;
    fetch("/api/progress")
      .then((r) => r.json())
      .then((d: Summary) => live && setS(d))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [path]);

  const is = (href: string) => (href === "/" ? path === "/" || path.startsWith("/practice") : path === href || path.startsWith(`${href}/`));
  const cur = (href: string) => (is(href) ? "page" : undefined);

  const todayMeta = !s ? "" : s.done >= s.goal ? "Done" : `${s.done}/${s.goal}`;

  return (
    <nav className="nav" aria-label="Main">
      <p className="nav-label">Practise</p>
      <Link href="/" aria-current={cur("/")}>
        <Icon d={ICONS.today} />
        <span className="nav-text">Today</span>
        {todayMeta && <span className="nav-meta num">{todayMeta}</span>}
      </Link>
      {s && s.due > 0 && (
        <p className="nav-hint">
          {s.due} due for review{s.streak ? `, ${s.streak} day streak` : ""}
        </p>
      )}
      <Link href="/topics" aria-current={cur("/topics") && !returns.some((r) => is(`/topics/${r.id}`)) ? "page" : undefined}>
        <Icon d={ICONS.topics} />
        <span className="nav-text">All topics</span>
      </Link>
      <Link href="/deep-dive" aria-current={cur("/deep-dive")}>
        <Icon d={ICONS.dive} />
        <span className="nav-text">Deep dive</span>
        {s && !s.aiReady && <span className="nav-meta">Needs AI</span>}
      </Link>

      <p className="nav-label">Returns</p>
      <div className="nav-returns">
        {returns.map((r) => (
          <Link key={r.id} href={`/topics/${r.id}`} aria-current={cur(`/topics/${r.id}`)} className={r.label === "Other returns" ? "wide" : undefined}>
            {r.label}
          </Link>
        ))}
      </div>

      <p className="nav-label">Settings</p>
      <Link href="/setup" aria-current={cur("/setup")}>
        <Icon d={ICONS.connect} />
        <span className="nav-text">Connect AI</span>
        {s && <span className={`nav-dot ${s.aiReady ? "on" : ""}`} title={s.aiReady ? "A model is connected" : "No model connected"} />}
      </Link>
      <Link href="/settings" aria-current={cur("/settings")}>
        <Icon d={ICONS.settings} />
        <span className="nav-text">Settings</span>
      </Link>
    </nav>
  );
}
