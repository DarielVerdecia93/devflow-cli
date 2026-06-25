import axios from 'axios';
import { LLMRequest, LLMResponse } from '../../types';
import { config } from '../../config';
import { buildAnalysisPrompt } from '../prompts';
import { LLMProvider, parseProposalFromText } from './base.provider';

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic' as const;

  isConfigured(): boolean {
    return !!config.llm.anthropic.apiKey;
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const { apiKey, model } = config.llm.anthropic;
    const prompt = buildAnalysisPrompt(request.diff);

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const text: string = response.data.content[0].text;
    const proposal = parseProposalFromText(text);

    return {
      proposal,
      provider: 'anthropic',
      tokensUsed: response.data.usage?.input_tokens + response.data.usage?.output_tokens,
    };
  }
}
