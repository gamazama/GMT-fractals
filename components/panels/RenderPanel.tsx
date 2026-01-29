
import React, { useRef } from 'react';
import { FractalState, FractalActions } from '../../types';
import Slider from '../Slider';
import ToggleSwitch from '../ToggleSwitch';
import AdvancedGradientEditor from '../../components/AdvancedGradientEditor'; 
import { useFractalStore } from '../../store/fractalStore';
import { collectHelpIds } from '../../utils/helpUtils';
import { AutoFeaturePanel } from '../AutoFeaturePanel';

const RenderPanel = ({ state, actions }: { state: FractalState, actions: FractalActions }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const openGlobalMenu = useFractalStore(s => s.openContextMenu);
  const isMobile = state.debugMobileLayout || (typeof window !== 'undefined' && window.innerWidth < 768);

  const handleHeaderContextMenu = (e: React.MouseEvent) => {
      const ids = collectHelpIds(e.currentTarget);
      if (ids.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          openGlobalMenu(e.clientX, e.clientY, [], ids);
      }
  };

  const mats = state.materials; 
  const atmos = state.atmosphere;
  const lighting = state.lighting;

  // PT Globals are now in Engine Panel, so we removed the section here.

  if (!mats || !atmos) return null;

  return (
    <div className="animate-fade-in -mx-4 -mt-4 flex flex-col" data-help-id="panel.render">
        
        {/* --- SURFACE MATERIALS --- */}
        <div className="flex flex-col" data-help-id="mat.diffuse">
             <AutoFeaturePanel featureId="materials" groupFilter="surface" />
        </div>

        {/* --- ENVIRONMENT --- */}
        <div className="flex flex-col" data-help-id="mat.env">
             <AutoFeaturePanel featureId="materials" groupFilter="env" />
        </div>
        
        {/* --- REFLECTIONS --- */}
        <div className="flex flex-col border-t border-white/5" data-help-id="mat.reflection">
             <AutoFeaturePanel featureId="reflections" groupFilter="shading" />
        </div>

        {/* --- GLOW (ATMOSPHERE FEATURE) --- */}
        <div className="flex flex-col" data-help-id="mat.glow">
            <AutoFeaturePanel featureId="atmosphere" groupFilter="glow" />
        </div>
        
        {/* --- SELF ILLUMINATION (EMISSION) --- */}
        <div className="flex flex-col" data-help-id="mat.emission">
            <AutoFeaturePanel featureId="materials" groupFilter="emission" />
        </div>

        {/* --- AO (NEW FEATURE SLICE) --- */}
        <div className="flex flex-col border-t border-white/5" data-help-id="mat.ao">
             {/* Only show 'shading' group (Intensity, Spread). Samples/Mode are in Engine Panel. */}
             <AutoFeaturePanel featureId="ao" groupFilter="shading" />
        </div>
    </div>
  );
};

export default RenderPanel;
