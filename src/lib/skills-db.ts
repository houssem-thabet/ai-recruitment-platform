import prisma from '@/lib/prisma';
import { sanitizeText, slugify } from '@/lib/utils';
import { normalizeSkillName } from '@/lib/ai/skill-taxonomy';
import { SkillCategory } from '@prisma/client';

const VALID_CATEGORIES = new Set<SkillCategory>([
  'TECHNICAL',
  'SOFT',
  'TOOL',
  'DOMAIN',
  'LANGUAGE',
]);

export async function upsertSkillRecord(rawName: string, overrideCategory?: SkillCategory | string) {
  const cleanedRaw = sanitizeText(rawName).slice(0, 80);
  const norm = normalizeSkillName(cleanedRaw);
  const canonical = sanitizeText(norm.canonical).slice(0, 80) || cleanedRaw;
  const slug =
    slugify(canonical) ||
    `skill-${Buffer.from(canonical).toString('hex').slice(0, 12)}`;
  const candidateCategory = (overrideCategory || norm.category || 'TECHNICAL') as SkillCategory;
  const category: SkillCategory = VALID_CATEGORIES.has(candidateCategory)
    ? candidateCategory
    : 'TECHNICAL';

  const existing = await prisma.skill.findFirst({
    where: {
      OR: [{ slug }, { name: { equals: canonical, mode: 'insensitive' } }],
    },
  });

  if (existing) return existing;

  return prisma.skill.create({
    data: {
      name: canonical,
      slug,
      category,
    },
  });
}
