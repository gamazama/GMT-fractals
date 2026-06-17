/**
 * FBX scene-graph assembly for the camera-rig export — the PURE half of the
 * FBX exporter (no stores, no Three, no DOM). Takes an already-sampled,
 * already-FBX-space {@link FbxSample} and emits the binary FBX bytes via
 * fbxBinary.ts. Kept separate from fbxExport.ts (which does the store-driven
 * timeline sampling) so it can be unit-tested headlessly.
 */

import {
    serializeFbxBinary, fbxHeaderNodes, fbxGlobalSettings, node, objName,
    fbxInt, fbxLong, fbxDouble, fbxString, fbxDoubleArray, fbxFloatArray, fbxIntArray, fbxLongArray,
    type FbxProp, type FbxNode,
} from './fbxBinary';

export interface FbxFrame {
    pos:    [number, number, number];          // FBX camera Lcl Translation
    rot:    [number, number, number];          // FBX camera Lcl Rotation (deg)
    lights: Array<[number, number, number]>;   // FBX null Lcl Translation, aligned to lightMeta
}

export interface FbxSample {
    frames:    FbxFrame[];
    fovDeg:    number;          // vertical FOV, for the camera lens
    times:     number[];        // KTime per frame
    lightMeta: Array<{ name: string }>;
    fps:       number;
}

const P = (name: string, type: string, sub: string, flags: string, ...vals: FbxProp[]): FbxNode =>
    node('P', [fbxString(name), fbxString(type), fbxString(sub), fbxString(flags), ...vals]);

/** One linear-interpolation AnimationCurve (dense baked keys → linear is exact). */
const animCurve = (id: number, times: number[], values: number[]): FbxNode =>
    node('AnimationCurve', [fbxLong(id), fbxString(objName('', 'AnimCurve')), fbxString('')], [
        node('Default',  [fbxDouble(values[0] ?? 0)]),
        node('KeyVer',   [fbxInt(4009)]),
        node('KeyTime',          [fbxLongArray(times)]),
        node('KeyValueFloat',    [fbxFloatArray(values)]),
        node('KeyAttrFlags',     [fbxIntArray([0x00000004])]),   // eInterpolationLinear
        node('KeyAttrDataFloat', [fbxFloatArray([0, 0, 0, 0])]),
        node('KeyAttrRefCount',  [fbxIntArray([times.length])]),
    ]);

const curveNode = (id: number, label: string, dx: number, dy: number, dz: number): FbxNode =>
    node('AnimationCurveNode', [fbxLong(id), fbxString(objName(label, 'AnimCurveNode')), fbxString('')], [
        node('Properties70', [], [
            P('d|X', 'Number', '', 'A', fbxDouble(dx)),
            P('d|Y', 'Number', '', 'A', fbxDouble(dy)),
            P('d|Z', 'Number', '', 'A', fbxDouble(dz)),
        ]),
    ]);

const OO = (src: number, dst: number): FbxNode => node('C', [fbxString('OO'), fbxLong(src), fbxLong(dst)]);
const OP = (src: number, dst: number, prop: string): FbxNode =>
    node('C', [fbxString('OP'), fbxLong(src), fbxLong(dst), fbxString(prop)]);

const NOMINAL = 100; // start-frame camera distance from origin (kept in sync with fbxExport.ts)

export const buildFbxScene = (sample: FbxSample, projectName: string): Uint8Array => {
    const { frames, times } = sample;
    const single = frames.length <= 1;

    let nextId = 1000;
    const id = () => ++nextId;

    const objects: FbxNode[] = [];
    const connections: FbxNode[] = [];
    const animCurves: FbxNode[] = [];
    const curveNodes: FbxNode[] = [];

    const stopKTime = times[times.length - 1] ?? 0;
    const stackId = id(), layerId = id();

    // Attach an animated 3-channel property (T or R) to a model.
    const attachAnim = (
        modelId: number, label: string, prop: 'Lcl Translation' | 'Lcl Rotation',
        chans: [number[], number[], number[]],
    ) => {
        const cnId = id();
        curveNodes.push(curveNode(cnId, label, chans[0][0] ?? 0, chans[1][0] ?? 0, chans[2][0] ?? 0));
        connections.push(OO(cnId, layerId), OP(cnId, modelId, prop));
        (['d|X', 'd|Y', 'd|Z'] as const).forEach((ch, k) => {
            const cId = id();
            animCurves.push(animCurve(cId, times, chans[k]));
            connections.push(OP(cId, cnId, ch));
        });
    };

    // ── Camera ──
    const camId = id(), camAttrId = id();
    const f0: FbxFrame = frames[0] ?? { pos: [0, 0, NOMINAL], rot: [0, 90, 0], lights: [] };
    objects.push(node('Model', [fbxLong(camId), fbxString(objName(`${projectName} Camera`, 'Model')), fbxString('Camera')], [
        node('Version', [fbxInt(232)]),
        node('Properties70', [], [
            P('DefaultAttributeIndex', 'int', 'Integer', '', fbxInt(0)),
            P('Lcl Translation', 'Lcl Translation', '', 'A', fbxDouble(f0.pos[0]), fbxDouble(f0.pos[1]), fbxDouble(f0.pos[2])),
            P('Lcl Rotation',    'Lcl Rotation',    '', 'A', fbxDouble(f0.rot[0]), fbxDouble(f0.rot[1]), fbxDouble(f0.rot[2])),
        ]),
    ]));
    objects.push(node('NodeAttribute', [fbxLong(camAttrId), fbxString(objName('', 'NodeAttribute')), fbxString('Camera')], [
        node('Properties70', [], [
            P('ApertureMode', 'enum', '', '', fbxInt(2)),               // 2 = vertical → FieldOfView is the vertical angle
            P('FieldOfView',  'FieldOfView', '', 'A', fbxDouble(sample.fovDeg)),
        ]),
        node('TypeFlags', [fbxString('Camera')]),
    ]));
    connections.push(OO(camId, 0), OO(camAttrId, camId));
    if (!single) {
        attachAnim(camId, 'T', 'Lcl Translation', [frames.map(f => f.pos[0]), frames.map(f => f.pos[1]), frames.map(f => f.pos[2])]);
        attachAnim(camId, 'R', 'Lcl Rotation',    [frames.map(f => f.rot[0]), frames.map(f => f.rot[1]), frames.map(f => f.rot[2])]);
    }

    // ── Positional-light nulls (a Model with no attribute imports as a null) ──
    sample.lightMeta.forEach((lm, li) => {
        const lid = id();
        const l0 = f0.lights[li] ?? [0, 0, 0];
        objects.push(node('Model', [fbxLong(lid), fbxString(objName(lm.name, 'Model')), fbxString('Null')], [
            node('Version', [fbxInt(232)]),
            node('Properties70', [], [
                P('Lcl Translation', 'Lcl Translation', '', 'A', fbxDouble(l0[0]), fbxDouble(l0[1]), fbxDouble(l0[2])),
            ]),
        ]));
        connections.push(OO(lid, 0));
        const moves = frames.some(f => {
            const p = f.lights[li]; return p && (p[0] !== l0[0] || p[1] !== l0[1] || p[2] !== l0[2]);
        });
        if (moves && !single) {
            attachAnim(lid, 'T', 'Lcl Translation',
                [frames.map(f => f.lights[li]?.[0] ?? 0), frames.map(f => f.lights[li]?.[1] ?? 0), frames.map(f => f.lights[li]?.[2] ?? 0)]);
        }
    });

    // ── Animation stack/layer (only when there are curves) ──
    const animObjects: FbxNode[] = [];
    const animated = !single && curveNodes.length > 0;
    if (animated) {
        animObjects.push(
            node('AnimationStack', [fbxLong(stackId), fbxString(objName('Take 001', 'AnimStack')), fbxString('')], [
                node('Properties70', [], [
                    P('LocalStop',     'KTime', 'Time', '', fbxLong(stopKTime)),
                    P('ReferenceStop', 'KTime', 'Time', '', fbxLong(stopKTime)),
                ]),
            ]),
            node('AnimationLayer', [fbxLong(layerId), fbxString(objName('BaseLayer', 'AnimLayer')), fbxString('')]),
            ...curveNodes, ...animCurves,
        );
        connections.push(OO(layerId, stackId));
    }

    const defs: FbxNode[] = [
        node('Version', [fbxInt(100)]),
        node('Count', [fbxInt(2 + sample.lightMeta.length + (animated ? 2 + curveNodes.length + animCurves.length : 0))]),
        node('ObjectType', [fbxString('GlobalSettings')], [node('Count', [fbxInt(1)])]),
        node('ObjectType', [fbxString('Model')],          [node('Count', [fbxInt(1 + sample.lightMeta.length)])]),
        node('ObjectType', [fbxString('NodeAttribute')],  [node('Count', [fbxInt(1)])]),
    ];
    if (animated) {
        defs.push(
            node('ObjectType', [fbxString('AnimationStack')],     [node('Count', [fbxInt(1)])]),
            node('ObjectType', [fbxString('AnimationLayer')],     [node('Count', [fbxInt(1)])]),
            node('ObjectType', [fbxString('AnimationCurveNode')], [node('Count', [fbxInt(curveNodes.length)])]),
            node('ObjectType', [fbxString('AnimationCurve')],     [node('Count', [fbxInt(animCurves.length)])]),
        );
    }

    const scene: FbxNode[] = [
        ...fbxHeaderNodes(`GMT ${projectName}`, 7400),
        fbxGlobalSettings({ unitScale: 1, timeMode: 6 }),
        node('Documents', [], [
            node('Count', [fbxInt(1)]),
            node('Document', [fbxLong(1), fbxString(objName('Scene', 'Scene')), fbxString('Scene')], [node('RootNode', [fbxLong(0)])]),
        ]),
        node('References'),
        node('Definitions', [], defs),
        node('Objects', [], [...objects, ...animObjects]),
        node('Connections', [], connections),
        node('Takes', [], animated
            ? [
                node('Current', [fbxString('Take 001')]),
                node('Take', [fbxString('Take 001')], [
                    node('FileName', [fbxString('Take_001.tak')]),
                    node('LocalTime',     [fbxLong(0), fbxLong(stopKTime)]),
                    node('ReferenceTime', [fbxLong(0), fbxLong(stopKTime)]),
                ]),
              ]
            : [node('Current', [fbxString('')])]),
    ];

    return serializeFbxBinary(scene, 7400);
};
