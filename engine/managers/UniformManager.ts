
import * as THREE from 'three';
import { Uniforms } from '../UniformNames';
import { VirtualSpace } from '../PrecisionMath';
import { RenderPipeline } from '../RenderPipeline';
import { OpticsState } from '../../features/optics';
import { LightingState } from '../../features/lighting';
import { MAX_LIGHTS } from '../../data/constants';
import { EngineRenderState } from '../FractalEngine';
import { useFractalStore } from '../../store/fractalStore';

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

    // Local Rotation Matrix Cache
    private preRotMatrixX = new THREE.Matrix4();
    private preRotMatrixY = new THREE.Matrix4();
    private preRotMatrixZ = new THREE.Matrix4();
    private preRotMatrix4 = new THREE.Matrix4();
    private preRotMatrix3 = new THREE.Matrix3();

    // Track previous resolution state to avoid redundant updates
    private lastWidth: number = -1;
    private lastHeight: number = -1;
    private lastIsGizmoInteracting: boolean = false;

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
        materials: any
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
            
            if ((runtimeState.isGizmoInteracting || runtimeState.isCameraInteracting) && runtimeState.quality?.dynamicScaling) {
                const downsample = Math.max(1.0, runtimeState.quality.interactionDownsample || 2.0);
                targetW = Math.max(64, Math.floor(w / downsample));
                targetH = Math.max(64, Math.floor(h / downsample));
            }
            
            // OPTIMIZATION: Track previous target resolution to avoid redundant resizes
            const currentW = this.uniforms[Uniforms.Resolution].value.x;
            const currentH = this.uniforms[Uniforms.Resolution].value.y;
            
            if (currentW !== targetW || currentH !== targetH) {
                console.log(`[UniformManager] Resizing from ${currentW}x${currentH} to ${targetW}x${targetH}`);
                this.uniforms[Uniforms.Resolution].value.set(targetW, targetH);
                this.pipeline.resize(targetW, targetH);
                this.pipeline.resetAccumulation(); 
                
                if (materials) {
                    materials.displayMaterial.uniforms.uResolution.value.set(targetW, targetH);
                    materials.exportMaterial.uniforms.uResolution.value.set(targetW, targetH);
                }
                
                // Update tracking variables
                this.lastWidth = targetW;
                this.lastHeight = targetH;
            }
            
            const canvasAspect = w / h;
            if (Number.isFinite(canvasAspect) && Math.abs(cam.aspect - canvasAspect) > 0.001) {
                cam.aspect = canvasAspect;
                cam.updateProjectionMatrix();
            }
        }
        
        // Blue Noise Size Sync - Kept for compatibility but unused by IGN shader
        if (this.uniforms[Uniforms.BlueNoiseTexture].value) {
            const tex = this.uniforms[Uniforms.BlueNoiseTexture].value;
            if (tex.image) {
                this.uniforms[Uniforms.BlueNoiseResolution].value.set(tex.image.width || 128, tex.image.height || 128);
            }
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

        if (lighting && Array.isArray(lighting.lights)) {
            const typeArr = this.uniforms[Uniforms.LightType].value as Float32Array;
            const posArr = this.uniforms[Uniforms.LightPos].value;
            const dirArr = this.uniforms[Uniforms.LightDir].value;
            const colArr = this.uniforms[Uniforms.LightColor].value;
            const intArr = this.uniforms[Uniforms.LightIntensity].value as Float32Array;
            const falArr = this.uniforms[Uniforms.LightFalloff].value as Float32Array;
            const typArr = this.uniforms[Uniforms.LightFalloffType].value as Float32Array;
            const shaArr = this.uniforms[Uniforms.LightShadows].value as Float32Array;
    
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

                typeArr[i] = l.type === 'Directional' ? 1.0 : 0.0;
                intArr[i] = l.visible ? Math.max(0, l.intensity + dIntensity) : 0.0;
                falArr[i] = Math.max(0, l.falloff + dFalloff);
                typArr[i] = l.falloffType === 'Linear' ? 1.0 : 0.0;
                shaArr[i] = l.castShadow ? 1.0 : 0.0;
                
                if ((colArr[i] as any).isColor) {
                    (colArr[i] as THREE.Color).set(l.color);
                }
                
                const effectivePos = {
                    x: l.position.x + dX,
                    y: l.position.y + dY,
                    z: l.position.z + dZ
                };
                
                this.virtualSpace.getLightShaderVector(effectivePos, l.fixed, cam, (posArr[i] as THREE.Vector3));
                
                // Calculate Direction
                // Base: (0, 0, -1) [Forward]
                this.lightEuler.set(
                    l.rotation.x + dRotX, 
                    l.rotation.y + dRotY, 
                    l.rotation.z + dRotZ, 
                    'YXZ' // Matches typical Yaw/Pitch order
                );
                this.lightQuat.setFromEuler(this.lightEuler);
                
                this.lightDir.copy(this.defaultForward).applyQuaternion(this.lightQuat);
                
                // If Fixed (Headlamp), transform direction by Camera Rotation
                if (l.fixed) {
                    this.lightDir.applyQuaternion(cam.quaternion);
                }
                
                (dirArr[i] as THREE.Vector3).copy(this.lightDir).normalize();
            }
        }

        // --- LOCAL ROTATION MATRIX UPDATE ---
        // Calculate and update uPreRotMatrix when geometry rotation params change
        // This was previously only done in VideoExporter.ts during video export
        try {
            const storeState = useFractalStore.getState();
            const geom = (storeState as any).geometry;
            
            if (geom && geom.preRotMaster && geom.preRotEnabled) {
                // Apply modulation offsets if present (matches VideoExporter logic)
                const rotX = (geom.preRotX ?? 0) + (modulations['geometry.preRotX'] || 0);
                const rotY = (geom.preRotY ?? 0) + (modulations['geometry.preRotY'] || 0);
                const rotZ = (geom.preRotZ ?? 0) + (modulations['geometry.preRotZ'] || 0);
                
                // Build rotation matrix: Z * X * Y order (matches VideoExporter)
                this.preRotMatrixX.makeRotationX(rotX);
                this.preRotMatrixY.makeRotationY(rotY);
                this.preRotMatrixZ.makeRotationZ(rotZ);
                
                this.preRotMatrix4.identity()
                    .multiply(this.preRotMatrixZ)
                    .multiply(this.preRotMatrixX)
                    .multiply(this.preRotMatrixY);
                
                this.preRotMatrix3.setFromMatrix4(this.preRotMatrix4);
                
                // Update the uniform
                const preRotUniform = this.uniforms[Uniforms.PreRotMatrix];
                if (preRotUniform) {
                    preRotUniform.value.copy(this.preRotMatrix3);
                }
            }
        } catch (e) {
            // Store may not be available during initialization
        }
    }
}
