"use client";
import { useState } from "react";

type M = { key: string; providerName: string; model: string; cost: string; note?: string };
const COST: Record<string, string> = { free: "free", "free-tier": "free tier", local: "local", paid: "paid" };

export default function ModelPicker(p: { task: string; label: string; hint: string; models: M[]; current: string }) {
  const [value, setValue] = useState(p.current);
  const [saved, setSaved] = useState(false);
  const cur = p.models.find((m) => m.key === value);

  async function change(v: string) {
    setValue(v);
    setSaved(false);
    const r = await fetch("/api/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ task: p.task, model: v }) });
    if (r.ok) setSaved(true);
  }

  const groups = Array.from(new Set(p.models.map((m) => m.providerName)));
  return (
    <div>
      <label htmlFor={`m-${p.task}`}>{p.label}</label>
      <select id={`m-${p.task}`} value={value} onChange={(e) => change(e.target.value)}>
        {groups.map((g) => (
          <optgroup key={g} label={g}>
            {p.models
              .filter((m) => m.providerName === g)
              .map((m) => (
                <option key={m.key} value={m.key}>
                  {m.model} ({m.note ? `${COST[m.cost]}, ${m.note}` : COST[m.cost]})
                </option>
              ))}
          </optgroup>
        ))}
      </select>
      <p className="muted small" style={{ marginTop: 6 }}>
        {p.hint} {cur && <span className={`tag ${cur.cost === "paid" ? "paid" : cur.cost === "local" ? "local" : "free"}`}>{COST[cur.cost]}</span>} {saved && "Saved."}
      </p>
    </div>
  );
}
