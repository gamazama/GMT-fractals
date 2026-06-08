/**
 * gradientTargets — the Gradient Explorer's drop destinations, registered ONCE at boot
 * into the engine (c) send-target registry. This is the single source of truth for the
 * "select → act" model: both the click path and the drag path resolve through it, and
 * the topology (which dropboxes show, and which tabs become intermediate "reveal" steps)
 * is DERIVED from it — never hardcoded. Add a target here (or anywhere, in any tab) and
 * its final dropbox + its intermediate path light up automatically.
 *
 * Each target declares:
 *   - `apply(payload)` — the REAL receive path (the same store calls the modes already use);
 *   - `getRect?` — resolves its on-screen anchor by a `data-gx-target` tag (so it shows as
 *     an anchored dropbox only while its element is mounted/visible); absent ⇒ a bottom well;
 *   - `zone?` — the surface (tab) it lives in, so a hidden target's tab can be derived as an
 *     intermediate reveal step (see `deriveIntermediateZones`).
 *
 * Anchors:
 *   gen-a / gen-b  → the Generator source slots   (zone Generator)
 *   stops          → the Stops editor result strip (zone Stops)
 *   favients       → the Favients shelf drag area  (zone Favients — anchored when the shelf
 *                    is open, an intermediate at its tab when it is not)
 *   fullscreen / export → no anchor ⇒ bottom-row wells.
 *
 * @see components/DropTargetLayer.tsx (renders these) · store/sendTargetRegistry.ts (c)
 */

import { registerSendTarget, getSendTargets } from '../store/sendTargetRegistry';
import { renderStopsToRamp } from '../palette/core/gmtGradient';
import { openFullscreen } from '../palette/store/fullscreenStore';
import { usePaletteEditorStore, editorEdit } from '../palette/store/paletteEditorStore';
import { useGeneratorStore } from '../palette/store/generatorStore';
import { useFavientsStore } from '../palette/store/favientsStore';
import { rampToName } from '../palette/core/facetName';
import { canvasToPngBlob, downloadBlob } from '../utils/SceneFormat';
import type { FavientDragPayload } from '../palette/core/favientDnd';
import type { GradientConfig } from '../types';

/** The `data-gx-target` attribute a destination element tags itself with. */
export const GX_TARGET_ATTR = 'data-gx-target';
/** The `data-gx-mode-tab` attribute a mode tab tags itself with (for intermediate anchors). */
export const GX_MODE_TAB_ATTR = 'data-gx-mode-tab';

/** Live rect of a tagged destination element, or null when it isn't mounted/visible. */
const rectOf = (id: string): DOMRect | null =>
    document.querySelector<HTMLElement>(`[${GX_TARGET_ATTR}="${id}"]`)?.getBoundingClientRect() ?? null;

/** Live rect of a mode tab (the intermediate anchor). */
export const modeTabRect = (zone: string): DOMRect | null =>
    document.querySelector<HTMLElement>(`[${GX_MODE_TAB_ATTR}="${zone}"]`)?.getBoundingClientRect() ?? null;

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

/** Register every gradient drop target (idempotent by id). Call once at boot. */
export const registerGradientTargets = (): void => {
    const r = (
        id: string,
        label: string,
        apply: (p: FavientDragPayload) => void,
        opts: { zone?: string; anchored?: boolean } = {},
    ): void => {
        registerSendTarget<FavientDragPayload>({
            id,
            label,
            group: 'mode',
            zone: opts.zone,
            getRect: opts.anchored ? () => rectOf(id) : undefined,
            apply,
        });
    };

    // In-mode finals (anchored over their slot / strip; only droppable while their tab shows).
    r('gen-a', 'Slot A', (p) => useGeneratorStore.getState().sendRampToSlot('A', toRamp(p.config), p.name), {
        zone: 'Generator',
        anchored: true,
    });
    r('gen-b', 'Slot B', (p) => useGeneratorStore.getState().sendRampToSlot('B', toRamp(p.config), p.name), {
        zone: 'Generator',
        anchored: true,
    });
    r('stops', 'Stops', (p) => editorEdit(() => usePaletteEditorStore.getState().setConfig(p.config)), {
        zone: 'Stops',
        anchored: true,
    });
    // Favients shelf — anchored when the shelf is open; an intermediate at its tab when not.
    r(
        'favients',
        'Favients',
        (p) =>
            useFavientsStore
                .getState()
                .add(p.config, p.name?.trim() || rampToName(toRamp(p.config)), p.source),
        { zone: 'Favients', anchored: true },
    );

    // Bottom wells (no on-screen anchor).
    r('fullscreen', 'Fullscreen', (p) => openFullscreen(p.config, p.name));
    r('export', 'Export', (p) => void downloadGradientPng(p.config, p.name));
};

/**
 * Derive the intermediate "reveal a surface" steps PURELY from the registry: the distinct
 * zones whose anchored targets are currently hidden (their `getRect()` is null). One step
 * per such zone, so a new target in any tab auto-produces its intermediate path with no map.
 * Returns each zone once (first target's order wins) — the host anchors it at the mode tab.
 */
export const deriveIntermediateZones = (): string[] => {
    const zones: string[] = [];
    for (const t of getSendTargets()) {
        if (!t.zone || !t.getRect) continue;
        if (t.getRect() !== null) continue; // its surface is visible → it's a direct final, not intermediate
        if (!zones.includes(t.zone)) zones.push(t.zone);
    }
    return zones;
};
