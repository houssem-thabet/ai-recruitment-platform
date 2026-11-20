import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  getDashboardPathForRole,
} from '@/lib/jwt';

/**
 * Note on iframe preview compatibility:
 * In normal browsers (and CHIPS-enabled iframes), the HttpOnly cookie is present on page navigation,
 * so middleware enforces role-based redirects immediately at the edge.
 * When third-party cookies are blocked completely by strict browser settings inside an iframe,
 * page shells defer to the client AuthGuard (which verifies via Bearer token against /api/auth/me)
 * ONLY if no cookie is present, while every /api/* route strictly enforces cryptographic auth on the server.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!cookieToken) {
    // If request is a standard direct browser navigation without iframe Bearer fallback query,
    // check sec-fetch-dest. For embedded iframes where cookies might be blocked, client AuthProvider
    // immediately validates Bearer token or redirects to /login?redirect=...
    const secFetchDest = req.headers.get('sec-fetch-dest');
    if (secFetchDest !== 'iframe') {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  const session = await verifySessionToken(cookieToken);
  if (!session) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  }

  if (pathname.startsWith('/candidate') && session.role !== 'CANDIDATE') {
    return NextResponse.redirect(
      new URL(getDashboardPathForRole(session.role), req.url)
    );
  }
  if (pathname.startsWith('/recruiter') && session.role !== 'RECRUITER') {
    return NextResponse.redirect(
      new URL(getDashboardPathForRole(session.role), req.url)
    );
  }
  if (pathname.startsWith('/admin') && session.role !== 'ADMIN') {
    return NextResponse.redirect(
      new URL(getDashboardPathForRole(session.role), req.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/candidate/:path*', '/recruiter/:path*', '/admin/:path*'],
};
