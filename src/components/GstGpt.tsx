"use client";
import { useState } from "react";
import Link from "next/link";
import { marked } from "marked";
import { renderMarkdown, useStreamChat } from "./useStreamChat";

const md = (s: string) => renderMarkdown(s, (x) => marked.parse(x, { async: false }) as string);

type TopicGroup = { label: string; topics: { id: string; name: string }[] };
type ModelChoice = { key: string; label: string; group: string };

export default function GstGpt(props: { models: ModelChoice[]; initialModel: string; groups: TopicGroup[]; initialTopic?: string; seed?: string }) {
  const [modelKey, setModelKey] = useState(props.initialModel);
  const [topic, setTopic] = useState(props.initialTopic ?? "");
  const [input, setInput] = useState(props.seed ?? "");
  const chat = useStreamChat(() => ({ topic: topic || undefined, modelKey }));
  const providers = Array.from(new Set(props.models.map((m) => m.group)));

  function send() {
    chat.send(input);
    setInput("");
  }

  return (
    <div>
      <div className="gpt-bar">
        <div>
          <label htmlFor="gpt-model">Model</label>
          <select id="gpt-model" value={modelKey} onChange={(e) => setModelKey(e.target.value)}>
            {providers.map((g) => (
              <optgroup key={g} label={g}>
                {props.models
                  .filter((m) => m.group === g)
                  .map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="gpt-topic">Topic</label>
          <select id="gpt-topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="">Any topic</option>
            {props.groups.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>
      <p className="muted small gpt-links">
        <Link href="/settings">Model settings</Link>
        <Link href="/setup">Connect more models</Link>
      </p>

      <div className="chat" aria-live="polite">
        {chat.msgs.map((m, k) =>
          m.role === "user" ? (
            <div key={k} className="msg user">
              {m.content}
            </div>
          ) : (
            <div key={k} className="msg assistant prose" dangerouslySetInnerHTML={{ __html: m.content ? md(m.content) : "<p class='muted'>Thinking…</p>" }} />
          )
        )}
      </div>
      {chat.err && <p className="error" style={{ marginBottom: 12 }}>{chat.err}</p>}

      <div className="stack" style={{ maxWidth: 720 }}>
        <textarea
          aria-label="Your message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
          }}
          placeholder={chat.msgs.length ? "Reply, or ask something new." : "e.g. When can I use GSTR-1A instead of amending in the next GSTR-1?"}
          style={{ minHeight: 90 }}
        />
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="muted small">{chat.model ? `Using ${chat.model}` : "Ctrl or Cmd + Enter to send"}</span>
          <div className="row">
            {chat.msgs.length > 0 && !chat.busy && (
              <button className="btn ghost small" onClick={chat.reset}>
                New chat
              </button>
            )}
            {chat.busy ? (
              <button className="btn ghost" onClick={chat.stop}>
                Stop
              </button>
            ) : (
              <button className="btn" onClick={send} disabled={!input.trim()}>
                Send
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
