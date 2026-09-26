import Link from "next/link";
import { loadContent } from "@/lib/content";
import { topicStats } from "@/lib/progress";

export const dynamic = "force-dynamic";

export default function Topics() {
  const { topics } = loadContent();
  const stats = topicStats();
  return (
    <>
      <h1 style={{ marginBottom: 12 }}>Topics</h1>
      <p className="muted" style={{ maxWidth: "58ch", marginBottom: 32 }}>
        The whole of GST, split the way it shows up in real compliance work. Pick one to practise, or open a deep dive when you start on a module that touches it.
      </p>
      <div className="stack" style={{ gap: 0 }}>
        {topics.map((t) => {
          const s = stats.find((x) => x.topic === t.id)!;
          return (
            <Link key={t.id} href={`/topics/${t.id}`} className="provider" style={{ textDecoration: "none" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <h3>{t.name}</h3>
                <span className="num muted small">
                  {s.seen} / {s.total} seen{s.attempts ? `, ${s.mastery}% mastery` : ""}
                </span>
              </div>
              <p className="muted">{t.blurb}</p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
