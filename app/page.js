import Engine from './components/Engine';
import Chrome from './components/Chrome';

export default function Landing() {
  return (
    <>
      <section id="landing">
        <div id="lawn-bg" className="grass" aria-hidden="true" />
        <header className="topbar">
          <a className="logo" href="/" aria-label="GitRoom home">
            <canvas className="px logo-mark" id="logo-mark" width="13" height="13" aria-hidden="true" />
            <span className="logo-word">GitRoom</span>
          </a>
          <div className="top-actions">
            <a className="btn cast-link" href="/avatars"><span className="pixel">Meet the cast</span></a>
            <button className="btn theme-btn" type="button" data-theme-toggle aria-label="Switch day or night colours">
              <span className="sun" aria-hidden="true">☀</span><span className="moon" aria-hidden="true">☾</span><span className="pixel">Day / Night</span>
            </button>
          </div>
        </header>
        <main className="hero">
          <div className="plaque hero-card" id="hero-card">
            <span className="eyebrow"><i />Public repos → pixel house</span>
            <h1 className="headline">
              <span className="line">Your GitHub,</span>
              <span className="line">but it&apos;s a <em className="hl">house.<canvas className="px" id="scribble" width="52" height="5" aria-hidden="true" /></em></span>
            </h1>
            <p className="lede">
              Every repo you push to gets a room, and every commit milestone <b>unlocks new furniture.</b> Frameworks move in where you used them,
              your contribution graph becomes a rug, and Claude, ChatGPT or Gemini visit if they show up in your code.
            </p>
            <form id="build-form" autoComplete="off" noValidate>
              <label className="sr" htmlFor="username">GitHub username</label>
              <div className="field">
                <span className="prefix">github.com/</span>
                <input id="username" name="username" type="text" placeholder="your-username" spellCheck={false} autoCapitalize="off" maxLength={39} />
                <button id="build-btn" type="submit">Build my house <span aria-hidden="true">→</span></button>
              </div>
              <p className="form-error" id="form-error" role="alert" hidden />
            </form>
            <div className="loader" id="loader" hidden>
              <div className="loader-bar"><div className="loader-fill" id="loader-fill" /></div>
              <div className="loader-text" id="loader-text" aria-live="polite">Reading public repos…</div>
            </div>
            <div className="sample" id="sample-row">
              <span>No sign-in needed. Try one:</span>
              <button className="chipbtn" type="button" data-profile="cheesesocrates">@cheesesocrates <small>made GitRoom</small></button>
            </div>
            <div className="auth-row" id="auth-row" hidden />
            <ul className="legend" aria-label="How your profile maps to the house">
              <li><b>Rooms</b><span>Your 10 most-pushed repos</span></li>
              <li><b>Residents</b><span>Your frameworks</span></li>
              <li><b>Furniture</b><span>Unlocks at 1 → 1000 commits</span></li>
            </ul>
          </div>
        </main>
      </section>
      <Chrome />
      <Engine page="landing" />
    </>
  );
}
