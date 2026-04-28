/**
 * Shared types for the RenderPopup module.
 *
 * `ExportFormConfig` — every form value the export pipelines read.
 * `ExportFlags`      — refs the user uses to cancel / pause / finish-early.
 * `ExportRunStatus`  — setters the pipelines push live progress into.
 * `PopupSizing`      — window-size adjusters used to expand the popup
 *                      while a render is in flight.
 *
 * The runner functions in `exportRunner.ts` accept a deps bundle of
 * these so the parent component just hands them its useState/useRef
 * setters.
 */

import type { MutableRefObject } from 'react';

export interface ExportFormConfig {
    vidRes:        { w: number; h: number };
    formatIndex:   number;
    vidSamples:    number;
    vidBitrate:    number;
    startFrame:    number;
    endFrame:      number;
    frameStep:     number;
    internalScale: number;
    depthMin:      number;
    depthMax:      number;
    exportBeauty:  boolean;
    exportAlpha:   boolean;
    exportDepth:   boolean;
    fps:           number;
}

export interface ExportFlags {
    cancelledRef:    MutableRefObject<boolean>;
    finishEarlyRef:  MutableRefObject<boolean>;
    stoppingRef:     MutableRefObject<boolean>;
    startTimeRef:    MutableRefObject<number>;
}

export interface ExportRunStatus {
    setProgress:      (n: number) => void;
    setElapsedTime:   (n: number) => void;
    setEtaRange:      (r: { min: number; max: number }) => void;
    setLastFrameTime: (n: number) => void;
    setStatusText:    (s: string) => void;
    setIsRendering:   (b: boolean) => void;
    setIsStopping:    (b: boolean) => void;
}

export interface PopupSizing {
    setWinSize:     (s: { width: number; height: number }) => void;
    BASE_WIDTH:     number;
    BASE_HEIGHT:    number;
    EXPANDED_WIDTH: number;
}

export interface ExportRunDeps {
    cfg:        ExportFormConfig;
    flags:      ExportFlags;
    status:     ExportRunStatus;
    sizing:     PopupSizing;
    isDiskMode: boolean;
}
