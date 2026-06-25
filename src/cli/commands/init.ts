import inquirer from 'inquirer';
import chalk from 'chalk';
import { configSet, configGet } from '../../config/store';
import { detectPlatform } from '../../git/platform';
import { isInstalled } from '../../git/cli-runner';

const PROVIDERS = [
  { name: 'Groq       (fast, free tier)                 → gsk_...', value: 'groq' },
  { name: 'OpenAI     (GPT-4o)                          → sk-...', value: 'openai' },
  { name: 'Anthropic  (Claude)                          → sk-ant-...', value: 'anthropic' },
  { name: 'Gemini     (Google)                          → AIza...', value: 'gemini' },
];

const MODELS: Record<string, { name: string; value: string }[]> = {
  groq: [
    { name: 'llama-3.3-70b-versatile  (recommended)', value: 'llama-3.3-70b-versatile' },
    { name: 'llama-3.1-8b-instant     (fastest)',      value: 'llama-3.1-8b-instant' },
    { name: 'mixtral-8x7b-32768',                      value: 'mixtral-8x7b-32768' },
  ],
  openai: [
    { name: 'gpt-4o          (recommended)', value: 'gpt-4o' },
    { name: 'gpt-4o-mini     (faster/cheaper)', value: 'gpt-4o-mini' },
    { name: 'gpt-4-turbo',                    value: 'gpt-4-turbo' },
  ],
  anthropic: [
    { name: 'claude-sonnet-4-6         (recommended)', value: 'claude-sonnet-4-6' },
    { name: 'claude-opus-4-8           (most capable)', value: 'claude-opus-4-8' },
    { name: 'claude-haiku-4-5-20251001 (fastest)',     value: 'claude-haiku-4-5-20251001' },
  ],
  gemini: [
    { name: 'gemini-2.0-flash  (recommended)', value: 'gemini-2.0-flash' },
    { name: 'gemini-1.5-pro',                  value: 'gemini-1.5-pro' },
    { name: 'gemini-1.5-flash  (faster)',      value: 'gemini-1.5-flash' },
  ],
};

const LANGUAGES = [
  { name: 'English    (en)  — recommended, best LLM support', value: 'en' },
  { name: 'Spanish    (es)',                                   value: 'es' },
  { name: 'Portuguese (pt)',                                   value: 'pt' },
  { name: 'French     (fr)',                                   value: 'fr' },
  { name: 'German     (de)',                                   value: 'de' },
  { name: 'Italian    (it)',                                   value: 'it' },
  { name: 'Chinese    (zh)',                                   value: 'zh' },
  { name: 'Japanese   (ja)',                                   value: 'ja' },
  { name: 'Korean     (ko)',                                   value: 'ko' },
  { name: 'Russian    (ru)',                                   value: 'ru' },
];

const VERBOSITY_OPTIONS = [
  { name: 'normal   — proposals + key steps                  (recommended)', value: 'normal' },
  { name: 'minimal  — only prompts and errors, no banner',                   value: 'minimal' },
  { name: 'verbose  — full output with confidence score and risk level',     value: 'verbose' },
];

function printStep(n: number, total: number, title: string) {
  console.log(`\n${chalk.cyan(`  Step ${n}/${total}`)} ${chalk.bold(title)}`);
  console.log(chalk.gray('  ' + '─'.repeat(48)));
}

function printOk(msg: string) {
  console.log(chalk.green(`  ✓ ${msg}`));
}

function printWarn(msg: string) {
  console.log(chalk.yellow(`  ! ${msg}`));
}

export async function initCommand(): Promise<void> {
  console.log('');
  console.log(chalk.cyan('  ╔══════════════════════════════════════════════╗'));
  console.log(chalk.cyan('  ║        DevFlow AI CLI — Setup Wizard         ║'));
  console.log(chalk.cyan('  ╚══════════════════════════════════════════════╝'));
  console.log('');
  console.log(chalk.gray('  This wizard will configure your LLM provider and'));
  console.log(chalk.gray('  save everything to ~/.config/devflow/config.json'));
  console.log('');

  const TOTAL_STEPS = 6;

  // ── Step 1: Choose provider ────────────────────────────────────────────────
  printStep(1, TOTAL_STEPS, 'Choose your LLM provider');
  console.log(chalk.gray('  This is the AI that will analyze your code and generate proposals.\n'));

  const { provider } = await inquirer.prompt([{
    type: 'list',
    name: 'provider',
    message: 'Which LLM provider do you want to use?',
    choices: PROVIDERS,
  }]);

  // ── Step 2: API key ────────────────────────────────────────────────────────
  printStep(2, TOTAL_STEPS, 'Enter your API key');

  const keyLinks: Record<string, string> = {
    groq:      'https://console.groq.com/keys',
    openai:    'https://platform.openai.com/account/api-keys',
    anthropic: 'https://console.anthropic.com/settings/keys',
    gemini:    'https://aistudio.google.com/app/apikey',
  };

  console.log(chalk.gray(`  Get your key at: ${keyLinks[provider]}\n`));

  const existingKey = configGet(`llm.${provider}.apiKey`);
  if (existingKey) {
    console.log(chalk.gray(`  Current key: ${existingKey.slice(0, 4)}****${existingKey.slice(-2)}`));
  }

  const { apiKey } = await inquirer.prompt([{
    type: 'password',
    name: 'apiKey',
    message: `Paste your ${provider} API key:`,
    mask: '*',
    validate: (val: string) => val.trim().length > 10 || 'Key seems too short — please check it',
  }]);

  // ── Step 3: Choose model ───────────────────────────────────────────────────
  printStep(3, TOTAL_STEPS, 'Choose a model');
  console.log(chalk.gray('  The first option is the recommended default.\n'));

  const { model } = await inquirer.prompt([{
    type: 'list',
    name: 'model',
    message: `Which ${provider} model do you want to use?`,
    choices: MODELS[provider],
  }]);

  // ── Step 4: Base branch ────────────────────────────────────────────────────
  printStep(4, TOTAL_STEPS, 'Default base branch');
  console.log(chalk.gray('  This is the branch PRs will target by default (can be overridden with -b).\n'));

  const { baseBranch } = await inquirer.prompt([{
    type: 'input',
    name: 'baseBranch',
    message: 'Default base branch:',
    default: configGet('git.baseBranch') ?? 'main',
  }]);

  // ── Step 5: Language ──────────────────────────────────────────────────────
  printStep(5, TOTAL_STEPS, 'Output language');
  console.log(chalk.gray('  Language for branch slugs, commit messages, PR titles and descriptions.'));
  console.log(chalk.gray('  Can be overridden per command with --lang <iso>.\n'));

  const { language } = await inquirer.prompt([{
    type: 'list',
    name: 'language',
    message: 'Default output language:',
    choices: LANGUAGES,
    default: configGet('devflow.language') ?? 'en',
  }]);

  // ── Step 6: Verbosity ─────────────────────────────────────────────────────
  printStep(6, TOTAL_STEPS, 'Verbosity level');
  console.log(chalk.gray('  Controls how much output DevFlow shows during operations.\n'));

  const { verbosity } = await inquirer.prompt([{
    type: 'list',
    name: 'verbosity',
    message: 'Output verbosity:',
    choices: VERBOSITY_OPTIONS,
    default: configGet('devflow.verbosity') ?? 'normal',
  }]);

  // ── Save ───────────────────────────────────────────────────────────────────
  console.log('\n');
  configSet(`llm.${provider}.apiKey`, apiKey.trim());
  configSet(`llm.${provider}.model`, model);
  configSet('git.baseBranch', baseBranch);
  configSet('devflow.language', language);
  configSet('devflow.verbosity', verbosity);
  printOk(`${provider} API key saved`);
  printOk(`Model: ${model}`);
  printOk(`Base branch: ${baseBranch}`);
  printOk(`Language: ${language}`);
  printOk(`Verbosity: ${verbosity}`);

  // ── Platform check ─────────────────────────────────────────────────────────
  console.log(chalk.bold('\n  Git Platform'));
  console.log(chalk.gray('  ' + '─'.repeat(48)));

  let platform: string;
  try {
    platform = await detectPlatform();
  } catch {
    platform = 'unknown';
  }

  if (platform === 'github') {
    const ghOk = isInstalled('gh');
    console.log(chalk.cyan('  GitHub remote detected'));
    if (ghOk) {
      printOk('gh CLI is installed — make sure you ran: gh auth login');
    } else {
      printWarn('gh CLI not found — install from: https://cli.github.com');
      printWarn('Then run: gh auth login');
    }
  } else if (platform === 'azure') {
    const azOk = isInstalled('az');
    console.log(chalk.cyan('  Azure DevOps remote detected'));
    if (azOk) {
      printOk('az CLI is installed — make sure you ran: az login');
    } else {
      printWarn('az CLI not found — install from: https://aka.ms/installazurecliwindows');
      printWarn('Then run: az extension add --name azure-devops && az login');
    }
  } else {
    console.log(chalk.gray('  No Azure DevOps or GitHub remote detected (run from inside a repo)'));
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  console.log('');
  console.log(chalk.green('  ╔══════════════════════════════════════════════╗'));
  console.log(chalk.green('  ║              Setup complete!                 ║'));
  console.log(chalk.green('  ╚══════════════════════════════════════════════╝'));
  console.log('');
  console.log('  You\'re ready to go:');
  console.log(chalk.cyan('    devflow status    ') + chalk.gray('verify everything'));
  console.log(chalk.cyan('    devflow commit    ') + chalk.gray('analyze → propose → push'));
  console.log(chalk.cyan('    devflow flow      ') + chalk.gray('full pipeline'));
  console.log('');
}
