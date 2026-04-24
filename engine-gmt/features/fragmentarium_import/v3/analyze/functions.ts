/**
 * V3 Function extraction and DE detection.
 *
 * Uses @shaderfrog/glsl-parser AST to extract all functions from preprocessed
 * GLSL source. Tags functions as auto-detected DE candidates, extracts loop
 * info, orbit trap usage, distance expressions, and used parameters.
 */

import { parse, generate } from '@shaderfrog/glsl-parser';
import { visit } from '@shaderfrog/glsl-parser/ast';
import type {
    Program,
    FunctionNode,
    IdentifierNode,
    WhileStatementNode,
    ForStatementNode,
    ReturnStatementNode,
} from '@shaderfrog/glsl-parser/ast';
import type { FunctionAnalysis, FunctionParameter, LoopAnalysis, ImportedParam } from '../types';

// ============================================================================
// DE detection heuristics
// ============================================================================

/** Standard Fragmentarium DE function names — searched first to avoid false positives. */
const FRAG_DE_NAMES = new Set(['DE', 'dist']);

/** All recognized DE function names (including DEC/Shadertoy conventions). */
const ALL_DE_NAMES = new Set(['DE', 'dist', 'de', 'sdf', 'map']);

// ============================================================================
// AST extraction helpers
// ============================================================================

function getFunctionName(func: FunctionNode): string {
    return func.prototype?.header?.name?.identifier || 'unknown';
}

function getReturnType(func: FunctionNode): string {
    try {
        return generate(func.prototype?.header?.returnType?.specifier || { type: 'void' } as any);
    } catch {
        return 'void';
    }
}

function extractParameters(func: FunctionNode): FunctionParameter[] {
    const params: FunctionParameter[] = [];
    if (func.prototype?.parameters) {
        for (const param of func.prototype.parameters) {
            const p = param as any;
            params.push({
                name: p.identifier?.identifier || 'unknown',
                type: generate(p.specifier),
                qualifier: p.qualifier,
            });
        }
    }
    return params;
}

function extractLoopInfo(func: FunctionNode): LoopAnalysis | null {
    const whileLoops: Array<{ condition: string; body: string }> = [];
    const forLoops: Array<{ init: string | null; condition: string; body: string; increment: string | null }> = [];

    visit(func, {
        while_statement: {
            enter(path) {
                const loop = path.node as WhileStatementNode;
                whileLoops.push({ condition: generate(loop.condition), body: generate(loop.body) });
            },
        },
        for_statement: {
            enter(path) {
                const loop = path.node as ForStatementNode;
                forLoops.push({
                    init: loop.init ? generate(loop.init) : null,
                    condition: loop.condition ? generate(loop.condition) : '',
                    body: generate(loop.body),
                    increment: (loop as any).operation ? generate((loop as any).operation) : null,
                });
            },
        },
    });

    if (whileLoops.length > 0) {
        const wl = whileLoops[0];
        const counterMatch = wl.condition.match(/(\w+)\s*<[\s\S]+/);
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
            increment: null,
            hasBreak: wl.body.includes('break'),
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
            increment: fl.increment,
            hasBreak: fl.body.includes('break'),
        };
    }

    return null;
}

function extractDistanceExpression(func: FunctionNode): string | null {
    let distExpr: string | null = null;
    visit(func, {
        return_statement: {
            enter(path) {
                const ret = path.node as ReturnStatementNode;
                if (ret.expression) distExpr = generate(ret.expression);
            },
        },
    });
    return distExpr;
}

function hasOrbitTrapUsage(func: FunctionNode): boolean {
    let found = false;
    visit(func, {
        identifier: {
            enter(path) {
                if ((path.node as IdentifierNode).identifier === 'orbitTrap') found = true;
            },
        },
    });
    return found;
}

function findUsedParamNames(func: FunctionNode, paramNames: Set<string>): string[] {
    const used = new Set<string>();
    visit(func, {
        identifier: {
            enter(path) {
                const name = (path.node as IdentifierNode).identifier;
                if (paramNames.has(name)) used.add(name);
            },
        },
    });
    return Array.from(used);
}

// ============================================================================
// Main extraction
// ============================================================================

/**
 * Extract all functions from preprocessed GLSL source.
 * Returns FunctionAnalysis[] with DE candidates tagged.
 * The `init` function is excluded — it's handled separately by init.ts.
 */
export function extractFunctions(
    cleanedSource: string,
    paramNames: Set<string>,
): FunctionAnalysis[] {
    const ast = parse(cleanedSource, { quiet: true });
    const results: FunctionAnalysis[] = [];

    // Find DE function: prefer standard Frag names first, then DEC/Shadertoy names
    let deFuncNode: FunctionNode | null = null;
    for (const stmt of ast.program) {
        if (stmt.type !== 'function') continue;
        const name = getFunctionName(stmt as FunctionNode);
        if (FRAG_DE_NAMES.has(name)) { deFuncNode = stmt as FunctionNode; break; }
    }
    if (!deFuncNode) {
        for (const stmt of ast.program) {
            if (stmt.type !== 'function') continue;
            const name = getFunctionName(stmt as FunctionNode);
            if (ALL_DE_NAMES.has(name)) { deFuncNode = stmt as FunctionNode; break; }
        }
    }

    const deName = deFuncNode ? getFunctionName(deFuncNode) : null;

    // Extract all non-init functions
    for (const stmt of ast.program) {
        if (stmt.type !== 'function') continue;
        const func = stmt as FunctionNode;
        const name = getFunctionName(func);
        if (name === 'init') continue;

        const isDE = name === deName;

        // For helper functions, extract loop info by re-parsing
        let loop: LoopAnalysis | null = null;
        if (isDE) {
            loop = extractLoopInfo(func);
        } else {
            try {
                const raw = generate(func);
                const helperAst = parse(raw, { quiet: true });
                const helperNode = helperAst.program.find(n => n.type === 'function') as FunctionNode | undefined;
                if (helperNode) loop = extractLoopInfo(helperNode);
            } catch { /* loop stays null */ }
        }

        results.push({
            name,
            returnType: getReturnType(func),
            parameters: extractParameters(func),
            body: generate(func.body),
            raw: generate(func),
            loop,
            usedParams: findUsedParamNames(func, paramNames),
            hasOrbitTrap: hasOrbitTrapUsage(func),
            distanceExpression: isDE ? extractDistanceExpression(func) : null,
            isAutoDetectedDE: isDE,
        });
    }

    return results;
}

/**
 * Extract the init() function body from preprocessed source.
 * Returns null if no init() function found.
 */
export function extractInitFunction(cleanedSource: string): { body: string; raw: string } | null {
    let ast: Program;
    try {
        ast = parse(cleanedSource, { quiet: true });
    } catch {
        return null;
    }

    for (const stmt of ast.program) {
        if (stmt.type !== 'function') continue;
        const func = stmt as FunctionNode;
        if (getFunctionName(func) === 'init') {
            return { body: generate(func.body), raw: generate(func) };
        }
    }
    return null;
}
