// What a house owner can change, saved as a small JSON file in their own GitHub profile repo (<login>/<login>/.gitroom/).
// Only people who can push to that repo can change it, so GitHub itself decides who owns a house: no accounts, no tokens.
// The file comes from someone else's repo, so everything in it is checked before the house uses it.
import { RULES, EXTRA, LANG } from './detect.js';

export const PAPERS = ['teal', 'rose', 'lav', 'sun', 'mint', 'night', 'gold'];
export const PETS = ['none', 'cat', 'dog', 'frog', 'dragon'];
export const LIGHTS = ['auto', 'day', 'sunset', 'night'];
export const BONUS = ['fame', 'observatory', 'lounge', 'lab', 'arcade', 'kitchen', 'greenhouse'];
export const DIR = '.gitroom';
const ID = /^[\w.-]{1,100}$/;
const KEY = /^[a-f0-9]{24}$/;
const resident = id => typeof id === 'string' && (RULES[id] || EXTRA[id] || (id.startsWith(LANG) && /^[a-z0-9-]{1,40}$/.test(id.slice(LANG.length))));

export function cleanSettings(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  if (typeof s.name === 'string') { const n = s.name.replace(/[^\w '&.-]/g, '').trim().slice(0, 18); if (n) out.name = n; }
  if (PAPERS.includes(s.paper)) out.paper = s.paper;
  if (PETS.includes(s.pet)) out.pet = s.pet;
  if (LIGHTS.includes(s.light)) out.light = s.light;
  if (typeof s.tags === 'boolean') out.tags = s.tags;
  if (Number.isInteger(s.layout) && s.layout >= 0 && s.layout < 100000) out.layout = s.layout;
  // rooms: which repos get a room (up to ten); left out means "my ten busiest"
  if (Array.isArray(s.rooms)) { const r = [...new Set(s.rooms.filter(id => typeof id === 'string' && ID.test(id)))].slice(0, 10); if (r.length) out.rooms = r; }
  if (Array.isArray(s.bonus)) out.bonus = [...new Set(s.bonus.filter(id => BONUS.includes(id)))];
  // fixes: residents the detector got wrong, per repo
  if (s.fixes && typeof s.fixes === 'object' && !Array.isArray(s.fixes)) {
    const ok = list => (Array.isArray(list) ? [...new Set(list.filter(resident))].slice(0, 30) : []);
    const fixes = {};
    Object.entries(s.fixes).slice(0, 40).forEach(([repo, f]) => {
      if (!ID.test(repo) || !f || typeof f !== 'object') return;
      const add = ok(f.add), remove = ok(f.remove);
      if (add.length || remove.length) fixes[repo] = { add, remove };
    });
    if (Object.keys(fixes).length) out.fixes = fixes;
  }
  // keys: hashes of the secrets kept by the browsers the owner connected from; they unlock the editor there
  if (Array.isArray(s.keys)) { const k = [...new Set(s.keys.filter(x => typeof x === 'string' && KEY.test(x)))].slice(-8); if (k.length) out.keys = k; }
  return out;
}

const two = n => String(n).padStart(2, '0');
// house-20261102-153012.json: newest sorts last, and no characters Windows can't check out
export function newFileName(d = new Date()) {
  return `house-${d.getUTCFullYear()}${two(d.getUTCMonth() + 1)}${two(d.getUTCDate())}-${two(d.getUTCHours())}${two(d.getUTCMinutes())}${two(d.getUTCSeconds())}.json`;
}

// The file the owner commits. Pretty-printed, because people will read it on GitHub.
export function houseFileText(settings, login) {
  const s = cleanSettings(settings);
  const body = { gitroom: 1, house: login, about: `GitRoom house settings for @${login}. Only the newest file in ${DIR}/ counts.`, ...s };
  return JSON.stringify(body, null, 2) + '\n';
}

// GitHub's own "new file" page, filled in and ready to commit
export function commitURL(login, branch, fileName, text) {
  return `https://github.com/${login}/${login}/new/${encodeURIComponent(branch || 'main')}?filename=${encodeURIComponent(`${DIR}/${fileName}`)}&value=${encodeURIComponent(text)}`;
}
export const createRepoURL = login => `https://github.com/new?name=${encodeURIComponent(login)}&description=${encodeURIComponent('My GitHub profile (and my GitRoom house)')}&visibility=public`;
