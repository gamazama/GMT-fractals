// PreviewCanvas.tsx — Unified preview canvas component
// Combines: fractal SDF preview (WebGL2), SDF slice preview, mesh wireframe preview
// Switches mode based on pipeline state
//
// IMPORTANT: All draw/render callbacks read state from useMeshExportStore.getState()
// rather than closing over reactive values. This avoids stale-closure bugs in the
// useCallback chain (drawBBoxOverlay → renderFractalPreview → requestRender).

import React, { useRef, useEffect, useCallback } from 'react';
import { useMeshExportStore, registerSlicePreview, unregisterSlicePreview } from '../store/meshExportStore';
import { buildMeshPreviewShader, classifyDEType, MESH_SDF_VERT, MESH_FORMULA_UNIFORMS } from '../../engine/SDFShaderBuilder';
import type { MeshInterlaceConfig } from '../../engine/SDFShaderBuilder';
import {
  orthoCamBasis, orthoProject, orthoUnprojectDelta,
  normAngle, findAxisSnap, add3, scale3, dot3,
  SNAP_TARGETS, SNAP_THRESH,
} from '../preview/preview-camera';
import type { Vec3 } from '../preview/preview-camera';
import {
  createMeshPreviewState, meshPreviewSetMesh, meshPreviewRender,
} from '../preview/mesh-preview';
import type { MeshPreviewState } from '../preview/mesh-preview';

// ============================================================================
// WebGL helpers (local, lightweight)
// ============================================================================

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(s) || '';
    gl.deleteShader(s);
    throw new Error('Shader compile: ' + info);
  }
  return s;
}

function createProgram(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, compileShader(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compileShader(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(p) || '';
    gl.deleteProgram(p);
    throw new Error('Program link: ' + info);
  }
  return p;
}

function setFormulaUniforms(
  gl: WebGL2RenderingContext,
  loc: Record<string, WebGLUniformLocation | null>,
  params: Record<string, any>,
): void {
  const p = params || {};
  if (loc.uParamA) gl.uniform1f(loc.uParamA, p.paramA ?? 8);
  if (loc.uParamB) gl.uniform1f(loc.uParamB, p.paramB ?? 0);
  if (loc.uParamC) gl.uniform1f(loc.uParamC, p.paramC ?? 0);
  if (loc.uParamD) gl.uniform1f(loc.uParamD, p.paramD ?? 0);
  if (loc.uParamE) gl.uniform1f(loc.uParamE, p.paramE ?? 0);
  if (loc.uParamF) gl.uniform1f(loc.uParamF, p.paramF ?? 0);
  if (loc.uVec2A) gl.uniform2f(loc.uVec2A, p.vec2A?.x ?? 0, p.vec2A?.y ?? 0);
  if (loc.uVec2B) gl.uniform2f(loc.uVec2B, p.vec2B?.x ?? 0, p.vec2B?.y ?? 0);
  if (loc.uVec2C) gl.uniform2f(loc.uVec2C, p.vec2C?.x ?? 0, p.vec2C?.y ?? 0);
  if (loc.uVec3A) gl.uniform3f(loc.uVec3A, p.vec3A?.x ?? 0, p.vec3A?.y ?? 0, p.vec3A?.z ?? 0);
  if (loc.uVec3B) gl.uniform3f(loc.uVec3B, p.vec3B?.x ?? 0, p.vec3B?.y ?? 0, p.vec3B?.z ?? 0);
  if (loc.uVec3C) gl.uniform3f(loc.uVec3C, p.vec3C?.x ?? 0, p.vec3C?.y ?? 0, p.vec3C?.z ?? 0);
  if (loc.uVec4A) gl.uniform4f(loc.uVec4A, p.vec4A?.x ?? 0, p.vec4A?.y ?? 0, p.vec4A?.z ?? 0, p.vec4A?.w ?? 0);
  if (loc.uVec4B) gl.uniform4f(loc.uVec4B, p.vec4B?.x ?? 0, p.vec4B?.y ?? 0, p.vec4B?.z ?? 0, p.vec4B?.w ?? 0);
  if (loc.uVec4C) gl.uniform4f(loc.uVec4C, p.vec4C?.x ?? 0, p.vec4C?.y ?? 0, p.vec4C?.z ?? 0, p.vec4C?.w ?? 0);
  if (loc.uJulia) gl.uniform4f(loc.uJulia, p.julia?.x ?? 0, p.julia?.y ?? 0, p.julia?.z ?? 0, p.julia?.w ?? 0);
  if (loc.uJuliaMode) gl.uniform1i(loc.uJuliaMode, p.juliaMode ?? 0);
  if (loc.uEscapeThresh) gl.uniform1f(loc.uEscapeThresh, p.escapeThresh ?? 4.0);
  if (loc.uDistanceMetric) gl.uniform1i(loc.uDistanceMetric, p.distanceMetric ?? 0);
}

// ============================================================================
// Types
// ============================================================================

type PreviewMode = 'fractal' | 'slice' | 'mesh';

interface HandleMap {
  center: Vec3;
  'sizeX+': Vec3; 'sizeX-': Vec3;
  'sizeY+': Vec3; 'sizeY-': Vec3;
  'sizeZ+': Vec3; 'sizeZ-': Vec3;
}

type HandleKey = keyof HandleMap | null;

// ============================================================================
// Component
// ============================================================================

const CANVAS_SIZE = 512;
const HP = Math.PI * 0.5;

export function PreviewCanvas() {
  // Only subscribe to the values needed for mode determination and re-render triggers
  const isRunning = useMeshExportStore((s) => s.isRunning);
  const lastMesh = useMeshExportStore((s) => s.lastMesh);
  const loadedDefinition = useMeshExportStore((s) => s.loadedDefinition);
  // Subscribe to bbox/params for triggering re-renders (actual values read from getState())
  const _bboxCenter = useMeshExportStore((s) => s.bboxCenter);
  const _bboxSize = useMeshExportStore((s) => s.bboxSize);
  const _formulaParams = useMeshExportStore((s) => s.formulaParams);
  const _interlaceState = useMeshExportStore((s) => s.interlaceState);
  const _iters = useMeshExportStore((s) => s.iters);
  const _qualitySettings = useMeshExportStore((s) => s.qualitySettings);

  // Refs
  const glCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const sliceCanvasRef = useRef<HTMLCanvasElement>(null);
  const meshCanvasRef = useRef<HTMLCanvasElement>(null);

  // WebGL state (non-reactive, persists across renders)
  const pvRef = useRef<{
    gl: WebGL2RenderingContext | null;
    prog: WebGLProgram | null;
    loc: Record<string, WebGLUniformLocation | null>;
    defId: string | null;
    rawAngle: number;
    rawPitch: number;
    camAngle: number;
    camPitch: number;
    camDist: number;
    dragging: boolean;
    dragMode: string | null;
    hover: HandleKey;
    lastX: number;
    lastY: number;
    shiftHeld: boolean;
    snapped: boolean;
    snapTarget: { angle: number; pitch: number; label: string } | null;
    snapAnimId: number;
    rafId: number;
  }>({
    gl: null, prog: null, loc: {}, defId: null,
    rawAngle: 0.6, rawPitch: 0.3, camAngle: 0.6, camPitch: 0.3, camDist: 3.5,
    dragging: false, dragMode: null, hover: null, lastX: 0, lastY: 0,
    shiftHeld: false, snapped: false, snapTarget: null, snapAnimId: 0, rafId: 0,
  });

  // Mesh preview state
  const meshPvRef = useRef<MeshPreviewState>(createMeshPreviewState());

  // Determine mode
  const mode: PreviewMode = lastMesh ? 'mesh' : isRunning ? 'slice' : 'fractal';

  // ── Fractal Preview: compile shader ──────────────────────────────

  const compilePreview = useCallback(() => {
    const pv = pvRef.current;
    const state = useMeshExportStore.getState();
    const def = state.loadedDefinition;
    if (!pv.gl || !def) return;
    const gl = pv.gl;

    // Build interlace config for shader
    let interlace: MeshInterlaceConfig | undefined;
    if (state.interlaceState) {
      interlace = {
        definition: state.interlaceState.definition,
        params: state.interlaceState.params,
        enabled: state.interlaceState.enabled,
        interval: state.interlaceState.interval,
        startIter: state.interlaceState.startIter,
      };
    }

    // Cache key includes interlace formula + estimator to force recompile when they change
    const qs = state.qualitySettings;
    // For IFS formulas, override power-type estimator to Linear Fold 1.0 (sign-changing for IFS orbits)
    const defDeType = classifyDEType(def);
    const previewEstimator = (defDeType === 'ifs' && qs.estimator >= 1.5 && qs.estimator < 2.5) ? 1 : qs.estimator;
    const cacheKey = def.id + (interlace ? '+' + interlace.definition.id : '') + ':e' + (previewEstimator ?? 0);
    if (pv.defId === cacheKey && pv.prog) return;

    if (pv.prog) { gl.deleteProgram(pv.prog); pv.prog = null; }
    try {
      const fragSrc = buildMeshPreviewShader({ definition: def, deType: 'auto', interlace, estimator: previewEstimator });
      pv.prog = createProgram(gl, MESH_SDF_VERT, fragSrc);
    } catch (e) {
      console.warn('Preview shader compile failed:', (e as Error).message);
      pv.prog = null;
      pv.defId = null;
      return;
    }
    gl.useProgram(pv.prog);
    gl.bindVertexArray(gl.createVertexArray());

    pv.loc = {};
    const uNames = ['uPower', 'uIters', 'uResolution', 'uCamPos', 'uCamTarget', 'uCamRight', 'uFov',
      ...MESH_FORMULA_UNIFORMS];
    for (const name of uNames) {
      pv.loc[name] = gl.getUniformLocation(pv.prog, name);
    }
    pv.defId = cacheKey;
  }, []);

  // ── BBox overlay (reads state imperatively) ────────────────────────

  const drawBBoxOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d')!;
    const w = overlay.width, h = overlay.height;
    ctx.clearRect(0, 0, w, h);

    const pv = pvRef.current;
    // Read fresh from store — not from closure
    const state = useMeshExportStore.getState();
    const [cx, cy, cz] = state.bboxCenter;
    const [sx, sy, sz] = state.bboxSize;
    const hx = sx * 0.5, hy = sy * 0.5, hz = sz * 0.5;

    const project = (p: Vec3): Vec3 =>
      orthoProject(p, pv.camAngle, pv.camPitch, pv.camDist, CANVAS_SIZE, CANVAS_SIZE);

    // Project 8 corners
    const corners: Vec3[] = [];
    for (let xi = 0; xi < 2; xi++)
      for (let yi = 0; yi < 2; yi++)
        for (let zi = 0; zi < 2; zi++)
          corners.push([cx + (xi ? hx : -hx), cy + (yi ? hy : -hy), cz + (zi ? hz : -hz)]);

    const projected = corners.map(project);

    // Edges colored by axis
    const edgeGroups = [
      { color: '#f554', edges: [[0,4],[1,5],[2,6],[3,7]] },
      { color: '#5f54', edges: [[0,2],[1,3],[4,6],[5,7]] },
      { color: '#55f4', edges: [[0,1],[2,3],[4,5],[6,7]] },
    ];
    for (const g of edgeGroups) {
      ctx.strokeStyle = g.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      for (const [a, b] of g.edges) {
        ctx.moveTo(projected[a][0], projected[a][1]);
        ctx.lineTo(projected[b][0], projected[b][1]);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Axis handle diamonds
    const handles: Record<string, Vec3> = {
      'sizeX+': [cx + hx, cy, cz], 'sizeX-': [cx - hx, cy, cz],
      'sizeY+': [cx, cy + hy, cz], 'sizeY-': [cx, cy - hy, cz],
      'sizeZ+': [cx, cy, cz + hz], 'sizeZ-': [cx, cy, cz - hz],
    };
    const handleColors: Record<string, string> = {
      'sizeX+': '#f55', 'sizeX-': '#f55',
      'sizeY+': '#5f5', 'sizeY-': '#5f5',
      'sizeZ+': '#55f', 'sizeZ-': '#55f',
    };
    const handleKeys = Object.keys(handles);
    for (const key of handleKeys) {
      const hp = project(handles[key]);
      const sz2 = (pv.hover === key) ? 7 : 5;
      ctx.fillStyle = handleColors[key];
      ctx.beginPath();
      ctx.moveTo(hp[0], hp[1] - sz2); ctx.lineTo(hp[0] + sz2, hp[1]);
      ctx.lineTo(hp[0], hp[1] + sz2); ctx.lineTo(hp[0] - sz2, hp[1]);
      ctx.closePath(); ctx.fill();
      if (pv.hover === key) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); }
    }

    // Center gizmo — 3 axis arrows
    const centerPos: Vec3 = [cx, cy, cz];
    const cp = project(centerPos);
    const axisWorldLen = pv.camDist * 0.12;
    const axisColors = ['#f55', '#5f5', '#55f'];
    const axisDirs: Vec3[] = [[1,0,0],[0,1,0],[0,0,1]];
    const axisLabels = ['X', 'Y', 'Z'];

    for (let i = 0; i < 3; i++) {
      const tip3d = add3(centerPos, scale3(axisDirs[i], axisWorldLen));
      const tip = project(tip3d);
      const dx = tip[0] - cp[0], dy = tip[1] - cp[1];
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 2) continue;
      const hovered = pv.hover === 'center';
      ctx.strokeStyle = axisColors[i];
      ctx.lineWidth = hovered ? 3 : 2;
      ctx.beginPath(); ctx.moveTo(cp[0], cp[1]); ctx.lineTo(tip[0], tip[1]); ctx.stroke();
      const nx = dx / len, ny = dy / len;
      ctx.fillStyle = axisColors[i];
      ctx.beginPath();
      ctx.moveTo(tip[0], tip[1]);
      ctx.lineTo(tip[0] - nx * 6 + ny * 3, tip[1] - ny * 6 - nx * 3);
      ctx.lineTo(tip[0] - nx * 6 - ny * 3, tip[1] - ny * 6 + nx * 3);
      ctx.closePath(); ctx.fill();
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = axisColors[i];
      ctx.fillText(axisLabels[i], tip[0] + nx * 6 - 3, tip[1] + ny * 6 + 3);
    }

    // Center dot
    const cr = (pv.hover === 'center') ? 5 : 3;
    ctx.fillStyle = pv.hover === 'center' ? '#fc0' : '#fa0';
    ctx.beginPath(); ctx.arc(cp[0], cp[1], cr, 0, Math.PI * 2); ctx.fill();
    if (pv.hover === 'center') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); }

    // Snap label
    if (pv.snapTarget) {
      const snap = findAxisSnap(pv.snapTarget.angle, pv.snapTarget.pitch, 0.1);
      if (snap) {
        ctx.font = 'bold 11px monospace'; ctx.fillStyle = '#fa0'; ctx.textAlign = 'right';
        ctx.fillText(snap.label, w - 6, 14); ctx.textAlign = 'left';
      }
    } else if (pv.shiftHeld) {
      const snap = findAxisSnap(pv.camAngle, pv.camPitch, SNAP_THRESH);
      if (snap) {
        ctx.font = '10px monospace'; ctx.fillStyle = '#888'; ctx.textAlign = 'right';
        ctx.fillText('snap: ' + snap.label, w - 6, 14); ctx.textAlign = 'left';
      }
    }
  }, []);

  // ── Fractal Preview: render (reads state imperatively) ─────────────

  const renderFractalPreview = useCallback(() => {
    const pv = pvRef.current;
    if (!pv.gl || !pv.prog) return;
    const gl = pv.gl;
    const cvs = gl.canvas as HTMLCanvasElement;
    gl.viewport(0, 0, cvs.width, cvs.height);
    gl.useProgram(pv.prog);

    const cam = orthoCamBasis(pv.camAngle, pv.camPitch);
    gl.uniform2f(pv.loc.uResolution!, cvs.width, cvs.height);
    gl.uniform3f(pv.loc.uCamPos!, cam.pos[0], cam.pos[1], cam.pos[2]);
    gl.uniform3f(pv.loc.uCamTarget!, 0, 0, 0);
    gl.uniform3f(pv.loc.uCamRight!, cam.right[0], cam.right[1], cam.right[2]);
    gl.uniform1f(pv.loc.uFov!, pv.camDist);

    // Read fresh from store
    const state = useMeshExportStore.getState();
    const params = state.formulaParams;
    gl.uniform1f(pv.loc.uPower!, params.paramA ?? 8);
    gl.uniform1i(pv.loc.uIters!, state.iters);
    setFormulaUniforms(gl, pv.loc, params);

    // Bind interlace uniforms
    if (state.interlaceState) {
      const il = state.interlaceState;
      const ip = il.params || {};
      if (pv.loc.uInterlaceEnabled) gl.uniform1f(pv.loc.uInterlaceEnabled, il.enabled ? 1.0 : 0.0);
      if (pv.loc.uInterlaceInterval) gl.uniform1f(pv.loc.uInterlaceInterval, il.interval ?? 2);
      if (pv.loc.uInterlaceStartIter) gl.uniform1f(pv.loc.uInterlaceStartIter, il.startIter ?? 0);
      if (pv.loc.uInterlaceParamA) gl.uniform1f(pv.loc.uInterlaceParamA, ip.paramA ?? 0);
      if (pv.loc.uInterlaceParamB) gl.uniform1f(pv.loc.uInterlaceParamB, ip.paramB ?? 0);
      if (pv.loc.uInterlaceParamC) gl.uniform1f(pv.loc.uInterlaceParamC, ip.paramC ?? 0);
      if (pv.loc.uInterlaceParamD) gl.uniform1f(pv.loc.uInterlaceParamD, ip.paramD ?? 0);
      if (pv.loc.uInterlaceParamE) gl.uniform1f(pv.loc.uInterlaceParamE, ip.paramE ?? 0);
      if (pv.loc.uInterlaceParamF) gl.uniform1f(pv.loc.uInterlaceParamF, ip.paramF ?? 0);
      const setVec2 = (name: string, v: any) => {
        if (pv.loc[name]) gl.uniform2f(pv.loc[name]!, v?.x ?? 0, v?.y ?? 0);
      };
      const setVec3 = (name: string, v: any) => {
        if (pv.loc[name]) gl.uniform3f(pv.loc[name]!, v?.x ?? 0, v?.y ?? 0, v?.z ?? 0);
      };
      setVec2('uInterlaceVec2A', ip.vec2A); setVec2('uInterlaceVec2B', ip.vec2B); setVec2('uInterlaceVec2C', ip.vec2C);
      setVec3('uInterlaceVec3A', ip.vec3A); setVec3('uInterlaceVec3B', ip.vec3B); setVec3('uInterlaceVec3C', ip.vec3C);
    } else {
      if (pv.loc.uInterlaceEnabled) gl.uniform1f(pv.loc.uInterlaceEnabled, 0.0);
    }

    // Quality uniforms for preview raymarching
    const qs = state.qualitySettings;
    if (pv.loc.uFudgeFactor) gl.uniform1f(pv.loc.uFudgeFactor, qs.fudgeFactor ?? 1.0);
    if (pv.loc.uDetail) gl.uniform1f(pv.loc.uDetail, qs.detail ?? 1.0);
    if (pv.loc.uPixelThreshold) gl.uniform1f(pv.loc.uPixelThreshold, qs.pixelThreshold ?? 0.5);
    if (pv.loc.uDistanceMetric) gl.uniform1i(pv.loc.uDistanceMetric, qs.distanceMetric ?? 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    drawBBoxOverlay();
  }, [drawBBoxOverlay]);

  // ── Request render (batched via rAF) ─────────────────────────────

  const requestRender = useCallback(() => {
    const pv = pvRef.current;
    if (pv.rafId) return;
    pv.rafId = requestAnimationFrame(() => {
      pv.rafId = 0;
      // Check mode fresh — the closure may be stale
      const s = useMeshExportStore.getState();
      const curMode: PreviewMode = s.lastMesh ? 'mesh' : s.isRunning ? 'slice' : 'fractal';
      if (curMode === 'fractal') {
        compilePreview();
        renderFractalPreview();
      }
    });
  }, [compilePreview, renderFractalPreview]);

  // ── Handle hit-testing (reads state imperatively) ──────────────────

  const hitTestHandles = useCallback((mx: number, my: number): HandleKey => {
    const pv = pvRef.current;
    const state = useMeshExportStore.getState();
    const [cx, cy, cz] = state.bboxCenter;
    const [sx, sy, sz] = state.bboxSize;
    const hx = sx * 0.5, hy = sy * 0.5, hz = sz * 0.5;

    const project = (p: Vec3): Vec3 =>
      orthoProject(p, pv.camAngle, pv.camPitch, pv.camDist, CANVAS_SIZE, CANVAS_SIZE);

    const hitRadius = 8;
    const cp = project([cx, cy, cz]);
    if (Math.abs(mx - cp[0]) < hitRadius && Math.abs(my - cp[1]) < hitRadius) return 'center';

    const axisHandles: [HandleKey, Vec3][] = [
      ['sizeX+', [cx + hx, cy, cz]], ['sizeX-', [cx - hx, cy, cz]],
      ['sizeY+', [cx, cy + hy, cz]], ['sizeY-', [cx, cy - hy, cz]],
      ['sizeZ+', [cx, cy, cz + hz]], ['sizeZ-', [cx, cy, cz - hz]],
    ];
    for (const [key, pos] of axisHandles) {
      const hp = project(pos);
      if (Math.abs(mx - hp[0]) < hitRadius && Math.abs(my - hp[1]) < hitRadius) return key;
    }
    return null;
  }, []);

  // ── Snap animation ───────────────────────────────────────────────

  const updateSnap = useCallback(() => {
    const pv = pvRef.current;
    if (pv.shiftHeld) {
      const snap = findAxisSnap(pv.rawAngle, pv.rawPitch, SNAP_THRESH);
      if (snap) {
        pv.snapped = true;
        pv.snapTarget = snap;
        if (!pv.snapAnimId) {
          const animate = () => {
            pv.snapAnimId = 0;
            if (!pv.snapTarget) return;
            const da = normAngle(pv.snapTarget.angle - pv.camAngle);
            const dp = pv.snapTarget.pitch - pv.camPitch;
            const dist = Math.sqrt(da * da + dp * dp);
            if (dist < 0.002) {
              pv.camAngle = pv.snapTarget.angle;
              pv.camPitch = pv.snapTarget.pitch;
              requestRender();
              if (pv.snapped) pv.snapAnimId = requestAnimationFrame(animate);
              return;
            }
            pv.camAngle += da * 0.2;
            pv.camPitch += dp * 0.2;
            requestRender();
            pv.snapAnimId = requestAnimationFrame(animate);
          };
          pv.snapAnimId = requestAnimationFrame(animate);
        }
        return;
      }
    }
    pv.snapped = false;
    pv.snapTarget = null;
    if (pv.snapAnimId) { cancelAnimationFrame(pv.snapAnimId); pv.snapAnimId = 0; }
    pv.camAngle = pv.rawAngle;
    pv.camPitch = pv.rawPitch;
  }, [requestRender]);

  // ── Init WebGL on mount ──────────────────────────────────────────

  useEffect(() => {
    const cvs = glCanvasRef.current;
    if (!cvs) return;
    const pv = pvRef.current;
    pv.gl = cvs.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true });
    if (!pv.gl) console.warn('Preview: WebGL2 not available');
    return () => {
      if (pv.prog && pv.gl) pv.gl.deleteProgram(pv.prog);
      pv.prog = null;
      pv.defId = null;
    };
  }, []);

  // ── Register slice preview callback ─────────────────────────────

  useEffect(() => {
    const sliceCvs = sliceCanvasRef.current;
    if (!sliceCvs) return;
    const ctx = sliceCvs.getContext('2d');
    if (!ctx) return;

    registerSlicePreview((imageData: ImageData, w: number, h: number) => {
      const tmpCvs = document.createElement('canvas');
      tmpCvs.width = w;
      tmpCvs.height = h;
      const tmpCtx = tmpCvs.getContext('2d')!;
      tmpCtx.putImageData(imageData, 0, 0);
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tmpCvs, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    });

    return () => { unregisterSlicePreview(); };
  }, []);

  // ── Recompile when definition changes ────────────────────────────

  useEffect(() => {
    if (mode !== 'fractal') return;
    const pv = pvRef.current;
    const state = useMeshExportStore.getState();
    const il = state.interlaceState;
    const expectedKey = (loadedDefinition?.id ?? '') + (il ? '+' + il.definition.id : '');
    if (loadedDefinition && pv.defId !== expectedKey) {
      pv.defId = null; // force recompile
    }
    requestRender();
  }, [loadedDefinition, _interlaceState, mode, requestRender]);

  // ── Re-render when params/bounds change ──────────────────────────

  useEffect(() => {
    if (mode === 'fractal') requestRender();
  }, [_formulaParams, _interlaceState, _iters, _bboxCenter, _bboxSize, mode, requestRender]);

  // ── Update mesh preview when lastMesh changes ────────────────────

  useEffect(() => {
    if (!lastMesh) return;
    const cvs = meshCanvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    const mpv = meshPvRef.current;
    meshPreviewSetMesh(mpv, lastMesh.positions, lastMesh.indices, lastMesh.vertexCount, lastMesh.faceCount, cvs.width);
    meshPreviewRender(mpv, ctx, cvs.width, cvs.height);
  }, [lastMesh]);

  // ── Mouse handlers for fractal preview (orbit + bbox) ────────────

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const pv = pvRef.current;

    const onMouseDown = (e: MouseEvent) => {
      const rect = overlay.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      pv.lastX = e.clientX; pv.lastY = e.clientY;
      const hit = hitTestHandles(mx, my);
      pv.dragMode = hit || 'orbit';
      pv.dragging = true;
      overlay.style.cursor = pv.dragMode === 'orbit' ? 'grabbing' : 'ew-resize';
      e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!pv.dragging) {
        const rect = overlay.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const oldHover = pv.hover;
        pv.hover = hitTestHandles(mx, my);
        overlay.style.cursor = pv.hover ? (pv.hover === 'center' ? 'move' : 'ew-resize') : 'grab';
        if (pv.hover !== oldHover) requestRender();
        return;
      }

      const dx = e.clientX - pv.lastX, dy = e.clientY - pv.lastY;
      pv.lastX = e.clientX; pv.lastY = e.clientY;

      if (pv.dragMode === 'orbit') {
        pv.rawAngle += dx * 0.008;
        pv.rawPitch = Math.max(-HP, Math.min(HP, pv.rawPitch + dy * 0.008));
        updateSnap();
        requestRender();
      } else if (pv.dragMode === 'center') {
        const worldDelta = orthoUnprojectDelta(dx, dy, pv.camAngle, pv.camPitch, pv.camDist, CANVAS_SIZE);
        // Read fresh from store
        const state = useMeshExportStore.getState();
        const [bcx, bcy, bcz] = state.bboxCenter;
        state.setBboxCenter([bcx + worldDelta[0], bcy + worldDelta[1], bcz + worldDelta[2]]);
        requestRender();
      } else if (pv.dragMode) {
        // Axis handle drag
        const axisChar = pv.dragMode.charAt(4);
        const sign = pv.dragMode.charAt(5) === '+' ? 1 : -1;
        const axis: Vec3 = axisChar === 'X' ? [1,0,0] : axisChar === 'Y' ? [0,1,0] : [0,0,1];
        const worldDelta = orthoUnprojectDelta(dx, dy, pv.camAngle, pv.camPitch, pv.camDist, CANVAS_SIZE);
        const axisDelta = dot3(worldDelta, axis) * sign;
        const axisIdx = axisChar === 'X' ? 0 : axisChar === 'Y' ? 1 : 2;
        // Read fresh from store
        const state = useMeshExportStore.getState();
        const curSize = [...state.bboxSize] as [number, number, number];
        const curCenter = [...state.bboxCenter] as [number, number, number];
        const newSize = Math.max(0.1, curSize[axisIdx] + axisDelta * 2);
        const sizeDelta = newSize - curSize[axisIdx];
        if (state.bboxLock) {
          state.setBboxSize([newSize, newSize, newSize]);
        } else {
          curSize[axisIdx] = newSize;
          curCenter[axisIdx] += sizeDelta * 0.5 * sign;
          state.setBboxSize(curSize);
          state.setBboxCenter(curCenter);
        }
        requestRender();
      }
    };

    const onMouseUp = () => {
      pv.dragging = false;
      pv.dragMode = null;
      overlay.style.cursor = pv.hover ? (pv.hover === 'center' ? 'move' : 'ew-resize') : 'grab';
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      pv.camDist = Math.max(0.5, Math.min(20.0, pv.camDist * (1 + e.deltaY * 0.001)));
      requestRender();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && !pv.shiftHeld) {
        pv.shiftHeld = true;
        updateSnap();
        requestRender();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        pv.shiftHeld = false;
        updateSnap();
        requestRender();
      }
    };

    overlay.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    overlay.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      overlay.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      overlay.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [hitTestHandles, updateSnap, requestRender]);

  // ── Mouse handlers for mesh preview (orbit + zoom) ───────────────

  useEffect(() => {
    const cvs = meshCanvasRef.current;
    if (!cvs) return;
    const mpv = meshPvRef.current;

    const renderMesh = () => {
      const ctx = cvs.getContext('2d');
      if (ctx) meshPreviewRender(mpv, ctx, cvs.width, cvs.height);
    };

    const onMouseDown = (e: MouseEvent) => {
      mpv.dragging = true;
      mpv.lastMX = e.clientX;
      mpv.lastMY = e.clientY;
    };

    const onMouseUp = () => { mpv.dragging = false; };

    const onMouseMove = (e: MouseEvent) => {
      if (!mpv.dragging || !mpv.positions) return;
      const dx = e.clientX - mpv.lastMX;
      const dy = e.clientY - mpv.lastMY;
      mpv.lastMX = e.clientX;
      mpv.lastMY = e.clientY;
      mpv.rotY += dx * 0.01;
      mpv.rotX += dy * 0.01;
      mpv.rotX = Math.max(-HP, Math.min(HP, mpv.rotX));
      renderMesh();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      mpv.zoom *= e.deltaY > 0 ? 0.9 : 1.1;
      mpv.zoom = Math.max(0.1, Math.min(10, mpv.zoom));
      if (mpv.positions) renderMesh();
    };

    cvs.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    cvs.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      cvs.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      cvs.removeEventListener('wheel', onWheel);
    };
  }, []);

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="relative" style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
      {/* Fractal preview layer (WebGL + overlay) */}
      <canvas
        ref={glCanvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="border border-white/10 rounded-sm"
        style={{
          imageRendering: 'pixelated',
          display: mode === 'fractal' ? 'block' : 'none',
        }}
      />
      <canvas
        ref={overlayRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        style={{
          position: 'absolute', top: 0, left: 0, cursor: 'grab',
          display: mode === 'fractal' ? 'block' : 'none',
        }}
      />

      {/* Slice preview layer (2D canvas for SDF sampling progress) */}
      <canvas
        ref={sliceCanvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="border border-white/10 rounded-sm"
        style={{
          imageRendering: 'pixelated',
          display: mode === 'slice' ? 'block' : 'none',
        }}
      />

      {/* Mesh wireframe preview */}
      <canvas
        ref={meshCanvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="border border-white/10 rounded-sm"
        style={{
          cursor: 'grab',
          display: mode === 'mesh' ? 'block' : 'none',
        }}
      />

      {/* Mode label */}
      <div className="absolute top-2 left-2 text-[10px] text-gray-500 uppercase tracking-wider pointer-events-none">
        {mode === 'fractal' && 'SDF Preview'}
        {mode === 'slice' && 'Sampling...'}
        {mode === 'mesh' && 'Mesh Preview'}
      </div>
    </div>
  );
}
