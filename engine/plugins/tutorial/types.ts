/**
 * Public types for the tutorial plugin.
 *
 * `TutorialStep` and `TutorialLesson` are generic over the host store type.
 * Apps narrow them to their typed store (e.g. `TutorialStep<GmtState>`) so
 * `onEnter` / `onExit` receive a typed parameter — no `(store as any)`.
 *
 * Trigger kinds are open-ended: the engine ships generic ones (value, delta,
 * keypress, …) and apps register more (tab, mode, action) via
 * `tutor.registerTrigger(...)`. A `TriggerSpec` is an object with a `kind`
 * string and arbitrary other fields the corresponding evaluator reads.
 */

export interface TriggerSpec {
    kind: string;
    [extra: string]: any;
}

export interface PositionConfig {
    /** Pixel offset applied after layout. */
    offset?: { x?: number; y?: number };
    /** Anchor id(s) used for card placement (separate from highlights). */
    target?: string | string[];
    /** Force card below the target (skips left/right preference). */
    side?: 'below';
    /** Left-align card to target's left edge (with `side: 'below'`). */
    align?: 'start';
}

export interface TutorialStep<TStore = any> {
    id: string;
    /** Default 'text' — registered renderer is looked up at render time. */
    kind?: string;
    text?: string;
    subtext?: string;
    /** Anchor IDs to draw a pulsing highlight rectangle over. */
    highlightTargets?: string[];
    trigger: TriggerSpec;
    /** Switch to this panel id on step entry. App must register a 'tab' trigger
     *  / `forceTab` adapter for this to do anything. */
    forceTab?: string;
    onEnter?: (store: TStore) => void;
    onExit?: (store: TStore) => void;
    /** First-step "Begin" label. */
    beginButton?: boolean;
    /** Show Next button even for non-manual triggers. */
    allowManual?: boolean;
    /** Key caps that flash on press while this step is active. */
    showKeys?: string[];
    /** Auto-chain to this lesson on completion. */
    autoStartLesson?: number;
    /** Custom advance-button label. */
    buttonLabel?: string;
    /** Card placement controls. */
    position?: PositionConfig;
    /** Arbitrary fields read by custom step renderers. */
    [extra: string]: any;
}

export interface TutorialLesson<TStore = any> {
    id: number;
    title: string;
    subtitle?: string;
    onStart?: (store: TStore) => void;
    steps: TutorialStep<TStore>[];
}
