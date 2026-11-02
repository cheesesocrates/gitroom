// Browser side of GitRoom's data: where a house comes from (fastest first), and how an owner connects and publishes.
// Houses: this browser's cache → the server (shared CDN cache) → a bundled snapshot → built right here from GitHub.
// Nothing here needs a token: the browser's own visits to GitHub's public API are free (60 an hour per network).
import { createGitHub, readGitHub, readOneRepo, readHouseFile, GitHubError, VALID_LOGIN } from './github-rest.js';
import { buildProfile, addRepoDetails } from './analyze.js';
import { cleanSettings, houseFileText, commitURL, createRepoURL, newFileName, DIR } from './settings.js';
import { RULES, EXTRA, castMeta } from './detect.js';

export { VALID_LOGIN, createRepoURL, castMeta };

// everyone an owner can add to a room: the hand-drawn cast plus every placeholder resident
export function castList() {
  const S = (window.PX && window.PX.SPR) || {};
  return [...Object.keys(RULES).filter(id => S[id]).map(id => ({ id, name: S[id].name })), ...Object.entries(EXTRA).map(([id, e]) => ({ id, name: e.name }))]
    .sort((a, b) => a.name.localeCompare(b.name));
}
export const FEATURED = ['karpathy', 'torvalds', 'gaearon', 'yyx990803', 'shadcn', 'cheesesocrates'];

const TTL = 6 * 3600e3;
const gh = createGitHub((url, init) => fetch(url, init));
const ls = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { prune(); try { localStorage.setItem(k, JSON.stringify(v)); } catch (e2) { /* full or private mode */ } } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* private mode */ } },
};
// keep only the newest few cached houses when storage fills up
function prune() {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('gitroom:h:'));
    keys.map(k => [k, (ls.get(k) || {}).t || 0]).sort((a, b) => a[1] - b[1]).slice(0, Math.max(1, keys.length - 8)).forEach(([k]) => localStorage.removeItem(k));
  } catch (e) { /* nothing to prune */ }
}
const houseKey = login => 'gitroom:h:' + login.toLowerCase();

async function getJSON(url) {
  const res = await fetch(url, { cache: 'no-store' });
  return { res, body: await res.json().catch(() => null) };
}

// remembers when GitHub told this browser to wait, so the next house doesn't ask again before then
const RL = 'gitroom:rl';
const limited = () => { const r = ls.get(RL); return r && r > Date.now() ? r : 0; };
const markLimited = until => ls.set(RL, until || Date.now() + 10 * 60e3);

// ---------- the owner's house file ----------
export async function loadSettings(login) {
  const local = ls.get('gitroom:pub:' + login.toLowerCase());
  let remote = null;
  // the server first (one cached answer for everyone); it can be out of GitHub quota while this browser isn't
  try {
    const { res, body } = await getJSON(`/api/settings/${encodeURIComponent(login.toLowerCase())}`);
    if (res.ok && body) remote = { settings: body.settings, file: body.file, branch: body.branch || null };
  } catch (e) { /* offline: fall through */ }
  if (!remote && !limited()) {
    try {
      const hit = await readHouseFile(login, { api: gh.api, fetchText: url => fetch(url).then(r => (r.ok ? r.text() : null)).catch(() => null) });
      remote = hit ? { settings: cleanSettings(hit.data), file: hit.file, branch: hit.branch } : { settings: null, file: null };
    } catch (e) {
      if (e.code === 'rate') markLimited(e.reset);
    }
  }
  // right after publishing, this browser knows the new file before GitHub's caches do
  if (local && local.file && (!remote || !remote.file || local.file > remote.file) && Date.now() - local.t < 30 * 60e3) return { settings: local.settings, file: local.file, branch: local.branch || null };
  return remote || { settings: null, file: null };
}

// ---------- houses ----------
async function loadPage(login) {
  let achievements = [];
  try {
    const { res, body } = await getJSON(`/api/page/${encodeURIComponent(login.toLowerCase())}`);
    if (res.ok && body) { achievements = body.achievements || []; if (body.calendar) return body; }
  } catch (e) { /* try the public mirror */ }
  try {
    const r = await fetch(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(login)}?y=last`);
    const j = await r.json();
    if (Array.isArray(j.contributions)) return { calendar: { total: (j.total && j.total.lastYear) || 0, days: j.contributions.map(d => ({ date: d.date, count: d.count })) }, achievements };
  } catch (e) { /* no calendar: the rug just stays plain */ }
  return { calendar: null, achievements };
}

// Repo details from the server, which reads the repos' public web pages (no API quota); the builder falls back to the
// API for any it doesn't get. Sorted, so the same house always asks with the same URL and hits the CDN.
async function serverDetails(owner, list, onEach) {
  const q = list.map(r => `${r.name}:${r.language || ''}`).sort().join(',');
  let got = {};
  try {
    const { res, body } = await getJSON(`/api/repos/${encodeURIComponent(owner.toLowerCase())}?r=${encodeURIComponent(q)}`);
    if (res.ok && body && body.repos) got = body.repos;
  } catch (e) { /* the API fallback takes over */ }
  return list.map(r => { if (got[r.name]) { onEach(); return got[r.name]; } return null; });
}

// step(name, n): 'server' | 'browser' | 'user' | 'repos' | 'rooms' (n repos) | 'room' (n done)
export async function loadHouse(login, { step = () => {}, rooms = Promise.resolve([]), fresh = false } = {}) {
  if (!VALID_LOGIN.test(login)) throw new GitHubError(400, "That isn't a valid GitHub username.", { code: 'invalid' });
  const key = houseKey(login);
  const hit = ls.get(key);
  if (!fresh && hit && hit.p && hit.p.v === 2 && Date.now() - hit.t < TTL) return { profile: hit.p, source: 'cache' };

  // the server's answer is usually already at the CDN; when it isn't, the server may be out of quota, and then we carry on
  step('server');
  try {
    const { res, body } = await getJSON(`/api/house/${encodeURIComponent(login.toLowerCase())}`);
    if (res.ok && body && body.profile) { ls.set(key, { t: Date.now(), p: body.profile }); return { profile: body.profile, source: 'server' }; }
    if (body && ['not-found', 'org', 'invalid'].includes(body.code)) throw new GitHubError(res.status, body.error, { code: body.code });
  } catch (e) {
    if (e instanceof GitHubError) throw e;
  }

  if (FEATURED.includes(login.toLowerCase())) {
    try {
      const r = await fetch(`/featured/${login.toLowerCase()}.json`);
      if (r.ok) { const p = await r.json(); return { profile: p, source: 'snapshot' }; }
    } catch (e) { /* build it instead */ }
  }

  // an old copy beats nothing when GitHub says wait
  const wait = limited();
  if (wait) {
    if (hit && hit.p && hit.p.v === 2) return { profile: hit.p, source: 'stale' };
    throw new GitHubError(429, 'GitHub needs a short breather.', { code: 'rate', reset: wait });
  }
  step('browser');
  try {
    const [g, page] = await Promise.all([readGitHub(login, { ...gh, details: serverDetails, rooms: await rooms, step }), loadPage(login)]);
    const profile = buildProfile(g, page);
    ls.set(key, { t: Date.now(), p: profile });
    return { profile, source: 'browser' };
  } catch (e) {
    if (e.code === 'rate') {
      markLimited(e.reset);
      if (hit && hit.p && hit.p.v === 2) return { profile: hit.p, source: 'stale' };
    }
    throw e;
  }
}

// counts and furnishes a repo the owner gave a room to
export async function loadRepo(profile, name) {
  const r = profile.repos.find(x => x.id === name);
  if (!r || r.detailed) return profile;
  const repo = { name: r.name, size: r.sizeKB, language: r.main === 'Text' ? null : r.main };
  const info = (await serverDetails(profile.handle, [repo], () => {}))[0] || await readOneRepo(profile.handle, repo, gh);
  addRepoDetails(profile, name, info, r.main);
  const key = houseKey(profile.handle), hit = ls.get(key);
  if (hit) ls.set(key, { t: hit.t, p: profile });
  return profile;
}

// ---------- connecting: proving it's your house without a password ----------
// This browser keeps a random secret; its hash goes into the house file the owner commits. Only someone who can
// push to <login>/<login> can put it there, so a browser whose hash is in the newest file is the owner's.
const secretKey = login => 'gitroom:key:' + login.toLowerCase();
async function sha(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
}
function secret(login, create) {
  let s = ls.get(secretKey(login));
  if (!s && create) { s = [...crypto.getRandomValues(new Uint8Array(24))].map(b => b.toString(16).padStart(2, '0')).join(''); ls.set(secretKey(login), s); }
  return s;
}
export async function isOwner(login, settings) {
  const s = secret(login, false);
  return !!(s && settings && Array.isArray(settings.keys) && settings.keys.includes(await sha(s)));
}

// the commit link for the owner's next house file, plus what to watch for once they've committed it
export async function prepareCommit(login, settings, branch) {
  const hash = await sha(secret(login, true));
  const keys = [...new Set([...((settings && settings.keys) || []), hash])].slice(-8);
  const next = cleanSettings({ ...(settings || {}), keys });
  const file = newFileName(), text = houseFileText(next, login), br = branch || 'main';
  return { url: commitURL(login, br, file, text), file, branch: br, settings: next, path: `${DIR}/${file}` };
}

// waits for the committed file to show up on raw.githubusercontent.com (a brand-new path, so no stale cache)
export function watchCommit(login, job, { onFound, every = 3000, limit = 15 * 60e3 }) {
  let stopped = false, timer = 0;
  const started = Date.now();
  const url = `https://raw.githubusercontent.com/${login}/${login}/${encodeURIComponent(job.branch)}/${DIR}/${job.file}`;
  const tick = async () => {
    if (stopped) return;
    try {
      const r = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
      if (r.ok) {
        const settings = cleanSettings(JSON.parse(await r.text()));
        ls.set('gitroom:pub:' + login.toLowerCase(), { t: Date.now(), file: job.file, settings, branch: job.branch });
        stopped = true; onFound(settings);
        return;
      }
    } catch (e) { /* not there yet */ }
    if (Date.now() - started < limit) timer = setTimeout(tick, every);
  };
  tick();
  return { stop() { stopped = true; clearTimeout(timer); }, now() { clearTimeout(timer); tick(); } };
}

// unpublished edits survive a reload
const draftKey = login => 'gitroom:draft:' + login.toLowerCase();
export const getDraft = login => ls.get(draftKey(login));
export const setDraft = (login, d) => (d ? ls.set(draftKey(login), d) : ls.del(draftKey(login)));
export const forgetHouse = login => ls.del(houseKey(login));
export { GitHubError, cleanSettings };
