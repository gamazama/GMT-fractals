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
 * THE HISTORICAL PAGE STAYS FROZEN at 3b65946. Until 2026-10-11 it was the reference this file was
 * tested against (the parity smoke, debug/smoke-deep-zoom-parity.mts, retired that day together with
 * the page's own march program: this module no longer draws what the page draws, and the standing
 * proof of its kernel is npm run smoke:deep-zoom-direct). From 2026-10-07 THIS FILE is the source that gets
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
  C colour · 9/0 palette · F/G detail · L light · T/Y falloff &nbsp;·&nbsp; V gate · X export · ? about</p>
</div></div>
<div id="render" class="modal"><div class="panel">
  <span class="x">✕</span>
  <h1>Render &amp; Export</h1>
  <p class="sub" id="rstatus"></p>
  <h2>Still image (PNG)</h2>
  <div class="row"><label>resolution (long edge)</label><input id="r_res" type="number" value="2560" min="256" step="64"></div>
  <div class="row"><label>samples (quality)</label><input id="r_samp" type="number" value="16" min="1" max="128"></div>
  <button class="btn go" id="r_export">Export PNG</button>
  <button class="btn" id="r_cancel">✖ Cancel</button>
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
<span style="color:#9ab">⚙ controls</span> for all settings + shortcuts · <span style="color:#9ab">🎬 render</span> to export</div>
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
  /* end the things that would otherwise keep ticking on their own requestAnimationFrame (a render's waits, the
     module's own dive) */
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
   (grep "HOST HANDLE"). Its own chrome is hidden by CSS (body.embed) and its panels never open. */
const EMBED = options.embed !== false;
/* HOLD THE ESTIMATE (options.holdEstimate, 2026-10-09; off = the page). The distance at the camera is read off the
   camera's own orbit, where that passes radius 2 (grep "distance probe"). An orbit that has NOT escaped within
   the iteration count is read at its last point instead, as 0.5 R ln R / DR: a number that means nothing, and 0
   whenever that last point lies inside radius 1. It takes a count the page's own rule does not mend (32 + 1.35 a
   decade restores a count dropped at power 8 in the same frame; power 2 needs 3.7 a decade) - a low power, or
   auto iterations off with a low count. Then:
     - under the ray march the margin rule raises the count 32 a frame until the orbit escapes (ITERATIONS AS A
       MARGIN), and the true distance, being LARGER than the 0 it replaces, is eased towards at 2 % a frame, over
       seconds. A still that starts in that window is drawn with the depth scale and the far relax drifting
       under its samples: a faint second picture. Measured at the owner's power-2 place (deep-zoom/data/places.ts,
       "Power 2 · 5e-20"), auto iterations off at a count of 40 (distance reads 0), then on: 36.9 % of the
       pixels of the still that starts then are more than 8 levels off a still started after it had settled
       (twice; 2.4 % in a run where the still happened to start later). With the option: 0.01 % and 0.43 %, which
       is what two settled stills of that view differ by (0.0 to 0.47 %).
     - without the ray march the page's rule never raises a count from a distance of 0: the view stays at depth 0
       and 40 iterations for good. With the option the distance holds and the rule raises the count again.
   With the option the last estimate is KEPT while there is none, and the first real one is taken at once, not
   eased towards (estOwed). The Mandelbox does this whatever the option says (grep boxCamEstimate): it was found
   there. The tool that measures it: debug/scratch/formula-study/bulb-estimate-fault.mjs (git-ignored). */
const dzHoldEstimate = options.holdEstimate === true;
const dzFarLook = options.farLook === true ? 1 : 0;           // true: far ground takes the palette and the near albedo (grep FAR LOOK); the page: mid grey
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

/* ════════ THE MANDELBOX KERNEL (GLSL ES 3.00; the USE_BOX variant - grep THE FORMULA SEAM) ════════
   Spliced into KERNEL_CORE in pertOrbit's place: with USE_BOX defined the shader holds this pertOrbit and
   not the bulb's, and without it not one token of this is in the program.
   It compiles in 4.4 s where the bulb's kernel takes 12 (RTX 5070 Ti, a cold cache): no trigonometry, no jet.
   @invariant this kernel computes what boxOrbitJS computes, and what a fixed-point orbit of the explicit point
   gives, also where the reference stands 3e-51 from a fold plane - proven by: npm run smoke:deep-zoom-direct
   ("mandelbox, ... GPU vs twin: 0 over 1e-3 ... GPU vs direct: 0 over 1e-3 ... PASS", five lines: both signs of
   scale, from outside, deep, and beside the plane x = L). Falsified 2026-10-09, three breaks, each exit 1: `-gh`
   -> `d` in boxFoldD (the three deep lines FAIL), the shell / shell case of the sphere fold -> 0 (two FAIL), and
   the fold distances uploaded as plain floats in buildBoxOrbit (ONLY the fold-plane line FAILS). The record is in
   debug/deep-zoom-direct-check.mts.
   MEASURED beyond that check, the same day, by debug/scratch/formula-study/gpu-box.mjs (git-ignored): 3,438 points
   over 8 views, among them scale 2.566 with GMT's default pre-rotation (the check has no rotated view) - no escape
   flag differs, none more than 1e-3 off, the worst 5.3e-4, medians 2e-7 to 5e-7 from outside and 3e-6 to 8e-6 at
   depth, 95th percentiles under 6e-5 at depth. */
const BOX_KERNEL = `
/* ════════ THE MANDELBOX's δ KERNEL (the USE_BOX variant; api.setFormula) ════════
   pertOrbit for GMT's AmazingBox: the same OrbitOut, so the march, the hit test, the normal taps and the
   probes below read it as they read the bulb's. The step is boxOrbitJS's (grep it for the maths), with δ on
   the bulb kernel's footing: three f32 mantissas D and ONE exponent e, δ = D·2^e. Every δ-linear quantity of a
   step shares e - the fold's result E, Q with q = Q·2^e = 2 W·E·2^e + |E·2^e|², and k' − k - so a step is
   plain f32 arithmetic and e is handled once, on "+ δc".
   THE REFERENCE'S DISTANCES to the fold surfaces (rows 2-5 of the orbit texture: grep buildBoxOrbit) are what
   a crossing is decided by, and what a pixel that has crossed gets its step from. Each comes as a mantissa and
   an exponent of its own and is brought onto e (boxOnE) - never as a plain float: at depth δ is 1e-50, and a
   reference that stands 1e-40 from a fold plane must not read as standing ON it. Brought onto e, a distance
   far larger than δ is capped at 2^120: it then only says "not crossed", which is all it is asked.
   dr is the PIXEL'S OWN derivative, dr' = dr·k'·|scale| + 1, as drM·2^drE (renormalised when the mantissa
   passes 2^20): the bulb's split into a reference part and a delta (Ddr / DR) is not needed, and OrbitOut.Ddr
   carries the whole of it.
   Not here, and not built with USE_BOX: the jet and its checkpoints, the rebase to the
   origin. The rebase is the page's: δ = z − Z0. */
uniform vec4  uBoxA;             // scale · |scale| · the folding limit L · 2 L
uniform vec4  uBoxB;             // minR² · fixedR² · fixedR² / minR² · the escape radius, squared
uniform mat3  uBoxRot;           // the pre-rotation
uniform int   uBoxHasRot;        // 0 = no pre-rotation: the matrix is not applied
uniform float uBoxFar;           // how far from the camera the far-field march follows a ray (the bulb: 12)
float boxOnE(vec2 g, float e) { return g.x * exp2(clamp(g.y - e, -160.0, 120.0)); }      // a distance (mantissa, exponent) as a mantissa on e
/* one axis of the box fold. g = the reference's U − L (xy) and U + L (zw); d = the pixel's delta on this
   axis, l2 = 2 L, both mantissas on e. Returns the folded delta, 2·(the clamp's difference) − d, on e. */
float boxFoldD(vec4 g, float d, float e, float l2) {
  float gh = boxOnE(g.xy, e), gl = boxOnE(g.zw, e), ph = gh + d, pl = gl + d;
  int rr = g.x > 0.0 ? 1 : (g.z < 0.0 ? -1 : 0);              // the reference: past +L, past −L, between
  int pr = ph > 0.0 ? 1 : (pl < 0.0 ? -1 : 0);                // the pixel
  float cd;
  if (rr == 0) cd = pr == 0 ? d : (pr == 1 ? -gh : -gl);
  else if (rr == 1) cd = pr == 1 ? 0.0 : (pr == 0 ? ph : -l2);
  else cd = pr == -1 ? 0.0 : (pr == 0 ? pl : l2);
  return 2.0 * cd - d;
}
OrbitOut pertOrbit(sampler2D orbit, int orbitLen, Hdr3 dc, int maxIter) {
  vec3 C; float ec;
  sclFromH3(dc, C, ec);                        // δc = C·2^ec, constant along the orbit
  vec3 D = C; float e = ec;                    // δ  = D·2^e
  float drM = 1.0, drE = 0.0;                  // dr = drM·2^drE
  int m = 0, rebases = 0, it = 0;
  bool escaped = false;
  float trap = 1e30, escR2 = uBoxB.w;
  float S = uBoxA.x, aS = uBoxA.y, m2 = uBoxB.x, F2 = uBoxB.y, kA = uBoxB.z;
  vec4 T00 = texelFetch(orbit, ivec2(0, 0), 0);
  vec4 cT0 = T00;                              // (V, |V|) at the current reference index
  for (int loop = 0; loop < 512; loop++) {
    if (it >= maxIter) break;
#ifdef USE_STATS
    gWork++;
#endif
    vec4 tw = texelFetch(orbit, ivec2(m, 1), 0);             // W (xyz), |W|² (w)
    vec4 gx = texelFetch(orbit, ivec2(m, 2), 0);             // per axis: U − L (m, e), U + L (m, e)
    vec4 gy = texelFetch(orbit, ivec2(m, 3), 0);
    vec4 gz = texelFetch(orbit, ivec2(m, 4), 0);
    vec4 gs = texelFetch(orbit, ivec2(m, 5), 0);             // |W|² − minR² (m, e), |W|² − fixedR² (m, e)
    float s = sclPow2(e), inv = exp2(clamp(-e, -160.0, 120.0));   // 2^e, and 2^−e for the three constants that are not δ-linear
    if (uBoxHasRot == 1) D = uBoxRot * D;
    float l2 = uBoxA.w * inv;
    vec3 E = vec3(boxFoldD(gx, D.x, e, l2), boxFoldD(gy, D.y, e, l2), boxFoldD(gz, D.z, e, l2));
    vec3 W = tw.xyz; float r2 = tw.w;
    float Q = 2.0 * dot(W, E) + s * dot(E, E);               // the pixel's |w|² is r2 + Q·2^e
    float r2p = r2 + s * Q;
    float gm = boxOnE(gs.xy, e), gF = boxOnE(gs.zw, e), pm = gm + Q, pF = gF + Q;
    int reg = gs.x < 0.0 ? 0 : (gs.z < 0.0 ? 1 : 2);         // the reference: inside minR, the inversion shell, outside fixedR
    int pr = pm < 0.0 ? 0 : (pF < 0.0 ? 1 : 2);              // the pixel
    float kp = pr == 0 ? kA : (pr == 1 ? F2 / r2p : 1.0);
    float dk;                                                // k' − k, on e
    if (reg == pr) dk = pr == 1 ? -F2 * Q / (r2 * r2p) : 0.0;
    else if (reg == 0) dk = pr == 1 ? -F2 * pm / (r2p * m2) : (1.0 - kA) * inv;
    else if (reg == 1) dk = pr == 0 ? F2 * gm / (m2 * r2) : gF / r2;
    else dk = pr == 1 ? -pF / r2p : (kA - 1.0) * inv;
    vec3 Dn = S * (kp * E + dk * W);
    drM = drM * (kp * aS) + sclPow2(-drE);
    if (drM > 1048576.0) { float adj = floor(log2(drM)); drM *= exp2(-adj); drE += adj; }
    /* δ ← Δ + δc : align the two exponents once, renormalise once */
    float en = e;
    sclAdd(Dn, en, C, ec, D, e);
    sclNorm(D, e);
    m++; it++;
    cT0 = texelFetch(orbit, ivec2(m, 0), 0);
    vec3 dz = D * sclPow2(e);
    vec3 zf = cT0.xyz + dz;
    float z2 = dot(zf, zf);
    trap = min(trap, z2);
    if (z2 > uBoxB.w) { escaped = true; escR2 = z2; break; }
    if (z2 < dot(dz, dz) || m >= orbitLen - 1) {             // Zhuoran rebase / reference exhausted
      D = zf - T00.xyz; e = 0.0;
      sclNorm(D, e);
      m = 0; rebases++;
      cT0 = T00;
    }
  }
  vec3 zE = cT0.xyz + D * sclPow2(e);
  float rF = length(zE);
  vec2 drH = hdrReduce(vec2(drM, drE));
  vec2 de = hdrMul(hdrFromFloat(rF - 1.0), hdrRecip(drH));  // GMT's estimate for this formula: (|z| − 1) / dr
#ifdef USE_STATS
  gOrbits++; gIters += it;
#endif
  return OrbitOut(sclToH3(D, e), vec2(0.0), drH, de, it, rebases, escaped, sqrt(trap), sqrt(escR2));
}
`;

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
struct OrbitOut { Hdr3 d; vec2 Dr; vec2 Ddr; vec2 de; int iters; int rebases; bool escaped; float trap; float escR;
#ifdef USE_JET
  vec2 rde;                                     // THE RAY ESTIMATE (grep): 0.5·r·ln r / |J·v|, HDR; 0 when the orbit carried no jet
  vec2 rls;                                     // THE LINE AGAINST THE BALL (grep): the step it allows, HDR; 0 when not asked for
#endif
};
#ifdef USE_JET
/* ════════ THE RAY ESTIMATE AND RAY-COHERENT ORBITS (the USE_JET variant, 2026-10-09; the bulb's one program since 2026-10-11; api.setRayMarch) ════════
   A PROTOTYPE of the research result in plans/deep-zoom-shell/BUILD-PLAN.md ("RESEARCH RESULT,
   2026-10-09"), there proven in f64 on the CPU (debug/scratch/tm-*.mjs). Three parts, one bit each
   of uRayUse:
   1  THE STEP. A point is in the bulb exactly when its escaping iterate z_K lies in a set that is
      the same for every sample of a deep view, and z_K cannot reach that set before it has
      travelled its distance to it. As the sample moves along its ray the iterate moves at the speed
      |zdot|, zdot = J·v (v = the ray's direction, J the orbit's 3x3 derivative). So
          rde = 0.5·r·ln r / |J·v|
      estimates the distance left ALONG THIS RAY from below, and the march steps by rde itself
      (uRayFactor = 1): no step setting. MEASURED safe, not proven: it is a first-order number (the
      iterate taken as heading straight at the set at the speed it has here), its worst samples
      read 1.5 to 2.5 times the distance left in three views, and on the CPU it put 1 to 2 of
      5,733 rays through a solid (power 4, 3e-76). zdot is ONE vector carried with the orbit,
          zdot' = A·zdot + v ,   A = n·r^(n−1)·( E_r·e_rᵀ + E_θ·e_θᵀ + κ·E_φ·e_φᵀ ) ,   κ = sin(nθ)/sin θ
      (e = the unit frame of z's spherical angles, E = the frame of the output angles nθ, nφ: one
      triplex power step stretches by n·r^(n−1) along r and along the polar angle, and by κ times
      that around the azimuth), as jv·2^ev - three numbers, where the whole derivative J is nine.
   2  THE HIT. A hit when rde is under uRayHit·uPixAng of the ray's length (the host sets 1/64 of a
      display pixel, whatever the detail setting): the same measure, so nothing is keyed to depth.
   4  RAY-COHERENT ORBITS. Every sample of a ray is a point t·v, and the orbit of the sample at
      t + S is the orbit at t plus S·zdot_k at every iteration k early enough that the second-order
      term is small. So a sample does not run its orbit from iteration 0: it RESUMES the previous
      sample's from the latest checkpoint (δ, zdot, Δdr, trap, m, it at the top of a kernel pass)
      whose first-order move keeps the evaluated point within gTolN of the true point, and runs only
      the passes after it. The price of a move by S is about S²·Q/2 in position, with
          Q_k = Σ_{i<k} |zdot_i|·(n−1) / ρ_i     (ρ = the iterate's distance from the pole axis)
      the size of the second derivative. Q is a MEASURE, not a bound: the true bend is 0.5 to 0.9
      of it at the median but up to 2.5 times it, and above it on at least one sample in twenty in
      every view (39,512 samples, the second chat's study) - hence CK_SAFE = 3; on the GPU 3 costs
      no more passes or time than 2 did. A proven bound exists on the CPU (debug/scratch/pb-math.mjs)
      and is not in a shader's form yet. Passes run again after a moved checkpoint inherit its
      position error (ckErr) and carry jets that belong to the unmoved point: a relative jet error
      ckJerr = travel·Q, which costs a further S·ckJerr when one of THEM is moved later.
      Checkpoints live in a ring of CKN, keyed by pass number; a resumed orbit never rewrites the
      checkpoint it started from. No checkpoint within tolerance ⇒ a full orbit, as before.
      Tried and NOT kept (2026-10-09, RTX 5070 Ti, measured): named globals in place of the
      arrays (compiled for five minutes, ran 1.4 times slower); LAZY WRITES - a resumed orbit
      writing its checkpoints only when resumed orbits have come to run CK_WR passes more - which
      ran a third more passes and no faster (CK_WR_ > 0 still builds it).
   What is frozen in a resumed orbit and therefore only first-order right: Δdr (so the page's own
   de, which the ray rule does not use) and trap.
   gRay is 0 outside the march: the normal taps and the probes run the page's orbit. */
int   gRay = 0;                  // 0 = the page's orbit · 1 = carry zdot along gRd · 2 = and keep / resume checkpoints
vec3  gRd = vec3(0.0);           // the ray's direction: the jet's seed
float gTau = 0.0;                // this sample's ray parameter t, in units of 2^uRefE
float gTolN = 0.0;               // how far the evaluated point may stand from the true one, same units
#ifndef CKN_
#define CKN_ 24
#endif
#ifndef CK_WR_
#define CK_WR_ 0
#endif
#ifndef CK_SAFE_
#define CK_SAFE_ 3.0
#endif
const int CKN = CKN_;
const int CK_WR = CK_WR_;        // 0 = every orbit writes its checkpoints (the default) · n = a resumed orbit writes once resumed orbits run n passes more
const float CK_SAFE = CK_SAFE_;
#ifndef NO_CKPT
vec4  gCkD[CKN];                 // δ: mantissa (xyz), exponent (w)
vec4  gCkJ[CKN];                 // zdot: mantissa (xyz), exponent (w)
vec4  gCkA[CKN];                 // Δdr (HDR, xy) · trap (z)
vec4  gCkB[CKN];                 // the t this checkpoint was made at · inherited position error · relative jet error · pass number
vec4  gCkC[CKN];                 // Q · m · it      (t, the error and Q in units of 2^uRefE: plain floats)
#endif
int   gCkTop = 0;                // checkpoints of the latest WRITING orbit: its pass count
int   gCkLast = 0;               // the pass the last scan resumed from: while the ray moves on, nothing later can be valid again
int   gCkSince = 0;              // orbits resumed since the last writing orbit
int   gRunBase = 0;              // kernel passes the first of them ran
int   gRunPrev = 0;              // kernel passes the previous orbit ran
/* one iteration z → zⁿ (+ c) applied to zdot = jv·2^ev, and Q (as Qm·2^ev) gathered on the way.
   (sA, cA), (sB, cB): sin / cos of the OUTPUT angles of this pixel's z; scale = n·|z|^(n−1);
   jvs = 2^-ev, kept beside ev. The mantissa is renormalised only when it leaves 2^±20, so most
   passes pay no log2 / exp2 here. */
void jetStep(inout vec3 jv, inout float ev, inout float jvs, inout float Qm, vec3 z, float sA, float cA, float sB, float cB, float scale) {
  float rz = length(z), rho = length(z.xy), irho = 1.0 / max(rho, 1e-30);
  Qm += length(jv) * (uPower - 1.0) * irho;
  vec3 nj = vec3(0.0);
  if (rz > 0.0) {
    float irz = 1.0 / rz, sth = rho * irz, cth = z.z * irz;
    float cph = rho > 0.0 ? z.x * irho : 1.0, sph = rho > 0.0 ? z.y * irho : 0.0;
    float kap = sth > 1e-12 ? clamp(sA / sth, -uPower, uPower) : uPower;
    nj = dot(jv, vec3(sth * cph, sth * sph, cth)) * vec3(sA * cB, sA * sB, cA)
       + dot(jv, vec3(cth * cph, cth * sph, -sth)) * vec3(cA * cB, cA * sB, -sA)
       + kap * dot(jv, vec3(-sph, cph, 0.0)) * vec3(-sB, cB, 0.0);
  }
  jv = nj * scale + gRd * jvs;
  float mx = max(abs(jv.x), max(abs(jv.y), abs(jv.z)));
  if (mx > 1048576.0 || (mx < 9.5367e-7 && mx > 0.0)) { float adj = floor(log2(mx)), k = exp2(-adj); jv *= k; Qm *= k; ev += adj; jvs = exp2(max(-ev, -160.0)); }
}
/* THE LINE AGAINST THE BALL (uRayLine > 0; the rule of the second chat's study, BUILD-PLAN "FOLLOW-UP,
   2026-10-09", there on the CPU: 47 to 62 steps a ray where the ray estimate alone takes 85, none of
   5,733 rays through a solid). A bounded orbit never leaves the ball |z| <= rho, rho^n - |c| = rho
   (uRayBall), so a sample is clear of the bulb while ANY of its iterates is outside that ball. Along
   the ray an iterate u moves on the straight line u + s·udot, and strays from it by about
   s²·Q·|udot| / 2 (the bend: Q as for the resumed orbits). The sample is therefore clear while
       | u + s·udot |  -  uRayLine · s²·Q·|udot| / 2   >   rho ,
   and a skimming ray - udot across u - gets a far longer step than the ray estimate, which takes
   all of udot as aimed at the set. Returned: the travel x = s·|udot| of the first s where that
   fails, approached from below (each move is one the left side cannot outrun: its slope in x is
   at most 1 + kap·x). ALL of the safety is the allowance: with none nearly every ray goes through a
   solid, and Q itself UNDER-reads the true bend by up to 2.5 times - hence uRayLine = 2, not 1. */
float lineTravel(vec3 u, vec3 jm, float qm, float rho, float allow) {
  float jl = length(jm);
  if (!(jl > 0.0)) return 0.0;
  float A = dot(u, u), b = dot(u, jm) / jl, kap = max(allow * qm / jl, 1e-12), x = 0.0;
  for (int j = 0; j < 6; j++) {
    float gx = sqrt(max(A + 2.0 * b * x + x * x, 0.0)) - 0.5 * kap * x * x - rho;
    if (gx <= 0.0) break;
    float L = 1.0 + x * kap;
    x += 2.0 * gx / (L + sqrt(L * L + 2.0 * kap * gx));
  }
  return x;
}
#endif
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
#ifdef USE_BOX
${BOX_KERNEL}
#else
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
#ifdef USE_JET
  vec3 jv = gRd; float ev = 0.0, jvs = 1.0, Qm = 0.0, ckErr = 0.0, ckJerr = 0.0;     // zdot_0 = v (z_0 = c); Q = Qm·2^ev; jvs = 2^-ev
  int pass = 0, ckFrom = -1;
  bool ckWr = true;                                          // does this orbit write its checkpoints
  vec3 zPv = vec3(0.0), jPv = vec3(0.0); float ePv = 0.0, qPv = 0.0;   // the iterate before the last, its zdot and Q: THE LINE AGAINST THE BALL
#ifndef NO_CKPT
  if (gRay == 2 && gTolN > 0.0) {
    /* RAY-COHERENT ORBITS: resume from the latest checkpoint whose move stays within gTolN */
    int p0 = min(gCkTop - 1, gCkLast);
    for (int q = 0; q < CKN; q++) {
      int p = p0 - q;
      if (p < 1 || p < gCkTop - CKN) break;
      int cs = p - (p / CKN) * CKN;
      vec4 kb = gCkB[cs];
      if (int(kb.w) != p) continue;                          // the ring slot holds another pass: not this orbit's
      vec4 kc = gCkC[cs];
      float S = gTau - kb.x, aS = abs(S), sq = aS * kc.x;    // the move along the ray; travel × Q = the relative change of the jets
      float er = kb.y + CK_SAFE * (0.5 * aS * sq + aS * kb.z);
      if (!(er <= gTolN)) continue;                          // too far for this checkpoint: try an earlier one
      vec4 kd = gCkD[cs], kj = gCkJ[cs], ka = gCkA[cs];
      vec3 Dm; float em;
      sclAdd(kd.xyz, kd.w, kj.xyz * S, uRefE + kj.w, Dm, em);
      D = Dm; e = em; sclNorm(D, e);
      jv = kj.xyz; ev = kj.w; jvs = exp2(max(-ev, -160.0));
      Qm = kc.x * exp2(clamp(-(ev + uRefE), -126.0, 126.0));
      Ddr = ka.xy; trap = ka.z;
      m = int(kc.y); it = int(kc.z);
      ckErr = er; ckJerr = min(kb.z + sq, 1e30);
      pass = p; ckFrom = p; gCkLast = p;
      ckWr = CK_WR == 0 || (gCkSince >= 1 && gRunPrev >= gRunBase + CK_WR);   // LAZY WRITES: the passes a resumed orbit runs have grown (0: every orbit writes)
      cT0 = texelFetch(orbit, ivec2(m, 0), 0); cDR = texelFetch(orbit, ivec2(m, 3), 0).xy;
      break;
    }
  }
  int nRun = 0;
#endif
#endif
  for (int loop = 0; loop < 512; loop++) {
    if (it >= maxIter) break;
#if defined(USE_JET) && !defined(NO_CKPT)
    nRun++;
    if (gRay == 2 && ckWr) {
      if (pass != ckFrom) {                                  // the checkpoint an orbit resumed from stays as it was
        int cs = pass - (pass / CKN) * CKN;
        gCkD[cs] = vec4(D, e); gCkJ[cs] = vec4(jv, ev); gCkA[cs] = vec4(Ddr, trap, 0.0);
        gCkB[cs] = vec4(gTau, ckErr, ckJerr, float(pass));
        gCkC[cs] = vec4(Qm * exp2(clamp(ev + uRefE, -126.0, 126.0)), float(m), float(it), 0.0);
      }
      pass++;
    }
#endif
    bool applied = false;                      // always false since the skip table went (2026-10-11): it marked a pass that had applied a table run
#ifdef USE_STATS
    gWork++;                                   // one loop pass = one real step
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
#ifdef USE_JET
      if (gRay != 0) { zPv = V + df; jPv = jv; ePv = ev; qPv = Qm; }
      if (gRay != 0) jetStep(jv, ev, jvs, Qm, V + df, sa + s * dsA, ca + s * dcA, sb + s * dsB, cb + s * dcB, uPower * t2.z * sclPow2(t2.w) * (1.0 + gN1 * s));
#endif
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
      if (uRebaseOrigin == 1 && it < maxIter) {
        /* REBASE TO THE ORIGIN (uRebaseOrigin, 2026-10-08; off by default: the page's rebase is
           the branch below). A rebase restarts the reference at its first point. The page does it
           as δ = z − Z0, and Z0 is c, not 0: the reference orbit is stored from its first point on.
           So a z that has come close to the origin - an orbit about to start over - gets a δ as
           large as c itself, and every iteration from there on is plain f32 on numbers of size 1,
           its rounding growing about tenfold an iteration. Where orbits pass the origin and then
           need many more iterations than the camera's (the bottom of the sample flight's 3.5e-16
           view: a pass at 0.19 on iteration 16, eight more to escape) the distance estimate came
           out 2 to 89 % wrong against the BigInt direct referee, and the picture there is grain.
           Here z itself is the δ of a reference standing at the origin, and one direct iteration
           carries it onto Z0:   δ ← z^n + δc,   Δdr ← n·|z|^(n−1)·dr   (dr' = n|z|^(n−1)·dr + 1, DR0 = 1).
           z^n is formed from z alone, to full f32 relative precision, so a small z gives a small δ
           again. It is the same orbit - in f64 the two rebases agree to 1e-9 - and it is one real
           iteration (it++). |z| is carried as mantissa·2^ez so that z^n cannot underflow.
           @invariant with uRebaseOrigin = 1 the GPU distance estimate is within 1e-3 of the BigInt
           direct referee on a 13 x 13 grid of rays of that view, just in front of each ray's hit -
           proven by: npm run smoke:deep-zoom-direct ("off-centre rays ... rebase to the origin").
           Falsified 2026-10-08: this branch switched off in the shader -> that line FAIL. */
        vec2 drFull = hdrAdd(cDR, Ddr);                      // the pixel's own dr at this point
        float rz = sqrt(z2);
        if (rz > 0.0) {
          float ez = floor(log2(rz)), rm = rz * exp2(-ez);   // |z| = rm·2^ez
          float rn1 = 1.0;
          for (int k = 1; k < uPowerI; k++) rn1 *= rm;       // rm^(n−1) by multiplication: the built-in pow is not f32-accurate
          float rho = length(zf.xy);
          float th = atan2Acc(rho, zf.z) * uPower + uPhase.x;
          float ph = (rho > 0.0 ? atan2Acc(zf.y, zf.x) : 0.0) * uPower + uPhase.y;
          float sth, cth1, sph, cph1;
          sinCosm1Acc(th, sth, cth1); sinCosm1Acc(ph, sph, cph1);
#ifdef USE_JET
          if (gRay != 0) { zPv = zf; jPv = jv; ePv = ev; qPv = Qm; }
          if (gRay != 0) jetStep(jv, ev, jvs, Qm, zf, sth, 1.0 + cth1, sph, 1.0 + cph1, uPower * rn1 * sclPow2((uPower - 1.0) * ez));
#endif
          vec3 P = rn1 * rm * vec3(sth * (1.0 + cph1), sth * sph, 1.0 + cth1);   // z^n = P·2^(n·ez)
          sclAdd(P, uPower * ez, C, ec, D, e);
          Ddr = hdrMulF(drFull, uPower * rn1); Ddr.y += (uPower - 1.0) * ez;
        } else {
          D = C; e = ec; Ddr = vec2(0.0);
#ifdef USE_JET
          jv = gRd; ev = 0.0; jvs = 1.0; Qm = 0.0;
#endif
        }
        sclNorm(D, e);
        m = 0; it++; rebases++;
        cT0 = T00; cDR = DR00;
        dz = D * sclPow2(e); zf = cT0.xyz + dz; z2 = dot(zf, zf);
        trap = min(trap, z2);
        if (z2 > 4.0) { escaped = true; escR2 = z2; break; }
      } else {
        D = zf - T00.xyz; e = 0.0;
        sclNorm(D, e);
        Ddr = hdrAdd(hdrSub(cDR, vec2(1.0, 0.0)), Ddr);
        m = 0; rebases++;
        cT0 = T00; cDR = DR00;
      }
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
#ifdef USE_JET
  vec2 rde = vec2(0.0), rls = vec2(0.0);                // THE RAY ESTIMATE: 0.5·r·ln r / |zdot|
  if (gRay != 0) {
    float jl = length(jv);
    if (jl > 0.0 && rF > 1.0) rde = hdrMul(hdrFromFloat(0.5 * rF * log(rF)), hdrRecip(hdrReduce(vec2(jl, ev))));
    if (uRayLine > 0.0 && escaped && jl > 0.0) {
      /* THE LINE AGAINST THE BALL, read at the escaping iterate and at the one before it (when that one
         stands outside the ball): either says the sample is clear, so the longer step holds */
      float xK = lineTravel(cT0.xyz + D * sE, jv, Qm, uRayBall, uRayLine);
      if (xK > 0.0) rls = hdrReduce(vec2(xK / jl, -ev));
      float jp = length(jPv);
      if (jp > 0.0 && dot(zPv, zPv) > uRayBall * uRayBall) {
        float xP = lineTravel(zPv, jPv, qPv, uRayBall, uRayLine);
        vec2 sP = xP > 0.0 ? hdrReduce(vec2(xP / jp, -ePv)) : vec2(0.0);
        if (sP.x > 0.0 && (rls.x <= 0.0 || hdrGtPos(sP, rls))) rls = sP;
      }
    }
    if (gRay == 2) {
#ifndef NO_CKPT
      if (ckWr) { gCkTop = pass; gCkSince = 0; gCkLast = 1048576; }
      else { if (gCkSince == 0) gRunBase = nRun; gCkSince++; }
      gRunPrev = nRun;
#endif
    }
  }
  return OrbitOut(sclToH3(D, e), Dr, Ddr, de, it, rebases, escaped, sqrt(trap), sqrt(escR2), rde, rls);
#else
  return OrbitOut(sclToH3(D, e), Dr, Ddr, de, it, rebases, escaped, sqrt(trap), sqrt(escR2));
#endif
}
#endif
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
#ifdef USE_BOX
/* THE FORMULA SEAM (grep): the f32 baseline of the Mandelbox - drawn while its deep variant compiles and
   when the mode says f32. The map and the estimate of BOX_KERNEL on plain floats; it keeps the bulb's
   function name so the march below is one text. Uniforms as in BOX_KERNEL. */
uniform vec4  uBoxA;
uniform vec4  uBoxB;
uniform mat3  uBoxRot;
uniform int   uBoxHasRot;
uniform float uBoxFar;
float deMandelbulb(vec3 pos){
    vec3 z = pos; float dr = 1.0; float r2 = 0.0;
    int N = int(uIters);
    for (int i=0;i<512;i++){
        if (i>=N) break;
        if (uBoxHasRot == 1) z = uBoxRot * z;
        z = clamp(z, -uBoxA.z, uBoxA.z) * 2.0 - z;
        float k = clamp(uBoxB.y / max(dot(z,z), 1e-30), 1.0, uBoxB.z);
        z = z * (k * uBoxA.x) + pos;
        dr = dr * k * uBoxA.y + 1.0;
        r2 = dot(z,z);
        if (r2 > uBoxB.w) break;
    }
    return (sqrt(r2) - 1.0) / dr;
}
#else
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
#endif
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
#ifdef USE_BOX
        /* the box is drawn with three times the bulb's iterations from outside (36 at scale 2), and its surface at
           that count has detail far below what f32 holds: at the bulb's hit level the baseline is grain. A pixel's
           own footprint is the level the far-field march uses, and it is clean. */
        eps = max(eps, t * uFovScale / uRes.y);
#endif
        if (d < eps){ hit=true; break; }
#ifdef USE_BOX
        if (t > uBoxFar) break;
#else
        if (t > 12.0) break;
#endif
        t += d*0.9;
    }
    vec3 col = vec3(0.02,0.03,0.05);
    if (hit){
        vec3 p = ro + rd*t;
        float eps = max(1e-20, length(p)*uPrecRatio);
#ifdef USE_BOX
        eps = max(eps, t * uFovScale / uRes.y);     // the normal's taps a pixel apart, as the hit level above
#endif
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
uniform int       uNormalIters;  // PERF LEVER: >0 caps pertOrbit iters on the normal taps (0 = full uIters)
uniform int       uBisectIters;  // PERF LEVER: >0 caps pertOrbit iters on the bisection midpoint evals (0 = full uIters)
uniform float     uStepRelax;    // PERF LEVER: march step = relax·de (0 ⇒ shader default 0.85; >1 = over-relaxed sphere tracing)
uniform int       uMaxSteps;     // the near-field march's step budget, for pictures (the probes keep 256)
uniform vec2      uFarRelax;     // FAR RELAX: toward step factor x over y octaves of depth beyond uFarFrom (x = 0: off)
uniform float     uFarFrom;      // where FAR RELAX starts, as PASS G OUTPUT x (log2 t − uRefE)
uniform int       uLand;         // 1 = land a hit on the level de = pa·t instead of where the last step fell (grep HIT LANDING); 2 = only right of uLandSplit
uniform float     uLandSplit;    // compare view: the divider's framebuffer x
uniform int       uFarLook;      // 1 = a far-field hit carries a palette parameter, as a near hit does (grep FAR LOOK); 0 = the page
uniform int       uHitRefine;    // n > 0: bisect the last step n times onto the level de = pa·t (grep HIT REFINE); n < 0: |n| times, only right of uLandSplit
uniform int       uRebaseOrigin; // 1 = the kernel rebases an orbit onto the origin (grep REBASE TO THE ORIGIN); 0 = the page: onto the reference's first point
uniform float     uFarSwitch;    // the t at which a ray is handed to the f32 far-field march (grep FAR HAND-OFF); the page: 1e-3
uniform float     uLookLevel;    // THE LOOK LEVEL (grep): the normal is taken on the level this many times the hit level (1 = the page: on the hit itself)
#ifdef USE_JET
uniform int       uRayUse;       // THE RAY ESTIMATE (grep), bits: 1 = step by it · 2 = hit test by it · 4 = ray-coherent orbits
uniform float     uRayFactor;    // the step is this share of the ray estimate (1 = the bound itself)
uniform float     uRayHit;       // the ray hit level as a multiple of uPixAng (the host: a 64th of a display pixel)
uniform float     uRayTol;       // how far a resumed orbit's point may stand from the true one, as a multiple of uPixAng
uniform float     uRayFloor;     // with the page's hit test (bit 2 off): also a hit once the ray estimate is under this multiple of uPixAng (0 = no floor)
uniform float     uRayLine;      // THE LINE AGAINST THE BALL (grep): the allowance for the path's bend, as a multiple of Q (0 = off)
uniform float     uRayBall;      // the radius no bounded orbit leaves: rho^n - |c| = rho
#endif
uniform int       uGuide;        // 1 = this jittered sample starts its march from the depth guide; 0 = from the camera
uniform float     uGuideK;       // guide back-off, in pixel cones
uniform int       uGuideR;       // guide neighbourhood radius in pixels (1 = 3×3, 2 = 5×5)
uniform sampler2D uGuideTex;     // per pixel, over the earlier samples: x = nearest near-field hit (as PASS G OUTPUT x; 1e30 = some sample missed)
/* the march as a PICTURE runs it (budget, HIT REFINE, FAR RELAX all live): the render, and probe 7
   (grep MARCH PROBE). Probes 1-6 referee the plain 256-step march. */
#define PICTURE_MARCH (uProbe == 0 || uProbe == 7)
/* FAR HAND-OFF (uFarSwitch, 2026-10-08; the page: 1e-3). A ray that has travelled this far from
   the camera without a hit is handed from the deep march to the plain f32 far-field march, which
   starts from an f32 camera position and iterates in f32. That march resolves a distance of about
   1e-7 and no better, and its hit level is tolerance x t: at t = 1e-3 that level IS about 1e-7, so
   just past the hand-off its hits are noise. Measured against the BigInt referee on a 1080-row
   picture: at camera depths 1.2e-3 and 4.2e-4 (where the hits lie past 1e-3) 68 % and 79 % of
   far-march hits stand more than half off their level, deep-march hits none. The deep march has no
   such floor - the camera and t are exact - so a host moves the hand-off out to where the f32
   march is good again (the shell: 0.5, where the level is ~3e-4). The probes keep 1e-3, as the
   CPU referee that mirrored their march did (pertMarchJS, gone 2026-10-11).
   @invariant with the hand-off at 0.5 the hits of two shallow views stand on their level by the
   BigInt referee - proven by: npm run smoke:deep-zoom-direct ("far hand-off ... at 0.5").
   Falsified 2026-10-08: FAR_SWITCH pinned to 1e-3 in the shader -> those lines FAIL. */
#define FAR_SWITCH (PICTURE_MARCH ? uFarSwitch : 1e-3)
${KERNEL_CORE}
#ifdef USE_BOX
/* THE FORMULA SEAM (grep): the far field's two plain-f32 functions for the Mandelbox - the map, the escape
   radius and the estimate of BOX_KERNEL on plain floats, an iteration tested AFTER its step as the kernel
   tests it. A ray is handed to them where the bulb's is (grep FAR HAND-OFF) and followed to uBoxFar. boxMu is
   the smooth iteration count: past the escape radius an iteration multiplies |z| by |scale|, so the share of
   the last one is log(|z| / R) / log |scale| (the bulb's log log |z| / log n belongs to a power map). */
void boxStepF32(inout vec3 z, inout float dr, vec3 c) {
    if (uBoxHasRot == 1) z = uBoxRot * z;
    z = clamp(z, -uBoxA.z, uBoxA.z) * 2.0 - z;
    float k = clamp(uBoxB.y / max(dot(z, z), 1e-30), 1.0, uBoxB.z);
    z = z * (k * uBoxA.x) + c;
    dr = dr * k * uBoxA.y + 1.0;
}
float boxMu(float iters, float r) { return iters + 1.0 - 0.5 * log(max(r * r / uBoxB.w, 1.0)) / log(uBoxA.y); }
float deF32(vec3 pos){
    vec3 z = pos; float dr = 1.0, r2 = 0.0;
    int N = int(uIters);
    for (int i = 0; i < 512; i++) {
        if (i >= N) break;
        boxStepF32(z, dr, pos);
        r2 = dot(z, z);
        if (r2 > uBoxB.w) break;
    }
    return (sqrt(r2) - 1.0) / dr;
}
float paletteF32(vec3 pos){
    if (uColorMode == 0) return 0.0;
    vec3 z = pos; float dr = 1.0, r2 = 0.0, trap2 = 1e30; int it = 0;
    int N = int(uIters);
    for (int i = 0; i < 512; i++) {
        if (i >= N) break;
        boxStepF32(z, dr, pos);
        r2 = dot(z, z); it++;
        trap2 = min(trap2, r2);
        if (r2 > uBoxB.w) break;
    }
    if (uColorMode == 1) return boxMu(float(it), sqrt(r2)) * 0.18;
    return log(max(sqrt(trap2), 1e-30)) * 1.5;
}
#else
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
/* FAR LOOK (2026-10-08, off by default: the page draws far ground grey). The palette PARAMETER of a
   far-field point, by the rules paletteParam uses for a near hit, from one plain f32 orbit: the
   same iteration, the same escape radius, the count of iterations applied, |z| at escape, and the
   smallest |z| after the first step. Without it a view shallower than about 1e-3 - where every
   hit is a far hit - stays grey whatever the Colour tab says. */
float paletteF32(vec3 pos){
    if (uColorMode == 0) return 0.0;
    vec3 z = pos; float r = length(z), trap2 = 1e30; int it = 0;
    int N = int(uIters);
    for (int i = 0; i < 256; i++) {
        if (i >= N || r > 2.0) break;
        float rp1 = pow(r, uPower-1.0);
        float theta = acos(clamp(z.z/r, -1.0, 1.0)) * uPower + uPhase.x;
        float phi = atan(z.y, z.x) * uPower + uPhase.y;
        z = rp1*r*vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta)) + pos;
        r = length(z); it++;
        trap2 = min(trap2, r*r);
    }
    if (uColorMode == 1) return (float(it) + 1.0 - log(log(max(r, 2.0001))) / log(uPower)) * 0.18;
    return log(max(sqrt(trap2), 1e-30)) * 1.5;
}
#endif
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
#ifdef USE_JET
  gTau = t.x * exp2(clamp(t.y - uRefE, -126.0, 126.0)); gTolN = gTau * uRayTol * uPixAng;   // RAY-COHERENT ORBITS: where this sample is, and how far off it may be evaluated
#endif
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
#ifdef USE_BOX
    float mu = boxMu(float(co.iters), co.escR);
#else
    float mu = float(co.iters) + 1.0 - log(log(max(co.escR, 2.0001))) / log(uPower);
#endif
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
/* THE LOOK LEVEL (uLookLevel > 1; an experiment of 2026-10-09, off = the page). The detail setting does two things
   through one number: it says how close a ray stops (de < pa·t, pa = a display pixel ÷ detail), and it sets how far
   apart the normal's taps stand (2·pa·t). The first is geometry - a coarse level draws a fat surface that swallows
   thin layers. The second is the look - taps a 16th of a pixel apart read the surface's own grain, and the owner
   found Detail 32 "too much in many instances, where it just makes the surface very rough". Here the two are
   parted: the ray still stops on the fine level pa, but on its way in it crossed the coarser level pa·uLookLevel,
   and the normal is taken THERE, with taps as far apart as that level asks. tLook is that crossing (the last one
   before the hit, placed between the two march samples that bracket it, as HIT LANDING places a hit); 0 when the
   march never stood outside the look level (then the caller backs off along the ray instead). */
vec2 marchNear(vec3 rd, float pa, inout vec2 t0, out bool hit, out int steps, out vec2 deOut, out float tF, out OrbitOut hitOrbit, out vec2 tLook) {
  vec2 tLa = vec2(0.0); float rLa = 0.0; bool lookSet = false; tLook = vec2(0.0);
  vec2 t = t0, tPrev = t0, cap = vec2(0.0), de = vec2(0.0), dePrev = vec2(0.0);
  hit = false; steps = 0; tF = -1.0; bool esc = false;
  OrbitOut oo; OrbitOut lastOO; lastOO.escaped = false;   // last surface-side orbit → reused for colour
  int budget = PICTURE_MARCH ? uMaxSteps : 256;      // the probes referee the plain march: 256 steps, no relaxing
#ifdef USE_JET
  if (PICTURE_MARCH && (uRayUse & 1) != 0) budget *= 4;   // THE RAY ESTIMATE: its steps are shorter than the page's, and never relaxed with distance
#endif
  int refine = !PICTURE_MARCH ? 0 : uHitRefine > 0 ? uHitRefine : (gl_FragCoord.x + uOrigin.x >= uLandSplit ? -uHitRefine : 0);   // HIT REFINE
#ifdef USE_JET
  bool rayOn = PICTURE_MARCH && uRayUse != 0;        // THE RAY ESTIMATE: the probes that referee the page's march keep the page's
  bool rayHit = rayOn && (uRayUse & 2) != 0;
  gRay = !rayOn ? 0 : (uRayUse & 4) != 0 ? 2 : 1; gRd = rd; gCkTop = 0; gCkLast = 1048576; gCkSince = 0; gRunBase = 0; gRunPrev = 0;
#endif
  for (int st = 0; st < budget; st++) {
    steps = st;
    de = deAt(t, rd, uIters, esc, oo);
    lastOO = oo;
#ifdef USE_JET
    if (rayHit && st == 0 && t0.x != 0.0 && esc && hdrToFloat(hdrMul(oo.rde, hdrRecip(t))) < uRayHit * pa) {
      t0 = vec2(0.0); t = vec2(0.0); tPrev = vec2(0.0);    // GUIDED START re-check, by the ray hit level
      continue;
    }
#endif
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
      if (uLookLevel > 1.0) {                           // THE LOOK LEVEL: remember where the ray last came in through it
        float paL = pa * uLookLevel;
        if (ratio >= paL) { tLa = t; rLa = ratio; lookSet = false; }
        else if (!lookSet && tLa.x != 0.0) {
          float uL = hdrToFloat(hdrMul(hdrSub(t, tLa), hdrRecip(tLa)));
          float g0 = rLa - paL, g1 = (ratio - paL) * (1.0 + uL);
          tLook = hdrMulF(tLa, 1.0 + uL * clamp(g0 / max(g0 - g1, 1e-30), 0.0, 1.0)); lookSet = true;
        }
      }
#ifdef USE_JET
      if (rayHit) {                                    // THE RAY ESTIMATE as the hit test: its own level, no landing, no refine
        if (oo.rde.x > 0.0 && hdrToFloat(hdrMul(oo.rde, hdrRecip(t))) < uRayHit * pa) { hit = true; break; }
        ratio = 1e30;
      } else if (rayOn && uRayFloor > 0.0 && oo.rde.x > 0.0 && hdrToFloat(hdrMul(oo.rde, hdrRecip(t))) < uRayFloor * pa) {
        /* THE CREEP FLOOR. The page's hit test stays, but where the iterate moves far faster along the ray than the
           scalar derivative says, the ray estimate - and with it the step - falls far below the hit level while the
           page's estimate does not: such a ray creeps for hundreds of steps past something it is a small part of a
           pixel from, and the GPU waits for it. Under the floor that is a hit. */
        hit = true; break;
      }
#endif
      if (ratio < pa) {
        /* HIT LANDING (uLand, off by default — it moves the surface). A hit is accepted
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
        /* HIT REFINE (uHitRefine, off by default: it moves the surface). The hit above is
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
      if (hdrToFloat(t) > FAR_SWITCH) { tF = hdrToFloat(t); break; }   // hand off to f32 far-field (grep FAR HAND-OFF)
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
    if (uFarRelax.x > 0.0 && PICTURE_MARCH && t.x != 0.0)
      relax = mix(relax, max(relax, uFarRelax.x), clamp((log2(t.x) + (t.y - uRefE) - uFarFrom) / uFarRelax.y, 0.0, 1.0));
#ifdef USE_JET
    /* THE RAY ESTIMATE as the step: the bound itself (uRayFactor), never relaxed with distance */
    bool rayStep = rayOn && (uRayUse & 1) != 0 && oo.rde.x > 0.0;
    vec2 step = rayStep ? hdrMulF(oo.rde, uRayFactor) : hdrMulF(de, relax);
    if (rayStep && oo.rls.x > 0.0 && hdrGtPos(oo.rls, step)) step = oo.rls;   // THE LINE AGAINST THE BALL: the longer of the two
#else
    vec2 step = hdrMulF(de, relax);
#endif
#ifdef USE_JET
    /* The page's START CAP (first step 5 % of the estimate, growing a quarter a step: "anti-arm-skip") is there
       because the page's estimate over-reads. The ray step does not need it: on the CPU, 1,053 rays, the cap
       cost 57 against 51 steps a ray and kept no ray out of a solid that went in without it. */
    if (!rayStep) {
#endif
    if (cap.x == 0.0) cap = hdrMulF(de, 0.05);
    vec2 capEff = (t.x != 0.0 && hdrGtPos(t, cap)) ? t : cap;
    if (hdrGtPos(step, capEff)) step = capEff;
    cap = hdrMulF(cap, 1.25);
#ifdef USE_JET
    }
#endif
    t = hdrAdd(t, step);
  }
#ifdef USE_JET
  gRay = 0;                                            // the normal taps that follow run the page's orbit
#endif
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
      float back = 1.0 - uGuideK * pixAng * max(uLookLevel, 1.0);   // THE LOOK LEVEL: a guided ray must still start outside it
      if (ok && back > 0.0) { float L = ln + log2(back), e = floor(L); t0 = vec2(exp2(L - e), e + uRefE); }
    }
    vec2 tLook;
    vec2 t = marchNear(rd, pixAng, t0, hit, steps, de, tF, hitOrbit, tLook);   // shared near-field HDR march (orbit reused for colour)
    bool guided = t0.x != 0.0;                    // this ray really started from the guide (its step count is not a full march's)
#ifdef USE_STATS
    int sOrb = gOrbits, sWork = gWork;           // march-only counts (the normal taps come after)
#endif
    if (uProbe == 3) {
        /* MARCH-POPULATION probe (SLICE 6b): emit the surface position from the SAME march the
           renderer runs (marchNear inlined ONCE) — the user-visible quantity. Output
           (tHit HDR, hitFlag, steps). NOTHING ASKS FOR IT since 2026-10-11: its caller (api.marchPop)
           and the CPU referee that mirrored it (pertMarchJS, the page's march on the CPU) went with
           the page's program. The branch stays so that the kept programs compile what they did. */
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
        /* HIT REFINE reaches the far field too (2026-10-08): the same halving of the last step, on
           plain f32 numbers. Off (uHitRefine = 0) this loop is the page's, statement for statement. */
        int farRefine = !PICTURE_MARCH ? 0 : uHitRefine > 0 ? uHitRefine : (gl_FragCoord.x + uOrigin.x >= uLandSplit ? -uHitRefine : 0);
        float tPrevF = tF;
        for (int st = 0; st < 256; st++) {
            vec3 p = roF + rd*tF;
            float d = deF32(p);
            if (d < pixAng*tF) {
                if (farRefine > 0 && tPrevF < tF) {
                    float fa = tPrevF, fb = tF;
                    for (int r = 0; r < 12; r++) {
                        if (r >= farRefine) break;
                        float fm = 0.5 * (fa + fb);
                        if (deF32(roF + rd*fm) < pixAng*fm) fb = fm; else fa = fm;
                    }
                    tF = fb;
                }
                farHit = true; break;
            }
#ifdef USE_BOX
            if (tF > uBoxFar) break;
#else
            if (tF > 12.0) break;
#endif
            tPrevF = tF;
            tF += d*0.9;
        }
    } else if (!hit && tF < 0.0 && hdrToFloat(t) <= FAR_SWITCH) {
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
            vec2 tN = t;                                   // where the normal is taken: the hit, unless THE LOOK LEVEL is on
            vec2 eH = hdrMulF(t, 2.0 * pixAng);
            if (uLookLevel > 1.0 && uNormalMode == 2) {
                tN = tLook.x != 0.0 ? tLook : hdrMulF(t, 1.0 - min(0.5, pixAng * uLookLevel));
                eH = hdrMulF(tN, 2.0 * pixAng * uLookLevel);
            }
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
                        hdrAdd(hdrMulF(tN, rd.x), hdrMulF(eH, kv.x)),
                        hdrAdd(hdrMulF(tN, rd.y), hdrMulF(eH, kv.y)),
                        hdrAdd(hdrMulF(tN, rd.z), hdrMulF(eH, kv.z)));
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
        if (uFarLook == 1) sPal = paletteF32(uCamPosF + rd*tF);
    } else if (exhausted) {
        kind = 3.0;
    }
#ifdef USE_STATS
    if (uProbe == 4) { o = vec4(float(steps), float(sOrb), float(sWork), float(gWork)); return; }
    if (uProbe == 5) { o = vec4(kind, float(gIters), float(gBis), float(gBig)); return; }
    if (uProbe == 7) { o = vec4(lt, float(steps) + 65536.0*kind, float(sOrb), float(gWork)); return; }   // MARCH PROBE
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
uniform int   uFarLook;          // 1 = far ground wears the near surface's albedo and palette (grep FAR LOOK in pass G); 0 = the page's mid grey
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
            vec3 alb = (kind == 2.0 && uFarLook == 0) ? vec3(0.5) : albedoNew(g.y);
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
   DEEP_FRAG compiles into variants, selected by #defines:
     USE_JET   the bulb's program: THE RAY MARCH (key PR; PTR with the work counters)
     USE_BOX   the Mandelbox's program (key X; XT with the work counters)
     + T       USE_STATS: per-pixel work counters for __stats and the march probe (diagnostics only)
   THE BULB HAS ONE PROGRAM SINCE 2026-10-11, PR. It is compiled WITHOUT blocking at load (deepProg / ud — the
   readiness flag everything checks), and nothing else draws a deep picture of the bulb: until it is there
   the f32 baseline is on screen, and if it cannot be built there is no deep picture at all (deepCompileErr,
   api.rayMarchState() 'failed': a host says so; no other march stands in - the owner: "If the ray shader
   fails to build on a machine, that machine is likely gonna die trying to render the mandelbulb at high zoom
   - so I wouldnt want an alternative based on that, rather an error").
   GONE that day: the page's own program (the plain variant, key P: this kernel with the page's step rule and
   no jet), which had been the readiness program and drew while the ray variant built; and the skip-table
   variants (PB, PBT: BLA, a table of composed linear steps that skipped runs of iterations, 1.3 to 2.4 times
   faster below 1e-13 under the page's march - the ray march resumes orbits instead). The page's STEP RULE is
   still in marchNear: the Mandelbox steps by it, and so does the ray program's measuring mode (bit 8).
   The counter variants are built on first use, blocking. All gates draw through deepCtx(). */
const variants = {}, variantErr = {}, compileMs = {};        // key → { p, x }  (null = failed to build)
const pendingBuild = {};                                     // key → the background build in flight (mkProgAsync's handle): a blocking ask waits for IT instead of starting a second
/* THE RAY ESTIMATE (grep; api.setRayMarch) is on from the start, as the shell has had it since 2026-10-09: bits 5
   (step by the ray estimate, orbits resumed along the ray), creep floor 1/256 px, the line rule at twice the bend
   measure. Until 2026-10-11 the create option `rayMarch` chose between this and the page's march; it is not read
   any more (a caller that still passes it, true or false, gets the ray march). */
let rayAsk = 5;                                  // what was asked for; rayUse is what is in force - 0 while the box is drawn (grep THE FORMULA SEAM)
let rayUse = rayAsk, rayFactor = 1, rayHitDiv = 64, rayTol = 0.05, rayFloorDiv = 256, rayLine = 2, rayDetail = 0;
/* THE RAY ESTIMATE AND RAY-COHERENT ORBITS (grep; api.setRayMarch). Its variant is DEEP_FRAG with USE_JET.
   Keys PR (the picture: built at load, see above) and PTR (with the work counters). */
const BOX_ITER_MAX = 500;                        // the box's ceiling (grep ITERATIONS AS A MARGIN); the kernel's loop runs 512 passes at most
const RAY_ITER_REACH = 20.7, RAY_ITER_MAX = 400;   // ITERATIONS AS A MARGIN (grep): e^20.7 = 1e9, five decades beyond a 1/32-pixel hit level at 1080 rows
const rKey = (t) => 'P' + (t ? 'T' : '') + 'R';
let rayDefs = '';                                 // extra #defines for the ray variant (experiments: api.setRayDefs)
const rSrc = (t) => DEEP_FRAG.replace('#version 300 es', '#version 300 es' + (t ? '\n#define USE_STATS' : '') + '\n#define USE_JET' + rayDefs);
function ensureRayVariant(t){
  const key = rKey(t);
  if (variants[key] === undefined && pendingBuild[key]) pendingBuild[key].finish();
  if (variants[key] !== undefined) return variants[key];
  try {
    const t0 = performance.now();
    const p = mkProg(rSrc(t));
    const x = makeUD(p);
    compileMs[key] = performance.now() - t0;
    variants[key] = { p, x };
  } catch(e){ variantErr[key] = String(e); variants[key] = null; }
  return variants[key];
}

/* THE MANDELBOX's variant (grep THE FORMULA SEAM): DEEP_FRAG with USE_BOX, never with the
   jet, whatever was asked for. Keys X (the picture) and XT (with the work counters). A picture never waits
   for it: it builds in the background from the moment the box is selected, and until it is there the frame
   draws the box's f32 baseline (deepNow() is null), as the page draws the bulb's while its deep shader
   compiles. A probe or a study that asks for it before then builds it at once, blocking. */
const xKey = (t) => 'X' + (t ? 'T' : '');
const xSrc = (t) => DEEP_FRAG.replace('#version 300 es', '#version 300 es' + (t ? '\n#define USE_STATS' : '') + '\n#define USE_BOX');
function ensureBoxVariant(t){
  const key = xKey(t);
  if (variants[key] === undefined && pendingBuild[key]) pendingBuild[key].finish();
  if (variants[key] !== undefined) return variants[key];
  try {
    const t0 = performance.now();
    const p = mkProg(xSrc(t));
    const x = makeUD(p);
    compileMs[key] = performance.now() - t0;
    variants[key] = { p, x };
  } catch(e){ variantErr[key] = String(e); variants[key] = null; }
  return variants[key];
}
function kickBoxVariantAsync(){                  // without blocking; a no-op once started
  const key = xKey(false);
  if (variants[key] !== undefined || pendingBuild[key]) return;
  const t0 = performance.now();
  pendingBuild[key] = mkProgAsync(xSrc(false), (p, err) => {
    pendingBuild[key] = null;
    if (!p) { variantErr[key] = err; variants[key] = null; return; }
    const x = makeUD(p);
    compileMs[key] = performance.now() - t0;
    variants[key] = { p, x };
    accumReset = true;
  });
}
/* the program a deep PICTURE of the active formula needs, or null while it is not built: what "the deep path
   is ready" means from here on (for the bulb it is deepProg, as ever) */
const deepNow = () => (boxOn() ? (variants[xKey(false)] ? variants[xKey(false)].p : null) : deepProg);

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
/* THE FORMULA SEAM (grep): the f32 baseline of the active formula - the page's program for the bulb, FRAG with
   USE_BOX for the box (small: built on first use, blocking, well under a second). */
let progBox = null, uBox = null;
function baseCtx(){
  if (!boxOn()) return { p: prog, u };
  if (!progBox) {
    progBox = mkProg(FRAG.replace('#version 300 es', '#version 300 es\n#define USE_BOX'));
    const g = n => gl.getUniformLocation(progBox, n);
    uBox = { res:g('uRes'), camPos:g('uCamPos'), right:g('uRight'), up:g('uUp'), fwd:g('uFwd'),
             fov:g('uFovScale'), power:g('uPower'), iters:g('uIters'), prec:g('uPrecRatio'),
             light:g('uLightDir'), phase:g('uPhase'),
             boxA:g('uBoxA'), boxB:g('uBoxB'), boxRot:g('uBoxRot'), boxHasRot:g('uBoxHasRot'), boxFar:g('uBoxFar') };
  }
  return { p: progBox, u: uBox };
}
/* the box's parameters on a program (x: its uniform table - a deep variant's or the baseline's) */
function setBoxUniforms(x){
  const p = boxP, R = p.R;
  gl.uniform4f(x.boxA, p.scale, Math.abs(p.scale), p.fold, 2 * p.fold);
  gl.uniform4f(x.boxB, p.m2, p.F2, p.kA, BOX_ESC2);
  gl.uniformMatrix3fv(x.boxRot, false, [R[0][0], R[1][0], R[2][0], R[0][1], R[1][1], R[2][1], R[0][2], R[1][2], R[2][2]]);   // column by column
  gl.uniform1i(x.boxHasRot, p.hasRot ? 1 : 0);
  gl.uniform1f(x.boxFar, boxFar());
}
function makeUD(p){ const g = n => gl.getUniformLocation(p,n);
  return { res:g('uRes'), right:g('uRight'), up:g('uUp'), fwd:g('uFwd'),
            fov:g('uFovScale'), orbit:g('uOrbit'), len:g('uOrbitLen'), iters:g('uIters'),
            origin:g('uOrigin'), refE:g('uRefE'), probe:g('uProbe'), probeT:g('uProbeT'),
            pixAng:g('uPixAng'), camF:g('uCamPosF'), spreadT:g('uSpreadT'),
            normalMode:g('uNormalMode'), bisectMax:g('uBisectMax'), jitter:g('uJitter'),
            power:g('uPower'), powerI:g('uPowerI'), binomN:g('uBinomN'), binomN1:g('uBinomN1'), phase:g('uPhase'),
            colorMode:g('uColorMode'),
            normalIters:g('uNormalIters'), bisectIters:g('uBisectIters'), stepRelax:g('uStepRelax'),
            maxSteps:g('uMaxSteps'), farRelax:g('uFarRelax'), farFrom:g('uFarFrom'),
            land:g('uLand'), landSplit:g('uLandSplit'), hitRefine:g('uHitRefine'), rebaseOrigin:g('uRebaseOrigin'), farSwitch:g('uFarSwitch'), lookLevel:g('uLookLevel'), rayUse:g('uRayUse'), rayFactor:g('uRayFactor'), rayHit:g('uRayHit'), rayTol:g('uRayTol'), rayFloor:g('uRayFloor'), rayLine:g('uRayLine'), rayBall:g('uRayBall'), farLook:g('uFarLook'), guide:g('uGuide'), guideK:g('uGuideK'), guideR:g('uGuideR'), guideTex:g('uGuideTex'),
            boxA:g('uBoxA'), boxB:g('uBoxB'), boxRot:g('uBoxRot'), boxHasRot:g('uBoxHasRot'), boxFar:g('uBoxFar') }; }   // the last five: null but in the USE_BOX variant
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
  compare:g('uCompare'), farLook:g('uFarLook'), lookA:g('uLookA'), lookB:g('uLookB'), lookC:g('uLookC'), haze:g('uHaze'),
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
     'alone'  a frame of api.dz.renderFrame: as 'fresh', and a picture with too little surface
              to fit a plane to gets the plane that faces the camera instead of keeping the rig
              it found — the frame's light is this view's own, whatever was drawn before it
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
   this camera basis; null if too little of it is surface. `alone` (the rig mode 'alone'): never
   null — where there is no fit, the plane that faces the camera, at the depths of what surface
   there is (-1 .. 1, the rig's starting range, with none at all) */
function fitRig(px, w, h, fwd, right, up, alone){
  const facing = (near, far) => (alone ? { n: Array.from(fwd, c => -c), near, far } : null);
  const fov = Math.tan(0.5 * 1.1), pts = [];
  for (let j = 0; j < RIG_N; j++) for (let i = 0; i < RIG_N; i++) {
    const o = (j * RIG_N + i) * 4, z0 = px[o + 2], z = z0 >= 1024 ? z0 - 1024 : z0, kind = Math.floor(z / 256), L = px[o];
    if ((kind !== 1 && kind !== 2) || !(L > -1e29)) continue;
    const ux = ((i + 0.5) * w / RIG_N - 0.5 * w) / h * fov, uy = ((j + 0.5) * h / RIG_N - 0.5 * h) / h * fov;
    const t = Math.pow(2, L) / Math.hypot(1, ux, uy);            // depth along the view axis
    pts.push([ux * t, uy * t, t, L]);
  }
  if (pts.length < 64 && !(alone && pts.length)) return facing(-1, 1);
  const Ls = pts.map(q => q[3]).sort((a, b) => a - b), near = Ls[Math.floor(0.05 * Ls.length)], far = Ls[Math.floor(0.95 * Ls.length)];
  if (pts.length < 64) return facing(near, far);
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
  if (!(Math.abs(det) > 1e-30)) return facing(near, far);
  const A = (suw*(svv*n - sv*sv) - suv*(svw*n - sv*sw) + su*(svw*sv - svv*sw)) / det;
  const B = (suu*(svw*n - sv*sw) - suw*(suv*n - sv*su) + su*(suv*sw - svw*su)) / det;
  const C = (suu*(svv*sw - sv*svw) - suv*(suv*sw - svw*su) + suw*(suv*sv - svv*su)) / det;
  const v = [0, 1, 2].map(k => -(A * right[k] + B * up[k] + C * fwd[k])), m = Math.hypot(...v) || 1;
  return { n: v.map(c => c / m), near, far };
}
/* measure now: blocks until the GPU has finished the march. For stills, thumbnails and exports,
   where the picture must not depend on timing. */
function measureRig(w, h, fwd, right, up, alone){
  rigBlit(w, h);
  gl.readPixels(0, 0, RIG_N, RIG_N, gl.RGBA, gl.FLOAT, rigPx);
  return fitRig(rigPx, w, h, fwd, right, up, alone);
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
              number = now, blended in by that fraction · 'alone' = now, and never the rig that
              was there (grep THE NEW LOOK). Absent = keep the rig as it stands.
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
    else trackRig(measureRig(S.W, S.H, S.fwd, S.right, S.up, S.rig === 'alone'), 1);
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
  gl.uniform1i(us.farLook, dzFarLook);
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
/* kick off the non-blocking deep-shader compile (sets deepProg/ud + __deepReady when done): THE RAY MARCH's
   program, key PR, the bulb's only one since 2026-10-11 (grep "deep program variants"). A build that fails
   leaves deepProg null for good: deepCompileErr says why and no other program is tried.
   The loading overlay appears ONLY if the compile is actually slow (>300 ms) — a cached refresh is
   near-instant and never flashes it. */
const loadTimer = setTimeout(() => {
  if (!deepReady && !deepCompileErr) { const l = dzById('loading'); if (l) l.style.display = 'flex'; }
}, 300);
{
  const key = rKey(false), t0 = performance.now();
  pendingBuild[key] = mkProgAsync(rSrc(false), (p, err) => {
    pendingBuild[key] = null;
    clearTimeout(loadTimer);
    const l = dzById('loading'); if (l) l.style.display = 'none';
    if (!p) { variantErr[key] = err; variants[key] = null; deepCompileErr = err; api.deepErr = err; api.deepReady = false; return; }
    deepProg = p; ud = makeUD(p); deepReady = true;
    compileMs[key] = performance.now() - t0;
    variants[key] = { p, x: ud };
    api.deepErr = ''; api.deepReady = true;
  });
}
/* pick the active deep program + its uniform set: the box's variant while the box is drawn, else the
   bulb's one program. Use this everywhere a deep draw is issued. */
function deepCtx(){
  if (boxOn()) return ensureBoxVariant(false) || { p: null, x: ud };   // THE FORMULA SEAM: one variant, whatever else is asked (a frame gets here only once it is built)
  return { p: deepProg, x: ud };                 // null until the ray march's program is built (and for good if it could not be)
}
compileMs.S = performance.now() - shadeT0;      // pass S, built at load (blocking — it is small)
api.compileMs = () => compileMs;
api.variantErr = () => ({ ...variantErr });                  // every variant that failed to build, by key (PR, PTR, X, XT)

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
  /* THE MANDELBOX map (grep THE FORMULA SEAM), one iteration in fixed point: multiplies and one divide.
     B = boxFixed(parameters). boxParts gives what the reference rows are made of: the rotated point u,
     the box-folded point w, |w|², which of the sphere fold's three regions that is (0 inside the min
     radius, 1 the inversion shell, 2 outside the fixed radius) and the fold's factor k. */
  const boxFixed = (p) => { const m2 = fromNum(p.m2), F2 = fromNum(p.F2);
    /* kA is DIVIDED here, not converted from the f64 quotient: the factor must be continuous across the min-radius
       sphere to the last bit, or a pixel that crosses it at depth gets a step wrong by 1e-16, far above its delta */
    return { S: fromNum(p.scale), L: fromNum(p.fold), m2, F2, kA: fdiv(F2, m2), R: p.hasRot ? p.R.map(r => r.map(fromNum)) : null }; };
  const boxParts = (v, B) => {
    const u = B.R ? B.R.map(r => mul(r[0], v[0]) + mul(r[1], v[1]) + mul(r[2], v[2])) : v;
    const w = u.map(x => x > B.L ? 2n * B.L - x : x < -B.L ? -2n * B.L - x : x);
    const r2 = mul(w[0], w[0]) + mul(w[1], w[1]) + mul(w[2], w[2]);
    const reg = r2 < B.m2 ? 0 : r2 < B.F2 ? 1 : 2;
    return { u, w, r2, reg, k: reg === 0 ? B.kA : reg === 1 ? fdiv(B.F2, r2) : ONE };
  };
  const boxStep = (q, c, B) => q.w.map((x, i) => mul(mul(x, q.k), B.S) + c[i]);     // q = boxParts(v, B)
  const norm2 = (v) => mul(v[0], v[0]) + mul(v[1], v[1]) + mul(v[2], v[2]);
  return { P, fromNum, toNum, P8, addV, SCALE, mul, boxFixed, boxParts, boxStep, norm2 };
}
const hp = makeHP(256);

/* ════════ THE FORMULA SEAM (2026-10-09) — a second formula, the Mandelbox ════════
   The renderer draws one of two formulas: 'mandelbulb' (the default; everything outside this seam is
   the page's, and with it selected the shader's active text, every uniform and every number are what
   they were) and 'mandelbox' - GMT's AmazingBox (engine-gmt/formulas/AmazingBox.ts) in Mandelbrot
   mode (z0 = c = the point):
       z <- R z                                   a constant pre-rotation (X, then Y, then Z)
       z <- clamp(z, -L, L) * 2 - z               box fold, L = the folding limit
       k  = clamp(fixedR² / |z|², 1, fixedR² / minR²) ;  z <- k z        sphere fold
       z <- scale * z + c ;   dr <- dr * k * |scale| + 1
   with the estimate (|z| - 1) / dr read where |z|² first passes BOX_ESC2. The scale may be NEGATIVE.
   WHAT IS THE SAME: the BigInt camera, a reference orbit rebuilt at the camera, a per-pixel delta as
   f32 mantissas with one exponent, the page's march and hit test, the normals, the G-buffer, shading,
   accumulation, export, the probes and the navigation's rays.
   WHAT IS ITS OWN: the map (hp.boxParts / boxStep), the orbit rows (buildBoxOrbit), the delta step
   (boxOrbitJS on the CPU, BOX_KERNEL on the GPU), and the three plain-f32 copies (grep USE_BOX).
   WHAT THE BOX DOES NOT USE, whatever was asked for: the ray march (USE_JET), the
   line-against-the-ball rule and the rebase to the origin - each is built on
   the triplex power. The asks are kept and apply again when the bulb is selected (grep boxOn).
   Why the folds need no approximation: both are continuous and piecewise smooth, so a pixel that
   stands on the other side of a fold surface from the reference is handled BY CASES, exactly, from the
   reference's own distance to that surface - and that distance is taken from the fixed-point orbit,
   so it is right however small it is. Checked on the CPU before any of this was written
   (debug/scratch/formula-study/dz-delta-check.mjs: f64 6e-15 against exact orbits at 1e-41).
   Pitfalls:
   - An escape radius of 10 (GMT's) leaves rings in the picture: the estimate jumps about a tenth
     between iteration bands there. 1000 does not (the CPU study's stills).
   - minR is held at or above 1e-4.5 (as GMT's sphereFold floors its square at 1e-9) and fixedR at or
     above minR: the three-region logic assumes that order.
   - This block and the CPU kernel further down are lifted as TEXT by the node checks
     (debug/deep-zoom-checks/ray-probe.mts, box-orbit.mts): nothing in them may touch gl, api or options.
   @invariant the box's per-pixel orbit on the CPU (boxOrbitJS, what `sense`, `freeDistance`,
   `estimateAt` and the probes' referee run) equals an exact fixed-point orbit of the same point, fold
   crossings included, shallow and deep, both signs of scale, with a pre-rotation - proven by: npm run
   check:deep-zoom-box-orbit ("twin = exact ..." lines). Falsified 2026-10-09: see that file's header. */
const BOX_ESC = 1000, BOX_ESC2 = BOX_ESC * BOX_ESC;
const BOX_REF_MAX2 = 1e14;                       // the reference orbit is kept this far past the escape radius, so a pixel can ride it to its own escape
let dzFormula = 'mandelbulb';
let formulaStamp = 0;                            // bumped by every change of formula or of its parameters: kept orbits and kept rays are keyed by it
const boxOn = () => dzFormula === 'mandelbox';
const box = { scale: 2, minR: 0.5, fold: 1, fixedR: 1, rot: [0, 0, 0] };
/* the pre-rotation as one matrix (rows), from the formula's three mat2 steps: X on (y, z), Y on (x, z), Z on (x, y) */
function boxRotMat(r){
  const sx = Math.sin(r[0]), cx = Math.cos(r[0]), sy = Math.sin(r[1]), cy = Math.cos(r[1]), sz = Math.sin(r[2]), cz = Math.cos(r[2]);
  const X = [[1, 0, 0], [0, cx, sx], [0, -sx, cx]], Y = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]], Z = [[cz, sz, 0], [-sz, cz, 0], [0, 0, 1]];
  const mm = (A, B) => A.map(a => [0, 1, 2].map(j => a[0] * B[0][j] + a[1] * B[1][j] + a[2] * B[2][j]));
  return mm(Z, mm(Y, X));
}
/* what the map is computed from: the parameters as numbers, their squares, the matrix, and the fixed-point copies */
function boxDerive(){
  const m2 = box.minR * box.minR, F2 = box.fixedR * box.fixedR, hasRot = Math.hypot(box.rot[0], box.rot[1], box.rot[2]) > 0.001;   // GMT's own threshold
  const p = { scale: box.scale, fold: box.fold, m2, F2, kA: F2 / m2, hasRot, R: boxRotMat(hasRot ? box.rot : [0, 0, 0]) };
  p.fixed = hp.boxFixed(p);
  return p;
}
let boxP = boxDerive();
/* Set the formula. params (all optional, the box only): scale (|scale| held at or above 1.02: at 1 the
   orbit of every point is bounded and there is no surface), minR, fold, fixedR, rot [x, y, z] in radians.
   Returns true when anything changed. Pure state: the caller restarts the orbit and the still. */
function applyFormula(kind, params){
  const was = JSON.stringify([dzFormula, box]);
  dzFormula = kind === 'mandelbox' ? 'mandelbox' : 'mandelbulb';
  const q = params || {}, num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  let s = num(q.scale, box.scale); if (Math.abs(s) < 1.02) s = s < 0 ? -1.02 : 1.02;
  box.scale = Math.max(-8, Math.min(8, s));
  box.minR = Math.max(3.1623e-5, Math.min(8, num(q.minR, box.minR)));
  box.fold = Math.max(1e-3, Math.min(8, num(q.fold, box.fold)));
  box.fixedR = Math.max(box.minR, Math.min(8, num(q.fixedR, box.fixedR)));
  if (Array.isArray(q.rot)) box.rot = [0, 1, 2].map(i => num(q.rot[i], 0));
  if (JSON.stringify([dzFormula, box]) === was) return false;
  boxP = boxDerive(); formulaStamp++;
  return true;
}
/* boxExtent: a radius about the origin that holds the whole box. The set lies in the cube
   |x| <= 2 L (|s| + 1) / (|s| - 1) for a positive scale (the classic bound; for a negative scale it is smaller).
   boxFar: the distance from the CAMERA beyond which a ray has left the box for good. */
function boxExtent(){
  const aS = Math.abs(box.scale);
  return 1.8 * (2 * box.fold * (aS + 1) / (aS - 1) + box.fixedR);
}
function boxFar(){
  return Math.hypot(hp.toNum(camHP[0]), hp.toNum(camHP[1]), hp.toNum(camHP[2])) + boxExtent();
}
/* The box's reference orbit at the camera, and its rows (grep BOX_KERNEL for how the shader reads them):
     row 0   V (xyz), |V|                                  as the bulb's row 0
     row 1   W = the box-folded, rotated V (xyz), |W|²
     rows 2-4  one axis each: U - L and U + L, U = the rotated V - the distances to the two fold planes
     row 5   |W|² - minR² and |W|² - fixedR² - the distances to the two fold spheres
   Each of the eight distances is a mantissa and an exponent (hdrSplit), taken from the FIXED-POINT
   difference: a crossing test compares a pixel's delta with it, and at depth a delta is 1e-50. As a
   plain f32 a distance under 1e-38 would read 0 and lose its sign.
   The same numbers in f64 (GH, GL, Wf, R2, GM, GF, REG) are what the CPU kernel reads; Rk and DRk are
   the reference's own radius and derivative, for the estimate at the camera. */
function buildBoxOrbit(CHP, lenMax) {
  const p = boxP, B = p.fixed, Vs = [], Qs = [];
  let v = CHP.slice();
  for (let k = 0; k < lenMax; k++) {
    const q = hp.boxParts(v, B);
    Vs.push(v); Qs.push(q);
    if (k > 0 && hp.toNum(hp.norm2(v)) > BOX_REF_MAX2) break;   // never one entry alone: a step needs the index after it, however far out the camera is
    v = hp.boxStep(q, CHP, B);
  }
  const len = Vs.length, rows = 6, data = new Float32Array(len * rows * 4), A = () => new Float64Array(len);
  const O = { box: p, len, rows, data, Vf: [], Wf: [], Rk: [], DRk: [], GH: [A(), A(), A()], GL: [A(), A(), A()], R2: A(), GM: A(), GF: A(), REG: new Int8Array(len) };
  const put = (row, k, vals) => { for (let j = 0; j < 4; j++) data[(row * len + k) * 4 + j] = vals[j]; };
  let DR = 1;
  for (let k = 0; k < len; k++) {
    const q = Qs[k], vf = Vs[k].map(hp.toNum), wf = q.w.map(hp.toNum), R = Math.hypot(vf[0], vf[1], vf[2]);
    O.Vf.push(vf); O.Wf.push(wf); O.Rk.push(R); O.DRk.push(DR);
    O.R2[k] = hp.toNum(q.r2); O.GM[k] = hp.toNum(q.r2 - B.m2); O.GF[k] = hp.toNum(q.r2 - B.F2); O.REG[k] = q.reg;
    put(0, k, [vf[0], vf[1], vf[2], R]);
    put(1, k, [wf[0], wf[1], wf[2], O.R2[k]]);
    for (let a = 0; a < 3; a++) {
      O.GH[a][k] = hp.toNum(q.u[a] - B.L); O.GL[a][k] = hp.toNum(q.u[a] + B.L);
      const h = hdrSplit(O.GH[a][k]), l = hdrSplit(O.GL[a][k]);
      put(2 + a, k, [h.m, h.e, l.m, l.e]);
    }
    const gm = hdrSplit(O.GM[k]), gf = hdrSplit(O.GF[k]);
    put(5, k, [gm.m, gm.e, gf.m, gf.e]);
    DR = DR * hp.toNum(q.k) * Math.abs(p.scale) + 1;
  }
  return O;
}

function hdrSplit(v) {
  if (v === 0 || !isFinite(v)) return { m: 0, e: 0 };
  const e = Math.floor(Math.log2(Math.abs(v)));
  return { m: Math.fround(v * Math.pow(2, -e)), e };
}

/* Build the reference orbit AT the camera (BigInt), pack the 4-row texture +
   f64 metadata for the CPU gate. Stops past escape (R>100) — exhaustion wrap
   in the kernel covers pixels needing more iterations. */
function buildRefOrbit(CHP, lenMax) {
  if (boxOn()) return buildBoxOrbit(CHP, lenMax);            // THE FORMULA SEAM: the orbit carries its formula from here on (O.box)
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
/* ════════ uniforms set before each deep draw, and the orbit texture ════════
   The skip table (BLA: its CPU build, its texture, its mode and its 'auto' rule) sat here until 2026-10-11.
   debug/deep-zoom-checks/ray-probe.mts and box-orbit.mts lift this file's text from makeHP to THIS banner:
   keep it the first thing after buildRefOrbit. */
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
  gl.uniform1i(x.farLook, dzFarLook);
  gl.uniform1i(x.rebaseOrigin, rebaseOrigin);
  gl.uniform1f(x.farSwitch, farHandOff);
  gl.uniform1f(x.lookLevel, normalDetail > 0 ? Math.max(1, detailNow() / normalDetail) : 1);   // THE LOOK LEVEL: how many times coarser than the hit level the normal's level is
  gl.uniform1i(x.rayUse, rayUse); gl.uniform1f(x.rayFactor, rayFactor);    // THE RAY ESTIMATE; null in a variant without USE_JET: no-ops
  gl.uniform1f(x.rayHit, detailNow() / rayHitDiv); gl.uniform1f(x.rayTol, rayTol * detailNow());   // both as multiples of uPixAng, which is a display pixel ÷ detail
  gl.uniform1f(x.rayFloor, rayFloorDiv > 0 ? detailNow() / rayFloorDiv : 0);
  { const cl = Math.hypot(cam.pos[0], cam.pos[1], cam.pos[2]); let rho = 2;       // THE LINE AGAINST THE BALL: rho^n - |c| = rho, from above
    for (let i = 0; i < 80; i++) rho = Math.pow(rho + cl, 1 / nPower);
    gl.uniform1f(x.rayLine, rayLine); gl.uniform1f(x.rayBall, rho * 1.0001); }
  gl.uniform1i(x.maxSteps, march.maxSteps);
  if (boxOn()) setBoxUniforms(x);                // THE FORMULA SEAM: nothing is set here for the bulb that was not set before
  gl.uniform2f(x.farRelax, march.farRelax, march.farSpan);
  { const d = Math.max(smoothedDist, 1e-300), e = Math.floor(Math.log2(d));     // FAR RELAX reads depth against uRefE, in the probes too (drawDeep sets both again for a picture)
    gl.uniform1f(x.refE, e); gl.uniform1f(x.farFrom, Math.log2(march.farFromDist * d) - e); }
}
let orbitTex = null;
function uploadOrbit(O) {
  if (orbitTex) gl.deleteTexture(orbitTex);
  orbitTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, orbitTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, O.len, O.rows || 4, 0, gl.RGBA, gl.FLOAT, O.data);   // the box's orbit has six rows (buildBoxOrbit)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

/* ════════ Gradient palette loading ════════
   Drop in a gradient and it replaces the built-in cosine palette for the iteration /
   orbit-trap colour modes. Easiest correct path: a PNG (any size) — the top row of
   pixels is resampled to a 256-wide strip; or a text .map / palette (one "R G B" per
   line, 0–255 or 0–1). Texture lives on unit 2 (0 = the orbit; 1 was the skip table's and is free). */
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
/* A HOST'S GRADIENT (added 2026-10-09; the page has no such call): one row of RGBA texels straight
   to the strip, at once. Unlike a loaded FILE it leaves the colour mode alone — a host owns that
   and sets it with setColor. The texels are used as they are, as the surface's albedo before the
   light and the tone map (grep albedoNew), so a host hands them over already linear. */
api.setGradientTexels = (rgba, w) => {
  const a = rgba instanceof Uint8Array ? rgba : new Uint8Array(rgba);
  const keep = colorMode;
  uploadStrip(a, w || (a.length >> 2));
  colorMode = keep;
};

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
/* THE MANDELBOX's per-pixel orbit on the CPU (grep THE FORMULA SEAM): what pertOrbitJS is for the bulb, and
   reached through it - an orbit built for the box carries O.box. The reference iterate V, the pixel V + d.
   One iteration of the delta, in the order of the map:
     rotation     d <- R d                                 (linear: exact)
     box fold     per axis, the clamp's difference cd by which side of -L / +L the reference (rr) and the
                  pixel (pr) stand on, from the reference's distances gh = U - L, gl = U + L:  e = 2 cd - d
     sphere fold  W = the folded reference, q = 2 W.e + |e|² (so the pixel's |w|² is r2 + q); the factor
                  k' by the pixel's region, and k' - k by the two regions, from the reference's distances
                  gm = r2 - minR², gF = r2 - fixedR²
     step         d' = scale ( k' e + (k' - k) W ) + dc
     derivative   dr' = dr k' |scale| + 1                  (the pixel's own: no delta form is needed)
   No difference of two nearly equal numbers is ever formed, so a delta of 1e-58 keeps its 16 digits.
   boxFoldJS is one axis of the box fold; L2 = 2 L. */
function boxFoldJS(gh, gl, d, L2){
  const ph = gh + d, pl = gl + d, rr = gh > 0 ? 1 : gl < 0 ? -1 : 0, pr = ph > 0 ? 1 : pl < 0 ? -1 : 0;
  const cd = rr === 0 ? (pr === 0 ? d : pr === 1 ? -gh : -gl) : rr === 1 ? (pr === 1 ? 0 : pr === 0 ? ph : -L2) : (pr === -1 ? 0 : pr === 0 ? pl : L2);
  return 2 * cd - d;
}
function boxOrbitJS(O, dc, maxIter, fixed){
  const p = O.box, S = p.scale, aS = Math.abs(S), m2 = p.m2, F2 = p.F2, kA = p.kA, L2 = 2 * p.fold, R = p.hasRot ? p.R : null;
  const V0 = O.Vf[0], GH = O.GH, GL = O.GL;
  let dx = dc[0], dy = dc[1], dz = dc[2], m = 0, it = 0, dr = 1, escaped = false, trap2 = Infinity;
  let zx = V0[0] + dx, zy = V0[1] + dy, zz = V0[2] + dz;
  while (it < maxIter) {
    if (R) { const a = R[0][0]*dx + R[0][1]*dy + R[0][2]*dz, b = R[1][0]*dx + R[1][1]*dy + R[1][2]*dz, c = R[2][0]*dx + R[2][1]*dy + R[2][2]*dz; dx = a; dy = b; dz = c; }
    const ex = boxFoldJS(GH[0][m], GL[0][m], dx, L2), ey = boxFoldJS(GH[1][m], GL[1][m], dy, L2), ez = boxFoldJS(GH[2][m], GL[2][m], dz, L2);
    const W = O.Wf[m], r2 = O.R2[m], gm = O.GM[m], gF = O.GF[m], reg = O.REG[m];
    const q = 2 * (W[0]*ex + W[1]*ey + W[2]*ez) + ex*ex + ey*ey + ez*ez, r2p = r2 + q, pm = gm + q, pF = gF + q;
    const pr = pm < 0 ? 0 : pF < 0 ? 1 : 2, kp = pr === 0 ? kA : pr === 1 ? F2 / r2p : 1;
    let dk;
    if (reg === pr) dk = pr === 1 ? -F2 * q / (r2 * r2p) : 0;
    else if (reg === 0) dk = pr === 1 ? -F2 * pm / (r2p * m2) : 1 - kA;
    else if (reg === 1) dk = pr === 0 ? F2 * gm / (m2 * r2) : gF / r2;
    else dk = pr === 1 ? -pF / r2p : kA - 1;
    dx = S * (kp * ex + dk * W[0]) + dc[0]; dy = S * (kp * ey + dk * W[1]) + dc[1]; dz = S * (kp * ez + dk * W[2]) + dc[2];
    dr = dr * kp * aS + 1; m++; it++;
    const V = O.Vf[m];
    zx = V[0] + dx; zy = V[1] + dy; zz = V[2] + dz;
    const z2 = zx*zx + zy*zy + zz*zz;
    if (z2 < trap2) trap2 = z2;
    if (!fixed && z2 > BOX_ESC2) { escaped = true; break; }
    if (z2 < dx*dx + dy*dy + dz*dz || m >= O.len - 1) { dx = zx - V0[0]; dy = zy - V0[1]; dz = zz - V0[2]; m = 0; }   // the page's rebase: onto the reference's first point
  }
  const r = Math.hypot(zx, zy, zz);
  return { de: (r - 1) / dr, escaped, r, it, dr, trap: Math.sqrt(trap2), z: [zx, zy, zz] };
}
function pertOrbitJS(O, dc, maxIter, fixed){     // fixed: run exactly maxIter iterations, no escape test (neighbours that must stop together)
  if (O.box) return boxOrbitJS(O, dc, maxIter, fixed);
  let d=dc.slice(), Ddr=0, m=0, escaped=false, it=0;
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
    it=k+1;
    if(!fixed && dot3(z,z)>4){ escaped=true; break; }
    if(dot3(z,z)<dot3(d,d) || m>=O.len-1){ d=sub3(z,O.Vf[0]); Ddr=(O.DRk[m]-1)+Ddr; m=0; }
  }
  const V=O.Vf[m], R=O.Rk[m];
  const q=2*dot3(V,d)+dot3(d,d), r2=Math.sqrt(Math.max(R*R+q,1e-300));
  return { de: 0.5*r2*Math.log(Math.max(r2,1e-300))/(O.DRk[m]+Ddr), escaped, r: r2, it };
}

/* ════════ THE FREE DISTANCE ALONG A RAY (2026-10-09) — what a host's navigation flies by ════════
   The fly speed used to follow the distance estimate at the camera itself (grep "distance probe"). That number is
   wrong for flying in two ways, both measured on the kept places (the study and its logs: H:/tmp/dz-nav-study):
     - it is the nearest surface in ANY direction. At the power-4 "3e-76" view that surface is behind the camera and
       everything in the picture is 18 to 22 decades farther, so the speed stays a million times too slow for the
       scene after 30 s of flying towards it;
     - it is the distance to the true fractal, not to the solid that is DRAWN (limited iterations). Next to the drawn
       surface it can read 20 times the free distance: at the power-2 5e-20 place W at the default speed put the
       camera inside the solid in 4 s.
   So navigation asks a different question: how far is it free ALONG A RAY, from the camera as it is now, to the solid
   as it is drawn. The answer is a march on the CPU in f64, on the same reference orbit and kernel maths as the
   referee above:
     step  half of the larger of two first-order estimates, and never more than 8 scalar estimates:
             - THE RAY ESTIMATE (grep it): 0.5 r ln r / |J rd|, the escaping iterate's speed along the ray, carried
               with the orbit as one vector (pertOrbitJetJS). The study measured it safe at a whole estimate; a
               scalar-estimate step at 0.3 once reached 0.82 of the free distance.
             - the TRUE-GRADIENT estimate (grep it; here by one pass back over the orbit, pullGradJS):
               0.5 r ln r / |grad|, grad = how fast the escaping RADIUS changes with the point.
           Both are at most the distance along the ray to the level's tangent plane, 0.5 r ln r / |grad . rd|
           (|J rd| >= |z^ . J rd| = |grad . rd|, and |grad| >= |grad . rd|), so the larger is as safe to first order as
           either. They fail apart. The gradient's is a ball: a ray running ALONG a wall creeps by it (615 steps where
           the ray estimate takes 40). The ray estimate counts the iterate's swing ROUND the pole axis as speed: with
           a theta phase the triplex power is discontinuous on that axis, a point 3e-5 off it swings a full turn in
           6e-5, and nothing gets nearer the surface. At the owner's power-9 place on the axis (theta phase -1.552,
           2026-10-09, "going extremely slowly") it read 5.7e-7 sideways where the solid is 0.53 away and 7.9e-5
           ahead where it is 2.3e-4 away, in 165 to 340 steps a ray; the larger of the two reads 0.38 and 1.9e-4
           in 67 and 12. At the starter views the two rules agree within 3 %, the larger in fewer steps.
     end   the scalar estimate under tol x t (a hit, to a share tol of its distance), or the ray estimate under an
           eighth of that (a ray creeping along a surface); or a sample INSIDE the drawn solid - the last step is then
           halved back onto the boundary, so the answer is the drawn surface and not the estimate's idea of it; or
           SENSE_FAR, or out of steps: "open", and t is then how far the ray was followed - a LOWER bound.
   Rays come as a BUNDLE about an axis (the view axis: what is looked at; a move's direction: what lies ahead of it):
   the axis and six rays SENSE_ANGLE off it. "near" (the nearest) is what one frame's move must stay inside; "second"
   (the second nearest) is what the speed follows - one stray ray, or a hole one ray wide, cannot set it.
   A bundle is KEPT per slot: asked again for the same axis with the camera moved less than a twentieth of its nearest
   ray, it is not marched again - every ray is taken as shorter by the whole distance moved, which can only under-read.
   A ray has a step budget a call (64): one that runs out is "open" at a lower bound, and goes on from there the next
   time the bundle is asked for with the camera where it stood. (A camera hugging a wall and looking away needs about
   300 steps a ray: five asks, not one long one.)
   Nothing here draws, reads the GPU or changes the camera. Proof: npm run check:deep-zoom-ray-probe (node). */
const SENSE_ANGLE = 0.0735;                      // radians (4.2 degrees): how far off the axis the six outer rays stand
const SENSE_FAR = 8;                             // a ray this far from the camera has left the bulb: "open"
const senseFar = () => (boxOn() ? boxFar() : SENSE_FAR);   // the box is larger, and its size follows its scale (grep THE FORMULA SEAM)
/* the triplex power's derivative at the full point z, applied to the direction j, plus the + c term's own (v) */
function pushJetJS(z, j, v){
  const NP=nPower, x=z[0], y=z[1], zz=z[2];
  const rho2=Math.max(x*x+y*y,1e-300), rho=Math.sqrt(rho2), r2=rho2+zz*zz, r=Math.sqrt(r2);
  const th=Math.acos(Math.max(-1,Math.min(1,zz/r))), ph=Math.atan2(y,x);
  const rn1=Math.pow(r,NP-1), rn=rn1*r;
  const a=NP*th+phaseTheta, b=NP*ph+phasePhi, sa=Math.sin(a), ca=Math.cos(a), sb=Math.sin(b), cb=Math.cos(b);
  const rd=(x*j[0]+y*j[1]+zz*j[2])/r, thd=(zz*(x*j[0]+y*j[1])/rho-rho*j[2])/r2, phd=(x*j[1]-y*j[0])/rho2;
  const A=NP*rn1*rd, B=rn*NP*thd, C=rn*NP*phd*sa;
  return [A*sa*cb+B*ca*cb-C*sb+v[0], A*sa*sb+B*ca*sb+C*cb+v[1], A*ca-B*sa+v[2]];
}
/* TRUE-GRADIENT ESTIMATE (2026-10-08): what it is, and what is left of it.
   The distance estimate is  de = 0.5·r·ln r / dr  with dr the SCALAR running derivative dr' = n·r^(n−1)·dr + 1.
   That recurrence takes n·r^(n−1) for the stretch of one triplex power step. It is the stretch along r and along
   the polar angle; around the azimuth the step stretches by n·r^(n−1)·sin(nθ)/sin θ, up to n times more. So dr can
   UNDER-count how fast r really changes with c, and de then OVER-reads the distance: measured in f64, the estimate
   falls 1.9 to 3.3 times faster than the distance travelled at the owner's power-2 place (5e-20) and 1.6 to 3 times
   at his 2.8e-39 place (about 0.5 in ordinary views) - which is exactly why those places needed a step of 0.2 to
   0.4 instead of 0.85 under the page's march.
   With J = ∂z/∂c, the real 3×3 derivative,
       J' = n·r^(n−1)·( E_r·e_rᵀ + E_θ·e_θᵀ + κ·E_φ·e_φᵀ )·J + I ,   κ = sin(nθ)/sin θ ,
   (e = the unit frame of z's spherical angles, E = the frame of the output angles nθ, nφ) the gradient of the
   escaping radius is ∇c|z| = Jᵀ·ẑ, and
       gde = 0.5·r·ln r / |∇c|z||          is the estimate with the true gradient in dr's place.
   WHAT IS LEFT (2026-10-11): the CPU form below. pullGradJS applies Jᵀ one step back, pertOrbitJetJS walks it back
   over the orbit (its `grad` and `G`), and the navigation's rays step by the larger of G and the ray estimate
   (grep THE FREE DISTANCE ALONG A RAY for why the two fail apart).
   WHAT WENT THAT DAY, the ray march having been the default since 2026-10-09: the GPU form - a shader variant
   (USE_JAC; keys PJ, PBJ, PTJ) that carried Jᵀ with every orbit, api.setJacobian (bits: 1 = the march steps by
   min(de, gde), 2 = the normal is the gradient, 4 = the hit test by min(de, gde) too), its referees
   (api.jacProbeAt, api.jacCheck, probe 8) and normal mode 4, the hit orbit's own gradient as the surface normal.
   The owner: "Normals: Gradient - was superseded by the raymarch too". Under the ray march none of it could be
   drawn (the variant was never built beside the ray variant). For whoever thinks of it next, what it measured
   under the page's march: at Detail 8 the default step put 1 to 12 % of an ordinary view's rays on a wrong
   surface, the true-gradient step 0.3 to 2.2 %, for 1.1 to 2.0 times the picture time (halving the step: 1.45
   to 1.9); its variant took 19 s to build, 36 s with BLA; and gde alone is NOT safe to step by - it spikes
   where the gradient vanishes, which is why the step was min(de, gde). */
/* the TRANSPOSE of that derivative at z, applied to w: one step back of the gradient of |z_k| (TRUE-GRADIENT ESTIMATE) */
function pullGradJS(z, w){
  const NP=nPower, x=z[0], y=z[1], zz=z[2];
  const rho2=Math.max(x*x+y*y,1e-300), rho=Math.sqrt(rho2), r2=rho2+zz*zz, r=Math.sqrt(r2);
  const th=Math.acos(Math.max(-1,Math.min(1,zz/r))), ph=Math.atan2(y,x);
  const a=NP*th+phaseTheta, b=NP*ph+phasePhi, sa=Math.sin(a), ca=Math.cos(a), sb=Math.sin(b), cb=Math.cos(b);
  const wr=sa*cb*w[0]+sa*sb*w[1]+ca*w[2], wt=ca*cb*w[0]+ca*sb*w[1]-sa*w[2], wp=-sb*w[0]+cb*w[1];
  const k=NP*Math.pow(r,NP-1), kp=k*wp*sa*r/rho2;
  return [k*(wr*x/r+wt*zz*x/(rho*r))-kp*y, k*(wr*y/r+wt*zz*y/(rho*r))+kp*x, k*(wr*zz/r-wt*rho/r)];
}
/* pertOrbitJS with one vector more: jet = d z_k / d t for the point dc + t rd (z_0 = c, so it starts as rd).
   E is THE RAY ESTIMATE at the iterate the orbit ended on; grad is the gradient of that iterate's radius with the
   point (one pass back over the iterates), G the estimate by it; ray is the larger of E and G - what a ray steps by.
   fixed: exactly maxIter iterations, no escape test. */
function pertOrbitJetJS(O, dc, rd, maxIter, fixed){
  if (O.box) {
    /* THE FORMULA SEAM: the box carries no jet. Its map stretches space alike on all three axes (widest over
       narrowest 1.2 to 1.8 from 1e-3 to 1e-40, the bulb's 40 to 100: debug/scratch/formula-study/dz-shape-check.mjs),
       so the ray estimate says what the scalar one says, and a ray steps by the scalar estimate. */
    const o = boxOrbitJS(O, dc, maxIter, fixed);
    return { de: o.de, escaped: o.escaped, r: o.r, it: o.it, z: o.z, jet: [0,0,0], E: o.de, grad: [0,0,0], G: o.de, ray: o.de };
  }
  let d=dc.slice(), Ddr=0, m=0, escaped=false, it=0, jet=rd.slice(), z=add3(O.Vf[0],d); const zs=[];
  for(let k=0;k<maxIter;k++){
    const V=O.Vf[m], R=O.Rk[m];
    const q=2*dot3(V,d)+dot3(d,d), r2=Math.sqrt(Math.max(R*R+q,0)), Dr=q/(r2+R);
    const u=Dr/R, Rp=Math.pow(R,nPower-1);
    const Dp=Rp*powm1N(u,nPower-1);
    Ddr=nPower*(Dp*O.DRk[m]+(Rp+Dp)*Ddr);
    jet=pushJetJS(z,jet,rd);
    zs.push(z);
    d=add3(stableDeltaJS(V,d),dc);
    m++;
    z=add3(O.Vf[m],d);
    it=k+1;
    const z2=dot3(z,z);
    if(!fixed && z2>4){ escaped=true; break; }
    if(z2<dot3(d,d) || m>=O.len-1){ d=sub3(z,O.Vf[0]); Ddr=(O.DRk[m]-1)+Ddr; m=0; }
  }
  const r=len3(z), g=0.5*r*Math.log(Math.max(r,1e-300)), speed=len3(jet), de=g/(O.DRk[m]+Ddr);
  let w=r>0 ? [z[0]/r,z[1]/r,z[2]/r] : [0,0,0], grad=[0,0,0];
  for(let k=zs.length-1;k>=0;k--){ grad=add3(grad,w); w=pullGradJS(zs[k],w); }    // z_(k+1) = f(z_k) + c, z_0 = c
  grad=add3(grad,w);
  const slope=len3(grad), E=speed>0 ? g/speed : de, G=slope>0 ? g/slope : de;
  return { de, escaped, r, it, z, jet, E, grad, G, ray: Math.max(E, G) };
}
/* one ray from the camera: { t, prev, kind, steps }, kind 1 = met the drawn solid at t, 0 = open (t is a lower bound;
   prev is the last sample known to be outside), 2 = the camera itself is inside the drawn solid (t = 0).
   t0 / prev0: go on from where an open ray stopped (the camera not having moved since). */
function rayFreeJS(O, rd, maxIter, tol, maxSteps, t0, prev0){
  let t=t0>0?t0:0, tPrev=prev0>0?prev0:0, steps=0; const far=senseFar();
  for(; steps<maxSteps; steps++){
    const o=pertOrbitJetJS(O, scl3(rd,t), rd, maxIter);
    if(!o.escaped || !(o.de>0)){
      if(t===0) return { t:0, prev:0, kind:2, steps };
      let lo=tPrev, hi=t;                           // lo: the last sample outside; hi: this one, inside
      for(let b=0; b<40 && (hi-lo)>tol*0.25*hi; b++){
        const tm=0.5*(lo+hi), om=pertOrbitJS(O, scl3(rd,tm), maxIter); steps++;
        if(!om.escaped || !(om.de>0)) hi=tm; else lo=tm;
      }
      return { t:lo, prev:lo, kind:1, steps };
    }
    if(t>0 && (o.de<tol*t || o.ray<tol*0.125*t)) return { t, prev:t, kind:1, steps };
    if(t>far) return { t, prev:t, kind:0, steps };
    tPrev=t;
    t+=Math.max(Math.min(o.ray,8*o.de)*0.5, t*1e-7);
  }
  return { t, prev:tPrev, kind:0, steps };
}
/* the reference orbit a probe marches on: the frame's own while it stands at the camera, else one built here (the
   camera was moved since the last frame, the deep shader is still compiling, or the iteration count changed) */
let senseO = null, senseKey = null;
function probeOrbit(){
  if (deepActive && curOrbit && !orbitDirty) return curOrbit;
  const key = [camHP[0], camHP[1], camHP[2], cam.iters, nPower, phaseTheta, phasePhi, formulaStamp];
  if (!senseO || !senseKey || key.some((v, i) => v !== senseKey[i])) { senseO = buildRefOrbit(camHP, cam.iters + 2); senseKey = key; }
  return senseO;
}
const unit3 = (v) => { const l = len3(v) || 1; return [v[0]/l, v[1]/l, v[2]/l]; };
const cross3 = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
/* the axis and six directions SENSE_ANGLE off it, evenly around */
function senseDirs(axis){
  const e1 = unit3(cross3(axis, Math.abs(axis[1]) < 0.9 ? [0,1,0] : [1,0,0])), e2 = cross3(axis, e1);
  const c = Math.cos(SENSE_ANGLE), s = Math.sin(SENSE_ANGLE), out = [axis];
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, ca = Math.cos(a) * s, sa = Math.sin(a) * s;
    out.push(unit3([c*axis[0]+ca*e1[0]+sa*e2[0], c*axis[1]+ca*e1[1]+sa*e2[1], c*axis[2]+ca*e1[2]+sa*e2[2]])); }
  return out;
}
const senseKept = {};                            // slot -> the last bundle really marched, and where the camera stood
/* open: rays that ran out of steps short of SENSE_FAR - their distance is a lower bound, and they go on when asked again */
const senseRead = (rays) => { const ts = rays.map(r => r.t).sort((a, b) => a - b), far = senseFar();
  return { near: ts[0], second: ts[1], hits: rays.filter(r => r.kind === 1).length, open: rays.filter(r => r.kind === 0 && r.t <= far).length,
    inside: rays.some(r => r.kind === 2) }; };
function senseBundle(axis, opt){
  const o = opt || {}, tol = o.tol > 0 ? +o.tol : 0.05, maxSteps = o.maxSteps > 0 ? (o.maxSteps|0) : 64, reuse = o.reuse >= 0 ? +o.reuse : 0.05;
  const ax = axis ? unit3(axis) : basis().fwd, slot = typeof o.slot === 'string' ? o.slot : '', k = slot ? senseKept[slot] : null;
  if (k && reuse > 0 && k.iters === cam.iters && k.power === nPower && k.pt === phaseTheta && k.pp === phasePhi && k.fs === formulaStamp
      && Math.abs(k.ax[0]-ax[0]) + Math.abs(k.ax[1]-ax[1]) + Math.abs(k.ax[2]-ax[2]) < 1e-9) {
    const moved = Math.hypot(hp.toNum(camHP[0]-k.cam[0]), hp.toNum(camHP[1]-k.cam[1]), hp.toNum(camHP[2]-k.cam[2]));
    if (moved === 0) {
      /* the camera stands where it stood: a ray that ran out of steps goes on from where it stopped, so a still
         view is read to the end however many decades away it is (the power-4 place needs about 300 steps a ray) */
      const open = k.rays.filter(r => r.kind === 0 && r.t <= senseFar());
      if (open.length === 0) return { near: k.near, second: k.second, hits: k.hits, open: 0, inside: k.inside, marched: false };
      const O = probeOrbit();
      for (const r of open) { const g = rayFreeJS(O, r.rd, cam.iters, tol, maxSteps, r.t, r.prev); r.t = g.t; r.prev = g.prev; r.kind = g.kind; }
      Object.assign(k, senseRead(k.rays));
      return { near: k.near, second: k.second, hits: k.hits, open: k.open, inside: k.inside, marched: true };
    }
    if (moved <= reuse * k.near) return { near: k.near - moved, second: k.second - moved, hits: k.hits, open: k.open, inside: k.inside, marched: false };
  }
  const O = probeOrbit();
  const rays = senseDirs(ax).map(rd => { const g = rayFreeJS(O, rd, cam.iters, tol, maxSteps); return { rd, t: g.t, prev: g.prev, kind: g.kind }; });
  const res = senseRead(rays);
  if (slot) senseKept[slot] = { ...res, rays, ax, cam: camHP.slice(), iters: cam.iters, power: nPower, pt: phaseTheta, pp: phasePhi, fs: formulaStamp };   // res carries near, second, hits, open, inside
  return { ...res, marched: true };
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
  setPowerUniforms(x);
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
const cam = { pos:[0,0,2.6], yaw:-Math.PI/2, pitch:0, roll:0, power:8, iters:14, baseSpeed:0.06 };
let camHP = cam.pos.map(hp.fromNum);            // [DS-SEAM] authoritative position
let smoothedDist = 1.0;
let snapDist = false;                          // set by dz.setView: the next frame takes the raw distance, no easing (2026-10-08)
let modeOverride = options.mode === 'deep' || options.mode === 'f32' ? options.mode : 'auto';   // 'auto' | 'deep' | 'f32' (options.mode: where a host starts it; the page starts on 'auto')
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
let rebaseOrigin = options.rebaseOrigin === true ? 1 : 0;   // 1 = the kernel rebases onto the origin (grep REBASE TO THE ORIGIN); 0 = the page
const farClamp = (t) => Math.max(1e-3, Math.min(12, +t || 1e-3));
let farHandOff = farClamp(options.farHandOff);  // where the deep march hands a ray to the f32 far-field march (grep FAR HAND-OFF); the page: 1e-3
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
let normalDetail = 0;                           // THE LOOK LEVEL (grep; api.setNormalDetail): the detail the NORMAL is taken at; 0 = the same as the detail setting, the page
/* THE RAY ESTIMATE's own detail (grep it): rayDetail > 0 fixes the hit level at a display pixel ÷ rayDetail while the
   ray march is on, whatever the detail setting says. DEFAULT 0 = follow the detail setting. It was 32 for some hours
   on 2026-10-09, on the reasoning that a fine level is cheap under the ray march (a 640 x 640 picture, mean of 11
   views, RTX 5070 Ti: Detail 8 / 16 / 64 = 15.9 / 18.2 / 20.7 ms, where the page's march goes 13.5 / 16.1 / 22.0).
   Cheap it is; right it was not - the owner, having flown it: "detail 32 seems too much in many instances, where it
   just makes the surface very rough". Detail does TWO things at once: it says how close a ray stops (pixel ÷ detail)
   and, through the same number, how far apart the normal's taps stand (2 pixels ÷ detail). The first is geometry,
   the second is the look, and one fixed number cannot serve both. */
const detailNow = () => (rayUse && rayDetail > 0 ? rayDetail : surfMul);
                                                // higher = sharper/less blobby (more march+bisection cost)
let gateOn = true;                              // key V: live ground-truth gate (1×1 readPixels sync, 2×/s)
let lightMode = 0, falloffMul = 4.0;            // key L: 0 directional / 1 headlamp / 2 both; T/Y falloff
const keys = {};
/* test harnesses lock input: their headed Chrome window takes focus, and a key typed for some
   other app would otherwise fly the camera mid-measurement (seen: a stray 'S' moved it 0.57). */
let inputLocked = false;
/* HOST INPUT (2026-10-08). 'module': the page's own keys and captured-mouse look fly the camera.
   'host': the module reads no key and no mouse; a host moves it with api.moveAlong and turns it
   with api.dz.setYawPitch or, roll included, api.dz.setOrientation. The distance probe, auto iterations and
   everything else run as before. */
let inputOwner = 'module';
let lastRawDist = 1.0;                          // the unsmoothed surface distance of the last frame
let hostMoveAt = -1e9;                          // when a host last moved the camera (isFlying: a move ends the module's own dive)
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
  if(e.key==='?') toggleAbout();                                                  // About / Credits panel
  if(e.key==='Escape' && exporting) api.cancelRender();                      // abort an export
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
  {t:'tog', l:'gate', note:'Live ground-truth check — GPU perturbation vs an independent CPU referee, shown in the HUD (relT ✓/✗). A 1×1 readback per ~0.5 s; turn off for the smoothest flying.', g:()=>gateOn, s:v=>{gateOn=v; if(!v) gate.relT=NaN;}},
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
}
$id('ctlbtn').addEventListener('click', ()=>openPanel(ctlEl));
ctlEl.addEventListener('click', e=>{ if(e.target.className==='x') closePanels(); });
dzInterval(()=>{ if(isOpen(ctlEl)) syncControls(); }, 150);    // reflect key-driven changes live (reads the DOM, no mirrored flag)

/* ── render / export panel (the still; its camera-path half went with the recorder, 2026-10-11: grep CAMERA PATHS) ── */
function rstat(m){ const e=$id('rstatus'); if(e) e.textContent=m; }
$id('renderbtn').addEventListener('click', ()=>openPanel(renderEl));
renderEl.addEventListener('click', e=>{ if(e.target.className==='x') closePanels(); });
$id('r_export').onclick=()=>{ if(!deepActive){ rstat('Export needs deep mode — zoom past 1e-4, or press P to force it'); return; }
  if(exporting){ rstat('busy — a render is already running'); return; }
  closePanels(); api.export(+$id('r_res').value, +$id('r_samp').value); };
$id('r_cancel').onclick=()=>api.cancelRender();
function setPower(n){
  n = Math.max(2, Math.min(16, n|0));
  if (n === nPower) return;
  nPower = n; cam.power = n;
  binomN = binomPad(nPower); binomN1 = binomPad(nPower-1);   // recompute binomial coeffs
  orbitDirty = true;                                         // the orbit depends on n
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
  if (!cam.roll) return {fwd,right,up};                  // no roll: the page's basis, to the bit
  /* ROLL: a turn of the camera about its own view axis. Positive tips its right-hand side up (three.js: a turn
     about the camera's own +Z, which points at the viewer), so the picture turns clockwise. fwd does not change. */
  const cr=Math.cos(cam.roll), sr=Math.sin(cam.roll);
  return { fwd, right: right.map((v,i)=>v*cr+up[i]*sr), up: up.map((v,i)=>v*cr-right[i]*sr) };
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
/* THE FORMULA SEAM (grep): the plain-f64 and the fixed-point orbits of an EXPLICIT point, for the box - what
   deCPU, deCPUesc, hpDirectDE and hpDirectTrap are for the bulb, and reached through them. No reference orbit,
   no delta: the direct referees of the probes. An iteration is tested after its step, as the kernel tests it. */
function boxDirectF64(pos, N){
  const p = boxP, R = p.hasRot ? p.R : null, aS = Math.abs(p.scale);
  let z = pos.slice(), dr = 1, r2 = 0, escaped = false, it = 0, trap2 = Infinity;
  for (let i = 0; i < N; i++) {
    const u = R ? R.map(r => r[0]*z[0] + r[1]*z[1] + r[2]*z[2]) : z, w = u.map(x => Math.max(-p.fold, Math.min(p.fold, x)) * 2 - x);
    const k = Math.max(1, Math.min(p.kA, p.F2 / Math.max(w[0]*w[0] + w[1]*w[1] + w[2]*w[2], 1e-300)));
    z = w.map((x, j) => x * k * p.scale + pos[j]); dr = dr * k * aS + 1; it++;
    r2 = z[0]*z[0] + z[1]*z[1] + z[2]*z[2];
    if (r2 < trap2) trap2 = r2;
    if (r2 > BOX_ESC2) { escaped = true; break; }
  }
  return { de: (Math.sqrt(r2) - 1) / dr, escaped, iters: it, trap: Math.sqrt(trap2) };
}
function boxDirectHP(posFp, maxIter){
  const B = boxP.fixed, SC = Number(hp.SCALE), aS = Math.abs(boxP.scale);
  let v = posFp.slice(), dr = 1, r2 = 0, escaped = false, it = 0, trap2 = Infinity;
  for (let i = 0; i < maxIter; i++) {
    const q = hp.boxParts(v, B);
    v = hp.boxStep(q, posFp, B); dr = dr * (Number(q.k) / SC) * aS + 1; it++;
    r2 = Number(hp.norm2(v)) / SC;
    if (r2 < trap2) trap2 = r2;
    if (r2 > BOX_ESC2) { escaped = true; break; }
  }
  return { de: (Math.sqrt(r2) - 1) / dr, escaped, iters: it, trap: Math.sqrt(trap2) };
}
/* the box's estimate at the camera itself, from its own orbit: where that first passes the escape radius. -1 when it
   does not within the orbit: then there IS no estimate - the count is too low for this place (or the camera is in the set) */
function boxCamEstimate(O){
  for (let k = 0; k < O.len; k++) if (O.Rk[k] > BOX_ESC) return Math.max(0, (O.Rk[k] - 1) / O.DRk[k]);
  return -1;
}
const itersMax = () => (boxOn() ? BOX_ITER_MAX : rayUse ? RAY_ITER_MAX : 160);   // what the count is held under: the page's 160, the ray march's and the box's own
function deCPU(px,py,pz, power, N){
    if (boxOn()) return Math.max(0, boxDirectF64([px,py,pz], N).de);
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
    if (boxOn()) return boxDirectF64([px,py,pz], N);
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
  if (boxOn()) return boxDirectHP(posFp, maxIter);
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
  setPowerUniforms(x);
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

/* ════════ COLOUR-INPUT STUDY: are the palette's inputs right at the rendered surface? ════════
   The gates above referee the distance estimate. The picture's COLOUR comes from two other orbit
   outputs — the trap (min |z_k|) and the escape-iteration count — and nothing checked those.
   probe 6 returns, per pixel, the surface t the march found plus the hit orbit's trap and count;
   the referee re-runs that exact point as a BigInt DIRECT orbit (no reference orbit, no §3, no
   kernel code) with the same loop convention as pertOrbit (step, then test / track |z|). Reported:
   relative trap error (median / p95 / worst) and how many pixels disagree on the count. */
function hpDirectTrap(posFp, maxIter){
  if (boxOn()) return boxDirectHP(posFp, maxIter);
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
  setPowerUniforms(x);
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
  gl.uniform1f(x.pixAng, Math.tan(0.5 * 1.1) / (acc && acc.pixH || n) / detailNow());
  const jx = acc ? acc.jitter[0] : 0, jy = acc ? acc.jitter[1] : 0;
  gl.uniform2f(x.jitter, jx, jy);
  setPowerUniforms(x);
  if (probe) {                                   // a probe is pass G's raw output
    if (acc && acc.guide) {                      // a probe of a guided sample: the guide's depths are relative to uRefE, as drawDeep sets it
      gl.uniform1f(x.refE, Math.floor(Math.log2(Math.max(smoothedDist, 1e-300))));
      bindGuide(x, acc.guide);
    }
    if (probe === 7) {                           // the picture's own march: give pass G what drawDeep gives it
      const dist = Math.max(smoothedDist, 1e-300), refE = Math.floor(Math.log2(dist));
      gl.uniform2f(x.origin, 0, 0); gl.uniform1f(x.refE, refE); gl.uniform1f(x.landSplit, -1);
      gl.uniform1f(x.farFrom, Math.log2(march.farFromDist * dist) - refE); bindGuide(x, null);
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
  const N = n * n, pixAng = Math.tan(0.5 * 1.1) / n / detailNow();
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
  return { n, samples, guideK, guideR, guideFirst, normalMode,
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
     work       kernel loop passes — one real perturbation step each (the unit of cost)
     bisect     bisection evaluations                normals  share of all work spent on normal taps
   and how unevenly the work is spread: the GPU shades pixels in lock-step groups, so a group costs
   what its slowest pixel costs. lockLoss[B] = (Σ over B×B blocks of max·area) / Σ work — the factor
   by which block-synchronous execution exceeds the ideal of every pixel stopping when it is done. */
api.stats = (n, guideSamples) => {
  if (!deepProg || !curOrbit) return null;
  n = n || 128;
  const v = boxOn() ? ensureBoxVariant(true) : ensureRayVariant(true);
  if (!v) return { error: variantErr[boxOn() ? xKey(true) : rKey(true)] };
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
  return { n, iters: cam.iters, normalMode, guided: !!acc && !guideIsFull(guideSamples),
    kinds: { hit: frac(1), far: frac(2), exhausted: frac(3), miss: frac(0) },
    steps: desc(steps), stepsHit: desc(hitOnly(steps)), orbitsMarch: desc(orbM), bisect: desc(bis),
    workMarch: desc(workM), workTotal: desc(workT),
    workPerOrbit: sWM / Math.max(sOM, 1),          // kernel passes per march orbit (≤ iters; lower with early escape)
    normalShare: 1 - sWM / Math.max(sWT, 1),       // fraction of all work spent on the normal taps
    bisectShare: sum(bis) / Math.max(sOM, 1),      // fraction of march orbits that are bisection evaluations
    skipRatio: 1 - sWT / Math.max(sIt, 1),         // 1 − loop passes ÷ iterations reached (gIters); it measured what the skip table saved, until that went (2026-10-11)
    bigAngleShare: sum(big) / Math.max(2 * sWT, 1),// fraction of angle-delta evaluations on the large-angle branch
    lockLoss: { b2: lockLoss(2), b4: lockLoss(4), b8: lockLoss(8), b16: lockLoss(16) } };
};
/* MARCH PROBE (2026-10-08, a measuring handle: nothing draws through it). n×n rays of the current
   view, marched exactly as a picture marches them - the live step size, hit refine, step budget
   and far relax, unlike probes 1-6 - and read back raw, one RGBA32F texel per ray:
     x  log2(t) − uRefE where the ray ended (PASS G OUTPUT x: differences between two calls at the
        same view are exact)
     y  steps + 65536·kind      kind 0 miss · 1 near hit · 2 far hit · 3 ran out of steps
     z  orbits spent by the march (steps, bisections, refine halvings)
     w  kernel passes in all, the normal taps included - the deterministic unit of cost
   `pixH` is the picture height the hit tolerance is taken for (default n): a 128-ray grid can then
   sample the march of a 1080-row picture. Returns the Float32Array itself, for a caller IN the
   page (debug/deep-zoom-march-study.mts); null until the deep path is ready. The counter variant
   compiles on first use (seconds, blocking). The far-field f32 segment's steps are not counted.
   @invariant probe 7 marches what the picture marches: the same rays end at the same depth and in
   the same way as in the picture's own G-buffer - proven by: npm run bench:deep-zoom-march
   ("probe = picture: 0 of N rays end elsewhere"). Falsified 2026-10-08: probe 7 taken out of
   PICTURE_MARCH -> 237998 of 278528 rays differ, exit 1. (That break was seen with the comparison
   marching a setting of the page's march. Since 2026-10-11 it marches the ray march's own setting,
   PTR against PR: 0 of 49152 rays at the three kept places, and not broken again on purpose.) */
let marchProbeFbo = null, marchProbeTex = null, marchProbeN = 0;
api.marchProbe = (n, pixH) => {
  if (!deepProg || !curOrbit) return null;
  const v = boxOn() ? ensureBoxVariant(true) : ensureRayVariant(true);
  if (!v) return null;
  n = n || 128;
  if (marchProbeN !== n) {
    if (marchProbeTex) { gl.deleteTexture(marchProbeTex); gl.deleteFramebuffer(marchProbeFbo); }
    marchProbeTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, marchProbeTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, n, n, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    marchProbeFbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, marchProbeFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, marchProbeTex, 0);
    marchProbeN = n;
  }
  drawSquare(n, marchProbeFbo, v, 7, { jitter: [0, 0], pixH });
  const px = new Float32Array(n * n * 4); gl.readPixels(0, 0, n, n, gl.RGBA, gl.FLOAT, px);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return px;
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
  const B = baseCtx(), bu = B.u;                 // the active formula's baseline (the bulb: the page's program)
  gl.useProgram(B.p); bindQuad(B.p);
  gl.uniform2f(bu.res, n, n);
  gl.uniform3fv(bu.camPos, cam.pos);
  gl.uniform3fv(bu.fwd, fwd); gl.uniform3fv(bu.right, right); gl.uniform3fv(bu.up, up);
  gl.uniform1f(bu.fov, Math.tan(0.5 * 1.1));
  gl.uniform1f(bu.power, nPower); gl.uniform1f(bu.iters, cam.iters);
  gl.uniform1f(bu.prec, 5e-7);
  gl.uniform3fv(bu.light, keyLightDir(right, up, fwd));
  gl.uniform2f(bu.phase, phaseTheta, phasePhi);
  if (boxOn()) setBoxUniforms(bu);
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
/* THE FORMULA SEAM (grep; added 2026-10-09). kind 'mandelbulb' (the default, the page) or 'mandelbox'; params, the box
   only, each optional and kept from call to call: scale (negative allowed; |scale| held at or above 1.02), minR, fold,
   fixedR, rot [x, y, z] radians (applyFormula has the limits). The camera, the look and every setting stay; the
   reference orbit and the still restart. The first time the box is selected its deep variant starts to build in
   the background - the box's f32 baseline is drawn until it is there (telemetry `ready` is false meanwhile, and
   formulaState says 'building'). The iteration count is only ever RAISED here and by the box's rule (grep
   ITERATIONS AS A MARGIN): a host that wants fewer sets them after this call. What the box does not use is
   listed in the seam's header. */
function setFormulaNow(kind, params){
  if (!applyFormula(kind, params)) return;
  rayUse = boxOn() ? 0 : rayAsk;                   // the asks are kept; what is in force follows the formula
  if (boxOn()) { kickBoxVariantAsync();
    /* the least count that draws the box at all: what a point at the edge of it needs to pass the escape radius
       (|z| grows by |scale| an iteration out there), and 12 more. The bulb's 14 would draw a featureless lump. */
    cam.iters = Math.max(cam.iters, Math.min(BOX_ITER_MAX, Math.ceil(Math.log(BOX_ESC) / Math.log(Math.abs(box.scale))) + 12)); }
  else cam.iters = Math.min(cam.iters, itersMax());
  orbitDirty = true; accumReset = true; snapDist = true;
}
api.setFormula = setFormulaNow;
api.formula = ()=>({ kind: dzFormula, scale: box.scale, minR: box.minR, fold: box.fold, fixedR: box.fixedR, rot: box.rot.slice() });
api.formulaState = ()=>{ if (!boxOn()) return deepProg ? 'on' : deepCompileErr ? 'failed' : 'building';
  const v = variants[xKey(false)]; return v ? 'on' : v === null ? 'failed' : 'building'; };
// Shell setters (not in the historical page, added 2026-10-08): what the page's `iters` and
// `auto-iters` control rows and its [ ] I keys do, for a host that owns those values.
api.setIters = (n)=>{ cam.iters=Math.max(4,Math.min(boxOn() ? BOX_ITER_MAX : 160,n|0)); orbitDirty=true; };   // (the box runs longer: grep ITERATIONS AS A MARGIN)
api.setAutoIters = (b)=>{ autoIters=!!b; };
api.autoIters = ()=>autoIters;
// Read-back of three march settings that had setters only (0 for stepRelax means the default 0.85).
api.setRebaseOrigin = (b)=>{ rebaseOrigin = b ? 1 : 0; accumReset = true; };   // REBASE TO THE ORIGIN on / off (off = the page's kernel)
api.setFarHandOff = (t)=>{ farHandOff = farClamp(t); accumReset = true; };   // FAR HAND-OFF distance, 1e-3 (the page) .. 12
/* THE LOOK LEVEL (grep; an experiment, 0 = off = the page): a detail of its own for the NORMAL. With 4-tap normals
   and a normal detail below the detail setting, a ray still stops where the detail setting says, and its normal is
   taken on the coarser level the normal detail names: Detail 32 with a normal detail of 8 stops rays as Detail 32
   does and shades them as Detail 8 would. At or above the detail setting it changes nothing. */
api.setNormalDetail = (d)=>{ normalDetail = Math.max(0, Math.min(256, +d || 0)); accumReset = true; };
api.normalDetail = ()=>normalDetail;
/* THE RAY ESTIMATE AND RAY-COHERENT ORBITS (grep): bits 1 = the march steps by
   the ray estimate · 2 = and tests a hit by it · 4 = orbits resume along the ray · 8 = a measuring mode (below).
   The module starts at 5 with floor 256 and line 2 (grep "deep program variants"), and no host sends anything else.
   BITS 0 IS NO LONGER "THE PAGE": until 2026-10-11 it chose the page's own program; now there is one program
   and 0 leaves nothing of the ray march in force inside it - it marches by the page's step rule, carries no
   jet, and the iteration count follows the page's rules again (grep itersMax). A tool's state: the direct
   proof holds it between its careful marches so that its iteration counts stay the ones it asked for. opt: factor (the
   step as a share of the estimate, default 1), hit (the hit level is a display pixel ÷ this,
   default 64), tol (how far, in display pixels, a resumed orbit's point may stand from the true
   one, default 0.05), floor (with bit 2 off: also a hit once the ray estimate is under a display
   pixel ÷ this; 0 = none, the default), line (THE LINE AGAINST THE BALL - grep: the longer step it
   allows is taken, with this multiple of Q as the allowance for the path's bend; 0 = off, the default),
   detail (above 0: while the ray march is on the hit level is a display pixel ÷ this, whatever the
   detail setting says; default 0 = follow the detail setting). The program itself is built at load, in the
   background; `now` waits for that build, blocking - for a tool that must not go on without it. */
api.setRayMarch = (bits, opt, now)=>{ rayAsk = Math.max(0, Math.min(15, bits|0)); rayUse = boxOn() ? 0 : rayAsk;   // bit 8 (a measuring mode): carry the jet, march as the page does
  if (opt) { if (opt.factor > 0) rayFactor = +opt.factor; if (opt.hit > 0) rayHitDiv = +opt.hit; if (opt.tol >= 0) rayTol = +opt.tol; if (opt.floor >= 0) rayFloorDiv = +opt.floor; if (opt.line >= 0) rayLine = +opt.line; if (opt.detail >= 0) rayDetail = +opt.detail; }
  if (now && rayUse) ensureRayVariant(false);
  accumReset = true; };
api.rayMarchState = ()=>{ if (!rayUse) return 'off';
  const v = variants[rKey(false)];
  return v ? 'on' : v === null ? 'failed' : 'building'; };
api.rayMarch = ()=>({ bits: rayAsk, factor: rayFactor, hit: rayHitDiv, tol: rayTol, floor: rayFloorDiv, line: rayLine, detail: rayDetail });
/* experiments: build the ray variant with extra #defines, e.g. ['CK_WR_ 1'], ['CKN_ 16'] or ['NO_CKPT']; the built variants are dropped.
   The picture's variant IS the bulb's program since 2026-10-11 (deepProg), so it is built again here, BLOCKING,
   and deepProg / ud follow it: no draw may meet a deleted program. (The load-time build is waited for first.) */
api.setRayDefs = (list)=>{ if (pendingBuild[rKey(false)]) pendingBuild[rKey(false)].finish();
  rayDefs = (list || []).map((d) => '\n#define ' + d).join('');
  for (const t of [false, true]) { const v = variants[rKey(t)]; if (v) gl.deleteProgram(v.p); delete variants[rKey(t)]; delete variantErr[rKey(t)]; }
  const v = ensureRayVariant(false);
  deepProg = v ? v.p : null; if (v) ud = v.x;
  deepReady = !!v; deepCompileErr = v ? '' : (variantErr[rKey(false)] || 'the ray variant did not build'); api.deepReady = deepReady; api.deepErr = deepCompileErr;
  accumReset = true; };
api.marchLevers = ()=>({ stepRelax, capRelax, mode: modeOverride, hitRefine, rebaseOrigin: !!rebaseOrigin, farHandOff });
api.power = ()=>nPower;
api.setColor = (m,s)=>{ colorMode=m|0; if(s) colorScale=s; accumReset=true; };
api.setSurf = (m)=>{ surfMul=Math.max(0.25,Math.min(256,m||1)); accumReset=true; };  // ray-closeness ÷pixAng
api.setGate = (b)=>{ gateOn=!!b; if(!gateOn) gate.relT=NaN; };  // live ground-truth gate on/off
api.setLight = (m,f)=>{ lightMode=m|0; if(f) falloffMul=f; accumReset=true; };  // 0 dir/1 headlamp/2 both
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
api.cancelRender = () => { cancelRender = true; };   // abort __export or a frame of api.dz.renderFrame at the next row
function showProg(html){ if(loading){ loading.style.display='flex'; loading.querySelector('.box').innerHTML=html; } }
/* Render the CURRENT view at an arbitrary resolution by TILING (each tile a small draw ≪ the ~2 s
   watchdog) with `samples` jittered passes (denoise+AA), and return a PNG Blob. Caller owns the
   `exporting` flag + orbit currency. Shared by __export (one still)
   and api.dz.renderFrame, which alone passes `alone` = { dist, aspect }: the depth scale is then
   that number (the view's own distance), the waits are dzYield, not animation frames, and an
   aspect above 0 is the picture's width over height instead of the canvas's own. */
async function renderFrameToBlob(longEdge, samples, tile, label, rigMode, alone){
  longEdge = longEdge || 2560; samples = Math.max(1, samples||16); tile = tile || 128;
  const cW = Math.max(2,canvas.clientWidth), cH = Math.max(2,canvas.clientHeight), aspect = alone && alone.aspect > 0 ? alone.aspect : cW/cH;
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
  gl.uniform1i(x.bisectMax, Math.min(24, bisectMax + Math.max(0, Math.round(Math.log2(detailNow())))));
  gl.uniform1i(x.normalIters, normalIters);   // PERF LEVER (0 = full uIters)
  gl.uniform1i(x.bisectIters, bisectIters);   // PERF LEVER (0 = full uIters)
  gl.uniform1f(x.stepRelax, stepRelax);       // PERF LEVER (0 = default 0.85)
  gl.uniform1f(x.pixAng, Math.tan(0.5*1.1)/H/detailNow());
  setPowerUniforms(x);
  // headlamp falloff must track THIS frame's depth (setPowerUniforms used the frozen smoothedDist,
  // wrong for a moving path). Derive the surface-distance scale from the reference orbit at the camera.
  let dScale;
  if (alone) dScale = alone.dist;
  else if (curOrbit.box) { const est = boxCamEstimate(curOrbit); dScale = Math.max(1e-300, est > 0 ? est : smoothedDist); }
  else
  { let ke = curOrbit.len-1; for (let k=0;k<curOrbit.len;k++) if (curOrbit.Rk[k] > 2) { ke=k; break; }
    dScale = Math.max(1e-300, 0.5*curOrbit.Rk[ke]*Math.log(Math.max(curOrbit.Rk[ke],1e-300))/curOrbit.DRk[ke]); }
  /* The new look's occlusion and shadows read the depth buffer far from the pixel, so the whole
     picture is marched into a full-size G-buffer (row by row, for the watchdog) and shaded in one
     draw per sample. The classic look keeps a G-buffer of one row of tiles. A picture too large
     for a full-size G-buffer is refused: shaded in strips it would show a seam at every row. */
  const whole = look.mode === 1;
  const pad = !whole && normalMode === 3 ? look.nrmTap : 0;   // normals from depth read the rows above and below
  /* A FRAME OF api.dz.renderFrame GETS A G-BUFFER OF ITS OWN (2026-10-11). A run now holds the live picture
     between its frames (the host's holdLive), so nothing else would make one anew, and a frame that reused the
     G-buffer of the frame before came out as another picture far more often in the first minute after start-up:
     36 of 117 frames reused, 2 of 48 made anew (measured in the shell, debug/scratch/r6/). Why the old contents
     matter is not known. */
  if (alone) gbufW = gbufH = 0;
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
  if (!alone) setCanvasSize(Math.max(2,canvas.clientWidth), Math.max(2,canvas.clientHeight));   // `alone` sizes the canvas at its one blit, below: sized here it would show black until the frame is done
  const tilesX = Math.ceil(W/tile), tilesY = Math.ceil(H/tile);
  const total = tilesX*tilesY*samples; let done = 0;
  const raf = alone ? dzYield : () => new Promise(r => requestAnimationFrame(r));
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
        // live preview: scale the in-progress float buffer onto the canvas, then restore aF for drawing.
        // NOT for api.dz.renderFrame (`alone`): a picture put on the canvas in the middle of a frame is
        // presented by the browser during the wait, and the rows marched after that come out
        // differently from run to run (grep NO PICTURE ON THE CANVAS). It shows its frame once, at the end.
        if (!alone) {
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, aF); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
        gl.blitFramebuffer(0,0,W,H, 0,0,canvas.width,canvas.height, gl.COLOR_BUFFER_BIT, gl.LINEAR);
        gl.bindFramebuffer(gl.FRAMEBUFFER, aF);
        }
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
  if (alone) {   // the finished frame, shown once: nothing of this frame is drawn after it. The canvas takes its size in the same breath, so it never shows empty.
    setCanvasSize(Math.max(2,canvas.clientWidth), Math.max(2,canvas.clientHeight));
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null); gl.blitFramebuffer(0,0,W,H, 0,0,canvas.width,canvas.height, gl.COLOR_BUFFER_BIT, gl.LINEAR); }
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

/* ════════ ONE FRAME TO MEMORY — api.dz.renderFrame (2026-10-11) ════════
   The CURRENT view and look as a PNG blob, for a host that renders a sequence one frame at a time
   and writes each frame itself (the shell's route render). { longEdge, samples, tile?, aspect? }:
   `aspect` (width over height) holds the frame's shape whatever the window does meanwhile;
   without it the canvas's own shape now is taken, as api.export does. Resolves null when cancelled
   (api.cancelRender); rejects when it cannot start — not ready, a render already running — or
   when the picture is too large for the look (the message says so).

   A FRAME DEPENDS ON THE VIEW AND THE LOOK AND NOTHING ELSE: the same frame comes out rendered
   alone or in the middle of a sequence, which is what lets a host skip the frames it already has.
   api.export shares renderFrameToBlob with it and does NOT hold this; it reads
   something the frames before it left behind. Here:
     - THE DEPTH SCALE is the surface distance of this view (viewDistance), never smoothedDist,
       which is eased, and held from earlier frames while an orbit has not escaped.
     - THE POLE GUARD (grep) is applied here: frame() returns early during a render, and its own
       nudge is sized by smoothedDist. This one is sized by this view's distance.
     - THE REFERENCE ORBIT is built for the view every time, whatever orbitDirty says.
     - THE SHADER VARIANT the picture needs is there: the bulb's one program is what "ready" means
       (checked first), and the Mandelbox's is built now, BLOCKING, if it is still building in the
       background.
     - THE LIGHT RIG is measured from this frame alone (rig mode 'alone'; grep THE NEW LOOK).
     - ITERATIONS are what is set: the automatic rules are frame()'s, and frame() does not run.
   The live view gets its own rig back afterwards, and rebuilds its orbit.

   ITS WAITS ARE dzYield, a message channel. requestAnimationFrame stops in a hidden tab and a
   timer is slowed to one a second there; a long render has to go on behind another window.
   Pitfall: nothing here locks the view or the look. A host that changes either while a frame is
   being drawn gets a frame of two halves.

   NO PICTURE ON THE CANVAS WHILE A FRAME IS DRAWN. api.export blits the
   picture so far onto the canvas at every wait. The browser then presents the canvas during the
   wait, and the rows of tiles marched after that are NOT the rows a frame without that blit
   gets: measured on a grainy view (frame 8 of the scratch route) 100 s after start-up, ten
   renders with a wait forced after every row gave seven different pictures with the blit, and
   without it nine times the picture of a frame that never waits. So this function blits once,
   when the frame is finished and read back. (Why a present disturbs the rows after it is not
   known: saying the program and the textures again after each wait did not mend it.)

   MEASURED 2026-10-11 (debug/scratch/r6/, git-ignored; real GPU, 1280 px, 2 samples):
     - WHERE THE PICTURE IS SMOOTH a frame is the same frame every time - alone, straight after
       another frame, ten times in a row: equal pixel for pixel, or a level in one to six pixels
       of 1.3 million.
     - WHERE THE PICTURE IS GRAIN (the speckle a few samples leave on near-critical ground) it is
       NOT ALWAYS, and what is left is not this function's. Two things remain:
         in the FIRST MINUTE after the page opens, a grainy frame can come out as another throw
         of its grain than later (in the app, a run started 30 s after load differed from the
         same frames rendered afterwards in 3 of 8 sessions, in up to 23 % of the pixels by up
         to 105 levels; a run started 75 s later did in none of five: a level in two to six pixels);
         and the first few renders AFTER A PAUSE (live frames in between) can differ from the
         renders that follow each other closely, which then agree.
       The page's own still export (api.export, untouched here) does the same and more: one grainy
       view twelve times, six different pictures. The cause is not known. Ruled out one by one:
       the G-buffer left by the frame before, a screenshot taken meanwhile, renders at another
       place first. It is the floor the parity smoke printed beside its pictures (retired 2026-10-11). */
const dzYieldPort = new MessageChannel(); let dzYieldDone = null;   // one waiter at a time: renders do not overlap (`exporting`)
dzYieldPort.port1.onmessage = () => { const done = dzYieldDone; dzYieldDone = null; if (done) done(); };
const dzYield = () => new Promise(res => { dzYieldDone = res; dzYieldPort.port2.postMessage(0); });
/* the surface distance at the camera, from its own orbit: where that first passes the escape
   radius (what frame() calls rawDist). -1: it does not within the orbit. */
function orbitEstimate(O){
  if (O.box) return boxCamEstimate(O);
  for (let k = 0; k < O.len; k++) if (O.Rk[k] > 2) return Math.max(0, 0.5*O.Rk[k]*Math.log(O.Rk[k])/O.DRk[k]);
  return -1;
}
/* that distance for THIS view alone. A count too low for the camera's orbit to escape says nothing
   of it: an orbit run to the ceiling is asked instead (a build stops at the escape, so it costs
   what it needs). 1 when that does not escape either: the camera is in the solid, the picture flat. */
function viewDistance(O){
  let d = orbitEstimate(O);
  if (!(d > 0)) d = orbitEstimate(buildRefOrbit(camHP, itersMax() + 2));
  return d > 0 ? d : 1;
}
async function dzRenderFrame(req){
  if (!deepReady || dzDisposed) throw new Error('The deep renderer is not ready.');
  if (exporting) throw new Error('A render is already running.');
  const o = req || {};
  exporting = true; cancelRender = false;
  const keepRig = { n: rig.n, near: rig.near, far: rig.far };
  try {
    if (boxOn()) ensureBoxVariant(false);
    if (!deepNow()) throw new Error('The deep shader of this formula could not be built.');
    let O = buildRefOrbit(camHP, cam.iters + 2);
    if (camHP[0] === 0n && camHP[1] === 0n && !boxOn()) {            // POLE GUARD, by this view's own distance
      camHP[0] = hp.fromNum(Math.max(viewDistance(O) * 1e-9, 1e-30)); cam.pos = camHP.map(hp.toNum);
      O = buildRefOrbit(camHP, cam.iters + 2);
    }
    const dist = viewDistance(O);
    curOrbit = O; uploadOrbit(O);
    const r = await renderFrameToBlob(o.longEdge, o.samples, o.tile, 'rendering', 'alone', { dist, aspect: +o.aspect });
    if (r.error) throw new Error(r.error);
    return r.cancelled ? null : r.blob;
  } finally {
    rig.n = keepRig.n; rig.near = keepRig.near; rig.far = keepRig.far;
    orbitDirty = true;
    exporting = false; cancelRender = false; if (loading) { loading.style.display='none'; loading.style.background=''; }
  }
}

/* ════════ CAMERA PATHS — what is left is the sampler (api.samplePath) ════════
   A path is the file a recorded flight was saved as: { format:'gmt-mbulb-path', P:256, fovScale, frames },
   each frame a view (camHP kept as P=256 BigInt decimal STRINGS — no precision loss) with its time t.
   api.samplePath puts the camera at a time along one (BigInt-lerped positions → smooth at any depth): the
   march bench places its views with it, on the frozen page's sample flight.
   GONE 2026-10-11, never called by the shell, which flies, keys and renders a route of its own
   (deep-zoom/route.ts, routeRender.tsx): the recorder (api.recordToggle and its sparse keyframing,
   api.lastPath, api.recording, api.setKfSpacing), the smoothing (api.smoothPath), the eased arc-length
   preview (api.playPath, api.stopPlay), the path files (api.loadPath, api.loadPathFile, api.savePath) and
   the path render to ZIPs of PNGs (api.renderPath, api.renderPathFile); and from telemetry the keys
   `recording`, `playing` and `pathFrames`, which had outlived them for the parity smoke's sake. */
function isFlying(){ return !!(keys['KeyW']||keys['KeyS']||keys['KeyA']||keys['KeyD']||keys['KeyE']||keys['KeyQ']) || (inputOwner === 'host' && performance.now() - hostMoveAt < 150); }
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
let estOwed=false;                                // the camera's orbit has not escaped within the count yet: its first estimate is taken unsmoothed (grep HOLD THE ESTIMATE, boxCamEstimate)
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
  /* POLE GUARD (2026-10-08). With the camera EXACTLY on the z axis (x = y = 0: the start view is
     (0, 0, 2.6)) the deep path draws one flat colour. The reference orbit then sits on the axis,
     where an azimuth does not exist, and the kernel's angle step (grep `sclAtan(NP, denPhi`) is
     handed 0 / 0: every pixel's orbit comes out NaN and is read as "inside the surface".
     Measured: flat at x = 0, the whole bulb drawn at x = 1e-9. So the camera is never left
     exactly there: x is moved by a billionth of the surface distance (never less than 1e-30,
     the smallest step an f32 reference texel still holds apart from 0). No flight reaches the
     exact axis; a start view, a jump home or a hand-written view can. For years this hid behind
     the f32 baseline, which drew the start view instead. */
  if (camHP[0] === 0n && camHP[1] === 0n && !boxOn()) {            // (the box has no pole: its kernel takes no angle)
    camHP[0] = hp.fromNum(Math.max(Math.max(smoothedDist, 0) * 1e-9, 1e-30));
    cam.pos = camHP.map(hp.toNum); orbitDirty = true;
  }
  const {fwd,right,up}=basis();

  if (boxOn() && !deepNow()) kickBoxVariantAsync();            // THE FORMULA SEAM: the box's variant builds in the background; its f32 baseline is drawn meanwhile
  deepActive = deepNow() && (modeOverride==='deep' || (modeOverride==='auto' && smoothedDist < 1e-4));

  /* auto iteration budget: the n-iter surface needs ~1.35/decade to resolve at depth.
     Base 32 (not 24): boundary points escape at ~the budget edge, and a thin margin
     flips escape flags (measured at 1e-50: iters=92 mismatched, 96+ agreed). */
  if (autoIters && deepActive && smoothedDist > 0 && !boxOn()) {   // (the box: by ITERATIONS AS A MARGIN alone, below)
    const rec = Math.min(160, 32 + Math.ceil(1.35 * Math.max(0, -Math.log10(smoothedDist))));
    if (rec > cam.iters) { cam.iters = rec; orbitDirty = true; }
  }

  /* --- deep mode: rebuild reference orbit AT the camera (δro ≡ 0) ONLY when the camera or
     iteration budget changed. The BigInt rebuild + texture upload is heavy at
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
  if (deepActive && curOrbit && curOrbit.box) {
    /* THE FORMULA SEAM: the box's estimate, read where its orbit passes its own escape radius. While the count is
       still too low for the camera's orbit to escape (a formula switched at a deep place; the margin rule below then
       adds 32 a frame) there is no estimate: the last one is KEPT, and the first real one is then taken at once
       (estOwed), not eased towards. Taken as 0 instead - as the bulb's branch below reads such an orbit - the
       distance eases back up over seconds, and a still that starts meanwhile is drawn with the far relax and the
       depth scale drifting under it: seen as a faint second picture over the first (47 % of pixels more than 8
       levels off, 2026-10-09). */
    const est = boxCamEstimate(curOrbit);
    if (est < 0) { rawDist = lastRawDist; estOwed = true; }
    else { rawDist = est; if (estOwed) { snapDist = true; estOwed = false; } }
  } else if (deepActive && curOrbit) {
    // camera == reference, δ = 0 → de straight from reference escape quantities
    let ke = curOrbit.len - 1;
    for (let k = 0; k < curOrbit.len; k++) if (curOrbit.Rk[k] > 2) { ke = k; break; }
    rawDist = Math.max(0, 0.5*curOrbit.Rk[ke]*Math.log(Math.max(curOrbit.Rk[ke],1e-300))/curOrbit.DRk[ke]);
    if (dzHoldEstimate) {                         // HOLD THE ESTIMATE (grep): an orbit that did not escape says nothing of the distance
      if (!(curOrbit.Rk[ke] > 2)) { rawDist = lastRawDist; estOwed = true; }
      else if (estOwed) { snapDist = true; estOwed = false; }
    }
  } else {
    rawDist = Math.max(0, deCPU(cam.pos[0],cam.pos[1],cam.pos[2], cam.power, cam.iters));
  }
  lastRawDist = rawDist;
  /* ITERATIONS AS A MARGIN (the ray march only; grep THE RAY ESTIMATE). The page's rule above counts iterations by
     depth: 1.35 a decade, right for power 8 and far too few for power 2, whose hits escape 3.7 iterations a decade
     later - there the cap, not the fractal, shaped the surface (measured 2026-10-08: the owner's power-2 place needs
     its hand-set 86 where the rule gives 59). Under the ray march an orbit runs until it escapes and pays only for
     the iterations it needs, so the cap can simply stand a margin above where the camera's own orbit escapes: as
     many more iterations as the map needs to stretch space by e^RAY_ITER_REACH, at the rate this orbit itself has
     stretched it so far. Nothing in it names a depth or a power. Raised, never lowered, like the page's.
     THE MANDELBOX (grep THE FORMULA SEAM) counts by this rule ALONE, whatever march draws it, with its own escape
     radius: the page's rule above is the bulb's. It needs the margin for another reason than the ray march does -
     with the cap too near the camera orbit's own escape an intricate place draws as a smooth wall (the CPU study:
     24 iterations above it at scale 2, 44 at -1.5, where this rule gives 30 and 51 for a stretch of ln 2 and
     ln 1.5 an iteration) - and it has a ceiling of its own, BOX_ITER_MAX: at scale -1.5 the map stretches by as
     little as 1.48 an iteration, 5.9 iterations a decade (measured: 342 for the camera's own orbit at 7.7e-59),
     where the bulb's worst is 3.7. In single precision an orbit that runs more than about 17 iterations (scale 2)
     past where it left the reference is noise, so a cap far above this margin buys nothing. */
  if ((rayUse || boxOn()) && autoIters && deepActive && curOrbit) {
    const escR = curOrbit.box ? BOX_ESC : 2;
    let ke = -1;
    for (let k = 0; k < curOrbit.len; k++) if (curOrbit.Rk[k] > escR) { ke = k; break; }
    let want = cam.iters + 32;                    // the camera's own orbit has not escaped within the cap: certainly too low
    if (ke >= 0) {
      const grow = ke > 0 ? Math.log(Math.max(curOrbit.DRk[ke], 2)) / ke : 2;     // nats of stretch an iteration, from the orbit itself
      want = ke + 2 + Math.ceil(RAY_ITER_REACH / Math.max(grow, 0.2));
    }
    want = Math.min(itersMax(), want);
    if (want > cam.iters) { cam.iters = want; orbitDirty = true; }
  }
  if (snapDist) { smoothedDist = rawDist; snapDist = false; }
  else if (rawDist > smoothedDist) smoothedDist += (rawDist-smoothedDist)*(1-Math.exp(-1.2*dt));
  else smoothedDist = rawDist;
  const boost = keys['ShiftLeft']||keys['ShiftRight'] ? 4.0 : 1.0;
  const speed = smoothedDist * cam.baseSpeed * boost * dt * 60;

  const mv=(v,s)=>{ for(let j=0;j<3;j++) camHP[j] += hp.fromNum(v[j]*s); cam.pos = camHP.map(hp.toNum); orbitDirty = true; };
  if(keys['KeyW']) mv(fwd, speed);   if(keys['KeyS']) mv(fwd,-speed);
  if(keys['KeyD']) mv(right,speed);  if(keys['KeyA']) mv(right,-speed);
  if(keys['KeyE']) mv([0,1,0], speed); if(keys['KeyQ']) mv([0,1,0],-speed);

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
    setPowerUniforms(x);
    gl.uniform1f(x.pixAng, Math.tan(0.5*1.1)/Math.max(canvas.clientHeight,2)/detailNow());  // DISPLAY pixel ÷ detail
    gl.uniform3fv(x.camF, cam.pos);             // f32 camera for the far-field hybrid segment
    gl.uniform1i(x.normalMode, gNormalMode());  // 0 none (pass S derives it) / 1 3-tap / 2 4-tap (default)
    gl.uniform1i(x.bisectMax, Math.min(24, bisectMax + Math.max(0, Math.round(Math.log2(detailNow())))));  // refine more when sharper
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
       forces a GPU sync (small periodic stall) — key V toggles it off for smooth flying.
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
    const { p: prog, u } = baseCtx();            // the active formula's baseline (the bulb: the page's program)
    gl.useProgram(prog); bindQuad(prog);
    gl.uniform2f(u.res,w,h);
    gl.uniform3fv(u.camPos,cam.pos);
    gl.uniform3fv(u.fwd,fwd); gl.uniform3fv(u.right,right); gl.uniform3fv(u.up,up);
    gl.uniform1f(u.fov,Math.tan(0.5*1.1));
    gl.uniform1f(u.power,nPower); gl.uniform1f(u.iters,cam.iters);
    gl.uniform1f(u.prec,5e-7);
    gl.uniform3fv(u.light,light);
    gl.uniform2f(u.phase, phaseTheta, phasePhi);
    if (boxOn()) setBoxUniforms(u);
    gl.drawArrays(gl.TRIANGLES,0,3);
  }

  const gateOK = gate.relT < 1e-3;
  if (loading && (deepReady || deepCompileErr)) loading.style.display = 'none';  // overlay is shown by the load timer
  hud.innerHTML =
    `fps        <b>${fps.toFixed(0)}</b>   mode <b>${deepActive?'DEEP (perturbation)':'f32 baseline'}</b>${deepReady?'':deepCompileErr?' <span class="warn">deep shader failed: '+deepCompileErr.slice(0,80)+'</span>':' <span class="warn">⏳ compiling deep renderer…</span>'}\n`+
    `surf dist  <b>${smoothedDist.toExponential(2)}</b>\n`+
    (deepActive
      ? `gate       ${!gateOn?'<span style="color:#678">off (V)</span>':isNaN(gate.relT)?'…':`relT <b class="${gateOK?'ok':'warn'}">${gate.relT.toExponential(1)}</b> (GPU ${gate.tGPU.toExponential(3)} vs CPU ${gate.tCPU.toExponential(3)})${gateOK?' <span class="ok">✓</span>':' <span class="warn">✗ MISMATCH</span>'}`}\n`
      : `f32 eps    ${(Math.hypot(...cam.pos)*5e-7).toExponential(2)}\n`)+
    `<span class="hud-dim">power n    <b>${nPower}</b>   phase <b>${phaseTheta.toFixed(2)},${phasePhi.toFixed(2)}</b>   iters <b>${cam.iters}</b>   orbitLen ${curOrbit?curOrbit.len:'-'}   frame <b>${w}×${h}</b>   normals <b>${['screen','3-tap','4-tap','depth'][normalMode]}</b>`+
    `   color <b>${['plain','iteration','orbit-trap'][colorMode]}</b>   detail <b>${surfMul.toFixed(2)}×</b>   light <b>${['directional','headlamp','both'][lightMode]}</b></span>`+
    (deepActive&&accumEnabled?`   accum <b class="${accumN>=ACCUM_MAX?'ok':''}">${accumN>=ACCUM_MAX?`${accumN}× ✓`:accumN>0?`${accumN}×…`:'live '+w+'×'+h}</b>`:'')+`\n`+
    `pos        <span class="hud-dim">${cam.pos.map(v=>v.toFixed(5)).join(', ')}</span>`;
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
    if (t > senseFar()) return { noSurface: true };
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
    if (Math.hypot(...cam.pos) > (boxOn() ? 4 * boxExtent() : 8)) return { error: 'left scene (no surface along fwd)' };
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
   every __ handle above works as before. A VIEW has exactly the fields a keyframe of a recorded path
   has (the frames api.samplePath reads), so a bookmark and a path frame are interchangeable - plus
   `roll` when the camera has one (grep ROLL), which the path sampler does not set. */
let dzDive = 0;                                   // id of the running diveTo (0 = none); bumping it cancels
const dzThumbCv = document.createElement('canvas');
api.dz = {
  version: 1,
  telemetry: () => ({ ready: !!deepReady && !!deepNow(), error: deepCompileErr || (boxOn() && variantErr[xKey(false)]) || '', mode: deepActive ? 'deep' : 'f32',
    depth: smoothedDist, fps, frameW: canvas.width, frameH: canvas.height, iters: cam.iters, power: nPower,
    accumN, accumMax: ACCUM_MAX, exporting }),    // 12 keys; `recording`, `playing`, `pathFrames` and `bla` went 2026-10-11 with what they reported (grep CAMERA PATHS, "deep program variants")
  settings: () => ({ detail: surfMul, reach: reachMode(), power: nPower, phase: [phaseTheta, phasePhi],
    color: colorMode, cscale: colorScale, light: lightMode, falloff: falloffMul, normals: normalMode,
    land: !!landMode, frame: frameLong, accum: accumEnabled, lookMode: look.mode }),
  /* host input (see HOST INPUT above) */
  setInputOwner: (who) => { inputOwner = who === 'host' ? 'host' : 'module'; if (inputOwner === 'host') for (const k in keys) keys[k] = false; },
  inputOwner: () => inputOwner,
  rawDistance: () => lastRawDist,              // unsmoothed: a host that eases it itself must not ease twice
  yawPitch: () => ({ yaw: cam.yaw, pitch: cam.pitch }),
  setYawPitch: (yaw, pitch) => { cam.yaw = +yaw; cam.pitch = Math.max(-1.55, Math.min(1.55, +pitch)); accumReset = true; },
  /* the whole orientation, roll included (grep ROLL). NO pitch clamp here: within +-pi/2 is the caller's promise */
  orientation: () => ({ yaw: cam.yaw, pitch: cam.pitch, roll: cam.roll }),
  setOrientation: (yaw, pitch, roll) => { cam.yaw = +yaw; cam.pitch = +pitch; cam.roll = +roll || 0; accumReset = true; },
  /* what a host's navigation flies by (grep THE FREE DISTANCE ALONG A RAY): a bundle of seven rays about `axis`
     (a unit vector in world axes; null = the view axis), and one ray on its own (a pick: opt.tol 0.005) */
  sense: (axis, opt) => senseBundle(axis, opt),
  freeDistance: (dir, opt) => { const o = opt || {}, r = rayFreeJS(probeOrbit(), unit3(dir), cam.iters, o.tol > 0 ? +o.tol : 0.05, o.maxSteps > 0 ? (o.maxSteps|0) : 64);
    return { t: r.t, kind: r.kind === 1 ? 'hit' : r.kind === 2 ? 'inside' : 'open' }; },
  /* the distance estimate at the camera moved by `offset` (world units): the nearest surface in ANY direction as the
     estimate reads it there (the number rawDistance is at no offset); 0 inside the drawn solid. One orbit on the CPU.
     What a host keeps an orbiting camera's clearance by: a ray says what lies along a move, this says what lies around
     where the move ends. It under-reads the true clearance by 1.4 to 3.6 times on ordinary ground and can over-read
     next to the drawn surface (see the block above), so it is a comfort distance, never the thing that stops a move. */
  estimateAt: (offset) => { const o = pertOrbitJS(probeOrbit(), [+offset[0], +offset[1], +offset[2]], cam.iters); return o.escaped && o.de > 0 ? o.de : 0; },
  /* the same estimate at ANY exact position - three fixed-point decimal strings, as getView's `cam` - with `iters`
     iterations (0 or absent: the count in force): the nearest surface in any direction there, 0 inside the solid as it
     would be drawn with that count. estimateAt cannot say this of a point decades deeper than the camera: its offset is
     a double, good to 16 digits of the CAMERA's distance. One reference orbit is built for the call and dropped; the
     camera, the frame's own orbit and the picture are not touched. What a host asks before it sends the camera along
     a path: does it pass through the solid? (Added 2026-10-11, for the shell's route.) */
  estimateAtPoint: (pos, iters) => { const n = iters > 0 ? Math.max(4, Math.min(itersMax(), iters|0)) : cam.iters;
    const o = pertOrbitJS(buildRefOrbit(pos.map(BigInt), n + 2), [0, 0, 0], n); return o.escaped && o.de > 0 ? o.de : 0; },
  getView: () => ({ cam: camHP.map(String), yaw: cam.yaw, pitch: cam.pitch, ...(cam.roll ? { roll: cam.roll } : {}),   // roll only when there is one: a view without it reads as it always did
    iters: cam.iters, power: nPower,
    phase: [phaseTheta, phasePhi], light: lightMode, falloff: falloffMul, color: colorMode,
    cscale: colorScale, surf: surfMul }),
  setView: (v) => {                               // apply a view the way the path sampler applies a keyframe
    if (!v || !v.cam) return;
    dzDive = 0;                                   // a jump ends any dive in progress
    camHP = v.cam.map(BigInt); cam.pos = camHP.map(hp.toNum);
    cam.yaw = +v.yaw; cam.pitch = +v.pitch; cam.roll = +v.roll || 0;
    if (v.iters) cam.iters = Math.max(4, Math.min(boxOn() ? BOX_ITER_MAX : 160, v.iters|0));
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
  /* the current view and look as a PNG blob, { longEdge, samples }; null when cancelled (grep ONE FRAME TO MEMORY) */
  renderFrame: dzRenderFrame,
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

if (options.formula === 'mandelbox' || options.formulaParams) setFormulaNow(options.formula, options.formulaParams);   // THE FORMULA SEAM: the create option
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
