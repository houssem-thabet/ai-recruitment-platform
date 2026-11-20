import {
  PROTECTED_TERMS,
  stripProtectedAttributes,
  redactPIIForExternalLLM,
} from '@/lib/ai/pii-guard';
import {
  callEmbeddingsAPI,
  isLiveEmbeddingsConfigured,
} from '@/lib/ai/llm-client';
import { extractSkillsFromText } from '@/lib/ai/skill-taxonomy';

export { redactPIIForExternalLLM, stripProtectedAttributes };

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have',
  'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that', 'the', 'their', 'this',
  'to', 'was', 'were', 'will', 'with', 'you', 'your', 'our', 'we', 'who', 'all',
  'can', 'into', 'more', 'other', 'such', 'than', 'then', 'them', 'these', 'they',
  'through', 'up', 'use', 'using', 'used', 'work', 'working', 'role', 'team',
  'also', 'able', 'both', 'each', 'well', 'within', 'across', 'including',
]);

// Synonym canonicalization before stemming so equivalent engineering concepts align semantically
const CONCEPT_SYNONYMS: Record<string, string> = {
  frontend: 'frontend',
  'front-end': 'frontend',
  ui: 'interface',
  ux: 'interface',
  backend: 'backend',
  'back-end': 'backend',
  fullstack: 'fullstack',
  'full-stack': 'fullstack',
  microservice: 'distributed',
  microservices: 'distributed',
  api: 'api',
  apis: 'api',
  restful: 'api',
  database: 'database',
  databases: 'database',
  rdbms: 'database',
  postgres: 'postgresql',
  reactjs: 'react',
  nextjs: 'nextjs',
  'next.js': 'nextjs',
  nodejs: 'nodejs',
  'node.js': 'nodejs',
  k8s: 'kubernetes',
  container: 'container',
  containers: 'container',
  dockerized: 'container',
  llm: 'llm',
  llms: 'llm',
  genai: 'llm',
  ml: 'machinelearn',
  ai: 'artificialintel',
  ci: 'cicd',
  cd: 'cicd',
  'ci/cd': 'cicd',
  pipeline: 'pipeline',
  pipelines: 'pipeline',
  test: 'test',
  testing: 'test',
  tests: 'test',
  scalable: 'scale',
  scalability: 'scale',
  scaling: 'scale',
  cloud: 'cloud',
  security: 'security',
  secure: 'security',
  authentication: 'auth',
  authorization: 'auth',
  rbac: 'auth',
};

// Higher IDF weight for discriminating technical/architectural terms vs generic prose
const HIGH_SIGNAL_STEMS = new Set([
  'typescript', 'javascript', 'react', 'nextjs', 'nodejs', 'python', 'fastapi',
  'java', 'golang', 'csharp', 'rust', 'postgresql', 'sql', 'prisma', 'mongodb',
  'redis', 'graphql', 'api', 'docker', 'container', 'kubernetes', 'aws', 'gcp',
  'azure', 'terraform', 'cicd', 'linux', 'security', 'auth', 'machinelearn',
  'deeplearn', 'nlp', 'llm', 'spark', 'kafka', 'vector', 'distributed',
  'architect', 'architecture', 'schema', 'index', 'latenc', 'throughput',
  'observab', 'telemetry', 'fullstack', 'frontend', 'backend', 'test',
]);

function stemToken(token: string): string {
  const mapped = CONCEPT_SYNONYMS[token];
  if (mapped) return mapped;
  if (token.length <= 3) return token;
  return token
    .replace(/ization$/, 'ize')
    .replace(/ational$/, 'ate')
    .replace(/fulness$/, 'ful')
    .replace(/iveness$/, 'ive')
    .replace(/ing$/, '')
    .replace(/tion$/, 't')
    .replace(/ment$/, '')
    .replace(/ies$/, 'y')
    .replace(/es$/, '')
    .replace(/s$/, '');
}

export function tokenizeForSimilarity(text: string): string[] {
  if (!text) return [];
  const scrubbed = stripProtectedAttributes(text);
  return scrubbed
    .toLowerCase()
    .replace(/[^a-z0-9+#./\s-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^[./-]+|[./-]+$/g, ''))
    .filter(
      (t) =>
        t.length >= 2 &&
        !STOPWORDS.has(t) &&
        !PROTECTED_TERMS.has(t) &&
        !/^(?:19\d{2}|20\d{2})$/.test(t) // Ignore standalone calendar/birth years in semantic vectors
    )
    .map(stemToken)
    .filter((t) => t.length >= 2 && !PROTECTED_TERMS.has(t));
}

/**
 * Computes cosine similarity [0..1] over sublinear TF-IDF weighted unigrams,
 * phrase bigrams, and canonical domain tags — strictly invariant to protected demographic terms.
 */
export function computeSemanticSimilarity(textA: string, textB: string): number {
  const cleanA = stripProtectedAttributes(textA);
  const cleanB = stripProtectedAttributes(textB);

  const tokensA = tokenizeForSimilarity(cleanA);
  const tokensB = tokenizeForSimilarity(cleanB);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const buildWeightedMap = (tokens: string[], rawClean: string) => {
    const rawCounts = new Map<string, number>();
    for (let i = 0; i < tokens.length; i++) {
      const uni = tokens[i];
      rawCounts.set(uni, (rawCounts.get(uni) || 0) + 1);
      if (i < tokens.length - 1) {
        const bi = `bi:${tokens[i]}_${tokens[i + 1]}`;
        rawCounts.set(bi, (rawCounts.get(bi) || 0) + 1);
      }
    }

    // Inject canonical taxonomy skills as high-precision concept features
    const extracted = extractSkillsFromText(rawClean);
    for (const sk of [...extracted.technicalSkills, ...extracted.softSkills]) {
      const key = `skill:${sk.toLowerCase()}`;
      rawCounts.set(key, (rawCounts.get(key) || 0) + 1);
    }

    const weighted = new Map<string, number>();
    rawCounts.forEach((count, key) => {
      // Sublinear TF: 1 + ln(count) prevents keyword-stuffed CVs from gaming cosine scores
      const sublinearTf = 1 + Math.log(count);
      let idf = 1.0;
      if (key.startsWith('skill:')) idf = 2.1;
      else if (key.startsWith('bi:')) idf = 1.35;
      else if (HIGH_SIGNAL_STEMS.has(key)) idf = 1.65;

      weighted.set(key, sublinearTf * idf);
    });
    return weighted;
  };

  const mapA = buildWeightedMap(tokensA, cleanA);
  const mapB = buildWeightedMap(tokensB, cleanB);

  let dot = 0;
  let normA = 0;
  let normB = 0;

  mapA.forEach((valA, key) => {
    normA += valA * valA;
    const valB = mapB.get(key);
    if (valB) dot += valA * valB;
  });

  mapB.forEach((valB) => {
    normB += valB * valB;
  });

  if (normA === 0 || normB === 0) return 0;
  return Math.min(1, Math.max(0, dot / (Math.sqrt(normA) * Math.sqrt(normB))));
}

/**
 * Dense vector cosine similarity in [0..1] for embedding arrays.
 */
export function computeVectorCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA.length || vecA.length !== vecB.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  const cos = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.min(1, Math.max(0, cos));
}

/**
 * Hybrid Semantic Similarity:
 * - When live embeddings (OpenAI / Gemini) are configured and reachable, computes
 *   dense vector cosine similarity blended with sublinear IDF lexical/skill similarity.
 * - Falls back seamlessly to deterministic IDF semantic similarity if offline or unconfigured.
 */
export async function computeHybridSemanticSimilarity(
  textA: string,
  textB: string
): Promise<{
  similarity: number;
  lexicalSimilarity: number;
  embeddingSimilarity: number | null;
  usedLiveEmbeddings: boolean;
}> {
  const lexicalSimilarity = computeSemanticSimilarity(textA, textB);

  if (!isLiveEmbeddingsConfigured()) {
    return {
      similarity: lexicalSimilarity,
      lexicalSimilarity,
      embeddingSimilarity: null,
      usedLiveEmbeddings: false,
    };
  }

  const vectors = await callEmbeddingsAPI([textA, textB]);
  if (!vectors || vectors.length !== 2) {
    return {
      similarity: lexicalSimilarity,
      lexicalSimilarity,
      embeddingSimilarity: null,
      usedLiveEmbeddings: false,
    };
  }

  const rawDense = computeVectorCosineSimilarity(vectors[0], vectors[1]);
  // Dense text-embedding-3-small cosines on unrelated prose often sit around 0.20–0.30;
  // normalize [0.18 .. 0.88] -> [0 .. 1] so calibration matches lexical range cleanly
  const calibratedDense = Math.min(1, Math.max(0, (rawDense - 0.18) / 0.70));
  const blended = Number((0.68 * calibratedDense + 0.32 * lexicalSimilarity).toFixed(4));

  return {
    similarity: blended,
    lexicalSimilarity,
    embeddingSimilarity: rawDense,
    usedLiveEmbeddings: true,
  };
}
