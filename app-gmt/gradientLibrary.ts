/**
 * gradientLibrary — "favourite gradients" persistence for app-gmt (Picker Phase 5).
 *
 * Wires GMT's generic state-library primitive (createStateLibrarySlice via
 * installStateLibrary) to the fractal's COLOURING. The single "active slot" is
 * coloring layer 1's `gradient` — capture() snapshots whatever gradient is currently
 * applied, apply() puts a saved one back via the gradientSeam. So a gradient picked
 * (or generated) and auditioned on the fractal can be saved and recalled later, even
 * after the live colour has changed.
 *
 * (The slice's doc-comment flags asset-POOL libraries as a poor fit, but a saved
 * gradient maps cleanly onto the single-active-slot model here: "active" = the live
 * coloring gradient, exactly like the camera / view libraries.)
 *
 * Unlike the camera/view libraries (session-only), favourites are persisted to
 * localStorage so they survive a reload — a separate key from GMF scene save, additive
 * and isolated. Slot hotkeys (1..9) are NOT bound (cameras own those); there's no
 * topbar menu — save/manage happens in the Palette Picker overlay.
 */

import { useEngineStore } from '../store/engineStore';
import { installStateLibrary } from '../engine/store/installStateLibrary';
import type { StateSnapshot } from '../engine/store/createStateLibrarySlice';
import { applyGradientConfig } from '../palette/core/gradientSeam';
import { renderStopsToBuffer } from '../palette/core/gmtGradient';
import type { GradientConfig, GradientStop, BlendColorSpace } from '../types';

export const GRADIENT_LIBRARY_KEY = 'savedGradients';
const LS_KEY = 'gmt.savedGradients.v1';

type Coloring = { gradient?: GradientStop[] | GradientConfig } | undefined;

const DEFAULT_STOPS: GradientStop[] = [
  { id: 'a', position: 0, color: '#000000', bias: 0.5, interpolation: 'linear' },
  { id: 'b', position: 1, color: '#ffffff', bias: 0.5, interpolation: 'linear' },
];

/** A coloring gradient is `GradientStop[]` (legacy) or a `GradientConfig`. Normalise to
 *  a config so the library stores one consistent shape. Applied configs are 'linear'
 *  (the shader's space) — match that so a recalled favourite reproduces exactly. */
const toConfig = (g: GradientStop[] | GradientConfig | undefined): GradientConfig => {
  if (g && !Array.isArray(g) && Array.isArray((g as GradientConfig).stops)) {
    const cfg = g as GradientConfig;
    return { stops: cfg.stops, colorSpace: cfg.colorSpace ?? 'linear', blendSpace: cfg.blendSpace ?? 'oklab' };
  }
  const stops = Array.isArray(g) && g.length ? g : DEFAULT_STOPS;
  return { stops, colorSpace: 'linear', blendSpace: 'oklab' };
};

const captureGradient = (): GradientConfig => {
  const coloring = (useEngineStore.getState() as unknown as { coloring?: Coloring }).coloring;
  return toConfig(coloring?.gradient);
};

const applyGradient = (cfg: GradientConfig): void => { applyGradientConfig(cfg, 1); };

const stopsKey = (cfg: GradientConfig): string =>
  JSON.stringify((cfg.stops ?? []).map((s) => [s.position, s.color, s.bias, s.interpolation]));

export const isGradientModified = (snap: GradientConfig): boolean => stopsKey(snap) !== stopsKey(captureGradient());

/** A small JPEG strip of the gradient for the library row thumbnail. Renders the stops
 *  in display sRGB (the swatch should look like the gradient, not its linear encoding). */
const captureGradientThumbnail = async (): Promise<string | undefined> => {
  try {
    const cfg = captureGradient();
    if (typeof document === 'undefined') return undefined;
    const ramp = renderStopsToBuffer(cfg.stops ?? DEFAULT_STOPS, (cfg.blendSpace as BlendColorSpace) ?? 'oklab', 'srgb');
    const src = document.createElement('canvas');
    src.width = 256; src.height = 1;
    src.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(ramp), 256, 1), 0, 0);
    const out = document.createElement('canvas');
    out.width = 64; out.height = 16;
    const ctx = out.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(src, 0, 0, 256, 1, 0, 0, 64, 16);
    return out.toDataURL('image/jpeg', 0.75);
  } catch {
    return undefined;
  }
};

// ── localStorage persistence ────────────────────────────────────────────
// Favourites should survive a reload. The slice itself is session-only (persistence is
// app-side per its contract), so we hydrate on install and write on every change.

const readStored = (): StateSnapshot<GradientConfig>[] => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
};

const writeStored = (arr: StateSnapshot<GradientConfig>[]): void => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch { /* quota / private mode — ignore */ }
};

export const installGradientLibrary = (): void => {
  installStateLibrary<GradientConfig>({
    panelId: 'Gradient Library',
    arrayKey: GRADIENT_LIBRARY_KEY,
    activeIdKey: 'activeGradientId',
    actions: {
      add: 'addGradient',
      update: 'updateGradient',
      delete: 'deleteGradient',
      duplicate: 'duplicateGradient',
      select: 'selectGradient',
      reorder: 'reorderGradients',
      saveToSlot: 'saveGradientToSlot',
      reset: 'resetGradient',
    },
    defaultLabelPrefix: 'Gradient',
    capture: captureGradient,
    apply: applyGradient,
    isModified: isGradientModified,
    captureThumbnail: captureGradientThumbnail,
    // Cameras own 1..9 / Mod+1..9 — don't double-bind. No topbar menu: the Picker
    // overlay drives save/manage.
    slotShortcuts: false,
    menu: null,
  });

  // Hydrate persisted favourites, then mirror every change back to localStorage.
  const stored = readStored();
  if (stored.length) (useEngineStore.setState as (p: Record<string, unknown>) => void)({ [GRADIENT_LIBRARY_KEY]: stored });

  let last = (useEngineStore.getState() as unknown as Record<string, unknown>)[GRADIENT_LIBRARY_KEY];
  useEngineStore.subscribe(() => {
    const cur = (useEngineStore.getState() as unknown as Record<string, unknown>)[GRADIENT_LIBRARY_KEY];
    if (cur !== last) {
      last = cur;
      writeStored((cur as StateSnapshot<GradientConfig>[]) ?? []);
    }
  });
};
