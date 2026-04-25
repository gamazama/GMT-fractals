
import React, { useState, useEffect } from 'react';
import type { EngineStoreState as FractalState, EngineActions as FractalActions } from '../../../../types';
import Slider from '../../../../components/Slider';
import { Vector3Input } from '../../../../components/vector-input';
import EmbeddedColorPicker from '../../../../components/EmbeddedColorPicker';
import ToggleSwitch from '../../../../components/ToggleSwitch';
import { useEngineStore } from '../../../../store/engineStore';
import { collectHelpIds } from '../../../../utils/helpUtils';
import { AutoFeaturePanel } from '../../../../components/AutoFeaturePanel';
import { getLightFromSlice } from '../../../features/lighting';
import { TrashIcon } from '../../../../components/Icons';
import { TabStrip } from '../../../../components/TabStrip';
import { SectionLabel } from '../../../../components/SectionLabel';
import { MAX_LIGHTS } from '../../../../data/constants';
import * as THREE from 'three';
import { getProxy } from '../../../engine/worker/WorkerProxy';
const engine = getProxy();
import { getViewportCamera } from '../../../engine/worker/ViewportRefs';
import { LightDirectionControl } from '../../../features/lighting/components/LightDirectionControl';
import type { ContextMenuItem } from '../../../../types/help';
import type { FalloffType, IntensityUnit } from '../../../../types/graphics';

/**
 * Advanced/debug light panel — exposed in Advanced Mode via the dock tab system.
 * The primary user-facing light UI is the Light Studio in the top bar (CenterHUD.tsx),
 * which shows light orbs with hover popups (LightSettingsPopup in LightControls.tsx).
 * Right-click context menu on light orbs provides falloff curve, intensity unit, and batch options.
 */
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
  const openGlobalMenu = useEngineStore(s => s.openContextMenu);

  const handleHeaderContextMenu = (e: React.MouseEvent) => {
      const ids = collectHelpIds(e.currentTarget);
      if (ids.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          openGlobalMenu(e.clientX, e.clientY, [], ids);
      }
  };

  const handleLightStudioMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const light = getLightFromSlice(lighting, activeLight);
      const items: ContextMenuItem[] = [
          { label: 'Light Studio', isHeader: true },
          { label: 'Intensity Unit', isHeader: true },
          {
              label: 'Raw (Linear)',
              checked: (light.intensityUnit ?? 'raw') === 'raw',
              action: () => actions.updateLight({ index: activeLight, params: { intensityUnit: 'raw' as IntensityUnit } })
          },
          {
              label: 'Exposure (EV)',
              checked: light.intensityUnit === 'ev',
              action: () => {
                  // Convert current raw intensity to EV: ev = log2(intensity), clamp to sane range
                  const ev = light.intensity > 0 ? Math.max(-4, Math.min(10, Math.log2(light.intensity))) : 0;
                  actions.updateLight({ index: activeLight, params: { intensityUnit: 'ev' as IntensityUnit, intensity: Math.round(ev * 10) / 10 } });
              }
          },
          { label: 'Falloff Preset', isHeader: true },
          {
              label: 'Quadratic (Smooth)',
              checked: (light.falloffType ?? 'Quadratic') === 'Quadratic',
              action: () => actions.updateLight({ index: activeLight, params: { falloffType: 'Quadratic' as FalloffType } })
          },
          {
              label: 'Linear (Artistic)',
              checked: light.falloffType === 'Linear',
              action: () => actions.updateLight({ index: activeLight, params: { falloffType: 'Linear' as FalloffType } })
          },
      ];
      openGlobalMenu(e.clientX, e.clientY, items, ['panel.light']);
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
     const current = getLightFromSlice(state.lighting, activeLight);
     const wasFixed = current.fixed;
     const cam = getViewportCamera();

     let newPos = current.position;
     let newRot = current.rotation;

     if (cam) {
         if (current.type === 'Point') {
             const o = engine.sceneOffset;
             if (wasFixed) {
                 const worldPos = new THREE.Vector3(newPos.x, newPos.y, newPos.z);
                 worldPos.applyQuaternion(cam.quaternion);
                 worldPos.add(cam.position);
                 newPos = { x: worldPos.x + o.x + (o.xL ?? 0), y: worldPos.y + o.y + (o.yL ?? 0), z: worldPos.z + o.z + (o.zL ?? 0) };
             } else {
                 const worldPos = new THREE.Vector3(newPos.x - o.x - (o.xL ?? 0), newPos.y - o.y - (o.yL ?? 0), newPos.z - o.z - (o.zL ?? 0));
                 worldPos.sub(cam.position);
                 worldPos.applyQuaternion(cam.quaternion.clone().invert());
                 newPos = { x: worldPos.x, y: worldPos.y, z: worldPos.z };
             }
         } else {
             // Directional: convert rotation direction between camera-local and world space
             const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(newRot.x, newRot.y, newRot.z, 'YXZ'));
             dir.applyQuaternion(wasFixed ? cam.quaternion : cam.quaternion.clone().invert());
             const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
             const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
             newRot = { x: e.x, y: e.y, z: e.z };
         }
     }

     actions.updateLight({ index: activeLight, params: { fixed: !wasFixed, position: newPos, rotation: newRot } });
  };
  
  const handleTypeChange = (newType: 'Point' | 'Directional') => {
      const cam = getViewportCamera();
      if (!cam) {
          actions.updateLight({ index: activeLight, params: { type: newType } });
          return;
      }

      const current = getLightFromSlice(state.lighting, activeLight);
      
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

  const range = 10;
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
 <div className="animate-fade-in" onContextMenu={handleLightStudioMenu}>
   <div className="mb-4">
      <TabStrip
          items={lighting.lights.map((l, i) => ({
              id: i,
              label: `Light ${i + 1}`,
              indicator: !!l.visible,
          }))}
          activeId={activeLight}
          onSelect={(id) => setActiveLight(id)}
          onAdd={lighting.lights.length < MAX_LIGHTS ? handleAddLight : undefined}
          addTitle="Add Light"
      />
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
           
           {/* --- Power slider (all modes) --- */}
           {currentLight.intensityUnit === 'ev' ? (
               <Slider
                 label="Power (EV)"
                 value={currentLight.intensity}
                 min={-4} max={10} step={0.1}
                 onChange={(v) => actions.updateLight({ index: activeLight, params: { intensity: v } })}
                 mapTextInput={false}
                 overrideInputText={`${formatValue(currentLight.intensity)} EV`}
                 dataHelpId="light.intensity"
                 trackId={`${prefix}_intensity`}
                 liveValue={liveModulations[`${prefix}_intensity`]}
               />
           ) : (
               <Slider
                 label="Power"
                 value={currentLight.intensity}
                 min={0} max={100} step={0.1}
                 onChange={(v) => actions.updateLight({ index: activeLight, params: { intensity: v } })}
                 customMapping={{
                     min: 0, max: 100,
                     toSlider: (val) => Math.sqrt(val / 100) * 100,
                     fromSlider: (val) => (val * val) / 100
                 }}
                 mapTextInput={false}
                 overrideInputText={formatValue(currentLight.intensity)}
                 dataHelpId="light.intensity"
                 trackId={`${prefix}_intensity`}
                 liveValue={liveModulations[`${prefix}_intensity`]}
               />
           )}

           {/* --- Range slider + Falloff type (Point lights only) --- */}
           {currentLight.type === 'Point' && (
               <>
                   <Slider
                     label="Range"
                     value={currentLight.range ?? 0}
                     min={0} max={100} step={0.1}
                     onChange={(v) => actions.updateLight({ index: activeLight, params: { range: v } })}
                     customMapping={{
                         min: 0, max: 100,
                         toSlider: (val) => (Math.log10(val + 1) / Math.log10(101)) * 100,
                         fromSlider: (val) => Math.pow(101, val / 100) - 1
                     }}
                     mapTextInput={false}
                     overrideInputText={(currentLight.range ?? 0) < 0.01 ? 'Infinite' : formatValue(currentLight.range ?? 0)}
                     dataHelpId="light.falloff"
                     trackId={`${prefix}_falloff`}
                     liveValue={liveModulations[`${prefix}_falloff`]}
                   />
                   <p className="text-[9px] text-gray-500 mb-2 -mt-2">0 = Infinite reach. Sets distance where light fades to ~1%.</p>

                   <div className="mb-1 px-3" data-help-id="light.falloff">
                       <ToggleSwitch
                           label="Falloff Curve"
                           value={currentLight.falloffType}
                           onChange={(v) => actions.updateLight({ index: activeLight, params: { falloffType: v } })}
                           options={[
                               { label: 'Quadratic', value: 'Quadratic' },
                               { label: 'Linear', value: 'Linear' }
                           ]}
                           helpId="light.falloff"
                       />
                   </div>
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
                 <SectionLabel>Shadows (Global)</SectionLabel>
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
