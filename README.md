# GitRoom

Type a GitHub username, get a cozy pixel-art house:
- **Rooms:** one room per repo (the 10 most-pushed), with furniture unlocked at 1 → 1000 commits.
- **Residents:** frameworks become 16×16 residents who walk around and use the furniture.
- **AI helpers:** Claude, ChatGPT and Gemini visit when they show up in the code.
- **Followers:** they cheer outside, one fan per follower (up to 3,000, with a banner showing the real number). The crowd gathers on the path in front of the house and stacks up there, then spreads round the sides; only a big crowd surrounds the house.
- **Stars:** they float around the rooms that earned them.

Accounts with few repos (or long, famous careers) also get bonus rooms: a Lab, Hall of Fame, Observatory, Fan Lounge and more.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

In development no setup is needed if the GitHub CLI is signed in (`gh auth login`): GitRoom borrows its token for public data. Otherwise copy `.env.example` to `.env.local` and set `GITHUB_TOKEN`.

## Pages

- `/`: the landing page and username form.
- `/u/<login>`: the house.
  - Scroll or pinch to zoom as far as you like, and drag to look around.
  - **Share** makes story (9:16), square and desktop (16:9) images, or a 15-second video of the house in motion (MP4 where the browser supports it, otherwise WebM). The video is rendered frame by frame with WebCodecs, so it is ready in seconds; browsers without WebCodecs film it live for 15 seconds instead. You can pick the background, the lighting and which details are shown, and add a caption. In pictures and videos the fans pack the front of the frame as an audience.
- `/avatars`: the whole cast.
  - In development, mark sprites "Needs remake" with a note; marks save to `data/avatar-flags.json`.
  - In production it is a read-only gallery.

## Signing in and editing your house

The owner of a house can sign in with GitHub and fix it up for everyone:
- pick which repos get rooms
- turn bonus rooms on or off
- remove residents the detector got wrong, or add missing ones
- keep a floor plan they like
- set the name, wallpaper, pet and lighting

Visitors can still play with Customize, but their changes stay in their own browser.

- **Development:** with no OAuth App configured, "Sign in with GitHub" on `localhost` signs you in as the GitHub CLI account. The token stays on the server. This only works from `localhost`.
- **Production:** create a GitHub OAuth App with callback `https://<your-domain>/api/auth/callback`, then set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` and `SESSION_SECRET`.
  - Plain sign-in asks only for `read:user`.
  - Private repos are a separate opt-in (`repo` scope). They are shown only to their owner, never by name (Priv1, Priv2…), and never cached.

Saved house settings go to `data/houses/<login>.json`. On serverless hosts, set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to keep them in Upstash Redis instead.

## Deploy to Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new). It builds with the defaults.
2. Add these environment variables, then redeploy:
   - `GITHUB_TOKEN`: a classic personal access token with **no scopes** ([create one](https://github.com/settings/tokens/new?description=GitRoom&scopes=)). It can only read public data. Don't reuse your `gh` CLI token, which can read your private repos.
   - `SESSION_SECRET`: any long random string, for example from `openssl rand -base64 32`.
   - Optional, for "Sign in with GitHub": `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` from a GitHub OAuth App whose callback URL is `https://<your-domain>/api/auth/callback`.
   - Optional, so owners can save their houses: add Upstash Redis from the Vercel Marketplace. Its `KV_REST_API_URL` and `KV_REST_API_TOKEN` are picked up automatically.

## How it fits together

- `lib/github.js`: GraphQL calls for the user, repos and contribution calendar, plus manifests of the busiest repos.
  - Commits are counted per repo, busiest first, stopping once the top ten are settled.
  - Giant repos (like `torvalds/linux`) are counted through commit search, because GraphQL times out on them.
  - Achievements come from the profile page.
- `lib/detect.js`: which resident moves in for which dependency or file.
- `lib/analyze.js`: builds the profile the engine draws.
- `lib/settings.js`, `lib/store.js`: what owners can change, and where it's saved.
- `app/api/house/[login]`: cached 6 h in memory and at the CDN for public houses.
- `public/engine/`: the pixel engine as plain browser scripts.
  - `sprites.js` and `avatars-a/b/c/d.js`: the cast.
  - `layout.js`: the floor plan, furniture placement and bonus rooms.
  - `furniture.js`: the furniture painters.
  - `render.js`: the WebGL lighting shader.
  - `house.js`, `landing.js`: the two pages.

## Third-party code and fonts

- `public/vendor/gsap.min.js`: [GSAP](https://gsap.com) 3.12.5, under GreenSock's standard license.
- `public/vendor/mediabunny.min.mjs`: [Mediabunny](https://mediabunny.dev) 1.61.4 for video encoding, MPL-2.0 (license alongside it).
- `public/fonts/tiny5-digits.woff2`: the digits of [Tiny5](https://github.com/Gissio/font_tiny5), SIL OFL 1.1 (license alongside it). The pixel font is Pixelify Sans, which draws 5 like an S, so its digits come from Tiny5.
- Bricolage Grotesque, Figtree and Pixelify Sans come from Google Fonts through `next/font`, all SIL OFL 1.1.

## License

GitRoom is MIT licensed (see `LICENSE`). The vendored libraries and fonts above keep their own licenses.
