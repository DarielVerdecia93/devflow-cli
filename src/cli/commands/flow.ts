import ora from 'ora';
import { gitService } from '../../git/service';
import { llmRouter } from '../../llm/router';
import { azureService } from '../../azure/service';
import { LLMProposal } from '../../types';
import {
  printBanner, printProposal, printSuccess, printError, printInfo, printStep,
} from '../../ui/display';
import {
  promptMainAction,
  promptEditBranch,
  promptEditCommit,
  promptEditPR,
  promptEditBaseBranch,
  promptCreatePR,
  promptContinueWithoutStaged,
} from '../../ui/interactive';
import { config } from '../../config';

export async function flowCommand(): Promise<void> {
  printBanner();

  console.log('  Running: branch -> commit -> push -> PR\n');

  const spinner = ora();

  try {
    await gitService.assertRepo();

    spinner.start('Checking repository state...');
    const status = await gitService.getStatus();
    spinner.stop();

    const hasChanges =
      status.staged.length > 0 ||
      status.unstaged.length > 0 ||
      status.untracked.length > 0;

    if (!hasChanges) {
      printError('No changes detected. Nothing to flow.');
      return;
    }

    if (status.staged.length === 0) {
      const shouldStage = await promptContinueWithoutStaged();
      if (!shouldStage) {
        printInfo('Tip: run `git add <files>` to stage changes, then retry.');
        return;
      }
      await gitService.stageAll();
      printInfo('Staged all changes.');
    }

    spinner.start('Analyzing changes with AI...');
    const diff = await gitService.getFullDiff();
    spinner.stop();

    spinner.start('Generating full flow proposal...');
    let llmResult = await llmRouter.generate({ task: 'analysis', diff });
    spinner.succeed(`Proposal ready (${llmResult.provider})`);

    let proposal = llmResult.proposal;
    let baseBranch = config.git.baseBranch;
    const hasPR = azureService.isConfigured();
    let accepted = false;

    while (!accepted) {
      printProposal(proposal, llmResult.provider, hasPR ? baseBranch : undefined);
      const action = await promptMainAction(hasPR);

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
          llmResult = await llmRouter.generate({ task: 'analysis', diff });
          proposal = llmResult.proposal;
          spinner.succeed(`New proposal ready (${llmResult.provider})`);
          break;

        case 'cancel':
          printInfo('Cancelled. No changes made.');
          return;
      }
    }

    const totalSteps = hasPR ? 5 : 4;
    const safeBranch = await gitService.safeBranchName(proposal.branchSuggestion);

    if (safeBranch !== proposal.branchSuggestion) {
      printInfo(`Branch renamed to ${safeBranch} (original already exists)`);
      proposal.branchSuggestion = safeBranch;
    }

    printStep(1, totalSteps, `Creating branch: ${safeBranch}`);
    spinner.start();
    await gitService.createBranch(safeBranch);
    spinner.succeed(`Branch: ${safeBranch}`);

    printStep(2, totalSteps, 'Staging changes...');
    spinner.start();
    await gitService.stageAll();
    spinner.succeed('All changes staged');

    printStep(3, totalSteps, 'Committing...');
    spinner.start();
    await gitService.commit(proposal.commitMessage);
    spinner.succeed(`Committed: "${proposal.commitMessage}"`);

    const hasRemote = await gitService.hasRemote();
    printStep(4, totalSteps, 'Pushing to remote...');
    if (hasRemote) {
      spinner.start();
      await gitService.push(safeBranch);
      spinner.succeed(`Pushed: ${safeBranch}`);
    } else {
      printInfo('No remote configured — skipping push.');
    }

    if (hasPR) {
      printStep(5, totalSteps, 'Creating Pull Request...');
      const wantPR = await promptCreatePR();
      if (wantPR) {
        spinner.start();
        const pr = await azureService.createPullRequest({
          title: proposal.prTitle,
          description: proposal.prDescription,
          sourceBranch: safeBranch,
          targetBranch: baseBranch,
        });
        const url = azureService.buildPRUrl(pr.pullRequestId);
        spinner.succeed(`PR created: #${pr.pullRequestId}`);
        printInfo(`URL: ${url}`);
      } else {
        printInfo('PR skipped.');
      }
    }

    printSuccess('Full flow complete!');

  } catch (err) {
    spinner.stop();
    const msg = err instanceof Error ? err.message : String(err);
    printError(msg);
    process.exitCode = 1;
  }
}
