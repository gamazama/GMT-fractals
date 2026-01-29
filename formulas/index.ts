
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
import { AmazingSurf } from './AmazingSurf';
import { AmazingSurface } from './AmazingSurface';
import { BoxBulb } from './BoxBulb';
import { MengerAdvanced } from './MengerAdvanced';
import { Bristorbrot } from './Bristorbrot';
import { MakinBrot } from './MakinBrot';
import { Tetrabrot } from './Tetrabrot';
import { Buffalo } from './Buffalo';
import { Modular } from './Modular';
import { ArisBrot } from './ArisBrot';
import { MandelTerrain } from './MandelTerrain';
import { MarbleMarcher } from './MarbleMarcher';
import { JuliaMorph } from './JuliaMorph';

// Organized list determines UI order
const formulas = [
    // --- Featured / Cool ---
    Mandelbulb,
    AmazingBox,
    AmazingSurface,
    MengerSponge,
    MarbleMarcher,
    MixPinski,
    Kleinian,
    AmazingSurf,
    MandelTerrain,

    // --- Others ---
    Mandelbar3D,
    Quaternion,
    PseudoKleinian,
    Dodecahedron,
    
    // --- Hybrids & Variants ---
    JuliaMorph,
    ArisBrot, 
    Phoenix,
    Buffalo,
    BoxBulb,
    MengerAdvanced,
    Bristorbrot,
    MakinBrot,
    Tetrabrot,

    // --- System ---
    Modular
];

// Batch register
formulas.forEach(def => registry.register(def));

// Register Legacy Aliases for backward compatibility
registry.registerAlias('UberMenger', 'MengerAdvanced');
registry.registerAlias('FoldingBrot', 'BoxBulb');

export const PREDEFINED_CATEGORIES = [
    { 
        name: "Featured Fractals", 
        match: [
            Mandelbulb.id, 
            AmazingBox.id, 
            AmazingSurface.id,
            MengerSponge.id, 
            MixPinski.id, 
            Kleinian.id, 
            AmazingSurf.id, 
            MandelTerrain.id
        ] 
    },
    { 
        name: "Geometric & Folding", 
        match: [
            MarbleMarcher.id, 
            PseudoKleinian.id, 
            Dodecahedron.id, 
            MengerAdvanced.id, 
            BoxBulb.id
        ] 
    },
    { 
        name: "Hybrids & Experiments", 
        match: [
            JuliaMorph.id, 
            ArisBrot.id, 
            Phoenix.id, 
            Buffalo.id, 
            Bristorbrot.id, 
            MakinBrot.id, 
            Tetrabrot.id, 
            Mandelbar3D.id, 
            Quaternion.id
        ] 
    },
    { 
        name: "Systems", 
        match: [Modular.id] 
    }
] as const;

export const Formulas = registry;
