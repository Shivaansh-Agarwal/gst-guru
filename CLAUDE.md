# GST Guru: context for Claude Code

## What this is and who it's for

A local-first app for anyone who wants to understand Indian GST properly: students, business owners, accountants, and people who build or use GST software. The goal is real working knowledge: how a CA runs the monthly filing cycle, what happens when a deadline is missed, how filed returns get corrected, how notices are handled. Not just definitions.

It's an open project and must stay generic. Never add anything specific to a particular company or product (internal APIs, product names, customer data, screenshots). Anyone should be able to clone it, add their own AI key and run it. Quality and polish matter.

## Product principles

- The curated question bank is the core and must work fully offline with no AI configured.
- AI is optional and additive: grading free-text answers, generating new questions, deep dives, and the per-question help chat.
- Hosted AI providers are opt-in: one appears only when its key is set in `.env.local`. Local servers (Ollama, LM Studio) are detected: whatever models they have installed show up in Settings with no config (`OLLAMA_ENABLED=false` or `LMSTUDIO_ENABLED=false` hides one). Default to free or local models when nothing is chosen.
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

- `content/topics.json`: 37 topics in 7 groups, each with an id, code (used in question ids), blurb, subtopics and an optional `group`. The `ca` topic ("At the CA's desk") covers monthly cycle, missed deadlines, fixing mistakes, notices, client management. Each major return (GSTR-1, 1A, 2B, 3B, 9, 9C, 6, 7 and ITC-04) has its own topic in the "Returns" group, and each reconciliation type (purchases vs 2B, sales vs GSTR-1, GSTR-1 vs 3B, 2B vs 3B, e-way bills vs GSTR-1, books vs annual return, ledgers/TDS/TCS/imports) has its own topic in the "Reconciliation" group, and `returns` holds the rest (QRMP, other returns, late fees). Grouped topics are listed first on the Topics page, the home table and the deep dive picker.
- `content/questions/<topic>.json`: about 760 questions, about 33% situational. Questions moved from `returns` into the per-return topics kept their `RET-NNN` ids, so a topic file can mix id prefixes. Fields: `id` (CODE-NNN), `topic`, `sub` (must be one of the topic's subtopics), `diff` 1 to 3, `type` mcq | tf | scenario, `q`, `options` + `answer` (0-based) for mcq/tf, `model` + `points` for scenario, `exp`, optional `ref` (section or rule), `volatile`, `case` (situational).
- `content/glossary.json`: about 86 terms with aliases and one-line plain definitions.
- `content/insights.json`: 140 dashboard facts (teaser question, explanation, example, reference) and short case studies (situation, question, worked answer). Same accuracy rules as questions: cite the section, avoid rates that change, mark notification-dependent items volatile. All facts are browsable at `/facts` (search, group filter, answers hidden until opened); the discovered list in localStorage (`facts-seen`) is shared with the dashboard card.
- `content/videos.json`: curated videos per topic (139 across all 37), shown in the topic's Learn tab as a Watch panel. YouTube entries must be checked with YouTube's oEmbed endpoint before adding (it returns the real title and channel); order official (CBIC INDIA, GSTN), then professional bodies and publishers, then CA educators. Never add GST software vendors' channels. Cards load nothing from YouTube until played, then embed from youtube-nocookie.com. Udemy blocks automated checks, so its paid courses are labelled as such.
- `content/reading.json`: further reading per topic plus a general list, shown on each topic page. Official sources first (GST portal user manuals, CBIC, GST Council). Check every URL loads before adding it, and don't link to GST software vendors' blogs.
- Each topic's Learn tab turns the bank's questions into flip cards (answer and explanation on the back). AI-written questions are left out.
- The JSON files are the source of truth. Edit them directly, keep ids stable (progress is keyed by id), append new ids at the end of a topic, and run `npm run validate` afterwards.
- When writing questions: cite the section or rule when known and never invent one; make distractors plausible; prefer realistic CA situations with rupee amounts; mark anything notification-dependent as volatile.

## Design

Ledger-paper palette (paper #edf1ee, ink #17263a, stamp violet #5a3d9a, ok/bad greens and reds, dark mode tokens). The app should feel playful and invite curiosity. Two families of loud elements: the rubber stamp that lands on the question sheet after answering, and the "curiosity cards" on the dashboard (bright sun-yellow Did you know? card, mint case study card) with a thick ink border, offset shadow, tilted sticker labels and press-down buttons. Curiosity content shows a teaser first and reveals on tap. The practice round (`QuizRunner`) is a game: a bar with question count, score, a combo chip for streaks and ten progress coins; a type sticker per question (Quick check, True or false, Client situation, Write it out) and difficulty dots; keycap options with A–E or 1–5 shortcuts and Enter for next; rotating feedback lines and a Why box; a results card with best streak and confetti at 80% or more. All motion is switched off under reduced motion. Keep navigation, lists and reading pages calm so these stand out. Left rail nav on desktop with four items (Dashboard, Today, All topics, GST GPT; Today shows the day's count from `/api/progress`), bottom tabs on mobile. Model settings and Connect AI are reached from GST GPT, not the menu. A top bar holds the Light/Dark switch: light is the default and the system setting is ignored; dark is saved in localStorage and applied by an inline script before paint. Any new colour must be defined for both themes, including the seven group accents (`--g1` to `--g7`). The dashboard shows topics covered, questions answered, today's count, a fact and a case study from `content/insights.json` (rotated daily). Topic pages have a hero in the group's accent colour with a topic score ring (share answered × recent accuracy) and a level (Newcomer, Explorer, Practitioner, Pro, Master), then two tabs. Learn has flip cards built from the bank (flips remembered in localStorage per topic) and source tiles from `content/reading.json`. Questions has Play cards and one Level tile per subtopic that gets a Cleared stamp once every question in it is answered. Each section is a numbered panel with its own colour (sun, mint, coral, violet). Every topic has a `group`; groups show as numbered, colour-edged panels on All topics.

## Writing style (UI copy, docs and replies to the maintainer)

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
- Ideas: export and import of progress, a study plan mode that builds a path through topics from a goal the learner describes, review queue for AI-written questions (approve into the bank), showing eval results in the UI, periodic check of volatile questions against new CBIC notifications.
