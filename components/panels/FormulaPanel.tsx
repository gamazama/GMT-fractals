// STYLE: Do not use inline formatting or hardcoded layout for feature params.
// Use DDFS (parentId, condition, group, hidden) to control visibility and nesting.
// Import theme tokens from 'data/theme' instead of raw Tailwind color classes.

import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import { FractalState, FractalActions, FormulaType, LfoTarget, PanelId } from '../../types';
import Slider from '../Slider';
import { registry } from '../../engine/FractalRegistry';
import { FormulaSelect } from './formula/FormulaSelect';
import { LfoList } from './formula/LfoList';
import { useFractalStore } from '../../store/fractalStore';
import { collectHelpIds } from '../../utils/helpUtils';
import { buildFormulaContextMenu } from './formula/FormulaSelect';
import { nodeRegistry } from '../../engine/NodeRegistry';
import { AutoFeaturePanel } from '../AutoFeaturePanel';
import { CompilableFeatureSection } from '../CompilableFeatureSection';
import { SectionLabel, SectionDivider } from '../SectionLabel';
import { FractalEvents } from '../../engine/FractalEvents';
import { text as themeText, border as themeBorder, surface } from '../../data/theme';
import { getProxy } from '../../engine/worker/WorkerProxy';
const engine = getProxy();
import Dropdown from '../Dropdown';
import { Vector2Input, Vector3Input, Vector4Input } from '../vector-input';

interface FormulaParam {
    label: string;
    val: number | { x: number; y: number } | { x: number; y: number; z: number } | { x: number; y: number; z: number; w: number };
    set: (v: any) => void;
    min: number;
    max: number;
    step: number;
    def: number | { x: number; y: number } | { x: number; y: number; z: number } | { x: number; y: number; z: number; w: number };
    id: LfoTarget;
    trackId: string;
    scale?: 'linear' | 'log' | 'pi' | 'degrees'; // Add scale to local interface
    options?: { label: string; value: number }[];
    type?: 'float' | 'vec2' | 'vec3' | 'vec4';
    mode?: 'rotation' | 'direction' | 'axes' | 'toggle' | 'mixed' | 'normal'; // For vec3: rotation = Rodrigues (A/P/∠), direction = azimuth/pitch, axes = per-axis angles, toggle = bool on/off, mixed = toggle+slider, normal = X/Y/Z
    linkable?: boolean; // For vec3/vec2: enable axis linking for uniform scale
}

const FormulaPanel = ({ state, actions, onSwitchTab }: { state: FractalState, actions: FractalActions, onSwitchTab?: (tab: PanelId) => void }) => {
  const openGlobalMenu = useFractalStore(s => s.openContextMenu);
  const [loadTime, setLoadTime] = useState<string | null>(null);


  useEffect(() => {
    // 1. Subscribe to new events
    const unsub = FractalEvents.on('compile_time', (sec) => {
        setLoadTime(`Loaded in ${sec.toFixed(2)}s`);
        setTimeout(() => setLoadTime(null), 5000);
    });

    // 2. Check for missed event (e.g. initial boot)
    if (engine.lastCompileDuration > 0) {
        setLoadTime(`Loaded in ${engine.lastCompileDuration.toFixed(2)}s`);
        setTimeout(() => setLoadTime(null), 3000);
    }
    
    return unsub;
  }, []);
  
  const isMobile = state.debugMobileLayout || (typeof window !== 'undefined' && window.innerWidth < 768);
  const coreMath = state.coreMath;
  if (!coreMath || !state.formula) return null;





  const handlePanelContextMenu = (e: React.MouseEvent) => {
      e.preventDefault(); e.stopPropagation();
      const ids = collectHelpIds(e.target);
      if (state.formula) {
          const specificId = `formula.${state.formula.toLowerCase()}`;
          if (!ids.includes(specificId)) ids.unshift(specificId);
      }
      const items = buildFormulaContextMenu();
      openGlobalMenu(e.clientX, e.clientY, items, ids);
  };

  const getParams = (): (FormulaParam | null)[] => {
    if (state.formula === 'Modular') {
        const boundParams = ['ParamA', 'ParamB', 'ParamC', 'ParamD', 'ParamE', 'ParamF'];
        const mappings: Record<string, { labels: string[], min: number, max: number, step: number }> = {};
        state.pipeline.forEach(node => {
            if (!node.enabled || !node.bindings) return;
            const def = nodeRegistry.get(node.type);
            Object.entries(node.bindings).forEach(([paramKey, targetKey]) => {
                if (targetKey && boundParams.includes(targetKey)) {
                    if (!mappings[targetKey]) mappings[targetKey] = { labels: [], min: -5, max: 5, step: 0.01 };
                    const inputDef = def?.inputs.find(i => i.id === paramKey);
                    if (inputDef) mappings[targetKey].labels.push(`${node.type}: ${inputDef.label}`);
                    else mappings[targetKey].labels.push(`${node.type}: ${paramKey}`);
                }
            });
        });
        return boundParams.map(key => {
            const map = mappings[key];
            const id = key.charAt(0).toLowerCase() + key.slice(1) as LfoTarget; 
            if (!map) return null;
            const label = map.labels.length > 1 ? `${key} (Mixed)` : (map.labels[0] || key);
            let val = 0; let set = (v: number) => {};
            switch(id) {
                case 'paramA': val = coreMath.paramA; set = (v) => actions.setCoreMath({ paramA: v }); break;
                case 'paramB': val = coreMath.paramB; set = (v) => actions.setCoreMath({ paramB: v }); break;
                case 'paramC': val = coreMath.paramC; set = (v) => actions.setCoreMath({ paramC: v }); break;
                case 'paramD': val = coreMath.paramD; set = (v) => actions.setCoreMath({ paramD: v }); break;
                case 'paramE': val = coreMath.paramE; set = (v) => actions.setCoreMath({ paramE: v }); break;
                case 'paramF': val = coreMath.paramF; set = (v) => actions.setCoreMath({ paramF: v }); break;
            }
            return { label, val, set, min: -5.0, max: 5.0, step: 0.01, def: 0.0, id, trackId: `coreMath.${id}`, scale: 'linear' };
        });
    }
    const def = registry.get(state.formula);
    if (def) {
        return def.parameters.map(p => {
            if (!p) return null;
            // Handle vector params
            if (p.type === 'vec3') {
                let val = coreMath.vec3A;
                let set = (v: any) => actions.setCoreMath({ vec3A: v });
                switch(p.id) {
                    case 'vec3A': val = coreMath.vec3A; set = (v) => actions.setCoreMath({ vec3A: v }); break;
                    case 'vec3B': val = coreMath.vec3B; set = (v) => actions.setCoreMath({ vec3B: v }); break;
                    case 'vec3C': val = coreMath.vec3C; set = (v) => actions.setCoreMath({ vec3C: v }); break;
                }
                return { label: p.label, val, set, min: p.min, max: p.max, step: p.step, def: p.default, id: p.id, trackId: `coreMath.${p.id}`, type: 'vec3', mode: p.mode, linkable: p.linkable, scale: p.scale };
            }
            if (p.type === 'vec4') {
                let val = coreMath.vec4A;
                let set = (v: any) => actions.setCoreMath({ vec4A: v });
                switch(p.id) {
                    case 'vec4A': val = coreMath.vec4A; set = (v) => actions.setCoreMath({ vec4A: v }); break;
                    case 'vec4B': val = coreMath.vec4B; set = (v) => actions.setCoreMath({ vec4B: v }); break;
                    case 'vec4C': val = coreMath.vec4C; set = (v) => actions.setCoreMath({ vec4C: v }); break;
                }
                return { label: p.label, val, set, min: p.min, max: p.max, step: p.step, def: p.default, id: p.id, trackId: `coreMath.${p.id}`, type: 'vec4', mode: p.mode, linkable: p.linkable, scale: p.scale };
            }
            if (p.type === 'vec2') {
                let val = coreMath.vec2A;
                let set = (v: any) => actions.setCoreMath({ vec2A: v });
                switch(p.id) {
                    case 'vec2A': val = coreMath.vec2A; set = (v) => actions.setCoreMath({ vec2A: v }); break;
                    case 'vec2B': val = coreMath.vec2B; set = (v) => actions.setCoreMath({ vec2B: v }); break;
                    case 'vec2C': val = coreMath.vec2C; set = (v) => actions.setCoreMath({ vec2C: v }); break;
                }
                return { label: p.label, val, set, min: p.min, max: p.max, step: p.step, def: p.default, id: p.id, trackId: `coreMath.${p.id}`, type: 'vec2', mode: p.mode, linkable: p.linkable, scale: p.scale };
            }
            // Handle scalar params
            let val = 0; let set = (v: number) => {};
            switch(p.id) {
                case 'paramA': val = coreMath.paramA; set = (v) => actions.setCoreMath({ paramA: v }); break;
                case 'paramB': val = coreMath.paramB; set = (v) => actions.setCoreMath({ paramB: v }); break;
                case 'paramC': val = coreMath.paramC; set = (v) => actions.setCoreMath({ paramC: v }); break;
                case 'paramD': val = coreMath.paramD; set = (v) => actions.setCoreMath({ paramD: v }); break;
                case 'paramE': val = coreMath.paramE; set = (v) => actions.setCoreMath({ paramE: v }); break;
                case 'paramF': val = coreMath.paramF; set = (v) => actions.setCoreMath({ paramF: v }); break;
            }
            // Pass the scale property from definition to the local object
            return { label: p.label, val, set, min: p.min, max: p.max, step: p.step, def: p.default, id: p.id, trackId: `coreMath.${p.id}`, scale: p.scale, options: p.options };
        });
    }
    
    return [{ label: 'Power (N)', val: coreMath.paramA, set: (v) => actions.setCoreMath({ paramA: v }), min: 2.0, max: 16.0, step: 0.001, def: 8.0, id: 'paramA', trackId: 'coreMath.paramA' }, null, null, null];
  };
  const params = getParams();

  const renderControl = (p: FormulaParam | null) => {
      if (!p) return null;

      // Handle vec3 type
      if (p.type === 'vec3') {
          const v3 = p.val as { x: number; y: number; z: number };
          const vec = new THREE.Vector3(v3.x, v3.y, v3.z);
          // Generate track keys for animation (x, y, z components) - using underscore format like lighting.light0_posX
          const trackKeys = [`${p.trackId}_x`, `${p.trackId}_y`, `${p.trackId}_z`];
          const trackLabels = [`${p.label} X`, `${p.label} Y`, `${p.label} Z`];
          
          // Pass mode directly from formula definition — no auto-detection
          const vecMode = p.mode || 'normal';
          const isAngleMode = vecMode === 'rotation' || vecMode === 'direction' || vecMode === 'axes';
          const rotTrackLabels: Record<string, string[]> = {
              rotation: ['Azimuth', 'Pitch', 'Angle'],
              direction: ['Azimuth', 'Pitch', 'Length'],
              axes: [`${p.label} X`, `${p.label} Y`, `${p.label} Z`],
          };

          return (
              <div key={p.id} className="mb-px">
                  <Vector3Input
                      label={p.label}
                      value={vec}
                      min={isAngleMode ? -Math.PI * 2 : p.min}
                      max={isAngleMode ? Math.PI * 2 : p.max}
                      step={p.step}
                      onChange={p.set}
                      trackKeys={trackKeys}
                      trackLabels={isAngleMode ? (rotTrackLabels[vecMode] || trackLabels) : trackLabels}
                      mode={vecMode === 'axes' ? 'normal' : vecMode as any}
                      defaultValue={p.def ? new THREE.Vector3((p.def as any).x ?? 0, (p.def as any).y ?? 0, (p.def as any).z ?? 0) : undefined}
                      linkable={p.linkable}
                      scale={p.scale}
                  />
              </div>
          );
      }

      // Handle vec4 type
      if (p.type === 'vec4') {
          const v4 = p.val as { x: number; y: number; z: number; w: number };
          const vec = new THREE.Vector4(v4.x, v4.y, v4.z, v4.w);
          const trackKeys = [`${p.trackId}_x`, `${p.trackId}_y`, `${p.trackId}_z`, `${p.trackId}_w`];
          const trackLabels = [`${p.label} X`, `${p.label} Y`, `${p.label} Z`, `${p.label} W`];
          return (
              <div key={p.id} className="mb-px">
                  <Vector4Input
                      label={p.label}
                      value={vec}
                      min={p.min}
                      max={p.max}
                      step={p.step}
                      onChange={p.set}
                      trackKeys={trackKeys}
                      trackLabels={trackLabels}
                      defaultValue={p.def ? new THREE.Vector4((p.def as any).x ?? 0, (p.def as any).y ?? 0, (p.def as any).z ?? 0, (p.def as any).w ?? 0) : undefined}
                      linkable={p.linkable}
                      scale={p.scale}
                  />
              </div>
          );
      }

      // Handle vec2 type
      if (p.type === 'vec2') {
          const v2 = p.val as { x: number; y: number };
          const trackKeys = [`${p.trackId}_x`, `${p.trackId}_y`];
          const trackLabels = [`${p.label} X`, `${p.label} Y`];
          return (
              <div key={p.id} className="mb-px">
                  <Vector2Input
                      label={p.label}
                      value={new THREE.Vector2(v2.x, v2.y)}
                      min={p.min}
                      max={p.max}
                      step={p.step}
                      onChange={(v) => p.set({ x: v.x, y: v.y })}
                      trackKeys={trackKeys}
                      trackLabels={trackLabels}
                      defaultValue={p.def ? new THREE.Vector2((p.def as any).x ?? 0, (p.def as any).y ?? 0) : undefined}
                      linkable={p.linkable}
                      mode={p.mode}
                      scale={p.scale}
                  />
              </div>
          );
      }

      // Scalar params below
      const val = p.val as number;

      if (p.options) {
        return (
            <div key={p.id} className="mb-px">
                <Dropdown
                    label={p.label}
                    value={val}
                    options={p.options}
                    onChange={(v) => p.set(v as number)}
                    fullWidth
                />
            </div>
        );
      }

      const liveVal = state.liveModulations[p.trackId] ?? state.liveModulations[p.id];
      const hasLfo = state.animations.some(a => a.enabled && (a.target === p.trackId || a.target === p.id));
      
      // Explicit PI scaling based on definition, NOT on name regex.
      if (p.scale === 'pi') {
          return (
              <Slider 
                 key={p.id} label={p.label} value={val} min={p.min} max={p.max} step={0.01} 
                 onChange={p.set} defaultValue={p.def as number} highlight={hasLfo || (p.id === 'paramA' && !hasLfo)} 
                 trackId={p.trackId} liveValue={liveVal} 
                 customMapping={{ 
                     min: p.min / Math.PI, 
                     max: p.max / Math.PI, 
                     toSlider: (v) => v / Math.PI, 
                     fromSlider: (v) => v * Math.PI 
                 }} 
                 mapTextInput={true} 
                 overrideInputText={`${(val / Math.PI).toFixed(2)}π`}
              />
          );
      }
      // Degrees scale: internal value is in degrees (for Fragmentarium GLSL), display as π notation.
      // e.g. 360° displays as "2.00π", 90° as "0.50π"
      if (p.scale === 'degrees') {
          const D2PI = 1 / 180; // degrees → π coefficient
          return (
              <Slider
                 key={p.id} label={p.label} value={val} min={p.min} max={p.max} step={p.step}
                 onChange={p.set} defaultValue={p.def as number} highlight={hasLfo || (p.id === 'paramA' && !hasLfo)}
                 trackId={p.trackId} liveValue={liveVal}
                 customMapping={{
                     min: p.min * D2PI,
                     max: p.max * D2PI,
                     toSlider: (v) => v * D2PI,
                     fromSlider: (v) => v / D2PI
                 }}
                 mapTextInput={true}
                 overrideInputText={`${(val * D2PI).toFixed(2)}π`}
              />
          );
      }
      // Standard or Log
      return <Slider key={p.id} label={p.label} value={val} min={p.min} max={p.max} step={p.step} onChange={p.set} defaultValue={p.def as number} highlight={hasLfo || (p.id === 'paramA' && !hasLfo)} trackId={p.trackId} liveValue={liveVal} />;
  };

  const switchFormula = (f: FormulaType) => { actions.setFormula(f); if (f === 'Modular' && onSwitchTab) onSwitchTab('Graph'); };

  return (
    <div className="animate-fade-in -mx-4 -mt-4 min-h-full flex flex-col" onContextMenu={handlePanelContextMenu}>
       <div className={`${surface.panelHeader} border-b ${themeBorder.subtle} p-4 pb-3`} data-help-id="formula.active">
           <div className="flex justify-between items-baseline mb-1">
                <SectionLabel color={themeText.dimLabel}>Active Formula</SectionLabel>
                {loadTime && <span className={`text-[9px] ${themeText.dimLabel} animate-fade-in`}>{loadTime}</span>}
           </div>
           <FormulaSelect value={state.formula} onChange={switchFormula} />
       </div>
       
        <div className="flex flex-col" data-help-id={`panel.formula formula.${state.formula?.toLowerCase() || 'mandelbulb'}`}>
             <Slider label="Iterations" value={coreMath.iterations} min={1} max={500} step={1} onChange={(v) => actions.setCoreMath({ iterations: Math.round(v) })} highlight defaultValue={32} customMapping={{ min: 0, max: 100, toSlider: (val) => 100 * Math.pow((val - 1) / 499, 1/3), fromSlider: (val) => 1 + 499 * Math.pow(val / 100, 3) }} mapTextInput={false} trackId="coreMath.iterations" liveValue={state.liveModulations['coreMath.iterations']} />
             {/* Formula params (scalar and vector) rendered via getParams/renderControl */}
             <>{params.map(p => renderControl(p))}</>
        </div>

        <SectionDivider />

        <div className={`border-t ${themeBorder.subtle}`} data-help-id="formula.transform">
            <AutoFeaturePanel featureId="geometry" groupFilter="transform" />
       </div>

       <div className={`border-t ${themeBorder.subtle}`}>
           <AutoFeaturePanel featureId="geometry" groupFilter="burning" />
       </div>

       <SectionDivider />

       <div className={`border-t ${themeBorder.subtle}`} data-help-id="julia.mode">
           <AutoFeaturePanel featureId="geometry" groupFilter="julia" />
       </div>

       <SectionDivider />

       <CompilableFeatureSection
           featureId="geometry"
           label="Hybrid Box Fold"
           compileParam="hybridCompiled"
           runtimeToggleParam="hybridMode"
           compileSettingsParams={['hybridFoldType', 'hybridComplex', 'hybridSwap', 'hybridPermute']}
           runtimeGroup="hybrid"
           runtimeExcludeParams={['hybridMode']}
           compileMessage="Compiling Hybrid Shader..."
           helpId="hybrid.mode"
       />

       <SectionDivider />

       <LfoList state={state} actions={actions} />

       {state.showHints && (
            <div className={`text-[9px] ${themeText.faint} text-center mt-6 pb-2 opacity-50 font-mono`}>
                PRESS 'H' TO HIDE HINTS
            </div>
       )}
    </div>
  );
};

export default FormulaPanel;