/**
 * Shared timeline sampler for the camera-rig exporters (After Effects + FBX).
 *
 * Scrubs the animation frame-by-frame and records NEUTRAL, GMT-space data:
 * the deep-zoom-rebased camera offset, the camera quaternion AND the raw
 * camera.rotation Euler tracks, positional-light offsets, and chosen track
 * values. Each exporter then applies its OWN coordinate conversion:
 *   • AFX (afxExport.ts) → After Effects: left-handed, Y-down, comp pixels.
 *   • FBX (fbxExport.ts) → DCC: right-handed, Y-up, world units.
 *
 * The split was extracted from the two exporters' previously-duplicated
 * samplers; both must keep byte-identical output, so the rebasing math here is
 * verbatim from afxExport.sampleAfxFrames. Anything coordinate-system- or
 * lens-specific stays in the exporters, not here.
 *
 * Re-basing: everything is expressed relative to the START-frame look-at R
 * (camera + forward·D), so a deep-zoomed scene survives in plain doubles. The
 * high part of R is the start sceneOffset (split precision); positions cancel
 * the shared magnitude via splitSub. Values here are UNSCALED — each exporter
 * multiplies by its own scale (AE: zoom/D, FBX: nominal/D).
 */

import * as THREE from 'three';
import { useAnimationStore } from '../../../../store/animationStore';
import { useEngineStore } from '../../../../store/engineStore';
import { animationEngine } from '../../../../engine/AnimationEngine';
import { applyExportModulations } from '../exportModulations';
import { getViewportCamera } from '../../../engine/worker/ViewportRefs';

export interface SceneSamplerOptions {
    fps:        number;
    startFrame: number;
    endFrame:   number;
    frameStep:  number;
    /** Animation track ids to evaluate per frame (AE sliders / FBX params). */
    trackIds:   string[];
}

export interface SceneFrame {
    /** GMT-world camera offset, re-based to R, UNSCALED. */
    relPos:      [number, number, number];
    /** Camera world quaternion [x,y,z,w] (for handedness-flip conversions). */
    quat:        [number, number, number, number];
    /** Raw camera.rotation Euler (radians, XYZ) — the render's rotation source
     *  of truth; use this for same-handedness Euler targets to avoid a
     *  quaternion→Euler round-trip that gimbal-flips. */
    rotEuler:    [number, number, number];
    /** Positional-light offsets, re-based to R (plain double), UNSCALED. */
    lightsRel:   Array<[number, number, number]>;
    /** Evaluated values of `trackIds`, in order. */
    trackValues: number[];
}

export interface SceneSample {
    frames:    SceneFrame[];
    /** Start-frame target distance (the re-basing radius). */
    dStart:    number;
    /** Camera vertical FOV in degrees (read before scrubbing). */
    fovDeg:    number;
    lightMeta: Array<{ name: string }>;
    trackMeta: Array<{ name: string }>;
}

const ROT_TRACK = ['camera.rotation.x', 'camera.rotation.y', 'camera.rotation.z'] as const;

/** High+low split subtraction — cancels the shared magnitude exactly so the
 *  tiny relative motion of a deep-zoom scene survives in plain doubles. */
const splitSub = (aHi: number, aLo: number, bHi: number, bLo: number): number =>
    (aHi - bHi) + (aLo - bLo);

export const sampleScene = (opts: SceneSamplerOptions): SceneSample => {
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

    const trackMeta = opts.trackIds.map((id) => {
        const t = useAnimationStore.getState().sequence.tracks[id];
        return { name: t?.label || id };
    });

    const step = Math.max(1, opts.frameStep);
    const totalFrames = Math.max(1, Math.floor((opts.endFrame - opts.startFrame) / step) + 1);

    // ── Capture START reference (R = start-frame look-at) ──
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

    // Rotation tracks (render's smooth source); fallback = static start Euler.
    const seqTracks = useAnimationStore.getState().sequence.tracks;
    const rotTracks = ROT_TRACK.map((id) => seqTracks[id]);
    const eStart = cStart ? cStart.rotation : new THREE.Euler();
    const rotFallback: [number, number, number] = [eStart.x, eStart.y, eStart.z];

    const frames: SceneFrame[] = [];
    try {
        for (let i = 0; i < totalFrames; i++) {
            const tf = opts.startFrame + i * step;
            const time = tf / opts.fps;
            animationEngine.scrub(tf);
            applyExportModulations(time, 1.0 / opts.fps);

            const c = getViewportCamera() as THREE.PerspectiveCamera | null;
            const so = useEngineStore.getState().sceneOffset;
            const camLocal = c ? c.position : camLocalStart;

            const relPos: [number, number, number] = [
                splitSub(so.x, so.xL ?? 0, rHi.x, rHi.xL) + (camLocal.x - rLocal.x),
                splitSub(so.y, so.yL ?? 0, rHi.y, rHi.yL) + (camLocal.y - rLocal.y),
                splitSub(so.z, so.zL ?? 0, rHi.z, rHi.zL) + (camLocal.z - rLocal.z),
            ];

            const q = c ? c.quaternion : qStart;
            const quat: [number, number, number, number] = [q.x, q.y, q.z, q.w];

            const rotEuler: [number, number, number] = [
                rotTracks[0] ? animationEngine.evaluateTrack(rotTracks[0], tf) : rotFallback[0],
                rotTracks[1] ? animationEngine.evaluateTrack(rotTracks[1], tf) : rotFallback[1],
                rotTracks[2] ? animationEngine.evaluateTrack(rotTracks[2], tf) : rotFallback[2],
            ];

            const curLights = useEngineStore.getState().lighting?.lights ?? [];
            const lightsRel: Array<[number, number, number]> = lightIdx.map((idx) => {
                const lp = curLights[idx]?.position ?? { x: 0, y: 0, z: 0 };
                return [lp.x - rUnified.x, lp.y - rUnified.y, lp.z - rUnified.z];
            });

            const seq = useAnimationStore.getState().sequence;
            const trackValues = opts.trackIds.map((id) => {
                const t = seq.tracks[id];
                return t ? animationEngine.evaluateTrack(t, tf) : 0;
            });

            frames.push({ relPos, quat, rotEuler, lightsRel, trackValues });
        }
    } finally {
        // Always restore the user's timeline, even if sampling throws.
        animationEngine.scrub(savedFrame);
        if (savedPlaying) useAnimationStore.getState().play();
    }

    return { frames, dStart, fovDeg, lightMeta, trackMeta };
};
