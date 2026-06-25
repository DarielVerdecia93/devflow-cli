import ora from 'ora';
import { gitService } from '../../git/service';
import { llmRouter } from '../../llm/router';
import { azureService } from '../../azure/service';
import { printBanner, printGitStatus, printError, printInfo } from '../../ui/display';
import chalk from 'chalk';

export async function statusCommand(): Promise<void> {
  printBanner();

  const spinner = ora();

  try {
    await gitService.assertRepo();

    spinner.start('Reading repository state...');
    const [status, remoteUrl] = await Promise.all([
      gitService.getStatus(),
      gitService.getRemoteUrl(),
    ]);
    spinner.stop();

    printGitStatus(status);

    if (remoteUrl) {
      printInfo(`Remote: ${remoteUrl}`);
    }

    // Show configured LLM providers
    const providers = llmRouter.getConfiguredProviders();
    console.log(chalk.bold('\n  LLM Providers:'));
    if (providers.length === 0) {
      console.log(chalk.yellow('    None configured — set API keys in .env'));
    } else {
      providers.forEach(p => console.log(chalk.green(`    ✓ ${p}`)));
    }

    // Show Azure DevOps status
    console.log(chalk.bold('\n  Azure DevOps:'));
    if (azureService.isConfigured()) {
      console.log(chalk.green('    ✓ Configured'));
    } else {
      console.log(chalk.yellow('    Not configured (set AZURE_DEVOPS_* vars in .env)'));
    }

    console.log('');

  } catch (err) {
    spinner.stop();
    const msg = err instanceof Error ? err.message : String(err);
    printError(msg);
    process.exitCode = 1;
  }
}
