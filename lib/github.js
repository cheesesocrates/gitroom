// Server-only GitHub access. A handful of GraphQL calls build a whole house; achievements come from the public profile page.
import { execFileSync } from 'node:child_process';

export class GitHubError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// The app's own token reads public data. In development we borrow the GitHub CLI's token so `npm run dev` just works.
let cliToken;
export function serverToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.NODE_ENV !== 'production') {
    if (cliToken === undefined) {
      try { cliToken = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).trim() || null; } catch (e) { cliToken = null; }
    }
    return cliToken;
  }
  return null;
}

const SLOW = 'GitHub took too long to answer. Try again in a moment.';
const LIMIT = 'GitHub rate limit reached. Try again in a few minutes.';

export async function gql(query, variables, token, ms = 20000) {
  let res;
  try {
    res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'gitroom' },
      body: JSON.stringify({ query, variables }),
      cache: 'no-store',
      signal: AbortSignal.timeout(ms),
    });
  } catch (e) {
    throw new GitHubError(504, SLOW);
  }
  if (res.status === 401) throw new GitHubError(401, 'GitHub rejected the token.');
  if (res.status === 403 || res.status === 429) throw new GitHubError(429, LIMIT);
  // GitHub answers a query that ran past its own time limit with an HTML 502 page
  if (res.status >= 500) throw new GitHubError(504, SLOW);
  const json = await res.json().catch(() => null);
  if (!json) throw new GitHubError(502, 'GitHub sent an unreadable response.');
  if (json.errors && !json.data) {
    const limited = json.errors.some(e => e.type === 'RATE_LIMITED');
    throw new GitHubError(limited ? 429 : 502, limited ? LIMIT : json.errors[0].message);
  }
  return json;
}

const Q_USER = `query($login: String!) {
  user(login: $login) {
    id login name bio createdAt location followers { totalCount } following { totalCount }
    contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { contributionCount weekday } } } }
  }
}`;

// Only cheap fields here. Commit totals and language breakdowns for a hundred repos in one query run past GitHub's
// ten-second limit on busy accounts, so totals come in small batches and languages only for the repos that get rooms.
const Q_REPOS = `query($login: String!, $cursor: String, $privacy: RepositoryPrivacy) {
  user(login: $login) {
    repositories(first: 100, after: $cursor, ownerAffiliations: OWNER, isFork: false, privacy: $privacy, orderBy: { field: PUSHED_AT, direction: DESC }) {
      pageInfo { hasNextPage endCursor }
      nodes { name isPrivate diskUsage pushedAt stargazerCount primaryLanguage { name color } }
    }
  }
}`;

// Files that tell us which frameworks live in a repo.
export const MANIFESTS = {
  pkg: 'package.json', req: 'requirements.txt', pyp: 'pyproject.toml', pipf: 'Pipfile', gomod: 'go.mod', cargo: 'Cargo.toml',
  comp: 'composer.json', gem: 'Gemfile', pub: 'pubspec.yaml', pom: 'pom.xml', gradle: 'build.gradle',
  fpkg: 'frontend/package.json', cpkg: 'client/package.json', wpkg: 'web/package.json', spkg: 'server/package.json', bpkg: 'backend/package.json', breq: 'backend/requirements.txt',
};

function detailsQuery(owner, names) {
  const files = Object.entries(MANIFESTS).map(([k, p]) => `${k}: object(expression: ${JSON.stringify('HEAD:' + p)}) { ... on Blob { text } }`).join('\n');
  const parts = names.map((n, i) => `r${i}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(n)}) {
    languages(first: 6, orderBy: { field: SIZE, direction: DESC }) { totalSize edges { size node { name color } } }
    root: object(expression: "HEAD:") { ... on Tree { entries { name type } } }
    wf: object(expression: "HEAD:.github/workflows") { ... on Tree { entries { name } } }
    copilot: object(expression: "HEAD:.github/copilot-instructions.md") { ... on Blob { byteSize } }
    ${files}
  }`);
  return `query { ${parts.join('\n')} }`;
}

const historyOf = r => (r && r.defaultBranchRef && r.defaultBranchRef.target && r.defaultBranchRef.target.history ? r.defaultBranchRef.target.history.totalCount : 0);
const totalOf = r => r.total || 0;

// Runs async jobs a few at a time, so a big account doesn't fire twenty queries at GitHub at once.
async function pool(items, size, fn) {
  const queue = items.slice();
  await Promise.all(Array.from({ length: Math.min(size, queue.length) }, async () => { while (queue.length) await fn(queue.shift()); }));
}

// Every repo's total commit count (everyone's commits), twenty repos per query; a batch that times out is split in half and retried.
async function fillTotals(owner, repos, token) {
  const ask = async list => {
    const q = `query { ${list.map((r, i) => `r${i}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(r.name)}) { defaultBranchRef { target { ... on Commit { history { totalCount } } } } }`).join('\n')} }`;
    try {
      const d = await gql(q, {}, token, 12000);
      list.forEach((r, i) => { r.total = historyOf(d.data && d.data[`r${i}`]); });
    } catch (e) {
      if (list.length === 1) { list[0].total = 0; return; }
      await ask(list.slice(0, Math.ceil(list.length / 2)));
      await ask(list.slice(Math.ceil(list.length / 2)));
    }
  };
  const batches = [];
  for (let i = 0; i < repos.length; i += 20) batches.push(repos.slice(i, i + 20));
  await pool(batches, 4, ask);
}

// ---------- your commits per repo ----------
// GraphQL counts your commits fast on ordinary repos and very slowly on giant ones, so giants go to commit search instead.
const GIANT = 50000;
async function searchCount(owner, repo, login, token) {
  const q = encodeURIComponent(`repo:${owner}/${repo} author:${login}`);
  const res = await fetch(`https://api.github.com/search/commits?q=${q}&per_page=1`, {
    headers: { Authorization: `bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'gitroom' },
    cache: 'no-store', signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new GitHubError(res.status, 'search failed');
  return (await res.json()).total_count;
}
async function graphCounts(owner, uid, list, token) {
  const q = `query($uid: ID!) { ${list.map((r, i) => `r${i}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(r.name)}) { defaultBranchRef { target { ... on Commit { history(author: { id: $uid }) { totalCount } } } } }`).join('\n')} }`;
  const d = await gql(q, { uid }, token, 12000);
  return list.map((r, i) => (d.data && d.data[`r${i}`] ? historyOf(d.data[`r${i}`]) : null));
}
// Counts only as many repos as it takes to know the top ten: your commits in a repo can't exceed its total,
// so once ten repos beat the next repo's total, nothing further down can get a room.
async function countCommits(owner, login, uid, repos, token) {
  const counts = new Map(), started = Date.now();
  const tenth = list => list.map(r => counts.get(r.name)).filter(v => v != null).sort((a, b) => b - a)[9] ?? -1;
  const sorted = repos.filter(r => totalOf(r) > 0).sort((a, b) => totalOf(b) - totalOf(a));
  const pub = repos.filter(r => !r.isPrivate);
  while (Date.now() - started < 25000) {
    const tAll = tenth(repos), tPub = tenth(pub);
    const next = sorted.filter(r => !counts.has(r.name) && (totalOf(r) > tAll || (!r.isPrivate && totalOf(r) > tPub))).slice(0, 20);
    if (!next.length) break;
    const giants = next.filter(r => totalOf(r) > GIANT), small = next.filter(r => totalOf(r) <= GIANT);
    const batches = [small.slice(0, 10), small.slice(10)].filter(b => b.length);
    await Promise.all([
      ...giants.map(r => searchCount(owner, r.name, login, token).then(n => counts.set(r.name, n), () => counts.set(r.name, totalOf(r)))),
      ...batches.map(b => graphCounts(owner, uid, b, token)
        .then(v => b.forEach((r, k) => counts.set(r.name, v[k] ?? totalOf(r))))
        // a batch that times out is retried repo by repo, and a repo that still won't count is looked up by search
        .catch(() => Promise.all(b.map(r => graphCounts(owner, uid, [r], token)
          .then(v => counts.set(r.name, v[0] ?? totalOf(r)))
          .catch(() => searchCount(owner, r.name, login, token).then(n => counts.set(r.name, n), () => counts.set(r.name, totalOf(r)))))))),
    ]);
  }
  return counts;
}

// Everything GitRoom needs about one person. `token` is either the app token (public data only) or the owner's own token.
export async function fetchUser(login, { token, includePrivate = false } = {}) {
  if (!token) {
    throw new GitHubError(503, process.env.NODE_ENV === 'production'
      ? "This GitRoom server has no GitHub token yet. Its owner needs to set GITHUB_TOKEN."
      : 'No GitHub token configured. Set GITHUB_TOKEN or sign in to the GitHub CLI.');
  }
  const privacy = includePrivate ? null : 'PUBLIC';
  const [u, first] = await Promise.all([gql(Q_USER, { login }, token), gql(Q_REPOS, { login, cursor: null, privacy }, token)]);
  const user = u.data && u.data.user;
  if (!user) throw new GitHubError(404, `No GitHub user called @${login}. Organizations don't get houses yet.`);
  const calendar = user.contributionsCollection && user.contributionsCollection.contributionCalendar;
  const repos = [];
  let page = first.data && first.data.user && first.data.user.repositories;
  if (page) repos.push(...page.nodes.filter(Boolean));
  if (page && page.pageInfo.hasNextPage) {
    const more = await gql(Q_REPOS, { login, cursor: page.pageInfo.endCursor, privacy }, token);
    page = more.data && more.data.user && more.data.user.repositories;
    if (page) repos.push(...page.nodes.filter(Boolean));
  }
  await fillTotals(user.login, repos, token);
  const counts = await countCommits(user.login, user.login, user.id, repos, token);
  // repos never counted are the small ones; their total is a fair stand-in for your share
  const commitsOf = r => (counts.has(r.name) ? counts.get(r.name) : totalOf(r));
  const busiest = list => list.slice().sort((a, b) => commitsOf(b) - commitsOf(a) || (b.pushedAt > a.pushedAt ? 1 : -1)).slice(0, 10);
  const top = [...new Set([...busiest(repos), ...busiest(repos.filter(r => !r.isPrivate))])];
  // manifests and language breakdowns for the repos that get rooms, five repos per query
  const details = {}, groups = [];
  for (let i = 0; i < top.length; i += 5) groups.push(top.slice(i, i + 5));
  await pool(groups, 4, async group => {
    const d = await gql(detailsQuery(user.login, group.map(r => r.name)), {}, token, 15000).catch(() => ({ data: null }));
    group.forEach((r, i) => { details[r.name] = (d.data && d.data[`r${i}`]) || null; });
  });
  // everyone else gets their main language as a one-colour breakdown
  repos.forEach(r => {
    const d = details[r.name];
    r.languages = d && d.languages ? d.languages : { totalSize: r.primaryLanguage ? 1 : 0, edges: r.primaryLanguage ? [{ size: 1, node: r.primaryLanguage }] : [] };
  });
  return { user, repos, calendar, details, commitsOf };
}

// GitHub doesn't put achievements in the API, so we read them off the public profile page.
export async function fetchAchievements(login) {
  try {
    const res = await fetch(`https://github.com/${encodeURIComponent(login)}?tab=achievements`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; gitroom)', Accept: 'text/html' }, cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const names = [...html.matchAll(/alt="Achievement: ([^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim());
    return [...new Set(names)];
  } catch (e) {
    return [];
  }
}
