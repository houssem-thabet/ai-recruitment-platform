import { z } from 'zod';
import {
  SKILL_TAXONOMY,
  CAREER_PATH_BLUEPRINTS,
  extractSkillsFromText,
  normalizeSkillName,
  computeSkillTransferability,
  orderSkillsByPrerequisites,
} from '@/lib/ai/skill-taxonomy';
import {
  computeSemanticSimilarity,
  computeHybridSemanticSimilarity,
  stripProtectedAttributes,
} from '@/lib/ai/semantic';
import {
  callStructuredLLM,
  getActiveAIModelInfo,
  type ChatTurnMessage,
} from '@/lib/ai/llm-client';

// ============================================================================
// FEATURE 1: AI CV ANALYZER & STRUCTURED INFORMATION EXTRACTION
// ============================================================================

export const cvExtractedDataSchema = z.object({
  fullName: z.string(),
  summary: z.string(),
  technicalSkills: z.array(z.string()),
  softSkills: z.array(z.string()),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string(),
      year: z.string().optional(),
    })
  ),
  experience: z.array(
    z.object({
      role: z.string(),
      company: z.string(),
      period: z.string().optional(),
      highlights: z.array(z.string()).default([]),
    })
  ),
  yearsOfExperience: z.number().nullable(),
  certifications: z.array(z.string()),
  languages: z.array(z.string()),
  projects: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    })
  ),
  achievements: z.array(z.string()),
});

export const cvAnalysisOutputSchema = z.object({
  completenessScore: z.number().int().min(0).max(100),
  extractedData: cvExtractedDataSchema,
  skillsOverview: z.string(),
  experienceOverview: z.string(),
  strengths: z.array(z.string()),
  missingInfo: z.array(z.string()),
  suggestions: z.array(z.string()),
  recommendedCategories: z.array(z.string()),
  aiMode: z.enum(['LIVE_LLM', 'DETERMINISTIC_NLP']),
  modelName: z.string(),
});

export type CVAnalysisOutput = z.infer<typeof cvAnalysisOutputSchema>;

const MONTH_INDEX: Record<string, number> = {
  jan: 0, january: 0, janv: 0,
  feb: 1, february: 1, fev: 1, févr: 1,
  mar: 2, march: 2, mars: 2,
  apr: 3, april: 3, avr: 3,
  may: 4, mai: 4,
  jun: 5, june: 5, juin: 5,
  jul: 6, july: 6, juil: 6,
  aug: 7, august: 7, aout: 7, août: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11, déc: 11,
};

export function parseSectionsFromCV(text: string): Record<string, string[]> {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const sections: Record<string, string[]> = {
    header: [],
    summary: [],
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    languages: [],
    achievements: [],
  };

  let current = 'header';
  const headingPatterns: Array<[string, RegExp]> = [
    [
      'summary',
      /^(?:\d+[.)]\s*)?(?:professional\s+summary|executive\s+summary|summary|profile|about\s+me|career\s+objective|objective|profil)\s*:?$/i,
    ],
    [
      'experience',
      /^(?:\d+[.)]\s*)?(?:work\s+experience|professional\s+experience|relevant\s+experience|experience|employment\s+history|career\s+history|expériences?\s+professionnelles?)\s*:?$/i,
    ],
    [
      'education',
      /^(?:\d+[.)]\s*)?(?:education|academic\s+background|academic\s+qualifications|qualifications|formation|études)\s*:?$/i,
    ],
    [
      'skills',
      /^(?:\d+[.)]\s*)?(?:technical\s+skills|core\s+skills|skills\s*&\s*technologies|skills|core\s+competencies|competencies|technologies|tech\s+stack|compétences)\s*:?$/i,
    ],
    [
      'projects',
      /^(?:\d+[.)]\s*)?(?:technical\s+projects|selected\s+projects|key\s+projects|personal\s+projects|academic\s+projects|projects|portfolio|projets)\s*:?$/i,
    ],
    [
      'certifications',
      /^(?:\d+[.)]\s*)?(?:certifications?\s*&\s*licenses?|professional\s+certifications?|certifications?|certificates?|licenses?)\s*:?$/i,
    ],
    [
      'languages',
      /^(?:\d+[.)]\s*)?(?:spoken\s+languages|languages|language\s+proficiency|langues)\s*:?$/i,
    ],
    [
      'achievements',
      /^(?:\d+[.)]\s*)?(?:key\s+achievements|achievements|awards\s*&\s*honors|awards|accomplishments|honors|publications)\s*:?$/i,
    ],
  ];

  for (const line of lines) {
    let matchedHeading = false;
    const candidateHeading = line.replace(/^[-#*_\s]+|[-#*_\s]+$/g, '');
    if (candidateHeading.length <= 56) {
      for (const [sec, rx] of headingPatterns) {
        if (rx.test(candidateHeading)) {
          current = sec;
          matchedHeading = true;
          break;
        }
      }
    }
    if (!matchedHeading) {
      sections[current].push(line);
    }
  }
  return sections;
}

function parseMonthYearEndpoint(
  monthToken: string | undefined,
  yearToken: string,
  isEnd: boolean
): number | null {
  const now = new Date();
  const currentMonthTotal = now.getFullYear() * 12 + now.getMonth();
  const lowerYear = yearToken.toLowerCase();

  if (['present', 'current', 'now', 'ongoing', 'today', 'actuel'].includes(lowerYear)) {
    return currentMonthTotal;
  }

  const yr = Number(yearToken);
  if (Number.isNaN(yr) || yr < 1980 || yr > now.getFullYear() + 1) return null;

  let month = isEnd ? 11 : 0;
  if (monthToken) {
    const cleanM = monthToken.toLowerCase().replace(/\./g, '');
    if (/^\d{1,2}$/.test(cleanM)) {
      const mNum = Number(cleanM);
      if (mNum >= 1 && mNum <= 12) month = mNum - 1;
    } else if (MONTH_INDEX[cleanM] !== undefined) {
      month = MONTH_INDEX[cleanM];
    }
  }

  return Math.min(currentMonthTotal, yr * 12 + month);
}

/**
 * Computes total non-overlapping professional experience in years using
 * merged month-precision intervals so concurrent/overlapping roles are never double-counted.
 */
export function estimateYearsOfExperience(
  experienceSectionText: string,
  fullTextFallback?: string
): number | null {
  const full = `${experienceSectionText}\n${fullTextFallback || ''}`;

  // 1. Explicit self-stated experience summary ("6+ years of professional experience")
  const explicit = full.match(
    /\b(\d{1,2})(?:\.\d)?\+?\s+years?\s+of\s+(?:relevant\s+|professional\s+|hands-on\s+|full-stack\s+|software\s+|industry\s+)?experience\b/i
  );
  if (explicit) {
    const val = Number(explicit[1]);
    if (val >= 0 && val <= 45) return val;
  }

  // 2. Month-aware interval merging on experience section first
  const extractMergedYears = (sourceText: string): number | null => {
    if (!sourceText.trim()) return null;
    const rangeRegex =
      /\b(?:([A-Za-zÀ-ÿ]{3,9}\.?|\d{1,2})[\s/.-]+)?(199\d|20\d{2})\s*(?:-|–|—|to|until)\s*(?:([A-Za-zÀ-ÿ]{3,9}\.?|\d{1,2})[\s/.-]+)?(present|current|now|ongoing|today|actuel|199\d|20\d{2})\b/gi;

    const spans: Array<[number, number]> = [];
    let m: RegExpExecArray | null;
    while ((m = rangeRegex.exec(sourceText)) !== null) {
      const startM = parseMonthYearEndpoint(m[1], m[2], false);
      const endM = parseMonthYearEndpoint(m[3], m[4], true);
      if (startM !== null && endM !== null && endM >= startM && endM - startM <= 35 * 12) {
        // Default bare year ranges like "2021 - 2024" without month tokens to year diff * 12
        if (!m[1] && !m[3] && /^\d{4}$/.test(m[4])) {
          spans.push([Number(m[2]) * 12, Number(m[4]) * 12]);
        } else {
          spans.push([startM, endM + 1]);
        }
      }
    }

    if (spans.length === 0) return null;
    spans.sort((a, b) => a[0] - b[0]);

    let totalMonths = 0;
    let [curStart, curEnd] = spans[0];
    for (let i = 1; i < spans.length; i++) {
      const [s, e] = spans[i];
      if (s <= curEnd) {
        curEnd = Math.max(curEnd, e);
      } else {
        totalMonths += curEnd - curStart;
        [curStart, curEnd] = [s, e];
      }
    }
    totalMonths += curEnd - curStart;

    const years = Math.round((totalMonths / 12) * 2) / 2; // Nearest 0.5 year
    return Math.max(0, Math.min(40, Math.round(years)));
  };

  const fromExpSection = extractMergedYears(experienceSectionText);
  if (fromExpSection !== null) return fromExpSection;

  return fullTextFallback ? extractMergedYears(fullTextFallback) : null;
}

/**
 * Verifies that an LLM-claimed skill or certification is grounded in the raw CV text
 * so hallucinated credentials can never contaminate structured candidate data.
 */
function filterGroundedItems(items: string[], rawText: string, whitelist: Set<string>): string[] {
  const lowerText = rawText.toLowerCase();
  const verified: string[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const canon = normalizeSkillName(trimmed).canonical;
    const key = canon.toLowerCase();
    if (seen.has(key)) continue;

    if (whitelist.has(key) || lowerText.includes(trimmed.toLowerCase()) || lowerText.includes(key)) {
      seen.add(key);
      verified.push(canon);
    }
  }
  return verified;
}

export async function analyzeCVText(
  rawText: string,
  candidateNameHint?: string
): Promise<{
  result: CVAnalysisOutput;
  latencyMs: number;
  tokensEstimated: number;
  fallbackUsed: boolean;
}> {
  const started = Date.now();
  const safeRawText = typeof rawText === 'string' ? rawText.slice(0, 50000) : '';
  const sections = parseSectionsFromCV(safeRawText);
  const { technicalSkills, softSkills, languages } = extractSkillsFromText(safeRawText);

  // Also capture comma/pipe-listed skills inside explicit Skills section if not in taxonomy
  const extraExplicitSkills: string[] = [];
  for (const line of sections.skills) {
    const cleaned = line.replace(/^[A-Za-z\s/&]+:\s*/, '');
    for (const token of cleaned.split(/[,|•·/]/)) {
      const t = token.replace(/^[-*]\s*/, '').trim();
      if (t.length >= 2 && t.length <= 28 && /^[A-Za-z0-9+#.\s-]+$/.test(t)) {
        const norm = normalizeSkillName(t);
        if (norm.taxonomyItem) {
          if (
            norm.category === 'SOFT' &&
            !softSkills.includes(norm.canonical)
          ) {
            softSkills.push(norm.canonical);
          } else if (
            norm.category !== 'SOFT' &&
            norm.category !== 'LANGUAGE' &&
            !technicalSkills.includes(norm.canonical)
          ) {
            technicalSkills.push(norm.canonical);
          }
        } else if (extraExplicitSkills.length < 6 && !/\b(and|with|years|experience|proficient)\b/i.test(t)) {
          extraExplicitSkills.push(t);
        }
      }
    }
  }

  for (const ext of extraExplicitSkills) {
    if (!technicalSkills.some((s) => s.toLowerCase() === ext.toLowerCase())) {
      technicalSkills.push(ext);
    }
  }

  // Extract Full Name strictly from document header or verified hint — never invent
  const firstHeaderLine = sections.header.find(
    (l) =>
      l.length >= 4 &&
      l.length <= 60 &&
      !l.includes('@') &&
      !/https?:\/\//i.test(l) &&
      !/\d{3}/.test(l) &&
      !/curriculum\s+vitae|resume/i.test(l)
  );
  const fullName = firstHeaderLine
    ? firstHeaderLine.split('|')[0].trim()
    : candidateNameHint || 'Not explicitly stated in document';

  const summaryText =
    sections.summary.join(' ').slice(0, 600) ||
    sections.header
      .slice(1)
      .filter((l) => l.length > 35 && !l.includes('@') && !/linkedin\.com|github\.com/i.test(l))
      .join(' ')
      .slice(0, 450) ||
    '';

  // Education extraction supporting single-line and multi-line layouts
  const eduLines =
    sections.education.length > 0
      ? sections.education
      : safeRawText
          .split('\n')
          .map((l) => l.trim())
          .filter((l) =>
            /\b(b\.?sc|m\.?sc|b\.?eng|m\.?eng|b\.?a|m\.?b\.?a|bachelor|master|ph\.?d|doctorate|diploma|ingenieur|ingénieur|university|institute|polytechnic|college)\b/i.test(
              l
            )
          );

  const education: Array<{ institution: string; degree: string; year?: string }> = [];
  const degreeRx =
    /\b(b\.?sc|m\.?sc|b\.?eng|m\.?eng|b\.?s|m\.?s|b\.?a|m\.?b\.?a|bachelor|master|ph\.?d|doctorate|diploma|licence|ingénieur|engineer)\b/i;
  const instRx = /\b(university|université|institute|institut|college|school|polytechnic|academy|faculty|école)\b/i;

  for (let i = 0; i < Math.min(eduLines.length, 8); i++) {
    const line = eduLines[i].replace(/^[-*•]\s*/, '').trim();
    if (line.length < 5) continue;
    const yearMatch = line.match(
      /\b(199\d|20\d{2})(?:\s*(?:-|–|—|to)\s*(?:199\d|20\d{2}|Present|Current))?\b/i
    );
    const parts = line
      .split(/\s*[|•—–]\s*|\s+-\s+|,\s+(?=[A-Z])/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      const degIdx = parts.findIndex((p) => degreeRx.test(p));
      const instIdx = parts.findIndex((p, idx) => idx !== degIdx && instRx.test(p));
      const degree = degIdx !== -1 ? parts[degIdx] : parts[0];
      const institution =
        instIdx !== -1
          ? parts[instIdx]
          : parts.find((_, idx) => idx !== (degIdx !== -1 ? degIdx : 0)) || parts[1];
      education.push({
        degree,
        institution,
        year: yearMatch?.[0],
      });
    } else if (degreeRx.test(line) || instRx.test(line)) {
      const nextLine = eduLines[i + 1]?.replace(/^[-*•]\s*/, '').trim();
      const nextYear = nextLine?.match(
        /\b(199\d|20\d{2})(?:\s*(?:-|–|—|to)\s*(?:199\d|20\d{2}|Present|Current))?\b/i
      );
      if (nextLine && ((degreeRx.test(line) && instRx.test(nextLine)) || (instRx.test(line) && degreeRx.test(nextLine)))) {
        education.push({
          degree: degreeRx.test(line) ? line : nextLine,
          institution: instRx.test(line) ? line : nextLine,
          year: yearMatch?.[0] || nextYear?.[0],
        });
        i++;
      } else {
        education.push({
          degree: line,
          institution: 'Institution stated in line',
          year: yearMatch?.[0],
        });
      }
    }
  }

  // Experience extraction strictly from CV text (supports inline & stacked role headers)
  const experience: Array<{
    role: string;
    company: string;
    period?: string;
    highlights: string[];
  }> = [];
  const expLines = sections.experience;
  let currentExp: {
    role: string;
    company: string;
    period?: string;
    highlights: string[];
  } | null = null;

  const periodRx =
    /\b(?:(?:[A-Za-zÀ-ÿ]{3,9}\.?|\d{1,2})[\s/.-]+)?(199\d|20\d{2})\s*(?:-|–|—|to|until)\s*(?:(?:[A-Za-zÀ-ÿ]{3,9}\.?|\d{1,2})[\s/.-]+)?(Present|Current|Now|Ongoing|199\d|20\d{2})\b/i;

  for (const line of expLines) {
    const isBullet = /^[-*•]/.test(line);
    const periodMatch = line.match(periodRx);
    const looksLikeRoleHeader =
      !isBullet &&
      line.length < 120 &&
      (Boolean(periodMatch) || line.includes('|') || /\s+at\s+/i.test(line));

    if (looksLikeRoleHeader) {
      if (currentExp) experience.push(currentExp);
      const cleanHeader = periodMatch
        ? line.replace(periodMatch[0], '').replace(/[()]/g, ' ').trim()
        : line;
      const splitAt = cleanHeader
        .split(/\s+at\s+|\s*[|@—–]\s*|\s+-\s+/i)
        .map((s) => s.trim())
        .filter(Boolean);
      currentExp = {
        role: splitAt[0] || cleanHeader || 'Professional Role',
        company: splitAt[1] || 'Organization listed in CV',
        period: periodMatch?.[0],
        highlights: [],
      };
    } else if (currentExp) {
      const cleanedBullet = line.replace(/^[-*•]\s*/, '').trim();
      if (cleanedBullet.length > 3) {
        currentExp.highlights.push(cleanedBullet);
      }
    }
  }
  if (currentExp) experience.push(currentExp);

  // Calculate years strictly from experience section first so university years aren't miscounted
  const yearsOfExperience = estimateYearsOfExperience(
    sections.experience.join('\n'),
    sections.experience.length === 0 ? safeRawText : undefined
  );

  // Certifications (never fabricated)
  const certifications = sections.certifications
    .map((l) => l.replace(/^[-*•]\s*/, '').trim())
    .filter((l) => l.length > 3 && !/^none|n\/a$/i.test(l))
    .slice(0, 8);

  // Projects
  const projects: Array<{ title: string; description: string }> = [];
  for (let i = 0; i < sections.projects.length; i++) {
    const line = sections.projects[i].replace(/^[-*•]\s*/, '').trim();
    if (!line) continue;
    if (line.includes(':')) {
      const [t, ...rest] = line.split(':');
      projects.push({ title: t.trim(), description: rest.join(':').trim() });
    } else if (line.includes('—') || line.includes(' - ')) {
      const [t, ...rest] = line.split(/\s*(?:—|\s-\s)\s*/);
      projects.push({ title: t.trim(), description: rest.join(' - ').trim() });
    } else if (line.length < 65 && sections.projects[i + 1]) {
      projects.push({
        title: line,
        description: sections.projects[++i].replace(/^[-*•]\s*/, '').trim(),
      });
    } else if (line.length > 10) {
      projects.push({ title: line.slice(0, 50), description: line });
    }
  }

  // Quantified achievements from bullets containing %, $, multipliers, or strong impact verbs
  const achievementCandidates = [
    ...sections.achievements.map((l) => l.replace(/^[-*•]\s*/, '').trim()),
    ...safeRawText
      .split('\n')
      .map((l) => l.replace(/^[-*•]\s*/, '').trim())
      .filter(
        (l) =>
          /\b(\d+(?:\.\d+)?%|\$\d+[kKmMbB]?|\d+x\b|reduced|increased|improved|accelerated|automated|delivered|architected|led|spearheaded)\b/i.test(
            l
          ) &&
          l.length > 25 &&
          l.length < 200
      ),
  ];
  const achievements = Array.from(new Set(achievementCandidates)).slice(0, 6);

  // Completeness score calculation (transparent & deterministic)
  let completeness = 0;
  const strengths: string[] = [];
  const missingInfo: string[] = [];
  const suggestions: string[] = [];

  if (summaryText.length >= 40) {
    completeness += 15;
    strengths.push('Includes a clear professional summary framing career focus.');
  } else {
    missingInfo.push('Professional Summary / Executive Overview');
    suggestions.push(
      'Add a concise 3–4 sentence professional summary highlighting core specialization and measurable outcomes.'
    );
  }

  if (technicalSkills.length >= 5) {
    completeness += 25;
    strengths.push(
      `Strong technical stack coverage (${technicalSkills.length} verified technical competencies).`
    );
  } else if (technicalSkills.length > 0) {
    completeness += 14;
    suggestions.push(
      'Expand your Technical Skills section with specific frameworks, databases, and testing/cloud tools.'
    );
  } else {
    missingInfo.push('Explicit Technical Skills Section');
    suggestions.push(
      'List concrete programming languages, frameworks, and tools so recruiters and matching models can verify alignment.'
    );
  }

  if (softSkills.length >= 2) {
    completeness += 8;
    strengths.push(
      `Demonstrates interpersonal and delivery skills (${softSkills.slice(0, 3).join(', ')}).`
    );
  } else {
    suggestions.push(
      'Highlight collaboration, problem-solving, mentoring, or agile delivery practices inside experience bullets.'
    );
  }

  if (experience.length >= 1 || sections.experience.length >= 3) {
    completeness += 22;
    strengths.push('Structured work experience timeline with clear role progression.');
  } else {
    missingInfo.push('Detailed Work / Internship Experience');
    suggestions.push(
      'Include work experience, internships, or engineering capstone roles with explicit date ranges and bulleted impact.'
    );
  }

  if (education.length >= 1) {
    completeness += 12;
  } else {
    missingInfo.push('Education & Degree Details');
    suggestions.push('Specify degree title, field of study, institution name, and graduation year.');
  }

  if (projects.length >= 1) {
    completeness += 8;
    strengths.push('Includes hands-on project evidence backing technical claims.');
  } else {
    missingInfo.push('Technical Projects / Portfolio Evidence');
    suggestions.push(
      'Add 2–3 notable software or data projects with architecture notes and repository/demo links.'
    );
  }

  if (achievements.length >= 2) {
    completeness += 6;
    strengths.push('Contains measurable, outcome-oriented accomplishments.');
  } else {
    suggestions.push(
      'Quantify achievements using concrete metrics (e.g., latency reduced by 35%, test coverage 90%, users served).'
    );
  }

  if (languages.length >= 1 || sections.languages.length >= 1) {
    completeness += 4;
  } else {
    missingInfo.push('Spoken Languages & Proficiency Levels');
  }

  completeness = Math.min(100, Math.max(safeRawText.trim().length > 20 ? 15 : 0, completeness));

  // Recommend job categories from domain tags of detected skills
  const categoryCounts = new Map<string, number>();
  for (const sk of technicalSkills) {
    const item = SKILL_TAXONOMY.find((t) => t.canonical.toLowerCase() === sk.toLowerCase());
    for (const tag of item?.domainTags || []) {
      categoryCounts.set(tag, (categoryCounts.get(tag) || 0) + 1);
    }
  }
  const recommendedCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([tag]) => tag);
  if (recommendedCategories.length === 0) {
    recommendedCategories.push('Entry-Level Technology & Operations');
  }

  const detectedLangs =
    languages.length > 0
      ? languages
      : sections.languages.length > 0
      ? sections.languages
          .map((l) => l.replace(/^[-*•]\s*/, '').trim())
          .filter(Boolean)
          .slice(0, 4)
      : [];

  const deterministicOutput: CVAnalysisOutput = cvAnalysisOutputSchema.parse({
    completenessScore: completeness,
    extractedData: {
      fullName,
      summary: summaryText || 'No dedicated summary section detected in uploaded CV.',
      technicalSkills,
      softSkills,
      education,
      experience: experience.slice(0, 6),
      yearsOfExperience,
      certifications,
      languages: detectedLangs,
      projects: projects.slice(0, 5),
      achievements,
    },
    skillsOverview:
      technicalSkills.length > 0
        ? `Identified ${technicalSkills.length} verified technical competencies (${technicalSkills
            .slice(0, 6)
            .join(', ')}) alongside ${softSkills.length} interpersonal/delivery skills.`
        : 'Limited standardized technical keywords detected; manual review of experience prose is recommended.',
    experienceOverview:
      yearsOfExperience !== null
        ? `Approximately ${yearsOfExperience} year(s) of non-overlapping timeline experience across ${Math.max(
            1,
            experience.length
          )} parsed role block(s).`
        : `Parsed ${experience.length} role block(s); exact cumulative years could not be deterministically verified from date ranges.`,
    strengths:
      strengths.length > 0
        ? strengths
        : ['Document text successfully extracted for structured review.'],
    missingInfo,
    suggestions: suggestions.slice(0, 5),
    recommendedCategories,
    aiMode: 'DETERMINISTIC_NLP',
    modelName: 'talentai-deterministic-nlp-v2',
  });

  // Live LLM Structured Extraction + Anti-Hallucination Grounding Verification
  const modelInfo = getActiveAIModelInfo();
  if (modelInfo.mode === 'LIVE_LLM' && safeRawText.trim().length >= 30) {
    const llmExtractionSchema = z.object({
      summary: z.string().optional(),
      technicalSkills: z.array(z.string()).default([]),
      softSkills: z.array(z.string()).default([]),
      certifications: z.array(z.string()).default([]),
      skillsOverview: z.string(),
      experienceOverview: z.string(),
      strengths: z.array(z.string()).min(1).max(5),
      suggestions: z.array(z.string()).min(1).max(5),
    });

    const llmRes = await callStructuredLLM({
      systemPrompt:
        'You are TalentAI Structured CV Analyzer. Extract ONLY facts explicitly written in the provided CV text. NEVER fabricate degrees, employers, skills, or certifications. Return valid JSON with keys: summary, technicalSkills, softSkills, certifications, skillsOverview, experienceOverview, strengths, suggestions.',
      userPrompt: `CV Text:\n${safeRawText.slice(0, 7500)}\n\nDeterministically verified baseline skills: ${technicalSkills.join(', ')}`,
      schema: llmExtractionSchema,
    });

    if (llmRes) {
      const techWhitelist = new Set(technicalSkills.map((s) => s.toLowerCase()));
      const softWhitelist = new Set(softSkills.map((s) => s.toLowerCase()));
      const certWhitelist = new Set(certifications.map((c) => c.toLowerCase()));

      const groundedTech = Array.from(
        new Set([
          ...technicalSkills,
          ...filterGroundedItems(llmRes.data.technicalSkills || [], safeRawText, techWhitelist),
        ])
      );
      const groundedSoft = Array.from(
        new Set([
          ...softSkills,
          ...filterGroundedItems(llmRes.data.softSkills || [], safeRawText, softWhitelist),
        ])
      );
      const groundedCerts =
        certifications.length > 0
          ? certifications
          : filterGroundedItems(llmRes.data.certifications || [], safeRawText, certWhitelist);

      const merged = cvAnalysisOutputSchema.parse({
        ...deterministicOutput,
        extractedData: {
          ...deterministicOutput.extractedData,
          summary:
            summaryText ||
            (llmRes.data.summary ? llmRes.data.summary.slice(0, 500) : deterministicOutput.extractedData.summary),
          technicalSkills: groundedTech,
          softSkills: groundedSoft,
          certifications: groundedCerts,
        },
        skillsOverview: llmRes.data.skillsOverview,
        experienceOverview: llmRes.data.experienceOverview,
        strengths: llmRes.data.strengths,
        suggestions: llmRes.data.suggestions,
        aiMode: 'LIVE_LLM',
        modelName: llmRes.modelName,
      });

      return {
        result: merged,
        latencyMs: Date.now() - started,
        tokensEstimated: llmRes.tokensEstimated,
        fallbackUsed: false,
      };
    }

    return {
      result: deterministicOutput,
      latencyMs: Date.now() - started,
      tokensEstimated: 0,
      fallbackUsed: true,
    };
  }

  return {
    result: deterministicOutput,
    latencyMs: Date.now() - started,
    tokensEstimated: Math.ceil(safeRawText.length / 4),
    fallbackUsed: false,
  };
}

// ============================================================================
// FEATURE 2: SEMANTIC JOB-CANDIDATE MATCHING & EXPLAINABLE SCORING
// ============================================================================

export interface MatchWeights {
  skills: number;           // default 40
  experience: number;       // default 25
  education: number;        // default 15
  responsibilities: number; // default 15
  language: number;         // default 5
}

export const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
  skills: 40,
  experience: 25,
  education: 15,
  responsibilities: 15,
  language: 5,
};

export function normalizeMatchWeights(customWeights?: Partial<MatchWeights>): MatchWeights {
  const cleanNum = (v: unknown, fallback: number): number => {
    if (v === undefined || v === null) return fallback;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(1000, n);
  };

  const raw: MatchWeights = {
    skills: cleanNum(customWeights?.skills, DEFAULT_MATCH_WEIGHTS.skills),
    experience: cleanNum(customWeights?.experience, DEFAULT_MATCH_WEIGHTS.experience),
    education: cleanNum(customWeights?.education, DEFAULT_MATCH_WEIGHTS.education),
    responsibilities: cleanNum(
      customWeights?.responsibilities,
      DEFAULT_MATCH_WEIGHTS.responsibilities
    ),
    language: cleanNum(customWeights?.language, DEFAULT_MATCH_WEIGHTS.language),
  };

  const sum =
    raw.skills + raw.experience + raw.education + raw.responsibilities + raw.language;
  if (sum <= 0) {
    return { ...DEFAULT_MATCH_WEIGHTS };
  }

  return {
    skills: Number(((raw.skills / sum) * 100).toFixed(1)),
    experience: Number(((raw.experience / sum) * 100).toFixed(1)),
    education: Number(((raw.education / sum) * 100).toFixed(1)),
    responsibilities: Number(((raw.responsibilities / sum) * 100).toFixed(1)),
    language: Number(((raw.language / sum) * 100).toFixed(1)),
  };
}

export interface CandidateMatchInput {
  fullName: string;
  headline?: string | null;
  bio?: string | null;
  yearsOfExperience: number;
  location?: string | null;
  remotePreference?: string | null;
  skills: string[];
  educations: Array<{ degree: string; fieldOfStudy: string; institution: string }>;
  experiences: Array<{ title: string; company: string; description: string }>;
  certifications: Array<{ name: string; issuer: string }>;
  projects: Array<{ title: string; description: string; technologies: string[] }>;
  languages: string[];
  cvText?: string | null;
}

export interface JobMatchInput {
  title: string;
  description: string;
  responsibilities: string[];
  qualifications: string[];
  requiredSkills: string[];
  preferredSkills?: string[];
  softSkills?: string[];
  minYearsExperience: number;
  educationRequirement?: string | null;
  location: string;
  workMode: string;
  requiredLanguages: string[];
}

export interface AdjacentSkillMatch {
  requiredSkill: string;
  matchedVia: string;
  credit: number;
}

export interface MatchDimensionRationales {
  skills: string;
  experience: string;
  education: string;
  responsibilities: string;
  language: string;
}

export interface MatchEvaluationResult {
  overallScore: number;
  skillScore: number;
  experienceScore: number;
  educationScore: number;
  responsibilityScore: number;
  languageScore: number;
  weightsUsed: MatchWeights;
  matchingSkills: string[];
  missingSkills: string[];
  adjacentSkills?: AdjacentSkillMatch[];
  dimensionRationales?: MatchDimensionRationales;
  relevantExperience: string;
  matchingQualifications: string[];
  explanation: string;
  verificationAreas: string[];
  usedLiveEmbeddings?: boolean;
  aiMode: 'LIVE_LLM' | 'DETERMINISTIC_NLP';
  modelName: string;
}

export async function computeCandidateJobMatch(
  candidate: CandidateMatchInput,
  job: JobMatchInput,
  customWeights?: Partial<MatchWeights>
): Promise<{
  result: MatchEvaluationResult;
  latencyMs: number;
  tokensEstimated: number;
  fallbackUsed?: boolean;
}> {
  const started = Date.now();
  const weights = normalizeMatchWeights(customWeights);

  // Safely handle optional arrays for callers with partial profile structs
  const candSkillsList = Array.isArray(candidate.skills) ? candidate.skills : [];
  const candProjects = Array.isArray(candidate.projects) ? candidate.projects : [];
  const candExperiences = Array.isArray(candidate.experiences) ? candidate.experiences : [];
  const candEducations = Array.isArray(candidate.educations) ? candidate.educations : [];
  const candCerts = Array.isArray(candidate.certifications) ? candidate.certifications : [];
  const candLanguages = Array.isArray(candidate.languages) ? candidate.languages : [];

  // Canonicalize candidate skills across profile + projects + experience prose + CV text
  const candidateSkillSet = new Set<string>();
  for (const s of candSkillsList) {
    candidateSkillSet.add(normalizeSkillName(s).canonical.toLowerCase());
  }
  for (const p of candProjects) {
    for (const t of p.technologies || []) {
      candidateSkillSet.add(normalizeSkillName(t).canonical.toLowerCase());
    }
  }
  const proseForSkills = stripProtectedAttributes(
    [
      candidate.headline || '',
      candidate.bio || '',
      ...candExperiences.map((e) => `${e.title} ${e.description}`),
      candidate.cvText || '',
    ].join('\n')
  );
  if (proseForSkills.trim()) {
    const fromProse = extractSkillsFromText(proseForSkills);
    for (const s of [...fromProse.technicalSkills, ...fromProse.softSkills]) {
      candidateSkillSet.add(s.toLowerCase());
    }
  }

  // 1. Technical & Transferable Ecosystem Skills Score (0..100)
  const matchingSkills: string[] = [];
  const missingSkills: string[] = [];
  const adjacentSkills: AdjacentSkillMatch[] = [];
  const requiredCanonical = Array.from(
    new Set((job.requiredSkills || []).map((s) => normalizeSkillName(s).canonical))
  );

  let effectiveSkillCredits = 0;
  for (const reqSkill of requiredCanonical) {
    const transfer = computeSkillTransferability(reqSkill, candidateSkillSet);
    if (transfer.matchType === 'EXACT') {
      matchingSkills.push(reqSkill);
      effectiveSkillCredits += 1;
    } else if (transfer.matchType === 'ADJACENT' && transfer.matchedVia) {
      missingSkills.push(reqSkill);
      adjacentSkills.push({
        requiredSkill: reqSkill,
        matchedVia: transfer.matchedVia,
        credit: transfer.credit,
      });
      effectiveSkillCredits += transfer.credit;
    } else {
      missingSkills.push(reqSkill);
    }
  }

  let skillScore =
    requiredCanonical.length > 0
      ? (effectiveSkillCredits / requiredCanonical.length) * 100
      : 80;

  // Bonus up to +10 (capped at 100) for matching preferred/soft skills
  const extraSkills = [...(job.preferredSkills || []), ...(job.softSkills || [])];
  if (extraSkills.length > 0) {
    const matchedExtras = extraSkills.filter((s) =>
      candidateSkillSet.has(normalizeSkillName(s).canonical.toLowerCase())
    );
    skillScore = Math.min(100, skillScore + (matchedExtras.length / extraSkills.length) * 10);
  }
  skillScore = Math.round(Math.min(100, Math.max(0, skillScore)));

  // 2. Relevant Experience & Role Alignment Score (0..100) — Protected-Attribute Invariant
  const reqYears = Math.max(0, job.minYearsExperience || 0);
  const candYears = Math.max(0, Number(candidate.yearsOfExperience) || 0);
  let yearsRatio = 1;
  if (reqYears > 0) {
    yearsRatio = Math.min(1.15, candYears / reqYears);
  }
  const candidateExpText = stripProtectedAttributes(
    [
      candidate.headline || '',
      ...candExperiences.map((e) => `${e.title} ${e.description}`),
    ].join(' ')
  );
  const jobRoleText = stripProtectedAttributes(
    `${job.title} ${job.description} ${(job.responsibilities || []).join(' ')}`
  );

  const roleHybrid = await computeHybridSemanticSimilarity(candidateExpText, jobRoleText);
  const experienceScore = Math.round(
    Math.min(
      100,
      Math.max(
        0,
        Math.min(1, yearsRatio) * 68 + Math.min(1, roleHybrid.similarity * 2.2) * 32
      )
    )
  );

  // 3. Education & Certifications Alignment Score (0..100)
  const matchingQualifications: string[] = [];
  const eduRank = (txt: string): number => {
    if (/\b(ph\.?d|doctorate)\b/i.test(txt)) return 4;
    if (/\b(master|m\.?sc|m\.?eng|m\.?b\.?a|ingénieur)\b/i.test(txt)) return 3;
    if (/\b(bachelor|b\.?sc|b\.?eng|b\.?a|licence|degree)\b/i.test(txt)) return 2;
    if (/\b(associate|diploma|bootcamp)\b/i.test(txt)) return 1;
    return 0;
  };

  let educationScore = 55;
  const reqEduRank = job.educationRequirement ? eduRank(job.educationRequirement) : 0;

  if (candEducations.length > 0) {
    const bestCandRank = Math.max(...candEducations.map((e) => eduRank(e.degree)));
    const topEdu = candEducations[0];
    matchingQualifications.push(
      `${topEdu.degree} in ${topEdu.fieldOfStudy} (${topEdu.institution})`
    );
    if (reqEduRank === 0 || bestCandRank >= reqEduRank) {
      educationScore = bestCandRank >= 3 ? 95 : 90;
    } else if (bestCandRank === reqEduRank - 1) {
      educationScore = 78;
    } else {
      educationScore = 68;
    }
  } else if (!job.educationRequirement) {
    educationScore = 75;
  }

  if (candCerts.length > 0) {
    educationScore = Math.min(100, educationScore + Math.min(10, candCerts.length * 5));
    for (const c of candCerts.slice(0, 2)) {
      matchingQualifications.push(`Certification: ${c.name} (${c.issuer})`);
    }
  }

  // 4. Job Responsibilities & Project Semantic Relevance (0..100)
  const candidateCorpus = stripProtectedAttributes(
    [
      candidate.bio || '',
      ...candExperiences.map((e) => e.description),
      ...candProjects.map((p) => `${p.title} ${p.description} ${(p.technologies || []).join(' ')}`),
      candidate.cvText || '',
    ].join(' ')
  );
  const jobRespCorpus = stripProtectedAttributes(
    [
      job.title,
      job.description,
      ...(job.responsibilities || []),
      ...(job.qualifications || []),
    ].join(' ')
  );

  const respHybrid = await computeHybridSemanticSimilarity(candidateCorpus, jobRespCorpus);
  const responsibilityScore = Math.round(
    Math.min(100, Math.max(20, respHybrid.similarity * 205))
  );

  // 5. Language Requirements Score (0..100)
  const candLangs = new Set([
    ...candLanguages.map((l) => l.toLowerCase()),
    ...(candidate.cvText
      ? extractSkillsFromText(candidate.cvText).languages.map((l) => l.toLowerCase())
      : []),
  ]);
  let languageScore = 100;
  const reqLangs =
    job.requiredLanguages && job.requiredLanguages.length > 0
      ? job.requiredLanguages
      : ['English'];
  const missingLangs: string[] = [];

  if (candLangs.size > 0) {
    const matchedLangCount = reqLangs.filter((rl) =>
      Array.from(candLangs).some((cl) => cl.includes(rl.toLowerCase()))
    ).length;
    languageScore = Math.round((matchedLangCount / reqLangs.length) * 100);
    for (const rl of reqLangs) {
      if (!Array.from(candLangs).some((cl) => cl.includes(rl.toLowerCase()))) {
        missingLangs.push(rl);
      } else {
        matchingQualifications.push(`Language: ${rl}`);
      }
    }
  } else {
    languageScore = 70; // Unspecified -> flag for human confirmation rather than zeroing
  }

  // Weighted Composite Compatibility Score (0..100)
  const overallScore = Math.round(
    Math.min(
      100,
      Math.max(
        0,
        (skillScore * weights.skills +
          experienceScore * weights.experience +
          educationScore * weights.education +
          responsibilityScore * weights.responsibilities +
          languageScore * weights.language) /
          100
      )
    )
  );

  // Explainable per-dimension rationales
  const dimensionRationales: MatchDimensionRationales = {
    skills:
      requiredCanonical.length > 0
        ? `Matched ${matchingSkills.length}/${requiredCanonical.length} core skills directly${
            adjacentSkills.length > 0
              ? ` plus ${adjacentSkills.length} transferable ecosystem skill(s) (${adjacentSkills
                  .map((a) => `${a.requiredSkill} via ${a.matchedVia}`)
                  .join(', ')})`
              : ''
          }.`
        : 'Evaluated against general technical profile competencies.',
    experience:
      reqYears > 0
        ? `${candYears} yr(s) documented vs ${reqYears}+ yr(s) target with ${Math.round(
            roleHybrid.similarity * 100
          )}% role-context semantic alignment.`
        : `${candYears} yr(s) documented experience aligned with ${job.title}.`,
    education:
      candEducations.length > 0
        ? `Verified ${candEducations[0].degree} (${candEducations[0].fieldOfStudy})${
            candCerts.length > 0 ? ` + ${candCerts.length} certification(s)` : ''
          }.`
        : 'No formal degree entry listed on profile; assess equivalent practical mastery.',
    responsibilities: `Semantic alignment between past deliverables/projects and role responsibilities scored ${responsibilityScore}/100${
      respHybrid.usedLiveEmbeddings ? ' (hybrid dense embeddings + IDF)' : ' (IDF unigram/bigram cosine)'
    }.`,
    language:
      missingLangs.length === 0 && candLangs.size > 0
        ? `Confirmed required language coverage (${reqLangs.join(', ')}).`
        : `Confirm working fluency in: ${(missingLangs.length > 0 ? missingLangs : reqLangs).join(', ')}.`,
  };

  // Areas requiring human verification
  const verificationAreas: string[] = [];
  if (adjacentSkills.length > 0) {
    verificationAreas.push(
      `Probe hands-on transferability for adjacent skills: ${adjacentSkills
        .map((a) => `${a.requiredSkill} (candidate lists ${a.matchedVia})`)
        .join('; ')}.`
    );
  }
  const pureMissing = missingSkills.filter(
    (ms) => !adjacentSkills.some((a) => a.requiredSkill === ms)
  );
  if (pureMissing.length > 0) {
    verificationAreas.push(
      `Verify practical familiarity or ramp-up plan for unattested required skills: ${pureMissing.join(', ')}.`
    );
  }
  if (candYears < reqYears) {
    verificationAreas.push(
      `Role specifies ${reqYears}+ years; candidate profile lists ${candYears} year(s) — evaluate architectural depth during technical interview.`
    );
  }
  if (missingLangs.length > 0 || candLangs.size === 0) {
    verificationAreas.push(
      `Confirm working proficiency in required language(s): ${reqLangs.join(', ')}.`
    );
  }
  if (job.workMode === 'ONSITE' && candidate.remotePreference === 'REMOTE') {
    verificationAreas.push(
      `Discuss workplace arrangement: job is On-Site (${job.location}) while candidate prefers Remote.`
    );
  }
  if (verificationAreas.length === 0) {
    verificationAreas.push(
      'Conduct structured technical and behavioral interview to validate applied architectural depth and team collaboration.'
    );
  }

  const relevantExperience =
    candExperiences.length > 0
      ? `${candYears} year(s) total experience, most recently as ${candExperiences[0].title} at ${candExperiences[0].company}.`
      : `${candYears} year(s) reported experience with ${candProjects.length} documented portfolio project(s).`;

  const alignmentBand =
    overallScore >= 80
      ? 'strong alignment'
      : overallScore >= 60
      ? 'moderate-to-good alignment'
      : 'partial alignment';

  let explanation = `Candidate demonstrates ${alignmentBand} (${overallScore}/100 decision-support estimate) for ${job.title}. Matched ${matchingSkills.length} of ${requiredCanonical.length} core required skills (${matchingSkills.join(', ') || 'none directly listed'}). `;
  if (adjacentSkills.length > 0) {
    explanation += `Demonstrates transferable ecosystem experience in ${adjacentSkills
      .map((a) => `${a.matchedVia} (adjacent to ${a.requiredSkill})`)
      .join(', ')}. `;
  }
  if (pureMissing.length > 0) {
    explanation += `Skills requiring verification or onboarding include ${pureMissing.join(', ')}. `;
  }
  explanation += `Note: Protected personal attributes are excluded from scoring, and final hiring decisions always rest with human reviewers.`;

  const usedLiveEmbeddings = roleHybrid.usedLiveEmbeddings || respHybrid.usedLiveEmbeddings;

  const modelInfo = getActiveAIModelInfo();
  if (modelInfo.mode === 'LIVE_LLM') {
    const llmRes = await callStructuredLLM({
      systemPrompt:
        'You are TalentAI Explainable Matching Engine. Write a concise, objective 2-3 sentence hiring alignment explanation strictly grounded in the supplied matchingSkills, adjacentSkills, missingSkills, and experience summary. Never invent facts, never mention protected personal attributes, and never recommend automatic rejection. Return JSON: { "explanation": "..." }',
      userPrompt: JSON.stringify({
        jobTitle: job.title,
        overallScore,
        dimensionScores: {
          skillScore,
          experienceScore,
          educationScore,
          responsibilityScore,
          languageScore,
        },
        matchingSkills,
        adjacentSkills,
        missingSkills: pureMissing,
        relevantExperience,
      }),
      schema: z.object({ explanation: z.string().min(20) }),
    });

    if (llmRes) {
      return {
        result: {
          overallScore,
          skillScore,
          experienceScore,
          educationScore,
          responsibilityScore,
          languageScore,
          weightsUsed: weights,
          matchingSkills,
          missingSkills,
          adjacentSkills,
          dimensionRationales,
          relevantExperience,
          matchingQualifications,
          explanation: `${llmRes.data.explanation} (Decision-support estimate — human review required.)`,
          verificationAreas,
          usedLiveEmbeddings,
          aiMode: 'LIVE_LLM',
          modelName: llmRes.modelName,
        },
        latencyMs: Date.now() - started,
        tokensEstimated: llmRes.tokensEstimated,
        fallbackUsed: false,
      };
    }

    return {
      result: {
        overallScore,
        skillScore,
        experienceScore,
        educationScore,
        responsibilityScore,
        languageScore,
        weightsUsed: weights,
        matchingSkills,
        missingSkills,
        adjacentSkills,
        dimensionRationales,
        relevantExperience,
        matchingQualifications,
        explanation,
        verificationAreas,
        usedLiveEmbeddings,
        aiMode: 'DETERMINISTIC_NLP',
        modelName: 'talentai-deterministic-nlp-v2',
      },
      latencyMs: Date.now() - started,
      tokensEstimated: 0,
      fallbackUsed: true,
    };
  }

  return {
    result: {
      overallScore,
      skillScore,
      experienceScore,
      educationScore,
      responsibilityScore,
      languageScore,
      weightsUsed: weights,
      matchingSkills,
      missingSkills,
      adjacentSkills,
      dimensionRationales,
      relevantExperience,
      matchingQualifications,
      explanation,
      verificationAreas,
      usedLiveEmbeddings,
      aiMode: 'DETERMINISTIC_NLP',
      modelName: 'talentai-deterministic-nlp-v2',
    },
    latencyMs: Date.now() - started,
    tokensEstimated: 180,
    fallbackUsed: false,
  };
}

// ============================================================================
// FEATURE 3: AI JOB DESCRIPTION GENERATOR
// ============================================================================

export const generatedJobSchema = z.object({
  professionalTitle: z.string(),
  overview: z.string(),
  responsibilities: z.array(z.string()),
  requiredQualifications: z.array(z.string()),
  preferredQualifications: z.array(z.string()),
  requiredSkills: z.array(z.string()),
  softSkills: z.array(z.string()),
  benefits: z.array(z.string()),
  applicationInstructions: z.string(),
  aiMode: z.enum(['LIVE_LLM', 'DETERMINISTIC_NLP']),
});

export type GeneratedJobOutput = z.infer<typeof generatedJobSchema>;

export async function generateJobDescriptionAI(input: {
  title: string;
  industry: string;
  requiredSkills: string[];
  experienceLevel: string;
  responsibilitiesHint?: string;
  employmentType: string;
  location: string;
  workMode?: string;
  companyName?: string;
}): Promise<{
  result: GeneratedJobOutput;
  latencyMs: number;
  tokensEstimated: number;
  fallbackUsed?: boolean;
}> {
  const started = Date.now();
  const canonicalSkills = (input.requiredSkills || []).map(
    (s) => normalizeSkillName(s).canonical
  );
  const levelLabelMap: Record<string, string> = {
    ENTRY: 'Entry-Level (0–1+ years)',
    JUNIOR: 'Junior (1–2+ years)',
    MID: 'Mid-Level (3–5+ years)',
    SENIOR: 'Senior (5–8+ years)',
    LEAD: 'Staff / Lead (8+ years)',
    EXECUTIVE: 'Principal / Executive',
  };
  const levelLabel = levelLabelMap[input.experienceLevel] || input.experienceLevel;
  const companyRef = input.companyName || `our ${input.industry} organization`;

  const hintItems = (input.responsibilitiesHint || '')
    .split(/\n|;/)
    .map((s) => s.replace(/^[-*•]\s*/, '').trim())
    .filter((s) => s.length > 4);

  const defaultResps = [
    `Design, build, and maintain reliable solutions leveraging ${canonicalSkills.slice(0, 4).join(', ')} in a collaborative agile environment.`,
    `Partner with product managers, designers, and fellow engineers across ${companyRef} to translate business problems into clean, maintainable systems.`,
    `Write automated tests, conduct constructive code reviews, and uphold security, accessibility, and performance standards.`,
    `Document architectural decisions, operational runbooks, and technical specifications clearly.`,
  ];

  const deterministic: GeneratedJobOutput = {
    professionalTitle: input.title.trim(),
    overview: `${companyRef} is seeking a motivated ${input.title} (${levelLabel}) to join our ${input.industry} team in ${input.location}${
      input.workMode ? ` (${input.workMode})` : ''
    }. In this ${input.employmentType
      .replace('_', '-')
      .toLowerCase()} role, you will apply ${canonicalSkills
      .slice(0, 5)
      .join(', ')} to deliver measurable customer value within an inclusive, engineering-driven culture.`,
    responsibilities:
      hintItems.length >= 2 ? [...hintItems, ...defaultResps.slice(0, 2)] : defaultResps,
    requiredQualifications: [
      `Demonstrated experience aligned with ${levelLabel} expectations in software, data, or technical delivery.`,
      `Hands-on proficiency with core stack technologies: ${canonicalSkills.join(', ')}.`,
      `Strong foundation in software engineering best practices, debugging, and version control.`,
      `Clear written and verbal communication skills in cross-functional teams.`,
    ],
    preferredQualifications: [
      `Prior domain exposure to ${input.industry} products or regulated production systems.`,
      `Experience with automated testing, CI/CD pipelines, and performance profiling.`,
      `Track record of mentoring peers or contributing to technical documentation and open standards.`,
    ],
    requiredSkills: canonicalSkills,
    softSkills: ['Communication', 'Problem Solving', 'Agile & Scrum', 'Team Leadership'].slice(
      0,
      input.experienceLevel === 'SENIOR' || input.experienceLevel === 'LEAD' ? 4 : 3
    ),
    benefits: [
      'Competitive base compensation with transparent leveling and annual performance review',
      `Flexible ${input.workMode ? input.workMode.toLowerCase() : 'hybrid'} work arrangements and modern equipment stipend`,
      'Comprehensive health & wellness coverage and paid parental leave',
      'Dedicated time for professional growth, certifications, and mentorship',
    ],
    applicationInstructions:
      'Submit your updated CV (PDF or DOCX) through TalentAI. Every application is reviewed by a human recruiter alongside transparent skill-alignment insights. Equal opportunity employer — we evaluate candidates solely on job-relevant skills and experience.',
    aiMode: 'DETERMINISTIC_NLP',
  };

  const modelInfo = getActiveAIModelInfo();
  if (modelInfo.mode === 'LIVE_LLM') {
    const llmSchema = generatedJobSchema.omit({ aiMode: true });
    const llmRes = await callStructuredLLM({
      systemPrompt:
        'You are TalentAI Inclusive Job Description Generator. Produce a clear, bias-free, professional job posting as JSON with keys: professionalTitle, overview, responsibilities, requiredQualifications, preferredQualifications, requiredSkills, softSkills, benefits, applicationInstructions. Never include age, gender, or demographic bias.',
      userPrompt: JSON.stringify(input),
      schema: llmSchema,
      redactPII: false,
    });
    if (llmRes) {
      return {
        result: { ...llmRes.data, aiMode: 'LIVE_LLM' },
        latencyMs: Date.now() - started,
        tokensEstimated: llmRes.tokensEstimated,
        fallbackUsed: false,
      };
    }
    return {
      result: deterministic,
      latencyMs: Date.now() - started,
      tokensEstimated: 0,
      fallbackUsed: true,
    };
  }

  return {
    result: deterministic,
    latencyMs: Date.now() - started,
    tokensEstimated: 260,
    fallbackUsed: false,
  };
}

// ============================================================================
// FEATURE 4: AI INTERVIEW QUESTION GENERATOR
// ============================================================================

export interface InterviewQuestionItem {
  id: string;
  category:
    | 'Technical'
    | 'Behavioral'
    | 'Situational'
    | 'Problem-Solving'
    | 'Previous Projects';
  question: string;
  skillAssessed: string;
  strongAnswerIndicators: string;
  evaluationCriteria: string;
}

export async function generateInterviewQuestionsAI(input: {
  jobTitle: string;
  jobDescription: string;
  requiredSkills: string[];
  seniorityLevel: string;
  candidateExperienceSummary?: string;
}): Promise<{
  questions: InterviewQuestionItem[];
  aiMode: 'LIVE_LLM' | 'DETERMINISTIC_NLP';
  latencyMs: number;
  tokensEstimated: number;
  fallbackUsed?: boolean;
}> {
  const started = Date.now();
  const skills =
    input.requiredSkills && input.requiredSkills.length > 0
      ? input.requiredSkills
      : ['Software Architecture', 'Problem Solving'];
  const primarySkill = skills[0];
  const secondarySkill = skills[1] || skills[0];
  const tertiarySkill = skills[2] || primarySkill;

  const questions: InterviewQuestionItem[] = [
    {
      id: 'q-tech-1',
      category: 'Technical',
      question: `Walk us through how you architect, test, and optimize a production feature using ${primarySkill}${
        secondarySkill !== primarySkill ? ` and ${secondarySkill}` : ''
      }. What trade-offs do you watch closely at ${input.seniorityLevel} level?`,
      skillAssessed: `${primarySkill}${
        secondarySkill !== primarySkill ? ` & ${secondarySkill}` : ''
      }`,
      strongAnswerIndicators:
        'Explains concrete architectural trade-offs, failure modes, testing strategy, and security/performance implications rather than textbook definitions.',
      evaluationCriteria: `1–5 scale on architectural clarity, practical depth in ${primarySkill}, and awareness of edge cases.`,
    },
    {
      id: 'q-tech-2',
      category: 'Technical',
      question: `Suppose a critical workflow relying on ${tertiarySkill} experiences intermittent latency spikes under peak load. How would you instrument, isolate, and remediate the bottleneck?`,
      skillAssessed: `${tertiarySkill} & Production Diagnostics`,
      strongAnswerIndicators:
        'Uses systematic observability (metrics, logs, query plans/traces), forms falsifiable hypotheses, and validates fixes safely before rollout.',
      evaluationCriteria:
        '1–5 scale on diagnostic methodology, root-cause rigor, and operational safety.',
    },
    {
      id: 'q-prob-1',
      category: 'Problem-Solving',
      question: `For our ${input.jobTitle} role, imagine you must deliver an MVP under a tight deadline while integrating an unfamiliar external API with strict rate limits and schema quirks. How do you design for resilience?`,
      skillAssessed: 'System Resilience & Analytical Problem Solving',
      strongAnswerIndicators:
        'Covers validation boundaries, retries/backoff, idempotency, graceful fallback, and clear scope prioritization.',
      evaluationCriteria:
        '1–5 scale on structured decomposition, risk mitigation, and pragmatic engineering judgment.',
    },
    {
      id: 'q-proj-1',
      category: 'Previous Projects',
      question: `Select a past project${
        input.candidateExperienceSummary
          ? ` (${input.candidateExperienceSummary.slice(0, 80)})`
          : ''
      } you are most proud of. What was your specific technical ownership, what went wrong mid-way, and what would you redesign today?`,
      skillAssessed: 'End-to-End Ownership & Reflective Learning',
      strongAnswerIndicators:
        'Distinguishes individual contribution from team effort, cites concrete metrics/outcomes, and demonstrates candid engineering self-reflection.',
      evaluationCriteria:
        '1–5 scale on ownership clarity, technical complexity handled, and lessons learned.',
    },
    {
      id: 'q-sit-1',
      category: 'Situational',
      question:
        'If a product stakeholder requests shipping a feature tomorrow that bypasses input validation or automated tests, how would you handle the conversation and propose an actionable path forward?',
      skillAssessed: 'Stakeholder Communication & Engineering Ethics',
      strongAnswerIndicators:
        'Communicates risk in business terms without hostility, negotiates phased mitigation or feature flags, and documents decisions transparently.',
      evaluationCriteria:
        '1–5 scale on constructive communication, risk articulation, and collaborative alignment.',
    },
    {
      id: 'q-beh-1',
      category: 'Behavioral',
      question:
        'Tell us about a time you disagreed with a teammate during a design or code review. How did you resolve the disagreement and maintain team trust?',
      skillAssessed: 'Collaboration & Constructive Feedback',
      strongAnswerIndicators:
        'Focuses on objective evidence/benchmarks over ego, listens actively to alternative viewpoints, and commits cleanly once a decision is made.',
      evaluationCriteria:
        '1–5 scale on empathy, evidence-based reasoning, and team cohesion.',
    },
  ];

  const modelInfo = getActiveAIModelInfo();
  if (modelInfo.mode === 'LIVE_LLM') {
    const schema = z.object({
      questions: z
        .array(
          z.object({
            id: z.string(),
            category: z.enum([
              'Technical',
              'Behavioral',
              'Situational',
              'Problem-Solving',
              'Previous Projects',
            ]),
            question: z.string(),
            skillAssessed: z.string(),
            strongAnswerIndicators: z.string(),
            evaluationCriteria: z.string(),
          })
        )
        .min(5),
    });
    const llmRes = await callStructuredLLM({
      systemPrompt:
        'You are TalentAI Structured Interview Designer. Generate 6 structured, bias-free interview questions covering Technical, Behavioral, Situational, Problem-Solving, and Previous Projects categories. Return JSON: { "questions": [...] }.',
      userPrompt: JSON.stringify(input),
      schema,
    });
    if (llmRes) {
      return {
        questions: llmRes.data.questions,
        aiMode: 'LIVE_LLM',
        latencyMs: Date.now() - started,
        tokensEstimated: llmRes.tokensEstimated,
        fallbackUsed: false,
      };
    }
    return {
      questions,
      aiMode: 'DETERMINISTIC_NLP',
      latencyMs: Date.now() - started,
      tokensEstimated: 0,
      fallbackUsed: true,
    };
  }

  return {
    questions,
    aiMode: 'DETERMINISTIC_NLP',
    latencyMs: Date.now() - started,
    tokensEstimated: 240,
    fallbackUsed: false,
  };
}

// ============================================================================
// FEATURE 5: AI INTERVIEW EVALUATION ASSISTANT (ETHICAL & CONSENT-GATED)
// ============================================================================

export interface InterviewEvaluationAIResult {
  organizedNotes: string;
  evidenceMap: Array<{
    requirement: string;
    evidenceFound: string;
    status: 'Demonstrated' | 'Partial' | 'Not Discussed';
  }>;
  demonstratedSkills: string[];
  unansweredQuestions: string[];
  suggestedFollowUps: string[];
  structuredSummary: string;
  ethicalNotice: string;
  aiMode: 'LIVE_LLM' | 'DETERMINISTIC_NLP';
}

const ETHICAL_INTERVIEW_NOTICE =
  'Responsible AI Safeguard: This workspace organizes interviewer-written notes against job requirements only. It does NOT infer personality, honesty, emotion, or mental traits, uses zero biometric data, and never makes automated hiring decisions.';

export async function evaluateInterviewNotesAI(input: {
  consentConfirmed: boolean;
  rawNotes: string;
  jobTitle: string;
  requiredSkills: string[];
  plannedQuestions?: string[];
}): Promise<{
  result: InterviewEvaluationAIResult;
  latencyMs: number;
  tokensEstimated: number;
  fallbackUsed?: boolean;
}> {
  if (!input.consentConfirmed) {
    throw new Error(
      'Candidate consent confirmation is mandatory before running AI note organization.'
    );
  }

  const started = Date.now();
  const cleanNotes = input.rawNotes.trim();
  const extracted = extractSkillsFromText(cleanNotes);
  const demonstratedSkills = Array.from(
    new Set([...extracted.technicalSkills, ...extracted.softSkills])
  );

  const noteSentences = cleanNotes
    .split(/\n|(?<=[.!?])\s+/)
    .map((s) => s.replace(/^[-*•]\s*/, '').trim())
    .filter((s) => s.length > 8);

  const evidenceMap: InterviewEvaluationAIResult['evidenceMap'] = (
    input.requiredSkills || []
  ).map((reqSkill) => {
    const canonical = normalizeSkillName(reqSkill).canonical;
    const matchingLine = noteSentences.find(
      (line) =>
        line.toLowerCase().includes(canonical.toLowerCase()) ||
        line.toLowerCase().includes(reqSkill.toLowerCase())
    );
    if (matchingLine) {
      return {
        requirement: canonical,
        evidenceFound: matchingLine,
        status: 'Demonstrated',
      };
    }
    if (demonstratedSkills.some((d) => d.toLowerCase() === canonical.toLowerCase())) {
      return {
        requirement: canonical,
        evidenceFound: `Referenced ${canonical} during interview discussion.`,
        status: 'Partial',
      };
    }
    return {
      requirement: canonical,
      evidenceFound: 'No explicit discussion found in submitted interviewer notes.',
      status: 'Not Discussed',
    };
  });

  const undiscussed = evidenceMap
    .filter((e) => e.status === 'Not Discussed')
    .map((e) => e.requirement);

  const unansweredQuestions: string[] = [];
  for (const pq of input.plannedQuestions || []) {
    const sim = computeSemanticSimilarity(pq, cleanNotes);
    if (sim < 0.14) {
      unansweredQuestions.push(pq);
    }
  }
  if (undiscussed.length > 0 && unansweredQuestions.length === 0) {
    unansweredQuestions.push(
      `Core job skill(s) not yet covered in notes: ${undiscussed.join(', ')}.`
    );
  }

  const suggestedFollowUps = undiscussed
    .slice(0, 4)
    .map(
      (sk) =>
        `Ask the candidate to walk through a concrete implementation or trade-off involving ${sk}.`
    );
  if (suggestedFollowUps.length === 0) {
    suggestedFollowUps.push(
      'Explore scalability trade-offs, testing habits, and onboarding expectations in the final round.'
    );
  }

  const organizedNotes = noteSentences.map((s, idx) => `${idx + 1}. ${s}`).join('\n');
  const demonstratedCount = evidenceMap.filter((e) => e.status !== 'Not Discussed').length;

  const deterministicSummary = `Structured Note Summary for ${
    input.jobTitle
  }: Documented evidence covers ${demonstratedCount} of ${Math.max(
    1,
    (input.requiredSkills || []).length
  )} target job competencies (${demonstratedSkills.join(', ') || 'general discussion'}). ${
    undiscussed.length > 0
      ? `Remaining areas to verify in follow-up conversation: ${undiscussed.join(', ')}.`
      : 'All listed target skills were touched upon in the interviewer notes.'
  } Final hiring judgment rests exclusively with the human hiring team.`;

  const modelInfo = getActiveAIModelInfo();
  if (modelInfo.mode === 'LIVE_LLM') {
    const evalSchema = z.object({
      organizedNotes: z.string(),
      structuredSummary: z.string(),
      suggestedFollowUps: z.array(z.string()).min(1).max(5),
    });

    const llmRes = await callStructuredLLM({
      systemPrompt:
        'You are TalentAI Interview Note Organizer. Organize ONLY the interviewer-written notes against job competencies. NEVER infer personality, emotion, honesty, or mental traits, and NEVER issue a hiring/rejection verdict. Return JSON: { "organizedNotes": "...", "structuredSummary": "...", "suggestedFollowUps": ["..."] }.',
      userPrompt: JSON.stringify({
        jobTitle: input.jobTitle,
        requiredSkills: input.requiredSkills,
        rawNotes: cleanNotes.slice(0, 5000),
      }),
      schema: evalSchema,
    });

    if (llmRes) {
      return {
        result: {
          organizedNotes: llmRes.data.organizedNotes,
          evidenceMap,
          demonstratedSkills,
          unansweredQuestions,
          suggestedFollowUps: llmRes.data.suggestedFollowUps,
          structuredSummary: llmRes.data.structuredSummary,
          ethicalNotice: ETHICAL_INTERVIEW_NOTICE,
          aiMode: 'LIVE_LLM',
        },
        latencyMs: Date.now() - started,
        tokensEstimated: llmRes.tokensEstimated,
        fallbackUsed: false,
      };
    }

    return {
      result: {
        organizedNotes: organizedNotes || cleanNotes,
        evidenceMap,
        demonstratedSkills,
        unansweredQuestions,
        suggestedFollowUps,
        structuredSummary: deterministicSummary,
        ethicalNotice: ETHICAL_INTERVIEW_NOTICE,
        aiMode: 'DETERMINISTIC_NLP',
      },
      latencyMs: Date.now() - started,
      tokensEstimated: 0,
      fallbackUsed: true,
    };
  }

  return {
    result: {
      organizedNotes: organizedNotes || cleanNotes,
      evidenceMap,
      demonstratedSkills,
      unansweredQuestions,
      suggestedFollowUps,
      structuredSummary: deterministicSummary,
      ethicalNotice: ETHICAL_INTERVIEW_NOTICE,
      aiMode: 'DETERMINISTIC_NLP',
    },
    latencyMs: Date.now() - started,
    tokensEstimated: Math.ceil(cleanNotes.length / 4) + 120,
    fallbackUsed: false,
  };
}

// ============================================================================
// FEATURE 6: AI CAREER ASSISTANT (MULTI-TURN CONTEXTUAL CANDIDATE CHATBOT)
// ============================================================================

export interface CareerAssistantContext {
  firstName: string;
  lastName: string;
  headline?: string | null;
  bio?: string | null;
  yearsOfExperience: number;
  location?: string | null;
  skills: string[];
  cvCompleteness?: number | null;
  cvMissingInfo?: string[];
  cvSuggestions?: string[];
  applicationsCount: number;
  topMatchingJobs: Array<{
    id: string;
    title: string;
    company: string;
    score: number;
    missingSkills: string[];
  }>;
}

export type CareerIntent =
  | 'CV_OPTIMIZATION'
  | 'SUMMARY_BIO_DRAFT'
  | 'COVER_LETTER_OUTREACH'
  | 'JOB_MATCHING'
  | 'SKILL_GAP_ROADMAP'
  | 'INTERVIEW_PREP'
  | 'SALARY_NEGOTIATION'
  | 'APPLICATION_STRATEGY'
  | 'GENERAL_GUIDANCE';

export function classifyCareerAssistantIntent(
  userMessage: string,
  history?: ChatTurnMessage[]
): CareerIntent {
  const q = userMessage.toLowerCase();

  if (/\b(cover\s+letter|outreach|message\s+recruiter|cold\s+message|pitch)\b/.test(q)) {
    return 'COVER_LETTER_OUTREACH';
  }
  if (/\b(salary|compensation|negotiate|negotiation|offer|pay|equity)\b/.test(q)) {
    return 'SALARY_NEGOTIATION';
  }
  if (/\b(cv|resume|bullet|bullets|completeness|ats|quantify)\b/.test(q)) {
    return 'CV_OPTIMIZATION';
  }
  if (/\b(summary|bio|headline|about\s+me|elevator\s+pitch)\b/.test(q)) {
    return 'SUMMARY_BIO_DRAFT';
  }
  if (/\b(interview|prepare|question|questions|star\s+method|behavioral|mock|whiteboard|system\s+design)\b/.test(q)) {
    return 'INTERVIEW_PREP';
  }
  if (/\b(missing|gap|gaps|learn|roadmap|skill|skills|upskill|course|project|portfolio|prerequisite)\b/.test(q)) {
    return 'SKILL_GAP_ROADMAP';
  }
  if (/\b(job|jobs|recommend|opportunity|opportunities|match|matches|role|roles)\b/.test(q)) {
    return 'JOB_MATCHING';
  }
  if (/\b(status|pipeline|shortlisted|application|applications|follow\s+up|withdraw)\b/.test(q)) {
    return 'APPLICATION_STRATEGY';
  }

  // Contextual follow-up resolution ("tell me more", "what about the second one?")
  if (history && history.length > 0 && q.split(/\s+/).length <= 8) {
    const lastUserTurn = [...history].reverse().find((m) => m.role === 'user');
    if (lastUserTurn && lastUserTurn.content !== userMessage) {
      return classifyCareerAssistantIntent(lastUserTurn.content);
    }
  }

  return 'GENERAL_GUIDANCE';
}

export async function runCareerAssistantAI(
  userMessage: string,
  ctx: CareerAssistantContext,
  history?: ChatTurnMessage[]
): Promise<{
  reply: string;
  suggestedActions: string[];
  intent?: CareerIntent;
  aiMode: 'LIVE_LLM' | 'DETERMINISTIC_NLP';
  latencyMs: number;
  tokensEstimated: number;
  fallbackUsed?: boolean;
}> {
  const started = Date.now();
  const cleanMessage = (userMessage || '').trim();
  const intent = classifyCareerAssistantIntent(cleanMessage, history);

  // Live LLM integration with multi-turn history & strict anti-fabrication schema
  const modelInfo = getActiveAIModelInfo();
  if (modelInfo.mode === 'LIVE_LLM') {
    const llmRes = await callStructuredLLM({
      systemPrompt:
        'You are TalentAI Career Assistant helping an authenticated candidate. Ground every piece of advice strictly in their authorized profile context and matched jobs supplied below. NEVER fabricate degrees, employers, completed courses, or certifications. Provide concise, actionable markdown guidance and up to 4 short suggested follow-up prompts. Return JSON: { "reply": "markdown text", "suggestedActions": ["...", "..."] }',
      userPrompt: `Authorized Candidate Context:\n${JSON.stringify(
        ctx
      )}\n\nDetected Topic: ${intent}\nCandidate Message: ${cleanMessage}`,
      history,
      schema: z.object({
        reply: z.string().min(15),
        suggestedActions: z.array(z.string()).min(1).max(4),
      }),
    });

    if (llmRes) {
      return {
        reply: llmRes.data.reply,
        suggestedActions: llmRes.data.suggestedActions,
        intent,
        aiMode: 'LIVE_LLM',
        latencyMs: Date.now() - started,
        tokensEstimated: llmRes.tokensEstimated,
        fallbackUsed: false,
      };
    }
  }

  const fallbackUsed = modelInfo.mode === 'LIVE_LLM';
  let reply = '';
  let suggestedActions: string[] = [];

  switch (intent) {
    case 'CV_OPTIMIZATION': {
      const scoreText =
        ctx.cvCompleteness !== null && ctx.cvCompleteness !== undefined
          ? `Your latest uploaded CV has a completeness score of **${ctx.cvCompleteness}/100**.`
          : `You haven't uploaded a CV for automated analysis yet.`;
      const missing =
        ctx.cvMissingInfo && ctx.cvMissingInfo.length > 0
          ? `\n\n**Sections to strengthen:**\n${ctx.cvMissingInfo.map((m) => `- ${m}`).join('\n')}`
          : '';
      const tips =
        ctx.cvSuggestions && ctx.cvSuggestions.length > 0
          ? `\n\n**High-impact improvements:**\n${ctx.cvSuggestions.map((s) => `- ${s}`).join('\n')}`
          : `\n\n**Actionable Bullet Formula (Action + System + Measurable Result):**\n- Instead of *"Worked on backend APIs"*, write *"Engineered rate-limited REST APIs using ${
              ctx.skills.slice(0, 2).join(' & ') || 'TypeScript & PostgreSQL'
            }, reducing p95 response latency by [X]%."*\n- Keep technical skills grouped by category and verify extracted fields in **My CV**.`;
      reply = `Hi ${ctx.firstName}! ${scoreText}${missing}${tips}`;
      suggestedActions = [
        'Draft a professional summary for my CV',
        'Which skills am I missing for top roles?',
        'How do I prepare for technical interviews?',
      ];
      break;
    }

    case 'SUMMARY_BIO_DRAFT': {
      const topSkills = ctx.skills.slice(0, 5).join(', ') || 'modern software technologies';
      const roleLabel = ctx.headline || 'Software & Technology Professional';
      reply = `Here is a tailored professional summary drafted strictly from your verified TalentAI profile (**${ctx.yearsOfExperience} yr(s)** experience — zero fabricated credentials):\n\n> "${roleLabel} with ${ctx.yearsOfExperience}+ years of hands-on experience designing and delivering reliable systems using ${topSkills}. Focused on clean architecture, measurable product outcomes, and collaborative cross-functional execution."\n\nYou can paste and customize this directly in **My Profile**!`;
      suggestedActions = [
        'Draft a short cover letter for my top job match',
        'How can I improve my CV completeness?',
        'Which jobs match my profile best?',
      ];
      break;
    }

    case 'COVER_LETTER_OUTREACH': {
      const targetJob = ctx.topMatchingJobs[0];
      const topSkills = ctx.skills.slice(0, 4).join(', ') || 'relevant technical skills';
      if (targetJob) {
        reply = `Here is a concise, evidence-based cover letter template tailored to **${targetJob.title}** at **${targetJob.company}** (**${targetJob.score}/100** match):\n\n> Dear ${targetJob.company} Hiring Team,\n>\n> With ${ctx.yearsOfExperience}+ years of hands-on experience in ${topSkills}, I am excited to apply for the **${targetJob.title}** role. In my recent work as ${
          ctx.headline || 'an engineer'
        }, I have focused on building maintainable, well-tested solutions aligned with your stack.\n>\n> I would welcome the opportunity to discuss how my background in ${topSkills} can contribute to ${targetJob.company}'s roadmap.\n>\n> Best regards,\n> ${ctx.firstName} ${ctx.lastName}`;
      } else {
        reply = `Here is a concise recruiter outreach & cover note grounded in your current profile (${topSkills}):\n\n> Hello Hiring Team,\n>\n> As ${
          ctx.headline || 'a technology professional'
        } with ${ctx.yearsOfExperience}+ years of experience across ${topSkills}, I am reaching out regarding open engineering opportunities on your team. I have attached my CV with concrete project outcomes and would value a brief conversation.\n>\n> Best regards,\n> ${ctx.firstName} ${ctx.lastName}`;
      }
      suggestedActions = [
        'Which jobs match my profile best?',
        'Help me prepare for technical interviews',
        'What skills should I learn next?',
      ];
      break;
    }

    case 'JOB_MATCHING': {
      if (ctx.topMatchingJobs.length > 0) {
        const list = ctx.topMatchingJobs
          .slice(0, 3)
          .map(
            (j, idx) =>
              `${idx + 1}. **${j.title}** at *${j.company}* — **${j.score}/100 alignment**${
                j.missingSkills.length > 0
                  ? ` *(Upskill focus: ${j.missingSkills.slice(0, 2).join(', ')})*`
                  : ' *(Strong core skill match!)*'
              }`
          )
          .join('\n');
        reply = `Based on your current skills (${
          ctx.skills.slice(0, 6).join(', ') || 'profile data'
        }), here are your highest-matching live roles on TalentAI:\n\n${list}\n\nVisit **Find Jobs** to inspect full requirements or draft a tailored cover letter!`;
      } else {
        reply = `Add at least 3–5 technical skills in **My Profile** or upload your CV in **My CV** so I can rank live job opportunities with exact compatibility scores!`;
      }
      suggestedActions = [
        'Draft a cover letter for my #1 matching job',
        'What skills should I learn next?',
        'How should I negotiate compensation?',
      ];
      break;
    }

    case 'SKILL_GAP_ROADMAP': {
      const rawMissing = new Set<string>();
      for (const j of ctx.topMatchingJobs) {
        for (const ms of j.missingSkills) rawMissing.add(ms);
      }
      const sequenced = orderSkillsByPrerequisites(Array.from(rawMissing)).slice(0, 4);
      const roadmapLines =
        sequenced.length > 0
          ? sequenced
              .map((sk, idx) => {
                const tax = SKILL_TAXONOMY.find(
                  (t) => t.canonical.toLowerCase() === sk.toLowerCase()
                );
                return `${idx + 1}. **${sk}** *(${tax?.difficulty || 'Moderate'}, ~${
                  tax?.estimatedWeeks || 3
                } weeks)*: ${
                  tax?.projectIdea ||
                  `Build a focused hands-on portfolio project demonstrating ${sk}.`
                }`;
              })
              .join('\n')
          : `1. **Automated Testing** *(Moderate, ~3 weeks)*: Add unit + E2E test suites to your flagship project.\n2. **Docker & CI/CD** *(Moderate, ~3 weeks)*: Containerize a full-stack service with automated GitHub Actions checks.`;

      reply = `Comparing your verified skills (${
        ctx.skills.slice(0, 6).join(', ') || 'none listed yet'
      }) against active roles, here is your **prerequisite-ordered** learning roadmap:\n\n${roadmapLines}\n\nOpen **Skill Analysis** in the sidebar for an interactive visual readiness chart!`;
      suggestedActions = [
        'Which jobs match my profile best?',
        'How can I showcase new projects on my CV?',
        'Help me prepare for technical interviews',
      ];
      break;
    }

    case 'INTERVIEW_PREP': {
      const coreSkills = ctx.skills.slice(0, 3).join(', ') || 'your core technical stack';
      const targetRole = ctx.topMatchingJobs[0]?.title || ctx.headline || 'your target role';
      reply = `Here is a structured interview preparation plan tailored for **${targetRole}** (${coreSkills}):\n\n1. **Technical Architecture Deep-Dive:** Practice explaining real trade-offs, failure modes, and performance tuning involving **${coreSkills}**.\n2. **STAR Behavioral Stories:** Prepare 3 concise *Situation – Task – Action – Result* narratives covering (a) debugging a production incident, (b) resolving a design disagreement, and (c) shipping under tight constraints.\n3. **Gap Honesty Strategy:** If asked about an adjacent/unfamiliar tool${
        ctx.topMatchingJobs[0]?.missingSkills?.[0]
          ? ` like **${ctx.topMatchingJobs[0].missingSkills[0]}**`
          : ''
      }, anchor your answer in closely related fundamentals you have shipped and explain how you validate new tools quickly.\n4. **Questions for the Interviewer:** Ask about code review standards, deployment frequency, and 90-day engineering milestones.`;
      suggestedActions = [
        'How do I negotiate an offer?',
        'Draft a professional summary for my profile',
        'What skills should I learn next?',
      ];
      break;
    }

    case 'SALARY_NEGOTIATION': {
      reply = `Here is an objective compensation & offer strategy grounded in your **${ctx.yearsOfExperience} yr(s)** experience level:\n\n1. **Research the Published Band First:** Check the transparent salary range listed on each TalentAI job card before quoting a number.\n2. **Anchor on Verified Scope & Skills:** Reference your demonstrated stack (${
        ctx.skills.slice(0, 5).join(', ') || 'core technical skills'
      }) and measurable delivery impact rather than personal needs.\n3. **Evaluate Total Compensation:** Compare base salary, remote/hybrid flexibility, learning budget, health benefits, and review cadence.\n4. **Collaborative Framing:** *"Based on the scope of this role and my ${ctx.yearsOfExperience} years of experience with ${
        ctx.skills.slice(0, 2).join(' and ') || 'this stack'
      }, I'm targeting a range around [X–Y] — how does that align with your leveling band?"*`;
      suggestedActions = [
        'Which jobs match my profile best?',
        'Help me prepare for technical interviews',
        'Draft a cover letter for my top job match',
      ];
      break;
    }

    case 'APPLICATION_STRATEGY': {
      reply = `You currently have **${ctx.applicationsCount} active application(s)** tracked on TalentAI.\n\n- **Quality Over Volume:** Roles where your compatibility score is **70+/100** and your cover note highlights concrete project evidence convert to interviews at significantly higher rates.\n- **After Applying:** Ensure your primary CV in **My CV** is candidate-verified and keep **Notifications** enabled so you never miss an interview slot or recruiter message.\n- **Following Up:** If an application stays in *Submitted* or *Under Review* for 7–10 business days, send a polite, 3-sentence note reiterating one relevant project outcome.`;
      suggestedActions = [
        'Which jobs match my profile best?',
        'Draft a recruiter follow-up message',
        'How can I improve my CV?',
      ];
      break;
    }

    case 'GENERAL_GUIDANCE':
    default: {
      reply = `Hello ${ctx.firstName}! I'm your **TalentAI Career Assistant** (contextualized to your profile with **${ctx.skills.length} verified skills** and **${ctx.applicationsCount} active application(s)**).\n\nI can help you with:\n- **CV Optimization:** Bullet quantification & section diagnostics (${
        ctx.cvCompleteness ? `${ctx.cvCompleteness}/100 completeness` : 'ready for upload'
      }).\n- **Explainable Job Matches:** Comparing why live jobs fit your background.\n- **Prerequisite Skill Roadmaps:** Sequencing missing skills with hands-on project ideas.\n- **Cover Letters, Interview Prep & Offer Strategy:** Tailored STAR stories, outreach drafts, and negotiation tips.\n\nWhat would you like to work on first?`;
      suggestedActions = [
        'How can I improve my CV?',
        'Which jobs match my profile best?',
        'What skills should I learn next?',
        'Help me prepare for technical interviews',
      ];
      break;
    }
  }

  return {
    reply,
    suggestedActions,
    intent,
    aiMode: 'DETERMINISTIC_NLP',
    latencyMs: Date.now() - started,
    tokensEstimated: 210,
    fallbackUsed,
  };
}

// ============================================================================
// FEATURE 7: SKILL GAP ANALYSIS (PREREQUISITE-ORDERED + OPTIONAL LIVE LLM)
// ============================================================================

export interface SkillGapOutput {
  targetTitle: string;
  targetType: 'JOB' | 'CAREER_PATH';
  readinessScore: number;
  existingSkills: string[];
  missingRequiredSkills: string[];
  niceToHaveSkills: string[];
  adjacentBridges?: Array<{ targetSkill: string; viaSkill: string; credit: number }>;
  totalEstimatedWeeks?: number;
  learningPriorities: Array<{
    skill: string;
    priority: 'High' | 'Medium' | 'Optional';
    difficulty: string;
    estimatedWeeks: number;
    recommendedProject: string;
  }>;
  chartData: Array<{
    skill: string;
    candidateScore: number;
    targetScore: number;
  }>;
  disclaimer: string;
  aiMode: 'LIVE_LLM' | 'DETERMINISTIC_NLP';
}

const SKILL_GAP_DISCLAIMER =
  'Skill comparison reflects self-reported and CV-extracted competencies only. TalentAI never fabricates completed courses or certifications.';

/**
 * Synchronous deterministic Skill Gap engine (always truthful: aiMode = 'DETERMINISTIC_NLP').
 * Incorporates proficiency levels, ecosystem adjacency bridges, and topological prerequisite ordering.
 */
export function computeSkillGapAnalysis(params: {
  candidateSkills: Array<{ name: string; level?: string }>;
  targetTitle: string;
  targetType: 'JOB' | 'CAREER_PATH';
  requiredSkills: string[];
  niceToHaveSkills?: string[];
}): SkillGapOutput {
  const levelScoreMap: Record<string, number> = {
    BEGINNER: 48,
    INTERMEDIATE: 75,
    ADVANCED: 92,
    EXPERT: 100,
  };

  const candMap = new Map<string, number>();
  const candSetLower = new Set<string>();
  for (const cs of params.candidateSkills || []) {
    if (!cs?.name) continue;
    const canon = normalizeSkillName(cs.name).canonical;
    const key = canon.toLowerCase();
    const score = levelScoreMap[cs.level || 'INTERMEDIATE'] ?? 75;
    candMap.set(key, Math.max(candMap.get(key) || 0, score));
    candSetLower.add(key);
  }

  const reqCanon = Array.from(
    new Set((params.requiredSkills || []).map((s) => normalizeSkillName(s).canonical))
  );
  const niceCanon = Array.from(
    new Set(
      (params.niceToHaveSkills || [])
        .map((s) => normalizeSkillName(s).canonical)
        .filter((n) => !reqCanon.includes(n))
    )
  );

  const existingSkills: string[] = [];
  const rawMissingRequired: string[] = [];
  const missingNice: string[] = [];
  const adjacentBridges: Array<{ targetSkill: string; viaSkill: string; credit: number }> = [];

  let reqCreditSum = 0;
  for (const r of reqCanon) {
    const score = candMap.get(r.toLowerCase());
    if (score !== undefined) {
      existingSkills.push(r);
      // Weight by proficiency readiness (e.g. BEGINNER contributes 0.72 of full mastery, INTERMEDIATE+ contributes ~0.92-1.0)
      reqCreditSum += Math.min(1, score / 85);
    } else {
      rawMissingRequired.push(r);
      const transfer = computeSkillTransferability(r, candSetLower);
      if (transfer.matchType === 'ADJACENT' && transfer.matchedVia) {
        adjacentBridges.push({
          targetSkill: r,
          viaSkill: transfer.matchedVia,
          credit: transfer.credit,
        });
        reqCreditSum += transfer.credit * 0.65;
      }
    }
  }

  let niceCreditSum = 0;
  for (const n of niceCanon) {
    if (candMap.has(n.toLowerCase())) {
      if (!existingSkills.includes(n)) existingSkills.push(n);
      niceCreditSum += 1;
    } else {
      missingNice.push(n);
    }
  }

  // Order missing required skills so foundational prerequisites are learned first!
  const missingRequiredSkills = orderSkillsByPrerequisites(rawMissingRequired);
  const orderedNice = orderSkillsByPrerequisites(missingNice);

  const reqRatio = reqCanon.length > 0 ? reqCreditSum / reqCanon.length : 1;
  const niceRatio = niceCanon.length > 0 ? niceCreditSum / niceCanon.length : reqRatio;
  const readinessScore = Math.round(Math.min(100, Math.max(0, reqRatio * 85 + niceRatio * 15)));

  const learningPriorities: SkillGapOutput['learningPriorities'] = [
    ...missingRequiredSkills.map((sk, idx) => {
      const tax = SKILL_TAXONOMY.find((t) => t.canonical.toLowerCase() === sk.toLowerCase());
      const bridge = adjacentBridges.find((b) => b.targetSkill === sk);
      const baseWeeks = tax?.estimatedWeeks || 3;
      const adjustedWeeks = bridge ? Math.max(1, Math.round(baseWeeks * 0.7)) : baseWeeks;
      const bridgeNote = bridge
        ? ` (Accelerated ramp-up leveraging your ${bridge.viaSkill} background.)`
        : '';
      return {
        skill: sk,
        priority: (idx < 3 ? 'High' : 'Medium') as 'High' | 'Medium',
        difficulty: tax?.difficulty || 'Moderate',
        estimatedWeeks: adjustedWeeks,
        recommendedProject: `${
          tax?.projectIdea ||
          `Build and document a reproducible portfolio module demonstrating ${sk} in production scenarios.`
        }${bridgeNote}`,
      };
    }),
    ...orderedNice.slice(0, 3).map((sk) => {
      const tax = SKILL_TAXONOMY.find((t) => t.canonical.toLowerCase() === sk.toLowerCase());
      return {
        skill: sk,
        priority: 'Optional' as const,
        difficulty: tax?.difficulty || 'Moderate',
        estimatedWeeks: tax?.estimatedWeeks || 3,
        recommendedProject:
          tax?.projectIdea ||
          `Extend an existing portfolio project with ${sk} as a stretch enhancement.`,
      };
    }),
  ];

  const totalEstimatedWeeks = learningPriorities
    .filter((lp) => lp.priority !== 'Optional')
    .reduce((sum, lp) => sum + lp.estimatedWeeks, 0);

  const allTargetSkills = [...reqCanon, ...niceCanon.slice(0, 3)].slice(0, 10);
  const chartData = allTargetSkills.map((sk) => {
    const direct = candMap.get(sk.toLowerCase());
    const bridge = adjacentBridges.find((b) => b.targetSkill === sk);
    const candidateScore =
      direct !== undefined
        ? direct
        : bridge
        ? Math.round(bridge.credit * 45)
        : 0;
    return {
      skill: sk,
      candidateScore,
      targetScore: reqCanon.includes(sk) ? 85 : 65,
    };
  });

  return {
    targetTitle: params.targetTitle,
    targetType: params.targetType,
    readinessScore,
    existingSkills,
    missingRequiredSkills,
    niceToHaveSkills: orderedNice,
    adjacentBridges,
    totalEstimatedWeeks,
    learningPriorities,
    chartData,
    disclaimer: SKILL_GAP_DISCLAIMER,
    aiMode: 'DETERMINISTIC_NLP',
  };
}

/**
 * Async AI-enriched Skill Gap Analysis:
 * Computes exact deterministic readiness/gap math first, then (when LIVE_LLM is configured)
 * tailors capstone project recommendations to the candidate's existing stack & target role
 * with strict Zod validation and automatic deterministic fallback.
 */
export async function runSkillGapAnalysisAI(params: {
  candidateSkills: Array<{ name: string; level?: string }>;
  targetTitle: string;
  targetType: 'JOB' | 'CAREER_PATH';
  requiredSkills: string[];
  niceToHaveSkills?: string[];
}): Promise<{
  analysis: SkillGapOutput;
  latencyMs: number;
  tokensEstimated: number;
  fallbackUsed: boolean;
}> {
  const started = Date.now();
  const base = computeSkillGapAnalysis(params);
  const modelInfo = getActiveAIModelInfo();

  if (modelInfo.mode !== 'LIVE_LLM' || base.learningPriorities.length === 0) {
    return {
      analysis: base,
      latencyMs: Date.now() - started,
      tokensEstimated: 150,
      fallbackUsed: false,
    };
  }

  const projectCustomizeSchema = z.object({
    customizedProjects: z.array(
      z.object({
        skill: z.string(),
        recommendedProject: z.string().min(15).max(320),
      })
    ),
  });

  const llmRes = await callStructuredLLM({
    systemPrompt:
      'You are TalentAI Learning Architect. Given a candidate’s existing skills and their missing skills for a target role, propose 1 concrete, hands-on portfolio project idea per missing skill that connects their existing skills to the new skill. Never claim the candidate already completed courses or certifications. Return JSON: { "customizedProjects": [{ "skill": "...", "recommendedProject": "..." }] }.',
    userPrompt: JSON.stringify({
      targetTitle: params.targetTitle,
      existingSkills: base.existingSkills,
      missingSkills: base.learningPriorities.map((lp) => lp.skill),
    }),
    schema: projectCustomizeSchema,
  });

  if (llmRes) {
    const projLookup = new Map(
      llmRes.data.customizedProjects.map((p) => [p.skill.toLowerCase(), p.recommendedProject])
    );
    const enrichedPriorities = base.learningPriorities.map((lp) => ({
      ...lp,
      recommendedProject: projLookup.get(lp.skill.toLowerCase()) || lp.recommendedProject,
    }));

    return {
      analysis: {
        ...base,
        learningPriorities: enrichedPriorities,
        aiMode: 'LIVE_LLM',
      },
      latencyMs: Date.now() - started,
      tokensEstimated: llmRes.tokensEstimated,
      fallbackUsed: false,
    };
  }

  return {
    analysis: base,
    latencyMs: Date.now() - started,
    tokensEstimated: 0,
    fallbackUsed: true,
  };
}

export { CAREER_PATH_BLUEPRINTS };
