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
// @see docs/adr/0079-compile-system-profile-seam.md
registerMigration({
    version: 2,
    id: 'app-gmt.engineSettings-to-shaderCompiler',
    apply: (p: any) => {
        renameSlice(p, 'engineSettings', 'shaderCompiler');
        return p;
    },
});
