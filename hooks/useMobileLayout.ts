
import { useState, useEffect } from 'react';
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

/**
 * Non-reactive snapshot of the current mobile-layout flag, for use in
 * predicates (e.g. menu/topbar `when:` callbacks) where hooks aren't
 * available. Re-evaluated each call. Backed by `uiModePreference` from
 * the store + matchMedia. Will not auto-refresh on viewport resize on
 * its own — the caller's render cycle must be triggered by something
 * else (which it usually is, since topbar items subscribe to state).
 */
export const isMobileSnapshot = (): boolean => {
    const pref = useEngineStore.getState().uiModePreference;
    return resolveIsMobile(pref, detectIsMobileDevice());
};

/**
 * Returns the effective mobile-layout flags, factoring in the user's
 * `uiModePreference` setting. `auto` resolves via `pointer: coarse`
 * media query and viewport width; `mobile` / `desktop` overrides force
 * the layout regardless of device.
 *
 * `isPortrait` always reflects actual orientation (the rotate-prompt
 * gate uses it directly).
 */
export const useMobileLayout = () => {
    const pref = useEngineStore((s) => s.uiModePreference);
    const [isPortrait, setIsPortrait] = useState(detectIsPortrait);
    const [isDeviceMobile, setIsDeviceMobile] = useState(detectIsMobileDevice);

    useEffect(() => {
        const check = () => {
            setIsPortrait(detectIsPortrait());
            setIsDeviceMobile(detectIsMobileDevice());
        };
        window.addEventListener('resize', check);
        check();
        return () => window.removeEventListener('resize', check);
    }, []);

    return { isPortrait, isMobile: resolveIsMobile(pref, isDeviceMobile) };
};
