/**
 * Fluid-toy slice migrations.
 *
 * Each migration maps a pre-restructure preset shape onto the current
 * slice layout. Run once at preset-load time by @engine/migrations.
 * Apps register their own migrations; the engine only provides the
 * apply-at-load machinery.
 *
 * History
 *   v1 (2026-04-23) — tab-parity restructure:
 *       - dye → palette           (slice rename; keeps gradient, colorMapping,
 *                                  trap*, dyeBlend, interiorColor, etc.)
 *       - dye.collision* → collision.*    (moved to its own slice)
 *       - dye.dyeMix → composite.dyeMix
 *       - dye.dyeInject → fluidSim.dyeInject
 *       - dye.dyeDissipation → fluidSim.dyeDissipation
 *       - dye.dyeDecayMode → fluidSim.dyeDecayMode
 *       - dye.dyeChromaDecayHz → fluidSim.dyeChromaDecayHz
 *       - dye.dyeSaturationBoost → fluidSim.dyeSaturationBoost
 *       - orbit.* → coupling.orbit*       (merged + prefixed)
 *       - fluidSim.force*, interiorDamp, forceCap, edgeMargin → coupling.*
 *       - sceneCamera.center/zoom → julia.center/julia.zoom
 */

import { registerMigration, renameSlice, moveField } from '../engine/migrations';

registerMigration({
    version: 1,
    id: 'fluid-toy.tab-parity-restructure',
    apply: (p: any) => {
        if (!p?.features) return p;

        // Slice rename dye → palette. Handles most of the palette-bound
        // fields in one pass. Specific fields that *left* the palette
        // get moved in the subsequent calls below.
        renameSlice(p, 'dye', 'palette');

        // Collision walls got their own slice.
        moveField(p, 'palette.collisionEnabled',  'collision.enabled');
        moveField(p, 'palette.collisionPreview',  'collision.preview');
        moveField(p, 'palette.collisionGradient', 'collision.gradient');
        moveField(p, 'palette.collisionRepeat',   'collision.repeat');
        moveField(p, 'palette.collisionPhase',    'collision.phase');

        // Composite balance moved off the palette.
        moveField(p, 'palette.dyeMix', 'composite.dyeMix');

        // Fluid-tab absorbs dye-inject + dye-decay subsection.
        moveField(p, 'palette.dyeInject',          'fluidSim.dyeInject');
        moveField(p, 'palette.dyeDissipation',     'fluidSim.dyeDissipation');
        moveField(p, 'palette.dyeDecayMode',       'fluidSim.dyeDecayMode');
        moveField(p, 'palette.dyeChromaDecayHz',   'fluidSim.dyeChromaDecayHz');
        moveField(p, 'palette.dyeSaturationBoost', 'fluidSim.dyeSaturationBoost');

        // Coupling tab absorbs force-law params from fluidSim.
        moveField(p, 'fluidSim.forceMode',     'coupling.forceMode');
        moveField(p, 'fluidSim.forceGain',     'coupling.forceGain');
        moveField(p, 'fluidSim.interiorDamp',  'coupling.interiorDamp');
        moveField(p, 'fluidSim.forceCap',      'coupling.forceCap');
        moveField(p, 'fluidSim.edgeMargin',    'coupling.edgeMargin');

        // Orbit merged into coupling with a prefix.
        moveField(p, 'orbit.enabled', 'coupling.orbitEnabled');
        moveField(p, 'orbit.radius',  'coupling.orbitRadius');
        moveField(p, 'orbit.speed',   'coupling.orbitSpeed');
        if (p.features.orbit && Object.keys(p.features.orbit).length === 0) {
            delete p.features.orbit;
        }

        // Scene-camera merged into julia (reference puts pan/zoom on the
        // Fractal tab).
        moveField(p, 'sceneCamera.center', 'julia.center');
        moveField(p, 'sceneCamera.zoom',   'julia.zoom');
        if (p.features.sceneCamera && Object.keys(p.features.sceneCamera).length === 0) {
            delete p.features.sceneCamera;
        }

        return p;
    },
});
