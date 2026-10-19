/* GitRoom unlock tables: furniture milestones, wallpapers and pets bought with commit days, and the 8x8 badge icons. */
(() => {
  window.DATA = {
    TIERS: [1, 2, 5, 10, 25, 50, 100, 200, 500, 1000],
    TIER_NAMES: ['Rug', 'Desk', 'Bookshelf', 'Plant', 'Floor lamp', 'TV', 'Couch', 'Decor', 'Arcade', 'Trophy'],
    THEME_NAMES: { data: { 5: 'Whiteboard', 8: 'Server rack' }, game: { 2: 'Game shelf', 5: 'Retro TV' }, web: {}, sys: { 5: 'Whiteboard', 8: 'Server rack' } },
    WALLPAPERS: [
      { id: 'teal', name: 'Seafoam', days: 0, c: { paper: '#1fb5a1', hi: '#5fe0cb', lo: '#138f80', dot: '#a6f5e7' } },
      { id: 'rose', name: 'Rosewood', days: 10, c: { paper: '#ec5f8c', hi: '#ff9cbd', lo: '#c4436e', dot: '#ffd1e1' } },
      { id: 'lav', name: 'Lavender', days: 30, c: { paper: '#8f6ae8', hi: '#b9a0ff', lo: '#6c4bc4', dot: '#e2d6ff' } },
      { id: 'sun', name: 'Sunflower', days: 60, c: { paper: '#f5b83a', hi: '#ffd98a', lo: '#d9951a', dot: '#fff3c4' } },
      { id: 'mint', name: 'Mint', days: 90, c: { paper: '#3fd29a', hi: '#8ff0c4', lo: '#23a873', dot: '#d6fff0' } },
      { id: 'night', name: 'Midnight', days: 120, c: { paper: '#2b3a7a', hi: '#4a5cb0', lo: '#1c2654', dot: '#8fa2ff' } },
      { id: 'gold', name: 'Gilded', days: 250, c: { paper: '#d9a12e', hi: '#ffd36b', lo: '#a8761a', dot: '#fff6c8' } },
    ],
    PETS: [
      { id: 'none', name: 'No pet', days: 0 }, { id: 'cat', name: 'Mochi the cat', days: 0 }, { id: 'dog', name: 'Biscuit the dog', days: 20 },
      { id: 'frog', name: 'Ribbit the frog', days: 50 }, { id: 'dragon', name: 'Ember the dragon', days: 200 },
    ],
    // keys match lib/analyze.js BADGE_KEYS; anything GitHub adds later hangs as a medal
    BADGES: {
      shark: { name: 'Pull Shark', bg: '#2a7fe0', pal: { w: '#ffffff', g: '#cfe6ff', b: '#9fd8ff' }, map: ['........', '....w...', '...ww...', '..www...', '.wwwwg..', 'bbbbbbbb', '.b..b..b', '........'] },
      star: { name: 'Starstruck', bg: '#7a4dff', pal: { y: '#ffd23f' }, map: ['...yy...', '...yy...', 'yyyyyyyy', '.yyyyyy.', '..yyyy..', '.yy..yy.', '.y....y.', '........'] },
      quick: { name: 'Quickdraw', bg: '#11a39a', pal: { y: '#ffe14d' }, map: ['....yy..', '...yy...', '..yy....', '.yyyyy..', '...yy...', '..yy....', '.yy.....', '........'] },
      galaxy: { name: 'Galaxy Brain', bg: '#1d1450', pal: { p: '#ff8fc8', d: '#e05aa0', w: '#ffffff' }, map: ['.w....w.', '..pppp..', '.pppppp.', '.ppdppp.', '.pppdpp.', '..pppp..', '........', 'w.....w.'] },
      yolo: { name: 'YOLO', bg: '#ff5d3a', pal: { w: '#ffffff' }, map: ['...ww...', '...ww...', '...ww...', '...ww...', '........', '...ww...', '...ww...', '........'] },
      pair: { name: 'Pair Extraordinaire', bg: '#2fbf71', pal: { p: '#ff4f8b', l: '#ffb3cf' }, map: ['........', '.pp.pp..', 'plppppp.', 'ppppppp.', '.ppppp..', '..ppp...', '...p....', '........'] },
      arctic: { name: 'Arctic Code Vault Contributor', bg: '#1d4f9a', pal: { w: '#ffffff', b: '#9fe3ff' }, map: ['...w....', '.w.w.w..', '..www...', 'wwwbwww.', '..www...', '.w.w.w..', '...w....', '........'] },
      sponsor: { name: 'Public Sponsor', bg: '#ea4aaa', pal: { w: '#ffffff', l: '#ffd6ee' }, map: ['........', '.ww.ww..', 'wlwwwww.', 'wwwwwww.', '.wwwww..', '..www...', '...w....', '........'] },
      heart: { name: 'Heart On Your Sleeve', bg: '#ffd23f', pal: { r: '#ff3b5c', l: '#ff9bb0' }, map: ['........', '.rr.rr..', 'rlrrrrr.', 'rrrrrrr.', '.rrrrr..', '..rrr...', '...r....', '........'] },
      oss: { name: 'Open Sourcerer', bg: '#4b2fbf', pal: { y: '#ffd23f', p: '#b28bff' }, map: ['....y...', '...pp...', '..ppp...', '..pyp...', '.ppppp..', '.ppppp..', 'yyyyyyy.', '........'] },
      mars: { name: 'Mars 2020 Contributor', bg: '#2a1450', pal: { o: '#ff6a3d', d: '#c43c1c', w: '#ffffff' }, map: ['.......w', '..oooo..', '.oodooo.', '.oooooo.', '.ooodoo.', '.oooooo.', '..oooo..', 'w.......'] },
      medal: { name: 'Achievement', bg: '#8a5cff', pal: { b: '#ff4f8b', y: '#ffd23f', d: '#e0a800' }, map: ['.b....b.', '..b..b..', '...bb...', '..yyyy..', '.yyddyy.', '.yyddyy.', '..yyyy..', '........'] },
    },
  };
})();
