import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { FractalState, FractalActions, FormulaType, LfoTarget, PanelId } from '../../types';
import Slider from '../Slider';
import { registry } from '../../engine/FractalRegistry';
import { FormulaSelect } from './formula/FormulaSelect';
import { LfoList } from './formula/LfoList';
import { useFractalStore } from '../../store/fractalStore';
import { useAnimationStore } from '../../store/animationStore';
import { collectHelpIds } from '../../utils/helpUtils';
import { buildFormulaContextMenu } from './formula/FormulaSelect';
import { DiceIcon, AlertIcon } from '../Icons';
import { nodeRegistry } from '../../engine/NodeRegistry';
import { AutoFeaturePanel } from '../AutoFeaturePanel';
import ToggleSwitch from '../ToggleSwitch';
import { SectionLabel } from '../SectionLabel';
import { StatusDot } from '../StatusDot';
import { FractalEvents } from '../../engine/FractalEvents';
import { getProxy } from '../../engine/worker/WorkerProxy';
const engine = getProxy();
import Dropdown from '../Dropdown';
import { Vector2Input, Vector3Input } from '../vector-input';

// --- Hybrid Box Fold Section (two collapsible sub-sections: Compile Settings + Parameters) ---
import { CollapsibleSection } from '../CollapsibleSection';

const HybridBoxSection: React.FC<{ state: FractalState }> = ({ state }) => {
    const [localPending, setLocalPending] = useState<Record<string, any>>({});
    const geom = state.geometry;
    const isOn = geom.hybridMode;
    const isCompiled = geom.hybridCompiled;

    // Merge store state with local pending for compile-time params display
    const mergedState = useMemo(() => ({
        ...geom,
        ...localPending,
        // Force these true so compile-time param conditions pass in the whitelist panel
        hybridCompiled: true,
        hybridMode: true,
    }), [geom, localPending]);

    const hasPendingChanges = Object.keys(localPending).length > 0;
    const needsCompile = isOn && (!isCompiled || hasPendingChanges);

    // Toggle hybrid on/off — instant via runtime uniform
    const handleToggle = useCallback((val: boolean) => {
        useFractalStore.getState().setGeometry({ hybridMode: val });
    }, []);

    // Handle compile-time param changes (stored locally until compile)
    const handleCompileParamChange = useCallback((key: string, value: any) => {
        setLocalPending(prev => {
            const next = { ...prev, [key]: value };
            if ((geom as any)[key] === value) delete next[key];
            return next;
        });
    }, [geom]);

    // Compile: apply local pending changes + ensure hybridCompiled is true
    const handleCompile = useCallback(() => {
        FractalEvents.emit('is_compiling', "Compiling Hybrid Shader...");
        setTimeout(() => {
            const updates: Record<string, any> = { ...localPending };
            if (!isCompiled) updates.hybridCompiled = true;
            useFractalStore.getState().setGeometry(updates);
            setLocalPending({});
        }, 50);
    }, [localPending, isCompiled]);

    return (
        <div className="border-t border-white/5" data-help-id="hybrid.mode">
            {/* Main Header — non-collapsible */}
            <div
                className={`flex items-center justify-between px-3 py-1 select-none ${!isOn ? 'cursor-pointer hover:bg-white/5' : ''}`}
                onClick={!isOn ? () => handleToggle(true) : undefined}
            >
                <div className="flex items-center gap-1.5">
                    <SectionLabel color={isOn ? 'text-gray-300' : 'text-gray-600'}>Hybrid Box Fold</SectionLabel>
                    {!isOn && <SectionLabel variant="tiny" className="ml-1">off</SectionLabel>}
                    {isOn && isCompiled && !hasPendingChanges && (
                        <StatusDot status="active" />
                    )}
                    {isOn && needsCompile && (
                        <StatusDot status="pending" />
                    )}
                </div>
                <div className="w-10" onClick={e => e.stopPropagation()}>
                    <ToggleSwitch value={isOn} onChange={handleToggle} />
                </div>
            </div>

            {/* Sub-sections (only when hybrid is on) */}
            {isOn && (
                <div className="pb-1">
                    {/* --- Compile Settings sub-section --- */}
                    <CollapsibleSection label="Compile Settings" defaultOpen={false}>
                        <div className="ml-1 px-1">
                            <AutoFeaturePanel
                                featureId="geometry"
                                whitelistParams={['hybridFoldType', 'hybridComplex', 'hybridSwap', 'hybridPermute']}
                                forcedState={mergedState}
                                onChangeOverride={handleCompileParamChange}
                            />
                            {needsCompile && (
                                <div className="flex items-center justify-between px-2 py-1 mt-1 bg-amber-900/20 border border-amber-500/20 rounded">
                                    <div className="flex items-center gap-1.5 text-amber-400">
                                        <AlertIcon />
                                        <SectionLabel variant="secondary" color="text-amber-400">
                                            {!isCompiled ? 'Not compiled' : 'Settings changed'}
                                        </SectionLabel>
                                    </div>
                                    <button
                                        onClick={handleCompile}
                                        className="px-3 py-0.5 bg-amber-600 hover:bg-amber-500 text-black text-[9px] font-bold rounded transition-colors"
                                    >
                                        {!isCompiled ? 'Compile' : 'Recompile'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </CollapsibleSection>

                    {/* --- Parameters sub-section (only when compiled) --- */}
                    {isCompiled && (
                        <CollapsibleSection label="Parameters" defaultOpen={true}>
                            <div className="ml-1 px-1">
                                <AutoFeaturePanel
                                    featureId="geometry"
                                    groupFilter="hybrid"
                                    excludeParams={['hybridMode']}
                                />
                            </div>
                        </CollapsibleSection>
                    )}
                </div>
            )}
        </div>
    );
};

interface FormulaParam {
    label: string;
    val: number | { x: number; y: number } | { x: number; y: number; z: number };
    set: (v: any) => void;
    min: number;
    max: number;
    step: number;
    def: number | { x: number; y: number } | { x: number; y: number; z: number };
    id: LfoTarget;
    trackId: string;
    scale?: 'linear' | 'log' | 'pi'; // Add scale to local interface
    options?: { label: string; value: number }[];
    type?: 'float' | 'vec2' | 'vec3';
    mode?: 'rotation' | 'direction' | 'axes' | 'toggle' | 'mixed' | 'normal'; // For vec3: rotation = Rodrigues (A/P/∠), direction = azimuth/pitch, axes = per-axis angles, toggle = bool on/off, mixed = toggle+slider, normal = X/Y/Z
    linkable?: boolean; // For vec3/vec2: enable axis linking for uniform scale
}

const FormulaPanel = ({ state, actions, onSwitchTab }: { state: FractalState, actions: FractalActions, onSwitchTab?: (tab: PanelId) => void }) => {
  const openGlobalMenu = useFractalStore(s => s.openContextMenu);
  const [loadTime, setLoadTime] = useState<string | null>(null);

  // Animation Store Access for Auto-Keying
  const { isRecording, currentFrame, addKeyframe, addTrack, sequence } = useAnimationStore();

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

  // Helper to batch record updates
  const recordUpdates = (prefix: string, updates: Record<string, number>) => {
      if (!isRecording) return;
      Object.entries(updates).forEach(([key, val]) => {
          const tid = `${prefix}.${key}`;
          if (!sequence.tracks[tid]) {
              // Try to find a nice label from registry or just use ID
              let label = key;
              if (prefix === 'coreMath') {
                 const def = registry.get(state.formula);
                 const p = def?.parameters.find(param => param?.id === key);
                 if (p) label = p.label;
              } else if (prefix === 'geometry') {
                 if (key === 'juliaX') label = 'Julia X';
                 else if (key === 'juliaY') label = 'Julia Y';
                 else if (key === 'juliaZ') label = 'Julia Z';
                 else if (key === 'hybridScale') label = 'Box Scale';
              }
              addTrack(tid, label);
          }
          addKeyframe(tid, currentFrame, val);
      });
  };



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
                return { label: p.label, val, set, min: p.min, max: p.max, step: p.step, def: p.default, id: p.id, trackId: `coreMath.${p.id}`, type: 'vec3', mode: p.mode, linkable: p.linkable };
            }
            if (p.type === 'vec2') {
                let val = coreMath.vec2A;
                let set = (v: any) => actions.setCoreMath({ vec2A: v });
                switch(p.id) {
                    case 'vec2A': val = coreMath.vec2A; set = (v) => actions.setCoreMath({ vec2A: v }); break;
                    case 'vec2B': val = coreMath.vec2B; set = (v) => actions.setCoreMath({ vec2B: v }); break;
                    case 'vec2C': val = coreMath.vec2C; set = (v) => actions.setCoreMath({ vec2C: v }); break;
                }
                return { label: p.label, val, set, min: p.min, max: p.max, step: p.step, def: p.default, id: p.id, trackId: `coreMath.${p.id}`, type: 'vec2', mode: p.mode, linkable: p.linkable };
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
      // Standard or Log
      return <Slider key={p.id} label={p.label} value={val} min={p.min} max={p.max} step={p.step} onChange={p.set} defaultValue={p.def as number} highlight={hasLfo || (p.id === 'paramA' && !hasLfo)} trackId={p.trackId} liveValue={liveVal} />;
  };

  const switchFormula = (f: FormulaType) => { actions.setFormula(f); if (f === 'Modular' && onSwitchTab) onSwitchTab('Graph'); };

  return (
    <div className="animate-fade-in -mx-4 -mt-4 min-h-full" onContextMenu={handlePanelContextMenu}>
       <div className="bg-gray-800/20 border-b border-white/5 p-4 pb-3" data-help-id="formula.active">
           <div className="flex justify-between items-baseline mb-1">
                <SectionLabel color="text-gray-500">Active Formula</SectionLabel>
                {loadTime && <span className="text-[9px] text-gray-500 animate-fade-in">{loadTime}</span>}
           </div>
           <FormulaSelect value={state.formula} onChange={switchFormula} />
       </div>
       
        <div className="flex flex-col" data-help-id={`panel.formula formula.${state.formula?.toLowerCase() || 'mandelbulb'}`}>
             <Slider label="Iterations" value={coreMath.iterations} min={1} max={500} step={1} onChange={(v) => actions.setCoreMath({ iterations: Math.round(v) })} highlight defaultValue={32} customMapping={{ min: 0, max: 100, toSlider: (val) => 100 * Math.pow((val - 1) / 499, 1/3), fromSlider: (val) => 1 + 499 * Math.pow(val / 100, 3) }} mapTextInput={false} trackId="coreMath.iterations" liveValue={state.liveModulations['coreMath.iterations']} />
             {/* Formula params (scalar and vector) rendered via getParams/renderControl */}
             <>{params.map(p => renderControl(p))}</>
        </div>

        {/* Rounded divider: grey cap with rounded bottom, then black gap */}
        <div className="bg-white/[0.06] h-1.5 rounded-b-lg" />
        <div className="h-1" />

        <div className="border-t border-white/5" data-help-id="formula.transform">
            <AutoFeaturePanel featureId="geometry" groupFilter="transform" />
            {state.geometry.preRotEnabled && state.geometry.preRotMaster && (
                <div className="ml-2 mb-px">
                    <Vector3Input
                        label="Local Rotation"
                        value={new THREE.Vector3(state.geometry.preRotX, state.geometry.preRotY, state.geometry.preRotZ)}
                        min={-Math.PI}
                        max={Math.PI}
                        step={0.01}
                        onChange={(v) => {
                            const v3 = v as THREE.Vector3;
                            actions.setGeometry({ preRotX: v3.x, preRotY: v3.y, preRotZ: v3.z });
                            recordUpdates('geometry', { preRotX: v3.x, preRotY: v3.y, preRotZ: v3.z });
                        }}
                        mode="rotation"
                        trackKeys={['geometry.preRotX', 'geometry.preRotY', 'geometry.preRotZ']}
                        trackLabels={['Spin X', 'Spin Y', 'Spin Z']}
                        defaultValue={new THREE.Vector3(0, 0, 0)}
                    />
                </div>
            )}
       </div>

       <div className="border-t border-white/5" data-help-id="julia.mode">
           {/* Toggle only — whitelistParams suppresses customUI */}
           <AutoFeaturePanel featureId="geometry" whitelistParams={['juliaMode']} />
           {state.geometry.juliaMode && (
               <div className="ml-2 flex flex-col">
                   <div className="mb-px">
                       <Vector3Input
                           label="Julia Coordinate"
                           value={new THREE.Vector3(state.geometry.juliaX, state.geometry.juliaY, state.geometry.juliaZ)}
                           min={-2.0}
                           max={2.0}
                           step={0.01}
                           onChange={(v) => {
                               const v3 = v as THREE.Vector3;
                               actions.setGeometry({ juliaX: v3.x, juliaY: v3.y, juliaZ: v3.z });
                               recordUpdates('geometry', { juliaX: v3.x, juliaY: v3.y, juliaZ: v3.z });
                           }}
                           trackKeys={['geometry.juliaX', 'geometry.juliaY', 'geometry.juliaZ']}
                           trackLabels={['Julia X', 'Julia Y', 'Julia Z']}
                           defaultValue={new THREE.Vector3(0, 0, 0)}
                       />
                   </div>
                   {/* Pick Coordinate rendered via customUI + randomize button */}
                   <div className="flex gap-px">
                       <div className="flex-1">
                           <AutoFeaturePanel featureId="geometry" groupFilter="julia" excludeParams={['juliaMode']} />
                       </div>
                       <button
                           onClick={() => {
                               const s = useFractalStore.getState();
                               s.handleInteractionStart('param');
                               s.setGeometry({
                                   juliaX: s.geometry.juliaX + (Math.random() * 2 - 1) * 0.5,
                                   juliaY: s.geometry.juliaY + (Math.random() * 2 - 1) * 0.5,
                                   juliaZ: s.geometry.juliaZ + (Math.random() * 2 - 1) * 0.5,
                               });
                               s.handleInteractionEnd();
                           }}
                           className="w-8 flex items-center justify-center bg-gray-900 border border-gray-700 hover:border-cyan-500/50 hover:bg-cyan-500/10 text-gray-400 hover:text-cyan-300 rounded transition-colors"
                           title="Randomize Julia coordinate"
                       >
                           <DiceIcon />
                       </button>
                   </div>
               </div>
           )}
       </div>

       <HybridBoxSection state={state} />

       <LfoList state={state} actions={actions} />

       {state.showHints && (
            <div className="text-[9px] text-gray-600 text-center mt-6 pb-2 opacity-50 font-mono">
                PRESS 'H' TO HIDE HINTS
            </div>
       )}
    </div>
  );
};

export default FormulaPanel;