/**
 * After Effects ("Save AFX comp") export.
 *
 * Produces a `.jsx` ExtendScript that the user runs inside After Effects
 * (File ▸ Scripts ▸ Run Script File…). The script rebuilds the template
 * the artist verified in `H:\GMT\stuff\afx-export\sampleAfxExport.aep`:
 *
 *   • a comp matched to the export resolution / fps
 *   • the rendered video as the background plate (referenced by filename,
 *     with a placeholder solid fallback when the render isn't present yet)
 *   • a one-node camera carrying GMT's camera animation
 *   • a scene-centre null at the look-at (origin for parented 3D layers)
 *   • a null per positional (Point / Sphere) light
 *   • a hidden "controls" solid exposing the chosen animated scalar
 *     params as keyframed Slider Controls
 *
 * Coordinate mapping (GMT → AE)
 * -----------------------------
 * GMT is right-handed, Y-up, camera looks down −Z. AE is left-handed,
 * Y-down, camera looks down +Z. We also re-base everything to the START
 * frame so a deep-zoomed scene (whose absolute unified coordinate carries
 * ~1e-30 of precision in the split-float `sceneOffset`) survives the trip:
 * AE's doubles only ever see the RELATIVE motion, which we compute in
 * split precision (high-part subtraction cancels the huge common magnitude
 * exactly, low-part diff carries the fine motion) and then multiply by a
 * correspondingly large calibration scale so it lands as normal AE-sized
 * numbers. See the long design thread for the derivation.
 *
 * The reference point R is the start-frame LOOK-AT (camera + forward·D),
 * which maps to AE's origin (where the scene-centre null sits). The start
 * camera therefore lands at (centreX, centreY, −Zoom) — matching AE's
 * stock default-camera position — regardless of how deep the scene is.
 *
 * The two axis/orientation conversions are deliberately isolated in
 * `gmtToAePosition` / `quatToAeOrientation` and commented: if a visual
 * check in AE shows the camera mirrored or upside-down, a single sign /
 * Euler-order flip there fixes it without touching the sampler.
 */

import * as THREE from 'three';
import { showToast } from '../../../../engine/store/toastStore';
import { sampleScene } from './sceneSampler';

// ─── Public option / result shapes ────────────────────────────────────

export interface AfxExportOptions {
    width:           number;
    height:          number;
    fps:             number;
    startFrame:      number;
    endFrame:        number;
    frameStep:       number;
    /** Filename the AE footage layer points at (the user renders separately). */
    footageFileName: string;
    /** Animation track ids to expose as keyframed Slider Controls. */
    sliderTrackIds:  string[];
    /** Used for the comp + downloaded .jsx filename. */
    projectName:     string;
}

interface SampledFrame {
    pos:     [number, number, number];   // AE camera position (comp px)
    orient:  [number, number, number];   // AE orientation (degrees)
    lights:  Array<[number, number, number]>; // AE null positions, aligned to lightMeta
    sliders: number[];                   // raw track values, aligned to sliderTrackIds
}

export interface AfxSample {
    frames:      SampledFrame[];
    zoom:        number;
    durationSec: number;
    lightMeta:   Array<{ name: string }>;
    sliderMeta:  Array<{ name: string }>;
}

// ─── Coordinate conversions (isolated for easy visual-test tuning) ────

const RAD2DEG = 180 / Math.PI;

/** Relative GMT-world vector (already re-based to R) → AE comp-space
 *  position. Y and Z flip for AE's Y-down / +Z-into-screen convention. */
const gmtToAePosition = (
    relX: number, relY: number, relZ: number,
    scale: number, centreX: number, centreY: number,
): [number, number, number] => [
    centreX + scale * relX,
    centreY - scale * relY,   // AE Y is down
    -scale * relZ,            // AE +Z points into the screen
];

/** GMT camera quaternion → AE Orientation (degrees).
 *  Conjugate the rotation by the handedness-flip basis S = diag(1,−1,−1)
 *  (R_ae = S·R_gmt·S) then read Euler angles in AE's rotation order.
 *  If the camera aims wrong in AE, flip the basis or Euler order here. */
const FLIP = new THREE.Matrix4().makeScale(1, -1, -1);
const quatToAeOrientation = (q: THREE.Quaternion): [number, number, number] => {
    const r = new THREE.Matrix4().makeRotationFromQuaternion(q);
    const rAe = new THREE.Matrix4().multiplyMatrices(FLIP, r).multiply(FLIP);
    const e = new THREE.Euler().setFromRotationMatrix(rAe, 'ZYX');
    // Raw degrees — continuity across the 0/360 seam is handled by
    // unwrapDeg in the sampler loop (NOT a per-frame modulo, which would
    // make AE sweep the long way round on every seam crossing).
    return [e.x * RAD2DEG, e.y * RAD2DEG, e.z * RAD2DEG];
};

/** Keep an Euler angle within ±180° of the previous frame so AE
 *  interpolates the short way instead of spinning across the seam. */
const unwrapDeg = (curr: number, prev: number): number => {
    let d = curr - prev;
    while (d > 180)  { curr -= 360; d -= 360; }
    while (d < -180) { curr += 360; d += 360; }
    return curr;
};

const safeName = (s: string): string => (s || 'GMT').replace(/[^\w\-]+/g, '_');

// ─── Sampler ──────────────────────────────────────────────────────────

/**
 * Adapter over the shared {@link sampleScene}: takes the neutral GMT-space
 * sample and applies the After Effects coordinate conversion (handedness flip,
 * comp-pixel scale from the FOV-derived Zoom, scene-centre origin). Output is
 * byte-identical to the previous standalone sampler — the rebasing lives in
 * sceneSampler, only the AE-specific math is here.
 */
export const sampleAfxFrames = (opts: AfxExportOptions): AfxSample => {
    const scene = sampleScene({
        fps: opts.fps, startFrame: opts.startFrame, endFrame: opts.endFrame,
        frameStep: opts.frameStep, trackIds: opts.sliderTrackIds,
    });

    // AE has no FOV field — it derives focal length from comp size + Zoom.
    // Solve Zoom from GMT's vertical FOV so AE's lens matches the render.
    const zoom = (opts.height / 2) / Math.tan((scene.fovDeg / 2) * (Math.PI / 180));
    const scale = zoom / scene.dStart;
    const centreX = opts.width / 2;
    const centreY = opts.height / 2;

    const frames: SampledFrame[] = [];
    let prevOrient: [number, number, number] | null = null;
    for (const f of scene.frames) {
        const pos = gmtToAePosition(f.relPos[0], f.relPos[1], f.relPos[2], scale, centreX, centreY);
        let orient = quatToAeOrientation(new THREE.Quaternion(f.quat[0], f.quat[1], f.quat[2], f.quat[3]));
        if (prevOrient) {
            orient = [
                unwrapDeg(orient[0], prevOrient[0]),
                unwrapDeg(orient[1], prevOrient[1]),
                unwrapDeg(orient[2], prevOrient[2]),
            ];
        }
        prevOrient = orient;

        const lights = f.lightsRel.map((l) =>
            gmtToAePosition(l[0], l[1], l[2], scale, centreX, centreY));

        frames.push({ pos, orient, lights, sliders: f.trackValues });
    }

    return {
        frames,
        zoom,
        durationSec: scene.frames.length / opts.fps,
        lightMeta: scene.lightMeta,
        sliderMeta: scene.trackMeta,
    };
};

// ─── ExtendScript (.jsx) writer ───────────────────────────────────────

/**
 * Build the After Effects ExtendScript. Data is embedded as a JSON literal
 * (valid ExtendScript) and consumed by a fixed script body. Times are
 * comp-local (frame i → i/fps), so the comp always starts at 0.
 */
export const buildAfxJsx = (sample: AfxSample, opts: AfxExportOptions): string => {
    const compName = `${safeName(opts.projectName)}_GMT`;
    const frameStepSec = opts.frameStep / opts.fps;

    const times = sample.frames.map((_, i) => +(i * frameStepSec).toFixed(6));
    const camPos = sample.frames.map(f => f.pos.map(n => +n.toFixed(4)));
    const camOri = sample.frames.map(f => f.orient.map(n => +n.toFixed(4)));

    // Light + slider value tracks, transposed to per-entity arrays.
    const lightTracks = sample.lightMeta.map((lm, li) => ({
        name: lm.name,
        vals: sample.frames.map(f => f.lights[li].map(n => +n.toFixed(4))),
    }));
    // De-duplicate slider names so two params with the same label don't
    // produce two indistinguishable Slider Controls.
    const usedNames = new Map<string, number>();
    const sliderTracks = sample.sliderMeta.map((sm, si) => {
        const n = usedNames.get(sm.name) ?? 0;
        usedNames.set(sm.name, n + 1);
        return {
            name: n === 0 ? sm.name : `${sm.name} (${n + 1})`,
            vals: sample.frames.map(f => +f.sliders[si].toFixed(6)),
        };
    });

    const data = {
        compName,
        width:       opts.width,
        height:      opts.height,
        fps:         opts.fps,
        duration:    +sample.durationSec.toFixed(6),
        zoom:        +sample.zoom.toFixed(4),
        centre:      [opts.width / 2, opts.height / 2, 0],
        footage:     opts.footageFileName,
        times,
        camPos,
        camOri,
        lightTracks,
        sliderTracks,
    };

    return `// GMT → After Effects comp importer (auto-generated)
// Run: File ▸ Scripts ▸ Run Script File…  (After Effects)
// Camera lens matched to GMT FOV — Zoom ${data.zoom} for a ${data.height}px-tall comp.
(function () {
    var D = ${JSON.stringify(data, null, 1)};

    if (!app.project) app.newProject();
    var proj = app.project;
    app.beginUndoGroup("GMT: Import AFX comp");
    var usedPlaceholder = false;
    try {
        var comp = proj.items.addComp(D.compName, D.width, D.height, 1.0, Math.max(D.duration, 1 / D.fps), D.fps);
        comp.openInViewer();

        // ── Background plate (referenced render, placeholder fallback) ──
        // Resolve the footage: try it verbatim (absolute path), then next to
        // this .jsx (so "render + script in one folder" just works).
        var plate = null;
        try {
            var f = new File(D.footage);
            if (!f.exists && $.fileName) {
                f = new File(new File($.fileName).parent.fsName + "/" + D.footage);
            }
            if (f.exists) {
                var item = proj.importFile(new ImportOptions(f));
                plate = comp.layers.add(item);
                plate.name = "GMT plate (" + decodeURI(f.name) + ")";
            }
        } catch (e) { plate = null; }
        if (!plate) {
            usedPlaceholder = true;
            plate = comp.layers.addSolid([0.08, 0.08, 0.10], "GMT plate placeholder — replace with: " + D.footage, D.width, D.height, 1.0, comp.duration);
        }
        plate.moveToEnd(); // keep the plate at the bottom of the stack

        // ── Scene-centre null (look-at origin for parented 3D layers) ──
        var sceneNull = comp.layers.addNull(comp.duration);
        sceneNull.threeDLayer = true;
        sceneNull.name = "GMT scene centre";
        sceneNull.property("ADBE Transform Group").property("ADBE Position").setValue(D.centre);

        // ── One-node camera carrying GMT's animation ──
        var cam = comp.layers.addCamera("GMT Camera", [D.centre[0], D.centre[1]]);
        cam.autoOrient = AutoOrientType.NO_AUTO_ORIENT; // one-node: orientation, not point-of-interest
        cam.property("ADBE Camera Options Group").property("ADBE Camera Zoom").setValue(D.zoom);
        var camPos = cam.property("ADBE Transform Group").property("ADBE Position");
        var camOri = cam.property("ADBE Transform Group").property("ADBE Orientation");
        if (D.times.length > 1) {
            camPos.setValuesAtTimes(D.times, D.camPos);
            camOri.setValuesAtTimes(D.times, D.camOri);
        } else if (D.times.length === 1) {
            camPos.setValue(D.camPos[0]);
            camOri.setValue(D.camOri[0]);
        }

        // ── Positional-light nulls ──
        for (var li = 0; li < D.lightTracks.length; li++) {
            var lt = D.lightTracks[li];
            var ln = comp.layers.addNull(comp.duration);
            ln.threeDLayer = true;
            ln.name = lt.name;
            var lp = ln.property("ADBE Transform Group").property("ADBE Position");
            var moved = false;
            for (var k = 1; k < lt.vals.length && !moved; k++) {
                if (lt.vals[k][0] !== lt.vals[0][0] || lt.vals[k][1] !== lt.vals[0][1] || lt.vals[k][2] !== lt.vals[0][2]) moved = true;
            }
            if (moved && D.times.length > 1) lp.setValuesAtTimes(D.times, lt.vals);
            else lp.setValue(lt.vals[0]);
        }

        // ── Hidden controls solid: chosen animated params as Slider Controls ──
        if (D.sliderTracks.length > 0) {
            var ctrl = comp.layers.addSolid([0, 0, 0], "GMT Controls", D.width, D.height, 1.0, comp.duration);
            ctrl.enabled = false; // hidden
            var fx = ctrl.property("ADBE Effect Parade");
            for (var si = 0; si < D.sliderTracks.length; si++) {
                var st = D.sliderTracks[si];
                var slider = fx.addProperty("ADBE Slider Control");
                slider.name = st.name;
                var sv = slider.property(1); // the Slider value (first param of the effect)
                var changed = false;
                for (var m = 1; m < st.vals.length && !changed; m++) if (st.vals[m] !== st.vals[0]) changed = true;
                if (changed && D.times.length > 1) sv.setValuesAtTimes(D.times, st.vals);
                else sv.setValue(st.vals[0]);
            }
        }

        alert("GMT comp '" + D.compName + "' created.\\n" +
              (usedPlaceholder ? "Plate: placeholder (render not found — replace it).\\n" : "") +
              "Camera + " + D.lightTracks.length + " light null(s) + " + D.sliderTracks.length + " slider control(s).");
    } finally {
        app.endUndoGroup();
    }
})();
`;
};

// ─── Orchestrator ─────────────────────────────────────────────────────

/** Sample the timeline, build the .jsx, and trigger a browser download. */
export const runAfxExport = (opts: AfxExportOptions): void => {
    try {
        const sample = sampleAfxFrames(opts);
        const jsx = buildAfxJsx(sample, opts);
        const blob = new Blob([jsx], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileName = `${safeName(opts.projectName)}_GMT_afx.jsx`;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        showToast(
            `After Effects script saved to your Downloads:  ${fileName}\n` +
            `\n` +
            `1. In After Effects, choose  File ▸ Scripts ▸ Run Script File…  and pick this .jsx.\n` +
            `   It builds a comp with the camera, lights and ${sample.frames.length} frames of animation.\n` +
            `\n` +
            `2. The background "plate" layer is a grey placeholder. Render your video separately as\n` +
            `   "${opts.footageFileName}", drop it in the same folder as the .jsx, and run the script\n` +
            `   again (or swap the placeholder layer for it) to see the fractal behind the comp.`,
            'info', 16000,
        );
    } catch (e) {
        console.error('AFX export failed', e);
        showToast(`AFX export failed: ${e instanceof Error ? e.message : String(e)}`, 'error', 5000);
    }
};
