#!/usr/bin/env node
import { Command } from 'commander';
import { commitCommand } from './commands/commit';
import { prCommand } from './commands/pr';
import { flowCommand } from './commands/flow';
import { statusCommand } from './commands/status';
import { configCommand } from './commands/config';
import { initCommand } from './commands/init';

const program = new Command();

program
  .name('devflow')
  .description('AI-powered Git CLI with human-in-the-loop control. Works with GitHub and Azure DevOps.')
  .version('1.1.0')
  .addHelpText('after', `
First time? Run the setup wizard:
  $ devflow init

  Or configure manually:
  1. devflow config set llm.groq.apiKey gsk_...
  2. gh auth login   (GitHub)  /  az login  (Azure DevOps)
  3. devflow status

Commands:
  devflow commit [-b <branch>]    analyze → propose → approve → push
  devflow pr     [-b <branch>]    generate PR on GitHub or Azure DevOps
  devflow flow   [-b <branch>]    full pipeline: branch → commit → push → PR
  devflow status                  repo state, platform detection, LLM providers
  devflow config <action> [key]   manage global config

  For details on a specific command:
    devflow commit --help
    devflow pr --help
    devflow flow --help
    devflow config --help     (shows all available keys and models)
`);

program
  .command('commit')
  .description('Analyze staged changes, propose branch + commit, wait for approval, then push')
  .option('-b, --base <branch>', 'base branch to merge into (default: main or git.baseBranch config)')
  .addHelpText('after', `
How it works:
  1. Reads your git diff (staged + unstaged)
  2. Sends it to the configured LLM (default: Groq)
  3. Proposes a branch name and commit message
  4. Shows an interactive menu — nothing runs until you approve
  5. Creates the branch, commits, and pushes

Options after proposal:
  Accept all          execute everything as proposed
  Edit branch name    change the branch name before creating
  Edit commit message tweak the commit message
  Regenerate          ask the AI to try again
  Cancel              exit without touching anything

Examples:
  $ devflow commit
  $ devflow commit --base develop
  $ devflow commit -b release/2.0
`)
  .action(commitCommand);

program
  .command('pr')
  .description('Generate a Pull Request for the current branch and create it on GitHub or Azure DevOps')
  .option('-b, --base <branch>', 'base branch to merge into (default: main or git.baseBranch config)')
  .addHelpText('after', `
How it works:
  1. Reads the current branch and its diff against the base branch
  2. Sends it to the configured LLM (default: Anthropic)
  3. Proposes a PR title and description
  4. Shows an interactive menu — nothing is created until you approve
  5. Creates the PR on GitHub or Azure DevOps (auto-detected from git remote)

Platform detection:
  GitHub remote     → PR created via gh CLI     (run: gh auth login)
  Azure DevOps      → PR created via az CLI     (run: az login)
  org/project/repo  → auto-detected from the remote URL, no manual setup needed

Examples:
  $ devflow pr
  $ devflow pr --base develop
  $ devflow pr -b release/1.0
`)
  .action(prCommand);

program
  .command('flow')
  .description('Full pipeline in one command: branch → commit → push → PR')
  .option('-b, --base <branch>', 'base branch to merge into (default: main or git.baseBranch config)')
  .addHelpText('after', `
How it works:
  1. Reads your git diff and analyzes it with AI
  2. Proposes branch name, commit message, PR title and description
  3. Shows an interactive menu — you review and approve each step
  4. Creates the branch, commits, pushes, and opens the PR

Same approval menu as devflow commit — nothing executes without your ok.

Examples:
  $ devflow flow
  $ devflow flow --base develop
  $ devflow flow -b release/2.0
`)
  .action(flowCommand);

program
  .command('init')
  .description('Interactive setup wizard — configure your LLM provider step by step')
  .action(initCommand);

program
  .command('status')
  .description('Show repo state, detected platform, and configured LLM providers')
  .addHelpText('after', `
Shows:
  - Current branch and file changes (staged / unstaged / untracked)
  - Git remote URL
  - Detected platform: GitHub or Azure DevOps (auto-detected from remote URL)
  - Platform token status (configured or missing)
  - Configured LLM providers (which API keys are set)

Example:
  $ devflow status
`)
  .action(statusCommand);

program
  .command('config <action> [key] [value]')
  .description('Manage global config stored in ~/.config/devflow/config.json')
  .addHelpText('before', `
Available keys and their equivalent .env variable:

  LLM API keys (at least one required):
    llm.openai.apiKey        → OPENAI_API_KEY        (sk-...)
    llm.anthropic.apiKey     → ANTHROPIC_API_KEY     (sk-ant-...)
    llm.groq.apiKey          → GROQ_API_KEY          (gsk_...)
    llm.gemini.apiKey        → GEMINI_API_KEY        (AIza...)

  Models (optional — defaults shown):
    llm.openai.model         → OPENAI_MODEL          default: gpt-4o
                               options: gpt-4o, gpt-4o-mini, gpt-4-turbo
    llm.anthropic.model      → ANTHROPIC_MODEL       default: claude-sonnet-4-6
                               options: claude-opus-4-8, claude-sonnet-4-6, claude-haiku-4-5-20251001
    llm.groq.model           → GROQ_MODEL            default: llama-3.3-70b-versatile
                               options: llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768
    llm.gemini.model         → GEMINI_MODEL          default: gemini-2.0-flash
                               options: gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash

  Other:
    git.baseBranch           → GIT_BASE_BRANCH       default: main

  LLM routing (optional):
    llm.routing.commit       → LLM_COMMIT_PROVIDER   default: groq
    llm.routing.pr           → LLM_PR_PROVIDER       default: anthropic
    llm.routing.analysis     → LLM_ANALYSIS_PROVIDER default: openai
    llm.routing.default      → LLM_DEFAULT_PROVIDER  default: openai
    options: groq | openai | anthropic | gemini

  Note: GitHub and Azure DevOps auth is handled by gh/az CLIs — no tokens needed.
`)
  .addHelpText('after', `
Actions:
  set <key> <value>    save a value
  get <key>            read a value
  delete <key>         remove a value
  list                 show all (tokens masked)

Examples:
  $ devflow config set llm.groq.apiKey gsk_...
  $ devflow config set llm.groq.model llama-3.1-8b-instant
  $ devflow config set git.baseBranch develop
  $ devflow config get llm.groq.apiKey
  $ devflow config delete llm.openai.apiKey
  $ devflow config list
`)
  .action(configCommand);

program.parse(process.argv);
