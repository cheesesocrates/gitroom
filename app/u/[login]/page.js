import { notFound } from 'next/navigation';
import Engine from '@/app/components/Engine';
import Chrome from '@/app/components/Chrome';

const VALID = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export async function generateMetadata({ params }) {
  const { login } = await params;
  if (!VALID.test(login)) return { title: 'GitRoom' };
  return {
    title: `@${login}'s house · GitRoom`,
    description: `A pixel-art house built from @${login}'s GitHub: one room per repo, frameworks as residents, furniture unlocked by commits.`,
  };
}

const BGS = [['white', 'White', '#ffffff'], ['cream', 'Cream', '#fff4dc'], ['lawn', 'Lawn', '#5cc23c'], ['night', 'Night', '#1d1450']];
const SHOW = [['stats', 'Stats'], ['langs', 'Languages'], ['badges', 'Badges'], ['roster', 'Residents'], ['fans', 'Fan crowd'], ['tags', 'Name tags'], ['pose', 'Everyone busy']];

// The markup is static; public/engine/house.js fills it in once @login's profile arrives from /api/house.
export default async function House({ params }) {
  const { login } = await params;
  if (!VALID.test(login)) notFound();
  return (
    <>
      <section id="room">
        <header className="room-bar">
          <a className="btn" href="/" id="back-btn" aria-label="Back to start"><span aria-hidden="true">←</span><span className="pixel">New house</span></a>
          <div className="plaque profile">
            <canvas className="px identicon" id="identicon" width="10" height="10" aria-hidden="true" />
            <div className="who">
              <div className="who-top"><span className="handle" id="handle">{`@${login}`}</span><span className="top-badge" id="chip" /></div>
              <small id="sub">Reading GitHub…</small>
            </div>
            <div className="stats" id="stats" />
          </div>
          <button className="btn hot" type="button" id="share-btn"><span aria-hidden="true">▶</span><span className="pixel">Share</span></button>
          <button className="btn theme-btn" type="button" data-theme-toggle aria-label="Switch day or night colours">
            <span className="sun" aria-hidden="true">☀</span><span className="moon" aria-hidden="true">☾</span>
          </button>
        </header>
        <div className="room-main">
          <aside className="plaque side" aria-label="Rooms and residents">
            <section>
              <h2><span>Rooms</span><span>by commits</span></h2>
              <div className="vis" id="vis" hidden>
                <div className="seg" role="group" aria-label="Which repos to show">
                  <button type="button" data-vis="public" aria-pressed="true">Public</button>
                  <button type="button" data-vis="all" id="vis-all" aria-pressed="false">+ Private</button>
                </div>
              </div>
              <div className="langbar" id="langbar" />
              <div className="langkey" id="langkey" />
              <ul className="rooms" id="room-list" />
              <div className="bonus-wrap" id="bonus-wrap" hidden>
                <h3>Bonus rooms</h3>
                <div className="bonus-list" id="bonus-list" />
              </div>
              <p className="attic" id="attic" />
              <p className="owner-note" id="owner-note" hidden />
            </section>
            <section>
              <h2><span>Residents</span><span id="res-count" /></h2>
              <div className="residents" id="resident-list" />
              <p className="ai-note">Tinted chips are AI helpers found in the code; they roam every room. <a href="/avatars">Meet the whole cast</a></p>
            </section>
          </aside>
          <div className="stage" id="stage">
            <div id="cam">
              <canvas className="px" id="gl" width="8" height="8" aria-hidden="true" />
              <canvas className="px" id="ov" width="8" height="8" role="img" aria-label={`Pixel-art house built from @${login}'s GitHub repos, with residents walking around and using the furniture`} />
            </div>
            <div className="stage-ui">
              <span className="hint" id="hint">Tap a room · scroll or pinch to zoom</span>
              <div className="right">
                <div className="zoom" role="group" aria-label="Zoom">
                  <button className="btn" type="button" id="zoom-out" aria-label="Zoom out">−</button>
                  <button className="btn" type="button" id="zoom-in" aria-label="Zoom in">+</button>
                </div>
                <button className="btn" type="button" id="custom-btn" aria-label="Customize"><span aria-hidden="true">✎</span><span className="pixel">Customize</span></button>
                <button className="btn" type="button" id="shuffle-btn" aria-label="New layout"><span aria-hidden="true">⚄</span><span className="pixel">New layout</span></button>
                <button className="btn" type="button" id="overview-btn" aria-label="Whole house" hidden><span aria-hidden="true">⤢</span><span className="pixel">Whole house</span></button>
              </div>
            </div>
            <div className="stage-msg" id="stage-msg" data-kind="loading">
              <div className="plaque msg-card">
                <div className="loader-bar"><div className="loader-fill waiting" /></div>
                <p className="msg-text" aria-live="polite">{`Reading @${login}'s repos…`}</p>
                <a className="btn" href="/" data-err="">Try another username</a>
              </div>
            </div>
            <div className="tip" id="tip" hidden />
          </div>
        </div>
      </section>

      <div className="modal" id="story-modal" hidden role="dialog" aria-modal="true" aria-labelledby="story-title">
        <div className="plaque modal-card share wide-card">
          <div className="modal-head"><h2 id="story-title">Share your house</h2><button className="btn" type="button" data-close="">Close</button></div>
          <div className="share-grid">
            <div className="story-wrap" id="story-wrap">
              <img id="story-img" alt="" data-fmt="story" />
              <video id="story-vid" data-fmt="story" muted loop playsInline autoPlay hidden aria-label="15-second video of the house" />
            </div>
            <div className="share-side">
              <div className="fmt">
                <div className="seg" role="group" aria-label="Picture or video">
                  <button type="button" data-share-kind="image" aria-pressed="true">Picture</button>
                  <button type="button" data-share-kind="video" aria-pressed="false">15s video</button>
                </div>
              </div>
              <div className="rec-row" id="rec-row" hidden>
                <button className="btn hot" type="button" id="rec-btn"><span aria-hidden="true">●</span><span className="pixel">Make 15s video</span></button>
                <div className="rec-bar" aria-hidden="true"><i id="rec-fill" /></div>
              </div>
              <div className="fmt">
                <div className="seg" role="group" aria-label="Image format">
                  <button type="button" data-fmt-btn="story" aria-pressed="true">Story</button>
                  <button type="button" data-fmt-btn="square" aria-pressed="false">Square</button>
                  <button type="button" data-fmt-btn="wide" aria-pressed="false">Desktop</button>
                </div>
              </div>
              <h3>Background</h3>
              <div className="swatches" role="group" aria-label="Background">
                {BGS.map(([id, name, c]) => <button key={id} type="button" data-bg={id} aria-pressed="false"><i style={{ background: c }} />{name}</button>)}
              </div>
              <h3>Lighting</h3>
              <div className="fmt">
                <div className="seg" role="group" aria-label="Lighting in the picture">
                  <button type="button" data-slight="house" aria-pressed="true">As is</button>
                  <button type="button" data-slight="day" aria-pressed="false">Day</button>
                  <button type="button" data-slight="sunset" aria-pressed="false">Sunset</button>
                  <button type="button" data-slight="night" aria-pressed="false">Night</button>
                </div>
              </div>
              <h3>Show</h3>
              <div className="checks">
                {SHOW.map(([id, name]) => <label key={id} className="check"><input type="checkbox" data-show={id} defaultChecked /> {name}</label>)}
              </div>
              <div className="field-row"><label htmlFor="s-caption">Caption</label><input id="s-caption" type="text" maxLength={40} placeholder="Shipped all year!" autoComplete="off" /></div>
              <p id="story-note">1080 × 1920 for Instagram and WhatsApp stories.</p>
              <div className="row">
                <a className="btn hot" id="save-btn" download="gitroom.png"><span className="pixel">Save PNG</span></a>
                <button className="btn" type="button" id="native-share-btn" hidden><span className="pixel">Share…</span></button>
                <button className="btn" type="button" id="copy-btn"><span className="pixel">Copy image</span></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="modal" id="custom-modal" hidden role="dialog" aria-modal="true" aria-labelledby="custom-title">
        <div className="plaque modal-card share">
          <div className="modal-head"><h2 id="custom-title">Make it yours</h2><button className="btn" type="button" data-close="">Done</button></div>
          <p id="c-who" />
          <p id="c-days" />
          <div className="field-row"><label htmlFor="c-name">House name</label><input id="c-name" type="text" maxLength={18} autoComplete="off" spellCheck={false} /></div>
          <h3>Wallpaper</h3>
          <div className="opts" id="c-papers" />
          <h3>Pet</h3>
          <div className="opts" id="c-pets" />
          <h3>Lighting</h3>
          <div className="fmt">
            <div className="seg" role="group" aria-label="Lighting">
              <button type="button" data-light="auto" aria-pressed="true">Auto</button>
              <button type="button" data-light="day" aria-pressed="false">Day</button>
              <button type="button" data-light="sunset" aria-pressed="false">Sunset</button>
              <button type="button" data-light="night" aria-pressed="false">Night</button>
            </div>
          </div>
          <label className="check"><input type="checkbox" id="c-tags" defaultChecked /> Show name tags</label>
          <div className="owner-tools" id="owner-tools" hidden>
            <h3>Floor plan</h3>
            <label className="check"><input type="checkbox" id="c-keep" /> Keep this floor plan (press New layout until you like one)</label>
            <h3><span>Rooms</span> <span id="c-room-count" /></h3>
            <div className="pick-list" id="c-rooms" />
            <button className="chipbtn" type="button" id="c-rooms-auto">Use my 10 busiest repos</button>
            <h3>Bonus rooms</h3>
            <div className="pick-list" id="c-bonus" />
            <h3>Residents</h3>
            <p>Remove anyone the detector got wrong, or add who&apos;s missing.</p>
            <div className="fixes" id="c-fixes" />
            <div className="row sticky-save"><button className="btn hot" type="button" id="c-save" disabled>Saved</button></div>
          </div>
        </div>
      </div>

      <Chrome />
      <Engine page="house" args={{ login }} />
    </>
  );
}
