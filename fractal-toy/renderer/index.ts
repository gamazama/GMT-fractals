/**
 * Fractal-toy renderer — public surface.
 *
 * A renderer plugin provides three things:
 *   1. `installFractalRenderer()` — one-time boot + topbar Formula menu
 *   2. `<FractalRendererCanvas />`  — drop-in inside <ViewportFrame>
 *   3. `fractalRenderer`             — imperative API: getCanvas, rebuild
 *
 * Future worker-mode renderer lives beside this folder with the same
 * export shape; apps swap at import time with no other changes.
 */

export {
    installFractalRenderer,
    FractalRendererCanvas,
    fractalRenderer,
    type InstallFractalRendererOptions,
} from './install';

export {
    formulaRegistry,
    registerFormula,
    type FormulaDefinition,
    type FormulaUniform,
    type UniformType,
    type UniformSetters,
} from './formulaRegistry';
