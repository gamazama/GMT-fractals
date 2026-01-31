
import { StateCreator } from 'zustand';
import { FractalStoreState, FractalActions } from '../../types';
import { FractalEvents } from '../../engine/FractalEvents';
import { Uniforms } from '../../engine/UniformNames';
import { UNIFORM_DEFAULTS } from '../../engine/UniformSchema';
import * as THREE from 'three';

const isMobile = () => {
    if (typeof window === 'undefined') return false;
    return (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) || (window.innerWidth < 768);
};

export type RendererSlice = Pick<FractalStoreState,
    'dpr' | 'aaLevel' | 'msaaSamples' | 'aaMode' | 'accumulation' | 'previewMode' | 'renderMode' |
    'isExporting' | 'renderRegion' | 'isBucketRendering' | 'bucketSize' | 'bucketUpscale' | 'convergenceThreshold' |
    'isPaused' | 'sampleCap'
> & Pick<FractalActions,
    'setDpr' | 'setAALevel' | 'setMSAASamples' | 'setAAMode' | 'setAccumulation' | 'setPreviewMode' | 'setRenderMode' |
    'setIsExporting' | 'setRenderRegion' | 'setIsBucketRendering' | 'setBucketSize' | 'setBucketUpscale' | 'setConvergenceThreshold' |
    'setIsPaused' | 'setSampleCap'
>;

export const createRendererSlice: StateCreator<FractalStoreState & FractalActions, [["zustand/subscribeWithSelector", never]], [], RendererSlice> = (set, get) => ({
    
    dpr: isMobile() ? 1.0 : Math.min(typeof window !== 'undefined' ? (window.devicePixelRatio || 1.0) : 1.0, 2.0),
    aaLevel: 1.0, 
    msaaSamples: 1, 
    aaMode: 'Always', 
    accumulation: true, 
    previewMode: false,
    
    // Fixed: Converted from getter to simple value to prevent init crash.
    // Syncing is handled via subscriptions in fractalStore.ts
    renderMode: 'Direct',
    
    isPaused: false,
    sampleCap: 256, // Default stop after 256 samples

    isExporting: false,
    renderRegion: null,
    
    // Bucket Rendering Defaults
    isBucketRendering: false,
    bucketSize: 128,
    bucketUpscale: 1.0,
    convergenceThreshold: 0.1, // 0.1% default
    
    setDpr: (v) => { set({ dpr: v }); FractalEvents.emit('reset_accum', undefined); },
    setAALevel: (v) => { 
        set({ aaLevel: v }); 
        const { aaMode } = get(); 
        if (aaMode === 'Always' || (aaMode === 'Auto')) { set({ dpr: v }); } 
        FractalEvents.emit('reset_accum', undefined); 
    },
    setMSAASamples: (v) => { 
        set({ msaaSamples: v }); 
        const { aaMode } = get(); 
        if (aaMode === 'Always' || aaMode === 'Auto') { FractalEvents.emit('config', { msaaSamples: v }); } 
        else { FractalEvents.emit('config', { msaaSamples: 1 }); } 
        FractalEvents.emit('reset_accum', undefined); 
    },
    setAAMode: (v) => { 
        set({ aaMode: v }); 
        const { aaLevel, msaaSamples } = get(); 
        if (v === 'Off') { set({ dpr: 1.0 }); FractalEvents.emit('config', { msaaSamples: 1 }); } 
        else { set({ dpr: aaLevel }); FractalEvents.emit('config', { msaaSamples: msaaSamples }); } 
        FractalEvents.emit('reset_accum', undefined); 
    },
    setAccumulation: (v) => { set({ accumulation: v }); FractalEvents.emit('reset_accum', undefined); },
    
    setPreviewMode: (v) => { set({ previewMode: v }); FractalEvents.emit('config', { previewMode: v }); },
    
    setRenderMode: (v) => { 
        // Update Local State for UI
        set({ renderMode: v });
        
        // Proxy to DDFS Action (Source of Truth for Engine)
        // 0.0 = Direct, 1.0 = PathTracing
        const modeValue = v === 'PathTracing' ? 1.0 : 0.0;
        const setLighting = (get() as any).setLighting;
        if (setLighting) {
            setLighting({ renderMode: modeValue });
        }
    },
    
    setIsPaused: (v) => set({ isPaused: v }),
    setSampleCap: (v) => set({ sampleCap: v }),

    setRenderRegion: (r) => {
        set({ renderRegion: r });
        // Use default (0,0) to (1,1) if region is null
        const min = r ? new THREE.Vector2(r.minX, r.minY) : new THREE.Vector2(0, 0);
        const max = r ? new THREE.Vector2(r.maxX, r.maxY) : new THREE.Vector2(1, 1);
        
        FractalEvents.emit('uniform', { key: Uniforms.RegionMin, value: min });
        FractalEvents.emit('uniform', { key: Uniforms.RegionMax, value: max });
        
        // Only reset accumulation if we have a region active, to start sampling it.
        // If clearing region, we also reset to start fresh full screen.
        FractalEvents.emit('reset_accum', undefined); 
    },
    
    setIsBucketRendering: (v) => {
        // Logic moved to BucketRenderControls to avoid recursion loops.
        // This setter now only updates state.
        set({ isBucketRendering: v });
    },
    setBucketSize: (v) => set({ bucketSize: v }),
    setBucketUpscale: (v) => set({ bucketUpscale: v }),
    setConvergenceThreshold: (v) => set({ convergenceThreshold: v }),
    
    setIsExporting: (v) => set({ isExporting: v }),
});
