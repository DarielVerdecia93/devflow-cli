# AGENTS.md — DevFlow AI CLI

Instructions for AI coding agents (Claude Code, Copilot, Cursor, etc.) working on this repository.

---

## What this project is

A Node.js + TypeScript CLI that automates Git workflows using LLMs, but with mandatory human approval before any git operation executes. The core invariant is: **the AI proposes, the human decides**.

---

## Key files to understand first

| File | Purpose |
|---|---|
| `src/types/index.ts` | All shared types — read this before touching anything |
| `src/llm/router.ts` | LLM routing and fallback logic |
| `src/llm/prompts.ts` | The single prompt template used for all analysis |
| `src/ui/interactive.ts` | All user-facing menus — `UserAction` type drives all command loops |
| `src/cli/commands/commit.ts` | Reference implementation for how a command works end-to-end |

---

## Architecture invariants — never break these

1. **No git operation without user approval.** Every command has a `while (!accepted)` loop driven by `promptMainAction()`. Do not add code that skips this loop.

2. **LLM output is always JSON.** `parseProposalFromText()` in `base.provider.ts` handles all parsing. Do not parse JSON anywhere else.

3. **`baseBranch` is a runtime variable, not a constant.** It starts from `config.git.baseBranch` but can be edited by the user mid-flow. Always thread it as a parameter — never re-read from config inside `createPR()`.

4. **Providers are independent.** Each provider in `src/llm/providers/` only uses its own config keys and the shared `buildAnalysisPrompt()`. Do not add cross-provider dependencies.

5. **Azure DevOps is optional.** Every PR creation path must be guarded by `azureService.isConfigured()`. Never throw if Azure is not configured — inform and return gracefully.

---

## How to add a feature safely

### New LLM provider
- Implement `LLMProvider` interface from `base.provider.ts`
- Add `ProviderName` union member in `types/index.ts`
- Register in `router.ts` constructor map
- Add config block in `config/index.ts`
- Add env vars to `.env.example`

### New editable field in the proposal menu
- Add a new `UserAction` member in `types/index.ts`
- Add a `promptEdit*()` function in `ui/interactive.ts`
- Add a `case` in every command's `while (!accepted)` switch block
- Show the field in `printProposal()` in `ui/display.ts` if it belongs in the proposal view

### New CLI command
- Create `src/cli/commands/<name>.ts`
- Export a single async function named `<name>Command`
- Register with `program.command()` in `src/cli/index.ts`
- Mirror the try/catch + spinner pattern from `commit.ts`

---

## What the LLM prompt must always produce

```json
{
  "branchSuggestion": "feature/...",
  "commitMessage": "feat(...): ...",
  "prTitle": "...",
  "prDescription": "...",
  "confidenceScore": 0,
  "riskLevel": "low | medium | high"
}
```

If you modify `buildAnalysisPrompt()` in `src/llm/prompts.ts`, ensure the output schema stays identical. The parser in `parseProposalFromText()` will throw if required fields are missing.

---

## Commands for verification

```bash
npx tsc --noEmit          # type check — run after every change
npm run build             # full compile
node dist/cli/index.js --help   # smoke test
npm install -g . && devflow status   # end-to-end smoke test
```

---

## Things to avoid

- Do not add `console.log` debug statements — use `printInfo()` from `ui/display.ts`
- Do not add retry logic inside providers — the router handles fallback
- Do not use `process.exit()` — set `process.exitCode = 1` and return
- Do not hardcode branch names, model names, or org names — everything goes through `config/index.ts`
- Do not add optional chaining (`?.`) on things that should always exist — fail loudly instead
