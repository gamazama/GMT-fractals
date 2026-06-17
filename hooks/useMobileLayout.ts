/**
 * useMobileLayout — mobile-detection state + hooks for the engine.
 *
 * @invariant Importing this module IS the install step — no
 *   `installMobile()` plugin exists. The module-level resize listener
 *   at lines ~25-37 is installed at first import inside
 *   `if (typeof window !== 'undefined')`. If no module ever imports
 *   this file, the engine store's `isDeviceMobile` / `isPortrait` flags
 *   stay at whatever the slice initializer seeded.
 * @invariant The 768px breakpoint lives in `engine/HardwareDetection.ts`
 *   (`isMobileViewport`); this module imports it. q-083 fixed.
 * @invariant Orientation uses strict `innerHeight > innerWidth`
 *   (line ~10). A square viewport counts as LANDSCAPE and will NOT
 *   trigger `LandscapeGate`.
 * @invariant Resize listener is never removed (intentional — module-
 *   level singleton lives for app lifetime, see the inline comment at
 *   lines ~35-37). Under Vite HMR each module re-evaluation leaks one
 *   extra listener for the dev session; bounded by the inequality
 *   guard at line ~30, wiped on full reload. No production impact.
 *   See q-086.
 */

import { useEngineStore } from '../store/engineStore';
import { isMobileViewport } from '../engine/HardwareDetection';
import type { UiModePreference } from '../types';

const detectIsPortrait = (): boolean =>
    typeof window !== 'undefined' && window.innerHeight > window.innerWidth;

const resolveIsMobile = (pref: UiModePreference, isDeviceMobile: boolean): boolean => {
    if (pref === 'mobile') return true;
    if (pref === 'desktop') return false;
    return isDeviceMobile;
};

// Module-level singleton listener. Runs once on first import (ES module
// caching guarantees no duplicates). Writes window-derived state into
// the engine store; consumers read via useMobileLayout / isMobileSnapshot.
//
// Change-detection guard prevents Zustand from notifying subscribers
// when neither flag actually changed — a resize that doesn't cross the
// 768px breakpoint or flip orientation is a no-op.
if (typeof window !== 'undefined') {
    const sync = () => {
        const isDeviceMobile = isMobileViewport();
        const isPortrait = detectIsPortrait();
        const s = useEngineStore.getState();
        if (s.isDeviceMobile !== isDeviceMobile || s.isPortrait !== isPortrait) {
            useEngineStore.setState({ isDeviceMobile, isPortrait });
        }
    };
    window.addEventListener('resize', sync);
    // No removeEventListener — module-level singleton, lives for the
    // lifetime of the app. The store outlives any component.
}

/**
 * Non-reactive snapshot of the current mobile-layout flag, for use in
 * predicates (e.g. menu/topbar `when:` callbacks) where hooks aren't
 * available. Reads from the store, which is kept in sync by the
 * module-level resize listener above.
 *
 * @invariant Non-reactive — reads `useEngineStore.getState()` without
 *   subscribing. Safe inside menu/topbar `when:` predicates re-evaluated
 *   by the host on every relevant store update. UNSAFE inside React
 *   renders: relies on snapshot, will not re-render on preference /
 *   device flips. Use `useMobileLayout()` inside components.
 */
export const isMobileSnapshot = (): boolean => {
    const { uiModePreference, isDeviceMobile } = useEngineStore.getState();
    return resolveIsMobile(uiModePreference, isDeviceMobile);
};

/**
 * Returns the effective mobile-layout flags, factoring in the user's
 * `uiModePreference`. `auto` resolves via `pointer: coarse` / viewport
 * width; `mobile` / `desktop` overrides force the layout regardless
 * of device.
 *
 * Three flags:
 *   - `isMobile`        — preference-aware ("should we render mobile UI?").
 *                          Use for joystick, mobile menu host, hidden chrome.
 *   - `isDeviceMobile`  — raw device-mobile flag, ignores preference.
 *                          Use for things that only make sense on a real
 *                          touch device (address-bar collapse trick,
 *                          scroll-trigger intro). Forcing Mobile UI on
 *                          a desktop browser shouldn't render those.
 *   - `isPortrait`      — actual orientation; rotate-prompt uses directly.
 */
export const useMobileLayout = () => {
    const pref = useEngineStore((s) => s.uiModePreference);
    const isDeviceMobile = useEngineStore((s) => s.isDeviceMobile);
    const isPortrait = useEngineStore((s) => s.isPortrait);
    return { isPortrait, isDeviceMobile, isMobile: resolveIsMobile(pref, isDeviceMobile) };
};
