/**
 * curveFitPref — the one place that decides WHICH knot placement the curve fit uses.
 *
 * `palette/core/channelCurve.ts` takes placement as an OPTION because that half of the
 * library is store-free and portable. This module owns the preference behind that option:
 * a persisted tri-state, resolved per call.
 *
 *   auto (default) — precise placement on a desktop, Douglas-Peucker on a phone
 *   on             — precise everywhere
 *   off            — Douglas-Peucker everywhere
 *
 * WHY TRI-STATE RATHER THAN A BOOLEAN. A boolean whose default depends on the device has to
 * be seeded from the device at first read and then persisted, so a user who once opened the
 * app on a phone carries that answer to their desktop. `auto` keeps the device rule live and
 * only persists an actual override — the same shape `ui-mode` already uses for the same
 * reason (grep `uiModePreference`).
 *
 * WHY A PHONE DEFAULTS OFF. Precise placement measured 0.01-0.20 ms per 3-channel fit on a
 * desktop against 0.01-0.09 ms for Douglas-Peucker, and the Curves face re-fits TWICE per
 * Detail-drag frame (`Tray.tsx`'s `ghost` and `ghostPoints` memos). That is comfortable on a
 * desk and not obviously so on a phone, where the same frame also carries a bigger share of
 * React and paint — so the cheap placement is the phone default until someone measures the
 * phone rather than reasons about it. The keys cost ~18% more; nothing else differs, and the
 * `eps` bound holds either way.
 *
 * @assumption The phone predicate is the engine store's `isDeviceMobile`, the same flag
 *   `useIsPhone` reads, so the fit and the shell cannot disagree about what a phone is.
 */

import { useEngineStore } from '../../store/engineStore';
import { safeLocalGet, safeLocalSet } from '../../store/safeLocalStorage';

export type CurveFitPref = 'auto' | 'on' | 'off';
export type KnotPlacement = 'dp' | 'optimal';

const KEY = 'gmt.palette.curveFitPlacement';
const isPref = (v: string | null): v is CurveFitPref => v === 'auto' || v === 'on' || v === 'off';

let cached: CurveFitPref | null = null;
const listeners = new Set<() => void>();

export const getCurveFitPref = (): CurveFitPref => {
  if (cached === null) {
    const raw = safeLocalGet(KEY);
    cached = isPref(raw) ? raw : 'auto';
  }
  return cached;
};

export const setCurveFitPref = (v: CurveFitPref): void => {
  cached = v;
  safeLocalSet(KEY, v);
  listeners.forEach((cb) => cb());
};

/** For the Settings panel's `subscribe`, so the control re-reads after a change. */
export const subscribeCurveFitPref = (cb: () => void): (() => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

/**
 * The placement to hand `rampToBezierTrack` right now. Read at fit time, never cached
 * alongside the tracks — `auto` has to see a live resize (a rotate, a window drag), which is
 * exactly why `isDeviceMobile` is a live store flag rather than a boot-time media query.
 */
export const resolveKnotPlacement = (): KnotPlacement => {
  const pref = getCurveFitPref();
  if (pref === 'on') return 'optimal';
  if (pref === 'off') return 'dp';
  return useEngineStore.getState().isDeviceMobile ? 'dp' : 'optimal';
};
