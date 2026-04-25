
import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { nanoid } from 'nanoid';
import { useEngineStore } from '../../../store/engineStore';
import { getProxy } from '../../engine/worker/WorkerProxy';
const engine = getProxy();
import { DrawnShape } from './index';
import { FeatureComponentProps } from '../../../components/registry/ComponentRegistry';
import { getViewportCamera, getViewportCanvas } from '../../engine/worker/ViewportRefs';
import {
    getOverlayViewport,
    projectWorldToXY,
    preciseToWorld,
} from '../../../engine/overlay/OverlayProjection';

// ── Pre-allocated temporaries (module-scoped, never exposed) ─────────

const _localVec = new THREE.Vector3();
const _centerVec = new THREE.Vector3();
const _worldOriginVec = new THREE.Vector3();
const _quat = new THREE.Quaternion();

// ── Shape projection ─────────────────────────────────────────────────

interface ScreenPt { x: number; y: number; behind: boolean }

/** Get 2D polygon points for a shape projected to screen */
const projectShapeToScreen = (
    shape: DrawnShape, camera: THREE.Camera, canvasW: number, canvasH: number, offset: any
): ScreenPt[] => {
    preciseToWorld(shape.center, offset, _centerVec);
    _quat.set(shape.orientation.x, shape.orientation.y, shape.orientation.z, shape.orientation.w);
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
            _localVec.set(Math.cos(a) * halfW, Math.sin(a) * halfH, renderZ);
            _localVec.applyQuaternion(_quat).add(_centerVec);
            pts.push(projectWorldToXY(_localVec, camera, canvasW, canvasH));
        }
        return pts;
    }

    if (isCube) {
        const corners: ScreenPt[] = [];
        for (const sx of [-1, 1]) {
            for (const sy of [-1, 1]) {
                for (const sz of [-1, 1]) {
                    _localVec.set(sx * halfW, sy * halfH, renderZ + sz * depth / 2);
                    _localVec.applyQuaternion(_quat).add(_centerVec);
                    corners.push(projectWorldToXY(_localVec, camera, canvasW, canvasH));
                }
            }
        }
        return corners;
    }

    // 2D Rectangle — 4 corners
    const corners: ScreenPt[] = [];
    const signs: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (const [sx, sy] of signs) {
        _localVec.set(sx * halfW, sy * halfH, renderZ);
        _localVec.applyQuaternion(_quat).add(_centerVec);
        corners.push(projectWorldToXY(_localVec, camera, canvasW, canvasH));
    }
    return corners;
};

// --- Cube edge pairs (index into 8-corner array) ---
const CUBE_EDGES = [
    [0, 1], [2, 3], [4, 5], [6, 7], // Z edges
    [0, 2], [1, 3], [4, 6], [5, 7], // Y edges
    [0, 4], [1, 5], [2, 6], [3, 7], // X edges
];

// ── Global refs for tick access (same pattern as LightGizmo) ──

/** Cached DOM element lookups — avoids querySelector on every frame */
const _svgCache = new Map<string, SVGElement>();
const _labelCache = new Map<string, HTMLDivElement>();

/** Refs set by the React component, read by tick */
let _overlayRef: {
    svgEl: SVGSVGElement | null;
    labelsEl: HTMLDivElement | null;
    axesSvgEl: SVGSVGElement | null;
    tempShapeRef: React.MutableRefObject<Partial<DrawnShape> | null> | null;
    axesOriginRef: React.MutableRefObject<{ x: number; y: number; z: number; xL: number; yL: number; zL: number }> | null;
} = {
    svgEl: null,
    labelsEl: null,
    axesSvgEl: null,
    tempShapeRef: null,
    axesOriginRef: null,
};

// ── Shape list builder (shared between SVG + label updates) ─────────

interface RenderableShape { shape: DrawnShape; color: string; isTemp: boolean }

/** Scratch array reused each frame — never reallocated */
let _renderShapes: RenderableShape[] = [];

function collectRenderShapes(
    shapes: DrawnShape[] | undefined,
    tempShape: Partial<DrawnShape> | null,
    drawingColor: THREE.Color,
): RenderableShape[] {
    _renderShapes.length = 0;
    if (shapes) {
        for (const s of shapes) {
            _renderShapes.push({ shape: s, color: s.color, isTemp: false });
        }
    }
    if (tempShape && tempShape.center && tempShape.size && tempShape.orientation) {
        _renderShapes.push({
            shape: tempShape as DrawnShape,
            color: '#' + drawingColor.getHexString(),
            isTemp: true,
        });
    }
    return _renderShapes;
}

// ── SVG element management ──────────────────────────────────────────

function getOrCreatePath(svgEl: SVGSVGElement, id: string): SVGPathElement {
    let el = _svgCache.get(id) as SVGPathElement | undefined;
    if (!el || !el.isConnected) {
        el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        el.setAttribute('data-shape-id', id);
        el.setAttribute('fill', 'none');
        el.setAttribute('stroke-opacity', '0.9');
        svgEl.appendChild(el);
        _svgCache.set(id, el);
    }
    return el;
}

function getOrCreateCubeGroup(svgEl: SVGSVGElement, id: string): SVGGElement {
    let el = _svgCache.get(id) as SVGGElement | undefined;
    if (!el || !el.isConnected) {
        el = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        el.setAttribute('data-shape-id', id);
        for (let i = 0; i < CUBE_EDGES.length; i++) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('stroke-opacity', '0.9');
            el.appendChild(line);
        }
        svgEl.appendChild(el);
        _svgCache.set(id, el);
    }
    return el;
}

function getOrCreateLabelGroup(labelsEl: HTMLDivElement, id: string): HTMLDivElement {
    let el = _labelCache.get(id);
    if (!el || !el.isConnected) {
        el = document.createElement('div');
        el.setAttribute('data-label-id', id);
        el.style.position = 'absolute';
        el.style.left = '0';
        el.style.top = '0';
        el.style.pointerEvents = 'none';
        el.innerHTML = `<div data-role="width" class="absolute text-[10px] font-mono font-bold whitespace-nowrap text-cyan-300 opacity-90 px-1" style="pointer-events:none"></div><div data-role="height" class="absolute text-[10px] font-mono font-bold whitespace-nowrap text-cyan-300 opacity-90 px-1" style="pointer-events:none"></div><div data-role="delete" class="drawing-ui absolute cursor-pointer flex items-center justify-center w-4 h-4 bg-red-900/80 hover:bg-red-500 text-white rounded-full transition-colors shadow-sm border border-white/20" style="pointer-events:auto" title="Delete Shape"><span class="text-[10px] font-bold leading-none mb-[1px]">✕</span></div>`;
        const deleteBtn = el.querySelector('[data-role="delete"]') as HTMLElement;
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                useEngineStore.getState().removeDrawnShape(id);
            });
        }
        labelsEl.appendChild(el);
        _labelCache.set(id, el);
    }
    return el;
}

// ── Tick Function (TICK_PHASE.OVERLAY) ──────────────────────────────

/**
 * Called once per frame from TickRegistry at OVERLAY phase.
 * Imperatively updates SVG paths and label positions — no React re-render.
 */
export const tick = () => {
    const vp = getOverlayViewport();
    if (!vp) return;

    const { camera, width, height } = vp;
    const state = useEngineStore.getState();
    const drawing = state.drawing;
    if (!drawing) return;

    const { shapes, showLabels, showAxes } = drawing;
    const offset = engine.sceneOffset;
    const tempShape = _overlayRef.tempShapeRef?.current ?? null;

    const hasContent = (shapes && shapes.length > 0) || tempShape || showAxes;
    if (!hasContent) return;

    const svgEl = _overlayRef.svgEl;
    const labelsEl = _overlayRef.labelsEl;

    // Collect shapes once — shared by SVG and label passes
    const allShapes = collectRenderShapes(shapes, tempShape, drawing.color);

    // Build active ID set for stale-element cleanup
    const activeIds = new Set<string>();
    for (const { shape, isTemp } of allShapes) {
        activeIds.add(shape.id || 'temp');
    }

    // ── Update SVG viewport + shape paths ──
    if (svgEl) {
        svgEl.setAttribute('width', String(width));
        svgEl.setAttribute('height', String(height));

        for (const { shape, color, isTemp } of allShapes) {
            const id = shape.id || 'temp';
            const isCube = shape.type === 'rect' && (shape.size.z || 0) > 0.001;
            const pts = projectShapeToScreen(shape, camera, width, height, offset);
            const anyBehind = pts.some(p => p.behind);

            if (isCube) {
                const groupEl = getOrCreateCubeGroup(svgEl, id);
                if (anyBehind) {
                    groupEl.setAttribute('visibility', 'hidden');
                } else {
                    groupEl.setAttribute('visibility', 'visible');
                    const lines = groupEl.children;
                    for (let i = 0; i < CUBE_EDGES.length; i++) {
                        const [a, b] = CUBE_EDGES[i];
                        const line = lines[i] as SVGLineElement;
                        if (line) {
                            line.setAttribute('x1', String(pts[a].x));
                            line.setAttribute('y1', String(pts[a].y));
                            line.setAttribute('x2', String(pts[b].x));
                            line.setAttribute('y2', String(pts[b].y));
                            line.setAttribute('stroke', color);
                            line.setAttribute('stroke-width', isTemp ? '1' : '1.5');
                        }
                    }
                }
            } else {
                const pathEl = getOrCreatePath(svgEl, id);
                if (anyBehind) {
                    pathEl.setAttribute('visibility', 'hidden');
                } else {
                    pathEl.setAttribute('visibility', 'visible');
                    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';
                    pathEl.setAttribute('d', d);
                    pathEl.setAttribute('stroke', color);
                    pathEl.setAttribute('stroke-width', isTemp ? '1' : '1.5');
                }
            }
        }

        // Remove stale SVG elements
        for (const [cachedId, el] of _svgCache) {
            if (!activeIds.has(cachedId)) {
                el.remove();
                _svgCache.delete(cachedId);
            }
        }
    }

    // ── Update labels ──
    if (labelsEl) {
        for (const { shape, isTemp } of allShapes) {
            if (!showLabels) continue;

            const id = shape.id || 'temp';
            preciseToWorld(shape.center, offset, _centerVec);
            _quat.set(shape.orientation.x, shape.orientation.y, shape.orientation.z, shape.orientation.w);
            const halfW = shape.size.x / 2;
            const halfH = shape.size.y / 2;
            const depth = shape.size.z || 0;
            const zOff = shape.zOffset || 0;
            const renderZ = (shape.type === 'rect' && depth > 0.001) ? (zOff - depth / 2) : zOff;

            _localVec.set(0, halfH, renderZ + depth / 2).applyQuaternion(_quat).add(_centerVec);
            const topPt = projectWorldToXY(_localVec, camera, width, height);

            _localVec.set(-halfW, 0, renderZ + depth / 2).applyQuaternion(_quat).add(_centerVec);
            const leftPt = projectWorldToXY(_localVec, camera, width, height);

            _localVec.set(halfW, halfH, renderZ + depth / 2).applyQuaternion(_quat).add(_centerVec);
            const trPt = projectWorldToXY(_localVec, camera, width, height);

            const anyBehind = topPt.behind || leftPt.behind;
            const labelGroup = getOrCreateLabelGroup(labelsEl, id);

            if (anyBehind) {
                labelGroup.style.display = 'none';
            } else {
                labelGroup.style.display = '';

                const widthEl = labelGroup.children[0] as HTMLElement;
                const heightEl = labelGroup.children[1] as HTMLElement;
                const deleteEl = labelGroup.children[2] as HTMLElement;

                if (widthEl) {
                    widthEl.style.left = `${topPt.x}px`;
                    widthEl.style.top = `${topPt.y}px`;
                    widthEl.style.transform = 'translate(-50%, -100%)';
                    widthEl.textContent = shape.size.x.toFixed(4);
                }

                if (heightEl) {
                    heightEl.style.left = `${leftPt.x}px`;
                    heightEl.style.top = `${leftPt.y}px`;
                    heightEl.style.transform = 'translate(-100%, -50%) rotate(90deg)';
                    heightEl.style.transformOrigin = 'right center';
                    heightEl.textContent = shape.size.y.toFixed(4);
                }

                if (deleteEl) {
                    if (isTemp || trPt.behind) {
                        deleteEl.style.display = 'none';
                    } else {
                        deleteEl.style.display = '';
                        deleteEl.style.left = `${trPt.x}px`;
                        deleteEl.style.top = `${trPt.y}px`;
                        deleteEl.style.transform = 'translate(25%, -75%)';
                    }
                }
            }
        }

        // Remove stale label groups
        const activeLabelIds = showLabels ? activeIds : new Set<string>();
        for (const [cachedId, el] of _labelCache) {
            if (!activeLabelIds.has(cachedId)) {
                el.remove();
                _labelCache.delete(cachedId);
            }
        }
    }

    // ── Update axes overlay ──
    if (showAxes && _overlayRef.axesSvgEl && _overlayRef.axesOriginRef) {
        const axesSvg = _overlayRef.axesSvgEl;
        axesSvg.setAttribute('width', String(width));
        axesSvg.setAttribute('height', String(height));
        axesSvg.style.display = '';

        const u = _overlayRef.axesOriginRef.current;
        _worldOriginVec.set(
            (u.x - offset.x) + (u.xL - offset.xL),
            (u.y - offset.y) + (u.yL - offset.yL),
            (u.z - offset.z) + (u.zL - offset.zL)
        );

        const o = projectWorldToXY(_worldOriginVec, camera, width, height);
        if (o.behind) {
            axesSvg.style.display = 'none';
            return;
        }

        // Update axis lines
        const axisLen = 2;
        const axisConfigs = [
            { dx: axisLen, dy: 0, dz: 0 },
            { dx: 0, dy: axisLen, dz: 0 },
            { dx: 0, dy: 0, dz: axisLen },
        ];

        const axisLines = axesSvg.querySelectorAll('[data-axis]');
        for (let i = 0; i < axisConfigs.length; i++) {
            const ax = axisConfigs[i];
            _localVec.set(_worldOriginVec.x + ax.dx, _worldOriginVec.y + ax.dy, _worldOriginVec.z + ax.dz);
            const p = projectWorldToXY(_localVec, camera, width, height);
            const line = axisLines[i] as SVGLineElement | undefined;
            if (line) {
                if (p.behind) {
                    line.setAttribute('visibility', 'hidden');
                } else {
                    line.setAttribute('visibility', 'visible');
                    line.setAttribute('x1', String(o.x));
                    line.setAttribute('y1', String(o.y));
                    line.setAttribute('x2', String(p.x));
                    line.setAttribute('y2', String(p.y));
                }
            }
        }

        // Update grid lines
        const gridLines = axesSvg.querySelectorAll('[data-grid]');
        let gridIdx = 0;
        for (let i = 0; i < 11; i++) {
            const t = i - 5;
            const isCenter = t === 0;

            _localVec.set(_worldOriginVec.x + t, _worldOriginVec.y, _worldOriginVec.z - 5);
            const pa1 = projectWorldToXY(_localVec, camera, width, height);
            _localVec.set(_worldOriginVec.x + t, _worldOriginVec.y, _worldOriginVec.z + 5);
            const pb1 = projectWorldToXY(_localVec, camera, width, height);

            const line1 = gridLines[gridIdx++] as SVGLineElement | undefined;
            if (line1) {
                if (pa1.behind || pb1.behind) {
                    line1.setAttribute('visibility', 'hidden');
                } else {
                    line1.setAttribute('visibility', 'visible');
                    line1.setAttribute('x1', String(pa1.x)); line1.setAttribute('y1', String(pa1.y));
                    line1.setAttribute('x2', String(pb1.x)); line1.setAttribute('y2', String(pb1.y));
                    line1.setAttribute('stroke', isCenter ? '#ff4444' : '#444444');
                    line1.setAttribute('stroke-width', isCenter ? '1.5' : '0.5');
                }
            }

            _localVec.set(_worldOriginVec.x - 5, _worldOriginVec.y, _worldOriginVec.z + t);
            const pa2 = projectWorldToXY(_localVec, camera, width, height);
            _localVec.set(_worldOriginVec.x + 5, _worldOriginVec.y, _worldOriginVec.z + t);
            const pb2 = projectWorldToXY(_localVec, camera, width, height);

            const line2 = gridLines[gridIdx++] as SVGLineElement | undefined;
            if (line2) {
                if (pa2.behind || pb2.behind) {
                    line2.setAttribute('visibility', 'hidden');
                } else {
                    line2.setAttribute('visibility', 'visible');
                    line2.setAttribute('x1', String(pa2.x)); line2.setAttribute('y1', String(pa2.y));
                    line2.setAttribute('x2', String(pb2.x)); line2.setAttribute('y2', String(pb2.y));
                    line2.setAttribute('stroke', isCenter ? '#4444ff' : '#444444');
                    line2.setAttribute('stroke-width', isCenter ? '1.5' : '0.5');
                }
            }
        }
    } else if (_overlayRef.axesSvgEl) {
        _overlayRef.axesSvgEl.style.display = 'none';
    }
};


// =============================================
// Main Overlay Component (DOM-based)
// =============================================

export const DrawingOverlay: React.FC<FeatureComponentProps> = () => {
    const { drawing, setDrawing, addDrawnShape } = useEngineStore();
    const { active, activeTool, originMode } = drawing;

    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const labelsRef = useRef<HTMLDivElement>(null);
    const axesSvgRef = useRef<SVGSVGElement>(null);

    // Temp shape during drag (read by tick for rendering)
    const tempShapeRef = useRef<Partial<DrawnShape> | null>(null);
    const isDragging = useRef(false);

    // Axes origin (updated on originMode/trigger change, read by tick)
    const axesOriginRef = useRef({ x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 });

    // Geometry refs for interaction
    const anchor3D = useRef(new THREE.Vector3());
    const currentScreen = useRef(new THREE.Vector2());
    const planeOrigin = useRef(new THREE.Vector3());
    const activePlane = useRef(new THREE.Plane());
    const basisU = useRef(new THREE.Vector3());
    const basisV = useRef(new THREE.Vector3());

    // Input state
    const keys = useRef({ space: false, x: false });

    // --- Register refs for tick access ---
    useEffect(() => {
        _overlayRef.svgEl = svgRef.current;
        _overlayRef.labelsEl = labelsRef.current;
        _overlayRef.axesSvgEl = axesSvgRef.current;
        _overlayRef.tempShapeRef = tempShapeRef;
        _overlayRef.axesOriginRef = axesOriginRef;
        return () => {
            _overlayRef.svgEl = null;
            _overlayRef.labelsEl = null;
            _overlayRef.axesSvgEl = null;
            _overlayRef.tempShapeRef = null;
            _overlayRef.axesOriginRef = null;
            _svgCache.clear();
            _labelCache.clear();
        };
    }, []);

    // --- Update axes origin when mode/trigger changes ---
    const refreshTrigger = useEngineStore(s => s.drawing?.refreshTrigger);
    useEffect(() => {
        const camera = getViewportCamera();
        if (!camera) return;

        const originMode = useEngineStore.getState().drawing?.originMode ?? 1;
        let origin = new THREE.Vector3(0, 0, 0);
        if (originMode === 1.0) {
            const dist = Math.max(0.1, engine.lastMeasuredDistance);
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            origin.copy(camera.position).addScaledVector(forward, dist);
        } else {
            const off = engine.sceneOffset;
            origin.set(-(off.x + off.xL), -(off.y + off.yL), -(off.z + off.zL));
        }

        const off = engine.sceneOffset;
        axesOriginRef.current = {
            x: off.x, y: off.y, z: off.z,
            xL: off.xL + origin.x, yL: off.yL + origin.y, zL: off.zL + origin.z,
        };
    }, [originMode, refreshTrigger]);

    // --- Camera accessor (for interaction handlers — uses live camera) ---
    const getCamera = useCallback(() => getViewportCamera() as THREE.PerspectiveCamera, []);
    const getCanvas = useCallback(() => getViewportCanvas(), []);

    // --- Plane math ---
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

                tempShapeRef.current = {
                    center: undefined,
                    size: { x: 0, y: 0 },
                    orientation: new THREE.Quaternion().setFromRotationMatrix(
                        new THREE.Matrix4().makeBasis(basisU.current, basisV.current, normal)
                    ),
                    type: activeTool
                };
                canvas.setPointerCapture(e.pointerId);
            }
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (!isDragging.current) return;

            const rect = canvas.getBoundingClientRect();
            const normal = updatePlaneAndBasis(keys.current.x);
            const mouse3D = raycastToPlane(e.clientX, e.clientY, rect);
            if (!mouse3D) return;

            if (keys.current.space) {
                const prev3D = raycastToPlane(currentScreen.current.x, currentScreen.current.y, rect);
                if (prev3D) {
                    const delta = new THREE.Vector3().subVectors(mouse3D, prev3D);
                    anchor3D.current.add(delta);
                    if (tempShapeRef.current?.center) {
                        const c = tempShapeRef.current.center;
                        tempShapeRef.current = {
                            ...tempShapeRef.current,
                            center: { ...c, xL: c.xL + delta.x, yL: c.yL + delta.y, zL: c.zL + delta.z }
                        };
                    }
                }
                currentScreen.current.set(e.clientX, e.clientY);
                return;
            }

            currentScreen.current.set(e.clientX, e.clientY);

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
            tempShapeRef.current = {
                ...tempShapeRef.current,
                center: { x: offset.x, y: offset.y, z: offset.z, xL: offset.xL + centerLocal.x, yL: offset.yL + centerLocal.y, zL: offset.zL + centerLocal.z },
                size: { x: Math.abs(w), y: Math.abs(h) },
                orientation: new THREE.Quaternion().setFromRotationMatrix(
                    new THREE.Matrix4().makeBasis(basisU.current, basisV.current, normal)
                )
            };
        };

        const handlePointerUp = (e: PointerEvent) => {
            if (!isDragging.current) return;
            isDragging.current = false;
            canvas.releasePointerCapture(e.pointerId);

            const finalShape = tempShapeRef.current;
            const currentGlobalColor = useEngineStore.getState().drawing.color;

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

    // ── Render: minimal DOM structure — tick handles all positional updates ──

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 overflow-hidden"
            style={{ pointerEvents: 'none' }}
        >
            <svg
                ref={svgRef}
                className="absolute inset-0"
                style={{ pointerEvents: 'none' }}
            />
            <div
                ref={labelsRef}
                className="absolute inset-0"
                style={{ pointerEvents: 'none' }}
            />
            <svg
                ref={axesSvgRef}
                className="absolute inset-0"
                style={{ pointerEvents: 'none', display: 'none' }}
            >
                <line data-axis="x" stroke="#ff4444" strokeWidth={2} strokeOpacity={0.7} />
                <line data-axis="y" stroke="#44ff44" strokeWidth={2} strokeOpacity={0.7} />
                <line data-axis="z" stroke="#4444ff" strokeWidth={2} strokeOpacity={0.7} />
                {Array.from({ length: 22 }, (_, i) => (
                    <line key={i} data-grid={i} strokeOpacity={0.5} />
                ))}
            </svg>
        </div>
    );
};
