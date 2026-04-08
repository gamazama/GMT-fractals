# Formula Workshop: Split-Screen Architecture & Importer Refactor

## Overview

The Formula Workshop is GMT's tool for importing GLSL from Fragmentarium, Shadertoy, blog posts, or hand-written code and transforming it into a formula compatible with GMT's engine. The current implementation is a fullscreen modal that blocks the viewport. This plan converts it to a split-screen layout and refactors the large parser files into manageable utilities.

## Part 1: Split-Screen Workshop

### Problem
- The Workshop is a `fixed inset-0 z-50 bg-black/80` modal that hides the viewport
- The fast-compile on open is wasted because the user can't see the fractal
- No live preview cycle — users must import and close to see results
- The CodeMirror editor shows the raw *input* GLSL, but the real value is the *transformed* output

### Design

**Layout**: The Workshop splits the screen horizontally — Workshop panel on the left (~50%), live viewport on the right (~50%). No backdrop blur. The fractal renders and updates in real-time.

```
┌─────────────────────────────┬─────────────────────────────┐
│  FORMULA WORKSHOP           │                             │
│                             │                             │
│  [Source Input]  (collapse)  │      LIVE VIEWPORT          │
│  ┌─────────────────────┐    │                             │
│  │ // paste GLSL here  │    │   (fractal renders here     │
│  │                     │    │    with fast-compile mode)   │
│  └─────────────────────┘    │                             │
│  [Detect Functions ▶]       │                             │
│                             │                             │
│  [Function Selection]       │                             │
│  [Param Mapping Table]      │                             │
│                             │                             │
│  TRANSFORMED OUTPUT (editor)│                             │
│  ┌─────────────────────┐    │                             │
│  │ void formula_X(...) │    │                             │
│  │ {                   │    │                             │
│  │   // GMT-ready code │    │                             │
│  └─────────────────────┘    │                             │
│                             │                             │
│  [Preview ▶]  [Import]      │                             │
└─────────────────────────────┴─────────────────────────────┘
```

### Key Behaviors

1. **Source Input** — collapsible section at top. User pastes/loads GLSL. After detection, it collapses to save space (expandable via toggle).

2. **Transformed Output** — the primary code editor (CodeMirror). Shows the `formula_X()` function that GMT will actually inject. **Editable** — the user can hand-fix issues the auto-transform missed. This is where the GlslEditor component lives.

3. **Preview Button** — registers a temporary formula (e.g., `_workshop_preview`) in FractalRegistry, calls `setFormula('_workshop_preview')`, triggers a fast compile. The viewport updates immediately. No modal blocking the view.

4. **Import Button** — finalizes: renames from `_workshop_preview` to the user's chosen name, closes the Workshop, restores engine state.

5. **Cancel** — unregisters `_workshop_preview`, restores previous formula and engine state.

### Implementation

**File: `features/fragmentarium_import/FormulaImporter.tsx`**

Convert the outer container from fullscreen modal to split-screen:

```tsx
// BEFORE (modal):
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
  <div className="w-full max-w-4xl max-h-[90vh] ...">

// AFTER (split-screen):
<div className="fixed inset-0 z-50 flex">
  {/* Workshop panel — left half */}
  <div className="w-1/2 bg-gray-900 border-r border-white/10 flex flex-col overflow-hidden">
    ...workshop content...
  </div>
  {/* Viewport — right half (transparent, lets the WebGL canvas show through) */}
  <div className="w-1/2" />
</div>
```

The right half is transparent — the existing WebGL canvas renders behind the z-50 overlay. The left half has the solid Workshop panel.

**Note**: The existing canvas renders at full viewport size but is partially obscured by the Workshop panel. This means the fractal is visible but rendered at full res. An optimization (later) would be to resize the canvas to half-width, but for now the simple overlay approach works.

**Preview workflow**:
```typescript
const PREVIEW_ID = '_workshop_preview';

const handlePreview = () => {
    // Generate the transformed code from current state
    const result = generateTransformedCode(); // extracted from handleImport logic
    if (!result) return;

    const { uiParams, defaultPreset } = buildFractalParams(mappings, PREVIEW_ID);

    const previewDef: FractalDefinition = {
        id: PREVIEW_ID as any,
        name: 'Workshop Preview',
        shader: {
            function: (result.uniforms ? result.uniforms + '\n\n' : '') + result.function,
            loopBody: result.loopBody,
            getDist: result.getDist,
            loopInit: result.loopInit,
        },
        parameters: uiParams,
        defaultPreset,
    };

    registry.register(previewDef);
    setFormula(PREVIEW_ID as any);
};
```

**Restore on close**:
```typescript
const previousFormula = useRef<string>('');

useEffect(() => {
    previousFormula.current = store.formula;
    return () => {
        // Clean up preview formula on unmount
        // registry doesn't have unregister, but re-registering on next open is fine
    };
}, []);

const handleClose = () => {
    // Restore previous formula if currently showing preview
    if (store.formula === PREVIEW_ID) {
        setFormula(previousFormula.current as any, { skipDefaultPreset: true });
    }
    onClose();
};
```

### Section Layout (within Workshop panel)

The Workshop panel content follows this vertical flow:

```
┌─ Header (title + close button) ─────────────────┐
├─ Source Input (collapsible after detection) ──────┤
│  GlslEditor (raw GLSL input)                     │
│  [Load File] [Detect ▶]                          │
├─ Function Selection ─────────────────────────────┤
│  Dropdown + loop mode toggle                     │
├─ Param Mapping ──────────────────────────────────┤
│  Compact table                                   │
├─ Transformed Output (main editor) ───────────────┤
│  GlslEditor (transformed, editable)              │
│  Shows the actual formula_X() that GMT injects   │
├─ Warnings ───────────────────────────────────────┤
├─ Footer ─────────────────────────────────────────┤
│  [Cancel] [Preview ▶] [Import]                   │
└──────────────────────────────────────────────────┘
```

After detection, the Source Input section collapses to a single line showing the filename/source summary. Click to expand.

The Transformed Output section uses a second GlslEditor instance (with `readOnly={false}`) showing the generated `formula_X()` function. This is auto-generated when:
- The user changes function selection
- The user changes param mappings
- The user clicks "Detect"

If the user edits the transformed code manually, a flag is set so auto-generation doesn't overwrite their edits (until they re-detect or change function selection).

### Interaction with Engine Preview Mode

The engine preview mode (Task 1 from previous plan, already implemented) automatically applies `ENGINE_PROFILES.fastest` on Workshop open and restores on close. This reduces compile time for each Preview click to ~3-5s.

---

## Part 2: Importer Codebase Refactor

### Current State

| File | Lines | Responsibility |
|------|-------|----------------|
| `GenericFragmentariumParserV2.ts` | 1682 | AST parsing, function detection, loop extraction, variable renaming, code generation, uniform mapping, pattern detection, accumulator detection, template rendering |
| `FormulaImporter.tsx` | 809 | UI component + all business logic (detection, preview generation, import, param building, slot mapping) |
| `GenericFragmentariumParser.ts` | 731 | V1 regex parser (uniform/slider extraction) |
| `FragmentariumParser.ts` | 494 | Legacy parser (type definitions + regex parsing) |
| `FragmentariumBuiltins.ts` | 113 | Built-in include snippets |
| `test-v2-parser.ts` | 375 | Test file |
| `test-glsl-parser.ts` | 148 | Test file |
| `index.ts` | 14 | Feature definition |

**Total**: 4366 lines in 8 files, with the two largest files (V2 parser at 1682 and UI at 809) doing too much.

### Target Structure

```
features/fragmentarium_import/
├── index.ts                          # Feature definition (unchanged)
├── FormulaWorkshop.tsx               # Split-screen UI component (renamed from FormulaImporter)
│
├── types.ts                          # All shared types (FragUniform, FragPreset, FragDocumentV2, etc.)
│
├── parsers/
│   ├── preprocessor.ts              # preprocessFragmentariumSource(), computed globals, global decls
│   ├── uniform-parser.ts            # V1 slider/uniform extraction (from GenericFragmentariumParser)
│   ├── ast-parser.ts                # AST-based parsing: parse(), findDEFunction, findHelperFunctions,
│   │                                # findInitFunction, extractParameters, extractLoopInfo, etc.
│   └── builtins.ts                  # Built-in include snippets (renamed from FragmentariumBuiltins)
│
├── transform/
│   ├── variable-renamer.ts          # renameVariables(), buildDERenameMap(), slotToUniform()
│   ├── code-generator.ts           # generateFormulaCode(), FORMULA_TEMPLATE, generateUniformDeclarations()
│   ├── pattern-detector.ts          # detectPattern(), detectAndApplyAccumulatorPattern()
│   ├── loop-extractor.ts            # Loop body extraction, trap transform, distance expression extraction
│   └── init-generator.ts            # generateInitCode(), extractPreLoopDeclarations()
│
├── workshop/
│   ├── param-builder.ts             # buildWorkshopParams(), buildFractalParams(), slot helpers
│   ├── detection.ts                 # runDetect logic (extracted from component)
│   └── preview.ts                   # Preview formula registration, temp formula management
│
└── tests/
    ├── test-v2-parser.ts            # (moved from root)
    └── test-glsl-parser.ts          # (moved from root)
```

### File Decomposition Details

#### `types.ts` (~120 lines)
Extract from `FragmentariumParser.ts` and `GenericFragmentariumParserV2.ts`:
- `FragUniform`, `FragPreset`, `FragDocument`, `FragGlobalVar`, `FragFunction`
- `FragDocumentV2`, `DEFunctionInfo`, `FunctionParameter`, `HelperFunctionInfo`, `LoopInfo`
- `InitFunctionInfo`, `ComputedGlobal`, `GlobalDecl`
- `ParamMappingV2`, `TransformedFormulaV2`, `FunctionCandidate`
- `WorkshopParam`, `WorkshopDetection` (from FormulaImporter.tsx)

#### `parsers/preprocessor.ts` (~120 lines)
Extract from `GenericFragmentariumParserV2.ts`:
- `preprocessFragmentariumSource()` (line 292-356)
- `extractComputedGlobals()` (line 235-265)
- `extractGlobalDeclarations()` (line 266-291)

#### `parsers/uniform-parser.ts` (~350 lines)
Extract from `GenericFragmentariumParser.ts`:
- The V1 regex-based uniform/slider/preset extraction
- `findUniforms()`, `findPresets()`, `findIncludes()` from V2 (fallback paths)
- `hasProvidesColor()`, `hasDEFunction()`

#### `parsers/ast-parser.ts` (~300 lines)
Extract from `GenericFragmentariumParserV2.ts`:
- `parse()` orchestration (the main `GenericFragmentariumParserV2.parse()` static method)
- `findDEFunction()` (line 155)
- `findHelperFunctions()` (line 171)
- `findInitFunction()` (line 190)
- `extractParameters()` (line 210)
- `extractLoopInfo()` (line 482)
- `extractDistanceExpression()` (line 727)
- `hasOrbitTrapUsage()` (line 747)
- `findUsedUniforms()` (line 767)
- `getAllFunctionCandidates()` (static, line 1600)
- `analyzeAsDE()` (static, line 1647)

#### `transform/variable-renamer.ts` (~100 lines)
- `renameVariables()` (line 565)
- `buildDERenameMap()` (line 598)
- `slotToUniform()` (line 593)
- `applyRenameToExpression()` (line 1276)

#### `transform/code-generator.ts` (~300 lines)
- `generateFormulaCode()` (line 928-1210) — the main transform function
- `FORMULA_TEMPLATE` (line 789)
- `generateUniformDeclarations()` (line 1237)
- `formatGLSLLiteral()` (line 1212)

#### `transform/pattern-detector.ts` (~200 lines)
- `detectPattern()` (static, line 1537)
- `detectAndApplyAccumulatorPattern()` (line 817-927)

#### `transform/loop-extractor.ts` (~80 lines)
- `transformTrapMinWithAST()` (line 662)
- Related loop body processing from within `generateFormulaCode`

#### `transform/init-generator.ts` (~80 lines)
- `generateInitCode()` (line 1296)
- `extractPreLoopDeclarations()` (line 1362)

#### `workshop/param-builder.ts` (~130 lines)
Extract from `FormulaImporter.tsx`:
- `slotOptionsForType()` (line 68)
- `slotLabel()` (line 79)
- `defaultRangeForUniform()` (line 88)
- `autoSlotForUniform()` (line 110)
- `buildWorkshopParams()` (line 130)
- `buildFractalParams()` (line 191)
- Slot constants: `SCALAR_SLOTS`, `VEC2_SLOTS`, `VEC3_SLOTS`

#### `workshop/detection.ts` (~80 lines)
Extract the `runDetect` logic from `FormulaImporter.tsx` into a pure function:
```typescript
export function detectFormula(source: string, fileBaseName?: string): {
    detection: WorkshopDetection;
    suggestedName: string;
    mappings: WorkshopParam[];
} | { error: string }
```

#### `workshop/preview.ts` (~50 lines)
```typescript
export const PREVIEW_FORMULA_ID = '_workshop_preview';

export function registerPreviewFormula(
    result: TransformedFormulaV2,
    mappings: WorkshopParam[],
): FractalDefinition

export function generateTransformedCode(
    detected: WorkshopDetection,
    selectedFunctionName: string,
    loopMode: 'loop' | 'single',
    formulaName: string,
    mappings: WorkshopParam[],
): TransformedFormulaV2 | null
```

#### `FormulaWorkshop.tsx` (~350 lines, down from 809)
After extracting all business logic to utility modules, the component becomes a pure UI orchestrator:
- State management (useState/useRef)
- Engine preview mode (useEffect)
- Event handlers that call imported utilities
- JSX rendering (split-screen layout)

### Public API

After refactoring, the main entry points consumed by outside code are:

```typescript
// From types.ts
import type { FragDocumentV2, WorkshopParam, TransformedFormulaV2 } from './types';

// From parsers/ast-parser.ts
import { parseFragmentariumSource } from './parsers/ast-parser';

// From transform/code-generator.ts
import { transformToFormula } from './transform/code-generator';

// From workshop/param-builder.ts
import { buildWorkshopParams, buildFractalParams } from './workshop/param-builder';

// From the component
import { FormulaWorkshop } from './FormulaWorkshop';
```

The `GenericFragmentariumParserV2` class is dissolved — its static methods become standalone functions in the appropriate modules. No class needed when every method is static.

### Legacy File Handling

- `FragmentariumParser.ts` — types move to `types.ts`, parsing logic moves to `parsers/uniform-parser.ts`. Delete the original.
- `GenericFragmentariumParser.ts` — V1 parser logic moves to `parsers/uniform-parser.ts`. Delete the original.
- `GenericFragmentariumParserV2.ts` — dissolved into `parsers/` and `transform/` modules. Delete the original.
- `FragmentariumBuiltins.ts` — renamed to `parsers/builtins.ts`.

### Migration Strategy

The refactor can be done in phases without breaking functionality:

**Phase 1**: Extract `types.ts` — move all interfaces/types, update imports across all files.

**Phase 2**: Extract `workshop/param-builder.ts` — pure functions, no dependencies on parser internals.

**Phase 3**: Extract `parsers/` — split the V2 parser. Each module gets clear imports from `types.ts`.

**Phase 4**: Extract `transform/` — the code generation pipeline. Depends on `types.ts` and `parsers/`.

**Phase 5**: Extract `workshop/detection.ts` and `workshop/preview.ts` — depends on everything above.

**Phase 6**: Convert `FormulaImporter.tsx` to `FormulaWorkshop.tsx` — replace modal with split-screen, wire up Preview button, consume the extracted utilities.

Each phase is independently testable — the existing test files can be updated to import from the new locations.

---

## Part 3: Implementation Order

1. **Refactor Phase 1-2** (types + param-builder) — Low risk, unblocks everything
2. **Split-screen conversion** — Can be done while parser refactor is in progress, since it only touches the UI component
3. **Refactor Phase 3-5** (parsers + transform + workshop utilities) — The bulk of the work
4. **Refactor Phase 6** — Final cleanup: rename component, update imports in FormulaSelect.tsx

## Notes

- The `_workshop_preview` temporary formula approach avoids the need for a separate "preview compilation" code path — it reuses the existing `setFormula()` → compile pipeline
- The `as any` casts on FormulaType are acceptable for runtime-registered formulas
- The V1 parser (`GenericFragmentariumParser`) is still needed for slider annotation extraction — V2 doesn't handle `// slider[min,default,max]` syntax
- The `UNIFORM_MAP` constant in V2 (Scale→uParamA, etc.) should move to `transform/variable-renamer.ts` since it's consumed there
- Test files should move last, after all imports are stable
