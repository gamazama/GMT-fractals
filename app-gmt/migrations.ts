/**
 * app-gmt slice migrations.
 *
 * Each migration maps a pre-restructure preset shape onto the current
 * slice layout. Run once at preset-load time by @engine/migrations
 * (applyMigrations runs inside engineStore.loadPreset BEFORE any feature
 * setter dispatches, so every load path — GMF text, PNG-embedded scenes,
 * plain JSON, share-string/URL, bundled library GMFs, gallery scenes, and
 * formula defaultPresets on formula switch — funnels through here).
 *
 * Apps register their own migrations; the engine only provides the
 * apply-at-load machinery. Imported as a side-effect from main.tsx.
 *
 * History
 *   v1 (2026-05-28) — Escape Radius is a coloring-only threshold:
 *       Once the raymarch DE got its own bailout (quality.deBailout /
 *       uDeBailout), the escape radius (uEscapeThresh) no longer affects
 *       geometry for per-iteration formulas — it only drives the Potential/
 *       Decomposition/Flow coloring modes and smooth-iteration normalization.
 *       So it lives on the `coloring` feature.
 *
 *       - A brief earlier dev build housed it at features.quality.escape;
 *         route that back to features.coloring.escape. Legacy files already
 *         store it at features.coloring.escape and are left untouched.
 *       - MandelTerrain (self-contained) used the escape radius AS its
 *         geometry bail before the split. Preserve old files' surface by
 *         seeding quality.deBailout from the escape value, so they bail where
 *         they always did instead of falling back to the deBailout default.
 */

import { registerMigration, renameSlice } from '../engine/migrations';
import { migrateLegacyWeavePreset } from '../engine-gmt/utils/weaveMigration';

registerMigration({
    version: 1,
    id: 'app-gmt.escape-radius-to-coloring',
    apply: (p: any) => {
        if (!p?.features) return p;

        // Route a stray quality.escape (earlier dev build) back to coloring.
        // Capture the effective escape value wherever it lives so the
        // MandelTerrain bail-preservation below can use it.
        let escapeVal: number | undefined;
        const q = p.features.quality;
        if (q && q.escape !== undefined) {
            escapeVal = q.escape;
            delete q.escape;
            if (!p.features.coloring) p.features.coloring = {};
            if (p.features.coloring.escape === undefined) {
                p.features.coloring.escape = escapeVal;
            }
        } else if (p.features.coloring && p.features.coloring.escape !== undefined) {
            escapeVal = p.features.coloring.escape;
        }

        // MandelTerrain bailed its self-contained loop at the escape radius
        // before deBailout existed. Seed deBailout so the geometry is unchanged.
        if (escapeVal !== undefined && p.formula === 'MandelTerrain') {
            if (!p.features.quality) p.features.quality = {};
            if (p.features.quality.deBailout === undefined) {
                p.features.quality.deBailout = escapeVal;
            }
        }

        return p;
    },
});

// v2 (2026-06-20) — the "Engine" feature/panel was renamed to "Shader Compiler"
// to kill the overload with the engine-core/engine-gmt code LAYERS. The DDFS
// feature id `engineSettings` (which serializes its `showEngineTab` flag into
// saved scenes + a handful of formula defaultPresets) becomes `shaderCompiler`.
// @see docs/adr/0079-shader-compiler-profile-seam.md
registerMigration({
    version: 2,
    id: 'app-gmt.engineSettings-to-shaderCompiler',
    apply: (p: any) => {
        renameSlice(p, 'engineSettings', 'shaderCompiler');
        return p;
    },
});

// v3 (2026-07-04) — legacy weave-system absorption (ADR-0089 P4.4/P4.5).
// `features.interlace` (and, with P4.5, Hybrid Box interleaved state) converts
// into a registered 2-slot native weave + `features.weave` state at load;
// legacy state is cleared post-migration (owner decision: no double-apply;
// files on disk untouched until re-save — accepted one-way door). Keyframed
// tracks/LFOs retarget to the weave keys. Non-representable scenes are left
// untouched with a console warning (they load as their base formula).
// @see engine-gmt/utils/weaveMigration.ts · docs/adr/0089 P4.4 update block
registerMigration({
    version: 3,
    id: 'app-gmt.legacy-weave-absorption',
    apply: (p: any) => migrateLegacyWeavePreset(p),
});

// v4 (2026-07-05) — the MB3D-faithful marcher became THE marcher (ADR-0092).
// The legacy plain sphere step, the mb3dFaithful compile gate, and the separate
// mb3dStepDiv param/uniform are retired; quality.fudgeFactor is the unified
// step divisor (MB3D sZstepDiv ↔ fudgeFactor, a 1:1 mapping).
//  - Scenes that marched faithfully (mb3dFaithful truthy) carried their REAL
//    step divisor in mb3dStepDiv (fudgeFactor only paced shadow/visibility rays
//    there) — move it onto fudgeFactor so the primary march is unchanged.
//  - Scenes with the gate off/absent had inert mb3dStepDiv/mb3dDEsub values
//    (uniforms unread) — drop them so the now-always-live safety-subtraction
//    doesn't suddenly bite.
//  - Keyframe tracks / LFOs targeting quality.mb3dStepDiv retarget to
//    quality.fudgeFactor (pure key rename); mb3dFaithful had no uniform and
//    compile params aren't animatable in practice — any stray reference is
//    left to fall through as an unknown target (warned by the engine).
// Non-black test for a serialized colour param (presets store '#rrggbb'
// strings; be defensive about {r,g,b} 0..1 objects from older/odd paths).
// Absent = default black.
const isNonBlackColor = (c: any): boolean => {
    if (typeof c === 'string') {
        const hex = c.replace('#', '');
        if (hex.length < 6) return false;
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return (r || 0) > 3 || (g || 0) > 3 || (b || 0) > 3;
    }
    if (c && typeof c === 'object') {
        return (c.r ?? 0) > 0.012 || (c.g ?? 0) > 0.012 || (c.b ?? 0) > 0.012;
    }
    return false;
};

registerMigration({
    version: 4,
    id: 'app-gmt.faithful-marcher-unification',
    apply: (p: any) => {
        const q = p?.features?.quality;
        if (q && typeof q === 'object') {
            const faithful = !!q.mb3dFaithful;
            if (faithful) {
                // Saves can omit default-valued params; the old param default was 0.5.
                q.fudgeFactor = typeof q.mb3dStepDiv === 'number' ? q.mb3dStepDiv : 0.5;
            } else if (q.mb3dDEsub !== undefined) {
                delete q.mb3dDEsub; // was inert behind the off gate
            }
            delete q.mb3dFaithful;
            delete q.mb3dStepDiv;
        }

        // Retarget animation routing (LFO targets + sequence tracks) — pure rename.
        const RENAME: Record<string, string> = { 'quality.mb3dStepDiv': 'quality.fudgeFactor' };
        if (Array.isArray(p?.animations)) {
            for (const a of p.animations) {
                if (a && typeof a.target === 'string' && RENAME[a.target]) a.target = RENAME[a.target];
            }
        }
        const tracks = p?.sequence?.tracks;
        if (tracks && typeof tracks === 'object') {
            for (const key of Object.keys(tracks)) {
                const next = RENAME[key];
                if (!next) continue;
                const tr = tracks[key];
                if (tr && typeof tr === 'object' && typeof tr.id === 'string') tr.id = next;
                tracks[next] = tracks[key];
                delete tracks[key];
            }
        }
        return p;
    },
});

// v5 (2026-07-10) — the backdrop IS the sky (ADR-0098). Sky Visibility became a
// plain brightness dial (0 → BLACK; the "fall back to the flat Background Color"
// rule is gone), and the flat-colour backdrop moved into the sky source enum as
// 'Solid' (envSource 2 — GetEnvMap returns the shared Sky/Fog colour, so it also
// dome-lights and reflects). Scenes that showed a coloured flat backdrop the old
// way (sky hidden + non-black fogColor) convert to a Solid sky at visibility 1 —
// but ONLY when the environment light is off too: the source is shared, and
// swapping a lit Gradient/Image dome to Solid would change the lighting. That
// rare combo keeps its lighting and gets a black backdrop (accepted trade,
// ADR-0098). Default scenes (black fogColor) are bit-identical either way.
registerMigration({
    version: 5,
    id: 'app-gmt.solid-sky-backdrop',
    apply: (p: any) => {
        const f = p?.features;
        if (!f) return p;
        const bg = f.materials?.envBackgroundStrength ?? 0;    // absent = old default 0
        const light = f.materials?.envStrength ?? 0;           // absent = default 0
        if (bg > 0.001 || light > 0.001) return p;
        if (!isNonBlackColor(f.atmosphere?.fogColor)) return p;
        if (!f.materials) f.materials = {};
        f.materials.envSource = 2.0;
        f.materials.envBackgroundStrength = 1.0;
        return p;
    },
});

// v6 (2026-07-10) — Fog Tint inversion (ADR-0097 update #4, owner design). The
// former fogEnvTint ('Sky Tint', 0 = flat fog colour, 1 = sky-derived) inverts
// into fogTint ('Fog Tint', 0 = fog follows the sky — the new default and the
// physically-right aerial perspective; 1 = the custom Fog Color).
//
// NARROW on purpose (owner correction, same day): only scenes with fog
// actually ON (fogIntensity > 0) get pinned to their old flat-colour look —
// they authored that fog. Everything else is left at the new default, so when
// a user turns fog on for the first time they get SKY-COLOURED fog, not the
// mystery-black flat default colour. (The first cut of this migration pinned
// fogTint=1 onto every loaded preset with an atmosphere slice — which made
// every scene's fog flat black-by-default again.)
// Animation retargeting is skipped on purpose: fogEnvTint shipped for a few
// hours on an unpushed branch, and its keyed values would be inverted anyway.
registerMigration({
    version: 6,
    id: 'app-gmt.fog-tint-inversion',
    apply: (p: any) => {
        const a = p?.features?.atmosphere;
        if (a && typeof a === 'object') {
            const old = typeof a.fogEnvTint === 'number' ? a.fogEnvTint : 0;
            delete a.fogEnvTint;
            if ((a.fogIntensity ?? 0) > 0.001) {
                a.fogTint = 1 - Math.min(1, Math.max(0, old));
            }
        }
        return p;
    },
});

// v7 (2026-07-25) — modulation rule bands move from a fraction of nyquist to
// real Hz. @see docs/adr/0106-modulation-bands-in-hz.md
//
// The stored fraction was `hz / (sampleRate/2)`, and the AUTHORING sample rate
// was never recorded. 48 kHz is ASSUMED rather than read from the loading
// device, for two reasons: it is the common Web Audio rate on desktop, and —
// decisively — a share link has to mean the same thing everywhere. Using the
// local rate would make one link decode to different frequencies on different
// machines, and would freeze a 44.1 kHz reader's already-misread bands as if
// they had been intended. Worst case on a genuinely 44.1 kHz-authored scene is
// an 8.8% shift, about 1.5 semitones.
const LEGACY_NYQUIST_HZ = 24000;

registerMigration({
    version: 7,
    id: 'app-gmt.modulation-band-to-hz',
    apply: (p: any) => {
        const rules = p?.features?.modulation?.rules;
        if (!Array.isArray(rules)) return p;
        for (const r of rules) {
            if (!r || typeof r !== 'object') continue;
            // Idempotent: a rule already carrying Hz is left alone, so a re-run
            // (or a mixed-vintage scene) cannot double-convert.
            if (typeof r.lowHz === 'number' || typeof r.highHz === 'number') continue;
            if (typeof r.freqStart === 'number') r.lowHz = r.freqStart * LEGACY_NYQUIST_HZ;
            if (typeof r.freqEnd === 'number') r.highHz = r.freqEnd * LEGACY_NYQUIST_HZ;
            delete r.freqStart;
            delete r.freqEnd;
        }
        return p;
    },
});

// v8 (2026-10-13) — path-traced shadow rays test at the surface's own threshold.
// The path tracer's NEE epsilon (pathtracer.ts, grep `visualLimitNEE`) left
// uPixelThreshold out of the footprint formula that the primary march and
// Direct's shadows both use, so its shadow rays ran 1/pixelThreshold times
// coarser than the surface they left and self-shadowed on it — over half the
// direct light on a detailed surface at pixelThreshold 0.2. That is fixed;
// lighting.ptShadowTolerance (default 1) is the ratio to the surface threshold.
//
// Scenes SAVED path traced were lit and exposed against that false shadow, so
// they are pinned to the ratio they rendered with: 1/pixelThreshold. That is
// the ratio at device pixel ratio 1, the app default. The old formula also had
// uInternalScale (= DPR) on the wrong side of the divide, and a scene does not
// record the DPR it was viewed at, so a scene authored at another DPR comes
// back close rather than identical. Three things the rule depends on:
//  - The version tag is not persisted (a save/reload replays this whole chain),
//    so the test is CONTENT: a scene saved since the fix carries
//    ptShadowTolerance explicitly and is left alone. Files, PNGs, gallery items
//    and shared scenes all store the full parameter set.
//  - NARROW on purpose, as v6: only renderMode = Path Tracing is pinned. A
//    Direct scene never showed the old ratio, and pinning every loaded preset
//    would hand the old shadows to every formula switch and every new scene.
//  - Share links are covered too. (Corrected 2026-10-13: this bullet first
//    claimed a link stores only what differs from defaults, so an old one could
//    not be told from a new one. It does not — every feature slice is emitted
//    whole; grep `READ BEFORE EDITING THE SKIP-LIST` in utils/UrlStateEncoder.ts.
//    A link made before the fix simply lacks the key, like an old file.)
// @see docs/adr/0093-zoom-normalized-shadow-march.md (update 2026-10-13)
const PIXEL_THRESHOLD_DEFAULT = 0.5;   // quality.pixelThreshold default, for saves that omit it

registerMigration({
    version: 8,
    id: 'app-gmt.pt-shadow-tolerance',
    apply: (p: any) => {
        const l = p?.features?.lighting;
        if (!l || typeof l !== 'object') return p;
        if (l.ptShadowTolerance !== undefined) return p;   // saved since the fix, or already pinned
        if (l.renderMode !== 1) return p;
        const stored = p.features.quality?.pixelThreshold;
        const threshold = typeof stored === 'number' && stored > 0 ? stored : PIXEL_THRESHOLD_DEFAULT;
        // Clamp to the param's range; pixelThreshold's own range (0.1–2) maps onto it exactly.
        l.ptShadowTolerance = Math.min(10, Math.max(0.5, 1 / threshold));
        return p;
    },
});

// v9 (2026-10-13) — a Sphere light's distance law is its own Falloff / Range
// (ADR-0138). The path tracer used to give Sphere lights a built-in
// inverse-square ON TOP of that falloff — about power / (2·d²) — which Direct
// mode never applied. It is gone: a Sphere light now reads the same in both
// render modes, and the same as a Point light with the same settings.
//
// A scene SAVED path traced was lit against that extra term, so its Sphere
// lights are rewritten to keep their look under the one model: Quadratic
// falloff, a Range short enough that the curve is inverse-square across the
// scene, and Power rescaled to match in the far field
// (P' · R² / (99·d²) = P / (2·d²)). Approximate, and accepted as such (owner,
// 2026-10-13):
//  - measured on a close-up scene, within 2–3% of the old image;
//  - a light that ALREADY had a falloff of its own had two falloffs multiplied,
//    which one curve cannot express. Its own falloff is folded into the Power
//    at the one distance a preset records — the surface under the screen
//    centre — so it matches there, and is dimmer nearer the light and brighter
//    beyond;
//  - a light whose Power or falloff is keyframed, LFO-driven or audio-driven is
//    left as it is: those tracks are in the old units, and rescaling the static
//    value under them would break the animation. It just loses the extra term.
// A scene saved in Direct never showed the extra term; its lights are only marked.
//
// `unifiedFalloff` on the light is that mark. The version tag is not persisted
// (a save/reload replays this chain), so without it the rewrite would compound
// on every load; everything that makes a light a Sphere since sets it
// (lightMenuUtils.ts). Lights are stored whole even in share links, so old
// links convert too.
// @see docs/adr/0138-sphere-lights-follow-the-lights-falloff.md

/** Quadratic falloff is `1 / (1 + k·d²)` with `k = 99 / range²` — 1% at `range`;
 *  Linear is `1 / (1 + k·d)` with `k = 99 / range`. With no Range, `k` is the
 *  raw `falloff`. Grep `99.0 / (range * range)` in
 *  engine-gmt/engine/managers/UniformManager.ts — this mirrors that packing. */
const FALLOFF_RANGE_K = 99;
const ownAttenuation = (light: any, d: number): number => {
    const range = typeof light.range === 'number' ? light.range : 0;
    const linear = light.falloffType === 'Linear';
    const k = range > 0.001
        ? FALLOFF_RANGE_K / (linear ? range : range * range)
        : Math.max(0, typeof light.falloff === 'number' ? light.falloff : 0);
    return 1 / (1 + k * (linear ? d : d * d));
};

/** Distance from a light to the surface under the screen centre, or undefined
 *  when the preset lacks the camera fields. A fixed light is a headlamp: its
 *  position is in camera space, looking down -Z
 *  (grep `getLightShaderVector` in engine/plugins/navigation/core/VirtualSpace.ts). */
const lightToSubjectDistance = (p: any, light: any): number | undefined => {
    const t = p?.targetDistance;
    const pos = light?.position;
    if (!(typeof t === 'number' && t > 0) || !pos) return undefined;
    if (light.fixed) return Math.hypot(pos.x, pos.y, pos.z + t);
    const q = p.cameraRot;
    const so = p.sceneOffset;
    if (!q || !so) return undefined;
    // forward = q · (0, 0, -1); the camera sits at sceneOffset.
    const fx = -2 * (q.x * q.z + q.w * q.y);
    const fy = -2 * (q.y * q.z - q.w * q.x);
    const fz = -(1 - 2 * (q.x * q.x + q.y * q.y));
    return Math.hypot(
        pos.x - (so.x + (so.xL ?? 0) + fx * t),
        pos.y - (so.y + (so.yL ?? 0) + fy * t),
        pos.z - (so.z + (so.zL ?? 0) + fz * t),
    );
};

/** Range given to a converted light, in radii: the curve's knee sits at about
 *  radius / 2, so it is inverse-square from the sphere's surface outward. */
const CONVERTED_RANGE_PER_RADIUS = 5;
/** The Sphere power slider's ceilings (grep `INTENSITY_SPHERE` in
 *  engine/features/modulation/paramMapping.ts, and the EV `max` in
 *  LightControls.tsx). A tiny light converts to a huge Power; rather than write a
 *  value the slider would clamp on first touch, the Range is widened to fit. */
const SPHERE_POWER_MAX_RAW = 10000;
const SPHERE_POWER_MAX_EV = 20;

const convertLegacySphereLight = (p: any, light: any): void => {
    const radius = typeof light.radius === 'number' ? light.radius : 0;
    const isEv = light.intensityUnit === 'ev';
    const stored = typeof light.intensity === 'number' ? light.intensity : 0;
    const storedPower = isEv ? Math.pow(2, stored) : stored;
    if (!(radius > 0.001) || !(storedPower > 0)) return;   // not a working sphere light: no look to keep

    const subject = lightToSubjectDistance(p, light);
    const power = storedPower * (subject === undefined ? 1 : ownAttenuation(light, subject));

    const powerMax = isEv ? Math.pow(2, SPHERE_POWER_MAX_EV) : SPHERE_POWER_MAX_RAW;
    const rangeThatFitsSlider = Math.sqrt(FALLOFF_RANGE_K * power / (2 * powerMax));
    const range = Math.max(CONVERTED_RANGE_PER_RADIUS * radius, rangeThatFitsSlider);
    const newPower = power * FALLOFF_RANGE_K / (2 * range * range);

    light.falloffType = 'Quadratic';
    light.range = range;
    light.intensity = isEv ? Math.log2(newPower) : newPower;
};

/** Every target a keyframe track, LFO or modulation rule drives in this preset. */
const drivenTargets = (p: any): Set<string> => {
    const out = new Set<string>(Object.keys(p?.sequence?.tracks ?? {}));
    for (const a of Array.isArray(p?.animations) ? p.animations : []) {
        if (typeof a?.target === 'string') out.add(a.target);
    }
    for (const r of Array.isArray(p?.features?.modulation?.rules) ? p.features.modulation.rules : []) {
        if (typeof r?.target === 'string') out.add(r.target);
    }
    return out;
};

registerMigration({
    version: 9,
    id: 'app-gmt.sphere-light-unified-falloff',
    apply: (p: any) => {
        const pathTraced = p?.features?.lighting?.renderMode === 1 || p?.renderMode === 'PathTracing';
        const driven = pathTraced ? drivenTargets(p) : null;
        // `p.lights` is the legacy top-level home (gmtPresetFields.ts reads it after migrations).
        for (const lights of [p?.features?.lighting?.lights, p?.lights]) {
            if (!Array.isArray(lights)) continue;
            lights.forEach((light: any, i: number) => {
                if (!light || typeof light !== 'object' || light.type !== 'Sphere') return;
                if (light.unifiedFalloff !== undefined) return;   // made or converted since
                const animated = !!driven && (driven.has(`lighting.light${i}_intensity`) || driven.has(`lighting.light${i}_falloff`));
                if (pathTraced && !animated) convertLegacySphereLight(p, light);
                light.unifiedFalloff = true;
            });
        }
        return p;
    },
});

// v10 (2026-10-13) — Cook-Torrance is the Direct specular model (ADR-0139);
// Blinn-Phong stays with what was authored under it. lighting.specularModel now
// defaults to 1. A preset that sets up its own look — lights, a lighting slice
// or a materials slice — but names no model was lit and exposed against
// Blinn-Phong's far stronger highlight, so it is pinned to 0 and renders as it
// was saved. Measured on the built-in default scenes: unpinned, the same lights
// come out 0-78% darker under Cook-Torrance, a quarter darker on a typical one.
//  - Most files need no help: saves, PNGs, gallery items and share links have
//    carried the full lighting slice, model included, for as long as the param
//    has existed. The rule is for what predates it (more than half of the
//    owner's own archive of text saves) and for sparse presets — Formula
//    Workshop files, Mandelbulb3D imports — that bake lights in and say
//    nothing more.
//  - NARROW on purpose, as v6 and v8: a preset with nothing of its own to
//    preserve (an AI-written formula carries coreMath and quality only) is left
//    alone and takes the default.
//  - Content-keyed, because the version tag is not persisted and a save/reload
//    replays this chain: once pinned the key exists, and a scene the user then
//    moves to Cook-Torrance names 1.
//  - The built-in default scenes name 1 (their lights were rescaled for it), so
//    the rule passes them by. A built-in that forgets to would be pinned here
//    and render too bright; `npm run test:migrations` section [10] checks all
//    of them.
// A formula switch from the picker never reaches the pin: setFormula
// (store/engineStore.ts, grep `Preserve compile-time engine params`) writes the
// current model into any preset that names none before this runs.
// @see docs/adr/0139-cook-torrance-is-the-direct-specular-model.md
const hasKeys = (v: any): boolean => !!v && typeof v === 'object' && Object.keys(v).length > 0;

registerMigration({
    version: 10,
    id: 'app-gmt.blinn-phong-for-scenes-authored-under-it',
    apply: (p: any) => {
        const f = p?.features;
        if (!f || typeof f !== 'object') return p;
        if (f.lighting?.specularModel !== undefined) return p;   // names its model, or already pinned
        // `p.lights` is the legacy top-level home (gmtPresetFields.ts reads it after migrations).
        const authored = hasKeys(f.lighting) || hasKeys(f.materials) || (Array.isArray(p.lights) && p.lights.length > 0);
        if (!authored) return p;
        if (!f.lighting || typeof f.lighting !== 'object') f.lighting = {};
        f.lighting.specularModel = 0;
        return p;
    },
});
