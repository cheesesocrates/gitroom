// GitHub's language colours (from linguist), so rooms and language residents match what people see on GitHub.
export const LANG_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Java: '#b07219', 'C++': '#f34b7d', C: '#555555',
  'C#': '#178600', Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516', PHP: '#4F5D95', Swift: '#F05138', Kotlin: '#A97BFF',
  Dart: '#00B4AB', HTML: '#e34c26', CSS: '#663399', SCSS: '#c6538c', Sass: '#a53b70', Less: '#1d365d', Shell: '#89e051',
  PowerShell: '#012456', Batchfile: '#C1F12E', 'Jupyter Notebook': '#DA5B0B', Vue: '#41b883', Svelte: '#ff3e00',
  Astro: '#ff5a03', Lua: '#000080', R: '#198CE7', MATLAB: '#e16737', Scala: '#c22d40', Haskell: '#5e5086', Elixir: '#6e4a7e',
  Erlang: '#B83998', Clojure: '#db5855', Julia: '#a270ba', Perl: '#0298c3', 'Objective-C': '#438eff', Assembly: '#6E4C13',
  Dockerfile: '#384d54', Makefile: '#427819', CMake: '#DA3434', GDScript: '#355570', ShaderLab: '#222c37', HLSL: '#aace60',
  GLSL: '#5686a5', Zig: '#ec915c', Nim: '#ffc200', OCaml: '#ef7a08', 'F#': '#b845fc', Solidity: '#AA6746', TeX: '#3D6117',
  Markdown: '#083fa1', MDX: '#fcb32c', Elm: '#60B5CC', Crystal: '#000100', V: '#4f87c4', Fortran: '#4d41b1',
  'Visual Basic .NET': '#945db7', Nix: '#7e7eff', HCL: '#844FBA', Groovy: '#4298b8', Processing: '#0096D8',
  Verilog: '#b2b7f8', VHDL: '#adb2cb', SystemVerilog: '#DAE1C2', Prolog: '#74283c', Racket: '#3c5caa', Scheme: '#1e4aec',
  'Common Lisp': '#3fb68b', 'Emacs Lisp': '#c065db', 'Vim Script': '#199f4b', Smalltalk: '#596706', Pascal: '#E3F171',
  Ada: '#02f88c', D: '#ba595e', Mojo: '#ff4c1f', Gleam: '#ffaff3', Odin: '#60AFFE', Apex: '#1797c0', PLpgSQL: '#336790',
  TSQL: '#e38c00', Stylus: '#ff6347', Pug: '#a86454', Handlebars: '#f7931e', EJS: '#a91e50', Twig: '#c1d026', Blade: '#f7523f',
  Liquid: '#67b8de', Jinja: '#a52a22', CoffeeScript: '#244776', PureScript: '#1D222D', ReScript: '#ed5051', Hack: '#878787',
  'Objective-C++': '#6866fb', Cuda: '#3A4E3A', WebAssembly: '#04133b', Haxe: '#df7900', AutoHotkey: '#6594b9',
  'Arduino': '#00979d', Mermaid: '#ff3670', Svg: '#ff9900', SVG: '#ff9900', Text: '#8a7fa8',
};

const hash = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };

// languages GitHub knows but this table doesn't still get a stable, cheerful colour
export function langColor(name) {
  if (!name) return '#8a7fa8';
  if (LANG_COLORS[name]) return LANG_COLORS[name];
  const h = hash(name) % 360;
  return hsl(h, 62, 52);
}

function hsl(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return '#' + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('');
}

export const slug = s => String(s).toLowerCase().replace(/\+/g, 'p').replace(/#/g, 'sharp').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
