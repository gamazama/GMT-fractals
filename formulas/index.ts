
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
    Dodecahedron,
    
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

export const PREDEFINED_CATEGORIES = [
    { 
        name: "Featured Fractals", 
        match: [
            Mandelbulb.id,
            Mandelorus.id,
            MixPinski.id,
            AmazingBox.id,
            AmazingSurface.id,
            MengerSponge.id,
            Kleinian.id,
            AmazingSurf.id,
            MandelTerrain.id,
            Claude.id
        ] 
    },
    { 
        name: "Geometric & Folding", 
        match: [
            MarbleMarcher.id,
            KaliBox.id,
            SierpinskiTetrahedron.id,
            PseudoKleinian.id,
            Dodecahedron.id,
            MengerAdvanced.id,
            BoxBulb.id
        ] 
    },
    { 
        name: "Hybrids & Experiments", 
        match: [
            MandelMap.id,
            Borromean.id,
            Appell.id,
            JuliaMorph.id, 
            Phoenix.id,
            Buffalo.id, 
            Bristorbrot.id, 
            MakinBrot.id, 
            Tetrabrot.id, 
            Mandelbar3D.id, 
            Quaternion.id,
            MandelBolic.id
        ] 
    },
    { 
        name: "Systems", 
        match: [Modular.id] 
    }
] as const;

export const Formulas = registry;
