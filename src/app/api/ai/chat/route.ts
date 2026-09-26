import { streamText } from "ai";
import { z } from "zod";
import { modelFor, NoModelError } from "@/lib/ai";
import { availableModels, resolveModel } from "@/lib/providers";
import { setSetting } from "@/lib/db";
import { loadContent, topicById } from "@/lib/content";
import { factSheet, TUTOR_BASE } from "@/lib/prompts";

const Body = z.object({
  topic: z.string().optional(),
  modelKey: z.string().optional(),
  context: z.string().max(12000).optional(),
  question: z
    .object({
      q: z.string(),
      options: z.array(z.string()).optional(),
      answer: z.number().optional(),
      model: z.string().optional(),
      exp: z.string(),
      answered: z.boolean(),
    })
    .optional(),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).min(1).max(40),
});

const DEEP_DIVE = `${TUTOR_BASE}

You are GST GPT, a tutor the learner is chatting with. Answer what they ask directly first. When they want to learn a concept, teach in layers: what it is and why the law has it, how it works step by step, then edge cases and common mistakes, and how it plays out in practice for a CA and on the GST portal.
Keep each reply focused and under about 350 words unless asked for more. End most replies with one short question that checks understanding, and when the learner answers, tell them honestly whether they were right.
Use Markdown sparingly: short paragraphs, a small table when comparing things.`;

function questionHelp(q: NonNullable<z.infer<typeof Body>["question"]>) {
  const opts = q.options?.length ? `\nOptions:\n${q.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join("\n")}` : "";
  const key =
    q.options && q.answer !== undefined ? `\nCorrect option: ${String.fromCharCode(65 + q.answer)}` : q.model ? `\nModel answer: ${q.model}` : "";
  const rule = q.answered
    ? "The learner has already answered. You can discuss the correct answer freely."
    : "The learner has NOT answered yet. Do not reveal, confirm or strongly hint which option is correct. Explain terms, background and how to think about it, and let them decide.";
  return `${TUTOR_BASE}

The learner is looking at this quiz question and wants help understanding it. Connect things to how a CA would actually handle the situation when that helps.
Question: ${q.q}${opts}${key}
Explanation in the question bank: ${q.exp}

${rule}
Keep replies short (under about 200 words), plain and concrete. Define any jargon you use.`;
}

export async function POST(req: Request) {
  const b = Body.parse(await req.json());
  let model;
  let key;
  try {
    // A model picked in GST GPT wins, and becomes the default for chat next time.
    if (b.modelKey && (await availableModels()).some((m) => m.key === b.modelKey)) {
      key = b.modelKey;
      model = resolveModel(key);
      setSetting("model:chat", key);
    } else {
      ({ model, key } = await modelFor("chat"));
    }
  } catch (e) {
    return new Response(e instanceof Error ? e.message : String(e), { status: e instanceof NoModelError ? 412 : 500 });
  }
  let instructions: string;
  if (b.question) {
    instructions = questionHelp(b.question);
  } else {
    const topic = b.topic ? topicById(b.topic) : undefined;
    const grounding = topic ? `\n\n${factSheet(topic, loadContent().questions)}` : "";
    const ctx = b.context ? `\n\nThe learner described what they want to understand, or pasted this material:\n"""${b.context}"""` : "";
    instructions = DEEP_DIVE + grounding + ctx;
  }
  const result = streamText({ model, instructions, messages: b.messages, temperature: 0.5 });
  return result.toTextStreamResponse({ headers: { "x-model": key } });
}
