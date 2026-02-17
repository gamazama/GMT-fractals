
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
import { engine } from '../../engine/FractalEngine';
import { LightDirectionControl } from './components/LightDirectionControl';

const LightPanel = ({ state, actions }: { state: FractalState, actions: FractalActions }) => {
  const [activeLight, setActiveLight] = useState(0);
  const lighting = state.lighting;
  const liveModulations = state.liveModulations;
  
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
          setActiveLight(lighting.lights.length);
      }
  };
  
  const handleRemoveLight = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (lighting.lights.length > 1) {
          actions.removeLight(activeLight);
          setActiveLight(Math.max(0, activeLight - 1));
      }
  };

  const handleToggleFixed = () => {
     if (!engine.activeCamera) return;
     const current = getLightFromSlice(state.lighting, activeLight);
     const wasFixed = current.fixed;
     
     let newPos = current.position;
     let newRot = current.rotation;

     if (current.type === 'Point') {
        newPos = engine.virtualSpace.resolveRealWorldPosition(current.position, wasFixed, engine.activeCamera);
     } else {
        newRot = engine.virtualSpace.resolveRealWorldRotation(current.rotation, wasFixed, engine.activeCamera);
     }
     
     actions.updateLight({ index: activeLight, params: { fixed: !wasFixed, position: newPos, rotation: newRot } });
  };
  
  const handleTypeChange = (newType: 'Point' | 'Directional') => {
      if (!engine.activeCamera) {
          actions.updateLight({ index: activeLight, params: { type: newType } });
          return;
      }
      
      const current = getLightFromSlice(state.lighting, activeLight);
      const cam = engine.activeCamera;
      
      let targetOrigin = new THREE.Vector3(0,0,0);
      
      if (!current.fixed) {
         const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
         targetOrigin.copy(cam.position).addScaledVector(fwd, 2.0);
         const so = engine.sceneOffset;
         targetOrigin.add(new THREE.Vector3(so.x + so.xL, so.y + so.yL, so.z + so.zL));
      }
      
      if (newType === 'Directional') {
          const p = new THREE.Vector3(current.position.x, current.position.y, current.position.z);
          const dir = new THREE.Vector3().subVectors(targetOrigin, p).normalize();
          
          if (dir.lengthSq() < 0.001) dir.set(0, -1, 0);

          const targetQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,-1), dir);
          const e = new THREE.Euler().setFromQuaternion(targetQ, 'YXZ');
          
          actions.updateLight({ index: activeLight, params: { type: newType, rotation: { x: e.x, y: e.y, z: e.z } } });

      } else {
          const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(current.rotation.x, current.rotation.y, current.rotation.z, 'YXZ'));
          const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
          const dist = 5.0;
          const pos = targetOrigin.clone().sub(dir.multiplyScalar(dist));
          
          actions.updateLight({ 
              index: activeLight, 
              params: { 
                  type: newType, 
                  position: { x: pos.x, y: pos.y, z: pos.z } 
              } 
          });
      }
  };

  if (!currentLight) return null;

  const range = currentLight.fixed ? 10 : 10;
  const prefix = `lighting.light${activeLight}`;

  const mixedRotation = {
      x: liveModulations[`${prefix}_rotX`] ?? currentLight.rotation.x,
      y: liveModulations[`${prefix}_rotY`] ?? currentLight.rotation.y,
      z: liveModulations[`${prefix}_rotZ`] ?? currentLight.rotation.z
  };
  
  const mixedPosition = {
      x: liveModulations[`${prefix}_posX`] ?? currentLight.position.x,
      y: liveModulations[`${prefix}_posY`] ?? currentLight.position.y,
      z: liveModulations[`${prefix}_posZ`] ?? currentLight.position.z
  };
  
  const posVec = new THREE.Vector3(mixedPosition.x, mixedPosition.y, mixedPosition.z);

  return (
 <div className="animate-fade-in">
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
              <div className="flex gap-1 mb-2" data-help-id="light.type">
                 <ToggleSwitch 
                      value={currentLight.type}
                      onChange={(v) => handleTypeChange(v as 'Point' | 'Directional')}
                      options={[
                          { label: 'Point', value: 'Point' },
                          { label: 'Directional (Sun)', value: 'Directional' }
                      ]}
                  />
              </div>
              <ToggleSwitch 
                  label="Attachment Mode"
                  value={currentLight.fixed}
                  onChange={handleToggleFixed}
                  options={[
                      { label: 'Headlamp', value: true },
                      { label: 'World', value: false }
                  ]}
                  helpId="light.mode"
              />
           </div>
           
           {currentLight.type === 'Point' ? (
               <div data-help-id="light.pos">
                   <Vector3Input 
                       label={currentLight.fixed ? "Offset XYZ" : "World Position"}
                       value={posVec}
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
           ) : (
               <div data-help-id="light.rot">
                   <LightDirectionControl 
                        index={activeLight}
                        value={mixedRotation}
                        onChange={(v) => actions.updateLight({
                           index: activeLight,
                           params: { rotation: v }
                        })}
                        isFixed={currentLight.fixed}
                        width={200}
                        height={130}
                   />
               </div>
           )}
           
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
             overrideInputText={formatValue(currentLight.intensity)}
             dataHelpId="light.intensity"
             trackId={`${prefix}_intensity`}
             liveValue={liveModulations[`${prefix}_intensity`]}
           />
           
           {currentLight.type === 'Point' && (
                <>
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
                         toSlider: (val) => (Math.log10(val + 1) / Math.log10(501)) * 100,
                         fromSlider: (val) => Math.pow(501, val / 100) - 1
                     }}
                     overrideInputText={currentLight.falloff < 0.01 ? "Infinite" : currentLight.falloff.toFixed(2)}
                     dataHelpId="light.falloff"
                     trackId={`${prefix}_falloff`}
                     liveValue={liveModulations[`${prefix}_falloff`]}
                   />
                   <p className="text-[9px] text-gray-500 mb-2 -mt-2">0 = No decay (Sun). Higher = shorter range.</p>
                </>
           )}

           <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
               <label className="text-xs text-gray-400 font-bold mb-2 block">Color</label>
               <EmbeddedColorPicker 
                   color={currentLight.color} 
                   onColorChange={(c) => actions.updateLight({ index: activeLight, params: { color: c } })} 
               />

               <div className="flex items-center justify-between pt-1">
                   <label className="text-xs text-gray-400 font-medium">Cast Shadows</label>
                   <input 
                       type="checkbox" 
                       checked={currentLight.castShadow}
                       onChange={(e) => {
                           actions.handleInteractionStart('param');
                           actions.updateLight({ index: activeLight, params: { castShadow: e.target.checked } });
                           actions.handleInteractionEnd();
                       }}
                       className="w-3 h-3 accent-cyan-500 bg-gray-800 border-gray-600 rounded cursor-pointer"
                   />
               </div>
           </div>
       </div>
   </div>
   
   <div className="h-px bg-gray-800 my-4" />
   
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

const formatValue = (val: number) => {
    if (val === 0) return "0";
    if (Math.abs(val) < 1.0) return val.toFixed(3);
    const s = val.toPrecision(5);
    return s.includes('.') ? s.replace(/\.?0+$/, "") : s;
};

export default LightPanel;
