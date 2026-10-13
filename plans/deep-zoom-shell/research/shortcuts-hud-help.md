# Shortcuts, HUD, Help, Tutorial, toasts — research for the deep-zoom gmt-shell

Read-only pass, 2026-10-07. Every claim names the file and symbol read. Paths are relative to
the worktree root unless they start with `H:/`. "The page" = `H:/GMT/workspace-gmt/mandelbulb_deepzoom/index.html`
(3976 lines; the embedded copy is `public/deep-zoom-core/index.html`, its keydown listener sits one line lower, 2362).

---

## 1. Verified facts

### 1.1 Shortcuts — `engine/plugins/Shortcuts.ts`

- **Register:** `shortcuts.register(def: ShortcutDef)`; the registry is a `Map<id, def>`, same id replaces
  and keeps its original position. Fields: `id, key, scope?, priority?, handler, description?, category?,
  when?, consume? (default true), ignoreInputs?`.
- **Key syntax:** `'Mod+Z'`, `'Shift+Ctrl+Z'`, `'Escape'`, `'Space'`, `'Home'`, `'Backspace'`, `'F1'`; single
  letters are case-folded (`normalizeKey`, `canonicalNamedKey`). `keyFromEvent` builds the key from
  `e.key` (and `e.code === 'Space'`), so **Shift+letter is a different key from the letter**
  (`'Shift+B'` does not match a `'B'` binding).
- **Scopes:** `_scopeStack` starts as `['global']`. `shortcuts.pushScope(name)` / `popScope(name)`, or the
  hook `useShortcutScope(scope, active)`. `resolve()` scores `scopeIndex * 10000 + priority` and returns
  `matches[0]`; ties go to the FIRST registered. To beat an existing binding raise `priority` or use a
  deeper scope — registering later is not enough.
- **Where the dispatcher listens:** `installShortcuts(options)`:

  ```ts
  const root = options.domRoot ?? window;
  const capture = options.capture ?? false;
  ...
  (root as any).addEventListener('keydown', _listener, capture);
  ```

  One root, `keydown` only, first install wins (a second call with options only warns). Callers:
  `fluid-toy/main.tsx:244`, `fractal-toy/main.tsx:109`, `gradient-explorer/v2/main.tsx:52` all call it bare
  (window, bubble); `app-gmt/main.tsx:402` uses `{ capture: true }`.
- **Listener order of checks** (the `_listener` body): resolve a match -> bail if none -> bail if
  `isKeyboardCaptured()` and the key is a plain single character -> input guard (`document.activeElement`
  matches `input:not([type=range]),textarea,[contenteditable]`) -> `when()` -> `handler(e)` -> if
  `consume !== false`: `e.preventDefault(); e.stopPropagation()`.
  A key with no matching shortcut is never touched.
- **Keyboard capture:** `setKeyboardCaptured(true|false)` (ref-counted). While on, plain single-character
  keys (letters, digits, symbols — `e.key.length === 1`, so the space bar too) do NOT fire shortcuts;
  modifier combos and named keys (Escape, Home, Backspace, arrows) still do. Only user today:
  `engine-gmt/components/FormulaPicker/FormulaPicker.tsx`.
- **The listing API exists and nothing shows it.** `shortcuts.list()` returns every def with its
  `description` and `category`, but the only production reader is `resolve()` itself (grep
  `shortcuts.list()` — the other hits are smokes). `components/HelpBrowser.tsx` has no reference to
  shortcuts at all. The Help menu's "Keyboard Shortcuts" row just opens a hand-written help topic:

  ```ts
  s.openHelp?.(options.shortcutsTopicId ?? 'general.shortcuts');   // engine/plugins/Help.tsx, installHelp
  ```

  GX's page is hand-written markdown too (`gradient-explorer/v2/help/topics.ts`, topic `GX_TOPIC.shortcuts`).
- **Shortcuts the engine plugins already claim** (grep `shortcuts.register` under `engine/`, `components/`, `hooks/`):

  | Key | id | File |
  |---|---|---|
  | `Mod+Z`, `Mod+Y`, `Mod+Shift+Z` | `undo.global`, `redo.global`, `redo.global.shift` | `engine/plugins/Undo.tsx` |
  | `1`..`9` recall, `Mod+1`..`9` save | `camera.recall-slot-n`, `camera.save-slot-n` | `engine/plugins/Camera.ts` |
  | `1`..`9` recall, `<saveMod>+1`..`9` save | `${idPrefix}.recall.n` / `.save.n` | `engine/store/installStateLibrary.ts` |
  | `H` | `help.toggle-hints` | `engine/plugins/Help.tsx` (skipped by `hideHints`) |
  | `Alt+S` | `scene-io.quick-png` | `engine/plugins/SceneIO.tsx` |
  | `t`, `Space` | `engine.timeline.toggle`, `engine.timeline.toggle-play(-hovered)` | `components/TimelineHost.tsx` |
  | `Escape` (own pushed scope per open surface) | `dismiss:<id>` | `hooks/useDismiss.ts` |

- **App pattern to copy:** `fluid-toy/hotkeys.ts`, `registerFluidToyHotkeys(engineRef)` — three
  `shortcuts.register({ id: 'fluid-toy.pause', key: 'Space', description, category: 'Playback', handler })`
  calls that flip store state or call the engine handle. No scope, no priority.

### 1.2 Navigation

- `engine/plugins/navigation/` holds exactly one file, `core/VirtualSpace.ts` — a class for split-float
  offset bookkeeping (`sceneOffset`, smoothing). It installs no listeners and registers no shortcuts.
- The input-handling navigation lives in `engine-gmt/navigation/**` (named by `.claude/rules/engine-plugins.md`;
  **not opened — unverified**). The deep-zoom shell simply does not install it. There is nothing in
  engine-core to bypass.

### 1.3 HUD — `engine/plugins/Hud.tsx`

- `hud.register({ id, slot, order?, component: React.FC, when?, className? })`. Seven slots: `top-left`,
  `top-center`, `top-right`, `center`, `bottom-left`, `bottom-center`, `bottom-right`. No edge-centre slot,
  no full-height slot. Widgets in a slot stack vertically by `order`.
- `<HudHost hidden? className? region? />` renders `absolute inset-0 pointer-events-none z-10`. Item wrappers
  get only `item.className`, so a clickable widget must pass `className: 'pointer-events-auto'`.
- `installHud()` is an empty API install. Ids are global across `topbar` and `hud` (one
  `createListRegistry` map — rule file `engine-plugins.md`), so namespace ids (`deepzoom.depth`).
- `when` is read during `HudHost`'s render, and `HudHost` subscribes only to the REGISTRY
  (`useSyncExternalStore(_registry.subscribe, ...)`). A `when` that reads a store flips only when something
  re-renders `HudHost` — see Unverified.
- `help.registerHudHint({ id, slot?, order?, keys?: {key,label}[], component?, badge? })`
  (`engine/plugins/Help.tsx`) registers a HUD item gated on `store.showHints`; fluid-toy uses it for its
  hotkey cheatsheet (`fluid-toy/main.tsx`, `help.registerHudHint({ id: 'fluid-toy-controls', slot: 'bottom-left', ... })`).

### 1.4 Viewport overlays

- A DDFS feature declares `viewportConfig: { componentId, renderOrder?, type?: 'scene' | 'dom' }`
  (`engine/FeatureSystem.ts`, `FeatureViewportConfig`); `featureRegistry.getViewportOverlays()` lists them.
- The APP renders them — there is no engine host. `fractal-toy/FractalToyApp.tsx` and
  `fluid-toy/components/DomOverlays.tsx` each carry the same 12-line `DomOverlays`:

  ```tsx
  const overlays = featureRegistry.getViewportOverlays().filter(o => o.type === 'dom');
  <div className="absolute inset-0 pointer-events-none" style={{ zIndex: z('shellViewportOverlay') }}>
    {overlays.map(cfg => { const C = componentRegistry.get(cfg.componentId); const slice = state[cfg.id];
       if (C && slice) return <C key={cfg.id} featureId={cfg.id} sliceState={slice} actions={state} />; })}
  ```

  The overlay component is looked up in `componentRegistry` and receives `{ featureId, sliceState, actions }`.
- Tiers (`components/ui/zIndex.ts`): `shellHud` 10, `shellViewportOverlay` 20, `shellDock` 40, `shellLoading` 100,
  `shellTopbar` 500, `shellToast` 900, `shellRedock` 1000; portal `tooltip` holds the tutorial card.

### 1.5 Toasts — `engine/store/toastStore.ts` + `engine/components/ToastHost.tsx`

- `showToast(message, tone = 'success', durationMs = 2600)` — callable from anywhere, no React. Tones:
  `success | warning | error | info`. Mount `<ToastHost />` once (bottom-centre, `shellToast`; pass
  `tier="toast"` only if a full-screen takeover must not cover it). Click a pill to dismiss.

### 1.6 Help — `engine/plugins/Help.tsx`, `data/help/registry.ts`, `types/help.ts`

- `installHelp(options)` registers the `help` menu (topbar right, order 40) with: Getting Started
  (`gettingStartedTopicId`), Keyboard Shortcuts (`shortcutsTopicId`, `shortcutsWhen`), Show Hints + `H`
  (unless `hideHints`), `extraItems: MenuItem[]`, `tutorials: { label?, lessonIds? }` (one row per registered
  lesson with a completion tick), `about`, `support`. Mount `<HelpOverlay />` once.
- **Topics are added by replacing the loader, once, before anything loads:**
  `setHelpTopicsLoader(() => import('./topics').then(m => m.TOPICS))`. Default is GMT's fractal bundle.
- A topic is `HelpSection { id, title, content (markdown-like string), category, parentId? }`. **`category`
  is a closed union** in `types/help.ts`: "What's New", 'Getting Started', 'General', 'Formulas', 'Parameters',
  'UI', 'Timeline', 'Graph', 'Animation', 'Lighting', 'Rendering', 'Coloring', 'Export', 'Effects', 'Audio'.
- Open a topic from code: `useEngineStore.getState().openHelp(topicId)`.
- GX's whole wiring is one file to copy: `gradient-explorer/v2/help/installGxHelp.tsx`.

### 1.7 What's New — `engine/plugins/WhatsNew.tsx`

- `createWhatsNew({ topicId, version, seenKey })` -> `{ isUnseen, markSeen, open, menuItem }`; pass
  `menuItem()` in `installHelp({ extraItems })` and `menu.setBadge('help', whatsNew.isUnseen)`.
  `seenKey` MUST be per app (file pitfall).

### 1.8 Tutorial — `engine/plugins/Tutorial.tsx`, `engine/plugins/tutorial/*`

- `installTutorial({ storageKey })` (completion stored under `` `${storageKey}-tutorials` ``),
  `registerLessons([...])`, mount `<TutorialRunner />` + `<TutorialOverlay />`.
- A lesson: `{ id: number, title, subtitle?, onStart?(store), steps }`. A step
  (`tutorial/types.ts`, `TutorialStep`): `{ id, kind? ('text' default), text?, subtext?, highlightTargets?: string[],
  trigger: { kind, ... }, onEnter?(store), onExit?(store), beginButton?, allowManual?, showKeys?: string[],
  buttonLabel?, position?, autoStartLesson?, forceTab? }`.
- Ten built-in triggers (`tutorial/triggers.ts`, `registerBuiltinTriggers`): `value`, `bool`, `delta`
  (all three read the ENGINE STORE by path), `compound`, `or` (`{ kind:'or', conditions: [...] }`),
  `keypress`, `keypress_all` (`{ keys, waitForRelease? }`), `delay` (`{ ms }`), `action` (`{ name }`), `manual`.
- `keypress` listens on the PARENT window: `window.addEventListener('keydown', onDown)` — same iframe
  problem as the dispatcher.
- `action` is the seam for renderer events: `actionBus.fire('name')` from the code that performs the action.
- Custom card bodies: `stepRenderers.register({ kind, render(step, ctx) })`; `ctx` gives `advance, skip,
  complete, lesson, stepIndex, isLastStep, pressedKeys`. The chrome (title, step counter, 360 px card in
  `<Layer tier="tooltip">`) belongs to `tutorial/Overlay.tsx`.
- Highlights use anchors: `useTutorAnchor(id)` on the element, named in `highlightTargets`.
- Start: `useEngineStore.getState().startTutorial(lessonId)` (`store/slices/uiSlice.ts`; it also sets
  `showHints: false`). Completed ids are in `store.tutorialCompleted`.
- Runner gaps written in `tutorial/runner.ts`'s header: `onExit` does not run when a lesson ends or is
  skipped; unmounting `<TutorialRunner />` mid-lesson leaks the active trigger's listeners.

### 1.9 The page's own keys — `H:/GMT/workspace-gmt/mandelbulb_deepzoom/index.html`

- One window-level listener, line 2361: `addEventListener('keydown',e=>{ if (inputLocked) return; keys[e.code]=true; ...`
  and `addEventListener('keyup',e=>{ keys[e.code]=false; })` (2543).
- One-shot keys in that handler: `]` `[` iterations · `I` auto iterations · `N` normal mode · `P` deep/f32/auto ·
  `R` live frame size · `-` `=` power · `,` `.` phase theta · `;` `'` phase phi · `C` colour mode · `9` `0` palette
  frequency · `X` export still · `F` `G` detail · `V` live gate · `L` lighting · `T` `Y` headlamp falloff ·
  `M` record toggle · `?` About · `Escape` (cancel export / stop preview / close About).
- Held keys read from `keys[]`: `KeyW KeyA KeyS KeyD KeyQ KeyE` (line 3331), `ShiftLeft/ShiftRight` (3672),
  and `keys['Escape']` cancels a `diveTo` (3960).
- Mouse: `canvas.addEventListener('click',()=>{ if (!inputLocked) canvas.requestPointerLock(); })` (2544);
  look is read on `mousemove` only while `document.pointerLockElement === canvas`.
- `window.__lockInput(b)` (2360) blocks ALL keys including flying — all or nothing, no per-key filter.

### 1.10 What last week's shell does by hand — `deep-zoom/`

- **Keys** (`DeepZoomApp.tsx`, the `onKey` effect): one handler added to BOTH `window` and `bridge.win`.
  `Escape` closes the side panel unless a render/preview/dive runs; `b` bookmark, `j` focus the dive field,
  `h` cycle overlays, `/` help, `1` `2` `3` panels, `Home` home view, `Backspace` previous view. Its own
  typing guard, no scope, no registry, not listed anywhere but its own Help tab.
- **Toast:** `store.toast` + a `shellToast` `<Layer>` + a 3200 ms timer effect (`TOAST_MS`).
- **Depth gauge** (`ui/DepthGauge.tsx`, 657 lines): a left-edge column from under the top bar to the bottom —
  readout (mantissa-e-exponent, decades to the 1e-77 floor, magnification, yardstick, fall rate), a
  "Dive to 1e-N" row, and a 56 px clickable log scale 1e0..1e-77 with bookmark marks and the loaded path's span.
  Also hosts `useDzChrome` (a second store) and `dzActions`.
- **Onboarding** (`ui/Onboarding.tsx`, 277 lines): a bottom-centre strip, nine states
  (`start, diving, click, look, keys, shift, still, tips, final`). It attaches listeners inside the iframe
  window for pointer lock, mouse movement and W held 2000 ms (`W_HOLD_MS`); "Dive to 1e-12" calls
  `bridge.diveTo(1e-12)`; a later step offers a recorded dive to 1e-30; timed fallbacks of 20 s / 6 s / 6 s.
- **Help** (`ui/HelpPanel.tsx`, 300 lines): a side panel with four tabs — Keys, Depth, Video, From other
  tools — a hand-built key table, and "Show the intro again".

---

## 2. Blueprint

### 2.1 The rule that sorts every key

**The renderer keeps only what must be read every frame; everything else is an engine shortcut.**

- Renderer-owned (held state, read per frame, never registered with the engine): `W A S D Q E`, `Shift`,
  mouse look, click-to-capture, and `Esc` while the mouse is captured.
- Engine-owned: every one-shot key. Each handler does one of two things — set a DDFS param (so the panel
  slider, undo and presets stay in step with the picture), or call the host interface.
- Why the page's one-shot keys cannot stay in the renderer: they mutate page variables directly
  (`surfMul=...`, `colorMode=...`), which would leave the DDFS slice and the panel showing a stale value
  and put nothing on the undo stack.

### 2.2 The iframe relay (goes away when the renderer is a module)

Key events inside an iframe are dispatched on the iframe's window and never reach the parent's `window`,
where both the dispatcher (1.1) and the tutorial `keypress` triggers (1.8) listen. The relay belongs in
the iframe implementation of the host interface, nowhere else:

```ts
// deep-zoom host adapter (iframe flavour) — the ONLY place that knows there is an iframe.
// Capture phase on the inner window runs before the page's own bubble-phase window listener.
function relayKeys(inner: Window): () => void {
    const forward = (e: KeyboardEvent) => {
        const copy = new KeyboardEvent(e.type, {
            key: e.key, code: e.code, repeat: e.repeat,
            ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey,
            bubbles: true, cancelable: true,
        });
        // dispatchEvent returns false when a listener called preventDefault —
        // which is exactly what the engine dispatcher does after a shortcut fires (consume default true).
        const consumed = !window.dispatchEvent(copy);
        if (consumed) { e.preventDefault(); e.stopImmediatePropagation(); }   // the page never sees it
    };
    inner.addEventListener('keydown', forward, true);
    inner.addEventListener('keyup', forward, true);     // tutorial waitForRelease triggers
    return () => { inner.removeEventListener('keydown', forward, true); inner.removeEventListener('keyup', forward, true); };
}
```

Properties, each from code read above:
- A key with no engine shortcut is not consumed (the dispatcher returns at `if (!match) return`), so W/A/S/D
  fall through to the page untouched.
- The input guard reads the PARENT's `document.activeElement`; while the iframe has focus that is the
  `<iframe>` element, which does not match the ignore selector, so shortcuts fire. Correct.
- A shortcut registered with `consume: false` is NOT held back from the page — do not use `consume: false`
  on any key the page also binds.
- Module future: the renderer's listeners and the dispatcher share one window. Delete the relay; the
  renderer module must then not bind any engine-owned key (its `keydown` handler shrinks to `keys[e.code]=true`).

### 2.3 Flying and keyboard capture

- Do NOT call `setKeyboardCaptured(true)` while the mouse is captured. It would silence every plain letter
  shortcut, and saving a view (`B`) or starting a recording (`M`) mid-flight is the main use of those keys.
  Nothing collides: the engine registers none of W A S D Q E.
- DO expose pointer-lock state from the host interface (`host.onCaptureChange(cb)`, `host.isCaptured()`) and
  mirror it to a store flag. Use it two ways:
  - `useShortcutScope('deepzoom.flying', captured)` so a key can be rebound or refused while flying;
  - `when: () => !captured` on shortcuts that should not fire mid-flight (the timeline's `Space`, slot recall
    digits if the owner wants them off while flying).
- `Shift` while flying: `Shift+B` is a different key from `B` (1.1). A user holding Shift for speed who taps `B`
  gets nothing. Register the flying-critical keys twice (`'B'` and `'Shift+B'`, second id `...shift`), the way
  Undo registers `redo.global.shift`.

### 2.4 Key table

Engine shortcuts (register in `deep-zoom/hotkeys.ts`, shaped like `fluid-toy/hotkeys.ts`; ids `deepzoom.*`):

| Key | id | Category | Does | Was |
|---|---|---|---|---|
| `B` (+`Shift+B`) | `deepzoom.save-view` | View | save this view into the state library | shell `b` |
| `Home` | `deepzoom.home` | View | go to the home view | shell |
| `Backspace` | `deepzoom.back` | View | previous view | shell |
| `J` | `deepzoom.dive` | View | focus the "Dive to" field | shell |
| `1`..`9`, `Mod+1`..`9` | (state library's own) | View | recall / save view slot n | NEW — see conflict 1 |
| `M` (+`Shift+M`) | `deepzoom.record` | Record | `host.recordToggle()` | page `M` |
| `X` | `deepzoom.export-still` | Record | export a still | page `X` |
| `F` / `G` | `deepzoom.detail-down/up` | Picture | detail /1.5, x1.5 (0.25..256) via the DDFS setter | page |
| `[` / `]` | `deepzoom.iters-down/up` | Picture | iterations -1 / +1 (4..160) | page |
| `I` | `deepzoom.auto-iters` | Picture | automatic iterations on/off | page |
| `-` / `=` | `deepzoom.power-down/up` | Picture | power n -1 / +1 | page |
| `C` | `deepzoom.color-mode` | Picture | colour mode, 3 values | page |
| `L` | `deepzoom.light-mode` | Picture | lighting, 3 values | page |
| `O` | `deepzoom.overlays` | UI | cycle overlays: all, depth only, none | shell `h` — see conflict 2 |
| `/` (+`Shift+/` i.e. `?`) | `deepzoom.help` | UI | open Help at the shortcuts topic | shell `/`, page `?` |
| `H` | `help.toggle-hints` | UI | hints on/off (installHelp's own) | engine |
| `Mod+Z` / `Mod+Y` / `Mod+Shift+Z` | Undo's own | Edit | undo / redo | engine |
| `Alt+S` | SceneIO's own | File | quick PNG | engine |
| `t`, `Space` | TimelineHost's own | Timeline | show timeline, play | engine — only if the timeline is mounted |
| `Escape` | `deepzoom.cancel`, `when: host busy` | — | cancel a render / preview / dive | page + shell |

Stay inside the renderer (never registered): `W A S D Q E`, `Shift`, mouse look, click to capture,
`Esc` to release the mouse (the browser's own pointer-lock exit).

Dropped as keys, kept as panel controls only (developer-grade; a slider or toggle in the DDFS panel is
enough): `N` normal mode, `P` deep/f32/auto, `R` live frame size, `V` live gate, `T` `Y` headlamp falloff,
`,` `.` `;` `'` phase, `9` `0` palette frequency. Dropped: shell `1` `2` `3` panel toggles (dock panels are tabs).

Conflicts the table settles — both are owner calls, stated here so they are not found by accident:
1. **Digits.** The state library and the Camera plugin both bind `1`..`9` to slot recall; the page binds `9` and
   `0` to palette frequency and last week's shell bound `1` `2` `3` to panels. The table gives the digits to the
   engine (consistent with fluid-toy: "Ctrl+1..9 save, 1..9 recall", `fluid-toy/main.tsx`). With the relay,
   the engine consumes `9` before the page sees it, so the page's `9` would silently die anyway.
2. **`H`.** `installHelp` binds `H` to hints. Last week's shell bound it to hide-overlays. The table keeps the
   engine's meaning and moves overlays to `O` (unbound in the page and in every engine plugin read). The other
   route is `installHelp({ hideHints: true })` as GX does, which frees `H`.
3. **`T`.** `components/TimelineHost.tsx` binds `t`; the page binds `T` to headlamp falloff. Engine wins.

`Escape` detail: `useDismiss` pushes its own scope per open menu/modal, so those win automatically. The
shell's `deepzoom.cancel` is global with `when: () => exporting || playing || diving`; when nothing is running
`when` fails and the key is left alone. No Esc-closes-the-dock behaviour — docked panels do not close on Esc.

### 2.5 Overlays

| Thing | Home | How |
|---|---|---|
| Depth readout (e.g. `6.40e-53`, decades to floor, magnification) | HUD `top-left` | `hud.register({ id: 'deepzoom.depth', slot: 'top-left', component, className: 'pointer-events-auto' })` |
| Depth scale (56 px log column 1e0..1e-77, bookmarks, path span, clickable) | viewport overlay | DDFS feature `viewportConfig: { componentId: 'overlay-depth-scale', type: 'dom' }`, component in `componentRegistry` |
| "Dive to 1e-N" row | with the readout in the HUD widget, or a panel widget | plain inputs; the `J` shortcut focuses it |
| Key hint line | HUD via Help | `help.registerHudHint({ id: 'deepzoom-keys', keys: [...] })`, gated on hints |
| fps / mode badge | HUD `top-right` or the topbar's own FPS widget | `hud.register` |
| Render progress `frame 212/300` | HUD `top-center`, `when: exporting` | `hud.register` |
| Toasts | `<ToastHost />` + `showToast()` | replaces `store.toast` / `say()` |
| Loading / "renderer did not start" cards | app-level `<Layer tier="shellLoading">` | keep; not a HUD concern |

Why the gauge splits: the HUD has seven corner/centre slots that stack small widgets — nowhere to put a
full-height left column — and a viewport overlay is a full-inset layer that receives the feature's slice,
which is where depth, bookmarks and the path already live. The scale is a picture instrument (overlay);
the number is a readout (HUD). Overlay modes (`O`): `all` = both, `depth` = HUD readout only, `none` =
`<HudHost hidden />` and the overlay returns null.

Keep last week's rule from `DepthGauge.tsx`'s pitfalls: set React state only when a ROUNDED value changes,
so a converging still is not repainted every telemetry tick.

### 2.6 Help topics

`deep-zoom/help/topics.ts` + `installDeepZoomHelp.tsx`, copied from `gradient-explorer/v2/help/`.

| id | category | Content (from last week's HelpPanel tabs) |
|---|---|---|
| `dz.getting-started` | Getting Started | click to take the mouse, fly, speed follows surface distance, a still converges when you stop |
| `dz.shortcuts` | General | the key table — see below for how it is built |
| `dz.depth` | General | the depth number, the 1e-77 floor, yardsticks, engine modes (deep / f32) |
| `dz.views` | General | saved views, home, back, dive to a depth |
| `dz.video` | Export | record a flight, preview, render frames, the ffmpeg lines |
| `dz.interop` | Export | "From other tools" tab |
| `dz.whats-new` | What's New | changelog for `createWhatsNew` |

```ts
setHelpTopicsLoader(() => import('./topics').then((m) => m.dzHelpTopics()));
installHelp({
    gettingStartedTopicId: 'dz.getting-started',
    shortcutsTopicId: 'dz.shortcuts',
    tutorials: {},                                   // "Show the intro again" becomes the lesson row
    extraItems: [feedbackMenuItem(), dzWhatsNew.menuItem()],
    support: gmtSupportConfig({ appName: 'Deep Zoom' }),
});
```

The shortcuts topic should be GENERATED, so it cannot drift from the registry. The loader is a function
called at first open, after every `shortcuts.register` has run:

```ts
// engine shortcuts from the registry, renderer-owned keys from one hand-written table
const engineRows = shortcuts.list().filter((s) => s.description && !s.id.startsWith('dismiss:'));
// group by s.category -> '## Category\n- `Key` — description'
const RENDERER_KEYS = [['Click the picture', 'take the mouse'], ['Esc', 'release the mouse'],
    ['W A S D', 'move'], ['Q E', 'down / up'], ['Shift', 'faster'], ['mouse', 'look']];
```

### 2.7 Tutorial — the first-run guide fits, with two additions

It fits the lesson model: every state of last week's strip is "show a line, wait for an event". Mapping
(lesson id 1, "First dive"; `installTutorial({ storageKey: 'gmt.deepzoom' })`; start it at boot when
`!tutorialCompleted.includes(1)`):

| Step id | Text | Trigger | Notes |
|---|---|---|---|
| `start` | "Dive to 1e-12" / "I'll fly myself" | `{ kind: 'or', conditions: [{ kind: 'action', name: 'dz.dive.done' }, { kind: 'action', name: 'dz.captured' }] }` | custom step kind `dz-dive` (button calls `host.diveTo(1e-12)`, disabled until `ready`) |
| `click` | "Click the picture to steer. Esc gives the mouse back." | `{ kind: 'action', name: 'dz.captured' }` | or `bool` on the mirrored `captured` flag |
| `look` | "Move the mouse to look" | `{ kind: 'action', name: 'dz.looked' }` | host fires after the first locked mousemove |
| `keys` | W S A D Q E | `{ kind: 'keypress_all', keys: ['w'], waitForRelease: true }`, `showKeys: ['W','A','S','D','Q','E']` | needs the relay's keyup forwarding; "held 2000 ms" needs a custom trigger |
| `shift` | "Hold Shift to go faster" | `or`: `keypress` `['Shift']` / `delay` 20000 | |
| `still` | "Stop moving: the picture sharpens" | `or`: `action` `dz.converged` / `delay` 6000 | |
| `tips` | B saves · M records · O hides · / Help | `manual`, `allowManual` | |
| `final` | recorded dive to 1e-30 | custom kind `dz-record-dive` | last step |

The host interface fires the events — one line each where it already detects them:
`actionBus.fire('dz.captured' | 'dz.looked' | 'dz.dive.done' | 'dz.converged')`.

Two things the built-in card does not give (see Gaps 4 and 5): it is a 360 px card in the `tooltip` tier,
not a slim bottom strip; and "skip ahead if the visitor already did it" (the old strip jumped `start -> shift`
when W had already been held) has no equivalent — steps advance one at a time.

### 2.8 Boot order (this area only)

```ts
installShortcuts();                    // bare, like fluid-toy / GX
installUndo(); installMenu(); installTopBar(...);
installDeepZoomHelp();                 // setHelpTopicsLoader BEFORE anything loads topics; installHelp
installHud();
installTutorial({ storageKey: 'gmt.deepzoom' }); registerLessons([firstDive]);
registerDeepZoomHotkeys(host);         // after the state library, so slot digits are already claimed
// tree: <HudHost/> + <DomOverlays/> inside the viewport; <HelpOverlay/>, <TutorialRunner/>,
//       <TutorialOverlay/>, <ToastHost/> at the root
```

Smokes this area needs (owner rule: a smoke that never opens the panels proves nothing): press each
engine key with focus in the iframe AND with focus in the parent and assert the store changed once;
open Help -> Keyboard Shortcuts and assert a registry-sourced row is there; run the lesson to the end.

---

## 3. Gaps (generic, with the interim workaround)

1. **The shortcut dispatcher has one event root.** `installShortcuts` attaches to a single `domRoot` and
   exports no way to feed it an event from elsewhere, so keys pressed in a same-origin iframe (or any second
   document — a popout window has the same problem) never reach it. *Generic fix:* export the dispatch
   function, or add `shortcuts.attachRoot(target): () => void`. *Interim:* the synthetic re-dispatch in 2.2,
   inside the iframe host adapter.
2. **The shortcut registry is never shown.** `ShortcutDef.description` / `category` are collected and no
   Help surface reads them; every app hand-writes its shortcuts page. *Generic fix:* a help-topic builder
   (or a HelpBrowser section) fed by `shortcuts.list()`. *Interim:* generate the markdown inside the
   app's topic loader (2.6).
3. **No engine host for feature viewport overlays.** `featureRegistry.getViewportOverlays()` has two
   identical app-side renderers (`fractal-toy/FractalToyApp.tsx`, `fluid-toy/components/DomOverlays.tsx`); a
   third copy would break "one source of truth". *Generic fix:* lift `DomOverlays` into the engine
   (next to `HudHost`). *Interim:* import fluid-toy's is wrong (app-to-app import) — so the lift should be the
   first step, it is 12 lines.
4. **The HUD has no edge or full-height slot.** Seven corner/centre slots only. *Generic fix:* `left` / `right`
   edge slots (vertically centred, full height available). *Interim:* the depth scale is a viewport overlay (2.5).
5. **The tutorial card has one presentation and no per-step skip-ahead.** Chrome is fixed by `Overlay.tsx`
   (360 px card, `tooltip` tier); a step renderer only replaces the body. And a step cannot say "already
   satisfied, skip me". *Generic fix:* a lesson-level `presentation: 'card' | 'strip'`, and a step-level
   `skipWhen(store)`. *Interim:* accept the card; put several already-done checks into one `or` trigger.
6. **Tutorial `keypress` triggers and the runner leak / miss teardown** (stated in `runner.ts`): `onExit` does
   not run at lesson end or skip. *Interim:* no step in the deep-zoom lesson may rely on `onExit`; anything
   a step turns on must be turned off by the next step's `onEnter` or by the host.
7. **`HelpSection.category` is a closed union of GMT words.** A new app cannot add its own category
   ('Depth', 'Video') without editing `types/help.ts`. *Interim:* use 'General' / 'Export' / 'Getting Started'.
8. **Keyboard capture is all-or-nothing.** `setKeyboardCaptured` drops every plain key; there is no "these
   six keys belong to the viewport while it is captured" declaration. Not needed today (no collision), but a
   future shell that wants `W` as a shortcut outside flying has no declarative way. *Interim:* scope + `when`.
9. **Modifier-insensitive bindings do not exist.** A held `Shift` (the fly-faster key) turns `B` into `Shift+B`.
   *Generic fix:* a `ShortcutDef.anyShift` flag. *Interim:* register twice (2.3).
10. **Renderer side (not engine):** `window.__lockInput` blocks every key at once and the page's one-shot
    keys cannot be switched off separately. *Interim:* the relay's `stopImmediatePropagation` on consumed
    keys. *Proper:* in the module, the keydown handler keeps only `keys[e.code]=true`.

---

## 4. Unverified

- `engine-gmt/navigation/**` not opened; "nothing to bypass" rests on `engine/plugins/navigation/` holding only
  `VirtualSpace.ts` and on the shell not installing engine-gmt's navigation.
- How a `HudItem.when` that reads the store stays live. `HudHost` subscribes only to the registry; fluid-toy's
  hint line works (guarded by `smoke:hud-hint`), presumably because a parent re-renders. A deep-zoom widget
  that must appear/disappear on a store flag should subscribe inside its own component and return null.
- Whether Chrome delivers a `keydown` for `Esc` to the page when Esc exits pointer lock (affects only whether
  `deepzoom.cancel` can see Esc mid-flight; the page's `keys['Escape']` dive cancel suggests it sometimes does).
- Whether the page's `?` About and `X` export are already inert under `?embed=1` (`openPanel` returns early
  when `EMBED`; `toggleAbout` and the `KeyX` branch were not traced).
- `tutorial/Overlay.tsx` body beyond its first 40 lines and the `Layer tier="tooltip"` line: whether the card
  takes focus away from the iframe (which would stop flying keys until the picture is clicked again).
- The relay snippet is unrun. The synthetic event has `isTrusted === false`; the dispatcher and the tutorial
  triggers do not check it (read), but nothing was executed.
- `installStateLibrary`'s `saveMod` value and whether its digit shortcuts can be turned off per app — the
  state-library reader's area; only the two `key:` lines were read.
- `Camera.ts` slot shortcuts were read at the `key:` lines only; whether the deep-zoom shell installs the
  Camera plugin at all is the camera reader's call.
- No feature in `fluid-toy/features/` or `fractal-toy/features/` matched `viewportConfig` in a quick grep, so the
  `{ featureId, sliceState, actions }` overlay props are read from the two `DomOverlays` renderers, not from
  a live overlay component.
- `README.md` / `HANDOFF.md` of the page and `plans/deep-zoom/INTERFACE.md` were not opened in this pass.
