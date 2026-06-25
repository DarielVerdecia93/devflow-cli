import ora from 'ora';
import { gitService } from '../../git/service';
import { llmRouter } from '../../llm/router';
import { azureService } from '../../azure/service';
import { printBanner, printGitStatus, printError, printInfo } from '../../ui/display';
import { detectPlatform } from '../../git/platform';
import { githubService } from '../../github/service';
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

    // Show platform status
    const platform = await detectPlatform();

    console.log(chalk.bold('\n  Git Platform:'));
    if (platform === 'github') {
      console.log(chalk.cyan('    GitHub detected'));
      if (githubService.isInstalled()) {
        console.log(chalk.green('    ✓ gh CLI installed'));
      } else {
        console.log(chalk.red('    ✗ gh CLI not found — install from: https://cli.github.com'));
      }
    } else if (platform === 'azure') {
      console.log(chalk.cyan('    Azure DevOps detected'));
      if (azureService.isInstalled()) {
        console.log(chalk.green('    ✓ az CLI installed'));
      } else {
        console.log(chalk.red('    ✗ az CLI not found — install from: https://aka.ms/installazurecliwindows'));
      }
    } else {
      console.log(chalk.yellow('    Unknown platform (no GitHub or Azure DevOps remote detected)'));
    }

    console.log('');

  } catch (err) {
    spinner.stop();
    const msg = err instanceof Error ? err.message : String(err);
    printError(msg);
    process.exitCode = 1;
  }
}
