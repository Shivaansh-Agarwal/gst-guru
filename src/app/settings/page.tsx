import Link from "next/link";
import { availableModels } from "@/lib/providers";
import { modelKeyFor, TASKS, type Task } from "@/lib/ai";
import ModelPicker from "@/components/ModelPicker";
import ThemeSwitch from "@/components/ThemeSwitch";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function Settings() {
  const models = availableModels();
  const flags = db().prepare("SELECT question_id, note, created_at FROM flags ORDER BY created_at DESC LIMIT 50").all() as {
    question_id: string;
    note: string | null;
    created_at: number;
  }[];
  return (
    <>
      <h1 style={{ marginBottom: 30 }}>Settings</h1>
      <section style={{ marginBottom: 44 }}>
        <h2 style={{ marginBottom: 12 }}>Appearance</h2>
        <div style={{ maxWidth: 260 }}>
          <ThemeSwitch />
        </div>
        <p className="muted small" style={{ marginTop: 8 }}>
          Auto follows your device.
        </p>
      </section>
      <h2 style={{ marginBottom: 12 }}>Models</h2>
      <p className="muted" style={{ maxWidth: "60ch", marginBottom: 30 }}>
        Pick a model for each job. Only providers you've added to <code>.env</code> show up here. Put your strongest model on grading, since that's where a wrong answer teaches you the wrong thing.
      </p>
      {models.length === 0 ? (
        <p>
          Nothing connected yet. The <Link href="/setup">Connect AI page</Link> walks through free and paid options.
        </p>
      ) : (
        <div className="stack" style={{ gap: 26, maxWidth: 560 }}>
          {(Object.keys(TASKS) as Task[]).map((t) => (
            <ModelPicker key={t} task={t} label={TASKS[t].label} hint={TASKS[t].hint} models={models} current={modelKeyFor(t) ?? ""} />
          ))}
        </div>
      )}

      <section className="section">
        <h2>Questions you flagged</h2>
        {flags.length === 0 ? (
          <p className="muted">Nothing flagged. Use "This looks wrong" on any question you doubt, then check it against CBIC and fix it in content/questions.</p>
        ) : (
          <table className="ledger">
            <thead>
              <tr>
                <th>Question</th>
                <th>Note</th>
                <th className="hide-sm">When</th>
              </tr>
            </thead>
            <tbody>
              {flags.map((f) => (
                <tr key={f.created_at + f.question_id}>
                  <td className="num">{f.question_id}</td>
                  <td>{f.note || <span className="muted">No note</span>}</td>
                  <td className="muted small hide-sm">{new Date(f.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
