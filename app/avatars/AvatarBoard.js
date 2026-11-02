'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadEngine } from '@/app/components/Engine';

// Floors to judge the sprites on: the house's wood and wallpaper tones, plus the white outside.
const FLOORS = { wood: ['#f3d9b1', '#e9c896'], seafoam: ['#5fe0cb', '#1fb5a1'], midnight: ['#4a5cb0', '#2b3a7a'], white: ['#ffffff', '#f2f2f2'] };
const KINDS = { framework: 'Hand-drawn', placeholder: 'Placeholder', language: 'Language', ai: 'AI helper', pet: 'Pet', visitor: 'Visitor' };
const FILTERS = [['all', 'All'], ['framework', 'Hand-drawn'], ['placeholder', 'Placeholders'], ['language', 'Languages'], ['ai', 'AI helpers'], ['pet', 'Pets'], ['visitor', 'Fans']];
const ORDER = { framework: 0, ai: 1, placeholder: 2, language: 3, pet: 4, visitor: 5 };

export default function AvatarBoard({ rules, extras, langs, initialFlags, canSave }) {
  const [cast, setCast] = useState(null);
  const [failed, setFailed] = useState('');
  const [flags, setFlags] = useState(initialFlags);
  const [filter, setFilter] = useState('all');
  const [floor, setFloor] = useState('wood');
  const [motion, setMotion] = useState('walk');
  const [status, setStatus] = useState('');
  const views = useRef(new Map());
  const logo = useRef(null);

  useEffect(() => {
    loadEngine('avatars').then(() => {
      const PX = window.PX;
      document.documentElement.style.setProperty('--grass-day', `url(${PX.grassTile(false)})`);
      document.documentElement.style.setProperty('--grass-night', `url(${PX.grassTile(true)})`);
      if (logo.current) PX.drawMap(logo.current, PX.LOGO, PX.LOGO_PAL);
      [...extras, ...langs].forEach(m => PX.placeholder(m.id, m));
      const S = PX.SPR;
      const list = Object.keys(S).map(id => {
        const s = S[id];
        const kind = s.pet ? 'pet' : s.npc ? 'visitor' : s.lang ? 'language' : rules[id] && rules[id].ai ? 'ai' : s.placeholder ? 'placeholder' : 'framework';
        const how = s.pet ? ['picked by the owner in Edit house'] : s.npc ? ['one cheering fan per follower, outside the house']
          : s.lang ? [`a repo written in ${s.name} that nothing else lives in`] : rules[id] ? rules[id].how : ['no detection rule yet'];
        return { id, name: s.name, quotes: s.q || [], kind, how };
      });
      list.sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || a.name.localeCompare(b.name));
      setCast(list);
    }).catch(e => setFailed(e.message));
  }, [rules, extras, langs]);

  // one loop animates every canvas on the page
  useEffect(() => {
    if (!cast) return undefined;
    let raf = 0, last = performance.now(), t = 0;
    const state = {}, [a, b] = FLOORS[floor];
    const tick = now => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(.05, (now - last) / 1000);
      last = now; t += dt;
      views.current.forEach(({ id, cv, size }) => {
        const s = window.PX.SPR[id];
        if (!s || !cv) return;
        const st = state[id] || (state[id] = { blink: 0, blinkT: 1 + Math.random() * 4, phase: Math.random() * 3 });
        if (size === 'view') { if (st.blink > 0) st.blink -= dt / 2; else if ((st.blinkT -= dt / 2) <= 0) { st.blink = .14; st.blinkT = 2 + Math.random() * 3.5; } }
        const walking = motion === 'walk', p = t + st.phase;
        let k = st.blink > 0 ? 'blink' : 'stand';
        if ((walking && Math.floor(p / .17) % 2) || (!walking && s.float && Math.floor(p / .55) % 2)) k = 'step';
        const frame = s.frames[k + (walking && Math.floor(p / 2.5) % 2 ? 'F' : '')];
        const x = cv.getContext('2d');
        x.imageSmoothingEnabled = false;
        if (size === 'view') {
          // checker floor, the same soft shadow as in the house, feet planted on row 17
          for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { x.fillStyle = (i + j) % 2 ? b : a; x.fillRect(i * 5, j * 5, 5, 5); }
          x.fillStyle = 'rgba(70,22,4,.34)'; x.fillRect(7, 16, 6, 1); x.fillRect(5, 17, 10, 1); x.fillRect(7, 18, 6, 1);
          x.drawImage(frame, 2, 17 - s.bottom);
        } else {
          x.fillStyle = a; x.fillRect(0, 0, cv.width, cv.height);
          x.drawImage(frame, 0, 0);
        }
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cast, motion, floor]);

  const register = useCallback((key, id, size) => el => {
    if (el) {
      views.current.set(key, { id, cv: el, size });
      if (size === 'pill') { const p = window.PX.SPR[id].pill; el.width = p.width; el.height = p.height; el.style.width = p.width * 2 + 'px'; el.style.height = p.height * 2 + 'px'; el.getContext('2d').drawImage(p, 0, 0); views.current.delete(key); }
    } else views.current.delete(key);
  }, []);

  const save = useCallback(async (id, remake, note) => {
    if (!canSave) return;
    const before = flags;
    setFlags(f => { const n = { ...f }; if (remake) n[id] = { ...(n[id] || {}), remake: true, note }; else delete n[id]; return n; });
    try {
      const res = await fetch('/api/avatars/flags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, remake, note }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Saving failed.');
      setFlags(data.flags || {});
      setStatus(remake ? `Marked ${id} for a remake.` : `Unmarked ${id}.`);
    } catch (e) {
      setFlags(before);
      setStatus(e.message);
    }
  }, [canSave, flags]);

  const flaggedIds = Object.keys(flags).filter(id => flags[id] && flags[id].remake);
  async function copyList() {
    const lines = flaggedIds.map(id => `- ${id}${flags[id].note ? `: ${flags[id].note}` : ''}`);
    const text = `GitRoom avatars to remake (${flaggedIds.length}):\n${lines.join('\n')}`;
    try { await navigator.clipboard.writeText(text); setStatus('List copied.'); } catch (e) { setStatus("Couldn't copy. The list is also in data/avatar-flags.json."); }
  }
  function toggleTheme() {
    const el = document.documentElement, dark = el.dataset.theme ? el.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    el.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('gitroom-theme', el.dataset.theme); } catch (e) { /* private mode */ }
  }

  const filters = canSave ? [...FILTERS, ['flagged', 'Marked']] : FILTERS;
  const shown = (cast || []).filter(c => filter === 'all' || (filter === 'flagged' ? flaggedIds.includes(c.id) : c.kind === filter));
  const count = k => (cast || []).filter(c => c.kind === k).length;

  return (
    <div className="cast-page grass">
      <header className="topbar">
        <a className="logo" href="/" aria-label="GitRoom home">
          <canvas className="px logo-mark" ref={logo} width="13" height="13" aria-hidden="true" />
          <span className="logo-word">GitRoom</span>
        </a>
        <div className="top-actions">
          <a className="btn" href="/"><span aria-hidden="true">←</span><span>Build a house</span></a>
          <button className="btn icon theme-btn" type="button" onClick={toggleTheme} aria-label="Switch day or night colours">
            <span className="sun" aria-hidden="true">☀</span><span className="moon" aria-hidden="true">☾</span>
          </button>
        </div>
      </header>
      <section className="plaque cast-head">
        <h1>The cast</h1>
        <p>
          Everyone who can move into a GitRoom house, all 16 × 16 pixels, and how GitRoom spots them in a repo. Frameworks without a
          hand-drawn sprite still move in as placeholders made from their name and brand colour, and a repo that nothing else lives in
          gets a creature for its language.
          {canSave ? ' Mark any that need redrawing and say what to change. Marks save to data/avatar-flags.json.' : ''}
        </p>
        <div className="cast-tools">
          <div className="seg" role="group" aria-label="Show">
            {filters.map(([k, label]) => (
              <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>
                {label}{k === 'flagged' ? ` (${flaggedIds.length})` : ''}
              </button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="Floor">
            {Object.keys(FLOORS).map(f => <button key={f} type="button" aria-pressed={floor === f} onClick={() => setFloor(f)}>{f[0].toUpperCase() + f.slice(1)}</button>)}
          </div>
          <div className="seg" role="group" aria-label="Motion">
            <button type="button" aria-pressed={motion === 'walk'} onClick={() => setMotion('walk')}>Walk</button>
            <button type="button" aria-pressed={motion === 'idle'} onClick={() => setMotion('idle')}>Idle</button>
          </div>
        </div>
        <div className="cast-summary" aria-live="polite">
          {cast && <span>{cast.length} residents: {count('framework')} hand-drawn, {count('ai')} AI helpers, {count('placeholder')} placeholders, {count('language')} languages, {count('pet')} pets and {count('visitor')} kinds of fan.</span>}
          {canSave && <span><b>{flaggedIds.length}</b> marked for a remake.</span>}
          {canSave && flaggedIds.length > 0 && <button className="chipbtn" type="button" onClick={copyList}>Copy list</button>}
          {status && <span>{status}</span>}
        </div>
      </section>
      {failed && <p className="plaque cast-empty">{failed}</p>}
      {!cast && !failed && <p className="plaque cast-empty">Waking everyone up…</p>}
      {cast && !shown.length && <p className="plaque cast-empty">Nothing here yet.</p>}
      <div className="cast-grid">
        {shown.map(c => {
          const flag = flags[c.id];
          return (
            <article key={c.id} className={`plaque cast-card${flag ? ' flagged' : ''}`}>
              <div className="cast-top">
                <canvas className="px cast-view" width={20} height={20} ref={register(`${c.id}:view`, c.id, 'view')} aria-label={`${c.name} sprite`} role="img" />
                <div className="cast-mini">
                  <h2>{c.name}</h2>
                  <span className="id">{c.id}</span>
                  <span className={`cast-kind ${c.kind}`}>{KINDS[c.kind]}</span>
                  <div className="cast-sizes" aria-hidden="true">
                    <canvas className="px" width={16} height={16} style={{ width: 16, height: 16 }} ref={register(`${c.id}:1`, c.id, 'small')} />
                    <canvas className="px" width={16} height={16} style={{ width: 32, height: 32 }} ref={register(`${c.id}:2`, c.id, 'small')} />
                    <canvas className="px" ref={register(`${c.id}:pill`, c.id, 'pill')} />
                  </div>
                </div>
              </div>
              <ul className="cast-how">{c.how.map(h => <li key={h}>{h}</li>)}</ul>
              <div className="cast-quotes">{c.quotes.slice(0, 3).map(q => <span key={q}>{q}</span>)}</div>
              {canSave && (
                <div className="cast-flag">
                  <button className="btn" type="button" aria-pressed={!!flag} onClick={() => save(c.id, !flag, '')}>
                    {flag ? '✓ Marked for remake' : 'Needs remake'}
                  </button>
                  {flag && (
                    <>
                      <textarea
                        aria-label={`What should change about ${c.name}?`}
                        placeholder="What should change? (optional)"
                        defaultValue={flag.note || ''}
                        maxLength={300}
                        onBlur={e => { if (e.target.value !== (flag.note || '')) save(c.id, true, e.target.value); }}
                      />
                      <small>Saves when you click away.</small>
                    </>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
