/**
 * Binary FBX (version 7400) container writer — hand-authored.
 *
 * WHY binary (not ASCII): Blender removed ASCII FBX *import* at 2.8 and now
 * errors on it, and no JS FBX-writer library exists. So we author the binary
 * container ourselves. See plans/fbx-export-findings.md for the spike.
 *
 * This module is deliberately CONTENT-AGNOSTIC: it turns a tree of
 * {name, props, children} nodes into valid FBX bytes. The GMT-specific scene
 * graph (camera animation, light nulls, plate quad, param nulls) is built on
 * top of this in fbxExport.ts.
 *
 * Format reference (reverse-engineered, stable since 2013):
 *   • Blender devs' spec   https://code.blender.org/2013/08/fbx-binary-file-format-specification/
 *   • Autodesk binary gist https://gist.github.com/iscle/0dbcee58be8582978d15ea3629ce3e8b
 * Header / sentinel rule / footer constants are lifted VERBATIM from Blender's
 * io_scene_fbx/encode_bin.py so importers accept the file. The footer is the
 * one byte-fragile part every public spec calls "unknown contents" — do not
 * "tidy" the magic constants below.
 *
 * Layout (version 7400 → 32-bit offsets):
 *   header(27) = "Kaydara FBX Binary  \0" + 0x1A 0x00 + u32 version
 *   node record = u32 endOffset, u32 numProps, u32 propsLen, u8 nameLen,
 *                 name, [props…], [children…], optional 13-byte NULL sentinel
 *   top-level node list is terminated by one 13-byte NULL sentinel
 *   footer = FOOT_ID(16) + 4×0 + pad-to-16 + u32 version + 120×0 + MAGIC(16)
 */

// ─── Low-level little-endian growable writer ──────────────────────────────
// (Modelled on mesh-export's BinaryWriter but kept local — FBX needs f64/i64
//  and back-patching, which that one lacks, and we avoid a cross-app import.)

const utf8 = new TextEncoder();

class ByteWriter {
    private buf: Uint8Array;
    private view: DataView;
    pos = 0;

    constructor(initial = 1 << 16) {
        this.buf = new Uint8Array(initial);
        this.view = new DataView(this.buf.buffer);
    }

    private ensure(n: number): void {
        if (this.pos + n <= this.buf.byteLength) return;
        let cap = this.buf.byteLength;
        while (cap < this.pos + n) cap *= 2;
        const nb = new Uint8Array(cap);
        nb.set(this.buf);
        this.buf = nb;
        this.view = new DataView(nb.buffer);
    }

    u8(v: number):  void { this.ensure(1); this.view.setUint8(this.pos, v);                   this.pos += 1; }
    i16(v: number): void { this.ensure(2); this.view.setInt16(this.pos, v, true);             this.pos += 2; }
    u32(v: number): void { this.ensure(4); this.view.setUint32(this.pos, v >>> 0, true);      this.pos += 4; }
    i32(v: number): void { this.ensure(4); this.view.setInt32(this.pos, v | 0, true);         this.pos += 4; }
    f32(v: number): void { this.ensure(4); this.view.setFloat32(this.pos, v, true);           this.pos += 4; }
    f64(v: number): void { this.ensure(8); this.view.setFloat64(this.pos, v, true);           this.pos += 8; }
    i64(v: number | bigint): void {
        this.ensure(8);
        this.view.setBigInt64(this.pos, typeof v === 'bigint' ? v : BigInt(Math.round(v)), true);
        this.pos += 8;
    }
    bytes(b: Uint8Array): void { this.ensure(b.length); this.buf.set(b, this.pos); this.pos += b.length; }
    ascii(s: string): void { this.ensure(s.length); for (let i = 0; i < s.length; i++) this.buf[this.pos++] = s.charCodeAt(i) & 0xff; }

    /** Back-patch a u32 already written earlier (for end-offset / props-len). */
    patchU32(at: number, v: number): void { this.view.setUint32(at, v >>> 0, true); }

    finish(): Uint8Array { return this.buf.slice(0, this.pos); }
}

// ─── Properties ────────────────────────────────────────────────────────────
// A property knows its 1-byte type code and how to write its DATA (the
// serializer writes the type byte before calling write()).

export interface FbxProp {
    /** ASCII type code: Y C I F D L (scalars), f d l i b (arrays), S R. */
    code: number;
    write: (w: ByteWriter) => void;
}

const writeStr = (w: ByteWriter, s: string): void => {
    // FBX strings (S) and raw (R) are u32 length-prefixed, NOT null-terminated.
    // Object names use a "Name\x00\x01Class" separator — pass that verbatim via
    // objName(); TextEncoder emits \x00 / \x01 as single bytes, which is correct.
    const b = utf8.encode(s);
    w.u32(b.length);
    w.bytes(b);
};

/** Array properties — ALWAYS written uncompressed (encoding 0). Valid at any
 *  size per the spec; lets us skip zlib/DEFLATE in the browser. */
const writeArray = (
    w: ByteWriter, length: number, elemBytes: number, writeElems: (w: ByteWriter) => void,
): void => {
    w.u32(length);             // arrayLength (element count)
    w.u32(0);                  // encoding: 0 = uncompressed
    w.u32(length * elemBytes); // byte length of the (uncompressed) data
    writeElems(w);
};

export const fbxI16    = (v: number):           FbxProp => ({ code: 0x59 /* Y */, write: (w) => w.i16(v) });
export const fbxBool   = (v: boolean):          FbxProp => ({ code: 0x43 /* C */, write: (w) => w.u8(v ? 1 : 0) });
export const fbxInt    = (v: number):           FbxProp => ({ code: 0x49 /* I */, write: (w) => w.i32(v) });
export const fbxFloat  = (v: number):           FbxProp => ({ code: 0x46 /* F */, write: (w) => w.f32(v) });
export const fbxDouble = (v: number):           FbxProp => ({ code: 0x44 /* D */, write: (w) => w.f64(v) });
export const fbxLong   = (v: number | bigint):  FbxProp => ({ code: 0x4C /* L */, write: (w) => w.i64(v) });
export const fbxString = (v: string):           FbxProp => ({ code: 0x53 /* S */, write: (w) => writeStr(w, v) });
export const fbxRaw    = (v: Uint8Array):       FbxProp => ({ code: 0x52 /* R */, write: (w) => { w.u32(v.length); w.bytes(v); } });

export const fbxDoubleArray = (vals: ArrayLike<number>): FbxProp => ({
    code: 0x64 /* d */, write: (w) => writeArray(w, vals.length, 8, (ww) => { for (let i = 0; i < vals.length; i++) ww.f64(vals[i]); }),
});
export const fbxFloatArray = (vals: ArrayLike<number>): FbxProp => ({
    code: 0x66 /* f */, write: (w) => writeArray(w, vals.length, 4, (ww) => { for (let i = 0; i < vals.length; i++) ww.f32(vals[i]); }),
});
export const fbxIntArray = (vals: ArrayLike<number>): FbxProp => ({
    code: 0x69 /* i */, write: (w) => writeArray(w, vals.length, 4, (ww) => { for (let i = 0; i < vals.length; i++) ww.i32(vals[i]); }),
});
export const fbxLongArray = (vals: ArrayLike<number | bigint>): FbxProp => ({
    code: 0x6C /* l */, write: (w) => writeArray(w, vals.length, 8, (ww) => { for (let i = 0; i < vals.length; i++) ww.i64(vals[i]); }),
});

/** FBX object-name string: stored as "Name\x00\x01Class" (the SDK reverses it
 *  to "Class::Name" on read). Use for the name property of Model/Geometry/etc. */
export const objName = (name: string, klass: string): string => `${name}\x00\x01${klass}`;

// ─── Nodes ───────────────────────────────────────────────────────────────

export interface FbxNode {
    name:      string;
    props?:    FbxProp[];
    children?: FbxNode[];
}

export const node = (name: string, props: FbxProp[] = [], children: FbxNode[] = []): FbxNode =>
    ({ name, props, children });

// Version 7400 → 32-bit offsets → metadata is 3×u32 (12) + 1 nameLen byte.
const SENTINEL = new Uint8Array(13); // 13-byte NULL record terminating a child list

// Nodes that ALWAYS emit a sentinel even with no children/props
// (_ELEMS_ID_ALWAYS_BLOCK_SENTINEL in Blender's encode_bin.py).
const ALWAYS_SENTINEL = new Set(['AnimationStack', 'AnimationLayer']);

/**
 * Write one node record. `isLast` = is this the last sibling in its parent's
 * child list (drives the no-props sentinel rule, lifted from Blender's
 * FBXElem._write_children).
 */
const writeNode = (w: ByteWriter, n: FbxNode, isLast: boolean): void => {
    const props    = n.props ?? [];
    const children = n.children ?? [];

    const endOffsetPos = w.pos; w.u32(0);             // placeholder, back-patched
    w.u32(props.length);                              // numProps
    const propsLenPos  = w.pos; w.u32(0);             // placeholder, back-patched

    const nameBytes = utf8.encode(n.name);
    w.u8(nameBytes.length);
    w.bytes(nameBytes);

    const propsStart = w.pos;
    for (const p of props) { w.u8(p.code); p.write(w); }
    w.patchU32(propsLenPos, w.pos - propsStart);

    // Child list + NULL-sentinel rule (verbatim from encode_bin.py):
    //   has children            → write children then a sentinel
    //   else no props & !isLast → sentinel  (and AnimationStack/Layer always)
    //   else                    → nothing
    if (children.length) {
        for (let i = 0; i < children.length; i++) {
            writeNode(w, children[i], i === children.length - 1);
        }
        w.bytes(SENTINEL);
    } else if ((props.length === 0 && !isLast) || ALWAYS_SENTINEL.has(n.name)) {
        w.bytes(SENTINEL);
    }

    w.patchU32(endOffsetPos, w.pos); // endOffset = absolute byte pos after this node
};

// ─── Standard top-level preamble ───────────────────────────────────────────
// The Autodesk FBX SDK (Cinema 4D, Maya, 3ds Max, Unity, Unreal) REFUSES to
// load a document missing these — "Unable to read file / Error loading
// document". Blender's own parser is lenient and skips them, which is why a
// file can parse fine yet still fail in SDK-based importers. Values are the
// fixed constants Blender writes (proven to import across DCCs).

const FILE_ID = new Uint8Array([
    0x28, 0xb3, 0x2a, 0xeb, 0xb6, 0x24, 0xcc, 0xc2,
    0xbf, 0xc8, 0xb0, 0x2a, 0xa9, 0x2b, 0xfc, 0xf1,
]);
const TIME_ID = '1970-01-01 10:00:00:000';

const p70 = (name: string, type: string, sub: string, flags: string, ...vals: FbxProp[]): FbxNode =>
    node('P', [fbxString(name), fbxString(type), fbxString(sub), fbxString(flags), ...vals]);

/**
 * The mandatory FBX preamble nodes, in order: FBXHeaderExtension (with
 * EncryptionType / CreationTimeStamp / SceneInfo), FileId, CreationTime,
 * Creator. Spread these FIRST into the top-level list passed to
 * serializeFbxBinary(), before GlobalSettings / Documents / … / Connections.
 */
export const fbxHeaderNodes = (creator = 'GMT FBX export', version = 7400): FbxNode[] => [
    node('FBXHeaderExtension', [], [
        node('FBXHeaderVersion', [fbxInt(1003)]),
        node('FBXVersion',       [fbxInt(version)]),
        node('EncryptionType',   [fbxInt(0)]),
        node('CreationTimeStamp', [], [
            node('Version',     [fbxInt(1000)]),
            node('Year',        [fbxInt(1970)]),
            node('Month',       [fbxInt(1)]),
            node('Day',         [fbxInt(1)]),
            node('Hour',        [fbxInt(10)]),
            node('Minute',      [fbxInt(0)]),
            node('Second',      [fbxInt(0)]),
            node('Millisecond', [fbxInt(0)]),
        ]),
        node('Creator', [fbxString(creator)]),
        node('SceneInfo', [fbxString(objName('GlobalInfo', 'SceneInfo')), fbxString('UserData')], [
            node('Type',    [fbxString('UserData')]),
            node('Version', [fbxInt(100)]),
            node('MetaData', [], [
                node('Version',  [fbxInt(100)]),
                node('Title',    [fbxString('')]),
                node('Subject',  [fbxString('')]),
                node('Author',   [fbxString('')]),
                node('Keywords', [fbxString('')]),
                node('Revision', [fbxString('')]),
                node('Comment',  [fbxString('')]),
            ]),
            node('Properties70', [], [
                p70('DocumentUrl',                'KString', 'Url', '', fbxString('')),
                p70('SrcDocumentUrl',             'KString', 'Url', '', fbxString('')),
                p70('Original',                   'Compound', '', ''),
                p70('Original|ApplicationVendor', 'KString', '', '', fbxString('')),
                p70('Original|ApplicationName',   'KString', '', '', fbxString(creator)),
                p70('LastSaved',                  'Compound', '', ''),
                p70('LastSaved|ApplicationName',  'KString', '', '', fbxString(creator)),
            ]),
        ]),
    ]),
    node('FileId',       [fbxRaw(FILE_ID)]),
    node('CreationTime', [fbxString(TIME_ID)]),
    node('Creator',      [fbxString(creator)]),
];

/**
 * GlobalSettings node. GMT exports Y-up (Up=+Y, Front=+Z, Coord=+X) — the same
 * convention as C4D/Maya. Z-up targets (3ds Max / Unreal / Blender-native)
 * convert on import via these axis fields, so we do NOT bake a Z-up rotation:
 * a clean Y-up file imports correctly everywhere and host apps handle the flip.
 *
 * `timeMode` 6 = 30fps, 5 = 24fps, 9 = 60fps (FbxTime::EMode); omit for default.
 */
export const fbxGlobalSettings = (opts: { unitScale?: number; timeMode?: number } = {}): FbxNode => {
    const { unitScale = 1, timeMode } = opts;
    const props: FbxNode[] = [
        p70('UpAxis',             'int', 'Integer', '', fbxInt(1)),
        p70('UpAxisSign',         'int', 'Integer', '', fbxInt(1)),
        p70('FrontAxis',          'int', 'Integer', '', fbxInt(2)),
        p70('FrontAxisSign',      'int', 'Integer', '', fbxInt(1)),
        p70('CoordAxis',          'int', 'Integer', '', fbxInt(0)),
        p70('CoordAxisSign',      'int', 'Integer', '', fbxInt(1)),
        p70('OriginalUpAxis',     'int', 'Integer', '', fbxInt(1)),
        p70('OriginalUpAxisSign', 'int', 'Integer', '', fbxInt(1)),
        p70('UnitScaleFactor',    'double', 'Number', '', fbxDouble(unitScale)),
    ];
    if (timeMode !== undefined) props.push(p70('TimeMode', 'enum', '', '', fbxInt(timeMode)));
    return node('GlobalSettings', [], [node('Version', [fbxInt(1000)]), node('Properties70', [], props)]);
};

// ─── Header + footer constants (DO NOT EDIT — see module doc) ──────────────

const FOOT_ID = new Uint8Array([
    0xfa, 0xbc, 0xab, 0x09, 0xd0, 0xc8, 0xd4, 0x66,
    0xb1, 0x76, 0xfb, 0x83, 0x1c, 0xf7, 0x26, 0x7e,
]);
const FOOT_MAGIC = new Uint8Array([
    0xf8, 0x5a, 0x8c, 0x6a, 0xde, 0xf5, 0xd9, 0x7e,
    0xec, 0xe9, 0x0c, 0xe3, 0x75, 0x8f, 0x29, 0x0b,
]);

// ─── Public entry point ─────────────────────────────────────────────────────

/**
 * Serialize a list of top-level FBX nodes to a complete binary FBX 7400 file.
 *
 * The caller supplies the standard top-level sections in order:
 * FBXHeaderExtension, GlobalSettings, Documents, References, Definitions,
 * Objects, Connections, Takes — this writer just frames them as valid bytes.
 */
export const serializeFbxBinary = (topLevel: FbxNode[], version = 7400): Uint8Array => {
    const w = new ByteWriter();

    // Header (23-byte magic + u32 version = 27 bytes).
    w.ascii('Kaydara FBX Binary');
    w.u8(0x20); w.u8(0x20); w.u8(0x00); w.u8(0x1A); w.u8(0x00);
    w.u32(version);

    // Top-level list, then exactly one sentinel terminating it.
    for (let i = 0; i < topLevel.length; i++) {
        writeNode(w, topLevel[i], i === topLevel.length - 1);
    }
    w.bytes(SENTINEL);

    // Footer.
    w.bytes(FOOT_ID);
    w.bytes(new Uint8Array(4));
    let pad = ((w.pos + 15) & ~15) - w.pos; // align to 16
    if (pad === 0) pad = 16;                // already aligned → still write a full 16
    w.bytes(new Uint8Array(pad));
    w.u32(version);
    w.bytes(new Uint8Array(120));
    w.bytes(FOOT_MAGIC);

    return w.finish();
};
