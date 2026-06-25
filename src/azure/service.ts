import { run, isInstalled } from '../git/cli-runner';
import { PullRequest } from '../types';

export function parseAzureRemoteUrl(url: string): { org: string; project: string; repo: string } | null {
  let m = url.match(/dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/([^/]+)/);
  if (m) return { org: m[1], project: m[2], repo: m[3] };

  m = url.match(/([^.]+)\.visualstudio\.com\/([^/]+)\/_git\/([^/]+)/);
  if (m) return { org: m[1], project: m[2], repo: m[3] };

  m = url.match(/ssh\.dev\.azure\.com[:/]v3\/([^/]+)\/([^/]+)\/([^/]+)/);
  if (m) return { org: m[1], project: m[2], repo: m[3] };

  return null;
}

interface AzurePRResponse {
  pullRequestId: number;
  url: string;
  title: string;
  status: string;
}

export class AzureDevOpsService {
  isInstalled(): boolean {
    return isInstalled('az');
  }

  isConfigured(): boolean {
    return this.isInstalled();
  }

  async createPullRequest(pr: PullRequest): Promise<AzurePRResponse> {
    if (!this.isInstalled()) {
      throw new Error(
        'az CLI is not installed.\n' +
        'Install it from: https://aka.ms/installazurecliwindows\n' +
        'Then add the DevOps extension: az extension add --name azure-devops\n' +
        'And authenticate: az login'
      );
    }

    const output = await run('az', [
      'repos', 'pr', 'create',
      '--title', pr.title,
      '--description', pr.description,
      '--source-branch', pr.sourceBranch,
      '--target-branch', pr.targetBranch,
      '--output', 'json',
    ]);

    const result = JSON.parse(output) as AzurePRResponse;
    return result;
  }

  async buildPRUrl(prId: number): Promise<string> {
    const output = await run('az', [
      'repos', 'pr', 'show',
      '--id', String(prId),
      '--output', 'json',
    ]).catch(() => '{}');

    const result = JSON.parse(output) as { url?: string };
    return result.url ?? '';
  }
}

export const azureService = new AzureDevOpsService();
