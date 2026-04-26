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
import type { Preset } from '../../types';
import {
    serializeScene,
    parseSceneJson,
    extractScenePng,
    snapshotSceneToPng,
    downloadBlob,
    generateShareStringFromPreset,
    type SceneParser,
    type SceneSerializer,
} from '../../utils/SceneFormat';
import { topbar } from './TopBar';
import { shortcuts } from './Shortcuts';

// ── Install ─────────────────────────────────────────────────────────────

export interface InstallSceneIOOptions {
    /** Returns the canvas whose pixels back the PNG snapshot. Omit if the
     *  app has no canvas; PNG export is hidden in that case. */
    getCanvas?: () => HTMLCanvasElement | null;
    /** Custom parser for scene file content. Used for both .json/.gmf
     *  text AND text extracted from PNG iTXt. Default: `parseSceneJson`
     *  (engine-core JSON + GMF `<Scene>` block extraction).
     *
     *  Apps with richer formats override here. GMT injects a parser that
     *  calls `loadGMFScene` and registers the embedded formula definition
     *  so workshop / Fragmentarium GMFs round-trip with their shaders. */
    parseScene?: SceneParser;
    /** Custom serializer for scene → text. Used for JSON download AND
     *  PNG iTXt embed. Default: pretty-printed JSON.
     *
     *  Apps with richer formats override here. GMT injects `saveGMFScene`
     *  which embeds the active formula's shader source so saved scenes
     *  load back even on a fresh runtime that doesn't have that formula
     *  in its registry. */
    serializeScene?: SceneSerializer;
}

let _installed = false;
let _getCanvas: (() => HTMLCanvasElement | null) | undefined;
let _parseScene: SceneParser | undefined;
let _serializeScene: SceneSerializer | undefined;

/** Pick the registered serializer, falling back to engine-core's plain
 *  JSON. Single source of truth — every save path routes through this. */
const activeSerializer = (): SceneSerializer => _serializeScene ?? serializeScene;

/** Compose the default download filename from the project name. */
const defaultFileStem = (): string => {
    const name = useEngineStore.getState().projectSettings.name || 'scene';
    return name.replace(/\s+/g, '-').toLowerCase();
};

export const installSceneIO = (options: InstallSceneIOOptions = {}) => {
    if (options.getCanvas) _getCanvas = options.getCanvas;
    if (options.parseScene) _parseScene = options.parseScene;
    if (options.serializeScene) _serializeScene = options.serializeScene;
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
        handler: () => { void saveScenePng(); },
    });
};

export const uninstallSceneIO = () => {
    topbar.unregister('scene-save');
    topbar.unregister('scene-load');
    topbar.unregister('scene-quick-png');
    shortcuts.unregister('scene-io.quick-png');
    _getCanvas = undefined;
    _parseScene = undefined;
    _serializeScene = undefined;
    _installed = false;
};

/**
 * Universal file → preset loader. Auto-detects format:
 *   - image/png   → extracts scene from iTXt chunk (SceneData or legacy FractalData)
 *   - .gmf / .json / anything else → parser handles raw text
 *
 * Routes through the SceneIO-registered `parseScene` so apps with a
 * custom format (e.g. GMT's GMF with embedded formula shaders) see
 * every load through their own parser. When no parser is registered,
 * falls back to engine-core's `parseSceneJson` (plain JSON + `<Scene>`
 * block extraction).
 *
 * **The single public file-loader.** Any caller — LoadingScreen,
 * drag-drop overlay, deep-link handler, file-picker — routes through
 * this so a missing parser argument can never silently downgrade a
 * GMF load to plain JSON (which was a real footgun before this was
 * the only entry point).
 */
export const loadSceneFile = async (file: File): Promise<Preset | null> => {
    const parser: SceneParser = _parseScene ?? parseSceneJson;
    const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
    if (isPng) return extractScenePng(file, parser);
    const text = await file.text();
    return parser(text);
};

/**
 * Save the current scene as a JSON download. Routes through the
 * SceneIO-registered `serializeScene` (e.g. GMT's GMF writer that
 * embeds the active formula's shader) — no way to bypass.
 *
 * @param filename Override; defaults to `<project-name>.json`. Apps
 *   wanting a different extension (`.gmf`) pass it explicitly.
 */
export const saveSceneJson = (filename?: string): void => {
    const preset = useEngineStore.getState().getPreset({ includeScene: true });
    const text = activeSerializer()(preset);
    const blob = new Blob([text], { type: 'application/json' });
    downloadBlob(blob, filename ?? `${defaultFileStem()}.json`);
};

/**
 * Snapshot the registered canvas and save as a PNG with embedded
 * scene metadata. Routes through the SceneIO-registered
 * `serializeScene` for the iTXt payload — same byte-format as
 * `saveSceneJson` so a saved PNG round-trips cleanly through
 * `loadSceneFile`.
 *
 * Noop with a console warning when no `getCanvas` was registered
 * at install time — the app is headless or didn't supply one.
 */
export const saveScenePng = async (filename?: string): Promise<void> => {
    const canvas = _getCanvas?.();
    if (!canvas) {
        console.warn('[SceneIO] PNG save requested but no canvas accessor registered');
        return;
    }
    const preset = useEngineStore.getState().getPreset({ includeScene: true });
    const blob = await snapshotSceneToPng(canvas, preset, activeSerializer());
    downloadBlob(blob, filename ?? `${defaultFileStem()}.png`);
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
    // Subscribe so the menu re-renders if the project name changes;
    // saveSceneJson / saveScenePng read the current name internally.
    useEngineStore((s) => s.projectSettings.name);

    const close = useCallback(() => setOpen(false), []);

    const handleSaveJson = () => { saveSceneJson(); close(); };
    const handleSavePng  = async () => { await saveScenePng(); close(); };

    const handleCopyShareLink = async () => {
        const preset = useEngineStore.getState().getPreset({ includeScene: true });
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
        onClick={() => { void saveScenePng(); }}
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
    const loadScene = useEngineStore((s) => s.loadScene);

    const handleFile = async (file: File) => {
        const preset = await loadSceneFile(file);
        if (!preset) {
            console.warn('[SceneIO] Could not parse scene from', file.name);
            return;
        }
        // loadScene (not loadPreset) — wraps loadPreset with the compile
        // gate AND posts CONFIG_DONE to the worker, which fires compile
        // immediately instead of waiting on the 200 ms scheduleCompile
        // debounce. Critical for GMF loads with a custom formula: the
        // app's parseScene has just registered the formula def + emitted
        // REGISTER_FORMULA; loadScene's CONFIG_DONE flushes the compile
        // so the worker picks up the new shader. Without CONFIG_DONE the
        // worker's debounce + REGISTER_FORMULA ordering is racy and the
        // compile may target the wrong (or missing) formula.
        loadScene({ preset });
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
