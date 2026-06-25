import axios, { AxiosInstance } from 'axios';
import { PullRequest } from '../types';
import { config, isAzureConfigured } from '../config';

interface AzurePRPayload {
  title: string;
  description: string;
  sourceRefName: string;
  targetRefName: string;
  isDraft?: boolean;
}

interface AzurePRResponse {
  pullRequestId: number;
  url: string;
  title: string;
  status: string;
}

export class AzureDevOpsService {
  private client: AxiosInstance;

  constructor() {
    const { org, project, repo, token } = config.azure;
    const base64Token = Buffer.from(`:${token}`).toString('base64');

    this.client = axios.create({
      baseURL: `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}`,
      headers: {
        Authorization: `Basic ${base64Token}`,
        'Content-Type': 'application/json',
      },
      params: { 'api-version': '7.1' },
      timeout: 30000,
    });
  }

  isConfigured(): boolean {
    return isAzureConfigured();
  }

  async createPullRequest(pr: PullRequest): Promise<AzurePRResponse> {
    if (!this.isConfigured()) {
      throw new Error(
        'Azure DevOps is not configured.\n' +
        'Set AZURE_DEVOPS_ORG, AZURE_DEVOPS_PROJECT, AZURE_DEVOPS_REPO, AZURE_DEVOPS_TOKEN in .env'
      );
    }

    const payload: AzurePRPayload = {
      title: pr.title,
      description: pr.description,
      sourceRefName: `refs/heads/${pr.sourceBranch}`,
      targetRefName: `refs/heads/${pr.targetBranch}`,
      isDraft: false,
    };

    const response = await this.client.post<AzurePRResponse>('/pullrequests', payload);
    return response.data;
  }

  async getPullRequests(status: 'active' | 'completed' | 'abandoned' = 'active'): Promise<AzurePRResponse[]> {
    const response = await this.client.get<{ value: AzurePRResponse[] }>('/pullrequests', {
      params: { searchCriteria: { status } },
    });
    return response.data.value ?? [];
  }

  buildPRUrl(prId: number): string {
    const { org, project, repo } = config.azure;
    return `https://dev.azure.com/${org}/${project}/_git/${repo}/pullrequest/${prId}`;
  }
}

export const azureService = new AzureDevOpsService();
