import axios from 'axios';
import { LLMRequest, LLMResponse } from '../../types';
import { config } from '../../config';
import { buildAnalysisPrompt } from '../prompts';
import { LLMProvider, parseProposalFromText } from './base.provider';

export class GroqProvider implements LLMProvider {
  readonly name = 'groq' as const;

  isConfigured(): boolean {
    return !!config.llm.groq.apiKey;
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const { apiKey, model } = config.llm.groq;
    const prompt = buildAnalysisPrompt(request.diff);

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
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
        timeout: 20000,
      }
    );

    const text: string = response.data.choices[0].message.content;
    const proposal = parseProposalFromText(text);

    return {
      proposal,
      provider: 'groq',
      tokensUsed: response.data.usage?.total_tokens,
    };
  }
}
