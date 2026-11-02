// Turns what GitHub told us into the profile the house engine draws. Runs on the server and in the browser.
import { castMeta, isAI } from './detect.js';
import { langColor } from './langs.js';

export const BADGE_KEYS = {
  'Pull Shark': 'shark', Starstruck: 'star', Quickdraw: 'quick', 'Galaxy Brain': 'galaxy', YOLO: 'yolo', 'Pair Extraordinaire': 'pair',
  'Arctic Code Vault Contributor': 'arctic', 'Public Sponsor': 'sponsor', 'Heart On Your Sleeve': 'heart', 'Open Sourcerer': 'oss', 'Mars 2020 Contributor': 'mars',
};
const BADGE_NOTES = {
  shark: 'Opened pull requests that got merged', star: 'Made a repository with lots of stars', quick: 'Closed an issue or pull request within five minutes',
  galaxy: 'Answered discussions that got accepted', yolo: 'Merged a pull request without a review', pair: 'Co-authored merged pull requests',
  arctic: 'Has code in the 2020 GitHub Archive Program', sponsor: 'Sponsors open source work', heart: 'Reacted with a heart on GitHub',
  oss: 'Had pull requests merged in several repos', mars: 'Contributed code used on the Mars 2020 mission',
};
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const hash = s => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
export function fgFor(hex) {
  const n = parseInt((hex || '#888888').slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 165 ? '#2a2400' : '#ffffff';
}
// long bios end on a whole word: "…accounts that have…", not "…accounts that ha"
function clip(s, max) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max + 1), sp = cut.search(/\s+\S*$/);
  return (sp > max / 2 ? cut.slice(0, sp) : s.slice(0, max - 1)).replace(/[\s,;:.·-]+$/, '') + '…';
}

// "cheesesocrates" → "Cheese Cabin": long handles are cut before a consonant, as close to six letters as possible
function houseName(login) {
  const words = login.split(/[-_.\d]+|(?<=[a-z])(?=[A-Z])/).filter(w => w.length > 2).sort((a, b) => b.length - a.length);
  let w = words[0] || login;
  if (w.length > 10) {
    let cut = 8;
    for (let i = 4; i <= 8; i++) if (!/[aeiouy]/i.test(w[i]) && Math.abs(i - 6) < Math.abs(cut - 6)) cut = i;
    w = w.slice(0, cut);
  }
  const suffix = ['Manor', 'Cottage', 'Den', 'Lodge', 'Burrow', 'Studio', 'Villa', 'Hideout', 'Cabin', 'Nook'][hash(login) % 10];
  return `${w[0].toUpperCase()}${w.slice(1).toLowerCase()} ${suffix}`;
}

// cal: { total, days: [{ date, count }] } oldest first
function calendarOf(cal) {
  if (!cal || !cal.days || !cal.days.length) return { levels: '', total: 0, days: 0, longest: 0, busiest: '-', current: 0 };
  const days = cal.days.map(d => ({ count: d.count, weekday: new Date(d.date + 'T00:00:00Z').getUTCDay() }));
  const lv = c => (c === 0 ? '0' : c < 3 ? '1' : c < 6 ? '2' : c < 10 ? '3' : '4');
  // pad to whole Sunday-to-Saturday weeks so the rug lines up
  const levels = '0'.repeat(days[0].weekday) + days.map(d => lv(d.count)).join('') + '0'.repeat(6 - days[days.length - 1].weekday);
  let longest = 0, run = 0;
  days.forEach(d => { run = d.count > 0 ? run + 1 : 0; longest = Math.max(longest, run); });
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) { if (days[i].count > 0) current++; else if (i < days.length - 1) break; }
  const byDay = [0, 0, 0, 0, 0, 0, 0];
  days.forEach(d => { byDay[d.weekday] += d.count; });
  const best = byDay.indexOf(Math.max(...byDay));
  return { levels, total: cal.total || 0, days: days.filter(d => d.count > 0).length, longest, current, busiest: byDay[best] ? DAYS[best] : '-' };
}

// the most impressive thing about you, biggest first
function titleOf({ cal, stars, langs, years, repos, followers }) {
  if (followers >= 100000) return 'GITHUB LEGEND';
  if (stars >= 50000) return 'SUPERSTAR';
  if (stars >= 1000) return 'STAR COLLECTOR';
  if (cal.longest >= 100) return 'UNSTOPPABLE';
  if (followers >= 1000) return 'FAN FAVORITE';
  if (cal.longest >= 30) return 'STREAK MACHINE';
  if (cal.total >= 1500) return 'SHIPPING MACHINE';
  if (stars >= 500) return 'RISING STAR';
  if (langs >= 7) return 'POLYGLOT';
  if (years >= 8) return 'GITHUB VETERAN';
  if (years < 1) return 'FRESH FACE';
  if (repos >= 30) return 'REPO HOARDER';
  return 'HOUSE BUILDER';
}

// gh: from readGitHub · page: { calendar, achievements } from the profile pages (either may be missing)
export function buildProfile(gh, page = {}) {
  const { user, repos } = gh;
  const cast = {};
  const out = repos.map(r => {
    const color = langColor(r.language), found = r.found || [];
    found.forEach(id => { if (!cast[id]) { const m = castMeta(id, r.language); if (m) cast[id] = m; } });
    return {
      id: r.name, name: r.name, commits: r.detailed ? r.commits || 0 : null, sizeKB: r.size || 0, pushed: (r.pushed || '').slice(0, 7), stars: r.stars || 0,
      langs: r.language ? [[r.language, 100]] : [], main: r.language || 'Text', color, fg: fgFor(color),
      fw: found.filter(id => !isAI(id)), ai: found.filter(isAI), detailed: !!r.detailed, desc: r.description || '',
    };
  });
  const cal = calendarOf(page.calendar);
  const since = +String(user.createdAt || new Date().toISOString()).slice(0, 4);
  const years = new Date().getFullYear() - since;
  const stars = out.reduce((a, r) => a + r.stars, 0);
  const title = titleOf({ cal, stars, langs: new Set(out.filter(r => r.detailed).map(r => r.main)).size, years, repos: out.length, followers: user.followers });
  const bio = (user.bio || '').replace(/\s+/g, ' ').trim();
  const subParts = [user.name || user.login, clip(bio, 60), `on GitHub since ${since}`].filter(Boolean);
  const badges = (page.achievements || []).map(name => {
    const key = BADGE_KEYS[name] || 'medal';
    return [key, BADGE_NOTES[key] || name, name];
  });
  return {
    v: 2, handle: user.login, name: user.name || user.login, bio, sub: subParts.join(' · '), chip: `★ ${title}`, title,
    house: houseName(user.login), followers: user.followers, following: user.following, avatar: user.avatar, seed: hash(user.login) % 1000000,
    repos: out, cal: { ...cal, since }, badges, cast, profileRepo: gh.profileRepo || null, fetchedAt: new Date().toISOString(),
  };
}

// folds a freshly counted repo into a profile (an owner gave it a room)
export function addRepoDetails(profile, name, info, language) {
  const r = profile.repos.find(x => x.id === name);
  if (!r) return profile;
  const found = info.found || [];
  found.forEach(id => { if (!profile.cast[id]) { const m = castMeta(id, language || r.main); if (m) profile.cast[id] = m; } });
  Object.assign(r, { commits: info.commits || 0, fw: found.filter(id => !isAI(id)), ai: found.filter(isAI), detailed: true });
  return profile;
}
