/**
 * exportFormats — the palette export suite, ported VERBATIM from the standalone
 * prototypes (generator_template.html + img2grad_template.html). Pure functions
 * over a 256-step RGB ramp so the Generator, Picker and Image modes all share one
 * exporter ("port once", per the integration plan).
 *
 * Text formats: Fractint .map, hex list, CSS, SVG, JSON, JS, Python, CSV,
 * GIMP .gpl + .ggr, GMT .cpt, Paint.NET. Binary: Photoshop .grd v3.
 * PNG export is a canvas op and lives in the component (not pure).
 *
 * The .grd writer reduces the ramp to ≤GRD_MAX stops via Douglas-Peucker (linear
 * RGB error) because Photoshop caps gradient colour stops at ~85, then writes the
 * big-endian 8BGR v3 layout with 16-bit (×257) colour values — see the prototype
 * comments and memory project_softology_palette_param for the format spec.
 */

import type { RGB } from './oklab';

export interface ExportFormatDef {
  key: string;
  label: string;
  ext: string;
  /** Binary formats return a Uint8Array (download only — Copy is disabled). */
  binary?: boolean;
  build: (ramp: RGB[]) => string | Uint8Array;
}

const ri = (c: RGB): [number, number, number] => [Math.round(c.r), Math.round(c.g), Math.round(c.b)];
const hx2 = (c: [number, number, number]) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
const seq = <T>(f: (i: number) => T): T[] => Array.from({ length: 256 }, (_, i) => f(i));
const f6 = (x: number) => x.toFixed(6);

// ---- Douglas-Peucker stop reduction (for .grd) ----

const GRD_MAX = 40;

const rdpIdx = (ramp: RGB[], tol: number): number[] => {
  const gc = (i: number) => ri(ramp[i]);
  const keep = new Array(256).fill(false);
  keep[0] = keep[255] = true;
  const st: [number, number][] = [[0, 255]];
  while (st.length) {
    const [a, b] = st.pop()!;
    if (b - a < 2) continue;
    const ca = gc(a);
    const cb = gc(b);
    let md = -1;
    let mi = -1;
    for (let i = a + 1; i < b; i++) {
      const t = (i - a) / (b - a);
      const ir = ca[0] + (cb[0] - ca[0]) * t;
      const ig = ca[1] + (cb[1] - ca[1]) * t;
      const ib = ca[2] + (cb[2] - ca[2]) * t;
      const c = gc(i);
      const d = Math.hypot(c[0] - ir, c[1] - ig, c[2] - ib);
      if (d > md) {
        md = d;
        mi = i;
      }
    }
    if (md > tol) {
      keep[mi] = true;
      st.push([a, mi]);
      st.push([mi, b]);
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < 256; i++) if (keep[i]) idx.push(i);
  return idx;
};

const grdStops = (ramp: RGB[]): number[] => {
  let tol = 1.5;
  let idx = rdpIdx(ramp, tol);
  let g = 0;
  while (idx.length > GRD_MAX && g++ < 40) {
    tol *= 1.35;
    idx = rdpIdx(ramp, tol);
  }
  return idx;
};

/** Number of colour stops the .grd writer will emit for this ramp. */
export const grdStopCount = (ramp: RGB[]): number => grdStops(ramp).length;

const buildGRD = (ramp: RGB[]): Uint8Array => {
  const gc = (i: number) => ri(ramp[i]);
  const idx = grdStops(ramp);
  const NS = idx.length;
  const size = 8 + 1 + 8 + 2 + NS * 20 + 2 + 2 * 10 + 6;
  const dv = new DataView(new ArrayBuffer(size));
  let p = 0;
  const u8 = (v: number) => {
    dv.setUint8(p, v);
    p++;
  };
  const u16 = (v: number) => {
    dv.setUint16(p, v, false);
    p += 2;
  };
  const i32 = (v: number) => {
    dv.setInt32(p, v, false);
    p += 4;
  };
  '8BGR'.split('').forEach((ch) => u8(ch.charCodeAt(0)));
  u16(3);
  u16(1); // version 3, 1 gradient
  const nm = 'gradient';
  u8(nm.length);
  nm.split('').forEach((ch) => u8(ch.charCodeAt(0)));
  u16(NS); // colour stops
  for (const i of idx) {
    const c = gc(i);
    i32(Math.round((i / 255) * 4096));
    i32(50); // offset 0..4096, midpoint %
    u16(0); // colour model 0 = RGB
    u16(c[0] * 257);
    u16(c[1] * 257);
    u16(c[2] * 257);
    u16(0);
    u16(0); // colour type 0 = user
  }
  u16(2); // transparency stops (fully opaque)
  i32(0);
  i32(50);
  u16(255);
  i32(4096);
  i32(50);
  u16(255);
  for (let k = 0; k < 6; k++) u8(0); // reserved
  return new Uint8Array(dv.buffer);
};

// ---- the suite ----

export const EXPORT_FORMATS: ExportFormatDef[] = [
  {
    key: 'map',
    label: 'Fractint .map',
    ext: 'map',
    build: (r) => seq((i) => ri(r[i]).map((v) => String(v).padStart(3, ' ')).join(' ')).join('\n'),
  },
  { key: 'hex', label: 'Hex list (256)', ext: 'txt', build: (r) => seq((i) => hx2(ri(r[i]))).join('\n') },
  {
    key: 'css',
    label: 'CSS linear-gradient',
    ext: 'css',
    build: (r) =>
      'background: linear-gradient(90deg, ' +
      Array.from({ length: 33 }, (_, k) => hx2(ri(r[Math.round((k / 32) * 255)])) + ' ' + ((k / 32) * 100).toFixed(1) + '%').join(', ') +
      ');',
  },
  {
    key: 'svg',
    label: 'SVG',
    ext: 'svg',
    build: (r) =>
      '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="32"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0">' +
      Array.from({ length: 33 }, (_, k) => '<stop offset="' + ((k / 32) * 100).toFixed(1) + '%" stop-color="' + hx2(ri(r[Math.round((k / 32) * 255)])) + '"/>').join('') +
      '</linearGradient></defs><rect width="256" height="32" fill="url(#g)"/></svg>',
  },
  { key: 'json', label: 'JSON', ext: 'json', build: (r) => JSON.stringify({ name: 'gradient', colors: seq((i) => hx2(ri(r[i]))) }) },
  { key: 'js', label: 'JS array (rgb)', ext: 'js', build: (r) => 'const gradient = ' + JSON.stringify(seq((i) => ri(r[i]))) + ';' },
  { key: 'py', label: 'Python list', ext: 'py', build: (r) => 'gradient = [' + seq((i) => '(' + ri(r[i]).join(', ') + ')').join(', ') + ']' },
  { key: 'csv', label: 'CSV', ext: 'csv', build: (r) => 'r,g,b\n' + seq((i) => ri(r[i]).join(',')).join('\n') },
  {
    key: 'gpl',
    label: 'GIMP palette .gpl',
    ext: 'gpl',
    build: (r) => 'GIMP Palette\nName: gradient\nColumns: 16\n#\n' + seq((i) => ri(r[i]).map((v) => String(v).padStart(3, ' ')).join(' ') + '\tc' + i).join('\n'),
  },
  {
    key: 'ggr',
    label: 'GIMP gradient .ggr',
    ext: 'ggr',
    build: (r) => {
      let s = 'GIMP Gradient\nName: gradient\n255\n';
      for (let k = 0; k < 255; k++) {
        const a = ri(r[k]).map((v) => v / 255);
        const b = ri(r[k + 1]).map((v) => v / 255);
        s += [k / 255, (k + 0.5) / 255, (k + 1) / 255, a[0], a[1], a[2], 1, b[0], b[1], b[2], 1].map(f6).join(' ') + ' 0 0\n';
      }
      return s;
    },
  },
  {
    key: 'cpt',
    label: 'GMT .cpt',
    ext: 'cpt',
    build: (r) => {
      let s = '# COLOR_MODEL = RGB\n# gradient\n';
      for (let k = 0; k < 255; k++) s += (k / 255).toFixed(5) + ' ' + ri(r[k]).join(' ') + ' ' + ((k + 1) / 255).toFixed(5) + ' ' + ri(r[k + 1]).join(' ') + '\n';
      return s + 'B ' + ri(r[0]).join(' ') + '\nF ' + ri(r[255]).join(' ') + '\nN 128 128 128\n';
    },
  },
  {
    key: 'pdn',
    label: 'Paint.NET',
    ext: 'txt',
    build: (r) =>
      '; paint.net Palette File\n' +
      Array.from({ length: 96 }, (_, k) => 'FF' + ri(r[Math.round((k / 95) * 255)]).map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()).join('\n'),
  },
  { key: 'grd', label: 'Photoshop .grd (binary)', ext: 'grd', binary: true, build: (r) => buildGRD(r) },
];

export const getExportFormat = (key: string): ExportFormatDef | undefined => EXPORT_FORMATS.find((f) => f.key === key);
