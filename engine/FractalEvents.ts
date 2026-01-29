
import { ShaderConfig } from './ShaderFactory';
import { GradientStop, PreciseVector3, CameraState } from '../types';
import * as THREE from 'three';

export const FRACTAL_EVENTS = {
    UNIFORM: 'uniform',
    CONFIG: 'config',
    GRADIENT: 'gradient',
    RESET_ACCUM: 'reset_accum',
    OFFSET_SHIFT: 'offset_shift',
    OFFSET_SET: 'offset_set',
    CAMERA_ABSORB: 'camera_absorb',
    CAMERA_SNAP: 'camera_snap',
    CAMERA_TELEPORT: 'camera_teleport',
    SHADER_CODE: 'shader_code',
    IS_COMPILING: 'is_compiling',
    COMPILE_TIME: 'compile_time',
    BUCKET_STATUS: 'bucket_status', // New event for BucketRenderer feedback
    TRACK_FOCUS: 'track_focus'
} as const;

type EventMap = {
    [FRACTAL_EVENTS.UNIFORM]: { key: string; value: any; noReset?: boolean };
    [FRACTAL_EVENTS.CONFIG]: Partial<ShaderConfig>;
    [FRACTAL_EVENTS.GRADIENT]: { stops: GradientStop[]; layer: 1 | 2 };
    [FRACTAL_EVENTS.RESET_ACCUM]: void;
    [FRACTAL_EVENTS.OFFSET_SHIFT]: { x: number; y: number; z: number };
    [FRACTAL_EVENTS.OFFSET_SET]: PreciseVector3;
    [FRACTAL_EVENTS.CAMERA_ABSORB]: { camera: THREE.Camera };
    [FRACTAL_EVENTS.CAMERA_SNAP]: void;
    [FRACTAL_EVENTS.CAMERA_TELEPORT]: CameraState;
    [FRACTAL_EVENTS.SHADER_CODE]: string;
    [FRACTAL_EVENTS.IS_COMPILING]: boolean | string; 
    [FRACTAL_EVENTS.COMPILE_TIME]: number;
    [FRACTAL_EVENTS.BUCKET_STATUS]: { isRendering: boolean; progress: number };
    [FRACTAL_EVENTS.TRACK_FOCUS]: string;
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