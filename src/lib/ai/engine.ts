import { z } from 'zod';
import {
  SKILL_TAXONOMY,
  CAREER_PATH_BLUEPRINTS,
  extractSkillsFromText,
  normalizeSkillName,
} from '@/lib/ai/skill-taxonomy';
import { computeSemanticSimilarity } from '@/lib/ai/semantic';
import {
  callStructuredLLM,
  getActiveAIModelInfo,
} from '@/lib/ai/llm-client';

// ============================================================================
// FEATURE 1: AI CV ANALYZER
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

function parseSectionsFromCV(text: string): Record<string, string[]> {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
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
    ['summary', /^(professional\s+summary|summary|profile|about\s+me|objective)\s*:?$/i],
    ['experience', /^(work\s+experience|professional\s+experience|experience|employment\s+history)\s*:?$/i],
    ['education', /^(education|academic\s+background|qualifications)\s*:?$/i],
    ['skills', /^(technical\s+skills|core\s+skills|skills|competencies|technologies)\s*:?$/i],
    ['projects', /^(projects|selected\s+projects|key\s+projects|portfolio)\s*:?$/i],
    ['certifications', /^(certifications|certificates|licenses)\s*:?$/i],
    ['languages', /^(languages|spoken\s+languages)\s*:?$/i],
    ['achievements', /^(achievements|awards|accomplishments|honors)\s*:?$/i],
  ];

  for (const line of lines) {
    let matchedHeading = false;
    if (line.length <= 48) {
      for (const [sec, rx] of headingPatterns) {
        if (rx.test(line)) {
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

function estimateYearsOfExperience(text: string): number | null {
  // Explicit mention like "5+ years of experience" or "4 years experience"
  const explicit = text.match(/(\d{1,2})\+?\s+years?\s+of\s+(?:relevant\s+|professional\s+)?experience/i);
  if (explicit) {
    const val = Number(explicit[1]);
    if (val >= 0 && val <= 45) return val;
  }

  // Date range calculation e.g. 2020 - 2024 or 2021 - Present
  const currentYear = new Date().getFullYear();
  const rangeRegex = /\b(20\d{2}|199\d)\s*(?:-|–|—|to)\s*(present|current|now|20\d{2})\b/gi;
  const spans: Array<[number, number]> = [];
  let m: RegExpExecArray | null;
  while ((m = rangeRegex.exec(text)) !== null) {
    const start = Number(m[1]);
    const rawEnd = m[2].toLowerCase();
    const end = ['present', 'current', 'now'].includes(rawEnd) ? currentYear : Number(rawEnd);
    if (end >= start && end - start <= 25 && start >= 1995) {
      spans.push([start, end]);
    }
  }

  if (spans.length === 0) return null;
  // Exclude typical university 4-year blocks if only 1 span exists in education-only text
  spans.sort((a, b) => a[0] - b[0]);
  let totalYears = 0;
  let [curStart, curEnd] = spans[0];
  for (let i = 1; i < spans.length; i++) {
    const [s, e] = spans[i];
    if (s <= curEnd) {
      curEnd = Math.max(curEnd, e);
    } else {
      totalYears += curEnd - curStart;
      [curStart, curEnd] = [s, e];
    }
  }
  totalYears += curEnd - curStart;
  return Math.max(0, Math.min(35, totalYears));
}

export async function analyzeCVText(
  rawText: string,
  candidateNameHint?: string
): Promise<{ result: CVAnalysisOutput; latencyMs: number; tokensEstimated: number; fallbackUsed: boolean }> {
  const started = Date.now();
  const sections = parseSectionsFromCV(rawText);
  const { technicalSkills, softSkills, languages } = extractSkillsFromText(rawText);

  // Extract Full Name strictly from document lines or verified hint — never invent
  const firstHeaderLine = sections.header.find(
    (l) =>
      l.length >= 4 &&
      l.length <= 55 &&
      !l.includes('@') &&
      !/\d{3}/.test(l) &&
      !/curriculum\s+vitae|resume/i.test(l)
  );
  const fullName = firstHeaderLine || candidateNameHint || 'Not explicitly stated in document';

  const summaryText =
    sections.summary.join(' ').slice(0, 500) ||
    sections.header
      .slice(1)
      .filter((l) => l.length > 40 && !l.includes('@'))
      .join(' ')
      .slice(0, 400) ||
    '';

  // Education extraction
  const eduLines =
    sections.education.length > 0
      ? sections.education
      : rawText
          .split('\n')
          .filter((l) => /\b(b\.?sc|m\.?sc|bachelor|master|ph\.?d|engineering|university|institute|college|diploma)\b/i.test(l));

  const education: Array<{ institution: string; degree: string; year?: string }> = [];
  for (let i = 0; i < Math.min(eduLines.length, 6); i++) {
    const line = eduLines[i];
    if (line.length < 5) continue;
    const yearMatch = line.match(/\b(20\d{2}|199\d)(?:\s*[-–]\s*(?:20\d{2}|Present))?\b/i);
    const parts = line.split(/[|•—–,-]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      education.push({
        degree: parts[0],
        institution: parts[1],
        year: yearMatch?.[0],
      });
    } else if (/\b(b\.?sc|m\.?sc|bachelor|master|ph\.?d|degree|diploma|university|institute|school)\b/i.test(line)) {
      education.push({
        degree: line,
        institution: eduLines[i + 1] && !/\b(b\.?sc|m\.?sc|bachelor|master)\b/i.test(eduLines[i + 1]) ? eduLines[++i] : 'Institution stated in line',
        year: yearMatch?.[0],
      });
    }
  }

  // Experience extraction strictly from CV text
  const experience: Array<{ role: string; company: string; period?: string; highlights: string[] }> = [];
  const expLines = sections.experience;
  let currentExp: { role: string; company: string; period?: string; highlights: string[] } | null = null;

  for (const line of expLines) {
    const isBullet = /^[-*•]/.test(line);
    const hasDate = /\b(20\d{2}|199\d)\b/.test(line);
    if (!isBullet && (hasDate || line.includes('|') || /\bat\b/i.test(line)) && line.length < 110) {
      if (currentExp) experience.push(currentExp);
      const periodMatch = line.match(/\b(?:[A-Za-z]{3,9}\s+)?(20\d{2}|199\d)\s*(?:-|–|—|to)\s*(?:[A-Za-z]{3,9}\s+)?(Present|Current|20\d{2})\b/i);
      const cleanHeader = periodMatch ? line.replace(periodMatch[0], '').replace(/[|()]/g, ' ').trim() : line;
      const splitAt = cleanHeader.split(/\s+at\s+|\s*[|@—–-]\s*/i).map((s) => s.trim()).filter(Boolean);
      currentExp = {
        role: splitAt[0] || cleanHeader,
        company: splitAt[1] || 'Organization listed in CV',
        period: periodMatch?.[0],
        highlights: [],
      };
    } else if (currentExp) {
      currentExp.highlights.push(line.replace(/^[-*•]\s*/, ''));
    }
  }
  if (currentExp) experience.push(currentExp);

  const yearsOfExperience =
    sections.experience.length > 0
      ? estimateYearsOfExperience(sections.experience.join('\n')) ?? estimateYearsOfExperience(rawText)
      : estimateYearsOfExperience(rawText);

  // Certifications
  const certifications = sections.certifications
    .map((l) => l.replace(/^[-*•]\s*/, '').trim())
    .filter((l) => l.length > 3)
    .slice(0, 8);

  // Projects
  const projects: Array<{ title: string; description: string }> = [];
  for (let i = 0; i < sections.projects.length; i++) {
    const line = sections.projects[i].replace(/^[-*•]\s*/, '');
    if (line.includes(':')) {
      const [t, ...rest] = line.split(':');
      projects.push({ title: t.trim(), description: rest.join(':').trim() });
    } else if (line.length < 65 && sections.projects[i + 1]) {
      projects.push({ title: line, description: sections.projects[++i].replace(/^[-*•]\s*/, '') });
    } else if (line.length > 10) {
      projects.push({ title: line.slice(0, 50), description: line });
    }
  }

  // Quantified achievements from bullets containing %, $, or numbers
  const achievements = [
    ...sections.achievements.map((l) => l.replace(/^[-*•]\s*/, '')),
    ...rawText
      .split('\n')
      .map((l) => l.replace(/^[-*•]\s*/, '').trim())
      .filter((l) => /\b(\d+%|\$\d+|reduced|increased|improved|delivered|architected|led)\b/i.test(l) && l.length > 25 && l.length < 180),
  ].slice(0, 6);

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
    suggestions.push('Add a concise 3–4 sentence professional summary highlighting core specialization and impact.');
  }

  if (technicalSkills.length >= 5) {
    completeness += 25;
    strengths.push(`Strong technical stack coverage (${technicalSkills.length} recognized technical skills).`);
  } else if (technicalSkills.length > 0) {
    completeness += 14;
    suggestions.push('Expand your Technical Skills section with specific frameworks, databases, and tooling.');
  } else {
    missingInfo.push('Explicit Technical Skills Section');
    suggestions.push('List concrete programming languages, frameworks, and tools so recruiters and matching models can verify alignment.');
  }

  if (softSkills.length >= 2) {
    completeness += 8;
  } else {
    suggestions.push('Demonstrate collaboration, problem-solving, or agile delivery skills within experience bullet points.');
  }

  if (experience.length >= 1 || sections.experience.length >= 3) {
    completeness += 22;
    strengths.push('Structured work experience timeline with role context.');
  } else {
    missingInfo.push('Detailed Work / Internship Experience');
    suggestions.push('Include work experience, internships, or capstone roles with clear dates and responsibilities.');
  }

  if (education.length >= 1) {
    completeness += 12;
  } else {
    missingInfo.push('Education & Degree Details');
    suggestions.push('Specify degree title, institution name, and graduation year.');
  }

  if (projects.length >= 1) {
    completeness += 8;
    strengths.push('Includes hands-on project evidence backing technical claims.');
  } else {
    missingInfo.push('Technical Projects / Portfolio Evidence');
    suggestions.push('Add 2–3 notable software/engineering projects with links or architecture highlights.');
  }

  if (achievements.length >= 2) {
    completeness += 6;
    strengths.push('Contains measurable, outcome-oriented accomplishments.');
  } else {
    suggestions.push('Quantify achievements using metrics (e.g., latency reduced by 35%, test coverage, users served).');
  }

  if (languages.length >= 1 || sections.languages.length >= 1) {
    completeness += 4;
  } else {
    missingInfo.push('Spoken Languages & Proficiency Levels');
  }

  completeness = Math.min(100, Math.max(15, completeness));

  // Recommend job categories from domain tags of detected skills
  const categoryCounts = new Map<string, number>();
  for (const sk of technicalSkills) {
    const item = SKILL_TAXONOMY.find((t) => t.canonical === sk);
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
      ? sections.languages.slice(0, 4)
      : [];

  const deterministicOutput: CVAnalysisOutput = {
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
        ? `Identified ${technicalSkills.length} verified technical competencies (${technicalSkills.slice(0, 6).join(', ')}) alongside ${softSkills.length} interpersonal/delivery skills.`
        : 'Limited standardized technical keywords detected; manual review of experience prose is recommended.',
    experienceOverview:
      yearsOfExperience !== null
        ? `Approximately ${yearsOfExperience} year(s) of determinable timeline experience across ${Math.max(1, experience.length)} parsed role block(s).`
        : `Parsed ${experience.length} role block(s); exact cumulative years could not be deterministically verified from date ranges.`,
    strengths: strengths.length > 0 ? strengths : ['Document text successfully extracted for structured review.'],
    missingInfo,
    suggestions: suggestions.slice(0, 5),
    recommendedCategories,
    aiMode: 'DETERMINISTIC_NLP',
    modelName: 'talentai-deterministic-nlp-v1',
  };

  // Optional Live LLM narrative refinement (strictly grounded — never invents qualifications)
  const modelInfo = getActiveAIModelInfo();
  if (modelInfo.mode === 'LIVE_LLM') {
    const llmRefineSchema = z.object({
      skillsOverview: z.string(),
      experienceOverview: z.string(),
      strengths: z.array(z.string()).min(1).max(5),
      suggestions: z.array(z.string()).min(1).max(5),
    });

    const llmRes = await callStructuredLLM({
      systemPrompt:
        'You are TalentAI CV Analysis Engine. Summarize ONLY facts explicitly present in the provided CV text. Never invent degrees, employers, skills, or certifications. Return JSON with keys: skillsOverview, experienceOverview, strengths, suggestions.',
      userPrompt: `CV Text:\n${rawText.slice(0, 6000)}\n\nDeterministically extracted skills: ${technicalSkills.join(', ')}`,
      schema: llmRefineSchema,
    });

    if (llmRes) {
      return {
        result: {
          ...deterministicOutput,
          ...llmRes.data,
          aiMode: 'LIVE_LLM',
          modelName: modelInfo.modelName,
        },
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
    tokensEstimated: Math.ceil(rawText.length / 4),
    fallbackUsed: false,
  };
}

// ============================================================================
// FEATURE 2: INTELLIGENT JOB-CANDIDATE MATCHING (CONFIGURABLE & EXPLAINABLE)
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
  relevantExperience: string;
  matchingQualifications: string[];
  explanation: string;
  verificationAreas: string[];
  aiMode: 'LIVE_LLM' | 'DETERMINISTIC_NLP';
  modelName: string;
}

export async function computeCandidateJobMatch(
  candidate: CandidateMatchInput,
  job: JobMatchInput,
  customWeights?: Partial<MatchWeights>
): Promise<{ result: MatchEvaluationResult; latencyMs: number; tokensEstimated: number }> {
  const started = Date.now();

  // Normalize configurable weights so they always sum to 100
  const rawW: MatchWeights = {
    skills: customWeights?.skills ?? DEFAULT_MATCH_WEIGHTS.skills,
    experience: customWeights?.experience ?? DEFAULT_MATCH_WEIGHTS.experience,
    education: customWeights?.education ?? DEFAULT_MATCH_WEIGHTS.education,
    responsibilities: customWeights?.responsibilities ?? DEFAULT_MATCH_WEIGHTS.responsibilities,
    language: customWeights?.language ?? DEFAULT_MATCH_WEIGHTS.language,
  };
  const weightSum =
    rawW.skills + rawW.experience + rawW.education + rawW.responsibilities + rawW.language || 100;
  const weights: MatchWeights = {
    skills: Number(((rawW.skills / weightSum) * 100).toFixed(1)),
    experience: Number(((rawW.experience / weightSum) * 100).toFixed(1)),
    education: Number(((rawW.education / weightSum) * 100).toFixed(1)),
    responsibilities: Number(((rawW.responsibilities / weightSum) * 100).toFixed(1)),
    language: Number(((rawW.language / weightSum) * 100).toFixed(1)),
  };

  // Canonicalize candidate skills from profile + projects + CV text
  const candidateSkillSet = new Set<string>();
  for (const s of candidate.skills) {
    candidateSkillSet.add(normalizeSkillName(s).canonical.toLowerCase());
  }
  for (const p of candidate.projects) {
    for (const t of p.technologies || []) {
      candidateSkillSet.add(normalizeSkillName(t).canonical.toLowerCase());
    }
  }
  if (candidate.cvText) {
    const fromCv = extractSkillsFromText(candidate.cvText);
    for (const s of [...fromCv.technicalSkills, ...fromCv.softSkills]) {
      candidateSkillSet.add(s.toLowerCase());
    }
  }

  // 1. Technical & Professional Skills Score (0..100)
  const matchingSkills: string[] = [];
  const missingSkills: string[] = [];
  const requiredCanonical = job.requiredSkills.map((s) => normalizeSkillName(s).canonical);

  for (const reqSkill of requiredCanonical) {
    if (candidateSkillSet.has(reqSkill.toLowerCase())) {
      matchingSkills.push(reqSkill);
    } else {
      missingSkills.push(reqSkill);
    }
  }

  let skillScore =
    requiredCanonical.length > 0
      ? (matchingSkills.length / requiredCanonical.length) * 100
      : 80;

  // Bonus up to +10 (capped at 100) for matching preferred/soft skills
  const extraSkills = [...(job.preferredSkills || []), ...(job.softSkills || [])];
  if (extraSkills.length > 0) {
    const matchedExtras = extraSkills.filter((s) =>
      candidateSkillSet.has(normalizeSkillName(s).canonical.toLowerCase())
    );
    skillScore = Math.min(100, skillScore + (matchedExtras.length / extraSkills.length) * 10);
  }
  skillScore = Math.round(skillScore);

  // 2. Relevant Experience Score (0..100)
  const reqYears = Math.max(0, job.minYearsExperience || 0);
  let yearsRatio = 1;
  if (reqYears > 0) {
    yearsRatio = Math.min(1.15, candidate.yearsOfExperience / reqYears);
  }
  const candidateExpText = [
    candidate.headline || '',
    ...candidate.experiences.map((e) => `${e.title} ${e.description}`),
  ].join(' ');
  const jobRoleText = `${job.title} ${job.description} ${job.responsibilities.join(' ')}`;
  const roleSimilarity = computeSemanticSimilarity(candidateExpText, jobRoleText);
  const experienceScore = Math.round(
    Math.min(100, Math.min(1, yearsRatio) * 70 + Math.min(1, roleSimilarity * 2.4) * 30)
  );

  // 3. Education & Certifications Score (0..100)
  const matchingQualifications: string[] = [];
  let educationScore = 55;
  if (candidate.educations.length > 0) {
    educationScore = 82;
    const topEdu = candidate.educations[0];
    matchingQualifications.push(`${topEdu.degree} in ${topEdu.fieldOfStudy} (${topEdu.institution})`);
    if (
      job.educationRequirement &&
      /master|m\.?sc|phd/i.test(job.educationRequirement) &&
      candidate.educations.some((e) => /master|m\.?sc|phd|engineer/i.test(e.degree))
    ) {
      educationScore = 95;
    } else if (!job.educationRequirement || /bachelor|b\.?sc|degree/i.test(job.educationRequirement)) {
      educationScore = 90;
    }
  } else if (!job.educationRequirement) {
    educationScore = 75;
  }
  if (candidate.certifications.length > 0) {
    educationScore = Math.min(100, educationScore + Math.min(10, candidate.certifications.length * 5));
    for (const c of candidate.certifications.slice(0, 2)) {
      matchingQualifications.push(`Certification: ${c.name} (${c.issuer})`);
    }
  }

  // 4. Job Responsibilities & Project Semantic Relevance (0..100)
  const candidateCorpus = [
    candidate.bio || '',
    ...candidate.experiences.map((e) => e.description),
    ...candidate.projects.map((p) => `${p.title} ${p.description} ${p.technologies.join(' ')}`),
    candidate.cvText || '',
  ].join(' ');
  const jobRespCorpus = [job.title, job.description, ...job.responsibilities, ...job.qualifications].join(' ');
  const rawCosine = computeSemanticSimilarity(candidateCorpus, jobRespCorpus);
  // Calibrate cosine similarity (typical strong technical document overlap is 0.28–0.55)
  const responsibilityScore = Math.round(Math.min(100, Math.max(20, rawCosine * 210)));

  // 5. Language Requirements Score (0..100)
  const candLangs = new Set(
    [
      ...candidate.languages.map((l) => l.toLowerCase()),
      ...(candidate.cvText ? extractSkillsFromText(candidate.cvText).languages.map((l) => l.toLowerCase()) : []),
    ]
  );
  let languageScore = 100;
  const reqLangs = job.requiredLanguages.length > 0 ? job.requiredLanguages : ['English'];
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
    languageScore = 70; // Unverified in profile -> flagged for human check rather than penalized to 0
  }

  // Weighted Composite Compatibility Score (0..100)
  const overallScore = Math.round(
    (skillScore * weights.skills +
      experienceScore * weights.experience +
      educationScore * weights.education +
      responsibilityScore * weights.responsibilities +
      languageScore * weights.language) /
      100
  );

  // Areas requiring human verification
  const verificationAreas: string[] = [];
  if (missingSkills.length > 0) {
    verificationAreas.push(
      `Verify practical familiarity or adjacent transferability for missing skills: ${missingSkills.join(', ')}.`
    );
  }
  if (candidate.yearsOfExperience < reqYears) {
    verificationAreas.push(
      `Role specifies ${reqYears}+ years; candidate profile lists ${candidate.yearsOfExperience} year(s) — assess project depth during technical interview.`
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
      'Conduct structured technical and behavioral interview to validate applied architectural depth and team fit.'
    );
  }

  const relevantExperience =
    candidate.experiences.length > 0
      ? `${candidate.yearsOfExperience} year(s) total experience, most recently as ${candidate.experiences[0].title} at ${candidate.experiences[0].company}.`
      : `${candidate.yearsOfExperience} year(s) reported experience with ${candidate.projects.length} documented portfolio project(s).`;

  const alignmentBand =
    overallScore >= 80
      ? 'strong alignment'
      : overallScore >= 60
      ? 'moderate-to-good alignment'
      : 'partial alignment';

  let explanation = `${candidate.fullName} demonstrates ${alignmentBand} (${overallScore}/100 decision-support estimate) for ${job.title}. Matched ${matchingSkills.length} of ${requiredCanonical.length} core required skills (${matchingSkills.join(', ') || 'none directly listed'}). `;
  if (missingSkills.length > 0) {
    explanation += `Skills requiring verification or onboarding include ${missingSkills.join(', ')}. `;
  }
  explanation += `Note: This compatibility score is an explainable decision-support estimate and never an automated hiring or rejection decision.`;

  const modelInfo = getActiveAIModelInfo();
  if (modelInfo.mode === 'LIVE_LLM') {
    const llmRes = await callStructuredLLM({
      systemPrompt:
        'You are TalentAI Explainable Matching Engine. Write a concise 2-3 sentence factual explanation strictly using the supplied matchingSkills, missingSkills, and experience summary. Never invent facts or reference protected attributes. Return JSON: { "explanation": "..." }',
      userPrompt: JSON.stringify({
        jobTitle: job.title,
        overallScore,
        matchingSkills,
        missingSkills,
        relevantExperience,
      }),
      schema: z.object({ explanation: z.string() }),
    });
    if (llmRes) {
      explanation = `${llmRes.data.explanation} (Decision-support estimate — human review required.)`;
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
          relevantExperience,
          matchingQualifications,
          explanation,
          verificationAreas,
          aiMode: 'LIVE_LLM',
          modelName: modelInfo.modelName,
        },
        latencyMs: Date.now() - started,
        tokensEstimated: llmRes.tokensEstimated,
      };
    }
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
      relevantExperience,
      matchingQualifications,
      explanation,
      verificationAreas,
      aiMode: 'DETERMINISTIC_NLP',
      modelName: 'talentai-deterministic-nlp-v1',
    },
    latencyMs: Date.now() - started,
    tokensEstimated: 180,
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
}): Promise<{ result: GeneratedJobOutput; latencyMs: number; tokensEstimated: number }> {
  const started = Date.now();
  const canonicalSkills = input.requiredSkills.map((s) => normalizeSkillName(s).canonical);
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
    overview: `${companyRef} is seeking a motivated ${input.title} (${levelLabel}) to join our ${input.industry} team in ${input.location}${input.workMode ? ` (${input.workMode})` : ''}. In this ${input.employmentType.replace('_', '-').toLowerCase()} role, you will apply ${canonicalSkills.slice(0, 5).join(', ')} to deliver measurable customer value within an inclusive, engineering-driven culture.`,
    responsibilities: hintItems.length >= 2 ? [...hintItems, ...defaultResps.slice(0, 2)] : defaultResps,
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
      'Competitive base compensation with transparent leveling framework',
      'Flexible hybrid/remote work ergonomics & annual learning budget',
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
      };
    }
  }

  return {
    result: deterministic,
    latencyMs: Date.now() - started,
    tokensEstimated: 260,
  };
}

// ============================================================================
// FEATURE 4: AI INTERVIEW QUESTION GENERATOR
// ============================================================================

export interface InterviewQuestionItem {
  id: string;
  category: 'Technical' | 'Behavioral' | 'Situational' | 'Problem-Solving' | 'Previous Projects';
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
}> {
  const started = Date.now();
  const skills = input.requiredSkills.length > 0 ? input.requiredSkills : ['Software Architecture', 'Problem Solving'];
  const primarySkill = skills[0];
  const secondarySkill = skills[1] || skills[0];
  const tertiarySkill = skills[2] || primarySkill;

  const questions: InterviewQuestionItem[] = [
    {
      id: 'q-tech-1',
      category: 'Technical',
      question: `Walk us through how you architect, test, and optimize a production feature using ${primarySkill}${secondarySkill !== primarySkill ? ` and ${secondarySkill}` : ''}. What trade-offs do you watch closely at ${input.seniorityLevel} level?`,
      skillAssessed: `${primarySkill}${secondarySkill !== primarySkill ? ` & ${secondarySkill}` : ''}`,
      strongAnswerIndicators: `Explains concrete architectural trade-offs, failure modes, testing strategy, and security/performance implications rather than textbook definitions.`,
      evaluationCriteria: `1–5 scale on architectural clarity, practical depth in ${primarySkill}, and awareness of edge cases.`,
    },
    {
      id: 'q-tech-2',
      category: 'Technical',
      question: `Suppose a critical workflow relying on ${tertiarySkill} experiences intermittent latency spikes under peak load. How would you instrument, isolate, and remediate the bottleneck?`,
      skillAssessed: `${tertiarySkill} & Production Diagnostics`,
      strongAnswerIndicators: `Uses systematic observability (metrics, logs, query plans/traces), forms falsifiable hypotheses, and validates fixes safely before rollout.`,
      evaluationCriteria: `1–5 scale on diagnostic methodology, root-cause rigor, and operational safety.`,
    },
    {
      id: 'q-prob-1',
      category: 'Problem-Solving',
      question: `For our ${input.jobTitle} role, imagine you must deliver an MVP under a tight deadline while integrating an unfamiliar external API with strict rate limits and schema quirks. How do you design for resilience?`,
      skillAssessed: 'System Resilience & Analytical Problem Solving',
      strongAnswerIndicators: `Covers validation boundaries, retries/backoff, idempotency, graceful fallback, and clear scope prioritization.`,
      evaluationCriteria: `1–5 scale on structured decomposition, risk mitigation, and pragmatic engineering judgment.`,
    },
    {
      id: 'q-proj-1',
      category: 'Previous Projects',
      question: `Select a past project${input.candidateExperienceSummary ? ` (${input.candidateExperienceSummary.slice(0, 80)})` : ''} you are most proud of. What was your specific technical ownership, what went wrong mid-way, and what would you redesign today?`,
      skillAssessed: 'End-to-End Ownership & Reflective Learning',
      strongAnswerIndicators: `Distinguishes individual contribution from team effort, cites concrete metrics/outcomes, and demonstrates candid engineering self-reflection.`,
      evaluationCriteria: `1–5 scale on ownership clarity, technical complexity handled, and lessons learned.`,
    },
    {
      id: 'q-sit-1',
      category: 'Situational',
      question: `If a product stakeholder requests shipping a feature tomorrow that bypasses input validation or automated tests, how would you handle the conversation and propose an actionable path forward?`,
      skillAssessed: 'Stakeholder Communication & Engineering Ethics',
      strongAnswerIndicators: `Communicates risk in business terms without hostility, negotiates phased mitigation or feature flags, and documents decisions transparently.`,
      evaluationCriteria: `1–5 scale on constructive communication, risk articulation, and collaborative alignment.`,
    },
    {
      id: 'q-beh-1',
      category: 'Behavioral',
      question: `Tell us about a time you disagreed with a teammate during a design or code review. How did you resolve the disagreement and maintain team trust?`,
      skillAssessed: 'Collaboration & Constructive Feedback',
      strongAnswerIndicators: `Focuses on objective evidence/benchmarks over ego, listens actively to alternative viewpoints, and commits cleanly once a decision is made.`,
      evaluationCriteria: `1–5 scale on empathy, evidence-based reasoning, and team cohesion.`,
    },
  ];

  const modelInfo = getActiveAIModelInfo();
  if (modelInfo.mode === 'LIVE_LLM') {
    const schema = z.object({
      questions: z.array(
        z.object({
          id: z.string(),
          category: z.enum(['Technical', 'Behavioral', 'Situational', 'Problem-Solving', 'Previous Projects']),
          question: z.string(),
          skillAssessed: z.string(),
          strongAnswerIndicators: z.string(),
          evaluationCriteria: z.string(),
        })
      ).min(5),
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
      };
    }
  }

  return {
    questions,
    aiMode: 'DETERMINISTIC_NLP',
    latencyMs: Date.now() - started,
    tokensEstimated: 240,
  };
}

// ============================================================================
// FEATURE 5: AI INTERVIEW EVALUATION ASSISTANT (ETHICAL & CONSENT-GATED)
// ============================================================================

export interface InterviewEvaluationAIResult {
  organizedNotes: string;
  evidenceMap: Array<{ requirement: string; evidenceFound: string; status: 'Demonstrated' | 'Partial' | 'Not Discussed' }>;
  demonstratedSkills: string[];
  unansweredQuestions: string[];
  suggestedFollowUps: string[];
  structuredSummary: string;
  ethicalNotice: string;
  aiMode: 'LIVE_LLM' | 'DETERMINISTIC_NLP';
}

export async function evaluateInterviewNotesAI(input: {
  consentConfirmed: boolean;
  rawNotes: string;
  jobTitle: string;
  requiredSkills: string[];
  plannedQuestions?: string[];
}): Promise<{ result: InterviewEvaluationAIResult; latencyMs: number; tokensEstimated: number }> {
  if (!input.consentConfirmed) {
    throw new Error('Candidate consent confirmation is mandatory before running AI note organization.');
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

  const evidenceMap: InterviewEvaluationAIResult['evidenceMap'] = input.requiredSkills.map((reqSkill) => {
    const canonical = normalizeSkillName(reqSkill).canonical;
    const matchingLine = noteSentences.find((line) =>
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

  const suggestedFollowUps = undiscussed.slice(0, 4).map(
    (sk) => `Ask the candidate to walk through a concrete implementation or trade-off involving ${sk}.`
  );
  if (suggestedFollowUps.length === 0) {
    suggestedFollowUps.push(
      'Explore scalability trade-offs, testing habits, and onboarding expectations in the final round.'
    );
  }

  const organizedNotes = noteSentences.map((s, idx) => `${idx + 1}. ${s}`).join('\n');
  const demonstratedCount = evidenceMap.filter((e) => e.status !== 'Not Discussed').length;

  const structuredSummary = `Structured Note Summary for ${input.jobTitle}: Documented evidence covers ${demonstratedCount} of ${Math.max(1, input.requiredSkills.length)} target job competencies (${demonstratedSkills.join(', ') || 'general discussion'}). ${
    undiscussed.length > 0
      ? `Remaining areas to verify in follow-up conversation: ${undiscussed.join(', ')}.`
      : 'All listed target skills were touched upon in the interviewer notes.'
  } Final hiring judgment rests exclusively with the human hiring team.`;

  return {
    result: {
      organizedNotes: organizedNotes || cleanNotes,
      evidenceMap,
      demonstratedSkills,
      unansweredQuestions,
      suggestedFollowUps,
      structuredSummary,
      ethicalNotice:
        'Responsible AI Safeguard: This workspace organizes interviewer-written notes against job requirements only. It does NOT infer personality, honesty, emotion, or mental traits, uses zero biometric data, and never makes automated hiring decisions.',
      aiMode: getActiveAIModelInfo().mode === 'LIVE_LLM' ? 'LIVE_LLM' : 'DETERMINISTIC_NLP',
    },
    latencyMs: Date.now() - started,
    tokensEstimated: Math.ceil(cleanNotes.length / 4) + 120,
  };
}

// ============================================================================
// FEATURE 6: AI CAREER ASSISTANT (CANDIDATE CONTEXTUAL CHATBOT)
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
  topMatchingJobs: Array<{ id: string; title: string; company: string; score: number; missingSkills: string[] }>;
}

export async function runCareerAssistantAI(
  userMessage: string,
  ctx: CareerAssistantContext
): Promise<{
  reply: string;
  suggestedActions: string[];
  aiMode: 'LIVE_LLM' | 'DETERMINISTIC_NLP';
  latencyMs: number;
  tokensEstimated: number;
}> {
  const started = Date.now();
  const q = userMessage.toLowerCase();

  // Optional live LLM response grounded on candidate's authorized context
  const modelInfo = getActiveAIModelInfo();
  if (modelInfo.mode === 'LIVE_LLM') {
    const llmRes = await callStructuredLLM({
      systemPrompt:
        'You are TalentAI Career Assistant helping an authenticated candidate. Use ONLY their authorized profile context and matched jobs provided below. Never fabricate degrees, certifications, or employment history. Return JSON: { "reply": "markdown text", "suggestedActions": ["...", "..."] }',
      userPrompt: `Candidate Context: ${JSON.stringify(ctx)}\n\nUser Question: ${userMessage}`,
      schema: z.object({
        reply: z.string(),
        suggestedActions: z.array(z.string()).max(4),
      }),
    });
    if (llmRes) {
      return {
        reply: llmRes.data.reply,
        suggestedActions: llmRes.data.suggestedActions,
        aiMode: 'LIVE_LLM',
        latencyMs: Date.now() - started,
        tokensEstimated: llmRes.tokensEstimated,
      };
    }
  }

  // Contextual Deterministic Career Assistant covering all 8 required intents
  let reply = '';
  let suggestedActions: string[] = [];

  if (/\b(cv|resume|improve|completeness)\b/.test(q)) {
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
        : `\n\n**Actionable CV Tips:**\n- Start experience bullets with strong action verbs and measurable outcomes (%, latency, users).\n- Align your Technical Skills list with exact frameworks you have built with (${ctx.skills.slice(0, 5).join(', ') || 'e.g., TypeScript, React, PostgreSQL'}).`;
    reply = `Hi ${ctx.firstName}! ${scoreText}${missing}${tips}`;
    suggestedActions = ['Open My CV Analyzer', 'Generate a Professional Summary', 'Check Skill Gaps'];
  } else if (/\b(summary|bio|headline|about me)\b/.test(q)) {
    const topSkills = ctx.skills.slice(0, 5).join(', ') || 'modern software technologies';
    const roleLabel = ctx.headline || 'Software & Technology Professional';
    reply = `Here is a tailored professional summary drafted strictly from your current TalentAI profile (${ctx.yearsOfExperience} yr(s) experience):\n\n> "${roleLabel} with ${ctx.yearsOfExperience}+ years of hands-on experience delivering reliable solutions using ${topSkills}. Focused on clean architecture, measurable product impact, and collaborative cross-functional execution."\n\nYou can copy and refine this directly in **My Profile**!`;
    suggestedActions = ['Update My Profile Bio', 'Analyze My CV', 'Explore Matching Jobs'];
  } else if (/\b(job|recommend|opportunity|opportunities|apply|match)\b/.test(q)) {
    if (ctx.topMatchingJobs.length > 0) {
      const list = ctx.topMatchingJobs
        .slice(0, 3)
        .map(
          (j, idx) =>
            `${idx + 1}. **${j.title}** at *${j.company}* — **${j.score}/100 alignment**${
              j.missingSkills.length > 0 ? ` (Upskill opportunity: ${j.missingSkills.slice(0, 2).join(', ')})` : ' (Strong skill match!)'
            }`
        )
        .join('\n');
      reply = `Based on your current skills (${ctx.skills.slice(0, 6).join(', ') || 'profile data'}), here are your highest-matching live roles on TalentAI:\n\n${list}\n\nVisit **Find Jobs** to review full requirements and submit your application.`;
    } else {
      reply = `Add at least 3–5 technical skills in **My Profile** or upload your CV in **My CV** so I can rank live job opportunities with exact compatibility scores!`;
    }
    suggestedActions = ['Browse Recommended Jobs', 'Run Skill Gap Analysis', 'Update Career Preferences'];
  } else if (/\b(missing|gap|learn|roadmap|skill|upskill|course|project)\b/.test(q)) {
    const missingSet = new Set<string>();
    for (const j of ctx.topMatchingJobs) {
      for (const ms of j.missingSkills) missingSet.add(ms);
    }
    const missingArr = Array.from(missingSet).slice(0, 4);
    const roadmapLines =
      missingArr.length > 0
        ? missingArr
            .map((sk) => {
              const tax = SKILL_TAXONOMY.find((t) => t.canonical === sk);
              return `- **${sk}** (${tax?.difficulty || 'Moderate'}, ~${tax?.estimatedWeeks || 3} weeks): ${
                tax?.projectIdea || `Build a focused hands-on portfolio project demonstrating ${sk}.`
              }`;
            })
            .join('\n')
        : `- **Automated Testing** (Moderate, ~3 weeks): Add unit + E2E test suites to your flagship project.\n- **Docker & CI/CD** (Moderate, ~3 weeks): Containerize a full-stack service with automated GitHub Actions checks.`;

    reply = `Looking at your current skills (${ctx.skills.slice(0, 6).join(', ') || 'none listed yet'}) versus active roles on TalentAI, here is your prioritized learning path:\n\n${roadmapLines}\n\nOpen **Skill Analysis** in the sidebar for an interactive visual comparison chart!`;
    suggestedActions = ['Open Skill Analysis Chart', 'Add Portfolio Project', 'Find Matching Jobs'];
  } else if (/\b(interview|prepare|question|star)\b/.test(q)) {
    const coreSkills = ctx.skills.slice(0, 3).join(', ') || 'your core technical stack';
    reply = `Here is a structured interview preparation plan tailored to your background (${coreSkills}):\n\n1. **Technical Deep-Dive:** Be ready to explain architectural decisions, trade-offs, and debugging stories involving **${coreSkills}**.\n2. **STAR Behavioral Stories:** Prepare 3 concise Situation–Task–Action–Result examples covering a tough bug/incident, cross-team collaboration, and delivering under constraints.\n3. **Project Walkthrough:** Pick 1 flagship project and explain *why* you chose the database schema, security controls, and testing approach.\n4. **Smart Questions for Recruiters:** Ask about engineering onboarding, code review culture, and 90-day success metrics.`;
    suggestedActions = ['Check My Scheduled Interviews', 'Review My Applications', 'Strengthen Profile Projects'];
  } else {
    reply = `Hello ${ctx.firstName}! I'm your **TalentAI Career Assistant** (contextualized to your profile with **${ctx.skills.length} skills** and **${ctx.applicationsCount} active application(s)**).\n\nI can help you with:\n- **CV Improvement:** Actionable feedback on your uploaded CV (${ctx.cvCompleteness ? `${ctx.cvCompleteness}/100 completeness` : 'upload ready'}).\n- **Job Recommendations:** Explaining why top live jobs match your profile.\n- **Skill Gap & Learning Roadmaps:** Identifying high-ROI skills and portfolio project ideas.\n- **Professional Summary & Interview Prep:** Drafting your bio or practicing technical/STAR questions.\n\nAsk me about any of those topics!`;
    suggestedActions = [
      'How can I improve my CV?',
      'Which jobs match my profile best?',
      'What skills should I learn next?',
      'Help me prepare for technical interviews',
    ];
  }

  return {
    reply,
    suggestedActions,
    aiMode: 'DETERMINISTIC_NLP',
    latencyMs: Date.now() - started,
    tokensEstimated: 190,
  };
}

// ============================================================================
// FEATURE 7: SKILL GAP ANALYSIS
// ============================================================================

export interface SkillGapOutput {
  targetTitle: string;
  targetType: 'JOB' | 'CAREER_PATH';
  readinessScore: number;
  existingSkills: string[];
  missingRequiredSkills: string[];
  niceToHaveSkills: string[];
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

export function computeSkillGapAnalysis(params: {
  candidateSkills: Array<{ name: string; level?: string }>;
  targetTitle: string;
  targetType: 'JOB' | 'CAREER_PATH';
  requiredSkills: string[];
  niceToHaveSkills?: string[];
}): SkillGapOutput {
  const levelScoreMap: Record<string, number> = {
    BEGINNER: 45,
    INTERMEDIATE: 72,
    ADVANCED: 90,
    EXPERT: 100,
  };

  const candMap = new Map<string, number>();
  for (const cs of params.candidateSkills) {
    const canon = normalizeSkillName(cs.name).canonical;
    candMap.set(canon.toLowerCase(), levelScoreMap[cs.level || 'INTERMEDIATE'] ?? 75);
  }

  const reqCanon = params.requiredSkills.map((s) => normalizeSkillName(s).canonical);
  const niceCanon = (params.niceToHaveSkills || []).map((s) => normalizeSkillName(s).canonical);

  const existingSkills: string[] = [];
  const missingRequiredSkills: string[] = [];
  const missingNice: string[] = [];

  for (const r of reqCanon) {
    if (candMap.has(r.toLowerCase())) existingSkills.push(r);
    else missingRequiredSkills.push(r);
  }
  for (const n of niceCanon) {
    if (candMap.has(n.toLowerCase())) {
      if (!existingSkills.includes(n)) existingSkills.push(n);
    } else {
      missingNice.push(n);
    }
  }

  const readinessScore =
    reqCanon.length > 0
      ? Math.round(
          (reqCanon.filter((r) => candMap.has(r.toLowerCase())).length / reqCanon.length) * 85 +
            (niceCanon.length > 0
              ? (niceCanon.filter((n) => candMap.has(n.toLowerCase())).length / niceCanon.length) * 15
              : 15 * (reqCanon.filter((r) => candMap.has(r.toLowerCase())).length / reqCanon.length))
        )
      : 100;

  const learningPriorities: SkillGapOutput['learningPriorities'] = [
    ...missingRequiredSkills.map((sk, idx) => {
      const tax = SKILL_TAXONOMY.find((t) => t.canonical.toLowerCase() === sk.toLowerCase());
      return {
        skill: sk,
        priority: (idx < 3 ? 'High' : 'Medium') as 'High' | 'Medium',
        difficulty: tax?.difficulty || 'Moderate',
        estimatedWeeks: tax?.estimatedWeeks || 3,
        recommendedProject:
          tax?.projectIdea || `Build and document a reproducible portfolio module demonstrating ${sk} in production scenarios.`,
      };
    }),
    ...missingNice.slice(0, 3).map((sk) => {
      const tax = SKILL_TAXONOMY.find((t) => t.canonical.toLowerCase() === sk.toLowerCase());
      return {
        skill: sk,
        priority: 'Optional' as const,
        difficulty: tax?.difficulty || 'Moderate',
        estimatedWeeks: tax?.estimatedWeeks || 3,
        recommendedProject:
          tax?.projectIdea || `Extend an existing project with ${sk} as a stretch enhancement.`,
      };
    }),
  ];

  const allTargetSkills = [...reqCanon, ...niceCanon.slice(0, 3)].slice(0, 10);
  const chartData = allTargetSkills.map((sk) => ({
    skill: sk,
    candidateScore: candMap.get(sk.toLowerCase()) ?? 0,
    targetScore: reqCanon.includes(sk) ? 85 : 65,
  }));

  return {
    targetTitle: params.targetTitle,
    targetType: params.targetType,
    readinessScore: Math.min(100, Math.max(0, readinessScore)),
    existingSkills,
    missingRequiredSkills,
    niceToHaveSkills: missingNice,
    learningPriorities,
    chartData,
    disclaimer:
      'Skill comparison reflects self-reported and CV-extracted competencies only. TalentAI never fabricates completed courses or certifications.',
    aiMode: getActiveAIModelInfo().mode,
  };
}

export { CAREER_PATH_BLUEPRINTS };
