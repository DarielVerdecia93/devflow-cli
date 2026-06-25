import ora from 'ora';
import { gitService } from '../../git/service';
import { llmRouter } from '../../llm/router';
import { githubService } from '../../github/service';
import { azureService } from '../../azure/service';
import { detectPlatform } from '../../git/platform';
import { LLMProposal } from '../../types';
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

export async function flowCommand(opts: { base?: string; lang?: string } = {}): Promise<void> {
  if (config.devflow.verbosity !== 'minimal') {
    printBanner();
    console.log('  Running: branch → commit → push → PR\n');
  }

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

    const language = opts.lang ?? config.devflow.language;

    spinner.start('Generating full flow proposal...');
    let llmResult = await llmRouter.generate({ task: 'analysis', diff, language });
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
      llmResult = await llmRouter.generate({ task: 'analysis', diff, language });
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
      llmResult = await llmRouter.generate({ task: 'analysis', diff, language });
      proposal = llmResult.proposal;
      finalCommit = proposal.commitMessage;
      spinner.succeed(`New proposal (${llmResult.provider})`);
    }

    // ── Step 3: PR proposal ───────────────────────────────────────────────────
    let finalPRTitle = proposal.prTitle;
    let finalPRDesc = proposal.prDescription;
    let createPRFlag = false;

    while (true) {
      printPRStep(finalPRTitle, finalPRDesc, baseBranch);
      const action = await promptStepPR();
      if (action === 'skip') break;
      if (action === 'accept') { createPRFlag = true; break; }
      if (action === 'edit') {
        const edited = await promptEditPR(finalPRTitle, finalPRDesc);
        finalPRTitle = edited.title;
        finalPRDesc = edited.description;
        createPRFlag = true;
        break;
      }
      spinner.start('Regenerating PR proposal...');
      llmResult = await llmRouter.generate({ task: 'pr', diff, language });
      finalPRTitle = llmResult.proposal.prTitle;
      finalPRDesc = llmResult.proposal.prDescription;
      spinner.succeed(`New PR proposal (${llmResult.provider})`);
    }

    // ── Execute git flow ──────────────────────────────────────────────────────
    proposal.branchSuggestion = finalBranch;
    proposal.commitMessage = finalCommit;
    const safeBranch = await gitService.safeBranchName(finalBranch);

    if (safeBranch !== finalBranch) {
      printInfo(`Branch renamed to ${safeBranch} (original already exists)`);
    }

    const totalSteps = createPRFlag ? 5 : 4;

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
    await gitService.commit(finalCommit);
    spinner.succeed(`Committed: "${finalCommit}"`);

    printStep(4, totalSteps, 'Pushing to remote...');
    const hasRemote = await gitService.hasRemote();
    if (hasRemote) {
      spinner.start();
      await gitService.push(safeBranch);
      spinner.succeed(`Pushed: ${safeBranch}`);
    } else {
      printInfo('No remote configured — skipping push.');
    }

    if (createPRFlag) {
      printStep(5, totalSteps, 'Creating Pull Request...');
      spinner.start('Creating Pull Request...');
      try {
        const platform = await detectPlatform();
        let prUrl: string;
        let prId: string;

        if (platform === 'github') {
          const pr = await githubService.createPullRequest({
            title: finalPRTitle,
            description: finalPRDesc,
            sourceBranch: safeBranch,
            targetBranch: baseBranch,
          });
          prUrl = await githubService.buildPRUrl(pr.number);
          prId = `#${pr.number}`;
        } else if (platform === 'azure') {
          const pr = await azureService.createPullRequest({
            title: finalPRTitle,
            description: finalPRDesc,
            sourceBranch: safeBranch,
            targetBranch: baseBranch,
          });
          prUrl = await azureService.buildPRUrl(pr.pullRequestId);
          prId = `#${pr.pullRequestId}`;
        } else {
          spinner.stop();
          printError('Could not detect platform (GitHub or Azure DevOps) from git remote URL.');
          printSuccess('Full flow complete (no PR)!');
          return;
        }

        spinner.succeed(`PR created: ${prId}`);
        printInfo(`URL: ${prUrl}`);
      } catch (err) {
        spinner.stop();
        printError(`PR creation failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    printSuccess('Full flow complete!');

  } catch (err) {
    spinner.stop();
    printError(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}
