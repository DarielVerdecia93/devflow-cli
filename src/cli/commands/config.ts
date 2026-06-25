import chalk from 'chalk';
import { configGet, configSet, configDelete, configList, CONFIG_FILE } from '../../config/store';

const MASKED_KEYS = ['apiKey', 'token'];

function mask(key: string, value: string): string {
  const leaf = key.split('.').pop() ?? '';
  if (MASKED_KEYS.includes(leaf) && value.length > 6) {
    return value.slice(0, 4) + '****' + value.slice(-2);
  }
  return value;
}

function printFlat(obj: object, prefix = ''): void {
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null) {
      printFlat(v, fullKey);
    } else {
      const display = mask(fullKey, String(v));
      console.log(`  ${chalk.cyan(fullKey)} = ${chalk.white(display)}`);
    }
  }
}

const VALID_KEYS = [
  'llm.openai.apiKey', 'llm.openai.model',
  'llm.anthropic.apiKey', 'llm.anthropic.model',
  'llm.gemini.apiKey', 'llm.gemini.model',
  'llm.groq.apiKey', 'llm.groq.model',
  'llm.routing.commit', 'llm.routing.pr', 'llm.routing.analysis', 'llm.routing.default',
  'git.baseBranch',
];

export async function configCommand(
  action: string,
  keyArg?: string,
  valueArg?: string,
): Promise<void> {
  switch (action) {
    case 'set': {
      if (!keyArg || !valueArg) {
        console.error(chalk.red('Usage: devflow config set <key> <value>'));
        console.error(chalk.gray('Example: devflow config set llm.openai.apiKey sk-xxx'));
        process.exitCode = 1;
        return;
      }
      if (!VALID_KEYS.includes(keyArg)) {
        console.error(chalk.red(`Unknown key: ${keyArg}`));
        console.error(chalk.gray('Valid keys:\n  ' + VALID_KEYS.join('\n  ')));
        process.exitCode = 1;
        return;
      }
      configSet(keyArg, valueArg);
      console.log(chalk.green(`  ✓ ${keyArg} saved`));
      console.log(chalk.gray(`  Config: ${CONFIG_FILE}`));
      break;
    }

    case 'get': {
      if (!keyArg) {
        console.error(chalk.red('Usage: devflow config get <key>'));
        process.exitCode = 1;
        return;
      }
      const val = configGet(keyArg);
      if (val === undefined) {
        console.log(chalk.yellow(`  ${keyArg} is not set`));
      } else {
        console.log(`  ${chalk.cyan(keyArg)} = ${chalk.white(mask(keyArg, val))}`);
      }
      break;
    }

    case 'delete':
    case 'unset': {
      if (!keyArg) {
        console.error(chalk.red('Usage: devflow config delete <key>'));
        process.exitCode = 1;
        return;
      }
      const deleted = configDelete(keyArg);
      if (deleted) {
        console.log(chalk.green(`  ✓ ${keyArg} removed`));
      } else {
        console.log(chalk.yellow(`  ${keyArg} was not set`));
      }
      break;
    }

    case 'list':
    default: {
      const store = configList();
      if (Object.keys(store).length === 0) {
        console.log(chalk.yellow('  No config set. Use: devflow config set <key> <value>'));
        console.log(chalk.gray('  Valid keys:\n    ' + VALID_KEYS.join('\n    ')));
      } else {
        console.log(chalk.bold('\n  DevFlow Config') + chalk.gray(` (${CONFIG_FILE})\n`));
        printFlat(store);
        console.log('');
      }
      break;
    }
  }
}
