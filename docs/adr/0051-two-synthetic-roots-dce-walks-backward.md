# ADR-0051: Two synthetic roots (root-start, root-end); DCE walks backward (DFS)

**Date:** 2026-05-20 (retroactive — captured during doc audit)
**Status:** Accepted
**Scope:** `engine-gmt/utils/GraphCompiler.ts`

## Context

The Modular graph editor needs explicit start/end anchors so the compiler
can compute reachability without committing to a particular pipeline shape.
The editor supports disconnected subgraphs (parked off to the side, mid-edit),
side-tap nodes (preview-only branches), and live editing where a subgraph
moves from disconnected to connected as the user drags edges.

Earlier prototypes used "the first node in toposort" / "the last node in
toposort" as implicit anchors. This was fragile:

- Disconnected subgraphs made "first" ambiguous.
- A side-tap node added for preview shifted "last" and broke the output
  wiring on the next compile.
- Adding metadata to mark nodes as "the input" or "the output" duplicated
  state the editor already managed via edges.

Alternatives considered:

- **Implicit anchors via toposort index.** Rejected (above).
- **A single `root` node combining input + output via two ports.** Saves one
  hard-coded string but complicates the edge-routing UI (the same node ID
  is both source and target).
- **Forward DCE from `root-start` instead of backward from `root-end`.**
  Equivalent reachability result; chose backward to make the "what produces
  the output" question cheap.

## Decision

Two synthetic root IDs as hard-coded string literals:

- `'root-start'` — provides `v_start_p / v_start_d / v_start_dr` as the
  default input for any node whose `in1` edge is missing.
- `'root-end'` — the output sink. The edge whose `target === 'root-end'`
  selects the final variable prefix; `root-start` and unknown sources both
  collapse to `v_start`.

DCE walks BACKWARD from `'root-end'` via `stack.pop()` (LIFO ⇒ DFS, NOT
BFS — the older `03_Modular_System.md` doc claim is wording drift):

```ts
const stack = ['root-end'];
const visited = new Set();
while (stack.length > 0) {
    const currentId = stack.pop()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    if (currentId !== 'root-end' && currentId !== 'root-start') {
        liveNodeIds.add(currentId);
    }
    (inputsByTarget.get(currentId) ?? []).forEach(e => stack.push(e.source));
}
```

Nodes unreachable from `'root-end'` produce no GLSL and consume no
`uModularParams` slots.

## Consequences

- The two synthetic roots appear in THREE places in
  `engine-gmt/utils/GraphCompiler.ts`: the DCE seed (line 20), the `varMap`
  pre-seed `varMap.set('root-start', 'v_start')` (line 65), and the
  output-edge `target === 'root-end'` lookup (line 132). Renaming requires
  touching all three.
- A fully disconnected graph yields the empty-graph identity body
  (`z.xyz += c.xyz; trap = min(trap, length(z.xyz))`) — no error, no
  warning. Acceptable because the FlowEditor visually shows the
  disconnection.
- BFS vs DFS choice is cosmetic for the reachability result; LIFO via
  `stack.pop()` was picked because it's the obvious idiom and gives
  depth-first traversal that matches the visual editor's "follow this edge
  to its source" intuition.
- The packer (`updateModularUniforms`) MUST replicate the same DCE walk
  via the SAME helpers — see ADR-0050 for the slot-order parity contract.
