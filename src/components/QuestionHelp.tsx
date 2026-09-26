"use client";
import { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import { renderMarkdown, useStreamChat } from "./useStreamChat";

const md = (s: string) => renderMarkdown(s, (x) => marked.parse(x, { async: false }) as string);

type Q = { q: string; options?: string[]; answer?: number; model?: string; exp: string };

export default function QuestionHelp(props: { question: Q; answered: boolean; seed?: string; onSeedUsed?: () => void }) {
  const [input, setInput] = useState("");
  const answeredRef = useRef(props.answered);
  answeredRef.current = props.answered;
  const chat = useStreamChat(() => ({
    question: { q: props.question.q, options: props.question.options, answer: props.question.answer, model: props.question.model, exp: props.question.exp, answered: answeredRef.current },
  }));

  // A term tapped in the question arrives as a seed prompt.
  useEffect(() => {
    if (props.seed) {
      chat.send(props.seed);
      props.onSeedUsed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.seed]);

  const quick = props.answered
    ? ["Why is that the answer?", "How would a CA handle this in practice?", "Give me a trickier variation"]
    : ["Explain the jargon in this question", "What's the background I need?", "What should I be thinking about here?"];

  function send(t: string) {
    chat.send(t);
    setInput("");
  }

  return (
    <div className="help">
      {!props.answered && chat.msgs.length === 0 && (
        <p className="muted small">It'll explain the context without giving away the answer.</p>
      )}
      <div className="chips">
        {quick.map((q) => (
          <button key={q} className="chip" onClick={() => send(q)} disabled={chat.busy}>
            {q}
          </button>
        ))}
      </div>
      {chat.msgs.length > 0 && (
        <div className="chat" aria-live="polite" style={{ margin: "16px 0" }}>
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
      )}
      {chat.err && <p className="error">{chat.err}</p>}
      <div className="row" style={{ marginTop: 12, flexWrap: "nowrap" }}>
        <input
          type="text"
          aria-label="Ask about this question"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Ask anything about this question"
        />
        {chat.busy ? (
          <button className="btn ghost small" onClick={chat.stop}>
            Stop
          </button>
        ) : (
          <button className="btn small" onClick={() => send(input)} disabled={!input.trim()}>
            Ask
          </button>
        )}
      </div>
      {chat.model && <p className="muted small" style={{ marginTop: 8 }}>Using {chat.model}</p>}
    </div>
  );
}
