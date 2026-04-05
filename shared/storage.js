/* ═══════════════════════════════════════════
   Mathematica · storage.js
   Theme persistence + progress localStorage
   ═════════════════════════════════════════ */

/* ── Theme (3-mode: light → dark → neon → light) ── */
var _themeOrder = ['light', 'dark', 'neon'];
var _themeIcons = { light: '🌙', dark: '✨', neon: '☀️' };

function toggleTheme() {
  var html = document.documentElement;
  var cur = html.getAttribute('data-theme') || 'light';
  var idx = _themeOrder.indexOf(cur);
  var next = _themeOrder[(idx + 1) % _themeOrder.length];
  html.setAttribute('data-theme', next);
  localStorage.setItem('mathematica-theme', next);
  var icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = _themeIcons[next] || '🌙';
  _toggleNeonCanvas(next === 'neon');
}

function _toggleNeonCanvas(on) {
  var c = document.getElementById('neon-canvas');
  if (on && !c) { _initNeonCanvas(); return; }
  if (!on && c && c._neonRaf) {
    cancelAnimationFrame(c._neonRaf);
    c._neonRaf = null;
  }
  if (on && c && !c._neonRaf) { _startNeonRender(c); }
}

// Apply saved theme immediately (runs before DOMContentLoaded)
(function () {
  try {
    var saved = localStorage.getItem('mathematica-theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  } catch (e) { /* localStorage unavailable (file:// protocol) */ }
  document.addEventListener('DOMContentLoaded', function () {
    var cur = document.documentElement.getAttribute('data-theme') || 'light';
    var icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = _themeIcons[cur] || '🌙';
    if (cur === 'neon') _initNeonCanvas();
  });
})();

/* ── Neon WebGL Background ── */
function _initNeonCanvas() {
  if (document.getElementById('neon-canvas')) { _startNeonRender(document.getElementById('neon-canvas')); return; }
  var canvas = document.createElement('canvas');
  canvas.id = 'neon-canvas';
  document.body.insertBefore(canvas, document.body.firstChild);
  var gl = canvas.getContext('webgl');
  if (!gl) return;

  var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}';
  var fs = [
    'precision highp float;',
    'uniform vec2 R;uniform float T;',
    'float rnd(vec2 s){return fract(sin(dot(s,vec2(12.9898,78.233)))*43758.5453);}',
    'float nse(vec2 s){vec2 i=floor(s),f=fract(s);float a=rnd(i),b=rnd(i+vec2(1,0)),c=rnd(i+vec2(0,1)),d=rnd(i+vec2(1,1));vec2 u=f*f*(3.-2.*f);return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;}',
    'float fbm(vec2 s){float v=0.,a=.5;mat2 m=mat2(.877,.479,-.479,.877);for(int i=0;i<5;i++){v+=a*nse(s);s=m*s*2.+100.;a*=.5;}return v;}',
    // 7 cosine palette presets tuned to domain colors + default iridescent
    // Each: vec3 a, b, c, d → color = a + b*cos(2π(c*t+d))
    'vec3 palA(float t,vec3 a,vec3 b,vec3 c,vec3 d){return a+b*cos(6.2832*(c*t+d));}',
    // Palette presets: 0=default iridescent, 1=violet/foundation, 2=emerald/analysis,
    // 3=amber/algebra, 4=rose/probability, 5=cyan/discrete, 6=blue/applied
    'vec3 pal(float t){',
    '  float speed=T*0.035;',  // slow cycle ~28s per palette
    '  float phase=fract(speed);',
    '  float sm=smoothstep(0.,1.,phase);',
    '  int idx=int(mod(speed,7.));',
    '  int nxt=int(mod(speed+1.,7.));',
    // default iridescent (original)
    '  vec3 a0=vec3(.5,.5,.5),b0=vec3(.5,.5,.5),c0=vec3(1,1,1),d0=vec3(0,.33,.67);',
    // violet-lavender (foundation + geometry)
    '  vec3 a1=vec3(.55,.38,.6),b1=vec3(.45,.35,.45),c1=vec3(1,1,1),d1=vec3(.76,.70,.90);',
    // emerald-teal (analysis)
    '  vec3 a2=vec3(.15,.52,.42),b2=vec3(.35,.45,.38),c2=vec3(1,1,1),d2=vec3(.30,.55,.45);',
    // amber-gold (algebra)
    '  vec3 a3=vec3(.6,.45,.2),b3=vec3(.45,.35,.3),c3=vec3(1,1,1),d3=vec3(.10,.20,.55);',
    // rose-crimson (probability)
    '  vec3 a4=vec3(.6,.28,.35),b4=vec3(.42,.3,.32),c4=vec3(1,1,1),d4=vec3(.0,.15,.40);',
    // cyan-aqua (discrete)
    '  vec3 a5=vec3(.15,.52,.58),b5=vec3(.35,.42,.40),c5=vec3(1,1,1),d5=vec3(.45,.55,.60);',
    // blue-sapphire (applied)
    '  vec3 a6=vec3(.25,.4,.6),b6=vec3(.4,.38,.45),c6=vec3(1,1,1),d6=vec3(.55,.60,.75);',
    // Lookup current and next palette
    '  vec3 cA,cB;',
    '  if(idx==0)cA=palA(t,a0,b0,c0,d0);else if(idx==1)cA=palA(t,a1,b1,c1,d1);',
    '  else if(idx==2)cA=palA(t,a2,b2,c2,d2);else if(idx==3)cA=palA(t,a3,b3,c3,d3);',
    '  else if(idx==4)cA=palA(t,a4,b4,c4,d4);else if(idx==5)cA=palA(t,a5,b5,c5,d5);',
    '  else cA=palA(t,a6,b6,c6,d6);',
    '  if(nxt==0)cB=palA(t,a0,b0,c0,d0);else if(nxt==1)cB=palA(t,a1,b1,c1,d1);',
    '  else if(nxt==2)cB=palA(t,a2,b2,c2,d2);else if(nxt==3)cB=palA(t,a3,b3,c3,d3);',
    '  else if(nxt==4)cB=palA(t,a4,b4,c4,d4);else if(nxt==5)cB=palA(t,a5,b5,c5,d5);',
    '  else cB=palA(t,a6,b6,c6,d6);',
    '  return mix(cA,cB,sm);',
    '}',
    'void main(){vec2 s=gl_FragCoord.xy/R*3.;s.x*=R.x/R.y;',
    'vec2 q=vec2(fbm(s+.0*T),fbm(s+vec2(1)));',
    'vec2 r=vec2(fbm(s+q+vec2(1.7,9.2)+.15*T),fbm(s+q+vec2(8.3,2.8)+.126*T));',
    'float f=fbm(s+r);vec3 c=pal(f+T*.08);',
    'c=mix(c,vec3(.01,.01,.06),clamp(length(q)*.7,0.,1.));',
    'c=mix(c,c*1.3,clamp(length(r.x),0.,1.));',
    'gl_FragColor=vec4((f*f*f+.6*f*f+.5*f)*c,1);}'
  ].join('\n');

  function mkS(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s;
  }
  var prog = gl.createProgram();
  gl.attachShader(prog, mkS(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, mkS(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog); gl.useProgram(prog);

  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  var pLoc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(pLoc); gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);

  canvas._gl = gl;
  canvas._uR = gl.getUniformLocation(prog, 'R');
  canvas._uT = gl.getUniformLocation(prog, 'T');

  // Handle WebGL context loss (can happen when canvas is display:none)
  canvas.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    if (canvas._neonRaf) { cancelAnimationFrame(canvas._neonRaf); canvas._neonRaf = null; }
  });
  canvas.addEventListener('webglcontextrestored', function () {
    _initNeonCanvas();   // re-create shaders & restart
  });

  _startNeonRender(canvas);
}

function _startNeonRender(canvas) {
  var gl = canvas._gl;
  if (!gl || gl.isContextLost()) return;
  function frame(t) {
    if (gl.isContextLost()) { canvas._neonRaf = null; return; }
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(canvas._uR, w, h);
    gl.uniform1f(canvas._uT, t * 0.001);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    canvas._neonRaf = requestAnimationFrame(frame);
  }
  canvas._neonRaf = requestAnimationFrame(frame);
}

/* ── Progress tracking ── */
var MathStorage = {
  _key: function (moduleId) { return 'mathematica-' + moduleId; },

  save: function (moduleId, chNum, data) {
    var all = this.load(moduleId);
    all['ch' + chNum] = Object.assign({}, data, { ts: Date.now() });
    localStorage.setItem(this._key(moduleId), JSON.stringify(all));
  },

  load: function (moduleId) {
    try { return JSON.parse(localStorage.getItem(this._key(moduleId))) || {}; }
    catch (e) { return {}; }
  },

  getChapter: function (moduleId, chNum) {
    return this.load(moduleId)['ch' + chNum] || null;
  }
};

/* ═══════════════════════════════════════════
   错题本 (Wrong-Answer Notebook)
   key: mathematica-wrong-answers
   Structure: { "<questionId>": { question, answer, userAnswer, module, chapter, count, ts } }
   ═════════════════════════════════════════ */
var WrongBook = {
  _key: 'mathematica-wrong-answers',

  _load: function () {
    try { return JSON.parse(localStorage.getItem(this._key)) || {}; }
    catch (e) { return {}; }
  },

  _save: function (data) {
    localStorage.setItem(this._key, JSON.stringify(data));
  },

  /** Record a wrong answer */
  record: function (id, info) {
    var data = this._load();
    if (data[id]) {
      data[id].count += 1;
      data[id].ts = Date.now();
      data[id].userAnswer = info.userAnswer;
    } else {
      data[id] = {
        question: info.question,
        correctAnswer: info.correctAnswer,
        userAnswer: info.userAnswer,
        module: info.module || '',
        chapter: info.chapter || '',
        count: 1,
        ts: Date.now()
      };
    }
    this._save(data);
    this._updateBadge();
  },

  /** Remove an entry (answered correctly on retry) */
  remove: function (id) {
    var data = this._load();
    delete data[id];
    this._save(data);
    this._updateBadge();
  },

  /** Get all wrong entries sorted by count desc */
  getAll: function () {
    var data = this._load();
    return Object.keys(data).map(function (k) {
      return Object.assign({ id: k }, data[k]);
    }).sort(function (a, b) { return b.count - a.count || b.ts - a.ts; });
  },

  count: function () {
    return Object.keys(this._load()).length;
  },

  clear: function () {
    localStorage.removeItem(this._key);
    this._updateBadge();
  },

  _updateBadge: function () {
    var badge = document.getElementById('wrong-book-badge');
    if (!badge) return;
    var n = this.count();
    badge.textContent = n;
    badge.style.display = n > 0 ? 'flex' : 'none';
  }
};

