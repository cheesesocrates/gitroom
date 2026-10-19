/* GitRoom landing: residents wandering the lawn, the username form, and GitHub sign-in. */
(() => {
  const { SPR, canvas, bubble } = window.PX;
  const $ = s => document.querySelector(s);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const VALID = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
  let card, lawnBg, wipe, toastEl, busy = false, critters = [];

  const darkNow = () => { const t = document.documentElement.dataset.theme; return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches; };
  let toastT;
  function toast(m) { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 4200); }

  // ---------- critters ----------
  function spot(w, h) {
    const W = window.innerWidth, Ht = window.innerHeight, c = card.getBoundingClientRect();
    for (let i = 0; i < 40; i++) { const x = rand(8, W - w - 8), y = rand(70, Ht - h - 8); if (!(x < c.right + 16 && x + w > c.left - 16 && y < c.bottom + 16 && y + h > c.top - 16)) return [x, y]; }
    return [rand(8, W - w - 8), rand(70, Ht - h - 8)];
  }
  function cast(n) {
    // a different mix every visit, always with one AI helper and one pet
    const ids = Object.keys(SPR), pets = ids.filter(id => SPR[id].pet), ai = ['claude', 'chatgpt', 'gemini', 'copilot', 'cursor'].filter(id => SPR[id]);
    const rest = ids.filter(id => !SPR[id].pet && !ai.includes(id)).sort(() => Math.random() - .5);
    return [pick(ai), pick(pets), ...rest].slice(0, n).sort(() => Math.random() - .5);
  }
  function buildCritters() {
    critters.forEach(c => { c.tw && c.tw.kill(); c.dc && c.dc.kill(); c.el.remove(); });
    const small = window.innerWidth < 640, k = small ? 4 : 5;
    critters = cast(small ? 6 : 10).map(id => {
      const s = SPR[id], cw = Math.max(16, s.pill.width) + 2, ch = 27, el = document.createElement('div'), cv = canvas(cw, ch);
      el.className = 'critter'; cv.className = 'px'; el.style.width = cw * k + 'px'; el.style.height = ch * k + 'px';
      el.appendChild(cv); lawnBg.appendChild(el);
      const c = { s, el, cv, k, cw, ch, x: 0, y: 0, facing: 1, moving: false, anim: rand(0, 1), blink: 0, blinkT: rand(1, 4), say: null };
      [c.x, c.y] = spot(cw * k, ch * k);
      gsap.set(el, { x: c.x, y: c.y });
      el.addEventListener('pointerenter', () => { if (!c.say) c.say = { c: bubble(pick(s.q)), t: 2 }; });
      if (!reduce) wander(c, rand(0, 1.2));
      return c;
    });
  }
  function wander(c, delay) {
    c.dc = gsap.delayedCall(delay, () => {
      if (c.gone) return;
      const [tx, ty] = spot(c.cw * c.k, c.ch * c.k), dx = tx - c.x, dy = ty - c.y, len = Math.min(1, 200 / (Math.hypot(dx, dy) || 1)), nx = c.x + dx * len, ny = c.y + dy * len;
      c.facing = nx < c.x ? -1 : 1; c.moving = true;
      c.tw = gsap.to(c, { x: nx, y: ny, duration: Math.max(.8, Math.hypot(nx - c.x, ny - c.y) / 55), ease: 'none', onUpdate: () => gsap.set(c.el, { x: Math.round(c.x), y: Math.round(c.y) }), onComplete: () => { c.moving = false; wander(c, rand(.8, 3)); } });
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
    try { drawCritters(dt); } catch (err) { if (window.console) console.error(err); }
  }

  // ---------- building a house ----------
  function fieldError(msg) {
    const el = $('#form-error');
    el.textContent = msg || '';
    el.hidden = !msg;
  }
  function setLoading(on) {
    $('#build-form').hidden = on; $('#sample-row').hidden = on; $('#loader').hidden = !on;
    if (!on) { $('#loader-fill').classList.remove('waiting'); gsap.set('#loader-fill', { width: '0%' }); }
  }
  async function build(raw) {
    if (busy) return;
    const name = String(raw || '').trim().replace(/^@/, '').replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '').replace(/[/?#].*$/, '');
    if (!VALID.test(name)) { fieldError(name ? "That doesn't look like a GitHub username." : 'Type a GitHub username first.'); $('#username').focus(); return; }
    busy = true; fieldError('');
    const btn = $('#build-btn').getBoundingClientRect(), cx = btn.left + btn.width / 2, cy = btn.top + btn.height / 2;
    const text = $('#loader-text'), fill = $('#loader-fill');
    setLoading(true);
    // while GitHub answers: a waiting bar and a few honest guesses at what's happening
    const waiting = [`Knocking on @${name}'s door…`, 'Counting pushes in every repo…', 'Reading package.json and requirements.txt…', 'Checking for CLAUDE.md and friends…', 'Still reading. Big profiles take a moment…'];
    let wi = 0;
    text.textContent = waiting[0];
    fill.classList.add('waiting');
    const cycle = setInterval(() => { wi = Math.min(waiting.length - 1, wi + 1); text.textContent = waiting[wi]; }, 1600);
    let data = null;
    try { data = await fetch('/api/house/' + encodeURIComponent(name)).then(r => r.json()); } catch (e) { data = null; }
    clearInterval(cycle);
    if (!data || !data.profile) {
      busy = false; setLoading(false);
      fieldError((data && data.error) || "Couldn't reach GitRoom. Check your connection and try again.");
      $('#username').focus();
      return;
    }
    const p = data.profile, pub = p.repos.filter(r => !r.private), names = [...new Set(pub.flatMap(r => r.ai))].filter(id => SPR[id]).map(id => SPR[id].name);
    const steps = [
      pub.length ? `Found ${pub.length} public repos. Measuring rooms…` : 'No public repos yet, so the bonus rooms are moving in…',
      p.cal.days ? `Weaving ${p.cal.days} commit days into a rug…` : `Hanging up ${p.followers} fan letters…`,
      names.length ? `AI traces found: ${names.join(', ')}` : 'Moving the residents in…',
      'Unlocking furniture, lighting the lamps…',
    ];
    const go = () => {
      try { sessionStorage.setItem('gitroom-wipe', '1'); } catch (e) {}
      const href = '/u/' + encodeURIComponent(p.handle);
      if (reduce) { location.href = href; return; }
      gsap.fromTo(wipe, { clipPath: `circle(0% at ${cx}px ${cy}px)` }, { clipPath: `circle(150% at ${cx}px ${cy}px)`, duration: .6, ease: 'power3.in', onComplete: () => { location.href = href; } });
    };
    fill.classList.remove('waiting');
    if (reduce) { text.textContent = steps[3]; fill.style.width = '100%'; setTimeout(go, 300); return; }
    const c = card.getBoundingClientRect();
    gsap.timeline({ onComplete: go })
      .fromTo(fill, { width: '35%' }, { width: '100%', duration: 1.6, ease: 'steps(10)' }, 0)
      .call(() => { text.textContent = steps[0]; }, null, 0).call(() => { text.textContent = steps[1]; }, null, .4)
      .call(() => { text.textContent = steps[2]; }, null, .85).call(() => { text.textContent = steps[3]; }, null, 1.3)
      .add(() => {
        critters.forEach(cr => { cr.gone = true; cr.tw && cr.tw.kill(); cr.dc && cr.dc.kill(); cr.moving = true; });
        gsap.to(critters.map(cr => cr.el), { x: c.left + c.width / 2 - 40, y: c.top + c.height / 2 - 40, scale: .2, opacity: 0, stagger: .05, duration: .6, ease: 'back.in(1.5)' });
      }, .8);
  }

  // ---------- sign-in ----------
  async function auth() {
    const me = await fetch('/api/auth/me', { cache: 'no-store' }).then(r => r.json()).catch(() => null);
    const row = $('#auth-row');
    if (!me || (!me.configured && !me.login)) { row.hidden = true; return; }
    if (me.login) {
      const who = encodeURIComponent(me.login);
      row.innerHTML = `<a class="chipbtn mine" href="/u/${who}"><span aria-hidden="true">★</span> Open my house</a><span>Signed in as @${me.login.replace(/[^\w-]/g, '')}${me.private ? ', private repos on' : ''}. <a href="/api/auth/logout">Sign out</a></span>`;
    } else {
      row.innerHTML = '<a class="chipbtn gh" href="/api/auth/login"><span aria-hidden="true">●</span> Sign in with GitHub</a><span>to fix up your own house for everyone. Private repos are opt-in and never show their names.</span>';
    }
    row.hidden = false;
  }
  const AUTH_MSG = {
    'not-configured': "GitHub sign-in isn't set up on this server yet. The README explains how.",
    expired: 'That sign-in took too long. Try again.',
    denied: "GitHub didn't let us in. Try again?",
  };

  // ---------- intro ----------
  function intro() {
    if (reduce) return;
    gsap.timeline()
      .from(card, { y: 40, scale: .94, opacity: 0, duration: .7, ease: 'back.out(1.6)' })
      .from('.headline .line', { yPercent: 70, opacity: 0, rotate: 3, stagger: .12, duration: .6, ease: 'back.out(1.8)' }, '-=.35')
      .from('.hl', { scale: .5, rotate: -8, transformOrigin: '50% 70%', duration: .9, ease: 'elastic.out(1, .45)' }, '-=.3')
      .fromTo('#scribble', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: .5, ease: 'steps(13)' }, '-=.5')
      .from(['.eyebrow', '.lede', '.field', '.sample', '.legend li'], { y: 18, opacity: 0, stagger: .06, duration: .45, ease: 'power3.out' }, '-=.9')
      .from('.critter', { scale: 0, opacity: 0, stagger: .07, duration: .5, ease: 'back.out(2.4)' }, '-=.6');
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
      card = $('#hero-card'); lawnBg = $('#lawn-bg'); wipe = $('#wipe'); toastEl = $('#toast');
      document.documentElement.style.setProperty('--grass-day', `url(${window.PX.grassTile(false)})`);
      document.documentElement.style.setProperty('--grass-night', `url(${window.PX.grassTile(true)})`);
      window.PX.drawMap($('#logo-mark'), window.PX.LOGO, window.PX.LOGO_PAL);
      const sx = $('#scribble').getContext('2d'), z = [3, 2, 1, 0, 0, 1, 2, 3];
      for (let i = 0; i < 52; i++) { sx.fillStyle = '#ffc83a'; sx.fillRect(i, z[i % 8], 1, 1); sx.fillStyle = '#e8950c'; sx.fillRect(i, z[i % 8] + 1, 1, 1); }
      document.querySelectorAll('[data-theme-toggle]').forEach(b => b.addEventListener('click', () => {
        const next = darkNow() ? 'light' : 'dark';
        document.documentElement.dataset.theme = next; store.set('gitroom-theme', next);
      }));
      $('#build-form').addEventListener('submit', e => { e.preventDefault(); build($('#username').value); });
      $('#username').addEventListener('input', () => fieldError(''));
      document.querySelectorAll('[data-profile]').forEach(b => b.addEventListener('click', () => { $('#username').value = b.dataset.profile; build(b.dataset.profile); }));
      window.addEventListener('pageshow', e => { if (e.persisted) { busy = false; setLoading(false); buildCritters(); gsap.set(wipe, { clearProps: 'clipPath' }); } });
      const q = new URLSearchParams(location.search).get('auth');
      if (q) { if (AUTH_MSG[q]) setTimeout(() => toast(AUTH_MSG[q]), 400); try { history.replaceState(null, '', location.pathname); } catch (e) {} }
      buildCritters();
      requestAnimationFrame(t => { last = t; requestAnimationFrame(loop); });
      if (!reveal()) intro();
      auth();
    },
  };
})();
