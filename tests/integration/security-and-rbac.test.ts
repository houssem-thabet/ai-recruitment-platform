import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import prisma from '../../src/lib/prisma';
import { signSessionToken, verifySessionToken } from '../../src/lib/jwt';
import { registerSchema } from '../../src/lib/validators';
import { sanitizeText } from '../../src/lib/utils';

describe('Integration Tests: Database Integrity, Security & RBAC Validators', () => {
  it('prevents public ADMIN registration at schema validation level', () => {
    const attempt = registerSchema.safeParse({
      email: 'attacker@evil.demo',
      password: 'Password@123',
      confirmPassword: 'Password@123',
      firstName: 'Evil',
      lastName: 'Admin',
      accountType: 'ADMIN',
    });
    expect(attempt.success).toBe(false);
  });

  it('sanitizes XSS payloads and null bytes cleanly', () => {
    const dirty = 'Hello <script>alert("xss")</script><b>World</b>\0';
    const clean = sanitizeText(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('\0');
    expect(clean).toContain('Hello');
  });

  it('signs and verifies HS256 JWT session tokens accurately', async () => {
    const token = await signSessionToken({
      sub: 'user-123',
      email: 'test@talentai.demo',
      role: 'CANDIDATE',
      firstName: 'Test',
      lastName: 'User',
    });
    const verified = await verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.sub).toBe('user-123');
    expect(verified?.role).toBe('CANDIDATE');

    const forged = await verifySessionToken(token + 'tampered');
    expect(forged).toBeNull();
  });

  it('verifies seeded PostgreSQL database contains all required demo entities and hashed passwords', async () => {
    const [
      adminCount,
      recruiterCount,
      candidateCount,
      companyCount,
      jobCount,
      appCount,
      cvCount,
      matchCount,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'RECRUITER' } }),
      prisma.user.count({ where: { role: 'CANDIDATE' } }),
      prisma.company.count(),
      prisma.job.count(),
      prisma.application.count(),
      prisma.cVDocument.count(),
      prisma.matchResult.count(),
    ]);

    expect(adminCount).toBeGreaterThanOrEqual(1);
    expect(recruiterCount).toBeGreaterThanOrEqual(3);
    expect(candidateCount).toBeGreaterThanOrEqual(10);
    expect(companyCount).toBeGreaterThanOrEqual(3);
    expect(jobCount).toBeGreaterThanOrEqual(8);
    expect(appCount).toBeGreaterThanOrEqual(20);
    expect(cvCount).toBeGreaterThanOrEqual(10);
    expect(matchCount).toBeGreaterThanOrEqual(20);

    const admin = await prisma.user.findUnique({
      where: { email: 'admin@talentai.demo' },
    });
    expect(admin).not.toBeNull();
    expect(admin!.passwordHash).not.toBe('Admin@123!');
    const passwordMatches = await bcrypt.compare('Admin@123!', admin!.passwordHash);
    expect(passwordMatches).toBe(true);
  });
});
