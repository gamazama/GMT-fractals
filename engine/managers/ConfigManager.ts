/**
 * ConfigManager — generic shader-config diffing.
 *
 * Owns the authoritative ShaderConfig object. On every `update(newConfig)`
 * call, iterates the feature registry and diffs incoming values against
 * the current config, classifying each change as:
 *   - compile-time   → shader recompile required (onUpdate: 'compile')
 *   - runtime        → uniform update only (onUpdate: 'uniform' or default)
 *   - accum-reset    → requires rendering accumulation to restart
 *
 * Engine-level fields (formula, renderMode, compilerHardCap, isMobile,
 * pipelineRevision) are diffed directly on the root.
 *
 * Apps that want richer diffing behavior (per-formula preset injection,
 * pipeline-aware revision bumping, compile-time estimation) layer that
 * on top — the engine stays generic.
 */

import type { ShaderConfig } from '../ShaderFactory';
import { featureRegistry } from '../FeatureSystem';
import * as THREE from 'three';
import { DEFAULT_HARD_CAP } from '../../data/constants';

export interface ConfigUpdateResult {
    rebuildNeeded: boolean;
    uniformUpdate: boolean;
    modeChanged: boolean;
    needsAccumReset: boolean;
}

export class ConfigManager {
    public config: ShaderConfig;
    private uniformToPath: Map<string, { featureId: string; paramId: string; isCompileTime: boolean }> = new Map();

    constructor(initialConfig: ShaderConfig) {
        this.config = { ...initialConfig };
        this.buildUniformMap();
    }

    public rebuildMap() {
        this.uniformToPath.clear();
        this.buildUniformMap();
    }

    private buildUniformMap() {
        for (const feat of featureRegistry.getAll()) {
            for (const [paramId, param] of Object.entries(feat.params)) {
                if (param.uniform) {
                    this.uniformToPath.set(param.uniform, {
                        featureId: feat.id,
                        paramId,
                        isCompileTime: param.onUpdate === 'compile',
                    });
                }
            }
        }
    }

    public syncUniform(uniformName: string, value: any) {
        const path = this.uniformToPath.get(uniformName);
        if (!path) return;
        if (path.isCompileTime) return;
        // Derived gradient buffers are not source data — skip.
        if (value && (value as any).isGradientBuffer) return;

        const { featureId, paramId } = path;
        if (!(this.config as any)[featureId]) (this.config as any)[featureId] = {};
        (this.config as any)[featureId][paramId] = value;
    }

    private areValuesEqual(a: any, b: any): boolean {
        if (a === b) return true;
        if (a === null || a === undefined || b === null || b === undefined) return a === b;

        if (typeof a === 'number' && typeof b === 'number') {
            return Math.abs(a - b) < 1e-6;
        }

        if (typeof a === 'object' && typeof b === 'object') {
            if (a.isColor && b.isColor) {
                return Math.abs(a.r - b.r) < 1e-6 && Math.abs(a.g - b.g) < 1e-6 && Math.abs(a.b - b.b) < 1e-6;
            }
            if (a.isVector3 && b.isVector3) {
                return Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6 && Math.abs(a.z - b.z) < 1e-6;
            }
            if (a.isVector2 && b.isVector2) {
                return Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
            }
            if (a.isVector3 || b.isVector3) {
                const va = a.isVector3 ? a : new THREE.Vector3(a.x, a.y, a.z);
                const vb = b.isVector3 ? b : new THREE.Vector3(b.x, b.y, b.z);
                return Math.abs(va.x - vb.x) < 1e-6 && Math.abs(va.y - vb.y) < 1e-6 && Math.abs(va.z - vb.z) < 1e-6;
            }
            if (a.isVector2 || b.isVector2) {
                const va = a.isVector2 ? a : new THREE.Vector2(a.x, a.y);
                const vb = b.isVector2 ? b : new THREE.Vector2(b.x, b.y);
                return Math.abs(va.x - vb.x) < 1e-6 && Math.abs(va.y - vb.y) < 1e-6;
            }
            if (a.isColor || b.isColor) {
                const ca = a.isColor ? a : new THREE.Color(a);
                const cb = b.isColor ? b : new THREE.Color(b);
                return Math.abs(ca.r - cb.r) < 1e-6 && Math.abs(ca.g - cb.g) < 1e-6 && Math.abs(ca.b - cb.b) < 1e-6;
            }
            if (Array.isArray(a) && Array.isArray(b)) {
                if (a.length !== b.length) return false;
                return JSON.stringify(a) === JSON.stringify(b);
            }
        }
        return false;
    }

    public update(newConfig: Partial<ShaderConfig>, runtimeState: any): ConfigUpdateResult {
        // Ensure hardware cap has a value — consumers expect it set.
        if (newConfig.compilerHardCap === undefined) {
            newConfig.compilerHardCap =
                runtimeState?.quality?.compilerHardCap ||
                runtimeState?.compilerHardCap ||
                DEFAULT_HARD_CAP;
        }

        if (newConfig.renderMode === undefined) newConfig.renderMode = runtimeState?.renderMode;
        if ((newConfig as any).isMobile === undefined) (newConfig as any).isMobile = runtimeState?.isMobile;

        let rebuildNeeded = false;
        let uniformUpdate = false;
        let modeChanged = false;
        let needsAccumReset = false;

        // ── Per-feature diffing (generic, driven by feature registry) ──
        for (const feat of featureRegistry.getAll()) {
            const incoming = (newConfig as any)[feat.id];
            if (!incoming) continue;

            const existing = (this.config as any)[feat.id] || {};

            for (const paramKey in incoming) {
                const paramConfig = feat.params[paramKey];
                if (!paramConfig) continue;
                const newVal = incoming[paramKey];
                const oldVal = existing[paramKey] !== undefined ? existing[paramKey] : paramConfig.default;

                if (paramConfig.onUpdate === 'compile' && !this.areValuesEqual(newVal, oldVal)) {
                    rebuildNeeded = true;
                }
                if (!paramConfig.noReset && !this.areValuesEqual(newVal, oldVal)) {
                    needsAccumReset = true;
                }
            }

            (this.config as any)[feat.id] = { ...existing, ...incoming };
            uniformUpdate = true;
        }

        // ── Root-level engine fields ──
        if (newConfig.formula !== undefined && newConfig.formula !== this.config.formula) {
            this.config.formula = newConfig.formula;
            rebuildNeeded = true;
        }

        if (newConfig.renderMode !== undefined && newConfig.renderMode !== this.config.renderMode) {
            this.config.renderMode = newConfig.renderMode;
            modeChanged = true;
        }

        if (newConfig.compilerHardCap !== undefined && newConfig.compilerHardCap !== this.config.compilerHardCap) {
            this.config.compilerHardCap = newConfig.compilerHardCap;
            rebuildNeeded = true;
        }

        if ((newConfig as any).isMobile !== undefined && (newConfig as any).isMobile !== (this.config as any).isMobile) {
            (this.config as any).isMobile = (newConfig as any).isMobile;
            rebuildNeeded = true;
        }

        // Plugin-supplied pipelineRevision — apps that maintain a graph/pipeline
        // structure bump this to trigger recompile when structural changes occur.
        if (newConfig.pipelineRevision !== undefined && newConfig.pipelineRevision !== this.config.pipelineRevision) {
            this.config.pipelineRevision = newConfig.pipelineRevision;
            rebuildNeeded = true;
        }

        return { rebuildNeeded, uniformUpdate, modeChanged, needsAccumReset };
    }
}
