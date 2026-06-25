export function buildAnalysisPrompt(diff: string): string {
  return `You are a senior software engineer analyzing a Git diff to generate a structured commit proposal.

Analyze the following Git diff carefully and respond with a JSON object ONLY — no prose, no markdown fences.

Rules for branchSuggestion:
- Use one of these prefixes: feature/, fix/, refactor/, chore/, hotfix/
- Choose based on what the diff actually shows (feature = new capability, fix = bug fix, refactor = restructuring, chore = deps/tooling, hotfix = critical patch)
- Keep it short, lowercase, hyphen-separated, under 50 chars
- Derive from actual changes, never invent functionality

Rules for commitMessage:
- Follow Conventional Commits: <type>(<scope>): <description>
- Types: feat, fix, refactor, chore, docs, test, style
- Subject under 72 chars, imperative mood
- Scope optional but helpful

Rules for prTitle:
- Clear, human-readable, under 72 chars
- No jargon

Rules for prDescription:
- 2-4 bullet points using markdown
- Explain WHAT changed and WHY
- Mention any breaking changes or risks

Rules for confidenceScore:
- 0-100, based on how clear the intent is from the diff
- Low (0-40): diff is noisy or unclear
- Medium (41-70): some ambiguity
- High (71-100): intent is clear

Rules for riskLevel:
- "low": cosmetic, docs, or test changes
- "medium": logic changes, new dependencies
- "high": breaking changes, auth, data migrations

Git diff:
\`\`\`
${diff.slice(0, 8000)}
\`\`\`

Respond with this exact JSON structure:
{
  "branchSuggestion": "...",
  "commitMessage": "...",
  "prTitle": "...",
  "prDescription": "...",
  "confidenceScore": 0,
  "riskLevel": "low"
}`;
}
