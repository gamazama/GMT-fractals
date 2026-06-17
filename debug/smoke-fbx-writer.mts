/**
 * Smoke test for the binary-FBX container writer (fbxBinary.ts).
 *
 *   npx tsx debug/smoke-fbx-writer.mts
 *
 * Does two things:
 *  1. Builds a minimal single-camera scene, serializes it, then RE-PARSES the
 *     bytes — walking every node record by its endOffset and confirming the
 *     walk lands exactly on the top-level sentinel + footer. This proves the
 *     container is byte-self-consistent without needing a DCC.
 *  2. Writes debug/out/fbx-smoke.fbx so you can drag it into Blender / Fusion
 *     for the real import test (retires the footer risk — see
 *     plans/fbx-camera-rig-export.md Phase 2.0).
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    serializeFbxBinary, node, objName,
    fbxInt, fbxLong, fbxDouble, fbxString, fbxDoubleArray, fbxLongArray,
} from '../engine-gmt/components/timeline/RenderPopup/fbxBinary.ts';

const here = dirname(fileURLToPath(import.meta.url));

// ── Build a minimal scene: header ext + global settings + one camera Model ──
// Not a full GMT export — just enough distinct node shapes (nested children,
// scalar props, string props, double + long arrays, an AnimationStack that
// must always emit a sentinel) to exercise every writer path.

const p70 = (name: string, type: string, sub: string, ...vals: ReturnType<typeof fbxDouble>[]) =>
    node('P', [fbxString(name), fbxString(type), fbxString(sub), fbxString(''), ...vals]);

const scene = [
    node('FBXHeaderExtension', [], [
        node('FBXHeaderVersion', [fbxInt(1003)]),
        node('FBXVersion',       [fbxInt(7400)]),
        node('Creator',          [fbxString('GMT FBX writer smoke')]),
    ]),
    node('GlobalSettings', [], [
        node('Version', [fbxInt(1000)]),
        node('Properties70', [], [
            p70('UpAxis',           'int',    'Integer', fbxInt(1) as any),
            p70('UpAxisSign',       'int',    'Integer', fbxInt(1) as any),
            p70('FrontAxis',        'int',    'Integer', fbxInt(2) as any),
            p70('FrontAxisSign',    'int',    'Integer', fbxInt(1) as any),
            p70('CoordAxis',        'int',    'Integer', fbxInt(0) as any),
            p70('CoordAxisSign',    'int',    'Integer', fbxInt(1) as any),
            p70('UnitScaleFactor',  'double', 'Number',  fbxDouble(1.0)),
        ]),
    ]),
    node('Definitions', [], [
        node('Version', [fbxInt(100)]),
        node('Count',   [fbxInt(1)]),
        node('ObjectType', [fbxString('Model')], [ node('Count', [fbxInt(1)]) ]),
    ]),
    node('Objects', [], [
        node('Model', [fbxLong(123456789), fbxString(objName('GMT Camera', 'Model')), fbxString('Camera')], [
            node('Version', [fbxInt(232)]),
            node('Properties70', [], [
                p70('Lcl Translation', 'Lcl Translation', 'A', fbxDouble(0), fbxDouble(0), fbxDouble(-10)),
                p70('FieldOfView',     'FieldOfView',     'A', fbxDouble(54.43)),
            ]),
        ]),
    ]),
    // AnimationStack must emit a sentinel even though it has no children here.
    node('AnimationStack', [fbxLong(987654321), fbxString(objName('Take 001', 'AnimStack')), fbxString('')]),
    node('Connections', [], [
        node('C', [fbxString('OO'), fbxLong(123456789), fbxLong(0)]),
    ]),
    // A long array (KTime-style) + double array, to exercise array paths.
    node('Takes', [], [
        node('Current', [fbxString('Take 001')]),
        node('_DebugTimes',  [fbxLongArray([0n, 46186158000n, 92372316000n])]),
        node('_DebugValues', [fbxDoubleArray([0, 0.5, 1.0])]),
    ]),
];

const bytes = serializeFbxBinary(scene, 7400);

// ── Self-consistency walk: re-parse using endOffset, land on footer ──────────

const HEADER = 27;
const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
let ok = true;
let nodeCount = 0;

const walk = (start: number, end: number, depth: number): void => {
    let off = start;
    while (off < end) {
        const endOffset = dv.getUint32(off, true);
        const numProps  = dv.getUint32(off + 4, true);
        const propsLen  = dv.getUint32(off + 8, true);
        const nameLen   = dv.getUint8(off + 12);

        // Sentinel = all-zero record → terminates this list.
        if (endOffset === 0 && numProps === 0 && propsLen === 0 && nameLen === 0) {
            off += 13;
            return;
        }
        if (endOffset > end || endOffset <= off) {
            console.error(`  ✗ bad endOffset ${endOffset} at ${off} (list end ${end})`);
            ok = false;
            return;
        }
        nodeCount++;
        const name = new TextDecoder().decode(bytes.subarray(off + 13, off + 13 + nameLen));
        if (process.env.FBX_VERBOSE) {
            console.log(`${'  '.repeat(depth)}• ${name}  props=${numProps} propsLen=${propsLen} [${off}..${endOffset})`);
        }
        // Children region = after [meta+name+props] up to endOffset.
        const childStart = off + 13 + nameLen + propsLen;
        if (childStart < endOffset) walk(childStart, endOffset, depth + 1);
        off = endOffset;
    }
};

// Top-level list runs from end-of-header to the start of the footer.
// Footer length = FOOT_ID(16) + 4 + pad + version(4) + 120 + magic(16).
// We don't know pad up front, so find the footer by scanning for its trailing
// 16-byte magic, then verify the structure around it.
const MAGIC = [0xf8, 0x5a, 0x8c, 0x6a, 0xde, 0xf5, 0xd9, 0x7e, 0xec, 0xe9, 0x0c, 0xe3, 0x75, 0x8f, 0x29, 0x0b];
const magicAt = bytes.length - 16;
const magicOk = MAGIC.every((b, i) => bytes[magicAt + i] === b);
const versionInFooter = dv.getUint32(magicAt - 120 - 4, true);

// The top-level sentinel sits just before the footer block (FOOT_ID + 4 + pad).
// Walk from header; the walk stops at the first top-level sentinel.
walk(HEADER, bytes.length, 0);

console.log('');
console.log(`bytes written : ${bytes.length}`);
console.log(`nodes walked  : ${nodeCount}`);
console.log(`header magic  : ${new TextDecoder().decode(bytes.subarray(0, 18))} v${dv.getUint32(23, true)}`);
console.log(`footer magic  : ${magicOk ? 'OK' : '✗ MISSING'}  (version-in-footer ${versionInFooter})`);
console.log(`walk verdict  : ${ok ? 'OK — all endOffsets consistent' : '✗ FAILED'}`);

const outDir = join(here, 'out');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, 'fbx-smoke.fbx');
writeFileSync(outFile, bytes);
console.log(`\nwrote ${outFile}`);
console.log('→ drag into Blender (File ▸ Import ▸ FBX) and Fusion to confirm it imports.');

process.exit(ok && magicOk && versionInFooter === 7400 ? 0 : 1);
