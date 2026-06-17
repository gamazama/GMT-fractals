/**
 * P3b coverage gate for ADR-0061's InteractionSession producers.
 *
 *   tsx debug/test-interaction-coverage.mts   — exit 1 on any uncovered site
 *
 * The P3b risk is a MISSED producer: a slider/knob/vector/drawing/scrub drag
 * that never declares into the session, so it stays invisible to adaptive +
 * hold (exactly the bug the ADR exists to kill). With ~90 call sites, eyeballing
 * is unreliable — so this is a MECHANICAL check, not a render test:
 *
 *   (A) Every wired producer references its canonical INTERACTION_SOURCES token
 *       (slider / scrub / drawing) via the constant, never a bare string.
 *   (B) REGRESSION GUARD — every file that imports `useDragValue` (the leaf
 *       numeric-drag hook) is either a store-agnostic PRIMITIVE/barrel (whose
 *       drag callbacks are supplied by a connected wrapper that IS verified to
 *       wire the session) or is itself a verified slider producer. A NEW
 *       useDragValue consumer that forgets the session fails here.
 *   (C) REGRESSION GUARD — every `setIsScrubbing(true)` writer is a verified
 *       scrub producer, or the documented KeyframeInspector exception (its
 *       value fields are the connected <DraggableNumber> → already 'slider';
 *       wiring 'scrub' too would double-token one gesture).
 *
 * Static source scan only — no React / WebGL / store boot. Pairs with the
 * pure-machine test (test-interaction-session.mts) + the wiring/read-path test
 * (test-interaction-wiring.mts).
 *
 * @see engine-gmt/interaction/interactionSources.ts
 * @see engine/hooks/useInteractionDrag.ts   (useInteractionGesture core)
 * @see docs/adr/0061-interaction-session-single-source-of-truth.md  (P3b)
 */

import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { INTERACTION_SOURCES } from '../engine-gmt/interaction/interactionSources';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_DIRS = ['components', 'engine', 'engine-gmt', 'app-gmt'];

let passed = 0;
const failures: string[] = [];
const check = (cond: boolean, msg: string): void => { cond ? passed++ : failures.push(msg); };

const read = (rel: string): string => {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) { failures.push(`MISSING FILE: ${rel} (producer moved/renamed — update this gate)`); return ''; }
    return readFileSync(abs, 'utf8');
};

/** Recursively collect .ts/.tsx under SCAN_DIRS (skips node_modules). */
function walk(): string[] {
    const out: string[] = [];
    const rec = (absDir: string) => {
        for (const name of readdirSync(absDir)) {
            if (name === 'node_modules' || name.startsWith('.')) continue;
            const abs = join(absDir, name);
            const st = statSync(abs);
            if (st.isDirectory()) rec(abs);
            else if (/\.(ts|tsx|mts)$/.test(name)) out.push(relative(ROOT, abs).split(sep).join('/'));
        }
    };
    for (const d of SCAN_DIRS) { const abs = join(ROOT, d); if (existsSync(abs)) rec(abs); }
    return out;
}

// ── Wired producer inventory (the P3b surface) ───────────────────────────────
// Connected numeric wrappers — the chokepoints every <DraggableNumber> /
// <ScalarInput> / <Knob> / <Vector*Input> consumer inherits the session from.
const SLIDER_CONNECTED = [
    'components/Slider.tsx',
    'components/Knob.tsx',
    'components/vector-input/index.tsx',
];
// Custom continuous-drag slider producers (own raw pointers / window listeners).
const SLIDER_CUSTOM = [
    'engine-gmt/features/lighting/components/LightDirectionControl.tsx',
    'components/AdvancedGradientEditor.tsx',
    'components/EmbeddedColorPicker.tsx',
];
const SCRUB_PRODUCERS = [
    'components/timeline/TimelineRuler.tsx',
    // The graph-editor unification moved the BBox scale-drag's scrub gesture out of
    // GraphSelectionBBox and into the shared GraphDataSource provider, which owns the
    // useInteractionGesture(INTERACTION_SOURCES.scrub) call. The BBox now delegates via
    // ds.scrub.begin(); see SCRUB_EXCEPTION below.
    'utils/GraphDataSource.ts',
];
const DRAWING_PRODUCERS = [
    'engine-gmt/features/drawing/DrawingOverlay.tsx',
    'engine-gmt/hooks/useRegionSelection.ts',
];

const SLIDER_ALL = [...SLIDER_CONNECTED, ...SLIDER_CUSTOM];
const HOOK_RE = /useInteraction(Drag|Gesture)/;
const usesToken = (src: string, token: keyof typeof INTERACTION_SOURCES) =>
    new RegExp(`INTERACTION_SOURCES\\.${token}\\b`).test(src);

// ── (A) Every wired producer references its token via the constant ───────────
for (const f of SLIDER_ALL) {
    const src = read(f);
    check(usesToken(src, 'slider'), `${f}: missing INTERACTION_SOURCES.slider`);
    check(HOOK_RE.test(src), `${f}: missing useInteractionDrag/useInteractionGesture`);
}
for (const f of SCRUB_PRODUCERS) {
    const src = read(f);
    check(usesToken(src, 'scrub'), `${f}: missing INTERACTION_SOURCES.scrub`);
    check(HOOK_RE.test(src), `${f}: missing useInteractionDrag/useInteractionGesture`);
}
for (const f of DRAWING_PRODUCERS) {
    const src = read(f);
    check(usesToken(src, 'drawing'), `${f}: missing INTERACTION_SOURCES.drawing`);
    check(HOOK_RE.test(src), `${f}: missing useInteractionDrag/useInteractionGesture`);
}

// No bare string-literal tokens at a producer site (must go through the table).
for (const f of [...SLIDER_ALL, ...SCRUB_PRODUCERS, ...DRAWING_PRODUCERS]) {
    const src = read(f);
    check(!/begin(Interaction)?\(\s*['"](slider|scrub|drawing|camera|gizmo|picker)['"]/.test(src),
        `${f}: raw string-literal token at a session call — use INTERACTION_SOURCES`);
}

const allFiles = walk();

// ── (B) useDragValue regression guard ────────────────────────────────────────
// Store-agnostic primitives/barrels: their onDragStart/onDragEnd are supplied by
// a connected wrapper above (verified to wire the session). Allowlisted so a
// genuinely NEW useDragValue consumer must wire the session itself or be added
// here with a reason.
const USEDRAGVALUE_ALLOW = new Set([
    'components/inputs/hooks/useDragValue.ts',          // the hook itself
    'components/inputs/hooks/index.ts',                 // barrel re-export
    'components/inputs/index.ts',                       // barrel re-export
    'components/inputs/primitives/DraggableNumber.tsx', // primitive → connected DraggableNumber/Slider
    'components/vector-input/BaseVectorInput.tsx',       // primitive → connected Vector*Input
]);
const importsUseDragValue = (src: string) => /import[^;]*\buseDragValue\b/.test(src);
const dragValueConsumers = allFiles.filter(f => importsUseDragValue(read(f)));
check(dragValueConsumers.length > 0, 'sanity: found at least one useDragValue importer');
for (const f of dragValueConsumers) {
    const covered = USEDRAGVALUE_ALLOW.has(f) || SLIDER_ALL.includes(f);
    check(covered,
        `${f}: imports useDragValue but is NOT a wired slider producer nor an allowlisted primitive — wire INTERACTION_SOURCES.slider (or justify-allowlist it in this gate)`);
}

// ── (C) setIsScrubbing(true) regression guard ────────────────────────────────
// Exception: KeyframeInspector's value/frame/tangent fields are the connected
// <DraggableNumber> → already 'slider'; its setIsScrubbing only pauses playback,
// so tagging 'scrub' there too would double-token one gesture.
const SCRUB_EXCEPTION = new Set([
    'components/timeline/KeyframeInspector.tsx',
    // GraphSelectionBBox starts the scrub but delegates the InteractionSession gesture
    // to the GraphDataSource provider (the wired scrub producer above) via ds.scrub.begin();
    // tagging 'scrub' here too would double-token the one BBox gesture.
    'components/graph/GraphSelectionBBox.tsx',
]);
const writesScrubStart = (src: string) => /setIsScrubbing\(\s*true\s*\)/.test(src);
const scrubWriters = allFiles.filter(f => writesScrubStart(read(f)));
check(scrubWriters.length > 0, 'sanity: found at least one setIsScrubbing(true) writer');
for (const f of scrubWriters) {
    const covered = SCRUB_PRODUCERS.includes(f) || SCRUB_EXCEPTION.has(f);
    check(covered,
        `${f}: starts a scrub (setIsScrubbing(true)) but is NOT a wired scrub producer nor the documented slider/cleanup exception — wire INTERACTION_SOURCES.scrub (or justify-allowlist it)`);
}

// ── report ───────────────────────────────────────────────────────────────────
if (failures.length === 0) {
    console.log(`✓ interaction-session P3b producer coverage: ${passed} assertions passed`);
    console.log(`  slider: ${SLIDER_ALL.length} producers + ${dragValueConsumers.length} useDragValue paths · scrub: ${SCRUB_PRODUCERS.length} · drawing: ${DRAWING_PRODUCERS.length}`);
    process.exit(0);
} else {
    console.error(`✗ interaction-session P3b coverage: ${failures.length} FAILED, ${passed} passed`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
}
