
import React, { useMemo, useRef, useState } from 'react';
import { registry } from '../../../engine/FractalRegistry';
import { FormulaType } from '../../../../types';
import { useEngineStore } from '../../../../store/engineStore';
import { ContextMenuItem } from '../../../../types/help';
import { generateGMF, loadGMFScene } from '../../../utils/FormulaFormat';
import { sanitizeGMF } from '../../../utils/formulaBrief';
import { DownloadIcon, ChevronDown, CodeIcon, MenuIcon, UploadIcon, MagicIcon } from '../../../../components/Icons';
import { FractalEvents, FRACTAL_EVENTS } from '../../../../engine/FractalEvents';
import { showToast } from '../../../../engine/store/toastStore';
import { buildFormulaContextMenu } from './FormulaContextMenu';
import { ModifyWithAIModal } from './ModifyWithAIModal';
import { FormulaPicker, useSceneGroups, useCatalogData, sectionGroups } from '../../FormulaPicker';
import { useTutorAnchor, mergeRefs } from '../../../../engine/plugins/Tutorial';

export { buildFormulaContextMenu } from './FormulaContextMenu';

export const FormulaSelect = ({ value, onChange }: { value: FormulaType, onChange: (f: FormulaType) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const openWorkshop = useEngineStore(s => s.openWorkshop);
    const togglePanel = useEngineStore(s => s.togglePanel);
    const sceneGroups = useSceneGroups();
    const catalogData = useCatalogData();
    const catalogGroups = useMemo(() => sectionGroups(catalogData), [catalogData]);
    const btnRef = useRef<HTMLButtonElement>(null);
    const menuBtnRef = useRef<HTMLButtonElement>(null);
    const hamburgerAnchorRef = useTutorAnchor('formula-hamburger');
    const fileRef = useRef<HTMLInputElement>(null);
    const [rect, setRect] = useState<DOMRect | null>(null);
    const [aiOpen, setAiOpen] = useState(false);

    // Global Hooks
    const openGlobalMenu = useEngineStore(s => s.openContextMenu);
    const setExportIncludeScene = useEngineStore(s => s.setExportIncludeScene);
    const exportIncludeScene = useEngineStore(s => s.exportIncludeScene);
    const advancedMode = useEngineStore(s => s.advancedMode);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const items = buildFormulaContextMenu();
        openGlobalMenu(e.clientX, e.clientY, items, ['formula.active']);
    };

    const handleMenuButtonClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const r = menuBtnRef.current?.getBoundingClientRect();
        if (!r) return;
        const modular = value === 'Modular';
        // Prepend the AI section. The context-menu builder is a pure free
        // function with no closure over component state, so the modal is opened
        // from here (where setAiOpen is in scope) rather than from the builder.
        const aiItems: ContextMenuItem[] = [
            { label: 'AI', action: () => {}, isHeader: true },
            {
                label: 'Modify with AI…',
                icon: <MagicIcon active={!modular} />,
                // Modular formulas live in the node graph, not portable shader
                // blocks, so they can't be exported to the kit.
                disabled: modular,
                action: () => setAiOpen(true),
            },
            {
                label: 'Load formula from clipboard',
                action: () => { void loadFormulaFromClipboard(); },
            },
        ];
        const items = [...aiItems, ...buildFormulaContextMenu()];
        openGlobalMenu(r.left, r.bottom + 4, items, ['formula.active']);
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

        const presetToSave = useEngineStore.getState().getPreset({ includeScene });
        const gmfContent = generateGMF(def, presetToSave as any);

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

    // Shared GMF-string loader: register the formula in BOTH registries
    // (main thread + worker) then hydrate the store, exactly like the file
    // import path. Throws on parse failure so callers can surface their own
    // error UI. Used by file import AND the "Load formula from clipboard"
    // menu item.
    const loadGmfString = (content: string) => {
        FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, "Compiling Formula...");
        const { def, preset } = loadGMFScene(content);
        if (def) {
            // Register the imported formula in BOTH registries:
            //  - main thread (so UI / FractalRegistry can resolve it)
            //  - worker (via REGISTER_FORMULA event → bridge → proxy)
            // engine-core's loadScene() does neither directly; this
            // call site is responsible for both, then loadScene
            // hydrates the store + emits CONFIG so the worker
            // compiles the just-registered shader.
            if (!registry.get(def.id)) {
                registry.register(def);
            }
            FractalEvents.emit(FRACTAL_EVENTS.REGISTER_FORMULA, {
                id: def.id,
                shader: def.shader,
            });
            useEngineStore.getState().loadScene({ def, preset });
        } else {
            // Legacy JSON — just switch formula
            onChange(preset.formula as FormulaType);
        }
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                loadGmfString(ev.target?.result as string);
                if (fileRef.current) fileRef.current.value = '';
            } catch (err) {
                console.error("Failed to import formula:", err);
                FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, false);
                alert("Invalid formula file. Ensure it is a valid .gmf or .json definition.");
            }
        };
        reader.readAsText(file);
    };

    // "Load formula from clipboard" — the same tolerant load path the AI modal
    // uses, callable straight from the burger menu. Reads the clipboard, runs
    // it through sanitizeGMF (strips fences / prose / BOM), then loads it.
    const loadFormulaFromClipboard = async () => {
        let text = '';
        try {
            text = await navigator.clipboard.readText();
        } catch {
            showToast('Clipboard read was blocked — use Modify with AI to paste into a box instead.', 'warning', 4500);
            return;
        }
        const clean = sanitizeGMF(text);
        if (!clean) {
            showToast("Clipboard didn't contain a complete formula. Copy the whole .gmf and try again.", 'warning', 4500);
            return;
        }
        try {
            loadGmfString(clean);
            showToast('Formula loaded from clipboard — compiling…', 'success');
        } catch (err) {
            console.error('Failed to load formula from clipboard:', err);
            FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, false);
            showToast("Couldn't read that formula — check it's a complete .gmf block.", 'error', 4500);
        }
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
                className={`flex-1 flex items-center justify-between border text-xs text-fg rounded-lg px-2 py-1.5 outline-none transition-all group ${
                    isOpen
                    ? 'bg-surface-sunken border-accent-500 ring-1 ring-accent-900'
                    : isModular
                        ? 'bg-surface-sunken border-purple-500/50 shadow-[inset_0_0_10px_rgba(168,85,247,0.1)]'
                        : 'bg-gradient-to-t from-line/[0.06] to-line/[0.03] border-line/10 hover:border-line/20 shadow-[inset_0_-1px_0_rgb(var(--line)/0.04)]'
                }`}
            >
                <div className="flex items-center gap-2">
                    {isModular && (
                        <span className="flex w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_5px_#a855f7]" />
                    )}
                    <span className={`font-bold ${isModular ? 'text-transparent bg-clip-text bg-gradient-to-r from-accent-300 to-purple-300' : ''}`}>
                        {displayLabel}
                    </span>
                </div>
                <div className={`w-3 h-3 text-fg-dim transition-transform ${isOpen ? 'rotate-180' : ''}`}><ChevronDown /></div>
            </button>

            <button
                ref={mergeRefs(menuBtnRef, hamburgerAnchorRef)}
                onClick={handleMenuButtonClick}
                className="w-4 flex items-center justify-center bg-line/[0.04] border border-line/10 hover:border-line/20 hover:bg-line/[0.08] text-fg-muted hover:text-fg rounded-lg transition-colors"
                title="Formula options"
            >
                <MenuIcon />
            </button>

            {!isModular && advancedMode && (
                <button
                    onClick={handleExportClick}
                    onContextMenu={handleExportContextMenu}
                    className="w-8 flex items-center justify-center bg-line/[0.04] border border-line/10 hover:border-line/20 hover:bg-line/[0.08] text-fg-muted hover:text-fg rounded-lg transition-colors"
                    title={exportIncludeScene ? "Export Full Preset (Right-click for options)" : "Export Formula Only (Right-click for options)"}
                >
                    <DownloadIcon />
                </button>
            )}

            {/* Edit button — only visible for imported formulas with saved source */}
            {registry.get(value)?.importSource && (
                <button
                    onClick={() => openWorkshop(value)}
                    className="w-8 flex items-center justify-center bg-line/[0.04] border border-line/10 hover:border-line/20 hover:bg-line/[0.08] text-fg-muted hover:text-fg rounded-lg transition-colors"
                    title="Re-edit imported formula in Workshop"
                >
                    <CodeIcon />
                </button>
            )}

            {isOpen && rect && (
                <FormulaPicker
                    variant="popover"
                    anchorRect={rect}
                    value={value}
                    onClose={() => setIsOpen(false)}
                    onCommit={(c) => {
                        if (c.action === 'launch' && c.id === 'workshop') {
                            openWorkshop(undefined);
                        } else if (c.action === 'catalog') {
                            // Frag/DEC catalog pick → open the Workshop with the
                            // formula's source loaded into the editor (it isn't a
                            // registered formula, so we don't switch the live one).
                            openWorkshop(undefined, `${c.source}:${c.id}`);
                        } else if (c.action === 'select') {
                            onChange(c.id as FormulaType);
                            // Picking Modular: surface the Graph panel on
                            // the left dock (same pattern as the system
                            // menu's Engine-config reveal in topbar.tsx).
                            if (c.id === 'Modular') togglePanel('Graph', true);
                        }
                        setIsOpen(false);
                    }}
                    extraGroups={sceneGroups}
                    catalogGroups={catalogGroups}
                    footerSlot={advancedMode ? (
                        <button
                            onClick={() => { fileRef.current?.click(); setIsOpen(false); }}
                            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-accent-900/20 hover:bg-accent-900/40 text-accent-400 text-[10px] font-bold rounded border border-accent-500/20 hover:border-accent-500/50 transition-colors"
                        >
                            <UploadIcon />
                            Import Formula (.GMF)
                        </button>
                    ) : undefined}
                />
            )}

            <ModifyWithAIModal open={aiOpen} onClose={() => setAiOpen(false)} />

        </div>
    );
};
