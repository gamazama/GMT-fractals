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
