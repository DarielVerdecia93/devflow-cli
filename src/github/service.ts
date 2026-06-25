import { run, isInstalled } from '../git/cli-runner';
import { PullRequest } from '../types';

export function parseGitHubRemoteUrl(url: string): { owner: string; repo: string } | null {
  const m = url.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (m) return { owner: m[1], repo: m[2] };
  return null;
}

export class GitHubService {
  isInstalled(): boolean {
    return isInstalled('gh');
  }

  isConfigured(): boolean {
    return this.isInstalled();
  }

  async createPullRequest(pr: PullRequest): Promise<{ number: number; url: string }> {
    if (!this.isInstalled()) {
      throw new Error(
        'gh CLI is not installed.\n' +
        'Install it from: https://cli.github.com\n' +
        'Then authenticate with: gh auth login'
      );
    }

    const url = await run('gh', [
      'pr', 'create',
      '--title', pr.title,
      '--body', pr.description,
      '--base', pr.targetBranch,
      '--head', pr.sourceBranch,
    ]);

    const match = url.match(/\/pull\/(\d+)/);
    const number = match ? parseInt(match[1]) : 0;
    return { number, url };
  }

  async buildPRUrl(number: number): Promise<string> {
    return run('gh', ['pr', 'view', String(number), '--json', 'url', '--jq', '.url'])
      .catch(() => '');
  }
}

export const githubService = new GitHubService();
