/**
 * SceneFormat — generic scene save/load for the engine.
 *
 * Three transports:
 *   JSON → plain-text, human-readable, app-authored scene files
 *   PNG  → snapshot with scene data embedded in an iTXt chunk
 *   URL  → compact share string via UrlStateEncoder + pako
 *
 * A "scene" here is the engine's generic `Preset` shape: a bag of
 * feature state keyed by feature id, plus app-extensible top-level
 * fields (camera, animations, etc.). Apps extend `Preset` via
 * declaration merging to add their own typed fields without touching
 * this module.
 *
 * The load path is `parseSceneJson(...)` / `extractScenePng(...)` →
 * `Preset`. Apps then pass that Preset to `applyPresetState` (in
 * PresetLogic) to hydrate the live store.
 */

import type { Preset } from '../types';
import { injectMetadata, extractMetadata } from './pngMetadata';
import { generateShareStringFromPreset, parseShareString } from './Sharing';

/** iTXt keyword used when embedding a scene in a PNG (new engine saves). */
export const SCENE_METADATA_KEY = 'SceneData';

/**
 * Legacy iTXt keyword used by GMT (gmt-0.8.5) saves. PNGs exported by
 * the original app embed their data under this key. We try it as a
 * fallback so old saves round-trip cleanly.
 */
const LEGACY_GMT_METADATA_KEY = 'FractalData';

// ── JSON ──────────────────────────────────────────────────────────────

/** Serialize a scene to a pretty-printed JSON string. */
export const serializeScene = (preset: Preset): string => {
    return JSON.stringify(preset, null, 2);
};

/**
 * Parse a scene from a string — handles three formats:
 *   1. Plain JSON preset  (engine saves, most .json files)
 *   2. GMF with <Scene>   (GMT scene-saves: GMF header + <Scene>JSON</Scene>)
 *   3. GMF formula-only   (v1 GMF: no <Scene> block — returns null, can't restore scene)
 *
 * Returns null on invalid / unrecognised content.
 */
export const parseSceneJson = (content: string): Preset | null => {
    // GMF format: starts with a <!-- GMT comment block
    if (content.trimStart().startsWith('<!--')) {
        const sceneMatch = content.match(/<Scene>([\s\S]*?)<\/Scene>/);
        if (sceneMatch) {
            try {
                return JSON.parse(sceneMatch[1].trim()) as Preset;
            } catch (e) {
                console.error('[SceneFormat] Invalid JSON in GMF <Scene> block:', e);
                return null;
            }
        }
        // v1 formula-only GMF — no scene state embedded, can't restore
        console.warn('[SceneFormat] GMF has no <Scene> block — formula-only preset, scene not restored');
        return null;
    }

    // Plain JSON
    try {
        return JSON.parse(content) as Preset;
    } catch (e) {
        console.error('[SceneFormat] Invalid scene JSON:', e);
        return null;
    }
};

// ── PNG embed/extract ─────────────────────────────────────────────────

/**
 * Embed a scene into a PNG's iTXt chunk. The input Blob is the visual
 * payload (e.g. a canvas snapshot); the output is a new Blob containing
 * the same image plus the scene data.
 */
export const embedScenePng = (png: Blob, preset: Preset): Promise<Blob> => {
    const json = serializeScene(preset);
    return injectMetadata(png, SCENE_METADATA_KEY, json);
};

/**
 * Extract a scene from a PNG's iTXt chunk. Returns null if the PNG has
 * no embedded scene data or the data fails to parse.
 *
 * Tries the engine's own key ('SceneData') first, then the legacy GMT
 * key ('FractalData') so PNGs saved by gmt-0.8.5 load correctly.
 */
export const extractScenePng = async (png: File): Promise<Preset | null> => {
    let content = await extractMetadata(png, SCENE_METADATA_KEY);
    if (!content) content = await extractMetadata(png, LEGACY_GMT_METADATA_KEY);
    if (!content) return null;
    return parseSceneJson(content);
};

// ── Universal file loader ─────────────────────────────────────────────

/**
 * Load a scene from any supported file. Auto-detects format:
 *   - image/png   → extracts scene from iTXt chunk (SceneData or FractalData key)
 *   - .gmf / .json / anything else → parseSceneJson handles GMF + plain JSON
 */
export const loadSceneFromFile = async (file: File): Promise<Preset | null> => {
    const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
    if (isPng) return extractScenePng(file);
    const text = await file.text();
    return parseSceneJson(text);
};

// ── Snapshot helpers ──────────────────────────────────────────────────

/** Convert an HTMLCanvasElement to a PNG Blob. */
export const canvasToPngBlob = (canvas: HTMLCanvasElement): Promise<Blob | null> => {
    return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png'));
};

/** Produce a PNG snapshot of a canvas with an embedded scene. */
export const snapshotSceneToPng = async (
    canvas: HTMLCanvasElement,
    preset: Preset,
): Promise<Blob> => {
    const raw = await canvasToPngBlob(canvas);
    if (!raw) throw new Error('Canvas snapshot failed (canvas.toBlob returned null)');
    return embedScenePng(raw, preset);
};

// ── Download helpers ──────────────────────────────────────────────────

/** Trigger a browser download for a Blob with the given filename. */
export const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    // Revoke on next tick to give the browser time to process the click.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Save a scene as a JSON download. */
export const downloadSceneJson = (preset: Preset, filename: string) => {
    const blob = new Blob([serializeScene(preset)], { type: 'application/json' });
    downloadBlob(blob, filename);
};

/** Save a canvas snapshot as a PNG with embedded scene data. */
export const downloadScenePng = async (
    canvas: HTMLCanvasElement,
    preset: Preset,
    filename: string,
) => {
    const blob = await snapshotSceneToPng(canvas, preset);
    downloadBlob(blob, filename);
};

/** Save a plain canvas screenshot (no embedded scene data). */
export const downloadScreenshot = async (canvas: HTMLCanvasElement, filename: string) => {
    const blob = await canvasToPngBlob(canvas);
    if (!blob) throw new Error('Canvas snapshot failed');
    downloadBlob(blob, filename);
};

// ── URL sharing (re-exports for the one-stop format API) ──────────────

export { generateShareStringFromPreset, parseShareString };
