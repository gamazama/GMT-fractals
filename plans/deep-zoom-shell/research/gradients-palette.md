# Gradients and palette — research for the deep-zoom gmt-shell

Reader: gradients-palette. Read 2026-10-07 in the worktree `H:/GMT/workspace-gmt/stable/.claude/worktrees/deep-zoom`
and the page `H:/GMT/workspace-gmt/mandelbulb_deepzoom/index.html` (branch kernel-perf).
Line numbers are hints only; grep the symbol.

## 1. Verified facts

### 1.1 What a gradient parameter is

- `engine/FeatureSystem.ts`, `ParamType`: `'gradient'` is one of ten param types.
  ```ts
  export type ParamType = 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'color' | 'boolean' | 'gradient' | 'image' | 'complex';
  ```
- `engine/typedSlices.ts`: `P['type'] extends 'gradient' ? GradientConfig`. The value stored at
  `store[featureId][paramKey]` is a `GradientConfig` OBJECT, not bytes.
- `utils/gradientRamp.ts` (top JSDoc, ADR-0122): a `GradientConfig` has exactly two forms.
  - STOP form: `stops.length > 0` (plus `colorSpace`, `blendSpace`).
  - RAMP form: `stops: []` plus `ramp`, a base64 STRING of 768 bytes = 256 texels x RGB
    (`RAMP_TEXELS = 256`, `RAMP_STRING_LENGTH = 1024`). It is kept a string on purpose: a
    `Uint8Array` does not survive `JSON.stringify` (undo, saves, share URLs).
- The store never holds a texture or a byte buffer. The 256x1 RGBA buffer is DERIVED on demand:
  `utils/colorUtils.ts`, `generateGradientTextureBuffer(input: GradientStop[] | GradientConfig): Uint8Array`
  returns `Uint8Array(256 * 4)` = 1,024 bytes, alpha 255, for either form. Its JSDoc: "Every render
  path in every app bakes its gradient texture here".
  - It applies the config's own `colorSpace` (`'srgb'` default, `'linear'`, `'aces_inverse'`) via
    `applyColorSpace`. A `'linear'` config yields LINEARISED bytes.
  - Malformed input returns an all-zero (transparent black) buffer, never throws.
- `renderGradientToRamp(input, colorSpace?)` (same file) is the float reader: 256 `{r,g,b}` objects.
  Pass `'srgb'` to force display bytes regardless of the config's flag.
- `FeatureSystem.getUniformDefinitions`: a gradient param with a `uniform` name becomes a
  `sampler2D` uniform with a null default. That only matters to engine-gmt's shader pipeline
  (`engine-gmt/engine/MaterialController.ts` bakes it with `generateGradientTextureBuffer`). A shell
  with its own renderer leaves `uniform` unset and bakes the bytes itself, exactly as fluid-toy does.

### 1.2 The editor

- `components/AutoFeaturePanel.tsx`, branch `if (config.type === 'gradient')`: renders
  `GradientParamEditor` (a lazy wrapper over `AdvancedGradientEditor`) with
  `value`, `onChange={(s) => handleUpdate(key, s)}`, `featureId`, `paramKey`. No app code needed:
  declare the param, the panel draws the full stop editor, with undo and preset round-trip.
- The editor has three injected seams, all set once by `palette/registerPaletteUI.ts`
  (`registerPaletteUI`): `setGradientEditorEntrance` (the My Gradients button in the editor header),
  `setGradientFavientsBridge` ("Save to My Gradients"), `setGradientStopFitter` and
  `setGradientStopReducer` (Add stops / Reduce Stops). Without `registerPaletteUI()` those slots are
  empty; the file's own comment calls the empty-slot path "untested".

### 1.3 How an app reads the bytes on change (the fluid-toy pattern)

- `fluid-toy/features/palette.ts`: the param is
  ```ts
  gradient: { type: 'gradient', default: DEFAULT_DYE_GRADIENT, label: 'Palette', ... }
  ```
  and `syncPaletteToEngine(engine, palette)` does
  ```ts
  if (palette.gradient) {
      const lut = generateGradientTextureBuffer(palette.gradient);
      engine.setGradientBuffer(lut);
  ```
- `fluid-toy/useEngineSync.ts`: it is driven by a React effect on the slice,
  `useEffect(() => { ... syncPaletteToEngine(e, paletteMod); }, [paletteMod, engineRef])`.
  So "on change" = the slice object identity changes -> re-bake 1,024 bytes -> push to the renderer.
  There is no engine-level "gradient changed" event; the app subscribes to its own slice.

### 1.4 Palette UI, favourites tray, send targets — how a shell installs them

Four calls, in this order (fluid-toy is the reference; every line below was read):

1. `fluid-toy/registerFeatures.ts` (side-effect module, BEFORE the store exists):
   `registerPaletteUI();` — registers components `panel-favients`, `palette-editor-dock`,
   `palette-quality-pad` and others, three features (`PaletteGeneratorFeature`,
   `PaletteFiltersFeature`, `PaletteImageFeature`, plus `PaletteEditorFeature` unless
   `{ standaloneStopsMode: false }`), three history providers, four document providers, and seeds
   the Presets group. NOTE: it registers the generator / filters / image FEATURES in every host —
   a shell gets those slices whether or not it shows their tabs.
2. Same file: one `registerSendTarget<FavientDragPayload>({ id, label, group: 'host', apply })` per
   place a favourite can land. fluid-toy's is `id: 'palette-gradient'` and writes through the
   global store handle: `store?.getState().setPalette?.({ gradient: { ...p.config } })`.
   `store/sendTargetRegistry.ts`, `SendTarget`: optional `editsParam: { featureId, paramKey }`
   links the target to a DDFS gradient param so the in-panel editor's My Gradients button points
   the shelf's Destination dropdown at itself; optional `reveal()` opens the panel that owns it.
   app-gmt sets both (`app-gmt/registerFeatures.ts`, `id: 'coloring-1'`); fluid-toy sets neither.
3. Same file: `setFavientStudioAction(() => window.open('gradient-explorer.html', '_blank', 'noopener'))`
   — the shelf's "Open in Gradient Explorer" header button.
4. `fluid-toy/panels.ts`: `favientsPanelEntry({ dock: 'right', order: 90 })` spread into the panel
   manifest (id `Favients`, label `My Gradients`, `component: 'panel-favients'`).
   `fluid-toy/main.tsx`: AFTER `applyPanelManifest`,
   `mountFavientsPanel({ storageKey: 'fluid-toy.favients.panel', paletteFilters: false })`, and a
   top-bar toggle `topbar.register({ id: 'favients-toggle', slot: 'left', order: 40, component: FavientsToggleButton })`.

Facts a builder will trip on (`palette/installFavients.ts` top JSDoc):
- "Adding another host without its own `storageKey` silently gives it app-gmt's saved window state."
- The favourites COLLECTION is shared on purpose across every app on the origin (key `gmt.favients`).
- Calling `mountFavientsPanel` before `applyPanelManifest` is a silent no-op (its `@assumption`).
- `panel-favients` is a `component:` manifest entry. It is the engine's own shared panel, wrapped by
  `favientsPanelEntry`; using it is not a new escape hatch.

### 1.5 Gradient Explorer -> another app, today

- `store/sendTargetRegistry.ts` is IN-PROCESS only. Consumers (grep `getSendTargets`):
  `palette/components/FavientsPanel.tsx`, `FavientsEditorEntrance.tsx`, `GradientStudioPanel.tsx`,
  `palette/core/favientTargets.ts`. No file under `gradient-explorer/` registers or reads a send
  target. So registering a target in the deep-zoom shell makes "Deep Zoom" a destination inside the
  deep-zoom shell's own My Gradients panel, and nowhere else.
- GX has exactly ONE cross-app destination, hard-coded: `gradient-explorer/FullscreenGradientOverlay.tsx`
  shows a button only when `activeMode?.id === 'fractal'`:
  ```tsx
  if (coords) openInFluidToy(coords, sourceConfig, sourceName);
  ```
  `gradient-explorer/fractalHandoff.ts`, `openInFluidToy`: writes a fluid-toy scene Preset to
  localStorage key `gmt.fluidToy.incomingScene` then `window.open('fluid-toy.html', '_blank', 'noopener')`.
  `fluid-toy/main.tsx` reads and removes that key at boot (the key string is duplicated as a literal).
- The other direction (app -> GX) has a generic, validated one-shot: `palette/core/explorerHandoff.ts`,
  `writeExplorerIncoming({ config, name, favId? })`, key `gmt.gx.incoming`, 2-minute lifetime;
  `palette/installFavients.ts`, `openGradientExplorer(handoff)` uses it. Its JSDoc: "The GMT -> GX
  direction only" — the owner cancelled a gradient hand-back to GMT on 2026-09-07 because the shared
  Recent group already carries GX's working gradient into every app's My Gradients.
- Consequence: a gradient made in GX ALREADY reaches the deep-zoom shell with zero new code, through
  the shared `gmt.favients` collection, as soon as the shell mounts the My Gradients panel.

### 1.6 What the page accepts today

`H:/GMT/workspace-gmt/mandelbulb_deepzoom/index.html`, section "Gradient palette loading":

- `uploadStrip(rgba, w)` — the real sink. NOT on `window`. Takes `Uint8Array(w*4)`, one row, any
  width. Uploads RGBA8 to texture unit 2, LINEAR filter, REPEAT in S, sets `accumReset = true`, and
  has a side effect:
  ```js
  if (colorMode === 0){ colorMode = 2; }       // give the gradient something to colour
  ```
- `gradientFromImage(img)` — NOT on `window`. Draws the image's TOP ROW into a 256x1 2D canvas and
  calls `uploadStrip(..., 256)`.
- `gradientFromText(txt)` — NOT on `window`. Parses "R G B" triplets (0-255 or 0-1); width = number
  of triplets.
- `window.__loadGradient(file)` — takes a File-like object. It reads `file.type` and `file.name`, so
  a bare `Blob` with `type: 'image/png'` works for the image branch (`file.name` undefined makes the
  regex false but `file.type` already matched). Returns a Promise resolving `'image'` or `'text'`.
- `window.__loadGradientFile()` — opens an OS file picker (`<input type=file>`), nothing else.
  Failure calls `alert(...)`.
- `window.__clearGradient()` — `gradientTex = null; accumReset = true;` back to the cosine palette.
  It does not restore `colorMode`.
- A page-level `drop` listener also feeds `__loadGradient`.
- Shader: `vec3 palette(float s){ if (uUseGradient == 1) return texture(uGradient, vec2(fract(s), 0.5)).rgb; ...`
  — the texel is used as-is, wrapped with `fract`. Uniform `uUseGradient` is `gradientTex ? 1 : 0`.
- `window.__dz` (`version: 1`): `settings()` and `getView()` carry `color` (0 plain / 1 iteration /
  2 orbit-trap) and `cscale`. NEITHER carries the gradient, and there is no getter for it. The page
  cannot report which gradient is loaded.
- `deep-zoom/bridge.ts`, `DzBridge`: `loadGradientFile(): Promise<unknown>` -> `call('__loadGradientFile')`
  and `clearGradient()` -> `call('__clearGradient')`. The bridge exposes only the PICKER; it has no
  path for bytes or a File. `__loadGradient` is not wrapped.
- `public/deep-zoom-core/index.html` (the copy the iframe loads) DIFFERS from the source page
  (`diff -q` reports a difference; the gradient block sits 1 line lower). Both have the same four
  gradient symbols. Any new handle must land in the master page and be re-copied.

## 2. Blueprint for the deep-zoom shell

### 2.1 The feature

One DDFS feature owns colour. Names and numbers only in labels.

```ts
// deep-zoom/features/color.ts
export const DeepZoomColorFeature = defineFeature({
  id: 'dzColor',
  tabConfig: { label: 'Colour' },
  params: {
    mode:     { /* enum: Plain 0 / Iteration 1 / Orbit trap 2  -> host.setColor(mode, scale) */ },
    scale:    { type: 'float', default: 1.0, label: 'Scale' },
    useGradient: { type: 'boolean', default: false, label: 'Gradient' },   // off = the page's cosine palette
    gradient: { type: 'gradient', default: DEFAULT_DZ_GRADIENT, label: 'Gradient',
                condition: /* useGradient */ },
    // no `uniform:` — the shell bakes and pushes the bytes itself
  },
});
```

`useGradient` exists because "no gradient" is a real state of the renderer (`__clearGradient`), and a
gradient param always has a value. Keep `colorSpace: 'srgb'` on the default: the page samples the
texel straight into `palette()` like its built-in cosine palette, which is display-referred.

### 2.2 The host interface (the only renderer-facing surface)

```ts
// deep-zoom/host.ts — part of the single DeepZoomHost interface
/** 256 texels, RGBA8, 1,024 bytes, texel 0 first. null = the built-in palette. */
setGradientRamp(rgba: Uint8Array | null): void;
```

The shell side is the same for both transports:

```ts
// deep-zoom/sync/useColorSync.ts
const color = useEngineStore((s) => s.dzColor);
useEffect(() => {
  host.setGradientRamp(color.useGradient ? generateGradientTextureBuffer(color.gradient) : null);
}, [color.useGradient, color.gradient, host]);
useEffect(() => { host.setColor(color.mode, color.scale); }, [color.mode, color.scale, host]);
```

Order matters once: push the ramp BEFORE the mode on boot / preset load, because `uploadStrip`
forces `colorMode` from 0 to 2. Re-sending the mode after the ramp restores the user's choice.

### 2.3 Interim route — today's handles, no page change

`__loadGradient` accepts a Blob with `type: 'image/png'`. Encode the 256x1 ramp as a PNG and hand it over:

```ts
setGradientRamp: (rgba) => {
  if (!rgba) { call('__clearGradient'); return; }
  const c = document.createElement('canvas'); c.width = 256; c.height = 1;
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(rgba), 256, 1), 0, 0);
  c.toBlob((blob) => { if (blob) call('__loadGradient', blob); }, 'image/png');
},
```

Costs of the interim route, all read from the page:
- Asynchronous twice (`toBlob`, then `Image` decode via object URL inside the page). A stop drag fires
  many changes; results can land out of order. Keep a sequence counter and drop stale blobs, or
  debounce to one push per animation frame.
- Every push sets `accumReset = true` (accumulation restarts) — same as the clean route.
- A 2D canvas round-trip is exact here only because alpha is 255 on every texel (no premultiply loss).
- Do not reach for `iframe.contentWindow.uploadStrip` as a shortcut: whether that top-level function
  is a property of the iframe's `window` was not checked (see Unverified), and it is not a declared
  handle either way.

### 2.4 Clean route — one added handle on the page

Add beside `__clearGradient` in the master page (then re-copy to `public/deep-zoom-core/`):

```js
// rgba: Uint8Array (or number[]) of w*4 bytes, one row. Synchronous. Does not touch colorMode.
window.__setGradientRamp = (rgba, w) => {
  const a = rgba instanceof Uint8Array ? rgba : new Uint8Array(rgba);
  const keep = colorMode; uploadStrip(a, w || (a.length >> 2)); colorMode = keep;
};
```

and optionally `gradient: !!gradientTex` in `__dz.settings()` so the shell can verify state in a smoke.
Bridge: `setGradientRamp: (rgba) => rgba ? call('__setGradientRamp', rgba, 256) : call('__clearGradient')`.
A `Uint8Array` created in the parent realm passes into the iframe; the handle copies it defensively
because `instanceof Uint8Array` is false across realms (the `new Uint8Array(rgba)` branch handles that).
After core extraction the module form is `dz.setGradientRamp(rgba | null)` on the object
`createDeepZoom(canvas, options)` returns — same signature as the host interface.

### 2.5 Palette suite install (copy of fluid-toy, four edits)

```ts
// deep-zoom/registerFeatures.ts  (side-effect, before the store)
featureRegistry.register(DeepZoomColorFeature);
registerPaletteUI();
registerSendTarget<FavientDragPayload>({
  id: 'dz-gradient', label: 'Deep Zoom · Gradient', group: 'host',
  editsParam: { featureId: 'dzColor', paramKey: 'gradient' },
  apply: (p) => {
    const store = (globalThis as { __engineStore?: { getState: () => { setDzColor?: (u: object) => void } } }).__engineStore;
    store?.getState().setDzColor?.({ gradient: { ...p.config }, useGradient: true });
  },
  // reveal: () => activate the Colour tab
});
setFavientStudioAction(() => openGradientExplorer(/* see 2.6 */));
```
```ts
// deep-zoom/panels.ts
favientsPanelEntry({ dock: 'right', order: 90 }),
// deep-zoom/main.tsx — after applyPanelManifest
mountFavientsPanel({ storageKey: 'deep-zoom.favients.panel', paletteFilters: false });
topbar.register({ id: 'favients-toggle', slot: 'left', order: 40, component: FavientsToggleButton });
```

The setter name `setDzColor` follows fluid-toy's `setPalette` for feature id `palette`; confirm the
generated name for the chosen feature id (unverified below).

### 2.6 Gradient Explorer listing "Deep Zoom"

Three levels, cheapest first:

1. Zero code: GX's favourites and Recent group already appear in the shell's My Gradients panel
   (shared `gmt.favients`). One click on a tile applies it through the `dz-gradient` send target.
2. Shell -> GX and back: use `openGradientExplorer({ incoming: { config, name } })`
   (`palette/installFavients.ts`). It hard-codes `gradient-explorer.html?from=gmt`, and GX's
   "Back to GMT" goes to `app-gmt.html` — wrong for a deep-zoom user. See gap G3.
3. A real "Open in Deep Zoom" destination in GX: today that means copying `fractalHandoff.ts`
   (a second hard-coded key + button). Do not. Build gap G2's generic handoff once, move fluid-toy
   onto it, then add deep zoom as a second entry.

## 3. Gaps (stated generically, with the interim workaround)

- G1. The renderer takes gradients only as a File/Blob or an OS picker; there is no handle that
  takes ramp bytes, and none that reports gradient state. Interim: PNG Blob through `__loadGradient`
  (2.3). Fix: `__setGradientRamp` (2.4), about 4 lines in the master page.
- G2. The engine has no cross-app "send to another shell" registry. `sendTargetRegistry` is
  per-page; GX's one cross-app destination is a hard-coded button, a hard-coded localStorage key
  duplicated as a string literal in two files, and a fluid-toy-shaped Preset. Generic form: an
  app-destination registry in `palette/core/` (id, label, href, one-shot key, `build(gradient, ctx)`),
  modelled on `explorerHandoff.ts` (versioned, timestamped, 2-minute lifetime, validated with
  `coerceGradientConfig`), with a shared boot-time `takeIncoming(appId)` reader. Interim: the shared
  My Gradients collection (level 1).
- G3. `openGradientExplorer` and GX's return link assume the caller is app-gmt
  (`'gradient-explorer.html?from=gmt'`, `BACK_TO_GMT_HREF = ... 'app-gmt.html'` in
  `gradient-explorer/v2/fromGmt.ts`). Generic form: `from=<appId>` resolved against the registry in
  G2. Interim: open GX bare, as fluid-toy does (`window.open('gradient-explorer.html', ...)`).
- G4. No engine-level "gradient param changed -> bytes" subscription. Each app writes its own
  effect and calls `generateGradientTextureBuffer`. Small; a shared hook
  `useGradientRamp(featureId, paramKey): Uint8Array` would remove the copy. Interim: the 6-line
  effect in 2.2.
- G5. `registerPaletteUI()` is all-or-nothing: it registers the generator, filters and image
  features and their document providers in every host. A shell that wants only the editor seams +
  the shelf still gets three extra slices in its store and saves. Generic form: an option like the
  existing `standaloneStopsMode`. Interim: accept them, as fluid-toy does; do not list them in the
  shell's panel manifest.
- G6. `mountFavientsPanel` ordering and the default storage key both fail silently (its own
  `@assumption`). Interim: always pass `storageKey`, always call after `applyPanelManifest`, and
  cover it with a smoke that opens the My Gradients panel.
- G7. The gradient is not part of the page's view/bookmark/path state (`__dz.getView` has `color`
  and `cscale` only). In the shell this is correct as long as the DDFS param is the single source of
  truth and the shell re-pushes the ramp after every iframe (re)load. Path playback and export
  inside the page use whatever texture is currently bound.
- G8. Colour pipeline of the gradient texel inside the page's deep pass is not characterised
  (display vs linear). If it turns out linear-lit, set the param default `colorSpace: 'linear'` so
  `generateGradientTextureBuffer` linearises, as app-gmt's coloring gradient does
  (`palette/core/gradientSeam.ts` comment).

## 4. Unverified

- Whether the deep pass applies an output gamma after `palette()`. One `pow(col, vec3(0.4545))` was
  seen at about line 697 of the page; which shader it belongs to was not checked.
- Whether `uploadStrip` is reachable as `iframe.contentWindow.uploadStrip` (depends on whether the
  page's main script is a classic script or a module; not opened).
- The exact generated setter name for a feature (`set${Feature}`); inferred from fluid-toy's
  `setPalette` for id `palette`. `defineFeature` itself was not opened.
- `AdvancedGradientEditor` internals, `FavientsPanel` Destination dropdown behaviour,
  `favientsPanelPersist`, `FavientsToggleButton` — referenced, not opened.
- `palette/installGradientFileClaim.ts`, `installGradientStudio.ts`, `installPaletteSettings.ts`,
  `installWorking.ts` exist in `palette/` and were not opened; a shell may want the file claim
  (drop a gradient PNG on the app) and the Gradient Studio popout.
- What differs between `public/deep-zoom-core/index.html` and the master page beyond a 1-line offset.
- `plans/deep-zoom/INTERFACE.md` and `plans/deep-zoom-in-gmt/*` were not opened for this area.
- ADR-0122 body; facts above come from `utils/gradientRamp.ts` JSDoc and the code.
