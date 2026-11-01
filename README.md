# AI Git Tools

A developer productivity platform that wraps Git + GitHub workflows with AI.

**Single CLI (`gh-ai`) + Web Dashboard** — commit messages, PR descriptions,
release notes, issue triage, standups, and productivity metrics in one tool.

## Status

Phase 0 (Foundation) — scaffolding complete.

## Packages

| Package | Description |
|---|---|
| `packages/core` | Shared logic: types, LLM providers, git parsing, prompts, utils |
| `packages/api` | Node.js + Express backend API |
| `packages/cli` | Ink + React CLI (`gh-ai`) |
| `packages/web` | React + Vite dashboard SPA |

## Getting Started

```bash
# Install dependencies
npm install

# Build the core package first
npm run build --workspace @ai-git-tools/core

# Run the CLI
npm run dev
```

## License

MIT