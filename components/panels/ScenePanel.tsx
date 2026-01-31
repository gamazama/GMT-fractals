
import React from 'react';
import { FractalState, FractalActions } from '../../types';
import { AutoFeaturePanel } from '../AutoFeaturePanel';
import { useFractalStore } from '../../store/fractalStore';
import { collectHelpIds } from '../../utils/helpUtils';
import { FeatureSection } from '../FeatureSection';
import { WaterPlaneState } from '../../features/water_plane';

const ScenePanel = ({ state, actions }: { state: FractalState, actions: FractalActions }) => {
  const openGlobalMenu = useFractalStore(s => s.openContextMenu);
  
  // Access state slices to check existence (for safe rendering)
  const droste = state.droste; 
  const grading = state.colorGrading;
  const optics = state.optics; 
  const waterPlane = state.waterPlane as WaterPlaneState;
  
  const handleHeaderContextMenu = (e: React.MouseEvent) => {
      const ids = collectHelpIds(e.currentTarget);
      if (ids.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          openGlobalMenu(e.clientX, e.clientY, [], ids);
      }
  };

  return (
  <div className="animate-fade-in -mx-4 -mt-4 flex flex-col">
     
     {/* --- SECTION 1: NAVIGATION & POSITION --- */}
     {state.advancedMode && (
         <div className="flex flex-col" data-help-id="panel.scene">
             <div className="t-section-header" onContextMenu={handleHeaderContextMenu} data-help-id="panel.scene">
                <h3 className="t-section-title">Camera & navigation</h3>
             </div>
             
             <div className="bg-gray-800/10 py-3 px-3" data-help-id="cam.mode">
                 <AutoFeaturePanel featureId="navigation" groupFilter="controls" />
             </div>
         </div>
     )}

     {/* --- SECTION 2: ATMOSPHERE --- */}
     <div className="flex flex-col border-t border-white/5" data-help-id="fog.settings">
        <div className="bg-gray-800/5 py-1 flex flex-col gap-px">
            <AutoFeaturePanel featureId="atmosphere" groupFilter="fog" />
        </div>
     </div>

     {/* --- SECTION 3: WATER PLANE --- */}
     {/* Only show if the engine feature is enabled (compiled) */}
     {waterPlane && waterPlane.waterEnabled && (
         <div className="flex flex-col border-t border-white/5 pt-2" data-help-id="water.settings">
            <FeatureSection label="Water Plane" featureId="waterPlane" description="Infinite ocean plane at height Y.">
                {/* Simplified Layout: AutoPanel handles everything */}
                <div className="mb-2">
                    <AutoFeaturePanel featureId="waterPlane" groupFilter="main" />
                </div>
                
                {/* Grouped Properties */}
                <div className="bg-black/20 p-2 rounded border border-white/5 mb-2">
                     <AutoFeaturePanel featureId="waterPlane" groupFilter="geometry" />
                     <AutoFeaturePanel featureId="waterPlane" groupFilter="material" />
                </div>
                
                <div className="bg-black/20 p-2 rounded border border-white/5">
                     <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Waves</div>
                     <AutoFeaturePanel featureId="waterPlane" groupFilter="waves" />
                </div>
            </FeatureSection>
         </div>
     )}

     {/* --- SECTION 4: OPTICS (DOF & LENS) --- */}
     <div className="flex flex-col bg-gray-900/40 border-t border-white/5" data-help-id="dof.settings">
        {optics && (
            <div className="flex flex-col">
                 {/* Camera Blur (DOF) + Custom Controls (Focus/Dolly) */}
                 <div>
                     <AutoFeaturePanel featureId="optics" groupFilter="dof" />
                 </div>
                 {/* Projection Controls (Type, Ortho Scale) */}
                 <div>
                     <AutoFeaturePanel featureId="optics" groupFilter="projection" />
                 </div>
            </div>
        )}
     </div>

     {/* --- SECTION 5: COLOR CORRECTION --- */}
     <div className="flex flex-col border-t border-white/5 pt-2" data-help-id="scene.grading">
        {/* Render Feature Panel (DDFS exclusively) */}
        <div className="bg-gray-800/10 p-2">
            <AutoFeaturePanel featureId="colorGrading" groupFilter="grading" />
        </div>
     </div>

     {/* --- DROSTE --- */}
     {droste && (
        <div className="flex flex-col bg-gray-900/40 border-t border-white/5 pt-2" data-help-id="effect.droste">
            <div className="bg-gray-800/10 p-2">
                <AutoFeaturePanel featureId="droste" groupFilter="main" />
            </div>
            
            {droste.active && (
                <div className="animate-fade-in flex flex-col">
                    <div className="bg-white/5 p-2" data-help-id="droste.geometry">
                        <AutoFeaturePanel featureId="droste" groupFilter="geometry" />
                    </div>

                    <div className="bg-black/20 p-2 border-y border-white/5" data-help-id="droste.structure">
                        <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-2 px-1">Spiral Structure</div>
                        <AutoFeaturePanel featureId="droste" groupFilter="structure" />
                    </div>

                    <div className="p-2" data-help-id="droste.transform">
                        <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-2 px-1">Transform</div>
                        <AutoFeaturePanel featureId="droste" groupFilter="transform" />
                    </div>
                </div>
            )}
        </div>
     )}
  </div>
  );
};

export default ScenePanel;
