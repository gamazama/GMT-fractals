/**
 * Phase 0 verification harness for the MB3D parameter-block parser.
 *
 * Gate: byte-exact decode of real `Mandelbulb3Dv18{...}` blocks. Asserts known
 * externally-stated values on two gold blocks (Arcimboldo, asymmetric) and
 * round-trips 5 digitalstew blocks through the codec byte-for-byte.
 *
 * Run: `npm run test:mb3d`  (tsx debug/test-mb3d-parse.mts)
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  parseMB3D,
  decodeMB3DStream,
  encodeMB3DBytes,
  MB3D_ALPHABET,
  MB3D_HEADER_BYTES,
} from '../engine-gmt/utils/mb3d/parseMB3D.ts';

const FIX = 'engine-gmt/utils/mb3d/fixtures';
const read = (f: string) => fs.readFileSync(path.join(FIX, f), 'utf8');

let pass = 0;
const fails: string[] = [];
function ck(name: string, cond: boolean, got?: unknown) {
  if (cond) pass++;
  else fails.push(`${name}${got !== undefined ? ` (got ${JSON.stringify(got)})` : ''}`);
}
const approx = (a: number, b: number, e = 1e-2) => Math.abs(a - b) < e;

// 1) Codec: 100k synthetic round-trips + alphabet integrity
{
  let mism = 0;
  for (let t = 0; t < 100000; t++) {
    const b = Uint8Array.from([(t * 7) & 255, (t * 13) & 255, (t * 251) & 255]);
    const { bytes } = decodeMB3DStream('Mandelbulb3Dv18{' + encodeMB3DBytes(b) + '}');
    if (bytes[0] !== b[0] || bytes[1] !== b[1] || bytes[2] !== b[2]) mism++;
  }
  ck('codec 100k round-trip exact', mism === 0, mism);
  ck('alphabet 64 unique chars', new Set(MB3D_ALPHABET).size === 64, MB3D_ALPHABET.length);
}

// 2) Gold block A — "Arcimboldo" (Flickr/wuniatuph). Known values from the post.
{
  const s = parseMB3D(read('arcimboldo.txt'));
  const h = s.header;
  console.log(`A arcimboldo: ${s.raw.length}B`, JSON.stringify(h));
  ck('A raw >= 840', s.raw.length >= MB3D_HEADER_BYTES, s.raw.length);
  ck('A mandId 44', h.mandId === 44, h.mandId);
  ck('A 5680x5680', h.width === 5680 && h.height === 5680, [h.width, h.height]);
  ck('A iterations 2000', h.iterations === 2000, h.iterations);
  ck('A iOptions 517', h.iOptions === 517, h.iOptions);
  ck('A isJulia true', h.isJulia === true, h.isJulia);
  ck('A jx ~3.84918', approx(h.jx, 3.84918, 1e-3), h.jx);
  ck('A zoom ~30.125', approx(h.zoom, 30.125, 1e-2), h.zoom);
  ck('A m3dVersion ~1.89', approx(h.m3dVersion, 1.89, 1e-2), h.m3dVersion);
  ck('A tilingOptions 0', h.tilingOptions === 0, h.tilingOptions);
}

// 3) Gold block B — "asymmetric" (DeviantArt/matze2001). AmazingBox hybrid addon.
{
  const s = parseMB3D(read('asymmetric-amazingbox.txt'));
  const h = s.header;
  const a = s.addon;
  console.log(`B asymmetric: ${s.raw.length}B addon iFCount=${a?.formulaCount} slots=${a?.slots.map((x) => x.name)}`);
  ck('B mandId 44', h.mandId === 44, h.mandId);
  ck('B width 5000', h.width === 5000, h.width);
  ck('B iterations 60', h.iterations === 60, h.iterations);
  ck('B isJulia false', h.isJulia === false, h.isJulia);
  ck('B m3dVersion ~1.89', approx(h.m3dVersion, 1.89, 1e-2), h.m3dVersion);
  ck('B addon present', !!a, a);
  ck('B iFCount 3', a?.formulaCount === 3, a?.formulaCount);
  ck('B slot0 _AmazingBox', a?.slots[0]?.name === '_AmazingBox', a?.slots[0]?.name);
  ck('B slot0 iterCount 7', a?.slots[0]?.iterCount === 7, a?.slots[0]?.iterCount);
  ck('B slot0 scale ~-1.078', approx(a?.slots[0]?.optionValues[0] ?? 0, -1.078125, 1e-3), a?.slots[0]?.optionValues[0]);
  ck('B slot2 Amazing Surf', !!a?.slots[2]?.name.includes('Amazing Surf'), a?.slots[2]?.name);
}

// 4) digitalstew sweep — structural sanity + byte-exact header round-trip
{
  const files = ['ds_00.txt', 'ds_01.txt', 'ds_02.txt', 'ds_03.txt', 'ds_04.txt'];
  let ok = 0;
  for (const f of files) {
    const s = parseMB3D(read(f));
    const h = s.header;
    const sane =
      s.raw.length >= MB3D_HEADER_BYTES + 8 &&
      h.mandId >= 20 && h.mandId < 100 &&
      h.width > 0 && h.height > 0 && h.iterations > 0 &&
      approx(h.m3dVersion, 1.89, 0.5) &&
      !!s.addon && s.addon.formulaCount >= 1 && s.addon.formulaCount <= 6;
    const reenc = decodeMB3DStream('Mandelbulb3Dv18{' + encodeMB3DBytes(s.raw.slice(0, 840)) + '}').bytes;
    let rt = reenc.length >= 840;
    for (let k = 0; k < 840 && rt; k++) if (reenc[k] !== s.raw[k]) rt = false;
    if (sane && rt) ok++;
    else fails.push(`${f}: sane=${sane} roundtrip=${rt} (mandId=${h.mandId} ${h.width}x${h.height} its=${h.iterations} ver=${h.m3dVersion.toFixed(3)} iFCount=${s.addon?.formulaCount})`);
  }
  ck('ds sweep 5/5 sane + byte-exact round-trip', ok === files.length, ok);
}

console.log(`\n==== MB3D parser: ${pass} passed, ${fails.length} failed ====`);
if (fails.length) {
  console.log('FAILURES:\n - ' + fails.join('\n - '));
  process.exit(1);
}
