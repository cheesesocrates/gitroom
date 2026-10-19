/* GitRoom furniture: procedural pixel items with random saturated palettes. Glowing items carry their own light. */
(() => {
  const OUT = '#2a120a';
  const WOODS = [['#b5652f', '#d9843f', '#8a4520'], ['#9c5a32', '#c27a48', '#6e3a1c'], ['#c98a55', '#e8ad78', '#9a6236'], ['#a0522d', '#c8723f', '#73391d']];
  const FAB = [['#ff4f8b', '#ff8fb5', '#c93a6a'], ['#3ab0ff', '#8fd3ff', '#1f7ac4'], ['#ffc83a', '#ffe08a', '#d99a00'], ['#7a4dff', '#a98aff', '#5a2fe0'], ['#2fc27a', '#7ee8b0', '#1f8f5a'], ['#ff8a3d', '#ffb27a', '#d1631f'], ['#1fb5a1', '#6fe0cf', '#128477']];
  const LEAF = ['#3aa84e', '#6fd36a', '#237a35'];
  const POTS = [['#e2725b', '#ff9f7a', '#b3523f'], ['#f2f2f7', '#ffffff', '#c9c4dc'], ['#3ab0ff', '#8fd3ff', '#1f7ac4'], ['#ffc83a', '#ffe08a', '#d99a00']];
  const SCREEN = ['#3dffd0', '#5ad8ff', '#ff7ae0', '#b6ff6a'];

  function Item(w, h) {
    const px = new Array(w * h).fill(null);
    const it = { w, h, px, lights: [] };
    it.put = (x, y, c) => { if (x >= 0 && y >= 0 && x < w && y < h) px[y * w + x] = c; };
    it.rect = (x, y, ww, hh, c) => { for (let j = y; j < y + hh; j++) for (let i = x; i < x + ww; i++) it.put(i, j, c); };
    it.oval = (cx, cy, rx, ry, c) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1) it.put(x, y, c); };
    it.outline = (c = OUT) => {
      const src = px.slice(), on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[y * w + x];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!src[y * w + x] && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) px[y * w + x] = c;
      return it;
    };
    it.light = (dx, dy, r, c, i) => { it.lights.push({ dx, dy, r, c, i }); return it; };
    return it;
  }
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const METALS = { gold: ['#ffc83a', '#fff1a8', '#d99a00'], silver: ['#d9dce8', '#ffffff', '#9a9fb8'], bronze: ['#e0905a', '#ffc08a', '#a85a2a'] };
  // 1px line between two points, for tripods and constellations
  const line = it => (ax, ay, bx, by, c) => { const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) || 1; for (let t = 0; t <= n; t++) it.put(Math.round(ax + (bx - ax) * t / n), Math.round(ay + (by - ay) * t / n), c); };

  const P = {
    bookshelf(r) {
      const it = Item(16, 27), w = pick(r, WOODS);
      it.rect(1, 1, 14, 25, w[2]); it.rect(2, 2, 12, 23, '#4a2410'); it.rect(1, 1, 14, 1, w[1]);
      [[2, 9], [10, 17], [18, 25]].forEach(([y0, y1]) => {
        it.rect(2, y1 - 1, 12, 1, w[0]);
        for (let x = 3; x < 13;) { const bw = r() < .7 ? 1 : 2, bh = 3 + Math.floor(r() * (y1 - y0 - 4)), c = pick(r, FAB); if (r() < .12) { x++; continue; } it.rect(x, y1 - 1 - bh, Math.min(bw, 13 - x), bh, c[r() < .5 ? 0 : 2]); x += bw; }
      });
      return it.outline();
    },
    wardrobe(r) {
      const it = Item(16, 28), w = pick(r, WOODS);
      it.rect(1, 1, 14, 26, w[0]); it.rect(1, 1, 14, 2, w[1]); it.rect(7, 3, 1, 23, w[2]); it.rect(1, 25, 14, 2, w[2]);
      it.put(5, 14, '#ffd23f'); it.put(10, 14, '#ffd23f');
      return it.outline();
    },
    fridge(r) {
      const it = Item(14, 27), f = pick(r, [['#f4f7ff', '#ffffff', '#c7cde0'], ['#ff8fb5', '#ffc2d6', '#d96a92'], ['#8fe3d6', '#c2f5ee', '#5fbfb2']]);
      it.rect(1, 1, 12, 25, f[0]); it.rect(1, 1, 12, 1, f[1]); it.rect(1, 10, 12, 1, f[2]); it.rect(1, 25, 12, 1, f[2]);
      it.rect(3, 3, 1, 5, '#8a97a8'); it.rect(3, 12, 1, 7, '#8a97a8');
      for (let k = 0; k < 3; k++) it.put(6 + Math.floor(r() * 5), 4 + Math.floor(r() * 18), pick(r, FAB)[0]);
      return it.outline();
    },
    arcade(r) {
      const it = Item(14, 25), f = pick(r, FAB), s = pick(r, SCREEN);
      it.rect(1, 1, 12, 23, f[0]); it.rect(1, 1, 12, 4, f[2]); it.rect(2, 2, 10, 2, '#ffd23f');
      it.rect(3, 6, 8, 7, '#10142a'); it.rect(4, 7, 6, 5, s); it.put(4, 7, '#ffffff');
      it.rect(2, 15, 10, 3, '#24163b'); it.put(4, 16, '#ff3b5c'); it.put(8, 16, '#3dff8a'); it.put(10, 16, '#ffd23f');
      return it.outline().light(7, 9, 34, [.5, 1, .9], .55);
    },
    rack(r) {
      const it = Item(12, 27);
      it.rect(1, 1, 10, 25, '#1c2233'); it.rect(2, 2, 8, 23, '#262e44');
      for (let y = 4; y < 24; y += 3) { it.rect(2, y, 8, 1, '#141a28'); it.put(3, y - 1, pick(r, ['#3dff8a', '#3dff8a', '#5ad8ff', '#ffc83a'])); it.put(5, y - 1, pick(r, ['#3dff8a', '#5ad8ff'])); }
      return it.outline().light(6, 13, 28, [.45, 1, .7], .45);
    },
    tvstand(r) {
      const it = Item(24, 22), w = pick(r, WOODS), s = pick(r, SCREEN);
      it.rect(1, 14, 22, 7, w[0]); it.rect(1, 14, 22, 1, w[1]); it.rect(4, 17, 6, 2, w[2]); it.rect(14, 17, 6, 2, w[2]);
      it.rect(3, 1, 18, 12, '#141022'); it.rect(4, 2, 16, 10, '#1d3f7a');
      for (let y = 3; y < 11; y += 2) it.rect(5 + Math.floor(r() * 3), y, 4 + Math.floor(r() * 8), 1, pick(r, [s, '#ff7ab6', '#ffd23f', '#9be15d']));
      it.rect(11, 13, 2, 1, '#141022');
      return it.outline().light(12, 8, 40, [.55, .75, 1], .55);
    },
    desk(r) {
      const it = Item(24, 21), w = pick(r, WOODS), s = pick(r, SCREEN);
      it.rect(1, 9, 22, 8, w[0]); it.rect(1, 9, 22, 1, w[1]); it.rect(1, 16, 22, 1, w[2]); it.rect(2, 17, 2, 3, w[2]); it.rect(20, 17, 2, 3, w[2]);
      it.rect(6, 1, 12, 8, '#141022'); it.rect(7, 2, 10, 6, s); it.put(7, 2, '#ffffff'); it.rect(11, 9, 2, 1, '#141022');
      it.rect(5, 12, 9, 2, '#e8e3f2'); it.put(17, 12, '#ffffff'); it.put(17, 13, pick(r, FAB)[0]);
      return it.outline().light(12, 6, 30, [.6, .9, 1], .5);
    },
    plantTall(r) {
      const it = Item(12, 21), p = pick(r, POTS);
      it.rect(3, 14, 6, 6, p[0]); it.rect(3, 14, 6, 1, p[1]); it.rect(3, 19, 6, 1, p[2]);
      it.oval(4, 8, 3.2, 4.5, LEAF[2]); it.oval(8, 7, 3.2, 5, LEAF[0]); it.oval(6, 4, 3, 3.5, LEAF[0]); it.put(5, 3, LEAF[1]); it.put(8, 5, LEAF[1]); it.put(3, 8, LEAF[1]);
      return it.outline();
    },
    plantSmall(r) {
      const it = Item(10, 14), p = pick(r, POTS);
      it.rect(2, 8, 6, 5, p[0]); it.rect(2, 8, 6, 1, p[1]);
      it.oval(3.5, 5, 2.5, 3, LEAF[0]); it.oval(6.5, 5, 2.5, 3, LEAF[2]); it.put(4, 3, LEAF[1]);
      if (r() < .4) it.put(5, 2, pick(r, FAB)[0]);
      return it.outline();
    },
    lamp(r) {
      const it = Item(9, 22), f = pick(r, FAB);
      it.rect(2, 19, 5, 2, '#3a2d5c'); it.rect(4, 7, 1, 12, '#3a2d5c');
      it.rect(1, 2, 7, 5, f[0]); it.rect(1, 2, 7, 1, f[1]); it.rect(2, 7, 5, 1, '#ffe9a8');
      return it.outline().light(4, 9, 52, [1, .76, .45], .75);
    },
    couch(r) {
      const it = Item(30, 17), f = pick(r, FAB);
      it.rect(1, 1, 28, 7, f[2]); it.rect(1, 1, 28, 1, f[1]);
      it.rect(1, 6, 28, 9, f[0]); it.rect(1, 6, 4, 9, f[2]); it.rect(25, 6, 4, 9, f[2]);
      it.rect(5, 7, 9, 6, f[1]); it.rect(15, 7, 10, 6, f[1]); it.rect(14, 7, 1, 6, f[2]);
      it.rect(1, 15, 28, 1, f[2]);
      if (r() < .6) { const q = pick(r, FAB); it.rect(6, 4, 5, 4, q[0]); it.put(6, 4, q[1]); }
      return it.outline();
    },
    table(r) {
      const it = Item(16, 14), w = pick(r, [['#ffffff', '#ffffff', '#d9d4e8'], ...WOODS]);
      it.rect(7, 8, 2, 5, '#3a2d5c'); it.oval(8, 5.5, 7, 4.5, w[0]); it.oval(7, 4.5, 4.5, 2.2, w[1]);
      const m = pick(r, FAB); it.rect(9, 3, 2, 3, m[0]); it.put(9, 3, m[1]);
      return it.outline();
    },
    chair(r) {
      const it = Item(10, 13), f = pick(r, FAB);
      it.rect(2, 1, 6, 5, f[2]); it.rect(2, 1, 6, 1, f[1]); it.rect(1, 6, 8, 4, f[0]); it.rect(2, 10, 1, 2, '#3a2d5c'); it.rect(7, 10, 1, 2, '#3a2d5c');
      return it.outline();
    },
    beanbag(r) {
      const it = Item(14, 11), f = pick(r, FAB);
      it.oval(7, 6, 6, 4.5, f[0]); it.oval(5.5, 4.5, 3, 1.8, f[1]); it.oval(9, 8, 3, 1.5, f[2]);
      return it.outline();
    },
    crate(r) {
      const it = Item(12, 12), w = pick(r, WOODS);
      it.rect(1, 1, 10, 10, w[0]); it.rect(1, 1, 10, 1, w[1]); it.rect(1, 10, 10, 1, w[2]);
      for (let k = 0; k < 8; k++) { it.put(2 + k, 2 + k, w[2]); it.put(9 - k, 2 + k, w[2]); }
      return it.outline();
    },
    crates(r) {
      const it = Item(12, 19), w = pick(r, WOODS), v = pick(r, WOODS);
      it.rect(1, 8, 10, 10, w[0]); it.rect(1, 8, 10, 1, w[1]); it.rect(1, 12, 10, 1, w[2]);
      it.rect(2, 1, 8, 7, v[0]); it.rect(2, 1, 8, 1, v[1]); it.rect(2, 4, 8, 1, v[2]);
      return it.outline();
    },
    boxes(r) {
      const it = Item(16, 15);
      const c = ['#d9a066', '#f0bd84', '#a8733f'];
      it.rect(1, 6, 8, 8, c[0]); it.rect(1, 6, 8, 1, c[1]); it.rect(4, 6, 2, 8, c[2]);
      it.rect(8, 8, 7, 6, c[0]); it.rect(8, 8, 7, 1, c[1]); it.rect(10, 8, 1, 6, c[2]);
      it.rect(3, 1, 7, 5, c[0]); it.rect(3, 1, 7, 1, c[1]); it.rect(6, 1, 1, 5, '#ff4f8b');
      return it.outline();
    },
    barrel(r) {
      const it = Item(11, 13), w = pick(r, WOODS);
      it.oval(5.5, 6.5, 4.5, 5.5, w[0]); it.rect(1, 3, 9, 1, '#5a5a6e'); it.rect(1, 9, 9, 1, '#5a5a6e'); it.oval(5.5, 2.2, 3.5, 1.2, w[1]);
      return it.outline();
    },
    guitar(r) {
      const it = Item(8, 17), f = pick(r, FAB);
      it.rect(3, 1, 2, 7, '#5a2e14'); it.rect(2, 1, 4, 1, '#3a1a0c');
      it.oval(4, 11, 3, 4, f[0]); it.oval(4, 8.5, 2, 2, f[0]); it.put(4, 11, '#24163b'); it.put(3, 10, f[1]);
      return it.outline();
    },
    books(r) {
      const it = Item(10, 8);
      for (let k = 0; k < 3; k++) { const c = pick(r, FAB); it.rect(1 + (k % 2), 5 - k * 2, 7, 2, c[0]); it.put(1 + (k % 2), 5 - k * 2, c[1]); }
      return it.outline();
    },
    trash(r) {
      const it = Item(8, 10), f = pick(r, [['#8a97a8', '#b8c2cf', '#5f6b7a'], ...FAB.slice(0, 3)]);
      it.rect(1, 2, 6, 7, f[0]); it.rect(1, 1, 6, 1, f[1]); it.rect(3, 4, 1, 4, f[2]); it.put(4, 0, '#ffffff');
      return it.outline();
    },
    // wall items (hang on the wallpaper)
    poster(r) {
      const it = Item(10, 13), a = pick(r, FAB), b = pick(r, FAB);
      it.rect(1, 1, 8, 11, '#fff4dc'); it.rect(2, 2, 6, 7, a[0]); it.oval(5, 5.5, 2, 2, b[1]); it.rect(2, 10, 6, 1, b[0]);
      return it.outline();
    },
    frame(r) {
      const it = Item(12, 10), a = pick(r, FAB);
      it.rect(1, 1, 10, 8, '#c98a1a'); it.rect(2, 2, 8, 6, '#8fd3ff'); it.rect(2, 5, 8, 3, '#3aa84e'); it.oval(8, 3.5, 1.2, 1.2, '#ffe08a'); it.put(4, 4, a[0]);
      return it.outline();
    },
    clock(r) {
      const it = Item(9, 9);
      it.oval(4.5, 4.5, 3.6, 3.6, '#fff4dc'); it.put(4, 2, '#24163b'); it.put(4, 3, '#24163b'); it.put(5, 4, '#24163b'); it.put(4, 4, '#ff4f8b');
      return it.outline();
    },
    neon(r) {
      const it = Item(11, 9), c = pick(r, ['#ff4fd8', '#4fe6ff', '#b6ff6a', '#ffd23f']);
      [[2, 1], [3, 1], [7, 1], [8, 1], [1, 2], [4, 2], [6, 2], [9, 2], [1, 3], [5, 3], [9, 3], [2, 4], [8, 4], [3, 5], [7, 5], [4, 6], [6, 6], [5, 7]].forEach(([x, y]) => it.put(x, y, c));
      return it.light(5, 5, 26, c === '#ff4fd8' ? [1, .35, .85] : c === '#4fe6ff' ? [.35, .9, 1] : c === '#b6ff6a' ? [.65, 1, .4] : [1, .85, .3], .55);
    },
    shelf(r) {
      const it = Item(18, 9), w = pick(r, WOODS);
      it.rect(1, 6, 16, 2, w[0]); it.rect(1, 6, 16, 1, w[1]);
      it.oval(4, 4, 2, 2, LEAF[0]); it.rect(3, 4, 3, 2, pick(r, POTS)[0]);
      for (let x = 8; x < 15; x += 2) it.rect(x, 2 + Math.floor(r() * 2), 1, 4 - Math.floor(r() * 2), pick(r, FAB)[0]);
      return it.outline();
    },
    rug(r, w, h, tint) {
      const it = Item(w, h), a = tint || pick(r, FAB), b = pick(r, FAB.filter(f => f !== a)), style = Math.floor(r() * 3);
      it.rect(0, 0, w, h, a[2]); it.rect(1, 1, w - 2, h - 2, a[0]); it.rect(3, 3, w - 6, h - 6, a[2]); it.rect(4, 4, w - 8, h - 8, a[0]);
      for (let y = 5; y < h - 5; y++) for (let x = 5; x < w - 5; x++) {
        if (style === 0 && (x + y) % 6 === 0) it.put(x, y, b[0]);
        else if (style === 1 && y % 4 === 0) it.put(x, y, b[0]);
        else if (style === 2 && (Math.abs(x - w / 2) + Math.abs(y - h / 2)) % 7 < 1.2) it.put(x, y, b[1]);
      }
      for (let x = 2; x < w - 2; x += 3) { it.put(x, 0, a[1]); it.put(x, h - 1, a[1]); }
      return it;
    },
    // seen from behind, so it faces into the room
    chairBack(r) {
      const it = Item(11, 13), f = pick(r, FAB);
      it.rect(2, 1, 7, 7, f[0]); it.rect(2, 1, 7, 1, f[1]); it.rect(3, 3, 5, 3, f[2]);
      it.rect(1, 8, 9, 2, f[2]); it.rect(2, 10, 1, 2, '#3a2d5c'); it.rect(8, 10, 1, 2, '#3a2d5c');
      return it.outline();
    },
    couchBack(r) {
      const it = Item(34, 15), f = pick(r, FAB);
      it.rect(1, 1, 32, 4, f[1]); it.rect(1, 4, 32, 9, f[0]); it.rect(1, 4, 32, 1, f[1]); it.rect(1, 12, 32, 1, f[2]);
      it.rect(1, 1, 4, 12, f[2]); it.rect(29, 1, 4, 12, f[2]); it.rect(1, 1, 4, 1, f[0]); it.rect(29, 1, 4, 1, f[0]);
      it.rect(16, 5, 1, 7, f[2]);
      if (r() < .7) { const q = pick(r, FAB); it.rect(7, 1, 5, 3, q[0]); it.put(7, 1, q[1]); }
      return it.outline();
    },
    whiteboard(r) {
      const it = Item(24, 22);
      it.rect(3, 16, 1, 5, '#5a5a6e'); it.rect(20, 16, 1, 5, '#5a5a6e');
      it.rect(1, 1, 22, 15, '#c9cfdc'); it.rect(2, 2, 20, 13, '#ffffff');
      const pts = [[4, 12], [7, 10], [10, 11], [13, 7], [16, 8], [19, 4]];
      for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1]; for (let t = 0; t <= 1; t += .1) it.put(Math.round(ax + (bx - ax) * t), Math.round(ay + (by - ay) * t), '#ff4f8b'); }
      it.rect(4, 13, 16, 1, '#8a97a8'); it.rect(4, 4, 1, 9, '#8a97a8'); it.rect(14, 15, 5, 1, '#3ab0ff');
      return it.outline();
    },
    trophy(r, metal) {
      const it = Item(14, 20), [m, hi, lo] = METALS[metal] || METALS.gold;
      it.rect(2, 13, 10, 6, '#e8e3f2'); it.rect(2, 13, 10, 1, '#ffffff'); it.rect(2, 18, 10, 1, '#b8b0cc');
      it.rect(5, 10, 4, 3, lo); it.rect(3, 2, 8, 6, m); it.rect(4, 8, 6, 2, m);
      it.rect(1, 3, 2, 3, m); it.rect(11, 3, 2, 3, m); it.rect(4, 2, 2, 4, hi); it.put(7, 4, '#ffffff');
      it.rect(4, 15, 6, 2, m);
      it.outline();
      return metal && metal !== 'gold' ? it : it.light(7, 6, 30, [1, .85, .35], .6);
    },
    // ---------- special rooms ----------
    telescope(r) {
      const it = Item(16, 26), L = line(it);
      L(8, 16, 3, 25, '#3a2d5c'); L(8, 16, 13, 25, '#3a2d5c'); L(8, 17, 8, 25, '#5a4a7a');
      it.rect(7, 13, 3, 4, '#6e6e80'); it.put(7, 13, '#a6a6b6');
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]) L(2 + dx, 3 + dy, 11 + dx, 11 + dy, '#4f5fd6');
      L(2, 3, 11, 11, '#8fa0ff'); L(3, 5, 12, 13, '#2f3a99');
      it.rect(5, 5, 2, 3, '#ffc83a'); it.rect(9, 9, 2, 3, '#ffc83a'); it.put(5, 5, '#fff1a8');
      it.rect(1, 1, 3, 4, '#c98a1a'); it.rect(1, 2, 2, 2, '#9fe3ff'); it.put(1, 2, '#ffffff');
      it.rect(12, 12, 2, 2, '#2a2d40');
      return it.outline();
    },
    labBench(r) {
      const it = Item(32, 20), L = ['#3dffd0', '#ff7ae0', '#b6ff6a', '#ffd23f', '#5ad8ff'], glass = '#d6f1ff';
      it.rect(1, 11, 30, 2, '#f4f7ff'); it.rect(1, 11, 30, 1, '#ffffff'); it.rect(1, 13, 30, 5, '#9aa5b8'); it.rect(1, 17, 30, 1, '#6e7a8f');
      it.rect(3, 14, 8, 3, '#b8c2d4'); it.rect(21, 14, 8, 3, '#b8c2d4'); it.put(7, 15, '#3a2d5c'); it.put(25, 15, '#3a2d5c');
      it.rect(2, 18, 2, 1, '#5f6b7a'); it.rect(28, 18, 2, 1, '#5f6b7a');
      const a = pick(r, L), b = pick(r, L.filter(c => c !== a)), c = pick(r, L);
      // round flask, beaker and a rack of test tubes
      it.rect(5, 2, 2, 3, glass); it.put(5, 2, '#ffffff'); it.oval(6, 8, 3.4, 3.2, a); it.rect(4, 5, 4, 1, glass); it.put(4, 7, '#ffffff');
      it.rect(12, 4, 6, 7, glass); it.rect(12, 7, 6, 4, b); it.rect(12, 4, 6, 1, '#ffffff'); it.put(14, 6, '#ffffff'); it.put(16, 5, '#ffffff');
      it.rect(21, 8, 9, 1, '#8a5a2a'); it.rect(21, 10, 9, 1, '#8a5a2a');
      for (let x = 22; x < 30; x += 2) { const t = pick(r, L); it.rect(x, 3, 1, 7, glass); it.rect(x, 7 + Math.floor(r() * 2), 1, 3, t); }
      it.put(9, 1, c); it.put(15, 2, b);
      return it.outline().light(10, 7, 34, [.55, 1, .85], .5);
    },
    jarShelf(r) {
      const it = Item(16, 26), w = pick(r, WOODS);
      it.rect(1, 1, 14, 24, w[2]); it.rect(2, 2, 12, 22, '#3a2410'); it.rect(1, 1, 14, 1, w[1]);
      [[2, 9], [10, 17], [18, 24]].forEach(([, y1]) => {
        it.rect(2, y1 - 1, 12, 1, w[0]);
        for (let x = 3; x < 12; x += 4) {
          const h = 4 + Math.floor(r() * 2), c = pick(r, FAB);
          it.rect(x, y1 - 1 - h, 3, h, '#d6f1ff'); it.rect(x, y1 - 1 - Math.ceil(h / 2), 3, Math.ceil(h / 2), c[0]);
          it.rect(x, y1 - 2 - h, 3, 1, '#8a97a8'); it.put(x, y1 - h, '#ffffff');
        }
      });
      return it.outline();
    },
    // wall items for the special rooms
    starChart(r) {
      const it = Item(20, 14), L = line(it);
      it.rect(1, 1, 18, 12, '#c98a1a'); it.rect(2, 2, 16, 10, '#1d1450'); it.rect(1, 1, 18, 1, '#ffd36b');
      for (let k = 0; k < 9; k++) it.put(3 + Math.floor(r() * 14), 3 + Math.floor(r() * 8), '#6f7fd6');
      const pts = [[4, 9], [7, 5], [10, 8], [13, 4], [16, 6]];
      for (let i = 0; i < pts.length - 1; i++) L(...pts[i], ...pts[i + 1], '#4a5cb0');
      pts.forEach(([x, y], i) => it.put(x, y, i === 3 ? '#ffffff' : '#ffd23f'));
      return it.outline().light(10, 7, 22, [.6, .7, 1], .3);
    },
    chalkboard(r) {
      const it = Item(24, 14), ink = ['#ffffff', '#ffffff', '#ff9bd9', '#ffe08a'];
      it.rect(1, 1, 22, 12, '#8a5a2a'); it.rect(2, 2, 20, 9, '#1f4a3a'); it.rect(2, 11, 20, 1, '#6e4420');
      for (const y of [4, 7]) { let x = 4; while (x < 19) { const len = 1 + Math.floor(r() * 3); it.rect(x, y, Math.min(len, 20 - x), 1, pick(r, ink)); x += len + 1; } }
      it.rect(17, 9, 2, 1, '#ffffff');
      return it.outline();
    },
    fanBoard(r) {
      const it = Item(20, 14);
      it.rect(1, 1, 18, 12, '#8a5a2a'); it.rect(2, 2, 16, 10, '#d9a066');
      [[3, 3], [9, 3], [4, 8], [11, 8]].forEach(([x, y]) => { it.rect(x, y, 4, 3, pick(r, ['#fff4dc', '#ffe08a', '#ffc2d6', '#c2f5ee'])); it.put(x + 1, y, '#ff3b5c'); });
      [[15, 4], [17, 4], [14, 5], [15, 5], [16, 5], [17, 5], [18, 5], [15, 6], [16, 6], [17, 6], [16, 7]].forEach(([x, y]) => it.put(x - 1, y, '#ff3b5c'));
      return it.outline();
    },
    plaque(r) {
      const it = Item(16, 12);
      it.rect(1, 1, 14, 10, '#c98a1a'); it.rect(2, 2, 12, 8, '#3a1a0c'); it.rect(1, 1, 14, 1, '#ffd36b');
      it.rect(6, 2, 1, 3, '#ff3b5c'); it.rect(9, 2, 1, 3, '#3ab0ff'); it.oval(8, 7, 2.5, 2.5, '#ffc83a'); it.put(7, 6, '#fff1a8');
      return it.outline();
    },
    gameshelf(r) {
      const it = Item(16, 27), w = pick(r, WOODS);
      it.rect(1, 1, 14, 25, w[2]); it.rect(2, 2, 12, 23, '#2a1640'); it.rect(1, 1, 14, 1, w[1]);
      [[2, 9], [10, 17], [18, 25]].forEach(([y0, y1]) => {
        it.rect(2, y1 - 1, 12, 1, w[0]);
        for (let x = 3; x < 13; x += 2) { const c = pick(r, FAB); it.rect(x, y1 - 7, 1, 6, c[0]); it.put(x, y1 - 7, c[1]); }
      });
      return it.outline();
    },
  };

  // footprint (cells wide, cells deep) and where an item can go
  const CAT = {
    back: [['bookshelf', 3, 2, 1], ['desk', 3, 3, 2], ['plantTall', 2, 2, 1], ['wardrobe', 1, 2, 1], ['fridge', 1, 2, 1], ['arcade', 1, 2, 1], ['rack', 1, 2, 1], ['tvstand', 1, 3, 1]],
    floor: [['crate', 3, 2, 1], ['crates', 2, 2, 1], ['boxes', 2, 2, 1], ['barrel', 2, 2, 1], ['plantSmall', 2, 1, 1], ['lamp', 1, 1, 1], ['chair', 2, 1, 1], ['table', 2, 2, 2], ['beanbag', 1, 2, 1], ['couch', 1, 4, 2], ['guitar', 1, 1, 1], ['books', 2, 1, 1], ['trash', 1, 1, 1]],
    wall: [['poster', 3], ['frame', 2], ['clock', 1], ['neon', 1], ['shelf', 1]],
  };
  function pickKind(r, list) {
    const tot = list.reduce((a, e) => a + e[1], 0);
    let x = r() * tot;
    for (const e of list) { x -= e[1]; if (x <= 0) return e; }
    return list[0];
  }
  window.FURN = { P, CAT, pickKind, FAB };
})();
