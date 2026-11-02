// Server only: the contribution calendar and achievements, read off GitHub's public profile pages.
// These are plain web pages, not the API, so they don't use up the API's free quota (and need no token).
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; GitRoom/2.0; +https://github.com/cheesesocrates/gitroom)', Accept: 'text/html' };
const CACHE = { next: { revalidate: 21600 } };

const unescape = s => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

async function html(url) {
  try {
    const res = await fetch(url, { headers: UA, ...CACHE, signal: AbortSignal.timeout(9000) });
    return res.ok ? await res.text() : null;
  } catch (e) {
    return null;
  }
}

// [{ date: '2026-01-31', count: 3 }], oldest first, plus the year's total
export function parseCalendar(page) {
  if (!page) return null;
  const counts = {};
  for (const m of page.matchAll(/<tool-tip[^>]*\sfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const n = /^\s*([\d,]+)\s+contribution/.exec(m[2]);
    counts[m[1]] = n ? +n[1].replace(/,/g, '') : 0;
  }
  const days = [];
  for (const m of page.matchAll(/<td\b[^>]*>/g)) {
    const tag = m[0], date = /data-date="(\d{4}-\d{2}-\d{2})"/.exec(tag), id = /\sid="([^"]+)"/.exec(tag), level = /data-level="(\d)"/.exec(tag);
    if (!date) continue;
    const count = id && counts[id[1]] != null ? counts[id[1]] : level && +level[1] > 0 ? +level[1] : 0;
    days.push({ date: date[1], count });
  }
  if (!days.length) return null;
  days.sort((a, b) => (a.date < b.date ? -1 : 1));
  const t = /([\d,]+)\s+contributions?\s+in the last year/.exec(page.replace(/\s+/g, ' '));
  return { total: t ? +t[1].replace(/,/g, '') : days.reduce((a, d) => a + d.count, 0), days };
}

export function parseAchievements(page) {
  if (!page) return [];
  return [...new Set([...page.matchAll(/alt="Achievement: ([^"]+)"/g)].map(m => unescape(m[1]).trim()))];
}

export async function readPage(login) {
  const [cal, ach] = await Promise.all([
    html(`https://github.com/users/${encodeURIComponent(login)}/contributions`),
    html(`https://github.com/${encodeURIComponent(login)}?tab=achievements`),
  ]);
  return { calendar: parseCalendar(cal), achievements: parseAchievements(ach) };
}
