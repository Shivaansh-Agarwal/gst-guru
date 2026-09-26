"use client";
import { useState } from "react";

export default function GeneratePanel({ topic }: { topic: string }) {
  const [notes, setNotes] = useState("");
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function go() {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const r = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic, count, notes: notes.trim() || undefined }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMsg(`Added ${d.questions.length} questions written by ${d.model}. They'll show up in your practice sets, marked as unreviewed.`);
      setNotes("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <div>
        <label htmlFor="notes">Notes, an article or a video summary (optional)</label>
        <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paste something you read. Leave empty to get questions on the topic in general." />
      </div>
      <div className="row">
        <select value={count} onChange={(e) => setCount(Number(e.target.value))} style={{ width: "auto" }} aria-label="How many">
          {[3, 5, 8, 10].map((n) => (
            <option key={n} value={n}>
              {n} questions
            </option>
          ))}
        </select>
        <button className="btn" onClick={go} disabled={busy}>
          {busy ? "Writing questions…" : "Write questions"}
        </button>
      </div>
      {msg && <p>{msg}</p>}
      {err && <p className="error">{err}</p>}
    </div>
  );
}
