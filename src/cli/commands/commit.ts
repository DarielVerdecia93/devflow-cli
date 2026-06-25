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

export async function commitCommand(): Promise<void> {
  printBanner();

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
      printError('No changes detected. Nothing to commit.');
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

    if (!diff.trim()) {
      printError('Could not read diff. Make sure you have changes staged.');
      return;
    }

    spinner.start('Generating proposal...');
    let llmResult = await llmRouter.generate({ task: 'commit', diff });
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
          llmResult = await llmRouter.generate({ task: 'commit', diff });
          proposal = llmResult.proposal;
          spinner.succeed(`New proposal ready (${llmResult.provider})`);
          break;

        case 'cancel':
          printInfo('Cancelled. No changes made.');
          return;
      }
    }

    await executeGitFlow(proposal, spinner);

    const wantPR = await promptCreatePR();
    if (wantPR) {
      await createPR(proposal, baseBranch, spinner);
    }

  } catch (err) {
    spinner.stop();
    const msg = err instanceof Error ? err.message : String(err);
    printError(msg);
    process.exitCode = 1;
  }
}

async function executeGitFlow(proposal: LLMProposal, spinner: ReturnType<typeof ora>): Promise<void> {
  const safeBranch = await gitService.safeBranchName(proposal.branchSuggestion);

  if (safeBranch !== proposal.branchSuggestion) {
    printInfo(`Branch renamed to ${safeBranch} (original already exists)`);
    proposal.branchSuggestion = safeBranch;
  }

  printStep(1, 4, `Creating branch: ${safeBranch}`);
  spinner.start();
  await gitService.createBranch(safeBranch);
  spinner.succeed(`Branch created: ${safeBranch}`);

  printStep(2, 4, 'Staging changes...');
  spinner.start();
  await gitService.stageAll();
  spinner.succeed('Changes staged');

  printStep(3, 4, 'Committing...');
  spinner.start();
  await gitService.commit(proposal.commitMessage);
  spinner.succeed(`Committed: "${proposal.commitMessage}"`);

  printStep(4, 4, 'Pushing to remote...');
  const hasRemote = await gitService.hasRemote();
  if (hasRemote) {
    spinner.start();
    await gitService.push(safeBranch);
    spinner.succeed(`Pushed: ${safeBranch}`);
  } else {
    printInfo('No remote configured — skipping push.');
  }

  printSuccess('Git flow complete!');
}

async function createPR(proposal: LLMProposal, baseBranch: string, spinner: ReturnType<typeof ora>): Promise<void> {
  if (!azureService.isConfigured()) {
    printInfo('Azure DevOps not configured. Set credentials in .env to enable PR creation.');
    return;
  }

  spinner.start('Creating Pull Request...');
  try {
    const pr = await azureService.createPullRequest({
      title: proposal.prTitle,
      description: proposal.prDescription,
      sourceBranch: proposal.branchSuggestion,
      targetBranch: baseBranch,
    });

    const url = azureService.buildPRUrl(pr.pullRequestId);
    spinner.succeed(`PR created: #${pr.pullRequestId}`);
    printInfo(`URL: ${url}`);
  } catch (err) {
    spinner.stop();
    const msg = err instanceof Error ? err.message : String(err);
    printError(`PR creation failed: ${msg}`);
  }
}
