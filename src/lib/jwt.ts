import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE_NAME = 'talentai_session';

export interface SessionTokenPayload {
  sub: string;
  email: string;
  role: 'CANDIDATE' | 'RECRUITER' | 'ADMIN';
  firstName: string;
  lastName: string;
}

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ||
    'talentai-university-capstone-hmac-sha256-secret-key-2026-secure';
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(
  payload: SessionTokenPayload,
  expiresIn: string = '7d'
): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (!payload.sub || !payload.role || !payload.email) return null;
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      role: payload.role as SessionTokenPayload['role'],
      firstName: String(payload.firstName || ''),
      lastName: String(payload.lastName || ''),
    };
  } catch {
    return null;
  }
}

export function getDashboardPathForRole(
  role: 'CANDIDATE' | 'RECRUITER' | 'ADMIN'
): string {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'RECRUITER':
      return '/recruiter';
    case 'CANDIDATE':
    default:
      return '/candidate';
  }
}
