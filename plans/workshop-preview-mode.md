# Workshop Preview Mode & Engine Profile Persistence

## Context

GMT's shader compile times are 10-30s on the GPU. When iterating on imported formulas in the Formula Workshop, this makes debugging impractical. The Engine Panel already has a "Fastest" profile that strips shadows, AO, reflections, volumetrics, and glow — reducing compile time to ~3-5s. We need to wire the Workshop to use this automatically, and fix a persistence bug so engine settings survive formula switches.

## Architecture Overview (Read These Files First)

| File | Purpose |
|------|---------|
| `features/engine/profiles.ts` | `ENGINE_PROFILES` definitions (fastest/lite/balanced/ultra) and `detectEngineProfile()` |
| `components/panels/EnginePanel.tsx` | Engine panel UI — `handlePreset()` applies profiles as pending changes, `applyPendingChanges()` commits them |
| `store/fractalStore.ts:43-107` | `setFormula()` — detects current profile and re-applies it on formula switch |
| `features/fragmentarium_import/FormulaImporter.tsx` | Workshop UI — `handleImport()` registers formula and calls `setFormula()` |
| `engine/MaterialController.ts:183-260` | `updateConfig()` → `compileDirect()`/`compilePT()` — shader generation and GPU compile trigger |
| `engine/FractalEngine.ts:365-421` | `performCompilation()` — GPU warm-up render calls |

## Task 1: Workshop Preview Mode

### Goal
When the Formula Workshop opens, automatically switch to the "Fastest" engine profile. When it closes (import or cancel), restore the previous engine state.

### Implementation

**1a. Save/Restore Engine State in FormulaImporter.tsx**

In `FormulaImporter.tsx`, on mount:
- Snapshot the current engine-relevant state from the store (the same slices used by `detectEngineProfile`: `lighting`, `ao`, `geometry`, `reflections`, `quality`, `atmosphere`)
- Store the snapshot in a `useRef`
- Apply `ENGINE_PROFILES.fastest` to the store (same pattern as `EnginePanel.handlePreset` but commit immediately, not as pending)
- This triggers a compile with the stripped shader

On unmount (cleanup) or when `onClose` is called:
- Restore the saved snapshot to the store
- This triggers a compile back to the user's original settings

**Key code pattern** — applying a profile directly (not as pending):
```typescript
// From EnginePanel.applyPendingChanges pattern:
Object.entries(ENGINE_PROFILES.fastest).forEach(([featId, params]) => {
    const setterName = `set${featId.charAt(0).toUpperCase() + featId.slice(1)}`;
    const action = (store as any)[setterName];
    if (action) action(params);
});
```

**1b. Skip Double Compile on Import**

Currently `handleImport()` at line 467 calls:
```typescript
setTimeout(() => { setFormula(formulaName as any); onClose(); }, 1000);
```

`setFormula()` will trigger a compile, and then `onClose()` restores engine state which triggers another compile. To avoid this:
- Have `onClose` accept an optional flag like `skipRestore?: boolean`
- When importing successfully, call `setFormula()` and let the engine state restore happen AFTER `setFormula` completes (the profile persistence in Task 2 will handle this)
- Alternatively: restore engine state first, then call `setFormula()` — since `setFormula` re-applies the detected profile anyway (see Task 2)

### Files to Modify
- `features/fragmentarium_import/FormulaImporter.tsx` — add useRef for snapshot, useEffect for save/apply/restore

## Task 2: Fix "Custom" Profile Persistence on Formula Switch

### The Bug
In `store/fractalStore.ts:70-81`:
```typescript
const currentProfileKey = detectEngineProfile(get());
if (currentProfileKey !== 'custom' && currentProfileKey !== 'balanced') {
    const profileConfig = ENGINE_PROFILES[currentProfileKey];
    // ... merges profile into formula preset
}
```

When the user's engine state doesn't exactly match a named profile (returns `'custom'`), the engine settings are NOT preserved — the new formula's `defaultPreset` overrides them. This means manually tweaking one engine setting (e.g., shadow steps) causes all engine settings to reset on formula switch.

### Fix
Instead of detecting and re-applying a named profile, snapshot the actual engine feature state and merge it:

```typescript
// Replace lines 70-81 with:
const engineFeatureIds = ['lighting', 'ao', 'geometry', 'reflections', 'quality', 'atmosphere'];
const currentState = get();

// Preserve engine-relevant params from current state
if (!formulaPreset.features) formulaPreset.features = {};
engineFeatureIds.forEach(featId => {
    const feat = featureRegistry.get(featId);
    if (!feat?.engineConfig) return;
    const currentSlice = (currentState as any)[featId];
    if (!currentSlice) return;

    // Only preserve compile-time engine params, not artistic params
    const engineParams: Record<string, any> = {};
    const toggleParam = feat.engineConfig.toggleParam;

    // Always preserve the master toggle
    if (currentSlice[toggleParam] !== undefined) {
        engineParams[toggleParam] = currentSlice[toggleParam];
    }

    // Preserve any param with onUpdate: 'compile'
    Object.entries(feat.params).forEach(([key, config]) => {
        if (config.onUpdate === 'compile' && currentSlice[key] !== undefined) {
            engineParams[key] = currentSlice[key];
        }
    });

    if (!formulaPreset.features![featId]) formulaPreset.features![featId] = {};
    Object.assign(formulaPreset.features![featId], engineParams);
});
```

This preserves ALL compile-time engine settings (the ones that affect shader structure) while letting the formula's defaults control artistic params.

### Files to Modify
- `store/fractalStore.ts` — replace lines 70-81 in `setFormula()`
- Need to import `featureRegistry` if not already imported

## Task 3: Workshop Code Editor

### Goal
Replace the `<textarea>` at `FormulaImporter.tsx:526` with a proper GLSL code editor, and support re-editing formulas after import.

### Implementation

**3a. Code Editor Component**

Use CodeMirror 6 (lighter than Monaco, tree-shakeable, good GLSL support via `@codemirror/lang-javascript` or community GLSL mode).

Install: `npm install @codemirror/view @codemirror/state @codemirror/lang-javascript codemirror`

Create `components/inputs/GlslEditor.tsx`:
- Wraps CodeMirror with a dark theme matching GMT's UI
- Props: `value: string`, `onChange: (val: string) => void`, `height?: string`, `readOnly?: boolean`
- Use `oneDark` theme or custom dark theme to match `bg-black/40`

**3b. Replace Textarea**

In `FormulaImporter.tsx`, replace the `<textarea>` (line 526-531) with `<GlslEditor>`.

**3c. Editable Formula Storage**

Extend `FractalDefinition` in `types/fractal.ts` to optionally store source:
```typescript
export interface FractalDefinition {
    // ... existing fields ...
    importSource?: {
        glsl: string;           // Original GLSL source
        mappings: any[];        // WorkshopParam[] snapshot
        selectedFunction: string;
        loopMode: 'loop' | 'single';
    };
}
```

In `FormulaImporter.tsx handleImport()`, save the source data:
```typescript
const newDef: FractalDefinition = {
    // ... existing ...
    importSource: {
        glsl: source,
        mappings: mappings,
        selectedFunction: selectedFunctionName,
        loopMode: loopMode,
    },
};
```

**3d. Re-Edit Flow**

Add a way to re-open the Workshop with a previously imported formula's source pre-loaded:
- In the Formula selector UI, if the current formula has `importSource`, show an "Edit" button
- When clicked, open FormulaImporter with state pre-populated from `importSource`
- The user edits, re-maps, and re-imports (overwriting the existing registry entry)

### Files to Create
- `components/inputs/GlslEditor.tsx`

### Files to Modify
- `features/fragmentarium_import/FormulaImporter.tsx` — swap textarea, save importSource, accept initial state for re-edit
- `types/fractal.ts` — add `importSource?` to `FractalDefinition`
- `components/panels/formula/FormulaSelect.tsx` — add "Edit" button for imported formulas
- `package.json` — add CodeMirror dependencies

## Implementation Order

1. **Task 2 first** (profile persistence fix) — small, self-contained, no new dependencies
2. **Task 1** (Workshop preview mode) — depends on Task 2 working correctly for the restore flow
3. **Task 3** (code editor) — independent but benefits from Tasks 1+2 being done (faster iteration)

## Testing

- Switch between formulas with engine set to "Fastest" → should stay on Fastest
- Switch with a custom engine config (e.g., Balanced but with shadow steps changed to 64) → engine settings should persist
- Open Workshop → engine should switch to Fastest (verify via Engine Panel dropdown)
- Close Workshop without importing → engine should restore previous state
- Import a formula → engine should restore, formula should render
- Re-open Workshop → previous formula's source should be available for re-editing

## Notes

- `ENGINE_PROFILES.fastest` sets `compilerHardCap: 128` which limits `MAX_HARD_ITERATIONS` — note: this does NOT affect compile time (ANGLE/D3D does not unroll define-bounded loops), but it does affect runtime performance by capping iterations
- The `as any` casts for `FormulaType` in the importer are fine — the registry uses string keys internally
- Three.js r162 supports `renderer.compileAsync()` but a previous attempt to use it still froze the UI — likely because the first `render()` call blocks if the program isn't ready. Would need a dual-material approach (keep old material active while new one compiles in background). Deferred to a future task.
