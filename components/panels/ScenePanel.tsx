
import React from 'react';
import { FractalState, FractalActions } from '../../types';
import { AutoFeaturePanel } from '../AutoFeaturePanel';
import { useFractalStore } from '../../store/fractalStore';
import { collectHelpIds } from '../../utils/helpUtils';
import { FeatureSection } from '../FeatureSection';
import { SectionLabel, SectionDivider } from '../SectionLabel';
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

     {/* --- SECTION 1: OPTICS (DOF & LENS) --- */}
     <div className="flex flex-col" data-help-id="dof.settings">
        {optics && (
            <div className="flex flex-col">
                 <AutoFeaturePanel featureId="optics" groupFilter="dof" />
                 <AutoFeaturePanel featureId="optics" groupFilter="projection" />
            </div>
        )}
     </div>

     {/* --- NAVIGATION & POSITION --- */}
     {state.advancedMode && (
         <div className="flex flex-col" data-help-id="panel.scene">
             <div className="t-section-header" onContextMenu={handleHeaderContextMenu} data-help-id="panel.scene">
                <h3 className="t-section-title">Camera & Navigation</h3>
             </div>
             <AutoFeaturePanel featureId="navigation" groupFilter="controls" />
         </div>
     )}

     {/* --- ATMOSPHERE --- */}
     <div className="flex flex-col border-t border-white/5" data-help-id="fog.settings">
        <AutoFeaturePanel featureId="atmosphere" groupFilter="fog" />
     </div>

     <SectionDivider />

     {/* --- WATER PLANE --- */}
     {waterPlane && waterPlane.waterEnabled && (
         <div className="flex flex-col border-t border-white/5" data-help-id="water.settings">
            <FeatureSection label="Water Plane" featureId="waterPlane" description="Infinite ocean plane at height Y.">
                <div className="mb-2">
                    <AutoFeaturePanel featureId="waterPlane" groupFilter="main" />
                </div>
                <div className="bg-black/20 p-2 rounded border border-white/5 mb-2">
                     <AutoFeaturePanel featureId="waterPlane" groupFilter="geometry" />
                     <AutoFeaturePanel featureId="waterPlane" groupFilter="material" />
                </div>
                <div className="bg-black/20 p-2 rounded border border-white/5">
                     <SectionLabel variant="secondary" className="mb-2">Waves</SectionLabel>
                     <AutoFeaturePanel featureId="waterPlane" groupFilter="waves" />
                </div>
            </FeatureSection>
         </div>
     )}

     {/* --- COLOR CORRECTION --- */}
     <div className="flex flex-col" data-help-id="scene.grading">
        <AutoFeaturePanel featureId="colorGrading" groupFilter="grading" />
     </div>

     <SectionDivider />

     {/* --- POST EFFECTS (Bloom & Lens) --- */}
     <div className="flex flex-col" data-help-id="post.effects">
        <AutoFeaturePanel featureId="postEffects" groupFilter="bloom" />
        <AutoFeaturePanel featureId="postEffects" groupFilter="lens" />
     </div>

     <SectionDivider />

     {/* --- DROSTE --- */}
     {droste && (
        <>
            <div className="flex flex-col" data-help-id="effect.droste">
                <AutoFeaturePanel featureId="droste" groupFilter="main" />

                {droste.active && (
                    <div className="animate-fade-in flex flex-col">
                        <AutoFeaturePanel featureId="droste" groupFilter="geometry" />
                        <SectionDivider />
                        <AutoFeaturePanel featureId="droste" groupFilter="structure" />
                        <SectionDivider />
                        <AutoFeaturePanel featureId="droste" groupFilter="transform" />
                    </div>
                )}
            </div>
        </>
     )}

     <SectionDivider />

     {/* --- VOLUMETRIC SCATTER --- */}
     <div className="flex flex-col">
        <AutoFeaturePanel featureId="volumetric" />
     </div>
  </div>
  );
};

export default ScenePanel;
