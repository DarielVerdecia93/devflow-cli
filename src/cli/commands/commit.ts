import ora from 'ora';
import { gitService } from '../../git/service';
import { llmRouter } from '../../llm/router';
import { githubService } from '../../github/service';
import { azureService } from '../../azure/service';
import { detectPlatform } from '../../git/platform';
import { LLMProposal, PullRequest } from '../../types';
import {
  printBanner, printBranchStep, printCommitStep, printPRStep,
  printSuccess, printError, printInfo, printStep,
} from '../../ui/display';
import {
  promptStepBranch, promptStepCommit, promptStepPR,
  promptEditBranch, promptEditCommit, promptEditPR,
  promptContinueWithoutStaged,
} from '../../ui/interactive';
import { config } from '../../config';

export async function commitCommand(opts: { base?: string; lang?: string } = {}): Promise<void> {
  if (config.devflow.verbosity !== 'minimal') printBanner();
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

    const language = opts.lang ?? config.devflow.language;

    spinner.start('Generating proposal...');
    let llmResult = await llmRouter.generate({ task: 'commit', diff, language });
    spinner.succeed(`Proposal ready (${llmResult.provider})`);
    if (config.devflow.verbosity === 'verbose') {
      printInfo(`Confidence: ${llmResult.proposal.confidenceScore}%  ·  Risk: ${llmResult.proposal.riskLevel}`);
    }

    let proposal = llmResult.proposal;
    const baseBranch = opts.base ?? config.git.baseBranch;

    // ── Step 1: Branch ────────────────────────────────────────────────────────
    let finalBranch = proposal.branchSuggestion;
    while (true) {
      printBranchStep(finalBranch);
      const action = await promptStepBranch();
      if (action === 'accept') break;
      if (action === 'edit') { finalBranch = await promptEditBranch(finalBranch); break; }
      if (action === 'cancel') { printInfo('Cancelled. No changes made.'); return; }
      spinner.start('Regenerating...');
      llmResult = await llmRouter.generate({ task: 'commit', diff, language });
      proposal = llmResult.proposal;
      finalBranch = proposal.branchSuggestion;
      spinner.succeed(`New proposal (${llmResult.provider})`);
    }

    // ── Step 2: Commit message ────────────────────────────────────────────────
    let finalCommit = proposal.commitMessage;
    while (true) {
      printCommitStep(finalCommit);
      const action = await promptStepCommit();
      if (action === 'accept') break;
      if (action === 'edit') { finalCommit = await promptEditCommit(finalCommit); break; }
      if (action === 'cancel') { printInfo('Cancelled. No changes made.'); return; }
      spinner.start('Regenerating...');
      llmResult = await llmRouter.generate({ task: 'commit', diff, language });
      proposal = llmResult.proposal;
      finalCommit = proposal.commitMessage;
      spinner.succeed(`New proposal (${llmResult.provider})`);
    }

    // ── Execute git flow ──────────────────────────────────────────────────────
    proposal.branchSuggestion = finalBranch;
    proposal.commitMessage = finalCommit;
    const usedBranch = await executeGitFlow(proposal, spinner);

    // ── Step 3: PR (optional) ─────────────────────────────────────────────────
    let finalPRTitle = proposal.prTitle;
    let finalPRDesc = proposal.prDescription;

    while (true) {
      printPRStep(finalPRTitle, finalPRDesc, baseBranch);
      const action = await promptStepPR();
      if (action === 'skip') break;
      if (action === 'accept') {
        await createPullRequest(
          { title: finalPRTitle, description: finalPRDesc, sourceBranch: usedBranch, targetBranch: baseBranch },
          spinner,
        );
        break;
      }
      if (action === 'edit') {
        const edited = await promptEditPR(finalPRTitle, finalPRDesc);
        finalPRTitle = edited.title;
        finalPRDesc = edited.description;
        await createPullRequest(
          { title: finalPRTitle, description: finalPRDesc, sourceBranch: usedBranch, targetBranch: baseBranch },
          spinner,
        );
        break;
      }
      spinner.start('Regenerating PR proposal...');
      llmResult = await llmRouter.generate({ task: 'pr', diff, language });
      finalPRTitle = llmResult.proposal.prTitle;
      finalPRDesc = llmResult.proposal.prDescription;
      spinner.succeed(`New PR proposal (${llmResult.provider})`);
    }

  } catch (err) {
    spinner.stop();
    printError(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

async function executeGitFlow(proposal: LLMProposal, spinner: ReturnType<typeof ora>): Promise<string> {
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
  return safeBranch;
}

async function createPullRequest(pr: PullRequest, spinner: ReturnType<typeof ora>): Promise<void> {
  spinner.start('Creating Pull Request...');
  try {
    const platform = await detectPlatform();
    let prUrl: string;
    let prId: string;

    if (platform === 'github') {
      const result = await githubService.createPullRequest(pr);
      prUrl = await githubService.buildPRUrl(result.number);
      prId = `#${result.number}`;
    } else if (platform === 'azure') {
      const result = await azureService.createPullRequest(pr);
      prUrl = await azureService.buildPRUrl(result.pullRequestId);
      prId = `#${result.pullRequestId}`;
    } else {
      spinner.stop();
      printError('Could not detect platform (GitHub or Azure DevOps) from git remote URL.');
      return;
    }

    spinner.succeed(`PR created: ${prId}`);
    printInfo(`URL: ${prUrl}`);
  } catch (err) {
    spinner.stop();
    printError(`PR creation failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
