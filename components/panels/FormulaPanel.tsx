import React, { useState, useEffect } from 'react';
import { FractalState, FractalActions, FormulaType, LfoTarget, PanelId } from '../../types';
import Slider from '../Slider';
import { registry } from '../../engine/FractalRegistry';
import { FormulaSelect } from './formula/FormulaSelect';
import { LfoList } from './formula/LfoList';
import { useFractalStore } from '../../store/fractalStore';
import { useAnimationStore } from '../../store/animationStore';
import { collectHelpIds } from '../../utils/helpUtils';
import { ContextMenuItem } from '../../types/help';
import { DiceIcon, ShuffleIcon } from '../Icons';
import { nodeRegistry } from '../../engine/NodeRegistry';
import { AutoFeaturePanel } from '../AutoFeaturePanel';
import { FractalEvents } from '../../engine/FractalEvents';
import { engine } from '../../engine/FractalEngine';
import Dropdown from '../Dropdown';

interface FormulaParam {
    label: string;
    val: number;
    set: (v: number) => void;
    min: number;
    max: number;
    step: number;
    def: number;
    id: LfoTarget;
    trackId: string;
    scale?: 'linear' | 'log' | 'pi'; // Add scale to local interface
    options?: { label: string; value: number }[];
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

  const applyRandomParams = () => {
      const updates: any = {};

      if (state.formula === 'Modular') {
          const genericRand = () => (Math.random() * 4 - 2); 
          updates.paramA = genericRand();
          updates.paramB = genericRand();
          updates.paramC = genericRand();
          updates.paramD = genericRand();
          updates.paramE = genericRand();
          updates.paramF = genericRand();
          
          actions.setCoreMath(updates);
          recordUpdates('coreMath', updates);
          return;
      }
      
      const def = registry.get(state.formula);
      if (!def) return;
      
      def.parameters.forEach(p => {
          if (!p) return;
          const range = p.max - p.min;
          const r = Math.random() * range + p.min;
          const val = p.step > 0 ? Math.round(r / p.step) * p.step : r;
          updates[p.id] = val;
      });
      
      actions.setCoreMath(updates);
      recordUpdates('coreMath', updates);
  };

  const randomizeParams = () => { actions.handleInteractionStart('param'); applyRandomParams(); actions.handleInteractionEnd(); };

  const randomizeAll = () => {
      actions.handleInteractionStart('param');
      applyRandomParams();
      
      const geoUpdates: any = {};
      if (state.geometry.hybridMode) {
          geoUpdates.hybridScale = 1.5 + Math.random() * 1.5;
          geoUpdates.hybridMinR = Math.random() * 1.0;
          geoUpdates.hybridFixedR = 0.5 + Math.random() * 1.5;
          geoUpdates.hybridFoldLimit = 0.5 + Math.random() * 1.5;
      }
      if (state.geometry.juliaMode) {
          geoUpdates.juliaX = (Math.random() * 4 - 2);
          geoUpdates.juliaY = (Math.random() * 4 - 2);
          geoUpdates.juliaZ = (Math.random() * 4 - 2);
      }
      
      if (Object.keys(geoUpdates).length > 0) {
          actions.setGeometry(geoUpdates);
          recordUpdates('geometry', geoUpdates);
      }
      
      actions.handleInteractionEnd();
  };

  const handlePanelContextMenu = (e: React.MouseEvent) => {
      e.preventDefault(); e.stopPropagation();
      const ids = collectHelpIds(e.target);
      const items: ContextMenuItem[] = [];
      if (ids.includes('formula.active')) {
          items.push(
              { label: 'Import Options', action: () => {}, isHeader: true },
              { label: 'Lock Scene Settings', checked: state.lockSceneOnSwitch, action: () => actions.setLockSceneOnSwitch(!state.lockSceneOnSwitch) }
          );
          if (state.formula) {
              const specificId = `formula.${state.formula.toLowerCase()}`;
              if (!ids.includes(specificId)) ids.unshift(specificId);
          }
      }
      items.push({ label: 'Randomize', action: () => {}, isHeader: true }, { label: 'Parameters (A-F)', icon: <DiceIcon />, action: randomizeParams, keepOpen: true }, { label: 'Full (inc. Box/Julia)', icon: <ShuffleIcon />, action: randomizeAll, keepOpen: true });
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

      if (p.options) {
        return (
            <div key={p.id} className="mb-1">
                <Dropdown
                    label={p.label}
                    value={p.val}
                    options={p.options}
                    onChange={(v) => p.set(v as number)}
                    fullWidth
                    // Since formula panel items are often dense, we can adjust style if needed
                    // For now default style is fine
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
                 key={p.id} label={p.label} value={p.val} min={p.min} max={p.max} step={0.01} 
                 onChange={p.set} defaultValue={p.def} highlight={hasLfo || (p.id === 'paramA' && !hasLfo)} 
                 trackId={p.trackId} liveValue={liveVal} 
                 customMapping={{ 
                     min: p.min / Math.PI, 
                     max: p.max / Math.PI, 
                     toSlider: (v) => v / Math.PI, 
                     fromSlider: (v) => v * Math.PI 
                 }} 
                 mapTextInput={true} 
                 overrideInputText={`${(p.val / Math.PI).toFixed(2)}π`}
              />
          );
      }
      // Standard or Log
      return <Slider key={p.id} label={p.label} value={p.val} min={p.min} max={p.max} step={p.step} onChange={p.set} defaultValue={p.def} highlight={hasLfo || (p.id === 'paramA' && !hasLfo)} trackId={p.trackId} liveValue={liveVal} />;
  };

  const switchFormula = (f: FormulaType) => { actions.setFormula(f); if (f === 'Modular' && onSwitchTab) onSwitchTab('Graph'); };

  return (
    <div className="animate-fade-in -mx-4 -mt-4 min-h-full" onContextMenu={handlePanelContextMenu}>
       <div className="bg-gray-800/20 border-b border-white/5 p-4 mb-2" data-help-id="formula.active">
           <div className="flex justify-between items-baseline mb-1">
                <label className="text-[10px] text-gray-500 uppercase font-bold">Active Formula</label>
                {loadTime && <span className="text-[9px] text-gray-500 animate-fade-in">{loadTime}</span>}
           </div>
           <FormulaSelect value={state.formula} onChange={switchFormula} />
       </div>
       
       <div className="flex flex-col" data-help-id={`panel.formula formula.${state.formula?.toLowerCase() || 'mandelbulb'}`}>
            <Slider label="Iterations" value={coreMath.iterations} min={1} max={500} step={1} onChange={(v) => actions.setCoreMath({ iterations: Math.round(v) })} highlight defaultValue={32} customMapping={{ min: 0, max: 100, toSlider: (val) => 100 * Math.pow((val - 1) / 499, 1/3), fromSlider: (val) => 1 + 499 * Math.pow(val / 100, 3) }} trackId="coreMath.iterations" liveValue={state.liveModulations['coreMath.iterations']} />
            <>{params.map(p => renderControl(p))}</>
       </div>
       
       <div className="border-t border-white/5 mt-2 pt-2" data-help-id="formula.transform">
            <div className="bg-gray-800/10">
                <AutoFeaturePanel featureId="geometry" groupFilter="transform" />
            </div>
       </div>

       <div className="border-t border-white/5" data-help-id="julia.mode">
           <div className="bg-gray-800/10">
              <AutoFeaturePanel featureId="geometry" groupFilter="julia" />
              <AutoFeaturePanel featureId="geometry" groupFilter="julia_params" />
           </div>
       </div>
       
       <div className="border-t border-white/5" data-help-id="hybrid.mode">
           <div className="bg-gray-800/10">
              <AutoFeaturePanel featureId="geometry" groupFilter="hybrid" />
           </div>
       </div>

       <LfoList state={state} actions={actions} />

       {state.showHints && (
            <div className="text-[9px] text-gray-600 text-center mt-6 pb-2 opacity-50 font-mono tracking-wide">
                PRESS 'H' TO HIDE HINTS
            </div>
       )}
    </div>
  );
};

export default FormulaPanel;