/* GitRoom landing: residents wandering the lawn, the username form, featured houses and "Connect GitHub". */
(() => {
  const { SPR, canvas, bubble, drawMap } = window.PX;
  const $ = s => document.querySelector(s);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  let lawnBg, wipe, toastEl, busy = false, critters = [];

  const darkNow = () => { const t = document.documentElement.dataset.theme; return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches; };
  let toastT;
  function toast(m) { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 4200); }
  const cleanName = raw => String(raw || '').trim().replace(/^@/, '').replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '').replace(/[/?#].*$/, '');

  // ---------- critters: they wander the lawn behind everything, keeping clear of the hero ----------
  function avoid() { return [...document.querySelectorAll('.hero-copy, .hero-shot, .topbar')].map(el => el.getBoundingClientRect()); }
  function spot(w, h) {
    const W = window.innerWidth, Ht = window.innerHeight, rs = avoid();
    for (let i = 0; i < 40; i++) {
      const x = rand(8, W - w - 8), y = rand(70, Ht - h - 8);
      if (!rs.some(c => x < c.right + 12 && x + w > c.left - 12 && y < c.bottom + 12 && y + h > c.top - 12)) return [x, y];
    }
    return [rand(8, W - w - 8), rand(70, Ht - h - 8)];
  }
  function cast(n) {
    // a different mix every visit, always with one AI helper and one pet
    const ids = Object.keys(SPR), pets = ids.filter(id => SPR[id].pet), ai = ['claude', 'chatgpt', 'gemini', 'copilot', 'cursor'].filter(id => SPR[id]);
    const rest = ids.filter(id => !SPR[id].pet && !SPR[id].npc && !ai.includes(id)).sort(() => Math.random() - .5);
    return [pick(ai), pick(pets), ...rest].slice(0, n).sort(() => Math.random() - .5);
  }
  function buildCritters() {
    critters.forEach(c => { c.tw && c.tw.kill(); c.dc && c.dc.kill(); c.el.remove(); });
    const small = window.innerWidth < 700, k = small ? 3 : 4;
    critters = cast(small ? 5 : 9).map(id => {
      const s = SPR[id], cw = Math.max(16, s.pill.width) + 2, ch = 27, el = document.createElement('div'), cv = canvas(cw, ch);
      el.className = 'critter'; cv.className = 'px'; el.style.width = cw * k + 'px'; el.style.height = ch * k + 'px';
      el.appendChild(cv); lawnBg.appendChild(el);
      const c = { s, el, cv, k, cw, ch, x: 0, y: 0, facing: 1, moving: false, anim: rand(0, 1), blink: 0, blinkT: rand(1, 4), say: null };
      [c.x, c.y] = spot(cw * k, ch * k);
      gsap.set(el, { x: c.x, y: c.y });
      if (!reduce) wander(c, rand(0, 1.2));
      return c;
    });
  }
  function wander(c, delay) {
    c.dc = gsap.delayedCall(delay, () => {
      if (c.gone) return;
      const [tx, ty] = spot(c.cw * c.k, c.ch * c.k), dx = tx - c.x, dy = ty - c.y, len = Math.min(1, 200 / (Math.hypot(dx, dy) || 1)), nx = c.x + dx * len, ny = c.y + dy * len;
      c.facing = nx < c.x ? -1 : 1; c.moving = true;
      c.tw = gsap.to(c, { x: nx, y: ny, duration: Math.max(.8, Math.hypot(nx - c.x, ny - c.y) / 55), ease: 'none', onUpdate: () => gsap.set(c.el, { x: Math.round(c.x), y: Math.round(c.y) }), onComplete: () => { c.moving = false; if (Math.random() < .25) c.say = { c: bubble(pick(c.s.q)), t: 2.2 }; wander(c, rand(.8, 3)); } });
    });
  }
  function drawCritters(dt) {
    critters.forEach(c => {
      c.anim += dt;
      if (c.blink > 0) c.blink -= dt; else if ((c.blinkT -= dt) <= 0) { c.blink = .14; c.blinkT = rand(2, 5); }
      if (c.say && (c.say.t -= dt) <= 0) c.say = null;
      const x = c.cv.getContext('2d'), off = 11 - (15 - c.s.bottom);
      let key = c.blink > 0 ? 'blink' : 'stand';
      if (!reduce && (c.moving || c.s.float) && Math.floor(c.anim / (c.moving ? .17 : .55)) % 2) key = 'step';
      x.clearRect(0, 0, c.cw, c.ch);
      x.drawImage(c.s.frames[key + (c.facing < 0 ? 'F' : '')], Math.round((c.cw - 16) / 2), off);
      const tagY = Math.max(0, off + c.s.top - 10);
      if (c.say) x.drawImage(c.say.c, Math.round((c.cw - c.say.c.width) / 2), Math.max(0, tagY - 1)); else x.drawImage(c.s.pill, Math.round((c.cw - c.s.pill.width) / 2), tagY);
    });
  }
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (document.hidden) return;
    try { drawCritters(dt); } catch (err) { if (window.console) console.error(err); }
  }

  // ---------- pixel art for the "how it works" tiles ----------
  function couch(x) {
    const P = { o: '#24163b', r: '#ff4f8b', l: '#ff8fb5', d: '#c43c6e', w: '#8a5a3b' };
    ['................', '................', '................', '................', '..oooooooooooo..', '.orrrrrrrrrrrro.', '.orllllllllllro.', 'oorrrrrrrrrrrroo', 'orroooooooooorro', 'orrlllllllllllro', 'orrrrrrrrrrrrrro', 'oddddddddddddddo', '.oooooooooooooo.', '.ow..........wo.', '.oo..........oo.', '................']
      .forEach((row, j) => { for (let i = 0; i < 16; i++) if (P[row[i]]) { x.fillStyle = P[row[i]]; x.fillRect(i, j, 1, 1); } });
  }
  function drawHowArt() {
    document.querySelectorAll('.how-art').forEach(cv => {
      const x = cv.getContext('2d'), art = cv.dataset.art;
      x.clearRect(0, 0, 16, 16);
      if (art === 'room') { const c = canvas(13, 13); drawMap(c, window.PX.LOGO, window.PX.LOGO_PAL); x.drawImage(c, 1, 2); }
      else if (art === 'couch') couch(x);
      else if (SPR[art]) x.drawImage(SPR[art].frames.stand, 0, 0);
    });
  }

  // ---------- building a house ----------
  function fieldError(el, msg) { el.textContent = msg || ''; el.hidden = !msg; }
  function setLoading(on) {
    $('#build-form').hidden = on; $('#sample-row').hidden = on; $('#loader').hidden = !on;
    if (!on) gsap.set('#loader-fill', { width: '0%' });
  }
  function go(href, from) {
    const r = from.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    try { sessionStorage.setItem('gitroom-wipe', '1'); } catch (e) {}
    if (reduce) { location.href = href; return; }
    gsap.fromTo(wipe, { clipPath: `circle(0% at ${cx}px ${cy}px)` }, { clipPath: `circle(150% at ${cx}px ${cy}px)`, duration: .6, ease: 'power3.in', onComplete: () => { location.href = href; } });
  }
  async function build(raw) {
    if (busy) return;
    const name = cleanName(raw), err = $('#form-error');
    if (!window.GitRoomData.VALID_LOGIN.test(name)) { fieldError(err, name ? "That doesn't look like a GitHub username." : 'Type a GitHub username first.'); $('#username').focus(); return; }
    busy = true; fieldError(err, '');
    const text = $('#loader-text'), fill = $('#loader-fill');
    setLoading(true);
    let rooms = 0;
    const setFill = p => gsap.to(fill, { width: p + '%', duration: .3, ease: 'steps(6)' });
    const step = (s, n) => {
      if (s === 'server') { text.textContent = `Knocking on @${name}'s door…`; setFill(20); }
      else if (s === 'browser') { text.textContent = 'Reading GitHub straight from your browser…'; setFill(25); }
      else if (s === 'repos') { text.textContent = 'Counting the repos…'; setFill(35); }
      else if (s === 'rooms') { rooms = n; text.textContent = `Measuring ${n} rooms…`; setFill(45); }
      else if (s === 'room') { text.textContent = `Furnishing room ${n} of ${rooms}…`; setFill(45 + 50 * n / Math.max(1, rooms)); }
    };
    step('server');
    let res;
    try {
      res = await window.GitRoomData.loadHouse(name, { step, rooms: window.GitRoomData.loadSettings(name).then(o => (o.settings && o.settings.rooms) || []).catch(() => []) });
    } catch (e) {
      busy = false; setLoading(false);
      const mins = e.reset ? Math.max(1, Math.ceil((e.reset - Date.now()) / 60000)) : 0;
      fieldError(err, e.code === 'rate' ? `GitHub needs a breather on this network. Try again in ${mins || 'a few'} minute${mins === 1 ? '' : 's'}, or drop by a featured house.` : e.message || "Couldn't reach GitHub. Check your connection and try again.");
      $('#username').focus();
      return;
    }
    const p = res.profile, ai = [...new Set(p.repos.flatMap(r => r.ai))].filter(id => SPR[id]).map(id => SPR[id].name);
    text.textContent = ai.length ? `AI traces found: ${ai.join(', ')}!` : 'Lighting the lamps…';
    gsap.to(fill, { width: '100%', duration: .25 });
    if (!reduce) {
      critters.forEach(cr => { cr.gone = true; cr.tw && cr.tw.kill(); cr.dc && cr.dc.kill(); });
      const c = $('#hero-card').getBoundingClientRect();
      gsap.to(critters.map(cr => cr.el), { x: c.left + c.width / 2 - 40, y: c.top + c.height / 2 - 40, scale: .2, opacity: 0, stagger: .04, duration: .5, ease: 'back.in(1.5)' });
    }
    setTimeout(() => go('/u/' + encodeURIComponent(p.handle), $('#loader')), reduce ? 200 : 650);
  }

  // ---------- intro ----------
  function intro() {
    if (reduce) return;
    gsap.timeline()
      .from('.headline .line', { yPercent: 70, opacity: 0, rotate: 3, stagger: .12, duration: .6, ease: 'back.out(1.8)' })
      .from('.hl', { scale: .5, rotate: -8, transformOrigin: '50% 70%', duration: .9, ease: 'elastic.out(1, .45)' }, '-=.3')
      .fromTo('#scribble', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: .5, ease: 'steps(13)' }, '-=.5')
      .from(['.eyebrow', '.lede', '.field', '.try'], { y: 18, opacity: 0, stagger: .06, duration: .45, ease: 'power3.out' }, '-=.9')
      .from('.hero-shot', { y: 30, rotate: 2, scale: .96, opacity: 0, duration: .7, ease: 'back.out(1.4)' }, '-=.7')
      .from('.critter', { scale: 0, opacity: 0, stagger: .07, duration: .5, ease: 'back.out(2.4)' }, '-=.5');
    // the rest of the page rises in as it scrolls into view
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => entries.forEach(en => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        gsap.fromTo(en.target.children, { y: 24, opacity: 0 }, { y: 0, opacity: 1, stagger: .06, duration: .5, ease: 'power3.out', clearProps: 'transform,opacity' });
      }), { rootMargin: '0px 0px -10% 0px' });
      document.querySelectorAll('.how, .cards, .connect').forEach(el => io.observe(el));
    }
  }
  function reveal() {
    if (!wipe.classList.contains('cover')) return false;
    if (reduce) { wipe.classList.remove('cover'); return true; }
    gsap.fromTo(wipe, { clipPath: 'circle(150% at 50% 50%)' }, { clipPath: 'circle(0% at 50% 50%)', duration: .65, ease: 'power3.inOut', onComplete: () => { wipe.classList.remove('cover'); gsap.set(wipe, { clearProps: 'clipPath' }); } });
    return true;
  }

  let started = false;
  window.GitRoomLanding = {
    mount() {
      if (started) return;
      started = true;
      lawnBg = $('#lawn-bg'); wipe = $('#wipe'); toastEl = $('#toast');
      document.documentElement.style.setProperty('--grass-day', `url(${window.PX.grassTile(false)})`);
      document.documentElement.style.setProperty('--grass-night', `url(${window.PX.grassTile(true)})`);
      drawMap($('#logo-mark'), window.PX.LOGO, window.PX.LOGO_PAL);
      drawHowArt();
      const sx = $('#scribble').getContext('2d'), z = [3, 2, 1, 0, 0, 1, 2, 3];
      for (let i = 0; i < 52; i++) { sx.fillStyle = '#ffc83a'; sx.fillRect(i, z[i % 8], 1, 1); sx.fillStyle = '#e8950c'; sx.fillRect(i, z[i % 8] + 1, 1, 1); }
      document.querySelectorAll('[data-theme-toggle]').forEach(b => b.addEventListener('click', () => {
        const next = darkNow() ? 'light' : 'dark';
        document.documentElement.dataset.theme = next; store.set('gitroom-theme', next);
      }));
      $('#build-form').addEventListener('submit', e => { e.preventDefault(); build($('#username').value); });
      $('#username').addEventListener('input', () => fieldError($('#form-error'), ''));
      document.querySelectorAll('[data-profile]').forEach(b => b.addEventListener('click', () => { $('#username').value = b.dataset.profile; build(b.dataset.profile); }));
      // Connect GitHub: the house page walks the owner through it
      $('#connect-form').addEventListener('submit', e => {
        e.preventDefault();
        const name = cleanName($('#connect-user').value), err = $('#connect-error');
        if (!window.GitRoomData.VALID_LOGIN.test(name)) { fieldError(err, name ? "That doesn't look like a GitHub username." : 'Type your GitHub username first.'); $('#connect-user').focus(); return; }
        fieldError(err, '');
        go(`/u/${encodeURIComponent(name)}?connect=1`, $('#connect-form .gh-submit'));
      });
      $('#connect-user').addEventListener('input', () => fieldError($('#connect-error'), ''));
      $('#top-connect').addEventListener('click', e => {
        e.preventDefault();
        $('#connect').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        setTimeout(() => $('#connect-user').focus({ preventScroll: true }), reduce ? 0 : 450);
      });
      // a house picture that hasn't been made yet just shows its frame
      document.querySelectorAll('.card-shot img, .shot-frame img').forEach(img => { const off = () => img.classList.add('missing'); if (img.complete && !img.naturalWidth) off(); else img.addEventListener('error', off); });
      window.addEventListener('pageshow', e => { if (e.persisted) { busy = false; setLoading(false); buildCritters(); gsap.set(wipe, { clearProps: 'clipPath' }); } });
      // phones fire resize while scrolling (the address bar comes and goes), so only a new width respawns the critters
      let rz, lastW = window.innerWidth;
      window.addEventListener('resize', () => { if (Math.abs(window.innerWidth - lastW) < 40) return; lastW = window.innerWidth; clearTimeout(rz); rz = setTimeout(buildCritters, 400); });
      buildCritters();
      requestAnimationFrame(t => { last = t; requestAnimationFrame(loop); });
      if (!reveal()) intro();
    },
  };
})();
