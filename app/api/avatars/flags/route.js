import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

// "Needs remake" marks from the /avatars page, saved to data/avatar-flags.json so they can be read and acted on.
const FILE = path.join(process.cwd(), 'data', 'avatar-flags.json');

async function load() {
  try { return JSON.parse(await fs.readFile(FILE, 'utf8')); } catch (e) { return { flags: {} }; }
}

export async function GET() {
  return NextResponse.json(await load(), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request) {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Marks only save when GitRoom runs locally.' }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== 'string' || !/^[a-z0-9]{1,24}$/.test(body.id)) return NextResponse.json({ error: 'Unknown avatar.' }, { status: 400 });
  const data = await load();
  if (body.remake) data.flags[body.id] = { remake: true, note: String(body.note || '').slice(0, 300), at: new Date().toISOString() };
  else delete data.flags[body.id];
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(data, null, 2) + '\n');
  return NextResponse.json(data);
}
