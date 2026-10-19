// Turns raw GitHub data into the profile the house engine draws.
import { createHmac } from 'node:crypto';
import { detect, RULES } from './detect.js';
import { MANIFESTS } from './github.js';
import { sessionSecret } from './session.js';

// Private repos get an id that can't be turned back into their name, so owners can still pick and fix them.
function repoId(login, r) {
  if (!r.isPrivate) return r.name;
  const secret = sessionSecret();
  if (!secret) throw new Error('SESSION_SECRET is not set.');
  return 'p_' + createHmac('sha256', secret).update(`${login.toLowerCase()}/${r.name}`).digest('base64url').slice(0, 12);
}

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
function fgFor(hex) {
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

function calendarOf(cal) {
  if (!cal) return { levels: '', total: 0, days: 0, longest: 0, busiest: '-', current: 0 };
  const days = cal.weeks.flatMap(w => w.contributionDays);
  const lv = c => (c === 0 ? '0' : c < 3 ? '1' : c < 6 ? '2' : c < 10 ? '3' : '4');
  // pad to whole Sunday-to-Saturday weeks so the rug lines up
  const levels = '0'.repeat(days.length ? days[0].weekday : 0) + days.map(d => lv(d.contributionCount)).join('') + '0'.repeat(days.length ? 6 - days[days.length - 1].weekday : 0);
  let longest = 0, run = 0;
  days.forEach(d => { run = d.contributionCount > 0 ? run + 1 : 0; longest = Math.max(longest, run); });
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) { if (days[i].contributionCount > 0) current++; else if (i < days.length - 1) break; }
  const byDay = [0, 0, 0, 0, 0, 0, 0];
  days.forEach(d => { byDay[d.weekday] += d.contributionCount; });
  const best = byDay.indexOf(Math.max(...byDay));
  return { levels, total: cal.totalContributions, days: days.filter(d => d.contributionCount > 0).length, longest, current, busiest: byDay[best] ? DAYS[best] : '-' };
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

export function buildProfile(gh, achievements, { owner }) {
  const { user, repos, calendar, details, commitsOf } = gh;
  const out = repos.map(r => {
    const total = r.languages.totalSize || 0;
    const langs = r.languages.edges.slice(0, 4).map(e => [e.node.name, total ? Math.max(1, Math.round(e.size / total * 100)) : 0]);
    const color = (r.languages.edges[0] && r.languages.edges[0].node.color) || '#8a7fa8';
    const d = details[r.name];
    let fw = [], ai = [];
    if (d) {
      const manifests = {};
      Object.keys(MANIFESTS).forEach(k => { manifests[k] = d[k] && d[k].text; });
      const found = detect({ manifests, root: (d.root && d.root.entries) || [], workflows: ((d.wf && d.wf.entries) || []).length, copilot: !!d.copilot, langs: langs.map(l => l[0]) });
      fw = found.filter(id => !RULES[id].ai);
      ai = found.filter(id => RULES[id].ai);
    }
    return {
      id: repoId(user.login, r), name: r.isPrivate ? null : r.name, private: r.isPrivate, commits: commitsOf(r), sizeKB: r.diskUsage || 0, pushed: (r.pushedAt || '').slice(0, 7),
      stars: r.isPrivate ? 0 : r.stargazerCount, langs, main: langs[0] ? langs[0][0] : 'Text', color, fg: fgFor(color), fw, ai, other: [],
    };
  });
  const cal = calendarOf(calendar);
  const since = +user.createdAt.slice(0, 4);
  const years = new Date().getFullYear() - since;
  const pub = out.filter(r => !r.private);
  const stars = pub.reduce((a, r) => a + r.stars, 0);
  const title = titleOf({ cal, stars, langs: new Set(out.flatMap(r => r.langs.map(l => l[0]))).size, years, repos: pub.length, followers: user.followers.totalCount });
  const bio = (user.bio || '').replace(/\s+/g, ' ').trim();
  const subParts = [user.name || user.login, clip(bio, 60), `on GitHub since ${since}`].filter(Boolean);
  const badges = achievements.map(name => {
    const key = BADGE_KEYS[name] || 'medal';
    return [key, BADGE_NOTES[key] || name, name];
  });
  return {
    handle: user.login, name: user.name || user.login, sub: subParts.join(' · '), chip: owner ? '★ YOUR HOUSE' : `★ ${title}`, title,
    house: houseName(user.login), followers: user.followers.totalCount, seed: hash(user.login) % 1000000,
    repos: out, cal: { ...cal, since }, badges, owner: !!owner, fetchedAt: new Date().toISOString(),
  };
}
