/**
 * Responsible AI Guardrails:
 * 1. Protected personal/demographic attribute stripping so matching & ranking
 *    are mathematically invariant to gender, age, race, religion, nationality,
 *    marital status, or disability.
 * 2. PII minimization before any external LLM / Embedding API transmission.
 */

export const PROTECTED_TERMS = new Set([
  // Gender & pronouns
  'male',
  'female',
  'gender',
  'woman',
  'women',
  'man',
  'men',
  'nonbinary',
  'non-binary',
  'transgender',
  'cisgender',
  'he',
  'him',
  'his',
  'she',
  'her',
  'hers',
  'mr',
  'mrs',
  'ms',
  'miss',
  // Family & marital status
  'married',
  'single',
  'divorced',
  'widowed',
  'pregnant',
  'maternity',
  'paternity',
  'mother',
  'father',
  // Religion & belief
  'religion',
  'religious',
  'christian',
  'catholic',
  'protestant',
  'muslim',
  'islamic',
  'jewish',
  'judaism',
  'hindu',
  'buddhist',
  'sikh',
  'atheist',
  // Race, ethnicity & national origin markers
  'nationality',
  'citizenship',
  'race',
  'racial',
  'ethnic',
  'ethnicity',
  'caucasian',
  'hispanic',
  'latino',
  'latina',
  // Age, veteran & disability markers
  'age',
  'born',
  'yearsold',
  'birthdate',
  'dob',
  'disability',
  'disabled',
  'handicapped',
  'neurodivergent',
  'veteran',
  'veterans',
]);

/**
 * Removes explicit demographic phrases (e.g., "Age: 29", "28 years old",
 * "Date of Birth: 1996-04-12", "Marital Status: Married", "Gender: Female")
 * prior to semantic vectorization without consuming subsequent sentences.
 */
export function stripProtectedAttributes(text: string): string {
  if (!text) return '';
  return text
    .replace(
      /\b(?:date\s+of\s+birth|dob|birth\s*date|age|gender|sex|marital\s+status|nationality|religion|ethnicity|veteran\s+status|disability\s+status)\s*[:=-]\s*[^\n|,;.()]+/gi,
      ' '
    )
    .replace(/\bborn(?:\s+in|\s+on)?\s+(?:[a-z]+\s+)?(?:19|20)\d{2}\b/gi, ' ')
    .replace(/\b\d{2}\s*(?:years?\s+old|yo|y\/o)\b/gi, ' ')
    .replace(/\bborn\s+(?:in\s+|on\s+)?(?:\d{1,2}[/-]\d{1,2}[/-])?(?:19\d{2}|200\d)\b/gi, ' ')
    .replace(/\b(?:he\/him|she\/her|they\/them)\b/gi, ' ');
}

/**
 * Minimizes direct personal identifiers (emails, phone numbers, national IDs,
 * street addresses) before external LLM or Embedding API requests.
 */
export function redactPIIForExternalLLM(text: string): string {
  if (!text) return '';
  return stripProtectedAttributes(text)
    .replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      '[REDACTED_EMAIL]'
    )
    .replace(
      /\b\d{3}-\d{2}-\d{4}\b/g,
      '[REDACTED_ID]'
    )
    .replace(
      /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]\d{3,4}[\s.-]\d{3,4}\b/g,
      '[REDACTED_PHONE]'
    );
}
