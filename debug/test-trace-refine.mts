/**
 * Post-hit surface-refinement tests (ADR-0084).
 * Run: `npm run test:refine`  (tsx debug/test-trace-refine.mts)
 *
 * Covers the three guarantees the feature rests on:
 *   A. OFF is byte-identical — enableRefine=false emits ZERO refinement GLSL, so the
 *      trace kernel source is character-for-character the unrefined march (strongest
 *      no-regression: same source ⇒ same pixels ⇒ zero compile cost).
 *   B. ON emits the damped-bisection loop with the expected structure + the dPrev
 *      bracket capture, runtime-gated on uRefineSteps.
 *   C. Twin agreement — map() and mapDist() are emitted from the SAME formula body /
 *      loopInit / getDist (DE_MASTER), so the mid-point mapDist used by the refine
 *      loop converges to the same silhouette map() found the hit on.
 *   D. Importer wiring — emitFusedHybrid maps bStepsafterDEStop → quality.refineSteps
 *      (floor 4 when enabled, 0 when off, cap REFINE_HARD_CAP).
 */
import { getTraceGLSL } from '../engine-gmt/shaders/chunks/trace.ts';
import { DE_MASTER } from '../engine-gmt/shaders/chunks/de.ts';
import { emitFusedHybrid } from '../engine-gmt/utils/mb3d/emitFusedHybrid.ts';
import { registry } from '../engine-gmt/engine/FractalRegistry.ts';
import { AmazingBox } from '../engine-gmt/formulas/AmazingBox.ts';
import { REFINE_HARD_CAP } from '../data/constants.ts';
import type { MB3DFormulaSlot, MB3DScene, MB3DHeader } from '../engine-gmt/utils/mb3d/parseMB3D.ts';

registry.register(AmazingBox);

let pass = 0;
const fails: string[] = [];
function ck(name: string, cond: boolean, got?: unknown) {
  if (cond) pass++;
  else fails.push(`${name}${got !== undefined ? ` (got ${JSON.stringify(got)})` : ''}`);
}

// NB: a bare `mapDist(` is NOT refine-only — the base march carries a comment
// ("use mapDist() — distance only"). The ON test checks the actual refine CALL
// `mapDist((ro + rd * dMid)...` separately.
const REFINE_MARKERS = ['uRefineSteps', 'dPrev', 'REFINE_HARD_CAP', 'damped-bisection'];

// ── A. OFF byte-identity ─────────────────────────────────────────────────────
{
  const off = getTraceGLSL({ enableGlow: true, kernel: { refine: false } });
  const offDefault = getTraceGLSL({ enableGlow: true }); // gate omitted → default false
  ck('off === default-arg off (default is false)', off === offDefault);

  for (const m of REFINE_MARKERS) ck(`off omits marker "${m}"`, !off.includes(m), m);

  // The three insertion points must collapse to the ORIGINAL adjacent source when
  // off — proving each ${refine*} interpolated to '' without disturbing bytes.
  ck('off: dPrev-insert collapsed (blank line before for-loop intact)',
    off.includes('vec4 candidateH = vec4(0.0);\n\n    for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {'));
  ck('off: refineBlock collapsed (blank line between adr/0076 note and Apply Final)',
    off.includes('@see docs/adr/0076)\n\n            // Apply Final Volumetric Resolve (Inlined)'));
  ck('off: refineRemember collapsed (step advance directly follows stepJitter decl)',
    off.includes('+ d * 31.7);\n        d += max(h.x, floatPrecision * 0.5) * currentFudge * stepJitter;'));
}

// ── B. ON emission ───────────────────────────────────────────────────────────
{
  const on = getTraceGLSL({ enableGlow: true, kernel: { refine: true } });
  for (const m of REFINE_MARKERS) ck(`on includes marker "${m}"`, on.includes(m), m);

  ck('on: runtime gate present (uRefineActive instant on/off)', /if \(uRefineActive > 0\.5\) \{/.test(on));
  ck('on: loop bounded by REFINE_HARD_CAP', /for \(int j = 0; j < REFINE_HARD_CAP; j\+\+\)/.test(on));
  ck('on: loop budget read from uRefineSteps', /if \(j >= int\(uRefineSteps\)\) break;/.test(on));
  ck('on: bisects the bracket', /float dMid = 0\.5 \* \(dOut \+ dIn\);/.test(on));
  ck('on: mid-point uses mapDist twin (not full map)', /float hMid = mapDist\(\(ro \+ rd \* dMid\) \+ uCameraPosition\);/.test(on));
  ck('on: near-face sign test', /if \(hMid < finalEps\) dIn = dMid; else dOut = dMid;/.test(on));
  ck('on: commits refined near face', /d = dIn;/.test(on));
  ck('on: dPrev declared before the march loop', /float dPrev = d;[^\n]*\n\s*for \(int i = 0/.test(on));
  ck('on: dPrev recorded before the step advance', /dPrev = d;[^\n]*\n\s*d \+= max\(h\.x/.test(on));

  // dPrev must be DECLARED before (outside) the for-loop and only ASSIGNED inside —
  // declaring it at the advance site would put it out of scope at the hit check.
  const declCount = (on.match(/float dPrev = d;/g) || []).length;
  ck('on: exactly one `float dPrev` declaration (outside loop)', declCount === 1, declCount);
}

// ── B2. Physics / lean traces never refine ───────────────────────────────────
{
  const lean = getTraceGLSL({ functionName: 'traceSceneLean' }); // path-tracer secondary
  ck('lean trace omits refinement (default false)', !lean.includes('uRefineSteps'));
}

// ── C. Twin agreement (DE_MASTER emits same body into map + mapDist) ──────────
{
  const FORMULA = '/*__FORMULA_MARKER__*/ z.xyz *= 2.0;';
  const INIT = 'float __initMarker__ = 1.0;';
  const GETDIST = 'vec2 getDist(float r, float dr, float iter, vec4 z) { return vec2(r/dr, iter); }';
  const glsl = DE_MASTER(FORMULA, GETDIST, { loopInit: INIT });

  const mapBody = glsl.slice(glsl.indexOf('vec4 map('), glsl.indexOf('float mapDist('));
  const mapDistBody = glsl.slice(glsl.indexOf('float mapDist('));

  ck('map() contains formula body', mapBody.includes(FORMULA));
  ck('mapDist() contains the SAME formula body', mapDistBody.includes(FORMULA));
  ck('map() contains loopInit', mapBody.includes(INIT));
  ck('mapDist() contains the SAME loopInit', mapDistBody.includes(INIT));
  ck('both share getDist (emitted once above both)', glsl.includes(GETDIST));
  // mapDist strips colour/trap machinery — but those never perturb z, so the
  // silhouette distance is identical. Sanity: mapDist must NOT carry orbit-trap mutation.
  ck('mapDist() strips orbit-trap accumulation (no z-perturbing colour side effects)',
    !mapDistBody.includes('g_orbitTrap = min('));
}

// ── D. Importer is OPT-IN: never auto-enables refinement ──────────────────────
// (Decision 2026-06-27: a canary bench showed refinement doesn't fix the
// DsyneGrafix-class dust it was meant for — that's a DE-fidelity gap, not a
// refinement-recoverable overshoot. So the importer leaves refineSteps unset and
// the user opts in via the Quality panel. @see docs/adr/0084.)
{
  const menger: MB3DFormulaSlot = {
    iterCount: 1, formulaIndex: 20, name: 'Menger3', optionCount: 10,
    optionTypes: [0, 0, 0, 0, 6, 6, 6, 6, 6, 6, 0, 0, 0, 0, 0, 0],
    optionValues: [3, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
  const mkScene = (stepsAfterDEStop: number): MB3DScene => {
    const h = {
      mandId: 44, width: 800, height: 800, iterations: 30, iOptions: 0, zoom: 1, fovY: 60,
      midX: 0, midY: 0, midZ: 0, wRotX: 0, wRotY: 0, wRotZ: 0, isJulia: false, jx: 0, jy: 0, jz: 0, jw: 0,
      m3dVersion: 1.89, tilingOptions: 0,
      rStop: 100, deStop: 0.5, zStepDiv: 0.1, stepsAfterDEStop,
    } as unknown as MB3DHeader;
    return {
      version: 18, header: h, title: 'RefineTest',
      addon: { version: 16, options1: 0, options2: 0, options3: 0, formulaCount: 1, hybOpt1: 0, hybOpt2: 0, slots: [menger] },
      raw: new Uint8Array(0),
    } as MB3DScene;
  };
  const refineOf = (steps: number) => {
    const { def } = emitFusedHybrid(mkScene(steps));
    return (def?.defaultPreset as any)?.features?.quality?.refineSteps;
  };

  // Regardless of the authored bStepsafterDEStop, the importer must NOT set refineSteps
  // (it stays undefined → engine default 0 → off → zero compile cost).
  ck('importer does not auto-enable refine (steps 0)', refineOf(0) === undefined, refineOf(0));
  ck('importer does not auto-enable refine (steps 4)', refineOf(4) === undefined, refineOf(4));
  ck('importer does not auto-enable refine (steps 20)', refineOf(20) === undefined, refineOf(20));
  // REFINE_HARD_CAP still exported + referenced by the kernel/define path.
  ck('REFINE_HARD_CAP is 8', REFINE_HARD_CAP === 8, REFINE_HARD_CAP);
}

// ── E. Numerical (finite-difference) DE — DE_MASTER emission (ADR-0085) ────────
// numericDE=false is byte-identical (no numeric fns, analytic getDist path intact); =true
// emits MB3D's float32-robust CalcDEnoADE port (S-numeric-de-reliability): centerCount sets the
// fixed iteration count, iterateLogRadius re-runs it on perturbed seeds and returns ln(Rout),
// numericDistance differences the LOG radius with the dDEscale (uNumDEeps) magnitude calibration,
// numericNormal central-differences ln(Rout). The LOG form is the float32-safe algebraic
// equivalent of MB3D's raw-Rout difference (the huge R0 cancels), fixing the est7 black scene
// (raw Rout saturated fast escapers to g=0 → DE explosion). Probe is auto-derived (numProbe/
// numFootprint). @see ADR-0085 + sim-numeric-de3.mts (Mandelbulb MISS→HIT).
{
  const FB = 'z.xyz *= 2.0;', GD = 'vec2 getDist(float r,float dr,float iter,vec4 z){return vec2(r/dr,iter);}';
  const off = DE_MASTER(FB, GD);
  const on = DE_MASTER(FB, GD, { kernel: { numericDE: true } });

  for (const m of ['centerCount', 'iterateLogRadius', 'numericDistance', 'numericNormal', 'numProbe', 'numFootprint', 'uNumDEeps']) {
    ck(`numericDE off omits "${m}"`, !off.includes(m), m);
    ck(`numericDE on emits "${m}"`, on.includes(m), m);
  }
  ck('off map keeps analytic getDist', off.includes('vec2 distRes = getDist(r, safeDr, iter, z);'));
  // map() silhouette probe = uNumDESmooth knob (default 2.5, widens to kill deep-region flicker);
  // mapDist() = wider shadow/AO probe (2.5×).
  ck('on map uses numericDistance(p, uNumDESmooth)', on.includes('float finalD = numericDistance(p, uNumDESmooth);'));
  ck('on mapDist uses numericDistance(p, 2.5)', on.includes('float finalD = numericDistance(p, 2.5);'));
  // iterateLogRadius returns ln(Rout) with a tiny lower bound + float32 overflow guard — the LOG
  // is what makes the finite difference saturation-proof (no min(dot,cap) collapse to g=0).
  ck('on iterateLogRadius returns ln(Rout), clamped float32-safe', on.includes('return log(clamp(dot(z.xyz, z.xyz), 1.0e-12, ovf));'));
  ck('on iterateLogRadius overflow guard is float32-safe', on.includes('float ovf = 1.0e30;'));
  // DE = L0·dDEscale·e / (√ΣΔ(ln Rout)² + e·0.06) — L0 = ln(R0); dDEscale (uNumDEeps) is the magnitude.
  ck('on numericDistance uses the LOG-domain L0·dDEscale ratio', on.includes('L0 * uNumDEeps * e / (g + e * 0.06)'));
  ck('on numericDistance no longer differences raw Rout (no min(dot,cap))', !on.includes('return min(dot(z.xyz, z.xyz), cap);'));
  // Probe is auto-derived from the view footprint (cause C).
  ck('on numProbe is footprint-derived (auto, zoom-scaled)', on.includes('min(numFootprint(p), 0.004)'));
  // ln(Rout) increases OUTWARD (escaping side) → +grad is the outward normal.
  ck('on numericNormal uses outward (+grad) ln(Rout) gradient', on.includes('return normalize(grad);') && !on.includes('return normalize(-grad);'));
}

// ── Report ───────────────────────────────────────────────────────────────────
if (fails.length) {
  console.error(`\n✗ trace-refine: ${fails.length} failed, ${pass} passed`);
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
} else {
  console.log(`✓ trace-refine: all ${pass} checks passed`);
}
