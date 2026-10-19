/* GitRoom layout: seeded square-ish houses (one room per repo), milestone furniture, a contribution rug, and a baked light map. */
(() => {
  const { textWidth, drawText, canvas } = window.PX;
  const { P: FP } = window.FURN;
  const CS = 8, FACE = 4, MG = 3, MAXW = 66, MAXH = 66;
  // COURT: lawn walled in by rooms, drawn as a little garden instead of a white hole in the house
  const EMPTY = 0, WALL = 1, FACEC = 2, FLOOR = 3, EXT = 4, COURT = 5;

  function rng(seed) { let s = seed >>> 0 || 1; return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const gapOK = (a, b) => a.x + a.w + 1 <= b.x || b.x + b.w + 1 <= a.x || a.y + a.h + 1 <= b.y || b.y + b.h + 1 <= a.y;
  const faceOf = s => (s.kind === 'stub' ? 0 : FACE);
  const signW = rm => textWidth(rm.sign) + 6;
  const rgbC = {};
  const rgb = h => rgbC[h] || (rgbC[h] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
  const hex = a => '#' + a.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  const shadeOf = (h, f) => hex(rgb(h).map(v => f > 0 ? v + (255 - v) * f : v * (1 + f)));
  function bbox(list) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    list.forEach(s => { x0 = Math.min(x0, s.x); y0 = Math.min(y0, s.y); x1 = Math.max(x1, s.x + s.w); y1 = Math.max(y1, s.y + s.h); });
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
  }
  function attach(S, side, w, h, ri) {
    if (side === 'E' || side === 'W') {
      const f0 = S.y + faceOf(S), f1 = S.y + S.h - 3;
      if (f1 < f0) return null;
      const dy = ri(f0, f1), lo = dy + 3 - h, hi = dy - FACE;
      if (hi < lo) return null;
      const y = ri(lo, hi), x = side === 'E' ? S.x + S.w + 1 : S.x - 1 - w;
      return { room: { x, y, w, h }, door: { cells: [0, 1, 2].map(k => [side === 'E' ? S.x + S.w : S.x - 1, dy + k]), vertical: true } };
    }
    const d0 = S.x, d1 = S.x + S.w - 3;
    if (d1 < d0) return null;
    const dx = ri(d0, d1), x = ri(dx + 3 - w, dx), y = side === 'N' ? S.y - 1 - h : S.y + S.h + 1;
    return { room: { x, y, w, h }, door: { cells: [0, 1, 2].map(k => [dx + k, side === 'N' ? S.y - 1 : S.y + S.h]), vertical: false } };
  }
  let LIM = 66;
  // opts.pad: extra lawn (in cells) around the house, and opts.below: more again under it, for the crowd of fans outside
  function plan(rooms, nBadges, seed, cal, opts = {}) {
    for (const [lim, tries] of [[66, 90], [76, 80], [96, 60]]) {
      LIM = lim;
      for (let a = 0; a < tries; a++) { const p = tryPlan(rooms, nBadges, seed + a * 7919 + lim, cal, opts.pad || 0, opts.below || 0); if (p) return p; }
    }
    return null;
  }
  function tryPlan(rooms, nBadges, seed, cal, pad, below) {
    const r = rng(seed), ri = (a, b) => a + Math.floor(r() * (b - a + 1)), n = rooms.length;
    const halls = [];
    const spine = { x: 0, y: 0, w: 6, h: ri(26, 32) + n, kind: 'spine' };
    halls.push(spine);
    const gLen = Math.max(12, Math.ceil((nBadges * 19 + 22) / CS)), gSide = r() < .5 ? -1 : 1;
    halls.push({ x: gSide < 0 ? -gLen : 6, y: ri(6, spine.h - 18), w: gLen, h: 8, kind: 'gallery', side: gSide });
    const nb = n <= 3 ? 1 : n <= 6 ? 2 : n <= 8 ? 3 : 4, sides = [-gSide, gSide, -gSide, gSide];
    for (let b = 0; b < nb; b++) for (let t = 0; t < 16; t++) {
      const len = ri(10, 17), side = sides[b], br = { x: side < 0 ? -len : 6, y: ri(4, spine.h - 12), w: len, h: 8, kind: 'branch', side };
      if (halls.every(hh => hh.kind === 'spine' || gapOK(br, hh))) { halls.push(br); break; }
    }
    halls.filter(hh => hh.kind !== 'spine').forEach(hh => {
      if (r() > .5) return;
      const len = ri(5, 8), x = hh.side < 0 ? hh.x : hh.x + hh.w - 6, stub = { x, y: hh.y + hh.h, w: 6, h: len, kind: 'stub', side: hh.side };
      if (halls.every(q => q === hh || gapOK(stub, q))) halls.push(stub);
    });
    const placed = [];
    const ws = rooms.map(rm => Math.pow(Math.max(1, rm.weight), .5)), wsum = ws.reduce((a, b) => a + b, 0), TOTAL = 640 + 64 * n;
    const order = rooms.map((rm, i) => i).sort((a, b) => ws[b] - ws[a]);
    for (const i of order) {
      const rm = rooms[i], area = clamp(Math.round(ws[i] / wsum * TOTAL * (.9 + r() * .2)), 84, 400);
      const minW = Math.max(9, Math.ceil((signW(rm) + 12) / CS));
      let best = null;
      for (let k = 0; k < 160; k++) {
        const asp = .7 + r() * .7;
        const w = clamp(Math.round(Math.sqrt(area / asp)), minW, 22), h = clamp(Math.round(area / w), FACE + 6, 22);
        const S = halls[ri(0, halls.length - 1)], vert = S.h > S.w, sl = vert ? ['E', 'W', 'E', 'W', 'N'] : ['N', 'S', 'S', 'E', 'W'], side = sl[ri(0, sl.length - 1)];
        if ((S.kind === 'gallery' && side === 'N') || (S.kind === 'spine' && side === 'S') || (S.kind === 'stub' && side === 'N')) continue;
        if (vert && side === 'N' && S.kind !== 'spine') continue;
        if (!vert && (side === 'E' || side === 'W') && side !== (S.side < 0 ? 'W' : 'E')) continue;
        const c = attach(S, side, w, h, ri);
        if (!c || !halls.every(q => gapOK(c.room, q)) || !placed.every(q => gapOK(c.room, q))) continue;
        const bb = bbox([...halls, ...placed, c.room]);
        if (bb.w > LIM || bb.h > LIM) continue;
        const score = bb.w * bb.h * (1 + r() * .25) + Math.abs(bb.w - bb.h) * 34;
        if (!best || score < best.score) best = { ...c, score, hall: S };
      }
      if (!best) return null;
      placed.push({ ...best.room, rm, door: best.door, hall: best.hall });
    }
    return raster(halls, placed, nBadges, r, cal, pad, below);
  }

  function raster(halls, placed, nBadges, r, cal, pad = 0, below = 0) {
    const spaces = [...halls.map(h => ({ ...h, id: 'hall' })), ...placed.map(m => ({ ...m, id: m.rm.key, kind: 'room' }))];
    // YARD: a strip of lawn under the house so the signpost always has somewhere to stand
    const YARD = 6, mg = MG + pad, bb = bbox(spaces), ox = bb.x0 - 1 - mg, oy = bb.y0 - 1 - mg, GW = bb.w + 2 + 2 * mg, GH = bb.h + 2 + 2 * mg + YARD + below;
    const N = GW * GH, type = new Uint8Array(N), owner = new Int16Array(N).fill(-1), door = new Uint8Array(N), fk = new Int8Array(N).fill(-1), occ = new Uint8Array(N);
    const I = (x, y) => y * GW + x, T = (x, y) => (x < 0 || y < 0 || x >= GW || y >= GH) ? EMPTY : type[I(x, y)];
    spaces.forEach((s, si) => { s.gx = s.x - ox; s.gy = s.y - oy; for (let y = s.gy; y < s.gy + s.h; y++) for (let x = s.gx; x < s.gx + s.w; x++) { type[I(x, y)] = FLOOR; owner[I(x, y)] = si; } });
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      if (type[I(x, y)] !== EMPTY) continue;
      outer: for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (T(x + i, y + j) === FLOOR) { type[I(x, y)] = WALL; break outer; }
    }
    placed.forEach(m => {
      const hi = spaces.findIndex(s => s.kind === m.hall.kind && s.x === m.hall.x && s.y === m.hall.y);
      m.door.cells.forEach(([cx, cy]) => { const k = I(cx - ox, cy - oy); type[k] = FLOOR; owner[k] = hi; door[k] = m.door.vertical ? 1 : 2; });
    });
    for (let x = 0; x < GW; x++) for (let y = 1; y < GH; y++) {
      if (type[I(x, y)] !== FLOOR || door[I(x, y)] || T(x, y - 1) !== WALL) continue;
      const o = owner[I(x, y)];
      for (let k = 0; k < FACE; k++) { const q = I(x, y + k); if (y + k >= GH || type[q] !== FLOOR || owner[q] !== o || door[q]) break; type[q] = FACEC; fk[q] = k; }
    }
    for (let x = 0; x < GW; x++) for (let y = 1; y < GH - 1; y++) {
      if (type[I(x, y)] === EMPTY && T(x, y - 1) === WALL) { type[I(x, y)] = EXT; fk[I(x, y)] = 0; if (T(x, y + 1) === EMPTY) { type[I(x, y + 1)] = EXT; fk[I(x, y + 1)] = 1; } }
    }
    const open = new Uint8Array(N), fq = [];
    const seed = (x, y) => { const k = I(x, y); if (type[k] === EMPTY && !open[k]) { open[k] = 1; fq.push(k); } };
    for (let x = 0; x < GW; x++) { seed(x, 0); seed(x, GH - 1); }
    for (let y = 0; y < GH; y++) { seed(0, y); seed(GW - 1, y); }
    for (let h = 0; h < fq.length; h++) { const k = fq[h], x = k % GW, y = (k - x) / GW; if (x > 0) seed(x - 1, y); if (x < GW - 1) seed(x + 1, y); if (y > 0) seed(x, y - 1); if (y < GH - 1) seed(x, y + 1); }
    for (let k = 0; k < N; k++) if (type[k] === EMPTY && !open[k]) type[k] = COURT;
    // courtyards big enough get a tree in the middle
    const courts = [], seen = new Uint8Array(N);
    for (let k0 = 0; k0 < N; k0++) {
      if (type[k0] !== COURT || seen[k0]) continue;
      const q2 = [k0]; seen[k0] = 1; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let h = 0; h < q2.length; h++) {
        const k = q2[h], x = k % GW, y = (k - x) / GW;
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const a = x + dx, b = y + dy; if (a < 0 || b < 0 || a >= GW || b >= GH) return; const n = I(a, b); if (type[n] === COURT && !seen[n]) { seen[n] = 1; q2.push(n); } });
      }
      if (x1 - x0 >= 2 && y1 - y0 >= 2) courts.push({ x: Math.round((x0 + x1 + 1) / 2 * CS), y: Math.round((y0 + y1 + 1) / 2 * CS) });
    }
    const W = GW * CS, H = GH * CS;
    const P = { W, H, GW, GH, CS, ox, oy, type, owner, door, fk, occ, spaces, I, T, courts };
    const spine = spaces.find(s => s.kind === 'spine'), gal = spaces.find(s => s.kind === 'gallery');
    P.front = { x: spine.gx * CS + 14, y: (spine.gy + spine.h + 1) * CS, w: 20 };
    P.house = { x: (mg - 1) * CS, y: (mg - 1) * CS, w: (bb.w + 4) * CS, h: (bb.h + 6) * CS };
    P.signs = []; P.windows = []; P.sconces = []; P.badges = []; P.items = []; P.wallItems = []; P.lights = [];
    spaces.forEach((s, si) => {
      if (s.kind !== 'room') return;
      const fx = s.gx * CS, fy = s.gy * CS;
      P.signs.push({ id: s.id, rm: s.rm, x: fx + 5, y: fy + 6, w: signW(s.rm) });
      const runs = [];
      for (let x = s.gx; x < s.gx + s.w; x++) if ((T(x, s.gy - 2) === EMPTY || T(x, s.gy - 2) === EXT) && T(x, s.gy - 1) === WALL && type[I(x, s.gy)] === FACEC) runs.push(x);
      const minX = (fx + 5 + signW(s.rm) + 6) / CS;
      const ok = runs.filter(x => x >= minX && runs.includes(x + 1) && runs.includes(x + 2) && x + 3 <= s.gx + s.w);
      if (ok.length) { const x = ok[Math.floor(r() * ok.length)]; P.windows.push({ x: x * CS, y: fy + 4, owner: si, cx: x }); }
    });
    if (gal) {
      const gx = gal.gx * CS, total = nBadges * 14 + (nBadges - 1) * 5, x0 = Math.round(gx + (gal.w * CS - total) / 2);
      for (let i = 0; i < nBadges; i++) P.badges.push({ i, x: x0 + i * 19, y: gal.gy * CS + 8 });
      P.sconces.push({ x: gx + 3, y: gal.gy * CS + 10 }, { x: gx + gal.w * CS - 9, y: gal.gy * CS + 10 });
    }
    spaces.forEach(s => {
      if (s.kind !== 'branch') return;
      const x = s.gx * CS + Math.floor(s.w * CS / 2) - 3;
      if (type[I(Math.floor(x / CS), s.gy)] === FACEC) P.sconces.push({ x, y: s.gy * CS + 10 });
    });
    // contribution rug down the spine: one row per week, newest at the bottom
    if (cal && cal.levels) {
      const avail = (spine.h - FACE) * CS - 20, weeks = clamp(Math.floor((avail - 6) / 4), 8, 53);
      P.calRug = { x: spine.gx * CS + 7, y: (spine.gy + FACE) * CS + 10, w: 34, h: weeks * 4 + 6, weeks, days: cal.levels };
    }
    spaces.forEach((s, si) => { if (s.kind === 'room') furnish(P, s, si, r); });
    spaces.forEach(s => {
      const fx = s.gx * CS, fy = (s.gy + faceOf(s)) * CS, fw = s.w * CS, fh = (s.h - faceOf(s)) * CS;
      if (s.kind === 'room') P.lights.push({ x: fx + fw / 2, y: fy + fh * .45, r: Math.max(fw, fh) * .75 + 26, c: [1, .78, .5], i: .75 });
      else if (s.kind === 'spine') { for (let y = fy + 40; y < fy + fh - 10; y += 104) P.lights.push({ x: fx + fw / 2, y, r: 90, c: [1, .7, .42], i: .7 }); }
      else P.lights.push({ x: fx + fw / 2, y: fy + fh / 2, r: 80, c: [1, .72, .46], i: .6 });
    });
    P.sconces.forEach(sc => P.lights.push({ x: sc.x + 3, y: sc.y + 14, r: 56, c: [1, .66, .36], i: .8, sconce: true }));
    [...P.items, ...P.wallItems].forEach(it => it.item.lights.forEach(l => P.lights.push({ x: it.x + l.dx, y: it.y + l.dy, r: l.r, c: l.c, i: l.i, small: true })));
    P.walk = new Uint8Array(N);
    const freeF = (x, y) => T(x, y) === FLOOR && !occ[I(x, y)];
    for (let y = 0; y < GH; y++) for (let x = 1; x < GW - 1; x++) if (freeF(x, y) && freeF(x - 1, y) && freeF(x + 1, y)) P.walk[I(x, y)] = 1;
    P.cellsOf = id => { const out = []; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const k = I(x, y), o = owner[k]; if (P.walk[k] && !door[k] && o >= 0 && (id === '*' || spaces[o].id === id)) out.push([x, y]); } return out; };
    P.roomAt = (px, py) => { const x = Math.floor(px / CS), y = Math.floor(py / CS); if (x < 0 || y < 0 || x >= GW || y >= GH) return null; const o = owner[I(x, y)]; return o >= 0 ? spaces[o].id : null; };
    P.rectOf = id => { const list = spaces.filter(s => s.id === id); const b = bbox(list.map(s => ({ x: s.gx, y: s.gy, w: s.w, h: s.h }))); return { x: b.x0 * CS - 8, y: b.y0 * CS - 8, w: b.w * CS + 16, h: b.h * CS + 16 }; };
    // the way out of the front door: these columns, from the door down, stay clear of signposts and crowds
    P.walkway = { l: Math.floor(P.front.x / CS), r: Math.floor((P.front.x + P.front.w - 1) / CS), row: Math.floor(P.front.y / CS) };
    // where a w x h signpost goes: on open lawn beside the walkway, as close to the front door as it fits,
    // with a clear cell of lawn all round so it never touches a wall, a siding or the path
    P.spotFor = (w, h) => {
      const cw = Math.ceil(w / CS) + 2, ch = Math.ceil(h / CS) + 2, { l, r, row } = P.walkway;
      let best = null;
      for (let cy = row; cy + ch <= GH; cy++) for (let cx = 0; cx + cw <= GW; cx++) {
        if (cx <= r && cx + cw - 1 >= l) continue;
        let free = true;
        for (let j = 0; j < ch && free; j++) for (let i = 0; i < cw; i++) if (type[I(cx + i, cy + j)] !== EMPTY) { free = false; break; }
        if (!free) continue;
        const right = cx > r, gap = right ? cx - r - 1 : l - (cx + cw);
        // right beside the path matters most, then being close to the door
        const d = (cy - row) + gap * 3 + (right ? 0 : .5);
        if (!best || d < best.d) best = { d, cx, cy, right };
      }
      if (!best) return { x: P.front.x + P.front.w + 10, y: P.front.y + 22 };
      // hug the walkway side of the clear patch
      return { x: best.right ? (best.cx + 1) * CS : (best.cx + cw - 1) * CS - w, y: (best.cy + 1) * CS };
    };
    return P;
  }

  // ---------- milestone furniture, each in its own spot ----------
  function furnish(P, s, si, r) {
    const { type, door, occ, owner, I, CS: C } = P, rm = s.rm, theme = rm.theme, n = rm.tiers;
    const y0 = s.gy + FACE, y1 = s.gy + s.h, x0 = s.gx, x1 = s.gx + s.w, fw = s.w, fd = y1 - y0;
    const own = (x, y) => x >= x0 && x < x1 && y >= s.gy && y < y1 && type[I(x, y)] === FLOOR && owner[I(x, y)] === si && !door[I(x, y)];
    const all = [], entry = [];
    for (let y = s.gy; y < y1; y++) for (let x = x0; x < x1; x++) if (own(x, y)) {
      all.push([x, y]);
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => door[I(x + dx, y + dy)])) entry.push([x, y]);
    }
    const reserved = new Set();
    const guard = (x, y, rad) => { for (let j = -rad; j <= rad; j++) for (let i = -rad; i <= rad; i++) reserved.add(I(x + i, y + j)); };
    entry.forEach(([x, y]) => guard(x, y, 1));
    all.forEach(([x, y]) => { if (y < y0) guard(x, y, 1); });
    const free = (x, y) => y >= y0 && own(x, y) && !occ[I(x, y)] && !reserved.has(I(x, y));
    const ok = (a, b) => (own(a, b) || door[I(a, b)]) && !occ[I(a, b)];
    const walkable = (x, y) => ok(x, y) && ok(x - 1, y) && ok(x + 1, y);
    function connected() {
      const wk = all.filter(([x, y]) => walkable(x, y)), starts = entry.filter(([x, y]) => walkable(x, y));
      if (wk.length < 6 || !starts.length) return false;
      const seen = new Set(starts.map(([x, y]) => I(x, y))), q = starts.slice();
      while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy, k = I(a, b); if (!seen.has(k) && own(a, b) && walkable(a, b)) { seen.add(k); q.push([a, b]); } } }
      return wk.every(([x, y]) => seen.has(I(x, y)));
    }
    const coverX = new Set();
    const sw = Math.ceil((textWidth(rm.sign) + 6) / C) + 1;
    for (let x = x0; x < x0 + sw; x++) coverX.add(x);
    P.windows.filter(w => w.owner === si).forEach(w => { for (let x = w.cx - 1; x <= w.cx + 3; x++) coverX.add(x); });
    const tint = [rm.color, shadeOf(rm.color, .35), shadeOf(rm.color, -.3)];
    const tallX = new Set();
    rm.placed = [];
    // tall pieces reach up over the sign and windows, so only they have to dodge them
    const put = (kind, cands, w, d, tall, tier, arg) => {
      for (const [x, y] of cands) {
        let fine = true;
        for (let j = 0; j < d && fine; j++) for (let i = 0; i < w; i++) if (!free(x + i, y + j) || (tall && y === y0 && coverX.has(x + i))) { fine = false; break; }
        if (!fine) continue;
        for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) occ[I(x + i, y + j)] = 1;
        if (!connected()) { for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) occ[I(x + i, y + j)] = 0; continue; }
        const item = FP[kind](r, arg), px = x * C + Math.round((w * C - item.w) / 2), py = (y + d) * C - item.h - 1;
        P.items.push({ item, x: px, y: py, base: (y + d) * C, kind, tier, room: s.id, cell: { x, y, w, d } });
        if (tall) for (let i = 0; i < w; i++) tallX.add(x + i);
        if (tier >= 0) rm.placed.push(tier);
        return [x, y];
      }
      return null;
    };
    const anyFree = (w, d) => { const out = []; for (let y = y0; y + d <= y1; y++) for (let x = x0; x + w <= x1; x++) out.push([x, y]); return out.sort(() => r() - .5); };
    const back = (w, xs) => xs.map(x => [x, y0]).filter(([x]) => x >= x0 && x + w <= x1);
    const center = x0 + Math.floor((fw - 3) / 2);
    if (rm.special) { furnishSpecial(); return; }
    // bonus rooms (houses with few repos, and veterans' showcases) get a fixed set instead of commit milestones
    function furnishSpecial() {
      const st = rm.stats || {};
      const bigRug = tone => {
        const rw = clamp(Math.round(fw * .6), 3, fw - 2), rh = clamp(Math.round((fd - 1) * .6), 2, fd - 2);
        P.items.push({ item: FP.rug(r, rw * C, rh * C, tone), x: (x0 + Math.floor((fw - rw) / 2)) * C, y: (y0 + 1 + Math.floor((fd - 1 - rh) / 2)) * C, rug: true, tier: -1, room: s.id });
      };
      const corners = [[x0, y1 - 1], [x1 - 1, y1 - 1], [x0, y0], [x1 - 1, y0]];
      const SP = {
        fame() {
          bigRug(['#c8102e', '#ff5d6c', '#7a0a1c']);
          // one trophy for every year on GitHub, gold, silver and bronze in turn
          const n = clamp(st.years || 1, 1, 8), metal = ['gold', 'silver', 'bronze'];
          let k = 0;
          for (let x = x0 + 1; x + 2 <= x1 - 1 && k < n; x += 2) if (put('trophy', [[x, y0]], 2, 1, false, -1, metal[k % 3])) k++;
          for (; k < n; k++) if (!put('trophy', anyFree(2, 1), 2, 1, false, -1, metal[k % 3])) break;
          wallArt(P, s, r, coverX, tallX, 2, -1, 'plaque');
          put('plantSmall', [...corners, ...anyFree(1, 1)], 1, 1, false, -1);
        },
        observatory() {
          bigRug(['#1d1450', '#4a5cb0', '#0f0a30']);
          put('telescope', back(2, [center + 1, center, center + 2, x0 + 1, x1 - 3]), 2, 1, true, -1) || put('telescope', anyFree(2, 1), 2, 1, false, -1);
          wallArt(P, s, r, coverX, tallX, 2, -1, 'starChart');
          put('beanbag', [[x0 + 1, y1 - 2], [x1 - 3, y1 - 2], ...anyFree(2, 1)], 2, 1, false, -1);
          put('plantSmall', [...corners, ...anyFree(1, 1)], 1, 1, false, -1);
        },
        lab() {
          bigRug(['#11a39a', '#5fe0cb', '#0b6e68']);
          put('labBench', back(4, [center - 1, center, x0 + 1, x1 - 5, x0]), 4, 1, false, -1) || put('labBench', anyFree(4, 1), 4, 1, false, -1);
          put('jarShelf', back(2, [x1 - 2, x0, x1 - 3]), 2, 1, true, -1);
          wallArt(P, s, r, coverX, tallX, 1, -1, 'chalkboard');
          put('table', anyFree(2, 1), 2, 1, false, -1);
          put('plantSmall', [...corners, ...anyFree(1, 1)], 1, 1, false, -1);
          put('trash', [[x1 - 1, y1 - 1], [x0, y1 - 1], ...anyFree(1, 1)], 1, 1, false, -1);
        },
        lounge() {
          bigRug(['#ff4f8b', '#ff8fb5', '#c93a6a']);
          put('tvstand', back(3, [center, center - 1, center + 1, x0, x1 - 3]), 3, 1, false, -1);
          const cx = x0 + Math.floor((fw - 5) / 2);
          put('couchBack', [y1 - 2, y1 - 1].flatMap(y => [[cx, y], [cx - 1, y], [cx + 1, y]]), 5, 1, false, -1) || put('beanbag', anyFree(2, 1), 2, 1, false, -1);
          put('beanbag', [[x0 + 1, y1 - 2], [x1 - 3, y1 - 2], ...anyFree(2, 1)], 2, 1, false, -1);
          wallArt(P, s, r, coverX, tallX, 1, -1, 'fanBoard'); wallArt(P, s, r, coverX, tallX, 1, -1);
          put('plantTall', back(2, [x1 - 2, x0]), 2, 1, false, -1);
          put('lamp', [[x0, y1 - 1], [x1 - 1, y1 - 1], ...anyFree(1, 1)], 1, 1, false, -1);
        },
        arcade() {
          bigRug(['#7a4dff', '#a98aff', '#5a2fe0']);
          put('arcade', back(2, [x0 + 1, x0, x0 + 2]), 2, 1, true, -1); put('arcade', back(2, [x1 - 3, x1 - 2, x1 - 4]), 2, 1, true, -1);
          put('gameshelf', back(2, [center, center + 1, center - 1]), 2, 1, true, -1);
          put('beanbag', [[x0 + 1, y1 - 2], ...anyFree(2, 1)], 2, 1, false, -1); put('beanbag', [[x1 - 3, y1 - 2], ...anyFree(2, 1)], 2, 1, false, -1);
          wallArt(P, s, r, coverX, tallX, 2, -1, 'neon');
        },
        kitchen() {
          bigRug(['#ffc83a', '#ffe08a', '#d99a00']);
          put('fridge', back(2, [x0, x0 + 1, x1 - 2]), 2, 1, true, -1);
          put('table', [[center, y0 + 2], [center + 1, y0 + 2], ...anyFree(2, 1)], 2, 1, false, -1);
          put('chair', anyFree(1, 1), 1, 1, false, -1); put('chair', anyFree(1, 1), 1, 1, false, -1);
          wallArt(P, s, r, coverX, tallX, 1, -1, 'shelf'); wallArt(P, s, r, coverX, tallX, 1, -1, 'clock');
          put('plantSmall', [...corners, ...anyFree(1, 1)], 1, 1, false, -1); put('trash', [[x1 - 1, y1 - 1], ...anyFree(1, 1)], 1, 1, false, -1);
        },
        greenhouse() {
          bigRug(['#2fc27a', '#7ee8b0', '#1f8f5a']);
          const n = clamp(Math.round((st.days || 0) / 25) + 3, 3, 9);
          for (let k = 0; k < n; k++) {
            if (k % 3 === 2) put('plantSmall', anyFree(1, 1), 1, 1, false, -1);
            else put('plantTall', [...back(2, [x0 + k * 2, x1 - 2 - k * 2, x0 + 1 + k, x1 - 3 - k]), ...anyFree(2, 1)], 2, 1, false, -1);
          }
        },
      };
      (SP[rm.special] || SP.lab)();
    }
    let rug = null;
    if (n >= 1) {
      const rw = clamp(Math.round(fw * .55), 3, fw - 2), rh = clamp(Math.round((fd - 1) * .55), 2, fd - 2);
      rug = { x: x0 + Math.floor((fw - rw) / 2), y: y0 + 1 + Math.floor((fd - 1 - rh) / 2), w: rw, h: rh };
      P.items.push({ item: FP.rug(r, rw * C, rh * C, tint), x: rug.x * C, y: rug.y * C, rug: true, tier: 0, room: s.id });
      rm.placed.push(0);
    }
    if (n >= 2) { const d = put('desk', back(3, [x0 + 1, x0 + 2, x1 - 4, x1 - 5, x0 + 3, center]), 3, 1, false, 1); if (d) put('chairBack', [[d[0] + 1, y0 + 1]], 1, 1, false, -1); }
    if (n >= 3) { const k = theme === 'game' ? 'gameshelf' : 'bookshelf'; put(k, back(2, [x1 - 3, x1 - 4, x1 - 5, x0 + 5, x0 + 4, x1 - 2]), 2, 1, true, 2) || put('plantTall', back(2, [x1 - 2, x0, x1 - 3]), 2, 1, false, 2); }
    if (n >= 4) put('plantSmall', [[x0, y1 - 1], [x1 - 1, y1 - 1], [x0, y0], [x1 - 1, y0], ...anyFree(1, 1)], 1, 1, false, 3);
    if (n >= 5) put('lamp', [[x0, y0], [x1 - 1, y0], [x1 - 1, y1 - 1], [x0, y1 - 1], ...anyFree(1, 1)], 1, 1, false, 4);
    if (n >= 6) put(theme === 'data' || theme === 'sys' ? 'whiteboard' : 'tvstand', back(3, [center, center - 1, center + 1, center - 2, center + 2, x0, x1 - 3]), 3, 1, false, 5);
    if (n >= 7) { const cx = x0 + Math.floor((fw - 5) / 2), rows = [rug ? rug.y + rug.h - 1 : y1 - 2, y1 - 2, y1 - 1]; put('couchBack', rows.flatMap(y => [[cx, y], [cx - 1, y], [cx + 1, y]]), 5, 1, false, 6) || put('beanbag', [[x0 + 1, y1 - 2], [x1 - 3, y1 - 2], ...anyFree(2, 1)], 2, 1, false, 6); }
    if (n >= 8 && !wallArt(P, s, r, coverX, tallX, 2, 7)) put(['guitar', 'books', 'plantSmall'][Math.floor(r() * 3)], anyFree(1, 1), 1, 1, false, 7);
    if (n >= 9) { const k = theme === 'data' || theme === 'sys' ? 'rack' : 'arcade'; put(k, back(2, [x1 - 2, x0, x1 - 6, x0 + 4, center]), 2, 1, true, 8) || put(k, anyFree(2, 1), 2, 1, false, 8); }
    if (n >= 10) put('trophy', [[x1 - 2, y1 - 1], [x0, y1 - 1], [x1 - 2, y1 - 2], ...anyFree(2, 1)], 2, 1, false, 9);
  }
  function wallArt(P, s, r, coverX, tallX, count, tier, force) {
    const { type, I, CS: C } = P;
    let k = 0;
    for (let a = 0; a < 60 && k < count; a++) {
      const kind = force || ['poster', 'poster', 'frame', 'clock', 'neon'][Math.floor(r() * 5)], item = FP[kind](r), cw = Math.ceil(item.w / C), cx = s.gx + Math.floor(r() * (s.w - cw));
      let ok = true;
      for (let x = cx; x <= cx + cw; x++) if (coverX.has(x) || tallX.has(x) || type[I(x, s.gy)] !== FACEC) ok = false;
      if (!ok) continue;
      for (let x = cx; x <= cx + cw; x++) coverX.add(x);
      P.wallItems.push({ item, x: cx * C + 2, y: s.gy * C + 6 + Math.floor(r() * 3), tier, room: s.id });
      if (k === 0) s.rm.placed.push(tier);
      k++;
    }
    return k;
  }

  // ---------- albedo ----------
  const WOOD = [['#f09c45', '#ffc26c', '#dc8638', '#a8561f'], ['#e57a4c', '#f8a173', '#cc6339', '#8f3a1f'], ['#f5b768', '#ffd394', '#e0a052', '#b07432'], ['#d48b56', '#eaad7c', '#bb7444', '#7a4524'], ['#ee8f5c', '#ffb48a', '#d67748', '#9a4a26'], ['#f2a93b', '#ffcf6e', '#da9128', '#a3621a']];
  const HALLW = ['#d38a4c', '#eeae74', '#bc743a', '#84491e'];
  const TRIM = { crown: '#ffd38a', crownLo: '#d9893a', rail: '#ffcf7a', railLo: '#c97a35', wain: '#c9622a', wainHi: '#e8823f', wainLo: '#9a451c', base: '#5a2a12' };
  const WALLC = { top: '#5c2d16', hi: '#8f4c25', lo: '#3a1a0c', out: '#2a120a', grain: '#532810' };
  // GitHub's dark-mode greens on a near-black weave, so every commit day pops
  const CAL = ['#2a3140', '#0e4429', '#006d32', '#26a641', '#5cf27a'];
  const hash = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000 / 1000;

  function albedo(P, badges, paper) {
    const { W, H, GW, GH, CS: S, type, owner, door, fk, spaces, I, T } = P, PA = paper;
    const buf = new Uint8ClampedArray(W * H * 4);
    const put = (x, y, h) => { if (x < 0 || y < 0 || x >= W || y >= H || !h) return; const [r, g, b] = rgb(h), k = (y * W + x) * 4; buf[k] = r; buf[k + 1] = g; buf[k + 2] = b; buf[k + 3] = 255; };
    const rect = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) put(i, j, c); };
    const dark = (x, y, a) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const k = (y * W + x) * 4; if (!buf[k + 3]) return; buf[k] *= 1 - a; buf[k + 1] *= 1 - a; buf[k + 2] *= 1 - a * .8; };
    const roomIdx = {};
    spaces.filter(s => s.kind === 'room').forEach((s, i) => { roomIdx[s.id] = i; });
    const plank = (px, py, pal, vert) => {
      const a = vert ? px : py, b = vert ? py : px, ra = a % 8, k = Math.floor(a / 8);
      if (ra === 7 || (b + (k % 2) * 12 + (k % 3) * 5) % 24 === 0) return pal[3];
      if (ra === 0) return pal[1];
      if (hash(px, py) < .006) return pal[3];
      if ((ra === 3 && (b + k * 7) % 16 < 4) || (ra === 5 && (b + k * 11) % 20 < 3)) return pal[2];
      return pal[0];
    };
    for (let cy = 0; cy < GH; cy++) for (let cx = 0; cx < GW; cx++) {
      const k = I(cx, cy), t = type[k], sp = owner[k] >= 0 ? spaces[owner[k]] : null;
      if (t === EMPTY) continue;
      for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
        const px = cx * S + i, py = cy * S + j;
        let c;
        if (t === COURT) { const g = hash(px, py); c = g < .05 ? '#47a62c' : g > .965 ? '#86e05a' : '#5cc23c'; if (g > .9965) c = ['#ff6fa3', '#ffd23f', '#ffffff'][(px + py) % 3]; }
        else if (t === EXT) { const fy = fk[k] * S + j; c = fy === 0 ? '#fff1d6' : fy === 15 ? '#b89a6a' : fy % 4 === 3 ? '#d4bc92' : '#f4e3c3'; if (px % 32 === 0 && fy > 0 && fy < 15) c = '#e3cfa6'; }
        else if (t === FLOOR) {
          c = plank(px, py, sp && sp.kind === 'room' ? WOOD[roomIdx[sp.id] % WOOD.length] : HALLW, sp && (sp.kind === 'spine' || sp.kind === 'stub'));
          if (door[k] === 1 && ((j === 0 && T(cx, cy - 1) === WALL) || (j === S - 1 && T(cx, cy + 1) === WALL))) c = WALLC.lo;
          if (door[k] === 2 && ((i === 0 && T(cx - 1, cy) === WALL) || (i === S - 1 && T(cx + 1, cy) === WALL))) c = WALLC.lo;
        } else if (t === FACEC) {
          const fy = fk[k] * S + j;
          if (fy === 0) c = TRIM.crown; else if (fy === 1) c = TRIM.crownLo;
          else if (fy < 22) c = fy === 2 ? PA.lo : px % 8 === 0 ? PA.lo : px % 8 === 1 ? PA.hi : (px % 8 === 4 && (fy - 2) % 6 === 3) ? PA.dot : PA.paper;
          else if (fy === 22) c = TRIM.rail; else if (fy === 23) c = TRIM.railLo;
          else if (fy < 31) c = fy === 24 ? TRIM.wainHi : px % 6 === 0 ? TRIM.wainLo : TRIM.wain;
          else c = TRIM.base;
        } else {
          const up = T(cx, cy - 1), dn = T(cx, cy + 1), lf = T(cx - 1, cy), rt = T(cx + 1, cy), outish = v => v === EMPTY || v === EXT || v === COURT;
          c = j % 4 === 2 ? WALLC.grain : WALLC.top;
          if (j === 0 && up !== WALL) c = outish(up) ? WALLC.out : WALLC.hi;
          else if (i === 0 && lf !== WALL) c = outish(lf) ? WALLC.out : WALLC.hi;
          else if (j === S - 1 && dn !== WALL) c = outish(dn) ? WALLC.out : WALLC.lo;
          else if (i === S - 1 && rt !== WALL) c = outish(rt) ? WALLC.out : WALLC.lo;
        }
        put(px, py, c);
      }
    }
    (P.courts || []).forEach(({ x, y }) => {
      rect(x - 1, y, 3, 6, '#7a4a22'); rect(x - 1, y + 5, 3, 1, '#4a2a12');
      for (let j = -9; j <= 1; j++) for (let i = -6; i <= 6; i++) { const d = i * i + (j + 4) * (j + 4); if (d <= 30) put(x + i, y + j, d >= 25 ? '#1f6b2c' : i + j < -6 ? '#86e05a' : '#3aa84e'); }
      put(x - 2, y - 7, '#ff6fa3'); put(x + 3, y - 4, '#ff6fa3'); put(x - 4, y - 2, '#ffd23f');
    });
    const fd = P.front;
    rect(fd.x - 1, fd.y - 1, fd.w + 2, 17, WALLC.out); rect(fd.x, fd.y, fd.w, 15, '#b5652f'); rect(fd.x, fd.y, fd.w, 1, '#d9843f');
    for (let x = fd.x + 3; x < fd.x + fd.w; x += 5) rect(x, fd.y + 2, 1, 12, '#8a4520');
    put(fd.x + fd.w - 4, fd.y + 8, '#ffd23f'); put(fd.x + fd.w - 4, fd.y + 7, '#fff1a8');
    P.windows.forEach(({ x, y }) => {
      const w = 24, h = 18;
      rect(x, y, w, h, '#5a3210'); rect(x + 1, y + 1, w - 2, h - 2, '#fff0c4');
      for (let j = 0; j < h - 6; j++) rect(x + 3, y + 3 + j, w - 6, 1, j < 3 ? '#d4f6ff' : j < 8 ? '#7fd6ff' : '#4fb2ee');
      rect(x + 11, y + 3, 2, h - 6, '#fff0c4'); rect(x + 3, y + 8, w - 6, 1, '#fff0c4');
      rect(x - 2, y + h, w + 4, 2, '#5a3210'); rect(x - 1, y + h, w + 2, 1, '#ffd38a');
    });
    P.sconces.forEach(({ x, y }) => { rect(x + 1, y + 6, 4, 3, '#3a1a0c'); rect(x + 2, y + 9, 2, 2, '#3a1a0c'); rect(x, y, 6, 6, '#5a3210'); rect(x + 1, y + 1, 4, 4, '#ffe9a8'); put(x + 1, y + 1, '#ffffff'); });
    P.badges.forEach(b => {
      const d = badges[b.i], { x, y } = b;
      [[7, -3], [6, -2], [5, -1], [8, -2], [9, -1]].forEach(([i, j]) => put(x + i, y + j, WALLC.out));
      rect(x + 1, y, 12, 14, '#5a3210'); rect(x, y + 1, 14, 12, '#5a3210'); rect(x + 1, y + 1, 12, 12, '#f7c948');
      rect(x + 1, y + 1, 12, 1, '#fff1a8'); rect(x + 1, y + 1, 1, 12, '#fff1a8'); rect(x + 1, y + 12, 12, 1, '#c98a1a'); rect(x + 12, y + 1, 1, 12, '#c98a1a');
      rect(x + 3, y + 3, 8, 8, d.bg);
      d.map.forEach((row, j) => { for (let i = 0; i < 8; i++) if (d.pal[row[i]]) put(x + 3 + i, y + 3 + j, d.pal[row[i]]); });
    });
    if (P.calRug) {
      const g = P.calRug, tail = g.days.length % 7 === 0 ? g.days : g.days.slice(g.days.length % 7);
      rect(g.x, g.y, g.w, g.h, '#05080d'); rect(g.x + 1, g.y + 1, g.w - 2, g.h - 2, '#26a641'); rect(g.x + 2, g.y + 2, g.w - 4, g.h - 4, '#0d1117');
      for (let w = 0; w < g.weeks; w++) for (let d = 0; d < 7; d++) {
        const ch = tail[tail.length - g.weeks * 7 + w * 7 + d];
        if (ch === undefined) continue;
        rect(g.x + 3 + d * 4, g.y + 3 + w * 4, 3, 3, CAL[+ch] || CAL[0]);
      }
      for (let x = g.x + 2; x < g.x + g.w - 2; x += 3) { put(x, g.y - 1, '#26a641'); put(x, g.y + g.h, '#26a641'); }
    }
    const blit = ({ item, x, y }) => { for (let j = 0; j < item.h; j++) for (let i = 0; i < item.w; i++) put(x + i, y + j, item.px[j * item.w + i]); };
    P.items.filter(it => it.rug).forEach(blit);
    P.wallItems.forEach(blit);
    P.items.filter(it => !it.rug).sort((a, b) => a.base - b.base).forEach(it => {
      for (let i = 1; i < it.item.w - 1; i++) { dark(it.x + i, it.y + it.item.h, .3); dark(it.x + i, it.y + it.item.h + 1, .14); }
      blit(it);
    });
    P.signs.forEach(s => {
      const sc = canvas(s.w, 11), x = sc.getContext('2d'), col = s.rm.color;
      x.fillStyle = '#3a1a0c'; x.fillRect(1, 0, s.w - 2, 11); x.fillRect(0, 1, s.w, 9);
      x.fillStyle = col; x.fillRect(1, 1, s.w - 2, 9);
      x.fillStyle = shadeOf(col, .3); x.fillRect(1, 1, s.w - 2, 1);
      drawText(x, s.rm.sign, 3, 3, s.rm.fg);
      s.canvas = sc;
    });
    const c = canvas(W, H);
    c.getContext('2d').putImageData(new ImageData(buf, W, H), 0, 0);
    return c;
  }

  // ---------- light map ----------
  const MODES = {
    day: { amb: [.6, .58, .66], ext: [1, .98, .95], sun: [1, .95, .78], sStr: 1.05, glass: 1.2, lamp: .5, sconce: .65, small: .32, len: 66, slope: .55 },
    sunset: { amb: [.64, .48, .52], ext: [1, .74, .62], sun: [1, .6, .36], sStr: 1.15, glass: 1.1, lamp: .62, sconce: .8, small: .4, len: 92, slope: .95 },
    night: { amb: [.3, .31, .52], ext: [.44, .48, .72], sun: [.5, .64, 1], sStr: .5, glass: .5, lamp: .85, sconce: 1, small: .6, len: 66, slope: .55 },
  };
  function bake(P, mode) {
    const M = MODES[mode] || MODES.day, { W, H, GW, GH, CS: S, type, I } = P;
    const L = new Float32Array(W * H * 3), beam = new Float32Array(W * H);
    const blocks = (x, y) => x < 0 || y < 0 || x >= GW || y >= GH || type[I(x, y)] === WALL || type[I(x, y)] === EMPTY || type[I(x, y)] === EXT || type[I(x, y)] === COURT;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = type[I(Math.floor(x / S), Math.floor(y / S))];
      if (t === EMPTY) continue;
      const a = t === EXT || t === COURT ? M.ext : M.amb, k = (y * W + x) * 3;
      L[k] = a[0]; L[k + 1] = a[1]; L[k + 2] = a[2];
    }
    P.lights.forEach(l => {
      const lx = Math.floor(l.x / S), ly = Math.floor(l.y / S), R = Math.ceil(l.r / S) + 1, D = 2 * R + 1, vis = new Float32Array(D * D);
      for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
        const tx = lx + i, ty = ly + j, n = Math.max(Math.abs(i), Math.abs(j));
        let v = (tx < 0 || ty < 0 || tx >= GW || ty >= GH || type[I(tx, ty)] === EMPTY || type[I(tx, ty)] === EXT || type[I(tx, ty)] === COURT) ? 0 : 1;
        for (let s2 = 1; s2 < n && v; s2++) if (blocks(Math.round(lx + i * s2 / n), Math.round(ly + j * s2 / n))) v = 0;
        vis[(j + R) * D + (i + R)] = v;
      }
      const V = (i, j) => (i < -R || j < -R || i > R || j > R) ? 0 : vis[(j + R) * D + (i + R)];
      const inten = l.i * (l.small ? M.small : l.sconce ? M.sconce : M.lamp);
      const x0 = Math.max(0, Math.floor(l.x - l.r)), x1 = Math.min(W - 1, Math.ceil(l.x + l.r)), y0 = Math.max(0, Math.floor(l.y - l.r)), y1 = Math.min(H - 1, Math.ceil(l.y + l.r));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x - l.x, y - l.y);
        if (d >= l.r) continue;
        const fx = x / S - .5 - lx, fy = y / S - .5 - ly, i0 = Math.floor(fx), j0 = Math.floor(fy), ax = fx - i0, ay = fy - j0;
        const v = V(i0, j0) * (1 - ax) * (1 - ay) + V(i0 + 1, j0) * ax * (1 - ay) + V(i0, j0 + 1) * (1 - ax) * ay + V(i0 + 1, j0 + 1) * ax * ay;
        if (v <= 0) continue;
        const a = (1 - d / l.r) ** 2 * inten * v, k = (y * W + x) * 3;
        L[k] += l.c[0] * a; L[k + 1] += l.c[1] * a; L[k + 2] += l.c[2] * a;
      }
    });
    P.windows.forEach(wd => {
      for (let y = wd.y + 3; y < wd.y + 15; y++) for (let x = wd.x + 3; x < wd.x + 21; x++) { const k = (y * W + x) * 3; L[k] += M.sun[0] * M.glass; L[k + 1] += M.sun[1] * M.glass; L[k + 2] += M.sun[2] * M.glass; }
      const y0 = wd.y + 28;
      for (let y = y0; y < Math.min(H, y0 + M.len); y++) {
        const t = (y - y0) / M.len, sh = (y - y0) * M.slope, xa = wd.x + 2 + sh, xb = wd.x + 22 + sh + (y - y0) * .2;
        for (let x = Math.floor(xa); x <= Math.ceil(xb) && x < W; x++) {
          const cx = Math.floor(x / S), cy = Math.floor(y / S);
          if (cx < 0 || cx >= GW || type[I(cx, cy)] !== FLOOR || P.owner[I(cx, cy)] !== wd.owner) continue;
          const a = (1 - t) ** 1.4 * Math.max(0, Math.min(1, (x - xa) / 3, (xb - x) / 3)) * M.sStr, k = (y * W + x) * 3;
          L[k] += M.sun[0] * a; L[k + 1] += M.sun[1] * a; L[k + 2] += M.sun[2] * a;
          beam[y * W + x] = Math.max(beam[y * W + x], a);
        }
      }
    });
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const cx = Math.floor(x / S), cy = Math.floor(y / S);
      if (type[I(cx, cy)] !== FLOOR) continue;
      let f = 1;
      for (let d = 1; d <= 6; d++) { const yy = y - d; if (yy < 0) break; const tt = type[I(cx, Math.floor(yy / S))]; if (tt === FACEC || tt === WALL) { f = Math.min(f, .58 + d * .07); break; } }
      for (let d = 1; d <= 4; d++) { const xx = x - d; if (xx < 0) break; if (type[I(Math.floor(xx / S), cy)] === WALL) { f = Math.min(f, .7 + d * .075); break; } }
      if (f < 1) { const k = (y * W + x) * 3; L[k] *= f; L[k + 1] *= f; L[k + 2] *= f; }
    }
    const G = new Float32Array(W * H * 3), tmp = new Float32Array(W * H * 3), Rb = 6;
    for (let p = 0; p < W * H; p++) {
      const t = type[I(Math.floor((p % W) / S), Math.floor(p / W / S))], th = (t === EMPTY || t === EXT || t === COURT) ? 9 : 1.02;
      for (let c = 0; c < 3; c++) G[p * 3 + c] = Math.max(0, L[p * 3 + c] - th);
    }
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < H; y++) for (let c = 0; c < 3; c++) {
        let acc = 0;
        for (let x = -Rb; x <= Rb; x++) acc += G[(y * W + clamp(x, 0, W - 1)) * 3 + c];
        for (let x = 0; x < W; x++) { tmp[(y * W + x) * 3 + c] = acc / (2 * Rb + 1); acc += G[(y * W + clamp(x + Rb + 1, 0, W - 1)) * 3 + c] - G[(y * W + clamp(x - Rb, 0, W - 1)) * 3 + c]; }
      }
      for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) {
        let acc = 0;
        for (let y = -Rb; y <= Rb; y++) acc += tmp[(clamp(y, 0, H - 1) * W + x) * 3 + c];
        for (let y = 0; y < H; y++) { G[(y * W + x) * 3 + c] = acc / (2 * Rb + 1); acc += tmp[(clamp(y + Rb + 1, 0, H - 1) * W + x) * 3 + c] - tmp[(clamp(y - Rb, 0, H - 1) * W + x) * 3 + c]; }
      }
    }
    for (let i = 0; i < W * H * 3; i++) L[i] = L[i] > 1.1 ? 1.1 + (L[i] - 1.1) * .22 : L[i];
    const light = new Uint8ClampedArray(W * H * 4), glow = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      light[i * 4] = L[i * 3] / 2 * 255; light[i * 4 + 1] = L[i * 3 + 1] / 2 * 255; light[i * 4 + 2] = L[i * 3 + 2] / 2 * 255; light[i * 4 + 3] = Math.min(1, beam[i]) * 255;
      glow[i * 4] = G[i * 3] * 255; glow[i * 4 + 1] = G[i * 3 + 1] * 255; glow[i * 4 + 2] = G[i * 3 + 2] * 255; glow[i * 4 + 3] = 255;
    }
    return { light, glow };
  }

  window.LAYOUT = { plan, albedo, bake, CS, shadeOf };
})();
