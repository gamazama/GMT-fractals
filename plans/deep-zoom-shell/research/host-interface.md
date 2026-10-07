# Host interface: the one seam between the deep-zoom shell and the renderer

Reader: host-interface. Read-only survey, 2026-10-07. Nothing was run.
W = `H:/GMT/workspace-gmt/stable/.claude/worktrees/deep-zoom`. Page = `H:/GMT/workspace-gmt/mandelbulb_deepzoom/index.html`
(3,976 lines, repo HEAD `3b65946`). Line numbers are hints; the symbol is the locator.

Files opened in full: `W/deep-zoom/bridge.ts`, `store.ts`, `DeepZoomApp.tsx`, `main.tsx`;
`W/plans/deep-zoom-in-gmt/CORE-EXTRACTION.md`, `WORK-PACKAGES.md`; the page's `window.__dz` block and the
handle regions listed in section 1. Opened in part: the page's `CTLS` table, `W/engine/plugins/viewport/ViewportFrame.tsx`
(header JSDoc and props only), `W/fluid-toy/FluidToyApp.tsx` (the `<ViewportFrame>` block), `W/deep-zoom/ui/kit.tsx` (header).
Everything else is in "Unverified" at the end.

---

## 1. Verified facts

### 1.1 What the page offers today

**`window.__dz` (version 1)** - page, grep `HOST HANDLE`. Seven members, no more:

```js
window.__dz = {
  version: 1,
  telemetry: () => ({ ready, error, mode: deepActive ? 'deep' : 'f32', depth: smoothedDist, fps,
    frameW, frameH, iters, power, accumN, accumMax, recording, playing, exporting, pathFrames, bla }),
  settings: () => ({ detail, reach, power, phase, color, cscale, light, falloff, normals, land, frame, accum, lookMode }),
  getView: () => ({ cam: camHP.map(String), yaw, pitch, iters, power, phase, light, falloff, color, cscale, surf }),
  setView: (v) => { ... },   thumbnail: (size) => { ... },   diveTo: (depth) => new Promise(...)
};
```

- `settings()` returns 13 fields. The page's developer table `CTLS` has about 40 rows. So about two thirds of the
  controls **cannot be read back** through any handle (list in 1.3).
- `setView` applies a field only when it is truthy for four of them: `if (v.iters)`, `if (v.power && v.power !== nPower)`,
  `if (v.falloff)`, `if (v.cscale)`, `if (v.surf)`. A view cannot set those to 0. It does not carry the field of view,
  the look object, reach, normals or frame size.
- `setView` does **not** reset `smoothedDist` (package K2) and there is **no field-of-view setter** (K1: `const fovScale =
  Math.tan(0.5*1.1)` is a local constant in at least two functions, and the path header hard-codes `fovScale:1.1`).
- `thumbnail(size)` clamps to 8..512 px, returns a square PNG data URL, and sets `accumReset = true` (the still starts over).
- `diveTo` exists in the page but **last week's bridge does not use it**. `connectCore` flies the dive itself with
  `__moveAlong`, because the page's version "overshot by two decades or ran through the surface" (comment on `diveTo` in
  `W/deep-zoom/bridge.ts`). The bridge's dive is the one to keep.

**Embed mode** - page, grep `EMBED`. Three effects only: `body.embed` hides the page chrome, `openPanel` returns early
(`if (EMBED) return;`), and `__recordToggle` skips the JSON download. It does **not** stop `__export` / `__renderPath`
from downloading, does not disable the page's own hotkeys, and does not silence `alert()`.

**No events at all.** The page never calls out. Everything the shell knows it learned by polling:
`DeepZoomApp.tsx` polls `bridge.telemetry()` every 125 ms (`TELEMETRY_MS`), and reads render progress by scraping
the page's DOM:

```ts
// W/deep-zoom/DeepZoomApp.tsx - "Frame progress of a path render"
html = bridge.win.document.querySelector('#loading .box')?.innerHTML || '';
const m = /frame (\d+)\/(\d+)(?!\d)/.exec(html);
```

**No pause, no stop, no dispose.** `frame(now)` re-schedules itself; while `exporting` it skips and re-schedules.
The page ends with a bare `requestAnimationFrame(frame);` (K3 adds `__dz.pause`).

**No context-loss handling.** `grep webglcontextlost` in the page: 0 hits.

**The page changes its own parameters without telling anyone.** Seen in the page:
- keyboard: `]` / `[` change `cam.iters`, `KeyI` toggles `autoIters`, `KeyN` cycles `normalMode` (the `keydown` listener
  after `__lockInput`); the state comments name more keys: C colour, 9/0 palette scale, F/G detail, V gate, L light, T/Y falloff.
- `uploadStrip`: `if (colorMode === 0){ colorMode = 2; }` - loading a gradient switches the colour mode.
- `__playPath` and `__renderPath`: `modeOverride = 'deep'`, never restored.
- `pathApplyCR` (path sampling): calls `window.__setPhase(...)` and writes iterations/power from the keyframe.
- the frame loop's auto-iterations (`autoIters`).

### 1.2 The loose handles the bridge wraps (each read in the page)

| Bridge member | Page handle | What it does there |
|---|---|---|
| `setMode` | `__setMode(m)` | `modeOverride = m; orbitDirty = true` |
| `setDetail` | `__setSurf(m)` | clamps 0.25..256 into `surfMul` (the CTLS slider is 0.25..32) |
| `setReach` | `__setReach(k)` | `Object.assign(march, REACH[k])`, k 0..2 |
| `setPower` | `__setPower(n)` | whole number 2..16, rebuilds binomials, `orbitDirty` |
| `setPhase` | `__setPhase(th, ph)` | both at once |
| `setColor` | `__setColor(m, s)` | `if(s) colorScale = s` (0 is ignored) |
| `setLight` | `__setLight(m, f)` | `if(f) falloffMul = f` |
| `look` / `setLook` | `__look` (live object) / `__setLook(o)` | `Object.assign(look, o); accumReset = true` - 30 keys |
| `setFrame` | `__setFrame(px)` | live frame long edge |
| `setAccum` | `__setAccum(b)` | progressive still on/off |
| `loadGradientFile` | `__loadGradientFile()` | opens the page's own file picker; `alert()` on failure |
| `clearGradient` | `__clearGradient()` | `gradientTex = null` |
| `recordToggle` / `recording` / `lastPath` | `__recordToggle` / `__recording` / `__lastPath` | toggle only; stop runs `assignCinematicTime` + `smoothPath` on the take; `__lastPath` returns the **live** `recPath` array |
| `smoothPath` | `__smoothPath(data, passes, alpha)` | **mutates `data.frames` in place** and returns the same object |
| `samplePath` | `__samplePath(data, tau)` | places the camera at **time tau in seconds** (`pathSampleAt`) |
| `playPath` / `stopPlay` | `__playPath(data, {frames, fps})` / `__stopPlay` | plays by **arc length** with ease in/out (`sampleArc(ks, arc, easeInOut(p) * arc.total)`) |
| `renderPath` | `__renderPath(data, {frames, fps, longEdge, samples, tile, smooth})` | renders every frame, then **downloads ZIPs itself** |
| `exportStill` | `__export(longEdge, samples, tile)` | **downloads a PNG itself** (`dlBlob`); returns `{W,H}`, `{error}` or `{cancelled}` |
| `cancelRender` | `__cancelRender()` | sets a flag read "at the next row" |
| dive | `__moveAlong(dir, dist)` | exact BigInt move; listed as a test lever in `CORE-EXTRACTION.md` but the product depends on it |
| `focus` | none | `iframe.focus(); contentWindow.focus()` |

Two timing facts that matter for the timeline: `__samplePath` is by **time**, playback and the path render are by
**arc length with easing**. They do not land on the same camera for the same fraction. There is no handle that places the
camera at arc fraction u (`WORK-PACKAGES.md` E2 step 4 already asks for "a pure `seekPath(u)` with no frame loop").

The one function that renders a frame to memory is internal: `async function renderFrameToBlob(longEdge, samples, tile,
label, rigMode)` returns `{ blob, W, H }`. No handle returns a blob or pixels; `__exportTimed` returns numbers only.
`__export` refuses in a shallow view: `if (!deepReady || exporting || !curOrbit) return { error: 'not ready / no deep orbit' }`.

### 1.3 `CTLS` rows against handles (parameter coverage)

`CTLS` rows are `{t, l, g, s, min, max, step, opts, note}` - each already has a getter `g` and a setter `s`, but **no id**.

| Control (CTLS label) | State | Set handle | Read handle |
|---|---|---|---|
| mode | `modeOverride` | `__setMode` | missing (`telemetry().mode` is the active mode, not the choice) |
| frame px | `frameLong` | `__setFrame` | `settings().frame` |
| 1:1 view | `view1to1` | missing | missing |
| iters | `cam.iters` | missing (only `setView`, or keys `[` `]`) | `telemetry().iters` |
| auto-iters | `autoIters` | missing (key I) | missing |
| BLA | `blaMode` | `__setBla` (signature not read) | `__blaMode` (not read) / `telemetry().bla` |
| gate | `gateOn` | `__setGate` | missing |
| reach | `march` | `__setReach` | `settings().reach` |
| step relax | `stepRelax` | `__setStepRelax` | missing |
| res cap | `capRelax` | `__setCapRelax` | missing |
| power n | `nPower` | `__setPower` | `settings().power` |
| phase theta / phi | `phaseTheta`, `phasePhi` | `__setPhase(th, ph)` | `settings().phase` |
| normals | `normalMode` | `__setNormalMode` (does **not** reset accumulation; the CTLS row does) | `settings().normals` |
| hit landing | `landMode` | `__setLand` | `settings().land` |
| depth taps | `look.nrmTap` | `__setLook` | `__look` |
| colour, palette | `colorMode`, `colorScale` | `__setColor` | `settings().color`, `.cscale` |
| detail | `surfMul` | `__setSurf` | `settings().detail` |
| look, key height, key turn, light colour, shadows, occlusion, sky, roughness, haze, view, compare | `look.*` | `__setLook` | `__look` |
| lighting, falloff | `lightMode`, `falloffMul` | `__setLight` | `settings().light`, `.falloff` |
| kf spacing | `kfSpacing` | `__setKfSpacing` | missing |
| (no row) accumulate | `accumEnabled` | `__setAccum` | `settings().accum` |

The BLA row's setter can block and can `alert()`: `needCompile ... showProg(...); setTimeout(finish, 30)` then
`alert('BLA compile failed: ...')`. A host must not go through that row as written.

### 1.4 Last week's shell

- `W/deep-zoom/bridge.ts` - `connectCore(iframe): Promise<DzBridge>`; waits for `__deepReady === true && __dz`, rejects on
  `__deepErr` or after `CORE_READY_TIMEOUT_MS = 120_000`; checks `dz.version !== 1`. Types `DzView`, `DzTelemetry`,
  `DzSettings`, `DzPath`, `DzLook`. It leaks the iframe window: `DzBridge.win`.
- The rule "nothing else touches `iframe.contentWindow`" in the bridge's JSDoc is **already broken** in 5 places:
  `DeepZoomApp.tsx` (progress scrape, key listener on `bridge.win`), `ui/DepthGauge.tsx` (`bridge.win.document`,
  `pointerLockElement`), `ui/Onboarding.tsx` (listens on `bridge.win`), `ui/RecordPanel.tsx` (pointer lock, key windows).
  The new interface has no `win`; each of those becomes a host member.
- `W/deep-zoom/store.ts` - own Zustand store (`useDeepZoom`): `bridge`, `telemetry`, `bookmarks` (localStorage
  `gmt.deepzoom.bookmarks.v1`), `path`, `panel`, `onboarded` (`gmt.deepzoom.onboarded.v1`), `toast`.
- `W/deep-zoom/DeepZoomApp.tsx` - full-window iframe, `CORE_SRC = './deep-zoom-core/index.html?embed=1'` (relative on
  purpose), overlays on `<Layer tier=...>`, a key switch for Esc, B, J, H, /, 1-3, Home, Backspace bound on **both** windows.
- `W/deep-zoom/main.tsx` - "no engine store, no plugins".
- `W/public/deep-zoom-core/index.html` **differs from the master page** (`diff -q` says so). Refresh it before building.

### 1.5 The engine's viewport frame

`W/engine/plugins/viewport/ViewportFrame.tsx` - `ViewportFrame` takes `children`, `showModeControls`, `shouldResize`,
`className`. Its JSDoc: "The frame doesn't know what it's wrapping - apps compose", and it is "the ONE authoritative
writer" of `canvasPixelSize` through its own ResizeObserver. Fluid-toy's use (`W/fluid-toy/FluidToyApp.tsx`):

```tsx
<ViewportFrame className="flex-1">
    <canvas ref={canvasRef} id="ft-render-canvas" className="absolute inset-0 w-full h-full block touch-none" />
    <FluidPointerLayer canvasRef={canvasRef} engineRef={engineRef} />
    <HudHost />
    <DomOverlays />
</ViewportFrame>
```

A feature can also mount a registered component into the viewport: `W/engine/FeatureSystem.ts` checks
`f.viewportConfig?.componentId` against the component registry, which is `componentRegistry` in
`W/components/registry/ComponentRegistry.tsx`.

---

## 2. Blueprint

### 2.1 Who owns what

- **Parameters: the engine store owns them.** DDFS features hold every value; a subscriber pushes each change through
  `host.setParam`. The renderer is a sink. When the renderer changes a value itself (1.1) it reports it through
  `paramChanged` and the shell writes it into the store.
- **Camera: the renderer owns it.** It is three 256-bit numbers and it moves 60 times a second. The store only holds a
  camera when something is saved (a location, a scene, a keyframe), as decimal strings.
- **Path: the shell owns it.** The page has no "current path"; every path handle takes the path as an argument. So path
  get / set are shell state, and the host only records, smooths, seeks, plays and renders.

### 2.2 The interface

New file `W/deep-zoom/host/DeepZoomHost.ts`. Types only; no DOM types in it, so both transports and the node tests can import it.

```ts
/** Camera, exact. BigInt fixed point (256 fractional bits) as decimal strings. Never parse to a number. */
export interface DzCamera { cam: [string, string, string]; yaw: number; pitch: number; fovTanHalf?: number }

/** A whole view = a path keyframe = a saved location. Same fields as the page's pushKeyframe. */
export interface DzView extends DzCamera {
    iters: number; power: number; phase: [number, number];
    light: number; falloff: number; color: number; cscale: number; surf: number;
}

export interface DzPath { format: 'gmt-mbulb-path'; P: number; fovScale: number;
    frames: Array<DzView & { t?: number; move?: number; rot?: number }> }

/** Renderer-native parameter ids. The shell maps DDFS `feature.param` onto these in ONE table. */
export type DzParamId =
    | 'mode' | 'framePx' | 'view1to1' | 'iters' | 'autoIters' | 'bla' | 'gate' | 'reach' | 'stepRelax' | 'capRelax'
    | 'power' | 'phaseTheta' | 'phasePhi' | 'normals' | 'land' | 'color' | 'colorScale' | 'detail'
    | 'light' | 'falloff' | 'accum' | 'kfSpacing'
    | `look.${string}`;                       // look.mode, look.ao, look.keyElev, look.nrmTap, ...
export type DzParamValue = number | boolean | string | number[];
export type DzParams = Partial<Record<DzParamId, DzParamValue>>;

export interface DzTelemetry {
    ready: boolean; error: string; mode: 'deep' | 'f32'; depth: number; fps: number;
    frameW: number; frameH: number; iters: number; power: number; accumN: number; accumMax: number;
    recording: boolean; playing: boolean; exporting: boolean; pathFrames: number; bla: boolean;
    paused?: boolean; compiling?: boolean;    // not in the page yet
}

export type DzCompileState = { state: 'compiling' | 'ready' | 'failed'; what: 'deep' | 'bla' | 'variant'; error?: string };
export type DzProgress = { job: 'still' | 'frame' | 'sequence'; frame?: number; total?: number; fraction?: number };

export interface DzEvents {
    /** The RENDERER changed a parameter (hotkey, gradient load, playback, auto-iterations, setView). */
    paramChanged: { changes: DzParams; cause: 'key' | 'view' | 'path' | 'auto' | 'unknown' };
    recordingChanged: { recording: boolean; frames: number };
    compile: DzCompileState;
    progress: DzProgress | null;              // null = the job ended
    captureChanged: { captured: boolean };    // pointer lock on the render surface
    error: { message: string; fatal: boolean };
}

export interface DzFrameRequest {
    path?: DzPath; u?: number;                // omit both = the current view
    ease?: boolean;                           // true = the same ease in/out the page's playback uses
    longEdge: number; samples: number; tile?: number;
}
export type DzFrameResult<T> = { ok: true; data: T; width: number; height: number }
                             | { ok: false; reason: 'busy' | 'no-deep-orbit' | 'cancelled' | 'error'; message?: string };

export type Unsubscribe = () => void;

export interface DeepZoomHost {
    readonly transport: 'iframe' | 'module';
    /** Resolves when the deep program has compiled; rejects with a readable message. */
    readonly ready: Promise<void>;

    // parameters
    setParam(id: DzParamId, value: DzParamValue): void;
    setParams(patch: DzParams): void;
    /** Every parameter the renderer has, read back. */
    getParams(): DzParams;

    // telemetry
    telemetry(): DzTelemetry;
    /** Coalesced stream; `hz` defaults to 8. */
    onTelemetry(fn: (t: DzTelemetry) => void, hz?: number): Unsubscribe;

    // view
    getView(): DzView;
    setView(v: DzView): void;
    /** Exact move along a direction, in world units. The dive is built on it. */
    moveAlong(dir: [number, number, number], distance: number): void;
    diveTo(depth: number): Promise<void>;
    thumbnail(size?: number): string;                         // PNG data URL, square, 8..512

    // gradient
    /** One row, RGBA, `width` texels (256 from the palette UI). null = the built-in palette. */
    setGradientRamp(rgba: Uint8Array | null, width?: number): void;

    // flight
    setRecording(on: boolean): void;
    takePath(): DzPath;                                       // a COPY of the last take
    smoothPath(p: DzPath, passes?: number, alpha?: number): DzPath;   // returns a NEW path
    /** Place the camera at arc fraction u in 0..1 along p. Pure: no frame loop, no clock. */
    seekPath(p: DzPath, u: number, o?: { ease?: boolean }): void;
    play(p: DzPath, o?: { frames?: number; fps?: number }): Promise<{ stopped: boolean }>;
    stopPlay(): void;

    // output
    renderFramePixels(r: DzFrameRequest): Promise<DzFrameResult<Uint8ClampedArray>>;   // RGBA, top-down
    renderFrameBlob(r: DzFrameRequest): Promise<DzFrameResult<Blob>>;                  // image/png
    /** A still of the current view. The HOST never downloads; the shell saves the blob. */
    exportStill(o: { longEdge: number; samples: number; tile?: number }): Promise<DzFrameResult<Blob>>;
    cancel(): void;                                           // render, playback and dive

    // lifecycle and input
    pause(on: boolean): void;
    focus(): void;
    /** false = the renderer ignores keys and mouse (a shell text field or a modal has the user). */
    setInputEnabled(on: boolean): void;
    /** Which keys the renderer keeps for itself. Default under a host: fly keys only. */
    setHotkeys(set: 'fly' | 'all' | 'none'): void;
    /** Keys pressed while the render surface has focus, for the shell's shortcut system. */
    onKey(fn: (e: { type: 'keydown' | 'keyup'; key: string; code: string; ctrl: boolean; alt: boolean;
                    shift: boolean; meta: boolean; repeat: boolean; preventDefault(): void }) => void): Unsubscribe;

    on<K extends keyof DzEvents>(type: K, fn: (e: DzEvents[K]) => void): Unsubscribe;
    dispose(): void;
}
```

Deliberately absent: `win`, any `HTMLIFrameElement`, any DOM query, the page's file pickers, any download.

### 2.3 Member by member: today's handle, or what is missing

| Member | Iframe transport today | Missing page handle (smallest additive) |
|---|---|---|
| `ready` | poll `__deepReady` / `__deepErr` / `__dz` every 100 ms (`connectCore`) | none |
| `setParam` / `setParams` | a table in the transport: id -> loose handle (1.3). Covers all but `view1to1`, `iters`, `autoIters`. `phaseTheta` / `phasePhi` are merged into one `__setPhase` call; `color` / `colorScale` into `__setColor`; `light` / `falloff` into `__setLight` | **H1** `__dz.set(patch)` |
| `getParams` | `__dz.settings()` (13 fields) + a copy of `__look`. 9 fields unreadable: mode choice, 1:1, auto-iters, gate, step relax, res cap, kf spacing, BLA mode, march | **H1** `__dz.params()` |
| `telemetry` | `__dz.telemetry()` | none (H3, H5 add `paused`, `compiling`) |
| `onTelemetry` | `setInterval` in the transport, 125 ms | none; a push is not needed |
| `getView` / `setView` | `__dz.getView()` / `__dz.setView(v)` | **K1** `fovTanHalf`; **K2** reset `smoothedDist` |
| `moveAlong` | `__moveAlong(dir, dist)` | none; **H7** moves it into `__dz` so it survives the extraction's test/product split |
| `diveTo` | host-side loop from `bridge.ts`, unchanged | none |
| `thumbnail` | `__dz.thumbnail(size)` | none |
| `setGradientRamp` | interim: build a text file of "R G B" lines and pass it to `__loadGradient(file)` (`gradientFromText` reads exactly that; no PNG codec, no image decode). `null` -> `__clearGradient()` | **H2** `__dz.setGradient(rgba, width)` = the internal `uploadStrip` |
| `setRecording` | `if (__recording() !== on) __recordToggle()` | none |
| `takePath` | `__lastPath()` then copy every frame (as `bridge.lastPath` does) | none |
| `smoothPath` | deep-copy the path, then `__smoothPath(copy, passes, alpha)` | none |
| `seekPath` | interim: `__samplePath(p, u * lastFrame.t)` - by time, so it does **not** match playback or the render | **H4** `__dz.seekPath(data, u, ease)` = `sampleArc(ks, pathArc(ks), (ease ? easeInOut(u) : u) * arc.total)` |
| `play` / `stopPlay` | `__playPath` / `__stopPlay` | none |
| `renderFramePixels` / `renderFrameBlob` | **not possible today** | **H4** `__dz.renderFrame(req)` = seek + `buildRefOrbit` + `renderFrameToBlob`, returns `{blob, W, H}` or `{pixels, W, H}` (the `img` array that function already builds before it encodes) |
| `exportStill` | interim: `__export(longEdge, samples, tile)` - works but the **page** downloads the PNG, with the page's file name and no scene metadata | **H4** (a still is `renderFrame` with no path) |
| `cancel` | `__cancelRender()` + `__stopPlay()` + bump the dive token | none |
| `pause` | **not possible today** | **K3** `__dz.pause(bool)` |
| `focus` | `iframe.focus(); contentWindow.focus()` | none |
| `setInputEnabled` | `__lockInput(!on)` (clears held keys) | none |
| `setHotkeys` | interim: a capture-phase `keydown` listener on the iframe window that calls `stopPropagation()` for every key outside the fly set, so the page's own bubble-phase listener never sees it | **H6** `__dz.hotkeys(set)` |
| `onKey` | `contentWindow.addEventListener('keydown' / 'keyup')`, forwarded | none |
| `on('paramChanged')` | interim: diff `getParams()` on the telemetry timer, `cause: 'unknown'`; the 9 unreadable fields are never reported | **H3** `__dz.on(fn)` + **H1** |
| `on('recordingChanged')` | diff `telemetry().recording` | **H3** |
| `on('compile')` | deep program: from `ready`. BLA / variant compiles: not visible | **H5** `telemetry().compiling` + **H3** |
| `on('progress')` | interim: the DOM scrape from `DeepZoomApp.tsx`, moved **into the transport** | **H3** (`showProg` emits) |
| `on('captureChanged')` | `pointerlockchange` on the iframe's document | none |
| `on('error')` | `telemetry().error` (compile only) | **H3**, **H5** (context loss) |
| `dispose` | remove listeners and timers; the iframe element is unmounted by React | none |

### 2.4 Handles to add to the page (extends K1-K4)

All additive, all inside `window.__dz`; bump `version` to 2 and let the transport accept 1 with the interims above.

- **K1** (exists) field of view in `setView` / `getView` and the path header.
- **K2** (exists) `setView` resets `smoothedDist`.
- **K3** (exists) `__dz.pause(bool)`; add `paused` to `telemetry()`.
- **K4** (exists) handles for bare names the suites read.
- **H1 - parameters by id.** Give every `CTLS` row an `id`, then:
  ```js
  __dz.schema = () => CTLS.filter(r => r.id).map(({id, t, l, min, max, step, opts}) => ({id, t, l, min, max, step, opts}));
  __dz.params = () => Object.fromEntries(CTLS.filter(r => r.id && r.g).map(r => [r.id, r.g()]));
  __dz.set    = (patch) => { for (const k in patch) { const r = CTLS_BY_ID[k]; if (r) r.s(patch[k]); } };
  ```
  The table stays the single source for the page's own panel and for the host. Two rows need a host-safe setter first:
  BLA (no `alert`, no blocking compile - report through H5) and `accum` (no row today). `schema()` also lets the shell
  check its DDFS ranges against the renderer's at boot.
- **H2 - gradient bytes.** `__dz.setGradient(rgba, width)` -> `uploadStrip(rgba, width)`; `__dz.setGradient(null)` ->
  `__clearGradient()`.
- **H3 - one event sink.** `__dz.on(fn)` returning an unsubscribe; the page calls `emit(type, detail)` from: the `keydown`
  handler (after any parameter change), `uploadStrip` (colour mode switch), `__playPath` / `__renderPath` (mode forced to
  deep), `pathApplyCR`, `__recordToggle`, `showProg` (progress, with frame and total as numbers), the deep-compile callback
  that sets `__deepReady` / `__deepErr`, and the export `finally` blocks.
- **H4 - seek and render to memory.** `__dz.seekPath(data, u, ease)` and `__dz.renderFrame({path, u, ease, longEdge,
  samples, tile, as})`. `__renderPath` and `__export` become thin callers of `renderFrame` that add the download.
- **H5 - compile state and context loss.** `compiling` in `telemetry()`; `webglcontextlost` / `webglcontextrestored`
  listeners that emit `error` (the page has none today).
- **H6 - hotkey set.** `__dz.hotkeys('fly' | 'all' | 'none')`; under `EMBED` default to `'fly'` so C, L, N, F/G, 9/0,
  `[` `]`, I, V, T/Y stop changing values behind the store's back.
- **H7 - `__dz.moveAlong`.** Same function as `__moveAlong`, published as product API.
- **H8 - no downloads and no dialogs under embed.** `__loadGradientFile`'s `alert`, the drop handler's `alert`, the BLA
  row's `alert`: report through H3 instead. (Smaller than it sounds: three call sites.)

Order of value: H1, H3, H4 unblock DDFS panels, undo and the timeline. H2, H6 remove the two ugliest interims. K3, H5 are
needed before the shell can call itself well-behaved.

### 2.5 How the iframe sits in the engine's viewport frame

```tsx
// W/deep-zoom/DeepZoomSurface.tsx  - the ONLY component that knows the transport
export function DeepZoomSurface() {
    const ref = useRef<HTMLIFrameElement>(null);
    useEffect(() => {
        let host: DeepZoomHost | null = null, dead = false;
        createIframeHost(ref.current!).then(h => { if (dead) { h.dispose(); return; } host = h; setDeepZoomHost(h); });
        return () => { dead = true; setDeepZoomHost(null); host?.dispose(); };
    }, []);
    return <iframe ref={ref} src="./deep-zoom-core/index.html?embed=1" title="Mandelbulb deep zoom renderer"
                   allow="fullscreen" className="absolute inset-0 w-full h-full border-0 block bg-black" />;
}

// in the app shell, same shape as fluid-toy
<ViewportFrame className="flex-1" showModeControls={false}>
    <DeepZoomSurface />
    <HudHost />
    <DomOverlays />
</ViewportFrame>
```

- **Size.** The page sizes itself from its own `window.innerWidth / innerHeight` (`CORE-EXTRACTION.md` section 3; inside an
  iframe that is the iframe's box), so filling the frame is enough. The frame's `canvasPixelSize` is written but the
  renderer ignores it: its resolution is the `framePx` parameter plus its own watchdog caps. Hence `showModeControls={false}`
  until section 3 gap 2 is closed.
- **Mouse.** Overlays above the iframe must be `pointer-events-none` except where they draw (last week's `PASS` class
  does this), because the page takes pointer lock on a click on its canvas.
- **Keys.** Keys go to the focused window. With the iframe focused, the engine's shortcut listener on the parent window
  hears nothing: the shell subscribes `host.onKey` and feeds its shortcut system; `host.setHotkeys('fly')` keeps the page
  from acting on the rest. After any click on shell chrome, call `host.focus()` (14 call sites did last week; do it once,
  in a `pointerup` handler on the dock, not per button).
- **Loop.** The iframe runs its own `requestAnimationFrame`. Do **not** register a tick for the iframe transport.
- **Host holder.** `W/deep-zoom/host/current.ts`: `setDeepZoomHost`, `getDeepZoomHost`, `useDeepZoomHost` (a
  `useSyncExternalStore` over the holder). Features, widgets and shortcuts get the host from here, never from the store.
- **Parameter push.** One subscriber, installed at boot: for each DDFS param in the mapping table, on change call
  `host.setParam`; on `ready`, push everything once (the store wins at boot); on `paramChanged`, write into the store.
- **Telemetry.** Keep it out of the DDFS store (8 writes a second would hit undo, presets and every selector). A small
  external store next to the holder, read with selectors (`useDzTelemetry(t => t.depth)`).

### 2.6 The swap to the module

`CORE-EXTRACTION.md` section 9 proposes `createDeepZoom(canvas, options) -> dz` with `dz.ready`, `dz.set(...)`,
`dz.step(now)`, `dz.start()` / `dz.stop()`, `dz.dispose()`, exports that "return Blobs; the download click stays in the page".
With H1-H8 in `__dz`, the module instance and `__dz` have the same members, so:

```ts
// W/deep-zoom/host/moduleHost.ts (later)
export async function createModuleHost(canvas: HTMLCanvasElement): Promise<DeepZoomHost> {
    const dz = createDeepZoom(canvas, { autoStart: false, input: 'canvas',
        getViewport: () => ({ width: canvas.clientWidth, height: canvas.clientHeight }) });
    const off = registerTick('deepZoom', TICK_PHASE./* phase */, () => dz.step(performance.now()));
    return adaptDz(dz, { transport: 'module', focus: () => canvas.focus(), dispose: () => { off(); dz.dispose(); } });
}
```

What changes: `DeepZoomSurface` renders `<canvas>` instead of `<iframe>` and calls `createModuleHost`; one tick is
registered (rule 1 of X3: the module's own `requestAnimationFrame` must never run under a host; rule 2: the module keeps
its own wall clock, so the tick's delta is ignored; rule 3: no synchronous compile from `step`). `adaptDz` is shared: write
the iframe transport as `adaptDz(iframe.contentWindow.__dz, ...)` from day one, so the second transport is about 30 lines.
What does not change: every feature, panel, widget, shortcut and smoke - provided none of them imports anything but
`DeepZoomHost` and the holder. Enforce it: the shell's smoke should grep that `contentWindow` and `__dz` appear only under
`W/deep-zoom/host/`.

Keep the iframe transport selectable by a query flag for a week after the swap (X4 says the same).

### 2.7 Last week's files, sorted

| File | Verdict | Goes to |
|---|---|---|
| `deep-zoom/bridge.ts` | **kept, the transport** | `deep-zoom/host/iframeHost.ts` implementing `DeepZoomHost`; types to `host/DeepZoomHost.ts`; the dive loop to `host/dive.ts` (uses only `telemetry`, `getView`, `moveAlong`, `onKey`, so both transports share it); `win` removed |
| `deep-zoom/store.ts` | **replaced** | `bridge` -> the host holder. `telemetry` -> the small telemetry store (kept, not DDFS). `bookmarks` -> the engine's state library. `path` -> a scene field / the timeline. `panel` -> the panel manifest and dock. `onboarded` -> Tutorial plugin. `toast` -> the engine's toast |
| `deep-zoom/DeepZoomApp.tsx` | **replaced** | an app shell of the fluid-toy shape (`ViewportFrame` + docks + TopBar). Key switch -> Shortcuts plugin. Progress scrape -> `host.on('progress')`. Loading and error cards -> one small overlay component inside `ViewportFrame` driven by `host.ready` and `on('compile' / 'error')` |
| `deep-zoom/main.tsx` | **replaced** | the gmt-shell boot: register features, build the engine store, install plugins. `window.__dzStore` -> the engine's own smoke handle |
| `ui/kit.tsx` | **deleted** | the engine's own controls. Its JSDoc gives the only reason it existed: "this app has no engine store" |
| `ui/TopBar.tsx` | **replaced** | TopBar + Menu plugins |
| `ui/LookPanel.tsx` | **replaced** | DDFS features + manifest panels (`WORK-PACKAGES.md` D5); the gradient row -> the palette / gradient UI calling `host.setGradientRamp` |
| `ui/HelpPanel.tsx` | **replaced** | Help plugin |
| `ui/Onboarding.tsx` | **replaced** | Tutorial plugin; its key detection uses `host.onKey` and `captureChanged` |
| `ui/LocationsPanel.tsx` | **replaced** | the state library (a location = a `DzView` + thumbnail from `host.thumbnail`) |
| `ui/starters.ts` | **kept as data** | the starter set of the same library |
| `ui/DepthGauge.tsx` | **kept as a registered custom widget** | `componentRegistry` (`W/components/registry/ComponentRegistry.tsx`), mounted in the viewport through a feature's `viewportConfig.componentId`; reads the telemetry store and `host.diveTo`; its `bridge.win.document` pointer-lock read becomes `captureChanged` |
| `ui/RecordPanel.tsx` | **split** | record / smooth / preview strip -> a registered widget in `componentRegistry`, referenced from the manifest. Sequence render -> RenderDialog plugin over `host.renderFrameBlob`. Scrubbing -> the animation timeline over `host.seekPath` (E2's `dzPath.u`) |

---

## 3. Gaps (what the engine cannot do yet, stated generically)

1. **A renderer that changes parameters itself.** DDFS assumes the store is the only writer. A renderer with its own
   hotkeys, playback and auto-adjustment needs a way to write values back without making an undo step per change and
   without echoing the value back to the renderer. Whether a feature setter can be called "silently" was not checked by
   this reader. Interim: `setHotkeys('fly')` removes the hotkey source; for the rest, write back inside one transaction
   and have the subscriber skip values equal to what the host last reported.
2. **A viewport child that sizes itself.** `ViewportFrame` writes `canvasPixelSize` and offers Fixed-resolution controls;
   a self-sizing surface (an iframe, or a renderer with watchdog caps) ignores both. Interim: `showModeControls={false}`
   and a `framePx` DDFS param. Generic fix: an optional "resolution sink" the frame's controls call instead of only the
   slice.
3. **Keys and mouse inside a child browsing context.** Parent-window listeners (shortcuts, and whatever reads
   `setMouseOverCanvas`, which `ViewportFrame.tsx` imports) see nothing while an iframe has the focus or the pointer.
   Interim: `host.onKey` re-feeds the shortcut system. Generic fix: the Shortcuts plugin accepts an extra event source.
   Goes away with the module transport.
4. **Per-frame output to memory.** The engine's render dialog and any video export need "frame at u -> pixels". The page
   cannot do it (H4). Interim: `__renderPath` (ZIPs of PNGs, downloaded by the page) behind the old Record UI; stills
   through `__export` with the page's own download. No scene metadata can be embedded until H4.
5. **A timeline track that drives a renderer-side spline.** Needs `seekPath(u)` (H4). Interim: `__samplePath` by time -
   usable for scrubbing, wrong for matching a rendered sequence (time vs eased arc length).
6. **Pause.** Nothing stops the page's loop (K3). No interim found; whether the browser stops `requestAnimationFrame` in a
   hidden same-origin iframe is unverified, and it would also drop the picture.
7. **Compile and error reporting after boot.** Only the first deep compile is visible. A BLA variant compile, a failed
   variant and a lost GL context are silent (H5). Interim: none; keep `bla` on `auto`, which the page says "never triggers a
   blocking compile".
8. **High-rate read-only state.** Telemetry at 8 Hz does not belong in an undoable store. Interim: the small external
   telemetry store. Generic: a documented "live readout" channel for HUD-type values, if the Hud plugin does not already
   have one (not checked here).
9. **Exact values in saved state.** Camera strings must never pass through `Number()`; `WORK-PACKAGES.md` E1 lists the
   three rules (register before the store is built, key must not start with `is`, strings only). Not re-verified here.

---

## 4. Unverified

- `W/deep-zoom/ui/*.tsx` were not opened beyond `kit.tsx`'s header and greps for `bridge.` / `.win`. The sorting in 2.7 for
  those files rests on their names, on `plans` text and on those greps.
- Which engine plugin APIs exist and their exact signatures: Shortcuts, Hud, Help, Tutorial, RenderDialog, state library,
  toast, palette UI, `registerTick` arguments, `TICK_PHASE` members. Only names and file presence were seen
  (`W/engine/plugins/` listing; `registerTick` and `TICK_PHASE` exist in `W/engine/TickRegistry.ts`).
- `ViewportFrame`'s Fixed-mode implementation (only the JSDoc was read). Whether an iframe inside its scaled container
  behaves.
- That the page sizes from `window.innerWidth` inside `frame()`: taken from `CORE-EXTRACTION.md` section 3; the lines were
  not read here. `renderFrameToBlob` taking its aspect from `canvas.clientWidth / clientHeight` **was** read.
- `__setBla`, `__blaMode`, `__setGuide`, `__getGuide`, `__setMarch` bodies; the full hotkey list (only `]`, `[`, I, N were
  read in the handler; the rest come from the state comments).
- `pathArc`, `sampleArc`, `pathApplyCR` bodies beyond the lines quoted; that `sampleArc` is side-effect-free apart from the
  camera.
- The gradient interim: that a `File` built in the parent window is accepted by the iframe's `FileReader` (same origin,
  expected to work), and the colour space the shading pass reads the strip in (A4 flags the same).
- The capture-phase key filter in 2.3 is a design, not a tested trick.
- How far the vendored `W/public/deep-zoom-core/index.html` has drifted from the master (only "differs" is known).
- Whether a hidden iframe's frame loop is throttled.
