// Server side of the GitHub reader: no token, and every answer is kept in Next's data cache for six hours,
// so a house that many people open costs GitHub one read. House files are read fresh, so owners' changes show up quickly.
import { createGitHub, readHouseFile, GitHubError } from './github-rest.js';
import { cleanSettings } from './settings.js';

const UA = { 'User-Agent': 'GitRoom (+https://github.com/cheesesocrates/gitroom)', 'X-GitHub-Api-Version': '2022-11-28' };

export const cached = createGitHub(fetch, {
  apiInit: { headers: UA, next: { revalidate: 21600 } },
  rawInit: { headers: UA, next: { revalidate: 21600 } },
});
export const fresh = createGitHub(fetch, { apiInit: { headers: UA, cache: 'no-store' }, rawInit: { headers: UA, cache: 'no-store' } });

export async function readSettings(login) {
  const hit = await readHouseFile(login, {
    api: fresh.api,
    fetchText: url => fetch(url, { headers: UA, cache: 'no-store', signal: AbortSignal.timeout(7000) }).then(r => (r.ok ? r.text() : null)).catch(() => null),
  });
  return hit ? { settings: cleanSettings(hit.data), file: hit.file, branch: hit.branch } : { settings: null, file: null };
}

// JSON replies with CDN caching that suits each outcome
export function reply(body, { status = 200, cdn = 0, swr = 0, browser = 0 } = {}) {
  const cache = cdn ? `public, max-age=${browser}, s-maxage=${cdn}, stale-while-revalidate=${swr}` : 'no-store';
  return Response.json(body, { status, headers: { 'Cache-Control': cache } });
}

export function replyError(e, where) {
  if (e instanceof GitHubError) {
    if (e.code === 'rate') return reply({ error: e.message, code: 'rate', reset: e.reset }, { status: 503 });
    if (e.status === 404) return reply({ error: e.message, code: 'not-found' }, { status: 404, cdn: 600, swr: 600 });
    if (e.code === 'org') return reply({ error: e.message, code: 'org' }, { status: 422, cdn: 86400, swr: 86400 });
    return reply({ error: e.message, code: e.code || 'down' }, { status: 502 });
  }
  console.error(`[${where}]`, e);
  return reply({ error: 'Something went wrong while reading GitHub.', code: 'down' }, { status: 500 });
}
