/**
 * Shared types for the fluid-toy RenderDialog module.
 *
 * Mirrors the deps-bundle shape engine-gmt's RenderPopup uses, slimmed
 * to the v1 surface area: video-only, single pass, no internal-scale
 * SSAA, no focus-lock.
 */

import type { MutableRefObject } from 'react';
import type { FluidEngine } from '../../fluid/FluidEngine';

export interface RenderFormConfig {
    width:          number;
    height:         number;
    formatIndex:    number;
    /** TSAA samples to converge per output frame. */
    samplesPerFrame: number;
    /** Target Mbps. Multiplied internally by VIDEO_CONFIG. */
    bitrate:        number;
    startFrame:     number;
    endFrame:       number;
    frameStep:      number;
    fps:            number;
}

export interface RenderFlags {
    cancelledRef:   MutableRefObject<boolean>;
    finishEarlyRef: MutableRefObject<boolean>;
    stoppingRef:    MutableRefObject<boolean>;
    startTimeRef:   MutableRefObject<number>;
}

export interface RenderRunStatus {
    setProgress:      (n: number) => void;
    setElapsedTime:   (n: number) => void;
    setEtaRange:      (r: { min: number; max: number }) => void;
    setLastFrameTime: (n: number) => void;
    setStatusText:    (s: string) => void;
    setIsRendering:   (b: boolean) => void;
    setIsStopping:    (b: boolean) => void;
}

export interface RenderRunDeps {
    cfg:        RenderFormConfig;
    flags:      RenderFlags;
    status:     RenderRunStatus;
    isDiskMode: boolean;
    /** Returns the live FluidEngine instance. The dialog mounts in the
     *  React tree so the ref is always populated by the time Start fires. */
    getEngine:  () => FluidEngine | null;
    /** Returns the canvas — separated from the engine so the runner can
     *  encode without reaching into engine internals. Same DOM node the
     *  engine renders to. */
    getCanvas:  () => HTMLCanvasElement | null;
}
