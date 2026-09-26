"use client";
import { useState } from "react";
import { marked } from "marked";
import { renderMarkdown, useStreamChat } from "./useStreamChat";

const md = (s: string) => renderMarkdown(s, (x) => marked.parse(x, { async: false }) as string);

export default function DeepDive(props: { topics: { id: string; name: string }[]; initialTopic?: string; seed?: string }) {
  const [topic, setTopic] = useState(props.initialTopic ?? "");
  const [context, setContext] = useState("");
  const [input, setInput] = useState(props.seed ?? "");
  const chat = useStreamChat(() => ({ topic: topic || undefined, context: context.trim() || undefined }));

  function send() {
    chat.send(input);
    setInput("");
  }

  return (
    <div>
      {chat.msgs.length === 0 && (
        <div className="stack" style={{ maxWidth: 640 }}>
          <div>
            <label htmlFor="topic">Topic</label>
            <select id="topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="">Any, or I'll describe it</option>
              {props.topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ctx">What you're working on (optional)</label>
            <textarea
              id="ctx"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Describe the module in your own words, e.g. 'the screen where CAs match purchase registers against GSTR-2B'. Leave out anything confidential."
            />
          </div>
        </div>
      )}

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
          placeholder={chat.msgs.length ? "Answer its question, or ask your own." : "e.g. How does a CA handle a DRC-01B intimation?"}
          style={{ minHeight: 90 }}
        />
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="muted small">{chat.model ? `Using ${chat.model}` : "Ctrl or Cmd + Enter to send"}</span>
          <div className="row">
            {chat.msgs.length > 0 && !chat.busy && (
              <button className="btn ghost small" onClick={chat.reset}>
                New session
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
