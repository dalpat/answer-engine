# Answer Engine

A self-hosted, Perplexity/Kimi-style answer engine on your own OpenAI-compatible models.
Search the web (self-hosted SearXNG), read sources, synthesize **cited** answers with a
beautiful live-progress UX. Multi-user, BYOK, with persistent threaded conversations.

> Full product & architecture spec: **[`docs/spec.html`](docs/spec.html)** — open in a browser.

## Stack

| Concern    | Choice                                          |
| ---------- | ----------------------------------------------- |
| Framework  | SvelteKit (Svelte 5 runes) + `adapter-node`     |
| Search     | Self-hosted SearXNG                             |
| Extraction | Readability-first (+ optional Playwright)       |
| LLM        | BYOK — any OpenAI-compatible endpoint           |
| DB         | Drizzle ORM · libSQL/SQLite (remote-swappable)  |
| Auth       | Own-your-code (Lucia pattern), argon2 sessions  |
| Keys       | AES-256-GCM encrypted at rest                   |

## Develop

```sh
cp .env.example .env          # fill ENCRYPTION_KEY / SESSION_SECRET (openssl rand -base64 32)
bun install
bun run dev                   # http://localhost:5173 — schema auto-migrates on boot
```

Create an account, then **Settings → Add connection** to point at any OpenAI-compatible
endpoint (local vLLM/Ollama, Groq, Together, …). Before configuring a model, the app runs
in **demo mode** so you can see the live-progress stepper, source cards, and streaming
answer immediately. (Real answers need a running SearXNG — use the compose stack below.)

## Run (self-hosted)

```sh
docker compose up             # app + SearXNG → http://localhost:3000
```

Set `ORIGIN` to the URL users actually hit (CSRF). The schema is created automatically on
first boot via Drizzle migrations — no manual step.

## What works

- **Auth** — email+password, argon2 hashing, hashed session tokens, route-gated `(app)` group
- **BYOK connections** — add/test/delete; model list auto-loaded via `/v1/models`; keys
  encrypted at rest; composer model switcher
- **Answer pipeline** — rewrite → SearXNG fan-out → readability extract → cited synthesis,
  streamed as a typed SSE event sequence
- **Live progress** — animated 4-phase stepper, collapses to a summary
- **Threads** — persistent, per-thread URLs, multi-turn follow-ups in context, sidebar history
- **Deep Research** — composer toggle adds a gap-filling search round

## Project map

```
src/lib/events.ts             typed SSE event contract (drives the UI)
src/lib/types.ts              client Turn view-model
src/lib/stream.ts             SSE client helper
src/lib/components/           Icon · Menu · Sidebar · Composer · Turn · AuthForm · ConnectionForm
src/lib/stores/               session (threads) · connections · ui — Svelte 5 runes stores
src/lib/server/
  auth/                       own-code sessions (argon2, token hashing, cookies)
  db/                         Drizzle schema + client + boot migrator
  crypto.ts                   AES-256-GCM key encryption
  connections/                BYOK CRUD + key encrypt/decrypt
  threads/                    thread + message persistence
  search/                     SearXNG seam  -> search(), dedupe()
  extract/                    readability seam (+ optional browser fallback)
  llm/                        OpenAI-compatible client -> listModels/streamChat/complete
  ask/                        the loop: rewrite->search->extract->synthesize->related (+deep)
src/routes/
  (auth)/login,register       public auth screens
  (app)/                      authed shell (sidebar) — home, settings, thread/[id]
  api/ask, api/connections, api/threads, logout
```

## Roadmap (deferred by design)

- True Postgres (needs a `pg-core` schema fork; remote **libSQL/Turso** is a drop-in `DATABASE_URL` swap today)
- Agentic multi-step "Deep" (current Deep is a single extra round)
- If you ever go public: TLS (Caddy), SSRF guard on the fetcher, rate limiting
