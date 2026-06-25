import chalk from 'chalk';
import { GitStatus, LLMProposal } from '../types';

const RISK_COLOR = {
  low: chalk.green,
  medium: chalk.yellow,
  high: chalk.red,
};

export function printBanner(): void {
  console.log(chalk.cyan.bold('\n  DevFlow AI CLI'));
  console.log(chalk.gray('  AI-powered Git workflow with human control\n'));
}

export function printProposal(proposal: LLMProposal, provider?: string, baseBranch?: string): void {
  const riskColor = RISK_COLOR[proposal.riskLevel];
  const confidenceBar = buildBar(proposal.confidenceScore);

  console.log(chalk.gray('\n' + '─'.repeat(60)));
  console.log(chalk.cyan.bold('  AI Proposed Changes'));
  if (provider) console.log(chalk.gray(`  via ${provider}`));
  console.log(chalk.gray('─'.repeat(60)));

  console.log(chalk.bold('\n  Branch:'));
  console.log(chalk.yellow(`    ${proposal.branchSuggestion}`));

  console.log(chalk.bold('\n  Commit:'));
  console.log(chalk.white(`    ${proposal.commitMessage}`));

  if (baseBranch) {
    console.log(chalk.bold('\n  Base Branch (merge target):'));
    console.log(chalk.magenta(`    ${baseBranch}`));
  }

  console.log(chalk.bold('\n  PR Title:'));
  console.log(chalk.white(`    ${proposal.prTitle}`));

  console.log(chalk.bold('\n  PR Description:'));
  proposal.prDescription
    .split('\n')
    .forEach(line => console.log(chalk.gray(`    ${line}`)));

  console.log(chalk.bold('\n  Confidence:'));
  console.log(`    ${confidenceBar} ${chalk.cyan(proposal.confidenceScore + '%')}`);

  console.log(chalk.bold('\n  Risk:'));
  console.log(`    ${riskColor(proposal.riskLevel.toUpperCase())}\n`);

  console.log(chalk.gray('─'.repeat(60) + '\n'));
}

export function printGitStatus(status: GitStatus): void {
  console.log(chalk.cyan.bold('\n  Repository Status'));
  console.log(chalk.gray('─'.repeat(40)));

  console.log(`  Branch:   ${chalk.yellow(status.branch)}`);

  if (status.ahead > 0) console.log(`  Ahead:    ${chalk.green(status.ahead + ' commit(s)')}`);
  if (status.behind > 0) console.log(`  Behind:   ${chalk.red(status.behind + ' commit(s)')}`);

  if (status.staged.length > 0) {
    console.log(chalk.bold('\n  Staged:'));
    status.staged.forEach(f => console.log(chalk.green(`    + ${f}`)));
  }

  if (status.unstaged.length > 0) {
    console.log(chalk.bold('\n  Modified:'));
    status.unstaged.forEach(f => console.log(chalk.yellow(`    ~ ${f}`)));
  }

  if (status.untracked.length > 0) {
    console.log(chalk.bold('\n  Untracked:'));
    status.untracked.forEach(f => console.log(chalk.gray(`    ? ${f}`)));
  }

  const total = status.staged.length + status.unstaged.length + status.untracked.length;
  if (total === 0) {
    console.log(chalk.green('\n  Working tree clean'));
  }

  console.log('');
}

export function printSuccess(message: string): void {
  console.log(chalk.green.bold(`\n  ✓ ${message}\n`));
}

export function printError(message: string): void {
  console.log(chalk.red.bold(`\n  ✗ ${message}\n`));
}

export function printInfo(message: string): void {
  console.log(chalk.gray(`  → ${message}`));
}

export function printStep(step: number, total: number, label: string): void {
  console.log(chalk.cyan(`\n  [${step}/${total}] ${label}`));
}

export function printBranchStep(branch: string): void {
  console.log(chalk.gray('\n' + '─'.repeat(50)));
  console.log(chalk.bold('  Suggested branch:'));
  console.log(chalk.yellow(`\n    ${branch}\n`));
}

export function printCommitStep(msg: string): void {
  console.log(chalk.gray('\n' + '─'.repeat(50)));
  console.log(chalk.bold('  Suggested commit message:'));
  console.log(chalk.white(`\n    ${msg}\n`));
}

export function printPRStep(title: string, desc: string, baseBranch: string): void {
  console.log(chalk.gray('\n' + '─'.repeat(50)));
  console.log(chalk.bold('  PR Title:'));
  console.log(chalk.white(`\n    ${title}`));
  console.log(chalk.bold('\n  PR Description:'));
  desc.split('\n').forEach(line => console.log(chalk.gray(`    ${line}`)));
  console.log(chalk.bold('\n  Target branch:'));
  console.log(chalk.magenta(`    ${baseBranch}\n`));
}

function buildBar(score: number): string {
  const filled = Math.round(score / 10);
  const empty = 10 - filled;
  return chalk.cyan('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}
