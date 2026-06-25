import axios from 'axios';
import { LLMRequest, LLMResponse } from '../../types';
import { config } from '../../config';
import { buildPromptForTask } from '../prompts';
import { LLMProvider, parseProposalFromText } from './base.provider';

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini' as const;

  isConfigured(): boolean {
    return !!config.llm.gemini.apiKey;
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const { apiKey, model } = config.llm.gemini;
    const prompt = buildPromptForTask(request.task, request.diff, request.language);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 },
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );

    const text: string = response.data.candidates[0].content.parts[0].text;
    const proposal = parseProposalFromText(text);

    return {
      proposal,
      provider: 'gemini',
    };
  }
}
