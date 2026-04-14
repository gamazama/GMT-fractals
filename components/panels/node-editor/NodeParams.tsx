
import React, { memo, useState } from 'react';
import { PipelineNode } from '../../../types';
import Slider from '../../Slider';
import { LogicIcon } from '../../Icons';
import { nodeRegistry } from '../../../engine/NodeRegistry';

const BINDING_OPTIONS = [
    { value: '', label: '—' },
    { value: 'ParamA', label: 'A' },
    { value: 'ParamB', label: 'B' },
    { value: 'ParamC', label: 'C' },
    { value: 'ParamD', label: 'D' },
    { value: 'ParamE', label: 'E' },
    { value: 'ParamF', label: 'F' },
];

// Helper to render a slider with a binding dropdown
const BoundSlider = memo(({
    label, val, min, max, step, binding, onBindingChange, onChange, hardMin, hardMax, onDragStart, onDragEnd
}: {
    label: string,
    val: number,
    min: number,
    max: number,
    step: number,
    hardMin?: number,
    hardMax?: number,
    binding?: string,
    onBindingChange: (val: string | undefined) => void,
    onChange: (v:number)=>void,
    onDragStart?: () => void,
    onDragEnd?: () => void,
}) => {
    return (
        <div className="flex gap-2 items-start mb-1">
            <div className="flex-1">
                <Slider
                    label={binding ? `${label} (→ ${binding})` : label}
                    value={val}
                    min={min} max={max} step={step}
                    hardMin={hardMin} hardMax={hardMax}
                    onChange={onChange}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    highlight={!!binding}
                />
            </div>
            <select
                value={binding || ''}
                onChange={(e) => onBindingChange(e.target.value || undefined)}
                className={`mt-6 text-[9px] rounded px-1 h-6 cursor-pointer border transition-colors outline-none shrink-0 ${
                    binding
                        ? 'bg-cyan-900/40 border-cyan-500/50 text-cyan-300'
                        : 'bg-gray-900/50 border-gray-700 text-gray-500 hover:border-gray-500'
                }`}
                title="Bind to global parameter"
            >
                {BINDING_OPTIONS.map(o => (
                    <option key={o.value} value={o.value} className="bg-gray-900 text-white">{o.label}</option>
                ))}
            </select>
        </div>
    );
});

interface NodeParamsProps {
    node: PipelineNode;
    index?: number;
    updateParams: (index: number, params: { [key: string]: number }) => void;
    setBinding: (index: number, paramKey: string, val: string | undefined) => void;
    updateNode: (index: number, updates: Partial<PipelineNode>) => void;
    onInteractionStart?: () => void;
    onInteractionEnd?: () => void;
}

export const NodeParams: React.FC<NodeParamsProps> = ({ node, index = 0, updateParams, setBinding, updateNode, onInteractionStart, onInteractionEnd }) => {
    const [showLogic, setShowLogic] = useState(false);

    const toggleCondition = () => {
        const isActive = node.condition?.active;
        if (!isActive) {
            updateNode(index, { condition: { active: true, mod: 2, rem: 0 } });
            setShowLogic(true);
        } else {
            updateNode(index, { condition: { ...node.condition!, active: false } });
        }
    };

    const updateCondition = (key: 'mod' | 'rem', val: number) => {
        if (!node.condition) return;
        const rounded = Math.round(val);
        const updates = { ...node.condition, [key]: rounded };
        // Clamp rem to [0, mod-1] when mod decreases to prevent condition never firing
        if (key === 'mod') updates.rem = Math.min(updates.rem, Math.max(0, rounded - 1));
        updateNode(index, { condition: updates });
    };

    const def = nodeRegistry.get(node.type);

    if (node.type === 'Note') {
        return (
            <textarea 
                className="w-full bg-black/20 text-gray-300 text-xs p-2 rounded border border-white/5 focus:border-cyan-500 outline-none resize-none font-sans leading-relaxed"
                rows={3}
                value={node.text || ""}
                onChange={(e) => updateNode(index, { text: e.target.value })}
                placeholder="Type a note..."
            />
        );
    }

    return (
        <div>
            {def ? (
                def.inputs.map(input => (
                    <BoundSlider
                        key={input.id}
                        label={input.label}
                        val={node.params[input.id] ?? input.default}
                        min={input.min}
                        max={input.max}
                        step={input.step}
                        hardMin={input.hardMin}
                        hardMax={input.hardMax}
                        binding={node.bindings?.[input.id]}
                        onBindingChange={(val) => setBinding(index, input.id, val)}
                        onChange={(v) => updateParams(index, { [input.id]: v })}
                        onDragStart={onInteractionStart}
                        onDragEnd={onInteractionEnd}
                    />
                ))
            ) : (
                <div className="text-red-500 text-[10px]">Unknown Node Type: {node.type}</div>
            )}
            
            {/* Logic Toggle */}
            <div className="mt-2 border-t border-white/10 pt-2">
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => setShowLogic(!showLogic)}
                        className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-white font-bold"
                    >
                        <LogicIcon active={!!node.condition?.active} />
                        Logic / Condition
                    </button>
                    <input 
                        type="checkbox" 
                        checked={!!node.condition?.active}
                        onChange={toggleCondition}
                        className="cursor-pointer"
                    />
                </div>
                
                {showLogic && node.condition?.active && (
                    <div className="mt-2 bg-amber-900/10 p-2 rounded border border-amber-500/20">
                        <div className="text-[9px] text-amber-200 mb-2">
                            Run every {node.condition.mod} iterations, starting at #{node.condition.rem}
                        </div>
                        <Slider
                            label="Interval (every N iters)"
                            value={node.condition.mod}
                            min={1} max={10} step={1}
                            onChange={(v) => updateCondition('mod', v)}
                            onDragStart={onInteractionStart}
                            onDragEnd={onInteractionEnd}
                        />
                        <Slider
                            label="Starting Iteration"
                            value={node.condition.rem}
                            min={0} max={Math.max(0, node.condition.mod - 1)} step={1}
                            onChange={(v) => updateCondition('rem', v)}
                            onDragStart={onInteractionStart}
                            onDragEnd={onInteractionEnd}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
