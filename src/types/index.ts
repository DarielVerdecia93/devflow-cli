export interface LLMProposal {
  branchSuggestion: string;
  commitMessage: string;
  prTitle: string;
  prDescription: string;
  confidenceScore: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface GitStatus {
  branch: string;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  ahead: number;
  behind: number;
}

export interface PullRequest {
  title: string;
  description: string;
  sourceBranch: string;
  targetBranch: string;
  id?: number;
  url?: string;
}

export interface FlowContext {
  diff: string;
  currentBranch: string;
  status: GitStatus;
  proposal?: LLMProposal;
}

export type TaskType = 'commit' | 'pr' | 'analysis';

export type ProviderName = 'openai' | 'anthropic' | 'gemini' | 'groq';

export interface LLMRequest {
  task: TaskType;
  diff: string;
  context?: string;
}

export interface LLMResponse {
  proposal: LLMProposal;
  provider: ProviderName;
  tokensUsed?: number;
}

export type UserAction = 'accept' | 'edit_branch' | 'edit_commit' | 'edit_pr' | 'edit_base' | 'regenerate' | 'cancel';
