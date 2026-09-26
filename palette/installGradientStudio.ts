/**
 * installGradientStudio — bring up GMT's Gradient Studio in a host: the panel's manifest entry,
 * its component, the popout in every gradient editor's header, the Paint face's sink, and the
 * close watcher that bakes a live face. app-gmt calls it; the Explorer never does (it IS the
 * faces' first host), and fluid-toy does not today — nothing in here is GMT-specific, so it could.
 *
 *   • `gradientStudioPanelEntry()` — spread into the host's `applyPanelManifest` list. A float
 *     panel with BARE chrome (`PanelDefinition.chrome`): no title bar, float-only, the card's
 *     name row is its handle; closed at boot (the manifest's default).
 *   • `installGradientStudio()` — registrations; call before the first render, after
 *     `registerPaletteUI()` (so the popout sits after the ★ in the editor header).
 *   • `mountGradientStudio()` — the close watcher; call AFTER `applyPanelManifest`.
 *
 * @see palette/store/gradientStudio.ts (what the Studio does) · palette/components/GradientStudioPanel.tsx
 */

import React from 'react';
import type { PanelDefinition } from '../engine/PanelManifest';
import { componentRegistry } from '../components/registry/ComponentRegistry';
import { setGradientEditorEntrance } from '../components/gradient/gradientEditorEntrance';
import { useEngineStore } from '../store/engineStore';
import { makeRampGradient } from '../utils/gradientRamp';
import { setPaintSink } from './store/paintStore';
import {
  STUDIO_PANEL_ID,
  useGradientStudio,
  closeGradientStudio,
  readTargetConfig,
  writeTarget,
} from './store/gradientStudio';
import { lazyWithFallback } from '../components/ui/lazyWithFallback';
import { GradientStudioEntrance } from './components/GradientStudioEntrance';

// The window carries the stops editor, the curve editor and the paint face, so it loads when it
// first opens (the inline editor is lazy for the same reason — grep `lazyWithFallback` in
// AutoFeaturePanel). A failed chunk shows the reload notice in the window, not a dead app.
const LazyStudioPanel = lazyWithFallback(() => import('./components/GradientStudioPanel'), 'The Gradient Studio');
const StudioPanelHost: React.FC = () => React.createElement(React.Suspense, { fallback: null }, React.createElement(LazyStudioPanel));

export const gradientStudioPanelEntry = (opts: { order?: number } = {}): PanelDefinition => ({
  id: STUDIO_PANEL_ID,
  label: 'Gradient Studio',
  dock: 'float',
  order: opts.order ?? 95,
  component: 'panel-gradient-studio',
  isCore: false,
  // the hero card IS the window (its name row drags it, its sides resize it) and it never docks
  chrome: 'bare',
});

export const installGradientStudio = (): void => {
  componentRegistry.register('panel-gradient-studio', StudioPanelHost);
  setGradientEditorEntrance({
    id: 'gradient-studio',
    render: (ctx) => React.createElement(GradientStudioEntrance, { featureId: ctx.featureId, paramKey: ctx.paramKey, host: ctx.host }),
  });
  // Paint's Apply lands on the param the Studio is on, as a ramp in that param's colour space
  // (inside commitPaint's undo group).
  setPaintSink({
    write: (ramp) => {
      const t = useGradientStudio.getState().target;
      if (!t) return;
      const src = readTargetConfig(t);
      writeTarget(t, makeRampGradient(ramp, src?.colorSpace ?? 'srgb', src?.blendSpace ?? 'oklab'));
    },
  });
};

/** Closing the window commits a live face, as leaving it by a tab does. Watching the store (not
 *  the panel's unmount) because a docked panel also unmounts when another tab is chosen, and
 *  that is not a close. */
export const mountGradientStudio = (): void => {
  const isOpen = (s: unknown): boolean => !!(s as { panels?: Record<string, { isOpen?: boolean }> }).panels?.[STUDIO_PANEL_ID]?.isOpen;
  let wasOpen = isOpen(useEngineStore.getState());
  useEngineStore.subscribe((s) => {
    const open = isOpen(s);
    if (open === wasOpen) return;
    wasOpen = open;
    // after the close's own `set` has finished — the bake writes the store too
    if (!open) queueMicrotask(closeGradientStudio);
  });
};
