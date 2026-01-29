
import React, { useState, useEffect } from 'react';
import { FractalState, FractalActions } from '../../types';
import Slider from '../../components/Slider';
import { Vector3Input } from '../../components/Vector3Input';
import EmbeddedColorPicker from '../../components/EmbeddedColorPicker';
import ToggleSwitch from '../../components/ToggleSwitch';
import { useFractalStore } from '../../store/fractalStore';
import { collectHelpIds } from '../../utils/helpUtils';
import { AutoFeaturePanel } from '../../components/AutoFeaturePanel';
import { getLightFromSlice } from './index';
import { PlusIcon, TrashIcon } from '../../components/Icons';
import { MAX_LIGHTS } from '../../data/constants';
import * as THREE from 'three';

const LightPanel = ({ state, actions }: { state: FractalState, actions: FractalActions }) => {
  const [activeLight, setActiveLight] = useState(0);
  const lighting = state.lighting;
  const liveModulations = state.liveModulations;
  
  // Safe bounds check
  useEffect(() => {
      if (activeLight >= lighting.lights.length && lighting.lights.length > 0) {
          setActiveLight(lighting.lights.length - 1);
      }
  }, [lighting.lights.length, activeLight]);
  
  const currentLight = getLightFromSlice(lighting, activeLight);
  const openGlobalMenu = useFractalStore(s => s.openContextMenu);

  const handleHeaderContextMenu = (e: React.MouseEvent) => {
      const ids = collectHelpIds(e.currentTarget);
      if (ids.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          openGlobalMenu(e.clientX, e.clientY, [], ids);
      }
  };
  
  const handleAddLight = () => {
      if (lighting.lights.length < MAX_LIGHTS) {
          actions.addLight();
          setActiveLight(lighting.lights.length); // Select new
      }
  };
  
  const handleRemoveLight = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (lighting.lights.length > 1) {
          actions.removeLight(activeLight);
          setActiveLight(Math.max(0, activeLight - 1));
      }
  };

  if (!currentLight) return null;

  // Dynamic range for sliders
  const isFixed = currentLight.fixed;
  const range = isFixed ? 10 : 10;
  
  // DDFS IDs for keyframing
  const prefix = `lighting.light${activeLight}`;

  return (
 <div className="animate-fade-in">
   {/* Light Selector */}
   <div className="mb-4">
      <div className="flex flex-wrap gap-1 bg-black/40 p-1 rounded border border-white/5">
          {lighting.lights.map((l, i) => (
              <button
                key={i}
                onClick={() => setActiveLight(i)}
                className={`flex-1 min-w-[60px] py-1.5 px-2 text-[9px] font-bold uppercase rounded border transition-all relative ${
                    activeLight === i 
                    ? 'bg-cyan-900/50 border-cyan-500/50 text-cyan-200 shadow-sm' 
                    : 'bg-transparent border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300'
                }`}
              >
                 Light {i+1}
                 {l.visible && <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-cyan-400" />}
              </button>
          ))}
          {lighting.lights.length < MAX_LIGHTS && (
              <button 
                onClick={handleAddLight}
                className="w-8 flex items-center justify-center text-gray-500 hover:text-cyan-400 hover:bg-white/5 rounded transition-colors"
                title="Add Light"
              >
                  <PlusIcon />
              </button>
          )}
      </div>
   </div>

   <div className="mb-4 space-y-3" data-help-id="panel.light">
       <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-white/5">
          <ToggleSwitch 
              label="Enabled"
              value={currentLight.visible}
              onChange={() => actions.updateLight({ index: activeLight, params: { visible: !currentLight.visible } })}
              color="bg-green-500"
          />
          {lighting.lights.length > 1 && (
              <button 
                onClick={handleRemoveLight}
                className="p-1.5 text-red-500 hover:text-red-300 hover:bg-red-900/20 rounded ml-2 transition-colors"
                title="Delete Light"
              >
                  <TrashIcon />
              </button>
          )}
       </div>

       <div className={`transition-opacity duration-200 ${currentLight.visible ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
           <div className="mb-4 p-3 bg-gray-800/50 rounded-lg" data-help-id="light.mode" onContextMenu={handleHeaderContextMenu}>
              <ToggleSwitch 
                  label="Attachment Mode"
                  value={currentLight.fixed}
                  onChange={() => actions.toggleLightFixed(activeLight)}
                  options={[
                      { label: 'Headlamp', value: true },
                      { label: 'World', value: false }
                  ]}
                  helpId="light.mode"
              />
           </div>
           
           <div data-help-id="light.pos">
               <Vector3Input 
                   label={currentLight.fixed ? "Offset XYZ" : "World Position"}
                   value={new THREE.Vector3(currentLight.position.x, currentLight.position.y, currentLight.position.z)}
                   onChange={(v) => actions.updateLight({ 
                       index: activeLight, 
                       params: { position: { x: v.x, y: v.y, z: v.z } } 
                   })}
                   min={-range}
                   max={range}
                   step={0.01}
                   interactionMode="param"
                   trackKeys={[`lighting.light${activeLight}_posX`, `lighting.light${activeLight}_posY`, `lighting.light${activeLight}_posZ`]}
                   trackLabels={[`Light ${activeLight + 1} Pos X`, `Light ${activeLight + 1} Pos Y`, `Light ${activeLight + 1} Pos Z`]}
               />
           </div>
           
           <Slider 
             label="Intensity" 
             value={currentLight.intensity} 
             min={0} max={100} step={0.1} 
             onChange={(v) => actions.updateLight({ index: activeLight, params: { intensity: v } })} 
             customMapping={{
                 min: 0, max: 100,
                 toSlider: (val) => Math.sqrt(val / 100) * 100,
                 fromSlider: (val) => (val * val) / 100
             }}
             dataHelpId="light.intensity"
             trackId={`${prefix}_intensity`}
             liveValue={liveModulations[`${prefix}_intensity`]}
           />
           
           <div className="mt-2 mb-1 px-3" data-help-id="light.falloff" onContextMenu={handleHeaderContextMenu}>
                <ToggleSwitch 
                    label="Falloff Type"
                    value={currentLight.falloffType}
                    onChange={(v) => actions.updateLight({ index: activeLight, params: { falloffType: v } })}
                    options={[
                        { label: 'Quad', value: 'Quadratic' },
                        { label: 'Linear', value: 'Linear' }
                    ]}
                    helpId="light.falloff"
                />
           </div>

           <Slider 
             label="Falloff (Decay)" 
             value={currentLight.falloff} 
             min={0} max={500.0} step={0.1} 
             onChange={(v) => actions.updateLight({ index: activeLight, params: { falloff: v } })} 
             customMapping={{
                 min: 0, max: 100,
                 // Much smoother log mapping (approx log10 scale)
                 // Input 0..500 -> Slider 0..100
                 toSlider: (val) => (Math.log10(val + 1) / Math.log10(501)) * 100,
                 fromSlider: (val) => Math.pow(501, val / 100) - 1
             }}
             overrideInputText={currentLight.falloff < 0.01 ? "Infinite" : currentLight.falloff.toFixed(2)}
             dataHelpId="light.falloff"
             trackId={`${prefix}_falloff`}
             liveValue={liveModulations[`${prefix}_falloff`]}
           />
           <p className="text-[9px] text-gray-500 mb-2 -mt-2">0 = No decay (Sun). Higher = shorter range.</p>

           <div className="mt-4 pt-3 border-t border-white/10">
               <label className="text-xs text-gray-400 font-bold mb-2 block">Color</label>
               <EmbeddedColorPicker 
                   color={currentLight.color} 
                   onColorChange={(c) => actions.updateLight({ index: activeLight, params: { color: c } })} 
               />
           </div>
       </div>
   </div>
   
   <div className="h-px bg-gray-800 my-4" />
   
   {/* Global Settings */}
   <div className="flex items-center justify-between mb-4 p-3 bg-gray-800/50 rounded-lg">
      <ToggleSwitch 
          label="Show 3d helpers"
          value={state.showLightGizmo}
          onChange={actions.setShowLightGizmo}
          color="bg-cyan-600"
      />
   </div>
   
   {lighting && (
        <div className="mt-4 p-3 bg-gray-800/50 rounded-lg" data-help-id="shadows">
             <div className="flex items-center justify-between mb-2">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Shadows (Global)</label>
                 <div className="w-[60px]">
                     <ToggleSwitch 
                        value={lighting.shadows}
                        onChange={(v) => actions.setLighting({ shadows: v })}
                        color="bg-yellow-500"
                     />
                 </div>
             </div>
             {lighting.shadows && (
                 <div className="pl-2 mt-2 border-l-2 border-yellow-500/30">
                     <AutoFeaturePanel featureId="lighting" groupFilter="shadows" />
                 </div>
             )}
        </div>
   )}
</div>
  );
};

export default LightPanel;
