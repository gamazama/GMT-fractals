/**
 * loadPastedFormula — the canonical core load sequence for an AI/pasted GMF.
 *
 * Single source of truth shared by every "paste back a formula" entry point:
 * the "Modify with AI" modal (ModifyWithAIModal.tsx), "Load formula from
 * clipboard", and file import (FormulaSelect.tsx). Before this existed, the
 * modal applied the AI-output repairs (normalizeParamSlots → ensureUniqueFormulaId
 * → backfillCoreMathDefaults) but the clipboard / file-import path did NOT — so
 * the SAME paste rendered correctly through the modal but BLACK (sliders at 0)
 * through clipboard / file import. Routing all paths through this helper keeps
 * the repair pipeline identical.
 *
 * Contract:
 *  - `clean` MUST already be a sanitized GMF string (run through `sanitizeGMF`
 *    by the caller). This helper does NOT sanitize.
 *  - On a GMF formula: registers the def in BOTH registries (main +
 *    REGISTER_FORMULA → worker) and hydrates the store via `loadScene`, then
 *    returns the (possibly uniquified) def.
 *  - On legacy JSON (no def): switches the active formula and returns null.
 *
 * @invariant The repair sequence here MUST stay byte-for-byte identical across
 *  callers — it IS the fix for the modal-vs-clipboard black-render divergence.
 *  Don't inline a partial copy at a call site.
 *
 * @see engine-gmt/components/panels/formula/ModifyWithAIModal.tsx (wrapper)
 * @see engine-gmt/components/panels/formula/FormulaSelect.tsx (clipboard + file import)
 * @see plans/ai-formula-kit-spec.md
 */

import { useEngineStore } from '../../../../store/engineStore';
import { registry } from '../../../engine/FractalRegistry';
import { loadGMFScene } from '../../../utils/FormulaFormat';
import {
    ensureUniqueFormulaId,
    normalizeParamSlots,
    backfillCoreMathDefaults,
} from '../../../utils/formulaBrief';
import { FractalEvents, FRACTAL_EVENTS } from '../../../engine/FractalEvents';
import type { FormulaType } from '../../../../types';
import type { FractalDefinition, Preset } from '../../../types';

/**
 * Run the canonical load sequence for a sanitized GMF string. Returns the
 * registered (possibly uniquified) def, or null when the input was legacy JSON
 * (in which case the active formula is switched). Throws if `loadGMFScene` or a
 * downstream step fails — callers own the try/catch + error UI.
 */
export function loadPastedFormula(clean: string): FractalDefinition | null {
    const { def: loadedDef, preset } = loadGMFScene(clean);
    if (!loadedDef) {
        // Legacy JSON — just switch formula.
        useEngineStore.getState().setFormula(preset.formula as FormulaType);
        return null;
    }
    // Normalize uParamC->paramC etc (models confuse the GLSL uniform name with
    // the slot id used by parameters[].id / coreMath keys), then uniquify the id
    // (+ its GLSL function name) so a re-paste can't collide with / silently fail
    // to replace the existing formula.
    const def = ensureUniqueFormulaId(normalizeParamSlots(loadedDef), (id) => !!registry.get(id));
    // AI output is v1 formula-only, so the scene preset IS the def's (normalized)
    // defaultPreset; seed any slider the model left out of coreMath from its
    // parameters[].default (the engine reads a param's value from coreMath, not
    // parameters[].default — this is what keeps sliders off 0). A v2 <Scene>
    // paste keeps its own preset (saved scenes already use canonical slot keys).
    const isSceneGmf = /<Scene>/.test(clean);
    const basePreset = (isSceneGmf ? preset : def.defaultPreset) as Preset;
    const loadPreset = backfillCoreMathDefaults({ ...basePreset, formula: def.id } as Preset, def.parameters);
    // Register in BOTH registries (main + worker) — loadScene() does neither.
    registry.register(def);
    FractalEvents.emit(FRACTAL_EVENTS.REGISTER_FORMULA, { id: def.id, shader: def.shader });
    useEngineStore.getState().loadScene({ def, preset: loadPreset });
    return def;
}
