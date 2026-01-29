
import { ShaderConfig } from '../ShaderFactory';
import { featureRegistry } from '../FeatureSystem';
import * as THREE from 'three';

export interface ConfigUpdateResult {
    rebuildNeeded: boolean;
    uniformUpdate: boolean;
    modeChanged: boolean;
}

export class ConfigManager {
    public config: ShaderConfig;
    // Map uniform name -> { featureId, paramId, isCompileTime }
    private uniformToPath: Map<string, { featureId: string, paramId: string, isCompileTime: boolean }> = new Map();

    constructor(initialConfig: ShaderConfig) {
        this.config = { ...initialConfig };
        this.buildUniformMap();
    }

    public rebuildMap() {
        this.uniformToPath.clear();
        this.buildUniformMap();
    }

    private buildUniformMap() {
        const allFeatures = featureRegistry.getAll();
        allFeatures.forEach(feat => {
            Object.entries(feat.params).forEach(([paramId, config]) => {
                if (config.uniform) {
                    this.uniformToPath.set(config.uniform, { 
                        featureId: feat.id, 
                        paramId,
                        isCompileTime: config.onUpdate === 'compile'
                    });
                }
            });
        });
    }

    public syncUniform(uniformName: string, value: any) {
        const path = this.uniformToPath.get(uniformName);
        if (path) {
            // Skip update if this param requires compilation logic
            if (path.isCompileTime) return;

            const { featureId, paramId } = path;
            if (!(this.config as any)[featureId]) {
                (this.config as any)[featureId] = {};
            }
            (this.config as any)[featureId][paramId] = value;
        }
    }

    private areValuesEqual(a: any, b: any): boolean {
        if (a === b) return true;
        
        // Handle primitives/null/undefined
        if (a === null || a === undefined || b === null || b === undefined) return a === b;
        
        // Handle Numbers with tolerance
        if (typeof a === 'number' && typeof b === 'number') {
            return Math.abs(a - b) < 1e-6;
        }

        // Handle Three.js Types (Color, Vector)
        if (typeof a === 'object' && typeof b === 'object') {
            // Color
            if (a.isColor && b.isColor) {
                return a.getHex() === b.getHex();
            }
            // Vector3
            if (a.isVector3 && b.isVector3) {
                return Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6 && Math.abs(a.z - b.z) < 1e-6;
            }
            // Vector2
            if (a.isVector2 && b.isVector2) {
                return Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
            }
            // Array (Simple shallow check for now)
            if (Array.isArray(a) && Array.isArray(b)) {
                 if (a.length !== b.length) return false;
                 // Deep check arrays? For now assume referential equality or JSON
                 return JSON.stringify(a) === JSON.stringify(b);
            }
        }
        
        return false;
    }

    public update(newConfig: Partial<ShaderConfig>, runtimeState: any): ConfigUpdateResult {
        // Hoist compilerHardCap from quality slice if present
        if ((newConfig as any).quality && (newConfig as any).quality.compilerHardCap !== undefined) {
             newConfig.compilerHardCap = (newConfig as any).quality.compilerHardCap;
        }

        // Fallback to runtime state for critical compiler defines if missing in update
        if (newConfig.compilerHardCap === undefined) {
            newConfig.compilerHardCap = runtimeState.quality?.compilerHardCap || runtimeState.compilerHardCap || 500;
        }
        
        if (newConfig.renderMode === undefined) newConfig.renderMode = runtimeState.renderMode;
        if (newConfig.isMobile === undefined) newConfig.isMobile = runtimeState.isMobile;

        let rebuildNeeded = false;
        let uniformUpdate = false;
        let modeChanged = false;
        
        // --- GENERIC DDFS DIFFING ---
        const allFeatures = featureRegistry.getAll();
        
        for (const feat of allFeatures) {
            if ((newConfig as any)[feat.id]) {
                const newFeatData = (newConfig as any)[feat.id];
                const oldFeatData = (this.config as any)[feat.id] || {};
                
                // Special Handling: Lighting Render Mode Sync
                if (feat.id === 'lighting' && newFeatData.renderMode !== undefined) {
                    const oldMode = oldFeatData.renderMode;
                    if (!this.areValuesEqual(newFeatData.renderMode, oldMode)) {
                        modeChanged = true;
                        this.config.renderMode = newFeatData.renderMode === 1.0 ? 'PathTracing' : 'Direct';
                    }
                }

                // Check for compile-triggers BEFORE merging
                for (const paramKey in newFeatData) {
                    const paramConfig = feat.params[paramKey];
                    if (paramConfig && paramConfig.onUpdate === 'compile') {
                        const newVal = newFeatData[paramKey];
                        // Fix: Fallback to default if old value is missing (initial boot scenario)
                        const oldVal = oldFeatData[paramKey] !== undefined ? oldFeatData[paramKey] : paramConfig.default;
                        
                        if (!this.areValuesEqual(newVal, oldVal)) {
                            // Only log if it's not the initial hydration
                            if (Object.keys(oldFeatData).length > 0) {
                                console.log(`[ConfigManager] Rebuild triggered by ${feat.id}.${paramKey}:`, oldVal, '->', newVal);
                            }
                            rebuildNeeded = true;
                        }
                    }
                }

                // Merge state into the master config
                (this.config as any)[feat.id] = { ...oldFeatData, ...newFeatData };
                uniformUpdate = true;
            }
        }
        
        // --- CORE SYSTEM DIFFS ---
        
        // Formula Switch
        if (newConfig.formula && newConfig.formula !== this.config.formula) { 
            console.log(`[ConfigManager] Formula changed: ${this.config.formula} -> ${newConfig.formula}`);
            this.config.formula = newConfig.formula; 
            rebuildNeeded = true; 
        }
        
        // Render Mode (Root Override)
        if (newConfig.renderMode !== undefined && newConfig.renderMode !== this.config.renderMode) {
             this.config.renderMode = newConfig.renderMode;
             modeChanged = true;
             if (!(this.config as any).lighting) (this.config as any).lighting = {};
             (this.config as any).lighting.renderMode = newConfig.renderMode === 'PathTracing' ? 1.0 : 0.0;
        }
        
        // Hard Cap
        if (newConfig.compilerHardCap !== undefined && newConfig.compilerHardCap !== this.config.compilerHardCap) {
            this.config.compilerHardCap = newConfig.compilerHardCap;
            rebuildNeeded = true;
        }
        
        // Mobile Flag
        if (newConfig.isMobile !== undefined && newConfig.isMobile !== this.config.isMobile) {
            this.config.isMobile = newConfig.isMobile;
            rebuildNeeded = true;
        }

        // Modular Pipeline
        if (newConfig.graph) { 
            this.config.graph = newConfig.graph; 
        }
        
        if (newConfig.pipelineRevision !== undefined && newConfig.pipelineRevision !== this.config.pipelineRevision) {
            this.config.pipelineRevision = newConfig.pipelineRevision;
            if (newConfig.pipeline) this.config.pipeline = newConfig.pipeline;
            
            if (this.config.formula === 'Modular') {
                rebuildNeeded = true;
            }
        } else if (newConfig.pipeline) {
            this.config.pipeline = newConfig.pipeline;
            uniformUpdate = true;
        }
        
        return { rebuildNeeded, uniformUpdate, modeChanged };
    }
}
