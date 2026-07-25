
import * as THREE from 'three';
import { getProxy } from '../../engine/worker/WorkerProxy';
const engine = getProxy();
import { useEngineStore } from '../../store/engineStore';
import { modulationEngine } from '../../engine/features/modulation/ModulationEngine';
import { featureRegistry } from '../../engine/FeatureSystem';
import { classifyModulationTarget } from '../../engine/features/modulation/targetRouting';
import { composeModulatedValue } from '../../engine/features/modulation/paramMapping';

/**
 * Apply modulations (LFOs + rules) for a given export time.
 * Simplified version of AnimationSystem's per-frame logic — no recording, no UI feedback.
 * Sets uniforms via engine.setUniform() (forwarded to worker) and engine.modulations dict.
 */
export function applyExportModulations(time: number, dt: number) {
    const storeState = useEngineStore.getState();
    const animations = storeState.animations;
    const lfosEnabled = storeState.lfosEnabled;
    const audioEnabled = (storeState as any).audio?.isEnabled ?? false;

    // 1. Reset
    modulationEngine.resetOffsets();
    engine.modulations = {};

    // 2. Update oscillators
    modulationEngine.updateOscillators(animations, time, dt, lfosEnabled);

    // 3. Apply modulation rules
    const modulationSlice = (storeState as any).modulation;
    if (modulationSlice && modulationSlice.rules) {
        modulationEngine.update(modulationSlice.rules, dt, audioEnabled, lfosEnabled);
    }

    // 4. Apply offsets to uniforms
    const offsets = modulationEngine.offsets;
    let juliaDirty = false;
    let juliaX = 0, juliaY = 0, juliaZ = 0;

    for (const targetKey of Object.keys(offsets)) {
        const offset = offsets[targetKey];
        if (Math.abs(offset) < 0.000001) continue;

        // Compose exactly as AnimationSystem's tick does — same resolver, same
        // curve. This file is a second dispatcher over the same offsets, so any
        // drift here shows up as an export that doesn't match the preview.
        // ADR-0108.
        const curve = classifyModulationTarget(targetKey, storeState as unknown as Record<string, unknown>).curve;
        const mod = (b: number) => composeModulatedValue(b, offset, curve);

        // A. Coloring special cases
        if (targetKey === 'coloring.repeats') {
            const c = (storeState as any).coloring;
            if (c && Math.abs(c.repeats) > 0.001) {
                const ratio = c.scale / c.repeats;
                engine.setUniform('uColorScale', mod(c.repeats) * ratio);
            }
            continue;
        }
        if (targetKey === 'coloring.phase') {
            const c = (storeState as any).coloring;
            engine.setUniform('uColorOffset', mod(c?.offset ?? 0));
            continue;
        }
        if (targetKey === 'coloring.repeats2') {
            const c = (storeState as any).coloring;
            if (c && Math.abs(c.repeats2) > 0.001) {
                const ratio = c.scale2 / c.repeats2;
                engine.setUniform('uColorScale2', mod(c.repeats2) * ratio);
            }
            continue;
        }
        if (targetKey === 'coloring.phase2') {
            const c = (storeState as any).coloring;
            engine.setUniform('uColorOffset2', mod(c?.offset2 ?? 0));
            continue;
        }

        // B. Julia vector composite
        if (targetKey.startsWith('julia.') || targetKey.startsWith('geometry.julia')) {
            const g = (storeState as any).geometry;
            if (targetKey.endsWith('juliaX') || targetKey.endsWith('x')) juliaX = mod(g?.juliaX ?? 0);
            else if (targetKey.endsWith('juliaY') || targetKey.endsWith('y')) juliaY = mod(g?.juliaY ?? 0);
            else if (targetKey.endsWith('juliaZ') || targetKey.endsWith('z')) juliaZ = mod(g?.juliaZ ?? 0);
            juliaDirty = true;
            continue;
        }

        // C. Camera modulation (stored in engine.modulations for worker)
        if (targetKey.startsWith('camera.')) {
            engine.modulations[targetKey] = offset;
            continue;
        }

        // D. Geometry pre-rotation (stored in engine.modulations for worker syncFrame)
        if (targetKey.startsWith('geometry.preRot')) {
            engine.modulations[targetKey] = offset;
            continue;
        }

        // E. Lighting array (stored in engine.modulations for worker syncFrame)
        if (targetKey.startsWith('lighting.light')) {
            engine.modulations[targetKey] = offset;
            continue;
        }

        // F. Vector params
        const vectorMatch = targetKey.match(/^(coreMath|geometry)\.(vec[23][ABC])_(x|y|z)$/);
        if (vectorMatch) {
            const featureId = vectorMatch[1];
            const paramName = vectorMatch[2];
            const axis = vectorMatch[3];
            const slice = (storeState as any)[featureId];
            if (slice && slice[paramName]) {
                const vec = slice[paramName];
                const uniformName = 'u' + paramName.charAt(0).toUpperCase() + paramName.slice(1);
                engine.setUniform(uniformName, { ...vec, [axis]: mod(vec[axis] ?? 0) });
            }
            continue;
        }

        // G. Standard feature params via DDFS lookup
        let uniformName = '';
        let baseVal = 0;

        if (targetKey.includes('.')) {
            const [fid, pid] = targetKey.split('.');
            const feat = featureRegistry.get(fid);
            if (feat && feat.params[pid]) {
                uniformName = feat.params[pid].uniform || '';
                const slice = (storeState as any)[fid];
                if (slice) baseVal = slice[pid] ?? 0;
            }
        } else if (targetKey.startsWith('param')) {
            uniformName = 'u' + targetKey.charAt(0).toUpperCase() + targetKey.slice(1);
            baseVal = (storeState as any).coreMath?.[targetKey] ?? 0;
        }

        if (uniformName) {
            engine.setUniform(uniformName, mod(baseVal));
        }
    }

    // Apply julia composite
    if (juliaDirty) {
        const g = (storeState as any).geometry;
        if (!juliaX) juliaX = g?.juliaX ?? 0;
        if (!juliaY) juliaY = g?.juliaY ?? 0;
        if (!juliaZ) juliaZ = g?.juliaZ ?? 0;
        engine.setUniform('uJulia', new THREE.Vector3(juliaX, juliaY, juliaZ));
    }
}
