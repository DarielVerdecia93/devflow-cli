# Contributing to DevFlow AI CLI

Thanks for your interest in contributing. This document covers how to get started, the project structure, and the conventions to follow.

---

## Getting started

```bash
git clone <repo-url>
cd devflow-cli
npm install
cp .env.example .env    # add at least one LLM API key
npm run dev -- status   # run without building
```

For a full build:

```bash
npm run build
npm install -g .
devflow status
```

---

## Project structure

```
src/
├── cli/commands/   — one file per CLI command
├── llm/providers/  — one file per LLM provider
├── git/            — simple-git wrapper
├── azure/          — Azure DevOps REST API
├── ui/             — display (chalk) + interactive menus (inquirer)
├── config/         — env loading and routing helpers
└── types/          — shared TypeScript interfaces
```

---

## Adding a new LLM provider

1. Create `src/llm/providers/<name>.provider.ts` implementing `LLMProvider`:

```typescript
export class MyProvider implements LLMProvider {
  readonly name = 'myprovider' as const;

  isConfigured(): boolean {
    return !!config.llm.myprovider.apiKey;
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    // call your API, return parseProposalFromText(responseText)
  }
}
```

2. Add the provider name to `ProviderName` in `src/types/index.ts`
3. Register it in `src/llm/router.ts`
4. Add its config block in `src/config/index.ts`
5. Document the env vars in `.env.example`

---

## Adding a new CLI command

1. Create `src/cli/commands/<name>.ts` and export an async function
2. Register it in `src/cli/index.ts` with `program.command(...)`

---

## Code conventions

- **TypeScript strict mode** — no `any`, no implicit `undefined`
- **No comments explaining what code does** — only why (non-obvious invariants, workarounds)
- **No error swallowing** — propagate errors up to the command level where they're printed with `printError()`
- **Human-in-the-loop is non-negotiable** — no command executes git operations without a user prompt
- **Providers are stateless** — no caching, no shared mutable state between calls

---

## Commit conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(llm): add Mistral provider
fix(git): handle detached HEAD state
refactor(ui): extract proposal renderer
chore(deps): update simple-git to 3.26
```

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`

---

## Pull requests

- One PR per concern — don't mix feature + refactor + chore
- PRs touching `src/llm/` require a manual test with a real diff
- PRs touching `src/azure/` require testing against a real Azure DevOps org or a mock server
- Update `.env.example` if you add new env vars

---

## Running type checks

```bash
npx tsc --noEmit    # type check without building
npm run build       # full compile to dist/
```

There is no test suite yet. If you add one, use [Vitest](https://vitest.dev/).
