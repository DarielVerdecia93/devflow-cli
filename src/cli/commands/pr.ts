import ora from 'ora';
import { gitService } from '../../git/service';
import { detectPlatform } from '../../git/platform';
import { llmRouter } from '../../llm/router';
import { githubService } from '../../github/service';
import { azureService } from '../../azure/service';
import { printBanner, printPRStep, printSuccess, printError, printInfo } from '../../ui/display';
import {
  promptStepPR,
  promptEditPR,
  promptEditBaseBranch,
} from '../../ui/interactive';
import { config } from '../../config';

export async function prCommand(opts: { base?: string } = {}): Promise<void> {
  printBanner();

  const spinner = ora();

  try {
    await gitService.assertRepo();

    spinner.start('Detecting platform...');
    const platform = await detectPlatform();
    spinner.stop();

    if (platform === 'unknown') {
      printError(
        'Could not detect platform from git remote URL.\n' +
        '  Make sure your remote points to GitHub (github.com) or Azure DevOps (dev.azure.com).'
      );
      return;
    }

    const cliName = platform === 'github' ? 'gh' : 'az';
    const installed = platform === 'github' ? githubService.isInstalled() : azureService.isInstalled();
    if (!installed) {
      if (platform === 'github') {
        printError('gh CLI is not installed.\n  Install it from: https://cli.github.com\n  Then run: gh auth login');
      } else {
        printError('az CLI is not installed.\n  Install it from: https://aka.ms/installazurecliwindows\n  Then run: az extension add --name azure-devops && az login');
      }
      return;
    }

    spinner.start('Reading branch and diff...');
    const [branch, diff] = await Promise.all([
      gitService.getCurrentBranch(),
      gitService.getFullDiff(),
    ]);
    spinner.stop();

    spinner.start('Generating PR proposal...');
    let llmResult = await llmRouter.generate({ task: 'pr', diff });
    spinner.succeed(`Proposal ready (${llmResult.provider})`);

    let finalPRTitle = llmResult.proposal.prTitle;
    let finalPRDesc = llmResult.proposal.prDescription;
    let baseBranch = opts.base ?? config.git.baseBranch;

    // ── Confirm PR ────────────────────────────────────────────────────────────
    while (true) {
      printPRStep(finalPRTitle, finalPRDesc, baseBranch);
      const action = await promptStepPR();

      if (action === 'skip') {
        printInfo('Cancelled. No PR created.');
        return;
      }

      if (action === 'accept') break;

      if (action === 'edit') {
        const edited = await promptEditPR(finalPRTitle, finalPRDesc);
        finalPRTitle = edited.title;
        finalPRDesc = edited.description;
        // also offer base branch edit
        const newBase = await promptEditBaseBranch(baseBranch);
        baseBranch = newBase;
        break;
      }

      // regenerate
      spinner.start('Regenerating...');
      llmResult = await llmRouter.generate({ task: 'pr', diff });
      finalPRTitle = llmResult.proposal.prTitle;
      finalPRDesc = llmResult.proposal.prDescription;
      spinner.succeed(`New proposal (${llmResult.provider})`);
    }

    // ── Create PR ─────────────────────────────────────────────────────────────
    spinner.start(`Creating Pull Request via ${cliName}...`);
    let prUrl: string;
    let prId: string;

    if (platform === 'github') {
      const pr = await githubService.createPullRequest({
        title: finalPRTitle,
        description: finalPRDesc,
        sourceBranch: branch,
        targetBranch: baseBranch,
      });
      prUrl = await githubService.buildPRUrl(pr.number);
      prId = `#${pr.number}`;
    } else {
      const pr = await azureService.createPullRequest({
        title: finalPRTitle,
        description: finalPRDesc,
        sourceBranch: branch,
        targetBranch: baseBranch,
      });
      prUrl = await azureService.buildPRUrl(pr.pullRequestId);
      prId = `#${pr.pullRequestId}`;
    }

    spinner.succeed(`PR created: ${prId}`);
    printSuccess('Pull Request created successfully!');
    printInfo(`URL: ${prUrl}`);

  } catch (err) {
    spinner.stop();
    const msg = err instanceof Error ? err.message : String(err);
    printError(msg);
    process.exitCode = 1;
  }
}
