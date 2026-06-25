import { LLMProposal, LLMRequest, LLMResponse, ProviderName } from '../../types';

export interface LLMProvider {
  readonly name: ProviderName;
  isConfigured(): boolean;
  generate(request: LLMRequest): Promise<LLMResponse>;
}

export function parseProposalFromText(text: string): LLMProposal {
  // Strip markdown code fences if present
  const cleaned = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`No JSON found in LLM response:\n${text.slice(0, 500)}`);
  }

  const parsed = JSON.parse(jsonMatch[0]);

  if (!parsed.branchSuggestion || !parsed.commitMessage || !parsed.prTitle) {
    throw new Error('LLM response missing required fields');
  }

  return {
    branchSuggestion: String(parsed.branchSuggestion).trim(),
    commitMessage: String(parsed.commitMessage).trim(),
    prTitle: String(parsed.prTitle).trim(),
    prDescription: String(parsed.prDescription ?? '').trim(),
    confidenceScore: Number(parsed.confidenceScore ?? 75),
    riskLevel: (['low', 'medium', 'high'].includes(parsed.riskLevel) ? parsed.riskLevel : 'medium') as LLMProposal['riskLevel'],
  };
}
