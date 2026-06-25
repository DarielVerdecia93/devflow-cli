import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'devflow');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

type DeepRecord = { [key: string]: string | DeepRecord };

function readStore(): DeepRecord {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return {};
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeStore(data: DeepRecord): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function getByPath(obj: DeepRecord, keys: string[]): string | undefined {
  let cur: string | DeepRecord = obj;
  for (const k of keys) {
    if (typeof cur !== 'object' || cur === null) return undefined;
    cur = cur[k];
  }
  return typeof cur === 'string' ? cur : undefined;
}

function setByPath(obj: DeepRecord, keys: string[], value: string): void {
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (typeof cur[keys[i]] !== 'object') cur[keys[i]] = {};
    cur = cur[keys[i]] as DeepRecord;
  }
  cur[keys[keys.length - 1]] = value;
}

export function configGet(key: string): string | undefined {
  return getByPath(readStore(), key.split('.'));
}

export function configSet(key: string, value: string): void {
  const store = readStore();
  setByPath(store, key.split('.'), value);
  writeStore(store);
}

export function configList(): DeepRecord {
  return readStore();
}

export function configDelete(key: string): boolean {
  const store = readStore();
  const keys = key.split('.');
  let cur: DeepRecord = store;
  for (let i = 0; i < keys.length - 1; i++) {
    if (typeof cur[keys[i]] !== 'object') return false;
    cur = cur[keys[i]] as DeepRecord;
  }
  if (!(keys[keys.length - 1] in cur)) return false;
  delete cur[keys[keys.length - 1]];
  writeStore(store);
  return true;
}

/** Flatten the store for use as env-var overrides */
export function configToEnv(): Record<string, string> {
  const KEY_MAP: Record<string, string> = {
    'llm.openai.apiKey':      'OPENAI_API_KEY',
    'llm.openai.model':       'OPENAI_MODEL',
    'llm.anthropic.apiKey':   'ANTHROPIC_API_KEY',
    'llm.anthropic.model':    'ANTHROPIC_MODEL',
    'llm.gemini.apiKey':      'GEMINI_API_KEY',
    'llm.gemini.model':       'GEMINI_MODEL',
    'llm.groq.apiKey':        'GROQ_API_KEY',
    'llm.groq.model':         'GROQ_MODEL',
    'llm.routing.commit':     'LLM_COMMIT_PROVIDER',
    'llm.routing.pr':         'LLM_PR_PROVIDER',
    'llm.routing.analysis':   'LLM_ANALYSIS_PROVIDER',
    'llm.routing.default':    'LLM_DEFAULT_PROVIDER',
    'azure.org':              'AZURE_DEVOPS_ORG',
    'azure.project':          'AZURE_DEVOPS_PROJECT',
    'azure.repo':             'AZURE_DEVOPS_REPO',
    'azure.token':            'AZURE_DEVOPS_TOKEN',
    'git.baseBranch':         'GIT_BASE_BRANCH',
  };

  const result: Record<string, string> = {};
  for (const [dotKey, envKey] of Object.entries(KEY_MAP)) {
    const val = configGet(dotKey);
    if (val) result[envKey] = val;
  }
  return result;
}

export { CONFIG_FILE };
