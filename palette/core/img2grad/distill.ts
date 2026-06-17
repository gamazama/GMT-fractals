/**
 * img2grad/distill — saliency-weighted dominant colours as an ordered ramp.
 *
 * DETERMINISTIC weighted farthest-point k-means++ seed (no Math.random — otherwise
 * the ribbon flip-flops between local minima on every recompute) → Lloyd iterations
 * → medoid snap (per cluster, the highest-weight REAL bin, killing muddy averages)
 * → NN+2-opt order. Verbatim port of the standalone `distill()`.
 */

import { dist2, type Bin, type ColorNode } from './common';
import { order } from './order';

export interface DistillParams {
  /** Target colour count. */
  colours: number;
}

export const distill = (bins: Bin[], { colours }: DistillParams): ColorNode[] => {
  const K = colours;
  const pts = bins.filter((b) => b.w > 0);
  if (pts.length <= K) return order(pts.map((p) => ({ L: p.L, a: p.a, b: p.b, mass: p.w })));

  // deterministic weighted farthest-point seeding
  let s0 = pts.reduce((bi, p, i, arr) => (p.w > arr[bi].w ? i : bi), 0);
  const cen: { L: number; a: number; b: number }[] = [{ L: pts[s0].L, a: pts[s0].a, b: pts[s0].b }];
  while (cen.length < K) {
    let best = -1,
      bi = -1;
    for (let i = 0; i < pts.length; i++) {
      let m = 1e18;
      for (const c of cen) {
        const e = dist2(pts[i], c);
        if (e < m) m = e;
      }
      const v = m * pts[i].w;
      if (v > best) {
        best = v;
        bi = i;
      }
    }
    if (bi < 0 || best <= 0) break;
    cen.push({ L: pts[bi].L, a: pts[bi].a, b: pts[bi].b });
  }

  const K2 = cen.length;
  const asn = new Array<number>(pts.length).fill(0);
  for (let it = 0; it < 12; it++) {
    for (let i = 0; i < pts.length; i++) {
      let m = 1e18,
        bi = 0;
      for (let c = 0; c < K2; c++) {
        const e = dist2(pts[i], cen[c]);
        if (e < m) {
          m = e;
          bi = c;
        }
      }
      asn[i] = bi;
    }
    const sL = new Float64Array(K2),
      sa = new Float64Array(K2),
      sb = new Float64Array(K2),
      sw = new Float64Array(K2);
    for (let i = 0; i < pts.length; i++) {
      const c = asn[i],
        w = pts[i].w;
      sL[c] += pts[i].L * w;
      sa[c] += pts[i].a * w;
      sb[c] += pts[i].b * w;
      sw[c] += w;
    }
    for (let c = 0; c < K2; c++) if (sw[c] > 0) cen[c] = { L: sL[c] / sw[c], a: sa[c] / sw[c], b: sb[c] / sw[c] };
  }

  // medoid snap: per cluster the highest-weight real bin; mass = cluster weight
  const best: (Bin | null)[] = new Array(K2).fill(null);
  const mass = new Float64Array(K2);
  for (let i = 0; i < pts.length; i++) {
    const c = asn[i];
    mass[c] += pts[i].w;
    if (!best[c] || pts[i].w > best[c]!.w) best[c] = pts[i];
  }
  const nodes: ColorNode[] = [];
  for (let c = 0; c < K2; c++) {
    const bc = best[c];
    if (bc) nodes.push({ L: bc.L, a: bc.a, b: bc.b, mass: mass[c] });
  }
  return order(nodes);
};
