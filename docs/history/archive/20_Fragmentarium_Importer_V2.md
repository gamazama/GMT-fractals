# Fragmentarium Importer V2 - Implementation Documentation

> **⚠️ Current Status (2026-03-05):** Testing revealed 0% success rate on the reference .frag files. Root cause identified and documented. **Read `docs/21_Frag_Importer_Current_Status.md` before doing any work on this system.** The V2 parser is architecturally sound but has two blocking bugs: (1) computed uniforms referenced in loop body after being stripped, and (2) `#include`-sourced helper functions (`rotationMatrix3` etc.) called but undefined. This doc covers the architecture; the status doc covers what's broken and how to fix it.

## Overview

Fragmentarium Importer V2 is a complete rewrite of the formula transformation system using AST-based parsing via `@shaderfrog/glsl-parser`. This approach eliminates the regex-related bugs that plagued the v1 implementation and provides a robust, maintainable foundation for importing Fragmentarium formulas.

## Key Improvements Over V1

| Aspect | V1 (Regex) | V2 (AST) |
|--------|------------|----------|
| Variable Renaming | `z.z` → `z_local.z_local` bug | Precise AST-based renaming |
| Loop Extraction | Complex regex patterns | AST structure navigation |
| Helper Functions | Limited transformation | Full AST transformation |
| Type Safety | None | Full TypeScript support |
| Maintainability | Hard to debug | Clear, structured code |
| Extensibility | Difficult | Easy to add new patterns |

## Architecture

```
Fragmentarium Source (GLSL)
           ↓
    [Parser] - @shaderfrog/glsl-parser
           ↓
    AST (Abstract Syntax Tree)
           ↓
    [Analyzer]
    - Extract DE function
    - Find uniforms
    - Detect loops
    - Identify helpers
           ↓
    FragDocumentV2
           ↓
    [Transformer]
    - Rename variables (f_ prefix)
    - Extract loop body
    - Transform helpers
           ↓
    GMT Formula (GLSL)
```

## Core Components

### 1. Parser (`GenericFragmentariumParserV2.parse`)

Parses Fragmentarium GLSL source into a structured `FragDocumentV2`:

```typescript
const doc = GenericFragmentariumParserV2.parse(source);
```

**Extracted Information:**
- `uniforms`: All uniform declarations with types and defaults
- `presets`: Global variable declarations with default values
- `deFunction`: The DE function details
  - Parameters (usually `vec3 z`)
  - Loop information (type, condition, body)
  - Used uniforms
  - Distance expression
  - Orbit trap usage
- `helperFunctions`: All non-DE functions (boxFold, sphereFold, etc.)
- `includes`: #include directives

### 2. Variable Renaming Strategy

Uses the `f_` prefix pattern for all formula-local variables:

```glsl
// Fragmentarium input
float DE(vec3 z) {
    int n = 0;
    while (n < Iterations) {
        z = abs(z);
        n++;
    }
    return length(z);
}

// After AST transformation
vec3 f_z = z.xyz;  // Parameter renamed

// Loop body
f_z = abs(f_z);    // All references updated
// n++ removed (counter not needed in GMT)

z.w = length(f_z); // Distance output
```

**Key Benefits:**
- No conflicts with GMT's built-in `z` variable
- Simple, consistent naming scheme
- AST-based renaming is precise (no `z.z` → `z_local.z_local` bug)

### 3. Uniform Mapping

Automatic mapping of Fragmentarium uniforms to GMT slots:

```typescript
const UNIFORM_MAP: Record<string, string> = {
    'Scale': 'uParamA',
    'Offset': 'uVec3A',
    'OffsetV': 'uVec3A',
    'MinRad2': 'uParamB',
    'ColorIterations': 'uParamC',
    'Iterations': 'uIterations',
    'Julia': 'uJulia',
    'JuliaV': 'uJulia',
};
```

Unmapped uniforms get auto-generated names: `u_{uniformName}`

### 4. Loop Extraction

Extracts iteration body from while/for loops:

```glsl
// Input
int n = 0;
while (n < Iterations) {
    z = abs(z);
    orbitTrap = min(orbitTrap, vec4(abs(z)));
    n++;
}

// Extracted body
z = abs(z);
orbitTrap = min(orbitTrap, vec4(abs(z)));
// Note: n++ is automatically removed
```

### 5. Code Generation

Uses template-based generation:

```glsl
void formula_{NAME}(inout vec4 z, inout float dr, inout float trap, vec4 c) {
    vec3 f_z = z.xyz;
    
    // Init code (orbit trap, etc.)
    
    // Loop body (transformed)
    
    z.w = {distanceExpression};
}
```

## Usage Examples

### Basic Parsing

```typescript
import { GenericFragmentariumParserV2 } from './features/fragmentarium_import';

const source = `
uniform float Scale;
uniform int Iterations;

float DE(vec3 z) {
    int n = 0;
    while (n < Iterations) {
        z = abs(z) * Scale;
        n++;
    }
    return length(z);
}
`;

const doc = GenericFragmentariumParserV2.parse(source);
console.log(doc.uniforms);     // [{ name: 'Scale', type: 'float', ... }]
console.log(doc.deFunction);   // DE function info
```

### Pattern Detection

```typescript
const pattern = GenericFragmentariumParserV2.detectPattern(doc);
// Returns: 'MENGER' | 'MANDELBOX' | 'AMAZING_SURFACE' | 'GENERIC'
```

### Auto Parameter Mapping

```typescript
const mappings = GenericFragmentariumParserV2.autoMapParams(doc);
// [
//   { name: 'Scale', type: 'float', mappedSlot: 'uParamA' },
//   { name: 'Iterations', type: 'int', mappedSlot: 'uIterations' }
// ]
```

### Formula Transformation

```typescript
const result = GenericFragmentariumParserV2.transform(doc, 'MyFormula', mappings);

console.log(result.function);  // Generated formula_ function
console.log(result.uniforms);  // Uniform declarations
console.log(result.loopBody);  // Extracted loop body
console.log(result.warnings);  // Any transformation warnings
```

## Testing

Run the test suite:

```typescript
import { runV2ParserTests } from './features/fragmentarium_import/test-v2-parser';

runV2ParserTests();
```

Tests cover:
- Menger formula parsing
- Mandelbox formula with helpers
- Pattern detection
- Auto parameter mapping
- Formula transformation
- Variable renaming
- providesColor detection

## Migration from V1

### API Compatibility

V2 maintains similar static method signatures:

| V1 Method | V2 Method | Notes |
|-----------|-----------|-------|
| `GenericFragmentariumParser.parse()` | `GenericFragmentariumParserV2.parse()` | Returns `FragDocumentV2` |
| `GenericFragmentariumParser.transform()` | `GenericFragmentariumParserV2.transform()` | Returns `TransformedFormulaV2` |
| `GenericFragmentariumParser.detectPattern()` | `GenericFragmentariumParserV2.detectPattern()` | Same patterns |
| `GenericFragmentariumParser.autoMapParams()` | `GenericFragmentariumParserV2.autoMapParams()` | Returns `ParamMappingV2[]` |
| `GenericFragmentariumParser.hasProvidesColor()` | `GenericFragmentariumParserV2.hasProvidesColor()` | Same implementation |
| `GenericFragmentariumParser.hasDEFunction()` | `GenericFragmentariumParserV2.hasDEFunction()` | Uses AST |

### Type Differences

```typescript
// V1
import { GenericFragDocument, ParamMapping, TransformedFormula } from './GenericFragmentariumParser';

// V2
import { FragDocumentV2, ParamMappingV2, TransformedFormulaV2 } from './GenericFragmentariumParserV2';
```

### Integration Example

```typescript
// In FormulaImporter.tsx or similar
import { GenericFragmentariumParserV2 } from './GenericFragmentariumParserV2';

// Feature flag for gradual migration
const USE_V2_PARSER = true;

function parseFormula(source: string) {
    if (USE_V2_PARSER) {
        return GenericFragmentariumParserV2.parse(source);
    } else {
        return GenericFragmentariumParser.parse(source);
    }
}
```

## File Structure

```
features/fragmentarium_import/
├── index.ts                          # Exports both v1 and v2
├── FragmentariumParser.ts            # Original parser (v1)
├── GenericFragmentariumParser.ts     # Generic parser (v1)
├── GenericFragmentariumParserV2.ts   # NEW: AST-based parser (v2)
├── FormulaImporter.tsx               # UI component
├── test-glsl-parser.ts               # Proof-of-concept
└── test-v2-parser.ts                 # V2 test suite
```

## Known Limitations

1. **providesColor formulas**: Not supported (same as v1)
2. **Complex macros**: #define with parameters may need manual handling
3. **Multiple DE functions**: Only the first DE function is extracted
4. **External includes**: #include files are listed but not resolved

## Future Enhancements

- [ ] Support for providesColor formulas
- [ ] #include resolution
- [ ] Preset value extraction
- [ ] More sophisticated pattern detection
- [ ] Automatic helper function library matching

## Technical Details

### AST Visitor Pattern

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

### Error Handling

V2 provides better error messages:

```typescript
try {
    const doc = GenericFragmentariumParserV2.parse(source);
} catch (error) {
    // Get specific parse errors from glsl-parser
    console.error('Parse failed:', error.message);
}
```

### Performance

- Parsing: ~1-2ms for typical formulas
- AST manipulation: ~0.5-1ms
- Generation: ~0.5ms
- Total: ~2-4ms per formula (acceptable for import operations)

## Dependencies

- `@shaderfrog/glsl-parser`: GLSL parsing and AST manipulation
- TypeScript for type safety

## References

- [GLSL Parser Documentation](https://github.com/shaderfrog/glsl-parser)
- [Fragmentarium Examples Analysis](./14_Fragmentarium_Examples_Analysis.md)
- [Fragmentarium Importer Redesign](./16_Fragmentarium_Importer_Redesign.md)
- [GLSL Parser Integration Summary](./19_GLSL_Parser_Integration_Summary.md)