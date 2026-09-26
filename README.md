# GST Guru

A local-first app for learning Indian GST a few questions at a time. It's built for people who work on GST software, especially the ones whose users are Chartered Accountants, and who need to understand the domain the way a CA does: not just what a term means, but what happens when a client misses a deadline, how a filed return gets corrected, and how to answer a notice.

It works in two layers:

- **A curated question bank** (600+ questions across 21 topics) that runs fully offline. Around 30% are situations ("Your client…"), including a whole topic on how CAs run the monthly filing cycle, handle missed deadlines, fix mistakes and reply to notices. Every question has an explanation and, where possible, the section or rule it comes from.
- **Optional AI** from whichever provider you choose, for grading your written answers, writing new questions from your notes, deep-dive teaching sessions, and a chat box under every question for when you don't follow something.

Your progress lives in one SQLite file on your machine. There's no account and nothing leaves your computer unless you connect a hosted AI provider.

## Quick start

You need Node.js 20 or newer.

```bash
git clone https://github.com/<you>/gst-guru.git
cd gst-guru
npm install
cp .env.example .env.local   # optional, only needed for AI features
npm run dev
```

Open http://localhost:3000.

## What's in it

- **Today**: a daily set of 10 that mixes questions due for review (spaced repetition) with fresh ones from your weakest topics. At least four in every set are situations.
- **Topics**: practise a topic, one subtopic, or just its situations.
- **Question help**: underlined terms in a question (GSTR-2B, IMS, DRC-01B…) show a plain definition when tapped, offline. With a model connected, "Ask about this question" opens a chat that already knows the question. Before you answer, it explains the context without giving the answer away.
- **Deep dive**: a teaching session on a topic or on the module you're working on.
- **Stamps**: every answer gets a rubber stamp. It's the one bit of fun.

## Connecting AI

Every provider is off until you add its key to `.env.local` and restart. The in-app Setup page walks through each one.

| Provider | Cost | Key |
| --- | --- | --- |
| Ollama (local) | Free, offline | `OLLAMA_ENABLED=true` |
| Google Gemini | Free tier (Flash) | `GOOGLE_GENERATIVE_AI_API_KEY` |
| Groq | Free tier | `GROQ_API_KEY` |
| OpenRouter | `:free` models cost nothing | `OPENROUTER_API_KEY` |
| DeepSeek, Qwen, xAI, OpenAI | Paid | see `.env.example` |
| Anthropic Claude | Paid (Console API key) | `ANTHROPIC_API_KEY` |
| LM Studio or any OpenAI-compatible server | Local | `CUSTOM_BASE_URL` |

On the Models page you pick a model per job: writing questions, grading, and teaching. Put your strongest model on grading.

Claude needs a Console API key from platform.claude.com. A Claude.ai or Claude Code subscription can't be used by third-party apps.

Free tiers change often, and some (like Gemini's) may use your prompts for training. Don't paste anything confidential into a free hosted model.

## Comparing models

```bash
npm run eval -- --n 40
```

Runs every enabled model on the same 40 multiple-choice questions and prints accuracy and latency. Handy for picking a grader.

## Docker

```bash
docker compose up --build
```

Progress is kept in the `gst-data` volume. To use Ollama on the host from inside Docker, set `OLLAMA_BASE_URL=http://host.docker.internal:11434/v1`.

The image is a plain Node server, so it runs on any VPS, Fly.io, Railway, Render or a home server. For a hosted copy, put it behind something that adds a login (Cloudflare Access, Tailscale, or basic auth at the proxy), since the app itself has no accounts.

## The question bank

Questions live in `content/questions/<topic>.json`, one file per topic, and topics are defined in `content/topics.json`. Terms for tap-to-define are in `content/glossary.json`.

```json
{
  "id": "CA-012", "topic": "ca", "sub": "Missed deadlines", "diff": 2,
  "type": "mcq", "case": true,
  "q": "A client hasn't filed GSTR-3B for two consecutive months. What operational problem hits first?",
  "options": ["...", "..."], "answer": 1,
  "exp": "Rule 138E...", "ref": "CGST Rules, r.138E", "volatile": false
}
```

`type` is `mcq`, `tf` or `scenario` (free text with a `model` answer and key `points`). `case: true` marks a situational question. `volatile: true` marks anything that depends on rates, thresholds or dates that change by notification; the app shows a reminder to verify these.

Run `npm run validate` after editing. It checks the schema, IDs, subtopics and near-duplicates.

## Accuracy

The bank was written carefully against the CGST and IGST Acts, rules, and CBIC notifications and circulars up to mid-2026, but GST changes constantly. Treat it as a study aid, not professional advice. If something looks wrong, hit "This looks wrong" in the app; flagged questions are listed on the Models page so you can check and fix them. Pull requests with corrections are welcome.

## Stack

Next.js 15 (App Router) running as a plain Node server, better-sqlite3, the Vercel AI SDK for providers, and zod. No external services are required.
