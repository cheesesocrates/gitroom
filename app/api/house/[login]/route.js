import { NextResponse } from 'next/server';
import { fetchUser, fetchAchievements, serverToken, GitHubError } from '@/lib/github';
import { buildProfile } from '@/lib/analyze';
import { readSession } from '@/lib/session';

export const dynamic = 'force-dynamic';
// big accounts (like torvalds) take 10-20 seconds of GitHub queries
export const maxDuration = 60;

// Public houses are cached in memory here and at the CDN; your own house (with private repos) never is.
const cache = new Map();
const inflight = new Map();
const TTL = 6 * 60 * 60 * 1000;
const VALID = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

async function build(login, { token, owner, includePrivate }) {
  const [gh, achievements] = await Promise.all([fetchUser(login, { token, includePrivate }), fetchAchievements(login)]);
  return buildProfile(gh, achievements, { owner });
}

// One GitHub read per public house, however many people open it at once.
function publicHouse(login, fresh) {
  const key = login.toLowerCase();
  const hit = cache.get(key);
  if (!fresh && hit && Date.now() - hit.t < TTL) return Promise.resolve(hit.profile);
  if (inflight.has(key)) return inflight.get(key);
  const job = build(login, { token: serverToken(), owner: false, includePrivate: false })
    .then(profile => {
      cache.set(key, { t: Date.now(), profile });
      if (cache.size > 500) cache.delete(cache.keys().next().value);
      return profile;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, job);
  return job;
}

export async function GET(request, { params }) {
  const { login: raw } = await params;
  const login = String(raw || '').trim();
  if (!VALID.test(login)) return NextResponse.json({ error: "That isn't a valid GitHub username." }, { status: 400 });
  const sp = request.nextUrl.searchParams;
  const session = sp.get('me') === '1' ? await readSession(request) : null;
  const owner = !!session && session.login.toLowerCase() === login.toLowerCase();
  try {
    if (owner) {
      try {
        // your own token (or, with dev sign-in, the CLI's): private repos come along if you allowed them, names stay hidden
        const token = session.dev ? serverToken() : session.token;
        return reply(await build(login, { token, owner: true, includePrivate: !!session.private }), false);
      } catch (e) {
        if (!(e instanceof GitHubError) || e.status !== 401) throw e;
        // the sign-in expired or was revoked: show the public house and ask to sign in again
        const profile = await publicHouse(login, false);
        return reply({ ...profile, reauth: true }, false);
      }
    }
    return reply(await publicHouse(login, false), true);
  } catch (e) {
    const status = e instanceof GitHubError ? e.status : 500;
    if (status === 500) console.error('[house]', login, e);
    return NextResponse.json({ error: e.message || 'Something went wrong while reading GitHub.' }, { status });
  }
}

function reply(profile, cacheable) {
  return NextResponse.json({ profile }, {
    headers: { 'Cache-Control': cacheable ? 'public, max-age=300, s-maxage=21600, stale-while-revalidate=86400' : 'private, no-store' },
  });
}
