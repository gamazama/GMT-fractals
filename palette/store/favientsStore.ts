/**
 * favientsStore — the "Favients" shelf: a persistent collection of favourite
 * gradients shared across every GMT app (same-origin localStorage key
 * `gmt.favients`) and across sessions.
 *
 * Each favourite is stored as a GMT `GradientConfig` (stops = the interchange
 * representation), so a click / drag applies cleanly to any target — a generator
 * slot (via a 256-ramp) or a fractal coloring layer (the config directly). Ramp-only
 * sources (img2grad) get `fitRampToStops`'d into a config at favourite-time by the
 * caller, so this store never has to know about raw ramps.
 *
 * Host-agnostic: no engine-store dependency. Apps register their apply targets in
 * favientTargets; this store only holds the collection + the chosen target id.
 */

import { create } from 'zustand';
import type { GradientConfig } from '../../types';

export interface Favient {
  id: string;
  name: string;
  /** Provenance label, e.g. "Generator", "Image · distill", "Picker · Turbo". */
  source?: string;
  config: GradientConfig;
  createdAt: number;
}

const LS_KEY = 'gmt.favients';
const LS_TARGET = 'gmt.favients.target';

const hasLS = (): boolean => {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
};

const loadFavients = (): Favient[] => {
  if (!hasLS()) return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    // Keep only well-formed entries (defends against schema drift).
    return arr.filter((f) => f && typeof f.id === 'string' && f.config && Array.isArray(f.config.stops));
  } catch {
    return [];
  }
};

const saveFavients = (favients: Favient[]): void => {
  if (!hasLS()) return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(favients));
  } catch {
    /* quota / disabled — silent */
  }
};

const loadTarget = (): string | null => {
  if (!hasLS()) return null;
  try {
    return window.localStorage.getItem(LS_TARGET);
  } catch {
    return null;
  }
};

const saveTarget = (id: string | null): void => {
  if (!hasLS()) return;
  try {
    if (id) window.localStorage.setItem(LS_TARGET, id);
    else window.localStorage.removeItem(LS_TARGET);
  } catch {
    /* silent */
  }
};

/**
 * Content signature for dedupe + the star toggle: rounded stop positions + colours +
 * interpolation. Two gradients with the same stops favourite/unfavourite as one.
 */
export const favientSig = (c: GradientConfig): string =>
  c.stops
    .map((s) => `${Math.round(s.position * 1000)}:${s.color.toUpperCase()}:${s.interpolation ?? 'l'}`)
    .join('|');

let _seq = 0;
const newId = (): string => `fav-${Date.now().toString(36)}-${_seq++}`;

interface FavientsState {
  favients: Favient[];
  /** The currently selected apply target (id into favientTargets). */
  selectedTargetId: string | null;

  add: (config: GradientConfig, name: string, source?: string) => string;
  remove: (id: string) => void;
  /** Toggle a gradient by content: add if absent, remove if present. Returns the
   *  new favourited state (true = now a favourite). */
  toggle: (config: GradientConfig, name: string, source?: string) => boolean;
  isFav: (config: GradientConfig) => boolean;
  rename: (id: string, name: string) => void;
  clear: () => void;
  setSelectedTarget: (id: string | null) => void;
}

export const useFavientsStore = create<FavientsState>((set, get) => ({
  favients: loadFavients(),
  selectedTargetId: loadTarget(),

  add: (config, name, source) => {
    const fav: Favient = { id: newId(), name, source, config, createdAt: Date.now() };
    const favients = [fav, ...get().favients];
    saveFavients(favients);
    set({ favients });
    return fav.id;
  },

  remove: (id) => {
    const favients = get().favients.filter((f) => f.id !== id);
    saveFavients(favients);
    set({ favients });
  },

  toggle: (config, name, source) => {
    const sig = favientSig(config);
    const existing = get().favients.filter((f) => favientSig(f.config) === sig);
    if (existing.length) {
      const ids = new Set(existing.map((f) => f.id));
      const favients = get().favients.filter((f) => !ids.has(f.id));
      saveFavients(favients);
      set({ favients });
      return false;
    }
    get().add(config, name, source);
    return true;
  },

  isFav: (config) => {
    const sig = favientSig(config);
    return get().favients.some((f) => favientSig(f.config) === sig);
  },

  rename: (id, name) => {
    const favients = get().favients.map((f) => (f.id === id ? { ...f, name } : f));
    saveFavients(favients);
    set({ favients });
  },

  clear: () => {
    saveFavients([]);
    set({ favients: [] });
  },

  setSelectedTarget: (id) => {
    saveTarget(id);
    set({ selectedTargetId: id });
  },
}));
