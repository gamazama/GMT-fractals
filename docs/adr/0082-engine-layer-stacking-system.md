# ADR-0082: Engine-level layer/stacking system — domain-tagged tier table, `<Layer>` portal primitive, generalized `layerStack`, ratchet lint

**Date:** 2026-06-23
**Status:** Accepted
**Scope:** `components/ui/zIndex.ts`, `components/ui/layerStack.ts` (new), `components/ui/layerHost.ts` (new), `components/ui/Layer.tsx` (new), `components/ui/panelStack.ts`, `components/ui/{Modal,AnchoredMenu,FloatingPanel}.tsx`, `components/Popover.tsx`, the migrated surfaces (CompilingIndicator, LandscapeGate, SceneFileDropZone, DiagnosticsOverlay, RenderContextLostOverlay, tutorial Overlay/Highlight, GradientSourcePicker, EasingPicker, DemoExplainer, the gradient-editor avatars/previews, the topbar/menu tokens), `debug/test-zindex.mts` + `debug/check-zindex.mjs` (new)
**Related:** ADR-0060 (the original `Z` scale + floating-surface primitives), ADR-0081 (panelStack click-to-front). Supersedes neither — both fold in unchanged in spirit, extended in surface.
**Design:** `plans/z-index-system-design.md` (holistic census of 300 surfaces + 51 stacking traps across all six apps)

## Context

Stacking had drifted into ad-hoc literals across every app (app-gmt, fluid-toy, fractal-toy, mesh-export, gradient-explorer, demo): `z-[70]`, `z-[500]`, `z-[600]`, `z-[2000]`, `z-[9998]`, `z-[9999]`, `z-[99999]`, `z-[100000]` with no documented ordering, several colliding (multiple `9999`s). The `Z` scale (ADR-0060) covered only the surfaces that opted in.

The load-bearing fact (confirmed by the census) is that **z-index has two non-competing domains**: surfaces `createPortal`'d to the body order *globally* by z; surfaces rendered inline under `MobileViewportShell` (`position:fixed`/`sticky`) or a `fixed inset-0` app root are trapped in that stacking context and can **never** paint above any positive-z body portal, no matter their number. So `TopBar` (`z-[500]`, in-flow) rendered *under* a floating panel (`Z.panel = 100`, portalled) — and no number could fix it. ~10 "trapped violator" surfaces (topbar dropdowns via `Popover`, `CompilingIndicator`, `LandscapeGate`, …) wanted to float above the app but were silently capped by being in-flow.

Alternatives considered:

- **Keep the flat `Z` const and just add tiers.** Doesn't encode the portal/shell distinction, doesn't stop the next `z-[9999]`, and doesn't fix the trapped surfaces (a number can't). Rejected.
- **Render floating panels inside the shell instead of portalling.** Then `z-500` topbar would beat `z-100` panels — but it breaks the FloatingPanel portal model (viewport clamping, modals) and inverts the whole design. Rejected.
- **One mega-primitive with a `mode` prop.** ADR-0060 already split the three families (Modal/FloatingPanel/AnchoredMenu); a fourth generic positioner (`<Layer>`) composes with them rather than replacing them.

## Decision

**1. A domain-tagged tier table** (`components/ui/zIndex.ts`). Each tier is `{ base, span, domain }` where `domain` is `portal` (orders globally — must be body-portalled to be honoured) or `shell` (orders only inside its in-flow trap). Bands are sparse for headroom (`base + rank`) and future insertion. A `Z` **Proxy** preserves every historical `Z.modal` call site with zero churn; new code uses `z(tier, rank)`. `registerTiers()` lets an app add namespaced tiers without forking the module — an overlapping *portal* band throws in dev (`findPortalOverlaps`). `popover` moved 200 → 300 so the panel band (100–199, reserved for `layerStack`) has a real gap above it.

**2. `<Layer tier=…>`** (`components/ui/Layer.tsx`) — the one un-trappable way to author a floating surface. A `portal` tier ALWAYS `createPortal`s to the layer host; a `shell` tier renders inline. It owns position/z only; positioning is the caller's. Optional `stackId` opts into click-to-front for that tier; `forwardRef` lets callers (e.g. `Popover`) attach dismissal/measurement refs. `Modal`/`AnchoredMenu`/`FloatingPanel` keep their bespoke chrome but now resolve their portal target through `getLayerHost()` (`components/ui/layerHost.ts`), so a future dedicated portal-root div is a one-line `setLayerHost(el)` swap instead of a find-and-replace across ~30 sites.

**3. `layerStack`** (`components/ui/layerStack.ts`) generalizes the panel-only click-to-front store (ADR-0081) to one ephemeral order-list *per tier*. `panelStack.ts` becomes the `'panel'` instance (a thin wrapper, `FloatingPanel` unchanged). Same invariants per band: session-local, never persisted, participating-only.

**4. The portal-vs-trap rule, enforced.** The trapped violators were portalled to their semantic tiers via `<Layer>`: the *custom* topbar dropdowns now float above panels because `Popover` portals (it measures an in-flow marker's parent rect, then renders the panel `fixed` at the `popover` tier — call sites unchanged), and the generic topbar **`Menu.tsx` dropdown** (File/System/Help/Camera) likewise portals at the `popover` tier (measuring its trigger; its `useDismiss` lists both the trigger anchor and the portalled dropdown as "inside" so a toggle row click doesn't self-dismiss). The tutorial card moved to a portal so it shares a stacking context with its (already-portalled) highlight ring, fixing the mobile split. The 9999/99999/100000 cluster collapsed into deterministic named tiers (`emergency 100000 > deviceGate 9800 > dragGhost 9600 > contextMenu 9000 > tooltip 8500 > compileProgress 3000`).

**5. Two guards.** `debug/test-zindex.mts` (`npm run test:zindex`) asserts no portal-band overlap + the load-bearing invariants. `debug/check-zindex.mjs` (`npm run check:zindex`) is a **ratchet**: it fails on any *new* raw `z-[≥100]` / inline `zIndex ≥ 100` not sourced from the scale, with a frozen allowlist of the literals that predate this change (intentional shell-local values + a small not-yet-migrated portal backlog). It also reports (non-failing) files still portalling to `document.body` directly.

## Consequences

- **New floating surfaces are `<Layer tier="…">` and nothing else** — no number, no portal boilerplate, no trap risk. A new app gets the scale by composing the engine primitives, and extends it via `registerTiers()` without forking.
- **The topbar-dropdown-under-panels class of bug is fixed structurally** (portal, not number). `Popover`, `CompilingIndicator`, `LandscapeGate`, `SceneFileDropZone`, `DiagnosticsOverlay`, `RenderContextLostOverlay`, the GE pickers, the tutorial card all moved between stacking domains — **these need a visual pass** (see the design doc's checklist).
- **Zero call-site churn for existing well-behaved consumers** (the `Z` proxy), and `FloatingPanel`/`DraggableWindow` click-to-front is untouched (panelStack is now `layerStack('panel')`).
- **A migration backlog remains, by design** (not debt-by-omission): ~7 surfaces still `createPortal(_, document.body)` directly (GlobalContextMenu, CategoryPickerMenu, SmallColorPicker, EngineFeatureRow, AdvancedGradientEditor, TimelineToolbar, CenterHUD) and `CenterHUD`/`FormulaPicker` still carry raw portal-z numbers — all body-portalled and correct today, allowlisted in the lint, to migrate to `z()`/`<Layer>` opportunistically. The four `DomOverlays` copies were tokenized to `z('shellViewportOverlay')` but **not** structurally deduped — that is a re-render-sensitive code-health refactor, tracked separately.
- **`mix-blend-mode` and `perspective` are documented stacking-context traps** (WebcamOverlay, CompositionOverlay) — a future author must not portal a child out while leaving those on the parent.
- **The `Z` scale is no longer purely static** but the static numbers still mean what they say *within the portal domain*; shell numbers are explicitly local. The design doc is the holistic map; this ADR is the rationale.
