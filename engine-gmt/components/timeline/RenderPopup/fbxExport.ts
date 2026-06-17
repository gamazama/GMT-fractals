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

import * as THREE from 'three';
import { useAnimationStore } from '../../../../store/animationStore';
import { useEngineStore } from '../../../../store/engineStore';
import { showToast } from '../../../../engine/store/toastStore';
import { animationEngine } from '../../../../engine/AnimationEngine';
import { applyExportModulations } from '../exportModulations';
import { getViewportCamera } from '../../../engine/worker/ViewportRefs';
import { buildFbxScene, type FbxFrame, type FbxSample } from './fbxScene';

// ─── Options ──────────────────────────────────────────────────────────────

export interface FbxExportOptions {
    fps:         number;
    startFrame:  number;
    endFrame:    number;
    frameStep:   number;
    /** Used for the camera name and the downloaded .fbx filename. */
    projectName: string;
}

// ─── Constants / conversions ──────────────────────────────────────────────

const KTIME_PER_SEC = 46186158000; // FBX classic time base (default time mode)
const RAD2DEG = 180 / Math.PI;
/** Start-frame camera distance from origin, in FBX units (a 1m-ish nominal at
 *  the default cm unit-scale → keeps deep-zoom-scaled numbers sane). */
const NOMINAL = 100;

/** FBX cameras look down local +X; this turns +X to point along GMT's -Z. */
const CAM_FORWARD_FIX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);

/** GMT camera quaternion → FBX Lcl Rotation Euler (degrees), XYZ order. */
const quatToFbxEuler = (q: THREE.Quaternion): [number, number, number] => {
    const qf = q.clone().multiply(CAM_FORWARD_FIX);
    const e = new THREE.Euler().setFromQuaternion(qf, 'XYZ');
    return [e.x * RAD2DEG, e.y * RAD2DEG, e.z * RAD2DEG];
};

/** Keep an Euler angle within ±180° of the previous frame so the curve sweeps
 *  the short way instead of spinning across the 0/360 seam. */
const unwrapDeg = (curr: number, prev: number): number => {
    let d = curr - prev;
    while (d > 180)  { curr -= 360; d -= 360; }
    while (d < -180) { curr += 360; d += 360; }
    return curr;
};

/** High+low split subtraction — cancels the shared magnitude so a deep-zoom
 *  scene's tiny relative motion survives in plain doubles. */
const splitSub = (aHi: number, aLo: number, bHi: number, bLo: number): number =>
    (aHi - bHi) + (aLo - bLo);

const safeName = (s: string): string => (s || 'GMT').replace(/[^\w\-]+/g, '_');

// ─── Sampler (cloned from afxExport.sampleAfxFrames, FBX-space output) ──────

export const sampleFbxFrames = (opts: FbxExportOptions): FbxSample => {
    const cam0 = getViewportCamera() as THREE.PerspectiveCamera | null;
    const fovDeg = cam0?.fov ?? 60;

    const animState = useAnimationStore.getState();
    const savedFrame = animState.currentFrame;
    const savedPlaying = animState.isPlaying;
    if (savedPlaying) animState.pause();

    // Positional lights only (Directional lights have no world position).
    // Index into the store array (order is stable across scrubbing).
    const allLights0 = useEngineStore.getState().lighting?.lights ?? [];
    const lightIdx: number[] = [];
    const lightMeta: Array<{ name: string }> = [];
    allLights0.forEach((l, i) => {
        if (l.type === 'Point' || l.type === 'Sphere') {
            lightIdx.push(i);
            lightMeta.push({ name: `GMT ${l.type} Light ${lightIdx.length}` });
        }
    });

    const step = Math.max(1, opts.frameStep);
    const totalFrames = Math.max(1, Math.floor((opts.endFrame - opts.startFrame) / step) + 1);

    // ── START reference R = start-frame look-at ──
    animationEngine.scrub(opts.startFrame);
    const cStart = getViewportCamera() as THREE.PerspectiveCamera | null;
    const soStart = useEngineStore.getState().sceneOffset;
    const dStart = Math.max((useEngineStore.getState() as any).targetDistance ?? 3.5, 1e-12);
    const qStart = cStart ? cStart.quaternion.clone() : new THREE.Quaternion();
    const camLocalStart = cStart ? cStart.position.clone() : new THREE.Vector3();
    const fwdStart = new THREE.Vector3(0, 0, -1).applyQuaternion(qStart);

    const rHi = {
        x: soStart.x, y: soStart.y, z: soStart.z,
        xL: soStart.xL ?? 0, yL: soStart.yL ?? 0, zL: soStart.zL ?? 0,
    };
    const rLocal = camLocalStart.clone().add(fwdStart.multiplyScalar(dStart));
    const rUnified = {
        x: rHi.x + rHi.xL + rLocal.x,
        y: rHi.y + rHi.yL + rLocal.y,
        z: rHi.z + rHi.zL + rLocal.z,
    };
    const scale = NOMINAL / dStart;

    const frames: FbxFrame[] = [];
    const times: number[] = [];
    let prevRot: [number, number, number] | null = null;
    try {
        for (let i = 0; i < totalFrames; i++) {
            const tf = opts.startFrame + i * step;
            const time = tf / opts.fps;
            animationEngine.scrub(tf);
            applyExportModulations(time, 1.0 / opts.fps);

            const c = getViewportCamera() as THREE.PerspectiveCamera | null;
            const so = useEngineStore.getState().sceneOffset;
            const camLocal = c ? c.position : camLocalStart;

            const relX = splitSub(so.x, so.xL ?? 0, rHi.x, rHi.xL) + (camLocal.x - rLocal.x);
            const relY = splitSub(so.y, so.yL ?? 0, rHi.y, rHi.yL) + (camLocal.y - rLocal.y);
            const relZ = splitSub(so.z, so.zL ?? 0, rHi.z, rHi.zL) + (camLocal.z - rLocal.z);
            const pos: [number, number, number] = [scale * relX, scale * relY, scale * relZ];

            let rot = quatToFbxEuler(c ? c.quaternion : qStart);
            if (prevRot) rot = [unwrapDeg(rot[0], prevRot[0]), unwrapDeg(rot[1], prevRot[1]), unwrapDeg(rot[2], prevRot[2])];
            prevRot = rot;

            const curLights = useEngineStore.getState().lighting?.lights ?? [];
            const lights: Array<[number, number, number]> = lightIdx.map((idx) => {
                const lp = curLights[idx]?.position ?? { x: 0, y: 0, z: 0 };
                return [scale * (lp.x - rUnified.x), scale * (lp.y - rUnified.y), scale * (lp.z - rUnified.z)];
            });

            frames.push({ pos, rot, lights });
            times.push(Math.round((i * step / opts.fps) * KTIME_PER_SEC));
        }
    } finally {
        animationEngine.scrub(savedFrame);
        if (savedPlaying) useAnimationStore.getState().play();
    }

    return { frames, fovDeg, times, lightMeta, fps: opts.fps };
};

// ─── Orchestrator ──────────────────────────────────────────────────────────

export const runFbxExport = (opts: FbxExportOptions): void => {
    try {
        const sample = sampleFbxFrames(opts);
        const bytes = buildFbxScene(sample, opts.projectName);
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
        showToast(
            `FBX saved to your Downloads:  ${fileName}\n` +
            `\n` +
            `Import it in your 3D app (C4D / Blender / Maya / Resolve Fusion). It carries the\n` +
            `camera animation, lens (${sample.fovDeg.toFixed(1)}° vertical FOV) and ${sample.lightMeta.length} light null(s)\n` +
            `across ${sample.frames.length} frames. Place your rendered plate at the scene origin to composite.`,
            'info', 14000,
        );
    } catch (e) {
        console.error('FBX export failed', e);
        showToast(`FBX export failed: ${e instanceof Error ? e.message : String(e)}`, 'error', 5000);
    }
};
