// Module-level handle so that SceneIO (installed at boot) can find
// the demo's canvas, which doesn't exist until <DemoOverlay /> mounts.
// `installSceneIO({ getCanvas: () => getDemoCanvas() })` re-evaluates
// on every snapshot, so it correctly returns null pre-mount and the
// live canvas afterwards.

let _canvas: HTMLCanvasElement | null = null;

export const setDemoCanvas = (canvas: HTMLCanvasElement | null): void => {
    _canvas = canvas;
};

export const getDemoCanvas = (): HTMLCanvasElement | null => _canvas;
