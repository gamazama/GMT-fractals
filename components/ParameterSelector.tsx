
import React, { useState, useRef } from 'react';
import { featureRegistry } from '../engine/FeatureSystem';
// FractalRegistry removed in engine extraction.
interface StubFormulaDef {
    parameters: Array<{ id?: string; label?: string } | null>;
}
const registry = { get: (_id: string): StubFormulaDef | undefined => undefined };
import { MAX_LIGHTS } from '../data/constants';
import { useFractalStore } from '../store/fractalStore';
import { CategoryPickerMenu } from './CategoryPickerMenu';
import type { PickerCategory, PickerItem } from './CategoryPickerMenu';
import { checkParamActive } from '../utils/paramConditions';

interface ParameterSelectorProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

// Features excluded from modulation (not visual params)
const EXCLUDED_IDS = new Set(['audio', 'navigation', 'drawing', 'webcam', 'debugTools', 'engineSettings', 'quality', 'reflections']);
// Display ordering for the dropdown menu
const PRIORITY_ORDER = ['coreMath', 'geometry', 'materials', 'coloring', 'atmosphere', 'lighting', 'optics'];

// Virtual Expansions for Array-based features
const getVirtualParams = (featureId: string): { label: string, key: string }[] => {
    if (featureId === 'lighting') {
        const opts = [];
        for(let i=0; i<MAX_LIGHTS; i++) {
            opts.push({ label: `Light ${i+1} Intensity`, key: `light${i}_intensity` });
            opts.push({ label: `Light ${i+1} Pos X`, key: `light${i}_posX` });
            opts.push({ label: `Light ${i+1} Pos Y`, key: `light${i}_posY` });
            opts.push({ label: `Light ${i+1} Pos Z`, key: `light${i}_posZ` });
        }
        return opts;
    }
    return [];
};

/** Check if a param is modulatable: has a uniform, isn't compile-time, and is a numeric type */
const isModulatable = (config: any): boolean => {
    if (config.onUpdate === 'compile') return false;
    // Skip vec params that are UI composites of individual floats (e.g., preRot composed from preRotX/Y/Z)
    if (config.composeFrom) return false;
    const type = config.type;
    return type === 'float' || type === 'int' || type === 'vec2' || type === 'vec3' || type === 'vec4';
};

function buildCategories(): PickerCategory[] {
    const standardFeatures = featureRegistry.getAll()
        .filter(f => !EXCLUDED_IDS.has(f.id) && (Object.values(f.params).some(p => isModulatable(p)) || f.id === 'lighting'))
        .sort((a, b) => {
            const pA = PRIORITY_ORDER.indexOf(a.id);
            const pB = PRIORITY_ORDER.indexOf(b.id);
            if (pA !== -1 && pB !== -1) return pA - pB;
            if (pA !== -1) return -1;
            if (pB !== -1) return 1;
            return a.name.localeCompare(b.name);
        });

    return [
        ...standardFeatures.map(f => ({ id: f.id, name: f.name, highlight: f.id === 'coreMath' })),
        { id: 'camera', name: 'Camera' },
    ];
}

function buildItems(catId: string, activeFormula: string, storeState: any): PickerItem[] {
    if (catId === 'camera') {
        return [
            { key: 'camera.unified.x', label: 'Camera Pos X' },
            { key: 'camera.unified.y', label: 'Camera Pos Y' },
            { key: 'camera.unified.z', label: 'Camera Pos Z' },
            { key: 'camera.rotation.x', label: 'Rotation X' },
            { key: 'camera.rotation.y', label: 'Rotation Y' },
            { key: 'camera.rotation.z', label: 'Rotation Z' },
        ];
    }

    const feat = featureRegistry.get(catId);
    if (!feat) return [];

    const virtuals = getVirtualParams(catId);
    const items: PickerItem[] = [];
    const sliceState = storeState[catId] || {};

    // For coreMath, get formula definition to check which params are used
    const formulaDef = catId === 'coreMath' && activeFormula ? registry.get(activeFormula) : null;
    const formulaParamIds = formulaDef?.parameters?.map(p => p?.id).filter(id => !!id) as string[] || [];

    Object.entries(feat.params).forEach(([key, config]) => {
        if (!isModulatable(config)) return;

        // coreMath: only show params the active formula uses
        if (catId === 'coreMath' && formulaParamIds.length > 0) {
            if (!formulaParamIds.includes(key)) return;
        }

        // Check if the param's parent condition is active (e.g., juliaMode must be on for juliaX)
        const isActive = checkParamActive(config.condition, sliceState, storeState, config.parentId);

        if (config.type === 'vec2' || config.type === 'vec3' || config.type === 'vec4') {
            const axes = config.type === 'vec2' ? ['x', 'y'] : config.type === 'vec3' ? ['x', 'y', 'z'] : ['x', 'y', 'z', 'w'];
            axes.forEach(axis => {
                let label = `${config.label} ${axis.toUpperCase()}`;
                if (catId === 'coreMath' && formulaDef) {
                    const pDef = formulaDef.parameters.find(p => p?.id === key);
                    if (pDef) {
                        const shortKey = key.replace('vec', 'V-');
                        label = `${shortKey}: ${pDef.label} ${axis.toUpperCase()}`;
                    }
                }
                items.push({
                    key: `${catId}.${key}_${axis}`,
                    label,
                    description: `${config.description || config.label} - ${axis.toUpperCase()} component`,
                    disabled: !isActive,
                    disabledSuffix: !isActive ? '(off)' : undefined,
                });
            });
            return;
        }

        if (config.type === 'float' || config.type === 'int') {
            let label = config.label;
            if (catId === 'coreMath' && formulaDef) {
                const pDef = formulaDef.parameters.find(p => p?.id === key);
                if (pDef) {
                    const shortKey = key.replace('param', 'P-');
                    label = `${shortKey}: ${pDef.label}`;
                } else if (key.startsWith('param')) {
                    label = `(${config.label})`;
                }
            }
            items.push({
                key: `${catId}.${key}`,
                label,
                description: config.description,
                disabled: !isActive,
                disabledSuffix: !isActive ? '(off)' : undefined,
            });
        }
    });

    // Sort: active items first, then inactive (greyed out)
    items.sort((a, b) => {
        if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
        return 0; // Preserve DDFS definition order within each group
    });

    // Merge virtuals at the top
    return [
        ...virtuals.map(v => ({ key: `${catId}.${v.key}`, label: v.label })),
        ...items,
    ];
}

export const ParameterSelector: React.FC<ParameterSelectorProps> = ({ value, onChange, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [coords, setCoords] = useState({ x: 0, y: 0, right: 0 });

    const activeFormula = useFractalStore(s => s.formula);

    const handleClick = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setCoords({ x: rect.left, y: rect.bottom + 4, right: rect.right });
            setIsOpen(true);
        }
    };

    // --- ROBUST LABEL RESOLUTION ---
    let label = value;

    if (value.includes('.')) {
        const [fid, pid] = value.split('.');

        if (fid === 'lighting' && pid.startsWith('light')) {
             const idx = parseInt(pid.match(/\d+/)?.[0] || '0');
             const type = pid.includes('intensity') ? 'Intensity' : pid.includes('pos') ? 'Pos' : 'Param';
             label = `Light ${idx+1} ${type}`;
        }
        else if (fid === 'camera') {
             if (pid.includes('unified')) {
                 const axis = pid.split('.').pop()?.toUpperCase();
                 label = `Camera Pos ${axis}`;
             } else if (pid.includes('rotation')) {
                 const axis = pid.split('.').pop()?.toUpperCase();
                 label = `Camera Rot ${axis}`;
             } else {
                 label = `Camera Param`;
             }
        }
        else {
             const feat = featureRegistry.get(fid);
             if (feat) {
                 // Check for vector axis target (e.g., vec3A_x → param vec3A, axis X)
                 const vecAxisMatch = pid.match(/^(.+)_(x|y|z|w)$/);
                 const baseParamId = vecAxisMatch ? vecAxisMatch[1] : pid;
                 const axisLabel = vecAxisMatch ? ` ${vecAxisMatch[2].toUpperCase()}` : '';

                 const param = feat.params[baseParamId];
                 if (param) {
                     if (fid === 'coreMath' && activeFormula) {
                         const formulaDef = registry.get(activeFormula);
                         const pDef = formulaDef?.parameters.find(p => p?.id === baseParamId);
                         if (pDef) {
                             const shortKey = baseParamId.replace('param', 'P-').replace('vec', 'V-');
                             label = `${shortKey}: ${pDef.label}${axisLabel}`;
                         } else {
                             label = `${param.label}${axisLabel}`;
                         }
                     } else {
                         label = `${feat.name}: ${param.label}${axisLabel}`;
                     }
                 } else {
                     label = `${feat.name}: ${pid}`;
                 }
             }
        }
    }

    const categories = buildCategories();
    const getItems = (catId: string) => {
        const storeState = useFractalStore.getState();
        return buildItems(catId, activeFormula, storeState);
    };

    return (
        <>
            <button
                ref={buttonRef}
                onClick={handleClick}
                className={`text-left px-2 py-1 bg-black/40 border border-white/10 rounded text-[10px] text-cyan-400 hover:bg-white/5 truncate ${className}`}
                title={label}
            >
                {label}
            </button>
            {isOpen && (
                <CategoryPickerMenu
                    x={coords.x} y={coords.y}
                    anchorRight={coords.right}
                    categories={categories}
                    getItems={getItems}
                    onSelect={onChange}
                    onClose={() => setIsOpen(false)}
                />
            )}
        </>
    );
};
