import { PrismaClient, ApplicationStatus, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';
import PDFDocument from 'pdfkit';
import { createSimpleDocxBuffer } from '../src/lib/sample-docx';
import { analyzeCVText, computeCandidateJobMatch } from '../src/lib/ai/engine';
import { slugify } from '../src/lib/utils';

const prisma = new PrismaClient();

async function createPdfBuffer(lines: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    lines.forEach((line, idx) => {
      if (idx === 0) {
        doc.fontSize(18).text(line, { underline: false });
        doc.moveDown(0.5);
      } else if (/^[A-Z\s]{4,}$/.test(line)) {
        doc.moveDown(0.6);
        doc.fontSize(13).text(line);
        doc.moveDown(0.2);
      } else {
        doc.fontSize(10.5).text(line);
      }
    });
    doc.end();
  });
}

async function main() {
  console.log('🌱 Seeding TalentAI PostgreSQL database with fictional demo records...');

  // Clean existing tables in dependency order
  await prisma.careerChatMessage.deleteMany();
  await prisma.aIUsageLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.jobBookmark.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.interviewEvaluation.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.matchResult.deleteMany();
  await prisma.application.deleteMany();
  await prisma.cVAnalysis.deleteMany();
  await prisma.cVDocument.deleteMany();
  await prisma.jobSkill.deleteMany();
  await prisma.job.deleteMany();
  await prisma.project.deleteMany();
  await prisma.certification.deleteMany();
  await prisma.candidateSkill.deleteMany();
  await prisma.experience.deleteMany();
  await prisma.education.deleteMany();
  await prisma.candidateProfile.deleteMany();
  await prisma.recruiterProfile.deleteMany();
  await prisma.company.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.user.deleteMany();
  await prisma.platformSetting.deleteMany();

  const adminHash = await bcrypt.hash('Admin@123!', 12);
  const recruiterHash = await bcrypt.hash('Recruiter@123!', 12);
  const candidateHash = await bcrypt.hash('Candidate@123!', 12);

  // 1. Seed Administrator (ONLY created via secure seed)
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@talentai.demo',
      passwordHash: adminHash,
      firstName: 'Nadia',
      lastName: ' Belkacem',
      phone: '+216 71 000 100',
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 150 * 86400000),
    },
  });

  // 2. Seed Normalized Skills Catalog
  const skillDefs: Array<{ name: string; category: 'TECHNICAL' | 'SOFT' | 'TOOL' | 'DOMAIN' | 'LANGUAGE' }> = [
    { name: 'TypeScript', category: 'TECHNICAL' },
    { name: 'JavaScript', category: 'TECHNICAL' },
    { name: 'React', category: 'TECHNICAL' },
    { name: 'Next.js', category: 'TECHNICAL' },
    { name: 'Node.js', category: 'TECHNICAL' },
    { name: 'PostgreSQL', category: 'TECHNICAL' },
    { name: 'Prisma', category: 'TOOL' },
    { name: 'Tailwind CSS', category: 'TECHNICAL' },
    { name: 'Python', category: 'TECHNICAL' },
    { name: 'FastAPI', category: 'TECHNICAL' },
    { name: 'Machine Learning', category: 'TECHNICAL' },
    { name: 'NLP', category: 'TECHNICAL' },
    { name: 'LLM Integration', category: 'TECHNICAL' },
    { name: 'Deep Learning', category: 'TECHNICAL' },
    { name: 'Docker', category: 'TOOL' },
    { name: 'Kubernetes', category: 'TECHNICAL' },
    { name: 'AWS', category: 'TECHNICAL' },
    { name: 'Terraform', category: 'TOOL' },
    { name: 'CI/CD', category: 'TOOL' },
    { name: 'Linux', category: 'TECHNICAL' },
    { name: 'SQL', category: 'TECHNICAL' },
    { name: 'Data Analysis', category: 'TECHNICAL' },
    { name: 'Apache Spark', category: 'TECHNICAL' },
    { name: 'GraphQL', category: 'TECHNICAL' },
    { name: 'REST APIs', category: 'TECHNICAL' },
    { name: 'Redis', category: 'TOOL' },
    { name: 'Git', category: 'TOOL' },
    { name: 'Automated Testing', category: 'TECHNICAL' },
    { name: 'Cybersecurity', category: 'DOMAIN' },
    { name: 'UI/UX Design', category: 'DOMAIN' },
    { name: 'React Native', category: 'TECHNICAL' },
    { name: 'Go', category: 'TECHNICAL' },
    { name: 'Java', category: 'TECHNICAL' },
    { name: 'Communication', category: 'SOFT' },
    { name: 'Problem Solving', category: 'SOFT' },
    { name: 'Agile & Scrum', category: 'SOFT' },
    { name: 'Team Leadership', category: 'SOFT' },
  ];

  const skillMap = new Map<string, string>();
  for (const sd of skillDefs) {
    const s = await prisma.skill.create({
      data: {
        name: sd.name,
        slug: slugify(sd.name),
        category: sd.category,
      },
    });
    skillMap.set(sd.name, s.id);
  }

  // 3. Seed 3 Fictional Companies & 3 Recruiters
  const companiesData = [
    {
      name: 'NovaTech AI Systems',
      slug: 'novatech-ai-systems',
      website: 'https://novatech-ai.demo.example',
      industry: 'Artificial Intelligence & Enterprise SaaS',
      size: '51-200',
      location: 'Paris, France (Hybrid)',
      foundedYear: 2021,
      description:
        'NovaTech AI Systems builds explainable enterprise document intelligence and workflow automation platforms serving European and MENA enterprises.',
      recruiter: {
        email: 'sarah.chen@novatech.demo',
        firstName: 'Sarah',
        lastName: 'Chen',
        title: 'Head of Technical Recruiting',
        daysAgo: 120,
      },
    },
    {
      name: 'CloudScale Infrastructure',
      slug: 'cloudscale-infrastructure',
      website: 'https://cloudscale.demo.example',
      industry: 'Cloud Computing & DevOps',
      size: '201-500',
      location: 'Berlin, Germany (Remote-First)',
      foundedYear: 2019,
      description:
        'CloudScale delivers developer observability, multi-region Kubernetes orchestration, and zero-trust infrastructure tooling.',
      recruiter: {
        email: 'karim.mansour@cloudscale.demo',
        firstName: 'Karim',
        lastName: 'Mansour',
        title: 'Senior Engineering Talent Partner',
        daysAgo: 95,
      },
    },
    {
      name: 'FinEdge Digital Banking',
      slug: 'finedge-digital-banking',
      website: 'https://finedge.demo.example',
      industry: 'FinTech & Payment Security',
      size: '501-1000',
      location: 'London, UK / Tunis Hub',
      foundedYear: 2018,
      description:
        'FinEdge powers instant cross-border treasury, real-time fraud analytics, and compliant API banking rails.',
      recruiter: {
        email: 'elena.rossi@finedge.demo',
        firstName: 'Elena',
        lastName: 'Rossi',
        title: 'VP Talent Acquisition',
        daysAgo: 75,
      },
    },
  ];

  const createdCompanies: Array<{
    companyId: string;
    companyName: string;
    recruiterProfileId: string;
    recruiterUserId: string;
  }> = [];

  for (const cd of companiesData) {
    const comp = await prisma.company.create({
      data: {
        name: cd.name,
        slug: cd.slug,
        website: cd.website,
        industry: cd.industry,
        size: cd.size,
        location: cd.location,
        foundedYear: cd.foundedYear,
        description: cd.description,
        verified: true,
      },
    });

    const rUser = await prisma.user.create({
      data: {
        email: cd.recruiter.email,
        passwordHash: recruiterHash,
        firstName: cd.recruiter.firstName,
        lastName: cd.recruiter.lastName,
        role: 'RECRUITER',
        status: 'ACTIVE',
        createdAt: new Date(Date.now() - cd.recruiter.daysAgo * 86400000),
      },
    });

    const rProf = await prisma.recruiterProfile.create({
      data: {
        userId: rUser.id,
        companyId: comp.id,
        title: cd.recruiter.title,
        isPrimaryContact: true,
      },
    });

    createdCompanies.push({
      companyId: comp.id,
      companyName: comp.name,
      recruiterProfileId: rProf.id,
      recruiterUserId: rUser.id,
    });
  }

  // 4. Seed 10 Fictional Candidates + Rich Profiles + Sample PDF/DOCX CVs
  const candidatesSeed = [
    {
      email: 'alex.rivera@candidate.demo',
      firstName: 'Alex',
      lastName: 'Rivera',
      headline: 'Senior Full-Stack TypeScript & Next.js Engineer',
      location: 'Paris, France',
      years: 5,
      remote: 'HYBRID' as const,
      skills: ['TypeScript', 'JavaScript', 'React', 'Next.js', 'Node.js', 'PostgreSQL', 'Prisma', 'Tailwind CSS', 'REST APIs', 'Automated Testing', 'Git', 'Communication'],
      degree: 'M.Sc. in Software Engineering',
      school: 'Sorbonne Université (Fictional Track)',
      expTitle: 'Full-Stack Software Engineer',
      expCompany: 'Atelier Web Cloud (Demo)',
      expDesc: 'Architected multi-tenant SaaS dashboards using Next.js, TypeScript, Node.js, and PostgreSQL, reducing API latency by 38% and raising automated test coverage to 86%.',
      projTitle: 'OpenFlow Analytics Portal',
      projDesc: 'Real-time product telemetry dashboard with Next.js, Prisma, PostgreSQL, and Recharts.',
      langs: [{ name: 'English', proficiency: 'Fluent' }, { name: 'French', proficiency: 'Native' }],
      interests: ['Full-Stack Engineering', 'AI SaaS'],
      daysAgo: 110,
    },
    {
      email: 'amira.benali@candidate.demo',
      firstName: 'Amira',
      lastName: 'Benali',
      headline: 'AI & NLP Machine Learning Engineer',
      location: 'Tunis, Tunisia',
      years: 4,
      remote: 'REMOTE' as const,
      skills: ['Python', 'Machine Learning', 'NLP', 'LLM Integration', 'Deep Learning', 'FastAPI', 'SQL', 'Docker', 'PostgreSQL', 'Problem Solving'],
      degree: 'Engineering Diploma in Artificial Intelligence & Data Science',
      school: 'National School of Computer Science (Demo)',
      expTitle: 'NLP & Applied AI Engineer',
      expCompany: 'Medina Labs AI (Demo)',
      expDesc: 'Developed multilingual document extraction and semantic matching pipelines in Python, FastAPI, and PostgreSQL with 93% precision across 50k documents.',
      projTitle: 'SemantiMatch Engine',
      projDesc: 'Explainable resume-to-job cosine matching service with structured JSON validation.',
      langs: [{ name: 'English', proficiency: 'Fluent' }, { name: 'French', proficiency: 'Fluent' }, { name: 'Arabic', proficiency: 'Native' }],
      interests: ['AI & Machine Learning', 'NLP'],
      daysAgo: 90,
    },
    {
      email: 'liam.oconnor@candidate.demo',
      firstName: 'Liam',
      lastName: "O'Connor",
      headline: 'Cloud & Kubernetes Platform Engineer',
      location: 'Dublin, Ireland',
      years: 6,
      remote: 'REMOTE' as const,
      skills: ['Docker', 'Kubernetes', 'AWS', 'Terraform', 'CI/CD', 'Linux', 'Go', 'Python', 'Redis', 'Cybersecurity'],
      degree: 'B.Sc. in Computer Systems',
      school: 'Dublin Tech Institute (Demo)',
      expTitle: 'Senior DevOps & SRE Engineer',
      expCompany: 'HarborGrid Cloud (Demo)',
      expDesc: 'Automated multi-region AWS EKS clusters using Terraform and GitHub Actions CI/CD, cutting deployment lead time by 62% with 99.98% uptime.',
      projTitle: 'KubeGuard Operator',
      projDesc: 'Automated pod security policy and resource right-sizing operator written in Go.',
      langs: [{ name: 'English', proficiency: 'Native' }],
      interests: ['Cloud & DevOps', 'Infrastructure'],
      daysAgo: 80,
    },
    {
      email: 'priya.patel@candidate.demo',
      firstName: 'Priya',
      lastName: 'Patel',
      headline: 'Senior Data Scientist & Analytics Engineer',
      location: 'London, UK',
      years: 5,
      remote: 'HYBRID' as const,
      skills: ['Python', 'SQL', 'Data Analysis', 'Machine Learning', 'PostgreSQL', 'Apache Spark', 'Git', 'Communication'],
      degree: 'M.Sc. in Statistical Data Science',
      school: 'Thames Valley University (Demo)',
      expTitle: 'Lead Product Data Scientist',
      expCompany: 'ClearLedger Analytics (Demo)',
      expDesc: 'Built fraud anomaly detection and funnel attribution models in Python, SQL, and Spark processing 12M daily events.',
      projTitle: 'FinPulse Cohort Studio',
      projDesc: 'Reproducible retention and conversion analytics warehouse backed by PostgreSQL.',
      langs: [{ name: 'English', proficiency: 'Fluent' }],
      interests: ['Data Science', 'FinTech'],
      daysAgo: 70,
    },
    {
      email: 'mateo.silva@candidate.demo',
      firstName: 'Mateo',
      lastName: 'Silva',
      headline: 'Frontend & Design Systems Engineer',
      location: 'Madrid, Spain',
      years: 3,
      remote: 'REMOTE' as const,
      skills: ['TypeScript', 'JavaScript', 'React', 'Next.js', 'Tailwind CSS', 'UI/UX Design', 'GraphQL', 'Automated Testing', 'Communication'],
      degree: 'B.Sc. in Interactive Software Design',
      school: 'Universidad Politécnica Demo',
      expTitle: 'Frontend Product Engineer',
      expCompany: 'CanvasFlow Studio (Demo)',
      expDesc: 'Created accessible WCAG AA React component library in TypeScript and Tailwind CSS adopted across 6 web applications.',
      projTitle: 'A11yKit UI Primitives',
      projDesc: 'Zero-dependency accessible modal, combobox, and table primitives for React 18.',
      langs: [{ name: 'English', proficiency: 'Fluent' }, { name: 'Spanish', proficiency: 'Native' }],
      interests: ['Frontend Development', 'UI/UX Design'],
      daysAgo: 60,
    },
    {
      email: 'sophie.laurent@candidate.demo',
      firstName: 'Sophie',
      lastName: 'Laurent',
      headline: 'Application Security & Backend Engineer',
      location: 'Lyon, France',
      years: 5,
      remote: 'HYBRID' as const,
      skills: ['Cybersecurity', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'Linux', 'REST APIs', 'Python', 'Automated Testing'],
      degree: 'M.Eng. in Cybersecurity & Networks',
      school: 'INSA Demo Institute',
      expTitle: 'AppSec & Backend Engineer',
      expCompany: 'VaultShield SAS (Demo)',
      expDesc: 'Led OWASP security reviews, RBAC architecture, and cryptographic token services for regulated payment APIs.',
      projTitle: 'AuthSentinel Audit Toolkit',
      projDesc: 'Automated JWT, rate-limit, and RBAC regression test harness.',
      langs: [{ name: 'French', proficiency: 'Native' }, { name: 'English', proficiency: 'Fluent' }],
      interests: ['Cybersecurity', 'FinTech'],
      daysAgo: 52,
    },
    {
      email: 'omar.haddad@candidate.demo',
      firstName: 'Omar',
      lastName: 'Haddad',
      headline: 'Backend Distributed Systems Engineer (Go / Node.js)',
      location: 'Berlin, Germany',
      years: 4,
      remote: 'HYBRID' as const,
      skills: ['Go', 'Node.js', 'TypeScript', 'PostgreSQL', 'Redis', 'Docker', 'REST APIs', 'SQL', 'Problem Solving'],
      degree: 'B.Sc. in Computer Science',
      school: 'TU Berlin Demo Program',
      expTitle: 'Backend Systems Engineer',
      expCompany: 'StreamRelay GmbH (Demo)',
      expDesc: 'Engineered high-throughput webhook delivery and ledger settlement microservices in Go, PostgreSQL, and Redis.',
      projTitle: 'LedgerSync Queue',
      projDesc: 'Idempotent transactional outbox worker with PostgreSQL advisory locks.',
      langs: [{ name: 'English', proficiency: 'Fluent' }, { name: 'Arabic', proficiency: 'Native' }],
      interests: ['Backend Engineering', 'Cloud & DevOps'],
      daysAgo: 40,
    },
    {
      email: 'hannah.kim@candidate.demo',
      firstName: 'Hannah',
      lastName: 'Kim',
      headline: 'Mobile & Full-Stack React Native Engineer',
      location: 'Amsterdam, Netherlands',
      years: 3,
      remote: 'FLEXIBLE' as const,
      skills: ['React Native', 'React', 'TypeScript', 'JavaScript', 'Node.js', 'GraphQL', 'Git', 'Agile & Scrum'],
      degree: 'B.Sc. in Software Engineering',
      school: 'Amsterdam Digital College (Demo)',
      expTitle: 'Mobile Software Engineer',
      expCompany: 'PocketPay Europe (Demo)',
      expDesc: 'Shipped biometric-free passkey sign-in and offline transaction history for 180k iOS/Android users.',
      projTitle: 'TransitCompanion App',
      projDesc: 'Cross-platform commuter planner built in React Native and GraphQL.',
      langs: [{ name: 'English', proficiency: 'Fluent' }],
      interests: ['Mobile Engineering', 'Full-Stack Engineering'],
      daysAgo: 28,
    },
    {
      email: 'lucas.meyer@candidate.demo',
      firstName: 'Lucas',
      lastName: 'Meyer',
      headline: 'QA Automation & SDET Lead',
      location: 'Munich, Germany',
      years: 4,
      remote: 'REMOTE' as const,
      skills: ['Automated Testing', 'TypeScript', 'Python', 'CI/CD', 'Docker', 'REST APIs', 'SQL', 'Git'],
      degree: 'B.Sc. in Applied Informatics',
      school: 'Munich Tech University (Demo)',
      expTitle: 'Senior QA Automation Engineer',
      expCompany: 'VeriSoft Systems (Demo)',
      expDesc: 'Built Playwright + Vitest continuous verification pipelines catching 94% of regressions pre-production.',
      projTitle: 'TraceSpec E2E Runner',
      projDesc: 'Parallel browser and API contract testing dashboard.',
      langs: [{ name: 'English', proficiency: 'Fluent' }],
      interests: ['Quality Assurance', 'Full-Stack Engineering'],
      daysAgo: 18,
    },
    {
      email: 'nadia.toumi@candidate.demo',
      firstName: 'Nadia',
      lastName: 'Toumi',
      headline: 'Junior Full-Stack & AI Engineering Graduate',
      location: 'Tunis, Tunisia',
      years: 1,
      remote: 'FLEXIBLE' as const,
      skills: ['TypeScript', 'React', 'Next.js', 'Python', 'PostgreSQL', 'Tailwind CSS', 'Git', 'Communication'],
      degree: 'B.Sc. in Computer Science (Honors)',
      school: 'Faculty of Sciences Tunis (Demo)',
      expTitle: 'Software Engineering Intern',
      expCompany: 'Carthage Digital Lab (Demo)',
      expDesc: 'Built internal recruitment analytics widgets and REST endpoints using Next.js, Prisma, and PostgreSQL.',
      projTitle: 'SmartStudy NLP Summarizer',
      projDesc: 'University capstone web app organizing lecture notes with structured NLP.',
      langs: [{ name: 'English', proficiency: 'Fluent' }, { name: 'French', proficiency: 'Fluent' }, { name: 'Arabic', proficiency: 'Native' }],
      interests: ['Full-Stack Engineering', 'AI & Machine Learning'],
      daysAgo: 8,
    },
  ];

  const storageDir = path.join(process.cwd(), 'storage', 'cvs');
  const publicSampleDir = path.join(process.cwd(), 'public', 'sample-cvs');
  await fs.mkdir(storageDir, { recursive: true });
  await fs.mkdir(publicSampleDir, { recursive: true });

  const createdCandidates: Array<{
    userId: string;
    profileId: string;
    fullName: string;
    cvDocId: string;
    skills: string[];
    years: number;
    headline: string;
    bio: string;
    location: string;
    remotePreference: string;
    expTitle: string;
    expCompany: string;
    expDesc: string;
    degree: string;
    school: string;
    projTitle: string;
    projDesc: string;
    cvText: string;
  }> = [];

  for (let idx = 0; idx < candidatesSeed.length; idx++) {
    const c = candidatesSeed[idx];
    const u = await prisma.user.create({
      data: {
        email: c.email,
        passwordHash: candidateHash,
        firstName: c.firstName,
        lastName: c.lastName,
        phone: `+33 6 10 20 30 ${10 + idx}`,
        role: 'CANDIDATE',
        status: 'ACTIVE',
        createdAt: new Date(Date.now() - c.daysAgo * 86400000),
      },
    });

    const prof = await prisma.candidateProfile.create({
      data: {
        userId: u.id,
        headline: c.headline,
        bio: `${c.headline} with ${c.years}+ years of experience building maintainable, production-ready systems. Passionate about clean architecture, measurable impact, and continuous learning.`,
        location: c.location,
        yearsOfExperience: c.years,
        desiredTitle: c.headline,
        desiredSalaryMin: 55000 + c.years * 8000,
        desiredSalaryMax: 75000 + c.years * 10000,
        remotePreference: c.remote,
        linkedinUrl: `https://linkedin.com/in/${c.firstName.toLowerCase()}-${c.lastName.toLowerCase().replace(/[^a-z]/g, '')}-demo`,
        githubUrl: `https://github.com/${c.firstName.toLowerCase()}${c.lastName.toLowerCase().replace(/[^a-z]/g, '')}-demo`,
        portfolioUrl: `https://${c.firstName.toLowerCase()}-portfolio.demo.example`,
        careerInterests: c.interests,
        languages: c.langs,
        isSearchableByRecruiters: true,
      },
    });

    await prisma.education.create({
      data: {
        candidateProfileId: prof.id,
        institution: c.school,
        degree: c.degree,
        fieldOfStudy: 'Computer Science & Engineering',
        startDate: new Date('2017-09-01'),
        endDate: new Date('2021-06-30'),
        grade: 'Distinction',
      },
    });

    await prisma.experience.create({
      data: {
        candidateProfileId: prof.id,
        company: c.expCompany,
        title: c.expTitle,
        location: c.location,
        employmentType: 'Full-Time',
        startDate: new Date(new Date().getFullYear() - c.years, 2, 1),
        current: true,
        description: c.expDesc,
        achievements: [
          c.expDesc,
          `Collaborated across engineering, product, and QA teams using ${c.skills.slice(0, 4).join(', ')}.`,
        ],
      },
    });

    await prisma.project.create({
      data: {
        candidateProfileId: prof.id,
        title: c.projTitle,
        description: c.projDesc,
        technologies: c.skills.slice(0, 5),
        repoUrl: `https://github.com/demo/${slugify(c.projTitle)}`,
      },
    });

    await prisma.certification.create({
      data: {
        candidateProfileId: prof.id,
        name: `${c.skills[0]} Professional Engineering Certificate (Demo)`,
        issuer: 'Open Tech Academy',
        issueDate: new Date('2024-04-15'),
      },
    });

    for (const skName of c.skills) {
      const sId = skillMap.get(skName);
      if (sId) {
        await prisma.candidateSkill.create({
          data: {
            candidateProfileId: prof.id,
            skillId: sId,
            level: c.years >= 5 ? 'ADVANCED' : 'INTERMEDIATE',
            yearsUsed: Math.max(1, c.years - 1),
            verifiedByCV: true,
          },
        });
      }
    }

    // Generate genuine PDF CV document for every seeded candidate!
    const cvLines = [
      `${c.firstName} ${c.lastName}`,
      `${c.headline} | ${c.location} | ${c.email}`,
      'PROFESSIONAL SUMMARY',
      `${c.headline} with ${c.years} years of experience delivering reliable systems using ${c.skills.slice(0, 6).join(', ')}.`,
      'WORK EXPERIENCE',
      `${c.expTitle} at ${c.expCompany} | ${new Date().getFullYear() - c.years} - Present`,
      `- ${c.expDesc}`,
      'EDUCATION',
      `${c.degree} — ${c.school} (2021)`,
      'TECHNICAL SKILLS',
      c.skills.join(', '),
      'PROJECTS',
      `${c.projTitle}: ${c.projDesc}`,
      'LANGUAGES',
      c.langs.map((l) => `${l.name} (${l.proficiency})`).join(', '),
    ];

    const pdfBuf = await createPdfBuffer(cvLines);
    const cvFileName = `${prof.id}_seed_cv.pdf`;
    const cvPath = path.join(storageDir, cvFileName);
    await fs.writeFile(cvPath, pdfBuf);

    // Also save downloadable public demo PDF and DOCX files for the first 2 candidates
    if (idx === 0) {
      await fs.writeFile(path.join(publicSampleDir, 'sample-fullstack-cv.pdf'), pdfBuf);
    }
    if (idx === 1) {
      const docxBuf = createSimpleDocxBuffer(cvLines);
      await fs.writeFile(path.join(publicSampleDir, 'sample-ai-engineer-cv.docx'), docxBuf);
    }

    const cvText = cvLines.join('\n');
    const cvDoc = await prisma.cVDocument.create({
      data: {
        candidateProfileId: prof.id,
        fileName: cvFileName,
        originalName: `${c.firstName}_${c.lastName}_CV.pdf`,
        mimeType: 'application/pdf',
        fileSize: pdfBuf.length,
        storagePath: cvPath,
        extractedText: cvText,
        isPrimary: true,
      },
    });

    const analysisRun = await analyzeCVText(cvText, `${c.firstName} ${c.lastName}`);
    await prisma.cVAnalysis.create({
      data: {
        cvDocumentId: cvDoc.id,
        candidateProfileId: prof.id,
        completenessScore: analysisRun.result.completenessScore,
        extractedData: analysisRun.result.extractedData,
        skillsOverview: analysisRun.result.skillsOverview,
        experienceOverview: analysisRun.result.experienceOverview,
        strengths: analysisRun.result.strengths,
        missingInfo: analysisRun.result.missingInfo,
        suggestions: analysisRun.result.suggestions,
        recommendedCategories: analysisRun.result.recommendedCategories,
        aiMode: 'DETERMINISTIC_NLP',
        reviewedByCandidate: true,
      },
    });

    createdCandidates.push({
      userId: u.id,
      profileId: prof.id,
      fullName: `${c.firstName} ${c.lastName}`,
      cvDocId: cvDoc.id,
      skills: c.skills,
      years: c.years,
      headline: c.headline,
      bio: `${c.headline} with ${c.years}+ years of experience.`,
      location: c.location,
      remotePreference: c.remote,
      expTitle: c.expTitle,
      expCompany: c.expCompany,
      expDesc: c.expDesc,
      degree: c.degree,
      school: c.school,
      projTitle: c.projTitle,
      projDesc: c.projDesc,
      cvText,
    });
  }

  // 5. Seed 10 Realistic Job Advertisements across the 3 Companies
  const jobsSeed = [
    {
      companyIdx: 0,
      title: 'Senior Full-Stack Engineer (Next.js & AI Workflows)',
      level: 'SENIOR' as const,
      minYears: 4,
      type: 'FULL_TIME' as const,
      location: 'Paris, France',
      workMode: 'HYBRID' as const,
      salaryMin: 78000,
      salaryMax: 98000,
      skills: ['TypeScript', 'React', 'Next.js', 'Node.js', 'PostgreSQL', 'Prisma', 'Docker'],
      softSkills: ['Communication', 'Problem Solving', 'Agile & Scrum'],
      description:
        'Lead the architecture of NovaTech’s intelligent recruitment and document automation workspace using Next.js 14, TypeScript, Prisma, and PostgreSQL.',
      responsibilities: [
        'Architect end-to-end product workflows in Next.js, React, TypeScript, and PostgreSQL.',
        'Integrate explainable NLP and LLM pipelines with strict schema validation and security guardrails.',
        'Mentor junior engineers and uphold automated test coverage.',
      ],
      qualifications: [
        '4+ years of full-stack software engineering experience.',
        'Strong command of TypeScript, React/Next.js, Node.js, and relational SQL databases.',
      ],
      views: 214,
      daysAgo: 45,
    },
    {
      companyIdx: 0,
      title: 'Applied NLP & LLM Engineer',
      level: 'MID' as const,
      minYears: 3,
      type: 'FULL_TIME' as const,
      location: 'Remote (EMEA)',
      workMode: 'REMOTE' as const,
      salaryMin: 72000,
      salaryMax: 94000,
      skills: ['Python', 'NLP', 'LLM Integration', 'Machine Learning', 'FastAPI', 'PostgreSQL', 'Docker'],
      softSkills: ['Problem Solving', 'Communication'],
      description:
        'Design semantic document parsing, entity extraction, and explainable ranking algorithms powering NovaTech’s AI engine.',
      responsibilities: [
        'Build hybrid semantic similarity and structured extraction microservices in Python and FastAPI.',
        'Evaluate model fairness, latency, and grounding accuracy across multilingual corpora.',
      ],
      qualifications: [
        'M.Sc. or Engineering degree in CS, AI, or equivalent hands-on experience.',
        '3+ years building NLP or ML systems in production.',
      ],
      views: 189,
      daysAgo: 35,
    },
    {
      companyIdx: 0,
      title: 'Frontend Design Systems Engineer',
      level: 'MID' as const,
      minYears: 2,
      type: 'FULL_TIME' as const,
      location: 'Paris, France',
      workMode: 'HYBRID' as const,
      salaryMin: 58000,
      salaryMax: 74000,
      skills: ['TypeScript', 'React', 'Next.js', 'Tailwind CSS', 'UI/UX Design', 'Automated Testing'],
      softSkills: ['Communication', 'Agile & Scrum'],
      description:
        'Craft accessible, responsive SaaS interfaces, interactive data visualizations, and reusable UI primitives.',
      responsibilities: [
        'Maintain NovaTech’s dark-mode-ready design system in React, TypeScript, and Tailwind CSS.',
        'Partner with UX designers to guarantee WCAG 2.1 AA keyboard and contrast compliance.',
      ],
      qualifications: ['2+ years building modern React & TypeScript interfaces.'],
      views: 142,
      daysAgo: 22,
    },
    {
      companyIdx: 1,
      title: 'Senior Cloud & Kubernetes Platform Engineer',
      level: 'SENIOR' as const,
      minYears: 5,
      type: 'FULL_TIME' as const,
      location: 'Berlin, Germany',
      workMode: 'REMOTE' as const,
      salaryMin: 85000,
      salaryMax: 110000,
      skills: ['Kubernetes', 'Docker', 'AWS', 'Terraform', 'CI/CD', 'Linux', 'Go'],
      softSkills: ['Problem Solving', 'Team Leadership'],
      description:
        'Scale CloudScale’s multi-region Kubernetes control plane, Terraform modules, and zero-downtime deployment pipelines.',
      responsibilities: [
        'Architect resilient AWS & Kubernetes clusters managed declaratively via Terraform.',
        'Build Go operators and observability dashboards for platform reliability.',
      ],
      qualifications: ['5+ years in Cloud, SRE, or DevOps engineering with Kubernetes and AWS.'],
      views: 176,
      daysAgo: 40,
    },
    {
      companyIdx: 1,
      title: 'Distributed Backend Systems Engineer (Go / PostgreSQL)',
      level: 'MID' as const,
      minYears: 3,
      type: 'FULL_TIME' as const,
      location: 'Berlin, Germany',
      workMode: 'HYBRID' as const,
      salaryMin: 70000,
      salaryMax: 88000,
      skills: ['Go', 'Node.js', 'PostgreSQL', 'Redis', 'Docker', 'REST APIs'],
      softSkills: ['Problem Solving', 'Communication'],
      description:
        'Build high-throughput telemetry ingestion APIs, Redis rate-limiters, and partitioned PostgreSQL storage.',
      responsibilities: [
        'Design low-latency REST services in Go and TypeScript/Node.js.',
        'Optimize PostgreSQL indexing, query plans, and transactional integrity.',
      ],
      qualifications: ['3+ years backend engineering experience with Go or Node.js and PostgreSQL.'],
      views: 131,
      daysAgo: 28,
    },
    {
      companyIdx: 1,
      title: 'Lead QA Automation & Reliability Engineer',
      level: 'MID' as const,
      minYears: 3,
      type: 'FULL_TIME' as const,
      location: 'Remote (Europe)',
      workMode: 'REMOTE' as const,
      salaryMin: 62000,
      salaryMax: 80000,
      skills: ['Automated Testing', 'TypeScript', 'Python', 'CI/CD', 'Docker', 'REST APIs'],
      softSkills: ['Communication', 'Problem Solving'],
      description:
        'Own end-to-end Playwright browser automation, API integration suites, and release quality gates across CloudScale.',
      responsibilities: [
        'Maintain fast, deterministic E2E and API contract test suites in CI/CD.',
        'Partner with developers on testability, security validation, and chaos drills.',
      ],
      qualifications: ['3+ years in QA automation / SDET roles using Playwright, Cypress, or Vitest.'],
      views: 98,
      daysAgo: 18,
    },
    {
      companyIdx: 2,
      title: 'Lead FinTech Data Scientist (Fraud & Risk)',
      level: 'SENIOR' as const,
      minYears: 4,
      type: 'FULL_TIME' as const,
      location: 'London, UK',
      workMode: 'HYBRID' as const,
      salaryMin: 82000,
      salaryMax: 105000,
      skills: ['Python', 'SQL', 'Machine Learning', 'Data Analysis', 'PostgreSQL', 'Apache Spark'],
      softSkills: ['Communication', 'Problem Solving'],
      description:
        'Develop real-time explainable fraud detection and credit risk models powering FinEdge’s payment network.',
      responsibilities: [
        'Train, validate, and monitor low-latency anomaly models with transparent feature attribution.',
        'Collaborate with risk & compliance teams on bias auditing and model governance.',
      ],
      qualifications: ['4+ years in Data Science or Quantitative Analytics with Python and SQL.'],
      views: 164,
      daysAgo: 32,
    },
    {
      companyIdx: 2,
      title: 'Application Security & IAM Engineer',
      level: 'SENIOR' as const,
      minYears: 4,
      type: 'FULL_TIME' as const,
      location: 'London, UK / Tunis Hub',
      workMode: 'HYBRID' as const,
      salaryMin: 80000,
      salaryMax: 102000,
      skills: ['Cybersecurity', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'Linux', 'REST APIs'],
      softSkills: ['Communication', 'Problem Solving'],
      description:
        'Harden FinEdge’s authentication services, API gateways, audit logging, and OWASP security posture.',
      responsibilities: [
        'Perform threat modeling, code security reviews, and automated RBAC verification.',
        'Lead incident readiness and cryptographic key lifecycle standards.',
      ],
      qualifications: ['4+ years in Application Security or Secure Backend Engineering.'],
      views: 149,
      daysAgo: 25,
    },
    {
      companyIdx: 2,
      title: 'Mobile Banking Engineer (React Native)',
      level: 'MID' as const,
      minYears: 2,
      type: 'FULL_TIME' as const,
      location: 'Tunis, Tunisia',
      workMode: 'HYBRID' as const,
      salaryMin: 48000,
      salaryMax: 68000,
      skills: ['React Native', 'React', 'TypeScript', 'GraphQL', 'Node.js', 'Git'],
      softSkills: ['Agile & Scrum', 'Communication'],
      description:
        'Deliver fast, accessible mobile treasury and instant-transfer experiences for FinEdge customers.',
      responsibilities: [
        'Build cross-platform features in React Native, TypeScript, and GraphQL.',
        'Ensure smooth 60fps interactions and rigorous security hygiene on mobile.',
      ],
      qualifications: ['2+ years shipping React Native or React applications.'],
      views: 118,
      daysAgo: 14,
    },
    {
      companyIdx: 0,
      title: 'Junior Full-Stack Software Engineer (Graduate Track)',
      level: 'JUNIOR' as const,
      minYears: 0,
      type: 'FULL_TIME' as const,
      location: 'Tunis / Paris (Flexible)',
      workMode: 'FLEXIBLE' as const,
      salaryMin: 42000,
      salaryMax: 54000,
      skills: ['TypeScript', 'React', 'Next.js', 'PostgreSQL', 'Tailwind CSS', 'Git'],
      softSkills: ['Communication', 'Problem Solving'],
      description:
        'Join NovaTech’s mentored graduate engineering program shipping real SaaS features in Next.js, TypeScript, and PostgreSQL.',
      responsibilities: [
        'Build full-stack UI components and typed API routes alongside senior mentors.',
        'Write unit and integration tests and participate in agile sprint reviews.',
      ],
      qualifications: ['Degree in Computer Science or Software Engineering and strong portfolio projects.'],
      views: 245,
      daysAgo: 9,
    },
  ];

  const createdJobs: Array<{
    id: string;
    title: string;
    description: string;
    responsibilities: string[];
    qualifications: string[];
    skills: string[];
    softSkills: string[];
    minYears: number;
    location: string;
    workMode: string;
    companyIdx: number;
  }> = [];

  for (const js of jobsSeed) {
    const compRef = createdCompanies[js.companyIdx];
    const pubDate = new Date(Date.now() - js.daysAgo * 86400000);
    const j = await prisma.job.create({
      data: {
        companyId: compRef.companyId,
        recruiterProfileId: compRef.recruiterProfileId,
        title: js.title,
        slug: `${slugify(js.title)}-${Math.random().toString(36).slice(2, 6)}`,
        description: js.description,
        responsibilities: js.responsibilities,
        qualifications: js.qualifications,
        preferredQualifications: [
          'Experience working with automated CI/CD pipelines and peer code reviews.',
        ],
        benefits: [
          'Competitive salary & annual equity/bonus review',
          'Flexible hybrid/remote work & home-office stipend',
          'Annual conference & certification budget',
        ],
        softSkills: js.softSkills,
        experienceLevel: js.level,
        minYearsExperience: js.minYears,
        educationRequirement: "Bachelor's or Master's degree in CS or equivalent experience",
        employmentType: js.type,
        location: js.location,
        workMode: js.workMode,
        salaryMin: js.salaryMin,
        salaryMax: js.salaryMax,
        salaryCurrency: 'USD',
        requiredLanguages: ['English'],
        status: 'PUBLISHED',
        viewsCount: js.views,
        publishedAt: pubDate,
        createdAt: pubDate,
        deadline: new Date(Date.now() + 45 * 86400000),
      },
    });

    for (const skName of js.skills) {
      const sId = skillMap.get(skName);
      if (sId) {
        await prisma.jobSkill.create({
          data: {
            jobId: j.id,
            skillId: sId,
            isRequired: true,
          },
        });
      }
    }

    createdJobs.push({
      id: j.id,
      title: js.title,
      description: js.description,
      responsibilities: js.responsibilities,
      qualifications: js.qualifications,
      skills: js.skills,
      softSkills: js.softSkills,
      minYears: js.minYears,
      location: js.location,
      workMode: js.workMode,
      companyIdx: js.companyIdx,
    });
  }

  // 6. Seed 24 Realistic Applications across all statuses + MatchResults
  const applicationPairs: Array<{
    candIdx: number;
    jobIdx: number;
    status: ApplicationStatus;
    daysAgo: number;
    feedback?: string;
    rejectionReason?: string;
  }> = [
    { candIdx: 0, jobIdx: 0, status: 'INTERVIEW_SCHEDULED', daysAgo: 20, feedback: 'Strong Next.js & PostgreSQL architecture track record.' },
    { candIdx: 1, jobIdx: 1, status: 'OFFERED', daysAgo: 28, feedback: 'Exceptional NLP & semantic extraction portfolio.' },
    { candIdx: 2, jobIdx: 3, status: 'HIRED', daysAgo: 34, feedback: 'Outstanding multi-region Kubernetes & Terraform mastery.' },
    { candIdx: 3, jobIdx: 6, status: 'INTERVIEW_SCHEDULED', daysAgo: 18, feedback: 'Strong fraud analytics & Spark background.' },
    { candIdx: 4, jobIdx: 2, status: 'SHORTLISTED', daysAgo: 15, feedback: 'Great WCAG design system experience.' },
    { candIdx: 5, jobIdx: 7, status: 'HIRED', daysAgo: 22, feedback: 'Top-tier OWASP & RBAC engineering leadership.' },
    { candIdx: 6, jobIdx: 4, status: 'INTERVIEW_COMPLETED', daysAgo: 16, feedback: 'Solid Go & PostgreSQL concurrency depth.' },
    { candIdx: 7, jobIdx: 8, status: 'SHORTLISTED', daysAgo: 11, feedback: 'Strong React Native shipping velocity.' },
    { candIdx: 8, jobIdx: 5, status: 'INTERVIEW_SCHEDULED', daysAgo: 12, feedback: 'Comprehensive Playwright & CI/CD automation.' },
    { candIdx: 9, jobIdx: 9, status: 'SHORTLISTED', daysAgo: 6, feedback: 'Impressive honors capstone in Next.js & NLP.' },
    { candIdx: 0, jobIdx: 2, status: 'UNDER_REVIEW', daysAgo: 14 },
    { candIdx: 0, jobIdx: 4, status: 'SUBMITTED', daysAgo: 5 },
    { candIdx: 1, jobIdx: 0, status: 'SHORTLISTED', daysAgo: 19, feedback: 'Strong AI workflow domain knowledge.' },
    { candIdx: 1, jobIdx: 6, status: 'UNDER_REVIEW', daysAgo: 10 },
    { candIdx: 2, jobIdx: 4, status: 'WITHDRAWN', daysAgo: 25 },
    { candIdx: 3, jobIdx: 1, status: 'UNDER_REVIEW', daysAgo: 9 },
    { candIdx: 4, jobIdx: 0, status: 'REJECTED', daysAgo: 24, rejectionReason: 'Role requires deeper backend PostgreSQL & Node.js experience; encouraged to apply for Frontend Design Systems Engineer.' },
    { candIdx: 5, jobIdx: 0, status: 'UNDER_REVIEW', daysAgo: 8 },
    { candIdx: 6, jobIdx: 3, status: 'SUBMITTED', daysAgo: 4 },
    { candIdx: 7, jobIdx: 2, status: 'SUBMITTED', daysAgo: 3 },
    { candIdx: 8, jobIdx: 0, status: 'UNDER_REVIEW', daysAgo: 7 },
    { candIdx: 9, jobIdx: 2, status: 'SUBMITTED', daysAgo: 2 },
    { candIdx: 9, jobIdx: 1, status: 'UNDER_REVIEW', daysAgo: 5 },
    { candIdx: 4, jobIdx: 8, status: 'SHORTLISTED', daysAgo: 6 },
  ];

  const createdApps: Array<{ id: string; candIdx: number; jobIdx: number; status: ApplicationStatus }> = [];

  for (const ap of applicationPairs) {
    const cand = createdCandidates[ap.candIdx];
    const job = createdJobs[ap.jobIdx];
    const appliedDate = new Date(Date.now() - ap.daysAgo * 86400000);

    const app = await prisma.application.create({
      data: {
        jobId: job.id,
        candidateProfileId: cand.profileId,
        cvDocumentId: cand.cvDocId,
        coverLetter: `Dear Hiring Team, I am excited to apply for ${job.title}. My ${cand.years} year(s) of experience working with ${cand.skills.slice(0, 4).join(', ')} align closely with your technical goals.`,
        status: ap.status,
        candidateFeedback: ap.feedback || null,
        rejectionReason: ap.rejectionReason || null,
        privateNotes: ap.feedback ? `Recruiter Note: ${ap.feedback}` : null,
        humanReviewed: ap.status !== 'SUBMITTED',
        appliedAt: appliedDate,
        hiredAt:
          ap.status === 'HIRED'
            ? new Date(appliedDate.getTime() + 14 * 86400000)
            : null,
        statusHistory: [
          {
            status: 'SUBMITTED',
            changedAt: appliedDate.toISOString(),
            changedBy: cand.fullName,
            note: 'Application submitted',
          },
          ...(ap.status !== 'SUBMITTED'
            ? [
                {
                  status: ap.status,
                  changedAt: new Date(appliedDate.getTime() + 3 * 86400000).toISOString(),
                  changedBy: 'Hiring Team',
                  note: ap.feedback || ap.rejectionReason || `Moved to ${ap.status}`,
                },
              ]
            : []),
        ],
      },
    });

    createdApps.push({ id: app.id, candIdx: ap.candIdx, jobIdx: ap.jobIdx, status: ap.status });

    const matchRun = await computeCandidateJobMatch(
      {
        fullName: cand.fullName,
        headline: cand.headline,
        bio: cand.bio,
        yearsOfExperience: cand.years,
        location: cand.location,
        remotePreference: cand.remotePreference,
        skills: cand.skills,
        educations: [{ degree: cand.degree, fieldOfStudy: 'Computer Science', institution: cand.school }],
        experiences: [{ title: cand.expTitle, company: cand.expCompany, description: cand.expDesc }],
        certifications: [{ name: `${cand.skills[0]} Certificate`, issuer: 'Open Tech Academy' }],
        projects: [{ title: cand.projTitle, description: cand.projDesc, technologies: cand.skills.slice(0, 4) }],
        languages: ['English'],
        cvText: cand.cvText,
      },
      {
        title: job.title,
        description: job.description,
        responsibilities: job.responsibilities,
        qualifications: job.qualifications,
        requiredSkills: job.skills,
        softSkills: job.softSkills,
        minYearsExperience: job.minYears,
        location: job.location,
        workMode: job.workMode,
        requiredLanguages: ['English'],
      }
    );

    await prisma.matchResult.create({
      data: {
        jobId: job.id,
        candidateProfileId: cand.profileId,
        overallScore: matchRun.result.overallScore,
        skillScore: matchRun.result.skillScore,
        experienceScore: matchRun.result.experienceScore,
        educationScore: matchRun.result.educationScore,
        responsibilityScore: matchRun.result.responsibilityScore,
        languageScore: matchRun.result.languageScore,
        weightsUsed: matchRun.result.weightsUsed as unknown as Prisma.InputJsonValue,
        matchingSkills: matchRun.result.matchingSkills,
        missingSkills: matchRun.result.missingSkills,
        relevantExperience: matchRun.result.relevantExperience,
        matchingQualifications: matchRun.result.matchingQualifications,
        explanation: matchRun.result.explanation,
        verificationAreas: matchRun.result.verificationAreas,
        reviewedByRecruiter: ap.status !== 'SUBMITTED',
        aiMode: 'DETERMINISTIC_NLP',
      },
    });
  }

  // 7. Seed Sample Interviews & InterviewEvaluation
  const interviewSeeds = [
    {
      appIdx: 0, // Alex Rivera -> NovaTech Senior Full-Stack
      title: 'Technical Architecture & System Design Round',
      type: 'TECHNICAL' as const,
      status: 'ACCEPTED' as const,
      offsetDays: 2,
      hour: 10,
      interviewers: ['Sarah Chen', 'Marc Lefevre (Staff Engineer)'],
    },
    {
      appIdx: 3, // Priya Patel -> FinEdge Lead Data Scientist
      title: 'ML Case Study & Fraud Pipeline Review',
      type: 'ONLINE' as const,
      status: 'INVITED' as const,
      offsetDays: 4,
      hour: 14,
      interviewers: ['Elena Rossi', 'Dr. Tariq Nassar'],
    },
    {
      appIdx: 8, // Lucas Meyer -> CloudScale QA Lead
      title: 'Automation Strategy & CI/CD Deep-Dive',
      type: 'TECHNICAL' as const,
      status: 'ACCEPTED' as const,
      offsetDays: 3,
      hour: 15,
      interviewers: ['Karim Mansour'],
    },
    {
      appIdx: 6, // Omar Haddad -> CloudScale Backend (Completed + Evaluated)
      title: 'Backend Go & PostgreSQL Concurrency Interview',
      type: 'FINAL' as const,
      status: 'COMPLETED' as const,
      offsetDays: -3,
      hour: 11,
      interviewers: ['Karim Mansour', 'Jonas Weber'],
    },
  ];

  for (const is of interviewSeeds) {
    const appInfo = createdApps[is.appIdx];
    const cand = createdCandidates[appInfo.candIdx];
    const job = createdJobs[appInfo.jobIdx];
    const comp = createdCompanies[job.companyIdx];
    const dt = new Date();
    dt.setDate(dt.getDate() + is.offsetDays);
    dt.setHours(is.hour, 0, 0, 0);

    const createdInterview = await prisma.interview.create({
      data: {
        applicationId: appInfo.id,
        jobId: job.id,
        candidateProfileId: cand.profileId,
        recruiterProfileId: comp.recruiterProfileId,
        title: is.title,
        type: is.type,
        status: is.status,
        scheduledAt: dt,
        durationMinutes: 45,
        meetingLink: 'https://meet.talentai.demo/room-secure-session',
        instructions:
          'Please be ready to walk through one past system architecture decision and live technical trade-offs.',
        interviewers: is.interviewers,
      },
    });

    if (is.status === 'COMPLETED') {
      await prisma.interviewEvaluation.create({
        data: {
          interviewId: createdInterview.id,
          evaluatorId: comp.recruiterUserId,
          consentConfirmed: true,
          rawNotes:
            'Candidate clearly explained Go goroutine worker pools, PostgreSQL advisory locks, Docker multi-stage builds, and REST API idempotency keys. Did not have time to cover Redis cluster failover in depth.',
          organizedNotes:
            '1. Explained Go worker pools and concurrency control.\n2. Demonstrated strong PostgreSQL transactional locking.\n3. Covered Docker container builds and REST API idempotency.\n4. Redis failover left for brief follow-up.',
          evidenceMap: [
            { requirement: 'Go', evidenceFound: 'Explained goroutine worker pools clearly.', status: 'Demonstrated' },
            { requirement: 'PostgreSQL', evidenceFound: 'Detailed advisory locks and indexing.', status: 'Demonstrated' },
            { requirement: 'Redis', evidenceFound: 'Mentioned briefly; cluster failover not covered.', status: 'Partial' },
          ],
          demonstratedSkills: ['Go', 'PostgreSQL', 'Docker', 'REST APIs'],
          unansweredQuestions: ['Deep-dive on Redis cluster failover recovery'],
          suggestedFollowUps: ['Ask 10-minute follow-up on Redis cache invalidation under partition.'],
          structuredSummary:
            'Strong technical evidence demonstrated across Go, PostgreSQL, Docker, and REST APIs. Recommend brief follow-up on Redis failover before human hiring committee decision.',
          humanRecommendation: 'YES',
          aiMode: 'DETERMINISTIC_NLP',
        },
      });
    }
  }

  // 8. Seed Sample Conversations, Messages, Bookmarks & Notifications
  const conv1 = await prisma.conversation.create({
    data: {
      candidateUserId: createdCandidates[0].userId,
      recruiterUserId: createdCompanies[0].recruiterUserId,
      jobId: createdJobs[0].id,
      subject: 'Senior Full-Stack Engineer — Technical Interview Prep',
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conv1.id,
        senderId: createdCompanies[0].recruiterUserId,
        content:
          'Hi Alex! Thank you for applying to Senior Full-Stack Engineer at NovaTech. Our engineering team loved your Next.js & PostgreSQL portfolio and scheduled your technical round!',
        isRead: true,
        createdAt: new Date(Date.now() - 3600000 * 12),
      },
      {
        conversationId: conv1.id,
        senderId: createdCandidates[0].userId,
        content:
          'Thank you Sarah! I accepted the calendar invitation and look forward to discussing NovaTech’s AI workflow architecture.',
        isRead: false,
        createdAt: new Date(Date.now() - 3600000 * 6),
      },
    ],
  });

  const conv2 = await prisma.conversation.create({
    data: {
      candidateUserId: createdCandidates[1].userId,
      recruiterUserId: createdCompanies[0].recruiterUserId,
      jobId: createdJobs[1].id,
      subject: 'Applied NLP & LLM Engineer Offer Details',
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conv2.id,
      senderId: createdCompanies[0].recruiterUserId,
      content:
        'Hi Amira, congratulations! Following your final panel review, we are thrilled to share our formal offer for Applied NLP & LLM Engineer.',
      isRead: false,
    },
  });

  await prisma.jobBookmark.createMany({
    data: [
      { candidateProfileId: createdCandidates[0].profileId, jobId: createdJobs[1].id },
      { candidateProfileId: createdCandidates[0].profileId, jobId: createdJobs[3].id },
      { candidateProfileId: createdCandidates[1].profileId, jobId: createdJobs[0].id },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: createdCandidates[0].userId,
        type: 'INTERVIEW_INVITATION',
        title: 'Upcoming Technical Interview — NovaTech AI Systems',
        message: 'Your Technical Architecture round is confirmed. Review instructions in My Applications.',
        link: '/candidate/applications',
      },
      {
        userId: createdCandidates[0].userId,
        type: 'JOB_RECOMMENDATION',
        title: 'High-Compatibility Role: Frontend Design Systems Engineer',
        message: 'TalentAI identified strong skill overlap across TypeScript, React, Next.js, and Tailwind CSS.',
        link: '/candidate/jobs',
      },
      {
        userId: createdCompanies[0].recruiterUserId,
        type: 'NEW_MESSAGE',
        title: 'New Message from Alex Rivera',
        message: 'Thank you Sarah! I accepted the calendar invitation...',
        link: '/recruiter/messages',
      },
      {
        userId: createdCompanies[0].recruiterUserId,
        type: 'APPLICATION_RECEIVED',
        title: 'New Candidate Applications Ready for Review',
        message: 'You have active applicants waiting in your recruitment pipeline.',
        link: '/recruiter/applications',
      },
    ],
  });

  // 9. Seed AIUsageLog & AuditLog telemetry
  const aiFeatures: Array<
    | 'CV_ANALYZER'
    | 'CANDIDATE_MATCHING'
    | 'JOB_DESCRIPTION_GENERATOR'
    | 'INTERVIEW_QUESTIONS'
    | 'INTERVIEW_EVALUATION'
    | 'CAREER_ASSISTANT'
    | 'SKILL_GAP'
    | 'JOB_RECOMMENDATIONS'
  > = [
    'CV_ANALYZER',
    'CANDIDATE_MATCHING',
    'CANDIDATE_MATCHING',
    'JOB_DESCRIPTION_GENERATOR',
    'INTERVIEW_QUESTIONS',
    'INTERVIEW_EVALUATION',
    'CAREER_ASSISTANT',
    'SKILL_GAP',
    'JOB_RECOMMENDATIONS',
  ];

  for (let i = 0; i < 18; i++) {
    const feat = aiFeatures[i % aiFeatures.length];
    await prisma.aIUsageLog.create({
      data: {
        userId:
          i % 2 === 0
            ? createdCandidates[i % createdCandidates.length].userId
            : createdCompanies[i % createdCompanies.length].recruiterUserId,
        feature: feat,
        mode: 'DETERMINISTIC_NLP',
        modelName: 'talentai-deterministic-nlp-v1',
        status: 'SUCCESS',
        latencyMs: 14 + (i * 7) % 45,
        tokensEstimated: 160 + i * 25,
        createdAt: new Date(Date.now() - i * 86400000),
      },
    });
  }

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: adminUser.id,
        actorRole: 'ADMIN',
        action: 'SYSTEM_SEED_INITIALIZED',
        entityType: 'System',
        details: { demoAccountsCreated: 14, jobsSeeded: 10, applicationsSeeded: 24 },
      },
      {
        actorId: createdCompanies[0].recruiterUserId,
        actorRole: 'RECRUITER',
        action: 'JOB_CREATED',
        entityType: 'Job',
        entityId: createdJobs[0].id,
        details: { title: createdJobs[0].title },
      },
      {
        actorId: createdCandidates[0].userId,
        actorRole: 'CANDIDATE',
        action: 'CV_UPLOADED_AND_ANALYZED',
        entityType: 'CVDocument',
        entityId: createdCandidates[0].cvDocId,
        details: { originalName: 'Alex_Rivera_CV.pdf' },
      },
    ],
  });

  console.log('✅ Seed complete!');
  console.log('   Admin:     admin@talentai.demo            / Admin@123!');
  console.log('   Recruiter: sarah.chen@novatech.demo       / Recruiter@123!');
  console.log('   Candidate: alex.rivera@candidate.demo     / Candidate@123!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
