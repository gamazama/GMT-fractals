
# Code Health Report

**Status:** Stable (Post-DDFS Refactor & Cleanup)

## 1. Architecture
The codebase has been successfully migrated to the **Data-Driven Feature System (DDFS)**.
*   **Redundancy:** Removed. Legacy manual event subscriptions in `fractalStore.ts` have been replaced by the automated `createFeatureSlice` logic which handles `onUpdate: 'compile'` triggers generically.
*   **Extensibility:** High. Adding a new feature no longer requires touching the Engine or UI core.
*   **Uniformity:** "Lite Mode" and "Mobile" checks have been unified into the `quality` feature (`precisionMode`, `bufferPrecision`). The global `isMobile` flag in `ShaderConfig` has been deprecated and removed.

## 2. Recent Refactors
*   **Visual Slice Removal:** `store/slices/visualSlice.ts` has been deleted. Lighting state is now fully managed by the `lighting` feature module (`features/lighting`).
*   **Lite Render Unification:** Moved logic from `uiSlice` and `FractalEngine` flags into the `QualityFeature` state. This allows granular control over precision (Float32 vs Float16) and Ray Epsilon via the DDFS.
*   **Subscription Cleanup:** Removed ~20 lines of manual `subscribe` calls in `bindStoreToEngine`. The system now automatically detects parameters that require shader recompilation based on their DDFS config.

## 3. Technical Debt / To-Do

### Minor
*   **Mobile UI:** Some auto-generated panels are cramped on vertical screens. Needs layout tuning.
*   **Typing:** Animation Engine binders still use `any` casting for dynamic DDFS paths. This is safe runtime-wise but could be stricter.

### Optimization
*   **Shader permutation:** Currently, we compile all code chunks. We could optimize `ShaderFactory` to exclude unused feature chunks (e.g., if Fog is disabled, don't include Fog code) to speed up compilation.
