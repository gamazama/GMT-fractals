
import type { ScalabilityState, HardwareProfile } from '../../types/viewport';
import {
    ALL_SUBSYSTEMS,
    SCALABILITY_PRESETS,
    DEFAULT_SCALABILITY,
    detectScalabilityPreset,
} from '../../types/viewport';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';

/**
 * Late-bound reference to getShaderConfigFromState.
 * Set by fractalStore after creation to break the circular dep.
 */
let _getShaderConfig: ((state: any) => any) | null = null;

export function bindGetShaderConfig(fn: (state: any) => any) {
    _getShaderConfig = fn;
}

/**
 * Apply the tier overrides to the store by calling feature setters.
 *
 * This follows the DDFS pattern — feature setters emit CONFIG, ConfigManager
 * diffs and triggers recompile only for compile-time changes. The UI reads
 * the store and sees the correct compiled state.
 */
function applyTierOverrides(subsystems: Record<string, number>, get: any) {
    const state = get();

    // Collect all overrides grouped by feature
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

    // Apply via feature setters (same as EnginePanel.applyPendingChanges)
    for (const [featureId, updates] of Object.entries(updatesByFeature)) {
        const setterName = `set${featureId.charAt(0).toUpperCase() + featureId.slice(1)}`;
        const setter = state[setterName];
        if (typeof setter === 'function') {
            setter(updates);
        }
    }
}

/**
 * Flush hardware caps into getShaderConfigFromState (stage 3 only).
 * Hardware caps aren't feature params — they're applied at the config boundary.
 */
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

    /** Apply a named master preset — sets all subsystem tiers atomically */
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

        // Write tier overrides to store via feature setters.
        // Setters emit CONFIG → ConfigManager diffs → engine recompiles if needed.
        applyTierOverrides(preset.subsystems, get);
    },

    /** Override a single subsystem tier */
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

    /** Set hardware profile (called once at boot from GPU detection) */
    setHardwareProfile: (profile: HardwareProfile) => {
        set({ hardwareProfile: profile });
        // Hardware caps affect getShaderConfigFromState stage 3 — flush
        flushConfig(get);
    },
});
