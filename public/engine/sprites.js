/* GitRoom pixel kit: 3x5 bitmap font, pills, bubbles and hand-drawn 16x16 residents. */
(() => {
  const INK = '#1b1030';
  const RAW = {
    A: '.#. #.# ### #.# #.#', B: '##. #.# ##. #.# ##.', C: '.## #.. #.. #.. .##', D: '##. #.# #.# #.# ##.',
    E: '### #.. ##. #.. ###', F: '### #.. ##. #.. #..', G: '.## #.. #.# #.# .##', H: '#.# #.# ### #.# #.#',
    I: '### .#. .#. .#. ###', J: '..# ..# ..# #.# .#.', K: '#.# #.# ##. #.# #.#', L: '#.. #.. #.. #.. ###',
    M: '#...# ##.## #.#.# #...# #...#', N: '#..# ##.# #.## #..# #..#', O: '.#. #.# #.# #.# .#.',
    P: '##. #.# ##. #.. #..', Q: '.#. #.# #.# ##. .##', R: '##. #.# ##. #.# #.#', S: '.## #.. .#. ..# ##.',
    T: '### .#. .#. .#. .#.', U: '#.# #.# #.# #.# ###', V: '#.# #.# #.# .#. .#.', W: '#...# #...# #.#.# ##.## #...#',
    X: '#.# #.# .#. #.# #.#', Y: '#.# #.# .#. .#. .#.', Z: '### ..# .#. #.. ###',
    0: '### #.# #.# #.# ###', 1: '.#. ##. .#. .#. ###', 2: '##. ..# .#. #.. ###', 3: '##. ..# .#. ..# ##.',
    4: '#.# #.# ### ..# ..#', 5: '### #.. ##. ..# ##.', 6: '.## #.. ### #.# ###', 7: '### ..# .#. .#. .#.',
    8: '### #.# ### #.# ###', 9: '### #.# ### ..# ##.',
    ' ': '.. .. .. .. ..', '.': '. . . . #', ',': '. . . # #', '-': '... ... ### ... ...', '!': '# # # . #',
    '?': '##. ..# .#. ... .#.', '%': '#.# ..# .#. #.. #.#', ':': '. # . # .', '/': '..# ..# .#. #.. #..',
    "'": '# # . . .', '(': '.# #. #. #. .#', ')': '#. .# .# .# #.', '+': '... .#. ### .#. ...',
    '*': '#.# .#. #.# ... ...', '_': '... ... ... ... ###', '>': '#.. .#. ..# .#. #..', '<': '..# .#. #.. .#. ..#',
    '=': '... ### ... ### ...', '#': '#.# ### #.# ### #.#', '@': '.###. #.#.# #.### #.... .###.',
    '♥': '.#.#. ##### ##### .###. ..#..', '✓': '....# ...#. #.#.. .#... .....', '§': '.###. .#.#. ##### ##.## #####',
  };
  const GLY = {};
  for (const k in RAW) GLY[k] = RAW[k].split(' ');
  const glyph = ch => GLY[ch] || GLY[ch.toUpperCase()] || GLY[' '];
  const textWidth = s => { let w = 0; for (const ch of s) w += glyph(ch)[0].length + 1; return Math.max(0, w - 1); };
  function drawText(ctx, s, x, y, col, sc = 1) {
    ctx.fillStyle = col;
    let cx = 0;
    for (const ch of s) {
      const g = glyph(ch);
      g.forEach((row, r) => { for (let c = 0; c < row.length; c++) if (row[c] === '#') ctx.fillRect(x + (cx + c) * sc, y + r * sc, sc, sc); });
      cx += g[0].length + 1;
    }
  }
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function pill(text, bg, fg, outline = INK) {
    const w = textWidth(text) + 6, c = canvas(w, 9), x = c.getContext('2d');
    x.fillStyle = outline; x.fillRect(1, 0, w - 2, 9); x.fillRect(0, 1, w, 7);
    x.fillStyle = bg; x.fillRect(1, 1, w - 2, 7);
    x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(2, 1, w - 4, 1);
    drawText(x, text, 3, 2, fg);
    return c;
  }
  function bubble(text) {
    const w = textWidth(text) + 6, c = canvas(w, 11), x = c.getContext('2d'), m = Math.floor(w / 2);
    x.fillStyle = INK; x.fillRect(1, 0, w - 2, 9); x.fillRect(0, 1, w, 7); x.fillRect(m - 2, 9, 1, 1); x.fillRect(m + 1, 9, 1, 1); x.fillRect(m - 1, 10, 2, 1);
    x.fillStyle = '#ffffff'; x.fillRect(1, 1, w - 2, 7); x.fillRect(m - 1, 8, 2, 2);
    drawText(x, text, 3, 2, INK);
    return c;
  }

  // ---------- residents: run-length rows ("3.2#Ee" = "...##Ee"), 16 x 16 ----------
  // tones are [light, base, dark] and get rim-lit automatically; f = feet (stay planted when stepping)
  const D = {
    react: { name: 'React', tag: '#0e7fa6', o: '#0b3d55', t: { '#': ['#b3f1ff', '#45cdfa', '#168fc0'], r: ['#ffffff', '#e3f9ff', '#9adff5'] }, f: { w: '#ffffff', f: '#0f6f96' },
      q: ['RE-RENDER!', 'HOOKS ♥', 'USEEFFECT?'], rows: ['16.', '12.w3.', '6.4#.3w2.', '5.6#.w3.', '4.8#4.', '3.10#3.', '3.2#Ee2#Ee2#3.', '3.2#ee2#ee2#3.', '.2r#p6#p#2r.', '2.r4#2k4#r2.', '3.10#3.', '4.8#4.', '5.6#5.', '5.2f2.2f5.', '16.', '16.'] },
    next: { name: 'Next.js', tag: '#111111', o: '#000000', t: { '#': ['#55556a', '#26262f', '#101015'] }, f: { w: '#ffffff', k: '#0b0f1e', g: '#5b7bff', f: '#000000' },
      q: ['USE CLIENT', 'SSR!', 'APP ROUTER'], rows: ['16.', '7.2#7.', '5.6#5.', '4.8#4.', '4.8#4.', '3.10w3.', '3.wgkw2#wgkw3.', '4.8#4.', '4.5#2w#4.', '4.8#4.', '4.8#4.', '4.8#4.', '5.6#5.', '5.2f2.2f5.', '16.', '16.'] },
    tailwind: { name: 'Tailwind', tag: '#0b7f99', o: '#0a4a6e', float: true, t: { '#': ['#b5ecff', '#3cc0f8', '#0e86c2'], a: ['#ffffff', '#a5ecff', '#5fd3f7'] },
      q: ['FLEX GAP-4', 'NO CSS!', 'ROUNDED-XL'], rows: ['16.', '7.2#2a5.', '5.5#2a4.', '4.8#a3.', '3.10#3.', '3.2#Ee2#Ee2#3.', '3.2#ee2#ee2#3.', '3.#p6#p#3.', '3.4#2k4#3.', '3.10#3.', '3.10#3.', '3.10#3.', '3.2#2.2#2.2#3.', '16.', '16.', '16.'] },
    vite: { name: 'Vite', tag: '#6a3fe0', o: '#2a1066', t: { '#': ['#d6c2ff', '#9a6bff', '#6a2fd8'] }, f: { y: '#ffd23f', w: '#ffffff', f: '#4a1fb0' },
      q: ['HMR!', '312MS', 'FAST!'], rows: ['16.', '9.2y5.', '8.2y6.', '7.4y5.', '5.2#2y2#5.', '4.8#4.', '3.2#k4#k2#3.', '3.2#Ee2#Ee2#3.', '3.2#ee2#ee2#3.', '3.#p6#p#3.', '3.3#4k3#3.', '4.3#w4#4.', '5.6#5.', '5.2f2.2f5.', '16.', '16.'] },
    fastapi: { name: 'FastAPI', tag: '#047a6f', o: '#03463d', float: true, t: { '#': ['#8ff5e6', '#05998b', '#04665c'] },
      q: ['200 OK', 'ASYNC!', '/DOCS'], rows: ['16.', '7.7#2.', '6.7#3.', '5.7#4.', '4.#Ee2#Ee#4.', '4.#2e2#2e4#.', '3.#p2#2k2#p2#2.', '3.10#3.', '7.5#4.', '6.5#5.', '6.4#6.', '5.4#7.', '5.3#8.', '4.2#10.', '16.', '16.'] },
    pytorch: { name: 'PyTorch', tag: '#c2381c', o: '#5c1203', float: true, under: 'a', t: { '#': ['#ffb26b', '#ff5b2e', '#cf3410'], a: ['#fff2a8', '#ffd84d', '#f0a800'] },
      q: ['TRAINING...', 'LOSS DOWN', 'EPOCH 42'], rows: ['16.', '9.#6.', '8.2#6.', '7.3#6.', '6.5#5.', '5.7#4.', '4.9#3.', '3.2#6a2#3.', '3.#aEe2aEea#3.', '3.#aee2aeea#3.', '3.#3a2k3a#3.', '4.#6a#4.', '5.6#5.', '16.', '16.', '16.'] },
    pandas: { name: 'pandas', tag: '#e70488', o: '#0a0230', under: 'n', t: { '#': ['#ffffff', '#f1efff', '#c9c4e8'], n: ['#4a3fa0', '#1e1170', '#0a0230'], m: ['#ff7ccc', '#e70488', '#a8005f'] }, f: { f: '#150458', p: '#ff8fc8' },
      q: ['DF.HEAD()', 'GROUPBY!', 'NAN?'], rows: ['16.', '3.2n6.2n3.', '2.4n4#4n2.', '2.2n8#2n2.', '3.10#3.', '3.#3n2#3n#3.', '3.#nEe2#Een#3.', '3.#nee2#een#3.', '3.2#p#2k#p2#3.', '2.12m2.', '2.2n2#2m4#2n2.', '2.2n8#2n2.', '4.8#4.', '4.3f2.3f4.', '16.', '16.'] },
    docker: { name: 'Docker', tag: '#1d63ed', o: '#0a2c5c', t: { '#': ['#a6dcff', '#2f9bf0', '#1a62c9'], c: ['#a6dcff', '#2f9bf0', '#1a62c9'], a: ['#ffffff', '#dff3ff', '#b5ddf7'] },
      q: ['COMPOSE UP', 'IT WORKS!', 'CACHED'], rows: ['16.', '7.2c7.', '7.2c7.', '16.', '4.2c.2c7.', '4.2c.2c3.#.#.', '12.3#.', '.2c.2c.2c.2c.2#.', '.2c.2c.2c.2c.2#.', '13.2#.', '.14#.', '.#Ee10#2.', '.#2e9#3.', '.p#k8#4.', '2.8a6.', '16.'] },
    supabase: { name: 'Supabase', tag: '#1c8f5a', o: '#0b4a2c', float: true, t: { '#': ['#b8f7d9', '#3ecf8e', '#1f9a63'] }, f: { w: '#ffffff' },
      q: ['REALTIME!', 'RLS ON', 'NEW ROW!'], rows: ['16.', '16.', '16.', '6.4#6.', '4.5#w2#4.', '3.5#2w3#3.', '2.6#w5#2.', '2.3#Ee2#Ee3#2.', '2.3#ee2#ee3#2.', '2.2#p2#2k2#p2#2.', '2.12#2.', '.14#.', '.14#.', '16.', '16.', '16.'] },
    postgres: { name: 'Postgres', tag: '#24507a', o: '#0f2a4d', t: { '#': ['#a8cdf5', '#3f7fc4', '#275896'], a: ['#cfe4ff', '#7cb0e8', '#4d80bd'], t: ['#cfe4ff', '#8fbbea', '#5f8fc8'] }, f: { w: '#ffffff', f: '#1c3f6e' },
      q: ['SELECT *', 'VACUUM', 'ACID ♥'], rows: ['16.', '16.', '5.6#5.', '2.2a8#2a2.', '.3a8#3a.', '.3a#Ee2#Ee#3a.', '.3a#ee2#ee#3a.', '2.2a#p4#p#2a2.', '3.a3#2t3#a3.', '4.2#w2tw2#4.', '4.3#2t3#4.', '4.8#4.', '4.2f4.2f4.', '16.', '16.', '16.'] },
    tauri: { name: 'Tauri', tag: '#108da0', o: '#3d2a00', t: { '#': ['#ffe8a0', '#ffc131', '#d99100'], a: ['#a8f3fb', '#24c8db', '#0e8a9c'] },
      q: ['3MB APP', 'TINY!', 'CARGO RUN'], rows: ['16.', '7.#a7.', '6.2#2a6.', '6.2#2a6.', '.7#7a.', '3.5#5a3.', '4.#Ee#aEea4.', '4.#ee#aeea4.', '4.#p#2kapa4.', '4.3#5a4.', '3.3#4.3a3.', '3.2#6.2a3.', '16.', '16.', '16.', '16.'] },
    actions: { name: 'GH Actions', tag: '#0b5bc4', o: '#0a2766', glide: true, t: { '#': ['#b7d8ff', '#2f8cff', '#1555c2'], a: ['#2a6fe0', '#1b5fcc', '#0f3f99'] }, f: { g: '#3dff8a', k: '#0a1a40', w: '#ffffff', f: '#0a1a40' },
      q: ['✓ PASSING', 'ON: PUSH', 'CI GREEN'], rows: ['16.', '16.', '7.2g7.', '7.2k7.', '5.6#5.', '3.10#3.', '2.12#2.', '2.12#2.', '2.2#2w4#2w2#2.', '2.2#2w4#2w2#2.', '2.12a2.', '3.10a3.', '4.f6.f4.', '16.', '16.', '16.'] },
    claude: { name: 'Claude', tag: '#c4643f', o: '#6b2a17', float: true, t: { '#': ['#f6c0a6', '#d97757', '#b5573a'] }, f: { k: '#4a1d10', p: '#ff8f8f' },
      q: ['HAPPY TO HELP!', 'READING CLAUDE.MD', 'LET ME THINK'], rows: ['16.', '7.2#7.', '2.#4.2#4.#2.', '3.#2.4#2.#3.', '4.8#4.', '3.10#3.', '3.10#3.', '.4#k4#k4#.', '.3#k#k2#k#k3#.', '3.2#p4#p2#3.', '3.4#2k4#3.', '4.8#4.', '3.#2.4#2.#3.', '2.#4.2#4.#2.', '7.2#7.', '16.'] },
    chatgpt: { name: 'ChatGPT', tag: '#0e8c6d', o: '#06523f', float: true, t: { '#': ['#ffffff', '#f2f5f4', '#c9d6d1'], g: ['#7fe0c4', '#10a37f', '#0b7a5e'] },
      q: ['AS A MODEL...', 'GREAT QUESTION!', 'DELVING IN'], rows: ['16.', '5.5#6.', '3.#.5#.2#3.', '2.2#.4#.4#2.', '2.2#.4#.4#2.', '.4#.4g5#.', '.4#6g#2.#.', '.3#gEe2gEeg2#2.', '2.2#g2e2g2eg3#.', '.#2.#6g4#.', '.5#4g.4#.', '2.4#.4#.2#2.', '2.4#.4#.2#2.', '3.2#.5#.#3.', '6.5#5.', '16.'] },
    gemini: { name: 'Gemini', tag: '#5b6cff', o: '#1b1f5e', float: true, t: { '#': ['#bcd4ff', '#4f8dff', '#2b5fd9'], a: ['#ecd2ff', '#a66bff', '#7a3fe0'] },
      q: ['MULTIMODAL!', '1M TOKENS', 'TWINKLE'], rows: ['16.', '7.2#7.', '7.2#7.', '6.4#6.', '6.4#6.', '5.6#5.', '4.2#e2#e2#4.', '.5#e2#e5a.', '.5#p2#p5a.', '4.3a2k3a4.', '5.6a5.', '6.4a6.', '6.4a6.', '7.2a7.', '7.2a7.', '16.'] },
    flask: { name: 'Flask', tag: '#4f6d7a', o: '#0a0a0a', float: true, t: { h: ['#7a7a7a', '#2e2e2e', '#161616'], l: ['#e0e0e0', '#bdbdbd', '#8a8a8a'] }, f: { c: '#8a8a8a', s: '#8a8a8a' },
      q: ['@APP.ROUTE', 'DEBUG=TRUE', 'MICRO!'], rows: ['16.', '.2c13.', '.3l12.', '.3h2l10.', '.5hl9.', '.hW2hW2h8.', '.hW2hW2h8.', '.7h8.', '2.5hs8.', '2.6hs7.', '3.6hs6.', '4.7hs2.h.', '5.10h.', '7.7h2.', '16.', '16.'] },
    llamaindex: { name: 'LlamaIndex', tag: '#b4469f', o: '#5a2a5c', t: { '#': ['#fffaf2', '#f6e2cc', '#d9b896'], a: ['#ffd6f5', '#f29bdc', '#c86bb8'], s: ['#ffffff', '#fbefe2', '#e8d2ba'] }, f: { f: '#7a4a3a' },
      q: ['RETRIEVING...', 'TOP_K=5', 'INDEXED!'], rows: ['16.', '4.#6.#4.', '4.2#4.2#4.', '4.2#4a2#4.', '3.2#6a2#3.', '3.2#Ee2#Ee2#3.', '3.2#ee2#ee2#3.', '4.#p#2s#p#4.', '4.2#4s2#4.', '5.#s2ks#5.', '4.8a4.', '3.10a3.', '3.10a3.', '4.2f4.2f4.', '16.', '16.'] },
    pinecone: { name: 'Pinecone', tag: '#8a5328', o: '#4a2a12', t: { '#': ['#e8b07a', '#b5733a', '#7f4b22'], g: ['#c4ff9a', '#4cc23c', '#2e8a24'] }, f: { a: '#7a4520', f: '#4a2a12' },
      q: ['UPSERTED', 'COSINE!', 'NEAREST?'], rows: ['16.', '8.2g6.', '7.2g7.', '6.4#6.', '5.6#5.', '4.2#a2#a2#4.', '4.#Ee2#Ee#4.', '3.2#ee2#ee2#3.', '3.#a#p2#p#a#3.', '3.2#a#2k#a2#3.', '4.#a4#a#4.', '5.#a2#a#5.', '6.4#6.', '5.2f2.2f5.', '16.', '16.'] },
    mediapipe: { name: 'MediaPipe', tag: '#e0700f', o: '#3a1a0a', t: { '#': ['#ffd9a8', '#ff9f1c', '#d97706'] }, f: { l: '#2ee6d6', n: '#ff6a1c', f: '#ff6a1c' },
      q: ['SIT UP STRAIGHT!', '33 LANDMARKS', 'POSE OK'], rows: ['16.', '6.4#6.', '5.6#5.', '5.#e2#e#5.', '5.#e2#e#5.', '6.#2k#6.', '3.n8ln3.', '3.l3.2l3.l3.', '3.n3.2l3.n3.', '7.2l7.', '5.n4ln5.', '5.l4.l5.', '5.l4.l5.', '4.2f4.2f4.', '16.', '16.'] },
    bs4: { name: 'Beautiful Soup', tagText: 'BS4', tag: '#c93a3a', o: '#5a1a1a', t: { '#': ['#ffb3b3', '#ff5d5d', '#c93a3a'], r: ['#ffffff', '#ffe9e9', '#ffc9c9'] }, f: { w: '#ffffff', a: '#ffb347', n: '#ffe680', g: '#4cc23c', f: '#7a2020' },
      q: ['SOUP.FIND()', 'SLURP', 'PARSED!'], rows: ['16.', '5.w3.w6.', '6.w3.w5.', '5.w3.w6.', '16.', '2.a2n3aga2n2a2.', '2.12r2.', '3.#Ee4#Ee#3.', '3.#ee4#ee#3.', '3.2#p#2k#p2#3.', '4.8#4.', '5.6#5.', '5.2f2.2f5.', '16.', '16.', '16.'] },
    vercel: { name: 'Vercel', tag: '#111111', o: '#000000', t: { '#': ['#4a4a58', '#1d1d24', '#0a0a0e'] }, f: { w: '#ffffff', r: '#ff3b5c', f: '#000000' },
      q: ['DEPLOYED!', 'EDGE READY', 'NINJA PUSH'], rows: ['16.', '7.2#7.', '6.4#6.', '6.4#6.', '5.6#2r3.', '5.6r5.', '4.8#4.', '4.2#W2#W2#4.', '3.3#W2#W3#3.', '3.10#3.', '2.6#2w4#2.', '2.12#2.', '.14#.', '3.2f6.2f3.', '16.', '16.'] },
    huggingface: { name: 'Hugging Face', tagText: 'HUGGINGFACE', tag: '#d99a00', o: '#7a4a00', t: { '#': ['#fff3a0', '#ffd21e', '#e0a800'], h: ['#ffd08a', '#ff9d00', '#d47a00'] }, f: { k: '#4a2a00', r: '#ff5d5d', f: '#7a4a00' },
      q: ['HUG?', 'SPACE IS UP', 'TRANSFORMERS!'], rows: ['16.', '5.6#5.', '3.10#3.', '2.12#2.', '2.12#2.', '2.3#k4#k3#2.', '2.2#k#k2#k#k2#2.', '2.2#p6#p2#2.', '2.3#6k3#2.', '2.3#k4rk3#2.', '.2h3#4k3#2h.', '.3h8#3h.', '4.8#4.', '4.2f4.2f4.', '16.', '16.'] },
    cat: { name: 'Mochi', pet: true, tag: '#e07a1c', o: '#5a2a08', t: { '#': ['#ffcf8a', '#ff9f3d', '#d9741c'] }, f: { d: '#c45f12', f: '#fff4e0', k: '#5a2a08' },
      q: ['MEOW', 'PURR...', 'MRRP?'], rows: ['16.', '16.', '16.', '3.2#6.2#3.', '3.3#4.3#3.', '3.4#2d4#3.', '3.2#Ee2#Ee2#3.', '3.2#ee2#ee2#3.', '3.#p2#2k2#p#3.', '4.8#4.', '5.6#.2#2.', '5.6#2#3.', '5.2f2.2f5.', '16.', '16.', '16.'] },
    dog: { name: 'Biscuit', pet: true, tag: '#b8692a', o: '#4a2408', t: { '#': ['#ffcf9a', '#e8964a', '#b8692a'], w: ['#ffffff', '#fffaf0', '#ead9c4'] }, f: { f: '#fffaf0', k: '#2a1408' },
      q: ['WOOF!', 'FETCH?', 'GOOD BOY'], rows: ['16.', '16.', '16.', '2.2#8.2#2.', '2.3#6.3#2.', '3.10#3.', '3.2#Ee2wEe2#3.', '3.2#ee2wee2#3.', '3.#p#4w#p#3.', '4.#2w2k2w#4.', '5.6#.#3.', '5.6#5.', '5.2f2.2f5.', '16.', '16.', '16.'] },
    frog: { name: 'Ribbit', pet: true, tag: '#3a8f24', o: '#1a4410', t: { '#': ['#b6f07a', '#5ec23c', '#3a8f24'], a: ['#f2ffd6', '#d8f5a0', '#b0d870'] }, f: { f: '#3a8f24', k: '#1a4410' },
      q: ['RIBBIT', 'BLUB', 'CROAK!'], rows: ['16.', '16.', '16.', '16.', '2.4#4.4#2.', '2.#Ee#4.#Ee#2.', '2.#ee6#ee#2.', '2.12#2.', '2.#p#6k#p#2.', '3.10a3.', '2.2f8a2f2.', '4.8a4.', '16.', '16.', '16.', '16.'] },
    dragon: { name: 'Ember', pet: true, tag: '#6233d9', o: '#26105a', t: { '#': ['#c9a8ff', '#8f5cff', '#6233d9'], w: ['#ffd6f5', '#ff9bd9', '#d96bb0'], a: ['#fff3c4', '#ffe08a', '#e0b84a'] }, f: { y: '#ffd23f', f: '#4a1fb0', k: '#26105a' },
      q: ['RAWR!', 'TINY FIRE', 'HOARDING STARS'], rows: ['16.', '16.', '4.y6.y4.', '4.y6#y4.', '3.10#3.', '3.2#Ee2#Ee2#3.', '3.2#ee2#ee2#3.', '1.2w#p2#2k2#p#2w1.', '1.3w8#3w1.', '2.2w8a2w2.', '4.8a3#1.', '4.2f4.2f4.', '16.', '16.', '16.', '16.'] },
    express: { name: 'Express', tag: '#3a3a46', o: '#121218', t: { '#': ['#ffffff', '#f0f0f4', '#c4c4cc'] }, f: { x: '#1d1d24', f: '#2a2a34' },
      q: ['APP.LISTEN(3000)', 'NEXT()', 'MIDDLEWARE!'], rows: ['16.', '16.', '4.8#4.', '3.10#3.', '2.3#Ee2#Ee3#2.', '2.3#2e2#2e3#2.', '2.2#p2#2k2#p2#2.', '2.12#2.', '2.3#2x2#x#x2#2.', '2.2#x2#x#x#x2#2.', '2.2#4x2#x3#2.', '2.2#x4#x#x2#2.', '2.3#3x#x#x2#2.', '3.10#3.', '4.2f4.2f4.', '16.'] },
    opencv: { name: 'OpenCV', tag: '#d63a3a', o: '#4a0f0f', t: { '#': ['#ff9a9a', '#ff4d4d', '#c92a2a'] }, f: { r: '#ff3b3b', g: '#3dd65c', b: '#3b7bff', w: '#ffffff', c: '#2f7bff', k: '#10142a', f: '#4a0f0f' },
      q: ['I SEE YOU', 'CV2.IMREAD', 'FACE FOUND!'], rows: ['16.', '5.r.2g.b5.', '16.', '4.8#4.', '3.10#3.', '2.4#4w4#2.', '2.3#w4cw3#2.', '2.3#wc2kcw3#2.', '2.3#wc2kcw3#2.', '2.3#w4cw3#2.', '2.4#4w4#2.', '2.#p8#p#2.', '3.10#3.', '4.2f4.2f4.', '16.', '16.'] },
    numpy: { name: 'NumPy', tag: '#4d77cf', o: '#14244d', t: { '#': ['#8fc7ff', '#4d77cf', '#2f4f9a'], c: ['#ffe9a0', '#ffca2c', '#d9a400'], a: ['#e2f2ff', '#9ed0ff', '#6fb0ef'] }, f: { f: '#2f4f9a' },
      q: ['NP.ARRAY!', 'BROADCASTING', 'SHAPE (3,3)'], rows: ['16.', '16.', '5.6a5.', '4.8a4.', '3.10a3.', '3.5#5c3.', '3.2#Ee#cEe2c3.', '3.2#ee#cee2c3.', '3.#p2#2k2cpc3.', '3.5#5c3.', '4.4#4c4.', '5.3#3c5.', '5.2f2.2f5.', '16.', '16.', '16.'] },
    sdl: { name: 'SDL3', tag: '#d13a7a', o: '#3a1030', t: { '#': ['#ffb3d1', '#ff5c9d', '#d13a7a'] }, f: { s: '#123a2e', a: '#24163b', e: '#7dff9b', k: '#7dff9b', f: '#3a1030' },
      q: ['60 FPS', 'SDL_POLLEVENT', 'RAYCASTING'], rows: ['16.', '4.a6.a4.', '5.a4.a5.', '6.a2.a6.', '2.12#2.', '2.#10s#2.', '2.#2sEe2sEe2s#2.', '2.#2s2e2s2e2s#2.', '2.#3s4k3s#2.', '2.#10s#2.', '2.12#2.', '3.10#3.', '4.2f4.2f4.', '16.', '16.', '16.'] },
  };
  // the rest of the cast lives in avatars-*.js, loaded before this file
  Object.assign(D, window.PX_EXTRA || {});

  const BASE = { e: INK, E: '#ffffff', W: '#ffffff', k: INK, p: '#ff6fa3', w: '#ffffff' };
  const EYES = 'eEW';
  function rle(rows) {
    return rows.map(r => { let s = '', n = ''; for (const ch of r) { if (ch >= '0' && ch <= '9') n += ch; else { s += ch.repeat(n ? +n : 1); n = ''; } } return s; });
  }
  function frames(def) {
    const stand = rle(def.rows).map(r => r.split(''));
    const blink = stand.map(r => r.slice());
    for (let y = 0; y < 15; y++) for (let x = 0; x < 16; x++) {
      if (!EYES.includes(blink[y][x]) || !EYES.includes(stand[y + 1][x])) continue;
      const side = [stand[y][x - 1], stand[y][x + 1]].find(c => c && !EYES.includes(c) && c !== '.');
      blink[y][x] = def.under || side || '#';
    }
    let step = stand;
    if (!def.glide) {
      // everything bobs up a pixel except what touches the ground (feet, or a def's `plant` chars like a nest or water)
      const plant = def.plant || 'f';
      step = stand.map(r => r.map(() => '.'));
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const ch = stand[y][x];
        if (ch === '.') continue;
        if (plant.includes(ch)) step[y][x] = ch; else if (y > 0) step[y - 1][x] = ch;
      }
    }
    return { stand, blink, step };
  }
  const rgbCache = {};
  const rgb = h => rgbCache[h] || (rgbCache[h] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
  function paint(def, g, flip) {
    const c = canvas(16, 16), x = c.getContext('2d'), img = x.createImageData(16, 16);
    const on = (i, j) => i >= 0 && j >= 0 && i < 16 && j < 16 && g[j][i] !== '.';
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
      const ch = g[j][i];
      let col = null;
      if (ch === '.') { if (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1)) col = def.o; }
      else if (def.t[ch]) {
        const t = def.t[ch];
        col = (!on(i, j - 1) || !on(i - 1, j)) ? t[0] : (!on(i, j + 1) || !on(i + 1, j)) ? t[2] : t[1];
      } else col = (def.f && def.f[ch]) || BASE[ch] || def.o;
      if (!col) continue;
      const [r, gg, b] = rgb(col), k = (j * 16 + (flip ? 15 - i : i)) * 4;
      img.data[k] = r; img.data[k + 1] = gg; img.data[k + 2] = b; img.data[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return c;
  }
  const SPR = {};
  function build(id, def) {
    const f = frames(def), out = {};
    ['stand', 'blink', 'step'].forEach(k => { out[k] = paint(def, f[k], false); out[k + 'F'] = paint(def, f[k], true); });
    let top = 0, bottom = 15;
    while (top < 16 && f.stand[top].every(c => c === '.')) top++;
    while (bottom > 0 && f.stand[bottom].every(c => c === '.')) bottom--;
    SPR[id] = { ...def, id, frames: out, top: Math.max(0, top - 1), bottom: Math.min(15, bottom + 1), pill: pill((def.tagText || def.name).toUpperCase(), def.tag, '#ffffff') };
    return SPR[id];
  }
  for (const id in D) build(id, D[id]);

  // ---------- placeholders: anyone without a hand-drawn sprite still moves in looking their best ----------
  // A body shape, a hat and an accent colour are picked from the name, and the brand colour does the rest,
  // so "Redux" always looks the same and never like "Zod".
  const hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const p = hx(a), q = hx(b); return toHex(p.map((v, i) => v + (q[i] - v) * t)); };
  const lum = h => { const [r, g, b] = hx(h); return 0.299 * r + 0.587 * g + 0.114 * b; };
  const hue = h => { const [r, g, b] = hx(h).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return -1; const x = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (x * 60 + 360) % 360; };
  const seedOf = s => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
  // body shapes: rows 0..15, `top` is the first row of the head and [x0, x1] its width there
  const SHAPES = [
    { top: 3, x0: 5, x1: 10, rows: ['.....######.....', '...##########...', '..############..', '..###Ee##Ee###..', '..###ee##ee###..', '..##p##kk##p##..', '..###bbbbbb###..', '...##bbbbbb##...', '....########....', '.....ff..ff.....'] },
    { top: 3, x0: 2, x1: 13, rows: ['..############..', '..############..', '..############..', '..##Ee####Ee##..', '..##ee####ee##..', '..#p###kk###p#..', '..############..', '..###bbbbbb###..', '..############..', '...ff......ff...'] },
    { top: 2, x0: 5, x1: 10, rows: ['.....######.....', '....########....', '...##########...', '...##########...', '...##Ee##Ee##...', '...##ee##ee##...', '...#p##kk##p#...', '...###bbbb###...', '...###bbbb###...', '....########....', '....ff....ff....'] },
    { top: 2, x0: 5, x1: 10, float: true, rows: ['.....######.....', '....########....', '...##########...', '..############..', '..###Ee##Ee###..', '..###ee##ee###..', '..##p##kk##p##..', '..############..', '..###bbbbbb###..', '..############..', '..#.##.##.##.#..', '...#..#..#..#...'] },
  ];
  // hats sit on the head: each row is [column offsets from the head's middle] drawn with a colour code
  const HATS = [
    null,
    { name: 'antenna', rows: [[['a', -1, 0]], [['a', -1, 0]], [['k', 0, 0]]] },
    { name: 'ears', ears: true },
    { name: 'sprout', rows: [[['g', -3, -2], ['g', 1, 2]], [['g', -1, 0]]] },
    { name: 'crown', rows: [[['y', -3, -3], ['y', -1, 0], ['y', 2, 2]], [['y', -3, 2]]] },
    { name: 'tophat', rows: [[['a', -2, 1]], [['a', -2, 1]], [['a', -4, 3]]] },
    { name: 'horns', horns: true },
  ];
  const ACCENTS = ['#ffd23f', '#ff4f8b', '#5ad8ff', '#9be15d', '#ff8a3d', '#b28bff', '#ffffff'];
  const QUOTES = ['HELLO!', 'ON IT!', 'SHIP IT!', 'LGTM!', 'MERGED!', 'HI THERE!', 'BUSY...'];
  const LANG_QUOTES = ['HELLO WORLD!', 'COMPILING...', 'IT RUNS!', 'NO BUGS?', 'REFACTOR!'];
  const tagSafe = s => String(s).toUpperCase().replace(/&/g, '+').replace(/[^A-Z0-9 .,'!?%:/+\-*_=#@<>()]/g, '').replace(/\s+/g, ' ').trim().slice(0, 12) || 'NEW FRIEND';
  function placeholderDef(id, meta) {
    const seed = seedOf(id), color = /^#[0-9a-f]{6}$/i.test(meta.color || '') ? meta.color : toHex([90 + seed % 140, 90 + (seed >>> 8) % 140, 90 + (seed >>> 16) % 140]);
    const shape = SHAPES[seed % SHAPES.length], hat = HATS[(seed >>> 3) % HATS.length];
    const L = lum(color), dark = L < 45, light = L > 215;
    const base = dark ? mix(color, '#ffffff', .2) : color;
    const body = [mix(base, '#ffffff', .42), base, mix(base, '#000000', .26)];
    const belly = [mix(base, '#ffffff', .75), mix(base, '#ffffff', .55), mix(base, '#ffffff', .35)];
    const hb = hue(base), acc = ACCENTS.filter(a => hue(a) < 0 || hb < 0 || Math.min(Math.abs(hue(a) - hb), 360 - Math.abs(hue(a) - hb)) > 40);
    const a = acc[(seed >>> 6) % acc.length];
    const rows = Array.from({ length: 16 }, () => '................'.split(''));
    shape.rows.forEach((r, j) => { rows[shape.top + j] = r.split(''); });
    const mid = 8, put = (y, x, ch) => { if (y >= 0 && y < 16 && x >= 0 && x < 16 && rows[y][x] === '.') rows[y][x] = ch; };
    if (hat && hat.rows) hat.rows.forEach((spans, j) => { const y = shape.top - hat.rows.length + j; spans.forEach(([ch, f, t]) => { for (let x = mid + f; x <= mid + t; x++) put(y, x, ch); }); });
    if (hat && hat.ears) { const y = shape.top; [[shape.x0, 1], [shape.x1, -1]].forEach(([x, d]) => { put(y - 1, x, '#'); put(y - 1, x + d, '#'); put(y - 2, x, '#'); }); }
    if (hat && hat.horns) { const y = shape.top; [[shape.x0 + 1, -1], [shape.x1 - 1, 1]].forEach(([x, d]) => { put(y - 1, x, 'a'); put(y - 2, x + d, 'a'); }); }
    const tag = L > 150 ? mix(color, '#000000', .5) : dark ? mix(color, '#ffffff', .12) : color;
    return {
      name: meta.name || id, tagText: tagSafe(meta.tag || meta.name || id), tag, o: light ? mix(color, '#000000', .55) : mix(base, '#000000', .64), float: !!shape.float, placeholder: true, lang: !!meta.lang,
      t: { '#': body, b: belly, a: [mix(a, '#ffffff', .45), a, mix(a, '#000000', .25)] }, f: { f: body[2], g: '#5ec23c', y: '#ffd23f' },
      q: meta.lang ? LANG_QUOTES : [`${tagSafe(meta.tag || meta.name || id)} ♥`, ...QUOTES], rows: rows.map(r => r.join('')),
    };
  }
  function placeholder(id, meta = {}) {
    if (SPR[id]) return SPR[id];
    const def = placeholderDef(id, meta);
    D[id] = def;
    return build(id, def);
  }

  // ---------- menu pixel bits ----------
  function grassTile(night) { return grassCanvas(night).toDataURL(); }
  function grassCanvas(night) {
    const c = canvas(32, 32), x = c.getContext('2d');
    const pal = night ? ['#1d4a3a', '#173d30', '#2a6650', '#fff6a8'] : ['#5cc23c', '#47a62c', '#86e05a', '#ff6fa3'];
    x.fillStyle = pal[0]; x.fillRect(0, 0, 32, 32);
    let s = 7;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let n = 0; n < 26; n++) { const gx = Math.floor(r() * 32), gy = Math.floor(r() * 30); x.fillStyle = r() > .5 ? pal[1] : pal[2]; x.fillRect(gx, gy, 1, 2); if (r() > .6) x.fillRect((gx + 1) % 32, gy + 1, 1, 1); }
    x.fillStyle = pal[3]; x.fillRect(22, 7, 1, 1); x.fillRect(6, 24, 1, 1);
    return c;
  }
  function drawMap(cv, rows, pal) {
    const x = cv.getContext('2d');
    rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (pal[row[i]]) { x.fillStyle = pal[row[i]]; x.fillRect(i, j, 1, 1); } });
  }
  const roof = [0, 1, 2, 3, 4, 5].map(i => '.'.repeat(6 - i) + (i ? 'o' + 'r'.repeat(2 * i - 1) + 'o' : 'o') + '.'.repeat(6 - i));
  const LOGO = [...roof, 'o'.repeat(13), '.o' + 'c'.repeat(9) + 'o.', '.ocbbcccyyco.', '.ocbbcccyyco.', '.occccccyyco.', '.occccccyyco.', '.' + 'o'.repeat(11) + '.'];
  const LOGO_PAL = { o: '#24163b', r: '#ff4f8b', c: '#fff4dc', b: '#7fd6ff', y: '#ffc83a' };

  window.PX = { INK, textWidth, drawText, canvas, pill, bubble, SPR, grassTile, grassCanvas, drawMap, LOGO, LOGO_PAL, rle, DEFS: D, placeholder };
})();
