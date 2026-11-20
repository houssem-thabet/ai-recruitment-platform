import prisma from '@/lib/prisma';
import { slugify } from '@/lib/utils';
import { normalizeSkillName } from '@/lib/ai/skill-taxonomy';
import { SkillCategory } from '@prisma/client';

export async function upsertSkillRecord(rawName: string, overrideCategory?: SkillCategory) {
  const norm = normalizeSkillName(rawName);
  const slug = slugify(norm.canonical) || rawName.toLowerCase().trim();
  const category = (overrideCategory || norm.category || 'TECHNICAL') as SkillCategory;

  const existing = await prisma.skill.findFirst({
    where: {
      OR: [{ slug }, { name: { equals: norm.canonical, mode: 'insensitive' } }],
    },
  });

  if (existing) return existing;

  return prisma.skill.create({
    data: {
      name: norm.canonical,
      slug,
      category,
    },
  });
}
