import { z } from 'zod';
import { redactPIIForExternalLLM } from '@/lib/ai/pii-guard';

export type SupportedLLMProvider = 'openai' | 'anthropic' | 'gemini';

export interface ActiveProviderConfig {
  provider: SupportedLLMProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
  embeddingModel?: string;
}

export interface LLMCallDiagnostics {
  provider?: SupportedLLMProvider;
  modelName: string;
  status: 'SUCCESS' | 'FALLBACK_UNCONFIGURED' | 'FALLBACK_ERROR';
  errorCode?:
    | 'UNCONFIGURED'
    | 'HTTP_AUTH_ERROR'
    | 'HTTP_RATE_LIMIT'
    | 'HTTP_SERVER_ERROR'
    | 'TIMEOUT'
    | 'NETWORK_ERROR'
    | 'EMPTY_RESPONSE'
    | 'INVALID_JSON'
    | 'SCHEMA_VALIDATION_FAILED';
  errorMessage?: string;
  attempts: number;
  latencyMs: number;
}

let lastDiagnostics: LLMCallDiagnostics | null = null;

export function getLastLLMDiagnostics(): LLMCallDiagnostics | null {
  return lastDiagnostics;
}

function isValidApiKey(val?: string | null): val is string {
  if (!val) return false;
  const trimmed = val.trim();
  if (trimmed.length < 12) return false;
  // Ignore obvious placeholder templates
  if (/^(your[-_]|replace[-_]|sk-xxx|placeholder|todo)/i.test(trimmed)) {
    return false;
  }
  return true;
}

/**
 * Resolves the active external AI provider from environment variables.
 * Supports OpenAI / OpenAI-compatible endpoints, Anthropic Claude, and Google Gemini.
 */
export function getActiveProviderConfig(): ActiveProviderConfig | null {
  const preferred = (process.env.AI_PROVIDER || '').trim().toLowerCase();

  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (preferred === 'anthropic' && isValidApiKey(anthropicKey)) {
    return {
      provider: 'anthropic',
      apiKey: anthropicKey.trim(),
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
      baseUrl: (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, ''),
    };
  }

  if (preferred === 'gemini' && isValidApiKey(geminiKey)) {
    return {
      provider: 'gemini',
      apiKey: geminiKey.trim(),
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      baseUrl: (
        process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com'
      ).replace(/\/$/, ''),
      embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
    };
  }

  if (isValidApiKey(openaiKey)) {
    return {
      provider: 'openai',
      apiKey: openaiKey.trim(),
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      baseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
      embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    };
  }

  if (isValidApiKey(anthropicKey)) {
    return {
      provider: 'anthropic',
      apiKey: anthropicKey.trim(),
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
      baseUrl: (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, ''),
    };
  }

  if (isValidApiKey(geminiKey)) {
    return {
      provider: 'gemini',
      apiKey: geminiKey.trim(),
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      baseUrl: (
        process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com'
      ).replace(/\/$/, ''),
      embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
    };
  }

  return null;
}

export function isLiveLLMConfigured(): boolean {
  return getActiveProviderConfig() !== null;
}

export function isLiveEmbeddingsConfigured(): boolean {
  const cfg = getActiveProviderConfig();
  return Boolean(cfg && (cfg.provider === 'openai' || cfg.provider === 'gemini') && cfg.embeddingModel);
}

export function getActiveAIModelInfo(): {
  mode: 'LIVE_LLM' | 'DETERMINISTIC_NLP';
  modelName: string;
  label: string;
  provider?: SupportedLLMProvider;
} {
  const cfg = getActiveProviderConfig();
  if (cfg) {
    const providerLabel =
      cfg.provider === 'openai'
        ? 'OpenAI'
        : cfg.provider === 'anthropic'
        ? 'Anthropic'
        : 'Google Gemini';
    return {
      mode: 'LIVE_LLM',
      modelName: cfg.model,
      provider: cfg.provider,
      label: `Live LLM (${providerLabel} • ${cfg.model}) + Deterministic Verification`,
    };
  }
  return {
    mode: 'DETERMINISTIC_NLP',
    modelName: 'talentai-deterministic-nlp-v2',
    label: 'Deterministic NLP & Hybrid IDF Semantic Engine (Fallback / Demo Mode)',
  };
}

/**
 * Safely extracts a JSON object or array from raw LLM text even if wrapped in
 * markdown ```json fences or brief conversational preamble.
 */
export function extractJsonFromLLMResponse(raw: string): unknown {
  const trimmed = raw.trim();
  // Strip ```json ... ``` fences if present
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    // Attempt extracting outermost balanced {...} JSON object
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('Malformed JSON output from LLM');
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ChatTurnMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Calls the configured live LLM (OpenAI, Anthropic, or Gemini) with:
 * - Automatic PII & demographic scrubbing
 * - Timeout protection via AbortController
 * - Exponential backoff retry on transient HTTP 429 / 5xx errors
 * - Strict Zod schema parsing & validation
 * - Graceful null fallback with detailed diagnostics on any error
 */
export async function callStructuredLLM<T>(params: {
  systemPrompt: string;
  userPrompt: string;
  history?: ChatTurnMessage[];
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
  redactPII?: boolean;
  timeoutMs?: number;
  maxRetries?: number;
  temperature?: number;
}): Promise<{ data: T; tokensEstimated: number; modelName: string; provider: SupportedLLMProvider } | null> {
  const started = Date.now();
  const cfg = getActiveProviderConfig();

  if (!cfg) {
    lastDiagnostics = {
      modelName: 'talentai-deterministic-nlp-v2',
      status: 'FALLBACK_UNCONFIGURED',
      errorCode: 'UNCONFIGURED',
      attempts: 0,
      latencyMs: 0,
    };
    return null;
  }

  const sanitize = (txt: string) =>
    params.redactPII !== false ? redactPIIForExternalLLM(txt) : txt;

  const safeUserPrompt = sanitize(params.userPrompt);
  const safeHistory = (params.history || []).slice(-8).map((m) => ({
    role: m.role,
    content: sanitize(m.content),
  }));

  const maxAttempts = Math.max(1, (params.maxRetries ?? 1) + 1);
  const timeoutMs = params.timeoutMs ?? 14000;
  const temperature = params.temperature ?? 0.2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      let rawText: string | undefined;
      let tokensEstimated = 0;
      let httpStatus = 200;

      if (cfg.provider === 'openai') {
        const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cfg.apiKey}`,
          },
          body: JSON.stringify({
            model: cfg.model,
            temperature,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: params.systemPrompt },
              ...safeHistory,
              { role: 'user', content: safeUserPrompt },
            ],
          }),
          signal: controller.signal,
        });
        httpStatus = res.status;
        if (!res.ok) {
          throw Object.assign(new Error(`OpenAI HTTP ${res.status}`), { httpStatus });
        }
        const payload = await res.json();
        rawText = payload?.choices?.[0]?.message?.content;
        tokensEstimated = Number(
          payload?.usage?.total_tokens ||
            Math.ceil((params.systemPrompt.length + safeUserPrompt.length) / 4)
        );
      } else if (cfg.provider === 'anthropic') {
        const res = await fetch(`${cfg.baseUrl}/v1/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': cfg.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: cfg.model,
            max_tokens: 2048,
            temperature,
            system: `${params.systemPrompt}\n\nIMPORTANT: Respond strictly with a single valid JSON object matching the requested schema, with no extra text.`,
            messages: [
              ...safeHistory,
              { role: 'user', content: safeUserPrompt },
            ],
          }),
          signal: controller.signal,
        });
        httpStatus = res.status;
        if (!res.ok) {
          throw Object.assign(new Error(`Anthropic HTTP ${res.status}`), { httpStatus });
        }
        const payload = await res.json();
        rawText = payload?.content?.[0]?.text;
        tokensEstimated = Number(
          (payload?.usage?.input_tokens || 0) + (payload?.usage?.output_tokens || 0) ||
            Math.ceil((params.systemPrompt.length + safeUserPrompt.length) / 4)
        );
      } else {
        // Google Gemini REST API
        const geminiContents = [
          ...safeHistory.map((h) => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }],
          })),
          { role: 'user', parts: [{ text: safeUserPrompt }] },
        ];
        const res = await fetch(
          `${cfg.baseUrl}/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: params.systemPrompt }] },
              contents: geminiContents,
              generationConfig: {
                temperature,
                responseMimeType: 'application/json',
              },
            }),
            signal: controller.signal,
          }
        );
        httpStatus = res.status;
        if (!res.ok) {
          throw Object.assign(new Error(`Gemini HTTP ${res.status}`), { httpStatus });
        }
        const payload = await res.json();
        rawText = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
        tokensEstimated = Number(
          payload?.usageMetadata?.totalTokenCount ||
            Math.ceil((params.systemPrompt.length + safeUserPrompt.length) / 4)
        );
      }

      if (!rawText || !rawText.trim()) {
        lastDiagnostics = {
          provider: cfg.provider,
          modelName: cfg.model,
          status: 'FALLBACK_ERROR',
          errorCode: 'EMPTY_RESPONSE',
          errorMessage: 'Provider returned empty message content',
          attempts: attempt,
          latencyMs: Date.now() - started,
        };
        return null;
      }

      let parsedJson: unknown;
      try {
        parsedJson = extractJsonFromLLMResponse(rawText);
      } catch (jsonErr) {
        lastDiagnostics = {
          provider: cfg.provider,
          modelName: cfg.model,
          status: 'FALLBACK_ERROR',
          errorCode: 'INVALID_JSON',
          errorMessage: jsonErr instanceof Error ? jsonErr.message : 'Invalid JSON',
          attempts: attempt,
          latencyMs: Date.now() - started,
        };
        return null;
      }

      const validated = params.schema.safeParse(parsedJson);
      if (!validated.success) {
        lastDiagnostics = {
          provider: cfg.provider,
          modelName: cfg.model,
          status: 'FALLBACK_ERROR',
          errorCode: 'SCHEMA_VALIDATION_FAILED',
          errorMessage: validated.error.issues
            .slice(0, 3)
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('; '),
          attempts: attempt,
          latencyMs: Date.now() - started,
        };
        return null;
      }

      lastDiagnostics = {
        provider: cfg.provider,
        modelName: cfg.model,
        status: 'SUCCESS',
        attempts: attempt,
        latencyMs: Date.now() - started,
      };

      return {
        data: validated.data,
        tokensEstimated,
        modelName: cfg.model,
        provider: cfg.provider,
      };
    } catch (err: any) {
      const status: number | undefined = err?.httpStatus;
      const isAbort = err?.name === 'AbortError';
      const isTransient =
        isAbort || status === 429 || (status !== undefined && status >= 500) || status === undefined;

      if (attempt < maxAttempts && isTransient) {
        const backoffMs = 250 * Math.pow(2, attempt - 1);
        await sleep(backoffMs);
        continue;
      }

      const errorCode: LLMCallDiagnostics['errorCode'] = isAbort
        ? 'TIMEOUT'
        : status === 401 || status === 403 || status === 400
        ? 'HTTP_AUTH_ERROR'
        : status === 429
        ? 'HTTP_RATE_LIMIT'
        : status && status >= 500
        ? 'HTTP_SERVER_ERROR'
        : 'NETWORK_ERROR';

      lastDiagnostics = {
        provider: cfg.provider,
        modelName: cfg.model,
        status: 'FALLBACK_ERROR',
        errorCode,
        errorMessage: err instanceof Error ? err.message : String(err),
        attempts: attempt,
        latencyMs: Date.now() - started,
      };
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}

// ============================================================================
// DENSE VECTOR EMBEDDINGS CLIENT WITH BOUNDED LRU CACHE
// ============================================================================

const EMBEDDING_CACHE_MAX = 256;
const embeddingCache = new Map<string, number[]>();

function getCachedEmbedding(key: string): number[] | undefined {
  const hit = embeddingCache.get(key);
  if (hit) {
    // Refresh LRU order
    embeddingCache.delete(key);
    embeddingCache.set(key, hit);
  }
  return hit;
}

function setCachedEmbedding(key: string, vec: number[]): void {
  if (embeddingCache.size >= EMBEDDING_CACHE_MAX) {
    const oldestKey = embeddingCache.keys().next().value;
    if (oldestKey !== undefined) embeddingCache.delete(oldestKey);
  }
  embeddingCache.set(key, vec);
}

export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}

/**
 * Computes dense semantic vector embeddings via OpenAI (/embeddings) or Google Gemini
 * when configured. Scrubs PII & protected attributes prior to transmission and returns
 * null cleanly on any network/provider error so deterministic similarity takes over.
 */
export async function callEmbeddingsAPI(
  texts: string[],
  timeoutMs: number = 10000
): Promise<number[][] | null> {
  const cfg = getActiveProviderConfig();
  if (!cfg || !cfg.embeddingModel || texts.length === 0) return null;
  if (cfg.provider !== 'openai' && cfg.provider !== 'gemini') return null;

  const sanitizedInputs = texts.map((t) =>
    redactPIIForExternalLLM(t).replace(/\s+/g, ' ').trim().slice(0, 4000)
  );

  if (sanitizedInputs.some((t) => t.length === 0)) return null;

  const results: Array<number[] | null> = new Array(sanitizedInputs.length).fill(null);
  const missingIndices: number[] = [];

  for (let i = 0; i < sanitizedInputs.length; i++) {
    const cacheKey = `${cfg.provider}:${cfg.embeddingModel}:${sanitizedInputs[i]}`;
    const cached = getCachedEmbedding(cacheKey);
    if (cached) {
      results[i] = cached;
    } else {
      missingIndices.push(i);
    }
  }

  if (missingIndices.length === 0) {
    return results as number[][];
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (cfg.provider === 'openai') {
      const batchTexts = missingIndices.map((idx) => sanitizedInputs[idx]);
      const res = await fetch(`${cfg.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
          model: cfg.embeddingModel,
          input: batchTexts,
        }),
        signal: controller.signal,
      });

      if (!res.ok) return null;
      const payload = await res.json();
      const dataArr: Array<{ embedding?: number[]; index?: number }> = Array.isArray(payload?.data)
        ? payload.data
        : [];
      if (dataArr.length !== missingIndices.length) return null;

      for (let j = 0; j < missingIndices.length; j++) {
        const vec = dataArr[j]?.embedding;
        if (!Array.isArray(vec) || vec.length === 0) return null;
        const origIdx = missingIndices[j];
        results[origIdx] = vec;
        setCachedEmbedding(
          `${cfg.provider}:${cfg.embeddingModel}:${sanitizedInputs[origIdx]}`,
          vec
        );
      }
      return results as number[][];
    }

    if (cfg.provider === 'gemini') {
      const requests = missingIndices.map((idx) => ({
        model: `models/${cfg.embeddingModel}`,
        content: { parts: [{ text: sanitizedInputs[idx] }] },
      }));
      const res = await fetch(
        `${cfg.baseUrl}/v1beta/models/${encodeURIComponent(cfg.embeddingModel)}:batchEmbedContents?key=${encodeURIComponent(cfg.apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests }),
          signal: controller.signal,
        }
      );

      if (!res.ok) return null;
      const payload = await res.json();
      const embeddings: Array<{ values?: number[] }> = Array.isArray(payload?.embeddings)
        ? payload.embeddings
        : [];
      if (embeddings.length !== missingIndices.length) return null;

      for (let j = 0; j < missingIndices.length; j++) {
        const vec = embeddings[j]?.values;
        if (!Array.isArray(vec) || vec.length === 0) return null;
        const origIdx = missingIndices[j];
        results[origIdx] = vec;
        setCachedEmbedding(
          `${cfg.provider}:${cfg.embeddingModel}:${sanitizedInputs[origIdx]}`,
          vec
        );
      }
      return results as number[][];
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
