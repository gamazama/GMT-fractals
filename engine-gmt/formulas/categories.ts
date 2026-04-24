/**
 * Formula categories for the gallery UI.
 * Uses string literal IDs to avoid importing all formula definitions —
 * keeps this module out of the formula dependency graph for bundle splitting.
 */

export const PREDEFINED_CATEGORIES = [
    {
        name: "Featured Fractals",
        match: [
            'Mandelbulb',
            'Mandelorus',
            'MixPinski',
            'AmazingBox',
            'AmazingSurface',
            'MengerSponge',
            'Kleinian',
            'AmazingSurf',
            'MandelTerrain',
            'Claude'
        ]
    },
    {
        name: "Platonic & Archimedean",
        match: [
            'SierpinskiTetrahedron',
            'MengerSponge',
            'Octahedron',
            'Dodecahedron',
            'Icosahedron',
            'Cuboctahedron',
            'TruncatedIcosahedron',
        ]
    },
    {
        name: "Catalan & Coxeter",
        match: [
            'RhombicDodecahedron',
            'Coxeter',
            'RhombicTriacontahedron',
        ]
    },
    {
        name: "Stellations & Special",
        match: [
            'GreatStellatedDodecahedron',
            'Apollonian',
        ]
    },
    {
        name: "IFS & Folding",
        match: [
            'MixPinski',
            'MarbleMarcher',
            'KaliBox',
            'BoxBulb',
            'MengerAdvanced',
            'Kleinian',
            'KleinianMobius',
            'KleinianJos',
            'PseudoKleinian',
            'PseudoKleinian06',
            'PseudoKleinianMod4',
            'AmazingBox',
            'AmazingSurf',
            'AmazingSurface',
        ]
    },
    {
        name: "Power Fractals",
        match: [
            'Mandelbulb',
            'Mandelbar3D',
            'Quaternion',
            'Mandelorus',
            'Phoenix',
            'Buffalo',
            'Bristorbrot',
            'MakinBrot',
            'Tetrabrot',
        ]
    },
    {
        name: "Hybrids & Experiments",
        match: [
            'MandelMap',
            'Borromean',
            'Appell',
            'JuliaMorph',
            'MandelTerrain',
            'MandelBolic',
            'Claude'
        ]
    },
    {
        name: "Systems",
        match: ['Modular']
    }
] as const;
