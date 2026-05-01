var M=Object.defineProperty;var _=(t,e,a)=>e in t?M(t,e,{enumerable:!0,configurable:!0,writable:!0,value:a}):t[e]=a;var f=(t,e,a)=>_(t,typeof e!="symbol"?e+"":e,a);import{f as h,e as D,F as p,h as g,u as m}from"./CollapsibleSection-DrZDtHQ-.js";import{r as v,j as l,R as j}from"./three-fiber-GKfjny8F.js";import{k as $,l as k,m as S,n as w,v as R,o as B,S as O,E as N,D as V,b as G,P as H,T as q,d as X,e as Y,G as W,a as Q,f as Z,r as K,q as J,i as ee,g as te,t as ae,h as oe,j as ie}from"./Undo-B0_gYdxL.js";import{V as re,i as ne,c as se}from"./Camera-a5f_XNB-.js";import{c as le}from"./three-drei-2g7QvUdQ.js";import{C as ce}from"./CompilingIndicator-DW7GO--w.js";import{r as fe}from"./cameraKeyRegistry-S2N1Mm9x.js";import"./three-DQWx7qFd.js";import"./pako-DwGzBETv.js";const u=new Map,A=t=>{if(u.has(t.id))throw new Error(`[formulaRegistry] duplicate formula id: ${t.id}`);u.set(t.id,t);const e=t.id.toLowerCase(),a={id:e,name:t.name,category:"Fractal",tabConfig:{label:t.name},params:t.params};h.register(a),$(t.name)||k({id:t.name,dock:"right",order:0,active:!0,features:[e]})},d={get:t=>u.get(t),getAll:()=>Array.from(u.values()),has:t=>u.has(t),resolve:t=>t&&u.has(t)?u.get(t):u.values().next().value},me=`
void formula_Mandelbulb(inout vec4 z, inout float dr, vec4 c) {
    vec3 z3 = z.xyz;
    float r = length(z3);

    // Standard derivative — reuse pow(r, power-1) for both dr and zr.
    float power = uPower;
    float rp1 = pow(r, power - 1.0);
    dr = rp1 * power * dr + 1.0;

    // Spherical exponentiation.
    float theta = acos(clamp(z3.z / r, -1.0, 1.0));
    float phi   = atan(z3.y, z3.x);

    theta = theta * power + uPhaseTheta;
    phi   = phi   * power + uPhasePhi;

    float zr = rp1 * r;
    z3 = zr * vec3(sin(theta) * cos(phi),
                   sin(phi)   * sin(theta),
                   cos(theta));

    // Optional Z-twist.
    if (abs(uTwist) > 0.001) {
        float t = z3.z * uTwist;
        float s = sin(t);
        float cc = cos(t);
        z3.xy = mat2(cc, -s, s, cc) * z3.xy;
    }

    z3 += c.xyz;

    // Radiolaria mutation (Tom Beddard) — applied after iteration step.
    if (uRadiolariaEnabled > 0.5) {
        z3.y = min(z3.y, uRadiolariaLimit);
    }

    z.xyz = z3;
}
`,ue={id:"Mandelbulb",name:"Mandelbulb",description:"The classic 3D extension of the Mandelbrot set. Power controls plus the Radiolaria mutation for skeletal/hollow effects.",glsl:me,call:"formula_Mandelbulb(z, dr, c);",uniforms:[{name:"uIterations",type:"int"},{name:"uPower",type:"float"},{name:"uPhaseTheta",type:"float"},{name:"uPhasePhi",type:"float"},{name:"uTwist",type:"float"},{name:"uRadiolariaEnabled",type:"float"},{name:"uRadiolariaLimit",type:"float"}],params:{iterations:{type:"int",default:16,min:4,max:32,step:1,label:"Iterations"},power:{type:"float",default:8,min:2,max:16,step:.01,label:"Power"},phaseTheta:{type:"float",default:0,min:-6.28,max:6.28,step:.01,label:"Phase θ"},phasePhi:{type:"float",default:0,min:-6.28,max:6.28,step:.01,label:"Phase φ"},twist:{type:"float",default:0,min:-2,max:2,step:.01,label:"Z Twist"},radiolariaEnabled:{type:"boolean",default:!1,label:"Radiolaria"},radiolariaLimit:{type:"float",default:.5,min:-2,max:2,step:.01,label:"Radiolaria Limit"}},pushUniforms:(t,e)=>{t.setI("uIterations",e.iterations??16),t.setF("uPower",e.power??8),t.setF("uPhaseTheta",e.phaseTheta??0),t.setF("uPhasePhi",e.phasePhi??0),t.setF("uTwist",e.twist??0),t.setF("uRadiolariaEnabled",e.radiolariaEnabled?1:0),t.setF("uRadiolariaLimit",e.radiolariaLimit??.5)}},de=`
void formula_Mandelbox(inout vec4 z, inout float dr, vec4 c) {
    vec3 z3 = z.xyz;

    // Box fold: reflect components outside [-foldLimit, +foldLimit].
    z3 = clamp(z3, -uFoldLimit, uFoldLimit) * 2.0 - z3;

    // Sphere fold: invert shell between minR and fixedR.
    float r2 = dot(z3, z3);
    float minR2   = uMinRadius   * uMinRadius;
    float fixedR2 = uFixedRadius * uFixedRadius;
    if (r2 < minR2) {
        float t = fixedR2 / minR2;
        z3 *= t;
        dr *= t;
    } else if (r2 < fixedR2) {
        float t = fixedR2 / r2;
        z3 *= t;
        dr *= t;
    }

    // Scale + offset.
    z3 = z3 * uScale + c.xyz;
    dr = dr * abs(uScale) + 1.0;

    z.xyz = z3;
}
`,he={id:"Mandelbox",name:"Mandelbox",description:"Folding fractal discovered by Tglad. Creates architectural lattices through box + sphere folds followed by scaling.",glsl:de,call:"formula_Mandelbox(z, dr, c);",deExpr:"r / abs(dr)",escapeRadius:1024,uniforms:[{name:"uIterations",type:"int"},{name:"uScale",type:"float"},{name:"uMinRadius",type:"float"},{name:"uFoldLimit",type:"float"},{name:"uFixedRadius",type:"float"}],params:{iterations:{type:"int",default:18,min:4,max:32,step:1,label:"Iterations"},scale:{type:"float",default:2,min:-4,max:4,step:.001,label:"Scale"},minRadius:{type:"float",default:.5,min:0,max:1.5,step:.001,label:"Min Radius"},foldLimit:{type:"float",default:1,min:.1,max:2,step:.001,label:"Fold Limit"},fixedRadius:{type:"float",default:1,min:.1,max:3,step:.001,label:"Fixed Radius"}},pushUniforms:(t,e)=>{t.setI("uIterations",e.iterations??18),t.setF("uScale",e.scale??2),t.setF("uMinRadius",e.minRadius??.5),t.setF("uFoldLimit",e.foldLimit??1),t.setF("uFixedRadius",e.fixedRadius??1)}},pe={id:"camera",name:"Camera",category:"Scene",tabConfig:{label:"Camera"},params:{orbitTheta:{type:"float",default:.6,min:-3.14,max:3.14,step:.01,label:"Yaw θ"},orbitPhi:{type:"float",default:.2,min:-1.55,max:1.55,step:.01,label:"Pitch φ"},distance:{type:"float",default:2.5,min:.5,max:10,step:.01,label:"Distance"},fov:{type:"float",default:60,min:20,max:120,step:1,label:"FOV °"},target:{type:"vec3",default:{x:0,y:0,z:0},min:-2,max:2,step:.01,label:"Target"}},inject:t=>{t.addUniform("uCamOrbitTheta","float"),t.addUniform("uCamOrbitPhi","float"),t.addUniform("uCamDistance","float"),t.addUniform("uCamFov","float"),t.addUniform("uCamTarget","vec3")}},ge={id:"lighting",name:"Lighting",category:"Scene",tabConfig:{label:"Lighting"},params:{direction:{type:"vec3",default:{x:.5,y:.8,z:.5},min:-1,max:1,step:.01,label:"Direction"},color:{type:"color",default:"#ffffff",label:"Color"},intensity:{type:"float",default:1,min:0,max:4,step:.01,label:"Intensity"},ambient:{type:"float",default:.15,min:0,max:1,step:.01,label:"Ambient"},aoAmount:{type:"float",default:.4,min:0,max:1,step:.01,label:"AO Amount"},albedoR:{type:"float",default:.85,min:0,max:1,step:.01,label:"Albedo R"},albedoG:{type:"float",default:.72,min:0,max:1,step:.01,label:"Albedo G"},albedoB:{type:"float",default:.55,min:0,max:1,step:.01,label:"Albedo B"}},inject:t=>{t.addUniform("uLightDir","vec3"),t.addUniform("uLightColor","vec3"),t.addUniform("uLightIntensity","float"),t.addUniform("uAmbient","float"),t.addUniform("uAoAmount","float"),t.addUniform("uAlbedo","vec3")}};A(ue);A(he);h.register(pe);h.register(ge);const ve=`#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;class be{constructor(e,a={}){f(this,"gl");f(this,"program",null);f(this,"vao",null);f(this,"uniformLocations",new Map);f(this,"rafId",null);f(this,"startTime",performance.now());f(this,"frameCount",0);f(this,"onFrameEnd");this.canvas=e;const o=e.getContext("webgl2",{antialias:!1,alpha:!1,preserveDrawingBuffer:!0});if(!o)throw new Error("[FractalEngine] WebGL2 is required and not available.");this.gl=o,this.onFrameEnd=a.onFrameEnd,this.initQuad()}setShader(e){const a=this.gl;this.program&&a.deleteProgram(this.program);const o=this.compile(ve,a.VERTEX_SHADER,"vertex"),i=this.compile(e,a.FRAGMENT_SHADER,"fragment"),r=a.createProgram();if(!r)throw new Error("[FractalEngine] createProgram failed");if(a.attachShader(r,o),a.attachShader(r,i),a.bindAttribLocation(r,0,"aPosition"),a.linkProgram(r),a.deleteShader(o),a.deleteShader(i),!a.getProgramParameter(r,a.LINK_STATUS)){const n=a.getProgramInfoLog(r);throw a.deleteProgram(r),new Error(`[FractalEngine] program link failed: ${n}`)}this.program=r,this.cacheUniforms()}setUniformF(e,a){this.uniformApply(e,(o,i)=>o.uniform1f(i,a))}setUniformI(e,a){this.uniformApply(e,(o,i)=>o.uniform1i(i,a))}setUniform2F(e,a,o){this.uniformApply(e,(i,r)=>i.uniform2f(r,a,o))}setUniform3F(e,a,o,i){this.uniformApply(e,(r,n)=>r.uniform3f(n,a,o,i))}setUniform4F(e,a,o,i,r){this.uniformApply(e,(n,c)=>n.uniform4f(c,a,o,i,r))}resize(e,a){e<1||a<1||(this.canvas.width=e,this.canvas.height=a,this.gl.viewport(0,0,e,a))}start(){if(this.rafId!==null)return;const e=()=>{this.render(),this.rafId=requestAnimationFrame(e)};this.rafId=requestAnimationFrame(e)}stop(){this.rafId!==null&&cancelAnimationFrame(this.rafId),this.rafId=null}dispose(){this.stop();const e=this.gl;this.program&&(e.deleteProgram(this.program),this.program=null),this.vao&&(e.deleteVertexArray(this.vao),this.vao=null),this.uniformLocations.clear()}render(){const e=this.gl;if(!this.program||!this.vao)return;e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT),e.useProgram(this.program);const a=(performance.now()-this.startTime)/1e3,o=this.uniformLocations.get("uTime");o&&e.uniform1f(o,a);const i=this.uniformLocations.get("uResolution");i&&e.uniform2f(i,this.canvas.width,this.canvas.height);const r=this.uniformLocations.get("uFrame");r&&e.uniform1i(r,this.frameCount),e.bindVertexArray(this.vao),e.drawArrays(e.TRIANGLES,0,6),this.frameCount++,this.onFrameEnd&&this.onFrameEnd()}uniformApply(e,a){const o=this.uniformLocations.get(e);if(!o||!this.program)return;const i=this.gl;i.useProgram(this.program),a(i,o)}cacheUniforms(){this.uniformLocations.clear();const e=this.gl,a=this.program,o=e.getProgramParameter(a,e.ACTIVE_UNIFORMS);for(let i=0;i<o;i++){const r=e.getActiveUniform(a,i);if(!r)continue;const n=r.name.endsWith("[0]")?r.name.slice(0,-3):r.name,c=e.getUniformLocation(a,n);c&&this.uniformLocations.set(n,c)}}initQuad(){const e=this.gl,a=new Float32Array([-1,-1,1,-1,1,1,-1,-1,1,1,-1,1]),o=e.createVertexArray(),i=e.createBuffer();if(!o||!i)throw new Error("[FractalEngine] VAO/VBO creation failed");e.bindVertexArray(o),e.bindBuffer(e.ARRAY_BUFFER,i),e.bufferData(e.ARRAY_BUFFER,a,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),e.bindVertexArray(null),this.vao=o}compile(e,a,o){const i=this.gl,r=i.createShader(a);if(!r)throw new Error(`[FractalEngine] createShader failed (${o})`);if(i.shaderSource(r,e),i.compileShader(r),!i.getShaderParameter(r,i.COMPILE_STATUS)){const n=i.getShaderInfoLog(r),c=e.split(`
`).map((x,y)=>`${String(y+1).padStart(3," ")}: ${x}`).join(`
`);throw i.deleteShader(r),new Error(`[FractalEngine] ${o} shader compile failed: ${n}

${c}`)}return r}}class xe{constructor(e="Main"){f(this,"defines",new Map);f(this,"uniforms",new Map);f(this,"headers",[]);f(this,"preambles",[]);f(this,"functions",[]);f(this,"sections",new Map);this.variant=e}addDefine(e,a="1"){this.defines.set(e,a)}addUniform(e,a,o){this.uniforms.set(e,{type:a,arraySize:o})}addHeader(e){this.headers.includes(e)||this.headers.push(e)}addPreamble(e){this.preambles.includes(e)||this.preambles.push(e)}addFunction(e){this.functions.includes(e)||this.functions.push(e)}addSection(e,a){this.sections.has(e)||this.sections.set(e,[]),this.sections.get(e).push(a)}getDefines(){return this.defines}getUniforms(){return this.uniforms}getHeaders(){return this.headers}getPreambles(){return this.preambles}getFunctions(){return this.functions}getSections(e){return this.sections.get(e)??[]}getAllSectionNames(){return Array.from(this.sections.keys())}getVariant(){return this.variant}buildDefinesBlock(){const e=[];return this.defines.forEach((a,o)=>e.push(`#define ${o} ${a}`)),e.join(`
`)}buildUniformsBlock(){const e=[];return this.uniforms.forEach((a,o)=>{e.push(a.arraySize?`uniform ${a.type} ${o}[${a.arraySize}];`:`uniform ${a.type} ${o};`)}),e.join(`
`)}buildFragment(){const e=this.buildDefinesBlock(),a=this.buildUniformsBlock(),o=this.getSections("main").join(`
`);return`#version 300 es
precision highp float;

${e}

${this.headers.join(`
`)}

${a}

${this.preambles.join(`
`)}

${this.functions.join(`
`)}

out vec4 pc_fragColor;

void main() {
${o||"    pc_fragColor = vec4(0.0, 0.0, 0.0, 1.0);"}
}
`}}const ye=(t,e={})=>{const{formula:a}=e;if(a)for(const F of a.uniforms)t.addUniform(F.name,F.type);const o=t.buildDefinesBlock(),i=t.buildUniformsBlock(),r=t.getHeaders().join(`
`),n=t.getPreambles().join(`
`),c=t.getFunctions().join(`
`),I=a?Se(a.call,a.deExpr??"0.5 * log(max(r, 1e-8)) * r / dr",a.escapeRadius??2):Fe;return`#version 300 es
precision highp float;

${o}

${r}

// --- Built-in uniforms (set by FractalEngine each frame) ---
uniform float uTime;
uniform vec2  uResolution;
uniform int   uFrame;

// --- Feature-declared + formula-declared uniforms ---
${i}

${n}

${c}

// --- Active formula function ---
${a?a.glsl:""}

in vec2 vUv;
out vec4 fragColor;

void main() {
${I}
}
`},Fe=`
    vec3 col = vec3(vUv, 0.5 + 0.4 * sin(uTime));
    col += 0.05 * sin(20.0 * (vUv.x + vUv.y) - uTime * 2.0);
    fragColor = vec4(col, 1.0);
`,Se=(t,e,a)=>`
    // ── Screen → camera ray (pinhole) ──
    vec2 uv = vUv * 2.0 - 1.0;
    float aspect = uResolution.x / uResolution.y;

    float cp = cos(uCamOrbitPhi);
    vec3 camOffset = vec3(
        sin(uCamOrbitTheta) * cp,
        sin(uCamOrbitPhi),
        cos(uCamOrbitTheta) * cp
    ) * uCamDistance;
    vec3 camPos = uCamTarget + camOffset;

    vec3 camForward = normalize(uCamTarget - camPos);
    vec3 camRight   = normalize(cross(camForward, vec3(0.0, 1.0, 0.0)));
    vec3 camUp      = cross(camRight, camForward);

    float halfFov = tan(radians(uCamFov) * 0.5);
    vec3 rayDir = normalize(
        camForward
        + camRight * (uv.x * aspect * halfFov)
        + camUp    * (uv.y * halfFov)
    );

    // ── Ray march ──────────────────────────────────────────────
    float t = 0.0;
    float dist = 0.0;
    vec3 pos = camPos;
    bool hit = false;
    int stepsUsed = 0;
    const int MAX_STEPS = 200;
    const float MAX_DIST = 20.0;
    const float HIT_EPS = 0.001;

    for (int s = 0; s < MAX_STEPS; s++) {
        stepsUsed = s;
        pos = camPos + rayDir * t;

        vec4 z = vec4(pos, 0.0);
        vec4 c = vec4(pos, 0.0);
        float dr = 1.0;
        float r = 0.0;
        for (int i = 0; i < 32; i++) {
            if (i >= uIterations) break;
            ${t}
            r = length(z.xyz);
            if (r > ${a.toFixed(1)}) break;
        }
        dist = ${e};

        if (dist < HIT_EPS) { hit = true; break; }
        if (t > MAX_DIST) break;
        t += dist * 0.9;
    }

    // ── Shade ───────────────────────────────────────────────────
    vec3 col;
    if (hit) {
        // Finite-difference normal — re-runs the inner loop three times.
        const float hStep = 0.002;
        float dx, dy, dz;
        {
            vec3 pp = pos + vec3(hStep, 0.0, 0.0);
            vec4 z = vec4(pp, 0.0); vec4 c = vec4(pp, 0.0); float dr = 1.0; float r = 0.0;
            for (int i = 0; i < 32; i++) {
                if (i >= uIterations) break;
                ${t}
                r = length(z.xyz);
                if (r > ${a.toFixed(1)}) break;
            }
            dx = ${e};
        }
        {
            vec3 pp = pos + vec3(0.0, hStep, 0.0);
            vec4 z = vec4(pp, 0.0); vec4 c = vec4(pp, 0.0); float dr = 1.0; float r = 0.0;
            for (int i = 0; i < 32; i++) {
                if (i >= uIterations) break;
                ${t}
                r = length(z.xyz);
                if (r > ${a.toFixed(1)}) break;
            }
            dy = ${e};
        }
        {
            vec3 pp = pos + vec3(0.0, 0.0, hStep);
            vec4 z = vec4(pp, 0.0); vec4 c = vec4(pp, 0.0); float dr = 1.0; float r = 0.0;
            for (int i = 0; i < 32; i++) {
                if (i >= uIterations) break;
                ${t}
                r = length(z.xyz);
                if (r > ${a.toFixed(1)}) break;
            }
            dz = ${e};
        }
        vec3 n = normalize(vec3(dx, dy, dz) - vec3(dist));

        vec3 lightDir = normalize(uLightDir);
        float diff = max(0.0, dot(n, lightDir));
        col = uAlbedo * uLightColor * uLightIntensity * (uAmbient + (1.0 - uAmbient) * diff);

        float aoRaw = 1.0 - float(stepsUsed) / float(MAX_STEPS);
        float ao = mix(1.0, aoRaw, uAoAmount);
        col *= ao;
    } else {
        col = mix(vec3(0.02, 0.02, 0.04), vec3(0.08, 0.08, 0.12), vUv.y);
    }

    col = pow(col, vec3(1.0 / 2.2));
    fragColor = vec4(col, 1.0);
`;let E={},b=!1,s=null;const we=(t={})=>{E=t,!b&&(b=!0,Re())},Re=()=>{S.register({id:"formula",slot:"left",order:50,label:"Formula",title:"Switch active formula",align:"start",width:"w-56"});for(const t of d.getAll())S.registerItem("formula",{id:`formula:${t.id}`,type:"toggle",label:t.name,title:t.description,isActive:()=>m.getState().formula===t.id,onToggle:()=>{m.getState().formula!==t.id&&m.setState({formula:t.id})}})},C={getCanvas:()=>(s==null?void 0:s.canvas)??null,rebuild:()=>{D.queue("Compiling shader…",()=>{U()})}},U=()=>{const t=s;if(!t){p.emit(g.IS_COMPILING,!1);return}const e=m.getState(),a=d.resolve(e.formula);a||console.warn("[fractalRenderer] no formulas registered — shader will be gradient-only");const o=new xe("Main");for(const r of h.getAll())r.inject&&r.inject(o,{},"Main");const i=ye(o,{formula:a});try{t.setShader(i)}catch(r){console.error("[fractalRenderer] shader compile failed:",r),p.emit(g.IS_COMPILING,!1);return}Ae(),p.emit(g.RESET_ACCUM,void 0),p.emit(g.IS_COMPILING,!1)},Ae=()=>{const t=s;if(!t)return;const e=m.getState(),a=d.resolve(e.formula);if(a){const o=a.id.toLowerCase(),i=e[o];i&&a.pushUniforms&&a.pushUniforms(T(t),i)}z(e.camera),P(e.lighting)},T=t=>({setF:(e,a)=>t.setUniformF(e,a),setI:(e,a)=>t.setUniformI(e,a),set2F:(e,a,o)=>t.setUniform2F(e,a,o),set3F:(e,a,o,i)=>t.setUniform3F(e,a,o,i),set4F:(e,a,o,i,r)=>t.setUniform4F(e,a,o,i,r)}),z=t=>{if(!s||!t)return;s.setUniformF("uCamOrbitTheta",t.orbitTheta??.6),s.setUniformF("uCamOrbitPhi",t.orbitPhi??.2),s.setUniformF("uCamDistance",t.distance??2.5),s.setUniformF("uCamFov",t.fov??60);const e=t.target;s.setUniform3F("uCamTarget",(e==null?void 0:e.x)??0,(e==null?void 0:e.y)??0,(e==null?void 0:e.z)??0)},P=t=>{if(!s||!t)return;const e=t.direction;s.setUniform3F("uLightDir",(e==null?void 0:e.x)??.5,(e==null?void 0:e.y)??.8,(e==null?void 0:e.z)??.5);const a=t.color;if(a&&typeof a=="object"&&"r"in a)s.setUniform3F("uLightColor",a.r,a.g,a.b);else if(typeof a=="string"){const o=parseInt(a.replace("#",""),16);s.setUniform3F("uLightColor",(o>>16&255)/255,(o>>8&255)/255,(o&255)/255)}else s.setUniform3F("uLightColor",1,1,1);s.setUniformF("uLightIntensity",t.intensity??1),s.setUniformF("uAmbient",t.ambient??.15),s.setUniformF("uAoAmount",t.aoAmount??.4),s.setUniform3F("uAlbedo",t.albedoR??.85,t.albedoG??.72,t.albedoB??.55)},Ee=()=>{b||console.warn("[fractalRenderer] <FractalRendererCanvas /> rendered without installFractalRenderer() — frame telemetry will be missing.");const t=v.useRef(null),e=m(o=>o.canvasPixelSize),a=w();return v.useEffect(()=>{const o=t.current;if(!o)return;try{const n=new be(o,{onFrameEnd:E.onFrameEnd??(()=>R.frameTick())});s=n,U(),n.start()}catch(n){console.error("[fractalRenderer] failed to start engine:",n);return}const i=m,r=[];return r.push(i.subscribe(n=>n.formula,()=>C.rebuild())),r.push(i.subscribe(n=>{const c=d.resolve(n.formula);return c?n[c.id.toLowerCase()]:null},n=>{if(!s||!n)return;const c=d.resolve(i.getState().formula);c!=null&&c.pushUniforms&&c.pushUniforms(T(s),n)})),r.push(i.subscribe(n=>n.camera,n=>z(n))),r.push(i.subscribe(n=>n.lighting,n=>P(n))),()=>{r.forEach(n=>n()),s==null||s.dispose(),s=null}},[]),v.useEffect(()=>{const o=s;if(!o)return;const[i,r]=e;i<1||r<1||o.resize(Math.max(1,Math.floor(i*a)),Math.max(1,Math.floor(r*a)))},[e,a]),l.jsxs(l.Fragment,{children:[l.jsx("canvas",{ref:t,className:"absolute inset-0 w-full h-full block"}),l.jsx(ce,{})]})},Ce=()=>{const t=h.getViewportOverlays().filter(a=>a.type==="dom"),e=m();return l.jsx("div",{className:"absolute inset-0 pointer-events-none z-[20]",children:t.map(a=>{const o=Q.get(a.componentId),i=e[a.id];return o&&i?l.jsx(o,{featureId:a.id,sliceState:i,actions:e},a.id):null})})},Ue=()=>{const t=m(),e=w(),{fpsSmoothed:a}=B(),o=v.useMemo(()=>({handleInteractionStart:t.handleInteractionStart,handleInteractionEnd:t.handleInteractionEnd,openContextMenu:t.openContextMenu}),[t.handleInteractionStart,t.handleInteractionEnd,t.openContextMenu]),i=Object.values(t.panels).filter(r=>r.location==="float"&&r.isOpen);return l.jsx(O,{value:o,children:l.jsxs("div",{className:"fixed inset-0 w-full h-full bg-black text-white select-none overflow-hidden flex flex-col",children:[l.jsx(N,{}),l.jsx(V,{}),i.map(r=>l.jsx(G,{id:r.id,title:r.id,children:l.jsx(H,{activeTab:r.id,state:t,actions:t,onSwitchTab:n=>t.togglePanel(n,!0)})},r.id)),l.jsx(q,{}),l.jsxs("div",{className:"flex-1 flex overflow-hidden relative",children:[l.jsxs(re,{children:[l.jsx(Ee,{}),l.jsx(Ce,{})]}),l.jsx(X,{side:"right"})]}),l.jsx(Y,{}),t.contextMenu.visible&&l.jsx(W,{x:t.contextMenu.x,y:t.contextMenu.y,items:t.contextMenu.items,targetHelpIds:t.contextMenu.targetHelpIds,onClose:t.closeContextMenu,onOpenHelp:t.openHelp}),l.jsxs("div",{className:"absolute bottom-3 left-3 text-[10px] text-white/40 font-mono pointer-events-none",children:[a.toFixed(0)," fps · q",(e*100).toFixed(0),"%"]}),l.jsxs("div",{className:"absolute top-3 left-3 text-[10px] text-white/60 font-mono pointer-events-none",children:["Fractal Toy · ",t.formula||"…"]})]})})},Te=[{id:"Camera",dock:"right",order:1,features:["camera"]},{id:"Lighting",dock:"right",order:2,features:["lighting"]}],ze=()=>Z(Te);K();J({enabled:!0,targetFps:30,minQuality:.35,interactionDownsample:.55,activityGraceMs:100});ee();te({getCanvas:()=>C.getCanvas()});ae();we({onFrameEnd:()=>R.frameTick()});oe();ie();ne();se.register({featureId:"camera",captureState:()=>{const e=m.getState().camera;return{orbitTheta:e==null?void 0:e.orbitTheta,orbitPhi:e==null?void 0:e.orbitPhi,distance:e==null?void 0:e.distance,fov:e==null?void 0:e.fov,target:{...e==null?void 0:e.target}}},applyState:t=>{m.getState().setCamera({orbitTheta:t.orbitTheta,orbitPhi:t.orbitPhi,distance:t.distance,fov:t.fov,target:t.target})}});fe(["camera.orbitTheta","camera.orbitPhi","camera.distance","camera.fov","camera.target_x","camera.target_y","camera.target_z"]);ze();m.setState({formula:"Mandelbulb"});const L=document.getElementById("root");if(!L)throw new Error("Could not find root element to mount to");const Pe=le.createRoot(L);Pe.render(l.jsx(j.StrictMode,{children:l.jsx(Ue,{})}));
