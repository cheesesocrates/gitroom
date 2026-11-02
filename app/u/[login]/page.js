import { notFound } from 'next/navigation';
import Engine from '@/app/components/Engine';
import Chrome from '@/app/components/Chrome';
import { GitHubMark, SearchIcon } from '@/app/components/Icons';

const VALID = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export async function generateMetadata({ params }) {
  const { login } = await params;
  if (!VALID.test(login)) return { title: 'GitRoom' };
  const title = `@${login}'s house · GitRoom`, description = `@${login}'s GitHub as a pixel-art house: repos are rooms, commits unlock furniture, frameworks move in and followers cheer outside.`;
  return { title, description, openGraph: { title, description, type: 'website', url: `/u/${login}` }, twitter: { card: 'summary_large_image', title, description }, alternates: { canonical: `/u/${login}` } };
}

const BGS = [['white', 'White', '#ffffff'], ['cream', 'Cream', '#fff4dc'], ['lawn', 'Lawn', '#5cc23c'], ['night', 'Night', '#1d1450']];
const SHOW = [['stats', 'Stats'], ['langs', 'Languages'], ['badges', 'Badges'], ['roster', 'Residents'], ['fans', 'Fan crowd'], ['tags', 'Name tags'], ['pose', 'Everyone busy']];

// The markup is static; public/engine/house.js fills it in once @login's house arrives.
export default async function House({ params }) {
  const { login } = await params;
  if (!VALID.test(login)) notFound();
  return (
    <>
      <section id="room">
        <header className="room-bar">
          <a className="logo small" href="/" id="back-btn" aria-label="GitRoom home">
            <canvas className="px logo-mark" id="logo-mark" width="13" height="13" aria-hidden="true" />
            <span className="logo-word">GitRoom</span>
          </a>
          <form className="visit" id="visit-form" role="search" autoComplete="off" noValidate>
            <label className="sr" htmlFor="visit-input">Visit another house</label>
            <SearchIcon />
            <input id="visit-input" type="text" placeholder="Visit any GitHub user" spellCheck={false} autoCapitalize="off" maxLength={39} enterKeyHint="go" />
            <button type="submit" className="visit-go" aria-label="Visit">→</button>
          </form>
          <div className="bar-actions">
            <button className="btn hot" type="button" id="share-btn" disabled><span aria-hidden="true">▶</span><span className="label">Share</span></button>
            <button className="btn icon theme-btn" type="button" data-theme-toggle aria-label="Switch day or night colours">
              <span className="sun" aria-hidden="true">☀</span><span className="moon" aria-hidden="true">☾</span>
            </button>
          </div>
        </header>

        <div className="profile plaque" id="profile">
          <div className="avatar-wrap"><canvas className="px identicon" id="identicon" width="10" height="10" aria-hidden="true" /><img id="avatar" alt="" hidden /></div>
          <div className="who">
            <div className="who-top"><h1 className="handle" id="handle">{`@${login}`}</h1><span className="top-badge" id="chip" /><span className="owner-chip" id="owner-chip" hidden>✓ Your house</span></div>
            <p className="sub" id="sub">Reading GitHub…</p>
          </div>
          <div className="stats" id="stats" />
        </div>

        <div className="room-main">
          <div className="stage" id="stage">
            <div id="cam">
              <canvas className="px" id="gl" width="8" height="8" aria-hidden="true" />
              <canvas className="px" id="ov" width="8" height="8" role="img" aria-label={`Pixel-art house built from @${login}'s GitHub repos, with residents walking around and using the furniture`} />
            </div>
            <div className="stage-ui">
              <span className="hint" id="hint">Tap a room · pinch or scroll to zoom</span>
              <div className="right">
                <button className="btn icon" type="button" id="overview-btn" aria-label="Show the whole house" hidden>⤢</button>
                <div className="zoom" role="group" aria-label="Zoom">
                  <button className="btn icon" type="button" id="zoom-out" aria-label="Zoom out">−</button>
                  <button className="btn icon" type="button" id="zoom-in" aria-label="Zoom in">+</button>
                </div>
                <button className="btn owner-only" type="button" id="custom-btn" hidden><span aria-hidden="true">✎</span><span className="label">Edit house</span></button>
              </div>
            </div>
            <div className="stage-msg" id="stage-msg" data-kind="loading">
              <div className="msg-card">
                <canvas className="px msg-art" id="msg-art" width="24" height="24" aria-hidden="true" />
                <p className="msg-title" id="msg-title">{`Building @${login}'s house`}</p>
                <p className="msg-text" aria-live="polite">Knocking on the door…</p>
                <div className="loader-bar"><div className="loader-fill" id="msg-fill" /></div>
                <div className="msg-actions" data-err="">
                  <a className="btn" href="/">Try another username</a>
                </div>
              </div>
            </div>
            <div className="tip" id="tip" hidden />
          </div>

          <aside className="side" aria-label="Rooms and residents">
            <section className="panel">
              <h2><span>Rooms</span><small id="room-note">by commits</small></h2>
              <div className="langbar" id="langbar" />
              <div className="langkey" id="langkey" />
              <ul className="rooms" id="room-list" />
              <div className="bonus-wrap" id="bonus-wrap" hidden>
                <h3>Bonus rooms</h3>
                <div className="bonus-list" id="bonus-list" />
              </div>
              <p className="attic" id="attic" />
            </section>
            <section className="panel">
              <h2><span>Residents</span><small id="res-count" /></h2>
              <div className="residents" id="resident-list" />
              <p className="ai-note">Tap one to find them. Tinted chips are AI helpers: they roam every room. <a href="/avatars">Meet the whole cast</a></p>
            </section>
            <section className="panel owner-box" id="owner-box">
              <div className="visitor-only">
                <h2><span>Is this your house?</span></h2>
                <p>Connect GitHub to pick your rooms, fix residents, rename the house and keep a floor plan you like. No password, no tokens.</p>
                <button className="btn gh" type="button" id="connect-btn"><GitHubMark /><span>Connect GitHub</span></button>
              </div>
              <div className="owner-only" hidden>
                <h2><span>Your house</span><small id="pub-state" /></h2>
                <p id="owner-text">You&apos;re connected. Changes you make show up here right away; publish them so every visitor sees them too.</p>
                <div className="row">
                  <button className="btn hot" type="button" id="edit-btn">✎ Edit house</button>
                  <button className="btn" type="button" id="publish-btn" hidden>Publish</button>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <nav className="explore" aria-label="More houses">
          <span>More houses</span>
          <div className="explore-list" id="explore-list" />
        </nav>
      </section>

      <div className="modal" id="story-modal" hidden role="dialog" aria-modal="true" aria-labelledby="story-title">
        <div className="modal-card share wide-card">
          <div className="modal-head"><h2 id="story-title">Share this house</h2><button className="btn icon" type="button" data-close="" aria-label="Close">✕</button></div>
          <div className="share-grid">
            <div className="story-wrap" id="story-wrap">
              <img id="story-img" alt="" data-fmt="story" />
              <video id="story-vid" data-fmt="story" muted loop playsInline autoPlay hidden aria-label="15-second video of the house" />
            </div>
            <div className="share-side">
              <div className="seg full" role="group" aria-label="Picture or video">
                <button type="button" data-share-kind="image" aria-pressed="true">Picture</button>
                <button type="button" data-share-kind="video" aria-pressed="false">15s video</button>
              </div>
              <div className="rec-row" id="rec-row" hidden>
                <button className="btn hot" type="button" id="rec-btn"><span aria-hidden="true">●</span><span className="label">Make 15s video</span></button>
                <div className="rec-bar" aria-hidden="true"><i id="rec-fill" /></div>
              </div>
              <div className="seg full" role="group" aria-label="Format">
                <button type="button" data-fmt-btn="story" aria-pressed="true">Story</button>
                <button type="button" data-fmt-btn="square" aria-pressed="false">Square</button>
                <button type="button" data-fmt-btn="wide" aria-pressed="false">Wide</button>
              </div>
              <details className="share-more">
                <summary>Style</summary>
                <h3>Background</h3>
                <div className="swatches" role="group" aria-label="Background">
                  {BGS.map(([id, name, c]) => <button key={id} type="button" data-bg={id} aria-pressed="false"><i style={{ background: c }} />{name}</button>)}
                </div>
                <h3>Lighting</h3>
                <div className="seg full" role="group" aria-label="Lighting in the picture">
                  <button type="button" data-slight="house" aria-pressed="true">As is</button>
                  <button type="button" data-slight="day" aria-pressed="false">Day</button>
                  <button type="button" data-slight="sunset" aria-pressed="false">Sunset</button>
                  <button type="button" data-slight="night" aria-pressed="false">Night</button>
                </div>
                <h3>Show</h3>
                <div className="checks">
                  {SHOW.map(([id, name]) => <label key={id} className="check"><input type="checkbox" data-show={id} defaultChecked /> {name}</label>)}
                </div>
                <div className="field-row"><label htmlFor="s-caption">Caption</label><input id="s-caption" type="text" maxLength={40} placeholder="Shipped all year!" autoComplete="off" /></div>
              </details>
              <p id="story-note">1080 × 1920 for Instagram and WhatsApp stories.</p>
              <div className="row">
                <a className="btn hot" id="save-btn" download="gitroom.png"><span className="label">Save image</span></a>
                <button className="btn" type="button" id="native-share-btn" hidden><span className="label">Share…</span></button>
                <button className="btn" type="button" id="copy-btn"><span className="label">Copy image</span></button>
              </div>
              <div className="link-row">
                <input id="share-link" type="text" readOnly aria-label="Link to this house" />
                <button className="btn" type="button" id="copy-link">Copy link</button>
              </div>
              <div className="social-row">
                <a className="chipbtn" id="share-x" target="_blank" rel="noopener noreferrer">Post on X</a>
                <a className="chipbtn" id="share-li" target="_blank" rel="noopener noreferrer">Share on LinkedIn</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="modal" id="custom-modal" hidden role="dialog" aria-modal="true" aria-labelledby="custom-title">
        <div className="modal-card share">
          <div className="modal-head"><h2 id="custom-title">Edit your house</h2><button className="btn icon" type="button" data-close="" aria-label="Close">✕</button></div>
          <p id="c-who">Changes show up right away. Publish them to GitHub so every visitor sees them too.</p>
          <div className="field-row"><label htmlFor="c-name">House name</label><input id="c-name" type="text" maxLength={18} autoComplete="off" spellCheck={false} /></div>
          <h3>Floor plan</h3>
          <div className="row"><button className="btn" type="button" id="shuffle-btn">⚄ New floor plan</button><button className="chipbtn" type="button" id="plan-reset">Back to the original</button></div>
          <p id="c-days" />
          <h3>Wallpaper</h3>
          <div className="opts" id="c-papers" />
          <h3>Pet</h3>
          <div className="opts" id="c-pets" />
          <h3>Lighting</h3>
          <div className="seg full" role="group" aria-label="Lighting">
            <button type="button" data-light="auto" aria-pressed="true">Auto</button>
            <button type="button" data-light="day" aria-pressed="false">Day</button>
            <button type="button" data-light="sunset" aria-pressed="false">Sunset</button>
            <button type="button" data-light="night" aria-pressed="false">Night</button>
          </div>
          <label className="check"><input type="checkbox" id="c-tags" defaultChecked /> Show name tags</label>
          <h3><span>Rooms</span> <span id="c-room-count" /></h3>
          <div className="pick-list" id="c-rooms" />
          <button className="chipbtn" type="button" id="c-rooms-auto">Use my 10 busiest repos</button>
          <h3>Bonus rooms</h3>
          <div className="pick-list" id="c-bonus" />
          <h3>Residents</h3>
          <p>Remove anyone the detector got wrong, or add who&apos;s missing.</p>
          <div className="fixes" id="c-fixes" />
          <div className="row sticky-save">
            <button className="btn" type="button" id="c-discard">Discard changes</button>
            <button className="btn hot" type="button" id="c-save" disabled>Publish to GitHub</button>
          </div>
        </div>
      </div>

      <div className="modal" id="gh-modal" hidden role="dialog" aria-modal="true" aria-labelledby="gh-title">
        <div className="modal-card share">
          <div className="modal-head"><h2 id="gh-title">Connect GitHub</h2><button className="btn icon" type="button" data-close="" aria-label="Close">✕</button></div>
          <p id="gh-intro" />
          <ol className="steps" id="gh-steps">
            <li id="gh-step-repo">
              <b>Create your profile repo</b>
              <span>A public repo named <code id="gh-repo-name" /> (GitHub&apos;s special profile repo). Leave everything else as it is.</span>
              <a className="btn" id="gh-repo-link" target="_blank" rel="noopener noreferrer"><GitHubMark /><span>Create it on GitHub</span></a>
            </li>
            <li id="gh-step-commit">
              <b id="gh-commit-title">Commit your house file</b>
              <span>GitHub opens with the file filled in. Press <b>Commit changes</b>, then come back here.</span>
              <a className="btn hot" id="gh-commit-link" target="_blank" rel="noopener noreferrer"><GitHubMark /><span>Open GitHub</span></a>
            </li>
          </ol>
          <div className="gh-wait" id="gh-wait" hidden>
            <div className="loader-bar"><div className="loader-fill waiting" /></div>
            <p id="gh-wait-text">Waiting for your commit…</p>
            <button className="chipbtn" type="button" id="gh-check">I committed it, check now</button>
          </div>
          <p className="gh-fine">Why a file? Only you can push to <code id="gh-repo-name-2" />, so the file proves the house is yours. GitRoom never asks for a password or a token, and never writes to your account.</p>
        </div>
      </div>

      <Chrome />
      <Engine page="house" args={{ login }} />
    </>
  );
}
