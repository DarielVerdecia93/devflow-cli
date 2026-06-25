import simpleGit, { SimpleGit } from 'simple-git';
import { GitStatus } from '../types';

export class GitService {
  private git: SimpleGit;

  constructor(cwd: string = process.cwd()) {
    this.git = simpleGit(cwd);
  }

  async assertRepo(): Promise<void> {
    const isRepo = await this.git.checkIsRepo();
    if (!isRepo) throw new Error('Not inside a Git repository. Run `git init` first.');
  }

  async getDiff(staged = false): Promise<string> {
    const args = staged ? ['--cached'] : [];
    const diff = await this.git.diff(args);
    // Also include untracked files summary
    if (!diff.trim()) {
      const status = await this.git.status();
      if (status.not_added.length > 0) {
        return `[No diff available — ${status.not_added.length} untracked file(s) not yet staged]\n` +
          status.not_added.map(f => `  + ${f}`).join('\n');
      }
    }
    return diff;
  }

  async getFullDiff(): Promise<string> {
    // Get both staged and unstaged changes
    const [unstaged, staged] = await Promise.all([
      this.git.diff([]),
      this.git.diff(['--cached']),
    ]);
    return [staged, unstaged].filter(Boolean).join('\n') || await this.getDiff();
  }

  async getStatus(): Promise<GitStatus> {
    const [statusResult, log] = await Promise.all([
      this.git.status(),
      this.git.log({ maxCount: 1 }).catch(() => ({ all: [] })),
    ]);

    return {
      branch: statusResult.current ?? 'unknown',
      staged: statusResult.staged,
      unstaged: statusResult.modified.filter(f => !statusResult.staged.includes(f)),
      untracked: statusResult.not_added,
      ahead: statusResult.ahead,
      behind: statusResult.behind,
    };
  }

  async getCurrentBranch(): Promise<string> {
    const status = await this.git.status();
    return status.current ?? 'unknown';
  }

  async createBranch(branchName: string): Promise<void> {
    await this.git.checkoutLocalBranch(branchName);
  }

  async branchExists(branchName: string): Promise<boolean> {
    const branches = await this.git.branchLocal();
    return branches.all.includes(branchName);
  }

  async stageAll(): Promise<void> {
    await this.git.add('.');
  }

  async commit(message: string): Promise<void> {
    await this.git.commit(message);
  }

  async push(branchName: string): Promise<void> {
    await this.git.push('origin', branchName, ['--set-upstream']);
  }

  async hasRemote(): Promise<boolean> {
    const remotes = await this.git.getRemotes();
    return remotes.length > 0;
  }

  async getRemoteUrl(): Promise<string> {
    const remotes = await this.git.remote(['get-url', 'origin']).catch(() => '');
    return (remotes ?? '').trim();
  }

  async safeBranchName(suggestion: string): Promise<string> {
    const exists = await this.branchExists(suggestion);
    if (!exists) return suggestion;

    // Append suffix to avoid collision
    let counter = 2;
    while (await this.branchExists(`${suggestion}-${counter}`)) {
      counter++;
    }
    return `${suggestion}-${counter}`;
  }
}

export const gitService = new GitService();
