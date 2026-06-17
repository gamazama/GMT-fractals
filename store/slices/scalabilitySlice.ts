/**
 * Quality / scalability slice — master preset + per-subsystem tier
 * overrides. Generic: subsystems are declared in `types/viewport.ts`
 * (`ALL_SUBSYSTEMS`, `SCALABILITY_PRESETS`), apps using the tier system
 * get the behaviour for free.
 *
 * Ported verbatim from `h:/GMT/gmt-0.8.5/store/slices/scalabilitySlice.ts`
 * with only an import-path rewrite. Used by the Viewport Quality topbar
 * dropdown (engine-gmt/topbar/ViewportQuality.tsx) and any app that opts
 * into tier-based quality scaling.
 *
 * Late-bound `getShaderConfigFromState` via `bindGetShaderConfig` —
 * breaks the circular dep between engineStore and this slice.
 */

import type { ScalabilityState, HardwareProfile } from '../../types/viewport';
import {
    ALL_SUBSYSTEMS,
    SCALABILITY_PRESETS,
    DEFAULT_SCALABILITY,
    detectScalabilityPreset,
} from '../../types/viewport';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';

let _getShaderConfig: ((state: any) => any) | null = null;

export function bindGetShaderConfig(fn: (state: any) => any) {
    _getShaderConfig = fn;
}

function applyTierOverrides(subsystems: Record<string, number>, get: any) {
    const state = get();
    const updatesByFeature: Record<string, Record<string, any>> = {};

    for (const sub of ALL_SUBSYSTEMS) {
        const tierIndex = subsystems[sub.id] ?? 0;
        const tier = sub.tiers[tierIndex];
        if (!tier) continue;

        for (const [featureId, overrides] of Object.entries(tier.overrides)) {
            if (!updatesByFeature[featureId]) updatesByFeature[featureId] = {};
            Object.assign(updatesByFeature[featureId], overrides);
        }
    }

    for (const [featureId, updates] of Object.entries(updatesByFeature)) {
        const setterName = `set${featureId.charAt(0).toUpperCase() + featureId.slice(1)}`;
        const setter = state[setterName];
        if (typeof setter === 'function') {
            setter(updates);
        }
    }
}

function flushConfig(get: any) {
    if (!_getShaderConfig) return;
    const fullConfig = _getShaderConfig(get());
    FractalEvents.emit(FRACTAL_EVENTS.CONFIG, fullConfig);
}

export const createScalabilitySlice = (set: any, get: any) => ({
    // --- State ---
    scalability: { ...DEFAULT_SCALABILITY } as ScalabilityState,
    hardwareProfile: null as HardwareProfile | null,

    // --- Actions ---

    applyScalabilityPreset: (presetId: string) => {
        const preset = SCALABILITY_PRESETS.find(p => p.id === presetId);
        if (!preset) return;

        set({
            scalability: {
                activePreset: presetId,
                subsystems: { ...preset.subsystems },
                isCustomized: false,
            } satisfies ScalabilityState,
        });

        applyTierOverrides(preset.subsystems, get);
    },

    setSubsystemTier: (subsystemId: string, tier: number) => {
        const current = get().scalability as ScalabilityState;
        const newSubsystems = { ...current.subsystems, [subsystemId]: tier };

        let isCustomized = false;
        if (current.activePreset) {
            const preset = SCALABILITY_PRESETS.find(p => p.id === current.activePreset);
            if (preset) {
                isCustomized = Object.keys(newSubsystems).some(
                    k => newSubsystems[k] !== preset.subsystems[k]
                );
            }
        } else {
            isCustomized = true;
        }

        const detected = detectScalabilityPreset(newSubsystems);

        set({
            scalability: {
                activePreset: detected ?? current.activePreset,
                subsystems: newSubsystems,
                isCustomized: detected ? false : isCustomized,
            } satisfies ScalabilityState,
        });

        applyTierOverrides(newSubsystems, get);
    },

    setHardwareProfile: (profile: HardwareProfile) => {
        set({ hardwareProfile: profile });

        const state = get();
        const setQuality = state.setQuality;
        if (typeof setQuality === 'function') {
            setQuality({
                compilerHardCap: profile.caps.compilerHardCap,
                precisionMode: profile.caps.precisionMode,
                bufferPrecision: profile.caps.bufferPrecision,
            });
        }

        flushConfig(get);
    },
});
