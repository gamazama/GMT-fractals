
import * as THREE from 'three';
import { Uniforms } from '../UniformNames';
import { VirtualSpace } from '../PrecisionMath';
import { RenderPipeline } from '../RenderPipeline';
import { OpticsState } from '../../features/optics';
import { LightingState } from '../../features/lighting';
import { MAX_LIGHTS } from '../../data/constants';
import { EngineRenderState } from '../FractalEngine';

export class UniformManager {
    private uniforms: { [key: string]: THREE.IUniform };
    private virtualSpace: VirtualSpace;
    private pipeline: RenderPipeline;

    // Cache to avoid GC
    private rotMatrix = new THREE.Matrix4();
    private camRight = new THREE.Vector3();
    private camUp = new THREE.Vector3();
    private camForward = new THREE.Vector3();

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
            const canvas = renderer.domElement;
            
            // Default: Match Canvas Buffer Size (controlled by RendererSlice dpr)
            let w = Math.floor(canvas.width);
            let h = Math.floor(canvas.height);

            // Dynamic Scaling Override
            // If user is interacting and dynamic scaling is enabled, reduce internal resolution
            if (runtimeState.isGizmoInteracting && runtimeState.quality?.dynamicScaling) {
                const downsample = Math.max(1.0, runtimeState.quality.interactionDownsample || 2.0);
                w = Math.max(64, Math.floor(w / downsample));
                h = Math.max(64, Math.floor(h / downsample));
            }
            
            const uRes = this.uniforms[Uniforms.Resolution].value;
            
            if (uRes.x !== w || uRes.y !== h) {
                uRes.set(w, h);
                this.pipeline.resize(w, h);
                this.pipeline.resetAccumulation(); 
                
                if (materials) {
                    materials.displayMaterial.uniforms.uResolution.value.set(w, h);
                    materials.exportMaterial.uniforms.uResolution.value.set(w, h);
                }
            }
            
            const canvasAspect = w / h;
            if (Math.abs(cam.aspect - canvasAspect) > 0.001) {
                cam.aspect = canvasAspect;
                cam.updateProjectionMatrix();
            }
        }
        
        const isOrtho = optics ? optics.camType > 0.5 : false;
        const orthoScale = optics ? optics.orthoScale : 2.0;
        
        const rotModX = modulations['camera.rotation.x'] || 0;
        const rotModY = modulations['camera.rotation.y'] || 0;
        const rotModZ = modulations['camera.rotation.z'] || 0;

        let effectiveQuat = cam.quaternion;

        if (rotModX !== 0 || rotModY !== 0 || rotModZ !== 0) {
            const modRot = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotModX, rotModY, rotModZ, 'XYZ'));
            effectiveQuat = cam.quaternion.clone().multiply(modRot);
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
            const posArr = this.uniforms[Uniforms.LightPos].value;
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
            }
        }
    }
}
