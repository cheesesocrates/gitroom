import { NextResponse } from 'next/server';
import { readSession, devSignInAllowed } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Who is signed in (never the token itself), and whether sign-in works here at all.
export async function GET(request) {
  const s = await readSession(request);
  return NextResponse.json(
    { login: s ? s.login : null, private: s ? !!s.private : false, dev: !!(s && s.dev), configured: !!process.env.GITHUB_CLIENT_ID || devSignInAllowed(request) },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
