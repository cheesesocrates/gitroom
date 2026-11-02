'use client';
import { useEffect } from 'react';
import * as GitRoomData from '@/lib/client';

// The pixel engine is plain browser JS in /public/engine (it owns the canvases and the DOM it was given).
// These load its files in order, once per page, then hand over to it. Its data comes from lib/client.js.
const CAST = ['/engine/avatars-a.js', '/engine/avatars-b.js', '/engine/avatars-c.js', '/engine/avatars-d.js', '/engine/sprites.js'];
const SCRIPTS = {
  landing: ['/vendor/gsap.min.js', ...CAST, '/engine/landing.js'],
  house: ['/vendor/gsap.min.js', ...CAST, '/engine/constants.js', '/engine/furniture.js', '/engine/layout.js', '/engine/render.js', '/engine/house.js'],
  avatars: CAST,
};
const ENTRY = { landing: 'GitRoomLanding', house: 'GitRoomHouse' };

const pending = {};
function load(src) {
  if (!pending[src]) {
    pending[src] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = resolve;
      s.onerror = () => { delete pending[src]; reject(new Error(`Couldn't load ${src}`)); };
      document.body.appendChild(s);
    });
  }
  return pending[src];
}

export async function loadEngine(page) {
  window.GitRoomData = GitRoomData;
  for (const src of SCRIPTS[page]) await load(src);
}

export default function Engine({ page, args }) {
  useEffect(() => {
    let alive = true;
    loadEngine(page)
      .then(() => { if (alive && ENTRY[page] && window[ENTRY[page]]) window[ENTRY[page]].mount(args || {}); })
      .catch(err => console.error(err));
    return () => { alive = false; };
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
