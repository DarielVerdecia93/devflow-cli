import axios from 'axios';
import { LLMRequest, LLMResponse } from '../../types';
import { config } from '../../config';
import { buildAnalysisPrompt } from '../prompts';
import { LLMProvider, parseProposalFromText } from './base.provider';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai' as const;

  isConfigured(): boolean {
    return !!config.llm.openai.apiKey;
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const { apiKey, model } = config.llm.openai;
    const prompt = buildAnalysisPrompt(request.diff);

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const text: string = response.data.choices[0].message.content;
    const proposal = parseProposalFromText(text);

    return {
      proposal,
      provider: 'openai',
      tokensUsed: response.data.usage?.total_tokens,
    };
  }
}
