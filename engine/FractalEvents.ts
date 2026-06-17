
import { ShaderConfig } from './ShaderFactory';
import { PreciseVector3, CameraState } from '../types';
import * as THREE from 'three';

export const FRACTAL_EVENTS = {
    UNIFORM: 'uniform',
    CONFIG: 'config',
    CONFIG_DONE: 'config_done',
    RESET_ACCUM: 'reset_accum',
    OFFSET_SHIFT: 'offset_shift',
    OFFSET_SET: 'offset_set',
    OFFSET_SILENT: 'offset_silent',
    CAMERA_ABSORB: 'camera_absorb',
    CAMERA_SNAP: 'camera_snap',
    CAMERA_TELEPORT: 'camera_teleport',
    CAMERA_TRANSITION: 'camera_transition',
    SHADER_CODE: 'shader_code',
    IS_COMPILING: 'is_compiling',
    COMPILE_TIME: 'compile_time',
    COMPILE_ESTIMATE: 'compile_estimate',
    BUCKET_STATUS: 'bucket_status',
    BUCKET_IMAGE: 'bucket_image',
    BUCKET_RENDER_COMPLETE: 'bucket_render_complete',
    TRACK_FOCUS: 'track_focus',
    TEXTURE: 'texture',
    ENGINE_QUEUE: 'engine_queue',
    REGISTER_FORMULA: 'register_formula',
    RESET_HINTS: 'reset_hints',
    CAMERA_SLOT_SAVED: 'camera_slot_saved',
    WORKER_BOOTED: 'worker_booted',
    WORKER_BOOT_FAILED: 'worker_boot_failed',
    COMPILE_FAILED: 'compile_failed',
    /** The render worker's WebGL context was lost (GPU watchdog / driver
     *  reset, typically a too-heavy frame on a weak mobile GPU). Rendering
     *  has stopped; the main thread surfaces a recovery prompt. */
    RENDER_CONTEXT_LOST: 'render_context_lost'
} as const;

type EventMap = {
    [FRACTAL_EVENTS.UNIFORM]: { key: string; value: any; noReset?: boolean };
    [FRACTAL_EVENTS.CONFIG]: Partial<ShaderConfig>;
    [FRACTAL_EVENTS.CONFIG_DONE]: void;
    [FRACTAL_EVENTS.RESET_ACCUM]: void;
    [FRACTAL_EVENTS.OFFSET_SHIFT]: { x: number; y: number; z: number };
    [FRACTAL_EVENTS.OFFSET_SET]: PreciseVector3;
    [FRACTAL_EVENTS.OFFSET_SILENT]: PreciseVector3;
    [FRACTAL_EVENTS.CAMERA_ABSORB]: { camera: THREE.Camera };
    [FRACTAL_EVENTS.CAMERA_SNAP]: void;
    [FRACTAL_EVENTS.CAMERA_TELEPORT]: CameraState;
    [FRACTAL_EVENTS.CAMERA_TRANSITION]: CameraState;
    [FRACTAL_EVENTS.SHADER_CODE]: string;
    [FRACTAL_EVENTS.IS_COMPILING]: boolean | string; 
    [FRACTAL_EVENTS.COMPILE_TIME]: number;
    [FRACTAL_EVENTS.COMPILE_ESTIMATE]: number;
    [FRACTAL_EVENTS.BUCKET_STATUS]: { isRendering: boolean; progress: number; totalBuckets?: number; currentBucket?: number };
    [FRACTAL_EVENTS.BUCKET_IMAGE]: { pixels: Uint8ClampedArray; width: number; height: number; presetJson: string; filename: string; multiTile?: boolean };
    /** Fires on the main thread after a bucket render has been encoded to
     *  a PNG blob and downloaded. Gallery plugin listens to offer a
     *  "submit this hi-res render?" prompt. The blob carries the embedded
     *  GMF metadata exactly as the saved file. `multiTile` is true when this
     *  PNG is one tile of a tiled (rows×cols > 1) render — gallery submit is
     *  suppressed for those (each tile alone, and the un-stitched set, aren't
     *  a submittable image; the server also caps uploads at 5 MB). */
    [FRACTAL_EVENTS.BUCKET_RENDER_COMPLETE]: { blob: Blob; filename: string; width: number; height: number; multiTile?: boolean };
    [FRACTAL_EVENTS.TRACK_FOCUS]: string;
    [FRACTAL_EVENTS.TEXTURE]: { textureType: 'color' | 'env'; dataUrl: string | null };
    [FRACTAL_EVENTS.ENGINE_QUEUE]: { featureId: string; param: string; value: any };
    [FRACTAL_EVENTS.REGISTER_FORMULA]: { id: string; shader: { function: string; loopBody: string; loopInit?: string; getDist?: string; preamble?: string; selfContainedSDE?: boolean } };
    [FRACTAL_EVENTS.RESET_HINTS]: void;
    [FRACTAL_EVENTS.CAMERA_SLOT_SAVED]: { slot: number; label: string };
    [FRACTAL_EVENTS.WORKER_BOOTED]: void;
    [FRACTAL_EVENTS.WORKER_BOOT_FAILED]: { reason: string };
    [FRACTAL_EVENTS.COMPILE_FAILED]: { reason: string };
    [FRACTAL_EVENTS.RENDER_CONTEXT_LOST]: { reason: string };
};

class FractalEventBus {
    private listeners: { [K in keyof EventMap]?: Array<(data: EventMap[K]) => void> } = {};

    on<K extends keyof EventMap>(event: K, callback: (data: EventMap[K]) => void) {
        if (!this.listeners[event]) {
            this.listeners[event] = [] as any;
        }
        this.listeners[event]!.push(callback);
        return () => this.off(event, callback);
    }

    off<K extends keyof EventMap>(event: K, callback: (data: EventMap[K]) => void) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event]!.filter(cb => cb !== callback) as any;
    }

    emit<K extends keyof EventMap>(event: K, data: EventMap[K]) {
        if (this.listeners[event]) {
            this.listeners[event]!.forEach(cb => cb(data));
        }
    }
}

export const FractalEvents = new FractalEventBus();