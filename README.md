# DevFlow AI CLI

> AI-powered Git + Azure DevOps CLI with mandatory human-in-the-loop control.

Analyzes your `git diff`, proposes branch name, commit message, PR title, and description — then waits for your approval before touching anything.

---

## Features

- **Analyze** — reads `git diff` and understands what changed
- **Propose** — generates branch, commit, PR title + description via AI
- **Review** — interactive menu: accept, edit each field, or regenerate
- **Execute** — creates branch → commits → pushes → opens PR only after you say yes
- **Multi-LLM** — supports OpenAI, Anthropic Claude, Google Gemini, Groq with automatic fallback
- **Azure DevOps** — creates Pull Requests via REST API (optional)

---

## Installation

### Requirements

- Node.js >= 18
- Git
- At least one LLM API key (OpenAI, Anthropic, Gemini, or Groq)

### From npm (recommended)

```bash
npm install -g devflow-cli
```

### From source (Windows)

```powershell
git clone <repo-url>
cd devflow-cli
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

---

## Configuration

Configuration is stored globally in `~/.config/devflow/config.json` and applies to all your repositories.

### Using the config command (recommended)

```bash
# LLM providers (at least one required)
devflow config set llm.openai.apiKey sk-...
devflow config set llm.anthropic.apiKey sk-ant-...
devflow config set llm.groq.apiKey gsk_...
devflow config set llm.gemini.apiKey ...

# Azure DevOps (optional — needed for PR creation)
devflow config set azure.org my-org
devflow config set azure.project my-project
devflow config set azure.repo my-repo
devflow config set azure.token my-pat

# Show all config
devflow config list

# Remove a value
devflow config delete llm.openai.apiKey
```

### Using a .env file (per-project override)

Create a `.env` file in your project root — values here take precedence over the global config:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=...

AZURE_DEVOPS_ORG=my-org
AZURE_DEVOPS_PROJECT=my-project
AZURE_DEVOPS_REPO=my-repo
AZURE_DEVOPS_TOKEN=my-pat

GIT_BASE_BRANCH=main
```

### Config priority

```
Environment variables  >  .env (project)  >  ~/.config/devflow/config.json (global)
```

### LLM routing (optional)

By default: commits use Groq (fast), PRs use Anthropic, analysis uses OpenAI.

```bash
devflow config set llm.routing.commit groq        # groq | openai | anthropic | gemini
devflow config set llm.routing.pr anthropic
devflow config set llm.routing.analysis openai
devflow config set llm.routing.default openai     # fallback when preferred is unavailable
```

---

## Usage

```bash
devflow status    # show repo state, configured LLM providers, Azure status
devflow commit    # analyze → propose → approve → branch + commit + push
devflow pr        # generate PR for the current branch
devflow flow      # full pipeline: branch → commit → push → PR
devflow config    # manage global configuration
```

### Interactive menu (every command)

```
  --------------------------------------------------
  AI Proposed Changes  (via groq)
  --------------------------------------------------

  Branch:
    feature/login-validation

  Commit:
    feat(auth): improve login validation logic

  Base Branch (merge target):
    main

  PR Title:
    Improve login validation flow

  PR Description:
    - Fix null pointer in auth handler
    - Add input sanitization for email field

  Confidence: ████████░░ 82%
  Risk:       LOW
  --------------------------------------------------

  ? What would you like to do?
  > Accept all
    Edit branch name
    Edit commit message
    Edit PR title/description
    Edit base branch (merge target)
    Regenerate (try again)
    Cancel
```

Nothing executes until you choose **Accept all**.

---

## Architecture

```
src/
├── cli/
│   ├── index.ts                  # commander entry point
│   └── commands/
│       ├── commit.ts             # devflow commit
│       ├── pr.ts                 # devflow pr
│       ├── flow.ts               # devflow flow
│       ├── status.ts             # devflow status
│       └── config.ts             # devflow config
├── llm/
│   ├── router.ts                 # multi-provider router with fallback
│   ├── prompts.ts                # structured diff analysis prompt
│   └── providers/
│       ├── base.provider.ts      # LLMProvider interface + JSON parser
│       ├── openai.provider.ts
│       ├── anthropic.provider.ts
│       ├── gemini.provider.ts
│       └── groq.provider.ts
├── git/
│   └── service.ts                # simple-git wrapper
├── azure/
│   └── service.ts                # Azure DevOps REST API client
├── ui/
│   ├── display.ts                # chalk-based output
│   └── interactive.ts            # inquirer menus
├── config/
│   ├── index.ts                  # env config + routing helpers
│   └── store.ts                  # global config (~/.config/devflow/config.json)
└── types/
    └── index.ts                  # shared TypeScript types
```

---

## LLM Response Format

The AI always returns structured JSON:

```json
{
  "branchSuggestion": "feature/login-validation",
  "commitMessage": "feat(auth): improve login validation logic",
  "prTitle": "Improve login validation flow",
  "prDescription": "- Fix null pointer...\n- Add input sanitization...",
  "confidenceScore": 82,
  "riskLevel": "low"
}
```

---

## Building a standalone .exe (no Node.js required)

```bash
npm run build:exe    # generates devflow.exe (~40 MB, Node.js bundled)

# Then install it system-wide:
powershell -ExecutionPolicy Bypass -File .\install-exe.ps1
```

---

## Uninstall

```powershell
# If installed via npm:
npm uninstall -g devflow-cli

# If installed via .exe:
Remove-Item -Recurse "$env:LOCALAPPDATA\devflow-cli"
# Then remove %LOCALAPPDATA%\devflow-cli from your user PATH
```

---

## License

MIT
