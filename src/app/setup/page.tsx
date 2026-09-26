import { providerStatus } from "@/lib/providers";

export const dynamic = "force-dynamic";

const COST: Record<string, string> = { "free-tier": "Free tier", local: "Free, local", paid: "Paid", free: "Free" };

export default function Setup() {
  const providers = providerStatus();
  const on = providers.filter((p) => p.enabled);
  const claude = providers.find((p) => p.id === "anthropic")!;
  return (
    <>
      <h1 style={{ marginBottom: 12 }}>Connect AI</h1>
      <p style={{ maxWidth: "62ch" }}>
        The question bank works with no setup at all. Connecting a model adds grading for written answers, new questions from your notes, and deep-dive sessions. Every provider is off until you add its key to <code>.env.local</code> in the project folder and restart the app.
      </p>
      <p className="muted" style={{ marginTop: 12 }}>
        {on.length ? `Connected: ${on.map((p) => p.name).join(", ")}.` : "Nothing connected yet."}
      </p>

      <section className="section">
        <h2>Quickest free start</h2>
        <ol className="steps">
          <li>
            <b>No account, fully offline:</b> install <a href="https://ollama.com/download">Ollama</a>, run <code>ollama pull qwen3:8b</code>, then add <code>OLLAMA_ENABLED=true</code> to <code>.env.local</code>. An 8B model needs about 8 GB of free RAM. It's fine for writing questions, weaker at grading.
          </li>
          <li>
            <b>Better quality, still free:</b> get a key from <a href="https://aistudio.google.com/apikey">Google AI Studio</a> and add <code>GOOGLE_GENERATIVE_AI_API_KEY=...</code>. The free tier covers Flash models with daily limits. Google may use free-tier prompts to improve its models, so don't paste anything confidential.
          </li>
        </ol>
      </section>

      <section className="section" id="claude">
        <h2>Setting up Claude (paid)</h2>
        <ol className="steps">
          <li>
            Go to <a href={claude.signup}>the Claude Console</a> and sign in or create an account. This is separate from a Claude.ai or Claude Code subscription.
          </li>
          <li>Add a payment method under Billing and, while you're there, set a monthly spend limit. A few dollars a month covers daily use of this app.</li>
          <li>Under API keys, create a key. Copy it now, since it's shown once.</li>
          <li>
            Add it to <code>.env.local</code>:
            <pre className="env">{`ANTHROPIC_API_KEY=sk-ant-...
# optional, defaults shown
ANTHROPIC_MODELS=claude-sonnet-5,claude-haiku-4-5`}</pre>
          </li>
          <li>Restart the app, open Models, and pick Claude for grading and deep dives. Haiku is cheaper and fine for writing questions.</li>
        </ol>
        <p className="note" style={{ marginTop: 16 }}>
          A Claude.ai or Claude Code subscription login can't power this app. Anthropic only allows subscription sign-in inside its own apps, so third-party tools need a Console API key.
        </p>
      </section>

      <section className="section">
        <h2>All providers</h2>
        {providers.map((p) => (
          <div key={p.id} className="provider">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h3>{p.name}</h3>
              <div className="row" style={{ gap: 8 }}>
                <span className={`tag ${p.cost === "paid" ? "paid" : p.cost === "local" ? "local" : "free"}`}>{COST[p.cost]}</span>
                <span className="tag">{p.enabled ? "Connected" : "Off"}</span>
              </div>
            </div>
            <p className="muted">{p.costNote}</p>
            <pre className="env">{`${p.envKey}=${p.envKey === "OLLAMA_ENABLED" ? "true" : p.envKey === "CUSTOM_BASE_URL" ? "http://localhost:1234/v1" : "your-key"}
${p.modelsEnv}=${p.models.join(",") || "model-id"}`}</pre>
            <p className="small">
              <a href={p.signup}>Get {p.localOnly ? "it" : "a key"}</a>
              {p.localOnly && <span className="muted"> Works when you run the app on your own machine, not on a hosted copy.</span>}
            </p>
          </div>
        ))}
      </section>
    </>
  );
}
