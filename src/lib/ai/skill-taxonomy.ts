export interface SkillTaxonomyItem {
  canonical: string;
  aliases: string[];
  category: 'TECHNICAL' | 'SOFT' | 'TOOL' | 'DOMAIN' | 'LANGUAGE';
  difficulty: 'Beginner-Friendly' | 'Moderate' | 'Advanced';
  estimatedWeeks: number;
  projectIdea: string;
  domainTags: string[];
}

export const SKILL_TAXONOMY: SkillTaxonomyItem[] = [
  // Frontend & Web
  {
    canonical: 'JavaScript',
    aliases: ['js', 'es6', 'ecmascript'],
    category: 'TECHNICAL',
    difficulty: 'Beginner-Friendly',
    estimatedWeeks: 4,
    projectIdea: 'Build an interactive state-driven analytics dashboard in vanilla ES2023 without frameworks.',
    domainTags: ['Frontend Development', 'Full-Stack Engineering'],
  },
  {
    canonical: 'TypeScript',
    aliases: ['ts', 'typescript'],
    category: 'TECHNICAL',
    difficulty: 'Moderate',
    estimatedWeeks: 3,
    projectIdea: 'Create an end-to-end type-safe REST API client and form validator using TypeScript generics.',
    domainTags: ['Frontend Development', 'Full-Stack Engineering', 'Backend Engineering'],
  },
  {
    canonical: 'React',
    aliases: ['reactjs', 'react.js', 'react 18'],
    category: 'TECHNICAL',
    difficulty: 'Moderate',
    estimatedWeeks: 4,
    projectIdea: 'Develop a collaborative Kanban task board with optimistic UI updates and accessible keyboard controls.',
    domainTags: ['Frontend Development', 'Full-Stack Engineering'],
  },
  {
    canonical: 'Next.js',
    aliases: ['nextjs', 'next.js', 'next 14', 'next'],
    category: 'TECHNICAL',
    difficulty: 'Moderate',
    estimatedWeeks: 4,
    projectIdea: 'Build a server-rendered multi-tenant SaaS portal using Next.js App Router, Server Components, and RBAC.',
    domainTags: ['Frontend Development', 'Full-Stack Engineering'],
  },
  {
    canonical: 'Vue.js',
    aliases: ['vue', 'vuejs', 'vue 3', 'nuxt'],
    category: 'TECHNICAL',
    difficulty: 'Moderate',
    estimatedWeeks: 4,
    projectIdea: 'Build a real-time inventory dashboard using Vue 3 Composition API and Pinia.',
    domainTags: ['Frontend Development'],
  },
  {
    canonical: 'Angular',
    aliases: ['angularjs', 'angular 17'],
    category: 'TECHNICAL',
    difficulty: 'Moderate',
    estimatedWeeks: 5,
    projectIdea: 'Develop an enterprise role-based form workflow app using Angular Signals and RxJS.',
    domainTags: ['Frontend Development'],
  },
  {
    canonical: 'Tailwind CSS',
    aliases: ['tailwind', 'tailwindcss'],
    category: 'TECHNICAL',
    difficulty: 'Beginner-Friendly',
    estimatedWeeks: 2,
    projectIdea: 'Design a responsive dark-mode-ready component library with accessible color contrast tokens.',
    domainTags: ['Frontend Development', 'UI/UX Engineering'],
  },
  {
    canonical: 'HTML5',
    aliases: ['html', 'semantic html'],
    category: 'TECHNICAL',
    difficulty: 'Beginner-Friendly',
    estimatedWeeks: 2,
    projectIdea: 'Create a WCAG 2.1 AA compliant accessible web portal audited with axe-core.',
    domainTags: ['Frontend Development'],
  },
  {
    canonical: 'CSS3',
    aliases: ['css', 'scss', 'sass', 'flexbox', 'css grid'],
    category: 'TECHNICAL',
    difficulty: 'Beginner-Friendly',
    estimatedWeeks: 2,
    projectIdea: 'Build a responsive dashboard layout system using CSS Grid, container queries, and custom properties.',
    domainTags: ['Frontend Development'],
  },
  // Backend & Databases
  {
    canonical: 'Node.js',
    aliases: ['nodejs', 'node', 'express', 'express.js', 'nestjs'],
    category: 'TECHNICAL',
    difficulty: 'Moderate',
    estimatedWeeks: 4,
    projectIdea: 'Implement a rate-limited, JWT-authenticated REST service with background job queues.',
    domainTags: ['Backend Engineering', 'Full-Stack Engineering'],
  },
  {
    canonical: 'Python',
    aliases: ['py', 'python3', 'python 3'],
    category: 'TECHNICAL',
    difficulty: 'Beginner-Friendly',
    estimatedWeeks: 4,
    projectIdea: 'Build an automated document ETL & NLP pipeline with structured validation and unit tests.',
    domainTags: ['AI & Machine Learning', 'Data Engineering', 'Backend Engineering'],
  },
  {
    canonical: 'FastAPI',
    aliases: ['fastapi', 'flask', 'django'],
    category: 'TECHNICAL',
    difficulty: 'Moderate',
    estimatedWeeks: 3,
    projectIdea: 'Serve an asynchronous ML inference microservice with OpenAPI documentation and Pydantic validation.',
    domainTags: ['Backend Engineering', 'AI & Machine Learning'],
  },
  {
    canonical: 'Java',
    aliases: ['java 17', 'java 21', 'spring boot', 'spring'],
    category: 'TECHNICAL',
    difficulty: 'Moderate',
    estimatedWeeks: 6,
    projectIdea: 'Build a transactional order-processing microservice with Spring Boot, JPA, and PostgreSQL.',
    domainTags: ['Backend Engineering', 'Enterprise Software'],
  },
  {
    canonical: 'Go',
    aliases: ['golang'],
    category: 'TECHNICAL',
    difficulty: 'Moderate',
    estimatedWeeks: 5,
    projectIdea: 'Create a concurrent health-check and webhook dispatcher service using goroutines and channels.',
    domainTags: ['Backend Engineering', 'Cloud & DevOps'],
  },
  {
    canonical: 'C#',
    aliases: ['csharp', '.net', 'dotnet', 'asp.net'],
    category: 'TECHNICAL',
    difficulty: 'Moderate',
    estimatedWeeks: 5,
    projectIdea: 'Develop a clean-architecture Web API using .NET 8, Entity Framework Core, and xUnit.',
    domainTags: ['Backend Engineering', 'Enterprise Software'],
  },
  {
    canonical: 'PostgreSQL',
    aliases: ['postgres', 'psql', 'pg'],
    category: 'TECHNICAL',
    difficulty: 'Moderate',
    estimatedWeeks: 4,
    projectIdea: 'Design a normalized multi-entity relational schema with composite indexes, transactions, and query plans.',
    domainTags: ['Backend Engineering', 'Data Engineering', 'Full-Stack Engineering'],
  },
  {
    canonical: 'Prisma',
    aliases: ['prisma orm'],
    category: 'TOOL',
    difficulty: 'Beginner-Friendly',
    estimatedWeeks: 2,
    projectIdea: 'Model a 15-table SaaS schema with Prisma migrations, seeders, and relational queries.',
    domainTags: ['Full-Stack Engineering', 'Backend Engineering'],
  },
  {
    canonical: 'SQL',
    aliases: ['mysql', 'sqlite', 'tsql', 'relational databases'],
    category: 'TECHNICAL',
    difficulty: 'Beginner-Friendly',
    estimatedWeeks: 3,
    projectIdea: 'Write analytical cohort, funnel, and window-function queries over a 100k-row dataset.',
    domainTags: ['Data Analytics', 'Backend Engineering', 'Data Engineering'],
  },
  {
    canonical: 'MongoDB',
    aliases: ['mongo', 'nosql'],
    category: 'TECHNICAL',
    difficulty: 'Beginner-Friendly',
    estimatedWeeks: 3,
    projectIdea: 'Build an event-ingestion catalog using MongoDB aggregation pipelines and schema validation.',
    domainTags: ['Backend Engineering', 'Full-Stack Engineering'],
  },
  {
    canonical: 'Redis',
    aliases: ['redis cache'],
    category: 'TOOL',
    difficulty: 'Moderate',
    estimatedWeeks: 2,
    projectIdea: 'Add distributed rate-limiting, session caching, and pub/sub notifications using Redis.',
    domainTags: ['Backend Engineering', 'Cloud & DevOps'],
  },
  {
    canonical: 'GraphQL',
    aliases: ['apollo', 'graphql api'],
    category: 'TECHNICAL',
    difficulty: 'Moderate',
    estimatedWeeks: 3,
    projectIdea: 'Create a federated GraphQL gateway with DataLoader batching to eliminate N+1 queries.',
    domainTags: ['Backend Engineering', 'Full-Stack Engineering'],
  },
  {
    canonical: 'REST APIs',
    aliases: ['rest', 'restful', 'rest api', 'openapi', 'swagger'],
    category: 'TECHNICAL',
    difficulty: 'Beginner-Friendly',
    estimatedWeeks: 2,
    projectIdea: 'Design and document a versioned REST API with pagination, filtering, RBAC, and integration tests.',
    domainTags: ['Backend Engineering', 'Full-Stack Engineering'],
  },
  // Cloud, DevOps & Security
  {
    canonical: 'Docker',
    aliases: ['docker compose', 'containers', 'containerization'],
    category: 'TOOL',
    difficulty: 'Moderate',
    estimatedWeeks: 3,
    projectIdea: 'Containerize a full-stack web app + PostgreSQL with multi-stage Dockerfiles and health checks.',
    domainTags: ['Cloud & DevOps', 'Backend Engineering'],
  },
  {
    canonical: 'Kubernetes',
    aliases: ['k8s', 'helm', 'eks', 'gke'],
    category: 'TECHNICAL',
    difficulty: 'Advanced',
    estimatedWeeks: 6,
    projectIdea: 'Deploy a horizontally autoscaled microservice cluster on local Kind/Minikube with Ingress and probes.',
    domainTags: ['Cloud & DevOps'],
  },
  {
    canonical: 'AWS',
    aliases: ['amazon web services', 'ec2', 's3', 'lambda', 'rds'],
    category: 'TECHNICAL',
    difficulty: 'Moderate',
    estimatedWeeks: 5,
    projectIdea: 'Architect a least-privilege cloud deployment using IAM roles, S3 private buckets, RDS, and CloudWatch.',
    domainTags: ['Cloud & DevOps', 'Backend Engineering'],
  },
  {
    canonical: 'GCP',
    aliases: ['google cloud', 'cloud run', 'bigquery'],
    category: 'TECHNICAL',
    difficulty: 'Moderate',
    estimatedWeeks: 4,
    projectIdea: 'Deploy a serverless containerized API on Cloud Run backed by Cloud SQL and Secret Manager.',
    domainTags: ['Cloud & DevOps', 'Data Engineering'],
  },
  {
    canonical: 'Azure',
    aliases: ['microsoft azure', 'azure devops'],
    category: 'TECHNICAL',
    difficulty: 'Moderate',
    estimatedWeeks: 4,
    projectIdea: 'Provision an Azure App Service and PostgreSQL Flexible Server pipeline with Bicep.',
    domainTags: ['Cloud & DevOps'],
  },
  {
    canonical: 'Terraform',
    aliases: ['iac', 'infrastructure as code'],
    category: 'TOOL',
    difficulty: 'Moderate',
    estimatedWeeks: 4,
    projectIdea: 'Write modular Terraform configurations with remote state and automated plan checks.',
    domainTags: ['Cloud & DevOps'],
  },
  {
    canonical: 'CI/CD',
    aliases: ['github actions', 'gitlab ci', 'jenkins', 'continuous integration'],
    category: 'TOOL',
    difficulty: 'Moderate',
    estimatedWeeks: 2,
    projectIdea: 'Build a GitHub Actions pipeline running typecheck, unit/integration tests, security audit, and Docker build.',
    domainTags: ['Cloud & DevOps', 'Full-Stack Engineering'],
  },
  {
    canonical: 'Linux',
    aliases: ['bash', 'unix', 'shell scripting'],
    category: 'TECHNICAL',
    difficulty: 'Beginner-Friendly',
    estimatedWeeks: 3,
    projectIdea: 'Automate server hardening, log rotation, and backup verification scripts on Debian Linux.',
    domainTags: ['Cloud & DevOps', 'Cybersecurity'],
  },
  {
    canonical: 'Cybersecurity',
    aliases: ['owasp', 'application security', 'appsec', 'penetration testing', 'iam'],
    category: 'DOMAIN',
    difficulty: 'Advanced',
    estimatedWeeks: 6,
    projectIdea: 'Perform an OWASP Top 10 audit on a web application and remediate auth, CSRF, XSS, and SSRF risks.',
    domainTags: ['Cybersecurity'],
  },
  // AI, ML & Data
  {
    canonical: 'Machine Learning',
    aliases: ['ml', 'scikit-learn', 'sklearn', 'supervised learning', 'xgboost'],
    category: 'TECHNICAL',
    difficulty: 'Advanced',
    estimatedWeeks: 6,
    projectIdea: 'Train, calibrate, and evaluate an explainable classification pipeline with SHAP feature attribution.',
    domainTags: ['AI & Machine Learning', 'Data Science'],
  },
  {
    canonical: 'Deep Learning',
    aliases: ['pytorch', 'tensorflow', 'neural networks', 'keras'],
    category: 'TECHNICAL',
    difficulty: 'Advanced',
    estimatedWeeks: 7,
    projectIdea: 'Fine-tune a transformer text classifier in PyTorch with mixed-precision training and evaluation benchmarks.',
    domainTags: ['AI & Machine Learning'],
  },
  {
    canonical: 'NLP',
    aliases: ['natural language processing', 'spacy', 'tokenization', 'semantic search', 'embeddings'],
    category: 'TECHNICAL',
    difficulty: 'Advanced',
    estimatedWeeks: 5,
    projectIdea: 'Build a semantic document retrieval and entity extraction engine using embeddings and hybrid BM25/cosine search.',
    domainTags: ['AI & Machine Learning', 'Data Science'],
  },
  {
    canonical: 'LLM Integration',
    aliases: ['llms', 'openai', 'langchain', 'rag', 'prompt engineering', 'generative ai'],
    category: 'TECHNICAL',
    difficulty: 'Moderate',
    estimatedWeeks: 4,
    projectIdea: 'Implement a citation-grounded RAG assistant with structured JSON schema validation and evaluation guardrails.',
    domainTags: ['AI & Machine Learning', 'Full-Stack Engineering'],
  },
  {
    canonical: 'Data Analysis',
    aliases: ['pandas', 'numpy', 'data analytics', 'power bi', 'tableau'],
    category: 'TECHNICAL',
    difficulty: 'Moderate',
    estimatedWeeks: 4,
    projectIdea: 'Create an automated cohort & funnel analytics report with reproducible Python notebooks and interactive charts.',
    domainTags: ['Data Analytics', 'Data Science'],
  },
  {
    canonical: 'Apache Spark',
    aliases: ['pyspark', 'airflow', 'etl', 'dbt', 'data pipelines'],
    category: 'TECHNICAL',
    difficulty: 'Advanced',
    estimatedWeeks: 6,
    projectIdea: 'Orchestrate an incremental daily ETL warehouse pipeline using dbt, Airflow, and PostgreSQL.',
    domainTags: ['Data Engineering'],
  },
  // QA, Design, Mobile & Product
  {
    canonical: 'Automated Testing',
    aliases: ['jest', 'vitest', 'playwright', 'cypress', 'unit testing', 'e2e testing', 'qa'],
    category: 'TECHNICAL',
    difficulty: 'Moderate',
    estimatedWeeks: 3,
    projectIdea: 'Create a multi-layer test suite combining Vitest unit/integration tests and Playwright E2E browser workflows.',
    domainTags: ['Full-Stack Engineering', 'Quality Assurance'],
  },
  {
    canonical: 'Git',
    aliases: ['github', 'gitlab', 'version control'],
    category: 'TOOL',
    difficulty: 'Beginner-Friendly',
    estimatedWeeks: 1,
    projectIdea: 'Manage feature branches, pull request reviews, semantic commits, and release tags on a collaborative repo.',
    domainTags: ['Full-Stack Engineering', 'Backend Engineering'],
  },
  {
    canonical: 'UI/UX Design',
    aliases: ['figma', 'wireframing', 'design systems', 'user research', 'accessibility'],
    category: 'DOMAIN',
    difficulty: 'Moderate',
    estimatedWeeks: 4,
    projectIdea: 'Design an accessible SaaS design system in Figma with interactive prototypes and usability test notes.',
    domainTags: ['UI/UX Engineering', 'Frontend Development'],
  },
  {
    canonical: 'React Native',
    aliases: ['flutter', 'mobile development', 'ios', 'android'],
    category: 'TECHNICAL',
    difficulty: 'Moderate',
    estimatedWeeks: 5,
    projectIdea: 'Build an offline-capable cross-platform mobile companion app with push notifications.',
    domainTags: ['Mobile Engineering'],
  },
  // Soft Skills
  {
    canonical: 'Communication',
    aliases: ['written communication', 'verbal communication', 'technical writing', 'presentation'],
    category: 'SOFT',
    difficulty: 'Beginner-Friendly',
    estimatedWeeks: 2,
    projectIdea: 'Write clear architecture decision records (ADRs) and record a 5-minute technical walkthrough.',
    domainTags: ['Leadership & Collaboration'],
  },
  {
    canonical: 'Problem Solving',
    aliases: ['analytical thinking', 'critical thinking', 'debugging'],
    category: 'SOFT',
    difficulty: 'Moderate',
    estimatedWeeks: 3,
    projectIdea: 'Document root-cause analyses and performance optimizations on real bottlenecks.',
    domainTags: ['Leadership & Collaboration'],
  },
  {
    canonical: 'Agile & Scrum',
    aliases: ['agile', 'scrum', 'kanban', 'jira', 'sprint planning'],
    category: 'SOFT',
    difficulty: 'Beginner-Friendly',
    estimatedWeeks: 2,
    projectIdea: 'Break down a multi-week product epic into user stories with acceptance criteria and sprint milestones.',
    domainTags: ['Leadership & Collaboration', 'Product Management'],
  },
  {
    canonical: 'Team Leadership',
    aliases: ['leadership', 'mentoring', 'code review', 'cross-functional collaboration', 'teamwork'],
    category: 'SOFT',
    difficulty: 'Moderate',
    estimatedWeeks: 4,
    projectIdea: 'Lead structured code reviews and create onboarding documentation for junior contributors.',
    domainTags: ['Leadership & Collaboration'],
  },
  // Languages
  {
    canonical: 'English',
    aliases: ['english fluent', 'english c1', 'english c2', 'english b2'],
    category: 'LANGUAGE',
    difficulty: 'Moderate',
    estimatedWeeks: 8,
    projectIdea: 'Practice technical mock interviews and author open-source documentation in English.',
    domainTags: ['Languages'],
  },
  {
    canonical: 'French',
    aliases: ['français', 'french fluent', 'french b2', 'french c1'],
    category: 'LANGUAGE',
    difficulty: 'Moderate',
    estimatedWeeks: 8,
    projectIdea: 'Conduct bilingual stakeholder presentations and localized product specs in French.',
    domainTags: ['Languages'],
  },
  {
    canonical: 'Arabic',
    aliases: ['العربية', 'arabic native', 'arabic fluent'],
    category: 'LANGUAGE',
    difficulty: 'Moderate',
    estimatedWeeks: 8,
    projectIdea: 'Deliver RTL-localized interfaces and technical documentation in Arabic.',
    domainTags: ['Languages'],
  },
  {
    canonical: 'German',
    aliases: ['deutsch', 'german b2'],
    category: 'LANGUAGE',
    difficulty: 'Moderate',
    estimatedWeeks: 10,
    projectIdea: 'Prepare professional workplace communication templates in German.',
    domainTags: ['Languages'],
  },
  {
    canonical: 'Spanish',
    aliases: ['español', 'spanish fluent'],
    category: 'LANGUAGE',
    difficulty: 'Moderate',
    estimatedWeeks: 8,
    projectIdea: 'Collaborate on bilingual technical support and documentation in Spanish.',
    domainTags: ['Languages'],
  },
];

export interface CareerPathBlueprint {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
}

export const CAREER_PATH_BLUEPRINTS: CareerPathBlueprint[] = [
  {
    id: 'fullstack-engineer',
    title: 'Full-Stack Software Engineer',
    description: 'End-to-end web application architecture across modern React/Next.js frontends, typed APIs, and relational databases.',
    requiredSkills: ['TypeScript', 'React', 'Next.js', 'Node.js', 'PostgreSQL', 'REST APIs', 'Git', 'Automated Testing'],
    niceToHaveSkills: ['Docker', 'CI/CD', 'Tailwind CSS', 'Redis', 'LLM Integration'],
  },
  {
    id: 'ai-ml-engineer',
    title: 'AI / Machine Learning Engineer',
    description: 'Production NLP, semantic retrieval, LLM orchestration, and scalable ML inference pipelines.',
    requiredSkills: ['Python', 'Machine Learning', 'NLP', 'LLM Integration', 'FastAPI', 'SQL', 'Docker'],
    niceToHaveSkills: ['Deep Learning', 'PostgreSQL', 'AWS', 'Automated Testing'],
  },
  {
    id: 'cloud-devops-engineer',
    title: 'Cloud & DevOps Engineer',
    description: 'Automated infrastructure, container orchestration, observability, and CI/CD reliability.',
    requiredSkills: ['Docker', 'Kubernetes', 'AWS', 'Terraform', 'CI/CD', 'Linux', 'Python'],
    niceToHaveSkills: ['Go', 'Cybersecurity', 'PostgreSQL', 'Redis'],
  },
  {
    id: 'data-scientist-analyst',
    title: 'Data Scientist & Analytics Engineer',
    description: 'Statistical modeling, SQL warehousing, ETL pipelines, and executive data storytelling.',
    requiredSkills: ['Python', 'SQL', 'Data Analysis', 'Machine Learning', 'PostgreSQL', 'Communication'],
    niceToHaveSkills: ['Apache Spark', 'GCP', 'Git'],
  },
  {
    id: 'frontend-product-engineer',
    title: 'Senior Frontend & Design Systems Engineer',
    description: 'Accessible, performant user interfaces, component architecture, and UX engineering.',
    requiredSkills: ['TypeScript', 'React', 'Next.js', 'Tailwind CSS', 'HTML5', 'CSS3', 'UI/UX Design', 'Automated Testing'],
    niceToHaveSkills: ['GraphQL', 'Node.js', 'Communication'],
  },
];

const aliasLookup = new Map<string, SkillTaxonomyItem>();
for (const item of SKILL_TAXONOMY) {
  aliasLookup.set(item.canonical.toLowerCase(), item);
  for (const alias of item.aliases) {
    aliasLookup.set(alias.toLowerCase(), item);
  }
}

export function normalizeSkillName(raw: string): {
  canonical: string;
  category: SkillTaxonomyItem['category'];
  taxonomyItem?: SkillTaxonomyItem;
} {
  const cleaned = raw.trim();
  const found = aliasLookup.get(cleaned.toLowerCase());
  if (found) {
    return {
      canonical: found.canonical,
      category: found.category,
      taxonomyItem: found,
    };
  }
  return {
    canonical: cleaned,
    category: 'TECHNICAL',
  };
}

export function extractSkillsFromText(text: string): {
  technicalSkills: string[];
  softSkills: string[];
  languages: string[];
} {
  // Strip sentence-ending periods while preserving mid-token dots like Node.js / Next.js
  const lower = ` ${text.toLowerCase().replace(/\.(?=\s|$)/g, ' ')} `;
  const technical = new Set<string>();
  const soft = new Set<string>();
  const languages = new Set<string>();

  for (const item of SKILL_TAXONOMY) {
    const candidates = [item.canonical, ...item.aliases];
    let matched = false;
    for (const term of candidates) {
      const escaped = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-z0-9+#.])${escaped}($|[^a-z0-9+#.])`, 'i');
      if (regex.test(lower)) {
        matched = true;
        break;
      }
    }
    if (matched) {
      if (item.category === 'SOFT') soft.add(item.canonical);
      else if (item.category === 'LANGUAGE') languages.add(item.canonical);
      else technical.add(item.canonical);
    }
  }

  return {
    technicalSkills: Array.from(technical),
    softSkills: Array.from(soft),
    languages: Array.from(languages),
  };
}
