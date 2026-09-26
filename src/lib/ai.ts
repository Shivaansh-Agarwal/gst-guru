import { generateText } from "ai";
import { z } from "zod";
import { availableModels, resolveModel } from "./providers";
import { getSetting } from "./db";

export const TASKS = {
  generate: { label: "Writing new questions", hint: "Runs in the background. A free or local model is usually fine." },
  grade: { label: "Grading your written answers", hint: "Accuracy matters here. Use the strongest model you have." },
  chat: { label: "Deep dives and explanations", hint: "Long answers. A strong model gives noticeably better teaching." },
} as const;
export type Task = keyof typeof TASKS;

export function modelKeyFor(task: Task): string | null {
  const models = availableModels();
  if (!models.length) return null;
  const saved = getSetting(`model:${task}`);
  if (saved && models.some((m) => m.key === saved)) return saved;
  // Default: prefer something free, then anything.
  return (models.find((m) => m.cost !== "paid") ?? models[0]).key;
}

export function modelFor(task: Task) {
  const key = modelKeyFor(task);
  if (!key) throw new NoModelError();
  return { key, model: resolveModel(key) };
}

export class NoModelError extends Error {
  constructor() {
    super("No AI model is set up yet. Add a provider key to .env (see the Setup page) and restart the app.");
  }
}

/** Pull the first JSON value out of a model reply. Small models love wrapping JSON in prose or code fences. */
export function extractJSON(text: string): unknown {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/```(?:json)?/g, "").trim();
  const start = cleaned.search(/[[{]/);
  if (start < 0) throw new Error("No JSON found in model reply");
  const open = cleaned[start];
  const close = open === "[" ? "]" : "}";
  const end = cleaned.lastIndexOf(close);
  return JSON.parse(cleaned.slice(start, end + 1));
}

/** Ask for JSON, validate it with zod, and retry once with the validation error if it fails. */
export async function generateJSON<T>(opts: { task: Task; instructions: string; prompt: string; schema: z.ZodType<T> }) {
  const { key, model } = modelFor(opts.task);
  let prompt = opts.prompt;
  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const { text } = await generateText({ model, instructions: opts.instructions, prompt, temperature: 0.4 });
    try {
      const data = opts.schema.parse(extractJSON(text));
      return { data, modelKey: key };
    } catch (e) {
      lastErr = e instanceof Error ? e.message.slice(0, 400) : String(e);
      prompt = `${opts.prompt}\n\nYour previous reply could not be used: ${lastErr}\nReply again with ONLY valid JSON matching the format.`;
    }
  }
  throw new Error(`The model (${key}) did not return usable JSON after two tries. ${lastErr}`);
}
