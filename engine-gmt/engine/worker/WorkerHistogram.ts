/**
 * WorkerHistogram.ts — Histogram readback subsystem for the render worker.
 *
 * Renders a downsampled 128×128 pass of the fractal or color output and reads
 * back pixels so the main thread can draw a luminance/color histogram.
 * All state is module-level (singleton — one worker, one histogram pipeline).
 */

import * as THREE from 'three';
import type { FractalEngine } from '../FractalEngine';
import type { WorkerToMainMessage } from './WorkerProtocol';
import { createFullscreenPass, type FullscreenPass } from '../utils/FullscreenQuad';

const HISTOGRAM_SIZE = 128;

let histogramPass: FullscreenPass | null = null;
let histogramRT: THREE.WebGLRenderTarget | null = null;
let histogramPixelBuffer: Float32Array | null = null;
let histogramColorMaterial: THREE.ShaderMaterial | null = null;

function initHistogramResources() {
    if (histogramPass) return;
    histogramPass = createFullscreenPass();
    histogramRT = new THREE.WebGLRenderTarget(HISTOGRAM_SIZE, HISTOGRAM_SIZE, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
    });
    histogramPixelBuffer = new Float32Array(HISTOGRAM_SIZE * HISTOGRAM_SIZE * 4);
    histogramColorMaterial = new THREE.ShaderMaterial({
        uniforms: { tMap: { value: null } },
        vertexShader: `out vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`,
        fragmentShader: `precision highp float; uniform sampler2D tMap; in vec2 vUv;
            layout(location = 0) out vec4 pc_fragColor;
            void main() { vec4 c = texture(tMap, vUv); float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722)); pc_fragColor = vec4(l, 0.0, 0.0, 1.0); }`,
        glslVersion: THREE.GLSL3,
        depthTest: false,
        depthWrite: false
    });
}

export function handleHistogramReadback(
    id: string,
    source: 'geometry' | 'color',
    engine: FractalEngine,
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    postMsg: (msg: WorkerToMainMessage, transfer?: Transferable[]) => void
): void {
    initHistogramResources();

    if (source === 'geometry') {
        histogramPass!.mesh.material = engine.histogramMaterial;

        const uniforms = engine.histogramUniforms;
        engine.virtualSpace.updateShaderUniforms(
            camera.position,
            uniforms.uSceneOffsetHigh.value,
            uniforms.uSceneOffsetLow.value
        );
        uniforms.uCameraPosition.value.set(0, 0, 0);
        uniforms.uResolution.value.set(HISTOGRAM_SIZE, HISTOGRAM_SIZE);

        const mat = new THREE.Matrix4().makeRotationFromQuaternion(camera.quaternion);
        const e = mat.elements;
        const tanFov = Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5);
        uniforms.uCamBasisX.value.set(e[0], e[1], e[2]).multiplyScalar(tanFov * camera.aspect);
        uniforms.uCamBasisY.value.set(e[4], e[5], e[6]).multiplyScalar(tanFov);
        uniforms.uCamForward.value.set(-e[8], -e[9], -e[10]);
    } else {
        const tex = engine.pipeline?.getOutputTexture();
        if (!tex) {
            postMsg({ type: 'HISTOGRAM_RESULT', id, data: new Float32Array(0) });
            return;
        }
        histogramPass!.mesh.material = histogramColorMaterial!;
        histogramColorMaterial!.uniforms.tMap.value = tex;
    }

    const originalTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(histogramRT!);
    renderer.clear();
    renderer.render(histogramPass!.scene, histogramPass!.camera);
    renderer.readRenderTargetPixels(histogramRT!, 0, 0, HISTOGRAM_SIZE, HISTOGRAM_SIZE, histogramPixelBuffer!);
    renderer.setRenderTarget(originalTarget);

    const copy = new Float32Array(histogramPixelBuffer!);
    postMsg({ type: 'HISTOGRAM_RESULT', id, data: copy }, [copy.buffer]);
}
