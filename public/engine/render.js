/* GitRoom renderer: lights the static pixel house with a WebGL fragment shader. Residents are drawn on the 2D overlay. */
(() => {
  const VS = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;v.y=1.-v.y;gl_Position=vec4(p,0.,1.);}';
  const FS = `precision mediump float;
varying vec2 v;
uniform sampler2D uA;
uniform sampler2D uL;
uniform sampler2D uG;
uniform vec2 uR;
uniform float uT;
uniform float uM;
uniform float uI;
float b2(vec2 a){a=floor(a);return fract(a.x/2.+a.y*a.y*.75);}
float b4(vec2 a){return b2(.5*a)*.25+b2(a);}
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  vec2 px=floor(v*uR);
  vec2 uv=(px+.5)/uR;
  vec2 tile=floor(px/16.);
  vec4 a=texture2D(uA,uv);
  if(a.a<.5||uI<(tile.x+tile.y)*.022){gl_FragColor=vec4(1.);return;}
  vec4 lt=texture2D(uL,uv);
  vec3 L=lt.rgb*2.;
  float beam=lt.a;
  float fl=1.+.04*sin(uT*2.3+px.x*.021+px.y*.017)*sin(uT*3.7+px.y*.013);
  L*=mix(fl,1.+.05*sin(uT*.9+px.y*.05),beam);
  vec2 m=floor(vec2(px.x-uT*2.,px.y+uT*5.)/2.);
  float mote=step(.991,h(m))*beam*(.55+.45*sin(uT*4.+h(m)*30.));
  float d=b4(px)-.5;
  vec3 q=max(floor(L*6.+d)/6.,vec3(.08));
  vec3 col=a.rgb*q;
  vec3 g=texture2D(uG,uv).rgb;
  col+=g*(uM>1.5?.8:uM>.5?.7:.55)*(1.+.15*sin(uT*1.7));
  col+=mote*vec3(1.,.96,.82)*.6;
  float lum=dot(col,vec3(.299,.587,.114));
  col=mix(vec3(lum),col,1.22);
  col*=uM>1.5?vec3(.96,.97,1.1):uM>.5?vec3(1.08,.96,.92):vec3(1.05,1.,.95);
  gl_FragColor=vec4(clamp(col,0.,1.),1.);
}`;
  const MODE = { day: 0, sunset: 1, night: 2 };

  function create(cv) {
    let gl = null;
    try { gl = cv.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false }); } catch (e) { gl = null; }
    if (!gl) return null;
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    let prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (e) { return null; }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const texs = [0, 1, 2].map(unit => {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
      [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(p => gl.texParameteri(gl.TEXTURE_2D, p, gl.NEAREST));
      [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(p => gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE));
      return t;
    });
    const U = n => gl.getUniformLocation(prog, n);
    ['uA', 'uL', 'uG'].forEach((n, i) => gl.uniform1i(U(n), i));
    const uR = U('uR'), uT = U('uT'), uM = U('uM'), uI = U('uI');
    let W = 1, H = 1;
    const upload = (unit, src, w, h) => {
      gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, texs[unit]);
      if (w) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(src.buffer));
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    };
    return {
      gl: true,
      lost: () => gl.isContextLost(),
      setHouse(house, w, h) { W = w; H = h; cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); upload(0, house); },
      setLight(maps) { upload(1, maps.light, W, H); upload(2, maps.glow, W, H); },
      frame(t, mode, intro) {
        gl.uniform2f(uR, W, H); gl.uniform1f(uT, t); gl.uniform1f(uM, MODE[mode] || 0); gl.uniform1f(uI, intro);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      },
    };
  }

  // 2D fallback: the unlit house on white
  function fallback(cv) {
    const x = cv.getContext('2d');
    let house = null;
    return {
      gl: false,
      lost: () => false,
      setHouse(h, w, ht) { house = h; cv.width = w; cv.height = ht; x.imageSmoothingEnabled = false; },
      setLight() {},
      frame() { x.fillStyle = '#ffffff'; x.fillRect(0, 0, cv.width, cv.height); if (house) x.drawImage(house, 0, 0); },
    };
  }

  window.RENDER = { create, fallback };
})();
