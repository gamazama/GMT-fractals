
import * as THREE from 'three';
import { Uniforms } from '../UniformNames';
import { VirtualSpace } from '../PrecisionMath';
import { RenderPipeline } from '../RenderPipeline';
import { OpticsState } from '../../features/optics';
import { LightingState } from '../../features/lighting';
import { MAX_LIGHTS } from '../../../data/constants';
import { EngineRenderState } from '../FractalEngine';
import type { GeometryState } from '../../features/geometry';
import {
    type AdaptiveResolutionState,
    createAdaptiveResolutionState,
    getAdaptiveGrace,
    tickAdaptiveResolution,
} from '../../../engine/AdaptiveResolution';

export class UniformManager {
    private uniforms: { [key: string]: THREE.IUniform };
    private virtualSpace: VirtualSpace;
    private pipeline: RenderPipeline;

    // Cache to avoid GC
    private rotMatrix = new THREE.Matrix4();
    private camRight = new THREE.Vector3();
    private camUp = new THREE.Vector3();
    private camForward = new THREE.Vector3();
    
    // Light Calculation Cache
    private lightQuat = new THREE.Quaternion();
    private lightEuler = new THREE.Euler();
    private lightDir = new THREE.Vector3();
    private defaultForward = new THREE.Vector3(0, 0, -1); 

    // Local Rotation Matrix Cache (3-stage: pre/post/world)
    private rotScratchX = new THREE.Matrix4();
    private rotScratchY = new THREE.Matrix4();
    private rotScratchZ = new THREE.Matrix4();
    private rotScratch4 = new THREE.Matrix4();
    private rotScratch3 = new THREE.Matrix3();
    private identityMat3 = new THREE.Matrix3(); // Cached identity for disabled state

    // Smart adaptive resolution: state lives in a generic engine-core
    // module so the same algorithm can drive any iterative renderer.
    // See engine/AdaptiveResolution.ts.
    private _adaptive: AdaptiveResolutionState = createAdaptiveResolutionState();

    /** Returns the current FPS-scaled adaptive grace period (ms). Used by FractalEngine
     *  to hold accumulation until adaptive resolution has settled at full res. */
    public getAdaptiveGrace(): number {
        return getAdaptiveGrace(this._adaptive.stillFps);
    }

    constructor(
        uniforms: { [key: string]: THREE.IUniform }, 
        virtualSpace: VirtualSpace,
        pipeline: RenderPipeline
    ) {
        this.uniforms = uniforms;
        this.virtualSpace = virtualSpace;
        this.pipeline = pipeline;
    }

    public syncFrame(
        camera: THREE.Camera,
        state: any,
        renderer: THREE.WebGLRenderer | null,
        runtimeState: EngineRenderState,
        optics: OpticsState,
        lighting: LightingState,
        modulations: Record<string, number>,
        materials: any,
        geometry: GeometryState | null
    ) {
        const cam = camera as THREE.PerspectiveCamera;
        
        // Auto-Resize Logic with Dynamic Scaling
        if (renderer && !runtimeState.isExporting && !runtimeState.isBucketRendering) {
            // Use domElement.width/height to get actual physical pixels of the GL context
            // Ensure integer values
            let w = Math.floor(renderer.domElement.width);
            let h = Math.floor(renderer.domElement.height);

            // SAFETY: Prevent 0x0 resolution crashes (happens on init/minimize)
            if (w < 1) w = 1;
            if (h < 1) h = 1;

            let targetW = w;
            let targetH = h;
            
            // Adaptive resolution: pure decision module in engine-core.
            // Returns the scale to apply; we translate it into target
            // pixel dimensions and gate on a 5% delta guard in smart
            // mode (EMA jitter would otherwise cause constant resizes).
            const adaptiveTarget = runtimeState.quality?.adaptiveTarget ?? 0;
            const adaptive = tickAdaptiveResolution(this._adaptive, {
                now: performance.now(),
                accumCount: this.pipeline.accumulationCount,
                isInteracting: runtimeState.isGizmoInteracting || runtimeState.isCameraInteracting,
                mouseOverCanvas: runtimeState.mouseOverCanvas,
                dynamicScaling: !!runtimeState.quality?.dynamicScaling,
                adaptiveTarget,
                interactionDownsample: runtimeState.quality?.interactionDownsample ?? 2.0,
                // Hard-force full res when the bucket-render dialog or export flow
                // sets the store flag. Without this, the worker keeps adaptive-
                // scaling while the popup is open — each scale change resizes the
                // FBO, briefly displaying the cleared (black) buffer.
                suppressed: runtimeState.adaptiveSuppressed,
            });

            if (adaptive.needsAdaptive) {
                const candidateW = Math.max(64, Math.floor(w / adaptive.scale));
                const candidateH = Math.max(64, Math.floor(h / adaptive.scale));
                if (adaptiveTarget > 0) {
                    // Smart mode: 5% delta guard against EMA jitter.
                    const currentW2 = this.uniforms[Uniforms.Resolution].value.x;
                    const currentH2 = this.uniforms[Uniforms.Resolution].value.y;
                    if (currentW2 > 0 && Math.abs(candidateW - currentW2) / currentW2 > 0.05) {
                        targetW = candidateW;
                        targetH = candidateH;
                    } else {
                        targetW = currentW2;
                        targetH = currentH2;
                    }
                } else {
                    // Manual mode: fixed downsample, no guard needed.
                    targetW = candidateW;
                    targetH = candidateH;
                }
            }
            
            // OPTIMIZATION: Track previous target resolution to avoid redundant resizes
            const currentW = this.uniforms[Uniforms.Resolution].value.x;
            const currentH = this.uniforms[Uniforms.Resolution].value.y;
            
            if (currentW !== targetW || currentH !== targetH) {
                this._adaptive.selfResized = true; // flag so we don't re-trigger activity from our own reset
                this.uniforms[Uniforms.Resolution].value.set(targetW, targetH);
                this.pipeline.resize(targetW, targetH);
                this.pipeline.resetAccumulation();
                
                if (materials) {
                    materials.displayMaterial.uniforms.uResolution.value.set(targetW, targetH);
                    materials.exportMaterial.uniforms.uResolution.value.set(targetW, targetH);
                }
                
            }
            
            const canvasAspect = w / h;
            if (Number.isFinite(canvasAspect) && Math.abs(cam.aspect - canvasAspect) > 0.001) {
                cam.aspect = canvasAspect;
                cam.updateProjectionMatrix();
            }
        }

        // IMAGE-TILE EXPORT: when no tile is active (uImageTileSize == 1,1) the full
        // output equals the render target; sync so blue-noise lookups behave identically
        // to the pre-tiling code path. Bucket renderer overrides uFullOutputResolution
        // directly during tiled export.
        const tileSize = this.uniforms[Uniforms.ImageTileSize].value;
        if (tileSize.x > 0.9999 && tileSize.y > 0.9999) {
            const res = this.uniforms[Uniforms.Resolution].value;
            this.uniforms[Uniforms.FullOutputResolution].value.copy(res);
        }

        const isOrtho = optics ? optics.camType > 0.5 : false;
        const orthoScale = optics ? optics.orthoScale : 2.0;
        
        const rotModX = modulations['camera.rotation.x'] || 0;
        const rotModY = modulations['camera.rotation.y'] || 0;
        const rotModZ = modulations['camera.rotation.z'] || 0;

        let effectiveQuat = cam.quaternion;

         if (rotModX !== 0 || rotModY !== 0 || rotModZ !== 0) {
             this.lightEuler.set(rotModX, rotModY, rotModZ, 'XYZ');
             this.lightQuat.setFromEuler(this.lightEuler);
             effectiveQuat = cam.quaternion.clone().multiply(this.lightQuat);
         }

        this.rotMatrix.makeRotationFromQuaternion(effectiveQuat);
        const e = this.rotMatrix.elements;
        this.camRight.set(e[0], e[1], e[2]);
        this.camUp.set(e[4], e[5], e[6]);
        this.camForward.set(-e[8], -e[9], -e[10]);
        
        let width = 1.0; 
        let height = 1.0;
        if (isOrtho) { 
            height = orthoScale / 2.0; 
            width = height * cam.aspect; 
        } else { 
            const tanFov = Math.tan(THREE.MathUtils.degToRad(cam.fov) * 0.5); 
            height = tanFov; 
            width = height * cam.aspect; 
        }
        
        // Safety check for NaN basis
        if (!Number.isFinite(width)) width = 1.0;
        if (!Number.isFinite(height)) height = 1.0;

        this.uniforms[Uniforms.CamBasisX].value.copy(this.camRight).multiplyScalar(width);
        this.uniforms[Uniforms.CamBasisY].value.copy(this.camUp).multiplyScalar(height);
        this.uniforms[Uniforms.CamForward].value.copy(this.camForward);
        this.uniforms[Uniforms.CameraPosition].value.set(0, 0, 0);

        // CPU pre-compute: length(uCamBasisY) / viewportY * 2.0
        // viewportY = resolution.y * adaptive.scale — the pre-adaptive viewport resolution.
        // This makes uPixelSizeBase represent the VIEWPORT pixel size (invariant to adaptive
        // downscale), matching the intent of the SSAA bucket override (which forces viewport
        // value during upscale). Trace precision, normal epsilon, and shadow bias all stay
        // anchored to what the user sees on screen regardless of internal resolution scaling.
        const viewportY = this.uniforms[Uniforms.Resolution].value.y * this._adaptive.scale;
        this.uniforms[Uniforms.PixelSizeBase].value = height * 2.0 / viewportY;

        const camModX = modulations['camera.unified.x'] || 0;
        const camModY = modulations['camera.unified.y'] || 0;
        const camModZ = modulations['camera.unified.z'] || 0;

        const effectiveCamPos = cam.position.clone();
        effectiveCamPos.x += camModX;
        effectiveCamPos.y += camModY;
        effectiveCamPos.z += camModZ;
        
        this.virtualSpace.updateShaderUniforms(
            effectiveCamPos, 
            this.uniforms[Uniforms.SceneOffsetHigh].value, 
            this.uniforms[Uniforms.SceneOffsetLow].value
        );
        
        this.uniforms[Uniforms.Time].value = state.clock?.elapsedTime || performance.now() / 1000;

        const rotUniform = this.uniforms['uEnvRotation'];
        if (rotUniform) {
            const rot = rotUniform.value;
            const c = Math.cos(rot);
            const s = Math.sin(rot);
            this.uniforms[Uniforms.EnvRotationMatrix].value = [c, s, -s, c];
        }

        // Derive linear fog color from sRGB fog color (InverseACESFilm on CPU)
        const fogColorUniform = this.uniforms['uFogColor'];
        if (fogColorUniform) {
            const fc = fogColorUniform.value;
            const fogLinear = this.uniforms[Uniforms.FogColorLinear].value;
            // InverseACESFilm: solve ACES tonemap quadratic per-channel
            const a = 2.51, b = 0.03, c2 = 2.43, d2 = 0.59, e = 0.14;
            const channels = [fc.r ?? fc.x ?? 0, fc.g ?? fc.y ?? 0, fc.b ?? fc.z ?? 0];
            for (let ch = 0; ch < 3; ch++) {
                const y = Math.min(Math.max(channels[ch], 0), 0.99);
                const A = c2 * y - a;
                const B = d2 * y - b;
                const C = e * y;
                const D = Math.sqrt(Math.max(0, B * B - 4 * A * C));
                const comp = ch === 0 ? 'x' : ch === 1 ? 'y' : 'z';
                fogLinear[comp] = (-B - D) / (2 * A);
            }
        }

        if (lighting && Array.isArray(lighting.lights)) {
            const typeArr = this.uniforms[Uniforms.LightType].value as Float32Array;
            const posArr = this.uniforms[Uniforms.LightPos].value;
            const dirArr = this.uniforms[Uniforms.LightDir].value;
            const colArr = this.uniforms[Uniforms.LightColor].value;
            const intArr = this.uniforms[Uniforms.LightIntensity].value as Float32Array;
            const falArr = this.uniforms[Uniforms.LightFalloff].value as Float32Array;
            const typArr = this.uniforms[Uniforms.LightFalloffType].value as Float32Array;
            const shaArr = this.uniforms[Uniforms.LightShadows].value as Float32Array;
            const radArr = this.uniforms[Uniforms.LightRadius].value as Float32Array;
            const sofArr = this.uniforms[Uniforms.LightSoftness].value as Float32Array;
    
            const count = Math.min(lighting.lights.length, MAX_LIGHTS);
            this.uniforms[Uniforms.LightCount].value = count;

            for (let i = 0; i < count; i++) {
                const l = lighting.lights[i];
                
                const dIntensity = modulations[`lighting.light${i}_intensity`] || 0;
                const dFalloff = modulations[`lighting.light${i}_falloff`] || 0;
                const dX = modulations[`lighting.light${i}_posX`] || 0;
                const dY = modulations[`lighting.light${i}_posY`] || 0;
                const dZ = modulations[`lighting.light${i}_posZ`] || 0;
                const dRotX = modulations[`lighting.light${i}_rotX`] || 0;
                const dRotY = modulations[`lighting.light${i}_rotY`] || 0;
                const dRotZ = modulations[`lighting.light${i}_rotZ`] || 0;

                const isDirectional = l.type === 'Directional';
                typeArr[i] = isDirectional ? 1.0 : 0.0;
                // EV→linear conversion: 2^ev. Raw mode passes through unchanged.
                const baseIntensity = (l.intensityUnit === 'ev') ? Math.pow(2, l.intensity + dIntensity) : (l.intensity + dIntensity);
                intArr[i] = l.visible ? Math.max(0, baseIntensity) : 0.0;
                shaArr[i] = l.castShadow ? 1.0 : 0.0;

                if ((colArr[i] as any).isColor) {
                    (colArr[i] as THREE.Color).set(l.color);
                }

                // Point-light only uniforms — directional lights ignore these in shader
                if (!isDirectional) {
                    // Pack falloff into branchless polynomial coefficients:
                    // falArr = d² coefficient, typArr = d coefficient
                    // Power+Range model: if range > 0, compute k from range; else use raw falloff
                    const range = l.range ?? 0;
                    const ft = l.falloffType;
                    if (ft === 'Linear') {
                        // att = 1/(1 + k·d) → k = 99/range for 1% at range
                        const k = range > 0.001 ? 99.0 / range : Math.max(0, l.falloff + dFalloff);
                        falArr[i] = 0;
                        typArr[i] = k;
                    } else {
                        // Quadratic: d² term — att = 1/(1 + k·d²) → k = 99/range² for 1% at range
                        const k = range > 0.001 ? 99.0 / (range * range) : Math.max(0, l.falloff + dFalloff);
                        falArr[i] = k;
                        typArr[i] = 0;
                    }
                    radArr[i] = l.radius ?? 0.0;
                    sofArr[i] = l.softness ?? 0.0;

                    // Position / rotation may be omitted on legacy presets
                    // (e.g. older formulas with lights-array entries that
                    // predate the rotation field). Default-to-zero so the
                    // engine renders correctly instead of crashing.
                    const lp = l.position;
                    const effectivePos = {
                        x: (lp?.x ?? 0) + dX,
                        y: (lp?.y ?? 0) + dY,
                        z: (lp?.z ?? 0) + dZ
                    };

                    this.virtualSpace.getLightShaderVector(effectivePos, l.fixed, cam, (posArr[i] as THREE.Vector3));
                }

                // Calculate Direction
                // Base: (0, 0, -1) [Forward]
                const lr = l.rotation;
                this.lightEuler.set(
                    (lr?.x ?? 0) + dRotX,
                    (lr?.y ?? 0) + dRotY,
                    (lr?.z ?? 0) + dRotZ,
                    'YXZ' // Matches typical Yaw/Pitch order
                );
                this.lightQuat.setFromEuler(this.lightEuler);
                
                this.lightDir.copy(this.defaultForward).applyQuaternion(this.lightQuat);
                
                // If Fixed (Headlamp), transform direction by Camera Rotation
                if (l.fixed) {
                    this.lightDir.applyQuaternion(cam.quaternion);
                }
                
                // Negate: store "toward light" in uniform so shaders use it directly
                // without per-consumer negation (NdotL, shadows, volumetrics all need toward-light)
                (dirArr[i] as THREE.Vector3).copy(this.lightDir).negate().normalize();
            }
        }

        // --- 3-STAGE ROTATION MATRIX UPDATE (Branchless via mix) ---
        // Each stage: mix(p, mat*p, amount). amount=0 → identity, no branch.
        // Amounts are DDFS-driven uniforms; we override to 0 when rotation is disabled.

        if (geometry && geometry.preRotMaster && geometry.preRotEnabled) {
            // Pre-rotation matrix
            this.buildRotMatrix(
                (geometry.preRotX ?? 0) + (modulations['geometry.preRotX'] || 0),
                (geometry.preRotY ?? 0) + (modulations['geometry.preRotY'] || 0),
                (geometry.preRotZ ?? 0) + (modulations['geometry.preRotZ'] || 0),
                Uniforms.PreRotMatrix
            );
            // Post-rotation matrix
            this.buildRotMatrix(
                (geometry.postRotX ?? 0) + (modulations['geometry.postRotX'] || 0),
                (geometry.postRotY ?? 0) + (modulations['geometry.postRotY'] || 0),
                (geometry.postRotZ ?? 0) + (modulations['geometry.postRotZ'] || 0),
                Uniforms.PostRotMatrix
            );
            // World-rotation matrix
            this.buildRotMatrix(
                (geometry.worldRotX ?? 0) + (modulations['geometry.worldRotX'] || 0),
                (geometry.worldRotY ?? 0) + (modulations['geometry.worldRotY'] || 0),
                (geometry.worldRotZ ?? 0) + (modulations['geometry.worldRotZ'] || 0),
                Uniforms.WorldRotMatrix
            );
        } else {
            // Rotation disabled — identity matrices (I*p = p, branchless)
            const preU = this.uniforms[Uniforms.PreRotMatrix];
            const postU = this.uniforms[Uniforms.PostRotMatrix];
            const worldU = this.uniforms[Uniforms.WorldRotMatrix];
            if (preU) preU.value.copy(this.identityMat3);
            if (postU) postU.value.copy(this.identityMat3);
            if (worldU) worldU.value.copy(this.identityMat3);
        }
    }

    /** Build a rotation matrix from euler angles (Z*X*Y order) and write to uniform */
    private buildRotMatrix(rx: number, ry: number, rz: number, uniformKey: string) {
        this.rotScratchX.makeRotationX(rx);
        this.rotScratchY.makeRotationY(ry);
        this.rotScratchZ.makeRotationZ(rz);

        this.rotScratch4.identity()
            .multiply(this.rotScratchZ)
            .multiply(this.rotScratchX)
            .multiply(this.rotScratchY);

        this.rotScratch3.setFromMatrix4(this.rotScratch4);

        const u = this.uniforms[uniformKey];
        if (u) u.value.copy(this.rotScratch3);
    }
}
