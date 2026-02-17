
# Code Health Report

**Status:** Stable (Post-DDFS Refactor & Cleanup)
**Last Updated:** 2026-02-15

## 1. Architecture ✅
The codebase has been successfully migrated to the **Data-Driven Feature System (DDFS)**.
*   **Redundancy:** Removed. Legacy manual event subscriptions in `fractalStore.ts` have been replaced by the automated `createFeatureSlice` logic which handles `onUpdate: 'compile'` triggers generically.
*   **Extensibility:** High. Adding a new feature no longer requires touching the Engine or UI core.
*   **Uniformity:** "Lite Mode" and many mobile-related precision checks have been unified into the `quality` feature (`precisionMode`, `bufferPrecision`). Note: a runtime `isMobile` hint still flows through the config/engine (used by `FractalEngine`/`ConfigManager` and some shader chunks) — it was not fully removed. Use the `quality` feature for precision decisions and treat `isMobile` as a runtime capability hint.

## 2. Completed Refactors ✅
*   **Visual Slice Removal:** `store/slices/visualSlice.ts` has been deleted. Lighting state is now managed by the `lighting` feature module (`features/lighting`).
*   **Lite Render Unification:** Moved logic from `uiSlice` and `FractalEngine` flags into the `QualityFeature` state. This allows granular control over precision (Float32 vs Float16) and Ray Epsilon via the DDFS.
*   **Subscription Cleanup:** Removed ~20 lines of manual `subscribe` calls in `bindStoreToEngine`. The system now automatically detects parameters that require shader recompilation based on their DDFS config.
*   **Shader Builder:** Implemented `ShaderBuilder.ts` with feature `inject()` contract for cleaner shader composition.
*   **Legacy Shader Properties Removed:** Removed deprecated `shaderGenerator` and `shader` properties from `FeatureDefinition` interface.
*   **Deprecated Feature Removed:** Removed `features/stress_test.ts` placeholder.
*   **Debug Console Logs Removed:** Cleaned up debug logs from startup and config management (kept compile-time logs).

## 3. Technical Debt

### High Priority
| Issue | Location | Impact | Recommendation |
|-------|----------|--------|----------------|
| **`any` Type Usage** | 141+ instances across codebase | Type safety, IDE support | Create typed interfaces for DDFS state access |

### Medium Priority
| Issue | Location | Impact | Recommendation |
|-------|----------|--------|----------------|
| **Console Statements** | ~25 instances remaining | Debug noise in production | Review remaining logs; keep error handlers |

### Low Priority
| Issue | Location | Impact | Recommendation |
|-------|----------|--------|----------------|
| **Mobile UI** | Auto-generated panels | Cramped layout on vertical screens | CSS tuning needed |
| **Duplicate JSX Types** | `types.ts` lines 14-75 | Maintenance overhead | Consider using `@react-three/fiber` types |

## 4. `any` Type Analysis

The `any` type is used extensively for dynamic DDFS state access. Key locations:

### Store & State Access (Expected Pattern)
- `store/createFeatureSlice.ts` - Dynamic slice generation
- `store/fractalStore.ts` - Dynamic feature state access
- `utils/PresetLogic.ts` - Preset hydration
- `engine/AnimationEngine.ts` - Dynamic binder lookup

### Recommended Fix
Create a typed state accessor utility:
```typescript
// utils/typedAccess.ts
import { featureRegistry } from '../engine/FeatureSystem';

export function getFeatureState<T extends keyof FeatureStateMap>(
  state: any, 
  featureId: T
): FeatureStateMap[T] {
  return state[featureId];
}
```

## 5. Console Statement Analysis

### Compile-Time Logs (Kept)
| File | Line | Purpose |
|------|------|---------|
| `engine/FractalEngine.ts` | 383 | Shader compile time |
| `engine/MaterialController.ts` | 231, 252 | Shader generation size/hash |

### Error Handlers (Keep)
| File | Line | Purpose |
|------|------|---------|
| `utils/UrlStateEncoder.ts` | 46, 73 | URL encoding/decoding errors |
| `utils/Sharing.ts` | 58, 80 | Share string errors |
| `engine/VideoExporter.ts` | 244, 350, 694 | Video export errors |
| `engine/LoadingRenderer.ts` | 111 | Shader compile error |
| `features/audioMod/AudioAnalysisEngine.ts` | 107 | Mic access denied |

### Warnings (Keep)
| File | Line | Purpose |
|------|------|---------|
| `store/fractalStore.ts` | 274 | Animation save failure |
| `engine/FractalRegistry.ts` | 16 | Unknown alias registration |
| `engine/AnimationEngine.ts` | 149 | Missing setter warning |
| `engine/VideoExporter.ts` | 335 | SPS/PPS wait warning |
| `engine/BucketRenderer.ts` | 157, 245 | Bucket render warnings |
| `hooks/useAppStartup.ts` | 100 | Loading screen timeout |

## 6. Optimization Opportunities

### Shader Permutation
Currently, all feature code chunks are included in shaders regardless of whether the feature is enabled. 

**Recommendation:** Implement conditional compilation in `ShaderFactory.ts`:
```typescript
// Skip feature code injection if feature is disabled
if (feat.inject && isFeatureEnabled(config, feat.id)) {
    feat.inject(builder, config, variant);
}
```

**Benefit:** Faster shader compilation, reduced GPU register pressure.

## 7. Recommended Actions

### Completed ✅
1. ✅ Removed `features/stress_test.ts`
2. ✅ Removed debug `console.log` statements from startup code
3. ✅ Removed legacy `shader` and `shaderGenerator` properties from `FeatureDefinition`
4. ✅ Updated documentation

### Short Term (Medium Effort)
1. Create typed state accessor utility for DDFS
2. Implement conditional shader chunk inclusion for better performance

### Long Term (High Effort)
1. Generate TypeScript types from `FeatureRegistry` for full type safety
2. Implement comprehensive test suite
3. Consider migrating to `@react-three/fiber` built-in JSX types
