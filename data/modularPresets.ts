
import { PipelineNode } from '../types';

export const MODULAR_PRESETS: { name: string, nodes: PipelineNode[] }[] = [
    {
        name: "Empty Scene",
        nodes: []
    },
    {
        name: "Mandelbulb (Standard)",
        nodes: [
            { id: 'mod-1', type: 'Mod', enabled: true, params: { x: 0, y: 0, z: 0 } },
            { id: 'rot-1', type: 'Rotate', enabled: true, params: { x: 0, y: 0, z: 0 } },
            { id: 'mb-1', type: 'Mandelbulb', enabled: true, params: { power: 8.0 } },
            { id: 'add-c', type: 'AddConstant', enabled: true, params: { scale: 1.0 } }
        ]
    },
    {
        name: "Amazing Box (Classic)",
        nodes: [
            { id: 'box-1', type: 'BoxFold', enabled: true, params: { limit: 1.0 } },
            { id: 'sph-1', type: 'SphereFold', enabled: true, params: { minR: 0.5, fixedR: 1.0 } },
            { id: 'scl-1', type: 'Scale', enabled: true, params: { scale: 2.0 } },
            { id: 'add-c', type: 'AddConstant', enabled: true, params: { scale: 1.0 } }
        ]
    },
    {
        name: "MixPinski (IFS)",
        nodes: [
            { id: 'mix-1', type: 'SierpinskiFold', enabled: true, params: {} },
            { id: 'mix-2', type: 'Rotate', enabled: true, params: { x: 0, y: 0, z: 0 }, bindings: { z: 'ParamC' } },
            { id: 'mix-3', type: 'IFSScale', enabled: true, params: { scale: 2.0, offset: 1.0 } }
        ]
    },
    {
        name: "Menger Sponge",
        nodes: [
            { id: 'meng-1', type: 'Abs', enabled: true, params: {} },
            { id: 'meng-2', type: 'MengerFold', enabled: true, params: {} },
            { id: 'meng-3', type: 'Rotate', enabled: true, params: { x: 0, y: 0, z: 0 } },
            { id: 'meng-4', type: 'IFSScale', enabled: true, params: { scale: 3.0, offset: 1.0 } }
        ]
    },
    {
        name: "Kleinian",
        nodes: [
            { id: 'klein-1', type: 'BoxFold', enabled: true, params: { limit: 1.0 } },
            { id: 'klein-2', type: 'SphereFold', enabled: true, params: { minR: 0.5, fixedR: 1.0 } },
            { id: 'klein-3', type: 'IFSScale', enabled: true, params: { scale: 1.8, offset: 0.0 } },
            { id: 'klein-4', type: 'Translate', enabled: true, params: { x: 1, y: 0, z: 0 } }
        ]
    },
    {
        name: "Marble Marcher",
        nodes: [
            { id: 'marb-1', type: 'Abs', enabled: true, params: {} },
            { id: 'marb-2', type: 'Rotate', enabled: true, params: { x: 0, y: 0, z: 0 }, bindings: { z: 'ParamC' } },
            { id: 'marb-3', type: 'MengerFold', enabled: true, params: {} },
            { id: 'marb-4', type: 'Rotate', enabled: true, params: { x: 0, y: 0, z: 0 }, bindings: { x: 'ParamD' } },
            { id: 'marb-5', type: 'IFSScale', enabled: true, params: { scale: 2.0, offset: 2.0 } }
        ]
    }
];
