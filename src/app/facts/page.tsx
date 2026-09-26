import Link from "next/link";
import { loadContent, loadInsights, topicGroups } from "@/lib/content";
import FactLibrary from "@/components/FactLibrary";

export const dynamic = "force-dynamic";

export default function Facts() {
  const { topics } = loadContent();
  const groups = topicGroups(topics);
  const order = new Map(topics.map((t, k) => [t.id, k]));
  const facts = [...loadInsights().facts]
    .sort((a, b) => (order.get(a.topic) ?? 999) - (order.get(b.topic) ?? 999))
    .map((f) => {
      const t = topics.find((x) => x.id === f.topic);
      return { ...f, topicName: t?.name ?? f.topic, group: t?.group ?? "Other" };
    });

  return (
    <>
      <p className="muted small crumbs">
        <Link href="/">Dashboard</Link>
      </p>
      <h1 style={{ marginBottom: 10 }}>Did you know?</h1>
      <p className="muted" style={{ maxWidth: "60ch", marginBottom: 24 }}>
        All {facts.length} GST facts in one place. Read the question, guess, then open it. Facts you open here count as discovered on the dashboard too.
      </p>
      <FactLibrary facts={facts} groups={groups.map((g) => g.label)} />
    </>
  );
}
