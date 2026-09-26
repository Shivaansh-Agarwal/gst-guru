import Link from "next/link";
import { availableModels, providerStatus } from "@/lib/providers";
import { modelKeyFor, TASKS, type Task } from "@/lib/ai";
import ModelPicker from "@/components/ModelPicker";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Settings() {
  const models = await availableModels();
  const local = (await providerStatus()).filter((p) => p.detects);
  const current = Object.fromEntries(await Promise.all((Object.keys(TASKS) as Task[]).map(async (t) => [t, (await modelKeyFor(t)) ?? ""])));
  const flags = db().prepare("SELECT question_id, note, created_at FROM flags ORDER BY created_at DESC LIMIT 50").all() as {
    question_id: string;
    note: string | null;
    created_at: number;
  }[];
  return (
    <>
      <p className="muted small crumbs">
        <Link href="/gpt">GST GPT</Link>
      </p>
      <h1 style={{ marginBottom: 12 }}>Model settings</h1>
      <p className="small" style={{ maxWidth: "60ch", marginBottom: 14 }}>
        <b>On this machine:</b>{" "}
        {local
          .map((p) => (p.running ? `${p.name}, ${p.models.length} ${p.models.length === 1 ? "model" : "models"}` : `${p.name} not running`))
          .join("; ")}
        . Start or stop a local app and reload this page to update the list.
      </p>
      <p className="muted" style={{ maxWidth: "60ch", marginBottom: 30 }}>
        Pick a model for each job. Local models from Ollama and LM Studio appear on their own; hosted providers appear once their key is in <code>.env.local</code>. Put your strongest model on grading, since that's where a wrong answer teaches you the wrong thing.
      </p>
      {models.length === 0 ? (
        <p>
          Nothing connected yet. The <Link href="/setup">Connect AI page</Link> walks through free and paid options.
        </p>
      ) : (
        <div className="stack" style={{ gap: 26, maxWidth: 560 }}>
          {(Object.keys(TASKS) as Task[]).map((t) => (
            <ModelPicker key={t} task={t} label={TASKS[t].label} hint={TASKS[t].hint} models={models} current={current[t]} />
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
