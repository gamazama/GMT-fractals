/** Video export configuration — shared between WorkerProxy, WorkerProtocol, and WorkerExporter. */
export interface VideoExportConfig {
    width: number;
    height: number;
    fps: number;
    bitrate: number;
    samples: number;
    startFrame: number;
    endFrame: number;
    frameStep: number;
    formatIndex: number;
    internalScale?: number;
}
