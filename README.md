# DevFlow AI CLI

> AI-powered Git CLI with mandatory human-in-the-loop control. Works with GitHub and Azure DevOps.

Analyzes your `git diff`, proposes branch name, commit message, PR title, and description — then waits for your approval before touching anything.

---

## Features

- **Analyze** — reads `git diff` and understands what changed
- **Propose** — generates branch, commit, PR title + description via AI
- **Review** — interactive menu: accept, edit each field, or regenerate
- **Execute** — creates branch → commits → pushes → opens PR only after you say yes
- **Multi-LLM** — supports OpenAI, Anthropic Claude, Google Gemini, Groq with automatic fallback
- **Auto-detect platform** — detects GitHub or Azure DevOps from the git remote URL automatically
- **Global config** — configure once, works across all your repositories

---

## Installation

### Requirements

- Node.js >= 18
- Git
- At least one LLM API key (OpenAI, Anthropic, Gemini, or Groq)
- **gh CLI** — for GitHub repos: [cli.github.com](https://cli.github.com) → `gh auth login`
- **az CLI** — for Azure DevOps repos: [aka.ms/installazurecliwindows](https://aka.ms/installazurecliwindows) → `az extension add --name azure-devops` → `az login`

### From npm (recommended)

```bash
npm install -g @dverdeciav/devflow-cli
```

### From source (Windows)

```powershell
git clone https://github.com/DarielVerdecia93/devflow-cli
cd devflow-cli
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

---

## Quick start

### Option A — Interactive wizard (recommended)

```bash
devflow init
```

The wizard guides you through:
1. Choosing your LLM provider (Groq, OpenAI, Anthropic, Gemini)
2. Entering your API key (masked input)
3. Selecting the model from available options
4. Setting your default base branch
5. Checking your Git platform CLI (`gh` / `az`)

### Option B — Manual setup

```bash
# 1. Set at least one LLM provider
devflow config set llm.groq.apiKey gsk_...

# 2. Authenticate with your platform CLI
gh auth login          # for GitHub repos
az login               # for Azure DevOps repos (+ az extension add --name azure-devops)

# 3. Check everything
devflow status
```

> org/project/repo are **auto-detected from the git remote URL** — no manual setup needed.

---

## Configuration

Configuration is stored globally in `~/.config/devflow/config.json` and applies to all your repositories.

### Commands

```bash
devflow config set <key> <value>   # save a value
devflow config get <key>           # read a value
devflow config delete <key>        # remove a value
devflow config list                # show everything (tokens are masked)
```

### All available keys

| Key | Description | Example value |
|-----|-------------|---------------|
| `llm.openai.apiKey` | OpenAI API key | `sk-...` |
| `llm.anthropic.apiKey` | Anthropic API key | `sk-ant-...` |
| `llm.groq.apiKey` | Groq API key | `gsk_...` |
| `llm.gemini.apiKey` | Gemini API key | `AIza...` |
| `git.baseBranch` | Default base branch for PRs | `main` |

> **No tokens needed for GitHub or Azure DevOps** — authentication is handled by `gh` and `az` CLIs respectively.

<details>
<summary>Advanced overrides</summary>

| Key | Description | Default |
|-----|-------------|---------|
| `llm.openai.model` | OpenAI model | `gpt-4o` |
| `llm.anthropic.model` | Anthropic model | `claude-sonnet-4-6` |
| `llm.groq.model` | Groq model | `llama-3.3-70b-versatile` |
| `llm.gemini.model` | Gemini model | `gemini-2.0-flash` |
| `llm.routing.commit` | Provider for commit messages | `groq` |
| `llm.routing.pr` | Provider for PR descriptions | `anthropic` |
| `llm.routing.analysis` | Provider for diff analysis | `openai` |
| `llm.routing.default` | Fallback provider | `openai` |

</details>

### Platform auto-detection

DevFlow reads the git remote URL and detects the platform automatically:

| Remote URL pattern | Platform detected | CLI required |
|--------------------|-------------------|--------------|
| `github.com/owner/repo` | GitHub | `gh` |
| `dev.azure.com/org/project/_git/repo` | Azure DevOps | `az` |
| `org.visualstudio.com/project/_git/repo` | Azure DevOps | `az` |

No tokens to configure — `gh` and `az` handle authentication on their own. Owner, org, project and repo are all extracted from the remote URL automatically.

### Config priority

```
System environment variables  >  ~/.config/devflow/config.json (global)
```

> **No `.env` file needed.** DevFlow no longer reads `.env` — the single source of truth is `~/.config/devflow/config.json`, managed by `devflow init` and `devflow config`. If you have an old `.env` in your project, you can safely delete it.

### LLM routing (optional)

By default: commits use Groq (fast), PRs use Anthropic, analysis uses OpenAI.

```bash
devflow config set llm.routing.commit groq        # groq | openai | anthropic | gemini
devflow config set llm.routing.pr anthropic
devflow config set llm.routing.analysis openai
devflow config set llm.routing.default openai     # fallback when preferred is unavailable
```

---

## Commands

### `devflow init`
Interactive setup wizard. Guides you step by step through LLM provider selection, API key, model choice, and platform verification. Run once after installing.

```bash
devflow init
```

### `devflow status`
Show repo state, detected platform (GitHub/Azure DevOps), and configured LLM providers.

### `devflow commit [-b <branch>]`
Analyze staged changes, generate a branch name and commit message, wait for approval, then branch → commit → push.

```bash
devflow commit              # uses default base branch (main)
devflow commit -b develop   # targets develop as the merge base
```

### `devflow pr [-b <branch>]`
Generate a Pull Request title and description for the current branch and create it on GitHub or Azure DevOps.

```bash
devflow pr                  # uses default base branch
devflow pr -b develop       # PR targeting develop
devflow pr --base release/1.0
```

### `devflow flow [-b <branch>]`
Full pipeline in one command: branch → commit → push → PR.

```bash
devflow flow                # uses default base branch
devflow flow -b develop
```

### `devflow config <action> [key] [value]`
Manage global configuration stored in `~/.config/devflow/config.json`.

```bash
devflow config set <key> <value>
devflow config get <key>
devflow config delete <key>
devflow config list
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
│       ├── init.ts               # devflow init (setup wizard)
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
│   ├── service.ts                # simple-git wrapper
│   ├── platform.ts              # auto-detect GitHub vs Azure DevOps
│   └── cli-runner.ts            # spawn gh / az CLI commands
├── github/
│   └── service.ts                # GitHub REST API client (PR creation)
├── azure/
│   └── service.ts                # Azure DevOps REST API client (PR creation)
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
npm uninstall -g @dverdeciav/devflow-cli

# If installed via .exe:
Remove-Item -Recurse "$env:LOCALAPPDATA\devflow-cli"
# Then remove %LOCALAPPDATA%\devflow-cli from your user PATH
```

---

## License

MIT
