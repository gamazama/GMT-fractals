# App-wide Z-index / stacking audit — handoff for the ultracode pass

**Date:** 2026-06-23
**Author:** prep session (panel click-to-front work)
**Purpose:** brain-dump of everything learned about stacking across the app so a holistic z-ordering pass starts with the full picture — especially the one architectural fact that makes naive "just bump the z" fixes fail.

---

## 0. The single most important fact (read this first)

**There are two stacking domains that do NOT compete by z-value:**

1. **Body-level portals** — `FloatingPanel`, `Modal`, `AnchoredMenu`, and most overlays `createPortal(…, document.body)`. They are `position: fixed`/`absolute` children of `<body>` and stack against each other by their z-index.
2. **Shell-internal, in-flow elements** — the topbar, dock, timeline, viewport chrome, CenterHUD, and all their *inline* dropdowns. These live inside `MobileViewportShell`.

`MobileViewportShell` ([engine/components/MobileViewportShell.tsx:61-66](../engine/components/MobileViewportShell.tsx#L61)) is **`position: fixed`** on desktop (`fixed inset-0`) and **`position: sticky`** on mobile. **Both `fixed` and `sticky` ALWAYS establish a stacking context, regardless of z-index.** The shell itself carries no z-index, so at the `<body>` level it sits at `z-auto` (≈0).

**Consequence:** every element *inside* the shell is trapped within the shell's stacking context. No matter how high its z-index (the topbar is `z-[500]`), it can never paint above a body-level portal with a positive z-index. A floating panel portalled to body at `z-100` paints over the **entire shell** — topbar included.

> This is why the topbar dropdowns (File/System/Help/Camera, Viewport Quality, Play/Pause, Light Studio popups) render **under** the floating panels, and why changing the topbar's z-index from 500→80→500 made no difference to that. The fix is **not** a number — it's *where the element is mounted*. To stack above the body-level panels, an element must itself be portalled to `document.body` (or some other host above the panels).

**Therefore the pass's core decision is architectural, not numeric:** decide which things are portalled (body-level) and which are shell-internal, then assign z within each domain. Anything that must beat the floating panels has to leave the shell.

---

## 1. The current Z scale

[components/ui/zIndex.ts](../components/ui/zIndex.ts) — the named-tier source of truth for **portalled** surfaces:

```
takeover     90    full-screen scrim/browse surfaces UNDER floating panels (Palette Picker)   ← added this session
panel        100   non-blocking floating panels (FloatingPanel / DraggableWindow)
popover      200   anchored dropdowns / popovers attached to a trigger
modal        1000  blocking modal + backdrop
modalNested  1100  dialog stacked on a modal
overlay      2000  full-screen takeover (Gallery)
overlayNested 2100 modal launched within an overlay (Submit, Lightbox)
overlayResult 2200 result/zoom surface above nested (bucket-render result)
overlayTop   2400  above the whole overlay band (Auth / Account)
contextMenu  9000  right-click / context menus — always topmost
```

Note: floating panels are **dynamic** now — `Z.panel + rank` (100..~199) via the click-to-front stack (§4). So the 100-band is a *range*, not a point; `popover` (200) is the ceiling that must stay clear.

---

## 2. Census — who renders at what, and in which domain

### Body-level (portalled to document.body — these DO compete by z)

| Element | File:line | z | Notes |
|---|---|---|---|
| FloatingPanel (panels) | [FloatingPanel.tsx](../components/ui/FloatingPanel.tsx) | `Z.panel + rank` 100–~199 | portalled; click-to-front stack |
| Modal (generic) | [Modal.tsx:63](../components/ui/Modal.tsx#L63) | prop, default `Z.modal` | portalled |
| Palette Picker overlay | [PalettePickerOverlay.tsx:77](../app-gmt/PalettePickerOverlay.tsx#L77) | `Z.takeover` (90) | was `Z.modal`; demoted this session |
| AnchoredMenu | [AnchoredMenu.tsx:39,77](../components/ui/AnchoredMenu.tsx#L39) | default `Z.contextMenu` (9000), prop | portalled |
| GlobalContextMenu | [GlobalContextMenu.tsx:103,211](../components/GlobalContextMenu.tsx#L103) | `z-[9999]` | portalled (root); submenus inline |
| CategoryPickerMenu | [CategoryPickerMenu.tsx:118](../components/CategoryPickerMenu.tsx#L118) | `z-[9999]` | portalled |
| EngineFeatureRow tooltip | [EngineFeatureRow.tsx:181](../components/panels/engine/EngineFeatureRow.tsx#L181) | `z-[9999]` | portalled, pointer-events-none |
| Gallery / overlays | GalleryPage, Lightbox, BucketRenderResultModal, SubmitGalleryModal, Auth, Account | `Z.overlay`..`Z.overlayTop` | portalled Modals |
| CompilingIndicator | [CompilingIndicator.tsx:96](../store/CompileProgressStore.ts) (approx) | `z-[99999]` | compile progress |
| RenderContextLostOverlay | RenderContextLostOverlay.tsx | `z-[100000]` | GPU-loss emergency |
| Toasts (ToastHost) | engine/components/ToastHost | ~900 | transient |
| DropZones (panel redock) | [DropZones.tsx:51](../components/layout/DropZones.tsx#L51) | `z-[1000]` | portalled overlay during panel drag |

### Shell-internal (inline, in-flow — TRAPPED below body portals; z only orders them among themselves)

| Element | File:line | z (within shell) | Portalled? |
|---|---|---|---|
| **TopBar `<header>`** | [TopBar.tsx:117](../engine/plugins/TopBar.tsx#L117) | `z-[500]` | **No — trapped** |
| ↳ File/System/Help/Camera menus | [Menu.tsx:377-378](../engine/plugins/Menu.tsx#L377) | `z-50` (inside header) | No — inline `absolute top-full` |
| ↳ Viewport Quality dropdown | [ViewportQuality.tsx:149](../engine-gmt/topbar/ViewportQuality.tsx#L149) | `z-[70]` (Popover) | No — inline |
| ↳ Play/Pause popover | [PauseControls.tsx:96](../engine/plugins/topbar/PauseControls.tsx#L96) | `z-[70]` (Popover) | No — inline |
| ↳ Light Studio HUD bar | [CenterHUD.tsx:359](../engine-gmt/topbar/CenterHUD.tsx#L359) | `z-[65]` | No — inline |
| ↳ Light settings popup | [CenterHUD.tsx](../engine-gmt/topbar/CenterHUD.tsx) (LightSettingsPopup) | `z-[70]` (Popover) | No — inline |
| Popover primitive | [Popover.tsx:91](../components/Popover.tsx#L91) | `z-[70]` (hardcoded) | No — inline `absolute top-full`, needs parent `relative` |
| Dock (left/right) | [Dock.tsx](../components/layout/Dock.tsx) | `z-40`, resize handle `z-50` | No |
| Timeline | components/timeline/* | `z-30`/`z-40`, sticky headers `z-10/20/30` | No |
| Viewport mode controls | ViewportFrame / controls | `z-50` | No |
| Mode badge (broadcast) | [AppGmt.tsx:384](../app-gmt/AppGmt.tsx#L384) | `z-[60]` | No |
| Mobile controls overlay | [AppGmt.tsx:100](../app-gmt/AppGmt.tsx#L100) | `z-[20]` | No |

**Key:** every "No — trapped" element is below ALL body-level portals (panels @100, modals @1000, menus @9000), no matter its number. The detached CenterHUD **light *panels*** (torn-off, [CenterHUD.tsx:447](../engine-gmt/topbar/CenterHUD.tsx#L447)) are the exception — they use `FloatingPanel` (portalled, `Z.panel`), so they're body-level and DO float above the shell.

---

## 3. The reported problem, precisely

User wants the **topbar dropdowns** (File/System/Help/Camera menus, Viewport Quality dropdown, Play/Pause dropdown, Light Studio light dropdown) to appear **ABOVE** floating panels. They currently appear **under** them.

Root cause: all of those are **inline inside the fixed shell** (§0). Raising the topbar `z-[500]` does nothing because the shell is the ceiling. **The only fixes are to move them out of the shell's stacking context:**

- **Option A — portal the menus to `document.body`** at a z above the panel band (e.g. a new `Z.menu`/`Z.popover` ≥ 200, or `Z.contextMenu` 9000 to match other menus). This requires anchor-positioning: `Menu.tsx`'s desktop dropdown is an inline `absolute top-full` div; `Popover.tsx` (used by Viewport Quality, Play/Pause, Light popups) is also `absolute top-full` relative to its trigger. Portalling either means measuring the trigger rect and positioning the portal (the codebase already has `AnchoredMenu` with measure-then-flip-clamp — see [AnchoredMenu.tsx](../components/ui/AnchoredMenu.tsx) and `clampToViewport`). The cleanest route is to **route the topbar menus and these popovers through `AnchoredMenu`** (already portalled + positioned + dismiss-aware) instead of the bespoke inline `Menu.tsx` dropdown / `Popover`.
- **Option B — render floating panels INSIDE the shell instead of portalling to body.** Then topbar `z-500` naturally beats panels `z-100`. But this breaks the FloatingPanel design (viewport-clamping, the whole portal model, and modals would need rethinking too). Not recommended.

Recommendation: **Option A**, and ideally unify all "trigger-anchored dropdown" surfaces (Menu.tsx dropdown, Popover.tsx) onto the portalled `AnchoredMenu` primitive so the whole class lives at the body level and obeys the Z scale.

---

## 4. What this session already changed (state of the tree)

Confirmed features the user asked for — **keep these**, the pass should build on them:

- **Click-to-front panel stacking** — new [components/ui/panelStack.ts](../components/ui/panelStack.ts) (ephemeral zustand order, `usePanelStackZ`). `FloatingPanel` joins when coordinate-mode AND `z === Z.panel`: registers on mount, raises on `onPointerDownCapture`, renders at `Z.panel + rank`. Panels with an explicit elevated `z` (SettingsPanel @`Z.modal`, RenderDialog @`600`) and anchored panels (no position) opt out. Session-local, no persistence, no store/type changes. See [ADR-0081](../docs/adr/0081-floating-panel-click-to-front-stacking.md).
- **`Z.takeover` (90) tier** added below `Z.panel`; **Palette Picker overlay** moved `Z.modal`→`Z.takeover`; the **Favients `Z.modal + 50` special-case removed** from [AppGmt.tsx:259](../app-gmt/AppGmt.tsx#L259). Net: floating panels float over the palette browse surface via the normal stack, no special-casing.
- **`DraggableWindow`** dropped its standalone `Z.panel + 100` offset (superseded by click-to-front); passes `stackId={id}`.

Reverted (was a wrong turn): topbar `z-[500]`→`z-[80]` was reverted back to `z-[500]` once we found the shell trap (the value is moot). The topbar is at its original baseline.

Gates: `npm run typecheck` clean, `npm run smoke:boot` clean.

---

## 5. Magic numbers to rationalize in the pass

Outside the `Z` scale, still hardcoded: `z-[500]` (topbar), `z-[600]` (RenderDialog, StateDebugger, HelpBrowser DraggableWindows), `z-[70]` (Popover), `z-[65]` (CenterHUD), `z-[60]` (mode badge), `z-[50]`/`z-40`/`z-30`/`z-20`/`z-10` (dock/timeline/viewport chrome + sticky headers), `z-[1000]` (DropZones), `z-[9998]` (tutorial), `z-[9999]` (LandscapeGate, SmallColorPicker, CategoryPickerMenu, GlobalContextMenu, AdvancedGradientEditor marquee, tooltip), `z-[99999]` (CompilingIndicator), `z-[100000]` (RenderContextLostOverlay). Several `9999`s collide if more than one opens at once.

---

## 6. Suggested approach for the holistic pass

1. **Define the canonical layer order top→bottom as a single enum**, and annotate each layer as *body-portal* or *shell-internal*. The body-portal layers are the only ones whose numbers truly order across the app.
2. **Decide the panel-vs-menu relationship explicitly.** If floating panels stay body-portalled (they do), then every dropdown/menu/tooltip/overlay that must sit above panels MUST also be body-portalled. Make that a rule, and migrate the trapped inline dropdowns (topbar menus, Popover) onto `AnchoredMenu`/portal.
3. **Collapse the `9999`/`99999`/`100000` cluster** into named tiers above `contextMenu` (e.g. `emergency` for GPU-loss/compile, `deviceGate` for LandscapeGate), so simultaneous opens are deterministic.
4. **Keep the click-to-front band (100–199) reserved**; ensure nothing static squats in it. Popover/menu tier should be ≥ 200.
5. **Audit every `position: fixed`/`sticky`/`transform`/`isolate` ancestor** — each is a stacking-context trap. `MobileViewportShell` is the big one; verify there aren't others (e.g. transforms used for animations) silently trapping subtrees.
6. Re-verify visually (user does visual testing): topbar menus over panels; palette overlay under panels but over the topbar; modals over everything; context menus topmost; toasts/compile/GPU-loss always on top.

---

## 7. Files touched this session (for diffing)

- `components/ui/panelStack.ts` (new)
- `components/ui/zIndex.ts` (+`takeover`)
- `components/ui/FloatingPanel.tsx` (stack participation)
- `components/DraggableWindow.tsx` (base z + stackId)
- `app-gmt/PalettePickerOverlay.tsx` (`Z.takeover`)
- `app-gmt/AppGmt.tsx` (removed Favients hack + unused `Z` import)
- `docs/adr/0081-floating-panel-click-to-front-stacking.md` (new) + `docs/adr/0060-…md` (update note)
- `engine/plugins/TopBar.tsx` — reverted to baseline `z-[500]`
