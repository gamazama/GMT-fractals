/**
 * gradientTargets — the Gradient Explorer's drop destinations + the reveal-step graph,
 * registered into the engine (c) send-target registry. This is the single source of
 * truth for the "select → reveal → place" model: both the click path and the drag path
 * resolve through it, and the dropbox topology (finals + the intermediate "reveal a
 * surface" steps) is DERIVED from it, never hardcoded.
 *
 * Each target declares:
 *   - `apply(payload)` — the REAL receive path (the store calls the modes already use);
 *   - `getRect?` — resolves its anchor via a `data-gx-target` tag (so it shows as an
 *     anchored dropbox only while its element is mounted/visible); absent ⇒ a bottom well;
 *   - `revealPath?` — the ORDERED reveal steps to bring that anchor on screen (open a tab,
 *     switch a sub-mode). `deriveIntermediates` walks it and surfaces the first UNMET step.
 *
 * A reveal step (`REVEAL_STEPS`) is `{ getRect, isActive, activate }` — the host's
 * navigation primitives (a mode tab, the Generator's Mixed/ColorBox sub-mode). Targets
 * reference steps by id, so a NEW target (even several steps deep) auto-populates its
 * whole path with no per-target wiring. Example: ColorBox lives behind TWO steps
 * (`tab:Generator` → `gen:colorbox`); the Generator slots behind `tab:Generator` →
 * `gen:mixed` (so they're reachable again from ColorBox mode).
 *
 * @see components/DropTargetLayer.tsx (renders finals) · gradient-explorer/GradientDropLayer.tsx
 *   (renders the derived intermediates) · store/sendTargetRegistry.ts (c)
 */

import { registerSendTarget, getSendTargets } from '../store/sendTargetRegistry';
import { useEngineStore } from '../store/engineStore';
import { renderStopsToRamp } from '../palette/core/gmtGradient';
import { openFullscreen } from '../palette/store/fullscreenStore';
import { usePaletteEditorStore, editorEdit } from '../palette/store/paletteEditorStore';
import { useGeneratorStore } from '../palette/store/generatorStore';
import { useFavientsStore } from '../palette/store/favientsStore';
import { rampToName } from '../palette/core/facetName';
import { canvasToPngBlob, downloadBlob } from '../utils/SceneFormat';
import type { FavientDragPayload } from '../palette/core/favientDnd';
import type { GradientConfig, PanelId } from '../types';

export const GX_TARGET_ATTR = 'data-gx-target';
export const GX_MODE_TAB_ATTR = 'data-gx-mode-tab';
export const GX_STEP_ATTR = 'data-gx-step';

const rectOf = (id: string): DOMRect | null =>
    document.querySelector<HTMLElement>(`[${GX_TARGET_ATTR}="${id}"]`)?.getBoundingClientRect() ?? null;
export const modeTabRect = (id: string): DOMRect | null =>
    document.querySelector<HTMLElement>(`[${GX_MODE_TAB_ATTR}="${id}"]`)?.getBoundingClientRect() ?? null;
const stepRect = (id: string): DOMRect | null =>
    document.querySelector<HTMLElement>(`[${GX_STEP_ATTR}="${id}"]`)?.getBoundingClientRect() ?? null;

const toRamp = (c: GradientConfig) => renderStopsToRamp(c.stops, c.blendSpace, c.colorSpace);

/** Export a gradient as a PNG strip (the bottom "Export" well). */
const downloadGradientPng = async (config: GradientConfig, name: string): Promise<void> => {
    const ramp = toRamp(config);
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 48;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const src = document.createElement('canvas');
    src.width = 256;
    src.height = 1;
    const img = src.getContext('2d')!.createImageData(256, 1);
    for (let i = 0; i < 256; i++) {
        img.data[i * 4] = ramp[i].r;
        img.data[i * 4 + 1] = ramp[i].g;
        img.data[i * 4 + 2] = ramp[i].b;
        img.data[i * 4 + 3] = 255;
    }
    src.getContext('2d')!.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0, 256, 1, 0, 0, cv.width, cv.height);
    const blob = await canvasToPngBlob(cv);
    if (!blob) return;
    const stem = (name || 'gradient').trim().replace(/\s+/g, '-').toLowerCase() || 'gradient';
    downloadBlob(blob, `${stem}.png`);
};

// ── Host navigation primitives the reveal steps drive ───────────────────────────────
type PanelRec = { location?: string; isOpen?: boolean };
const panelOf = (id: string): PanelRec | undefined =>
    (useEngineStore.getState().panels as Record<string, PanelRec>)[id];

/** The explorer MODE panels (setup.ts) — the centre Stage mirrors whichever is the active
 *  right tab via `activeRightTab`, so their content stays on screen even when the right dock
 *  is COLLAPSED. Any other dock panel — the Favients shelf — has NO centre mirror, so it is
 *  only visible while its dock is expanded, and must be UN-collapsed (not merely navigated) to
 *  be revealed, on EITHER side. Keying the reveal logic on this set (not on dock side) is what
 *  lets a right-docked Favients reveal correctly. */
const CENTRE_MIRRORED_MODES = new Set(['Picker', 'Generator', 'Image', 'Stops']);

/** Is a panel currently shown (its content on screen)? */
const isPanelShown = (id: string): boolean => {
    const s = useEngineStore.getState();
    const panel = panelOf(id);
    if (!panel) return false;
    if (panel.location === 'left') return !s.isLeftDockCollapsed && !!panel.isOpen;
    // Right dock: a centre-mirrored mode shows whenever it's the active tab (the Stage mirrors
    // it even while collapsed); a non-mirrored shelf (Favients) needs the dock expanded.
    const isActiveTab = (s.activeRightTab as string) === id;
    if (CENTRE_MIRRORED_MODES.has(id)) return isActiveTab;
    return isActiveTab && !s.isRightDockCollapsed && !!panel.isOpen;
};

/** Reveal a panel (switch/open it; un-collapse its OWN side dock). Keeps the selection. */
const revealPanel = (id: string): void => {
    const s = useEngineStore.getState();
    const loc = panelOf(id)?.location;
    if (loc === 'left') s.setDockCollapsed('left', false);
    else if (loc === 'right') s.setDockCollapsed('right', false);
    s.togglePanel(id as PanelId, true);
};

/** The side of a panel's COLLAPSED dock, or null if its dock is expanded / it's floating. */
const collapsedDockSide = (id: string): 'left' | 'right' | null => {
    const s = useEngineStore.getState();
    const loc = panelOf(id)?.location;
    if (loc === 'left') return s.isLeftDockCollapsed ? 'left' : null;
    if (loc === 'right') return s.isRightDockCollapsed ? 'right' : null;
    return null;
};

/**
 * Navigate to a panel from its collapsed-dock well. A centre-mirrored MODE panel mirrors to the
 * stage (which reads `activeRightTab`), so switching the active tab navigates the page while the
 * user keeps their collapsed controls. The Favients shelf has NO centre mirror — on EITHER dock
 * side — so it must be REVEALED (un-collapsed) to be usable; navigating its tab alone would
 * leave the shelf hidden behind the collapsed dock. Keyed on mode membership, not dock side, so
 * a right-docked Favients reveals correctly.
 */
const navigateToPanel = (id: string): void => {
    if (panelOf(id)?.location === 'right' && CENTRE_MIRRORED_MODES.has(id)) {
        useEngineStore.setState((st) => ({
            panels: { ...st.panels, [id]: { ...st.panels[id], isOpen: true } },
            activeRightTab: id as PanelId,
        }));
    } else {
        revealPanel(id);
    }
};

const genMode = (): number =>
    (useEngineStore.getState() as unknown as { paletteGenerator?: { generatorMode?: number } })
        .paletteGenerator?.generatorMode ?? 0;
const setGenMode = (v: number): void =>
    (useEngineStore.getState() as unknown as { setPaletteGenerator?: (p: { generatorMode: number }) => void })
        .setPaletteGenerator?.({ generatorMode: v });

interface RevealStep {
    getRect: () => DOMRect | null;
    isActive: () => boolean;
    activate: () => void;
    /** Human label (the panel name) — shown when the anchor is a collapsed-dock icon. */
    label?: string;
    /** The side of the step's dock when it's COLLAPSED (else null) — the host then renders a
     *  NAMED edge well next to the collapsed icon instead of a box over the (absent) tab. */
    collapsedSide?: () => 'left' | 'right' | null;
    /** Collapsed-dock activation: navigate to the page WITHOUT un-collapsing the dock. */
    navigate?: () => void;
}
const tabStep = (id: string): RevealStep => ({
    getRect: () => modeTabRect(id),
    isActive: () => isPanelShown(id),
    activate: () => revealPanel(id),
    label: id,
    collapsedSide: () => collapsedDockSide(id),
    navigate: () => navigateToPanel(id),
});
const REVEAL_STEPS: Record<string, RevealStep> = {
    'tab:Generator': tabStep('Generator'),
    'tab:Stops': tabStep('Stops'),
    'tab:Favients': tabStep('Favients'),
    'gen:mixed': { getRect: () => stepRect('gen:mixed'), isActive: () => genMode() === 0, activate: () => setGenMode(0) },
    'gen:colorbox': { getRect: () => stepRect('gen:colorbox'), isActive: () => genMode() === 1, activate: () => setGenMode(1) },
};

/** Register every gradient drop target (idempotent by id). Call once at boot. */
export const registerGradientTargets = (): void => {
    const r = (
        id: string,
        label: string,
        apply: (p: FavientDragPayload) => void,
        opts: { revealPath?: string[]; anchored?: boolean } = {},
    ): void => {
        registerSendTarget<FavientDragPayload>({
            id,
            label,
            group: 'mode',
            revealPath: opts.revealPath,
            getRect: opts.anchored ? () => rectOf(id) : undefined,
            apply,
        });
    };

    // In-mode finals (anchored over their slot / strip; reachable via their reveal path).
    r('gen-a', 'Slot A', (p) => useGeneratorStore.getState().sendRampToSlot('A', toRamp(p.config), p.name), {
        revealPath: ['tab:Generator', 'gen:mixed'],
        anchored: true,
    });
    r('gen-b', 'Slot B', (p) => useGeneratorStore.getState().sendRampToSlot('B', toRamp(p.config), p.name), {
        revealPath: ['tab:Generator', 'gen:mixed'],
        anchored: true,
    });
    r('colorbox', 'ColorBox', (p) => useGeneratorStore.getState().fitColorBoxFromRamp(toRamp(p.config)), {
        revealPath: ['tab:Generator', 'gen:colorbox'],
        anchored: true,
    });
    r('stops', 'Stops', (p) => editorEdit(() => usePaletteEditorStore.getState().setConfig(p.config)), {
        revealPath: ['tab:Stops'],
        anchored: true,
    });
    // Favients shelf. During a DRAG it shows as a VISUAL dropbox (so the shelf reads as a
    // target) but `dragPassthrough` makes it pointer-events-none, so the drag falls through
    // to the Favients panel's OWN drag-and-drop (insert-at-position, grouping, reorder)
    // rather than a flat add. The CLICK path saves (a flat add), standing down for an item
    // that's already a favourite (`accepts`). The intermediate Favients tab still derives
    // from `revealPath` (a drag can navigate to / reveal the shelf, then the panel handles it).
    registerSendTarget<FavientDragPayload>({
        id: 'favients',
        label: 'Favients',
        group: 'mode',
        revealPath: ['tab:Favients'],
        getRect: () => rectOf('favients'),
        accepts: (p) => !p.favId,
        dragPassthrough: true,
        apply: (p) =>
            useFavientsStore.getState().add(p.config, p.name?.trim() || rampToName(toRamp(p.config)), p.source),
    });

    // Bottom wells (no on-screen anchor).
    r('fullscreen', 'Fullscreen', (p) => openFullscreen(p.config, p.name));
    r('export', 'Export', (p) => void downloadGradientPng(p.config, p.name));
};

/** One intermediate affordance: where to draw the "reveal" dropbox, and what it does. */
export interface IntermediateAffordance {
    /** Reveal-step id (dedupe key across targets that share a step). */
    id: string;
    getRect: () => DOMRect | null;
    activate: () => void;
    /** Panel name — shown when the anchor is a collapsed-dock icon (else hideLabel over the tab). */
    label?: string;
    /** When the step's dock is COLLAPSED, which side (else null) — the host renders a named
     *  edge well next to the collapsed icon that navigates to the page. */
    collapsedSide?: 'left' | 'right' | null;
}

/**
 * Derive the active intermediate steps PURELY from the registry: for every target whose
 * anchor is currently hidden (`getRect()` is null), walk its `revealPath` and take the
 * FIRST step that isn't satisfied. Deduped by step id, so several targets behind the same
 * step share one affordance. Adding a target (at any depth) auto-produces its path here.
 */
export const deriveIntermediates = (): IntermediateAffordance[] => {
    const out: IntermediateAffordance[] = [];
    const seen = new Set<string>();
    for (const t of getSendTargets()) {
        if (!t.revealPath || !t.getRect) continue;
        if (t.getRect() !== null) continue; // anchor visible → it's a direct final, not intermediate
        for (const stepId of t.revealPath) {
            const step = REVEAL_STEPS[stepId];
            if (!step) break;
            if (step.isActive()) continue; // satisfied → look deeper along the path
            if (!seen.has(stepId)) {
                seen.add(stepId);
                const collapsedSide = step.collapsedSide?.() ?? null;
                out.push({
                    id: stepId,
                    getRect: step.getRect,
                    // Collapsed dock: navigate (switch the page, keep the dock collapsed);
                    // expanded: the normal reveal (open/switch the tab).
                    activate: collapsedSide && step.navigate ? step.navigate : step.activate,
                    label: step.label,
                    collapsedSide,
                });
            }
            break; // only the first unmet step is this target's current intermediate
        }
    }
    return out;
};
