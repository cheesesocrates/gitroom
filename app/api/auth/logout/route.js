import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const res = NextResponse.redirect(new URL('/', request.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
