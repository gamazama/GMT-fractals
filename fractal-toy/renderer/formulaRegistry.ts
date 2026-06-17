/**
 * Formula registry — lightweight GMT-shaped FractalDefinition table for
 * fractal-toy's raymarcher. Same spirit as GMT's `formulas/*.ts` modules,
 * but pared to what Phase A needs.
 *
 * A formula bundles:
 *   - GLSL function body (`glsl`) + the one-line call (`call`) that the
 *     assembler splices into the inner iteration loop
 *   - Uniforms it declares (name + type + default) — used for both shader
 *     uniform declarations and initial per-frame dispatch
 *   - Optional DDFS-style params (panel UI + store slice + preset round-
 *     trip) auto-wired via `registerFormula`
 *
 * Only ONE formula is active at a time: `state.formula` selects it.
 * Switching formulas rebuilds the shader through CompileGate so the
 * spinner paints before the GPU blocks.
 *
 * Rationale for formulas-as-registry (rather than the DDFS feature
 * registry): formulas are mutually exclusive, carry their own GLSL
 * function, and — unlike camera/lighting — only one of them wants its
 * panel visible at a time. Mixing them into `featureRegistry` would muddy
 * the "all active at once" semantics of DDFS.
 */

import { featureRegistry } from '../../engine/FeatureSystem';
import type { FeatureDefinition } from '../../engine/FeatureSystem';
import { addPanel, getPanelDefinition } from '../../engine/PanelManifest';

export type UniformType = 'int' | 'float' | 'vec2' | 'vec3' | 'vec4';

export interface FormulaUniform {
    name: string;
    type: UniformType;
}

export interface FormulaDefinition {
    id: string;
    name: string;
    description?: string;
    /** GLSL function definition(s). Spliced under 'formulaFunction' section. */
    glsl: string;
    /** One-line call from inside the iteration loop, e.g.
     *  `formula_Mandelbulb(z, dr, c);`. Must mutate `z` and `dr` in place. */
    call: string;
    /** GLSL expression producing the distance estimate given the post-loop
     *  state. Available locals: `r` (length(z.xyz)) and `dr` (scale
     *  derivative).
     *    - Holomorphic families (Mandelbulb, Julia):
     *        '0.5 * log(max(r, 1e-8)) * r / dr'
     *    - Scale-folding families (Mandelbox, KIFS):
     *        'r / abs(dr)'
     *  Default: Mandelbulb log-DE. */
    deExpr?: string;
    /** Escape radius for the inner iteration loop. The loop breaks as soon
     *  as `r > escapeRadius`. Mandelbulb-family escapes at 2; Mandelbox-
     *  family needs a much larger bound so dr has room to grow. Default 2. */
    escapeRadius?: number;
    /** Uniforms the formula declares. Assembler emits declarations for
     *  these; the app pushes per-frame values via the formula's slice. */
    uniforms: FormulaUniform[];
    /** DDFS params — auto-lifted into `featureRegistry` under `id.toLowerCase()`
     *  so the panel, slice, setters, and preset round-trip are all free. */
    params: FeatureDefinition['params'];
    /** Per-frame dispatch: read the formula's slice from the store and
     *  push uniform values. Engine passes a thin uniform-setter facade. */
    pushUniforms?: (setUniforms: UniformSetters, sliceState: Record<string, any>) => void;
}

export interface UniformSetters {
    setF: (name: string, v: number) => void;
    setI: (name: string, v: number) => void;
    set2F: (name: string, a: number, b: number) => void;
    set3F: (name: string, a: number, b: number, c: number) => void;
    set4F: (name: string, a: number, b: number, c: number, d: number) => void;
}

const _formulas = new Map<string, FormulaDefinition>();

/**
 * Register a formula + auto-lift its params into the DDFS feature registry.
 * Must be called before the engine store is constructed (same freeze
 * window as featureRegistry.register).
 */
export const registerFormula = (def: FormulaDefinition): void => {
    if (_formulas.has(def.id)) {
        throw new Error(`[formulaRegistry] duplicate formula id: ${def.id}`);
    }
    _formulas.set(def.id, def);

    // Auto-lift into DDFS so the panel, slice, setters, and preset
    // round-trip come for free. Feature id is the lowercased formula id
    // — stable enough for store lookups (`state.mandelbulb`, etc.).
    const featureId = def.id.toLowerCase();
    const feature: FeatureDefinition = {
        id: featureId,
        name: def.name,
        category: 'Fractal',
        tabConfig: { label: def.name },
        params: def.params,
        // inject() intentionally omitted — the formula's GLSL goes through
        // the assembler's formula-pick path, not the generic inject sweep.
    };
    featureRegistry.register(feature);

    // Register the formula's tab into the panel manifest. Each formula
    // gets its own tab in the right dock; the first formula to register
    // becomes the default active tab for that dock (setupFractalToy's
    // static manifest doesn't mark Camera/Lighting as active, so the
    // formula wins).
    if (!getPanelDefinition(def.name)) {
        addPanel({
            id: def.name,
            dock: 'right',
            order: 0,
            active: true,
            features: [featureId],
        });
    }
};

export const formulaRegistry = {
    get: (id: string): FormulaDefinition | undefined => _formulas.get(id),
    getAll: (): FormulaDefinition[] => Array.from(_formulas.values()),
    has: (id: string): boolean => _formulas.has(id),
    /** Resolve the active formula from the store. Falls back to the first
     *  registered formula if `state.formula` is empty (cold boot). */
    resolve: (activeId: string): FormulaDefinition | undefined => {
        if (activeId && _formulas.has(activeId)) return _formulas.get(activeId);
        const first = _formulas.values().next().value;
        return first as FormulaDefinition | undefined;
    },
};
