// Encrypted cookie sessions (AES-GCM). The GitHub token never reaches the browser's JavaScript.
const enc = new TextEncoder();
const dec = new TextDecoder();
export const SESSION_COOKIE = 'gr_session';
export const STATE_COOKIE = 'gr_state';
export const isProd = process.env.NODE_ENV === 'production';

// The development fallback is public (it's right here), so production refuses to run without a real SESSION_SECRET.
export const sessionSecret = () => process.env.SESSION_SECRET || (isProd ? null : 'gitroom-local-dev-secret');

let keyPromise;
function key() {
  if (!keyPromise) {
    const secret = sessionSecret();
    if (!secret) throw new Error('SESSION_SECRET is not set.');
    keyPromise = crypto.subtle.digest('SHA-256', enc.encode(secret)).then(h => crypto.subtle.importKey('raw', h, 'AES-GCM', false, ['encrypt', 'decrypt']));
  }
  return keyPromise;
}

export async function seal(obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(), enc.encode(JSON.stringify(obj)));
  return `${Buffer.from(iv).toString('base64url')}.${Buffer.from(new Uint8Array(ct)).toString('base64url')}`;
}

export async function unseal(value) {
  try {
    const [iv, ct] = String(value).split('.');
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(iv, 'base64url') }, await key(), Buffer.from(ct, 'base64url'));
    return JSON.parse(dec.decode(pt));
  } catch (e) {
    return null;
  }
}

export async function readSession(request) {
  const c = request.cookies.get(SESSION_COOKIE);
  return c ? unseal(c.value) : null;
}

export const cookieOpts = maxAge => ({ httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge });

// Dev sign-in (as the GitHub CLI account) only answers on this machine; the Host check keeps other
// devices on the network out of it. Production always uses the OAuth App.
export const devSignInAllowed = request => !isProd && /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(request.headers.get('host') || '');
