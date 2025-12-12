### Tavern Studio

> **WARNING: PRE-ALPHA**
>
> Tavern Studio is **pre-alpha**. Expect bugs, breaking changes, missing features, and occasional data weirdness.
>
> **Bug reports:** please **do not open issues** right now. If you hit something gnarly, grab logs / screenshots and share them directly with the maintainer.

Tavern Studio is a **local-first, high-performance AI chat / roleplay interface and management dashboard**.

It’s being built as a deliberate alternative to the existing options: the focus is on **speed**, **clarity**, and **power-user workflows** — without the UI turning into molasses once chats get large.

### The philosophy / thesis
Tavern Studio is being built with a pretty blunt goal: **take everything people like about SillyTavern and do it better**.

“Better” here primarily means:
- **Performance-first**: large chats, lots of characters, and lots of UI interactions should still feel snappy.
- **Customization-first**: the UI shouldn’t be “one theme with minor tweaks” — it should be a studio for building the chat interface you actually want.
- **Local-first**: your data lives on your machine, with a simple local server and SQLite.

This is not a “we’ll never ship feature X” project. It’s **pre-alpha**, which just means we’re early and honest about it — not that the scope is small.

### Why use Tavern Studio instead of SillyTavern?
[SillyTavern](https://github.com/SillyTavern/SillyTavern) is a great project: it’s popular for a reason, and it has a massive ecosystem.

Tavern Studio is aimed at users who specifically want:
- **A faster-feeling UI** under heavy usage (large chats, lots of characters)
- **Deeper styling control** (message layout, typography, header, avatars, markdown theming, templates, custom fonts, almost everything is customizable)
- **The feeling of using a different interface** Tavern Studio intends to create templates for UI's that mimic popular chat interfaces like Janitor.AI, Chub.AI, or Discord. 
- **A branching-first message model** (alternates are first-class, not an afterthought)
- **Server-side encrypted provider secrets** while still running locally

### What Tavern Studio is
- A **chat UI + editor** for AI conversations and characters
- A **presentation studio** for chat logs (styling, templates, fonts)
- A **local app**: Bun server + React client, with SQLite persistence under `./data/`

### Current capabilities
- **Branching chat tree**
  - Messages are stored as nodes with `parent_id`, `child_ids[]`, and `active_child_index`.
- **Chats, speakers, profiles**
  - Profiles include message styling plus an active AI config.
- **Design templates + custom fonts**
  - Save/share style configs; upload fonts and use them in the UI.
- **AI providers (server-side)**
  - Providers: **OpenRouter**, **OpenAI**, **Anthropic**.
  - Secrets are encrypted at rest in SQLite.
  - OpenRouter supports manual API key or OAuth PKCE.

### Planned / in-progress (this is the thesis, not a promise)
There’s a lot of work ahead. The point is to get to a “real” power-user roleplay tool, not just a demo.

- **Character cards**
  - Full support for **Tavern PNG cards** (PNG with embedded metadata) and **JSON cards**
  - Card extensions (compatibility-first; unknown fields should round-trip without being destroyed)
  - Floating a theoretical “**TS card**” format (opt-in, future): a richer character package for Tavern Studio features later
  - Image tooling (crop, etc.)
  - Optional LLM-assisted character creator
- **Lorebooks / WorldInfo**
  - Token-aware context injection and memory tooling
- **More provider backends**
  - OpenAI-compatible endpoints (LM Studio / Ollama), Gemini, etc.
- **Workspace features**
  - Search, organization, quick switching
- **Group chats / multi-speaker orchestration**

### Tech stack
- **Runtime**: Bun
- **Server**: Hono (`/server`, API on `http://localhost:3001`)
- **Client**: React + Vite (`http://localhost:5173`)
- **State/query**: Zustand + TanStack Query
- **DB**: SQLite (Bun’s `bun:sqlite`)

### Running locally
1. Install dependencies:

```bash
bun install
```

2. Start dev server + client:

```bash
bun dev
```

- Client: `http://localhost:5173`
- API: `http://localhost:3001` (proxied under `/api` from Vite)

On first run, Tavern Studio will create:
- `./data/tavernstudio.db`
- `./data/fonts/` (uploaded fonts)
- `./data/master.key` (dev-only fallback key if you don’t set an env var)

### Security / secrets
AI provider secrets are stored **encrypted at rest**.

- **Production**: set `TAVERN_MASTER_KEY_B64` to a base64-encoded 32-byte key.
- **Local dev**: if `TAVERN_MASTER_KEY_B64` is not set, Tavern Studio generates and stores a key at `./data/master.key`.