// Server only: a repo's commit count and top-level files, read off its public GitHub page. Web pages aren't the API,
// so this costs none of GitHub's free API quota: a house needs three API calls instead of twenty-odd.
import { detect } from './detect.js';
import { pool } from './github-rest.js';

const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; GitRoom/2.0; +https://github.com/cheesesocrates/gitroom)', Accept: 'text/html' };

// GitHub's code pages carry their data as JSON in a script tag for its React app
async function payload(path) {
  try {
    const res = await fetch('https://github.com' + path, { headers: UA, next: { revalidate: 21600 }, signal: AbortSignal.timeout(9000) });
    if (!res.ok) return { status: res.status };
    const m = /<script type="application\/json" data-target="react-app\.embeddedData">([\s\S]*?)<\/script>/.exec(await res.text());
    return { status: 200, data: m ? JSON.parse(m[1]).payload : null };
  } catch (e) {
    return { status: 0 };
  }
}
const itemsOf = route => ((route && route.tree && route.tree.items) || []).map(i => ({ name: String(i.name), dir: i.contentType === 'directory' }));

async function folder(owner, repo, branch, dir) {
  const p = await payload(`/${owner}/${repo}/tree/${encodeURIComponent(branch)}/${dir.split('/').map(encodeURIComponent).join('/')}`);
  return itemsOf(p.data && p.data.codeViewTreeRoute);
}

const MANIFEST = /^(package\.json|requirements[\w.-]*\.txt|pyproject\.toml|pipfile|setup\.py|setup\.cfg|environment\.ya?ml|go\.mod|cargo\.toml|composer\.json|gemfile|pubspec\.yaml|pom\.xml|build\.gradle(\.kts)?|settings\.gradle(\.kts)?|manifest\.json)$/i;
const APP_DIRS = ['frontend', 'client', 'web', 'app', 'server', 'backend', 'api', 'ui', 'site', 'website', 'src-tauri'];

// { commits, found } for one repo, or null when its page can't be read (then the caller falls back to the API)
export async function readRepoPage(owner, { name, language }, raw) {
  const p = await payload(`/${owner}/${name}`);
  if (p.status === 404) return { commits: 0, found: [] };
  const route = p.data && p.data.codeViewRepoRoute;
  if (!route) return p.status === 200 ? { commits: 0, found: [] } : null; // 200 without a code view: an empty repo
  const commits = +String((route.overview && route.overview.commitCount) || '0').replace(/\D/g, '') || 0;
  const branch = (route.refInfo && route.refInfo.name) || 'HEAD';
  // GitHub folds a chain of single-folder folders into one entry (".github/workflows"), so folders go by their first part
  const items = itemsOf(route), dirs = items.filter(i => i.dir).map(i => i.name), files = items.filter(i => !i.dir).map(i => i.name);
  const root = [...new Set(dirs.map(d => d.split('/')[0] + '/')), ...files];
  const has = d => root.includes(d + '/'), folded = d => dirs.filter(x => x.startsWith(d + '/'));
  let workflows = folded('.github').some(x => x.startsWith('.github/workflows')) ? 1 : 0, copilot = false;
  const extra = [];
  const jobs = [];
  if (dirs.includes('.github')) jobs.push(folder(owner, name, branch, '.github').then(g => { workflows = g.some(i => i.dir && i.name.split('/')[0] === 'workflows') ? 1 : 0; copilot = g.some(i => i.name === 'copilot-instructions.md'); }));
  // monorepos: the first few apps and packages
  ['apps', 'packages'].forEach(m => {
    if (dirs.includes(m)) jobs.push(folder(owner, name, branch, m).then(sub => sub.filter(i => i.dir).slice(0, 4).forEach(i => extra.push(`${m}/${i.name.split('/')[0]}/package.json`))));
    else folded(m).slice(0, 1).forEach(d => extra.push(`${m}/${d.split('/')[1]}/package.json`));
  });
  await Promise.all(jobs);
  const wanted = files.filter(f => MANIFEST.test(f));
  APP_DIRS.filter(has).forEach(d => wanted.push(`${d}/package.json`, `${d}/requirements.txt`, `${d}/Cargo.toml`));
  // Android and Minecraft projects keep their real build file in app/
  if (has('app') && files.some(f => /^(settings|build)\.gradle/.test(f))) wanted.push('app/build.gradle', 'app/build.gradle.kts');
  const list = [...new Set([...wanted, ...extra])].slice(0, 16);
  const texts = await pool(list, 6, path => raw(owner, name, path));
  const manifests = list.map((path, i) => ({ path, text: texts[i] })).filter(m => m.text);
  const found = detect({ manifests, root, paths: files, workflows, copilot, langs: language ? [language] : [], repoName: name });
  return { commits, found };
}

// several repos at once, a few at a time; failures come back as null
export async function readReposPages(owner, repos, raw, onEach = () => {}) {
  return pool(repos, 5, async r => { const d = await readRepoPage(owner, r, raw).catch(() => null); onEach(); return d; });
}
