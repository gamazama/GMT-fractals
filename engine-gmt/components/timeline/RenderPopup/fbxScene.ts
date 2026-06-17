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
    params: number[];                          // raw scalar param values, aligned to paramMeta
}

export interface FbxSample {
    frames:    FbxFrame[];
    fovDeg:    number;          // vertical FOV, for the camera lens
    times:     number[];        // KTime per frame
    lightMeta: Array<{ name: string }>;
    paramMeta: Array<{ name: string }>;
    fps:       number;
}

const safe = (s: string): string => (s || 'param').replace(/[^\w\-]+/g, '_');

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

export interface PlateOpts {
    footageFileName: string;
    aspect: number; // width / height of the rendered footage
}

/**
 * Camera-locked backdrop quad carrying the rendered footage, so the artist can
 * composite 3D elements over the fractal. Parented to the camera at a fixed
 * depth, sized to fill the frustum, facing back toward the camera.
 *
 * In the camera-child local frame: +X = view direction, +Y = screen-up,
 * +Z = screen-right (derived from the +90°Y camera-forward fix). If the plate
 * imports MIRRORED, UPSIDE-DOWN, or FACING AWAY (black/back-culled), the four
 * knobs to flip are: the UV rows below, the vertex winding, and the normal
 * sign. They're isolated here so a visual test can be fixed in one place.
 */
const buildPlate = (camId: number, fovDeg: number, plate: PlateOpts, id: () => number) => {
    const DEPTH = NOMINAL;            // sit the plate at ~the subject distance
    const halfH = DEPTH * Math.tan((fovDeg / 2) * Math.PI / 180);
    const halfW = halfH * Math.max(plate.aspect, 1e-3);
    // YZ-plane quad at local x=0 (Model translation pushes it to +X·DEPTH).
    const verts = [
        0, -halfH, -halfW,  // BL
        0, -halfH,  halfW,  // BR
        0,  halfH,  halfW,  // TR
        0,  halfH, -halfW,  // TL
    ];
    const normals = ([] as number[]).concat([-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [-1, 0, 0]); // face camera (-X)
    const uv = [0, 0, 1, 0, 1, 1, 0, 1];
    const footage = plate.footageFileName;

    const geomId = id(), modelId = id(), matId = id(), texId = id(), vidId = id();
    const objects: FbxNode[] = [];
    const connections: FbxNode[] = [];

    objects.push(node('Geometry', [fbxLong(geomId), fbxString(objName('', 'Geometry')), fbxString('Mesh')], [
        node('GeometryVersion', [fbxInt(124)]),
        node('Vertices', [fbxDoubleArray(verts)]),
        node('PolygonVertexIndex', [fbxIntArray([0, 1, 2, -4])]),
        node('LayerElementNormal', [fbxInt(0)], [
            node('Version', [fbxInt(101)]), node('Name', [fbxString('')]),
            node('MappingInformationType', [fbxString('ByPolygonVertex')]),
            node('ReferenceInformationType', [fbxString('Direct')]),
            node('Normals', [fbxDoubleArray(normals)]),
        ]),
        node('LayerElementUV', [fbxInt(0)], [
            node('Version', [fbxInt(101)]), node('Name', [fbxString('map1')]),
            node('MappingInformationType', [fbxString('ByPolygonVertex')]),
            node('ReferenceInformationType', [fbxString('Direct')]),
            node('UV', [fbxDoubleArray(uv)]),
        ]),
        node('LayerElementMaterial', [fbxInt(0)], [
            node('Version', [fbxInt(101)]), node('Name', [fbxString('')]),
            node('MappingInformationType', [fbxString('AllSame')]),
            node('ReferenceInformationType', [fbxString('IndexToDirect')]),
            node('Materials', [fbxIntArray([0])]),
        ]),
        node('Layer', [fbxInt(0)], [
            node('Version', [fbxInt(100)]),
            node('LayerElement', [], [node('Type', [fbxString('LayerElementNormal')]), node('TypedIndex', [fbxInt(0)])]),
            node('LayerElement', [], [node('Type', [fbxString('LayerElementMaterial')]), node('TypedIndex', [fbxInt(0)])]),
            node('LayerElement', [], [node('Type', [fbxString('LayerElementUV')]), node('TypedIndex', [fbxInt(0)])]),
        ]),
    ]));

    objects.push(node('Model', [fbxLong(modelId), fbxString(objName('GMT Plate', 'Model')), fbxString('Mesh')], [
        node('Version', [fbxInt(232)]),
        node('Properties70', [], [
            P('DefaultAttributeIndex', 'int', 'Integer', '', fbxInt(0)),
            P('Lcl Translation', 'Lcl Translation', '', 'A', fbxDouble(DEPTH), fbxDouble(0), fbxDouble(0)),
        ]),
    ]));

    // Emissive=white so the footage shows full-bright regardless of scene lights.
    objects.push(node('Material', [fbxLong(matId), fbxString(objName('GMT Plate', 'Material')), fbxString('')], [
        node('Version', [fbxInt(102)]),
        node('ShadingModel', [fbxString('lambert')]),
        node('Properties70', [], [
            P('DiffuseColor',   'Color',  '', 'A', fbxDouble(1), fbxDouble(1), fbxDouble(1)),
            P('EmissiveColor',  'Color',  '', 'A', fbxDouble(1), fbxDouble(1), fbxDouble(1)),
            P('EmissiveFactor', 'Number', '', 'A', fbxDouble(1)),
        ]),
    ]));

    objects.push(node('Video', [fbxLong(vidId), fbxString(objName('GMT Plate', 'Video')), fbxString('Clip')], [
        node('Type', [fbxString('Clip')]),
        node('Properties70', []),
        node('UseMipMap', [fbxInt(0)]),
        node('Filename', [fbxString(footage)]),
        node('RelativeFilename', [fbxString(footage)]),
    ]));

    objects.push(node('Texture', [fbxLong(texId), fbxString(objName('GMT Plate', 'Texture')), fbxString('')], [
        node('Type', [fbxString('TextureVideoClip')]),
        node('Version', [fbxInt(202)]),
        node('TextureName', [fbxString(objName('GMT Plate', 'Texture'))]),
        node('Properties70', [], [P('UVSet', 'KString', '', '', fbxString('map1'))]),
        node('Media', [fbxString(objName('GMT Plate', 'Video'))]),
        node('Filename', [fbxString(footage)]),
        node('RelativeFilename', [fbxString(footage)]),
        node('ModelUVTranslation', [fbxDouble(0), fbxDouble(0)]),
        node('ModelUVScaling', [fbxDouble(1), fbxDouble(1)]),
        node('Texture_Alpha_Source', [fbxString('None')]),
    ]));

    connections.push(
        OO(modelId, camId),                 // camera-locked
        OO(geomId, modelId),
        OO(matId, modelId),
        OP(texId, matId, 'DiffuseColor'),
        OP(texId, matId, 'EmissiveColor'),
        OO(vidId, texId),
    );
    return { objects, connections };
};

export const buildFbxScene = (sample: FbxSample, projectName: string, plate?: PlateOpts): Uint8Array => {
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
    const f0: FbxFrame = frames[0] ?? { pos: [0, 0, NOMINAL], rot: [0, 0, 0], lights: [], params: [] };
    // Lcl Rotation is GMT's raw camera Euler (matches the render exactly).
    // The FBX camera aims down local +X; PostRotation (0,-90,0) is the constant
    // correction that swings that to -Z — kept OUT of the animated channel so
    // it can't gimbal-flip. effective = Lcl · PostRotation⁻¹ = Lcl · Ry(90).
    objects.push(node('Model', [fbxLong(camId), fbxString(objName(`${projectName} Camera`, 'Model')), fbxString('Camera')], [
        node('Version', [fbxInt(232)]),
        node('Properties70', [], [
            P('DefaultAttributeIndex', 'int', 'Integer', '', fbxInt(0)),
            P('RotationActive', 'bool', '', '', fbxInt(1)),
            P('PostRotation', 'Vector3D', 'Vector', '', fbxDouble(0), fbxDouble(-90), fbxDouble(0)),
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

    // ── Param nulls: each selected animated scalar baked onto a null's
    //    Position Y (raw value, NOT spatially scaled). Artists read the param
    //    via `GMT_param_<name>.position.y`. Mirrors AFX's Slider Controls. ──
    sample.paramMeta.forEach((pm, pi) => {
        const pid = id();
        const vals = frames.map(f => f.params[pi] ?? 0);
        const v0 = vals[0] ?? 0;
        objects.push(node('Model', [fbxLong(pid), fbxString(objName(`GMT_param_${safe(pm.name)}`, 'Model')), fbxString('Null')], [
            node('Version', [fbxInt(232)]),
            node('Properties70', [], [
                P('Lcl Translation', 'Lcl Translation', '', 'A', fbxDouble(0), fbxDouble(v0), fbxDouble(0)),
            ]),
        ]));
        connections.push(OO(pid, 0));
        if (!single && vals.some(v => v !== v0)) {
            attachAnim(pid, 'T', 'Lcl Translation', [vals.map(() => 0), vals, vals.map(() => 0)]);
        }
    });

    // ── Camera-locked backdrop plate (opt-in: only when footage given) ──
    const hasPlate = !!(plate && plate.footageFileName);
    if (hasPlate) {
        const built = buildPlate(camId, sample.fovDeg, plate!, id);
        objects.push(...built.objects);
        connections.push(...built.connections);
    }

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

    // camera + light nulls + param nulls (+ plate Model when present)
    const modelCount = 1 + sample.lightMeta.length + sample.paramMeta.length + (hasPlate ? 1 : 0);
    const defs: FbxNode[] = [
        node('Version', [fbxInt(100)]),
        node('Count', [fbxInt(1 + modelCount + 1 + (hasPlate ? 4 : 0) + (animated ? 2 + curveNodes.length + animCurves.length : 0))]),
        node('ObjectType', [fbxString('GlobalSettings')], [node('Count', [fbxInt(1)])]),
        node('ObjectType', [fbxString('Model')],          [node('Count', [fbxInt(modelCount)])]),
        node('ObjectType', [fbxString('NodeAttribute')],  [node('Count', [fbxInt(1)])]),
    ];
    if (hasPlate) {
        defs.push(
            node('ObjectType', [fbxString('Geometry')], [node('Count', [fbxInt(1)])]),
            node('ObjectType', [fbxString('Material')], [node('Count', [fbxInt(1)])]),
            node('ObjectType', [fbxString('Texture')],  [node('Count', [fbxInt(1)])]),
            node('ObjectType', [fbxString('Video')],    [node('Count', [fbxInt(1)])]),
        );
    }
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
