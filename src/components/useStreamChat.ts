"use client";
import { useRef, useState } from "react";

export type Msg = { role: "user" | "assistant"; content: string };

/** Streams replies from /api/ai/chat. `extra` is merged into every request body. */
export function useStreamChat(extra: () => Record<string, unknown>) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [model, setModel] = useState("");
  const abort = useRef<AbortController | null>(null);

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    const history: Msg[] = [...msgs, { role: "user", content: t }];
    setMsgs([...history, { role: "assistant", content: "" }]);
    setBusy(true);
    setErr("");
    abort.current = new AbortController();
    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...extra(), messages: history }),
        signal: abort.current.signal,
      });
      if (!r.ok || !r.body) throw new Error((await r.text()) || `Request failed (${r.status})`);
      setModel(r.headers.get("x-model") ?? "");
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        // Reasoning models (DeepSeek R1, Qwen3) stream <think> blocks; hide them.
        const shown = acc.replace(/<think>[\s\S]*?(<\/think>|$)/g, "").trimStart();
        setMsgs([...history, { role: "assistant", content: shown }]);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setErr(e instanceof Error ? e.message : String(e));
      setMsgs(history);
    } finally {
      setBusy(false);
    }
  }

  return {
    msgs,
    busy,
    err,
    model,
    send,
    stop: () => abort.current?.abort(),
    reset: () => {
      setMsgs([]);
      setErr("");
    },
  };
}

export function renderMarkdown(md: string, parse: (s: string) => string) {
  return parse(md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
}
