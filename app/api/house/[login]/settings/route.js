import { NextResponse } from 'next/server';
import { readSession } from '@/lib/session';
import { getSettings, saveSettings } from '@/lib/store';
import { cleanSettings, publicSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

const VALID = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const headers = { 'Cache-Control': 'private, no-store' };

// Everyone reads what the owner chose for their house; only the owner, signed in with GitHub, can change it.
export async function GET(request, { params }) {
  const { login } = await params;
  if (!VALID.test(login)) return NextResponse.json({ error: "That isn't a valid GitHub username." }, { status: 400 });
  const session = await readSession(request);
  const owner = !!session && session.login.toLowerCase() === login.toLowerCase();
  const settings = await getSettings(login).catch(() => null);
  return NextResponse.json({ settings: owner ? settings : publicSettings(settings) }, { headers });
}

export async function PUT(request, { params }) {
  const { login } = await params;
  if (!VALID.test(login)) return NextResponse.json({ error: "That isn't a valid GitHub username." }, { status: 400 });
  const session = await readSession(request);
  if (!session) return NextResponse.json({ error: 'Sign in with GitHub to change your house.' }, { status: 401, headers });
  if (session.login.toLowerCase() !== login.toLowerCase()) return NextResponse.json({ error: 'You can only change your own house.' }, { status: 403, headers });
  const body = await request.json().catch(() => null);
  const settings = cleanSettings(body && body.settings);
  try {
    await saveSettings(login, settings);
  } catch (e) {
    return NextResponse.json({ error: e.expose ? e.message : "Couldn't save right now. Try again in a moment." }, { status: e.expose ? 503 : 502, headers });
  }
  return NextResponse.json({ settings }, { headers });
}
