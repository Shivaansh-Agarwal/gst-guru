// Every provider is opt-in: it only shows up when its key (or flag, for local ones) is set in .env.
// Model ids are defaults you can override per provider with <PREFIX>_MODELS=comma,separated,ids.
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
};

const env = (k: string) => process.env[k]?.trim() || "";

export const PROVIDERS: ProviderDef[] = [
  {
    id: "ollama",
    name: "Ollama (local models)",
    cost: "local",
    costNote: "Runs on your machine. Free, private, works offline. Quality depends on the model size your laptop can handle.",
    envKey: "OLLAMA_ENABLED",
    modelsEnv: "OLLAMA_MODELS",
    defaultModels: ["qwen3:8b", "deepseek-r1:8b", "gemma3:12b", "llama3.1:8b"],
    localOnly: true,
    signup: "https://ollama.com/download",
    make: () => {
      const p = createOpenAICompatible({ name: "ollama", baseURL: env("OLLAMA_BASE_URL") || "http://localhost:11434/v1" });
      return (m) => p.chatModel(m);
    },
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
    costNote: "LM Studio, vLLM, llama.cpp server or any other OpenAI-compatible endpoint.",
    envKey: "CUSTOM_BASE_URL",
    modelsEnv: "CUSTOM_MODELS",
    defaultModels: [],
    localOnly: true,
    signup: "https://lmstudio.ai/",
    make: () => {
      const p = createOpenAICompatible({ name: "custom", baseURL: env("CUSTOM_BASE_URL"), apiKey: env("CUSTOM_API_KEY") || undefined });
      return (m) => p.chatModel(m);
    },
  },
];

export type ModelOption = { key: string; providerId: string; providerName: string; model: string; cost: Cost; localOnly: boolean };

function isEnabled(p: ProviderDef) {
  const v = env(p.envKey);
  if (!v) return false;
  if (p.envKey === "OLLAMA_ENABLED") return v === "true" || v === "1";
  return true;
}

export function providerStatus() {
  return PROVIDERS.map((p) => ({
    id: p.id,
    name: p.name,
    cost: p.cost,
    costNote: p.costNote,
    envKey: p.envKey,
    modelsEnv: p.modelsEnv,
    signup: p.signup,
    localOnly: !!p.localOnly,
    enabled: isEnabled(p),
    models: modelsFor(p),
  }));
}

function modelsFor(p: ProviderDef) {
  const custom = env(p.modelsEnv);
  return custom ? custom.split(",").map((s) => s.trim()).filter(Boolean) : p.defaultModels;
}

export function availableModels(): ModelOption[] {
  return PROVIDERS.filter(isEnabled).flatMap((p) =>
    modelsFor(p).map((m) => ({
      key: `${p.id}:${m}`,
      providerId: p.id,
      providerName: p.name,
      model: m,
      cost: p.id === "openrouter" && !m.endsWith(":free") ? ("paid" as Cost) : p.cost,
      localOnly: !!p.localOnly,
    }))
  );
}

export function resolveModel(key: string): LanguageModel {
  const idx = key.indexOf(":");
  const providerId = key.slice(0, idx);
  const modelId = key.slice(idx + 1);
  const p = PROVIDERS.find((x) => x.id === providerId);
  if (!p || !isEnabled(p)) throw new Error(`Provider "${providerId}" is not enabled. Add ${p?.envKey ?? "its key"} to your .env file.`);
  return p.make()(modelId);
}
