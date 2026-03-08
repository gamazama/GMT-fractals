
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { featureRegistry } from '../engine/FeatureSystem';
import { registry } from '../engine/FractalRegistry'; // Import FractalRegistry
import { ChevronRight } from './Icons';
import { MAX_LIGHTS } from '../data/constants';
import { useFractalStore } from '../store/fractalStore';

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
    'levelsMin', 'levelsMax', 'levelsGamma', 'saturation' // Grading
]);

// Virtual Expansions for Array-based features
const getVirtualParams = (featureId: string): { label: string, key: string }[] => {
    if (featureId === 'lighting') {
        const opts = [];
        for(let i=0; i<3; i++) {
            opts.push({ label: `Light ${i+1} Intensity`, key: `light${i}_intensity` });
            opts.push({ label: `Light ${i+1} Pos X`, key: `light${i}_posX` });
            opts.push({ label: `Light ${i+1} Pos Y`, key: `light${i}_posY` });
            opts.push({ label: `Light ${i+1} Pos Z`, key: `light${i}_posZ` });
        }
        return opts;
    }
    return [];
};

const MenuPortal = ({ 
    x, y, onClose, onSelect 
}: { 
    x: number, y: number, onClose: () => void, onSelect: (val: string) => void 
}) => {
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [layout, setLayout] = useState({ x, y, maxHeight: 300, opacity: 0, flip: false });

    // Access active formula to resolve specific param names
    const activeFormula = useFractalStore(s => s.formula);

    const standardFeatures = featureRegistry.getAll()
        .filter(f => !EXCLUDED_IDS.has(f.id) && (Object.values(f.params).some(p => p.type === 'float' || p.type === 'int') || f.id === 'lighting'))
        .sort((a, b) => {
            const pA = PRIORITY_ORDER.indexOf(a.id);
            const pB = PRIORITY_ORDER.indexOf(b.id);
            // If both are in priority list, sort by index
            if (pA !== -1 && pB !== -1) return pA - pB;
            // If only A is in list, A comes first
            if (pA !== -1) return -1;
            // If only B is in list, B comes first
            if (pB !== -1) return 1;
            // Fallback to name
            return a.name.localeCompare(b.name);
        });

    const categories = [
        ...standardFeatures.map(f => ({ id: f.id, name: f.name })),
        { id: 'camera', name: 'Camera' } // Virtual Category
    ];

    useLayoutEffect(() => {
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const padding = 10;
        const menuWidth = 320; // w-32 (128) + w-48 (192) + borders
        
        // Determine if we need to flip the menu to the left
        const shouldFlip = x + menuWidth > winW - padding;
        let left = shouldFlip ? Math.max(padding, x - menuWidth) : x;
        
        // If still off-screen, clamp to right edge
        if (left + menuWidth > winW - padding) {
            left = Math.max(padding, winW - menuWidth - padding);
        }
        
        const spaceBelow = winH - y - padding;
        let maxHeight = 350; // Slightly reduced to fit better
        let top = y;

        if (spaceBelow < 200 && y > spaceBelow) {
             // Not enough space below, position above if possible
             if (y > maxHeight + padding) {
                 top = y - maxHeight;
             } else {
                 top = padding;
                 maxHeight = Math.min(maxHeight, y - padding * 2);
             }
        } else {
             maxHeight = Math.min(maxHeight, Math.max(150, spaceBelow));
        }

        setLayout({ x: left, y: top, maxHeight, opacity: 1, flip: shouldFlip });
    }, [x, y]);

    useEffect(() => {
        const handleDown = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
        };
        window.addEventListener('mousedown', handleDown, true);
        return () => window.removeEventListener('mousedown', handleDown, true);
    }, [onClose]);

    const renderParams = (catId: string) => {
        if (catId === 'camera') {
            return [
                { label: 'Camera Pos X', key: 'camera.unified.x' },
                { label: 'Camera Pos Y', key: 'camera.unified.y' },
                { label: 'Camera Pos Z', key: 'camera.unified.z' },
                { label: 'Rotation X', key: 'camera.rotation.x' },
                { label: 'Rotation Y', key: 'camera.rotation.y' },
                { label: 'Rotation Z', key: 'camera.rotation.z' },
            ].map(p => (
                 <button
                    key={p.key}
                    onClick={() => { onSelect(p.key); onClose(); }}
                    className="px-3 py-1.5 text-left text-gray-300 hover:bg-cyan-600 hover:text-white transition-colors truncate"
                 >
                    {p.label}
                 </button>
            ));
        }

        // Feature Params
        const feat = featureRegistry.get(catId);
        if (!feat) return null;

        const virtuals = getVirtualParams(catId);
        const standardParams: { key: string; label: string; desc?: string }[] = [];
        
        // For coreMath, get formula definition once to check which params are used
        const formulaDef = catId === 'coreMath' && activeFormula ? registry.get(activeFormula) : null;
        const formulaParamIds = formulaDef?.parameters?.map(p => p?.id).filter(id => !!id) as string[] || [];
        
        Object.entries(feat.params).forEach(([key, config]) => {
            // CRITICAL: Filter out heavy compile-time params
            if (config.onUpdate === 'compile') return;
            
            // Filter out hidden params (unless explicitly whitelisted)
            if (config.hidden && !WHITELIST_HIDDEN.has(key)) return;
            
            // CORE MATH: Only show params that the current formula actually uses
            if (catId === 'coreMath' && formulaParamIds.length > 0) {
                if (!formulaParamIds.includes(key)) return;
            }

            // Handle vec2/vec3 - expand into components
            if (config.type === 'vec2' || config.type === 'vec3') {
                const axes = config.type === 'vec2' ? ['x', 'y'] : ['x', 'y', 'z'];
                axes.forEach(axis => {
                    let label = `${config.label} ${axis.toUpperCase()}`;
                    
                    // CORE MATH SPECIAL HANDLING for vectors
                    if (catId === 'coreMath' && formulaDef) {
                        const pDef = formulaDef.parameters.find(p => p?.id === key);
                        if (pDef) {
                            const shortKey = key.replace('vec', 'V-'); // vec3A -> V-3A
                            label = `${shortKey}: ${pDef.label} ${axis.toUpperCase()}`;
                        }
                    }
                    
                    standardParams.push({ 
                        key: `${catId}.${key}_${axis}`, // e.g., coreMath.vec3A_x
                        label, 
                        desc: `${config.description || config.label} - ${axis.toUpperCase()} component` 
                    });
                });
                return;
            }
            
            // Handle scalar params (float/int)
            if (config.type === 'float' || config.type === 'int') {
                // Allow visible params OR whitelisted hidden params
                if (config.hidden && !WHITELIST_HIDDEN.has(key)) return;
                
                let label = config.label;
                
                // CORE MATH SPECIAL HANDLING
                if (catId === 'coreMath' && activeFormula) {
                    const formulaDef = registry.get(activeFormula);
                    if (formulaDef) {
                        const pDef = formulaDef.parameters.find(p => p?.id === key);
                        if (pDef) {
                            const shortKey = key.replace('param', 'P-'); // paramA -> P-A
                            label = `${shortKey}: ${pDef.label}`;
                        } else if (key.startsWith('param')) {
                            label = `(${config.label})`; 
                        }
                    }
                }
                
                standardParams.push({ key: `${catId}.${key}`, label, desc: config.description });
            }
        });

        // Merge and render
        const items = [...virtuals.map(v => ({ key: `${catId}.${v.key}`, label: v.label, desc: undefined })), ...standardParams];
        
        return (
            <>
                {items.length === 0 && (
                    <div className="px-3 py-2 text-gray-500 text-xs italic">No modulatable params</div>
                )}
                {items.map(p => (
                    <button
                        key={p.key}
                        onClick={() => { onSelect(p.key); onClose(); }}
                        className="px-3 py-1.5 text-left text-gray-300 hover:bg-cyan-600 hover:text-white transition-colors truncate flex-shrink-0"
                        title={p.desc || p.label}
                    >
                        {p.label}
                    </button>
                ))}
            </>
        );
    };

    return createPortal(
        <div 
            ref={menuRef}
            className="fixed z-[9999] flex text-xs font-mono"
            style={{ 
                left: layout.x, 
                top: layout.y, 
                opacity: layout.opacity,
                transition: 'opacity 0.05s ease-out',
                flexDirection: layout.flip ? 'row-reverse' : 'row'
            }}
        >
            {/* Level 1: Categories */}
            <div 
                className={`w-32 bg-[#1a1a1a] border border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col py-1 overflow-y-auto custom-scroll ${layout.flip ? 'rounded-r -ml-px' : 'rounded-l'}`}
                style={{ maxHeight: layout.maxHeight }}
            >
                {categories.map(cat => (
                    <div 
                        key={cat.id}
                        onMouseEnter={() => setHoveredCategory(cat.id)}
                        className={`px-3 py-1.5 cursor-pointer flex justify-between items-center transition-colors ${hoveredCategory === cat.id ? 'bg-cyan-900/60 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <span className={`truncate ${cat.id === 'coreMath' ? 'font-bold text-cyan-300' : ''}`}>{cat.name}</span>
                        {layout.flip ? <span className="text-gray-600">‹</span> : <ChevronRight />}
                    </div>
                ))}
            </div>

            {/* Level 2: Parameters */}
            {hoveredCategory && (
                <div 
                    className={`w-48 bg-[#222] border-y border-r border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden ${layout.flip ? 'rounded-l animate-fade-in-right' : 'rounded-r -ml-px animate-fade-in-left'}`}
                    style={{ maxHeight: layout.maxHeight }}
                >
                     <div className="flex-1 overflow-y-auto custom-scroll py-1">
                        {renderParams(hoveredCategory)}
                     </div>
                </div>
            )}
        </div>,
        document.body
    );
};

export const ParameterSelector: React.FC<ParameterSelectorProps> = ({ value, onChange, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    
    // Subscribe to formula to update label when formula changes
    const activeFormula = useFractalStore(s => s.formula);

    const handleClick = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setCoords({ x: rect.left, y: rect.bottom + 4 });
            setIsOpen(true);
        }
    };

    // --- ROBUST LABEL RESOLUTION ---
    let label = value;
    
    if (value.includes('.')) {
        // Resolve features
        const [fid, pid] = value.split('.');
        
        // 1. Check Virtuals First
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
             // 2. Check Registry for Human Readable Label
             const feat = featureRegistry.get(fid);
             if (feat) {
                 const param = feat.params[pid];
                 if (param) {
                     // CORE MATH SPECIAL HANDLING FOR BUTTON LABEL
                     if (fid === 'coreMath' && activeFormula) {
                         const formulaDef = registry.get(activeFormula);
                         const pDef = formulaDef?.parameters.find(p => p?.id === pid);
                         if (pDef) {
                             // Display "P-A: Power" style
                             const shortKey = pid.replace('param', 'P-'); 
                             label = `${shortKey}: ${pDef.label}`;
                         } else {
                             label = param.label; // Fallback to "Param A" if not found in formula
                         }
                     } else {
                         label = `${feat.name}: ${param.label}`;
                     }
                 } else {
                     // 3. Fallback: Prettify camelCase (e.g. paramA -> Param A)
                     label = `${feat.name}: ${pid}`;
                 }
             }
        }
    }

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
                <MenuPortal 
                    x={coords.x} y={coords.y} 
                    onClose={() => setIsOpen(false)} 
                    onSelect={onChange} 
                />
            )}
        </>
    );
};
