/**
 * PresetFieldRegistry — extensible scene-level (non-feature) preset fields.
 *
 * Feature state is auto-round-tripped via the featureRegistry iteration in
 * PresetLogic. But a scene also carries non-feature state: camera rotation,
 * target distance, saved-camera library, and whatever app-level scalars a
 * future app decides to persist. Historically these were hardcoded in
 * PresetLogic.applyPresetState + fractalStore.getPreset — which meant adding
 * a new top-level preset field required editing two files in the engine core.
 *
 * This registry externalizes that surface. Each field declares its own
 * serialize/deserialize pair; PresetLogic and getPreset just iterate.
 * See docs/20_Fragility_Audit.md F3 for the audit finding this fix addresses.
 *
 * Canonical fields (camera rot / target distance / saved cameras) are
 * registered by defaultPresetFields.ts at store construction; a future
 * @engine/camera plugin will own them instead.
 */

import type { Preset } from '../types';

export interface PresetField {
    /** Top-level key in Preset (e.g. 'savedCameras', 'cameraRot'). */
    key: string;

    /** Extract the field's value from the live store state. Return undefined
     *  to omit the key from the serialized preset. */
    serialize: (state: any) => any;

    /** Apply the field's value from a loaded preset to the live store.
     *  Called regardless of whether the key is present — implementations
     *  should guard on undefined themselves. */
    deserialize: (
        preset: Partial<Preset>,
        set: (partial: Record<string, unknown>) => void,
        get: () => Record<string, unknown>,
    ) => void;
}

export class PresetFieldFrozenError extends Error {
    constructor(key: string) {
        super(
            `Preset field "${key}" registered after registry was frozen. ` +
            `All preset fields must register before createEngineStore runs. ` +
            `See docs/04_Core_Plugins.md § scene-io.`
        );
        this.name = 'PresetFieldFrozenError';
    }
}

export class DuplicatePresetFieldError extends Error {
    constructor(key: string) {
        super(`Duplicate preset field key: "${key}". Keys must be unique.`);
        this.name = 'DuplicatePresetFieldError';
    }
}

class PresetFieldRegistry {
    private fields = new Map<string, PresetField>();
    private frozen = false;

    public register(field: PresetField) {
        const existing = this.fields.get(field.key);

        if (existing) {
            // Same field object — HMR no-op.
            if (existing === field) return;
            if (import.meta.env.DEV) {
                console.warn(
                    `[PresetFieldRegistry] Replacing field "${field.key}" ` +
                    `(likely HMR). If unexpected, check for duplicate registrations.`
                );
                this.fields.set(field.key, field);
                return;
            }
            throw new DuplicatePresetFieldError(field.key);
        }

        if (this.frozen) {
            const err = new PresetFieldFrozenError(field.key);
            if (import.meta.env.DEV) throw err;
            console.warn(`[PresetFieldRegistry] ${err.message}`);
            return;
        }

        this.fields.set(field.key, field);
    }

    public freeze() { this.frozen = true; }
    public isFrozen() { return this.frozen; }

    /** Iterate every registered field, calling its deserialize. */
    public applyAll(
        preset: Partial<Preset>,
        set: (partial: Record<string, unknown>) => void,
        get: () => Record<string, unknown>,
    ) {
        for (const field of this.fields.values()) {
            field.deserialize(preset, set, get);
        }
    }

    /** Collect serialized values from every registered field. Keys whose
     *  serialize returns undefined are omitted. */
    public serializeAll(state: any): Record<string, any> {
        const out: Record<string, any> = {};
        for (const field of this.fields.values()) {
            const value = field.serialize(state);
            if (value !== undefined) out[field.key] = value;
        }
        return out;
    }
}

export const presetFieldRegistry = new PresetFieldRegistry();
