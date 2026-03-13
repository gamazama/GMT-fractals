/**
 * AST-based Fragmentarium parser.
 * Uses @shaderfrog/glsl-parser to analyse GLSL functions without regex fragility.
 */

import { parse, generate } from '@shaderfrog/glsl-parser';
import { visit } from '@shaderfrog/glsl-parser/ast';
import type {
    Program,
    FunctionNode,
    IdentifierNode,
    WhileStatementNode,
    ForStatementNode,
    ReturnStatementNode
} from '@shaderfrog/glsl-parser/ast';
import type {
    FragUniform,
    FragDocumentV2,
    DEFunctionInfo,
    HelperFunctionInfo,
    InitFunctionInfo,
    FunctionParameter,
    LoopInfo,
    FunctionCandidate,
    ParamMappingV2,
} from '../types';
import type { GenericFragDocument } from '../types';
import { preprocessFragmentariumSource, extractComputedGlobals, extractGlobalDeclarations } from './preprocessor';
import { findUniforms, findPresets, findIncludes } from './uniform-parser';

// ============================================================================
// AST utilities
// ============================================================================

/** DE function names recognised as distance estimators.
 *  'DE'/'dist' = Fragmentarium standard; 'de'/'sdf'/'map' = DEC / Shadertoy / blog posts. */
const DE_FUNCTION_NAMES = new Set(['DE', 'dist', 'de', 'sdf', 'map']);

/** Fragmentarium standard DE names — searched first to avoid false-positives
 *  when a formula has both e.g. `map()` helper and `DE()` main function. */
const FRAG_DE_NAMES = new Set(['DE', 'dist']);

function findDEFunction(ast: Program): FunctionNode | null {
    // Pass 1: prefer standard Fragmentarium names (DE, dist)
    for (const statement of ast.program) {
        if (statement.type === 'function') {
            const func = statement as FunctionNode;
            const funcName = func.prototype?.header?.name?.identifier;
            if (funcName && FRAG_DE_NAMES.has(funcName)) return func;
        }
    }
    // Pass 2: fall back to DEC / Shadertoy names (de, sdf, map)
    for (const statement of ast.program) {
        if (statement.type === 'function') {
            const func = statement as FunctionNode;
            const funcName = func.prototype?.header?.name?.identifier;
            if (funcName && DE_FUNCTION_NAMES.has(funcName)) return func;
        }
    }
    return null;
}

function findHelperFunctions(ast: Program, deFunc: FunctionNode | null): FunctionNode[] {
    const deName = deFunc?.prototype?.header?.name?.identifier;
    const helpers: FunctionNode[] = [];
    for (const statement of ast.program) {
        if (statement.type === 'function') {
            const func = statement as FunctionNode;
            const funcName = func.prototype?.header?.name?.identifier;
            if (funcName && funcName !== deName && funcName !== 'init') {
                helpers.push(func);
            }
        }
    }
    return helpers;
}

function findInitFunction(ast: Program): InitFunctionInfo | null {
    for (const statement of ast.program) {
        if (statement.type === 'function') {
            const func = statement as FunctionNode;
            const funcName = func.prototype?.header?.name?.identifier;
            if (funcName === 'init') {
                return { body: generate(func.body), raw: generate(func) };
            }
        }
    }
    return null;
}

export function extractParameters(func: FunctionNode): FunctionParameter[] {
    const params: FunctionParameter[] = [];
    if (func.prototype?.parameters) {
        for (const param of func.prototype.parameters) {
            const p = param as any;
            params.push({
                name: p.identifier?.identifier || 'unknown',
                type: generate(p.specifier),
                qualifier: p.qualifier
            });
        }
    }
    return params;
}

export function extractLoopInfo(func: FunctionNode): LoopInfo | null {
    const whileLoops: Array<{ condition: string; body: string }> = [];
    const forLoops: Array<{ init: string | null; condition: string; body: string }> = [];

    visit(func, {
        while_statement: {
            enter(path) {
                const loop = path.node as WhileStatementNode;
                whileLoops.push({ condition: generate(loop.condition), body: generate(loop.body) });
            }
        },
        for_statement: {
            enter(path) {
                const loop = path.node as ForStatementNode;
                forLoops.push({
                    init: loop.init ? generate(loop.init) : null,
                    condition: loop.condition ? generate(loop.condition) : '',
                    body: generate(loop.body)
                });
            }
        }
    });

    if (whileLoops.length > 0) {
        const wl = whileLoops[0];
        const counterMatch = wl.condition.match(/(\w+)\s*<[\s\S]+/);
        // Only treat the matched variable as a counterVar if it's incremented in the
        // body (n++, n += 1) — this rules out float magnitudes like `r < Bailout`.
        const candidate = counterMatch ? counterMatch[1] : null;
        const isIncremented = candidate
            ? new RegExp(`\\b${candidate}\\s*\\+\\+|\\+\\+\\s*${candidate}|\\b${candidate}\\s*\\+=`).test(wl.body)
            : false;
        return {
            type: 'while',
            counterVar: isIncremented ? candidate : null,
            counterInitDecl: null,
            condition: wl.condition,
            body: wl.body,
            hasBreak: wl.body.includes('break')
        };
    }

    if (forLoops.length > 0) {
        const fl = forLoops[0];
        let counterVar: string | null = null;
        let counterInitDecl: string | null = null;
        if (fl.init) {
            const m = fl.init.match(/\bint\s+(\w+)\s*=/);
            if (m) {
                counterVar = m[1];
                counterInitDecl = fl.init.replace(/;+\s*$/, '').trim();
            }
        }
        // Fallback: if the for init has no declaration (e.g. "for (i=0; ...)") the counter
        // was declared before the loop. Extract it from the condition "i < Iterations".
        if (!counterVar && fl.condition) {
            const m = fl.condition.match(/\b(\w+)\s*</);
            if (m) counterVar = m[1];
        }
        return {
            type: 'for',
            counterVar,
            counterInitDecl,
            condition: fl.condition,
            body: fl.body,
            hasBreak: fl.body.includes('break')
        };
    }

    return null;
}

export function extractDistanceExpression(func: FunctionNode): string | null {
    let distanceExpr: string | null = null;
    visit(func, {
        return_statement: {
            enter(path) {
                const ret = path.node as ReturnStatementNode;
                if (ret.expression) distanceExpr = generate(ret.expression);
            }
        }
    });
    return distanceExpr;
}

export function hasOrbitTrapUsage(func: FunctionNode): boolean {
    let hasOrbitTrap = false;
    visit(func, {
        identifier: {
            enter(path) {
                const node = path.node as IdentifierNode;
                if (node.identifier === 'orbitTrap') hasOrbitTrap = true;
            }
        }
    });
    return hasOrbitTrap;
}

export function findUsedUniforms(func: FunctionNode, allUniforms: FragUniform[]): string[] {
    const usedUniforms: Set<string> = new Set();
    const uniformNames = new Set(allUniforms.map(u => u.name));
    visit(func, {
        identifier: {
            enter(path) {
                const node = path.node as IdentifierNode;
                if (uniformNames.has(node.identifier)) usedUniforms.add(node.identifier);
            }
        }
    });
    return Array.from(usedUniforms);
}

// ============================================================================
// Main parse function (replaces GenericFragmentariumParserV2.parse)
// ============================================================================

export function parseFragmentariumSource(source: string, v1Doc?: GenericFragDocument): FragDocumentV2 {
    const cleanedSource = preprocessFragmentariumSource(source);
    const ast = parse(cleanedSource);

    const deFunctionNode = findDEFunction(ast);
    let deFunction: DEFunctionInfo | null = null;

    let allUniforms: FragUniform[];
    if (v1Doc) {
        // v1 parser misses int-type uniforms — merge in any that it omitted.
        const v1Names = new Set(v1Doc.uniforms.map((u: any) => u.name));
        const v2All = findUniforms(cleanedSource);
        const merged: FragUniform[] = v1Doc.uniforms.map((u: any) => ({
            name: u.name, type: u.type, uiType: u.uiType,
            min: u.min, max: u.max, step: u.step,
            default: u.default, mappedSlot: u.mappedSlot, isDegrees: u.isDegrees
        }));
        // Append v2-detected uniforms not present in v1 (e.g. int uniforms)
        for (const u of v2All) {
            if (!v1Names.has(u.name)) merged.push(u);
        }
        allUniforms = merged;
    } else {
        allUniforms = findUniforms(cleanedSource);
    }
    const docPresets = v1Doc ? v1Doc.presets : findPresets(cleanedSource);
    const docIncludes = v1Doc ? v1Doc.includes : findIncludes(cleanedSource);

    if (deFunctionNode) {
        const loopInfo = extractLoopInfo(deFunctionNode);
        const hasOrbitTrap = hasOrbitTrapUsage(deFunctionNode);
        const distanceExpression = extractDistanceExpression(deFunctionNode);
        const usedUniforms = findUsedUniforms(deFunctionNode, allUniforms);

        deFunction = {
            name: deFunctionNode.prototype?.header?.name?.identifier || 'DE',
            returnType: generate(deFunctionNode.prototype?.header?.returnType?.specifier || { type: 'void' } as any),
            parameters: extractParameters(deFunctionNode),
            body: generate(deFunctionNode.body),
            loopInfo,
            usedUniforms,
            hasOrbitTrap,
            distanceExpression
        };
    }

    const helperNodes = findHelperFunctions(ast, deFunctionNode);
    const helperFunctions: HelperFunctionInfo[] = helperNodes.map(h => ({
        name: h.prototype?.header?.name?.identifier || 'unknown',
        returnType: generate(h.prototype?.header?.returnType?.specifier || { type: 'void' } as any),
        parameters: extractParameters(h),
        body: generate(h.body),
        raw: generate(h)
    }));

    const initFunction = findInitFunction(ast);
    const computedGlobals = extractComputedGlobals(source);
    const globalDecls = extractGlobalDeclarations(source);

    return {
        uniforms: allUniforms,
        presets: docPresets,
        deFunction,
        helperFunctions,
        initFunction,
        includes: docIncludes,
        rawGLSL: source,
        computedGlobals,
        globalDecls
    };
}

// ============================================================================
// Workshop helpers (replaces GenericFragmentariumParserV2 static methods)
// ============================================================================

export function hasProvidesColor(source: string): boolean {
    return /#define\s+providesColor/.test(source);
}

export function hasDEFunction(source: string): boolean {
    try {
        return findDEFunction(parse(source)) !== null;
    } catch {
        return false;
    }
}

export function detectPattern(doc: FragDocumentV2): 'MANDELBOX' | 'MENGER' | 'AMAZING_SURFACE' | 'GENERIC' {
    if (!doc.deFunction) return 'GENERIC';
    const body = doc.deFunction.body;
    if (body.includes('z.xy = z.yx') || body.includes('z.xz = z.zx')) return 'MENGER';
    if (body.includes('boxFold') || body.includes('sphereFold') || body.includes('min(dot(z, z), InnerRadius')) return 'MANDELBOX';
    if (body.includes('AmazingSurf')) return 'AMAZING_SURFACE';
    return 'GENERIC';
}

/** UNIFORM_MAP is also used in variable-renamer.ts, so it's defined there.
 *  autoMapParams() uses it, so we re-import it here to avoid circular deps.
 *  Keep it in sync with transform/variable-renamer.ts.
 */
const UNIFORM_MAP: Record<string, string> = {
    'Scale': 'uParamA', 'Offset': 'uVec3A', 'OffsetV': 'uVec3A',
    'MinRad2': 'uParamB', 'ColorIterations': 'uParamC', 'Iterations': 'uIterations',
    'Julia': '(uJuliaMode > 0.5)', 'DoJulia': '(uJuliaMode > 0.5)',
    'JuliaV': '(uJuliaMode > 0.5)', 'JuliaValues': 'uJulia', 'JuliaC': 'uJulia',
};

export function autoMapParams(doc: FragDocumentV2): ParamMappingV2[] {
    // Compute the short slot names already claimed by UNIFORM_MAP entries present in this formula.
    // V1-assigned slots that conflict with these are cleared so the second-pass auto-assigner
    // can place them in non-conflicting slots (e.g. RotVector→vec3A conflicts with Offset→vec3A).
    const reservedShortSlots = new Set<string>();
    for (const uniform of doc.uniforms) {
        const mapSlot = UNIFORM_MAP[uniform.name];
        if (!mapSlot || mapSlot.startsWith('(')) continue; // skip expression-valued entries
        // normalise 'uVec3A' → 'vec3A', 'uParamA' → 'paramA'
        if (mapSlot.startsWith('u') && mapSlot.length > 1) {
            reservedShortSlots.add(mapSlot.charAt(1).toLowerCase() + mapSlot.slice(2));
        }
    }

    const mappings: ParamMappingV2[] = [];
    for (const uniform of doc.uniforms) {
        let mappedSlot = UNIFORM_MAP[uniform.name];
        if (mappedSlot) {
            // UNIFORM_MAP maps Julia/DoJulia/JuliaV to the bool expression '(uJuliaMode > 0.5)'.
            // This is correct when the uniform IS a bool (julia toggle).
            // But some formulas (e.g. KaliBox) declare 'Julia' as a vec3 (julia coordinates).
            // In that case, redirect vec3 to the dedicated julia coords slot instead.
            if (mappedSlot === '(uJuliaMode > 0.5)' && uniform.type !== 'bool') {
                mappedSlot = uniform.type === 'vec3' ? 'uJulia' : '';
            }
            mappings.push({ name: uniform.name, type: uniform.type, mappedSlot });
        } else {
            // Bool uniforms not in UNIFORM_MAP always start unmapped so the flags packer
            // in buildWorkshopParams can group them into a shared scalar slot (bitfield).
            // Preserving individual v1 slots would give each bool its own float slider.
            if (uniform.type === 'bool') {
                mappings.push({ name: uniform.name, type: 'bool', mappedSlot: '' });
            } else {
                const v1Slot = uniform.mappedSlot;
                // Clear V1 slot if it conflicts with a UNIFORM_MAP reservation
                const v1Valid = v1Slot && v1Slot !== 'auto' && !reservedShortSlots.has(v1Slot);
                mappings.push({
                    name: uniform.name, type: uniform.type,
                    mappedSlot: v1Valid ? v1Slot : ''
                });
            }
        }
    }
    return mappings;
}

export function getAllFunctionCandidates(doc: FragDocumentV2): FunctionCandidate[] {
    const candidates: FunctionCandidate[] = [];

    if (doc.deFunction) {
        candidates.push({
            name: doc.deFunction.name,
            returnType: doc.deFunction.returnType,
            parameters: doc.deFunction.parameters,
            body: doc.deFunction.body,
            loopInfo: doc.deFunction.loopInfo,
            isAutoDetectedDE: true,
        });
    }

    for (const helper of doc.helperFunctions) {
        let loopInfo: LoopInfo | null = null;
        try {
            const helperAst = parse(helper.raw);
            const helperNode = helperAst.program.find(n => n.type === 'function') as FunctionNode | undefined;
            if (helperNode) loopInfo = extractLoopInfo(helperNode);
        } catch (_) {}

        candidates.push({
            name: helper.name,
            returnType: helper.returnType,
            parameters: helper.parameters,
            body: helper.body,
            loopInfo,
            isAutoDetectedDE: false,
        });
    }

    return candidates;
}

export function analyzeAsDE(funcName: string, doc: FragDocumentV2): DEFunctionInfo | null {
    if (doc.deFunction?.name === funcName) return doc.deFunction;

    const helper = doc.helperFunctions.find(h => h.name === funcName);
    if (!helper) return null;

    try {
        const helperAst = parse(helper.raw);
        const helperNode = helperAst.program.find(n => n.type === 'function') as FunctionNode | undefined;
        if (!helperNode) return null;

        return {
            name: funcName,
            returnType: helper.returnType,
            parameters: extractParameters(helperNode),
            body: helper.body,
            loopInfo: extractLoopInfo(helperNode),
            usedUniforms: findUsedUniforms(helperNode, doc.uniforms),
            hasOrbitTrap: hasOrbitTrapUsage(helperNode),
            distanceExpression: extractDistanceExpression(helperNode),
        };
    } catch (e) {
        console.warn(`Failed to analyze function ${funcName} as DE:`, e);
        return null;
    }
}
