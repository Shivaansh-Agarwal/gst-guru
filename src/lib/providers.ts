// Hosted providers are opt-in: they only show up when their key is set in .env.
// Local servers (Ollama, LM Studio) are detected: if one is running on this machine, the models
// it has installed show up on their own. Set OLLAMA_ENABLED=false or LMSTUDIO_ENABLED=false to hide one.
// Model ids are defaults you can override per provider with <PREFIX>_MODELS=comma,separated,ids;
// for detected providers that list narrows down what's installed.
import type { LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createXai } from "@ai-sdk/xai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export type Cost = "free" | "free-tier" | "paid" | "local";

export type ProviderDef = {
  id: string;
  name: string;
  cost: Cost;
  costNote: string;
  envKey: string; // what enables it
  modelsEnv: string;
  defaultModels: string[];
  localOnly?: boolean;
  signup: string;
  make: () => (modelId: string) => LanguageModel;
  /** Local servers: list what's installed, or null when the server isn't running. */
  detect?: () => Promise<DetectedModel[] | null>;
};

export type DetectedModel = { id: string; note?: string };

const env = (k: string) => process.env[k]?.trim() || "";

const ollamaBase = () => env("OLLAMA_BASE_URL") || "http://localhost:11434/v1";
const lmstudioBase = () => env("LMSTUDIO_BASE_URL") || "http://localhost:1234/v1";
const isEmbedding = (id: string) => /embed/i.test(id);

async function getJSON(url: string): Promise<unknown | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(1500), cache: "no-store" });
    return r.ok ? await r.json() : null;
  } catch {
    return null; // not running
  }
}

async function detectOllama(): Promise<DetectedModel[] | null> {
  const d = (await getJSON(`${new URL(ollamaBase()).origin}/api/tags`)) as {
    models?: { name: string; details?: { parameter_size?: string } }[];
  } | null;
  if (!d?.models) return null;
  return d.models.filter((m) => !isEmbedding(m.name)).map((m) => ({ id: m.name, note: m.details?.parameter_size }));
}

async function detectLmStudio(): Promise<DetectedModel[] | null> {
  // LM Studio's own API says which models are chat models and which are loaded; fall back to the OpenAI list.
  const rich = (await getJSON(`${new URL(lmstudioBase()).origin}/api/v0/models`)) as {
    data?: { id: string; type?: string; state?: string }[];
  } | null;
  if (rich?.data)
    return rich.data
      .filter((m) => (m.type ? m.type === "llm" || m.type === "vlm" : !isEmbedding(m.id)))
      .map((m) => ({ id: m.id, note: m.state === "loaded" ? "loaded" : "loads on first use" }));
  const plain = (await getJSON(`${lmstudioBase()}/models`)) as { data?: { id: string }[] } | null;
  return plain?.data ? plain.data.filter((m) => !isEmbedding(m.id)).map((m) => ({ id: m.id })) : null;
}

// Detection runs on page loads, so keep answers for a few seconds instead of asking on every call.
const DETECT_TTL = 10_000;
const detectCache: Map<string, { at: number; value: Promise<DetectedModel[] | null> }> =
  ((globalThis as { __gstDetect?: Map<string, { at: number; value: Promise<DetectedModel[] | null> }> }).__gstDetect ??= new Map());

function detected(p: ProviderDef): Promise<DetectedModel[] | null> {
  const hit = detectCache.get(p.id);
  if (hit && Date.now() - hit.at < DETECT_TTL) return hit.value;
  const value = p.detect!();
  detectCache.set(p.id, { at: Date.now(), value });
  return value;
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: "ollama",
    name: "Ollama",
    cost: "local",
    costNote: "Runs on your machine. Free, private, works offline. Quality depends on the model size your laptop can handle. Found automatically while Ollama is running.",
    envKey: "OLLAMA_ENABLED",
    modelsEnv: "OLLAMA_MODELS",
    defaultModels: [],
    localOnly: true,
    signup: "https://ollama.com/download",
    make: () => {
      const p = createOpenAICompatible({ name: "ollama", baseURL: ollamaBase() });
      return (m) => p.chatModel(m);
    },
    detect: detectOllama,
  },
  {
    id: "lmstudio",
    name: "LM Studio",
    cost: "local",
    costNote: "Runs on your machine, with a model browser and good Apple Silicon support. Found automatically while LM Studio's local server is on (Developer tab, Start Server).",
    envKey: "LMSTUDIO_ENABLED",
    modelsEnv: "LMSTUDIO_MODELS",
    defaultModels: [],
    localOnly: true,
    signup: "https://lmstudio.ai/",
    make: () => {
      const p = createOpenAICompatible({ name: "lmstudio", baseURL: lmstudioBase() });
      return (m) => p.chatModel(m);
    },
    detect: detectLmStudio,
  },
  {
    id: "gemini",
    name: "Google Gemini",
    cost: "free-tier",
    costNote: "AI Studio has a free tier for Flash models with daily limits. Free-tier prompts may be used by Google to improve models.",
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    modelsEnv: "GEMINI_MODELS",
    defaultModels: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
    signup: "https://aistudio.google.com/apikey",
    make: () => {
      const p = createGoogleGenerativeAI({ apiKey: env("GOOGLE_GENERATIVE_AI_API_KEY") });
      return (m) => p(m);
    },
  },
  {
    id: "groq",
    name: "Groq",
    cost: "free-tier",
    costNote: "Fast hosted open models (Llama, Qwen and others) with a rate-limited free tier.",
    envKey: "GROQ_API_KEY",
    modelsEnv: "GROQ_MODELS",
    defaultModels: ["llama-3.3-70b-versatile", "qwen/qwen3-32b"],
    signup: "https://console.groq.com/keys",
    make: () => {
      const p = createGroq({ apiKey: env("GROQ_API_KEY") });
      return (m) => p(m);
    },
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    cost: "free-tier",
    costNote: "One key, hundreds of models. Model ids ending in :free cost nothing but are rate limited. Set OPENROUTER_MODELS to the ones you want.",
    envKey: "OPENROUTER_API_KEY",
    modelsEnv: "OPENROUTER_MODELS",
    defaultModels: ["meta-llama/llama-3.3-70b-instruct:free", "deepseek/deepseek-chat-v3.1:free"],
    signup: "https://openrouter.ai/keys",
    make: () => {
      const p = createOpenAICompatible({
        name: "openrouter",
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: env("OPENROUTER_API_KEY"),
        headers: { "X-Title": "GST Guru" },
      });
      return (m) => p.chatModel(m);
    },
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    cost: "paid",
    costNote: "Pay as you go, among the cheapest paid APIs. deepseek-chat is general, deepseek-reasoner thinks longer.",
    envKey: "DEEPSEEK_API_KEY",
    modelsEnv: "DEEPSEEK_MODELS",
    defaultModels: ["deepseek-chat", "deepseek-reasoner"],
    signup: "https://platform.deepseek.com/api_keys",
    make: () => {
      const p = createDeepSeek({ apiKey: env("DEEPSEEK_API_KEY") });
      return (m) => p(m);
    },
  },
  {
    id: "qwen",
    name: "Qwen (Alibaba Cloud Model Studio)",
    cost: "paid",
    costNote: "Pay as you go; new accounts usually get a free trial quota. Set QWEN_BASE_URL if your account is in a different region.",
    envKey: "DASHSCOPE_API_KEY",
    modelsEnv: "QWEN_MODELS",
    defaultModels: ["qwen-plus", "qwen-turbo"],
    signup: "https://modelstudio.console.alibabacloud.com/",
    make: () => {
      const p = createOpenAICompatible({
        name: "qwen",
        baseURL: env("QWEN_BASE_URL") || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        apiKey: env("DASHSCOPE_API_KEY"),
      });
      return (m) => p.chatModel(m);
    },
  },
  {
    id: "xai",
    name: "xAI Grok",
    cost: "paid",
    costNote: "Pay as you go.",
    envKey: "XAI_API_KEY",
    modelsEnv: "XAI_MODELS",
    defaultModels: ["grok-3-mini"],
    signup: "https://console.x.ai/",
    make: () => {
      const p = createXai({ apiKey: env("XAI_API_KEY") });
      return (m) => p(m);
    },
  },
  {
    id: "openai",
    name: "OpenAI",
    cost: "paid",
    costNote: "Pay as you go.",
    envKey: "OPENAI_API_KEY",
    modelsEnv: "OPENAI_MODELS",
    defaultModels: ["gpt-5-mini"],
    signup: "https://platform.openai.com/api-keys",
    make: () => {
      const p = createOpenAI({ apiKey: env("OPENAI_API_KEY") });
      return (m) => p(m);
    },
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    cost: "paid",
    costNote: "Pay as you go with a Claude Console API key. A Claude.ai or Claude Code subscription login cannot be used here.",
    envKey: "ANTHROPIC_API_KEY",
    modelsEnv: "ANTHROPIC_MODELS",
    defaultModels: ["claude-sonnet-5", "claude-haiku-4-5"],
    signup: "https://platform.claude.com/",
    make: () => {
      const p = createAnthropic({ apiKey: env("ANTHROPIC_API_KEY") });
      return (m) => p(m);
    },
  },
  {
    id: "custom",
    name: "Custom OpenAI-compatible server",
    cost: "local",
    costNote: "vLLM, llama.cpp server or any other OpenAI-compatible endpoint. Set CUSTOM_MODELS to the model ids it serves.",
    envKey: "CUSTOM_BASE_URL",
    modelsEnv: "CUSTOM_MODELS",
    defaultModels: [],
    localOnly: true,
    signup: "https://github.com/ggml-org/llama.cpp",
    make: () => {
      const p = createOpenAICompatible({ name: "custom", baseURL: env("CUSTOM_BASE_URL"), apiKey: env("CUSTOM_API_KEY") || undefined });
      return (m) => p.chatModel(m);
    },
  },
];

export type ModelOption = {
  key: string;
  providerId: string;
  providerName: string;
  model: string;
  cost: Cost;
  localOnly: boolean;
  note?: string;
};

const listFromEnv = (k: string) =>
  env(k)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** Whether the provider is allowed to show up at all. Detected providers are on unless switched off. */
function isAllowed(p: ProviderDef) {
  const v = env(p.envKey);
  if (p.detect) return v !== "false" && v !== "0";
  return !!v;
}

async function modelsFor(p: ProviderDef): Promise<DetectedModel[]> {
  if (!isAllowed(p)) return [];
  const only = listFromEnv(p.modelsEnv);
  if (p.detect) {
    const found = (await detected(p)) ?? [];
    return only.length ? found.filter((m) => only.includes(m.id)) : found;
  }
  return (only.length ? only : p.defaultModels).map((id) => ({ id }));
}

export async function providerStatus() {
  return Promise.all(
    PROVIDERS.map(async (p) => {
      const models = await modelsFor(p);
      const running = p.detect && isAllowed(p) ? (await detected(p)) !== null : null;
      return {
        id: p.id,
        name: p.name,
        cost: p.cost,
        costNote: p.costNote,
        envKey: p.envKey,
        modelsEnv: p.modelsEnv,
        signup: p.signup,
        localOnly: !!p.localOnly,
        detects: !!p.detect,
        running,
        enabled: models.length > 0,
        models: models.map((m) => m.id),
      };
    })
  );
}

export async function availableModels(): Promise<ModelOption[]> {
  const lists = await Promise.all(PROVIDERS.map(async (p) => ({ p, models: await modelsFor(p) })));
  return lists.flatMap(({ p, models }) =>
    models.map((m) => ({
      key: `${p.id}:${m.id}`,
      providerId: p.id,
      providerName: p.name,
      model: m.id,
      cost: p.id === "openrouter" && !m.id.endsWith(":free") ? ("paid" as Cost) : p.cost,
      localOnly: !!p.localOnly,
      note: m.note,
    }))
  );
}

export function resolveModel(key: string): LanguageModel {
  const idx = key.indexOf(":");
  const providerId = key.slice(0, idx);
  const modelId = key.slice(idx + 1);
  const p = PROVIDERS.find((x) => x.id === providerId);
  if (!p || !isAllowed(p)) throw new Error(`Provider "${providerId}" is not enabled. Add ${p?.envKey ?? "its key"} to your .env file.`);
  return p.make()(modelId);
}
