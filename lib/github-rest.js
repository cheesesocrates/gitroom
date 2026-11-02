// Everything GitRoom reads about a person, from GitHub's public REST API and raw files: no token, no keys.
// The same code runs on the server (cached at the CDN) and, when the server has used up GitHub's free quota, in the visitor's browser.
import { detect } from './detect.js';

export const VALID_LOGIN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const ROOMS = 10, MAX_DETAILED = 12;

export class GitHubError extends Error {
  constructor(status, message, extra = {}) { super(message); this.status = status; Object.assign(this, extra); }
}

// api(path) → { ok, status, data, headers }; raw(owner, repo, path) → text or null.
// GitHub answers "slow down" with 403 or 429 plus rate-limit headers; that becomes GitHubError(429) with the reset time.
export function createGitHub(fetchImpl, { apiInit = {}, rawInit = {}, apiTimeout = 12000, rawTimeout = 7000 } = {}) {
  async function api(path) {
    let res;
    try {
      res = await fetchImpl('https://api.github.com' + path, { ...apiInit, headers: { Accept: 'application/vnd.github+json', ...(apiInit.headers || {}) }, signal: AbortSignal.timeout(apiTimeout) });
    } catch (e) {
      throw new GitHubError(504, 'GitHub took too long to answer. Try again in a moment.', { code: 'slow' });
    }
    if (res.status === 403 || res.status === 429) {
      const left = res.headers.get('x-ratelimit-remaining'), reset = +res.headers.get('x-ratelimit-reset') || 0, retry = +res.headers.get('retry-after') || 0;
      if (res.status === 429 || left === '0' || retry) throw new GitHubError(429, 'GitHub needs a short breather.', { code: 'rate', reset: reset ? reset * 1000 : Date.now() + (retry || 60) * 1000 });
    }
    if (res.status >= 500) throw new GitHubError(502, 'GitHub is having a moment. Try again shortly.', { code: 'down' });
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data, headers: res.headers };
  }
  async function raw(owner, repo, path) {
    try {
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${path.split('/').map(encodeURIComponent).join('/')}`;
      const res = await fetchImpl(url, { ...rawInit, signal: AbortSignal.timeout(rawTimeout) });
      if (!res.ok) return null;
      const text = await res.text();
      return text.length > 400000 ? null : text;
    } catch (e) {
      return null;
    }
  }
  return { api, raw };
}

// Runs async jobs a few at a time.
export async function pool(items, size, fn) {
  const queue = items.map((item, i) => [item, i]), out = new Array(items.length);
  await Promise.all(Array.from({ length: Math.min(size, queue.length) }, async () => {
    while (queue.length) { const [item, i] = queue.shift(); out[i] = await fn(item, i); }
  }));
  return out;
}

// A repo's commit count is the page number of its last commit, one per page.
async function countCommits(api, owner, repo) {
  const r = await api(`/repos/${owner}/${repo}/commits?per_page=1`);
  if (!r.ok) return 0; // 409: empty repo, 404: gone
  const last = /[?&]page=(\d+)[^>]*>;\s*rel="last"/.exec(r.headers.get('link') || '');
  return last ? +last[1] : Array.isArray(r.data) ? r.data.length : 0;
}

const MANIFEST = /^(package\.json|requirements[\w.-]*\.txt|pyproject\.toml|pipfile|setup\.py|setup\.cfg|environment\.ya?ml|go\.mod|cargo\.toml|composer\.json|gemfile|pubspec\.yaml|pom\.xml|build\.gradle(\.kts)?|manifest\.json)$/i;
const SKIP = /(^|\/)(node_modules|bower_components|vendor|dist|build|out|target|\.next|\.nuxt|venv|\.venv|env|site-packages|third_party|deps|examples?|samples?|tests?|__tests__|fixtures|\.git)\//i;

// Which manifest files to read: the root ones first, then a couple of levels down (frontend/, apps/web/…).
function pickManifests(files) {
  return files
    .filter(p => MANIFEST.test(p.split('/').pop()) && p.split('/').length <= 3 && !SKIP.test(p))
    .filter(p => !/manifest\.json$/i.test(p) || !p.includes('/'))
    .sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))
    .slice(0, 8);
}

// Who lives in one repo, the API way (two or three API calls): its file tree (every path for normal-sized repos,
// just the root for giants), then the manifests. Used when the repo's web page can't be read.
export async function readRepoApi(api, raw, owner, repo) {
  const big = (repo.size || 0) > 15000;
  const [commits, t] = await Promise.all([
    countCommits(api, owner, repo.name),
    api(`/repos/${owner}/${repo.name}/git/trees/HEAD${big ? '' : '?recursive=1'}`),
  ]);
  const entries = t.ok && t.data && Array.isArray(t.data.tree) ? t.data.tree : [];
  const files = entries.filter(e => e.type === 'blob').map(e => e.path).filter(p => !SKIP.test(p));
  const root = entries.filter(e => !e.path.includes('/')).map(e => e.path + (e.type === 'tree' ? '/' : ''));
  let workflows = files.filter(p => /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(p)).length;
  let copilot = files.includes('.github/copilot-instructions.md');
  if (big && root.includes('.github/')) {
    const g = await api(`/repos/${owner}/${repo.name}/contents/.github`);
    const names = g.ok && Array.isArray(g.data) ? g.data.map(e => e.name) : [];
    workflows = names.includes('workflows') ? 1 : 0;
    copilot = names.includes('copilot-instructions.md');
  }
  const wanted = pickManifests(files);
  const texts = await pool(wanted, 4, p => raw(owner, repo.name, p));
  const manifests = wanted.map((path, i) => ({ path, text: texts[i] })).filter(m => m.text);
  const found = detect({ manifests, root, paths: files, workflows, copilot, langs: repo.language ? [repo.language] : [], repoName: repo.name });
  return { commits, found };
}

const trim = r => ({
  name: r.name, stars: r.stargazers_count || 0, size: r.size || 0, pushed: r.pushed_at || r.created_at || '', language: r.language || null,
  archived: !!r.archived, branch: r.default_branch || 'main', description: r.description ? String(r.description).slice(0, 140) : '',
});

// The repos most likely to be someone's main work, before we know their commit counts.
function rank(repos, login) {
  const now = Date.now();
  const score = r => {
    const days = (now - Date.parse(r.pushed || 0)) / 864e5;
    return Math.log2(2 + r.size) + 1.6 * Math.log2(1 + r.stars) + (days < 90 ? 3 : days < 365 ? 2 : days < 730 ? 1 : 0)
      + (r.description ? .5 : 0) - (r.archived ? 2 : 0) - (r.size === 0 ? 20 : 0) - (r.name.toLowerCase() === login.toLowerCase() ? 6 : 0);
  };
  return repos.slice().sort((a, b) => score(b) - score(a));
}

// rooms: repo names the owner picked (from their house file), so those get counted and furnished too.
// details(owner, repos, onEach): a cheaper way to read repos (their web pages, via the server); null entries fall back to the API.
export async function readGitHub(login, { api, raw, details = null, rooms = [], step = () => {} }) {
  step('user');
  const u = await api(`/users/${encodeURIComponent(login)}`);
  if (u.status === 404) throw new GitHubError(404, `No GitHub user called @${login}.`, { code: 'not-found' });
  if (!u.ok || !u.data) throw new GitHubError(502, "GitHub didn't answer properly. Try again in a moment.", { code: 'down' });
  const user = u.data;
  if (user.type === 'Organization') throw new GitHubError(422, `@${user.login} is an organization. GitRoom builds houses for people.`, { code: 'org' });

  step('repos');
  const all = [];
  for (let page = 1; page <= 2; page++) {
    const r = await api(`/users/${user.login}/repos?type=owner&sort=pushed&per_page=100&page=${page}`);
    if (!r.ok || !Array.isArray(r.data)) break;
    all.push(...r.data);
    if (r.data.length < 100) break;
  }
  const repos = all.filter(r => !r.fork).map(trim);
  const profileRepo = repos.find(r => r.name.toLowerCase() === user.login.toLowerCase());

  const picked = rooms.map(n => repos.find(r => r.name.toLowerCase() === String(n).toLowerCase())).filter(Boolean);
  const detailed = [...new Set([...picked, ...rank(repos, user.login).filter(r => r.size > 0 || repos.length < ROOMS)])].slice(0, Math.max(ROOMS, Math.min(MAX_DETAILED, picked.length)));
  step('rooms', detailed.length);
  let done = 0;
  const cheap = details ? await details(user.login, detailed, () => step('room', ++done)).catch(() => []) : [];
  const info = await pool(detailed, 6, async (r, i) => {
    if (cheap[i]) return cheap[i];
    const d = await readRepoApi(api, raw, user.login, r);
    if (!details) step('room', ++done);
    return d;
  });
  detailed.forEach((r, i) => Object.assign(r, info[i], { detailed: true }));

  return {
    user: {
      login: user.login, name: user.name || '', bio: user.bio || '', createdAt: user.created_at, followers: user.followers || 0,
      following: user.following || 0, publicRepos: user.public_repos || 0, avatar: user.avatar_url || '',
    },
    repos,
    profileRepo: profileRepo ? { branch: profileRepo.branch } : null,
  };
}

// One more repo, for an owner who gives a room to a repo GitRoom didn't count at first.
export async function readOneRepo(login, repo, { api, raw }) {
  return readRepoApi(api, raw, login, repo);
}

// The newest house file in <login>/<login>/.gitroom, or null.
export const HOUSE_FILE = /^house-\d{8}-\d{6}\.json$/;
export async function readHouseFile(login, { api, fetchText }) {
  const r = await api(`/repos/${login}/${login}/contents/.gitroom`);
  if (!r.ok || !Array.isArray(r.data)) return null;
  const newest = r.data.filter(f => f.type === 'file' && HOUSE_FILE.test(f.name)).sort((a, b) => (a.name < b.name ? 1 : -1))[0];
  if (!newest || !newest.download_url) return null;
  const text = await fetchText(newest.download_url);
  if (!text) return null;
  // the download link names the branch the file lives on, which is where the next file gets committed too
  const branch = (/^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/([^/]+)\//.exec(newest.download_url) || [])[1] || null;
  try { return { file: newest.name, data: JSON.parse(text), branch: branch && decodeURIComponent(branch) }; } catch (e) { return null; }
}
