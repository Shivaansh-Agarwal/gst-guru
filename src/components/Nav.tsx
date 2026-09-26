"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Summary = { done: number; goal: number };

const ICONS = {
  dashboard: "M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z",
  today: "M4 5h16v15H4zM4 10h16M9 3v4M15 3v4",
  topics: "M4 5h7v14H4zM13 5h7v6h-7zM13 13h7v6h-7z",
  gpt: "M4 5h16v11H9l-5 4zM8 9h8M8 12h5",
};

const LINKS = [
  { href: "/", label: "Dashboard", icon: ICONS.dashboard },
  { href: "/today", label: "Today", icon: ICONS.today },
  { href: "/topics", label: "All topics", icon: ICONS.topics },
  { href: "/gpt", label: "GST GPT", icon: ICONS.gpt },
];

export default function Nav() {
  const path = usePathname();
  const [s, setS] = useState<Summary | null>(null);

  // Refresh on every navigation so today's count catches up after answering.
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

  const active = (href: string) =>
    href === "/" ? path === "/" : href === "/topics" ? path.startsWith("/topics") || path.startsWith("/practice") : path.startsWith(href);

  return (
    <nav className="nav" aria-label="Main">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={active(l.href) ? "page" : undefined}>
          <svg className="nav-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d={l.icon} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="nav-text">{l.label}</span>
          {l.href === "/today" && s && <span className="nav-meta num">{s.done >= s.goal ? "Done" : `${s.done}/${s.goal}`}</span>}
        </Link>
      ))}
    </nav>
  );
}
