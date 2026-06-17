# P1 Capability Classification — 43 Native Formulas

**Status**: Research artifact (read-only input to P1 implementation)
**Drafted**: 2026-05-25 via P1 sub-investigation
**Consumer**: Implementer of Phase 1 of `dev/plans/capability-protocol.md`

The three tokens below have NO legacy-flag mapping and require per-formula classification by reading the GLSL. The other 5 tokens derive mechanically from existing flags via `deriveLegacy()`.

## Counts (43 formulas, Modular excluded — gets `shape:modular` only)

POST-REVISION (2026-05-25, after smoke + architectural decision to revert PseudoKleinian Julia):
- **`iter:c-constant`**: 6 NO — PseudoKleinian family (3), Appell, Borromean, MengerSponge. Architectural decision: formulas with an existing static-vec3 offset don't get redundant Julia mode — saves a per-iter branch with no functional gain.
- **`render:writes-trap`**: 43 YES, 0 NO (universal — unchanged)
- **`render:writes-iter`**: 42 YES, 0 NO — KleinianJos/Mobius now synthesize smoothiter from Möbius accumulator (revised formula: `clamp(-log2(DF) * 0.3, 0, uIterations-1)` — drops the +iter term that was saturating against HYBRID FIX).

## Classification table

| Formula | c-constant | writes-trap | writes-iter | Notes |
|---|---|---|---|---|
| AmazingBox | yes | yes | yes | juliaType=offset; `z.xyz = z3*A + c.xyz`; `trap=min(trap,abs(z.x))`; `dr = dr*abs(A)+1` |
| AmazingSurf | yes | yes | yes | juliaType=offset; `z3 = z3*A + c.xyz`; `trap=min(trap,abs(z3.z))`; `dr = dr*abs(A)+1` |
| AmazingSurface | yes | yes | yes | juliaType=offset; uses c via boxFold path; `dr = dr*abs(scale)*k+1` |
| Apollonian | yes | yes | yes | juliaType=offset; conditional `if(uJuliaMode>0.5) z3 += c.xyz`; `dr *= abs(z2)` |
| Appell | **no** | yes | yes | juliaType=none — `c=0` at runtime so `z.xyz = p_hyper + c.xyz` is a no-op. Recommended NO |
| Borromean | **no** | yes | yes | juliaType=none — same situation as Appell. Recommended NO |
| BoxBulb | yes | yes | yes | juliaType=offset; `z.xyz = z3 + c.xyz`; double trap update; `dr = rp1*power*dr+1` |
| Bristorbrot | yes | yes | yes | juliaType=offset; `z3 = z3*A + c.xyz`; `dr = 2*r*dr+1` |
| Buffalo | yes | yes | yes | juliaType=julia; `z3 += c.xyz`; standard bulb dr |
| Claude | yes | yes | yes | juliaType=offset; `if(uJuliaMode>0.5) p += c.xyz`; `dr *= sphereK; dr *= abs(scale)` |
| Coxeter | yes | yes | yes | juliaType=offset; `cp_trap` written; CP-aware |
| Cuboctahedron | yes | yes | yes | Shape-fold pattern; `cp_trap` written |
| Dodecahedron | yes | yes | yes | Shape-fold pattern; `cp_trap` written |
| GreatStellatedDodecahedron | yes | yes | yes | Shape-fold pattern; `cp_trap` written |
| Icosahedron | yes | yes | yes | Shape-fold pattern; `cp_trap` written |
| JuliaMorph | yes | yes | yes | self-contained SDE; packs `smooth_iter` in `z.w`, DE in `z.z`. Does NOT touch `dr` but `getDist` returns `vec2(z.z, z.w)` — iter slot populated via return |
| KaliBox | yes | yes | yes | juliaType=offset; `p = p*(scale/minR2) + c.xyz`; `dr = dr*k*(abs(scale)/minR2)+1` |
| Kleinian | yes | yes | yes | juliaType=offset; `z3 = z3*A + uVec3A + c.xyz`; `dr = dr*abs(A)+1` |
| KleinianJos | yes | yes | **no** | juliaType=offset; uses private `kj_DF` — `dr` untouched. Smoothiter broken |
| KleinianMobius | yes | yes | **no** | Same as KleinianJos — uses `ks_DF` |
| MakinBrot | yes | yes | yes | juliaType=offset; `z3 = z3*A + c.xyz`; `dr = 2*r*dr+1` |
| MandelBolic | yes | yes | yes | juliaType=julia; `nx/ny/nz` all add `c.x/c.y/c.z`; `dr = stretch*dr+1` |
| MandelMap | yes | yes | yes | juliaType=julia; explicit `c.xyz = w` on first iter then `p += c.xyz`; `dr = pow(r,p-1)*p*dr+1` |
| MandelTerrain | yes | yes | yes | self-contained SDE; `dr = smoothVal` (semantic smoothiter); `trap = sqrt(trapDist)`. Canonical "dr-as-iter" example |
| Mandelbar3D | yes | yes | yes | juliaType=julia; `z3 = z3*scale + c.xyz`; `dr = 2*r*dr+1` |
| Mandelbulb | yes | yes | yes | juliaType=julia; `z3 += c.xyz`; canonical `dr = rp1*power*dr+1` |
| Mandelorus | yes | yes | yes | juliaType=julia; `p_next += c.xyz`; `dr = dr*expansion+1` |
| MarbleMarcher | yes | yes | yes | juliaType=offset; `if(uJuliaMode>0.5) z3 += c.xyz` |
| MengerAdvanced | yes | yes | yes | **juliaType=none but body gates on uJuliaMode** — see latent issue 3 |
| MengerSponge | **no** | yes | yes | juliaType=none; only `c.xyz` ref is inside `trap = min(trap, length(z3 - c.xyz))` — no-op when c=0 |
| MixPinski | yes | yes | yes | juliaType=offset; `if(uJuliaMode>0.5) z.xyz += c.xyz`; `dr *= abs(scaleM)` |
| Modular | n/a | n/a | n/a | Graph-compiled — gets `'shape:modular'` only; capabilities determined by graph nodes |
| Octahedron | yes | yes | yes | Shape-fold pattern; `cp_trap` written |
| Phoenix | yes | yes | yes | juliaType=julia; `z_new_part + c.xyz + historyTerm`; explicit `dr = dr_next` |
| PseudoKleinian | **no** | yes | yes | No juliaType declared; body never references `c`; `dr *= k1` |
| PseudoKleinianAdv | **no** | yes | yes | juliaType=none; uses `uVec3C` not `c` arg; `dr *= k` |
| PseudoKleinianMod4 | **no** | yes | yes | juliaType=none; uses `uVec3A`/`uVec3C` not `c`; `dr *= invK; dr *= k1+0.005` |
| Quaternion | yes | yes | yes | juliaType=julia; `z = quatSquare(z) + c`; `dr = 2*length(z)*dr+1` |
| RhombicDodecahedron | yes | yes | yes | Shape-fold; `cp_trap` written |
| RhombicTriacontahedron | yes | yes | yes | Shape-fold; `cp_trap` written |
| SierpinskiTetrahedron | yes | yes | yes | Shape-fold; `cp_trap` written; `dr *= avgScale` |
| Tetrabrot | yes | yes | yes | juliaType=offset; `z = tetraSquare(z) + c`; `dr = 2*length(z)*dr+1` |
| TruncatedIcosahedron | yes | yes | yes | Shape-fold; `cp_trap` written |

## Mechanical rule for P1 implementer

For each non-Modular formula, the `capabilities` set is:
```ts
new Set<Capability>([
  /* derived legacy: */ deriveLegacy(def),    // shape:per-iteration|self-contained, iter:shared-rotation, estimator:cutting-plane
  'render:writes-trap',                       // universal
  ...(c-constant exclusion list check ? [] : ['iter:c-constant']),
  ...(writes-iter exclusion list check ? [] : ['render:writes-iter']),
])
```

**c-constant exclusions (6)** — POST-REVISION (reverted PseudoKleinian Julia addition): PseudoKleinian, PseudoKleinianAdv, PseudoKleinianMod4, Appell, Borromean, MengerSponge. The PseudoKleinian family architecturally already has static-vec3 offset functionality equivalent to Julia mode; adding a Julia handle would be a redundant per-iter branch.

**writes-iter exclusions (0)** — POST-REVISION: KleinianJos/Mobius synthesize smoothiter from Möbius accumulator.

**Modular**: `new Set<Capability>(['shape:modular'])`.

## Latent issues surfaced (NOT blocking P0/P1 — track separately)

### 1. PseudoKleinian family has no Julia mode
PseudoKleinian, PseudoKleinianAdv, PseudoKleinianMod4 don't reference the `c` parameter at all. Despite being inversion fractals (a category where Julia mode is common), users currently cannot Julia-ize them. Feature gap, not a bug. Worth a separate ticket.

### 2. KleinianJos / KleinianMobius smoothiter is silently broken
Both use private DE accumulators and leave `dr=1.0` untouched. Smoothiter coloring will read stale data. User-visible bug. Worth fixing independent of the protocol — either populate `dr` proportionally or document the limitation in the formula's UI.

### 3. MengerAdvanced juliaType declaration looks wrong
The formula declares `juliaType:'none'` but its body gates on `uJuliaMode`. Either the declaration should be `'offset'` (and the engine should route `c` to it) or the gate is dead code. Worth a one-line audit by the formula owner.

### 4. JuliaMorph iter-via-getDist pattern
Doesn't touch `dr`; iter slot is populated via `getDist` returning `vec2(z.z, z.w)`. If any coloring consumer reads `dr` directly (not via getDist), it'll be wrong for JuliaMorph. P3 (AutoFeaturePanel consumers) should verify the read path.

### 5. MandelTerrain dr-as-iter semantic
Only formula that uses `dr` as a true iteration count rather than a derivative magnitude. Canonical reference example for the capability — worth a code comment in the formula file noting "dr is smoothiter here, not derivative".
