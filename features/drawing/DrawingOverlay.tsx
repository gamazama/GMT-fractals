
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { nanoid } from 'nanoid';
import { useFractalStore } from '../../store/fractalStore';
import { engine } from '../../engine/FractalEngine';
import { DrawnShape } from './index';
import { FeatureComponentProps } from '../../components/registry/ComponentRegistry';

export const DrawingOverlay: React.FC<FeatureComponentProps> = () => {
    const { camera, gl } = useThree();
    const { drawing, setDrawing, addDrawnShape, removeDrawnShape } = useFractalStore();
    const { active, activeTool, originMode, color: colorHex, showLabels, showAxes, shapes: drawnShapes, refreshTrigger } = drawing;

    const [tempShape, setTempShape] = useState<Partial<DrawnShape> | null>(null);
    
    // Refs for state
    const tempShapeRef = useRef<Partial<DrawnShape> | null>(null);
    const isDragging = useRef(false);
    
    // Geometry Refs
    // anchor3D: The point in 3D space where the shape started (or the center in Alt mode)
    const anchor3D = useRef(new THREE.Vector3()); 
    const currentScreen = useRef(new THREE.Vector2()); 
    
    const planeOrigin = useRef(new THREE.Vector3()); 
    const activePlane = useRef(new THREE.Plane());
    const basisU = useRef(new THREE.Vector3());
    const basisV = useRef(new THREE.Vector3());
    
    // Input State Refs
    const keys = useRef({ space: false, x: false });
    
    // Calculate Plane Orientation based on View and Snap State (X key)
    const updatePlaneAndBasis = (snapToAxis: boolean) => {
        // 1. Determine Normal
        const viewDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        let normal = viewDir.clone().negate(); 

        if (snapToAxis) {
            // Snap to nearest world axis
            const absX = Math.abs(normal.x);
            const absY = Math.abs(normal.y);
            const absZ = Math.abs(normal.z);
            if (absX > absY && absX > absZ) normal.set(Math.sign(normal.x), 0, 0);
            else if (absY > absZ) normal.set(0, Math.sign(normal.y), 0);
            else normal.set(0, 0, Math.sign(normal.z));
        }

        // 2. Determine Basis V (Up Vector)
        // Try to align V with World Up (0,1,0)
        let worldUp = new THREE.Vector3(0, 1, 0);
        
        // If Normal is parallel to World Up (Top-Down view), use World Forward (0,0,-1) as Up reference for the plane
        if (Math.abs(normal.dot(worldUp)) > 0.99) {
            worldUp.set(0, 0, -1);
        }

        // Project World Up onto plane to get basisV
        // v = up - (up . n) * n
        let v = worldUp.clone().sub(normal.clone().multiplyScalar(worldUp.dot(normal)));
        v.normalize();

        // 3. Determine Basis U (Right Vector)
        const u = new THREE.Vector3().crossVectors(v, normal).normalize();
        
        basisU.current.copy(u);
        basisV.current.copy(v);
        
        activePlane.current.setFromNormalAndCoplanarPoint(normal, planeOrigin.current);
        return normal;
    };

    const raycastToPlane = (clientX: number, clientY: number, canvasRect: DOMRect) => {
        const ndc = new THREE.Vector2(
            ((clientX - canvasRect.left) / canvasRect.width) * 2 - 1,
            -((clientY - canvasRect.top) / canvasRect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(ndc, camera);
        const hit = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(activePlane.current, hit)) {
            return hit;
        }
        return null;
    };

    // --- INPUT LISTENERS ---
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Alt') e.preventDefault(); // Prevent Browser Menu Focus

            // Use e.code for Space to avoid issues with Alt+Space modifying e.key
            if (e.code === 'Space') {
                keys.current.space = true;
                e.preventDefault(); // Prevent Scrolling
            }
            if (e.key.toLowerCase() === 'x') keys.current.x = true;
        };
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Alt') e.preventDefault();
            
            if (e.code === 'Space') keys.current.space = false;
            if (e.key.toLowerCase() === 'x') keys.current.x = false;
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, []);

    // --- INTERACTION LOGIC ---
    useEffect(() => {
        if (!active) return;
        
        const canvas = gl.domElement;

        const handlePointerDown = (e: PointerEvent) => {
            if (e.button !== 0) return; 
            if ((e.target as HTMLElement).closest('.drawing-ui')) return; 
            
            const rect = canvas.getBoundingClientRect();
            
            // Track 2D pos for delta calculations
            currentScreen.current.set(e.clientX, e.clientY);

            // 1. Determine Origin
            if (originMode === 1.0) { // Surface
                const dist = Math.max(0.1, engine.lastMeasuredDistance);
                const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
                planeOrigin.current.copy(camera.position).addScaledVector(forward, dist);
            } else { // Global
                 const offset = engine.sceneOffset;
                 const worldX = -(offset.x + offset.xL);
                 const worldY = -(offset.y + offset.yL);
                 const worldZ = -(offset.z + offset.zL);
                 planeOrigin.current.set(worldX, worldY, worldZ);
            }

            // USE X KEY for Axis Snap
            const normal = updatePlaneAndBasis(keys.current.x);
            
            // Check if we hit the plane at all
            const hit = raycastToPlane(e.clientX, e.clientY, rect);
            if (hit) {
                isDragging.current = true;
                
                // Set the 3D anchor point to the hit position
                anchor3D.current.copy(hit);
                
                const initShape = {
                    center: undefined, 
                    size: { x: 0, y: 0 },
                    orientation: new THREE.Quaternion().setFromRotationMatrix(
                        new THREE.Matrix4().makeBasis(basisU.current, basisV.current, normal)
                    ),
                    type: activeTool // Capture tool type at start of draw
                };
                
                setTempShape(initShape);
                tempShapeRef.current = initShape;
                canvas.setPointerCapture(e.pointerId);
            }
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (!isDragging.current) return;
            
            const rect = canvas.getBoundingClientRect();
            
            // Check for plane orientation updates
            const normal = updatePlaneAndBasis(keys.current.x);
            
            const mouse3D = raycastToPlane(e.clientX, e.clientY, rect);
            if (!mouse3D) return;

            // SPACEBAR LOGIC: Move the entire shape (Translation only)
            if (keys.current.space) {
                // To move the shape correctly in 3D, we calculate the 3D delta 
                // between the current mouse position and the previous frame's mouse position.
                const prev3D = raycastToPlane(currentScreen.current.x, currentScreen.current.y, rect);
                
                if (prev3D) {
                    const delta = new THREE.Vector3().subVectors(mouse3D, prev3D);
                    
                    // Move the Anchor Point by this delta. 
                    // This ensures that when Space is released, the "Start Point" of the drag
                    // has moved along with the mouse.
                    anchor3D.current.add(delta);
                    
                    // We also need to visually update the tempShape center to provide immediate feedback
                    if (tempShapeRef.current?.center) {
                        const c = tempShapeRef.current.center;
                        const newUnified = {
                            ...c,
                            xL: c.xL + delta.x,
                            yL: c.yL + delta.y,
                            zL: c.zL + delta.z
                        };
                        const nextShape = { ...tempShapeRef.current, center: newUnified };
                        setTempShape(nextShape);
                        tempShapeRef.current = nextShape;
                    }
                }
                
                // Update tracker
                currentScreen.current.set(e.clientX, e.clientY);
                return; // SKIP SIZING LOGIC
            }
            
            currentScreen.current.set(e.clientX, e.clientY);
            
            // SIZING LOGIC
            const current3D = mouse3D; 
            const start3D = anchor3D.current; // Use the persistent 3D anchor
            
            if (start3D && current3D) {
                const diff = new THREE.Vector3().subVectors(current3D, start3D);
                let w = diff.dot(basisU.current);
                let h = diff.dot(basisV.current);
                
                let centerLocal: THREE.Vector3;

                // ALT LOGIC: Center from Start
                // Use e.altKey for reliable chord detection (Space+Alt)
                if (e.altKey) {
                    w *= 2.0;
                    h *= 2.0;
                    centerLocal = start3D.clone();
                } else {
                    // Standard Corner-to-Corner: Anchor is one corner, Mouse is opposite corner.
                    // Center is midpoint.
                    centerLocal = start3D.clone()
                        .addScaledVector(basisU.current, w * 0.5)
                        .addScaledVector(basisV.current, h * 0.5);
                }
                
                // SHIFT LOGIC (Uniform aspect ratio for Square/Circle)
                if (e.shiftKey) {
                    const maxDim = Math.max(Math.abs(w), Math.abs(h));
                    w = Math.sign(w) * maxDim;
                    h = Math.sign(h) * maxDim;
                    
                    // Re-adjust center if corner-to-corner based on new square dims
                    if (!e.altKey) {
                        centerLocal = start3D.clone()
                            .addScaledVector(basisU.current, w * 0.5)
                            .addScaledVector(basisV.current, h * 0.5);
                    }
                }
                
                const offset = engine.sceneOffset;
                const unifiedCenter = {
                    x: offset.x, y: offset.y, z: offset.z,
                    xL: offset.xL + centerLocal.x,
                    yL: offset.yL + centerLocal.y,
                    zL: offset.zL + centerLocal.z
                };
                
                const nextShape = {
                    ...tempShapeRef.current,
                    center: unifiedCenter,
                    size: { x: Math.abs(w), y: Math.abs(h) },
                    orientation: new THREE.Quaternion().setFromRotationMatrix(
                        new THREE.Matrix4().makeBasis(basisU.current, basisV.current, normal)
                    )
                };
                
                setTempShape(nextShape);
                tempShapeRef.current = nextShape;
            }
        };

        const handlePointerUp = (e: PointerEvent) => {
            if (!isDragging.current) return;
            isDragging.current = false;
            canvas.releasePointerCapture(e.pointerId);
            
            const finalShape = tempShapeRef.current;
            const currentGlobalColor = useFractalStore.getState().drawing.color;
            
            if (finalShape && finalShape.center && finalShape.size && finalShape.orientation && (finalShape.size.x > 0.001 || finalShape.size.y > 0.001)) {
                addDrawnShape({
                    id: nanoid(),
                    type: finalShape.type || 'rect',
                    center: finalShape.center,
                    size: finalShape.size,
                    orientation: finalShape.orientation,
                    color: '#' + currentGlobalColor.getHexString()
                });
                
                setDrawing({ active: false });
            }
            
            setTempShape(null);
            tempShapeRef.current = null;
        };

        canvas.addEventListener('pointerdown', handlePointerDown);
        canvas.addEventListener('pointermove', handlePointerMove);
        canvas.addEventListener('pointerup', handlePointerUp);
        
        return () => {
            canvas.removeEventListener('pointerdown', handlePointerDown);
            canvas.removeEventListener('pointermove', handlePointerMove);
            canvas.removeEventListener('pointerup', handlePointerUp);
        };
    }, [active, activeTool, originMode, camera, gl, setDrawing]);

    return (
        <group>
            {/* Axis Ruler - Only if showAxes is true */}
            {showAxes && <AxesRuler originMode={originMode} trigger={refreshTrigger} />}

            {/* Render Committed Shapes */}
            {drawnShapes && drawnShapes.map(shape => (
                <SingleShape 
                    key={shape.id} 
                    shape={shape} 
                    color={shape.color} 
                    showLabel={showLabels} 
                    onDelete={() => removeDrawnShape(shape.id)}
                    isActive={active}
                />
            ))}
            
            {/* Render Temp Shape */}
            {tempShape && tempShape.center && tempShape.size && tempShape.orientation && (
                 <SingleShape 
                    shape={tempShape as DrawnShape} 
                    color={'#' + colorHex.getHexString()}
                    isTemp={true} 
                    showLabel={showLabels}
                    onDelete={() => {}}
                    isActive={true}
                />
            )}
        </group>
    );
};

const AxesRuler: React.FC<{ originMode: number, trigger: number }> = ({ originMode, trigger }) => {
    const ref = useRef<THREE.Group>(null);
    const { camera } = useThree();
    const unifiedRef = useRef<any>(null);

    // Initial Capture of Origin (and re-capture on trigger)
    useEffect(() => {
        let origin = new THREE.Vector3(0, 0, 0); 
        if (originMode === 1.0) { // Surface
            const dist = Math.max(0.1, engine.lastMeasuredDistance);
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            origin.copy(camera.position).addScaledVector(forward, dist);
        } else { // Global
             const offset = engine.sceneOffset;
             const worldX = -(offset.x + offset.xL);
             const worldY = -(offset.y + offset.yL);
             const worldZ = -(offset.z + offset.zL);
             origin.set(worldX, worldY, worldZ);
        }

        const offset = engine.sceneOffset;
        unifiedRef.current = {
            x: offset.x, y: offset.y, z: offset.z,
            xL: offset.xL + origin.x,
            yL: offset.yL + origin.y,
            zL: offset.zL + origin.z
        };
    }, [originMode, trigger]);

    useFrame(() => {
        if (!ref.current || !unifiedRef.current) return;
        const offset = engine.sceneOffset;
        const u = unifiedRef.current;
        
        const dx = (u.x - offset.x) + (u.xL - offset.xL);
        const dy = (u.y - offset.y) + (u.yL - offset.yL);
        const dz = (u.z - offset.z) + (u.zL - offset.zL);
        
        ref.current.position.set(dx, dy, dz);
    });

    return (
        <group ref={ref}>
            <gridHelper args={[10, 10, 0xff0000, 0x444444]} rotation={[Math.PI/2, 0, 0]} />
            <axesHelper args={[5]} />
        </group>
    );
};

const SingleShape: React.FC<{ shape: DrawnShape, color: string, isTemp?: boolean, showLabel: boolean, onDelete: () => void, isActive: boolean }> = ({ shape, color, isTemp, showLabel, onDelete, isActive }) => {
    const groupRef = useRef<THREE.Group>(null);
    
    // Create unique material per shape to allow individual color assignment
    // Re-create if color changes
    const material = useMemo(() => new THREE.LineBasicMaterial({ 
        color: new THREE.Color(color), 
        linewidth: 1, 
        depthTest: false, 
        transparent: true 
    }), [color]);

    useFrame(() => {
        if (!groupRef.current) return;
        const offset = engine.sceneOffset;
        const dx = (shape.center.x - offset.x) + (shape.center.xL - offset.xL);
        const dy = (shape.center.y - offset.y) + (shape.center.yL - offset.yL);
        const dz = (shape.center.z - offset.z) + (shape.center.zL - offset.zL);
        groupRef.current.position.set(dx, dy, dz);
        groupRef.current.quaternion.set(shape.orientation.x, shape.orientation.y, shape.orientation.z, shape.orientation.w);
    });

    const halfW = shape.size.x / 2;
    const halfH = shape.size.y / 2;
    const depth = shape.size.z || 0;
    const zOffset = shape.zOffset || 0;
    const isCube = shape.type === 'rect' && depth > 0.001;

    // Generate Geometry based on type
    const geometry = useMemo(() => {
        if (shape.type === 'circle') {
            // Create Ellipse
            const curve = new THREE.EllipseCurve(
                0, 0,             // ax, aY
                halfW, halfH,     // xRadius, yRadius
                0, 2 * Math.PI,   // aStartAngle, aEndAngle
                false,            // aClockwise
                0                 // aRotation
            );
            const points = curve.getPoints(64); // Smoothness
            return new THREE.BufferGeometry().setFromPoints(points);
        } else {
            if (isCube) {
                // Use Box Geometry for 3D
                return new THREE.EdgesGeometry(new THREE.BoxGeometry(shape.size.x, shape.size.y, depth));
            } else {
                // 2D Rect
                const points = [
                    new THREE.Vector3(-halfW, -halfH, 0),
                    new THREE.Vector3(halfW, -halfH, 0),
                    new THREE.Vector3(halfW, halfH, 0),
                    new THREE.Vector3(-halfW, halfH, 0)
                ];
                return new THREE.BufferGeometry().setFromPoints(points);
            }
        }
    }, [halfW, halfH, depth, shape.type, isCube]);

    const uiClass = "drawing-ui absolute select-none pointer-events-auto";

    // Shift geometry so drawing plane is the front face + offset
    // Box center is at 0 in BoxGeometry, spanning [-d/2, d/2]
    // We want box spanning [offset - d, offset]
    // Center is offset - d/2
    const renderZ = isCube ? (zOffset - depth / 2) : zOffset;

    return (
        <group ref={groupRef}>
             <group position={[0, 0, renderZ]}>
                {/* If Cube, use lineSegments for edges. If flat, use lineLoop for continuous border. */}
                {isCube ? (
                     <lineSegments geometry={geometry} material={material} />
                ) : (
                     <lineLoop geometry={geometry} material={material} />
                )}
                
                {showLabel && (
                    <>
                        <Html position={[0, halfH, depth/2]} center zIndexRange={[100, 0]} className={uiClass}>
                             <div className="transform -translate-y-full mb-1 text-[10px] font-mono font-bold whitespace-nowrap text-cyan-300 opacity-90 px-1 backdrop-blur-[1px]">
                                {shape.size.x.toFixed(4)}
                             </div>
                        </Html>
                        <Html position={[-halfW, 0, depth/2]} center zIndexRange={[100, 0]} className={uiClass}>
                             <div className="transform -translate-x-full mr-1 text-[10px] font-mono font-bold whitespace-nowrap text-cyan-300 opacity-90 px-1 backdrop-blur-[1px] rotate-90 origin-right">
                                {shape.size.y.toFixed(4)}
                             </div>
                        </Html>
                        {isCube && (
                            <Html position={[halfW, -halfH, 0]} center zIndexRange={[100, 0]} className={uiClass}>
                                 <div className="transform translate-x-1 ml-1 text-[10px] font-mono font-bold whitespace-nowrap text-cyan-300 opacity-90 px-1 backdrop-blur-[1px] -rotate-45 origin-left">
                                    {depth.toFixed(4)}
                                 </div>
                            </Html>
                        )}
                        
                        {!isTemp && (
                            <Html position={[halfW, halfH, depth/2]} center zIndexRange={[100, 0]} className={uiClass}>
                                <div 
                                    className="transform translate-x-1/2 -translate-y-1/2 cursor-pointer flex items-center justify-center w-4 h-4 bg-red-900/80 hover:bg-red-500 text-white rounded-full transition-colors shadow-sm border border-white/20"
                                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                    title="Delete Shape"
                                >
                                    <span className="text-[10px] font-bold leading-none mb-[1px]">✕</span>
                                </div>
                            </Html>
                        )}
                    </>
                )}
            </group>
        </group>
    );
};
