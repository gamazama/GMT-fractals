/**
 * GMT anchor ID catalog. Lessons reference these constants instead of
 * raw strings — typos surface at compile time. Adding a new anchor: add
 * the constant here, register it via `useTutorAnchor` (or the wrapper
 * patterns) at the corresponding component, and reference it from a
 * lesson step.
 */

export const ANCHOR = {
    // Right-dock tabs
    tabFormula: 'tab-Formula',
    tabScene: 'tab-Scene',
    tabShader: 'tab-Shader',
    tabGradient: 'tab-Gradient',
    tabQuality: 'tab-Quality',
    rightDock: 'right-dock',

    // Formula panel — DDFS params live in the 'param:' namespace
    // (registered by AutoFeaturePanel + FormulaParamsWidget).
    iterations: 'param:iterations',
    paramA: 'param:paramA',
    paramD: 'param:paramD',
    vec2A: 'param:vec2A',
    vec2B: 'param:vec2B',
    juliaMode: 'param:juliaMode',
    pickJulia: 'pick-julia',
    formulaHamburger: 'formula-hamburger',

    // Quality panel — also DDFS params.
    stepJitter: 'param:stepJitter',
    fudgeFactor: 'param:fudgeFactor',
    maxSteps: 'param:maxSteps',

    // Topbar
    viewportQualityBtn: 'viewport-quality-btn',
    snapshotBtn: 'snapshot-btn',
    bucketBtn: 'bucket-btn',
    /** Per-subsystem row inside the Viewport Quality popover. Suffix
     *  is the subsystem id (e.g. 'shadows'). */
    vpQualityRow: (id: string) => `vp-quality-row-${id}`,

    // Center HUD — lights
    lightOrbs: 'light-orbs',
    lightsExpand: 'lights-expand',
    shadowBtn: 'shadow-btn',
    lightGizmoBtn: 'light-gizmo-btn',
    lightAnchor: 'light-anchor',
    lightPopupMenu: 'light-popup-menu',
    shadowPanel: 'shadow-panel',
    shadowAreaBtn: 'shadow-area-btn',
    shadowSoftness: 'param:shadowSoftness',
    shadowSteps: 'param:shadowSteps',

    // Per-light gizmo (suffix with index 0..2)
    lightGizmoLabel: (i: number) => `light-gizmo-label-${i}`,
    gizmoAnchor: (i: number) => `gizmo-anchor-${i}`,

    // HUD navigation
    resetCamera: 'reset-camera',
    speedSlider: 'speed-slider',
} as const;
