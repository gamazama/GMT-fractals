/**
 * Transforms Fragmentarium orbitTrap vec4 patterns to GMT-style float trap.
 */

export function transformTrapMinWithAST(loopBody: string): string {
    try {
        const inner = `(?:[^()]|\\([^()]*\\))*`;

        // Pattern A: trap = min(trap, abs(vec{234}( INNER )))
        loopBody = loopBody.replace(
            new RegExp(`trap\\s*=\\s*min\\s*\\(\\s*trap\\s*,\\s*abs\\s*\\(\\s*(vec[234]\\s*\\(${inner}\\))\\s*\\)\\s*\\)`, 'g'),
            (_m, v) => `trap = min(trap, length(${v}))`
        );

        // Pattern B: trap = min(trap, (vec{234}( INNER )))
        loopBody = loopBody.replace(
            new RegExp(`trap\\s*=\\s*min\\s*\\(\\s*trap\\s*,\\s*\\(\\s*(vec[234]\\s*\\(${inner}\\))\\s*\\)\\s*\\)`, 'g'),
            (_m, v) => `trap = min(trap, length(${v}))`
        );

        // Pattern C: trap = min(trap, vec{234}( INNER ))
        loopBody = loopBody.replace(
            new RegExp(`trap\\s*=\\s*min\\s*\\(\\s*trap\\s*,\\s*(vec[234]\\s*\\(${inner}\\))\\s*\\)`, 'g'),
            (_m, v) => `trap = min(trap, length(${v}))`
        );

        // Pattern D: trap = min(trap, abs(EXPR)) where EXPR is a vector
        loopBody = loopBody.replace(
            /trap\s*=\s*min\s*\(\s*trap\s*,\s*abs\s*\(([^)]+)\)\s*\)/g,
            (_m, expr) => {
                if (/\.xyz|\.xyzw|\bf_z\b/.test(expr)) {
                    return `trap = min(trap, length(abs(${expr})))`;
                }
                return _m;
            }
        );

        return loopBody;
    } catch (e) {
        console.warn('Trap transformation failed:', e);
        return loopBody;
    }
}
