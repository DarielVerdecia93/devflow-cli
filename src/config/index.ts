import * as dotenv from 'dotenv';
import { ProviderName, TaskType } from '../types';
import { configToEnv } from './store';

// Priority: env vars > local .env > ~/.config/devflow/config.json
const globalConfig = configToEnv();
for (const [k, v] of Object.entries(globalConfig)) {
  if (!process.env[k]) process.env[k] = v;
}
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

export const config = {
  llm: {
    openai: {
      apiKey: optional('OPENAI_API_KEY'),
      model: optional('OPENAI_MODEL', 'gpt-4o'),
    },
    anthropic: {
      apiKey: optional('ANTHROPIC_API_KEY'),
      model: optional('ANTHROPIC_MODEL', 'claude-sonnet-4-6'),
    },
    gemini: {
      apiKey: optional('GEMINI_API_KEY'),
      model: optional('GEMINI_MODEL', 'gemini-1.5-pro'),
    },
    groq: {
      apiKey: optional('GROQ_API_KEY'),
      model: optional('GROQ_MODEL', 'llama3-70b-8192'),
    },
    routing: {
      commit: optional('LLM_COMMIT_PROVIDER', 'groq') as ProviderName,
      pr: optional('LLM_PR_PROVIDER', 'anthropic') as ProviderName,
      analysis: optional('LLM_ANALYSIS_PROVIDER', 'openai') as ProviderName,
      default: optional('LLM_DEFAULT_PROVIDER', 'openai') as ProviderName,
    },
  },
  azure: {
    org: optional('AZURE_DEVOPS_ORG'),
    project: optional('AZURE_DEVOPS_PROJECT'),
    repo: optional('AZURE_DEVOPS_REPO'),
    token: optional('AZURE_DEVOPS_TOKEN'),
  },
  git: {
    baseBranch: optional('GIT_BASE_BRANCH', 'main'),
  },
};

export function getProviderForTask(task: TaskType): ProviderName {
  return config.llm.routing[task] ?? config.llm.routing.default;
}

export function isAzureConfigured(): boolean {
  return !!(config.azure.org && config.azure.project && config.azure.repo && config.azure.token);
}

export function isProviderConfigured(provider: ProviderName): boolean {
  return !!(config.llm[provider]?.apiKey);
}
