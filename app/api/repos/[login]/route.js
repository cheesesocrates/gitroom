import { VALID_LOGIN } from '@/lib/github-rest';
import { readReposPages } from '@/lib/repo-page';
import { cached, reply } from '@/lib/server-github';

export const maxDuration = 30;
const NAME = /^[\w.-]{1,100}$/;

// Commit counts and residents for a few repos, read off their public web pages: browsers that build a house
// themselves ask here, because they can't read github.com pages and these cost no API quota.
// ?r=name:Language,name2:Language (the language picks language-only residents; it may be empty)
export async function GET(request, { params }) {
  const { login } = await params;
  if (!VALID_LOGIN.test(login)) return reply({ error: "That isn't a valid GitHub username." }, { status: 400 });
  const list = String(request.nextUrl.searchParams.get('r') || '').split(',').slice(0, 14)
    .map(s => { const [name, ...l] = s.split(':'); return { name, language: l.join(':').trim() || null }; })
    .filter(r => NAME.test(r.name));
  if (!list.length) return reply({ repos: {} }, { status: 400 });
  const found = await readReposPages(login, list, cached.raw);
  const repos = {};
  list.forEach((r, i) => { if (found[i]) repos[r.name] = found[i]; });
  const complete = Object.keys(repos).length === list.length;
  return reply({ repos }, complete ? { cdn: 21600, swr: 86400, browser: 300 } : { cdn: 120, swr: 120 });
}
