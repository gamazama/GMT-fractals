
import React, { useRef, useState } from 'react';
import { registry } from '../../../engine/FractalRegistry';
import { FormulaType } from '../../../types';
import { useFractalStore } from '../../../store/fractalStore';
import { ContextMenuItem } from '../../../types/help';
import { generateGMF, parseGMF } from '../../../utils/FormulaFormat';
import { DownloadIcon, ChevronDown, CodeIcon } from '../../Icons';
import { FractalEvents, FRACTAL_EVENTS } from '../../../engine/FractalEvents';
import { buildFormulaContextMenu } from './FormulaContextMenu';
import { PortalDropdown } from './FormulaGallery';

export { buildFormulaContextMenu } from './FormulaContextMenu';

export const FormulaSelect = ({ value, onChange }: { value: FormulaType, onChange: (f: FormulaType) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const openWorkshop = useFractalStore(s => s.openWorkshop);
    const btnRef = useRef<HTMLButtonElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const [rect, setRect] = useState<DOMRect | null>(null);

    // Global Hooks
    const openGlobalMenu = useFractalStore(s => s.openContextMenu);
    const setExportIncludeScene = useFractalStore(s => s.setExportIncludeScene);
    const exportIncludeScene = useFractalStore(s => s.exportIncludeScene);
    const advancedMode = useFractalStore(s => s.advancedMode);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const items = buildFormulaContextMenu();
        openGlobalMenu(e.clientX, e.clientY, items, []);
    };

    const toggle = () => {
        if (!isOpen && btnRef.current) {
            setRect(btnRef.current.getBoundingClientRect());
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    const performExport = (includeScene: boolean) => {
        const def = registry.get(value);
        if (!def) return;

        const presetToSave = useFractalStore.getState().getPreset({ includeScene });
        const gmfContent = generateGMF(def, presetToSave);

        const blob = new Blob([gmfContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${def.id}${includeScene ? '_Full' : ''}.gmf`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        performExport(exportIncludeScene);
    };

    const handleExportContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const items: ContextMenuItem[] = [
            { label: 'Export Options', action: () => {}, isHeader: true },
            {
                label: 'Include Scene Data',
                checked: exportIncludeScene,
                action: () => setExportIncludeScene(!exportIncludeScene)
            },
            { label: 'Actions', action: () => {}, isHeader: true },
            {
                label: 'Export Formula Only',
                action: () => performExport(false)
            },
            {
                label: 'Export Full Package',
                action: () => performExport(true)
            }
        ];

        openGlobalMenu(e.clientX, e.clientY, items, []);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const content = ev.target?.result as string;
                // Emit compiling event to show spinner before parsing
                FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, "Compiling Formula...");
                const def = parseGMF(content);
                registry.register(def);
                FractalEvents.emit(FRACTAL_EVENTS.REGISTER_FORMULA, { id: def.id, shader: def.shader });
                onChange(def.id as FormulaType);
                if (fileRef.current) fileRef.current.value = '';
            } catch (err) {
                console.error("Failed to import formula:", err);
                FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, false);
                alert("Invalid formula file. Ensure it is a valid .gmf or .json definition.");
            }
        };
        reader.readAsText(file);
    };

    const selectedDef = registry.get(value);
    const displayLabel = selectedDef ? selectedDef.name : value;
    const isModular = value === 'Modular';

    return (
        <div className="flex gap-2">
            <input
                ref={fileRef}
                type="file"
                accept=".json,.gmf"
                className="hidden"
                onChange={handleImport}
            />

            <button
                ref={btnRef}
                onClick={toggle}
                onContextMenu={handleContextMenu}
                className={`flex-1 flex items-center justify-between border text-xs text-white rounded-lg p-2.5 outline-none transition-all group ${
                    isOpen
                    ? 'bg-gray-900 border-cyan-500 ring-1 ring-cyan-900'
                    : isModular
                        ? 'bg-gray-900 border-purple-500/50 shadow-[inset_0_0_10px_rgba(168,85,247,0.1)]'
                        : 'bg-gradient-to-t from-white/[0.06] to-white/[0.03] border-white/10 hover:border-white/20 shadow-[inset_0_-1px_0_rgba(255,255,255,0.04)]'
                }`}
            >
                <div className="flex items-center gap-2">
                    {isModular && (
                        <span className="flex w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_5px_#a855f7]" />
                    )}
                    <span className={`font-bold ${isModular ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300' : ''}`}>
                        {displayLabel}
                    </span>
                </div>
                <div className={`w-3 h-3 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}><ChevronDown /></div>
            </button>

            {!isModular && advancedMode && (
                <button
                    onClick={handleExportClick}
                    onContextMenu={handleExportContextMenu}
                    className="w-8 flex items-center justify-center bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.08] text-gray-400 hover:text-white rounded-lg transition-colors"
                    title={exportIncludeScene ? "Export Full Preset (Right-click for options)" : "Export Formula Only (Right-click for options)"}
                >
                    <DownloadIcon />
                </button>
            )}

            {/* Edit button — only visible for imported formulas with saved source */}
            {registry.get(value)?.importSource && (
                <button
                    onClick={() => openWorkshop(value)}
                    className="w-8 flex items-center justify-center bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.08] text-gray-400 hover:text-white rounded-lg transition-colors"
                    title="Re-edit imported formula in Workshop"
                >
                    <CodeIcon />
                </button>
            )}

            {isOpen && rect && (
                <PortalDropdown
                    rect={rect}
                    currentValue={value}
                    onClose={() => setIsOpen(false)}
                    onSelect={(f) => { onChange(f); setIsOpen(false); }}
                    onImport={() => fileRef.current?.click()}
                    showImport={advancedMode}
                    onImportFragmentarium={() => openWorkshop(undefined)}
                />
            )}

        </div>
    );
};
