
// Tutorial Hints — Contextual Whispers System
// Ambient, behavior-adaptive hints that surface in the HUD area.

export interface TutorialHint {
    id: string;
    text: string | ((ctx: HintContext) => string);
    maxShows: number;
    priority: number;
    minSessionTime?: number;       // seconds
    cooldownAfterShow?: number;    // seconds before this hint can reappear
    precondition: (ctx: HintContext) => boolean;
    helpTopicId?: string;
}

export interface HintContext {
    // Live store state
    cameraMode: string;
    activeRightTab: string | null;
    advancedMode: boolean;
    showHints: boolean;
    isBroadcastMode: boolean;
    formula: string;
    tabSwitchCount: number;
    isTimelineOpen: boolean;
    // Behavioral profile (persisted)
    sessionAge: number;            // seconds since page load
    panelsEverOpened: string[];
    featuresEverUsed: string[];
    formulaSwitchCount: number;
    parameterChangeCount: number;
    snapshotsTaken: number;
    rightClickCount: number;
}

// Helper: has the user opened this panel at least once this session?
const opened = (ctx: HintContext, panel: string) => ctx.panelsEverOpened.includes(panel);
const notOpened = (ctx: HintContext, panel: string) => !opened(ctx, panel);
const usedFeature = (ctx: HintContext, feat: string) => ctx.featuresEverUsed.includes(feat);

// ─── HINT DEFINITIONS ────────────────────────────────────────────────

export const TUTORIAL_HINTS: TutorialHint[] = [

    // ── NAVIGATION (early, high priority) ──────────────────────────────

    {
        id: 'nav-basics',
        text: (ctx) => ctx.cameraMode === 'Fly'
            ? 'Drag to look around \u2014 WASD to fly \u2014 Tab to switch modes'
            : 'Left-drag to rotate \u2014 Right-drag to pan \u2014 Scroll to zoom',
        maxShows: 3,
        priority: 100,
        minSessionTime: 2,
        precondition: (ctx) => ctx.parameterChangeCount === 0 && ctx.sessionAge < 60,
    },
    {
        id: 'nav-speed',
        text: 'Scroll wheel adjusts fly speed \u2014 hold Shift for boost',
        maxShows: 2,
        priority: 90,
        minSessionTime: 15,
        precondition: (ctx) => ctx.cameraMode === 'Fly' && ctx.tabSwitchCount === 0,
        helpTopicId: 'cam.mode',
    },
    {
        id: 'nav-tab-switch',
        text: (ctx) => `Press Tab to switch to ${ctx.cameraMode === 'Fly' ? 'Orbit' : 'Fly'} mode`,
        maxShows: 2,
        priority: 85,
        minSessionTime: 20,
        precondition: (ctx) => ctx.tabSwitchCount === 0,
        helpTopicId: 'cam.mode',
    },
    {
        id: 'nav-undo',
        text: 'Ctrl+Shift+Z to undo camera moves \u2014 retrace your path',
        maxShows: 2,
        priority: 50,
        minSessionTime: 60,
        precondition: (ctx) => ctx.tabSwitchCount >= 2 && ctx.parameterChangeCount >= 1,
        helpTopicId: 'general.undo',
    },

    // ── DISCOVERY (nudge idle users toward the UI) ─────────────────────

    {
        id: 'discover-panels',
        text: 'Click the tabs on the right to explore \u2014 Formula, Scene, Gradient and more',
        maxShows: 2,
        priority: 80,
        minSessionTime: 30,
        precondition: (ctx) => ctx.panelsEverOpened.length <= 1 && ctx.parameterChangeCount === 0,
    },
    {
        id: 'discover-formula',
        text: 'Try a different fractal \u2014 click the formula dropdown in the Formula tab',
        maxShows: 2,
        priority: 75,
        minSessionTime: 45,
        precondition: (ctx) => ctx.formulaSwitchCount === 0 && opened(ctx, 'Formula'),
        helpTopicId: 'panel.formula',
    },
    {
        id: 'discover-rightclick',
        text: 'Right-click any slider or label for more options and help',
        maxShows: 2,
        priority: 60,
        minSessionTime: 40,
        precondition: (ctx) => ctx.rightClickCount === 0 && ctx.parameterChangeCount > 0,
        helpTopicId: 'ui.controls',
    },
    {
        id: 'discover-gradient',
        text: 'Open the Gradient tab to change colors \u2014 click the ramp to add stops',
        maxShows: 2,
        priority: 70,
        minSessionTime: 40,
        precondition: (ctx) => notOpened(ctx, 'Gradient') && ctx.parameterChangeCount > 2,
        helpTopicId: 'panel.gradient',
    },

    // ── FEATURE INTRO (fire on first panel open) ───────────────────────

    {
        id: 'intro-gradient',
        text: 'Click the color ramp to add stops \u2014 drag to reposition, right-click to delete',
        maxShows: 2,
        priority: 70,
        precondition: (ctx) => ctx.activeRightTab === 'Gradient' && !usedFeature(ctx, 'gradient-intro'),
        helpTopicId: 'grad.editor',
    },
    {
        id: 'intro-scene',
        text: 'Scene tab: world transforms, Julia mode, and camera settings',
        maxShows: 2,
        priority: 70,
        precondition: (ctx) => ctx.activeRightTab === 'Scene' && !usedFeature(ctx, 'scene-intro'),
        helpTopicId: 'panel.scene',
    },
    {
        id: 'intro-quality',
        text: 'Quality presets: Preview for speed, Ultra for final renders',
        maxShows: 2,
        priority: 70,
        precondition: (ctx) => ctx.activeRightTab === 'Quality' && !usedFeature(ctx, 'quality-intro'),
        helpTopicId: 'panel.quality',
    },
    {
        id: 'intro-shader',
        text: 'Shader tab: material properties, ambient occlusion, and atmosphere',
        maxShows: 2,
        priority: 70,
        precondition: (ctx) => ctx.activeRightTab === 'Shader' && !usedFeature(ctx, 'shader-intro'),
    },
    {
        id: 'intro-light',
        text: 'Add lights, change colors, toggle shadows \u2014 drag the orbs in the viewport',
        maxShows: 2,
        priority: 70,
        precondition: (ctx) => ctx.activeRightTab === 'Light' && !usedFeature(ctx, 'light-intro'),
        helpTopicId: 'panel.render',
    },
    {
        id: 'intro-timeline',
        text: 'Timeline: add keyframes to animate parameters over time',
        maxShows: 2,
        priority: 70,
        precondition: (ctx) => ctx.isTimelineOpen && !usedFeature(ctx, 'timeline-intro'),
        helpTopicId: 'ui.timeline',
    },

    // ── WORKFLOW (after user demonstrates engagement) ──────────────────

    {
        id: 'workflow-undo',
        text: 'Ctrl+Z to undo parameter changes \u2014 full history stack',
        maxShows: 2,
        priority: 55,
        minSessionTime: 20,
        precondition: (ctx) => ctx.parameterChangeCount >= 3 && !usedFeature(ctx, 'undo-hint'),
        helpTopicId: 'general.undo',
    },
    {
        id: 'workflow-hints-toggle',
        text: 'Press H to hide these hints anytime',
        maxShows: 1,
        priority: 40,
        minSessionTime: 120,
        precondition: (ctx) => ctx.sessionAge > 120 && ctx.parameterChangeCount >= 3,
    },
    {
        id: 'workflow-save',
        text: 'Save your scene: top-right menu \u2192 Save (exports as .gmf)',
        maxShows: 2,
        priority: 50,
        minSessionTime: 120,
        precondition: (ctx) => ctx.formulaSwitchCount >= 2 && ctx.parameterChangeCount >= 5,
        helpTopicId: 'general.files',
    },
    {
        id: 'workflow-snapshot-meta',
        text: 'Your PNG snapshots embed the full scene \u2014 drag one back to reload it',
        maxShows: 2,
        priority: 55,
        minSessionTime: 30,
        precondition: (ctx) => ctx.snapshotsTaken >= 1 && !usedFeature(ctx, 'snapshot-meta'),
        helpTopicId: 'general.files',
    },
    {
        id: 'workflow-formula-explore',
        text: '41 built-in fractals to explore \u2014 each has its own parameter set',
        maxShows: 2,
        priority: 45,
        minSessionTime: 90,
        precondition: (ctx) => ctx.formulaSwitchCount >= 1 && ctx.formulaSwitchCount <= 3,
        helpTopicId: 'formula.active',
    },

    // ── POWER USER (advanced mode or significant usage) ────────────────

    {
        id: 'power-advanced',
        text: 'Press ~ (backtick) to toggle advanced mode \u2014 compile-time features',
        maxShows: 2,
        priority: 35,
        minSessionTime: 180,
        precondition: (ctx) => !ctx.advancedMode && ctx.parameterChangeCount >= 10 && ctx.panelsEverOpened.length >= 3,
    },
    {
        id: 'power-advanced-intro',
        text: 'Advanced mode active \u2014 compile-time params need Apply to take effect',
        maxShows: 2,
        priority: 65,
        precondition: (ctx) => ctx.advancedMode && !usedFeature(ctx, 'advanced-intro'),
    },
    {
        id: 'power-popups',
        text: 'Number keys 1\u20136 open popup sliders at your cursor \u2014 quick parameter access',
        maxShows: 2,
        priority: 30,
        minSessionTime: 240,
        precondition: (ctx) => ctx.parameterChangeCount >= 15,
        helpTopicId: 'general.shortcuts',
    },
    {
        id: 'power-camera-slots',
        text: 'Ctrl+1\u20139 to save/load camera positions \u2014 bookmark your favorite angles',
        maxShows: 2,
        priority: 30,
        minSessionTime: 180,
        precondition: (ctx) => ctx.tabSwitchCount >= 3 && ctx.parameterChangeCount >= 5,
        helpTopicId: 'panel.camera_manager',
    },
    {
        id: 'power-broadcast',
        text: 'Press B for broadcast mode \u2014 clean viewport, no UI overlay',
        maxShows: 2,
        priority: 30,
        minSessionTime: 300,
        precondition: (ctx) => ctx.sessionAge > 300 && ctx.snapshotsTaken >= 1,
    },
    {
        id: 'power-timeline',
        text: 'Press T to open the timeline \u2014 animate any parameter with keyframes',
        maxShows: 2,
        priority: 40,
        minSessionTime: 180,
        precondition: (ctx) => !ctx.isTimelineOpen && ctx.parameterChangeCount >= 8 && !usedFeature(ctx, 'timeline-hint'),
        helpTopicId: 'ui.timeline',
    },
    {
        id: 'power-video',
        text: 'Export animations as video \u2014 open Timeline, then use the render button',
        maxShows: 2,
        priority: 30,
        minSessionTime: 300,
        precondition: (ctx) => ctx.isTimelineOpen && usedFeature(ctx, 'timeline-intro') && !usedFeature(ctx, 'video-hint'),
        helpTopicId: 'export.video',
    },

    // ── COLORING DEPTH (after gradient engagement) ─────────────────────

    {
        id: 'color-mapping',
        text: 'Gradient mapping modes change how color maps to geometry \u2014 try Orbit Trap or Stripe',
        maxShows: 2,
        priority: 45,
        minSessionTime: 120,
        precondition: (ctx) => usedFeature(ctx, 'gradient-intro') && ctx.parameterChangeCount >= 5,
        helpTopicId: 'grad.mapping',
    },
    {
        id: 'color-layer2',
        text: 'Layer 2 blends a second gradient on top \u2014 enable it in the Gradient tab',
        maxShows: 2,
        priority: 35,
        minSessionTime: 180,
        precondition: (ctx) => usedFeature(ctx, 'gradient-intro') && ctx.parameterChangeCount >= 10,
        helpTopicId: 'grad.layer2',
    },

    // ── LIGHTING DEPTH (after light panel engagement) ──────────────────

    {
        id: 'light-shadows',
        text: 'Enable shadows in the Quality tab \u2014 soft shadows for best results',
        maxShows: 2,
        priority: 45,
        minSessionTime: 120,
        precondition: (ctx) => usedFeature(ctx, 'light-intro') && !usedFeature(ctx, 'shadow-hint'),
    },
    {
        id: 'light-pathtrace',
        text: 'Path Tracing mode: physically accurate lighting \u2014 enable in Engine tab (~)',
        maxShows: 2,
        priority: 35,
        minSessionTime: 240,
        precondition: (ctx) => ctx.advancedMode && usedFeature(ctx, 'light-intro') && ctx.parameterChangeCount >= 10,
        helpTopicId: 'pt.global',
    },
];
