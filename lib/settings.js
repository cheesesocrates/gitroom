// What a house owner can change for everyone, and nothing else.
import { RULES } from './detect.js';

const PAPERS = ['teal', 'rose', 'lav', 'sun', 'mint', 'night', 'gold'];
const PETS = ['none', 'cat', 'dog', 'frog', 'dragon'];
const LIGHTS = ['auto', 'day', 'sunset', 'night'];
export const BONUS = ['fame', 'observatory', 'lounge', 'lab', 'arcade', 'kitchen', 'greenhouse'];
const ID = /^[\w.-]{1,100}$/;
const isPrivateId = id => id.startsWith('p_');

export function cleanSettings(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  if (typeof s.name === 'string') { const n = s.name.replace(/[^\w '&.-]/g, '').trim().slice(0, 18); if (n) out.name = n; }
  if (PAPERS.includes(s.paper)) out.paper = s.paper;
  if (PETS.includes(s.pet)) out.pet = s.pet;
  if (LIGHTS.includes(s.light)) out.light = s.light;
  if (typeof s.tags === 'boolean') out.tags = s.tags;
  if (Number.isInteger(s.layout) && s.layout >= 0 && s.layout < 100000) out.layout = s.layout;
  // rooms: which repos get a room (up to ten); null means "my ten busiest"
  if (Array.isArray(s.rooms)) out.rooms = [...new Set(s.rooms.filter(id => typeof id === 'string' && ID.test(id)))].slice(0, 10);
  if (Array.isArray(s.bonus)) out.bonus = [...new Set(s.bonus.filter(id => BONUS.includes(id)))];
  // fixes: residents the detector got wrong, per repo
  if (s.fixes && typeof s.fixes === 'object') {
    const ok = list => (Array.isArray(list) ? [...new Set(list.filter(id => typeof id === 'string' && RULES[id]))].slice(0, 30) : []);
    const fixes = {};
    Object.entries(s.fixes).slice(0, 40).forEach(([repo, f]) => {
      if (!ID.test(repo) || !f || typeof f !== 'object') return;
      const add = ok(f.add), remove = ok(f.remove);
      if (add.length || remove.length) fixes[repo] = { add, remove };
    });
    out.fixes = fixes;
  }
  out.at = new Date().toISOString();
  return out;
}

// Visitors get the owner's choices without anything that points at a private repo.
export function publicSettings(s) {
  if (!s) return null;
  const out = { ...s };
  if (out.rooms) out.rooms = out.rooms.filter(id => !isPrivateId(id));
  if (out.fixes) out.fixes = Object.fromEntries(Object.entries(out.fixes).filter(([id]) => !isPrivateId(id)));
  return out;
}
