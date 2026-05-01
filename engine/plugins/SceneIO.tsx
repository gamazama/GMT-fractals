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
import { useTutorAnchor } from './Tutorial';
import type { Preset } from '../../types';
import {
    serializeScene,
    parseSceneJson,
    extractScenePng,
    snapshotSceneToPng,
    downloadBlob,
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
    /** File extension (no dot) used for the primary "Save Scene" menu
     *  item. Default `'json'` — apps with a richer format set this to
     *  match (e.g. GMT passes `'gmf'` so the download is named
     *  `scene.gmf` matching the GMF bytes the serializer writes). */
    fileExtension?: string;
    /** Optional tutorial anchor id to register on the snapshot button.
     *  Apps with tutorials that need to highlight the snapshot affordance
     *  pass an id (e.g. GMT uses 'snapshot-btn'). Default: no anchor. */
    snapshotAnchor?: string;
}

let _installed = false;
let _getCanvas: (() => HTMLCanvasElement | null) | undefined;
let _parseScene: SceneParser | undefined;
let _serializeScene: SceneSerializer | undefined;
let _fileExtension: string = 'json';
let _snapshotAnchor: string | undefined;

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
    if (options.fileExtension) _fileExtension = options.fileExtension;
    if (options.snapshotAnchor) _snapshotAnchor = options.snapshotAnchor;
    if (_installed) return;
    _installed = true;

    // File menu groups Save Scene / Save PNG / Save JPG / Load behind a
    // single dropdown so the topbar isn't crowded by individual buttons
    // for each format. Snapshot is the only standalone save affordance
    // — it's the most-used action so it's promoted out of the menu.
    //
    // order 29.5 places it right after the GMT Camera menu (29) and
    // before System (30) — apps without a Camera menu will see it sit
    // before System anyway, which still reads as menu-cluster-on-the-right.
    topbar.register({ id: 'scene-file', slot: 'right', order: 29.5, component: FileMenu });

    // Standalone one-click snapshot button — the heavy-use PNG action
    // promoted out of the File menu so users don't have to open it for
    // every screenshot. Hidden when the app has no canvas. Uses an
    // image icon (not a camera icon) to stay visually distinct from
    // app-level camera-menu buttons that share the camera glyph.
    if (_getCanvas) {
        topbar.register({ id: 'scene-snapshot', slot: 'right', order: 19, component: SnapshotButton });
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
    topbar.unregister('scene-file');
    topbar.unregister('scene-snapshot');
    shortcuts.unregister('scene-io.quick-png');
    _getCanvas = undefined;
    _parseScene = undefined;
    _serializeScene = undefined;
    _fileExtension = 'json';
    _snapshotAnchor = undefined;
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
 * Save the current scene as a text-format download (JSON or whatever
 * the registered serializer produces — GMT writes GMF). Routes through
 * the SceneIO-registered `serializeScene` — no way to bypass.
 *
 * @param filename Override; defaults to `<project-name>.<fileExtension>`
 *   (extension defaults to 'json', GMT installs with 'gmf').
 */
export const saveScene = (filename?: string): void => {
    const preset = useEngineStore.getState().getPreset({ includeScene: true });
    const text = activeSerializer()(preset);
    const blob = new Blob([text], { type: 'application/json' });
    downloadBlob(blob, filename ?? `${defaultFileStem()}.${_fileExtension}`);
};

/**
 * Snapshot the registered canvas and save as a JPG. Web-friendly format
 * for sharing the rendered image — does NOT embed scene metadata (JPG's
 * EXIF is too awkward to write by hand and most receivers strip it
 * anyway). Use PNG when you want a re-loadable file.
 *
 * @param filename Override; defaults to `<project-name>.jpg`.
 * @param quality JPEG quality 0..1; defaults to 0.92 (visually lossless
 *   for typical fractal renders, ~3x smaller than PNG).
 */
export const saveSceneJpg = async (filename?: string, quality: number = 0.92): Promise<void> => {
    const canvas = _getCanvas?.();
    if (!canvas) {
        console.warn('[SceneIO] JPG save requested but no canvas accessor registered');
        return;
    }
    const blob: Blob | null = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
    });
    if (!blob) {
        console.warn('[SceneIO] canvas.toBlob returned null for JPEG');
        return;
    }
    downloadBlob(blob, filename ?? `${defaultFileStem()}.jpg`);
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

// ── Icons ───────────────────────────────────────────────────────────────

const FolderIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
);

const ChevronDownIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

// Image / picture glyph for the snapshot button. Visually distinct from
// the camera glyph used by app-level camera-menu buttons (saved cameras
// / nav modes), preventing the two from looking identical in the topbar.
const ImageIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
    </svg>
);

// ── File menu (Save Scene / Save PNG / Save JPG / Load) ─────────────────

export const FileMenu: React.FC = () => {
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const loadScene = useEngineStore((s) => s.loadScene);
    // Subscribe so the menu re-renders if the project name changes;
    // saveScene / saveScenePng read the current name internally.
    useEngineStore((s) => s.projectSettings.name);

    const close = useCallback(() => setOpen(false), []);

    const handleSaveScene = () => { saveScene(); close(); };
    const handleSavePng   = async () => { await saveScenePng(); close(); };
    const handleSaveJpg   = async () => { await saveSceneJpg(); close(); };
    const handleLoad      = () => { inputRef.current?.click(); close(); };

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
        // so the worker picks up the new shader.
        loadScene({ preset });
    };

    const itemCls = 'w-full text-left px-3 py-2 text-[10px] text-gray-300 hover:bg-white/10 hover:text-white transition-colors';
    const sepCls  = 'border-t border-white/5';

    return (
        <div className="relative">
            <input
                ref={inputRef}
                type="file"
                accept="application/json,.json,.gmf,image/png"
                aria-label="Load scene file"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    if (inputRef.current) inputRef.current.value = '';
                }}
            />
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-1 text-[10px] font-medium text-gray-300 hover:text-white bg-black/40 hover:bg-white/5 border border-white/10 hover:border-cyan-500/40 rounded px-2 py-1 transition-colors"
                title="File"
            >
                <FolderIcon />
                <span>File</span>
                <ChevronDownIcon />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={close} />
                    <div className="absolute top-full right-0 mt-1 w-56 bg-black/95 border border-white/10 rounded shadow-xl z-50 overflow-hidden">
                        <button type="button" onClick={handleLoad} className={itemCls}>Load Scene <span className="text-gray-500">(PNG/GMF)</span></button>
                        <button type="button" onClick={handleSaveScene} className={`${itemCls} ${sepCls}`}>Save Scene <span className="text-gray-500">(GMF)</span></button>
                        {_getCanvas && (
                            <>
                                <button type="button" onClick={handleSavePng} className={`${itemCls} ${sepCls}`}>Save Scene <span className="text-gray-500">(PNG) (Alt+S)</span></button>
                                <button type="button" onClick={handleSaveJpg} className={`${itemCls} ${sepCls}`}>Save Image only <span className="text-gray-500">(JPG)</span></button>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

// ── Snapshot button (one-click PNG) ─────────────────────────────────────

export const SnapshotButton: React.FC = () => {
    const tutAnchor = useTutorAnchor(_snapshotAnchor);
    return (
        <button
            ref={tutAnchor}
            type="button"
            onClick={() => { void saveScenePng(); }}
            className="flex items-center gap-1 text-[10px] font-medium text-gray-300 hover:text-white bg-black/40 hover:bg-white/5 border border-white/10 hover:border-cyan-500/40 rounded px-2 py-1 transition-colors"
            title="Save PNG snapshot (Alt+S)"
            aria-label="Save PNG snapshot"
        >
            <ImageIcon />
        </button>
    );
};
