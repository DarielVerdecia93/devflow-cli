import { TaskType } from '../types';

export function buildPromptForTask(task: TaskType, diff: string): string {
  switch (task) {
    case 'commit':   return buildCommitPrompt(diff);
    case 'pr':       return buildPRPrompt(diff);
    case 'analysis': return buildAnalysisPrompt(diff);
  }
}

// ── Commit-focused prompt ─────────────────────────────────────────────────────

function buildCommitPrompt(diff: string): string {
  return `You are an expert software engineer writing a git commit following Conventional Commits strictly.

Analyze the git diff below and respond with a JSON object ONLY — no prose, no markdown fences.

━━━ COMMIT MESSAGE RULES ━━━
Format: <type>(<scope>): <short description>

Types (pick the most specific one):
  feat     — new feature or capability
  fix      — bug fix
  refactor — code restructuring, no behavior change
  chore    — tooling, deps, config, scripts
  docs     — documentation only
  test     — adding or fixing tests
  style    — formatting, whitespace (no logic change)
  perf     — performance improvement
  build    — build system or CI changes
  ci       — CI/CD pipeline changes

Scope: the module, file area, or domain affected. Examples: auth, api, ui, db, config, cli, llm, git
Description: imperative mood ("add", "fix", "remove", not "added/fixes/removed"), lowercase, ≤72 chars total line.

GOOD examples:
  feat(auth): add OAuth2 login with Google provider
  fix(api): handle null response from payment gateway
  refactor(llm): extract prompt builder into separate module
  chore(deps): upgrade axios to 1.7 and remove dotenv
  docs(readme): update installation steps for npm scoped package
  ci(publish): add trusted publisher workflow for npm

BAD examples (do NOT do this):
  "Updated files"                → no type, vague
  "feat: changes"                → too vague
  "Fixed the bug in the thing"   → no type, no scope, past tense
  "feat(stuff): did many things" → scope too vague, past tense

━━━ BRANCH NAME RULES ━━━
Format: <type>/<short-slug>
- Prefix must match the commit type exactly
- Slug: lowercase, hyphens only, ≤40 chars, no special characters
- Derived from actual changes, not invented

GOOD examples (matching above commits):
  feat/oauth2-google-login
  fix/null-payment-response
  refactor/llm-prompt-builder
  chore/upgrade-axios-remove-dotenv

━━━ PR TITLE ━━━
- Clear, human-readable title summarizing the change, ≤72 chars
- No Conventional Commits format here — this is for humans

━━━ PR DESCRIPTION ━━━
Write concise markdown with this structure (keep it short):
## What
- bullet describing the change

## Why
One sentence on the motivation.

━━━ RISK & CONFIDENCE ━━━
riskLevel: "low" (docs/style/tests), "medium" (logic/deps), "high" (auth/data/breaking)
confidenceScore: 0-100 based on how clear the intent is from the diff

Git diff:
\`\`\`
${diff.slice(0, 8000)}
\`\`\`

Respond with this exact JSON (no other text):
{
  "branchSuggestion": "type/short-slug",
  "commitMessage": "type(scope): description in imperative mood",
  "prTitle": "Human readable title",
  "prDescription": "## What\\n- change\\n\\n## Why\\nMotivation.",
  "confidenceScore": 80,
  "riskLevel": "low"
}`;
}

// ── PR-focused prompt ─────────────────────────────────────────────────────────

function buildPRPrompt(diff: string): string {
  return `You are an expert software engineer writing a Pull Request for code review.

Analyze the git diff below and respond with a JSON object ONLY — no prose, no markdown fences.

━━━ PR TITLE ━━━
- One clear sentence, ≤72 chars, human-readable
- Describe the outcome, not the implementation detail

━━━ PR DESCRIPTION ━━━
Write structured markdown following this template exactly:

## Summary
Brief 1-2 sentence overview of what this PR does.

## Changes
- Bullet 1 (specific file/area changed and how)
- Bullet 2
- Bullet 3 (max 5 bullets)

## Motivation
Why this change was needed (1-2 sentences).

## Notes
Any breaking changes, risks, or reviewer guidance. Write "None." if not applicable.

━━━ COMMIT MESSAGE (still required) ━━━
Conventional Commits format: <type>(<scope>): <description>
Types: feat | fix | refactor | chore | docs | test | style | perf | build | ci
Imperative mood, lowercase, ≤72 chars total.

━━━ BRANCH (still required) ━━━
<type>/<short-slug> — lowercase, hyphens, ≤40 chars.

━━━ RISK & CONFIDENCE ━━━
riskLevel: "low" | "medium" | "high"
confidenceScore: 0-100

Git diff:
\`\`\`
${diff.slice(0, 8000)}
\`\`\`

Respond with this exact JSON (no other text):
{
  "branchSuggestion": "type/short-slug",
  "commitMessage": "type(scope): description",
  "prTitle": "Human readable PR title",
  "prDescription": "## Summary\\n...\\n\\n## Changes\\n- ...\\n\\n## Motivation\\n...\\n\\n## Notes\\n...",
  "confidenceScore": 80,
  "riskLevel": "low"
}`;
}

// ── Full analysis prompt (used by devflow flow) ───────────────────────────────

function buildAnalysisPrompt(diff: string): string {
  return `You are an expert software engineer performing a full Git workflow analysis.

Analyze the git diff below and respond with a JSON object ONLY — no prose, no markdown fences.

━━━ COMMIT MESSAGE ━━━
Conventional Commits: <type>(<scope>): <description>
Types: feat | fix | refactor | chore | docs | test | style | perf | build | ci
Scope: module/area affected (auth, api, ui, db, config, cli, llm, git)
Imperative mood, lowercase, ≤72 chars total.

GOOD: feat(auth): add OAuth2 login with Google provider
GOOD: fix(api): handle null response from payment gateway
GOOD: chore(deps): upgrade axios to 1.7 and remove dotenv

━━━ BRANCH NAME ━━━
<type>/<short-slug> — type matches commit type, lowercase hyphens, ≤40 chars.

━━━ PR TITLE ━━━
Clear, human-readable, ≤72 chars. No Conventional Commits format.

━━━ PR DESCRIPTION ━━━
Structured markdown:

## Summary
Brief 1-2 sentence overview.

## Changes
- Specific change 1
- Specific change 2
(max 5 bullets)

## Motivation
Why this change was needed (1-2 sentences).

## Notes
Breaking changes, risks, or guidance. "None." if not applicable.

━━━ RISK & CONFIDENCE ━━━
riskLevel: "low" (docs/style/tests) | "medium" (logic/deps) | "high" (auth/data/breaking changes)
confidenceScore: 0-100 based on clarity of intent in the diff

Git diff:
\`\`\`
${diff.slice(0, 8000)}
\`\`\`

Respond with this exact JSON (no other text):
{
  "branchSuggestion": "type/short-slug",
  "commitMessage": "type(scope): description in imperative mood",
  "prTitle": "Human readable title",
  "prDescription": "## Summary\\n...\\n\\n## Changes\\n- ...\\n\\n## Motivation\\n...\\n\\n## Notes\\n...",
  "confidenceScore": 80,
  "riskLevel": "low"
}`;
}
