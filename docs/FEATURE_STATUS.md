# Engine + Toys Feature Status

**Snapshot:** 2026-04-23, after phase 5 (commit `b82dc18`).
**Purpose:** single page the user can hold while testing. Tells you what's working, what's broken, and what's missing.

Legend:
- ✅ Shipped & verified (smoke or manual).
- 🟡 Shipped but unverified / partial / known issue.
- 🔴 Not built yet.

---

## Engine-level (shared chrome)

### Core plugins
| Plugin | Install | Status | Test how |
|---|---|---|---|
| `@engine/viewport` | `installViewport()` | ✅ | Open either toy → resize window, drag/interact; "Adaptive: N%" badge in topbar reflects quality. `npm run smoke:viewport`. |
| `@engine/topbar` | `installTopBar()` | ✅ | Top bar shows project name (left) + FPS + adaptive badge + save/load/undo/redo (right). |
| `@engine/scene-io` | `installSceneIO()` | ✅ | Save button → JSON download. Load button → file picker. Drag-drop a saved `.json` onto the window. PNG embed round-trips via `utils/SceneFormat.ts`. |
| `@engine/render-loop` | `<RenderLoopDriver />` | ✅ | If missing, dev console warns after 3s. Both toys mount it. |
| `@engine/shortcuts` | `installShortcuts()` | ✅ | Keyboard presses resolve to registered handlers; text-input guard suppresses while typing. |
| `@engine/undo` | `installUndo()` | ✅ | Ctrl+Z / Ctrl+Y globally. Ctrl+Z in timeline-hover scope routes to animation scope. Topbar undo/redo buttons show label tooltip. |
| `@engine/camera` | `installCamera()` | ✅ (adapter) | Ctrl+1..9 save slot; 1..9 recall. Slots round-trip in save file via `cameraSlots` preset field. `window.__camera.getAllSlots()` in devtools. |
| `@engine/animation` | `installModulation()` | ✅ | `installModulation()` registers `AnimationSystem.tick` into `TickRegistry.ANIMATE`. `debug/smoke-anim-play.mts` verifies playback. |
| `@engine/screenshot` | — | 🔴 | Not built. Designed in `04_Core_Plugins.md`. |
| `@engine/environment` | — | 🔴 | Not built. Placeholder in roadmap. |

### Timeline / animation
| Capability | Status | Test how |
|---|---|---|
| Timeline ruler + dope sheet render | ✅ | Open timeline panel (bottom dock). |
| Add track (`addTrack`) | ✅ | Call in devtools: `useAnimationStore.getState().addTrack('julia.power', 'Julia Power')`. |
| Add keyframe (`addKeyframe`) | ✅ | `useAnimationStore.getState().addKeyframe('julia.power', 0, 2)`. ⚠️ Track must exist first. |
| Play / pause | ✅ | Toolbar play button; `useAnimationStore.getState().play()`. `currentFrame` advances. |
| Seek (`seek`) | ✅ | `useAnimationStore.getState().seek(15)`. |
| Scrub (ruler drag) | 🟡 unverified | TimelineRuler + KeyframeInspector call `animationEngine.scrub(frame)` on pointer drag. Not covered by headless smoke (needs real pointer-drag simulation). Manual: drag the ruler, watch bound param. |
| Scalar track driving DDFS param | ✅ | `smoke-anim-play.mts` confirms `julia.power` writes. Any scalar feature param works. |
| Vec2 track driving vec DDFS param | ✅ | F12 fix (2026-04-23) — `AnimationEngine.getBinder` now handles UNDERSCORE form (`featureId.param_x`) via shared `writeVecAxis` helper. Verified `smoke-anim-vec2.mts`. |
| Vec3 / Vec4 tracks | ✅ | Same F12 fix — regex matches `_x/_y/_z/_w`. |
| Key Cam button (TimelineToolbar) | ✅ | `cameraKeyRegistry` default capture handles UNDERSCORE vec paths (`sceneCamera.center_x`) and auto-creates tracks on first keyframe. |
| Loop mode (Hold / Loop / PingPong / OffsetLoop / Continue) | ✅ | Per-track via `track.postBehavior`. GMT code path. |
| LFO modulation via `animations` array | ✅ | Authored via the **Modulation panel** (engine `lfo-list` widget, registered via `installModulationUI()` in fluid-toy's main.tsx). Each rule writes a Sine/Triangle/Saw/Pulse/Noise LFO to `state.animations`; `modulationTick` populates `liveModulations[target]` per frame. `useEngineSync.applyLiveMod` merges those into the slice copy passed to each `sync<X>ToEngine` so engine.params actually receives the modulation. Imperative consumers (e.g. `readBrushParams`) call `applyLiveMod` directly off `useEngineStore.getState().liveModulations`. Auto-orbit is now just two LFOs on `julia.juliaC_x/_y` at 90° phase — no bespoke `orbitTick` needed. (Original F13 mechanism landed 2026-04-23; UI + sync pipeline 2026-04-29.) |
| Audio modulation | 🔴 | Feature `audioMod` exists in registry but no tested path end-to-end in engine-fork yet. |
| Record modulation → keyframes | 🔴 | Designed, not yet wired through. |
| Right-click menus on timeline | 🟡 unverified | `<GlobalContextMenu />` is mounted but individual entry points (ruler context menu, keyframe context menu) not spot-checked. |

### Preset / save / load
| Capability | Status |
|---|---|
| Save scene JSON (download) | ✅ |
| Load scene JSON (file picker + drag-drop) | ✅ |
| PNG with embedded preset (iTXt) | ✅ |
| URL share string | ✅ (via `utils/UrlStateEncoder`) |
| Per-feature round-trip (all DDFS state) | ✅ |
| Non-feature field round-trip via `presetFieldRegistry` | ✅ (F3 fix) — camera slots, UI panels, etc. register here |
| Animation sequence in preset | ✅ — `getPreset()` reads `window.useAnimationStore` |

### Undo / redo
| Capability | Status |
|---|---|
| Param edit undo (scope `'param'`) | ✅ |
| Camera slot recall undo (scope `'camera'`) | ✅ |
| Animation edit undo (scope `'animation'`) | ✅ |
| UI state undo | 🔴 deferred (F8) |
| Redo after undo | ✅ |
| Topbar undo/redo buttons with scope-aware tooltip | ✅ |

---

## Fluid-toy (engine-native port, `/fluid-toy.html`)

### Paneled features (DDFS — auto-generated panels)
| Feature | Panel label | Params | Status |
|---|---|---|---|
| `fluidSim` | Fluid | Resolution (auto-scaled), Vorticity, Vorticity Scale, Pressure Iters, Velocity Decay, Force Mode (enum: Gradient/Curl/Iterate/C-Track/Hue), Force Gain, Interior Damp, Pause Sim | ✅ all editable |
| `julia` | Julia | Fractal Kind (Julia / Mandelbrot), Julia c (vec2), Iterations, Escape R, Power | ✅ all editable + keyframeable (F12/F13 + AutoFeaturePanel vec2 trackKeys all landed 2026-04-23) |
| `dye` | Dye | Palette (gradient), Collision Mask (gradient), Dye Inject, Dye Decay, Dye Mix, Gradient Repeat, Gradient Phase | ✅ |
| `sceneCamera` | View | Center (vec2), Zoom | ✅ all editable + keyframeable; canvas wheel/right-drag/middle-drag all write through this slice |
| `orbit` | Orbit | Auto Orbit (bool), Radius, Speed (Hz) | ✅ — toggle registers two LFOs into `animations` array |

### Hotkeys (fluid-toy scope)
| Key | Action | Status |
|---|---|---|
| Space | Pause / resume sim | ✅ |
| R | Reset fluid fields (dye + velocity → zero) | ✅ |
| O | Toggle Julia-c auto-orbit | ✅ |
| Home | Recenter view | ✅ |
| H | Toggle hint visibility | 🔴 placeholder — logs, no hint UI yet |
| Ctrl+1..9 | Save camera slot | ✅ |
| 1..9 | Recall camera slot | ✅ |
| Ctrl+Z / Ctrl+Y | Undo / redo | ✅ |
| Ctrl+S | Save scene (opens menu) | ✅ via `@engine/scene-io` |
| Alt+S | Quick Save PNG | ✅ via `@engine/scene-io` (Ctrl+Shift+S is browser-reserved) |

### Canvas gestures (`FluidPointerLayer.tsx`)
| Gesture | Status | Test how |
|---|---|---|
| Left-drag → splat (hue-cycled rainbow trail) | ✅ | Drag on canvas. |
| Right-drag → pan scene camera | ✅ | Right-mouse drag past ~5 px; world-point under cursor stays locked. |
| Right-click (no drag) → canvas context menu | ✅ | Right-click without moving: menu with Copy Julia c / Pause / Orbit / Recenter / Reset. |
| Wheel → cursor-anchored zoom | ✅ | Scroll on canvas; the point under cursor stays fixed. |
| Middle-drag → click-point-anchored zoom | ✅ | Middle-mouse vertical drag; exponential, pivots around press point. |
| Shift = 5× coarser, Alt = 0.2× finer | ✅ | Modifier multipliers on all three camera gestures. |

### Viewport / interaction
| Capability | Status | Note |
|---|---|---|
| Canvas mounts via `<ViewportFrame>` | ✅ | |
| Adaptive-quality down-res during interaction | ✅ | Uses `qualityFraction` from viewport plugin |
| Gesture-mode switcher (brush / emitter / pick-c / pan-zoom) | 🔴 not built | Reference toy-fluid has a gesture-mode selector; engine port hasn't surfaced one yet |
| Particle emitter overlay | 🔴 not built | Reference toy-fluid feature |
| Artist brush preview | 🔴 not built | |
| Mandelbrot picker (for picking julia c) | 🔴 not built | Reference toy-fluid has a bottom-right picker |

### Missing DDFS parameters (reference `toy-fluid` has them, engine port doesn't)
- Tone mapping (Reinhard / ACES / etc.)
- Bloom pass
- Orbit-trap coloring
- Collision gradient decay
- Temperature / buoyancy (fluid)
- Additional force modes (emitter velocity, vortex)
- OKLab dye decay (referenced in recent reference-toy commit `a72d6eb` but not yet ported)

(Rough count: ~34 params in reference not yet ported — these are DDFS-ready, just waiting on feature additions.)

---

## Fractal-toy (`/fractal-toy.html`)

### Paneled features
| Feature | Status |
|---|---|
| Mandelbulb formula | ✅ via `ShaderBuilder.addSection` escape hatch |
| Camera (orbit theta/phi + distance + fov + target) | ✅ — registered for Key Cam via `cameraKeyRegistry` |
| Directional light | ✅ basic |

Fractal-toy is intentionally minimal — it exists as the first consumer of `ShaderBuilder.addSection`, not as a feature-complete product.

### Missing (by design, for now)
- Full GMT formula library
- Accumulation / progressive rendering
- Post effects (tone / bloom)
- Light studio / multi-light
- Mesh export

All of the above are GMT-domain features and will land as **GMT plugins** rather than engine plugins.

---

## Known broken (queued fixes)

1. **F6 — setter name inference.** Features whose slice setter doesn't follow `set${PascalFeatureId}` silently no-op. Not hit by current toys but will hit the first GMT port.

2. **F5 remainder — legacy camera binder hardcoding.** `camera.unified.*` / `camera.rotation.*` stay hardcoded until `binderRegistry.register()` lands.

3. **Right-click context menus** — mounted but entry points unverified per element.

---

## What's NOT tested by headless smoke (manual verification needed)

- Scrubbing the timeline ruler (pointer-drag not simulated).
- Right-click context menus on keyframes.
- Drag-to-pan and wheel-to-zoom on the fluid canvas.
- Topbar button clicks (save, load, undo/redo).
- Camera slot save/recall via hotkeys.
- H hint toggle (no UI).

Everything else has a smoke or can be exercised via `window.__*` devtools handles (`__store`, `__animEngine`, `__camera`, `__animTickCount`).
