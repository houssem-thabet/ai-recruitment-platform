import { describe, it, expect } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { extractSkillsFromText, normalizeSkillName } from '../../src/lib/ai/skill-taxonomy';
import {
  computeSemanticSimilarity,
  redactPIIForExternalLLM,
  tokenizeForSimilarity,
} from '../../src/lib/ai/semantic';
import {
  validateCVFileBuffer,
  extractTextFromCVBuffer,
} from '../../src/lib/cv-parser';
import {
  analyzeCVText,
  computeCandidateJobMatch,
  generateJobDescriptionAI,
  generateInterviewQuestionsAI,
  evaluateInterviewNotesAI,
  runCareerAssistantAI,
  computeSkillGapAnalysis,
  CAREER_PATH_BLUEPRINTS,
} from '../../src/lib/ai/engine';

describe('Unit Tests: AI Engine, Semantic Scoring & CV Parser', () => {
  it('normalizes aliases and extracts categorized technical and soft skills', () => {
    expect(normalizeSkillName('reactjs').canonical).toBe('React');
    expect(normalizeSkillName('nodejs').canonical).toBe('Node.js');

    const extracted = extractSkillsFromText(
      'Built distributed microservices using TypeScript, React, Node.js, PostgreSQL, Docker, and strong Communication.'
    );
    expect(extracted.technicalSkills).toContain('TypeScript');
    expect(extracted.technicalSkills).toContain('React');
    expect(extracted.technicalSkills).toContain('Node.js');
    expect(extracted.technicalSkills).toContain('PostgreSQL');
    expect(extracted.technicalSkills).toContain('Docker');
    expect(extracted.softSkills).toContain('Communication');
  });

  it('computes semantic cosine similarity while excluding protected demographic attributes and redacts PII', () => {
    const highSim = computeSemanticSimilarity(
      'Senior Full-Stack Engineer building TypeScript Next.js PostgreSQL SaaS platforms',
      'We need a Full-Stack TypeScript Next.js Engineer experienced with PostgreSQL SaaS systems'
    );
    const lowSim = computeSemanticSimilarity(
      'Graphic illustrator focusing on watercolor print media',
      'Kubernetes Rust kernel networking infrastructure engineer'
    );
    expect(highSim).toBeGreaterThan(lowSim);
    expect(highSim).toBeGreaterThan(0.25);

    // Responsible AI: protected terms are stripped from matching tokens
    const tokens = tokenizeForSimilarity('female christian engineer married TypeScript');
    expect(tokens).not.toContain('female');
    expect(tokens).not.toContain('christian');
    expect(tokens).not.toContain('married');

    const redacted = redactPIIForExternalLLM('Contact jane.doe@example.com or +1 555-234-5678');
    expect(redacted).toContain('[REDACTED_EMAIL]');
    expect(redacted).toContain('[REDACTED_PHONE]');
  });

  it('validates CV uploads strictly using extension, size, and binary magic-byte signatures', async () => {
    const pdfPath = path.join(process.cwd(), 'public', 'sample-cvs', 'sample-fullstack-cv.pdf');
    const docxPath = path.join(process.cwd(), 'public', 'sample-cvs', 'sample-ai-engineer-cv.docx');
    const pdfBuf = await fs.readFile(pdfPath);
    const docxBuf = await fs.readFile(docxPath);

    expect(validateCVFileBuffer('resume.pdf', pdfBuf, 'application/pdf').valid).toBe(true);
    expect(
      validateCVFileBuffer(
        'resume.docx',
        docxBuf,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ).valid
    ).toBe(true);

    // Rejects executable or spoofed PDF without %PDF- signature
    expect(
      validateCVFileBuffer('malware.exe', Buffer.from('MZ-executable')).valid
    ).toBe(false);
    expect(
      validateCVFileBuffer('spoofed.pdf', Buffer.from('NOT-A-PDF-HEADER')).valid
    ).toBe(false);

    // Rejects oversize (> 5MB)
    const hugeBuf = Buffer.alloc(6 * 1024 * 1024, 0x41);
    expect(validateCVFileBuffer('huge.pdf', hugeBuf).valid).toBe(false);
  });

  it('parses real sample PDF and DOCX CV files into clean text and structured AI JSON without fabricating credentials', async () => {
    const pdfPath = path.join(process.cwd(), 'public', 'sample-cvs', 'sample-fullstack-cv.pdf');
    const docxPath = path.join(process.cwd(), 'public', 'sample-cvs', 'sample-ai-engineer-cv.docx');

    const pdfBuf = await fs.readFile(pdfPath);
    const docxBuf = await fs.readFile(docxPath);

    const parsedPdfText = await extractTextFromCVBuffer(pdfBuf, 'pdf');
    expect(parsedPdfText.length).toBeGreaterThan(80);
    expect(parsedPdfText).toContain('TypeScript');

    const parsedDocxText = await extractTextFromCVBuffer(docxBuf, 'docx');
    expect(parsedDocxText.length).toBeGreaterThan(80);
    expect(parsedDocxText).toContain('Python');

    const analysis = await analyzeCVText(parsedPdfText);
    expect(['LIVE_LLM', 'DETERMINISTIC_NLP']).toContain(analysis.result.aiMode);
    expect(analysis.result.extractedData.technicalSkills).toContain('TypeScript');
    // Responsible AI: never fabricates unmentioned security certifications
    expect(JSON.stringify(analysis.result.extractedData.certifications)).not.toContain('CISSP');
  });

  it('computes transparent, configurable candidate-job match scores (default 40/25/15/15/5 weights)', async () => {
    const candidateInput = {
      fullName: 'Alex Rivera',
      headline: 'Senior Full-Stack Engineer',
      bio: 'Experienced building TypeScript, React, Next.js, Node.js, and PostgreSQL web platforms.',
      location: 'Paris, France',
      remotePreference: 'HYBRID',
      yearsOfExperience: 6,
      skills: ['TypeScript', 'React', 'Next.js', 'Node.js', 'PostgreSQL', 'Docker'],
      educations: [
        { degree: "Master's", fieldOfStudy: 'Computer Science', institution: 'State University' },
      ],
      experiences: [
        {
          title: 'Senior Full-Stack Engineer',
          company: 'CloudTech',
          description: 'Built TypeScript Next.js and PostgreSQL SaaS microservices.',
        },
      ],
      certifications: [],
      projects: [
        {
          title: 'Realtime Collaboration App',
          description: 'WebSockets & React platform',
          technologies: ['TypeScript', 'React'],
        },
      ],
      languages: ['English', 'French'],
    };

    const jobInput = {
      title: 'Senior Full-Stack AI Engineer',
      description: 'Build Next.js, TypeScript, and PostgreSQL recruitment tools.',
      responsibilities: ['Architect TypeScript Next.js apps', 'Design PostgreSQL schemas'],
      qualifications: ["Bachelor's degree in CS", '4+ years full-stack experience'],
      requiredSkills: ['TypeScript', 'React', 'PostgreSQL', 'Kubernetes'],
      minYearsExperience: 4,
      educationRequirement: "Bachelor's",
      location: 'Paris, France',
      workMode: 'HYBRID',
      requiredLanguages: ['English'],
    };

    const match = await computeCandidateJobMatch(candidateInput, jobInput);
    expect(match.result.overallScore).toBeGreaterThanOrEqual(70);
    expect(match.result.matchingSkills).toContain('TypeScript');
    expect(match.result.missingSkills).toContain('Kubernetes');
    expect(match.result.weightsUsed).toEqual({
      skills: 40,
      experience: 25,
      education: 15,
      responsibilities: 15,
      language: 5,
    });

    const customWeighted = await computeCandidateJobMatch(candidateInput, jobInput, {
      skills: 80,
      experience: 5,
      education: 5,
      responsibilities: 5,
      language: 5,
    });
    expect(customWeighted.result.weightsUsed.skills).toBe(80);
  });

  it('executes JD generator, interview question generator, consent-gated note evaluator, career assistant & skill gap analysis', async () => {
    const jd = await generateJobDescriptionAI({
      title: 'Backend Platform Engineer',
      industry: 'Cloud SaaS',
      requiredSkills: ['Node.js', 'PostgreSQL', 'Docker'],
      experienceLevel: 'SENIOR',
      employmentType: 'FULL_TIME',
      location: 'Remote',
      workMode: 'REMOTE',
      companyName: 'NovaTech',
    });
    expect(jd.result.overview.length).toBeGreaterThan(60);
    expect(jd.result.responsibilities.length).toBeGreaterThan(2);

    const questions = await generateInterviewQuestionsAI({
      jobTitle: 'Backend Platform Engineer',
      jobDescription: 'Build resilient PostgreSQL and Node.js APIs.',
      requiredSkills: ['Node.js', 'PostgreSQL', 'Docker'],
      seniorityLevel: 'SENIOR',
    });
    expect(questions.questions.length).toBeGreaterThanOrEqual(5);

    // Must reject without explicit consent
    await expect(
      evaluateInterviewNotesAI({
        consentConfirmed: false,
        rawNotes: 'Good technical depth.',
        jobTitle: 'Backend Platform Engineer',
        requiredSkills: ['Node.js'],
      })
    ).rejects.toThrow();

    const evalRes = await evaluateInterviewNotesAI({
      consentConfirmed: true,
      jobTitle: 'Backend Platform Engineer',
      requiredSkills: ['Node.js', 'PostgreSQL'],
      rawNotes:
        'Candidate explained Node.js event loop and PostgreSQL indexing clearly. Needs deeper experience with multi-region failover.',
    });
    expect(evalRes.result.ethicalNotice.toLowerCase()).toContain(
      'never makes automated hiring decisions'
    );

    const chat = await runCareerAssistantAI(
      'How can I improve my CV and prepare for interviews?',
      {
        firstName: 'Alex',
        lastName: 'Rivera',
        headline: 'Full-Stack Engineer',
        yearsOfExperience: 5,
        skills: ['TypeScript', 'React'],
        applicationsCount: 2,
        cvCompleteness: 82,
        cvSuggestions: ['Quantify latency improvements'],
        topMatchingJobs: [
          {
            id: 'j1',
            title: 'Lead Engineer',
            company: 'NovaTech',
            score: 88,
            missingSkills: ['Kubernetes'],
          },
        ],
      }
    );
    expect(chat.reply.length).toBeGreaterThan(40);

    const gap = computeSkillGapAnalysis({
      candidateSkills: [
        { name: 'JavaScript', level: 'ADVANCED' },
        { name: 'React', level: 'INTERMEDIATE' },
      ],
      targetTitle: CAREER_PATH_BLUEPRINTS[0].title,
      targetType: 'CAREER_PATH',
      requiredSkills: CAREER_PATH_BLUEPRINTS[0].requiredSkills,
      niceToHaveSkills: CAREER_PATH_BLUEPRINTS[0].niceToHaveSkills,
    });
    expect(gap.missingRequiredSkills.length).toBeGreaterThan(0);
    expect(gap.disclaimer.length).toBeGreaterThan(20);
  });
});
