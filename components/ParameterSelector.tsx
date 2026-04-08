
import React, { useState, useRef } from 'react';
import { featureRegistry } from '../engine/FeatureSystem';
import { registry } from '../engine/FractalRegistry';
import { MAX_LIGHTS } from '../data/constants';
import { useFractalStore } from '../store/fractalStore';
import { CategoryPickerMenu } from './CategoryPickerMenu';
import type { PickerCategory, PickerItem } from './CategoryPickerMenu';

interface ParameterSelectorProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

// Updated exclusion list to hide non-modulatable groups
const EXCLUDED_IDS = new Set(['audio', 'navigation', 'drawing', 'webcam', 'debugTools', 'engineSettings', 'quality', 'reflections']);
// Strict ordering for the dropdown menu
const PRIORITY_ORDER = ['coreMath', 'geometry', 'materials', 'coloring', 'atmosphere', 'lighting', 'optics'];

// Hidden params that SHOULD be modulatable
const WHITELIST_HIDDEN = new Set([
    'repeats', 'phase', 'scale', 'offset', 'bias', // Coloring
    'repeats2', 'phase2', 'scale2', 'offset2', 'bias2',
    'levelsMin', 'levelsMax', 'levelsGamma', 'saturation', // Grading
    'juliaX', 'juliaY', 'juliaZ', // Julia
    'preRotX', 'preRotY', 'preRotZ', // Pre-rotation
    'hybridFoldLimit' // Hybrid
]);

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

function buildCategories(): PickerCategory[] {
    const standardFeatures = featureRegistry.getAll()
        .filter(f => !EXCLUDED_IDS.has(f.id) && (Object.values(f.params).some(p => p.type === 'float' || p.type === 'int') || f.id === 'lighting'))
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

function buildItems(catId: string, activeFormula: string): PickerItem[] {
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

    // For coreMath, get formula definition once to check which params are used
    const formulaDef = catId === 'coreMath' && activeFormula ? registry.get(activeFormula) : null;
    const formulaParamIds = formulaDef?.parameters?.map(p => p?.id).filter(id => !!id) as string[] || [];

    Object.entries(feat.params).forEach(([key, config]) => {
        if (config.onUpdate === 'compile') return;
        if (config.hidden && !WHITELIST_HIDDEN.has(key)) return;

        if (catId === 'coreMath' && formulaParamIds.length > 0) {
            if (!formulaParamIds.includes(key)) return;
        }

        if (config.type === 'vec2' || config.type === 'vec3') {
            const axes = config.type === 'vec2' ? ['x', 'y'] : ['x', 'y', 'z'];
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
            items.push({ key: `${catId}.${key}`, label, description: config.description });
        }
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
                 const param = feat.params[pid];
                 if (param) {
                     if (fid === 'coreMath' && activeFormula) {
                         const formulaDef = registry.get(activeFormula);
                         const pDef = formulaDef?.parameters.find(p => p?.id === pid);
                         if (pDef) {
                             const shortKey = pid.replace('param', 'P-');
                             label = `${shortKey}: ${pDef.label}`;
                         } else {
                             label = param.label;
                         }
                     } else {
                         label = `${feat.name}: ${param.label}`;
                     }
                 } else {
                     label = `${feat.name}: ${pid}`;
                 }
             }
        }
    }

    const categories = buildCategories();
    const getItems = (catId: string) => buildItems(catId, activeFormula);

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
