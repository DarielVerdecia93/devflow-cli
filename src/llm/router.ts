import { LLMRequest, LLMResponse, ProviderName, TaskType } from '../types';
import { config, getProviderForTask, isProviderConfigured } from '../config';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { LLMProvider } from './providers/base.provider';

const PROVIDER_PRIORITY: ProviderName[] = ['groq', 'openai', 'anthropic', 'gemini'];

export class LLMRouter {
  private providers: Map<ProviderName, LLMProvider>;

  constructor() {
    this.providers = new Map<ProviderName, LLMProvider>([
      ['openai', new OpenAIProvider()],
      ['anthropic', new AnthropicProvider()],
      ['gemini', new GeminiProvider()],
      ['groq', new GroqProvider()],
    ]);
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const preferred = getProviderForTask(request.task);
    const ordered = this.buildProviderOrder(preferred);

    const errors: Array<{ provider: ProviderName; error: string }> = [];

    for (const name of ordered) {
      const provider = this.providers.get(name);
      if (!provider || !provider.isConfigured()) continue;

      try {
        const result = await provider.generate(request);
        if (errors.length > 0) {
          console.warn(`  [LLM] Fell back to ${name} after: ${errors.map(e => e.provider).join(', ')}`);
        }
        return result;
      } catch (err: unknown) {
        let msg = err instanceof Error ? err.message : String(err);
        // Include API response body if available (axios error)
        const axiosErr = err as { response?: { data?: unknown; status?: number } };
        if (axiosErr?.response?.data) {
          msg += ` — ${JSON.stringify(axiosErr.response.data)}`;
        }
        errors.push({ provider: name, error: msg });
      }
    }

    const detail = errors.map(e => `  ${e.provider}: ${e.error}`).join('\n');
    throw new Error(`All LLM providers failed:\n${detail}\n\nEnsure at least one API key is set in .env`);
  }

  getConfiguredProviders(): ProviderName[] {
    return PROVIDER_PRIORITY.filter(name => {
      const p = this.providers.get(name);
      return p?.isConfigured() ?? false;
    });
  }

  private buildProviderOrder(preferred: ProviderName): ProviderName[] {
    const rest = PROVIDER_PRIORITY.filter(n => n !== preferred);
    return [preferred, ...rest];
  }
}

export const llmRouter = new LLMRouter();
