
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { engine } from '../engine/FractalEngine';
import { Uniforms } from '../engine/UniformNames';

interface HistogramProbeProps {
    onUpdate: (data: Float32Array) => void;
    autoUpdate: boolean;
    trigger: number;
    source: 'geometry' | 'color';
}

const HistogramProbe: React.FC<HistogramProbeProps> = ({
    onUpdate, autoUpdate, trigger, source
}) => {
    // Persistent resources
    const resources = useRef<{
        scene: THREE.Scene;
        camera: THREE.OrthographicCamera;
        renderTarget: THREE.WebGLRenderTarget;
        pixelBuffer: Float32Array;
        material: THREE.ShaderMaterial;
        mesh: THREE.Mesh;
        scratchMatrix: THREE.Matrix4;
        camRight: THREE.Vector3;
        camUp: THREE.Vector3;
        camForward: THREE.Vector3;
    } | null>(null);

    const prevTrigger = useRef(trigger);

    // Initialize Resources
    useEffect(() => {
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        // FIX: Use FloatType instead of HalfFloatType. 
        // readRenderTargetPixels behavior with HalfFloat is inconsistent across browsers/drivers.
        const renderTarget = new THREE.WebGLRenderTarget(128, 128, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType, 
        });

        const pixelBuffer = new Float32Array(128 * 128 * 4);

        // Material Setup
        let material: THREE.ShaderMaterial;

        if (source === 'geometry') {
             material = engine.histogramMaterial;
        } else {
             // GLSL 3.0 Shader for Color Probe
             // Three.js automatically provides 'position' (vec3) and 'uv' (vec2) attributes.
             material = new THREE.ShaderMaterial({
                uniforms: { tMap: { value: null } },
                vertexShader: `
                    out vec2 vUv;
                    void main() { 
                        vUv = uv; 
                        gl_Position = vec4(position, 1.0); 
                    }
                `,
                fragmentShader: `
                    precision highp float;
                    uniform sampler2D tMap;
                    in vec2 vUv;
                    layout(location = 0) out vec4 pc_fragColor;
                    void main() {
                        vec4 c = texture(tMap, vUv);
                        float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
                        pc_fragColor = vec4(l, 0.0, 0.0, 1.0);
                    }
                `,
                glslVersion: THREE.GLSL3,
                depthTest: false,
                depthWrite: false
            });
        }

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        mesh.frustumCulled = false;
        scene.add(mesh);

        resources.current = {
            scene, camera, renderTarget, pixelBuffer, material, mesh,
            scratchMatrix: new THREE.Matrix4(),
            camRight: new THREE.Vector3(),
            camUp: new THREE.Vector3(),
            camForward: new THREE.Vector3()
        };

        return () => {
            renderTarget.dispose();
            if (source !== 'geometry') material.dispose(); 
            // Don't dispose geometry material as it's owned by engine
        };
    }, [source]);

    // Render Loop
    useEffect(() => {
        let frameId = 0;
        let frameCount = 0;

        const loop = () => {
            if (!resources.current || !engine.renderer) {
                frameId = requestAnimationFrame(loop);
                return;
            }

            const res = resources.current;
            
            // Check trigger
            const triggerChanged = trigger !== prevTrigger.current;
            if (triggerChanged) prevTrigger.current = trigger;

            frameCount++;
            const shouldRender = (autoUpdate && frameCount % 15 === 0) || triggerChanged;

            if (shouldRender) {
                const gl = engine.renderer;
                const activeCam = engine.activeCamera as THREE.PerspectiveCamera;

                if (source === 'geometry' && activeCam) {
                    const uniforms = engine.histogramUniforms;
                    engine.virtualSpace.updateShaderUniforms(activeCam.position, uniforms[Uniforms.SceneOffsetHigh].value, uniforms[Uniforms.SceneOffsetLow].value);
                    uniforms[Uniforms.CameraPosition].value.set(0, 0, 0);
                    
                    // Sync Resolution to ensure safe divide in shader
                    uniforms[Uniforms.Resolution].value.set(128, 128);

                    res.scratchMatrix.makeRotationFromQuaternion(activeCam.quaternion);
                    const e = res.scratchMatrix.elements;
                    res.camRight.set(e[0], e[1], e[2]);
                    res.camUp.set(e[4], e[5], e[6]);
                    res.camForward.set(-e[8], -e[9], -e[10]);

                    const tanFov = Math.tan(THREE.MathUtils.degToRad(activeCam.fov) * 0.5);
                    res.camRight.multiplyScalar(tanFov * activeCam.aspect);
                    res.camUp.multiplyScalar(tanFov);

                    uniforms[Uniforms.CamBasisX].value.copy(res.camRight);
                    uniforms[Uniforms.CamBasisY].value.copy(res.camUp);
                    uniforms[Uniforms.CamForward].value.copy(res.camForward);
                } else {
                    const tex = engine.pipeline.getOutputTexture();
                    if (tex) {
                        res.material.uniforms.tMap.value = tex;
                    }
                }

                const originalTarget = gl.getRenderTarget();
                gl.setRenderTarget(res.renderTarget);
                gl.clear();
                gl.render(res.scene, res.camera);
                
                // Read pixels into Float32Array. 
                // Since we forced THREE.FloatType on the target, this should be reliable.
                gl.readRenderTargetPixels(res.renderTarget, 0, 0, 128, 128, res.pixelBuffer);
                gl.setRenderTarget(originalTarget);
                
                // Copy buffer to prevent mutation during next frame
                onUpdate(new Float32Array(res.pixelBuffer));
            }
            
            frameId = requestAnimationFrame(loop);
        };
        
        loop();
        return () => cancelAnimationFrame(frameId);
    }, [autoUpdate, trigger, source, onUpdate]);

    return null;
};

export default HistogramProbe;
