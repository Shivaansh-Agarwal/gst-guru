"use client";
import { Fragment, useMemo } from "react";

export type Gloss = { term: string; aliases: string[]; def: string };

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Acronym-like forms (GSTR-2B, ITC, POS) must match case exactly; plain words match any case.
const strict = (form: string) => /^[A-Z0-9()\-]+$/.test(form.replace(/\s/g, ""));

export function useGlossaryMatcher(glossary: Gloss[]) {
  return useMemo(() => {
    const forms = glossary.flatMap((g) => [g.term, ...g.aliases].map((f) => ({ form: f, entry: g })));
    forms.sort((a, b) => b.form.length - a.form.length);
    const byLower = new Map(forms.map((f) => [f.form.toLowerCase(), f]));
    const re = forms.length ? new RegExp(`(?<![\\w-])(${forms.map((f) => esc(f.form)).join("|")})(?![\\w])`, "gi") : null;
    return { re, byLower };
  }, [glossary]);
}

/** Renders text with known GST terms as tappable buttons (first occurrence of each term only). */
export function TermText(props: { text: string; matcher: ReturnType<typeof useGlossaryMatcher>; onPick: (g: Gloss) => void; seen?: Set<string> }) {
  const { re, byLower } = props.matcher;
  if (!re) return <>{props.text}</>;
  const seen = props.seen ?? new Set<string>();
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of props.text.matchAll(re)) {
    const hit = byLower.get(m[0].toLowerCase());
    if (!hit || (strict(hit.form) && m[0] !== hit.form) || seen.has(hit.entry.term)) continue;
    seen.add(hit.entry.term);
    parts.push(<Fragment key={`t${last}`}>{props.text.slice(last, m.index)}</Fragment>);
    parts.push(
      <button key={`b${m.index}`} type="button" className="term" onClick={() => props.onPick(hit.entry)} title={hit.entry.def}>
        {m[0]}
      </button>
    );
    last = (m.index ?? 0) + m[0].length;
  }
  parts.push(<Fragment key="end">{props.text.slice(last)}</Fragment>);
  return <>{parts}</>;
}
