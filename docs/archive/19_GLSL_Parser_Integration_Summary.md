# GLSL Parser Integration Summary

## What Was Accomplished

### 1. Installed @shaderfrog/glsl-parser
```bash
npm install @shaderfrog/glsl-parser
```

### 2. Created Proof-of-Concept (`test-glsl-parser.ts`)
The test file demonstrates:
- **Parsing** Fragmentarium formulas into AST
- **Finding** the DE function in the AST
- **Renaming** variables using AST visitors (not regex!)
- **Generating** transformed GLSL output

### Key Code Patterns

#### Parse GLSL into AST
```typescript
import { parse, generate } from '@shaderfrog/glsl-parser';
import { visit } from '@shaderfrog/glsl-parser/ast';

const ast = parse(glslSource);
```

#### Find DE Function
```typescript
for (const statement of ast.program) {
    if (statement.type === 'function') {
        const func = statement as FunctionNode;
        if (func.prototype?.header?.name?.identifier === 'DE') {
            // Found DE function
        }
    }
}
```

#### Rename Variables (Clean & Safe)
```typescript
visit(ast, {
    identifier: {
        enter(path) {
            const node = path.node as IdentifierNode;
            if (renameMap[node.identifier]) {
                node.identifier = renameMap[node.identifier];
            }
        }
    }
});
```

#### Generate Output
```typescript
const output = generate(ast);
```

## Benefits Over Regex Approach

| Aspect | Regex | AST Parser |
|--------|-------|------------|
| **Accuracy** | Fragile, breaks on edge cases | Precise, understands syntax |
| **Variable Renaming** | `z.z` → `z_local.z_local` | Correctly handles all references |
| **Loop Extraction** | Complex regex patterns | Navigate AST structure |
| **Type Safety** | None | Full TypeScript support |
| **Maintainability** | Hard to debug | Clear structure |

## Next Steps for Full Implementation

### Phase 1: Replace Current Parser
1. Create new `GenericFragmentariumParserV2.ts`
2. Use `parse()` and `generate()` from glsl-parser
3. Implement variable renaming using `visit()`
4. Extract DE function body properly

### Phase 2: Handle Loop Extraction
```typescript
// Find while loops in the AST
visit(ast, {
    while_statement: {
        enter(path) {
            const loop = path.node as WhileStatementNode;
            // Extract body from loop.body
            // Remove counter increment
            // Return clean body
        }
    }
});
```

### Phase 3: Template-Based Generation
Instead of transforming the code, generate fresh:
```typescript
const gmtFormula = `
void formula_${name}(inout vec4 z, inout float dr, inout float trap, vec4 c) {
    vec3 f_z = z.xyz;
    
    ${generate(deFunction.body)}
    
    z.w = ${extractDistanceExpression(deFunction)};
}
`;
```

## API Reference

### Parser Functions
- `parse(source: string): Program` - Parse GLSL into AST
- `generate(ast: Program): string` - Generate GLSL from AST
- `visit(ast: Program, visitors: NodeVisitors)` - Traverse AST

### Key AST Node Types
- `Program` - Root node
- `FunctionNode` - Function declarations
- `IdentifierNode` - Variable/function names
- `WhileStatementNode` - While loops
- `ForStatementNode` - For loops
- `CompoundStatementNode` - Code blocks `{ ... }`

### Built-in Utilities
The parser includes helper functions:
- `renameBinding` - Rename a variable binding
- `renameFunction` - Rename a function
- `debugScopes` - Debug scope information

## Testing the Parser

To run the proof-of-concept:
```bash
# Import the test file in your app
import { transformToGMT } from './features/fragmentarium_import/test-glsl-parser';

// Test with a formula
const result = transformToGMT(fragmentariumCode);
console.log(result);
```

## Bundle Size Impact

- `@shaderfrog/glsl-parser`: ~50KB gzipped
- Adds significant parsing power for the size
- Worth the tradeoff for robust formula import

## Recommendation

**Proceed with AST-based implementation**. The proof-of-concept shows:
1. ✅ Parser works with Fragmentarium formulas
2. ✅ Variable renaming is clean and correct
3. ✅ TypeScript support is excellent
4. ✅ Bundle size is acceptable

This approach will eliminate the regex-related bugs we've been fighting.

---

## V2 Integration Fix: UI Parameter Mappings (Feb 2026)

### Problem Identified

The V2 parser was generating valid GLSL code, but it **wasn't using the UI's parameter slot mappings**. The code was calling `autoMapParams()` instead of using the user's selected mappings from the parameter mapping UI.

**Issue:** The generated uniforms (e.g., `uParamA`, `uParamB`) might not match what the UI expected to control, leading to formulas that compile but don't respond to parameter changes.

### Solution Implemented

**File: `FormulaImporter.tsx`** (line 299-314)

Changed V2 path from:
```typescript
const mappings = GenericFragmentariumParserV2.autoMapParams(v2Doc);  // ← Wrong!
const result = GenericFragmentariumParserV2.transform(v2Doc, formulaName, mappings);
```

To:
```typescript
// Use the user-selected mappings from the UI, just like V1
const mappings: ParamMappingV2[] = params.map(p => ({
    name: p.name,
    type: p.type,
    mappedSlot: p.mappedSlot === 'fixed' ? 'fixed' : p.mappedSlot,
    fixedValue: p.mappedSlot === 'fixed' ? String(p.fixedValue) : undefined,
    isDegrees: p.isDegrees
}));
const result = GenericFragmentariumParserV2.transform(v2Doc, formulaName, mappings);
```

### Additional Fix: getDist Support

Added `getDist` to V2's `TransformedFormulaV2` interface, matching V1's output. This enables custom distance functions like GMF's `<Shader_Dist>` section.

### Bug Fixes (Feb 2026)

**1. getDist Variable Scoping Error**
- **Problem**: Generated getDist referenced `f_z` and `f_i` which are local to the formula function, not available in getDist's global scope.
- **Fix**: Map `f_z` → `z.xyz` and `f_i` → `iter` for getDist generation. The getDist function signature is `vec2 getDist(float r, float dr, float iter, vec4 z)`.

**2. min(trap, vec4()) Type Mismatch**
- **Problem**: `trap` is `float` in GMT, but Fragmentarium's `orbitTrap` is `vec4`. `min(float, vec4)` doesn't exist in GLSL.
- **Fix**: Transform to `min(trap, length(vec4(...)))` to convert vec4 to float.

**3. UI Parameter Mappings (Original Fix)**
- **Problem**: V2 used `autoMapParams()` instead of user-selected slot mappings.
- **Fix**: Changed to use `params` state from the UI like V1 does.

### AST vs Regex - Lesson Learned

**Initial Approach (Failed):**
Used regex to fix `min(trap, vec4(...))` type mismatches:
```typescript
loopBody.replace(/trap\s*=\s*min\s*\(.../)  // Fragile, doesn't work reliably
```

**Correct Approach:**
Use AST visitors to find and transform the pattern:
```typescript
visit(ast, {
    binary: {
        enter(path) {
            // Check for assignment: trap = min(..., vec4(...))
            // Transform by wrapping vec4 with length()
        }
    }
})
```

**Key Insight:** The whole point of using `@shaderfrog/glsl-parser` was to AVOID regex hell. When we fell back to regex for type transformations, we recreated the same problems we were trying to solve. The AST approach properly understands the code structure and handles edge cases (parentheses, nesting, different contexts) that regex cannot reliably match.
