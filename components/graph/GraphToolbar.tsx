
import React from 'react';
import { useFractalStore } from '../../store/fractalStore';
import { useAnimationStore } from '../../store/animationStore';
import { collectHelpIds } from '../../utils/helpUtils';
import { ContextMenuItem } from '../../types/help';
import Slider from '../../components/Slider';
import { 
    FitIcon, FitSelectionIcon, NormIcon, FilterIcon, WaveIcon, BakeIcon, MagicIcon
} from '../Icons';

interface GraphToolbarProps {
    normalized: boolean;
    onToggleNormalize: () => void;
    onFitView: () => void;
    onFitSelection: () => void;
    onApplyEuler: () => void;
    needsEulerFix: boolean;
    isBaking: boolean;
    onBakeDown: (e: React.PointerEvent) => void;
    isSmoothing: boolean;
    onSmoothDown: (e: React.PointerEvent) => void;
    isSimplifying: boolean;
    onSimplifyDown: (e: React.PointerEvent) => void;
}

const SimpleTooltip = ({ text }: { text: string }) => (
    <div className="absolute left-full ml-1 top-1/2 -translate-y-1/2 bg-black text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none z-50 opacity-0 group-hover/btn:opacity-100 transition-opacity">
        {text}
        <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-black" />
    </div>
);

const ToolButton = ({ onClick, active, icon, tooltip, onPointerDown, danger, onContextMenu }: any) => (
    <button 
        onClick={onClick}
        onPointerDown={onPointerDown}
        onContextMenu={onContextMenu}
        className={`group/btn relative w-6 h-6 flex items-center justify-center rounded border transition-all ${
            active 
            ? 'bg-cyan-900/80 text-cyan-300 border-cyan-500/50' 
            : danger 
                ? 'bg-red-900/20 text-red-400 border-red-500/30 animate-pulse'
                : 'bg-black/60 text-gray-400 border-white/10 hover:text-white'
        }`}
    >
        {icon}
        <SimpleTooltip text={tooltip} />
    </button>
);

// --- Connected Component for Menu ---
// This ensures the sliders are reactive even inside a static context menu snapshot
const BounceSettingsMenu = () => {
    const { bounceTension, bounceFriction, setBouncePhysics } = useAnimationStore();
    
    return (
        <div className="flex flex-col gap-1 py-1">
             <div className="px-3">
                 <Slider 
                    label="Tension (Spring)" 
                    value={bounceTension}
                    min={0.1} max={2.0} step={0.1}
                    onChange={(v) => setBouncePhysics(v, bounceFriction)}
                />
             </div>
             <div className="px-3">
                 <Slider 
                    label="Friction (Damping)" 
                    value={bounceFriction}
                    min={0.1} max={1.0} step={0.1}
                    onChange={(v) => setBouncePhysics(bounceTension, v)}
                />
             </div>
             <div className="px-3 pt-1">
                 <button 
                    onClick={() => setBouncePhysics(0.5, 0.6)}
                    className="w-full py-1 text-[9px] uppercase font-bold text-gray-500 hover:text-white border border-white/10 rounded hover:bg-white/5 transition-colors"
                 >
                    Reset Defaults
                 </button>
             </div>
        </div>
    );
};

export const GraphToolbar: React.FC<GraphToolbarProps> = ({
    normalized, onToggleNormalize,
    onFitView, onFitSelection,
    onApplyEuler, needsEulerFix,
    isBaking, onBakeDown,
    isSmoothing, onSmoothDown,
    isSimplifying, onSimplifyDown
}) => {
    const openGlobalMenu = useFractalStore(s => s.openContextMenu);
    
    const handleContextMenu = (e: React.MouseEvent) => {
        const ids = collectHelpIds(e.currentTarget);
        if (ids.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            openGlobalMenu(e.clientX, e.clientY, [], ids);
        }
    };

    const handleSmoothContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const items: ContextMenuItem[] = [
            { label: 'Bounce Physics', action: () => {}, isHeader: true },
            { element: <BounceSettingsMenu /> }
        ];
        
        openGlobalMenu(e.clientX, e.clientY, items, []);
    };

    return (
        <div 
            className="absolute top-[30px] left-[4px] flex flex-col gap-1 z-20 w-[42px]"
            data-help-id="anim.graph"
            onContextMenu={handleContextMenu}
        >
            <ToolButton 
                onClick={onFitView}
                active={false}
                icon={<FitIcon />}
                tooltip="Fit View (All Keys)"
            />
            <ToolButton 
                onClick={onFitSelection}
                active={false}
                icon={<FitSelectionIcon />}
                tooltip="Fit Selection"
            />
            <ToolButton 
                onClick={onToggleNormalize}
                active={normalized}
                icon={<NormIcon active={normalized} />}
                tooltip="Normalize (0-1 Range)"
            />
            <ToolButton 
                onClick={onApplyEuler}
                active={false}
                danger={needsEulerFix}
                icon={<FilterIcon />}
                tooltip="Fix Rotation (Euler Filter)"
            />
            <ToolButton 
                onClick={() => {}}
                onPointerDown={onSimplifyDown}
                active={isSimplifying}
                icon={<MagicIcon active={isSimplifying} />}
                tooltip="Simplify / Fit Curve (Drag Left/Right)"
            />
            <ToolButton 
                onClick={() => {}} 
                onPointerDown={onBakeDown}
                active={isBaking}
                icon={<BakeIcon active={isBaking} />}
                tooltip="Bake / Resample (Drag right)"
            />
            <ToolButton 
                onClick={() => {}} 
                onPointerDown={onSmoothDown}
                onContextMenu={handleSmoothContextMenu}
                active={isSmoothing}
                icon={<WaveIcon active={isSmoothing} />}
                tooltip="Smooth (Right) / Bounce (Left) - Right Click for Settings"
            />
        </div>
    );
};
