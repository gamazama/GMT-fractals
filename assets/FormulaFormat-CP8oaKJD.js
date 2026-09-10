import{bK as g,bL as y,bh as b,bi as M}from"./paletteFiltersPersist-CdlRZwuJ.js";import{r as v}from"./accordionReveal-BI7romxl.js";const E=a=>({id:"Favients",dock:a.dock,order:a.order??90,component:"panel-favients",isCore:!1}),L=(a={})=>{var r,n,l,i;const e=typeof window<"u"?window.innerHeight:800,t=a.storageKey?{storageKey:a.storageKey}:void 0;g({x:((r=a.float)==null?void 0:r.x)??20,y:((n=a.float)==null?void 0:n.y)??Math.max(20,Math.round(e/2-160)),w:((l=a.float)==null?void 0:l.w)??296,h:((i=a.float)==null?void 0:i.h)??320,open:a.open??!0,location:a.location,order:a.order},t),y(t),a.paletteFilters!==!1&&(b(),M())},O=()=>{window.open("gradient-explorer.html","_blank","noopener")},I=`
/*
 * ============================================================
 *  GMT FRACTAL FORMULA — .gmf AUTHORING KIT
 *  Full guide: https://gmt-fractals.com/learn/create-formula
 * ============================================================
 *
 * This file is a GMF (GPU Mandelbulb Format) container. It holds a fractal
 * definition you can edit by hand or with an LLM, then drag-and-drop or paste
 * back into the GMT app to register and render it.
 *
 * ---- FILE STRUCTURE ----
 * A GMF is plain text. The loader reads these blocks (order is fixed; tags are
 * literal). Only <Metadata>, <Shader_Function> and <Shader_Loop> are required.
 *
 *   <Metadata> ... </Metadata>
 *       JSON describing the formula. Required keys:
 *         "id"          unique formula id (no spaces), e.g. "MyBulb"
 *         "name"        display name
 *         "parameters"  array of UI controls (see PARAMETERS below); use null
 *                       for an unused slot
 *         "defaultPreset" initial scene (camera, lights, feature values). At
 *                       minimum: { "formula":"<id>", "features": {
 *                       "coreMath": { "iterations": 10, ...params },
 *                       "quality": { "estimator": 0, "fudgeFactor": 0.5,
 *                       "maxSteps": 300 } } }
 *       Optional keys: "shortDescription", "description", "juliaType"
 *       ("julia" | "offset" | "none"), "tags".
 *       Optional "shaderMeta": { "selfContainedSDE": true, "preambleVars":[...] }
 *       — see MUST-DO #4. Do NOT hand-write a "capabilities" field; the loader
 *       derives it from the shader automatically.
 *
 *   <Shader_Preamble> ... </Shader_Preamble>   (optional)
 *       Global-scope GLSL: helper functions and mutable globals. Runs once at
 *       compile. You CANNOT call gmt_* transform helpers from here (declared
 *       later) — call them from <Shader_Init>.
 *
 *   <Shader_Init> ... </Shader_Init>           (optional)
 *       GLSL run once before the iteration loop. In scope: z, c, dr, trap, iter.
 *       Typical use: precalc, e.g.  gmt_precalcRodrigues(uVec3B);
 *
 *   <Shader_Function> ... </Shader_Function>    (REQUIRED)
 *       Your formula function. Signature is fixed:
 *         void formula_<id>(inout vec4 z, inout float dr, inout float trap, vec4 c)
 *
 *   <Shader_Loop> ... </Shader_Loop>            (REQUIRED)
 *       The single call placed inside the engine's iteration loop, usually:
 *         formula_<id>(z, dr, trap, c);
 *
 *   <Shader_Dist> ... </Shader_Dist>            (optional — usually OMIT)
 *       The BODY of the estimator. The engine wraps your block as
 *         vec2 getDist(float r, float dr, float iter, vec4 z) { <your block> }
 *       so write STATEMENTS ONLY — do NOT include the "vec2 getDist(...)" line or
 *       any function definition (GLSL has no nested functions → won't compile) —
 *       and END with:  return vec2(distance, smoothIteration);   // a vec2, not a float
 *       Most formulas should OMIT this and just set defaultPreset.quality.estimator.
 *
 * ---- THE FORMULA FUNCTION ----
 *   z    : current point. z.xyz = position, z.w = 4th dimension (init from uParamB)
 *   dr   : running derivative for distance estimation. Starts at 1.0
 *   trap : orbit-trap accumulator for colour. Starts at 1e10
 *   c    : iteration constant. Mandelbrot: c = initial z. Julia: c = vec4(uJulia, uParamA)
 *   The engine runs the loop and handles escape/bailout — do NOT loop or check
 *   escape yourself (unless you use the self-contained pattern, MUST-DO #4).
 *
 * ---- MUST DO (or it renders wrong / black) ----
 *   1. UPDATE dr every call to match your math, or the surface is garbage:
 *        power fractal:  dr = power * pow(max(r,1e-10), power-1.0) * dr + 1.0;
 *        IFS / fold:     dr *= abs(scale);   (accumulate per fold stage)
 *   2. UPDATE trap with a POSITIVE distance (the colourer clamps <=0 to a floor):
 *        trap = min(trap, length(z.xyz));   // or dot(z.xyz,z.xyz)
 *      Never feed log-distances or negatives into trap.
 *   3. HANDLE Julia mode for power fractals:
 *        if (uJuliaMode > 0.5) z.xyz += c.xyz;   // add the constant
 *      (Set "juliaType":"offset" for fold/IFS fractals, "none" to hide the toggle.)
 *   4. PREFER per-iteration. Write ONE step of the iteration and let the engine
 *      run the loop. Only if the math genuinely cannot be decomposed: let your
 *      <Shader_Loop> own its own loop, end it with break;, and you MUST set
 *      "shaderMeta": { "selfContainedSDE": true } in <Metadata>. Read uIterations
 *      as int(uIterations) to cap your internal loop, and encode trap/iteration
 *      yourself. Self-contained DISABLES hybrid / interlace / burning-ship — it
 *      strictly reduces what the engine can do, so use it only as a last resort.
 *
 * ---- UNIFORMS (read-only inputs) ----
 *  Scalar params (UI sliders):  float uParamA uParamB uParamC uParamD uParamE uParamF
 *  Vector params:               vec2 uVec2A/B/C   vec3 uVec3A/B/C   vec4 uVec4A/B/C
 *  GOTCHA: uParamB initialises z.w (4D), and uParamA becomes c.w in Julia mode.
 *          Prefer uParamC..F for ordinary scalars unless you want that.
 *  System:
 *    float uIterations     max iterations (cap loops with int(uIterations))
 *    float uJuliaMode      >0.5 = Julia, else Mandelbrot
 *    vec3  uJulia          Julia seed (xyz)
 *    float uDistanceMetric 0=Euclidean 1=Chebyshev 2=Manhattan 3=Minkowski-4(L4)
 *    float uEscapeThresh   colouring escape radius (default 4.0)  — colouring only
 *    float uDeBailout      raymarch DE bailout |z|^2 (default 100.0) — geometry
 *    float uTime           seconds — AVOID in the formula body (breaks accumulation)
 *
 * ---- HELPER FUNCTIONS (call freely) ----
 *    void  sphereFold(inout vec3 z, inout float dz, float minR, float fixedR)
 *    void  boxFold(inout vec3 z, inout float dz, float foldLimit)
 *    float getLength(vec3 p)        distance metric (respects uDistanceMetric)
 *    float snoise(vec3 v)           3D simplex noise, -1..1
 *    vec4  textureLod0(sampler2D t, vec2 uv)
 *    (sphereFold / boxFold take the running derivative dr as their 2nd argument.)
 *  Rodrigues AXIS-ANGLE rotation (call gmt_precalcRodrigues from <Shader_Init>, apply inside):
 *    void  gmt_precalcRodrigues(vec3 params)   params = (azimuth, pitch, angle)
 *    void  gmt_applyRodrigues(inout vec3 p)
 *    void  gmt_applyTwist(inout vec3 p, float amount)
 *  NO per-axis rotation helpers exist (gmt_rotate_x/y/z, rotX… do NOT exist and
 *  will not compile). Rotate around an axis with an inline 2x2 matrix:
 *    float ca=cos(a), sa=sin(a); p.xy = mat2(ca, sa, -sa, ca) * p.xy;  // around Z
 *    (around X -> rotate p.yz ; around Y -> rotate p.xz)
 *  Constants: PI, TAU, INV_PI, INV_TAU, phi (golden ratio).
 *  GLSL ES 3.0 note: do NOT initialise \`const\` with sqrt()/normalize()/cos();
 *  use a non-const global set in a precalc function instead.
 *  ENGINE-INTERNAL (applied automatically by the DE loop — do NOT call these as
 *  your rotation control): applyPreRotation / applyPostRotation / applyWorldRotation.
 *
 * ---- BUILT-IN ESTIMATORS (defaultPreset.quality.estimator) ----
 *    0 Analytic/Log  0.5*r*ln(r)/dr   power fractals (Mandelbulb)
 *    1 Linear        (r-1.0)/dr       IFS / box-fold (Menger, Sierpinski)
 *    2 Pseudo        r/dr             sparse / artistic
 *    3 Dampened      0.5*r*ln(r)/(dr+8) fixes slicing on thin structures
 *    4 Linear(2.0)   (r-2.0)/dr       classic Menger offset
 *  (5 Cutting-Plane is formula-gated; ignore for normal formulas.)
 *  fudgeFactor ("Step Size"): default 1.0. Use ~0.5 for hand-written
 *  DEs — values <1 take smaller raymarch steps so an imperfect/overestimating
 *  estimator doesn't overshoot the surface (which shows as flat "slices"/holes).
 *
 * To modify this formula: edit the GLSL blocks and the <Metadata> JSON below,
 * then drag this file onto the app or paste it via "Modify with AI".
 */
`,m=a=>JSON.stringify(a,null,2).replace(/\{\n\s+"label":[\s\S]+?\}/g,e=>e.includes('"id": "param')?e.replace(/\n\s+/g," "):e).replace(/"(cameraPos|cameraRot|sceneOffset|julia|position)": \{\n\s+"[xyz]":[\s\S]+?\}/g,e=>e.replace(/\n\s+/g," ")).replace(/"params": \{\n\s+"A":[\s\S]+?\}/g,e=>e.replace(/\n\s+/g," ")),u=a=>{const e=a.split(`
`);for(;e.length>0&&e[0].trim()==="";)e.shift();for(;e.length>0&&e[e.length-1].trim()==="";)e.pop();if(e.length===0)return"";if(e.length===1)return e[0].trim();let t=1/0;for(const r of e){if(r.trim().length===0)continue;const n=r.match(/^(\s*)/);n&&(t=Math.min(t,n[1].length))}return t===0||t===1/0?e.join(`
`):e.map(r=>r.slice(t)).join(`
`)},w=(a,e)=>{var p,h;const{shader:t,...r}=a,n={};(p=t.preambleVars)!=null&&p.length&&(n.preambleVars=t.preambleVars),t.capabilities&&t.capabilities.size>0&&(n.capabilities=[...t.capabilities].sort()),(h=t.derivedRotations)!=null&&h.length&&(n.derivedRotations=t.derivedRotations);const l={...r,...Object.keys(n).length>0?{shaderMeta:n}:{},defaultPreset:e};let i=`<!--
  GMF: GPU Mandelbulb Format v1.0
  A portable container for Fractal math definitions + default presets.
  You can edit the GLSL blocks below directly.
-->
${I}
`;return i+=`<Metadata>
${m(l)}
</Metadata>

`,t.preamble&&(i+=`<!-- Global scope code: variables and helper functions (before formula) -->
`,i+=`<Shader_Preamble>
${u(t.preamble)}
</Shader_Preamble>

`),t.loopInit&&(i+=`<!-- Code executed once before the loop (Setup) -->
`,i+=`<Shader_Init>
${u(t.loopInit)}
</Shader_Init>

`),i+=`<!-- Main Distance Estimator Function -->
`,i+=`<Shader_Function>
${u(t.function)}
</Shader_Function>

`,i+=`<!-- The Iteration Loop Body -->
`,i+=`<Shader_Loop>
${u(t.loopBody)}
</Shader_Loop>

`,t.getDist&&(i+=`<!-- Optional: Custom Distance/Iteration Smoothing -->
`,i+=`<Shader_Dist>
${u(t.getDist)}
</Shader_Dist>

`),i},F=a=>{const e=c=>{const S=new RegExp(`^<${c}>([\\s\\S]*?)^<\\/${c}>`,"m"),f=a.match(S);return f?f[1].trim():null},t=e("Metadata");if(!t){try{const c=JSON.parse(a);if(c.id&&c.shader)return c}catch{}throw new Error("Invalid GMF: Missing Metadata tag")}const r=JSON.parse(t),n=e("Shader_Preamble"),l=e("Shader_Function"),i=e("Shader_Loop"),p=e("Shader_Init"),h=e("Shader_Dist");if((!l||!i)&&r.id!=="Modular")throw new Error("Invalid GMF: Missing essential shader blocks (<Shader_Function> or <Shader_Loop>)");const d={function:l??"",loopBody:i??"",preamble:n||void 0,loopInit:p||void 0,getDist:h||void 0},o=r.shaderMeta;o!=null&&o.preambleVars&&(d.preambleVars=o.preambleVars),Array.isArray(o==null?void 0:o.derivedRotations)&&o.derivedRotations.length&&(d.derivedRotations=o.derivedRotations);const s=new Set(Array.isArray(o==null?void 0:o.capabilities)?o.capabilities:[]);if(r.id==="Modular")s.add("shape:modular");else{o!=null&&o.selfContainedSDE&&s.add("shape:self-contained"),o!=null&&o.usesSharedRotation&&s.add("iter:shared-rotation"),o!=null&&o.supportsCuttingPlane&&s.add("estimator:cutting-plane");const c=`${d.function} ${d.loopBody} ${d.preamble||""} ${d.loopInit||""}`;/\bcp_(dmin|scale|trap)\b/.test(c)&&s.add("estimator:cutting-plane"),/\bg_difsDE\b/.test(d.preamble||"")&&s.add("estimator:difs"),s.has("shape:self-contained")?s.delete("shape:per-iteration"):s.add("shape:per-iteration")}return d.capabilities=s,o&&delete r.shaderMeta,{...r,shader:d}},T=a=>{const e=a.trimStart();return e.startsWith("<!--")||e.startsWith("<Metadata>")},D=a=>{const e=v.get(a.formula);if(!e)return JSON.stringify(a,null,2);let t=w(e,e.defaultPreset);return t+=`<!-- Full scene state (camera, lights, features, quality, animations) -->
`,t+=`<Scene>
${m(a)}
</Scene>
`,t},R=a=>{if(T(a)){const t=F(a),r=a.match(/^<Scene>([\s\S]*?)^<\/Scene>/m);if(r){const l=JSON.parse(r[1].trim());return{def:t,preset:l}}const n=t.defaultPreset||{formula:t.id};return n.formula||(n.formula=t.id),{def:t,preset:n}}return{preset:JSON.parse(a)}};export{E as f,w as g,R as l,L as m,O as o,D as s};
