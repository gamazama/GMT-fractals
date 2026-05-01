var es=Object.defineProperty;var ts=(t,e,i)=>e in t?es(t,e,{enumerable:!0,configurable:!0,writable:!0,value:i}):t[e]=i;var x=(t,e,i)=>ts(t,typeof e!="symbol"?e+"":e,i);import{i as Li,f as ee,r as is,j as rs,m as X,u as F,a as Ue,F as ss,h as as,n as os,k as ns,l as ls,P as cs,V as pe,o as Dt,p as ai,A as us,q as ds,t as Ni,v as ps,c as hs,T as fs}from"./CollapsibleSection-Ra5nB2I4.js";import{r as k,j as d,R as ms}from"./three-fiber-GKfjny8F.js";import{a as ct,s as Qe,v as gs,u as Vi,n as bs,S as xs,E as ys,D as vs,b as Wi,P as ws,T as Ts,d as oi,e as Cs,G as Ss,f as ks,A as As,t as ni,w as We,x as li,r as Fs,o as Ms,i as Rs,g as Es,h as Ps,j as _s,q as Ds}from"./Undo-C_zhEBAt.js";import{V as Is,i as Bs,c as js}from"./Camera-CNiyA_U1.js";import{c as zs}from"./three-drei-2g7QvUdQ.js";import{R as Os,H as Us,a as Ls,b as Ns,c as Vs,i as Ws,h as Hs,d as Gs}from"./index-DcU7xCVn.js";import{a as Fe,b as re,u as Hi}from"./typedSlices-DkHqhJuQ.js";import{g as kt,i as Js,S as Xs,C as $s,t as Gi,a as M,r as S,b as de,s as qs,A as ci,l as Me,c as ui,d as Y,e as ut,f as Ji,h as Le,k as It,U as Xi,p as Ve,j as $i,P as dt,m as qi,n as Bt,T as jt,M as zt,o as ve,q as Zi,v as Ki,u as Zs,w as Qi,x as Yi,y as er,z as Ks,B as Qs,D as Ys,E as ea,F as di,G as ta,O as ia,H as Ne,V as Ee,I as Xe,N as tr,J as ra,K as sa,L as aa,Q as Ge,R as oa,W as na}from"./encode-BwHmry9X.js";import{r as la}from"./cameraKeyRegistry-Bvs9aeK3.js";import{r as ca}from"./renderPopupRegistry-DFd-6fyz.js";import{m as Ye}from"./ModulationEngine-BYzw2xBo.js";import"./three-DQWx7qFd.js";import"./pako-DwGzBETv.js";const ua=t=>t.charAt(0).toUpperCase()+t.slice(1).replace(/-/g," "),le=(t,e,i={})=>{const r=i.defaultIndex??0,s=t.map((n,l)=>{var c,u;return{label:((c=i.optionLabels)==null?void 0:c[n])??ua(n),value:l,hint:(u=i.optionHints)==null?void 0:u[n]}});return{config:{type:"float",default:r,label:e,options:s,...i.extra},fromIndex:n=>{const l=Math.floor(n??r);return l<0||l>=t.length||Number.isNaN(l)?t[r]:t[l]},values:t}},Ot=le(["julia","mandelbrot"],"Fractal Kind",{defaultIndex:1,optionHints:{julia:"Iterate z² + c with fixed c. Pixels are starting z values.",mandelbrot:"Iterate z² + c with z₀=0. Pixels are c values."}}),At=Ot.values,da=Ot.fromIndex,pa={id:"julia",name:"Fractal",category:"Fractal",tabConfig:{label:"Fractal"},customUI:[{componentId:"julia-c-picker",parentId:"juliaC",condition:{param:"kind",eq:0}}],params:{kind:Ot.config,juliaC:{type:"vec2",default:{x:-.36303304426511473,y:.16845183018751916},min:-2,max:2,step:.001,label:"Julia c",description:"Julia constant. Move me to reshape the entire fractal — and the forces it emits.",condition:{param:"kind",eq:0}},zoom:{type:"float",default:1.2904749020480561,min:1e-5,max:8,step:1e-4,scale:"log",label:"Zoom",description:"Zoom into the fractal. Scroll wheel + middle-click-drag on the canvas go much deeper (to 0.00001)."},center:{type:"vec2",default:{x:0,y:0},min:-2,max:2,step:.01,label:"Center",description:"Pan the fractal window."},centerLow:{type:"vec2",default:{x:0,y:0},min:-1,max:1,step:1e-12,label:"Center (low bits)",description:"Internal — sub-f64 pan accumulator.",hidden:!0},maxIter:{type:"int",default:310,min:16,max:512,step:1,label:"Iter",description:"More iterations → sharper escape gradients → finer force detail."},power:{type:"float",default:2,min:2,max:8,step:1,label:"Power",description:"z-power in the iteration. 2 = classic z²+c; higher exponents make more lobes."}}},ha=(t,e,i)=>{var n,l;const r=e.juliaC.x,s=e.juliaC.y,a=i["julia.juliaC_x"]??r,o=i["julia.juliaC_y"]??s;t.setParams({kind:da(e.kind),juliaC:[a,o],maxIter:e.maxIter,power:e.power,center:[e.center.x,e.center.y],centerLow:[((n=e.centerLow)==null?void 0:n.x)??0,((l=e.centerLow)==null?void 0:l.y)??0],zoom:e.zoom})},fa=(t,e,i)=>{const r=i["julia.juliaC_x"]??e.juliaC.x,s=i["julia.juliaC_y"]??e.juliaC.y;t.setParams({juliaC:[r,s]})},ma={id:"deepZoom",name:"Deep Zoom",category:"Fractal",tabConfig:{label:"Deep Zoom"},params:{enabled:{type:"boolean",default:!1,label:"Enable deep zoom",description:"Master toggle. Switches the iteration kernel to perturbation + LA, unlocking zoom past 1e-5 (eventually past 1e-300). Off by default — costs nothing when off."},useLA:{type:"boolean",default:!0,label:"Use Linear Approximation",condition:{param:"enabled",bool:!0},description:"Skip iterations via the LA stage table. 10–100× faster at depth. Off = pure perturbation (slow, but useful for sanity-checking LA output)."},useAT:{type:"boolean",default:!0,label:"Use AT front-load",condition:{param:"enabled",bool:!0},description:"Fast-forward the front of the orbit via Approximation Terms (a single z²+c loop in plain f32). Free perf when applicable. No effect when LA is off."},maxRefIter:{type:"int",default:5e4,min:5e3,max:5e5,step:1e3,label:"Reference orbit length",condition:{param:"enabled",bool:!0},description:"Maximum iterations the high-precision reference orbit runs to. Higher = supports deeper zooms but costs CPU at build time and GPU memory at runtime. Auto-suggested per zoom depth in later phases."},deepMaxIter:{type:"int",default:2e3,min:200,max:5e4,step:100,label:"Iter (deep)",condition:{param:"enabled",bool:!0},description:"Maximum iterations per pixel when deep zoom is on. Overrides the Fractal-tab Iter slider while deep is enabled. Without LA every iteration costs the full HDR step — push gently until phase 6 (LA runtime) lands."},showStats:{type:"boolean",default:!1,label:"Show stats",condition:{param:"enabled",bool:!0},description:"Overlay reference-orbit length, LA stage count, table size, and build time. Diagnostic."},disableFluid:{type:"boolean",default:!1,label:"Disable fluid sim (debug)",condition:{param:"enabled",bool:!0},description:"Skip every fluid pass (motion, advect, pressure, dye decay) so render time reflects the fractal kernel only. Use to isolate deep-zoom perf from fluid sim cost."}}},ga=(t,e,i)=>{e.enabled?(t.setParams({deepZoomEnabled:!0,maxIter:e.deepMaxIter}),t.setForceFluidPaused(e.disableFluid)):(t.setParams({deepZoomEnabled:!1,maxIter:i.maxIter}),t.deepZoom.clearReferenceOrbit(),t.deepZoom.clearLATable(),t.deepZoom.setLAEnabled(!1),t.deepZoom.clearAT(),t.setForceFluidPaused(!1))},Ut=le(["gradient","curl","iterate","c-track","hue"],"Operator",{optionLabels:{iterate:"Direct","c-track":"Temporal Δ",gradient:"Gradient",curl:"Curl",hue:"Hue"},optionHints:{gradient:"Push along ∇S — fluid flows from low to high source.",curl:"Swirl along level sets. Divergence-free.",iterate:"Push along ∇S with magnitude ∝ S itself.","c-track":"React to frame-to-frame change in S.",hue:"Palette colour IS the velocity field. Ignores Source."}}),ba=Ut.values,xa=Ut.fromIndex,Lt=le(["smoothPot","de","stripe","paletteLuma","mask"],"Source",{optionLabels:{smoothPot:"Smooth potential",de:"Distance estimate",stripe:"Stripe average",paletteLuma:"Palette luminance",mask:"Collision mask"},optionHints:{smoothPot:"Classic outside-the-set gradient.",de:"Smooth across the set boundary.",stripe:"Aesthetic banded flow.",paletteLuma:"Tracks whatever colour-mapping mode is active.",mask:"Drive flow toward / away from collision walls."}}),ya=Lt.values,va=Lt.fromIndex,wa={id:"coupling",name:"Coupling",category:"Simulation",tabConfig:{label:"Coupling"},params:{forceMode:Ut.config,forceSource:Lt.config,forceGain:{type:"float",default:-1200,min:-2e3,max:2e3,step:.1,label:"Force gain",description:"Multiplier on the fractal-derived force. How loudly the fractal shouts at the fluid. Negative inverts the force direction."},interiorDamp:{type:"float",default:.59,min:0,max:1,step:.01,label:"Interior damp",description:"How much to suppress force inside the set. 1 = still lake in the interior, 0 = full bleed."},forceCap:{type:"float",default:40,min:1,max:40,step:.5,label:"Force cap",description:"Per-pixel cap on the fractal force magnitude."},edgeMargin:{type:"float",default:.04,min:0,max:.25,step:.005,label:"Edge margin",description:'Fades force / dye injection near the canvas edges. Fixes "gushing from the borders" under fast c-changes.'}}};function Nt(t,e){const i=e,r={current:e},s=new Set;let a=0;const o=h=>(s.add(h),()=>{s.delete(h)}),n=()=>{a++,s.forEach(h=>h())};return{name:t,ref:r,useSnapshot:()=>(k.useSyncExternalStore(o,()=>a,()=>a),r.current),subscribe:o,notify:n,reset:()=>{r.current=i,n()}}}const et=Math.PI*2,pt=(t,e,i)=>(i<0&&(i+=1),i>1&&(i-=1),i<1/6?t+(e-t)*6*i:i<1/2?e:i<2/3?t+(e-t)*(2/3-i)*6:t),ir=(t,e,i)=>{if(e===0)return[i,i,i];const r=i<.5?i*(1+e):i+e-i*e,s=2*i-r;return[pt(s,r,t+1/3),pt(s,r,t),pt(s,r,t-1/3)]},Ta=(t,e,i)=>{const r=Math.max(t,e,i),s=Math.min(t,e,i),a=(r+s)/2;if(r===s)return[0,0,a];const o=r-s,n=a>.5?o/(2-r-s):o/(r+s);let l;return r===t?l=(e-i)/o+(e<i?6:0):r===e?l=(i-t)/o+2:l=(t-e)/o+4,[l/6,n,a]},Ca=(t,e)=>{if(e<=0)return t;const[i,r,s]=Ta(t[0],t[1],t[2]),a=(i+(Math.random()-.5)*e+1)%1;return ir(a,r,s)},Sa=(t,e)=>{if(!t||t.length<4)return[1,1,1];const i=(e%1+1)%1,r=t.length/4,s=Math.min(r-1,Math.floor(i*r))*4;return[t[s]/255,t[s+1]/255,t[s+2]/255]},rr=t=>{let e;switch(t.mode){case"solid":e=[t.solidColor[0],t.solidColor[1],t.solidColor[2]];break;case"gradient":e=Sa(t.gradientLut,(t.u+t.v)*.5);break;case"velocity":{const i=Math.min(1,Math.hypot(t.vx,t.vy)*.2),r=(Math.atan2(t.vy,t.vx)/et+1)%1;e=ir(r,.9,.35+.3*i);break}case"rainbow":default:{const i=t.rainbowPhase;e=[.5+.5*Math.cos(et*i),.5+.5*Math.cos(et*(i+.33)),.5+.5*Math.cos(et*(i+.67))];break}}return Ca(e,t.jitter)},Ft=300,ka=(t,e)=>{if(t.length>=Ft)return;const r=Math.atan2(e.dirY,e.dirX)+(Math.random()-.5)*2*e.particleSpread*Math.PI,s=e.particleVelocity*(.4+Math.random()*.6),a=e.brushSize*.35;t.push({x:e.u+(Math.random()-.5)*a,y:e.v+(Math.random()-.5)*a,vx:Math.cos(r)*s,vy:Math.sin(r)*s,life:e.particleLifetime,lifeMax:e.particleLifetime,color:[e.color[0],e.color[1],e.color[2]],size:e.brushSize*e.particleSizeScale*(.85+Math.random()*.3)})},Aa=(t,e,i,r)=>{const s=2*(t*i+e*r);return[t-s*i,e-s*r]},Fa=.5,Ma=(t,e)=>{const i=Math.exp(-e.particleDrag*e.dtSec),r=e.restitution??.55,s=.01;let a=0;for(let o=t.length-1;o>=0;o--){const n=t[o];n.vx*=i,n.vy*=i,n.vy+=e.particleGravity*e.dtSec;const l=n.x,c=n.y;if(n.x+=n.vx*e.dtSec,n.y+=n.vy*e.dtSec,n.life-=e.dtSec,e.sampleMask&&e.sampleMask(n.x,n.y)>=Fa){let u=e.sampleMask(n.x+s,n.y)-e.sampleMask(n.x-s,n.y),h=e.sampleMask(n.x,n.y+s)-e.sampleMask(n.x,n.y-s),p=Math.hypot(u,h);if(p<=1e-6){const f=s*3;u=e.sampleMask(n.x+f,n.y)-e.sampleMask(n.x-f,n.y),h=e.sampleMask(n.x,n.y+f)-e.sampleMask(n.x,n.y-f),p=Math.hypot(u,h)}let m,b;if(p>1e-6)m=-u/p,b=-h/p;else{const f=Math.hypot(n.vx,n.vy);f>1e-6?(m=-n.vx/f,b=-n.vy/f):(m=1,b=0)}[n.vx,n.vy]=Aa(n.vx,n.vy,m,b),n.vx*=r,n.vy*=r,n.x=l+m*s,n.y=c+b*s}(n.life<=0||n.x<-.2||n.x>1.2||n.y<-.2||n.y>1.2)&&(t.splice(o,1),a++)}return a},Ra=()=>({particles:[],rainbowPhase:0,distSinceSplat:0,spawnAcc:0}),Ea=(t,e)=>{t.rainbowPhase=e.wallClockMs*.001%1;const i=e.params;if(e.dragging&&i.particleEmitter&&e.cursorUv){t.spawnAcc+=e.dtSec*i.particleRate;const r=e.cursorVelUv??{vx:0,vy:0},s=Math.hypot(r.vx,r.vy),a=s<=1e-4;for(;t.spawnAcc>=1&&t.particles.length<Ft;){t.spawnAcc-=1;let o,n;if(a){const c=Math.random()*Math.PI*2;o=Math.cos(c),n=Math.sin(c)}else o=r.vx/s,n=r.vy/s;const l=rr({mode:i.colorMode,solidColor:i.solidColor,gradientLut:i.gradientLut,rainbowPhase:t.rainbowPhase,u:e.cursorUv.u,v:e.cursorUv.v,vx:r.vx,vy:r.vy,jitter:i.jitter});ka(t.particles,{u:e.cursorUv.u,v:e.cursorUv.v,dirX:o,dirY:n,color:l,brushSize:i.size,particleVelocity:i.particleVelocity,particleSpread:i.particleSpread,particleLifetime:i.particleLifetime,particleSizeScale:i.particleSizeScale})}t.particles.length>=Ft&&(t.spawnAcc=0)}if(t.particles.length>0){Ma(t.particles,{dtSec:e.dtSec,particleGravity:i.particleGravity,particleDrag:i.particleDrag,sampleMask:(r,s)=>e.engine.sampleMask(r,s)});for(const r of t.particles){const s=Math.max(0,r.life/r.lifeMax);e.engine.brush(r.x,r.y,r.vx*i.flow,r.vy*i.flow,r.color,r.size,i.hardness,i.strength*s,i.mode)}}},Pa=(t,e)=>{const i=e.params;return i.particleEmitter||t.distSinceSplat<Math.max(1e-5,i.spacing)?!1:(t.distSinceSplat=0,sr(t,e),!0)},_a=(t,e)=>{e.params.particleEmitter||(sr(t,e),t.distSinceSplat=0)},sr=(t,e)=>{t.rainbowPhase=e.wallClockMs*.001%1;const i=e.params,r=rr({mode:i.colorMode,solidColor:i.solidColor,gradientLut:i.gradientLut,rainbowPhase:t.rainbowPhase,u:e.u,v:e.v,vx:e.dvx,vy:e.dvy,jitter:i.jitter});e.engine.brush(e.u,e.v,e.dvx*i.flow,e.dvy*i.flow,r,i.size,i.hardness,i.strength,i.mode)},Da=t=>{t.distSinceSplat=1/0,t.spawnAcc=0},$e=Nt("fluid-toy.engine",null),Pe=Nt("fluid-toy.brush",{runtime:Ra(),gradientLut:null}),Re=Nt("fluid-toy.cursor",{dragging:!1,uv:null,velUv:null}),Ia={colorSpace:"srgb",blendSpace:"oklab",stops:[{id:"0",position:0,color:"#000000",bias:.5,interpolation:"linear"},{id:"1",position:.15,color:"#1a0a00",bias:.5,interpolation:"linear"},{id:"2",position:.35,color:"#8b1a00",bias:.5,interpolation:"linear"},{id:"3",position:.6,color:"#ff6b00",bias:.5,interpolation:"linear"},{id:"4",position:.85,color:"#ffdd66",bias:.5,interpolation:"linear"},{id:"5",position:1,color:"#ffffff",bias:.5,interpolation:"linear"}]},Vt=le(["add","screen","max","over"],"Dye blend",{optionHints:{add:"Linear accumulate — bright strokes build up, can clip.",screen:"1−(1−d)(1−i). Glowy, never exceeds 1.",max:"Hold the brightest. Vivid strokes survive over faded.",over:"Alpha-composite: new dye stamps cleanly over old."}}),Ba=Vt.values,ja=Vt.fromIndex,Wt=le(["linear","perceptual","vivid"],"Colour space",{optionHints:{linear:"RGB multiply — fades to black through grey.",perceptual:"OKLab L-decay — hue + chroma stable while dimming.",vivid:"OKLab + chroma boost — colours stay punchy near black."}}),za=Wt.values,Oa=Wt.fromIndex,Ht=le(["iterations","angle","magnitude","decomposition","bands","orbit-point","orbit-circle","orbit-cross","orbit-line","stripe","distance","derivative","potential","trap-iter"],"Color mapping",{optionLabels:{decomposition:"Decomp","orbit-point":"Trap · Point","orbit-circle":"Trap · Circle","orbit-cross":"Trap · Cross","orbit-line":"Trap · Line","trap-iter":"Trap Iteration",distance:"Distance Estimate",potential:"Continuous Potential",derivative:"Derivative (log|dz|)"},optionHints:{iterations:"Smooth escape iter — classic Mandelbrot/Julia colouring.",angle:"Argument of final z. Spirals + radial fans.",magnitude:"Distance from origin at escape. Radial intensity.",decomposition:"Sign of imag(z) — black/white binary split.",bands:"Hard step function on iter — sharp colour bands.","orbit-point":"Closest approach to a point trap (use Trap shape).","orbit-circle":"Closest approach to a circle trap.","orbit-cross":"Closest approach to an axis-cross trap.","orbit-line":"Signed distance to a line trap.",stripe:"Härkönen sin-stripe average. Smooth banded swirls.",distance:"Hubbard distance estimate. Crisp, edge-aware.",derivative:"log|dz| — highlights chaotic fast-stretching regions.",potential:"Böttcher potential. Like iter but C¹ smooth.","trap-iter":"Iteration at which the trap minimum was reached."}}),Ua=Ht.values,La=Ht.fromIndex,Na=5,pi=6,Va=7,hi=8,Wa=9,Ha=13,Ga={id:"palette",name:"Palette",category:"Look",tabConfig:{label:"Palette"},params:{gradient:{type:"gradient",default:Ia,label:"Palette",description:"Colors both the fractal AND the dye injected into the fluid. In Hue-mode (Coupling), this IS the vector field."},colorMapping:{...Ht.config,description:"How the iteration-space scalar becomes a t-value into the gradient. Each mode exposes its own extra controls below."},gradientRepeat:{type:"float",default:1,min:.1,max:8,step:.01,label:"Repetition",description:"Tiles the gradient across the mapped axis. 1 = one sweep, 3 = three bands."},gradientPhase:{type:"float",default:0,min:0,max:1,step:.005,label:"Phase",description:"Phase shift — rotates the colors without changing their layout."},colorIter:{type:"int",default:310,min:1,max:1024,step:1,label:"Color iter",description:"Iterations used for the coloring accumulators (orbit trap, stripe, DE). Separate from escape-test maxIter — reduce for fresher colours."},trapCenter:{type:"vec2",default:{x:0,y:0},min:-2,max:2,step:.01,label:"Trap center",description:"Trap centre (complex coord). Move to pick which point in the orbit to trap against.",condition:{or:[{param:"colorMapping",eq:Na},{param:"colorMapping",eq:pi},{param:"colorMapping",eq:Va},{param:"colorMapping",eq:Ha}]}},trapRadius:{type:"float",default:1,min:.01,max:4,step:.01,label:"Trap radius",condition:{param:"colorMapping",eq:pi},description:"Circle radius for the trap. Orbit pixels are coloured by how close they approach this ring."},trapNormal:{type:"vec2",default:{x:1,y:0},min:-1,max:1,step:.01,label:"Trap normal",condition:{param:"colorMapping",eq:hi},description:"Line trap: z lies on dot(z, normal) = offset. Normal should be unit-length."},trapOffset:{type:"float",default:0,min:-2,max:2,step:.01,label:"Trap offset",condition:{param:"colorMapping",eq:hi},description:"Line-trap offset (scalar position along the normal direction)."},stripeFreq:{type:"float",default:4,min:1,max:16,step:.1,label:"Stripe freq",condition:{param:"colorMapping",eq:Wa},description:"Stripe frequency — k in ½ + ½·sin(k·arg z). Higher = more stripes per iteration."},interiorColor:{type:"vec3",default:{x:.02,y:.02,z:.04},min:0,max:1,step:.001,label:"Interior color",description:"Colour for bounded points (pixels that never escape the iteration)."},escapeR:{type:"float",default:32,min:2,max:1024,step:.1,label:"Escape R",scale:"log",hidden:!0}}},Ja=(t,e)=>{const i=e.trapNormal.x,r=e.trapNormal.y,s=Math.hypot(i,r),a=s>1e-6?[i/s,r/s]:[1,0],o=e.interiorColor;if(t.setParams({colorMapping:La(e.colorMapping),colorIter:e.colorIter,escapeR:e.escapeR,interiorColor:[o.x,o.y,o.z],trapCenter:[e.trapCenter.x,e.trapCenter.y],trapRadius:e.trapRadius,trapNormal:a,trapOffset:e.trapOffset,stripeFreq:e.stripeFreq,gradientRepeat:e.gradientRepeat,gradientPhase:e.gradientPhase}),e.gradient){const n=Li(e.gradient);t.setGradientBuffer(n),Pe.ref.current.gradientLut=n}},Xa={colorSpace:"srgb",blendSpace:"rgb",stops:[{id:"0",position:0,color:"#000000",bias:.5,interpolation:"linear"},{id:"1",position:1,color:"#000000",bias:.5,interpolation:"linear"}]},$a={id:"collision",name:"Collision",category:"Simulation",tabConfig:{label:"Collision"},params:{enabled:{type:"boolean",default:!1,label:"Collision walls",description:"Paints solid walls the fluid bounces off, sculpted by the gradient below. Same t-axis mapping as the main palette — edit stops to black = fluid, white = wall."},gradient:{type:"gradient",default:Xa,label:"Collision pattern",condition:{param:"enabled",bool:!0},description:"B&W gradient defining where walls sit along the iteration-space t-axis."},repeat:{type:"float",default:1,min:.1,max:8,step:.01,label:"Collision repeat",condition:{param:"enabled",bool:!0},description:"Tile the collision pattern along t — independent of the dye gradient repeat."},phase:{type:"float",default:0,min:0,max:1,step:.001,label:"Collision phase",condition:{param:"enabled",bool:!0},description:"Phase-shift the collision pattern so walls land where the dye doesn't."},preview:{type:"boolean",default:!1,label:"Preview walls on canvas",condition:{param:"enabled",bool:!0},description:"Overlays diagonal cyan hatching on solid cells so you can see the wall shape while tuning the gradient."}}},qa=(t,e)=>{if(t.setParams({collisionEnabled:e.enabled,collisionPreview:e.preview,collisionRepeat:e.repeat,collisionPhase:e.phase}),e.gradient){const i=Li(e.gradient);t.setCollisionGradientBuffer(i)}},Za={id:"fluidSim",name:"Fluid",category:"Simulation",tabConfig:{label:"Fluid"},params:{vorticity:{type:"float",default:22.1,min:0,max:50,step:.1,label:"Vorticity",description:"Amplifies existing curl — keeps fractal-induced swirls from smearing away."},vorticityScale:{type:"float",default:1,min:.5,max:8,step:.1,label:"Vorticity scale",condition:{param:"vorticity",gt:0},description:"Spatial scale of the vorticity confinement (in sim texels). 1 = tight pixel-scale swirls, 4+ = larger organised vortices."},dissipation:{type:"float",default:.17,min:0,max:5,step:.01,label:"Velocity dissipation /s",description:"How fast velocity decays. High = fluid forgets the fractal quickly."},dyeInject:{type:"float",default:1.5,min:0,max:3,step:.01,label:"Dye inject",description:"How much of the fractal's color bleeds into the fluid each frame."},dyeBlend:{...Vt.config,description:"How new dye mixes with what the fluid already carries. Gradient stop alpha acts as a per-colour injection mask."},pressureIters:{type:"int",default:50,min:4,max:60,step:1,label:"Pressure iters",description:"Jacobi iterations for incompressibility. More = stricter but slower."},dyeDecayMode:{...Wt.config,description:"How dye fades over time. Colour space controls whether it greys out (linear) or stays hue-stable (perceptual / vivid)."},dyeDissipation:{type:"float",default:1.03,min:0,max:5,step:.01,label:"Dye dissipation /s",description:"How fast dye fades. In linear mode this is a straight RGB multiply; in perceptual / vivid it's the OKLab luminance fade (chroma fades on its own schedule below)."},dyeChromaDecayHz:{type:"float",default:1.03,min:0,max:5,step:.01,label:"Chroma decay /s",condition:{param:"dyeDecayMode",neq:0},description:"Per-second fade on OKLab a/b (chroma). Lower than Dye dissipation → colour stays saturated longer than it stays bright."},dyeSaturationBoost:{type:"float",default:1,min:.5,max:1.1,step:.001,scale:"log",label:"Saturation boost",condition:{param:"dyeDecayMode",eq:2},description:"Per-frame chroma gain. 1 = neutral, <1 washes out, >1 pushes toward max saturation. Gamut-mapped in OKLab so it pegs at the saturation ceiling rather than hue-shifting to white."},timeScale:{type:"float",default:1,min:0,max:4,step:.01,label:"Sim speed",description:"Wall-clock dt multiplier on the sim. 0.5 = slow-mo, 2 = double speed. 0 freezes the fluid (Pause is the cleaner way for hard-stop)."},paused:{type:"boolean",default:!1,label:"Pause sim",description:"Freeze the fluid state. Splats and param changes still land; they just don't integrate forward."}}},Ka=(t,e,i)=>{t.setParams({vorticity:e.vorticity,vorticityScale:e.vorticityScale,pressureIters:e.pressureIters,dissipation:e.dissipation,paused:e.paused,timeScale:e.timeScale,dyeInject:e.dyeInject,dyeBlend:ja(e.dyeBlend),dyeDecayMode:Oa(e.dyeDecayMode),dyeDissipation:e.dyeDissipation,dyeChromaDecayHz:e.dyeChromaDecayHz,dyeSaturationBoost:e.dyeSaturationBoost,forceMode:xa(i.forceMode),forceSource:va(i.forceSource),forceGain:i.forceGain,interiorDamp:i.interiorDamp,forceCap:i.forceCap,edgeMargin:i.edgeMargin})},Qa={id:"presets",name:"Presets",category:"Library",tabConfig:{label:"Presets"},customUI:[{componentId:"preset-grid"}],params:{_anchor:{type:"float",default:0,min:0,max:1,step:1,label:"",hidden:!0}}},fi=(t,e,i,r,s)=>({id:t,target:`julia.juliaC_${e}`,shape:"Sine",period:i,phase:s,amplitude:r,baseValue:0,smoothing:0,enabled:!0}),ht=(t,e)=>{const i=1/Math.max(.001,e);return[fi("preset.orbit.juliaC.x","x",i,t,0),fi("preset.orbit.juliaC.y","y",i,t,.25)]},he=t=>t.map(([e,i],r)=>({id:`s${r}`,position:e,color:i,bias:.5,interpolation:"linear"})),Ya=[{id:"bench-julia-only",name:"Bench (Julia only)",desc:"Isolation preset for performance benchmarking. All post-FX, fluid coupling, dye, collision, and palette tricks are off — only the raw Julia/Mandelbrot fractal layer renders. Pair with the Disable-fluid-sim toggle on the Deep Zoom panel and accumulation off (topbar) for a clean GPU-time read.",params:{juliaC:[-.36303304426511473,.16845183018751916],center:[-.8139175130270945,-.054649908357858296],zoom:1.2904749020480561,maxIter:310,power:2,kind:"mandelbrot",forceMode:"gradient",forceSource:"smoothPot",forceGain:0,interiorDamp:1,dissipation:0,dyeDissipation:0,dyeInject:0,vorticity:0,vorticityScale:1,pressureIters:1,show:"julia",juliaMix:1,dyeMix:0,velocityViz:0,gradientRepeat:.1,gradientPhase:0,colorMapping:"iterations",colorIter:310,stripeFreq:4,dyeBlend:"max",dyeDecayMode:"linear",dyeChromaDecayHz:0,dyeSaturationBoost:1,toneMapping:"none",exposure:1,vibrance:1,bloomAmount:0,bloomThreshold:1,aberration:0,refraction:0,refractSmooth:1,refractRoughness:0,caustics:0,interiorColor:[0,0,0],edgeMargin:0,forceCap:1,collisionEnabled:!1,paused:!0},gradient:{stops:he([[0,"#000000"],[1,"#FFFFFF"]]),colorSpace:"linear",blendSpace:"rgb"}},{id:"coral-gyre",name:"Coral Gyre",desc:"Orbit-point colouring on a negative curl — teal interior feeds a coral halo, with filmic bloom + aberration.",params:{juliaC:[-.8173594132029339,.15279058679706603],center:[0,0],zoom:1.5,maxIter:182,power:2,kind:"julia",forceMode:"curl",forceSource:"paletteLuma",forceGain:-760,interiorDamp:.9,dissipation:.1,dyeDissipation:.63,dyeInject:2.28,vorticity:25.9,vorticityScale:4.2,pressureIters:30,show:"composite",juliaMix:.55,dyeMix:1,velocityViz:0,gradientRepeat:.56,gradientPhase:.09,colorMapping:"orbit-point",colorIter:96,trapCenter:[1.17,0],dyeBlend:"add",dyeDecayMode:"vivid",dyeSaturationBoost:1.01,toneMapping:"filmic",exposure:2.295,vibrance:1.87,bloomAmount:1.35,bloomThreshold:1,aberration:1.12,refraction:0,refractSmooth:1,caustics:3.9,interiorColor:[.02,.04,.08],edgeMargin:.04,forceCap:12,collisionEnabled:!0},gradient:{stops:he([[0,"#000000"],[.202,"#05233d"],[.362,"#0f6884"],[.521,"#56c6c0"],[.681,"#f0fff1"],[.84,"#e7bd69"],[1,"#8a3f19"]]),colorSpace:"linear",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.513,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.573,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"}},{id:"ink-canyon",name:"Ink Canyon",desc:"Monochrome dye threading between twin collision walls — one at the near edge, one deep in the field.",params:{juliaC:[-.7763636363636364,.19684858842329547],center:[.019054061889010376,-.007321977964897804],zoom:1.2904749020480561,maxIter:310,power:2,kind:"julia",forceMode:"curl",forceSource:"smoothPot",forceGain:1200,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:5.9,pressureIters:50,show:"dye",juliaMix:.45,dyeMix:1,velocityViz:0,gradientRepeat:1,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",aberration:.27,refraction:0,caustics:0,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,collisionEnabled:!0},gradient:{stops:he([[0,"#000000"],[1,"#FFFFFF"]]),colorSpace:"linear",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.02,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.07,color:"#000000",bias:.5,interpolation:"step"},{id:"c3",position:.833,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c4",position:.883,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"}},{id:"plasma-vein",name:"Plasma Vein",desc:"Fractional power (1.5) with 7× repeated blue/red bands. Vivid chroma decay keeps the refracted dye electric.",params:{juliaC:[-.1764262149580809,.1951288073545453],center:[.21016359187729639,-.014585098813268887],zoom:.975889617512663,maxIter:310,power:1.5,kind:"julia",forceMode:"curl",forceSource:"paletteLuma",forceGain:1200,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:5.9,pressureIters:50,show:"dye",juliaMix:.7,dyeMix:1,velocityViz:0,gradientRepeat:7.43,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",dyeDecayMode:"vivid",toneMapping:"filmic",exposure:1.86,vibrance:1.645,aberration:.5,refraction:.006,refractSmooth:11.8,caustics:0,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40},gradient:{stops:he([[0,"#000000"],[.143,"#001830"],[.286,"#004060"],[.429,"#00BFFF"],[.571,"#006080"],[.714,"#600000"],[.857,"#DC0000"],[1,"#FF4040"]]),colorSpace:"linear",blendSpace:"rgb"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.536,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.586,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"}},{id:"crater-drift",name:"Crater Drift",desc:"Mandelbrot under inward curl, inferno-magenta palette. Slow auto-orbit carves craters through the bloom.",params:{juliaC:[.56053050672182,.468459152016546],center:[-.9313160617349564,-.15288948147190096],zoom:1.1807159194396142,maxIter:604,power:2,kind:"mandelbrot",forceMode:"curl",forceSource:"smoothPot",forceGain:-535.6,interiorDamp:0,dissipation:.16,dyeDissipation:.05,dyeInject:3,vorticity:2.9,vorticityScale:1.2,pressureIters:48,show:"composite",juliaMix:0,dyeMix:1.01,velocityViz:0,gradientRepeat:.66,gradientPhase:0,colorMapping:"iterations",colorIter:263,trapCenter:[1.51,-1.37],dyeBlend:"max",dyeDecayMode:"perceptual",dyeChromaDecayHz:0,toneMapping:"filmic",exposure:20.63,vibrance:1.645,bloomAmount:.63,bloomThreshold:.76,aberration:.4,refraction:0,caustics:0,interiorColor:[.02,.02,.03],edgeMargin:.04,forceCap:38.5,collisionEnabled:!0},gradient:{stops:he([[.084,"#000004"],[.215,"#280B54"],[.346,"#65156E"],[.477,"#9F2A63"],[.607,"#D44842"],[.738,"#F52D15"],[.869,"#FA2727"],[1,"#FF7983"]]),colorSpace:"srgb",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.532,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.659,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"},animations:ht(.01,.05)},{id:"quartic-strata",name:"Quartic Strata",desc:"Power-4 Julia drifting on a subtle c-track. Strata of blue/red dye held by a near-edge wall.",params:{juliaC:[.7072727272727275,-.1398788174715911],center:[-.0013928986324417691,-.010035496866822907],zoom:.975889617512663,maxIter:310,power:4,kind:"julia",forceMode:"c-track",forceSource:"smoothPot",forceGain:1,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:1,pressureIters:50,show:"dye",juliaMix:.45,dyeMix:1,velocityViz:0,gradientRepeat:2,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",aberration:.27,refraction:.037,caustics:1,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,collisionEnabled:!0},gradient:{stops:he([[0,"#000000"],[.143,"#001830"],[.286,"#004060"],[.429,"#00BFFF"],[.571,"#006080"],[.714,"#600000"],[.857,"#DC0000"],[1,"#FF4040"]]),colorSpace:"linear",blendSpace:"rgb"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.113,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.163,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"},animations:ht(.01,.2)},{id:"sunset-bands",name:"Sunset Bands",desc:"Force-gradient mode with hard band colouring — sunset strata pushed inward at 1536 sim.",params:{juliaC:[-.16545454545454558,.6455757279829545],center:[-.1012543995130697,.03079433116134145],zoom:1.086757425434934,maxIter:175,power:2,kind:"julia",forceMode:"gradient",forceSource:"paletteLuma",forceGain:1500,interiorDamp:5.8,dissipation:.22,dyeDissipation:.5,dyeInject:.55,vorticity:0,pressureIters:30,show:"composite",juliaMix:.55,dyeMix:2,velocityViz:0,gradientRepeat:1.35,gradientPhase:.055,colorMapping:"bands",colorIter:175,dyeBlend:"over",aberration:.27,refraction:0,caustics:1,interiorColor:[.02,.02,.03],edgeMargin:.04,forceCap:12},gradient:{stops:he([[0,"#04001f"],[.167,"#1a1049"],[.333,"#4e2085"],[.5,"#b13a8a"],[.667,"#ff7657"],[.833,"#ffc569"],[1,"#fff9d0"]]),colorSpace:"linear",blendSpace:"oklab"}},{id:"verdant-pulse",name:"Verdant Pulse",desc:"Viridis-to-magenta orbit-circle ring, wide vorticity, slow auto-orbit — the set breathes green and pink.",params:{juliaC:[-.7,.27015],center:[-.15958346356258324,-.09244114001481094],zoom:1.3957783246444389,maxIter:160,power:2,kind:"julia",forceMode:"c-track",forceSource:"paletteLuma",forceGain:10,interiorDamp:.45,dissipation:.2,dyeDissipation:.17,dyeInject:.9,vorticity:16,vorticityScale:5.8,pressureIters:30,show:"composite",juliaMix:0,dyeMix:3.805,velocityViz:0,gradientRepeat:1,gradientPhase:.03,colorMapping:"orbit-circle",colorIter:94,dyeBlend:"over",dyeDecayMode:"perceptual",exposure:.35,vibrance:1.645,aberration:.27,refraction:.037,caustics:1,interiorColor:[.02,0,.04],edgeMargin:.04,forceCap:12,collisionEnabled:!0},gradient:{stops:he([[0,"#000000"],[.061,"#440154"],[.143,"#46327F"],[.286,"#365C8D"],[.429,"#277F8E"],[.571,"#1FA187"],[.714,"#4AC26D"],[.857,"#3ADA62"],[1,"#FD25B6"]]),colorSpace:"linear",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.037,color:"#000000",bias:.5,interpolation:"linear"},{id:"c2",position:.943,color:"#000000",bias:.5,interpolation:"step"},{id:"c3",position:1,color:"#626262",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"},animations:ht(.035,.02)}],Gt=le(["none","reinhard","agx","filmic"],"Tone mapping",{optionLabels:{agx:"AgX"},optionHints:{none:"Linear — clamp at 1.0. Crushes highlights.",reinhard:"c/(1+c). Smooth but desaturates highlights.",agx:"Sobotka AgX. Hue-stable, vibrant.",filmic:"Hable Uncharted-2 filmic. Cinematic s-curve."}}),eo=Gt.values,to=Gt.fromIndex,io={id:"postFx",name:"Post FX",category:"Look",tabConfig:{label:"Post-FX"},params:{bloomAmount:{type:"float",default:0,min:0,max:3,step:.01,label:"Bloom",description:"Bloom strength — wide soft glow on bright pixels. Core of the electric look."},bloomThreshold:{type:"float",default:1,min:0,max:3,step:.01,label:"Bloom threshold",condition:{param:"bloomAmount",gt:0},description:"Luminance threshold: pixels below this don't contribute to bloom. Lower = more of the image glows."},aberration:{type:"float",default:.27,min:0,max:3,step:.01,label:"Aberration",description:"Chromatic aberration keyed to local velocity — plasma fringing on fast-moving dye regions. Affects dye only; fractal stays sharp."},refraction:{type:"float",default:.037,min:0,max:.3,step:.001,label:"Refraction",description:"Screen-space refraction: dye's luminance acts as a height field — the fractal underneath warps like glass."},refractSmooth:{type:"float",default:3,min:1,max:12,step:.1,label:"Refract smooth",condition:{param:"refraction",gt:0},description:"Stencil width (in dye texels) for the refraction gradient. Higher = smoother distortion, less pixel jitter; 1 = raw single-pixel gradient."},refractRoughness:{type:"float",default:0,min:0,max:1,step:.01,label:"Refract roughness",condition:{param:"refraction",gt:0},description:"Frosted-glass scatter for the refracted fractal. 0 = crisp polished glass (single-tap). 1 = ~5px Vogel-disc blur — light scatters into a cone like real rough surfaces. Mask + walls blur in step so glass edges stay consistent."},caustics:{type:"float",default:1,min:0,max:25,step:.1,label:"Caustics",description:"Laplacian-of-dye highlight — simulates focused-light caustics where the liquid surface bends."},toneMapping:{...Gt.config,description:"How final colour gets compressed. None = maximally vivid (may clip). AgX = 2023 hue-stable roll-off (best for rich colours). Reinhard desaturates highlights."},exposure:{type:"float",default:1,min:.1,max:5,step:.01,label:"Exposure",description:"Multiplier on final colour BEFORE tone mapping. Crank up to make dim gradient stops punch."},vibrance:{type:"float",default:1.645,min:0,max:1,step:.01,label:"Vibrance",description:"Chroma-aware saturation — boosts dull pixels without posterising already-vivid ones."}}},ro=(t,e)=>{t.setParams({toneMapping:to(e.toneMapping),exposure:e.exposure,vibrance:e.vibrance,bloomAmount:e.bloomAmount,bloomThreshold:e.bloomThreshold,aberration:e.aberration,refraction:e.refraction,refractSmooth:e.refractSmooth,refractRoughness:e.refractRoughness,caustics:e.caustics})},Jt=le(["composite","julia","dye","velocity"],"Show",{optionLabels:{composite:"Mixed",julia:"Fractal"},optionHints:{composite:"Fractal + dye + velocity overlay (the full picture).",julia:"Just the fractal — no fluid layer.",dye:"Just the dye — no fractal underneath.",velocity:"Velocity field as colour. Diagnostic only."}}),so=Jt.values,ao=Jt.fromIndex,ft=0,oo={id:"composite",name:"Composite",category:"Look",tabConfig:{label:"Composite"},params:{show:{...Jt.config,description:"What you see. The simulation runs the same either way. Mixed = fractal + dye + optional velocity overlay. Fractal = pure fractal, fluid hidden. Dye = fluid dye only (what the fractal wrote). Velocity = per-pixel velocity as a hue wheel."},juliaMix:{type:"float",default:.4,min:0,max:2,step:.01,label:"Julia mix",condition:{param:"show",eq:ft},description:"How much fractal color shows through in Mixed view."},dyeMix:{type:"float",default:2,min:0,max:2,step:.01,label:"Dye mix",condition:{param:"show",eq:ft},description:"How much fluid dye shows through in Mixed view."},velocityViz:{type:"float",default:.02,min:0,max:2,step:.01,label:"Velocity viz",condition:{param:"show",eq:ft},description:"Overlay velocity-hue on top of the composite. Diagnostic."}}},no=(t,e)=>{t.setParams({show:ao(e.show),juliaMix:e.juliaMix,dyeMix:e.dyeMix,velocityViz:e.velocityViz})},Se=t=>{const e=ee.get(t);if(!e)return{};const i={};for(const[r,s]of Object.entries(e.params)){const a=s.default;a&&typeof a=="object"&&!Array.isArray(a)?i[r]={...a}:Array.isArray(a)?i[r]=[...a]:i[r]=a}return i},fe=(t,e)=>{if(typeof e!="string")return;const i=t.indexOf(e);return i>=0?i:void 0},tt=t=>t?{x:t[0],y:t[1]}:void 0,lo=t=>t?{x:t[0],y:t[1],z:t[2]}:void 0,co=t=>{const e=globalThis.__store;if(!e){console.warn("[applyRefPreset] store not ready — window.__store is undefined");return}const i=e.getState(),r=t.params,s={},a=fe(At,r.kind);a!==void 0&&(s.kind=a),r.juliaC&&(s.juliaC=tt(r.juliaC)),r.center&&(s.center=tt(r.center),s.centerLow={x:0,y:0}),r.zoom!==void 0&&(s.zoom=r.zoom),r.maxIter!==void 0&&(s.maxIter=r.maxIter),r.power!==void 0&&(s.power=r.power),i.setJulia({...Se("julia"),...s});const o={},n=fe(ba,r.forceMode);n!==void 0&&(o.forceMode=n);const l=fe(ya,r.forceSource);l!==void 0&&(o.forceSource=l),r.forceGain!==void 0&&(o.forceGain=r.forceGain),r.interiorDamp!==void 0&&(o.interiorDamp=r.interiorDamp),r.forceCap!==void 0&&(o.forceCap=r.forceCap),r.edgeMargin!==void 0&&(o.edgeMargin=r.edgeMargin),i.setCoupling({...Se("coupling"),...o}),typeof i.setAnimations=="function"&&i.setAnimations(t.animations??[]);const c={};r.vorticity!==void 0&&(c.vorticity=r.vorticity),r.vorticityScale!==void 0&&(c.vorticityScale=r.vorticityScale),r.dissipation!==void 0&&(c.dissipation=r.dissipation),r.pressureIters!==void 0&&(c.pressureIters=r.pressureIters),r.dyeInject!==void 0&&(c.dyeInject=r.dyeInject),r.dyeDissipation!==void 0&&(c.dyeDissipation=r.dyeDissipation),r.dyeChromaDecayHz!==void 0&&(c.dyeChromaDecayHz=r.dyeChromaDecayHz),r.dyeSaturationBoost!==void 0&&(c.dyeSaturationBoost=r.dyeSaturationBoost);const u=fe(za,r.dyeDecayMode);u!==void 0&&(c.dyeDecayMode=u);const h=fe(Ba,r.dyeBlend);h!==void 0&&(c.dyeBlend=h),i.setFluidSim({...Se("fluidSim"),...c});const p={},m=fe(Ua,r.colorMapping);m!==void 0&&(p.colorMapping=m),r.colorIter!==void 0&&(p.colorIter=r.colorIter),r.gradientRepeat!==void 0&&(p.gradientRepeat=r.gradientRepeat),r.gradientPhase!==void 0&&(p.gradientPhase=r.gradientPhase),r.trapCenter&&(p.trapCenter=tt(r.trapCenter)),r.trapRadius!==void 0&&(p.trapRadius=r.trapRadius),r.trapNormal&&(p.trapNormal=tt(r.trapNormal)),r.trapOffset!==void 0&&(p.trapOffset=r.trapOffset),r.stripeFreq!==void 0&&(p.stripeFreq=r.stripeFreq),r.interiorColor&&(p.interiorColor=lo(r.interiorColor)),t.gradient&&(p.gradient=t.gradient),i.setPalette({...Se("palette"),...p});const b={enabled:!!r.collisionEnabled};t.collisionGradient&&(b.gradient=t.collisionGradient),i.setCollision({...Se("collision"),...b});const f={},y=fe(eo,r.toneMapping);y!==void 0&&(f.toneMapping=y),r.exposure!==void 0&&(f.exposure=r.exposure),r.vibrance!==void 0&&(f.vibrance=r.vibrance),r.bloomAmount!==void 0&&(f.bloomAmount=r.bloomAmount),r.bloomThreshold!==void 0&&(f.bloomThreshold=r.bloomThreshold),r.aberration!==void 0&&(f.aberration=r.aberration),r.refraction!==void 0&&(f.refraction=r.refraction),r.refractSmooth!==void 0&&(f.refractSmooth=r.refractSmooth),r.caustics!==void 0&&(f.caustics=r.caustics),i.setPostFx({...Se("postFx"),...f});const C={},A=fe(so,r.show);A!==void 0&&(C.show=A),r.juliaMix!==void 0&&(C.juliaMix=r.juliaMix),r.dyeMix!==void 0&&(C.dyeMix=r.dyeMix),r.velocityViz!==void 0&&(C.velocityViz=r.velocityViz),i.setComposite({...Se("composite"),...C}),typeof i.setIsPaused=="function"&&i.setIsPaused(r.paused??!1),typeof i.setAccumulation=="function"&&i.setAccumulation(r.accumulation??!0)},uo=()=>d.jsxs("div",{className:"flex flex-col gap-3 py-2",children:[d.jsx("div",{className:"text-[10px] text-gray-500 leading-snug",children:"Each preset is a curated fractal ↔ fluid coupling. Applying one resets the grid and restores known params."}),d.jsx("div",{className:"grid grid-cols-2 gap-1",children:Ya.map(t=>d.jsx("button",{type:"button",title:t.desc,onClick:()=>{var e;co(t),(e=$e.ref.current)==null||e.resetFluid()},className:"px-2 py-1 text-[10px] rounded border bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08] hover:border-cyan-500/40 transition-colors text-left",children:t.name},t.id))})]}),ar=le(["paint","erase","stamp","smudge"],"Mode"),po=ar.fromIndex,or=le(["rainbow","solid","gradient","velocity"],"Colour"),ho=or.fromIndex,fo={id:"brush",name:"Brush",category:"Input",tabConfig:{label:"Brush"},params:{mode:{...ar.config,description:"What left-drag does on the canvas. Paint = dye + force; Erase subtracts dye; Stamp deposits dye only; Smudge pushes velocity without adding dye."},size:{type:"float",default:.15,min:.003,max:.4,step:.001,label:"Size (UV)",description:"Radius in UV units (0..1 across the canvas). B+drag the canvas to resize live."},hardness:{type:"float",default:0,min:0,max:1,step:.01,label:"Hardness",description:"0 = soft gaussian edge (airbrush). 1 = hard disc (stamp)."},strength:{type:"float",default:1,min:0,max:3,step:.01,label:"Strength",description:"Dye amount per splat. 0 = dry brush, 3 = saturated. Erase mode: how much dye each splat removes."},flow:{type:"float",default:50,min:0,max:200,step:.5,label:"Flow",condition:{or:[{param:"mode",eq:0},{param:"mode",eq:3}]},description:"How much of the pointer's velocity is injected into the force field. Low = delicate, 50 = paints, 200 = whip."},spacing:{type:"float",default:.005,min:0,max:.1,step:.001,label:"Spacing (UV)",condition:{param:"particleEmitter",bool:!1},description:"Minimum travel between splats along a drag. Low = smooth stroke, high = dotted trail."},colorMode:{...or.config,condition:{or:[{param:"mode",eq:0},{param:"mode",eq:2}]},description:"Where each splat gets its RGB. Gradient samples the palette; Solid uses the picker below; Rainbow cycles hue on its own clock."},solidColor:{type:"vec3",default:{x:1,y:1,z:1},min:0,max:1,step:.001,label:"Solid color",condition:{param:"colorMode",eq:1},description:"Explicit colour for Solid mode. Hue jitter still applies."},jitter:{type:"float",default:0,min:0,max:1,step:.01,label:"Hue jitter",condition:{and:[{param:"mode",neq:1},{param:"mode",neq:3}]},description:"Random hue wiggle per splat. 0 = exact colour, 1 = full hue wheel. Builds natural variation in long strokes. Stacks on rainbow/velocity mode too."},particleEmitter:{type:"boolean",default:!1,label:"Particle emitter",description:"Dragging spawns independent particles on their own layer. Each live particle flies with its own velocity / lifespan and acts as a mini brush — painting into the fluid with the selected mode at its own position."},particleRate:{type:"float",default:120,min:1,max:600,step:1,label:"Rate /s",condition:{param:"particleEmitter",bool:!0},description:"Particles emitted per second while dragging. Hard-capped at 300 live at once."},particleVelocity:{type:"float",default:.3,min:0,max:3,step:.01,label:"Velocity",condition:{param:"particleEmitter",bool:!0},description:"Initial speed in UV/sec. 0.3 = gentle spray, 2 = shotgun."},particleSpread:{type:"float",default:.35,min:0,max:1,step:.01,label:"Spread",condition:{param:"particleEmitter",bool:!0},description:"Angular spread around the drag direction. 0 = beam, 1 = full 360° burst."},particleGravity:{type:"float",default:0,min:-3,max:3,step:.01,label:"Gravity",condition:{param:"particleEmitter",bool:!0},description:"UV/sec² acceleration. Negative = falls down the canvas, positive = rises."},particleDrag:{type:"float",default:.6,min:0,max:4,step:.01,label:"Drag /s",condition:{param:"particleEmitter",bool:!0},description:"Air drag — 0 = ballistic (keeps speed), 2 = quickly slows, 4 = fast stop."},particleLifetime:{type:"float",default:1.2,min:.1,max:6,step:.05,label:"Lifetime",condition:{param:"particleEmitter",bool:!0},description:"Seconds before each particle is culled. Longer = more persistent streaks."},particleSizeScale:{type:"float",default:.35,min:.05,max:1.5,step:.01,label:"Size ×",condition:{param:"particleEmitter",bool:!0},description:"Per-particle stamp size as a fraction of the brush size. 0.35 = dabs a third of the brush."}}},mi=96,mo=(t,e)=>{const r=(e-Math.floor(e))*256,s=Math.floor(r)%256,a=(s+1)%256,o=r-Math.floor(r),n=t[s*4+0]*(1-o)+t[a*4+0]*o,l=t[s*4+1]*(1-o)+t[a*4+1]*o,c=t[s*4+2]*(1-o)+t[a*4+2]*o;return[n,l,c]},go=16,ke=new Map,gi=new WeakMap;let bo=0;const xo=t=>{const e=gi.get(t);if(e!==void 0)return e;const i=`lut${bo++}`;return gi.set(t,i),i},yo=(t,e,i,r,s,a,o,n,l)=>`${t}|${e}|${i}|${r}|${xo(s)}|${a}|${o}|${n[0]},${n[1]},${n[2]}|${l}`,vo=(t,e,i,r,s,a,o,n,l)=>{const c=new ImageData(t,t),u=c.data,h=Math.round(n[0]*255),p=Math.round(n[1]*255),m=Math.round(n[2]*255),b=Math.round(l),f=Math.abs(l-b)<.01&&b>=2&&b<=8;for(let y=0;y<t;y++){const C=i+(y/t*2-1)*r;for(let A=0;A<t;A++){const O=e+(A/t*2-1)*r;let E=0,v=0,T=0;for(;T<mi;T++){const j=E*E,z=v*v;if(j+z>16)break;let D,N;if(f){let I=E,R=v;for(let H=1;H<b;H++){const U=I*E-R*v;R=I*v+R*E,I=U}D=I,N=R}else{const I=Math.sqrt(j+z),R=Math.atan2(v,E),H=Math.pow(I,l),U=R*l;D=H*Math.cos(U),N=H*Math.sin(U)}E=D+O,v=N+C}const B=((t-1-y)*t+A)*4;if(T>=mi)u[B+0]=h,u[B+1]=p,u[B+2]=m;else{const D=(T+1-Math.log2(Math.max(1e-6,.5*Math.log2(E*E+v*v))))*.05*a+o,[N,I,R]=mo(s,D);u[B+0]=Math.round(N),u[B+1]=Math.round(I),u[B+2]=Math.round(R)}u[B+3]=255}}return c},wo=(t,e,i,r,s,a,o,n,l)=>{const c=yo(t,e,i,r,s,a,o,n,l),u=ke.get(c);if(u)return ke.delete(c),ke.set(c,u),u;const h=vo(t,e,i,r,s,a,o,n,l);for(ke.set(c,h);ke.size>go;){const p=ke.keys().next().value;if(p===void 0)break;ke.delete(p)}return h},To=(()=>{const t=new Uint8Array(1024);for(let e=0;e<256;e++)t[e*4]=t[e*4+1]=t[e*4+2]=e,t[e*4+3]=255;return t})(),Co=({cx:t,cy:e,onChange:i,halfExtent:r=1.6,centerX:s=-.5,centerY:a=0,size:o=220,gradientLut:n,gradientRepeat:l=1,gradientPhase:c=0,interiorColor:u=[.04,.04,.06],power:h=2})=>{const p=k.useRef(null),m=k.useRef(null),b=k.useRef(!1);k.useEffect(()=>{const C=p.current;if(!C)return;const A=C.getContext("2d");if(!A)return;C.width=o,C.height=o;const E=wo(o,s,a,r,n??To,l,c,u,h);m.current=E,A.putImageData(E,0,0),f()},[o,s,a,r,n,l,c,u[0],u[1],u[2],h]);const f=k.useCallback(()=>{const C=p.current;if(!C||!m.current)return;const A=C.getContext("2d");if(!A)return;A.putImageData(m.current,0,0);const O=(t-s)/r*.5+.5,E=(e-a)/r*.5+.5,v=O*o,T=(1-E)*o;A.strokeStyle="#fff",A.lineWidth=1,A.beginPath(),A.moveTo(v-8,T),A.lineTo(v-2,T),A.moveTo(v+2,T),A.lineTo(v+8,T),A.moveTo(v,T-8),A.lineTo(v,T-2),A.moveTo(v,T+2),A.lineTo(v,T+8),A.stroke(),A.strokeStyle="rgba(0,255,200,0.9)",A.beginPath(),A.arc(v,T,4,0,2*Math.PI),A.stroke()},[t,e,s,a,r,o]);k.useEffect(()=>{f()},[f]);const y=C=>{const A=p.current;if(!A)return;const O=A.getBoundingClientRect(),E=(C.clientX-O.left)/O.width,v=1-(C.clientY-O.top)/O.height,T=s+(E*2-1)*r,B=a+(v*2-1)*r;i(T,B)};return d.jsxs("div",{className:"flex flex-col gap-1",children:[d.jsx("div",{className:"text-[10px] text-gray-400 uppercase tracking-wide",children:"Pick Julia c"}),d.jsx("canvas",{ref:p,className:"rounded border border-white/10 cursor-crosshair",style:{width:o,height:o,imageRendering:"pixelated"},onPointerDown:C=>{b.current=!0,C.target.setPointerCapture(C.pointerId),y(C)},onPointerMove:C=>{b.current&&y(C)},onPointerUp:C=>{b.current=!1;try{C.target.releasePointerCapture(C.pointerId)}catch{}}}),d.jsxs("div",{className:"text-[10px] font-mono text-gray-500",children:["c = (",t.toFixed(4),", ",e.toFixed(4),")"]})]})},So=({sliceState:t,actions:e})=>{const i=t.juliaC??{x:-.36303304426511473,y:.16845183018751916},r=t.power??2,s=k.useMemo(()=>{},[]);return d.jsx(Co,{cx:i.x,cy:i.y,power:r,gradientLut:s,onChange:(a,o)=>e.setJulia({juliaC:{x:a,y:o}})})};ct.register("julia-c-picker",So);ct.register("preset-grid",uo);ee.register(pa);ee.register(ma);ee.register(wa);ee.register(Ga);ee.register($a);ee.register(Za);ee.register(io);ee.register(oo);ee.register(fo);ee.register(Qa);is({version:1,id:"fluid-toy.tab-parity-restructure",apply:t=>(t!=null&&t.features&&(rs(t,"dye","palette"),X(t,"palette.collisionEnabled","collision.enabled"),X(t,"palette.collisionPreview","collision.preview"),X(t,"palette.collisionGradient","collision.gradient"),X(t,"palette.collisionRepeat","collision.repeat"),X(t,"palette.collisionPhase","collision.phase"),X(t,"palette.dyeMix","composite.dyeMix"),X(t,"palette.dyeInject","fluidSim.dyeInject"),X(t,"palette.dyeDissipation","fluidSim.dyeDissipation"),X(t,"palette.dyeDecayMode","fluidSim.dyeDecayMode"),X(t,"palette.dyeChromaDecayHz","fluidSim.dyeChromaDecayHz"),X(t,"palette.dyeSaturationBoost","fluidSim.dyeSaturationBoost"),X(t,"fluidSim.forceMode","coupling.forceMode"),X(t,"fluidSim.forceGain","coupling.forceGain"),X(t,"fluidSim.interiorDamp","coupling.interiorDamp"),X(t,"fluidSim.forceCap","coupling.forceCap"),X(t,"fluidSim.edgeMargin","coupling.edgeMargin"),X(t,"orbit.enabled","coupling.orbitEnabled"),X(t,"orbit.radius","coupling.orbitRadius"),X(t,"orbit.speed","coupling.orbitSpeed"),t.features.orbit&&Object.keys(t.features.orbit).length===0&&delete t.features.orbit,X(t,"sceneCamera.center","julia.center"),X(t,"sceneCamera.zoom","julia.zoom"),t.features.sceneCamera&&Object.keys(t.features.sceneCamera).length===0&&delete t.features.sceneCamera),t)});const ko=()=>({mode:"idle",pointerId:-1,lastX:0,lastY:0,lastT:0,startX:0,startY:0,startCx:0,startCy:0,startCxLow:0,startCyLow:0,startZoom:1,zoomAnchorX:0,zoomAnchorY:0,zoomAnchorXLow:0,zoomAnchorYLow:0,zoomAnchorU:.5,zoomAnchorV:.5,rightDragged:!1,startBrushSize:.15}),Ao=1e-5,nr=8,Fo=1e-300,Mo=5,Ro=.002,Eo=.005,Po=5,_o=.2,mt=256,Do=.5,xe={b:!1,c:!1},Io=()=>{const t=document.activeElement;if(!t)return!1;const e=t.tagName;return e==="INPUT"||e==="TEXTAREA"||t.isContentEditable},Bo=()=>{k.useEffect(()=>{const t=r=>{Io()||(r.code==="KeyB"&&(xe.b=!0),r.code==="KeyC"&&(xe.c=!0))},e=r=>{r.code==="KeyB"&&(xe.b=!1),r.code==="KeyC"&&(xe.c=!1)},i=()=>{xe.b=!1,xe.c=!1};return window.addEventListener("keydown",t),window.addEventListener("keyup",e),window.addEventListener("blur",i),()=>{window.removeEventListener("keydown",t),window.removeEventListener("keyup",e),window.removeEventListener("blur",i)}},[])},Ze=(t,e)=>t?Po:e?_o:1,jo=(t,e,i)=>{const r=F(s=>s.openContextMenu);k.useEffect(()=>{const s=t.current;if(!s)return;const a=o=>{var m,b,f,y,C;o.preventDefault();const n=i.current;if(!n)return;if(n.rightDragged){n.rightDragged=!1;return}const l=F.getState(),c=(m=l.julia)==null?void 0:m.juliaC,u=!!((b=l.coupling)!=null&&b.orbitEnabled),h=!!((f=l.fluidSim)!=null&&f.paused),p=[{label:`Copy Julia c (${((y=c==null?void 0:c.x)==null?void 0:y.toFixed(3))??"?"}, ${((C=c==null?void 0:c.y)==null?void 0:C.toFixed(3))??"?"})`,action:()=>{var O;if(!c)return;const A=`${c.x.toFixed(6)}, ${c.y.toFixed(6)}`;(O=navigator.clipboard)==null||O.writeText(A).catch(()=>{})}},{label:h?"Resume Sim":"Pause Sim",action:()=>{l.setFluidSim({paused:!h})}},{label:u?"Stop Auto Orbit":"Start Auto Orbit",action:()=>{l.setCoupling({orbitEnabled:!u})}},{label:"Recenter View",action:()=>{l.setJulia({center:{x:0,y:0},zoom:1.5})}},{label:"Reset Fluid Fields",action:()=>{var A;(A=e.current)==null||A.resetFluid()}}];r(o.clientX,o.clientY,p,["ui.fluid-canvas"])};return s.addEventListener("contextmenu",a),()=>s.removeEventListener("contextmenu",a)},[t,e,i,r])},at=(t,e)=>{const i=t+e,r=i-t,s=t-(i-r)+(e-r);return[i,s]},we=(t,e,i)=>{const[r,s]=at(t,i),[a,o]=at(r,e+s);return[a,o]},bi=(t,e,i,r)=>{const[s,a]=at(t,-i),[o,n]=at(s,a+(e-r));return[o,n]},zo=(t,e)=>{var s,a,o,n,l,c,u,h;const i=e.stateRef.current,r=F.getState();i.mode="pan-pending",i.startCx=((a=(s=r.julia)==null?void 0:s.center)==null?void 0:a.x)??0,i.startCy=((n=(o=r.julia)==null?void 0:o.center)==null?void 0:n.y)??0,i.startCxLow=((c=(l=r.julia)==null?void 0:l.centerLow)==null?void 0:c.x)??0,i.startCyLow=((h=(u=r.julia)==null?void 0:u.centerLow)==null?void 0:h.y)??0,i.rightDragged=!1,e.canvas.setPointerCapture(t.pointerId),e.handleInteractionStart("camera")},Oo=(t,e)=>{var y,C;const i=e.stateRef.current,r=e.canvas.getBoundingClientRect();if(r.width<1||r.height<1)return;if(i.mode==="pan-pending"){if(Math.hypot(t.clientX-i.startX,t.clientY-i.startY)<=Mo)return;i.mode="pan",i.rightDragged=!0}const a=((y=F.getState().julia)==null?void 0:y.zoom)??1.5,o=r.width/r.height,n=Ze(t.shiftKey,t.altKey),l=t.clientX-i.startX,c=t.clientY-i.startY,u=-(l/r.width)*2*o*a*n,h=c/r.height*2*a*n,[p,m]=we(i.startCx,i.startCxLow,u),[b,f]=we(i.startCy,i.startCyLow,h);e.pendingViewRef.current={center:{x:p,y:b},centerLow:{x:m,y:f},zoom:a},(C=e.engineRef.current)==null||C.setParams({center:[p,b],centerLow:[m,f]}),i.lastX=t.clientX,i.lastY=t.clientY},lr=()=>{const t=F.getState().deepZoom;return t&&t.enabled?Fo:Ao},Uo=(t,e)=>{var y,C,A,O,E,v;t.preventDefault();const i=e.canvas.getBoundingClientRect();if(i.width<1||i.height<1)return;const r=e.stateRef.current,s=F.getState(),a=((y=s.julia)==null?void 0:y.center)??{x:0,y:0},o=((C=s.julia)==null?void 0:C.zoom)??1.5,n=(t.clientX-i.left)/i.width,l=1-(t.clientY-i.top)/i.height,c=i.width/i.height;r.mode="zoom",r.startZoom=o,r.zoomAnchorU=n,r.zoomAnchorV=l;const u=((O=(A=s.julia)==null?void 0:A.centerLow)==null?void 0:O.x)??0,h=((v=(E=s.julia)==null?void 0:E.centerLow)==null?void 0:v.y)??0,p=(n*2-1)*c*o,m=(l*2-1)*o,b=we(a.x,u,p),f=we(a.y,h,m);r.zoomAnchorX=b[0],r.zoomAnchorXLow=b[1],r.zoomAnchorY=f[0],r.zoomAnchorYLow=f[1],e.canvas.setPointerCapture(t.pointerId),e.handleInteractionStart("camera")},Lo=(t,e)=>{var f;const i=e.stateRef.current,r=e.canvas.getBoundingClientRect();if(r.width<1||r.height<1)return;const s=Ze(t.shiftKey,t.altKey),a=t.clientY-i.startY,o=Math.exp(a*Eo*s),n=Math.max(lr(),Math.min(nr,i.startZoom*o)),l=r.width/r.height,c=-(i.zoomAnchorU*2-1)*l*n,u=-(i.zoomAnchorV*2-1)*n,[h,p]=we(i.zoomAnchorX,i.zoomAnchorXLow,c),[m,b]=we(i.zoomAnchorY,i.zoomAnchorYLow,u);e.pendingViewRef.current={center:{x:h,y:m},centerLow:{x:p,y:b},zoom:n},(f=e.engineRef.current)==null||f.setParams({center:[h,m],centerLow:[p,b],zoom:n}),i.lastX=t.clientX,i.lastY=t.clientY},No=t=>{let e=null;return{onWheel:s=>{var B;s.preventDefault();const a=t.canvas.getBoundingClientRect();if(a.width<1||a.height<1)return;const o=t.pendingViewRef.current??(()=>{var z,D,N;const j=F.getState();return{center:((z=j.julia)==null?void 0:z.center)??{x:0,y:0},centerLow:((D=j.julia)==null?void 0:D.centerLow)??{x:0,y:0},zoom:((N=j.julia)==null?void 0:N.zoom)??1.5}})(),n=o.center,l=o.centerLow,c=o.zoom,u=Ze(s.shiftKey,s.altKey),h=Math.pow(.9,-s.deltaY*Ro*u),p=(s.clientX-a.left)/a.width,m=1-(s.clientY-a.top)/a.height,b=a.width/a.height,f=Math.max(lr(),Math.min(nr,c*h)),y=c-f,C=(p*2-1)*b*y,A=(m*2-1)*y,[O,E]=we(n.x,l.x,C),[v,T]=we(n.y,l.y,A);t.pendingViewRef.current={center:{x:O,y:v},centerLow:{x:E,y:T},zoom:f},(B=t.engineRef.current)==null||B.setParams({center:[O,v],centerLow:[E,T],zoom:f}),e!==null&&window.clearTimeout(e),e=window.setTimeout(()=>{if(e=null,!t.pendingViewRef.current)return;const j=t.pendingViewRef.current;t.pendingViewRef.current=null,F.getState().setJulia({center:j.center,centerLow:j.centerLow,zoom:j.zoom})},100)},cleanup:()=>{e!==null&&window.clearTimeout(e)}}},Xt=()=>{const t=F.getState(),e=Fe(t.brush,"brush",t.liveModulations??{});return{mode:po(e.mode),colorMode:ho(e.colorMode),solidColor:[e.solidColor.x,e.solidColor.y,e.solidColor.z],gradientLut:Pe.ref.current.gradientLut,size:e.size,hardness:e.hardness,strength:e.strength,flow:e.flow,spacing:e.spacing,jitter:e.jitter,particleEmitter:e.particleEmitter,particleRate:e.particleRate,particleVelocity:e.particleVelocity,particleSpread:e.particleSpread,particleGravity:e.particleGravity,particleDrag:e.particleDrag,particleLifetime:e.particleLifetime,particleSizeScale:e.particleSizeScale}},Vo=(t,e)=>{const i=e.stateRef.current;i.mode="splat",e.handleInteractionStart("param"),Da(Pe.ref.current.runtime),Re.ref.current.dragging=!0;const r=e.canvas.getBoundingClientRect();if(r.width<1||r.height<1||!e.engineRef.current)return;const s=(t.clientX-r.left)/r.width,a=1-(t.clientY-r.top)/r.height;Re.ref.current.uv={u:s,v:a},Re.ref.current.velUv=null,_a(Pe.ref.current.runtime,{u:s,v:a,dvx:0,dvy:0,params:Xt(),engine:e.engineRef.current,wallClockMs:performance.now()})},Wo=(t,e)=>{const i=e.engineRef.current;if(!i)return;const r=e.stateRef.current,s=e.canvas.getBoundingClientRect();if(s.width<1||s.height<1)return;const a=performance.now(),o=Math.max(.001,(a-r.lastT)/1e3),n=t.clientX-r.lastX,l=t.clientY-r.lastY,c=(t.clientX-s.left)/s.width,u=1-(t.clientY-s.top)/s.height,h=n/s.width/o,p=-(l/s.height)/o,m=Math.hypot(n/s.width,l/s.height);Pe.ref.current.runtime.distSinceSplat+=m,Re.ref.current.uv={u:c,v:u},Re.ref.current.velUv={vx:h,vy:p},Pa(Pe.ref.current.runtime,{u:c,v:u,dvx:h,dvy:p,params:Xt(),engine:i,wallClockMs:a}),r.lastX=t.clientX,r.lastY=t.clientY,r.lastT=a},Ho=(t,e)=>{var s,a,o,n;const i=e.stateRef.current,r=F.getState();i.mode="pick-c",i.startCx=((a=(s=r.julia)==null?void 0:s.juliaC)==null?void 0:a.x)??0,i.startCy=((n=(o=r.julia)==null?void 0:o.juliaC)==null?void 0:n.y)??0,e.canvas.setPointerCapture(t.pointerId),e.handleInteractionStart("param")},Go=(t,e)=>{var p;const i=e.stateRef.current,r=e.canvas.getBoundingClientRect();if(r.width<1||r.height<1)return;const s=F.getState(),a=((p=s.julia)==null?void 0:p.zoom)??1.5,o=r.width/r.height,n=Ze(t.shiftKey,t.altKey),l=t.clientX-i.startX,c=t.clientY-i.startY,u=l/r.width*2*o*a*n,h=-(c/r.height)*2*a*n;s.setJulia({juliaC:{x:i.startCx+u,y:i.startCy+h}}),i.lastX=t.clientX,i.lastY=t.clientY},Jo=(t,e)=>{var s;const i=e.stateRef.current,r=F.getState();i.mode="resize-brush",i.startBrushSize=((s=r.brush)==null?void 0:s.size)??.15,e.canvas.setPointerCapture(t.pointerId),e.handleInteractionStart("param")},Xo=(t,e)=>{const i=e.stateRef.current,r=F.getState(),s=Ze(t.shiftKey,t.altKey),a=t.clientX-i.startX,o=Math.exp(a*.0033*s),n=Math.max(.003,Math.min(.4,i.startBrushSize*o));r.setBrush({size:n}),i.lastX=t.clientX,i.lastY=t.clientY},$o=(t,e,i,r)=>{const s=F(o=>o.handleInteractionStart),a=F(o=>o.handleInteractionEnd);k.useEffect(()=>{const o=t.current;if(!o||!i.current)return;const n={canvas:o,engineRef:e,pendingViewRef:r,stateRef:i,handleInteractionStart:s,handleInteractionEnd:a},l=p=>{const m=i.current;if(m.pointerId=p.pointerId,m.lastX=p.clientX,m.lastY=p.clientY,m.lastT=performance.now(),m.startX=p.clientX,m.startY=p.clientY,p.button===2)return zo(p,n);if(p.button===1)return Uo(p,n);if(p.button===0)return xe.c?Ho(p,n):xe.b?Jo(p,n):Vo(p,n)},c=p=>{switch(i.current.mode){case"idle":return;case"pick-c":return Go(p,n);case"resize-brush":return Xo(p,n);case"pan-pending":case"pan":return Oo(p,n);case"zoom":return Lo(p,n);case"splat":return Wo(p,n)}},u=p=>{const m=i.current;if(m.pointerId===p.pointerId){try{o.releasePointerCapture(p.pointerId)}catch{}m.pointerId=-1}if(r.current){const b=r.current;r.current=null,F.getState().setJulia({center:b.center,centerLow:b.centerLow,zoom:b.zoom})}m.mode="idle",Re.ref.current.dragging=!1,a()},h=No(n);return o.addEventListener("pointerdown",l),o.addEventListener("pointermove",c),o.addEventListener("pointerup",u),o.addEventListener("pointercancel",u),o.addEventListener("pointerleave",u),o.addEventListener("wheel",h.onWheel,{passive:!1}),()=>{o.removeEventListener("pointerdown",l),o.removeEventListener("pointermove",c),o.removeEventListener("pointerup",u),o.removeEventListener("pointercancel",u),o.removeEventListener("pointerleave",u),o.removeEventListener("wheel",h.onWheel),h.cleanup()}},[t,e,i,r,s,a])},qo=({canvasRef:t,engineRef:e})=>{const i=k.useRef(ko()),r=k.useRef(null);return Bo(),jo(t,e,i),$o(t,e,i,r),null},Zo=()=>{const t=ee.getViewportOverlays().filter(e=>e.type==="dom");return d.jsx("div",{className:"absolute inset-0 pointer-events-none z-[20]",children:t.map(e=>{const i=ct.get(e.componentId);return i?d.jsx(Ko,{cfg:e,Component:i},e.id):null})})},Ko=({cfg:t,Component:e})=>{const i=F(s=>s[t.id]);if(!i)return null;const r=F.getState();return d.jsx(e,{featureId:t.id,sliceState:i,actions:r})},cr={orbitLength:0,precisionBits:0,orbitBuildMs:0,laStageCount:0,laCount:0,laBuildMs:0,laStagesPerLevel:[],juliaMs:0};let Oe=cr;const ot=new Set,ur=t=>{Oe=t,ot.forEach(e=>e(t))},Qo=t=>{Math.abs(Oe.juliaMs-t)<.05||(Oe={...Oe,juliaMs:t},ot.forEach(e=>e(Oe)))},Yo=()=>{ur(cr)},en=()=>{const[t,e]=k.useState(Oe);return k.useEffect(()=>(ot.add(e),()=>{ot.delete(e)}),[]),t},tn=()=>{const t=F(l=>{var c;return((c=l.julia)==null?void 0:c.zoom)??1}),e=F(l=>{var c,u;return((u=(c=l.julia)==null?void 0:c.center)==null?void 0:u.x)??0}),i=F(l=>{var c,u;return((u=(c=l.julia)==null?void 0:c.center)==null?void 0:u.y)??0}),r=en(),s=t>0?Math.log10(t):0,a=t>0?`1e${s.toFixed(2)} (${t.toExponential(2)})`:"invalid",o=r.laCount>0,n=r.laStagesPerLevel.length>0?r.laStagesPerLevel.join(","):"—";return d.jsxs("div",{style:{fontSize:"10.5px",lineHeight:"1.5",fontFamily:'ui-monospace, "SF Mono", Menlo, monospace',color:"#9ca3af",padding:"6px 8px",background:"rgba(255,255,255,0.03)",borderRadius:"4px",margin:"4px 0"},children:[d.jsxs("div",{children:["zoom: ",d.jsx("span",{style:{color:"#e5e7eb"},children:a})]}),d.jsxs("div",{children:["centre: ",d.jsxs("span",{style:{color:"#e5e7eb"},children:["(",e.toExponential(3),", ",i.toExponential(3),")"]})]}),r.orbitLength>0&&d.jsxs("div",{children:["orbit: ",d.jsx("span",{style:{color:"#e5e7eb"},children:r.orbitLength})," iters @ ",r.precisionBits,"b (",r.orbitBuildMs.toFixed(0),"ms)"]}),o&&d.jsxs("div",{children:["LA: ",d.jsx("span",{style:{color:"#e5e7eb"},children:r.laStageCount})," stages, ",d.jsx("span",{style:{color:"#e5e7eb"},children:r.laCount})," nodes [",n,"] (",r.laBuildMs.toFixed(0),"ms)"]}),r.juliaMs>0&&d.jsxs("div",{children:["GPU: ",d.jsxs("span",{style:{color:"#e5e7eb"},children:[r.juliaMs.toFixed(2),"ms"]})," per Julia pass (~",Math.round(1e3/Math.max(.1,r.juliaMs))," fps)"]})]})},st=t=>new Promise(e=>{let i=0;const r=()=>{i++,i>=t?e():requestAnimationFrame(r)};requestAnimationFrame(r)}),rn=t=>{if(t.length===0)return 0;const e=[...t].sort((i,r)=>i-r);return e[Math.floor(e.length/2)]},dr=[{name:"standard / shallow",center:[-.81,-.054],zoom:1.29,iter:310,deep:!1,useLA:!1,useAT:!1},{name:"deep shallow / no LA / no AT",center:[-.81,-.054],zoom:1.29,iter:1e3,deep:!0,useLA:!1,useAT:!1},{name:"deep shallow / LA",center:[-.81,-.054],zoom:1.29,iter:1e3,deep:!0,useLA:!0,useAT:!1},{name:"deep shallow / LA + AT",center:[-.81,-.054],zoom:1.29,iter:1e3,deep:!0,useLA:!0,useAT:!0},{name:"deep 1e-5 / no LA / no AT",center:[-.81,-.054],zoom:1e-5,iter:2e3,deep:!0,useLA:!1,useAT:!1},{name:"deep 1e-5 / LA",center:[-.81,-.054],zoom:1e-5,iter:2e3,deep:!0,useLA:!0,useAT:!1},{name:"deep 1e-5 / LA + AT",center:[-.81,-.054],zoom:1e-5,iter:2e3,deep:!0,useLA:!0,useAT:!0},{name:"deep 1e-10 / no LA / no AT",center:[-.81,-.054],zoom:1e-10,iter:5e3,deep:!0,useLA:!1,useAT:!1},{name:"deep 1e-10 / LA",center:[-.81,-.054],zoom:1e-10,iter:5e3,deep:!0,useLA:!0,useAT:!1},{name:"deep 1e-10 / LA + AT",center:[-.81,-.054],zoom:1e-10,iter:5e3,deep:!0,useLA:!0,useAT:!0},{name:"deep 1e-10 / 20k iter / LA+AT",center:[-.81,-.054],zoom:1e-10,iter:2e4,deep:!0,useLA:!0,useAT:!0}],sn=async(t,e,i,r=3e3)=>{if(!i){await st(20);return}const s=performance.now();for(;performance.now()-s<r;){if(t.getJuliaMs()>0){await st(15);return}await st(5)}},an=async(t,e,i)=>{const r=t.getState();r.setJulia({center:{x:i.center[0],y:i.center[1]},zoom:i.zoom}),r.setDeepZoom({enabled:i.deep,useLA:i.useLA,useAT:i.useAT,deepMaxIter:i.iter}),await sn(e,i.iter,i.deep)},on=async(t,e,i=dr,r)=>{const s=[],a=t,o=e.getState();o.accumulation,a.setForceFluidPaused(!0),a.setParams({tsaaSampleCap:1,tsaaPerFrameSamples:1}),o.setAccumulation&&o.setAccumulation(!1);try{for(let n=0;n<i.length;n++){const l=i[n];r==null||r(n,i.length,l),await an(e,t,l);const c=[];for(let p=0;p<30;p++){await st(1);const m=t.getJuliaMs();m>0&&c.push(m)}const u=rn(c),h=c.length>0?Math.min(...c):0;s.push({...l,juliaMs:u,juliaMsMin:h,samples:c,timerOk:c.length>0,orbitLength:0,laStageCount:0,laCount:0,atEngaged:!1})}}finally{a.setForceFluidPaused(!1),a.setParams({tsaaSampleCap:64,tsaaPerFrameSamples:1}),o.setAccumulation&&o.setAccumulation(!0)}return s},nn=t=>{const e="| Case | Iter | Deep | LA | AT | Julia ms | min ms |",i="|------|------|------|----|----|---------|--------|",r=t.map(s=>{const a=s.timerOk?s.juliaMs.toFixed(2):"—",o=s.timerOk?s.juliaMsMin.toFixed(2):"—";return`| ${s.name} | ${s.iter} | ${s.deep?"✓":""} | ${s.useLA?"✓":""} | ${s.useAT?"✓":""} | ${a} | ${o} |`});return[e,i,...r].join(`
`)},ln=t=>{const e=[],i=s=>`${s.zoom}|${s.iter}|${s.deep}`,r=new Map;for(const s of t){const a=i(s);r.has(a)||r.set(a,[]),r.get(a).push(s)}for(const[s,a]of r){const o=a.find(c=>!c.useLA&&!c.useAT),n=a.find(c=>c.useLA&&!c.useAT),l=a.find(c=>c.useLA&&c.useAT);if(!(!o||o.juliaMs===0)){if(n&&n.juliaMs>0){const c=o.juliaMs/n.juliaMs;e.push(`${s}: LA speedup = ${c.toFixed(2)}×`)}if(l&&l.juliaMs>0){const c=o.juliaMs/l.juliaMs;e.push(`${s}: LA+AT speedup = ${c.toFixed(2)}×`)}}}return e},ge={padding:"2px 6px",borderBottom:"1px solid rgba(255,255,255,0.08)",whiteSpace:"nowrap"},Ae={...ge,fontWeight:600,color:"#cbd5e1",borderBottom:"1px solid rgba(255,255,255,0.2)"},cn=({engineRef:t})=>{const[e,i]=k.useState(!1),[r,s]=k.useState({i:0,total:0,name:""}),[a,o]=k.useState(null),n=async()=>{const l=t.current;if(!(!l||e)){i(!0),o(null);try{const c=await on(l,F,dr,(p,m,b)=>{s({i:p,total:m,name:b.name})});o(c);const u=nn(c),h=ln(c);console.log(`[deepZoom bench]
`+u),h.length>0&&console.log(`[deepZoom bench]
`+h.join(`
`))}finally{i(!1)}}};return d.jsxs("div",{style:{fontSize:"10.5px",lineHeight:"1.5",fontFamily:'ui-monospace, "SF Mono", Menlo, monospace',color:"#9ca3af",padding:"6px 8px",background:"rgba(255,255,255,0.03)",borderRadius:"4px",margin:"4px 0",pointerEvents:"auto",maxWidth:480},children:[d.jsx("button",{onClick:()=>{n()},disabled:e||t.current===null,style:{fontFamily:"inherit",fontSize:"inherit",padding:"4px 10px",background:e?"#444":"#1f6feb",color:"white",border:"none",borderRadius:3,cursor:e?"wait":"pointer"},children:e?`Running ${r.i+1}/${r.total}: ${r.name}`:"Run perf benchmark"}),a&&d.jsxs("div",{style:{marginTop:8,overflow:"auto",maxHeight:320},children:[d.jsxs("table",{style:{borderCollapse:"collapse",fontSize:"10.5px"},children:[d.jsx("thead",{children:d.jsxs("tr",{children:[d.jsx("th",{style:Ae,children:"Case"}),d.jsx("th",{style:Ae,children:"Iter"}),d.jsx("th",{style:Ae,children:"D"}),d.jsx("th",{style:Ae,children:"LA"}),d.jsx("th",{style:Ae,children:"AT"}),d.jsx("th",{style:Ae,children:"ms (med)"}),d.jsx("th",{style:Ae,children:"min"})]})}),d.jsx("tbody",{children:a.map((l,c)=>d.jsxs("tr",{children:[d.jsx("td",{style:ge,children:l.name}),d.jsx("td",{style:ge,children:l.iter}),d.jsx("td",{style:ge,children:l.deep?"✓":""}),d.jsx("td",{style:ge,children:l.useLA?"✓":""}),d.jsx("td",{style:ge,children:l.useAT?"✓":""}),d.jsx("td",{style:{...ge,color:"#e5e7eb",textAlign:"right"},children:l.timerOk?l.juliaMs.toFixed(2):"—"}),d.jsx("td",{style:{...ge,textAlign:"right"},children:l.timerOk?l.juliaMsMin.toFixed(2):"—"})]},c))})]}),d.jsx("div",{style:{marginTop:4,color:"#94a3b8"},children:a.some(l=>!l.timerOk)?"(— = GPU timer unavailable on this device)":"Open devtools console for markdown + speedup ratios."})]})]})},un=`
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
`,pr=`
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
`,$=`#version 300 es
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
}`,dn=`
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
`,pn=`
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
`,hn=`#version 300 es
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

${dn}
${pn}
${pr}

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
}`,fn=`#version 300 es
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
}`,mn=`#version 300 es
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
}`,gn=`#version 300 es
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
${un}

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
}`,bn=`#version 300 es
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
}`,xn=`#version 300 es
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
}`,yn=`#version 300 es
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
}`,vn=`#version 300 es
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
}`,wn=`#version 300 es
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
}`,Tn=`#version 300 es
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
}`,Cn=`#version 300 es
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
}`,Sn=`#version 300 es
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
${pr}

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
}`,kn=`#version 300 es
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
}`,An=`#version 300 es
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
}`,Fn=`#version 300 es
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
}`,Mn=`#version 300 es
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
}`,Rn=`#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec4 uValue;
void main() { fragColor = uValue; }`,En=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSource;
void main() { fragColor = texture(uSource, vUv); }`,Pn=`#version 300 es
precision highp float;
in vec2 vUv;
layout(location=0) out vec4 outMain;
layout(location=1) out vec4 outFx;
uniform sampler2D uSourceMain;
uniform sampler2D uSourceFx;
void main() {
  outMain = texture(uSourceMain, vUv);
  outFx   = texture(uSourceFx,   vUv);
}`,_n=`#version 300 es
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
}`,Dn=(t,e="/blueNoise.png",i)=>{const r=t.createTexture();if(!r)throw new Error("[createBlueNoiseWebGL2] failed to allocate texture");t.bindTexture(t.TEXTURE_2D,r),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,1,1,0,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array([128,128,128,128])),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.REPEAT),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.REPEAT);let s=[64,64];const a=new Image;return a.crossOrigin="anonymous",a.onload=()=>{t.isContextLost()||!t.isTexture(r)||(t.bindTexture(t.TEXTURE_2D,r),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,a),s=[a.naturalWidth,a.naturalHeight])},a.onerror=o=>{console.warn("[createBlueNoiseWebGL2] failed to load",e,o)},a.src=e,{texture:r,getResolution:()=>s}},gt=t=>{if(!Number.isFinite(t)||t===0)return[0,0];const e=Math.floor(Math.log2(Math.abs(t)));return[t/Math.pow(2,e),e]},xi=(t,e,i,r)=>{i&&(t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,i),t.uniform1i(r,e))};class In{constructor(e){x(this,"refOrbitTex",null);x(this,"refOrbitTexW",2048);x(this,"refOrbitTexH",0);x(this,"refOrbitLen",0);x(this,"refOrbitCenter",[0,0]);x(this,"refOrbitCenterLow",[0,0]);x(this,"laTableTex",null);x(this,"laTableTexW",1024);x(this,"laTableTexH",0);x(this,"laTotalCount",0);x(this,"laStages",new Float32Array(0));x(this,"laStageCount",0);x(this,"laEnabled",!1);x(this,"atPayload",null);x(this,"version",0);this.gl=e}hasOrbit(){return this.refOrbitTex!==null&&this.refOrbitLen>1}setReferenceOrbit(e,i,r,s=[0,0]){this.refOrbitCenter=[r[0],r[1]],this.refOrbitCenterLow=[s[0],s[1]],this.uploadOrbitTexture(e,i),this.refOrbitLen=i,this.version++}clearReferenceOrbit(){this.refOrbitLen=0,this.version++}setLATable(e,i,r){this.uploadLaTexture(e,i),this.laTotalCount=i,this.laStages=r,this.laStageCount=r.length/2,this.version++}setLAEnabled(e){this.laEnabled=e}clearLATable(){this.laTotalCount=0,this.laStages=new Float32Array(0),this.laStageCount=0,this.version++}setAT(e){this.atPayload=e,this.version++}clearAT(){this.atPayload!==null&&(this.atPayload=null,this.version++)}bindUniforms(e,i,r){const s=this.gl,a=i.deepZoomEnabled&&this.hasOrbit();s.uniform1i(e.uniforms.uDeepZoomEnabled,a?1:0),s.uniform1i(e.uniforms.uRefOrbitTexW,this.refOrbitTexW),s.uniform1i(e.uniforms.uRefOrbitLen,this.refOrbitLen);const o=bi(i.center[0],i.centerLow[0],this.refOrbitCenter[0],this.refOrbitCenterLow[0]),n=bi(i.center[1],i.centerLow[1],this.refOrbitCenter[1],this.refOrbitCenterLow[1]),l=o[0]+o[1],c=n[0]+n[1],u=gt(l),h=gt(c);s.uniform4f(e.uniforms.uDeepCenterOffset,u[0],u[1],h[0],h[1]);const p=gt(i.zoom);s.uniform2f(e.uniforms.uDeepScale,p[0],p[1]),xi(s,6,this.refOrbitTex??r,e.uniforms.uRefOrbit);const m=a&&this.laEnabled&&this.laTableTex!==null&&this.laTotalCount>1;if(s.uniform1i(e.uniforms.uLAEnabled,m?1:0),s.uniform1i(e.uniforms.uLATexW,this.laTableTexW),s.uniform1i(e.uniforms.uLATotalCount,this.laTotalCount),s.uniform1i(e.uniforms.uLAStageCount,this.laStageCount),this.laStageCount>0){const f=Math.min(this.laStageCount,64),y=new Float32Array(f*4);for(let C=0;C<f;C++)y[C*4+0]=this.laStages[C*2+0],y[C*4+1]=this.laStages[C*2+1];s.uniform4fv(e.uniforms["uLAStages[0]"],y)}xi(s,7,this.laTableTex??r,e.uniforms.uLATable);const b=a&&this.atPayload!==null;s.uniform1i(e.uniforms.uATEnabled,b?1:0),this.atPayload?(s.uniform1i(e.uniforms.uATStepLength,this.atPayload.stepLength),s.uniform1f(e.uniforms.uATThresholdC,this.atPayload.thresholdC),s.uniform1f(e.uniforms.uATSqrEscapeRadius,this.atPayload.sqrEscapeRadius),s.uniform2f(e.uniforms.uATRefC,this.atPayload.refC[0],this.atPayload.refC[1]),s.uniform2f(e.uniforms.uATCCoeff,this.atPayload.ccoeff[0],this.atPayload.ccoeff[1]),s.uniform2f(e.uniforms.uATInvZCoeff,this.atPayload.invZCoeff[0],this.atPayload.invZCoeff[1])):(s.uniform1i(e.uniforms.uATStepLength,1),s.uniform1f(e.uniforms.uATThresholdC,0),s.uniform1f(e.uniforms.uATSqrEscapeRadius,4),s.uniform2f(e.uniforms.uATRefC,0,0),s.uniform2f(e.uniforms.uATCCoeff,1,0),s.uniform2f(e.uniforms.uATInvZCoeff,1,0))}dispose(){const e=this.gl;this.refOrbitTex&&(e.deleteTexture(this.refOrbitTex),this.refOrbitTex=null),this.laTableTex&&(e.deleteTexture(this.laTableTex),this.laTableTex=null)}uploadOrbitTexture(e,i){const r=this.gl,s=this.refOrbitTexW,a=Math.max(1,Math.ceil(i/s)),o=s*a*4,n=e.length>=o?e.subarray(0,o):(()=>{const l=new Float32Array(o);return l.set(e),l})();this.refOrbitTex||(this.refOrbitTex=yi(r),this.refOrbitTexH=0),r.bindTexture(r.TEXTURE_2D,this.refOrbitTex),a!==this.refOrbitTexH?(r.texImage2D(r.TEXTURE_2D,0,r.RGBA32F,s,a,0,r.RGBA,r.FLOAT,n),this.refOrbitTexH=a):r.texSubImage2D(r.TEXTURE_2D,0,0,0,s,a,r.RGBA,r.FLOAT,n)}uploadLaTexture(e,i){const r=this.gl,s=i*3,a=this.laTableTexW,o=Math.max(1,Math.ceil(s/a)),n=a*o*4,l=e.length>=n?e.subarray(0,n):(()=>{const c=new Float32Array(n);return c.set(e),c})();this.laTableTex||(this.laTableTex=yi(r),this.laTableTexH=0),r.bindTexture(r.TEXTURE_2D,this.laTableTex),o!==this.laTableTexH?(r.texImage2D(r.TEXTURE_2D,0,r.RGBA32F,a,o,0,r.RGBA,r.FLOAT,l),this.laTableTexH=o):r.texSubImage2D(r.TEXTURE_2D,0,0,0,a,o,r.RGBA,r.FLOAT,l)}}const yi=t=>{const e=t.createTexture();return t.bindTexture(t.TEXTURE_2D,e),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),e},Be=3;class Bn{constructor(e){x(this,"ext");x(this,"queries",new Array(Be).fill(null));x(this,"inFlight",new Array(Be).fill(!1));x(this,"cursor",0);x(this,"msEwma",0);x(this,"open",!1);if(this.gl=e,this.ext=e.getExtension("EXT_disjoint_timer_query_webgl2"),this.ext)for(let i=0;i<Be;i++)this.queries[i]=e.createQuery()}available(){return this.ext!==null}getMs(){return this.msEwma}begin(){if(!this.ext||this.open)return;const e=this.queries[this.cursor];!e||this.inFlight[this.cursor]||(this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT,e),this.open=!0,this.inFlight[this.cursor]=!0)}end(){!this.ext||!this.open||(this.gl.endQuery(this.ext.TIME_ELAPSED_EXT),this.cursor=(this.cursor+1)%Be,this.open=!1)}poll(){if(!this.ext)return;const e=this.gl;if(e.getParameter(this.ext.GPU_DISJOINT_EXT)){for(let i=0;i<Be;i++)this.inFlight[i]=!1;return}for(let i=0;i<Be;i++){if(!this.inFlight[i])continue;const r=this.queries[i];if(!r||!e.getQueryParameter(r,e.QUERY_RESULT_AVAILABLE))continue;const o=e.getQueryParameter(r,e.QUERY_RESULT)/1e6;this.msEwma=this.msEwma===0?o:this.msEwma*.8+o*.2,this.inFlight[i]=!1}}dispose(){const e=this.gl;for(const i of this.queries)i&&e.deleteQuery(i)}}class jn{constructor(e){x(this,"mainTex",null);x(this,"collisionTex",null);x(this,"version",0);this.gl=e}getTexture(e){return e==="main"?this.mainTex:this.collisionTex}setBuffer(e,i){const r=this.gl,s=mt*4;i.length!==s&&console.warn(`[GradientLut] ${e} buffer length ${i.length} (want ${s})`);let a=this.getTexture(e);a||(a=r.createTexture(),e==="main"?this.mainTex=a:this.collisionTex=a),r.activeTexture(r.TEXTURE0),r.bindTexture(r.TEXTURE_2D,a),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MIN_FILTER,r.LINEAR),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MAG_FILTER,r.LINEAR),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_S,r.REPEAT),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_T,r.CLAMP_TO_EDGE),r.texImage2D(r.TEXTURE_2D,0,r.RGBA,mt,1,0,r.RGBA,r.UNSIGNED_BYTE,i),this.version++}ensure(e){if(this.getTexture(e))return;const i=mt,r=new Uint8Array(i*4);if(e==="main")for(let s=0;s<i;++s)r[s*4+0]=s,r[s*4+1]=s,r[s*4+2]=s,r[s*4+3]=255;else for(let s=0;s<i;++s)r[s*4+3]=255;this.setBuffer(e,r)}dispose(){const e=this.gl;this.mainTex&&(e.deleteTexture(this.mainTex),this.mainTex=null),this.collisionTex&&(e.deleteTexture(this.collisionTex),this.collisionTex=null)}}class zn{constructor(e){x(this,"a",null);x(this,"b",null);x(this,"c",null);x(this,"dirty",!0);x(this,"extract");x(this,"down");x(this,"up");this.deps=e,this.extract=e.linkProgram($,kn,["uTexel","uSource","uThreshold","uSoftKnee"]),this.down=e.linkProgram($,An,["uTexel","uSource"]),this.up=e.linkProgram($,Fn,["uTexel","uSource","uPrev","uIntensity"])}markResize(){this.dirty=!0}process(e,i,r,s){this.ensure(e,i);const a=this.a,o=this.b,n=this.c,{gl:l,drawQuad:c,bindFBO:u,useProgram:h,bindTex:p}=this.deps;return u(a),s(a),u(o),h(this.extract),l.uniform2f(this.extract.uniforms.uTexel,o.texel[0],o.texel[1]),p(0,a.tex,this.extract.uniforms.uSource),l.uniform1f(this.extract.uniforms.uThreshold,r),l.uniform1f(this.extract.uniforms.uSoftKnee,Do),c(),u(n),h(this.down),l.uniform2f(this.down.uniforms.uTexel,o.texel[0],o.texel[1]),p(0,o.tex,this.down.uniforms.uSource),c(),u(a),h(this.down),l.uniform2f(this.down.uniforms.uTexel,o.texel[0],o.texel[1]),p(0,o.tex,this.down.uniforms.uSource),c(),u(o),h(this.up),l.uniform2f(this.up.uniforms.uTexel,n.texel[0],n.texel[1]),p(0,n.tex,this.up.uniforms.uSource),p(1,a.tex,this.up.uniforms.uPrev),l.uniform1f(this.up.uniforms.uIntensity,1),c(),o.tex}dispose(){const{gl:e,deleteFBO:i}=this.deps;i(this.a),i(this.b),i(this.c),e.deleteProgram(this.extract.prog),e.deleteProgram(this.down.prog),e.deleteProgram(this.up.prog)}ensure(e,i){if(!this.dirty&&this.a&&this.b&&this.c)return;const{deleteFBO:r,createFBO:s}=this.deps;r(this.a),r(this.b),r(this.c);const a=Math.max(4,e>>1&-2),o=Math.max(4,i>>1&-2),n=Math.max(2,e>>2&-2),l=Math.max(2,i>>2&-2),c=Math.max(2,e>>3&-2),u=Math.max(2,i>>3&-2);this.a=s(a,o),this.b=s(n,l),this.c=s(c,u),this.dirty=!1}}function On(t){switch(t){case"linear":return 0;case"perceptual":return 1;case"vivid":return 2}}function Un(t){switch(t){case"none":return 0;case"reinhard":return 1;case"agx":return 2;case"filmic":return 3}}function Ln(t){switch(t){case"add":return 0;case"screen":return 1;case"max":return 2;case"over":return 3}}function vi(t){switch(t){case"iterations":return 0;case"angle":return 1;case"magnitude":return 2;case"decomposition":return 3;case"bands":return 4;case"orbit-point":return 5;case"orbit-circle":return 6;case"orbit-cross":return 7;case"orbit-line":return 8;case"stripe":return 9;case"distance":return 10;case"derivative":return 11;case"potential":return 12;case"trap-iter":return 13}}function Nn(t){switch(t){case"orbit-point":case"orbit-circle":case"orbit-cross":case"orbit-line":case"stripe":case"trap-iter":return!0;default:return!1}}function Vn(t){return t==="distance"||t==="derivative"}function Wn(t){switch(t){case"orbit-point":return 0;case"orbit-circle":return 1;case"orbit-cross":return 2;case"orbit-line":return 3;case"trap-iter":return 0;default:return 0}}const Hn={juliaC:[-.36303304426511473,.16845183018751916],center:[-.8139175130270945,-.054649908357858296],centerLow:[0,0],zoom:1.2904749020480561,maxIter:310,escapeR:32,power:2,kind:"mandelbrot",forceMode:"gradient",forceSource:"smoothPot",forceGain:-1200,interiorDamp:.59,dt:.016,timeScale:1,dissipation:.17,dyeDissipation:1.03,dyeInject:8,vorticity:22.1,pressureIters:50,show:"composite",juliaMix:.4,dyeMix:2,velocityViz:.02,gradientRepeat:1,gradientPhase:0,colorMapping:"iterations",colorIter:310,trapCenter:[0,0],trapRadius:1,trapNormal:[1,0],trapOffset:0,stripeFreq:4,dyeBlend:"max",dyeDecayMode:"linear",dyeChromaDecayHz:1.03,dyeSaturationBoost:1,vorticityScale:1,toneMapping:"none",exposure:1,vibrance:1.645,bloomAmount:0,bloomThreshold:1,aberration:.27,refraction:.037,refractSmooth:3,refractRoughness:0,caustics:1,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,collisionEnabled:!1,collisionPreview:!1,collisionRepeat:1,collisionPhase:0,paused:!1,tsaaJitterAmount:1,tsaaSampleCap:64,tsaaPerFrameSamples:1,tsaaGridSize:16,tsaaJitterMode:"grid",deepZoomEnabled:!1};class Gn{constructor(e,i={}){x(this,"gl");x(this,"canvas");x(this,"quadVbo");x(this,"progJulia");x(this,"progMotion");x(this,"progAddForce");x(this,"progInjectDye");x(this,"progAdvect");x(this,"progDivergence");x(this,"progCurl");x(this,"progVorticity");x(this,"progPressure");x(this,"progGradSub");x(this,"progSplat");x(this,"progDisplay");x(this,"progClear");x(this,"progCopy");x(this,"progCopyMrt");x(this,"progReproject");x(this,"progTsaaBlend");x(this,"juliaTsaa");x(this,"juliaTsaaPrev");x(this,"tsaaSampleIndex",0);x(this,"tsaaParamHash","");x(this,"blueNoise",null);x(this,"deepZoom");x(this,"forceFluidPaused",!1);x(this,"forceJuliaOnly",!1);x(this,"bucketTileOrigin",[0,0]);x(this,"bucketTileSize",[1,1]);x(this,"bucketRegionMin",[0,0]);x(this,"bucketRegionMax",[1,1]);x(this,"frameCount",0);x(this,"juliaTimer");x(this,"bloom");x(this,"lastCenter",[0,0]);x(this,"lastZoom",1.5);x(this,"firstFrame",!0);x(this,"simW",0);x(this,"simH",0);x(this,"juliaCur");x(this,"juliaPrev");x(this,"forceTex");x(this,"velocity");x(this,"dye");x(this,"divergence");x(this,"pressure");x(this,"curl");x(this,"gradients");x(this,"params",{...Hn});x(this,"lastTimeMs",0);x(this,"framebufferFormat");x(this,"maskReadFBO",null);x(this,"maskCpuBuf",new Uint8Array(0));x(this,"MASK_CPU_W",128);x(this,"MASK_CPU_H",128);x(this,"onFrameEnd");this.canvas=e,this.onFrameEnd=i.onFrameEnd;const r=e.getContext("webgl2",{antialias:!1,alpha:!1,preserveDrawingBuffer:!0});if(!r)throw new Error("WebGL2 required — your browser does not support it.");this.gl=r,this.deepZoom=new In(r),this.juliaTimer=new Bn(r),this.gradients=new jn(r),this.bloom=new zn({gl:r,linkProgram:(o,n,l)=>this.linkProgram(o,n,l),drawQuad:()=>this.drawQuad(),bindFBO:o=>this.bindFBO(o),useProgram:o=>this.useProgram(o),bindTex:(o,n,l)=>this.bindTex(o,n,l),createFBO:(o,n)=>this.createFBO(o,n),deleteFBO:o=>this.deleteFBO(o)});const s=r.getExtension("EXT_color_buffer_float"),a=r.getExtension("EXT_color_buffer_half_float");if(!s&&!a)throw new Error("Neither EXT_color_buffer_float nor EXT_color_buffer_half_float is available.");this.framebufferFormat=this.detectFormat(),this.quadVbo=r.createBuffer(),r.bindBuffer(r.ARRAY_BUFFER,this.quadVbo),r.bufferData(r.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),r.STATIC_DRAW),this.compileAll(),this.allocateAt(64,64),this.blueNoise=Dn(r)}detectFormat(){const e=this.gl,i=[{internal:e.RGBA16F,format:e.RGBA,type:e.HALF_FLOAT,name:"RGBA16F half_float"},{internal:e.RGBA32F,format:e.RGBA,type:e.FLOAT,name:"RGBA32F float"},{internal:e.RGBA8,format:e.RGBA,type:e.UNSIGNED_BYTE,name:"RGBA8 fallback"}];for(const r of i){const s=e.createTexture();e.bindTexture(e.TEXTURE_2D,s),e.texImage2D(e.TEXTURE_2D,0,r.internal,4,4,0,r.format,r.type,null);const a=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,a),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,s,0);const o=e.checkFramebufferStatus(e.FRAMEBUFFER);if(e.bindFramebuffer(e.FRAMEBUFFER,null),e.deleteFramebuffer(a),e.deleteTexture(s),o===e.FRAMEBUFFER_COMPLETE)return console.info(`[FluidEngine] Using ${r.name} render targets.`),r}throw new Error("No renderable texture format supported (not even RGBA8).")}compileShader(e,i){const r=this.gl,s=r.createShader(e);if(r.shaderSource(s,i),r.compileShader(s),!r.getShaderParameter(s,r.COMPILE_STATUS)){const a=r.getShaderInfoLog(s)||"",o=i.split(`
`).map((n,l)=>`${String(l+1).padStart(4)}: ${n}`).join(`
`);throw console.error(`Shader compile error:
${a}
${o}`),new Error(`Shader compile error: ${a}`)}return s}linkProgram(e,i,r){const s=this.gl,a=this.compileShader(s.VERTEX_SHADER,e),o=this.compileShader(s.FRAGMENT_SHADER,i),n=s.createProgram();if(s.attachShader(n,a),s.attachShader(n,o),s.bindAttribLocation(n,0,"aPos"),s.linkProgram(n),!s.getProgramParameter(n,s.LINK_STATUS))throw new Error(`Program link error: ${s.getProgramInfoLog(n)}`);s.deleteShader(a),s.deleteShader(o);const l={};for(const c of r)l[c]=s.getUniformLocation(n,c);return{prog:n,uniforms:l}}compileAll(){this.progJulia=this.linkProgram($,hn,["uTexel","uKind","uJuliaC","uCenter","uScale","uAspect","uMaxIter","uEscapeR2","uPower","uColorIter","uTrapMode","uTrapCenter","uTrapRadius","uTrapNormal","uTrapOffset","uStripeFreq","uJitterScale","uResolution","uBlueNoiseTexture","uBlueNoiseResolution","uFrameCount","uPerFrameSamples","uJitterMode","uGridSize","uTsaaSampleIndex","uImageTileOrigin","uImageTileSize","uRegionMin","uRegionMax","uDeepZoomEnabled","uRefOrbit","uRefOrbitTexW","uRefOrbitLen","uDeepCenterOffset","uDeepScale","uLATable","uLATexW","uLATotalCount","uLAEnabled","uLAStages[0]","uLAStageCount","uATEnabled","uATStepLength","uATThresholdC","uATSqrEscapeRadius","uATRefC","uATCCoeff","uATInvZCoeff","uTrackAccum","uTrackDeriv","uGradient","uColorMapping","uGradientRepeat","uGradientPhase","uInteriorColor","uCollisionGradient","uCollisionRepeat","uCollisionPhase","uCollisionEnabled"]),this.progTsaaBlend=this.linkProgram($,Mn,["uCurrentMain","uCurrentFx","uHistoryMain","uHistoryFx","uSampleIndex"]),this.progMotion=this.linkProgram($,fn,["uTexel","uJulia","uJuliaPrev","uJuliaFx","uJuliaPrevFx","uMask","uMode","uSource","uGain","uDt","uInteriorDamp","uEdgeMargin","uForceCap","uMaxIter"]),this.progAddForce=this.linkProgram($,mn,["uTexel","uVelocity","uForce","uMask","uDt"]),this.progInjectDye=this.linkProgram($,gn,["uTexel","uDye","uJulia","uJuliaFx","uMask","uDyeGain","uDyeFadeHz","uDt","uEdgeMargin","uDyeBlend","uDyeDecayMode","uDyeChromaFadeHz","uDyeSatBoost"]),this.progAdvect=this.linkProgram($,bn,["uTexel","uVelocity","uSource","uMask","uDt","uDissipation","uEdgeMargin"]),this.progDivergence=this.linkProgram($,xn,["uTexel","uVelocity"]),this.progCurl=this.linkProgram($,yn,["uTexel","uVelocity"]),this.progVorticity=this.linkProgram($,vn,["uTexel","uVelocity","uCurl","uStrength","uScale","uDt"]),this.progPressure=this.linkProgram($,wn,["uTexel","uPressure","uDivergence"]),this.progGradSub=this.linkProgram($,Tn,["uTexel","uPressure","uVelocity","uMask"]),this.progSplat=this.linkProgram($,Cn,["uTexel","uTarget","uPoint","uValue","uRadius","uDiscR","uHardness","uAspect","uOp"]),this.progDisplay=this.linkProgram($,Sn,["uTexel","uTexelDisplay","uTexelDye","uJuliaFx","uDye","uVelocity","uGradient","uBloom","uMask","uShowMode","uJuliaMix","uDyeMix","uVelocityViz","uColorMapping","uGradientRepeat","uGradientPhase","uInteriorColor","uToneMapping","uExposure","uVibrance","uBloomAmount","uAberration","uRefraction","uRefractSmooth","uRefractRoughness","uCaustics","uCollisionPreview"]),this.progClear=this.linkProgram($,Rn,["uValue"]),this.progCopy=this.linkProgram($,En,["uSource"]),this.progCopyMrt=this.linkProgram($,Pn,["uSourceMain","uSourceFx"]),this.progReproject=this.linkProgram($,_n,["uTexel","uSource","uNewCenter","uOldCenter","uNewZoom","uOldZoom","uAspect"])}createFBO(e,i){const r=this.gl,s=r.createTexture();r.bindTexture(r.TEXTURE_2D,s),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MIN_FILTER,r.LINEAR),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MAG_FILTER,r.LINEAR),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_S,r.CLAMP_TO_EDGE),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_T,r.CLAMP_TO_EDGE),r.texImage2D(r.TEXTURE_2D,0,this.framebufferFormat.internal,e,i,0,this.framebufferFormat.format,this.framebufferFormat.type,null);const a=r.createFramebuffer();return r.bindFramebuffer(r.FRAMEBUFFER,a),r.framebufferTexture2D(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,s,0),r.viewport(0,0,e,i),r.clearColor(0,0,0,1),r.clear(r.COLOR_BUFFER_BIT),r.bindFramebuffer(r.FRAMEBUFFER,null),{tex:s,fbo:a,width:e,height:i,texel:[1/e,1/i]}}createMrtFbo(e,i){const r=this.gl,s=()=>{const l=r.createTexture();return r.bindTexture(r.TEXTURE_2D,l),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MIN_FILTER,r.LINEAR),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MAG_FILTER,r.LINEAR),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_S,r.CLAMP_TO_EDGE),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_T,r.CLAMP_TO_EDGE),r.texImage2D(r.TEXTURE_2D,0,this.framebufferFormat.internal,e,i,0,this.framebufferFormat.format,this.framebufferFormat.type,null),l},a=s(),o=s(),n=r.createFramebuffer();return r.bindFramebuffer(r.FRAMEBUFFER,n),r.framebufferTexture2D(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,a,0),r.framebufferTexture2D(r.FRAMEBUFFER,r.COLOR_ATTACHMENT1,r.TEXTURE_2D,o,0),r.drawBuffers([r.COLOR_ATTACHMENT0,r.COLOR_ATTACHMENT1]),r.viewport(0,0,e,i),r.clearColor(0,0,0,1),r.clear(r.COLOR_BUFFER_BIT),r.bindFramebuffer(r.FRAMEBUFFER,null),{texMain:a,texFx:o,fbo:n,width:e,height:i,texel:[1/e,1/i]}}deleteMrtFbo(e){if(!e)return;const i=this.gl;i.deleteTexture(e.texMain),i.deleteTexture(e.texFx),i.deleteFramebuffer(e.fbo)}createDoubleFBO(e,i){let r=this.createFBO(e,i),s=this.createFBO(e,i);return{width:e,height:i,texel:[1/e,1/i],get read(){return r},get write(){return s},swap(){const o=r;r=s,s=o}}}deleteFBO(e){if(!e)return;const i=this.gl;i.deleteTexture(e.tex),i.deleteFramebuffer(e.fbo)}deleteDoubleFBO(e){e&&(this.deleteFBO(e.read),this.deleteFBO(e.write))}allocateAt(e,i){this.simW=e,this.simH=i,this.juliaCur=this.createMrtFbo(e,i),this.juliaPrev=this.createMrtFbo(e,i),this.juliaTsaa=this.createMrtFbo(e,i),this.juliaTsaaPrev=this.createMrtFbo(e,i),this.tsaaSampleIndex=0,this.forceTex=this.createFBO(e,i),this.velocity=this.createDoubleFBO(e,i),this.dye=this.createDoubleFBO(e,i),this.divergence=this.createFBO(e,i),this.pressure=this.createDoubleFBO(e,i),this.curl=this.createFBO(e,i),this.firstFrame=!0}reallocateAt(e,i){var u,h;if(e===this.simW&&i===this.simH&&this.juliaCur)return;const r=(u=this.dye)==null?void 0:u.read,s=(h=this.velocity)==null?void 0:h.read,a=this.juliaTsaa,o=this.createDoubleFBO(e,i),n=this.createDoubleFBO(e,i),l=this.createMrtFbo(e,i),c=this.createMrtFbo(e,i);r&&this.blitInto(r,o.read),s&&this.blitInto(s,n.read),a&&this.blitMrtInto(a,l),this.deleteDoubleFBO(this.dye),this.deleteDoubleFBO(this.velocity),this.deleteMrtFbo(this.juliaTsaa),this.deleteMrtFbo(this.juliaTsaaPrev),this.deleteMrtFbo(this.juliaCur),this.deleteMrtFbo(this.juliaPrev),this.deleteFBO(this.forceTex),this.deleteFBO(this.divergence),this.deleteDoubleFBO(this.pressure),this.deleteFBO(this.curl),this.simW=e,this.simH=i,this.dye=o,this.velocity=n,this.juliaTsaa=l,this.juliaTsaaPrev=c,this.juliaCur=this.createMrtFbo(e,i),this.juliaPrev=this.createMrtFbo(e,i),this.forceTex=this.createFBO(e,i),this.divergence=this.createFBO(e,i),this.pressure=this.createDoubleFBO(e,i),this.curl=this.createFBO(e,i),this.firstFrame=!0}blitInto(e,i){const r=this.gl;r.bindFramebuffer(r.FRAMEBUFFER,i.fbo),r.viewport(0,0,i.width,i.height),this.useProgram(this.progCopy),r.activeTexture(r.TEXTURE0),r.bindTexture(r.TEXTURE_2D,e.tex),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MIN_FILTER,r.LINEAR),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MAG_FILTER,r.LINEAR),r.uniform1i(this.progCopy.uniforms.uSource,0),this.drawQuad()}blitMrtInto(e,i){const r=this.gl;r.bindFramebuffer(r.FRAMEBUFFER,i.fbo),r.viewport(0,0,i.width,i.height),this.useProgram(this.progCopyMrt),r.activeTexture(r.TEXTURE0),r.bindTexture(r.TEXTURE_2D,e.texMain),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MIN_FILTER,r.LINEAR),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MAG_FILTER,r.LINEAR),r.uniform1i(this.progCopyMrt.uniforms.uSourceMain,0),r.activeTexture(r.TEXTURE1),r.bindTexture(r.TEXTURE_2D,e.texFx),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MIN_FILTER,r.LINEAR),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MAG_FILTER,r.LINEAR),r.uniform1i(this.progCopyMrt.uniforms.uSourceFx,1),this.drawQuad()}bindFBO(e){const i=this.gl;i.bindFramebuffer(i.FRAMEBUFFER,e.fbo),i.viewport(0,0,e.width,e.height)}useProgram(e){const i=this.gl;i.useProgram(e.prog),i.bindBuffer(i.ARRAY_BUFFER,this.quadVbo),i.enableVertexAttribArray(0),i.vertexAttribPointer(0,2,i.FLOAT,!1,0,0)}drawQuad(){this.gl.drawArrays(this.gl.TRIANGLE_STRIP,0,4)}setTexel(e,i,r){const s=this.gl,a=e.uniforms.uTexel;a&&s.uniform2f(a,1/i,1/r)}bindTex(e,i,r){const s=this.gl;s.activeTexture(s.TEXTURE0+e),s.bindTexture(s.TEXTURE_2D,i),r&&s.uniform1i(r,e)}setParams(e){this.params={...this.params,...e}}getAccumulationCount(){return this.tsaaSampleIndex}resetAccumulation(){this.tsaaSampleIndex=0}setGradientBuffer(e){this.gradients.setBuffer("main",e)}setCollisionGradientBuffer(e){this.gradients.setBuffer("collision",e)}setRenderSize(e,i){e=Math.max(32,Math.round(e)),i=Math.max(32,Math.round(i)),!(e===this.simW&&i===this.simH&&this.canvas.width===e&&this.canvas.height===i)&&((this.canvas.width!==e||this.canvas.height!==i)&&(this.canvas.width=e,this.canvas.height=i,this.bloom.markResize()),this.reallocateAt(e,i))}redraw(){this.displayToScreen();const e=this.gl;e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,null)}markFirstFrame(){this.firstFrame=!0}resetFluid(){const e=this.gl;for(const i of[this.velocity,this.dye,this.pressure])for(const r of[i.read,i.write])this.bindFBO(r),this.useProgram(this.progClear),e.uniform4f(this.progClear.uniforms.uValue,0,0,0,1),this.drawQuad();e.bindFramebuffer(e.FRAMEBUFFER,null),this.markFirstFrame()}splat(e,i,r,s,a,o,n){const l=this.gl;this.bindFBO(e.write),this.useProgram(this.progSplat),this.bindTex(0,e.read.tex,this.progSplat.uniforms.uTarget),l.uniform2f(this.progSplat.uniforms.uPoint,i,r),l.uniform3f(this.progSplat.uniforms.uValue,s[0],s[1],s[2]),l.uniform1f(this.progSplat.uniforms.uRadius,Math.max(1e-6,a*.5*(a*.5))),l.uniform1f(this.progSplat.uniforms.uDiscR,Math.max(1e-6,a)),l.uniform1f(this.progSplat.uniforms.uHardness,o),l.uniform1f(this.progSplat.uniforms.uAspect,this.simW/this.simH),l.uniform1f(this.progSplat.uniforms.uOp,n==="sub"?1:0),this.drawQuad(),e.swap()}brush(e,i,r,s,a,o,n,l,c){e=Math.max(0,Math.min(1,e)),i=Math.max(0,Math.min(1,i));const u=[a[0]*l,a[1]*l,a[2]*l],h=[r,s,0];switch(c){case"paint":this.splat(this.velocity,e,i,h,o,n,"add"),this.splat(this.dye,e,i,u,o,n,"add");break;case"erase":this.splat(this.dye,e,i,[l,l,l],o,n,"sub");break;case"stamp":this.splat(this.dye,e,i,u,o,n,"add");break;case"smudge":this.splat(this.velocity,e,i,h,o,n,"add");break}this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null)}ensureMaskReadFBO(){if(this.maskReadFBO)return;const e=this.gl,i=e.createTexture();e.bindTexture(e.TEXTURE_2D,i),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,this.MASK_CPU_W,this.MASK_CPU_H,0,e.RGBA,e.UNSIGNED_BYTE,null);const r=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,r),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,i,0),e.bindFramebuffer(e.FRAMEBUFFER,null),this.maskReadFBO={tex:i,fbo:r,width:this.MASK_CPU_W,height:this.MASK_CPU_H,texel:[1/this.MASK_CPU_W,1/this.MASK_CPU_H]},this.maskCpuBuf=new Uint8Array(this.MASK_CPU_W*this.MASK_CPU_H*4)}readMaskToCPU(){if(!this.params.collisionEnabled)return;const e=this.gl;this.ensureMaskReadFBO();const i=this.juliaReadFbo();e.bindFramebuffer(e.READ_FRAMEBUFFER,i.fbo),e.readBuffer(e.COLOR_ATTACHMENT1),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,this.maskReadFBO.fbo),e.blitFramebuffer(0,0,this.simW,this.simH,0,0,this.MASK_CPU_W,this.MASK_CPU_H,e.COLOR_BUFFER_BIT,e.LINEAR),e.readBuffer(e.COLOR_ATTACHMENT0),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.FRAMEBUFFER,this.maskReadFBO.fbo),e.readPixels(0,0,this.MASK_CPU_W,this.MASK_CPU_H,e.RGBA,e.UNSIGNED_BYTE,this.maskCpuBuf),e.bindFramebuffer(e.FRAMEBUFFER,null)}sampleMask(e,i){if(!this.params.collisionEnabled||this.maskCpuBuf.length===0)return 0;const r=this.MASK_CPU_W,s=this.MASK_CPU_H;if(e<0||e>1||i<0||i>1)return 0;const a=Math.min(r-1,Math.max(0,Math.floor(e*r))),o=Math.min(s-1,Math.max(0,Math.floor(i*s)));return this.maskCpuBuf[(o*r+a)*4+3]/255}renderJulia(){var c;const e=this.gl,i=this.params.tsaaSampleCap,r=!this.params.paused&&!this.forceFluidPaused;if(this.tsaaActive()&&i>0&&this.tsaaSampleIndex>=i&&!r)return;const s=this.juliaCur;this.juliaCur=this.juliaPrev,this.juliaPrev=s,this.juliaTimer.begin(),e.bindFramebuffer(e.FRAMEBUFFER,this.juliaCur.fbo),e.viewport(0,0,this.juliaCur.width,this.juliaCur.height),this.useProgram(this.progJulia),this.setTexel(this.progJulia,this.simW,this.simH),e.uniform1i(this.progJulia.uniforms.uKind,this.params.kind==="julia"?0:1),e.uniform2f(this.progJulia.uniforms.uJuliaC,this.params.juliaC[0],this.params.juliaC[1]),e.uniform2f(this.progJulia.uniforms.uCenter,this.params.center[0],this.params.center[1]),e.uniform1f(this.progJulia.uniforms.uScale,this.params.zoom),e.uniform1f(this.progJulia.uniforms.uAspect,this.simW/this.simH);const a=Math.max(4,this.params.maxIter|0);e.uniform1i(this.progJulia.uniforms.uMaxIter,a),e.uniform1i(this.progJulia.uniforms.uColorIter,Math.max(1,Math.min(a,this.params.colorIter|0))),e.uniform1f(this.progJulia.uniforms.uEscapeR2,this.params.escapeR*this.params.escapeR),e.uniform1f(this.progJulia.uniforms.uPower,this.params.power),e.uniform1i(this.progJulia.uniforms.uTrapMode,Wn(this.params.colorMapping)),e.uniform1i(this.progJulia.uniforms.uTrackAccum,Nn(this.params.colorMapping)?1:0),e.uniform1i(this.progJulia.uniforms.uTrackDeriv,Vn(this.params.colorMapping)?1:0),e.uniform2f(this.progJulia.uniforms.uTrapCenter,this.params.trapCenter[0],this.params.trapCenter[1]),e.uniform1f(this.progJulia.uniforms.uTrapRadius,this.params.trapRadius),e.uniform2f(this.progJulia.uniforms.uTrapNormal,this.params.trapNormal[0],this.params.trapNormal[1]),e.uniform1f(this.progJulia.uniforms.uTrapOffset,this.params.trapOffset),e.uniform1f(this.progJulia.uniforms.uStripeFreq,this.params.stripeFreq);const o=this.params.tsaaSampleCap,l=this.tsaaActive()&&(o<=0||this.tsaaSampleIndex<o)?this.params.tsaaJitterAmount:0;if(e.uniform1f(this.progJulia.uniforms.uJitterScale,l),e.uniform2f(this.progJulia.uniforms.uResolution,this.simW,this.simH),e.uniform1i(this.progJulia.uniforms.uFrameCount,this.frameCount),e.uniform1i(this.progJulia.uniforms.uPerFrameSamples,this.params.tsaaPerFrameSamples??1),e.uniform1i(this.progJulia.uniforms.uJitterMode,this.params.tsaaJitterMode==="grid"?1:0),e.uniform1i(this.progJulia.uniforms.uGridSize,this.params.tsaaGridSize??16),e.uniform1i(this.progJulia.uniforms.uTsaaSampleIndex,this.tsaaSampleIndex),e.uniform2f(this.progJulia.uniforms.uImageTileOrigin,this.bucketTileOrigin[0],this.bucketTileOrigin[1]),e.uniform2f(this.progJulia.uniforms.uImageTileSize,this.bucketTileSize[0],this.bucketTileSize[1]),e.uniform2f(this.progJulia.uniforms.uRegionMin,this.bucketRegionMin[0],this.bucketRegionMin[1]),e.uniform2f(this.progJulia.uniforms.uRegionMax,this.bucketRegionMax[0],this.bucketRegionMax[1]),this.blueNoise){this.bindTex(5,this.blueNoise.texture,this.progJulia.uniforms.uBlueNoiseTexture);const[u,h]=this.blueNoise.getResolution();e.uniform2f(this.progJulia.uniforms.uBlueNoiseResolution,u,h)}this.deepZoom.bindUniforms(this.progJulia,this.params,((c=this.blueNoise)==null?void 0:c.texture)??null),this.gradients.ensure("main"),this.gradients.ensure("collision"),this.bindTex(8,this.gradients.getTexture("main"),this.progJulia.uniforms.uGradient),this.bindTex(9,this.gradients.getTexture("collision"),this.progJulia.uniforms.uCollisionGradient),e.uniform1i(this.progJulia.uniforms.uColorMapping,vi(this.params.colorMapping)),e.uniform1f(this.progJulia.uniforms.uGradientRepeat,this.params.gradientRepeat),e.uniform1f(this.progJulia.uniforms.uGradientPhase,this.params.gradientPhase),e.uniform3f(this.progJulia.uniforms.uInteriorColor,this.params.interiorColor[0],this.params.interiorColor[1],this.params.interiorColor[2]),e.uniform1i(this.progJulia.uniforms.uCollisionEnabled,this.params.collisionEnabled?1:0),e.uniform1f(this.progJulia.uniforms.uCollisionRepeat,this.params.collisionRepeat),e.uniform1f(this.progJulia.uniforms.uCollisionPhase,this.params.collisionPhase),this.drawQuad(),this.juliaTimer.end()}getJuliaMs(){return this.juliaTimer.getMs()}hasGpuTimer(){return this.juliaTimer.available()}setForceFluidPaused(e){this.forceFluidPaused=e}setForceJuliaOnly(e){this.forceJuliaOnly=e}getCanvas(){return this.canvas}isForceJuliaOnly(){return this.forceJuliaOnly}isForceFluidPaused(){return this.forceFluidPaused}setBucketImageTile(e,i){this.bucketTileOrigin=[e[0],e[1]],this.bucketTileSize=[i[0],i[1]]}setBucketRegion(e,i){this.bucketRegionMin=[e[0],e[1]],this.bucketRegionMax=[i[0],i[1]]}runTsaaBlend(){const e=this.params.tsaaSampleCap;if(e>0&&this.tsaaSampleIndex>=e)return;const i=this.gl;this.tsaaSampleIndex=e>0?Math.min(this.tsaaSampleIndex+1,e):this.tsaaSampleIndex+1,i.bindFramebuffer(i.FRAMEBUFFER,this.juliaTsaaPrev.fbo),i.viewport(0,0,this.juliaTsaaPrev.width,this.juliaTsaaPrev.height),this.useProgram(this.progTsaaBlend),this.bindTex(0,this.juliaCur.texMain,this.progTsaaBlend.uniforms.uCurrentMain),this.bindTex(1,this.juliaCur.texFx,this.progTsaaBlend.uniforms.uCurrentFx),this.bindTex(2,this.juliaTsaa.texMain,this.progTsaaBlend.uniforms.uHistoryMain),this.bindTex(3,this.juliaTsaa.texFx,this.progTsaaBlend.uniforms.uHistoryFx),i.uniform1i(this.progTsaaBlend.uniforms.uSampleIndex,this.tsaaSampleIndex),this.drawQuad();const r=this.juliaTsaa;this.juliaTsaa=this.juliaTsaaPrev,this.juliaTsaaPrev=r}tsaaActive(){return this.params.tsaaSampleCap!==1}juliaReadFbo(){return this.tsaaActive()?this.juliaTsaa:this.juliaCur}updateTsaaHash(){const e=this.params,i=e.interiorColor,r=`${e.kind}|${e.juliaC[0]}|${e.juliaC[1]}|${e.center[0]}|${e.center[1]}|${e.zoom}|${e.power}|${e.maxIter}|${e.colorIter}|${e.escapeR}|${e.colorMapping}|${e.trapCenter[0]}|${e.trapCenter[1]}|${e.trapRadius}|${e.trapNormal[0]}|${e.trapNormal[1]}|${e.trapOffset}|${e.stripeFreq}|gr:${e.gradientRepeat}|gp:${e.gradientPhase}|ic:${i[0]},${i[1]},${i[2]}|ce:${e.collisionEnabled?1:0}|cr:${e.collisionRepeat}|cp:${e.collisionPhase}|gV:${this.gradients.version}|dz:${e.deepZoomEnabled?1:0}|dzV:${this.deepZoom.version}`;r!==this.tsaaParamHash&&(this.tsaaParamHash=r,this.tsaaSampleIndex=0)}computeForce(){const e=this.gl;this.bindFBO(this.forceTex),this.useProgram(this.progMotion),this.setTexel(this.progMotion,this.simW,this.simH);const i=this.juliaReadFbo();this.bindTex(0,i.texMain,this.progMotion.uniforms.uJulia),this.bindTex(1,this.juliaPrev.texMain,this.progMotion.uniforms.uJuliaPrev),this.bindTex(4,i.texFx,this.progMotion.uniforms.uJuliaFx),this.bindTex(5,i.texFx,this.progMotion.uniforms.uMask),this.bindTex(6,this.juliaPrev.texFx,this.progMotion.uniforms.uJuliaPrevFx),e.uniform1i(this.progMotion.uniforms.uMode,Jn(this.params.forceMode)),e.uniform1i(this.progMotion.uniforms.uSource,Xn(this.params.forceSource)),e.uniform1f(this.progMotion.uniforms.uGain,this.params.forceGain),e.uniform1f(this.progMotion.uniforms.uDt,this.params.dt),e.uniform1f(this.progMotion.uniforms.uInteriorDamp,this.params.interiorDamp),e.uniform1f(this.progMotion.uniforms.uEdgeMargin,this.params.edgeMargin),e.uniform1f(this.progMotion.uniforms.uForceCap,this.params.forceCap),e.uniform1i(this.progMotion.uniforms.uMaxIter,Math.max(1,this.params.maxIter|0)),this.drawQuad()}addForceToVelocity(){const e=this.gl;this.bindFBO(this.velocity.write),this.useProgram(this.progAddForce),this.setTexel(this.progAddForce,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progAddForce.uniforms.uVelocity),this.bindTex(1,this.forceTex.tex,this.progAddForce.uniforms.uForce),this.bindTex(2,this.juliaReadFbo().texFx,this.progAddForce.uniforms.uMask),e.uniform1f(this.progAddForce.uniforms.uDt,this.params.dt),this.drawQuad(),this.velocity.swap()}injectDye(){const e=this.gl;this.bindFBO(this.dye.write),this.useProgram(this.progInjectDye),this.setTexel(this.progInjectDye,this.simW,this.simH);const i=this.juliaReadFbo();this.bindTex(0,this.dye.read.tex,this.progInjectDye.uniforms.uDye),this.bindTex(1,i.texMain,this.progInjectDye.uniforms.uJulia),this.bindTex(4,i.texFx,this.progInjectDye.uniforms.uJuliaFx),this.bindTex(5,i.texFx,this.progInjectDye.uniforms.uMask),e.uniform1f(this.progInjectDye.uniforms.uDyeGain,this.params.dyeInject),e.uniform1f(this.progInjectDye.uniforms.uDyeFadeHz,this.params.dyeDissipation),e.uniform1f(this.progInjectDye.uniforms.uDt,this.params.dt),e.uniform1f(this.progInjectDye.uniforms.uEdgeMargin,this.params.edgeMargin),e.uniform1i(this.progInjectDye.uniforms.uDyeBlend,Ln(this.params.dyeBlend)),e.uniform1i(this.progInjectDye.uniforms.uDyeDecayMode,On(this.params.dyeDecayMode)),e.uniform1f(this.progInjectDye.uniforms.uDyeChromaFadeHz,this.params.dyeChromaDecayHz),e.uniform1f(this.progInjectDye.uniforms.uDyeSatBoost,this.params.dyeSaturationBoost),this.drawQuad(),this.dye.swap()}computeCurl(){this.bindFBO(this.curl),this.useProgram(this.progCurl),this.setTexel(this.progCurl,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progCurl.uniforms.uVelocity),this.drawQuad()}applyVorticity(){const e=this.gl;this.bindFBO(this.velocity.write),this.useProgram(this.progVorticity),this.setTexel(this.progVorticity,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progVorticity.uniforms.uVelocity),this.bindTex(1,this.curl.tex,this.progVorticity.uniforms.uCurl),e.uniform1f(this.progVorticity.uniforms.uStrength,this.params.vorticity),e.uniform1f(this.progVorticity.uniforms.uScale,this.params.vorticityScale),e.uniform1f(this.progVorticity.uniforms.uDt,this.params.dt),this.drawQuad(),this.velocity.swap()}computeDivergence(){this.bindFBO(this.divergence),this.useProgram(this.progDivergence),this.setTexel(this.progDivergence,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progDivergence.uniforms.uVelocity),this.drawQuad()}solvePressure(){const e=this.gl;this.bindFBO(this.pressure.read),e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT);for(let i=0;i<this.params.pressureIters;++i)this.bindFBO(this.pressure.write),this.useProgram(this.progPressure),this.setTexel(this.progPressure,this.simW,this.simH),this.bindTex(0,this.pressure.read.tex,this.progPressure.uniforms.uPressure),this.bindTex(1,this.divergence.tex,this.progPressure.uniforms.uDivergence),this.drawQuad(),this.pressure.swap()}subtractPressureGradient(){this.bindFBO(this.velocity.write),this.useProgram(this.progGradSub),this.setTexel(this.progGradSub,this.simW,this.simH),this.bindTex(0,this.pressure.read.tex,this.progGradSub.uniforms.uPressure),this.bindTex(1,this.velocity.read.tex,this.progGradSub.uniforms.uVelocity),this.bindTex(2,this.juliaReadFbo().texFx,this.progGradSub.uniforms.uMask),this.drawQuad(),this.velocity.swap()}advect(e,i){const r=this.gl;this.bindFBO(e.write),this.useProgram(this.progAdvect),this.setTexel(this.progAdvect,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progAdvect.uniforms.uVelocity),this.bindTex(1,e.read.tex,this.progAdvect.uniforms.uSource),this.bindTex(2,this.juliaReadFbo().texFx,this.progAdvect.uniforms.uMask),r.uniform1f(this.progAdvect.uniforms.uDt,this.params.dt),r.uniform1f(this.progAdvect.uniforms.uDissipation,i),r.uniform1f(this.progAdvect.uniforms.uEdgeMargin,this.params.edgeMargin),this.drawQuad(),e.swap()}reprojectTexture(e,i,r){const s=this.gl;this.bindFBO(e.write),this.useProgram(this.progReproject),this.setTexel(this.progReproject,this.simW,this.simH),this.bindTex(0,e.read.tex,this.progReproject.uniforms.uSource),s.uniform2f(this.progReproject.uniforms.uNewCenter,this.params.center[0],this.params.center[1]),s.uniform2f(this.progReproject.uniforms.uOldCenter,i[0],i[1]),s.uniform1f(this.progReproject.uniforms.uNewZoom,this.params.zoom),s.uniform1f(this.progReproject.uniforms.uOldZoom,r),s.uniform1f(this.progReproject.uniforms.uAspect,this.simW/this.simH),this.drawQuad(),e.swap()}maybeReprojectForCamera(){if(this.firstFrame){this.firstFrame=!1,this.lastCenter=[this.params.center[0],this.params.center[1]],this.lastZoom=this.params.zoom;return}const e=this.params.center[0]-this.lastCenter[0],i=this.params.center[1]-this.lastCenter[1],r=this.params.zoom-this.lastZoom;if(Math.abs(e)<1e-7&&Math.abs(i)<1e-7&&Math.abs(r)<1e-7)return;const s=[this.lastCenter[0],this.lastCenter[1]],a=this.lastZoom;this.reprojectTexture(this.dye,s,a),this.reprojectTexture(this.velocity,s,a),this.lastCenter=[this.params.center[0],this.params.center[1]],this.lastZoom=this.params.zoom}displayToScreen(){const e=this.gl;this.gradients.ensure("main");const r=this.params.bloomAmount>.001?this.bloom.process(this.canvas.width,this.canvas.height,this.params.bloomThreshold,()=>{this.setDisplayUniforms(null,!0),this.drawQuad()}):null;e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,this.canvas.width,this.canvas.height),this.setDisplayUniforms(r,!1),this.drawQuad()}setDisplayUniforms(e,i=!1){const r=this.gl;this.useProgram(this.progDisplay),r.uniform2f(this.progDisplay.uniforms.uTexelDisplay,1/this.canvas.width,1/this.canvas.height),r.uniform2f(this.progDisplay.uniforms.uTexelDye,1/this.simW,1/this.simH);const s=this.juliaReadFbo();this.bindTex(7,s.texFx,this.progDisplay.uniforms.uJuliaFx),this.bindTex(1,this.dye.read.tex,this.progDisplay.uniforms.uDye),this.bindTex(2,this.velocity.read.tex,this.progDisplay.uniforms.uVelocity),this.bindTex(3,this.gradients.getTexture("main"),this.progDisplay.uniforms.uGradient),this.bindTex(5,e??this.gradients.getTexture("main"),this.progDisplay.uniforms.uBloom),this.bindTex(6,s.texFx,this.progDisplay.uniforms.uMask);const a=this.forceJuliaOnly?"julia":this.params.show;r.uniform1i(this.progDisplay.uniforms.uShowMode,$n(a)),r.uniform1f(this.progDisplay.uniforms.uJuliaMix,this.params.juliaMix),r.uniform1f(this.progDisplay.uniforms.uDyeMix,this.params.dyeMix),r.uniform1f(this.progDisplay.uniforms.uVelocityViz,this.params.velocityViz),r.uniform1i(this.progDisplay.uniforms.uColorMapping,vi(this.params.colorMapping)),r.uniform1f(this.progDisplay.uniforms.uGradientRepeat,this.params.gradientRepeat),r.uniform1f(this.progDisplay.uniforms.uGradientPhase,this.params.gradientPhase),r.uniform3f(this.progDisplay.uniforms.uInteriorColor,this.params.interiorColor[0],this.params.interiorColor[1],this.params.interiorColor[2]),i?(r.uniform1i(this.progDisplay.uniforms.uToneMapping,0),r.uniform1f(this.progDisplay.uniforms.uExposure,1),r.uniform1f(this.progDisplay.uniforms.uVibrance,0),r.uniform1f(this.progDisplay.uniforms.uBloomAmount,0),r.uniform1f(this.progDisplay.uniforms.uAberration,0),r.uniform1f(this.progDisplay.uniforms.uRefraction,0),r.uniform1f(this.progDisplay.uniforms.uRefractSmooth,1),r.uniform1f(this.progDisplay.uniforms.uRefractRoughness,0),r.uniform1f(this.progDisplay.uniforms.uCaustics,0),r.uniform1i(this.progDisplay.uniforms.uCollisionPreview,0)):(r.uniform1i(this.progDisplay.uniforms.uToneMapping,Un(this.params.toneMapping)),r.uniform1f(this.progDisplay.uniforms.uExposure,this.params.exposure),r.uniform1f(this.progDisplay.uniforms.uVibrance,this.params.vibrance),r.uniform1f(this.progDisplay.uniforms.uBloomAmount,e?this.params.bloomAmount:0),r.uniform1f(this.progDisplay.uniforms.uAberration,this.params.aberration),r.uniform1f(this.progDisplay.uniforms.uRefraction,this.params.refraction),r.uniform1f(this.progDisplay.uniforms.uRefractSmooth,this.params.refractSmooth),r.uniform1f(this.progDisplay.uniforms.uRefractRoughness,this.params.refractRoughness),r.uniform1f(this.progDisplay.uniforms.uCaustics,this.params.caustics),r.uniform1i(this.progDisplay.uniforms.uCollisionPreview,this.params.collisionPreview?1:0))}frame(e){const i=this.gl,r=this.lastTimeMs===0?.016:Math.max(0,Math.min(.05,(e-this.lastTimeMs)/1e3));this.lastTimeMs=e,this.params.dt=r*this.params.timeScale,this.updateTsaaHash(),this.frameCount++,this.tsaaActive()&&this.params.tsaaSampleCap>0&&this.tsaaSampleIndex>=this.params.tsaaSampleCap||(this.renderJulia(),this.tsaaActive()&&this.runTsaaBlend()),this.readMaskToCPU(),!this.params.paused&&!this.forceFluidPaused&&(this.maybeReprojectForCamera(),this.computeForce(),this.addForceToVelocity(),this.params.vorticity>0&&(this.computeCurl(),this.applyVorticity()),this.computeDivergence(),this.solvePressure(),this.subtractPressureGradient(),this.advect(this.velocity,this.params.dissipation),this.injectDye(),this.advect(this.dye,this.params.dyeDissipation)),this.displayToScreen(),i.activeTexture(i.TEXTURE0),i.bindTexture(i.TEXTURE_2D,null),this.juliaTimer.poll(),this.onFrameEnd&&this.onFrameEnd()}dispose(){const e=this.gl;this.deepZoom.dispose(),this.juliaTimer.dispose(),this.deleteMrtFbo(this.juliaCur),this.deleteMrtFbo(this.juliaPrev),this.deleteMrtFbo(this.juliaTsaa),this.deleteMrtFbo(this.juliaTsaaPrev),this.deleteFBO(this.forceTex),this.deleteDoubleFBO(this.velocity),this.deleteDoubleFBO(this.dye),this.deleteFBO(this.divergence),this.deleteDoubleFBO(this.pressure),this.deleteFBO(this.curl),this.maskReadFBO&&(this.deleteFBO(this.maskReadFBO),this.maskReadFBO=null),this.gradients.dispose(),this.bloom.dispose(),e.deleteBuffer(this.quadVbo);for(const i of[this.progJulia,this.progMotion,this.progAddForce,this.progInjectDye,this.progAdvect,this.progDivergence,this.progCurl,this.progVorticity,this.progPressure,this.progGradSub,this.progSplat,this.progDisplay,this.progClear,this.progReproject,this.progTsaaBlend])i!=null&&i.prog&&e.deleteProgram(i.prog);this.blueNoise&&(e.deleteTexture(this.blueNoise.texture),this.blueNoise=null)}canvasToFractal(e,i){const r=this.canvas.getBoundingClientRect(),s=(e-r.left)/r.width,a=1-(i-r.top)/r.height,o=this.canvas.width/this.canvas.height,n=(s*2-1)*o*this.params.zoom+this.params.center[0],l=(a*2-1)*this.params.zoom+this.params.center[1];return[n,l]}canvasToUv(e,i){const r=this.canvas.getBoundingClientRect();return[(e-r.left)/r.width,1-(i-r.top)/r.height]}}function Jn(t){switch(t){case"gradient":return 0;case"curl":return 1;case"iterate":return 2;case"c-track":return 3;case"hue":return 4}}function Xn(t){switch(t){case"de":return 0;case"smoothPot":return 1;case"stripe":return 2;case"paletteLuma":return 3;case"mask":return 4}}function $n(t){switch(t){case"composite":return 0;case"julia":return 1;case"dye":return 2;case"velocity":return 3}}const qn=t=>{Qe.register({id:"fluid-toy.pause",key:"Space",description:"Pause / resume the fluid simulation",category:"Playback",handler:()=>{var i;const e=F.getState();e.setFluidSim({paused:!((i=e.fluidSim)!=null&&i.paused)})}}),Qe.register({id:"fluid-toy.reset",key:"R",description:"Reset fluid fields (dye + velocity → zero)",category:"Playback",handler:()=>{var e;(e=t.current)==null||e.resetFluid()}}),Qe.register({id:"fluid-toy.orbit-toggle",key:"O",description:"Toggle Julia-c auto-orbit",category:"Simulation",handler:()=>{var i;const e=F.getState();e.setCoupling({orbitEnabled:!((i=e.coupling)!=null&&i.orbitEnabled)})}}),Qe.register({id:"fluid-toy.home",key:"Home",description:"Recenter view (center=[0,0], zoom=1.5)",category:"View",handler:()=>{F.getState().setJulia({center:{x:0,y:0},zoom:1.5})}})},Zn=t=>{const e=k.useRef(null),i=k.useRef(null);return k.useEffect(()=>{const r=t.current;if(r){try{const s=new Gn(r,{onFrameEnd:()=>gs.frameTick()});e.current=s,$e.ref.current=s;let a=-1,o=0,n=-1,l=!1;const c=u=>{const h=a<0?0:Math.min(.1,(u-a)/1e3);if(a=u,e.current){const p=Re.ref.current;Ea(Pe.ref.current.runtime,{dtSec:h,wallClockMs:u,dragging:p.dragging,cursorUv:p.uv,cursorVelUv:p.velUv,params:Xt(),engine:e.current});const m=Ue.getState(),b=m.deterministicPlayback&&m.isPlaying;b&&!l&&m.currentFrame<1&&(e.current.resetFluid(),e.current.resetAccumulation()),l=m.isPlaying;const f=b?m.currentFrame*1e3/Math.max(1,m.fps):u;if(e.current.frame(f),u-o>100){const y=e.current.getAccumulationCount();y!==n&&(F.getState().reportAccumulation(y),n=y),o=u}}i.current=requestAnimationFrame(c)};i.current=requestAnimationFrame(c)}catch(s){console.error("[FluidToy] failed to start engine:",s)}return qn(e),()=>{var s;i.current!==null&&cancelAnimationFrame(i.current),(s=e.current)==null||s.dispose(),e.current=null,$e.ref.current=null}}},[]),e},Kn=t=>{const e=re("julia"),i=re("deepZoom"),r=re("coupling"),s=re("palette"),a=re("collision"),o=re("fluidSim"),n=re("postFx"),l=re("composite"),c=Hi(),u=k.useMemo(()=>Fe(r,"coupling",c),[r,c]),h=k.useMemo(()=>Fe(s,"palette",c),[s,c]),p=k.useMemo(()=>Fe(a,"collision",c),[a,c]),m=k.useMemo(()=>Fe(o,"fluidSim",c),[o,c]),b=k.useMemo(()=>Fe(n,"postFx",c),[n,c]),f=k.useMemo(()=>Fe(l,"composite",c),[l,c]);k.useEffect(()=>{const y=t.current;y&&ha(y,e,c)},[e,t]),k.useEffect(()=>{const y=t.current;y&&fa(y,e,c)},[e,c,t]),k.useEffect(()=>{const y=t.current;y&&ga(y,i,e)},[i,e,t]),k.useEffect(()=>{const y=t.current;y&&Ja(y,h)},[h,t]),k.useEffect(()=>{const y=t.current;y&&qa(y,p)},[p,t]),k.useEffect(()=>{const y=t.current;y&&Ka(y,m,u)},[m,u,t]),k.useEffect(()=>{const y=t.current;y&&ro(y,b)},[b,t]),k.useEffect(()=>{const y=t.current;y&&no(y,f)},[f,t])};class Qn{constructor(){x(this,"worker",null);x(this,"nextId",1);x(this,"pending",new Map)}ensureWorker(){if(this.worker)return this.worker;const e=new Worker(new URL(""+new URL("deepZoomWorker-CEHSx2aH.js",import.meta.url).href,import.meta.url),{type:"module"});return e.onmessage=i=>{const r=i.data,s=this.pending.get(r.id);s&&(this.pending.delete(r.id),r.type==="orbit"?s.resolve({orbit:new Float32Array(r.orbit),length:r.length,escaped:r.escaped,precisionBits:r.precisionBits,buildMs:r.buildMs,laBuildMs:r.laBuildMs??0,laTable:r.laTable?new Float32Array(r.laTable):void 0,laStages:r.laStages?new Float32Array(r.laStages):void 0,laCount:r.laCount??0,laStageCount:r.laStageCount??0,at:r.at}):s.reject(new Error(r.message)))},e.onerror=i=>{var s;const r=new Error(`deep-zoom worker crashed: ${i.message}`);for(const a of this.pending.values())a.reject(r);this.pending.clear(),(s=this.worker)==null||s.terminate(),this.worker=null},this.worker=e,e}computeReferenceOrbit(e){const i=this.ensureWorker(),r=this.nextId++;return new Promise((s,a)=>{this.pending.set(r,{resolve:s,reject:a});const o={type:"computeOrbit",id:r,...e};i.postMessage(o)})}cancel(e){if(!this.worker)return;const i={type:"cancel",id:e};this.worker.postMessage(i),this.pending.delete(e)}dispose(){this.worker&&(this.worker.terminate(),this.worker=null),this.pending.clear()}}let bt=null;const Yn=()=>(bt||(bt=new Qn),bt),el=t=>{var a,o;const e=re("julia"),i=re("deepZoom"),r=Hi(),s=F(n=>n.canvasPixelSize);k.useEffect(()=>{var E,v;if(!i.enabled){Yo();return}const n=t.current;if(!n)return;const l=Yn();let c=!1;const u=performance.now(),h=[e.center.x,e.center.y],p=[((E=e.centerLow)==null?void 0:E.x)??0,((v=e.centerLow)==null?void 0:v.y)??0],m=s[0]/Math.max(1,s[1]),b=(m*m+1)*e.zoom*e.zoom,f=Math.max(2,Math.round(e.power??2)),y=f===2,C=e.kind===0?"julia":"mandelbrot",A=r["julia.juliaC_x"]??e.juliaC.x,O=r["julia.juliaC_y"]??e.juliaC.y;return l.computeReferenceOrbit({centerX:h[0],centerY:h[1],centerLowX:p[0],centerLowY:p[1],zoom:e.zoom,maxIter:i.maxRefIter,power:f,kind:C,juliaCx:A,juliaCy:O,buildLA:i.useLA&&y&&C==="mandelbrot",screenSqrRadius:i.useAT&&y&&C==="mandelbrot"?b:0}).then(T=>{if(c)return;const B=n.deepZoom;B.setReferenceOrbit(T.orbit,T.length,h,p),T.laTable&&T.laStages&&T.laCount>0?(B.setLATable(T.laTable,T.laCount,T.laStages),B.setLAEnabled(!0)):(B.clearLATable(),B.setLAEnabled(!1)),T.at?B.setAT({stepLength:T.at.stepLength,thresholdC:T.at.thresholdC,sqrEscapeRadius:T.at.sqrEscapeRadius,refC:[T.at.refCRe,T.at.refCIm],ccoeff:[T.at.ccoeffRe,T.at.ccoeffIm],invZCoeff:[T.at.invZCoeffRe,T.at.invZCoeffIm]}):B.clearAT(),n.redraw();const j=[];if(T.laStages)for(let z=0;z<T.laStages.length;z+=2)j.push(T.laStages[z+1]);if(ur({orbitLength:T.length,precisionBits:T.precisionBits,orbitBuildMs:T.buildMs,laStageCount:T.laStageCount,laCount:T.laCount,laBuildMs:T.laBuildMs,laStagesPerLevel:j,juliaMs:0}),i.showStats){const z=performance.now()-u;console.log(`[deepZoom] orbit len=${T.length} prec=${T.precisionBits}b LA stages=${T.laStageCount} nodes=${T.laCount} (orbit=${T.buildMs.toFixed(1)}ms LA=${T.laBuildMs.toFixed(1)}ms total=${z.toFixed(1)}ms)`)}}).catch(T=>{c||console.error("[deepZoom] build failed:",T.message)}),()=>{c=!0}},[i.enabled,i.useLA,i.useAT,i.maxRefIter,i.showStats,e.center.x,e.center.y,(a=e.centerLow)==null?void 0:a.x,(o=e.centerLow)==null?void 0:o.y,e.zoom,e.power,e.kind,e.juliaC.x,e.juliaC.y,s,t]),k.useEffect(()=>{if(!i.enabled)return;const n=()=>{const c=t.current;c&&Qo(c.getJuliaMs())},l=window.setInterval(n,200);return()=>window.clearInterval(l)},[i.enabled,t])},tl=()=>{const t=F(v=>v.panels),e=F(v=>v.contextMenu),i=F(v=>v.handleInteractionStart),r=F(v=>v.handleInteractionEnd),s=F(v=>v.openContextMenu),a=F(v=>v.closeContextMenu),o=F(v=>v.togglePanel),n=F(v=>v.openHelp),l=k.useRef(null),c=Zn(l),u=Object.values(t).filter(v=>v.location==="float"&&v.isOpen),h=k.useMemo(()=>({handleInteractionStart:i,handleInteractionEnd:r,openContextMenu:s}),[i,r,s]),p=F(v=>v.canvasPixelSize),m=F(v=>v.resolutionMode),b=F(v=>v.fixedResolution),f=F(v=>v.renderScale),y=Vi();bs();const C=F(v=>v.accumulation),A=F(v=>v.isPaused),O=F(v=>v.sampleCap);Kn(c),el(c);const E=re("deepZoom").enabled;return k.useEffect(()=>{const v=c.current;if(!v)return;const T=C??!0?O:1;v.setParams({tsaaSampleCap:T,paused:A})},[C,A,O]),k.useEffect(()=>{const v=c.current;if(!v)return;const T=window.devicePixelRatio||1,[B,j]=m==="Fixed"?b:[p[0]/T,p[1]/T];if(B<1||j<1)return;const z=Math.max(1,Math.round(B*f*y)),D=Math.max(1,Math.round(j*f*y));v.setRenderSize(z,D),v.redraw()},[p,m,b,f,y]),d.jsx(xs,{value:h,children:d.jsxs("div",{className:"fixed inset-0 w-full h-full bg-black text-white select-none overflow-hidden flex flex-col",children:[d.jsx(ys,{}),d.jsx(Os,{}),d.jsx(vs,{}),u.map(v=>d.jsx(Wi,{id:v.id,title:v.id,children:d.jsx(ws,{activeTab:v.id,state:F.getState(),actions:F.getState(),onSwitchTab:T=>o(T,!0)})},v.id)),d.jsx(Ts,{}),d.jsxs("div",{className:"flex-1 flex overflow-hidden relative",children:[d.jsx(oi,{side:"left"}),d.jsxs(Is,{className:"flex-1",children:[d.jsx("canvas",{ref:l,className:"absolute inset-0 w-full h-full block touch-none"}),d.jsx(qo,{canvasRef:l,engineRef:c}),d.jsx(Us,{}),d.jsx(Zo,{}),E&&d.jsxs("div",{style:{position:"absolute",left:8,bottom:8,pointerEvents:"none",zIndex:5,minWidth:220},children:[d.jsx(tn,{}),d.jsx(cn,{engineRef:c})]})]}),d.jsx(oi,{side:"right"})]}),d.jsx(Cs,{}),d.jsx(Ls,{}),e.visible&&d.jsx(Ss,{x:e.x,y:e.y,items:e.items,targetHelpIds:e.targetHelpIds,onClose:a,onOpenHelp:n})]})})},il=[{id:"View",dock:"left",order:0,active:!0,items:[{type:"widget",id:"panel-views"}]},{id:"Fractal",dock:"left",order:1,showIf:()=>!1,items:[{type:"section",label:"Shape"},{type:"feature",id:"julia",whitelistParams:["kind","juliaC","power"]},{type:"section",label:"Iteration"},{type:"feature",id:"julia",whitelistParams:["maxIter"]}]},{id:"Deep Zoom",dock:"left",order:2,features:["deepZoom"]},{id:"Palette",dock:"left",order:3,items:[{type:"section",label:"Mode + LUT"},{type:"feature",id:"palette",whitelistParams:["colorMapping","gradient","interiorColor"]},{type:"section",label:"Tiling"},{type:"feature",id:"palette",whitelistParams:["gradientRepeat","gradientPhase"]},{type:"section",label:"Trap shape"},{type:"feature",id:"palette",whitelistParams:["trapCenter","trapRadius","trapNormal","trapOffset"]},{type:"section",label:"Stripe"},{type:"feature",id:"palette",whitelistParams:["stripeFreq"]},{type:"section",label:"Iteration"},{type:"feature",id:"palette",whitelistParams:["colorIter","escapeR"]}]},{id:"Modulation",dock:"left",order:4,items:[{type:"widget",id:"lfo-list"}]},{id:"Presets",dock:"left",order:5,features:["presets"]},{id:"Coupling",dock:"right",order:0,active:!0,items:[{type:"section",label:"Driver"},{type:"feature",id:"coupling",whitelistParams:["forceMode","forceSource"]},{type:"section",label:"Intensity"},{type:"feature",id:"coupling",whitelistParams:["forceGain","forceCap","interiorDamp","edgeMargin"]}]},{id:"Fluid",dock:"right",order:1,items:[{type:"section",label:"Sim"},{type:"feature",id:"fluidSim",whitelistParams:["vorticity","vorticityScale","dissipation","pressureIters"]},{type:"section",label:"Time"},{type:"feature",id:"fluidSim",whitelistParams:["paused","timeScale"]},{type:"section",label:"Dye injection"},{type:"feature",id:"fluidSim",whitelistParams:["dyeInject","dyeBlend"]},{type:"section",label:"Dye decay"},{type:"feature",id:"fluidSim",whitelistParams:["dyeDecayMode","dyeDissipation","dyeChromaDecayHz","dyeSaturationBoost"]}]},{id:"Collision",dock:"right",order:2,features:["collision"]},{id:"Brush",dock:"right",order:3,items:[{type:"section",label:"Stamp"},{type:"feature",id:"brush",whitelistParams:["mode","colorMode","solidColor","size","hardness","strength"]},{type:"section",label:"Stroke"},{type:"feature",id:"brush",whitelistParams:["flow","spacing","jitter"]},{type:"section",label:"Particle emitter"},{type:"feature",id:"brush",whitelistParams:["particleEmitter","particleRate","particleVelocity","particleSpread","particleGravity","particleDrag","particleLifetime","particleSizeScale"]}]},{id:"Post-FX",dock:"right",order:4,items:[{type:"section",label:"Tone"},{type:"feature",id:"postFx",whitelistParams:["toneMapping","exposure","vibrance"]},{type:"section",label:"Bloom"},{type:"feature",id:"postFx",whitelistParams:["bloomAmount","bloomThreshold"]},{type:"section",label:"Glass"},{type:"feature",id:"postFx",whitelistParams:["refraction","refractSmooth","refractRoughness","caustics"]},{type:"section",label:"Velocity"},{type:"feature",id:"postFx",whitelistParams:["aberration"]}]},{id:"Composite",dock:"right",order:5,items:[{type:"section",label:"Show"},{type:"feature",id:"composite",whitelistParams:["show"]},{type:"section",label:"Mix"},{type:"feature",id:"composite",whitelistParams:["juliaMix","dyeMix","velocityViz"]}]}],rl=()=>{ks(il),F.getState().setDockCollapsed("left",!1)};function sl(t,e){if(typeof OffscreenCanvas<"u"){const s=new OffscreenCanvas(t,e),a=s.getContext("2d");if(!a)throw new Error("OffscreenCanvas 2D context unavailable");return{canvas:s,ctx:a,convertToBlob:()=>s.convertToBlob({type:"image/png"})}}const i=document.createElement("canvas");i.width=t,i.height=e;const r=i.getContext("2d");if(!r)throw new Error("Canvas 2D context unavailable");return{canvas:i,ctx:r,convertToBlob:()=>new Promise((s,a)=>{i.toBlob(o=>{o?s(o):a(new Error("canvas.toBlob returned null"))},"image/png")})}}class al{constructor(e){x(this,"engineRef");x(this,"cancelled",!1);x(this,"running",!1);this.engineRef=e}get accumulationCount(){var e;return((e=this.engineRef())==null?void 0:e.getAccumulationCount())??0}startBucketRender(e,i){if(this.running)return;const r=this.engineRef();r&&(this.running=!0,this.cancelled=!1,this.runLoop(r,e,i))}stopBucketRender(){this.cancelled=!0}buildTiles(e,i,r,s){const a=[];for(let o=0;o<s;o++)for(let n=0;n<r;n++){const l=Math.floor(n*e/r),c=Math.floor(o*i/s),u=n===r-1?e:Math.floor((n+1)*e/r),h=o===s-1?i:Math.floor((o+1)*i/s);a.push({col:n,row:o,pixelX:l,pixelY:c,pixelW:u-l,pixelH:h-c})}return a}buildSubBuckets(e,i,r){const s=Math.max(64,Math.floor(r)),a=Math.ceil(e/s),o=Math.ceil(i/s),n=[];for(let l=0;l<o;l++)for(let c=0;c<a;c++){const u=c*s,h=l*s,p=Math.min(e,(c+1)*s),m=Math.min(i,(l+1)*s);n.push({pixelX:u,pixelY:h,pixelW:p-u,pixelH:m-h})}return n.sort((l,c)=>{const u=(l.pixelX+l.pixelW*.5)/e-.5,h=(l.pixelY+l.pixelH*.5)/i-.5,p=(c.pixelX+c.pixelW*.5)/e-.5,m=(c.pixelY+c.pixelH*.5)/i-.5;return u*u+h*h-(p*p+m*m)}),n}buildFilename(e,i,r,s,a,o,n){const l=`${r}x${s}`;if(o*n<=1)return kt(e,i,"png",l);const c=(m,b)=>String(m).padStart(b,"0"),u=Math.max(2,String(n-1).length),h=Math.max(2,String(o-1).length),p=`_r${c(a.row,u)}c${c(a.col,h)}`;return kt(e,i,"png",`${l}${p}`)}emitStatus(e,i,r=0,s=0){ss.emit(as.BUCKET_STATUS,{isRendering:i,progress:e,totalBuckets:r,currentBucket:s})}async runLoop(e,i,r){var T;const s=e.getCanvas(),a=s.width,o=s.height,n=e.isForceJuliaOnly(),l=e.isForceFluidPaused(),c=Math.max(1,Math.floor(r.outputWidth)),u=Math.max(1,Math.floor(r.outputHeight)),h=Math.max(1,Math.floor(r.tileCols)),p=Math.max(1,Math.floor(r.tileRows)),m=Math.max(1,r.samplesPerBucket??64),b=Math.max(64,Math.floor(r.bucketSize??512)),f=this.buildTiles(c,u,h,p),y=this.buildSubBuckets(f[0].pixelW,f[0].pixelH,b).length,C=f.length*y;let A=0;const E=((T=F.getState().projectSettings)==null?void 0:T.name)??"fluid-toy",v=1;e.setForceJuliaOnly(!0),e.setForceFluidPaused(!0),this.emitStatus(0,!0,C,0);try{for(let B=0;B<f.length&&!this.cancelled;B++){const j=f[B],z=j.pixelW,D=j.pixelH,N=[j.pixelX/c,j.pixelY/u],I=[z/c,D/u],R=i?sl(z,D):null,H=this.buildSubBuckets(z,D,b);for(const U of H){if(this.cancelled)break;const V=[U.pixelX/z,U.pixelY/D],G=[U.pixelW/z,U.pixelH/D],K=[N[0]+I[0]*V[0],N[1]+I[1]*V[1]],ce=[I[0]*G[0],I[1]*G[1]];e.setBucketImageTile(K,ce),e.setBucketRegion([0,0],[1,1]),e.setRenderSize(U.pixelW,U.pixelH),e.resetAccumulation();const Te=m*4+32;let Ke=0;for(;e.getAccumulationCount()<m&&Ke<Te&&!this.cancelled;)await ol(16),Ke++;if(this.cancelled)break;R&&R.ctx.drawImage(s,U.pixelX,U.pixelY),A++,this.emitStatus(A/C*100,!0,C,A)}if(this.cancelled)break;if(i&&R){const U=await R.convertToBlob(),V=this.buildFilename(E,v,c,u,j,h,p),G=URL.createObjectURL(U),K=document.createElement("a");K.download=V,K.href=G,K.click(),URL.revokeObjectURL(G)}}}finally{e.setBucketImageTile([0,0],[1,1]),e.setBucketRegion([0,0],[1,1]),e.setRenderSize(a,o),e.setForceJuliaOnly(n),e.setForceFluidPaused(l),e.resetAccumulation(),this.running=!1,this.cancelled=!1,this.emitStatus(0,!1)}}}const ol=t=>new Promise(e=>setTimeout(e,t)),nl=()=>{const t=Vi();return d.jsxs("span",{className:"text-[10px] text-white/40 font-mono pointer-events-none",children:["q",(t*100).toFixed(0),"%"]})},q=({children:t})=>d.jsx("span",{className:"inline-block px-1 py-px text-[9px] font-mono border border-white/20 rounded bg-white/10 text-white/90 mx-0.5",children:t}),ll=()=>{const[t,e]=k.useState(!0);return t?d.jsxs("div",{className:"px-3 py-2 text-[10px] text-gray-300 bg-black/70 rounded border border-white/10 max-w-[360px] pointer-events-auto shadow-xl",children:[d.jsxs("div",{className:"flex items-center justify-between mb-1",children:[d.jsx("div",{className:"text-[10px] uppercase text-cyan-300 tracking-wide",children:"Hotkeys"}),d.jsx("button",{onClick:()=>e(!1),className:"text-gray-500 hover:text-gray-200 text-[12px] px-1 leading-none",title:"Hide (click ? to reopen)",children:"×"})]}),d.jsxs("ul",{className:"space-y-0.5 leading-snug",children:[d.jsxs("li",{children:[d.jsx(q,{children:"Drag"})," inject force + dye into the fluid"]}),d.jsxs("li",{children:[d.jsx(q,{children:"B"}),"+",d.jsx(q,{children:"Drag"})," resize the brush live (horizontal = scale)"]}),d.jsxs("li",{children:[d.jsx(q,{children:"C"}),"+",d.jsx(q,{children:"Drag"})," pick Julia c directly on the canvas"]}),d.jsxs("li",{children:[d.jsx(q,{children:"Right-click"}),"+",d.jsx(q,{children:"Drag"})," pan the fractal view"]}),d.jsxs("li",{children:[d.jsx(q,{children:"Right-click"})," (tap) canvas for quick actions menu"]}),d.jsxs("li",{children:[d.jsx(q,{children:"Shift"}),"/",d.jsx(q,{children:"Alt"})," precision modifiers (5× / 0.2×) for any drag"]}),d.jsxs("li",{children:[d.jsx(q,{children:"Wheel"})," zoom · ",d.jsx(q,{children:"Middle"}),"+",d.jsx(q,{children:"Drag"})," smooth zoom · ",d.jsx(q,{children:"Home"})," recenter"]}),d.jsxs("li",{children:[d.jsx(q,{children:"Space"})," pause sim · ",d.jsx(q,{children:"R"})," clear fluid · ",d.jsx(q,{children:"O"})," toggle c-orbit · ",d.jsx(q,{children:"H"})," hide hints"]})]})]}):d.jsx("button",{onClick:()=>e(!0),className:"px-2 py-1 text-[10px] text-cyan-300 bg-black/50 rounded border border-white/10 hover:bg-black/70 pointer-events-auto",title:"Show hotkeys",children:"? hotkeys"})},je=(t,e,i)=>t+(e-t)*i,cl=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,$t=()=>{const t=F.getState().julia;return{kind:t.kind,juliaC:{...t.juliaC},center:{...t.center},zoom:t.zoom,maxIter:t.maxIter,power:t.power}},ul=500;let ze=null;const dl=t=>{const e=F.getState().setJulia;if(!e)return;ze!==null&&(cancelAnimationFrame(ze),ze=null);const i=$t();e({kind:t.kind,maxIter:t.maxIter});const r=Math.log(Math.max(i.zoom,1e-12)),s=Math.log(Math.max(t.zoom,1e-12)),a=performance.now(),o=()=>{const n=(performance.now()-a)/ul;if(n>=1){e({center:{x:t.center.x,y:t.center.y},juliaC:{x:t.juliaC.x,y:t.juliaC.y},zoom:t.zoom,power:t.power}),ze=null;return}const l=cl(n);e({center:{x:je(i.center.x,t.center.x,l),y:je(i.center.y,t.center.y,l)},juliaC:{x:je(i.juliaC.x,t.juliaC.x,l),y:je(i.juliaC.y,t.juliaC.y,l)},zoom:Math.exp(je(r,s,l)),power:je(i.power,t.power,l)}),ze=requestAnimationFrame(o)};ze=requestAnimationFrame(o)},pl=t=>{dl(t)},hl=t=>{const e=$t();return e.kind!==t.kind||e.maxIter!==t.maxIter||e.power!==t.power||Math.abs(e.zoom-t.zoom)>1e-5||Math.abs(e.center.x-t.center.x)+Math.abs(e.center.y-t.center.y)>1e-4||Math.abs(e.juliaC.x-t.juliaC.x)+Math.abs(e.juliaC.y-t.juliaC.y)>1e-4},fl=async()=>{try{const t=document.querySelector("canvas");if(!t)return;const e=128,i=document.createElement("canvas");i.width=e,i.height=e;const r=i.getContext("2d");if(!r)return;const s=Math.min(t.width,t.height),a=(t.width-s)/2,o=(t.height-s)/2;return r.drawImage(t,a,o,s,s,0,0,e,e),i.toDataURL("image/jpeg",.7)}catch{return}},ml=()=>{const t=F.getState().setJulia;t&&t({center:{x:0,y:0},zoom:1.5})},gl=[{label:"Mandelbrot · Home",state:{kind:1,juliaC:{x:-.7,y:.27015},center:{x:-.5,y:0},zoom:1.5,maxIter:256,power:2}},{label:"Julia · Classic",state:{kind:0,juliaC:{x:-.7,y:.27015},center:{x:0,y:0},zoom:1.5,maxIter:256,power:2}},{label:"Julia · Dendrite",state:{kind:0,juliaC:{x:0,y:1},center:{x:0,y:0},zoom:1.5,maxIter:256,power:2}},{label:"Julia · San Marco",state:{kind:0,juliaC:{x:-.75,y:0},center:{x:0,y:0},zoom:1.5,maxIter:256,power:2}},{label:"Mandelbrot · Seahorse Valley",state:{kind:1,juliaC:{x:0,y:0},center:{x:-.75,y:.1},zoom:.15,maxIter:384,power:2}}],bl=()=>{if((F.getState().savedViews??[]).length>0)return;const i=gl.map(({label:s,state:a})=>({id:os(),label:s,state:a,createdAt:Date.now()}));F.setState({savedViews:i});const r=F.getState().selectView;r==null||r(i[0].id)},xl=()=>{Js({panelId:"View",arrayKey:"savedViews",activeIdKey:"activeViewId",actions:{add:"addView",update:"updateView",delete:"deleteView",duplicate:"duplicateView",select:"selectView",reorder:"reorderViews",saveToSlot:"saveViewToSlot",reset:"resetView"},defaultLabelPrefix:"View",capture:$t,apply:pl,isModified:hl,captureThumbnail:fl,onReset:ml,slotShortcuts:{count:9,category:"Views"},menu:{menuId:"camera",slot:"right",order:29,icon:ns,title:"Camera",align:"end",width:"w-48",openItem:{label:"View panel…",title:"Open the View panel (camera + saved views)"},resetItem:{label:"Reset View",title:"Reset to default fractal view"},slotLabelPrefix:"View"}}),bl()},yl=({activeIdKey:t,featureIds:e,label:i="Active",groupFilter:r,excludeParams:s,whitelistParams:a,onDeselect:o,inactiveLabel:n=null})=>{const l=F(c=>c[t]);return!l&&n===null?null:d.jsxs("div",{className:"border-t border-white/10 bg-black/40 p-2 space-y-2",children:[d.jsxs("div",{className:"flex items-center justify-between",children:[d.jsx(ls,{children:l?i:n??""}),l&&o&&d.jsx("button",{type:"button",onClick:o,className:"text-[9px] text-gray-500 hover:text-white px-2 py-0.5 rounded border border-white/10 hover:bg-white/5 transition-colors",children:"Deselect"})]}),l&&e.map(c=>d.jsx("div",{className:"bg-white/5 rounded p-1",children:d.jsx(As,{featureId:c,groupFilter:r,excludeParams:s,whitelistParams:a})},c))]})},vl=()=>{const t=F(f=>f.savedViews??[]),e=F(f=>f.activeViewId),i=F(f=>f.addView),r=F(f=>f.updateView),s=F(f=>f.deleteView),a=F(f=>f.duplicateView),o=F(f=>f.selectView),n=F(f=>f.reorderViews),l=F(f=>f.resetView);F(f=>f.julia);const c=k.useCallback(async()=>{await(i==null?void 0:i())},[i]),u=k.useCallback((f,y)=>r==null?void 0:r(f,{label:y}),[r]),h=k.useCallback(f=>r==null?void 0:r(f),[r]),p=k.useCallback(()=>l==null?void 0:l(),[l]),m=k.useCallback(f=>{const y=F.getState()._viewIsModified;if(y)return y(f.state);const C=F.getState().julia,A=f.state;return C.kind!==A.kind||C.maxIter!==A.maxIter||C.power!==A.power||Math.abs(C.zoom-A.zoom)>1e-5||Math.abs(C.center.x-A.center.x)+Math.abs(C.center.y-A.center.y)>1e-4||Math.abs(C.juliaC.x-A.juliaC.x)+Math.abs(C.juliaC.y-A.juliaC.y)>1e-4},[]),b=k.useMemo(()=>{const f=F.getState().setJulia,y=O=>{const E=F.getState().julia.center??{x:0,y:0};f==null||f({center:{x:E.x,y:E.y},zoom:O})},C=At.indexOf("mandelbrot"),A=At.indexOf("julia");return[{id:"reset",label:"RESET",onSelect:()=>p(),title:"Reset view to defaults"},{id:"home",label:"HOME",onSelect:()=>f==null?void 0:f({center:{x:0,y:0}}),title:"Center to (0, 0); keep zoom"},{id:"1x",label:"1:1",onSelect:()=>y(1),title:"Zoom 1×"},{id:"wide",label:"WIDE",onSelect:()=>y(.5),title:"Zoom out"},{id:"mand",label:"MAND",onSelect:()=>f==null?void 0:f({kind:C>=0?C:1}),title:"Switch to Mandelbrot kind"},{id:"julia",label:"JULIA",onSelect:()=>f==null?void 0:f({kind:A>=0?A:0}),title:"Switch to Julia kind"}]},[p]);return i?d.jsx(Xs,{className:"flex flex-col bg-[#080808] -m-3",snapshots:t,activeId:e,onSelect:o,onRename:u,onUpdate:h,onDuplicate:a,onDelete:s,onReorder:n,isModified:m,emptyState:"No saved views yet.",slotHintPrefix:null,presets:b,presetGridCols:3,toolbarBefore:d.jsx("div",{className:"px-2 pb-2 bg-black/40 border-b border-white/10",children:d.jsxs("button",{type:"button",onClick:c,className:"w-full bg-cyan-900/40 hover:bg-cyan-800 text-cyan-300 border border-cyan-500/30 rounded py-1 text-[9px] font-bold flex items-center justify-center gap-1",children:[d.jsx(cs,{})," New View"]})}),footer:d.jsxs(d.Fragment,{children:[d.jsx(yl,{activeIdKey:"activeViewId",featureIds:["julia"],label:"Active View",onDeselect:()=>o==null?void 0:o(null)}),d.jsx("div",{className:"border-t border-white/10 bg-black/40 p-2",children:d.jsx($s,{})})]})}):d.jsx("div",{className:"p-4 text-[10px] text-gray-600 italic",children:"View library not initialized."})};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */class hr{constructor(e,i){if(this.data=e,this.mimeType=i,!(e instanceof Uint8Array))throw new TypeError("data must be a Uint8Array.");if(typeof i!="string")throw new TypeError("mimeType must be a string.")}}class fr{constructor(e,i,r,s){if(this.data=e,this.mimeType=i,this.name=r,this.description=s,!(e instanceof Uint8Array))throw new TypeError("data must be a Uint8Array.");if(i!==void 0&&typeof i!="string")throw new TypeError("mimeType, when provided, must be a string.");if(r!==void 0&&typeof r!="string")throw new TypeError("name, when provided, must be a string.");if(s!==void 0&&typeof s!="string")throw new TypeError("description, when provided, must be a string.")}}const wl=t=>{if(!t||typeof t!="object")throw new TypeError("tags must be an object.");if(t.title!==void 0&&typeof t.title!="string")throw new TypeError("tags.title, when provided, must be a string.");if(t.description!==void 0&&typeof t.description!="string")throw new TypeError("tags.description, when provided, must be a string.");if(t.artist!==void 0&&typeof t.artist!="string")throw new TypeError("tags.artist, when provided, must be a string.");if(t.album!==void 0&&typeof t.album!="string")throw new TypeError("tags.album, when provided, must be a string.");if(t.albumArtist!==void 0&&typeof t.albumArtist!="string")throw new TypeError("tags.albumArtist, when provided, must be a string.");if(t.trackNumber!==void 0&&(!Number.isInteger(t.trackNumber)||t.trackNumber<=0))throw new TypeError("tags.trackNumber, when provided, must be a positive integer.");if(t.tracksTotal!==void 0&&(!Number.isInteger(t.tracksTotal)||t.tracksTotal<=0))throw new TypeError("tags.tracksTotal, when provided, must be a positive integer.");if(t.discNumber!==void 0&&(!Number.isInteger(t.discNumber)||t.discNumber<=0))throw new TypeError("tags.discNumber, when provided, must be a positive integer.");if(t.discsTotal!==void 0&&(!Number.isInteger(t.discsTotal)||t.discsTotal<=0))throw new TypeError("tags.discsTotal, when provided, must be a positive integer.");if(t.genre!==void 0&&typeof t.genre!="string")throw new TypeError("tags.genre, when provided, must be a string.");if(t.date!==void 0&&(!(t.date instanceof Date)||Number.isNaN(t.date.getTime())))throw new TypeError("tags.date, when provided, must be a valid Date.");if(t.lyrics!==void 0&&typeof t.lyrics!="string")throw new TypeError("tags.lyrics, when provided, must be a string.");if(t.images!==void 0){if(!Array.isArray(t.images))throw new TypeError("tags.images, when provided, must be an array.");for(const e of t.images){if(!e||typeof e!="object")throw new TypeError("Each image in tags.images must be an object.");if(!(e.data instanceof Uint8Array))throw new TypeError("Each image.data must be a Uint8Array.");if(typeof e.mimeType!="string")throw new TypeError("Each image.mimeType must be a string.");if(!["coverFront","coverBack","unknown"].includes(e.kind))throw new TypeError("Each image.kind must be 'coverFront', 'coverBack', or 'unknown'.")}}if(t.comment!==void 0&&typeof t.comment!="string")throw new TypeError("tags.comment, when provided, must be a string.");if(t.raw!==void 0){if(!t.raw||typeof t.raw!="object")throw new TypeError("tags.raw, when provided, must be an object.");for(const e of Object.values(t.raw))if(e!==null&&typeof e!="string"&&!(e instanceof Uint8Array)&&!(e instanceof hr)&&!(e instanceof fr))throw new TypeError("Each value in tags.raw must be a string, Uint8Array, RichImageData, AttachedFile, or null.")}},Tl=t=>{if(!t||typeof t!="object")throw new TypeError("disposition must be an object.");if(t.default!==void 0&&typeof t.default!="boolean")throw new TypeError("disposition.default must be a boolean.");if(t.forced!==void 0&&typeof t.forced!="boolean")throw new TypeError("disposition.forced must be a boolean.");if(t.original!==void 0&&typeof t.original!="boolean")throw new TypeError("disposition.original must be a boolean.");if(t.commentary!==void 0&&typeof t.commentary!="boolean")throw new TypeError("disposition.commentary must be a boolean.");if(t.hearingImpaired!==void 0&&typeof t.hearingImpaired!="boolean")throw new TypeError("disposition.hearingImpaired must be a boolean.");if(t.visuallyImpaired!==void 0&&typeof t.visuallyImpaired!="boolean")throw new TypeError("disposition.visuallyImpaired must be a boolean.")};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */class te{constructor(e){this.bytes=e,this.pos=0}seekToByte(e){this.pos=8*e}readBit(){const e=Math.floor(this.pos/8),i=this.bytes[e]??0,r=7-(this.pos&7),s=(i&1<<r)>>r;return this.pos++,s}readBits(e){if(e===1)return this.readBit();let i=0;for(let r=0;r<e;r++)i<<=1,i|=this.readBit();return i}writeBits(e,i){const r=this.pos+e;for(let s=this.pos;s<r;s++){const a=Math.floor(s/8);let o=this.bytes[a];const n=7-(s&7);o&=~(1<<n),o|=(i&1<<r-s-1)>>r-s-1<<n,this.bytes[a]=o}this.pos=r}readAlignedByte(){if(this.pos%8!==0)throw new Error("Bitstream is not byte-aligned.");const e=this.pos/8,i=this.bytes[e]??0;return this.pos+=8,i}skipBits(e){this.pos+=e}getBitsLeft(){return this.bytes.length*8-this.pos}clone(){const e=new te(this.bytes);return e.pos=this.pos,e}}/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */const qt=[96e3,88200,64e3,48e3,44100,32e3,24e3,22050,16e3,12e3,11025,8e3,7350],Zt=[-1,1,2,3,4,5,6,8],mr=t=>{let e=qt.indexOf(t.sampleRate),i=null;e===-1&&(e=15,i=t.sampleRate);const r=Zt.indexOf(t.numberOfChannels);if(r===-1)throw new TypeError(`Unsupported number of channels: ${t.numberOfChannels}`);let s=13;t.objectType>=32&&(s+=6),e===15&&(s+=24);const a=Math.ceil(s/8),o=new Uint8Array(a),n=new te(o);return t.objectType<32?n.writeBits(5,t.objectType):(n.writeBits(5,31),n.writeBits(6,t.objectType-32)),n.writeBits(4,e),e===15&&n.writeBits(24,i),n.writeBits(4,r),o};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */const Cl=[48e3,44100,32e3],Sl=[24e3,22050,16e3];/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var Je;(function(t){t[t.NON_IDR_SLICE=1]="NON_IDR_SLICE",t[t.SLICE_DPA=2]="SLICE_DPA",t[t.SLICE_DPB=3]="SLICE_DPB",t[t.SLICE_DPC=4]="SLICE_DPC",t[t.IDR=5]="IDR",t[t.SEI=6]="SEI",t[t.SPS=7]="SPS",t[t.PPS=8]="PPS",t[t.AUD=9]="AUD",t[t.SPS_EXT=13]="SPS_EXT"})(Je||(Je={}));var oe;(function(t){t[t.RASL_N=8]="RASL_N",t[t.RASL_R=9]="RASL_R",t[t.BLA_W_LP=16]="BLA_W_LP",t[t.RSV_IRAP_VCL23=23]="RSV_IRAP_VCL23",t[t.VPS_NUT=32]="VPS_NUT",t[t.SPS_NUT=33]="SPS_NUT",t[t.PPS_NUT=34]="PPS_NUT",t[t.AUD_NUT=35]="AUD_NUT",t[t.PREFIX_SEI_NUT=39]="PREFIX_SEI_NUT",t[t.SUFFIX_SEI_NUT=40]="SUFFIX_SEI_NUT"})(oe||(oe={}));const Kt=function*(t){let e=0,i=-1;for(;e<t.length-2;){const r=t.indexOf(0,e);if(r===-1||r>=t.length-2)break;e=r;let s=0;if(e+3<t.length&&t[e+1]===0&&t[e+2]===0&&t[e+3]===1?s=4:t[e+1]===0&&t[e+2]===1&&(s=3),s===0){e++;continue}i!==-1&&e>i&&(yield{offset:i,length:e-i}),i=e+s,e=i}i!==-1&&i<t.length&&(yield{offset:i,length:t.length-i})},kl=t=>t&31,Qt=t=>{const e=[],i=t.length;for(let r=0;r<i;r++)r+2<i&&t[r]===0&&t[r+1]===0&&t[r+2]===3?(e.push(0,0),r+=2):e.push(t[r]);return new Uint8Array(e)},Al=(t,e)=>{const i=t.reduce((a,o)=>a+e+o.byteLength,0),r=new Uint8Array(i);let s=0;for(const a of t){const o=new DataView(r.buffer,r.byteOffset,r.byteLength);switch(e){case 1:o.setUint8(s,a.byteLength);break;case 2:o.setUint16(s,a.byteLength,!1);break;case 3:qs(o,s,a.byteLength);break;case 4:o.setUint32(s,a.byteLength,!1);break}s+=e,r.set(a,s),s+=a.byteLength}return r},Fl=t=>{try{const e=[],i=[],r=[];for(const n of Kt(t)){const l=t.subarray(n.offset,n.offset+n.length),c=kl(l[0]);c===Je.SPS?e.push(l):c===Je.PPS?i.push(l):c===Je.SPS_EXT&&r.push(l)}if(e.length===0||i.length===0)return null;const s=e[0],a=Rl(s);M(a!==null);const o=a.profileIdc===100||a.profileIdc===110||a.profileIdc===122||a.profileIdc===144;return{configurationVersion:1,avcProfileIndication:a.profileIdc,profileCompatibility:a.constraintFlags,avcLevelIndication:a.levelIdc,lengthSizeMinusOne:3,sequenceParameterSets:e,pictureParameterSets:i,chromaFormat:o?a.chromaFormatIdc:null,bitDepthLumaMinus8:o?a.bitDepthLumaMinus8:null,bitDepthChromaMinus8:o?a.bitDepthChromaMinus8:null,sequenceParameterSetExt:o?r:null}}catch(e){return console.error("Error building AVC Decoder Configuration Record:",e),null}},Ml=t=>{const e=[];e.push(t.configurationVersion),e.push(t.avcProfileIndication),e.push(t.profileCompatibility),e.push(t.avcLevelIndication),e.push(252|t.lengthSizeMinusOne&3),e.push(224|t.sequenceParameterSets.length&31);for(const i of t.sequenceParameterSets){const r=i.byteLength;e.push(r>>8),e.push(r&255);for(let s=0;s<r;s++)e.push(i[s])}e.push(t.pictureParameterSets.length);for(const i of t.pictureParameterSets){const r=i.byteLength;e.push(r>>8),e.push(r&255);for(let s=0;s<r;s++)e.push(i[s])}if(t.avcProfileIndication===100||t.avcProfileIndication===110||t.avcProfileIndication===122||t.avcProfileIndication===144){M(t.chromaFormat!==null),M(t.bitDepthLumaMinus8!==null),M(t.bitDepthChromaMinus8!==null),M(t.sequenceParameterSetExt!==null),e.push(252|t.chromaFormat&3),e.push(248|t.bitDepthLumaMinus8&7),e.push(248|t.bitDepthChromaMinus8&7),e.push(t.sequenceParameterSetExt.length);for(const i of t.sequenceParameterSetExt){const r=i.byteLength;e.push(r>>8),e.push(r&255);for(let s=0;s<r;s++)e.push(i[s])}}return new Uint8Array(e)},gr={1:{num:1,den:1},2:{num:12,den:11},3:{num:10,den:11},4:{num:16,den:11},5:{num:40,den:33},6:{num:24,den:11},7:{num:20,den:11},8:{num:32,den:11},9:{num:80,den:33},10:{num:18,den:11},11:{num:15,den:11},12:{num:64,den:33},13:{num:160,den:99},14:{num:4,den:3},15:{num:3,den:2},16:{num:2,den:1}},Rl=t=>{try{const e=new te(Qt(t));if(e.skipBits(1),e.skipBits(2),e.readBits(5)!==7)return null;const r=e.readAlignedByte(),s=e.readAlignedByte(),a=e.readAlignedByte();S(e);let o=1,n=0,l=0,c=0;if((r===100||r===110||r===122||r===244||r===44||r===83||r===86||r===118||r===128)&&(o=S(e),o===3&&(c=e.readBits(1)),n=S(e),l=S(e),e.skipBits(1),e.readBits(1))){for(let I=0;I<(o!==3?8:12);I++)if(e.readBits(1)){const H=I<6?16:64;let U=8,V=8;for(let G=0;G<H;G++){if(V!==0){const K=de(e);V=(U+K+256)%256}U=V===0?U:V}}}S(e);const u=S(e);if(u===0)S(e);else if(u===1){e.skipBits(1),de(e),de(e);const N=S(e);for(let I=0;I<N;I++)de(e)}S(e),e.skipBits(1);const h=S(e),p=S(e),m=16*(h+1),b=16*(p+1);let f=m,y=b;const C=e.readBits(1);if(C||e.skipBits(1),e.skipBits(1),e.readBits(1)){const N=S(e),I=S(e),R=S(e),H=S(e);let U,V;if((c===0?o:0)===0)U=1,V=2-C;else{const K=o===3?1:2,ce=o===1?2:1;U=K,V=ce*(2-C)}f-=U*(N+I),y-=V*(R+H)}let O=2,E=2,v=2,T=0,B={num:1,den:1},j=null,z=null;if(e.readBits(1)){if(e.readBits(1)){const ce=e.readBits(8);if(ce===255)B={num:e.readBits(16),den:e.readBits(16)};else{const Te=gr[ce];Te&&(B=Te)}}e.readBits(1)&&e.skipBits(1),e.readBits(1)&&(e.skipBits(3),T=e.readBits(1),e.readBits(1)&&(O=e.readBits(8),E=e.readBits(8),v=e.readBits(8))),e.readBits(1)&&(S(e),S(e)),e.readBits(1)&&(e.skipBits(32),e.skipBits(32),e.skipBits(1));const V=e.readBits(1);V&&wi(e);const G=e.readBits(1);G&&wi(e),(V||G)&&e.skipBits(1),e.skipBits(1),e.readBits(1)&&(e.skipBits(1),S(e),S(e),S(e),S(e),j=S(e),z=S(e))}if(j===null){M(z===null);const N=s&16;if((r===44||r===86||r===100||r===110||r===122||r===244)&&N)j=0,z=0;else{const I=h+1,R=p+1,H=(2-C)*R,U=ci.find(G=>G.level>=a)??Me(ci),V=Math.min(Math.floor(U.maxDpbMbs/(I*H)),16);j=V,z=V}}return M(z!==null),{profileIdc:r,constraintFlags:s,levelIdc:a,frameMbsOnlyFlag:C,chromaFormatIdc:o,bitDepthLumaMinus8:n,bitDepthChromaMinus8:l,codedWidth:m,codedHeight:b,displayWidth:f,displayHeight:y,pixelAspectRatio:B,colourPrimaries:O,matrixCoefficients:v,transferCharacteristics:E,fullRangeFlag:T,numReorderFrames:j,maxDecFrameBuffering:z}}catch(e){return console.error("Error parsing AVC SPS:",e),null}},wi=t=>{const e=S(t);t.skipBits(4),t.skipBits(4);for(let i=0;i<=e;i++)S(t),S(t),t.skipBits(1);t.skipBits(5),t.skipBits(5),t.skipBits(5),t.skipBits(5)},Ti=t=>t>>1&63,El=t=>{try{const e=new te(Qt(t));e.skipBits(16),e.readBits(4);const i=e.readBits(3),r=e.readBits(1),{general_profile_space:s,general_tier_flag:a,general_profile_idc:o,general_profile_compatibility_flags:n,general_constraint_indicator_flags:l,general_level_idc:c}=_l(e,i);S(e);const u=S(e);let h=0;u===3&&(h=e.readBits(1));const p=S(e),m=S(e);let b=p,f=m;if(e.readBits(1)){const I=S(e),R=S(e),H=S(e),U=S(e);let V=1,G=1;const K=h===0?u:0;K===1?(V=2,G=2):K===2&&(V=2,G=1),b-=(I+R)*V,f-=(H+U)*G}const y=S(e),C=S(e);S(e);const O=e.readBits(1)?0:i;let E=0;for(let I=O;I<=i;I++)S(e),E=S(e),S(e);S(e),S(e),S(e),S(e),S(e),S(e),e.readBits(1)&&e.readBits(1)&&Dl(e),e.skipBits(1),e.skipBits(1),e.readBits(1)&&(e.skipBits(4),e.skipBits(4),S(e),S(e),e.skipBits(1));const v=S(e);if(Il(e,v),e.readBits(1)){const I=S(e);for(let R=0;R<I;R++)S(e),e.skipBits(1)}e.skipBits(1),e.skipBits(1);let T=2,B=2,j=2,z=0,D=0,N={num:1,den:1};if(e.readBits(1)){const I=jl(e,i);N=I.pixelAspectRatio,T=I.colourPrimaries,B=I.transferCharacteristics,j=I.matrixCoefficients,z=I.fullRangeFlag,D=I.minSpatialSegmentationIdc}return{displayWidth:b,displayHeight:f,pixelAspectRatio:N,colourPrimaries:T,transferCharacteristics:B,matrixCoefficients:j,fullRangeFlag:z,maxDecFrameBuffering:E+1,spsMaxSubLayersMinus1:i,spsTemporalIdNestingFlag:r,generalProfileSpace:s,generalTierFlag:a,generalProfileIdc:o,generalProfileCompatibilityFlags:n,generalConstraintIndicatorFlags:l,generalLevelIdc:c,chromaFormatIdc:u,bitDepthLumaMinus8:y,bitDepthChromaMinus8:C,minSpatialSegmentationIdc:D}}catch(e){return console.error("Error parsing HEVC SPS:",e),null}},Pl=t=>{try{const e=[],i=[],r=[],s=[];for(const c of Kt(t)){const u=t.subarray(c.offset,c.offset+c.length),h=Ti(u[0]);h===oe.VPS_NUT?e.push(u):h===oe.SPS_NUT?i.push(u):h===oe.PPS_NUT?r.push(u):(h===oe.PREFIX_SEI_NUT||h===oe.SUFFIX_SEI_NUT)&&s.push(u)}if(i.length===0||r.length===0)return null;const a=El(i[0]);if(!a)return null;let o=0;if(r.length>0){const c=r[0],u=new te(Qt(c));u.skipBits(16),S(u),S(u),u.skipBits(1),u.skipBits(1),u.skipBits(3),u.skipBits(1),u.skipBits(1),S(u),S(u),de(u),u.skipBits(1),u.skipBits(1),u.readBits(1)&&S(u),de(u),de(u),u.skipBits(1),u.skipBits(1),u.skipBits(1),u.skipBits(1);const h=u.readBits(1),p=u.readBits(1);!h&&!p?o=0:h&&!p?o=2:!h&&p?o=3:o=0}const n=[...e.length?[{arrayCompleteness:1,nalUnitType:oe.VPS_NUT,nalUnits:e}]:[],...i.length?[{arrayCompleteness:1,nalUnitType:oe.SPS_NUT,nalUnits:i}]:[],...r.length?[{arrayCompleteness:1,nalUnitType:oe.PPS_NUT,nalUnits:r}]:[],...s.length?[{arrayCompleteness:1,nalUnitType:Ti(s[0][0]),nalUnits:s}]:[]];return{configurationVersion:1,generalProfileSpace:a.generalProfileSpace,generalTierFlag:a.generalTierFlag,generalProfileIdc:a.generalProfileIdc,generalProfileCompatibilityFlags:a.generalProfileCompatibilityFlags,generalConstraintIndicatorFlags:a.generalConstraintIndicatorFlags,generalLevelIdc:a.generalLevelIdc,minSpatialSegmentationIdc:a.minSpatialSegmentationIdc,parallelismType:o,chromaFormatIdc:a.chromaFormatIdc,bitDepthLumaMinus8:a.bitDepthLumaMinus8,bitDepthChromaMinus8:a.bitDepthChromaMinus8,avgFrameRate:0,constantFrameRate:0,numTemporalLayers:a.spsMaxSubLayersMinus1+1,temporalIdNested:a.spsTemporalIdNestingFlag,lengthSizeMinusOne:3,arrays:n}}catch(e){return console.error("Error building HEVC Decoder Configuration Record:",e),null}},_l=(t,e)=>{const i=t.readBits(2),r=t.readBits(1),s=t.readBits(5);let a=0;for(let u=0;u<32;u++)a=a<<1|t.readBits(1);const o=new Uint8Array(6);for(let u=0;u<6;u++)o[u]=t.readBits(8);const n=t.readBits(8),l=[],c=[];for(let u=0;u<e;u++)l.push(t.readBits(1)),c.push(t.readBits(1));if(e>0)for(let u=e;u<8;u++)t.skipBits(2);for(let u=0;u<e;u++)l[u]&&t.skipBits(88),c[u]&&t.skipBits(8);return{general_profile_space:i,general_tier_flag:r,general_profile_idc:s,general_profile_compatibility_flags:a,general_constraint_indicator_flags:o,general_level_idc:n}},Dl=t=>{for(let e=0;e<4;e++)for(let i=0;i<(e===3?2:6);i++)if(!t.readBits(1))S(t);else{const s=Math.min(64,1<<4+(e<<1));e>1&&de(t);for(let a=0;a<s;a++)de(t)}},Il=(t,e)=>{const i=[];for(let r=0;r<e;r++)i[r]=Bl(t,r,e,i)},Bl=(t,e,i,r)=>{let s=0,a=0,o=0;if(e!==0&&(a=t.readBits(1)),a){if(e===i){const l=S(t);o=e-(l+1)}else o=e-1;t.readBits(1),S(t);const n=r[o]??0;for(let l=0;l<=n;l++)t.readBits(1)||t.readBits(1);s=r[o]}else{const n=S(t),l=S(t);for(let c=0;c<n;c++)S(t),t.readBits(1);for(let c=0;c<l;c++)S(t),t.readBits(1);s=n+l}return s},jl=(t,e)=>{let i=2,r=2,s=2,a=0,o=0,n={num:1,den:1};if(t.readBits(1)){const l=t.readBits(8);if(l===255)n={num:t.readBits(16),den:t.readBits(16)};else{const c=gr[l];c&&(n=c)}}return t.readBits(1)&&t.readBits(1),t.readBits(1)&&(t.readBits(3),a=t.readBits(1),t.readBits(1)&&(i=t.readBits(8),r=t.readBits(8),s=t.readBits(8))),t.readBits(1)&&(S(t),S(t)),t.readBits(1),t.readBits(1),t.readBits(1),t.readBits(1)&&(S(t),S(t),S(t),S(t)),t.readBits(1)&&(t.readBits(32),t.readBits(32),t.readBits(1)&&S(t),t.readBits(1)&&zl(t,!0,e)),t.readBits(1)&&(t.readBits(1),t.readBits(1),t.readBits(1),o=S(t),S(t),S(t),S(t),S(t)),{pixelAspectRatio:n,colourPrimaries:i,transferCharacteristics:r,matrixCoefficients:s,fullRangeFlag:a,minSpatialSegmentationIdc:o}},zl=(t,e,i)=>{let r=!1,s=!1,a=!1;r=t.readBits(1)===1,s=t.readBits(1)===1,(r||s)&&(a=t.readBits(1)===1,a&&(t.readBits(8),t.readBits(5),t.readBits(1),t.readBits(5)),t.readBits(4),t.readBits(4),a&&t.readBits(4),t.readBits(5),t.readBits(5),t.readBits(5));for(let o=0;o<=i;o++){const n=t.readBits(1)===1;let l=!0;n||(l=t.readBits(1)===1);let c=!1;l?S(t):c=t.readBits(1)===1;let u=1;c||(u=S(t)+1),r&&Ci(t,u,a),s&&Ci(t,u,a)}},Ci=(t,e,i)=>{for(let r=0;r<e;r++)S(t),S(t),i&&(S(t),S(t)),t.readBits(1)},Ol=t=>{const e=[];e.push(t.configurationVersion),e.push((t.generalProfileSpace&3)<<6|(t.generalTierFlag&1)<<5|t.generalProfileIdc&31),e.push(t.generalProfileCompatibilityFlags>>>24&255),e.push(t.generalProfileCompatibilityFlags>>>16&255),e.push(t.generalProfileCompatibilityFlags>>>8&255),e.push(t.generalProfileCompatibilityFlags&255),e.push(...t.generalConstraintIndicatorFlags),e.push(t.generalLevelIdc&255),e.push(240|t.minSpatialSegmentationIdc>>8&15),e.push(t.minSpatialSegmentationIdc&255),e.push(252|t.parallelismType&3),e.push(252|t.chromaFormatIdc&3),e.push(248|t.bitDepthLumaMinus8&7),e.push(248|t.bitDepthChromaMinus8&7),e.push(t.avgFrameRate>>8&255),e.push(t.avgFrameRate&255),e.push((t.constantFrameRate&3)<<6|(t.numTemporalLayers&7)<<3|(t.temporalIdNested&1)<<2|t.lengthSizeMinusOne&3),e.push(t.arrays.length&255);for(const i of t.arrays){e.push((i.arrayCompleteness&1)<<7|0|i.nalUnitType&63),e.push(i.nalUnits.length>>8&255),e.push(i.nalUnits.length&255);for(const r of i.nalUnits){e.push(r.length>>8&255),e.push(r.length&255);for(let s=0;s<r.length;s++)e.push(r[s])}}return new Uint8Array(e)},br=t=>{const e=Gi(t),i=e.getUint8(9),r=e.getUint16(10,!0),s=e.getUint32(12,!0),a=e.getInt16(16,!0),o=e.getUint8(18);let n=null;return o&&(n=t.subarray(19,21+i)),{outputChannelCount:i,preSkip:r,inputSampleRate:s,outputGain:a,channelMappingFamily:o,channelMappingTable:n}};var Si;(function(t){t[t.STREAMINFO=0]="STREAMINFO",t[t.VORBIS_COMMENT=4]="VORBIS_COMMENT",t[t.PICTURE=6]="PICTURE"})(Si||(Si={}));const Ul=t=>{if(t.length<7||t[0]!==11||t[1]!==119)return null;const e=new te(t);e.skipBits(16),e.skipBits(16);const i=e.readBits(2);if(i===3)return null;const r=e.readBits(6),s=e.readBits(5);if(s>8)return null;const a=e.readBits(3),o=e.readBits(3);o&1&&o!==1&&e.skipBits(2),o&4&&e.skipBits(2),o===2&&e.skipBits(2);const n=e.readBits(1),l=Math.floor(r/2);return{fscod:i,bsid:s,bsmod:a,acmod:o,lfeon:n,bitRateCode:l}},Ll=[1,2,3,6],Nl=t=>{if(t.length<6||t[0]!==11||t[1]!==119)return null;const e=new te(t);e.skipBits(16);const i=e.readBits(2);if(e.skipBits(3),i!==0&&i!==2)return null;const r=e.readBits(11),s=e.readBits(2);let a=0,o;s===3?(a=e.readBits(2),o=3):o=e.readBits(2);const n=e.readBits(3),l=e.readBits(1),c=e.readBits(5);if(c<11||c>16)return null;const u=Ll[o];let h;return s<3?h=Cl[s]/1e3:h=Sl[a]/1e3,{dataRate:Math.round((r+1)*h/(u*16)),substreams:[{fscod:s,fscod2:a,bsid:c,bsmod:0,acmod:n,lfeon:l,numDepSub:0,chanLoc:0}]}};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */const ki=new Uint8Array(0);class qe{constructor(e,i,r,s,a=-1,o,n){if(this.data=e,this.type=i,this.timestamp=r,this.duration=s,this.sequenceNumber=a,e===ki&&o===void 0)throw new Error("Internal error: byteLength must be explicitly provided when constructing metadata-only packets.");if(o===void 0&&(o=e.byteLength),!(e instanceof Uint8Array))throw new TypeError("data must be a Uint8Array.");if(i!=="key"&&i!=="delta")throw new TypeError('type must be either "key" or "delta".');if(!Number.isFinite(r))throw new TypeError("timestamp must be a number.");if(!Number.isFinite(s)||s<0)throw new TypeError("duration must be a non-negative number.");if(!Number.isFinite(a))throw new TypeError("sequenceNumber must be a number.");if(!Number.isInteger(o)||o<0)throw new TypeError("byteLength must be a non-negative integer.");if(n!==void 0&&(typeof n!="object"||!n))throw new TypeError("sideData, when provided, must be an object.");if((n==null?void 0:n.alpha)!==void 0&&!(n.alpha instanceof Uint8Array))throw new TypeError("sideData.alpha, when provided, must be a Uint8Array.");if((n==null?void 0:n.alphaByteLength)!==void 0&&(!Number.isInteger(n.alphaByteLength)||n.alphaByteLength<0))throw new TypeError("sideData.alphaByteLength, when provided, must be a non-negative integer.");this.byteLength=o,this.sideData=n??{},this.sideData.alpha&&this.sideData.alphaByteLength===void 0&&(this.sideData.alphaByteLength=this.sideData.alpha.byteLength)}get isMetadataOnly(){return this.data===ki}get microsecondTimestamp(){return Math.trunc(ui*this.timestamp)}get microsecondDuration(){return Math.trunc(ui*this.duration)}toEncodedVideoChunk(){if(this.isMetadataOnly)throw new TypeError("Metadata-only packets cannot be converted to a video chunk.");if(typeof EncodedVideoChunk>"u")throw new Error("Your browser does not support EncodedVideoChunk.");return new EncodedVideoChunk({data:this.data,type:this.type,timestamp:this.microsecondTimestamp,duration:this.microsecondDuration})}alphaToEncodedVideoChunk(e=this.type){if(!this.sideData.alpha)throw new TypeError("This packet does not contain alpha side data.");if(this.isMetadataOnly)throw new TypeError("Metadata-only packets cannot be converted to a video chunk.");if(typeof EncodedVideoChunk>"u")throw new Error("Your browser does not support EncodedVideoChunk.");return new EncodedVideoChunk({data:this.sideData.alpha,type:e,timestamp:this.microsecondTimestamp,duration:this.microsecondDuration})}toEncodedAudioChunk(){if(this.isMetadataOnly)throw new TypeError("Metadata-only packets cannot be converted to an audio chunk.");if(typeof EncodedAudioChunk>"u")throw new Error("Your browser does not support EncodedAudioChunk.");return new EncodedAudioChunk({data:this.data,type:this.type,timestamp:this.microsecondTimestamp,duration:this.microsecondDuration})}static fromEncodedChunk(e,i){if(!(e instanceof EncodedVideoChunk||e instanceof EncodedAudioChunk))throw new TypeError("chunk must be an EncodedVideoChunk or EncodedAudioChunk.");const r=new Uint8Array(e.byteLength);return e.copyTo(r),new qe(r,e.type,e.timestamp/1e6,(e.duration??0)/1e6,void 0,void 0,i)}clone(e){if(e!==void 0&&(typeof e!="object"||e===null))throw new TypeError("options, when provided, must be an object.");if((e==null?void 0:e.data)!==void 0&&!(e.data instanceof Uint8Array))throw new TypeError("options.data, when provided, must be a Uint8Array.");if((e==null?void 0:e.type)!==void 0&&e.type!=="key"&&e.type!=="delta")throw new TypeError('options.type, when provided, must be either "key" or "delta".');if((e==null?void 0:e.timestamp)!==void 0&&!Number.isFinite(e.timestamp))throw new TypeError("options.timestamp, when provided, must be a number.");if((e==null?void 0:e.duration)!==void 0&&!Number.isFinite(e.duration))throw new TypeError("options.duration, when provided, must be a number.");if((e==null?void 0:e.sequenceNumber)!==void 0&&!Number.isFinite(e.sequenceNumber))throw new TypeError("options.sequenceNumber, when provided, must be a number.");if((e==null?void 0:e.sideData)!==void 0&&(typeof e.sideData!="object"||e.sideData===null))throw new TypeError("options.sideData, when provided, must be an object.");return new qe((e==null?void 0:e.data)??this.data,(e==null?void 0:e.type)??this.type,(e==null?void 0:e.timestamp)??this.timestamp,(e==null?void 0:e.duration)??this.duration,(e==null?void 0:e.sequenceNumber)??this.sequenceNumber,this.byteLength,(e==null?void 0:e.sideData)??this.sideData)}}/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */const Vl=t=>{let i=(t.hasVideo?"video/":t.hasAudio?"audio/":"application/")+(t.isQuickTime?"quicktime":"mp4");if(t.codecStrings.length>0){const r=[...new Set(t.codecStrings)];i+=`; codecs="${r.join(", ")}"`}return i};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */const xt=8,Ai=16;/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */class Mt{constructor(e){this.value=e}}class Rt{constructor(e){this.value=e}}class xr{constructor(e){this.value=e}}class be{constructor(e){this.value=e}}var g;(function(t){t[t.EBML=440786851]="EBML",t[t.EBMLVersion=17030]="EBMLVersion",t[t.EBMLReadVersion=17143]="EBMLReadVersion",t[t.EBMLMaxIDLength=17138]="EBMLMaxIDLength",t[t.EBMLMaxSizeLength=17139]="EBMLMaxSizeLength",t[t.DocType=17026]="DocType",t[t.DocTypeVersion=17031]="DocTypeVersion",t[t.DocTypeReadVersion=17029]="DocTypeReadVersion",t[t.Void=236]="Void",t[t.Segment=408125543]="Segment",t[t.SeekHead=290298740]="SeekHead",t[t.Seek=19899]="Seek",t[t.SeekID=21419]="SeekID",t[t.SeekPosition=21420]="SeekPosition",t[t.Duration=17545]="Duration",t[t.Info=357149030]="Info",t[t.TimestampScale=2807729]="TimestampScale",t[t.MuxingApp=19840]="MuxingApp",t[t.WritingApp=22337]="WritingApp",t[t.Tracks=374648427]="Tracks",t[t.TrackEntry=174]="TrackEntry",t[t.TrackNumber=215]="TrackNumber",t[t.TrackUID=29637]="TrackUID",t[t.TrackType=131]="TrackType",t[t.FlagEnabled=185]="FlagEnabled",t[t.FlagDefault=136]="FlagDefault",t[t.FlagForced=21930]="FlagForced",t[t.FlagOriginal=21934]="FlagOriginal",t[t.FlagHearingImpaired=21931]="FlagHearingImpaired",t[t.FlagVisualImpaired=21932]="FlagVisualImpaired",t[t.FlagCommentary=21935]="FlagCommentary",t[t.FlagLacing=156]="FlagLacing",t[t.Name=21358]="Name",t[t.Language=2274716]="Language",t[t.LanguageBCP47=2274717]="LanguageBCP47",t[t.CodecID=134]="CodecID",t[t.CodecPrivate=25506]="CodecPrivate",t[t.CodecDelay=22186]="CodecDelay",t[t.SeekPreRoll=22203]="SeekPreRoll",t[t.DefaultDuration=2352003]="DefaultDuration",t[t.Video=224]="Video",t[t.PixelWidth=176]="PixelWidth",t[t.PixelHeight=186]="PixelHeight",t[t.DisplayWidth=21680]="DisplayWidth",t[t.DisplayHeight=21690]="DisplayHeight",t[t.DisplayUnit=21682]="DisplayUnit",t[t.AlphaMode=21440]="AlphaMode",t[t.Audio=225]="Audio",t[t.SamplingFrequency=181]="SamplingFrequency",t[t.Channels=159]="Channels",t[t.BitDepth=25188]="BitDepth",t[t.SimpleBlock=163]="SimpleBlock",t[t.BlockGroup=160]="BlockGroup",t[t.Block=161]="Block",t[t.BlockAdditions=30113]="BlockAdditions",t[t.BlockMore=166]="BlockMore",t[t.BlockAdditional=165]="BlockAdditional",t[t.BlockAddID=238]="BlockAddID",t[t.BlockDuration=155]="BlockDuration",t[t.ReferenceBlock=251]="ReferenceBlock",t[t.Cluster=524531317]="Cluster",t[t.Timestamp=231]="Timestamp",t[t.Cues=475249515]="Cues",t[t.CuePoint=187]="CuePoint",t[t.CueTime=179]="CueTime",t[t.CueTrackPositions=183]="CueTrackPositions",t[t.CueTrack=247]="CueTrack",t[t.CueClusterPosition=241]="CueClusterPosition",t[t.Colour=21936]="Colour",t[t.MatrixCoefficients=21937]="MatrixCoefficients",t[t.TransferCharacteristics=21946]="TransferCharacteristics",t[t.Primaries=21947]="Primaries",t[t.Range=21945]="Range",t[t.Projection=30320]="Projection",t[t.ProjectionType=30321]="ProjectionType",t[t.ProjectionPoseRoll=30325]="ProjectionPoseRoll",t[t.Attachments=423732329]="Attachments",t[t.AttachedFile=24999]="AttachedFile",t[t.FileDescription=18046]="FileDescription",t[t.FileName=18030]="FileName",t[t.FileMediaType=18016]="FileMediaType",t[t.FileData=18012]="FileData",t[t.FileUID=18094]="FileUID",t[t.Chapters=272869232]="Chapters",t[t.Tags=307544935]="Tags",t[t.Tag=29555]="Tag",t[t.Targets=25536]="Targets",t[t.TargetTypeValue=26826]="TargetTypeValue",t[t.TargetType=25546]="TargetType",t[t.TagTrackUID=25541]="TagTrackUID",t[t.TagEditionUID=25545]="TagEditionUID",t[t.TagChapterUID=25540]="TagChapterUID",t[t.TagAttachmentUID=25542]="TagAttachmentUID",t[t.SimpleTag=26568]="SimpleTag",t[t.TagName=17827]="TagName",t[t.TagLanguage=17530]="TagLanguage",t[t.TagString=17543]="TagString",t[t.TagBinary=17541]="TagBinary",t[t.ContentEncodings=28032]="ContentEncodings",t[t.ContentEncoding=25152]="ContentEncoding",t[t.ContentEncodingOrder=20529]="ContentEncodingOrder",t[t.ContentEncodingScope=20530]="ContentEncodingScope",t[t.ContentCompression=20532]="ContentCompression",t[t.ContentCompAlgo=16980]="ContentCompAlgo",t[t.ContentCompSettings=16981]="ContentCompSettings",t[t.ContentEncryption=20533]="ContentEncryption"})(g||(g={}));g.EBML,g.Segment;g.SeekHead,g.Info,g.Cluster,g.Tracks,g.Cues,g.Attachments,g.Chapters,g.Tags;const Fi=t=>t<256?1:t<65536?2:t<1<<24?3:t<2**32?4:t<2**40?5:6,Mi=t=>t<1n<<8n?1:t<1n<<16n?2:t<1n<<24n?3:t<1n<<32n?4:t<1n<<40n?5:t<1n<<48n?6:t<1n<<56n?7:8,Ri=t=>t>=-64&&t<64?1:t>=-8192&&t<8192?2:t>=-1048576&&t<1<<20?3:t>=-134217728&&t<1<<27?4:t>=-17179869184&&t<2**34?5:6,Wl=t=>{if(t<127)return 1;if(t<16383)return 2;if(t<(1<<21)-1)return 3;if(t<(1<<28)-1)return 4;if(t<2**35-1)return 5;if(t<2**42-1)return 6;throw new Error("EBML varint size not supported "+t)};class Hl{constructor(e){this.writer=e,this.helper=new Uint8Array(8),this.helperView=new DataView(this.helper.buffer),this.offsets=new WeakMap,this.dataOffsets=new WeakMap}writeByte(e){this.helperView.setUint8(0,e),this.writer.write(this.helper.subarray(0,1))}writeFloat32(e){this.helperView.setFloat32(0,e,!1),this.writer.write(this.helper.subarray(0,4))}writeFloat64(e){this.helperView.setFloat64(0,e,!1),this.writer.write(this.helper)}writeUnsignedInt(e,i=Fi(e)){let r=0;switch(i){case 6:this.helperView.setUint8(r++,e/2**40|0);case 5:this.helperView.setUint8(r++,e/2**32|0);case 4:this.helperView.setUint8(r++,e>>24);case 3:this.helperView.setUint8(r++,e>>16);case 2:this.helperView.setUint8(r++,e>>8);case 1:this.helperView.setUint8(r++,e);break;default:throw new Error("Bad unsigned int size "+i)}this.writer.write(this.helper.subarray(0,r))}writeUnsignedBigInt(e,i=Mi(e)){let r=0;for(let s=i-1;s>=0;s--)this.helperView.setUint8(r++,Number(e>>BigInt(s*8)&0xffn));this.writer.write(this.helper.subarray(0,r))}writeSignedInt(e,i=Ri(e)){e<0&&(e+=2**(i*8)),this.writeUnsignedInt(e,i)}writeVarInt(e,i=Wl(e)){let r=0;switch(i){case 1:this.helperView.setUint8(r++,128|e);break;case 2:this.helperView.setUint8(r++,64|e>>8),this.helperView.setUint8(r++,e);break;case 3:this.helperView.setUint8(r++,32|e>>16),this.helperView.setUint8(r++,e>>8),this.helperView.setUint8(r++,e);break;case 4:this.helperView.setUint8(r++,16|e>>24),this.helperView.setUint8(r++,e>>16),this.helperView.setUint8(r++,e>>8),this.helperView.setUint8(r++,e);break;case 5:this.helperView.setUint8(r++,8|e/2**32&7),this.helperView.setUint8(r++,e>>24),this.helperView.setUint8(r++,e>>16),this.helperView.setUint8(r++,e>>8),this.helperView.setUint8(r++,e);break;case 6:this.helperView.setUint8(r++,4|e/2**40&3),this.helperView.setUint8(r++,e/2**32|0),this.helperView.setUint8(r++,e>>24),this.helperView.setUint8(r++,e>>16),this.helperView.setUint8(r++,e>>8),this.helperView.setUint8(r++,e);break;default:throw new Error("Bad EBML varint size "+i)}this.writer.write(this.helper.subarray(0,r))}writeAsciiString(e){this.writer.write(new Uint8Array(e.split("").map(i=>i.charCodeAt(0))))}writeEBML(e){if(e!==null)if(e instanceof Uint8Array)this.writer.write(e);else if(Array.isArray(e))for(const i of e)this.writeEBML(i);else if(this.offsets.set(e,this.writer.getPos()),this.writeUnsignedInt(e.id),Array.isArray(e.data)){const i=this.writer.getPos(),r=e.size===-1?1:e.size??4;e.size===-1?this.writeByte(255):this.writer.seek(this.writer.getPos()+r);const s=this.writer.getPos();if(this.dataOffsets.set(e,s),this.writeEBML(e.data),e.size!==-1){const a=this.writer.getPos()-s,o=this.writer.getPos();this.writer.seek(i),this.writeVarInt(a,r),this.writer.seek(o)}}else if(typeof e.data=="number"){const i=e.size??Fi(e.data);this.writeVarInt(i),this.writeUnsignedInt(e.data,i)}else if(typeof e.data=="bigint"){const i=e.size??Mi(e.data);this.writeVarInt(i),this.writeUnsignedBigInt(e.data,i)}else if(typeof e.data=="string")this.writeVarInt(e.data.length),this.writeAsciiString(e.data);else if(e.data instanceof Uint8Array)this.writeVarInt(e.data.byteLength,e.size),this.writer.write(e.data);else if(e.data instanceof Mt)this.writeVarInt(4),this.writeFloat32(e.data.value);else if(e.data instanceof Rt)this.writeVarInt(8),this.writeFloat64(e.data.value);else if(e.data instanceof xr){const i=e.size??Ri(e.data.value);this.writeVarInt(i),this.writeSignedInt(e.data.value,i)}else if(e.data instanceof be){const i=Y.encode(e.data.value);this.writeVarInt(i.length),this.writer.write(i)}else ut(e.data)}}const Gl={avc:"V_MPEG4/ISO/AVC",hevc:"V_MPEGH/ISO/HEVC",vp8:"V_VP8",vp9:"V_VP9",av1:"V_AV1",aac:"A_AAC",mp3:"A_MPEG/L3",opus:"A_OPUS",vorbis:"A_VORBIS",flac:"A_FLAC",ac3:"A_AC3",eac3:"A_EAC3","pcm-u8":"A_PCM/INT/LIT","pcm-s16":"A_PCM/INT/LIT","pcm-s16be":"A_PCM/INT/BIG","pcm-s24":"A_PCM/INT/LIT","pcm-s24be":"A_PCM/INT/BIG","pcm-s32":"A_PCM/INT/LIT","pcm-s32be":"A_PCM/INT/BIG","pcm-f32":"A_PCM/FLOAT/IEEE","pcm-f64":"A_PCM/FLOAT/IEEE",webvtt:"S_TEXT/WEBVTT"};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */const Jl=t=>{let i=(t.hasVideo?"video/":t.hasAudio?"audio/":"application/")+(t.isWebM?"webm":"x-matroska");if(t.codecStrings.length>0){const r=[...new Set(t.codecStrings.filter(Boolean))];i+=`; codecs="${r.join(", ")}"`}return i};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */const yr=7,vr=9,nt=t=>{const e=t.filePos,i=$l(t,9),r=new te(i);if(r.readBits(12)!==4095||(r.skipBits(1),r.readBits(2)!==0))return null;const o=r.readBits(1),n=r.readBits(2)+1,l=r.readBits(4);if(l===15)return null;r.skipBits(1);const c=r.readBits(3);if(c===0)throw new Error("ADTS frames with channel configuration 0 are not supported.");r.skipBits(1),r.skipBits(1),r.skipBits(1),r.skipBits(1);const u=r.readBits(13);r.skipBits(11);const h=r.readBits(2)+1;if(h!==1)throw new Error("ADTS frames with more than one AAC frame are not supported.");let p=null;return o===1?t.filePos-=2:p=r.readBits(16),{objectType:n,samplingFrequencyIndex:l,channelConfiguration:c,frameLength:u,numberOfAacFrames:h,crcCheck:p,startPos:e}};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */class _e{constructor(e,i,r,s,a){this.bytes=e,this.view=i,this.offset=r,this.start=s,this.end=a,this.bufferPos=s-r}static tempFromBytes(e){return new _e(e,Gi(e),0,0,e.length)}get length(){return this.end-this.start}get filePos(){return this.offset+this.bufferPos}set filePos(e){this.bufferPos=e-this.offset}get remainingLength(){return Math.max(this.end-this.filePos,0)}skip(e){this.bufferPos+=e}slice(e,i=this.end-e){if(e<this.start||e+i>this.end)throw new RangeError("Slicing outside of original slice.");return new _e(this.bytes,this.view,this.offset,e,e+i)}}const Xl=(t,e)=>{if(t.filePos<t.start||t.filePos+e>t.end)throw new RangeError(`Tried reading [${t.filePos}, ${t.filePos+e}), but slice is [${t.start}, ${t.end}). This is likely an internal error, please report it alongside the file that caused it.`)},$l=(t,e)=>{Xl(t,e);const i=t.bytes.subarray(t.bufferPos,t.bufferPos+e);return t.bufferPos+=e,i};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */class wr{constructor(e){this.mutex=new Ji,this.firstMediaStreamTimestamp=null,this.trackTimestampInfo=new WeakMap,this.output=e}onTrackClose(e){}validateAndNormalizeTimestamp(e,i,r){if(i+=e.source._timestampOffset,i<0)throw new Error(`Timestamps must be non-negative (got ${i}s).`);let s=this.trackTimestampInfo.get(e);if(s){if(r&&(s.maxTimestampBeforeLastKeyPacket=s.maxTimestamp),s.maxTimestampBeforeLastKeyPacket!==null&&i<s.maxTimestampBeforeLastKeyPacket)throw new Error(`Timestamps cannot be smaller than the largest timestamp of the previous GOP (a GOP begins with a key packet and ends right before the next key packet). Got ${i}s, but largest timestamp is ${s.maxTimestampBeforeLastKeyPacket}s.`);s.maxTimestamp=Math.max(s.maxTimestamp,i)}else{if(!r)throw new Error("First packet must be a key packet.");s={maxTimestamp:i,maxTimestampBeforeLastKeyPacket:null},this.trackTimestampInfo.set(e,s)}return i}}/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */const lt=/<(?:(\d{2}):)?(\d{2}):(\d{2}).(\d{3})>/g,ql=/(?:(\d{2}):)?(\d{2}):(\d{2}).(\d{3})/,Zl=t=>{const e=ql.exec(t);if(!e)throw new Error("Expected match.");return 60*60*1e3*Number(e[1]||"0")+60*1e3*Number(e[2])+1e3*Number(e[3])+Number(e[4])},Tr=t=>{const e=Math.floor(t/36e5),i=Math.floor(t%(60*60*1e3)/(60*1e3)),r=Math.floor(t%(60*1e3)/1e3),s=t%1e3;return e.toString().padStart(2,"0")+":"+i.toString().padStart(2,"0")+":"+r.toString().padStart(2,"0")+"."+s.toString().padStart(3,"0")};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */class Ei{constructor(e){this.writer=e,this.helper=new Uint8Array(8),this.helperView=new DataView(this.helper.buffer),this.offsets=new WeakMap}writeU32(e){this.helperView.setUint32(0,e,!1),this.writer.write(this.helper.subarray(0,4))}writeU64(e){this.helperView.setUint32(0,Math.floor(e/2**32),!1),this.helperView.setUint32(4,e,!1),this.writer.write(this.helper.subarray(0,8))}writeAscii(e){for(let i=0;i<e.length;i++)this.helperView.setUint8(i%8,e.charCodeAt(i)),i%8===7&&this.writer.write(this.helper);e.length%8!==0&&this.writer.write(this.helper.subarray(0,e.length%8))}writeBox(e){if(this.offsets.set(e,this.writer.getPos()),e.contents&&!e.children)this.writeBoxHeader(e,e.size??e.contents.byteLength+8),this.writer.write(e.contents);else{const i=this.writer.getPos();if(this.writeBoxHeader(e,0),e.contents&&this.writer.write(e.contents),e.children)for(const a of e.children)a&&this.writeBox(a);const r=this.writer.getPos(),s=e.size??r-i;this.writer.seek(i),this.writeBoxHeader(e,s),this.writer.seek(r)}}writeBoxHeader(e,i){this.writeU32(e.largeSize?1:i),this.writeAscii(e.type),e.largeSize&&this.writeU64(i)}measureBoxHeader(e){return 8+(e.largeSize?8:0)}patchBox(e){const i=this.offsets.get(e);M(i!==void 0);const r=this.writer.getPos();this.writer.seek(i),this.writeBox(e),this.writer.seek(r)}measureBox(e){if(e.contents&&!e.children)return this.measureBoxHeader(e)+e.contents.byteLength;{let i=this.measureBoxHeader(e);if(e.contents&&(i+=e.contents.byteLength),e.children)for(const r of e.children)r&&(i+=this.measureBox(r));return i}}}const L=new Uint8Array(8),ne=new DataView(L.buffer),J=t=>[(t%256+256)%256],_=t=>(ne.setUint16(0,t,!1),[L[0],L[1]]),Yt=t=>(ne.setInt16(0,t,!1),[L[0],L[1]]),Cr=t=>(ne.setUint32(0,t,!1),[L[1],L[2],L[3]]),w=t=>(ne.setUint32(0,t,!1),[L[0],L[1],L[2],L[3]]),ye=t=>(ne.setInt32(0,t,!1),[L[0],L[1],L[2],L[3]]),De=t=>(ne.setUint32(0,Math.floor(t/2**32),!1),ne.setUint32(4,t,!1),[L[0],L[1],L[2],L[3],L[4],L[5],L[6],L[7]]),Sr=t=>(ne.setInt16(0,2**8*t,!1),[L[0],L[1]]),ue=t=>(ne.setInt32(0,2**16*t,!1),[L[0],L[1],L[2],L[3]]),yt=t=>(ne.setInt32(0,2**30*t,!1),[L[0],L[1],L[2],L[3]]),vt=(t,e)=>{const i=[];let r=t;do{let s=r&127;r>>=7,i.length>0&&(s|=128),i.push(s)}while(r>0||e);return i.reverse()},Q=(t,e=!1)=>{const i=Array(t.length).fill(null).map((r,s)=>t.charCodeAt(s));return e&&i.push(0),i},ei=t=>{let e=null;for(const i of t)(!e||i.timestamp>e.timestamp)&&(e=i);return e},kr=t=>{const e=t*(Math.PI/180),i=Math.round(Math.cos(e)),r=Math.round(Math.sin(e));return[i,r,0,-r,i,0,0,0,1]},Ar=kr(0),Fr=t=>[ue(t[0]),ue(t[1]),yt(t[2]),ue(t[3]),ue(t[4]),yt(t[5]),ue(t[6]),ue(t[7]),yt(t[8])],P=(t,e,i)=>({type:t,contents:e&&new Uint8Array(e.flat(10)),children:i}),W=(t,e,i,r,s)=>P(t,[J(e),Cr(i),r??[]],s),Kl=t=>t.isQuickTime?P("ftyp",[Q("qt  "),w(512),Q("qt  ")]):t.fragmented?P("ftyp",[Q("iso5"),w(512),Q("iso5"),Q("iso6"),Q("mp41")]):P("ftyp",[Q("isom"),w(512),Q("isom"),t.holdsAvc?Q("avc1"):[],Q("mp41")]),it=t=>({type:"mdat",largeSize:t}),Ql=t=>({type:"free",size:t}),He=t=>P("moov",void 0,[Yl(t.creationTime,t.trackDatas),...t.trackDatas.map(e=>ec(e,t.creationTime)),t.isFragmented?Oc(t.trackDatas):null,Kc(t)]),Yl=(t,e)=>{const i=Z(Math.max(0,...e.filter(o=>o.samples.length>0).map(o=>{const n=ei(o.samples);return n.timestamp+n.duration})),Pt),r=Math.max(0,...e.map(o=>o.track.id))+1,s=!Le(t)||!Le(i),a=s?De:w;return W("mvhd",+s,0,[a(t),a(t),w(Pt),a(i),ue(1),Sr(1),Array(10).fill(0),Fr(Ar),Array(24).fill(0),w(r)])},ec=(t,e)=>{const i=du(t);return P("trak",void 0,[tc(t,e),ic(t,e),i.name!==void 0?P("udta",void 0,[P("name",[...Y.encode(i.name)])]):null])},tc=(t,e)=>{var l;const i=ei(t.samples),r=Z(i?i.timestamp+i.duration:0,Pt),s=!Le(e)||!Le(r),a=s?De:w;let o;if(t.type==="video"){const c=t.track.metadata.rotation;o=kr(c??0)}else o=Ar;let n=2;return((l=t.track.metadata.disposition)==null?void 0:l.default)!==!1&&(n|=1),W("tkhd",+s,n,[a(e),a(e),w(t.track.id),w(0),a(r),Array(8).fill(0),_(0),_(t.track.id),Sr(t.type==="audio"?1:0),_(0),Fr(o),ue(t.type==="video"?t.info.width:0),ue(t.type==="video"?t.info.height:0)])},ic=(t,e)=>P("mdia",void 0,[rc(t,e),ti(!0,sc[t.type],ac[t.type]),oc(t)]),rc=(t,e)=>{const i=ei(t.samples),r=Z(i?i.timestamp+i.duration:0,t.timescale),s=!Le(e)||!Le(r),a=s?De:w;return W("mdhd",+s,0,[a(e),a(e),w(t.timescale),a(r),_(Pr(t.track.metadata.languageCode??Xi)),_(0)])},sc={video:"vide",audio:"soun",subtitle:"text"},ac={video:"MediabunnyVideoHandler",audio:"MediabunnySoundHandler",subtitle:"MediabunnyTextHandler"},ti=(t,e,i,r="\0\0\0\0")=>W("hdlr",0,0,[t?Q("mhlr"):w(0),Q(e),Q(r),w(0),w(0),Q(i,!0)]),oc=t=>P("minf",void 0,[uc[t.type](),dc(),fc(t)]),nc=()=>W("vmhd",0,1,[_(0),_(0),_(0),_(0)]),lc=()=>W("smhd",0,0,[_(0),_(0)]),cc=()=>W("nmhd",0,0),uc={video:nc,audio:lc,subtitle:cc},dc=()=>P("dinf",void 0,[pc()]),pc=()=>W("dref",0,0,[w(1)],[hc()]),hc=()=>W("url ",0,1),fc=t=>{const e=t.compositionTimeOffsetTable.length>1||t.compositionTimeOffsetTable.some(i=>i.sampleCompositionTimeOffset!==0);return P("stbl",void 0,[mc(t),Pc(t),e?jc(t):null,e?zc(t):null,Dc(t),Ic(t),Bc(t),_c(t)])},mc=t=>{let e;if(t.type==="video")e=gc(tu(t.track.source._codec,t.info.decoderConfig.codec),t);else if(t.type==="audio"){const i=Er(t.track.source._codec,t.muxer.isQuickTime);M(i),e=Tc(i,t)}else t.type==="subtitle"&&(e=Rc(su[t.track.source._codec],t));return M(e),W("stsd",0,0,[w(1)],[e])},gc=(t,e)=>P(t,[Array(6).fill(0),_(1),_(0),_(0),Array(12).fill(0),_(e.info.width),_(e.info.height),w(4718592),w(4718592),w(0),_(1),Array(32).fill(0),_(24),Yt(65535)],[iu[e.track.source._codec](e),bc(e),$i(e.info.decoderConfig.colorSpace)?xc(e):null]),bc=t=>t.info.pixelAspectRatio.num===t.info.pixelAspectRatio.den?null:P("pasp",[w(t.info.pixelAspectRatio.num),w(t.info.pixelAspectRatio.den)]),xc=t=>P("colr",[Q("nclx"),_(Bt[t.info.decoderConfig.colorSpace.primaries]),_(jt[t.info.decoderConfig.colorSpace.transfer]),_(zt[t.info.decoderConfig.colorSpace.matrix]),J((t.info.decoderConfig.colorSpace.fullRange?1:0)<<7)]),yc=t=>t.info.decoderConfig&&P("avcC",[...ve(t.info.decoderConfig.description)]),vc=t=>t.info.decoderConfig&&P("hvcC",[...ve(t.info.decoderConfig.description)]),Pi=t=>{var p,m,b,f;if(!t.info.decoderConfig)return null;const e=t.info.decoderConfig,i=e.codec.split("."),r=Number(i[1]),s=Number(i[2]),a=Number(i[3]),o=i[4]?Number(i[4]):1,n=i[8]?Number(i[8]):Number(((p=e.colorSpace)==null?void 0:p.fullRange)??0),l=(a<<4)+(o<<1)+n,c=i[5]?Number(i[5]):(m=e.colorSpace)!=null&&m.primaries?Bt[e.colorSpace.primaries]:2,u=i[6]?Number(i[6]):(b=e.colorSpace)!=null&&b.transfer?jt[e.colorSpace.transfer]:2,h=i[7]?Number(i[7]):(f=e.colorSpace)!=null&&f.matrix?zt[e.colorSpace.matrix]:2;return W("vpcC",1,0,[J(r),J(s),J(l),J(c),J(u),J(h),_(0)])},wc=t=>P("av1C",qi(t.info.decoderConfig.codec)),Tc=(t,e)=>{var o;let i=0,r,s=16;const a=dt.includes(e.track.source._codec);if(a){const n=e.track.source._codec,{sampleSize:l}=Ve(n);s=8*l,s>16&&(i=1)}if(e.muxer.isQuickTime&&(i=1),i===0)r=[Array(6).fill(0),_(1),_(i),_(0),w(0),_(e.info.numberOfChannels),_(s),_(0),_(0),_(e.info.sampleRate<2**16?e.info.sampleRate:0),_(0)];else{const n=a?0:-2;r=[Array(6).fill(0),_(1),_(i),_(0),w(0),_(e.info.numberOfChannels),_(Math.min(s,16)),Yt(n),_(0),_(e.info.sampleRate<2**16?e.info.sampleRate:0),_(0),a?[w(1),w(s/8),w(e.info.numberOfChannels*s/8)]:[w(0),w(0),w(0)],w(2)]}return P(t,r,[((o=ru(e.track.source._codec,e.muxer.isQuickTime))==null?void 0:o(e))??null])},wt=t=>{let e;switch(t.track.source._codec){case"aac":e=64;break;case"mp3":e=107;break;case"vorbis":e=221;break;default:throw new Error(`Unhandled audio codec: ${t.track.source._codec}`)}let i=[...J(e),...J(21),...Cr(0),...w(0),...w(0)];if(t.info.decoderConfig.description){const r=ve(t.info.decoderConfig.description);i=[...i,...J(5),...vt(r.byteLength),...r]}return i=[..._(1),...J(0),...J(4),...vt(i.length),...i,...J(6),...J(1),...J(2)],i=[...J(3),...vt(i.length),...i],W("esds",0,0,i)},me=t=>P("wave",void 0,[Cc(t),Sc(t),P("\0\0\0\0")]),Cc=t=>P("frma",[Q(Er(t.track.source._codec,t.muxer.isQuickTime))]),Sc=t=>{const{littleEndian:e}=Ve(t.track.source._codec);return P("enda",[_(+e)])},kc=t=>{var l;let e=t.info.numberOfChannels,i=3840,r=t.info.sampleRate,s=0,a=0,o=new Uint8Array(0);const n=(l=t.info.decoderConfig)==null?void 0:l.description;if(n){M(n.byteLength>=18);const c=ve(n),u=br(c);e=u.outputChannelCount,i=u.preSkip,r=u.inputSampleRate,s=u.outputGain,a=u.channelMappingFamily,u.channelMappingTable&&(o=u.channelMappingTable)}return P("dOps",[J(0),J(e),_(i),w(r),Yt(s),J(a),...o])},Ac=t=>{var r;const e=(r=t.info.decoderConfig)==null?void 0:r.description;M(e);const i=ve(e);return W("dfLa",0,0,[...i.subarray(4)])},se=t=>{const{littleEndian:e,sampleSize:i}=Ve(t.track.source._codec),r=+e;return W("pcmC",0,0,[J(r),J(8*i)])},Fc=t=>{const e=Ul(t.info.firstPacket.data);if(!e)throw new Error("Couldn't extract AC-3 frame info from the audio packet. Ensure the packets contain valid AC-3 sync frames (as specified in ETSI TS 102 366).");const i=new Uint8Array(3),r=new te(i);return r.writeBits(2,e.fscod),r.writeBits(5,e.bsid),r.writeBits(3,e.bsmod),r.writeBits(3,e.acmod),r.writeBits(1,e.lfeon),r.writeBits(5,e.bitRateCode),r.writeBits(5,0),P("dac3",[...i])},Mc=t=>{const e=Nl(t.info.firstPacket.data);if(!e)throw new Error("Couldn't extract E-AC-3 frame info from the audio packet. Ensure the packets contain valid E-AC-3 sync frames (as specified in ETSI TS 102 366).");let i=16;for(const o of e.substreams)i+=23,o.numDepSub>0?i+=9:i+=1;const r=Math.ceil(i/8),s=new Uint8Array(r),a=new te(s);a.writeBits(13,e.dataRate),a.writeBits(3,e.substreams.length-1);for(const o of e.substreams)a.writeBits(2,o.fscod),a.writeBits(5,o.bsid),a.writeBits(1,0),a.writeBits(1,0),a.writeBits(3,o.bsmod),a.writeBits(3,o.acmod),a.writeBits(1,o.lfeon),a.writeBits(3,0),a.writeBits(4,o.numDepSub),o.numDepSub>0?a.writeBits(9,o.chanLoc):a.writeBits(1,0);return P("dec3",[...s])},Rc=(t,e)=>P(t,[Array(6).fill(0),_(1)],[au[e.track.source._codec](e)]),Ec=t=>P("vttC",[...Y.encode(t.info.config.description)]),Pc=t=>W("stts",0,0,[w(t.timeToSampleTable.length),t.timeToSampleTable.map(e=>[w(e.sampleCount),w(e.sampleDelta)])]),_c=t=>{if(t.samples.every(i=>i.type==="key"))return null;const e=[...t.samples.entries()].filter(([,i])=>i.type==="key");return W("stss",0,0,[w(e.length),e.map(([i])=>w(i+1))])},Dc=t=>W("stsc",0,0,[w(t.compactlyCodedChunkTable.length),t.compactlyCodedChunkTable.map(e=>[w(e.firstChunk),w(e.samplesPerChunk),w(1)])]),Ic=t=>{if(t.type==="audio"&&t.info.requiresPcmTransformation){const{sampleSize:e}=Ve(t.track.source._codec);return W("stsz",0,0,[w(e*t.info.numberOfChannels),w(t.samples.reduce((i,r)=>i+Z(r.duration,t.timescale),0))])}return W("stsz",0,0,[w(0),w(t.samples.length),t.samples.map(e=>w(e.size))])},Bc=t=>t.finalizedChunks.length>0&&Me(t.finalizedChunks).offset>=2**32?W("co64",0,0,[w(t.finalizedChunks.length),t.finalizedChunks.map(e=>De(e.offset))]):W("stco",0,0,[w(t.finalizedChunks.length),t.finalizedChunks.map(e=>w(e.offset))]),jc=t=>W("ctts",1,0,[w(t.compositionTimeOffsetTable.length),t.compositionTimeOffsetTable.map(e=>[w(e.sampleCount),ye(e.sampleCompositionTimeOffset)])]),zc=t=>{let e=1/0,i=-1/0,r=1/0,s=-1/0;M(t.compositionTimeOffsetTable.length>0),M(t.samples.length>0);for(let o=0;o<t.compositionTimeOffsetTable.length;o++){const n=t.compositionTimeOffsetTable[o];e=Math.min(e,n.sampleCompositionTimeOffset),i=Math.max(i,n.sampleCompositionTimeOffset)}for(let o=0;o<t.samples.length;o++){const n=t.samples[o];r=Math.min(r,Z(n.timestamp,t.timescale)),s=Math.max(s,Z(n.timestamp+n.duration,t.timescale))}const a=Math.max(-e,0);return s>=2**31?null:W("cslg",0,0,[ye(a),ye(e),ye(i),ye(r),ye(s)])},Oc=t=>P("mvex",void 0,t.map(Uc)),Uc=t=>W("trex",0,0,[w(t.track.id),w(1),w(0),w(0),w(0)]),_i=(t,e)=>P("moof",void 0,[Lc(t),...e.map(Nc)]),Lc=t=>W("mfhd",0,0,[w(t)]),Mr=t=>{let e=0,i=0;const r=0,s=0,a=t.type==="delta";return i|=+a,a?e|=1:e|=2,e<<24|i<<16|r<<8|s},Nc=t=>P("traf",void 0,[Vc(t),Wc(t),Hc(t)]),Vc=t=>{M(t.currentChunk);let e=0;e|=8,e|=16,e|=32,e|=131072;const i=t.currentChunk.samples[1]??t.currentChunk.samples[0],r={duration:i.timescaleUnitsToNextSample,size:i.size,flags:Mr(i)};return W("tfhd",0,e,[w(t.track.id),w(r.duration),w(r.size),w(r.flags)])},Wc=t=>(M(t.currentChunk),W("tfdt",1,0,[De(Z(t.currentChunk.startTimestamp,t.timescale))])),Hc=t=>{M(t.currentChunk);const e=t.currentChunk.samples.map(f=>f.timescaleUnitsToNextSample),i=t.currentChunk.samples.map(f=>f.size),r=t.currentChunk.samples.map(Mr),s=t.currentChunk.samples.map(f=>Z(f.timestamp-f.decodeTimestamp,t.timescale)),a=new Set(e),o=new Set(i),n=new Set(r),l=new Set(s),c=n.size===2&&r[0]!==r[1],u=a.size>1,h=o.size>1,p=!c&&n.size>1,m=l.size>1||[...l].some(f=>f!==0);let b=0;return b|=1,b|=4*+c,b|=256*+u,b|=512*+h,b|=1024*+p,b|=2048*+m,W("trun",1,b,[w(t.currentChunk.samples.length),w(t.currentChunk.offset-t.currentChunk.moofOffset||0),c?w(r[0]):[],t.currentChunk.samples.map((f,y)=>[u?w(e[y]):[],h?w(i[y]):[],p?w(r[y]):[],m?ye(s[y]):[]])])},Gc=t=>P("mfra",void 0,[...t.map(Jc),Xc()]),Jc=(t,e)=>W("tfra",1,0,[w(t.track.id),w(63),w(t.finalizedChunks.length),t.finalizedChunks.map(r=>[De(Z(r.samples[0].timestamp,t.timescale)),De(r.moofOffset),w(e+1),w(1),w(1)])]),Xc=()=>W("mfro",0,0,[w(0)]),$c=()=>P("vtte"),qc=(t,e,i,r,s)=>P("vttc",void 0,[s!==null?P("vsid",[ye(s)]):null,i!==null?P("iden",[...Y.encode(i)]):null,e!==null?P("ctim",[...Y.encode(Tr(e))]):null,r!==null?P("sttg",[...Y.encode(r)]):null,P("payl",[...Y.encode(t)])]),Zc=t=>P("vtta",[...Y.encode(t)]),Kc=t=>{const e=[],i=t.format._options.metadataFormat??"auto",r=t.output._metadataTags;if(i==="mdir"||i==="auto"&&!t.isQuickTime){const s=Yc(r);s&&e.push(s)}else if(i==="mdta"){const s=eu(r);s&&e.push(s)}else(i==="udta"||i==="auto"&&t.isQuickTime)&&Qc(e,t.output._metadataTags);return e.length===0?null:P("udta",void 0,e)},Qc=(t,e)=>{for(const{key:i,value:r}of It(e))switch(i){case"title":t.push(ae("©nam",r));break;case"description":t.push(ae("©des",r));break;case"artist":t.push(ae("©ART",r));break;case"album":t.push(ae("©alb",r));break;case"albumArtist":t.push(ae("albr",r));break;case"genre":t.push(ae("©gen",r));break;case"date":t.push(ae("©day",r.toISOString().slice(0,10)));break;case"comment":t.push(ae("©cmt",r));break;case"lyrics":t.push(ae("©lyr",r));break;case"raw":break;case"discNumber":case"discsTotal":case"trackNumber":case"tracksTotal":case"images":break;default:ut(i)}if(e.raw)for(const i in e.raw){const r=e.raw[i];r==null||i.length!==4||t.some(s=>s.type===i)||(typeof r=="string"?t.push(ae(i,r)):r instanceof Uint8Array&&t.push(P(i,Array.from(r))))}},ae=(t,e)=>{const i=Y.encode(e);return P(t,[_(i.length),_(Pr("und")),Array.from(i)])},Di={"image/jpeg":13,"image/png":14,"image/bmp":27},Rr=(t,e)=>{const i=[];for(const{key:r,value:s}of It(t))switch(r){case"title":i.push({key:e?"title":"©nam",value:ie(s)});break;case"description":i.push({key:e?"description":"©des",value:ie(s)});break;case"artist":i.push({key:e?"artist":"©ART",value:ie(s)});break;case"album":i.push({key:e?"album":"©alb",value:ie(s)});break;case"albumArtist":i.push({key:e?"album_artist":"aART",value:ie(s)});break;case"comment":i.push({key:e?"comment":"©cmt",value:ie(s)});break;case"genre":i.push({key:e?"genre":"©gen",value:ie(s)});break;case"lyrics":i.push({key:e?"lyrics":"©lyr",value:ie(s)});break;case"date":i.push({key:e?"date":"©day",value:ie(s.toISOString().slice(0,10))});break;case"images":for(const a of s)a.kind==="coverFront"&&i.push({key:"covr",value:P("data",[w(Di[a.mimeType]??0),w(0),Array.from(a.data)])});break;case"trackNumber":if(e){const a=t.tracksTotal!==void 0?`${s}/${t.tracksTotal}`:s.toString();i.push({key:"track",value:ie(a)})}else i.push({key:"trkn",value:P("data",[w(0),w(0),_(0),_(s),_(t.tracksTotal??0),_(0)])});break;case"discNumber":e||i.push({key:"disc",value:P("data",[w(0),w(0),_(0),_(s),_(t.discsTotal??0),_(0)])});break;case"tracksTotal":case"discsTotal":break;case"raw":break;default:ut(r)}if(t.raw)for(const r in t.raw){const s=t.raw[r];s==null||!e&&r.length!==4||i.some(a=>a.key===r)||(typeof s=="string"?i.push({key:r,value:ie(s)}):s instanceof Uint8Array?i.push({key:r,value:P("data",[w(0),w(0),Array.from(s)])}):s instanceof hr&&i.push({key:r,value:P("data",[w(Di[s.mimeType]??0),w(0),Array.from(s.data)])}))}return i},Yc=t=>{const e=Rr(t,!1);return e.length===0?null:W("meta",0,0,void 0,[ti(!1,"mdir","","appl"),P("ilst",void 0,e.map(i=>P(i.key,void 0,[i.value])))])},eu=t=>{const e=Rr(t,!0);return e.length===0?null:P("meta",void 0,[ti(!1,"mdta",""),W("keys",0,0,[w(e.length)],e.map(i=>P("mdta",[...Y.encode(i.key)]))),P("ilst",void 0,e.map((i,r)=>{const s=String.fromCharCode(...w(r+1));return P(s,void 0,[i.value])}))])},ie=t=>P("data",[w(1),w(0),...Y.encode(t)]),tu=(t,e)=>{switch(t){case"avc":return e.startsWith("avc3")?"avc3":"avc1";case"hevc":return"hvc1";case"vp8":return"vp08";case"vp9":return"vp09";case"av1":return"av01"}},iu={avc:yc,hevc:vc,vp8:Pi,vp9:Pi,av1:wc},Er=(t,e)=>{switch(t){case"aac":return"mp4a";case"mp3":return"mp4a";case"opus":return"Opus";case"vorbis":return"mp4a";case"flac":return"fLaC";case"ulaw":return"ulaw";case"alaw":return"alaw";case"pcm-u8":return"raw ";case"pcm-s8":return"sowt";case"ac3":return"ac-3";case"eac3":return"ec-3"}if(e)switch(t){case"pcm-s16":return"sowt";case"pcm-s16be":return"twos";case"pcm-s24":return"in24";case"pcm-s24be":return"in24";case"pcm-s32":return"in32";case"pcm-s32be":return"in32";case"pcm-f32":return"fl32";case"pcm-f32be":return"fl32";case"pcm-f64":return"fl64";case"pcm-f64be":return"fl64"}else switch(t){case"pcm-s16":return"ipcm";case"pcm-s16be":return"ipcm";case"pcm-s24":return"ipcm";case"pcm-s24be":return"ipcm";case"pcm-s32":return"ipcm";case"pcm-s32be":return"ipcm";case"pcm-f32":return"fpcm";case"pcm-f32be":return"fpcm";case"pcm-f64":return"fpcm";case"pcm-f64be":return"fpcm"}},ru=(t,e)=>{switch(t){case"aac":return wt;case"mp3":return wt;case"opus":return kc;case"vorbis":return wt;case"flac":return Ac;case"ac3":return Fc;case"eac3":return Mc}if(e)switch(t){case"pcm-s24":return me;case"pcm-s24be":return me;case"pcm-s32":return me;case"pcm-s32be":return me;case"pcm-f32":return me;case"pcm-f32be":return me;case"pcm-f64":return me;case"pcm-f64be":return me}else switch(t){case"pcm-s16":return se;case"pcm-s16be":return se;case"pcm-s24":return se;case"pcm-s24be":return se;case"pcm-s32":return se;case"pcm-s32be":return se;case"pcm-f32":return se;case"pcm-f32be":return se;case"pcm-f64":return se;case"pcm-f64be":return se}return null},su={webvtt:"wvtt"},au={webvtt:Ec},Pr=t=>{M(t.length===3);let e=0;for(let i=0;i<3;i++)e<<=5,e+=t.charCodeAt(i)-96;return e};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */class _r{constructor(){this.ensureMonotonicity=!1,this.trackedWrites=null,this.trackedStart=-1,this.trackedEnd=-1}start(){}maybeTrackWrites(e){if(!this.trackedWrites)return;let i=this.getPos();if(i<this.trackedStart){if(i+e.byteLength<=this.trackedStart)return;e=e.subarray(this.trackedStart-i),i=0}const r=i+e.byteLength-this.trackedStart;let s=this.trackedWrites.byteLength;for(;s<r;)s*=2;if(s!==this.trackedWrites.byteLength){const a=new Uint8Array(s);a.set(this.trackedWrites,0),this.trackedWrites=a}this.trackedWrites.set(e,i-this.trackedStart),this.trackedEnd=Math.max(this.trackedEnd,i+e.byteLength)}startTrackingWrites(){this.trackedWrites=new Uint8Array(2**10),this.trackedStart=this.getPos(),this.trackedEnd=this.trackedStart}stopTrackingWrites(){if(!this.trackedWrites)throw new Error("Internal error: Can't get tracked writes since nothing was tracked.");const i={data:this.trackedWrites.subarray(0,this.trackedEnd-this.trackedStart),start:this.trackedStart,end:this.trackedEnd};return this.trackedWrites=null,i}}const Tt=2**16,Ct=2**32;class Dr extends _r{constructor(e){if(super(),this.pos=0,this.maxPos=0,this.target=e,this.supportsResize="resize"in new ArrayBuffer(0),this.supportsResize)try{this.buffer=new ArrayBuffer(Tt,{maxByteLength:Ct})}catch{this.buffer=new ArrayBuffer(Tt),this.supportsResize=!1}else this.buffer=new ArrayBuffer(Tt);this.bytes=new Uint8Array(this.buffer)}ensureSize(e){let i=this.buffer.byteLength;for(;i<e;)i*=2;if(i!==this.buffer.byteLength){if(i>Ct)throw new Error(`ArrayBuffer exceeded maximum size of ${Ct} bytes. Please consider using another target.`);if(this.supportsResize)this.buffer.resize(i);else{const r=new ArrayBuffer(i),s=new Uint8Array(r);s.set(this.bytes,0),this.buffer=r,this.bytes=s}}}write(e){var i,r;this.maybeTrackWrites(e),this.ensureSize(this.pos+e.byteLength),this.bytes.set(e,this.pos),(r=(i=this.target).onwrite)==null||r.call(i,this.pos,this.pos+e.byteLength),this.pos+=e.byteLength,this.maxPos=Math.max(this.maxPos,this.pos)}seek(e){this.pos=e}getPos(){return this.pos}async flush(){}async finalize(){this.ensureSize(this.pos),this.target.buffer=this.buffer.slice(0,Math.max(this.maxPos,this.pos))}async close(){}getSlice(e,i){return this.bytes.slice(e,i)}}const ou=2**24,nu=2;class lu extends _r{constructor(e){super(),this.pos=0,this.sections=[],this.lastWriteEnd=0,this.lastFlushEnd=0,this.writer=null,this.writeError=null,this.chunks=[],this.target=e,this.chunked=e._options.chunked??!1,this.chunkSize=e._options.chunkSize??ou}start(){this.writer=this.target._writable.getWriter()}write(e){var i,r;if(this.pos>this.lastWriteEnd){const s=this.pos-this.lastWriteEnd;this.pos=this.lastWriteEnd,this.write(new Uint8Array(s))}this.maybeTrackWrites(e),this.sections.push({data:e.slice(),start:this.pos}),(r=(i=this.target).onwrite)==null||r.call(i,this.pos,this.pos+e.byteLength),this.pos+=e.byteLength,this.lastWriteEnd=Math.max(this.lastWriteEnd,this.pos)}seek(e){this.pos=e}getPos(){return this.pos}async flush(){if(this.writeError!==null)throw this.writeError;if(this.pos>this.lastWriteEnd){const r=this.pos-this.lastWriteEnd;this.pos=this.lastWriteEnd,this.write(new Uint8Array(r))}if(M(this.writer),this.sections.length===0)return;const e=[],i=[...this.sections].sort((r,s)=>r.start-s.start);e.push({start:i[0].start,size:i[0].data.byteLength});for(let r=1;r<i.length;r++){const s=e[e.length-1],a=i[r];a.start<=s.start+s.size?s.size=Math.max(s.size,a.start+a.data.byteLength-s.start):e.push({start:a.start,size:a.data.byteLength})}for(const r of e){r.data=new Uint8Array(r.size);for(const s of this.sections)r.start<=s.start&&s.start<r.start+r.size&&r.data.set(s.data,s.start-r.start);if(this.writer.desiredSize!==null&&this.writer.desiredSize<=0&&await this.writer.ready,this.chunked)this.writeDataIntoChunks(r.data,r.start),this.tryToFlushChunks();else{if(this.ensureMonotonicity&&r.start!==this.lastFlushEnd)throw new Error("Internal error: Monotonicity violation.");this.writer.write({type:"write",data:r.data,position:r.start}).catch(s=>{this.writeError??(this.writeError=s)}),this.lastFlushEnd=r.start+r.data.byteLength}}this.sections.length=0}writeDataIntoChunks(e,i){let r=this.chunks.findIndex(l=>l.start<=i&&i<l.start+this.chunkSize);r===-1&&(r=this.createChunk(i));const s=this.chunks[r],a=i-s.start,o=e.subarray(0,Math.min(this.chunkSize-a,e.byteLength));s.data.set(o,a);const n={start:a,end:a+o.byteLength};if(this.insertSectionIntoChunk(s,n),s.written[0].start===0&&s.written[0].end===this.chunkSize&&(s.shouldFlush=!0),this.chunks.length>nu){for(let l=0;l<this.chunks.length-1;l++)this.chunks[l].shouldFlush=!0;this.tryToFlushChunks()}o.byteLength<e.byteLength&&this.writeDataIntoChunks(e.subarray(o.byteLength),i+o.byteLength)}insertSectionIntoChunk(e,i){let r=0,s=e.written.length-1,a=-1;for(;r<=s;){const o=Math.floor(r+(s-r+1)/2);e.written[o].start<=i.start?(r=o+1,a=o):s=o-1}for(e.written.splice(a+1,0,i),(a===-1||e.written[a].end<i.start)&&a++;a<e.written.length-1&&e.written[a].end>=e.written[a+1].start;)e.written[a].end=Math.max(e.written[a].end,e.written[a+1].end),e.written.splice(a+1,1)}createChunk(e){const r={start:Math.floor(e/this.chunkSize)*this.chunkSize,data:new Uint8Array(this.chunkSize),written:[],shouldFlush:!1};return this.chunks.push(r),this.chunks.sort((s,a)=>s.start-a.start),this.chunks.indexOf(r)}tryToFlushChunks(e=!1){M(this.writer);for(let i=0;i<this.chunks.length;i++){const r=this.chunks[i];if(!(!r.shouldFlush&&!e)){for(const s of r.written){const a=r.start+s.start;if(this.ensureMonotonicity&&a!==this.lastFlushEnd)throw new Error("Internal error: Monotonicity violation.");this.writer.write({type:"write",data:r.data.subarray(s.start,s.end),position:a}).catch(o=>{this.writeError??(this.writeError=o)}),this.lastFlushEnd=r.start+s.end}this.chunks.splice(i--,1)}}}async finalize(){if(this.chunked&&this.tryToFlushChunks(!0),this.writeError!==null)throw this.writeError;return M(this.writer),await this.writer.ready,this.writer.close()}async close(){var e;return(e=this.writer)==null?void 0:e.close()}}/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */class ii{constructor(){this._output=null,this.onwrite=null}}class Et extends ii{constructor(){super(...arguments),this.buffer=null}_createWriter(){return new Dr(this)}}class cu extends ii{constructor(e,i={}){if(super(),!(e instanceof WritableStream))throw new TypeError("StreamTarget requires a WritableStream instance.");if(i!=null&&typeof i!="object")throw new TypeError("StreamTarget options, when provided, must be an object.");if(i.chunked!==void 0&&typeof i.chunked!="boolean")throw new TypeError("options.chunked, when provided, must be a boolean.");if(i.chunkSize!==void 0&&(!Number.isInteger(i.chunkSize)||i.chunkSize<1024))throw new TypeError("options.chunkSize, when provided, must be an integer and not smaller than 1024.");this._writable=e,this._options=i}_createWriter(){return new lu(this)}}/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */const Pt=1e3,uu=2082844800,du=t=>{const e={},i=t.track;return i.metadata.name!==void 0&&(e.name=i.metadata.name),e},Z=(t,e,i=!0)=>{const r=t*e;return i?Math.round(r):r};class pu extends wr{constructor(e,i){super(e),this.auxTarget=new Et,this.auxWriter=this.auxTarget._createWriter(),this.auxBoxWriter=new Ei(this.auxWriter),this.mdat=null,this.ftypSize=null,this.trackDatas=[],this.allTracksKnown=Zi(),this.creationTime=Math.floor(Date.now()/1e3)+uu,this.finalizedChunks=[],this.nextFragmentNumber=1,this.maxWrittenTimestamp=-1/0,this.format=i,this.writer=e._writer,this.boxWriter=new Ei(this.writer),this.isQuickTime=i instanceof jr;const r=this.writer instanceof Dr?"in-memory":!1;this.fastStart=i._options.fastStart??r,this.isFragmented=this.fastStart==="fragmented",(this.fastStart==="in-memory"||this.isFragmented)&&(this.writer.ensureMonotonicity=!0),this.minimumFragmentDuration=i._options.minimumFragmentDuration??1}async start(){const e=await this.mutex.acquire(),i=this.output._tracks.some(r=>r.type==="video"&&r.source._codec==="avc");if(this.format._options.onFtyp&&this.writer.startTrackingWrites(),this.boxWriter.writeBox(Kl({isQuickTime:this.isQuickTime,holdsAvc:i,fragmented:this.isFragmented})),this.format._options.onFtyp){const{data:r,start:s}=this.writer.stopTrackingWrites();this.format._options.onFtyp(r,s)}if(this.ftypSize=this.writer.getPos(),this.fastStart!=="in-memory")if(this.fastStart==="reserve"){for(const r of this.output._tracks)if(r.metadata.maximumPacketCount===void 0)throw new Error("All tracks must specify maximumPacketCount in their metadata when using fastStart: 'reserve'.")}else this.isFragmented||(this.format._options.onMdat&&this.writer.startTrackingWrites(),this.mdat=it(!0),this.boxWriter.writeBox(this.mdat));await this.writer.flush(),e()}allTracksAreKnown(){for(const e of this.output._tracks)if(!e.source._closed&&!this.trackDatas.some(i=>i.track===e))return!1;return!0}async getMimeType(){await this.allTracksKnown.promise;const e=this.trackDatas.map(i=>i.type==="video"||i.type==="audio"?i.info.decoderConfig.codec:{webvtt:"wvtt"}[i.track.source._codec]);return Vl({isQuickTime:this.isQuickTime,hasVideo:this.trackDatas.some(i=>i.type==="video"),hasAudio:this.trackDatas.some(i=>i.type==="audio"),codecStrings:e})}getVideoTrackData(e,i,r){const s=this.trackDatas.find(p=>p.track===e);if(s)return s;Ki(r),M(r),M(r.decoderConfig);const a={...r.decoderConfig};M(a.codedWidth!==void 0),M(a.codedHeight!==void 0);let o=!1;if(e.source._codec==="avc"&&!a.description){const p=Fl(i.data);if(!p)throw new Error("Couldn't extract an AVCDecoderConfigurationRecord from the AVC packet. Make sure the packets are in Annex B format (as specified in ITU-T-REC-H.264) when not providing a description, or provide a description (must be an AVCDecoderConfigurationRecord as specified in ISO 14496-15) and ensure the packets are in AVCC format.");a.description=Ml(p),o=!0}else if(e.source._codec==="hevc"&&!a.description){const p=Pl(i.data);if(!p)throw new Error("Couldn't extract an HEVCDecoderConfigurationRecord from the HEVC packet. Make sure the packets are in Annex B format (as specified in ITU-T-REC-H.265) when not providing a description, or provide a description (must be an HEVCDecoderConfigurationRecord as specified in ISO 14496-15) and ensure the packets are in HEVC format.");a.description=Ol(p),o=!0}const n=Zs(1/(e.metadata.frameRate??57600),1e6).denominator,l=a.displayAspectWidth,c=a.displayAspectHeight,u=l===void 0||c===void 0?{num:1,den:1}:Qi({num:l*a.codedHeight,den:c*a.codedWidth}),h={muxer:this,track:e,type:"video",info:{width:a.codedWidth,height:a.codedHeight,pixelAspectRatio:u,decoderConfig:a,requiresAnnexBTransformation:o},timescale:n,samples:[],sampleQueue:[],timestampProcessingQueue:[],timeToSampleTable:[],compositionTimeOffsetTable:[],lastTimescaleUnits:null,lastSample:null,finalizedChunks:[],currentChunk:null,compactlyCodedChunkTable:[]};return this.trackDatas.push(h),this.trackDatas.sort((p,m)=>p.track.id-m.track.id),this.allTracksAreKnown()&&this.allTracksKnown.resolve(),h}getAudioTrackData(e,i,r){const s=this.trackDatas.find(l=>l.track===e);if(s)return s;Yi(r),M(r),M(r.decoderConfig);const a={...r.decoderConfig};let o=!1;if(e.source._codec==="aac"&&!a.description){const l=nt(_e.tempFromBytes(i.data));if(!l)throw new Error("Couldn't parse ADTS header from the AAC packet. Make sure the packets are in ADTS format (as specified in ISO 13818-7) when not providing a description, or provide a description (must be an AudioSpecificConfig as specified in ISO 14496-3) and ensure the packets are raw AAC data.");const c=qt[l.samplingFrequencyIndex],u=Zt[l.channelConfiguration];if(c===void 0||u===void 0)throw new Error("Invalid ADTS frame header.");a.description=mr({objectType:l.objectType,sampleRate:c,numberOfChannels:u}),o=!0}const n={muxer:this,track:e,type:"audio",info:{numberOfChannels:r.decoderConfig.numberOfChannels,sampleRate:r.decoderConfig.sampleRate,decoderConfig:a,requiresPcmTransformation:!this.isFragmented&&dt.includes(e.source._codec),requiresAdtsStripping:o,firstPacket:i},timescale:a.sampleRate,samples:[],sampleQueue:[],timestampProcessingQueue:[],timeToSampleTable:[],compositionTimeOffsetTable:[],lastTimescaleUnits:null,lastSample:null,finalizedChunks:[],currentChunk:null,compactlyCodedChunkTable:[]};return this.trackDatas.push(n),this.trackDatas.sort((l,c)=>l.track.id-c.track.id),this.allTracksAreKnown()&&this.allTracksKnown.resolve(),n}getSubtitleTrackData(e,i){const r=this.trackDatas.find(a=>a.track===e);if(r)return r;er(i),M(i),M(i.config);const s={muxer:this,track:e,type:"subtitle",info:{config:i.config},timescale:1e3,samples:[],sampleQueue:[],timestampProcessingQueue:[],timeToSampleTable:[],compositionTimeOffsetTable:[],lastTimescaleUnits:null,lastSample:null,finalizedChunks:[],currentChunk:null,compactlyCodedChunkTable:[],lastCueEndTimestamp:0,cueQueue:[],nextSourceId:0,cueToSourceId:new WeakMap};return this.trackDatas.push(s),this.trackDatas.sort((a,o)=>a.track.id-o.track.id),this.allTracksAreKnown()&&this.allTracksKnown.resolve(),s}async addEncodedVideoPacket(e,i,r){const s=await this.mutex.acquire();try{const a=this.getVideoTrackData(e,i,r);let o=i.data;if(a.info.requiresAnnexBTransformation){const c=[...Kt(o)].map(u=>o.subarray(u.offset,u.offset+u.length));if(c.length===0)throw new Error("Failed to transform packet data. Make sure all packets are provided in Annex B format, as specified in ITU-T-REC-H.264 and ITU-T-REC-H.265.");o=Al(c,4)}const n=this.validateAndNormalizeTimestamp(a.track,i.timestamp,i.type==="key"),l=this.createSampleForTrack(a,o,n,i.duration,i.type);await this.registerSample(a,l)}finally{s()}}async addEncodedAudioPacket(e,i,r){const s=await this.mutex.acquire();try{const a=this.getAudioTrackData(e,i,r);let o=i.data;if(a.info.requiresAdtsStripping){const c=nt(_e.tempFromBytes(o));if(!c)throw new Error("Expected ADTS frame, didn't get one.");const u=c.crcCheck===null?yr:vr;o=o.subarray(u)}const n=this.validateAndNormalizeTimestamp(a.track,i.timestamp,i.type==="key"),l=this.createSampleForTrack(a,o,n,i.duration,i.type);a.info.requiresPcmTransformation&&await this.maybePadWithSilence(a,n),await this.registerSample(a,l)}finally{s()}}async maybePadWithSilence(e,i){const r=Me(e.samples),s=r?r.timestamp+r.duration:0,a=i-s,o=Z(a,e.timescale);if(o>0){const{sampleSize:n,silentValue:l}=Ve(e.info.decoderConfig.codec),c=o*e.info.numberOfChannels,u=new Uint8Array(n*c).fill(l),h=this.createSampleForTrack(e,new Uint8Array(u.buffer),s,a,"key");await this.registerSample(e,h)}}async addSubtitleCue(e,i,r){const s=await this.mutex.acquire();try{const a=this.getSubtitleTrackData(e,r);this.validateAndNormalizeTimestamp(a.track,i.timestamp,!0),e.source._codec==="webvtt"&&(a.cueQueue.push(i),await this.processWebVTTCues(a,i.timestamp))}finally{s()}}async processWebVTTCues(e,i){for(;e.cueQueue.length>0;){const r=new Set([]);for(const c of e.cueQueue)M(c.timestamp<=i),M(e.lastCueEndTimestamp<=c.timestamp+c.duration),r.add(Math.max(c.timestamp,e.lastCueEndTimestamp)),r.add(c.timestamp+c.duration);const s=[...r].sort((c,u)=>c-u),a=s[0],o=s[1]??a;if(i<o)break;if(e.lastCueEndTimestamp<a){this.auxWriter.seek(0);const c=$c();this.auxBoxWriter.writeBox(c);const u=this.auxWriter.getSlice(0,this.auxWriter.getPos()),h=this.createSampleForTrack(e,u,e.lastCueEndTimestamp,a-e.lastCueEndTimestamp,"key");await this.registerSample(e,h),e.lastCueEndTimestamp=a}this.auxWriter.seek(0);for(let c=0;c<e.cueQueue.length;c++){const u=e.cueQueue[c];if(u.timestamp>=o)break;lt.lastIndex=0;const h=lt.test(u.text),p=u.timestamp+u.duration;let m=e.cueToSourceId.get(u);if(m===void 0&&o<p&&(m=e.nextSourceId++,e.cueToSourceId.set(u,m)),u.notes){const f=Zc(u.notes);this.auxBoxWriter.writeBox(f)}const b=qc(u.text,h?a:null,u.identifier??null,u.settings??null,m??null);this.auxBoxWriter.writeBox(b),p===o&&e.cueQueue.splice(c--,1)}const n=this.auxWriter.getSlice(0,this.auxWriter.getPos()),l=this.createSampleForTrack(e,n,a,o-a,"key");await this.registerSample(e,l),e.lastCueEndTimestamp=o}}createSampleForTrack(e,i,r,s,a){return{timestamp:r,decodeTimestamp:r,duration:s,data:i,size:i.byteLength,type:a,timescaleUnitsToNextSample:Z(s,e.timescale)}}processTimestamps(e,i){if(e.timestampProcessingQueue.length===0)return;if(e.type==="audio"&&e.info.requiresPcmTransformation){let s=0;for(let a=0;a<e.timestampProcessingQueue.length;a++){const o=e.timestampProcessingQueue[a],n=Z(o.duration,e.timescale);s+=n}if(e.timeToSampleTable.length===0)e.timeToSampleTable.push({sampleCount:s,sampleDelta:1});else{const a=Me(e.timeToSampleTable);a.sampleCount+=s}e.timestampProcessingQueue.length=0;return}const r=e.timestampProcessingQueue.map(s=>s.timestamp).sort((s,a)=>s-a);for(let s=0;s<e.timestampProcessingQueue.length;s++){const a=e.timestampProcessingQueue[s];a.decodeTimestamp=r[s],!this.isFragmented&&e.lastTimescaleUnits===null&&(a.decodeTimestamp=0);const o=Z(a.timestamp-a.decodeTimestamp,e.timescale),n=Z(a.duration,e.timescale);if(e.lastTimescaleUnits!==null){M(e.lastSample);const l=Z(a.decodeTimestamp,e.timescale,!1),c=Math.round(l-e.lastTimescaleUnits);if(M(c>=0),e.lastTimescaleUnits+=c,e.lastSample.timescaleUnitsToNextSample=c,!this.isFragmented){let u=Me(e.timeToSampleTable);if(M(u),u.sampleCount===1){u.sampleDelta=c;const p=e.timeToSampleTable[e.timeToSampleTable.length-2];p&&p.sampleDelta===c&&(p.sampleCount++,e.timeToSampleTable.pop(),u=p)}else u.sampleDelta!==c&&(u.sampleCount--,e.timeToSampleTable.push(u={sampleCount:1,sampleDelta:c}));u.sampleDelta===n?u.sampleCount++:e.timeToSampleTable.push({sampleCount:1,sampleDelta:n});const h=Me(e.compositionTimeOffsetTable);M(h),h.sampleCompositionTimeOffset===o?h.sampleCount++:e.compositionTimeOffsetTable.push({sampleCount:1,sampleCompositionTimeOffset:o})}}else e.lastTimescaleUnits=Z(a.decodeTimestamp,e.timescale,!1),this.isFragmented||(e.timeToSampleTable.push({sampleCount:1,sampleDelta:n}),e.compositionTimeOffsetTable.push({sampleCount:1,sampleCompositionTimeOffset:o}));e.lastSample=a}if(e.timestampProcessingQueue.length=0,M(e.lastSample),M(e.lastTimescaleUnits!==null),i!==void 0&&e.lastSample.timescaleUnitsToNextSample===0){M(i.type==="key");const s=Z(i.timestamp,e.timescale,!1),a=Math.round(s-e.lastTimescaleUnits);e.lastSample.timescaleUnitsToNextSample=a}}async registerSample(e,i){i.type==="key"&&this.processTimestamps(e,i),e.timestampProcessingQueue.push(i),this.isFragmented?(e.sampleQueue.push(i),await this.interleaveSamples()):this.fastStart==="reserve"?await this.registerSampleFastStartReserve(e,i):await this.addSampleToTrack(e,i)}async addSampleToTrack(e,i){if(!this.isFragmented&&(e.samples.push(i),this.fastStart==="reserve")){const s=e.track.metadata.maximumPacketCount;if(M(s!==void 0),e.samples.length>s)throw new Error(`Track #${e.track.id} has already reached the maximum packet count (${s}). Either add less packets or increase the maximum packet count.`)}let r=!1;if(!e.currentChunk)r=!0;else{e.currentChunk.startTimestamp=Math.min(e.currentChunk.startTimestamp,i.timestamp);const s=i.timestamp-e.currentChunk.startTimestamp;if(this.isFragmented){const a=this.trackDatas.every(o=>{if(e===o)return i.type==="key";const n=o.sampleQueue[0];return n?n.type==="key":o.track.source._closed});s>=this.minimumFragmentDuration&&a&&i.timestamp>this.maxWrittenTimestamp&&(r=!0,await this.finalizeFragment())}else r=s>=.5}r&&(e.currentChunk&&await this.finalizeCurrentChunk(e),e.currentChunk={startTimestamp:i.timestamp,samples:[],offset:null,moofOffset:null}),M(e.currentChunk),e.currentChunk.samples.push(i),this.isFragmented&&(this.maxWrittenTimestamp=Math.max(this.maxWrittenTimestamp,i.timestamp))}async finalizeCurrentChunk(e){if(M(!this.isFragmented),!e.currentChunk)return;e.finalizedChunks.push(e.currentChunk),this.finalizedChunks.push(e.currentChunk);let i=e.currentChunk.samples.length;if(e.type==="audio"&&e.info.requiresPcmTransformation&&(i=e.currentChunk.samples.reduce((r,s)=>r+Z(s.duration,e.timescale),0)),(e.compactlyCodedChunkTable.length===0||Me(e.compactlyCodedChunkTable).samplesPerChunk!==i)&&e.compactlyCodedChunkTable.push({firstChunk:e.finalizedChunks.length,samplesPerChunk:i}),this.fastStart==="in-memory"){e.currentChunk.offset=0;return}e.currentChunk.offset=this.writer.getPos();for(const r of e.currentChunk.samples)M(r.data),this.writer.write(r.data),r.data=null;await this.writer.flush()}async interleaveSamples(e=!1){if(M(this.isFragmented),!(!e&&!this.allTracksAreKnown()))e:for(;;){let i=null,r=1/0;for(const a of this.trackDatas){if(!e&&a.sampleQueue.length===0&&!a.track.source._closed)break e;a.sampleQueue.length>0&&a.sampleQueue[0].timestamp<r&&(i=a,r=a.sampleQueue[0].timestamp)}if(!i)break;const s=i.sampleQueue.shift();await this.addSampleToTrack(i,s)}}async finalizeFragment(e=!0){M(this.isFragmented);const i=this.nextFragmentNumber++;if(i===1){this.format._options.onMoov&&this.writer.startTrackingWrites();const m=He(this);if(this.boxWriter.writeBox(m),this.format._options.onMoov){const{data:b,start:f}=this.writer.stopTrackingWrites();this.format._options.onMoov(b,f)}}const r=this.trackDatas.filter(m=>m.currentChunk),s=_i(i,r),a=this.writer.getPos(),o=a+this.boxWriter.measureBox(s);let n=o+xt,l=1/0;for(const m of r){m.currentChunk.offset=n,m.currentChunk.moofOffset=a;for(const b of m.currentChunk.samples)n+=b.size;l=Math.min(l,m.currentChunk.startTimestamp)}const c=n-o,u=c>=2**32;if(u)for(const m of r)m.currentChunk.offset+=Ai-xt;this.format._options.onMoof&&this.writer.startTrackingWrites();const h=_i(i,r);if(this.boxWriter.writeBox(h),this.format._options.onMoof){const{data:m,start:b}=this.writer.stopTrackingWrites();this.format._options.onMoof(m,b,l)}M(this.writer.getPos()===o),this.format._options.onMdat&&this.writer.startTrackingWrites();const p=it(u);p.size=c,this.boxWriter.writeBox(p),this.writer.seek(o+(u?Ai:xt));for(const m of r)for(const b of m.currentChunk.samples)this.writer.write(b.data),b.data=null;if(this.format._options.onMdat){const{data:m,start:b}=this.writer.stopTrackingWrites();this.format._options.onMdat(m,b)}for(const m of r)m.finalizedChunks.push(m.currentChunk),this.finalizedChunks.push(m.currentChunk),m.currentChunk=null;e&&await this.writer.flush()}async registerSampleFastStartReserve(e,i){if(this.allTracksAreKnown()){if(!this.mdat){const r=He(this),a=this.boxWriter.measureBox(r)+this.computeSampleTableSizeUpperBound()+4096;M(this.ftypSize!==null),this.writer.seek(this.ftypSize+a),this.format._options.onMdat&&this.writer.startTrackingWrites(),this.mdat=it(!0),this.boxWriter.writeBox(this.mdat);for(const o of this.trackDatas){for(const n of o.sampleQueue)await this.addSampleToTrack(o,n);o.sampleQueue.length=0}}await this.addSampleToTrack(e,i)}else e.sampleQueue.push(i)}computeSampleTableSizeUpperBound(){M(this.fastStart==="reserve");let e=0;for(const i of this.trackDatas){const r=i.track.metadata.maximumPacketCount;M(r!==void 0),e+=8*Math.ceil(2/3*r),e+=4*r,e+=8*Math.ceil(2/3*r),e+=12*Math.ceil(2/3*r),e+=4*r,e+=8*r}return e}async onTrackClose(e){const i=await this.mutex.acquire(),r=this.trackDatas.find(s=>s.track===e);r&&(r.type==="subtitle"&&e.source._codec==="webvtt"&&await this.processWebVTTCues(r,1/0),this.processTimestamps(r)),this.allTracksAreKnown()&&this.allTracksKnown.resolve(),this.isFragmented&&await this.interleaveSamples(),i()}async finalize(){const e=await this.mutex.acquire();this.allTracksKnown.resolve();for(const i of this.trackDatas)i.type==="subtitle"&&i.track.source._codec==="webvtt"&&await this.processWebVTTCues(i,1/0),this.processTimestamps(i);if(this.isFragmented)await this.interleaveSamples(!0),await this.finalizeFragment(!1);else for(const i of this.trackDatas)await this.finalizeCurrentChunk(i);if(this.fastStart==="in-memory"){this.mdat=it(!1);let i;for(let s=0;s<2;s++){const a=He(this),o=this.boxWriter.measureBox(a);i=this.boxWriter.measureBox(this.mdat);let n=this.writer.getPos()+o+i;for(const l of this.finalizedChunks){l.offset=n;for(const{data:c}of l.samples)M(c),n+=c.byteLength,i+=c.byteLength}if(n<2**32)break;i>=2**32&&(this.mdat.largeSize=!0)}this.format._options.onMoov&&this.writer.startTrackingWrites();const r=He(this);if(this.boxWriter.writeBox(r),this.format._options.onMoov){const{data:s,start:a}=this.writer.stopTrackingWrites();this.format._options.onMoov(s,a)}this.format._options.onMdat&&this.writer.startTrackingWrites(),this.mdat.size=i,this.boxWriter.writeBox(this.mdat);for(const s of this.finalizedChunks)for(const a of s.samples)M(a.data),this.writer.write(a.data),a.data=null;if(this.format._options.onMdat){const{data:s,start:a}=this.writer.stopTrackingWrites();this.format._options.onMdat(s,a)}}else if(this.isFragmented){const i=this.writer.getPos(),r=Gc(this.trackDatas);this.boxWriter.writeBox(r);const s=this.writer.getPos()-i;this.writer.seek(this.writer.getPos()-4),this.boxWriter.writeU32(s)}else{M(this.mdat);const i=this.boxWriter.offsets.get(this.mdat);M(i!==void 0);const r=this.writer.getPos()-i;if(this.mdat.size=r,this.mdat.largeSize=r>=2**32,this.boxWriter.patchBox(this.mdat),this.format._options.onMdat){const{data:a,start:o}=this.writer.stopTrackingWrites();this.format._options.onMdat(a,o)}const s=He(this);if(this.fastStart==="reserve"){M(this.ftypSize!==null),this.writer.seek(this.ftypSize),this.format._options.onMoov&&this.writer.startTrackingWrites(),this.boxWriter.writeBox(s);const a=this.boxWriter.offsets.get(this.mdat)-this.writer.getPos();this.boxWriter.writeBox(Ql(a))}else this.format._options.onMoov&&this.writer.startTrackingWrites(),this.boxWriter.writeBox(s);if(this.format._options.onMoov){const{data:a,start:o}=this.writer.stopTrackingWrites();this.format._options.onMoov(a,o)}}e()}}/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */const hu=-32768,fu=2**15-1,Ii="Mediabunny",Bi=6,ji=5,mu={video:1,audio:2,subtitle:17};class gu extends wr{constructor(e,i){super(e),this.trackDatas=[],this.allTracksKnown=Zi(),this.segment=null,this.segmentInfo=null,this.seekHead=null,this.tracksElement=null,this.tagsElement=null,this.attachmentsElement=null,this.segmentDuration=null,this.cues=null,this.currentCluster=null,this.currentClusterStartMsTimestamp=null,this.currentClusterMaxMsTimestamp=null,this.trackDatasInCurrentCluster=new Map,this.duration=0,this.writer=e._writer,this.format=i,this.ebmlWriter=new Hl(this.writer),this.format._options.appendOnly&&(this.writer.ensureMonotonicity=!0)}async start(){const e=await this.mutex.acquire();this.writeEBMLHeader(),this.createSegmentInfo(),this.createCues(),await this.writer.flush(),e()}writeEBMLHeader(){this.format._options.onEbmlHeader&&this.writer.startTrackingWrites();const e={id:g.EBML,data:[{id:g.EBMLVersion,data:1},{id:g.EBMLReadVersion,data:1},{id:g.EBMLMaxIDLength,data:4},{id:g.EBMLMaxSizeLength,data:8},{id:g.DocType,data:this.format instanceof _t?"webm":"matroska"},{id:g.DocTypeVersion,data:2},{id:g.DocTypeReadVersion,data:2}]};if(this.ebmlWriter.writeEBML(e),this.format._options.onEbmlHeader){const{data:i,start:r}=this.writer.stopTrackingWrites();this.format._options.onEbmlHeader(i,r)}}maybeCreateSeekHead(e){if(this.format._options.appendOnly)return;const i=new Uint8Array([28,83,187,107]),r=new Uint8Array([21,73,169,102]),s=new Uint8Array([22,84,174,107]),a=new Uint8Array([25,65,164,105]),o=new Uint8Array([18,84,195,103]),n={id:g.SeekHead,data:[{id:g.Seek,data:[{id:g.SeekID,data:i},{id:g.SeekPosition,size:5,data:e?this.ebmlWriter.offsets.get(this.cues)-this.segmentDataOffset:0}]},{id:g.Seek,data:[{id:g.SeekID,data:r},{id:g.SeekPosition,size:5,data:e?this.ebmlWriter.offsets.get(this.segmentInfo)-this.segmentDataOffset:0}]},{id:g.Seek,data:[{id:g.SeekID,data:s},{id:g.SeekPosition,size:5,data:e?this.ebmlWriter.offsets.get(this.tracksElement)-this.segmentDataOffset:0}]},this.attachmentsElement?{id:g.Seek,data:[{id:g.SeekID,data:a},{id:g.SeekPosition,size:5,data:e?this.ebmlWriter.offsets.get(this.attachmentsElement)-this.segmentDataOffset:0}]}:null,this.tagsElement?{id:g.Seek,data:[{id:g.SeekID,data:o},{id:g.SeekPosition,size:5,data:e?this.ebmlWriter.offsets.get(this.tagsElement)-this.segmentDataOffset:0}]}:null]};this.seekHead=n}createSegmentInfo(){const e={id:g.Duration,data:new Rt(0)};this.segmentDuration=e;const i={id:g.Info,data:[{id:g.TimestampScale,data:1e6},{id:g.MuxingApp,data:Ii},{id:g.WritingApp,data:Ii},this.format._options.appendOnly?null:e]};this.segmentInfo=i}createTracks(){var i,r,s,a,o,n;const e={id:g.Tracks,data:[]};this.tracksElement=e;for(const l of this.trackDatas){const c=Gl[l.track.source._codec];M(c);let u=0;if(l.type==="audio"&&l.track.source._codec==="opus"){u=1e6*80;const h=l.info.decoderConfig.description;if(h){const p=ve(h),m=br(p);u=Math.round(1e9*(m.preSkip/ia))}}e.data.push({id:g.TrackEntry,data:[{id:g.TrackNumber,data:l.track.id},{id:g.TrackUID,data:l.track.id},{id:g.TrackType,data:mu[l.type]},((i=l.track.metadata.disposition)==null?void 0:i.default)===!1?{id:g.FlagDefault,data:0}:null,(r=l.track.metadata.disposition)!=null&&r.forced?{id:g.FlagForced,data:1}:null,(s=l.track.metadata.disposition)!=null&&s.hearingImpaired?{id:g.FlagHearingImpaired,data:1}:null,(a=l.track.metadata.disposition)!=null&&a.visuallyImpaired?{id:g.FlagVisualImpaired,data:1}:null,(o=l.track.metadata.disposition)!=null&&o.original?{id:g.FlagOriginal,data:1}:null,(n=l.track.metadata.disposition)!=null&&n.commentary?{id:g.FlagCommentary,data:1}:null,{id:g.FlagLacing,data:0},{id:g.Language,data:l.track.metadata.languageCode??Xi},{id:g.CodecID,data:c},{id:g.CodecDelay,data:0},{id:g.SeekPreRoll,data:u},l.track.metadata.name!==void 0?{id:g.Name,data:new be(l.track.metadata.name)}:null,l.type==="video"?this.videoSpecificTrackInfo(l):null,l.type==="audio"?this.audioSpecificTrackInfo(l):null,l.type==="subtitle"?this.subtitleSpecificTrackInfo(l):null]})}}videoSpecificTrackInfo(e){const{frameRate:i,rotation:r}=e.track.metadata,s=[e.info.decoderConfig.description?{id:g.CodecPrivate,data:ve(e.info.decoderConfig.description)}:null,i?{id:g.DefaultDuration,data:1e9/i}:null],a=r?Ks(-r):0,o=!!e.info.aspectRatio&&e.info.aspectRatio.num*e.info.height!==e.info.aspectRatio.den*e.info.width,n=e.info.decoderConfig.colorSpace,l={id:g.Video,data:[{id:g.PixelWidth,data:e.info.width},{id:g.PixelHeight,data:e.info.height},o?{id:g.DisplayWidth,data:e.info.aspectRatio.num}:null,o?{id:g.DisplayHeight,data:e.info.aspectRatio.den}:null,o?{id:g.DisplayUnit,data:3}:null,e.info.alphaMode?{id:g.AlphaMode,data:1}:null,$i(n)?{id:g.Colour,data:[{id:g.MatrixCoefficients,data:zt[n.matrix]},{id:g.TransferCharacteristics,data:jt[n.transfer]},{id:g.Primaries,data:Bt[n.primaries]},{id:g.Range,data:n.fullRange?2:1}]}:null,a?{id:g.Projection,data:[{id:g.ProjectionType,data:0},{id:g.ProjectionPoseRoll,data:new Mt((a+180)%360-180)}]}:null]};return s.push(l),s}audioSpecificTrackInfo(e){const i=dt.includes(e.track.source._codec)?Ve(e.track.source._codec):null;return[e.info.decoderConfig.description?{id:g.CodecPrivate,data:ve(e.info.decoderConfig.description)}:null,{id:g.Audio,data:[{id:g.SamplingFrequency,data:new Mt(e.info.sampleRate)},{id:g.Channels,data:e.info.numberOfChannels},i?{id:g.BitDepth,data:8*i.sampleSize}:null]}]}subtitleSpecificTrackInfo(e){return[{id:g.CodecPrivate,data:Y.encode(e.info.config.description)}]}maybeCreateTags(){const e=[],i=(a,o)=>{e.push({id:g.SimpleTag,data:[{id:g.TagName,data:new be(a)},typeof o=="string"?{id:g.TagString,data:new be(o)}:{id:g.TagBinary,data:o}]})},r=this.output._metadataTags,s=new Set;for(const{key:a,value:o}of It(r))switch(a){case"title":i("TITLE",o),s.add("TITLE");break;case"description":i("DESCRIPTION",o),s.add("DESCRIPTION");break;case"artist":i("ARTIST",o),s.add("ARTIST");break;case"album":i("ALBUM",o),s.add("ALBUM");break;case"albumArtist":i("ALBUM_ARTIST",o),s.add("ALBUM_ARTIST");break;case"genre":i("GENRE",o),s.add("GENRE");break;case"comment":i("COMMENT",o),s.add("COMMENT");break;case"lyrics":i("LYRICS",o),s.add("LYRICS");break;case"date":i("DATE",o.toISOString().slice(0,10)),s.add("DATE");break;case"trackNumber":{const n=r.tracksTotal!==void 0?`${o}/${r.tracksTotal}`:o.toString();i("PART_NUMBER",n),s.add("PART_NUMBER")}break;case"discNumber":{const n=r.discsTotal!==void 0?`${o}/${r.discsTotal}`:o.toString();i("DISC",n),s.add("DISC")}break;case"tracksTotal":case"discsTotal":break;case"images":case"raw":break;default:ut(a)}if(r.raw)for(const a in r.raw){const o=r.raw[a];o==null||s.has(a)||(typeof o=="string"||o instanceof Uint8Array)&&i(a,o)}e.length!==0&&(this.tagsElement={id:g.Tags,data:[{id:g.Tag,data:[{id:g.Targets,data:[{id:g.TargetTypeValue,data:50},{id:g.TargetType,data:"MOVIE"}]},...e]}]})}maybeCreateAttachments(){const e=this.output._metadataTags,i=[],r=new Set,s=e.images??[];for(const a of s){let o=a.name;o===void 0&&(o=(a.kind==="coverFront"?"cover":a.kind==="coverBack"?"back":"image")+(Qs(a.mimeType)??""));let n;for(;;){n=0n;for(let l=0;l<8;l++)n<<=8n,n|=BigInt(Math.floor(Math.random()*256));if(n!==0n&&!r.has(n))break}r.add(n),i.push({id:g.AttachedFile,data:[a.description!==void 0?{id:g.FileDescription,data:new be(a.description)}:null,{id:g.FileName,data:new be(o)},{id:g.FileMediaType,data:a.mimeType},{id:g.FileData,data:a.data},{id:g.FileUID,data:n}]})}for(const[a,o]of Object.entries(e.raw??{}))!(o instanceof fr)||!/^\d+$/.test(a)||s.find(l=>l.mimeType===o.mimeType&&Ys(l.data,o.data))||i.push({id:g.AttachedFile,data:[o.description!==void 0?{id:g.FileDescription,data:new be(o.description)}:null,{id:g.FileName,data:new be(o.name??"")},{id:g.FileMediaType,data:o.mimeType??""},{id:g.FileData,data:o.data},{id:g.FileUID,data:BigInt(a)}]});i.length!==0&&(this.attachmentsElement={id:g.Attachments,data:i})}createSegment(){this.createTracks(),this.maybeCreateTags(),this.maybeCreateAttachments(),this.maybeCreateSeekHead(!1);const e={id:g.Segment,size:this.format._options.appendOnly?-1:Bi,data:[this.seekHead,this.segmentInfo,this.tracksElement,this.attachmentsElement,this.tagsElement]};if(this.segment=e,this.format._options.onSegmentHeader&&this.writer.startTrackingWrites(),this.ebmlWriter.writeEBML(e),this.format._options.onSegmentHeader){const{data:i,start:r}=this.writer.stopTrackingWrites();this.format._options.onSegmentHeader(i,r)}}createCues(){this.cues={id:g.Cues,data:[]}}get segmentDataOffset(){return M(this.segment),this.ebmlWriter.dataOffsets.get(this.segment)}allTracksAreKnown(){for(const e of this.output._tracks)if(!e.source._closed&&!this.trackDatas.some(i=>i.track===e))return!1;return!0}async getMimeType(){await this.allTracksKnown.promise;const e=this.trackDatas.map(i=>i.type==="video"||i.type==="audio"?i.info.decoderConfig.codec:{webvtt:"wvtt"}[i.track.source._codec]);return Jl({isWebM:this.format instanceof _t,hasVideo:this.trackDatas.some(i=>i.type==="video"),hasAudio:this.trackDatas.some(i=>i.type==="audio"),codecStrings:e})}getVideoTrackData(e,i,r){const s=this.trackDatas.find(c=>c.track===e);if(s)return s;Ki(r),M(r),M(r.decoderConfig),M(r.decoderConfig.codedWidth!==void 0),M(r.decoderConfig.codedHeight!==void 0);const a=r.decoderConfig.displayAspectWidth,o=r.decoderConfig.displayAspectHeight,n=a===void 0||o===void 0?null:Qi({num:a,den:o}),l={track:e,type:"video",info:{width:r.decoderConfig.codedWidth,height:r.decoderConfig.codedHeight,aspectRatio:n,decoderConfig:r.decoderConfig,alphaMode:!!i.sideData.alpha},chunkQueue:[],lastWrittenMsTimestamp:null};return e.source._codec==="vp9"?l.info.decoderConfig={...l.info.decoderConfig,description:new Uint8Array(ea(l.info.decoderConfig.codec))}:e.source._codec==="av1"&&(l.info.decoderConfig={...l.info.decoderConfig,description:new Uint8Array(qi(l.info.decoderConfig.codec))}),this.trackDatas.push(l),this.trackDatas.sort((c,u)=>c.track.id-u.track.id),this.allTracksAreKnown()&&this.allTracksKnown.resolve(),l}getAudioTrackData(e,i,r){const s=this.trackDatas.find(l=>l.track===e);if(s)return s;Yi(r),M(r),M(r.decoderConfig);const a={...r.decoderConfig};let o=!1;if(e.source._codec==="aac"&&!a.description){const l=nt(_e.tempFromBytes(i.data));if(!l)throw new Error("Couldn't parse ADTS header from the AAC packet. Make sure the packets are in ADTS format (as specified in ISO 13818-7) when not providing a description, or provide a description (must be an AudioSpecificConfig as specified in ISO 14496-3) and ensure the packets are raw AAC data.");const c=qt[l.samplingFrequencyIndex],u=Zt[l.channelConfiguration];if(c===void 0||u===void 0)throw new Error("Invalid ADTS frame header.");a.description=mr({objectType:l.objectType,sampleRate:c,numberOfChannels:u}),o=!0}const n={track:e,type:"audio",info:{numberOfChannels:r.decoderConfig.numberOfChannels,sampleRate:r.decoderConfig.sampleRate,decoderConfig:a,requiresAdtsStripping:o},chunkQueue:[],lastWrittenMsTimestamp:null};return this.trackDatas.push(n),this.trackDatas.sort((l,c)=>l.track.id-c.track.id),this.allTracksAreKnown()&&this.allTracksKnown.resolve(),n}getSubtitleTrackData(e,i){const r=this.trackDatas.find(a=>a.track===e);if(r)return r;er(i),M(i),M(i.config);const s={track:e,type:"subtitle",info:{config:i.config},chunkQueue:[],lastWrittenMsTimestamp:null};return this.trackDatas.push(s),this.trackDatas.sort((a,o)=>a.track.id-o.track.id),this.allTracksAreKnown()&&this.allTracksKnown.resolve(),s}async addEncodedVideoPacket(e,i,r){const s=await this.mutex.acquire();try{const a=this.getVideoTrackData(e,i,r),o=i.type==="key";let n=this.validateAndNormalizeTimestamp(a.track,i.timestamp,o),l=i.duration;e.metadata.frameRate!==void 0&&(n=di(n,1/e.metadata.frameRate),l=di(l,1/e.metadata.frameRate));const c=a.info.alphaMode?i.sideData.alpha??null:null,u=this.createInternalChunk(i.data,n,l,i.type,c);e.source._codec==="vp9"&&this.fixVP9ColorSpace(a,u),a.chunkQueue.push(u),await this.interleaveChunks()}finally{s()}}async addEncodedAudioPacket(e,i,r){const s=await this.mutex.acquire();try{const a=this.getAudioTrackData(e,i,r);let o=i.data;if(a.info.requiresAdtsStripping){const u=nt(_e.tempFromBytes(o));if(!u)throw new Error("Expected ADTS frame, didn't get one.");const h=u.crcCheck===null?yr:vr;o=o.subarray(h)}const n=i.type==="key",l=this.validateAndNormalizeTimestamp(a.track,i.timestamp,n),c=this.createInternalChunk(o,l,i.duration,i.type);a.chunkQueue.push(c),await this.interleaveChunks()}finally{s()}}async addSubtitleCue(e,i,r){const s=await this.mutex.acquire();try{const a=this.getSubtitleTrackData(e,r),o=this.validateAndNormalizeTimestamp(a.track,i.timestamp,!0);let n=i.text;const l=Math.round(o*1e3);lt.lastIndex=0,n=n.replace(lt,p=>{const b=Zl(p.slice(1,-1))-l;return`<${Tr(b)}>`});const c=Y.encode(n),u=`${i.settings??""}
${i.identifier??""}
${i.notes??""}`,h=this.createInternalChunk(c,o,i.duration,"key",u.trim()?Y.encode(u):null);a.chunkQueue.push(h),await this.interleaveChunks()}finally{s()}}async interleaveChunks(e=!1){if(!(!e&&!this.allTracksAreKnown())){e:for(;;){let i=null,r=1/0;for(const a of this.trackDatas){if(!e&&a.chunkQueue.length===0&&!a.track.source._closed)break e;a.chunkQueue.length>0&&a.chunkQueue[0].timestamp<r&&(i=a,r=a.chunkQueue[0].timestamp)}if(!i)break;const s=i.chunkQueue.shift();this.writeBlock(i,s)}e||await this.writer.flush()}}fixVP9ColorSpace(e,i){if(i.type!=="key"||!e.info.decoderConfig.colorSpace||!e.info.decoderConfig.colorSpace.matrix)return;const r=new te(i.data);r.skipBits(2);const s=r.readBits(1),o=(r.readBits(1)<<1)+s;if(o===3&&r.skipBits(1),r.readBits(1)||r.readBits(1)!==0||(r.skipBits(2),r.readBits(24)!==4817730))return;o>=2&&r.skipBits(1);const u={rgb:7,bt709:2,bt470bg:1,smpte170m:3}[e.info.decoderConfig.colorSpace.matrix];ta(i.data,r.pos,r.pos+3,u)}createInternalChunk(e,i,r,s,a=null){return{data:e,type:s,timestamp:i,duration:r,additions:a}}writeBlock(e,i){this.segment||this.createSegment();const r=Math.round(1e3*i.timestamp),s=this.trackDatas.every(u=>{if(e===u)return i.type==="key";const h=u.chunkQueue[0];return h?h.type==="key":u.track.source._closed});let a=!1;if(!this.currentCluster)a=!0;else{M(this.currentClusterStartMsTimestamp!==null),M(this.currentClusterMaxMsTimestamp!==null);const u=r-this.currentClusterStartMsTimestamp;a=s&&r>this.currentClusterMaxMsTimestamp&&u>=1e3*(this.format._options.minimumClusterDuration??1)||u>fu}a&&this.createNewCluster(r);const o=r-this.currentClusterStartMsTimestamp;if(o<hu)return;const n=new Uint8Array(4),l=new DataView(n.buffer);l.setUint8(0,128|e.track.id),l.setInt16(1,o,!1);const c=Math.round(1e3*i.duration);if(i.additions){const u={id:g.BlockGroup,data:[{id:g.Block,data:[n,i.data]},i.type==="delta"?{id:g.ReferenceBlock,data:new xr(e.lastWrittenMsTimestamp-r)}:null,i.additions?{id:g.BlockAdditions,data:[{id:g.BlockMore,data:[{id:g.BlockAddID,data:1},{id:g.BlockAdditional,data:i.additions}]}]}:null,c>0?{id:g.BlockDuration,data:c}:null]};this.ebmlWriter.writeEBML(u)}else{l.setUint8(3,+(i.type==="key")<<7);const u={id:g.SimpleBlock,data:[n,i.data]};this.ebmlWriter.writeEBML(u)}this.duration=Math.max(this.duration,r+c),e.lastWrittenMsTimestamp=r,this.trackDatasInCurrentCluster.has(e)||this.trackDatasInCurrentCluster.set(e,{firstMsTimestamp:r}),this.currentClusterMaxMsTimestamp=Math.max(this.currentClusterMaxMsTimestamp,r)}createNewCluster(e){this.currentCluster&&this.finalizeCurrentCluster(),this.format._options.onCluster&&this.writer.startTrackingWrites(),this.currentCluster={id:g.Cluster,size:this.format._options.appendOnly?-1:ji,data:[{id:g.Timestamp,data:e}]},this.ebmlWriter.writeEBML(this.currentCluster),this.currentClusterStartMsTimestamp=e,this.currentClusterMaxMsTimestamp=e,this.trackDatasInCurrentCluster.clear()}finalizeCurrentCluster(){if(M(this.currentCluster),!this.format._options.appendOnly){const s=this.writer.getPos()-this.ebmlWriter.dataOffsets.get(this.currentCluster),a=this.writer.getPos();this.writer.seek(this.ebmlWriter.offsets.get(this.currentCluster)+4),this.ebmlWriter.writeVarInt(s,ji),this.writer.seek(a)}if(this.format._options.onCluster){M(this.currentClusterStartMsTimestamp!==null);const{data:s,start:a}=this.writer.stopTrackingWrites();this.format._options.onCluster(s,a,this.currentClusterStartMsTimestamp/1e3)}const e=this.ebmlWriter.offsets.get(this.currentCluster)-this.segmentDataOffset,i=new Map;for(const[s,{firstMsTimestamp:a}]of this.trackDatasInCurrentCluster)i.has(a)||i.set(a,[]),i.get(a).push(s);const r=[...i.entries()].sort((s,a)=>s[0]-a[0]);for(const[s,a]of r)M(this.cues),this.cues.data.push({id:g.CuePoint,data:[{id:g.CueTime,data:s},...a.map(o=>({id:g.CueTrackPositions,data:[{id:g.CueTrack,data:o.track.id},{id:g.CueClusterPosition,data:e}]}))]})}async onTrackClose(){const e=await this.mutex.acquire();this.allTracksAreKnown()&&this.allTracksKnown.resolve(),await this.interleaveChunks(),e()}async finalize(){const e=await this.mutex.acquire();if(this.allTracksKnown.resolve(),this.segment||this.createSegment(),await this.interleaveChunks(!0),this.currentCluster&&this.finalizeCurrentCluster(),M(this.cues),this.ebmlWriter.writeEBML(this.cues),!this.format._options.appendOnly){const i=this.writer.getPos(),r=this.writer.getPos()-this.segmentDataOffset;this.writer.seek(this.ebmlWriter.offsets.get(this.segment)+4),this.ebmlWriter.writeVarInt(r,Bi),this.segmentDuration.data=new Rt(this.duration),this.writer.seek(this.ebmlWriter.offsets.get(this.segmentDuration)),this.ebmlWriter.writeEBML(this.segmentDuration),M(this.seekHead),this.writer.seek(this.ebmlWriter.offsets.get(this.seekHead)),this.maybeCreateSeekHead(!0),this.ebmlWriter.writeEBML(this.seekHead),this.writer.seek(i)}e()}}/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */class ri{getSupportedVideoCodecs(){return this.getSupportedCodecs().filter(e=>Ee.includes(e))}getSupportedAudioCodecs(){return this.getSupportedCodecs().filter(e=>Xe.includes(e))}getSupportedSubtitleCodecs(){return this.getSupportedCodecs().filter(e=>Ne.includes(e))}_codecUnsupportedHint(e){return""}}class Ir extends ri{constructor(e={}){if(!e||typeof e!="object")throw new TypeError("options must be an object.");if(e.fastStart!==void 0&&![!1,"in-memory","reserve","fragmented"].includes(e.fastStart))throw new TypeError("options.fastStart, when provided, must be false, 'in-memory', 'reserve', or 'fragmented'.");if(e.minimumFragmentDuration!==void 0&&(!Number.isFinite(e.minimumFragmentDuration)||e.minimumFragmentDuration<0))throw new TypeError("options.minimumFragmentDuration, when provided, must be a non-negative number.");if(e.onFtyp!==void 0&&typeof e.onFtyp!="function")throw new TypeError("options.onFtyp, when provided, must be a function.");if(e.onMoov!==void 0&&typeof e.onMoov!="function")throw new TypeError("options.onMoov, when provided, must be a function.");if(e.onMdat!==void 0&&typeof e.onMdat!="function")throw new TypeError("options.onMdat, when provided, must be a function.");if(e.onMoof!==void 0&&typeof e.onMoof!="function")throw new TypeError("options.onMoof, when provided, must be a function.");if(e.metadataFormat!==void 0&&!["mdir","mdta","udta","auto"].includes(e.metadataFormat))throw new TypeError("options.metadataFormat, when provided, must be either 'auto', 'mdir', 'mdta', or 'udta'.");super(),this._options=e}getSupportedTrackCounts(){return{video:{min:0,max:4294967295},audio:{min:0,max:4294967295},subtitle:{min:0,max:4294967295},total:{min:1,max:4294967295}}}get supportsVideoRotationMetadata(){return!0}get supportsTimestampedMediaData(){return!0}_createMuxer(e){return new pu(e,this)}}class Br extends Ir{constructor(e){super(e)}get _name(){return"MP4"}get fileExtension(){return".mp4"}get mimeType(){return"video/mp4"}getSupportedCodecs(){return[...Ee,...tr,"pcm-s16","pcm-s16be","pcm-s24","pcm-s24be","pcm-s32","pcm-s32be","pcm-f32","pcm-f32be","pcm-f64","pcm-f64be",...Ne]}_codecUnsupportedHint(e){return new jr().getSupportedCodecs().includes(e)?" Switching to MOV will grant support for this codec.":""}}class jr extends Ir{constructor(e){super(e)}get _name(){return"MOV"}get fileExtension(){return".mov"}get mimeType(){return"video/quicktime"}getSupportedCodecs(){return[...Ee,...Xe]}_codecUnsupportedHint(e){return new Br().getSupportedCodecs().includes(e)?" Switching to MP4 will grant support for this codec.":""}}class zi extends ri{constructor(e={}){if(!e||typeof e!="object")throw new TypeError("options must be an object.");if(e.appendOnly!==void 0&&typeof e.appendOnly!="boolean")throw new TypeError("options.appendOnly, when provided, must be a boolean.");if(e.minimumClusterDuration!==void 0&&(!Number.isFinite(e.minimumClusterDuration)||e.minimumClusterDuration<0))throw new TypeError("options.minimumClusterDuration, when provided, must be a non-negative number.");if(e.onEbmlHeader!==void 0&&typeof e.onEbmlHeader!="function")throw new TypeError("options.onEbmlHeader, when provided, must be a function.");if(e.onSegmentHeader!==void 0&&typeof e.onSegmentHeader!="function")throw new TypeError("options.onHeader, when provided, must be a function.");if(e.onCluster!==void 0&&typeof e.onCluster!="function")throw new TypeError("options.onCluster, when provided, must be a function.");super(),this._options=e}_createMuxer(e){return new gu(e,this)}get _name(){return"Matroska"}getSupportedTrackCounts(){return{video:{min:0,max:127},audio:{min:0,max:127},subtitle:{min:0,max:127},total:{min:1,max:127}}}get fileExtension(){return".mkv"}get mimeType(){return"video/x-matroska"}getSupportedCodecs(){return[...Ee,...tr,...dt.filter(e=>!["pcm-s8","pcm-f32be","pcm-f64be","ulaw","alaw"].includes(e)),...Ne]}get supportsVideoRotationMetadata(){return!1}get supportsTimestampedMediaData(){return!0}}class _t extends zi{constructor(e){super(e)}getSupportedCodecs(){return[...Ee.filter(e=>["vp8","vp9","av1"].includes(e)),...Xe.filter(e=>["opus","vorbis"].includes(e)),...Ne]}get _name(){return"WebM"}get fileExtension(){return".webm"}get mimeType(){return"video/webm"}_codecUnsupportedHint(e){return new zi().getSupportedCodecs().includes(e)?" Switching to MKV will grant support for this codec.":""}}/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */class si{constructor(){this._connectedTrack=null,this._closingPromise=null,this._closed=!1,this._timestampOffset=0}_ensureValidAdd(){if(!this._connectedTrack)throw new Error("Source is not connected to an output track.");if(this._connectedTrack.output.state==="canceled")throw new Error("Output has been canceled.");if(this._connectedTrack.output.state==="finalizing"||this._connectedTrack.output.state==="finalized")throw new Error("Output has been finalized.");if(this._connectedTrack.output.state==="pending")throw new Error("Output has not started.");if(this._closed)throw new Error("Source is closed.")}async _start(){}async _flushAndClose(e){}close(){if(this._closingPromise)return;const e=this._connectedTrack;if(!e)throw new Error("Cannot call close without connecting the source to an output track.");if(e.output.state==="pending")throw new Error("Cannot call close before output has been started.");this._closingPromise=(async()=>{await this._flushAndClose(!1),this._closed=!0,!(e.output.state==="finalizing"||e.output.state==="finalized")&&e.output._muxer.onTrackClose(e)})()}async _flushOrWaitForOngoingClose(e){return this._closingPromise??(this._closingPromise=(async()=>{await this._flushAndClose(e),this._closed=!0})())}}class zr extends si{constructor(e){if(super(),this._connectedTrack=null,!Ee.includes(e))throw new TypeError(`Invalid video codec '${e}'. Must be one of: ${Ee.join(", ")}.`);this._codec=e}}class bu extends zr{constructor(e){super(e)}add(e,i){if(!(e instanceof qe))throw new TypeError("packet must be an EncodedPacket.");if(e.isMetadataOnly)throw new TypeError("Metadata-only packets cannot be added.");if(i!==void 0&&(!i||typeof i!="object"))throw new TypeError("meta, when provided, must be an object.");return this._ensureValidAdd(),this._connectedTrack.output._muxer.addEncodedVideoPacket(this._connectedTrack,e,i)}}class xu extends si{constructor(e){if(super(),this._connectedTrack=null,!Xe.includes(e))throw new TypeError(`Invalid audio codec '${e}'. Must be one of: ${Xe.join(", ")}.`);this._codec=e}}class yu extends si{constructor(e){if(super(),this._connectedTrack=null,!Ne.includes(e))throw new TypeError(`Invalid subtitle codec '${e}'. Must be one of: ${Ne.join(", ")}.`);this._codec=e}}/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */const vu=["video","audio","subtitle"],St=t=>{if(!t||typeof t!="object")throw new TypeError("metadata must be an object.");if(t.languageCode!==void 0&&!ra(t.languageCode))throw new TypeError("metadata.languageCode, when provided, must be a three-letter, ISO 639-2/T language code.");if(t.name!==void 0&&typeof t.name!="string")throw new TypeError("metadata.name, when provided, must be a string.");if(t.disposition!==void 0&&Tl(t.disposition),t.maximumPacketCount!==void 0&&(!Number.isInteger(t.maximumPacketCount)||t.maximumPacketCount<0))throw new TypeError("metadata.maximumPacketCount, when provided, must be a non-negative integer.")};class wu{constructor(e){if(this.state="pending",this._tracks=[],this._startPromise=null,this._cancelPromise=null,this._finalizePromise=null,this._mutex=new Ji,this._metadataTags={},!e||typeof e!="object")throw new TypeError("options must be an object.");if(!(e.format instanceof ri))throw new TypeError("options.format must be an OutputFormat.");if(!(e.target instanceof ii))throw new TypeError("options.target must be a Target.");if(e.target._output)throw new Error("Target is already used for another output.");e.target._output=this,this.format=e.format,this.target=e.target,this._writer=e.target._createWriter(),this._muxer=e.format._createMuxer(this)}addVideoTrack(e,i={}){if(!(e instanceof zr))throw new TypeError("source must be a VideoSource.");if(St(i),i.rotation!==void 0&&![0,90,180,270].includes(i.rotation))throw new TypeError(`Invalid video rotation: ${i.rotation}. Has to be 0, 90, 180 or 270.`);if(!this.format.supportsVideoRotationMetadata&&i.rotation)throw new Error(`${this.format._name} does not support video rotation metadata.`);if(i.frameRate!==void 0&&(!Number.isFinite(i.frameRate)||i.frameRate<=0))throw new TypeError(`Invalid video frame rate: ${i.frameRate}. Must be a positive number.`);this._addTrack("video",e,i)}addAudioTrack(e,i={}){if(!(e instanceof xu))throw new TypeError("source must be an AudioSource.");St(i),this._addTrack("audio",e,i)}addSubtitleTrack(e,i={}){if(!(e instanceof yu))throw new TypeError("source must be a SubtitleSource.");St(i),this._addTrack("subtitle",e,i)}setMetadataTags(e){if(wl(e),this.state!=="pending")throw new Error("Cannot set metadata tags after output has been started or canceled.");this._metadataTags=e}_addTrack(e,i,r){if(this.state!=="pending")throw new Error("Cannot add track after output has been started or canceled.");if(i._connectedTrack)throw new Error("Source is already used for a track.");const s=this.format.getSupportedTrackCounts(),a=this._tracks.reduce((c,u)=>c+(u.type===e?1:0),0),o=s[e].max;if(a===o)throw new Error(o===0?`${this.format._name} does not support ${e} tracks.`:`${this.format._name} does not support more than ${o} ${e} track${o===1?"":"s"}.`);const n=s.total.max;if(this._tracks.length===n)throw new Error(`${this.format._name} does not support more than ${n} tracks${n===1?"":"s"} in total.`);const l={id:this._tracks.length+1,output:this,type:e,source:i,metadata:r};if(l.type==="video"){const c=this.format.getSupportedVideoCodecs();if(c.length===0)throw new Error(`${this.format._name} does not support video tracks.`+this.format._codecUnsupportedHint(l.source._codec));if(!c.includes(l.source._codec))throw new Error(`Codec '${l.source._codec}' cannot be contained within ${this.format._name}. Supported video codecs are: ${c.map(u=>`'${u}'`).join(", ")}.`+this.format._codecUnsupportedHint(l.source._codec))}else if(l.type==="audio"){const c=this.format.getSupportedAudioCodecs();if(c.length===0)throw new Error(`${this.format._name} does not support audio tracks.`+this.format._codecUnsupportedHint(l.source._codec));if(!c.includes(l.source._codec))throw new Error(`Codec '${l.source._codec}' cannot be contained within ${this.format._name}. Supported audio codecs are: ${c.map(u=>`'${u}'`).join(", ")}.`+this.format._codecUnsupportedHint(l.source._codec))}else if(l.type==="subtitle"){const c=this.format.getSupportedSubtitleCodecs();if(c.length===0)throw new Error(`${this.format._name} does not support subtitle tracks.`+this.format._codecUnsupportedHint(l.source._codec));if(!c.includes(l.source._codec))throw new Error(`Codec '${l.source._codec}' cannot be contained within ${this.format._name}. Supported subtitle codecs are: ${c.map(u=>`'${u}'`).join(", ")}.`+this.format._codecUnsupportedHint(l.source._codec))}this._tracks.push(l),i._connectedTrack=l}async start(){const e=this.format.getSupportedTrackCounts();for(const r of vu){const s=this._tracks.reduce((o,n)=>o+(n.type===r?1:0),0),a=e[r].min;if(s<a)throw new Error(a===e[r].max?`${this.format._name} requires exactly ${a} ${r} track${a===1?"":"s"}.`:`${this.format._name} requires at least ${a} ${r} track${a===1?"":"s"}.`)}const i=e.total.min;if(this._tracks.length<i)throw new Error(i===e.total.max?`${this.format._name} requires exactly ${i} track${i===1?"":"s"}.`:`${this.format._name} requires at least ${i} track${i===1?"":"s"}.`);if(this.state==="canceled")throw new Error("Output has been canceled.");return this._startPromise?(console.warn("Output has already been started."),this._startPromise):this._startPromise=(async()=>{this.state="started",this._writer.start();const r=await this._mutex.acquire();await this._muxer.start();const s=this._tracks.map(a=>a.source._start());await Promise.all(s),r()})()}getMimeType(){return this._muxer.getMimeType()}async cancel(){if(this._cancelPromise)return console.warn("Output has already been canceled."),this._cancelPromise;if(this.state==="finalizing"||this.state==="finalized"){console.warn("Output has already been finalized.");return}return this._cancelPromise=(async()=>{this.state="canceled";const e=await this._mutex.acquire(),i=this._tracks.map(r=>r.source._flushOrWaitForOngoingClose(!0));await Promise.all(i),await this._writer.close(),e()})()}async finalize(){if(this.state==="pending")throw new Error("Cannot finalize before starting.");if(this.state==="canceled")throw new Error("Cannot finalize after canceling.");return this._finalizePromise?(console.warn("Output has already been finalized."),this._finalizePromise):this._finalizePromise=(async()=>{this.state="finalizing";const e=await this._mutex.acquire(),i=this._tracks.map(r=>r.source._flushOrWaitForOngoingClose(!1));await Promise.all(i),await this._muxer.finalize(),await this._writer.flush(),await this._writer.finalize(),this.state="finalized",e()})()}}const Tu=async(t,e,i,r)=>{if(typeof VideoEncoder>"u")return{ok:!1,reason:"WebCodecs (VideoEncoder) is not available in this browser."};const s=pe[t]??pe[0];if(s.imageSequence)return{ok:!1,reason:"Image-sequence formats are not supported on the main-thread encoder."};try{const a=e%2===0?e:e-1,o=i%2===0?i:i-1;return await sa(s.codec,{width:a,height:o,bitrate:r*Dt.BITRATE_MULTIPLIER})?{ok:!0}:{ok:!1,reason:"Browser/GPU rejected this codec at the requested resolution."}}catch(a){return{ok:!1,reason:a instanceof Error?a.message:String(a)}}};class Cu{constructor(){x(this,"output",null);x(this,"packetSource",null);x(this,"encoder",null);x(this,"muxerChain",Promise.resolve());x(this,"firstChunkOffsetMicros",null);x(this,"fps",30);x(this,"formatDef",null);x(this,"encoderError",null)}get active(){return this.encoder!==null}async start(e,i){const r=pe[e.formatIndex]??pe[0];if(r.imageSequence)throw new Error("MainThreadEncoder: image-sequence formats are not supported");this.formatDef=r,this.fps=e.fps,this.firstChunkOffsetMicros=null,this.muxerChain=Promise.resolve(),this.encoderError=null;const s=i?new cu(i,{chunked:!0}):new Et,a=r.container==="webm"?new _t:new Br({fastStart:"in-memory"});this.output=new wu({format:a,target:s}),this.packetSource=new bu(r.codec),this.encoder=new VideoEncoder({output:(o,n)=>this.handleEncodedChunk(o,n),error:o=>{console.error("[MainThreadEncoder] Encoder error:",o),this.encoderError=o instanceof Error?o:new Error(String(o))}}),this.encoder.configure({codec:r.codec==="avc"?"avc1.640034":r.codec,width:e.width,height:e.height,bitrate:e.bitrate*Dt.BITRATE_MULTIPLIER*2.5,framerate:e.fps,latencyMode:"quality",bitrateMode:"constant",avc:{format:r.container==="mp4"?"annexb":"avc"}})}encodeCanvas(e,i){if(!this.encoder)throw new Error("MainThreadEncoder: not started");if(this.encoderError)throw this.encoderError;const r=new VideoFrame(e,{timestamp:i*(1e6/this.fps),duration:1e6/this.fps});this.encoder.encode(r,{keyFrame:i===0}),r.close()}handleEncodedChunk(e,i){var h;if(!this.output||!this.packetSource)return;const r=new Uint8Array(e.byteLength);e.copyTo(r);const s=i?{decoderConfig:{...i.decoderConfig,description:(h=i.decoderConfig)!=null&&h.description?new Uint8Array(i.decoderConfig.description).slice():void 0}}:void 0;this.firstChunkOffsetMicros===null&&(this.firstChunkOffsetMicros=e.timestamp);const a=(e.timestamp-this.firstChunkOffsetMicros)/1e6,o=1/this.fps,n=new qe(r,e.type,a,o),l=this.output,c=this.packetSource,u=this.fps;this.muxerChain=this.muxerChain.then(async()=>{try{l.state==="pending"&&(l.addVideoTrack(c,{frameRate:u}),await l.start()),await c.add(n,s)}catch(p){console.error("[MainThreadEncoder] Muxing error:",p),this.encoderError=p instanceof Error?p:new Error(String(p))}})}async finish(){if(!this.encoder||!this.output)return null;try{if(await this.encoder.flush(),this.encoder.close(),await this.muxerChain,this.encoderError)throw this.encoderError;await this.output.finalize();let e=null;return this.output.target instanceof Et&&(e=this.output.target.buffer??null),e}finally{this.encoder=null,this.output=null,this.packetSource=null}}cancel(){var e;try{(e=this.encoder)==null||e.close()}catch{}this.encoder=null,this.output=null,this.packetSource=null}}const Su=(t,e)=>{const i=F.getState();Ye.resetOffsets(),Ye.updateOscillators(i.animations,t,e);const r=i.modulation;r&&Array.isArray(r.rules)&&r.rules.length>0&&Ye.update(r.rules,e),i.setLiveModulations({...Ye.offsets})},Or=t=>new Promise(e=>setTimeout(e,t)),ku=()=>Or(0),Au=t=>Math.floor((t.endFrame-t.startFrame)/Math.max(1,t.frameStep))+1,Fu=async t=>{var z;const{cfg:e,flags:i,status:r,isDiskMode:s,getEngine:a,getCanvas:o}=t,n=a(),l=o();if(!n||!l){alert("Renderer is not booted yet — try again in a moment.");return}const c=pe[e.formatIndex];if(!c||c.imageSequence){alert("Image-sequence formats are not supported in fluid-toy v1. Pick MP4 or WebM.");return}const u=Math.max(2,Math.floor(e.width/2)*2),h=Math.max(2,Math.floor(e.height/2)*2),p=l.width,m=l.height,b=n.params.paused,f=Ue.getState(),y=f.currentFrame,C=f.isPlaying,A=((z=F.getState().projectSettings)==null?void 0:z.name)??"fluid-toy",O=kt(A,1,c.ext,`${u}x${h}`);let E=null;if(s)try{E=await(await window.showSaveFilePicker({suggestedName:O,types:[{description:c.label,accept:{[c.mime]:[`.${c.ext}`]}}]})).createWritable()}catch(D){if(D instanceof DOMException&&D.name==="AbortError")return;if(!(D instanceof DOMException&&D.name==="SecurityError")){alert("Could not start export. Error: "+(D instanceof Error?D.message:String(D)));return}E=null}C&&f.pause(),i.cancelledRef.current=!1,i.finishEarlyRef.current=!1,i.stoppingRef.current=!1,i.startTimeRef.current=Date.now(),r.setIsRendering(!0),r.setIsStopping(!1),r.setProgress(0),r.setElapsedTime(0),r.setEtaRange({min:0,max:0}),r.setLastFrameTime(0),r.setStatusText("Initializing encoder…");const v=Au(e),T=Math.max(1,Math.floor(e.samplesPerFrame));n.setRenderSize(u,h),n.setForceFluidPaused(!0),n.params.paused=!1;let B=0;n.frame(B);const j=new Cu;try{await j.start({width:u,height:h,fps:e.fps,bitrate:e.bitrate,formatIndex:e.formatIndex},E),r.setStatusText(E?"Rendering to disk…":"Rendering to RAM…");for(let D=0;D<v&&!(i.cancelledRef.current||i.finishEarlyRef.current);D++){for(;i.stoppingRef.current&&!i.cancelledRef.current&&!i.finishEarlyRef.current;)await Or(100);if(i.cancelledRef.current||i.finishEarlyRef.current)break;const N=e.startFrame+D*e.frameStep,I=N/e.fps,R=1/e.fps;ai.scrub(N),Su(I,R),await ku(),n.setForceFluidPaused(!0),n.resetAccumulation();const H=T*4+8;for(let G=0;G<H&&(n.frame(B),!(n.getAccumulationCount()>=T));G++);n.setForceFluidPaused(!1),B+=1e3/e.fps,n.frame(B),n.setForceFluidPaused(!0),j.encodeCanvas(l,D);const U=(D+1)/v*100;r.setProgress(U);const V=(Date.now()-i.startTimeRef.current)/1e3;r.setElapsedTime(V),r.setEtaRange(aa(V,D+1,v)),r.setLastFrameTime(V/(D+1))}if(i.cancelledRef.current){j.cancel(),r.setStatusText("Cancelled.");try{await(E==null?void 0:E.close())}catch{}}else{r.setStatusText("Finalizing video…");const D=await j.finish();if(D&&!E){const N=new Blob([D],{type:c.mime}),I=URL.createObjectURL(N),R=document.createElement("a");R.href=I,R.download=O,R.click(),URL.revokeObjectURL(I)}r.setStatusText(i.finishEarlyRef.current?"Finished early.":"Complete!")}}catch(D){console.error("[fluid-toy/RenderDialog] Export failed",D),alert(`Export failed.

Error: ${D instanceof Error?D.message:String(D)}`),j.cancel();try{await(E==null?void 0:E.close())}catch{}}finally{n.setForceFluidPaused(!1),n.params.paused=b,n.setRenderSize(p,m),n.resetAccumulation(),ai.scrub(y),C&&Ue.getState().play(),r.setIsRendering(!1),r.setIsStopping(!1)}},Oi=[{label:"720p HD (16:9)",w:1280,h:720},{label:"1080p FHD (16:9)",w:1920,h:1080},{label:"1440p QHD (16:9)",w:2560,h:1440},{label:"4K UHD (16:9)",w:3840,h:2160},{label:"Square 1:1",w:1080,h:1080},{label:"Vertical 9:16",w:1080,h:1920}],Mu=t=>{const{onStart:e,width:i,setWidth:r,height:s,setHeight:a,formatIndex:o,setFormatIndex:n,samplesPerFrame:l,setSamplesPerFrame:c,bitrate:u,setBitrate:h,startFrame:p,setStartFrame:m,endFrame:b,setEndFrame:f,frameStep:y,setFrameStep:C,fps:A,durationFrames:O,isFormatSupported:E,formatSupportError:v,isDiskMode:T}=t,B=pe[o],j=pe.map((R,H)=>({label:R.label,value:H})).filter((R,H)=>!pe[H].imageSequence),z=`${i}x${s}`,D=[...Oi.map(R=>({label:`${R.label} (${R.w}x${R.h})`,value:`${R.w}x${R.h}`})),...Oi.some(R=>R.w===i&&R.h===s)?[]:[{label:`Custom (${i}x${s})`,value:z}]],N=Math.floor((b-p)/Math.max(1,y))+1,I=N/A;return d.jsxs("div",{className:"flex flex-col -m-3 h-[calc(100%+20px)]",children:[d.jsxs("div",{className:"px-3 py-1 bg-black/20 border-b border-white/5 flex justify-between items-center shrink-0",children:[d.jsxs("span",{className:"t-label",children:[B.container.toUpperCase()," • ",B.codec.toUpperCase()," • ",A," FPS"]}),d.jsx("span",{className:`text-[8px] font-bold px-1.5 py-0.5 rounded border ${T?"bg-green-900/30 text-green-400 border-green-500/30":"bg-amber-900/30 text-amber-400 border-amber-500/30"}`,title:T?"Direct disk write":"In-memory buffer (large videos may exceed RAM)",children:T?"DISK":"RAM"})]}),d.jsxs("div",{className:"flex-1 overflow-y-auto custom-scroll p-1.5 space-y-1",children:[d.jsx(ni,{label:"Resolution",value:z,onChange:R=>{const[H,U]=R.split("x").map(Number);r(H),a(U)},options:D,className:"mb-1.5"}),d.jsxs("div",{className:"flex gap-1 mb-1.5",children:[d.jsxs("div",{className:"flex-1",children:[d.jsx("label",{className:"t-label mb-0.5 block",children:"Width"}),d.jsx("div",{className:"h-5 bg-black/40 rounded border border-white/10 relative",children:d.jsx(We,{value:i,onChange:R=>r(Math.max(32,Math.round(R))),step:2,overrideText:i.toFixed(0)})})]}),d.jsxs("div",{className:"flex-1",children:[d.jsx("label",{className:"t-label mb-0.5 block",children:"Height"}),d.jsx("div",{className:"h-5 bg-black/40 rounded border border-white/10 relative",children:d.jsx(We,{value:s,onChange:R=>a(Math.max(32,Math.round(R))),step:2,overrideText:s.toFixed(0)})})]})]}),d.jsx(ni,{label:"Format",value:o,onChange:R=>n(Number(R)),options:j,className:"mb-1.5"}),!E&&d.jsxs("div",{className:"mx-1 mb-2 p-1.5 bg-red-900/20 border border-red-500/30 rounded flex items-center gap-2 text-[9px] text-red-300",children:[d.jsx(us,{}),d.jsx("span",{children:v??"Format incompatible with browser/GPU."})]}),d.jsxs("div",{className:"flex gap-1",children:[d.jsxs("div",{className:"flex-1",children:[d.jsx("label",{className:"t-label mb-0.5 block",children:"Start"}),d.jsx("div",{className:"h-5 bg-black/40 rounded border border-white/10 relative",children:d.jsx(We,{value:p,onChange:R=>m(Math.max(0,Math.min(Math.round(R),b))),step:1,highlight:!0,overrideText:p.toFixed(0)})})]}),d.jsxs("div",{className:"flex-1",children:[d.jsx("label",{className:"t-label mb-0.5 block",children:"End"}),d.jsx("div",{className:"h-5 bg-black/40 rounded border border-white/10 relative",children:d.jsx(We,{value:b,onChange:R=>f(Math.max(p,Math.min(Math.round(R),O))),step:1,highlight:!0,overrideText:b.toFixed(0)})})]}),d.jsxs("div",{className:"flex-[0.7]",children:[d.jsx("label",{className:"t-label mb-0.5 block",children:"Step"}),d.jsx("div",{className:"h-5 bg-black/40 rounded border border-white/10 relative",children:d.jsx(We,{value:y,onChange:R=>C(Math.max(1,Math.round(R))),step:1,min:1,overrideText:y.toFixed(0)})})]})]}),d.jsx(li,{label:"Bitrate (Mbps)",value:u,min:1,max:100,step:1,onChange:h,overrideInputText:`${u}`}),d.jsx(li,{label:"Samples / Frame",value:l,min:1,max:256,step:1,onChange:c,overrideInputText:l.toFixed(0)}),d.jsx("div",{className:"px-2 -mt-1 mb-1 text-[8px] text-gray-500 leading-tight",children:"TSAA samples per output frame. Higher = cleaner fractal but slower export."}),d.jsxs("div",{className:"flex flex-col gap-1 px-2 py-1.5 mt-2 bg-white/5 rounded border border-white/5 text-[10px]",children:[d.jsxs("div",{className:"flex justify-between",children:[d.jsx("span",{className:"text-gray-400",children:"Frames"}),d.jsx("span",{className:"font-mono text-gray-200",children:N})]}),d.jsxs("div",{className:"flex justify-between",children:[d.jsx("span",{className:"text-gray-400",children:"Duration"}),d.jsxs("span",{className:"font-mono text-cyan-300",children:[I.toFixed(2),"s"]})]})]})]}),d.jsx("div",{className:"p-1.5 bg-gray-900/50 border-t border-white/10 shrink-0",children:d.jsx(Ge,{onClick:e,label:T?"Select Output File…":"Start RAM Render",variant:"primary",fullWidth:!0,disabled:!E,icon:T?d.jsx(ds,{}):d.jsx(Ni,{})})})]})},rt=t=>{if(!isFinite(t)||t<0)return"--";if(t<60)return`${t.toFixed(0)}s`;const e=Math.floor(t/60),i=Math.floor(t%60);if(e<60)return`${e}m ${i}s`;const r=Math.floor(e/60),s=e%60;return`${r}h ${s}m`},Ru=({onStop:t,onResume:e,onConfirmStitch:i,onDiscard:r,progress:s,statusText:a,elapsedTime:o,etaRange:n,lastFrameTime:l,isStopping:c,width:u,height:h,formatIndex:p,samplesPerFrame:m})=>{const b=pe[p];return d.jsxs("div",{className:"flex flex-col h-full space-y-4 p-2",children:[d.jsxs("div",{className:"space-y-1",children:[d.jsxs("div",{className:"flex justify-between items-baseline t-label-sm",children:[d.jsxs("span",{className:"text-cyan-300 font-bold",children:[s.toFixed(1),"%"]}),d.jsx("span",{className:"text-[9px] text-gray-400 font-normal truncate max-w-[200px]",children:a})]}),d.jsx("div",{className:"h-3 w-full bg-gray-900 rounded-full overflow-hidden border border-white/10",children:d.jsx("div",{className:"h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-300 ease-out relative",style:{width:`${s}%`},children:d.jsx("div",{className:"absolute inset-0 bg-white/20 animate-pulse"})})})]}),d.jsxs("div",{className:"grid grid-cols-2 gap-3 bg-white/5 p-3 rounded border border-white/5",children:[d.jsxs("div",{className:"flex flex-col",children:[d.jsx("span",{className:"t-label-sm text-gray-500 mb-0.5",children:"Elapsed"}),d.jsx("span",{className:"font-mono text-sm font-bold text-white",children:rt(o)})]}),d.jsxs("div",{className:"flex flex-col text-right",children:[d.jsx("span",{className:"t-label-sm text-gray-500 mb-0.5",children:"Remaining"}),d.jsxs("span",{className:"font-mono text-sm font-bold text-cyan-300",children:[rt(n.min)," – ",rt(n.max)]})]}),d.jsxs("div",{className:"flex flex-col pt-2 border-t border-white/5",children:[d.jsx("span",{className:"t-label-sm text-gray-500 mb-0.5",children:"Last Frame"}),d.jsxs("span",{className:`font-mono text-xs ${l>2?"text-amber-400":"text-gray-300"}`,children:[l.toFixed(2),"s"]})]}),d.jsxs("div",{className:"flex flex-col text-right pt-2 border-t border-white/5",children:[d.jsx("span",{className:"t-label-sm text-gray-500 mb-0.5",children:"Est. Total"}),d.jsx("span",{className:"font-mono text-xs text-gray-300",children:o>0&&s>0?rt(o/(s/100)):"--"})]})]}),d.jsxs("div",{className:"text-[9px] text-gray-500 grid grid-cols-2 gap-y-1 border-t border-white/5 pt-3",children:[d.jsxs("span",{children:["Resolution: ",d.jsxs("span",{className:"text-gray-300",children:[u,"x",h]})]}),d.jsxs("span",{children:["Format: ",d.jsx("span",{className:"text-gray-300",children:(b==null?void 0:b.label.split(" ")[0])??"?"})]}),d.jsxs("span",{children:["Samples: ",d.jsx("span",{className:"text-gray-300",children:m})]})]}),d.jsx("div",{className:"mt-auto pt-2",children:c?d.jsxs("div",{className:"grid grid-cols-3 gap-2 animate-fade-in",children:[d.jsx(Ge,{onClick:e,label:"Resume",variant:"primary",icon:d.jsx(Ni,{})}),d.jsx(Ge,{onClick:i,label:"Finish",variant:"success",icon:d.jsx(hs,{})}),d.jsx(Ge,{onClick:r,label:"Discard",variant:"danger",icon:d.jsx(fs,{})})]}):d.jsx(Ge,{onClick:t,label:"Interrupt Render",variant:"danger",icon:d.jsx(ps,{}),fullWidth:!0})})]})},Ui=320,Eu=460,Pu=({onClose:t})=>{const e=Ue(),[i,r]=k.useState(1280),[s,a]=k.useState(720),[o,n]=k.useState(0),[l,c]=k.useState(32),[u,h]=k.useState(Dt.DEFAULT_BITRATE),[p,m]=k.useState(0),[b,f]=k.useState(e.durationFrames),[y,C]=k.useState(1);k.useEffect(()=>{const Ie=i*s,Ce=1920*1080;h(Math.max(1,Math.round(40*(Ie/Ce))))},[i,s]);const[A,O]=k.useState(0),[E,v]=k.useState(""),[T,B]=k.useState(!1),[j,z]=k.useState(!1),[D,N]=k.useState(0),[I,R]=k.useState({min:0,max:0}),[H,U]=k.useState(0),V=k.useRef(!1),G=k.useRef(!1),K=k.useRef(!1),ce=k.useRef(0),[Te,Ke]=k.useState(!1),[Lr,Nr]=k.useState(!0),[Vr,Wr]=k.useState(null);k.useEffect(()=>{Ke(typeof window<"u"&&"showSaveFilePicker"in window)},[]),k.useEffect(()=>{let Ie=!1;return Tu(o,i,s,u).then(Ce=>{Ie||(Nr(Ce.ok),Wr(Ce.ok?null:Ce.reason??null))}),()=>{Ie=!0}},[o,i,s,u]);const[Hr,Gr]=k.useState(()=>({x:Math.max(20,window.innerWidth-Ui-320-20),y:80})),[Jr,Xr]=k.useState({width:Ui,height:Eu});k.useEffect(()=>{Ue.getState().isPlaying&&Ue.getState().pause()},[]);const $r=()=>{V.current=!0,z(!0)},qr=()=>{V.current=!1,z(!1)},Zr=()=>{V.current=!1,K.current=!0,v("Finishing early…")},Kr=()=>{V.current=!1,G.current=!0},Qr=k.useMemo(()=>({width:i,height:s,formatIndex:o,samplesPerFrame:l,bitrate:u,startFrame:p,endFrame:b,frameStep:y,fps:e.fps}),[i,s,o,l,u,p,b,y,e.fps]),Yr=()=>{Fu({cfg:Qr,flags:{cancelledRef:G,finishEarlyRef:K,stoppingRef:V,startTimeRef:ce},status:{setProgress:O,setElapsedTime:N,setEtaRange:R,setLastFrameTime:U,setStatusText:v,setIsRendering:B,setIsStopping:z},isDiskMode:Te,getEngine:()=>$e.ref.current,getCanvas:()=>document.querySelector("canvas")})};return d.jsx(Wi,{title:T?"Rendering…":"Render Video",onClose:t,position:Hr,onPositionChange:Gr,size:Jr,onSizeChange:Xr,disableClose:T,zIndex:600,children:T?d.jsx(Ru,{onStop:$r,onResume:qr,onConfirmStitch:Zr,onDiscard:Kr,progress:A,statusText:E,elapsedTime:D,etaRange:I,lastFrameTime:H,isStopping:j,width:i,height:s,formatIndex:o,samplesPerFrame:l}):d.jsx(Mu,{onStart:Yr,width:i,setWidth:r,height:s,setHeight:a,formatIndex:o,setFormatIndex:n,samplesPerFrame:l,setSamplesPerFrame:c,bitrate:u,setBitrate:h,startFrame:p,setStartFrame:m,endFrame:b,setEndFrame:f,frameStep:y,setFrameStep:C,fps:e.fps,durationFrames:e.durationFrames,isFormatSupported:Lr,formatSupportError:Vr,isDiskMode:Te})})};Fs();F.getState().setSampleCap(64);Ms({enabled:!0,targetFps:45,minQuality:.4,interactionDownsample:.5,activityGraceMs:100,engageOnAccumOnly:!0});Rs();oa();na({controller:new al(()=>$e.ref.current),slot:"left",order:30,id:"fluid-toy-bucket-render"});Es({getCanvas:()=>document.querySelector("canvas")});la(["julia.center_x","julia.center_y","julia.centerLow_x","julia.centerLow_y","julia.zoom"]);Ns();Vs();Ps();_s();Bs({hideShortcuts:!0});js.register({featureId:"julia",captureState:()=>{const t=F.getState();return{center:{...t.julia.center},zoom:t.julia.zoom}},applyState:t=>{F.getState().setJulia({center:t.center,zoom:t.zoom})}});Ds();Ws();Hs.registerHudHint({id:"fluid-toy-controls",slot:"bottom-left",order:0,component:ll});Gs.register({id:"fluid-toy.quality",slot:"bottom-left",order:10,component:nl});xl();ct.register("panel-views",vl);ca(Pu);rl();const Ur=document.getElementById("root");if(!Ur)throw new Error("Could not find root element to mount to");const _u=zs.createRoot(Ur);_u.render(d.jsx(ms.StrictMode,{children:d.jsx(tl,{})}));
