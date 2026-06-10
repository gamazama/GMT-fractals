import{aa as h}from"./toastStore-D9E9kUoO.js";const S=a=>a.charAt(0).toUpperCase()+a.slice(1).replace(/-/g," "),y=(a,e,t={})=>{const i=t.defaultIndex??0,r=a.map((l,c)=>{var o,n;return{label:((o=t.optionLabels)==null?void 0:o[l])??S(l),value:c,hint:(n=t.optionHints)==null?void 0:n[l]}});return{config:{type:"float",default:i,label:e,options:r,...t.extra},fromIndex:l=>{const c=Math.floor(l??i);return c<0||c>=a.length||Number.isNaN(c)?a[i]:a[c]},values:a}},b=`
  /*
   * --- GMT SHADER API REFERENCE ---
   *
   * Scalar Parameters (float uniforms — mapped to UI sliders):
   *   uParamA, uParamB, uParamC, uParamD, uParamE, uParamF
   *
   * Vector Parameters (mapped to multi-axis UI controls):
   *   vec2 uVec2A, uVec2B, uVec2C
   *   vec3 uVec3A, uVec3B, uVec3C
   *   vec4 uVec4A, uVec4B, uVec4C
   *
   * System Uniforms:
   *   int   uIterations      — Iteration count (user-adjustable)
   *   float uTime            — Elapsed time in seconds
   *   vec3  uJulia           — Julia seed coordinates (if Julia mode active)
   *   float uJuliaMode       — 1.0 if Julia mode active, 0.0 otherwise
   *   float uDistanceMetric  — 0=Euclidean, 1=Chebyshev, 2=Manhattan, 3=Quartic
   *
   * Built-in Helper Functions:
   *   void  sphereFold(inout vec3 z, inout float dz, float minR, float fixedR)
   *   void  boxFold(inout vec3 z, inout float dz, float foldLimit)
   *   float snoise(vec3 v)                — Simplex Noise (-1.0 to 1.0)
   *   float getLength(vec3 p)             — Distance metric (respects uDistanceMetric)
   *
   * Rotation Helpers (branchless, CPU-precomputed matrices):
   *   void applyPreRotation(inout vec3 p)   — Applied inside loop, before formula
   *   void applyPostRotation(inout vec3 p)  — Applied inside loop, after formula
   *   void applyWorldRotation(inout vec3 p) — Applied before iteration loop
   *
   * Formula Function Signature:
   *   void formula_NAME(inout vec4 z, inout float dr, inout float trap, vec4 c)
   *     z    : Current coordinate (.xyz = position, .w = auxiliary)
   *     dr   : Running derivative (float) — used for distance estimation
   *     trap : Orbit trap accumulator (float) — used for coloring
   *     c    : Constant for the fractal (Julia seed or initial position)
   *
   * To modify this formula, edit the GLSL blocks below directly.
   * The Metadata JSON block configures parameter names, ranges, and defaults.
   */
`,f=a=>JSON.stringify(a,null,2).replace(/\{\n\s+"label":[\s\S]+?\}/g,e=>e.includes('"id": "param')?e.replace(/\n\s+/g," "):e).replace(/"(cameraPos|cameraRot|sceneOffset|julia|position)": \{\n\s+"[xyz]":[\s\S]+?\}/g,e=>e.replace(/\n\s+/g," ")).replace(/"params": \{\n\s+"A":[\s\S]+?\}/g,e=>e.replace(/\n\s+/g," ")),u=a=>{const e=a.split(`
`);for(;e.length>0&&e[0].trim()==="";)e.shift();for(;e.length>0&&e[e.length-1].trim()==="";)e.pop();if(e.length===0)return"";if(e.length===1)return e[0].trim();let t=1/0;for(const i of e){if(i.trim().length===0)continue;const r=i.match(/^(\s*)/);r&&(t=Math.min(t,r[1].length))}return t===0||t===1/0?e.join(`
`):e.map(i=>i.slice(t)).join(`
`)},g=(a,e)=>{var l;const{shader:t,...i}=a,r={};(l=t.preambleVars)!=null&&l.length&&(r.preambleVars=t.preambleVars),t.usesSharedRotation&&(r.usesSharedRotation=!0),t.supportsCuttingPlane&&(r.supportsCuttingPlane=!0),t.selfContainedSDE&&(r.selfContainedSDE=!0),t.capabilities&&t.capabilities.size>0&&(r.capabilities=[...t.capabilities].sort());const d={...i,...Object.keys(r).length>0?{shaderMeta:r}:{},defaultPreset:e};let s=`<!--
  GMF: GPU Mandelbulb Format v1.0
  A portable container for Fractal math definitions + default presets.
  You can edit the GLSL blocks below directly.
-->
${b}
`;return s+=`<Metadata>
${f(d)}
</Metadata>

`,t.preamble&&(s+=`<!-- Global scope code: variables and helper functions (before formula) -->
`,s+=`<Shader_Preamble>
${u(t.preamble)}
</Shader_Preamble>

`),t.loopInit&&(s+=`<!-- Code executed once before the loop (Setup) -->
`,s+=`<Shader_Init>
${u(t.loopInit)}
</Shader_Init>

`),s+=`<!-- Main Distance Estimator Function -->
`,s+=`<Shader_Function>
${u(t.function)}
</Shader_Function>

`,s+=`<!-- The Iteration Loop Body -->
`,s+=`<Shader_Loop>
${u(t.loopBody)}
</Shader_Loop>

`,t.getDist&&(s+=`<!-- Optional: Custom Distance/Iteration Smoothing -->
`,s+=`<Shader_Dist>
${u(t.getDist)}
</Shader_Dist>

`),s},M=a=>{const e=n=>{const m=new RegExp(`<${n}>([\\s\\S]*?)<\\/${n}>`),p=a.match(m);return p?p[1].trim():null},t=e("Metadata");if(!t){try{const n=JSON.parse(a);if(n.id&&n.shader)return n}catch{}throw new Error("Invalid GMF: Missing Metadata tag")}const i=JSON.parse(t),r=e("Shader_Preamble"),d=e("Shader_Function"),s=e("Shader_Loop"),l=e("Shader_Init"),c=e("Shader_Dist");if((!d||!s)&&i.id!=="Modular")throw new Error("Invalid GMF: Missing essential shader blocks (<Shader_Function> or <Shader_Loop>)");const o={function:d??"",loopBody:s??"",preamble:r||void 0,loopInit:l||void 0,getDist:c||void 0};if(i.shaderMeta&&(i.shaderMeta.preambleVars&&(o.preambleVars=i.shaderMeta.preambleVars),i.shaderMeta.usesSharedRotation&&(o.usesSharedRotation=!0),i.shaderMeta.supportsCuttingPlane&&(o.supportsCuttingPlane=!0),i.shaderMeta.selfContainedSDE&&(o.selfContainedSDE=!0),Array.isArray(i.shaderMeta.capabilities)&&(o.capabilities=new Set(i.shaderMeta.capabilities)),delete i.shaderMeta),!o.supportsCuttingPlane){const n=`${o.function} ${o.loopBody} ${o.preamble||""} ${o.loopInit||""}`;/\bcp_(dmin|scale|trap)\b/.test(n)&&(o.supportsCuttingPlane=!0)}if(!o.capabilities){const n=new Set;i.id==="Modular"?n.add("shape:modular"):(n.add(o.selfContainedSDE?"shape:self-contained":"shape:per-iteration"),o.usesSharedRotation&&n.add("iter:shared-rotation"),o.supportsCuttingPlane&&n.add("estimator:cutting-plane")),o.capabilities=n}return{...i,shader:o}},P=a=>{const e=a.trimStart();return e.startsWith("<!--")||e.startsWith("<Metadata>")},C=a=>{const e=h.get(a.formula);if(!e)return JSON.stringify(a,null,2);let t=g(e,e.defaultPreset);return t+=`<!-- Full scene state (camera, lights, features, quality, animations) -->
`,t+=`<Scene>
${f(a)}
</Scene>
`,t},F=a=>{if(P(a)){const t=M(a),i=a.match(/<Scene>([\s\S]*?)<\/Scene>/);if(i){const d=JSON.parse(i[1].trim());return{def:t,preset:d}}const r=t.defaultPreset||{formula:t.id};return r.formula||(r.formula=t.id),{def:t,preset:r}}return{preset:JSON.parse(a)}};export{y as d,g,F as l,C as s};
