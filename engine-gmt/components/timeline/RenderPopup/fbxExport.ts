/**
 * FBX camera-rig export — the binary-FBX twin of the After Effects export
 * (afxExport.ts). Produces a `.fbx` (binary, version 7400) carrying GMT's
 * camera animation, positional-light nulls, and the camera lens, for
 * compositing a separately-rendered plate in C4D / Blender / Maya / Fusion.
 *
 * Relationship to the AFX export
 * ------------------------------
 * The frame sampler here is cloned from afxExport.ts `sampleAfxFrames` (proven
 * scrub → camera/sceneOffset/lights/sliders, with deep-zoom start-frame
 * re-basing in split precision). It is NOT yet factored into a shared
 * `sceneSampler` — that unification is deferred so the just-shipped AFX path
 * stays untouched. The divergence is the coordinate target:
 *
 *   • AFX → After Effects: left-handed, Y-down, +Z into screen, comp pixels.
 *   • FBX → DCC: right-handed, Y-up, like GMT itself — so NO axis flips, just
 *     a uniform world scale. Output stays Y-up; Z-up apps (Max/Unreal/Blender)
 *     convert on import via GlobalSettings (see fbxBinary.ts).
 *
 * Coordinate mapping (GMT → FBX)
 * ------------------------------
 * Re-base everything to the START-frame look-at R (camera + forward·D), which
 * maps to the FBX origin — so a deep-zoomed scene survives the trip in plain
 * doubles. Camera position = scale·(motion relative to R); the start camera
 * lands at distance NOMINAL from the origin, looking at it. FBX cameras aim
 * down their local +X, so the camera orientation is post-multiplied by a +90°
 * Y rotation (verified in C4D). Euler is read in XYZ with per-frame unwrap;
 * if a deep flythrough shows an occasional rotation flip it's the XYZ-gimbal
 * seam — same trade-off the AFX exporter accepts.
 */

import { showToast } from '../../../../engine/store/toastStore';
import { sampleScene } from './sceneSampler';
import { buildFbxScene, type FbxFrame, type FbxSample } from './fbxScene';

// ─── Options ──────────────────────────────────────────────────────────────

export interface FbxExportOptions {
    fps:         number;
    startFrame:  number;
    endFrame:    number;
    frameStep:   number;
    /** Animation track ids to export as PSR-encoded param nulls (value on Y). */
    sliderTrackIds: string[];
    /** Optional camera-locked backdrop plate. Blank filename = no plate. */
    footageFileName?: string;
    /** Footage aspect (width / height) for sizing the plate. Defaults to 16:9. */
    footageAspect?: number;
    /** Used for the camera name and the downloaded .fbx filename. */
    projectName: string;
}

// ─── Constants / conversions ──────────────────────────────────────────────

const KTIME_PER_SEC = 46186158000; // FBX classic time base (default time mode)
const RAD2DEG = 180 / Math.PI;
/** Start-frame camera distance from origin, in FBX units (a 1m-ish nominal at
 *  the default cm unit-scale → keeps deep-zoom-scaled numbers sane). */
const NOMINAL = 100;

const safeName = (s: string): string => (s || 'GMT').replace(/[^\w\-]+/g, '_');

// ─── Sampler ────────────────────────────────────────────────────────────────

/**
 * Adapter over the shared {@link sampleScene}: applies the FBX coordinate
 * convention (right-handed, Y-up — no axis flip, just a uniform world scale)
 * and bakes rotation straight from the neutral Euler tracks (the render's
 * source of truth; the constant +X→−Z camera-forward correction lives in the
 * camera Model's PostRotation in fbxScene.ts, so the animated channel never
 * gimbal-flips). Lights/params come from the same shared sample.
 */
export const sampleFbxFrames = (opts: FbxExportOptions): FbxSample => {
    const scene = sampleScene({
        fps: opts.fps, startFrame: opts.startFrame, endFrame: opts.endFrame,
        frameStep: opts.frameStep, trackIds: opts.sliderTrackIds,
    });

    const step = Math.max(1, opts.frameStep);
    const scale = NOMINAL / scene.dStart;

    const frames: FbxFrame[] = scene.frames.map((f) => ({
        pos: [scale * f.relPos[0], scale * f.relPos[1], scale * f.relPos[2]],
        rot: [f.rotEuler[0] * RAD2DEG, f.rotEuler[1] * RAD2DEG, f.rotEuler[2] * RAD2DEG],
        lights: f.lightsRel.map((l): [number, number, number] => [scale * l[0], scale * l[1], scale * l[2]]),
        params: f.trackValues,
    }));
    const times = scene.frames.map((_, i) => Math.round((i * step / opts.fps) * KTIME_PER_SEC));

    return {
        frames, fovDeg: scene.fovDeg, times,
        lightMeta: scene.lightMeta, paramMeta: scene.trackMeta, fps: opts.fps,
    };
};

// ─── Orchestrator ──────────────────────────────────────────────────────────

export const runFbxExport = (opts: FbxExportOptions): void => {
    try {
        const sample = sampleFbxFrames(opts);
        const plate = opts.footageFileName
            ? { footageFileName: opts.footageFileName, aspect: opts.footageAspect ?? (16 / 9) }
            : undefined;
        const bytes = buildFbxScene(sample, opts.projectName, plate);
        // serializeFbxBinary returns a fresh full-length slice, so its backing
        // buffer is exactly the file bytes (offset 0) — hand that to the Blob.
        const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileName = `${safeName(opts.projectName)}_GMT.fbx`;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        const paramNote = sample.paramMeta.length
            ? `\n${sample.paramMeta.length} param null(s) — read each value off "GMT_param_<name>" Position Y.`
            : '';
        const plateNote = opts.footageFileName
            ? `\nA camera-locked "GMT Plate" references "${opts.footageFileName}" — render that separately and keep it beside the .fbx.`
            : `\nNo backdrop plate — render your video separately to composite behind the move.`;
        showToast(
            `FBX saved to your Downloads:  ${fileName}\n` +
            `\n` +
            `Import it in your 3D app (C4D / Blender / Maya / Resolve Fusion). It carries the\n` +
            `camera animation, lens (${sample.fovDeg.toFixed(1)}° vertical FOV) and ${sample.lightMeta.length} light null(s)\n` +
            `across ${sample.frames.length} frames.` +
            plateNote + paramNote,
            'info', 14000,
        );
    } catch (e) {
        console.error('FBX export failed', e);
        showToast(`FBX export failed: ${e instanceof Error ? e.message : String(e)}`, 'error', 5000);
    }
};
