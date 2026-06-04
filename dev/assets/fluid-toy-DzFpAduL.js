var ut=Object.defineProperty;var dt=(r,e,i)=>e in r?ut(r,e,{enumerable:!0,configurable:!0,writable:!0,value:i}):r[e]=i;var m=(r,e,i)=>dt(r,typeof e!="symbol"?e+"":e,i);import{k as We,f as B,c as pe,r as pt,l as ft,m as L,u as w,a as me,b as Te,F as mt,j as ht,n as gt,C as xt,o as vt,P as bt,V as yt,d as _e,p as Tt,q as wt,i as Mt}from"./SceneFormat-44ZdMSMs.js";import{r as C,j as u,R as St}from"./three-fiber-GKfjny8F.js";import{d as G}from"./defineEnumParam-CycEUzFC.js";import{V as Ct,i as Rt,c as At}from"./Camera-u2clhY18.js";import{c as Ft}from"./three-drei-BSHBGk0S.js";import{v as Et,l as Ke,n as Dt,S as Pt,E as kt,D as Lt,a as It,P as jt,T as zt,b as Be,c as _t,G as Bt,d as Ot,A as Ut,r as Gt,o as Nt,i as Vt,h as Ht,e as Jt,f as Xt,g as Zt}from"./PwaUpdate-BFxGZJX7.js";import{H as Wt,a as Kt,b as qt,c as $t,i as Yt,h as Qt,d as ei}from"./index-7Hhl3eUy.js";import{R as ti}from"./RenderLoop-BjmPGCER.js";import{a as q,b as O,u as qe}from"./typedSlices-DRjIW6js.js";import{g as we,i as ii,S as ri,C as oi,a as ai,b as si}from"./CompositionOverlayControls-dxAeOTix.js";import{r as ni}from"./cameraKeyRegistry-B9RT68wR.js";import{M as li,a as ci,c as ui,i as di}from"./index-AvnZA4JD.js";import"./three-DQWx7qFd.js";import"./pako-DwGzBETv.js";import"./CompositionOverlay-B3GQvnRw.js";import"./AudioAnalysisEngine-DyaB3DyZ.js";import"./ModulationEngine-2YEp_bBL.js";import"./renderPopupRegistry-DFd-6fyz.js";const Ce=G(["julia","mandelbrot"],"Fractal Kind",{defaultIndex:1,optionHints:{julia:"Iterate z² + c with fixed c. Pixels are starting z values.",mandelbrot:"Iterate z² + c with z₀=0. Pixels are c values."}}),Me=Ce.values,pi=Ce.fromIndex,fi={id:"julia",name:"Fractal",category:"Fractal",tabConfig:{label:"Fractal"},customUI:[{componentId:"julia-c-picker",parentId:"juliaC",condition:{param:"kind",eq:0}}],params:{kind:Ce.config,juliaC:{type:"vec2",default:{x:-.36303304426511473,y:.16845183018751916},min:-2,max:2,step:.001,label:"Julia c",description:"Julia constant. Move me to reshape the entire fractal — and the forces it emits.",condition:{param:"kind",eq:0}},zoom:{type:"float",default:1.2904749020480561,min:1e-5,max:8,step:1e-4,scale:"log",label:"Zoom",description:"Zoom into the fractal. Scroll wheel + middle-click-drag on the canvas go much deeper (to 0.00001)."},center:{type:"vec2",default:{x:0,y:0},min:-2,max:2,step:.01,label:"Center",description:"Pan the fractal window."},centerLow:{type:"vec2",default:{x:0,y:0},min:-1,max:1,step:1e-12,label:"Center (low bits)",description:"Internal — sub-f64 pan accumulator.",hidden:!0},maxIter:{type:"int",default:310,min:16,max:512,step:1,label:"Iter",description:"More iterations → sharper escape gradients → finer force detail."},power:{type:"float",default:2,min:2,max:8,step:1,label:"Power",description:"z-power in the iteration. 2 = classic z²+c; higher exponents make more lobes."}}},mi=(r,e,i)=>{var n,l;const t=e.juliaC.x,o=e.juliaC.y,a=i["julia.juliaC_x"]??t,s=i["julia.juliaC_y"]??o;r.setParams({kind:pi(e.kind),juliaC:[a,s],maxIter:e.maxIter,power:e.power,center:[e.center.x,e.center.y],centerLow:[((n=e.centerLow)==null?void 0:n.x)??0,((l=e.centerLow)==null?void 0:l.y)??0],zoom:e.zoom})},hi=(r,e,i)=>{const t=i["julia.juliaC_x"]??e.juliaC.x,o=i["julia.juliaC_y"]??e.juliaC.y;r.setParams({juliaC:[t,o]})},gi={id:"deepZoom",name:"Deep Zoom",category:"Fractal",tabConfig:{label:"Deep Zoom"},params:{enabled:{type:"boolean",default:!1,label:"Enable deep zoom",description:"Master toggle. Switches the iteration kernel to perturbation + LA, unlocking zoom past 1e-5 (eventually past 1e-300). Off by default — costs nothing when off."},useLA:{type:"boolean",default:!0,label:"Use Linear Approximation",condition:{param:"enabled",bool:!0},description:"Skip iterations via the LA stage table. 10–100× faster at depth. Off = pure perturbation (slow, but useful for sanity-checking LA output)."},useAT:{type:"boolean",default:!0,label:"Use AT front-load",condition:{param:"enabled",bool:!0},description:"Fast-forward the front of the orbit via Approximation Terms (a single z²+c loop in plain f32). Free perf when applicable. No effect when LA is off."},maxRefIter:{type:"int",default:5e4,min:5e3,max:5e5,step:1e3,label:"Reference orbit length",condition:{param:"enabled",bool:!0},description:"Maximum iterations the high-precision reference orbit runs to. Higher = supports deeper zooms but costs CPU at build time and GPU memory at runtime. Auto-suggested per zoom depth in later phases."},deepMaxIter:{type:"int",default:2e3,min:200,max:5e4,step:100,label:"Iter (deep)",condition:{param:"enabled",bool:!0},description:"Maximum iterations per pixel when deep zoom is on. Overrides the Fractal-tab Iter slider while deep is enabled. Without LA every iteration costs the full HDR step — push gently until phase 6 (LA runtime) lands."},showStats:{type:"boolean",default:!1,label:"Show stats",condition:{param:"enabled",bool:!0},description:"Overlay reference-orbit length, LA stage count, table size, and build time. Diagnostic."},disableFluid:{type:"boolean",default:!1,label:"Disable fluid sim (debug)",condition:{param:"enabled",bool:!0},description:"Skip every fluid pass (motion, advect, pressure, dye decay) so render time reflects the fractal kernel only. Use to isolate deep-zoom perf from fluid sim cost."}}},xi=(r,e,i)=>{e.enabled?(r.setParams({deepZoomEnabled:!0,maxIter:e.deepMaxIter}),r.setForceFluidPaused(e.disableFluid)):(r.setParams({deepZoomEnabled:!1,maxIter:i.maxIter}),r.deepZoom.clearReferenceOrbit(),r.deepZoom.clearLATable(),r.deepZoom.setLAEnabled(!1),r.deepZoom.clearAT(),r.setForceFluidPaused(!1))},Re=G(["gradient","curl","iterate","c-track","hue"],"Operator",{optionLabels:{iterate:"Direct","c-track":"Temporal Δ",gradient:"Gradient",curl:"Curl",hue:"Hue"},optionHints:{gradient:"Push along ∇S — fluid flows from low to high source.",curl:"Swirl along level sets. Divergence-free.",iterate:"Push along ∇S with magnitude ∝ S itself.","c-track":"React to frame-to-frame change in S.",hue:"Palette colour IS the velocity field. Ignores Source."}}),vi=Re.values,bi=Re.fromIndex,Ae=G(["smoothPot","de","stripe","paletteLuma","mask"],"Source",{optionLabels:{smoothPot:"Smooth potential",de:"Distance estimate",stripe:"Stripe average",paletteLuma:"Palette luminance",mask:"Collision mask"},optionHints:{smoothPot:"Classic outside-the-set gradient.",de:"Smooth across the set boundary.",stripe:"Aesthetic banded flow.",paletteLuma:"Tracks whatever colour-mapping mode is active.",mask:"Drive flow toward / away from collision walls."}}),yi=Ae.values,Ti=Ae.fromIndex,wi={id:"coupling",name:"Coupling",category:"Simulation",tabConfig:{label:"Coupling"},params:{forceMode:Re.config,forceSource:Ae.config,forceGain:{type:"float",default:-1200,min:-2e3,max:2e3,step:.1,label:"Force gain",description:"Multiplier on the fractal-derived force. How loudly the fractal shouts at the fluid. Negative inverts the force direction."},interiorDamp:{type:"float",default:.59,min:0,max:1,step:.01,label:"Interior damp",description:"How much to suppress force inside the set. 1 = still lake in the interior, 0 = full bleed."},forceCap:{type:"float",default:40,min:1,max:40,step:.5,label:"Force cap",description:"Per-pixel cap on the fractal force magnitude."},edgeMargin:{type:"float",default:.04,min:0,max:.25,step:.005,label:"Edge margin",description:'Fades force / dye injection near the canvas edges. Fixes "gushing from the borders" under fast c-changes.'}}};function Fe(r,e){const i=e,t={current:e},o=new Set;let a=0;const s=h=>(o.add(h),()=>{o.delete(h)}),n=()=>{a++,o.forEach(h=>h())};return{name:r,ref:t,useSnapshot:()=>(C.useSyncExternalStore(s,()=>a,()=>a),t.current),subscribe:s,notify:n,reset:()=>{t.current=i,n()}}}const ne=Math.PI*2,he=(r,e,i)=>(i<0&&(i+=1),i>1&&(i-=1),i<1/6?r+(e-r)*6*i:i<1/2?e:i<2/3?r+(e-r)*(2/3-i)*6:r),$e=(r,e,i)=>{if(e===0)return[i,i,i];const t=i<.5?i*(1+e):i+e-i*e,o=2*i-t;return[he(o,t,r+1/3),he(o,t,r),he(o,t,r-1/3)]},Mi=(r,e,i)=>{const t=Math.max(r,e,i),o=Math.min(r,e,i),a=(t+o)/2;if(t===o)return[0,0,a];const s=t-o,n=a>.5?s/(2-t-o):s/(t+o);let l;return t===r?l=(e-i)/s+(e<i?6:0):t===e?l=(i-r)/s+2:l=(r-e)/s+4,[l/6,n,a]},Si=(r,e)=>{if(e<=0)return r;const[i,t,o]=Mi(r[0],r[1],r[2]),a=(i+(Math.random()-.5)*e+1)%1;return $e(a,t,o)},Ci=(r,e)=>{if(!r||r.length<4)return[1,1,1];const i=(e%1+1)%1,t=r.length/4,o=Math.min(t-1,Math.floor(i*t))*4;return[r[o]/255,r[o+1]/255,r[o+2]/255]},Ye=r=>{let e;switch(r.mode){case"solid":e=[r.solidColor[0],r.solidColor[1],r.solidColor[2]];break;case"gradient":e=Ci(r.gradientLut,(r.u+r.v)*.5);break;case"velocity":{const i=Math.min(1,Math.hypot(r.vx,r.vy)*.2),t=(Math.atan2(r.vy,r.vx)/ne+1)%1;e=$e(t,.9,.35+.3*i);break}case"rainbow":default:{const i=r.rainbowPhase;e=[.5+.5*Math.cos(ne*i),.5+.5*Math.cos(ne*(i+.33)),.5+.5*Math.cos(ne*(i+.67))];break}}return Si(e,r.jitter)},Se=300,Ri=(r,e)=>{if(r.length>=Se)return;const t=Math.atan2(e.dirY,e.dirX)+(Math.random()-.5)*2*e.particleSpread*Math.PI,o=e.particleVelocity*(.4+Math.random()*.6),a=e.brushSize*.35;r.push({x:e.u+(Math.random()-.5)*a,y:e.v+(Math.random()-.5)*a,vx:Math.cos(t)*o,vy:Math.sin(t)*o,life:e.particleLifetime,lifeMax:e.particleLifetime,color:[e.color[0],e.color[1],e.color[2]],size:e.brushSize*e.particleSizeScale*(.85+Math.random()*.3)})},Ai=(r,e,i,t)=>{const o=2*(r*i+e*t);return[r-o*i,e-o*t]},Fi=.5,Ei=(r,e)=>{const i=Math.exp(-e.particleDrag*e.dtSec),t=e.restitution??.55,o=.01;let a=0;for(let s=r.length-1;s>=0;s--){const n=r[s];n.vx*=i,n.vy*=i,n.vy+=e.particleGravity*e.dtSec;const l=n.x,c=n.y;if(n.x+=n.vx*e.dtSec,n.y+=n.vy*e.dtSec,n.life-=e.dtSec,e.sampleMask&&e.sampleMask(n.x,n.y)>=Fi){let p=e.sampleMask(n.x+o,n.y)-e.sampleMask(n.x-o,n.y),h=e.sampleMask(n.x,n.y+o)-e.sampleMask(n.x,n.y-o),d=Math.hypot(p,h);if(d<=1e-6){const f=o*3;p=e.sampleMask(n.x+f,n.y)-e.sampleMask(n.x-f,n.y),h=e.sampleMask(n.x,n.y+f)-e.sampleMask(n.x,n.y-f),d=Math.hypot(p,h)}let x,M;if(d>1e-6)x=-p/d,M=-h/d;else{const f=Math.hypot(n.vx,n.vy);f>1e-6?(x=-n.vx/f,M=-n.vy/f):(x=1,M=0)}[n.vx,n.vy]=Ai(n.vx,n.vy,x,M),n.vx*=t,n.vy*=t,n.x=l+x*o,n.y=c+M*o}(n.life<=0||n.x<-.2||n.x>1.2||n.y<-.2||n.y>1.2)&&(r.splice(s,1),a++)}return a},Di=()=>({particles:[],rainbowPhase:0,distSinceSplat:0,spawnAcc:0}),Pi=(r,e)=>{r.rainbowPhase=e.wallClockMs*.001%1;const i=e.params;if(e.dragging&&i.particleEmitter&&e.cursorUv){r.spawnAcc+=e.dtSec*i.particleRate;const t=e.cursorVelUv??{vx:0,vy:0},o=Math.hypot(t.vx,t.vy),a=o<=1e-4;for(;r.spawnAcc>=1&&r.particles.length<Se;){r.spawnAcc-=1;let s,n;if(a){const c=Math.random()*Math.PI*2;s=Math.cos(c),n=Math.sin(c)}else s=t.vx/o,n=t.vy/o;const l=Ye({mode:i.colorMode,solidColor:i.solidColor,gradientLut:i.gradientLut,rainbowPhase:r.rainbowPhase,u:e.cursorUv.u,v:e.cursorUv.v,vx:t.vx,vy:t.vy,jitter:i.jitter});Ri(r.particles,{u:e.cursorUv.u,v:e.cursorUv.v,dirX:s,dirY:n,color:l,brushSize:i.size,particleVelocity:i.particleVelocity,particleSpread:i.particleSpread,particleLifetime:i.particleLifetime,particleSizeScale:i.particleSizeScale})}r.particles.length>=Se&&(r.spawnAcc=0)}if(r.particles.length>0){Ei(r.particles,{dtSec:e.dtSec,particleGravity:i.particleGravity,particleDrag:i.particleDrag,sampleMask:(t,o)=>e.engine.sampleMask(t,o)});for(const t of r.particles){const o=Math.max(0,t.life/t.lifeMax);e.engine.brush(t.x,t.y,t.vx*i.flow,t.vy*i.flow,t.color,t.size,i.hardness,i.strength*o,i.mode)}}},ki=(r,e)=>{const i=e.params;return i.particleEmitter||r.distSinceSplat<Math.max(1e-5,i.spacing)?!1:(r.distSinceSplat=0,Qe(r,e),!0)},Li=(r,e)=>{e.params.particleEmitter||(Qe(r,e),r.distSinceSplat=0)},Qe=(r,e)=>{r.rainbowPhase=e.wallClockMs*.001%1;const i=e.params,t=Ye({mode:i.colorMode,solidColor:i.solidColor,gradientLut:i.gradientLut,rainbowPhase:r.rainbowPhase,u:e.u,v:e.v,vx:e.dvx,vy:e.dvy,jitter:i.jitter});e.engine.brush(e.u,e.v,e.dvx*i.flow,e.dvy*i.flow,t,i.size,i.hardness,i.strength,i.mode)},Ii=r=>{r.distSinceSplat=1/0,r.spawnAcc=0},oe=Fe("fluid-toy.engine",null),Y=Fe("fluid-toy.brush",{runtime:Di(),gradientLut:null}),$=Fe("fluid-toy.cursor",{dragging:!1,uv:null,velUv:null}),ji={colorSpace:"srgb",blendSpace:"oklab",stops:[{id:"0",position:0,color:"#000000",bias:.5,interpolation:"linear"},{id:"1",position:.15,color:"#1a0a00",bias:.5,interpolation:"linear"},{id:"2",position:.35,color:"#8b1a00",bias:.5,interpolation:"linear"},{id:"3",position:.6,color:"#ff6b00",bias:.5,interpolation:"linear"},{id:"4",position:.85,color:"#ffdd66",bias:.5,interpolation:"linear"},{id:"5",position:1,color:"#ffffff",bias:.5,interpolation:"linear"}]},Ee=G(["add","screen","max","over"],"Dye blend",{optionHints:{add:"Linear accumulate — bright strokes build up, can clip.",screen:"1−(1−d)(1−i). Glowy, never exceeds 1.",max:"Hold the brightest. Vivid strokes survive over faded.",over:"Alpha-composite: new dye stamps cleanly over old."}}),zi=Ee.values,_i=Ee.fromIndex,De=G(["linear","perceptual","vivid"],"Colour space",{optionHints:{linear:"RGB multiply — fades to black through grey.",perceptual:"OKLab L-decay — hue + chroma stable while dimming.",vivid:"OKLab + chroma boost — colours stay punchy near black."}}),Bi=De.values,Oi=De.fromIndex,Pe=G(["iterations","angle","magnitude","decomposition","bands","orbit-point","orbit-circle","orbit-cross","orbit-line","stripe","distance","derivative","potential","trap-iter"],"Color mapping",{optionLabels:{decomposition:"Decomp","orbit-point":"Trap · Point","orbit-circle":"Trap · Circle","orbit-cross":"Trap · Cross","orbit-line":"Trap · Line","trap-iter":"Trap Iteration",distance:"Distance Estimate",potential:"Continuous Potential",derivative:"Derivative (log|dz|)"},optionHints:{iterations:"Smooth escape iter — classic Mandelbrot/Julia colouring.",angle:"Argument of final z. Spirals + radial fans.",magnitude:"Distance from origin at escape. Radial intensity.",decomposition:"Sign of imag(z) — black/white binary split.",bands:"Hard step function on iter — sharp colour bands.","orbit-point":"Closest approach to a point trap (use Trap shape).","orbit-circle":"Closest approach to a circle trap.","orbit-cross":"Closest approach to an axis-cross trap.","orbit-line":"Signed distance to a line trap.",stripe:"Härkönen sin-stripe average. Smooth banded swirls.",distance:"Hubbard distance estimate. Crisp, edge-aware.",derivative:"log|dz| — highlights chaotic fast-stretching regions.",potential:"Böttcher potential. Like iter but C¹ smooth.","trap-iter":"Iteration at which the trap minimum was reached."}}),Ui=Pe.values,Gi=Pe.fromIndex,Ni=5,Oe=6,Vi=7,Ue=8,Hi=9,Ji=13,Xi={id:"palette",name:"Palette",category:"Look",tabConfig:{label:"Palette"},params:{gradient:{type:"gradient",default:ji,label:"Palette",description:"Colors both the fractal AND the dye injected into the fluid. In Hue-mode (Coupling), this IS the vector field."},colorMapping:{...Pe.config,description:"How the iteration-space scalar becomes a t-value into the gradient. Each mode exposes its own extra controls below."},gradientRepeat:{type:"float",default:1,min:.1,max:8,step:.01,label:"Repetition",description:"Tiles the gradient across the mapped axis. 1 = one sweep, 3 = three bands."},gradientPhase:{type:"float",default:0,min:0,max:1,step:.005,label:"Phase",description:"Phase shift — rotates the colors without changing their layout."},colorIter:{type:"int",default:310,min:1,max:1024,step:1,label:"Color iter",description:"Iterations used for the coloring accumulators (orbit trap, stripe, DE). Separate from escape-test maxIter — reduce for fresher colours."},trapCenter:{type:"vec2",default:{x:0,y:0},min:-2,max:2,step:.01,label:"Trap center",description:"Trap centre (complex coord). Move to pick which point in the orbit to trap against.",condition:{or:[{param:"colorMapping",eq:Ni},{param:"colorMapping",eq:Oe},{param:"colorMapping",eq:Vi},{param:"colorMapping",eq:Ji}]}},trapRadius:{type:"float",default:1,min:.01,max:4,step:.01,label:"Trap radius",condition:{param:"colorMapping",eq:Oe},description:"Circle radius for the trap. Orbit pixels are coloured by how close they approach this ring."},trapNormal:{type:"vec2",default:{x:1,y:0},min:-1,max:1,step:.01,label:"Trap normal",condition:{param:"colorMapping",eq:Ue},description:"Line trap: z lies on dot(z, normal) = offset. Normal should be unit-length."},trapOffset:{type:"float",default:0,min:-2,max:2,step:.01,label:"Trap offset",condition:{param:"colorMapping",eq:Ue},description:"Line-trap offset (scalar position along the normal direction)."},stripeFreq:{type:"float",default:4,min:1,max:16,step:.1,label:"Stripe freq",condition:{param:"colorMapping",eq:Hi},description:"Stripe frequency — k in ½ + ½·sin(k·arg z). Higher = more stripes per iteration."},interiorColor:{type:"vec3",default:{x:.02,y:.02,z:.04},min:0,max:1,step:.001,label:"Interior color",description:"Colour for bounded points (pixels that never escape the iteration)."},escapeR:{type:"float",default:32,min:2,max:1024,step:.1,label:"Escape R",scale:"log",hidden:!0}}},Zi=(r,e)=>{const i=e.trapNormal.x,t=e.trapNormal.y,o=Math.hypot(i,t),a=o>1e-6?[i/o,t/o]:[1,0],s=e.interiorColor;if(r.setParams({colorMapping:Gi(e.colorMapping),colorIter:e.colorIter,escapeR:e.escapeR,interiorColor:[s.x,s.y,s.z],trapCenter:[e.trapCenter.x,e.trapCenter.y],trapRadius:e.trapRadius,trapNormal:a,trapOffset:e.trapOffset,stripeFreq:e.stripeFreq,gradientRepeat:e.gradientRepeat,gradientPhase:e.gradientPhase}),e.gradient){const n=We(e.gradient);r.setGradientBuffer(n),Y.ref.current.gradientLut=n}},Wi={colorSpace:"srgb",blendSpace:"rgb",stops:[{id:"0",position:0,color:"#000000",bias:.5,interpolation:"linear"},{id:"1",position:1,color:"#000000",bias:.5,interpolation:"linear"}]},Ki={id:"collision",name:"Collision",category:"Simulation",tabConfig:{label:"Collision"},params:{enabled:{type:"boolean",default:!1,label:"Collision walls",description:"Paints solid walls the fluid bounces off, sculpted by the gradient below. Same t-axis mapping as the main palette — edit stops to black = fluid, white = wall."},gradient:{type:"gradient",default:Wi,label:"Collision pattern",condition:{param:"enabled",bool:!0},description:"B&W gradient defining where walls sit along the iteration-space t-axis."},repeat:{type:"float",default:1,min:.1,max:8,step:.01,label:"Collision repeat",condition:{param:"enabled",bool:!0},description:"Tile the collision pattern along t — independent of the dye gradient repeat."},phase:{type:"float",default:0,min:0,max:1,step:.001,label:"Collision phase",condition:{param:"enabled",bool:!0},description:"Phase-shift the collision pattern so walls land where the dye doesn't."},preview:{type:"boolean",default:!1,label:"Preview walls on canvas",condition:{param:"enabled",bool:!0},description:"Overlays diagonal cyan hatching on solid cells so you can see the wall shape while tuning the gradient."}}},qi=(r,e)=>{if(r.setParams({collisionEnabled:e.enabled,collisionPreview:e.preview,collisionRepeat:e.repeat,collisionPhase:e.phase}),e.gradient){const i=We(e.gradient);r.setCollisionGradientBuffer(i)}},$i={id:"fluidSim",name:"Fluid",category:"Simulation",tabConfig:{label:"Fluid"},params:{vorticity:{type:"float",default:22.1,min:0,max:50,step:.1,label:"Vorticity",description:"Amplifies existing curl — keeps fractal-induced swirls from smearing away."},vorticityScale:{type:"float",default:1,min:.5,max:8,step:.1,label:"Vorticity scale",condition:{param:"vorticity",gt:0},description:"Spatial scale of the vorticity confinement (in sim texels). 1 = tight pixel-scale swirls, 4+ = larger organised vortices."},dissipation:{type:"float",default:.17,min:0,max:5,step:.01,label:"Velocity dissipation /s",description:"How fast velocity decays. High = fluid forgets the fractal quickly."},dyeInject:{type:"float",default:1.5,min:0,max:3,step:.01,label:"Dye inject",description:"How much of the fractal's color bleeds into the fluid each frame."},dyeBlend:{...Ee.config,description:"How new dye mixes with what the fluid already carries. Gradient stop alpha acts as a per-colour injection mask."},pressureIters:{type:"int",default:50,min:4,max:60,step:1,label:"Pressure iters",description:"Jacobi iterations for incompressibility. More = stricter but slower."},dyeDecayMode:{...De.config,description:"How dye fades over time. Colour space controls whether it greys out (linear) or stays hue-stable (perceptual / vivid)."},dyeDissipation:{type:"float",default:1.03,min:0,max:5,step:.01,label:"Dye dissipation /s",description:"How fast dye fades. In linear mode this is a straight RGB multiply; in perceptual / vivid it's the OKLab luminance fade (chroma fades on its own schedule below)."},dyeChromaDecayHz:{type:"float",default:1.03,min:0,max:5,step:.01,label:"Chroma decay /s",condition:{param:"dyeDecayMode",neq:0},description:"Per-second fade on OKLab a/b (chroma). Lower than Dye dissipation → colour stays saturated longer than it stays bright."},dyeSaturationBoost:{type:"float",default:1,min:.5,max:1.1,step:.001,scale:"log",label:"Saturation boost",condition:{param:"dyeDecayMode",eq:2},description:"Per-frame chroma gain. 1 = neutral, <1 washes out, >1 pushes toward max saturation. Gamut-mapped in OKLab so it pegs at the saturation ceiling rather than hue-shifting to white."},timeScale:{type:"float",default:1,min:0,max:4,step:.01,label:"Sim speed",description:"Wall-clock dt multiplier on the sim. 0.5 = slow-mo, 2 = double speed. 0 freezes the fluid (Pause is the cleaner way for hard-stop)."},paused:{type:"boolean",default:!1,label:"Pause sim",description:"Freeze the fluid state. Splats and param changes still land; they just don't integrate forward."}}},Yi=(r,e,i)=>{r.setParams({vorticity:e.vorticity,vorticityScale:e.vorticityScale,pressureIters:e.pressureIters,dissipation:e.dissipation,paused:e.paused,timeScale:e.timeScale,dyeInject:e.dyeInject,dyeBlend:_i(e.dyeBlend),dyeDecayMode:Oi(e.dyeDecayMode),dyeDissipation:e.dyeDissipation,dyeChromaDecayHz:e.dyeChromaDecayHz,dyeSaturationBoost:e.dyeSaturationBoost,forceMode:bi(i.forceMode),forceSource:Ti(i.forceSource),forceGain:i.forceGain,interiorDamp:i.interiorDamp,forceCap:i.forceCap,edgeMargin:i.edgeMargin})},Qi={id:"presets",name:"Presets",category:"Library",tabConfig:{label:"Presets"},customUI:[{componentId:"preset-grid"}],params:{_anchor:{type:"float",default:0,min:0,max:1,step:1,label:"",hidden:!0}}},Ge=(r,e,i,t,o)=>({id:r,target:`julia.juliaC_${e}`,shape:"Sine",period:i,phase:o,amplitude:t,baseValue:0,smoothing:0,enabled:!0}),ge=(r,e)=>{const i=1/Math.max(.001,e);return[Ge("preset.orbit.juliaC.x","x",i,r,0),Ge("preset.orbit.juliaC.y","y",i,r,.25)]},N=r=>r.map(([e,i],t)=>({id:`s${t}`,position:e,color:i,bias:.5,interpolation:"linear"})),er=[{id:"bench-julia-only",name:"Bench (Julia only)",desc:"Isolation preset for performance benchmarking. All post-FX, fluid coupling, dye, collision, and palette tricks are off — only the raw Julia/Mandelbrot fractal layer renders. Pair with the Disable-fluid-sim toggle on the Deep Zoom panel and accumulation off (topbar) for a clean GPU-time read.",params:{juliaC:[-.36303304426511473,.16845183018751916],center:[-.8139175130270945,-.054649908357858296],zoom:1.2904749020480561,maxIter:310,power:2,kind:"mandelbrot",forceMode:"gradient",forceSource:"smoothPot",forceGain:0,interiorDamp:1,dissipation:0,dyeDissipation:0,dyeInject:0,vorticity:0,vorticityScale:1,pressureIters:1,show:"julia",juliaMix:1,dyeMix:0,velocityViz:0,gradientRepeat:.1,gradientPhase:0,colorMapping:"iterations",colorIter:310,stripeFreq:4,dyeBlend:"max",dyeDecayMode:"linear",dyeChromaDecayHz:0,dyeSaturationBoost:1,toneMapping:"none",exposure:1,vibrance:1,bloomAmount:0,bloomThreshold:1,aberration:0,refraction:0,refractSmooth:1,refractRoughness:0,caustics:0,interiorColor:[0,0,0],edgeMargin:0,forceCap:1,collisionEnabled:!1,paused:!0},gradient:{stops:N([[0,"#000000"],[1,"#FFFFFF"]]),colorSpace:"linear",blendSpace:"rgb"}},{id:"coral-gyre",name:"Coral Gyre",desc:"Orbit-point colouring on a negative curl — teal interior feeds a coral halo, with filmic bloom + aberration.",params:{juliaC:[-.8173594132029339,.15279058679706603],center:[0,0],zoom:1.5,maxIter:182,power:2,kind:"julia",forceMode:"curl",forceSource:"paletteLuma",forceGain:-760,interiorDamp:.9,dissipation:.1,dyeDissipation:.63,dyeInject:2.28,vorticity:25.9,vorticityScale:4.2,pressureIters:30,show:"composite",juliaMix:.55,dyeMix:1,velocityViz:0,gradientRepeat:.56,gradientPhase:.09,colorMapping:"orbit-point",colorIter:96,trapCenter:[1.17,0],dyeBlend:"add",dyeDecayMode:"vivid",dyeSaturationBoost:1.01,toneMapping:"filmic",exposure:2.295,vibrance:1.87,bloomAmount:1.35,bloomThreshold:1,aberration:1.12,refraction:0,refractSmooth:1,caustics:3.9,interiorColor:[.02,.04,.08],edgeMargin:.04,forceCap:12,collisionEnabled:!0},gradient:{stops:N([[0,"#000000"],[.202,"#05233d"],[.362,"#0f6884"],[.521,"#56c6c0"],[.681,"#f0fff1"],[.84,"#e7bd69"],[1,"#8a3f19"]]),colorSpace:"linear",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.513,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.573,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"}},{id:"ink-canyon",name:"Ink Canyon",desc:"Monochrome dye threading between twin collision walls — one at the near edge, one deep in the field.",params:{juliaC:[-.7763636363636364,.19684858842329547],center:[.019054061889010376,-.007321977964897804],zoom:1.2904749020480561,maxIter:310,power:2,kind:"julia",forceMode:"curl",forceSource:"smoothPot",forceGain:1200,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:5.9,pressureIters:50,show:"dye",juliaMix:.45,dyeMix:1,velocityViz:0,gradientRepeat:1,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",aberration:.27,refraction:0,caustics:0,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,collisionEnabled:!0},gradient:{stops:N([[0,"#000000"],[1,"#FFFFFF"]]),colorSpace:"linear",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.02,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.07,color:"#000000",bias:.5,interpolation:"step"},{id:"c3",position:.833,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c4",position:.883,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"}},{id:"plasma-vein",name:"Plasma Vein",desc:"Fractional power (1.5) with 7× repeated blue/red bands. Vivid chroma decay keeps the refracted dye electric.",params:{juliaC:[-.1764262149580809,.1951288073545453],center:[.21016359187729639,-.014585098813268887],zoom:.975889617512663,maxIter:310,power:1.5,kind:"julia",forceMode:"curl",forceSource:"paletteLuma",forceGain:1200,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:5.9,pressureIters:50,show:"dye",juliaMix:.7,dyeMix:1,velocityViz:0,gradientRepeat:7.43,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",dyeDecayMode:"vivid",toneMapping:"filmic",exposure:1.86,vibrance:1.645,aberration:.5,refraction:.006,refractSmooth:11.8,caustics:0,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40},gradient:{stops:N([[0,"#000000"],[.143,"#001830"],[.286,"#004060"],[.429,"#00BFFF"],[.571,"#006080"],[.714,"#600000"],[.857,"#DC0000"],[1,"#FF4040"]]),colorSpace:"linear",blendSpace:"rgb"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.536,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.586,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"}},{id:"crater-drift",name:"Crater Drift",desc:"Mandelbrot under inward curl, inferno-magenta palette. Slow auto-orbit carves craters through the bloom.",params:{juliaC:[.56053050672182,.468459152016546],center:[-.9313160617349564,-.15288948147190096],zoom:1.1807159194396142,maxIter:604,power:2,kind:"mandelbrot",forceMode:"curl",forceSource:"smoothPot",forceGain:-535.6,interiorDamp:0,dissipation:.16,dyeDissipation:.05,dyeInject:3,vorticity:2.9,vorticityScale:1.2,pressureIters:48,show:"composite",juliaMix:0,dyeMix:1.01,velocityViz:0,gradientRepeat:.66,gradientPhase:0,colorMapping:"iterations",colorIter:263,trapCenter:[1.51,-1.37],dyeBlend:"max",dyeDecayMode:"perceptual",dyeChromaDecayHz:0,toneMapping:"filmic",exposure:20.63,vibrance:1.645,bloomAmount:.63,bloomThreshold:.76,aberration:.4,refraction:0,caustics:0,interiorColor:[.02,.02,.03],edgeMargin:.04,forceCap:38.5,collisionEnabled:!0},gradient:{stops:N([[.084,"#000004"],[.215,"#280B54"],[.346,"#65156E"],[.477,"#9F2A63"],[.607,"#D44842"],[.738,"#F52D15"],[.869,"#FA2727"],[1,"#FF7983"]]),colorSpace:"srgb",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.532,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.659,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"},animations:ge(.01,.05)},{id:"quartic-strata",name:"Quartic Strata",desc:"Power-4 Julia drifting on a subtle c-track. Strata of blue/red dye held by a near-edge wall.",params:{juliaC:[.7072727272727275,-.1398788174715911],center:[-.0013928986324417691,-.010035496866822907],zoom:.975889617512663,maxIter:310,power:4,kind:"julia",forceMode:"c-track",forceSource:"smoothPot",forceGain:1,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:1,pressureIters:50,show:"dye",juliaMix:.45,dyeMix:1,velocityViz:0,gradientRepeat:2,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",aberration:.27,refraction:.037,caustics:1,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,collisionEnabled:!0},gradient:{stops:N([[0,"#000000"],[.143,"#001830"],[.286,"#004060"],[.429,"#00BFFF"],[.571,"#006080"],[.714,"#600000"],[.857,"#DC0000"],[1,"#FF4040"]]),colorSpace:"linear",blendSpace:"rgb"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.113,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.163,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"},animations:ge(.01,.2)},{id:"sunset-bands",name:"Sunset Bands",desc:"Force-gradient mode with hard band colouring — sunset strata pushed inward at 1536 sim.",params:{juliaC:[-.16545454545454558,.6455757279829545],center:[-.1012543995130697,.03079433116134145],zoom:1.086757425434934,maxIter:175,power:2,kind:"julia",forceMode:"gradient",forceSource:"paletteLuma",forceGain:1500,interiorDamp:5.8,dissipation:.22,dyeDissipation:.5,dyeInject:.55,vorticity:0,pressureIters:30,show:"composite",juliaMix:.55,dyeMix:2,velocityViz:0,gradientRepeat:1.35,gradientPhase:.055,colorMapping:"bands",colorIter:175,dyeBlend:"over",aberration:.27,refraction:0,caustics:1,interiorColor:[.02,.02,.03],edgeMargin:.04,forceCap:12},gradient:{stops:N([[0,"#04001f"],[.167,"#1a1049"],[.333,"#4e2085"],[.5,"#b13a8a"],[.667,"#ff7657"],[.833,"#ffc569"],[1,"#fff9d0"]]),colorSpace:"linear",blendSpace:"oklab"}},{id:"verdant-pulse",name:"Verdant Pulse",desc:"Viridis-to-magenta orbit-circle ring, wide vorticity, slow auto-orbit — the set breathes green and pink.",params:{juliaC:[-.7,.27015],center:[-.15958346356258324,-.09244114001481094],zoom:1.3957783246444389,maxIter:160,power:2,kind:"julia",forceMode:"c-track",forceSource:"paletteLuma",forceGain:10,interiorDamp:.45,dissipation:.2,dyeDissipation:.17,dyeInject:.9,vorticity:16,vorticityScale:5.8,pressureIters:30,show:"composite",juliaMix:0,dyeMix:3.805,velocityViz:0,gradientRepeat:1,gradientPhase:.03,colorMapping:"orbit-circle",colorIter:94,dyeBlend:"over",dyeDecayMode:"perceptual",exposure:.35,vibrance:1.645,aberration:.27,refraction:.037,caustics:1,interiorColor:[.02,0,.04],edgeMargin:.04,forceCap:12,collisionEnabled:!0},gradient:{stops:N([[0,"#000000"],[.061,"#440154"],[.143,"#46327F"],[.286,"#365C8D"],[.429,"#277F8E"],[.571,"#1FA187"],[.714,"#4AC26D"],[.857,"#3ADA62"],[1,"#FD25B6"]]),colorSpace:"linear",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.037,color:"#000000",bias:.5,interpolation:"linear"},{id:"c2",position:.943,color:"#000000",bias:.5,interpolation:"step"},{id:"c3",position:1,color:"#626262",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"},animations:ge(.035,.02)}],ke=G(["none","reinhard","agx","filmic"],"Tone mapping",{optionLabels:{agx:"AgX"},optionHints:{none:"Linear — clamp at 1.0. Crushes highlights.",reinhard:"c/(1+c). Smooth but desaturates highlights.",agx:"Sobotka AgX. Hue-stable, vibrant.",filmic:"Hable Uncharted-2 filmic. Cinematic s-curve."}}),tr=ke.values,ir=ke.fromIndex,rr={id:"postFx",name:"Post FX",category:"Look",tabConfig:{label:"Post-FX"},params:{bloomAmount:{type:"float",default:0,min:0,max:3,step:.01,label:"Bloom",description:"Bloom strength — wide soft glow on bright pixels. Core of the electric look."},bloomThreshold:{type:"float",default:1,min:0,max:3,step:.01,label:"Bloom threshold",condition:{param:"bloomAmount",gt:0},description:"Luminance threshold: pixels below this don't contribute to bloom. Lower = more of the image glows."},aberration:{type:"float",default:.27,min:0,max:3,step:.01,label:"Aberration",description:"Chromatic aberration keyed to local velocity — plasma fringing on fast-moving dye regions. Affects dye only; fractal stays sharp."},refraction:{type:"float",default:.037,min:0,max:.3,step:.001,label:"Refraction",description:"Screen-space refraction: dye's luminance acts as a height field — the fractal underneath warps like glass."},refractSmooth:{type:"float",default:3,min:1,max:12,step:.1,label:"Refract smooth",condition:{param:"refraction",gt:0},description:"Stencil width (in dye texels) for the refraction gradient. Higher = smoother distortion, less pixel jitter; 1 = raw single-pixel gradient."},refractRoughness:{type:"float",default:0,min:0,max:1,step:.01,label:"Refract roughness",condition:{param:"refraction",gt:0},description:"Frosted-glass scatter for the refracted fractal. 0 = crisp polished glass (single-tap). 1 = ~5px Vogel-disc blur — light scatters into a cone like real rough surfaces. Mask + walls blur in step so glass edges stay consistent."},caustics:{type:"float",default:1,min:0,max:25,step:.1,label:"Caustics",description:"Laplacian-of-dye highlight — simulates focused-light caustics where the liquid surface bends."},toneMapping:{...ke.config,description:"How final colour gets compressed. None = maximally vivid (may clip). AgX = 2023 hue-stable roll-off (best for rich colours). Reinhard desaturates highlights."},exposure:{type:"float",default:1,min:.1,max:5,step:.01,label:"Exposure",description:"Multiplier on final colour BEFORE tone mapping. Crank up to make dim gradient stops punch."},vibrance:{type:"float",default:1.645,min:0,max:1,step:.01,label:"Vibrance",description:"Chroma-aware saturation — boosts dull pixels without posterising already-vivid ones."}}},or=(r,e)=>{r.setParams({toneMapping:ir(e.toneMapping),exposure:e.exposure,vibrance:e.vibrance,bloomAmount:e.bloomAmount,bloomThreshold:e.bloomThreshold,aberration:e.aberration,refraction:e.refraction,refractSmooth:e.refractSmooth,refractRoughness:e.refractRoughness,caustics:e.caustics})},Le=G(["composite","julia","dye","velocity"],"Show",{optionLabels:{composite:"Mixed",julia:"Fractal"},optionHints:{composite:"Fractal + dye + velocity overlay (the full picture).",julia:"Just the fractal — no fluid layer.",dye:"Just the dye — no fractal underneath.",velocity:"Velocity field as colour. Diagnostic only."}}),ar=Le.values,sr=Le.fromIndex,xe=0,nr={id:"composite",name:"Composite",category:"Look",tabConfig:{label:"Composite"},params:{show:{...Le.config,description:"What you see. The simulation runs the same either way. Mixed = fractal + dye + optional velocity overlay. Fractal = pure fractal, fluid hidden. Dye = fluid dye only (what the fractal wrote). Velocity = per-pixel velocity as a hue wheel."},juliaMix:{type:"float",default:.4,min:0,max:2,step:.01,label:"Julia mix",condition:{param:"show",eq:xe},description:"How much fractal color shows through in Mixed view."},dyeMix:{type:"float",default:2,min:0,max:2,step:.01,label:"Dye mix",condition:{param:"show",eq:xe},description:"How much fluid dye shows through in Mixed view."},velocityViz:{type:"float",default:.02,min:0,max:2,step:.01,label:"Velocity viz",condition:{param:"show",eq:xe},description:"Overlay velocity-hue on top of the composite. Diagnostic."}}},lr=(r,e)=>{r.setParams({show:sr(e.show),juliaMix:e.juliaMix,dyeMix:e.dyeMix,velocityViz:e.velocityViz})},Z=r=>{const e=B.get(r);if(!e)return{};const i={};for(const[t,o]of Object.entries(e.params)){const a=o.default;a&&typeof a=="object"&&!Array.isArray(a)?i[t]={...a}:Array.isArray(a)?i[t]=[...a]:i[t]=a}return i},V=(r,e)=>{if(typeof e!="string")return;const i=r.indexOf(e);return i>=0?i:void 0},le=r=>r?{x:r[0],y:r[1]}:void 0,cr=r=>r?{x:r[0],y:r[1],z:r[2]}:void 0,ur=r=>{const e=globalThis.__store;if(!e){console.warn("[applyRefPreset] store not ready — window.__store is undefined");return}const i=e.getState(),t=r.params,o={},a=V(Me,t.kind);a!==void 0&&(o.kind=a),t.juliaC&&(o.juliaC=le(t.juliaC)),t.center&&(o.center=le(t.center),o.centerLow={x:0,y:0}),t.zoom!==void 0&&(o.zoom=t.zoom),t.maxIter!==void 0&&(o.maxIter=t.maxIter),t.power!==void 0&&(o.power=t.power),i.setJulia({...Z("julia"),...o});const s={},n=V(vi,t.forceMode);n!==void 0&&(s.forceMode=n);const l=V(yi,t.forceSource);l!==void 0&&(s.forceSource=l),t.forceGain!==void 0&&(s.forceGain=t.forceGain),t.interiorDamp!==void 0&&(s.interiorDamp=t.interiorDamp),t.forceCap!==void 0&&(s.forceCap=t.forceCap),t.edgeMargin!==void 0&&(s.edgeMargin=t.edgeMargin),i.setCoupling({...Z("coupling"),...s}),typeof i.setAnimations=="function"&&i.setAnimations(r.animations??[]);const c={};t.vorticity!==void 0&&(c.vorticity=t.vorticity),t.vorticityScale!==void 0&&(c.vorticityScale=t.vorticityScale),t.dissipation!==void 0&&(c.dissipation=t.dissipation),t.pressureIters!==void 0&&(c.pressureIters=t.pressureIters),t.dyeInject!==void 0&&(c.dyeInject=t.dyeInject),t.dyeDissipation!==void 0&&(c.dyeDissipation=t.dyeDissipation),t.dyeChromaDecayHz!==void 0&&(c.dyeChromaDecayHz=t.dyeChromaDecayHz),t.dyeSaturationBoost!==void 0&&(c.dyeSaturationBoost=t.dyeSaturationBoost);const p=V(Bi,t.dyeDecayMode);p!==void 0&&(c.dyeDecayMode=p);const h=V(zi,t.dyeBlend);h!==void 0&&(c.dyeBlend=h),i.setFluidSim({...Z("fluidSim"),...c});const d={},x=V(Ui,t.colorMapping);x!==void 0&&(d.colorMapping=x),t.colorIter!==void 0&&(d.colorIter=t.colorIter),t.gradientRepeat!==void 0&&(d.gradientRepeat=t.gradientRepeat),t.gradientPhase!==void 0&&(d.gradientPhase=t.gradientPhase),t.trapCenter&&(d.trapCenter=le(t.trapCenter)),t.trapRadius!==void 0&&(d.trapRadius=t.trapRadius),t.trapNormal&&(d.trapNormal=le(t.trapNormal)),t.trapOffset!==void 0&&(d.trapOffset=t.trapOffset),t.stripeFreq!==void 0&&(d.stripeFreq=t.stripeFreq),t.interiorColor&&(d.interiorColor=cr(t.interiorColor)),r.gradient&&(d.gradient=r.gradient),i.setPalette({...Z("palette"),...d});const M={enabled:!!t.collisionEnabled};r.collisionGradient&&(M.gradient=r.collisionGradient),i.setCollision({...Z("collision"),...M});const f={},v=V(tr,t.toneMapping);v!==void 0&&(f.toneMapping=v),t.exposure!==void 0&&(f.exposure=t.exposure),t.vibrance!==void 0&&(f.vibrance=t.vibrance),t.bloomAmount!==void 0&&(f.bloomAmount=t.bloomAmount),t.bloomThreshold!==void 0&&(f.bloomThreshold=t.bloomThreshold),t.aberration!==void 0&&(f.aberration=t.aberration),t.refraction!==void 0&&(f.refraction=t.refraction),t.refractSmooth!==void 0&&(f.refractSmooth=t.refractSmooth),t.caustics!==void 0&&(f.caustics=t.caustics),i.setPostFx({...Z("postFx"),...f});const b={},y=V(ar,t.show);y!==void 0&&(b.show=y),t.juliaMix!==void 0&&(b.juliaMix=t.juliaMix),t.dyeMix!==void 0&&(b.dyeMix=t.dyeMix),t.velocityViz!==void 0&&(b.velocityViz=t.velocityViz),i.setComposite({...Z("composite"),...b}),typeof i.setIsPaused=="function"&&i.setIsPaused(t.paused??!1),typeof i.setAccumulation=="function"&&i.setAccumulation(t.accumulation??!0)},dr=()=>u.jsxs("div",{className:"flex flex-col gap-3 py-2",children:[u.jsx("div",{className:"text-[10px] text-gray-500 leading-snug",children:"Each preset is a curated fractal ↔ fluid coupling. Applying one resets the grid and restores known params."}),u.jsx("div",{className:"grid grid-cols-2 gap-1",children:er.map(r=>u.jsx("button",{type:"button",title:r.desc,onClick:()=>{var e;ur(r),(e=oe.ref.current)==null||e.resetFluid()},className:"px-2 py-1 text-[10px] rounded border bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08] hover:border-cyan-500/40 transition-colors text-left",children:r.name},r.id))})]}),et=G(["paint","erase","stamp","smudge"],"Mode"),pr=et.fromIndex,tt=G(["rainbow","solid","gradient","velocity"],"Colour"),fr=tt.fromIndex,mr={id:"brush",name:"Brush",category:"Input",tabConfig:{label:"Brush"},params:{mode:{...et.config,description:"What left-drag does on the canvas. Paint = dye + force; Erase subtracts dye; Stamp deposits dye only; Smudge pushes velocity without adding dye."},size:{type:"float",default:.15,min:.003,max:.4,step:.001,label:"Size (UV)",description:"Radius in UV units (0..1 across the canvas). B+drag the canvas to resize live."},hardness:{type:"float",default:0,min:0,max:1,step:.01,label:"Hardness",description:"0 = soft gaussian edge (airbrush). 1 = hard disc (stamp)."},strength:{type:"float",default:1,min:0,max:3,step:.01,label:"Strength",description:"Dye amount per splat. 0 = dry brush, 3 = saturated. Erase mode: how much dye each splat removes."},flow:{type:"float",default:50,min:0,max:200,step:.5,label:"Flow",condition:{or:[{param:"mode",eq:0},{param:"mode",eq:3}]},description:"How much of the pointer's velocity is injected into the force field. Low = delicate, 50 = paints, 200 = whip."},spacing:{type:"float",default:.005,min:0,max:.1,step:.001,label:"Spacing (UV)",condition:{param:"particleEmitter",bool:!1},description:"Minimum travel between splats along a drag. Low = smooth stroke, high = dotted trail."},colorMode:{...tt.config,condition:{or:[{param:"mode",eq:0},{param:"mode",eq:2}]},description:"Where each splat gets its RGB. Gradient samples the palette; Solid uses the picker below; Rainbow cycles hue on its own clock."},solidColor:{type:"vec3",default:{x:1,y:1,z:1},min:0,max:1,step:.001,label:"Solid color",condition:{param:"colorMode",eq:1},description:"Explicit colour for Solid mode. Hue jitter still applies."},jitter:{type:"float",default:0,min:0,max:1,step:.01,label:"Hue jitter",condition:{and:[{param:"mode",neq:1},{param:"mode",neq:3}]},description:"Random hue wiggle per splat. 0 = exact colour, 1 = full hue wheel. Builds natural variation in long strokes. Stacks on rainbow/velocity mode too."},particleEmitter:{type:"boolean",default:!1,label:"Particle emitter",description:"Dragging spawns independent particles on their own layer. Each live particle flies with its own velocity / lifespan and acts as a mini brush — painting into the fluid with the selected mode at its own position."},particleRate:{type:"float",default:120,min:1,max:600,step:1,label:"Rate /s",condition:{param:"particleEmitter",bool:!0},description:"Particles emitted per second while dragging. Hard-capped at 300 live at once."},particleVelocity:{type:"float",default:.3,min:0,max:3,step:.01,label:"Velocity",condition:{param:"particleEmitter",bool:!0},description:"Initial speed in UV/sec. 0.3 = gentle spray, 2 = shotgun."},particleSpread:{type:"float",default:.35,min:0,max:1,step:.01,label:"Spread",condition:{param:"particleEmitter",bool:!0},description:"Angular spread around the drag direction. 0 = beam, 1 = full 360° burst."},particleGravity:{type:"float",default:0,min:-3,max:3,step:.01,label:"Gravity",condition:{param:"particleEmitter",bool:!0},description:"UV/sec² acceleration. Negative = falls down the canvas, positive = rises."},particleDrag:{type:"float",default:.6,min:0,max:4,step:.01,label:"Drag /s",condition:{param:"particleEmitter",bool:!0},description:"Air drag — 0 = ballistic (keeps speed), 2 = quickly slows, 4 = fast stop."},particleLifetime:{type:"float",default:1.2,min:.1,max:6,step:.05,label:"Lifetime",condition:{param:"particleEmitter",bool:!0},description:"Seconds before each particle is culled. Longer = more persistent streaks."},particleSizeScale:{type:"float",default:.35,min:.05,max:1.5,step:.01,label:"Size ×",condition:{param:"particleEmitter",bool:!0},description:"Per-particle stamp size as a fraction of the brush size. 0.35 = dabs a third of the brush."}}},Ne=96,hr=(r,e)=>{const t=(e-Math.floor(e))*256,o=Math.floor(t)%256,a=(o+1)%256,s=t-Math.floor(t),n=r[o*4+0]*(1-s)+r[a*4+0]*s,l=r[o*4+1]*(1-s)+r[a*4+1]*s,c=r[o*4+2]*(1-s)+r[a*4+2]*s;return[n,l,c]},gr=16,W=new Map,Ve=new WeakMap;let xr=0;const vr=r=>{const e=Ve.get(r);if(e!==void 0)return e;const i=`lut${xr++}`;return Ve.set(r,i),i},br=(r,e,i,t,o,a,s,n,l)=>`${r}|${e}|${i}|${t}|${vr(o)}|${a}|${s}|${n[0]},${n[1]},${n[2]}|${l}`,yr=(r,e,i,t,o,a,s,n,l)=>{const c=new ImageData(r,r),p=c.data,h=Math.round(n[0]*255),d=Math.round(n[1]*255),x=Math.round(n[2]*255),M=Math.round(l),f=Math.abs(l-M)<.01&&M>=2&&M<=8;for(let v=0;v<r;v++){const b=i+(v/r*2-1)*t;for(let y=0;y<r;y++){const F=e+(y/r*2-1)*t;let R=0,g=0,T=0;for(;T<Ne;T++){const S=R*R,E=g*g;if(S+E>16)break;let D,z;if(f){let _=R,j=g;for(let U=1;U<M;U++){const P=_*R-j*g;j=_*g+j*R,_=P}D=_,z=j}else{const _=Math.sqrt(S+E),j=Math.atan2(g,R),U=Math.pow(_,l),P=j*l;D=U*Math.cos(P),z=U*Math.sin(P)}R=D+F,g=z+b}const A=((r-1-v)*r+y)*4;if(T>=Ne)p[A+0]=h,p[A+1]=d,p[A+2]=x;else{const D=(T+1-Math.log2(Math.max(1e-6,.5*Math.log2(R*R+g*g))))*.05*a+s,[z,_,j]=hr(o,D);p[A+0]=Math.round(z),p[A+1]=Math.round(_),p[A+2]=Math.round(j)}p[A+3]=255}}return c},Tr=(r,e,i,t,o,a,s,n,l)=>{const c=br(r,e,i,t,o,a,s,n,l),p=W.get(c);if(p)return W.delete(c),W.set(c,p),p;const h=yr(r,e,i,t,o,a,s,n,l);for(W.set(c,h);W.size>gr;){const d=W.keys().next().value;if(d===void 0)break;W.delete(d)}return h},wr=(()=>{const r=new Uint8Array(1024);for(let e=0;e<256;e++)r[e*4]=r[e*4+1]=r[e*4+2]=e,r[e*4+3]=255;return r})(),Mr=({cx:r,cy:e,onChange:i,halfExtent:t=1.6,centerX:o=-.5,centerY:a=0,size:s=220,gradientLut:n,gradientRepeat:l=1,gradientPhase:c=0,interiorColor:p=[.04,.04,.06],power:h=2})=>{const d=C.useRef(null),x=C.useRef(null),M=C.useRef(!1);C.useEffect(()=>{const b=d.current;if(!b)return;const y=b.getContext("2d");if(!y)return;b.width=s,b.height=s;const R=Tr(s,o,a,t,n??wr,l,c,p,h);x.current=R,y.putImageData(R,0,0),f()},[s,o,a,t,n,l,c,p[0],p[1],p[2],h]);const f=C.useCallback(()=>{const b=d.current;if(!b||!x.current)return;const y=b.getContext("2d");if(!y)return;y.putImageData(x.current,0,0);const F=(r-o)/t*.5+.5,R=(e-a)/t*.5+.5,g=F*s,T=(1-R)*s;y.strokeStyle="#fff",y.lineWidth=1,y.beginPath(),y.moveTo(g-8,T),y.lineTo(g-2,T),y.moveTo(g+2,T),y.lineTo(g+8,T),y.moveTo(g,T-8),y.lineTo(g,T-2),y.moveTo(g,T+2),y.lineTo(g,T+8),y.stroke(),y.strokeStyle="rgba(0,255,200,0.9)",y.beginPath(),y.arc(g,T,4,0,2*Math.PI),y.stroke()},[r,e,o,a,t,s]);C.useEffect(()=>{f()},[f]);const v=b=>{const y=d.current;if(!y)return;const F=y.getBoundingClientRect(),R=(b.clientX-F.left)/F.width,g=1-(b.clientY-F.top)/F.height,T=o+(R*2-1)*t,A=a+(g*2-1)*t;i(T,A)};return u.jsxs("div",{className:"flex flex-col gap-1",children:[u.jsx("div",{className:"text-[10px] text-gray-400 uppercase tracking-wide",children:"Pick Julia c"}),u.jsx("canvas",{ref:d,className:"rounded border border-white/10 cursor-crosshair",style:{width:s,height:s,imageRendering:"pixelated"},onPointerDown:b=>{M.current=!0,b.target.setPointerCapture(b.pointerId),v(b)},onPointerMove:b=>{M.current&&v(b)},onPointerUp:b=>{M.current=!1;try{b.target.releasePointerCapture(b.pointerId)}catch{}}}),u.jsxs("div",{className:"text-[10px] font-mono text-gray-500",children:["c = (",r.toFixed(4),", ",e.toFixed(4),")"]})]})},Sr=({sliceState:r,actions:e})=>{const i=r.juliaC??{x:-.36303304426511473,y:.16845183018751916},t=r.power??2,o=C.useMemo(()=>{},[]);return u.jsx(Mr,{cx:i.x,cy:i.y,power:t,gradientLut:o,onChange:(a,s)=>e.setJulia({juliaC:{x:a,y:s}})})};pe.register("julia-c-picker",Sr);pe.register("preset-grid",dr);B.register(fi);B.register(gi);B.register(wi);B.register(Xi);B.register(Ki);B.register($i);B.register(rr);B.register(nr);B.register(mr);B.register(Qi);pt({version:1,id:"fluid-toy.tab-parity-restructure",apply:r=>(r!=null&&r.features&&(ft(r,"dye","palette"),L(r,"palette.collisionEnabled","collision.enabled"),L(r,"palette.collisionPreview","collision.preview"),L(r,"palette.collisionGradient","collision.gradient"),L(r,"palette.collisionRepeat","collision.repeat"),L(r,"palette.collisionPhase","collision.phase"),L(r,"palette.dyeMix","composite.dyeMix"),L(r,"palette.dyeInject","fluidSim.dyeInject"),L(r,"palette.dyeDissipation","fluidSim.dyeDissipation"),L(r,"palette.dyeDecayMode","fluidSim.dyeDecayMode"),L(r,"palette.dyeChromaDecayHz","fluidSim.dyeChromaDecayHz"),L(r,"palette.dyeSaturationBoost","fluidSim.dyeSaturationBoost"),L(r,"fluidSim.forceMode","coupling.forceMode"),L(r,"fluidSim.forceGain","coupling.forceGain"),L(r,"fluidSim.interiorDamp","coupling.interiorDamp"),L(r,"fluidSim.forceCap","coupling.forceCap"),L(r,"fluidSim.edgeMargin","coupling.edgeMargin"),delete r.features.orbit,L(r,"sceneCamera.center","julia.center"),L(r,"sceneCamera.zoom","julia.zoom"),r.features.sceneCamera&&Object.keys(r.features.sceneCamera).length===0&&delete r.features.sceneCamera),r)});const Cr=()=>({mode:"idle",pointerId:-1,lastX:0,lastY:0,lastT:0,startX:0,startY:0,startCx:0,startCy:0,startCxLow:0,startCyLow:0,startZoom:1,zoomAnchorX:0,zoomAnchorY:0,zoomAnchorXLow:0,zoomAnchorYLow:0,zoomAnchorU:.5,zoomAnchorV:.5,rightDragged:!1,startBrushSize:.15}),Rr=1e-5,it=8,Ar=1e-300,Fr=5,Er=.002,Dr=.005,Pr=5,kr=.2,ve=256,Lr=.5,J={b:!1,c:!1},Ir=()=>{const r=document.activeElement;if(!r)return!1;const e=r.tagName;return e==="INPUT"||e==="TEXTAREA"||r.isContentEditable},jr=()=>{C.useEffect(()=>{const r=t=>{Ir()||(t.code==="KeyB"&&(J.b=!0),t.code==="KeyC"&&(J.c=!0))},e=t=>{t.code==="KeyB"&&(J.b=!1),t.code==="KeyC"&&(J.c=!1)},i=()=>{J.b=!1,J.c=!1};return window.addEventListener("keydown",r),window.addEventListener("keyup",e),window.addEventListener("blur",i),()=>{window.removeEventListener("keydown",r),window.removeEventListener("keyup",e),window.removeEventListener("blur",i)}},[])},ae=(r,e)=>r?Pr:e?kr:1,zr=(r,e,i)=>{const t=w(o=>o.openContextMenu);C.useEffect(()=>{const o=r.current;if(!o)return;const a=s=>{var d,x,M,f;s.preventDefault();const n=i.current;if(!n)return;if(n.rightDragged){n.rightDragged=!1;return}const l=w.getState(),c=(d=l.julia)==null?void 0:d.juliaC,p=!!((x=l.fluidSim)!=null&&x.paused),h=[{label:`Copy Julia c (${((M=c==null?void 0:c.x)==null?void 0:M.toFixed(3))??"?"}, ${((f=c==null?void 0:c.y)==null?void 0:f.toFixed(3))??"?"})`,action:()=>{var b;if(!c)return;const v=`${c.x.toFixed(6)}, ${c.y.toFixed(6)}`;(b=navigator.clipboard)==null||b.writeText(v).catch(()=>{})}},{label:p?"Resume Sim":"Pause Sim",action:()=>{l.setFluidSim({paused:!p})}},{label:"Recenter View",action:()=>{l.setJulia({center:{x:0,y:0},zoom:1.5})}},{label:"Reset Fluid Fields",action:()=>{var v;(v=e.current)==null||v.resetFluid()}}];t(s.clientX,s.clientY,h,["ui.fluid-canvas"])};return o.addEventListener("contextmenu",a),()=>o.removeEventListener("contextmenu",a)},[r,e,i,t])},ue=(r,e)=>{const i=r+e,t=i-r,o=r-(i-t)+(e-t);return[i,o]},X=(r,e,i)=>{const[t,o]=ue(r,i),[a,s]=ue(t,e+o);return[a,s]},He=(r,e,i,t)=>{const[o,a]=ue(r,-i),[s,n]=ue(o,a+(e-t));return[s,n]},_r=(r,e)=>{var o,a,s,n,l,c,p,h;const i=e.stateRef.current,t=w.getState();i.mode="pan-pending",i.startCx=((a=(o=t.julia)==null?void 0:o.center)==null?void 0:a.x)??0,i.startCy=((n=(s=t.julia)==null?void 0:s.center)==null?void 0:n.y)??0,i.startCxLow=((c=(l=t.julia)==null?void 0:l.centerLow)==null?void 0:c.x)??0,i.startCyLow=((h=(p=t.julia)==null?void 0:p.centerLow)==null?void 0:h.y)??0,i.rightDragged=!1,e.canvas.setPointerCapture(r.pointerId),e.handleInteractionStart("camera")},Br=(r,e)=>{var v,b;const i=e.stateRef.current,t=e.canvas.getBoundingClientRect();if(t.width<1||t.height<1)return;if(i.mode==="pan-pending"){if(Math.hypot(r.clientX-i.startX,r.clientY-i.startY)<=Fr)return;i.mode="pan",i.rightDragged=!0}const a=((v=w.getState().julia)==null?void 0:v.zoom)??1.5,s=t.width/t.height,n=ae(r.shiftKey,r.altKey),l=r.clientX-i.startX,c=r.clientY-i.startY,p=-(l/t.width)*2*s*a*n,h=c/t.height*2*a*n,[d,x]=X(i.startCx,i.startCxLow,p),[M,f]=X(i.startCy,i.startCyLow,h);e.pendingViewRef.current={center:{x:d,y:M},centerLow:{x,y:f},zoom:a},(b=e.engineRef.current)==null||b.setParams({center:[d,M],centerLow:[x,f]}),i.lastX=r.clientX,i.lastY=r.clientY},rt=()=>{const r=w.getState().deepZoom;return r&&r.enabled?Ar:Rr},Or=(r,e)=>{var v,b,y,F,R,g;r.preventDefault();const i=e.canvas.getBoundingClientRect();if(i.width<1||i.height<1)return;const t=e.stateRef.current,o=w.getState(),a=((v=o.julia)==null?void 0:v.center)??{x:0,y:0},s=((b=o.julia)==null?void 0:b.zoom)??1.5,n=(r.clientX-i.left)/i.width,l=1-(r.clientY-i.top)/i.height,c=i.width/i.height;t.mode="zoom",t.startZoom=s,t.zoomAnchorU=n,t.zoomAnchorV=l;const p=((F=(y=o.julia)==null?void 0:y.centerLow)==null?void 0:F.x)??0,h=((g=(R=o.julia)==null?void 0:R.centerLow)==null?void 0:g.y)??0,d=(n*2-1)*c*s,x=(l*2-1)*s,M=X(a.x,p,d),f=X(a.y,h,x);t.zoomAnchorX=M[0],t.zoomAnchorXLow=M[1],t.zoomAnchorY=f[0],t.zoomAnchorYLow=f[1],e.canvas.setPointerCapture(r.pointerId),e.handleInteractionStart("camera")},Ur=(r,e)=>{var f;const i=e.stateRef.current,t=e.canvas.getBoundingClientRect();if(t.width<1||t.height<1)return;const o=ae(r.shiftKey,r.altKey),a=r.clientY-i.startY,s=Math.exp(a*Dr*o),n=Math.max(rt(),Math.min(it,i.startZoom*s)),l=t.width/t.height,c=-(i.zoomAnchorU*2-1)*l*n,p=-(i.zoomAnchorV*2-1)*n,[h,d]=X(i.zoomAnchorX,i.zoomAnchorXLow,c),[x,M]=X(i.zoomAnchorY,i.zoomAnchorYLow,p);e.pendingViewRef.current={center:{x:h,y:x},centerLow:{x:d,y:M},zoom:n},(f=e.engineRef.current)==null||f.setParams({center:[h,x],centerLow:[d,M],zoom:n}),i.lastX=r.clientX,i.lastY=r.clientY},Gr=r=>{let e=null;return{onWheel:o=>{var A;o.preventDefault();const a=r.canvas.getBoundingClientRect();if(a.width<1||a.height<1)return;const s=r.pendingViewRef.current??(()=>{var E,D,z;const S=w.getState();return{center:((E=S.julia)==null?void 0:E.center)??{x:0,y:0},centerLow:((D=S.julia)==null?void 0:D.centerLow)??{x:0,y:0},zoom:((z=S.julia)==null?void 0:z.zoom)??1.5}})(),n=s.center,l=s.centerLow,c=s.zoom,p=ae(o.shiftKey,o.altKey),h=Math.pow(.9,-o.deltaY*Er*p),d=(o.clientX-a.left)/a.width,x=1-(o.clientY-a.top)/a.height,M=a.width/a.height,f=Math.max(rt(),Math.min(it,c*h)),v=c-f,b=(d*2-1)*M*v,y=(x*2-1)*v,[F,R]=X(n.x,l.x,b),[g,T]=X(n.y,l.y,y);r.pendingViewRef.current={center:{x:F,y:g},centerLow:{x:R,y:T},zoom:f},(A=r.engineRef.current)==null||A.setParams({center:[F,g],centerLow:[R,T],zoom:f}),e!==null&&window.clearTimeout(e),e=window.setTimeout(()=>{if(e=null,!r.pendingViewRef.current)return;const S=r.pendingViewRef.current;r.pendingViewRef.current=null,w.getState().setJulia({center:S.center,centerLow:S.centerLow,zoom:S.zoom})},100)},cleanup:()=>{e!==null&&window.clearTimeout(e)}}},Ie=()=>{const r=w.getState(),e=q(r.brush,"brush",r.liveModulations??{});return{mode:pr(e.mode),colorMode:fr(e.colorMode),solidColor:[e.solidColor.x,e.solidColor.y,e.solidColor.z],gradientLut:Y.ref.current.gradientLut,size:e.size,hardness:e.hardness,strength:e.strength,flow:e.flow,spacing:e.spacing,jitter:e.jitter,particleEmitter:e.particleEmitter,particleRate:e.particleRate,particleVelocity:e.particleVelocity,particleSpread:e.particleSpread,particleGravity:e.particleGravity,particleDrag:e.particleDrag,particleLifetime:e.particleLifetime,particleSizeScale:e.particleSizeScale}},Nr=(r,e)=>{const i=e.stateRef.current;i.mode="splat",e.handleInteractionStart("param"),Ii(Y.ref.current.runtime),$.ref.current.dragging=!0;const t=e.canvas.getBoundingClientRect();if(t.width<1||t.height<1||!e.engineRef.current)return;const o=(r.clientX-t.left)/t.width,a=1-(r.clientY-t.top)/t.height;$.ref.current.uv={u:o,v:a},$.ref.current.velUv=null,Li(Y.ref.current.runtime,{u:o,v:a,dvx:0,dvy:0,params:Ie(),engine:e.engineRef.current,wallClockMs:performance.now()})},Vr=(r,e)=>{const i=e.engineRef.current;if(!i)return;const t=e.stateRef.current,o=e.canvas.getBoundingClientRect();if(o.width<1||o.height<1)return;const a=performance.now(),s=Math.max(.001,(a-t.lastT)/1e3),n=r.clientX-t.lastX,l=r.clientY-t.lastY,c=(r.clientX-o.left)/o.width,p=1-(r.clientY-o.top)/o.height,h=n/o.width/s,d=-(l/o.height)/s,x=Math.hypot(n/o.width,l/o.height);Y.ref.current.runtime.distSinceSplat+=x,$.ref.current.uv={u:c,v:p},$.ref.current.velUv={vx:h,vy:d},ki(Y.ref.current.runtime,{u:c,v:p,dvx:h,dvy:d,params:Ie(),engine:i,wallClockMs:a}),t.lastX=r.clientX,t.lastY=r.clientY,t.lastT=a},Hr=(r,e)=>{var o,a,s,n;const i=e.stateRef.current,t=w.getState();i.mode="pick-c",i.startCx=((a=(o=t.julia)==null?void 0:o.juliaC)==null?void 0:a.x)??0,i.startCy=((n=(s=t.julia)==null?void 0:s.juliaC)==null?void 0:n.y)??0,e.canvas.setPointerCapture(r.pointerId),e.handleInteractionStart("param")},Jr=(r,e)=>{var d;const i=e.stateRef.current,t=e.canvas.getBoundingClientRect();if(t.width<1||t.height<1)return;const o=w.getState(),a=((d=o.julia)==null?void 0:d.zoom)??1.5,s=t.width/t.height,n=ae(r.shiftKey,r.altKey),l=r.clientX-i.startX,c=r.clientY-i.startY,p=l/t.width*2*s*a*n,h=-(c/t.height)*2*a*n;o.setJulia({juliaC:{x:i.startCx+p,y:i.startCy+h}}),i.lastX=r.clientX,i.lastY=r.clientY},Xr=(r,e)=>{var o;const i=e.stateRef.current,t=w.getState();i.mode="resize-brush",i.startBrushSize=((o=t.brush)==null?void 0:o.size)??.15,e.canvas.setPointerCapture(r.pointerId),e.handleInteractionStart("param")},Zr=(r,e)=>{const i=e.stateRef.current,t=w.getState(),o=ae(r.shiftKey,r.altKey),a=r.clientX-i.startX,s=Math.exp(a*.0033*o),n=Math.max(.003,Math.min(.4,i.startBrushSize*s));t.setBrush({size:n}),i.lastX=r.clientX,i.lastY=r.clientY},Wr=(r,e,i,t)=>{const o=w(s=>s.handleInteractionStart),a=w(s=>s.handleInteractionEnd);C.useEffect(()=>{const s=r.current;if(!s||!i.current)return;const n={canvas:s,engineRef:e,pendingViewRef:t,stateRef:i,handleInteractionStart:o,handleInteractionEnd:a},l=d=>{const x=i.current;if(x.pointerId=d.pointerId,x.lastX=d.clientX,x.lastY=d.clientY,x.lastT=performance.now(),x.startX=d.clientX,x.startY=d.clientY,d.button===2)return _r(d,n);if(d.button===1)return Or(d,n);if(d.button===0)return J.c?Hr(d,n):J.b?Xr(d,n):Nr(d,n)},c=d=>{switch(i.current.mode){case"idle":return;case"pick-c":return Jr(d,n);case"resize-brush":return Zr(d,n);case"pan-pending":case"pan":return Br(d,n);case"zoom":return Ur(d,n);case"splat":return Vr(d,n)}},p=d=>{const x=i.current;if(x.pointerId===d.pointerId){try{s.releasePointerCapture(d.pointerId)}catch{}x.pointerId=-1}if(t.current){const M=t.current;t.current=null,w.getState().setJulia({center:M.center,centerLow:M.centerLow,zoom:M.zoom})}x.mode="idle",$.ref.current.dragging=!1,a()},h=Gr(n);return s.addEventListener("pointerdown",l),s.addEventListener("pointermove",c),s.addEventListener("pointerup",p),s.addEventListener("pointercancel",p),s.addEventListener("pointerleave",p),s.addEventListener("wheel",h.onWheel,{passive:!1}),()=>{s.removeEventListener("pointerdown",l),s.removeEventListener("pointermove",c),s.removeEventListener("pointerup",p),s.removeEventListener("pointercancel",p),s.removeEventListener("pointerleave",p),s.removeEventListener("wheel",h.onWheel),h.cleanup()}},[r,e,i,t,o,a])},Kr=({canvasRef:r,engineRef:e})=>{const i=C.useRef(Cr()),t=C.useRef(null);return jr(),zr(r,e,i),Wr(r,e,i,t),null},qr=()=>{const r=B.getViewportOverlays().filter(e=>e.type==="dom");return u.jsx("div",{className:"absolute inset-0 pointer-events-none z-[20]",children:r.map(e=>{const i=pe.get(e.componentId);return i?u.jsx($r,{cfg:e,Component:i},e.id):null})})},$r=({cfg:r,Component:e})=>{const i=w(o=>o[r.id]);if(!i)return null;const t=w.getState();return u.jsx(e,{featureId:r.id,sliceState:i,actions:t})},ot={orbitLength:0,precisionBits:0,orbitBuildMs:0,laStageCount:0,laCount:0,laBuildMs:0,laStagesPerLevel:[],juliaMs:0};let ie=ot;const de=new Set,at=r=>{ie=r,de.forEach(e=>e(r))},Yr=r=>{Math.abs(ie.juliaMs-r)<.05||(ie={...ie,juliaMs:r},de.forEach(e=>e(ie)))},Qr=()=>{at(ot)},eo=()=>{const[r,e]=C.useState(ie);return C.useEffect(()=>(de.add(e),()=>{de.delete(e)}),[]),r},to=()=>{const r=w(l=>{var c;return((c=l.julia)==null?void 0:c.zoom)??1}),e=w(l=>{var c,p;return((p=(c=l.julia)==null?void 0:c.center)==null?void 0:p.x)??0}),i=w(l=>{var c,p;return((p=(c=l.julia)==null?void 0:c.center)==null?void 0:p.y)??0}),t=eo(),o=r>0?Math.log10(r):0,a=r>0?`1e${o.toFixed(2)} (${r.toExponential(2)})`:"invalid",s=t.laCount>0,n=t.laStagesPerLevel.length>0?t.laStagesPerLevel.join(","):"—";return u.jsxs("div",{style:{fontSize:"10.5px",lineHeight:"1.5",fontFamily:'ui-monospace, "SF Mono", Menlo, monospace',color:"#9ca3af",padding:"6px 8px",background:"rgba(255,255,255,0.03)",borderRadius:"4px",margin:"4px 0"},children:[u.jsxs("div",{children:["zoom: ",u.jsx("span",{style:{color:"#e5e7eb"},children:a})]}),u.jsxs("div",{children:["centre: ",u.jsxs("span",{style:{color:"#e5e7eb"},children:["(",e.toExponential(3),", ",i.toExponential(3),")"]})]}),t.orbitLength>0&&u.jsxs("div",{children:["orbit: ",u.jsx("span",{style:{color:"#e5e7eb"},children:t.orbitLength})," iters @ ",t.precisionBits,"b (",t.orbitBuildMs.toFixed(0),"ms)"]}),s&&u.jsxs("div",{children:["LA: ",u.jsx("span",{style:{color:"#e5e7eb"},children:t.laStageCount})," stages, ",u.jsx("span",{style:{color:"#e5e7eb"},children:t.laCount})," nodes [",n,"] (",t.laBuildMs.toFixed(0),"ms)"]}),t.juliaMs>0&&u.jsxs("div",{children:["GPU: ",u.jsxs("span",{style:{color:"#e5e7eb"},children:[t.juliaMs.toFixed(2),"ms"]})," per Julia pass (~",Math.round(1e3/Math.max(.1,t.juliaMs))," fps)"]})]})},ce=r=>new Promise(e=>{let i=0;const t=()=>{i++,i>=r?e():requestAnimationFrame(t)};requestAnimationFrame(t)}),io=r=>{if(r.length===0)return 0;const e=[...r].sort((i,t)=>i-t);return e[Math.floor(e.length/2)]},st=[{name:"standard / shallow",center:[-.81,-.054],zoom:1.29,iter:310,deep:!1,useLA:!1,useAT:!1},{name:"deep shallow / no LA / no AT",center:[-.81,-.054],zoom:1.29,iter:1e3,deep:!0,useLA:!1,useAT:!1},{name:"deep shallow / LA",center:[-.81,-.054],zoom:1.29,iter:1e3,deep:!0,useLA:!0,useAT:!1},{name:"deep shallow / LA + AT",center:[-.81,-.054],zoom:1.29,iter:1e3,deep:!0,useLA:!0,useAT:!0},{name:"deep 1e-5 / no LA / no AT",center:[-.81,-.054],zoom:1e-5,iter:2e3,deep:!0,useLA:!1,useAT:!1},{name:"deep 1e-5 / LA",center:[-.81,-.054],zoom:1e-5,iter:2e3,deep:!0,useLA:!0,useAT:!1},{name:"deep 1e-5 / LA + AT",center:[-.81,-.054],zoom:1e-5,iter:2e3,deep:!0,useLA:!0,useAT:!0},{name:"deep 1e-10 / no LA / no AT",center:[-.81,-.054],zoom:1e-10,iter:5e3,deep:!0,useLA:!1,useAT:!1},{name:"deep 1e-10 / LA",center:[-.81,-.054],zoom:1e-10,iter:5e3,deep:!0,useLA:!0,useAT:!1},{name:"deep 1e-10 / LA + AT",center:[-.81,-.054],zoom:1e-10,iter:5e3,deep:!0,useLA:!0,useAT:!0},{name:"deep 1e-10 / 20k iter / LA+AT",center:[-.81,-.054],zoom:1e-10,iter:2e4,deep:!0,useLA:!0,useAT:!0}],ro=async(r,e,i,t=3e3)=>{if(!i){await ce(20);return}const o=performance.now();for(;performance.now()-o<t;){if(r.getJuliaMs()>0){await ce(15);return}await ce(5)}},oo=async(r,e,i)=>{const t=r.getState();t.setJulia({center:{x:i.center[0],y:i.center[1]},zoom:i.zoom}),t.setDeepZoom({enabled:i.deep,useLA:i.useLA,useAT:i.useAT,deepMaxIter:i.iter}),await ro(e,i.iter,i.deep)},ao=async(r,e,i=st,t)=>{const o=[],a=r,s=e.getState();s.accumulation,a.setForceFluidPaused(!0),a.setParams({tsaaSampleCap:1,tsaaPerFrameSamples:1}),s.setAccumulation&&s.setAccumulation(!1);try{for(let n=0;n<i.length;n++){const l=i[n];t==null||t(n,i.length,l),await oo(e,r,l);const c=[];for(let d=0;d<30;d++){await ce(1);const x=r.getJuliaMs();x>0&&c.push(x)}const p=io(c),h=c.length>0?Math.min(...c):0;o.push({...l,juliaMs:p,juliaMsMin:h,samples:c,timerOk:c.length>0,orbitLength:0,laStageCount:0,laCount:0,atEngaged:!1})}}finally{a.setForceFluidPaused(!1),a.setParams({tsaaSampleCap:64,tsaaPerFrameSamples:1}),s.setAccumulation&&s.setAccumulation(!0)}return o},so=r=>{const e="| Case | Iter | Deep | LA | AT | Julia ms | min ms |",i="|------|------|------|----|----|---------|--------|",t=r.map(o=>{const a=o.timerOk?o.juliaMs.toFixed(2):"—",s=o.timerOk?o.juliaMsMin.toFixed(2):"—";return`| ${o.name} | ${o.iter} | ${o.deep?"✓":""} | ${o.useLA?"✓":""} | ${o.useAT?"✓":""} | ${a} | ${s} |`});return[e,i,...t].join(`
`)},no=r=>{const e=[],i=o=>`${o.zoom}|${o.iter}|${o.deep}`,t=new Map;for(const o of r){const a=i(o);t.has(a)||t.set(a,[]),t.get(a).push(o)}for(const[o,a]of t){const s=a.find(c=>!c.useLA&&!c.useAT),n=a.find(c=>c.useLA&&!c.useAT),l=a.find(c=>c.useLA&&c.useAT);if(!(!s||s.juliaMs===0)){if(n&&n.juliaMs>0){const c=s.juliaMs/n.juliaMs;e.push(`${o}: LA speedup = ${c.toFixed(2)}×`)}if(l&&l.juliaMs>0){const c=s.juliaMs/l.juliaMs;e.push(`${o}: LA+AT speedup = ${c.toFixed(2)}×`)}}}return e},H={padding:"2px 6px",borderBottom:"1px solid rgba(255,255,255,0.08)",whiteSpace:"nowrap"},K={...H,fontWeight:600,color:"#cbd5e1",borderBottom:"1px solid rgba(255,255,255,0.2)"},lo=({engineRef:r})=>{const[e,i]=C.useState(!1),[t,o]=C.useState({i:0,total:0,name:""}),[a,s]=C.useState(null),n=async()=>{const l=r.current;if(!(!l||e)){i(!0),s(null);try{const c=await ao(l,w,st,(d,x,M)=>{o({i:d,total:x,name:M.name})});s(c);const p=so(c),h=no(c);console.log(`[deepZoom bench]
`+p),h.length>0&&console.log(`[deepZoom bench]
`+h.join(`
`))}finally{i(!1)}}};return u.jsxs("div",{style:{fontSize:"10.5px",lineHeight:"1.5",fontFamily:'ui-monospace, "SF Mono", Menlo, monospace',color:"#9ca3af",padding:"6px 8px",background:"rgba(255,255,255,0.03)",borderRadius:"4px",margin:"4px 0",pointerEvents:"auto",maxWidth:480},children:[u.jsx("button",{onClick:()=>{n()},disabled:e||r.current===null,style:{fontFamily:"inherit",fontSize:"inherit",padding:"4px 10px",background:e?"#444":"#1f6feb",color:"white",border:"none",borderRadius:3,cursor:e?"wait":"pointer"},children:e?`Running ${t.i+1}/${t.total}: ${t.name}`:"Run perf benchmark"}),a&&u.jsxs("div",{style:{marginTop:8,overflow:"auto",maxHeight:320},children:[u.jsxs("table",{style:{borderCollapse:"collapse",fontSize:"10.5px"},children:[u.jsx("thead",{children:u.jsxs("tr",{children:[u.jsx("th",{style:K,children:"Case"}),u.jsx("th",{style:K,children:"Iter"}),u.jsx("th",{style:K,children:"D"}),u.jsx("th",{style:K,children:"LA"}),u.jsx("th",{style:K,children:"AT"}),u.jsx("th",{style:K,children:"ms (med)"}),u.jsx("th",{style:K,children:"min"})]})}),u.jsx("tbody",{children:a.map((l,c)=>u.jsxs("tr",{children:[u.jsx("td",{style:H,children:l.name}),u.jsx("td",{style:H,children:l.iter}),u.jsx("td",{style:H,children:l.deep?"✓":""}),u.jsx("td",{style:H,children:l.useLA?"✓":""}),u.jsx("td",{style:H,children:l.useAT?"✓":""}),u.jsx("td",{style:{...H,color:"#e5e7eb",textAlign:"right"},children:l.timerOk?l.juliaMs.toFixed(2):"—"}),u.jsx("td",{style:{...H,textAlign:"right"},children:l.timerOk?l.juliaMsMin.toFixed(2):"—"})]},c))})]}),u.jsx("div",{style:{marginTop:4,color:"#94a3b8"},children:a.some(l=>!l.timerOk)?"(— = GPU timer unavailable on this device)":"Open devtools console for markdown + speedup ratios."})]})]})},co=`
vec3 rgbToOklab(vec3 c) {
  float l = 0.4122214708 * c.r + 0.5363325372 * c.g + 0.0514459929 * c.b;
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
  float lc = pow(max(l, 0.0), 1.0/3.0);
  float mc = pow(max(m, 0.0), 1.0/3.0);
  float sc = pow(max(s, 0.0), 1.0/3.0);
  return vec3(
    0.2104542553*lc + 0.7936177850*mc - 0.0040720468*sc,
    1.9779984951*lc - 2.4285922050*mc + 0.4505937099*sc,
    0.0259040371*lc + 0.7827717662*mc - 0.8086757660*sc
  );
}
vec3 oklabToRgb(vec3 c) {
  float lc = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float mc = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float sc = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  float l = lc * lc * lc;
  float m = mc * mc * mc;
  float s = sc * sc * sc;
  return vec3(
    +4.0767416621*l - 3.3077115913*m + 0.2309699292*s,
    -1.2684380046*l + 2.6097574011*m - 0.3413193965*s,
    -0.0041960863*l - 0.7034186147*m + 1.7076147010*s
  );
}
`,nt=`
// Convert the fractal's per-pixel data into a 0..1-ish scalar along which to sample the gradient.
// j   = main  tex: rg = final z, b = smooth iter, a = escaped
// aux = aux   tex: r = minT (orbit trap),  g = stripe avg,  b = log|dz|,  a = trapIter (norm)
float colorMappingT(vec4 j, vec4 aux) {
  if (uColorMapping == 0)  return j.b * 0.05;                                    // Iterations (smooth)
  if (uColorMapping == 1)  return atan(j.g, j.r) * 0.15915494 + 0.5;             // Angle (arg z)
  if (uColorMapping == 2)  return clamp(length(j.rg) * 0.08, 0.0, 1.0);          // Magnitude
  if (uColorMapping == 3)  return step(0.0, j.g) * 0.5 + 0.25;                   // Decomposition
  if (uColorMapping == 4)  return floor(j.b) * 0.0625;                           // Hard Bands
  // Orbit traps share aux.r but the distance FORMULA differs per shape; the Julia
  // shader already knows which one to compute via uTrapMode, so the four trap
  // mapping IDs below just select how to stretch that distance to a [0,1] colour t.
  if (uColorMapping == 5)  return 1.0 - clamp(aux.r * 0.6, 0.0, 1.0);            // Orbit Trap (point)
  if (uColorMapping == 6)  return 1.0 - clamp(aux.r * 0.8, 0.0, 1.0);            // Orbit Trap (circle)
  if (uColorMapping == 7)  return 1.0 - clamp(aux.r * 1.2, 0.0, 1.0);            // Orbit Trap (cross)
  if (uColorMapping == 8)  return 1.0 - clamp(aux.r * 0.8, 0.0, 1.0);            // Orbit Trap (line)
  if (uColorMapping == 9)  return clamp(aux.g, 0.0, 1.0);                        // Stripe Average
  if (uColorMapping == 10) {                                                    // Distance Estimate
    // d ≈ 0.5 * |z| * log|z| / |dz|  →  aux.b stores log(1+|dz|).
    float absZ = max(length(j.rg), 1e-6);
    float absDz = max(exp(aux.b) - 1.0, 1e-6);
    float d = 0.5 * absZ * log(absZ) / absDz;
    return 1.0 - exp(-d * 4.0);
  }
  if (uColorMapping == 11) return clamp(aux.b * 0.25, 0.0, 1.0);                // Derivative (log|dz|)
  if (uColorMapping == 12) {                                                    // Continuous Potential
    float r2 = max(dot(j.rg, j.rg), 1.0001);
    return fract(log2(log2(r2)) * 0.5);
  }
  if (uColorMapping == 13) return aux.a;                                        // Trap Iteration
  return j.b * 0.05;
}

vec4 gradientForJuliaRgba(vec4 j, vec4 aux) {
  float t0 = colorMappingT(j, aux);
  float t = fract(t0 * uGradientRepeat + uGradientPhase);
  return texture(uGradient, vec2(t, 0.5));
}

vec3 gradientForJulia(vec4 j, vec4 aux) { return gradientForJuliaRgba(j, aux).rgb; }
`,k=`#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
out vec2 vUv;
out vec2 vL; // left
out vec2 vR;
out vec2 vT;
out vec2 vB;
uniform vec2 uTexel;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vL = vUv - vec2(uTexel.x, 0.0);
  vR = vUv + vec2(uTexel.x, 0.0);
  vT = vUv + vec2(0.0, uTexel.y);
  vB = vUv - vec2(0.0, uTexel.y);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`,uo=`
// Uniforms are auto-generated by Schema

// R2 Quasi-Random Sequence (Martin Roberts, 2018)
// Uses the plastic constant for optimal 2D coverage — no directional bias.
// PHI_2D ≈ 1.32472 is the unique real root of x³ = x + 1.
const float R2_A1 = 0.7548776662466927;  // 1/PHI_2D
const float R2_A2 = 0.5698402909980532;  // 1/PHI_2D²

vec4 getBlueNoise4(vec2 screenCoord) {
    vec2 res = max(uBlueNoiseResolution, vec2(64.0));

    // 1. R2 Temporal Offset — shifts texture uniformly in 2D each frame
    float time = float(uFrameCount);
    vec2 temporalOffset = vec2(
        fract(time * R2_A1),
        fract(time * R2_A2)
    );

    // 2. Spatial Lookup with Temporal Offset
    vec2 uv = mod(screenCoord + temporalOffset * res, res) / res;

    // 3. Fetch RGBA Blue Noise (each channel independently distributed)
    vec4 blue = textureLod(uBlueNoiseTexture, uv, 0.0);

    // 4. Channel-Wise Temporal Animation for accumulation convergence
    float frameOffset  = time * R2_A1;
    float frameOffsetG = time * R2_A2;
    float frameOffsetB = time * (R2_A1 + R2_A2);
    float frameOffsetA = time * (R2_A1 * R2_A2);

    return vec4(
        fract(blue.r + frameOffset),
        fract(blue.g + frameOffsetG),
        fract(blue.b + frameOffsetB),
        fract(blue.a + frameOffsetA)
    );
}

float getBlueNoise(vec2 screenCoord) {
    return getBlueNoise4(screenCoord).r;
}

// Stable blue noise for DOF - does not animate with frame count
// This prevents screen shake during navigation while still providing good distribution
vec4 getStableBlueNoise4(vec2 screenCoord) {
    vec2 res = max(uBlueNoiseResolution, vec2(64.0));
    vec2 uv = mod(screenCoord, res) / res;
    return textureLod(uBlueNoiseTexture, uv, 0.0);
}
`,po=`
// Sub-pixel jitter for progressive AA. Returns offset in pixel fractions,
// centered in [-0.5, 0.5]. Blue-noise distribution converges evenly over
// ~16 frames — smoother than uniform random, cheaper than Halton.
vec2 tsaaJitter(vec2 screenCoord) {
    vec4 bn = getBlueNoise4(screenCoord);
    return bn.xy - 0.5;
}

// Progressive accumulation. \`n\` is the current sample count starting at
// 1 on the first frame after a reset; on frame N, the new sample is
// weighted 1/N and the history is weighted (N-1)/N. Converges to a true
// average of the N jittered samples.
vec4 tsaaAccumulate(vec4 history, vec4 current, int n) {
    float w = 1.0 / float(max(n, 1));
    return mix(history, current, w);
}
`,fo=`#version 300 es
precision highp float;
in vec2 vUv;
layout(location=0) out vec4 outMain;
layout(location=1) out vec4 outFx;

uniform int   uKind;          // 0 julia, 1 mandelbrot
uniform vec2  uJuliaC;
uniform vec2  uCenter;        // center in fractal coords
uniform float uScale;         // world-units per uv-unit (height)
uniform float uAspect;
uniform int   uMaxIter;
uniform int   uColorIter;     // iterations used for coloring accumulators (≤ uMaxIter)
uniform float uEscapeR2;      // escape radius squared
uniform float uPower;         // integer power of z (2..8)

// Orbit-trap params — trap SHAPE is driven by uTrapMode:
//   0 = point (at uTrapCenter)
//   1 = circle (|z-center| - radius)
//   2 = cross (min of distances to X/Y axes shifted by center)
//   3 = line (signed distance to ax+by=d line)
uniform int   uTrapMode;
uniform vec2  uTrapCenter;
uniform float uTrapRadius;
uniform vec2  uTrapNormal;    // unit normal for line trap
uniform float uTrapOffset;    // d for line trap
uniform float uStripeFreq;    // k in sin(k·arg z)
// Accumulator-need flags driven by colorMapping. When 0, the shader
// skips the per-iter trap/stripe block (atan + sin + trapDistance) or
// the per-iter dz/dc tracker — those stats are stored in outAux
// channels that the active palette doesn't read, so computing them is
// wasted work. Modes that need them: trap/stripe → modes 5-9, 13;
// derivative → modes 10, 11. FluidEngine sets these.
uniform int   uTrackAccum;    // 1 when trap/stripe accumulators feed the palette
uniform int   uTrackDeriv;    // 1 when dz/dc derivative feeds the palette

// ── Per-evaluation palette + mask baking ─────────────────────────────────────
// The Julia pass bakes BOTH the palette gradient lookup AND the collision
// mask LUT lookup INSIDE evalJulia (per-jitter). Mean-pooling colours and
// mask scalars across jittered evaluations is mathematically clean (vs.
// mean-pooling raw iter state, which mixes meaningless "intermediate
// iteration" values at the set boundary). The mask uses its own LUT and
// repeat/phase so users can tile walls independently of the dye palette.
// Interior pixels never count as walls (mask = 0 there).
uniform sampler2D uGradient;
uniform int       uColorMapping;
uniform float     uGradientRepeat;
uniform float     uGradientPhase;
uniform vec3      uInteriorColor;
uniform sampler2D uCollisionGradient;
uniform float     uCollisionRepeat;
uniform float     uCollisionPhase;
// Collision can be turned off entirely; when 0, mask stays at 0 and
// the fluid pipeline reads a clean "no walls" channel without us
// needing per-shader branches in the consumers.
uniform int       uCollisionEnabled;

// TSAA sub-pixel jitter — when > 0, primary sample position is jittered
// by blue-noise to drive temporal anti-aliasing. Value is the jitter
// AMPLITUDE in pixel fractions (1.0 = ±0.5 px). Set to 0 to disable.
uniform float uJitterScale;
uniform vec2  uResolution;
uniform sampler2D uBlueNoiseTexture;
uniform vec2  uBlueNoiseResolution;
uniform int   uFrameCount;
// K-sampling: number of jittered Julia evaluations per frame, raw-
// averaged before pushed to the TSAA accumulator.
uniform int   uPerFrameSamples;

// Total grid cells covered across one full "round" of frames. Always
// a perfect square (4, 9, 16, 25). Default 16 = 4×4 grid. Combined
// with uPerFrameSamples (cells visited per frame) this gives:
//   framesPerRound = uGridSize / uPerFrameSamples
// e.g. K=4, gridSize=16 → 4 frames per round; after frame 4 the TSAA
// accumulator has averaged all 16 cell centres → identical to a
// single-frame K=16 grid. K=16, gridSize=16 → 1 frame per round.
uniform int   uGridSize;

// Current TSAA accumulator frame index (0 on first frame after a
// reset). Drives the cell-cycling and the round-based progressive
// sub-cell refinement in grid mode.
uniform int   uTsaaSampleIndex;

// Jitter mode:
//   0 — blue noise: each sub-sample reads a different texel of the
//       per-frame R2-animated blue-noise texture. Random within a
//       frame, decorrelated across frames; converges in expectation
//       but the accumulator shimmers as the running mean settles.
//   1 — grid (default): each frame places K sub-samples at the
//       centres of K cells in a √gridSize × √gridSize lattice. The
//       cells visited cycle across frames so a full round of
//       (gridSize/K) frames covers every cell exactly once. After
//       round 0 the accumulator equals the centre-grid average.
//       Round 1+ shifts samples to deterministic blue-noise-indexed
//       sub-cell positions — same offset for every pixel at a given
//       round (no shimmer), but consecutive rounds pull spatially
//       decorrelated taps so progressive refinement looks organic.
uniform int   uJitterMode;

// ── Bucket render (tiled high-resolution export) ─────────────────────────────
// Defaults are no-ops for the live viewport. When BucketRunner drives a tiled
// export, FluidEngine sets these so the fragment shader maps its UV into the
// correct slice of the full output image, and skips writes outside the current
// GPU bucket so the TSAA accumulator preserves its previous (or freshly reset)
// value for those pixels. See plans/bucket-render-port-handoff.md.
uniform vec2  uImageTileOrigin;   // UV origin of this image tile in full-output (default 0,0)
uniform vec2  uImageTileSize;     // UV size of this image tile in full-output  (default 1,1)
uniform vec2  uRegionMin;         // GPU bucket UV min in tile-local space      (default 0,0)
uniform vec2  uRegionMax;         // GPU bucket UV max in tile-local space      (default 1,1)

// ── Deep-zoom (perturbation) ─────────────────────────────────────────────────
// Phase 3: per-pixel iteration runs against a CPU-built reference orbit
// stored in uRefOrbit (RGBA32F, 2D). When uDeepZoomEnabled == 0 the
// deep path is skipped entirely (zero cost on the standard branch).
//
// Activation gate (any failed condition keeps the standard path):
//   uDeepZoomEnabled == 1 && uKind == 1 (Mandelbrot) && uPower == 2
//
// Reference orbit texture layout:
//   width  = uRefOrbitTexW (chosen by FluidEngine, typically 2048)
//   height = ceil(uRefOrbitLen / uRefOrbitTexW)
//   channels per texel = [Z.re, Z.im, |Z|², 0]
//   index conversion: ivec2(ref % uRefOrbitTexW, ref / uRefOrbitTexW)
uniform int   uDeepZoomEnabled;
uniform sampler2D uRefOrbit;
uniform int   uRefOrbitTexW;
uniform int   uRefOrbitLen;
// Engine center − orbit reference center. Tracks pan/zoom gestures
// that move uCenter without rebuilding the orbit (the store commits
// only at gesture end). HDR-packed (vec4: mant.re, exp.re, mant.im,
// exp.im) so sub-1e-38 offsets survive the JS→GLSL boundary at deep
// zoom. Within the orbit's validity radius this keeps the deep path
// aligned with the standard path; past it the linearised perturbation
// degrades — phase 5 adds analytic radius tracking.
uniform vec4  uDeepCenterOffset;
// Zoom packed as HDR (vec2: mantissa, exp). uScale (f32) underflows
// past zoom ~1e-38; this carries the exponent through to the shader
// for the deep path. Standard path keeps using uScale.
uniform vec2  uDeepScale;

// ── Linear Approximation (LA) table ──────────────────────────────────────────
// Per LA node: 3 RGBA32F texels, packed by laTextures.ts:
//   texel 0: [Ref.re, Ref.im, ZCoeff.re, ZCoeff.im]
//   texel 1: [CCoeff.re, CCoeff.im, LAThreshold, LAThresholdC]
//   texel 2: [StepLength, NextStageLAIndex, _, _]
// Stages: vec2(laIndex, macroItCount) per stage; phase 6 MVP walks
// stage 0 only — multi-stage descent lands later if perf demands it.
uniform sampler2D uLATable;
uniform int   uLATexW;          // width of LA table texture (texels)
uniform int   uLATotalCount;    // total LA node count
uniform int   uLAEnabled;       // 0 = bypass LA, 1 = walk stage 0
// Up to 64 stages; stage 0 is at index 0 (the leaf). x = laIndex,
// y = macroItCount, z/w reserved.
uniform vec4  uLAStages[64];
uniform int   uLAStageCount;

// ── AT (Approximation Terms) front-load ──────────────────────────────────────
// AT recasts the front of the perturbed iteration as a standard z² + c'
// loop in transformed coordinates. Single uniform-step inner loop with
// no texture reads — by far the cheapest way to advance many iters at
// once when the validity gate (|dc| ≤ uATThresholdC) passes.
//   c'      = dc · uATCCoeff + uATRefC
//   z_at(0) = 0
//   z_at(k) = z_at(k-1)² + c'
//   dz_pert = z_at · uATInvZCoeff   (transform back)
//   iter    = k · uATStepLength
uniform int   uATEnabled;
uniform int   uATStepLength;
uniform float uATThresholdC;
uniform float uATSqrEscapeRadius;
uniform vec2  uATRefC;
uniform vec2  uATCCoeff;
uniform vec2  uATInvZCoeff;

${uo}
${po}
${nt}

// complex multiply
vec2 cmul(vec2 a, vec2 b) { return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }

// z -> z^p for small integer p (unrolled for speed; fallback for non-int powers)
vec2 cpow(vec2 z, float p) {
  int pi = int(p + 0.5);
  if (abs(p - float(pi)) < 0.01) {
    vec2 r = vec2(1.0, 0.0);
    vec2 b = z;
    int e = pi;
    if (e <= 0) return vec2(1.0, 0.0);
    for (int i = 0; i < 8; ++i) {
      if ((e & 1) == 1) r = cmul(r, b);
      e >>= 1;
      if (e == 0) break;
      b = cmul(b, b);
    }
    return r;
  }
  float mag = length(z);
  float ang = atan(z.y, z.x);
  float rm = pow(mag, p);
  float ra = ang * p;
  return rm * vec2(cos(ra), sin(ra));
}

// Distance of point q to the currently-selected trap shape.
float trapDistance(vec2 q) {
  vec2 d = q - uTrapCenter;
  if (uTrapMode == 0) return length(d);                                      // point
  if (uTrapMode == 1) return abs(length(d) - uTrapRadius);                   // circle
  if (uTrapMode == 2) return min(abs(d.x), abs(d.y));                        // cross
  if (uTrapMode == 3) return abs(dot(q, uTrapNormal) - uTrapOffset);         // line
  return length(d);
}

// ── HDR float helpers (mantissa + exponent) ──────────────────────────────────
// vec2(mantissa, exp): real value = m · 2^e, mantissa normalised to [1, 2)
// for non-zero values (m=0, e=0 = exact zero). Used by the deep-zoom path so
// dc / dz_pert can carry magnitude past f32's ~1e-38 underflow floor.
//
// Complex HDR (HDRC) is stored as vec4(re.m, re.e, im.m, im.e). Cheap
// to access via .xy / .zw swizzles.
//
// Add cost: ~4 ops vs 1 op for a plain add (one log2/floor/exp2 in
// hdrReduce). Mul: ~3 ops vs 1. Acceptable: deep mode is opt-in.

vec2 hdrFromFloat(float v) {
  if (v == 0.0) return vec2(0.0, 0.0);
  float e = floor(log2(abs(v)));
  return vec2(v * exp2(-e), e);
}

float hdrToFloat(vec2 h) {
  // Underflows to 0 outside f32 normal range (~2^-126). Caller must
  // be OK with that — typically guarded by checking magnitudes first.
  return h.x * exp2(h.y);
}

// Re-normalise so |m| in [1, 2). Called after every HDR mul/add. The
// h.x == 0 guard short-circuits the log2 to keep zero exact.
vec2 hdrReduce(vec2 h) {
  if (h.x == 0.0) return vec2(0.0, 0.0);
  float adj = floor(log2(abs(h.x)));
  return vec2(h.x * exp2(-adj), h.y + adj);
}

vec2 hdrAdd(vec2 a, vec2 b) {
  if (a.x == 0.0) return b;
  if (b.x == 0.0) return a;
  // Align mantissas to the larger exponent. If the smaller is past
  // ~24 bits below the larger it's lost in f32 anyway — bail early
  // (saves the multiply + the reduce that would yield the same answer).
  if (a.y >= b.y) {
    float shift = b.y - a.y;
    if (shift < -40.0) return a;
    return hdrReduce(vec2(a.x + b.x * exp2(shift), a.y));
  } else {
    float shift = a.y - b.y;
    if (shift < -40.0) return b;
    return hdrReduce(vec2(b.x + a.x * exp2(shift), b.y));
  }
}

vec2 hdrSub(vec2 a, vec2 b) { return hdrAdd(a, vec2(-b.x, b.y)); }

vec2 hdrMul(vec2 a, vec2 b) {
  return hdrReduce(vec2(a.x * b.x, a.y + b.y));
}

// ── Complex HDR ──────────────────────────────────────────────────────────────
vec4 hdrcAdd(vec4 a, vec4 b) {
  return vec4(hdrAdd(a.xy, b.xy), hdrAdd(a.zw, b.zw));
}

vec4 hdrcSub(vec4 a, vec4 b) {
  return vec4(hdrSub(a.xy, b.xy), hdrSub(a.zw, b.zw));
}

// (a+bi)·(c+di) = (ac − bd) + (ad + bc)i
vec4 hdrcMul(vec4 a, vec4 b) {
  vec2 ar = a.xy, ai = a.zw, br = b.xy, bi = b.zw;
  return vec4(
    hdrSub(hdrMul(ar, br), hdrMul(ai, bi)),
    hdrAdd(hdrMul(ar, bi), hdrMul(ai, br))
  );
}

// HDRC times a plain f32 vec2 (e.g. the reference-orbit sample, which
// lives in [-2, 2] and never needs HDR). Cheaper than promoting both.
vec4 hdrcMulVec2(vec4 a, vec2 b) {
  return hdrcMul(a, vec4(hdrFromFloat(b.x), hdrFromFloat(b.y)));
}

vec4 hdrcFromVec2(vec2 v) {
  return vec4(hdrFromFloat(v.x), hdrFromFloat(v.y));
}

vec2 hdrcToVec2(vec4 a) {
  return vec2(hdrToFloat(a.xy), hdrToFloat(a.zw));
}

// Read one texel from the LA table at flat index linearIdx. Width-
// indexed: x = idx % W, y = idx / W. Out-of-range clamps via texelFetch's
// undefined behaviour — caller guards against past-sentinel reads.
vec4 fetchLATexel(int linearIdx) {
  int x = linearIdx - (linearIdx / uLATexW) * uLATexW;
  int y = linearIdx / uLATexW;
  return texelFetch(uLATable, ivec2(x, y), 0);
}

// Decoded LA node. step and nextStage are stored as floats in the
// texture (RGBA32F) but represent integers — round at decode.
struct LANode {
  vec2 Ref;
  vec2 ZCoeff;
  vec2 CCoeff;
  float LAThreshold;
  float LAThresholdC;
  int   StepLength;
  int   NextStageLAIndex;
};

LANode fetchLA(int nodeIdx) {
  int base = nodeIdx * 3;
  vec4 t0 = fetchLATexel(base + 0);
  vec4 t1 = fetchLATexel(base + 1);
  vec4 t2 = fetchLATexel(base + 2);
  LANode la;
  la.Ref = t0.xy;
  la.ZCoeff = t0.zw;
  la.CCoeff = t1.xy;
  la.LAThreshold = t1.z;
  la.LAThresholdC = t1.w;
  la.StepLength = int(t2.x + 0.5);
  la.NextStageLAIndex = int(t2.y + 0.5);
  return la;
}

// Fetch reference orbit Z[idx] as vec2 (re, im). Bounds-clamps to the
// last valid sample so out-of-range reads (e.g. when ref+1 == orbit
// length) return a sane value instead of zero.
vec2 fetchRefZ(int idx) {
  int safe = max(0, min(idx, uRefOrbitLen - 1));
  int x = safe - (safe / uRefOrbitTexW) * uRefOrbitTexW;
  int y = safe / uRefOrbitTexW;
  return texelFetch(uRefOrbit, ivec2(x, y), 0).xy;
}

// One Julia evaluation at the given (jittered) UV. Out-params return
// the (outMain, outAux) data. Extracted so K-sampling can call it K
// times with different jitter offsets without inlining the iteration
// loop K times in source.
void evalJulia(vec2 uvJ, out vec4 outM, out vec4 outA) {
  vec2 uv = uvJ * 2.0 - 1.0;
  uv.x *= uAspect;
  vec2 p = uCenter + uv * uScale;

  // Deep-zoom path activates whenever the worker has uploaded a valid
  // reference orbit. Both Mandelbrot and Julia kinds work (the
  // perturbation init swaps below), and any integer power 2..8 works
  // (the PO step branches on uPower). LA / AT acceleration are still
  // gated to power 2 in the worker (their Step rules are d=2-specific)
  // — that gating happens at the buildLA / screenSqrRadius level, not
  // here.
  bool deep = (uDeepZoomEnabled != 0) && (uRefOrbitLen > 1);

  vec2 z, c;
  // Deep-path perturbation state, plain f32. The HDR ops are kept in
  // the shader for future extreme-depth use but the hot path is f32.
  // For Mandelbrot kind: dz_pert starts at 0, dc carries the pixel's
  // c-offset from the reference c. For Julia kind: dz_pert starts at
  // the pixel's z-offset from the reference z₀, dc is zero (pixel and
  // reference share the same c). The perturbation math is identical
  // across kinds — only the initial values swap.
  vec2 dz_pert = vec2(0.0);
  vec2 dc      = vec2(0.0);
  if (uDeepZoomEnabled != 0) {
    float scale_f32 = uDeepScale.x * exp2(uDeepScale.y);
    vec2 offset_f32 = vec2(
      uDeepCenterOffset.x * exp2(uDeepCenterOffset.y),
      uDeepCenterOffset.z * exp2(uDeepCenterOffset.w)
    );
    vec2 pixelOffset = uv * scale_f32 + offset_f32;
    if (uKind == 0) {
      // Julia: pixel z₀ shifted by pixelOffset; c is fixed.
      dz_pert = pixelOffset;
      dc = vec2(0.0);
    } else {
      // Mandelbrot: pixel c shifted by pixelOffset; z starts at 0.
      dz_pert = vec2(0.0);
      dc = pixelOffset;
    }
  }
  int  ref     = 0;
  if (uKind == 0) { z = p; c = uJuliaC; }
  else            { z = vec2(0.0); c = p; }

  float escaped = 0.0;
  float iters = float(uMaxIter);

  float minT      = 1e9;
  float trapIter  = 0.0;
  float stripeSum = 0.0;
  int   stripeCount = 0;
  vec2  dz = vec2(1.0, 0.0);  // dz/dc, the standard-path derivative tracker

  // iter tracks total iterations performed across the LA pre-pass and
  // the per-iter PO loop below. The for-loop counter n exists only as
  // a hard upper bound for GLSL; we break on iter >= uMaxIter.
  int iter = 0;

  // ── LA pre-pass (deep + LA enabled): walk stage-0 LAs to skip many
  // iters at once. Phase 6 MVP — multi-stage descent lands if perf
  // demands more headroom; for our typical 50k-iter targets, stage 0
  // alone covers ~99% of the orbit in a few hundred LA steps.
  // ── AT pre-pass (deep + AT enabled + per-pixel validity passes) ─────────
  // Plain f32 z² + c' loop. Skips uATStepLength actual iters per AT
  // step. Falls through naturally to LA + PO with iter and dz_pert
  // updated; ref will be set after LA walk like before.
  bool atActive = deep && uATEnabled != 0 && uMaxIter > uATStepLength;
  if (atActive && max(abs(dc.x), abs(dc.y)) <= uATThresholdC) {
    vec2 c_at = cmul(dc, uATCCoeff) + uATRefC;
    vec2 z_at = vec2(0.0);
    vec2 prev_z_at = vec2(0.0);
    int atMax = uMaxIter / uATStepLength;
    int atSteps = 0;
    int prev_atSteps = 0;
    for (int k = 0; k < 4096; ++k) {
      if (k >= atMax) break;
      float zMag2 = dot(z_at, z_at);
      if (zMag2 > uATSqrEscapeRadius) {
        // Roll back one AT step. PO needs up to stepLength iters of
        // room to find the precise escape iter — without this rollback
        // adjacent pixels that barely-escape vs barely-not get final
        // iters quantised to stepLength multiples, producing visible
        // cliff transitions in the smoothI palette.
        z_at = prev_z_at;
        atSteps = prev_atSteps;
        break;
      }
      prev_z_at = z_at;
      prev_atSteps = atSteps;
      z_at = cmul(z_at, z_at) + c_at;
      atSteps++;
    }
    if (atSteps > 0) {
      // Recover the perturbation: dz_pert = z_at · uATInvZCoeff.
      dz_pert = cmul(z_at, uATInvZCoeff);
      iter = atSteps * uATStepLength;
    }
  }

  bool laActive = deep && uLAEnabled != 0 && uLAStageCount > 0 && uLATotalCount > 1;
  if (laActive) {
    // Stage-0 first-LA threshold gate: stage 0 has the most permissive
    // dc threshold (covers the smallest orbit segments). If |dc|
    // exceeds even that, NO stage's LA can help — skip LA entirely.
    LANode finestFirstLA = fetchLA(0);
    if (max(abs(dc.x), abs(dc.y)) <= finestFirstLA.LAThresholdC) {
      // Multi-stage descent: walk from root toward stage 0. f32 ops
      // throughout (HDR was 30× slower per step and unnecessary at
      // current zoom depths).
      int j = 0;
      int currentStage = uLAStageCount - 1;
      bool earlyEscape = false;
      for (int stageStep = 0; stageStep < 64; ++stageStep) {
        if (currentStage < 0) break;
        if (iter >= uMaxIter) break;
        if (earlyEscape) break;

        int laBase = int(uLAStages[currentStage].x + 0.5);
        int macroItCount = int(uLAStages[currentStage].y + 0.5);
        bool failedInStage = false;

        for (int laStep = 0; laStep < 4096; ++laStep) {
          if (iter >= uMaxIter) break;
          if (j >= macroItCount) break;
          LANode la = fetchLA(laBase + j);
          if (la.StepLength == 0) break;
          if (iter + la.StepLength > uMaxIter) break;

          // Prepare: newdz = dz_pert * (2*Ref + dz_pert).
          vec2 inner = 2.0 * la.Ref + dz_pert;
          vec2 newdz = cmul(dz_pert, inner);
          if (max(abs(newdz.x), abs(newdz.y)) >= la.LAThreshold) {
            j = la.NextStageLAIndex;
            failedInStage = true;
            break;
          }

          // Evaluate: dz_pert' = newdz * ZCoeff + dc * CCoeff.
          dz_pert = cmul(newdz, la.ZCoeff) + cmul(dc, la.CCoeff);
          iter += la.StepLength;
          j++;

          LANode nextLA = fetchLA(laBase + j);
          z = nextLA.Ref + dz_pert;
          float zMag2 = dot(z, z);
          if (zMag2 > uEscapeR2) {
            iters = float(iter) + 1.0 - log2(0.5 * log2(zMag2));
            escaped = 1.0;
            earlyEscape = true;
            break;
          }
          // REBASE — when the pixel orbit comes back near zero (|z| < |dz|)
          // OR we walk off the end of this stage, replace dz with the
          // current pixel z and restart the stage cursor.
          //
          // CRITICAL: rebase semantics depend on Z[0] = 0 (Mandelbrot's
          // iteration convention). The rebase math says "from now on,
          // treat current pixel as the new perturbation against an
          // implied Z=0 reference". For Mandelbrot orbit[0]=0 always,
          // so accessing orbit[0] after rebase produces 0 and the
          // formula 2*Z[0]*dz + dz² + dc = dz² + dc matches reality.
          //
          // For Julia, orbit[0] = R₀ (the chosen reference z₀, not
          // zero). Rebasing then accessing orbit[0]=R₀ produces
          // 2*R₀*dz + dz² which does NOT match the true pixel
          // iteration pixel_z^2 minus R0^2. Result: distorted output.
          //
          // Skip rebase for Julia. Worse LA coverage (interior pixels
          // can't loop back through stages) but mathematically correct.
          // When the stage exhausts, just break — PO continues with
          // whatever iter we accumulated.
          if (uKind != 0) {
            // Mandelbrot: rebase per Z[0] = 0 convention.
            float dzMag2 = dot(dz_pert, dz_pert);
            if (zMag2 < dzMag2 || j >= macroItCount) {
              dz_pert = z;
              j = 0;
            }
          } else if (j >= macroItCount) {
            // Julia: stage exhausted. Just bail to PO; we don't have
            // valid rebase semantics here because Z[0] != 0. PO will
            // continue from the current iter / dz_pert.
            break;
          }
        }

        if (!failedInStage) break;
        currentStage--;
      }
    }
    // Hand off to PO. iter has accumulated correctly across any rebases
    // (rebase resets only j, never iter). The ref position is best-guess
    // here — after multiple rebases the "logical" ref-orbit position has
    // drifted from iter % len. PO's own rebase rule will recover
    // immediately on the first PO step if dz_pert and Zref are
    // misaligned.
    ref = uRefOrbitLen > 0 ? (iter - (iter / uRefOrbitLen) * uRefOrbitLen) : 0;
  }

  // ── PO loop (also handles standard f32 path when !deep). Runs from
  // wherever LA left off (iter is preserved) up to uMaxIter. Hard
  // upper bound 65536 satisfies GLSL's preference for static loop
  // bounds; the meaningful guard is iter >= uMaxIter.
  // Seed the cached Zref so each PO iter does just ONE texelFetch.
  // Standard-path branch never reads it; cheap unconditional init.
  vec2 po_Zref = deep ? fetchRefZ(ref) : vec2(0.0);
  for (int n = 0; n < 65536; ++n) {
    if (escaped > 0.5) break;
    if (iter >= uMaxIter) break;

    if (uTrackDeriv != 0) {
      dz = cmul(2.0 * z, dz) + vec2(1.0, 0.0);
    }

    if (deep && uKind == 0 && ref >= uRefOrbitLen - 1) {
      // Julia past orbit overflow: switch to direct iteration of pixel
      // z. The orbit was built BigInt-precise, so for the iters it
      // covers the perturbation path is correct. When ref outruns the
      // orbit length (R₀ outside the Julia set → orbit escapes early),
      // we can't continue perturbation reliably (Z[0] != 0 means rebase
      // doesn't work, and clamped orbit values produce wrong math).
      // Direct iteration on the pixel z with c = uJuliaC is mathematically
      // exact at f32 precision — fine for the moderate depths where
      // orbit overflow can hit. Pixel z was set in the previous
      // perturbation step as orbit + dz_pert, which IS the pixel's true
      // z value at that iter — perfect handoff.
      z = cpow(z, uPower) + uJuliaC;
    } else if (deep) {
      // Cached Zref. We seed it once when entering deep PO (just below
      // this loop's outer scope when iter is first set), and forward
      // ZrefNext → Zref each step so we only do ONE texelFetch per
      // PO iter instead of two. Re-fetched explicitly on rebase.
      vec2 dz_new;
      if (abs(uPower - 2.0) < 0.01) {
        // d=2 hot path: stable algebra dz*(2Z + dz) + dc avoids the
        // catastrophic cancellation that would happen if we computed
        // (Z+dz)^2 - Z^2 directly when dz is much smaller than Z.
        dz_new = cmul(2.0 * po_Zref, dz_pert) + cmul(dz_pert, dz_pert) + dc;
      } else {
        // d >= 3: factored form
        //   (Z+dz)^d - Z^d = dz * sum_{k=0..d-1} C(d, k+1) * Z^(d-1-k) * dz^k
        // Same algebra as power-2 stable form, generalised. Avoids the
        // subtract-two-big-numbers cancellation that the cpow form
        // would suffer at deep zoom. Cost: ~d complex muls for the
        // power table + d more for the sum. Cheap relative to PO loop.
        // Variable-power LA/AT acceleration is still gated off in the
        // worker for d != 2.
        vec2 zPows[8];
        vec2 dzPows[8];
        zPows[0] = vec2(1.0, 0.0);
        dzPows[0] = vec2(1.0, 0.0);
        int d = int(uPower + 0.5);
        for (int k = 1; k < 8; k++) {
          if (k >= d) break;
          zPows[k] = cmul(zPows[k-1], po_Zref);
          dzPows[k] = cmul(dzPows[k-1], dz_pert);
        }
        // Coefficients C(d, k+1) for k=0..d-1, computed inductively.
        // C(d,1) = d. C(d,k+2) = C(d,k+1) * (d-k-1) / (k+2).
        vec2 inner = vec2(0.0);
        float coeff = float(d);
        for (int k = 0; k < 8; k++) {
          if (k >= d) break;
          // term_k = Z^(d-1-k) * dz^k
          vec2 term = cmul(zPows[d-1-k], dzPows[k]);
          inner += coeff * term;
          coeff = coeff * float(d-k-1) / float(k+2);
        }
        dz_new = cmul(dz_pert, inner) + dc;
      }
      dz_pert = dz_new;
      ref++;
      vec2 ZrefNext = fetchRefZ(ref);
      z = ZrefNext + dz_pert;
      float zMag2 = dot(z, z);
      float dzPertMag2 = dot(dz_pert, dz_pert);
      if (uKind != 0) {
        // Mandelbrot: rebase whenever |z| drops below |dz| or the
        // orbit overflows. The rebase math relies on Z[0] = 0, which
        // holds for Mandelbrot's iteration convention.
        if (zMag2 < dzPertMag2 || ref >= uRefOrbitLen - 1) {
          dz_pert = z;
          ref = 0;
          po_Zref = fetchRefZ(0);
        } else {
          po_Zref = ZrefNext;
        }
      } else {
        // Julia: rebase semantics don't apply (orbit Z[0] != 0).
        // When the orbit overflows fetchRefZ clamps to the last
        // value. If the orbit escaped at the end, |orbit[end]| is
        // already past the escape radius, so on the very next iter
        // |z| = |orbit[end] + dz_pert| also exceeds escape and the
        // natural escape check fires correctly. If the orbit didn't
        // escape (interior of the Julia set), iteration stays
        // bounded and runs to uMaxIter as expected. Either way no
        // special handling needed.
        po_Zref = ZrefNext;
      }
    } else {
      z = cpow(z, uPower) + c;
    }

    if (uTrackAccum != 0 && iter < uColorIter) {
      float td = trapDistance(z);
      if (td < minT) { minT = td; trapIter = float(iter); }
      stripeSum += 0.5 + 0.5 * sin(uStripeFreq * atan(z.y, z.x));
      stripeCount++;
    }
    float r2 = dot(z, z);
    if (r2 > uEscapeR2) {
      iters = float(iter) + 1.0 - log2(0.5 * log2(r2));
      escaped = 1.0;
      break;
    }
    iter++;
  }

  float stripeAvg = stripeCount > 0 ? stripeSum / float(stripeCount) : 0.0;
  float logDz     = log(1.0 + length(dz));
  float trapIterN = float(uMaxIter) > 0.0 ? trapIter / float(uMaxIter) : 0.0;

  outM = vec4(z, iters, escaped);
  outA = vec4(minT, stripeAvg, logDz, trapIterN);
}

void main() {
  // Region mask (bucket-render): outside the current GPU bucket we skip the
  // whole fragment so the framebuffer keeps whatever was there before this
  // bucket (typically a freshly reset accumulator). Defaults (0,0)-(1,1) make
  // this a no-op for live viewport rendering.
  if (vUv.x < uRegionMin.x || vUv.x > uRegionMax.x ||
      vUv.y < uRegionMin.y || vUv.y > uRegionMax.y) {
    discard;
  }

  // K-sampling: do K jittered Julia evaluations per frame, average
  // the raw outputs, then push to the TSAA accumulator. Effective
  // samples per blend = K × frames, so a fixed sample-cap is reached
  // K× faster (at K× per-frame cost). When uJitterScale is 0 (TSAA
  // disabled), K collapses to 1 — no extra cost.
  const int K_MAX = 16;
  int K = max(1, min(uPerFrameSamples, K_MAX));
  if (uJitterScale <= 0.0) K = 1;

  vec2 invRes = 1.0 / max(uResolution, vec2(1.0));
  // Blue-noise mode helpers.
  vec2 r2Step = vec2(R2_A1, R2_A2) * uBlueNoiseResolution.x;
  // Grid mode geometry — the lattice size is gridSize = gridDim².
  int gridSize = max(uGridSize, 1);
  int gridDim = int(floor(sqrt(float(gridSize)) + 0.5));
  if (gridDim < 1) gridDim = 1;
  gridSize = gridDim * gridDim;
  // Frames per round (one round = each lattice cell visited once).
  int framesPerRound = max(gridSize / max(K, 1), 1);
  int frameIdx = max(uTsaaSampleIndex, 0);
  int round = frameIdx / framesPerRound;
  int frameInRound = frameIdx - round * framesPerRound;
  // Sub-cell offset progressive refinement. Round 0 = cell centre
  // (matches a single-frame K=gridSize grid). Round 1+ pulls a
  // deterministic blue-noise tap indexed by round number — same
  // offset for every pixel at a given round (no shimmer; the whole
  // image jitters as one), but consecutive rounds walk through the
  // blue-noise texture via R2 so the offset sequence has good 2D
  // coverage without low-discrepancy patterning.
  vec2 subOffset = vec2(0.0);
  if (round > 0) {
    vec2 roundCoord = vec2(R2_A1, R2_A2) * float(round) * uBlueNoiseResolution.x;
    vec4 bn = getStableBlueNoise4(roundCoord);
    subOffset = (bn.xy - 0.5) / float(gridDim);
  }
  int cellOffset = frameInRound * K;

  // Per-evaluation baked outputs accumulate here. Each quantity is a
  // smooth function of sub-pixel position, so the mean across jitter
  // (and later across TSAA frames) converges cleanly.
  //
  //   accColor / accMask                  → outFx (palette + collision)
  //   accDE / accSmoothPot / accStripe /
  //   accInjectGate                        → outMain (motion + injection)
  vec3  accColor      = vec3(0.0);
  float accMask       = 0.0;
  float accDE         = 0.0;
  float accSmoothPot  = 0.0;
  float accStripe     = 0.0;
  float accInjectGate = 0.0;

  for (int s = 0; s < K_MAX; ++s) {
    if (s >= K) break;

    vec2 jitter01;
    if (uJitterMode == 1) {
      // Cycle through gridSize cells across (gridSize/K) frames.
      int cellIdx = cellOffset + s;
      cellIdx = cellIdx - (cellIdx / gridSize) * gridSize;  // % gridSize
      int sx = cellIdx - (cellIdx / gridDim) * gridDim;
      int sy = cellIdx / gridDim;
      jitter01 = (vec2(float(sx), float(sy)) + 0.5) / float(gridDim) + subOffset;
    } else {
      // Blue-noise mode (unchanged): tsaaJitter returns offset in
      // [-0.5, 0.5]; shift to [0, 1] cell coords for unified handling.
      vec2 sampleCoord = gl_FragCoord.xy + r2Step * float(s);
      jitter01 = tsaaJitter(sampleCoord) + 0.5;
    }

    vec2 jitter = (uJitterScale > 0.0)
        ? (jitter01 - 0.5) * uJitterScale
        : vec2(0.0);
    // Image-tile remap: map tile-local UV into full-output UV before sampling
    // the fractal. Defaults make this an identity for live viewport.
    vec2 uvJ = uImageTileOrigin + (vUv + jitter * invRes) * uImageTileSize;

    vec4 sM, sA;
    evalJulia(uvJ, sM, sA);

    // Per-evaluation palette bake. sM.w is 0 (interior) or 1 (escaped).
    // For interior pixels, palette colour is undefined (smoothIter is
    // clamped at uMaxIter, z is the orbit's last position) — feed the
    // interior colour instead so the mean across jitter samples in a
    // boundary pixel becomes a smooth interior↔palette blend.
    bool  escaped = sM.w > 0.5;
    vec4  sPalRgba = gradientForJuliaRgba(sM, sA);
    vec3  sColor   = escaped ? sPalRgba.rgb : uInteriorColor;

    // Per-evaluation mask bake. Same colour-mapping scalar the palette
    // uses, but remapped through the collision LUT's own repeat/phase,
    // and gated on escape (interior pixels never wall). Luminance-
    // collapse the LUT colour so the user can author B&W or coloured
    // collision LUTs interchangeably.
    float sMask = 0.0;
    if (uCollisionEnabled != 0 && escaped) {
      float t0 = colorMappingT(sM, sA);
      float tc = fract(t0 * uCollisionRepeat + uCollisionPhase);
      vec4  cm = texture(uCollisionGradient, vec2(tc, 0.5));
      sMask = clamp(dot(cm.rgb, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
    }

    // Motion sources — all C0/C1 in pixel space so they mean-pool well.
    //   DE        = 0.5·|z|·log|z| / |dz| (Hubbard distance estimate),
    //               smooth-mapped to [0, ~1]. Zero on interior pixels.
    //   smoothPot = smoothIter / maxIter; flat 1.0 inside the set.
    //   stripe    = sA.g (Härkönen stripe average, already a mean
    //               inside evalJulia).
    //
    // The fourth motion-source option, "palette luminance", isn't
    // baked here — the motion shader derives it cheaply from outFx.rgb
    // (one extra texture sample + dot). Saves a channel for the gate.
    float sDE = 0.0;
    if (escaped) {
      float absZ  = max(length(sM.xy), 1e-6);
      float absDz = max(exp(sA.b) - 1.0, 1e-6);
      float d     = 0.5 * absZ * log(absZ) / absDz;
      sDE = 1.0 - exp(-d * 4.0);
    }
    float sSmoothPot = sM.z / max(float(uMaxIter), 1.0);
    float sStripe    = sA.g;

    // Injection-rate gate for dye inject — preserves the per-stop alpha
    // of the main gradient as a "dye flows here" mask, with escape gate
    // so interior pixels never inject.
    float sInjectGate = escaped ? sPalRgba.a : 0.0;

    accColor      += sColor;
    accMask       += sMask;
    accDE         += sDE;
    accSmoothPot  += sSmoothPot;
    accStripe     += sStripe;
    accInjectGate += sInjectGate;
  }

  float invK = 1.0 / float(K);
  outMain = vec4(accDE * invK, accSmoothPot * invK, accStripe * invK, accInjectGate * invK);
  outFx   = vec4(accColor * invK, accMask * invK);
}`,mo=`#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL, vR, vT, vB;
out vec4 fragColor;

// uJulia       = Julia MRT outMain (motion sources packed into rgba)
//                r=DE, g=smoothPot, b=stripe, a=injection-gate (not a source)
// uJuliaPrev   = previous frame's outMain (same packing) — for temporal-delta
//                on sources 0/1/2.
// uJuliaFx     = current outFx (rgb=palette, a=mask) — paletteLuma & mask
//                sources, plus the hue operator.
// uJuliaPrevFx = previous frame's outFx — for temporal-delta on source 3
//                (paletteLuma) or 4 (mask).
uniform sampler2D uJulia;
uniform sampler2D uJuliaPrev;
uniform sampler2D uJuliaFx;
uniform sampler2D uJuliaPrevFx;
uniform sampler2D uMask;       // alias for uJuliaFx; bound separately so the
                               // wall-zeroing below doesn't depend on the
                               // motion's source-channel choice.
uniform vec2  uTexel;
uniform int   uMode;           // operator
uniform int   uSource;         // motion source channel (0..4)
uniform float uGain;
uniform float uDt;
uniform float uInteriorDamp;   // 0..1 : how much to damp inside the set
uniform float uEdgeMargin;     // 0..0.25 : force fade-to-zero margin near sim boundaries
uniform float uForceCap;       // absolute clamp on final force magnitude (per-pixel)
uniform int   uMaxIter;        // for source-normalisation compensation (see below)

// Pull the chosen scalar out of the packed motion-source MRTs. Using a
// switch keeps this branch-free under uniform control-flow — the GPU
// resolves to one texture sample + channel select per fragment.
//   0=DE  1=smoothPot  2=stripe       (channels of uJulia / outMain)
//   3=paletteLuma                     (REC601 luma of uJuliaFx.rgb)
//   4=mask                            (.a of uJuliaFx)
// outMain.a holds the dye injection gate, NOT a motion source — palette
// luminance is derived from outFx.rgb instead.
const vec3 LUMA_W = vec3(0.299, 0.587, 0.114);
float pickSource(vec2 uv) {
  if (uSource == 3) return dot(texture(uJuliaFx, uv).rgb, LUMA_W);
  if (uSource == 4) return texture(uJuliaFx, uv).a;
  vec4 m = texture(uJulia, uv);
  if (uSource == 0) return m.r;
  if (uSource == 1) return m.g;
  return m.b;                    // stripe (uSource == 2)
}
float pickSourcePrev(vec2 uv) {
  if (uSource == 3) return dot(texture(uJuliaPrevFx, uv).rgb, LUMA_W);
  if (uSource == 4) return texture(uJuliaPrevFx, uv).a;
  vec4 m = texture(uJuliaPrev, uv);
  if (uSource == 0) return m.r;
  if (uSource == 1) return m.g;
  return m.b;
}

void main() {
  // smoothPot is the canonical "interior vs exterior" indicator (1 inside, < 1
  // outside). Read it once for damping + escape gating, regardless of which
  // source the user picked for the operator.
  float smoothPot = texture(uJulia, vUv).g;
  float escaped = (smoothPot < 0.999) ? 1.0 : 0.0;

  // Sample the chosen source at centre + 4 cardinal neighbours.
  float sC = pickSource(vUv);
  float sL = pickSource(vL);
  float sR = pickSource(vR);
  float sT = pickSource(vT);
  float sB = pickSource(vB);

  // Central-difference gradient of the source.
  vec2 grad = vec2(sR - sL, sT - sB) * 0.5;

  vec2 force = vec2(0.0);

  if (uMode == 0) {
    // Gradient: normalised ∇S, magnitude clamp on |∇S|.
    float g = length(grad);
    vec2 dir = (g > 1e-6) ? grad / g : vec2(0.0);
    force = dir * clamp(g * 0.6, 0.0, 1.5);
  } else if (uMode == 1) {
    // Curl: perpendicular of ∇S — swirls along level sets, divergence-free.
    vec2 perp = vec2(-grad.y, grad.x);
    float g = length(perp);
    vec2 dir = (g > 1e-6) ? perp / g : vec2(0.0);
    force = dir * clamp(g * 0.8, 0.0, 1.8);
  } else if (uMode == 2) {
    // Direct: push along ∇S direction with magnitude proportional to S
    // (rather than to |∇S|). Useful when the source has clean iso-bands
    // — flow goes "along the bands" weighted by band brightness.
    float g = length(grad);
    vec2 dir = (g > 1e-6) ? grad / g : vec2(0.0);
    force = dir * clamp(sC * 1.5, 0.0, 2.0);
  } else if (uMode == 3) {
    // Temporal delta: gradient of (S_now − S_prev). Captures motion of
    // the field — what was static last frame contributes nothing,
    // changing regions get a directional kick. Replaces the legacy
    // "C-Track" mode and works on any source.
    float dC = sC - pickSourcePrev(vUv);
    float dL = sL - pickSourcePrev(vL);
    float dR = sR - pickSourcePrev(vR);
    float dT = sT - pickSourcePrev(vT);
    float dB = sB - pickSourcePrev(vB);
    vec2 dGrad = vec2(dR - dL, dT - dB) * 0.5;
    float g = length(dGrad);
    vec2 dir = (g > 1e-6) ? dGrad / g : vec2(0.0);
    // Magnitude includes a per-frame normalisation so tiny dt doesn't
    // blow up. Mirrors the original c-track scaling.
    force = dir * clamp(g * 3.0 + abs(dC) * 0.2, 0.0, 3.0);
    force *= clamp(1.0 / max(uDt, 0.016), 0.0, 40.0);
  } else if (uMode == 4) {
    // Hue: read the baked palette colour, derive a hue angle, output a
    // unit vector in that direction scaled by colour magnitude. Ignores
    // uSource — the operator IS the source here.
    vec3 col = texture(uJuliaFx, vUv).rgb;
    float hueAngle = atan(col.g - col.b, col.r - 0.5);
    float val = length(col);
    force = vec2(cos(hueAngle), sin(hueAngle)) * val;
  }

  // Source-normalisation compensation. Every motion source is in roughly
  // [0, 1] (smoothPot = smoothIter / maxIter; DE / stripe / mask / palette
  // luma all in [0, 1]) so legacy forceGain values calibrated against the
  // OLD motion shader (which read raw smoothIter, range [0, maxIter])
  // would now be ~maxIter× too weak. Scaling here restores those gains.
  // Empirically maxIter × 0.1 lands closest to the previous feel — the
  // raw maxIter scaling was ~10× too strong because the old shader's
  // gradient often clamped into the saturation regime, so its effective
  // magnitude was below the full maxIter range.
  force *= 0.1 * float(max(uMaxIter, 1));

  // Optionally damp inside the set (escaped = 0) — the interior is a "still lake".
  float damp = mix(1.0 - uInteriorDamp, 1.0, escaped);
  force *= damp;

  // Edge fade: prevents boundary artefacts from the pressure-Jacobi solve
  // reading clamped-edge neighbours. Tapers force to 0 in a thin margin.
  float dEdge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  float edgeFade = (uEdgeMargin <= 0.0) ? 1.0 : smoothstep(0.0, uEdgeMargin, dEdge);
  force *= edgeFade;

  // Per-pixel magnitude cap.
  float fMag = length(force);
  if (fMag > uForceCap && fMag > 1e-6) {
    force *= uForceCap / fMag;
  }

  // Solid obstacles emit no force into the fluid.
  float solid = texture(uMask, vUv).a;
  force *= (1.0 - solid);

  // Injection colour is now produced by FRAG_INJECT_DYE directly off the
  // baked palette + injection-gate channel, so the force texture's b/a
  // are unused here. Kept zero for predictable downstream reads.
  fragColor = vec4(force * uGain, 0.0, 0.0);
}`,ho=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uForce;
uniform sampler2D uMask;
uniform float uDt;
void main() {
  vec2 v = texture(uVelocity, vUv).rg;
  vec2 f = texture(uForce, vUv).rg;
  float solid = texture(uMask, vUv).a;  // mask lives in .a of the Julia outFx (RGB = palette colour)
  fragColor = vec4((v + f * uDt) * (1.0 - solid), 0.0, 1.0);
}`,go=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uDye;
uniform sampler2D uJulia;       // motion-source MRT — .a is the dye injection gate
uniform sampler2D uJuliaFx;     // pre-baked palette (rgb) + collision mask (a)
uniform sampler2D uMask;        // alias for uJuliaFx — bound separately for clarity
uniform float uDyeGain;
uniform float uDyeFadeHz;
uniform float uDt;
uniform float uEdgeMargin;
uniform int   uDyeBlend;        // 0 add, 1 screen, 2 max, 3 over (alpha)
uniform int   uDyeDecayMode;    // 0 linear, 1 perceptual (OKLab L-decay), 2 vivid (chroma-boost)
uniform float uDyeChromaFadeHz; // per-second chroma decay rate (perceptual / vivid only)
uniform float uDyeSatBoost;     // per-frame chroma multiplier applied after decay
${co}

/** Apply this frame's dissipation to existing dye. Lightness and chroma decay
 *  on independent schedules, then chroma is scaled by uDyeSatBoost. In "vivid"
 *  mode chroma also gets an inverse-lightness boost so colours stay punchy as
 *  they dim. */
vec3 decayDye(vec3 c) {
  float decayL = exp(-uDyeFadeHz * uDt);
  if (uDyeDecayMode == 0) return c * decayL;
  vec3 lab = rgbToOklab(c);
  float decayC = exp(-uDyeChromaFadeHz * uDt);
  lab.x *= decayL;
  lab.yz *= decayC * uDyeSatBoost;
  if (uDyeDecayMode == 2) {
    lab.yz *= clamp(1.0 / max(decayL, 0.01), 1.0, 2.0);
  }
  return max(oklabToRgb(lab), 0.0);
}

void main() {
  vec4  d        = texture(uDye, vUv);
  vec3  palette  = texture(uJuliaFx, vUv).rgb;
  float gate     = texture(uJulia,   vUv).a;      // escape * main-gradient stop alpha, mean-pooled
  float dEdge    = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  float edgeFade = (uEdgeMargin <= 0.0) ? 1.0 : smoothstep(0.0, uEdgeMargin, dEdge);

  // Per-pixel injection rate. Same factors as the legacy path:
  // (escape * stop-alpha) folded into 'gate', uDyeGain, uDt, edgeFade.
  float rate = gate * uDyeGain * uDt * edgeFade;
  vec3 injectAdd = palette * rate;
  vec3 aged      = decayDye(d.rgb);
  vec3 col;

  if (uDyeBlend == 0) {
    // Add: classic accumulation. Simple, bright, can clip to 1.0 at heavy injection.
    col = aged + injectAdd;
  } else if (uDyeBlend == 1) {
    // Screen: 1 − (1−d)(1−i). Overlaps glow; never exceeds 1.0 mathematically.
    vec3 i = clamp(injectAdd, 0.0, 1.0);
    col = 1.0 - (1.0 - aged) * (1.0 - i);
  } else if (uDyeBlend == 2) {
    // Max: hold the brightest. Good for preserving vivid strokes over faded ones.
    col = max(aged, injectAdd);
  } else {
    // Over (alpha-compositing): uses rate as a visible alpha scaling.
    float a = clamp(rate * 8.0, 0.0, 1.0);
    col = aged * (1.0 - a) + palette * a;
  }

  // Solid obstacles: no dye inside — they're walls, not flowing medium.
  float solid = texture(uMask, vUv).a;
  col *= (1.0 - solid);

  fragColor = vec4(col, 1.0);
}`,xo=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uSource;      // field to advect (could be velocity itself)
uniform sampler2D uMask;        // collision mask; 1 = solid wall
uniform vec2 uTexel;
uniform float uDt;
uniform float uDissipation;     // per-second decay
uniform float uEdgeMargin;      // soft no-slip wall — only applies in the outer half of this margin
void main() {
  vec2 v = texture(uVelocity, vUv).rg;
  vec2 prev = vUv - v * uDt * uTexel;   // backtrace in UV-space
  vec4 val = texture(uSource, prev);
  float decay = 1.0 / (1.0 + uDissipation * uDt);
  // Soft no-slip at the canvas border (last ~half of the edge margin).
  float dEdge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  float edgeFade = (uEdgeMargin <= 0.0) ? 1.0 : smoothstep(0.0, uEdgeMargin * 0.5, dEdge);
  // Solid obstacles: fluid goes to zero inside them so nothing advects through.
  float solid = texture(uMask, vUv).a;  // mask lives in .a of the Julia outFx (RGB = palette colour)
  fragColor = val * decay * edgeFade * (1.0 - solid);
}`,vo=`#version 300 es
precision highp float;
in vec2 vL, vR, vT, vB;
out vec4 fragColor;
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).r;
  float R = texture(uVelocity, vR).r;
  float T = texture(uVelocity, vT).g;
  float B = texture(uVelocity, vB).g;
  float div = 0.5 * ((R - L) + (T - B));
  fragColor = vec4(div, 0.0, 0.0, 1.0);
}`,bo=`#version 300 es
precision highp float;
in vec2 vL, vR, vT, vB;
out vec4 fragColor;
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).g;
  float R = texture(uVelocity, vR).g;
  float T = texture(uVelocity, vT).r;
  float B = texture(uVelocity, vB).r;
  float curl = 0.5 * ((R - L) - (T - B));
  fragColor = vec4(curl, 0.0, 0.0, 1.0);
}`,yo=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform vec2  uTexel;
uniform float uStrength;
uniform float uScale;      // stencil width in texels — wider = larger organised vortices
uniform float uDt;
void main() {
  // Compute the curl-magnitude gradient with a variable-width stencil. The vertex-
  // shader's 1-texel neighbours aren't used here because we want uScale control.
  vec2 t = uTexel * max(uScale, 1.0);
  float L = texture(uCurl, vUv - vec2(t.x, 0.0)).r;
  float R = texture(uCurl, vUv + vec2(t.x, 0.0)).r;
  float T = texture(uCurl, vUv + vec2(0.0, t.y)).r;
  float B = texture(uCurl, vUv - vec2(0.0, t.y)).r;
  float C = texture(uCurl, vUv).r;
  vec2 eta = vec2(abs(T) - abs(B), abs(R) - abs(L));
  float mag = length(eta) + 1e-5;
  eta /= mag;
  eta.y = -eta.y;
  vec2 force = eta * C * uStrength;
  vec2 v = texture(uVelocity, vUv).rg;
  fragColor = vec4(v + force * uDt, 0.0, 1.0);
}`,To=`#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL, vR, vT, vB;
out vec4 fragColor;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main() {
  float L = texture(uPressure, vL).r;
  float R = texture(uPressure, vR).r;
  float T = texture(uPressure, vT).r;
  float B = texture(uPressure, vB).r;
  float div = texture(uDivergence, vUv).r;
  float p = (L + R + T + B - div) * 0.25;
  fragColor = vec4(p, 0.0, 0.0, 1.0);
}`,wo=`#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL, vR, vT, vB;
out vec4 fragColor;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform sampler2D uMask;
void main() {
  float L = texture(uPressure, vL).r;
  float R = texture(uPressure, vR).r;
  float T = texture(uPressure, vT).r;
  float B = texture(uPressure, vB).r;
  vec2 v = texture(uVelocity, vUv).rg;
  v -= vec2(R - L, T - B) * 0.5;
  float solid = texture(uMask, vUv).a;  // mask lives in .a of the Julia outFx (RGB = palette colour)
  fragColor = vec4(v * (1.0 - solid), 0.0, 1.0);
}`,Mo=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTarget;
uniform vec2  uPoint;
uniform vec3  uValue;
uniform float uRadius;     // soft-mode gaussian sigma² (smaller = tighter)
uniform float uDiscR;      // hard-mode disc radius in UV (x-aspect-corrected)
uniform float uHardness;   // 0..1 blend between soft / hard profile
uniform float uAspect;
uniform float uOp;         // 0 add, 1 subtract
void main() {
  vec2 d = vUv - uPoint;
  d.x *= uAspect;
  float r2 = dot(d, d);
  float soft = exp(-r2 / uRadius);
  float hard = 1.0 - smoothstep(uDiscR * 0.9, uDiscR, sqrt(r2));
  float w = mix(soft, hard, uHardness);
  vec4 base = texture(uTarget, vUv);
  vec3 delta = uValue * w;
  vec3 next = base.rgb + mix(delta, -delta, uOp);
  // Clamp to ≥0 ONLY for the eraser op. Velocity splats carry signed deltas —
  // clamping them would wipe out negative components under the brush radius,
  // which visually looks like flow reversing wherever the brush touches.
  base.rgb = (uOp > 0.5) ? max(next, 0.0) : next;
  fragColor = base;
}`,So=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

// Pre-baked palette + collision mask — the Julia pass writes outFx with
// gradient-mapped colour (rgb) mean-pooled across jitter samples plus
// the collision-mask iso (a). Display reads it directly so the boundary
// blend and wall edges converge smoothly under TSAA instead of being
// recomputed from raw evaluator state every frame.
uniform sampler2D uJuliaFx;
uniform sampler2D uDye;
uniform sampler2D uVelocity;
uniform sampler2D uGradient;
uniform sampler2D uMask;
uniform sampler2D uBloom;      // pre-computed bloom texture (black if bloom disabled)
uniform vec2  uTexelDisplay;   // 1/width, 1/height of the DISPLAY canvas
uniform vec2  uTexelDye;       // 1/width, 1/height of the dye (sim) grid
uniform int   uShowMode;       // 0 composite, 1 julia-only, 2 dye-only, 3 velocity-only
uniform float uJuliaMix;
uniform float uDyeMix;
uniform float uVelocityViz;
uniform int   uColorMapping;
uniform float uGradientRepeat;
uniform float uGradientPhase;
uniform vec3  uInteriorColor;

// Post-processing knobs
uniform int   uToneMapping;    // 0 none, 1 reinhard, 2 agx, 3 filmic
uniform float uExposure;
uniform float uVibrance;       // 0..1
uniform float uBloomAmount;    // 0..3
uniform float uAberration;     // 0..1 — velocity-keyed RGB shift
uniform float uRefraction;     // 0..0.3 — dye-gradient UV offset for the fractal
uniform float uRefractSmooth;  // stencil width (in dye texels) — smooths the gradient
uniform float uRefractRoughness; // 0..1 — frosted-glass effect: scatters the
                                 // refracted sample across a Vogel-disc kernel.
                                 // 0 = single-tap (crisp). 1 = ~5px blur radius.
uniform float uCaustics;       // 0..25 — laplacian-of-dye highlight
uniform int   uCollisionPreview; // 1 = overlay the mask with diagonal hatching so walls are visible
${nt}

const vec3 LUM_REC601 = vec3(0.299, 0.587, 0.114);   // used for dye luminance + vibrance
const float PI  = 3.14159265359;
const float TAU = 6.28318530718;

vec3 velocityToColor(vec2 v) {
  float ang = atan(v.y, v.x);
  float mag = clamp(length(v) * 0.5, 0.0, 1.0);
  float hue = (ang + PI) / TAU;
  vec3 c = abs(mod(hue * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0;
  return clamp(c, 0.0, 1.0) * mag;
}

// ── Tone-mapping family. ────────────────────────────────────────────────────
// Reinhard: c/(1+c). Smooth but desaturates highlights.
// AgX: Sobotka's log/sigmoid in a rotated basis. Hue-stable, vibrant.
// Filmic: Hable's Uncharted 2 filmic — cinematic s-curve.
vec3 tmReinhard(vec3 c) { return c / (1.0 + c); }

vec3 tmAgX(vec3 c) {
  const mat3 M = mat3(
    0.842, 0.078, 0.088,
    0.042, 0.878, 0.088,
    0.042, 0.078, 0.880
  );
  c = M * c;
  c = clamp((log2(max(c, 1e-10)) + 12.47393) / 16.5, 0.0, 1.0);
  vec3 x2 = c * c;
  vec3 x4 = x2 * x2;
  return 15.5*x4*x2 - 40.14*x4*c + 31.96*x4 - 6.868*x2*c + 0.4298*x2 + 0.1191*c - 0.00232;
}

vec3 tmFilmic(vec3 c) {
  // Hable / Uncharted 2: F(x) = ((x(Ax+CB)+DE)/(x(Ax+B)+DF)) - E/F
  const float A = 0.15, B = 0.50, C = 0.10, D = 0.20, E = 0.02, F = 0.30;
  vec3 num = c * (A*c + C*B) + D*E;
  vec3 den = c * (A*c + B)   + D*F;
  return num/den - E/F;
}

vec3 applyToneMapping(vec3 c) {
  if (uToneMapping == 0) return c;
  if (uToneMapping == 1) return tmReinhard(c);
  if (uToneMapping == 2) return tmAgX(c);
  return tmFilmic(c) / tmFilmic(vec3(11.2));   // Filmic wants a fixed white-point divide
}

// Vibrance: chroma-aware saturation. Pushes low-saturation pixels without
// posterising already-vivid ones.
vec3 applyVibrance(vec3 c, float amount) {
  if (amount <= 0.0) return c;
  float mx = max(max(c.r, c.g), c.b);
  float mn = min(min(c.r, c.g), c.b);
  float sat = mx - mn;
  vec3 gray = vec3(dot(c, LUM_REC601));
  return mix(gray, c, 1.0 + amount * (1.0 - sat));
}

void main() {
  vec2 uv = vUv;

  // ── Liquid-look refraction. The gradient of dye luminance acts as a
  // fake height-field slope; we offset the fractal sample by that
  // gradient. Use a Sobel 3×3 — mathematically a Gaussian (1,2,1)
  // blur composed with a central difference, so it actually SMOOTHS
  // the gradient instead of just spreading two taps further apart.
  // uRefractSmooth controls the stencil width (in dye texels);
  // larger values give a lower-frequency, calmer slope.
  vec2 refractOffset = vec2(0.0);
  float caustic = 0.0;
  if (uRefraction > 0.0 || uCaustics > 0.0) {
    vec2 t = uTexelDye * max(uRefractSmooth, 1.0);
    float lTL = dot(texture(uDye, vUv + vec2(-t.x, -t.y)).rgb, LUM_REC601);
    float lT  = dot(texture(uDye, vUv + vec2( 0.0, -t.y)).rgb, LUM_REC601);
    float lTR = dot(texture(uDye, vUv + vec2( t.x, -t.y)).rgb, LUM_REC601);
    float lL  = dot(texture(uDye, vUv + vec2(-t.x,  0.0)).rgb, LUM_REC601);
    float lC  = dot(texture(uDye, vUv                  ).rgb, LUM_REC601);
    float lR  = dot(texture(uDye, vUv + vec2( t.x,  0.0)).rgb, LUM_REC601);
    float lBL = dot(texture(uDye, vUv + vec2(-t.x,  t.y)).rgb, LUM_REC601);
    float lB  = dot(texture(uDye, vUv + vec2( 0.0,  t.y)).rgb, LUM_REC601);
    float lBR = dot(texture(uDye, vUv + vec2( t.x,  t.y)).rgb, LUM_REC601);
    // Sobel — divide by 8 (sum of positive weights on one side) to
    // normalise. y-axis: vUv.y grows downward in this texture, so
    // "up" in screen space is -t.y; keep the original sign convention
    // that bright dye refracts the fractal toward the light.
    float gx = (lTR + 2.0 * lR + lBR) - (lTL + 2.0 * lL + lBL);
    float gy = (lBL + 2.0 * lB + lBR) - (lTL + 2.0 * lT + lTR);
    refractOffset = vec2(gx, gy) * (uRefraction * 0.125);
    // 9-point Laplacian — better isotropy than the 5-point version
    // (no preferential x/y axis bias). Divide by smoothness so the
    // caustic magnitude stays roughly invariant as the stencil grows.
    float neigh = lTL + lT + lTR + lL + lR + lBL + lB + lBR;
    caustic = max(0.0, neigh - 8.0 * lC) / (8.0 * max(uRefractSmooth, 1.0));
  }

  // ── Refracted fractal sample. uJuliaFx packs the per-evaluation-baked
  // colour-mapping scalar (t0 in .r) and exterior membership (in .a),
  // both mean-pooled across sub-pixel jitter under TSAA. We finish the
  // composite here: apply the user's repeat/phase, sample the gradient
  // LUT, blend with interior colour using exterior as alpha. Doing the
  // LUT lookup at display time means changing repeat/phase/interior
  // doesn't reset the accumulator. With uRefractRoughness > 0 we scatter
  // the sample across an 8-tap Vogel-disc kernel (golden-angle spiral
  // — even disc coverage at small N, no clumping); each tap is mapped
  // INDIVIDUALLY before averaging colours, the same per-tap pattern as
  // the K-sample loop in the Julia shader. Dye and velocity stay sharp.
  // ── Refracted fractal sample. The Julia pass pre-bakes the palette
  // colour into uJuliaFx (gradient-mapped per-evaluation, mean-pooled
  // across sub-pixel jitter), so display just samples it — no per-tap
  // gradient remapping needed. With uRefractRoughness > 0 we scatter
  // the sample across an 8-tap Vogel-disc kernel (golden-angle spiral
  // — even disc coverage at small N, no clumping); averaging the
  // pre-baked colours is a clean blur. Dye and velocity stay sharp —
  // they're "near-surface" and shouldn't pick up glass-roughness blur.
  vec2 refractedBase = uv + refractOffset;
  vec3 juliaColor;
  vec3 wallColor;        // colour shown where the mask says "solid wall"
  float solid;
  {
    vec4 fx = texture(uJuliaFx, refractedBase);
    juliaColor = fx.rgb;
    wallColor  = fx.rgb;
    solid = texture(uMask, refractedBase).a;
    if (uRefractRoughness > 0.0) {
      const float GOLDEN_ANGLE = 2.39996323;
      const int VOGEL_N = 8;
      // 0..1 roughness → 0..5 px disc radius (in dye-grid texels).
      vec2 radius = uTexelDye * (uRefractRoughness * 5.0);
      vec3 cAcc = juliaColor;
      vec3 wAcc = wallColor;
      float sAcc = solid;
      for (int i = 0; i < VOGEL_N; ++i) {
        float r = sqrt((float(i) + 0.5) / float(VOGEL_N));
        float theta = float(i) * GOLDEN_ANGLE;
        vec2 ofs = r * vec2(cos(theta), sin(theta)) * radius;
        vec3 fx_t = texture(uJuliaFx, refractedBase + ofs).rgb;
        cAcc += fx_t;
        wAcc += fx_t;
        sAcc += texture(uMask, refractedBase + ofs).a;
      }
      float invN = 1.0 / float(VOGEL_N + 1);  // +1 for the original centre tap
      juliaColor = cAcc * invN;
      wallColor = wAcc * invN;
      solid = sAcc * invN;
    }
  }

  vec3 dye = texture(uDye, uv).rgb;
  vec2 v = texture(uVelocity, uv).rg;

  // ── Chromatic aberration (electric look).
  // Applied to DYE ONLY — shifting the fractal itself caused distracting
  // double-vision. Magnitude is bounded (clamped) and direction is the
  // normalised local velocity, so fast regions get a clean plasma fringe
  // without the fractal fracturing. Kicks in only where the fluid is moving.
  if (uAberration > 0.0 && uShowMode == 0) {
    float vMag = length(v);
    if (vMag > 1e-4) {
      vec2 vn = v / vMag;
      float amt = clamp(vMag * 0.04, 0.0, 1.0) * uAberration * 0.006;
      vec2 off = vn * amt;
      dye.r = texture(uDye, uv + off).r;
      dye.b = texture(uDye, uv - off).b;
    }
  }

  vec3 col;
  if (uShowMode == 1) col = juliaColor;
  else if (uShowMode == 2) col = dye;
  else if (uShowMode == 3) col = velocityToColor(v);
  else {
    col = juliaColor * uJuliaMix + dye * uDyeMix;
    col += velocityToColor(v) * uVelocityViz * 0.5;
  }

  // Caustics: additive highlight on focused-surface regions.
  col += vec3(caustic) * uCaustics;

  // Solid obstacles: override the composite with the raw (untoned)
  // gradient colour so walls read as crisp objects, not as "dyed
  // fluid near a wall." solid and wallColor were sampled above
  // through the same Vogel-disc kernel as the fractal so the wall
  // edges blur in step with the refracted fractal behind them.
  if (solid > 0.01) {
    col = mix(col, wallColor, solid);
  }

  // Collision preview: diagonal cyan hatching over solid cells. Uses screen
  // pixels (not UV) so stripes stay a constant width at any zoom level.
  if (uCollisionPreview == 1 && solid > 0.01) {
    vec2 screenPx = vUv / uTexelDisplay;
    float hatch = step(4.0, mod(screenPx.x + screenPx.y, 8.0));
    vec3 preview = mix(vec3(0.0, 0.95, 1.0), vec3(0.0, 0.25, 0.35), hatch);
    col = mix(col, preview, solid * 0.55);
  }

  // Bloom: an HDR pre-blurred energy texture we add on top.
  if (uBloomAmount > 0.0) {
    col += texture(uBloom, vUv).rgb * uBloomAmount;
  }

  // Exposure → tone map → vibrance → gamma.
  col *= uExposure;
  col = applyToneMapping(col);
  col = applyVibrance(col, uVibrance);
  col = pow(max(col, 0.0), vec3(1.0/2.2));
  fragColor = vec4(col, 1.0);
}`,Co=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSource;
uniform float uThreshold;
uniform float uSoftKnee;
void main() {
  vec3 c = texture(uSource, vUv).rgb;
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // Soft-knee: smooth ramp between (threshold - softKnee) and threshold.
  float lo = uThreshold - uSoftKnee;
  float t = smoothstep(lo, uThreshold, luma);
  fragColor = vec4(c * t, 1.0);
}`,Ro=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSource;
uniform vec2 uTexel;   // 1/width, 1/height of the SOURCE
void main() {
  vec2 px = uTexel;
  vec3 c =
      texture(uSource, vUv).rgb * 0.5
    + texture(uSource, vUv + vec2(-px.x, -px.y)).rgb * 0.125
    + texture(uSource, vUv + vec2( px.x, -px.y)).rgb * 0.125
    + texture(uSource, vUv + vec2(-px.x,  px.y)).rgb * 0.125
    + texture(uSource, vUv + vec2( px.x,  px.y)).rgb * 0.125;
  fragColor = vec4(c, 1.0);
}`,Ao=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSource;   // coarser mip being upsampled
uniform sampler2D uPrev;     // this-level's existing texture (we add onto it)
uniform vec2 uTexel;         // 1/size of SOURCE (the coarser texture)
uniform float uIntensity;    // per-upsample scale
void main() {
  vec2 px = uTexel;
  // 3x3 tent filter on the coarse mip
  vec3 s =
      texture(uSource, vUv + vec2(-px.x, -px.y)).rgb * 0.0625
    + texture(uSource, vUv + vec2( 0.0,  -px.y)).rgb * 0.125
    + texture(uSource, vUv + vec2( px.x, -px.y)).rgb * 0.0625
    + texture(uSource, vUv + vec2(-px.x,  0.0 )).rgb * 0.125
    + texture(uSource, vUv).rgb                     * 0.25
    + texture(uSource, vUv + vec2( px.x,  0.0 )).rgb * 0.125
    + texture(uSource, vUv + vec2(-px.x,  px.y)).rgb * 0.0625
    + texture(uSource, vUv + vec2( 0.0,   px.y)).rgb * 0.125
    + texture(uSource, vUv + vec2( px.x,  px.y)).rgb * 0.0625;
  vec3 base = texture(uPrev, vUv).rgb;
  fragColor = vec4(base + s * uIntensity, 1.0);
}`,Fo=`#version 300 es
precision highp float;
in vec2 vUv;
layout(location=0) out vec4 outMain;
layout(location=1) out vec4 outFx;

uniform sampler2D uCurrentMain;
uniform sampler2D uCurrentFx;
uniform sampler2D uHistoryMain;
uniform sampler2D uHistoryFx;
uniform int uSampleIndex;

void main() {
    vec4 curMain = texture(uCurrentMain, vUv);
    vec4 curFx   = texture(uCurrentFx,   vUv);
    // Frame-1 safety: when uSampleIndex is 1 the history texture hasn't
    // been written yet (MRT FBOs allocate with undefined contents in
    // WebGL2 — some drivers return NaN for RGBA16F). Skip the history
    // read entirely and just pass the current sample through.
    if (uSampleIndex <= 1) {
        outMain = curMain;
        outFx   = curFx;
        return;
    }
    vec4 histMain = texture(uHistoryMain, vUv);
    vec4 histFx   = texture(uHistoryFx,   vUv);
    float w = 1.0 / float(uSampleIndex);
    outMain = mix(histMain, curMain, w);
    outFx   = mix(histFx,   curFx,   w);
}`,Eo=`#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec4 uValue;
void main() { fragColor = uValue; }`,Do=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSource;
void main() { fragColor = texture(uSource, vUv); }`,Po=`#version 300 es
precision highp float;
in vec2 vUv;
layout(location=0) out vec4 outMain;
layout(location=1) out vec4 outFx;
uniform sampler2D uSourceMain;
uniform sampler2D uSourceFx;
void main() {
  outMain = texture(uSourceMain, vUv);
  outFx   = texture(uSourceFx,   vUv);
}`,ko=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSource;
uniform vec2  uNewCenter;
uniform vec2  uOldCenter;
uniform float uNewZoom;
uniform float uOldZoom;
uniform float uAspect;
void main() {
  // UV → world (new camera)
  vec2 pix = vec2((vUv.x * 2.0 - 1.0) * uAspect, vUv.y * 2.0 - 1.0);
  vec2 worldPos = uNewCenter + pix * uNewZoom;
  // World → UV (old camera)
  vec2 oldPix = (worldPos - uOldCenter) / uOldZoom;
  vec2 oldUv = vec2(oldPix.x / uAspect * 0.5 + 0.5, oldPix.y * 0.5 + 0.5);
  // If outside [0,1], fade to zero instead of clamping to the edge sample — that
  // avoids streaks of stale dye being stamped into the newly-exposed area.
  vec2 inside = step(vec2(0.0), oldUv) * step(oldUv, vec2(1.0));
  float inside01 = inside.x * inside.y;
  fragColor = texture(uSource, oldUv) * inside01;
}`,Lo=(r,e="/blueNoise.png",i)=>{const t=r.createTexture();if(!t)throw new Error("[createBlueNoiseWebGL2] failed to allocate texture");r.bindTexture(r.TEXTURE_2D,t),r.texImage2D(r.TEXTURE_2D,0,r.RGBA,1,1,0,r.RGBA,r.UNSIGNED_BYTE,new Uint8Array([128,128,128,128])),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MIN_FILTER,r.LINEAR),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MAG_FILTER,r.LINEAR),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_S,r.REPEAT),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_T,r.REPEAT);let o=[64,64];const a=new Image;return a.crossOrigin="anonymous",a.onload=()=>{r.isContextLost()||!r.isTexture(t)||(r.bindTexture(r.TEXTURE_2D,t),r.texImage2D(r.TEXTURE_2D,0,r.RGBA,r.RGBA,r.UNSIGNED_BYTE,a),o=[a.naturalWidth,a.naturalHeight])},a.onerror=s=>{console.warn("[createBlueNoiseWebGL2] failed to load",e,s)},a.src=e,{texture:t,getResolution:()=>o}},be=r=>{if(!Number.isFinite(r)||r===0)return[0,0];const e=Math.floor(Math.log2(Math.abs(r)));return[r/Math.pow(2,e),e]},Je=(r,e,i,t)=>{i&&(r.activeTexture(r.TEXTURE0+e),r.bindTexture(r.TEXTURE_2D,i),r.uniform1i(t,e))};class Io{constructor(e){m(this,"refOrbitTex",null);m(this,"refOrbitTexW",2048);m(this,"refOrbitTexH",0);m(this,"refOrbitLen",0);m(this,"refOrbitCenter",[0,0]);m(this,"refOrbitCenterLow",[0,0]);m(this,"laTableTex",null);m(this,"laTableTexW",1024);m(this,"laTableTexH",0);m(this,"laTotalCount",0);m(this,"laStages",new Float32Array(0));m(this,"laStageCount",0);m(this,"laEnabled",!1);m(this,"atPayload",null);m(this,"version",0);this.gl=e}hasOrbit(){return this.refOrbitTex!==null&&this.refOrbitLen>1}setReferenceOrbit(e,i,t,o=[0,0]){this.refOrbitCenter=[t[0],t[1]],this.refOrbitCenterLow=[o[0],o[1]],this.uploadOrbitTexture(e,i),this.refOrbitLen=i,this.version++}clearReferenceOrbit(){this.refOrbitLen=0,this.version++}setLATable(e,i,t){this.uploadLaTexture(e,i),this.laTotalCount=i,this.laStages=t,this.laStageCount=t.length/2,this.version++}setLAEnabled(e){this.laEnabled=e}clearLATable(){this.laTotalCount=0,this.laStages=new Float32Array(0),this.laStageCount=0,this.version++}setAT(e){this.atPayload=e,this.version++}clearAT(){this.atPayload!==null&&(this.atPayload=null,this.version++)}bindUniforms(e,i,t){const o=this.gl,a=i.deepZoomEnabled&&this.hasOrbit();o.uniform1i(e.uniforms.uDeepZoomEnabled,a?1:0),o.uniform1i(e.uniforms.uRefOrbitTexW,this.refOrbitTexW),o.uniform1i(e.uniforms.uRefOrbitLen,this.refOrbitLen);const s=He(i.center[0],i.centerLow[0],this.refOrbitCenter[0],this.refOrbitCenterLow[0]),n=He(i.center[1],i.centerLow[1],this.refOrbitCenter[1],this.refOrbitCenterLow[1]),l=s[0]+s[1],c=n[0]+n[1],p=be(l),h=be(c);o.uniform4f(e.uniforms.uDeepCenterOffset,p[0],p[1],h[0],h[1]);const d=be(i.zoom);o.uniform2f(e.uniforms.uDeepScale,d[0],d[1]),Je(o,6,this.refOrbitTex??t,e.uniforms.uRefOrbit);const x=a&&this.laEnabled&&this.laTableTex!==null&&this.laTotalCount>1;if(o.uniform1i(e.uniforms.uLAEnabled,x?1:0),o.uniform1i(e.uniforms.uLATexW,this.laTableTexW),o.uniform1i(e.uniforms.uLATotalCount,this.laTotalCount),o.uniform1i(e.uniforms.uLAStageCount,this.laStageCount),this.laStageCount>0){const f=Math.min(this.laStageCount,64),v=new Float32Array(f*4);for(let b=0;b<f;b++)v[b*4+0]=this.laStages[b*2+0],v[b*4+1]=this.laStages[b*2+1];o.uniform4fv(e.uniforms["uLAStages[0]"],v)}Je(o,7,this.laTableTex??t,e.uniforms.uLATable);const M=a&&this.atPayload!==null;o.uniform1i(e.uniforms.uATEnabled,M?1:0),this.atPayload?(o.uniform1i(e.uniforms.uATStepLength,this.atPayload.stepLength),o.uniform1f(e.uniforms.uATThresholdC,this.atPayload.thresholdC),o.uniform1f(e.uniforms.uATSqrEscapeRadius,this.atPayload.sqrEscapeRadius),o.uniform2f(e.uniforms.uATRefC,this.atPayload.refC[0],this.atPayload.refC[1]),o.uniform2f(e.uniforms.uATCCoeff,this.atPayload.ccoeff[0],this.atPayload.ccoeff[1]),o.uniform2f(e.uniforms.uATInvZCoeff,this.atPayload.invZCoeff[0],this.atPayload.invZCoeff[1])):(o.uniform1i(e.uniforms.uATStepLength,1),o.uniform1f(e.uniforms.uATThresholdC,0),o.uniform1f(e.uniforms.uATSqrEscapeRadius,4),o.uniform2f(e.uniforms.uATRefC,0,0),o.uniform2f(e.uniforms.uATCCoeff,1,0),o.uniform2f(e.uniforms.uATInvZCoeff,1,0))}dispose(){const e=this.gl;this.refOrbitTex&&(e.deleteTexture(this.refOrbitTex),this.refOrbitTex=null),this.laTableTex&&(e.deleteTexture(this.laTableTex),this.laTableTex=null)}uploadOrbitTexture(e,i){const t=this.gl,o=this.refOrbitTexW,a=Math.max(1,Math.ceil(i/o)),s=o*a*4,n=e.length>=s?e.subarray(0,s):(()=>{const l=new Float32Array(s);return l.set(e),l})();this.refOrbitTex||(this.refOrbitTex=Xe(t),this.refOrbitTexH=0),t.bindTexture(t.TEXTURE_2D,this.refOrbitTex),a!==this.refOrbitTexH?(t.texImage2D(t.TEXTURE_2D,0,t.RGBA32F,o,a,0,t.RGBA,t.FLOAT,n),this.refOrbitTexH=a):t.texSubImage2D(t.TEXTURE_2D,0,0,0,o,a,t.RGBA,t.FLOAT,n)}uploadLaTexture(e,i){const t=this.gl,o=i*3,a=this.laTableTexW,s=Math.max(1,Math.ceil(o/a)),n=a*s*4,l=e.length>=n?e.subarray(0,n):(()=>{const c=new Float32Array(n);return c.set(e),c})();this.laTableTex||(this.laTableTex=Xe(t),this.laTableTexH=0),t.bindTexture(t.TEXTURE_2D,this.laTableTex),s!==this.laTableTexH?(t.texImage2D(t.TEXTURE_2D,0,t.RGBA32F,a,s,0,t.RGBA,t.FLOAT,l),this.laTableTexH=s):t.texSubImage2D(t.TEXTURE_2D,0,0,0,a,s,t.RGBA,t.FLOAT,l)}}const Xe=r=>{const e=r.createTexture();return r.bindTexture(r.TEXTURE_2D,e),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MIN_FILTER,r.NEAREST),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MAG_FILTER,r.NEAREST),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_S,r.CLAMP_TO_EDGE),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_T,r.CLAMP_TO_EDGE),e},Q=3;class jo{constructor(e){m(this,"ext");m(this,"queries",new Array(Q).fill(null));m(this,"inFlight",new Array(Q).fill(!1));m(this,"cursor",0);m(this,"msEwma",0);m(this,"open",!1);if(this.gl=e,this.ext=e.getExtension("EXT_disjoint_timer_query_webgl2"),this.ext)for(let i=0;i<Q;i++)this.queries[i]=e.createQuery()}available(){return this.ext!==null}getMs(){return this.msEwma}begin(){if(!this.ext||this.open)return;const e=this.queries[this.cursor];!e||this.inFlight[this.cursor]||(this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT,e),this.open=!0,this.inFlight[this.cursor]=!0)}end(){!this.ext||!this.open||(this.gl.endQuery(this.ext.TIME_ELAPSED_EXT),this.cursor=(this.cursor+1)%Q,this.open=!1)}poll(){if(!this.ext)return;const e=this.gl;if(e.getParameter(this.ext.GPU_DISJOINT_EXT)){for(let i=0;i<Q;i++)this.inFlight[i]=!1;return}for(let i=0;i<Q;i++){if(!this.inFlight[i])continue;const t=this.queries[i];if(!t||!e.getQueryParameter(t,e.QUERY_RESULT_AVAILABLE))continue;const s=e.getQueryParameter(t,e.QUERY_RESULT)/1e6;this.msEwma=this.msEwma===0?s:this.msEwma*.8+s*.2,this.inFlight[i]=!1}}dispose(){const e=this.gl;for(const i of this.queries)i&&e.deleteQuery(i)}}class zo{constructor(e){m(this,"mainTex",null);m(this,"collisionTex",null);m(this,"version",0);this.gl=e}getTexture(e){return e==="main"?this.mainTex:this.collisionTex}setBuffer(e,i){const t=this.gl,o=ve*4;i.length!==o&&console.warn(`[GradientLut] ${e} buffer length ${i.length} (want ${o})`);let a=this.getTexture(e);a||(a=t.createTexture(),e==="main"?this.mainTex=a:this.collisionTex=a),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,a),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.REPEAT),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,ve,1,0,t.RGBA,t.UNSIGNED_BYTE,i),this.version++}ensure(e){if(this.getTexture(e))return;const i=ve,t=new Uint8Array(i*4);if(e==="main")for(let o=0;o<i;++o)t[o*4+0]=o,t[o*4+1]=o,t[o*4+2]=o,t[o*4+3]=255;else for(let o=0;o<i;++o)t[o*4+3]=255;this.setBuffer(e,t)}dispose(){const e=this.gl;this.mainTex&&(e.deleteTexture(this.mainTex),this.mainTex=null),this.collisionTex&&(e.deleteTexture(this.collisionTex),this.collisionTex=null)}}class _o{constructor(e){m(this,"a",null);m(this,"b",null);m(this,"c",null);m(this,"dirty",!0);m(this,"extract");m(this,"down");m(this,"up");this.deps=e,this.extract=e.linkProgram(k,Co,["uTexel","uSource","uThreshold","uSoftKnee"]),this.down=e.linkProgram(k,Ro,["uTexel","uSource"]),this.up=e.linkProgram(k,Ao,["uTexel","uSource","uPrev","uIntensity"])}markResize(){this.dirty=!0}process(e,i,t,o){this.ensure(e,i);const a=this.a,s=this.b,n=this.c,{gl:l,drawQuad:c,bindFBO:p,useProgram:h,bindTex:d}=this.deps;return p(a),o(a),p(s),h(this.extract),l.uniform2f(this.extract.uniforms.uTexel,s.texel[0],s.texel[1]),d(0,a.tex,this.extract.uniforms.uSource),l.uniform1f(this.extract.uniforms.uThreshold,t),l.uniform1f(this.extract.uniforms.uSoftKnee,Lr),c(),p(n),h(this.down),l.uniform2f(this.down.uniforms.uTexel,s.texel[0],s.texel[1]),d(0,s.tex,this.down.uniforms.uSource),c(),p(a),h(this.down),l.uniform2f(this.down.uniforms.uTexel,s.texel[0],s.texel[1]),d(0,s.tex,this.down.uniforms.uSource),c(),p(s),h(this.up),l.uniform2f(this.up.uniforms.uTexel,n.texel[0],n.texel[1]),d(0,n.tex,this.up.uniforms.uSource),d(1,a.tex,this.up.uniforms.uPrev),l.uniform1f(this.up.uniforms.uIntensity,1),c(),s.tex}dispose(){const{gl:e,deleteFBO:i}=this.deps;i(this.a),i(this.b),i(this.c),e.deleteProgram(this.extract.prog),e.deleteProgram(this.down.prog),e.deleteProgram(this.up.prog)}ensure(e,i){if(!this.dirty&&this.a&&this.b&&this.c)return;const{deleteFBO:t,createFBO:o}=this.deps;t(this.a),t(this.b),t(this.c);const a=Math.max(4,e>>1&-2),s=Math.max(4,i>>1&-2),n=Math.max(2,e>>2&-2),l=Math.max(2,i>>2&-2),c=Math.max(2,e>>3&-2),p=Math.max(2,i>>3&-2);this.a=o(a,s),this.b=o(n,l),this.c=o(c,p),this.dirty=!1}}function Bo(r){switch(r){case"linear":return 0;case"perceptual":return 1;case"vivid":return 2}}function Oo(r){switch(r){case"none":return 0;case"reinhard":return 1;case"agx":return 2;case"filmic":return 3}}function Uo(r){switch(r){case"add":return 0;case"screen":return 1;case"max":return 2;case"over":return 3}}function Ze(r){switch(r){case"iterations":return 0;case"angle":return 1;case"magnitude":return 2;case"decomposition":return 3;case"bands":return 4;case"orbit-point":return 5;case"orbit-circle":return 6;case"orbit-cross":return 7;case"orbit-line":return 8;case"stripe":return 9;case"distance":return 10;case"derivative":return 11;case"potential":return 12;case"trap-iter":return 13}}function Go(r){switch(r){case"orbit-point":case"orbit-circle":case"orbit-cross":case"orbit-line":case"stripe":case"trap-iter":return!0;default:return!1}}function No(r){return r==="distance"||r==="derivative"}function Vo(r){switch(r){case"orbit-point":return 0;case"orbit-circle":return 1;case"orbit-cross":return 2;case"orbit-line":return 3;case"trap-iter":return 0;default:return 0}}const Ho={juliaC:[-.36303304426511473,.16845183018751916],center:[-.8139175130270945,-.054649908357858296],centerLow:[0,0],zoom:1.2904749020480561,maxIter:310,escapeR:32,power:2,kind:"mandelbrot",forceMode:"gradient",forceSource:"smoothPot",forceGain:-1200,interiorDamp:.59,dt:.016,timeScale:1,dissipation:.17,dyeDissipation:1.03,dyeInject:8,vorticity:22.1,pressureIters:50,show:"composite",juliaMix:.4,dyeMix:2,velocityViz:.02,gradientRepeat:1,gradientPhase:0,colorMapping:"iterations",colorIter:310,trapCenter:[0,0],trapRadius:1,trapNormal:[1,0],trapOffset:0,stripeFreq:4,dyeBlend:"max",dyeDecayMode:"linear",dyeChromaDecayHz:1.03,dyeSaturationBoost:1,vorticityScale:1,toneMapping:"none",exposure:1,vibrance:1.645,bloomAmount:0,bloomThreshold:1,aberration:.27,refraction:.037,refractSmooth:3,refractRoughness:0,caustics:1,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,collisionEnabled:!1,collisionPreview:!1,collisionRepeat:1,collisionPhase:0,paused:!1,tsaaJitterAmount:1,tsaaSampleCap:64,tsaaPerFrameSamples:1,tsaaGridSize:16,tsaaJitterMode:"grid",deepZoomEnabled:!1};class Jo{constructor(e,i={}){m(this,"gl");m(this,"canvas");m(this,"quadVbo");m(this,"progJulia");m(this,"progMotion");m(this,"progAddForce");m(this,"progInjectDye");m(this,"progAdvect");m(this,"progDivergence");m(this,"progCurl");m(this,"progVorticity");m(this,"progPressure");m(this,"progGradSub");m(this,"progSplat");m(this,"progDisplay");m(this,"progClear");m(this,"progCopy");m(this,"progCopyMrt");m(this,"progReproject");m(this,"progTsaaBlend");m(this,"juliaTsaa");m(this,"juliaTsaaPrev");m(this,"tsaaSampleIndex",0);m(this,"tsaaParamHash","");m(this,"blueNoise",null);m(this,"deepZoom");m(this,"forceFluidPaused",!1);m(this,"forceJuliaOnly",!1);m(this,"bucketTileOrigin",[0,0]);m(this,"bucketTileSize",[1,1]);m(this,"bucketRegionMin",[0,0]);m(this,"bucketRegionMax",[1,1]);m(this,"bucketOutputSize",[0,0]);m(this,"frameCount",0);m(this,"juliaTimer");m(this,"bloom");m(this,"lastCenter",[0,0]);m(this,"lastZoom",1.5);m(this,"firstFrame",!0);m(this,"simW",0);m(this,"simH",0);m(this,"juliaCur");m(this,"juliaPrev");m(this,"forceTex");m(this,"velocity");m(this,"dye");m(this,"divergence");m(this,"pressure");m(this,"curl");m(this,"gradients");m(this,"params",{...Ho});m(this,"lastTimeMs",0);m(this,"framebufferFormat");m(this,"maskReadFBO",null);m(this,"maskCpuBuf",new Uint8Array(0));m(this,"MASK_CPU_W",128);m(this,"MASK_CPU_H",128);m(this,"onFrameEnd");this.canvas=e,this.onFrameEnd=i.onFrameEnd;const t=e.getContext("webgl2",{antialias:!1,alpha:!1,preserveDrawingBuffer:!0});if(!t)throw new Error("WebGL2 required — your browser does not support it.");this.gl=t,this.deepZoom=new Io(t),this.juliaTimer=new jo(t),this.gradients=new zo(t),this.bloom=new _o({gl:t,linkProgram:(s,n,l)=>this.linkProgram(s,n,l),drawQuad:()=>this.drawQuad(),bindFBO:s=>this.bindFBO(s),useProgram:s=>this.useProgram(s),bindTex:(s,n,l)=>this.bindTex(s,n,l),createFBO:(s,n)=>this.createFBO(s,n),deleteFBO:s=>this.deleteFBO(s)});const o=t.getExtension("EXT_color_buffer_float"),a=t.getExtension("EXT_color_buffer_half_float");if(!o&&!a)throw new Error("Neither EXT_color_buffer_float nor EXT_color_buffer_half_float is available.");this.framebufferFormat=this.detectFormat(),this.quadVbo=t.createBuffer(),t.bindBuffer(t.ARRAY_BUFFER,this.quadVbo),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),t.STATIC_DRAW),this.compileAll(),this.allocateAt(64,64),this.blueNoise=Lo(t)}detectFormat(){const e=this.gl,i=[{internal:e.RGBA16F,format:e.RGBA,type:e.HALF_FLOAT,name:"RGBA16F half_float"},{internal:e.RGBA32F,format:e.RGBA,type:e.FLOAT,name:"RGBA32F float"},{internal:e.RGBA8,format:e.RGBA,type:e.UNSIGNED_BYTE,name:"RGBA8 fallback"}];for(const t of i){const o=e.createTexture();e.bindTexture(e.TEXTURE_2D,o),e.texImage2D(e.TEXTURE_2D,0,t.internal,4,4,0,t.format,t.type,null);const a=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,a),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,o,0);const s=e.checkFramebufferStatus(e.FRAMEBUFFER);if(e.bindFramebuffer(e.FRAMEBUFFER,null),e.deleteFramebuffer(a),e.deleteTexture(o),s===e.FRAMEBUFFER_COMPLETE)return console.info(`[FluidEngine] Using ${t.name} render targets.`),t}throw new Error("No renderable texture format supported (not even RGBA8).")}compileShader(e,i){const t=this.gl,o=t.createShader(e);if(t.shaderSource(o,i),t.compileShader(o),!t.getShaderParameter(o,t.COMPILE_STATUS)){const a=t.getShaderInfoLog(o)||"",s=i.split(`
`).map((n,l)=>`${String(l+1).padStart(4)}: ${n}`).join(`
`);throw console.error(`Shader compile error:
${a}
${s}`),new Error(`Shader compile error: ${a}`)}return o}linkProgram(e,i,t){const o=this.gl,a=this.compileShader(o.VERTEX_SHADER,e),s=this.compileShader(o.FRAGMENT_SHADER,i),n=o.createProgram();if(o.attachShader(n,a),o.attachShader(n,s),o.bindAttribLocation(n,0,"aPos"),o.linkProgram(n),!o.getProgramParameter(n,o.LINK_STATUS))throw new Error(`Program link error: ${o.getProgramInfoLog(n)}`);o.deleteShader(a),o.deleteShader(s);const l={};for(const c of t)l[c]=o.getUniformLocation(n,c);return{prog:n,uniforms:l}}compileAll(){this.progJulia=this.linkProgram(k,fo,["uTexel","uKind","uJuliaC","uCenter","uScale","uAspect","uMaxIter","uEscapeR2","uPower","uColorIter","uTrapMode","uTrapCenter","uTrapRadius","uTrapNormal","uTrapOffset","uStripeFreq","uJitterScale","uResolution","uBlueNoiseTexture","uBlueNoiseResolution","uFrameCount","uPerFrameSamples","uJitterMode","uGridSize","uTsaaSampleIndex","uImageTileOrigin","uImageTileSize","uRegionMin","uRegionMax","uDeepZoomEnabled","uRefOrbit","uRefOrbitTexW","uRefOrbitLen","uDeepCenterOffset","uDeepScale","uLATable","uLATexW","uLATotalCount","uLAEnabled","uLAStages[0]","uLAStageCount","uATEnabled","uATStepLength","uATThresholdC","uATSqrEscapeRadius","uATRefC","uATCCoeff","uATInvZCoeff","uTrackAccum","uTrackDeriv","uGradient","uColorMapping","uGradientRepeat","uGradientPhase","uInteriorColor","uCollisionGradient","uCollisionRepeat","uCollisionPhase","uCollisionEnabled"]),this.progTsaaBlend=this.linkProgram(k,Fo,["uCurrentMain","uCurrentFx","uHistoryMain","uHistoryFx","uSampleIndex"]),this.progMotion=this.linkProgram(k,mo,["uTexel","uJulia","uJuliaPrev","uJuliaFx","uJuliaPrevFx","uMask","uMode","uSource","uGain","uDt","uInteriorDamp","uEdgeMargin","uForceCap","uMaxIter"]),this.progAddForce=this.linkProgram(k,ho,["uTexel","uVelocity","uForce","uMask","uDt"]),this.progInjectDye=this.linkProgram(k,go,["uTexel","uDye","uJulia","uJuliaFx","uMask","uDyeGain","uDyeFadeHz","uDt","uEdgeMargin","uDyeBlend","uDyeDecayMode","uDyeChromaFadeHz","uDyeSatBoost"]),this.progAdvect=this.linkProgram(k,xo,["uTexel","uVelocity","uSource","uMask","uDt","uDissipation","uEdgeMargin"]),this.progDivergence=this.linkProgram(k,vo,["uTexel","uVelocity"]),this.progCurl=this.linkProgram(k,bo,["uTexel","uVelocity"]),this.progVorticity=this.linkProgram(k,yo,["uTexel","uVelocity","uCurl","uStrength","uScale","uDt"]),this.progPressure=this.linkProgram(k,To,["uTexel","uPressure","uDivergence"]),this.progGradSub=this.linkProgram(k,wo,["uTexel","uPressure","uVelocity","uMask"]),this.progSplat=this.linkProgram(k,Mo,["uTexel","uTarget","uPoint","uValue","uRadius","uDiscR","uHardness","uAspect","uOp"]),this.progDisplay=this.linkProgram(k,So,["uTexel","uTexelDisplay","uTexelDye","uJuliaFx","uDye","uVelocity","uGradient","uBloom","uMask","uShowMode","uJuliaMix","uDyeMix","uVelocityViz","uColorMapping","uGradientRepeat","uGradientPhase","uInteriorColor","uToneMapping","uExposure","uVibrance","uBloomAmount","uAberration","uRefraction","uRefractSmooth","uRefractRoughness","uCaustics","uCollisionPreview"]),this.progClear=this.linkProgram(k,Eo,["uValue"]),this.progCopy=this.linkProgram(k,Do,["uSource"]),this.progCopyMrt=this.linkProgram(k,Po,["uSourceMain","uSourceFx"]),this.progReproject=this.linkProgram(k,ko,["uTexel","uSource","uNewCenter","uOldCenter","uNewZoom","uOldZoom","uAspect"])}createFBO(e,i){const t=this.gl,o=t.createTexture();t.bindTexture(t.TEXTURE_2D,o),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,this.framebufferFormat.internal,e,i,0,this.framebufferFormat.format,this.framebufferFormat.type,null);const a=t.createFramebuffer();return t.bindFramebuffer(t.FRAMEBUFFER,a),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,o,0),t.viewport(0,0,e,i),t.clearColor(0,0,0,1),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null),{tex:o,fbo:a,width:e,height:i,texel:[1/e,1/i]}}createMrtFbo(e,i){const t=this.gl,o=()=>{const l=t.createTexture();return t.bindTexture(t.TEXTURE_2D,l),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,this.framebufferFormat.internal,e,i,0,this.framebufferFormat.format,this.framebufferFormat.type,null),l},a=o(),s=o(),n=t.createFramebuffer();return t.bindFramebuffer(t.FRAMEBUFFER,n),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,a,0),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT1,t.TEXTURE_2D,s,0),t.drawBuffers([t.COLOR_ATTACHMENT0,t.COLOR_ATTACHMENT1]),t.viewport(0,0,e,i),t.clearColor(0,0,0,1),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null),{texMain:a,texFx:s,fbo:n,width:e,height:i,texel:[1/e,1/i]}}deleteMrtFbo(e){if(!e)return;const i=this.gl;i.deleteTexture(e.texMain),i.deleteTexture(e.texFx),i.deleteFramebuffer(e.fbo)}createDoubleFBO(e,i){let t=this.createFBO(e,i),o=this.createFBO(e,i);return{width:e,height:i,texel:[1/e,1/i],get read(){return t},get write(){return o},swap(){const s=t;t=o,o=s}}}deleteFBO(e){if(!e)return;const i=this.gl;i.deleteTexture(e.tex),i.deleteFramebuffer(e.fbo)}deleteDoubleFBO(e){e&&(this.deleteFBO(e.read),this.deleteFBO(e.write))}allocateAt(e,i){this.simW=e,this.simH=i,this.juliaCur=this.createMrtFbo(e,i),this.juliaPrev=this.createMrtFbo(e,i),this.juliaTsaa=this.createMrtFbo(e,i),this.juliaTsaaPrev=this.createMrtFbo(e,i),this.tsaaSampleIndex=0,this.forceTex=this.createFBO(e,i),this.velocity=this.createDoubleFBO(e,i),this.dye=this.createDoubleFBO(e,i),this.divergence=this.createFBO(e,i),this.pressure=this.createDoubleFBO(e,i),this.curl=this.createFBO(e,i),this.firstFrame=!0}reallocateAt(e,i){var p,h;if(e===this.simW&&i===this.simH&&this.juliaCur)return;const t=(p=this.dye)==null?void 0:p.read,o=(h=this.velocity)==null?void 0:h.read,a=this.juliaTsaa,s=this.createDoubleFBO(e,i),n=this.createDoubleFBO(e,i),l=this.createMrtFbo(e,i),c=this.createMrtFbo(e,i);t&&this.blitInto(t,s.read),o&&this.blitInto(o,n.read),a&&this.blitMrtInto(a,l),this.deleteDoubleFBO(this.dye),this.deleteDoubleFBO(this.velocity),this.deleteMrtFbo(this.juliaTsaa),this.deleteMrtFbo(this.juliaTsaaPrev),this.deleteMrtFbo(this.juliaCur),this.deleteMrtFbo(this.juliaPrev),this.deleteFBO(this.forceTex),this.deleteFBO(this.divergence),this.deleteDoubleFBO(this.pressure),this.deleteFBO(this.curl),this.simW=e,this.simH=i,this.dye=s,this.velocity=n,this.juliaTsaa=l,this.juliaTsaaPrev=c,this.juliaCur=this.createMrtFbo(e,i),this.juliaPrev=this.createMrtFbo(e,i),this.forceTex=this.createFBO(e,i),this.divergence=this.createFBO(e,i),this.pressure=this.createDoubleFBO(e,i),this.curl=this.createFBO(e,i),this.firstFrame=!0}blitInto(e,i){const t=this.gl;t.bindFramebuffer(t.FRAMEBUFFER,i.fbo),t.viewport(0,0,i.width,i.height),this.useProgram(this.progCopy),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,e.tex),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.uniform1i(this.progCopy.uniforms.uSource,0),this.drawQuad()}blitMrtInto(e,i){const t=this.gl;t.bindFramebuffer(t.FRAMEBUFFER,i.fbo),t.viewport(0,0,i.width,i.height),this.useProgram(this.progCopyMrt),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,e.texMain),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.uniform1i(this.progCopyMrt.uniforms.uSourceMain,0),t.activeTexture(t.TEXTURE1),t.bindTexture(t.TEXTURE_2D,e.texFx),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.uniform1i(this.progCopyMrt.uniforms.uSourceFx,1),this.drawQuad()}bindFBO(e){const i=this.gl;i.bindFramebuffer(i.FRAMEBUFFER,e.fbo),i.viewport(0,0,e.width,e.height)}useProgram(e){const i=this.gl;i.useProgram(e.prog),i.bindBuffer(i.ARRAY_BUFFER,this.quadVbo),i.enableVertexAttribArray(0),i.vertexAttribPointer(0,2,i.FLOAT,!1,0,0)}drawQuad(){this.gl.drawArrays(this.gl.TRIANGLE_STRIP,0,4)}setTexel(e,i,t){const o=this.gl,a=e.uniforms.uTexel;a&&o.uniform2f(a,1/i,1/t)}bindTex(e,i,t){const o=this.gl;o.activeTexture(o.TEXTURE0+e),o.bindTexture(o.TEXTURE_2D,i),t&&o.uniform1i(t,e)}setParams(e){this.params={...this.params,...e}}getAccumulationCount(){return this.tsaaSampleIndex}resetAccumulation(){this.tsaaSampleIndex=0}setGradientBuffer(e){this.gradients.setBuffer("main",e)}setCollisionGradientBuffer(e){this.gradients.setBuffer("collision",e)}setRenderSize(e,i){e=Math.max(32,Math.round(e)),i=Math.max(32,Math.round(i)),!(e===this.simW&&i===this.simH&&this.canvas.width===e&&this.canvas.height===i)&&((this.canvas.width!==e||this.canvas.height!==i)&&(this.canvas.width=e,this.canvas.height=i,this.bloom.markResize()),this.reallocateAt(e,i))}redraw(){this.displayToScreen();const e=this.gl;e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,null)}markFirstFrame(){this.firstFrame=!0}resetFluid(){const e=this.gl;for(const i of[this.velocity,this.dye,this.pressure])for(const t of[i.read,i.write])this.bindFBO(t),this.useProgram(this.progClear),e.uniform4f(this.progClear.uniforms.uValue,0,0,0,1),this.drawQuad();e.bindFramebuffer(e.FRAMEBUFFER,null),this.markFirstFrame()}splat(e,i,t,o,a,s,n){const l=this.gl;this.bindFBO(e.write),this.useProgram(this.progSplat),this.bindTex(0,e.read.tex,this.progSplat.uniforms.uTarget),l.uniform2f(this.progSplat.uniforms.uPoint,i,t),l.uniform3f(this.progSplat.uniforms.uValue,o[0],o[1],o[2]),l.uniform1f(this.progSplat.uniforms.uRadius,Math.max(1e-6,a*.5*(a*.5))),l.uniform1f(this.progSplat.uniforms.uDiscR,Math.max(1e-6,a)),l.uniform1f(this.progSplat.uniforms.uHardness,s),l.uniform1f(this.progSplat.uniforms.uAspect,this.simW/this.simH),l.uniform1f(this.progSplat.uniforms.uOp,n==="sub"?1:0),this.drawQuad(),e.swap()}brush(e,i,t,o,a,s,n,l,c){e=Math.max(0,Math.min(1,e)),i=Math.max(0,Math.min(1,i));const p=[a[0]*l,a[1]*l,a[2]*l],h=[t,o,0];switch(c){case"paint":this.splat(this.velocity,e,i,h,s,n,"add"),this.splat(this.dye,e,i,p,s,n,"add");break;case"erase":this.splat(this.dye,e,i,[l,l,l],s,n,"sub");break;case"stamp":this.splat(this.dye,e,i,p,s,n,"add");break;case"smudge":this.splat(this.velocity,e,i,h,s,n,"add");break}this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null)}ensureMaskReadFBO(){if(this.maskReadFBO)return;const e=this.gl,i=e.createTexture();e.bindTexture(e.TEXTURE_2D,i),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,this.MASK_CPU_W,this.MASK_CPU_H,0,e.RGBA,e.UNSIGNED_BYTE,null);const t=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,t),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,i,0),e.bindFramebuffer(e.FRAMEBUFFER,null),this.maskReadFBO={tex:i,fbo:t,width:this.MASK_CPU_W,height:this.MASK_CPU_H,texel:[1/this.MASK_CPU_W,1/this.MASK_CPU_H]},this.maskCpuBuf=new Uint8Array(this.MASK_CPU_W*this.MASK_CPU_H*4)}readMaskToCPU(){if(!this.params.collisionEnabled)return;const e=this.gl;this.ensureMaskReadFBO();const i=this.juliaReadFbo();e.bindFramebuffer(e.READ_FRAMEBUFFER,i.fbo),e.readBuffer(e.COLOR_ATTACHMENT1),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,this.maskReadFBO.fbo),e.blitFramebuffer(0,0,this.simW,this.simH,0,0,this.MASK_CPU_W,this.MASK_CPU_H,e.COLOR_BUFFER_BIT,e.LINEAR),e.readBuffer(e.COLOR_ATTACHMENT0),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.FRAMEBUFFER,this.maskReadFBO.fbo),e.readPixels(0,0,this.MASK_CPU_W,this.MASK_CPU_H,e.RGBA,e.UNSIGNED_BYTE,this.maskCpuBuf),e.bindFramebuffer(e.FRAMEBUFFER,null)}sampleMask(e,i){if(!this.params.collisionEnabled||this.maskCpuBuf.length===0)return 0;const t=this.MASK_CPU_W,o=this.MASK_CPU_H;if(e<0||e>1||i<0||i>1)return 0;const a=Math.min(t-1,Math.max(0,Math.floor(e*t))),s=Math.min(o-1,Math.max(0,Math.floor(i*o)));return this.maskCpuBuf[(s*t+a)*4+3]/255}renderJulia(){var p;const e=this.gl,i=this.params.tsaaSampleCap,t=!this.params.paused&&!this.forceFluidPaused;if(this.tsaaActive()&&i>0&&this.tsaaSampleIndex>=i&&!t)return;const o=this.juliaCur;this.juliaCur=this.juliaPrev,this.juliaPrev=o,this.juliaTimer.begin(),e.bindFramebuffer(e.FRAMEBUFFER,this.juliaCur.fbo),e.viewport(0,0,this.juliaCur.width,this.juliaCur.height),this.useProgram(this.progJulia),this.setTexel(this.progJulia,this.simW,this.simH),e.uniform1i(this.progJulia.uniforms.uKind,this.params.kind==="julia"?0:1),e.uniform2f(this.progJulia.uniforms.uJuliaC,this.params.juliaC[0],this.params.juliaC[1]),e.uniform2f(this.progJulia.uniforms.uCenter,this.params.center[0],this.params.center[1]),e.uniform1f(this.progJulia.uniforms.uScale,this.params.zoom);const a=this.bucketOutputSize[0]>0&&this.bucketOutputSize[1]>0?this.bucketOutputSize[0]/this.bucketOutputSize[1]:this.simW/this.simH;e.uniform1f(this.progJulia.uniforms.uAspect,a);const s=Math.max(4,this.params.maxIter|0);e.uniform1i(this.progJulia.uniforms.uMaxIter,s),e.uniform1i(this.progJulia.uniforms.uColorIter,Math.max(1,Math.min(s,this.params.colorIter|0))),e.uniform1f(this.progJulia.uniforms.uEscapeR2,this.params.escapeR*this.params.escapeR),e.uniform1f(this.progJulia.uniforms.uPower,this.params.power),e.uniform1i(this.progJulia.uniforms.uTrapMode,Vo(this.params.colorMapping)),e.uniform1i(this.progJulia.uniforms.uTrackAccum,Go(this.params.colorMapping)?1:0),e.uniform1i(this.progJulia.uniforms.uTrackDeriv,No(this.params.colorMapping)?1:0),e.uniform2f(this.progJulia.uniforms.uTrapCenter,this.params.trapCenter[0],this.params.trapCenter[1]),e.uniform1f(this.progJulia.uniforms.uTrapRadius,this.params.trapRadius),e.uniform2f(this.progJulia.uniforms.uTrapNormal,this.params.trapNormal[0],this.params.trapNormal[1]),e.uniform1f(this.progJulia.uniforms.uTrapOffset,this.params.trapOffset),e.uniform1f(this.progJulia.uniforms.uStripeFreq,this.params.stripeFreq);const n=this.params.tsaaSampleCap,c=this.tsaaActive()&&(n<=0||this.tsaaSampleIndex<n)?this.params.tsaaJitterAmount:0;if(e.uniform1f(this.progJulia.uniforms.uJitterScale,c),e.uniform2f(this.progJulia.uniforms.uResolution,this.simW,this.simH),e.uniform1i(this.progJulia.uniforms.uFrameCount,this.frameCount),e.uniform1i(this.progJulia.uniforms.uPerFrameSamples,this.params.tsaaPerFrameSamples??1),e.uniform1i(this.progJulia.uniforms.uJitterMode,this.params.tsaaJitterMode==="grid"?1:0),e.uniform1i(this.progJulia.uniforms.uGridSize,this.params.tsaaGridSize??16),e.uniform1i(this.progJulia.uniforms.uTsaaSampleIndex,this.tsaaSampleIndex),e.uniform2f(this.progJulia.uniforms.uImageTileOrigin,this.bucketTileOrigin[0],this.bucketTileOrigin[1]),e.uniform2f(this.progJulia.uniforms.uImageTileSize,this.bucketTileSize[0],this.bucketTileSize[1]),e.uniform2f(this.progJulia.uniforms.uRegionMin,this.bucketRegionMin[0],this.bucketRegionMin[1]),e.uniform2f(this.progJulia.uniforms.uRegionMax,this.bucketRegionMax[0],this.bucketRegionMax[1]),this.blueNoise){this.bindTex(5,this.blueNoise.texture,this.progJulia.uniforms.uBlueNoiseTexture);const[h,d]=this.blueNoise.getResolution();e.uniform2f(this.progJulia.uniforms.uBlueNoiseResolution,h,d)}this.deepZoom.bindUniforms(this.progJulia,this.params,((p=this.blueNoise)==null?void 0:p.texture)??null),this.gradients.ensure("main"),this.gradients.ensure("collision"),this.bindTex(8,this.gradients.getTexture("main"),this.progJulia.uniforms.uGradient),this.bindTex(9,this.gradients.getTexture("collision"),this.progJulia.uniforms.uCollisionGradient),e.uniform1i(this.progJulia.uniforms.uColorMapping,Ze(this.params.colorMapping)),e.uniform1f(this.progJulia.uniforms.uGradientRepeat,this.params.gradientRepeat),e.uniform1f(this.progJulia.uniforms.uGradientPhase,this.params.gradientPhase),e.uniform3f(this.progJulia.uniforms.uInteriorColor,this.params.interiorColor[0],this.params.interiorColor[1],this.params.interiorColor[2]),e.uniform1i(this.progJulia.uniforms.uCollisionEnabled,this.params.collisionEnabled?1:0),e.uniform1f(this.progJulia.uniforms.uCollisionRepeat,this.params.collisionRepeat),e.uniform1f(this.progJulia.uniforms.uCollisionPhase,this.params.collisionPhase),this.drawQuad(),this.juliaTimer.end()}getJuliaMs(){return this.juliaTimer.getMs()}hasGpuTimer(){return this.juliaTimer.available()}setForceFluidPaused(e){this.forceFluidPaused=e}setForceJuliaOnly(e){this.forceJuliaOnly=e}getCanvas(){return this.canvas}isForceJuliaOnly(){return this.forceJuliaOnly}isForceFluidPaused(){return this.forceFluidPaused}setBucketImageTile(e,i){this.bucketTileOrigin=[e[0],e[1]],this.bucketTileSize=[i[0],i[1]]}setBucketRegion(e,i){this.bucketRegionMin=[e[0],e[1]],this.bucketRegionMax=[i[0],i[1]]}setBucketOutputSize(e,i){this.bucketOutputSize=[Math.max(0,Math.floor(e)),Math.max(0,Math.floor(i))]}runTsaaBlend(){const e=this.params.tsaaSampleCap;if(e>0&&this.tsaaSampleIndex>=e)return;const i=this.gl;this.tsaaSampleIndex=e>0?Math.min(this.tsaaSampleIndex+1,e):this.tsaaSampleIndex+1,i.bindFramebuffer(i.FRAMEBUFFER,this.juliaTsaaPrev.fbo),i.viewport(0,0,this.juliaTsaaPrev.width,this.juliaTsaaPrev.height),this.useProgram(this.progTsaaBlend),this.bindTex(0,this.juliaCur.texMain,this.progTsaaBlend.uniforms.uCurrentMain),this.bindTex(1,this.juliaCur.texFx,this.progTsaaBlend.uniforms.uCurrentFx),this.bindTex(2,this.juliaTsaa.texMain,this.progTsaaBlend.uniforms.uHistoryMain),this.bindTex(3,this.juliaTsaa.texFx,this.progTsaaBlend.uniforms.uHistoryFx),i.uniform1i(this.progTsaaBlend.uniforms.uSampleIndex,this.tsaaSampleIndex),this.drawQuad();const t=this.juliaTsaa;this.juliaTsaa=this.juliaTsaaPrev,this.juliaTsaaPrev=t}tsaaActive(){return this.params.tsaaSampleCap!==1}juliaReadFbo(){return this.tsaaActive()?this.juliaTsaa:this.juliaCur}updateTsaaHash(){const e=this.params,i=e.interiorColor,t=`${e.kind}|${e.juliaC[0]}|${e.juliaC[1]}|${e.center[0]}|${e.center[1]}|${e.zoom}|${e.power}|${e.maxIter}|${e.colorIter}|${e.escapeR}|${e.colorMapping}|${e.trapCenter[0]}|${e.trapCenter[1]}|${e.trapRadius}|${e.trapNormal[0]}|${e.trapNormal[1]}|${e.trapOffset}|${e.stripeFreq}|gr:${e.gradientRepeat}|gp:${e.gradientPhase}|ic:${i[0]},${i[1]},${i[2]}|ce:${e.collisionEnabled?1:0}|cr:${e.collisionRepeat}|cp:${e.collisionPhase}|gV:${this.gradients.version}|dz:${e.deepZoomEnabled?1:0}|dzV:${this.deepZoom.version}`;t!==this.tsaaParamHash&&(this.tsaaParamHash=t,this.tsaaSampleIndex=0)}computeForce(){const e=this.gl;this.bindFBO(this.forceTex),this.useProgram(this.progMotion),this.setTexel(this.progMotion,this.simW,this.simH);const i=this.juliaReadFbo();this.bindTex(0,i.texMain,this.progMotion.uniforms.uJulia),this.bindTex(1,this.juliaPrev.texMain,this.progMotion.uniforms.uJuliaPrev),this.bindTex(4,i.texFx,this.progMotion.uniforms.uJuliaFx),this.bindTex(5,i.texFx,this.progMotion.uniforms.uMask),this.bindTex(6,this.juliaPrev.texFx,this.progMotion.uniforms.uJuliaPrevFx),e.uniform1i(this.progMotion.uniforms.uMode,Xo(this.params.forceMode)),e.uniform1i(this.progMotion.uniforms.uSource,Zo(this.params.forceSource)),e.uniform1f(this.progMotion.uniforms.uGain,this.params.forceGain),e.uniform1f(this.progMotion.uniforms.uDt,this.params.dt),e.uniform1f(this.progMotion.uniforms.uInteriorDamp,this.params.interiorDamp),e.uniform1f(this.progMotion.uniforms.uEdgeMargin,this.params.edgeMargin),e.uniform1f(this.progMotion.uniforms.uForceCap,this.params.forceCap),e.uniform1i(this.progMotion.uniforms.uMaxIter,Math.max(1,this.params.maxIter|0)),this.drawQuad()}addForceToVelocity(){const e=this.gl;this.bindFBO(this.velocity.write),this.useProgram(this.progAddForce),this.setTexel(this.progAddForce,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progAddForce.uniforms.uVelocity),this.bindTex(1,this.forceTex.tex,this.progAddForce.uniforms.uForce),this.bindTex(2,this.juliaReadFbo().texFx,this.progAddForce.uniforms.uMask),e.uniform1f(this.progAddForce.uniforms.uDt,this.params.dt),this.drawQuad(),this.velocity.swap()}injectDye(){const e=this.gl;this.bindFBO(this.dye.write),this.useProgram(this.progInjectDye),this.setTexel(this.progInjectDye,this.simW,this.simH);const i=this.juliaReadFbo();this.bindTex(0,this.dye.read.tex,this.progInjectDye.uniforms.uDye),this.bindTex(1,i.texMain,this.progInjectDye.uniforms.uJulia),this.bindTex(4,i.texFx,this.progInjectDye.uniforms.uJuliaFx),this.bindTex(5,i.texFx,this.progInjectDye.uniforms.uMask),e.uniform1f(this.progInjectDye.uniforms.uDyeGain,this.params.dyeInject),e.uniform1f(this.progInjectDye.uniforms.uDyeFadeHz,this.params.dyeDissipation),e.uniform1f(this.progInjectDye.uniforms.uDt,this.params.dt),e.uniform1f(this.progInjectDye.uniforms.uEdgeMargin,this.params.edgeMargin),e.uniform1i(this.progInjectDye.uniforms.uDyeBlend,Uo(this.params.dyeBlend)),e.uniform1i(this.progInjectDye.uniforms.uDyeDecayMode,Bo(this.params.dyeDecayMode)),e.uniform1f(this.progInjectDye.uniforms.uDyeChromaFadeHz,this.params.dyeChromaDecayHz),e.uniform1f(this.progInjectDye.uniforms.uDyeSatBoost,this.params.dyeSaturationBoost),this.drawQuad(),this.dye.swap()}computeCurl(){this.bindFBO(this.curl),this.useProgram(this.progCurl),this.setTexel(this.progCurl,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progCurl.uniforms.uVelocity),this.drawQuad()}applyVorticity(){const e=this.gl;this.bindFBO(this.velocity.write),this.useProgram(this.progVorticity),this.setTexel(this.progVorticity,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progVorticity.uniforms.uVelocity),this.bindTex(1,this.curl.tex,this.progVorticity.uniforms.uCurl),e.uniform1f(this.progVorticity.uniforms.uStrength,this.params.vorticity),e.uniform1f(this.progVorticity.uniforms.uScale,this.params.vorticityScale),e.uniform1f(this.progVorticity.uniforms.uDt,this.params.dt),this.drawQuad(),this.velocity.swap()}computeDivergence(){this.bindFBO(this.divergence),this.useProgram(this.progDivergence),this.setTexel(this.progDivergence,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progDivergence.uniforms.uVelocity),this.drawQuad()}solvePressure(){const e=this.gl;this.bindFBO(this.pressure.read),e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT);for(let i=0;i<this.params.pressureIters;++i)this.bindFBO(this.pressure.write),this.useProgram(this.progPressure),this.setTexel(this.progPressure,this.simW,this.simH),this.bindTex(0,this.pressure.read.tex,this.progPressure.uniforms.uPressure),this.bindTex(1,this.divergence.tex,this.progPressure.uniforms.uDivergence),this.drawQuad(),this.pressure.swap()}subtractPressureGradient(){this.bindFBO(this.velocity.write),this.useProgram(this.progGradSub),this.setTexel(this.progGradSub,this.simW,this.simH),this.bindTex(0,this.pressure.read.tex,this.progGradSub.uniforms.uPressure),this.bindTex(1,this.velocity.read.tex,this.progGradSub.uniforms.uVelocity),this.bindTex(2,this.juliaReadFbo().texFx,this.progGradSub.uniforms.uMask),this.drawQuad(),this.velocity.swap()}advect(e,i){const t=this.gl;this.bindFBO(e.write),this.useProgram(this.progAdvect),this.setTexel(this.progAdvect,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progAdvect.uniforms.uVelocity),this.bindTex(1,e.read.tex,this.progAdvect.uniforms.uSource),this.bindTex(2,this.juliaReadFbo().texFx,this.progAdvect.uniforms.uMask),t.uniform1f(this.progAdvect.uniforms.uDt,this.params.dt),t.uniform1f(this.progAdvect.uniforms.uDissipation,i),t.uniform1f(this.progAdvect.uniforms.uEdgeMargin,this.params.edgeMargin),this.drawQuad(),e.swap()}reprojectTexture(e,i,t){const o=this.gl;this.bindFBO(e.write),this.useProgram(this.progReproject),this.setTexel(this.progReproject,this.simW,this.simH),this.bindTex(0,e.read.tex,this.progReproject.uniforms.uSource),o.uniform2f(this.progReproject.uniforms.uNewCenter,this.params.center[0],this.params.center[1]),o.uniform2f(this.progReproject.uniforms.uOldCenter,i[0],i[1]),o.uniform1f(this.progReproject.uniforms.uNewZoom,this.params.zoom),o.uniform1f(this.progReproject.uniforms.uOldZoom,t),o.uniform1f(this.progReproject.uniforms.uAspect,this.simW/this.simH),this.drawQuad(),e.swap()}maybeReprojectForCamera(){if(this.firstFrame){this.firstFrame=!1,this.lastCenter=[this.params.center[0],this.params.center[1]],this.lastZoom=this.params.zoom;return}const e=this.params.center[0]-this.lastCenter[0],i=this.params.center[1]-this.lastCenter[1],t=this.params.zoom-this.lastZoom;if(Math.abs(e)<1e-7&&Math.abs(i)<1e-7&&Math.abs(t)<1e-7)return;const o=[this.lastCenter[0],this.lastCenter[1]],a=this.lastZoom;this.reprojectTexture(this.dye,o,a),this.reprojectTexture(this.velocity,o,a),this.lastCenter=[this.params.center[0],this.params.center[1]],this.lastZoom=this.params.zoom}displayToScreen(){const e=this.gl;this.gradients.ensure("main");const t=this.params.bloomAmount>.001?this.bloom.process(this.canvas.width,this.canvas.height,this.params.bloomThreshold,()=>{this.setDisplayUniforms(null,!0),this.drawQuad()}):null;e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,this.canvas.width,this.canvas.height),this.setDisplayUniforms(t,!1),this.drawQuad()}setDisplayUniforms(e,i=!1){const t=this.gl;this.useProgram(this.progDisplay),t.uniform2f(this.progDisplay.uniforms.uTexelDisplay,1/this.canvas.width,1/this.canvas.height),t.uniform2f(this.progDisplay.uniforms.uTexelDye,1/this.simW,1/this.simH);const o=this.juliaReadFbo();this.bindTex(7,o.texFx,this.progDisplay.uniforms.uJuliaFx),this.bindTex(1,this.dye.read.tex,this.progDisplay.uniforms.uDye),this.bindTex(2,this.velocity.read.tex,this.progDisplay.uniforms.uVelocity),this.bindTex(3,this.gradients.getTexture("main"),this.progDisplay.uniforms.uGradient),this.bindTex(5,e??this.gradients.getTexture("main"),this.progDisplay.uniforms.uBloom),this.bindTex(6,o.texFx,this.progDisplay.uniforms.uMask);const a=this.forceJuliaOnly?"julia":this.params.show;t.uniform1i(this.progDisplay.uniforms.uShowMode,Wo(a)),t.uniform1f(this.progDisplay.uniforms.uJuliaMix,this.params.juliaMix),t.uniform1f(this.progDisplay.uniforms.uDyeMix,this.params.dyeMix),t.uniform1f(this.progDisplay.uniforms.uVelocityViz,this.params.velocityViz),t.uniform1i(this.progDisplay.uniforms.uColorMapping,Ze(this.params.colorMapping)),t.uniform1f(this.progDisplay.uniforms.uGradientRepeat,this.params.gradientRepeat),t.uniform1f(this.progDisplay.uniforms.uGradientPhase,this.params.gradientPhase),t.uniform3f(this.progDisplay.uniforms.uInteriorColor,this.params.interiorColor[0],this.params.interiorColor[1],this.params.interiorColor[2]),i?(t.uniform1i(this.progDisplay.uniforms.uToneMapping,0),t.uniform1f(this.progDisplay.uniforms.uExposure,1),t.uniform1f(this.progDisplay.uniforms.uVibrance,0),t.uniform1f(this.progDisplay.uniforms.uBloomAmount,0),t.uniform1f(this.progDisplay.uniforms.uAberration,0),t.uniform1f(this.progDisplay.uniforms.uRefraction,0),t.uniform1f(this.progDisplay.uniforms.uRefractSmooth,1),t.uniform1f(this.progDisplay.uniforms.uRefractRoughness,0),t.uniform1f(this.progDisplay.uniforms.uCaustics,0),t.uniform1i(this.progDisplay.uniforms.uCollisionPreview,0)):(t.uniform1i(this.progDisplay.uniforms.uToneMapping,Oo(this.params.toneMapping)),t.uniform1f(this.progDisplay.uniforms.uExposure,this.params.exposure),t.uniform1f(this.progDisplay.uniforms.uVibrance,this.params.vibrance),t.uniform1f(this.progDisplay.uniforms.uBloomAmount,e?this.params.bloomAmount:0),t.uniform1f(this.progDisplay.uniforms.uAberration,this.params.aberration),t.uniform1f(this.progDisplay.uniforms.uRefraction,this.params.refraction),t.uniform1f(this.progDisplay.uniforms.uRefractSmooth,this.params.refractSmooth),t.uniform1f(this.progDisplay.uniforms.uRefractRoughness,this.params.refractRoughness),t.uniform1f(this.progDisplay.uniforms.uCaustics,this.params.caustics),t.uniform1i(this.progDisplay.uniforms.uCollisionPreview,this.params.collisionPreview?1:0))}frame(e){const i=this.gl,t=this.lastTimeMs===0?.016:Math.max(0,Math.min(.05,(e-this.lastTimeMs)/1e3));this.lastTimeMs=e,this.params.dt=t*this.params.timeScale,this.updateTsaaHash(),this.frameCount++,this.tsaaActive()&&this.params.tsaaSampleCap>0&&this.tsaaSampleIndex>=this.params.tsaaSampleCap||(this.renderJulia(),this.tsaaActive()&&this.runTsaaBlend()),this.readMaskToCPU(),!this.params.paused&&!this.forceFluidPaused&&(this.maybeReprojectForCamera(),this.computeForce(),this.addForceToVelocity(),this.params.vorticity>0&&(this.computeCurl(),this.applyVorticity()),this.computeDivergence(),this.solvePressure(),this.subtractPressureGradient(),this.advect(this.velocity,this.params.dissipation),this.injectDye(),this.advect(this.dye,this.params.dyeDissipation)),this.displayToScreen(),i.activeTexture(i.TEXTURE0),i.bindTexture(i.TEXTURE_2D,null),this.juliaTimer.poll(),this.onFrameEnd&&this.onFrameEnd()}dispose(){const e=this.gl;this.deepZoom.dispose(),this.juliaTimer.dispose(),this.deleteMrtFbo(this.juliaCur),this.deleteMrtFbo(this.juliaPrev),this.deleteMrtFbo(this.juliaTsaa),this.deleteMrtFbo(this.juliaTsaaPrev),this.deleteFBO(this.forceTex),this.deleteDoubleFBO(this.velocity),this.deleteDoubleFBO(this.dye),this.deleteFBO(this.divergence),this.deleteDoubleFBO(this.pressure),this.deleteFBO(this.curl),this.maskReadFBO&&(this.deleteFBO(this.maskReadFBO),this.maskReadFBO=null),this.gradients.dispose(),this.bloom.dispose(),e.deleteBuffer(this.quadVbo);for(const i of[this.progJulia,this.progMotion,this.progAddForce,this.progInjectDye,this.progAdvect,this.progDivergence,this.progCurl,this.progVorticity,this.progPressure,this.progGradSub,this.progSplat,this.progDisplay,this.progClear,this.progReproject,this.progTsaaBlend])i!=null&&i.prog&&e.deleteProgram(i.prog);this.blueNoise&&(e.deleteTexture(this.blueNoise.texture),this.blueNoise=null)}canvasToFractal(e,i){const t=this.canvas.getBoundingClientRect(),o=(e-t.left)/t.width,a=1-(i-t.top)/t.height,s=this.canvas.width/this.canvas.height,n=(o*2-1)*s*this.params.zoom+this.params.center[0],l=(a*2-1)*this.params.zoom+this.params.center[1];return[n,l]}canvasToUv(e,i){const t=this.canvas.getBoundingClientRect();return[(e-t.left)/t.width,1-(i-t.top)/t.height]}}function Xo(r){switch(r){case"gradient":return 0;case"curl":return 1;case"iterate":return 2;case"c-track":return 3;case"hue":return 4}}function Zo(r){switch(r){case"de":return 0;case"smoothPot":return 1;case"stripe":return 2;case"paletteLuma":return 3;case"mask":return 4}}function Wo(r){switch(r){case"composite":return 0;case"julia":return 1;case"dye":return 2;case"velocity":return 3}}const Ko=r=>{me.register({id:"fluid-toy.pause",key:"Space",description:"Pause / resume the fluid simulation",category:"Playback",handler:()=>{var i;const e=w.getState();e.setFluidSim({paused:!((i=e.fluidSim)!=null&&i.paused)})}}),me.register({id:"fluid-toy.reset",key:"R",description:"Reset fluid fields (dye + velocity → zero)",category:"Playback",handler:()=>{var e;(e=r.current)==null||e.resetFluid()}}),me.register({id:"fluid-toy.home",key:"Home",description:"Recenter view (center=[0,0], zoom=1.5)",category:"View",handler:()=>{w.getState().setJulia({center:{x:0,y:0},zoom:1.5})}})},qo=r=>{const e=C.useRef(null),i=C.useRef(null);return C.useEffect(()=>{const t=r.current;if(t){try{const o=new Jo(t,{onFrameEnd:()=>Et.frameTick()});e.current=o,oe.ref.current=o;let a=-1,s=0,n=-1,l=!1;const c=p=>{const h=a<0?0:Math.min(.1,(p-a)/1e3);if(a=p,e.current){const d=$.ref.current;Pi(Y.ref.current.runtime,{dtSec:h,wallClockMs:p,dragging:d.dragging,cursorUv:d.uv,cursorVelUv:d.velUv,params:Ie(),engine:e.current});const x=Te.getState(),M=x.deterministicPlayback&&x.isPlaying;M&&!l&&x.currentFrame<1&&(e.current.resetFluid(),e.current.resetAccumulation()),l=x.isPlaying;const f=M?x.currentFrame*1e3/Math.max(1,x.fps):p;if(e.current.frame(f),p-s>100){const v=e.current.getAccumulationCount();v!==n&&(w.getState().reportAccumulation(v),n=v),s=p}}i.current=requestAnimationFrame(c)};i.current=requestAnimationFrame(c)}catch(o){console.error("[FluidToy] failed to start engine:",o)}return Ko(e),()=>{var o;i.current!==null&&cancelAnimationFrame(i.current),(o=e.current)==null||o.dispose(),e.current=null,oe.ref.current=null}}},[]),e},$o=r=>{const e=O("julia"),i=O("deepZoom"),t=O("coupling"),o=O("palette"),a=O("collision"),s=O("fluidSim"),n=O("postFx"),l=O("composite"),c=qe(),p=C.useMemo(()=>q(t,"coupling",c),[t,c]),h=C.useMemo(()=>q(o,"palette",c),[o,c]),d=C.useMemo(()=>q(a,"collision",c),[a,c]),x=C.useMemo(()=>q(s,"fluidSim",c),[s,c]),M=C.useMemo(()=>q(n,"postFx",c),[n,c]),f=C.useMemo(()=>q(l,"composite",c),[l,c]);C.useEffect(()=>{const v=r.current;v&&mi(v,e,c)},[e,r]),C.useEffect(()=>{const v=r.current;v&&hi(v,e,c)},[e,c,r]),C.useEffect(()=>{const v=r.current;v&&xi(v,i,e)},[i,e,r]),C.useEffect(()=>{const v=r.current;v&&Zi(v,h)},[h,r]),C.useEffect(()=>{const v=r.current;v&&qi(v,d)},[d,r]),C.useEffect(()=>{const v=r.current;v&&Yi(v,x,p)},[x,p,r]),C.useEffect(()=>{const v=r.current;v&&or(v,M)},[M,r]),C.useEffect(()=>{const v=r.current;v&&lr(v,f)},[f,r])};class Yo{constructor(){m(this,"worker",null);m(this,"nextId",1);m(this,"pending",new Map)}ensureWorker(){if(this.worker)return this.worker;const e=new Worker(new URL(""+new URL("deepZoomWorker-CEHSx2aH.js",import.meta.url).href,import.meta.url),{type:"module"});return e.onmessage=i=>{const t=i.data,o=this.pending.get(t.id);o&&(this.pending.delete(t.id),t.type==="orbit"?o.resolve({orbit:new Float32Array(t.orbit),length:t.length,escaped:t.escaped,precisionBits:t.precisionBits,buildMs:t.buildMs,laBuildMs:t.laBuildMs??0,laTable:t.laTable?new Float32Array(t.laTable):void 0,laStages:t.laStages?new Float32Array(t.laStages):void 0,laCount:t.laCount??0,laStageCount:t.laStageCount??0,at:t.at}):o.reject(new Error(t.message)))},e.onerror=i=>{var o;const t=new Error(`deep-zoom worker crashed: ${i.message}`);for(const a of this.pending.values())a.reject(t);this.pending.clear(),(o=this.worker)==null||o.terminate(),this.worker=null},this.worker=e,e}computeReferenceOrbit(e){const i=this.ensureWorker(),t=this.nextId++;return new Promise((o,a)=>{this.pending.set(t,{resolve:o,reject:a});const s={type:"computeOrbit",id:t,...e};i.postMessage(s)})}cancel(e){if(!this.worker)return;const i={type:"cancel",id:e};this.worker.postMessage(i),this.pending.delete(e)}dispose(){this.worker&&(this.worker.terminate(),this.worker=null),this.pending.clear()}}let ye=null;const Qo=()=>(ye||(ye=new Yo),ye),ea=r=>{var a,s;const e=O("julia"),i=O("deepZoom"),t=qe(),o=w(n=>n.canvasPixelSize);C.useEffect(()=>{var R,g;if(!i.enabled){Qr();return}const n=r.current;if(!n)return;const l=Qo();let c=!1;const p=performance.now(),h=[e.center.x,e.center.y],d=[((R=e.centerLow)==null?void 0:R.x)??0,((g=e.centerLow)==null?void 0:g.y)??0],x=o[0]/Math.max(1,o[1]),M=(x*x+1)*e.zoom*e.zoom,f=Math.max(2,Math.round(e.power??2)),v=f===2,b=e.kind===0?"julia":"mandelbrot",y=t["julia.juliaC_x"]??e.juliaC.x,F=t["julia.juliaC_y"]??e.juliaC.y;return l.computeReferenceOrbit({centerX:h[0],centerY:h[1],centerLowX:d[0],centerLowY:d[1],zoom:e.zoom,maxIter:i.maxRefIter,power:f,kind:b,juliaCx:y,juliaCy:F,buildLA:i.useLA&&v&&b==="mandelbrot",screenSqrRadius:i.useAT&&v&&b==="mandelbrot"?M:0}).then(T=>{if(c)return;const A=n.deepZoom;A.setReferenceOrbit(T.orbit,T.length,h,d),T.laTable&&T.laStages&&T.laCount>0?(A.setLATable(T.laTable,T.laCount,T.laStages),A.setLAEnabled(!0)):(A.clearLATable(),A.setLAEnabled(!1)),T.at?A.setAT({stepLength:T.at.stepLength,thresholdC:T.at.thresholdC,sqrEscapeRadius:T.at.sqrEscapeRadius,refC:[T.at.refCRe,T.at.refCIm],ccoeff:[T.at.ccoeffRe,T.at.ccoeffIm],invZCoeff:[T.at.invZCoeffRe,T.at.invZCoeffIm]}):A.clearAT(),n.redraw();const S=[];if(T.laStages)for(let E=0;E<T.laStages.length;E+=2)S.push(T.laStages[E+1]);if(at({orbitLength:T.length,precisionBits:T.precisionBits,orbitBuildMs:T.buildMs,laStageCount:T.laStageCount,laCount:T.laCount,laBuildMs:T.laBuildMs,laStagesPerLevel:S,juliaMs:0}),i.showStats){const E=performance.now()-p;console.log(`[deepZoom] orbit len=${T.length} prec=${T.precisionBits}b LA stages=${T.laStageCount} nodes=${T.laCount} (orbit=${T.buildMs.toFixed(1)}ms LA=${T.laBuildMs.toFixed(1)}ms total=${E.toFixed(1)}ms)`)}}).catch(T=>{c||console.error("[deepZoom] build failed:",T.message)}),()=>{c=!0}},[i.enabled,i.useLA,i.useAT,i.maxRefIter,i.showStats,e.center.x,e.center.y,(a=e.centerLow)==null?void 0:a.x,(s=e.centerLow)==null?void 0:s.y,e.zoom,e.power,e.kind,e.juliaC.x,e.juliaC.y,o,r]),C.useEffect(()=>{if(!i.enabled)return;const n=()=>{const c=r.current;c&&Yr(c.getJuliaMs())},l=window.setInterval(n,200);return()=>window.clearInterval(l)},[i.enabled,r])},ta=()=>{const r=w(g=>g.panels),e=w(g=>g.contextMenu),i=w(g=>g.handleInteractionStart),t=w(g=>g.handleInteractionEnd),o=w(g=>g.openContextMenu),a=w(g=>g.closeContextMenu),s=w(g=>g.togglePanel),n=w(g=>g.openHelp),l=C.useRef(null),c=qo(l),p=Object.values(r).filter(g=>g.location==="float"&&g.isOpen),h=C.useMemo(()=>({handleInteractionStart:i,handleInteractionEnd:t,openContextMenu:o}),[i,t,o]),d=w(g=>g.canvasPixelSize),x=w(g=>g.resolutionMode),M=w(g=>g.fixedResolution),f=w(g=>g.renderScale),v=Ke();Dt();const b=w(g=>g.accumulation),y=w(g=>g.isPaused),F=w(g=>g.sampleCap);$o(c),ea(c);const R=O("deepZoom").enabled;return C.useEffect(()=>{const g=c.current;if(!g)return;const T=b??!0?F:1;g.setParams({tsaaSampleCap:T,paused:y})},[b,y,F]),C.useEffect(()=>{const g=c.current;if(!g)return;const T=window.devicePixelRatio||1,[A,S]=x==="Fixed"?M:[d[0]/T,d[1]/T];if(A<1||S<1)return;const E=Math.max(1,Math.round(A*f*v)),D=Math.max(1,Math.round(S*f*v));g.setRenderSize(E,D),g.redraw()},[d,x,M,f,v]),u.jsx(Pt,{value:h,children:u.jsxs("div",{className:"fixed inset-0 w-full h-full bg-black text-white select-none overflow-hidden flex flex-col",children:[u.jsx(kt,{}),u.jsx(ti,{}),u.jsx(Lt,{}),p.map(g=>u.jsx(It,{id:g.id,title:g.id,children:u.jsx(jt,{activeTab:g.id,state:w.getState(),actions:w.getState(),onSwitchTab:T=>s(T,!0)})},g.id)),u.jsx(zt,{}),u.jsxs("div",{className:"flex-1 flex overflow-hidden relative",children:[u.jsx(Be,{side:"left"}),u.jsxs(Ct,{className:"flex-1",children:[u.jsx("canvas",{ref:l,className:"absolute inset-0 w-full h-full block touch-none"}),u.jsx(Kr,{canvasRef:l,engineRef:c}),u.jsx(Wt,{}),u.jsx(qr,{}),R&&u.jsxs("div",{style:{position:"absolute",left:8,bottom:8,pointerEvents:"none",zIndex:5,minWidth:220},children:[u.jsx(to,{}),u.jsx(lo,{engineRef:c})]})]}),u.jsx(Be,{side:"right"})]}),u.jsx(_t,{}),u.jsx(Kt,{}),e.visible&&u.jsx(Bt,{x:e.x,y:e.y,items:e.items,targetHelpIds:e.targetHelpIds,onClose:a,onOpenHelp:n})]})})},ia=[{id:"View",dock:"left",order:0,active:!0,items:[{type:"widget",id:"panel-views"}]},{id:"Fractal",dock:"left",order:1,showIf:()=>!1,items:[{type:"section",label:"Shape"},{type:"feature",id:"julia",whitelistParams:["kind","juliaC","power"]},{type:"section",label:"Iteration"},{type:"feature",id:"julia",whitelistParams:["maxIter"]}]},{id:"Deep Zoom",dock:"left",order:2,features:["deepZoom"]},{id:"Palette",dock:"left",order:3,items:[{type:"section",label:"Mode + LUT"},{type:"feature",id:"palette",whitelistParams:["colorMapping","gradient","interiorColor"]},{type:"section",label:"Tiling"},{type:"feature",id:"palette",whitelistParams:["gradientRepeat","gradientPhase"]},{type:"section",label:"Trap shape"},{type:"feature",id:"palette",whitelistParams:["trapCenter","trapRadius","trapNormal","trapOffset"]},{type:"section",label:"Stripe"},{type:"feature",id:"palette",whitelistParams:["stripeFreq"]},{type:"section",label:"Iteration"},{type:"feature",id:"palette",whitelistParams:["colorIter","escapeR"]}]},{id:"Modulation",dock:"left",order:4,items:[{type:"widget",id:"lfo-list"}]},{id:"Presets",dock:"left",order:5,features:["presets"]},{id:"Coupling",dock:"right",order:0,active:!0,items:[{type:"section",label:"Driver"},{type:"feature",id:"coupling",whitelistParams:["forceMode","forceSource"]},{type:"section",label:"Intensity"},{type:"feature",id:"coupling",whitelistParams:["forceGain","forceCap","interiorDamp","edgeMargin"]}]},{id:"Fluid",dock:"right",order:1,items:[{type:"section",label:"Sim"},{type:"feature",id:"fluidSim",whitelistParams:["vorticity","vorticityScale","dissipation","pressureIters"]},{type:"section",label:"Time"},{type:"feature",id:"fluidSim",whitelistParams:["paused","timeScale"]},{type:"section",label:"Dye injection"},{type:"feature",id:"fluidSim",whitelistParams:["dyeInject","dyeBlend"]},{type:"section",label:"Dye decay"},{type:"feature",id:"fluidSim",whitelistParams:["dyeDecayMode","dyeDissipation","dyeChromaDecayHz","dyeSaturationBoost"]}]},{id:"Collision",dock:"right",order:2,features:["collision"]},{id:"Brush",dock:"right",order:3,items:[{type:"section",label:"Stamp"},{type:"feature",id:"brush",whitelistParams:["mode","colorMode","solidColor","size","hardness","strength"]},{type:"section",label:"Stroke"},{type:"feature",id:"brush",whitelistParams:["flow","spacing","jitter"]},{type:"section",label:"Particle emitter"},{type:"feature",id:"brush",whitelistParams:["particleEmitter","particleRate","particleVelocity","particleSpread","particleGravity","particleDrag","particleLifetime","particleSizeScale"]}]},{id:"Post-FX",dock:"right",order:4,items:[{type:"section",label:"Tone"},{type:"feature",id:"postFx",whitelistParams:["toneMapping","exposure","vibrance"]},{type:"section",label:"Bloom"},{type:"feature",id:"postFx",whitelistParams:["bloomAmount","bloomThreshold"]},{type:"section",label:"Glass"},{type:"feature",id:"postFx",whitelistParams:["refraction","refractSmooth","refractRoughness","caustics"]},{type:"section",label:"Velocity"},{type:"feature",id:"postFx",whitelistParams:["aberration"]}]},{id:"Composite",dock:"right",order:5,items:[{type:"section",label:"Show"},{type:"feature",id:"composite",whitelistParams:["show"]},{type:"section",label:"Mix"},{type:"feature",id:"composite",whitelistParams:["juliaMix","dyeMix","velocityViz"]}]}],ra=()=>{Ot(ia),w.getState().setDockCollapsed("left",!1)};function oa(r,e){if(typeof OffscreenCanvas<"u"){const o=new OffscreenCanvas(r,e),a=o.getContext("2d");if(!a)throw new Error("OffscreenCanvas 2D context unavailable");return{canvas:o,ctx:a,convertToBlob:()=>o.convertToBlob({type:"image/png"})}}const i=document.createElement("canvas");i.width=r,i.height=e;const t=i.getContext("2d");if(!t)throw new Error("Canvas 2D context unavailable");return{canvas:i,ctx:t,convertToBlob:()=>new Promise((o,a)=>{i.toBlob(s=>{s?o(s):a(new Error("canvas.toBlob returned null"))},"image/png")})}}class aa{constructor(e){m(this,"engineRef");m(this,"cancelled",!1);m(this,"running",!1);this.engineRef=e}get accumulationCount(){var e;return((e=this.engineRef())==null?void 0:e.getAccumulationCount())??0}startBucketRender(e,i){if(this.running)return;const t=this.engineRef();t&&(this.running=!0,this.cancelled=!1,this.runLoop(t,e,i))}stopBucketRender(){this.cancelled=!0}buildTiles(e,i,t,o){const a=[];for(let s=0;s<o;s++)for(let n=0;n<t;n++){const l=Math.floor(n*e/t),c=Math.floor(s*i/o),p=n===t-1?e:Math.floor((n+1)*e/t),h=s===o-1?i:Math.floor((s+1)*i/o);a.push({col:n,row:s,pixelX:l,pixelY:c,pixelW:p-l,pixelH:h-c})}return a}buildSubBuckets(e,i,t){const o=Math.max(64,Math.floor(t)),a=Math.ceil(e/o),s=Math.ceil(i/o),n=[];for(let l=0;l<s;l++)for(let c=0;c<a;c++){const p=c*o,h=l*o,d=Math.min(e,(c+1)*o),x=Math.min(i,(l+1)*o);n.push({pixelX:p,pixelY:h,pixelW:d-p,pixelH:x-h})}return n.sort((l,c)=>{const p=(l.pixelX+l.pixelW*.5)/e-.5,h=(l.pixelY+l.pixelH*.5)/i-.5,d=(c.pixelX+c.pixelW*.5)/e-.5,x=(c.pixelY+c.pixelH*.5)/i-.5;return p*p+h*h-(d*d+x*x)}),n}buildFilename(e,i,t,o,a,s,n){const l=`${t}x${o}`;if(s*n<=1)return we(e,i,"png",l);const c=(x,M)=>String(x).padStart(M,"0"),p=Math.max(2,String(n-1).length),h=Math.max(2,String(s-1).length),d=`_r${c(a.row,p)}c${c(a.col,h)}`;return we(e,i,"png",`${l}${d}`)}emitStatus(e,i,t=0,o=0){mt.emit(ht.BUCKET_STATUS,{isRendering:i,progress:e,totalBuckets:t,currentBucket:o})}async runLoop(e,i,t){var T;const o=e.getCanvas(),a=o.width,s=o.height,n=e.isForceJuliaOnly(),l=e.isForceFluidPaused(),c=Math.max(1,Math.floor(t.outputWidth)),p=Math.max(1,Math.floor(t.outputHeight)),h=Math.max(1,Math.floor(t.tileCols)),d=Math.max(1,Math.floor(t.tileRows)),x=Math.max(1,t.samplesPerBucket??64),M=Math.max(64,Math.floor(t.bucketSize??512)),f=this.buildTiles(c,p,h,d),v=this.buildSubBuckets(f[0].pixelW,f[0].pixelH,M).length,b=f.length*v;let y=0;const R=((T=w.getState().projectSettings)==null?void 0:T.name)??"fluid-toy",g=1;e.setForceJuliaOnly(!0),e.setForceFluidPaused(!0),e.setBucketOutputSize(c,p),this.emitStatus(0,!0,b,0);try{for(let A=0;A<f.length&&!this.cancelled;A++){const S=f[A],E=S.pixelW,D=S.pixelH,z=[S.pixelX/c,S.pixelY/p],_=[E/c,D/p];e.setRenderSize(E,D),e.setBucketImageTile(z,_);const j=i?oa(E,D):null,U=this.buildSubBuckets(E,D,M);for(const P of U){if(this.cancelled)break;const fe=[P.pixelX/E,(D-P.pixelY-P.pixelH)/D],se=[(P.pixelX+P.pixelW)/E,(D-P.pixelY)/D];e.setBucketRegion(fe,se),e.resetAccumulation();const re=x*4+32;let ze=0;for(;e.getAccumulationCount()<x&&ze<re&&!this.cancelled;)await sa(16),ze++;if(this.cancelled)break;j&&j.ctx.drawImage(o,P.pixelX,P.pixelY,P.pixelW,P.pixelH,P.pixelX,P.pixelY,P.pixelW,P.pixelH),y++,this.emitStatus(y/b*100,!0,b,y)}if(this.cancelled)break;if(i&&j){const P=await j.convertToBlob(),fe=this.buildFilename(R,g,c,p,S,h,d),se=URL.createObjectURL(P),re=document.createElement("a");re.download=fe,re.href=se,re.click(),URL.revokeObjectURL(se)}}}finally{e.setBucketImageTile([0,0],[1,1]),e.setBucketRegion([0,0],[1,1]),e.setBucketOutputSize(0,0),e.setRenderSize(a,s),e.setForceJuliaOnly(n),e.setForceFluidPaused(l),e.resetAccumulation(),this.running=!1,this.cancelled=!1,this.emitStatus(0,!1)}}}const sa=r=>new Promise(e=>setTimeout(e,r)),na=()=>{const r=Ke();return u.jsxs("span",{className:"text-[10px] text-white/40 font-mono pointer-events-none",children:["q",(r*100).toFixed(0),"%"]})},I=({children:r})=>u.jsx("span",{className:"inline-block px-1 py-px text-[9px] font-mono border border-white/20 rounded bg-white/10 text-white/90 mx-0.5",children:r}),la=()=>{const[r,e]=C.useState(!0);return r?u.jsxs("div",{className:"px-3 py-2 text-[10px] text-gray-300 bg-black/70 rounded border border-white/10 max-w-[360px] pointer-events-auto shadow-xl",children:[u.jsxs("div",{className:"flex items-center justify-between mb-1",children:[u.jsx("div",{className:"text-[10px] uppercase text-cyan-300 tracking-wide",children:"Hotkeys"}),u.jsx("button",{onClick:()=>e(!1),className:"text-gray-500 hover:text-gray-200 text-[12px] px-1 leading-none",title:"Hide (click ? to reopen)",children:"×"})]}),u.jsxs("ul",{className:"space-y-0.5 leading-snug",children:[u.jsxs("li",{children:[u.jsx(I,{children:"Drag"})," inject force + dye into the fluid"]}),u.jsxs("li",{children:[u.jsx(I,{children:"B"}),"+",u.jsx(I,{children:"Drag"})," resize the brush live (horizontal = scale)"]}),u.jsxs("li",{children:[u.jsx(I,{children:"C"}),"+",u.jsx(I,{children:"Drag"})," pick Julia c directly on the canvas"]}),u.jsxs("li",{children:[u.jsx(I,{children:"Right-click"}),"+",u.jsx(I,{children:"Drag"})," pan the fractal view"]}),u.jsxs("li",{children:[u.jsx(I,{children:"Right-click"})," (tap) canvas for quick actions menu"]}),u.jsxs("li",{children:[u.jsx(I,{children:"Shift"}),"/",u.jsx(I,{children:"Alt"})," precision modifiers (5× / 0.2×) for any drag"]}),u.jsxs("li",{children:[u.jsx(I,{children:"Wheel"})," zoom · ",u.jsx(I,{children:"Middle"}),"+",u.jsx(I,{children:"Drag"})," smooth zoom · ",u.jsx(I,{children:"Home"})," recenter"]}),u.jsxs("li",{children:[u.jsx(I,{children:"Space"})," pause sim · ",u.jsx(I,{children:"R"})," clear fluid · ",u.jsx(I,{children:"O"})," toggle c-orbit · ",u.jsx(I,{children:"H"})," hide hints"]})]})]}):u.jsx("button",{onClick:()=>e(!0),className:"px-2 py-1 text-[10px] text-cyan-300 bg-black/50 rounded border border-white/10 hover:bg-black/70 pointer-events-auto",title:"Show hotkeys",children:"? hotkeys"})},ee=(r,e,i)=>r+(e-r)*i,ca=r=>r<.5?2*r*r:1-Math.pow(-2*r+2,2)/2,je=()=>{const r=w.getState().julia;return{kind:r.kind,juliaC:{...r.juliaC},center:{...r.center},zoom:r.zoom,maxIter:r.maxIter,power:r.power}},ua=500;let te=null;const da=r=>{const e=w.getState().setJulia;if(!e)return;te!==null&&(cancelAnimationFrame(te),te=null);const i=je();e({kind:r.kind,maxIter:r.maxIter});const t=Math.log(Math.max(i.zoom,1e-12)),o=Math.log(Math.max(r.zoom,1e-12)),a=performance.now(),s=()=>{const n=(performance.now()-a)/ua;if(n>=1){e({center:{x:r.center.x,y:r.center.y},juliaC:{x:r.juliaC.x,y:r.juliaC.y},zoom:r.zoom,power:r.power}),te=null;return}const l=ca(n);e({center:{x:ee(i.center.x,r.center.x,l),y:ee(i.center.y,r.center.y,l)},juliaC:{x:ee(i.juliaC.x,r.juliaC.x,l),y:ee(i.juliaC.y,r.juliaC.y,l)},zoom:Math.exp(ee(t,o,l)),power:ee(i.power,r.power,l)}),te=requestAnimationFrame(s)};te=requestAnimationFrame(s)},pa=r=>{da(r)},fa=r=>{const e=je();return e.kind!==r.kind||e.maxIter!==r.maxIter||e.power!==r.power||Math.abs(e.zoom-r.zoom)>1e-5||Math.abs(e.center.x-r.center.x)+Math.abs(e.center.y-r.center.y)>1e-4||Math.abs(e.juliaC.x-r.juliaC.x)+Math.abs(e.juliaC.y-r.juliaC.y)>1e-4},ma=async()=>{try{const r=document.querySelector("canvas");if(!r)return;const e=128,i=document.createElement("canvas");i.width=e,i.height=e;const t=i.getContext("2d");if(!t)return;const o=Math.min(r.width,r.height),a=(r.width-o)/2,s=(r.height-o)/2;return t.drawImage(r,a,s,o,o,0,0,e,e),i.toDataURL("image/jpeg",.7)}catch{return}},ha=()=>{const r=w.getState().setJulia;r&&r({center:{x:0,y:0},zoom:1.5})},ga=[{label:"Mandelbrot · Home",state:{kind:1,juliaC:{x:-.7,y:.27015},center:{x:-.5,y:0},zoom:1.5,maxIter:256,power:2}},{label:"Julia · Classic",state:{kind:0,juliaC:{x:-.7,y:.27015},center:{x:0,y:0},zoom:1.5,maxIter:256,power:2}},{label:"Julia · Dendrite",state:{kind:0,juliaC:{x:0,y:1},center:{x:0,y:0},zoom:1.5,maxIter:256,power:2}},{label:"Julia · San Marco",state:{kind:0,juliaC:{x:-.75,y:0},center:{x:0,y:0},zoom:1.5,maxIter:256,power:2}},{label:"Mandelbrot · Seahorse Valley",state:{kind:1,juliaC:{x:0,y:0},center:{x:-.75,y:.1},zoom:.15,maxIter:384,power:2}}],xa=()=>{if((w.getState().savedViews??[]).length>0)return;const i=ga.map(({label:o,state:a})=>({id:gt(),label:o,state:a,createdAt:Date.now()}));w.setState({savedViews:i});const t=w.getState().selectView;t==null||t(i[0].id)},va=()=>{ii({panelId:"View",arrayKey:"savedViews",activeIdKey:"activeViewId",actions:{add:"addView",update:"updateView",delete:"deleteView",duplicate:"duplicateView",select:"selectView",reorder:"reorderViews",saveToSlot:"saveViewToSlot",reset:"resetView"},defaultLabelPrefix:"View",capture:je,apply:pa,isModified:fa,captureThumbnail:ma,onReset:ha,slotShortcuts:{count:9,category:"Views"},menu:{menuId:"camera",slot:"right",order:29,icon:xt,title:"Camera",align:"end",width:"w-48",openItem:{label:"View panel…",title:"Open the View panel (camera + saved views)"},resetItem:{label:"Reset View",title:"Reset to default fractal view"},slotLabelPrefix:"View"}}),xa()},ba=({activeIdKey:r,featureIds:e,label:i="Active",groupFilter:t,excludeParams:o,whitelistParams:a,onDeselect:s,inactiveLabel:n=null})=>{const l=w(c=>c[r]);return!l&&n===null?null:u.jsxs("div",{className:"border-t border-white/10 bg-black/40 p-2 space-y-2",children:[u.jsxs("div",{className:"flex items-center justify-between",children:[u.jsx(vt,{children:l?i:n??""}),l&&s&&u.jsx("button",{type:"button",onClick:s,className:"text-[9px] text-gray-500 hover:text-white px-2 py-0.5 rounded border border-white/10 hover:bg-white/5 transition-colors",children:"Deselect"})]}),l&&e.map(c=>u.jsx("div",{className:"bg-white/5 rounded p-1",children:u.jsx(Ut,{featureId:c,groupFilter:t,excludeParams:o,whitelistParams:a})},c))]})},ya=()=>{const r=w(f=>f.savedViews??[]),e=w(f=>f.activeViewId),i=w(f=>f.addView),t=w(f=>f.updateView),o=w(f=>f.deleteView),a=w(f=>f.duplicateView),s=w(f=>f.selectView),n=w(f=>f.reorderViews),l=w(f=>f.resetView);w(f=>f.julia);const c=C.useCallback(async()=>{await(i==null?void 0:i())},[i]),p=C.useCallback((f,v)=>t==null?void 0:t(f,{label:v}),[t]),h=C.useCallback(f=>t==null?void 0:t(f),[t]),d=C.useCallback(()=>l==null?void 0:l(),[l]),x=C.useCallback(f=>{const v=w.getState()._viewIsModified;if(v)return v(f.state);const b=w.getState().julia,y=f.state;return b.kind!==y.kind||b.maxIter!==y.maxIter||b.power!==y.power||Math.abs(b.zoom-y.zoom)>1e-5||Math.abs(b.center.x-y.center.x)+Math.abs(b.center.y-y.center.y)>1e-4||Math.abs(b.juliaC.x-y.juliaC.x)+Math.abs(b.juliaC.y-y.juliaC.y)>1e-4},[]),M=C.useMemo(()=>{const f=w.getState().setJulia,v=F=>{const R=w.getState().julia.center??{x:0,y:0};f==null||f({center:{x:R.x,y:R.y},zoom:F})},b=Me.indexOf("mandelbrot"),y=Me.indexOf("julia");return[{id:"reset",label:"RESET",onSelect:()=>d(),title:"Reset view to defaults"},{id:"home",label:"HOME",onSelect:()=>f==null?void 0:f({center:{x:0,y:0}}),title:"Center to (0, 0); keep zoom"},{id:"1x",label:"1:1",onSelect:()=>v(1),title:"Zoom 1×"},{id:"wide",label:"WIDE",onSelect:()=>v(.5),title:"Zoom out"},{id:"mand",label:"MAND",onSelect:()=>f==null?void 0:f({kind:b>=0?b:1}),title:"Switch to Mandelbrot kind"},{id:"julia",label:"JULIA",onSelect:()=>f==null?void 0:f({kind:y>=0?y:0}),title:"Switch to Julia kind"}]},[d]);return i?u.jsx(ri,{className:"flex flex-col bg-[#080808] -m-3",snapshots:r,activeId:e,onSelect:s,onRename:p,onUpdate:h,onDuplicate:a,onDelete:o,onReorder:n,isModified:x,emptyState:"No saved views yet.",slotHintPrefix:null,presets:M,presetGridCols:3,toolbarBefore:u.jsx("div",{className:"px-2 pb-2 bg-black/40 border-b border-white/10",children:u.jsxs("button",{type:"button",onClick:c,className:"w-full bg-cyan-900/40 hover:bg-cyan-800 text-cyan-300 border border-cyan-500/30 rounded py-1 text-[9px] font-bold flex items-center justify-center gap-1",children:[u.jsx(bt,{})," New View"]})}),footer:u.jsxs(u.Fragment,{children:[u.jsx(ba,{activeIdKey:"activeViewId",featureIds:["julia"],label:"Active View",onDeselect:()=>s==null?void 0:s(null)}),u.jsx("div",{className:"border-t border-white/10 bg-black/40 p-2",children:u.jsx(oi,{})})]})}):u.jsx("div",{className:"p-4 text-[10px] text-gray-600 italic",children:"View library not initialized."})},lt=r=>new Promise(e=>setTimeout(e,r)),Ta=()=>lt(0),wa=r=>Math.floor((r.endFrame-r.startFrame)/Math.max(1,r.frameStep))+1,Ma=async r=>{var A;const{cfg:e,flags:i,status:t,isDiskMode:o}=r,a=oe.ref.current,s=document.querySelector("canvas");if(!a||!s){alert("Renderer is not booted yet — try again in a moment.");return}const n=yt[e.formatIndex];if(!n||n.imageSequence){alert("Image-sequence formats are not supported in fluid-toy v1. Pick MP4 or WebM.");return}const l=Math.max(2,Math.floor(e.width/2)*2),c=Math.max(2,Math.floor(e.height/2)*2),p=s.width,h=s.height,d=a.params.paused,x=Te.getState(),M=x.currentFrame,f=x.isPlaying,v=((A=w.getState().projectSettings)==null?void 0:A.name)??"fluid-toy",b=we(v,1,n.ext,`${l}x${c}`);let y=null;if(o)try{y=await(await window.showSaveFilePicker({suggestedName:b,types:[{description:n.label,accept:{[n.mime]:[`.${n.ext}`]}}]})).createWritable()}catch(S){if(S instanceof DOMException&&S.name==="AbortError")return;if(!(S instanceof DOMException&&S.name==="SecurityError")){alert("Could not start export. Error: "+(S instanceof Error?S.message:String(S)));return}y=null}f&&x.pause(),i.cancelledRef.current=!1,i.finishEarlyRef.current=!1,i.stoppingRef.current=!1,i.startTimeRef.current=Date.now(),t.setIsRendering(!0),t.setIsStopping(!1),t.setProgress(0),t.setElapsedTime(0),t.setEtaRange({min:0,max:0}),t.setLastFrameTime(0),t.setStatusText("Initializing encoder…");const F=wa(e),R=Math.max(1,Math.floor(e.samplesPerFrame));a.setRenderSize(l,c),a.setForceFluidPaused(!0),a.params.paused=!1;let g=0;a.frame(g);const T=new li;try{await T.start({width:l,height:c,fps:e.fps,bitrate:e.bitrate,formatIndex:e.formatIndex},y),t.setStatusText(y?"Rendering to disk…":"Rendering to RAM…");for(let S=0;S<F&&!(i.cancelledRef.current||i.finishEarlyRef.current);S++){for(;i.stoppingRef.current&&!i.cancelledRef.current&&!i.finishEarlyRef.current;)await lt(100);if(i.cancelledRef.current||i.finishEarlyRef.current)break;const E=e.startFrame+S*e.frameStep,D=E/e.fps,z=1/e.fps;_e.scrub(E),ci(D,z),await Ta(),a.setForceFluidPaused(!0),a.resetAccumulation();const _=R*4+8;for(let U=0;U<_&&(a.frame(g),!(a.getAccumulationCount()>=R));U++);a.setForceFluidPaused(!1),g+=1e3/e.fps,a.frame(g),a.setForceFluidPaused(!0),T.encodeCanvas(s,S),t.setProgress((S+1)/F),t.setStatusText(`Frame ${S+1} / ${F}`);const j=(Date.now()-i.startTimeRef.current)/1e3;t.setElapsedTime(j),t.setEtaRange(ui(j,S+1,F)),t.setLastFrameTime(j/(S+1))}if(i.cancelledRef.current){T.cancel(),t.setStatusText("Cancelled.");try{await(y==null?void 0:y.close())}catch{}}else{t.setStatusText("Finalizing video…");const S=await T.finish();if(S&&!y){const E=new Blob([S],{type:n.mime}),D=URL.createObjectURL(E),z=document.createElement("a");z.href=D,z.download=b,z.click(),URL.revokeObjectURL(D)}t.setStatusText(i.finishEarlyRef.current?"Finished early.":"Complete!")}}catch(S){console.error("[fluid-toy/RenderDialog] Export failed",S),alert(`Export failed.

Error: ${S instanceof Error?S.message:String(S)}`),T.cancel();try{await(y==null?void 0:y.close())}catch{}}finally{a.setForceFluidPaused(!1),a.params.paused=d,a.setRenderSize(p,h),a.resetAccumulation(),_e.scrub(M),f&&Te.getState().play(),t.setIsRendering(!1),t.setIsStopping(!1)}};Gt();w.getState().setSampleCap(64);Nt({enabled:!0,targetFps:45,minQuality:.4,interactionDownsample:.5,activityGraceMs:100,engageOnAccumOnly:!0});Vt();Ht();ai();si({controller:new aa(()=>oe.ref.current),slot:"left",order:30,id:"fluid-toy-bucket-render"});Jt({getCanvas:()=>document.querySelector("canvas")});ni(["julia.center_x","julia.center_y",{id:"julia.centerLow_x",hidden:!0},{id:"julia.centerLow_y",hidden:!0},"julia.zoom"]);Tt("julia.zoom");wt({zoom:"julia.zoom",pan:["julia.center_x","julia.center_y"],panLow:["julia.centerLow_x","julia.centerLow_y"]});qt();$t();Mt();Xt();Rt({hideShortcuts:!0});At.register({featureId:"julia",captureState:()=>{const r=w.getState();return{center:{...r.julia.center},zoom:r.julia.zoom}},applyState:r=>{w.getState().setJulia({center:r.center,zoom:r.zoom})}});Zt();Yt();Qt.registerHudHint({id:"fluid-toy-controls",slot:"bottom-left",order:0,component:la});ei.register({id:"fluid-toy.quality",slot:"bottom-left",order:10,component:na});va();pe.register("panel-views",ya);di({runner:Ma,defaults:{samplesPerFrame:32}});ra();const ct=document.getElementById("root");if(!ct)throw new Error("Could not find root element to mount to");const Sa=Ft.createRoot(ct);Sa.render(u.jsx(St.StrictMode,{children:u.jsx(ta,{})}));
