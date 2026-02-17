
export type FormulaType = 'Mandelbulb' | 'AmazingBox' | 'MengerSponge' | 'MixPinski' | 'AmazingSurf' | 'Kleinian' | 'BoxBulb' | 'MengerAdvanced' | 'Quaternion' | 'Dodecahedron' | 'Mandelbar3D' | 'Bristorbrot' | 'MakinBrot' | 'Tetrabrot' | 'Modular' | 'PseudoKleinian' | 'Phoenix' | 'Buffalo' | 'ArisBrot' | 'MandelTerrain' | 'MarbleMarcher' | 'JuliaMorph' | 'AmazingSurface' | 'Mandelorus' | 'Appell' | 'Borromean' | 'MandelMap' | 'MandelbrotCK';
export type CameraMode = 'Orbit' | 'Fly';

export interface PreciseVector3 {
    x: number;
    y: number;
    z: number;
    xL: number;
    yL: number;
    zL: number;
}

export interface CameraState {
    position: { x: number, y: number, z: number };
    rotation: { x: number, y: number, z: number, w: number };
    sceneOffset?: PreciseVector3;
    targetDistance?: number; // The unifying link between Orbit and Fly
}