# Engine-Level Z-Index / Stacking System — Holistic Map + Design

> **IMPLEMENTED 2026-06-23 (all phases).** See [ADR-0082](../docs/adr/0082-engine-layer-stacking-system.md) for the rationale and §7 below for what shipped + the visual-verification checklist. Gates green: `typecheck`, `test:zindex`, `check:zindex`, `smoke:boot`, `smoke:ui-primitives`, `smoke:help-menu`, `smoke:pause-controls`.

**Date:** 2026-06-23
**Status:** Implemented (architecture stabilisation, pre-1.0)
**Scope:** `engine/`, `engine-gmt/`, `components/`, and all six app entries — app-gmt, fluid-toy, fractal-toy, mesh-export, gradient-explorer, demo.
**Builds on:** `plans/z-index-app-audit.md` (prior app-gmt-scoped audit), ADR-0060 (the `Z` scale + floating-surface primitives), ADR-0081 (panelStack click-to-front).
**Method:** full-codebase census — 8 parallel auditors covering every domain, **300 z-index surfaces** and **51 stacking-context traps** catalogued, then synthesized and adversarially critiqued. This doc is the corrected synthesis.

> This supersedes the prior audit's scope (which was app-gmt-only). The two-stacking-domains insight from that audit is correct and is the foundation here.

---

## 0. The two facts everything hangs on

Nothing in this system is fixable by "just bump the number." Two structural truths govern every decision:

**Fact 1 — there is exactly one portal host: `document.body`.** Every `createPortal` in the suite targets `document.body`. The only deliberate exceptions are `HeroSlot` (→ mobile hero-rail node) and gradient-explorer's `splineMode` (→ the fullscreen stage node) — named-host portals, not app chrome. Each app's `index.html` mounts a single `<div id="root">`. So "the top host" is unambiguous today.

**Fact 2 — two stacking *domains* that do not compete by z-value:**

- **Portal domain** — surfaces `createPortal`'d to `document.body`. These order **globally** by numeric z. This is the *only* domain where the scale numbers mean what they say.
- **Shell / in-flow domain** — surfaces rendered inline under `MobileViewportShell` ([engine/components/MobileViewportShell.tsx:61-66](../engine/components/MobileViewportShell.tsx#L61): `fixed inset-0` desktop / `sticky top-0 h-[100dvh]` mobile) or under a `fixed inset-0` app root ([fluid-toy/FluidToyApp.tsx:183](../fluid-toy/FluidToyApp.tsx#L183), [fractal-toy/FractalToyApp.tsx:65](../fractal-toy/FractalToyApp.tsx#L65)). `fixed`/`sticky` **always** establishes a stacking context, so every in-flow descendant is confined inside it and can **never** paint above any positive-z body portal — no matter how astronomical its z.

This is why `TopBar` ([engine/plugins/TopBar.tsx:117](../engine/plugins/TopBar.tsx#L117), `z-[500]`) renders **under** a floating panel (`Z.panel = 100`, body-portalled): 500 is a *trapped* number, 100 is a *global* number — they are not on the same axis. Same reason `CompilingIndicator` ([components/CompilingIndicator.tsx:96](../components/CompilingIndicator.tsx#L96), `z-[99999]` in-flow) cannot cover a `Z.modal = 1000` Modal.

**Corollary that drives the whole API:** the only way to raise a surface above the panel band is to make it a **body portal**. Numeric escalation inside the shell is always futile. The system below makes "portal me to the top host at tier T" the *only* ergonomic path — so authors stop reaching for `z-[9999]`.

---

## 1. Holistic layer model

The canonical top→bottom order. **DOMAIN**: `PORTAL` orders globally (must be body-portalled to be honoured); `SHELL` orders only inside its trap (value is local). Bands are sparse to leave headroom for `base + rank` and future insertion.

### 1A. Portal domain — the real global z axis

| # | Tier | Band | Roles | Representative surfaces (file:line) |
|---|---|---|---|---|
| 1 | `emergency` | **100000** | GPU-loss / fatal recovery | `RenderContextLostOverlay` ([app-gmt/RenderContextLostOverlay.tsx:32](../app-gmt/RenderContextLostOverlay.tsx#L32)) |
| 2 | `deviceGate` | **9800** | rotate-to-landscape / orientation block | `LandscapeGate` ([engine/components/LandscapeGate.tsx:30](../engine/components/LandscapeGate.tsx#L30)) |
| 3 | `dragGhost` | **9600** (+rank) | cursor-following drag avatars (must clear menus) | GE drag/landing/cancel avatars ([gradient-explorer/GradientDropLayer.tsx:117](../gradient-explorer/GradientDropLayer.tsx#L117), [GradientLandingLayer.tsx:70](../gradient-explorer/GradientLandingLayer.tsx#L70)) |
| 4 | `contextMenu` | **9000** (+rank) | right-click / anchored menus, color-picker popups | `AnchoredMenu` default ([AnchoredMenu.tsx:77](../components/ui/AnchoredMenu.tsx#L77)); `GlobalContextMenu` ([:103](../components/GlobalContextMenu.tsx#L103)); `CategoryPickerMenu`; `SmallColorPicker`; CenterHUD hover-bridge |
| 5 | `tooltip` | **8500** (+rank) | hover-zoom previews, transient labels | `GradientHoverPreview`; `AdvancedGradientEditor` marquee ([:851](../components/AdvancedGradientEditor.tsx#L851)); `TutorialHighlight` ring |
| 6 | `toast` | **3200** | toasts that must clear modals *(opt-in; see §3f)* | `ToastHost` ([engine/components/ToastHost.tsx:27](../engine/components/ToastHost.tsx#L27)) — **only if** product wants toasts over modals; else stays shell |
| 7 | `compileProgress` | **3000** | non-blocking compile banner over modals | `CompilingIndicator` ([:96](../components/CompilingIndicator.tsx#L96)) |
| 8 | `overlayTop` | **2400** | sign-in/account over the gallery | `AuthOverlay`, `AccountPanel` |
| 9 | `overlayResult` | **2200** | result/zoom above a nested overlay | `BucketRenderResultModal`, `SubmitGalleryModal` zoom |
| 10 | `overlayNested` | **2100** (+rank) | modal launched from within an overlay | `Lightbox`, `SubmitGalleryModal`, `MySubmissionsOverlay`, Afx/Fbx export dialogs |
| 11 | `overlay` | **2000** (+rank) | full-screen app takeover | `GalleryPage`, `FullscreenGradientOverlay`, `DropTargetLayer`, GE reveal wells, `DiagnosticsOverlay` |
| 12 | `osDrop` | **1500** | OS file-drag scrim | `SceneFileDropZone` ([:103](../engine/components/SceneFileDropZone.tsx#L103)) |
| 13 | `modalNested` | **1100** (+rank) | dialog stacked on a modal | `NewSceneModal` discard-confirm, `LoadFilterPanel` |
| 14 | `modal` | **1000** (+rank) | blocking modal + backdrop | `Modal` default, `NewSceneModal`, `SettingsPanel`, `FormulaPicker` modal variant |
| 15 | `tool` | **600** | elevated non-blocking tool windows | `RenderDialog`, `StateDebugger`, `HelpBrowser` |
| 16 | `popover` | **300** (+rank) | anchored dropdowns/popovers — **once portalled** | `Popover` ([:91](../components/Popover.tsx#L91)) + all topbar dropdowns, `GeneratorSlotMods`, FormulaPicker popover variant |
| 17 | `panel` | **100–199** (+rank, click-to-front) | non-blocking floating windows | `FloatingPanel`/`DraggableWindow`, CenterHUD tear-off light panels, Favients shelf |
| 18 | `takeover` | **90** | full-screen browse/scrim that stays UNDER panels | `PalettePickerOverlay` ([:77](../app-gmt/PalettePickerOverlay.tsx#L77)) |

**Reserved ranges (inviolate):** `panel` consumes **100–199** in full (`panelStack` rank). `popover` was moved from 200 → **300** so there is a real gap above the panel band; nothing may squat in 100–299 except panel ranks. (This closes the critique's "panel→popover is a hard wall with no gap" finding.)

**The old 9999/99999/100000 cluster is now deterministic:** `emergency (100000) > deviceGate (9800) > dragGhost (9600) > contextMenu (9000) > tooltip (8500) > compileProgress (3000)`. Note `FormulaPicker`'s old `9999`/`10000` were trap-escape workarounds; once portalled they drop to their *semantic* tiers (`popover` for the popover variant, `tooltip` for the hover thumb) and leave the top cluster entirely.

### 1B. Shell / in-flow domain — local order, value meaningful only inside the named trap

These never compete with §1A. The model names them so authors stop inventing literals; numbers are small and local.

| Shell tier | Band | Trap (stacking-context root) | Surfaces |
|---|---|---|---|
| `shellRedock` | 1000 | app root (`DropZones` is itself `fixed inset-0`) | `DropZones` panel-redock zones ([layout/DropZones.tsx:51](../components/layout/DropZones.tsx#L51)) |
| `shellToast` | 900 | app root / shell | `ToastHost` (default home), `FirstRunHint` (800) |
| `shellTopbar` | 500 | shell flex column | `TopBar` header — itself a sub-trap (see below) |
| `shellLoading` | 100 | shell | `LoadingScreen` (engine-core [components/LoadingScreen.tsx:52](../components/LoadingScreen.tsx#L52) **and** app-gmt [app-gmt/LoadingScreen.tsx:288](../app-gmt/LoadingScreen.tsx#L288)), `MobileControls` |
| `shellDock` | 40 | shell flex row | `Dock` root + grips |
| `shellTimeline` | 40 | `Timeline` root ([Timeline.tsx:293](../components/Timeline.tsx#L293): `relative z-40 backdrop-blur` — its own trap) | all timeline chrome: Ruler/TrackRow/Group/AudioStrip/DopeSheet/TimeNavigator/SelectionTransformBar/resize handles |
| `shellViewportOverlay` | 20 | `ViewportFrame` inner (transform:scale in Fixed mode — its own trap) | `DomOverlays` (×3 copies), region banner, `CompositionOverlay`, deep-zoom diagnostics, `PerformanceMonitor` |
| `shellHud` | 10 | `HudOverlay` layer | `HudOverlay`, HUD widgets, fractal-toy FPS/name labels |
| `localGizmo` | 0–50 | per-component `relative`/`overflow`/`transform`/`isolate` container | every in-flow handle/scrim/badge — see the families below |

**`localGizmo` families** (all correctly trapped in their own container, no action needed — listed so "every surface is placed" is true): gradient-editor knot/bias/region handles (z-5..z-30); Histogram handles (z-10..z-40); Slider / ScalarInput / VectorInput / VectorAxisCell grips (z-0..z-20); AutoFeaturePanel / ParentSection scrims (z-10) + confirm (z-50); **Graph editor cluster** — `GraphEditor` mode-toast (z-50), `GraphSidebar` (z-10/z-40), `GraphSelectionBBox` (z-30), `GraphToolbar` (z-20/z-50), each inside the graph canvas `relative` container; light gizmo label (z-20); FlowEditor toolbar/ghost (z-10/z-50); HybridAdvancedLock (z-10/z-50/z-[-1]); mesh-export PreviewCanvas overlays; Favients in-panel menu/toast/trash/swatch (z-10..z-50); `MobileMenuHost` side panel (no z — orders by DOM position in the dock row).

**Sub-traps inside the shell** (a positioned+z'd or transformed element nested in the shell that re-traps its own children):

- `TopBar` header (`z-[500]`) → traps CenterHUD popups, Menu desktop dropdowns.
- `Dock` (`z-40`) → traps dock-internal popovers.
- `Timeline` (`z-40` + `backdrop-blur`) → traps all timeline chrome.
- `ViewportFrame` Fixed-mode `transform:scale` → traps all viewport overlays.
- `SinglePositionGizmo` container (`transform: translate3d` + `will-change`, [engine/components/gizmo/SinglePositionGizmo.tsx:128](../engine/components/gizmo/SinglePositionGizmo.tsx#L128)) → traps the `SingleLightGizmo` label. **This gizmo is positioned imperatively per-frame and SHOULD stay in-flow** — it is anchored to scene coordinates and belongs inside the viewport's context. It is *not* a `<Layer>` candidate.
- `WebcamOverlay` LAYER-1 container (`mix-blend-mode` + `perspective:1000px` + child `rotateY`, [engine/features/webcam/WebcamOverlay.tsx:333](../engine/features/webcam/WebcamOverlay.tsx#L333)) → traps the webcam settings panel (z-50) and crop/scale handles. **`mix-blend-mode` and `perspective` are stacking-context triggers** the first-draft design missed — a future author must NOT try to portal the webcam settings panel out while leaving `mix-blend-mode` on the parent (compositing would still be affected).
- `CompositionOverlay` (`mix-blend-mode: difference`, [components/viewport/CompositionOverlay.tsx:48](../components/viewport/CompositionOverlay.tsx#L48)) → its own context independent of its z-[15]. Benign (scene chrome) but is a blend-mode trap.
- Favients `FloatingPanel` root (fixed + z) → traps the panel's own menu/toast — which is *why* `GradientHoverPreview` portals out at the `tooltip` tier (the canonical portal-vs-trap example).

**Trap-trigger taxonomy** (what to grep for when hunting new traps): `position: fixed|sticky`, `position:absolute` + z, `transform`/`translate`/`scale`/`rotate`, `filter`, **`backdrop-filter` / `backdrop-blur`** (the `glass-panel` class!), `will-change`, `isolation: isolate`, `opacity < 1`, **`mix-blend-mode`**, **`perspective`**, `contain: paint|layout|strict`, `mask`, `clip-path`.

---

## 2. The portal-vs-trap rule, generalized

### The rule (one sentence)

> **To paint above the floating-panel band (≥ 100), a surface MUST be a body portal.** An in-flow surface's z orders it only against its trapped siblings and can never exceed any positive-z body portal — so any surface in `popover` and above MUST mount via the engine's portal host, never inline.

### Current violators (in-flow surfaces that *want* to beat a body portal)

| Violator | File:line | Today | Intended tier | Symptom |
|---|---|---|---|---|
| **`Popover` (all consumers)** | [Popover.tsx:91](../components/Popover.tsx#L91) | `z-[70]` in-flow | `popover` | **The headline bug:** topbar dropdowns (ViewportQuality, ShadowSettings, LightSettings, BucketRenderPanel), GeneratorSlotMods, AuthTopbarWidget menu render UNDER floating panels |
| `Menu` desktop dropdown | [Menu.tsx:378](../engine/plugins/Menu.tsx#L378) | `z-50` in-flow | `popover` | trapped in TopBar header |
| `CenterHUD` expanded light grid | [CenterHUD.tsx:387](../engine-gmt/topbar/CenterHUD.tsx#L387) | `z-[80]` in-flow | `popover` | trapped in TopBar `z-[500]` context |
| `CompilingIndicator` | [CompilingIndicator.tsx:96](../components/CompilingIndicator.tsx#L96) | `z-[99999]` in-flow | `compileProgress` | cannot cover a modal on mobile |
| `LandscapeGate` | [LandscapeGate.tsx:30](../engine/components/LandscapeGate.tsx#L30) | `z-[9999]` in-flow | `deviceGate` | trapped under shell |
| `SceneFileDropZone` | [SceneFileDropZone.tsx:103](../engine/components/SceneFileDropZone.tsx#L103) | `z-[1500]` in-flow | `osDrop` | cannot cover an open modal during OS drag |
| `DiagnosticsOverlay` | [DiagnosticsOverlay.tsx:42](../app-gmt/DiagnosticsOverlay.tsx#L42) | `z-[2000]` in-flow | `overlay` (+rank) | numeric collision w/ `Z.overlay`, trapped under shell |
| Tutorial card | [tutorial/Overlay.tsx:230](../engine/plugins/tutorial/Overlay.tsx#L230) | `zIndex 9998` in-flow | `tooltip` (or dedicated `tutorial`) | **split-context hazard** — its paired `Highlight` ring IS portalled (9999), so card + ring live in *different* stacking contexts on mobile |
| GE `GradientSourcePicker` / `EasingPicker` | palette/components | `z-[60]` `fixed inset-0` in-flow | `modal`/`popover` | escape only because the GE shell happens to have no transformed ancestor — fragile |
| `RenderContextLostOverlay` | [RenderContextLostOverlay.tsx:32](../app-gmt/RenderContextLostOverlay.tsx#L32) | `z-[100000]`, hand-placed *outside* the shell ([AppGmt.tsx:494](../app-gmt/AppGmt.tsx#L494)) | `emergency` | works **only** because it's manually mounted after `</MobileViewportShell>` — fragile, relies on a mount-site rule a refactor could break |

`FormulaPicker`'s popover variant ([FormulaPicker.tsx:933](../engine-gmt/components/FormulaPicker/FormulaPicker.tsx#L933) — verified body-portalled) and hover thumb are *already* portals; they just carry trap-escape numbers (9999/10000) that should become `popover`/`tooltip` tier tokens.

### Making "portal me to the top" un-skippable

Every violator has the same shape, so the engine provides **one** primitive that *cannot be hand-trapped* (§3d): `<Layer tier="...">` always `createPortal`s to the registered top host and always sets z from the tier table. You cannot accidentally render it inline at `z-[9999]` inside the shell. This converts the rule from "remember to portal" (which 10 surfaces forgot) into "you literally can't not portal."

---

## 3. The generic engine-level API

### (a) Named-tier source of truth — `components/ui/zIndex.ts` (already imported by every app)

Extend the flat const into a structured table that encodes **domain** + headroom, with a back-compat `Z` proxy so **zero call sites change**:

```ts
export type LayerDomain = 'portal' | 'shell';
export interface TierDef { base: number; span: number; domain: LayerDomain; }

export const TIERS = {
  // ── PORTAL (global order) ──────────────────────────
  takeover:        { base: 90,     span: 0,  domain: 'portal' },
  panel:           { base: 100,    span: 99, domain: 'portal' }, // 100..199 click-to-front (RESERVED)
  popover:         { base: 300,    span: 99, domain: 'portal' }, // moved off 200 → real gap above panel
  tool:            { base: 600,    span: 0,  domain: 'portal' },
  modal:           { base: 1000,   span: 50, domain: 'portal' },
  modalNested:     { base: 1100,   span: 50, domain: 'portal' },
  osDrop:          { base: 1500,   span: 0,  domain: 'portal' },
  overlay:         { base: 2000,   span: 50, domain: 'portal' },
  overlayNested:   { base: 2100,   span: 50, domain: 'portal' },
  overlayResult:   { base: 2200,   span: 0,  domain: 'portal' },
  overlayTop:      { base: 2400,   span: 0,  domain: 'portal' },
  compileProgress: { base: 3000,   span: 0,  domain: 'portal' },
  toast:           { base: 3200,   span: 0,  domain: 'portal' }, // opt-in toasts-over-modals
  tooltip:         { base: 8500,   span: 99, domain: 'portal' },
  contextMenu:     { base: 9000,   span: 99, domain: 'portal' },
  dragGhost:       { base: 9600,   span: 9,  domain: 'portal' },
  deviceGate:      { base: 9800,   span: 0,  domain: 'portal' },
  emergency:       { base: 100000, span: 0,  domain: 'portal' },

  // ── SHELL (local order, value meaningful only in-trap) ──
  shellHud:             { base: 10,   span: 0, domain: 'shell' },
  shellViewportOverlay: { base: 20,   span: 0, domain: 'shell' },
  shellDock:            { base: 40,   span: 0, domain: 'shell' },
  shellTimeline:        { base: 40,   span: 0, domain: 'shell' },
  shellLoading:         { base: 100,  span: 0, domain: 'shell' },
  shellTopbar:          { base: 500,  span: 0, domain: 'shell' },
  shellToast:           { base: 900,  span: 0, domain: 'shell' },
  shellRedock:          { base: 1000, span: 0, domain: 'shell' },
} as const satisfies Record<string, TierDef>;

export type Tier = keyof typeof TIERS;

/** Back-compat: old flat `Z.modal` accessors keep working — no call-site churn. */
export const Z = Object.fromEntries(
  Object.entries(TIERS).map(([k, v]) => [k, v.base]),
) as Record<Tier, number>;

export function z(tier: Tier, rank = 0): number {
  const t = TIERS[tier];
  if (import.meta.env.DEV && rank > t.span)
    console.error(`z('${tier}', ${rank}): rank exceeds span ${t.span} — silent collision risk.`);
  return t.base + Math.min(rank, t.span);
}
```

The `rank > span` **dev assertion** (not a silent `Math.min`) closes the critique's "ranks above span collapse silently" finding.

### (b) Intra-layer ordering — generalize `panelStack` into `layerStack`

Three ordering needs, unified:

1. **Static rank** — `z('popover', 0)`. A surface that just needs its tier.
2. **Click-to-front / open-order rank** — generalize [panelStack.ts](../components/ui/panelStack.ts) from "panels only" to **any rank-able tier** by keying the store on the tier:

```ts
// components/ui/layerStack.ts — one ephemeral order-list PER rank-able band, so
// panels / popovers / overlays each have independent ordering, never bleeding.
export function useLayerStackZ(tier: Tier, id: string): number {
  const store = getBandStore(tier);                 // lazily created per band
  const rank = store((s) => s.order.indexOf(id));
  return z(tier, rank < 0 ? 0 : rank);
}
```

`panelStack.ts` becomes the `tier='panel'` instance (ADR-0081 invariants carry over verbatim per band: session-local, never persisted, participating-only). This also gives **stacked modals/overlays open-order ranking** (closing the critique's "`overlay` span:0 → DiagnosticsOverlay collides with GalleryPage at exactly 2000" finding: `overlay` gets `span:50` + open-order rank).

3. **Explicit elevation** — a surface opts out of a band's stack by declaring a different tier (today `SettingsPanel` passes `Z.modal`, `RenderDialog` passes 600). No special-casing.

### (c) Extending without renumbering

Bands are deliberately sparse. New categories slot into gaps, never renumber neighbours:

- **New global tier** → pick an unused gap (e.g. a "broadcast lower-third" at 700, between `tool` 600 and `modal` 1000) and add a `TIERS` entry. Existing tiers untouched.
- **App-private tiers** → an app registers *namespaced* tiers without editing the shared module:
  ```ts
  registerTiers({ fluidDeepZoomHud: { base: 25, span: 0, domain: 'shell' } });
  ```
  The registry **validates no `[base, base+span]` overlap** with an existing tier (throws in dev) — the genericise-don't-fork path.
- **Honest caveat (from the critique):** the gaps are not uniform. `panel` (100–199) abuts `popover` (300) with 200–299 free — fine now. But the `panel→popover` adjacency is the one spot to watch: a future "panel-attached toolbar that must clear other panels but sit under dropdowns" lands in 200–299, which is currently the *only* reserved-ish gap there. Everywhere else (300→600, 600→1000, 3200→8500) has thousands of free units.

### (d) Enforcing "body-portal or you're trapped" — the `<Layer>` primitive + explicit host

```ts
// engine/ui/layerHost.ts — registered once at boot; a future portal-root div is a 1-line swap.
let host: HTMLElement | null = null;
export const setLayerHost = (el: HTMLElement) => { host = el; };
export const getLayerHost = () => host ?? document.body;
```

```tsx
// components/ui/Layer.tsx — the ONLY way to author a floating surface.
export function Layer({ tier, rank = 0, stackId, anchor, children, style, host, ...rest }: LayerProps) {
  const def = TIERS[tier];
  const zIndex = stackId ? useLayerStackZ(tier, stackId) : z(tier, rank);
  const node = (
    <div style={{ position: 'fixed', zIndex, ...anchorStyle(anchor), ...style }} {...rest}>
      {children}
    </div>
  );
  // PORTAL tiers always go to the top host (or an explicit named host for HeroSlot/splineMode).
  // SHELL tiers render inline (their value is local by definition).
  return def.domain === 'portal' ? createPortal(node, host ?? getLayerHost()) : node;
}
```

- `Modal` / `AnchoredMenu` / `FloatingPanel` / `Popover` / `DropTargetLayer` / `GradientHoverPreview` / drag avatars all re-express on top of `<Layer>` → there is then **one** `createPortal` path in the codebase.
- An author who writes `<Layer tier="popover" anchor={rect}>` gets a correctly-portalled, correctly-z'd dropdown with zero positioning knowledge and *cannot* hand-trap it.
- The `host` override is the documented escape hatch for the two legit named-host portals (`HeroSlot`, `splineMode`).

### (e) Lint / guards against regression

1. **Ban raw `z-[N]` ≥ 100 outside the scale** — ESLint rule (or `npm run health` grep gate) flagging any `z-[NNN]` / inline `zIndex:` literal ≥ `panel.base` not sourced from `z(tier)`/`Z.*`. Allowlist the few legit shell literals by tier comment. Directly catches a future `z-[9999]`.
2. **Ban `createPortal(_, document.body)` outside `Layer`/`getLayerHost()`** — stops the next hand-rolled body portal (today: GlobalContextMenu, CategoryPickerMenu, SmallColorPicker, FormulaPicker — all should route through `<Layer>`).
3. **Tier-overlap unit test** — assert no two tiers' `[base, base+span]` ranges overlap within a domain. Makes "add a tier" safe in CI.
4. **`@invariant` on `panelStack`/`layerStack`** — keep 100–199 documented at source so a refactor can't reclaim it.

### (f) The `toast` decision (resolving the critique's contradiction)

`<Layer tier="shellToast">` would render **inline** (shell domain) — so the first draft's "portal ToastHost at shellToast" was impossible. Resolution: **`ToastHost` stays `shellToast` (900, in-flow) by default** — it works today and toasts-over-modals is a product call, not a z-system requirement. *If* product wants toasts to clear modals, move `ToastHost` to the new **`toast` portal tier (3200)** — a deliberate, documented promotion, not an accident.

---

## 4. Sibling-app & gradient-editor fit

**fluid-toy** — composes its real floating surfaces from engine primitives (DraggableWindow, GlobalContextMenu) → inherits the scale for free. Only debt: `DomOverlays` is a *local re-implementation* ([fluid-toy/components/DomOverlays.tsx:19](../fluid-toy/components/DomOverlays.tsx#L19)) duplicated in all three apps, plus a raw `zIndex:5` deep-zoom diagnostics wrapper. **Action: dedupe the three `DomOverlays` copies into one engine component reading `z('shellViewportOverlay')`.** No behavioural change.

**fractal-toy** — same `DomOverlays` dedupe; FPS/name labels are `shellHud` (order by DOM source, fine). No floating-surface debt.

**mesh-export** — the outlier: hand-rolls layout, **no** Z scale, **no** portals, native `<select>` dropdowns. **Decision (not silence):** mesh-export is a **deliberate off-system exception today** (like `HeroSlot`/`splineMode`) — flagged here so it's a choice, not drift. *The moment it adds any custom (non-native) floating popover, it MUST use `<Layer tier="popover">`* — at which point it joins the system automatically. One `z-50` donate button → `localGizmo`.

**Gradient editor** (gradient-explorer + palette/ + AdvancedGradientEditor) — the most z-active app, already *mostly* correct (its floaters body-portal with explicit high z). Reconciliation:

- Drag/landing/cancel avatars (9600) → `dragGhost` band, ranked above the hover preview; hover preview (9500) → `tooltip`; marquee (z-[9999]) → `tooltip`. **The *relationship* (avatar above preview) is load-bearing, not the absolute numbers** — encode via ranks so the hand-off stays seamless. *(VERIFY: GradientHoverPreview moves from above context-menus (9500>9000) to below (`tooltip` 8500 < `contextMenu` 9000). Deliberate — menus conventionally win — but check no preview+menu coexists badly.)*
- `GradientHoverPreview` keeps portalling (it exists *specifically* to escape the Favients `FloatingPanel` trap — the canonical rule example).
- `FullscreenGradientOverlay` + GE reveal wells → already on-scale `overlay`, keep.
- `GradientSourcePicker` / `EasingPicker` (`z-[60]` `fixed inset-0`) → promote to `<Layer tier="modal">`; fragile today.
- **The z1000-vs-z2000 deconfliction (load-bearing GE rule), reframed structurally:** GE drop overlays (`overlay`, body-portal) sit above the engine panel-redock `DropZones` (`shellRedock`, in-flow `fixed`). **This is a *structural* guarantee (body-portal beats shell-fixed regardless of the numbers), not a numeric one** — do NOT reason "2000 > 1000 so GE wins" (they're in different stacking contexts; the numbers are nearly irrelevant). The existing fix — **GE stands its whole layer down (`!panelDragActive`) during a panel drag** — is correct and stays. This is the canonical "two layers legitimately want the same pointer; gate one off by interaction state, don't renumber" pattern.

**demo** — `DemoExplainer` SourceModal (`z-[1100]`) → `<Layer tier="overlay">`. One-line, smallest mount.

---

## 5. Migration plan

Ordered low→high risk. **SAFE** = pure rename / token substitution, byte-identical render order, no visual check. **VERIFY** = changes portal host or stacking domain → user visual pass (user does visual testing).

### Phase 0 — Land the table (SAFE)
1. Restructure [zIndex.ts](../components/ui/zIndex.ts) → `TIERS` + `Z` back-compat proxy + `z(tier, rank)` with the dev rank assertion. Existing `Z.modal` etc. resolve identically — **no call-site changes.** Add the tier-overlap unit test.
2. Generalize [panelStack.ts](../components/ui/panelStack.ts) → `layerStack.ts` keyed by tier; re-export `panelStack` as the `tier='panel'` instance. Behaviour identical; ADR-0081 invariants preserved; 100–199 reserved.

### Phase 1 — Tokenize on-scale literals (mostly SAFE)
3. Replace literals that already match a tier value with the token: `RenderDialog`/`StateDebugger`/`HelpBrowser` `600` → `z('tool')`; `SubmitGalleryModal` zoom `z-[2200]` → `z('overlayResult')`; `GlobalContextMenu`/`CategoryPickerMenu`/`SmallColorPicker`/`EngineFeatureRow` `9999` → `z('contextMenu')` (already body portals).
4. **VERIFY (re-tier of the top cluster — NOT safe, per the critique):** GE avatars 9600 → `z('dragGhost')`; GE hover preview 9500 + AdvancedGradientEditor marquee z-[9999] → `z('tooltip')`; FormulaPicker popover/thumb 9999/10000 → `z('popover')`/`z('tooltip')`. These *change pairwise order* vs today (e.g. avatar-vs-menu, preview-vs-menu) — verify each surface's neighbours visually; do not assume byte-identical.

### Phase 2 — Build `<Layer>` + host (SAFE to add)
5. Add `engine/ui/layerHost.ts` + `<Layer>`. Re-express `Modal`/`AnchoredMenu`/`FloatingPanel` on it — internal refactor, same output. Add the `host` override for `HeroSlot`/`splineMode`.

### Phase 3 — Portal the trapped violators (VERIFY each — these change stacking domain)
6. **`Popover` → `<Layer tier="popover" anchor={triggerRect}>`** — the headline fix (topbar dropdowns under panels). VERIFY every consumer (ViewportQuality, ShadowSettings, LightSettings, BucketRenderPanel, GeneratorSlotMods, Menu desktop dropdown, AuthTopbarWidget) floats over panels and flip/clamp still positions against the anchor.
7. `CompilingIndicator` → `compileProgress`; `LandscapeGate` → `deviceGate`; `SceneFileDropZone` → `osDrop`; `DiagnosticsOverlay` → `overlay` (+rank). VERIFY each covers what it should.
8. `RenderContextLostOverlay` → `<Layer tier="emergency">` — removes the fragile hand-placement outside the shell. VERIFY it still covers everything on context loss.
9. Tutorial card → `<Layer tier="tooltip">` (or a dedicated `tutorial` tier just below `deviceGate`) so card + `Highlight` ring share one context. VERIFY no split-context on mobile.
10. GE `GradientSourcePicker`/`EasingPicker` → `<Layer tier="modal">`; demo `DemoExplainer` → `<Layer tier="overlay">`. VERIFY.

### Phase 4 — Consolidate + guard (SAFE)
11. Dedupe the three `DomOverlays` copies into one engine component reading `z('shellViewportOverlay')`.
12. Add the lints (§3e); wire into `npm run health` / `typecheck`.

### Invariants the migration must NOT break
- **Panel band 100–199 stays reserved** for `panelStack` click-to-front (ADR-0081). No tier/rank lands in (100,199].
- **`takeover` (90) stays UNDER `panel`** — `PalettePickerOverlay` keeps the Favients shelf draggable over it.
- **`overlay` (portal) vs `shellRedock` is a *structural* relationship** (body beats shell) — the GE panel-drag stand-down stays; don't "fix" it by renumbering.
- **`Modal` backdrop-dismiss / capture-Escape / `useDismiss` scope semantics** (ADR-0060) are unchanged — `<Layer>` is positioning only.
- **Imperatively-transformed gizmos** (`SinglePositionGizmo`) stay in-flow — they're scene-anchored, not `<Layer>` candidates.

---

## 6. What lands when

- **Phases 0, 2, 4 are SAFE** and can land as one foundation PR (table + `<Layer>` + dedupe + lints) with only `typecheck`/`smoke:boot` gates.
- **Phase 1 item 3 is SAFE; item 4 is VERIFY** (top-cluster re-tier changes order).
- **Phase 3 is the behavioural surface** — the actual "fix topbar-under-panels" work — and lands item-by-item with a visual check on each, since each moves a surface between stacking domains.

The foundation (Phases 0+2) is the part that makes "working with z of UI straightforward from here onwards": after it, a new surface is `<Layer tier="...">` and nothing else — no numbers, no portal boilerplate, no trap risk.

---

## 7. Implementation status (shipped 2026-06-23) & visual-verification checklist

All five phases landed on branch `feat/zindex-layer-system`. Rationale: [ADR-0082](../docs/adr/0082-engine-layer-stacking-system.md).

### What shipped

- **Foundation** — `components/ui/zIndex.ts` (domain-tagged `TIERS` + `Z` Proxy + `z()` + `registerTiers`/`findPortalOverlaps` + `ZTier` alias), `layerStack.ts` (per-tier click-to-front; `panelStack.ts` is now the `'panel'` instance), `layerHost.ts` (`get/setLayerHost`), `Layer.tsx` (`forwardRef` portal primitive). `Modal`/`AnchoredMenu`/`FloatingPanel` now portal through `getLayerHost()`. Barrel (`components/ui/index.ts`) exports the new API.
- **Tokenized** — tool windows (`RenderDialog`/`StateDebugger`/`HelpBrowser` → `tool`), portalled menus (`GlobalContextMenu`/`CategoryPickerMenu`/`SmallColorPicker` → `contextMenu`, `EngineFeatureRow` tooltip → `tooltip`), `SubmitGalleryModal` zoom → `overlayResult`, GE avatars → `dragGhost`, GE hover preview + AdvancedGradientEditor marquee → `tooltip`, GE wells → `overlay`, the four `DomOverlays` → `shellViewportOverlay`.
- **Portalled (moved stacking domain)** — `Popover` (now portals; the *custom* topbar dropdowns float above panels), the **`Menu.tsx` desktop dropdown** (File/System/Help/Camera — portalled at `popover` tier, measuring the trigger; dismissal lists both the trigger anchor and the portalled dropdown so toggle rows don't self-dismiss), `CompilingIndicator` → `compileProgress`, `LandscapeGate` → `deviceGate`, `SceneFileDropZone` → `osDrop`, `DiagnosticsOverlay` → `overlay`, `RenderContextLostOverlay` → `emergency`, tutorial card → `tooltip` (+ Highlight ring tokenized), `GradientSourcePicker`/`EasingPicker` → `modal`, `DemoExplainer` SourceModal → `overlay`.
- **Guards** — `npm run test:zindex` (tier-overlap + invariants), `npm run check:zindex` (ratchet: no new raw `z-[≥100]`).

### Visual-verification checklist (user does visual testing)

**The headline fix — topbar dropdowns over panels (highest priority):**
1. Open a floating panel (e.g. tear off a light panel, or open Audio/Settings). Then open each topbar dropdown — **File / System / Help / Camera menus, Viewport Quality, Play/Pause, Light Studio popups** — and confirm each now renders **ABOVE** the floating panel (was under). Check flip/clamp still positions each dropdown right below its trigger, and that opening one closes on outside-click / Escape as before.

**Top-cluster re-tier (order changed — VERIFY):**
2. Right-click context menus, the small color picker, category picker — still topmost over everything except a drag avatar.
3. Gradient editor: drag a swatch — the **drag avatar** stays above the **hover preview** card (both moved tiers but kept that relationship). Hover a swatch for the enlarged preview; confirm it shows.
4. Tutorial (if runnable): the step card + its glowing highlight ring now share a layer — confirm on **mobile** they no longer diverge, and the card sits where expected.

**Domain moves (each changed how it mounts):**
5. `CompilingIndicator` banner appears over an open modal during a compile.
6. Rotate a phone to portrait → `LandscapeGate` covers everything.
7. OS-drag a `.gmf` file in → the drop scrim covers the app (and a modal if open).
8. Gallery / overlays still stack correctly (Gallery < Lightbox/Submit < result/zoom < Auth/Account).
9. GE `GradientSourcePicker` / `EasingPicker` (generator source/easing) open centred, dismiss on backdrop/Esc, and aren't clipped.
10. `DiagnosticsOverlay`, `RenderContextLostOverlay` (force a GPU context loss), `DemoExplainer` source modal each cover what they should.
11. **Sibling apps:** boot fluid-toy and fractal-toy — DOM viewport overlays, HUD, context menus, floating windows all stack as before.

**Regression watch:** floating-panel click-to-front still works (click a back panel → it raises); the Palette Picker scrim stays UNDER floating panels (Favients shelf draggable on top).

### Deferred (tracked, not debt-by-omission)

- **`DomOverlays` structural dedupe** — the four near-identical copies were tokenized but not merged into one engine component (a re-render-sensitive refactor; out of scope for z-index).
- **Portal backlog** — ~7 surfaces still `createPortal(_, document.body)` directly and `CenterHUD`/`FormulaPicker` carry raw portal-z numbers (allowlisted in `check:zindex`); all correct today, migrate to `z()`/`<Layer>` opportunistically.
