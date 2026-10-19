// Saved house settings. Uses Upstash Redis over REST when UPSTASH_REDIS_REST_URL is set (works on serverless hosts);
// otherwise JSON files in data/houses/, which is fine for a single server and for local development.
import { promises as fs } from 'node:fs';
import path from 'node:path';

// set by Upstash itself, or by Vercel's Upstash integration under its KV_REST_API_* names
const REDIS = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const DIR = path.join(process.cwd(), 'data', 'houses');
const key = login => `house:${login.toLowerCase()}`;
const file = login => path.join(DIR, `${login.toLowerCase()}.json`);

export async function getSettings(login) {
  if (REDIS) {
    const res = await fetch(`${REDIS}/get/${encodeURIComponent(key(login))}`, { headers: { Authorization: `Bearer ${TOKEN}` }, cache: 'no-store' });
    const j = await res.json().catch(() => null);
    return j && j.result ? JSON.parse(j.result) : null;
  }
  try { return JSON.parse(await fs.readFile(file(login), 'utf8')); } catch (e) { return null; }
}

export async function saveSettings(login, settings) {
  const body = JSON.stringify(settings);
  if (REDIS) {
    const res = await fetch(`${REDIS}/set/${encodeURIComponent(key(login))}`, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body, cache: 'no-store' });
    if (!res.ok) throw new Error('Saving failed.');
    return;
  }
  try {
    await fs.mkdir(DIR, { recursive: true });
    await fs.writeFile(file(login), body + '\n');
  } catch (e) {
    // serverless hosts like Vercel have a read-only disk, so saving there needs Upstash Redis
    if (!['EROFS', 'EACCES', 'EPERM', 'ENOENT'].includes(e.code)) throw e;
    throw Object.assign(new Error("This server can't save houses yet: its owner needs to connect Upstash Redis."), { expose: true });
  }
}
