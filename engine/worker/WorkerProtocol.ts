/**
 * WorkerProtocol — Typed message contract between main thread and render worker.
 *
 * All messages are plain objects with a `type` discriminator.
 * Values must be serializable (no THREE.js objects — use plain numbers/arrays).
 */

import type { ShaderConfig } from '../ShaderFactory';
import type { EngineRenderState } from '../FractalEngine';
import type { VideoExportConfig } from '../codec/VideoExportTypes';
import type { BucketRenderConfig } from '../BucketRenderer';

// ─── Serializable camera/offset data ─────────────────────────────────────

export interface SerializedCamera {
    position: [number, number, number];
    quaternion: [number, number, number, number];
    fov: number;
    aspect: number;
}

export interface SerializedOffset {
    x: number; y: number; z: number;
    xL: number; yL: number; zL: number;
}

// ─── Shadow state: worker → main thread (piggybacked on FRAME_READY) ────

export interface WorkerShadowState {
    isBooted: boolean;
    isCompiling: boolean;
    hasCompiledShader: boolean;
    isPaused: boolean;
    dirty: boolean;
    lastCompileDuration: number;
    lastMeasuredDistance: number;
    accumulationCount: number;
    frameCount: number;
    sceneOffset: SerializedOffset;
}

// ─── Main Thread → Worker ───────────────────────────────────────────────

export type MainToWorkerMessage =
    | { type: 'INIT'; canvas: OffscreenCanvas; width: number; height: number; dpr: number; isMobile: boolean; initialConfig: ShaderConfig; initialCamera?: { position: [number, number, number]; quaternion: [number, number, number, number]; fov: number } }
    | { type: 'RESIZE'; width: number; height: number; dpr: number }
    | { type: 'CONFIG'; config: Partial<ShaderConfig> }
    | { type: 'BOOT'; config: ShaderConfig; camera?: { position: [number, number, number]; quaternion: [number, number, number, number]; fov: number } }
    | { type: 'UNIFORM'; key: string; value: unknown; noReset?: boolean }
    | { type: 'RENDER_TICK'; camera: SerializedCamera; offset: SerializedOffset; delta: number; timestamp: number; renderState: Partial<EngineRenderState>; syncOffset?: boolean }
    | { type: 'RESET_ACCUM' }
    | { type: 'OFFSET_SET'; offset: SerializedOffset; noReset?: boolean }
    | { type: 'OFFSET_SHIFT'; x: number; y: number; z: number }
    | { type: 'SET_SAMPLE_CAP'; n: number }
    | { type: 'PAUSE'; paused: boolean }
    | { type: 'SET_DIRTY' }
    | { type: 'MARK_INTERACTION' }
    | { type: 'SNAP_CAMERA' }
    | { type: 'CAPTURE_SNAPSHOT'; id: string }
    | { type: 'TEXTURE'; textureType: 'color' | 'env'; bitmap: ImageBitmap | null }
    | { type: 'TEXTURE_HDR'; textureType: 'color' | 'env'; buffer: ArrayBuffer }
    | { type: 'PICK_WORLD_POSITION'; id: string; x: number; y: number }
    | { type: 'FOCUS_PICK_START'; id: string; x: number; y: number }
    | { type: 'FOCUS_PICK_SAMPLE'; id: string; x: number; y: number }
    | { type: 'FOCUS_PICK_END' }
    | { type: 'HISTOGRAM_READBACK'; id: string; source: 'geometry' | 'color' }
    | { type: 'GET_GPU_INFO' }
    // ─── Video Export ───
    | { type: 'EXPORT_START'; config: VideoExportConfig; stream: WritableStream | null }
    | { type: 'EXPORT_RENDER_FRAME'; frameIndex: number; time: number;
        camera: SerializedCamera; offset: SerializedOffset;
        renderState: Partial<EngineRenderState>;
        modulations: Record<string, number>;
      }
    | { type: 'EXPORT_CANCEL' }
    | { type: 'EXPORT_FINISH' }
    // ─── Bucket Render ───
    | { type: 'BUCKET_START'; exportImage: boolean; config: BucketRenderConfig;
        exportData?: { preset: string; name: string; version: number } }
    | { type: 'BUCKET_STOP' }
    // ─── Dynamic Formula Registration ───
    | { type: 'REGISTER_FORMULA'; id: string; shader: { function: string; loopBody: string; loopInit?: string; getDist?: string; preamble?: string } }
    // ─── Shader Debug ───
    | { type: 'GET_SHADER_SOURCE'; id: string; variant: 'compiled' | 'translated' };

// ─── Worker → Main Thread ───────────────────────────────────────────────

export type WorkerToMainMessage =
    | { type: 'READY' }
    | { type: 'FRAME_READY'; bitmap: ImageBitmap | null; state: WorkerShadowState }
    | { type: 'COMPILING'; status: boolean | string }
    | { type: 'COMPILE_TIME'; duration: number }
    | { type: 'SHADER_CODE'; code: string }
    | { type: 'SNAPSHOT_RESULT'; id: string; blob: Blob }
    | { type: 'BOOTED'; gpuInfo?: string }
    | { type: 'PICK_RESULT'; id: string; position: [number, number, number] | null }
    | { type: 'FOCUS_RESULT'; id: string; distance: number }
    | { type: 'HISTOGRAM_RESULT'; id: string; data: Float32Array }
    | { type: 'GPU_INFO'; info: string }
    | { type: 'ERROR'; message: string }
    // ─── Video Export ───
    | { type: 'EXPORT_READY' }
    | { type: 'EXPORT_FRAME_DONE'; frameIndex: number; progress: number; measuredDistance: number }
    | { type: 'EXPORT_COMPLETE'; blob: ArrayBuffer | null }
    | { type: 'EXPORT_ERROR'; message: string }
    // ─── Bucket Render ───
    | { type: 'BUCKET_STATUS'; isRendering: boolean; progress: number; totalBuckets?: number; currentBucket?: number }
    | { type: 'BUCKET_IMAGE'; pixels: Uint8ClampedArray; width: number; height: number;
        presetJson: string; filename: string }
    // ─── Shader Debug ───
    | { type: 'SHADER_SOURCE_RESULT'; id: string; code: string | null };
