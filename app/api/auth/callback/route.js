import { NextResponse } from 'next/server';
import { seal, unseal, SESSION_COOKIE, STATE_COOKIE, cookieOpts } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const sp = request.nextUrl.searchParams;
  const fail = reason => NextResponse.redirect(new URL(`/?auth=${reason}`, request.url));
  const saved = await unseal(request.cookies.get(STATE_COOKIE)?.value);
  if (!saved || saved.state !== sp.get('state') || !sp.get('code')) return fail('expired');
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: sp.get('code'),
      redirect_uri: new URL('/api/auth/callback', request.url).toString(),
    }),
  }).then(r => r.json()).catch(() => null);
  if (!tokenRes || !tokenRes.access_token) return fail('denied');
  const me = await fetch('https://api.github.com/user', {
    headers: { Authorization: `bearer ${tokenRes.access_token}`, 'User-Agent': 'gitroom' },
  }).then(r => r.json()).catch(() => null);
  if (!me || !me.login) return fail('denied');
  const scopes = String(tokenRes.scope || '').split(/[,\s]+/);
  const res = NextResponse.redirect(new URL(`/u/${me.login}`, request.url));
  res.cookies.set(SESSION_COOKIE, await seal({ token: tokenRes.access_token, login: me.login, private: scopes.includes('repo') }), cookieOpts(60 * 60 * 24 * 30));
  res.cookies.delete(STATE_COOKIE);
  return res;
}
