// STYLE: Do not use inline formatting or hardcoded layout for feature params.
// Use DDFS (parentId, condition, group, hidden) to control visibility and nesting.
// Import theme tokens from 'data/theme' instead of raw Tailwind color classes.

import React from 'react';
import { FractalState, FractalActions } from '../../types';
import { AutoFeaturePanel } from '../AutoFeaturePanel';
import { useFractalStore } from '../../store/fractalStore';
import { collectHelpIds } from '../../utils/helpUtils';
import { FeatureSection } from '../FeatureSection';
import { CompilableFeatureSection } from '../CompilableFeatureSection';
import { SectionLabel, SectionDivider } from '../SectionLabel';
import { CollapsibleSection } from '../CollapsibleSection';
import { WaterPlaneState } from '../../features/water_plane';
import { nestedContainer, border as themeBorder } from '../../data/theme';

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

     <SectionDivider />

     {/* --- ATMOSPHERE --- */}
     <div className={`flex flex-col border-t ${themeBorder.subtle}`} data-help-id="fog.settings">
        <AutoFeaturePanel featureId="atmosphere" groupFilter="fog" />
     </div>

     {/* --- VOLUMETRIC SCATTER (under Fog) --- */}
     <CompilableFeatureSection featureId="volumetric" />

     <SectionDivider />

     {/* --- WATER PLANE --- */}
     {waterPlane && waterPlane.waterEnabled && (
         <div className={`flex flex-col border-t ${themeBorder.subtle}`} data-help-id="water.settings">
            <FeatureSection label="Water Plane" featureId="waterPlane" description="Infinite ocean plane at height Y.">
                <div className="mb-2">
                    <AutoFeaturePanel featureId="waterPlane" groupFilter="main" />
                </div>
                <div className={`${nestedContainer} mb-2`}>
                     <AutoFeaturePanel featureId="waterPlane" groupFilter="geometry" />
                     <AutoFeaturePanel featureId="waterPlane" groupFilter="material" />
                </div>
                <div className={nestedContainer}>
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

     {/* --- EFFECTS (Bloom, Chromatic Aberration, Droste) --- */}
     <CollapsibleSection label="Effects" labelVariant="primary" variant="panel">
        <div className="flex flex-col" data-help-id="post.effects">
           <AutoFeaturePanel featureId="postEffects" groupFilter="bloom" />
           <AutoFeaturePanel featureId="postEffects" groupFilter="lens" />
        </div>
can you check this erro        {droste && (
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
        )}
     </CollapsibleSection>

  </div>
  );
};

export default ScenePanel;
