/**
 * gradientBins — the ONE canonical list of gradient destinations for the Gradient
 * Explorer's lower-centre bin dock (P2-A "select → act").
 *
 * A single descriptor array is the source of truth; each descriptor is registered into
 * BOTH engine-core kernels — the two are twins (one reached by dragging, one by clicking):
 *   • (b) `dropWellRegistry` — the DROP path + what `DragWellsOverlay` renders as a bin.
 *     A drop reads the dragged `FavientDragPayload` and calls the descriptor's `apply`.
 *   • (c) `sendTargetRegistry` — the CLICK path. `DragWellsOverlay` resolves a clicked bin
 *     to the matching send target (by id) and calls `apply(selectedPayload)`.
 * Same id on both registrations, both generated here, so it stays ONE list — not a fork.
 *
 * Targets (Image is intentionally excluded — it has no "receive a gradient" destination):
 *   Fullscreen · Stops · Generator · Slot A · Generator · Slot B · ColorBox · Favients.
 * Every `apply` funnels into the mode's REAL receive path (no parallel logic) — the same
 * functions the modes already call. A gradient is a `GradientConfig`; targets that want a
 * 256-RGB ramp render it once via the canonical sampler (`renderStopsToRamp`).
 *
 * Registered ONCE at boot from `registerFeatures.ts` (pre-store-freeze is safe: these are
 * module-level registries, and the `apply` closures read store `getState()` at CLICK/DROP
 * time, never at registration time). Explorer-only — app-gmt never imports this, so the
 * studio bins don't leak into the host.
 *
 * @see components/DragWellsOverlay.tsx (the dock that renders + routes these)
 * @see store/dropWellRegistry.ts (b) · store/sendTargetRegistry.ts (c)
 */

import { registerDropWell } from '../store/dropWellRegistry';
import { registerSendTarget } from '../store/sendTargetRegistry';
import {
  FAVIENT_DND_MIME,
  readFavientDrag,
  type FavientDragPayload,
} from '../palette/core/favientDnd';
import { renderStopsToRamp } from '../palette/core/gmtGradient';
import { openFullscreen } from '../palette/store/fullscreenStore';
import { usePaletteEditorStore, editorEdit } from '../palette/store/paletteEditorStore';
import { useGeneratorStore } from '../palette/store/generatorStore';
import { useFavientsStore } from '../palette/store/favientsStore';
import { rampToName } from '../palette/core/facetName';
import type { GradientConfig } from '../types';

/** Render a config to the 256-RGB ramp the ramp-based receive paths expect. */
const toRamp = (config: GradientConfig) =>
  renderStopsToRamp(config.stops, config.blendSpace, config.colorSpace);

interface GradientBin {
  id: string;
  label: string;
  /** SendTarget grouping (host destination vs intra-studio mode destination). */
  group: 'host' | 'mode';
  /** The REAL receive path — identical for a click (selected payload) and a drop. */
  apply: (config: GradientConfig, name: string, source?: string) => void;
}

const BINS: GradientBin[] = [
  {
    id: 'fullscreen',
    label: 'Fullscreen',
    group: 'host',
    // Display-only preview gallery (W11). Was registered inline by the overlay;
    // consolidated here so the dock has ONE list. Behaviour is unchanged.
    apply: (config, name) => openFullscreen(config, name),
  },
  {
    id: 'stops',
    label: 'Stops',
    group: 'mode',
    // Load into the Stops editor; bracket via the (d) seam so it's one undo entry.
    apply: (config) => editorEdit(() => usePaletteEditorStore.getState().setConfig(config)),
  },
  {
    id: 'gen-a',
    label: 'Generator · A',
    group: 'mode',
    apply: (config, name) => useGeneratorStore.getState().sendRampToSlot('A', toRamp(config), name),
  },
  {
    id: 'gen-b',
    label: 'Generator · B',
    group: 'mode',
    apply: (config, name) => useGeneratorStore.getState().sendRampToSlot('B', toRamp(config), name),
  },
  {
    id: 'colorbox',
    label: 'ColorBox',
    group: 'mode',
    // ColorBox is a Generator sub-mode; fit the gradient to per-channel sweeps.
    apply: (config) => useGeneratorStore.getState().fitColorBoxFromRamp(toRamp(config)),
  },
  {
    id: 'favients',
    label: 'Favients',
    group: 'host',
    // Save to the shelf; mint a descriptive facet name when the gradient is anonymous.
    apply: (config, name, source) =>
      useFavientsStore.getState().add(config, name?.trim() || rampToName(toRamp(config)), source),
  },
];

/**
 * Register every gradient bin into BOTH kernels. Idempotent by id (re-registering
 * replaces), so a hot-reload or a double call is harmless. Call once at boot.
 */
export const registerGradientBins = (): void => {
  for (const bin of BINS) {
    // (b) drop path + dock rendering.
    registerDropWell({
      id: bin.id,
      label: bin.label,
      accepts: (types) => types.includes(FAVIENT_DND_MIME),
      onDrop: (dt) => {
        const p = readFavientDrag(dt);
        if (p) bin.apply(p.config, p.name, p.source);
      },
    });
    // (c) click path (the SendToMenu twin; the dock resolves a clicked bin to this).
    registerSendTarget<FavientDragPayload>({
      id: bin.id,
      label: bin.label,
      group: bin.group,
      apply: (p) => bin.apply(p.config, p.name, p.source),
    });
  }
};
