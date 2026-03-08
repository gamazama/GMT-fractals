/**
 * Pattern detection for Fragmentarium formula types.
 * Detects the max-accumulator pattern (NewMenger-style) for special handling.
 */

export function detectAndApplyAccumulatorPattern(opts: {
    distVar: string;
    preLoopDecls: string;
    loopBody: string;
}): {
    isAccumulator: boolean;
    loopInit?: string;
    newPreLoopDecls?: string;
    newLoopBody?: string;
} {
    const { distVar, preLoopDecls, loopBody } = opts;

    if (!/^[a-zA-Z_]\w*$/.test(distVar)) return { isAccumulator: false };

    const maxAccumRx = new RegExp(`\\b${distVar}\\s*=\\s*max\\s*\\(\\s*${distVar}\\b`);
    if (!maxAccumRx.test(loopBody)) return { isAccumulator: false };

    const distDeclRx = new RegExp(`float\\s+${distVar}\\s*=\\s*([^;]+);`);
    if (!distDeclRx.test(preLoopDecls)) return { isAccumulator: false };

    let scaleVar: string | null = null;
    const scaleInitRx = /float\s+(\w+)\s*=\s*1(?:\.0*)?\s*;/;
    const scaleInitMatch = preLoopDecls.match(scaleInitRx);
    if (scaleInitMatch) {
        const candidate = scaleInitMatch[1];
        if (candidate !== distVar && new RegExp(`\\b${candidate}\\s*\\*=`).test(loopBody)) {
            scaleVar = candidate;
        }
    }

    const stmts = preLoopDecls.split(';').map(s => s.trim()).filter(s => s.length > 0);
    const loopInitLines: string[] = [];
    const bareDecls: string[] = [];

    for (const stmt of stmts) {
        if (/^f_z\s*=/.test(stmt)) {
            loopInitLines.push(stmt.replace(/\bf_z\b/g, 'z.xyz') + ';');
            continue;
        }
        if (new RegExp(`^float\\s+${distVar}\\s*=`).test(stmt)) {
            const expr = stmt.replace(new RegExp(`^float\\s+${distVar}\\s*=\\s*`), '');
            loopInitLines.push(`dr = ${expr};`);
            continue;
        }
        if (scaleVar && new RegExp(`^float\\s+${scaleVar}\\s*=`).test(stmt)) {
            const expr = stmt.replace(new RegExp(`^float\\s+${scaleVar}\\s*=\\s*`), '');
            loopInitLines.push(`z.w = ${expr};`);
            continue;
        }
        const declMatch = stmt.match(/^(\w+)\s+(\w+)\s*=/);
        if (declMatch) {
            loopInitLines.push(stmt + ';');
            const [, typeStr, varName] = declMatch;
            if (new RegExp(`\\b${varName}\\b`).test(loopBody)) {
                const bareDecl = typeStr === 'int' ? `${stmt};` : `${typeStr} ${varName};`;
                bareDecls.push(bareDecl);
            }
            continue;
        }
        const bareDeclMatch = stmt.match(/^(\w+)\s+(\w+)\s*$/);
        if (bareDeclMatch) {
            const [, typeStr, varName] = bareDeclMatch;
            if (new RegExp(`\\b${varName}\\b`).test(loopBody)) {
                bareDecls.push(`${typeStr} ${varName};`);
            }
            continue;
        }
        loopInitLines.push(stmt + ';');
    }

    const loopInitStr = loopInitLines.join('\n').replace(/\bf_z\b/g, 'z.xyz');

    let newLoopBody = loopBody.replace(new RegExp(`\\b${distVar}\\b`, 'g'), 'dr');
    if (scaleVar) {
        newLoopBody = newLoopBody.replace(new RegExp(`\\b${scaleVar}\\b`, 'g'), 'z.w');
    }

    return {
        isAccumulator: true,
        loopInit: loopInitStr,
        newPreLoopDecls: bareDecls.join('\n'),
        newLoopBody,
    };
}
