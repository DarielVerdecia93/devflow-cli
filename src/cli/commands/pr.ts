import ora from 'ora';
import { gitService } from '../../git/service';
import { llmRouter } from '../../llm/router';
import { azureService } from '../../azure/service';
import { printBanner, printProposal, printSuccess, printError, printInfo } from '../../ui/display';
import {
  promptMainAction,
  promptEditBranch,
  promptEditCommit,
  promptEditPR,
  promptEditBaseBranch,
} from '../../ui/interactive';
import { config } from '../../config';

export async function prCommand(): Promise<void> {
  printBanner();

  const spinner = ora();

  try {
    await gitService.assertRepo();

    if (!azureService.isConfigured()) {
      printError(
        'Azure DevOps not configured.\n' +
        '  Set AZURE_DEVOPS_ORG, AZURE_DEVOPS_PROJECT, AZURE_DEVOPS_REPO, AZURE_DEVOPS_TOKEN in .env'
      );
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

    let proposal = llmResult.proposal;
    let baseBranch = config.git.baseBranch;
    let accepted = false;

    while (!accepted) {
      printProposal(proposal, llmResult.provider, baseBranch);
      const action = await promptMainAction(true);

      switch (action) {
        case 'accept':
          accepted = true;
          break;

        case 'edit_branch':
          proposal.branchSuggestion = await promptEditBranch(proposal.branchSuggestion);
          break;

        case 'edit_commit':
          proposal.commitMessage = await promptEditCommit(proposal.commitMessage);
          break;

        case 'edit_pr': {
          const edited = await promptEditPR(proposal.prTitle, proposal.prDescription);
          proposal.prTitle = edited.title;
          proposal.prDescription = edited.description;
          break;
        }

        case 'edit_base':
          baseBranch = await promptEditBaseBranch(baseBranch);
          break;

        case 'regenerate':
          spinner.start('Regenerating...');
          llmResult = await llmRouter.generate({ task: 'pr', diff });
          proposal = llmResult.proposal;
          spinner.succeed(`New proposal ready (${llmResult.provider})`);
          break;

        case 'cancel':
          printInfo('Cancelled. No PR created.');
          return;
      }
    }

    spinner.start('Creating Pull Request...');
    const pr = await azureService.createPullRequest({
      title: proposal.prTitle,
      description: proposal.prDescription,
      sourceBranch: branch,
      targetBranch: baseBranch,
    });

    const url = azureService.buildPRUrl(pr.pullRequestId);
    spinner.succeed(`PR created: #${pr.pullRequestId}`);
    printSuccess('Pull Request created successfully!');
    printInfo(`URL: ${url}`);

  } catch (err) {
    spinner.stop();
    const msg = err instanceof Error ? err.message : String(err);
    printError(msg);
    process.exitCode = 1;
  }
}
