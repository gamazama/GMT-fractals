/**
 * img2grad/order — order a set of colour nodes into an open path that reads
 * dark→light: nearest-neighbour seed from the darkest node, then 2-opt refinement.
 * Shared by Distill (Tone is already lightness-sorted). Verbatim port of `order()`.
 */

import { dist2, type ColorNode } from './common';

export const order = (nodes: ColorNode[]): ColorNode[] => {
  const n = nodes.length;
  if (n <= 2) return nodes;

  // nearest-neighbour open path from the darkest node
  let start = 0;
  for (let i = 1; i < n; i++) if (nodes[i].L < nodes[start].L) start = i;
  const used = new Array<boolean>(n).fill(false);
  const route = [start];
  used[start] = true;
  for (let k = 1; k < n; k++) {
    const last = nodes[route[route.length - 1]];
    let m = 1e18,
      bi = -1;
    for (let i = 0; i < n; i++)
      if (!used[i]) {
        const e = dist2(last, nodes[i]);
        if (e < m) {
          m = e;
          bi = i;
        }
      }
    route.push(bi);
    used[bi] = true;
  }

  // 2-opt (open path)
  const D = (i: number, j: number) => Math.sqrt(dist2(nodes[i], nodes[j]));
  let improved = true,
    gu = 0;
  while (improved && gu++ < 40) {
    improved = false;
    for (let i = 0; i < n - 1; i++)
      for (let j = i + 1; j < n; j++) {
        const a = route[i],
          b = route[i + 1],
          c = route[j],
          d = route[j + 1 < n ? j + 1 : j];
        const delta = -D(a, b) + D(a, c) + (j + 1 < n ? -D(c, d) + D(b, d) : 0);
        if (delta < -1e-6) {
          let lo = i + 1,
            hi = j;
          while (lo < hi) {
            const t = route[lo];
            route[lo] = route[hi];
            route[hi] = t;
            lo++;
            hi--;
          }
          improved = true;
        }
      }
  }

  const out = route.map((i) => nodes[i]);
  if (out[0].L > out[out.length - 1].L) out.reverse(); // read dark → light
  return out;
};
