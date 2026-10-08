/**
 * deep-zoom/renderer/core.js — the Mandelbulb perturbation deep-zoom renderer, as a module.
 *
 * WHAT THIS IS
 *   The inline script of the standalone page, wrapped in createDeepZoom(canvas, options) so the
 *   gmt-shell in deep-zoom/ can drive it directly instead of embedding a page in an iframe.
 *
 * WHERE IT CAME FROM
 *   repo    mandelbulb_deepzoom (github.com/gamazama/mandelbulb-deepzoom), branch kernel-perf
 *   file    index.html
 *   commit  3b65946  (sha-256 of the file f3ac89fa3bf073acb93686831652a41ff4079970ca96324ba86b8bc1d66804cd)
 *   ported  2026-10-07 by deep-zoom/renderer/port/port.mjs
 *
 * IT IS A VERBATIM PORT. Between the BEGIN and END markers below every line is the page's line,
 * except where one of these transforms touched it (name: places changed):
 *     embed-flag-from-options: 1
 *     canvas-from-argument: 1
 *     webgl-missing-throws-error: 1
 *     body-is-scaffold: 4
 *     lookup-in-scaffold: 8
 *     handle-assign: 79
 *     handle-read: 39
 *     window-listeners-recorded: 6
 *     document-listener-recorded: 1
 *     canvas-listener-recorded: 1
 *     keys-on-key-target: 2
 *     shortcuts-optional: 1
 *     drops-on-drop-target: 2
 *     pointer-lock-optional: 1
 *     compile-poll-stops-on-dispose: 1
 *     panel-sync-interval-recorded: 1
 *     frame-loop-cancellable: 3
 *     view-width-from-size-element: 2
 *     view-height-from-size-element: 2
 *     alert-to-notice: 3
 *   Shader strings: 10 GLSL literals, 61341 bytes, byte-identical to the page
 *   (combined sha-256 dec666ec70e027440369350b8ec29471138f193ed6d6f4fe12ded360deeb441a).
 *   Everything above BEGIN and below END is the module wrapper and is not from the page.
 *
 * WHAT THE WRAPPER ADDS
 *   - a hidden scaffold element built from the page's body markup, so the developer panel, HUD and
 *     loading box the script looks up exist (never shown); removed by dispose()
 *   - api: the object that carries what the page put on window as window.__name (api.name);
 *     with options.publishOnWindow each member is ALSO written to window.__name as the page did
 *   - one recorder for window / document / canvas listeners and the one interval, so dispose()
 *     removes them; a cancellable frame loop; step(now) for a host that drives the loop itself
 *   - option seams for a host that shares the window with other things (all default to the page's
 *     behaviour): keyTarget, shortcuts, dropTarget, pointerLock, resetStillOnResize,
 *     loseContextOnDispose, onContextLost. See core.d.ts.
 *
 * THE HISTORICAL PAGE STAYS FROZEN at 3b65946. It is the reference this file is tested against
 * (npx tsx debug/smoke-deep-zoom-parity.mts). From 2026-10-07 THIS FILE is the source that gets
 * edited; port.mjs is kept as provenance (node deep-zoom/renderer/port/port.mjs --check proves a
 * copy is still "the page plus the transforms" — true only until the first hand edit).
 *
 * Types: core.d.ts (loose) and index.ts (the product surface). Import from index.ts.
 */

const DZ_SCAFFOLD_HTML = `<div id="loading"><div class="box"><span class="spin">◓</span> compiling deep renderer…<br>
<small style="color:#9ab">first load only (~15&thinsp;s) — flying the f32 baseline meanwhile</small></div></div>
<div id="hud"></div>
<div id="topbar">
  <div id="ctlbtn">⚙ controls</div>
  <div id="renderbtn">🎬 render</div>
  <div id="aboutbtn">ⓘ about</div>
</div>
<div id="controls" class="modal"><div class="panel">
  <span class="x">✕</span>
  <h1>Controls</h1>
  <p class="sub">Changes apply live. (Keyboard shortcuts still work too.)</p>
  <div id="ctlbody"></div>
  <h2>Keyboard shortcuts</h2>
  <p class="sub">WASD + Q/E fly · Shift boost · mouse look · Esc release &nbsp;·&nbsp; [ ] iters · I auto-iters ·
  P mode · R res · N normals &nbsp;·&nbsp; −/= power · ,/. phase θ · ;/' phase φ &nbsp;·&nbsp;
  C colour · 9/0 palette · F/G detail · L light · T/Y falloff &nbsp;·&nbsp; V gate · X export · M record · ? about</p>
</div></div>
<div id="render" class="modal"><div class="panel">
  <span class="x">✕</span>
  <h1>Render &amp; Export</h1>
  <p class="sub" id="rstatus">no path yet — Record or Load one</p>
  <h2>Still image (PNG)</h2>
  <div class="row"><label>resolution (long edge)</label><input id="r_res" type="number" value="2560" min="256" step="64"></div>
  <div class="row"><label>samples (quality)</label><input id="r_samp" type="number" value="16" min="1" max="128"></div>
  <button class="btn go" id="r_export">Export PNG</button>
  <h2>Camera path</h2>
  <button class="btn" id="r_rec">● Record</button>
  <div class="row"><label>smoothing — passes</label><input id="r_sp" type="number" value="2" min="0" max="12"></div>
  <div class="row"><label>strength (0–1)</label><input id="r_sa" type="number" value="0.4" min="0" max="1" step="0.05"></div>
  <button class="btn" id="r_smooth">Smooth path</button>
  <button class="btn" id="r_play">▶ Preview</button>
  <button class="btn" id="r_load">Load…</button>
  <button class="btn" id="r_save">Save</button>
  <h2>Render path → video frames (.zip)</h2>
  <div class="row"><label>frames</label><input id="r_frames" type="number" value="180" min="1"></div>
  <div class="row"><label>resolution (long edge)</label><input id="r_pres" type="number" value="1920" min="256" step="64"></div>
  <div class="row"><label>samples / frame</label><input id="r_psamp" type="number" value="12" min="1" max="64"></div>
  <button class="btn go" id="r_render">Render → ZIP</button>
  <button class="btn" id="r_cancel">✖ Cancel</button>
  <p class="sub">frames = seconds × fps. Cancel still saves the frames done so far; renders over 500&thinsp;MB split into numbered ZIPs.<br>Encode the unzipped PNGs:<br>
  <code style="color:#9ab">ffmpeg -framerate 30 -i frame_%05d.png -c:v libx264 -pix_fmt yuv420p out.mp4</code></p>
</div></div>
<div id="about" class="modal"><div class="panel">
  <span class="x">✕ close (?)</span>
  <h1>Mandelbulb Perturbation Deep-Zoom</h1>
  <p class="sub">Real-time fly-navigation of the 3D Mandelbulb to ~1e-50 surface distance on a consumer
  GPU (WebGL2), via 3D perturbation theory. A literature sweep (June 2026) found no published
  derivation, code, or demonstration of Mandelbulb perturbation deep-zoom; prior renderers wall at
  ~1e-6 (f32) / ~1e-13 (f64). Every depth milestone is certified against an independent
  arbitrary-precision referee that shares no code or math with the renderer.</p>

  <h2>Standing on the shoulders of</h2>
  <ul>
    <li>The <b>Mandelbulb</b> (triplex power-8 map) — <b>Daniel White</b> &amp; <b>Paul Nylander</b>,
        with the fractalforums community (2009).</li>
    <li><b>Perturbation theory</b> for deep zoom — <b>K. I. Martin</b>, <i>SuperFractalThing</i> (2013).</li>
    <li><b>Distance-estimated ray marching</b> — <b>John C. Hart</b> et al. (sphere tracing, 1996);
        Mandelbulb DE practice popularized by <b>Inigo Quilez</b> and <b>Mikael Hvidtfeldt
        Christensen</b> (Syntopia). The cosine colour palette is Quilez's.</li>
    <li><b>Rebasing</b> &amp; <b>bilinear approximation (BLA)</b> for perturbation — <b>Zhuoran</b>
        (fractalforums, 2021–22); developed further in <b>Claude Heiland-Allen</b>'s Fraktaler-3 and
        the wider deep-zoom community (FractalShark, Imagina, FractalShades; mathr.co.uk).</li>
    <li><b>Glitch-detection</b> lineage — <b>Pauldelbrot</b> (fractalforums).</li>
    <li>2D deep-zoom architecture, HDR float helpers, fly-slowdown — ported from <b>GMT</b>
        (<a href="https://gmt-fractals.com">gmt-fractals.com</a>), the GPL-3.0 explorer this extends.</li>
  </ul>

  <h2>Project</h2>
  <p><b>Gigh Zack</b> — project lead, GMT. Posed the problem, set the 1e-50 target, and flew every
  acceptance flight (first human to navigate the Mandelbulb at 1e-20). Diagnosed by eye three renderer
  defects that all automated suites had missed — the first-order-Δθ formulation bug, the march
  overshoot, and the render-resolution hit epsilon — the corrections that made the geometry true.
  Feature direction from <b>Lycium</b> (Maxon): local camera lighting, camera-path export.</p>

  <h2>Built with Claude Code (Anthropic, June 2026)</h2>
  <p><b>Claude Opus 4.x</b> — prep &amp; consolidation: the exact triplex Jacobian and the
  cancellation-free delta recurrence; the transcendental-free (Chebyshev) high-precision reference
  orbit; the CPU validation suites, the BigInt direct referee, the GPU BLA port, the march-population
  study. <b>Claude Fable 5</b> — research: that double-single arithmetic is dead on NVIDIA (EFT
  collapse) → HDR mantissa+exponent δ; found and fixed the two O(1) cancellations and the first-order
  Δθ (root cause of the depth wall); built the renderer; designed the certification methodology and
  the triplex BLA theory.</p>
  <p class="sub">Methodology rule, twice earned here: implementation-agreement tests are circular for
  formulation bugs — every certification keeps one referee that shares zero math with the kernel.</p>

  <h2>What is new here, to our knowledge</h2>
  <p>An exact, cancellation-free perturbation recurrence for the non-analytic triplex power (including
  the exact Δθ/Δφ residual forms); a perturbed distance-estimator delta (Δr/Δdr) valid to 1e-50; BLA
  skip tables generalized to a 3D non-analytic map; and the certified-depth methodology.</p>

  <h2>Substrate</h2>
  <p class="sub">WebGL2 / GLSL ES 3.00 via ANGLE (certified on d3d11) · δ as f32 mantissas with one
  integer exponent per vector, no error-free transforms · in-kernel atan / sin / cos accurate to f32
  (the GPU built-ins are not) · BigInt fixed-point (P=256, ~77 digits) reference orbits
  and camera, transcendental-free via Chebyshev · per-frame reference rebuild at the camera ·
  Zhuoran-style conditional rebasing with Δdr re-anchor · real-GPU test harness with f64 and BigInt
  direct referees, 11/11 certified 1e-5 → 1e-50.</p>
  <p class="sub">Built with Claude Code. GPL-3.0, in the spirit of the fractal community whose shoulders
  this stands on. &nbsp;Source &amp; verification harness:
  <a href="https://github.com/gamazama/mandelbulb-deepzoom">github.com/gamazama/mandelbulb-deepzoom</a></p>
</div></div>
<div id="help"><span id="lockcue">click to capture mouse</span> · WASD + Q/E fly · SHIFT boost · mouse look · ESC release
<span style="color:#9ab">⚙ controls</span> for all settings + shortcuts · <span style="color:#9ab">🎬 render</span> to export &amp; record</div>
`;

export function createDeepZoom(canvas, options = {}) {
/* ════════ module wrapper (not from the page) ════════ */
if (!canvas || typeof canvas.getContext !== 'function') throw new Error('createDeepZoom: a canvas element is required');
const dzAutoStart = options.autoStart !== false;              // false: the host calls instance.step(now)
const dzSizeEl = options.sizeElement || canvas.parentElement || null;
/* options.resetStillOnResize (default false = the page): a change of the available size restarts the
   still. The page only did that for its own panel; without it a resize mid-convergence blends into
   an empty target. accumReset is the page's own flag, read here at call time only. */
const dzResetOnResize = options.resetStillOnResize === true;
let dzLastW = 0, dzLastH = 0;
const dzViewW = () => { const v = dzSizeEl ? dzSizeEl.clientWidth : window.innerWidth; if (v !== dzLastW) { if (dzLastW && dzResetOnResize) accumReset = true; dzLastW = v; } return v; };
const dzViewH = () => { const v = dzSizeEl ? dzSizeEl.clientHeight : window.innerHeight; if (v !== dzLastH) { if (dzLastH && dzResetOnResize) accumReset = true; dzLastH = v; } return v; };
/* input seams. Defaults are the page: keys and file drops on window, a canvas click takes the pointer. */
const dzKeyTarget = options.keyTarget || window;              // where keydown / keyup listen
const dzShortcuts = options.shortcuts !== false;              // false: keys are only recorded for flying, no shortcut acts
const dzDropTarget = options.dropTarget === undefined ? window : options.dropTarget;   // null: no drop listeners at all
const dzClickTarget = options.pointerLock === false ? null : canvas;                   // null: a click does not take the pointer
const dzNotice = typeof options.onNotice === 'function' ? options.onNotice : (message) => console.warn(message);
/* the page's body markup, hidden: everything the script looks up by id lives in here */
const dzScaffold = document.createElement('div');
dzScaffold.setAttribute('data-deep-zoom-scaffold', '');
dzScaffold.style.display = 'none';
dzScaffold.innerHTML = DZ_SCAFFOLD_HTML;
const dzScaffoldParent = options.scaffoldParent || canvas.parentElement || document.body;
dzScaffoldParent.appendChild(dzScaffold);
const dzById = (id) => dzScaffold.querySelector('#' + id);
/* api.name is what the page called window.__name */
const dzPublished = new Map();
const dzApiTarget = {};
const api = options.publishOnWindow
  ? new Proxy(dzApiTarget, { set(target, key, value) {
      target[key] = value;
      /* a disposed instance publishes nothing: its deep-shader callback can land after dispose() */
      if (typeof key === 'string' && !dzDisposed) { window['__' + key] = value; dzPublished.set(key, value); }
      return true;
    } })
  : dzApiTarget;
const dzListeners = [];
function dzListen(target, type, handler, opts) { if (!target) return; target.addEventListener(type, handler, opts); dzListeners.push([target, type, handler, opts]); }
/* a host-supplied key target can lose focus with a fly key down and never see its keyup */
if (options.keyTarget) {
  const dzReleaseKeys = () => { for (const k in keys) keys[k] = false; };
  dzListen(dzKeyTarget, 'blur', dzReleaseKeys);
  dzListen(window, 'blur', dzReleaseKeys);
}
/* the page had no context-loss handling: every draw becomes a no-op and telemetry keeps saying ready */
let dzContextLost = false;
dzListen(canvas, 'webglcontextlost', () => { dzContextLost = true; if (typeof options.onContextLost === 'function') options.onContextLost(); });
const dzIntervals = [];
function dzInterval(fn, ms) { const id = setInterval(fn, ms); dzIntervals.push(id); return id; }
let dzRaf = 0, dzDisposed = false;
function dzScheduleFrame() {                                  // the page's requestAnimationFrame(frame)
  if (dzDisposed || !dzAutoStart) return;
  if (dzRaf) cancelAnimationFrame(dzRaf);                     // one pending frame at most, whoever asked
  dzRaf = requestAnimationFrame(frame);
}
function dzDispose() {
  if (dzDisposed) return;
  dzDisposed = true;
  if (dzRaf) cancelAnimationFrame(dzRaf);
  dzRaf = 0;
  for (const [target, type, handler, opts] of dzListeners) target.removeEventListener(type, handler, opts);
  dzListeners.length = 0;
  for (const id of dzIntervals) clearInterval(id);
  dzIntervals.length = 0;
  try { if (document.pointerLockElement === canvas) document.exitPointerLock(); } catch (e) { /* not locked */ }
  /* end the three things that would otherwise keep ticking on their own requestAnimationFrame */
  try { if (dzApiTarget.stopPlay) dzApiTarget.stopPlay(); } catch (e) { /* not built yet */ }
  try { if (dzApiTarget.cancelRender) dzApiTarget.cancelRender(); } catch (e) { /* not built yet */ }
  try { dzDive = 0; } catch (e) { /* disposed before the script reached it */ }
  /* options.loseContextOnDispose: drop every GL object this instance made (programs, textures, the
     deep compile in flight). The canvas cannot be used again afterwards: mount a fresh one. */
  if (options.loseContextOnDispose) {
    try { const ext = gl && gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); } catch (e) { /* no context was made */ }
  }
  for (const [key, value] of dzPublished) { if (window['__' + key] === value) delete window['__' + key]; }
  dzPublished.clear();
  dzScaffold.remove();
}
/* ════════ BEGIN ported page script — mandelbulb_deepzoom 3b65946:index.html ════════ */
/* =============================================================================
   GOLDEN PROBLEM HARNESS — Mandelbulb PERTURBATION DEEP-ZOOM RENDERER (Fable)
   -----------------------------------------------------------------------------
   The f32 baseline (below) is unchanged and used above ~1e-4 view scale.
   DEEP MODE (auto below 1e-4, key P to force) fills the prep stubs:
     • [DS-SEAM]   camera position is BigInt fixed-point (P=256, hp-orbit.test.mjs
                   factory). The reference orbit is rebuilt AT the camera each frame
                   → per-pixel offset is exactly  δc(t) = t·rd  with t carried in HDR.
     • [PERT-STUB] KERNEL_CORE: the shared-exponent δ kernel (docs/scaled-kernel-and-
                   accuracy.md) — certified against the BigInt direct referee by
                   direct-check.test.mjs; it replaced the first, per-number-exponent
                   kernel in 2026-10 (4-5× faster, 20-300× lower surface error).
                   March: per step run pertOrbit(δc), de in HDR, depth-scaled hit
                   epsilon de/t < pixel cone angle, t += 0.85·de (all HDR).
     • GROUND-TRUTH GATE (brief §4): an independent CPU f64-perturbed march of the
       center pixel (cancellation-free stableDelta + Δr/Δdr, JS) runs every ~0.5 s;
       HUD shows rel-t agreement GPU vs CPU. A pretty picture that fails the gate
       is a bug, not a zoom.
   LOCKED RULES obeyed (FABLE_BRIEF §8): δ = f32 mantissa + integer exponent (shared per
   vector), never double-single / error-free transforms; residual stableDelta forms;
   pure Zhuoran rebase (+ exhaustion wrap w/ Δdr re-anchor); reference len ≥ pixel
   iteration budget (orbit built to iters+2, exhaustion wrap covers early escape);
   BigInt fixed-point reference; orbit texture rows V/R | trig | R^N,R^7 HDR | DR HDR.
   ============================================================================= */

/* EMBED MODE (?embed=1): the page runs inside a host's iframe and is driven through api.dz
   (grep "HOST HANDLE"). Its own chrome is hidden by CSS (body.embed), its panels never open, and
   stopping a recording keeps the path in memory instead of downloading it — the host owns saving. */
const EMBED = options.embed !== false;
if (EMBED) dzScaffold.classList.add('embed');
/* canvas: the createDeepZoom argument (the page looked up #gl here) */
const gl = canvas.getContext('webgl2', { antialias:false, preserveDrawingBuffer:false });
if (!gl) { dzScaffold.innerHTML = '<p style="color:#f66">WebGL2 unavailable</p>'; dzDispose(); throw new Error('WebGL2 unavailable'); }
gl.getExtension('EXT_color_buffer_float');
const floatBlend = gl.getExtension('EXT_float_blend');   // running-average accumulation into a float target

/* ── power n + phase ψ (live; no recompile — N is a uniform, the binomial coeffs are uniforms,
   phase is a constant angle offset the perturbation math is invariant to). Default n=8, ψ=0 must
   reproduce the certified power-8 kernel byte-for-byte (binomials C(8,k) are exact integers). ── */
let nPower = 8;                                  // integer Mandelbulb power (clamped [2,16])
let phaseTheta = 0, phasePhi = 0;                // constant lobe-twist offsets on nθ, nφ
const binom = (n) => { const c=[]; let v=1; for (let k=1;k<=n;k++){ v=v*(n-k+1)/k; c.push(v);} return c; };  // [C(n,1)..C(n,n)]
function binomPad(n){ const c = binom(n), a = new Float32Array(17); for (let k=0;k<c.length;k++) a[k]=c[k]; return a; }
let binomN = binomPad(nPower), binomN1 = binomPad(nPower-1);   // for (1+u)^n and (1+u)^(n-1)

/* ════════ KERNEL CORE (GLSL ES 3.00) — VERBATIM from gpu-kernel.html ════════ */
const KERNEL_CORE = `
#ifdef USE_STATS
/* per-pixel work counters, read back through probes 4 / 5 by __stats (diagnostics variant only) */
int gOrbits = 0, gWork = 0, gIters = 0, gBig = 0, gBis = 0;
#endif
vec2 hdrFromFloat(float v) {
  if (v == 0.0) return vec2(0.0, 0.0);
  float e = floor(log2(abs(v)));
  return vec2(v * exp2(-e), e);
}
float hdrToFloat(vec2 h) { return h.x * exp2(h.y); }
vec2 hdrReduce(vec2 h) {
  if (h.x == 0.0) return vec2(0.0, 0.0);
  float adj = floor(log2(abs(h.x)));
  return vec2(h.x * exp2(-adj), h.y + adj);
}
vec2 hdrAdd(vec2 a, vec2 b) {
  if (a.x == 0.0) return b;
  if (b.x == 0.0) return a;
  if (a.y >= b.y) {
    float shift = b.y - a.y;
    if (shift < -40.0) return a;
    return hdrReduce(vec2(a.x + b.x * exp2(shift), a.y));
  } else {
    float shift = a.y - b.y;
    if (shift < -40.0) return b;
    return hdrReduce(vec2(b.x + a.x * exp2(shift), b.y));
  }
}
vec2 hdrSub(vec2 a, vec2 b) { return hdrAdd(a, vec2(-b.x, b.y)); }
/* hdrMul fast path: both mantissas are normalized to |m| ∈ [1,2), so the product is in
   [1,4) → at most one halving (never a multiply-up). Bit-exact with hdrReduce here but
   without the log2/exp2. */
vec2 hdrMul(vec2 a, vec2 b) {
  float m = a.x * b.x; if (m == 0.0) return vec2(0.0, 0.0);
  float e = a.y + b.y;
  if (abs(m) >= 2.0) { m *= 0.5; e += 1.0; }
  return vec2(m, e);
}
vec2 hdrMulF(vec2 h, float s) { return hdrReduce(vec2(h.x * s, h.y)); }
/* hdrRecip fast path: h.x ∈ [1,2) ⇒ 1/h.x ∈ (0.5,1] → at most one doubling. The test
   MUST be abs(r)<1.0 (not r<1.0): a mantissa of exactly −1 has |1/h.x|=1 and must not double. */
vec2 hdrRecip(vec2 h) {
  if (h.x == 0.0) return vec2(0.0, 0.0);
  float r = 1.0 / h.x;
  return abs(r) < 1.0 ? vec2(r * 2.0, -h.y - 1.0) : vec2(r, -h.y);
}
/* magnitude compare for positive HDR values (mantissa normalized to [1,2)) */
bool hdrGtPos(vec2 a, vec2 b){ return a.y > b.y || (a.y == b.y && a.x > b.x); }
struct Hdr3 { vec2 x; vec2 y; vec2 z; };
/* ════════ BLA (bivariate linear approximation) skip-table runtime ════════
   A precomputed table of composed linear operators (blaBuild, CPU f64) skips RUNS of perturbation
   iterations: δ' = A·δ + B·δc, Δdr' = g·δ + a·Δdr + h·δc. The table is an RGBA32F texture
   (uBlaTab): row = level (1..uBlaMaxLvl), column = runIdx·9 + j — layout in packBlaTexture.
   #ifdef'd OUT of the plain program so that one compiles fast; the variant that defines USE_BLA
   is built in the background. */
#ifdef USE_BLA
int blaTrailingZeros(int m) {           // levels descend on trailing zeros of m
  int n = 0;
  for (int i = 0; i < 24; i++) { if ((m & 1) != 0) break; m >>= 1; n++; }
  return n;
}
#endif
struct OrbitOut { Hdr3 d; vec2 Dr; vec2 Ddr; vec2 de; int iters; int rebases; bool escaped; float trap; float escR; };
/* ════════ THE δ KERNEL — shared exponent ════════
   The §3 residual forms, Zhuoran rebase, escape and reference-exhaustion logic of
   docs/triplex-perturbation-math.md, with δ carried as ONE vec3 of plain f32 mantissas and ONE
   integer exponent (δ = D·2^e). Every δ-linear quantity inside a step shares that exponent, so
   the step is plain f32 arithmetic and the exponent is handled ONCE per iteration (align on
   "+ δc", renormalise). The first kernel carried every number as its own mantissa/exponent pair
   and spent ~70 log2 + ~100 exp2 per iteration on that bookkeeping; this form is 4-5× faster
   (docs/scaled-kernel-and-accuracy.md). Second-order terms carry an explicit factor s = 2^e and
   underflow to 0 at depth. No mantissa precision is given up: each component is still a full
   f32, and components may differ by up to 2^126 before the smaller one is lost.
   Still mantissa + integer exponent, with NO error-free transforms (those collapse on NVIDIA).
   Δdr / DR / de stay HDR pairs: scalar, a handful of ops per iteration, and they overflow f32. */
const float SCL_EZ = -1.0e6;                   // exponent given to an exactly-zero value (2^SCL_EZ ≡ 0)
float sclPow2(float x) { return exp2(max(x, -160.0)); }      // 2^x; anything below 2^-149 is 0 in f32
float sclMax(vec3 v) { return max(abs(v.x), max(abs(v.y), abs(v.z))); }
float sclComp(vec2 h, float e) { return h.x == 0.0 ? 0.0 : h.x * sclPow2(h.y - e); }
void sclFromH3(Hdr3 h, out vec3 D, out float e) {            // three HDR pairs → shared exponent
  e = SCL_EZ;
  if (h.x.x != 0.0) e = max(e, h.x.y);
  if (h.y.x != 0.0) e = max(e, h.y.y);
  if (h.z.x != 0.0) e = max(e, h.z.y);
  D = vec3(sclComp(h.x, e), sclComp(h.y, e), sclComp(h.z, e));
}
Hdr3 sclToH3(vec3 D, float e) {
  return Hdr3(hdrReduce(vec2(D.x, e)), hdrReduce(vec2(D.y, e)), hdrReduce(vec2(D.z, e)));
}
void sclNorm(inout vec3 D, inout float e) {                   // bring max|D| back to [1,2)
  float m = sclMax(D);
  if (m == 0.0) { e = SCL_EZ; return; }
  float adj = floor(log2(m));
  D *= exp2(-adj); e += adj;
}
/* A·2^ea + B·2^eb for two shared-exponent vectors (either may be exactly zero) */
void sclAdd(vec3 A, float ea, vec3 B, float eb, out vec3 D, out float e) {
  if (sclMax(A) == 0.0) ea = SCL_EZ;
  if (sclMax(B) == 0.0) eb = SCL_EZ;
  e = max(ea, eb);
  D = A * sclPow2(ea - e) + B * sclPow2(eb - e);
}
/* a.x·2^a.y + b.x·2^b.y for scalars whose mantissas need NOT be normalised */
vec2 sclAdd2(vec2 a, vec2 b) {
  if (a.x == 0.0) a.y = SCL_EZ;
  if (b.x == 0.0) b.y = SCL_EZ;
  float e = max(a.y, b.y);
  return vec2(a.x * sclPow2(a.y - e) + b.x * sclPow2(b.y - e), e);
}
/* f32-accurate atan2 (peak relative error ~2e-7): octant reduction + the Cephes atanf polynomial.
   The ANGLE/D3D11 built-in atan is only good to ~1.2e-5 rad on every form and range (measured,
   gpu-funcs.test.mjs) — ~1800 f32 epsilons. Through the ×n angle multiplication that put a
   ~1e-4 error into every orbit step taking the large-angle branch (the last iterations of each
   orbit, and everything after a rebase), identically in any kernel that calls it. */
float atan2Acc(float y, float x) {
  float ax = abs(x), ay = abs(y);
  float t = min(ax, ay) / max(ax, ay);                                        // [0,1]
  float base = 0.0;
  if (t > 0.41421356) { base = 0.78539816; t = (t - 1.0) / (t + 1.0); }       // → |t| ≤ tan(π/8)
  float z = t * t;
  float a = base + ((((8.05374449538e-2 * z - 1.38776856032e-1) * z + 1.99777106478e-1) * z - 3.33329491539e-1) * z * t + t);
  if (ay > ax) a = 1.57079633 - a;
  if (x < 0.0) a = 3.14159265 - a;
  return y < 0.0 ? -a : a;
}
/* atan2(num·s, den)/s — an angle delta as a mantissa on the shared exponent (s = 2^e).
   Exact series below ratio 0.1; atan2Acc above it, never the built-in. */
float sclAtan(float num, float den, float s) {
  float r = num * s / den;
#ifdef USE_STATS
  if (abs(r) > 0.1) gBig++;
#endif
  if (abs(r) > 0.1) return atan2Acc(num * s, den) / s;
  float r2 = r * r;
  return (num / den) * (1.0 - r2 * (0.33333333 - r2 * (0.2 - r2 * 0.14285714)));
}
/* f32-accurate sin(x) and cos(x)−1 for any |x| up to a few hundred: Cody–Waite reduction to
   |y| ≤ π/4 (π/2 split in three parts) + the Cephes sinf/cosf polynomials, quadrant swap.
   Two reasons it replaces the built-ins on the large-angle branch:
     • D3D11 sin/cos are good to ~1e-6 absolute only (~16 f32 epsilons, gpu-funcs.test.mjs);
     • cos−1 was formed as −sin²/(1+cos), which is 0/0 near x = π (mod 2π): at |x−π| = 0.01 the
       built-in's 7e-7 error in cos is a ~1e-2 relative error in cos−1. Here cos−1 comes straight
       from the polynomial in the first quadrant and as (cos − 1) elsewhere — never a cancellation. */
void sinCosm1Acc(float x, out float sn, out float cm1) {
  float j = floor(x * 0.636619772 + 0.5);                                   // nearest multiple of π/2
  float y = ((x - j * 1.5703125) - j * 4.837512969970703125e-4) - j * 7.54978995489188e-8;
  float z = y * y;
  float sy = y + y * z * ((-1.9515295891e-4 * z + 8.3321608736e-3) * z - 1.6666654611e-1);
  float cm1y = z * (-0.5 + z * ((2.443315711809948e-5 * z - 1.388731625493765e-3) * z + 4.166664568298827e-2));
  float cy = 1.0 + cm1y;
  float q = j - 4.0 * floor(j * 0.25);                                      // j mod 4 → 0,1,2,3
  sn = q < 0.5 ? sy : q < 1.5 ? cy : q < 2.5 ? -sy : -cy;
  float cs = q < 1.5 ? -sy : q < 2.5 ? -cy : sy;                            // cos(x) for q = 1,2,3
  cm1 = q < 0.5 ? cm1y : cs - 1.0;
}
/* sin(x) and cos(x)−1 for x = xM·s, both returned as mantissas on the shared exponent
   (cos−1 is second order: its mantissa carries one factor of s). Series below 0.1; the
   large-angle side uses sinCosm1Acc, never the built-ins. */
void sclSinCosm1(float xM, float s, out float sM, out float cM) {
  float xf = xM * s;
  if (abs(xf) > 0.1) {
    float sx, c1;
    sinCosm1Acc(xf, sx, c1);
    sM = sx / s;
    cM = c1 / s;
  } else {
    float x2 = xf * xf;
    sM = xM * (1.0 - x2 * 0.16666667 + x2 * x2 * 0.0083333333);
    cM = xM * xf * (-0.5 * (1.0 - x2 * 0.083333333 + x2 * x2 * 0.0027777778));
  }
}
OrbitOut pertOrbit(sampler2D orbit, int orbitLen, Hdr3 dc, int maxIter) {
  vec3 C; float ec;
  sclFromH3(dc, C, ec);                        // δc = C·2^ec, constant along the orbit
  vec3 D = C; float e = ec;                    // δ  = D·2^e
  vec2 Ddr = vec2(0.0);
  int m = 0, rebases = 0, it = 0;
  bool escaped = false;
  float trap = 1e30;
  float escR2 = 4.0;
  /* (V,R) and DR at the CURRENT reference index m are carried across iterations: the escape /
     rebase test already fetches them for m+1, so the next step needs only rows 1 and 2
     (4 fetches per iteration instead of 6, none at a rebase or at the end). */
  vec4 T00 = texelFetch(orbit, ivec2(0, 0), 0);
  vec2 DR00 = texelFetch(orbit, ivec2(0, 3), 0).xy;
  vec4 cT0 = T00; vec2 cDR = DR00;
#ifdef USE_BLA
  float lenC = length(C);                                    // |δc| mantissa (exponent ec) for BLA validity
#endif
  for (int loop = 0; loop < 512; loop++) {
    if (it >= maxIter) break;
    bool applied = false;
#ifdef USE_STATS
    gWork++;                                   // one loop pass = one real step OR one BLA skip
#endif
#ifdef USE_BLA
    if (uBla == 1) {
      /* Descend BLA levels: lvlMax = trailing-zeros(m) (m = 0 ⇒ maxLvl). Apply the deepest run
         whose validity bound |δ| + rB·|δc| ≤ rA holds (conservative, sound — within it Zhuoran
         cannot fire and escape cannot cross bailout). The bound is brought onto rA's exponent and
         tested as one float compare; a run is plain mat3·vec3 arithmetic (table: packBlaTexture). */
      int lvlMax = (m == 0) ? uBlaMaxLvl : min(uBlaMaxLvl, blaTrailingZeros(m));
      float lenD = length(D);
      for (int lvl = lvlMax; lvl >= 1; lvl--) {
        int span = 1 << lvl;
        if (m + span > uBlaUsable) continue;
        if (it + span > maxIter) continue;
        int x0 = (m >> lvl) * 9;
        vec4 rr = texelFetch(uBlaTab, ivec2(x0, lvl), 0);        // (rA.m, rA.e, rB.m, rB.e)
        if (rr.x <= 0.0) continue;                               // rA = 0 ⇒ run invalid (escape-unsafe)
        float lhs = lenD * exp2(clamp(e - rr.y, -160.0, 120.0))
                  + rr.z * lenC * exp2(clamp(rr.w + ec - rr.y, -160.0, 120.0));
        if (lhs > rr.x) continue;                                // |δ| + rB·|δc| > rA ⇒ linearisation not valid
        vec4 a1 = texelFetch(uBlaTab, ivec2(x0 + 1, lvl), 0);    // A rows (xyz) | eA, eB, eg (w)
        vec4 a2 = texelFetch(uBlaTab, ivec2(x0 + 2, lvl), 0);
        vec4 a3 = texelFetch(uBlaTab, ivec2(x0 + 3, lvl), 0);
        vec4 b1 = texelFetch(uBlaTab, ivec2(x0 + 4, lvl), 0);    // B rows (xyz) | eh, a.m, a.e (w)
        vec4 b2 = texelFetch(uBlaTab, ivec2(x0 + 5, lvl), 0);
        vec4 b3 = texelFetch(uBlaTab, ivec2(x0 + 6, lvl), 0);
        vec3 gv = texelFetch(uBlaTab, ivec2(x0 + 7, lvl), 0).xyz;
        vec3 hv = texelFetch(uBlaTab, ivec2(x0 + 8, lvl), 0).xyz;
        /* Δdr ← g·δ + a·Δdr + h·δc   (the OLD δ and the OLD Δdr) */
        vec2 sdr = sclAdd2(vec2(dot(gv, D), a3.w + e), vec2(b2.w * Ddr.x, b3.w + Ddr.y));
        Ddr = hdrReduce(sclAdd2(sdr, vec2(dot(hv, C), b1.w + ec)));
        /* δ ← A·δ + B·δc */
        vec3 AD = vec3(dot(a1.xyz, D), dot(a2.xyz, D), dot(a3.xyz, D));
        vec3 BC = vec3(dot(b1.xyz, C), dot(b2.xyz, C), dot(b3.xyz, C));
        float eAD = a1.w + e, eBC = a2.w + ec;
        sclAdd(AD, eAD, BC, eBC, D, e);
        sclNorm(D, e);
        m += span; it += span;
        applied = true;
        break;
      }
    }
#endif
    if (!applied) {
      vec4 t1 = texelFetch(orbit, ivec2(m, 1), 0);           // sin/cos of the reference output angles
      vec4 t2 = texelFetch(orbit, ivec2(m, 2), 0);           // R^n (xy), R^(n-1) (zw) as HDR pairs
      vec3 V = cT0.xyz; float R = cT0.w;
      float sa = t1.x, ca = t1.y, sb = t1.z, cb = t1.w;
      float s = sclPow2(e);
      vec3 df = D * s;                                        // δ as plain f32 (0 at depth) — "O(1) + δ" sums only
      /* §3a radius: q = s·Q, Δr = s·DrM */
      float Q = 2.0 * dot(V, D) + s * dot(D, D);
      float r2f = sqrt(max(R * R + s * Q, 0.0));
      float DrM = Q / (r2f + R);
      float uM = DrM / R;                                     // u = Δr/R = uM·2^e
      float uf = uM * s;
      /* §3b (1+u)^n − 1 = gN·2^e and (1+u)^(n−1) − 1 = gN1·2^e — exact binomial Horner */
      float pN = uBinomN[uPowerI-1];
      for (int k = uPowerI-2; k >= 0; k--) pN = pN*uf + uBinomN[k];
      int n1 = uPowerI - 1;
      float pN1 = uBinomN1[n1-1];
      for (int k = n1-2; k >= 0; k--) pN1 = pN1*uf + uBinomN1[k];
      float gN = uM * pN, gN1 = uM * pN1;
      /* Δdr ← n·R^(n−1)·( gN1·2^e·DR + (1 + gN1·s)·Δdr )   (= n·(Dp·DR + (Rp+Dp)·Δdr), Dp = Rp·gN1·2^e) */
      vec2 dsum = sclAdd2(vec2(gN1 * cDR.x, e + cDR.y), vec2((1.0 + gN1 * s) * Ddr.x, Ddr.y));
      Ddr = hdrReduce(vec2(dsum.x * uPower * t2.z, dsum.y + t2.w));
      /* §3c EXACT angle deltas (atan2 of cross/dot residuals), mantissas on e */
      float NP = D.y * V.x - D.x * V.y;
      float denPhi = V.x * (V.x + df.x) + V.y * (V.y + df.y);
      float DphiM = sclAtan(NP, denPhi, s);
      float rho = length(V.xy);
      float QR = 2.0 * (D.x * V.x + D.y * V.y) + s * (D.x * D.x + D.y * D.y);
      float rhoP = sqrt(max(rho * rho + s * QR, 0.0));
      float drhoM = QR / (rhoP + rho);
      float NT = drhoM * V.z - D.z * rho;
      float denTh = rho * rhoP + V.z * (V.z + df.z);
      float DthM = sclAtan(NT, denTh, s);
      /* §3d/e output-angle deltas → direction delta ΔD = DD·2^e (residual forms) */
      float sAM, cAM, sBM, cBM;
      sclSinCosm1(DthM * uPower, s, sAM, cAM);
      sclSinCosm1(DphiM * uPower, s, sBM, cBM);
      float dsA = cAM * sa + sAM * ca;
      float dcA = cAM * ca - sAM * sa;
      float dsB = cBM * sb + sBM * cb;
      float dcB = cBM * cb - sBM * sb;
      vec3 DD = vec3(dcB * sa + dsA * cb + s * dsA * dcB,
                     dsB * sa + dsA * sb + s * dsA * dsB,
                     dcA);
      /* §3f Δ = R^n·ΔD + Δ(R^n)·(D_ref + ΔD) = R^n·2^e·( DD + gN·(D_ref + s·DD) ) */
      vec3 Dref = vec3(sa * cb, sa * sb, ca);
      vec3 Dn = t2.x * (DD + gN * (Dref + s * DD));
      float en = e + t2.y;
      /* δ ← Δ + δc : align the two exponents once, renormalise once */
      sclAdd(Dn, en, C, ec, D, e);
      sclNorm(D, e);
      m++; it++;
    }
    cT0 = texelFetch(orbit, ivec2(m, 0), 0);                 // (V,R) and DR at the new index
    cDR = texelFetch(orbit, ivec2(m, 3), 0).xy;
    vec3 dz = D * sclPow2(e);
    vec3 zf = cT0.xyz + dz;
    float z2 = dot(zf, zf);
    trap = min(trap, z2);
    if (z2 > 4.0) { escaped = true; escR2 = z2; break; }
    if (z2 < dot(dz, dz) || m >= orbitLen - 1) {             // Zhuoran rebase / reference exhausted
      D = zf - T00.xyz; e = 0.0;
      sclNorm(D, e);
      Ddr = hdrAdd(hdrSub(cDR, vec2(1.0, 0.0)), Ddr);
      m = 0; rebases++;
      cT0 = T00; cDR = DR00;
    }
  }
  float sE = sclPow2(e);
  float QE = 2.0 * dot(cT0.xyz, D) + sE * dot(D, D);
  float r2f = sqrt(max(cT0.w * cT0.w + sE * QE, 0.0));
  vec2 Dr = hdrReduce(vec2(QE / (r2f + cT0.w), e));
  vec2 drH = hdrAdd(cDR, Ddr);
  float rF = max(r2f, 1e-12);
  vec2 de = hdrMul(hdrFromFloat(0.5 * rF * log(rF)), hdrRecip(drH));
#ifdef USE_STATS
  gOrbits++; gIters += it;
#endif
  return OrbitOut(sclToH3(D, e), Dr, Ddr, de, it, rebases, escaped, sqrt(trap), sqrt(escR2));
}
`;

/* ---------- shaders ---------- */
const VERT = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;

const FRAG = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2  uRes;
uniform vec3  uCamPos;
uniform vec3  uRight, uUp, uFwd;
uniform float uFovScale;
uniform float uPower;
uniform float uIters;
uniform float uPrecRatio;
uniform vec3  uLightDir;
uniform vec2  uPhase;
float deMandelbulb(vec3 pos){
    vec3 z = pos; float dr = 1.0; float r = 0.0;
    int N = int(uIters);
    for (int i=0;i<256;i++){
        if (i>=N) break;
        r = length(z);
        if (r > 2.0) break;
        float rp1 = pow(r, uPower-1.0);
        dr = rp1*uPower*dr + 1.0;
        float theta = acos(clamp(z.z/r,-1.0,1.0));
        float phi   = atan(z.y, z.x);
        theta = theta*uPower + uPhase.x; phi = phi*uPower + uPhase.y;
        float zr = rp1*r;
        z = zr*vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta)) + pos;
    }
    return 0.5*log(max(r,1e-8))*r/max(dr,1e-20);
}
vec3 normal(vec3 p, float e){
    vec2 k = vec2(1.,-1.);
    return normalize(
        k.xyy*deMandelbulb(p+k.xyy*e) + k.yyx*deMandelbulb(p+k.yyx*e) +
        k.yxy*deMandelbulb(p+k.yxy*e) + k.xxx*deMandelbulb(p+k.xxx*e));
}
void main(){
    vec2 uv = (gl_FragCoord.xy - 0.5*uRes) / uRes.y;
    vec3 ro = uCamPos;
    vec3 rd = normalize(uFwd + uFovScale*(uv.x*uRight + uv.y*uUp));
    float t = 0.0; float d = 1e9; int steps=0; bool hit=false;
    for (int i=0;i<512;i++){
        steps=i;
        vec3 p = ro + rd*t;
        d = deMandelbulb(p);
        float eps = max(1e-20, length(p)*uPrecRatio);
        if (d < eps){ hit=true; break; }
        if (t > 12.0) break;
        t += d*0.9;
    }
    vec3 col = vec3(0.02,0.03,0.05);
    if (hit){
        vec3 p = ro + rd*t;
        float eps = max(1e-20, length(p)*uPrecRatio);
        vec3 n = normal(p, eps*2.0);
        float diff = max(0.0, dot(n, uLightDir));
        float ao = 1.0 - float(steps)/512.0;
        col = (0.15 + 0.85*diff) * vec3(0.55,0.62,0.78) * (0.4+0.6*ao);
        col += pow(max(0.0,dot(reflect(rd,n),uLightDir)),24.0)*0.3;
    }
    col = pow(col, vec3(0.4545));
    o = vec4(col,1.0);
}`;

/* ---------- DEEP fragment shader: HDR-t perturbation march ---------- */
const DEEP_FRAG = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
out vec4 o;
uniform vec2  uRes;
uniform vec3  uRight, uUp, uFwd;
uniform float uFovScale;
uniform sampler2D uOrbit;
uniform int   uOrbitLen;
uniform int   uIters;
uniform vec2  uOrigin;           // framebuffer position of this draw's (0,0) pixel — a tiled export draws each tile at the corner of a tile-sized G-buffer
uniform float uRefE;             // the view's depth scale as a whole power of two: depth is written as log2(t) − uRefE
uniform int   uProbe;            // 1 = center-ray numeric probe (gate readback)
uniform vec2  uProbeT;           // probe ray parameter t (HDR) — de is evaluated AT this t
uniform vec2  uSpreadT;          // probe-2 grid spread (HDR): δc = spread·(uv.x·right + uv.y·up)
uniform float uPixAng;           // hit-epsilon cone half-angle — DISPLAY pixel, NOT render-res
                                 // (the ÷4-res-derived epsilon inflated geometry by ~6 display px)
uniform vec3  uCamPosF;          // f32 camera position — far-field (t > 1e-3) hybrid march only
uniform int   uNormalMode;       // 0 = none here (pass S derives it from the G-buffer's depth) | 1 = 3-tap | 2 = 4-tap
uniform int   uBisectMax;        // bisection iteration cap (default 12; early-break ends most ≪ this)
uniform vec2  uJitter;           // sub-pixel uv jitter for progressive (temporal) accumulation
uniform float uPower;            // Mandelbulb power n (float, for the ×n multiplies)
uniform int   uPowerI;           // power n (int, for the binomial Horner loop bound)
uniform float uBinomN[17];       // C(n,1..n)   — (1+u)^n − 1
uniform float uBinomN1[17];      // C(n-1,1..n-1) — (1+u)^(n-1) − 1
uniform vec2  uPhase;            // lobe-twist phase (θ, φ) — used by the f32 far-field DE only
uniform int   uColorMode;        // 0 = plain | 1 = iteration (escape time) | 2 = orbit trap (origin)
uniform int       uBla;          // 1 = BLA skip-table path on (else exact per-step §3)
uniform sampler2D uBlaTab;       // BLA run table — row=level, col=runIdx*14+j (RGBA32F)
uniform int       uBlaMaxLvl;    // deepest level present in the table
uniform int       uBlaUsable;    // runs must end at orbit index ≤ usable (= orbitLen-1)
uniform int       uNormalIters;  // PERF LEVER: >0 caps pertOrbit iters on the normal taps (0 = full uIters)
uniform int       uBisectIters;  // PERF LEVER: >0 caps pertOrbit iters on the bisection midpoint evals (0 = full uIters)
uniform float     uStepRelax;    // PERF LEVER: march step = relax·de (0 ⇒ shader default 0.85; >1 = over-relaxed sphere tracing)
uniform int       uMaxSteps;     // the near-field march's step budget, for pictures (the probes keep 256)
uniform vec2      uFarRelax;     // FAR RELAX: toward step factor x over y octaves of depth beyond uFarFrom (x = 0: off)
uniform float     uFarFrom;      // where FAR RELAX starts, as PASS G OUTPUT x (log2 t − uRefE)
uniform int       uLand;         // 1 = land a hit on the level de = pa·t instead of where the last step fell (grep HIT LANDING); 2 = only right of uLandSplit
uniform float     uLandSplit;    // compare view: the divider's framebuffer x
uniform int       uHitRefine;    // n > 0: bisect the last step n times onto the level de = pa·t (grep HIT REFINE); n < 0: |n| times, only right of uLandSplit
uniform int       uGuide;        // 1 = this jittered sample starts its march from the depth guide; 0 = from the camera
uniform float     uGuideK;       // guide back-off, in pixel cones
uniform int       uGuideR;       // guide neighbourhood radius in pixels (1 = 3×3, 2 = 5×5)
uniform sampler2D uGuideTex;     // per pixel, over the earlier samples: x = nearest near-field hit (as PASS G OUTPUT x; 1e30 = some sample missed)
${KERNEL_CORE}
/* plain f32 DE for the far-field hybrid segment (t > T_SWITCH the features are
   f32-resolvable; identical to the baseline shader's deMandelbulb, power n + phase) */
float deF32(vec3 pos){
    vec3 z = pos; float dr = 1.0, r = 0.0;
    int N = int(uIters);
    for (int i = 0; i < 256; i++) {
        if (i >= N) break;
        r = length(z);
        if (r > 2.0) break;
        float rp1 = pow(r, uPower-1.0);
        dr = rp1*uPower*dr + 1.0;
        float theta = acos(clamp(z.z/r, -1.0, 1.0)) * uPower + uPhase.x;
        float phi = atan(z.y, z.x) * uPower + uPhase.y;
        float zr = rp1*r;
        z = zr*vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta)) + pos;
    }
    return 0.5*log(max(r,1e-8))*r/max(dr,1e-20);
}
vec3 normalF32(vec3 p, float e){
    vec2 k = vec2(1.,-1.);
    return normalize(
        k.xyy*deF32(p+k.xyy*e) + k.yyx*deF32(p+k.yyx*e) +
        k.yxy*deF32(p+k.yxy*e) + k.xxx*deF32(p+k.xxx*e));
}
/* de (HDR) at ray parameter t (HDR) along f32 dir rd: δc = t·rd.
   esc=false ⇒ the orbit did NOT escape within budget ⇒ the point is inside the
   n-iteration surface — its de is WRAPPED GARBAGE and must be treated as a hit,
   never trusted for stepping (the second placement-failure mechanism). */
vec2 deAt(vec2 t, vec3 rd, int mi, out bool esc, out OrbitOut oo) {
  Hdr3 dp = Hdr3(hdrMulF(t, rd.x), hdrMulF(t, rd.y), hdrMulF(t, rd.z));
  oo = pertOrbit(uOrbit, uOrbitLen, dp, mi);
  esc = oo.escaped;
  return oo.de;
}
/* the palette PARAMETER from the (reused) hit orbit — no extra orbit march. Pass S turns it into a
   colour (grep colorFromParam).
   1 = SMOOTH escape-time bands (continuous, not integer-stepped);
   2 = origin orbit-trap, log-spread so deep zooms keep contrast instead of flattening. */
float paletteParam(OrbitOut co){
  if (uColorMode == 1) {
    /* fractional iteration count: iters + 1 − log(log|z|)/log n → smooth gradients, no banding */
    float mu = float(co.iters) + 1.0 - log(log(max(co.escR, 2.0001))) / log(uPower);
    return mu * 0.18;
  }
  /* min-|z| barely varies across a deep-zoom frame; log() spreads that compressed range
     back into visible, smooth contrast (the raw value gave one flat colour). */
  if (uColorMode == 2) return log(max(co.trap, 1e-30)) * 1.5;
  return 0.0;                                     // plain: pass S uses a constant colour
}
/* unit vector → one f32: octahedral map, 12 bits per axis, as the integer qx + 4096·qy (< 2^24, so
   exact in an f32 and through an RGBA32F texel). Decoded by octUnpack in pass S. */
float octPack(vec3 n){
  n /= abs(n.x) + abs(n.y) + abs(n.z);
  vec2 e = n.z >= 0.0 ? n.xy
         : (1.0 - abs(n.yx)) * vec2(n.x >= 0.0 ? 1.0 : -1.0, n.y >= 0.0 ? 1.0 : -1.0);
  vec2 q = floor(clamp(e * 0.5 + 0.5, 0.0, 1.0) * 4095.0 + 0.5);
  return q.x + q.y * 4096.0;
}
/* The near-field HDR perturbation march (capped anti-arm-skip stepping + bisection onto the
   n-iter boundary). Shared by the render path AND probe 3 (population study) so they march
   IDENTICALLY. Returns the surface t (HDR); sets hit, steps, de-at-hit, and tF≥0 if the ray
   handed off to the far-field f32 segment (t>T_SWITCH). The march starts at t0: 0 = the camera
   (always, for the probes), else a guided start, which is zeroed again if its re-check fails. */
vec2 marchNear(vec3 rd, float pa, inout vec2 t0, out bool hit, out int steps, out vec2 deOut, out float tF, out OrbitOut hitOrbit) {
  vec2 t = t0, tPrev = t0, cap = vec2(0.0), de = vec2(0.0), dePrev = vec2(0.0);
  hit = false; steps = 0; tF = -1.0; bool esc = false;
  OrbitOut oo; OrbitOut lastOO; lastOO.escaped = false;   // last surface-side orbit → reused for colour
  int budget = uProbe == 0 ? uMaxSteps : 256;        // the probes referee the plain march: 256 steps, no relaxing
  int refine = uProbe != 0 ? 0 : uHitRefine > 0 ? uHitRefine : (gl_FragCoord.x + uOrigin.x >= uLandSplit ? -uHitRefine : 0);   // HIT REFINE
  for (int st = 0; st < budget; st++) {
    steps = st;
    de = deAt(t, rd, uIters, esc, oo);
    lastOO = oo;
    if (st == 0 && t0.x != 0.0) {
      /* GUIDED START re-check (t0 ≠ 0 only for a guided sample). The guide is a promise that
         nothing lies in front of t0, so the start point must be OUTSIDE the surface: escaped, and
         not already within hit tolerance (a surface that close, this far in front of every earlier
         hit, is one no earlier sample saw). Otherwise drop the guide — t0 is zeroed, which the
         caller reads as "this ray marched in full" — and march from the camera. A grazing ray
         legitimately starts with a small de, so nothing stricter than the hit test is asked. */
      if (!esc || de.x <= 0.0 || hdrToFloat(hdrMul(de, hdrRecip(t))) < pa) {
        t0 = vec2(0.0); t = vec2(0.0); tPrev = vec2(0.0);
        continue;
      }
    }
    if (!esc || de.x <= 0.0) {
      /* bracket [tPrev,t] starts at the LAST (capped) step, already ≪ the cone, so the
         w<0.25·pa early-break ends most bisections in a few iters; uBisectMax (≈12) just
         bounds the worst lane (warp divergence makes all lanes pay the slowest). */
      for (int b = 0; b < 32; b++) {
        if (b >= uBisectMax) break;
#ifdef USE_STATS
        gBis++;
#endif
        vec2 tm = hdrMulF(hdrAdd(tPrev, t), 0.5);
        bool me; OrbitOut moo; vec2 md = deAt(tm, rd, (uBisectIters > 0 ? min(uIters, uBisectIters) : uIters), me, moo);
        if (!me || md.x <= 0.0) t = tm; else { tPrev = tm; de = md; lastOO = moo; }
        float w = hdrToFloat(hdrMul(hdrSub(t, tPrev), hdrRecip(t)));
        if (w < 0.25 * pa) break;
      }
      t = tPrev; hit = true; break;                  // escaped-side boundary point
    }
    if (t.x != 0.0) {
      float ratio = hdrToFloat(hdrMul(de, hdrRecip(t)));
      if (ratio < pa) {
        /* HIT LANDING (uLand, off by default — it moves the surface, so the CPU referee
           pertMarchJS would have to follow before it becomes the default). A hit is accepted
           wherever the first step with de < pa·t happens to fall: anywhere in the last step,
           which on a grazing surface is many pixels of depth. That scatter is harmless to a
           normal taken from the distance field and is grain to one taken from depth. Both ends
           of the last step are known — tPrev with de ≥ pa·t, t with de < pa·t — so put the hit
           where the line through them crosses de = pa·t. No extra orbit. Everything is a ratio
           to tPrev, so no magnitude touches f32. */
        if (refine == 0 && (uLand == 1 || (uLand == 2 && gl_FragCoord.x + uOrigin.x >= uLandSplit)) && tPrev.x != 0.0 && dePrev.x > 0.0) {
          float r0 = hdrToFloat(hdrMul(dePrev, hdrRecip(tPrev)));
          float u  = hdrToFloat(hdrMul(hdrSub(t, tPrev), hdrRecip(tPrev)));
          float g0 = r0 - pa, g1 = (ratio - pa) * (1.0 + u);
          t = hdrMulF(tPrev, 1.0 + u * clamp(g0 / max(g0 - g1, 1e-30), 0.0, 1.0));
        }
        /* HIT REFINE (uHitRefine, off by default: it moves the surface, so the CPU referee
           pertMarchJS would have to follow before it becomes the default). The hit above is
           wherever the first step with de < pa·t fell - anywhere in the last step - and the
           steps of neighbouring rays fall in step with each other, so the depth comes out in
           terraces that shading from the depth buffer draws as cuts and contour lines (the
           owner's 2.76e-39 view, 2026-10-08: "slicing - a stepping issue"). Both ends of the
           last step are known - tPrev with de >= pa·t, t with de < pa·t - so halve that bracket n
           times, keeping one end on each side, and stand on the last hit-side point found: the
           hit is then within step / 2^n of a crossing of the level, whatever the step pattern.
           One orbit per halving, on rays that hit only. Measured that day, share of pixels that
           differ from a slow march (step 0.10, 8 halvings), one sample: an ordinary 1e-17 view
           9.9 % -> 0.9 % with 4 halvings (render time x1.44); the 2.76e-39 view 57 % -> 35 %,
           and 2.8 % with step 0.5 and 3 halvings (x1.4), where step 0.2 alone needs x2.6 for
           2.4 %. It cannot find a surface the march stepped clean over: that takes a smaller
           step. HIT LANDING is the free, one-shot form of the same idea and is skipped here. */
        if (refine > 0 && tPrev.x != 0.0) {
          vec2 ra = tPrev, rb = t;
          for (int r = 0; r < 12; r++) {
            if (r >= refine) break;
            vec2 tm = hdrMulF(hdrAdd(ra, rb), 0.5);
            bool me; OrbitOut moo; vec2 md = deAt(tm, rd, uIters, me, moo);
            if (!me || md.x <= 0.0) { rb = tm; continue; }     // inside the n-iteration surface: the hit side, but not a point to stand on
            if (hdrToFloat(hdrMul(md, hdrRecip(tm))) < pa) { rb = tm; t = tm; de = md; lastOO = moo; }
            else ra = tm;
          }
        }
        hit = true; break;
      }
      if (hdrToFloat(t) > 1e-3) { tF = hdrToFloat(t); break; }   // hand off to f32 far-field
    }
    tPrev = t; dePrev = de;
    float relax = uStepRelax > 0.0 ? uStepRelax : 0.85;
    /* FAR RELAX. A ray that looks along the surface passes close to ridge after ridge on its way
       to distant ground, and a step is never longer than the distance to the nearest of them: with
       the detail slider up, a fifth of such a picture ran out of steps before it reached anything
       (far-study.mjs). So beyond uFarFrom — a few of the camera's own surface distances out, past
       everything an ordinary view contains — the step factor rises toward uFarRelax.x. A step
       that lands inside the surface is still caught and bisected back (above); what can be lost
       is a far feature thinner than the overshoot, which the ray then steps through: measured,
       0.1–1.6 % of a deep view's pixels show the surface behind the one they should. The near
       ground and every ordinary view are marched exactly as before. */
    if (uFarRelax.x > 0.0 && uProbe == 0 && t.x != 0.0)
      relax = mix(relax, max(relax, uFarRelax.x), clamp((log2(t.x) + (t.y - uRefE) - uFarFrom) / uFarRelax.y, 0.0, 1.0));
    vec2 step = hdrMulF(de, relax);
    if (cap.x == 0.0) cap = hdrMulF(de, 0.05);
    vec2 capEff = (t.x != 0.0 && hdrGtPos(t, cap)) ? t : cap;
    if (hdrGtPos(step, capEff)) step = capEff;
    cap = hdrMulF(cap, 1.25);
    t = hdrAdd(t, step);
  }
  deOut = de;
  hitOrbit = lastOO;
  return t;
}
void main(){
    vec2 uv = (gl_FragCoord.xy + uOrigin - 0.5*uRes) / uRes.y + uJitter;   // jitter ⇒ temporal supersample/denoise
    if (uProbe == 1) uv = vec2(0.0);
    vec3 rd = normalize(uFwd + uFovScale*(uv.x*uRight + uv.y*uUp));
    if (uProbe == 1) {
        /* POINTWISE gate probe: de at exactly t = uProbeT on the center ray.
           March-termination comparison is ill-conditioned (steps jump folds);
           same-input de comparison is the meaningful §4 ground-truth check. */
        bool pesc; OrbitOut poo;
        vec2 pde = deAt(uProbeT, rd, uIters, pesc, poo);
        o = vec4(pde, pesc ? 1.0 : 0.0, 0.0);
        return;
    }
    if (uProbe == 2) {
        /* POPULATION probe: one pertOrbit per grid pixel at transverse offset
           δc = spread·(uv.x·right + uv.y·up) — measures the near-critical pixel
           population (escape-flag flips vs the CPU referee) at view scale. */
        vec3 cv = uv.x*uRight + uv.y*uUp;
        Hdr3 dc = Hdr3(hdrMulF(uSpreadT, cv.x), hdrMulF(uSpreadT, cv.y), hdrMulF(uSpreadT, cv.z));
        OrbitOut oo = pertOrbit(uOrbit, uOrbitLen, dc, uIters);
        o = vec4(oo.de, oo.escaped ? 1.0 : 0.0, float(oo.iters));
        return;
    }
    float pixAng = uPixAng;                      // display-pixel cone half-angle ≈ hit epsilon / t
    bool hit = false; int steps = 0; bool exhausted = false; bool farHit = false;
    float tF = -1.0;                             // ≥0 once the far-field f32 segment takes over
    vec2 de = vec2(0.0);
    OrbitOut hitOrbit;
    vec2 t0 = vec2(0.0);
    if (uGuide == 1) {
      /* GUIDED START. Earlier jittered samples already found this pixel's surface; marching from
         the camera again spends most of its steps getting back there. uGuideTex holds, per pixel,
         the NEAREST near-field hit of every earlier sample (or 1e30 if any of them did not hit).
         Start uGuideK pixel cones in front of the nearest depth in the neighbourhood (±uGuideR):
         the jittered ray stays inside the centre pixel, and its neighbours bound what it can
         reach. Any neighbour without a clean record ⇒ no guide (silhouettes march in full).
         Not every sample is guided: the caller makes every few a full march (uGuide = 0), which
         re-discovers anything thin the neighbourhood missed and feeds the step-count shading. */
      ivec2 pc = ivec2(gl_FragCoord.xy + uOrigin), pmax = textureSize(uGuideTex, 0) - 1;
      float ln = 1e30; bool ok = true;
      for (int j = -uGuideR; j <= uGuideR; j++) for (int i = -uGuideR; i <= uGuideR; i++) {
        float g = texelFetch(uGuideTex, clamp(pc + ivec2(i, j), ivec2(0), pmax), 0).x;
        if (g > 1e29 || g < -1e29) ok = false; else ln = min(ln, g);
      }
      float back = 1.0 - uGuideK * pixAng;
      if (ok && back > 0.0) { float L = ln + log2(back), e = floor(L); t0 = vec2(exp2(L - e), e + uRefE); }
    }
    vec2 t = marchNear(rd, pixAng, t0, hit, steps, de, tF, hitOrbit);   // shared near-field HDR march (orbit reused for colour)
    bool guided = t0.x != 0.0;                    // this ray really started from the guide (its step count is not a full march's)
#ifdef USE_STATS
    int sOrb = gOrbits, sWork = gWork;           // march-only counts (the normal taps come after)
#endif
    if (uProbe == 3) {
        /* MARCH-POPULATION probe (SLICE 6b): emit the surface position from the SAME march the
           renderer runs (marchNear inlined ONCE) — the user-visible quantity. Output
           (tHit HDR, hitFlag, steps); the CPU referee (pertMarchJS, same bisection) mirrors it. */
        o = vec4(hit ? t : vec2(0.0), hit ? 1.0 : 0.0, float(steps));
        return;
    }
    if (uProbe == 6) {
        /* COLOUR-INPUT probe: the hit orbit's trap (min |z|) and escape-iteration count — the two
           things the palette is made from — at the surface point this pixel's march found.
           Output (tHit HDR, trap, iters; iters = −1 on a miss). __trapStudy referees both against a
           BigInt direct orbit of that same point. */
        o = vec4(hit ? t : vec2(0.0), hitOrbit.trap, hit ? float(hitOrbit.iters) : -1.0);
        return;
    }
    /* far-field f32 segment: features at t > T_SWITCH(=1e-3) are f32-resolvable; the f32
       camera position error (~1e-7 abs) is sub-cone at these distances. This is also
       what lets grazing/background rays at extreme depth terminate (they exhausted
       the 256-step HDR budget before). */
    if (!hit && tF > 0.0) {
        vec3 roF = uCamPosF;
        for (int st = 0; st < 256; st++) {
            vec3 p = roF + rd*tF;
            float d = deF32(p);
            if (d < pixAng*tF) { farHit = true; break; }
            if (tF > 12.0) break;
            tF += d*0.9;
        }
    } else if (!hit && tF < 0.0 && hdrToFloat(t) <= 1e-3) {
        exhausted = true;                                  // HDR budget ran out mid-field
    }
    /* ── PASS G OUTPUT — one RGBA32F texel per pixel; pass S (grep SHADE_FRAG) lights it ──
         x  log2(t) − uRefE of the hit (near or far); for a miss, where the march stopped. −1e30
            when t = 0. uRefE is a whole number near log2 of the view's surface distance: t's own
            exponent is a whole number too, so the subtraction is exact and what is stored is a
            few units in size — neighbouring pixels' depths can then be differenced to ~1e-7.
            (An absolute log2 t is −116 at 1e-35 and −1000 at 1e-300: its f32 rounding alone would
            tilt a depth-derived normal by 0.5° and 4°.)
         y  the palette parameter (near hits)
         z  steps + 256·kind (+ 1024 if the march started from the depth guide)
                                  kind 0 miss · 1 near hit · 2 far hit · 3 exhausted
         w  the surface normal, octahedral-packed (octPack); unused when uNormalMode = 0
       ONE output, always: on ANGLE/Direct3D 11 a second output layout is a second, blocking
       compile of this whole shader (8.6 s measured) — see HANDOFF.md. */
    float kind = 0.0, sPal = 0.0, nPack = 0.0;
    float lt = t.x != 0.0 ? log2(t.x) + (t.y - uRefE) : -1e30;
    if (hit) {
        kind = 1.0;
        sPal = paletteParam(hitOrbit);                    // reuse the march's hit orbit — no extra march
        if (uNormalMode != 0) {
            /* DE-gradient normal at offset scale e = 2·pixAng·t (all HDR; de/e ratios are O(1)).
               ESCAPE-AWARE: a tap landing unescaped is inside the surface — its wrapped de is
               garbage; use the boundary value 0. Mode 1 = 3-tap forward diff (reuse hit de as the
               base point, −25% taps); mode 2 = legacy 4-tap tetrahedron. */
            vec3 n = vec3(0.0);
            vec2 eH = hdrMulF(t, 2.0 * pixAng);
            if (eH.x == 0.0) eH = de.x != 0.0 ? hdrMulF(de, 4.0) : vec2(1.0, -30.0);
            vec2 ke = hdrRecip(eH);
            int nIt = uNormalIters > 0 ? min(uIters, uNormalIters) : uIters;   // PERF LEVER: capped iters for the gradient taps
            if (uNormalMode == 1) {
                float base = de.x != 0.0 ? hdrToFloat(hdrMul(de, ke)) : 0.0;
                for (int j = 0; j < 3; j++) {
                    vec3 kv = j==0 ? vec3(1.,0.,0.) : j==1 ? vec3(0.,1.,0.) : vec3(0.,0.,1.);
                    Hdr3 dp = Hdr3(
                        hdrAdd(hdrMulF(t, rd.x), hdrMulF(eH, kv.x)),
                        hdrAdd(hdrMulF(t, rd.y), hdrMulF(eH, kv.y)),
                        hdrAdd(hdrMulF(t, rd.z), hdrMulF(eH, kv.z)));
                    OrbitOut oo = pertOrbit(uOrbit, uOrbitLen, dp, nIt);
                    n[j] = (oo.escaped ? hdrToFloat(hdrMul(oo.de, ke)) : 0.0) - base;
                }
            } else {
                for (int j = 0; j < 4; j++) {
                    vec3 kv = j==0 ? vec3(1.,-1.,-1.) : j==1 ? vec3(-1.,-1.,1.) : j==2 ? vec3(-1.,1.,-1.) : vec3(1.,1.,1.);
                    Hdr3 dp = Hdr3(
                        hdrAdd(hdrMulF(t, rd.x), hdrMulF(eH, kv.x)),
                        hdrAdd(hdrMulF(t, rd.y), hdrMulF(eH, kv.y)),
                        hdrAdd(hdrMulF(t, rd.z), hdrMulF(eH, kv.z)));
                    OrbitOut oo = pertOrbit(uOrbit, uOrbitLen, dp, nIt);
                    n += kv * (oo.escaped ? hdrToFloat(hdrMul(oo.de, ke)) : 0.0);
                }
            }
            nPack = octPack(n);
        }
    } else if (farHit) {
        kind = 2.0;
        lt = log2(tF) - uRefE;
        nPack = octPack(normalF32(uCamPosF + rd*tF, 2.0*pixAng*tF));
    } else if (exhausted) {
        kind = 3.0;
    }
#ifdef USE_STATS
    if (uProbe == 4) { o = vec4(float(steps), float(sOrb), float(sWork), float(gWork)); return; }
    if (uProbe == 5) { o = vec4(kind, float(gIters), float(gBis), float(gBig)); return; }
#endif
    o = vec4(lt, sPal, min(float(steps), 255.0) + 256.0*kind + (guided ? 1024.0 : 0.0), nPack);
}`;

/* ---------- PASS S: shade the G-buffer ----------
   The deep render is two draws. Pass G (DEEP_FRAG, the heavy one) marches and writes what it found
   — depth, palette parameter, step count, normal — as one RGBA32F texel. This shader turns that
   texel into a lit, tone-mapped pixel. It is small (compiles in well under a second), so lighting
   and anything else that reads the buffers can change without touching the heavy shader.
   The ray direction is rebuilt from the pixel and the jitter exactly as pass G built it. */
const SHADE_FRAG = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
out vec4 o;
uniform sampler2D uG;            // pass G's output (layout: grep PASS G OUTPUT)
uniform vec2  uOrigin;           // G-buffer texel (0,0) is this framebuffer pixel (tiled export; else 0)
uniform vec2  uRes;
uniform vec3  uRight, uUp, uFwd;
uniform float uFovScale;
uniform vec2  uJitter;
uniform vec3  uLightDir;
uniform int   uNormalMode;       // 0 = screen-space (dFdx/dFdy of depth) | 3 = from depth, edge-aware | else the packed normal
uniform int   uColorMode;        // 0 = plain | 1 = iteration (escape time) | 2 = orbit trap (origin)
uniform float uColorScale;       // palette frequency
uniform sampler2D uGradient;     // loaded gradient strip (when uUseGradient=1)
uniform int   uUseGradient;      // 0 = built-in cosine palette | 1 = sample uGradient
uniform int   uLightMode;        // 0 = directional | 1 = camera headlamp | 2 = both
uniform sampler2D uGuideTex;     // the depth guide pass G started from (y = mean step count of this pixel's full marches)
uniform float uFalloffRel;       // log2 of the headlamp falloff length L (= surface distance · mul), minus pass G's uRefE
/* ── the new look ── */
uniform int   uLook;             // 0 = the classic shading below, untouched | 1 = the new look
uniform int   uView;             // 0 picture | 2 normals | 3 depth | 4 occlusion | 5 key light reaching the surface
uniform int   uSampleN;          // index of this jittered sample: turns the occlusion / shadow sampling patterns
uniform vec3  uPlaneN;           // the view's best-fit surface plane, its normal toward the camera (the light rig hangs off it)
uniform vec2  uDepthRange;       // depth (as PASS G OUTPUT x) of the nearest and farthest 5 % of the view
uniform float uSplitX;           // compare view: the divider's framebuffer x (< 0 = no compare)
uniform int   uCompare;          // 1 = normals: packed 4-tap left of the divider, from depth right of it
uniform vec4  uLookA;            // occlusion strength, occlusion radius (fraction of picture height), shadow strength, haze strength
uniform vec4  uLookB;            // key intensity, sky (dome) strength, -, colour saturation
uniform vec4  uLookC;            // -, light softness (tan of its half-angle), shadow reach (in depths), exposure
uniform vec4  uMat;              // GMT's material: roughness, metallic, reflectivity, diffuse
uniform vec3  uFillDir, uKickDir;// toward the fill light and the kicker (the key is uLightDir)
uniform vec3  uFillCol, uKickCol;// their colours times their intensities (the key is white times uLookB.x)
uniform vec3  uHaze;             // what distance fades to; also the background
uniform int   uNrmTap;           // normals from depth: how many pixels away the four taps are (1 = crisp; 2 or 3 = smoother)
/* palette: a loaded gradient strip if present, else the built-in IQ cosine palette */
vec3 palette(float s){
  if (uUseGradient == 1) return texture(uGradient, vec2(fract(s), 0.5)).rgb;
  return 0.5 + 0.5*cos(6.2831853*(s + vec3(0.0, 0.33, 0.67)));
}
/* surface colour from pass G's palette parameter (grep paletteParam) */
vec3 colorFromParam(float s){
  if (uColorMode == 0) return vec3(0.62,0.55,0.78);
  vec3 c = palette(s * uColorScale);
  float l = dot(c, vec3(0.299, 0.587, 0.114));   // gentle desaturation so the lit result isn't garish
  return mix(vec3(l), c, 0.82);
}
vec3 octUnpack(float f){                          // inverse of pass G's octPack
  float qy = floor(f / 4096.0), qx = f - qy * 4096.0;
  vec2 e = vec2(qx, qy) / 4095.0 * 2.0 - 1.0;
  vec3 v = vec3(e, 1.0 - abs(e.x) - abs(e.y));
  if (v.z < 0.0) v.xy = (1.0 - abs(v.yx)) * vec2(v.x >= 0.0 ? 1.0 : -1.0, v.y >= 0.0 ? 1.0 : -1.0);
  return normalize(v);
}
/* ── NORMALS FROM DEPTH (uNormalMode 3) ──
   The four neighbours' hit points against this pixel's, one difference per axis: the central
   difference where the two sides lie on one surface, else the side whose depth is nearer this
   pixel's (so a silhouette keeps the normal of its own side). No orbit — against four more for
   the 4-tap normal. Method and sources: docs/research-notes/gbuffer-techniques.md, section 1.
   Positions are in units of this pixel's depth: (P_i − P_c)/t_c = (rd_i − rd_c) + rd_i·(2^(L_i − L_c) − 1),
   two terms the size of a pixel angle, formed without the magnitude of t.
   Every ray of one sample has the same jitter, so the neighbours are exactly one pixel away. */
vec3 rayDir(ivec2 q){                             // as pass G builds it
    vec2 uv = (vec2(q) + 0.5 - 0.5*uRes) / uRes.y + uJitter;
    return normalize(uFwd + uFovScale*(uv.x*uRight + uv.y*uUp));
}
float exp2m1(float d){                            // 2^d − 1 without cancellation
    float x = d * 0.69314718;
    return abs(x) < 0.05 ? x*(1.0 + x*(0.5 + x*(0.16666667 + x*0.04166667))) : exp2(d) - 1.0;
}
bool depthTap(ivec2 q, float Lc, vec3 rdC, out vec3 D, out float dL){
    D = vec3(0.0); dL = 0.0;
    ivec2 gq = q - ivec2(uOrigin);
    if (any(lessThan(gq, ivec2(0))) || any(greaterThanEqual(gq, textureSize(uG, 0)))
        || any(lessThan(q, ivec2(0))) || any(greaterThanEqual(q, ivec2(uRes)))) return false;
    vec4 g = texelFetch(uG, gq, 0);
    float kind = floor((g.z >= 1024.0 ? g.z - 1024.0 : g.z) / 256.0);
    if (kind < 1.0 || kind > 2.0 || g.x < -1e29) return false;    // no surface there
    vec3 r = rayDir(q);
    dL = g.x - Lc;
    D = (r - rdC) + r * exp2m1(dL);
    return true;
}
vec3 axisTangent(bool okM, vec3 Dm, float dLm, bool okP, vec3 Dp, float dLp, vec3 flatT, float px){
    if (okM && okP) {
        float bend = 0.34657 * abs(dLm + dLp);    // how far this pixel sits off its neighbours' chord, as a fraction of t
        if (bend < 1.5 * px) return 0.5 * (Dp - Dm);
        return abs(dLm) < abs(dLp) ? -Dm : Dp;
    }
    if (okP) return Dp;
    if (okM) return -Dm;
    return flatT;                                 // a lone hit: a facet facing the camera
}
vec3 normalFromDepth(ivec2 c, float Lc, vec3 rdC){
    int k = max(uNrmTap, 1);
    float px = uFovScale / uRes.y * float(k);
    vec3 Dl, Dr, Dd, Du; float ll, lr, ld, lu;
    bool okl = depthTap(c + ivec2(-k, 0), Lc, rdC, Dl, ll);
    bool okr = depthTap(c + ivec2( k, 0), Lc, rdC, Dr, lr);
    bool okd = depthTap(c + ivec2( 0,-k), Lc, rdC, Dd, ld);
    bool oku = depthTap(c + ivec2( 0, k), Lc, rdC, Du, lu);
    vec3 h = axisTangent(okl, Dl, ll, okr, Dr, lr, rayDir(c + ivec2(k, 0)) - rdC, px);
    vec3 v = axisTangent(okd, Dd, ld, oku, Du, lu, rayDir(c + ivec2(0, k)) - rdC, px);
    vec3 n = normalize(cross(h, v));
    return dot(n, rdC) > 0.0 ? -n : n;            // toward the camera
}
float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }   // interleaved gradient noise
/* ── OCCLUSION FROM DEPTH ──
   How much of the sky above this point its surroundings hide: a spiral of taps around the pixel,
   each asked how high its hit point stands above this pixel's tangent plane. Half the taps fall
   in the inner quarter of the radius (crevices a few pixels wide), the rest reach out (cavities).
   A tap whose surface is far in front of or behind this one counts less: one depth layer cannot
   know what is behind it, and a foreground arm should not darken the wall behind it.
   The spiral turns with the pixel and with uSampleN, so a still's samples add up to a fine
   sampling and no blur pass is needed. Returns 0 (open) upward. */
float occlusion(ivec2 c, float Lc, vec3 rdC, vec3 n){
    const int TAPS = 10;
    float px = uFovScale / uRes.y;
    float Rpx = max(uLookA.y * uRes.y, 4.0);
    float rot = 6.2831853 * fract(ign(vec2(c)) + float(uSampleN) * 0.61803399);
    float jit = fract(ign(vec2(c) + 17.0) + float(uSampleN) * 0.75487767);
    float occ = 0.0;
    for (int i = 0; i < TAPS; i++) {
        float f = (float(i) + jit) / float(TAPS);
        float r = 1.5 + Rpx * f * f;
        float a = rot + float(i) * 2.3999632;
        vec3 D; float dL;
        if (!depthTap(c + ivec2(round(vec2(cos(a), sin(a)) * r)), Lc, rdC, D, dL)) continue;
        float d = length(D);
        float h = dot(D, n) / max(d, 1e-9);                       // sine of the tap's elevation above the tangent plane
        occ += max(0.0, h - 0.06) * (1.0 - smoothstep(1.5, 4.0, d / (r * px)));
    }
    return 2.2 * occ / float(TAPS);
}
/* ── SHADOW FROM DEPTH ──
   Walk from this pixel's hit point toward the key light, in steps that grow geometrically, and at
   each step look the point up in the depth buffer: if the visible surface there is in front of
   the walk point (by more than a bias, less than a thickness), something stands in the light.
   It sees only what is on screen — a caster outside the frame or hidden behind a nearer surface
   casts nothing. The light direction is tilted a little per sample (uLookC.y), so a still's
   samples add up to a soft edge. Returns 1 lit, 0 shadowed. Positions are in units of this
   pixel's depth, as everywhere in this pass. */
float shadowed(ivec2 c, float Lc, vec3 rdC, vec3 n, vec3 Ldir, float seed){
    const int STEPS = 20;
    float px = uFovScale / uRes.y;
    float jit = fract(ign(vec2(c) + 31.0 + seed) + float(uSampleN) * 0.61803399);
    float a1 = 6.2831853 * fract(ign(vec2(c) + 47.0 + seed) + float(uSampleN) * 0.75487767);
    float a2 = fract(ign(vec2(c) + 71.0 + seed) + float(uSampleN) * 0.56984029);
    vec3 t1 = normalize(cross(Ldir, abs(Ldir.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 t2 = cross(Ldir, t1);
    vec3 L = normalize(Ldir + uLookC.y * sqrt(a2) * (cos(a1) * t1 + sin(a1) * t2));
    float s0 = 1.5 * px, ratio = pow(uLookC.z / s0, 1.0 / float(STEPS));
    float s = s0 * pow(ratio, jit);
    vec3 P0 = rdC + n * (1.5 * px);                               // start a pixel and a half off the surface
    ivec2 gmax = textureSize(uG, 0);
    for (int i = 0; i < STEPS; i++) {
        vec3 Q = P0 + L * s;
        float zf = dot(Q, uFwd);
        if (zf <= 1e-4) break;
        vec2 fc = (vec2(dot(Q, uRight), dot(Q, uUp)) / (zf * uFovScale) - uJitter) * uRes.y + 0.5 * uRes;
        if (fc.x < 0.0 || fc.y < 0.0 || fc.x >= uRes.x || fc.y >= uRes.y) break;
        ivec2 gq = ivec2(fc) - ivec2(uOrigin);
        if (any(lessThan(gq, ivec2(0))) || any(greaterThanEqual(gq, gmax))) break;
        vec4 g = texelFetch(uG, gq, 0);
        float kind = floor((g.z >= 1024.0 ? g.z - 1024.0 : g.z) / 256.0);
        if ((kind == 1.0 || kind == 2.0) && g.x > -1e29) {
            float lq = length(Q);
            float behind = lq - exp2(g.x - Lc);                   // how far the walk point lies behind the visible surface
            if (behind > max(0.75 * px * lq, 0.08 * s) && behind < s + 6.0 * px) return 0.0;
        }
        s *= ratio;
    }
    return 1.0;
}
/* surface colour for the new look: white clay for "plain", else the palette at the saturation the look asks for */
vec3 albedoNew(float s){
    if (uColorMode == 0) return vec3(0.9);        // GMT's fresh Mandelbulb is white too (a one-stop white gradient)
    vec3 c = palette(s * uColorScale);            // used as it is, as GMT uses its gradient texels
    return mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, uLookB.w);
}
/* the sky as a dome light: GMT's fresh-scene gradient, ground #223344 to zenith #88ccff. "Up" here
   is the surface plane's normal — the open side of the wall in view — not a world axis. */
vec3 skyDome(float h){ return mix(vec3(0.133, 0.200, 0.267), vec3(0.533, 0.800, 1.000), clamp(h, 0.0, 1.0)); }
void main(){
    vec2 uv = (gl_FragCoord.xy - 0.5*uRes) / uRes.y + uJitter;
    vec3 rd = normalize(uFwd + uFovScale*(uv.x*uRight + uv.y*uUp));
    vec4 g = texelFetch(uG, ivec2(gl_FragCoord.xy - uOrigin), 0);
    bool guided = g.z >= 1024.0;
    float gz = guided ? g.z - 1024.0 : g.z;
    float kind = floor(gz / 256.0), steps = gz - 256.0*kind;
    /* the crevice darkening reads the march's STEP COUNT, which a ray that started from the depth
       guide does not have (it skipped the approach): it uses the mean count of this pixel's full
       marches, which the guide carries. */
    if (guided) steps = texelFetch(uGuideTex, ivec2(gl_FragCoord.xy), 0).y;
    /* LOG-DEPTH screen-space derivatives — computed in UNIFORM control flow (all lanes) so
       dFdx/dFdy are well-defined; only hit lanes consume them. The surface point is P = O + t·rd;
       dividing ∂P by the (positive) depth t leaves
         ∂P/∂x / t = ∂(ln t)/∂x · rd + ∂rd/∂x,
       which is SCALE-FREE — the depth magnitude never touches f32, so no per-frame exponent and no
       under/overflow. ZERO extra orbits. The stored depth is relative to the view's scale (pass G's
       uRefE), which a derivative does not see. (t = 0 is stored as −1e30; it reads as ln 1e-30.) */
    float Lt = g.x < -1e29 ? -69.0775528 : g.x * 0.6931472;
    float dLx = dFdx(Lt), dLy = dFdy(Lt);
    vec3  dRx = dFdx(rd), dRy = dFdy(rd);
    vec3 col = vec3(0.02,0.03,0.05);
    bool raw = false;                             // a diagnostic view: written as is, no tone map
    if (uLook == 1) {
        /* ── THE NEW LOOK ──
           GMT's lighting model and its fresh-scene rig, with the two things GMT gets by marching
           the fractal again — shadows and ambient occlusion — taken from the depth buffer
           instead, and a depth cue. Every input is the G-buffer; no orbit. The lights'
           directions come from the page (grep rigDir): they hang off the view's own surface
           plane, so the surface is raked by light at any orientation it happens to have. */
        ivec2 c = ivec2(gl_FragCoord.xy);
        bool rightSide = uSplitX >= 0.0 && gl_FragCoord.x >= uSplitX;
        col = uHaze;
        vec3 n = -rd; float open = 1.0, lit = 1.0, ndl = 0.0;
        float fz = clamp((g.x - uDepthRange.x) / max(uDepthRange.y - uDepthRange.x, 1e-3), -0.3, 1.6);
        if (kind == 1.0 || kind == 2.0) {
            if (kind == 2.0) n = octUnpack(g.w);
            else if (uCompare == 1) n = rightSide ? normalFromDepth(c, g.x, rd) : octUnpack(g.w);
            else if (uNormalMode == 0) { n = normalize(cross(dLx*rd + dRx, dLy*rd + dRy)); if (dot(n, rd) > 0.0) n = -n; }
            else if (uNormalMode == 3) n = normalFromDepth(c, g.x, rd);
            else n = octUnpack(g.w);
            vec3 alb = kind == 2.0 ? vec3(0.5) : albedoNew(g.y);
            vec3 v = -rd, L = uLightDir;
            if (uLookA.x > 0.0) open = clamp(1.0 - uLookA.x * occlusion(c, g.x, rd, n), 0.03, 1.0);
            ndl = max(dot(n, L), 0.0);
            if (uLookA.z > 0.0 && ndl > 0.0 && uLightMode != 1) lit = mix(1.0, shadowed(c, g.x, rd, n, L, 0.0), uLookA.z);
            /* GMT's Direct shading, Blinn-Phong variant (stable/engine-gmt/shaders/chunks/lighting:
               grep calculatePBRContribution, calculateShading), and the rig of its fresh Mandelbulb
               scene: a white key, an orange fill a sixth as strong, a blue kicker from under the
               camera, and the sky gradient as a dome light with its reflection. Key and fill
               cast shadows, as there. */
            float rough = clamp(uMat.x, 0.02, 1.0);
            float shin = max(2.0, 2.0 / (rough * rough + 0.001) - 2.0), specN = (shin + 2.0) / (8.0 * 3.14159265);
            vec3 dif = (1.0 - uMat.y) * alb * (uMat.w / 3.14159265), spc = mix(vec3(1.0), alb, uMat.y) * uMat.z * specN;
            vec3 F0 = mix(vec3(0.04), alb, uMat.y);
            vec3 F = F0 + (max(vec3(1.0 - rough), F0) - F0) * pow(1.0 - max(dot(n, v), 0.0), 5.0);
            col = (vec3(1.0) - F) * (1.0 - uMat.y) * alb * uMat.w * skyDome(0.5 + 0.5 * dot(n, uPlaneN)) * uLookB.y;
            col += skyDome(0.5 + 0.5 * dot(reflect(rd, n), uPlaneN)) * uLookB.y * F * uMat.z;
            if (uLightMode != 1) {
                col += (dif + spc * pow(max(dot(n, normalize(L + v)), 0.0), shin)) * (uLookB.x * ndl * lit);
                float nf = max(dot(n, uFillDir), 0.0), nk = max(dot(n, uKickDir), 0.0);
                if (uLookA.z > 0.0 && nf > 0.0) nf *= mix(1.0, shadowed(c, g.x, rd, n, uFillDir, 113.0), uLookA.z);
                col += (dif + spc * pow(max(dot(n, normalize(uFillDir + v)), 0.0), shin)) * uFillCol * nf;
                col += (dif + spc * pow(max(dot(n, normalize(uKickDir + v)), 0.0), shin)) * uKickCol * nk;
            }
            if (uLightMode != 0) {                           // the headlamp, with the classic look's distance falloff
                float a = g.x < -1e29 ? 0.0 : exp2(min(g.x - uFalloffRel, 60.0));
                vec3 lh = normalize(-rd + 0.22*uUp + 0.12*uRight);
                col += (dif + spc * pow(max(dot(n, normalize(lh + v)), 0.0), shin)) * (uLookB.x * max(dot(n, lh), 0.0) / (1.0 + a*a));
            }
            col *= open;                                     // as GMT: the occlusion multiplies the whole shaded colour
            col = mix(col, uHaze, uLookA.w * (1.0 - exp(-0.9 * max(fz, 0.0) * max(fz, 0.0))));
        } else if (kind == 3.0) {
            col = uHaze * 0.5;
        }
        col *= uLookC.w;
        if (uView == 2) { col = n * 0.5 + 0.5; raw = true; }
        else if (uView == 3) { col = vec3(1.0 - clamp(0.1 + 0.8 * fz, 0.0, 1.0)); raw = true; }
        else if (uView == 4) { col = vec3(open); raw = true; }
        else if (uView == 5) { col = vec3(ndl * lit); raw = true; }
    } else if (kind == 1.0) {
        vec3 n;
        if (uNormalMode == 0) {
            /* screen-space normal: no pertOrbit at all. Coarse at silhouettes (mixed hit/miss
               quads) but free; the fly is ÷4 live anyway. */
            n = normalize(cross(dLx*rd + dRx, dLy*rd + dRy));
            if (dot(n, rd) > 0.0) n = -n;                 // orient toward the camera
        } else if (uNormalMode == 3) {
            n = normalFromDepth(ivec2(gl_FragCoord.xy), g.x, rd);
        } else {
            n = octUnpack(g.w);
        }
        float ao = pow(1.0 - steps/256.0, 1.5);           // crisper crevice darkening
        vec3 base = colorFromParam(g.y);
        col = vec3(0.0);
        if (uLightMode != 1) {                        // distant directional (modes 0 = current, 2 = both)
            float diff = max(0.0, dot(n, uLightDir));
            col += (0.15 + 0.85*diff) * base * (0.4+0.6*ao);
            col += pow(max(0.0,dot(reflect(rd,n),uLightDir)),24.0)*0.3;
        }
        if (uLightMode != 0) {                        // CAMERA HEADLAMP: point light at the eye with
            /* distance falloff in DEPTH-RELATIVE units — t and the falloff length L (=smoothedDist·mul)
               are both at the zoom scale, so t/L is O(1) and is formed from the two logs. Near
               structure blazes, far falls to shadow → the depth cue a directional light can't give
               at deep zoom. */
            float a = g.x < -1e29 ? 0.0 : exp2(min(g.x - uFalloffRel, 60.0));
            float atten = 1.0 / (1.0 + a*a);
            vec3 lh = normalize(-rd + 0.22*uUp + 0.12*uRight);   // lamp offset up/right of the eye → modelling, not a flat frontal wash
            float diffH = max(0.0, dot(n, lh));
            col += (0.04 + 0.96*diffH) * base * atten * (0.4+0.6*ao);
            col += pow(max(0.0,dot(reflect(rd,n),lh)),32.0) * atten * 0.5;
        }
        float fres = pow(1.0 - max(0.0, dot(n, -rd)), 4.0);   // silhouette rim — reads edges/depth
        col += fres * 0.15 * base;
    } else if (kind == 2.0) {
        vec3 n = octUnpack(g.w);
        vec3 fc = vec3(0.62,0.55,0.78);
        col = vec3(0.0);
        if (uLightMode != 1) {                        // distant directional
            float diff = max(0.0, dot(n, uLightDir));
            col += (0.15 + 0.85*diff) * fc * 0.8;
            col += pow(max(0.0,dot(reflect(rd,n),uLightDir)),24.0)*0.3;
        }
        if (uLightMode != 0) {                        // headlamp — far field is beyond it ⇒ ~dark
            float a = exp2(min(g.x - uFalloffRel, 30.0));
            float atten = 1.0/(1.0 + a*a);
            col += (0.04 + 0.96*max(0.0,dot(n,-rd))) * fc * atten;
        }
    } else if (kind == 3.0) {
        col = vec3(0.10,0.08,0.12);              // dark, not background — no fake holes
    }
    if (!raw) {
        col = (col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14);   // ACES filmic tone map (Narkowicz) — tames highlights
        col = pow(clamp(col, 0.0, 1.0), vec3(0.4545));
    }
    if (uSplitX >= 0.0 && abs(gl_FragCoord.x - uSplitX) < 1.0) col = vec3(1.0, 0.8, 0.25);   // the compare divider
    o = vec4(col,1.0);
}`;

/* ---------- PASS U: update the depth guide ----------
   One texel per pixel, carried from one jittered sample of a still to the next (two textures,
   written alternately):
     x  the nearest near-field hit any sample so far found here, as pass G writes depth
        (log2 t − uRefE); 1e30 once any sample did not hit — that pixel never guides
     y  the mean step count of this pixel's FULL marches (the crevice darkening reads it for rays
        that started from the guide and so have no count of their own)
   Grep GUIDED START for how it is used. */
const GUIDE_FRAG = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
out vec4 o;
uniform sampler2D uG;            // this sample's G-buffer
uniform sampler2D uPrev;         // the guide after the earlier samples
uniform vec2  uOrigin;           // as in pass S
uniform int   uN;                // index of this sample (0 = first: uPrev is not read)
uniform int   uGuided;           // 1 = this sample was a guided one: its step counts do not enter the mean
uniform float uFullW;            // on a full march: this sample's weight in the mean step count
void main(){
    vec4 g = texelFetch(uG, ivec2(gl_FragCoord.xy - uOrigin), 0);
    float gz = g.z >= 1024.0 ? g.z - 1024.0 : g.z;
    float kind = floor(gz / 256.0), steps = gz - 256.0*kind;
    float d = kind == 1.0 ? g.x : 1e30, m = steps;
    if (uN > 0) {
        vec4 p = texelFetch(uPrev, ivec2(gl_FragCoord.xy), 0);
        d = (p.x < 1e29 && kind == 1.0) ? min(p.x, g.x) : 1e30;   // any miss, ever ⇒ never guides
        m = uGuided == 1 ? p.y : mix(p.y, steps, uFullW);
    }
    o = vec4(d, m, 0.0, 1.0);
}`;

function sh(type,src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s); return s; }
function mkProg(fs){
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER,VERT));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER,fs));
  gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw gl.getProgramInfoLog(p);
  return p;
}
const prog = mkProg(FRAG);
const parallelExt = gl.getExtension('KHR_parallel_shader_compile');
let deepProg = null, deepCompileErr = '', deepReady = false;
/* Compile the heavy deep shader WITHOUT blocking page load (≈15 s on first run — ANGLE caches the
   binary so refreshes are instant). KHR_parallel_shader_compile builds it on a driver worker thread
   while the f32 baseline keeps animating + a loading note shows; falls back to a one-time block if
   the extension is absent. __deepReady stays undefined until it's ready (gate scripts wait on it). */
function mkProgAsync(fs, cb){
  let vs, fsObj;
  try { vs = sh(gl.VERTEX_SHADER, VERT); } catch(e){ cb(null, String(e)); return; }
  const p = gl.createProgram();
  fsObj = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fsObj, fs); gl.compileShader(fsObj);
  gl.attachShader(p, vs); gl.attachShader(p, fsObj); gl.linkProgram(p);
  let done = false;
  const finish = () => {                         // idempotent; called early it BLOCKS until the build is done
    if (done) return; done = true;
    if (!gl.getShaderParameter(fsObj, gl.COMPILE_STATUS)) return cb(null, gl.getShaderInfoLog(fsObj));
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return cb(null, gl.getProgramInfoLog(p));
    cb(p, '');
  };
  const poll = () => {
    if (done || dzDisposed) return;
    if (parallelExt && !gl.getProgramParameter(p, parallelExt.COMPLETION_STATUS_KHR)) { setTimeout(poll, 40); return; }
    finish();
  };
  poll();
  return { finish };                             // lets a caller that needs the program NOW wait for THIS build
}
/* ── deep program variants ────────────────────────────────────────────────────────────────
   DEEP_FRAG compiles into a few variants, selected by #defines:
     (plain)  the perturbation kernel, exact per-step path
     + B      the BLA skip-table path (a heavier compile — the nested skip loop)
     + T      per-pixel work counters for __stats (diagnostics only)
   The plain variant is compiled WITHOUT blocking at load (deepProg / ud — the readiness flag
   everything checks). The others are built on first use: BLA in the background (kickBlaAsync),
   or blocking when something asks for a variant outright. All gates draw through deepCtx(). */
const variants = {}, variantErr = {}, compileMs = {};        // key → { p, x }  (null = failed to build)
const vKey = (b, t) => 'P' + (b ? 'B' : '') + (t ? 'T' : '');
const vSrc = (b, t) => DEEP_FRAG.replace('#version 300 es', '#version 300 es'
  + (b ? '\n#define USE_BLA' : '') + (t ? '\n#define USE_STATS' : ''));
function ensureVariant(b, t){
  const key = vKey(b, t);
  if (variants[key] === undefined && blaPending[key]) blaPending[key].finish();   // a background build is in flight: wait for IT, don't start a second
  if (variants[key] !== undefined) return variants[key];
  try {
    const t0 = performance.now();
    const p = mkProg(vSrc(b, t));
    const x = makeUD(p); x.hasBla = !!b;
    compileMs[key] = performance.now() - t0;
    variants[key] = { p, x };
  } catch(e){ variantErr[key] = String(e); variants[key] = null; }
  return variants[key];
}

const quad = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quad);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
function bindQuad(p){
  const loc = gl.getAttribLocation(p,'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
}
const U  = n => gl.getUniformLocation(prog,n);
const u = { res:U('uRes'), camPos:U('uCamPos'), right:U('uRight'), up:U('uUp'), fwd:U('uFwd'),
            fov:U('uFovScale'), power:U('uPower'), iters:U('uIters'), prec:U('uPrecRatio'),
            light:U('uLightDir'), phase:U('uPhase') };
function makeUD(p){ const g = n => gl.getUniformLocation(p,n);
  return { res:g('uRes'), right:g('uRight'), up:g('uUp'), fwd:g('uFwd'),
            fov:g('uFovScale'), orbit:g('uOrbit'), len:g('uOrbitLen'), iters:g('uIters'),
            origin:g('uOrigin'), refE:g('uRefE'), probe:g('uProbe'), probeT:g('uProbeT'),
            pixAng:g('uPixAng'), camF:g('uCamPosF'), spreadT:g('uSpreadT'),
            normalMode:g('uNormalMode'), bisectMax:g('uBisectMax'), jitter:g('uJitter'),
            power:g('uPower'), powerI:g('uPowerI'), binomN:g('uBinomN'), binomN1:g('uBinomN1'), phase:g('uPhase'),
            colorMode:g('uColorMode'),
            bla:g('uBla'), blaTab:g('uBlaTab'), blaMaxLvl:g('uBlaMaxLvl'),
            blaUsable:g('uBlaUsable'),
            normalIters:g('uNormalIters'), bisectIters:g('uBisectIters'), stepRelax:g('uStepRelax'),
            maxSteps:g('uMaxSteps'), farRelax:g('uFarRelax'), farFrom:g('uFarFrom'),
            land:g('uLand'), landSplit:g('uLandSplit'), hitRefine:g('uHitRefine'), guide:g('uGuide'), guideK:g('uGuideK'), guideR:g('uGuideR'), guideTex:g('uGuideTex') }; }
let ud = null;
/* ════════ the two-pass deep draw ════════
   Every shaded deep picture — live frame, accumulated still, thumbnail, tiled export — goes
   through drawDeep: pass G (the heavy program, D) into the G-buffer, then pass S (shadeProg) from
   the G-buffer into the destination. The probes (uProbe ≠ 0) are pass G alone, read back raw.
   Pitfalls:
   - Pass G is never blended; only the shaded result is (the running mean of a still).
   - The G-buffer is built on scratch texture unit 7 and sampled on unit 5, bound only for the
     duration of pass S: unit 0 must hold nothing but the orbit texture when pass G draws (grep
     `ensureAccum` for what happens otherwise).
   - Every program keeps exactly one fragment output (grep `PASS G OUTPUT`).
   A jittered sample of a still can also carry a depth guide (S.guide): pass G then starts its
   march from it, and a third small draw, pass U (GUIDE_FRAG), writes the guide for the next
   sample. The guide lives on unit 3 while such a draw runs. */
const shadeT0 = performance.now();
const shadeProg = mkProg(SHADE_FRAG);
const us = (g => ({ g:g('uG'), origin:g('uOrigin'), res:g('uRes'), right:g('uRight'), up:g('uUp'), fwd:g('uFwd'),
  fov:g('uFovScale'), jitter:g('uJitter'), light:g('uLightDir'), normalMode:g('uNormalMode'),
  colorMode:g('uColorMode'), colorScale:g('uColorScale'), gradient:g('uGradient'),
  useGradient:g('uUseGradient'), lightMode:g('uLightMode'), falloffRel:g('uFalloffRel'), guideTex:g('uGuideTex'),
  look:g('uLook'), view:g('uView'), sampleN:g('uSampleN'), planeN:g('uPlaneN'), depthRange:g('uDepthRange'), splitX:g('uSplitX'),
  compare:g('uCompare'), lookA:g('uLookA'), lookB:g('uLookB'), lookC:g('uLookC'), haze:g('uHaze'),
  mat:g('uMat'), fillDir:g('uFillDir'), kickDir:g('uKickDir'), fillCol:g('uFillCol'), kickCol:g('uKickCol'), nrmTap:g('uNrmTap') }))(n => gl.getUniformLocation(shadeProg, n));
/* ════════ THE NEW LOOK ════════
   look.mode 1: GMT's lighting on the G-buffer, with the lights hung off the surface in view.
   look.mode 0 is the classic shading (one camera-fixed light, no shadows), kept as it was.
   Everything here is pass S and page code; the heavy shader takes no part (but for the compare
   divider of hit landing).

   THE RIG FOLLOWS THE SURFACE. A light fixed to the camera or to the world is right only by luck
   at deep zoom: the surface in view has whatever orientation that scale of the fractal has
   (measured with the classic camera-fixed key: at the two deepest sample-flight views 79 % and
   90 % of pixels faced away from it). So after pass G the page reads the G-buffer back at 32×32,
   fits a plane to the points (fitRig), and hangs the lights off that plane (rigDir). The same
   read gives the view's depth range, which the haze and the depth view are scaled to.
   How the rig is measured depends on who is drawing (drawDeep's S.rig):
     'live'   a flying frame: the read-back is asynchronous (requestRig / pollRig) and the rig
              moves toward each fit by a fraction, so the light neither stalls the frame nor
              jitters with it
     'fresh'  a still's first sample, a thumbnail, an export: measured now, blocking, taken as
              it is — the same view always gets the same light
     number   a frame of a rendered flight: measured now and blended in by that fraction, so
              the light glides from frame to frame
   and every later sample of a still keeps the rig it started with.

   SHADOWS AND OCCLUSION COME FROM THE DEPTH BUFFER (grep SHADOW FROM DEPTH, OCCLUSION FROM
   DEPTH): no orbit, at a cost within the noise of the march. Pitfalls:
   - They see one depth layer and only what is in the picture. A caster outside the frame, or
     behind a nearer surface, casts nothing; shadows thin out toward the edge the light comes
     from. GMT marches the fractal again for both; a real shadow ray here would be about a
     second march per shadowed light.
   - They read far from the pixel, so pass S needs the WHOLE picture in the G-buffer. An export
     of the new look therefore marches the picture row by row into a full-size G-buffer and
     shades once per sample (renderFrameToBlob); it cannot be tiled, and a picture the GPU cannot
     hold that buffer for is refused rather than rendered with seams.
   - Both are sampled patterns turned by uSampleN: a still's samples add up to a clean result,
     a single flying frame is a little grainy.
*/
/* Lights and material start from GMT's fresh Mandelbulb scene (stable/engine-gmt/formulas/Mandelbulb.ts,
   defaultPreset): key intensity 3, fill and kicker at a sixth and a twelfth of it, sky strength 0.3
   (GMT scales its slider by 0.33 in Direct mode), roughness 0.75, metallic 0.2, reflectivity 0.6.
   There the key stands at (-0.7, 0.37, 1.4) and the fill at (0.6, -0.5, 1.4) around a bulb the
   camera faces from z = 3: seen from the nearest surface that is 21° above it, from the left and a
   little up, and 21° above it from the lower right. keyAz / keyElev / fill* say the same thing
   relative to the fitted plane. Two deliberate departures, both the owner's eye (2026-10-07):
   the key stands at 40°, not 21° — a deep-zoom view is a ridged wall, not a smooth bulb, and at
   21° its own ridges leave almost all of it in shadow; and the fill and kicker carry half of
   GMT's colour (tint 0.5; #ff8800 and #0088ff in linear light at tint 1). */
const look = { mode: 1, view: 0, compare: 0, split: 0.5,
  ao: 1.0, aoRadius: 0.12, shadow: 1.0, soft: 0.05, shadowLen: 0.6, haze: 0.0, hazeCol: [0.03, 0.05, 0.07],
  key: 3.0, sky: 0.3, rough: 0.75, metal: 0.2, refl: 0.6, diffuse: 1.0, sat: 1.0, exposure: 1.0,
  keyElev: 40, keyTurn: 0, keyAz: 152, fillAz: -40, fillElev: 21,
  fill: 0.5, fillCol: [1.0, 0.246, 0.0], kick: 0.25, kickCol: [0.0, 0.246, 1.0], tint: 0.5, nrmTap: 1 };   // tint: 1 = GMT's light colours, 0 = all lights white · nrmTap: how many pixels away normals-from-depth read their neighbours
api.look = look;
api.setLook = (o)=>{ Object.assign(look, o); accumReset = true; };
const RIG_N = 32, rigPx = new Float32Array(RIG_N * RIG_N * 4);
let rigFbo = null, rigTex = null;
const rig = { n: null, near: -1, far: 1 };
api.rig = () => rig;
/* the G-buffer of the w×h picture, sampled down to RIG_N × RIG_N; leaves that copy bound for reading */
function rigBlit(w, h){
  if (!rigFbo) {
    gl.activeTexture(gl.TEXTURE7);
    rigTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, rigTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, RIG_N, RIG_N, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0);
    rigFbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, rigFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rigTex, 0);
  }
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, gbufFbo); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, rigFbo);
  gl.blitFramebuffer(0, 0, w, h, 0, 0, RIG_N, RIG_N, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  gl.bindFramebuffer(gl.FRAMEBUFFER, rigFbo);
}
/* fit the surface plane and the depth range to such a read-back (px) of a w×h picture seen with
   this camera basis; null if too little of it is surface */
function fitRig(px, w, h, fwd, right, up){
  const fov = Math.tan(0.5 * 1.1), pts = [];
  for (let j = 0; j < RIG_N; j++) for (let i = 0; i < RIG_N; i++) {
    const o = (j * RIG_N + i) * 4, z0 = px[o + 2], z = z0 >= 1024 ? z0 - 1024 : z0, kind = Math.floor(z / 256), L = px[o];
    if ((kind !== 1 && kind !== 2) || !(L > -1e29)) continue;
    const ux = ((i + 0.5) * w / RIG_N - 0.5 * w) / h * fov, uy = ((j + 0.5) * h / RIG_N - 0.5 * h) / h * fov;
    const t = Math.pow(2, L) / Math.hypot(1, ux, uy);            // depth along the view axis
    pts.push([ux * t, uy * t, t, L]);
  }
  if (pts.length < 64) return null;
  const Ls = pts.map(q => q[3]).sort((a, b) => a - b), near = Ls[Math.floor(0.05 * Ls.length)], far = Ls[Math.floor(0.95 * Ls.length)];
  pts.scale = Math.pow(2, near);                                    // keeps 1/depth near 1 whatever the zoom
  /* Across the picture a plane is linear in 1/depth: with u = a/c, v = b/c (a right, b up, c
     forward), 1/c = A·u + B·v + C, and (A, B, C) is its normal, pointing away from the camera.
     Least squares on that, every sample counting the same, follows the near and middle ground. A
     fit of depth itself is ruled by the farthest points — and in a view along the surface those
     are millions of times farther than the ground the light is meant to rake. */
  let suu = 0, suv = 0, su = 0, svv = 0, sv = 0, n = 0, suw = 0, svw = 0, sw = 0;
  for (const [a, b, c, L] of pts) { if (L < near) continue;          // the nearest 5 % would rule this fit instead
    const u = a / c, v = b / c, w = pts.scale / c;
    suu += u*u; suv += u*v; su += u; svv += v*v; sv += v; n++; suw += u*w; svw += v*w; sw += w; }
  const det = suu*(svv*n - sv*sv) - suv*(suv*n - sv*su) + su*(suv*sv - svv*su);
  if (!(Math.abs(det) > 1e-30)) return null;
  const A = (suw*(svv*n - sv*sv) - suv*(svw*n - sv*sw) + su*(svw*sv - svv*sw)) / det;
  const B = (suu*(svw*n - sv*sw) - suw*(suv*n - sv*su) + su*(suv*sw - svw*su)) / det;
  const C = (suu*(svv*sw - sv*svw) - suv*(suv*sw - svw*su) + suw*(suv*sv - svv*su)) / det;
  const v = [0, 1, 2].map(k => -(A * right[k] + B * up[k] + C * fwd[k])), m = Math.hypot(...v) || 1;
  return { n: v.map(c => c / m), near, far };
}
/* measure now: blocks until the GPU has finished the march. For stills, thumbnails and exports,
   where the picture must not depend on timing. */
function measureRig(w, h, fwd, right, up){
  rigBlit(w, h);
  gl.readPixels(0, 0, RIG_N, RIG_N, gl.RGBA, gl.FLOAT, rigPx);
  return fitRig(rigPx, w, h, fwd, right, up);
}
/* measure without blocking, for flying frames: the read-back goes into a pixel buffer behind a
   fence, and pollRig() hands the fit over a frame or two later. One request in flight at a time. */
let rigPbo = null, rigSync = null, rigAsk = null;
function requestRig(w, h, fwd, right, up){
  if (rigSync) return;
  rigBlit(w, h);
  if (!rigPbo) { rigPbo = gl.createBuffer(); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, rigPbo); gl.bufferData(gl.PIXEL_PACK_BUFFER, rigPx.byteLength, gl.STREAM_READ); }
  else gl.bindBuffer(gl.PIXEL_PACK_BUFFER, rigPbo);
  gl.readPixels(0, 0, RIG_N, RIG_N, gl.RGBA, gl.FLOAT, 0);
  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
  rigSync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush();
  rigAsk = { w, h, fwd: Array.from(fwd), right: Array.from(right), up: Array.from(up) };
}
function pollRig(){
  if (!rigSync) return null;
  const st = gl.clientWaitSync(rigSync, 0, 0);
  if (st === gl.TIMEOUT_EXPIRED) return null;
  gl.deleteSync(rigSync); rigSync = null;
  if (st === gl.WAIT_FAILED) return null;
  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, rigPbo); gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, rigPx); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
  return fitRig(rigPx, rigAsk.w, rigAsk.h, rigAsk.fwd, rigAsk.right, rigAsk.up);
}
/* move the rig toward a new measurement by fraction k (1 = take it as it is) */
function trackRig(m, k){
  if (!m) return;
  if (!rig.n || k >= 1) { rig.n = m.n; rig.near = m.near; rig.far = m.far; return; }
  const v = rig.n.map((c, i) => c + (m.n[i] - c) * k), l = Math.hypot(...v) || 1;
  rig.n = v.map(c => c / l); rig.near += (m.near - rig.near) * k; rig.far += (m.far - rig.far) * k;
}
/* a light direction hung off the fitted plane: elDeg above it, coming from azDeg in the picture
   (0 = from the right, 90 = from the top) */
function rigDir(azDeg, elDeg, right, up){
  const n = rig.n, ang = azDeg * Math.PI / 180, ca = Math.cos(ang), sa = Math.sin(ang);
  const a = [0, 1, 2].map(i => ca * right[i] + sa * up[i]), d = a[0]*n[0] + a[1]*n[1] + a[2]*n[2];
  let w = a.map((c, i) => c - d * n[i]); const wl = Math.hypot(...w) || 1; w = w.map(c => c / wl);
  const el = elDeg * Math.PI / 180, se = Math.sin(el), ce = Math.cos(el);
  return [0, 1, 2].map(i => n[i] * se + w[i] * ce);
}
const rigKeyDir = (right, up) => rigDir(look.keyAz + look.keyTurn, look.keyElev, right, up);
const shadeLoc = gl.getAttribLocation(shadeProg, 'p');
const guideProg = mkProg(GUIDE_FRAG);
const ug = (g => ({ g:g('uG'), prev:g('uPrev'), origin:g('uOrigin'), n:g('uN'), guided:g('uGuided'), fullW:g('uFullW') }))(n => gl.getUniformLocation(guideProg, n));
const guideLoc = gl.getAttribLocation(guideProg, 'p');
/* GUIDED START (guideOn): after the first, a jittered sample begins its march guideK pixel cones
   in front of the nearest depth in the pixel's 3×3 neighbourhood instead of at the camera; the
   shader re-checks the start point and marches in full if it is not outside the surface. Sample 0
   and every GUIDE_FULL_EVERY-th after it are full marches for everyone: they re-discover anything
   thin the neighbourhoods missed and keep the step-count shading honest.
   Measured by guide-study.mjs; the acceptance test is its noise floor, not zero difference. */
let guideOn = true, guideK = 16, guideR = 1, guideFirst = 1;
const GUIDE_FULL_EVERY = 8;
const GUIDE_MAX_PX = 1 << 24;                    // a guide is two RG32F textures the size of the picture; above this an export goes unguided
const WHOLE_MAX_PX = 40e6;                       // the new look needs the whole picture in one RGBA32F G-buffer (8K is 33 Mpx, 531 MB)
/* which samples march in full: the first guideFirst, then every GUIDE_FULL_EVERY-th */
const guideIsFull = n => !guideOn || n < guideFirst || n % GUIDE_FULL_EVERY === 0;
const guideFullsBefore = n => { let c = 0; for (let k = 0; k < n; k++) if (guideIsFull(k)) c++; return c; };
api.setGuide = (b)=>{ guideOn = !!b; accumReset = true; };
api.getGuide = () => guideOn;
api.setGuideK = (k)=>{ guideK = Math.max(2, +k || 16); accumReset = true; };
api.setGuideR = (r)=>{ guideR = Math.max(1, Math.min(3, r|0)); accumReset = true; };
api.setGuideFirst = (n)=>{ guideFirst = Math.max(1, n|0); accumReset = true; };
/* the two guide textures of one still: sample n reads [cur] and pass U writes [1 − cur] */
function makeGuideSet(w, h){
  gl.activeTexture(gl.TEXTURE7);
  const set = [0, 1].map(() => { const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, w, h, 0, gl.RG, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fbo }; });
  gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  set.cur = 0; set.w = w; set.h = h;
  return set;
}
function freeGuideSet(set){ if (set) set.forEach(a => { gl.deleteFramebuffer(a.fbo); gl.deleteTexture(a.tex); }); }
/* point pass G (uniform set x, program current) at guide `gd` = { set, n }, or at none. Returns 1
   if this sample is a guided one. */
function bindGuide(x, gd){
  const guided = gd && gd.n > 0 && !guideIsFull(gd.n) ? 1 : 0;
  gl.uniform1i(x.guide, guided); gl.uniform1i(x.guideTex, 3);
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, gd && gd.n > 0 ? gd.set[gd.set.cur].tex : null); gl.activeTexture(gl.TEXTURE0);
  if (guided) { gl.uniform1f(x.guideK, guideK); gl.uniform1i(x.guideR, guideR); }
  return guided;
}
let gbufFbo = null, gbufTex = null, gbufW = 0, gbufH = 0;
function ensureGbuf(w, h){
  if (gbufW === w && gbufH === h && gbufTex) return;
  if (gbufTex){ gl.deleteTexture(gbufTex); gl.deleteFramebuffer(gbufFbo); }
  gl.activeTexture(gl.TEXTURE7);
  gbufTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, gbufTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0);
  gbufFbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, gbufFbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, gbufTex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gbufW = w; gbufH = h;
}
/* Draw the rectangle (vx, vy, vw, vh) of a W×H picture into framebuffer `dst`. The caller has made
   D.p current and set its uniforms (uRes = W×H, jitter, …) and has called ensureGbuf. S carries
   what pass S needs: { W, H, jx, jy, fwd, right, up, light } plus, optionally,
     alpha    blend the shaded result into dst with this constant weight (0 / absent = replace)
     dist     the view's surface distance — the depth scale, and the headlamp falloff length
              before falloffMul (default: the live smoothedDist)
     ox, oy   the framebuffer pixel that G-buffer texel (0,0) stands for (a G-buffer smaller
              than the picture)
     pad      also march this many rows above and below the rectangle (inside the picture), for
              a pass S that reads its neighbours (normals from depth); the caller sets oy to
              the first marched row and sizes the G-buffer for the extra rows
     phase    'march' = pass G only (leaves the G-buffer bound), 'shade' = passes S and U only.
              An export of the new look marches the whole picture row by row and then shades it
              in one draw: its occlusion and shadows read far more than a row of tiles.
     rig      measure the light rig from this G-buffer before shading (the whole picture must
              be in it): 'fresh' = now, as it is · 'live' = without blocking, smoothed · a
              number = now, blended in by that fraction. Absent = keep the rig as it stands.
     tile     march the rectangle as side-by-side draws this wide (each must stay far below the
              ~2 s GPU watchdog); passes S and U still run once over the whole rectangle.
              Switching program and target for every tile instead made a 1440p export 3x slower.
     guide    { set, n }: this is jittered sample n of a still whose depth guide is `set`
              (makeGuideSet, the size of the whole picture). The caller flips set.cur once the
              whole sample — every tile of it — is drawn.
   Leaves `dst` bound, blending off and D.p current. */
function drawDeep(D, dst, vx, vy, vw, vh, S){
  const ox = S.ox || 0, oy = S.oy || 0;
  const dist = S.dist || Math.max(smoothedDist, 1e-300), refE = Math.floor(Math.log2(dist));
  const gd = S.guide, splitX = look.compare ? Math.round(look.split * S.W) : -1;
  gl.disable(gl.BLEND);
  if (S.phase !== 'shade') {                      // pass G
    gl.uniform2f(D.x.origin, ox, oy); gl.uniform1f(D.x.refE, refE); gl.uniform1f(D.x.landSplit, splitX);
    gl.uniform1f(D.x.farFrom, Math.log2(march.farFromDist * dist) - refE);
    bindGuide(D.x, gd);
    gl.bindFramebuffer(gl.FRAMEBUFFER, gbufFbo);
    const pad = S.pad || 0, gy0 = Math.max(0, vy - pad), gy1 = Math.min(S.H, vy + vh + pad);
    for (let x0 = 0, tw = S.tile || vw; x0 < vw; x0 += tw) {
      gl.viewport(vx - ox + x0, gy0 - oy, Math.min(tw, vw - x0), gy1 - gy0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    if (S.phase === 'march') return;              // the caller shades later, once the whole picture is marched
  }
  if (look.mode === 1 && S.rig) {                 // the light rig: see THE NEW LOOK for the three ways it is measured
    if (S.rig === 'live' && rig.n) { trackRig(pollRig(), 0.3); requestRig(S.W, S.H, S.fwd, S.right, S.up); }
    else trackRig(measureRig(S.W, S.H, S.fwd, S.right, S.up), typeof S.rig === 'number' ? S.rig : 1);
  }
  const newLook = look.mode === 1 && !!rig.n;
  gl.useProgram(shadeProg);
  gl.enableVertexAttribArray(shadeLoc); gl.vertexAttribPointer(shadeLoc, 2, gl.FLOAT, false, 0, 0);
  gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, gbufTex); gl.uniform1i(us.g, 5);
  gl.uniform2f(us.origin, ox, oy); gl.uniform2f(us.res, S.W, S.H);
  gl.uniform3fv(us.fwd, S.fwd); gl.uniform3fv(us.right, S.right); gl.uniform3fv(us.up, S.up);
  gl.uniform1f(us.fov, Math.tan(0.5*1.1)); gl.uniform2f(us.jitter, S.jx, S.jy);
  gl.uniform3fv(us.light, newLook ? rigKeyDir(S.right, S.up) : S.light);
  gl.uniform1i(us.normalMode, normalMode); gl.uniform1i(us.colorMode, colorMode);
  gl.uniform1f(us.colorScale, colorScale); gl.uniform1i(us.lightMode, lightMode);
  gl.uniform1i(us.useGradient, gradientTex ? 1 : 0);
  if (gradientTex){ gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, gradientTex); gl.uniform1i(us.gradient, 2); }
  gl.uniform1f(us.falloffRel, Math.log2(dist * falloffMul) - refE);
  gl.uniform1i(us.guideTex, 3);
  gl.uniform1i(us.look, newLook ? 1 : 0); gl.uniform1i(us.view, look.view); gl.uniform1i(us.sampleN, gd ? gd.n : 0);
  gl.uniform1f(us.splitX, splitX); gl.uniform1i(us.compare, look.compare); gl.uniform1i(us.nrmTap, look.nrmTap);
  if (newLook) {
    gl.uniform3fv(us.planeN, rig.n); gl.uniform2f(us.depthRange, rig.near, rig.far);
    gl.uniform4f(us.lookA, look.ao, look.aoRadius, look.shadow, look.haze);
    gl.uniform4f(us.lookB, look.key, look.sky * 0.33, 0, look.sat);
    gl.uniform4f(us.lookC, 0, look.soft, look.shadowLen, look.exposure);
    gl.uniform3fv(us.haze, look.hazeCol);
    gl.uniform4f(us.mat, look.rough, look.metal, look.refl, look.diffuse);
    gl.uniform3fv(us.fillDir, rigDir(look.fillAz + look.keyTurn, look.fillElev, S.right, S.up));
    { const k = [0, 1, 2].map(i => -0.78 * S.up[i] - 0.62 * S.fwd[i]);   // GMT's third light: fixed to the camera, 5 below and 2 behind it
      gl.uniform3fv(us.kickDir, k); }
    gl.uniform3fv(us.fillCol, look.fillCol.map(c => (1 + (c - 1) * look.tint) * look.fill)); gl.uniform3fv(us.kickCol, look.kickCol.map(c => (1 + (c - 1) * look.tint) * look.kick));
  }
  if (S.alpha) { gl.enable(gl.BLEND); gl.blendColor(0, 0, 0, S.alpha); gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE_MINUS_CONSTANT_ALPHA); }
  gl.bindFramebuffer(gl.FRAMEBUFFER, dst); gl.viewport(vx, vy, vw, vh);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.disable(gl.BLEND);
  if (gd) {                                       // pass U: the guide for the next sample
    gl.useProgram(guideProg);
    gl.enableVertexAttribArray(guideLoc); gl.vertexAttribPointer(guideLoc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1i(ug.g, 5); gl.uniform1i(ug.prev, 3); gl.uniform2f(ug.origin, ox, oy);
    gl.uniform1i(ug.n, gd.n); gl.uniform1i(ug.guided, guideIsFull(gd.n) ? 0 : 1);
    gl.uniform1f(ug.fullW, 1 / (guideFullsBefore(gd.n) + 1));
    gl.bindFramebuffer(gl.FRAMEBUFFER, gd.set[1 - gd.set.cur].fbo);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, null);
  }
  gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0);
  gl.useProgram(D.p);
}
/* kick off the non-blocking deep-shader compile (sets deepProg/ud + __deepReady when done).
   The loading overlay appears ONLY if the compile is actually slow (>300 ms) — a cached refresh is
   near-instant and never flashes it. */
const loadTimer = setTimeout(() => {
  if (!deepReady && !deepCompileErr) { const l = dzById('loading'); if (l) l.style.display = 'flex'; }
}, 300);
mkProgAsync(vSrc(false, false), (p, err) => {
  clearTimeout(loadTimer);
  const l = dzById('loading'); if (l) l.style.display = 'none';
  if (!p) { deepCompileErr = err; api.deepErr = err; api.deepReady = false; return; }
  deepProg = p; ud = makeUD(p); ud.hasBla = false; deepReady = true;
  variants[vKey(false, false)] = { p, x: ud };
  api.deepErr = ''; api.deepReady = true;
});
/* pick the active deep program + its uniform set: the BLA variant when BLA is on and it built,
   else the plain one. Use this everywhere a deep draw is issued. */
function deepCtx(){
  if (!deepProg) return { p: null, x: ud };
  const v = (blaEnabled && ensureVariant(true, false)) || ensureVariant(false, false);
  return v || { p: deepProg, x: ud };
}
compileMs.S = performance.now() - shadeT0;      // pass S, built at load (blocking — it is small)
api.compileMs = () => compileMs;

/* ════════ [DS-SEAM] BigInt fixed-point camera + reference orbit ════════ */
/* makeHP ported from hp-orbit.test.mjs (P ≈ 3.4 × target digits; 256 → ~77 digits) */
function makeHP(P) {
  const Pb = BigInt(P), SCALE = 1n << Pb;
  const mul = (a, b) => (a * b) >> Pb;
  const fdiv = (a, b) => (a << Pb) / b;
  const isqrt = (n) => { if (n < 2n) return n < 0n ? 0n : n; let x = n, y = (x + 1n) >> 1n; while (y < x) { x = y; y = (x + n / x) >> 1n; } return x; };
  const fsqrt = (a) => isqrt(a << Pb);
  const SMALL = SCALE >> 90n;
  const fromNum = (x) => {
    if (x === 0) return 0n;
    const neg = x < 0; x = Math.abs(x);
    const dv = new DataView(new ArrayBuffer(8)); dv.setFloat64(0, x);
    const bits = dv.getBigUint64(0);
    const exp = Number((bits >> 52n) & 0x7ffn), mant = bits & 0xfffffffffffffn;
    let M, E; if (exp === 0) { M = mant; E = -1074; } else { M = mant | 0x10000000000000n; E = exp - 1075; }
    const sh = Pb + BigInt(E);
    let v = sh >= 0n ? (M << sh) : (M >> (-sh));
    return neg ? -v : v;
  };
  const toNum = (v) => Number(v) / Number(SCALE);
  const ONE = SCALE;
  const chebT = (x, n) => { let a = ONE, b = x; if (n === 0) return a; if (n === 1) return b; for (let k = 2; k <= n; k++) { const t = 2n * mul(x, b) - a; a = b; b = t; } return b; };
  const chebU = (x, n) => { let a = ONE, b = 2n * x; if (n === 0) return a; if (n === 1) return b; for (let k = 2; k <= n; k++) { const u = 2n * mul(x, b) - a; a = b; b = u; } return b; };
  const ipow = (a, n) => { let r = ONE, b = a, e = n; while (e > 0) { if (e & 1) r = mul(r, b); b = mul(b, b); e >>= 1; } return r; };
  /* the triplex power map for general integer n, with a constant phase rotation ψ on (nθ, nφ).
     cos/sin(nθ) come transcendental-free from Chebyshev; the phase is a rotation by constants. */
  const P8 = (v) => {
    const [x, y, z] = v;
    const x2 = mul(x, x), y2 = mul(y, y), z2 = mul(z, z);
    const r2 = x2 + y2 + z2, rho2 = x2 + y2;
    const r = fsqrt(r2), rho = fsqrt(rho2);
    if (r === 0n) return [0n, 0n, 0n];
    const rN = ipow(r, nPower);
    const cth = fdiv(z, r), sth = fdiv(rho, r);
    let cph, sph;
    if (rho > SMALL) { cph = fdiv(x, rho); sph = fdiv(y, rho); } else { cph = ONE; sph = 0n; }
    let cNth = chebT(cth, nPower), sNth = mul(sth, chebU(cth, nPower - 1));
    let cNph = chebT(cph, nPower), sNph = mul(sph, chebU(cph, nPower - 1));
    if (phaseTheta !== 0) { const cp = fromNum(Math.cos(phaseTheta)), sp = fromNum(Math.sin(phaseTheta));
      const c2 = mul(cNth, cp) - mul(sNth, sp), s2 = mul(sNth, cp) + mul(cNth, sp); cNth = c2; sNth = s2; }
    if (phasePhi !== 0) { const cp = fromNum(Math.cos(phasePhi)), sp = fromNum(Math.sin(phasePhi));
      const c2 = mul(cNph, cp) - mul(sNph, sp), s2 = mul(sNph, cp) + mul(cNph, sp); cNph = c2; sNph = s2; }
    return [mul(mul(rN, sNth), cNph), mul(mul(rN, sNth), sNph), mul(rN, cNth)];
  };
  const addV = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  return { P, fromNum, toNum, P8, addV, SCALE };
}
const hp = makeHP(256);

function hdrSplit(v) {
  if (v === 0 || !isFinite(v)) return { m: 0, e: 0 };
  const e = Math.floor(Math.log2(Math.abs(v)));
  return { m: Math.fround(v * Math.pow(2, -e)), e };
}

/* Build the reference orbit AT the camera (BigInt), pack the 4-row texture +
   f64 metadata for the CPU gate. Stops past escape (R>100) — exhaustion wrap
   in the kernel covers pixels needing more iterations. */
function buildRefOrbit(CHP, lenMax) {
  const V = [CHP.slice()];
  const Vf = [CHP.map(hp.toNum)];
  for (let k = 0; k < lenMax - 1; k++) {
    const nv = hp.addV(hp.P8(V[k]), CHP);
    V.push(nv);
    const vf = nv.map(hp.toNum);
    Vf.push(vf);
    if (Math.hypot(...vf) > 100) break;
  }
  const len = V.length;
  const data = new Float32Array(len * 4 * 4);
  const Rk = [], DRk = [];
  let DR = 1;
  for (let k = 0; k < len; k++) {
    const v = Vf[k], R = Math.hypot(...v) || 1e-300;
    const th = Math.acos(Math.max(-1, Math.min(1, v[2] / R))), ph = Math.atan2(v[1], v[0]);
    const a = nPower * th + phaseTheta, b = nPower * ph + phasePhi;     // phased base angles (ψ const)
    const Rp = Math.pow(R, nPower - 1), Rn = Rp * R;
    const hRn = hdrSplit(Rn), hRp = hdrSplit(Rp), hDR = hdrSplit(DR);
    const put = (row, vals) => { for (let j = 0; j < 4; j++) data[(row * len + k) * 4 + j] = vals[j]; };
    put(0, [v[0], v[1], v[2], R]);
    put(1, [Math.sin(a), Math.cos(a), Math.sin(b), Math.cos(b)]);
    put(2, [hRn.m, hRn.e, hRp.m, hRp.e]);
    put(3, [hDR.m, hDR.e, 0, 0]);
    Rk.push(R); DRk.push(DR);
    DR = nPower * Rp * DR + 1;
  }
  return { data, len, Vf, Rk, DRk };
}
/* ════════ BLA table build (CPU, f64) — ported VERBATIM from bla.test.mjs blaBuild ════════
   The per-step linear op is the exact §2 Jacobian as a 3×3 + the Δdr channel; runs compose
   (X then Y) into a binary tree of levels. Validity radii (rA,rB) are baked conservatively so
   a run applies iff |δ| ≤ rA − rB·|δc| (escape- and Zhuoran-safe). */
/* BLA linearisation tolerance τ. History: 1e-5 (first build) → 1e-3 (2026-06, bought +25-37% when the
   original per-number-exponent kernel was the bottleneck) → 1e-4 (2026-10). With the shared-exponent
   kernel and accurate trig the exact path sits at the f32 floor, which made τ=1e-3 the LARGEST error
   left: it moves the rendered surface 0.1-1.1 pixel cones at p95 and gets the escape-iteration count
   wrong at 0.5-4.7% of pixels (kernel-bench.test.mjs) — where τ=1e-4 gives 0.001-0.03 and 0%, for
   0-11% of the BLA speed. __setBlaTau(1e-3) restores the faster, looser setting. */
let blaTau = 1e-4;
const mat3mul=(A,B)=>{ const C=new Array(9); for(let i=0;i<3;i++)for(let j=0;j<3;j++){let s=0;for(let k=0;k<3;k++)s+=A[i*3+k]*B[k*3+j];C[i*3+j]=s;} return C; };
const rowMat3=(g,A)=>[g[0]*A[0]+g[1]*A[3]+g[2]*A[6], g[0]*A[1]+g[1]*A[4]+g[2]*A[7], g[0]*A[2]+g[1]*A[5]+g[2]*A[8]];
const frob=A=>{let s=0;for(const x of A)s+=x*x;return Math.sqrt(s);};
const chebUf=(x,n)=>{ if(n<=0)return 1; let a=1,b=2*x; if(n===1)return b; for(let k=2;k<=n;k++){const u=2*x*b-a;a=b;b=u;} return b; };  // U_n(x)
function blaBuild(O, tau){       // §2 Jacobian per step, general power n + phase ψ
  const N=nPower, usable = O.len - 1;       // runs must end at index ≤ len-1
  const base = [];
  for (let k = 0; k < usable; k++) {
    const V=O.Vf[k], R=O.Rk[k], rho=Math.hypot(V[0],V[1]);
    const cth=V[2]/R, sth=rho/R;
    let cp=1, sp=0; if (rho>1e-300){ cp=V[0]/rho; sp=V[1]/rho; }
    const th=Math.acos(Math.max(-1,Math.min(1,cth))), ph=Math.atan2(V[1],V[0]);
    const a8=N*th+phaseTheta, b8=N*ph+phasePhi;
    const rhat=[sth*cp,sth*sp,cth], that=[cth*cp,cth*sp,-sth], phat=[-sp,cp,0];
    const sa=Math.sin(a8),caa=Math.cos(a8),sb=Math.sin(b8),cbb=Math.cos(b8);
    const rhp=[sa*cbb,sa*sb,caa], thp=[caa*cbb,caa*sb,-sa], php=[-sb,cbb,0];
    const s = chebUf(cth, N-1);             // sin Nθ/sinθ — exact, pole-safe
    const Rp=Math.pow(R,N-1), gJ=N*Rp;
    const A=new Array(9);
    for(let i=0;i<3;i++)for(let j=0;j<3;j++)
      A[i*3+j]=gJ*(rhp[i]*rhat[j] + thp[i]*that[j] + s*php[i]*phat[j]);
    const g = [rhat[0],rhat[1],rhat[2]].map(x=>x*N*(N-1)*Math.pow(R,N-2)*O.DRk[k]);
    const B=[1,0,0,0,1,0,0,0,1];
    const rA = R > 1.5 ? 0 : tau*R*Math.min(1,Math.abs(s))/N;
    base.push({A, B, g, a:gJ, h:[0,0,0], rA, rB:0, nA:frob(A), nB:Math.sqrt(3)});
  }
  const lv=[base];
  let maxLvl=0;
  for(let l=1; (1<<l)<=usable; l++){
    const prev=lv[l-1], cur=[];
    for(let i=0; 2*i+1<prev.length; i++){
      const X=prev[2*i], Y=prev[2*i+1];     // X first, then Y
      const A=mat3mul(Y.A,X.A);
      const B=mat3mul(Y.A,X.B); for(let j=0;j<9;j++)B[j]+=Y.B[j];
      const g=rowMat3(Y.g,X.A); for(let j=0;j<3;j++)g[j]+=Y.a*X.g[j];
      const a=Y.a*X.a;
      const gB=rowMat3(Y.g,X.B);
      const h=[Y.h[0]+gB[0]+Y.a*X.h[0], Y.h[1]+gB[1]+Y.a*X.h[1], Y.h[2]+gB[2]+Y.a*X.h[2]];
      const rA = (X.rA<=0||Y.rA<=0) ? 0 : Math.min(X.rA, Y.rA/Math.max(X.nA,1e-300));
      const rB = Math.max(X.rB, (Y.rB + X.nB)/Math.max(X.nA,1e-300));
      cur.push({A,B,g,a,h,rA,rB,nA:frob(A),nB:frob(B)});
    }
    if(!cur.length) break;
    lv.push(cur); maxLvl=l;
  }
  return {lv, maxLvl, usable};
}
/* Pack levels 1..maxLvl into an RGBA32F table (row = level, column = runIdx·9). ONE exponent
   per matrix / vector rather than one per scalar, so a skip is plain mat3·vec3 arithmetic in the
   shader. Per run = 9 texels:
     t0 = (rA.m, rA.e, rB.m, rB.e)        validity radii (HDR pairs; fetched alone for the pre-check)
     t1 = (A row 0, eA)   t2 = (A row 1, eB)   t3 = (A row 2, eg)
     t4 = (B row 0, eh)   t5 = (B row 1, a.m)  t6 = (B row 2, a.e)
     t7 = (g, 0)          t8 = (h, 0)
   A = Am·2^eA etc.; mantissas are f32, scaled so the largest |entry| of each block lies in [1,2).
   Mantissas are full f32 — entries of one block would have to differ by 2^126 before the smaller
   is lost (the composed matrices are scaled rotations: their entries are comparable). */
function packBlaTexture(T){
  const {lv, maxLvl, usable} = T;
  if (maxLvl < 1 || !lv[1].length) return null;
  const TPR = 9, w = lv[1].length * TPR, h = maxLvl + 1;
  const data = new Float32Array(w * h * 4);
  const blk = (arr) => { let m = 0; for (const v of arr) { const a = Math.abs(v); if (isFinite(a) && a > m) m = a; }
    if (m === 0) return { e: 0, k: 0 };
    const e = Math.max(-1000, Math.floor(Math.log2(m))); return { e, k: Math.pow(2, -e) }; };
  for (let lvl = 1; lvl <= maxLvl; lvl++) {
    const runs = lv[lvl];
    for (let idx = 0; idx < runs.length; idx++) {
      const r = runs[idx], b = (lvl * w + idx * TPR) * 4;
      const hA = hdrSplit(r.rA), hB = hdrSplit(r.rB), ha = hdrSplit(r.a);
      const sA = blk(r.A), sB = blk(r.B), sg = blk(r.g), sh = blk(r.h);
      data[b] = hA.m; data[b+1] = hA.e; data[b+2] = hB.m; data[b+3] = hB.e;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        data[b + 4  + i*4 + j] = r.A[i*3+j] * sA.k;
        data[b + 16 + i*4 + j] = r.B[i*3+j] * sB.k;
      }
      data[b+7] = sA.e;  data[b+11] = sB.e; data[b+15] = sg.e;
      data[b+19] = sh.e; data[b+23] = ha.m; data[b+27] = ha.e;
      for (let j = 0; j < 3; j++) { data[b + 28 + j] = r.g[j] * sg.k; data[b + 32 + j] = r.h[j] * sh.k; }
    }
  }
  return { data, w, h, maxLvl, usable };
}
/* BLA mode. blaEnabled is the EFFECTIVE flag everything downstream reads (table build, variant
   choice, uniforms); blaMode is what was asked for:
     'off' / 'on'   explicit (the harness handle __setBla, and the panel)
     'auto'         (default) on only where it pays. A skip costs more than it saves above
                    ~1e-13 (0.75-0.87× at 1e-5..1e-12) and wins below (1.3× at 5e-15 → 2.4× at
                    4e-35) — kernel-bench.test.mjs. Auto also never blocks: the BLA variant is
                    compiled in the background (kickBlaAsync) and used once it is ready. */
let blaEnabled = false;
let blaMode = 'auto';
const BLA_AUTO_ON = 1e-13, BLA_AUTO_OFF = 1e-12;       // hysteresis on the surface distance
const blaPending = {};
function kickBlaAsync(){
  const key = vKey(true, false);
  if (!deepProg || variants[key] !== undefined || blaPending[key]) return;
  const t0 = performance.now();
  blaPending[key] = mkProgAsync(vSrc(true, false), (p, err) => {
    blaPending[key] = null;
    if (!p) { variantErr[key] = err; variants[key] = null; return; }
    const x = makeUD(p); x.hasBla = true;
    compileMs[key] = performance.now() - t0;
    variants[key] = { p, x };
  });
}
/* per frame: turn the effective flag on/off for 'auto' (never triggers a blocking compile) */
function updateBlaAuto(){
  if (blaMode !== 'auto') return;
  kickBlaAsync();
  const ready = !!variants[vKey(true, false)];
  const want = ready && deepActive && smoothedDist > 0 && smoothedDist < (blaEnabled ? BLA_AUTO_OFF : BLA_AUTO_ON);
  if (want !== blaEnabled) { blaEnabled = want; orbitDirty = true; }
}
function setBlaMode(m){                                   // 'off' | 'auto' | 'on'
  blaMode = m;
  if (m === 'on') { blaEnabled = true; if (deepProg) ensureVariant(true, false); }
  else if (m === 'off') blaEnabled = false;
  orbitDirty = true;
}
api.setBla = (on)=>{ setBlaMode(on === 'auto' ? 'auto' : on ? 'on' : 'off'); };   // true / false / 'auto'
api.blaMode = () => blaMode;
api.blaErr = () => variantErr[vKey(true, false)] || '';
api.setBlaTau = (t)=>{ blaTau = Math.max(1e-9, +t); orbitDirty = true; };   // BLA maturation knob: rebuild table at a new tolerance
api.getBlaTau = () => blaTau;
let blaTex = null, curBla = null;
/* set the BLA uniforms + bind the table (unit 1) on the active deep program (x = its ud).
   curBla null (shallow orbit, no levels) or BLA program absent ⇒ exact per-step path. */
function setBlaUniforms(x){
  if (blaEnabled && curBla && x.hasBla) {       // x.hasBla: this program was built with USE_BLA
    gl.uniform1i(x.bla, 1);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, blaTex);
    gl.uniform1i(x.blaTab, 1);
    gl.uniform1i(x.blaMaxLvl, curBla.maxLvl);
    gl.uniform1i(x.blaUsable, curBla.usable);
    gl.activeTexture(gl.TEXTURE0);
  } else {
    gl.uniform1i(x.bla, 0);
  }
}
/* power n + binomial coeffs + phase + colour mode — set on the active deep program before each deep draw */
function setPowerUniforms(x){
  gl.uniform1f(x.power, nPower);
  gl.uniform1i(x.powerI, nPower);
  gl.uniform1fv(x.binomN, binomN);
  gl.uniform1fv(x.binomN1, binomN1);
  gl.uniform2f(x.phase, phaseTheta, phasePhi);
  gl.uniform1i(x.colorMode, colorMode);          // pass G picks the palette PARAMETER; palette, light and falloff are pass S's (drawDeep)
  gl.uniform2f(x.origin, 0, 0);
  gl.uniform1i(x.guide, 0); gl.uniform1i(x.guideTex, 3);   // not a guided sample unless drawDeep / bindGuide says so
  gl.uniform1i(x.land, look.compare === 2 ? 2 : landMode);
  gl.uniform1i(x.hitRefine, look.compare === 3 ? -(hitRefine || 4) : hitRefine);   // compare 3: refined on the right of the divider only
  gl.uniform1i(x.maxSteps, march.maxSteps);
  gl.uniform2f(x.farRelax, march.farRelax, march.farSpan);
  { const d = Math.max(smoothedDist, 1e-300), e = Math.floor(Math.log2(d));     // FAR RELAX reads depth against uRefE, in the probes too (drawDeep sets both again for a picture)
    gl.uniform1f(x.refE, e); gl.uniform1f(x.farFrom, Math.log2(march.farFromDist * d) - e); }
}
let orbitTex = null;
function uploadOrbit(O) {
  if (orbitTex) gl.deleteTexture(orbitTex);
  orbitTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, orbitTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, O.len, 4, 0, gl.RGBA, gl.FLOAT, O.data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  /* BLA table (only when enabled — per-frame ~700 3×3 merges, trivial) */
  if (blaEnabled) {
    curBla = packBlaTexture(blaBuild(O, blaTau));
    if (curBla) {
      if (!blaTex) blaTex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, blaTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, curBla.w, curBla.h, 0, gl.RGBA, gl.FLOAT, curBla.data);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.activeTexture(gl.TEXTURE0);
    }
  } else curBla = null;
}

/* ════════ Gradient palette loading ════════
   Drop in a gradient and it replaces the built-in cosine palette for the iteration /
   orbit-trap colour modes. Easiest correct path: a PNG (any size) — the top row of
   pixels is resampled to a 256-wide strip; or a text .map / palette (one "R G B" per
   line, 0–255 or 0–1). Texture lives on unit 2 (0=orbit, 1=BLA). */
let gradientTex = null;
function uploadStrip(rgba, w){                 // rgba: Uint8Array(w*4), one row
  if (!gradientTex) gradientTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, gradientTex);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.activeTexture(gl.TEXTURE0);
  accumReset = true;
  if (colorMode === 0){ colorMode = 2; }       // give the gradient something to colour
}
function gradientFromImage(img){               // resample the image's TOP row to 256px
  const c = document.createElement('canvas'); c.width = 256; c.height = 1;
  const cx = c.getContext('2d'); cx.imageSmoothingEnabled = true;
  cx.drawImage(img, 0, 0, img.naturalWidth || img.width, 1, 0, 0, 256, 1);  // src = top row
  uploadStrip(new Uint8Array(cx.getImageData(0, 0, 256, 1).data.buffer), 256);
}
function gradientFromText(txt){                 // "R G B" per line (0–255 or 0–1), commas/headers ignored
  const nums = (txt.match(/-?\d*\.?\d+/g) || []).map(Number);
  const trip = []; for (let i = 0; i + 2 < nums.length; i += 3) trip.push([nums[i], nums[i+1], nums[i+2]]);
  if (!trip.length) throw new Error('no R G B triplets found');
  const max = Math.max(...trip.flat());
  const sc = max <= 1.0001 ? 255 : 1;          // detect 0–1 floats vs 0–255 ints
  const w = trip.length, a = new Uint8Array(w*4);
  for (let i = 0; i < w; i++){ a[i*4]=Math.round(Math.min(255,trip[i][0]*sc)); a[i*4+1]=Math.round(Math.min(255,trip[i][1]*sc)); a[i*4+2]=Math.round(Math.min(255,trip[i][2]*sc)); a[i*4+3]=255; }
  uploadStrip(a, w);
}
api.loadGradient = (file) => new Promise((res, rej) => {
  const isImg = /^image\//.test(file.type) || /\.(png|jpe?g|gif|bmp|webp)$/i.test(file.name);
  const fr = new FileReader();
  fr.onerror = () => rej(fr.error);
  if (isImg){
    const img = new Image();
    img.onload = () => { try { gradientFromImage(img); URL.revokeObjectURL(img.src); res('image'); } catch(e){ rej(e); } };
    img.onerror = () => rej(new Error('image decode failed'));
    img.src = URL.createObjectURL(file);
  } else {
    fr.onload = () => { try { gradientFromText(fr.result); res('text'); } catch(e){ rej(e); } };
    fr.readAsText(file);
  }
});
api.loadGradientFile = () => new Promise((res) => {
  const inp = document.createElement('input'); inp.type = 'file';
  inp.accept = 'image/*,.map,.txt,.gradient,.pal';
  inp.onchange = () => { if (inp.files[0]) api.loadGradient(inp.files[0]).then(res).catch(e=>{ dzNotice('Gradient load failed: '+e.message); res(null); }); };
  inp.click();
});
api.clearGradient = () => { gradientTex = null; accumReset = true; };  // back to the built-in cosine palette

/* drag-and-drop a gradient file anywhere on the page */
dzListen(dzDropTarget, 'dragover', e => { e.preventDefault(); });
dzListen(dzDropTarget, 'drop', e => {
  e.preventDefault();
  const f = e.dataTransfer && e.dataTransfer.files[0];
  if (f) api.loadGradient(f).catch(err => dzNotice('Gradient load failed: '+err.message));
});

/* ════════ CPU f64 perturbed march — the GROUND-TRUTH GATE (brief §4) ════════
   Independent implementation path: plain f64 δ (JS doubles reach 1e-308, so no HDR
   needed CPU-side) + the SAME cancellation-free §3/§8.1 math. Disagreement with
   the GPU HDR march = a bug, not a zoom. */
const dot3=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2], len3=a=>Math.hypot(a[0],a[1],a[2]);
const add3=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]], sub3=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], scl3=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const powm1N = (u,n) => { const c=binom(n); let p=c[n-1]; for(let k=n-2;k>=0;k--) p=p*u+c[k]; return u*p; };  // (1+u)^n−1
function stableDeltaJS(V,d){                       // §3, residual forms (precision-ladder)
  const NP=nPower, R=len3(V); if(R<1e-300) return [0,0,0];
  const q=2*dot3(V,d)+dot3(d,d), r2=Math.sqrt(Math.max(R*R+q,0)), Dr=q/(r2+R);
  const Rn=Math.pow(R,NP), dRn=Rn*Math.expm1(NP*Math.log1p(Dr/R));
  const Dphi=Math.atan2(V[0]*d[1]-V[1]*d[0], V[0]*(V[0]+d[0])+V[1]*(V[1]+d[1]));
  const th0=Math.acos(Math.max(-1,Math.min(1,V[2]/R))), ph0=Math.atan2(V[1],V[0]);
  // §3c EXACT Δθ (matches the GPU kernel fix — see comment there)
  const rho=Math.hypot(V[0],V[1]);
  const qr2=2*(V[0]*d[0]+V[1]*d[1])+d[0]*d[0]+d[1]*d[1];
  const rhoP=Math.sqrt(Math.max(rho*rho+qr2,0));
  const drho=qr2/(rhoP+rho);
  const Dth=Math.atan2(drho*V[2]-d[2]*rho, rho*rhoP+V[2]*(V[2]+d[2]));
  const a=NP*th0+phaseTheta,b=NP*ph0+phasePhi,Da=NP*Dth,Db=NP*Dphi;   // phased base; Δ phase-invariant
  const ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);
  const cA=Math.cos(Da),sA=Math.sin(Da),cB=Math.cos(Db),sB=Math.sin(Db);
  const cAm=-sA*sA/(1+cA), cBm=-sB*sB/(1+cB);
  const dsA=sa*cAm+ca*sA, dcA=ca*cAm-sa*sA;
  const dsB=sb*cBm+cb*sB, dcB=cb*cBm-sb*sB;
  const DD=[sa*dcB+dsA*cb+dsA*dcB, sa*dsB+dsA*sb+dsA*dsB, dcA], Dref=[sa*cb,sa*sb,ca];
  return add3(scl3(DD,Rn), scl3(add3(Dref,DD),dRn));
}
function pertOrbitJS(O, dc, maxIter){
  let d=dc.slice(), Ddr=0, m=0, escaped=false;
  for(let k=0;k<maxIter;k++){
    const V=O.Vf[m], R=O.Rk[m];
    const q=2*dot3(V,d)+dot3(d,d), r2=Math.sqrt(Math.max(R*R+q,0)), Dr=q/(r2+R);
    const u=Dr/R, Rp=Math.pow(R,nPower-1);
    const Dp=Rp*powm1N(u,nPower-1);
    Ddr=nPower*(Dp*O.DRk[m]+(Rp+Dp)*Ddr);
    const sd=stableDeltaJS(V,d);
    d=add3(sd,dc);
    m++;
    const z=add3(O.Vf[m],d);
    if(dot3(z,z)>4){ escaped=true; break; }
    if(dot3(z,z)<dot3(d,d) || m>=O.len-1){ d=sub3(z,O.Vf[0]); Ddr=(O.DRk[m]-1)+Ddr; m=0; }
  }
  const V=O.Vf[m], R=O.Rk[m];
  const q=2*dot3(V,d)+dot3(d,d), r2=Math.sqrt(Math.max(R*R+q,1e-300));
  return { de: 0.5*r2*Math.log(Math.max(r2,1e-300))/(O.DRk[m]+Ddr), escaped };
}
/* CPU referee for the march-population study (probe 3): mirrors the GPU near-field HDR
   march EXACTLY — capped anti-arm-skip stepping + the [tPrev,t] bisection onto the n-iter
   boundary — so tHit is comparable ray-for-ray. f64 t (JS doubles reach 1e-308, no HDR
   needed CPU-side). Returns the surface parameter t, the hit flag, and step count. */
function pertMarchJS(O, rd, maxIter, pixAng){
  let t=0, tPrev=0, cap=0, steps=0, hit=false;
  for(let st=0; st<256; st++){
    steps=st;
    const r=pertOrbitJS(O, scl3(rd,t), maxIter);
    const de=r.de;
    if(!r.escaped || de<=0){              // inside the n-iter surface — bisect onto the boundary
      let lo=tPrev, hi=t;                  // lo = escaped side (= GPU tPrev), hi = unescaped (= GPU t)
      for(let b=0;b<bisectMax;b++){        // match the GPU cap
        const tm=0.5*(lo+hi);
        const rm=pertOrbitJS(O, scl3(rd,tm), maxIter);
        if(!rm.escaped || rm.de<=0) hi=tm; else lo=tm;
        if((hi-lo)/Math.max(hi,1e-300) < 0.25*pixAng) break;
      }
      t=lo; hit=true; break;              // report the escaped-side boundary point (GPU t=tPrev)
    }
    if(t>0){
      if(de/t<pixAng){ hit=true; break; }
      if(t>1e-3) break;                   // t>T_SWITCH ⇒ far-field/background (miss for this study)
    }
    tPrev=t;
    let step=de*0.85;
    if(cap===0) cap=de*0.05;
    const capEff=(t!==0 && t>cap)? t : cap;
    if(step>capEff) step=capEff;
    cap*=1.25;
    t+=step;
  }
  return {t, steps, hit};
}

/* probe FBO: 1×1 RGBA32F readback of the GPU center-ray march */
const probeTex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, probeTex);
gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,1,1,0,gl.RGBA,gl.FLOAT,null);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
const probeFbo = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, probeFbo);
gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,probeTex,0);
gl.bindFramebuffer(gl.FRAMEBUFFER, null);

/* pointwise §4 gate: de at exactly t along the center ray — GPU HDR pipeline vs the
   independent CPU f64 referee, SAME input geometry. Well-conditioned (no march chaos). */
function gateProbeAt(tval){
  if(!curOrbit || !deepProg) return { t:tval, rel:NaN };
  const {fwd,right,up}=basis();
  const rc = pertOrbitJS(curOrbit, scl3(fwd,tval), cam.iters);
  const D = deepCtx(), x = D.x;
  gl.useProgram(D.p); bindQuad(D.p);
  gl.bindFramebuffer(gl.FRAMEBUFFER, probeFbo);
  gl.viewport(0,0,1,1);
  gl.uniform2f(x.res, Math.max(canvas.width,2), Math.max(canvas.height,2));
  gl.uniform3fv(x.fwd,fwd); gl.uniform3fv(x.right,right); gl.uniform3fv(x.up,up);
  gl.uniform1f(x.fov,Math.tan(0.5*1.1));
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,orbitTex);
  gl.uniform1i(x.orbit,0);
  gl.uniform1i(x.len,curOrbit.len);
  gl.uniform1i(x.iters,cam.iters);
  gl.uniform1i(x.probe,1);
  gl.uniform2f(x.jitter,0,0);
  setBlaUniforms(x); setPowerUniforms(x);
  gl.uniform1f(x.pixAng, Math.tan(0.5*1.1)/Math.max(canvas.clientHeight,2));
  const ht=hdrSplit(tval);
  gl.uniform2f(x.probeT, ht.m, ht.e);
  gl.drawArrays(gl.TRIANGLES,0,3);
  const px=new Float32Array(4);
  gl.readPixels(0,0,1,1,gl.RGBA,gl.FLOAT,px);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  gl.uniform1i(x.probe,0);
  const gpu=px[0]*Math.pow(2,px[1]), escG=px[2]>0.5;
  const rel=Math.abs(gpu-rc.de)/Math.max(Math.abs(rc.de),1e-300);
  return { t:tval, gpu, cpu:rc.de, escG, escC:rc.escaped, rel };
}

/* ---------- camera + free-fly with adaptive slowdown ---------- */
const cam = { pos:[0,0,2.6], yaw:-Math.PI/2, pitch:0, power:8, iters:14, baseSpeed:0.06 };
let camHP = cam.pos.map(hp.fromNum);            // [DS-SEAM] authoritative position
let smoothedDist = 1.0;
let snapDist = false;                          // set by dz.setView: the next frame takes the raw distance, no easing (2026-10-08)
let modeOverride = 'auto';                      // 'auto' | 'deep' | 'f32'
let frameLong = 320;                            // deep-mode ABSOLUTE render long-edge (px); display upscales it
let view1to1 = false;                           // true = show the frame at true pixel size, centred (no stretch)
let autoIters = true;                           // key I: scale iterations with depth
let normalMode = 2;                             // key N: 0 screen-space (0 orbits) | 1 3-tap (biased) | 2 4-tap (default) | 3 from depth, edge-aware (0 orbits)
const gNormalMode = () => look.compare === 1 ? 2 : normalMode === 3 ? 0 : normalMode;   // what pass G is told: only modes 1 and 2 cost it orbits (the normals compare needs the 4-tap one packed)
/* HOW FAR THE MARCH REACHES. Looking along the surface, distant ground is 10⁴–10⁹ times farther
   than the near ground and rays creep past everything in between; with 256 steps and the detail
   slider up, 9–23 % of such a picture ran out of steps (far-study.mjs). Three settings (the
   panel's "reach"; REACH below):
     short    256 steps, plain — what the page did until 2026-10-07
     relaxed  512 steps, and the step factor rises from 0.85 to farRelax over farSpan octaves of
              depth, starting farFromDist camera-surface-distances out (grep FAR RELAX). The
              default: nothing ran out in the test views, at +20–40 % time there, and 0.1–1.6 % of
              their far pixels step through a thin far feature. Ordinary views are untouched —
              their hits lie within 5 of those distances.
     full     1024 steps, plain: exact, +70–120 % time in those views.
   The accuracy probes always march the plain 256 steps, so the referees certify the same march
   as before. */
const REACH = [ { maxSteps: 256, farRelax: 0 }, { maxSteps: 512, farRelax: 1.7 }, { maxSteps: 1024, farRelax: 0 } ];
const march = { maxSteps: 512, farRelax: 1.7, farSpan: 6, farFromDist: 8 };
const reachMode = () => { const k = REACH.findIndex(r => r.maxSteps === march.maxSteps && r.farRelax === march.farRelax); return k < 0 ? 1 : k; };
api.march = march;
api.setMarch = (o)=>{ Object.assign(march, o); accumReset = true; };
api.setReach = (k)=>{ Object.assign(march, REACH[Math.max(0, Math.min(2, k|0))]); accumReset = true; };
let landMode = 0;                               // 1 = land each hit on a fixed level of the distance estimate (grep HIT LANDING)
let hitRefine = 0;                              // n > 0: bisect each hit's last step n times (grep HIT REFINE)
                                                // 4-tap tetrahedron = symmetric, reference-correct DE normal.
                                                // 3-tap is a one-sided forward difference: 1 fewer orbit but a
                                                // systematic +XYZ tilt (looks different). screen-space = free, speckles at depth.
let bisectMax = 12;                             // adaptive bisection cap (was fixed 22; early-break ends most)
let normalIters = 0;                            // PERF LEVER (0 = off/full): cap pertOrbit iters on the normal gradient taps
let bisectIters = 0;                            // PERF LEVER (0 = off/full): cap pertOrbit iters on the bisection midpoint evals
let stepRelax = 0;                              // PERF LEVER (0 = default 0.85): march step = relax·de; >1 = over-relaxed sphere tracing
let capRelax = 1;                               // QUALITY LEVER (1 = shipped TDR rungs): scales the deep res cap; large ⇒ uncapped (full-res deep)
let colorMode = 0, colorScale = 1.0;            // key C: 0 plain / 1 iteration / 2 orbit-trap; 9/0 scale
let surfMul = 1.0;                              // keys F/G: how close rays reach the surface (÷pixAng).
                                                // higher = sharper/less blobby (more march+bisection cost)
let gateOn = true;                              // key V: live ground-truth gate (1×1 readPixels sync, 2×/s)
let lightMode = 0, falloffMul = 4.0;            // key L: 0 directional / 1 headlamp / 2 both; T/Y falloff
const keys = {};
/* test harnesses lock input: their headed Chrome window takes focus, and a key typed for some
   other app would otherwise fly the camera mid-measurement (seen: a stray 'S' moved it 0.57). */
let inputLocked = false;
/* HOST INPUT (2026-10-08). 'module': the page's own keys and captured-mouse look fly the camera.
   'host': the module reads no key and no mouse; a host moves it with api.moveAlong and turns it
   with api.dz.setYawPitch. The distance probe, auto iterations and everything else run as before. */
let inputOwner = 'module';
let lastRawDist = 1.0;                          // the unsmoothed surface distance of the last frame
let hostMoveAt = -1e9;                          // when a host last moved the camera (the recorder's 'flying')
api.lockInput = (b)=>{ inputLocked = !!b; if (inputLocked) for (const k in keys) keys[k] = false; };
dzListen(dzKeyTarget, 'keydown',e=>{ if (inputLocked || inputOwner === 'host') return; if (e.ctrlKey || e.altKey || e.metaKey) return;   /* a chord is the host's, not a fly key (2026-10-08) */ keys[e.code]=true; if (!dzShortcuts) return;
  if(e.key===']'){ cam.iters=Math.min(160,cam.iters+1); orbitDirty=true; }
  if(e.key==='['){ cam.iters=Math.max(4,cam.iters-1); orbitDirty=true; }
  if(e.code==='KeyI') autoIters=!autoIters;
  if(e.code==='KeyN'){ normalMode = (normalMode+1)%4; accumReset=true; }  // screen / 3-tap / 4-tap / depth
  if(e.code==='KeyP'){ modeOverride = modeOverride==='auto'?'deep':modeOverride==='deep'?'f32':'auto'; orbitDirty=true; }
  if(e.code==='KeyR'){ const P=[360,540,720,1080,1440]; const i=P.indexOf(frameLong); frameLong=P[(i+1)%P.length]; accumReset=true; }  // cycle live frame size
  if(e.key==='-'||e.key==='_') setPower(nPower-1);          // power n  (−/=)
  if(e.key==='='||e.key==='+') setPower(nPower+1);
  if(e.key===',') setPhase(-0.06, 0);                       // phase θ  (,/.)
  if(e.key==='.') setPhase( 0.06, 0);
  if(e.key===';') setPhase(0, -0.06);                       // phase φ  (;/')
  if(e.key==="'") setPhase(0,  0.06);
  if(e.code==='KeyC'){ colorMode=(colorMode+1)%3; accumReset=true; }   // plain / iteration / orbit-trap
  if(e.key==='9'){ colorScale=Math.max(0.05,colorScale/1.3); accumReset=true; }  // palette frequency
  if(e.key==='0'){ colorScale=Math.min(20,colorScale*1.3); accumReset=true; }
  if(e.code==='KeyX' && deepActive && !exporting){ closePanels(); api.export(2560, 16); }  // hi-res PNG export (close panels first so the canvas reflows to full width)
  if(e.code==='KeyF'){ surfMul=Math.max(0.25,surfMul/1.5); accumReset=true; }    // softer (blobbier)
  if(e.code==='KeyG'){ surfMul=Math.min(256,surfMul*1.5); accumReset=true; }     // sharper (closer to surface)
  if(e.code==='KeyV'){ gateOn=!gateOn; if(!gateOn){ gate.relT=NaN; } }            // live gate on/off
  if(e.code==='KeyL'){ lightMode=(lightMode+1)%3; accumReset=true; }              // directional / headlamp / both
  if(e.code==='KeyT'){ falloffMul=Math.max(0.25,falloffMul/1.4); accumReset=true; }  // headlamp tighter
  if(e.code==='KeyY'){ falloffMul=Math.min(64,falloffMul*1.4); accumReset=true; }    // headlamp wider
  if(e.code==='KeyM') api.recordToggle();                                    // record/stop+save camera path
  if(e.key==='?') toggleAbout();                                                  // About / Credits panel
  if(e.key==='Escape' && exporting) api.cancelRender();                      // abort an export / path render
  if(e.key==='Escape' && playingPath) api.stopPlay();                        // stop a path preview
  if(e.key==='Escape' && aboutEl && aboutEl.style.display==='flex') toggleAbout();
});
const aboutEl = dzById('about');
function toggleAbout(){ openPanel(aboutEl); }                          // openPanel: defined below (hoisted)
dzById('aboutbtn').addEventListener('click', ()=>openPanel(aboutEl));
aboutEl.addEventListener('click', e => { if(e.target.className==='x') closePanels(); });

/* ════════ INTERACTIVE UI PANELS — the keyboard shortcuts as buttons/sliders ════════ */
const $id = id => dzById(id);
const CTLS = [
  {t:'sec', l:'Mode & quality'},
  {t:'seg', l:'mode',     g:()=>modeOverride, opts:[['auto','auto'],['deep','deep'],['f32','f32']], s:v=>{modeOverride=v; orbitDirty=true;}},
  {t:'rng', l:'frame px', note:'Live deep-render frame size (long edge, in pixels). The frame is rendered at this size and scaled to fill the window — lower it for speed (image gets softer, not blocky), raise it for sharpness. Capped to the display resolution; clamped at extreme zoom to stay under the GPU watchdog.', g:()=>frameLong, min:240,max:2560,step:40, fmt:v=>v+'px', s:v=>{frameLong=v; accumReset=true;}},
  {t:'tog', l:'1:1 view', note:'Show the render frame at its true pixel size, centred on a black field, instead of stretching it to fill the window. Crisp (no upscaling) — pair with a smaller frame size for a fast, sharp preview.', g:()=>view1to1, s:v=>{view1to1=v; accumReset=true;}},
  {t:'rng', l:'iters',    g:()=>cam.iters, min:4,max:160,step:1, s:v=>{cam.iters=v; orbitDirty=true;}},
  {t:'tog', l:'auto-iters', g:()=>autoIters, s:v=>{autoIters=v;}},
  {t:'seg', l:'BLA', note:'Bivariate linear approximation — skips runs of perturbation iterations (accuracy-bounded, tolerance 1e-4). "auto" uses it only where it pays (below about 1e-13; up to 2.4× there) and builds its shader in the background. "on" forces it everywhere and builds the shader right away — a one-time pause of a few seconds.', g:()=>blaMode, opts:[['off','off'],['auto','auto'],['on','on']], s:v=>{
      const needCompile = v === 'on' && variants[vKey(true, false)] === undefined;   // forcing it on triggers a blocking compile
      const finish = ()=>{ setBlaMode(v); if(needCompile && loading) loading.style.display='none';
        if(v === 'on' && api.blaErr()) dzNotice('BLA compile failed:\n'+api.blaErr()); syncControls(); };
      if(needCompile){ showProg('<span class="spin">◓</span> compiling BLA accelerator…<br><small style="color:#9ab">one-time — heavier shader</small>'); setTimeout(finish, 30); }  // let the overlay paint before the sync compile
      else finish();
    }},
  {t:'tog', l:'gate', note:'Live ground-truth check — GPU perturbation vs an independent CPU referee, shown in the HUD (relT ✓/✗). A 1×1 readback per ~0.5 s; turn off for the smoothest flying/recording.', g:()=>gateOn, s:v=>{gateOn=v; if(!v) gate.relT=NaN;}},
  {t:'seg', l:'reach', note:'How far a ray can travel before it gives up (a dark patch where distant ground should be — seen when you look along the surface, most of all with detail turned up). short = 256 steps. relaxed = 512 steps, and longer strides once the ray is well past the near ground: distant ground comes back for about a third more time in such views, and a thin far feature can occasionally be stepped through. full = 1024 steps, no shortcuts: exact, about twice the time in such views. Ordinary views cost the same in all three.', g:()=>reachMode(), opts:[['short',0],['relaxed',1],['full',2]], s:v=>{ api.setReach(v); }},
  {t:'rng', l:'step relax', note:'Over-relaxes the ray-march step (×distance-estimate). 0.85 = safe default, full quality. Higher takes bigger steps → fewer steps → faster deep zoom, but SACRIFICES detail: it can skip thin arms/fine features (watch silhouettes). ~1.3–1.5 is a good speed/quality balance; ≥1.7 visibly drops detail.', g:()=>stepRelax>0?stepRelax:0.85, min:0.85,max:2,step:0.05, fmt:v=>v.toFixed(2)+'×', s:v=>{stepRelax=v; accumReset=true;}},
  {t:'rng', l:'res cap', note:'Deep-mode resolution cap (GPU-watchdog safety). 1× = shipped caps that keep extreme-zoom frames under the ~2 s Windows watchdog. Raise to render deep at higher resolution — sharper, and softens the f32→deep transition — but at extreme zoom a too-high cap can freeze the desktop (the watchdog firing). Pair with a higher "frame px".', g:()=>capRelax, min:1,max:8,step:1, fmt:v=>v+'×', s:v=>{capRelax=v; accumReset=true;}},
  {t:'sec', l:'Formula'},
  {t:'rng', l:'power n',  g:()=>nPower, min:2,max:16,step:1, s:v=>api.setPower(v)},
  {t:'rng', l:'phase φ',  g:()=>phasePhi, min:0,max:6.2832,step:0.02, fmt:v=>v.toFixed(2), s:v=>{phasePhi=v; orbitDirty=true;}},
  {t:'rng', l:'phase θ',  g:()=>phaseTheta, min:0,max:6.2832,step:0.02, fmt:v=>v.toFixed(2), s:v=>{phaseTheta=v; orbitDirty=true;}},
  {t:'sec', l:'Look'},
  {t:'seg', l:'normals',  g:()=>normalMode, opts:[['screen',0],['3-tap',1],['4-tap',2],['depth',3]], s:v=>{normalMode=v; accumReset=true;}},
  {t:'tog', l:'hit landing', note:'Experimental. Places each surface hit on a fixed level of the distance estimate instead of wherever the last march step fell. Costs nothing. It removes depth grain on surfaces seen at a shallow angle, which matters most with "depth" normals. It moves the surface by a fraction of a pixel, so the accuracy referees are measured with it off.', g:()=>!!landMode, s:v=>{landMode=v?1:0; accumReset=true;}},
  {t:'seg', l:'depth taps', note:'For "depth" normals: how many pixels away the neighbours are read. 1 shows relief down to a pixel, and shimmers where the surface has ridges two pixels wide. 3 is smoother and close to 4-tap.', g:()=>look.nrmTap, opts:[['1',1],['2',2],['3',3]], s:v=>{look.nrmTap=v; accumReset=true;}},
  {t:'seg', l:'colour',   g:()=>colorMode, opts:[['plain',0],['iter',1],['trap',2]], s:v=>{colorMode=v; accumReset=true;}},
  {t:'rng', l:'palette',  g:()=>colorScale, min:0.1,max:16,step:0.1, fmt:v=>v.toFixed(1), s:v=>{colorScale=v; accumReset=true;}},
  {t:'act', l:'gradient', note:'Drop a PNG anywhere (its top row of pixels = the gradient), or load a .map / palette text file. Replaces the built-in palette for iter / trap colour.', acts:[['Load…',()=>api.loadGradientFile()],['reset',()=>api.clearGradient()]]},
  {t:'rng', l:'detail',   g:()=>surfMul, min:0.25,max:32,step:0.25, fmt:v=>v.toFixed(2), s:v=>{surfMul=v; accumReset=true;}},
  {t:'sec', l:'Light'},
  {t:'seg', l:'look', note:'classic = the shading this page had until October 2026: one light fixed to the camera, no shadows. new = lights that follow the surface in view, with shadows and ambient occlusion taken from the depth buffer (no extra fractal work).', g:()=>look.mode, opts:[['classic',0],['new',1]], s:v=>{look.mode=v; accumReset=true;}},
  {t:'seg', l:'lighting', g:()=>lightMode, opts:[['direct',0],['lamp',1],['both',2]], s:v=>{lightMode=v; accumReset=true;}},
  {t:'rng', l:'falloff',  g:()=>falloffMul, min:0.5,max:32,step:0.5, fmt:v=>v.toFixed(1), s:v=>{falloffMul=v; accumReset=true;}},
  {t:'rng', l:'key height', note:'New look. How high the key light stands above the surface in view. Low = long shadows and strong relief; high = flat, even light.', g:()=>look.keyElev, min:5,max:85,step:1, fmt:v=>v+'°', s:v=>{look.keyElev=v; accumReset=true;}},
  {t:'rng', l:'key turn', note:'New look. Turns the lights around the surface. 0 = the key comes from the left of the picture, a little above.', g:()=>look.keyTurn, min:-180,max:180,step:5, fmt:v=>v+'°', s:v=>{look.keyTurn=v; accumReset=true;}},
  {t:'rng', l:'light colour', note:'New look. How coloured the fill light and the kicker are. 1 = the orange and blue of a fresh GMT scene; 0 = white.', g:()=>look.tint, min:0,max:1,step:0.05, fmt:v=>v.toFixed(2), s:v=>{look.tint=v; accumReset=true;}},
  {t:'rng', l:'shadows', note:'New look. Shadows of the key and the fill, found in the depth buffer: only what is in the picture can cast one.', g:()=>look.shadow, min:0,max:1,step:0.05, fmt:v=>v.toFixed(2), s:v=>{look.shadow=v; accumReset=true;}},
  {t:'rng', l:'occlusion', note:'New look. Darkens crevices and pits: how much of the open sky the surroundings of each point hide.', g:()=>look.ao, min:0,max:2,step:0.05, fmt:v=>v.toFixed(2), s:v=>{look.ao=v; accumReset=true;}},
  {t:'rng', l:'sky', note:'New look. Strength of the sky dome that lights whatever the key does not reach.', g:()=>look.sky, min:0,max:2,step:0.05, fmt:v=>v.toFixed(2), s:v=>{look.sky=v; accumReset=true;}},
  {t:'rng', l:'roughness', note:'New look. Low = a tight, bright highlight; high = a broad soft sheen. The roughness of a GMT material.', g:()=>look.rough, min:0.1,max:1,step:0.05, fmt:v=>v.toFixed(2), s:v=>{look.rough=v; accumReset=true;}},
  {t:'rng', l:'haze', note:'New look. Fades the far part of the view toward a dark blue. Scaled to the depth actually in view.', g:()=>look.haze, min:0,max:1,step:0.05, fmt:v=>v.toFixed(2), s:v=>{look.haze=v; accumReset=true;}},
  {t:'sec', l:'Inspect'},
  {t:'seg', l:'view', note:'New look. One ingredient on its own: the surface normals, the depth, the occlusion, or the key light that reaches the surface.', g:()=>look.view, opts:[['picture',0],['normals',2],['depth',3],['occl.',4],['light',5]], s:v=>{look.view=v; accumReset=true;}},
  {t:'seg', l:'compare', note:'New look. Splits the picture at the mouse. normals = 4-tap on the left, from depth on the right. landing = hit landing off on the left, on on the right. Same samples on both sides.', g:()=>look.compare, opts:[['off',0],['normals',1],['landing',2]], s:v=>{look.compare=v; accumReset=true;}},
  {t:'sec', l:'Recording'},
  {t:'rng', l:'kf spacing', note:'Recording only — higher = fewer, sparser keyframes (records farther apart as you fly). Sit still to decide; nothing records until you move.', g:()=>kfSpacing, min:0.3,max:5,step:0.1, fmt:v=>v.toFixed(1)+'×', s:v=>{kfSpacing=v;}},
];
(function buildControls(){
  const body = $id('ctlbody');
  for (const c of CTLS){
    if (c.t==='sec'){ const h=document.createElement('div'); h.className='ctl-sec'; h.textContent=c.l; body.appendChild(h); continue; }
    const row=document.createElement('div'); row.className='ctl';
    const lbl=document.createElement('span'); lbl.className='lbl'; lbl.textContent=c.l; row.appendChild(lbl);
    if (c.t==='rng'){
      const inp=document.createElement('input'); inp.type='range'; inp.min=c.min; inp.max=c.max; inp.step=c.step;
      const val=document.createElement('span'); val.className='val';
      inp.oninput=()=>{ const x=parseFloat(inp.value); c.s(x); val.textContent=(c.fmt||(y=>y))(x); };
      c._inp=inp; c._val=val; row.appendChild(inp); row.appendChild(val);
    } else if (c.t==='seg'){
      const seg=document.createElement('div'); seg.className='seg';
      c._btns=c.opts.map(([txt,v])=>{ const bn=document.createElement('button'); bn.textContent=txt;
        bn.onclick=()=>{ c.s(v); syncControls(); }; seg.appendChild(bn); return bn; });
      row.appendChild(seg);
    } else if (c.t==='tog'){
      const seg=document.createElement('div'); seg.className='seg';
      const off=document.createElement('button'), on=document.createElement('button');
      off.textContent='off'; on.textContent='on';
      off.onclick=()=>{ c.s(false); syncControls(); }; on.onclick=()=>{ c.s(true); syncControls(); };
      c._btns=[off,on]; c._vals=[false,true]; seg.appendChild(off); seg.appendChild(on); row.appendChild(seg);
    } else if (c.t==='act'){
      const seg=document.createElement('div'); seg.className='seg';
      for(const [txt,fn] of c.acts){ const bn=document.createElement('button'); bn.textContent=txt; bn.onclick=fn; seg.appendChild(bn); }
      row.appendChild(seg);
    }
    body.appendChild(row);
    if (c.note){ const nt=document.createElement('div'); nt.className='note'; nt.textContent=c.note; body.appendChild(nt); }
  }
})();
function syncControls(){
  for (const c of CTLS){ if(!c.g) continue; const v=c.g();
    if (c.t==='rng'){ if(c._inp){ c._inp.value=v; c._val.textContent=(c.fmt||(y=>y))(v); } }
    else if (c.t==='seg'){ c._btns.forEach((bn,i)=>bn.classList.toggle('on', c.opts[i][1]===v)); }
    else if (c.t==='tog'){ c._btns.forEach((bn,i)=>bn.classList.toggle('on', c._vals[i]===v)); }
  }
}
const ctlEl=$id('controls'), renderEl=$id('render');
const PANEL_W = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--panel-w')) || 400;  // docked-panel width (CSS --panel-w) — feeds the render-aspect math
const isOpen = el => el.style.display==='flex';                       // panel open ⇔ its frame is shown
/* ── unified docked-panel manager: controls / render / about share the right-hand frame, are mutually
   exclusive, and reflow the picture (body.panel-open) rather than covering it. No backdrop-click close. */
function _panels(){ return [ctlEl, renderEl, aboutEl]; }
function _panelBtns(){ return [[ctlEl,$id('ctlbtn')], [renderEl,$id('renderbtn')], [aboutEl,$id('aboutbtn')]]; }
function refreshPanelState(){
  dzScaffold.classList.toggle('panel-open', _panels().some(isOpen));
  _panelBtns().forEach(([p,b])=>{ if(b) b.classList.toggle('active', isOpen(p)); });   // light the open panel's toggle
  accumReset = true;                                  // canvas reflows (width changes) → re-render the still at the new aspect
}
function closePanels(){ _panels().forEach(p=>{ if(p) p.style.display='none'; }); refreshPanelState(); }
function openPanel(el){
  if (EMBED) return;                                                  // embedded: the host has its own panels
  const wasOpen = isOpen(el);
  _panels().forEach(p=>{ if(p) p.style.display='none'; });            // mutually exclusive — one frame at a time
  if(!wasOpen) el.style.display='flex';
  refreshPanelState();
  if(isOpen(ctlEl)) syncControls();
  if(el===renderEl && isOpen(renderEl)){ recLabel(); rstat(pathInfo(curPath())); }
}
$id('ctlbtn').addEventListener('click', ()=>openPanel(ctlEl));
ctlEl.addEventListener('click', e=>{ if(e.target.className==='x') closePanels(); });
dzInterval(()=>{ if(isOpen(ctlEl)) syncControls(); }, 150);    // reflect key-driven changes live (reads the DOM, no mirrored flag)

/* ── render / export panel ── */
let uiPath=null;
function curPath(){ return uiPath || api.lastPath(); }
function pathInfo(p){ const n=p&&p.frames?p.frames.length:0; const last=n?(p.frames[n-1].t||0):0; return n ? `path: ${n} keyframes${last?`, ${last.toFixed(1)} s`:''}` : 'no path yet — Record or Load one'; }
function rstat(m){ const e=$id('rstatus'); if(e) e.textContent=m; }
function recLabel(){ $id('r_rec').textContent = (api.recording&&api.recording()) ? '■ Stop & save' : '● Record'; }
$id('renderbtn').addEventListener('click', ()=>openPanel(renderEl));
renderEl.addEventListener('click', e=>{ if(e.target.className==='x') closePanels(); });
$id('r_export').onclick=()=>{ if(!deepActive){ rstat('Export needs deep mode — zoom past 1e-4, or press P to force it'); return; }
  if(exporting){ rstat('busy — a render is already running'); return; }
  closePanels(); api.export(+$id('r_res').value, +$id('r_samp').value); };
$id('r_rec').onclick=()=>{ const rec=api.recordToggle(); recLabel(); if(!rec){ uiPath=api.lastPath(); rstat(pathInfo(uiPath)); } else rstat('recording — fly, then Stop'); };
$id('r_load').onclick=async()=>{ const d=await api.loadPath(); if(d){ uiPath=d; rstat('loaded · '+pathInfo(d)); } };
$id('r_save').onclick=()=>{ const p=curPath(); if(p&&p.frames&&p.frames.length) api.savePath(p); else rstat('nothing to save'); };
$id('r_play').onclick=()=>{ const p=curPath(); if(p&&p.frames&&p.frames.length){ closePanels(); api.playPath(p, { frames:+$id('r_frames').value, fps:30 }); } else rstat('no path — Record or Load first'); };
$id('r_smooth').onclick=()=>{ const p=curPath(); if(p&&p.frames&&p.frames.length){ api.smoothPath(p, +$id('r_sp').value, +$id('r_sa').value); uiPath=p; rstat('smoothed · '+pathInfo(p)); } else rstat('no path to smooth'); };
$id('r_render').onclick=()=>{ const p=curPath(); if(!p||!p.frames||!p.frames.length){ rstat('no path — Record or Load first'); return; }
  if(!deepReady){ rstat('deep renderer still compiling — try again in a moment'); return; }
  if(exporting){ rstat('busy — a render is already running'); return; }
  closePanels(); api.renderPath(p, { frames:+$id('r_frames').value, longEdge:+$id('r_pres').value, samples:+$id('r_psamp').value }); };
$id('r_cancel').onclick=()=>api.cancelRender();
function setPower(n){
  n = Math.max(2, Math.min(16, n|0));
  if (n === nPower) return;
  nPower = n; cam.power = n;
  binomN = binomPad(nPower); binomN1 = binomPad(nPower-1);   // recompute binomial coeffs
  orbitDirty = true;                                         // the orbit (and BLA table) depend on n
}
const TAU = 2*Math.PI;
function setPhase(dth, dph){
  phaseTheta = ((phaseTheta + dth) % TAU + TAU) % TAU;
  phasePhi   = ((phasePhi   + dph) % TAU + TAU) % TAU;
  orbitDirty = true;                                         // the orbit depends on phase
}
dzListen(dzKeyTarget, 'keyup',e=>{ keys[e.code]=false; });
dzListen(dzClickTarget, 'click',()=>{ if (!inputLocked) canvas.requestPointerLock(); });
dzListen(window, 'mousemove', e => {              // the compare divider follows the free mouse
  if (!look.compare || inputLocked || document.pointerLockElement === canvas) return;
  const r = canvas.getBoundingClientRect(), f = (e.clientX - r.left) / Math.max(r.width, 1);
  if (f >= 0 && f <= 1 && Math.abs(f - look.split) > 0.002) { look.split = f; accumReset = true; }
});
/* live mouse-capture cue: the help line's lead phrase reflects whether the fly camera holds the pointer */
dzListen(document, 'pointerlockchange',()=>{
  const cue=dzById('lockcue'); if(!cue) return;
  const locked=document.pointerLockElement===canvas;
  cue.textContent = locked ? '✦ flying — ESC to release' : 'click to capture mouse';
  cue.style.color = locked ? '#7fd1b0' : '';
});
dzListen(window, 'mousemove',e=>{ if(inputOwner === 'host' || document.pointerLockElement!==canvas) return;
  cam.yaw   += e.movementX*0.0009;
  cam.pitch  = Math.max(-1.55,Math.min(1.55, cam.pitch - e.movementY*0.0009));
  accumReset = true;                                     // rotation changes the view (not the orbit)
});
function basis(){
  const cp=Math.cos(cam.pitch), sp=Math.sin(cam.pitch), cy=Math.cos(cam.yaw), sy=Math.sin(cam.yaw);
  const fwd=[cp*cy, sp, cp*sy];
  const right=[Math.cos(cam.yaw+Math.PI/2),0,Math.sin(cam.yaw+Math.PI/2)];
  const up=[ right[1]*fwd[2]-right[2]*fwd[1], right[2]*fwd[0]-right[0]*fwd[2], right[0]*fwd[1]-right[1]*fwd[0] ];
  return {fwd,right,up};
}
/* three-quarter KEY light, camera-relative: upper-right and toward the camera (front-lit). Fixed
   world-direction lighting grazes/backlights as you fly because the surface's orientation relative
   to you keeps changing; anchoring the key to the camera basis keeps the modelling consistent. */
function keyLightDir(right, up, fwd){
  const l = [ right[0]*0.5 + up[0]*0.85 - fwd[0]*0.35,
              right[1]*0.5 + up[1]*0.85 - fwd[1]*0.35,
              right[2]*0.5 + up[2]*0.85 - fwd[2]*0.35 ];
  const m = Math.hypot(...l) || 1; return [l[0]/m, l[1]/m, l[2]/m];
}
function deCPU(px,py,pz, power, N){
    let zx=px,zy=py,zz=pz, dr=1, r=0;
    for(let i=0;i<N;i++){
        r=Math.hypot(zx,zy,zz);
        if(r>2) break;
        const rp1=Math.pow(r,power-1);
        dr=rp1*power*dr+1;
        let theta=Math.acos(Math.max(-1,Math.min(1,zz/r)));
        let phi=Math.atan2(zy,zx);
        theta=theta*power+phaseTheta; phi=phi*power+phasePhi;
        const zr=rp1*r;
        zx=zr*Math.sin(theta)*Math.cos(phi)+px;
        zy=zr*Math.sin(phi)*Math.sin(theta)+py;
        zz=zr*Math.cos(theta)+pz;
    }
    return 0.5*Math.log(Math.max(r,1e-8))*r/Math.max(dr,1e-20);
}

/* deCPU with escape semantics matching the kernel (for the INDEPENDENT direct check) */
function deCPUesc(px,py,pz, N){
    let zx=px,zy=py,zz=pz, dr=1, r=0, escaped=false, it=0;
    for(let i=0;i<N;i++){
        r=Math.hypot(zx,zy,zz);
        if(r>2){ escaped=true; break; }
        it=i+1;
        const rp1=Math.pow(r,nPower-1);
        dr=rp1*nPower*dr+1;
        let theta=Math.acos(Math.max(-1,Math.min(1,zz/r)))*nPower+phaseTheta;
        let phi=Math.atan2(zy,zx)*nPower+phasePhi;
        const zr=rp1*r;
        zx=zr*Math.sin(theta)*Math.cos(phi)+px;
        zy=zr*Math.sin(phi)*Math.sin(theta)+py;
        zz=zr*Math.cos(theta)+pz;
    }
    if(!escaped){ r=Math.hypot(zx,zy,zz); escaped = r>2; }
    return { de: 0.5*Math.log(Math.max(r,1e-300))*r/dr, escaped, iters: it };
}
/* INDEPENDENT cross-check: GPU perturbed de vs DIRECT f64 evaluation at the explicit
   position (no reference orbit, no §3, no HDR — nothing shared with the kernel).
   Valid while de ≫ 1e-16 (f64 absolute floor on O(1) positions), i.e. depth ≳ 1e-13. */
api.directCheck = function(tvals){
  curOrbit = buildRefOrbit(camHP, cam.iters + 2);
  uploadOrbit(curOrbit);
  const {fwd} = basis();
  const cp = camHP.map(hp.toNum);
  return tvals.map(tv => {
    const g = gateProbeAt(tv);                                   // GPU HDR + CPU-perturbed
    const p = [0,1,2].map(j => cp[j] + tv*fwd[j]);
    const d = deCPUesc(p[0], p[1], p[2], cam.iters);             // direct f64 — independent
    const rel = Math.abs(g.gpu - d.de) / Math.max(Math.abs(d.de), 1e-300);
    return { t: tv, gpu: g.gpu, pert: g.cpu, direct: d.de, escG: g.escG, escD: d.escaped, rel };
  });
};

/* ════════ DEEP NON-CIRCULAR REFEREE: BigInt direct march of the explicit point ════════
   Same role as deCPUesc but in fixed-point (Chebyshev transcendental-free, isqrt+div only)
   — NO reference orbit, NO §3, NO HDR, NO f64 position. Valid to arbitrary depth (P=256
   ≈ 77 digits → de rel floor ~1e-27 even at depth 1e-50). Escape convention mirrors
   deCPUesc/the kernel: r checked at loop top; dr NOT updated on the escaping iteration. */
function hpDirectDE(posFp, maxIter){
  const Pb = BigInt(hp.P), SCALE = hp.SCALE, ONE = SCALE;
  const mul = (a,b) => (a*b) >> Pb;
  const isqrt = (n) => { if (n < 2n) return n < 0n ? 0n : n; let x = n, y = (x + 1n) >> 1n; while (y < x) { x = y; y = (x + n / x) >> 1n; } return x; };
  const fsqrt = (a) => isqrt(a << Pb);
  const ipow = (a,n) => { let r=ONE,b=a,e=n; while(e>0){ if(e&1) r=mul(r,b); b=mul(b,b); e>>=1; } return r; };
  const Nbig = BigInt(nPower);
  let v = posFp.slice(), dr = ONE, escaped = false, r2 = 0n;
  for (let i = 0; i < maxIter; i++) {
    r2 = mul(v[0],v[0]) + mul(v[1],v[1]) + mul(v[2],v[2]);
    if (r2 > 4n * SCALE) { escaped = true; break; }
    const r = fsqrt(r2), rNm1 = ipow(r, nPower - 1);     // r^(n−1); dr = n·r^(n−1)·dr + 1
    dr = Nbig * mul(rNm1, dr) + ONE;
    v = hp.addV(hp.P8(v), posFp);
  }
  if (!escaped) {
    r2 = mul(v[0],v[0]) + mul(v[1],v[1]) + mul(v[2],v[2]);
    escaped = r2 > 4n * SCALE;
  }
  const r = Number(fsqrt(r2)) / Number(SCALE);
  const drF = Number(dr) / Number(SCALE);
  return { de: 0.5 * r * Math.log(Math.max(r, 1e-300)) / drF, escaped };
}
/* deep direct check: GPU perturbed de vs the BigInt direct referee at the GPU's EXACT
   probe t (f32-mantissa HDR split — so both sides evaluate the identical point). */
api.directCheckHP = function(tvals){
  curOrbit = buildRefOrbit(camHP, cam.iters + 2);
  uploadOrbit(curOrbit);
  const {fwd} = basis();
  return tvals.map(tv => {
    const h = hdrSplit(tv);
    const tUsed = h.m * Math.pow(2, h.e);                        // the t the GPU actually sees
    const g = gateProbeAt(tUsed);                                // GPU HDR + CPU-perturbed
    const pos = camHP.map((c, j) => c + hp.fromNum(tUsed * fwd[j]));
    const d = hpDirectDE(pos, cam.iters);                        // BigInt direct — independent
    const rel = Math.abs(g.gpu - d.de) / Math.max(Math.abs(d.de), 1e-300);
    return { t: tUsed, gpu: g.gpu, pert: g.cpu, direct: d.de, escG: g.escG, escD: d.escaped, rel };
  });
};

/* ════════ NEAR-CRITICAL POPULATION STUDY: per-pixel escape-flag flips at view scale ════════
   Renders a W×W grid of pertOrbit evaluations at transverse offsets δc = spread·(uv·frame)
   (probe mode 2), then compares each pixel against the CPU f64-perturbed referee (proven ≡
   BigInt direct). Returns flip fraction, spatial clustering, and de agreement stats —
   decides whether deep views ship as-is (scattered fizz) or need work (structured artifacts). */
api.popStudy = function(spread, W){
  curOrbit = buildRefOrbit(camHP, cam.iters + 2);
  uploadOrbit(curOrbit);
  const {fwd,right,up} = basis();
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,W,W,0,gl.RGBA,gl.FLOAT,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
  const D = deepCtx(), x = D.x;
  gl.useProgram(D.p); bindQuad(D.p);
  gl.viewport(0,0,W,W);
  gl.uniform2f(x.res, W, W);
  gl.uniform3fv(x.fwd,fwd); gl.uniform3fv(x.right,right); gl.uniform3fv(x.up,up);
  gl.uniform1f(x.fov,Math.tan(0.5*1.1));
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,orbitTex);
  gl.uniform1i(x.orbit,0);
  gl.uniform1i(x.len,curOrbit.len);
  gl.uniform1i(x.iters,cam.iters);
  gl.uniform1i(x.probe,2);
  gl.uniform2f(x.jitter,0,0);
  setBlaUniforms(x); setPowerUniforms(x);
  const hs = hdrSplit(spread);
  gl.uniform2f(x.spreadT, hs.m, hs.e);
  gl.drawArrays(gl.TRIANGLES,0,3);
  const px = new Float32Array(W*W*4);
  gl.readPixels(0,0,W,W,gl.RGBA,gl.FLOAT,px);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  gl.uniform1i(x.probe,0);
  gl.deleteFramebuffer(fbo); gl.deleteTexture(tex);
  const spreadUsed = hs.m * Math.pow(2, hs.e);
  const flipGrid = new Uint8Array(W*W);
  let flips=0, worstRel=0, rels=[], escCount=0;
  for (let j=0;j<W;j++) for (let i=0;i<W;i++){
    const uvx=((i+0.5)-0.5*W)/W, uvy=((j+0.5)-0.5*W)/W;
    const cv=[uvx*right[0]+uvy*up[0], uvx*right[1]+uvy*up[1], uvx*right[2]+uvy*up[2]];
    const r = pertOrbitJS(curOrbit, scl3(cv, spreadUsed), cam.iters);
    const o4=(j*W+i)*4, gDe=px[o4]*Math.pow(2,px[o4+1]), gEsc=px[o4+2]>0.5;
    if (gEsc!==r.escaped){ flips++; flipGrid[j*W+i]=1; }
    else if (gEsc){
      escCount++;
      const rel=Math.abs(gDe-r.de)/Math.max(Math.abs(r.de),1e-300);
      rels.push(rel); if(rel>worstRel) worstRel=rel;
    }
  }
  let clustered=0;
  for (let j=0;j<W;j++) for (let i=0;i<W;i++){
    if(!flipGrid[j*W+i]) continue;
    if((i>0&&flipGrid[j*W+i-1])||(i<W-1&&flipGrid[j*W+i+1])||(j>0&&flipGrid[(j-1)*W+i])||(j<W-1&&flipGrid[(j+1)*W+i])) clustered++;
  }
  rels.sort((a,b)=>a-b);
  return { W, spread: spreadUsed, flips, flipFrac: flips/(W*W), clusterFrac: flips?clustered/flips:0,
           escFrac: escCount/(W*W), medianRel: rels.length?rels[rels.length>>1]:NaN, worstRel };
};

/* ════════ MARCH-POPULATION STUDY (SLICE 6b): the decisive shipping metric ════════
   probe 3 marches the FULL near-field ray per grid pixel on the GPU (real camera rays +
   pixAng); the CPU referee (pertMarchJS, same capped stepping + bisection) marches the same
   rays. We report median/p95 of |ΔtHit|/tHit over pixels both sides hit, plus hit-flag
   disagreement. DECISION: p95 < pixAng ⇒ the rendered surface POSITION agrees within a
   display pixel ⇒ 1e-50 ships visually (pointwise de noise near the boundary does NOT move
   the bisected boundary position by a visible amount). */
api.marchPop = function(W){
  curOrbit = buildRefOrbit(camHP, cam.iters + 2);
  uploadOrbit(curOrbit);
  const {fwd,right,up} = basis();
  const fovScale = Math.tan(0.5*1.1);
  const pixAng = fovScale / Math.max(canvas.clientHeight, 2);   // SAME cone the renderer uses
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,W,W,0,gl.RGBA,gl.FLOAT,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
  const D = deepCtx(), x = D.x;
  gl.useProgram(D.p); bindQuad(D.p);
  gl.viewport(0,0,W,W);
  gl.uniform2f(x.res, W, W);
  gl.uniform3fv(x.fwd,fwd); gl.uniform3fv(x.right,right); gl.uniform3fv(x.up,up);
  gl.uniform1f(x.fov, fovScale);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,orbitTex);
  gl.uniform1i(x.orbit,0);
  gl.uniform1i(x.len,curOrbit.len);
  gl.uniform1i(x.iters,cam.iters);
  gl.uniform1i(x.probe,3);
  gl.uniform1f(x.pixAng, pixAng);
  gl.uniform1i(x.bisectMax, bisectMax);
  gl.uniform2f(x.jitter,0,0);
  setBlaUniforms(x); setPowerUniforms(x);
  gl.drawArrays(gl.TRIANGLES,0,3);
  const px = new Float32Array(W*W*4);
  gl.readPixels(0,0,W,W,gl.RGBA,gl.FLOAT,px);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  gl.uniform1i(x.probe,0);
  gl.deleteFramebuffer(fbo); gl.deleteTexture(tex);
  let bothHit=0, hitDisagree=0, gHitCount=0, cHitCount=0, dts=[], worst=0;
  const dtGrid = new Float64Array(W*W).fill(-1);
  for (let j=0;j<W;j++) for (let i=0;i<W;i++){
    const uvx=((i+0.5)-0.5*W)/W, uvy=((j+0.5)-0.5*W)/W;
    const rdv=[fwd[0]+fovScale*(uvx*right[0]+uvy*up[0]),
               fwd[1]+fovScale*(uvx*right[1]+uvy*up[1]),
               fwd[2]+fovScale*(uvx*right[2]+uvy*up[2])];
    const rl=Math.hypot(...rdv), rd=[rdv[0]/rl,rdv[1]/rl,rdv[2]/rl];
    const cpu = pertMarchJS(curOrbit, rd, cam.iters, pixAng);
    const o4=(j*W+i)*4, gT=px[o4]*Math.pow(2,px[o4+1]), gHit=px[o4+2]>0.5;
    if (gHit) gHitCount++; if (cpu.hit) cHitCount++;
    if (gHit !== cpu.hit){ hitDisagree++; continue; }
    if (gHit && cpu.hit){
      bothHit++;
      const dt = Math.abs(gT - cpu.t) / Math.max(Math.abs(cpu.t), 1e-300);
      dts.push(dt); dtGrid[j*W+i]=dt; if(dt>worst) worst=dt;
    }
  }
  dts.sort((a,b)=>a-b);
  const median = dts.length ? dts[dts.length>>1] : NaN;
  const p95 = dts.length ? dts[Math.min(dts.length-1, Math.floor(0.95*dts.length))] : NaN;
  // spatial clustering of the SUB-PIXEL-EXCEEDING pixels (structured artifact vs scattered fizz)
  let bad=0, badClustered=0;
  const isBad = k => dtGrid[k] >= 0 && dtGrid[k] > pixAng;
  for (let j=0;j<W;j++) for (let i=0;i<W;i++){ const k=j*W+i; if(!isBad(k)) continue; bad++;
    if((i>0&&isBad(k-1))||(i<W-1&&isBad(k+1))||(j>0&&isBad(k-W))||(j<W-1&&isBad(k+W))) badClustered++; }
  return { W, pixAng, bothHit, hitDisagree, hitDisagreeFrac: hitDisagree/(W*W),
           gHitFrac: gHitCount/(W*W), cHitFrac: cHitCount/(W*W),
           median, p95, worst, subPixelP95: p95 < pixAng,
           badFrac: bothHit?bad/bothHit:0, badClusterFrac: bad?badClustered/bad:0 };
};

/* ════════ COLOUR-INPUT STUDY: are the palette's inputs right at the rendered surface? ════════
   The gates above referee the distance estimate. The picture's COLOUR comes from two other orbit
   outputs — the trap (min |z_k|) and the escape-iteration count — and nothing checked those.
   probe 6 returns, per pixel, the surface t the march found plus the hit orbit's trap and count;
   the referee re-runs that exact point as a BigInt DIRECT orbit (no reference orbit, no §3, no
   kernel code) with the same loop convention as pertOrbit (step, then test / track |z|). Reported:
   relative trap error (median / p95 / worst) and how many pixels disagree on the count. */
function hpDirectTrap(posFp, maxIter){
  const Pb = BigInt(hp.P), SC = Number(hp.SCALE), mul = (a,b) => (a*b) >> Pb;
  let v = posFp.slice(), trap2 = Infinity, it = 0, escaped = false;
  for (let i = 0; i < maxIter; i++) {
    v = hp.addV(hp.P8(v), posFp); it++;
    const r2 = Number(mul(v[0],v[0]) + mul(v[1],v[1]) + mul(v[2],v[2])) / SC;
    if (r2 < trap2) trap2 = r2;
    if (r2 > 4) { escaped = true; break; }
  }
  return { trap: Math.sqrt(trap2), iters: it, escaped };
}
api.trapStudy = function(W){
  curOrbit = buildRefOrbit(camHP, cam.iters + 2);
  uploadOrbit(curOrbit);
  const {fwd,right,up} = basis();
  const fovScale = Math.tan(0.5*1.1), pixAng = fovScale / Math.max(canvas.clientHeight, 2);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,W,W,0,gl.RGBA,gl.FLOAT,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
  const D = deepCtx(), x = D.x;
  gl.useProgram(D.p); bindQuad(D.p);
  gl.viewport(0,0,W,W);
  gl.uniform2f(x.res, W, W);
  gl.uniform3fv(x.fwd,fwd); gl.uniform3fv(x.right,right); gl.uniform3fv(x.up,up);
  gl.uniform1f(x.fov, fovScale);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,orbitTex);
  gl.uniform1i(x.orbit,0); gl.uniform1i(x.len,curOrbit.len); gl.uniform1i(x.iters,cam.iters);
  gl.uniform1i(x.probe,6);
  gl.uniform1f(x.pixAng, pixAng);
  gl.uniform1i(x.bisectMax, bisectMax);
  gl.uniform1i(x.normalIters, 0); gl.uniform1i(x.bisectIters, 0); gl.uniform1f(x.stepRelax, stepRelax);
  gl.uniform2f(x.jitter,0,0);
  setBlaUniforms(x); setPowerUniforms(x);
  gl.drawArrays(gl.TRIANGLES,0,3);
  const px = new Float32Array(W*W*4);
  gl.readPixels(0,0,W,W,gl.RGBA,gl.FLOAT,px);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  gl.uniform1i(x.probe,0);
  gl.deleteFramebuffer(fbo); gl.deleteTexture(tex);
  const rels = [], lrel = []; let hits = 0, iterMis = 0, escMis = 0;
  for (let j=0;j<W;j++) for (let i=0;i<W;i++){
    const o4=(j*W+i)*4, itG = px[o4+3];
    if (itG < 0) continue;
    hits++;
    const uvx=((i+0.5)-0.5*W)/W, uvy=((j+0.5)-0.5*W)/W;
    const rdv=[fwd[0]+fovScale*(uvx*right[0]+uvy*up[0]), fwd[1]+fovScale*(uvx*right[1]+uvy*up[1]), fwd[2]+fovScale*(uvx*right[2]+uvy*up[2])];
    const rl=Math.hypot(...rdv);
    /* the GPU normalises rd in f32 and scales by its own f32-mantissa t: mirror both, so the
       referee evaluates the point the GPU evaluated, not a neighbour 1e-7·t away */
    const rd = rdv.map(c => Math.fround(Math.fround(c)/Math.fround(rl)));
    const tG = px[o4]*Math.pow(2,px[o4+1]);
    const pos = camHP.map((c, k) => c + hp.fromNum(tG * rd[k]));
    const r = hpDirectTrap(pos, cam.iters);
    if (r.iters !== itG) iterMis++;
    if (!r.escaped) escMis++;
    const rel = Math.abs(px[o4+2] - r.trap) / Math.max(r.trap, 1e-300);
    rels.push(rel); lrel.push(Math.abs(Math.log(Math.max(px[o4+2],1e-300)) - Math.log(Math.max(r.trap,1e-300))));
  }
  rels.sort((a,b)=>a-b); lrel.sort((a,b)=>a-b);
  const q = (a, p) => a.length ? a[Math.min(a.length-1, Math.floor(p*a.length))] : NaN;
  return { W, hits, hitFrac: hits/(W*W), iterMismatch: iterMis, iterMismatchFrac: hits ? iterMis/hits : NaN, refNotEscaped: escMis,
           trapRelMedian: q(rels,0.5), trapRelP95: q(rels,0.95), trapRelWorst: q(rels,1),
           logTrapP95: q(lrel,0.95) };   // palette phase error = 1.5·colorScale·|Δ ln trap|
};

let gate = { relT: NaN, tGPU: NaN, tCPU: NaN, when: 0 };
api.gate = gate;                            // smoke-test handle
api.cam = cam;
api.smoothedDist = () => smoothedDist;      // perf-harness handle: surface distance at the current view
/* perf-harness handle: render the CURRENT deep view into an owned n×n RGBA8 FBO (jitter 0,
   honouring the live lever globals) and read it back — reliable capture independent of the
   canvas's preserveDrawingBuffer:false. Used to image-diff a lever OFF vs ON at the same camera. */
let thumbFbo = null, thumbTex = null, thumbN = 0;
function drawThumb(n) {                          // leaves thumbFbo bound, the n×n deep view drawn into it
  if (thumbN !== n) {
    if (thumbTex) gl.deleteTexture(thumbTex); if (thumbFbo) gl.deleteFramebuffer(thumbFbo);
    thumbTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, thumbTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, n, n, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    thumbFbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, thumbFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, thumbTex, 0);
    thumbN = n;
  }
  drawSquare(n, thumbFbo);
}
/* draw the current deep view as an n×n square into `fbo`, with program context D (default: the
   active variant) and probe mode `probe` (default 0 = the normal shaded render). `acc`, if given,
   makes it one jittered sample of a still: { jitter: [x, y], alpha, guide: { set, n } } (alpha
   and guide as drawDeep's). Shared by the thumbnail, bench, stats and guide-study handles; leaves
   `fbo` bound. */
function drawSquare(n, fbo, D, probe, acc) {
  D = D || deepCtx();
  const { fwd, right, up } = basis(), x = D.x;
  gl.useProgram(D.p); bindQuad(D.p);
  gl.uniform2f(x.res, n, n);
  gl.uniform3fv(x.fwd, fwd); gl.uniform3fv(x.right, right); gl.uniform3fv(x.up, up);
  gl.uniform1f(x.fov, Math.tan(0.5 * 1.1));
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, orbitTex);
  gl.uniform1i(x.orbit, 0); gl.uniform1i(x.len, curOrbit.len); gl.uniform1i(x.iters, cam.iters);
  gl.uniform1i(x.probe, probe || 0); gl.uniform3fv(x.camF, cam.pos);
  gl.uniform1i(x.normalMode, gNormalMode()); gl.uniform1i(x.bisectMax, Math.min(24, bisectMax));
  gl.uniform1i(x.normalIters, normalIters); gl.uniform1i(x.bisectIters, bisectIters);
  gl.uniform1f(x.stepRelax, stepRelax);
  gl.uniform1f(x.pixAng, Math.tan(0.5 * 1.1) / n / surfMul);
  const jx = acc ? acc.jitter[0] : 0, jy = acc ? acc.jitter[1] : 0;
  gl.uniform2f(x.jitter, jx, jy);
  setBlaUniforms(x); setPowerUniforms(x);
  if (probe) {                                   // a probe is pass G's raw output
    if (acc && acc.guide) {                      // a probe of a guided sample: the guide's depths are relative to uRefE, as drawDeep sets it
      gl.uniform1f(x.refE, Math.floor(Math.log2(Math.max(smoothedDist, 1e-300))));
      bindGuide(x, acc.guide);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, n, n);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.uniform1i(x.probe, 0);
    if (acc && acc.guide) bindGuide(x, null);
  } else {
    ensureGbuf(n, n);
    drawDeep(D, fbo, 0, 0, n, n, { W: n, H: n, jx, jy, fwd, right, up, light: keyLightDir(right, up, fwd),
      alpha: acc ? acc.alpha : 0, guide: acc ? acc.guide : null,
      rig: acc && acc.guide && acc.guide.n > 0 ? 0 : 'fresh' });
  }
}
const sqJitter = (s, n) => [(halton(s + 1, 2) - 0.5) / n, (halton(s + 1, 3) - 0.5) / n];
/* run jittered samples 0..count-1 of an n×n still into `fbo` (a float target, running mean) with
   guide set `gs`, exactly as the live accumulation does; `each`, if given, is called after every
   sample with `fbo` bound */
function accumSquare(n, fbo, gs, count, each){
  for (let k = 0; k < count; k++) {
    drawSquare(n, fbo, null, 0, { jitter: sqJitter(k, n), alpha: k ? 1 / (k + 1) : 0, guide: { set: gs, n: k } });
    gs.cur = 1 - gs.cur;
    if (each) each(k);
  }
}
/* GUIDE STUDY — is the guided start a pure speed-up? Runs `samples` jittered n×n samples through
   the real accumulation path twice — guide off, then on — with the SAME jitter sequence, and compares
     the pictures      mean / max |RGB| difference of the two accumulated results (0..255)
     the depth guides  both runs keep, per pixel, the nearest hit over all samples. A pixel whose
                       guided value ends DEEPER than the unguided one (by > 4 pixel cones) is a
                       surface the guided run skipped — the failure this referee exists to catch
     the time          ms per sample after the first (the first is unguided in both runs)
   and runs it a third time, guide off, with the march step factor 1 % larger: how far two honest
   renders of the same samples differ. That is the floor the guide is judged against. */
api.guideStudy = (n, samples) => {
  if (!deepProg || !curOrbit) return null;
  n = n || 256; samples = samples || 16;
  const sync = new Float32Array(4);
  const run = (guided, relax) => {
    const was = guideOn, wasRelax = stepRelax; guideOn = guided; if (relax) stepRelax = relax;
    gl.activeTexture(gl.TEXTURE7);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, n, n, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0);
    const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const gs = makeGuideSet(n, n), ms = []; let t0 = performance.now();
    accumSquare(n, fbo, gs, samples, () => {
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, sync);          // blocks until the draws are done
      const t1 = performance.now(); ms.push(t1 - t0); t0 = t1; });
    const col = new Float32Array(n * n * 4), dep = new Float32Array(n * n * 4);
    gl.readPixels(0, 0, n, n, gl.RGBA, gl.FLOAT, col);
    gl.bindFramebuffer(gl.FRAMEBUFFER, gs[gs.cur].fbo); gl.readPixels(0, 0, n, n, gl.RGBA, gl.FLOAT, dep);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fbo); gl.deleteTexture(tex); freeGuideSet(gs); guideOn = was; stepRelax = wasRelax;
    return { col, dep, ms };
  };
  const U = run(false), G = run(true), V = run(false, 0.86);   // V: unguided again, march step ×0.86 instead of ×0.85
  const N = n * n, pixAng = Math.tan(0.5 * 1.1) / n / surfMul;
  let dsum = 0, dmax = 0, fsum = 0;
  for (let i = 0; i < N; i++) for (let c = 0; c < 3; c++) { const d = Math.abs(U.col[i*4+c] - G.col[i*4+c]) * 255; dsum += d; if (d > dmax) dmax = d;
    fsum += Math.abs(U.col[i*4+c] - V.col[i*4+c]) * 255; }
  /* nearest-hit depth per pixel, run B against run A: how many pixels ended > 4 pixel cones deeper /
     nearer in B, and where the hit/no-hit record differs. Depths are log2 t (relative), 1e30 = no record. */
  const depthCmp = (A, B) => { let both = 0, deeper = 0, nearer = 0, kindMis = 0, worst = 0;
    for (let i = 0; i < N; i++) {
      const ka = A.dep[i*4] < 1e29, kb = B.dep[i*4] < 1e29;
      if (ka !== kb) { kindMis++; continue; }
      if (!ka) continue;
      both++;
      const px = (Math.pow(2, B.dep[i*4] - A.dep[i*4]) - 1) / pixAng;   // + = B ended deeper, in pixel cones
      if (px > 4) deeper++; if (px < -4) nearer++;
      if (px > worst) worst = px;
    }
    return { both, deeper, nearer, kindMis, worst }; };
  const dg = depthCmp(U, G), df = depthCmp(U, V);
  let guidable = 0; for (let i = 0; i < N; i++) if (G.dep[i*4] < 1e29) guidable++;
  const med = a => { const c = a.slice().sort((p, q) => p - q); return c[c.length >> 1]; };
  const mu = med(U.ms.slice(1)), mg = med(G.ms.slice(1));
  return { n, samples, guideK, guideR, guideFirst, bla: blaEnabled, normalMode,
    colourMeanDiff: dsum / (N * 3), colourMaxDiff: dmax,
    noiseFloor: fsum / (N * 3),                 // same measure between two UNGUIDED runs whose march step differs by 1%
    cleanHitFrac: guidable / N,                 // pixels every sample hit — the ones that can be guided
    bothHit: dg.both, kindMismatch: dg.kindMis, skipped: dg.deeper, skippedFrac: dg.both ? dg.deeper / dg.both : 0, worstDeeperPx: dg.worst, nearer: dg.nearer,
    floor: { deeper: df.deeper, nearer: df.nearer, kindMismatch: df.kindMis, worstDeeperPx: df.worst },   // same, between the two guide-OFF runs
    msFirst: U.ms[0], msUnguided: mu, msGuided: mg, speedup: mu / mg,
    msGuidedWorst: Math.max(...G.ms.slice(1)) };   // a blocking shader recompile at the first guided draw would show here
};
/* WORK-COUNT STUDY — where does a frame's GPU time actually go? Renders the current view n×n with
   the counter-instrumented variant (USE_STATS) and summarises, per pixel:
     steps      march steps taken                    orbits   kernel calls during the march
     work       kernel loop passes — one real perturbation step OR one BLA skip (the unit of cost)
     bisect     bisection evaluations                normals  share of all work spent on normal taps
   and how unevenly the work is spread: the GPU shades pixels in lock-step groups, so a group costs
   what its slowest pixel costs. lockLoss[B] = (Σ over B×B blocks of max·area) / Σ work — the factor
   by which block-synchronous execution exceeds the ideal of every pixel stopping when it is done. */
api.stats = (n, guideSamples) => {
  if (!deepProg || !curOrbit) return null;
  n = n || 128;
  const v = ensureVariant(blaEnabled, true);
  if (!v) return { error: variantErr[vKey(blaEnabled, true)] };
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, n, n, 0, gl.RGBA, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  /* guideSamples > 0: first accumulate that many jittered samples (normal variant) to build a depth
     guide, then count the work of the NEXT sample, which starts from it */
  let acc = null, gs = null;
  if (guideSamples > 0) {
    gs = makeGuideSet(n, n);
    accumSquare(n, fbo, gs, guideSamples);
    acc = { jitter: sqJitter(guideSamples, n), guide: { set: gs, n: guideSamples } };
  }
  const grab = (probe) => { drawSquare(n, fbo, v, probe, acc); const px = new Float32Array(n * n * 4);
    gl.readPixels(0, 0, n, n, gl.RGBA, gl.FLOAT, px); return px; };
  const a = grab(4), b = grab(5);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fbo); gl.deleteTexture(tex); freeGuideSet(gs);
  const N = n * n, col = (px, c) => { const o = new Float64Array(N); for (let i = 0; i < N; i++) o[i] = px[i * 4 + c]; return o; };
  const steps = col(a, 0), orbM = col(a, 1), workM = col(a, 2), workT = col(a, 3);
  const kind = col(b, 0), iters = col(b, 1), bis = col(b, 2), big = col(b, 3);
  const sum = arr => { let s = 0; for (let i = 0; i < arr.length; i++) s += arr[i]; return s; };
  const desc = arr => { const c = Array.from(arr).sort((p, q) => p - q), L = c.length;
    return { mean: sum(arr) / L, p50: c[L >> 1], p95: c[Math.min(L - 1, Math.floor(0.95 * L))], max: c[L - 1] }; };
  const frac = k => { let c = 0; for (let i = 0; i < N; i++) if (kind[i] === k) c++; return c / N; };
  const lockLoss = B => { let tot = 0, lock = 0;
    for (let by = 0; by < n; by += B) for (let bx = 0; bx < n; bx += B) { let mx = 0, cnt = 0;
      for (let y = by; y < Math.min(n, by + B); y++) for (let xx = bx; xx < Math.min(n, bx + B); xx++) {
        const w = workT[y * n + xx]; tot += w; if (w > mx) mx = w; cnt++; }
      lock += mx * cnt; }
    return lock / Math.max(tot, 1); };
  const hitOnly = arr => { const o = []; for (let i = 0; i < N; i++) if (kind[i] === 1) o.push(arr[i]); return o.length ? o : [0]; };
  const sWT = sum(workT), sWM = sum(workM), sOM = sum(orbM), sIt = sum(iters);
  return { n, iters: cam.iters, bla: blaEnabled, normalMode, guided: !!acc && !guideIsFull(guideSamples),
    kinds: { hit: frac(1), far: frac(2), exhausted: frac(3), miss: frac(0) },
    steps: desc(steps), stepsHit: desc(hitOnly(steps)), orbitsMarch: desc(orbM), bisect: desc(bis),
    workMarch: desc(workM), workTotal: desc(workT),
    workPerOrbit: sWM / Math.max(sOM, 1),          // kernel passes per march orbit (≤ iters; lower with BLA / early escape)
    normalShare: 1 - sWM / Math.max(sWT, 1),       // fraction of all work spent on the normal taps
    bisectShare: sum(bis) / Math.max(sOM, 1),      // fraction of march orbits that are bisection evaluations
    skipRatio: 1 - sWT / Math.max(sIt, 1),         // iterations skipped by BLA (0 with BLA off)
    bigAngleShare: sum(big) / Math.max(2 * sWT, 1),// fraction of angle-delta evaluations on the large-angle branch
    lockLoss: { b2: lockLoss(2), b4: lockLoss(4), b8: lockLoss(8), b16: lockLoss(16) } };
};
/* pass G's raw output for the current view, n×n (layout: grep PASS G OUTPUT) — for referees and
   for looking at what the shading was given. */
api.readGbuf = (n) => {
  if (!deepProg || !curOrbit) return null;
  n = n || 48;
  drawThumb(n);
  gl.bindFramebuffer(gl.FRAMEBUFFER, gbufFbo);
  const px = new Float32Array(n * n * 4); gl.readPixels(0, 0, n, n, gl.RGBA, gl.FLOAT, px);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return Array.from(px);
};
api.renderThumb = (n) => {
  if (!deepProg || !curOrbit) return null;
  n = n || 48;
  drawThumb(n);
  const px = new Uint8Array(n * n * 4); gl.readPixels(0, 0, n, n, gl.RGBA, gl.UNSIGNED_BYTE, px);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return Array.from(px);
};
/* bench handle: GPU time of ONE n×n deep draw at the current camera, isolated from vsync and from
   the frame loop — draw, then a 1×1 readPixels (blocks until the draw has really finished). Returns
   per-draw ms over `reps` draws (after `warm` unmeasured ones). Keep n modest: one draw must stay
   well under the ~2 s Windows GPU watchdog. */
api.timeThumb = (n, reps, warm) => {
  if (!deepProg || !curOrbit) return null;
  n = n || 256; reps = reps || 9; warm = warm === undefined ? 2 : warm;
  const one = new Uint8Array(4), ms = [];
  for (let i = 0; i < warm + reps; i++) {
    const t0 = performance.now();
    drawThumb(n);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, one);
    if (i >= warm) ms.push(performance.now() - t0);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  ms.sort((a, b) => a - b);
  return { n, reps, median: ms[ms.length >> 1], min: ms[0], max: ms[ms.length - 1] };
};
/* offset-diagnostic twin: render the f32 BASELINE kernel into the same n² FBO at the same camera/
   res, so we can cross-correlate f32 vs deep and quantify the switch offset (pixels). */
api.renderThumbF32 = (n) => {
  if (!prog) return null;
  n = n || 48;
  if (thumbN !== n) {
    if (thumbTex) gl.deleteTexture(thumbTex); if (thumbFbo) gl.deleteFramebuffer(thumbFbo);
    thumbTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, thumbTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, n, n, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    thumbFbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, thumbFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, thumbTex, 0);
    thumbN = n;
  }
  const { fwd, right, up } = basis();
  gl.useProgram(prog); bindQuad(prog);
  gl.uniform2f(u.res, n, n);
  gl.uniform3fv(u.camPos, cam.pos);
  gl.uniform3fv(u.fwd, fwd); gl.uniform3fv(u.right, right); gl.uniform3fv(u.up, up);
  gl.uniform1f(u.fov, Math.tan(0.5 * 1.1));
  gl.uniform1f(u.power, nPower); gl.uniform1f(u.iters, cam.iters);
  gl.uniform1f(u.prec, 5e-7);
  gl.uniform3fv(u.light, keyLightDir(right, up, fwd));
  gl.uniform2f(u.phase, phaseTheta, phasePhi);
  gl.bindFramebuffer(gl.FRAMEBUFFER, thumbFbo); gl.viewport(0, 0, n, n);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  const px = new Uint8Array(n * n * 4); gl.readPixels(0, 0, n, n, gl.RGBA, gl.UNSIGNED_BYTE, px);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return Array.from(px);
};
api.setCamHP = (p)=>{ camHP = p.map(hp.fromNum); cam.pos = camHP.map(hp.toNum); orbitDirty=true; };
api.moveAlong = (dir, dist)=>{               // exact HP move (smoke-test dive)
  if (inputOwner === 'host') hostMoveAt = performance.now();
  for(let j=0;j<3;j++) camHP[j] += hp.fromNum(dir[j]*dist);
  cam.pos = camHP.map(hp.toNum); orbitDirty=true;
};
api.setDiv = (d)=>{ frameLong = Math.max(2, Math.round(Math.max(dzViewW(),dzViewH())/Math.max(1,d))); };  // perf-matrix handle (divisor → absolute frame; window, not canvas — 1:1 mode resizes the canvas)
api.setFrame = (px)=>{ frameLong = Math.max(2, px|0); accumReset = true; };  // absolute live frame long-edge
api.setNormalMode = (m)=>{ normalMode = m; };  // 0 screen-space / 1 3-tap / 2 4-tap / 3 from depth
api.setLand = (b)=>{ landMode = b ? 1 : 0; accumReset = true; };   // hit landing on / off
api.setHitRefine = (n)=>{ hitRefine = Math.max(0, Math.min(12, n|0)); accumReset = true; };   // HIT REFINE: halvings per hit (0 = off, the default)
api.setBisect = (n)=>{ bisectMax = n; };      // bisection iteration cap
api.setNormalIters = (n)=>{ normalIters = Math.max(0, n|0); accumReset = true; };  // PERF LEVER: cap normal-tap pertOrbit iters (0 = full)
api.setBisectIters = (n)=>{ bisectIters = Math.max(0, n|0); accumReset = true; };  // PERF LEVER: cap bisection pertOrbit iters (0 = full)
api.setStepRelax = (r)=>{ stepRelax = Math.max(0, +r); accumReset = true; };  // PERF LEVER: march step = relax·de (0 = default 0.85)
api.setCapRelax = (m)=>{ capRelax = Math.max(1, +m); accumReset = true; };    // QUALITY LEVER: scale deep res cap (1 = shipped; 1e6 = uncapped/full-res deep)
api.setPower = (n)=>{ nPower=Math.max(2,Math.min(16,n|0)); cam.power=nPower; binomN=binomPad(nPower); binomN1=binomPad(nPower-1); orbitDirty=true; };
api.setPhase = (th,ph)=>{ phaseTheta=th||0; phasePhi=ph||0; orbitDirty=true; };
// Shell setters (not in the historical page, added 2026-10-08): what the page's `iters` and
// `auto-iters` control rows and its [ ] I keys do, for a host that owns those values.
api.setIters = (n)=>{ cam.iters=Math.max(4,Math.min(160,n|0)); orbitDirty=true; };
api.setAutoIters = (b)=>{ autoIters=!!b; };
api.autoIters = ()=>autoIters;
// Read-back of three march settings that had setters only (0 for stepRelax means the default 0.85).
api.marchLevers = ()=>({ stepRelax, capRelax, mode: modeOverride, hitRefine });
api.power = ()=>nPower;
api.setColor = (m,s)=>{ colorMode=m|0; if(s) colorScale=s; accumReset=true; };
api.setSurf = (m)=>{ surfMul=Math.max(0.25,Math.min(256,m||1)); accumReset=true; };  // ray-closeness ÷pixAng
api.setGate = (b)=>{ gateOn=!!b; if(!gateOn) gate.relT=NaN; };  // live ground-truth gate on/off
api.setLight = (m,f)=>{ lightMode=m|0; if(f) falloffMul=f; accumReset=true; };  // 0 dir/1 headlamp/2 both
api.setKfSpacing = (v)=>{ kfSpacing = Math.max(0.2, +v||1.5); };  // recording: keyframe sparsity (higher = fewer)
let forceRebuild=false;                            // measurement: simulate flight (rebuild every frame)
api.forceRebuild = (b)=>{ forceRebuild = !!b; };
api.setAccum = (b)=>{ accumEnabled = !!b; accumReset = true; };  // progressive-still toggle
api.setMode = (m)=>{ modeOverride = m; orbitDirty = true; };     // 'auto' | 'deep' | 'f32' (perf-harness handle)

/* ════════ HI-RES EXPORT (TDR-safe tiled render → PNG) ════════
   The live view is clamped to a small frame (frameLong) for the GPU watchdog, so it can't show full resolution. Export
   renders the CURRENT view at an arbitrary resolution by TILING (each tile a small draw, well under
   the ~2 s watchdog), accumulating `samples` sub-pixel-jittered passes per pixel (denoise + AA), then
   downloads a PNG. Uses the current camera / power / phase / colour / normals. */
let exporting = false, cancelRender = false;
api.exporting = () => exporting;
api.cancelRender = () => { cancelRender = true; };   // abort __export / __renderPath at the next row
function showProg(html){ if(loading){ loading.style.display='flex'; loading.querySelector('.box').innerHTML=html; } }
/* Render the CURRENT view at an arbitrary resolution by TILING (each tile a small draw ≪ the ~2 s
   watchdog) with `samples` jittered passes (denoise+AA), and return a PNG Blob. Caller owns the
   `exporting` flag + orbit currency. Shared by __export (one still) and __renderPath (frame sequence). */
async function renderFrameToBlob(longEdge, samples, tile, label, rigMode){
  longEdge = longEdge || 2560; samples = Math.max(1, samples||16); tile = tile || 128;
  const cW = Math.max(2,canvas.clientWidth), cH = Math.max(2,canvas.clientHeight), aspect = cW/cH;
  let { w:W, h:H } = longEdgeToWH(longEdge, aspect);
  W -= W % 2; H -= H % 2;                            // tiling needs even dimensions
  const {fwd,right,up} = basis();
  const light = keyLightDir(right, up, fwd);   // camera-relative key — stable modelling as you fly
  const aT = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, aT);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,W,H,0,gl.RGBA,gl.FLOAT,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
  const aF = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, aF);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,aT,0);
  const D = deepCtx(), x = D.x;
  gl.useProgram(D.p); bindQuad(D.p);
  gl.uniform2f(x.res, W, H);
  gl.uniform3fv(x.fwd,fwd); gl.uniform3fv(x.right,right); gl.uniform3fv(x.up,up);
  gl.uniform1f(x.fov, Math.tan(0.5*1.1));
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, orbitTex);
  gl.uniform1i(x.orbit,0); gl.uniform1i(x.len,curOrbit.len); gl.uniform1i(x.iters,cam.iters);
  gl.uniform1i(x.probe,0); gl.uniform3fv(x.camF, cam.pos);
  gl.uniform1i(x.normalMode, gNormalMode());
  gl.uniform1i(x.bisectMax, Math.min(24, bisectMax + Math.max(0, Math.round(Math.log2(surfMul)))));
  gl.uniform1i(x.normalIters, normalIters);   // PERF LEVER (0 = full uIters)
  gl.uniform1i(x.bisectIters, bisectIters);   // PERF LEVER (0 = full uIters)
  gl.uniform1f(x.stepRelax, stepRelax);       // PERF LEVER (0 = default 0.85)
  gl.uniform1f(x.pixAng, Math.tan(0.5*1.1)/H/surfMul);
  setBlaUniforms(x); setPowerUniforms(x);
  // headlamp falloff must track THIS frame's depth (setPowerUniforms used the frozen smoothedDist,
  // wrong for a moving path). Derive the surface-distance scale from the reference orbit at the camera.
  let dScale;
  { let ke = curOrbit.len-1; for (let k=0;k<curOrbit.len;k++) if (curOrbit.Rk[k] > 2) { ke=k; break; }
    dScale = Math.max(1e-300, 0.5*curOrbit.Rk[ke]*Math.log(Math.max(curOrbit.Rk[ke],1e-300))/curOrbit.DRk[ke]); }
  /* The new look's occlusion and shadows read the depth buffer far from the pixel, so the whole
     picture is marched into a full-size G-buffer (row by row, for the watchdog) and shaded in one
     draw per sample. The classic look keeps a G-buffer of one row of tiles. A picture too large
     for a full-size G-buffer is refused: shaded in strips it would show a seam at every row. */
  const whole = look.mode === 1;
  const pad = !whole && normalMode === 3 ? look.nrmTap : 0;   // normals from depth read the rows above and below
  if (whole) {
    let ok = W * H <= WHOLE_MAX_PX;
    if (ok) { gl.getError(); ensureGbuf(W, H); gl.bindFramebuffer(gl.FRAMEBUFFER, gbufFbo);
      ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE && gl.getError() === gl.NO_ERROR; }
    if (!ok) { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(aF); gl.deleteTexture(aT); gbufW = gbufH = 0;
      return { error: `${W}×${H} is too large to export with the new look on this GPU — lower the resolution, or switch look to classic` }; }
  } else ensureGbuf(W, tile + 2*pad);
  const gs = W * H <= GUIDE_MAX_PX ? makeGuideSet(W, H) : null;   // the depth guide, though, is the size of the picture
  // live on-screen preview: show the render building up on the canvas (blit each row below)
  if (loading) loading.style.background = 'transparent';   // let the preview show behind the % box
  setCanvasSize(Math.max(2,canvas.clientWidth), Math.max(2,canvas.clientHeight));
  const tilesX = Math.ceil(W/tile), tilesY = Math.ceil(H/tile);
  const total = tilesX*tilesY*samples; let done = 0;
  const raf = () => new Promise(r => requestAnimationFrame(r));
  const syncPx = new Float32Array(4); let lastYield = performance.now();
  for (let s = 0; s < samples; s++) {
    const jx = (halton(s+1,2)-0.5)/H, jy = (halton(s+1,3)-0.5)/H;
    gl.uniform2f(x.jitter, jx, jy);
    const S = { W, H, jx, jy, fwd, right, up, light, dist: dScale, alpha: s === 0 ? 0 : 1.0/(s+1), ox: 0, oy: 0,   // running mean over the samples
                tile, pad, guide: gs ? { set: gs, n: s } : null };
    for (let ty = 0; ty < tilesY; ty++) {
      S.oy = whole ? 0 : Math.max(0, ty*tile - pad);
      S.phase = whole ? 'march' : undefined;
      drawDeep(D, aF, 0, ty*tile, W, Math.min(tile, H-ty*tile), S); done += tilesX;   // a row: tilesX march draws (then one shade, unless the whole picture is shaded at the end)
      /* Wait for this row's tiles to really finish (a 1-pixel readback blocks until they have): the
         GPU queue never holds more than one row, which is what keeps the ~2 s watchdog away. Then
         hand the frame back to the browser only every ~80 ms. The loop used to wait for a display
         refresh after EVERY row — rows × samples refreshes, 3.2 s of pure waiting for a 1440p /
         16-sample frame — fine while a row took longer than a refresh, the bottleneck once it does
         not. */
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, syncPx);
      const lastRow = ty === tilesY - 1 && s === samples - 1;
      if (performance.now() - lastYield > 80 || lastRow) {
        // live preview: scale the in-progress float buffer onto the canvas, then restore aF for drawing
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, aF); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
        gl.blitFramebuffer(0,0,W,H, 0,0,canvas.width,canvas.height, gl.COLOR_BUFFER_BIT, gl.LINEAR);
        gl.bindFramebuffer(gl.FRAMEBUFFER, aF);
        showProg(`<span class="spin">◓</span> ${label} ${W}×${H}… ${Math.round(100*done/total)}%`);
        await raf(); lastYield = performance.now();
        if (cancelRender) { gl.disable(gl.BLEND); gl.deleteFramebuffer(aF); gl.deleteTexture(aT); freeGuideSet(gs); return { cancelled:true }; }
      }
    }
    if (whole) { S.phase = 'shade'; S.oy = 0; S.rig = s === 0 ? (rigMode === undefined ? 'fresh' : rigMode) : 0; drawDeep(D, aF, 0, 0, W, H, S); }
    if (gs) gs.cur = 1 - gs.cur;
  }
  freeGuideSet(gs);
  gl.disable(gl.BLEND);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, aF);
  const fbuf = new Float32Array(W*H*4);
  gl.readPixels(0,0,W,H,gl.RGBA,gl.FLOAT,fbuf);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteFramebuffer(aF); gl.deleteTexture(aT);
  const img = new Uint8ClampedArray(W*H*4);
  for (let yy=0; yy<H; yy++) for (let xx=0; xx<W; xx++){      // flip Y (GL is bottom-up)
    const sI=((H-1-yy)*W+xx)*4, dI=(yy*W+xx)*4;
    img[dI]=fbuf[sI]*255; img[dI+1]=fbuf[sI+1]*255; img[dI+2]=fbuf[sI+2]*255; img[dI+3]=255;
  }
  const c2 = document.createElement('canvas'); c2.width=W; c2.height=H;
  c2.getContext('2d').putImageData(new ImageData(img,W,H),0,0);
  const blob = await new Promise(res => c2.toBlob(res, 'image/png'));
  return { blob, W, H };
}
function dlBlob(blob, name){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 8000); }
/* harness: run the tiled export without downloading; returns its time and what came out (the PNG
   blob is decoded back, so this checks the file a user would get) */
api.exportTimed = async function(longEdge, samples, tile){
  if (!deepReady || exporting || !curOrbit) return { error: 'not ready / no deep orbit' };
  exporting = true; cancelRender = false;
  try {
    if (orbitDirty) { curOrbit = buildRefOrbit(camHP, cam.iters + 2); uploadOrbit(curOrbit); orbitDirty = false; }
    const t0 = performance.now();
    const r = await renderFrameToBlob(longEdge, samples, tile, 'testing');
    if (r.error) return r;
    const ms = performance.now() - t0;
    const bmp = await createImageBitmap(r.blob); const c = document.createElement('canvas'); c.width = r.W; c.height = r.H;
    const cx = c.getContext('2d'); cx.drawImage(bmp, 0, 0);
    const d = cx.getImageData(0, 0, r.W, r.H).data; let lit = 0, sum = 0; const n = r.W * r.H;
    for (let i = 0; i < n; i++) { const v = d[i*4] + d[i*4+1] + d[i*4+2]; sum += v; if (v > 24) lit++; }
    return { W: r.W, H: r.H, samples, ms, litFrac: lit / n, meanLevel: sum / (n * 3) };
  } finally { exporting = false; cancelRender = false; if (loading) { loading.style.display='none'; loading.style.background=''; } }
};
api.export = async function(longEdge, samples, tile){
  if (!deepReady || exporting || !curOrbit) return { error: 'not ready / no deep orbit' };
  exporting = true; cancelRender = false;
  try {
    if (orbitDirty) { curOrbit = buildRefOrbit(camHP, cam.iters + 2); uploadOrbit(curOrbit); orbitDirty = false; }
    const r = await renderFrameToBlob(longEdge, samples, tile, 'exporting');
    if (r.error) { openPanel(renderEl); rstat(r.error); return r; }
    if (r.cancelled) return { cancelled:true };
    dlBlob(r.blob, `mandelbulb_n${nPower}_d${smoothedDist.toExponential(0)}_${r.W}x${r.H}.png`);
    return { W:r.W, H:r.H };
  } finally { exporting = false; cancelRender = false; if (loading) { loading.style.display='none'; loading.style.background=''; } }
};

/* ════════ CAMERA-PATH RECORD / EXPORT / REPLAY ════════
   Records the full camera + scene state per frame (camHP kept as P=256 BigInt decimal STRINGS — no
   precision loss), downloads it as JSON, and can replay it (BigInt-lerped positions → smooth at any
   depth). Pairs with __export for rendering a path to an image sequence. */
let recording=false, recPath=[], recStart=0;
/* SPARSE, movement-driven keyframing. A keyframe lands only at a decision point — when you
   COMMIT to a move (start flying after stopping to look), at depth-relative spacing along a
   long continuous flight, or on a deliberate stationary pan. Sit still deciding (raise res,
   look around, pick a direction) and nothing records, so keyframes mark where you chose to go. */
let kfLastHP=null, kfLastYaw=0, kfLastPitch=0, kfWasFlying=false;
const KF_MOVE=0.35, KF_ROT=0.30;                 // base: emit after ~1/3 of the surface distance moved, or ~17° pan
let   kfSpacing=1.5;                             // UI knob (key/slider): higher ⇒ fewer, sparser keyframes
const SEG_BASE=1.4, SEG_MIN=0.7, SEG_MAX=3.0;    // cinematic seconds per segment (decoupled from real dwell)
function isFlying(){ return !!(keys['KeyW']||keys['KeyS']||keys['KeyA']||keys['KeyD']||keys['KeyE']||keys['KeyQ']) || (inputOwner === 'host' && performance.now() - hostMoveAt < 150); }
function pushKeyframe(move, rot){
  recPath.push({ cam:camHP.map(String), yaw:cam.yaw, pitch:cam.pitch,
    iters:cam.iters, power:nPower, phase:[phaseTheta,phasePhi], light:lightMode,
    falloff:falloffMul, color:colorMode, cscale:colorScale, surf:surfMul, move, rot });
  kfLastHP = camHP.slice(); kfLastYaw = cam.yaw; kfLastPitch = cam.pitch;
}
function capturePathFrame(){
  const flying = isFlying();
  if (kfLastHP === null) { pushKeyframe(0,0); kfWasFlying = flying; return; }   // initial viewpoint
  let s2 = 0; for (let j=0;j<3;j++){ const d = hp.toNum(camHP[j]-kfLastHP[j]); s2 += d*d; }
  const move = Math.sqrt(s2) / Math.max(smoothedDist, 1e-300);                  // depth-relative distance
  const rot  = Math.abs(cam.yaw-kfLastYaw) + Math.abs(cam.pitch-kfLastPitch);
  const mv = KF_MOVE*kfSpacing, rt = KF_ROT*kfSpacing;
  let emit = false;
  if (flying && !kfWasFlying && (move > 0.25*mv || rot > 0.4*rt)) emit = true;   // re-commit AFTER a real look-around (not every nudge)
  else if (move > mv)              emit = true;     // spacing along a long continuous flight
  else if (!flying && rot > rt)    emit = true;     // deliberate stationary pan
  if (emit) pushKeyframe(move, rot);
  kfWasFlying = flying;
}
/* cinematic timing: every segment gets eased seconds scaled by its depth-relative move/rotation,
   independent of how long you dwelled choosing — steady pacing regardless of decision time. */
function assignCinematicTime(ks){
  let t = 0;
  for (let i=0;i<ks.length;i++){
    if (i===0){ ks[i].t = 0; continue; }
    const k = ks[i];
    const dur = Math.min(SEG_MAX, Math.max(SEG_MIN, SEG_BASE*(0.7*(k.move||0)/KF_MOVE + 0.3*(k.rot||0)/KF_ROT)));
    t += dur; ks[i].t = t;
  }
  return ks;
}
function downloadJSON(obj, name){
  const blob = new Blob([JSON.stringify(obj)], { type:'application/json' });
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name;
  a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
}
api.recordToggle = () => {
  if (!recording) { recording=true; recPath=[]; recStart=performance.now(); kfLastHP=null; kfWasFlying=false; }
  else { recording=false;
    assignCinematicTime(recPath);                          // decouple video time from real dwell time
    smoothPath(recPath);                                   // de-jitter before saving / using
    if (recPath.length && !EMBED) downloadJSON(             // embedded: the host reads __lastPath() and saves it itself
{ format:'gmt-mbulb-path', P:256, fovScale:1.1, frames:recPath },
      `mandelbulb_path_${recPath.length}f_${Date.now()}.json`);
  }
  return recording;
};
api.lastPath = () => ({ format:'gmt-mbulb-path', P:256, fovScale:1.1, frames:recPath });
api.recording = () => recording;
api.smoothPath = (data, passes, alpha) => {           // re-smooth a path object (e.g. a loaded one)
  smoothPath((data&&data.frames)||[], passes, alpha); return data; };
api.samplePath = (data, tau) => { const ks=(data&&data.frames)||[]; if(!ks.length) return null;
  pathSampleAt(ks, tau); return cam.pos.slice(); };          // scrub a path to time tau → camera pos
/* CATMULL-ROM interpolation through 4 keyframes (p0..p3, local param u∈[0,1] on segment p1→p2):
   velocity-continuous (C1), so motion flows smoothly THROUGH keyframes instead of the kinked,
   stuttering segments linear lerp gives. camHP stays exact-ish at any depth — the spline runs on
   the BigInt DELTAS from p1 (weights fixed-point ×1e15), so the huge absolute position never loses
   bits. The LOOK (colour/lighting/detail) is your current live settings, not the recorded ones. */
const SW_CR = 1000000000000000n;
function pathApplyCR(p0, p1, p2, p3, u){
  const u2=u*u, u3=u2*u;
  const w0=-0.5*u+u2-0.5*u3, w2=0.5*u+2.0*u2-1.5*u3, w3=-0.5*u2+0.5*u3, w1=1.0-w0-w2-w3;
  const q = x => BigInt(Math.round(x*1e15));
  const W0=q(w0), W2=q(w2), W3=q(w3);
  camHP = [0,1,2].map(j=>{ const c0=BigInt(p0.cam[j]),c1=BigInt(p1.cam[j]),c2=BigInt(p2.cam[j]),c3=BigInt(p3.cam[j]);
    return c1 + (W0*(c0-c1) + W2*(c2-c1) + W3*(c3-c1)) / SW_CR; });
  cam.pos = camHP.map(hp.toNum);
  cam.yaw   = w0*p0.yaw   + w1*p1.yaw   + w2*p2.yaw   + w3*p3.yaw;
  cam.pitch = w0*p0.pitch + w1*p1.pitch + w2*p2.pitch + w3*p3.pitch;
  cam.iters = Math.round(p1.iters + (p2.iters-p1.iters)*u);
  if (p1.power !== nPower) api.setPower(p1.power);
  api.setPhase(p1.phase[0], p1.phase[1]);
  orbitDirty=true; accumReset=true;
}
function pathSampleAt(ks, tau){                            // set the camera/state at absolute time tau
  const n = ks.length;
  if (n === 1 || tau >= ks[n-1].t) { const e=ks[n-1]; pathApplyCR(e,e,e,e,0); return; }
  let i=0; while (i<n-1 && ks[i+1].t < tau) i++;
  const u = ks[i+1].t > ks[i].t ? (tau-ks[i].t)/(ks[i+1].t-ks[i].t) : 0;
  pathApplyCR(ks[Math.max(0,i-1)], ks[i], ks[i+1], ks[Math.min(n-1,i+2)], u);
}
/* ════════ ARC-LENGTH, FRAME-PACED playback (constant eased speed) ════════
   The recorded per-segment durations were uneven (clamped), so Catmull-Rom speed = tangent/duration
   jumped at every keyframe → start-stop. Instead we drive the spline by ARC LENGTH (the depth-relative
   move + turn stored per keyframe) and step it by OUTPUT-FRAME index, so the preview and the rendered
   sequence move identically at a constant, gently eased speed — independent of how the path was flown. */
function pathArc(ks){
  const n = ks.length, cum = new Float64Array(n); let total = 0, haveMetric = false;
  for (let i = 1; i < n; i++){
    const seg = (ks[i].move||0) + 0.6*(ks[i].rot||0);     // depth-relative distance + turn, as "length"
    if (seg > 0) haveMetric = true;
    cum[i] = (total += Math.max(seg, 1e-6));
  }
  if (!haveMetric){ for (let i=0;i<n;i++) cum[i]=i; total = Math.max(1, n-1); }   // old/loaded path → uniform spacing
  return { cum, total };
}
const easeInOut = p => p<=0 ? 0 : p>=1 ? 1 : p*p*p*(p*(6.0*p-15.0)+10.0);   // smootherstep: gentle ends, flat middle
function sampleArc(ks, arc, s){                            // place the camera at arc-length s ∈ [0,total]
  const n = ks.length;
  if (n === 1){ pathApplyCR(ks[0],ks[0],ks[0],ks[0],0); return; }
  const cum = arc.cum;
  s = Math.max(0, Math.min(arc.total, s));
  let i = 0; while (i < n-2 && cum[i+1] < s) i++;          // segment [i, i+1]
  const segLen = cum[i+1] - cum[i];
  const u = segLen > 0 ? (s - cum[i]) / segLen : 0;
  pathApplyCR(ks[Math.max(0,i-1)], ks[i], ks[i+1], ks[Math.min(n-1,i+2)], u);
}
/* light low-pass on the recorded keyframes to take the hand-jitter off the path (position + look
   direction). Endpoints fixed; a few mild passes — enough to de-jitter without cutting corners. */
function smoothPath(ks, passes=2, alpha=0.4){
  if (ks.length < 3) return ks;
  const A = BigInt(Math.round(alpha*1e6));
  for (let p=0; p<passes; p++){
    const cam0 = ks.map(k=>k.cam.map(BigInt)), yaw0 = ks.map(k=>k.yaw), pit0 = ks.map(k=>k.pitch);
    for (let i=1; i<ks.length-1; i++){
      ks[i].cam = [0,1,2].map(j=>{ const avg=(cam0[i-1][j]+cam0[i+1][j])/2n;
        return (cam0[i][j] + A*(avg-cam0[i][j])/1000000n).toString(); });
      ks[i].yaw   = yaw0[i] + alpha*((yaw0[i-1]+yaw0[i+1])/2 - yaw0[i]);
      ks[i].pitch = pit0[i] + alpha*((pit0[i-1]+pit0[i+1])/2 - pit0[i]);
    }
  }
  return ks;
}
let playingPath = false;
api.stopPlay = () => { playingPath = false; };               // Esc / button aborts a preview
api.playPath = async function(data, opts){           // frame-paced arc-length replay (matches the render)
  const ks = (data && data.frames) || []; if (ks.length < 1) return { error:'empty path' };
  opts = opts || {};
  const fps = opts.fps || 30;
  const nFrames = opts.frames ? Math.max(2, opts.frames|0)
                              : Math.max(2, Math.round(((ks[ks.length-1].t)||((ks.length-1)*1.4)) * fps));
  const arc = pathArc(ks), dur = nFrames / fps;            // preview real-time duration = the video's duration
  modeOverride = 'deep'; const t0 = performance.now(); playingPath = true;
  return new Promise(res => { const step = () => {
    if (!playingPath) { res({ frames: ks.length, stopped:true }); return; }   // aborted
    const p = (performance.now()-t0)/1000 / dur;
    if (p >= 1) { sampleArc(ks, arc, arc.total); playingPath = false; res({ frames: ks.length }); return; }
    sampleArc(ks, arc, easeInOut(p) * arc.total); requestAnimationFrame(step);
  }; step(); });
};
api.loadPath = () => new Promise(res => {             // file-picker → RETURN the path object (no play)
  const inp=document.createElement('input'); inp.type='file'; inp.accept='.json';
  inp.onchange=()=>{ const f=inp.files[0]; if(!f){res(null);return;} const r=new FileReader();
    r.onload=()=>{ try { res(JSON.parse(r.result)); } catch(e){ console.log('bad path',e); res(null); } };
    r.readAsText(f); };
  inp.click();
});
api.loadPathFile = () => api.loadPath().then(d => d ? api.playPath(d) : null);  // load → replay
api.savePath = (data, name) => { if(!data||!data.frames) return;                          // download a path object
  downloadJSON(data, name || `mandelbulb_path_${data.frames.length}f_${Date.now()}.json`); };

/* ════════ RENDER A PATH → image sequence (ZIP(s) of numbered PNGs, no deps) ════════
   Resamples the path at `fps` (camera BigInt-interpolated), renders each frame at export quality
   (tiled, TDR-safe), and packs the PNGs into ZIP(s) — split at ~500 MB. Cancelling (Esc) still
   downloads the frames completed so far (named `_partial`). Feed the frames to ffmpeg for video. */
const crcTable=(()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n;
  for(let k=0;k<8;k++) c = c&1 ? 0xEDB88320^(c>>>1) : c>>>1; t[n]=c>>>0; } return t; })();
function crc32(u8){ let c=0xFFFFFFFF; for(let i=0;i<u8.length;i++) c=(c>>>8)^crcTable[(c^u8[i])&0xFF]; return (c^0xFFFFFFFF)>>>0; }
function makeZip(files){                                   // store method (PNGs already compressed)
  const u16=v=>new Uint8Array([v&255,(v>>8)&255]), u32=v=>new Uint8Array([v&255,(v>>8)&255,(v>>16)&255,(v>>>24)&255]);
  const cat=a=>{ let n=0; for(const z of a) n+=z.length; const o=new Uint8Array(n); let p=0; for(const z of a){o.set(z,p);p+=z.length;} return o; };
  const enc=new TextEncoder(); const parts=[], central=[]; let off=0;
  for(const f of files){ const nm=enc.encode(f.name), crc=crc32(f.data), sz=f.data.length;
    const lfh=cat([u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(sz),u32(sz),u16(nm.length),u16(0),nm]);
    parts.push(lfh, f.data);
    central.push(cat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(sz),u32(sz),u16(nm.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(off),nm]));
    off += lfh.length + sz; }
  let cdLen=0; for(const c of central){ parts.push(c); cdLen+=c.length; }
  parts.push(cat([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(cdLen),u32(off),u16(0)]));
  return new Blob(parts, {type:'application/zip'});
}
/* Pack files into ZIP(s) and download. A single sequence can be many GB, so we cap each ZIP at
   ~500 MB and split across `_partNNofMM` files — this also keeps every archive well under the
   store-ZIP 32-bit (4 GB) size/offset limit. Downloads are staggered so the browser doesn't
   collapse the multi-file save into one. Returns the number of ZIPs written. */
const ZIP_SPLIT_BYTES = 500 * 1024 * 1024;
async function packAndDownloadZips(files, baseName){
  if (!files.length) return 0;
  const parts = []; let cur = [], curBytes = 0;
  for (const f of files){
    const fBytes = f.data.length + f.name.length * 2 + 90;          // data + LFH + central-dir overhead (conservative)
    if (cur.length && curBytes + fBytes > ZIP_SPLIT_BYTES){ parts.push(cur); cur = []; curBytes = 0; }
    cur.push(f); curBytes += fBytes;
  }
  if (cur.length) parts.push(cur);
  const n = parts.length, pad = String(n).length;
  for (let i = 0; i < n; i++){
    const tag = n === 1 ? '' : `_part${String(i+1).padStart(pad,'0')}of${n}`;
    showProg(`<span class="spin">◓</span> packing ZIP ${i+1}/${n}…`);
    dlBlob(makeZip(parts[i]), `${baseName}${tag}.zip`);
    if (i < n-1) await new Promise(r => setTimeout(r, 500));        // stagger so all parts actually download
  }
  return n;
}
api.renderPath = async function(data, opts){
  if (!deepReady || exporting) return { error:'not ready / busy' };
  opts = opts || {};
  let ks = (data && data.frames) || []; if (ks.length < 1) return { error:'empty path' };
  if (opts.smooth) {                                       // opts.smooth: passes (number) or {passes,alpha}
    const s=opts.smooth, passes=(typeof s==='number'?s:s.passes)||2, alpha=(typeof s==='object'&&s.alpha)||0.4;
    ks = ks.map(k=>({...k, cam:k.cam.slice(), phase:k.phase.slice()})); smoothPath(ks, passes, alpha);  // smooth a COPY
  }
  const fps = opts.fps||30, longEdge = opts.longEdge||1280, samples = opts.samples||8, tile = opts.tile||128;
  const arc = pathArc(ks);
  // `frames` (total output frames) is the master clock: the path is stepped by ARC LENGTH across exactly
  // this many frames, so motion speed = path/frames (constant, eased) — more frames = slower, smoother.
  const nFrames = opts.frames ? Math.max(1, opts.frames|0)
                              : Math.max(1, Math.round(((ks[ks.length-1].t)||((ks.length-1)*1.4))*fps));
  modeOverride = 'deep'; exporting = true; cancelRender = false;
  const files = [];
  let cancelled = false;
  try {
    for (let f = 0; f < nFrames; f++) {
      sampleArc(ks, arc, nFrames > 1 ? easeInOut(f/(nFrames-1))*arc.total : 0);
      curOrbit = buildRefOrbit(camHP, cam.iters + 2); uploadOrbit(curOrbit); orbitDirty = false;
      /* the light rig is measured per frame; blended in by a third from the second frame on, it
         glides along the flight instead of following every wobble of the fit */
      const r = await renderFrameToBlob(longEdge, samples, tile, `frame ${f+1}/${nFrames} —`, f === 0 ? 'fresh' : 0.35);
      if (r.error) { openPanel(renderEl); rstat(r.error); return r; }
      if (r.cancelled) { cancelled = true; break; }   // stop early — still pack the frames done so far
      files.push({ name:`frame_${String(f).padStart(5,'0')}.png`, data:new Uint8Array(await r.blob.arrayBuffer()) });
      showProg(`<span class="spin">◓</span> rendering path… frame ${f+1}/${nFrames}<br><small style="color:#9ab">${longEdge}px ×${samples} — press Esc to cancel · ZIP downloads when done</small>`);
    }
    if (!files.length) return { cancelled, framesRendered:0 };   // nothing completed → nothing to save
    const baseName = `mandelbulb_path_${files.length}f_${fps}fps_${longEdge}px${cancelled?'_partial':''}`;
    showProg(`<span class="spin">◓</span> packing ${files.length} frame${files.length>1?'s':''}${cancelled?' (cancelled)':''}…`);
    const zips = await packAndDownloadZips(files, baseName);
    return { frames:files.length, fps, longEdge, samples, cancelled, zips };
  } finally { exporting = false; cancelRender = false; if (loading) { loading.style.display='none'; loading.style.background=''; } }
};
api.renderPathFile = (opts) => new Promise(res => {   // file-picker → render to ZIP
  const inp=document.createElement('input'); inp.type='file'; inp.accept='.json';
  inp.onchange=()=>{ const f=inp.files[0]; if(!f){res();return;} const r=new FileReader();
    r.onload=()=>{ try { api.renderPath(JSON.parse(r.result), opts).then(res); } catch(e){ console.log('bad path',e); res(); } };
    r.readAsText(f); };
  inp.click();
});

/* map a long-edge length + aspect (=w/h) to integer (w,h), where the long edge is the longer side.
   Shared by the live frame (frame()) and the tiled export (renderFrameToBlob) so the two can't drift. */
function longEdgeToWH(longEdge, aspect){
  return { w: Math.max(2, Math.round(aspect >= 1 ? longEdge : longEdge * aspect)),
           h: Math.max(2, Math.round(aspect >= 1 ? longEdge / aspect : longEdge)) };
}
/* resize the drawing buffer ONLY when it changes — assigning canvas.width every frame (even to the
   same value) clears the buffer and can flicker. */
function setCanvasSize(W,H){ if (canvas.width!==W) canvas.width=W; if (canvas.height!==H) canvas.height=H; }
/* CSS presentation of the drawing buffer: either stretched to fill the window (default) or shown at
   true pixel size centred on the black field (1:1 mode). Buffer W,H are device px; divide by dpr so one
   render pixel maps to one physical pixel. Only restyle on change to avoid layout thrash. */
let dispCss = '';
function updateCanvasDisplay(W,H){
  if (view1to1) {
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.max(1, Math.round(W/dpr)), ch = Math.max(1, Math.round(H/dpr));
    const key = '1:'+cw+'x'+ch;
    if (dispCss===key) return; dispCss=key;
    canvas.classList.add('fit1to1');
    canvas.style.width = cw+'px'; canvas.style.height = ch+'px';
  } else {
    if (dispCss==='full') return; dispCss='full';
    canvas.classList.remove('fit1to1');
    canvas.style.width = ''; canvas.style.height = '';   // back to the #gl 100vw/100vh rule
  }
}
let last=performance.now(), fps=0, frameN=0, curOrbit=null, deepActive=false;
let orbitDirty=true;                              // rebuild the reference orbit only when this is set
let accumReset=true;                              // restart progressive accumulation (camera moved)
/* progressive TEMPORAL accumulation when idle (TSAA-style): each idle frame re-renders the deep
   view at the live frame res but with a sub-pixel Halton JITTER, and averages it into a float
   buffer (running mean via constant-alpha blend). The average SUPERSAMPLES (anti-aliases) and —
   the real win at depth — DENOISES the near-critical per-pixel speckle, converging visibly over
   ~tens of frames. Every draw is a single small frame ⇒ TDR-safe; sharpens on pause, snaps back to
   the live frame on any input. (A spatial-tile variant gave full-res but SNAPPED with no visible
   convergence and didn't denoise — temporal is what the eye wants here.) */
let accumEnabled=true, idleFrames=0, accumN=0;
const IDLE_HOLD=10, ACCUM_MAX=64;                 // begin after IDLE_HOLD idle frames; cap samples
let accumFbo=null, accumTex=null, accumW=0, accumH=0, accumGuide=null;
const halton=(i,b)=>{ let f=1,r=0; while(i>0){ f/=b; r+=f*(i%b); i=Math.floor(i/b);} return r; };
function ensureAccum(w,h){
  if (accumW===w && accumH===h && accumTex) return;
  if (accumTex){ gl.deleteTexture(accumTex); gl.deleteFramebuffer(accumFbo); freeGuideSet(accumGuide); }
  accumGuide = makeGuideSet(w, h);
  /* Build the target on a scratch texture unit and leave nothing bound. This runs between "bind the
     orbit texture on unit 0" and the draw; creating the target on unit 0 left IT there, so that
     draw sampled its own render target — a feedback-loop error, silently dropped. Every freshly
     built still therefore began with a sample that was never drawn (a black frame averaged in:
     a dark flash, and ~1.6% low after 64 samples). accum-check.mjs guards this. */
  gl.activeTexture(gl.TEXTURE7);
  accumTex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,accumTex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA16F,w,h,0,gl.RGBA,gl.HALF_FLOAT,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.bindTexture(gl.TEXTURE_2D,null); gl.activeTexture(gl.TEXTURE0);
  accumFbo=gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER,accumFbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,accumTex,0);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  accumW=w; accumH=h;
}
function frame(now){
  if (exporting) { dzScheduleFrame(); return; }   // hi-res export owns the GL context
  const dt=Math.min(0.05,(now-last)/1000); last=now; fps=fps*0.9+ (1/Math.max(1e-3,dt))*0.1;
  frameN++;
  const {fwd,right,up}=basis();

  deepActive = deepProg && (modeOverride==='deep' || (modeOverride==='auto' && smoothedDist < 1e-4));
  updateBlaAuto();                              // BLA 'auto': on only below ~1e-13, once its shader is ready

  /* auto iteration budget: the n-iter surface needs ~1.35/decade to resolve at depth.
     Base 32 (not 24): boundary points escape at ~the budget edge, and a thin margin
     flips escape flags (measured at 1e-50: iters=92 mismatched, 96+ agreed). */
  if (autoIters && deepActive && smoothedDist > 0) {
    const rec = Math.min(160, 32 + Math.ceil(1.35 * Math.max(0, -Math.log10(smoothedDist))));
    if (rec > cam.iters) { cam.iters = rec; orbitDirty = true; }
  }

  /* --- deep mode: rebuild reference orbit AT the camera (δro ≡ 0) ONLY when the camera or
     iteration budget changed. The BigInt rebuild + texture (+ BLA table) upload is heavy at
     depth (iters~86 → 86 BigInt P8 evals/frame); rebuilding every frame while IDLE wasted it
     and masked GPU-side cost. Now idle frames are pure GPU — and stills can accumulate (step 3). */
  if (deepActive && (orbitDirty || forceRebuild || !curOrbit)) {
    curOrbit = buildRefOrbit(camHP, cam.iters + 2);
    uploadOrbit(curOrbit);
    orbitDirty = false;
    accumReset = true;                      // camera/orbit changed → restart any progressive accum
  }

  /* --- distance probe for the fly-slowdown --- */
  let rawDist;
  if (deepActive && curOrbit) {
    // camera == reference, δ = 0 → de straight from reference escape quantities
    let ke = curOrbit.len - 1;
    for (let k = 0; k < curOrbit.len; k++) if (curOrbit.Rk[k] > 2) { ke = k; break; }
    rawDist = Math.max(0, 0.5*curOrbit.Rk[ke]*Math.log(Math.max(curOrbit.Rk[ke],1e-300))/curOrbit.DRk[ke]);
  } else {
    rawDist = Math.max(0, deCPU(cam.pos[0],cam.pos[1],cam.pos[2], cam.power, cam.iters));
  }
  lastRawDist = rawDist;
  if (snapDist) { smoothedDist = rawDist; snapDist = false; }
  else if (rawDist > smoothedDist) smoothedDist += (rawDist-smoothedDist)*(1-Math.exp(-1.2*dt));
  else smoothedDist = rawDist;
  const boost = keys['ShiftLeft']||keys['ShiftRight'] ? 4.0 : 1.0;
  const speed = smoothedDist * cam.baseSpeed * boost * dt * 60;

  const mv=(v,s)=>{ for(let j=0;j<3;j++) camHP[j] += hp.fromNum(v[j]*s); cam.pos = camHP.map(hp.toNum); orbitDirty = true; };
  if(keys['KeyW']) mv(fwd, speed);   if(keys['KeyS']) mv(fwd,-speed);
  if(keys['KeyD']) mv(right,speed);  if(keys['KeyA']) mv(right,-speed);
  if(keys['KeyE']) mv([0,1,0], speed); if(keys['KeyQ']) mv([0,1,0],-speed);

  if (recording) capturePathFrame();             // camera-path recording (sparse, movement-driven)

  /* --- render --- */
  /* live render size: ABSOLUTE long-edge (frameLong) in deep mode, native window in f32 baseline.
     CSS scales the frame to the window, so frameLong trades sharpness for speed directly.
     ⚠ TDR guard: the live deep frame is ONE non-tiled draw and must finish under the ~2 s Windows
     GPU watchdog. Per-pixel cost climbs with iteration depth, so cap the long edge — never above the
     native display, and harder at extreme zoom (measured: large deep frames → device reset/freeze). */
  /* base aspect + native cap on the VIEWPORT (minus the docked panel), NOT canvas.clientWidth — in
     1:1 mode the canvas CSS size IS the frame, which would make this circular. */
  const panelW = dzScaffold.classList.contains('panel-open') ? PANEL_W : 0;
  const availW = Math.max(2, dzViewW() - panelW), availH = Math.max(2, dzViewH());
  const aspect = availW / availH, nativeLong = Math.max(availW, availH);
  /* ⚠ TDR guard: the live deep frame is ONE non-tiled draw and must finish under the ~2 s Windows
     watchdog (measured: a large deep draw → 1-2 fps → device reset, desktop freeze). Per-pixel cost
     climbs with iteration depth, so cap the long edge progressively as the zoom deepens — a raised
     "frame px" slider can't push the single draw back into the freeze regime. (Full-res deep stills
     stay available via the TILED PNG export, which is watchdog-safe.) */
  let cap = nativeLong;                                                          // no upscaling past the on-screen area
  if (deepActive && smoothedDist > 0) {
    if      (smoothedDist < 1e-30) cap = Math.min(cap, 720 *capRelax);           // extreme zoom (iters ≥ ~73)
    else if (smoothedDist < 1e-12) cap = Math.min(cap, 1080*capRelax);           // deep
    else if (smoothedDist < 1e-4)  cap = Math.min(cap, 1440*capRelax);           // mid-deep
  }                                                                              // capRelax PERF/QUALITY LEVER: scale the TDR rungs (≥1e6 ⇒ effectively uncapped → full-res deep, watchdog permitting)
  const longE = Math.max(2, Math.min(deepActive ? frameLong : nativeLong, cap));
  const { w, h } = longEdgeToWH(longE, aspect);
  updateCanvasDisplay(w, h);                    // stretch-to-fill vs centred 1:1 presentation
  const light = keyLightDir(right, up, fwd);   // camera-relative key — stable modelling as you fly

  /* idle detection for progressive accumulation: any view change set accumReset (movement →
     orbitDirty → rebuild → accumReset; rotation/keys → accumReset directly). */
  if (accumReset) { accumReset=false; idleFrames=0; accumN=0; }

  if (deepActive) {
    const D = deepCtx(), x = D.x;
    gl.useProgram(D.p); bindQuad(D.p);
    gl.uniform3fv(x.fwd,fwd); gl.uniform3fv(x.right,right); gl.uniform3fv(x.up,up);
    gl.uniform1f(x.fov,Math.tan(0.5*1.1));
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,orbitTex);
    gl.uniform1i(x.orbit,0);
    gl.uniform1i(x.len,curOrbit.len);
    gl.uniform1i(x.iters,cam.iters);
    gl.uniform1i(x.probe,0);
    setBlaUniforms(x); setPowerUniforms(x);
    gl.uniform1f(x.pixAng, Math.tan(0.5*1.1)/Math.max(canvas.clientHeight,2)/surfMul);  // DISPLAY pixel ÷ detail
    gl.uniform3fv(x.camF, cam.pos);             // f32 camera for the far-field hybrid segment
    gl.uniform1i(x.normalMode, gNormalMode());  // 0 none (pass S derives it) / 1 3-tap / 2 4-tap (default)
    gl.uniform1i(x.bisectMax, Math.min(24, bisectMax + Math.max(0, Math.round(Math.log2(surfMul)))));  // refine more when sharper
    gl.uniform1i(x.normalIters, normalIters);   // PERF LEVER (0 = full uIters)
    gl.uniform1i(x.bisectIters, bisectIters);   // PERF LEVER (0 = full uIters)
    gl.uniform1f(x.stepRelax, stepRelax);       // PERF LEVER (0 = default 0.85)
    gl.uniform2f(x.res,w,h);
    const S = { W: w, H: h, jx: 0, jy: 0, fwd, right, up, light };
    const accumulating = accumEnabled && floatBlend && idleFrames >= IDLE_HOLD && accumN < ACCUM_MAX;
    if (accumulating) {
      /* TEMPORAL accumulation: render one jittered frame-res sample into the float buffer as a running
         mean (constant-alpha blend, weight 1/(N+1)), then blit the average to the canvas. Each
         draw is a single small frame ⇒ TDR-safe; the average denoises the speckle + anti-aliases,
         converging visibly over ACCUM_MAX samples. */
      ensureAccum(w,h); ensureGbuf(w,h);
      S.jx = (halton(accumN+1,2)-0.5)/h; S.jy = (halton(accumN+1,3)-0.5)/h;     // ±0.5 render-pixel
      gl.uniform2f(x.jitter, S.jx, S.jy);
      S.alpha = accumN === 0 ? 0 : 1.0/(accumN+1);
      S.guide = { set: accumGuide, n: accumN };           // samples after the first start from the depth guide
      S.rig = accumN === 0 ? 'fresh' : 0;                 // a still measures its light once and keeps it
      drawDeep(D, accumFbo, 0, 0, w, h, S);
      accumGuide.cur = 1 - accumGuide.cur;
      accumN++;
      setCanvasSize(w,h);                 // display the running average (blit 1:1, CSS-upscaled)
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, accumFbo);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
      gl.blitFramebuffer(0,0,w,h, 0,0,w,h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else if (accumN >= ACCUM_MAX) {
      /* converged: keep showing the accumulated still (cheap blit) until the view changes */
      setCanvasSize(w,h);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, accumFbo);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
      gl.blitFramebuffer(0,0,w,h, 0,0,w,h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else {
      /* live frame-res render: pass G offscreen, pass S to the canvas */
      gl.uniform2f(x.jitter, 0, 0);
      setCanvasSize(w,h); ensureGbuf(w,h);
      S.rig = 'live';                             // the light rig follows the surface as you fly
      drawDeep(D, null, 0, 0, w, h, S);
      idleFrames++;
    }

    /* --- ground-truth gate, ~2×/s: pointwise de at t=0 (GPU HDR vs CPU f64). The 1×1 readPixels
       forces a GPU sync (small periodic stall) — key V toggles it off for smooth flying/recording.
       Skip once the view is CONVERGED (accumN at cap): the camera/orbit are unchanged so the gate
       value is identical, and re-probing a static view would only re-introduce the mid-frame sync —
       which, against the blit-to-canvas of the held still, shows up as an intermittent flash. */
    if (gateOn && !exporting && frameN % 30 === 0 && accumN < ACCUM_MAX) {
      const g = gateProbeAt(0, fwd);
      gate.tGPU = g.gpu; gate.tCPU = g.cpu;
      gate.relT = g.rel;
      gate.when = now;
    }
  } else {
    setCanvasSize(w,h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0,0,w,h);
    gl.useProgram(prog); bindQuad(prog);
    gl.uniform2f(u.res,w,h);
    gl.uniform3fv(u.camPos,cam.pos);
    gl.uniform3fv(u.fwd,fwd); gl.uniform3fv(u.right,right); gl.uniform3fv(u.up,up);
    gl.uniform1f(u.fov,Math.tan(0.5*1.1));
    gl.uniform1f(u.power,nPower); gl.uniform1f(u.iters,cam.iters);
    gl.uniform1f(u.prec,5e-7);
    gl.uniform3fv(u.light,light);
    gl.uniform2f(u.phase, phaseTheta, phasePhi);
    gl.drawArrays(gl.TRIANGLES,0,3);
  }

  const gateOK = gate.relT < 1e-3;
  if (loading && (deepReady || deepCompileErr)) loading.style.display = 'none';  // overlay is shown by the load timer
  hud.innerHTML =
    `fps        <b>${fps.toFixed(0)}</b>   mode <b>${deepActive?'DEEP (perturbation'+(blaEnabled?' + BLA':'')+')':'f32 baseline'}</b>${deepReady?'':deepCompileErr?' <span class="warn">deep shader failed: '+deepCompileErr.slice(0,80)+'</span>':' <span class="warn">⏳ compiling deep renderer…</span>'}\n`+
    `surf dist  <b>${smoothedDist.toExponential(2)}</b>\n`+
    (deepActive
      ? `gate       ${!gateOn?'<span style="color:#678">off (V)</span>':isNaN(gate.relT)?'…':`relT <b class="${gateOK?'ok':'warn'}">${gate.relT.toExponential(1)}</b> (GPU ${gate.tGPU.toExponential(3)} vs CPU ${gate.tCPU.toExponential(3)})${gateOK?' <span class="ok">✓</span>':' <span class="warn">✗ MISMATCH</span>'}`}\n`
      : `f32 eps    ${(Math.hypot(...cam.pos)*5e-7).toExponential(2)}\n`)+
    `<span class="hud-dim">power n    <b>${nPower}</b>   phase <b>${phaseTheta.toFixed(2)},${phasePhi.toFixed(2)}</b>   iters <b>${cam.iters}</b>   orbitLen ${curOrbit?curOrbit.len:'-'}   frame <b>${w}×${h}</b>   normals <b>${['screen','3-tap','4-tap','depth'][normalMode]}</b>`+
    `   color <b>${['plain','iteration','orbit-trap'][colorMode]}</b>   detail <b>${surfMul.toFixed(2)}×</b>   light <b>${['directional','headlamp','both'][lightMode]}</b></span>`+
    (deepActive&&accumEnabled?`   accum <b class="${accumN>=ACCUM_MAX?'ok':''}">${accumN>=ACCUM_MAX?`${accumN}× ✓`:accumN>0?`${accumN}×…`:'live '+w+'×'+h}</b>`:'')+`\n`+
    `pos        <span class="hud-dim">${cam.pos.map(v=>v.toFixed(5)).join(', ')}</span>`+
    (recording?`   <b class="warn">● REC ${recPath.length}f${(!isFlying()&&recPath.length<=1)?' — fly to lay keyframes':''}</b>`:playingPath?`   <b class="ok">▶ PREVIEW · ESC to stop</b>`:'');
  dzScheduleFrame();
}
const hud=dzById('hud');
const loading=dzById('loading');

/* ════════ scripted deep-dive (smoke test / depth milestones) ════════
   Marches the center ray on CPU, teleports the HP camera to (t* − depth)·fwd,
   waits a few frames, returns the gate. Lets node verify 1e-9 … 1e-50 without
   manual flying. */
/* one dive hop: conservative march to bracket the de-sign flip, then bisect.
   Returns t* = distance to the (fixed-iteration) surface, resolved to f64 ulp —
   which is why hops must shrink ×1e-3: each new reference resets the f64 t scale. */
function diveHopJS(O, rd, maxIter, hint){
  /* "outside" for PLACEMENT = the orbit ESCAPES within budget (escape-count test).
     de sign is unusable here: an unescaped orbit wraps and yields garbage-negative de.
     Step is CAPPED (starting at 1% of the caller's distance scale, growing ×1.25):
     a raw 0.5·de step is limit-set-sized and jumps across thin n-iter arms, bracketing
     the wrong crossing. The cap guarantees the FIRST escape→unescape flip is caught. */
  const probe = (tv) => pertOrbitJS(O, scl3(rd, tv), maxIter);
  let t = 0, r0 = probe(0);
  if (!r0.escaped || r0.de <= 0) return { inside: true };
  let de = r0.de, lo = -1, hi = -1;
  let cap = Math.max((hint || 1e-5) * 0.01, 1e-300);
  for (let s = 0; s < 2000; s++) {
    const tn = t + Math.min(Math.max(de, 1e-300) * 0.5, cap);
    const rn = probe(tn);
    if (!rn.escaped || rn.de <= 0) { lo = t; hi = tn; break; }
    t = tn; de = rn.de; cap *= 1.25;
    if (t > 8) return { noSurface: true };
  }
  if (hi < 0) return { t };                       // never reached the set — use last t
  for (let b = 0; b < 100; b++) {
    const mid = 0.5 * (lo + hi);
    const rm = probe(mid);
    if (!rm.escaped || rm.de <= 0) hi = mid; else lo = mid;
  }
  return { t: lo };                               // last strictly-escaped point
}
api.dive = async function(depth){
  modeOverride = 'deep';
  const {fwd} = basis();
  /* stage 0: plain f64 creep from O(1) distance down to ~1e-5 above the surface
     (perturbation is out of domain at O(1) offsets — locked shallow boundary) */
  for (let s = 0; s < 4000; s++) {
    const de = deCPU(cam.pos[0], cam.pos[1], cam.pos[2], cam.power, cam.iters);
    if (de <= 1e-5) break;
    api.moveAlong(fwd, de * 0.6);
    if (Math.hypot(...cam.pos) > 8) return { error: 'left scene (no surface along fwd)' };
  }
  /* stage 1+: perturbed hops. Each hop rebuilds the reference AT the camera, bisects
     the surface along fwd in-domain (t* ≈ current dist ≪ 1), then moves to
     (t* − target) with target shrinking ×1e-3 per hop until the requested depth. */
  let back = 1e-5, placed = false, verified = false;
  for (let hop = 0; hop < 600; hop++) {
    const O = buildRefOrbit(camHP, cam.iters + 2);
    const r = diveHopJS(O, fwd, cam.iters, back);
    if (r.noSurface) return { error: 'no surface along fwd (perturbed)' };
    if (r.inside) { api.moveAlong(fwd, -back); back *= 2; placed = false; continue; }
    /* verification: a fresh reference must confirm we sit ≈ depth above the boundary */
    if (placed && r.t >= depth * 0.34 && r.t <= depth * 3) { verified = true; break; }
    const target = Math.max(depth, r.t * 1e-3);
    if (r.t - target > 0) api.moveAlong(fwd, r.t - target);
    back = target;
    placed = (target <= depth * 1.001);
  }
  if (!verified) return { error: 'placement not verified (fold too thin or hops exhausted)' };
  /* certification: pointwise de agreement at the placed depth (fresh reference) */
  curOrbit = buildRefOrbit(camHP, cam.iters + 2);
  uploadOrbit(curOrbit);
  const pts = [0, depth * 0.25, depth * 0.75].map(tv => gateProbeAt(tv));
  /* near the boundary de→0, so raw rel amplifies; the fair scale is de at t=0 (depth scale) */
  const de0 = Math.max(Math.abs(pts[0].cpu), 1e-300);
  let worst = -1;
  for (const p of pts) {
    if (p.escG !== p.escC) worst = Math.max(worst, 1);          // escape-flag mismatch = fail
    else if (p.escG && p.escC) {
      p.relAdj = Math.min(p.rel, Math.abs(p.gpu - p.cpu) / de0);
      worst = Math.max(worst, p.relAdj);                        // both escaped: compare de
    }
    /* both unescaped: garbage-vs-garbage, not comparable — skip */
  }
  if (worst < 0) worst = 1;                                     // nothing comparable = placement bad
  await new Promise(res => { const t0 = frameN; const chk = () => frameN > t0 + 35 ? res() : requestAnimationFrame(chk); chk(); });
  return { relDE: worst, pts, dist: smoothedDist };
};

/* ════════ HOST HANDLE — api.dz (version 1) ════════
   One namespaced object for a page that embeds this one (GMT's deep-zoom tool opens it in an iframe
   with ?embed=1). Read-only summaries of the live state plus the three things the loose __ handles
   do not offer: a whole view in one object, a thumbnail as a PNG, and an animated dive. Additive —
   every __ handle above works as before. A VIEW has exactly the fields a recorded keyframe has
   (pushKeyframe), so a bookmark and a path frame are interchangeable. */
let dzDive = 0;                                   // id of the running diveTo (0 = none); bumping it cancels
const dzThumbCv = document.createElement('canvas');
api.dz = {
  version: 1,
  telemetry: () => ({ ready: !!deepReady, error: deepCompileErr || '', mode: deepActive ? 'deep' : 'f32',
    depth: smoothedDist, fps, frameW: canvas.width, frameH: canvas.height, iters: cam.iters, power: nPower,
    accumN, accumMax: ACCUM_MAX, recording, playing: playingPath, exporting,
    pathFrames: recPath.length, bla: !!blaEnabled }),
  settings: () => ({ detail: surfMul, reach: reachMode(), power: nPower, phase: [phaseTheta, phasePhi],
    color: colorMode, cscale: colorScale, light: lightMode, falloff: falloffMul, normals: normalMode,
    land: !!landMode, frame: frameLong, accum: accumEnabled, lookMode: look.mode }),
  /* host input (see HOST INPUT above) */
  setInputOwner: (who) => { inputOwner = who === 'host' ? 'host' : 'module'; if (inputOwner === 'host') for (const k in keys) keys[k] = false; },
  inputOwner: () => inputOwner,
  rawDistance: () => lastRawDist,              // unsmoothed: a host that eases it itself must not ease twice
  yawPitch: () => ({ yaw: cam.yaw, pitch: cam.pitch }),
  setYawPitch: (yaw, pitch) => { cam.yaw = +yaw; cam.pitch = Math.max(-1.55, Math.min(1.55, +pitch)); accumReset = true; },
  getView: () => ({ cam: camHP.map(String), yaw: cam.yaw, pitch: cam.pitch, iters: cam.iters, power: nPower,
    phase: [phaseTheta, phasePhi], light: lightMode, falloff: falloffMul, color: colorMode,
    cscale: colorScale, surf: surfMul }),
  setView: (v) => {                               // apply a view the way the path sampler applies a keyframe
    if (!v || !v.cam) return;
    dzDive = 0;                                   // a jump ends any dive in progress
    camHP = v.cam.map(BigInt); cam.pos = camHP.map(hp.toNum);
    cam.yaw = +v.yaw; cam.pitch = +v.pitch;
    if (v.iters) cam.iters = Math.max(4, Math.min(160, v.iters|0));
    if (v.power && v.power !== nPower) api.setPower(v.power);
    if (v.phase) api.setPhase(v.phase[0], v.phase[1]);
    if (v.light !== undefined) lightMode = v.light|0;
    if (v.falloff) falloffMul = +v.falloff;
    if (v.color !== undefined) colorMode = v.color|0;
    if (v.cscale) colorScale = +v.cscale;
    if (v.surf) surfMul = Math.max(0.25, Math.min(256, +v.surf));
    orbitDirty = true; accumReset = true; snapDist = true;
  },
  thumbnail: (size) => {                          // the current view as a square PNG data URL
    const n = Math.max(8, Math.min(512, (size|0) || 96));
    const px = (deepActive && curOrbit) ? api.renderThumb(n) : api.renderThumbF32(n);
    if (!px) return '';
    dzThumbCv.width = n; dzThumbCv.height = n;
    const c2 = dzThumbCv.getContext('2d'), img = c2.createImageData(n, n);
    for (let y = 0; y < n; y++) {                 // readPixels is bottom-up; a canvas is top-down
      const src = (n - 1 - y) * n * 4;
      for (let i = 0; i < n * 4; i++) img.data[y * n * 4 + i] = (i & 3) === 3 ? 255 : px[src + i];
    }
    c2.putImageData(img, 0, 0);
    accumReset = true;                            // the thumbnail draw used the shared GL state — redraw the still
    return dzThumbCv.toDataURL('image/png');
  },
  /* SNAPSHOT (2026-10-08) - the picture as it is on the canvas now, as a NEW 2D canvas of the
     frame's own size, for a host that saves it. One frame is run and the drawing buffer is read
     back in the same call.
     THE ORDER BELOW IS THE POINT. After a frame has been shown, the browser owes the drawing
     buffer a clear (the canvas keeps no buffer between frames), and Chrome pays it at the first
     DRAW or READ - but a blitFramebuffer does not count. Once the still is done, a frame is one
     blit and nothing else: read after it, and the read clears the buffer first and returns an
     empty picture. So: one pixel is read BEFORE the frame (that pays the clear), then the frame
     blits, then the whole buffer is read. Measured in one task each, the still done: frame +
     read = mean level 0; 1-pixel read + frame + read = 149.7; frame + frame + read = 0. While
     the still is accumulating a frame draws as well as blits, which is why it only failed on a
     FINISHED still (the owner's saved PNGs: empty at 64 of 64 samples, fine at 23 of 64). A host
     copying the canvas from outside (drawImage after a step) fails the same way.
     The extra frame is not counted into the fps. Null while a render owns the context, or
     after dispose. */
  snapshot: () => {
    if (exporting || dzDisposed) return null;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));   // pays the owed clear before the frame draws
    const keepFps = fps, keepLast = last;
    frame(performance.now());
    fps = keepFps; last = keepLast;
    const w = canvas.width, h = canvas.height, px = new Uint8Array(w * h * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c2 = cv.getContext('2d'), img = c2.createImageData(w, h);
    for (let y = 0; y < h; y++) {                 // readPixels is bottom-up; a canvas is top-down
      const src = (h - 1 - y) * w * 4, dst = y * w * 4;
      for (let i = 0; i < w * 4; i++) img.data[dst + i] = (i & 3) === 3 ? 255 : px[src + i];
    }
    c2.putImageData(img, 0, 0);
    return cv;
  },
  /* Fly straight ahead (along the CURRENT look direction each frame, so the mouse can still steer)
     until the surface distance is about `depth`. Each frame moves a fraction of the distance
     estimate, which is a lower bound on the way to the surface, so the camera cannot pass through.
     The pace follows a schedule that ends inside ~16 s; looking at the surface at a slant the
     distance shrinks slower than the camera moves, so a dive behind schedule takes longer strides
     (up to 0.7 of the estimate). It gives up after 20 s (a ray that glances past the surface never
     arrives). Any fly key or Esc cancels. Not __dive: that one is a test harness — it blocks the
     page for seconds and teleports. */
  diveTo: (depth) => new Promise(res => {
    depth = Math.max(1e-77, +depth || 1e-6);
    const id = ++dzDive, t0 = performance.now();
    const decades = Math.max(1, Math.log10(Math.max(smoothedDist, depth) / depth));
    const rate = Math.LN10 * decades / Math.min(16, Math.max(3, decades * 0.4));   // e-folds per second
    const d0 = Math.max(smoothedDist, depth);
    let prev = t0;
    const step = (now) => {
      const cancelled = dzDive !== id || isFlying() || keys['Escape'];
      if (cancelled || smoothedDist <= depth || now - t0 > 20000) { if (dzDive === id) dzDive = 0; res(); return; }
      const dt = Math.min(0.25, Math.max(0, (now - prev) / 1000)); prev = now;
      const due = d0 * Math.exp(-rate * (now - t0) / 1000);                // where the schedule says we should be
      const frac = smoothedDist > due * 1.5 ? 0.7 : smoothedDist > due * 1.05 ? 0.4 : Math.min(0.7, 1 - Math.exp(-rate * dt));
      const want = Math.min(smoothedDist * frac, smoothedDist - depth * 0.9);
      if (want > 0) api.moveAlong(basis().fwd, want);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }),
};

dzScheduleFrame();
/* ════════ END ported page script ════════ */
const instance = {
  canvas,
  api,
  get frameCount() { return frameN; },                        // frames the loop has run (the page's frameN)
  get disposed() { return dzDisposed; },
  get contextLost() { return dzContextLost; },                // the browser took the WebGL context: dispose and mount a fresh canvas
  step(now) { if (!dzDisposed) frame(typeof now === 'number' ? now : performance.now()); },
  dispose: dzDispose,
};
return instance;
}
