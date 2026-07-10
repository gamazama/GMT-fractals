/**
 * MB3D (Mandelbulb3D) parameter-block parser.
 *
 * Decodes the shareable `Mandelbulb3Dv18{...}` text block that Mandelbulb3D
 * writes to the clipboard / `.m3p` files into a typed scene description, so the
 * converter can map it onto a GMT Preset. This is the `parse` stage of the
 * MB3D→GMT `parse → map → emit` pipeline; it produces a plain `MB3DScene` and
 * intentionally carries NO GMT types.
 *
 * @invariant The text block encodes a packed `TMandHeader10` (840 bytes,
 *   32-bit-pointer layout) immediately followed by a `THeaderCustomAddon`
 *   (8-byte head + up to 6 × 188-byte formula slots), as ONE contiguous
 *   stream in MB3D's CUSTOM little-endian base64 — NOT RFC4648. Header and
 *   addon are split purely by BYTE COUNT (840 bytes), with no delimiter.
 * @invariant The 840-byte layout is fixed regardless of the saving machine's
 *   pointer width — the 7 pointer fields (`PHCustomF[0..5]`, `PCFAddon`,
 *   28 bytes at offset 382) are placeholders, never real addresses (MB3D
 *   bit-packs author strings into them on save when `MandId >= 41`). Do not
 *   interpret them as data.
 * @invariant The custom base64 packs 6-bit groups LITTLE-ENDIAN (group 0 is the
 *   least-significant), the opposite of standard base64, and has no pad char.
 *
 * Spec derived from thargor6/mb3d `TypeDefinitions.pas` (TMandHeader10),
 * `DivUtils.pas` (the codec) and `FileHandling.pas` (block assembly).
 * Verified in Phase 0 against 32 real blocks — 2 with externally-stated values,
 * 30 round-trip byte-exact. See `debug/test-mb3d-parse.mts`.
 */

/** MB3D custom base64 alphabet, index 0..63 (`.` `/` `0-9` `A-Z` `a-z`). No pad char. */
export const MB3D_ALPHABET = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/** Byte size of the packed `TMandHeader10` record (32-bit pointer layout). */
export const MB3D_HEADER_BYTES = 840;
/** Byte size of one `THAformula` formula slot. */
export const MB3D_SLOT_BYTES = 188;
/** Byte size of the `THeaderCustomAddon` head (before the formula slots). */
export const MB3D_ADDON_HEAD_BYTES = 8;
/** Max number of formula slots in the hybrid stack. */
export const MB3D_MAX_SLOTS = 6;

const MARKER_RE = /Mandelbulb3Dv(\d+)\{/;

/** One MB3D light slot, decoded from a `TLight8` record (`TypeDefinitions.pas:198`).
 *  6 physical slots live at header offset 500 (`TLightingParas9.Lights`, 32 bytes each). */
export interface MB3DLight {
  /** `Loption & 1 === 0` — the light is active. Inactive slots are skipped on import. */
  on: boolean;
  /** `Loption & 4` — positional (point) light vs a global directional light. */
  positional: boolean;
  /** `Loption & 0x20` — angles are absolute (object-relative) vs viewer-relative. */
  absAngles: boolean;
  /** `Loption & 0x40` (`HSon`) — this light casts a hard shadow. */
  hardShadow: boolean;
  /** Specular exponent `2 << (LFunction & 7)` (∈ 4..256). */
  specExp: number;
  /** Diffuse-function index `(LFunction >> 4) & 3` (0 Lambert .. 3 squared half-Lambert). */
  diffuseFn: number;
  /** `Lamp` decoded via ShortFloat — light amplitude/intensity (raw MB3D units). */
  amp: number;
  /** `Lcolor` (TRGB) as an `#RRGGBB` sRGB hex string. */
  color: string;
  /** `LXpos`/`LYpos`/`LZpos` (Double7B). For a positional light these are world
   *  position (mid-relative); for a global light X/Y are angles in RADIANS, Z unused. */
  x: number; y: number; z: number;
}

/** Camera, julia, iteration and identity fields lifted from `TMandHeader10`. */
export interface MB3DHeader {
  mandId: number;
  width: number;
  height: number;
  iterations: number;
  iOptions: number;
  /** `bNewOptions` @18 — bit1 (value 1): `hVGrads` holds a quaternion instead of a
   *  3×3 matrix (only when `mandId > 43`). Other bits: misc render options. */
  bNewOptions: number;
  /** Magnification scalar (world units per pixel = 2.1345 / (zoom·width); NOT a GMT targetDistance). */
  zoom: number;
  /** Field-of-view Y, in DEGREES (full vertical angle) — maps to GMT `optics.camFov`. */
  fovY: number;
  /** `dZstart` @20 — camera-Z origin (near plane); orbit distance = `midZ − dZstart`. */
  dZstart: number;
  /** `dZend` @28 — far-clip Z (surfaced for completeness; unused by the camera map). */
  dZend: number;
  midX: number;
  midY: number;
  /** `dZmid` @52 — look-at pivot Z (NOT a distance). */
  midZ: number;
  /** World rotation X, in RADIANS (MB3D stores GUI-degrees×π/180 at Mand.pas:1460 — do NOT deg→rad again). */
  wRotX: number;
  /** World rotation Y, in RADIANS. */
  wRotY: number;
  /** World rotation Z, in RADIANS. */
  wRotZ: number;
  /** `hVGrads` @246 — the 3×3 navigation matrix (9 doubles, ROW-MAJOR: rows 0/1/2
   *  are the screen-X / screen-Y / depth gradient vectors). This is the ACTUAL
   *  camera view basis (the `wRot*` fields are the unrelated 4D rotation, usually
   *  0). Stored rows are scaled by ~stepWidth — normalize before use. When
   *  `bNewOptions & 1` (and `mandId > 43`) the first 4 doubles are a quaternion
   *  instead. @see mapCamera.ts */
  hVGrads: number[];
  isJulia: boolean;
  jx: number;
  jy: number;
  jz: number;
  jw: number;
  m3dVersion: number;
  tilingOptions: number;
  /** `RStop` @92 (Double) — escape radius² the raymarch DE stops at (`Rout > RStop`).
   *  Maps to GMT `quality.deBailout`. */
  rStop: number;
  /** `sDEstop` @177 (Single) — surface hit threshold. MB3D stops a ray when the DE
   *  falls below ~`DEstop·pixelScale`; smaller = the ray reaches closer to the true
   *  surface = finer detail. Maps to GMT `quality.detail` (Ray detail). */
  deStop: number;
  /** `mZstepDiv` @182 (Single) — raymarch step-size divisor (how far each step
   *  advances relative to the DE). Maps to GMT `quality.fudgeFactor`. */
  zStepDiv: number;
  /** `bStepsafterDEStop` @134 (Byte) — extra binary-search steps after the DE-stop
   *  threshold is crossed (surface refinement). */
  stepsAfterDEStop: number;

  // ── Reflections (the CalcSR.pas "Calculate Reflections" pass params). @see ADR-0096.
  /** `SRamount` @332 (Single) — reflected-light amount, ~0..1 in practice (header clamps
   *  to 100). Maps to GMT `reflections.mixStrength`. */
  srAmount: number;
  /** `bCalcSRautomatic` @336 (Byte) — bit0 = calc reflections automatically (artist made
   *  them part of the render), bit1 = transmission, bit2 = only dIFS objects. */
  srOptions: number;
  /** `SRreflectioncount` @337 (Byte) — reflection recursion depth. Decoded but
   *  UNMAPPED since 2026-07-10: GMT Direct reflections are single-bounce by design
   *  (the 'Max Bounces' param was removed; PT owns bounce recursion). */
  srReflectionCount: number;

  // ── Lighting / material / colour (`Light: TLightingParas9` @432, TypeDefinitions.pas:800).
  //    All decoded for the lighting importer (mapLighting.ts). @see plans/mb3d/research/lighting-import-spec.md
  /** The 6 light slots (`Lights` @500). Inactive slots have `on: false`. */
  lights: MB3DLight[];
  /** `RoughnessFactor` @434 (Byte 0..255). Surface roughness `= RoughnessFactor/255`. */
  roughnessFactor: number;
  /** `TBpos[3..11]` @440 (9 × Int32) — material/colour multiplier scratch (see mapLighting
   *  for the index mapping: [5]=diffuse, [7]=specular, [8]=ambient, [9/10]=colour start/range). */
  tbpos: number[];
  /** `TBoptions` @476 (Cardinal) — bit15 (`&0x4000`) colour-cycling; low bits = interior colour pos. */
  tbOptions: number;
  /** `AmbCol` @484 (TRGB) — ambient/sky colour (top of the N.y gradient), `#RRGGBB`. */
  ambCol: string;
  /** `AmbCol2` @488 (TRGB) — ambient colour (bottom of the gradient), `#RRGGBB`. */
  ambCol2: string;
  /** `DepthCol` @492 (TRGB) — background / depth-fog near colour, `#RRGGBB`. */
  depthCol: string;
  /** `DepthCol2` @496 (TRGB) — background / depth-fog far colour, `#RRGGBB`. */
  depthCol2: string;
  /** Primary dynamic-fog colour `#RRGGBB` from `DynFogR`@487 / `DynFogG`@491 / `DynFogB`@495. */
  dynFog: string;
  /** `LCols[0..9]` @692 (10 × `TLCol8`) — surface palette anchors (iteration-keyed gradient). */
  colStops: { pos: number; colorDif: string; colorSpe: string }[];
}

/** One slot of the MB3D hybrid formula stack (`THAformula`). */
export interface MB3DFormulaSlot {
  /** `iItCount` — iterations this slot runs (0 = empty slot). */
  iterCount: number;
  /** `iFnr` — formula index: 0..9 = intern formula, -1 = none, >=20 = external (use `name`). */
  formulaIndex: number;
  optionCount: number;
  /** `CustomFname` — NUL-terminated formula name (e.g. `_AmazingBox`). */
  name: string;
  /** `byOptionType[16]` — per-option type tag (e.g. 7 = BOXSCALE, 11 = Folding16). */
  optionTypes: number[];
  /** `dOptionValue[16]` — the 16 option constants. */
  optionValues: number[];
}

/** The `THeaderCustomAddon` hybrid-stack descriptor. */
export interface MB3DAddon {
  version: number;
  options1: number;
  options2: number;
  options3: number;
  /** `iFCount` — number of active formula slots. */
  formulaCount: number;
  hybOpt1: number;
  hybOpt2: number;
  slots: MB3DFormulaSlot[];
}

/** Fully parsed MB3D scene — plain data, no GMT types. */
export interface MB3DScene {
  /** Marker version (18 for `Mandelbulb3Dv18`). */
  version: number;
  header: MB3DHeader;
  addon: MB3DAddon | null;
  /** `{Titel: ...}` trailer, or `'Mandelbulb3D'` if absent. */
  title: string;
  /** Full decoded byte stream (header + addon) for fields not yet surfaced. */
  raw: Uint8Array;
}

/** Decode one MB3D base64 char to its 6-bit value, or -1 if outside the alphabet. */
function decodeSixBit(code: number): number {
  if (code >= 46 && code <= 57) return code - 46; // . / 0-9 -> 0..11
  if (code >= 65 && code <= 90) return code - 53; // A-Z     -> 12..37
  if (code >= 97 && code <= 122) return code - 59; // a-z     -> 38..63
  return -1;
}

/** Encode a 6-bit value (0..63) to its MB3D base64 char code. */
function encodeSixBit(v: number): number {
  return v < 12 ? v + 46 : v < 38 ? v + 53 : v + 59;
}

/**
 * Decode the base64 payload of an MB3D text block to its raw byte stream.
 * Reads from the `Mandelbulb3Dv<n>{` marker, skips control chars (< 20) and
 * spaces, and stops at the first `}` / `{`. Returns the bytes and the marker
 * version. (The header/addon split is by byte count — see `parseMB3D`.)
 */
export function decodeMB3DStream(text: string): { bytes: Uint8Array; version: number } {
  const m = MARKER_RE.exec(text);
  if (!m) throw new Error('MB3D: no "Mandelbulb3Dv<n>{" marker found');
  const version = parseInt(m[1], 10);
  const bytes: number[] = [];
  let quad: number[] = [];
  for (let i = m.index + m[0].length; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 0x7d || c === 0x7b) break; // } or { terminates the data
    if (c < 20 || c === 32) continue; // skip CR/LF/control + stripped spaces
    const v = decodeSixBit(c);
    if (v < 0) continue; // stray invalid char (corrupted block) — skip
    quad.push(v);
    if (quad.length === 4) {
      const val = quad[0] | (quad[1] << 6) | (quad[2] << 12) | (quad[3] << 18);
      bytes.push(val & 0xff, (val >> 8) & 0xff, (val >> 16) & 0xff);
      quad = [];
    }
  }
  if (quad.length) {
    while (quad.length < 4) quad.push(0);
    const val = quad[0] | (quad[1] << 6) | (quad[2] << 12) | (quad[3] << 18);
    bytes.push(val & 0xff, (val >> 8) & 0xff, (val >> 16) & 0xff);
  }
  return { bytes: Uint8Array.from(bytes), version };
}

/**
 * Encode raw bytes back to the MB3D base64 payload (no marker, no line wrap).
 * Inverse of {@link decodeMB3DStream}; used by the round-trip test.
 */
export function encodeMB3DBytes(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    let v = bytes[i] | ((bytes[i + 1] || 0) << 8) | ((bytes[i + 2] || 0) << 16);
    for (let j = 0; j < 4; j++) {
      out += String.fromCharCode(encodeSixBit(v & 0x3f));
      v >>= 6;
    }
  }
  return out;
}

function readCString(bytes: Uint8Array, off: number, len: number): string {
  let s = '';
  for (let k = 0; k < len; k++) {
    const b = bytes[off + k];
    if (b === 0) break;
    s += String.fromCharCode(b);
  }
  return s;
}

// ── Lighting-block decoders (verified against MB3D Math3D.pas / real .m3p bytes) ──

const D7B_BUF = new Uint8Array(8);
const D7B_VIEW = new DataView(D7B_BUF.buffer);
/** `Double7B` → f64 (`D7BtoDouble`, Math3D.pas:529). The 7 stored bytes are the HIGH 7
 *  bytes of a little-endian double; the dropped low byte is 0. */
function readDouble7B(dv: DataView, off: number): number {
  D7B_BUF[0] = 0;
  for (let k = 0; k < 7; k++) D7B_BUF[k + 1] = dv.getUint8(off + k);
  return D7B_VIEW.getFloat64(0, true);
}

/** `ShortFloat` (2 signed bytes [mantissa, exponent]) → value (`ShortFloatToSingle`,
 *  Math3D.pas:1182): `mant · 10^(clamp(exp, −25, 25) − 1)`. */
function readShortFloat(dv: DataView, off: number): number {
  const m = dv.getInt8(off);
  const e = dv.getInt8(off + 1);
  return m * Math.pow(10, Math.min(25, Math.max(-25, e)) - 1);
}

const hex2 = (v: number) => (v & 0xff).toString(16).padStart(2, '0');
/** `TRGB` (3 sRGB bytes R,G,B) → `#RRGGBB`. */
function readTRGB(dv: DataView, off: number): string {
  return '#' + hex2(dv.getUint8(off)) + hex2(dv.getUint8(off + 1)) + hex2(dv.getUint8(off + 2));
}

/** Cardinal (RGBA, little-endian) → `#RRGGBB` (drops the alpha/transparency byte). */
function readCardinalRGB(dv: DataView, off: number): string {
  return '#' + hex2(dv.getUint8(off)) + hex2(dv.getUint8(off + 1)) + hex2(dv.getUint8(off + 2));
}

/** Walk the 6 `TLight8` slots at `TLightingParas9.Lights` (header @500, 32 bytes each). */
function parseLights(dv: DataView): MB3DLight[] {
  const lights: MB3DLight[] = [];
  for (let i = 0; i < 6; i++) {
    const o = 500 + i * 32;
    const lopt = dv.getUint8(o);
    const lfun = dv.getUint8(o + 1);
    lights.push({
      on: (lopt & 1) === 0,
      positional: (lopt & 4) !== 0,
      absAngles: (lopt & 0x20) !== 0,
      hardShadow: (lopt & 0x40) !== 0,
      specExp: 2 << (lfun & 7),
      diffuseFn: (lfun >> 4) & 3,
      amp: readShortFloat(dv, o + 2),
      color: readTRGB(dv, o + 4),
      x: readDouble7B(dv, o + 9),
      y: readDouble7B(dv, o + 17),
      z: readDouble7B(dv, o + 25),
    });
  }
  return lights;
}

/** Walk the 840-byte `TMandHeader10` record (offsets verified in Phase 0). */
function parseHeader(dv: DataView): MB3DHeader {
  return {
    mandId: dv.getInt32(0, true),
    width: dv.getInt32(4, true),
    height: dv.getInt32(8, true),
    iterations: dv.getInt32(12, true),
    iOptions: dv.getUint16(16, true),
    bNewOptions: dv.getUint8(18),
    dZstart: dv.getFloat64(20, true),
    dZend: dv.getFloat64(28, true),
    midX: dv.getFloat64(36, true),
    midY: dv.getFloat64(44, true),
    midZ: dv.getFloat64(52, true),
    wRotX: dv.getFloat64(60, true),
    wRotY: dv.getFloat64(68, true),
    wRotZ: dv.getFloat64(76, true),
    hVGrads: Array.from({ length: 9 }, (_, k) => dv.getFloat64(246 + k * 8, true)),
    zoom: dv.getFloat64(84, true),
    fovY: dv.getFloat64(108, true),
    isJulia: dv.getUint8(190) !== 0,
    jx: dv.getFloat64(191, true),
    jy: dv.getFloat64(199, true),
    jz: dv.getFloat64(207, true),
    jw: dv.getFloat64(215, true),
    m3dVersion: dv.getFloat32(424, true),
    tilingOptions: dv.getInt32(428, true),
    rStop: dv.getFloat64(92, true),
    deStop: dv.getFloat32(177, true),
    zStepDiv: dv.getFloat32(182, true),
    stepsAfterDEStop: dv.getUint8(134),
    srAmount: dv.getFloat32(332, true),
    srOptions: dv.getUint8(336),
    srReflectionCount: dv.getUint8(337),
    // Lighting block (TLightingParas9 @432). Offsets walked from the packed record
    // (TypeDefinitions.pas:258-280); colours verified against real .m3p bytes.
    lights: parseLights(dv),
    roughnessFactor: dv.getUint8(434),
    tbpos: Array.from({ length: 9 }, (_, k) => dv.getInt32(440 + k * 4, true)), // TBpos[3..11]
    tbOptions: dv.getUint32(476, true),
    ambCol: readTRGB(dv, 484),
    ambCol2: readTRGB(dv, 488),
    depthCol: readTRGB(dv, 492),
    depthCol2: readTRGB(dv, 496),
    dynFog: '#' + hex2(dv.getUint8(487)) + hex2(dv.getUint8(491)) + hex2(dv.getUint8(495)),
    colStops: Array.from({ length: 10 }, (_, k) => {
      const o = 692 + k * 10; // LCols @692, TLCol8 = Word pos + 2× Cardinal (10 bytes)
      return { pos: dv.getUint16(o, true), colorDif: readCardinalRGB(dv, o + 2), colorSpe: readCardinalRGB(dv, o + 6) };
    }),
  };
}

/** Walk the `THeaderCustomAddon` + its active formula slots, starting at byte 840. */
function parseAddon(bytes: Uint8Array, dv: DataView): MB3DAddon | null {
  const a = MB3D_HEADER_BYTES;
  if (bytes.length < a + MB3D_ADDON_HEAD_BYTES) return null;
  const formulaCount = dv.getUint8(a + 4);
  const slots: MB3DFormulaSlot[] = [];
  // Read ALL 6 physical slots, keyed by each slot's own iterCount — exactly what
  // MB3D does (HeaderTrafos.pas:643 walks Formulas[0..5].iItCount). `iFCount`
  // (formulaCount) is only a text-save char-saving hint and is 0 for many real
  // multi-slot scenes (e.g. Genetic Menger's `_updateC2`, QuatP4hybridJulia's
  // `Integer Power`, TimeMachine's 3 extra slots), so bounding by it silently
  // drops woven slots and renders a wrong (often plainer) fractal. Inactive
  // slots are iterCount 0 / formulaIndex −1 and the weaver ignores them; the
  // length guard below still stops at the end of the buffer.
  const slotCount = MB3D_MAX_SLOTS;
  for (let s = 0; s < slotCount; s++) {
    const o = a + MB3D_ADDON_HEAD_BYTES + s * MB3D_SLOT_BYTES;
    if (o + MB3D_SLOT_BYTES > bytes.length) break;
    const optionTypes: number[] = [];
    for (let k = 0; k < 16; k++) optionTypes.push(dv.getUint8(o + 44 + k));
    const optionValues: number[] = [];
    for (let k = 0; k < 16; k++) optionValues.push(dv.getFloat64(o + 60 + k * 8, true));
    slots.push({
      iterCount: dv.getInt32(o + 0, true),
      formulaIndex: dv.getInt32(o + 4, true),
      optionCount: dv.getInt32(o + 8, true),
      name: readCString(bytes, o + 12, 32),
      optionTypes,
      optionValues,
    });
  }
  return {
    version: dv.getUint8(a + 0),
    options1: dv.getUint8(a + 1),
    options2: dv.getUint8(a + 2),
    options3: dv.getUint8(a + 3),
    formulaCount,
    hybOpt1: dv.getUint8(a + 5),
    hybOpt2: dv.getUint16(a + 6, true),
    slots,
  };
}

/** Extract the `{Titel: ...}` trailer (max 48 chars), defaulting to `Mandelbulb3D`. */
function parseTitle(text: string): string {
  const i = text.indexOf('{Titel:');
  if (i < 0) return 'Mandelbulb3D';
  const end = text.indexOf('}', i);
  const raw = text.slice(i + '{Titel:'.length, end < 0 ? undefined : end).trim();
  return raw.slice(0, 48) || 'Mandelbulb3D';
}

/**
 * Parse an MB3D `Mandelbulb3Dv18{...}` text block into a typed {@link MB3DScene}.
 * @throws if no marker is found, the marker version is < 16 (legacy
 *   `TMandHeader8`, unsupported), or the payload is too short for a header.
 */
export function parseMB3D(text: string): MB3DScene {
  const { bytes, version } = decodeMB3DStream(text);
  if (version < 16) {
    throw new Error(`MB3D: marker version ${version} (< 16) uses the legacy TMandHeader8 layout, not supported`);
  }
  if (bytes.length < MB3D_HEADER_BYTES) {
    throw new Error(`MB3D: decoded ${bytes.length} bytes, need >= ${MB3D_HEADER_BYTES} for a header`);
  }
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    version,
    header: parseHeader(dv),
    addon: parseAddon(bytes, dv),
    title: parseTitle(text),
    raw: bytes,
  };
}

/**
 * Parse a RAW BINARY `.m3p` file (the uncompressed `TMandHeader10` struct stored
 * directly, 32-bit/840-byte layout starting at byte 0 — the form MB3D writes to
 * disk, vs the base64 text block it copies to the clipboard). No marker, no
 * base64. Used to load the clone's `M3Parameter/*.m3p` scenes.
 *
 * @throws if the buffer is too short for a header. Note: files saved by a 64-bit
 *   MB3D build use an 868-byte layout (8-byte pointers) — not handled here.
 */
export function parseMB3DBinary(bytes: Uint8Array, title = 'Mandelbulb3D'): MB3DScene {
  if (bytes.length < MB3D_HEADER_BYTES) {
    throw new Error(`MB3D: file is ${bytes.length} bytes, need >= ${MB3D_HEADER_BYTES} for a header`);
  }
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { version: 18, header: parseHeader(dv), addon: parseAddon(bytes, dv), title, raw: bytes };
}
