
import React, { useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { TransformControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useFractalStore } from '../../store/fractalStore';
import { engine } from '../../engine/FractalEngine';
import { AnchorIcon, UnanchoredIcon } from '../../components/Icons';
import { getLightFromSlice } from './index';
import { FeatureComponentProps } from '../../components/registry/ComponentRegistry';

const GizmoIndicator = ({ index, visible }: { index: number, visible: boolean }) => {
    const light = useFractalStore(s => getLightFromSlice(s.lighting, index));
    const dragging = useFractalStore(s => s.isGizmoDragging);
    const { handleInteractionStart, handleInteractionEnd } = useFractalStore();
    const updateLight = useFractalStore(s => s.updateLight);

    const handleToggleFixed = () => {
         if (!engine.activeCamera) return;
         const wasFixed = light.fixed;
         const newPos = engine.virtualSpace.resolveRealWorldPosition(light.position, wasFixed, engine.activeCamera);
         updateLight({ index, params: { fixed: !wasFixed, position: newPos } });
    };

    if (!visible || dragging) return null;

    return (
        <Html position={[0, 0, 0]} center zIndexRange={[1000, 0]} style={{ pointerEvents: 'none' }}>
            <div className="flex flex-col items-center select-none mb-12 transform -translate-y-4 pointer-events-auto">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleInteractionStart('param');
                        handleToggleFixed();
                        handleInteractionEnd();
                    }}
                    className={`p-1.5 rounded-full border shadow-lg transition-all duration-200 hover:scale-110 active:scale-95 mb-1 ${
                        !light.fixed 
                        ? 'bg-cyan-600 border-cyan-400 text-white ring-2 ring-cyan-500/20' 
                        : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-white hover:border-gray-400'
                    }`}
                    title={!light.fixed ? "Anchored to World (Click to release)" : "Attached to Camera (Click to anchor)"}
                >
                    {!light.fixed ? <AnchorIcon /> : <UnanchoredIcon />}
                </button>
                
                <div className="text-[9px] font-black text-white/90 bg-black/80 px-1.5 py-0.5 rounded border border-white/10 shadow-sm tracking-wider backdrop-blur-sm">
                    L{index + 1}
                </div>
            </div>
        </Html>
    );
};

const SingleGizmo: React.FC<{ index: number }> = ({ index }) => {
    const { camera } = useThree();
    const meshRef = useRef<THREE.Mesh>(null);
    const scratchPos = useRef(new THREE.Vector3());
    
    const showGizmo = useFractalStore(s => s.showLightGizmo);
    const lightData = useFractalStore(s => s.lighting ? getLightFromSlice(s.lighting, index) : null);
    
    const updateLight = useFractalStore(s => s.updateLight);
    const setGizmoDragging = useFractalStore(s => s.setGizmoDragging);
    const { handleInteractionStart, handleInteractionEnd } = useFractalStore();
    
    useFrame(() => {
        if (!meshRef.current || !lightData) return;
        
        if (useFractalStore.getState().isGizmoDragging) return;

        const offset = engine.sceneOffset;

        if (lightData.fixed) {
            scratchPos.current.set(lightData.position.x, lightData.position.y, lightData.position.z);
            scratchPos.current.applyQuaternion(camera.quaternion);
            scratchPos.current.add(camera.position);
            meshRef.current.position.copy(scratchPos.current);
        } else {
            const sx = (lightData.position.x - (offset.x + offset.xL));
            const sy = (lightData.position.y - (offset.y + offset.yL));
            const sz = (lightData.position.z - (offset.z + offset.zL));
            meshRef.current.position.set(sx, sy, sz);
        }

        meshRef.current.quaternion.copy(camera.quaternion);
        
        const dist = camera.position.distanceTo(meshRef.current.position);
        const dynamicScale = dist * 0.08; 
        
        meshRef.current.scale.setScalar(dynamicScale);
    });

    const handleDragStart = () => {
        handleInteractionStart('param');
        setGizmoDragging(true);
        engine.isGizmoInteracting = true; 
    };

    const handleDragEnd = () => {
        setGizmoDragging(false);
        engine.isGizmoInteracting = false; 
        handleInteractionEnd();
    };

    if (!showGizmo || !lightData || !lightData.visible) return null;

    return (
        <group>
            <mesh ref={meshRef} renderOrder={999}>
                <ringGeometry args={[0.42, 0.44, 64]} />
                <meshBasicMaterial 
                    color={lightData.color} 
                    transparent 
                    opacity={1.0} 
                    side={THREE.DoubleSide}
                    depthTest={false} 
                    depthWrite={false}
                    toneMapped={false}
                />
                <GizmoIndicator index={index} visible={true} />
            </mesh>

            <TransformControls 
                object={meshRef} 
                mode="translate"
                size={0.6} 
                space={lightData.fixed ? "local" : "world"}
                onMouseDown={handleDragStart}
                onMouseUp={handleDragEnd}
                onChange={() => {
                    if (!useFractalStore.getState().isGizmoDragging) return;

                    if (meshRef.current) {
                        const p = meshRef.current.position;
                        
                        if (lightData.fixed) {
                            const local = p.clone().sub(camera.position);
                            local.applyQuaternion(camera.quaternion.clone().invert());
                            updateLight({ index, params: { position: { x: local.x, y: local.y, z: local.z } } });
                        } else {
                            const off = engine.sceneOffset;
                            const fx = p.x + (off.x + off.xL);
                            const fy = p.y + (off.y + off.yL);
                            const fz = p.z + (off.z + off.zL);
                            updateLight({ index, params: { position: { x: fx, y: fy, z: fz } } });
                        }
                    }
                }}
            />
        </group>
    );
};

const LightGizmo: React.FC<FeatureComponentProps> = () => {
    const lights = useFractalStore(s => s.lighting?.lights || []);
    return (
        <>
            {lights.map((_, i) => (
                <SingleGizmo key={i} index={i} />
            ))}
        </>
    );
};

export default LightGizmo;
