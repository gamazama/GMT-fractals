# Mobile Mode for app-gmt

**Status:** Planning — ready to start Phase A
**Owner:** Gigh
**Last updated:** 2026-05-01
**Workspace:** `h:/GMT/workspace-gmt/dev/`

Companion docs:
- Stable reference: `h:/GMT/workspace-gmt/stable/` (production app, mobile rendering proven)
- Engine viewport docs: [docs/engine/10_Viewport.md](../docs/engine/10_Viewport.md)
- Codebase map: [CODEBASE_MAP.md](../CODEBASE_MAP.md)

---

## 1. Scope

Make `app-gmt` (in `dev/`) usable on phone + tablet, **landscape-only**. The rendering engine is already mobile-capable; this work is almost entirely UI/input ergonomics. Patterns established here should be reusable by sibling apps (`fluid-toy`, `fractal-toy`, `demo`) since they share the engine and chrome.

### Goals
- App is functionally usable on a 6" landscape phone and a 10" tablet without resorting to desktop tooling.
- Auto-detect mobile, but allow user override (Auto / Force Mobile / Force Desktop).
- Hardware-aware default quality so first paint is responsive on low-end devices.
- Touch-native input for camera (Orbit + Fly), parameter sliders, and menus.
- No regressions to desktop UX.

### Non-goals (explicit)
- **Portrait support.** We use a "Landscape Recommended" gate, same as stable.
- **Mobile animation editing.** Timeline + keyframe UI is desktop-only for now (research session concluded scope was too large).
- **Mobile mesh export UI.** Out of scope — desktop-only feature.
- **PWA / app-store distribution.** Tauri packaging is tracked elsewhere ([memory/project_monetization_strategy.md](../../../../Users/gighz/.claude/projects/h--GMT-workspace-gmt-stable/memory/project_monetization_strategy.md)).

---

## 2. Locked decisions

| Decision | Choice |
|---|---|
| Devices | Phone + tablet, both targeted |
| Orientation | Landscape-only (portrait shows a rotate prompt) |
| Mode preference | Tri-state: `Auto` / `Force Mobile` / `Force Desktop`, persisted |
| Animation on mobile | Hidden (defer; reconsider if usage demands it) |
| Topbar triage | Iterative — first-pass list in §6, refined with user |
| Orbit-mode touch | Use drei's native `THREE.TOUCH.ROTATE` / `DOLLY_PAN` (already wired); disable cursor-anchor pickpoint code on touch only |
| Address-bar handling | `sticky top-0 h-[100vh] overflow-hidden` wrapper, ported verbatim from stable |

---

## 2.5 Architectural layering (load-bearing)

`app-gmt` is one of four sibling apps on the engine. The port from stable (2026-04-26) is complete; this plan must not regress that by burying mobile primitives in `app-gmt/` where `fluid-toy`, `fractal-toy`, and `demo` can't reach them.

**Layering rule for every item below:** before writing code, decide which layer owns it.

| Layer | Owns | Examples this plan touches |
|---|---|---|
| `engine/` | Generic, app-agnostic primitives | `useMobileLayout`, `HardwareDetection`, `MobileControls`, `Viewport` plugin, `uiSlice`, `LandscapeGate` (new), address-bar wrapper helper (new), TopBar plugin's mobile-flag mechanism (new) |
| `engine-gmt/` | GMT-specific plugin: FractalEngine, formulas, features, GMT navigation, GMT topbar item registrations | Custom-orbit `pointerType` gates in `Navigation.tsx`, GMT topbar mobile annotations, FormulaGallery hover→tap |
| `app-gmt/` | App shell composition only | `AppGmt.tsx` mounts the new engine primitives, picks initial preset, hides timeline |

**Default:** if stable does it in `App.tsx`, the engine fork should do it as a reusable primitive consumed from the app shell. Verbatim ports into `AppGmt.tsx` are the wrong instinct — they leak mobile concerns into one app and starve the others.

**Sibling-app benefit check:** for each new engine primitive, `fluid-toy`/`fractal-toy`/`demo` should get the benefit by adding ~1-3 lines to their app shell. If a primitive can't be opted into that cheaply, it's in the wrong layer or has the wrong API.

---

## 3. Verified findings (grounding for future readers)

These were confirmed via code inspection on 2026-05-01. The plan below relies on them; if any drift, revisit.

1. **`isMobile` is hardcoded `false`** when `AppGmt.tsx` mounts `GmtNavigationHud` — [AppGmt.tsx:206, 253](../app-gmt/AppGmt.tsx#L206). HUD has working mobile branches that never trigger. Fixing this is one of the highest-leverage trivial wins.

2. **Stable already has the portrait prompt and address-bar trick.** [stable/App.tsx:170-176](../../stable/App.tsx#L170-L176) for the prompt, [stable/App.tsx:159](../../stable/App.tsx#L159) for the sticky-h-100vh wrapper. Stable also hides the left Dock on mobile — [stable/App.tsx:194](../../stable/App.tsx#L194). Port verbatim.

3. **Drei `<OrbitControls>` already declares touch bindings** at [Navigation.tsx:1326](../engine-gmt/navigation/Navigation.tsx#L1326): `touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}`. Currently shadowed by custom cursor-anchor code that fires on touch because its only gate is `e.button !== 0` (which passes for touch pointerdown). Fix: add `e.pointerType === 'touch'` early-return to the four custom `pointerdown` handlers in `Navigation.tsx` (lines ~666, ~803, ~885, ~950) — wheel handler is naturally touch-immune.

4. **Topbar uses a slot/order registration pattern** — [topbar.tsx:214-247](../engine-gmt/topbar.tsx#L214-L247). Mobile cull is done by either skipping registration or returning `null` from the component on mobile. No layout rewrite needed.

5. **`Dock.tsx` already has partial mobile awareness** — [Dock.tsx:13-16, 65](../components/layout/Dock.tsx#L13-L16) has `checkIsMobile()` and redirects Engine + Camera Manager panels to the right dock on mobile. Half-finished work; extend rather than restart.

6. **`CenterHUD` (Light Studio) already has working mobile interaction logic** — [CenterHUD.tsx:135-162](../engine-gmt/topbar/CenterHUD.tsx#L135-L162). Tap-to-enable → tap-to-open-menu → tap-to-disable, with vibration. Currently dormant because `isMobileMode` flows from the broken hardcode in (1).

7. **Hover-only menus exist in only two components**: `CenterHUD` (already has tap branch — works once isMobile flows) and [FormulaGallery.tsx](../engine-gmt/components/panels/formula/FormulaGallery.tsx) (still needs conversion).

8. **`debugMobileLayout` is a single boolean** — [uiSlice.ts:105, 196](../store/slices/uiSlice.ts#L105). Graduating to a tri-state preference is a small slice change.

9. **Hardware tier is detected at boot but never read for preset auto-selection.** `HardwareDetection.detectHardwareProfile()` returns `'low' | 'mid' | 'high'`. Nothing maps tier → scalability preset.

10. **`useMobileLayout()` already exposes `isPortrait`** — [hooks/useMobileLayout.ts:6](../hooks/useMobileLayout.ts#L6) — currently unused. The portrait prompt port can consume it directly.

11. **`MobileControls` (joystick layer) is ported and working** — Fly mode only. Multi-touch via `pointerId` locking, vibration on press/release. No changes needed for Phase A.

---

## 4. Phasing

Phases are ordered by dependency. Phase A unblocks visible mobile improvement on its own; everything after is iterative refinement.

### Phase A — Foundation

**Goal:** Real mobile signal flows; portrait gate works; touch orbit unbroken. ~half a day.

| # | Item | Layer | Notes |
|---|---|---|---|
| A1 | Drop hardcoded `isMobile={false}` in [AppGmt.tsx:206, 253](../app-gmt/AppGmt.tsx#L206-L253), read from `useMobileLayout()` | `app-gmt/` | Pure composition fix |
| A2 | Build `<LandscapeGate>` component as engine primitive — encapsulates portrait detection + the rotate-prompt overlay | `engine/components/` (new) | Sibling apps adopt with `<LandscapeGate />`; reuse `SmartphoneRotateIcon` from engine |
| A3 | Build address-bar scroll-trick wrapper as engine primitive — option on the App shell helper or a thin `<MobileViewportShell>` component that applies `sticky top-0 h-[100vh] overflow-hidden` when mobile | `engine/components/` (new) | Source pattern: [stable/App.tsx:159](../../stable/App.tsx#L159). Sibling apps wrap their root with it |
| A4 | Mount `<LandscapeGate>` + `<MobileViewportShell>` inside `AppGmt.tsx` | `app-gmt/` | Verifies the primitives compose correctly |
| A5 | Hide left Dock on mobile in `AppGmt.tsx` (`{!isMobile && <Dock side="left" />}`) | `app-gmt/` | Source: [stable/App.tsx:194](../../stable/App.tsx#L194). Fluid/fractal-toy may want the same; consider extracting if all apps end up with identical conditional |
| A6 | Restore drei touch orbit — gate the four custom `pointerdown` handlers in [Navigation.tsx](../engine-gmt/navigation/Navigation.tsx) with `if (e.pointerType === 'touch') return;` (lines ~666, ~803, ~885, ~950 — verify what each handler owns and add a comment explaining the gate) | `engine-gmt/` | GMT-specific: drei's native ROTATE/DOLLY_PAN takes over for touch. Other apps don't have this navigation layer |
| A7 | Validate on real device — `npm run dev`, load on a phone, confirm portrait prompt + rotation dismiss + address-bar collapse + drei touch orbit (one-finger rotate, pinch zoom) | — | Manual |

### Phase B — UI mode preference (graduate `debugMobileLayout`)

**Goal:** Force Mobile UI becomes a real user setting, not a debug toggle. ~half a day.

| # | Item | Layer | Notes |
|---|---|---|---|
| B1 | Replace `debugMobileLayout: boolean` in [uiSlice.ts](../store/slices/uiSlice.ts) with `uiModePreference: 'auto' \| 'mobile' \| 'desktop'`, default `'auto'`, add `setUiModePreference` | `engine/` (uiSlice is shared) | All sibling apps inherit the setting |
| B2 | Update `useMobileLayout()` to resolve `'auto'` via media query, return forced value otherwise | `engine/` | Reads preference from shared store |
| B3 | Migrate call sites of `debugMobileLayout` to use `useMobileLayout().isMobile`. Sites: [App.tsx:59](../App.tsx#L59), [components/MobileControls.tsx:116-122](../components/MobileControls.tsx#L116-L122), [engine-gmt/topbar.tsx:521-524](../engine-gmt/topbar.tsx#L521-L524), [engine-gmt/navigation/useInputController.ts:15, 199, 239](../engine-gmt/navigation/useInputController.ts#L15), [types/store.ts:131](../types/store.ts#L131), [engine-gmt/types/store.ts:119](../engine-gmt/types/store.ts#L119) | mixed | TypeScript guides the rename |
| B4 | Convert System menu toggle at [topbar.tsx:521](../engine-gmt/topbar.tsx#L521) to a tri-state radio (Auto / Force Mobile / Force Desktop) | `engine-gmt/` | GMT's System menu — but the *setting* lives in shared engine slice. Other apps can mount their own equivalent menu item using the same setter |
| B5 | Persist `uiModePreference` to localStorage under `gmt.uiModePreference` (or app-namespaced if cross-app collisions matter), hydrate on store init | `engine/` | Same key shape used by other persisted prefs |
| B6 | Re-frame as user setting, not debug — move from System → Advanced to System → Display | `engine-gmt/` | Cosmetic |

### Phase C — Topbar triage

**Goal:** Mobile topbar fits on a phone screen and contains only what's useful there. Iterative.

C1. **First-pass cull list** (refine with user):

| Item | Mobile action |
|---|---|
| Logo + name | Keep (left-most) |
| FPS counter | Keep |
| Pause | Keep |
| Quality preset chip ("Balanced") | Keep |
| AdaptiveResolution readout | Hide UI (mechanism keeps running) |
| PT toggle | Keep |
| Playing badge | Keep (only visible during playback) |
| Render Region toggle | Hide |
| Bucket render | Hide |
| CenterHUD (Light Studio) | Keep (already touch-capable) |
| Color swatches + dropdown | Keep (consider collapse-to-icon) |
| Theme toggle | Move to hamburger |
| `+` (add) button | Audit — what does it add? Likely keep |
| Undo/Redo | Keep |
| Snapshot/Crop | Move to hamburger |
| Share link | Move to hamburger |
| File menu | Keep (it's the main I/O entry) |
| Hamburger | Keep — absorb hidden items |
| Help | Move into hamburger |
| Camera menu | Keep (Orbit/Fly switch lives here) |
| System menu | Keep |

C2. **Implement the cull mechanism in the TopBar plugin** — add `mobile?: boolean` (or `desktopOnly?: boolean`) flag to `topbar.register()` item shape. The plugin's render pass filters by current mode. **Layer: `engine/`** (the plugin lives there; mechanism benefits all sibling apps).

C3. **Annotate GMT's topbar registrations** in [engine-gmt/topbar.tsx](../engine-gmt/topbar.tsx) with the new flag per the cull list above. **Layer: `engine-gmt/`**.

C4. **Tabs in dock panels** — right-dock tab strip overflows on phone (Formula | Scene | Camera Manager | Shader | Gradient | Quality | …). Audit and either:
   - Cull mobile-irrelevant tabs (Camera Manager already redirected by [Dock.tsx](../components/layout/Dock.tsx) logic — extend pattern to others). Layer: `engine/` for the mechanism (Dock is shared), `engine-gmt/` for which tabs to cull.
   - Or make the tab strip horizontally scrollable on touch. Layer: `engine/`.

### Phase D — Touch ergonomics

**Goal:** Inputs feel right under a finger, not a cursor. ~1-2 days.

| # | Item | Layer | Notes |
|---|---|---|---|
| D1 | Slider hit-target audit — sweep `useDragValue` consumers; on `pointer: coarse` ensure thumb ≥ 44×44 px hit area, track ≥ 32 px tall, `user-select: none` on track | `engine/` (slider hooks/components are shared); audit consumers across both layers | All apps benefit |
| D2 | `touch-action: none` on draggable elements — partial in [MobileControls.tsx](../components/MobileControls.tsx); sweep sliders, viewport overlays | `engine/` for shared components, `engine-gmt/` for GMT-specific draggables | Mechanism-level |
| D3 | [FormulaGallery.tsx](../engine-gmt/components/panels/formula/FormulaGallery.tsx) hover→tap — match the pointerType-gated pattern from [CenterHUD.tsx](../engine-gmt/topbar/CenterHUD.tsx) | `engine-gmt/` | GMT-only component |
| D4 | Mode-switch HUD pill (Orbit ⇄ Fly), always visible on touch — extend `GmtNavigationHud` | `engine-gmt/` | GMT-specific navigation. Other apps have their own nav and can adopt the pattern if needed |
| D5 | Extend vibration feedback — currently joystick-only via `vibrate` prop pattern in CenterHUD; add to slider release, toggle taps, mode switch | `engine/` (helper) + `engine-gmt/` (call sites) | Could lift `vibrate` helper to engine if not already |
| D6 | Safe-area handling — `padding: env(safe-area-inset-*)` on root wrapper or specific edges | `engine/` (folded into `<MobileViewportShell>` from A3) | Sibling apps inherit |
| D7 | Right Dock drawer behaviour on mobile (decide after Phase A validation) — auto-collapse to icons OR slide-in overlay drawer | `engine/` (Dock is shared) | Validate on device before building |

### Phase E — Performance auto-tuning

**Goal:** First paint is fast and responsive on low-tier devices without user intervention. ~half a day.

| # | Item | Layer | Notes |
|---|---|---|---|
| E1 | Auto-pick scalability preset at boot from `hardwareProfile.tier`: low→`preview`, mid→`fastest`, high→`balanced`. Skip if user has saved preset | `engine/` (mechanism: boot hook reads tier and dispatches preset selection) + `engine-gmt/` (the preset map is GMT-specific) | Sibling apps register their own tier→preset map |
| E2 | Lower target FPS on low-tier devices — Viewport plugin's `targetFps` 30→20 for `tier === 'low'`. Confirm with profiling first | `engine/` | Plugin already engine-side |
| E3 | `prefers-reduced-motion` detection → default to lower-quality preset + disable adaptive ramping | `engine/` | Folds into E1 |

### Phase F — Animation hide (not a real animation phase)

**Goal:** Don't expose broken UX on mobile. Tiny.

| # | Item | Layer | Notes |
|---|---|---|---|
| F1 | Hide `<TimelineHost />` in `AppGmt.tsx` when mobile | `app-gmt/` | TimelineHost itself stays untouched; just don't mount |
| F2 | Hide animation entry points in topbar / panels that open timeline mode | `engine-gmt/` | Topbar registrations gain `mobile: false` flag from C2 |
| F3 | Stub message where the entry point would be (Camera or System menu): "Animation editing is desktop-only" | `engine-gmt/` | Only seen by users who look for it |
| F4 | Re-evaluate if mobile users ask for view-only playback (scrubber without editing) | — | Defer; reopen this plan if signal emerges |

---

## 5. Cross-cutting concerns

### Test coverage
- Manual: phone + tablet, real devices, both iOS Safari and Android Chrome.
- Automated checks unchanged (`npm run test:shader`, `test:render` etc.) — none of them exercise UI.
- Add a single visual smoke that confirms the portrait prompt renders at 390×844 portrait viewport. Stretch goal — user prefers manual visual testing per [memory/feedback_visual_smokes.md](../../../../Users/gighz/.claude/projects/h--GMT-workspace-gmt-stable/memory/feedback_visual_smokes.md). Skip unless trivial.

### Reusability for sibling apps
- `useMobileLayout` and the new `uiModePreference` slice live in shared `dev/store/slices/` and `dev/hooks/` — already shared.
- `MobileControls`, `HardwareDetection`, `Viewport` plugin — already engine-side.
- Portrait prompt: extract as a reusable component (e.g. `engine/components/LandscapeGate.tsx`) once ported, so `fluid-toy` etc. can opt in with one line.
- Topbar mobile flag pattern: implement at the plugin layer (TopBar plugin's render pass) so all apps benefit.

### Accessibility
- Don't break keyboard nav on tablet-with-keyboard.
- Touch targets ≥ 44px is also an a11y win (WCAG 2.5.5).
- Maintain `aria-label`s on icon-only buttons (audit during D5).

### Risk register
- **Drei touch orbit may have its own quirks** (over-zealous DOLLY_PAN, no bounds). Phase A6 catches this. Fall-back: write a thin custom touch handler that calls drei's `update()` manually — last resort.
- **Address-bar trick is iOS-Safari-quirky.** Phase A6 catches this too. The trick has worked in stable for months, so risk is low.
- **Phase B touches a lot of files via `debugMobileLayout` migration.** Use a single grep pass and a typed rename — TypeScript catches misses.
- **Phase C cull is opinionated.** Iterate visibly with the user; don't ship until they sign off on the list.

---

## 6. Iteration log (fill in as we go)

- **2026-05-01: Plan written.** Phase A ready to start.
- **2026-05-01: Phases A, B, C (first pass), D6, E1, F1 implemented in one session.** All landed under `npx tsc --noEmit → 0`.
  - **A:** `<LandscapeGate>` + `<MobileViewportShell>` engine primitives. Touch orbit gate added in `Navigation.tsx:666`. Hardcoded `isMobile={false}` in AppGmt's `<GmtNavigationHud>` mounts replaced. Left Dock hidden on mobile.
  - **B:** `debugMobileLayout: boolean` graduated to `uiModePreference: 'auto' | 'mobile' | 'desktop'`, persisted via localStorage under `gmt.uiModePreference`. `useMobileLayout()` rewritten to resolve via the preference. All call sites migrated. System menu's binary toggle replaced with the `UiModePreferenceMenuItem` tri-state pill row.
  - **C (iterative):** Topbar cull on mobile via the new `mobileHidden(Component)` HOC: AdaptiveResolution, RenderRegionToggle, ShareLinkButton, ViewportQuality, both dividers. Bucket-render install gated by `isMobileSnapshot()` at boot (acknowledged as non-reactive). Light Studio expand-to-8-lights chevron hidden on mobile. New System menu surrogates: a 6-button SCALABILITY_PRESETS grid (`MobileQualityMenuItem`) and an Adaptive Resolution toggle, both `when: isMobileSnapshot`.
  - **C (mobile menu architecture):** `mobileMenu` API + `<MobileMenuHost>` added to `Menu.tsx`. On mobile, opening any menu sets a global active-id and `<MobileMenuHost>` renders a scrollable side panel that swaps for the right Dock. Desktop popover path unchanged.
  - **C (File menu migration):** Bespoke `FileMenu` component in `SceneIO.tsx` retired; replaced with `menu.register('file', …)` + a `'custom'` `LoadSceneMenuItem` (owns the hidden `<input type="file">`). File menu now icon-only, matches Camera/System.
  - **D6:** `env(safe-area-inset-*)` padding on `MobileViewportShell` for notch / Dynamic Island / gesture-bar clearance.
  - **E1:** `useAppStartup` auto-downgrades scalability preset to `'fastest'` on mobile boot when the current preset is the engine default `'balanced'`.
  - **F1:** `<TimelineHost>` skipped on mobile.
  - **GMT-specific touch:** Right Dock hidden in Fly mode on mobile (joystick reach). Mounted `<MobileControls />` in AppGmt — was missing entirely from app-gmt's port.
  - **Cleanup pass:** review-agent audit pruned narration comments, hoisted style consts in `MobileViewportShell`, dropped a redundant `useState`/`useEffect` mirror in `MobileControls`, extracted a `pillClass(active, extra)` helper for the cyan active-button pattern, dropped the `extraItems` API from `SceneIO` (apps register file-menu items directly), replaced an inline X-close SVG with `CloseIcon`, flattened the right-dock conditional in AppGmt, added a defensive `useEffect` to close stale `MenuAnchor` `open` state when the user toggles into Force Mobile.
  - **Reference doc:** [docs/engine/17_Mobile_Layout.md](../docs/engine/17_Mobile_Layout.md) created. CLAUDE.md and DOCS_INDEX.md updated.

### Deferred (still in plan, not done)
- D1 (slider hit-target audit), D2 (`touch-action: none` sweep), D3 (FormulaGallery hover→tap), D5 (vibration extension), D7 (right-dock drawer alternative)
- E2 (lower targetFps for low-tier), E3 (`prefers-reduced-motion`)
- F2/F3 (animation entry-point hide + stub message)
- Mobile menu outside-tap dismissal (currently only the X button dismisses)
- Hoisting the resize-derived state into the engine store (~15 listeners across the session — works fine, but a single global listener would be cleaner)

---

## 7. Reference: deferred animation research

Research result: [mobile-animation-research.md](mobile-animation-research.md) (2026-05-01). Briefing covers task model (phone vs tablet vs desktop), full UI inventory, three layout options on the takeover→designed-mobile spectrum, MVP feature set, and won't-translate interactions + gating strategy.

**Recommendation from the briefing:** Option B (persistent 64px scrubber strip + half-sheet) for phone, C-lite for tablet. Single new component `<TimelineMobile />` mounted via `Timeline.tsx` branching.

**Interlocks with this plan if animation is reopened:**
- Phase F1 inverts: instead of hiding `<TimelineHost />`, it mounts the mobile variant.
- Phase D primitives (slider hit-targets, `touch-action`, vibration, safe-area) are prerequisites — already on the path.
- Phase D7 right-Dock drawer decision and the animation half-sheet primitive can share design.
- Bottom-edge collision: Option B's scrubber strip vs `MobileControls` joysticks needs a layout call before building.

---

## 8. File touch-list summary

Files this plan modifies, grouped by phase:

**Phase A:**
- `dev/app-gmt/AppGmt.tsx` — pass real `isMobile`, port portrait prompt + sticky wrapper, hide left Dock
- `dev/engine-gmt/navigation/Navigation.tsx` — add `pointerType === 'touch'` gates to 4 pointerdown handlers

**Phase B:**
- `dev/store/slices/uiSlice.ts` — replace `debugMobileLayout` with `uiModePreference`
- `dev/types/store.ts`, `dev/engine-gmt/types/store.ts` — type updates
- `dev/hooks/useMobileLayout.ts` — read preference, resolve auto
- `dev/App.tsx`, `dev/components/MobileControls.tsx`, `dev/engine-gmt/topbar.tsx`, `dev/engine-gmt/navigation/useInputController.ts` — call-site migration
- LocalStorage hydration in store init

**Phase C:**
- `dev/engine/plugins/TopBar.tsx` (or wherever the plugin lives) — add `mobile`/`desktopOnly` flag to item registration
- `dev/engine-gmt/topbar.tsx` — annotate which items are mobile-hidden
- `dev/components/layout/Dock.tsx` — extend mobile panel-redirect logic, audit tab strip overflow

**Phase D:**
- Slider hooks (e.g. `useDragValue`) and consumers — hit-target audit
- `dev/engine-gmt/components/panels/formula/FormulaGallery.tsx` — hover→tap
- `dev/engine-gmt/navigation/HudOverlay.tsx` (or similar) — mode-switch pill
- Vibration: extend pattern via shared helper
- Root wrapper `AppGmt.tsx` — safe-area padding
- `Dock.tsx` — drawer behaviour (if pursued)

**Phase E:**
- `dev/hooks/useAppStartup.ts` (or boot logic location) — auto-preset selection
- `dev/engine/plugins/Viewport.tsx` — tier-aware targetFps (optional)
- Boot path — `prefers-reduced-motion` check

**Phase F:**
- `dev/app-gmt/AppGmt.tsx` — conditional `<TimelineHost />`
- Wherever animation entry points live in topbar/menus
