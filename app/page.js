import Engine from './components/Engine';
import Chrome from './components/Chrome';
import { GitHubMark } from './components/Icons';

const FEATURED = [
  ['karpathy', 'AI and neural nets'],
  ['torvalds', 'Linux and Git'],
  ['gaearon', 'React'],
  ['yyx990803', 'Vue and Vite'],
  ['shadcn', 'shadcn/ui'],
  ['cheesesocrates', 'made GitRoom'],
];
const HOW = [
  ['room', 'Rooms', 'Your top repos, sized by commits'],
  ['couch', 'Furniture', 'Unlocks at 1, 10, 100… 1,000 commits'],
  ['react', 'Residents', '190+ frameworks and languages move in'],
  ['fan1', 'Fans', 'One cheering fan per follower'],
];

export default function Landing() {
  return (
    <>
      <div id="lawn-bg" className="grass" aria-hidden="true" />
      <div className="home">
        <header className="topbar">
          <a className="logo" href="/" aria-label="GitRoom home">
            <canvas className="px logo-mark" id="logo-mark" width="13" height="13" aria-hidden="true" />
            <span className="logo-word">GitRoom</span>
          </a>
          <nav className="top-actions" aria-label="Site">
            <a className="btn ghost hide-sm" href="/avatars">The cast</a>
            <button className="btn icon theme-btn" type="button" data-theme-toggle aria-label="Switch day or night colours">
              <span className="sun" aria-hidden="true">☀</span><span className="moon" aria-hidden="true">☾</span>
            </button>
            <a className="btn gh" href="#connect" id="top-connect"><GitHubMark /><span>Connect<span className="hide-xs"> GitHub</span></span></a>
          </nav>
        </header>

        <main>
          <section className="hero">
            <div className="hero-copy" id="hero-card">
              <span className="eyebrow"><i />Free · no sign-up · open source</span>
              <h1 className="headline">
                <span className="line">Your GitHub,</span>
                <span className="line">as a <em className="hl">pixel house.<canvas className="px" id="scribble" width="52" height="5" aria-hidden="true" /></em></span>
              </h1>
              <p className="lede">Repos become rooms, commits unlock furniture, your stack moves in and your followers cheer outside.</p>
              <form id="build-form" autoComplete="off" noValidate>
                <label className="sr" htmlFor="username">GitHub username</label>
                <div className="field">
                  <span className="prefix">github.com/</span>
                  <input id="username" name="username" type="text" placeholder="username" spellCheck={false} autoCapitalize="off" maxLength={39} enterKeyHint="go" />
                  <button id="build-btn" type="submit">Build<span className="hide-xs"> my house</span> <span aria-hidden="true">→</span></button>
                </div>
                <p className="form-error" id="form-error" role="alert" hidden />
              </form>
              <div className="loader" id="loader" hidden>
                <div className="loader-bar"><div className="loader-fill" id="loader-fill" /></div>
                <div className="loader-text" id="loader-text" aria-live="polite">Knocking on the door…</div>
              </div>
              <div className="try" id="sample-row">
                <span>Or drop by</span>
                {FEATURED.slice(0, 3).map(([login]) => <button key={login} className="chipbtn" type="button" data-profile={login}>@{login}</button>)}
              </div>
            </div>
            <figure className="hero-shot" id="hero-shot">
              <a href="/u/karpathy" className="shot-frame" aria-label="Open @karpathy's house">
                <img src="/showcase/hero.png" alt="A pixel-art house built from @karpathy's GitHub: rooms for each repo, residents at their desks and a crowd of fans outside" width="1604" height="1532" />
              </a>
              <figcaption><span className="live-dot" aria-hidden="true" />@karpathy&apos;s house · <a href="/u/karpathy">step inside</a></figcaption>
            </figure>
          </section>

          <section className="how" aria-label="How it works">
            {HOW.map(([art, title, text]) => (
              <div className="how-tile" key={title}>
                <canvas className="px how-art" data-art={art} width="16" height="16" aria-hidden="true" />
                <div><b>{title}</b><span>{text}</span></div>
              </div>
            ))}
          </section>

          <section className="gallery" aria-labelledby="gallery-title">
            <div className="section-head">
              <h2 id="gallery-title">Drop by a house</h2>
              <p>Every house is built live from public GitHub data. No sign-up, just a username.</p>
            </div>
            <div className="cards">
              {FEATURED.map(([login, note]) => (
                <a className="house-card" key={login} href={`/u/${login}`}>
                  <span className="card-shot"><img src={`/showcase/${login}.png`} alt="" loading="lazy" width="480" height="360" /></span>
                  <span className="card-meta"><b>@{login}</b><small>{note}</small></span>
                </a>
              ))}
            </div>
          </section>

          <section className="connect" id="connect" aria-labelledby="connect-title">
            <div className="connect-copy">
              <h2 id="connect-title">Make it yours</h2>
              <p>Connect GitHub to pick your rooms, fix residents, rename your house and keep the floor plan you love. Only you can change your house: visitors just look around.</p>
              <ul className="ticks">
                <li>No password, no OAuth, no tokens</li>
                <li>One small file in your profile repo proves it&apos;s you</li>
                <li>Visitors see your changes within a minute</li>
              </ul>
            </div>
            <form className="connect-form" id="connect-form" autoComplete="off" noValidate>
              <label htmlFor="connect-user">Your GitHub username</label>
              <div className="field">
                <span className="prefix">github.com/</span>
                <input id="connect-user" type="text" placeholder="username" spellCheck={false} autoCapitalize="off" maxLength={39} enterKeyHint="go" />
                <button type="submit" className="gh-submit"><GitHubMark /><span>Connect</span></button>
              </div>
              <p className="form-error" id="connect-error" role="alert" hidden />
            </form>
          </section>
        </main>

        <footer className="foot">
          <span>Made by <a href="https://github.com/cheesesocrates">@cheesesocrates</a></span>
          <a href="https://github.com/cheesesocrates/gitroom"><GitHubMark size={14} /> Source</a>
          <a href="/avatars">The cast</a>
          <span>Not affiliated with GitHub.</span>
        </footer>
      </div>
      <Chrome />
      <Engine page="landing" />
    </>
  );
}
