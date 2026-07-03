# Session: MB3D Stage 1 — render-fidelity pass

**Branch:** `feat/mb3d-importer` @ `h:/GMT/workspace-gmt/stable` · **Plan:** `plans/mb3d/COMPLETION-PLAN.md` · **Tracker:** `plans/mb3d/EXECUTION-STATUS.md`

You are continuing the MB3D importer. The geometry is done (279 formulas faithful, ~19/20 scenes
certify on geometry+framing). This session **deepens fidelity of scenes we already import** — it does
NOT widen coverage. Two orchestrator research agents already read the MB3D Pascal source; their derived
specs are embedded below (grounded in `file:line`, `/h/tmp/mb3d-src/`). **You implement + verify on the
real GPU; commit per item; do not push.**

## Ground rules
- **Real GPU only** for renders: `npx tsx debug/cert-render.mts [nameFilter]` (headed Chrome → ANGLE/D3D11),
  needs the harness server at `localhost:5173/render-harness.html`. Never headless SwiftShader.
- **Re-cert after each edit**, not at the end — these changes are regression-prone. Compare
  `H:/GMT/refSoftware/MB3D/cert/gmt/<scene>.png` against `H:/GMT/refSoftware/MB3D/output/<scene>.jpg`
  (only 7 refs exist; for the rest use no-regression vs the prior render).
- **Gates green between commits:** `npm run typecheck`, `test:mb3d`(24), `test:mb3d:weave`(42),
  `test:refine`(46), `corpus-check`(279/0), `check:mb3d-decompiler`.
- Sweep DE via `configOverrides:{quality:{…}}` in the harness (NOT post-compile `st.quality` — silent no-op).
- Write an ADR for any load-bearing mapping decision. Update `EXECUTION-STATUS.md` as you finish each item.

## Order: 1 (quality-params) → 3 (fog) → 2 (numeric-DE lighting)
(1 and 3 both touch `emitFusedHybrid.ts` so they serialize; 2 is disjoint — `de.ts`/`shadows.ts`. Items
1 and 3 are all-scenes wins; 2 is the narrow DsyneGrafix polish, so it's last.)

---

## ITEM 1 — Quality-param de-empiricization (THE SPINE)

The `.m3p → quality` mappings are hand-tuned constants. Replace with source-derived ones. **Land each
sub-edit as its own commit with a ref-diff between** — the estimator flip especially is regression-prone.

### 1a. deBailout = RStop² (do FIRST — cleanest, source-correct)
MB3D runtime bailout is `Sqr(RStop_header)` in r²-space (`HeaderTrafos.pas:558`); GMT `uDeBailout` is
r²-space too (`de.ts:65`). The current code passes raw RStop and the `max(256)` floor masked the missing
square. In `emitFusedHybrid.ts:298`:
```ts
// BEFORE
if (h2.rStop > 0 && !isDifs) sceneQuality.deBailout = Math.min(4000, Math.max(256, h2.rStop));
// AFTER — square it; 1000 = GMT slider max (quality.ts:154); small floor only guards RStop<1
if (h2.rStop > 0 && !isDifs) sceneQuality.deBailout = Math.min(1000, Math.max(16, h2.rStop * h2.rStop));
```
`constPacker.ts mapDEMeta` **already squares** (`(de.rStop)²`) — leave it. dIFS exemption (`!isDifs`) stays.
**Watch:** scenes with authored RStop>32 now clamp at 1000 (deeper orbit → slower/different shell
termination). Most scenes use RStop 16–20 (→256/400, ≈ old floor). Re-cert BatJorge + any high-RStop scene.

### 1b. deOption → estimator table (CONFIRMED BUG: 11→2)
Decoded from `doHybridPasDE` (`formulas.pas:3702-3736`). The rule is NOT {2,5,6,11}→1/else→0. It is:
`(DEoption&$38)==32 → Log`; `(DEoption&7)==4 → Julia`; **else → `r/dr`**. In `constPacker.ts mapDEMeta` (~:102):
```ts
// BEFORE
const linear = de.deOption === 2 || de.deOption === 11 || de.deOption === 5 || de.deOption === 6;
return { estimator: linear ? 1.0 : 0.0, /*…*/ };
// AFTER
const opt = de.deOption;
let est: number;
if (opt === 32) est = 0.0;        // analytic Log (Sqrt·0.5·Ln/Deriv1), formulas.pas:3730
else if (opt === 4) est = 0.0;    // Julia ADE — no exact analog; nearest analytic (user can opt into 7)
else est = 2.0;                    // r/dr (AmBox+IFS) — was wrongly 1.0 for {2,5,6,11}, 0.0 otherwise
return { estimator: est, /* fudge/deBailout/distanceMetric unchanged */ };
```
Also update the stale JSDoc (`constPacker.ts:82-91`): "DEoption≠32 → est 2 (r/dr); 32 → est 0 (Log); RStop²→deBailout".
**CRITICAL regression watch:** there is a SEPARATE hardcoded box-slot path at `emitFusedHybrid.ts:248-251`
(`estimator:1, fudgeFactor:0.45`) that this change does NOT touch. Native GMT AmazingBox uses estimator 1,
so decompiled-box (now est 2) and intern-box (still est 1) would diverge. **Decide: flip the box-slot to 2
as well, or leave both. Bench AmazingBox-family (ABoxScale2/3, InAndOutside, Surreal shell) carefully** —
est 1 (`(r-1)/dr`) vs est 2 (`r/dr`) differ by the `-1` offset → surface may bloat/thin. This is the single
biggest regression risk in the whole session. If box scenes regress, leave intern-box on 1 and document why.

### 1c. fudge = authored ZstepDiv (riskier — couple with maxSteps)
`sZstepDiv` = authored ZstepDiv = GMT `uFudgeFactor` 1:1 (`Calc.pas:1878`, `trace.ts:213`). Current code
ignores the authored value and floors 0.5/ceils 0.7. In `emitFusedHybrid.ts:308`:
```ts
// AFTER — honor authored step; floor 0.3 against GMT's step-budget (GMT lacks MB3D's post-hit bin-search)
const authoredFudge = h2.zStepDiv > 0 ? h2.zStepDiv : ((q.fudgeFactor as number) || 0.5);
sceneQuality.fudgeFactor = Math.min(1.0, Math.max(0.3, authoredFudge));
```
(`h2.zStepDiv` is parsed, `parseMB3D.ts:118` — verify populated; the override gate at :285 checks
deStop/rStop, so ensure zStepDiv reaches here.) **Watch BatJorge + deep-IFS** (finer step → may exceed maxSteps).

### 1d. maxSteps tied to fudge (optional)
MB3D has no step-count cap (distance-terminated, `Calc.pas:1937`) — 1500 is a pure GMT safety budget. Tie it
to fudge so fine steps get budget. Move AFTER fudge is set (~:318), replacing `emitFusedHybrid.ts:270`:
```ts
const ff = (preset.features.quality.fudgeFactor as number) || 0.5;
preset.features.quality.maxSteps = Math.min(2000, Math.max(300, Math.round(300 / ff)));  // 2000 = DEFAULT_HARD_CAP
```
(Or keep flat but lower 1500→1000.)

### 1e. detail anchor (lowest priority — heuristic, not derivable)
MB3D hit threshold is world-absolute (`HeaderTrafos.pas:535`); GMT's is screen-relative (`trace.ts:160`,
threshold ∝ 1/uDetail) — different spaces, no closed form. The `3.3/DEstop` numerator is a fit. Option:
`detail = clamp(1.0 / max(0.1, DEstop), 1, 10)` (anchor 1.0 = MB3D-typical DEstop, cap raised to slider max).
**But Theli-At is the canary** — it was named as needing fine detail to resolve background Menger half-spheres
(`emitFusedHybrid.ts:300`). If 1.0 regresses Theli, the 3.3 was load-bearing — keep it but rename to a
documented `MB3D_DETAIL_ANCHOR` constant noting it's ref-calibrated, not source-derived. **Only change this if
the refs improve.**

**Re-cert all 20 bundled scenes after item 1** (`npx tsx debug/cert-render.mts`). Goal: certs hold or improve.

---

## ITEM 3 — Fog application (the named Hyperben2 fix)

MB3D fades distant surfaces toward `DepthCol2` linearly in depth (`sDepth = TBpos[4]·0.8e-6`,
`HeaderTrafos.pas:1292`), or toward `DynFog` when dynamic-fog amplitude `TBpos[6]≠53` (`:1304`). GMT fog is
`smoothstep(near,far,d)·intensity` toward `uFogColor`, `d` in world units ≈ `targetDistance` scale
(`features/atmosphere/index.ts:14-31`). Fields are **already parsed** — no parseMB3D change needed.

**First, confirm Hyperben2 actually carries fog** before wiring (else fog won't help and the washout is
pure lighting): dump its parsed `depthCol`, `depthCol2`, `dynFog`, `tbpos[1]`(=TBpos[4]), `tbpos[3]`(=TBpos[6]).
If `TBpos[4]=0` and `TBpos[6]=53`, the scene has no authored fog — stop and note it.

**Add `mapFog` to `mapLighting.ts`:**
```ts
function clampN(v:number,lo:number,hi:number){return Math.max(lo,Math.min(hi,v));}
/** MB3D depth-cue/dynamic fog → GMT distance fog. Fades distant surfaces toward DepthCol2 (or DynFog).
 *  Distances anchored to targetDistance (GMT world units), NOT raw MB3D Zpos. NEAR_K/FAR_K/INT_K CALIBRATE vs ref. */
function mapFog(h: MB3DHeader, cam: MB3DCameraPose): Record<string, unknown> | undefined {
  const sDepth = (h.tbpos[1] ?? 0) * 0.8e-6;        // TBpos[4]
  const tb6 = h.tbpos[3] ?? 0;                       // TBpos[6] (53 = no dynamic fog)
  const hasDynFog = tb6 !== 53 && tb6 !== 0;
  if (Math.abs(sDepth) < 1e-10 && !hasDynFog) return undefined;   // gate: only when fog authored
  const td = cam.targetDistance || 2.157;
  return {
    fogIntensity: clampN(hasDynFog ? Math.abs(tb6 - 53) * 0.01 : 0.6, 0, 1),
    fogNear: clampN(td * 0.4, 0, 10),                // CALIBRATE
    fogFar:  clampN(td * 2.0, 0, 10),                // CALIBRATE
    fogColor: hasDynFog ? h.dynFog : h.depthCol2,
  };
}
```
Add `atmosphere?: Record<string,unknown>` to `MB3DLightingResult`; in `mapMB3DLighting` rename `_cam`→`cam`,
compute `const atmosphere = mapFog(h, cam);` and add `...(atmosphere ? { atmosphere } : {})` to the return
(mirrors the `coloring`/`material` gates; still inside the `active.length>0` guard so standalone stays clean).

**Wire in `emitFusedHybrid.ts:191`:** `atmosphere: { glowIntensity: 0 }` → `atmosphere: { glowIntensity: 0, ...(lit.atmosphere ?? {}) }`.

**Calibrate** `fogNear/fogFar/fogIntensity` against the Hyperben2 ref render (the K constants are inferred).
Verify non-fog + standalone scenes are byte-identical (mapFog returns undefined). Write a short ADR if the
mapping lands. Risk: world-distance scale and intensity are the calibration unknowns; `bFarFog` curve and the
2nd dynamic-fog color are dropped (single-band approximation — fine).

---

## ITEM 2 — Numeric-DE lighting fix (finish ADR-0085)

ADR-0085 claims the escape-time-gradient normal "works," but the user observes **noisy lighting + broken
shadows** (glow-only is smooth → the DE/geometry is fine; it's the normal + shadow path). Only affects scenes
on estimator 7 (DsyneGrafix-class), opt-in.
- `numericNormal` (`de.ts`) probes `∇nu` at the small `uNumDEeps` (default 0.0015) where the escape-time field
  is chaotic → noisy normal. **Try:** a separate, larger normal probe (a few× the DE probe, or tied to the
  pixel footprint `eps` that `GetNormal` already passes), and/or averaging.
- Shadows (`shadows.ts`) march `DE_Dist = numericDistance` (4× orbits, noisy) → broken. **Try:** a smoother/
  cheaper shadow DE or a clamp.
- Then **reconcile ADR-0085** — drop the over-claim, record the real fix. Verify on DsyneGrafix (the rings
  should be lit, not speckled). Analytic estimators stay byte-identical (numeric block is `#ifdef`-gated).

---

## When done
Update `EXECUTION-STATUS.md` (S1 rows → done, note commits + any regressions/decisions), append a one-line
result to the decisions log, and report back: which items landed, cert results (which scenes improved/held/
regressed), and any new ADRs. If item 1b's box-slot decision or item 3's fog calibration needed a judgment
call, say what you chose and why.
