
import React, { useRef, useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { nanoid } from 'nanoid';
import { useFractalStore } from '../../store/fractalStore';
import { getProxy } from '../../engine/worker/WorkerProxy';
const engine = getProxy();
import { DrawnShape } from './index';
import { FeatureComponentProps } from '../../components/registry/ComponentRegistry';
import { getViewportCamera, getViewportCanvas } from '../../engine/worker/ViewportRefs';

// --- 3D-to-2D Projection Helpers ---

interface ScreenPt { x: number; y: number; behind: boolean }

const _projVec = new THREE.Vector3();

const project3D = (worldPos: THREE.Vector3, camera: THREE.Camera, w: number, h: number): ScreenPt => {
    _projVec.copy(worldPos).project(camera);
    return {
        x: (_projVec.x * 0.5 + 0.5) * w,
        y: (-_projVec.y * 0.5 + 0.5) * h,
        behind: _projVec.z > 1
    };
};

/** Compute shape's world position from its unified PreciseVector3 center + current offset */
const shapeWorldPos = (shape: DrawnShape, offset: any): THREE.Vector3 => {
    const dx = (shape.center.x - offset.x) + (shape.center.xL - offset.xL);
    const dy = (shape.center.y - offset.y) + (shape.center.yL - offset.yL);
    const dz = (shape.center.z - offset.z) + (shape.center.zL - offset.zL);
    return new THREE.Vector3(dx, dy, dz);
};

/** Get 2D polygon points for a shape projected to screen */
const projectShapeToScreen = (
    shape: DrawnShape, camera: THREE.Camera, canvasW: number, canvasH: number, offset: any
): ScreenPt[] => {
    const center = shapeWorldPos(shape, offset);
    const q = new THREE.Quaternion(shape.orientation.x, shape.orientation.y, shape.orientation.z, shape.orientation.w);
    const halfW = shape.size.x / 2;
    const halfH = shape.size.y / 2;
    const zOff = shape.zOffset || 0;
    const depth = shape.size.z || 0;
    const isCube = shape.type === 'rect' && depth > 0.001;
    const renderZ = isCube ? (zOff - depth / 2) : zOff;

    if (shape.type === 'circle') {
        const pts: ScreenPt[] = [];
        const N = 48;
        for (let i = 0; i <= N; i++) {
            const a = (i / N) * Math.PI * 2;
            const local = new THREE.Vector3(Math.cos(a) * halfW, Math.sin(a) * halfH, renderZ);
            local.applyQuaternion(q).add(center);
            pts.push(project3D(local, camera, canvasW, canvasH));
        }
        return pts;
    }

    if (isCube) {
        // Return 8 corners projected — caller renders as edges
        const corners: ScreenPt[] = [];
        for (const sx of [-1, 1]) {
            for (const sy of [-1, 1]) {
                for (const sz of [-1, 1]) {
                    const local = new THREE.Vector3(sx * halfW, sy * halfH, renderZ + sz * depth / 2);
                    local.applyQuaternion(q).add(center);
                    corners.push(project3D(local, camera, canvasW, canvasH));
                }
            }
        }
        return corners;
    }

    // 2D Rectangle — 4 corners
    const corners2D: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    return corners2D.map(([sx, sy]) => {
        const local = new THREE.Vector3(sx * halfW, sy * halfH, renderZ);
        local.applyQuaternion(q).add(center);
        return project3D(local, camera, canvasW, canvasH);
    });
};

// --- Cube edge pairs (index into 8-corner array) ---
// Corners indexed as: [-x,-y,-z]=0, [-x,-y,+z]=1, [-x,+y,-z]=2, [-x,+y,+z]=3,
//                      [+x,-y,-z]=4, [+x,-y,+z]=5, [+x,+y,-z]=6, [+x,+y,+z]=7
const CUBE_EDGES = [
    [0, 1], [2, 3], [4, 5], [6, 7], // Z edges
    [0, 2], [1, 3], [4, 6], [5, 7], // Y edges
    [0, 4], [1, 5], [2, 6], [3, 7], // X edges
];

// =============================================
// Main Overlay Component (DOM-based)
// =============================================

export const DrawingOverlay: React.FC<FeatureComponentProps> = () => {
    const { drawing, setDrawing, addDrawnShape, removeDrawnShape } = useFractalStore();
    const { active, activeTool, originMode, color: colorHex, showLabels, showAxes, shapes: drawnShapes, refreshTrigger } = drawing;

    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Temp shape during drag
    const [tempShape, setTempShape] = useState<Partial<DrawnShape> | null>(null);
    const tempShapeRef = useRef<Partial<DrawnShape> | null>(null);
    const isDragging = useRef(false);

    // Geometry refs (same as original)
    const anchor3D = useRef(new THREE.Vector3());
    const currentScreen = useRef(new THREE.Vector2());
    const planeOrigin = useRef(new THREE.Vector3());
    const activePlane = useRef(new THREE.Plane());
    const basisU = useRef(new THREE.Vector3());
    const basisV = useRef(new THREE.Vector3());

    // Input state
    const keys = useRef({ space: false, x: false });

    // Animation frame for rendering
    const rafRef = useRef<number>(0);
    // Force re-render trigger for SVG updates during drag
    const [renderTick, setRenderTick] = useState(0);

    // --- Camera accessor (replaces useThree) ---
    const getCamera = useCallback(() => getViewportCamera() as THREE.PerspectiveCamera, []);
    const getCanvas = useCallback(() => getViewportCanvas(), []);

    // --- Plane math (unchanged logic, uses getCamera()) ---
    const updatePlaneAndBasis = useCallback((snapToAxis: boolean) => {
        const camera = getCamera();
        if (!camera) return new THREE.Vector3(0, 0, -1);

        const viewDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        let normal = viewDir.clone().negate();

        if (snapToAxis) {
            const absX = Math.abs(normal.x);
            const absY = Math.abs(normal.y);
            const absZ = Math.abs(normal.z);
            if (absX > absY && absX > absZ) normal.set(Math.sign(normal.x), 0, 0);
            else if (absY > absZ) normal.set(0, Math.sign(normal.y), 0);
            else normal.set(0, 0, Math.sign(normal.z));
        }

        let worldUp = new THREE.Vector3(0, 1, 0);
        if (Math.abs(normal.dot(worldUp)) > 0.99) worldUp.set(0, 0, -1);

        let v = worldUp.clone().sub(normal.clone().multiplyScalar(worldUp.dot(normal)));
        v.normalize();

        const u = new THREE.Vector3().crossVectors(v, normal).normalize();

        basisU.current.copy(u);
        basisV.current.copy(v);

        activePlane.current.setFromNormalAndCoplanarPoint(normal, planeOrigin.current);
        return normal;
    }, [getCamera]);

    const raycastToPlane = useCallback((clientX: number, clientY: number, canvasRect: DOMRect) => {
        const camera = getCamera();
        if (!camera) return null;

        const ndc = new THREE.Vector2(
            ((clientX - canvasRect.left) / canvasRect.width) * 2 - 1,
            -((clientY - canvasRect.top) / canvasRect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(ndc, camera);
        const hit = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(activePlane.current, hit)) return hit;
        return null;
    }, [getCamera]);

    // --- Keyboard listeners ---
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Alt') e.preventDefault();
            if (e.code === 'Space') { keys.current.space = true; e.preventDefault(); }
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

    // --- Interaction Logic (pointer events on viewport canvas) ---
    useEffect(() => {
        if (!active) return;

        const canvas = getCanvas();
        if (!canvas) return;

        const handlePointerDown = (e: PointerEvent) => {
            if (e.button !== 0) return;
            if ((e.target as HTMLElement).closest('.drawing-ui')) return;

            const camera = getCamera();
            if (!camera) return;

            const rect = canvas.getBoundingClientRect();
            currentScreen.current.set(e.clientX, e.clientY);

            // Determine Origin
            if (originMode === 1.0) {
                const dist = Math.max(0.1, engine.lastMeasuredDistance);
                const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
                planeOrigin.current.copy(camera.position).addScaledVector(forward, dist);
            } else {
                const offset = engine.sceneOffset;
                planeOrigin.current.set(-(offset.x + offset.xL), -(offset.y + offset.yL), -(offset.z + offset.zL));
            }

            const normal = updatePlaneAndBasis(keys.current.x);
            const hit = raycastToPlane(e.clientX, e.clientY, rect);
            if (hit) {
                isDragging.current = true;
                anchor3D.current.copy(hit);

                const initShape = {
                    center: undefined,
                    size: { x: 0, y: 0 },
                    orientation: new THREE.Quaternion().setFromRotationMatrix(
                        new THREE.Matrix4().makeBasis(basisU.current, basisV.current, normal)
                    ),
                    type: activeTool
                };

                setTempShape(initShape);
                tempShapeRef.current = initShape;
                canvas.setPointerCapture(e.pointerId);
            }
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (!isDragging.current) return;

            const rect = canvas.getBoundingClientRect();
            const normal = updatePlaneAndBasis(keys.current.x);
            const mouse3D = raycastToPlane(e.clientX, e.clientY, rect);
            if (!mouse3D) return;

            // SPACEBAR: move entire shape
            if (keys.current.space) {
                const prev3D = raycastToPlane(currentScreen.current.x, currentScreen.current.y, rect);
                if (prev3D) {
                    const delta = new THREE.Vector3().subVectors(mouse3D, prev3D);
                    anchor3D.current.add(delta);
                    if (tempShapeRef.current?.center) {
                        const c = tempShapeRef.current.center;
                        const nextShape = {
                            ...tempShapeRef.current,
                            center: { ...c, xL: c.xL + delta.x, yL: c.yL + delta.y, zL: c.zL + delta.z }
                        };
                        setTempShape(nextShape);
                        tempShapeRef.current = nextShape;
                    }
                }
                currentScreen.current.set(e.clientX, e.clientY);
                return;
            }

            currentScreen.current.set(e.clientX, e.clientY);

            // Sizing
            const diff = new THREE.Vector3().subVectors(mouse3D, anchor3D.current);
            let w = diff.dot(basisU.current);
            let h = diff.dot(basisV.current);
            let centerLocal: THREE.Vector3;

            if (e.altKey) {
                w *= 2.0; h *= 2.0;
                centerLocal = anchor3D.current.clone();
            } else {
                centerLocal = anchor3D.current.clone()
                    .addScaledVector(basisU.current, w * 0.5)
                    .addScaledVector(basisV.current, h * 0.5);
            }

            if (e.shiftKey) {
                const maxDim = Math.max(Math.abs(w), Math.abs(h));
                w = Math.sign(w) * maxDim; h = Math.sign(h) * maxDim;
                if (!e.altKey) {
                    centerLocal = anchor3D.current.clone()
                        .addScaledVector(basisU.current, w * 0.5)
                        .addScaledVector(basisV.current, h * 0.5);
                }
            }

            const offset = engine.sceneOffset;
            const nextShape = {
                ...tempShapeRef.current,
                center: { x: offset.x, y: offset.y, z: offset.z, xL: offset.xL + centerLocal.x, yL: offset.yL + centerLocal.y, zL: offset.zL + centerLocal.z },
                size: { x: Math.abs(w), y: Math.abs(h) },
                orientation: new THREE.Quaternion().setFromRotationMatrix(
                    new THREE.Matrix4().makeBasis(basisU.current, basisV.current, normal)
                )
            };
            setTempShape(nextShape);
            tempShapeRef.current = nextShape;
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
    }, [active, activeTool, originMode, getCamera, getCanvas, setDrawing, updatePlaneAndBasis, raycastToPlane, addDrawnShape]);

    // --- Animation loop for rendering projected shapes ---
    useEffect(() => {
        let running = true;
        const tick = () => {
            if (!running) return;
            setRenderTick(t => t + 1);
            rafRef.current = requestAnimationFrame(tick);
        };
        // Only run the render loop when there's something to show
        if (drawnShapes?.length > 0 || tempShape || showAxes) {
            rafRef.current = requestAnimationFrame(tick);
        }
        return () => { running = false; cancelAnimationFrame(rafRef.current); };
    }, [drawnShapes?.length, !!tempShape, showAxes]);

    // --- Build projected data for rendering ---
    const camera = getCamera();
    const canvasEl = getCanvas();
    const canvasW = canvasEl?.clientWidth || 1;
    const canvasH = canvasEl?.clientHeight || 1;
    const offset = engine.sceneOffset;

    // Collect all shapes to render (committed + temp)
    const allShapes: { shape: DrawnShape; color: string; isTemp: boolean }[] = [];
    if (drawnShapes) {
        for (const s of drawnShapes) {
            allShapes.push({ shape: s, color: s.color, isTemp: false });
        }
    }
    if (tempShape && tempShape.center && tempShape.size && tempShape.orientation) {
        allShapes.push({
            shape: tempShape as DrawnShape,
            color: '#' + colorHex.getHexString(),
            isTemp: true
        });
    }

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 overflow-hidden"
            style={{ pointerEvents: 'none' }}
        >
            {/* SVG layer for shape outlines */}
            <svg
                ref={svgRef}
                width={canvasW}
                height={canvasH}
                className="absolute inset-0"
                style={{ pointerEvents: 'none' }}
            >
                {camera && allShapes.map(({ shape, color, isTemp }) => {
                    const isCube = shape.type === 'rect' && (shape.size.z || 0) > 0.001;
                    const pts = projectShapeToScreen(shape, camera, canvasW, canvasH, offset);
                    if (pts.some(p => p.behind)) return null;

                    if (isCube) {
                        // Render cube edges
                        return (
                            <g key={shape.id || 'temp'}>
                                {CUBE_EDGES.map(([a, b], i) => (
                                    <line
                                        key={i}
                                        x1={pts[a].x} y1={pts[a].y}
                                        x2={pts[b].x} y2={pts[b].y}
                                        stroke={color}
                                        strokeWidth={isTemp ? 1 : 1.5}
                                        strokeOpacity={0.9}
                                    />
                                ))}
                            </g>
                        );
                    }

                    // Flat rect or circle — closed polygon
                    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';
                    return (
                        <path
                            key={shape.id || 'temp'}
                            d={d}
                            fill="none"
                            stroke={color}
                            strokeWidth={isTemp ? 1 : 1.5}
                            strokeOpacity={0.9}
                        />
                    );
                })}
            </svg>

            {/* HTML labels layer */}
            {camera && showLabels && allShapes.map(({ shape, color, isTemp }) => {
                const center3D = shapeWorldPos(shape, offset);
                const q = new THREE.Quaternion(shape.orientation.x, shape.orientation.y, shape.orientation.z, shape.orientation.w);
                const halfW = shape.size.x / 2;
                const halfH = shape.size.y / 2;
                const depth = shape.size.z || 0;
                const zOff = shape.zOffset || 0;
                const renderZ = (shape.type === 'rect' && depth > 0.001) ? (zOff - depth / 2) : zOff;

                // Width label — top center
                const topCenter = new THREE.Vector3(0, halfH, renderZ + depth / 2).applyQuaternion(q).add(center3D);
                const topPt = project3D(topCenter, camera, canvasW, canvasH);

                // Height label — left center
                const leftCenter = new THREE.Vector3(-halfW, 0, renderZ + depth / 2).applyQuaternion(q).add(center3D);
                const leftPt = project3D(leftCenter, camera, canvasW, canvasH);

                if (topPt.behind || leftPt.behind) return null;

                // Delete button — top-right corner
                const trCorner = new THREE.Vector3(halfW, halfH, renderZ + depth / 2).applyQuaternion(q).add(center3D);
                const trPt = project3D(trCorner, camera, canvasW, canvasH);

                return (
                    <React.Fragment key={(shape.id || 'temp') + '-labels'}>
                        {/* Width */}
                        <div
                            className="absolute text-[10px] font-mono font-bold whitespace-nowrap text-cyan-300 opacity-90 px-1"
                            style={{ left: topPt.x, top: topPt.y, transform: 'translate(-50%, -100%)', pointerEvents: 'none' }}
                        >
                            {shape.size.x.toFixed(4)}
                        </div>
                        {/* Height */}
                        <div
                            className="absolute text-[10px] font-mono font-bold whitespace-nowrap text-cyan-300 opacity-90 px-1"
                            style={{ left: leftPt.x, top: leftPt.y, transform: 'translate(-100%, -50%) rotate(90deg)', transformOrigin: 'right center', pointerEvents: 'none' }}
                        >
                            {shape.size.y.toFixed(4)}
                        </div>
                        {/* Delete button */}
                        {!isTemp && !trPt.behind && (
                            <div
                                className="drawing-ui absolute cursor-pointer flex items-center justify-center w-4 h-4 bg-red-900/80 hover:bg-red-500 text-white rounded-full transition-colors shadow-sm border border-white/20"
                                style={{ left: trPt.x, top: trPt.y, transform: 'translate(25%, -75%)', pointerEvents: 'auto' }}
                                onClick={(e) => { e.stopPropagation(); removeDrawnShape(shape.id); }}
                                title="Delete Shape"
                            >
                                <span className="text-[10px] font-bold leading-none mb-[1px]">✕</span>
                            </div>
                        )}
                    </React.Fragment>
                );
            })}

            {/* Axes indicator (simplified — projected axis lines) */}
            {camera && showAxes && <AxesOverlay camera={camera} canvasW={canvasW} canvasH={canvasH} originMode={originMode} trigger={refreshTrigger} />}
        </div>
    );
};

// --- Axes Ruler (DOM/SVG version) ---

const AxesOverlay: React.FC<{ camera: THREE.Camera; canvasW: number; canvasH: number; originMode: number; trigger: number }> = ({ camera, canvasW, canvasH, originMode, trigger }) => {
    const originRef = useRef({ x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 });

    useEffect(() => {
        let origin = new THREE.Vector3(0, 0, 0);
        if (originMode === 1.0) {
            const dist = Math.max(0.1, engine.lastMeasuredDistance);
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            origin.copy(camera.position).addScaledVector(forward, dist);
        } else {
            const offset = engine.sceneOffset;
            origin.set(-(offset.x + offset.xL), -(offset.y + offset.yL), -(offset.z + offset.zL));
        }

        const offset = engine.sceneOffset;
        originRef.current = {
            x: offset.x, y: offset.y, z: offset.z,
            xL: offset.xL + origin.x, yL: offset.yL + origin.y, zL: offset.zL + origin.z
        };
    }, [originMode, trigger, camera]);

    const offset = engine.sceneOffset;
    const u = originRef.current;
    const worldOrigin = new THREE.Vector3(
        (u.x - offset.x) + (u.xL - offset.xL),
        (u.y - offset.y) + (u.yL - offset.yL),
        (u.z - offset.z) + (u.zL - offset.zL)
    );

    const axisLen = 2;
    const axes = [
        { dir: new THREE.Vector3(axisLen, 0, 0), color: '#ff4444' },
        { dir: new THREE.Vector3(0, axisLen, 0), color: '#44ff44' },
        { dir: new THREE.Vector3(0, 0, axisLen), color: '#4444ff' },
    ];

    const o = project3D(worldOrigin, camera, canvasW, canvasH);
    if (o.behind) return null;

    return (
        <svg width={canvasW} height={canvasH} className="absolute inset-0" style={{ pointerEvents: 'none' }}>
            {axes.map((ax, i) => {
                const tip = worldOrigin.clone().add(ax.dir);
                const p = project3D(tip, camera, canvasW, canvasH);
                if (p.behind) return null;
                return <line key={i} x1={o.x} y1={o.y} x2={p.x} y2={p.y} stroke={ax.color} strokeWidth={2} strokeOpacity={0.7} />;
            })}
            {/* Grid lines in XZ plane */}
            {Array.from({ length: 11 }, (_, i) => {
                const t = (i - 5);
                const a1 = worldOrigin.clone().add(new THREE.Vector3(t, 0, -5));
                const b1 = worldOrigin.clone().add(new THREE.Vector3(t, 0, 5));
                const a2 = worldOrigin.clone().add(new THREE.Vector3(-5, 0, t));
                const b2 = worldOrigin.clone().add(new THREE.Vector3(5, 0, t));
                const pa1 = project3D(a1, camera, canvasW, canvasH);
                const pb1 = project3D(b1, camera, canvasW, canvasH);
                const pa2 = project3D(a2, camera, canvasW, canvasH);
                const pb2 = project3D(b2, camera, canvasW, canvasH);
                const isCenter = t === 0;
                return (
                    <g key={i}>
                        {!pa1.behind && !pb1.behind && <line x1={pa1.x} y1={pa1.y} x2={pb1.x} y2={pb1.y} stroke={isCenter ? '#ff4444' : '#444444'} strokeWidth={isCenter ? 1.5 : 0.5} strokeOpacity={0.5} />}
                        {!pa2.behind && !pb2.behind && <line x1={pa2.x} y1={pa2.y} x2={pb2.x} y2={pb2.y} stroke={isCenter ? '#4444ff' : '#444444'} strokeWidth={isCenter ? 1.5 : 0.5} strokeOpacity={0.5} />}
                    </g>
                );
            })}
        </svg>
    );
};
