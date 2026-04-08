
declare const __APP_VERSION__: string;

export type FormulaType = 'Mandelbulb' | 'AmazingBox' | 'MengerSponge' | 'MixPinski' | 'AmazingSurf' | 'Kleinian' | 'BoxBulb' | 'MengerAdvanced' | 'Quaternion' | 'Dodecahedron' | 'Mandelbar3D' | 'Bristorbrot' | 'MakinBrot' | 'Tetrabrot' | 'Modular' | 'PseudoKleinian' | 'Phoenix' | 'Buffalo'| 'MandelTerrain' | 'MarbleMarcher' | 'JuliaMorph' | 'AmazingSurface' | 'Mandelorus' | 'Appell' | 'Borromean' | 'MandelMap' | 'MandelBolic' | 'SierpinskiTetrahedron' | 'KaliBox' | 'Claude' | 'Octahedron' | 'Icosahedron' | 'RhombicDodecahedron' | 'Coxeter' | 'RhombicTriacontahedron' | 'Apollonian' | 'Cuboctahedron' | 'TruncatedIcosahedron' | 'GreatStellatedDodecahedron' | 'PseudoKleinianMod4' | 'PseudoKleinian06';
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
    /** Local camera position — always (0,0,0) in canonical state; world position lives in sceneOffset */
    position: { x: number, y: number, z: number };
    rotation: { x: number, y: number, z: number, w: number };
    sceneOffset?: PreciseVector3;
    /** Surface distance from physics probe. Mode-agnostic — NOT orbit radius. */
    targetDistance?: number;
}