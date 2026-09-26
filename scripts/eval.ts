// Runs each enabled model on a sample of multiple-choice questions and reports accuracy and speed.
// Useful for picking a model per task, and for a quick "which model knows GST best" comparison.
// Run: npm run eval -- --n 40 --models gemini:gemini-2.5-flash,ollama:qwen3:8b
import { generateText } from "ai";
import { loadContent } from "../src/lib/content";
import { availableModels, resolveModel } from "../src/lib/providers";
import { extractJSON } from "../src/lib/ai";

const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const n = Number(arg("n") ?? 30);
const only = arg("models")?.split(",");
const models = availableModels().filter((m) => !only || only.includes(m.key));
if (!models.length) {
  console.log("No models enabled. Add a provider key to .env.local first (see the Setup page).");
  process.exit(0);
}

// Same sample for every model, spread across topics.
const mcq = loadContent().questions.filter((q) => q.type !== "scenario");
const sample = mcq.filter((_, i) => i % Math.max(1, Math.floor(mcq.length / n)) === 0).slice(0, n);

const results: { model: string; correct: number; total: number; accuracy: string; avgMs: number; errors: number }[] = [];
for (const m of models) {
  let correct = 0, errs = 0, ms = 0;
  process.stdout.write(`${m.key} `);
  for (const q of sample) {
    const prompt = `Indian GST question. Reply with ONLY JSON {"answer": <0-based option index>}.\n\n${q.q}\n${q.options!.map((o, i) => `${i}. ${o}`).join("\n")}`;
    const t0 = Date.now();
    try {
      const { text } = await generateText({ model: resolveModel(m.key), prompt, temperature: 0 });
      const a = (extractJSON(text) as { answer: number }).answer;
      if (Number(a) === q.answer) correct++;
      process.stdout.write(Number(a) === q.answer ? "." : "x");
    } catch {
      errs++;
      process.stdout.write("!");
    }
    ms += Date.now() - t0;
  }
  process.stdout.write("\n");
  results.push({ model: m.key, correct, total: sample.length, accuracy: `${Math.round((correct / sample.length) * 100)}%`, avgMs: Math.round(ms / sample.length), errors: errs });
}
console.table(results);
console.log("Note: questions marked volatile depend on current notifications, so a 'wrong' answer there may be a stale bank entry. Check flagged items.");
