
# Modular Graph System

The **Modular Builder** is a node-graph environment for constructing custom fractal distance estimator (DE) functions visually. Users wire together operations — folds, transforms, fractal kernels, SDF primitives, CSG combiners — and the system JIT-compiles the graph into a GLSL `formula_Modular()` function injected into the main shader.

## 1. Core Concepts

### 1.1 Data Flow

Each node in the graph operates on a **state triplet**:

| Variable | GLSL Type | Meaning |
|----------|-----------|---------|
| `_p` | `vec3` | Current position in fractal space |
| `_d` | `float` | Distance estimate (used by SDF Primitives and CSG) |
| `_dr` | `float` | Derivative running product (for analytic DE) |

The triplet flows from node to node along edges. Most nodes modify `_p` (and update `_dr` to keep the derivative correct). SDF Primitive nodes write `_d`. CSG nodes merge two triplets using min/max/mix operations.

### 1.2 Two Special Nodes

The graph always contains two synthetic nodes that are not user-editable:

- **`root-start`** ("Input Z") — Seeds the pipeline with the current iteration state: `p = z.xyz`, `d = 1000.0`, `dr = dr`.
- **`root-end`** ("Output Distance") — Collects the final triplet. Writes `z.xyz`, `dr`, and optionally `distOverride` (if an SDF primitive produced a `_d < 999.0`).

### 1.3 Uniform Flattening

Recompiling a shader takes 100–500ms. Slider drags must be instant.

**Solution:** All non-bound node parameters are packed into a flat GLSL array:
```glsl
uniform float uModularParams[64];
```

- **At compile time:** The compiler assigns sequential indices to each parameter. A node's "Scale" slider at index 5 becomes `uModularParams[5]` in GLSL.
- **At runtime:** When a slider moves, the engine writes the new value to index 5 in a `Float32Array` and uploads it to the GPU. No recompile needed.

The hard limit is `MAX_MODULAR_PARAMS = 64` total unbound parameters across the entire graph.

### 1.4 Bindings (Node Params → Global Sliders)

Any node parameter can be **bound** to one of the six global formula sliders (Param A–F). This replaces the `uModularParams[N]` reference with the named uniform (e.g., `uParamA`).

**Why this matters:**
- Global params are animatable via the keyframe system (e.g., `coreMath.paramA` track).
- They appear in the main formula slider panel for quick access.
- They don't consume a `uModularParams` slot.

**Lifecycle:**
1. User clicks the link icon on a node slider → cycles through `ParamA → ParamB → ... → ParamF → unbound`.
2. Stored in `node.bindings[paramKey]` (e.g., `{ 'z': 'ParamC' }`).
3. During compilation, `getParam('z')` returns `"uParamC"` instead of `"uModularParams[N]"`.
4. The binding is a structural change — triggers shader recompile.

## 2. Type System (`types/graph.ts`)

```typescript
// All available node types
type NodeType = 
    | 'Mandelbulb' | 'BoxFold' | 'SphereFold' | 'Abs' | 'Mod' 
    | 'Rotate' | 'Scale' | 'Translate' | 'Twist' | 'Bend' | 'SineWave'
    | 'Union' | 'Subtract' | 'Intersect' | 'SmoothUnion' | 'Mix' 
    | 'Sphere' | 'Box' 
    | 'PlaneFold' | 'MengerFold' | 'SierpinskiFold'
    | 'Custom' | 'Note' | 'IFSScale' | 'AddConstant' | 'AmazingFold';

// Runtime/serialized node (no visual position)
interface PipelineNode {
    id: string;
    type: NodeType;
    enabled: boolean;
    params: { [key: string]: number };
    text?: string;                          // Note nodes only
    bindings?: { [key: string]: 'ParamA' | ... | 'ParamF' | undefined };
    condition?: { active: boolean; mod: number; rem: number };
}

// Visual node (extends PipelineNode with position for React Flow)
interface GraphNode extends PipelineNode {
    position: { x: number; y: number };
}

// Edge between nodes
interface GraphEdge {
    id: string;
    source: string;          // Source node ID (or 'root-start')
    target: string;          // Target node ID (or 'root-end')
    sourceHandle?: string;   // Always bottom handle
    targetHandle?: string;   // 'a' = main input, 'b' = CSG second operand
}

// Complete visual graph
interface FractalGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
}
```

## 3. Node Registry (`engine/NodeRegistry.ts`)

A singleton `nodeRegistry` maps `NodeType` strings to `NodeDefinition` objects. Populated at import time by `data/nodes/definitions.ts`.

### 3.1 NodeDefinition Interface

```typescript
interface NodeInput {
    id: string;       // Internal param key (e.g., 'scale', 'power')
    label: string;    // UI display label
    min: number;
    max: number;
    step: number;
    default: number;
    hardMin?: number; // Slider floor (can't go below this)
    hardMax?: number;
}

interface GLSLContext {
    varName: string;                      // GLSL variable prefix (e.g., 'v_rot1')
    in1: string;                          // Upstream A variable prefix
    in2: string;                          // Upstream B variable prefix (CSG)
    getParam: (key: string) => string;    // Returns 'uParamX' or 'uModularParams[N]'
    indent: string;                       // Current indentation (deeper inside condition blocks)
}

interface NodeDefinition {
    id: NodeType;
    label: string;
    category: 'Fractals' | 'Transforms' | 'Folds' | 'Primitives' | 'Combiners (CSG)' | 'Utils' | 'Distortion';
    description: string;
    inputs: NodeInput[];
    glsl: (ctx: GLSLContext) => string;   // Returns GLSL code block
}
```

### 3.2 Registry API

| Method | Returns | Purpose |
|--------|---------|---------|
| `register(def)` | `void` | Adds a node type definition |
| `get(id)` | `NodeDefinition \| undefined` | Look up by type ID |
| `getAll()` | `NodeDefinition[]` | All registered definitions |
| `getGrouped()` | `Record<string, string[]>` | Grouped by category for UI dropdowns |

## 4. Node Type Reference (`data/nodes/definitions.ts`)

### 4.1 Utils

| Node | Label | Params | Purpose |
|------|-------|--------|---------|
| `Note` | Comment / Note | — (text field) | Documentation inside the graph. No GLSL output. |
| `AddConstant` | Add C (Julia/Pixel) | `scale` (0–2, default 1) | Adds `c.xyz * scale` to position. Essential for Mandelbrot/Julia iteration. |
| `Custom` | Custom (Legacy) | — | Alias for Note. Prevents crash when loading old presets. |

### 4.2 Transforms

| Node | Label | Params | GLSL Summary |
|------|-------|--------|-------------|
| `Scale` | Scale (Mult) | `scale` (0.1–5, default 2, hardMin 0.001) | `p *= scale; dr *= abs(scale)` |
| `IFSScale` | IFS Scale (Homothety) | `scale` (1–5, default 2), `offset` (0–5, default 1) | `p = p * scale - vec3(offset * (scale-1))`. Shifts to maintain fractal center. Critical for Menger/Sierpinski. |
| `Rotate` | Rotate | `x`, `y`, `z` (degrees, -180–180) | Three conditional 2D matrix rotations on yz/xz/xy planes. Skips axes with angle < 0.001 rad. |
| `Translate` | Translate | `x`, `y`, `z` (-5–5) | `p += vec3(x, y, z)` |
| `Mod` | Modulo (Repeat) | `x`, `y`, `z` (0–10, 0 = disabled) | Per-axis modulo. Creates infinite tiling. |

### 4.3 Folds

| Node | Label | Params | GLSL Summary |
|------|-------|--------|-------------|
| `AmazingFold` | Amazing Fold | `limit` (0.1–3), `minR` (0–2), `fixedR` (0–3) | Calls `boxFold()` + `sphereFold()` from shader math library. Core of Amazing Box / Mandelbox. |
| `Abs` | Abs (Mirror) | — | `p = abs(p)`. Creates cubic symmetry. |
| `BoxFold` | Box Fold | `limit` (0.1–3, hardMin 0.001) | Calls `boxFold(p, dr, limit)`. Clamps space inside a box. |
| `SphereFold` | Sphere Fold | `minR` (0–2), `fixedR` (0–3) | Calls `sphereFold(p, dr, minR, fixedR)`. Inverts space inside a sphere. |
| `PlaneFold` | Plane Fold | `x`, `y`, `z` (normal), `d` (offset) | Reflects across an arbitrary plane: `p -= 2 * min(0, dot(p,n)-d) * n`. |
| `MengerFold` | Menger Fold | — | Sorts xyz coordinates via conditional swaps. Essential for Menger Sponge. |
| `SierpinskiFold` | Sierpinski Fold | — | Diagonal reflections: `if(p.x+p.y<0) p.xy = -p.yx`. Tetrahedral folding for MixPinski. |

### 4.4 Fractals

| Node | Label | Params | GLSL Summary |
|------|-------|--------|-------------|
| `Mandelbulb` | Mandelbulb | `power` (1–16, default 8), `phaseX` (-π–π), `phaseY` (-π–π), `twist` (-2–2) | Spherical coordinates → multiply angles by power → add phase offsets → optional z-twist rotation. Updates `dr = pow(r, power-1) * power * dr + 1`. |

### 4.5 Primitives (SDF)

| Node | Label | Params | GLSL Summary |
|------|-------|--------|-------------|
| `Sphere` | Sphere | `r` (0.1–5, default 1) | `d = length(p) - r`. Sets distance field to sphere. |
| `Box` | Box | `x`, `y`, `z` (sizes, 0.1–5) | Standard SDF box: `length(max(d,0)) + min(max(d.x,d.y,d.z), 0)`. |

When a Primitive's `_d` value reaches the output, the compiler sets `distOverride`, bypassing the iterative fractal DE and directly controlling the final distance. This enables hybrid fractal + SDF primitive scenes.

### 4.6 Distortion

| Node | Label | Params | GLSL Summary |
|------|-------|--------|-------------|
| `Twist` | Twist (Z) | `amount` (-5–5) | Rotates XY plane by `amount * p.z`. Position-dependent rotation along Z. |
| `Bend` | Bend (Y) | `amount` (-2–2) | Rotates XZ plane by `amount * p.y`. Position-dependent rotation along Y. |
| `SineWave` | Sine Wave | `freq` (0.1–10), `amp` (0–1) | `p += sin(p.yzx * freq) * amp`. Swizzled sine for 3D undulation. |

### 4.7 Combiners (CSG)

CSG nodes have two input handles — **A** (main chain, left handle) and **B** (second operand, right handle). They read both upstream triplets and produce a merged result.

| Node | Label | Params | Operation |
|------|-------|--------|-----------|
| `Union` | Union | — | `min(A_d, B_d)` — keeps whichever is closer |
| `Subtract` | Subtract | — | `max(A_d, -B_d)` — carves B from A |
| `Intersect` | Intersect | — | `max(A_d, B_d)` — only overlapping region |
| `SmoothUnion` | Smooth Union | `k` (0.01–2, default 0.5) | Polynomial smooth-min: `mix - k*h*(1-h)` |
| `Mix` | Mix (Lerp) | `factor` (0–1, default 0.5) | Linear interpolation of all three channels |

## 5. The Graph Compiler (`utils/GraphCompiler.ts`)

### 5.1 `compileGraph(sortedNodes, edges) → string`

Transforms a topologically sorted node array and edge list into a complete GLSL function.

**Algorithm:**

1. **Dead Code Elimination (DCE):** Starting from `root-end`, walks upstream through edges (stack-based BFS). Only nodes reachable from the output are compiled. This means disconnected subgraphs are pruned for free.

2. **Empty-graph fallback:** If no active nodes, returns a minimal identity function:
   ```glsl
   void formula_Modular(...) {
       z.xyz += c.xyz;
       trap = min(trap, length(z.xyz));
   }
   ```

3. **Variable naming:** Each node gets a GLSL variable prefix `v_{sanitizedId}` (non-alphanumeric chars stripped). The `root-start` node maps to `v_start`.

4. **Init block:** Declares the seed triplet:
   ```glsl
   vec3 v_start_p = z.xyz;
   float v_start_d = 1000.0;   // No SDF yet
   float v_start_dr = dr;      // Incoming derivative
   ```

5. **Per-node code generation:** For each active node:
   - Declares `_p`, `_d`, `_dr` variables copying from upstream input A.
   - Resolves input B from the edge targeting handle `'b'` (for CSG nodes).
   - If `node.enabled` and a definition exists in the registry:
     - If `node.condition.active`: wraps code in `if ((i - (i/mod)*mod) == rem)` (per-iteration conditional execution).
     - Calls `def.glsl(ctx)` with the `getParam` closure.
   - `getParam(key)` resolution order:
     1. If `node.bindings[key]` is set → returns `u${binding}` (e.g., `"uParamA"`). No slot consumed.
     2. Otherwise → returns `uModularParams[paramCounter++]`. If counter exceeds 64, returns `"0.0"`.

6. **Output wiring:** Finds the edge targeting `root-end`, uses its source node's variable prefix for final output:
   ```glsl
   z.xyz = final_p;
   dr = final_dr;
   if (final_d < 999.0 && final_d > -1.0) {
       distOverride = final_d;   // SDF primitive bypass
   }
   trap = min(trap, length(z.xyz));
   ```

7. **Output:** Returns a complete GLSL function:
   ```glsl
   void formula_Modular(inout vec4 z, inout float dr, inout float trap,
                        inout float distOverride, vec4 c, int i) { ... }
   ```

### 5.2 `updateModularUniforms(pipeline, uniformArray)`

Runtime-only (no recompile). Iterates all nodes in the pipeline in topological order and writes each non-bound parameter value into the `Float32Array` in the same sequential order the compiler used.

```
For each enabled node:
    For each input in node definition:
        If input is bound → skip (compiler also skips)
        Else → write node.params[input.id] (or default) to uniformArray[idx++]
```

**Known caveat:** The compiler applies DCE (skips disconnected nodes) but `updateModularUniforms` iterates all nodes. If a dead node's slider is adjusted, its values write to the wrong indices. In practice this rarely matters — users don't adjust sliders on disconnected nodes. The source code documents this mismatch extensively (lines 141–172) with a potential fix noted.

## 6. Graph Algorithm Utilities (`utils/graphAlg.ts`)

### 6.1 `hasCycle(nodes, edges) → boolean`

DFS-based cycle detection using a visited set and recursion stack. Called before every `addEdge` to reject connections that would create cycles.

### 6.2 `topologicalSort(nodes, edges) → PipelineNode[]`

Kahn's algorithm (BFS with in-degree tracking). The ready queue is **sorted alphabetically by node ID** at each step for deterministic compilation order. Returns `PipelineNode[]` (strips `position` from `GraphNode`).

### 6.3 `pipelineToGraph(pipeline) → FractalGraph`

Converts a linear `PipelineNode[]` (from presets or legacy saves) into a visual graph:
- Assigns positions at `{ x: 250, y: 150 + i * 200 }` (vertical stack, 200px spacing).
- Auto-wires a linear chain: `root-start → node[0] → node[1] → ... → root-end`.

### 6.4 Structural Diff Functions

| Function | Compares | Triggers |
|----------|----------|----------|
| `isStructureEqual(a, b)` | id, type, enabled, bindings, condition | Used by `setGraph()` — if false, increments `pipelineRevision` (shader recompile) |
| `isPipelineEqual(a, b)` | Full JSON equality (including param values) | If false (but structure equal), emits CONFIG for uniform update only |

## 7. Graph Serialization and Persistence

### 7.1 Save Format

When `formula === 'Modular'`, both `graph` and `pipeline` are serialized into the preset object (and thus into GMF files):
```typescript
// In getPreset():
if (s.formula === 'Modular') {
    preset.graph = s.graph;       // Full visual graph with positions
    preset.pipeline = s.pipeline; // Sorted flat array (for the compiler)
}
```

### 7.2 Load Path

On preset load (`applyPresetState()`):
1. If `preset.pipeline` exists → `setPipeline(pipeline)` is called, which:
   - Reconstructs the visual graph via `pipelineToGraph()` (if no `graph` field)
   - Increments `pipelineRevision`
   - Emits `FRACTAL_EVENTS.CONFIG` → triggers recompile
2. `refreshPipeline()` is called at the end for Modular presets to ensure the graph is sorted and compiled.

### 7.3 Preset Bundles

Seven named presets are available in `data/modularPresets.ts`:

| Preset | Nodes | Description |
|--------|-------|-------------|
| Empty Scene | — | Blank canvas |
| Mandelbulb (Standard) | Mod → Rotate → Mandelbulb → AddConstant | Classic Mandelbulb |
| Amazing Box (Classic) | BoxFold → SphereFold → Scale → AddConstant | Mandelbox |
| MixPinski (IFS) | SierpinskiFold → Rotate(z: ParamC) → IFSScale | Tetrahedral IFS |
| Menger Sponge | Abs → MengerFold → Rotate → IFSScale(3) | Classic Menger |
| Kleinian | BoxFold → SphereFold → IFSScale(1.8) → Translate | Kleinian group |
| Marble Marcher | Abs → Rotate(z: ParamC) → MengerFold → Rotate(x: ParamD) → IFSScale | Marble Marcher fractal |

The default pipeline for new Modular sessions is `JULIA_REPEATER_PIPELINE` from `data/initialPipelines.ts` — a Mandelbulb with Mod repeat and tutorial Note nodes.

## 8. Shader Pipeline Integration

### 8.1 End-to-End Compilation Path

```
FractalGraph (user edits in React Flow)
  → FlowEditor.syncToStore()
  → fractalStore.setGraph(graph)
  → topologicalSort(nodes, edges) → PipelineNode[]
  → isStructureEqual() check:
      Structure changed? → pipelineRevision++
      Only params changed? → uniform update only
  → FractalEvents.emit(FRACTAL_EVENTS.CONFIG, { pipeline, graph, pipelineRevision })
  → ConfigManager.update(partialConfig) [on worker thread]
      → rebuildNeeded = (pipelineRevision changed && formula === 'Modular')
  → MaterialController.updateConfig(config)
  → ShaderFactory.generateFragmentShader(config)
      → ShaderBuilder instance
      → CoreMathFeature.inject(builder, config)
          → compileGraph(config.pipeline, config.graph.edges)
          → builder.addFunction(modularGLSL)
          → builder.setFormula('formula_Modular(...)')
          → builder.setDistOverride({...})  // SDF primitive hooks
      → builder.buildFragment() → final GLSL string
  → materialDirect.fragmentShader = newGLSL
  → materialDirect.needsUpdate = true  // GPU recompile
```

### 8.2 CoreMathFeature Integration (`features/core_math.ts`)

`CoreMathFeature` is the DDFS feature that bridges the graph system into the shader pipeline:

1. Registers `uModularParams` as a `float[64]` uniform via `extraUniforms`.
2. In `inject()`, when `formula === 'Modular'`:
   - Adds `#define PIPELINE_REV N` to force a unique shader string per structural change (prevents shader cache from serving stale code).
   - Calls `compileGraph()` → GLSL function string.
   - Adds the function via `builder.addFunction()`.
   - Sets the formula loop body via `builder.setFormula()`.
   - Sets `distOverride` hooks via `builder.setDistOverride()` for SDF primitive support.

### 8.3 SDF Distance Override

When Sphere/Box nodes produce a `_d` value, the `distOverride` mechanism lets SDF results bypass the iterative fractal DE:

```glsl
// Init (before DE loop)
float distOverride = 1e10;

// Inside loop (full-quality pass)
if (distOverride < 999.0) { escaped = true; break; }

// Post-loop (full-quality pass)
if (distOverride < 999.0) { finalD = distOverride; smoothIter = iter; }
```

### 8.4 Uniform Synchronization (Per-Frame)

On every frame (not just recompiles):
```
MaterialController.syncModularUniforms(config.pipeline)
  → updateModularUniforms(pipeline, Float32Array[64])
  → Writes param values to sequential array slots
  → Sets mainUniforms['uModularParams'].value
```

This ensures slider changes are reflected immediately without recompilation.

## 9. The Graph Editor UI

### 9.1 FlowEditor (`components/panels/flow/FlowEditor.tsx`)

Built on **React Flow v11**. Renders three custom node types:

| Node Type | Component | Visual |
|-----------|-----------|--------|
| `shaderNode` | `ShaderNode` | All operation nodes (folds, transforms, etc.) |
| `start` | `StartNode` | Green pill: "Input (Z)" |
| `end` | `EndNode` | Pink pill: "Output (Distance)" |

**Two-way synchronization:**
- **Store → Flow** (`storeToFlow`): Triggered on mount and when `pipelineRevision` changes (external edits, preset loads, undo). Translates `FractalGraph` into React Flow state. Uses `ignoreNextUpdate` ref to prevent the resulting `syncToStore` from re-triggering.
- **Flow → Store** (`syncToStore`): Called after every user interaction (connect, drag, delete, param change). Extracts `GraphNode[]` from React Flow, calls `actions.setGraph()`.

**Toolbar controls:**
- "Add Node" dropdown — grouped by category from `nodeRegistry.getGrouped()`
- "Load Preset" dropdown — from `MODULAR_PRESETS`
- "Auto Compile" checkbox — when off, structural changes don't auto-recompile
- "Preview Mode" checkbox — lower-quality preview for faster iteration
- "COMPILE" button — calls `refreshPipeline()`. Pulses amber when auto-compile is off and changes are pending.

### 9.2 ShaderNode (`components/panels/flow/ShaderNode.tsx`)

Each node renders as a card with:
- **Color-coded header** by category: pink (Fractals), amber (Folds), blue (Transforms/Distortion), green (CSG)
- **Handles:** Single top target + single bottom source for normal nodes. CSG nodes get two top handles (A left, B right).
- **Body:** `NodeParams` component with sliders, binding toggles, and condition controls.
- **Enable/disable** toggle and delete button.

### 9.3 NodeParams (`components/panels/node-editor/NodeParams.tsx`)

Renders parameter sliders with optional binding toggles:
- Each slider has a link icon. When bound, label shows `"Label (Bound to ParamX)"` with cyan highlight.
- Note nodes render a `<textarea>` instead of sliders.
- **Condition section:** Collapsible "Logic / Condition" at the bottom. When active, shows `Modulo` (1–10) and `Remainder` (0 to mod-1) sliders with a preview: `if (iter % Mod == Rem)`.

### 9.4 GraphContextMenu (`components/panels/flow/GraphContextMenu.tsx`)

Right-click context menu for adding nodes:
- Search input auto-focuses on open.
- Filters all registered nodes by id/label match.
- Enter key adds the first match at the click position.
- Default view shows nodes grouped by category.
- Repositions itself to stay within viewport bounds.

## 10. Store Integration (`store/fractalStore.ts`)

### 10.1 State Fields

| Field | Type | Purpose |
|-------|------|---------|
| `formula` | `string` | `'Modular'` activates the graph system |
| `pipeline` | `PipelineNode[]` | Topologically sorted node array (drives compiler + uniform sync) |
| `pipelineRevision` | `number` | Incremented on structural changes; triggers shader recompile |
| `graph` | `FractalGraph` | Full visual graph with positions and edges |
| `autoCompile` | `boolean` | Whether structural changes auto-trigger recompilation |

### 10.2 Key Actions

**`setGraph(g: FractalGraph)`** — called by FlowEditor on every interaction:
1. `topologicalSort(g.nodes, g.edges)` → sorted pipeline.
2. `isStructureEqual(old, new)`:
   - **Structure changed + autoCompile on:** `pipelineRevision++` → emits CONFIG → recompile.
   - **Structure changed + autoCompile off:** Updates graph only. No compile until user clicks COMPILE.
   - **Only param values changed:** Updates pipeline + graph → emits CONFIG without revision increment → uniform update only (instant).

**`setPipeline(p: PipelineNode[])`** — used by preset loader:
1. Always increments `pipelineRevision`.
2. Reconstructs visual graph via `pipelineToGraph(p)`.
3. Emits CONFIG → recompile.

**`refreshPipeline()`** — manual compile trigger:
1. Re-runs `topologicalSort()` on current graph.
2. Increments `pipelineRevision`.
3. Emits CONFIG → recompile.

## 11. Integration with Animation System

The modular graph connects to the animation/keyframe system through **bindings**:

1. **Bound parameters** resolve to named uniforms (`uParamA`–`uParamF`) which are standard `CoreMathState` fields.
2. These can be keyframed via animation tracks (e.g., `coreMath.paramA`).
3. The animation engine drives the uniform value each frame → the bound node param animates.

**Unbound parameters** (in the `uModularParams` array) cannot currently be keyframed individually — they update live via slider interaction only.

**Slider-driven live updates (unbound params):**
```
Slider drag → handleUpdateParams(id, params)
  → syncToStore() → setGraph()
  → isPipelineEqual check → values differ
  → FractalEvents.CONFIG (no pipelineRevision bump)
  → ConfigManager: uniformUpdate = true
  → syncModularUniforms() → uModularParams Float32Array updated
  → GPU sees new values next frame (no recompile)
```

## 12. Conditional Execution (Per-Iteration Logic)

Each node has an optional `condition` field:
```typescript
condition: {
    active: boolean;
    mod: number;   // Every N iterations
    rem: number;   // On iteration index (0-based)
}
```

When active, the compiler wraps the node's GLSL in:
```glsl
if ( (i - (i/3)*3) == 1 ) {   // Example: mod=3, rem=1
    // Node code only runs on iterations 1, 4, 7, 10, ...
}
```

This enables **hybrid fractals** — different operations on different iterations of the fractal loop. For example: BoxFold on even iterations, SphereFold on odd ones.

## 13. Error Handling

| Scenario | Behavior |
|----------|----------|
| Empty/disconnected graph | `compileGraph` returns a safe no-op formula (`z += c; trap = length(z)`) |
| Unknown node type | `nodeRegistry.get()` returns `undefined`; compiler skips code generation. UI shows `"Unknown Node Type: X"` in red. |
| Cycle in graph | `hasCycle()` checked before every `addEdge`. Connection is rejected if it would create a cycle. |
| Param overflow (>64) | `getParam()` returns `"0.0"` literal instead of crashing |
| Shader cache hit | `MaterialController` uses `cyrb53` hash of GLSL string. If hash matches, skips GPU recompile. |
| Two-stage compilation | Preview shader renders immediately while full shader compiles async. Generation counter cancels stale compiles. |

## 14. Example: Building a Menger Sponge

Here's how the preset "Menger Sponge" translates through the system:

### Graph Structure
```
root-start → Abs → MengerFold → Rotate → IFSScale(scale=3) → root-end
```

### Compiled GLSL Output
```glsl
void formula_Modular(inout vec4 z, inout float dr, inout float trap,
                     inout float distOverride, vec4 c, int i) {
    // --- Graph Init ---
    vec3 v_start_p = z.xyz;
    float v_start_d = 1000.0;
    float v_start_dr = dr;
    
    // Node: Abs
    vec3 v_abs1_p = v_start_p;
    float v_abs1_d = v_start_d;
    float v_abs1_dr = v_start_dr;
    v_abs1_p = abs(v_abs1_p);

    // Node: MengerFold
    vec3 v_mfold1_p = v_abs1_p;
    float v_mfold1_d = v_abs1_d;
    float v_mfold1_dr = v_abs1_dr;
    if(v_mfold1_p.x < v_mfold1_p.y) v_mfold1_p.xy = v_mfold1_p.yx;
    if(v_mfold1_p.x < v_mfold1_p.z) v_mfold1_p.xz = v_mfold1_p.zx;
    if(v_mfold1_p.y < v_mfold1_p.z) v_mfold1_p.yz = v_mfold1_p.zy;

    // Node: Rotate
    vec3 v_rot1_p = v_mfold1_p;
    float v_rot1_d = v_mfold1_d;
    float v_rot1_dr = v_mfold1_dr;
    {
        vec3 rot = vec3(radians(uModularParams[0]), radians(uModularParams[1]),
                        radians(uModularParams[2]));
        if(abs(rot.x)>0.001) { ... }
        if(abs(rot.y)>0.001) { ... }
        if(abs(rot.z)>0.001) { ... }
    }

    // Node: IFSScale
    vec3 v_ifs1_p = v_rot1_p;
    float v_ifs1_d = v_rot1_d;
    float v_ifs1_dr = v_rot1_dr;
    {
        float scale = uModularParams[3];        // scale = 3.0
        float off = uModularParams[4];          // offset = 1.0
        v_ifs1_p = v_ifs1_p * scale - vec3(off * (scale - 1.0));
        v_ifs1_dr *= abs(scale);
    }

    z.xyz = v_ifs1_p;
    dr = v_ifs1_dr;
    float final_d = v_ifs1_d;
    if (final_d < 999.0 && final_d > -1.0) {
        distOverride = final_d;
    }
    trap = min(trap, length(z.xyz));
}
```

**Uniform mapping:** Rotate's three axis params → `uModularParams[0..2]`, IFSScale's scale/offset → `uModularParams[3..4]`. Total: 5 of 64 slots used. Abs and MengerFold have no params so consume no slots.

## 15. Key Files Reference

| File | Role |
|------|------|
| `types/graph.ts` | Core type definitions |
| `engine/NodeRegistry.ts` | Singleton node type registry |
| `data/nodes/definitions.ts` | All 24 node type registrations with GLSL |
| `utils/GraphCompiler.ts` | JIT GLSL code generation + uniform updater |
| `utils/graphAlg.ts` | Cycle detection, topological sort, structural diff |
| `features/core_math.ts` | DDFS feature that calls `compileGraph()` and injects into ShaderBuilder |
| `formulas/Modular.ts` | Stub `FractalDefinition` (shader fields empty — intercepted by CoreMathFeature) |
| `data/modularPresets.ts` | Seven named preset pipelines |
| `data/initialPipelines.ts` | Default pipelines with tutorial Notes |
| `data/constants.ts` | `MAX_MODULAR_PARAMS = 64`, `FORMULA_ID_MODULAR = 14` |
| `components/panels/flow/FlowEditor.tsx` | React Flow graph editor |
| `components/panels/flow/ShaderNode.tsx` | Node rendering (ShaderNode, StartNode, EndNode) |
| `components/panels/flow/GraphContextMenu.tsx` | Right-click add-node search popup |
| `components/panels/node-editor/NodeParams.tsx` | Parameter sliders, binding toggles, condition UI |
| `engine/ShaderConfig.ts` | `ShaderConfig` interface (includes `pipeline`, `graph`, `pipelineRevision`) |
| `engine/UniformNames.ts` | `Uniforms.ModularParams = 'uModularParams'` |
