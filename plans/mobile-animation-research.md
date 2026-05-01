# Mobile Animation/Timeline Workflow — Research Briefing

**Scope:** Make GMT's animation/timeline workflow usable on mobile (phone + tablet, landscape-only).
**Target app:** `dev/app-gmt/` (engine fork at `h:/GMT/workspace-gmt/dev/`).
**Deliverable type:** Research-only briefing for an orchestrating agent. No code changes.
**Status:** Deferred follow-on to [mobile-mode-app-gmt.md](mobile-mode-app-gmt.md). That plan explicitly defers animation (its §1 non-goals, §7 deferred prompt); this doc is the "if reopened" briefing. Phase D primitives there (slider hit-targets, `touch-action: none`, vibration helper, safe-area) are prerequisites and assumed present. Phase F1 there hides `<TimelineHost />` unconditionally on mobile — reopening animation flips F1 to "mount `<TimelineMobile />` instead."

---

## 1. Task model: phone vs tablet vs desktop

Hypothesis "tablet = real editing, phone = preview/tweak" is **broadly correct, sharpened**:

- **Phone** = transport + scrub + Key Cam capture + delete-last-key. Hero camera-flythrough workflow (fly through scene, hit Key Cam every couple of seconds).
- **Tablet** = phone set + dope-sheet retime/select/delete on 44pt rows.
- **Desktop only** = graph editor, tangent handles, soft-selection, modulation record.

Rationale from the code:

- The DopeSheet today is a 220px sidebar + 32px-tall track rows ([DopeSheet.tsx](dev/components/timeline/DopeSheet.tsx), constants in [data/constants.ts](dev/data/constants.ts)). On a 6" landscape phone each row is ~12% of viewport height — unusable for keyframe retime.
- Curve handles in [useGraphInteraction.ts](dev/hooks/useGraphInteraction.ts) are 3–5px hit targets. No realistic touch translation.
- Key Cam capture ([TimelineToolbar.tsx](dev/components/timeline/TimelineToolbar.tsx) lines 43–133) is already a single large stateful button with dirty/keyed status — perfect for touch.

## 2. Existing animation UI inventory

All animation UI lives in `dev/components/...` (engine-tier, generic — benefits GMT, fluid-toy, fractal-toy). GMT-only camera wiring is in `dev/engine-gmt/animation/cameraBinders.ts`. Mobile work lands in `dev/` and benefits every engine app.

| Component | Path | Role |
|-----------|------|------|
| `TimelineHost` | [components/TimelineHost.tsx](dev/components/TimelineHost.tsx) | Floating bottom-left toggle button + lazy panel mount; `T` toggle, `Space` play/pause |
| `Timeline` | [components/Timeline.tsx](dev/components/Timeline.tsx) | Bottom panel, default 250px, drag-resizable to 80vh |
| `TimelineToolbar` | [components/timeline/TimelineToolbar.tsx](dev/components/timeline/TimelineToolbar.tsx) | Transport (Stop/Play/Record/ModRecord/Loop), Dope/Graph toggle, FRM box, **Key Cam button** (43–133), TimeNavigator, LEN, Render, hamburger |
| `KeyCamButton` | inline in TimelineToolbar.tsx | Captures camera pose, dirty/keyed status |
| `DopeSheet` | [components/timeline/DopeSheet.tsx](dev/components/timeline/DopeSheet.tsx) | 220px sidebar + scrollable rows, playhead overlay |
| `TrackRow` | [components/timeline/TrackRow.tsx](dev/components/timeline/TrackRow.tsx) | Single track w/ keyframe diamonds |
| `TrackGroup` | [components/timeline/TrackGroup.tsx](dev/components/timeline/TrackGroup.tsx) | Collapsible groups (Formula, Optics, Lighting, Shading) |
| `TimelineRuler` | [components/timeline/TimelineRuler.tsx](dev/components/timeline/TimelineRuler.tsx) | Canvas-drawn frame numbers, scrubbable (already pointer-event seek-on-drag) |
| `TimeNavigator` | [components/timeline/TimeNavigator.tsx](dev/components/timeline/TimeNavigator.tsx) | Mini-map zoom/pan slider |
| `KeyframeInspector` | [components/timeline/KeyframeInspector.tsx](dev/components/timeline/KeyframeInspector.tsx) | Right-side detail (value/tangents/interp) — desktop-relevant only |
| `KeyframeContextMenu` | [components/timeline/KeyframeContextMenu.tsx](dev/components/timeline/KeyframeContextMenu.tsx) | Right-click items (interp, delete, copy/paste) |
| `SelectionTransformBar` | [components/timeline/SelectionTransformBar.tsx](dev/components/timeline/SelectionTransformBar.tsx) | Multi-key transform UI (dev-only) |
| `GraphEditor` | [components/GraphEditor.tsx](dev/components/GraphEditor.tsx) | F-curve editor (canvas) |
| `useDopeSheetInteraction` | [hooks/useDopeSheetInteraction.ts](dev/hooks/useDopeSheetInteraction.ts) | Mouse-centric drag/select |
| `useGraphInteraction` | [hooks/useGraphInteraction.ts](dev/hooks/useGraphInteraction.ts) | Mouse-centric drag/select |
| `useMobileLayout` | [hooks/useMobileLayout.ts](dev/hooks/useMobileLayout.ts) | Detects `pointer: coarse` OR `innerWidth < 768` |
| `MobileControls` | [components/MobileControls.tsx](dev/components/MobileControls.tsx) | Joysticks — coordinate with bottom-edge timeline strip |

Existing layout assumption: desktop split — Timeline panel docks at bottom across full width, KeyframeInspector rides as right-side child. App.tsx mounts `<TimelineHost />` unconditionally (hidden only in broadcast mode). Portrait-blocker overlay already enforces landscape ([App.tsx](dev/App.tsx) lines 105–111).

**Divergence note:** stable's animation code at `stable/components/timeline/` lacks `SelectionTransformBar.tsx`. Otherwise file lists match. The `cameraKeyRegistry` pattern is dev-only (stable still calls `sequenceSlice.captureCameraFrame()` directly). **Mobile work should target `dev/` exclusively** — nothing needs to backport.

## 3. Layout proposals

### Option A — Full-screen takeover (modal animation mode)

- **Visible:** Viewport shrinks to top ~40%, Timeline expands below. Toolbar one row, sidebar collapsed to 140px name column.
- **Gestures:** Single-finger drag on ruler = scrub. Two-finger pinch = zoom. Tap row = select. Tap-and-hold diamond = mini action sheet (Delete / Interp).
- **Hidden:** KeyframeInspector, Graph mode entirely. Hamburger collapses Render/FPS/RecordCam/Delete-all.
- **Entry/exit:** Existing TimelineHost button; X closes back to viewport. Landscape already enforced.
- **Phone vs tablet:** Phone hides DopeSheet body — only ruler + transport + KeyCam visible (rows behind a "Tracks" drawer). Tablet shows full DopeSheet body.
- **Tradeoff:** Cheapest to ship — minimal layout work, big toolbar targets. **But user can't watch the fractal evolve while editing keyframes; defeats Key-Cam-while-flying workflow on phone.**

### Option B — Picture-in-picture strip (RECOMMENDED for phone)

- **Visible:** Viewport stays full-bleed. Persistent ~64px bottom strip: [Stop, Play, KeyCam, FRM-readout, scrubber bar, expand-chevron]. Chevron raises a ~50vh half-sheet containing the DopeSheet.
- **Gestures:** Drag strip's scrubber bar = scrub (the bar IS the playhead-on-ruler, full-width). Pinch on raised sheet = zoom. Tap diamond = select + floating "Delete" pill near it.
- **Hidden in sheet:** All track rows. KeyframeInspector replaced by inline action pill on selection.
- **Hidden in menu:** Graph mode, FPS, Render, deterministic playback, modulation record.
- **Entry/exit:** Strip always visible when timeline has tracks (replaces floating round button on mobile). Long-press strip to dismiss.
- **Phone vs tablet:** Phone — sheet maxes at 50vh, ~6 rows. Tablet — strip stays; right side gets persistent KeyCam-status chip + "Tracks" pill opening a side drawer instead, leaving viewport visible while editing.
- **Tradeoff:** Best for Key-Cam-while-navigating (the core workflow). Costs more layout work — needs new persistent strip + half-sheet primitive ([DraggableWindow.tsx](dev/components/DraggableWindow.tsx) is desktop-only). **Strip must coexist with [MobileControls.tsx](dev/components/MobileControls.tsx) joysticks at bottom edge — design needed.**

### Option C — Designed mobile timeline (tablet-only)

- **Visible:** Tablet only. Bottom 240px panel rebuilt: track sidebar = vertical-tab strip (icons-only, expandable), tracks at 44pt rows (touch-target standard), keyframe diamonds at 24×24, ruler at 36pt with chunky labels.
- **Gestures:** Single-finger drag on diamond = retime (no soft-select). Two-finger drag on diamond = scale time around playhead. Long-press = context sheet (interp chips, delete). Edge-swipe-up from bottom = open simplified KeyframeInspector half-sheet (value + interp chips, no tangent handles).
- **Hidden:** Graph mode, modulation recording, multi-track box-select.
- **Entry/exit:** Same TimelineHost toggle, but mounts `<TimelineMobile />` when `isMobile && !isPortrait`.
- **Phone vs tablet:** Phone falls back to A or B. C explicitly does not target phone.
- **Tradeoff:** Highest fidelity for tablet — actual retiming workflow. Cost: parallel TimelineMobile tree, OR conditional rewrites throughout TrackRow/DopeSheet. Drift risk.

**Recommendation:** ship **B for phone**, layer **C-lite on tablet** (B's strip + a richer half-sheet approximating C's row sizes).

## 4. Minimum viable mobile feature set (rank order)

1. **Play / Pause / Stop** — Space already wired; add visible mobile-sized buttons.
2. **Scrub** — single-finger drag on ruler/strip. [TimelineRuler.tsx](dev/components/timeline/TimelineRuler.tsx) already does seek-on-drag via pointer events; needs thicker hit area + `touch-action: none`.
3. **Key Cam capture** — already stateful (dirty/keyed). Just needs touch-target sizing.
4. **FRM readout** — view-only on mobile; desktop DraggableNumber unsuitable for touch.
5. **Delete-last-key / Delete-all-keys** — already in hamburger.
6. **Loop toggle** — single icon button.
7. **Render dialog** — tablet only; irrelevant on phone (no exporting).

**Out of MVP:** multi-select, retime, inspector, soft-selection, graph mode, modulation arming, FPS edit, custom duration. **Modulation Record is desktop-only** — easy misfire on touch and the bake is destructive.

## 5. Won't-translate interactions + gating strategy

**Won't translate:**
- Tangent handle drags ([GraphEditor.tsx](dev/components/GraphEditor.tsx), [useGraphInteraction.ts](dev/hooks/useGraphInteraction.ts)) — 3–5px hit targets
- Soft-selection radius (`store/animation/selectionSlice.ts`) — needs hover/preview state
- Box-select in DopeSheet — competes with scroll
- DraggableNumber scrubs (FRM, LEN, FPS) in [Slider.tsx](dev/components/Slider.tsx) — micro-pixel sensitivity
- Right-click context menus on diamonds — replace with long-press → bottom action sheet
- Resize handle on Timeline panel ([Timeline.tsx](dev/components/Timeline.tsx) lines 250–256) — replace with snap heights
- Multi-track drag — disable; tablet does per-track via long-press

**Three-layer gating strategy** using existing `useMobileLayout()`:

1. **Panel-level variant.** In [Timeline.tsx](dev/components/Timeline.tsx) branch on `isMobile` to render `<TimelineDesktop />` (current contents) vs new `<TimelineMobile />`. Keeps desktop code untouched, avoids per-component `if (isMobile)` peppering. The `Timeline` component becomes a thin selector.
2. **Toolbar gate.** In TimelineToolbar, when `isMobile`, hide the Graph-mode toggle and force `mode = 'DopeSheet'`. Graph code path becomes unreachable — no edits to GraphEditor/useGraphInteraction.
3. **Pointer-type guards in shared hooks.** Defensive layer: `if (e.pointerType === 'touch' && isPrecisionInteraction) return;`.

The mobile-detection signal (`pointer: coarse` OR width<768) is already correct — no new media queries needed. Use `state.debugMobileLayout` (already in engineStore) to test mobile UI on desktop. Portrait-blocker already enforces landscape, a hard prerequisite.

---

## Summary for orchestrator

- **Ship B for phone, C-lite for tablet.** Single new component: `<TimelineMobile />` mounted via `Timeline.tsx` branching.
- **MVP scope:** play/pause/stop, scrub, Key Cam, FRM readout, delete-last/all, loop. Render dialog tablet-only.
- **Hard gates:** Graph mode hidden, modulation record hidden, DraggableNumber replaced with view-only readouts, right-click → long-press sheet.
- **Unblocked dependency:** half-sheet primitive (none exists). Build alongside, or share design with mobile-mode plan's Phase D7 right-Dock drawer decision — same primitive can serve both.
- **Coexistence concern:** Option B's bottom-edge scrubber strip collides with [MobileControls.tsx](dev/components/MobileControls.tsx) joysticks (Fly mode, bottom-edge). Joysticks must lift above the strip, or the strip only mounts when animation mode is active. Layout call required before building Option B.
- **Target only `dev/`** — no backport to stable. (`SelectionTransformBar.tsx` and `cameraKeyRegistry` are dev-only divergences from stable.)
