/**
 * img2grad/resample — turn an ordered node list into 256 Lab stops, blending between
 * even arc-length spacing and mass-dwell (linger on dominant colours). Verbatim port
 * of the standalone `resample()`.
 */

import { dist2, lerp, type ColorNode } from './common';
import type { Lab } from '../oklab';

/**
 * @param spacing 0 = even arc-length, 1 = dwell proportional to node mass.
 */
export const resample = (nodes: ColorNode[], spacing: number): Lab[] => {
  if (nodes.length === 0) return Array.from({ length: 256 }, () => ({ L: 0.5, a: 0, b: 0 }));
  if (nodes.length === 1) {
    const n = nodes[0];
    return Array.from({ length: 256 }, () => ({ L: n.L, a: n.a, b: n.b }));
  }
  const n = nodes.length,
    arc = new Float64Array(n),
    ms = new Float64Array(n);
  for (let i = 1; i < n; i++) arc[i] = arc[i - 1] + Math.sqrt(dist2(nodes[i - 1], nodes[i]));
  let cm = 0;
  for (let i = 0; i < n; i++) {
    ms[i] = cm + nodes[i].mass / 2;
    cm += nodes[i].mass;
  }
  const aT = arc[n - 1] || 1,
    m0 = ms[0],
    mT = ms[n - 1] - ms[0] || 1,
    blend = spacing;
  const at = (coords: Float64Array, target: number): Lab => {
    let i = 0;
    while (i < n - 1 && coords[i + 1] < target) i++;
    // Clamp to a valid segment. A target just past the last coordinate (floating-point
    // overshoot at t=1, or mass-coordinate rounding — exposed by Golden hour reweighting
    // the node masses) leaves i at n-1, so nodes[i+1] reads nodes[n] (undefined) and the
    // whole ramp poisons downstream with an undefined Lab → ".L of undefined". Hold the
    // last node instead by pinning to the final segment with a clamped fraction.
    if (i > n - 2) i = n - 2;
    let u = (target - coords[i]) / ((coords[i + 1] - coords[i]) || 1e-9);
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    return {
      L: lerp(nodes[i].L, nodes[i + 1].L, u),
      a: lerp(nodes[i].a, nodes[i + 1].a, u),
      b: lerp(nodes[i].b, nodes[i + 1].b, u),
    };
  };
  const out: Lab[] = [];
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const e = at(arc, t * aT),
      m = at(ms, m0 + t * mT);
    out.push({ L: lerp(e.L, m.L, blend), a: lerp(e.a, m.a, blend), b: lerp(e.b, m.b, blend) });
  }
  return out;
};
