
import type { ContextMenuItem } from '../../../types/help';
import type { LightParams } from '../../../types';
import type { FalloffType, IntensityUnit } from '../../../types/graphics';
import { getLightFromSlice } from '../index';
import { useEngineStore } from '../../../../store/engineStore';

/**
 * Builds the shared core context-menu sections for a single light:
 * Light Type, Intensity Unit, Falloff Curve.
 *
 * @param index     Index into lighting.lights
 * @param onUpdate  Called with param patches. Caller wraps with handleInteractionStart/End.
 */
export function buildCoreLightMenuItems(
    index: number,
    onUpdate: (params: Partial<LightParams>) => void
): ContextMenuItem[] {
    const light = getLightFromSlice(useEngineStore.getState().lighting, index);

    return [
        { label: 'Light Type', isHeader: true },
        {
            label: 'Point',
            checked: light.type === 'Point',
            action: () => onUpdate({ type: 'Point' })
        },
        {
            label: 'Directional (Sun)',
            checked: light.type === 'Directional',
            action: () => onUpdate({ type: 'Directional' })
        },
        { label: 'Intensity Unit', isHeader: true },
        {
            label: 'Raw (Linear)',
            checked: (light.intensityUnit ?? 'raw') === 'raw',
            action: () => {
                const l = getLightFromSlice(useEngineStore.getState().lighting, index);
                if (l.intensityUnit === 'ev') {
                    const linear = Math.pow(2, l.intensity);
                    onUpdate({ intensityUnit: 'raw' as IntensityUnit, intensity: Math.round(linear * 100) / 100 });
                } else {
                    onUpdate({ intensityUnit: 'raw' as IntensityUnit });
                }
            }
        },
        {
            label: 'Exposure (EV)',
            checked: light.intensityUnit === 'ev',
            action: () => {
                const l = getLightFromSlice(useEngineStore.getState().lighting, index);
                if ((l.intensityUnit ?? 'raw') === 'raw') {
                    const ev = l.intensity > 0 ? Math.max(-4, Math.min(10, Math.log2(l.intensity))) : 0;
                    onUpdate({ intensityUnit: 'ev' as IntensityUnit, intensity: Math.round(ev * 10) / 10 });
                } else {
                    onUpdate({ intensityUnit: 'ev' as IntensityUnit });
                }
            }
        },
        { label: 'Falloff Curve', isHeader: true },
        {
            label: 'Quadratic (Smooth)',
            checked: (light.falloffType ?? 'Quadratic') === 'Quadratic',
            action: () => onUpdate({ falloffType: 'Quadratic' as FalloffType })
        },
        {
            label: 'Linear (Artistic)',
            checked: light.falloffType === 'Linear',
            action: () => onUpdate({ falloffType: 'Linear' as FalloffType })
        },
    ];
}
