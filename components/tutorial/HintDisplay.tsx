
import React, { useEffect, useState } from 'react';
import { useFractalStore } from '../../store/fractalStore';
import type { ActiveHint } from '../../hooks/useTutorialHints';

interface HintDisplayProps {
    activeHint: ActiveHint | null;
    cameraMode: string;
    onDismiss?: () => void;
}

const HintDisplay: React.FC<HintDisplayProps> = ({ activeHint, cameraMode, onDismiss }) => {
    const openHelp = useFractalStore((s) => s.openHelp);
    const [visible, setVisible] = useState(false);
    const [displayedHint, setDisplayedHint] = useState<ActiveHint | null>(null);

    // Fade transition: when hint changes, fade out → swap → fade in
    useEffect(() => {
        if (activeHint?.id !== displayedHint?.id) {
            // Fade out
            setVisible(false);
            const timer = setTimeout(() => {
                setDisplayedHint(activeHint);
                if (activeHint) setVisible(true);
            }, 300); // match CSS transition duration
            return () => clearTimeout(timer);
        }
    }, [activeHint, displayedHint?.id]);

    // If no contextual hint, show the static navigation fallback
    if (!displayedHint) {
        return (
            <div className="text-[9px] font-medium text-white/60 text-center whitespace-nowrap" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                <span className="text-cyan-400/60 font-bold mr-2">[{cameraMode}]</span>
                {cameraMode === 'Fly'
                    ? "WASD Move \u00b7 Space/C Vert \u00b7 Shift Boost"
                    : "L-Drag Rotate \u00b7 R-Drag Pan \u00b7 Scroll Zoom"}
            </div>
        );
    }

    return (
        <div
            className="flex items-center gap-1.5 transition-opacity duration-300 ease-in-out"
            style={{ opacity: visible ? 1 : 0 }}
        >
            <span
                className="pointer-events-auto text-[9px] font-medium text-cyan-300/80 text-center whitespace-nowrap cursor-pointer hover:text-cyan-200 transition-colors"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                onClick={onDismiss}
                title="Click for next tip"
            >
                {displayedHint.text}
            </span>
            {displayedHint.helpTopicId && (
                <button
                    className="pointer-events-auto text-[8px] text-cyan-400/50 hover:text-cyan-300 transition-colors ml-1 flex-shrink-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        openHelp(displayedHint.helpTopicId!);
                    }}
                    title="Learn more"
                >
                    ?
                </button>
            )}
        </div>
    );
};

export default HintDisplay;
