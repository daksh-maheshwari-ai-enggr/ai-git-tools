# GitHub AI Help Toolkit (`gh-ai`) — Design & Roadmap

## 1. What It Is

A **developer productivity platform** that wraps Git + GitHub workflows with AI.
One CLI (`gh-ai`) + one web dashboard, covering the whole
commit → PR → review → release → reporting lifecycle instead of gluing together
six separate point-tools.

## 2. Core Differentiators

| Differentiator | Why It Matters |
|---|---|
| **Unified platform** | Commit, PR, release notes, standups, metrics in one tool |
| **Provider-agnostic** | OpenAI / Anthropic / Gemini / Ollama / bring-your-own |
| **Local-first** | Diffs never leave the machine unless you explicitly opt in |
| **Web dashboard** | AI history, release notes, productivity metrics over time |
| **`gh`-native** | Installs as a GitHub CLI plugin, reuses `gh` auth |

## 3. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| **CLI** | **Ink + React** (TypeScript, Node.js) | React components render to the terminal. `ink-text-input`, `ink-select-input`, `ink-spinner` for interactive commit flow |
| **Backend API** | **Node.js + Express** (TypeScript) | REST API consumed by both the CLI and the dashboard |
| **Dashboard** | **React + Vite** (SPA, no Next.js) | React Router, TanStack Query for data fetching, Tailwind CSS for styling, Recharts for metrics |
| **Database** | **PostgreSQL + Prisma** | Chosen over MongoDB — see rationale below |
| **AI layer** | Provider abstraction (`ai` SDK or hand-rolled) | OpenAI, Anthropic, Google, Ollama, any OpenAI-compatible endpoint |
| **Git** | `git` CLI via `execa` | Diff, log, staging, commit, revert |
| **GitHub** | `@octokit/rest` + `@octokit/graphql`, `gh` CLI for auth | Tokens never stored raw; use `gh auth token` / OS keychain |
| **Auth** | GitHub OAuth (via `gh`) + JWT/session for dashboard | |
| **Validation** | Zod (shared schemas across CLI/API/Web) | |
| **Testing** | Vitest + Supertest (API), `ink-testing-library` (CLI) | |
| **Repo layout** | npm workspaces monorepo | `packages/cli`, `packages/api`, `packages/web`, `packages/core` |
| **Lint/format** | ESLint + Prettier | |

### Why Postgres over MongoDB

The data here is fundamentally **relational**: user → repo → commits → PRs →
issues → releases. The dashboard needs **aggregations** (commits/day, PR cycle
time, DORA-style metrics), which Postgres does well with SQL and Prisma's
`groupBy`. Postgres also gives you:

- **JSONB columns** — flexible per-tool metadata/prompt config without losing
  relational guarantees. This gets you the "schemaless" convenience of Mongo.
- **Transactions** — important for multi-step operations (commit + record).
- **Maturity with Prisma** — Prisma + Postgres is the best-supported pairing.

MongoDB is only the better choice if you expect to store very large, opaque,
schema-free AI payloads per record. That's not the shape of this app. If you
still prefer Mongo, Prisma supports it — but you'd lose relational integrity
checks, which matter most here.

## 4. Architecture

```
┌──────────────────┐        ┌───────────────────┐
│  gh-ai CLI       │  REST  │  Express API      │
│  (Ink + React)   │───────▶│  (Node + TS)      │
└────────┬─────────┘        └─────────┬─────────┘
         │ execa: git diff/log/commit  │ Prisma
         ▼                             ▼
┌──────────────────┐        ┌───────────────────┐
│  Local git repo  │        │   PostgreSQL      │
└──────────────────┘        └───────────────────┘
         ▲                             ▲
         │  @octokit / gh CLI          │
┌──────────────────┐                    │
│  GitHub API      │                    │
└──────────────────┘        ┌──────────┴────────┐
                            │  React + Vite     │
                            │  Dashboard (SPA)  │
                            └───────────────────┘

CLI/API ──▶ AI Provider Abstraction ──▶ OpenAI | Anthropic | Gemini | Ollama
```

**Key modules:**

- **`packages/core`** — shared, framework-agnostic logic: diff parsing, prompt
  templates, provider abstraction, conventional-commits validation. Consumed by
  both CLI and API so behavior stays identical.
- **Provider module** — single `generate(prompt, options)` interface. Swapping
  backends touches nothing else.
- **Diff module** — stage-aware, hunk-level, with truncation for huge diffs
  (cost control).
- **Prompt templates** — versioned, per-tool, user/team overridable.

## 5. CLI Commands (`gh-ai`)

Built as Ink apps with interactive React UI (edit-before-commit is a core value):

```
gh-ai commit              # diff → Conventional Commit message → editable preview → git commit
gh-ai pr create           # diff + branch → title + body → gh pr create
gh-ai pr review           # summarize PR, flag risks, suggest reviewers
gh-ai release             # git log since last tag → grouped changelog
gh-ai issue triage        # auto-label + suggest assignees
gh-ai branch              # issue number + description → branch name
gh-ai standup             # git log since yesterday → standup text
gh-ai review              # pre-push AI code review of staged changes
gh-ai repo readme         # analyze repo → draft README
gh-ai log summarize       # natural language query over commit history
gh-ai config              # set default provider/model, per-repo config
gh-ai login               # verify gh auth, test provider connectivity
```

Global flags: `--provider`, `--model`, `--dry-run`, `--no-commit`, `--json`

## 6. Web Dashboard (React + Vite SPA)

Talks to the Express API only — never to git or LLMs directly.

- **Release notes viewer** — generated changelogs, per release, editable/exportable
- **Commit history** — AI-generated messages, searchable, filterable by type/author/date
- **Productivity metrics** — commits/day, PR cycle time, issue triage rate (Recharts)
- **Repositories** — connected repos, per-repo config, provider/model override
- **Settings** — default provider, model, Conventional Commits rules, team members
- **Team mode** (later) — shared repos, aggregated metrics, review queues

## 7. Phased Roadmap

### Phase 0 — Foundation (v0.1)
- Monorepo scaffold (npm workspaces), `packages/core`, Prisma + Postgres schema
- Provider abstraction: OpenAI + Ollama + env fallback
- `gh-ai commit` with interactive Ink preview/edit
- Conventional Commits validation, history stored via API in Postgres

### Phase 1 — PR Lifecycle (v0.2)
- `gh-ai pr create`, `gh-ai pr review`, `gh-ai release`
- Express API endpoints for history + release notes
- React dashboard: commit history + release notes viewer

### Phase 2 — Broader Toolkit (v0.3)
- `gh-ai issue triage`, `gh-ai branch`, `gh-ai standup`, `gh-ai review`
- Dashboard: productivity metrics (Recharts)

### Phase 3 — Platform (v0.4+)
- Team mode, shared repos, RBAC
- GitHub App (auto PR description on open)
- MCP server exposing `gh-ai` tools to AI coding agents
- Plugin system for custom prompts/tools

## 8. Risks / Open Questions

- **Privacy** — many orgs forbid sending code to external LLMs. Default to local
  (Ollama) with an explicit per-command opt-in for cloud providers, and state it
  plainly in the README and on first run.
- **Quality** — AI commit messages are often noisy. Never auto-commit silently;
  always show an editable preview.
- **Competition** — Copilot/Cursor absorb commit messages inside the IDE. Position
  as the *CLI-first, multi-repo, cross-lifecycle* tool, not an assistant.
- **Cost** — large diffs burn tokens. Truncate aggressively, estimate cost before
  sending, log spend per repo.
- **SPA without SSR** — a pure Vite dashboard means no server-side rendering.
  Fine for a logged-in tool dashboard, but SEO/landing page needs a separate
  static site later.