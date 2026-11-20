const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have',
  'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that', 'the', 'their', 'this',
  'to', 'was', 'were', 'will', 'with', 'you', 'your', 'our', 'we', 'who', 'all',
  'can', 'into', 'more', 'other', 'such', 'than', 'then', 'them', 'these', 'they',
  'through', 'up', 'use', 'using', 'used', 'work', 'working', 'role', 'team',
]);

// Protected personal attributes explicitly excluded from ranking/matching vectors
const PROTECTED_TERMS = new Set([
  'male', 'female', 'gender', 'woman', 'man', 'nonbinary', 'married', 'single',
  'religion', 'christian', 'muslim', 'jewish', 'hindu', 'buddhist', 'nationality',
  'race', 'ethnic', 'ethnicity', 'age', 'yearsold', 'pregnant', 'disability', 'disabled',
]);

function stemToken(token: string): string {
  if (token.length <= 3) return token;
  return token
    .replace(/ing$/, '')
    .replace(/tion$/, 't')
    .replace(/ment$/, '')
    .replace(/ies$/, 'y')
    .replace(/es$/, '')
    .replace(/s$/, '');
}

export function tokenizeForSimilarity(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^[.-]+|[.-]+$/g, ''))
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t) && !PROTECTED_TERMS.has(t))
    .map(stemToken);
}

/**
 * Computes cosine similarity [0..1] over unigrams + domain bigrams,
 * invariant to protected demographic terms.
 */
export function computeSemanticSimilarity(textA: string, textB: string): number {
  const tokensA = tokenizeForSimilarity(textA);
  const tokensB = tokenizeForSimilarity(textB);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const buildFreqMap = (tokens: string[]) => {
    const freq = new Map<string, number>();
    for (let i = 0; i < tokens.length; i++) {
      const uni = tokens[i];
      freq.set(uni, (freq.get(uni) || 0) + 1);
      if (i < tokens.length - 1) {
        const bi = `${tokens[i]}_${tokens[i + 1]}`;
        freq.set(bi, (freq.get(bi) || 0) + 0.6);
      }
    }
    return freq;
  };

  const mapA = buildFreqMap(tokensA);
  const mapB = buildFreqMap(tokensB);

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
 * Minimizes PII before any external LLM transmission (Part 14 Responsible AI).
 */
export function redactPIIForExternalLLM(text: string): string {
  if (!text) return '';
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
    .replace(/(\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g, '[REDACTED_PHONE]');
}
