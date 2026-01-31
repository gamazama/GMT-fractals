
import { useRef, useEffect, useState, useCallback } from 'react';
import { useFractalStore, getShaderConfigFromState } from '../store/fractalStore';
import { engine } from '../engine/FractalEngine';
import { registry } from '../engine/FractalRegistry';
import { parseShareString } from '../utils/Sharing';
import { Preset } from '../types';
import { ENGINE_PROFILES } from '../features/engine/profiles';

const isMobileDevice = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
};

export const useAppStartup = (isSceneReady: boolean) => {
    const state = useFractalStore();
    
    // Store the exact preset used for booting (after optimizations)
    const initialBootPreset = useRef<Preset | null>(null);
    
    // Store manually loaded presets (from LoadingScreen)
    const pendingManualPreset = useRef<Preset | null>(null);
    
    const [startupMode, setStartupMode] = useState<'default' | 'url'>('default');

    // 1. STABLE BOOT FUNCTION
    const bootEngine = useCallback(() => {
        if (engine.isBooted) return;
        console.log("⚡ FractalEngine: Booting...");
        
        // Ensure we have a valid config before booting
        const currentStore = useFractalStore.getState();
        const startConfig = getShaderConfigFromState(currentStore);
        
        try {
            // Critical: Yield to UI thread to allow spinner to render before heavy compile
            setTimeout(() => {
                engine.bootWithConfig(startConfig);
            }, 50);
        } catch (e) {
            console.error("Critical Engine Boot Failure:", e);
        }
    }, []);

    useEffect(() => {
        // 2. Determine Initial Preset
        const hash = window.location.hash;
        let preset: Preset | null = null;
        
        if (hash && hash.startsWith('#s=')) {
            const stateStr = hash.slice(3);
            console.log("App: Found shared state in URL. Parsing...");
            preset = parseShareString(stateStr);
            if (preset) {
                setStartupMode('url');
            }
        }
        
        // If no URL or parse failed, use default for Mandelbulb
        if (!preset) {
             const def = registry.get('Mandelbulb');
             if (def && def.defaultPreset) {
                 preset = JSON.parse(JSON.stringify(def.defaultPreset)) as Preset;
             }
        }

        // 3. Environment Optimizations (Mobile)
        if (preset && isMobileDevice()) {
             console.log("App: Mobile detected. Enforcing Lite profile.");
             if (!preset.features) preset.features = {};
             const liteProfile = ENGINE_PROFILES.lite;
             
             Object.entries(liteProfile).forEach(([featureId, params]) => {
                 if (!preset!.features![featureId]) {
                     preset!.features![featureId] = {};
                 }
                 Object.assign(preset!.features![featureId], params);
             });
        }

        // 4. Load into Store (UI State)
        if (preset) {
            console.log("App: Hydrating Store from Preset...");
            state.loadPreset(preset);
            initialBootPreset.current = preset;
        }

        // Auto-Boot for URL mode (with delay to show spinner)
        if (startupMode === 'url' && preset) {
             // We use a longer delay for URL loads to ensure the heavy initial preset 
             // doesn't freeze the browser before the spinner appears.
             setTimeout(() => {
                 bootEngine();
             }, 500);
        }

        // FAILSAFE: If engine hasn't booted after 4 seconds, force it.
        const safetyTimer = setTimeout(() => {
            if (!engine.isBooted) {
                console.warn("App: Loading Screen timeout. Forcing Engine Boot.");
                bootEngine();
            }
        }, 4000);
        
        return () => clearTimeout(safetyTimer);
    }, [startupMode]); // Added startupMode dependency to handle switch

    // 5. Post-Load Sync
    useEffect(() => {
        if (isSceneReady && engine.isBooted) {
            
            if (initialBootPreset.current) {
                console.log("App: Scene Ready - Syncing Camera/State...");

                // Detect if user switched to Lite Mode during load
                const currentStore = useFractalStore.getState();
                const currentQuality = (currentStore as any).quality;
                const isLiteActive = currentQuality?.precisionMode === 1.0; 

                if (isLiteActive) {
                     const p = initialBootPreset.current;
                     const liteProfile = ENGINE_PROFILES.lite;
                     if (!p.features) p.features = {};
                     Object.entries(liteProfile).forEach(([featureId, params]) => {
                         if (!p.features![featureId]) p.features![featureId] = {};
                         Object.assign(p.features![featureId], params);
                     });
                }

                state.loadPreset(initialBootPreset.current);
                initialBootPreset.current = null;
            }
            
            if (pendingManualPreset.current) {
                console.log("App: Scene Ready - Applying Pending Manual Preset...");
                let p = pendingManualPreset.current;
                
                if (isMobileDevice()) {
                     const liteProfile = ENGINE_PROFILES.lite;
                     if (!p.features) p.features = {};
                     Object.entries(liteProfile).forEach(([featureId, params]) => {
                         if (!p.features![featureId]) p.features![featureId] = {};
                         Object.assign(p.features![featureId], params);
                     });
                }

                state.loadPreset(p);
                pendingManualPreset.current = null;
            }
        }
    }, [isSceneReady]);

    const queuePresetLoad = useCallback((p: Preset) => {
        pendingManualPreset.current = p;
    }, []);

    return { startupMode, queuePresetLoad, bootEngine };
};
