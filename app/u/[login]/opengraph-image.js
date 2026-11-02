import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SITE } from '@/lib/site';

// The link preview for /u/<login>: their avatar and name on a card, with the cast hanging around the house.
export const alt = 'A GitRoom pixel house';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const VALID = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const asset = p => readFile(join(process.cwd(), 'assets', p));
const short = n => (n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M' : n >= 1e4 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'K' : n.toLocaleString('en-US'));

// one public API read per person per day (no token); if GitHub says no, the card just skips the numbers
async function user(login) {
  try {
    const r = await fetch(`https://api.github.com/users/${login}`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'GitRoom (+https://github.com/cheesesocrates/gitroom)' }, next: { revalidate: 86400 }, signal: AbortSignal.timeout(5000) });
    return r.ok ? await r.json() : null;
  } catch (e) {
    return null;
  }
}
async function avatar(login) {
  try {
    const r = await fetch(`https://avatars.githubusercontent.com/${login}?size=240`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    return `data:${r.headers.get('content-type') || 'image/png'};base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}`;
  } catch (e) {
    return null;
  }
}

export default async function Image({ params }) {
  const { login: raw } = await params;
  const login = VALID.test(raw) ? raw : 'github';
  const [bg, display, pixel, body, u, face] = await Promise.all([asset('og/house-bg.png'), asset('fonts/bricolage-grotesque-latin-800-normal.woff'), asset('fonts/pixelify-sans-latin-700-normal.woff'), asset('fonts/figtree-latin-600-normal.woff'), user(login), avatar(login)]);
  const handle = '@' + ((u && u.login) || login);
  const fs = Math.max(30, Math.min(68, Math.floor(540 / (0.6 * handle.length))));
  const stats = u ? [[short(u.followers || 0), u.followers === 1 ? 'fan' : 'fans'], [short(u.public_repos || 0), 'repos'], [String(u.created_at || '').slice(0, 4), 'since']] : null;
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: 'flex', position: 'relative', fontFamily: 'Body', color: '#24163b' }}>
        <img src={`data:image/png;base64,${bg.toString('base64')}`} width={1200} height={630} style={{ position: 'absolute', left: 0, top: 0 }} />
        <div style={{ position: 'absolute', left: 48, top: 56, width: 600, height: 518, display: 'flex', flexDirection: 'column', background: '#fff7e8', border: '4px solid #24163b', borderRadius: 30, boxShadow: '0 9px 0 #24163b', padding: '38px 42px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {face
              ? <img src={face} width={112} height={112} style={{ borderRadius: 24, border: '4px solid #24163b' }} />
              : <div style={{ width: 112, height: 112, borderRadius: 24, border: '4px solid #24163b', background: '#ffc83a' }} />}
            <div style={{ display: 'flex', fontFamily: 'Pixel', fontSize: 26, background: '#24163b', color: '#fff4dc', borderRadius: 999, padding: '6px 18px' }}>GitRoom</div>
          </div>
          <div style={{ display: 'flex', fontFamily: 'Display', fontSize: fs, letterSpacing: -2, marginTop: 34, lineHeight: 1 }}>{handle}</div>
          <div style={{ display: 'flex', fontFamily: 'Display', fontSize: 52, letterSpacing: -2, color: '#ff4f8b', marginTop: 8, lineHeight: 1.02, width: 508 }}>lives in a pixel house.</div>
          <div style={{ display: 'flex', flex: 1 }} />
          {stats && (
            <div style={{ display: 'flex', gap: 30, marginBottom: 22 }}>
              {stats.map(([n, l]) => (
                <div key={l} style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontFamily: 'Display', fontSize: 38, lineHeight: 1 }}>{n}</span>
                  <span style={{ fontFamily: 'Pixel', fontSize: 20, color: '#6b5a80', textTransform: 'uppercase' }}>{l}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', fontFamily: 'Pixel', fontSize: 19, color: '#6b5a80' }}>{`${SITE.replace(/^https?:\/\//, '')}/u/${(u && u.login) || login}`}</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Display', data: display, weight: 800 }, { name: 'Pixel', data: pixel, weight: 700 }, { name: 'Body', data: body, weight: 600 }],
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' },
    },
  );
}
