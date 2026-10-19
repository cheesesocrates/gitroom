// Which resident moves in for which dependency or file. Shared by the API (detection) and the /avatars page (labels).
// js: npm package names · py: PyPI names · go/rs/php/rb/dart/jvm: substrings in go.mod, Cargo.toml, composer.json, Gemfile, pubspec.yaml, pom.xml/build.gradle
// files: entries at the repo root (a trailing "/" means a folder) or RegExps · langs: GitHub language names
const rx = (re, label) => Object.assign(re, { label }); // RegExp with a readable name for the /avatars page

export const RULES = {
  react: { js: ['react'] },
  next: { js: ['next'] },
  vue: { js: ['vue'] },
  nuxt: { js: ['nuxt', 'nuxt3'] },
  svelte: { js: ['svelte', '@sveltejs/kit'] },
  angular: { js: ['@angular/core'] },
  astro: { js: ['astro'] },
  express: { js: ['express'] },
  nest: { js: ['@nestjs/core'] },
  electron: { js: ['electron'] },
  reactnative: { js: ['react-native', 'expo'] },
  three: { js: ['three', '@react-three/fiber'] },
  socketio: { js: ['socket.io', 'socket.io-client'], py: ['python-socketio', 'flask-socketio'] },
  graphql: { js: ['graphql', '@apollo/client', '@apollo/server'], py: ['graphene', 'strawberry-graphql'] },
  tailwind: { js: ['tailwindcss'] },
  bootstrap: { js: ['bootstrap', 'react-bootstrap'] },
  sass: { js: ['sass', 'node-sass'] },
  vite: { js: ['vite'] },
  webpack: { js: ['webpack'] },
  prisma: { js: ['prisma', '@prisma/client'] },
  supabase: { js: ['@supabase/supabase-js', '@supabase/ssr'], py: ['supabase'], files: ['supabase/'] },
  firebase: { js: ['firebase', 'firebase-admin'], py: ['firebase-admin'], files: ['firebase.json', '.firebaserc'] },
  mongodb: { js: ['mongoose', 'mongodb'], py: ['pymongo', 'motor', 'mongoengine'] },
  postgres: { js: ['pg', 'postgres', '@neondatabase/serverless'], py: ['psycopg2', 'psycopg2-binary', 'psycopg', 'asyncpg'] },
  mysql: { js: ['mysql', 'mysql2'], py: ['mysqlclient', 'pymysql', 'mysql-connector-python'] },
  sqlite: { js: ['sqlite3', 'better-sqlite3'], py: ['sqlite-utils', 'aiosqlite'] },
  redis: { js: ['redis', 'ioredis'], py: ['redis'] },
  stripe: { js: ['stripe', '@stripe/stripe-js'], py: ['stripe'] },
  jest: { js: ['jest', 'vitest'] },
  playwright: { js: ['playwright', '@playwright/test', 'puppeteer', 'cypress'], py: ['playwright', 'pytest-playwright'] },
  selenium: { js: ['selenium-webdriver'], py: ['selenium', 'undetected-chromedriver'] },
  discord: { js: ['discord.js'], py: ['discord.py', 'discord', 'nextcord', 'py-cord'] },
  django: { py: ['django', 'djangorestframework'] },
  flask: { py: ['flask'] },
  fastapi: { py: ['fastapi'] },
  streamlit: { py: ['streamlit'] },
  gradio: { py: ['gradio'] },
  pygame: { py: ['pygame', 'pygame-ce'] },
  pytorch: { py: ['torch', 'pytorch-lightning', 'torchvision'] },
  tensorflow: { py: ['tensorflow', 'tensorflow-cpu', 'keras'], js: ['@tensorflow/tfjs'] },
  sklearn: { py: ['scikit-learn', 'sklearn'] },
  pandas: { py: ['pandas', 'polars'] },
  numpy: { py: ['numpy'] },
  matplotlib: { py: ['matplotlib', 'seaborn', 'plotly'] },
  jupyter: { py: ['jupyter', 'notebook', 'jupyterlab', 'ipykernel'], langs: ['Jupyter Notebook'] },
  opencv: { py: ['opencv-python', 'opencv-contrib-python', 'opencv-python-headless'] },
  mediapipe: { py: ['mediapipe'] },
  huggingface: { py: ['transformers', 'huggingface_hub', 'huggingface-hub', 'diffusers', 'datasets'], js: ['@huggingface/inference'], files: ['huggingface_space/'] },
  langchain: { py: ['langchain', 'langchain-core', 'langgraph'], js: ['langchain', '@langchain/core'] },
  llamaindex: { py: ['llama-index', 'llama_index', 'llama-index-core'], js: ['llamaindex'] },
  pinecone: { py: ['pinecone', 'pinecone-client'], js: ['@pinecone-database/pinecone'] },
  bs4: { py: ['beautifulsoup4', 'bs4', 'scrapy'] },
  gin: { go: ['github.com/gin-gonic/gin', 'github.com/gofiber/fiber', 'github.com/labstack/echo'] },
  tauri: { rs: ['tauri'], js: ['@tauri-apps/api', '@tauri-apps/cli'] },
  bevy: { rs: ['bevy'] },
  wasm: { rs: ['wasm-bindgen', 'wasm-pack'], js: ['@wasmer/wasi'] },
  laravel: { php: ['laravel/framework'] },
  rails: { rb: ['rails'] },
  flutter: { dart: ['flutter:'] },
  spring: { jvm: ['spring-boot'] },
  // .sln alone isn't enough: Visual Studio C++ projects have one too
  dotnet: { files: [rx(/\.(csproj|fsproj|vbproj)$/i, '*.csproj / *.fsproj')], langs: ['C#', 'F#'] },
  godot: { files: ['project.godot'], langs: ['GDScript'] },
  unity: { files: ['ProjectSettings/'], langs: ['ShaderLab'] },
  sdl: { files: [rx(/^sdl\d?(_\w+)?\.dll$/i, 'SDL*.dll'), rx(/^sdl\d?\//i, 'SDL/')] },
  docker: { files: [rx(/^dockerfile$/i, 'Dockerfile'), rx(/^docker-compose\.ya?ml$/i, 'docker-compose.yml'), rx(/^compose\.ya?ml$/i, 'compose.yml'), 'huggingface_space/'] },
  kubernetes: { files: ['k8s/', 'kubernetes/', 'helm/', 'charts/'] },
  vercel: { files: ['vercel.json', '.vercel/'] },
  netlify: { files: ['netlify.toml', '_redirects'] },
  actions: { workflows: true },
  // AI helpers: they visit every room
  claude: { ai: true, js: ['@anthropic-ai/sdk', '@anthropic-ai/claude-code'], py: ['anthropic', 'claude-agent-sdk'], files: ['CLAUDE.md', '.claude/'] },
  chatgpt: { ai: true, js: ['openai'], py: ['openai'], files: ['AGENTS.md', '.codex/'] },
  gemini: { ai: true, js: ['@google/generative-ai', '@google/genai'], py: ['google-generativeai', 'google-genai'], files: ['GEMINI.md'] },
  copilot: { ai: true, copilot: true },
  cursor: { ai: true, files: ['.cursorrules', '.cursor/'] },
};

const pyName = l => l.trim().split(/[\s<>=!~;[@]/)[0].toLowerCase();

// Reads dependency names out of the manifests GitHub gave us.
export function parseManifests(m) {
  const js = new Set(), py = new Set();
  let other = '';
  const addPkg = text => {
    try {
      const j = JSON.parse(text);
      for (const k of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) Object.keys(j[k] || {}).forEach(d => js.add(d.toLowerCase()));
    } catch (e) { /* not JSON */ }
  };
  for (const [k, text] of Object.entries(m)) {
    if (!text) continue;
    if (k.endsWith('pkg')) addPkg(text);
    else if (k === 'req' || k === 'breq') text.split('\n').map(l => l.replace(/(^|\s)#.*$/, '')).map(pyName).filter(Boolean).forEach(n => py.add(n));
    else if (k === 'pyp' || k === 'pipf') {
      // quoted requirement strings ("fastapi>=0.1") and poetry/pipenv keys (fastapi = "^0.1")
      const clean = text.split('\n').map(l => l.replace(/(^|\s)#.*$/, '')).join('\n').toLowerCase();
      (clean.match(/"[^"\n]+"|'[^'\n]+'/g) || []).forEach(s => py.add(pyName(s.slice(1, -1))));
      (clean.match(/^\s*[a-z0-9][a-z0-9_.-]*\s*=/gm) || []).forEach(s => py.add(s.split('=')[0].trim()));
    } else other += '\n' + text.toLowerCase();
  }
  return { js, py, other };
}

export function detect({ manifests, root, workflows, copilot, langs }) {
  const deps = parseManifests(manifests);
  const names = root.map(e => e.name + (e.type === 'tree' ? '/' : ''));
  const hit = (list, set) => (list || []).some(n => set.has(n));
  const hitFile = list => (list || []).some(p => names.some(n => (p instanceof RegExp ? p.test(n) : n === p)));
  const hitOther = list => (list || []).some(s => deps.other.includes(s.toLowerCase()));
  const found = [];
  for (const [id, r] of Object.entries(RULES)) {
    const yes = hit(r.js, deps.js) || hit(r.py, deps.py) || hitOther(r.go) || hitOther(r.rs) || hitOther(r.php) || hitOther(r.rb) || hitOther(r.dart) || hitOther(r.jvm)
      || hitFile(r.files) || (r.workflows && workflows > 0) || (r.copilot && copilot) || (r.langs || []).some(l => langs.includes(l));
    if (yes) found.push(id);
  }
  // Unity projects are C#, but the Unity resident already covers them
  return found.includes('unity') ? found.filter(id => id !== 'dotnet') : found;
}

// Human-readable "how we spot it" lines for the avatars page.
export function describe(id) {
  const r = RULES[id];
  if (!r) return [];
  const out = [];
  if (r.js) out.push(`npm: ${r.js.join(', ')}`);
  if (r.py) out.push(`pip: ${r.py.join(', ')}`);
  ['go', 'rs', 'php', 'rb', 'dart', 'jvm'].forEach(k => { if (r[k]) out.push(`${k}: ${r[k].join(', ')}`); });
  if (r.files) out.push(`files: ${r.files.map(f => (f instanceof RegExp ? f.label || f.source : f)).join(', ')}`);
  if (r.langs) out.push(`language: ${r.langs.join(', ')}`);
  if (r.workflows) out.push('files: .github/workflows/');
  if (r.copilot) out.push('files: .github/copilot-instructions.md');
  return out;
}
