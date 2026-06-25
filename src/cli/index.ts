#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { commitCommand } from './commands/commit';
import { prCommand } from './commands/pr';
import { flowCommand } from './commands/flow';
import { statusCommand } from './commands/status';
import { configCommand } from './commands/config';

const program = new Command();

program
  .name('devflow')
  .description('AI-powered Git + Azure DevOps CLI with human-in-the-loop control')
  .version('1.0.0');

program
  .command('commit')
  .description('Analyze changes, generate branch/commit proposal, and execute with approval')
  .action(commitCommand);

program
  .command('pr')
  .description('Generate a Pull Request title and description for the current branch')
  .action(prCommand);

program
  .command('flow')
  .description('Execute full flow: branch → commit → push → PR')
  .action(flowCommand);

program
  .command('status')
  .description('Show repository status and configured integrations')
  .action(statusCommand);

program
  .command('config <action> [key] [value]')
  .description('Manage global config (~/.config/devflow/config.json)')
  .addHelpText('after', `
Actions:
  set <key> <value>   Save a config value
  get <key>           Print a config value
  delete <key>        Remove a config value
  list                Show all config (default)

Keys:
  llm.openai.apiKey      llm.anthropic.apiKey
  llm.gemini.apiKey      llm.groq.apiKey
  azure.org              azure.project
  azure.repo             azure.token
  git.baseBranch         llm.routing.commit`)
  .action(configCommand);

program.parse(process.argv);
