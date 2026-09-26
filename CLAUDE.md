# GST Guru: context for Claude Code

## What this is and who it's for

A local-first app for learning Indian GST, built by a frontend engineer (SDE-3) at a GST compliance SaaS company whose customers are mostly Chartered Accountants. The CTO runs regular GST domain evaluations, so the goal is real working knowledge: how a CA runs the monthly filing cycle, what happens when a deadline is missed, how filed returns get corrected, how notices are handled. Not just definitions.

It lives on the author's personal GitHub and must stay generic. Never add anything specific to the employer (internal APIs, product names, customer data, screenshots). Anyone should be able to clone it, add their own AI key and run it. It's also meant to be shown to the CTO, so quality and polish matter.

## Product principles

- The curated question bank is the core and must work fully offline with no AI configured.
- AI is optional and additive: grading free-text answers, generating new questions, deep dives, and the per-question help chat.
- Every AI provider is opt-in. A provider appears only when its key or flag is set in `.env.local`. Default to free or local models when nothing is chosen.
- Accuracy over volume. Facts that depend on notifications (rates, thresholds, due dates, new sections) are marked `volatile: true` and the UI tells the user to verify them. AI-written questions are always labelled as unreviewed.
- Scenario-first. At least 40% of every daily set is situational. New content should lean toward "Your client…" situations over "what does X mean".
- Single user per install, no login. SQLite everywhere. Hosting isn't decided; the app must stay platform independent (plain Node server plus Docker, nothing Vercel-specific).

## Stack

Next.js 15 App Router running as a Node server (`output: "standalone"`), React 19, TypeScript strict, better-sqlite3 (raw SQL, no ORM), zod 4, Vercel AI SDK `ai` v7 with `@ai-sdk/*` providers, `marked` for rendering chat Markdown (HTML is escaped first). Plain CSS in `src/app/globals.css`, no Tailwind. Fonts are self-hosted via @fontsource (Bricolage Grotesque for headings, Atkinson Hyperlegible for body).

AI SDK v7 notes: use `generateText({ model, instructions, prompt })` (`system` is deprecated) and `streamText(...).toTextStreamResponse()`. Structured output is done by asking for JSON, extracting it with `extractJSON` and validating with zod plus one retry (`generateJSON` in `src/lib/ai.ts`), because many small and local models have no JSON mode.

## Map of the code

- `src/lib/content.ts`: zod schemas for topics, questions and glossary; loads `content/`.
- `src/lib/db.ts`: SQLite in `DATA_DIR` (default `./data/gst.db`). Tables: attempts, reviews, ai_questions, flags, settings.
- `src/lib/srs.ts`: SM-2 style spaced repetition.
- `src/lib/progress.ts`: topic mastery, streak, daily set (due reviews plus weak topics, at least 40% situational), topic and scenario sets.
- `src/lib/providers.ts`: provider registry. Ollama, Gemini, Groq, OpenRouter, DeepSeek, Qwen (DashScope), xAI, OpenAI, Anthropic, custom OpenAI-compatible. Model ids overridable with `<PREFIX>_MODELS`.
- `src/lib/ai.ts`: tasks (generate, grade, chat), model choice per task stored in settings.
- `src/lib/prompts.ts`: tutor base prompt and grounding from the bank's explanations.
- `src/app/api/*`: session, answer, flag, settings, ai/generate, ai/grade, ai/chat (deep dive mode, or question-help mode when a `question` object is passed; in that mode it must not reveal the answer before the learner has answered).
- `src/components/QuizRunner.tsx`: the practice flow, rubber-stamp feedback, glossary terms, per-question help.
- `src/components/Terms.tsx`: tap-to-define glossary matching. Acronym forms match case exactly; longest match first; first occurrence per term only.
- `src/components/QuestionHelp.tsx`, `DeepDive.tsx`, `useStreamChat.ts`: streaming chat UI.
- `scripts/validate-bank.ts` (`npm run validate`) and `scripts/eval.ts` (`npm run eval -- --n 40 --models a:b,c:d`, compares models on the same MCQs).

## Content

- `content/topics.json`: 30 topics, each with an id, code (used in question ids), blurb, subtopics and an optional `group`. The `ca` topic ("At the CA's desk") covers monthly cycle, missed deadlines, fixing mistakes, notices, client management. Each major return (GSTR-1, 1A, 2B, 3B, 9, 9C, 6, 7 and ITC-04) has its own topic in the "Returns" group, and `returns` holds the rest (QRMP, other returns, late fees). Grouped topics are listed first on the Topics page, the home table and the deep dive picker.
- `content/questions/<topic>.json`: about 700 questions, about 31% situational. Questions moved from `returns` into the per-return topics kept their `RET-NNN` ids, so a topic file can mix id prefixes. Fields: `id` (CODE-NNN), `topic`, `sub` (must be one of the topic's subtopics), `diff` 1 to 3, `type` mcq | tf | scenario, `q`, `options` + `answer` (0-based) for mcq/tf, `model` + `points` for scenario, `exp`, optional `ref` (section or rule), `volatile`, `case` (situational).
- `content/glossary.json`: about 86 terms with aliases and one-line plain definitions.
- The JSON files are the source of truth. Edit them directly, keep ids stable (progress is keyed by id), append new ids at the end of a topic, and run `npm run validate` afterwards.
- When writing questions: cite the section or rule when known and never invent one; make distractors plausible; prefer realistic CA situations with rupee amounts; mark anything notification-dependent as volatile.

## Design

Ledger-paper palette (paper #edf1ee, ink #17263a, stamp violet #5a3d9a, ok/bad greens and reds, dark mode tokens). The one loud element is the rubber stamp that lands on the question sheet after answering; keep everything else quiet. Left rail nav on desktop (Practise, Returns shortcuts, Settings, with today's count from `/api/progress`), bottom tabs on mobile. Theme is Auto, Light or Dark: `data-theme` on `<html>` overrides the system setting, saved in localStorage and applied by an inline script before paint. Any new colour must be defined for both themes. On the home page, keep today's set (the card) and overall progress (the table) visibly separate. Respect reduced motion, keep visible focus, keep line lengths under about 70 characters.

## Writing style (UI copy, docs and replies to the author)

Plain, human prose. No em-dashes. No fixed-width hard line breaks in prose. Sentence case, active voice, buttons say exactly what they do.

## Facts to keep straight

- A Claude.ai or Claude Code subscription cannot power this app. Anthropic only allows subscription sign-in in its own apps, so the app needs a Console API key (`ANTHROPIC_API_KEY`). Don't add subscription OAuth.
- Gemini's free tier is Flash-only with daily limits and free-tier prompts may be used for training. Default model ids for free providers go stale quickly; keep them overridable.

## Commands

- `npm run dev`, `npm run build`, `npm start`
- `npm run validate` before committing content changes
- `npm run build` must pass (it type-checks) before calling a change done
- `docker compose up --build` (data in the `gst-data` volume)

## Known gaps and ideas

- The UI hasn't been reviewed in a real browser yet. Check layout, the stamp animation, mobile tabs and dark mode.
- No automated tests. Good first targets: `Terms` matching, `extractJSON`, SRS scheduling, daily-set composition.
- Hosted copy needs an auth layer in front (Cloudflare Access, Tailscale or proxy basic auth); the app has none by design.
- Ideas: export and import of progress, a "module mode" that builds a study plan from a feature description, review queue for AI-written questions (approve into the bank), showing eval results in the UI, periodic check of volatile questions against new CBIC notifications.
