// Which resident moves in for which dependency or file. Shared by the house builder (server and browser) and /avatars.
// js: npm package names (jsPrefix: name prefixes) · py: PyPI names (pyPrefix) · go/rs/php/rb/dart/jvm: substrings of
// go.mod, Cargo.toml, composer.json, Gemfile, pubspec.yaml, pom.xml/build.gradle · files: entries at the repo root
// (a trailing "/" means a folder) or RegExps · anywhere: RegExps tested on every path · langs: GitHub language names
import { LANG_COLORS, langColor, slug } from './langs.js';

const rx = (re, label) => Object.assign(re, { label }); // RegExp with a readable name for the /avatars page

// Residents with hand-drawn sprites (public/engine/sprites.js and avatars-*.js).
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
  redis: { js: ['redis', 'ioredis', '@upstash/redis'], py: ['redis'] },
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
  pytorch: { py: ['torch', 'pytorch-lightning', 'torchvision', 'lightning'] },
  tensorflow: { py: ['tensorflow', 'tensorflow-cpu', 'keras'], js: ['@tensorflow/tfjs'] },
  sklearn: { py: ['scikit-learn', 'sklearn'] },
  pandas: { py: ['pandas', 'polars'] },
  numpy: { py: ['numpy'] },
  matplotlib: { py: ['matplotlib', 'seaborn', 'plotly'] },
  jupyter: { py: ['jupyter', 'notebook', 'jupyterlab', 'ipykernel'], langs: ['Jupyter Notebook'] },
  opencv: { py: ['opencv-python', 'opencv-contrib-python', 'opencv-python-headless'] },
  mediapipe: { py: ['mediapipe'] },
  huggingface: { py: ['transformers', 'huggingface-hub', 'diffusers', 'datasets', 'sentence-transformers'], js: ['@huggingface/inference', '@huggingface/transformers', '@xenova/transformers'], files: ['huggingface_space/'] },
  langchain: { py: ['langchain', 'langchain-core', 'langgraph', 'langchain-openai', 'langchain-community'], js: ['langchain', '@langchain/core'] },
  llamaindex: { py: ['llama-index', 'llama-index-core'], js: ['llamaindex'] },
  pinecone: { py: ['pinecone', 'pinecone-client'], js: ['@pinecone-database/pinecone'] },
  bs4: { py: ['beautifulsoup4', 'bs4', 'scrapy'] },
  gin: { go: ['github.com/gin-gonic/gin', 'github.com/gofiber/fiber', 'github.com/labstack/echo'] },
  tauri: { rs: ['tauri'], js: ['@tauri-apps/api', '@tauri-apps/cli'] },
  bevy: { rs: ['bevy'] },
  wasm: { rs: ['wasm-bindgen', 'wasm-pack'], js: ['@wasmer/wasi'] },
  laravel: { php: ['laravel/framework'] },
  rails: { rb: ["'rails'", '"rails"'] },
  flutter: { dart: ['flutter:'] },
  spring: { jvm: ['spring-boot'] },
  // .sln alone isn't enough: Visual Studio C++ projects have one too
  dotnet: { anywhere: [rx(/\.(csproj|fsproj|vbproj)$/i, '*.csproj / *.fsproj')], langs: ['C#', 'F#'] },
  godot: { files: ['project.godot'], langs: ['GDScript'] },
  unity: { files: ['ProjectSettings/'], langs: ['ShaderLab'] },
  sdl: { files: [rx(/^sdl\d?(_\w+)?\.dll$/i, 'SDL*.dll'), rx(/^sdl\d?\//i, 'SDL/')] },
  docker: { files: [rx(/^dockerfile$/i, 'Dockerfile'), rx(/^docker-compose\.ya?ml$/i, 'docker-compose.yml'), rx(/^compose\.ya?ml$/i, 'compose.yml'), 'huggingface_space/'] },
  kubernetes: { files: ['k8s/', 'kubernetes/', 'helm/', 'charts/'] },
  vercel: { files: ['vercel.json', '.vercel/'] },
  netlify: { files: ['netlify.toml', '_redirects'] },
  actions: { workflows: true },
  // AI helpers: they visit every room
  claude: { ai: true, js: ['@anthropic-ai/sdk', '@anthropic-ai/claude-code', '@anthropic-ai/claude-agent-sdk', '@ai-sdk/anthropic'], py: ['anthropic', 'claude-agent-sdk'], files: ['CLAUDE.md', '.claude/'] },
  chatgpt: { ai: true, js: ['openai', '@ai-sdk/openai'], py: ['openai'], files: ['AGENTS.md', '.codex/'] },
  gemini: { ai: true, js: ['@google/generative-ai', '@google/genai', '@ai-sdk/google'], py: ['google-generativeai', 'google-genai'], files: ['GEMINI.md', '.gemini/'] },
  copilot: { ai: true, copilot: true },
  cursor: { ai: true, files: ['.cursorrules', '.cursor/'] },
};

// Everyone else GitRoom recognises gets a placeholder resident, drawn from its name and brand colour
// (see PX.placeholder in public/engine/sprites.js). tag: a shorter name tag when the name is long.
export const EXTRA = {
  // front end
  solid: { name: 'Solid', color: '#2c4f7c', js: ['solid-js', '@solidjs/start'] },
  preact: { name: 'Preact', color: '#673ab8', js: ['preact'] },
  remix: { name: 'Remix', color: '#3992ff', js: ['@remix-run/react', '@remix-run/node'] },
  reactrouter: { name: 'React Router', color: '#ca4245', tag: 'ROUTER', js: ['react-router', 'react-router-dom'] },
  gatsby: { name: 'Gatsby', color: '#663399', js: ['gatsby'] },
  ember: { name: 'Ember', color: '#e04e39', js: ['ember-source', 'ember-cli'] },
  lit: { name: 'Lit', color: '#324fff', js: ['lit', 'lit-element'] },
  qwik: { name: 'Qwik', color: '#ac7ef4', js: ['@builder.io/qwik'] },
  alpine: { name: 'Alpine.js', color: '#77c1d2', js: ['alpinejs'] },
  htmx: { name: 'htmx', color: '#3d72d7', js: ['htmx.org'], py: ['django-htmx'] },
  jquery: { name: 'jQuery', color: '#0769ad', js: ['jquery'] },
  d3: { name: 'D3', color: '#f9a03c', js: ['d3'] },
  chartjs: { name: 'Chart.js', color: '#ff6384', js: ['chart.js', 'react-chartjs-2'] },
  recharts: { name: 'Recharts', color: '#22b5bf', js: ['recharts'] },
  redux: { name: 'Redux', color: '#764abc', js: ['redux', '@reduxjs/toolkit', 'react-redux'] },
  zustand: { name: 'Zustand', color: '#8a5a3b', js: ['zustand'] },
  mobx: { name: 'MobX', color: '#ff9955', js: ['mobx'] },
  tanstack: { name: 'TanStack', color: '#ff4154', js: ['@tanstack/react-query', '@tanstack/query-core', '@tanstack/react-router', '@tanstack/react-table', 'react-query'] },
  trpc: { name: 'tRPC', color: '#398ccb', js: ['@trpc/server', '@trpc/client'] },
  zod: { name: 'Zod', color: '#3068b7', js: ['zod'] },
  axios: { name: 'Axios', color: '#5a29e4', js: ['axios'] },
  motion: { name: 'Framer Motion', color: '#0055ff', tag: 'MOTION', js: ['framer-motion', 'motion'] },
  gsap: { name: 'GSAP', color: '#88ce02', js: ['gsap'] },
  styled: { name: 'styled-components', color: '#db7093', tag: 'STYLED', js: ['styled-components'] },
  emotion: { name: 'Emotion', color: '#d26ac2', js: ['@emotion/react', '@emotion/styled'] },
  mui: { name: 'MUI', color: '#007fff', js: ['@mui/material', '@material-ui/core'] },
  chakra: { name: 'Chakra UI', color: '#319795', tag: 'CHAKRA', js: ['@chakra-ui/react'] },
  antd: { name: 'Ant Design', color: '#1677ff', tag: 'ANTD', js: ['antd'] },
  radix: { name: 'Radix UI', color: '#6e56cf', tag: 'RADIX', jsPrefix: ['@radix-ui/'] },
  shadcn: { name: 'shadcn/ui', color: '#27272a', tag: 'SHADCN', files: ['components.json'] },
  storybook: { name: 'Storybook', color: '#ff4785', jsPrefix: ['@storybook/'], files: ['.storybook/'] },
  // build tools and runtimes
  rollup: { name: 'Rollup', color: '#ef3335', js: ['rollup'] },
  esbuild: { name: 'esbuild', color: '#ffcf00', js: ['esbuild'] },
  parcel: { name: 'Parcel', color: '#e7a33e', js: ['parcel'] },
  turbo: { name: 'Turborepo', color: '#ef4444', tag: 'TURBO', files: ['turbo.json'] },
  nx: { name: 'Nx', color: '#143055', files: ['nx.json'] },
  bun: { name: 'Bun', color: '#fbf0df', files: ['bun.lockb', 'bun.lock', 'bunfig.toml'] },
  deno: { name: 'Deno', color: '#2f2f2f', files: ['deno.json', 'deno.jsonc', 'deno.lock'] },
  // back end and data
  fastify: { name: 'Fastify', color: '#3a3a46', js: ['fastify'] },
  koa: { name: 'Koa', color: '#33333d', js: ['koa'] },
  hono: { name: 'Hono', color: '#e36002', js: ['hono'] },
  elysia: { name: 'Elysia', color: '#a855f7', js: ['elysia'] },
  drizzle: { name: 'Drizzle', color: '#c5f74f', js: ['drizzle-orm'] },
  sequelize: { name: 'Sequelize', color: '#52b0e7', js: ['sequelize'] },
  typeorm: { name: 'TypeORM', color: '#fe0803', js: ['typeorm'] },
  sqlalchemy: { name: 'SQLAlchemy', color: '#d71f00', tag: 'SQLALCHEMY', py: ['sqlalchemy', 'flask-sqlalchemy', 'sqlmodel'] },
  pydantic: { name: 'Pydantic', color: '#e92063', py: ['pydantic'] },
  celery: { name: 'Celery', color: '#37814a', py: ['celery'] },
  duckdb: { name: 'DuckDB', color: '#fff000', py: ['duckdb'], js: ['duckdb', '@duckdb/node-api', '@duckdb/duckdb-wasm'] },
  grpc: { name: 'gRPC', color: '#244c5a', go: ['google.golang.org/grpc'], py: ['grpcio'], js: ['@grpc/grpc-js'] },
  authjs: { name: 'Auth.js', color: '#7c3aed', js: ['next-auth', '@auth/core'] },
  clerk: { name: 'Clerk', color: '#6c47ff', jsPrefix: ['@clerk/'] },
  passport: { name: 'Passport', color: '#34e27a', js: ['passport'] },
  jwt: { name: 'JWT', color: '#d63aff', js: ['jsonwebtoken', 'jose'], py: ['pyjwt', 'python-jose'] },
  convex: { name: 'Convex', color: '#ee342f', js: ['convex'] },
  appwrite: { name: 'Appwrite', color: '#fd366e', js: ['appwrite', 'node-appwrite'], py: ['appwrite'] },
  pocketbase: { name: 'PocketBase', color: '#b8dbe4', tag: 'POCKETBASE', js: ['pocketbase'] },
  sentry: { name: 'Sentry', color: '#362d59', jsPrefix: ['@sentry/'], py: ['sentry-sdk'] },
  posthog: { name: 'PostHog', color: '#f9bd2b', js: ['posthog-js', 'posthog-node'], py: ['posthog'] },
  // cloud and hosting
  aws: { name: 'AWS', color: '#ff9900', js: ['aws-sdk', 'aws-cdk-lib'], jsPrefix: ['@aws-sdk/'], py: ['boto3', 'botocore'] },
  gcp: { name: 'Google Cloud', color: '#4285f4', tag: 'GCP', jsPrefix: ['@google-cloud/'], pyPrefix: ['google-cloud-'] },
  azure: { name: 'Azure', color: '#0078d4', jsPrefix: ['@azure/'], pyPrefix: ['azure-'] },
  cloudflare: { name: 'Cloudflare', color: '#f38020', js: ['wrangler', '@cloudflare/workers-types'], files: ['wrangler.toml', 'wrangler.json', 'wrangler.jsonc'] },
  heroku: { name: 'Heroku', color: '#430098', files: ['Procfile'] },
  railway: { name: 'Railway', color: '#7b3be2', files: ['railway.json', 'railway.toml'] },
  render: { name: 'Render', color: '#46e3b7', files: ['render.yaml'] },
  fly: { name: 'Fly.io', color: '#7b3be2', files: ['fly.toml'] },
  terraform: { name: 'Terraform', color: '#7b42bc', anywhere: [/\.tf$/i], langs: ['HCL'] },
  ansible: { name: 'Ansible', color: '#ee0000', files: ['ansible.cfg', 'playbook.yml', 'playbooks/'] },
  nginx: { name: 'NGINX', color: '#009639', files: ['nginx.conf', 'nginx/'] },
  nix: { name: 'Nix', color: '#7e7eff', files: ['flake.nix', 'shell.nix', 'default.nix'] },
  // sites and docs
  ghpages: { name: 'GitHub Pages', color: '#24292f', tag: 'PAGES', repo: /\.github\.io$/i },
  jekyll: { name: 'Jekyll', color: '#cc0000', files: ['_config.yml'], rb: ['jekyll', 'github-pages'] },
  hugo: { name: 'Hugo', color: '#ff4088', files: ['hugo.toml', 'hugo.yaml', 'hugo.json', 'archetypes/'] },
  mkdocs: { name: 'MkDocs', color: '#526cfe', files: ['mkdocs.yml'], py: ['mkdocs', 'mkdocs-material'] },
  docusaurus: { name: 'Docusaurus', color: '#3ecc5f', tag: 'DOCUSAURUS', js: ['@docusaurus/core'] },
  vitepress: { name: 'VitePress', color: '#5c73e7', js: ['vitepress'] },
  eleventy: { name: 'Eleventy', color: '#222222', js: ['@11ty/eleventy'] },
  wordpress: { name: 'WordPress', color: '#21759b', files: ['wp-config.php', 'wp-config-sample.php', 'wp-content/'] },
  latex: { name: 'LaTeX', color: '#008080', anywhere: [/\.tex$/i], langs: ['TeX'] },
  // apps, bots and plugins
  chromeext: { name: 'Chrome Extension', color: '#4285f4', tag: 'CHROME EXT', chromeExt: true },
  vscode: { name: 'VS Code Extension', color: '#007acc', tag: 'VS CODE EXT', vscode: true },
  obsidian: { name: 'Obsidian Plugin', color: '#7c3aed', tag: 'OBSIDIAN', js: ['obsidian'] },
  raycast: { name: 'Raycast', color: '#ff6363', js: ['@raycast/api'] },
  figma: { name: 'Figma Plugin', color: '#f24e1e', tag: 'FIGMA', js: ['@figma/plugin-typings', '@create-figma-plugin/utilities'] },
  shopify: { name: 'Shopify', color: '#95bf47', jsPrefix: ['@shopify/'], files: ['shopify.app.toml'] },
  telegram: { name: 'Telegram Bot', color: '#26a5e4', tag: 'TELEGRAM', js: ['telegraf', 'node-telegram-bot-api', 'grammy'], py: ['python-telegram-bot', 'aiogram', 'pytelegrambotapi', 'telebot'] },
  slack: { name: 'Slack', color: '#4a154b', js: ['@slack/bolt', '@slack/web-api'], py: ['slack-sdk', 'slack-bolt'] },
  whatsapp: { name: 'WhatsApp', color: '#25d366', js: ['whatsapp-web.js', '@whiskeysockets/baileys'] },
  twilio: { name: 'Twilio', color: '#f22f46', js: ['twilio'], py: ['twilio'] },
  ionic: { name: 'Ionic', color: '#3880ff', jsPrefix: ['@ionic/'] },
  capacitor: { name: 'Capacitor', color: '#119eff', js: ['@capacitor/core'] },
  android: { name: 'Android', color: '#3ddc84', jvm: ['com.android.application', 'com.android.library'], anywhere: [/(^|\/)AndroidManifest\.xml$/] },
  xcode: { name: 'Xcode', color: '#1575f9', files: [rx(/\.xcodeproj\/$/i, '*.xcodeproj'), rx(/\.xcworkspace\/$/i, '*.xcworkspace')] },
  minecraft: { name: 'Minecraft Mod', color: '#62b47a', tag: 'MINECRAFT', jvm: ['net.fabricmc', 'net.minecraftforge', 'fabric-loom', 'org.spigotmc', 'io.papermc', 'spigot-api', 'paper-api'], anywhere: [/(^|\/)fabric\.mod\.json$/, /(^|\/)mods\.toml$/] },
  ktor: { name: 'Ktor', color: '#087cfa', jvm: ['io.ktor'] },
  quarkus: { name: 'Quarkus', color: '#4695eb', jvm: ['quarkus'] },
  javafx: { name: 'JavaFX', color: '#5382a1', jvm: ['org.openjfx', 'javafx'] },
  libgdx: { name: 'libGDX', color: '#e74a45', jvm: ['com.badlogicgames.gdx'] },
  // games and graphics
  phaser: { name: 'Phaser', color: '#7b5be6', js: ['phaser'] },
  pixi: { name: 'PixiJS', color: '#e72264', js: ['pixi.js'] },
  p5: { name: 'p5.js', color: '#ed225d', js: ['p5'] },
  babylon: { name: 'Babylon.js', color: '#bb464b', tag: 'BABYLON', js: ['@babylonjs/core', 'babylonjs'] },
  tone: { name: 'Tone.js', color: '#f734d7', js: ['tone'] },
  ebiten: { name: 'Ebitengine', color: '#db5c3d', tag: 'EBITEN', go: ['github.com/hajimehoshi/ebiten'] },
  macroquad: { name: 'Macroquad', color: '#ff5e5e', rs: ['macroquad'] },
  // Go and Rust
  gorm: { name: 'GORM', color: '#00add8', go: ['gorm.io/gorm'] },
  cobra: { name: 'Cobra', color: '#e8a33d', go: ['github.com/spf13/cobra'] },
  bubbletea: { name: 'Bubble Tea', color: '#ff5fd2', tag: 'BUBBLETEA', go: ['github.com/charmbracelet/bubbletea'] },
  tokio: { name: 'Tokio', color: '#7f56d9', rs: ['tokio'] },
  axum: { name: 'Axum', color: '#d6773c', rs: ['axum'] },
  actix: { name: 'Actix', color: '#3e2a7c', rs: ['actix-web'] },
  leptos: { name: 'Leptos', color: '#ef3939', rs: ['leptos'] },
  dioxus: { name: 'Dioxus', color: '#00a8d6', rs: ['dioxus'] },
  egui: { name: 'egui', color: '#8a2be2', rs: ['egui', 'eframe'] },
  ratatui: { name: 'Ratatui', color: '#3b82f6', rs: ['ratatui'] },
  // PHP and Ruby
  symfony: { name: 'Symfony', color: '#1a171b', php: ['symfony/'] },
  livewire: { name: 'Livewire', color: '#fb70a9', php: ['livewire/livewire'] },
  sinatra: { name: 'Sinatra', color: '#c0392b', rb: ['sinatra'] },
  // Python apps, ML and AI
  scipy: { name: 'SciPy', color: '#8caae6', py: ['scipy'] },
  xgboost: { name: 'XGBoost', color: '#1a8acf', py: ['xgboost', 'lightgbm', 'catboost'] },
  jax: { name: 'JAX', color: '#5e97f6', py: ['jax', 'flax', 'jaxlib'] },
  dash: { name: 'Dash', color: '#119dff', py: ['dash'] },
  spark: { name: 'Spark', color: '#e25a1c', py: ['pyspark'] },
  ray: { name: 'Ray', color: '#028cf0', py: ['ray'] },
  mlflow: { name: 'MLflow', color: '#0194e2', py: ['mlflow'] },
  wandb: { name: 'Weights & Biases', color: '#ffbe00', tag: 'W+B', py: ['wandb'] },
  gym: { name: 'Gymnasium', color: '#0081a5', tag: 'GYM', py: ['gym', 'gymnasium', 'stable-baselines3'] },
  yolo: { name: 'YOLO', color: '#111f68', py: ['ultralytics', 'yolov5'] },
  onnx: { name: 'ONNX', color: '#005ced', py: ['onnx', 'onnxruntime'], js: ['onnxruntime-web', 'onnxruntime-node'] },
  spacy: { name: 'spaCy', color: '#09a3d5', py: ['spacy'] },
  nltk: { name: 'NLTK', color: '#2a6c8f', py: ['nltk'] },
  whisper: { name: 'Whisper', color: '#74aa9c', py: ['openai-whisper', 'faster-whisper'] },
  chroma: { name: 'Chroma', color: '#ff6446', py: ['chromadb'], js: ['chromadb'] },
  qdrant: { name: 'Qdrant', color: '#dc244c', py: ['qdrant-client'], js: ['@qdrant/js-client-rest'] },
  faiss: { name: 'FAISS', color: '#0467df', py: ['faiss-cpu', 'faiss-gpu'] },
  crewai: { name: 'CrewAI', color: '#ff5a50', py: ['crewai'] },
  ollama: { name: 'Ollama', color: '#3a3a3a', js: ['ollama'], py: ['ollama'] },
  mistral: { name: 'Mistral', color: '#fa520f', js: ['@mistralai/mistralai'], py: ['mistralai'] },
  groq: { name: 'Groq', color: '#f55036', js: ['groq-sdk'], py: ['groq'] },
  aisdk: { name: 'Vercel AI SDK', color: '#111111', tag: 'AI SDK', js: ['ai'] },
  qt: { name: 'Qt', color: '#41cd52', py: ['pyqt5', 'pyqt6', 'pyside6', 'pyside2'], anywhere: [/\.qml$/i] },
  kivy: { name: 'Kivy', color: '#5f8c3e', py: ['kivy', 'kivymd'] },
  ctk: { name: 'CustomTkinter', color: '#1f6aa5', tag: 'TKINTER', py: ['customtkinter'] },
  pillow: { name: 'Pillow', color: '#4b8bbe', py: ['pillow'] },
  pytest: { name: 'pytest', color: '#0a9edc', py: ['pytest'] },
  mocha: { name: 'Mocha', color: '#8d6748', js: ['mocha'] },
  // web3
  ethereum: { name: 'Ethereum', color: '#627eea', js: ['ethers', 'web3', 'wagmi', 'viem'], py: ['web3'] },
  hardhat: { name: 'Hardhat', color: '#fff100', js: ['hardhat'], files: ['hardhat.config.js', 'hardhat.config.ts', 'foundry.toml'] },
  solana: { name: 'Solana', color: '#9945ff', js: ['@solana/web3.js'], rs: ['solana-program', 'anchor-lang'] },
  // hardware
  arduino: { name: 'Arduino', color: '#00979d', anywhere: [/\.ino$/i] },
  platformio: { name: 'PlatformIO', color: '#f5822a', tag: 'PLATFORMIO', files: ['platformio.ini'] },
  raspberrypi: { name: 'Raspberry Pi', color: '#c51a4a', tag: 'RASPI', py: ['rpi.gpio', 'gpiozero', 'picamera', 'picamera2', 'adafruit-blinka'] },
  cmake: { name: 'CMake', color: '#064f8c', files: ['CMakeLists.txt'] },
  // AI coding helpers without a sprite yet also roam every room
  windsurf: { name: 'Windsurf', color: '#0b9e8a', ai: true, files: ['.windsurfrules', '.windsurf/'] },
  cline: { name: 'Cline', color: '#5a5a66', ai: true, files: ['.clinerules', '.clinerules/'] },
  aider: { name: 'Aider', color: '#14b014', ai: true, files: ['.aider.conf.yml', '.aider.chat.history.md'] },
  kiro: { name: 'Kiro', color: '#7c4dff', ai: true, files: ['.kiro/'] },
};

export const LANG = 'lang-';
const LANG_BY_SLUG = Object.fromEntries(Object.keys(LANG_COLORS).map(n => [slug(n), n]));

// What the engine needs to draw a resident that has no hand-made sprite.
export function castMeta(id, langName) {
  const e = EXTRA[id];
  if (e) return { name: e.name, color: e.color, ...(e.tag ? { tag: e.tag } : {}), ...(e.ai ? { ai: true } : {}) };
  if (id.startsWith(LANG)) {
    const name = langName || LANG_BY_SLUG[id.slice(LANG.length)] || id.slice(LANG.length);
    return { name, color: langColor(name), lang: true };
  }
  return null;
}
export const isAI = id => !!((RULES[id] && RULES[id].ai) || (EXTRA[id] && EXTRA[id].ai));

// PyPI treats "Foo_Bar", "foo-bar" and "foo.bar" as one name
const pyNorm = s => s.toLowerCase().replace(/[_.]+/g, '-');
const pyName = l => pyNorm(l.trim().split(/[\s<>=!~;[@(,]/)[0]);

// Reads dependency names out of the manifest files.
export function parseManifests(list) {
  const js = new Set(), py = new Set(), text = { go: '', rs: '', php: '', rb: '', dart: '', jvm: '' };
  let vscode = false, chromeExt = false;
  for (const { path, text: body } of list) {
    if (!body) continue;
    const base = path.split('/').pop().toLowerCase();
    if (base === 'package.json') {
      try {
        const j = JSON.parse(body);
        for (const k of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) Object.keys(j[k] || {}).forEach(d => js.add(d.toLowerCase()));
        if (j.engines && j.engines.vscode) vscode = true;
      } catch (e) { /* not JSON */ }
    } else if (base === 'manifest.json') {
      if (/"manifest_version"\s*:/.test(body)) chromeExt = true;
    } else if (/^requirements.*\.txt$/.test(base)) {
      body.split('\n').map(l => l.replace(/(^|\s)#.*$/, '')).filter(l => !/^\s*-/.test(l)).map(pyName).filter(Boolean).forEach(n => py.add(n));
    } else if (base === 'pyproject.toml' || base === 'pipfile' || base === 'setup.py' || base === 'setup.cfg') {
      // quoted requirement strings ("fastapi>=0.1") and poetry/pipenv keys (fastapi = "^0.1")
      const clean = body.split('\n').map(l => l.replace(/(^|\s)#.*$/, '')).join('\n').toLowerCase();
      (clean.match(/"[^"\n]+"|'[^'\n]+'/g) || []).forEach(s => py.add(pyName(s.slice(1, -1))));
      (clean.match(/^\s*[a-z0-9][a-z0-9_.-]*\s*=/gm) || []).forEach(s => py.add(pyNorm(s.split('=')[0].trim())));
    } else if (base === 'environment.yml' || base === 'environment.yaml') {
      (body.match(/^\s*-\s*[A-Za-z0-9_.-]+/gm) || []).forEach(s => py.add(pyName(s.replace(/^\s*-\s*/, ''))));
    } else if (base === 'go.mod') text.go += '\n' + body.toLowerCase();
    else if (base === 'cargo.toml') text.rs += '\n' + body.toLowerCase();
    else if (base === 'composer.json') text.php += '\n' + body.toLowerCase();
    else if (base === 'gemfile') text.rb += '\n' + body.toLowerCase();
    else if (base === 'pubspec.yaml') text.dart += '\n' + body.toLowerCase();
    else if (base === 'pom.xml' || base.startsWith('build.gradle') || base.startsWith('settings.gradle')) text.jvm += '\n' + body.toLowerCase();
  }
  return { js, py, text, vscode, chromeExt };
}

function matches(r, ctx) {
  const { deps, names, paths, langs, workflows, copilot, repoName } = ctx;
  const has = (list, set) => (list || []).some(n => set.has(n));
  const pre = (list, set) => (list || []).some(p => [...set].some(n => n.startsWith(p)));
  const sub = (list, t) => (list || []).some(s => t.includes(s.toLowerCase()));
  if (has(r.js, deps.js) || pre(r.jsPrefix, deps.js)) return true;
  if (has((r.py || []).map(pyNorm), deps.py) || pre(r.pyPrefix, deps.py)) return true;
  for (const k of ['go', 'rs', 'php', 'rb', 'dart', 'jvm']) if (r[k] && deps.text[k] && sub(r[k], deps.text[k])) return true;
  if ((r.files || []).some(p => names.some(n => (p instanceof RegExp ? p.test(n) : n === p)))) return true;
  if ((r.anywhere || []).some(re => paths.some(p => re.test(p)))) return true;
  if (r.langs && r.langs.some(l => langs.includes(l))) return true;
  if (r.workflows && workflows > 0) return true;
  if (r.copilot && copilot) return true;
  if (r.repo && repoName && r.repo.test(repoName)) return true;
  if (r.vscode && deps.vscode) return true;
  if (r.chromeExt && deps.chromeExt) return true;
  return false;
}

// manifests: [{ path, text }] · root: root entries (folders end in "/") · paths: every path we saw (may be just the root)
export function detect({ manifests = [], root = [], paths = [], workflows = 0, copilot = false, langs = [], repoName = '' }) {
  const ctx = { deps: parseManifests(manifests), names: root, paths, langs, workflows, copilot, repoName };
  const found = [];
  for (const [id, r] of Object.entries(RULES)) if (matches(r, ctx)) found.push(id);
  for (const [id, r] of Object.entries(EXTRA)) if (matches(r, ctx)) found.push(id);
  let out = found;
  // Unity projects are C#, but the Unity resident already covers them; Remix brings React Router along
  if (out.includes('unity')) out = out.filter(id => id !== 'dotnet');
  if (out.includes('remix')) out = out.filter(id => id !== 'reactrouter');
  // a repo that nothing else lives in gets its main language as a resident
  if (!out.some(id => !isAI(id)) && langs[0] && langs[0] !== 'Text') out.push(LANG + slug(langs[0]));
  return out;
}

// Human-readable "how we spot it" lines for the avatars page.
export function describe(id) {
  const r = RULES[id] || EXTRA[id];
  if (!r) return [];
  const out = [];
  if (r.js || r.jsPrefix) out.push(`npm: ${[...(r.js || []), ...(r.jsPrefix || []).map(p => p + '*')].join(', ')}`);
  if (r.py || r.pyPrefix) out.push(`pip: ${[...(r.py || []), ...(r.pyPrefix || []).map(p => p + '*')].join(', ')}`);
  ['go', 'rs', 'php', 'rb', 'dart', 'jvm'].forEach(k => { if (r[k]) out.push(`${k}: ${r[k].map(s => s.replace(/['"]/g, '')).join(', ')}`); });
  if (r.files) out.push(`files: ${r.files.map(f => (f instanceof RegExp ? f.label || f.source : f)).join(', ')}`);
  if (r.anywhere) out.push(`files: ${r.anywhere.map(f => f.label || ('*' + f.source.replace(/\(\^\|\\\/\)/g, '').replace(/\\\./g, '.').replace(/[$^\\]/g, '')).replace(/^\*(?=[A-Za-z])/, '')).join(', ')}`);
  if (r.langs) out.push(`language: ${r.langs.join(', ')}`);
  if (r.workflows) out.push('files: .github/workflows/');
  if (r.copilot) out.push('files: .github/copilot-instructions.md');
  if (r.repo) out.push('repo: <you>.github.io');
  if (r.vscode) out.push('package.json: engines.vscode');
  if (r.chromeExt) out.push('manifest.json: manifest_version');
  return out;
}
