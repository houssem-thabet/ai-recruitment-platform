import { z } from 'zod';
import { redactPIIForExternalLLM } from '@/lib/ai/semantic';

export function isLiveLLMConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY?.trim();
  return Boolean(key && key.length > 10);
}

export function getActiveAIModelInfo(): {
  mode: 'LIVE_LLM' | 'DETERMINISTIC_NLP';
  modelName: string;
  label: string;
} {
  if (isLiveLLMConfigured()) {
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    return {
      mode: 'LIVE_LLM',
      modelName: model,
      label: `Live LLM (${model}) + Deterministic Verification`,
    };
  }
  return {
    mode: 'DETERMINISTIC_NLP',
    modelName: 'talentai-deterministic-nlp-v1',
    label: 'Deterministic NLP & Cosine Semantic Engine (Demo Mode)',
  };
}

export async function callStructuredLLM<T>(params: {
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  redactPII?: boolean;
  timeoutMs?: number;
}): Promise<{ data: T; tokensEstimated: number } | null> {
  if (!isLiveLLMConfigured()) return null;

  const apiKey = process.env.OPENAI_API_KEY!.trim();
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const safeUserPrompt =
    params.redactPII !== false ? redactPIIForExternalLLM(params.userPrompt) : params.userPrompt;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), params.timeoutMs ?? 15000);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: safeUserPrompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`LLM HTTP ${res.status}`);
    }

    const payload = await res.json();
    const rawContent = payload?.choices?.[0]?.message?.content;
    if (!rawContent) return null;

    const parsedJson = JSON.parse(rawContent);
    const validated = params.schema.parse(parsedJson);
    const tokensEstimated = Number(
      payload?.usage?.total_tokens || Math.ceil((params.systemPrompt.length + safeUserPrompt.length) / 4)
    );
    return { data: validated, tokensEstimated };
  } catch (err) {
    console.warn('[LLM Fallback Activated]', err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
