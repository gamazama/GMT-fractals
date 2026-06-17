/**
 * Build a real, importable test FBX (cube + camera) to validate the binary
 * writer against actual DCCs.
 *
 *   npx tsx debug/make-fbx-test-scene.mts   →  debug/out/gmt-test.fbx
 *
 * Unlike smoke-fbx-writer.mts (which just exercises writer code paths), this
 * emits a properly-wired scene — FBXHeaderExtension / GlobalSettings /
 * Documents / Definitions / Objects / Connections — so a successful import in
 * Blender (File ▸ Import ▸ FBX) and Resolve/Fusion retires the footer +
 * container risk (Phase 2.0 of plans/fbx-camera-rig-export.md).
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    serializeFbxBinary, fbxHeaderNodes, node, objName,
    fbxInt, fbxLong, fbxDouble, fbxString, fbxDoubleArray, fbxIntArray, type FbxProp,
} from '../engine-gmt/components/timeline/RenderPopup/fbxBinary.ts';

const here = dirname(fileURLToPath(import.meta.url));

// ── Properties70 helper ──────────────────────────────────────────────────
const P = (name: string, type: string, sub: string, flags: string, ...vals: FbxProp[]): FbxNode =>
    node('P', [fbxString(name), fbxString(type), fbxString(sub), fbxString(flags), ...vals]);
type FbxNode = ReturnType<typeof node>;

// ── Cube geometry (1m cube centred at origin) ─────────────────────────────
const V = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
];
const FACES = [
    [0, 1, 5, 4], [3, 7, 6, 2], [4, 5, 6, 7],
    [0, 3, 2, 1], [1, 2, 6, 5], [0, 4, 7, 3],
];
// FBX's default unit is the centimetre (C4D's native unit), so a ±1 cube reads
// as a 2cm speck. Scale to ±100 → a 2m cube, matching a default C4D cube.
const SCALE = 100;
const vertices: number[] = V.flat().map((x) => x * SCALE);
// FBX closes each polygon by negating (bitwise-NOT) the last index.
const polyIndex: number[] = [];
for (const f of FACES) {
    polyIndex.push(f[0], f[1], f[2], ~f[3]);
}
// Per-polygon-vertex normals (flat — face normal repeated 4×).
const normals: number[] = [];
for (const f of FACES) {
    const a = V[f[0]], b = V[f[1]], c = V[f[2]];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const len = Math.hypot(n[0], n[1], n[2]) || 1;
    for (let k = 0; k < 4; k++) normals.push(n[0] / len, n[1] / len, n[2] / len);
}

// ── Object IDs (arbitrary distinct int64s) ────────────────────────────────
const ID_GEOM = 1000001, ID_CUBE = 1000002, ID_CAM = 1000003, ID_CAMATTR = 1000004;

const scene: FbxNode[] = [
    // Mandatory FBX SDK preamble (FileId / CreationTime / SceneInfo / …).
    ...fbxHeaderNodes('GMT FBX writer test scene', 7400),

    node('GlobalSettings', [], [
        node('Version', [fbxInt(1000)]),
        node('Properties70', [], [
            P('UpAxis', 'int', 'Integer', '', fbxInt(1)),
            P('UpAxisSign', 'int', 'Integer', '', fbxInt(1)),
            P('FrontAxis', 'int', 'Integer', '', fbxInt(2)),
            P('FrontAxisSign', 'int', 'Integer', '', fbxInt(1)),
            P('CoordAxis', 'int', 'Integer', '', fbxInt(0)),
            P('CoordAxisSign', 'int', 'Integer', '', fbxInt(1)),
            P('UnitScaleFactor', 'double', 'Number', '', fbxDouble(1)),
        ]),
    ]),

    node('Documents', [], [
        node('Count', [fbxInt(1)]),
        node('Document', [fbxLong(1), fbxString(objName('Scene', 'Scene')), fbxString('Scene')], [
            node('RootNode', [fbxLong(0)]),
        ]),
    ]),

    node('References'),

    node('Definitions', [], [
        node('Version', [fbxInt(100)]),
        node('Count',   [fbxInt(5)]),
        node('ObjectType', [fbxString('GlobalSettings')], [node('Count', [fbxInt(1)])]),
        node('ObjectType', [fbxString('Model')],          [node('Count', [fbxInt(2)])]),
        node('ObjectType', [fbxString('Geometry')],       [node('Count', [fbxInt(1)])]),
        node('ObjectType', [fbxString('NodeAttribute')],  [node('Count', [fbxInt(1)])]),
    ]),

    node('Objects', [], [
        // Cube mesh geometry.
        node('Geometry', [fbxLong(ID_GEOM), fbxString(objName('', 'Geometry')), fbxString('Mesh')], [
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

        // Cube model node. DefaultAttributeIndex binds it to its Geometry —
        // without it C4D imports the Model as an empty Null.
        node('Model', [fbxLong(ID_CUBE), fbxString(objName('GMT Cube', 'Model')), fbxString('Mesh')], [
            node('Version', [fbxInt(232)]),
            node('Properties70', [], [
                P('DefaultAttributeIndex', 'int', 'Integer', '', fbxInt(0)),
                P('Lcl Translation', 'Lcl Translation', '', 'A', fbxDouble(0), fbxDouble(0), fbxDouble(0)),
            ]),
        ]),

        // Camera model node — on the +Z axis looking back at the cube.
        // DefaultAttributeIndex binds it to the Camera NodeAttribute below.
        // FBX cameras aim down their local +X axis (not -Z), so a +90° Y yaw
        // swings that forward axis around to -Z, toward the cube. (The real
        // export does this via a matrix-based GMT→FBX orientation conversion;
        // here it's a single clean variable to confirm the correction sign.)
        node('Model', [fbxLong(ID_CAM), fbxString(objName('GMT Camera', 'Model')), fbxString('Camera')], [
            node('Version', [fbxInt(232)]),
            node('Properties70', [], [
                P('DefaultAttributeIndex', 'int', 'Integer', '', fbxInt(0)),
                P('Lcl Translation', 'Lcl Translation', '', 'A', fbxDouble(0), fbxDouble(0), fbxDouble(600)),
                P('Lcl Rotation',    'Lcl Rotation',    '', 'A', fbxDouble(0), fbxDouble(90), fbxDouble(0)),
            ]),
        ]),

        // Camera node attribute (the lens).
        node('NodeAttribute', [fbxLong(ID_CAMATTR), fbxString(objName('', 'NodeAttribute')), fbxString('Camera')], [
            node('Properties70', [], [
                P('FieldOfView', 'FieldOfView', '', 'A', fbxDouble(54.43)),
                P('FocalLength', 'Number', '', 'A', fbxDouble(35)),
            ]),
            node('TypeFlags', [fbxString('Camera')]),
            node('GeometryVersion', [fbxInt(124)]),
            node('Position', [fbxDoubleArray([0, 2, 10])]),
            node('Up',       [fbxDoubleArray([0, 1, 0])]),
            node('LookAt',   [fbxDoubleArray([0, 0, 0])]),
        ]),
    ]),

    node('Connections', [], [
        node('C', [fbxString('OO'), fbxLong(ID_CUBE), fbxLong(0)]),       // cube model → root
        node('C', [fbxString('OO'), fbxLong(ID_GEOM), fbxLong(ID_CUBE)]), // geometry → cube model
        node('C', [fbxString('OO'), fbxLong(ID_CAM), fbxLong(0)]),        // camera model → root
        node('C', [fbxString('OO'), fbxLong(ID_CAMATTR), fbxLong(ID_CAM)]), // cam attr → camera model
    ]),

    node('Takes', [], [ node('Current', [fbxString('')]) ]),
];

const bytes = serializeFbxBinary(scene, 7400);
const outDir = join(here, 'out');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, 'gmt-test.fbx');
writeFileSync(outFile, bytes);

console.log(`Wrote ${outFile}  (${bytes.length} bytes)`);
console.log('Scene: 1 cube (2m, at origin) + 1 camera (FOV 54.43°, on +Z looking back).');
console.log('Test:  Blender  File ▸ Import ▸ FBX   and   Resolve  Fusion ▸ Import ▸ FBX Scene');
