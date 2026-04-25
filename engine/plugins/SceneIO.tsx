/**
 * @engine/scene-io — save / load / share UI plugin.
 *
 * Slot-registers Save and Load buttons into @engine/topbar's right
 * slot. Both use the existing utils/SceneFormat.ts transports:
 *   - JSON: plain-text preset download
 *   - PNG:  scene embedded in iTXt chunk of a canvas snapshot
 *   - URL:  compact share-string via utils/Sharing.ts + pako
 *
 * Apps install the plugin and — if they can produce a canvas snapshot
 * (PNG export) — pass a getCanvas() accessor. Apps without a canvas
 * (headless tests, embedded viewers) still get JSON + share link.
 *
 * Preset round-trip is 100% engine-standard: the store's getPreset()
 * walks the feature registry + preset-field registry, and loadPreset()
 * reverses it. Zero app-specific save/load code per app.
 */

import React, { useRef, useState, useCallback } from 'react';
import { useEngineStore } from '../../store/engineStore';
import {
    downloadSceneJson,
    downloadScenePng,
    loadSceneFromFile,
    generateShareStringFromPreset,
} from '../../utils/SceneFormat';
import { topbar } from './TopBar';
import { shortcuts } from './Shortcuts';

// ── Install ─────────────────────────────────────────────────────────────

export interface InstallSceneIOOptions {
    /** Returns the canvas whose pixels back the PNG snapshot. Omit if the
     *  app has no canvas; PNG export is hidden in that case. */
    getCanvas?: () => HTMLCanvasElement | null;
}

let _installed = false;
let _getCanvas: (() => HTMLCanvasElement | null) | undefined;

/**
 * Shared handler: grab the current canvas + preset and write a PNG to
 * disk. Used by both the dropdown "Save PNG…" item and the standalone
 * camera button in the topbar, and by the Alt+S keyboard shortcut.
 * Noop + warn when no canvas accessor was supplied.
 */
const saveCurrentPng = async (): Promise<void> => {
    const canvas = _getCanvas?.();
    if (!canvas) {
        console.warn('[SceneIO] PNG save requested but no canvas accessor registered');
        return;
    }
    const state = useEngineStore.getState();
    const preset = state.getPreset({ includeScene: true });
    const stem = (state.projectSettings.name || 'scene').replace(/\s+/g, '-').toLowerCase();
    await downloadScenePng(canvas, preset, `${stem}.png`);
};

export const installSceneIO = (options: InstallSceneIOOptions = {}) => {
    if (options.getCanvas) _getCanvas = options.getCanvas;
    if (_installed) return;
    _installed = true;

    topbar.register({ id: 'scene-save', slot: 'right', order: 20, component: SaveMenu });
    topbar.register({ id: 'scene-load', slot: 'right', order: 21, component: LoadButton });
    // Standalone one-click PNG button — same operation as the dropdown's
    // "Save PNG…" item, promoted to a quick-access camera affordance so
    // users don't have to open the menu every time they want a
    // screenshot. Hidden when the app didn't supply a canvas accessor.
    if (_getCanvas) {
        topbar.register({ id: 'scene-quick-png', slot: 'right', order: 19, component: QuickPngButton });
    }

    // Alt+S — the conventional single-key screenshot shortcut in
    // creative web apps. Ctrl+S / Ctrl+Shift+S are browser-reserved
    // (Save / Save As) and never reach JS, so don't use them.
    shortcuts.register({
        id: 'scene-io.quick-png',
        key: 'Alt+S',
        description: 'Save PNG',
        category: 'Export',
        handler: () => { void saveCurrentPng(); },
    });
};

export const uninstallSceneIO = () => {
    topbar.unregister('scene-save');
    topbar.unregister('scene-load');
    topbar.unregister('scene-quick-png');
    shortcuts.unregister('scene-io.quick-png');
    _getCanvas = undefined;
    _installed = false;
};

// ── Save menu ────────────────────────────────────────────────────────────

const SaveIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
    </svg>
);

const ChevronDownIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

export const SaveMenu: React.FC = () => {
    const [open, setOpen] = useState(false);
    const getPreset = useEngineStore((s) => s.getPreset);
    const projectName = useEngineStore((s) => s.projectSettings.name);

    const close = useCallback(() => setOpen(false), []);
    const fileStem = (projectName || 'scene').replace(/\s+/g, '-').toLowerCase();

    const handleSaveJson = () => {
        const preset = getPreset({ includeScene: true });
        downloadSceneJson(preset, `${fileStem}.json`);
        close();
    };

    const handleSavePng = async () => {
        await saveCurrentPng();
        close();
    };

    const handleCopyShareLink = async () => {
        const preset = getPreset({ includeScene: true });
        const advanced = !!(useEngineStore.getState() as any).advancedMode;
        const share = generateShareStringFromPreset(preset, advanced);
        const url = `${location.origin}${location.pathname}?s=${share}`;
        try {
            await navigator.clipboard.writeText(url);
            console.info('[SceneIO] Share link copied to clipboard');
        } catch {
            window.prompt('Copy share link:', url);
        }
        close();
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-1 text-[10px] font-medium text-gray-300 hover:text-white bg-black/40 hover:bg-white/5 border border-white/10 hover:border-cyan-500/40 rounded px-2 py-1 transition-colors"
                title="Save scene"
            >
                <SaveIcon />
                <span>Save</span>
                <ChevronDownIcon />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={close} />
                    <div className="absolute top-full right-0 mt-1 w-44 bg-black/95 border border-white/10 rounded shadow-xl z-50 overflow-hidden">
                        <button type="button" onClick={handleSaveJson}     className="w-full text-left px-3 py-2 text-[10px] text-gray-300 hover:bg-white/10 hover:text-white transition-colors">Save JSON…</button>
                        {_getCanvas && (
                            <button type="button" onClick={handleSavePng} className="w-full text-left px-3 py-2 text-[10px] text-gray-300 hover:bg-white/10 hover:text-white transition-colors border-t border-white/5">Save PNG… (Alt+S)</button>
                        )}
                        <button type="button" onClick={handleCopyShareLink} className="w-full text-left px-3 py-2 text-[10px] text-gray-300 hover:bg-white/10 hover:text-white transition-colors border-t border-white/5">Copy Share Link</button>
                    </div>
                </>
            )}
        </div>
    );
};

// ── Quick-PNG (camera) button ───────────────────────────────────────────

const CameraIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
    </svg>
);

export const QuickPngButton: React.FC = () => (
    <button
        type="button"
        onClick={() => { void saveCurrentPng(); }}
        className="flex items-center gap-1 text-[10px] font-medium text-gray-300 hover:text-white bg-black/40 hover:bg-white/5 border border-white/10 hover:border-cyan-500/40 rounded px-2 py-1 transition-colors"
        title="Save PNG (Alt+S)"
        aria-label="Save PNG"
    >
        <CameraIcon />
    </button>
);

// ── Load button ─────────────────────────────────────────────────────────

const LoadIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 3v5h5M21 21H3V3h11l7 7v11z" />
    </svg>
);

export const LoadButton: React.FC = () => {
    const inputRef = useRef<HTMLInputElement>(null);
    const loadPreset = useEngineStore((s) => s.loadPreset);

    const handleFile = async (file: File) => {
        const preset = await loadSceneFromFile(file);
        if (!preset) {
            console.warn('[SceneIO] Could not parse scene from', file.name);
            return;
        }
        loadPreset(preset);
    };

    return (
        <>
            <input
                ref={inputRef}
                type="file"
                accept="application/json,.json,.gmf,image/png"
                aria-label="Load scene file"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    // Reset so the same filename can be re-loaded immediately.
                    if (inputRef.current) inputRef.current.value = '';
                }}
            />
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-1 text-[10px] font-medium text-gray-300 hover:text-white bg-black/40 hover:bg-white/5 border border-white/10 hover:border-cyan-500/40 rounded px-2 py-1 transition-colors"
                title="Load scene (JSON or PNG)"
            >
                <LoadIcon />
                <span>Load</span>
            </button>
        </>
    );
};
