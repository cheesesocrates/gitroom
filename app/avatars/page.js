import { promises as fs } from 'node:fs';
import path from 'node:path';
import { RULES, describe } from '@/lib/detect';
import AvatarBoard from './AvatarBoard';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'The cast · GitRoom',
  description: 'Every resident that can move into a GitRoom house, and how GitRoom spots them in your repos.',
};

export default async function AvatarsPage() {
  let flags = {};
  try { flags = JSON.parse(await fs.readFile(path.join(process.cwd(), 'data', 'avatar-flags.json'), 'utf8')).flags || {}; } catch (e) { flags = {}; }
  // RegExps can't cross to the client, so the rules travel as readable lines
  const rules = Object.fromEntries(Object.keys(RULES).map(id => [id, { ai: !!RULES[id].ai, how: describe(id) }]));
  return <AvatarBoard rules={rules} initialFlags={flags} canSave={process.env.NODE_ENV !== 'production'} />;
}
