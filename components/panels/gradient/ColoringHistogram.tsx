
import React, { useRef, useEffect } from 'react';
import Histogram from '../../Histogram';
import Slider from '../../Slider';
import { analyzeHistogram, calculateSmartLevels } from '../../../utils/histogramUtils';
import { ColoringState } from '../../../features/coloring';
import AdvancedGradientEditor from '../../AdvancedGradientEditor';

interface ColoringHistogramProps {
    layer: 1 | 2;
    state: ColoringState; // The full coloring slice
    histogramData: Float32Array | null;
    onChange: (updates: Partial<ColoringState>) => void;
    onRefresh: () => void;
    autoUpdate: boolean;
    onToggleAuto: () => void;
    liveModulations?: Partial<Record<string, number>>;
}

export const ColoringHistogram: React.FC<ColoringHistogramProps> = ({ 
    layer, state, histogramData, onChange, onRefresh, autoUpdate, onToggleAuto, liveModulations 
}) => {
    const pendingAutoLevel = useRef(false);
    
    // Select correct params based on layer
    const repeats = layer === 1 ? state.repeats : state.repeats2;
    const phase = layer === 1 ? state.phase : state.phase2;
    const scale = layer === 1 ? state.scale : state.scale2;
    const offset = layer === 1 ? state.offset : state.offset2;
    const bias = layer === 1 ? state.bias : state.bias2;
    const gradient = layer === 1 ? state.gradient : state.gradient2;
    const activeMode = layer === 1 ? state.mode : state.mode2;

    // Keys for updates
    const kScale = layer === 1 ? 'scale' : 'scale2';
    const kOffset = layer === 1 ? 'offset' : 'offset2';
    const kRepeats = layer === 1 ? 'repeats' : 'repeats2';
    const kPhase = layer === 1 ? 'phase' : 'phase2';
    const kBias = layer === 1 ? 'bias' : 'bias2';
    
    // Refs for sync logic (Track previous values to detect changes)
    const prevRepeats = useRef(repeats);
    const prevPhase = useRef(phase);
    const prevScale = useRef(scale);
    const prevOffset = useRef(offset);
    const prevMode = useRef(activeMode);
    
    // Trigger Auto-Level on Mode Change (only if scale/offset didn't also change)
    useEffect(() => {
        if (activeMode !== prevMode.current) {
            const scaleChanged = Math.abs(scale - prevScale.current) > 0.001;
            const offsetChanged = Math.abs(offset - prevOffset.current) > 0.001;

            if (!scaleChanged && !offsetChanged) {
                 pendingAutoLevel.current = true;
                 if (!autoUpdate) onRefresh();
            }
            prevMode.current = activeMode;
        }
    }, [activeMode, scale, offset, autoUpdate, onRefresh]);

    // 1. Auto-Level Logic
    useEffect(() => {
        if (pendingAutoLevel.current && histogramData) {
            const analysis = analyzeHistogram(histogramData);
            if (analysis) {
                const smartRange = calculateSmartLevels(analysis.buckets, analysis.min, analysis.max);
                if (smartRange) {
                    const span = smartRange.end - smartRange.start;
                    const safeSpan = Math.abs(span) < 0.0001 ? 0.0001 : span;
                    const newScale = repeats / safeSpan;
                    const newOffset = phase - (smartRange.start * newScale);
                    
                    onChange({ [kScale]: newScale, [kOffset]: newOffset });
                    pendingAutoLevel.current = false;
                }
            }
        }
    }, [histogramData, repeats, phase, kScale, kOffset, onChange]);

    // 2. Sync Logic (User changes Repeats/Phase -> Update Scale/Offset)
    useEffect(() => {
        const repeatsChanged = Math.abs(repeats - prevRepeats.current) > 0.001;
        const phaseChanged = Math.abs(phase - prevPhase.current) > 0.001;
        const scaleChanged = Math.abs(scale - prevScale.current) > 0.001;
        const offsetChanged = Math.abs(offset - prevOffset.current) > 0.001;

        // Only run logic if Repeats/Phase changed BUT Scale/Offset remained stable.
        // If Scale/Offset also changed, it's likely a preset load or undo.
        if ((repeatsChanged || phaseChanged) && !scaleChanged && !offsetChanged) {
             const oldScale = Math.max(0.0001, scale);
             const oldRepeats = Math.max(0.0001, prevRepeats.current);
             
             // Calculate Range from OLD values
             const rangeSpan = oldRepeats / oldScale;
             const rangeStart = (prevPhase.current - offset) / oldScale;
             
             // Calculate NEW Scale/Offset maintaining that Range
             const newScale = repeats / rangeSpan;
             const newOffset = phase - (rangeStart * newScale);
             
             onChange({ [kScale]: newScale, [kOffset]: newOffset });
        }
        
        // Sync refs
        prevRepeats.current = repeats;
        prevPhase.current = phase;
        prevScale.current = scale;
        prevOffset.current = offset;
        
    }, [repeats, phase, scale, offset, kScale, kOffset, onChange]);

    // Derived Range for UI
    const rangeStart = (phase - offset) / scale;
    const rangeEnd = rangeStart + (repeats / scale);

    return (
        <div className="flex flex-col gap-1">
             {/* Histogram Bridge - Removed redundant Gradient Editor */}
             <Histogram 
                data={histogramData} 
                min={rangeStart}
                max={rangeEnd}
                gamma={bias}
                repeats={repeats}
                phase={phase}
                gradientStops={gradient}
                labelTitle="Range"
                labelLeft="Min"
                labelMid="Bias"
                labelRight="Max"
                onChange={({ min, max, gamma }) => {
                    const span = max - min;
                    const safeSpan = Math.abs(span) < 0.0001 ? 0.0001 : span;
                    const newScale = repeats / safeSpan;
                    const newOffset = phase - (min * newScale);
                    
                    const updates: any = { 
                        [kScale]: newScale, 
                        [kOffset]: newOffset,
                        [kBias]: gamma
                    };
                    
                    onChange(updates);
                }}
                autoUpdate={autoUpdate}
                onToggleAuto={onToggleAuto}
                onRefresh={onRefresh}
            />

            {/* Coupled Sliders */}
            <Slider 
                label="Repeats" 
                value={repeats} 
                min={0.1} max={100} step={0.1} 
                onChange={(v) => onChange({ [kRepeats]: v })}
                trackId={`coloring.${kRepeats}`}
                liveValue={liveModulations?.[`coloring.${kRepeats}`]}
            />
            <Slider 
                label="Phase" 
                value={phase} 
                min={-1.0} max={1.0} step={0.01} 
                onChange={(v) => onChange({ [kPhase]: v })}
                trackId={`coloring.${kPhase}`}
                liveValue={liveModulations?.[`coloring.${kPhase}`]}
            />
        </div>
    );
};
