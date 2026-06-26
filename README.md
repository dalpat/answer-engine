# Answer Engine

A self-hosted, Perplexity-style answer engine on your own OpenAI-compatible models.
Search the web (self-hosted SearXNG), read sources, synthesize **cited** answers with a
beautiful live-progress UX. Multi-user, BYOK, launch-ready.

> Full product & architecture spec: **[`docs/spec.html`](docs/spec.html)** — open in a browser.

## Stack

| Concern    | Choice                                         |
| ---------- | ---------------------------------------------- |
| Framework  | SvelteKit (Svelte 5 runes) + `adapter-node`    |
| Search     | Self-hosted SearXNG                            |
| Extraction | Readability-first (Playwright fallback later)  |
| LLM        | BYOK — any OpenAI-compatible endpoint          |
| DB         | Drizzle ORM · libSQL/SQLite → Postgres via env |
| Auth       | Own-your-code (Lucia pattern)                  |
| Keys       | AES-256-GCM encrypted at rest                  |

## Develop

```sh
cp .env.example .env          # then fill ENCRYPTION_KEY / SESSION_SECRET
bun install
bun run db:push               # create the SQLite schema
bun run dev                   # http://localhost:5173
```

The home page works immediately in **demo mode** (mock event stream) so you can see the
live-progress stepper, source cards, and streaming answer before configuring a model.

## Run (self-hosted)

```sh
docker compose up             # app + SearXNG → http://localhost:3000
```

## Project map

```
src/lib/events.ts             typed SSE event contract (drives the UI)
src/lib/server/
  db/                         Drizzle schema + client
  crypto.ts                   AES-GCM key encryption
  search/                     SearXNG seam  -> search(), dedupe()
  extract/                    readability seam -> extract(url)
  llm/                        OpenAI-compatible client -> listModels/streamChat/complete
  ask/                        the ask loop: rewrite->search->extract->synthesize->related
  auth/                       (own-code sessions - to build)
src/routes/api/ask/+server.ts SSE endpoint (thin pump over askLoop)
src/routes/+page.svelte       composer + live stepper + cited answer
```

## Roadmap (architected-for, deferred)

- Real BYOK connection management UI -> wire `askLoop()` in `/api/ask` (replaces demo path)
- Own-code auth (sessions, signup/login)
- Agentic "Deep Research" mode (branch in `askLoop`)
- Playwright extraction fallback (behind `extract()`)
- Postgres (swap `DATABASE_URL`)
- If you ever go public: TLS (Caddy), SSRF guard, rate limiting
