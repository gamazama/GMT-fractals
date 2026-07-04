/**
 * Interlace's binding of the engine native-slot transpiler.
 *
 * The rewriter machinery (uniform remap, symbol prefixing, c.w isolation, rotation
 * swap, the slot loop GLSL) lives in the engine weave core —
 * engine/weave/nativeSlot.ts (ADR-0089 P2). This module binds it to the interlace
 * namespace and re-exports the original API so existing imports keep resolving.
 */
import { createNativeSlotRewriter, slotUniformNames, extractPreambleFunctions } from '../../engine/weave/nativeSlot';
import type { NativeSlotNamespace } from '../../engine/weave/nativeSlot';

/** The interlace slot namespace (uInterlace* uniforms, interlace_ symbols). */
export const INTERLACE_NAMESPACE: NativeSlotNamespace = {
    uniformPrefix: 'Interlace',
    symbolPrefix: 'interlace_',
    functionName: 'formula_Interlace',
    cVarName: 'cInterlace',
    rotSwapPrefix: '_il_',
    warnTag: 'interlace',
};

const R = createNativeSlotRewriter(INTERLACE_NAMESPACE);

export const rewritePreamble = R.rewritePreamble;
export const rewriteFormulaFunction = R.rewriteFormulaFunction;
export const rewriteLoopBody = R.rewriteLoopBody;
export const rewriteLoopInit = R.rewriteLoopInit;
export const buildInterlaceLoopGLSL = R.buildSlotLoopGLSL;
/** The interlace phase function (`Interlace_weaveSlot`) — the weave core's runtime
 *  modulo scheduler bound to the uInterlace* uniforms. Must be emitted at global
 *  scope wherever buildInterlaceLoopGLSL's inLoop is spliced. */
export const buildInterlaceScheduleGLSL = R.scheduleGLSL;
export { extractPreambleFunctions };

/** All uniform names the interlace feature declares, grouped by GLSL type. */
export const INTERLACE_UNIFORM_NAMES = slotUniformNames('Interlace');
