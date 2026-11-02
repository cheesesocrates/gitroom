import { promises as fs } from 'node:fs';
import path from 'node:path';
import { RULES, EXTRA, describe, castMeta } from '@/lib/detect';
import { slug } from '@/lib/langs';
import AvatarBoard from './AvatarBoard';

export const metadata = {
  title: 'The cast · GitRoom',
  description: 'Every resident that can move into a GitRoom house, and how GitRoom spots them in your repos.',
};

const LANGS = ['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Dart', 'Lua', 'R', 'Haskell', 'Elixir', 'Zig', 'Scala'];
const dev = process.env.NODE_ENV !== 'production';

export default async function AvatarsPage() {
  // "needs remake" notes only exist on a developer's machine
  let flags = {};
  if (dev) { try { flags = JSON.parse(await fs.readFile(path.join(process.cwd(), 'data', 'avatar-flags.json'), 'utf8')).flags || {}; } catch (e) { flags = {}; } }
  // RegExps can't cross to the client, so the rules travel as readable lines
  const rules = Object.fromEntries([...Object.keys(RULES), ...Object.keys(EXTRA)].map(id => [id, { ai: !!(RULES[id] || EXTRA[id]).ai, how: describe(id) }]));
  const extras = Object.keys(EXTRA).map(id => ({ id, ...castMeta(id) }));
  const langs = LANGS.map(name => ({ id: 'lang-' + slug(name), ...castMeta('lang-' + slug(name), name) }));
  return <AvatarBoard rules={rules} extras={extras} langs={langs} initialFlags={flags} canSave={dev} />;
}
