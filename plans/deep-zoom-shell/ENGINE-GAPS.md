# Engine gaps - where the engine cannot yet do what this shell needs

Architect pass, 2026-10-07. Each gap is stated for any app. The "engine change" column uses no
application words. Sources are the reader maps in `plans/deep-zoom-shell/research/` (tag in
brackets); I did not re-open the engine files. Size: S = under half a day, one file plus its
callers; M = one to two days, several files or a behaviour other apps see; L = more.
"Now" = worth doing inside this build because the interim is a copy or a hack; "Later" = the
interim is honest and cheap.

Corrected the same day after three critics. Rows E2, E4, E11 and E22 were wrong or under-counted
and are rewritten; E36, E37, E38 are new. For those rows I opened the engine files named.

**Reconciled 2026-10-08** (DECISIONS K1-K5). The renderer is now a module mounted in the shell's
own document, so the two gaps that existed only because a second document sat inside the first -
E5 (keys) and E34 (file drops) - are dropped; they are listed in section C with the reason. Section
C no longer tracks handles on the standalone page: that page is frozen, and the handles are module
packages in BUILD-PLAN. New section S lists the generic seams the navigation and Light Studio
reworks add (`GMT-SYSTEMS.md` section 6), once each, with the ADR each needs. Where a row below
says "the page", read "the module".

**Updated 2026-10-10** (`ROUTES.md`, DECISIONS K11 to K15). The owner chose to keep the exact camera
on the timeline, so:
- **E16's interim no longer holds.** The exact view rides as a payload on the keys of an exponential
  track (`ROUTES.md` R2). That is a smaller change than E16's string-backed param type and stands in
  for it in this shell; E16 itself stays in the backlog.
- **E18's interim stands**: the track is `camera.depth`, which lands in the Camera group.
- **E24 moves into the build** (`ROUTES.md` R6): PNG frames to a folder are the lossless route now
  that the module's own ZIP render is dropped from the plan. E22 and E23 move with it.
- **E37 is still open and bites**: `Space` is a fly key in Fly mode, and a `when` that fails swallows
  the key instead of letting another binding take it.
- **New, all in `ROUTES.md` R2**: the camera-key registry says which tracks are released while the
  camera is recorded (today every `camera.` track is); the exponential-track tool faults (`@bug
  PRODUCTION` in `engine/animation/logTrackRegistry.ts`); the camera pair evaluated from the deeper
  end of a leg; the frame rate in a saved scene.

## A. Gaps this build should close in the engine (small, the interim would be a copy)

| # | Gap, stated generically | Proposed engine change | Interim in the shell | Size | ADR | When |
|---|---|---|---|---|---|---|
| E2 | Features can declare a viewport overlay, but no shared component renders them. **Done 2026-10-08 (package S2-4): `engine/plugins/viewport/FeatureOverlays.tsx` is the one host, with a `type` prop for scene overlays.** Before that, **four** sites (five loops) carried their own copy of `featureRegistry.getViewportOverlays().filter(o => o.type === 'dom')`: `fluid-toy/components/DomOverlays.tsx` (two components, 42 lines, per-overlay selector), `fractal-toy/FractalToyApp.tsx` (inline), `app-gmt/AppGmt.tsx` (per-overlay selectors), and the engine's own `components/ViewportArea.tsx`. | **One** `<FeatureOverlays/>` host in `engine/plugins/viewport/`, lifted from the per-overlay-selector version; **all four sites switch to it**. Anything one copy has and the others lack becomes a prop. | None acceptable: a fifth copy, or an app-to-app import. | S-M (touches app-gmt; needs its boot and chrome smokes) | no | Now (stage 2, S2-4) |
| E8 | Scene snapshots have one pixel source: a synchronous canvas element and `toBlob`. A surface that can only hand back an image later, or whose buffer is cleared between frames, cannot supply the PNG [scene G3]. | `installSceneIO({ getSnapshot?: () => Promise<Blob | null> })`, preferred over `getCanvas` when present. | Pass the surface's canvas; if the PNG is blank, the transport keeps a 2D canvas it repaints from the renderer's own capture. | S | no | Now (stage 3) if the first real-GPU run shows a blank PNG |
| E22 | The render dialog can only be opened from the timeline toolbar [timeline G6]. | `openRenderPopup()` on the popup registry so a menu item or a panel button can open it. | None once the dialog is installed: the Flight strip's Render button is the route to it. Today the registry exports only `registerRenderPopup`, `getRenderPopup`, `subscribeRenderPopup`. | S | no | Now (stage 6b, S6b-2) |
| E23 | The video encoder's `encodeCanvas` is typed for canvases, though its body accepts any image source [timeline G4]. | Widen the parameter to `CanvasImageSource`. | Draw the bitmap into a shell-owned 2D canvas first (one copy per frame). Today's signature: `encodeCanvas(canvas: HTMLCanvasElement | OffscreenCanvas, frameIndex)`. | S | no | Now (stage 6b, S6b-2) |
| E21 | Key Cam creates tracks labelled with the raw id [timeline G10]. | `registerCameraKeyTracks` accepts `{ id, hidden?, label? }`. | Create the track with a label before Key Cam can. | S | no | Later |
| E36 | A state library's slot keys (digits recall, modifier + digit saves) cannot be conditional. `engine/store/installStateLibrary.ts` `SlotShortcutOptions` has `count, category, saveModifier, savePrefix, recallPrefix` and no `when`, so an app with a captured-pointer or modal mode cannot stop a stray digit from applying a saved state. | `SlotShortcutOptions.when?: () => boolean`, passed to both registrations. | A higher-priority do-nothing shortcut on the nine digits while the mode is on. `slotShortcuts: false` is not an interim: it also removes the menu's slot rows. | S | no | Now (stage 3, S3-0) |
| E37 | The timeline registers its own `t` and `Space` shortcuts inside `components/TimelineHost.tsx`. `Space` is gated by `when: cameraMode !== 'Fly'` - one app's store field - and `t` has no gate. An app cannot say "not now" without that field. | A `shortcutsWhen?: () => boolean` prop on `<TimelineHost>` (or a registered predicate) that both registrations honour; the `cameraMode` test becomes that app's predicate. | The app registers the same keys at `priority: 10` with its own `when` (the dispatcher lets priority break ties in one scope). | S | no | Interim until N5 (10 lines, the dispatcher's own rules). **Needed at N5**: from then `Space` and `C` are fly keys in this shell and there is no captured mouse to gate on, so the predicate replaces the interim |
| E38 | The shared saved-state list (`components/StateLibraryPanel.tsx`) has no per-row secondary line and no sort: `StateLibraryPanelProps` has `onRename`, `onReorder`, `presets`, `toolbarBefore/After`, `footer`. A renamed row loses whatever its default label carried, and order is by hand only. | Two optional props on the master panel: `renderMeta?: (snap) => ReactNode` and `sortBy?: (a, b) => number` (drag-reorder off while set). | None acceptable: a hand-built list beside the master panel. | S | no | Now (stage 3, S3-0) |

## B. Gaps with an honest interim - queue for the engine backlog

| # | Gap, stated generically | Proposed engine change | Interim in the shell | Size | ADR |
|---|---|---|---|---|---|
| E1 | No shared app-shell layout. About 40 lines of the same JSX are copied per app and have already drifted (bare store subscription in one, a missing loop driver in another); only one app has a phone layout [boot gap 1] [conv gaps 1, 2, 6]. | An `<AppShell>` in `components/layout/` with a slot for the viewport content, flags for left dock and timeline, the phone root and the floating-panel map inside. All shells adopt it. | Copy fluid-toy's tree, with granular selectors. | M | yes |
| E3 | The default top bar always registers the adaptive-resolution badge; clicking it turns a loop on that the app may not run [boot gap 2]. | A per-default opt-out on `installTopBar`, or the badge carries a `when` tied to the app having opted in. | `topbar.unregister('adaptive')`. | S | no |
| E4 | The viewport frame's **Fixed size** has no sink: a surface that sizes itself cannot be told the width and height the user picked [boot gap 4] [host gap 2]. The **scale half is not a gap** - `engine/plugins/Viewport.tsx` `setRenderScaleSource({ use, steps, formatLabel? })` already lets an app point the in-canvas pill at its own number (app-gmt points it at `quality.aaLevel`); the pill shows only in Fixed mode. | An optional resolution sink (`onFixedResolution(width, height)` or a registered source like the scale one) that the frame's Fixed controls call. | `showModeControls={false}`, stated as a decline in the blueprint; frame size is a DDFS param and a readout widget shows drawn against asked. | S-M | no; owner call D14 on doing it inside this build **Closed 2026-10-17 without a sink** (`381e44c4`: the deep zoomer's surface reads the Fixed box). |
| E6 | Shortcut descriptions and categories are collected and shown nowhere; every app hand-writes its shortcuts page [keys gap 2]. | A help-topic builder fed by `shortcuts.list()`. | Generate the markdown in the app's topic loader. | S | no |
| E7 | A held Shift turns `B` into `Shift+B`; there is no modifier-insensitive binding [keys gap 9]. | `ShortcutDef.anyShift`. | Register the key twice. | S | no |
| E9 | Scene autosave storage keys are global constants while autosave settings are per app; two apps on one origin share the recovery slot [scene G6]. | An `autosaveKeyPrefix` option on `installSceneIO`. | Use Session only; do not mount the unsaved-work guard. | S | no |
| E10 | A state library has no persistence. Saved rows vanish on reload in every app that does not hand-roll storage [scene G1]. | `installStateLibrary({ persist: { storageKey, compact? } })`: restore before first render, write on change, drop thumbnails on quota. | A 30-line mirror to one storage key. | S-M | yes, short - it reverses the file's stated "persistence is app-side" |
| E11 | A preset field cannot say "I am the camera" (so moving marks the scene unsaved - the exclusion is a hardcoded three-key list) [scene G2]. "Leave me out of share links" is **not** a gap: state registered with the document registry (`store/documentRegistry.ts`) is in scene files and never in a share string, because `getShareString` calls `getPreset({ includeScene: true })` without `includeDocuments`. | `PresetField.dirty?: false`. | Do not mount the unsaved-work guard. Share-excluded state uses document providers. | S | no |
| E12 | Param undo entries carry no label, so the tooltip reads "Undo: param" [scene G5]. | `endParamTransaction(label?)`. | Accept the tooltip. | S | no |
| E13 | No way to mark a param or a feature as session-only (not saved, not in undo, no keyframe button) [params G2]. A grep of `engine/FeatureSystem.ts` for `transient` found nothing; the full param field list in [ddfs 1.2] has no such flag. | `transient: true` on a feature definition or a param. | Keep it a normal feature and reset it in a preset field's `deserialize`. It still appears in saved files and in undo. | M | yes - it qualifies "every param is animatable and undoable by construction" |
| E14 | A param cannot show a live effective value beside its control when the renderer adjusts it (a user floor plus an automatic value) [params G1]. | `ParamConfig.effective?: () => number | string` rendered read-only next to the control; or a generic read-only row type. | A registered readout widget placed above the slider. | S-M | no |
| E15 | The feature setter has no equality gate and no origin tag; any write re-fires every subscriber, so two-way sync with a renderer needs an app-side guard [ddfs gap 3] [host gap 1]. | An equality short-circuit in the generated setter, or a `{ origin }` option subscribers can read. | Per-key "last pushed" cache in the sync layer. | M | yes - about 20 sites re-derive the setter |
| E16 | No number type with more than f64 precision; such a value gets no panel row, keyframe or preset field [ddfs gap 1] [timeline G11]. | A string-backed high-precision param type. | Not needed here: the exact values stay with the renderer and travel as strings in a preset field; the timeline carries one plain float. Write down that the two-word track scheme stops near 1e-32 so nobody extends it. | L | yes |
| E17 | The manifest's `feature` item cannot pass `keyframes`, `hints`, `isDisabled`; manifest widget ids are not validated at boot [ddfs gaps 5, 6]. | Add the optional fields; extend `validateComponentRefs` to walk the manifest. | Accept defaults; the smoke opens every panel. | S | no |
| E18 | Timeline track groups are a hardcoded list keyed on specific feature names; unknown tracks all land in one group [timeline G7]. | `registerTrackGroup(prefixOrPredicate, group)` or a `timelineGroup` field on the feature. | Name the camera feature `camera`; accept the default group for the rest. | S-M | no |
| E19 | Angle interpolation is chosen by substring of the track id (`rot`, `phase`, `twist`) [timeline G8]. | `registerAngleTrack(id)` or a param flag, with the substring rule kept as fallback. | Name params so only radian angles contain those substrings. | S | no |
| E20 | Registered animation binders are invisible: no live value, no dirty state, no way to add a track from the UI [timeline G9]. | `read()` on the binder entry, consumed by the live-value lookup and Key Cam. | Back every animated value with a param. | M | no |
| E24 | No image-sequence writer in the shared export code; the encoder throws on sequence formats [timeline G5]. | A main-thread sequence sink in `engine/export/` (directory handle, one file per frame) selectable in the render dialog. | Video formats in the dialog; the renderer's own ZIP export as a render adjunct. | M | maybe - if it sets the pattern for all apps |
| E25 | The HUD has seven corner and centre slots; no edge or full-height slot [keys gap 4]. | `left` / `right` edge slots. | A tall instrument is a viewport overlay. | S | no |
| E26 | The tutorial has one presentation (a 360 px card), no per-step "already done, skip", and `onExit` does not run when a lesson ends or is skipped [keys gaps 5, 6]. | Lesson-level `presentation: 'card' | 'strip'`; step-level `skipWhen(store)`; run `onExit` on end. | Accept the card; fold already-done checks into one `or` trigger; no step relies on `onExit`. | M | no |
| E27 | Help topic categories are a closed list of one app's words [keys gap 7]. | Make the category an open string with the known list as suggestions. | Use 'General', 'Export', 'Getting Started'. | S | no |
| E28 | No cross-app "send this gradient to another shell" registry; the one existing route is a hardcoded button, a storage key duplicated as a literal, and a payload shaped for one app. The return link from the gradient app assumes one caller [palette G2, G3]. | An app-destination registry (id, label, href, one-shot key, build) with a shared boot-time reader; `from=<appId>` resolved against it. | The shared My Gradients collection already carries gradients across apps with no code. | M | yes |
| E29 | The palette UI install is all-or-nothing: three generator features and their document providers land in every host's store and saves [palette G5]. | An option to install the editor seams and the shelf only. | Accept the extra slices, as fluid-toy does. | S | no |
| E30 | On a phone, left-dock panels are dropped unless they carry `showIf` or are open; the breakpoint test is written in 8 places [conv gaps 3, 4]. | A manifest field for the phone dock; one breakpoint source. | Out of scope until stage N puts the on-screen sticks in this shell (DECISIONS D10, re-opened). | M | with E1 |
| E31 | "Apply on confirm" params are wired to one app's compiler panel [ddfs gap 4]. | A registrable handler for compile-mode writes. | Plain params; the sync layer debounces heavy ones. | M | yes |
| E32 | No documented channel for high-rate read-only values; a HUD item's `when` only re-evaluates on registry change [host gap 8] [keys 4]. | A small "live readout" store helper the HUD and widgets subscribe to. | The shell's own telemetry store; widgets subscribe and return null. | S | no |
| E33 | A throw in the install chain before React mounts is a blank page [boot gap 7]. | A `bootApp(fn)` helper that catches and renders the error boundary with `initialError`. | try / catch in `main.tsx`. | S | no |
| E35 | Generic setters still emit on one app's event bus, and the auto panel imports from that app's plugin library [ddfs gap 7, trap 10]. | Backlog note only. | Ignore. | - | - |

## S. Generic seams added by the navigation and Light Studio reworks

From `GMT-SYSTEMS.md` section 6, each listed once. They are not gaps with an interim in the shell:
they are the shape GMT's own systems take so a second renderer can use them. "No application
words" holds for each. ADR numbers are taken at write time (0131 and 0132 exist on the audio branch).

| # | Seam, stated generically | First used by | Lands in | ADR |
|---|---|---|---|---|
| S1 | **Displacement sink.** Navigation emits displacements; the renderer owns the position | the fly integrator; later orbit and camera undo | stage N, package N2 | new: "Navigation emits displacements" (covers S7) |
| S7 | **Renderer-free input hook** with a wheel-step function, a suppress predicate and three activity edges | GMT, this shell, fractal-toy | stage N, package N3 | under S1's ADR |
| S2 | **Scene probe.** A source of raw distance that keeps publishing its smoothed value; `pick(x, y)` and `plane()` as optional members. Not needed to fly: the distance is a plain argument of the integrator | later: a shared HUD, the Reset prompt, light drag-in, focus lock, an orbit pivot | not in stages N or L | its own ADR when built |
| S3 | **View frame.** Orientation, relative position, length scale, surface normal and declared support, as plain values built by whoever calls | the light UI, the light packer, gizmos, `OverlayProjection.storeToWorld` | stage L: drafted in L3, finished in L4 | new: "Lights resolve against a view frame" (covers S4, S6) |
| S4 | **A third frame on placed things** (`frame: 'surface'`, stored only for the third value, with `fixed: true` beside it) **and a length scale the renderer declares** rather than one stored on the thing. A control lists only the frames the running renderer declares | lights now; fog distances, focus distance, drawn shapes later | stage L, package L4 | same ADR as S3 |
| S6 | **Light packing as a pure function** taking the modulation map and writing in place | GMT's worker, this shell's adapter | stage L, package L2 | under S3's ADR |
| S5 | **Surface-inputs shading.** Footprint as an argument, a shading-only builder variant that still carries the miss handler, fog and environment, shadow and occlusion providers by name | route B only: this renderer's shading pass built from GMT's chunks | after stage 7, its own decision (GMT-SYSTEMS 8.8) | new: "Shading takes a surface" |
| S8 | **Post pass over any colour texture** | GMT, this shell, fluid-toy | after stage 7 (GMT-SYSTEMS 8.10) | new: "Post-process runs outside the worker" |
| S9 | **Mappings declare their inputs; options narrow by capability** | colouring menus, later texturing | with the colour work, not staged here | ADR-0059 is append-only: a dated update block if its decision stands, a superseding ADR if not |
| S10 | **Providers with today's behaviour as the default**: camera-undo state, export frame source, histogram data, bucket status | several | as each consumer arrives | none (no decision changes) |

So this plan's stages write two ADRs: one with N2 (S1 + S7) and one with L3 / L4 (S3 + S4 + S6).

## C. Dropped, and where the old section C went

| # | Was | Why it is gone |
|---|---|---|
| E5 | A second key root for the shortcut dispatcher, so keys pressed inside an embedded document reach it | There is no second document. The module listens on the viewport frame element (`keyTarget`) with its own shortcuts off (`shortcuts: false`), and the dispatcher on `window` sees every key (`deep-zoom/renderer/core.d.ts`). A popout window would bring the gap back; nothing here needs one |
| E34 | File drops over a second document never reaching the window-level drop zone | Same reason. The module's drop listener is off (`dropTarget: null`) and the engine's drop zone owns drops |

The old section C listed handles missing from the standalone page (H1 to H8, K1 to K3). The page
is frozen (DECISIONS K1). Each is now a change to `deep-zoom/renderer/` - BUILD-PLAN, "M packages".
Three of them already exist as module options and need a test, not a build: a hotkey switch
(`shortcuts`), no dialogs under embed (`onNotice`), context loss (`onContextLost`,
`instance.contextLost`).


## D. Wiring every new shell needs (not gaps)

A row in `debug/smoke-chrome.mts` `APPS`; `deep-zoom/**` in `.claude/rules/sibling-apps.md` `paths:`
plus its table rows, then `npm run check:rule-guards`; `docs/modules/deep-zoom/index.md`;
`npm run context:map` [conv 1.9, 2.5 item 13]. Note the name clash: `.claude/rules/deep-zoom.md`
scopes `engine/fractal/deepZoom/**`, a different subsystem [conv 1.9].
