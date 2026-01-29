
import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { engine } from '../engine/FractalEngine';

interface HistogramProbeProps {
    onUpdate: (data: Float32Array) => void;
    autoUpdate: boolean;
    trigger: number;
    source: 'geometry' | 'color';
}

const HistogramProbe: React.FC<HistogramProbeProps> = ({
    onUpdate, autoUpdate, trigger, source
}) => {
    const { camera, gl } = useThree();
    
    const renderTarget = useFBO(128, 128, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType, 
    });

    const scene = useMemo(() => new THREE.Scene(), []);
    const quadCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
    
    const camRight = useRef(new THREE.Vector3());
    const camUp = useRef(new THREE.Vector3());
    const camForward = useRef(new THREE.Vector3());
    const scratchMatrix = useRef(new THREE.Matrix4());
    const prevTrigger = useRef(trigger);

    // Geometry Mode: Uses the engine's special histogramMaterial (re-renders scene)
    // Color Mode: Uses a simple pass-through shader to sample the main image
    const colorMaterial = useMemo(() => new THREE.ShaderMaterial({
        uniforms: { tMap: { value: null } },
        vertexShader: `
            varying vec2 vUv;
            void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
        `,
        fragmentShader: `
            uniform sampler2D tMap;
            varying vec2 vUv;
            void main() {
                vec4 c = texture2D(tMap, vUv);
                // Calculate Luminance for histogram
                float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
                gl_FragColor = vec4(l, 0.0, 0.0, 1.0);
            }
        `
    }), []);

    const mesh = useMemo(() => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), source === 'geometry' ? engine.histogramMaterial : colorMaterial);
        m.frustumCulled = false;
        scene.add(m);
        return m;
    }, [scene, source, colorMaterial]);

    const pixelBuffer = useMemo(() => new Float32Array(128 * 128 * 4), []);
    const frameCount = useRef(0);

    useFrame((state) => {
        frameCount.current++;
        let shouldRender = (autoUpdate && frameCount.current % 15 === 0) || (trigger !== prevTrigger.current);
        if (!shouldRender) return;
        prevTrigger.current = trigger;

        if (source === 'geometry') {
            const uniforms = engine.histogramUniforms;
            engine.virtualSpace.updateShaderUniforms(camera.position, uniforms.uSceneOffsetHigh.value, uniforms.uSceneOffsetLow.value);
            uniforms.uCameraPosition.value.set(0, 0, 0);

            scratchMatrix.current.makeRotationFromQuaternion(camera.quaternion);
            const e = scratchMatrix.current.elements;
            camRight.current.set(e[0], e[1], e[2]);
            camUp.current.set(e[4], e[5], e[6]);
            camForward.current.set(-e[8], -e[9], -e[10]);

            const tanFov = Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov) * 0.5);
            camRight.current.multiplyScalar(tanFov * (camera as THREE.PerspectiveCamera).aspect);
            camUp.current.multiplyScalar(tanFov);

            uniforms.uCamBasisX.value.copy(camRight.current);
            uniforms.uCamBasisY.value.copy(camUp.current);
            uniforms.uCamForward.value.copy(camForward.current);
        } else {
            // Color Mode: Grab texture from engine pipeline
            const tex = engine.pipeline.getOutputTexture();
            if (!tex) return; // Not ready
            colorMaterial.uniforms.tMap.value = tex;
        }
        
        const originalTarget = gl.getRenderTarget();
        gl.setRenderTarget(renderTarget);
        gl.clear();
        gl.render(scene, quadCamera);
        gl.readRenderTargetPixels(renderTarget, 0, 0, 128, 128, pixelBuffer);
        gl.setRenderTarget(originalTarget);
        
        onUpdate(new Float32Array(pixelBuffer));
    });

    return null;
};

export default HistogramProbe;
