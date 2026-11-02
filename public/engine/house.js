/* GitRoom house page: repo rooms (plus bonus rooms) in a lit pixel house, residents who use the furniture, fans and
   floating stars, free zoom, owner editing saved for everyone, and story / square / wallpaper images to share. */
(() => {
  const { SPR, textWidth, drawText, canvas, bubble, drawMap } = window.PX;
  const { BADGES, TIERS, TIER_NAMES, THEME_NAMES, WALLPAPERS, PETS } = window.DATA;
  const $ = s => document.querySelector(s);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmtSize = kb => kb >= 1024 ? `${(kb / 1024).toFixed(kb >= 10240 ? 0 : 1)} MB` : `${kb} KB`;
  const fmtN = n => Math.round(n).toLocaleString('en-US');
  const short = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M' : n >= 1e4 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'K' : fmtN(n);
  const fmt = (v, f) => f === 'k' ? short(v) : fmtN(v);
  const AI_IDS = ['claude', 'chatgpt', 'gemini', 'copilot', 'cursor'];
  let stage, cam, glc, ov, octx, tip, toastEl, wipe;

  // ---------- UI theme + toast ----------
  const darkNow = () => { const t = document.documentElement.dataset.theme; return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches; };
  let toastT;
  function toast(m) { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 4200); }

  // ---------- bonus rooms ----------
  // A house never has to look half built: small houses get filled up, and big accounts earn showcase rooms.
  const BONUS = {
    fame: { label: 'Hall of Fame', sign: 'HALL OF FAME', color: '#c8102e', fg: '#ffffff', why: s => `${s.years} ${s.years === 1 ? 'year' : 'years'} on GitHub, and a trophy for each one.` },
    observatory: { label: 'Observatory', sign: 'OBSERVATORY', color: '#1d1450', fg: '#ffd23f', why: s => `${fmtN(s.stars)} stars. Every star floating around the house stands for some of them.` },
    lounge: { label: 'Fan Lounge', sign: 'FAN LOUNGE', color: '#ff4f8b', fg: '#ffffff', why: s => `${fmtN(s.followers)} followers. Some of the fans dropped by.` },
    lab: { label: 'The Lab', sign: 'THE LAB', color: '#11a39a', fg: '#ffffff', why: s => s.repos ? `${s.repos} repos so far. This is where the next one gets cooked up.` : 'Where the first repo is getting cooked up.' },
    arcade: { label: 'Game Room', sign: 'GAME ROOM', color: '#7a4dff', fg: '#ffffff', why: () => 'Every house needs somewhere to unwind.' },
    kitchen: { label: 'Kitchen', sign: 'KITCHEN', color: '#ff8a3d', fg: '#ffffff', why: () => 'Snacks for late-night commits.' },
    greenhouse: { label: 'Greenhouse', sign: 'GREENHOUSE', color: '#2fbf71', fg: '#ffffff', why: s => `${s.days} commit days, and a plant for every 25.` },
  };
  function autoBonus(nRepo, st) {
    const out = [];
    if (st.years >= 5 || st.badges >= 4) out.push('fame');
    if (st.stars >= 25) out.push('observatory');
    if (st.followers >= 50) out.push('lounge');
    for (const id of ['lab', 'lounge', 'arcade', 'kitchen', 'greenhouse', 'fame', 'observatory']) {
      if (nRepo + out.length >= 5) break;
      if (out.includes(id) || (id === 'greenhouse' && !st.days) || (id === 'observatory' && !st.stars)) continue;
      out.push(id);
    }
    return out.slice(0, Math.max(0, 12 - nRepo));
  }

  // ---------- model ----------
  // published: the owner's newest house file on GitHub · settings: what the house shows (published, plus the owner's unpublished edits)
  let profile = null, owner = false, published = null, pubBranch = null, settings = null, rooms = [], residents = [], fans = [], custom = null, stats = null, login = '', attic = 0;
  const GAME = ['C++', 'C#', 'GDScript', 'GDShader', 'Lua'];
  const DATAFW = ['pytorch', 'tensorflow', 'sklearn', 'pandas', 'numpy', 'matplotlib', 'jupyter', 'opencv', 'mediapipe', 'huggingface', 'langchain', 'llamaindex', 'pinecone', 'jax', 'scipy', 'xgboost', 'spark', 'ray', 'mlflow', 'wandb', 'yolo', 'onnx', 'spacy', 'nltk'];
  const GAMEFW = ['sdl', 'pygame', 'godot', 'unity', 'bevy', 'three', 'phaser', 'pixi', 'babylon', 'ebiten', 'macroquad', 'libgdx', 'minecraft'];
  const themeOf = r => GAME.includes(r.main) || r.fw.some(f => GAMEFW.includes(f)) ? 'game' : r.fw.some(f => DATAFW.includes(f)) ? 'data' : ['Rust', 'Go', 'C', 'Shell', 'Makefile'].includes(r.main) ? 'sys' : 'web';
  const tierName = (i, theme) => (THEME_NAMES[theme] && THEME_NAMES[theme][i]) || TIER_NAMES[i];
  const visible = () => profile.repos;
  const byCommits = (a, b) => (b.commits || 0) - (a.commits || 0) || (b.pushed > a.pushed ? 1 : -1);
  const isAI = id => AI_IDS.includes(id) || !!(profile && profile.cast[id] && profile.cast[id].ai);
  // residents without a hand-drawn sprite get a placeholder made from their name and colour
  function castPlaceholders() {
    Object.entries(profile.cast || {}).forEach(([id, meta]) => { if (!SPR[id]) window.PX.placeholder(id, meta); });
    if (settings && settings.fixes) Object.values(settings.fixes).forEach(f => (f.add || []).forEach(id => {
      const meta = !SPR[id] && window.GitRoomData.castMeta(id);
      if (meta) { window.PX.placeholder(id, meta); profile.cast[id] = meta; }
    }));
  }
  function statsOf() {
    const reps = visible();
    return { years: Math.max(0, new Date().getFullYear() - profile.cal.since), stars: reps.reduce((a, r) => a + (r.stars || 0), 0), followers: profile.followers || 0, days: profile.cal.days || 0, badges: profile.badges.length, repos: reps.length };
  }
  // a repo's residents after the owner's fixes
  function fixedCast(r) {
    const f = settings && settings.fixes && settings.fixes[r.id];
    if (!f) return { fw: r.fw.filter(id => SPR[id]), ai: r.ai.filter(id => SPR[id]) };
    const all = [...new Set([...r.fw, ...r.ai, ...(f.add || [])])].filter(id => !(f.remove || []).includes(id) && SPR[id]);
    return { fw: all.filter(id => !isAI(id)), ai: all.filter(isAI) };
  }
  function pickRepos() {
    const vis = visible();
    if (settings && Array.isArray(settings.rooms) && settings.rooms.length) {
      const chosen = vis.filter(r => settings.rooms.includes(r.id));
      if (chosen.length) return chosen.sort(byCommits).slice(0, 10);
    }
    return vis.filter(r => r.detailed).sort(byCommits).slice(0, 10);
  }
  function buildModel() {
    stats = statsOf();
    rooms = pickRepos().map((r, i) => {
      const cast = fixedCast(r), repo = { ...r, commits: r.commits || 0, fw: cast.fw, ai: cast.ai }, n = repo.commits;
      return { key: 'r' + i, repo, label: r.name, sign: (r.name.length > 16 ? r.name.slice(0, 14) + '..' : r.name).toUpperCase(), color: r.color, fg: r.fg, weight: n, sizeKB: r.sizeKB, tiers: TIERS.filter(t => n >= t).length, theme: themeOf(repo) };
    });
    const ws = rooms.map(r => r.weight).sort((a, b) => a - b), mid = ws.length ? ws[Math.floor(ws.length / 2)] : 8;
    const bonus = settings && Array.isArray(settings.bonus) ? settings.bonus.filter(id => BONUS[id]).slice(0, 12 - rooms.length) : autoBonus(rooms.length, stats);
    bonus.forEach(id => rooms.push({ key: 's-' + id, special: id, label: BONUS[id].label, sign: BONUS[id].sign, color: BONUS[id].color, fg: BONUS[id].fg, weight: clamp(mid, 6, 80), sizeKB: 0, tiers: 0, theme: 'special', stats }));
    const map = new Map();
    rooms.filter(rm => rm.repo).forEach(rm => [...rm.repo.fw, ...rm.repo.ai].forEach(id => {
      if (!SPR[id]) return;
      if (!map.has(id)) map.set(id, { id, ai: rm.repo.ai.includes(id), homes: [] });
      map.get(id).homes.push(rm.key);
    }));
    // Six residents per room at most, so a busy repo doesn't turn into a wall of name tags: hand-drawn sprites move in
    // first, then placeholders, then language creatures. Someone with no space left tries their next room.
    const rank = id => (SPR[id].lang ? 2 : SPR[id].placeholder ? 1 : 0), load = {}, ROOM_CAP = 6, AI_CAP = 5;
    let aiN = 0;
    residents = [];
    [...map.values()].sort((a, b) => rank(a.id) - rank(b.id)).forEach(r => {
      if (r.ai) { if (aiN++ < AI_CAP) residents.push({ ...r, home: 'hall' }); return; }
      const home = r.homes.find(k => (load[k] || 0) < ROOM_CAP);
      if (home) { load[home] = (load[home] || 0) + 1; residents.push({ ...r, home }); }
    });
    attic = map.size - residents.length;
    // fans don't come inside: they're the crowd cheering out on the lawn (see buildCrowd)
    fans = [];
  }
  const roomByKey = k => rooms.find(r => r.key === k);
  const roomLabel = k => k === 'hall' ? 'the hallways' : (roomByKey(k) ? roomByKey(k).label : k);

  // ---------- look: the owner's choices (only the owner can change them, and only from a connected browser) ----------
  const cdays = () => profile.cal.days || 0;
  const unlocked = d => cdays() >= d;
  const LOOK = ['name', 'paper', 'pet', 'light', 'tags'];
  function loadCustom() {
    const saved = {};
    if (settings) LOOK.forEach(k => { if (settings[k] !== undefined) saved[k] = settings[k]; });
    custom = { name: profile.house, paper: 'teal', pet: 'cat', light: 'auto', tags: true, ...saved };
    if (!unlocked((WALLPAPERS.find(w => w.id === custom.paper) || { days: 1e9 }).days)) custom.paper = 'teal';
    if (!unlocked((PETS.find(p => p.id === custom.pet) || { days: 1e9 }).days)) custom.pet = 'cat';
  }
  // the owner's edits so far, as house-file settings
  function currentSettings() {
    const s = { ...(settings || {}) };
    LOOK.forEach(k => { s[k] = custom[k]; });
    if (s.name === profile.house) delete s.name;
    if (Number.isInteger(shuffle) && shuffle > 0) s.layout = shuffle; else delete s.layout;
    if (published && published.keys) s.keys = published.keys;
    return window.GitRoomData.cleanSettings(s);
  }
  const same = (a, b) => JSON.stringify(window.GitRoomData.cleanSettings(a || {})) === JSON.stringify(window.GitRoomData.cleanSettings(b || {}));
  let dirty = false;
  function saveCustom() {
    if (!owner) return;
    settings = currentSettings();
    dirty = !same(settings, published);
    window.GitRoomData.setDraft(login, dirty ? settings : null);
    markDirty();
  }
  const paper = () => (WALLPAPERS.find(w => w.id === custom.paper) || WALLPAPERS[0]).c;
  function lightMode() { if (custom.light !== 'auto') return custom.light; const h = new Date().getHours(); return h >= 6 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'sunset' : 'night'; }

  // ---------- house ----------
  let shuffle = 0, P = null, base = null, lightBuf = null, walkers = [], cellCache = {}, introT = 99, roomVisible = false, clock = 0, parts = [], lastMode = null, R = null, lightCache = {};
  let shadow = null;
  const badgeDefs = () => profile.badges.map(([k]) => BADGES[k] || BADGES.medal);
  function paint() {
    base = window.LAYOUT.albedo(P, badgeDefs(), paper());
    R.setHouse(base, P.W, P.H);
    ov.width = P.W; ov.height = P.H;
    [glc, ov, cam].forEach(el => { el.style.width = P.W + 'px'; el.style.height = P.H + 'px'; });
  }
  const mapsFor = m => lightCache[m] || (lightCache[m] = window.LAYOUT.bake(P, m));
  function relight() { if (!P) return; lastMode = lightMode(); const maps = mapsFor(lastMode); lightBuf = maps.light; R.setLight(maps); walkers.forEach(w => { w.tintT = 0; }); }
  function makeHouse(intro) {
    let next = null, list = rooms;
    const seed = profile.seed + shuffle * 1013;
    for (;;) {
      for (let k = 0; k < 8 && !next; k++) next = window.LAYOUT.plan(list, profile.badges.length, seed + k * 31337, profile.cal, { pad: crowdPad(crowdSize()), below: crowdBelow(crowdSize()) });
      const last = list.map(r => !!r.special).lastIndexOf(true);
      if (next || last < 0) break;
      list = list.filter((_, i) => i !== last); // too many rooms to fit: a bonus room steps aside
    }
    if (!next) { toast("Couldn't fit that many rooms. Try New layout."); if (!P) return; } else { P = next; rooms = list; }
    lightCache = {};
    paint(); relight();
    cellCache = {}; signpost = null; post = null; parts = [];
    buildSpots();
    walkers = residents.map((res, i) => spawn(res, i));
    spawnPet();
    buildStars();
    buildCrowd();
    introT = intro && !reduce ? 0 : 99;
    fitStage();
    zoomTo(null, true);
  }
  // on phones the stage takes the house's shape instead of a tall box with white bands
  function fitStage() {
    if (!P || window.innerWidth >= 900) { stage.style.height = ''; return; }
    const b = bounds(), want = stage.clientWidth * (b.h + 8) / (b.w + 8) + 62;
    stage.style.height = Math.round(Math.max(360, Math.min(window.innerHeight * .8, want))) + 'px';
  }
  function spawn(res, i) {
    const [cx, cy] = pickCell(res.home);
    return { res, s: SPR[res.id], i, x: cx * 8 + 4, y: cy * 8 + 7, zone: res.home, dest: res.home, path: [], state: 'idle', wait: rand(.2, 1.6), facing: Math.random() < .5 ? -1 : 1, anim: rand(0, 1), blink: 0, blinkT: rand(1, 5), hop: 0, say: null, tint: [1, 1, 1], tintT: 0, task: null, useT: 0, stand: null };
  }
  function spawnPet() {
    walkers.filter(w => w.res.pet).forEach(release);
    walkers = walkers.filter(w => !w.res.pet);
    if (custom.pet !== 'none' && SPR[custom.pet]) walkers.push(spawn({ id: custom.pet, pet: true, ai: true, homes: [], home: 'hall' }, walkers.length));
  }
  const cells = id => cellCache[id] || (cellCache[id] = P.cellsOf(id));
  function pickCell(id) { let l = cells(id); if (!l.length) l = cells('hall'); if (!l.length) l = cells('*'); return l[Math.floor(Math.random() * l.length)] || [1, 1]; }
  function bfs(s, t) {
    const { GW, GH, walk } = P, prev = new Int32Array(GW * GH).fill(-1), q = new Int32Array(GW * GH), si = s[1] * GW + s[0], ti = t[1] * GW + t[0];
    if (!walk[si] || !walk[ti] || si === ti) return null;
    let h = 0, e = 0;
    q[e++] = si; prev[si] = si;
    while (h < e) {
      const c = q[h++];
      if (c === ti) break;
      const x = c % GW, y = (c - x) / GW;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, n = ny * GW + nx; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || prev[n] !== -1 || !walk[n]) continue; prev[n] = c; q[e++] = n; }
    }
    if (prev[ti] === -1) return null;
    const out = [];
    for (let c = ti; c !== si; c = prev[c]) out.push([c % GW, Math.floor(c / GW)]);
    out.reverse();
    return out.filter((p, i) => { const a = out[i - 1], b = out[i + 1]; return !a || !b || (p[0] - a[0]) !== (b[0] - p[0]) || (p[1] - a[1]) !== (b[1] - p[1]); });
  }

  // ---------- furniture people actually use ----------
  // screen: the item's screen in its own pixels, lit up while someone is on it; seat: sit in it rather than stand by it
  const USES = {
    desk: { icon: 'code', act: 'type', screen: [7, 2, 10, 6] },
    whiteboard: { icon: 'idea', act: 'type' },
    rack: { icon: 'bang', act: 'type' },
    labBench: { icon: 'flask', act: 'type', bubbles: [[6, 4], [15, 4]] },
    tvstand: { icon: 'heart', act: 'watch', screen: [4, 2, 16, 10], gap: 2 },
    arcade: { icon: 'game', act: 'play', screen: [4, 7, 6, 5] },
    bookshelf: { icon: 'book', act: 'read' }, gameshelf: { icon: 'game', act: 'read' }, jarShelf: { icon: 'flask', act: 'read' },
    telescope: { icon: 'star', act: 'look' },
    plantSmall: { icon: 'drop', act: 'water' }, plantTall: { icon: 'drop', act: 'water' },
    couchBack: { icon: 'heart', act: 'sit', seats: [10, 24], seatY: 6 },
    beanbag: { icon: 'zzz', act: 'sit', seats: [7], seatY: 8, cover: 5 },
    trophy: { icon: 'star', act: 'cheer' }, guitar: { icon: 'note', act: 'play' },
    fridge: { icon: 'snack', act: 'read' }, table: { icon: 'snack', act: 'type' },
  };
  let spots = [];
  function buildSpots() {
    spots = [];
    P.items.forEach(it => {
      const u = USES[it.kind];
      if (it.rug || !u || !it.cell) return;
      const c = it.cell, front = c.y + c.d + (u.gap || 1) - 1, cands = [];
      for (let y = c.y + c.d; y <= front + 2; y++) for (let x = c.x - 1; x <= c.x + c.w; x++) cands.push([x, y, Math.abs(x - (c.x + (c.w - 1) / 2)) + Math.abs(y - front) * 1.3]);
      cands.sort((a, b) => a[2] - b[2]);
      const hit = cands.find(([x, y]) => x > 0 && y > 0 && x < P.GW && y < P.GH && P.walk[y * P.GW + x] && P.roomAt(x * 8 + 4, y * 8 + 4) === it.room);
      if (!hit) return;
      (u.seats || [null]).forEach(sx => spots.push({ it, u, cell: [hit[0], hit[1]], room: it.room, busy: null, seat: sx == null ? null : { x: it.x + sx, y: it.y + u.seatY } }));
    });
  }
  function chooseSpot(w) {
    const open = spots.filter(s => !s.busy);
    if (!open.length) return null;
    let pool = open;
    if (w.res.pet) pool = open.filter(s => s.u.act === 'sit' || s.u.act === 'water');
    else if (w.res.fan) pool = open.filter(s => ['watch', 'play', 'sit', 'cheer', 'look'].includes(s.u.act));
    else { const mine = open.filter(s => w.res.homes.includes(s.room)); if (mine.length && Math.random() < .7) pool = mine; }
    return pool.length ? pick(pool) : null;
  }
  function release(w) {
    if (!w.task) return;
    if (w.stand) { w.x = w.stand.x; w.y = w.stand.y; w.stand = null; }
    w.task.busy = null; w.task = null;
  }
  function beginUse(w, long) {
    const sp = w.task;
    w.state = 'use'; w.useT = long ? rand(7, 12) : rand(4, 9); w.zone = sp.room;
    w.facing = sp.it.x + sp.it.item.w / 2 < w.x ? -1 : 1;
    if (sp.seat) { w.stand = { x: w.x, y: w.y }; w.x = sp.seat.x; w.y = sp.seat.y; w.facing = Math.random() < .5 ? -1 : 1; }
  }
  function endUse(w) { release(w); w.state = 'idle'; w.wait = rand(.6, 2); }

  function plan(w) {
    const keys = rooms.map(r => r.key), r = Math.random(), h = w.res.homes;
    const from = [Math.floor(w.x / 8), Math.floor(w.y / 8)];
    if (!P.walk[from[1] * P.GW + from[0]]) { const c = pickCell(w.zone); w.x = c[0] * 8 + 4; w.y = c[1] * 8 + 7; w.wait = .5; return; }
    if (Math.random() < (w.res.pet ? .3 : .45)) {
      const sp = chooseSpot(w), path = sp && bfs(from, sp.cell);
      if (sp && sp.cell[0] === from[0] && sp.cell[1] === from[1]) { w.task = sp; sp.busy = w; beginUse(w); return; }
      if (path && path.length) { w.task = sp; sp.busy = w; w.path = path.map(([cx, cy]) => [cx * 8 + 4, cy * 8 + 7]); w.dest = sp.room; w.state = 'walk'; return; }
    }
    let dest;
    if (w.res.pet || w.res.fan) dest = r < .5 ? 'hall' : pick(keys);
    else if (w.res.ai) dest = r < .35 ? 'hall' : r < .7 && h.length ? pick(h) : pick(keys);
    else dest = r < .58 ? w.res.home : r < .74 && h.length > 1 ? pick(h) : r < .9 ? 'hall' : pick(keys);
    const path = bfs(from, pickCell(dest));
    if (!path || !path.length) { w.wait = rand(.4, 1.2); return; }
    w.path = path.map(([cx, cy]) => [cx * 8 + 4, cy * 8 + 7]); w.dest = dest; w.state = 'walk';
  }
  const speak = (w, t) => { w.say = { c: bubble(t || pick(w.s.q)), t: 2.4 }; };
  function ping(w) {
    w.hop = .45; speak(w, w.res.pet ? pick(w.s.q) : w.res.fan ? `♥ @${profile.handle.toUpperCase()}` : 'HI!');
    for (let i = 0; i < 5; i++) parts.push({ k: 'heart', x: w.x + rand(-6, 6), y: w.y - 14, vy: rand(-26, -14), vx: rand(-8, 8), t: rand(.7, 1.1) });
  }
  function update(dt) {
    introT += dt;
    parts = parts.filter(p => (p.t -= dt) > 0);
    parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; if (p.k === 'drop') p.vy += 60 * dt; });
    updateStars(dt);
    updateCrowd(dt);
    walkers.forEach(w => {
      w.anim += dt; w.hop = Math.max(0, w.hop - dt);
      if (w.say && (w.say.t -= dt) <= 0) w.say = null;
      if (w.blink > 0) w.blink -= dt; else if ((w.blinkT -= dt) <= 0) { w.blink = .14; w.blinkT = rand(2, 5.5); }
      if ((w.tintT -= dt) <= 0) { w.tintT = .25; w.tint = lightAt(w.x, w.y - 4); }
      if (reduce || introT < 1.1 + w.i * .05) return;
      if (w.state === 'use') { useTick(w, dt); if ((w.useT -= dt) <= 0) endUse(w); return; }
      if (w.state === 'idle') { if ((w.wait -= dt) <= 0) plan(w); return; }
      if (!w.path.length) { w.state = 'idle'; w.wait = rand(.5, 1.5); return; }
      const [tx, ty] = w.path[0], dx = tx - w.x, dy = ty - w.y, dist = Math.hypot(dx, dy), step = (w.res.pet ? 24 : w.res.ai ? 20 : 17) * dt;
      if (Math.abs(dx) > .4) w.facing = dx < 0 ? -1 : 1;
      if (dist <= step) {
        w.x = tx; w.y = ty; w.path.shift();
        if (!w.path.length) {
          w.zone = w.dest;
          if (w.task) beginUse(w);
          else { w.state = 'idle'; w.wait = rand(.9, 3.4); if (Math.random() < .35) speak(w); }
        }
      } else { w.x += dx / dist * step; w.y += dy / dist * step; }
    });
  }
  // little effects while a piece of furniture is in use
  function useTick(w, dt) {
    const sp = w.task, it = sp.it, u = sp.u;
    w.fx = (w.fx || 0) - dt;
    if (w.fx > 0) return;
    if (u.act === 'water') { w.fx = .18; parts.push({ k: 'drop', x: it.x + it.item.w / 2 + rand(-3, 3), y: it.y + 2, vx: rand(-4, 4), vy: rand(-10, 0), t: .5 }); }
    else if (u.bubbles) { w.fx = .35; const [bx, by] = pick(u.bubbles); parts.push({ k: 'bubble', c: pick(['#3dffd0', '#ff7ae0', '#b6ff6a', '#ffd23f']), x: it.x + bx, y: it.y + by, vx: rand(-2, 2), vy: rand(-14, -8), t: rand(.6, 1) }); }
    else if (u.icon === 'note') { w.fx = .7; parts.push({ k: 'note', x: w.x + rand(-4, 4), y: w.y - 16, vx: rand(-6, 6), vy: -14, t: 1.1 }); }
    else if (u.act === 'cheer') { w.fx = 1.2; w.hop = .45; parts.push({ k: 'spark', x: it.x + it.item.w / 2, y: it.y + 4, vx: rand(-10, 10), vy: rand(-18, -8), t: .7 }); }
    else w.fx = 1;
  }
  function lightAt(x, y) {
    if (!lightBuf || !P) return [1, 1, 1];
    const k = (Math.max(0, Math.min(P.H - 1, Math.round(y))) * P.W + Math.max(0, Math.min(P.W - 1, Math.round(x)))) * 4;
    return [0, 1, 2].map(i => Math.min(1, .5 + lightBuf[k + i] / 255 * 2 * .55));
  }
  function frameOf(w) {
    let k = w.blink > 0 ? 'blink' : 'stand';
    if (!reduce) {
      if (w.state === 'walk') { if (Math.floor(w.anim / .17) % 2) k = 'step'; }
      else if (w.state === 'use') { const a = w.task.u.act; if ((a === 'type' && Math.floor(w.anim / .2) % 2) || (a === 'play' && Math.floor(w.anim / .12) % 2)) k = 'step'; }
      else if (w.s.float && Math.floor(w.anim / .55) % 2) k = 'step';
    }
    return w.s.frames[k + (w.facing < 0 ? 'F' : '')];
  }
  let tmp = null, tctx = null;
  function tinted(src, sw, sh, [r, g, b]) {
    if (tmp.width < sw || tmp.height < sh) { tmp.width = Math.max(tmp.width, sw); tmp.height = Math.max(tmp.height, sh); }
    tctx.globalCompositeOperation = 'source-over'; tctx.clearRect(0, 0, tmp.width, tmp.height); tctx.drawImage(src, 0, 0);
    tctx.globalCompositeOperation = 'multiply'; tctx.fillStyle = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`; tctx.fillRect(0, 0, sw, sh);
    tctx.globalCompositeOperation = 'destination-in'; tctx.drawImage(src, 0, 0);
    tctx.globalCompositeOperation = 'source-over';
    return tmp;
  }
  // the front of a couch or beanbag, redrawn over whoever is sitting in it
  const coverCache = new Map();
  function coverOf(it, from) {
    const key = it.x + ',' + it.y;
    if (coverCache.has(key)) return coverCache.get(key);
    const c = canvas(it.item.w, it.item.h), x = c.getContext('2d'), img = x.createImageData(it.item.w, it.item.h);
    it.item.px.forEach((col, i) => { if (!col || Math.floor(i / it.item.w) < from) return; const n = parseInt(col.slice(1), 16); img.data.set([(n >> 16) & 255, (n >> 8) & 255, n & 255, 255], i * 4); });
    x.putImageData(img, 0, 0);
    coverCache.set(key, c);
    return c;
  }

  // ---------- stars: as many as the account has, in coins of 1, 10, 100, 1000… ----------
  const DENOMS = [[100000, 'mega', 13, '#d6b8ff', '#4a2a8a'], [10000, 'giant', 11, '#7af0ff', '#0a4a5c'], [1000, 'big', 9, '#ff8fe0', '#6b1a55'], [100, 'mid', 7, '#ffb02e', '#6b3a00'], [10, 'small', 5, '#ffd23f', '#6b4a00'], [1, 'tiny', 3, '#fff3a0', '#6b5a1a']];
  const STARS = {};
  function starArt() {
    DENOMS.forEach(([v, k, n, fill, line]) => {
      const pad = 2, W = n + pad * 2, c = canvas(W, W), x = c.getContext('2d'), on = new Uint8Array(W * W), R0 = n / 2, R1 = R0 * .48, cx = W / 2, cy = W / 2 + (n > 3 ? .3 : 0);
      const inside = (px, py) => {
        if (n === 3) return Math.abs(px - cx) + Math.abs(py - cy) <= 1.5 && (Math.abs(px - cx) < 1 || Math.abs(py - cy) < 1);
        const a = Math.atan2(py - cy, px - cx) + Math.PI / 2, rr = Math.hypot(px - cx, py - cy), seg = (a % (Math.PI * 2 / 5) + Math.PI * 2 / 5) % (Math.PI * 2 / 5) / (Math.PI * 2 / 5);
        return rr <= R1 + (R0 - R1) * (1 - Math.abs(seg - .5) * 2) * 1.02;
      };
      for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) if (inside(i + .5, j + .5)) on[j * W + i] = 1;
      const has = (i, j) => i >= 0 && j >= 0 && i < W && j < W && on[j * W + i];
      for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
        if (has(i, j)) { x.fillStyle = Math.abs(i + .5 - cx) < 1.2 && Math.abs(j + .5 - cy) < 1.2 ? '#ffffff' : fill; x.fillRect(i, j, 1, 1); }
        else if (has(i - 1, j) || has(i + 1, j) || has(i, j - 1) || has(i, j + 1)) { x.fillStyle = line; x.fillRect(i, j, 1, 1); }
      }
      STARS[k] = { c, W, v, fill };
    });
  }
  let starObjs = [];
  function starsFor(n) { const out = []; for (const [v, k] of DENOMS) { let c = Math.floor(n / v); n -= c * v; while (c-- > 0) out.push({ v, k }); } return out; }
  function buildStars() {
    starObjs = [];
    const shown = new Set(rooms.filter(r => r.repo).map(r => r.repo.id)), home = roomByKey('s-observatory') ? 's-observatory' : 'hall';
    const groups = rooms.filter(r => r.repo && r.repo.stars > 0).map(r => ({ room: r.key, n: r.repo.stars, label: r.label }));
    const rest = visible().filter(r => !shown.has(r.id)).reduce((a, r) => a + (r.stars || 0), 0);
    if (rest) groups.push({ room: home, n: rest, label: 'repos without a room' });
    groups.forEach(g => starsFor(g.n).slice(0, 14).forEach(p => {
      const [cx, cy] = pickCell(g.room);
      starObjs.push({ ...p, room: g.room, total: g.n, label: g.label, x: cx * 8 + 4, y: cy * 8 + 4, tx: cx * 8 + 4, ty: cy * 8 + 4, ph: rand(0, 6), tw: rand(1, 4), sp: rand(3, 6) });
    }));
  }
  function updateStars(dt) {
    starObjs.forEach(s => {
      const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy);
      if (d < 1) { const [cx, cy] = pickCell(s.room); s.tx = cx * 8 + 4 + rand(-3, 3); s.ty = cy * 8 + 4 + rand(-3, 3); }
      else { s.x += dx / d * s.sp * dt; s.y += dy / d * s.sp * dt; }
      if ((s.tw -= dt) < -.16) s.tw = rand(1.2, 4);
    });
  }
  const starTop = s => s.y - 11 + Math.round(Math.sin(clock * 1.6 + s.ph) * 1.5);
  function drawStars(x) {
    starObjs.forEach(s => { const a = STARS[s.k]; x.fillStyle = 'rgba(40,10,0,.22)'; x.fillRect(Math.round(s.x - a.W / 4), Math.round(s.y), Math.max(2, Math.round(a.W / 2)), 1); });
    starObjs.slice().sort((a, b) => a.y - b.y).forEach(s => {
      const a = STARS[s.k], px = Math.round(s.x - a.W / 2), py = Math.round(starTop(s) - a.W / 2);
      // a one-pixel bloom in the star's own shape (big stars only: on tiny ones it doesn't show)
      if (a.W >= 11) { x.globalAlpha = .3; [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => x.drawImage(a.c, px + dx, py + dy)); x.globalAlpha = 1; }
      x.drawImage(a.c, px, py);
      if (s.tw < 0) { x.fillStyle = '#ffffff'; const cx = Math.round(s.x), cy = Math.round(starTop(s)); x.fillRect(cx - 1 - (a.W >> 1), cy, 1, 1); x.fillRect(cx + (a.W >> 1), cy, 1, 1); x.fillRect(cx, cy - 1 - (a.W >> 1), 1, 1); }
    });
  }

  // ---------- little pixel icons for "what am I doing" ----------
  const ICON_MAPS = {
    code: { k: '#2ead33', map: ['..k...k..', '.k...k.k.', 'k...k...k', '.k.k...k.', '..k...k..'] },
    idea: { y: '#ffd23f', k: '#24163b', map: ['.yyy.', 'yyyyy', 'yyyyy', '.yyy.', '.kkk.'] },
    bang: { r: '#ff3b5c', map: ['.r.', '.r.', '.r.', '...', '.r.'] },
    flask: { g: '#3dffd0', w: '#c9f2ff', map: ['.w.', '.w.', 'ggg', 'ggg', '.g.'] },
    heart: { r: '#ff3b5c', map: ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'] },
    game: { k: '#24163b', g: '#3dff8a', r: '#ff3b5c', map: ['.kkkkk.', 'kgkkkrk', 'kkkkkkk', '.k...k.'] },
    book: { b: '#3ab0ff', c: '#ff4f8b', k: '#24163b', map: ['bb.cc', 'bb.cc', 'bbkcc', '.....'] },
    star: { y: '#ffc83a', map: ['..y..', '.yyy.', 'yyyyy', '.y.y.', 'y...y'] },
    drop: { b: '#3ab0ff', map: ['..b..', '.bbb.', 'bbbbb', '.bbb.'] },
    zzz: { k: '#5a4fb0', map: ['kkk..', '..k..', '.kkkk', 'kkk.k', '..kkk'] },
    note: { k: '#24163b', map: ['..kk', '..kk', '..k.', 'kkk.', 'kk..'] },
    snack: { c: '#c98a55', d: '#5a2e14', map: ['.ccc.', 'cdccc', 'cccdc', '.ccc.'] },
  };
  const ICONS = {};
  // each icon sits in a tiny white thought bubble with an ink rim and a little tail
  function iconArt() {
    for (const k in ICON_MAPS) {
      const m = ICON_MAPS[k], w = m.map[0].length, h = m.map.length, W = w + 6, BH = h + 4, c = canvas(W, BH + 2), x = c.getContext('2d'), mid = Math.floor(W / 2);
      x.fillStyle = '#24163b'; x.fillRect(1, 0, W - 2, BH); x.fillRect(0, 1, W, BH - 2); x.fillRect(mid - 1, BH, 3, 1); x.fillRect(mid, BH + 1, 1, 1);
      x.fillStyle = '#ffffff'; x.fillRect(1, 1, W - 2, BH - 2);
      m.map.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (m[row[i]]) { x.fillStyle = m[row[i]]; x.fillRect(3 + i, 2 + j, 1, 1); } });
      ICONS[k] = c;
    }
  }

  // ---------- drawing ----------
  const drawY = w => Math.round(w.y - w.s.bottom);
  let signpost = null, post = null;
  function makeSignpost() {
    const nm = (custom.name || profile.house).toUpperCase().slice(0, 18), est = `EST. ${profile.cal.since}`, w = Math.max(textWidth(nm), textWidth(est)) + 8, c = canvas(w, 26), x = c.getContext('2d');
    x.fillStyle = '#3a1a0c'; x.fillRect(Math.floor(w / 2) - 1, 16, 3, 10); x.fillRect(1, 0, w - 2, 17); x.fillRect(0, 1, w, 15);
    x.fillStyle = '#c98a55'; x.fillRect(1, 1, w - 2, 15); x.fillStyle = '#e8ad78'; x.fillRect(1, 1, w - 2, 1);
    drawText(x, nm, Math.round((w - textWidth(nm)) / 2), 3, '#2a120a'); drawText(x, est, Math.round((w - textWidth(est)) / 2), 10, '#6e3a1c');
    return c;
  }
  // the signpost stands on open lawn near the front door, never inside the house
  function ensurePost() {
    if (!signpost) { signpost = makeSignpost(); const p = P.spotFor(signpost.width, signpost.height); post = { x: p.x, y: p.y, w: signpost.width, h: signpost.height }; }
    return post;
  }
  // the house plus its signpost (and, on the page, the crowd), kept inside the canvas
  // (drawImage draws nothing at all from a source rect that spills over)
  function bounds(withCrowd = true) {
    const p = ensurePost(), h = P.house, c = (withCrowd && crowdBox) || { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    const x0 = Math.max(0, Math.min(h.x, p.x - 4, c.x0 - 2)), y0 = Math.max(0, Math.min(h.y, p.y - 4, c.y0 - 2));
    const x1 = Math.min(P.W, Math.max(h.x + h.w, p.x + p.w + 4, c.x1 + 2)), y1 = Math.min(P.H, Math.max(h.y + h.h, p.y + p.h + 4, c.y1 + 2));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  // ---------- the crowd: one fan per follower, cheering on the lawn outside ----------
  const CROWD_MAX = 3000;
  let crowd = [], crowdBox = null, banner = null, crowdHeartT = 0, crowdSayT = 2, crowdSay = null, heartCard = null, fanTest = null;
  const fanCount = () => (fanTest != null ? fanTest : stats ? stats.followers : 0);
  const crowdSize = () => Math.min(fanCount(), CROWD_MAX);
  // GAP: cells of open lawn fans keep from the walls. CLIMB: extra cost per row of walking up past the front of the
  // house. DEPTH: how much standing further out costs (it grows with the square). NOOK: gaps narrower than about twice
  // this, boxed in by the house, stay empty. (Costs are in thirds of a cell: walking one cell costs 3.)
  const GAP = 3, CLIMB = 1, DEPTH = 1.1, NOOK = 6;
  // extra lawn around the house so a big crowd fits (about one more cell for every 240 fans), plus the gap from the walls
  const crowdPad = n => (n ? clamp(GAP + 1 + Math.ceil(n / 240), 0, 20) : 0);
  // the crowd starts on the path below the house and stacks up from there, so it gets more lawn below too
  const crowdBelow = n => (n ? clamp(Math.round(Math.sqrt(n) / 3), 1, 14) : 0);
  const cheers = () => ['WOOO!', `♥ @${profile.handle.toUpperCase()}`, 'LEGEND!', 'SHIP IT!', 'BIG FAN!', 'ONE MORE COMMIT!', 'FOLLOWING ♥', 'HELLO!!'];
  function makeBanner(text) {
    const w = textWidth(text) + 10, c = canvas(w, 21), x = c.getContext('2d');
    x.fillStyle = '#3a1a0c'; x.fillRect(2, 9, 2, 12); x.fillRect(w - 4, 9, 2, 12);
    x.fillStyle = '#24163b'; x.fillRect(1, 0, w - 2, 11); x.fillRect(0, 1, w, 9);
    x.fillStyle = '#ff4f8b'; x.fillRect(1, 1, w - 2, 9); x.fillStyle = '#ff8fb5'; x.fillRect(1, 1, w - 2, 1);
    drawText(x, text, 5, 3, '#ffffff');
    return c;
  }
  const fanSprite = r => SPR['fan' + (1 + Math.floor(r() * 6))] || SPR.fan1;
  const newFan = (r, extra) => ({ s: fanSprite(r), ph: r() * 6.3, hz: 5 + r() * 4.5, amp: r() < .3 ? 0 : 1.5 + r() * 2.5, wave: r() < .3, flip: r() < .5, sign: r() < .12, ...extra });
  let aisle = null;
  function buildCrowd() {
    crowd = []; crowdBox = null; banner = null; crowdSay = null; crowdCache = null; aisle = null;
    const n = crowdSize();
    if (!n || !P) return;
    const { GW, GH, type } = P, N = GW * GH, outside = new Uint8Array(N), q = [];
    const push = (x, y) => { if (x < 0 || y < 0 || x >= GW || y >= GH) return; const k = y * GW + x; if (outside[k] || type[k] !== 0) return; outside[k] = 1; q.push(k); };
    // only lawn reachable from the edge counts as outside, so courtyards inside the house stay empty
    for (let x = 0; x < GW; x++) { push(x, 0); push(x, GH - 1); }
    for (let y = 0; y < GH; y++) { push(0, y); push(GW - 1, y); }
    for (let h = 0; h < q.length; h++) { const k = q[h], x = k % GW, y = (k - x) / GW; push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }
    // distance to the nearest 0 in F, with rounded corners (a 3-4 chamfer distance, so 3 = one cell); `edge` lies beyond the canvas
    const chamfer = (F, edge) => {
      const at = (x, y) => (x < 0 || y < 0 || x >= GW || y >= GH ? edge : F[y * GW + x]);
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const k = y * GW + x; if (F[k]) F[k] = Math.min(F[k], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4); }
      for (let y = GH - 1; y >= 0; y--) for (let x = GW - 1; x >= 0; x--) { const k = y * GW + x; if (F[k]) F[k] = Math.min(F[k], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4); }
      return F;
    };
    // how far each patch of lawn is from the house
    const D = chamfer(Float32Array.from(outside, o => (o ? 1e9 : 0)), 1e9);
    // nooks the house boxes in on several sides (like the gap in front of a recessed door) stay empty: that's lawn more
    // than NOOK cells from the open lawn, where open means NOOK cells clear of the house
    const E = chamfer(D.map(d => (d > 3 * NOOK ? 0 : 1e9)), 0);
    const p = ensurePost(), ww = P.walkway, dx = (ww.l + ww.r + 1) / 2, doorY = ww.row;
    // The crowd gathers on the path in front of the house, below its lowest wall and below the signpost, and grows from
    // there: rows deep in front first, then up the sides, and only a big crowd makes it round the back. G is the walk
    // from that spot across the lawn (3 = one cell), so the crowd wraps round the house instead of through it; every
    // row climbed above the starting row costs CLIMB more.
    let bottom = doorY;
    for (let k = 0; k < N; k++) if (!outside[k]) bottom = Math.max(bottom, (k - k % GW) / GW);
    const startY = clamp(Math.max(bottom + 1 + GAP, Math.floor((p.y + p.h - 1) / 8) + 1), doorY, GH - 2);
    const G = new Float32Array(N).fill(1e9), queue = [];
    const reach = (k, d) => { if (d < G[k]) { G[k] = d; (queue[d] || (queue[d] = [])).push(k); } };
    for (let x = ww.l; x <= ww.r; x++) if (outside[startY * GW + x]) reach(startY * GW + x, 0);
    if (!queue.length) for (let x = ww.l; x <= ww.r; x++) for (let y = doorY; y < GH; y++) if (outside[y * GW + x]) { reach(y * GW + x, 0); break; }
    for (let d = 0; d < queue.length; d++) {
      if (queue[d]) for (const k of queue[d]) {
        if (G[k] !== d) continue;
        const x = k % GW, y = (k - x) / GW;
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
          const nx = x + i, ny = y + j;
          if ((i || j) && nx >= 0 && ny >= 0 && nx < GW && ny < GH && outside[ny * GW + nx]) reach(ny * GW + nx, d + (i && j ? 4 : 3) + (j < 0 && ny < startY ? CLIMB : 0));
        }
      }
    }
    // the first few rows out are free, so a small crowd huddles round the path evenly; a big one spreads round instead
    const free = clamp(5 - n / 500, 0, 4);
    let spots = [];
    for (let y = 1; y < GH - 1; y++) for (let x = 1; x < GW - 1; x++) {
      const k = y * GW + x;
      if (!outside[k] || G[k] >= 1e9) continue;
      const px = x * 8, py = y * 8;
      // the signpost stays visible, and an aisle runs straight out from the front door
      if (px + 8 > p.x - 4 && px < p.x + p.w + 4 && py + 8 > p.y - 6 && py < p.y + p.h + 8) continue;
      if (x >= ww.l && x <= ww.r && y >= doorY) continue;
      const depth = Math.round(D[k] / 3) - 1 - GAP; // cells of lawn between this spot and the closest a fan may stand
      if (depth < 0 || E[k] > 3 * NOOK) continue;
      // Standing further out costs more the further it is (depth squared), so a small crowd is a round huddle at the
      // door while a big one would rather spread round the house than stand miles back. The jitter roughens the edge.
      spots.push({ x, y, s: G[k] + DEPTH * Math.max(0, depth - free) ** 2 + Math.random() * 3 });
    }
    if (!spots.length) return;
    spots.sort((a, b) => a.s - b.s);
    spots = spots.slice(0, n);
    let left = n - spots.length;
    const base = spots.length;
    for (let i = 0; left > 0; i++, left--) spots.push({ ...spots[i % base], extra: 1 + Math.floor(i / base) }); // more fans than lawn: they squeeze in
    const r = Math.random;
    spots.forEach(c => crowd.push(newFan(r, { x: c.x * 8 + 4 + rand(-2, 2) + (c.extra ? rand(-3, 3) : 0), y: c.y * 8 + 7 + rand(-1, 1) - (c.extra || 0) * 3 })));
    crowd.sort((a, b) => a.y - b.y);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    crowd.forEach(f => { x0 = Math.min(x0, f.x - 9); y0 = Math.min(y0, f.y - 26); x1 = Math.max(x1, f.x + 9); y1 = Math.max(y1, f.y + 3); });
    if (fanCount() >= 25) {
      // a red carpet down the aisle, and the banner with the real number at the end of it
      const c = makeBanner(`♥ ${short(fanCount())} FANS`), front = crowd.filter(f => Math.abs(f.x / 8 - dx) < 5 && f.y / 8 > doorY);
      const end = front.length ? Math.max(...front.map(f => f.y)) + 4 : P.front.y + 34;
      banner = { c, x: clamp(Math.round(dx * 8 - c.width / 2), 1, P.W - c.width - 1), y: clamp(Math.round(end), 1, P.H - c.height - 1) };
      // never on top of the signpost
      if (banner.x < p.x + p.w + 4 && banner.x + c.width > p.x - 4 && banner.y < p.y + p.h + 4 && banner.y + c.height > p.y - 4) banner.y = clamp(p.y + p.h + 6, 1, P.H - c.height - 1);
      aisle = { x: ww.l * 8 + 2, y: P.front.y + 15, w: (ww.r - ww.l + 1) * 8 - 4, h: Math.max(0, banner.y + 12 - (P.front.y + 15)) };
      x0 = Math.min(x0, banner.x); x1 = Math.max(x1, banner.x + c.width); y1 = Math.max(y1, banner.y + c.height);
    }
    crowdBox = { x0, y0, x1, y1 };
  }
  function drawAisle(x) {
    if (!aisle || !aisle.h) return;
    const { x: X, y: Y, w, h } = aisle;
    x.fillStyle = '#7a0a1c'; x.fillRect(X, Y, w, h);
    x.fillStyle = '#c8102e'; x.fillRect(X + 1, Y, w - 2, h);
    x.fillStyle = '#ffd23f'; x.fillRect(X + 1, Y, 1, h); x.fillRect(X + w - 2, Y, 1, h);
    x.fillStyle = '#e8304a'; for (let y = Y + 3; y < Y + h; y += 6) x.fillRect(X + 3, y, w - 6, 1);
  }
  function updateCrowd(dt) {
    if (!crowd.length) return;
    // hearts float up out of the crowd, more of them for bigger crowds
    crowdHeartT -= dt;
    while (crowdHeartT < 0 && parts.length < 140) {
      crowdHeartT += Math.max(.03, .6 / Math.sqrt(crowd.length));
      const f = crowd[Math.floor(Math.random() * crowd.length)];
      parts.push({ k: 'heart', crowd: true, x: f.x + rand(-3, 3), y: f.y - 18, vx: rand(-6, 6), vy: rand(-22, -12), t: rand(.6, 1.1) });
    }
    if (crowdHeartT < 0) crowdHeartT = 0;
    if ((crowdSayT -= dt) <= 0) { crowdSayT = rand(1.4, 3); crowdSay = { f: crowd[Math.floor(Math.random() * crowd.length)], c: bubble(pick(cheers())), t: 1.8 }; }
    if (crowdSay && (crowdSay.t -= dt) <= 0) crowdSay = null;
  }
  const crowdHop = f => (f.amp ? Math.round(f.amp * Math.max(0, Math.sin(clock * f.hz + f.ph))) : 0);
  // thousands of fans are redrawn 12 times a second into their own layer (pixel crowds hop fine at that rate)
  // and that layer is stamped onto every frame, so a huge crowd costs one draw instead of thousands
  let crowdCache = null, crowdCacheT = -1;
  function drawCrowd(x, force) {
    if (!crowd.length || !crowdBox) return;
    const b = crowdBox, ox = Math.floor(b.x0), oy = Math.floor(b.y0);
    if (!crowdCache) crowdCache = canvas(Math.ceil(b.x1) - ox + 1, Math.ceil(b.y1) - oy + 1);
    if (force || clock - crowdCacheT >= 1 / 12 || clock < crowdCacheT) {
      crowdCacheT = clock;
      const c = crowdCache.getContext('2d');
      c.clearRect(0, 0, crowdCache.width, crowdCache.height);
      for (const f of crowd) {
        const hop = crowdHop(f), k = f.wave && Math.floor((clock + f.ph) / .3) % 2 ? 'step' : 'stand', top = Math.round(f.y - f.s.bottom) - hop - oy;
        c.drawImage(f.s.frames[k + (f.flip ? 'F' : '')], Math.round(f.x - 8) - ox, top);
        if (f.sign) c.drawImage(heartCard, Math.round(f.x - 4) - ox, top + f.s.top - 9);
      }
      if (banner) c.drawImage(banner.c, banner.x - ox, banner.y - oy - Math.round(Math.max(0, Math.sin(clock * 4)) * 2));
    }
    x.drawImage(crowdCache, ox, oy);
  }
  function crowdSpeech(x) {
    if (!crowdSay) return;
    const f = crowdSay.f, b = crowdSay.c;
    x.drawImage(b, clamp(Math.round(f.x - b.width / 2), 1, P.W - b.width - 1), Math.max(0, Math.round(f.y - f.s.bottom) - crowdHop(f) + f.s.top - 12));
  }
  function cheerBurst() {
    crowd.slice(-40).forEach(f => { f.amp = Math.max(f.amp, 4); });
    for (let i = 0; i < 30 && crowd.length; i++) { const f = crowd[Math.floor(Math.random() * crowd.length)]; parts.push({ k: 'heart', crowd: true, x: f.x, y: f.y - 18, vx: rand(-10, 10), vy: rand(-30, -14), t: rand(.8, 1.3) }); }
  }
  function screens(x) {
    walkers.forEach(w => {
      if (w.state !== 'use' || !w.task.u.screen) return;
      const it = w.task.it, [sx, sy, sw, sh] = w.task.u.screen, X = it.x + sx, Y = it.y + sy, t = clock;
      if (it.kind === 'tvstand') { x.fillStyle = ['#ff7ab6', '#5ad8ff', '#ffd23f', '#9be15d'][Math.floor(t * 1.5) % 4]; x.globalAlpha = .55; x.fillRect(X, Y, sw, sh); x.globalAlpha = 1; x.fillStyle = '#ffffff'; x.fillRect(X + ((Math.floor(t * 6) * 3) % (sw - 3)), Y + 2 + (Math.floor(t * 3) % (sh - 4)), 3, 2); }
      else if (it.kind === 'arcade') { x.fillStyle = Math.floor(t * 8) % 2 ? '#3dff8a' : '#ff7ae0'; x.fillRect(X + (Math.floor(t * 9) % sw), Y + (Math.floor(t * 7) % sh), 1, 1); x.fillRect(X + ((Math.floor(t * 5) + 3) % sw), Y + sh - 1, 2, 1); }
      else for (let j = 0; j < sh; j += 2) { const len = 2 + ((Math.floor(t * 4) + j * 3 + it.x) % (sw - 2)); x.fillStyle = j % 4 ? '#ffffff' : '#3dffd0'; x.fillRect(X + 1, Y + j, Math.min(len, sw - 2), 1); }
    });
  }
  function drawParts(x, share) {
    parts.forEach(p => {
      if (share && p.crowd) return; // the crowd stays on the page
      const px = Math.round(p.x), py = Math.round(p.y);
      if (p.k === 'heart') { x.fillStyle = '#ff4f8b'; x.fillRect(px - 1, py, 1, 1); x.fillRect(px + 1, py, 1, 1); x.fillRect(px - 1, py + 1, 3, 1); x.fillRect(px, py + 2, 1, 1); }
      else if (p.k === 'drop') { x.fillStyle = '#5ad8ff'; x.fillRect(px, py, 1, 2); }
      else if (p.k === 'bubble') { x.fillStyle = p.c; x.fillRect(px, py, 1, 1); x.globalAlpha = .5; x.fillRect(px - 1, py, 1, 1); x.fillRect(px + 1, py, 1, 1); x.globalAlpha = 1; }
      else if (p.k === 'note') { x.fillStyle = '#24163b'; x.fillRect(px + 2, py - 4, 1, 4); x.fillRect(px + 3, py - 4, 1, 1); x.fillRect(px, py, 3, 2); }
      else { x.fillStyle = '#fff1a8'; x.fillRect(px, py - 1, 1, 3); x.fillRect(px - 1, py, 3, 1); }
    });
  }
  // live: the page. share: a still picture, names always on top and tags dodging them. video: like share, but chatty.
  function drawScene(x, mode) {
    if (!P) return;
    const share = mode !== 'live', still = mode === 'share';
    x.clearRect(0, 0, P.W, P.H);
    const signsNow = P.signs.filter(s => share || introT > (Math.floor(s.x / 16) + Math.floor(s.y / 16)) * .022);
    if (!share) signsNow.forEach(s => x.drawImage(s.canvas, s.x, s.y));
    const showPost = share || introT > 1, p = ensurePost();
    if (showPost && !share) x.drawImage(signpost, p.x, p.y);
    screens(x);
    if (share || introT > .6) drawStars(x);
    // the crowd circles the house on the page; pictures and videos give the fans their own audience up front instead
    if (!share && introT > .8) { drawAisle(x); drawCrowd(x); }
    const shown = walkers.filter(w => share || introT > .9 + w.i * .05).sort((a, b) => a.y - b.y);
    shown.forEach(w => { if (!w.stand) x.drawImage(shadow, Math.round(w.x - 5), Math.round(w.y - 1)); });
    shown.forEach(w => {
      const pop = share ? 9 : introT - (.9 + w.i * .05), lift = (pop < .25 ? Math.round(Math.sin(pop / .25 * Math.PI) * 4) : 0) + (w.hop > 0 ? Math.round(Math.sin(w.hop / .45 * Math.PI) * 5) : 0);
      x.drawImage(tinted(frameOf(w), 16, 16, w.tint), 0, 0, 16, 16, Math.round(w.x - 8), drawY(w) - lift, 16, 16);
      if (w.stand && w.task) {
        const it = w.task.it, cv = coverOf(it, w.task.u.cover || 0);
        x.drawImage(tinted(cv, it.item.w, it.item.h, lightAt(it.x + it.item.w / 2, it.y + 6)), 0, 0, it.item.w, it.item.h, it.x, it.y, it.item.w, it.item.h);
      }
    });
    drawParts(x, share);
    const iconFor = (w, top, dx = 0) => { const ic = ICONS[w.task.u.icon], bob = Math.round(Math.sin(clock * 3 + w.i) * 1); x.drawImage(ic, Math.round(w.x - ic.width / 2 + dx), Math.max(0, top - ic.height + bob)); };
    if (share) {
      // in pictures, what-I'm-doing bubbles sit beside the head (the name tag takes the top) and under the room names
      shown.forEach(w => { if (w.state === 'use' && ICONS[w.task.u.icon]) iconFor(w, drawY(w) + w.s.top + 7, shareOpts.tags ? 11 : 0); });
      signsNow.forEach(s => x.drawImage(s.canvas, s.x, s.y)); x.drawImage(signpost, p.x, p.y);
    }
    // name tags: residents in front pick first; crowded tags step up or wait for a hover
    const taken = share ? [...signsNow.map(s => ({ x: s.x, y: s.y, w: s.w, h: 11 })), { x: p.x, y: p.y, w: p.w, h: p.h }] : [];
    const tags = share ? shareOpts.tags : custom.tags;
    shown.slice().reverse().forEach(w => {
      const tg = w.s.pill, tx = Math.min(Math.max(Math.round(w.x - tg.width / 2), 1), P.W - tg.width - 1);
      let y = Math.max(1, drawY(w) + w.s.top - 10), placed = false;
      if (tags) {
        for (let t = 0; t < 4 && !placed; t++, y -= 9) {
          if (!taken.some(r => tx < r.x + r.w && tx + tg.width > r.x && y < r.y + (r.h || 9) && y + 9 > r.y)) { x.drawImage(tg, tx, y); taken.push({ x: tx, y, w: tg.width, h: 9 }); placed = true; }
        }
        if (placed) y += 9;
      }
      const top = placed ? y - 1 : drawY(w) + w.s.top - 1;
      if (still) return;
      if (w.say) { const b = w.say.c; x.drawImage(b, Math.min(Math.max(Math.round(w.x - b.width / 2), 1), P.W - b.width - 1), Math.max(0, top - 11)); }
      else if (!share && w.state === 'use' && ICONS[w.task.u.icon]) iconFor(w, top);
    });
    if (!share) crowdSpeech(x);
  }
  function draw() {
    if (!P) return;
    R.frame(clock, rec ? rec.light : lightMode(), introT);
    drawScene(octx, rec ? 'video' : 'live');
  }
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000));
    last = now; clock += dt;
    try { if (roomVisible && !(rec && rec.fast)) { update(dt); draw(); if (rec) recordFrame(); } } catch (err) { if (window.console) console.error(err); }
  }

  // ---------- side panel + header ----------
  function statsNow() {
    const s = stats || statsOf();
    return [[s.repos, 'Repos'], [s.stars, 'Stars', s.stars >= 10000 ? 'k' : ''], [s.days, 'Commit days'], [s.followers, 'Followers', s.followers >= 10000 ? 'k' : '']];
  }
  function identicon(x) {
    let h = 2166136261;
    for (const ch of profile.handle) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    x.fillStyle = '#fff4dc'; x.fillRect(0, 0, 10, 10); x.fillStyle = ['#ff4f8b', '#1fb5a1', '#7a4dff', '#ff8a1f'][h % 4];
    for (let y = 0; y < 5; y++) for (let i = 0; i < 3; i++) if ((h >> (y * 3 + i + 2)) & 1) { x.fillRect(i * 2, y * 2, 2, 2); x.fillRect((4 - i) * 2, y * 2, 2, 2); }
  }
  function drawAvatar() {
    // the GitHub picture; a pixel identicon holds its place (and stays if the picture can't load)
    identicon($('#identicon').getContext('2d'));
    const img = $('#avatar');
    img.onload = () => { img.hidden = false; };
    img.onerror = () => { img.hidden = true; };
    img.src = `https://avatars.githubusercontent.com/${encodeURIComponent(profile.handle)}?size=112`;
  }
  // who sees what: visitors get "Is this your house?", the connected owner gets the editor
  function ownerUI() {
    document.body.classList.toggle('is-owner', owner);
    document.querySelectorAll('.owner-only').forEach(el => { el.hidden = !owner; });
    document.querySelectorAll('.visitor-only').forEach(el => { el.hidden = owner; });
    $('#owner-chip').hidden = !owner;
    $('#publish-btn').hidden = !(owner && dirty);
    $('#pub-state').textContent = owner ? (dirty ? 'Unpublished changes' : published && published.keys ? 'Published' : '') : '';
    $('#owner-text').textContent = dirty
      ? 'You have changes only you can see. Publish them to GitHub so every visitor sees them too.'
      : "You're connected from this browser. Edit your house any time; publish to show your changes to everyone.";
  }
  function fillProfile() {
    $('#handle').textContent = '@' + profile.handle;
    $('#chip').textContent = profile.chip;
    $('#sub').textContent = profile.sub;
    $('#stats').innerHTML = statsNow().map(([v, l, f]) => `<div class="stat"><b data-count="${v}" data-fmt="${f || ''}">${fmt(v, f)}</b><span>${esc(l)}</span></div>`).join('');
    ownerUI();
    const repoRooms = rooms.filter(r => r.repo), tot = repoRooms.reduce((a, r) => a + r.weight, 0) || 1, mix = {}, COL = {};
    repoRooms.forEach(rm => rm.repo.langs.forEach(([l, p]) => { mix[l] = (mix[l] || 0) + p * rm.weight / tot; }));
    profile.repos.forEach(r => { COL[r.main] = r.color; });
    const langs = Object.entries(mix).sort((a, b) => b[1] - a[1]).slice(0, 6);
    $('#langbar').innerHTML = langs.map(([l, p]) => `<i style="width:${p}%;background:${esc(COL[l] || '#b9aecb')}" title="${esc(l)} ${Math.round(p)}%"></i>`).join('');
    $('#langbar').hidden = !langs.length;
    $('#langkey').innerHTML = langs.slice(0, 4).map(([l, p]) => `<span><i style="background:${esc(COL[l] || '#b9aecb')}"></i>${esc(l)} ${Math.round(p)}%</span>`).join('');
    $('#room-list').innerHTML = repoRooms.map(rm => {
      const r = rm.repo, next = TIERS[rm.tiers];
      return `<li><button type="button" data-zoom="${rm.key}" title="${esc(next ? `Next: ${tierName(rm.tiers, rm.theme)} at ${next} commits` : 'Fully furnished')}"><span class="sw" style="background:${esc(r.color)}"></span><span class="nm">${esc(rm.label)}<small>${esc(r.main)} · ${rm.tiers}/10 items${r.stars ? ` · ★&nbsp;${short(r.stars)}` : ''}</small><span class="bar"><i style="width:${rm.tiers * 10}%"></i></span></span><span class="pc">${short(r.commits)}<small>commits</small></span></button></li>`;
    }).join('') || '<li class="empty">No public repos with commits yet, so the bonus rooms are holding the fort.</li>';
    $('#room-note').textContent = repoRooms.length ? `${repoRooms.length} by commits` : '';
    const bonus = rooms.filter(r => r.special);
    $('#bonus-list').innerHTML = bonus.map(rm => `<button type="button" class="bonus" data-zoom="${rm.key}" title="${esc(BONUS[rm.special].why(stats))}"><span class="sw" style="background:${rm.color}"></span>${esc(rm.label)}</button>`).join('');
    $('#bonus-wrap').hidden = !bonus.length;
    const shown = visible().length, inRooms = repoRooms.length;
    $('#attic').textContent = (shown > inRooms ? `${shown - inRooms} smaller repos are boxed up in the attic. ` : '') + 'Rooms grow with commits, and new furniture arrives at 1, 2, 5, 10, 25, 50, 100, 200, 500 and 1000 commits.';
    const list = $('#resident-list');
    list.innerHTML = '';
    residents.forEach(r => {
      const b = document.createElement('button'), cv = canvas(16, 16);
      b.type = 'button'; b.className = 'resident' + (r.ai ? ' ai' : ''); b.dataset.ping = r.id; b.title = SPR[r.id].name;
      cv.className = 'px'; cv.getContext('2d').drawImage(SPR[r.id].frames.stand, 0, 0);
      const s = document.createElement('span'); s.textContent = SPR[r.id].name;
      b.append(cv, s);
      list.appendChild(b);
    });
    if (stats.followers && SPR.fan1) {
      const b = document.createElement('button'), cv = canvas(16, 16);
      b.type = 'button'; b.className = 'resident fan'; b.dataset.crowd = '1'; b.title = `${fmtN(stats.followers)} fans cheering outside`;
      cv.className = 'px'; cv.getContext('2d').drawImage(SPR.fan1.frames.stand, 0, 0);
      const s = document.createElement('span'); s.textContent = `Fans ×${short(stats.followers)}`;
      b.append(cv, s); list.appendChild(b);
    }
    if (!residents.length) list.insertAdjacentHTML('beforeend', '<p class="ai-note">No frameworks spotted yet. Residents move in when repos use them.</p>');
    if (attic > 0) list.insertAdjacentHTML('beforeend', `<p class="ai-note">+${attic} more ${attic === 1 ? 'resident is' : 'residents are'} waiting for a free room.</p>`);
    $('#res-count').textContent = residents.length || '';
    drawAvatar();
  }

  // ---------- camera: tap a room, or zoom as far as you like ----------
  const camS = { s: 1, x: 0, y: 0 };
  let zoomed = null; // null = whole house, a room key, or 'free'
  const dpr = () => window.devicePixelRatio || 1;
  const crisp = f => { const d = dpr(), k = Math.floor(f * d); return k >= 1 && (f * d - k) / (f * d) < .2 ? k / d : f; };
  const view = () => ({ sw: stage.clientWidth, sh: stage.clientHeight - 62 });
  function target(id) {
    const { sw, sh } = view(), r = id ? P.rectOf(id) : bounds(), pad = id ? 12 : 8;
    const s = crisp(Math.min(sw / (r.w + pad), sh / (r.h + pad), id ? 8 : 99)), d = dpr();
    return { s, x: Math.round((sw / 2 - (r.x + r.w / 2) * s) * d) / d, y: Math.round((sh / 2 + 4 - (r.y + r.h / 2) * s) * d) / d };
  }
  const MAXZ = 48;
  const applyCam = () => { cam.style.transform = `translate(${camS.x}px, ${camS.y}px) scale(${camS.s})`; };
  function setZoomed(z) {
    zoomed = z || null;
    stage.classList.toggle('zoomed', !!zoomed);
    // zoomed in, one finger pans the house; at the whole-house view it scrolls the page (pinch always zooms)
    stage.style.touchAction = zoomed ? 'none' : 'pan-y';
    $('#overview-btn').hidden = !zoomed;
    $('#hint').textContent = zoomed === 'free' ? 'Drag to look around · scroll or pinch to zoom' : zoomed ? `${zoomed === 'hall' ? 'Hallways' : roomByKey(zoomed).label} · tap again to zoom out` : 'Tap a room · scroll or pinch to zoom';
    document.querySelectorAll('[data-zoom]').forEach(b => b.classList.toggle('on', b.dataset.zoom === zoomed));
  }
  function zoomTo(id, instant) {
    if (!P) return;
    const t = target(id || null);
    if (instant || reduce) { gsap.killTweensOf(camS); Object.assign(camS, t); applyCam(); } else gsap.to(camS, { ...t, duration: .8, ease: 'power3.inOut', onUpdate: applyCam });
    setZoomed(id || null);
  }
  function clampCam() {
    const { sw, sh } = view(), b = bounds(), m = 48;
    const fit = (lo, hi) => [Math.min(lo, hi), Math.max(lo, hi)];
    const [ax, bx] = fit(m - (b.x + b.w) * camS.s, sw - m - b.x * camS.s), [ay, by] = fit(m - (b.y + b.h) * camS.s, sh - m - b.y * camS.s);
    camS.x = clamp(camS.x, ax, bx); camS.y = clamp(camS.y, ay, by);
  }
  // zoom by f around a point on the stage, keeping the pixel under it in place
  function zoomAt(mx, my, f, smooth) {
    if (!P) return;
    gsap.killTweensOf(camS);
    const from = { ...camS }, s = clamp(camS.s * f, target(null).s * .6, MAXZ);
    const to = { s, x: mx - (mx - from.x) * s / from.s, y: my - (my - from.y) * s / from.s };
    setZoomed('free');
    if (smooth && !reduce) gsap.to(camS, { ...to, duration: .35, ease: 'power2.out', onUpdate: () => { clampCam(); applyCam(); } });
    else { Object.assign(camS, to); clampCam(); applyCam(); }
  }
  const stagePoint = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  function wireCamera() {
    stage.addEventListener('wheel', e => {
      if (!P || e.target.closest('.stage-ui, .stage-msg')) return;
      e.preventDefault();
      const [mx, my] = stagePoint(e), d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomAt(mx, my, Math.exp(-d * .0018));
    }, { passive: false });
    const ptrs = new Map();
    let drag = null, pinch = null;
    stage.addEventListener('pointerdown', e => {
      if (!P || e.target.closest('.stage-ui, .stage-msg, .tip') || (e.pointerType === 'mouse' && e.button !== 0)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, cx: camS.x, cy: camS.y, moved: false, touch: e.pointerType !== 'mouse' };
      else if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()], r = stage.getBoundingClientRect();
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: camS.s, mx: (a.x + b.x) / 2 - r.left, my: (a.y + b.y) / 2 - r.top, cx: camS.x, cy: camS.y };
        if (drag) drag.moved = true;
        gsap.killTweensOf(camS);
      }
    });
    window.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && ptrs.size >= 2) {
        const [a, b] = [...ptrs.values()], r = stage.getBoundingClientRect(), mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
        const s = clamp(pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, target(null).s * .6, MAXZ), wx = (pinch.mx - pinch.cx) / pinch.s, wy = (pinch.my - pinch.cy) / pinch.s;
        Object.assign(camS, { s, x: mx - wx * s, y: my - wy * s }); clampCam(); applyCam(); setZoomed('free');
      } else if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) > 5) drag.moved = true;
        // at the whole-house view a one-finger swipe scrolls the page instead
        if (drag.moved && (!drag.touch || zoomed)) { gsap.killTweensOf(camS); camS.x = drag.cx + dx; camS.y = drag.cy + dy; clampCam(); applyCam(); if (!zoomed) setZoomed('free'); }
      }
    });
    const up = e => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinch = null;
      if (!ptrs.size) { if (drag && drag.moved) swallowClick = true; drag = null; }
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    ov.addEventListener('dblclick', e => { const [mx, my] = stagePoint(e); zoomAt(mx, my, 2.2, true); });
    $('#zoom-in').addEventListener('click', () => { const { sw, sh } = view(); zoomAt(sw / 2, sh / 2, 1.6, true); });
    $('#zoom-out').addEventListener('click', () => { const { sw, sh } = view(); if (camS.s / 1.6 <= target(null).s * 1.02) zoomTo(null); else zoomAt(sw / 2, sh / 2, 1 / 1.6, true); });
  }
  let swallowClick = false;

  // ---------- hit testing ----------
  const toWorld = e => { const r = ov.getBoundingClientRect(); return [(e.clientX - r.left) * P.W / r.width, (e.clientY - r.top) * P.H / r.height]; };
  function hitAt(px, py) {
    const w = walkers.slice().sort((a, b) => b.y - a.y).find(v => px >= v.x - 8 && px < v.x + 8 && py >= drawY(v) + v.s.top - 10 && py <= v.y + 1);
    if (w) return { kind: 'res', w };
    if (crowdBox && px >= crowdBox.x0 && px <= crowdBox.x1 && py >= crowdBox.y0 && py <= crowdBox.y1) {
      if (banner && px >= banner.x && px < banner.x + banner.c.width && py >= banner.y && py < banner.y + banner.c.height) return { kind: 'crowd' };
      for (let i = crowd.length - 1; i >= 0; i--) { const f = crowd[i]; if (Math.abs(px - f.x) < 6 && py <= f.y + 1 && py >= f.y - 15) return { kind: 'crowd' }; }
    }
    const st = starObjs.slice().sort((a, b) => b.y - a.y).find(s => { const a = STARS[s.k], h = Math.max(4, a.W / 2 + 1); return Math.abs(px - s.x) <= h && Math.abs(py - starTop(s)) <= h; });
    if (st) return { kind: 'star', s: st };
    const b = P.badges.find(q => px >= q.x && px < q.x + 14 && py >= q.y - 3 && py < q.y + 14);
    if (b) return { kind: 'badge', b };
    const s = P.signs.find(q => px >= q.x && px < q.x + q.w && py >= q.y && py < q.y + 11);
    if (s) return { kind: 'sign', id: s.id };
    const p = ensurePost();
    if (px >= p.x && px < p.x + p.w && py >= p.y && py < p.y + p.h) return { kind: 'post' };
    const g = P.calRug;
    if (g && px >= g.x && px < g.x + g.w && py >= g.y && py < g.y + g.h) return { kind: 'rug' };
    const id = P.roomAt(px, py);
    return id ? { kind: 'room', id } : null;
  }
  const DOING = { type: 'busy at the', watch: 'watching the', play: 'playing the', read: 'browsing the', look: 'looking through the', water: 'watering the', sit: 'chilling on the', cheer: 'admiring the' };
  const NICE = { tvstand: 'TV', couchBack: 'couch', labBench: 'lab bench', jarShelf: 'specimen shelf', plantSmall: 'plant', plantTall: 'plant', gameshelf: 'game shelf', rack: 'server rack' };
  function tipData(h) {
    if (!h) return null;
    if (h.kind === 'res') {
      const r = h.w.res, doing = h.w.state === 'use' ? ` Right now: ${DOING[h.w.task.u.act]} ${NICE[h.w.task.it.kind] || h.w.task.it.kind}.` : '';
      if (r.pet) return [h.w.s.name, `@${profile.handle}'s pet`, 'Goes wherever it likes.' + (owner ? ' Pick a different pet in Edit house.' : '') + doing];
      if (r.fan) return ['A fan', `One of ${fmtN(stats.followers)} followers`, `Fans drop by to hang out. More followers, more fans (up to six).${doing}`];
      const uniq = [...new Set(r.homes.map(roomLabel))], kind = h.w.s.lang ? 'Language' : h.w.s.placeholder ? 'Stack' : '';
      return [h.w.s.name, r.ai ? 'AI visitor · roams every room' : `${kind ? kind + ' · ' : ''}Resident of ${roomLabel(r.home)}`, (r.ai ? `Found in ${uniq.join(', ')}.` : h.w.s.lang ? `${uniq.join(', ')} ${uniq.length > 1 ? 'are' : 'is'} written in ${h.w.s.name}.` : uniq.length > 1 ? `Also works in ${uniq.slice(1).join(', ')}.` : `Used in ${uniq[0]}.`) + doing];
    }
    if (h.kind === 'crowd') {
      const n = stats.followers;
      return [`${fmtN(n)} ${n === 1 ? 'fan' : 'fans'}`, 'Cheering outside the house', n > CROWD_MAX ? `One fan for every follower. They can't all fit on the lawn, so the first ${fmtN(CROWD_MAX)} made it to the front.` : 'One fan for every follower. Tap the fans chip to make them go wild.'];
    }
    if (h.kind === 'star') {
      const s = h.s;
      return [`★ ${fmtN(s.v)} ${s.v === 1 ? 'star' : 'stars'}`, s.label === 'repos without a room' ? 'Stars from repos without a room' : `One of ${s.label}'s stars`, `${s.label === 'repos without a room' ? 'Those repos have' : `${s.label} has`} ${fmtN(s.total)} stars in all. Tiny stars count 1, then 10, 100, 1,000, 10,000 and 100,000 as they get bigger.`];
    }
    if (h.kind === 'badge') { const [k, note, name] = profile.badges[h.b.i]; return [name || (BADGES[k] || BADGES.medal).name, 'Badge · framed in the gallery hallway', note]; }
    if (h.kind === 'post') return [custom.name || profile.house, `Est. ${profile.cal.since}`, `@${profile.handle}'s house.${owner ? ' Rename it in Edit house.' : ''}`];
    if (h.kind === 'rug') { const c = profile.cal; return ['Contribution rug', 'Woven from the last year of commits', `${fmtN(c.total)} contributions over ${c.days} commit days. Longest streak: ${c.longest} days. Busiest day: ${c.busiest}.`]; }
    if (h.kind === 'sign') {
      const rm = roomByKey(h.id);
      if (rm.special) return [rm.label, 'Bonus room', BONUS[rm.special].why(stats)];
      const r = rm.repo, next = TIERS[rm.tiers], have = rm.placed ? rm.placed.filter(i => i >= 0).sort((a, b) => a - b).map(i => tierName(i, rm.theme)).join(', ') : '';
      return [rm.label, `${fmtN(r.commits)} commits · ${fmtSize(r.sizeKB)}${r.stars ? ` · ★ ${fmtN(r.stars)}` : ''} · last push ${r.pushed}`, `${have ? `Has: ${have}. ` : ''}${next ? `Next: ${tierName(rm.tiers, rm.theme)} at ${next} commits.` : 'Fully furnished.'}`];
    }
    return null;
  }
  function showTip(d, cx, cy) {
    if (!d) { tip.hidden = true; return; }
    tip.innerHTML = '<span class="k"></span><b></b><span class="d"></span>';
    tip.querySelector('b').textContent = d[0]; tip.querySelector('.k').textContent = d[1]; tip.querySelector('.d').textContent = d[2];
    tip.hidden = false;
    const s = stage.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = cx - s.left + 14, y = cy - s.top + 14;
    if (x + tw > s.width - 8) x = cx - s.left - tw - 14;
    if (y + th > s.height - 8) y = cy - s.top - th - 14;
    tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, y) + 'px';
  }

  // ---------- edit house: the connected owner only ----------
  // Edits apply on the spot and wait in this browser as a draft; publishing commits them to the owner's own GitHub.
  function openCustom() {
    if (!owner) { openGitHub('connect'); return; }
    buildCustom(); openModal($('#custom-modal'));
  }
  function markDirty() {
    const b = $('#c-save');
    if (b) { b.disabled = !dirty; b.textContent = dirty ? 'Publish to GitHub' : 'Everything is published'; }
    const d = $('#c-discard'); if (d) d.hidden = !dirty;
    ownerUI();
  }
  function buildCustom() {
    $('#c-days').textContent = `@${profile.handle} has ${cdays()} commit days. Commit days unlock wallpapers and pets.`;
    $('#c-name').value = custom.name || profile.house;
    $('#plan-reset').hidden = !shuffle;
    $('#c-papers').innerHTML = WALLPAPERS.map(w => { const lk = !unlocked(w.days); return `<button type="button" class="opt" data-paper="${w.id}" aria-pressed="${custom.paper === w.id}" ${lk ? 'disabled' : ''}><i style="background:${w.c.paper};box-shadow:inset 0 -6px 0 ${w.c.lo}"></i><span>${w.name}</span><small>${lk ? `${w.days} days` : 'Unlocked'}</small></button>`; }).join('');
    const pets = $('#c-pets');
    pets.innerHTML = '';
    PETS.forEach(p => {
      const lk = !unlocked(p.days), b = document.createElement('button');
      b.type = 'button'; b.className = 'opt'; b.dataset.pet = p.id; b.setAttribute('aria-pressed', String(custom.pet === p.id)); if (lk) b.disabled = true;
      const cv = canvas(16, 16); cv.className = 'px';
      if (SPR[p.id]) cv.getContext('2d').drawImage(SPR[p.id].frames.stand, 0, 0);
      const s1 = document.createElement('span'), s2 = document.createElement('small');
      s1.textContent = p.name; s2.textContent = lk ? `${p.days} days` : 'Unlocked';
      b.append(cv, s1, s2); pets.appendChild(b);
    });
    document.querySelectorAll('[data-light]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.light === custom.light)));
    $('#c-tags').checked = !!custom.tags;
    buildOwnerTools();
    markDirty();
  }
  function buildOwnerTools() {
    // rooms: every repo, busiest first; up to ten get a room
    const vis = visible().slice().sort(byCommits), chosen = (settings && settings.rooms) || pickRepos().map(r => r.id);
    $('#c-rooms').innerHTML = vis.map(r => {
      const on = chosen.includes(r.id), full = chosen.length >= 10 && !on, n = r.commits == null ? 'not counted yet' : `${fmtN(r.commits)} commits`;
      return `<label class="pick${on ? ' on' : ''}"><input type="checkbox" data-room="${esc(r.id)}" ${on ? 'checked' : ''} ${full ? 'disabled' : ''}><span class="sw" style="background:${esc(r.color)}"></span><span class="nm">${esc(r.name)}<small>${esc(r.main)} · ${n}${r.stars ? ` · ★ ${short(r.stars)}` : ''}</small></span></label>`;
    }).join('') || '<p class="ai-note">No repos to pick from yet.</p>';
    $('#c-room-count').textContent = `${Math.min(10, chosen.filter(id => vis.some(r => r.id === id)).length)} of 10`;
    const bonusOn = (settings && settings.bonus) || rooms.filter(r => r.special).map(r => r.special);
    $('#c-bonus').innerHTML = Object.keys(BONUS).map(id => `<label class="pick${bonusOn.includes(id) ? ' on' : ''}"><input type="checkbox" data-bonus="${id}" ${bonusOn.includes(id) ? 'checked' : ''}><span class="sw" style="background:${BONUS[id].color}"></span><span class="nm">${BONUS[id].label}<small>${esc(BONUS[id].why(stats))}</small></span></label>`).join('');
    // residents: fix what the detector got wrong, room by room (anyone GitRoom knows can be added)
    const everyone = window.GitRoomData.castList().filter(c => !SPR[c.id] || (!SPR[c.id].pet && !SPR[c.id].npc));
    const fixes = (settings && settings.fixes) || {}, roomsNow = rooms.filter(r => r.repo);
    const nameOf = id => (SPR[id] ? SPR[id].name : (everyone.find(c => c.id === id) || { name: id }).name);
    $('#c-fixes').innerHTML = roomsNow.map(rm => {
      const r = profile.repos.find(x => x.id === rm.repo.id), f = fixes[r.id] || { add: [], remove: [] };
      const orig = [...r.fw, ...r.ai].filter(id => SPR[id]), current = [...new Set([...orig, ...(f.add || [])])];
      const chips = current.map(id => {
        const gone = (f.remove || []).includes(id);
        return `<button type="button" class="fixchip${gone ? ' gone' : ''}" data-fix="${esc(r.id)}" data-id="${esc(id)}" title="${gone ? 'Bring back' : 'Remove'} ${esc(nameOf(id))}">${esc(nameOf(id))} <b aria-hidden="true">${gone ? '↺' : '×'}</b></button>`;
      }).join('');
      const options = everyone.filter(c => !current.includes(c.id)).map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
      return `<div class="fixrow"><b>${esc(rm.label)}</b><div class="fixchips">${chips || '<small>Nobody yet.</small>'}<select data-add="${esc(r.id)}" aria-label="Add a resident to ${esc(rm.label)}"><option value="">+ Add…</option>${options}</select></div></div>`;
    }).join('') || '<p class="ai-note">Pick some rooms first.</p>';
  }
  // owner edits apply on the spot, and the room picks feed straight into the model
  function applyEdit(patch, rebuild) {
    const next = { ...currentSettings(), ...patch };
    Object.keys(patch).forEach(k => { if (patch[k] == null) delete next[k]; });
    settings = window.GitRoomData.cleanSettings(next);
    dirty = !same(settings, published);
    window.GitRoomData.setDraft(login, dirty ? settings : null);
    if (rebuild) { castPlaceholders(); buildModel(); fillProfile(); makeHouse(false); }
    buildCustom();
  }
  // rooms for repos GitRoom hadn't counted yet: count and furnish them first
  async function ensureDetails(ids) {
    const missing = ids.filter(id => { const r = profile.repos.find(x => x.id === id); return r && !r.detailed; });
    if (!missing.length) return;
    toast(`Counting commits in ${missing.length === 1 ? missing[0] : `${missing.length} repos`}…`);
    for (const id of missing) { try { await window.GitRoomData.loadRepo(profile, id); } catch (e) { toast(e.code === 'rate' ? 'GitHub needs a short breather. Try that room again in a few minutes.' : "Couldn't read that repo right now."); } }
  }
  function discardEdits() {
    settings = published ? { ...published } : null;
    window.GitRoomData.setDraft(login, null);
    dirty = false;
    shuffle = settings && Number.isInteger(settings.layout) ? settings.layout : 0;
    loadCustom(); castPlaceholders(); buildModel(); fillProfile(); makeHouse(false); buildCustom();
    toast('Back to the published house.');
  }

  // ---------- connect and publish: one commit to the owner's own profile repo ----------
  let ghJob = null, ghWatch = null, ghKind = 'connect';
  async function openGitHub(kind) {
    ghKind = kind;
    const branch = pubBranch || (profile.profileRepo && profile.profileRepo.branch) || 'main';
    ghJob = await window.GitRoomData.prepareCommit(login, kind === 'publish' ? currentSettings() : (published || {}), branch);
    const repo = `${profile.handle}/${profile.handle}`;
    $('#gh-title').textContent = kind === 'connect' ? 'Connect GitHub' : 'Publish your changes';
    $('#gh-intro').textContent = kind === 'connect'
      ? `Prove this is your house by committing one small file to your GitHub. Then you can edit @${profile.handle}'s house from this browser. Only @${profile.handle} can do this.`
      : 'Your changes go into a new file in your profile repo. Commit it and every visitor sees the new house within a minute.';
    $('#gh-repo-name').textContent = repo; $('#gh-repo-name-2').textContent = repo;
    $('#gh-step-repo').hidden = !!(profile.profileRepo || published);
    $('#gh-repo-link').href = window.GitRoomData.createRepoURL(profile.handle);
    $('#gh-commit-title').textContent = kind === 'connect' ? 'Commit your house file' : 'Commit the new house file';
    $('#gh-commit-link').href = ghJob.url;
    $('#gh-wait').hidden = true;
    openModal($('#gh-modal'));
  }
  function watchGitHub() {
    $('#gh-wait').hidden = false;
    $('#gh-wait-text').textContent = 'Waiting for your commit. This page checks every few seconds.';
    if (ghWatch) ghWatch.stop();
    ghWatch = window.GitRoomData.watchCommit(login, ghJob, { onFound: committed });
  }
  async function committed(s) {
    ghWatch = null;
    const was = settings;
    published = s; settings = { ...s }; pubBranch = ghJob.branch;
    owner = await window.GitRoomData.isOwner(login, published);
    dirty = false; window.GitRoomData.setDraft(login, null);
    closeModal($('#gh-modal'));
    if (!same(was, settings)) { shuffle = Number.isInteger(settings.layout) ? settings.layout : 0; loadCustom(); castPlaceholders(); buildModel(); makeHouse(false); }
    fillProfile();
    if (!owner) { toast('Found the file, but it was made in another browser. Connect from this one to edit here.'); return; }
    toast(ghKind === 'connect' ? "Connected! It's officially your house. Press Edit house to make it yours." : 'Published! Everyone who visits sees your house now.');
    if (ghKind === 'connect' && !reduce) cheerBurst();
  }

  // ---------- share images ----------
  const SHARE_DEFAULT = { fmt: 'story', bg: 'white', light: 'house', stats: true, langs: true, badges: true, roster: true, fans: true, tags: true, pose: true, caption: '' };
  let shareOpts = { ...SHARE_DEFAULT };
  try { shareOpts = { ...SHARE_DEFAULT, ...JSON.parse(store.get('gitroom-share') || '{}') }; } catch (e) { shareOpts = { ...SHARE_DEFAULT }; }
  const BGS = { white: { c: '#ffffff', ink: '#24163b', sub: '#6b5a80' }, cream: { c: '#fff4dc', ink: '#24163b', sub: '#6b5a80' }, lawn: { c: '#5cc23c', ink: '#24163b', sub: '#1d4a12', grass: true }, night: { c: '#1d1450', ink: '#fff4dc', sub: '#b9a0ff', stars: true } };
  let shareBlob = null, shareURL = null, shareJob = 0, posed = false;
  const shareName = () => `${profile.handle}-gitroom-${shareOpts.fmt}.png`;
  const canShareFiles = () => { try { return !!(navigator.canShare && navigator.canShare({ files: [new File([new Blob()], 'x.png', { type: 'image/png' })] })); } catch (e) { return false; } };
  const T = (x, s, X, y, col, sc) => drawText(x, s, Math.round(X), Math.round(y), col, sc);
  const TC = (x, s, cx, y, col, sc) => T(x, s, cx - textWidth(s) * sc / 2, y, col, sc);
  const fitSc = (s, maxW, max) => Math.max(1, Math.min(max, Math.floor(maxW / Math.max(1, textWidth(s)))));
  const pixelSafe = s => String(s || '').toUpperCase().replace(/[^A-Z0-9 .,'!?%:/+\-*_=#@<>()♥]/g, '').replace(/\s+/g, ' ').trim();
  // badge names short enough to sit under a frame in the picture
  const BADGE_SHORT = { pair: 'PAIR PRO', mars: 'MARS 2020', arctic: 'ARCTIC VAULT', sponsor: 'SPONSOR', heart: 'HEART SLEEVE', oss: 'SOURCERER', galaxy: 'GALAXY BRAIN', shark: 'PULL SHARK', star: 'STARSTRUCK', quick: 'QUICKDRAW', yolo: 'YOLO' };
  function plaque(x, X, Y, w, h) {
    x.fillStyle = '#24163b'; x.fillRect(X + 6, Y, w - 12, h); x.fillRect(X, Y + 6, w, h - 12);
    x.fillStyle = '#fff4dc'; x.fillRect(X + 6, Y + 6, w - 12, h - 12);
    x.fillStyle = '#ffe6b3'; x.fillRect(X + 6, Y + h - 16, w - 12, 10);
  }
  function pill(x, s, cx, y, sc, bg, fg) {
    const w = textWidth(s) * sc + sc * 8, h = sc * 5 + sc * 6, X = Math.round(cx - w / 2);
    x.fillStyle = '#24163b'; x.fillRect(X + sc, y, w - sc * 2, h); x.fillRect(X, y + sc, w, h - sc * 2);
    x.fillStyle = bg; x.fillRect(X + sc, y + sc, w - sc * 2, h - sc * 2);
    TC(x, s, cx, y + sc * 3, fg, sc);
    return { w, h };
  }
  // biggest scale that fits; whole-number scales win when they're close, so pixels stay square
  const houseFit = (layer, maxW, maxH) => { const f = Math.min(maxW / layer.width, maxH / layer.height); return f >= 2 && Math.floor(f) / f >= .88 ? Math.floor(f) : f; };
  // the lit house, with the lawn cut away so it sits on any background
  function houseLayer() {
    const b = bounds(false), c = canvas(b.w, b.h), x = c.getContext('2d');
    x.drawImage(glc, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
    if (shareOpts.bg !== 'white') {
      const { type, GW, GH } = P;
      for (let cy = 0; cy < GH; cy++) for (let cx = 0; cx < GW; cx++) if (type[cy * GW + cx] === 0) x.clearRect(cx * 8 - b.x, cy * 8 - b.y, 8, 8);
    }
    x.drawImage(ov, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
    return c;
  }
  // ---------- the audience: in pictures and videos the fans pack the front of the frame ----------
  // (seeded, so a picture and a video of the same house line up)
  let templating = false, lastAud = null;
  function buildAudience(w, scale) {
    const n = stats.followers;
    if (!n || !shareOpts.fans || !SPR.fan1) return null;
    let seed = (profile.seed % 2147483646) + 1;
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const sw = 16 * scale, step = Math.round(sw * .58), rowStep = Math.round(sw * .42);
    const per = Math.max(1, Math.floor((w - sw) / step) + 1), rows = Math.min(4, Math.ceil(n / per)), fans = [];
    let left = Math.min(n, per * rows);
    for (let row = 0; row < rows && left > 0; row++) { // row 0 is the front
      const k = Math.min(left, per - (row % 2)); left -= k;
      const x0 = Math.round((w - ((k - 1) * step + sw)) / 2);
      for (let i = 0; i < k; i++) fans.push(newFan(r, { dx: x0 + i * step + Math.round((r() - .5) * step * .3), dy: (rows - 1 - row) * rowStep + Math.round(r() * 3) }));
    }
    fans.sort((a, b) => a.dy - b.dy);
    return { fans, w, h: (rows - 1) * rowStep + sw, scale, sw, bc: makeBanner(`♥ ${fmtN(n)} ${n === 1 ? 'FAN' : 'FANS'}`), bs: Math.max(2, Math.round(scale * .9)) };
  }
  // layouts call this where the audience goes; while a video template is being made it only remembers the spot
  function audience(x, A, X, Y) {
    if (!A) return;
    lastAud = { A, X, Y };
    if (!templating) drawAudience(x, A, X, Y, clock);
  }
  function drawAudience(x, A, X, Y, t) {
    x.imageSmoothingEnabled = false;
    for (const f of A.fans) {
      const hop = f.amp ? Math.round(f.amp * A.scale * Math.max(0, Math.sin(t * f.hz + f.ph))) : 0, k = f.wave && Math.floor((t + f.ph) / .3) % 2 ? 'step' : 'stand';
      const fx = X + f.dx, fy = Y + f.dy - hop;
      x.drawImage(f.s.frames[k + (f.flip ? 'F' : '')], fx, fy, A.sw, A.sw);
      if (f.sign) x.drawImage(heartCard, Math.round(fx + A.sw / 2 - 4.5 * A.scale), Math.round(fy + (f.s.top - 9) * A.scale), 9 * A.scale, 10 * A.scale);
    }
    // the banner is held up over the middle of the crowd
    const bw = A.bc.width * A.bs, bh = A.bc.height * A.bs, bob = Math.round(Math.max(0, Math.sin(t * 4)) * A.bs * 2);
    x.drawImage(A.bc, Math.round(X + (A.w - bw) / 2), Math.round(Y - bh * .55) - bob, bw, bh);
  }

  // where the house landed in the last picture laid out; the video paints the moving house into the same spot
  let lastRect = null;
  function drawHouse(x, layer, s, cx, top) {
    const hw = Math.round(layer.width * s), hh = Math.round(layer.height * s);
    lastRect = { x: Math.round(cx - hw / 2), y: Math.round(top), w: hw, h: hh };
    x.imageSmoothingEnabled = false;
    x.drawImage(layer, lastRect.x, lastRect.y, hw, hh);
    return hh;
  }
  function background(x, W, H) {
    const bg = BGS[shareOpts.bg] || BGS.white;
    x.fillStyle = bg.c; x.fillRect(0, 0, W, H);
    if (bg.grass) { const g = window.PX.grassCanvas(false); x.imageSmoothingEnabled = false; for (let y = 0; y < H; y += 96) for (let i = 0; i < W; i += 96) x.drawImage(g, i, y, 96, 96); }
    if (bg.stars) { let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < W * H / 9000; i++) { x.fillStyle = r() < .2 ? '#ffd23f' : '#8fa2ff'; const z = r() < .1 ? 6 : 3; x.fillRect(Math.floor(r() * W), Math.floor(r() * H), z, z); } }
    return bg;
  }
  function langMix() {
    const rr = rooms.filter(r => r.repo), tot = rr.reduce((a, r) => a + r.weight, 0) || 1, mix = {}, COL = {};
    rr.forEach(rm => rm.repo.langs.forEach(([l, p]) => { mix[l] = (mix[l] || 0) + p * rm.weight / tot; }));
    profile.repos.forEach(r => { COL[r.main] = r.color; });
    return Object.entries(mix).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l, p]) => ({ l, p, c: COL[l] || '#b9aecb' }));
  }
  const crew = () => [...residents.map(r => ({ id: r.id, ai: r.ai })), ...(stats.followers && SPR.fan1 ? [{ id: 'fan1', fan: true, n: stats.followers }] : []), ...(custom.pet !== 'none' && SPR[custom.pet] ? [{ id: custom.pet, pet: true }] : [])];
  // the card under (or beside) the house: each block reports its height so layouts can stack them
  function blocks(w) {
    const out = [], o = shareOpts, s = stats, c = profile.cal;
    if (o.stats) {
      const cellsS = [[short(c.total), 'CONTRIBUTIONS'], [String(c.days), 'COMMIT DAYS'], [String(c.longest), 'DAY STREAK'], [short(s.stars), 'STARS'], [short(s.followers), 'FOLLOWERS'], [String(s.repos), 'REPOS']];
      out.push({ id: 'stats', h: 214, draw: (x, X, Y) => cellsS.forEach(([n, l], i) => { const col = i % 3, row = Math.floor(i / 3), cx = X + w * (col + .5) / 3, y = Y + row * 108; const sc = fitSc(n, w / 3 - 24, 7); TC(x, n, cx, y + (35 - sc * 5), '#24163b', sc); TC(x, l, cx, y + 50, '#6b5a80', fitSc(l, w / 3 - 16, 3)); }) });
    }
    const L = langMix();
    if (o.langs && L.length) out.push({ id: 'langs', h: 96, draw: (x, X, Y) => {
      let lx = X; const bw = w;
      x.fillStyle = '#24163b'; x.fillRect(X - 4, Y - 4, bw + 8, 36);
      const tot = L.reduce((a, q) => a + q.p, 0) || 1;
      L.forEach((q, i) => { const sw = i === L.length - 1 ? X + bw - lx : Math.round(bw * q.p / tot); x.fillStyle = q.c; x.fillRect(lx, Y, sw, 28); lx += sw; });
      let kx = X; L.slice(0, 3).forEach(q => { const t = `${q.l.toUpperCase()} ${Math.round(q.p)}%`, sc = 3; x.fillStyle = q.c; x.fillRect(kx, Y + 50, 18, 18); x.fillStyle = '#24163b'; x.fillRect(kx - 2, Y + 48, 22, 2); T(x, t, kx + 26, Y + 52, '#24163b', sc); kx += 26 + textWidth(t) * sc + 30; });
    } });
    const bd = profile.badges.slice(0, 8);
    if (o.badges && bd.length) out.push({ id: 'badges', h: 118, draw: (x, X, Y) => bd.forEach(([k, , name], i) => {
      const d = BADGES[k] || BADGES.medal, n = bd.length, cw = Math.min(140, w / n), cx = X + w / 2 + (i - (n - 1) / 2) * cw, S = 6, bx = Math.round(cx - 7 * S / 2 - 3), by = Y;
      x.fillStyle = '#5a3210'; x.fillRect(bx, by, 14 * S / 2 + 6, 14 * S / 2 + 6); x.fillStyle = '#f7c948'; x.fillRect(bx + 3, by + 3, 14 * S / 2, 14 * S / 2);
      x.fillStyle = d.bg; x.fillRect(bx + 9, by + 9, 8 * S - 12, 8 * S - 12);
      d.map.forEach((row, j) => { for (let q = 0; q < 8; q++) if (d.pal[row[q]]) { x.fillStyle = d.pal[row[q]]; x.fillRect(bx + 9 + q * (S - 1.5), by + 9 + j * (S - 1.5), S - 1.5, S - 1.5); } });
      const nm = (BADGE_SHORT[k] || pixelSafe(name || d.name)).slice(0, 14); TC(x, nm, cx, by + 58, '#6b5a80', fitSc(nm, cw - 8, 2));
    }) });
    const list = crew();
    if (o.roster && list.length) {
      const cols = Math.max(4, Math.floor(w / 100)), rowsN = Math.min(2, Math.ceil(list.length / cols)), shown = list.slice(0, cols * rowsN - (list.length > cols * rowsN ? 1 : 0)), more = list.length - shown.length, cell = w / cols;
      out.push({ id: 'roster', h: rowsN * 84 + 6, draw: (x, X, Y) => {
        [...shown, ...(more > 0 ? [{ more }] : [])].forEach((r, i) => {
          const row = Math.floor(i / cols), inRow = Math.min(cols, shown.length + (more > 0 ? 1 : 0) - row * cols), col = i % cols, px = X + w / 2 + (col - (inRow - 1) / 2) * cell, py = Y + row * 84;
          if (r.more) { TC(x, `+${r.more}`, px, py + 16, '#6b5a80', 4); return; }
          const sp = SPR[r.id];
          x.imageSmoothingEnabled = false; x.drawImage(sp.frames.stand, Math.round(px - 20), py, 40, 40);
          const nm = (r.fan ? `FANS X${short(r.n)}` : (sp.tagText || sp.name)).toUpperCase(), sc = textWidth(nm) * 2 > cell - 6 ? 1 : 2;
          TC(x, nm, px, py + 48, r.pet ? '#e07a1c' : r.fan ? '#e0306a' : r.ai ? '#c4643f' : '#24163b', sc);
        });
      } });
    }
    out.push({ id: 'brand', h: 70, draw: (x, X, Y) => {
      const logo = canvas(13, 13), url = `${location.host}/u/${profile.handle}`.toUpperCase(), lx = X + w / 2 - (52 + 16 + textWidth('GITROOM') * 6) / 2;
      drawMap(logo, window.PX.LOGO, window.PX.LOGO_PAL);
      x.imageSmoothingEnabled = false; x.drawImage(logo, Math.round(lx), Y, 52, 52); T(x, 'GITROOM', lx + 68, Y + 4, '#24163b', 6);
      T(x, url, lx + 68, Y + 42, '#6b5a80', fitSc(url, w - (lx - X) - 80, 2));
    } });
    return out;
  }
  const blocksH = list => list.reduce((a, b) => a + b.h, 0) + (list.length - 1) * 26;
  function stackBlocks(x, list, X, Y, w) { let y = Y; list.forEach(b => { b.draw(x, X, y, w); y += b.h + 26; }); }
  function header(x, cx, y, maxW, bg, big) {
    const handle = '@' + profile.handle.toUpperCase(), hs = fitSc(handle, maxW, big ? 10 : 8);
    TC(x, handle, cx, y, bg.ink, hs);
    let h = hs * 5 + 18;
    const nm = (custom.name || profile.house).toUpperCase(), ns = fitSc(nm, maxW, big ? 6 : 5);
    TC(x, nm, cx, y + h, '#ff4f8b', ns); h += ns * 5 + 22;
    const title = pixelSafe(profile.title || profile.chip.replace('★', '')).trim() || 'HOUSE BUILDER', since = `SINCE ${profile.cal.since}`;
    const w1 = textWidth(title) * 3 + 24, w2 = textWidth(since) * 3 + 24, gap = 16, tw = w1 + gap + w2;
    pill(x, title, cx - tw / 2 + w1 / 2, y + h, 3, '#ffc83a', '#24163b');
    pill(x, since, cx + tw / 2 - w2 / 2, y + h, 3, '#ffffff', '#24163b');
    h += 33 + 16;
    const cap = pixelSafe(shareOpts.caption).slice(0, 40);
    if (cap) { const cs = fitSc(cap, maxW, 4); TC(x, cap, cx, y + h + 6, bg.sub, cs); h += cs * 5 + 20; }
    return h;
  }
  // when the card gets too tall, the roster goes first, then badges, then languages, so the house keeps its space
  function trim(list, fits) {
    for (const id of ['roster', 'badges', 'langs']) { if (fits(list)) break; list = list.filter(b => b.id !== id); }
    return list;
  }
  function makeStory(layer) {
    const W = 1080, H = 1920, c = canvas(W, H), x = c.getContext('2d'), bg = background(x, W, H);
    const top = 64 + header(x, W / 2, 64, 960, bg, true) + 12;
    // the fans stand in front of the house with their feet on the card's top edge
    const A = buildAudience(1000, 3), audH = A ? A.h - 18 : 0;
    const list = trim(blocks(940), l => H - 28 - (blocksH(l) + 76) - top - 24 - audH >= 560), cardH = blocksH(list) + 76, cardY = H - cardH - 28;
    const room = cardY - top - 24 - audH, s = houseFit(layer, 1040, room);
    drawHouse(x, layer, s, W / 2, top + Math.max(0, (room - layer.height * s) / 2));
    plaque(x, 30, cardY, W - 60, cardH);
    stackBlocks(x, list, 70, cardY + 38, 940);
    if (A) audience(x, A, 40, cardY - A.h + 18);
    return c;
  }
  function makeSquare(layer) {
    const W = 1080, H = 1080, c = canvas(W, H), x = c.getContext('2d'), bg = background(x, W, H);
    const handle = '@' + profile.handle.toUpperCase(), hs = fitSc(handle, 600, 7);
    TC(x, handle, W / 2, 40, bg.ink, hs);
    const nm = (custom.name || profile.house).toUpperCase(); TC(x, nm, W / 2, 40 + hs * 5 + 14, '#ff4f8b', fitSc(nm, 700, 4));
    const A = buildAudience(1000, 2), audH = A ? A.h - 12 : 0;
    const top = 40 + hs * 5 + 50, stripY = H - 170, room = stripY - top - 16 - audH, s = houseFit(layer, 1020, room);
    drawHouse(x, layer, s, W / 2, top + Math.max(0, (room - layer.height * s) / 2));
    plaque(x, 30, stripY, W - 60, 140);
    if (A) audience(x, A, 40, stripY - A.h + 12);
    const c2 = profile.cal, cellsS = [[short(c2.total), 'CONTRIBUTIONS'], [short(stats.stars), 'STARS'], [String(c2.longest), 'DAY STREAK'], [short(stats.followers), 'FANS']];
    cellsS.forEach(([n, l], i) => { const cx = 30 + (W - 60) * (i + .5) / 4; TC(x, n, cx, stripY + 30, '#24163b', fitSc(n, 220, 6)); TC(x, l, cx, stripY + 74, '#6b5a80', 2); });
    T(x, 'GITROOM', W - 30 - 6 - textWidth('GITROOM') * 3 - 14, stripY + 108, '#24163b', 3);
    return c;
  }
  function makeWallpaper(layer) {
    const W = 2560, H = 1440, c = canvas(W, H), x = c.getContext('2d');
    background(x, W, H);
    const A = buildAudience(1500, 3), audH = A ? A.h - 8 : 0;
    const s = houseFit(layer, 1560, 1360 - audH);
    drawHouse(x, layer, s, 860, Math.round((H - audH - layer.height * s) / 2));
    if (A) audience(x, A, 110, H - A.h - 14);
    const px = 1700, pw = 800, headH = header(canvas(1, 1).getContext('2d'), 0, 0, 700, BGS.cream, false);
    const list = trim(blocks(700), l => 44 + headH + 10 + blocksH(l) + 40 <= H - 80);
    const cardH = 44 + headH + 10 + blocksH(list) + 40, py = Math.round((H - cardH) / 2);
    plaque(x, px, py, pw, cardH);
    header(x, px + pw / 2, py + 44, 700, BGS.cream, false);
    stackBlocks(x, list, px + 50, py + 44 + headH + 10, 700);
    return c;
  }
  // everyone strikes a pose at a piece of furniture: long for a picture, short for a video so they get up and move
  function poseAll(long) {
    walkers.forEach(w => {
      if (w.state === 'use') return;
      const sp = chooseSpot(w);
      if (!sp) return;
      w.path = []; w.task = sp; sp.busy = w;
      w.x = sp.cell[0] * 8 + 4; w.y = sp.cell[1] * 8 + 7;
      beginUse(w, long);
      w.tint = lightAt(w.x, w.y - 4);
    });
  }
  const LAYOUTS = { story: l => makeStory(l), square: l => makeSquare(l), wide: l => makeWallpaper(l) };
  const shareLight = () => (shareOpts.light === 'house' ? lightMode() : shareOpts.light);
  function useLight(m) { const maps = mapsFor(m); lightBuf = maps.light; R.setLight(maps); walkers.forEach(w => { w.tint = lightAt(w.x, w.y - 4); w.tintT = .25; }); }
  function renderShareCanvas() {
    const want = shareLight(), now = lightMode();
    if (shareOpts.pose && !posed) { poseAll(true); posed = true; }
    if (want !== now) useLight(want);
    walkers.forEach(w => { w.tint = lightAt(w.x, w.y - 4); });
    R.frame(clock, want, 99);
    drawScene(octx, 'share');
    const c = LAYOUTS[shareOpts.fmt](houseLayer());
    if (want !== now) useLight(now);
    return c;
  }

  // ---------- 15-second video ----------
  // Rendered, not filmed: the house is played forward frame by frame and every frame is encoded as fast as the device
  // can go (WebCodecs, through Mediabunny), so a 15-second video takes a few seconds. Browsers without WebCodecs film it live.
  const SECONDS = 15, FPS = 30, BITRATE = 6000000, VIDEO_W = { story: 1080, square: 1080, wide: 1920 };
  const MIMES = ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const pickMime = () => (window.MediaRecorder ? MIMES.find(t => { try { return MediaRecorder.isTypeSupported(t); } catch (e) { return false; } }) : null);
  let rec = null, videoBlob = null, videoURL = null, videoExt = 'mp4', shareKind = 'image', mediabunny = null;
  const loadMediabunny = () => mediabunny || (mediabunny = import('/vendor/mediabunny.min.mjs'));
  // The browser's own software H.264 encoder is tried first: it starts at once and runs at 100+ frames a second on a
  // laptop, while asking about the hardware encoder can stall for seconds (25 s on a Windows AMD machine) and then
  // encode slower than real time at 1080 × 1920. Devices without it use whatever they have, as WebM if H.264 is missing.
  const ENCODERS = [['avc', 'prefer-software'], ['avc'], ['vp9'], ['av1'], ['vp8']];
  const encoderPicks = {};
  const pickEncoder = (width, height) => encoderPicks[width + 'x' + height] || (encoderPicks[width + 'x' + height] = (async () => {
    if (!window.VideoEncoder) return null;
    const mb = await loadMediabunny();
    for (const [codec, hardwareAcceleration] of ENCODERS) {
      const opts = { width, height, bitrate: BITRATE, ...(hardwareAcceleration && { hardwareAcceleration }) };
      if (await mb.canEncodeVideo(codec, opts).catch(() => false)) return { codec, hardwareAcceleration };
    }
    return null;
  })());
  // the story size is by far the most used, so its encoder is looked up as soon as video is picked
  const warmVideo = () => { pickEncoder(1080, 1920).catch(() => {}); };
  // what stays put for the whole video: the frame around the house, and where the house and the audience go
  function videoJob() {
    const light = shareLight();
    useLight(light);
    if (shareOpts.pose) poseAll(false);
    lastAud = null; templating = true;
    const b = bounds(false), tpl = LAYOUTS[shareOpts.fmt](canvas(b.w, b.h)), rect = lastRect, aud = lastAud, k = VIDEO_W[shareOpts.fmt] / tpl.width;
    templating = false;
    const out = canvas(Math.round(tpl.width * k / 2) * 2, Math.round(tpl.height * k / 2) * 2), layer = canvas(b.w, b.h);
    // on a coloured background the white lawn is cut away, same as in the pictures
    let mask = null;
    if (shareOpts.bg !== 'white') {
      mask = canvas(b.w, b.h); const mx = mask.getContext('2d'), { type, GW, GH } = P;
      mx.fillStyle = '#000'; mx.fillRect(0, 0, b.w, b.h);
      for (let cy = 0; cy < GH; cy++) for (let cx = 0; cx < GW; cx++) if (type[cy * GW + cx] === 0) mx.clearRect(cx * 8 - b.x, cy * 8 - b.y, 8, 8);
    }
    // the preview turns into the video as it's made
    out.className = 'rec-live'; out.dataset.fmt = shareOpts.fmt;
    $('#story-wrap').appendChild(out);
    return { out, ctx: out.getContext('2d'), tpl, rect, aud, k, layer, lctx: layer.getContext('2d'), mask, b, light, n: 0 };
  }
  // one frame: the frame image, the lit house as it is right now, and the audience mid-cheer
  function composeFrame(r) {
    const { b, lctx, ctx, k } = r;
    lctx.globalCompositeOperation = 'source-over';
    lctx.clearRect(0, 0, b.w, b.h);
    lctx.drawImage(glc, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
    if (r.mask) { lctx.globalCompositeOperation = 'destination-in'; lctx.drawImage(r.mask, 0, 0); lctx.globalCompositeOperation = 'source-over'; }
    lctx.drawImage(ov, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(r.tpl, 0, 0, r.out.width, r.out.height);
    ctx.drawImage(r.layer, Math.round(r.rect.x * k), Math.round(r.rect.y * k), Math.round(r.rect.w * k), Math.round(r.rect.h * k));
    if (r.aud) { ctx.save(); ctx.setTransform(k, 0, 0, k, 0, 0); drawAudience(ctx, r.aud.A, r.aud.X, r.aud.Y, clock); ctx.restore(); }
  }
  function progress(n, total, label) {
    $('#rec-fill').style.width = Math.min(100, n / total * 100) + '%';
    $('#rec-btn .label').textContent = label || `Rendering… ${Math.round(n / total * 100)}%`;
  }
  function endJob(job) {
    job.out.remove();
    useLight(lightMode());
    if (rec === job) rec = null;
    setVideoUI();
  }
  function startVideo() {
    if (rec || !P) return;
    if (window.VideoEncoder) renderVideo(); else recordVideo();
  }
  async function renderVideo() {
    clearVideo();
    const job = videoJob();
    job.fast = true; job.cancel = false;
    rec = job;
    setVideoUI();
    progress(0, 1);
    let output = null;
    try {
      const mb = await loadMediabunny();
      const { width, height } = job.out;
      const enc = await pickEncoder(width, height);
      if (!enc) throw new Error('no video encoder');
      const { codec, hardwareAcceleration } = enc;
      const format = codec === 'avc' ? new mb.Mp4OutputFormat({ fastStart: 'in-memory' }) : new mb.WebMOutputFormat();
      output = new mb.Output({ format, target: new mb.BufferTarget() });
      // 'detail' tells the encoder sharp pixel edges matter more than smooth motion
      const source = new mb.CanvasSource(job.out, { codec, bitrate: BITRATE, keyFrameInterval: 2, contentHint: 'detail', ...(hardwareAcceleration && { hardwareAcceleration }) });
      output.addVideoTrack(source, { frameRate: FPS });
      await output.start();
      const total = SECONDS * FPS, dt = 1 / FPS;
      for (let i = 0; i < total; i++) {
        if (job.cancel) throw new Error('cancelled');
        // play the house forward one frame, then paint and encode it
        clock += dt; update(dt);
        R.frame(clock, job.light, 99); drawScene(octx, 'video'); composeFrame(job);
        await source.add(i * dt, dt);
        if (i % 6 === 5) { progress(i + 1, total); await new Promise(r => setTimeout(r, 0)); }
      }
      progress(total, total, 'Finishing…');
      await output.finalize();
      const blob = new Blob([output.target.buffer], { type: codec === 'avc' ? 'video/mp4' : 'video/webm' });
      endJob(job);
      finishVideo(blob, codec === 'avc' ? 'mp4' : 'webm');
    } catch (e) {
      try { if (output && output.state === 'started') await output.cancel(); } catch (e2) { /* already gone */ }
      endJob(job);
      if (job.cancel) return;
      if (window.console) console.error(e);
      // no encoder after all: film it live instead
      if (pickMime() && HTMLCanvasElement.prototype.captureStream) { toast("This browser can't render video, so it'll film the house live (15 seconds)."); recordVideo(); }
      else toast("This browser can't make videos. Chrome, Edge, Firefox and Safari can.");
    }
  }
  // fallback for browsers without WebCodecs: film the house live for 15 seconds
  function recordVideo() {
    const mime = pickMime();
    if (!mime || !HTMLCanvasElement.prototype.captureStream) { toast("This browser can't make videos. Chrome, Edge, Firefox and Safari can."); return; }
    clearVideo();
    const job = videoJob(), stream = job.out.captureStream(FPS), chunks = [];
    let mr;
    try { mr = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8000000 }); } catch (e) { endJob(job); toast("Couldn't start recording here."); return; }
    Object.assign(job, { mr, stream, t0: performance.now(), discard: false });
    mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    mr.onstop = () => { if (!job.discard) finishVideo(new Blob(chunks, { type: mime.split(';')[0] }), mime.startsWith('video/mp4') ? 'mp4' : 'webm'); };
    rec = job;
    composeFrame(job);
    mr.start(500);
    job.timer = setTimeout(() => stopVideo(false), SECONDS * 1000);
    setVideoUI();
  }
  // called by the main loop while filming live
  function recordFrame() {
    const r = rec;
    if (!r || r.fast || (r.n++ & 1)) return; // about 30 frames a second
    composeFrame(r);
    const sec = (performance.now() - r.t0) / 1000;
    progress(sec, SECONDS, `Filming… ${Math.max(0, Math.ceil(SECONDS - sec))}s`);
  }
  function stopVideo(discard) {
    const r = rec;
    if (!r) return;
    if (r.fast) { r.cancel = true; return; }
    clearTimeout(r.timer);
    r.discard = discard;
    try { r.mr.stop(); } catch (e) { /* already stopped */ }
    r.stream.getTracks().forEach(t => t.stop());
    endJob(r);
  }
  function finishVideo(blob, ext) {
    videoExt = ext; videoBlob = blob;
    videoURL = URL.createObjectURL(blob);
    const v = $('#story-vid');
    v.src = videoURL; v.play().catch(() => {});
    setVideoUI();
    toast(ext === 'mp4' ? 'Your 15-second video is ready.' : `Your video is ready (${ext.toUpperCase()}). If an app refuses it, convert it to MP4 first.`);
  }
  function clearVideo() {
    if (videoURL) URL.revokeObjectURL(videoURL);
    videoURL = null; videoBlob = null;
    const v = $('#story-vid'); v.removeAttribute('src'); v.load();
  }
  function setVideoUI() {
    const vid = shareKind === 'video', save = $('#save-btn');
    document.querySelectorAll('[data-share-kind]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.shareKind === shareKind)));
    $('#story-img').hidden = vid && (!!videoURL || !!rec);
    $('#story-vid').hidden = !(vid && videoURL) || !!rec;
    $('#story-vid').dataset.fmt = shareOpts.fmt;
    $('#rec-row').hidden = !vid;
    $('#copy-btn').hidden = vid;
    $('#story-modal').classList.toggle('recording', !!rec);
    $('#rec-btn').disabled = !!rec;
    if (!rec) { $('#rec-btn .label').textContent = videoURL ? 'Make it again' : `Make ${SECONDS}s video`; $('#rec-fill').style.width = videoURL ? '100%' : '0%'; }
    if (vid) {
      save.querySelector('.label').textContent = 'Save video';
      if (videoURL && !rec) { save.href = videoURL; save.download = `${profile.handle}-gitroom-${shareOpts.fmt}.${videoExt}`; save.classList.remove('off'); }
      else { save.removeAttribute('href'); save.classList.add('off'); }
    } else {
      save.querySelector('.label').textContent = 'Save image';
      save.classList.remove('off');
      if (shareURL) { save.href = shareURL; save.download = shareName(); }
    }
    $('#native-share-btn').hidden = !canShareFiles() || (vid && (!videoURL || !!rec));
    setNote();
  }
  function setNote() {
    const vid = shareKind === 'video';
    const size = vid
      ? { story: '1080 × 1920 video for stories and reels', square: '1080 × 1080 video for posts', wide: '1920 × 1080 video' }[shareOpts.fmt]
      : { story: '1080 × 1920 for Instagram, TikTok and WhatsApp stories', square: '1080 × 1080 for posts', wide: '2560 × 1440 desktop wallpaper' }[shareOpts.fmt];
    $('#story-note').textContent = vid
      ? `${size}. ${rec ? (rec.fast ? 'Rendering 15 seconds of the house…' : 'Filming the house live: keep this tab open.') : videoURL ? 'Saved as ' + videoExt.toUpperCase() + '.' : '15 seconds of the house in motion, ready in a few seconds. The picture shows how it will be framed.'}`
      : `${size}. On a phone you can also press and hold the image to save it.`;
  }
  function syncShareUI() {
    document.querySelectorAll('[data-fmt-btn]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.fmtBtn === shareOpts.fmt)));
    document.querySelectorAll('[data-bg]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.bg === shareOpts.bg)));
    document.querySelectorAll('[data-slight]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.slight === shareOpts.light)));
    document.querySelectorAll('[data-show]').forEach(i => { i.checked = !!shareOpts[i.dataset.show]; });
    const cap = $('#s-caption'); if (document.activeElement !== cap) cap.value = shareOpts.caption || '';
  }
  let shareT = null;
  function renderShare() {
    clearTimeout(shareT);
    const job = ++shareJob, img = $('#story-img');
    syncShareUI();
    img.dataset.fmt = shareOpts.fmt;
    $('#story-wrap').classList.add('busy');
    setNote();
    shareT = setTimeout(() => {
      const c = renderShareCanvas();
      c.toBlob(b => {
        if (job !== shareJob || !b) return;
        shareBlob = b;
        if (shareURL) URL.revokeObjectURL(shareURL);
        shareURL = URL.createObjectURL(b);
        img.src = shareURL;
        img.alt = `${{ story: 'Story', square: 'Square', wide: 'Wallpaper' }[shareOpts.fmt]} image of ${custom.name || profile.house}, @${profile.handle}'s pixel house`;
        $('#story-wrap').classList.remove('busy');
        setVideoUI();
      }, 'image/png');
    }, 60);
  }
  function setShare(patch) {
    if (rec) return;
    Object.assign(shareOpts, patch); store.set('gitroom-share', JSON.stringify(shareOpts));
    // an old video no longer matches the new settings
    if (videoURL) clearVideo();
    renderShare();
  }

  // ---------- modals ----------
  let lastFocus = null;
  function openModal(m) { lastFocus = document.activeElement; m.hidden = false; document.body.classList.add('modal-open'); const f = m.querySelector('[data-close]'); if (f) f.focus(); }
  function closeModal(m) {
    m.hidden = true;
    if (![...document.querySelectorAll('.modal')].some(x => !x.hidden)) document.body.classList.remove('modal-open');
    if (m.id === 'story-modal') { posed = false; if (rec) { stopVideo(true); toast('Video cancelled.'); } }
    if (m.id === 'custom-modal' && owner && dirty) toast('Your changes are kept in this browser. Publish them so visitors see them too.');
    if (lastFocus) lastFocus.focus();
  }

  // ---------- screens ----------
  function countUp() {
    document.querySelectorAll('#stats [data-count]').forEach(b => {
      const end = +b.dataset.count, o = { v: 0 };
      if (reduce) return;
      gsap.to(o, { v: end, duration: 1.3, ease: 'power3.out', delay: .3, onUpdate: () => { b.textContent = fmt(o.v, b.dataset.fmt); } });
    });
  }
  function stageMsg(kind, text, title) {
    const el = $('#stage-msg');
    if (!kind) { el.hidden = true; return; }
    el.hidden = false; el.dataset.kind = kind;
    if (title) $('#msg-title').textContent = title;
    el.querySelector('.msg-text').textContent = text;
  }
  // a resident keeps you company while the house loads (and looks sorry if it can't)
  let msgPal = null;
  function msgArt() {
    const cv = $('#msg-art'), x = cv.getContext('2d'), ids = ['react', 'claude', 'cat', 'pytorch', 'docker', 'vite', 'next', 'dog'].filter(id => SPR[id]);
    msgPal = msgPal || pick(ids);
    x.clearRect(0, 0, 24, 24);
    x.drawImage(SPR[msgPal].frames.stand, 4, 4);
  }
  let roomsTotal = 0;
  const setFill = p => { const f = $('#msg-fill'); if (f) f.style.width = Math.max(4, Math.min(100, p)) + '%'; };
  function onStep(name, n) {
    const t = $('#stage-msg .msg-text');
    if (name === 'server') { t.textContent = 'Knocking on the door…'; setFill(18); }
    else if (name === 'browser') { t.textContent = 'Reading GitHub straight from your browser…'; setFill(22); }
    else if (name === 'repos') { t.textContent = 'Counting the repos…'; setFill(32); }
    else if (name === 'rooms') { roomsTotal = n; t.textContent = `Measuring ${n} rooms…`; setFill(40); }
    else if (name === 'room') { t.textContent = `Furnishing room ${n} of ${roomsTotal}…`; setFill(40 + 56 * n / Math.max(1, roomsTotal)); }
  }
  function showError(e, name) {
    const mins = e.reset ? Math.max(1, Math.ceil((e.reset - Date.now()) / 60000)) : 0;
    const [title, text] = e.code === 'not-found' ? ['No house here', `There's no GitHub user called @${name}. Check the spelling?`]
      : e.code === 'org' ? ['Organizations live elsewhere', e.message]
      : e.code === 'invalid' ? ['That name looks off', "GitHub usernames use letters, numbers and single dashes."]
      : e.code === 'rate' ? ['GitHub needs a breather', `GitHub lets every network look up a few houses an hour for free, and yours has used them up. Try again in ${mins || 'a few'} minute${mins === 1 ? '' : 's'}, or drop by a featured house below.`]
      : ["Couldn't reach GitHub", e.message || 'Check your connection and try again.'];
    stageMsg('error', text, title);
    setFill(100);
    $('#handle').textContent = '@' + name;
    $('#sub').textContent = e.code === 'not-found' ? 'No such GitHub user' : 'This house is taking a break';
    $('#stage-msg .msg-actions').innerHTML = e.code === 'rate' || e.code === 'down' || e.code === 'slow' || !e.code
      ? `<button class="btn hot" type="button" data-retry>Try again</button><a class="btn" href="/">Home</a>`
      : `<a class="btn hot" href="/">Try another username</a>`;
    const r = $('[data-retry]'); if (r) r.addEventListener('click', () => location.reload());
    document.body.classList.add('house-error');
  }
  // the yellow circle wipe carries over from the landing page and back
  function reveal() {
    if (!wipe.classList.contains('cover')) return;
    if (reduce) { wipe.classList.remove('cover'); return; }
    gsap.fromTo(wipe, { clipPath: 'circle(150% at 50% 50%)' }, { clipPath: 'circle(0% at 50% 50%)', duration: .65, ease: 'power3.inOut', onComplete: () => { wipe.classList.remove('cover'); gsap.set(wipe, { clearProps: 'clipPath' }); } });
  }
  function leaveTo(href, cx, cy) {
    if (reduce) { location.href = href; return; }
    try { sessionStorage.setItem('gitroom-wipe', '1'); } catch (e) {}
    gsap.fromTo(wipe, { clipPath: `circle(0% at ${cx}px ${cy}px)` }, { clipPath: `circle(150% at ${cx}px ${cy}px)`, duration: .55, ease: 'power3.in', onComplete: () => { location.href = href; } });
  }
  function exploreList() {
    const here = (profile ? profile.handle : login).toLowerCase();
    $('#explore-list').innerHTML = window.GitRoomData.FEATURED.filter(x => x !== here).map(x => `<a class="chipbtn" href="/u/${x}">@${x}</a>`).join('');
  }
  function shareLinks() {
    const url = `${location.origin}/u/${profile.handle}`;
    $('#share-link').value = url.replace(/^https?:\/\//, '');
    const text = owner ? 'My GitHub, but it’s a pixel house 🏠' : `@${profile.handle}’s GitHub, but it’s a pixel house 🏠`;
    $('#share-x').href = `https://twitter.com/intent/tweet?${new URLSearchParams({ text, url })}`;
    $('#share-li').href = `https://www.linkedin.com/sharing/share-offsite/?${new URLSearchParams({ url })}`;
  }
  function show(p) {
    profile = p;
    login = p.handle;
    shuffle = settings && Number.isInteger(settings.layout) ? settings.layout : 0;
    castPlaceholders();
    loadCustom();
    stageMsg(null);
    roomVisible = true;
    $('#share-btn').disabled = false;
    buildModel(); fillProfile(); makeHouse(true); countUp(); shareLinks();
    document.title = `${custom.name || p.house} · @${p.handle} · GitRoom`;
    if (!reduce) {
      gsap.from('.side .panel', { y: 16, opacity: 0, stagger: .08, duration: .45, ease: 'power3.out' });
      gsap.from('.profile > *', { y: -10, opacity: 0, stagger: .06, duration: .4, ease: 'power3.out' });
    }
  }
  async function boot(name) {
    login = name;
    msgArt();
    stageMsg('loading', 'Knocking on the door…', `Building @${name}'s house`);
    setFill(8);
    exploreList();
    const D = window.GitRoomData;
    const own = D.loadSettings(name).catch(() => ({ settings: null }));
    let res;
    try {
      res = await D.loadHouse(name, { step: onStep, rooms: own.then(o => (o.settings && o.settings.rooms) || []) });
    } catch (e) {
      if (window.console && !e.code) console.error(e);
      showError(e, name);
      reveal();
      return;
    }
    setFill(100);
    const saved = await own;
    published = saved.settings || null;
    pubBranch = saved.branch || null;
    owner = await D.isOwner(name, published);
    settings = published ? { ...published } : null;
    if (owner) {
      const d = D.getDraft(name);
      if (d) { settings = D.cleanSettings({ ...d, keys: published.keys }); dirty = !same(settings, published); }
    }
    profile = res.profile;
    if (settings && settings.rooms) await ensureDetails(settings.rooms);
    show(res.profile);
    if (res.source === 'stale') toast('GitHub needs a short breather, so this is the copy from your last visit.');
    reveal();
    // "Connect GitHub" on the home page sends owners here with ?connect=1
    const q = new URLSearchParams(location.search);
    if (q.has('connect')) { try { history.replaceState(null, '', location.pathname); } catch (e) {} if (!owner) openGitHub('connect'); else toast("You're already connected here. Press Edit house."); }
  }

  // ---------- wiring ----------
  function wire() {
    stage = $('#stage'); cam = $('#cam'); glc = $('#gl'); ov = $('#ov'); octx = ov.getContext('2d');
    tip = $('#tip'); toastEl = $('#toast'); wipe = $('#wipe');
    tmp = canvas(64, 64); tctx = tmp.getContext('2d');
    shadow = (() => { const c = canvas(10, 3), x = c.getContext('2d'); x.fillStyle = 'rgba(70,22,4,.34)'; x.fillRect(2, 0, 6, 1); x.fillRect(0, 1, 10, 1); x.fillRect(2, 2, 6, 1); return c; })();
    starArt(); iconArt();
    drawMap($('#logo-mark'), window.PX.LOGO, window.PX.LOGO_PAL);
    // the little heart signs some fans hold up
    heartCard = (() => {
      const c = canvas(9, 10), x = c.getContext('2d');
      x.fillStyle = '#24163b'; x.fillRect(0, 0, 9, 7); x.fillRect(4, 7, 1, 3);
      x.fillStyle = '#ffffff'; x.fillRect(1, 1, 7, 5);
      x.fillStyle = '#ff3b5c'; [[2, 2], [3, 2], [5, 2], [6, 2], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [3, 4], [4, 4], [5, 4], [4, 5]].forEach(([i, j]) => x.fillRect(i, j, 1, 1));
      return c;
    })();
    R = window.RENDER.create(glc) || window.RENDER.fallback(glc);
    glc.addEventListener('webglcontextlost', e => e.preventDefault());
    glc.addEventListener('webglcontextrestored', () => { R = window.RENDER.create(glc) || window.RENDER.fallback(glc); if (P) { R.setHouse(base, P.W, P.H); relight(); } });

    document.querySelectorAll('[data-theme-toggle]').forEach(b => b.addEventListener('click', () => {
      const next = darkNow() ? 'light' : 'dark';
      document.documentElement.dataset.theme = next; store.set('gitroom-theme', next);
    }));
    window.addEventListener('resize', () => { if (!roomVisible || !P) return; fitStage(); if (zoomed === 'free') { clampCam(); applyCam(); } else zoomTo(zoomed, true); });
    $('#overview-btn').addEventListener('click', () => zoomTo(null));
    document.addEventListener('click', e => { const b = e.target.closest('[data-zoom]'); if (b && P) { zoomTo(zoomed === b.dataset.zoom ? null : b.dataset.zoom); if (window.innerWidth < 900) stage.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); } });
    $('#resident-list').addEventListener('click', e => {
      if (e.target.closest('[data-crowd]')) { zoomTo(null); cheerBurst(); toast(`${fmtN(stats.followers)} fans cheering outside. One for every follower.`); return; }
      const b = e.target.closest('[data-ping]');
      if (!b) return;
      const w = walkers.find(v => v.res.id === b.dataset.ping);
      if (!w) return;
      zoomTo(P.roomAt(w.x, w.y) || w.zone); ping(w);
      if (window.innerWidth < 900) stage.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    });
    wireCamera();

    ov.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse' || !P || e.buttons) return; const h = hitAt(...toWorld(e)); ov.style.cursor = h && h.kind !== 'room' ? 'pointer' : ''; showTip(tipData(h), e.clientX, e.clientY); });
    ov.addEventListener('pointerleave', () => { tip.hidden = true; });
    let tipT;
    stage.addEventListener('click', e => {
      if (swallowClick) { swallowClick = false; return; }
      if (!P || (e.target !== ov && e.target !== stage)) return;
      const h = e.target === ov ? hitAt(...toWorld(e)) : null, touch = e.pointerType && e.pointerType !== 'mouse';
      if (h && h.kind !== 'room' && touch) { showTip(tipData(h), e.clientX, e.clientY); clearTimeout(tipT); tipT = setTimeout(() => { tip.hidden = true; }, 3000); }
      if (h && h.kind === 'res') { if (zoomed !== 'free') zoomTo(P.roomAt(h.w.x, h.w.y) || h.w.zone); ping(h.w); }
      else if (h && (h.kind === 'sign' || h.kind === 'room')) { if (zoomed !== 'free') zoomTo(zoomed === h.id ? null : h.id); }
      else if (h && h.kind === 'post' && owner) openCustom();
      else if (!h && zoomed && zoomed !== 'free') zoomTo(null);
    });

    // visit another house
    $('#visit-form').addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#visit-input').value.trim().replace(/^@/, '').replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '').replace(/[/?#].*$/, '');
      if (!window.GitRoomData.VALID_LOGIN.test(name)) { toast(name ? "That doesn't look like a GitHub username." : 'Type a GitHub username first.'); $('#visit-input').focus(); return; }
      const r = $('#visit-input').getBoundingClientRect();
      leaveTo('/u/' + encodeURIComponent(name), r.left + r.width / 2, r.top + r.height / 2);
    });

    // owner: edit, connect, publish
    let nameT;
    $('#c-name').addEventListener('input', e => {
      custom.name = e.target.value.replace(/[^\w '&.-]/g, '').slice(0, 18) || profile.house; signpost = null; post = null; saveCustom();
      // a longer or shorter name means a different signpost, so the crowd makes room again
      clearTimeout(nameT); nameT = setTimeout(() => { if (P) { buildCrowd(); fitStage(); if (!zoomed) zoomTo(null, true); } }, 300);
    });
    $('#c-papers').addEventListener('click', e => { const b = e.target.closest('[data-paper]'); if (!b || b.disabled) return; custom.paper = b.dataset.paper; saveCustom(); paint(); buildCustom(); });
    $('#c-pets').addEventListener('click', e => { const b = e.target.closest('[data-pet]'); if (!b || b.disabled) return; custom.pet = b.dataset.pet; saveCustom(); spawnPet(); buildCustom(); });
    document.querySelectorAll('[data-light]').forEach(b => b.addEventListener('click', () => { custom.light = b.dataset.light; saveCustom(); relight(); buildCustom(); }));
    $('#c-tags').addEventListener('change', e => { custom.tags = e.target.checked; saveCustom(); });
    $('#shuffle-btn').addEventListener('click', () => { if (!owner) return; shuffle++; makeHouse(true); saveCustom(); buildCustom(); toast('New floor plan. Publish to keep it for everyone.'); });
    $('#plan-reset').addEventListener('click', () => { if (!owner) return; shuffle = 0; makeHouse(true); saveCustom(); buildCustom(); });
    ['#custom-btn', '#edit-btn'].forEach(s => $(s).addEventListener('click', () => { if (profile) openCustom(); }));
    $('#connect-btn').addEventListener('click', () => { if (profile) openGitHub('connect'); });
    $('#publish-btn').addEventListener('click', () => { if (owner) openGitHub('publish'); });
    $('#c-save').addEventListener('click', () => { if (!owner || !dirty) return; closeModal($('#custom-modal')); openGitHub('publish'); });
    $('#c-discard').addEventListener('click', discardEdits);
    $('#c-rooms').addEventListener('change', async e => {
      const i = e.target.closest('[data-room]'); if (!i) return;
      const cur = (settings && settings.rooms) || pickRepos().map(r => r.id);
      const next = i.checked ? [...new Set([...cur, i.dataset.room])].slice(0, 10) : cur.filter(id => id !== i.dataset.room);
      if (i.checked) await ensureDetails([i.dataset.room]);
      applyEdit({ rooms: next.length ? next : null }, true);
    });
    $('#c-rooms-auto').addEventListener('click', () => applyEdit({ rooms: null }, true));
    $('#c-bonus').addEventListener('change', e => {
      const i = e.target.closest('[data-bonus]'); if (!i) return;
      const cur = (settings && settings.bonus) || rooms.filter(r => r.special).map(r => r.special);
      applyEdit({ bonus: i.checked ? [...new Set([...cur, i.dataset.bonus])] : cur.filter(id => id !== i.dataset.bonus) }, true);
    });
    const fixesCopy = () => JSON.parse(JSON.stringify((settings && settings.fixes) || {}));
    $('#c-fixes').addEventListener('click', e => {
      const b = e.target.closest('[data-fix]'); if (!b) return;
      const fixes = fixesCopy(), f = fixes[b.dataset.fix] || (fixes[b.dataset.fix] = { add: [], remove: [] }), id = b.dataset.id;
      if (f.remove.includes(id)) f.remove = f.remove.filter(x => x !== id);
      else if (f.add.includes(id)) f.add = f.add.filter(x => x !== id);
      else f.remove.push(id);
      applyEdit({ fixes }, true);
    });
    $('#c-fixes').addEventListener('change', e => {
      const s = e.target.closest('[data-add]'); if (!s || !s.value) return;
      const fixes = fixesCopy(), f = fixes[s.dataset.add] || (fixes[s.dataset.add] = { add: [], remove: [] });
      f.remove = f.remove.filter(x => x !== s.value);
      if (!f.add.includes(s.value)) f.add.push(s.value);
      applyEdit({ fixes }, true);
    });
    $('#gh-commit-link').addEventListener('click', () => watchGitHub());
    $('#gh-check').addEventListener('click', () => { if (ghWatch) ghWatch.now(); else watchGitHub(); });
    window.addEventListener('focus', () => { if (ghWatch) ghWatch.now(); });

    // share
    document.querySelectorAll('[data-fmt-btn]').forEach(b => b.addEventListener('click', () => setShare({ fmt: b.dataset.fmtBtn })));
    document.querySelectorAll('[data-bg]').forEach(b => b.addEventListener('click', () => setShare({ bg: b.dataset.bg })));
    document.querySelectorAll('[data-slight]').forEach(b => b.addEventListener('click', () => setShare({ light: b.dataset.slight })));
    document.querySelectorAll('[data-show]').forEach(i => i.addEventListener('change', () => setShare({ [i.dataset.show]: i.checked })));
    let capT;
    $('#s-caption').addEventListener('input', e => { clearTimeout(capT); capT = setTimeout(() => setShare({ caption: e.target.value.slice(0, 40) }), 350); });
    document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) closeModal(m); }));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { const open = [...document.querySelectorAll('.modal')].find(m => !m.hidden); if (open) closeModal(open); else if (zoomed) zoomTo(null); return; }
      if (!P || e.target.closest('input, textarea, select') || [...document.querySelectorAll('.modal')].some(m => !m.hidden)) return;
      const { sw, sh } = view();
      if (e.key === '+' || e.key === '=') zoomAt(sw / 2, sh / 2, 1.4, true);
      else if (e.key === '-' || e.key === '_') zoomAt(sw / 2, sh / 2, 1 / 1.4, true);
    });
    $('#share-btn').addEventListener('click', () => { if (!P) return; openModal($('#story-modal')); renderShare(); });
    const nativeBtn = $('#native-share-btn');
    nativeBtn.hidden = !canShareFiles();
    nativeBtn.addEventListener('click', async () => {
      const vid = shareKind === 'video', blob = vid ? videoBlob : shareBlob;
      if (!blob) return;
      const file = vid ? new File([blob], `${profile.handle}-gitroom.${videoExt}`, { type: blob.type }) : new File([blob], shareName(), { type: 'image/png' });
      try { await navigator.share({ files: [file], title: `${custom.name || profile.house} · GitRoom`, text: `${location.origin}/u/${profile.handle}` }); }
      catch (err) { if (err && err.name !== 'AbortError') toast(`Sharing didn't work here. Use Save ${vid ? 'video' : 'image'} instead.`); }
    });
    document.querySelectorAll('[data-share-kind]').forEach(b => b.addEventListener('click', () => { if (rec) return; shareKind = b.dataset.shareKind; if (shareKind === 'video') warmVideo(); setVideoUI(); }));
    $('#rec-btn').addEventListener('click', startVideo);
    $('#copy-btn').addEventListener('click', async () => {
      try { if (!shareBlob || !window.ClipboardItem) throw new Error('x'); await navigator.clipboard.write([new ClipboardItem({ 'image/png': shareBlob })]); toast('Image copied.'); }
      catch (e) { toast("Copying images isn't allowed here. Use Save image instead."); }
    });
    $('#copy-link').addEventListener('click', async () => {
      const url = `${location.origin}/u/${profile.handle}`;
      try { await navigator.clipboard.writeText(url); toast('Link copied.'); } catch (e) { $('#share-link').select(); toast('Press Ctrl+C (or ⌘C) to copy.'); }
    });
    $('#back-btn').addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault();
      const b = e.currentTarget.getBoundingClientRect(); tip.hidden = true;
      leaveTo('/', b.left + b.width / 2, b.top + b.height / 2);
    });
    requestAnimationFrame(t => { last = t; requestAnimationFrame(loop); });
    setInterval(() => { if (roomVisible && custom && custom.light === 'auto' && lightMode() !== lastMode) relight(); }, 60000);
  }

  // checks the house's own rules (signpost on clear lawn, fans off the walls and the walkway); used by tests
  function inspect() {
    if (!P) return null;
    const { GW, GH, type, walkway: ww } = P, p = ensurePost(), at = (x, y) => (x < 0 || y < 0 || x >= GW || y >= GH ? -1 : type[y * GW + x]);
    const cellsUnder = (x, y, w, h, pad) => { const out = []; for (let cy = Math.floor(y / 8) - pad; cy <= Math.floor((y + h - 1) / 8) + pad; cy++) for (let cx = Math.floor(x / 8) - pad; cx <= Math.floor((x + w - 1) / 8) + pad; cx++) out.push([cx, cy]); return out; };
    const sign = cellsUnder(p.x, p.y, p.w, p.h, 1);
    const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    const onWalk = (cx, cy) => cx >= ww.l && cx <= ww.r && cy >= ww.row;
    // a fan needs at least GAP cells of open lawn between it and the nearest wall, floor, siding or courtyard
    const nearWall = (cx, cy) => { for (let j = -GAP; j <= GAP; j++) for (let i = -GAP; i <= GAP; i++) { if (i * i + j * j > GAP * GAP) continue; if (at(cx + i, cy + j) > 0) return true; } return false; };
    const fanCells = crowd.map(f => [Math.floor(f.x / 8), Math.floor((f.y - 1) / 8)]);
    return {
      rooms: rooms.length, bonus: rooms.filter(r => r.special).length, courts: (P.courts || []).length, fans: crowd.length, followers: stats.followers,
      signOnLawn: sign.every(([cx, cy]) => at(cx, cy) === 0), signOffWalkway: !sign.some(([cx, cy]) => onWalk(cx, cy) && cy > Math.floor(p.y / 8) - 2 && cx >= ww.l && cx <= ww.r) && !(p.x < (ww.r + 1) * 8 && p.x + p.w > ww.l * 8),
      signInCanvas: p.x >= 0 && p.y >= 0 && p.x + p.w <= P.W && p.y + p.h <= P.H,
      fansNearWalls: fanCells.filter(([cx, cy]) => nearWall(cx, cy)).length,
      fansOnWalkway: fanCells.filter(([cx, cy]) => onWalk(cx, cy)).length,
      fansOnSign: crowd.filter(f => overlap({ x: f.x - 6, y: f.y - 14, w: 12, h: 14 }, p)).length,
      bannerOnSign: !!banner && overlap({ x: banner.x, y: banner.y, w: banner.c.width, h: banner.c.height }, p),
      inCanvas: !crowdBox || (crowdBox.x0 >= -10 && crowdBox.y0 >= -30 && crowdBox.x1 <= P.W + 10 && crowdBox.y1 <= P.H + 4),
    };
  }

  let started = false;
  window.GitRoomHouse = {
    inspect,
    // a fresh floor plan, for tests that check many layouts
    shuffle() { if (!profile) return null; shuffle++; makeHouse(false); return inspect(); },
    // the same house with a different number of fans outside (null goes back to the real number)
    fans(n) { if (!profile) return null; fanTest = n; makeHouse(false); return inspect(); },
    // the house as it looks right now (crowd and all) on a transparent background, scaled up with square pixels
    snapshot({ scale = 4, crowd = true, light } = {}) {
      if (!P) return null;
      if (light && light !== lightMode()) { custom.light = light; relight(); }
      R.frame(clock, lightMode(), 99); drawScene(octx, 'live');
      const b = bounds(crowd), c = canvas(b.w * scale, b.h * scale), x = c.getContext('2d');
      x.imageSmoothingEnabled = false;
      x.drawImage(glc, b.x, b.y, b.w, b.h, 0, 0, b.w * scale, b.h * scale);
      x.drawImage(ov, b.x, b.y, b.w, b.h, 0, 0, b.w * scale, b.h * scale);
      return c.toDataURL('image/png');
    },
    mount({ login }) {
      if (started) return;
      started = true;
      wire();
      boot(login);
    },
  };
})();
