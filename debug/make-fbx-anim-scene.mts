/**
 * Animated-camera test FBX — the real point of the export, and the path the
 * FBX SDK / Fusion are pickiest about.
 *
 *   npx tsx debug/make-fbx-anim-scene.mts   →  out/gmt-anim.fbx
 *
 * Scene: a 2m cube at origin + a camera that ORBITS it once over 4s, keeping
 * it framed (baked per-frame Lcl Translation X/Z + Lcl Rotation Y, KTime keys,
 * linear interpolation).
 *
 * UP-AXIS: GMT exports Y-up (C4D/Maya native). Z-up targets (Max/Unreal/
 * Blender-native) convert on import via the GlobalSettings axis fields, so we
 * deliberately do NOT bake a Z-up rotation — host apps handle the flip.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    serializeFbxBinary, fbxHeaderNodes, fbxGlobalSettings, node, objName,
    fbxInt, fbxLong, fbxDouble, fbxString, fbxDoubleArray, fbxFloatArray, fbxIntArray, fbxLongArray,
    type FbxProp,
} from '../engine-gmt/components/timeline/RenderPopup/fbxBinary.ts';

const here = dirname(fileURLToPath(import.meta.url));
const P = (name: string, type: string, sub: string, flags: string, ...vals: FbxProp[]): FbxNode =>
    node('P', [fbxString(name), fbxString(type), fbxString(sub), fbxString(flags), ...vals]);
type FbxNode = ReturnType<typeof node>;

const R2D = 180 / Math.PI;

// ── Cube geometry (±100 = 2m), Y-up ─────────────────────────────────────────
const SCALE = 100;
const V = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
const FACES = [[0,1,5,4],[3,7,6,2],[4,5,6,7],[0,3,2,1],[1,2,6,5],[0,4,7,3]];
const vertices = V.flat().map((x) => x * SCALE);
const polyIndex: number[] = [];
for (const f of FACES) polyIndex.push(f[0], f[1], f[2], ~f[3]);
const normals: number[] = [];
for (const f of FACES) {
    const a = V[f[0]], b = V[f[1]], c = V[f[2]];
    const u = [b[0]-a[0], b[1]-a[1], b[2]-a[2]], v = [c[0]-a[0], c[1]-a[1], c[2]-a[2]];
    const n = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
    const L = Math.hypot(n[0], n[1], n[2]) || 1;
    for (let k = 0; k < 4; k++) normals.push(n[0]/L, n[1]/L, n[2]/L);
}

// ── Bake the orbit (Y-up) ────────────────────────────────────────────────────
const KTIME_PER_SEC = 46186158000; // FBX classic time base
const FPS = 30, FRAMES = 121;      // 0..120 → 4.0 s
const R = 600;
const times: number[] = [];
const cx: number[] = [], cy: number[] = [], cz: number[] = [];
const rx: number[] = [], ry: number[] = [], rz: number[] = [];
for (let i = 0; i < FRAMES; i++) {
    const theta = (i / (FRAMES - 1)) * Math.PI * 2;
    times.push(Math.round((i / FPS) * KTIME_PER_SEC));
    cx.push(R * Math.sin(theta)); cy.push(0); cz.push(R * Math.cos(theta));
    rx.push(0); ry.push(90 + theta * R2D); rz.push(0); // +90° base correction + orbit yaw
}
const stopKTime = times[times.length - 1];

// ── IDs ──────────────────────────────────────────────────────────────────
const ID = {
    geom: 2001, cube: 2002, cam: 2003, camAttr: 2004,
    stack: 3001, layer: 3002, cnT: 3010, cnR: 3011,
    cTX: 3100, cTY: 3101, cTZ: 3102, cRX: 3110, cRY: 3111, cRZ: 3112,
};

const animCurve = (id: number, values: number[]): FbxNode =>
    node('AnimationCurve', [fbxLong(id), fbxString(objName('', 'AnimCurve')), fbxString('')], [
        node('Default',  [fbxDouble(values[0])]),
        node('KeyVer',   [fbxInt(4009)]),
        node('KeyTime',        [fbxLongArray(times)]),
        node('KeyValueFloat',  [fbxFloatArray(values)]),
        node('KeyAttrFlags',     [fbxIntArray([0x00000004])]),    // eInterpolationLinear
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
const C  = (...p: FbxProp[]): FbxNode => node('C', p);
const OO = (src: number, dst: number) => C(fbxString('OO'), fbxLong(src), fbxLong(dst));
const OP = (src: number, dst: number, prop: string) => C(fbxString('OP'), fbxLong(src), fbxLong(dst), fbxString(prop));

const scene: FbxNode[] = [
    ...fbxHeaderNodes('GMT FBX anim test', 7400),
    fbxGlobalSettings({ unitScale: 1, timeMode: 6 }),

    node('Documents', [], [
        node('Count', [fbxInt(1)]),
        node('Document', [fbxLong(1), fbxString(objName('Scene', 'Scene')), fbxString('Scene')], [
            node('RootNode', [fbxLong(0)]),
        ]),
    ]),
    node('References'),

    node('Definitions', [], [
        node('Version', [fbxInt(100)]),
        node('Count',   [fbxInt(13)]),
        node('ObjectType', [fbxString('GlobalSettings')],     [node('Count', [fbxInt(1)])]),
        node('ObjectType', [fbxString('Model')],              [node('Count', [fbxInt(2)])]),
        node('ObjectType', [fbxString('Geometry')],           [node('Count', [fbxInt(1)])]),
        node('ObjectType', [fbxString('NodeAttribute')],      [node('Count', [fbxInt(1)])]),
        node('ObjectType', [fbxString('AnimationStack')],     [node('Count', [fbxInt(1)])]),
        node('ObjectType', [fbxString('AnimationLayer')],     [node('Count', [fbxInt(1)])]),
        node('ObjectType', [fbxString('AnimationCurveNode')], [node('Count', [fbxInt(2)])]),
        node('ObjectType', [fbxString('AnimationCurve')],     [node('Count', [fbxInt(6)])]),
    ]),

    node('Objects', [], [
        node('Geometry', [fbxLong(ID.geom), fbxString(objName('', 'Geometry')), fbxString('Mesh')], [
            node('GeometryVersion', [fbxInt(124)]),
            node('Vertices',           [fbxDoubleArray(vertices)]),
            node('PolygonVertexIndex', [fbxIntArray(polyIndex)]),
            node('LayerElementNormal', [fbxInt(0)], [
                node('Version', [fbxInt(101)]),
                node('Name', [fbxString('')]),
                node('MappingInformationType',   [fbxString('ByPolygonVertex')]),
                node('ReferenceInformationType', [fbxString('Direct')]),
                node('Normals', [fbxDoubleArray(normals)]),
            ]),
            node('Layer', [fbxInt(0)], [
                node('Version', [fbxInt(100)]),
                node('LayerElement', [], [
                    node('Type', [fbxString('LayerElementNormal')]),
                    node('TypedIndex', [fbxInt(0)]),
                ]),
            ]),
        ]),

        node('Model', [fbxLong(ID.cube), fbxString(objName('GMT Cube', 'Model')), fbxString('Mesh')], [
            node('Version', [fbxInt(232)]),
            node('Properties70', [], [
                P('DefaultAttributeIndex', 'int', 'Integer', '', fbxInt(0)),
            ]),
        ]),

        node('Model', [fbxLong(ID.cam), fbxString(objName('GMT Camera', 'Model')), fbxString('Camera')], [
            node('Version', [fbxInt(232)]),
            node('Properties70', [], [
                P('DefaultAttributeIndex', 'int', 'Integer', '', fbxInt(0)),
                P('Lcl Translation', 'Lcl Translation', '', 'A', fbxDouble(cx[0]), fbxDouble(cy[0]), fbxDouble(cz[0])),
                P('Lcl Rotation',    'Lcl Rotation',    '', 'A', fbxDouble(rx[0]), fbxDouble(ry[0]), fbxDouble(rz[0])),
            ]),
        ]),

        node('NodeAttribute', [fbxLong(ID.camAttr), fbxString(objName('', 'NodeAttribute')), fbxString('Camera')], [
            node('Properties70', [], [
                P('FieldOfView', 'FieldOfView', '', 'A', fbxDouble(54.43)),
                P('FocalLength', 'Number', '', 'A', fbxDouble(35)),
            ]),
            node('TypeFlags', [fbxString('Camera')]),
        ]),

        node('AnimationStack', [fbxLong(ID.stack), fbxString(objName('Take 001', 'AnimStack')), fbxString('')], [
            node('Properties70', [], [
                P('LocalStop',     'KTime', 'Time', '', fbxLong(stopKTime)),
                P('ReferenceStop', 'KTime', 'Time', '', fbxLong(stopKTime)),
            ]),
        ]),
        node('AnimationLayer', [fbxLong(ID.layer), fbxString(objName('BaseLayer', 'AnimLayer')), fbxString('')]),

        curveNode(ID.cnT, 'T', cx[0], cy[0], cz[0]),
        curveNode(ID.cnR, 'R', rx[0], ry[0], rz[0]),
        animCurve(ID.cTX, cx), animCurve(ID.cTY, cy), animCurve(ID.cTZ, cz),
        animCurve(ID.cRX, rx), animCurve(ID.cRY, ry), animCurve(ID.cRZ, rz),
    ]),

    node('Connections', [], [
        OO(ID.cube, 0),
        OO(ID.geom, ID.cube),
        OO(ID.cam, 0),
        OO(ID.camAttr, ID.cam),
        OO(ID.layer, ID.stack),
        OO(ID.cnT, ID.layer),
        OO(ID.cnR, ID.layer),
        OP(ID.cnT, ID.cam, 'Lcl Translation'),
        OP(ID.cnR, ID.cam, 'Lcl Rotation'),
        OP(ID.cTX, ID.cnT, 'd|X'), OP(ID.cTY, ID.cnT, 'd|Y'), OP(ID.cTZ, ID.cnT, 'd|Z'),
        OP(ID.cRX, ID.cnR, 'd|X'), OP(ID.cRY, ID.cnR, 'd|Y'), OP(ID.cRZ, ID.cnR, 'd|Z'),
    ]),

    node('Takes', [], [
        node('Current', [fbxString('Take 001')]),
        node('Take', [fbxString('Take 001')], [
            node('FileName', [fbxString('Take_001.tak')]),
            node('LocalTime',     [fbxLong(0), fbxLong(stopKTime)]),
            node('ReferenceTime', [fbxLong(0), fbxLong(stopKTime)]),
        ]),
    ]),
];

const bytes = serializeFbxBinary(scene, 7400);
const outDir = join(here, 'out');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, 'gmt-anim.fbx');
writeFileSync(outFile, bytes);
console.log(`Wrote ${outFile}  (${bytes.length} bytes)`);
console.log(`Animation: camera orbits the cube once over ${(FRAMES - 1) / FPS}s (${FRAMES} keys @ ${FPS}fps), Y-up.`);
