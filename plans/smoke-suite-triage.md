# Smoke Suite Triage — 2026-05-31

Full run of all **39** `debug/smoke-*.mts` against a live `vite` (`:3400`) on a
clean `dev` checkout. Goal: rebuild `smoke:all` (which covered only 9 of 39 and
was **silently red** — 3 of its 9 members fail) from what actually passes, and
record the broken ones so they get fixed rather than ignored.

**Result: 29 pass · 10 fail.** (`smoke-orbit` passes but is a non-asserting
diagnostic referencing dead hooks — green-but-meaningless, excluded.)

## How to run reliably (future sessions)

1. Start the app server: `npm run dev` (serves `:3400`, configured in `vite.config.ts`).
   - `smoke:with-server` / `runWithServer.mts` is broken on Node 24 Windows
     (`spawn EINVAL`); start vite manually instead.
2. In another shell: `npm run smoke:all` (now the 28 verified-green smokes).
3. Pure-unit smokes (no server needed): `smoke-ui-primitives`, `smoke-track-binding`,
   `smoke-binder-registry`, `smoke-deep-zoom-orbit`, `smoke-deep-zoom-la`.
4. **Don't append `echo "$?"` when backgrounding a smoke** — it masks the real
   exit code in the task notification (see `feedback_bash_background_windows`).

## `smoke:all` after this pass (28 green, asserting)

ui-primitives · track-binding · binder-registry · deep-zoom-orbit · deep-zoom-la ·
boot · engine-gmt · formula-switch · fractal-kind · fractal-toy · canvas-menu ·
hud-hint · help-menu · pause-controls · viewport · viewport-fixed · screenshot ·
anim-play · anim-vec2 · audio-fps-remap · bc-drag · undo · tsaa · fluid-brush ·
catalog-browse · catalog-load · picker-search-kb · workshop-state

(Each verified green individually in this triage. Was 9 — and 3 of those 9
[`interact`, `camera`, `fluid-toy`] were red, so the old aggregate never ran clean.)

## Broken smokes — fix-list (10) — NOT dropped, tracked here

**These are smoke-rot:** the suite wasn't maintained through a camera-API rename,
an orbit/coupling param refactor, and a demo-app restructure. Verified against
current source — the referenced identifiers are gone.

### A. Stale — reference removed/renamed store APIs (update the smoke or cut)
| Smoke | Error | Evidence | Verdict |
|---|---|---|---|
| `smoke-camera` *(was in smoke:all)* | `s.setSceneCamera is not a function` | `setSceneCamera` in **0** source files | FIX (repoint to the new camera setter) or CUT |
| `smoke-anim-orbit` | `s.setOrbit is not a function` | `setOrbit` in **0** source files | FIX (new orbit setter) or CUT |
| `smoke-interact` *(was in smoke:all)* | `demo slice missing from store` | `demo.html` exists but no `demo` slice/`createDemoSlice` | FIX (demo restructured) or CUT if demo app retired |

### B. Stale — orbit/coupling param refactor (params renamed/moved)
| Smoke | Error | Evidence | Verdict |
|---|---|---|---|
| `smoke-migrations` | `after migration: coupling_orbitEnabled expected true, got undefined` | `coupling_orbitEnabled` in **0** files; `orbitEnabled` moved namespace | FIX migration expectation to the new param shape |
| `smoke-fluid-presets` | `Coral Gyre apply mismatch on orbitEnabled: expected false got undefined` | probes old coupling location | FIX probe to new namespace |

### C. Suspected real bug behind a stale smoke — VERIFY IN-APP before cut
| Smoke | Error | Note |
|---|---|---|
| `smoke-fluid-toy` *(was in smoke:all)* | `loadPreset roundtrip mismatch on cp_rad: 0.12 → 0` | coupling-radius likely renamed (same refactor), **but** confirm fluid-toy preset save/load actually round-trips the coupling radius — a real persistence regression would hide here |
| `smoke-canvas-pan-zoom` | `wheel did not change zoom (still undefined)` | likely a renamed probe hook; **confirm wheel-zoom works in-app** |
| `smoke-particle-bounce` | `no particles slowed — bounce path never fired` | fluid-toy particle bounce; confirm the behavior still fires |

### D. Demo-app smokes (orphaned — no package.json entry; demo restructured)
| Smoke | Error | Verdict |
|---|---|---|
| `smoke-engine-demo` | `Demo overlay did not render` | CUT or rewrite — orphaned (no npm script), demo overlay changed |
| `smoke-engine-demo-modulation` | `Animation panel missing from store.panels` | CUT or rewrite — orphaned, demo modulation path changed |

## Recommendation
- **Done now:** `smoke:all` rebuilt to the 28 green so it's a usable gate again.
- **Next (smoke-rot repair, separate pass):** fix the A/B stale smokes (cheap — repoint to renamed APIs), CUT the D demo orphans if the demo app is retired, and **verify the C trio in-app** (the only candidates for a real regression). Re-add repaired smokes to `smoke:all`.
- `smoke-orbit` (non-asserting, dead `__r3fCamera`/`__getOrbitTarget` hooks) — rewrite to assert or cut; currently excluded from `smoke:all`.
