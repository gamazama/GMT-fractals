
import { useEngineStore } from '../store/engineStore';
import type { UiModePreference } from '../types';

const detectIsMobileDevice = (): boolean =>
    typeof window !== 'undefined' &&
    (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768);

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
        const isDeviceMobile = detectIsMobileDevice();
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
