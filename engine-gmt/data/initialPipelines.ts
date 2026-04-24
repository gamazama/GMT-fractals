
import { PipelineNode } from '../types';

export const TUTORIAL_PIPELINE: PipelineNode[] = [
    { 
        id: 'note-intro', 
        type: 'Note', 
        enabled: true, 
        params: {}, 
        text: "Welcome to the Modular Builder!\n\nThis pipeline builds the classic Mandelbulb fractal.\nThe Mandelbulb is created by iterating a 3D power function (z = z^8 + c)." 
    },
    { 
        id: 'note-rot', 
        type: 'Note', 
        enabled: true, 
        params: {}, 
        text: "STEP 1: Rotation\nWe can rotate the coordinate space *before* applying the fractal formula. This spins the entire object." 
    },
    { 
        id: 'rot-1', 
        type: 'Rotate', 
        enabled: true, 
        params: { x: 0, y: 0, z: 0 },
        bindings: { z: 'ParamC' } 
    },
    { 
        id: 'note-bulb', 
        type: 'Note', 
        enabled: true, 
        params: {}, 
        text: "STEP 2: The Power Function\nThis node applies the spherical exponentiation. Standard Mandelbulb is Power 8." 
    },
    { 
        id: 'bulb-1', 
        type: 'Mandelbulb', 
        enabled: true, 
        params: { power: 8.0 } 
    },
    {
        id: 'add-c',
        type: 'AddConstant',
        enabled: true,
        params: { scale: 1.0 }
    }
];

export const MANDELBOX_PIPELINE: PipelineNode[] = [
    { id: '1', type: 'BoxFold', enabled: true, params: { limit: 1.0 } },
    { id: '2', type: 'SphereFold', enabled: true, params: { minR: 0.5, fixedR: 1.0 } },
    { id: '3', type: 'Scale', enabled: true, params: { scale: 2.0 } },
    { id: '4', type: 'AddConstant', enabled: true, params: { scale: 1.0 } }
];

export const JULIA_REPEATER_PIPELINE: PipelineNode[] = [
    { 
        id: 'note-1', 
        type: 'Note', 
        enabled: true, 
        params: {}, 
        text: "Infinite Repetition\nThe 'Mod' node tiles space. Here we repeat every 4.0 units on X and Y to create a forest of fractals." 
    },
    {
        id: 'mod-1',
        type: 'Mod',
        enabled: true,
        params: { x: 4.0, y: 4.0, z: 0.0 }
    },
    { 
        id: 'note-2', 
        type: 'Note', 
        enabled: true, 
        params: {}, 
        text: "Dynamic Rotation\nThis rotation is bound to 'ParamC' (Slider below). Try dragging it!" 
    },
    {
        id: 'rot-1',
        type: 'Rotate',
        enabled: true,
        params: { x: 0, y: 0, z: 0 },
        bindings: { z: 'ParamC' }
    },
    {
        id: 'bulb-1',
        type: 'Mandelbulb',
        enabled: true,
        params: { power: 8.0 }
    },
    {
        id: 'add-c',
        type: 'AddConstant',
        enabled: true,
        params: { scale: 1.0 }
    }
];
