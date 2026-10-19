import { NextResponse } from 'next/server';
import { seal, STATE_COOKIE, SESSION_COOKIE, cookieOpts, devSignInAllowed } from '@/lib/session';
import { serverToken } from '@/lib/github';

export const dynamic = 'force-dynamic';

// Sends you to GitHub. ?private=1 also asks for the `repo` scope so private repos can move in.
export async function GET(request) {
  const id = process.env.GITHUB_CLIENT_ID;
  const priv = request.nextUrl.searchParams.get('private') === '1';
  if (!id) return devSignInAllowed(request) ? devSignIn(request, priv) : NextResponse.redirect(new URL('/?auth=not-configured', request.url));
  const state = crypto.randomUUID();
  const redirect = new URL('/api/auth/callback', request.url).toString();
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', id);
  url.searchParams.set('redirect_uri', redirect);
  url.searchParams.set('scope', priv ? 'read:user repo' : 'read:user');
  url.searchParams.set('state', state);
  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, await seal({ state, priv }), cookieOpts(600));
  return res;
}

// No OAuth App yet: sign in as whoever the GitHub CLI is logged in as. The token stays on the server.
async function devSignIn(request, priv) {
  const token = serverToken();
  const fail = () => NextResponse.redirect(new URL('/?auth=not-configured', request.url));
  if (!token) return fail();
  const res = await fetch('https://api.github.com/user', { headers: { Authorization: `bearer ${token}`, 'User-Agent': 'gitroom' }, cache: 'no-store' }).catch(() => null);
  const me = res && res.ok ? await res.json() : null;
  if (!me || !me.login) return fail();
  const scopes = (res.headers.get('x-oauth-scopes') || '').split(/[,\s]+/);
  const out = NextResponse.redirect(new URL(`/u/${me.login}`, request.url));
  out.cookies.set(SESSION_COOKIE, await seal({ login: me.login, dev: true, private: priv && scopes.includes('repo') }), cookieOpts(60 * 60 * 24 * 30));
  return out;
}
