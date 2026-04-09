
import { registry } from '../engine/FractalRegistry';
import { Mandelbulb } from './Mandelbulb';
import { Mandelbar3D } from './Mandelbar3D';
import { Quaternion } from './Quaternion';
import { AmazingBox } from './AmazingBox';
import { MengerSponge } from './MengerSponge';
import { Kleinian } from './Kleinian';
import { PseudoKleinian } from './PseudoKleinian';
import { Dodecahedron } from './Dodecahedron';
import { Phoenix } from './Phoenix';
import { MixPinski } from './MixPinski';
import { SierpinskiTetrahedron } from './SierpinskiTetrahedron';
import { AmazingSurf } from './AmazingSurf';
import { AmazingSurface } from './AmazingSurface';
import { BoxBulb } from './BoxBulb';
import { MengerAdvanced } from './MengerAdvanced';
import { Bristorbrot } from './Bristorbrot';
import { MakinBrot } from './MakinBrot';
import { Tetrabrot } from './Tetrabrot';
import { Buffalo } from './Buffalo';
import { Modular } from './Modular';

import { MandelTerrain } from './MandelTerrain';
import { MarbleMarcher } from './MarbleMarcher';
import { JuliaMorph } from './JuliaMorph';
import { Mandelorus } from './Mandelorus'; // Renamed
import { Appell } from './Appell';
import { Borromean } from './Borromean';
import { MandelMap } from './MandelMap';
import { MandelBolic } from './MandelBolic';
import { KaliBox } from './KaliBox';
import { Claude } from './Claude';
import { Octahedron } from './Octahedron';
import { Icosahedron } from './Icosahedron';
import { RhombicDodecahedron } from './RhombicDodecahedron';
import { Coxeter } from './Coxeter';
import { RhombicTriacontahedron } from './RhombicTriacontahedron';
import { Apollonian } from './Apollonian';
import { Cuboctahedron } from './Cuboctahedron';
import { TruncatedIcosahedron } from './TruncatedIcosahedron';
import { GreatStellatedDodecahedron } from './GreatStellatedDodecahedron';
import { PseudoKleinian06 } from './PseudoKleinianAdv';
import { PseudoKleinianMod4 } from './PseudoKleinianMod4';


// Organized list determines UI order on LOADING SCREEN
const formulas = [
    // --- Featured / Cool ---
    Mandelbulb,
    Mandelorus, // Formerly HyperTorus
    MixPinski,
    SierpinskiTetrahedron,
    MandelMap,
    Borromean,
    Appell, 
    AmazingBox,
    AmazingSurface,
    MengerSponge,
    MarbleMarcher,
    KaliBox,
    Kleinian,
    AmazingSurf,
    MandelTerrain,
    Claude,

    // --- Others ---
    Mandelbar3D,
    Quaternion,
    PseudoKleinian,
    PseudoKleinian06,
    PseudoKleinianMod4,
    Dodecahedron,
    Octahedron,
    Icosahedron,
    Cuboctahedron,
    TruncatedIcosahedron,
    RhombicDodecahedron,
    Coxeter,
    RhombicTriacontahedron,
    GreatStellatedDodecahedron,
    Apollonian,
    
    // --- Hybrids & Variants ---
    JuliaMorph,
    Phoenix,
    Buffalo,
    BoxBulb,
    MengerAdvanced,
    Bristorbrot,
    MakinBrot,
    Tetrabrot,
    MandelBolic,

    // --- System ---
    Modular
];

// Batch register
formulas.forEach(def => registry.register(def));

// Register Legacy Aliases for backward compatibility
registry.registerAlias('UberMenger', 'MengerAdvanced');
registry.registerAlias('FoldingBrot', 'BoxBulb');
registry.registerAlias('HyperTorus', 'Mandelorus'); // Legacy Alias
registry.registerAlias('HyperbolicMandelbrot', 'MandelBolic'); // Legacy Alias
registry.registerAlias('RhombicIcosahedron', 'Coxeter'); // Legacy Alias

// Categories are in formulas/categories.ts (string literal IDs, no formula imports)
// to break the import chain for bundle splitting. Import from there directly.

export const Formulas = registry;
