# Critic: builder - can BUILD-PLAN.md be built by parallel agents?

2026-10-07. Read-only pass, about 8 minutes. Nothing was run. Every code statement names the file
and symbol I opened; anything else is marked unverified.

## Verdict

Stage 1 can boot on the engine chrome: the four signatures it leans on are real (below). The plan
is not yet safe to hand to parallel agents, for five reasons: the smoke file has no owner in
stages 3 to 6; the stage-2 and stage-6 smoke steps go red on a correct build; most package
acceptances are the end-of-stage smoke, so no package can go red on its own; two acceptance tests
cannot go red at all; and several shared files are edited by packages that do not own them.

## Signatures checked - all match

| Plan snippet | Code | Result |
|---|---|---|
| `installViewport({enabled:false})` | `engine/plugins/Viewport.tsx` `installViewport = (options?: Partial<ViewportAdaptiveConfig>)`; the subscription reads `cfg.enabled` | matches |
| `installTopBar` + `unregister('adaptive')` | `engine/plugins/TopBar.tsx` `installTopBar` registers ids `project-name`, `fps`, `adaptive`; `topbar.unregister(id)` exists | matches |
| `registerCoreSettings({autosave:null})` | `store/coreSettings.ts` `CoreSettingsOptions.autosave?: ... | null` - "`null` registers no autosave rows" | matches |
| Telemetry -> `viewport.reportRenderFps` | `engine/plugins/Viewport.tsx` `viewport.reportRenderFps(fps)`; `topbar/FpsCounter.tsx` shows `renderFps` when it is >= 0 | matches |
| `window.__store` for the smoke | `store/engineStore.ts`: `(window as any).__store = useEngineStore;` unconditional | matches |
| `[PanelRouter] widget ... not in componentRegistry` | `components/PanelRouter.tsx` line 84, same text | matches |
| holder via `defineAppHandles` "if it does not import the store" | `engine/appHandles.ts` imports only `useSyncExternalStore` from react | resolved: use it |
| build wiring | `vite.config.ts` has the `'deep-zoom'` input; `knip.json` lists `deep-zoom/main.tsx`; `tailwind.config.js` has `./deep-zoom/**`; `package.json` has `smoke:deep-zoom` and `sync:deep-zoom-core` | nothing missing for stage 1 |

## Findings

### 1. (missing) No package owns the smoke file in stages 3, 4, 5, 6

"Smoke growth" adds steps in every stage, and the gates need them. Only S1-3 and S2-7 own
`debug/smoke-deep-zoom.mts`. Stage 3 (S3-1..6), stage 4 (S4-1..5), stage 5 (S5-1..2) and stage 6
(S6-1..4) list no owner. Stages 4 and 5 are also allowed to run side by side, so two stages would
write the same file. Fix: add S3-7, S4-6, S5-3, S6-5 "Smoke", each after its integrator; and say
that when 4 and 5 overlap, the smoke package lands in the same order as the integrators.

### 2. (wrong) Stage-2 smoke goes red on a correct stage-2 build

Stage 2 step: "open every dock tab (Locations, Formula, Flight, Light, Colour, Quality) and assert
at least one labelled row or widget rendered in each". But S2-6 builds the manifest with "rows
that exist so far". In BLUEPRINT section 4 the `Locations` tab holds only `dz-starters`,
`dz-locations`, `dz-location-text` - all built in stage 3 (S3-1, S3-3). So in stage 2 either the
tab is absent (step red) or it holds two section labels and nothing else (step red, or green only
if a section label counts, which makes the assert meaningless). `Flight` survives only because
`camera.u` (S2-5) is a row there. Fix: the stage-2 step lists the four or five tabs that exist;
stage 3 adds Locations; stage 6 adds the Flight widgets. Or S2-6 leaves empty tabs out and the
step reads the tab list from `panels.ts`.

### 3. (wrong) Stage 6 cannot meet its own smoke or its "what the owner sees" without R-H4

S6-2: "R-H4 renderFrame - no interim ... the RenderDialog is not installed". The stage-6 smoke
says "press Render, the dialog opens", and S6-4 says `installRenderDialog`. R-H4 edits the
owner's master page, which is gated on DECISIONS D2. So stage 6 either fails its smoke or installs
a dialog the core cannot honour. `engine/animation/renderPopupRegistry.ts` today exports only
`registerRenderPopup`, `getRenderPopup`, `subscribeRenderPopup` - `openRenderPopup` (E22) is new
work, and `MainThreadEncoder.encodeCanvas(canvas: HTMLCanvasElement | OffscreenCanvas, ...)` in
`engine/export/videoEncoder.ts` is the signature E23 must widen. Fix: split stage 6 into 6a
(record, track, scrub, ZIP adjunct, still) and 6b (dialog + MP4, starts when R-H4 has landed);
move "press Render" and "render 4 frames" to 6b; make R-H4 a named entry gate, not a footnote.

### 4. (weak) Most packages have no test of their own - the acceptance is the end-of-stage smoke

S1-1 ("smoke stage-1 steps ready and fly"), S1-2 ("all stage-1 smoke steps"), S2-3 ("smoke drag
Detail"), S2-5, S3-1..4, S4-1..3, S5-1, S6-1..2 all name smoke steps. Those steps exist only after
the stage's smoke package, which runs after the integrator. In stage 1 it is circular: S1-2 is
accepted by S1-3's script, S1-3 is accepted by running against S1-2's app, and the plan says all
three "start together". With five agents landing before any step can run, a red step is not
attributable. Fix: give each package a gate it can run alone - `npm run typecheck` on its files
plus one `tsx` script (paramMap: every feature param id has a map row and the reverse; adaptDz:
a fake `__dz` object round-trips a view with three `cam` strings unchanged; presetFields: a
serialize/parse round trip). State plainly that stage 1 is sequential at the end:
S1-1 -> S1-2 -> S1-3.

### 5. (weak) Two acceptance tests cannot go red

- S1-0: "red if a DOM type leaks into `DeepZoomHost.ts` (the file imports nothing)". DOM types are
  globals; a leak needs no import. And the blueprint itself puts one in the interface:
  BLUEPRINT line 326 `canvas(): HTMLCanvasElement | null`. The test passes with the leak present.
  Fix: either drop the claim, or grep the file for `HTML|Window|Document|Element` with `canvas()`
  as the one listed exception.
- S2-1 / S2-2: "one unit-level assert that every default equals the page's (`host.getParams()` at
  boot, in the smoke)". S2-3 pushes the whole store to the page on `ready` ("store wins"), so by
  the time the smoke reads `getParams()` the page already holds the store's values. The compare is
  true whatever the defaults are. Fix: read the page's params before the first push (the transport
  keeps a `bootParams` snapshot taken at `ready`) and compare against that.

### 6. (wrong) Shared files edited outside their owner in stages 3 to 6

- `storeTypes.ts` is owned only by S2-6. Stage 3 adds store fields `savedLocations`,
  `activeLocationId`, `dzView`, `dzPath` (BLUEPRINT line 459: "the two declare-module blocks").
  No stage-3 package owns it; S3-1 and S3-2 would both need to touch it.
- `registerFeatures.ts` and `setup.ts` are not owned by S3-5 or S4-4. BLUEPRINT line 30 puts
  store-free widget registration (`dz-starters`, etc.) in `registerFeatures.ts`.
- `features/colour.ts`: S2-2 then S5-1 - fine across stages, but stage 5 "needs only stage 2" and
  may run beside stage 3, whose S3-2 writes preset fields for the colour slice. Unverified whether
  they collide; name it.
- S1-2 "deletes `deep-zoom/ui/*`" while S2-5, S3-1, S3-3, S4-2 port from those files via a git tag
  the builder must ask the owner to create. If the tag is not made before S1-2 lands, four later
  packages have no source. Make "tag created" the first line of stage 1, before S1-0.
- `deep-zoom/renderer/` (`core.js`, `port/`) exists in the tree today and no package mentions it.
  `npm run orphans` is a gate; say whether it stays (for S7-1) or goes.
Fix: every integrator owns the full shared set (`main.tsx`, `registerFeatures.ts`,
`storeTypes.ts`, `panels.ts`, `setup.ts`, `DeepZoomApp.tsx`), as the "Rules" paragraph already
says but the stage tables do not.

### 7. (weak) Smaller mismatches worth one line each

- S2-3 "Needs: S1-1" - it also needs the param ids from S2-1 and S2-2 (the map is keyed by them).
  Freeze the id list from BLUEPRINT section 3 as the contract, or it is not parallel.
- S2-4 calls the overlay renderer "12-line". `fluid-toy/components/DomOverlays.tsx` is two
  components (`DomOverlays` + `DomOverlayInstance`, about 28 lines) with a per-overlay selector
  whose header says a selector-less read "trips React's max-depth guard"; `fractal-toy/
  FractalToyApp.tsx` has its own inline `DomOverlays` (line 36). The lift must keep the
  per-overlay subscription; add that to the package.
- Stage-2 step "depth readout text matches `/^\d\.\d\de-\d+$/`": last week's formatter
  (`deep-zoom/ui/DepthGauge.tsx` line 53) is `d.toExponential(2).replace('e+', 'e')`, which gives
  `1.50e0` for a depth of 1 or more. Whether the home view sits at a depth below 1 is unverified;
  use `/^\d\.\d\de-?\d+$/`.
- `smoke:chrome` launches with `chromium.launch({ args: LAUNCH_ARGS })` and `BOOT_TIMEOUT_MS =
  30000` (`debug/smoke-chrome.mts`). "BOOTED" there means no layer covering the viewport. The plan
  removes the splash "on ready, 12 s fallback", so it passes, but the stage-1 smoke allows the
  renderer 120 s to be ready - on the chrome smoke the top bar is clicked while the renderer is
  still compiling. Whether a page error inside the iframe reaches Playwright's `pageerror` on the
  parent page is unverified.

## Not checked

Stage 3 state-library and SceneIO signatures, the tutorial and help installs, the palette calls,
`MobileViewportShell`, the key relay against `engine/plugins/Shortcuts.ts` beyond confirming the
listener is `root.addEventListener('keydown', _listener, capture)` and that the input filter reads
`document.activeElement`. The other critics or a second pass should take those.
