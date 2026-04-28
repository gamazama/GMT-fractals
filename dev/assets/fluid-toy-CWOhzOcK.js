var it=Object.defineProperty;var rt=(i,e,r)=>e in i?it(i,e,{enumerable:!0,configurable:!0,writable:!0,value:r}):i[e]=r;var f=(i,e,r)=>rt(i,typeof e!="symbol"?e+"":e,r);import{U as Ne,i as ce,f as I,V as ot,W as at,X as E,u as x,r as ie,N as st,M as Ve,O as nt,S as lt,E as ct,D as ut,l as dt,P as pt,T as ft,n as De,o as ht,G as mt,q as gt,Y as xt,Z as vt,_ as bt,$ as yt,t as Tt,Q as wt,v as Mt,w as Ct,x as At,y as Rt,R as St}from"./Undo-BVNOZopG.js";import{r as C,j as d,R as Et}from"./three-fiber-OZZ-CFAc.js";import{V as Ft,i as Dt,c as Pt}from"./Camera-C0hbr113.js";import{c as Lt}from"./three-drei-B0ZqTV5-.js";import{R as jt,H as It,a as kt,b as _t,i as zt,h as Bt,c as Ot}from"./modulationTick-BB9aaIDw.js";import{a as j,u as He}from"./typedSlices-BH2wDCRg.js";import{i as Ut,S as Gt,C as Nt,a as Vt}from"./CompositionOverlayControls-BDNrrV5g.js";import{r as Ht}from"./cameraKeyRegistry-gnks3z8L.js";import"./three-CAXFefdI.js";import"./pako-DwGzBETv.js";import"./ModulationEngine-VqzgNlCN.js";const Jt=i=>i.charAt(0).toUpperCase()+i.slice(1).replace(/-/g," "),_=(i,e,r={})=>{const t=r.defaultIndex??0,o=i.map((s,l)=>{var c;return{label:((c=r.optionLabels)==null?void 0:c[s])??Jt(s),value:l}});return{config:{type:"float",default:t,label:e,options:o,...r.extra},fromIndex:s=>{const l=Math.floor(s??t);return l<0||l>=i.length||Number.isNaN(l)?i[t]:i[l]},values:i}},be=_(["julia","mandelbrot"],"Fractal Kind",{defaultIndex:1}),ge=be.values,Xt=be.fromIndex,Zt={id:"julia",name:"Fractal",category:"Fractal",tabConfig:{label:"Fractal"},customUI:[{componentId:"julia-c-picker",parentId:"juliaC",condition:{param:"kind",eq:0}}],params:{kind:be.config,juliaC:{type:"vec2",default:{x:-.36303304426511473,y:.16845183018751916},min:-2,max:2,step:.001,label:"Julia c",description:"Julia constant. Move me to reshape the entire fractal — and the forces it emits."},zoom:{type:"float",default:1.2904749020480561,min:1e-5,max:8,step:1e-4,scale:"log",label:"Zoom",description:"Zoom into the fractal. Scroll wheel + middle-click-drag on the canvas go much deeper (to 0.00001)."},center:{type:"vec2",default:{x:-.8139175130270945,y:-.054649908357858296},min:-2,max:2,step:.01,label:"Center",description:"Pan the fractal window."},centerLow:{type:"vec2",default:{x:0,y:0},min:-1,max:1,step:1e-12,label:"Center (low bits)",description:"Internal — sub-f64 pan accumulator.",hidden:!0},maxIter:{type:"int",default:310,min:16,max:512,step:1,label:"Iter",description:"More iterations → sharper escape gradients → finer force detail."},power:{type:"float",default:2,min:2,max:8,step:1,label:"Power",description:"z-power in the iteration. 2 = classic z²+c; higher exponents make more lobes."}}},Wt=(i,e,r)=>{var s,l;const t=e.juliaC.x,o=e.juliaC.y,n=r["julia.juliaC_x"]??t,a=r["julia.juliaC_y"]??o;i.setParams({kind:Xt(e.kind),juliaC:[n,a],maxIter:e.maxIter,power:e.power,center:[e.center.x,e.center.y],centerLow:[((s=e.centerLow)==null?void 0:s.x)??0,((l=e.centerLow)==null?void 0:l.y)??0],zoom:e.zoom})},Kt={id:"deepZoom",name:"Deep Zoom",category:"Fractal",tabConfig:{label:"Deep Zoom"},params:{enabled:{type:"boolean",default:!1,label:"Enable deep zoom",description:"Master toggle. Switches the iteration kernel to perturbation + LA, unlocking zoom past 1e-5 (eventually past 1e-300). Off by default — costs nothing when off."},useLA:{type:"boolean",default:!0,label:"Use Linear Approximation",condition:{param:"enabled",bool:!0},description:"Skip iterations via the LA stage table. 10–100× faster at depth. Off = pure perturbation (slow, but useful for sanity-checking LA output)."},useAT:{type:"boolean",default:!0,label:"Use AT front-load",condition:{param:"enabled",bool:!0},description:"Fast-forward the front of the orbit via Approximation Terms (a single z²+c loop in plain f32). Free perf when applicable. No effect when LA is off."},maxRefIter:{type:"int",default:5e4,min:5e3,max:5e5,step:1e3,label:"Reference orbit length",condition:{param:"enabled",bool:!0},description:"Maximum iterations the high-precision reference orbit runs to. Higher = supports deeper zooms but costs CPU at build time and GPU memory at runtime. Auto-suggested per zoom depth in later phases."},deepMaxIter:{type:"int",default:2e3,min:200,max:5e4,step:100,label:"Iter (deep)",condition:{param:"enabled",bool:!0},description:"Maximum iterations per pixel when deep zoom is on. Overrides the Fractal-tab Iter slider while deep is enabled. Without LA every iteration costs the full HDR step — push gently until phase 6 (LA runtime) lands."},showStats:{type:"boolean",default:!1,label:"Show stats",condition:{param:"enabled",bool:!0},description:"Overlay reference-orbit length, LA stage count, table size, and build time. Diagnostic."},disableFluid:{type:"boolean",default:!1,label:"Disable fluid sim (debug)",condition:{param:"enabled",bool:!0},description:"Skip every fluid pass (motion, advect, pressure, dye decay) so render time reflects the fractal kernel only. Use to isolate deep-zoom perf from fluid sim cost."}}},qt=(i,e,r)=>{e.enabled?(i.setParams({deepZoomEnabled:!0,maxIter:e.deepMaxIter}),i.setForceFluidPaused(e.disableFluid)):(i.setParams({deepZoomEnabled:!1,maxIter:r.maxIter}),i.deepZoom.clearReferenceOrbit(),i.deepZoom.clearLATable(),i.deepZoom.setLAEnabled(!1),i.deepZoom.clearAT(),i.setForceFluidPaused(!1))},ye=_(["gradient","curl","iterate","c-track","hue"],"Force Mode",{optionLabels:{"c-track":"C-Track"}}),$t=ye.values,Yt=ye.fromIndex,Qt="How fractal pixels become velocity at each cell. Gradient pushes AWAY from the set. Curl swirls along level sets. Iterate follows z's orbit grain. C-Track reacts to Δc in real time. Hue makes the picture itself the velocity field.",ei={id:"coupling",name:"Coupling",category:"Simulation",tabConfig:{label:"Coupling"},params:{forceMode:{...ye.config,description:Qt},forceGain:{type:"float",default:-1200,min:-2e3,max:2e3,step:.1,label:"Force gain",description:"Multiplier on the fractal-derived force. How loudly the fractal shouts at the fluid. Negative inverts the force direction."},interiorDamp:{type:"float",default:.59,min:0,max:1,step:.01,label:"Interior damp",description:"How much to suppress force inside the set. 1 = still lake in the interior, 0 = full bleed."},forceCap:{type:"float",default:40,min:1,max:40,step:.5,label:"Force cap",description:"Per-pixel cap on the fractal force magnitude."},edgeMargin:{type:"float",default:.04,min:0,max:.25,step:.005,label:"Edge margin",description:'Fades force / dye injection near the canvas edges. Fixes "gushing from the borders" under fast c-changes.'},orbitEnabled:{type:"boolean",default:!1,label:"Auto-orbit c",description:"Circles c automatically around its current value. Pair with C-Track to watch the fluid breathe with the fractal's deformation."},orbitRadius:{type:"float",default:.08,min:0,max:.5,step:.001,label:"Radius",condition:{param:"orbitEnabled",bool:!0},description:"Distance c travels from its base position as the orbit circles."},orbitSpeed:{type:"float",default:.25,min:0,max:3,step:.01,label:"Speed",condition:{param:"orbitEnabled",bool:!0},description:"Orbit rate in Hz. 1 = one full circle per second."}}};function Te(i,e){const r=e,t={current:e},o=new Set;let n=0;const a=m=>(o.add(m),()=>{o.delete(m)}),s=()=>{n++,o.forEach(m=>m())};return{name:i,ref:t,useSnapshot:()=>(C.useSyncExternalStore(a,()=>n,()=>n),t.current),subscribe:a,notify:s,reset:()=>{t.current=r,s()}}}const re=Math.PI*2,de=(i,e,r)=>(r<0&&(r+=1),r>1&&(r-=1),r<1/6?i+(e-i)*6*r:r<1/2?e:r<2/3?i+(e-i)*(2/3-r)*6:i),Je=(i,e,r)=>{if(e===0)return[r,r,r];const t=r<.5?r*(1+e):r+e-r*e,o=2*r-t;return[de(o,t,i+1/3),de(o,t,i),de(o,t,i-1/3)]},ti=(i,e,r)=>{const t=Math.max(i,e,r),o=Math.min(i,e,r),n=(t+o)/2;if(t===o)return[0,0,n];const a=t-o,s=n>.5?a/(2-t-o):a/(t+o);let l;return t===i?l=(e-r)/a+(e<r?6:0):t===e?l=(r-i)/a+2:l=(i-e)/a+4,[l/6,s,n]},ii=(i,e)=>{if(e<=0)return i;const[r,t,o]=ti(i[0],i[1],i[2]),n=(r+(Math.random()-.5)*e+1)%1;return Je(n,t,o)},ri=(i,e)=>{if(!i||i.length<4)return[1,1,1];const r=(e%1+1)%1,t=i.length/4,o=Math.min(t-1,Math.floor(r*t))*4;return[i[o]/255,i[o+1]/255,i[o+2]/255]},Xe=i=>{let e;switch(i.mode){case"solid":e=[i.solidColor[0],i.solidColor[1],i.solidColor[2]];break;case"gradient":e=ri(i.gradientLut,(i.u+i.v)*.5);break;case"velocity":{const r=Math.min(1,Math.hypot(i.vx,i.vy)*.2),t=(Math.atan2(i.vy,i.vx)/re+1)%1;e=Je(t,.9,.35+.3*r);break}case"rainbow":default:{const r=i.rainbowPhase;e=[.5+.5*Math.cos(re*r),.5+.5*Math.cos(re*(r+.33)),.5+.5*Math.cos(re*(r+.67))];break}}return ii(e,i.jitter)},xe=300,oi=(i,e)=>{if(i.length>=xe)return;const t=Math.atan2(e.dirY,e.dirX)+(Math.random()-.5)*2*e.particleSpread*Math.PI,o=e.particleVelocity*(.4+Math.random()*.6),n=e.brushSize*.35;i.push({x:e.u+(Math.random()-.5)*n,y:e.v+(Math.random()-.5)*n,vx:Math.cos(t)*o,vy:Math.sin(t)*o,life:e.particleLifetime,lifeMax:e.particleLifetime,color:[e.color[0],e.color[1],e.color[2]],size:e.brushSize*e.particleSizeScale*(.85+Math.random()*.3)})},ai=(i,e,r,t)=>{const o=2*(i*r+e*t);return[i-o*r,e-o*t]},si=.5,ni=(i,e)=>{const r=Math.exp(-e.particleDrag*e.dtSec),t=e.restitution??.55,o=.01;let n=0;for(let a=i.length-1;a>=0;a--){const s=i[a];s.vx*=r,s.vy*=r,s.vy+=e.particleGravity*e.dtSec;const l=s.x,c=s.y;if(s.x+=s.vx*e.dtSec,s.y+=s.vy*e.dtSec,s.life-=e.dtSec,e.sampleMask&&e.sampleMask(s.x,s.y)>=si){let u=e.sampleMask(s.x+o,s.y)-e.sampleMask(s.x-o,s.y),m=e.sampleMask(s.x,s.y+o)-e.sampleMask(s.x,s.y-o),p=Math.hypot(u,m);if(p<=1e-6){const h=o*3;u=e.sampleMask(s.x+h,s.y)-e.sampleMask(s.x-h,s.y),m=e.sampleMask(s.x,s.y+h)-e.sampleMask(s.x,s.y-h),p=Math.hypot(u,m)}let T,w;if(p>1e-6)T=-u/p,w=-m/p;else{const h=Math.hypot(s.vx,s.vy);h>1e-6?(T=-s.vx/h,w=-s.vy/h):(T=1,w=0)}[s.vx,s.vy]=ai(s.vx,s.vy,T,w),s.vx*=t,s.vy*=t,s.x=l+T*o,s.y=c+w*o}(s.life<=0||s.x<-.2||s.x>1.2||s.y<-.2||s.y>1.2)&&(i.splice(a,1),n++)}return n},li=()=>({particles:[],rainbowPhase:0,distSinceSplat:0,spawnAcc:0}),ci=(i,e)=>{i.rainbowPhase=e.wallClockMs*.001%1;const r=e.params;if(e.dragging&&r.particleEmitter&&e.cursorUv){i.spawnAcc+=e.dtSec*r.particleRate;const t=e.cursorVelUv??{vx:0,vy:0},o=Math.hypot(t.vx,t.vy),n=o<=1e-4;for(;i.spawnAcc>=1&&i.particles.length<xe;){i.spawnAcc-=1;let a,s;if(n){const c=Math.random()*Math.PI*2;a=Math.cos(c),s=Math.sin(c)}else a=t.vx/o,s=t.vy/o;const l=Xe({mode:r.colorMode,solidColor:r.solidColor,gradientLut:r.gradientLut,rainbowPhase:i.rainbowPhase,u:e.cursorUv.u,v:e.cursorUv.v,vx:t.vx,vy:t.vy,jitter:r.jitter});oi(i.particles,{u:e.cursorUv.u,v:e.cursorUv.v,dirX:a,dirY:s,color:l,brushSize:r.size,particleVelocity:r.particleVelocity,particleSpread:r.particleSpread,particleLifetime:r.particleLifetime,particleSizeScale:r.particleSizeScale})}i.particles.length>=xe&&(i.spawnAcc=0)}if(i.particles.length>0){ni(i.particles,{dtSec:e.dtSec,particleGravity:r.particleGravity,particleDrag:r.particleDrag,sampleMask:(t,o)=>e.engine.sampleMask(t,o)});for(const t of i.particles){const o=Math.max(0,t.life/t.lifeMax);e.engine.brush(t.x,t.y,t.vx*r.flow,t.vy*r.flow,t.color,t.size,r.hardness,r.strength*o,r.mode)}}},ui=(i,e)=>{const r=e.params;return r.particleEmitter||i.distSinceSplat<Math.max(1e-5,r.spacing)?!1:(i.distSinceSplat=0,Ze(i,e),!0)},di=(i,e)=>{e.params.particleEmitter||(Ze(i,e),i.distSinceSplat=0)},Ze=(i,e)=>{i.rainbowPhase=e.wallClockMs*.001%1;const r=e.params,t=Xe({mode:r.colorMode,solidColor:r.solidColor,gradientLut:r.gradientLut,rainbowPhase:i.rainbowPhase,u:e.u,v:e.v,vx:e.dvx,vy:e.dvy,jitter:r.jitter});e.engine.brush(e.u,e.v,e.dvx*r.flow,e.dvy*r.flow,t,r.size,r.hardness,r.strength,r.mode)},pi=i=>{i.distSinceSplat=1/0,i.spawnAcc=0},ve=Te("fluid-toy.engine",null),W=Te("fluid-toy.brush",{runtime:li(),gradientLut:null}),Z=Te("fluid-toy.cursor",{dragging:!1,uv:null,velUv:null}),fi={colorSpace:"srgb",blendSpace:"oklab",stops:[{id:"0",position:0,color:"#000000",bias:.5,interpolation:"linear"},{id:"1",position:.15,color:"#1a0a00",bias:.5,interpolation:"linear"},{id:"2",position:.35,color:"#8b1a00",bias:.5,interpolation:"linear"},{id:"3",position:.6,color:"#ff6b00",bias:.5,interpolation:"linear"},{id:"4",position:.85,color:"#ffdd66",bias:.5,interpolation:"linear"},{id:"5",position:1,color:"#ffffff",bias:.5,interpolation:"linear"}]},we=_(["add","screen","max","over"],"Dye blend"),hi=we.values,mi=we.fromIndex,Me=_(["linear","perceptual","vivid"],"Colour space"),gi=Me.values,xi=Me.fromIndex,Ce=_(["iterations","angle","magnitude","decomposition","bands","orbit-point","orbit-circle","orbit-cross","orbit-line","stripe","distance","derivative","potential","trap-iter"],"Color mapping",{optionLabels:{decomposition:"Decomp","orbit-point":"Trap · Point","orbit-circle":"Trap · Circle","orbit-cross":"Trap · Cross","orbit-line":"Trap · Line","trap-iter":"Trap Iteration",distance:"Distance Estimate",potential:"Continuous Potential",derivative:"Derivative (log|dz|)"}}),vi=Ce.values,bi=Ce.fromIndex,yi=5,Pe=6,Ti=7,Le=8,wi=9,Mi=13,Ci={id:"palette",name:"Palette",category:"Look",tabConfig:{label:"Palette"},params:{gradient:{type:"gradient",default:fi,label:"Palette",description:"Colors both the fractal AND the dye injected into the fluid. In Hue-mode (Coupling), this IS the vector field."},colorMapping:{...Ce.config,description:"How the iteration-space scalar becomes a t-value into the gradient. Each mode exposes its own extra controls below."},gradientRepeat:{type:"float",default:1,min:.1,max:8,step:.01,label:"Repetition",description:"Tiles the gradient across the mapped axis. 1 = one sweep, 3 = three bands."},gradientPhase:{type:"float",default:0,min:0,max:1,step:.005,label:"Phase",description:"Phase shift — rotates the colors without changing their layout."},colorIter:{type:"int",default:310,min:1,max:1024,step:1,label:"Color iter",description:"Iterations used for the coloring accumulators (orbit trap, stripe, DE). Separate from escape-test maxIter — reduce for fresher colours."},trapCenter:{type:"vec2",default:{x:0,y:0},min:-2,max:2,step:.01,label:"Trap center",description:"Trap centre (complex coord). Move to pick which point in the orbit to trap against.",condition:{or:[{param:"colorMapping",eq:yi},{param:"colorMapping",eq:Pe},{param:"colorMapping",eq:Ti},{param:"colorMapping",eq:Mi}]}},trapRadius:{type:"float",default:1,min:.01,max:4,step:.01,label:"Trap radius",condition:{param:"colorMapping",eq:Pe},description:"Circle radius for the trap. Orbit pixels are coloured by how close they approach this ring."},trapNormal:{type:"vec2",default:{x:1,y:0},min:-1,max:1,step:.01,label:"Trap normal",condition:{param:"colorMapping",eq:Le},description:"Line trap: z lies on dot(z, normal) = offset. Normal should be unit-length."},trapOffset:{type:"float",default:0,min:-2,max:2,step:.01,label:"Trap offset",condition:{param:"colorMapping",eq:Le},description:"Line-trap offset (scalar position along the normal direction)."},stripeFreq:{type:"float",default:4,min:1,max:16,step:.1,label:"Stripe freq",condition:{param:"colorMapping",eq:wi},description:"Stripe frequency — k in ½ + ½·sin(k·arg z). Higher = more stripes per iteration."},interiorColor:{type:"vec3",default:{x:.02,y:.02,z:.04},min:0,max:1,step:.001,label:"Interior color",description:"Colour for bounded points (pixels that never escape the iteration)."},escapeR:{type:"float",default:32,min:2,max:1024,step:.1,label:"Escape R",scale:"log",hidden:!0},dyeBlend:{...we.config,description:"How new dye mixes with what the fluid already carries. Gradient stop alpha acts as a per-colour injection mask."}}},Ai=(i,e)=>{const r=e.trapNormal.x,t=e.trapNormal.y,o=Math.hypot(r,t),n=o>1e-6?[r/o,t/o]:[1,0],a=e.interiorColor;if(i.setParams({colorMapping:bi(e.colorMapping),colorIter:e.colorIter,escapeR:e.escapeR,interiorColor:[a.x,a.y,a.z],trapCenter:[e.trapCenter.x,e.trapCenter.y],trapRadius:e.trapRadius,trapNormal:n,trapOffset:e.trapOffset,stripeFreq:e.stripeFreq,dyeBlend:mi(e.dyeBlend),gradientRepeat:e.gradientRepeat,gradientPhase:e.gradientPhase}),e.gradient){const s=Ne(e.gradient);i.setGradientBuffer(s),W.ref.current.gradientLut=s}},Ri={colorSpace:"srgb",blendSpace:"rgb",stops:[{id:"0",position:0,color:"#000000",bias:.5,interpolation:"linear"},{id:"1",position:1,color:"#000000",bias:.5,interpolation:"linear"}]},Si={id:"collision",name:"Collision",category:"Simulation",tabConfig:{label:"Collision"},params:{enabled:{type:"boolean",default:!1,label:"Collision walls",description:"Paints solid walls the fluid bounces off, sculpted by the gradient below. Same t-axis mapping as the main palette — edit stops to black = fluid, white = wall."},gradient:{type:"gradient",default:Ri,label:"Collision pattern",condition:{param:"enabled",bool:!0},description:"B&W gradient defining where walls sit along the iteration-space t-axis."},repeat:{type:"float",default:1,min:.1,max:8,step:.01,label:"Collision repeat",condition:{param:"enabled",bool:!0},description:"Tile the collision pattern along t — independent of the dye gradient repeat."},phase:{type:"float",default:0,min:0,max:1,step:.001,label:"Collision phase",condition:{param:"enabled",bool:!0},description:"Phase-shift the collision pattern so walls land where the dye doesn't."},preview:{type:"boolean",default:!1,label:"Preview walls on canvas",condition:{param:"enabled",bool:!0},description:"Overlays diagonal cyan hatching on solid cells so you can see the wall shape while tuning the gradient."}}},Ei=(i,e)=>{if(i.setParams({collisionEnabled:e.enabled,collisionPreview:e.preview,collisionRepeat:e.repeat,collisionPhase:e.phase}),e.gradient){const r=Ne(e.gradient);i.setCollisionGradientBuffer(r)}},Fi={id:"fluidSim",name:"Fluid",category:"Simulation",tabConfig:{label:"Fluid"},params:{vorticity:{type:"float",default:22.1,min:0,max:50,step:.1,label:"Vorticity",description:"Amplifies existing curl — keeps fractal-induced swirls from smearing away."},vorticityScale:{type:"float",default:1,min:.5,max:8,step:.1,label:"Vorticity scale",condition:{param:"vorticity",gt:0},description:"Spatial scale of the vorticity confinement (in sim texels). 1 = tight pixel-scale swirls, 4+ = larger organised vortices."},dissipation:{type:"float",default:.17,min:0,max:5,step:.01,label:"Velocity dissipation /s",description:"How fast velocity decays. High = fluid forgets the fractal quickly."},dyeInject:{type:"float",default:1.5,min:0,max:3,step:.01,label:"Dye inject",description:"How much of the fractal's color bleeds into the fluid each frame."},pressureIters:{type:"int",default:50,min:4,max:60,step:1,label:"Pressure iters",description:"Jacobi iterations for incompressibility. More = stricter but slower."},dyeDecayMode:{...Me.config,description:"How dye fades over time. Colour space controls whether it greys out (linear) or stays hue-stable (perceptual / vivid)."},dyeDissipation:{type:"float",default:1.03,min:0,max:5,step:.01,label:"Dye dissipation /s",description:"How fast dye fades. In linear mode this is a straight RGB multiply; in perceptual / vivid it's the OKLab luminance fade (chroma fades on its own schedule below)."},dyeChromaDecayHz:{type:"float",default:1.03,min:0,max:5,step:.01,label:"Chroma decay /s",condition:{param:"dyeDecayMode",neq:0},description:"Per-second fade on OKLab a/b (chroma). Lower than Dye dissipation → colour stays saturated longer than it stays bright."},dyeSaturationBoost:{type:"float",default:1,min:.5,max:1.1,step:.001,scale:"log",label:"Saturation boost",condition:{param:"dyeDecayMode",eq:2},description:"Per-frame chroma gain. 1 = neutral, <1 washes out, >1 pushes toward max saturation. Gamut-mapped in OKLab so it pegs at the saturation ceiling rather than hue-shifting to white."},dt:{type:"float",default:.016,min:.001,max:.05,step:1e-4,label:"Δt (advanced)",description:"Integration timestep. Lower = more stable."},paused:{type:"boolean",default:!1,label:"Pause sim",description:"Freeze the fluid state. Splats and param changes still land; they just don't integrate forward."}}},Di=(i,e,r)=>{i.setParams({vorticity:e.vorticity,vorticityScale:e.vorticityScale,pressureIters:e.pressureIters,dissipation:e.dissipation,paused:e.paused,dt:e.dt,dyeInject:e.dyeInject,dyeDecayMode:xi(e.dyeDecayMode),dyeDissipation:e.dyeDissipation,dyeChromaDecayHz:e.dyeChromaDecayHz,dyeSaturationBoost:e.dyeSaturationBoost,forceMode:Yt(r.forceMode),forceGain:r.forceGain,interiorDamp:r.interiorDamp,forceCap:r.forceCap,edgeMargin:r.edgeMargin})},Pi={id:"presets",name:"Presets",category:"Library",tabConfig:{label:"Presets"},customUI:[{componentId:"preset-grid"}],params:{_anchor:{type:"float",default:0,min:0,max:1,step:1,label:"",hidden:!0}}},U=i=>i.map(([e,r],t)=>({id:`s${t}`,position:e,color:r,bias:.5,interpolation:"linear"})),Li=[{id:"bench-julia-only",name:"Bench (Julia only)",desc:"Isolation preset for performance benchmarking. All post-FX, fluid coupling, dye, collision, and palette tricks are off — only the raw Julia/Mandelbrot fractal layer renders. Pair with the Disable-fluid-sim toggle on the Deep Zoom panel and accumulation off (topbar) for a clean GPU-time read.",params:{juliaC:[-.36303304426511473,.16845183018751916],center:[-.8139175130270945,-.054649908357858296],zoom:1.2904749020480561,maxIter:310,power:2,kind:"mandelbrot",forceMode:"gradient",forceGain:0,interiorDamp:1,dissipation:0,dyeDissipation:0,dyeInject:0,vorticity:0,vorticityScale:1,pressureIters:1,show:"julia",juliaMix:1,dyeMix:0,velocityViz:0,gradientRepeat:.1,gradientPhase:0,colorMapping:"iterations",colorIter:310,stripeFreq:4,dyeBlend:"max",dyeDecayMode:"linear",dyeChromaDecayHz:0,dyeSaturationBoost:1,toneMapping:"none",exposure:1,vibrance:1,bloomAmount:0,bloomThreshold:1,aberration:0,refraction:0,refractSmooth:1,refractRoughness:0,caustics:0,interiorColor:[0,0,0],edgeMargin:0,forceCap:1,collisionEnabled:!1,paused:!0},gradient:{stops:U([[0,"#000000"],[1,"#FFFFFF"]]),colorSpace:"linear",blendSpace:"rgb"}},{id:"coral-gyre",name:"Coral Gyre",desc:"Orbit-point colouring on a negative curl — teal interior feeds a coral halo, with filmic bloom + aberration.",params:{juliaC:[-.8173594132029339,.15279058679706603],center:[0,0],zoom:1.5,maxIter:182,power:2,kind:"julia",forceMode:"curl",forceGain:-760,interiorDamp:.9,dissipation:.1,dyeDissipation:.63,dyeInject:2.28,vorticity:25.9,vorticityScale:4.2,pressureIters:30,show:"composite",juliaMix:.55,dyeMix:1,velocityViz:0,gradientRepeat:.56,gradientPhase:.09,colorMapping:"orbit-point",colorIter:96,trapCenter:[1.17,0],dyeBlend:"add",dyeDecayMode:"vivid",dyeSaturationBoost:1.01,toneMapping:"filmic",exposure:2.295,vibrance:1.87,bloomAmount:1.35,bloomThreshold:1,aberration:1.12,refraction:0,refractSmooth:1,caustics:3.9,interiorColor:[.02,.04,.08],edgeMargin:.04,forceCap:12,collisionEnabled:!0},gradient:{stops:U([[0,"#000000"],[.202,"#05233d"],[.362,"#0f6884"],[.521,"#56c6c0"],[.681,"#f0fff1"],[.84,"#e7bd69"],[1,"#8a3f19"]]),colorSpace:"linear",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.513,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.573,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"}},{id:"ink-canyon",name:"Ink Canyon",desc:"Monochrome dye threading between twin collision walls — one at the near edge, one deep in the field.",params:{juliaC:[-.7763636363636364,.19684858842329547],center:[.019054061889010376,-.007321977964897804],zoom:1.2904749020480561,maxIter:310,power:2,kind:"julia",forceMode:"curl",forceGain:1200,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:5.9,pressureIters:50,show:"dye",juliaMix:.45,dyeMix:1,velocityViz:0,gradientRepeat:1,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",aberration:.27,refraction:0,caustics:0,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,collisionEnabled:!0},gradient:{stops:U([[0,"#000000"],[1,"#FFFFFF"]]),colorSpace:"linear",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.02,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.07,color:"#000000",bias:.5,interpolation:"step"},{id:"c3",position:.833,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c4",position:.883,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"}},{id:"plasma-vein",name:"Plasma Vein",desc:"Fractional power (1.5) with 7× repeated blue/red bands. Vivid chroma decay keeps the refracted dye electric.",params:{juliaC:[-.1764262149580809,.1951288073545453],center:[.21016359187729639,-.014585098813268887],zoom:.975889617512663,maxIter:310,power:1.5,kind:"julia",forceMode:"curl",forceGain:1200,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:5.9,pressureIters:50,show:"dye",juliaMix:.7,dyeMix:1,velocityViz:0,gradientRepeat:7.43,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",dyeDecayMode:"vivid",toneMapping:"filmic",exposure:1.86,vibrance:1.645,aberration:.5,refraction:.006,refractSmooth:11.8,caustics:0,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40},gradient:{stops:U([[0,"#000000"],[.143,"#001830"],[.286,"#004060"],[.429,"#00BFFF"],[.571,"#006080"],[.714,"#600000"],[.857,"#DC0000"],[1,"#FF4040"]]),colorSpace:"linear",blendSpace:"rgb"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.536,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.586,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"}},{id:"crater-drift",name:"Crater Drift",desc:"Mandelbrot under inward curl, inferno-magenta palette. Slow auto-orbit carves craters through the bloom.",params:{juliaC:[.56053050672182,.468459152016546],center:[-.9313160617349564,-.15288948147190096],zoom:1.1807159194396142,maxIter:604,power:2,kind:"mandelbrot",forceMode:"curl",forceGain:-535.6,interiorDamp:0,dissipation:.16,dyeDissipation:.05,dyeInject:3,vorticity:2.9,vorticityScale:1.2,pressureIters:48,show:"composite",juliaMix:0,dyeMix:1.01,velocityViz:0,gradientRepeat:.66,gradientPhase:0,colorMapping:"iterations",colorIter:263,trapCenter:[1.51,-1.37],dyeBlend:"max",dyeDecayMode:"perceptual",dyeChromaDecayHz:0,toneMapping:"filmic",exposure:20.63,vibrance:1.645,bloomAmount:.63,bloomThreshold:.76,aberration:.4,refraction:0,caustics:0,interiorColor:[.02,.02,.03],edgeMargin:.04,forceCap:38.5,collisionEnabled:!0},gradient:{stops:U([[.084,"#000004"],[.215,"#280B54"],[.346,"#65156E"],[.477,"#9F2A63"],[.607,"#D44842"],[.738,"#F52D15"],[.869,"#FA2727"],[1,"#FF7983"]]),colorSpace:"srgb",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.532,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.659,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"},orbit:{enabled:!0,radius:.01,speed:.05}},{id:"quartic-strata",name:"Quartic Strata",desc:"Power-4 Julia drifting on a subtle c-track. Strata of blue/red dye held by a near-edge wall.",params:{juliaC:[.7072727272727275,-.1398788174715911],center:[-.0013928986324417691,-.010035496866822907],zoom:.975889617512663,maxIter:310,power:4,kind:"julia",forceMode:"c-track",forceGain:1,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:1,pressureIters:50,show:"dye",juliaMix:.45,dyeMix:1,velocityViz:0,gradientRepeat:2,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",aberration:.27,refraction:.037,caustics:1,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,collisionEnabled:!0},gradient:{stops:U([[0,"#000000"],[.143,"#001830"],[.286,"#004060"],[.429,"#00BFFF"],[.571,"#006080"],[.714,"#600000"],[.857,"#DC0000"],[1,"#FF4040"]]),colorSpace:"linear",blendSpace:"rgb"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.113,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.163,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"},orbit:{enabled:!0,radius:.01,speed:.2}},{id:"sunset-bands",name:"Sunset Bands",desc:"Force-gradient mode with hard band colouring — sunset strata pushed inward at 1536 sim.",params:{juliaC:[-.16545454545454558,.6455757279829545],center:[-.1012543995130697,.03079433116134145],zoom:1.086757425434934,maxIter:175,power:2,kind:"julia",forceMode:"gradient",forceGain:1500,interiorDamp:5.8,dissipation:.22,dyeDissipation:.5,dyeInject:.55,vorticity:0,pressureIters:30,show:"composite",juliaMix:.55,dyeMix:2,velocityViz:0,gradientRepeat:1.35,gradientPhase:.055,colorMapping:"bands",colorIter:175,dyeBlend:"over",aberration:.27,refraction:0,caustics:1,interiorColor:[.02,.02,.03],edgeMargin:.04,forceCap:12},gradient:{stops:U([[0,"#04001f"],[.167,"#1a1049"],[.333,"#4e2085"],[.5,"#b13a8a"],[.667,"#ff7657"],[.833,"#ffc569"],[1,"#fff9d0"]]),colorSpace:"linear",blendSpace:"oklab"}},{id:"verdant-pulse",name:"Verdant Pulse",desc:"Viridis-to-magenta orbit-circle ring, wide vorticity, slow auto-orbit — the set breathes green and pink.",params:{juliaC:[-.7,.27015],center:[-.15958346356258324,-.09244114001481094],zoom:1.3957783246444389,maxIter:160,power:2,kind:"julia",forceMode:"c-track",forceGain:10,interiorDamp:.45,dissipation:.2,dyeDissipation:.17,dyeInject:.9,vorticity:16,vorticityScale:5.8,pressureIters:30,show:"composite",juliaMix:0,dyeMix:3.805,velocityViz:0,gradientRepeat:1,gradientPhase:.03,colorMapping:"orbit-circle",colorIter:94,dyeBlend:"over",dyeDecayMode:"perceptual",exposure:.35,vibrance:1.645,aberration:.27,refraction:.037,caustics:1,interiorColor:[.02,0,.04],edgeMargin:.04,forceCap:12,collisionEnabled:!0},gradient:{stops:U([[0,"#000000"],[.061,"#440154"],[.143,"#46327F"],[.286,"#365C8D"],[.429,"#277F8E"],[.571,"#1FA187"],[.714,"#4AC26D"],[.857,"#3ADA62"],[1,"#FD25B6"]]),colorSpace:"linear",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.037,color:"#000000",bias:.5,interpolation:"linear"},{id:"c2",position:.943,color:"#000000",bias:.5,interpolation:"step"},{id:"c3",position:1,color:"#626262",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"},orbit:{enabled:!0,radius:.035,speed:.02}}],Ae=_(["none","reinhard","agx","filmic"],"Tone mapping",{optionLabels:{agx:"AgX"}}),ji=Ae.values,Ii=Ae.fromIndex,Re=_(["plain","electric","liquid"],"Style"),ki=Re.values,_i=Re.fromIndex,zi={id:"postFx",name:"Post FX",category:"Look",tabConfig:{label:"Post-FX"},params:{fluidStyle:{...Re.config,description:"Post-process pack. Pick a style to preset bloom / aberration / refraction, or mix them yourself below."},bloomAmount:{type:"float",default:0,min:0,max:3,step:.01,label:"Bloom",description:"Bloom strength — wide soft glow on bright pixels. Core of the electric look."},bloomThreshold:{type:"float",default:1,min:0,max:3,step:.01,label:"Bloom threshold",condition:{param:"bloomAmount",gt:0},description:"Luminance threshold: pixels below this don't contribute to bloom. Lower = more of the image glows."},aberration:{type:"float",default:.27,min:0,max:3,step:.01,label:"Aberration",description:"Chromatic aberration keyed to local velocity — plasma fringing on fast-moving dye regions. Affects dye only; fractal stays sharp."},refraction:{type:"float",default:.037,min:0,max:.3,step:.001,label:"Refraction",description:"Screen-space refraction: dye's luminance acts as a height field — the fractal underneath warps like glass."},refractSmooth:{type:"float",default:3,min:1,max:12,step:.1,label:"Refract smooth",condition:{param:"refraction",gt:0},description:"Stencil width (in dye texels) for the refraction gradient. Higher = smoother distortion, less pixel jitter; 1 = raw single-pixel gradient."},refractRoughness:{type:"float",default:0,min:0,max:1,step:.01,label:"Refract roughness",condition:{param:"refraction",gt:0},description:"Frosted-glass scatter for the refracted fractal. 0 = crisp polished glass (single-tap). 1 = ~5px Vogel-disc blur — light scatters into a cone like real rough surfaces. Mask + walls blur in step so glass edges stay consistent."},caustics:{type:"float",default:1,min:0,max:25,step:.1,label:"Caustics",description:"Laplacian-of-dye highlight — simulates focused-light caustics where the liquid surface bends."},toneMapping:{...Ae.config,description:"How final colour gets compressed. None = maximally vivid (may clip). AgX = 2023 hue-stable roll-off (best for rich colours). Reinhard desaturates highlights."},exposure:{type:"float",default:1,min:.1,max:5,step:.01,label:"Exposure",description:"Multiplier on final colour BEFORE tone mapping. Crank up to make dim gradient stops punch."},vibrance:{type:"float",default:1.645,min:0,max:1,step:.01,label:"Vibrance",description:"Chroma-aware saturation — boosts dull pixels without posterising already-vivid ones."}}},Bi=(i,e)=>{i.setParams({fluidStyle:_i(e.fluidStyle),toneMapping:Ii(e.toneMapping),exposure:e.exposure,vibrance:e.vibrance,bloomAmount:e.bloomAmount,bloomThreshold:e.bloomThreshold,aberration:e.aberration,refraction:e.refraction,refractSmooth:e.refractSmooth,refractRoughness:e.refractRoughness,caustics:e.caustics})},Se=_(["composite","julia","dye","velocity"],"Show",{optionLabels:{composite:"Mixed",julia:"Fractal"}}),Oi=Se.values,Ui=Se.fromIndex,pe=0,Gi={id:"composite",name:"Composite",category:"Look",tabConfig:{label:"Composite"},params:{show:{...Se.config,description:"What you see. The simulation runs the same either way. Mixed = fractal + dye + optional velocity overlay. Fractal = pure fractal, fluid hidden. Dye = fluid dye only (what the fractal wrote). Velocity = per-pixel velocity as a hue wheel."},juliaMix:{type:"float",default:.4,min:0,max:2,step:.01,label:"Julia mix",condition:{param:"show",eq:pe},description:"How much fractal color shows through in Mixed view."},dyeMix:{type:"float",default:2,min:0,max:2,step:.01,label:"Dye mix",condition:{param:"show",eq:pe},description:"How much fluid dye shows through in Mixed view."},velocityViz:{type:"float",default:.02,min:0,max:2,step:.01,label:"Velocity viz",condition:{param:"show",eq:pe},description:"Overlay velocity-hue on top of the composite. Diagnostic."}}},Ni=(i,e)=>{i.setParams({show:Ui(e.show),juliaMix:e.juliaMix,dyeMix:e.dyeMix,velocityViz:e.velocityViz})},G=(i,e)=>{if(typeof e!="string")return;const r=i.indexOf(e);return r>=0?r:void 0},oe=i=>i?{x:i[0],y:i[1]}:void 0,Vi=i=>i?{x:i[0],y:i[1],z:i[2]}:void 0,Hi=i=>{const e=globalThis.__store;if(!e){console.warn("[applyRefPreset] store not ready — window.__store is undefined");return}const r=e.getState(),t=i.params,o={},n=G(ge,t.kind);n!==void 0&&(o.kind=n),t.juliaC&&(o.juliaC=oe(t.juliaC)),t.center&&(o.center=oe(t.center)),t.zoom!==void 0&&(o.zoom=t.zoom),t.maxIter!==void 0&&(o.maxIter=t.maxIter),t.power!==void 0&&(o.power=t.power),Object.keys(o).length>0&&r.setJulia(o);const a={},s=G($t,t.forceMode);s!==void 0&&(a.forceMode=s),t.forceGain!==void 0&&(a.forceGain=t.forceGain),t.interiorDamp!==void 0&&(a.interiorDamp=t.interiorDamp),t.forceCap!==void 0&&(a.forceCap=t.forceCap),t.edgeMargin!==void 0&&(a.edgeMargin=t.edgeMargin),i.orbit?(a.orbitEnabled=i.orbit.enabled,a.orbitRadius=i.orbit.radius,a.orbitSpeed=i.orbit.speed):a.orbitEnabled=!1,r.setCoupling(a);const l={};t.vorticity!==void 0&&(l.vorticity=t.vorticity),t.vorticityScale!==void 0&&(l.vorticityScale=t.vorticityScale),t.dissipation!==void 0&&(l.dissipation=t.dissipation),t.pressureIters!==void 0&&(l.pressureIters=t.pressureIters),t.dyeInject!==void 0&&(l.dyeInject=t.dyeInject),t.dyeDissipation!==void 0&&(l.dyeDissipation=t.dyeDissipation),t.dyeChromaDecayHz!==void 0&&(l.dyeChromaDecayHz=t.dyeChromaDecayHz),t.dyeSaturationBoost!==void 0&&(l.dyeSaturationBoost=t.dyeSaturationBoost);const c=G(gi,t.dyeDecayMode);c!==void 0&&(l.dyeDecayMode=c),Object.keys(l).length>0&&r.setFluidSim(l);const u={},m=G(vi,t.colorMapping);m!==void 0&&(u.colorMapping=m),t.colorIter!==void 0&&(u.colorIter=t.colorIter),t.gradientRepeat!==void 0&&(u.gradientRepeat=t.gradientRepeat),t.gradientPhase!==void 0&&(u.gradientPhase=t.gradientPhase),t.trapCenter&&(u.trapCenter=oe(t.trapCenter)),t.trapRadius!==void 0&&(u.trapRadius=t.trapRadius),t.trapNormal&&(u.trapNormal=oe(t.trapNormal)),t.trapOffset!==void 0&&(u.trapOffset=t.trapOffset),t.stripeFreq!==void 0&&(u.stripeFreq=t.stripeFreq),t.interiorColor&&(u.interiorColor=Vi(t.interiorColor));const p=G(hi,t.dyeBlend);p!==void 0&&(u.dyeBlend=p),i.gradient&&(u.gradient=i.gradient),Object.keys(u).length>0&&r.setPalette(u);const T={enabled:!!t.collisionEnabled};i.collisionGradient&&(T.gradient=i.collisionGradient),r.setCollision(T);const w={},h=G(ki,t.fluidStyle);h!==void 0&&(w.fluidStyle=h);const M=G(ji,t.toneMapping);M!==void 0&&(w.toneMapping=M),t.exposure!==void 0&&(w.exposure=t.exposure),t.vibrance!==void 0&&(w.vibrance=t.vibrance),t.bloomAmount!==void 0&&(w.bloomAmount=t.bloomAmount),t.bloomThreshold!==void 0&&(w.bloomThreshold=t.bloomThreshold),t.aberration!==void 0&&(w.aberration=t.aberration),t.refraction!==void 0&&(w.refraction=t.refraction),t.refractSmooth!==void 0&&(w.refractSmooth=t.refractSmooth),t.caustics!==void 0&&(w.caustics=t.caustics),Object.keys(w).length>0&&r.setPostFx(w);const v={},b=G(Oi,t.show);b!==void 0&&(v.show=b),t.juliaMix!==void 0&&(v.juliaMix=t.juliaMix),t.dyeMix!==void 0&&(v.dyeMix=t.dyeMix),t.velocityViz!==void 0&&(v.velocityViz=t.velocityViz),Object.keys(v).length>0&&r.setComposite(v),t.paused!==void 0&&typeof r.setIsPaused=="function"&&r.setIsPaused(t.paused),t.accumulation!==void 0&&typeof r.setAccumulation=="function"&&r.setAccumulation(t.accumulation)},Ji=()=>d.jsxs("div",{className:"flex flex-col gap-3 py-2",children:[d.jsx("div",{className:"text-[10px] text-gray-500 leading-snug",children:"Each preset is a curated fractal ↔ fluid coupling. Applying one resets the grid and restores known params."}),d.jsx("div",{className:"grid grid-cols-2 gap-1",children:Li.map(i=>d.jsx("button",{type:"button",title:i.desc,onClick:()=>{var e;Hi(i),(e=ve.ref.current)==null||e.resetFluid()},className:"px-2 py-1 text-[10px] rounded border bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08] hover:border-cyan-500/40 transition-colors text-left",children:i.name},i.id))})]}),We=_(["paint","erase","stamp","smudge"],"Mode"),Xi=We.fromIndex,Ke=_(["rainbow","solid","gradient","velocity"],"Colour"),Zi=Ke.fromIndex,Wi={id:"brush",name:"Brush",category:"Input",tabConfig:{label:"Brush"},params:{mode:{...We.config,description:"What left-drag does on the canvas. Paint = dye + force; Erase subtracts dye; Stamp deposits dye only; Smudge pushes velocity without adding dye."},size:{type:"float",default:.15,min:.003,max:.4,step:.001,label:"Size (UV)",description:"Radius in UV units (0..1 across the canvas). B+drag the canvas to resize live."},hardness:{type:"float",default:0,min:0,max:1,step:.01,label:"Hardness",description:"0 = soft gaussian edge (airbrush). 1 = hard disc (stamp)."},strength:{type:"float",default:1,min:0,max:3,step:.01,label:"Strength",description:"Dye amount per splat. 0 = dry brush, 3 = saturated. Erase mode: how much dye each splat removes."},flow:{type:"float",default:50,min:0,max:200,step:.5,label:"Flow",condition:{or:[{param:"mode",eq:0},{param:"mode",eq:3}]},description:"How much of the pointer's velocity is injected into the force field. Low = delicate, 50 = paints, 200 = whip."},spacing:{type:"float",default:.005,min:0,max:.1,step:.001,label:"Spacing (UV)",condition:{param:"particleEmitter",bool:!1},description:"Minimum travel between splats along a drag. Low = smooth stroke, high = dotted trail."},colorMode:{...Ke.config,condition:{or:[{param:"mode",eq:0},{param:"mode",eq:2}]},description:"Where each splat gets its RGB. Gradient samples the palette; Solid uses the picker below; Rainbow cycles hue on its own clock."},solidColor:{type:"vec3",default:{x:1,y:1,z:1},min:0,max:1,step:.001,label:"Solid color",condition:{param:"colorMode",eq:1},description:"Explicit colour for Solid mode. Hue jitter still applies."},jitter:{type:"float",default:0,min:0,max:1,step:.01,label:"Hue jitter",condition:{and:[{param:"mode",neq:1},{param:"mode",neq:3}]},description:"Random hue wiggle per splat. 0 = exact colour, 1 = full hue wheel. Builds natural variation in long strokes. Stacks on rainbow/velocity mode too."},particleEmitter:{type:"boolean",default:!1,label:"Particle emitter",description:"Dragging spawns independent particles on their own layer. Each live particle flies with its own velocity / lifespan and acts as a mini brush — painting into the fluid with the selected mode at its own position."},particleRate:{type:"float",default:120,min:1,max:600,step:1,label:"Rate /s",condition:{param:"particleEmitter",bool:!0},description:"Particles emitted per second while dragging. Hard-capped at 300 live at once."},particleVelocity:{type:"float",default:.3,min:0,max:3,step:.01,label:"Velocity",condition:{param:"particleEmitter",bool:!0},description:"Initial speed in UV/sec. 0.3 = gentle spray, 2 = shotgun."},particleSpread:{type:"float",default:.35,min:0,max:1,step:.01,label:"Spread",condition:{param:"particleEmitter",bool:!0},description:"Angular spread around the drag direction. 0 = beam, 1 = full 360° burst."},particleGravity:{type:"float",default:0,min:-3,max:3,step:.01,label:"Gravity",condition:{param:"particleEmitter",bool:!0},description:"UV/sec² acceleration. Negative = falls down the canvas, positive = rises."},particleDrag:{type:"float",default:.6,min:0,max:4,step:.01,label:"Drag /s",condition:{param:"particleEmitter",bool:!0},description:"Air drag — 0 = ballistic (keeps speed), 2 = quickly slows, 4 = fast stop."},particleLifetime:{type:"float",default:1.2,min:.1,max:6,step:.05,label:"Lifetime",condition:{param:"particleEmitter",bool:!0},description:"Seconds before each particle is culled. Longer = more persistent streaks."},particleSizeScale:{type:"float",default:.35,min:.05,max:1.5,step:.01,label:"Size ×",condition:{param:"particleEmitter",bool:!0},description:"Per-particle stamp size as a fraction of the brush size. 0.35 = dabs a third of the brush."}}},je=96,Ki=(i,e)=>{const t=(e-Math.floor(e))*256,o=Math.floor(t)%256,n=(o+1)%256,a=t-Math.floor(t),s=i[o*4+0]*(1-a)+i[n*4+0]*a,l=i[o*4+1]*(1-a)+i[n*4+1]*a,c=i[o*4+2]*(1-a)+i[n*4+2]*a;return[s,l,c]},qi=16,J=new Map,Ie=new WeakMap;let $i=0;const Yi=i=>{const e=Ie.get(i);if(e!==void 0)return e;const r=`lut${$i++}`;return Ie.set(i,r),r},Qi=(i,e,r,t,o,n,a,s,l)=>`${i}|${e}|${r}|${t}|${Yi(o)}|${n}|${a}|${s[0]},${s[1]},${s[2]}|${l}`,er=(i,e,r,t,o,n,a,s,l)=>{const c=new ImageData(i,i),u=c.data,m=Math.round(s[0]*255),p=Math.round(s[1]*255),T=Math.round(s[2]*255),w=Math.round(l),h=Math.abs(l-w)<.01&&w>=2&&w<=8;for(let M=0;M<i;M++){const v=r+(M/i*2-1)*t;for(let b=0;b<i;b++){const R=e+(b/i*2-1)*t;let A=0,g=0,y=0;for(;y<je;y++){const P=A*A,L=g*g;if(P+L>16)break;let k,z;if(h){let B=A,O=g;for(let Q=1;Q<w;Q++){const te=B*A-O*g;O=B*g+O*A,B=te}k=B,z=O}else{const B=Math.sqrt(P+L),O=Math.atan2(g,A),Q=Math.pow(B,l),te=O*l;k=Q*Math.cos(te),z=Q*Math.sin(te)}A=k+R,g=z+v}const S=((i-1-M)*i+b)*4;if(y>=je)u[S+0]=m,u[S+1]=p,u[S+2]=T;else{const k=(y+1-Math.log2(Math.max(1e-6,.5*Math.log2(A*A+g*g))))*.05*n+a,[z,B,O]=Ki(o,k);u[S+0]=Math.round(z),u[S+1]=Math.round(B),u[S+2]=Math.round(O)}u[S+3]=255}}return c},tr=(i,e,r,t,o,n,a,s,l)=>{const c=Qi(i,e,r,t,o,n,a,s,l),u=J.get(c);if(u)return J.delete(c),J.set(c,u),u;const m=er(i,e,r,t,o,n,a,s,l);for(J.set(c,m);J.size>qi;){const p=J.keys().next().value;if(p===void 0)break;J.delete(p)}return m},ir=(()=>{const i=new Uint8Array(1024);for(let e=0;e<256;e++)i[e*4]=i[e*4+1]=i[e*4+2]=e,i[e*4+3]=255;return i})(),rr=({cx:i,cy:e,onChange:r,halfExtent:t=1.6,centerX:o=-.5,centerY:n=0,size:a=220,gradientLut:s,gradientRepeat:l=1,gradientPhase:c=0,interiorColor:u=[.04,.04,.06],power:m=2})=>{const p=C.useRef(null),T=C.useRef(null),w=C.useRef(!1);C.useEffect(()=>{const v=p.current;if(!v)return;const b=v.getContext("2d");if(!b)return;v.width=a,v.height=a;const A=tr(a,o,n,t,s??ir,l,c,u,m);T.current=A,b.putImageData(A,0,0),h()},[a,o,n,t,s,l,c,u[0],u[1],u[2],m]);const h=C.useCallback(()=>{const v=p.current;if(!v||!T.current)return;const b=v.getContext("2d");if(!b)return;b.putImageData(T.current,0,0);const R=(i-o)/t*.5+.5,A=(e-n)/t*.5+.5,g=R*a,y=(1-A)*a;b.strokeStyle="#fff",b.lineWidth=1,b.beginPath(),b.moveTo(g-8,y),b.lineTo(g-2,y),b.moveTo(g+2,y),b.lineTo(g+8,y),b.moveTo(g,y-8),b.lineTo(g,y-2),b.moveTo(g,y+2),b.lineTo(g,y+8),b.stroke(),b.strokeStyle="rgba(0,255,200,0.9)",b.beginPath(),b.arc(g,y,4,0,2*Math.PI),b.stroke()},[i,e,o,n,t,a]);C.useEffect(()=>{h()},[h]);const M=v=>{const b=p.current;if(!b)return;const R=b.getBoundingClientRect(),A=(v.clientX-R.left)/R.width,g=1-(v.clientY-R.top)/R.height,y=o+(A*2-1)*t,S=n+(g*2-1)*t;r(y,S)};return d.jsxs("div",{className:"flex flex-col gap-1",children:[d.jsx("div",{className:"text-[10px] text-gray-400 uppercase tracking-wide",children:"Pick Julia c"}),d.jsx("canvas",{ref:p,className:"rounded border border-white/10 cursor-crosshair",style:{width:a,height:a,imageRendering:"pixelated"},onPointerDown:v=>{w.current=!0,v.target.setPointerCapture(v.pointerId),M(v)},onPointerMove:v=>{w.current&&M(v)},onPointerUp:v=>{w.current=!1;try{v.target.releasePointerCapture(v.pointerId)}catch{}}}),d.jsxs("div",{className:"text-[10px] font-mono text-gray-500",children:["c = (",i.toFixed(4),", ",e.toFixed(4),")"]})]})},or=({sliceState:i,actions:e})=>{const r=i.juliaC??{x:-.36303304426511473,y:.16845183018751916},t=i.power??2,o=C.useMemo(()=>{},[]);return d.jsx(rr,{cx:r.x,cy:r.y,power:t,gradientLut:o,onChange:(n,a)=>e.setJulia({juliaC:{x:n,y:a}})})};ce.register("julia-c-picker",or);ce.register("preset-grid",Ji);I.register(Zt);I.register(Kt);I.register(ei);I.register(Ci);I.register(Si);I.register(Fi);I.register(zi);I.register(Gi);I.register(Wi);I.register(Pi);ot({version:1,id:"fluid-toy.tab-parity-restructure",apply:i=>(i!=null&&i.features&&(at(i,"dye","palette"),E(i,"palette.collisionEnabled","collision.enabled"),E(i,"palette.collisionPreview","collision.preview"),E(i,"palette.collisionGradient","collision.gradient"),E(i,"palette.collisionRepeat","collision.repeat"),E(i,"palette.collisionPhase","collision.phase"),E(i,"palette.dyeMix","composite.dyeMix"),E(i,"palette.dyeInject","fluidSim.dyeInject"),E(i,"palette.dyeDissipation","fluidSim.dyeDissipation"),E(i,"palette.dyeDecayMode","fluidSim.dyeDecayMode"),E(i,"palette.dyeChromaDecayHz","fluidSim.dyeChromaDecayHz"),E(i,"palette.dyeSaturationBoost","fluidSim.dyeSaturationBoost"),E(i,"fluidSim.forceMode","coupling.forceMode"),E(i,"fluidSim.forceGain","coupling.forceGain"),E(i,"fluidSim.interiorDamp","coupling.interiorDamp"),E(i,"fluidSim.forceCap","coupling.forceCap"),E(i,"fluidSim.edgeMargin","coupling.edgeMargin"),E(i,"orbit.enabled","coupling.orbitEnabled"),E(i,"orbit.radius","coupling.orbitRadius"),E(i,"orbit.speed","coupling.orbitSpeed"),i.features.orbit&&Object.keys(i.features.orbit).length===0&&delete i.features.orbit,E(i,"sceneCamera.center","julia.center"),E(i,"sceneCamera.zoom","julia.zoom"),i.features.sceneCamera&&Object.keys(i.features.sceneCamera).length===0&&delete i.features.sceneCamera),i)});const ar=()=>({mode:"idle",pointerId:-1,lastX:0,lastY:0,lastT:0,startX:0,startY:0,startCx:0,startCy:0,startCxLow:0,startCyLow:0,startZoom:1,zoomAnchorX:0,zoomAnchorY:0,zoomAnchorXLow:0,zoomAnchorYLow:0,zoomAnchorU:.5,zoomAnchorV:.5,rightDragged:!1,startBrushSize:.15}),sr=1e-5,qe=8,nr=1e-300,lr=5,cr=.002,ur=.005,dr=5,pr=.2,fe=256,fr=.5,V={b:!1,c:!1},hr=()=>{const i=document.activeElement;if(!i)return!1;const e=i.tagName;return e==="INPUT"||e==="TEXTAREA"||i.isContentEditable},mr=()=>{C.useEffect(()=>{const i=t=>{hr()||(t.code==="KeyB"&&(V.b=!0),t.code==="KeyC"&&(V.c=!0))},e=t=>{t.code==="KeyB"&&(V.b=!1),t.code==="KeyC"&&(V.c=!1)},r=()=>{V.b=!1,V.c=!1};return window.addEventListener("keydown",i),window.addEventListener("keyup",e),window.addEventListener("blur",r),()=>{window.removeEventListener("keydown",i),window.removeEventListener("keyup",e),window.removeEventListener("blur",r)}},[])},ee=(i,e)=>i?dr:e?pr:1,gr=(i,e,r)=>{const t=x(o=>o.openContextMenu);C.useEffect(()=>{const o=i.current;if(!o)return;const n=a=>{var T,w,h,M,v;a.preventDefault();const s=r.current;if(!s)return;if(s.rightDragged){s.rightDragged=!1;return}const l=x.getState(),c=(T=l.julia)==null?void 0:T.juliaC,u=!!((w=l.coupling)!=null&&w.orbitEnabled),m=!!((h=l.fluidSim)!=null&&h.paused),p=[{label:`Copy Julia c (${((M=c==null?void 0:c.x)==null?void 0:M.toFixed(3))??"?"}, ${((v=c==null?void 0:c.y)==null?void 0:v.toFixed(3))??"?"})`,action:()=>{var R;if(!c)return;const b=`${c.x.toFixed(6)}, ${c.y.toFixed(6)}`;(R=navigator.clipboard)==null||R.writeText(b).catch(()=>{})}},{label:m?"Resume Sim":"Pause Sim",action:()=>{l.setFluidSim({paused:!m})}},{label:u?"Stop Auto Orbit":"Start Auto Orbit",action:()=>{l.setCoupling({orbitEnabled:!u})}},{label:"Recenter View",action:()=>{l.setJulia({center:{x:0,y:0},zoom:1.5})}},{label:"Reset Fluid Fields",action:()=>{var b;(b=e.current)==null||b.resetFluid()}}];t(a.clientX,a.clientY,p,["ui.fluid-canvas"])};return o.addEventListener("contextmenu",n),()=>o.removeEventListener("contextmenu",n)},[i,e,r,t])},ne=(i,e)=>{const r=i+e,t=r-i,o=i-(r-t)+(e-t);return[r,o]},H=(i,e,r)=>{const[t,o]=ne(i,r),[n,a]=ne(t,e+o);return[n,a]},ke=(i,e,r,t)=>{const[o,n]=ne(i,-r),[a,s]=ne(o,n+(e-t));return[a,s]},xr=(i,e)=>{var o,n,a,s,l,c,u,m;const r=e.stateRef.current,t=x.getState();r.mode="pan-pending",r.startCx=((n=(o=t.julia)==null?void 0:o.center)==null?void 0:n.x)??0,r.startCy=((s=(a=t.julia)==null?void 0:a.center)==null?void 0:s.y)??0,r.startCxLow=((c=(l=t.julia)==null?void 0:l.centerLow)==null?void 0:c.x)??0,r.startCyLow=((m=(u=t.julia)==null?void 0:u.centerLow)==null?void 0:m.y)??0,r.rightDragged=!1,e.canvas.setPointerCapture(i.pointerId),e.handleInteractionStart("camera")},vr=(i,e)=>{var M,v;const r=e.stateRef.current,t=e.canvas.getBoundingClientRect();if(t.width<1||t.height<1)return;if(r.mode==="pan-pending"){if(Math.hypot(i.clientX-r.startX,i.clientY-r.startY)<=lr)return;r.mode="pan",r.rightDragged=!0}const n=((M=x.getState().julia)==null?void 0:M.zoom)??1.5,a=t.width/t.height,s=ee(i.shiftKey,i.altKey),l=i.clientX-r.startX,c=i.clientY-r.startY,u=-(l/t.width)*2*a*n*s,m=c/t.height*2*n*s,[p,T]=H(r.startCx,r.startCxLow,u),[w,h]=H(r.startCy,r.startCyLow,m);e.pendingViewRef.current={center:{x:p,y:w},centerLow:{x:T,y:h},zoom:n},(v=e.engineRef.current)==null||v.setParams({center:[p,w],centerLow:[T,h]}),r.lastX=i.clientX,r.lastY=i.clientY},$e=()=>{const i=x.getState().deepZoom;return i&&i.enabled?nr:sr},br=(i,e)=>{var M,v,b,R,A,g;i.preventDefault();const r=e.canvas.getBoundingClientRect();if(r.width<1||r.height<1)return;const t=e.stateRef.current,o=x.getState(),n=((M=o.julia)==null?void 0:M.center)??{x:0,y:0},a=((v=o.julia)==null?void 0:v.zoom)??1.5,s=(i.clientX-r.left)/r.width,l=1-(i.clientY-r.top)/r.height,c=r.width/r.height;t.mode="zoom",t.startZoom=a,t.zoomAnchorU=s,t.zoomAnchorV=l;const u=((R=(b=o.julia)==null?void 0:b.centerLow)==null?void 0:R.x)??0,m=((g=(A=o.julia)==null?void 0:A.centerLow)==null?void 0:g.y)??0,p=(s*2-1)*c*a,T=(l*2-1)*a,w=H(n.x,u,p),h=H(n.y,m,T);t.zoomAnchorX=w[0],t.zoomAnchorXLow=w[1],t.zoomAnchorY=h[0],t.zoomAnchorYLow=h[1],e.canvas.setPointerCapture(i.pointerId),e.handleInteractionStart("camera")},yr=(i,e)=>{var h;const r=e.stateRef.current,t=e.canvas.getBoundingClientRect();if(t.width<1||t.height<1)return;const o=ee(i.shiftKey,i.altKey),n=i.clientY-r.startY,a=Math.exp(n*ur*o),s=Math.max($e(),Math.min(qe,r.startZoom*a)),l=t.width/t.height,c=-(r.zoomAnchorU*2-1)*l*s,u=-(r.zoomAnchorV*2-1)*s,[m,p]=H(r.zoomAnchorX,r.zoomAnchorXLow,c),[T,w]=H(r.zoomAnchorY,r.zoomAnchorYLow,u);e.pendingViewRef.current={center:{x:m,y:T},centerLow:{x:p,y:w},zoom:s},(h=e.engineRef.current)==null||h.setParams({center:[m,T],centerLow:[p,w],zoom:s}),r.lastX=i.clientX,r.lastY=i.clientY},Tr=i=>{let e=null;return{onWheel:o=>{var S;o.preventDefault();const n=i.canvas.getBoundingClientRect();if(n.width<1||n.height<1)return;const a=i.pendingViewRef.current??(()=>{var L,k,z;const P=x.getState();return{center:((L=P.julia)==null?void 0:L.center)??{x:0,y:0},centerLow:((k=P.julia)==null?void 0:k.centerLow)??{x:0,y:0},zoom:((z=P.julia)==null?void 0:z.zoom)??1.5}})(),s=a.center,l=a.centerLow,c=a.zoom,u=ee(o.shiftKey,o.altKey),m=Math.pow(.9,-o.deltaY*cr*u),p=(o.clientX-n.left)/n.width,T=1-(o.clientY-n.top)/n.height,w=n.width/n.height,h=Math.max($e(),Math.min(qe,c*m)),M=c-h,v=(p*2-1)*w*M,b=(T*2-1)*M,[R,A]=H(s.x,l.x,v),[g,y]=H(s.y,l.y,b);i.pendingViewRef.current={center:{x:R,y:g},centerLow:{x:A,y},zoom:h},(S=i.engineRef.current)==null||S.setParams({center:[R,g],centerLow:[A,y],zoom:h}),e!==null&&window.clearTimeout(e),e=window.setTimeout(()=>{if(e=null,!i.pendingViewRef.current)return;const P=i.pendingViewRef.current;i.pendingViewRef.current=null,x.getState().setJulia({center:P.center,centerLow:P.centerLow,zoom:P.zoom})},100)},cleanup:()=>{e!==null&&window.clearTimeout(e)}}},Ee=()=>{const i=x.getState().brush;return{mode:Xi(i.mode),colorMode:Zi(i.colorMode),solidColor:[i.solidColor.x,i.solidColor.y,i.solidColor.z],gradientLut:W.ref.current.gradientLut,size:i.size,hardness:i.hardness,strength:i.strength,flow:i.flow,spacing:i.spacing,jitter:i.jitter,particleEmitter:i.particleEmitter,particleRate:i.particleRate,particleVelocity:i.particleVelocity,particleSpread:i.particleSpread,particleGravity:i.particleGravity,particleDrag:i.particleDrag,particleLifetime:i.particleLifetime,particleSizeScale:i.particleSizeScale}},wr=(i,e)=>{const r=e.stateRef.current;r.mode="splat",e.handleInteractionStart("param"),pi(W.ref.current.runtime),Z.ref.current.dragging=!0;const t=e.canvas.getBoundingClientRect();if(t.width<1||t.height<1||!e.engineRef.current)return;const o=(i.clientX-t.left)/t.width,n=1-(i.clientY-t.top)/t.height;Z.ref.current.uv={u:o,v:n},Z.ref.current.velUv=null,di(W.ref.current.runtime,{u:o,v:n,dvx:0,dvy:0,params:Ee(),engine:e.engineRef.current,wallClockMs:performance.now()})},Mr=(i,e)=>{const r=e.engineRef.current;if(!r)return;const t=e.stateRef.current,o=e.canvas.getBoundingClientRect();if(o.width<1||o.height<1)return;const n=performance.now(),a=Math.max(.001,(n-t.lastT)/1e3),s=i.clientX-t.lastX,l=i.clientY-t.lastY,c=(i.clientX-o.left)/o.width,u=1-(i.clientY-o.top)/o.height,m=s/o.width/a,p=-(l/o.height)/a,T=Math.hypot(s/o.width,l/o.height);W.ref.current.runtime.distSinceSplat+=T,Z.ref.current.uv={u:c,v:u},Z.ref.current.velUv={vx:m,vy:p},ui(W.ref.current.runtime,{u:c,v:u,dvx:m,dvy:p,params:Ee(),engine:r,wallClockMs:n}),t.lastX=i.clientX,t.lastY=i.clientY,t.lastT=n},Cr=(i,e)=>{var o,n,a,s;const r=e.stateRef.current,t=x.getState();r.mode="pick-c",r.startCx=((n=(o=t.julia)==null?void 0:o.juliaC)==null?void 0:n.x)??0,r.startCy=((s=(a=t.julia)==null?void 0:a.juliaC)==null?void 0:s.y)??0,e.canvas.setPointerCapture(i.pointerId),e.handleInteractionStart("param")},Ar=(i,e)=>{var p;const r=e.stateRef.current,t=e.canvas.getBoundingClientRect();if(t.width<1||t.height<1)return;const o=x.getState(),n=((p=o.julia)==null?void 0:p.zoom)??1.5,a=t.width/t.height,s=ee(i.shiftKey,i.altKey),l=i.clientX-r.startX,c=i.clientY-r.startY,u=l/t.width*2*a*n*s,m=-(c/t.height)*2*n*s;o.setJulia({juliaC:{x:r.startCx+u,y:r.startCy+m}}),r.lastX=i.clientX,r.lastY=i.clientY},Rr=(i,e)=>{var o;const r=e.stateRef.current,t=x.getState();r.mode="resize-brush",r.startBrushSize=((o=t.brush)==null?void 0:o.size)??.15,e.canvas.setPointerCapture(i.pointerId),e.handleInteractionStart("param")},Sr=(i,e)=>{const r=e.stateRef.current,t=x.getState(),o=ee(i.shiftKey,i.altKey),n=i.clientX-r.startX,a=Math.exp(n*.0033*o),s=Math.max(.003,Math.min(.4,r.startBrushSize*a));t.setBrush({size:s}),r.lastX=i.clientX,r.lastY=i.clientY},Er=(i,e,r,t)=>{const o=x(a=>a.handleInteractionStart),n=x(a=>a.handleInteractionEnd);C.useEffect(()=>{const a=i.current;if(!a||!r.current)return;const s={canvas:a,engineRef:e,pendingViewRef:t,stateRef:r,handleInteractionStart:o,handleInteractionEnd:n},l=p=>{const T=r.current;if(T.pointerId=p.pointerId,T.lastX=p.clientX,T.lastY=p.clientY,T.lastT=performance.now(),T.startX=p.clientX,T.startY=p.clientY,p.button===2)return xr(p,s);if(p.button===1)return br(p,s);if(p.button===0)return V.c?Cr(p,s):V.b?Rr(p,s):wr(p,s)},c=p=>{switch(r.current.mode){case"idle":return;case"pick-c":return Ar(p,s);case"resize-brush":return Sr(p,s);case"pan-pending":case"pan":return vr(p,s);case"zoom":return yr(p,s);case"splat":return Mr(p,s)}},u=p=>{const T=r.current;if(T.pointerId===p.pointerId){try{a.releasePointerCapture(p.pointerId)}catch{}T.pointerId=-1}if(t.current){const w=t.current;t.current=null,x.getState().setJulia({center:w.center,centerLow:w.centerLow,zoom:w.zoom})}T.mode="idle",Z.ref.current.dragging=!1,n()},m=Tr(s);return a.addEventListener("pointerdown",l),a.addEventListener("pointermove",c),a.addEventListener("pointerup",u),a.addEventListener("pointercancel",u),a.addEventListener("pointerleave",u),a.addEventListener("wheel",m.onWheel,{passive:!1}),()=>{a.removeEventListener("pointerdown",l),a.removeEventListener("pointermove",c),a.removeEventListener("pointerup",u),a.removeEventListener("pointercancel",u),a.removeEventListener("pointerleave",u),a.removeEventListener("wheel",m.onWheel),m.cleanup()}},[i,e,r,t,o,n])},Fr=({canvasRef:i,engineRef:e})=>{const r=C.useRef(ar()),t=C.useRef(null);return mr(),gr(i,e,r),Er(i,e,r,t),null},Dr=()=>{const i=I.getViewportOverlays().filter(e=>e.type==="dom");return d.jsx("div",{className:"absolute inset-0 pointer-events-none z-[20]",children:i.map(e=>{const r=ce.get(e.componentId);return r?d.jsx(Pr,{cfg:e,Component:r},e.id):null})})},Pr=({cfg:i,Component:e})=>{const r=x(o=>o[i.id]);if(!r)return null;const t=x.getState();return d.jsx(e,{featureId:i.id,sliceState:r,actions:t})},Ye={orbitLength:0,precisionBits:0,orbitBuildMs:0,laStageCount:0,laCount:0,laBuildMs:0,laStagesPerLevel:[],juliaMs:0};let Y=Ye;const le=new Set,Qe=i=>{Y=i,le.forEach(e=>e(i))},Lr=i=>{Math.abs(Y.juliaMs-i)<.05||(Y={...Y,juliaMs:i},le.forEach(e=>e(Y)))},jr=()=>{Qe(Ye)},Ir=()=>{const[i,e]=C.useState(Y);return C.useEffect(()=>(le.add(e),()=>{le.delete(e)}),[]),i},kr=()=>{const i=x(l=>{var c;return((c=l.julia)==null?void 0:c.zoom)??1}),e=x(l=>{var c,u;return((u=(c=l.julia)==null?void 0:c.center)==null?void 0:u.x)??0}),r=x(l=>{var c,u;return((u=(c=l.julia)==null?void 0:c.center)==null?void 0:u.y)??0}),t=Ir(),o=i>0?Math.log10(i):0,n=i>0?`1e${o.toFixed(2)} (${i.toExponential(2)})`:"invalid",a=t.laCount>0,s=t.laStagesPerLevel.length>0?t.laStagesPerLevel.join(","):"—";return d.jsxs("div",{style:{fontSize:"10.5px",lineHeight:"1.5",fontFamily:'ui-monospace, "SF Mono", Menlo, monospace',color:"#9ca3af",padding:"6px 8px",background:"rgba(255,255,255,0.03)",borderRadius:"4px",margin:"4px 0"},children:[d.jsxs("div",{children:["zoom: ",d.jsx("span",{style:{color:"#e5e7eb"},children:n})]}),d.jsxs("div",{children:["centre: ",d.jsxs("span",{style:{color:"#e5e7eb"},children:["(",e.toExponential(3),", ",r.toExponential(3),")"]})]}),t.orbitLength>0&&d.jsxs("div",{children:["orbit: ",d.jsx("span",{style:{color:"#e5e7eb"},children:t.orbitLength})," iters @ ",t.precisionBits,"b (",t.orbitBuildMs.toFixed(0),"ms)"]}),a&&d.jsxs("div",{children:["LA: ",d.jsx("span",{style:{color:"#e5e7eb"},children:t.laStageCount})," stages, ",d.jsx("span",{style:{color:"#e5e7eb"},children:t.laCount})," nodes [",s,"] (",t.laBuildMs.toFixed(0),"ms)"]}),t.juliaMs>0&&d.jsxs("div",{children:["GPU: ",d.jsxs("span",{style:{color:"#e5e7eb"},children:[t.juliaMs.toFixed(2),"ms"]})," per Julia pass (~",Math.round(1e3/Math.max(.1,t.juliaMs))," fps)"]})]})},se=i=>new Promise(e=>{let r=0;const t=()=>{r++,r>=i?e():requestAnimationFrame(t)};requestAnimationFrame(t)}),_r=i=>{if(i.length===0)return 0;const e=[...i].sort((r,t)=>r-t);return e[Math.floor(e.length/2)]},et=[{name:"standard / shallow",center:[-.81,-.054],zoom:1.29,iter:310,deep:!1,useLA:!1,useAT:!1},{name:"deep shallow / no LA / no AT",center:[-.81,-.054],zoom:1.29,iter:1e3,deep:!0,useLA:!1,useAT:!1},{name:"deep shallow / LA",center:[-.81,-.054],zoom:1.29,iter:1e3,deep:!0,useLA:!0,useAT:!1},{name:"deep shallow / LA + AT",center:[-.81,-.054],zoom:1.29,iter:1e3,deep:!0,useLA:!0,useAT:!0},{name:"deep 1e-5 / no LA / no AT",center:[-.81,-.054],zoom:1e-5,iter:2e3,deep:!0,useLA:!1,useAT:!1},{name:"deep 1e-5 / LA",center:[-.81,-.054],zoom:1e-5,iter:2e3,deep:!0,useLA:!0,useAT:!1},{name:"deep 1e-5 / LA + AT",center:[-.81,-.054],zoom:1e-5,iter:2e3,deep:!0,useLA:!0,useAT:!0},{name:"deep 1e-10 / no LA / no AT",center:[-.81,-.054],zoom:1e-10,iter:5e3,deep:!0,useLA:!1,useAT:!1},{name:"deep 1e-10 / LA",center:[-.81,-.054],zoom:1e-10,iter:5e3,deep:!0,useLA:!0,useAT:!1},{name:"deep 1e-10 / LA + AT",center:[-.81,-.054],zoom:1e-10,iter:5e3,deep:!0,useLA:!0,useAT:!0},{name:"deep 1e-10 / 20k iter / LA+AT",center:[-.81,-.054],zoom:1e-10,iter:2e4,deep:!0,useLA:!0,useAT:!0}],zr=async(i,e,r,t=3e3)=>{if(!r){await se(20);return}const o=performance.now();for(;performance.now()-o<t;){if(i.getJuliaMs()>0){await se(15);return}await se(5)}},Br=async(i,e,r)=>{const t=i.getState();t.setJulia({center:{x:r.center[0],y:r.center[1]},zoom:r.zoom}),t.setDeepZoom({enabled:r.deep,useLA:r.useLA,useAT:r.useAT,deepMaxIter:r.iter}),await zr(e,r.iter,r.deep)},Or=async(i,e,r=et,t)=>{const o=[],n=i,a=e.getState();a.accumulation,n.setForceFluidPaused(!0),n.setParams({tsaa:!1,tsaaPerFrameSamples:1}),a.setAccumulation&&a.setAccumulation(!1);try{for(let s=0;s<r.length;s++){const l=r[s];t==null||t(s,r.length,l),await Br(e,i,l);const c=[];for(let p=0;p<30;p++){await se(1);const T=i.getJuliaMs();T>0&&c.push(T)}const u=_r(c),m=c.length>0?Math.min(...c):0;o.push({...l,juliaMs:u,juliaMsMin:m,samples:c,timerOk:c.length>0,orbitLength:0,laStageCount:0,laCount:0,atEngaged:!1})}}finally{n.setForceFluidPaused(!1),n.setParams({tsaa:!0,tsaaPerFrameSamples:1}),a.setAccumulation&&a.setAccumulation(!0)}return o},Ur=i=>{const e="| Case | Iter | Deep | LA | AT | Julia ms | min ms |",r="|------|------|------|----|----|---------|--------|",t=i.map(o=>{const n=o.timerOk?o.juliaMs.toFixed(2):"—",a=o.timerOk?o.juliaMsMin.toFixed(2):"—";return`| ${o.name} | ${o.iter} | ${o.deep?"✓":""} | ${o.useLA?"✓":""} | ${o.useAT?"✓":""} | ${n} | ${a} |`});return[e,r,...t].join(`
`)},Gr=i=>{const e=[],r=o=>`${o.zoom}|${o.iter}|${o.deep}`,t=new Map;for(const o of i){const n=r(o);t.has(n)||t.set(n,[]),t.get(n).push(o)}for(const[o,n]of t){const a=n.find(c=>!c.useLA&&!c.useAT),s=n.find(c=>c.useLA&&!c.useAT),l=n.find(c=>c.useLA&&c.useAT);if(!(!a||a.juliaMs===0)){if(s&&s.juliaMs>0){const c=a.juliaMs/s.juliaMs;e.push(`${o}: LA speedup = ${c.toFixed(2)}×`)}if(l&&l.juliaMs>0){const c=a.juliaMs/l.juliaMs;e.push(`${o}: LA+AT speedup = ${c.toFixed(2)}×`)}}}return e},N={padding:"2px 6px",borderBottom:"1px solid rgba(255,255,255,0.08)",whiteSpace:"nowrap"},X={...N,fontWeight:600,color:"#cbd5e1",borderBottom:"1px solid rgba(255,255,255,0.2)"},Nr=({engineRef:i})=>{const[e,r]=C.useState(!1),[t,o]=C.useState({i:0,total:0,name:""}),[n,a]=C.useState(null),s=async()=>{const l=i.current;if(!(!l||e)){r(!0),a(null);try{const c=await Or(l,x,et,(p,T,w)=>{o({i:p,total:T,name:w.name})});a(c);const u=Ur(c),m=Gr(c);console.log(`[deepZoom bench]
`+u),m.length>0&&console.log(`[deepZoom bench]
`+m.join(`
`))}finally{r(!1)}}};return d.jsxs("div",{style:{fontSize:"10.5px",lineHeight:"1.5",fontFamily:'ui-monospace, "SF Mono", Menlo, monospace',color:"#9ca3af",padding:"6px 8px",background:"rgba(255,255,255,0.03)",borderRadius:"4px",margin:"4px 0",pointerEvents:"auto",maxWidth:480},children:[d.jsx("button",{onClick:()=>{s()},disabled:e||i.current===null,style:{fontFamily:"inherit",fontSize:"inherit",padding:"4px 10px",background:e?"#444":"#1f6feb",color:"white",border:"none",borderRadius:3,cursor:e?"wait":"pointer"},children:e?`Running ${t.i+1}/${t.total}: ${t.name}`:"Run perf benchmark"}),n&&d.jsxs("div",{style:{marginTop:8,overflow:"auto",maxHeight:320},children:[d.jsxs("table",{style:{borderCollapse:"collapse",fontSize:"10.5px"},children:[d.jsx("thead",{children:d.jsxs("tr",{children:[d.jsx("th",{style:X,children:"Case"}),d.jsx("th",{style:X,children:"Iter"}),d.jsx("th",{style:X,children:"D"}),d.jsx("th",{style:X,children:"LA"}),d.jsx("th",{style:X,children:"AT"}),d.jsx("th",{style:X,children:"ms (med)"}),d.jsx("th",{style:X,children:"min"})]})}),d.jsx("tbody",{children:n.map((l,c)=>d.jsxs("tr",{children:[d.jsx("td",{style:N,children:l.name}),d.jsx("td",{style:N,children:l.iter}),d.jsx("td",{style:N,children:l.deep?"✓":""}),d.jsx("td",{style:N,children:l.useLA?"✓":""}),d.jsx("td",{style:N,children:l.useAT?"✓":""}),d.jsx("td",{style:{...N,color:"#e5e7eb",textAlign:"right"},children:l.timerOk?l.juliaMs.toFixed(2):"—"}),d.jsx("td",{style:{...N,textAlign:"right"},children:l.timerOk?l.juliaMsMin.toFixed(2):"—"})]},c))})]}),d.jsx("div",{style:{marginTop:4,color:"#94a3b8"},children:n.some(l=>!l.timerOk)?"(— = GPU timer unavailable on this device)":"Open devtools console for markdown + speedup ratios."})]})]})},Vr=`
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
`,ue=`
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
`,F=`#version 300 es
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
}`,Hr=`
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
`,Jr=`
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
`,Xr=`#version 300 es
precision highp float;
in vec2 vUv;
layout(location=0) out vec4 outMain;
layout(location=1) out vec4 outAux;

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

${Hr}
${Jr}

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

  vec4 accM = vec4(0.0);
  vec4 accA = vec4(0.0);

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
    vec2 uvJ = vUv + jitter * invRes;

    vec4 sM, sA;
    evalJulia(uvJ, sM, sA);
    accM += sM;
    accA += sA;
  }

  float invK = 1.0 / float(K);
  outMain = accM * invK;
  outAux  = accA * invK;
}`,Zr=`#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL, vR, vT, vB;
out vec4 fragColor;

uniform sampler2D uJulia;
uniform sampler2D uJuliaPrev;
uniform sampler2D uJuliaAux;
uniform sampler2D uGradient;
uniform sampler2D uMask;
uniform vec2  uTexel;
uniform int   uMode;
uniform float uGain;
uniform float uDt;
uniform float uInteriorDamp;  // 0..1 : how much to damp inside the set (escaped=0)
uniform float uDyeGain;       // multiplier for dye injection from fractal color
uniform int   uColorMapping;
uniform float uGradientRepeat;
uniform float uGradientPhase;
uniform float uEdgeMargin;    // 0..0.25 : force fade-to-zero margin near sim boundaries
uniform float uForceCap;      // absolute clamp on final force magnitude (per-pixel)
${ue}

void main() {
  vec4 c  = texture(uJulia, vUv);
  vec4 l  = texture(uJulia, vL);
  vec4 r  = texture(uJulia, vR);
  vec4 t  = texture(uJulia, vT);
  vec4 b  = texture(uJulia, vB);
  vec4 cp = texture(uJuliaPrev, vUv);

  float smoothI = c.b;
  float escaped = c.a;

  // gradient of smooth iteration count (finite diff)
  vec2 grad = vec2(r.b - l.b, t.b - b.b) * 0.5;

  vec2 force = vec2(0.0);
  vec3 injectColor = vec3(0.0);

  if (uMode == 0) {
    // Outward burst: normalize gradient; magnitude = min(|grad|, 1)
    float g = length(grad);
    force = (g > 1e-6) ? grad / g : vec2(0.0);
    force *= clamp(g * 0.6, 0.0, 1.5);
  } else if (uMode == 1) {
    // Divergence-free: perp of gradient — swirls along level sets
    vec2 perp = vec2(-grad.y, grad.x);
    float g = length(perp);
    force = (g > 1e-6) ? perp / g : vec2(0.0);
    force *= clamp(g * 0.8, 0.0, 1.8);
  } else if (uMode == 2) {
    // Final iterate direction (Böttcher flow): use z normalized, weighted by escape speed
    vec2 z = c.rg;
    float zm = length(z);
    vec2 dir = (zm > 1e-6) ? z / zm : vec2(0.0);
    // grow rate proxy: smoothI delta vs neighbor = "how fast are we escaping here"
    float g = length(grad);
    force = dir * clamp(g * 0.8, 0.0, 2.0);
  } else if (uMode == 3) {
    // C-Track: temporal derivative — how did this pixel's fractal identity shift
    // between the previous c and the current c? That delta direction IS a motion
    // vector that follows the Julia deformation.
    vec2 dz = c.rg - cp.rg;
    float ds = c.b - cp.b;
    // combine: direction from z-delta weighted by smooth-iter delta
    float mm = length(dz);
    vec2 dir = (mm > 1e-6) ? dz / mm : vec2(0.0);
    force = dir * clamp(mm * 3.0 + abs(ds) * 0.2, 0.0, 3.0);
    // Clamp 1/dt so tiny frames don't blow up the c-track magnitude.
    force *= clamp(1.0 / max(uDt, 0.016), 0.0, 40.0);
  } else if (uMode == 4) {
    // Hue flow: treat rendered palette color as vector field
    vec4 aux = texture(uJuliaAux, vUv);
    vec3 col = gradientForJulia(c, aux);
    float hueAngle = atan(col.g - col.b, col.r - 0.5);
    float val = length(col);
    force = vec2(cos(hueAngle), sin(hueAngle)) * val;
  }

  // Optionally damp inside the set (escaped = 0) — the interior is a "still lake"
  float damp = mix(1.0 - uInteriorDamp, 1.0, escaped);
  force *= damp;

  // Edge fade: prevents boundary artefacts from the pressure-Jacobi solve
  // reading clamped-edge neighbours. Tapers force to 0 in a thin margin.
  float dEdge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  float edgeFade = (uEdgeMargin <= 0.0) ? 1.0 : smoothstep(0.0, uEdgeMargin, dEdge);
  force *= edgeFade;

  // Per-pixel magnitude cap — stops fast c-moves from spawning impulses that dominate.
  float fMag = length(force);
  if (fMag > uForceCap && fMag > 1e-6) {
    force *= uForceCap / fMag;
  }

  // Dye injection: a bit of the Julia-escape color bleeds into the fluid dye.
  // Edge-faded so the border doesn't paint itself in.
  {
    vec4 auxHere = texture(uJuliaAux, vUv);
    injectColor = gradientForJulia(c, auxHere) * escaped * uDyeGain * edgeFade;
  }

  // Solid obstacles emit no force into the fluid (and carry no dye injection).
  float solid = texture(uMask, vUv).r;
  force *= (1.0 - solid);
  injectColor *= (1.0 - solid);

  fragColor = vec4(force * uGain, injectColor.r, injectColor.g + injectColor.b * 0.5);
}`,Wr=`#version 300 es
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
  float solid = texture(uMask, vUv).r;
  fragColor = vec4((v + f * uDt) * (1.0 - solid), 0.0, 1.0);
}`,Kr=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uDye;
uniform sampler2D uJulia;
uniform sampler2D uJuliaAux;
uniform sampler2D uGradient;
uniform sampler2D uMask;
uniform float uDyeGain;
uniform float uDyeFadeHz;
uniform float uDt;
uniform int   uColorMapping;
uniform float uGradientRepeat;
uniform float uGradientPhase;
uniform float uEdgeMargin;
uniform int   uDyeBlend;        // 0 add, 1 screen, 2 max, 3 over (alpha)
uniform int   uDyeDecayMode;    // 0 linear, 1 perceptual (OKLab L-decay), 2 vivid (chroma-boost)
uniform float uDyeChromaFadeHz; // per-second chroma decay rate (perceptual / vivid only)
uniform float uDyeSatBoost;     // per-frame chroma multiplier applied after decay
${ue}
${Vr}

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
  vec4 d = texture(uDye, vUv);
  vec4 j = texture(uJulia, vUv);
  vec4 a = texture(uJuliaAux, vUv);
  vec4 grad = gradientForJuliaRgba(j, a);        // RGBA — α is the per-stop alpha from the editor
  float dEdge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  float edgeFade = (uEdgeMargin <= 0.0) ? 1.0 : smoothstep(0.0, uEdgeMargin, dEdge);

  // Base amount of colour to introduce this frame at this pixel.
  // j.a gates on "escaped", grad.a gates on gradient-stop alpha, edgeFade/etc on borders.
  float rate = j.a * uDyeGain * uDt * edgeFade * grad.a;
  vec3 injectAdd = grad.rgb * rate;
  vec3 aged      = decayDye(d.rgb);           // dye after this frame's dissipation, in chosen colour space
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
    // Over (alpha-compositing): uses grad.α + rate to mask the new colour onto old.
    float a = clamp(rate * 8.0, 0.0, 1.0);   // scale so "rate" reads like a visible alpha
    col = aged * (1.0 - a) + grad.rgb * a;
  }

  // Solid obstacles: no dye inside — they're walls, not flowing medium.
  float solid = texture(uMask, vUv).r;
  col *= (1.0 - solid);

  fragColor = vec4(col, 1.0);
}`,qr=`#version 300 es
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
  float solid = texture(uMask, vUv).r;
  fragColor = val * decay * edgeFade * (1.0 - solid);
}`,$r=`#version 300 es
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
}`,Yr=`#version 300 es
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
}`,Qr=`#version 300 es
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
}`,eo=`#version 300 es
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
}`,to=`#version 300 es
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
  float solid = texture(uMask, vUv).r;
  fragColor = vec4(v * (1.0 - solid), 0.0, 1.0);
}`,io=`#version 300 es
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
}`,ro=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uJulia;
uniform sampler2D uJuliaAux;
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
${ue}

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

  // ── Refracted fractal sample. With uRefractRoughness > 0 we
  // scatter the sample across an 8-tap Vogel-disc kernel (golden-
  // angle spiral — even disc coverage at small N, no clumping).
  // Each tap is gradient-mapped INDIVIDUALLY before averaging,
  // because averaging raw j/aux at the fractal boundary gives
  // meaningless intermediate iterations (same reasoning as the
  // K-sample loop in the Julia shader). Per-tap colours blend
  // cleanly. The mask (wall solid) also reads the same kernel so
  // walls get the same frosted-glass blur, keeping their edges
  // consistent with the refracted fractal behind them. Dye and
  // velocity stay sharp — they're "near-surface" and shouldn't
  // pick up glass-roughness blur.
  vec2 refractedBase = uv + refractOffset;
  vec3 juliaColor;
  vec3 wallColor;        // gradient colour at refracted UV — used for solid-wall override below
  float solid;
  {
    vec4 j = texture(uJulia, refractedBase);
    vec4 aux = texture(uJuliaAux, refractedBase);
    vec3 grad = gradientForJulia(j, aux);
    juliaColor = mix(uInteriorColor, grad * j.a, j.a);
    wallColor = grad;
    solid = texture(uMask, refractedBase).r;
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
        vec4 j_t = texture(uJulia, refractedBase + ofs);
        vec4 a_t = texture(uJuliaAux, refractedBase + ofs);
        vec3 grad_t = gradientForJulia(j_t, a_t);
        cAcc += mix(uInteriorColor, grad_t * j_t.a, j_t.a);
        wAcc += grad_t;
        sAcc += texture(uMask, refractedBase + ofs).r;
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
}`,oo=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uJulia;
uniform sampler2D uJuliaAux;
uniform sampler2D uGradient;            // main gradient (needed for helper symbol linkage)
uniform sampler2D uCollisionGradient;   // user-authored B&W LUT: black = fluid, white = wall
uniform int   uColorMapping;
// Main-gradient repeat/phase are also uniforms of this program because
// the shared GRADIENT_SAMPLE_GLSL helper references them — they're
// kept in sync with the dye panel so colorMappingT() stays canonical.
uniform float uGradientRepeat;
uniform float uGradientPhase;
// Collision-specific repeat/phase — independent of the dye gradient.
// User can tile the wall pattern at a different density from the dye
// palette, or phase-shift it to place walls where the dye doesn't go.
uniform float uCollisionRepeat;
uniform float uCollisionPhase;
${ue}
void main() {
  vec4 j = texture(uJulia, vUv);
  vec4 a = texture(uJuliaAux, vUv);
  // Same mapping → t pipeline the main gradient uses, so walls track colour-mapping
  // changes exactly (angle / orbit trap / stripe / bands / whatever). Then the
  // collision knobs remap t before the LUT lookup so walls can have their own tiling.
  float t0 = colorMappingT(j, a);
  float t = fract(t0 * uCollisionRepeat + uCollisionPhase);
  vec4 m = texture(uCollisionGradient, vec2(t, 0.5));
  float mask = dot(m.rgb, vec3(0.299, 0.587, 0.114));  // b&w → luma; also works if user uses colour
  // Interior points aren't walls (no escape → no fluid-side colour to collide with).
  mask *= j.a;
  fragColor = vec4(clamp(mask, 0.0, 1.0), 0.0, 0.0, 1.0);
}`,ao=`#version 300 es
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
}`,so=`#version 300 es
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
}`,no=`#version 300 es
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
}`,lo=`#version 300 es
precision highp float;
in vec2 vUv;
layout(location=0) out vec4 outMain;
layout(location=1) out vec4 outAux;

uniform sampler2D uCurrentMain;
uniform sampler2D uCurrentAux;
uniform sampler2D uHistoryMain;
uniform sampler2D uHistoryAux;
uniform int uSampleIndex;

void main() {
    vec4 curMain = texture(uCurrentMain, vUv);
    vec4 curAux  = texture(uCurrentAux,  vUv);
    // Frame-1 safety: when uSampleIndex is 1 the history texture hasn't
    // been written yet (MRT FBOs allocate with undefined contents in
    // WebGL2 — some drivers return NaN for RGBA16F). Skip the history
    // read entirely and just pass the current sample through.
    if (uSampleIndex <= 1) {
        outMain = curMain;
        outAux  = curAux;
        return;
    }
    vec4 histMain = texture(uHistoryMain, vUv);
    vec4 histAux  = texture(uHistoryAux,  vUv);
    float w = 1.0 / float(uSampleIndex);
    outMain = mix(histMain, curMain, w);
    outAux  = mix(histAux,  curAux,  w);
}`,co=`#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec4 uValue;
void main() { fragColor = uValue; }`,uo=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSource;
void main() { fragColor = texture(uSource, vUv); }`,po=`#version 300 es
precision highp float;
in vec2 vUv;
layout(location=0) out vec4 outMain;
layout(location=1) out vec4 outAux;
uniform sampler2D uSourceMain;
uniform sampler2D uSourceAux;
void main() {
  outMain = texture(uSourceMain, vUv);
  outAux  = texture(uSourceAux,  vUv);
}`,fo=`#version 300 es
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
}`,ho=(i,e="/blueNoise.png",r)=>{const t=i.createTexture();if(!t)throw new Error("[createBlueNoiseWebGL2] failed to allocate texture");i.bindTexture(i.TEXTURE_2D,t),i.texImage2D(i.TEXTURE_2D,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,new Uint8Array([128,128,128,128])),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.REPEAT),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.REPEAT);let o=[64,64];const n=new Image;return n.crossOrigin="anonymous",n.onload=()=>{i.isContextLost()||!i.isTexture(t)||(i.bindTexture(i.TEXTURE_2D,t),i.texImage2D(i.TEXTURE_2D,0,i.RGBA,i.RGBA,i.UNSIGNED_BYTE,n),o=[n.naturalWidth,n.naturalHeight])},n.onerror=a=>{console.warn("[createBlueNoiseWebGL2] failed to load",e,a)},n.src=e,{texture:t,getResolution:()=>o}},he=i=>{if(!Number.isFinite(i)||i===0)return[0,0];const e=Math.floor(Math.log2(Math.abs(i)));return[i/Math.pow(2,e),e]},_e=(i,e,r,t)=>{r&&(i.activeTexture(i.TEXTURE0+e),i.bindTexture(i.TEXTURE_2D,r),i.uniform1i(t,e))};class mo{constructor(e){f(this,"refOrbitTex",null);f(this,"refOrbitTexW",2048);f(this,"refOrbitTexH",0);f(this,"refOrbitLen",0);f(this,"refOrbitCenter",[0,0]);f(this,"refOrbitCenterLow",[0,0]);f(this,"laTableTex",null);f(this,"laTableTexW",1024);f(this,"laTableTexH",0);f(this,"laTotalCount",0);f(this,"laStages",new Float32Array(0));f(this,"laStageCount",0);f(this,"laEnabled",!1);f(this,"atPayload",null);f(this,"version",0);this.gl=e}hasOrbit(){return this.refOrbitTex!==null&&this.refOrbitLen>1}setReferenceOrbit(e,r,t,o=[0,0]){this.refOrbitCenter=[t[0],t[1]],this.refOrbitCenterLow=[o[0],o[1]],this.uploadOrbitTexture(e,r),this.refOrbitLen=r,this.version++}clearReferenceOrbit(){this.refOrbitLen=0,this.version++}setLATable(e,r,t){this.uploadLaTexture(e,r),this.laTotalCount=r,this.laStages=t,this.laStageCount=t.length/2,this.version++}setLAEnabled(e){this.laEnabled=e}clearLATable(){this.laTotalCount=0,this.laStages=new Float32Array(0),this.laStageCount=0,this.version++}setAT(e){this.atPayload=e,this.version++}clearAT(){this.atPayload!==null&&(this.atPayload=null,this.version++)}bindUniforms(e,r,t){const o=this.gl,n=r.deepZoomEnabled&&this.hasOrbit();o.uniform1i(e.uniforms.uDeepZoomEnabled,n?1:0),o.uniform1i(e.uniforms.uRefOrbitTexW,this.refOrbitTexW),o.uniform1i(e.uniforms.uRefOrbitLen,this.refOrbitLen);const a=ke(r.center[0],r.centerLow[0],this.refOrbitCenter[0],this.refOrbitCenterLow[0]),s=ke(r.center[1],r.centerLow[1],this.refOrbitCenter[1],this.refOrbitCenterLow[1]),l=a[0]+a[1],c=s[0]+s[1],u=he(l),m=he(c);o.uniform4f(e.uniforms.uDeepCenterOffset,u[0],u[1],m[0],m[1]);const p=he(r.zoom);o.uniform2f(e.uniforms.uDeepScale,p[0],p[1]),_e(o,6,this.refOrbitTex??t,e.uniforms.uRefOrbit);const T=n&&this.laEnabled&&this.laTableTex!==null&&this.laTotalCount>1;if(o.uniform1i(e.uniforms.uLAEnabled,T?1:0),o.uniform1i(e.uniforms.uLATexW,this.laTableTexW),o.uniform1i(e.uniforms.uLATotalCount,this.laTotalCount),o.uniform1i(e.uniforms.uLAStageCount,this.laStageCount),this.laStageCount>0){const h=Math.min(this.laStageCount,64),M=new Float32Array(h*4);for(let v=0;v<h;v++)M[v*4+0]=this.laStages[v*2+0],M[v*4+1]=this.laStages[v*2+1];o.uniform4fv(e.uniforms["uLAStages[0]"],M)}_e(o,7,this.laTableTex??t,e.uniforms.uLATable);const w=n&&this.atPayload!==null;o.uniform1i(e.uniforms.uATEnabled,w?1:0),this.atPayload?(o.uniform1i(e.uniforms.uATStepLength,this.atPayload.stepLength),o.uniform1f(e.uniforms.uATThresholdC,this.atPayload.thresholdC),o.uniform1f(e.uniforms.uATSqrEscapeRadius,this.atPayload.sqrEscapeRadius),o.uniform2f(e.uniforms.uATRefC,this.atPayload.refC[0],this.atPayload.refC[1]),o.uniform2f(e.uniforms.uATCCoeff,this.atPayload.ccoeff[0],this.atPayload.ccoeff[1]),o.uniform2f(e.uniforms.uATInvZCoeff,this.atPayload.invZCoeff[0],this.atPayload.invZCoeff[1])):(o.uniform1i(e.uniforms.uATStepLength,1),o.uniform1f(e.uniforms.uATThresholdC,0),o.uniform1f(e.uniforms.uATSqrEscapeRadius,4),o.uniform2f(e.uniforms.uATRefC,0,0),o.uniform2f(e.uniforms.uATCCoeff,1,0),o.uniform2f(e.uniforms.uATInvZCoeff,1,0))}dispose(){const e=this.gl;this.refOrbitTex&&(e.deleteTexture(this.refOrbitTex),this.refOrbitTex=null),this.laTableTex&&(e.deleteTexture(this.laTableTex),this.laTableTex=null)}uploadOrbitTexture(e,r){const t=this.gl,o=this.refOrbitTexW,n=Math.max(1,Math.ceil(r/o)),a=o*n*4,s=e.length>=a?e.subarray(0,a):(()=>{const l=new Float32Array(a);return l.set(e),l})();this.refOrbitTex||(this.refOrbitTex=ze(t),this.refOrbitTexH=0),t.bindTexture(t.TEXTURE_2D,this.refOrbitTex),n!==this.refOrbitTexH?(t.texImage2D(t.TEXTURE_2D,0,t.RGBA32F,o,n,0,t.RGBA,t.FLOAT,s),this.refOrbitTexH=n):t.texSubImage2D(t.TEXTURE_2D,0,0,0,o,n,t.RGBA,t.FLOAT,s)}uploadLaTexture(e,r){const t=this.gl,o=r*3,n=this.laTableTexW,a=Math.max(1,Math.ceil(o/n)),s=n*a*4,l=e.length>=s?e.subarray(0,s):(()=>{const c=new Float32Array(s);return c.set(e),c})();this.laTableTex||(this.laTableTex=ze(t),this.laTableTexH=0),t.bindTexture(t.TEXTURE_2D,this.laTableTex),a!==this.laTableTexH?(t.texImage2D(t.TEXTURE_2D,0,t.RGBA32F,n,a,0,t.RGBA,t.FLOAT,l),this.laTableTexH=a):t.texSubImage2D(t.TEXTURE_2D,0,0,0,n,a,t.RGBA,t.FLOAT,l)}}const ze=i=>{const e=i.createTexture();return i.bindTexture(i.TEXTURE_2D,e),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,i.NEAREST),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE),e},K=3;class go{constructor(e){f(this,"ext");f(this,"queries",new Array(K).fill(null));f(this,"inFlight",new Array(K).fill(!1));f(this,"cursor",0);f(this,"msEwma",0);f(this,"open",!1);if(this.gl=e,this.ext=e.getExtension("EXT_disjoint_timer_query_webgl2"),this.ext)for(let r=0;r<K;r++)this.queries[r]=e.createQuery()}available(){return this.ext!==null}getMs(){return this.msEwma}begin(){if(!this.ext||this.open)return;const e=this.queries[this.cursor];!e||this.inFlight[this.cursor]||(this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT,e),this.open=!0,this.inFlight[this.cursor]=!0)}end(){!this.ext||!this.open||(this.gl.endQuery(this.ext.TIME_ELAPSED_EXT),this.cursor=(this.cursor+1)%K,this.open=!1)}poll(){if(!this.ext)return;const e=this.gl;if(e.getParameter(this.ext.GPU_DISJOINT_EXT)){for(let r=0;r<K;r++)this.inFlight[r]=!1;return}for(let r=0;r<K;r++){if(!this.inFlight[r])continue;const t=this.queries[r];if(!t||!e.getQueryParameter(t,e.QUERY_RESULT_AVAILABLE))continue;const a=e.getQueryParameter(t,e.QUERY_RESULT)/1e6;this.msEwma=this.msEwma===0?a:this.msEwma*.8+a*.2,this.inFlight[r]=!1}}dispose(){const e=this.gl;for(const r of this.queries)r&&e.deleteQuery(r)}}class xo{constructor(e){f(this,"mainTex",null);f(this,"collisionTex",null);this.gl=e}getTexture(e){return e==="main"?this.mainTex:this.collisionTex}setBuffer(e,r){const t=this.gl,o=fe*4;r.length!==o&&console.warn(`[GradientLut] ${e} buffer length ${r.length} (want ${o})`);let n=this.getTexture(e);n||(n=t.createTexture(),e==="main"?this.mainTex=n:this.collisionTex=n),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,n),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.REPEAT),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,fe,1,0,t.RGBA,t.UNSIGNED_BYTE,r)}ensure(e){if(this.getTexture(e))return;const r=fe,t=new Uint8Array(r*4);if(e==="main")for(let o=0;o<r;++o)t[o*4+0]=o,t[o*4+1]=o,t[o*4+2]=o,t[o*4+3]=255;else for(let o=0;o<r;++o)t[o*4+3]=255;this.setBuffer(e,t)}dispose(){const e=this.gl;this.mainTex&&(e.deleteTexture(this.mainTex),this.mainTex=null),this.collisionTex&&(e.deleteTexture(this.collisionTex),this.collisionTex=null)}}class vo{constructor(e){f(this,"a",null);f(this,"b",null);f(this,"c",null);f(this,"dirty",!0);f(this,"extract");f(this,"down");f(this,"up");this.deps=e,this.extract=e.linkProgram(F,ao,["uTexel","uSource","uThreshold","uSoftKnee"]),this.down=e.linkProgram(F,so,["uTexel","uSource"]),this.up=e.linkProgram(F,no,["uTexel","uSource","uPrev","uIntensity"])}markResize(){this.dirty=!0}process(e,r,t,o){this.ensure(e,r);const n=this.a,a=this.b,s=this.c,{gl:l,drawQuad:c,bindFBO:u,useProgram:m,bindTex:p}=this.deps;return u(n),o(n),u(a),m(this.extract),l.uniform2f(this.extract.uniforms.uTexel,a.texel[0],a.texel[1]),p(0,n.tex,this.extract.uniforms.uSource),l.uniform1f(this.extract.uniforms.uThreshold,t),l.uniform1f(this.extract.uniforms.uSoftKnee,fr),c(),u(s),m(this.down),l.uniform2f(this.down.uniforms.uTexel,a.texel[0],a.texel[1]),p(0,a.tex,this.down.uniforms.uSource),c(),u(n),m(this.down),l.uniform2f(this.down.uniforms.uTexel,a.texel[0],a.texel[1]),p(0,a.tex,this.down.uniforms.uSource),c(),u(a),m(this.up),l.uniform2f(this.up.uniforms.uTexel,s.texel[0],s.texel[1]),p(0,s.tex,this.up.uniforms.uSource),p(1,n.tex,this.up.uniforms.uPrev),l.uniform1f(this.up.uniforms.uIntensity,1),c(),a.tex}dispose(){const{gl:e,deleteFBO:r}=this.deps;r(this.a),r(this.b),r(this.c),e.deleteProgram(this.extract.prog),e.deleteProgram(this.down.prog),e.deleteProgram(this.up.prog)}ensure(e,r){if(!this.dirty&&this.a&&this.b&&this.c)return;const{deleteFBO:t,createFBO:o}=this.deps;t(this.a),t(this.b),t(this.c);const n=Math.max(4,e>>1&-2),a=Math.max(4,r>>1&-2),s=Math.max(2,e>>2&-2),l=Math.max(2,r>>2&-2),c=Math.max(2,e>>3&-2),u=Math.max(2,r>>3&-2);this.a=o(n,a),this.b=o(s,l),this.c=o(c,u),this.dirty=!1}}function bo(i){switch(i){case"linear":return 0;case"perceptual":return 1;case"vivid":return 2}}function yo(i){switch(i){case"none":return 0;case"reinhard":return 1;case"agx":return 2;case"filmic":return 3}}function To(i){switch(i){case"add":return 0;case"screen":return 1;case"max":return 2;case"over":return 3}}function ae(i){switch(i){case"iterations":return 0;case"angle":return 1;case"magnitude":return 2;case"decomposition":return 3;case"bands":return 4;case"orbit-point":return 5;case"orbit-circle":return 6;case"orbit-cross":return 7;case"orbit-line":return 8;case"stripe":return 9;case"distance":return 10;case"derivative":return 11;case"potential":return 12;case"trap-iter":return 13}}function wo(i){switch(i){case"orbit-point":case"orbit-circle":case"orbit-cross":case"orbit-line":case"stripe":case"trap-iter":return!0;default:return!1}}function Mo(i){return i==="distance"||i==="derivative"}function Co(i){switch(i){case"orbit-point":return 0;case"orbit-circle":return 1;case"orbit-cross":return 2;case"orbit-line":return 3;case"trap-iter":return 0;default:return 0}}const Ao={juliaC:[-.36303304426511473,.16845183018751916],center:[-.8139175130270945,-.054649908357858296],centerLow:[0,0],zoom:1.2904749020480561,maxIter:310,escapeR:32,power:2,kind:"mandelbrot",forceMode:"gradient",forceGain:-1200,interiorDamp:.59,dt:.016,dissipation:.17,dyeDissipation:1.03,dyeInject:8,vorticity:22.1,pressureIters:50,show:"composite",juliaMix:.4,dyeMix:2,velocityViz:.02,gradientRepeat:1,gradientPhase:0,colorMapping:"iterations",colorIter:310,trapCenter:[0,0],trapRadius:1,trapNormal:[1,0],trapOffset:0,stripeFreq:4,dyeBlend:"max",dyeDecayMode:"linear",dyeChromaDecayHz:1.03,dyeSaturationBoost:1,vorticityScale:1,toneMapping:"none",exposure:1,vibrance:1.645,fluidStyle:"plain",bloomAmount:0,bloomThreshold:1,aberration:.27,refraction:.037,refractSmooth:3,refractRoughness:0,caustics:1,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,collisionEnabled:!1,collisionPreview:!1,collisionRepeat:1,collisionPhase:0,paused:!1,tsaa:!0,tsaaJitterAmount:1,tsaaSampleCap:64,tsaaPerFrameSamples:1,tsaaGridSize:16,tsaaJitterMode:"grid",deepZoomEnabled:!1};class Ro{constructor(e,r={}){f(this,"gl");f(this,"canvas");f(this,"quadVbo");f(this,"progJulia");f(this,"progMotion");f(this,"progAddForce");f(this,"progInjectDye");f(this,"progAdvect");f(this,"progDivergence");f(this,"progCurl");f(this,"progVorticity");f(this,"progPressure");f(this,"progGradSub");f(this,"progSplat");f(this,"progDisplay");f(this,"progClear");f(this,"progCopy");f(this,"progCopyMrt");f(this,"progReproject");f(this,"progMask");f(this,"progTsaaBlend");f(this,"juliaTsaa");f(this,"juliaTsaaPrev");f(this,"tsaaSampleIndex",0);f(this,"tsaaParamHash","");f(this,"blueNoise",null);f(this,"deepZoom");f(this,"forceFluidPaused",!1);f(this,"frameCount",0);f(this,"juliaTimer");f(this,"bloom");f(this,"lastCenter",[0,0]);f(this,"lastZoom",1.5);f(this,"firstFrame",!0);f(this,"simW",0);f(this,"simH",0);f(this,"juliaCur");f(this,"juliaPrev");f(this,"forceTex");f(this,"velocity");f(this,"dye");f(this,"divergence");f(this,"pressure");f(this,"curl");f(this,"maskTex");f(this,"gradients");f(this,"params",{...Ao});f(this,"lastTimeMs",0);f(this,"framebufferFormat");f(this,"maskReadFBO",null);f(this,"maskCpuBuf",new Uint8Array(0));f(this,"MASK_CPU_W",128);f(this,"MASK_CPU_H",128);f(this,"onFrameEnd");this.canvas=e,this.onFrameEnd=r.onFrameEnd;const t=e.getContext("webgl2",{antialias:!1,alpha:!1,preserveDrawingBuffer:!0});if(!t)throw new Error("WebGL2 required — your browser does not support it.");this.gl=t,this.deepZoom=new mo(t),this.juliaTimer=new go(t),this.gradients=new xo(t),this.bloom=new vo({gl:t,linkProgram:(a,s,l)=>this.linkProgram(a,s,l),drawQuad:()=>this.drawQuad(),bindFBO:a=>this.bindFBO(a),useProgram:a=>this.useProgram(a),bindTex:(a,s,l)=>this.bindTex(a,s,l),createFBO:(a,s)=>this.createFBO(a,s),deleteFBO:a=>this.deleteFBO(a)});const o=t.getExtension("EXT_color_buffer_float"),n=t.getExtension("EXT_color_buffer_half_float");if(!o&&!n)throw new Error("Neither EXT_color_buffer_float nor EXT_color_buffer_half_float is available.");this.framebufferFormat=this.detectFormat(),this.quadVbo=t.createBuffer(),t.bindBuffer(t.ARRAY_BUFFER,this.quadVbo),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),t.STATIC_DRAW),this.compileAll(),this.allocateAt(64,64),this.blueNoise=ho(t)}detectFormat(){const e=this.gl,r=[{internal:e.RGBA16F,format:e.RGBA,type:e.HALF_FLOAT,name:"RGBA16F half_float"},{internal:e.RGBA32F,format:e.RGBA,type:e.FLOAT,name:"RGBA32F float"},{internal:e.RGBA8,format:e.RGBA,type:e.UNSIGNED_BYTE,name:"RGBA8 fallback"}];for(const t of r){const o=e.createTexture();e.bindTexture(e.TEXTURE_2D,o),e.texImage2D(e.TEXTURE_2D,0,t.internal,4,4,0,t.format,t.type,null);const n=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,n),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,o,0);const a=e.checkFramebufferStatus(e.FRAMEBUFFER);if(e.bindFramebuffer(e.FRAMEBUFFER,null),e.deleteFramebuffer(n),e.deleteTexture(o),a===e.FRAMEBUFFER_COMPLETE)return console.info(`[FluidEngine] Using ${t.name} render targets.`),t}throw new Error("No renderable texture format supported (not even RGBA8).")}compileShader(e,r){const t=this.gl,o=t.createShader(e);if(t.shaderSource(o,r),t.compileShader(o),!t.getShaderParameter(o,t.COMPILE_STATUS)){const n=t.getShaderInfoLog(o)||"",a=r.split(`
`).map((s,l)=>`${String(l+1).padStart(4)}: ${s}`).join(`
`);throw console.error(`Shader compile error:
${n}
${a}`),new Error(`Shader compile error: ${n}`)}return o}linkProgram(e,r,t){const o=this.gl,n=this.compileShader(o.VERTEX_SHADER,e),a=this.compileShader(o.FRAGMENT_SHADER,r),s=o.createProgram();if(o.attachShader(s,n),o.attachShader(s,a),o.bindAttribLocation(s,0,"aPos"),o.linkProgram(s),!o.getProgramParameter(s,o.LINK_STATUS))throw new Error(`Program link error: ${o.getProgramInfoLog(s)}`);o.deleteShader(n),o.deleteShader(a);const l={};for(const c of t)l[c]=o.getUniformLocation(s,c);return{prog:s,uniforms:l}}compileAll(){this.progJulia=this.linkProgram(F,Xr,["uTexel","uKind","uJuliaC","uCenter","uScale","uAspect","uMaxIter","uEscapeR2","uPower","uColorIter","uTrapMode","uTrapCenter","uTrapRadius","uTrapNormal","uTrapOffset","uStripeFreq","uJitterScale","uResolution","uBlueNoiseTexture","uBlueNoiseResolution","uFrameCount","uPerFrameSamples","uJitterMode","uGridSize","uTsaaSampleIndex","uDeepZoomEnabled","uRefOrbit","uRefOrbitTexW","uRefOrbitLen","uDeepCenterOffset","uDeepScale","uLATable","uLATexW","uLATotalCount","uLAEnabled","uLAStages[0]","uLAStageCount","uATEnabled","uATStepLength","uATThresholdC","uATSqrEscapeRadius","uATRefC","uATCCoeff","uATInvZCoeff","uTrackAccum","uTrackDeriv"]),this.progTsaaBlend=this.linkProgram(F,lo,["uCurrentMain","uCurrentAux","uHistoryMain","uHistoryAux","uSampleIndex"]),this.progMotion=this.linkProgram(F,Zr,["uTexel","uJulia","uJuliaPrev","uJuliaAux","uGradient","uMask","uMode","uGain","uDt","uInteriorDamp","uDyeGain","uColorMapping","uGradientRepeat","uGradientPhase","uEdgeMargin","uForceCap"]),this.progAddForce=this.linkProgram(F,Wr,["uTexel","uVelocity","uForce","uMask","uDt"]),this.progInjectDye=this.linkProgram(F,Kr,["uTexel","uDye","uJulia","uJuliaAux","uGradient","uMask","uDyeGain","uDyeFadeHz","uDt","uColorMapping","uGradientRepeat","uGradientPhase","uEdgeMargin","uDyeBlend","uDyeDecayMode","uDyeChromaFadeHz","uDyeSatBoost"]),this.progAdvect=this.linkProgram(F,qr,["uTexel","uVelocity","uSource","uMask","uDt","uDissipation","uEdgeMargin"]),this.progDivergence=this.linkProgram(F,$r,["uTexel","uVelocity"]),this.progCurl=this.linkProgram(F,Yr,["uTexel","uVelocity"]),this.progVorticity=this.linkProgram(F,Qr,["uTexel","uVelocity","uCurl","uStrength","uScale","uDt"]),this.progPressure=this.linkProgram(F,eo,["uTexel","uPressure","uDivergence"]),this.progGradSub=this.linkProgram(F,to,["uTexel","uPressure","uVelocity","uMask"]),this.progSplat=this.linkProgram(F,io,["uTexel","uTarget","uPoint","uValue","uRadius","uDiscR","uHardness","uAspect","uOp"]),this.progDisplay=this.linkProgram(F,ro,["uTexel","uTexelDisplay","uTexelDye","uJulia","uJuliaAux","uDye","uVelocity","uGradient","uBloom","uMask","uShowMode","uJuliaMix","uDyeMix","uVelocityViz","uColorMapping","uGradientRepeat","uGradientPhase","uInteriorColor","uToneMapping","uExposure","uVibrance","uBloomAmount","uAberration","uRefraction","uRefractSmooth","uRefractRoughness","uCaustics","uCollisionPreview"]),this.progClear=this.linkProgram(F,co,["uValue"]),this.progCopy=this.linkProgram(F,uo,["uSource"]),this.progCopyMrt=this.linkProgram(F,po,["uSourceMain","uSourceAux"]),this.progReproject=this.linkProgram(F,fo,["uTexel","uSource","uNewCenter","uOldCenter","uNewZoom","uOldZoom","uAspect"]),this.progMask=this.linkProgram(F,oo,["uTexel","uJulia","uJuliaAux","uGradient","uCollisionGradient","uCollisionRepeat","uCollisionPhase","uColorMapping","uGradientRepeat","uGradientPhase"])}createFBO(e,r){const t=this.gl,o=t.createTexture();t.bindTexture(t.TEXTURE_2D,o),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,this.framebufferFormat.internal,e,r,0,this.framebufferFormat.format,this.framebufferFormat.type,null);const n=t.createFramebuffer();return t.bindFramebuffer(t.FRAMEBUFFER,n),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,o,0),t.viewport(0,0,e,r),t.clearColor(0,0,0,1),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null),{tex:o,fbo:n,width:e,height:r,texel:[1/e,1/r]}}createMrtFbo(e,r){const t=this.gl,o=()=>{const l=t.createTexture();return t.bindTexture(t.TEXTURE_2D,l),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,this.framebufferFormat.internal,e,r,0,this.framebufferFormat.format,this.framebufferFormat.type,null),l},n=o(),a=o(),s=t.createFramebuffer();return t.bindFramebuffer(t.FRAMEBUFFER,s),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,n,0),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT1,t.TEXTURE_2D,a,0),t.drawBuffers([t.COLOR_ATTACHMENT0,t.COLOR_ATTACHMENT1]),t.viewport(0,0,e,r),t.clearColor(0,0,0,1),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null),{texMain:n,texAux:a,fbo:s,width:e,height:r,texel:[1/e,1/r]}}deleteMrtFbo(e){if(!e)return;const r=this.gl;r.deleteTexture(e.texMain),r.deleteTexture(e.texAux),r.deleteFramebuffer(e.fbo)}createDoubleFBO(e,r){let t=this.createFBO(e,r),o=this.createFBO(e,r);return{width:e,height:r,texel:[1/e,1/r],get read(){return t},get write(){return o},swap(){const a=t;t=o,o=a}}}deleteFBO(e){if(!e)return;const r=this.gl;r.deleteTexture(e.tex),r.deleteFramebuffer(e.fbo)}deleteDoubleFBO(e){e&&(this.deleteFBO(e.read),this.deleteFBO(e.write))}allocateAt(e,r){this.simW=e,this.simH=r,this.juliaCur=this.createMrtFbo(e,r),this.juliaPrev=this.createMrtFbo(e,r),this.juliaTsaa=this.createMrtFbo(e,r),this.juliaTsaaPrev=this.createMrtFbo(e,r),this.tsaaSampleIndex=0,this.forceTex=this.createFBO(e,r),this.velocity=this.createDoubleFBO(e,r),this.dye=this.createDoubleFBO(e,r),this.divergence=this.createFBO(e,r),this.pressure=this.createDoubleFBO(e,r),this.curl=this.createFBO(e,r),this.maskTex=this.createFBO(e,r),this.firstFrame=!0}reallocateAt(e,r){var u,m;if(e===this.simW&&r===this.simH&&this.juliaCur)return;const t=(u=this.dye)==null?void 0:u.read,o=(m=this.velocity)==null?void 0:m.read,n=this.juliaTsaa,a=this.createDoubleFBO(e,r),s=this.createDoubleFBO(e,r),l=this.createMrtFbo(e,r),c=this.createMrtFbo(e,r);t&&this.blitInto(t,a.read),o&&this.blitInto(o,s.read),n&&this.blitMrtInto(n,l),this.deleteDoubleFBO(this.dye),this.deleteDoubleFBO(this.velocity),this.deleteMrtFbo(this.juliaTsaa),this.deleteMrtFbo(this.juliaTsaaPrev),this.deleteMrtFbo(this.juliaCur),this.deleteMrtFbo(this.juliaPrev),this.deleteFBO(this.forceTex),this.deleteFBO(this.divergence),this.deleteDoubleFBO(this.pressure),this.deleteFBO(this.curl),this.deleteFBO(this.maskTex),this.simW=e,this.simH=r,this.dye=a,this.velocity=s,this.juliaTsaa=l,this.juliaTsaaPrev=c,this.juliaCur=this.createMrtFbo(e,r),this.juliaPrev=this.createMrtFbo(e,r),this.forceTex=this.createFBO(e,r),this.divergence=this.createFBO(e,r),this.pressure=this.createDoubleFBO(e,r),this.curl=this.createFBO(e,r),this.maskTex=this.createFBO(e,r),this.firstFrame=!0}blitInto(e,r){const t=this.gl;t.bindFramebuffer(t.FRAMEBUFFER,r.fbo),t.viewport(0,0,r.width,r.height),this.useProgram(this.progCopy),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,e.tex),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.uniform1i(this.progCopy.uniforms.uSource,0),this.drawQuad()}blitMrtInto(e,r){const t=this.gl;t.bindFramebuffer(t.FRAMEBUFFER,r.fbo),t.viewport(0,0,r.width,r.height),this.useProgram(this.progCopyMrt),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,e.texMain),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.uniform1i(this.progCopyMrt.uniforms.uSourceMain,0),t.activeTexture(t.TEXTURE1),t.bindTexture(t.TEXTURE_2D,e.texAux),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.uniform1i(this.progCopyMrt.uniforms.uSourceAux,1),this.drawQuad()}bindFBO(e){const r=this.gl;r.bindFramebuffer(r.FRAMEBUFFER,e.fbo),r.viewport(0,0,e.width,e.height)}useProgram(e){const r=this.gl;r.useProgram(e.prog),r.bindBuffer(r.ARRAY_BUFFER,this.quadVbo),r.enableVertexAttribArray(0),r.vertexAttribPointer(0,2,r.FLOAT,!1,0,0)}drawQuad(){this.gl.drawArrays(this.gl.TRIANGLE_STRIP,0,4)}setTexel(e,r,t){const o=this.gl,n=e.uniforms.uTexel;n&&o.uniform2f(n,1/r,1/t)}bindTex(e,r,t){const o=this.gl;o.activeTexture(o.TEXTURE0+e),o.bindTexture(o.TEXTURE_2D,r),t&&o.uniform1i(t,e)}setParams(e){this.params={...this.params,...e}}getAccumulationCount(){return this.tsaaSampleIndex}setGradientBuffer(e){this.gradients.setBuffer("main",e)}setCollisionGradientBuffer(e){this.gradients.setBuffer("collision",e)}setRenderSize(e,r){e=Math.max(32,Math.round(e)),r=Math.max(32,Math.round(r)),!(e===this.simW&&r===this.simH&&this.canvas.width===e&&this.canvas.height===r)&&((this.canvas.width!==e||this.canvas.height!==r)&&(this.canvas.width=e,this.canvas.height=r,this.bloom.markResize()),this.reallocateAt(e,r))}redraw(){this.displayToScreen();const e=this.gl;e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,null)}markFirstFrame(){this.firstFrame=!0}resetFluid(){const e=this.gl;for(const r of[this.velocity,this.dye,this.pressure])for(const t of[r.read,r.write])this.bindFBO(t),this.useProgram(this.progClear),e.uniform4f(this.progClear.uniforms.uValue,0,0,0,1),this.drawQuad();e.bindFramebuffer(e.FRAMEBUFFER,null),this.markFirstFrame()}splat(e,r,t,o,n,a,s){const l=this.gl;this.bindFBO(e.write),this.useProgram(this.progSplat),this.bindTex(0,e.read.tex,this.progSplat.uniforms.uTarget),l.uniform2f(this.progSplat.uniforms.uPoint,r,t),l.uniform3f(this.progSplat.uniforms.uValue,o[0],o[1],o[2]),l.uniform1f(this.progSplat.uniforms.uRadius,Math.max(1e-6,n*.5*(n*.5))),l.uniform1f(this.progSplat.uniforms.uDiscR,Math.max(1e-6,n)),l.uniform1f(this.progSplat.uniforms.uHardness,a),l.uniform1f(this.progSplat.uniforms.uAspect,this.simW/this.simH),l.uniform1f(this.progSplat.uniforms.uOp,s==="sub"?1:0),this.drawQuad(),e.swap()}brush(e,r,t,o,n,a,s,l,c){e=Math.max(0,Math.min(1,e)),r=Math.max(0,Math.min(1,r));const u=[n[0]*l,n[1]*l,n[2]*l],m=[t,o,0];switch(c){case"paint":this.splat(this.velocity,e,r,m,a,s,"add"),this.splat(this.dye,e,r,u,a,s,"add");break;case"erase":this.splat(this.dye,e,r,[l,l,l],a,s,"sub");break;case"stamp":this.splat(this.dye,e,r,u,a,s,"add");break;case"smudge":this.splat(this.velocity,e,r,m,a,s,"add");break}this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null)}ensureMaskReadFBO(){if(this.maskReadFBO)return;const e=this.gl,r=e.createTexture();e.bindTexture(e.TEXTURE_2D,r),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,this.MASK_CPU_W,this.MASK_CPU_H,0,e.RGBA,e.UNSIGNED_BYTE,null);const t=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,t),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,r,0),e.bindFramebuffer(e.FRAMEBUFFER,null),this.maskReadFBO={tex:r,fbo:t,width:this.MASK_CPU_W,height:this.MASK_CPU_H,texel:[1/this.MASK_CPU_W,1/this.MASK_CPU_H]},this.maskCpuBuf=new Uint8Array(this.MASK_CPU_W*this.MASK_CPU_H*4)}readMaskToCPU(){if(!this.params.collisionEnabled)return;const e=this.gl;this.ensureMaskReadFBO(),e.bindFramebuffer(e.READ_FRAMEBUFFER,this.maskTex.fbo),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,this.maskReadFBO.fbo),e.blitFramebuffer(0,0,this.simW,this.simH,0,0,this.MASK_CPU_W,this.MASK_CPU_H,e.COLOR_BUFFER_BIT,e.LINEAR),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.FRAMEBUFFER,this.maskReadFBO.fbo),e.readPixels(0,0,this.MASK_CPU_W,this.MASK_CPU_H,e.RGBA,e.UNSIGNED_BYTE,this.maskCpuBuf),e.bindFramebuffer(e.FRAMEBUFFER,null)}sampleMask(e,r){if(!this.params.collisionEnabled||this.maskCpuBuf.length===0)return 0;const t=this.MASK_CPU_W,o=this.MASK_CPU_H;if(e<0||e>1||r<0||r>1)return 0;const n=Math.min(t-1,Math.max(0,Math.floor(e*t))),a=Math.min(o-1,Math.max(0,Math.floor(r*o)));return this.maskCpuBuf[(a*t+n)*4]/255}renderJulia(){var c;const e=this.gl,r=this.params.tsaaSampleCap,t=!this.params.paused&&!this.forceFluidPaused;if(this.params.tsaa&&r>0&&this.tsaaSampleIndex>=r&&!t)return;const o=this.juliaCur;this.juliaCur=this.juliaPrev,this.juliaPrev=o,this.juliaTimer.begin(),e.bindFramebuffer(e.FRAMEBUFFER,this.juliaCur.fbo),e.viewport(0,0,this.juliaCur.width,this.juliaCur.height),this.useProgram(this.progJulia),this.setTexel(this.progJulia,this.simW,this.simH),e.uniform1i(this.progJulia.uniforms.uKind,this.params.kind==="julia"?0:1),e.uniform2f(this.progJulia.uniforms.uJuliaC,this.params.juliaC[0],this.params.juliaC[1]),e.uniform2f(this.progJulia.uniforms.uCenter,this.params.center[0],this.params.center[1]),e.uniform1f(this.progJulia.uniforms.uScale,this.params.zoom),e.uniform1f(this.progJulia.uniforms.uAspect,this.simW/this.simH);const n=Math.max(4,this.params.maxIter|0);e.uniform1i(this.progJulia.uniforms.uMaxIter,n),e.uniform1i(this.progJulia.uniforms.uColorIter,Math.max(1,Math.min(n,this.params.colorIter|0))),e.uniform1f(this.progJulia.uniforms.uEscapeR2,this.params.escapeR*this.params.escapeR),e.uniform1f(this.progJulia.uniforms.uPower,this.params.power),e.uniform1i(this.progJulia.uniforms.uTrapMode,Co(this.params.colorMapping)),e.uniform1i(this.progJulia.uniforms.uTrackAccum,wo(this.params.colorMapping)?1:0),e.uniform1i(this.progJulia.uniforms.uTrackDeriv,Mo(this.params.colorMapping)?1:0),e.uniform2f(this.progJulia.uniforms.uTrapCenter,this.params.trapCenter[0],this.params.trapCenter[1]),e.uniform1f(this.progJulia.uniforms.uTrapRadius,this.params.trapRadius),e.uniform2f(this.progJulia.uniforms.uTrapNormal,this.params.trapNormal[0],this.params.trapNormal[1]),e.uniform1f(this.progJulia.uniforms.uTrapOffset,this.params.trapOffset),e.uniform1f(this.progJulia.uniforms.uStripeFreq,this.params.stripeFreq);const a=this.params.tsaaSampleCap,l=this.params.tsaa&&(a<=0||this.tsaaSampleIndex<a)?this.params.tsaaJitterAmount:0;if(e.uniform1f(this.progJulia.uniforms.uJitterScale,l),e.uniform2f(this.progJulia.uniforms.uResolution,this.simW,this.simH),e.uniform1i(this.progJulia.uniforms.uFrameCount,this.frameCount),e.uniform1i(this.progJulia.uniforms.uPerFrameSamples,this.params.tsaaPerFrameSamples??1),e.uniform1i(this.progJulia.uniforms.uJitterMode,this.params.tsaaJitterMode==="grid"?1:0),e.uniform1i(this.progJulia.uniforms.uGridSize,this.params.tsaaGridSize??16),e.uniform1i(this.progJulia.uniforms.uTsaaSampleIndex,this.tsaaSampleIndex),this.blueNoise){this.bindTex(5,this.blueNoise.texture,this.progJulia.uniforms.uBlueNoiseTexture);const[u,m]=this.blueNoise.getResolution();e.uniform2f(this.progJulia.uniforms.uBlueNoiseResolution,u,m)}this.deepZoom.bindUniforms(this.progJulia,this.params,((c=this.blueNoise)==null?void 0:c.texture)??null),this.drawQuad(),this.juliaTimer.end()}getJuliaMs(){return this.juliaTimer.getMs()}hasGpuTimer(){return this.juliaTimer.available()}setForceFluidPaused(e){this.forceFluidPaused=e}runTsaaBlend(){const e=this.params.tsaaSampleCap;if(e>0&&this.tsaaSampleIndex>=e)return;const r=this.gl;this.tsaaSampleIndex=e>0?Math.min(this.tsaaSampleIndex+1,e):this.tsaaSampleIndex+1,r.bindFramebuffer(r.FRAMEBUFFER,this.juliaTsaaPrev.fbo),r.viewport(0,0,this.juliaTsaaPrev.width,this.juliaTsaaPrev.height),this.useProgram(this.progTsaaBlend),this.bindTex(0,this.juliaCur.texMain,this.progTsaaBlend.uniforms.uCurrentMain),this.bindTex(1,this.juliaCur.texAux,this.progTsaaBlend.uniforms.uCurrentAux),this.bindTex(2,this.juliaTsaa.texMain,this.progTsaaBlend.uniforms.uHistoryMain),this.bindTex(3,this.juliaTsaa.texAux,this.progTsaaBlend.uniforms.uHistoryAux),r.uniform1i(this.progTsaaBlend.uniforms.uSampleIndex,this.tsaaSampleIndex),this.drawQuad();const t=this.juliaTsaa;this.juliaTsaa=this.juliaTsaaPrev,this.juliaTsaaPrev=t}juliaReadFbo(){return this.params.tsaa?this.juliaTsaa:this.juliaCur}updateTsaaHash(){const e=this.params,r=`${e.kind}|${e.juliaC[0]}|${e.juliaC[1]}|${e.center[0]}|${e.center[1]}|${e.zoom}|${e.power}|${e.maxIter}|${e.colorIter}|${e.escapeR}|${e.colorMapping}|${e.trapCenter[0]}|${e.trapCenter[1]}|${e.trapRadius}|${e.trapNormal[0]}|${e.trapNormal[1]}|${e.trapOffset}|${e.stripeFreq}|dz:${e.deepZoomEnabled?1:0}|dzV:${this.deepZoom.version}`;r!==this.tsaaParamHash&&(this.tsaaParamHash=r,this.tsaaSampleIndex=0)}computeMask(){const e=this.gl;if(this.gradients.ensure("main"),this.gradients.ensure("collision"),this.bindFBO(this.maskTex),!this.params.collisionEnabled){e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT);return}this.useProgram(this.progMask),this.setTexel(this.progMask,this.simW,this.simH);const r=this.juliaReadFbo();this.bindTex(0,r.texMain,this.progMask.uniforms.uJulia),this.bindTex(1,r.texAux,this.progMask.uniforms.uJuliaAux),this.bindTex(2,this.gradients.getTexture("main"),this.progMask.uniforms.uGradient),this.bindTex(3,this.gradients.getTexture("collision"),this.progMask.uniforms.uCollisionGradient),e.uniform1i(this.progMask.uniforms.uColorMapping,ae(this.params.colorMapping)),e.uniform1f(this.progMask.uniforms.uGradientRepeat,this.params.gradientRepeat),e.uniform1f(this.progMask.uniforms.uGradientPhase,this.params.gradientPhase),e.uniform1f(this.progMask.uniforms.uCollisionRepeat,this.params.collisionRepeat),e.uniform1f(this.progMask.uniforms.uCollisionPhase,this.params.collisionPhase),this.drawQuad()}computeForce(){const e=this.gl;this.gradients.ensure("main"),this.bindFBO(this.forceTex),this.useProgram(this.progMotion),this.setTexel(this.progMotion,this.simW,this.simH),this.bindTex(0,this.juliaCur.texMain,this.progMotion.uniforms.uJulia),this.bindTex(1,this.juliaPrev.texMain,this.progMotion.uniforms.uJuliaPrev),this.bindTex(4,this.juliaCur.texAux,this.progMotion.uniforms.uJuliaAux),this.bindTex(2,this.gradients.getTexture("main"),this.progMotion.uniforms.uGradient),this.bindTex(5,this.maskTex.tex,this.progMotion.uniforms.uMask),e.uniform1i(this.progMotion.uniforms.uMode,So(this.params.forceMode)),e.uniform1f(this.progMotion.uniforms.uGain,this.params.forceGain),e.uniform1f(this.progMotion.uniforms.uDt,this.params.dt),e.uniform1f(this.progMotion.uniforms.uInteriorDamp,this.params.interiorDamp),e.uniform1f(this.progMotion.uniforms.uDyeGain,this.params.dyeInject),e.uniform1i(this.progMotion.uniforms.uColorMapping,ae(this.params.colorMapping)),e.uniform1f(this.progMotion.uniforms.uGradientRepeat,this.params.gradientRepeat),e.uniform1f(this.progMotion.uniforms.uGradientPhase,this.params.gradientPhase),e.uniform1f(this.progMotion.uniforms.uEdgeMargin,this.params.edgeMargin),e.uniform1f(this.progMotion.uniforms.uForceCap,this.params.forceCap),this.drawQuad()}addForceToVelocity(){const e=this.gl;this.bindFBO(this.velocity.write),this.useProgram(this.progAddForce),this.setTexel(this.progAddForce,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progAddForce.uniforms.uVelocity),this.bindTex(1,this.forceTex.tex,this.progAddForce.uniforms.uForce),this.bindTex(2,this.maskTex.tex,this.progAddForce.uniforms.uMask),e.uniform1f(this.progAddForce.uniforms.uDt,this.params.dt),this.drawQuad(),this.velocity.swap()}injectDye(){const e=this.gl;this.gradients.ensure("main"),this.bindFBO(this.dye.write),this.useProgram(this.progInjectDye),this.setTexel(this.progInjectDye,this.simW,this.simH);const r=this.juliaReadFbo();this.bindTex(0,this.dye.read.tex,this.progInjectDye.uniforms.uDye),this.bindTex(1,r.texMain,this.progInjectDye.uniforms.uJulia),this.bindTex(2,this.gradients.getTexture("main"),this.progInjectDye.uniforms.uGradient),this.bindTex(4,r.texAux,this.progInjectDye.uniforms.uJuliaAux),this.bindTex(5,this.maskTex.tex,this.progInjectDye.uniforms.uMask),e.uniform1f(this.progInjectDye.uniforms.uDyeGain,this.params.dyeInject),e.uniform1f(this.progInjectDye.uniforms.uDyeFadeHz,this.params.dyeDissipation),e.uniform1f(this.progInjectDye.uniforms.uDt,this.params.dt),e.uniform1i(this.progInjectDye.uniforms.uColorMapping,ae(this.params.colorMapping)),e.uniform1f(this.progInjectDye.uniforms.uGradientRepeat,this.params.gradientRepeat),e.uniform1f(this.progInjectDye.uniforms.uGradientPhase,this.params.gradientPhase),e.uniform1f(this.progInjectDye.uniforms.uEdgeMargin,this.params.edgeMargin),e.uniform1i(this.progInjectDye.uniforms.uDyeBlend,To(this.params.dyeBlend)),e.uniform1i(this.progInjectDye.uniforms.uDyeDecayMode,bo(this.params.dyeDecayMode)),e.uniform1f(this.progInjectDye.uniforms.uDyeChromaFadeHz,this.params.dyeChromaDecayHz),e.uniform1f(this.progInjectDye.uniforms.uDyeSatBoost,this.params.dyeSaturationBoost),this.drawQuad(),this.dye.swap()}computeCurl(){this.bindFBO(this.curl),this.useProgram(this.progCurl),this.setTexel(this.progCurl,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progCurl.uniforms.uVelocity),this.drawQuad()}applyVorticity(){const e=this.gl;this.bindFBO(this.velocity.write),this.useProgram(this.progVorticity),this.setTexel(this.progVorticity,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progVorticity.uniforms.uVelocity),this.bindTex(1,this.curl.tex,this.progVorticity.uniforms.uCurl),e.uniform1f(this.progVorticity.uniforms.uStrength,this.params.vorticity),e.uniform1f(this.progVorticity.uniforms.uScale,this.params.vorticityScale),e.uniform1f(this.progVorticity.uniforms.uDt,this.params.dt),this.drawQuad(),this.velocity.swap()}computeDivergence(){this.bindFBO(this.divergence),this.useProgram(this.progDivergence),this.setTexel(this.progDivergence,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progDivergence.uniforms.uVelocity),this.drawQuad()}solvePressure(){const e=this.gl;this.bindFBO(this.pressure.read),e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT);for(let r=0;r<this.params.pressureIters;++r)this.bindFBO(this.pressure.write),this.useProgram(this.progPressure),this.setTexel(this.progPressure,this.simW,this.simH),this.bindTex(0,this.pressure.read.tex,this.progPressure.uniforms.uPressure),this.bindTex(1,this.divergence.tex,this.progPressure.uniforms.uDivergence),this.drawQuad(),this.pressure.swap()}subtractPressureGradient(){this.bindFBO(this.velocity.write),this.useProgram(this.progGradSub),this.setTexel(this.progGradSub,this.simW,this.simH),this.bindTex(0,this.pressure.read.tex,this.progGradSub.uniforms.uPressure),this.bindTex(1,this.velocity.read.tex,this.progGradSub.uniforms.uVelocity),this.bindTex(2,this.maskTex.tex,this.progGradSub.uniforms.uMask),this.drawQuad(),this.velocity.swap()}advect(e,r){const t=this.gl;this.bindFBO(e.write),this.useProgram(this.progAdvect),this.setTexel(this.progAdvect,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progAdvect.uniforms.uVelocity),this.bindTex(1,e.read.tex,this.progAdvect.uniforms.uSource),this.bindTex(2,this.maskTex.tex,this.progAdvect.uniforms.uMask),t.uniform1f(this.progAdvect.uniforms.uDt,this.params.dt),t.uniform1f(this.progAdvect.uniforms.uDissipation,r),t.uniform1f(this.progAdvect.uniforms.uEdgeMargin,this.params.edgeMargin),this.drawQuad(),e.swap()}reprojectTexture(e,r,t){const o=this.gl;this.bindFBO(e.write),this.useProgram(this.progReproject),this.setTexel(this.progReproject,this.simW,this.simH),this.bindTex(0,e.read.tex,this.progReproject.uniforms.uSource),o.uniform2f(this.progReproject.uniforms.uNewCenter,this.params.center[0],this.params.center[1]),o.uniform2f(this.progReproject.uniforms.uOldCenter,r[0],r[1]),o.uniform1f(this.progReproject.uniforms.uNewZoom,this.params.zoom),o.uniform1f(this.progReproject.uniforms.uOldZoom,t),o.uniform1f(this.progReproject.uniforms.uAspect,this.simW/this.simH),this.drawQuad(),e.swap()}maybeReprojectForCamera(){if(this.firstFrame){this.firstFrame=!1,this.lastCenter=[this.params.center[0],this.params.center[1]],this.lastZoom=this.params.zoom;return}const e=this.params.center[0]-this.lastCenter[0],r=this.params.center[1]-this.lastCenter[1],t=this.params.zoom-this.lastZoom;if(Math.abs(e)<1e-7&&Math.abs(r)<1e-7&&Math.abs(t)<1e-7)return;const o=[this.lastCenter[0],this.lastCenter[1]],n=this.lastZoom;this.reprojectTexture(this.dye,o,n),this.reprojectTexture(this.velocity,o,n),this.lastCenter=[this.params.center[0],this.params.center[1]],this.lastZoom=this.params.zoom}displayToScreen(){const e=this.gl;this.gradients.ensure("main");const t=this.params.bloomAmount>.001?this.bloom.process(this.canvas.width,this.canvas.height,this.params.bloomThreshold,()=>{this.setDisplayUniforms(null,!0),this.drawQuad()}):null;e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,this.canvas.width,this.canvas.height),this.setDisplayUniforms(t,!1),this.drawQuad()}setDisplayUniforms(e,r=!1){const t=this.gl;this.useProgram(this.progDisplay),t.uniform2f(this.progDisplay.uniforms.uTexelDisplay,1/this.canvas.width,1/this.canvas.height),t.uniform2f(this.progDisplay.uniforms.uTexelDye,1/this.simW,1/this.simH);const o=this.juliaReadFbo();this.bindTex(0,o.texMain,this.progDisplay.uniforms.uJulia),this.bindTex(4,o.texAux,this.progDisplay.uniforms.uJuliaAux),this.bindTex(1,this.dye.read.tex,this.progDisplay.uniforms.uDye),this.bindTex(2,this.velocity.read.tex,this.progDisplay.uniforms.uVelocity),this.bindTex(3,this.gradients.getTexture("main"),this.progDisplay.uniforms.uGradient),this.bindTex(5,e??this.gradients.getTexture("main"),this.progDisplay.uniforms.uBloom),this.bindTex(6,this.maskTex.tex,this.progDisplay.uniforms.uMask),t.uniform1i(this.progDisplay.uniforms.uShowMode,Eo(this.params.show)),t.uniform1f(this.progDisplay.uniforms.uJuliaMix,this.params.juliaMix),t.uniform1f(this.progDisplay.uniforms.uDyeMix,this.params.dyeMix),t.uniform1f(this.progDisplay.uniforms.uVelocityViz,this.params.velocityViz),t.uniform1i(this.progDisplay.uniforms.uColorMapping,ae(this.params.colorMapping)),t.uniform1f(this.progDisplay.uniforms.uGradientRepeat,this.params.gradientRepeat),t.uniform1f(this.progDisplay.uniforms.uGradientPhase,this.params.gradientPhase),t.uniform3f(this.progDisplay.uniforms.uInteriorColor,this.params.interiorColor[0],this.params.interiorColor[1],this.params.interiorColor[2]),r?(t.uniform1i(this.progDisplay.uniforms.uToneMapping,0),t.uniform1f(this.progDisplay.uniforms.uExposure,1),t.uniform1f(this.progDisplay.uniforms.uVibrance,0),t.uniform1f(this.progDisplay.uniforms.uBloomAmount,0),t.uniform1f(this.progDisplay.uniforms.uAberration,0),t.uniform1f(this.progDisplay.uniforms.uRefraction,0),t.uniform1f(this.progDisplay.uniforms.uRefractSmooth,1),t.uniform1f(this.progDisplay.uniforms.uRefractRoughness,0),t.uniform1f(this.progDisplay.uniforms.uCaustics,0),t.uniform1i(this.progDisplay.uniforms.uCollisionPreview,0)):(t.uniform1i(this.progDisplay.uniforms.uToneMapping,yo(this.params.toneMapping)),t.uniform1f(this.progDisplay.uniforms.uExposure,this.params.exposure),t.uniform1f(this.progDisplay.uniforms.uVibrance,this.params.vibrance),t.uniform1f(this.progDisplay.uniforms.uBloomAmount,e?this.params.bloomAmount:0),t.uniform1f(this.progDisplay.uniforms.uAberration,this.params.aberration),t.uniform1f(this.progDisplay.uniforms.uRefraction,this.params.refraction),t.uniform1f(this.progDisplay.uniforms.uRefractSmooth,this.params.refractSmooth),t.uniform1f(this.progDisplay.uniforms.uRefractRoughness,this.params.refractRoughness),t.uniform1f(this.progDisplay.uniforms.uCaustics,this.params.caustics),t.uniform1i(this.progDisplay.uniforms.uCollisionPreview,this.params.collisionPreview?1:0))}frame(e){const r=this.gl,t=this.lastTimeMs===0?.016:Math.min(.05,(e-this.lastTimeMs)/1e3);this.lastTimeMs=e,this.params.dt=t,this.updateTsaaHash(),this.frameCount++,this.params.tsaa&&this.params.tsaaSampleCap>0&&this.tsaaSampleIndex>=this.params.tsaaSampleCap||(this.renderJulia(),this.params.tsaa&&this.runTsaaBlend()),this.computeMask(),this.readMaskToCPU(),!this.params.paused&&!this.forceFluidPaused&&(this.maybeReprojectForCamera(),this.computeForce(),this.addForceToVelocity(),this.params.vorticity>0&&(this.computeCurl(),this.applyVorticity()),this.computeDivergence(),this.solvePressure(),this.subtractPressureGradient(),this.advect(this.velocity,this.params.dissipation),this.injectDye(),this.advect(this.dye,this.params.dyeDissipation)),this.displayToScreen(),r.activeTexture(r.TEXTURE0),r.bindTexture(r.TEXTURE_2D,null),this.juliaTimer.poll(),this.onFrameEnd&&this.onFrameEnd()}dispose(){const e=this.gl;this.deepZoom.dispose(),this.juliaTimer.dispose(),this.deleteMrtFbo(this.juliaCur),this.deleteMrtFbo(this.juliaPrev),this.deleteMrtFbo(this.juliaTsaa),this.deleteMrtFbo(this.juliaTsaaPrev),this.deleteFBO(this.forceTex),this.deleteDoubleFBO(this.velocity),this.deleteDoubleFBO(this.dye),this.deleteFBO(this.divergence),this.deleteDoubleFBO(this.pressure),this.deleteFBO(this.curl),this.deleteFBO(this.maskTex),this.maskReadFBO&&(this.deleteFBO(this.maskReadFBO),this.maskReadFBO=null),this.gradients.dispose(),this.bloom.dispose(),e.deleteBuffer(this.quadVbo);for(const r of[this.progJulia,this.progMotion,this.progAddForce,this.progInjectDye,this.progAdvect,this.progDivergence,this.progCurl,this.progVorticity,this.progPressure,this.progGradSub,this.progSplat,this.progDisplay,this.progClear,this.progReproject,this.progMask,this.progTsaaBlend])r!=null&&r.prog&&e.deleteProgram(r.prog);this.blueNoise&&(e.deleteTexture(this.blueNoise.texture),this.blueNoise=null)}canvasToFractal(e,r){const t=this.canvas.getBoundingClientRect(),o=(e-t.left)/t.width,n=1-(r-t.top)/t.height,a=this.canvas.width/this.canvas.height,s=(o*2-1)*a*this.params.zoom+this.params.center[0],l=(n*2-1)*this.params.zoom+this.params.center[1];return[s,l]}canvasToUv(e,r){const t=this.canvas.getBoundingClientRect();return[(e-t.left)/t.width,1-(r-t.top)/t.height]}}function So(i){switch(i){case"gradient":return 0;case"curl":return 1;case"iterate":return 2;case"c-track":return 3;case"hue":return 4}}function Eo(i){switch(i){case"composite":return 0;case"julia":return 1;case"dye":return 2;case"velocity":return 3}}const Fo=i=>{ie.register({id:"fluid-toy.pause",key:"Space",description:"Pause / resume the fluid simulation",category:"Playback",handler:()=>{var r;const e=x.getState();e.setFluidSim({paused:!((r=e.fluidSim)!=null&&r.paused)})}}),ie.register({id:"fluid-toy.reset",key:"R",description:"Reset fluid fields (dye + velocity → zero)",category:"Playback",handler:()=>{var e;(e=i.current)==null||e.resetFluid()}}),ie.register({id:"fluid-toy.orbit-toggle",key:"O",description:"Toggle Julia-c auto-orbit",category:"Simulation",handler:()=>{var r;const e=x.getState();e.setCoupling({orbitEnabled:!((r=e.coupling)!=null&&r.orbitEnabled)})}}),ie.register({id:"fluid-toy.home",key:"Home",description:"Recenter view (center=[0,0], zoom=1.5)",category:"View",handler:()=>{x.getState().setJulia({center:{x:0,y:0},zoom:1.5})}})},Do=i=>{const e=C.useRef(null),r=C.useRef(null);return C.useEffect(()=>{const t=i.current;if(t){try{const o=new Ro(t,{onFrameEnd:()=>st.frameTick()});e.current=o,ve.ref.current=o;let n=-1,a=0,s=-1;const l=c=>{const u=n<0?0:Math.min(.1,(c-n)/1e3);if(n=c,e.current){const m=Z.ref.current;if(ci(W.ref.current.runtime,{dtSec:u,wallClockMs:c,dragging:m.dragging,cursorUv:m.uv,cursorVelUv:m.velUv,params:Ee(),engine:e.current}),e.current.frame(c),c-a>100){const p=e.current.getAccumulationCount();p!==s&&(x.getState().reportAccumulation(p),s=p),a=c}}r.current=requestAnimationFrame(l)};r.current=requestAnimationFrame(l)}catch(o){console.error("[FluidToy] failed to start engine:",o)}return Fo(e),()=>{var o;r.current!==null&&cancelAnimationFrame(r.current),(o=e.current)==null||o.dispose(),e.current=null,ve.ref.current=null}}},[]),e},Po=i=>{const e=j("julia"),r=j("deepZoom"),t=j("coupling"),o=j("palette"),n=j("collision"),a=j("fluidSim"),s=j("postFx"),l=j("composite"),c=He();C.useEffect(()=>{const u=i.current;u&&Wt(u,e,c)},[e,c,i]),C.useEffect(()=>{const u=i.current;u&&qt(u,r,e)},[r,e,i]),C.useEffect(()=>{const u=i.current;u&&Ai(u,o)},[o,i]),C.useEffect(()=>{const u=i.current;u&&Ei(u,n)},[n,i]),C.useEffect(()=>{const u=i.current;u&&Di(u,a,t)},[a,t,i]),C.useEffect(()=>{const u=i.current;u&&Bi(u,s)},[s,i]),C.useEffect(()=>{const u=i.current;u&&Ni(u,l)},[l,i])};class Lo{constructor(){f(this,"worker",null);f(this,"nextId",1);f(this,"pending",new Map)}ensureWorker(){if(this.worker)return this.worker;const e=new Worker(new URL(""+new URL("deepZoomWorker-CEHSx2aH.js",import.meta.url).href,import.meta.url),{type:"module"});return e.onmessage=r=>{const t=r.data,o=this.pending.get(t.id);o&&(this.pending.delete(t.id),t.type==="orbit"?o.resolve({orbit:new Float32Array(t.orbit),length:t.length,escaped:t.escaped,precisionBits:t.precisionBits,buildMs:t.buildMs,laBuildMs:t.laBuildMs??0,laTable:t.laTable?new Float32Array(t.laTable):void 0,laStages:t.laStages?new Float32Array(t.laStages):void 0,laCount:t.laCount??0,laStageCount:t.laStageCount??0,at:t.at}):o.reject(new Error(t.message)))},e.onerror=r=>{var o;const t=new Error(`deep-zoom worker crashed: ${r.message}`);for(const n of this.pending.values())n.reject(t);this.pending.clear(),(o=this.worker)==null||o.terminate(),this.worker=null},this.worker=e,e}computeReferenceOrbit(e){const r=this.ensureWorker(),t=this.nextId++;return new Promise((o,n)=>{this.pending.set(t,{resolve:o,reject:n});const a={type:"computeOrbit",id:t,...e};r.postMessage(a)})}cancel(e){if(!this.worker)return;const r={type:"cancel",id:e};this.worker.postMessage(r),this.pending.delete(e)}dispose(){this.worker&&(this.worker.terminate(),this.worker=null),this.pending.clear()}}let me=null;const jo=()=>(me||(me=new Lo),me),Io=i=>{var n,a;const e=j("julia"),r=j("deepZoom"),t=He(),o=x(s=>s.canvasPixelSize);C.useEffect(()=>{var A,g;if(!r.enabled){jr();return}const s=i.current;if(!s)return;const l=jo();let c=!1;const u=performance.now(),m=[e.center.x,e.center.y],p=[((A=e.centerLow)==null?void 0:A.x)??0,((g=e.centerLow)==null?void 0:g.y)??0],T=o[0]/Math.max(1,o[1]),w=(T*T+1)*e.zoom*e.zoom,h=Math.max(2,Math.round(e.power??2)),M=h===2,v=e.kind===0?"julia":"mandelbrot",b=t["julia.juliaC_x"]??e.juliaC.x,R=t["julia.juliaC_y"]??e.juliaC.y;return l.computeReferenceOrbit({centerX:m[0],centerY:m[1],centerLowX:p[0],centerLowY:p[1],zoom:e.zoom,maxIter:r.maxRefIter,power:h,kind:v,juliaCx:b,juliaCy:R,buildLA:r.useLA&&M&&v==="mandelbrot",screenSqrRadius:r.useAT&&M&&v==="mandelbrot"?w:0}).then(y=>{if(c)return;const S=s.deepZoom;S.setReferenceOrbit(y.orbit,y.length,m,p),y.laTable&&y.laStages&&y.laCount>0?(S.setLATable(y.laTable,y.laCount,y.laStages),S.setLAEnabled(!0)):(S.clearLATable(),S.setLAEnabled(!1)),y.at?S.setAT({stepLength:y.at.stepLength,thresholdC:y.at.thresholdC,sqrEscapeRadius:y.at.sqrEscapeRadius,refC:[y.at.refCRe,y.at.refCIm],ccoeff:[y.at.ccoeffRe,y.at.ccoeffIm],invZCoeff:[y.at.invZCoeffRe,y.at.invZCoeffIm]}):S.clearAT(),s.redraw();const P=[];if(y.laStages)for(let L=0;L<y.laStages.length;L+=2)P.push(y.laStages[L+1]);if(Qe({orbitLength:y.length,precisionBits:y.precisionBits,orbitBuildMs:y.buildMs,laStageCount:y.laStageCount,laCount:y.laCount,laBuildMs:y.laBuildMs,laStagesPerLevel:P,juliaMs:0}),r.showStats){const L=performance.now()-u;console.log(`[deepZoom] orbit len=${y.length} prec=${y.precisionBits}b LA stages=${y.laStageCount} nodes=${y.laCount} (orbit=${y.buildMs.toFixed(1)}ms LA=${y.laBuildMs.toFixed(1)}ms total=${L.toFixed(1)}ms)`)}}).catch(y=>{c||console.error("[deepZoom] build failed:",y.message)}),()=>{c=!0}},[r.enabled,r.useLA,r.useAT,r.maxRefIter,r.showStats,e.center.x,e.center.y,(n=e.centerLow)==null?void 0:n.x,(a=e.centerLow)==null?void 0:a.y,e.zoom,e.power,e.kind,e.juliaC.x,e.juliaC.y,o,i]),C.useEffect(()=>{if(!r.enabled)return;const s=()=>{const c=i.current;c&&Lr(c.getJuliaMs())},l=window.setInterval(s,200);return()=>window.clearInterval(l)},[r.enabled,i])},ko=()=>{const i=x(g=>g.panels),e=x(g=>g.contextMenu),r=x(g=>g.handleInteractionStart),t=x(g=>g.handleInteractionEnd),o=x(g=>g.openContextMenu),n=x(g=>g.closeContextMenu),a=x(g=>g.togglePanel),s=x(g=>g.openHelp),l=C.useRef(null),c=Do(l),u=Object.values(i).filter(g=>g.location==="float"&&g.isOpen),m=C.useMemo(()=>({handleInteractionStart:r,handleInteractionEnd:t,openContextMenu:o}),[r,t,o]),p=x(g=>g.canvasPixelSize),T=x(g=>g.resolutionMode),w=x(g=>g.fixedResolution),h=x(g=>g.renderScale),M=Ve();nt();const v=x(g=>g.accumulation),b=x(g=>g.isPaused),R=x(g=>g.sampleCap);Po(c),Io(c);const A=j("deepZoom").enabled;return C.useEffect(()=>{const g=c.current;g&&g.setParams({tsaa:v??!0,tsaaSampleCap:R,paused:b})},[v,b,R]),C.useEffect(()=>{const g=c.current;if(!g)return;const y=window.devicePixelRatio||1,[S,P]=T==="Fixed"?w:[p[0]/y,p[1]/y];if(S<1||P<1)return;const L=Math.max(1,Math.round(S*h*M)),k=Math.max(1,Math.round(P*h*M));g.setRenderSize(L,k),g.redraw()},[p,T,w,h,M]),d.jsx(lt,{value:m,children:d.jsxs("div",{className:"fixed inset-0 w-full h-full bg-black text-white select-none overflow-hidden flex flex-col",children:[d.jsx(ct,{}),d.jsx(jt,{}),d.jsx(ut,{}),u.map(g=>d.jsx(dt,{id:g.id,title:g.id,children:d.jsx(pt,{activeTab:g.id,state:x.getState(),actions:x.getState(),onSwitchTab:y=>a(y,!0)})},g.id)),d.jsx(ft,{}),d.jsxs("div",{className:"flex-1 flex overflow-hidden relative",children:[d.jsx(De,{side:"left"}),d.jsxs(Ft,{className:"flex-1",children:[d.jsx("canvas",{ref:l,className:"absolute inset-0 w-full h-full block touch-none"}),d.jsx(Fr,{canvasRef:l,engineRef:c}),d.jsx(It,{}),d.jsx(Dr,{}),A&&d.jsxs("div",{style:{position:"absolute",left:8,bottom:8,pointerEvents:"none",zIndex:5,minWidth:220},children:[d.jsx(kr,{}),d.jsx(Nr,{engineRef:c})]})]}),d.jsx(De,{side:"right"})]}),d.jsx(ht,{}),d.jsx(kt,{}),e.visible&&d.jsx(mt,{x:e.x,y:e.y,items:e.items,targetHelpIds:e.targetHelpIds,onClose:n,onOpenHelp:s})]})})},_o=[{id:"Fractal",dock:"right",order:0,active:!0,features:["julia"]},{id:"Deep Zoom",dock:"right",order:1,features:["deepZoom"]},{id:"Coupling",dock:"right",order:2,features:["coupling"]},{id:"Fluid",dock:"right",order:3,features:["fluidSim"]},{id:"Brush",dock:"right",order:4,features:["brush"]},{id:"Palette",dock:"right",order:5,features:["palette"]},{id:"Post-FX",dock:"right",order:6,features:["postFx"]},{id:"Collision",dock:"right",order:7,features:["collision"]},{id:"Composite",dock:"right",order:8,features:["composite"]},{id:"Presets",dock:"right",order:9,features:["presets"]},{id:"Views",dock:"left",order:20,component:"panel-views",label:"View Manager"}],zo=()=>gt(_o),Bo=()=>{const i=Ve();return d.jsxs("span",{className:"text-[10px] text-white/40 font-mono pointer-events-none",children:["q",(i*100).toFixed(0),"%"]})},D=({children:i})=>d.jsx("span",{className:"inline-block px-1 py-px text-[9px] font-mono border border-white/20 rounded bg-white/10 text-white/90 mx-0.5",children:i}),Oo=()=>{const[i,e]=C.useState(!0);return i?d.jsxs("div",{className:"px-3 py-2 text-[10px] text-gray-300 bg-black/70 rounded border border-white/10 max-w-[360px] pointer-events-auto shadow-xl",children:[d.jsxs("div",{className:"flex items-center justify-between mb-1",children:[d.jsx("div",{className:"text-[10px] uppercase text-cyan-300 tracking-wide",children:"Hotkeys"}),d.jsx("button",{onClick:()=>e(!1),className:"text-gray-500 hover:text-gray-200 text-[12px] px-1 leading-none",title:"Hide (click ? to reopen)",children:"×"})]}),d.jsxs("ul",{className:"space-y-0.5 leading-snug",children:[d.jsxs("li",{children:[d.jsx(D,{children:"Drag"})," inject force + dye into the fluid"]}),d.jsxs("li",{children:[d.jsx(D,{children:"B"}),"+",d.jsx(D,{children:"Drag"})," resize the brush live (horizontal = scale)"]}),d.jsxs("li",{children:[d.jsx(D,{children:"C"}),"+",d.jsx(D,{children:"Drag"})," pick Julia c directly on the canvas"]}),d.jsxs("li",{children:[d.jsx(D,{children:"Right-click"}),"+",d.jsx(D,{children:"Drag"})," pan the fractal view"]}),d.jsxs("li",{children:[d.jsx(D,{children:"Right-click"})," (tap) canvas for quick actions menu"]}),d.jsxs("li",{children:[d.jsx(D,{children:"Shift"}),"/",d.jsx(D,{children:"Alt"})," precision modifiers (5× / 0.2×) for any drag"]}),d.jsxs("li",{children:[d.jsx(D,{children:"Wheel"})," zoom · ",d.jsx(D,{children:"Middle"}),"+",d.jsx(D,{children:"Drag"})," smooth zoom · ",d.jsx(D,{children:"Home"})," recenter"]}),d.jsxs("li",{children:[d.jsx(D,{children:"Space"})," pause sim · ",d.jsx(D,{children:"R"})," clear fluid · ",d.jsx(D,{children:"O"})," toggle c-orbit · ",d.jsx(D,{children:"H"})," hide hints"]})]})]}):d.jsx("button",{onClick:()=>e(!0),className:"px-2 py-1 text-[10px] text-cyan-300 bg-black/50 rounded border border-white/10 hover:bg-black/70 pointer-events-auto",title:"Show hotkeys",children:"? hotkeys"})},Be="fluid-toy.orbit.juliaC.x",Oe="fluid-toy.orbit.juliaC.y";let Ue=null;const Ge=()=>{const i=x.getState(),e=i.coupling,r=i.animations??[],t=r.filter(l=>l.id!==Be&&l.id!==Oe);if(!(e!=null&&e.orbitEnabled)){t.length!==r.length&&i.setAnimations(t);return}const o=e.orbitRadius??.1,a=1/Math.max(.001,e.orbitSpeed??.25),s=[...t,{id:Be,target:"julia.juliaC_x",shape:"Sine",period:a,phase:0,amplitude:o,baseValue:0,smoothing:0,enabled:!0},{id:Oe,target:"julia.juliaC_y",shape:"Sine",period:a,phase:.25,amplitude:o,baseValue:0,smoothing:0,enabled:!0}];i.setAnimations(s)},Uo=()=>{Ue||(Ge(),Ue=x.subscribe(i=>i.coupling,Ge))},q=(i,e,r)=>i+(e-i)*r,Go=i=>i<.5?2*i*i:1-Math.pow(-2*i+2,2)/2,Fe=()=>{const i=x.getState().julia;return{kind:i.kind,juliaC:{...i.juliaC},center:{...i.center},zoom:i.zoom,maxIter:i.maxIter,power:i.power}},No=500;let $=null;const Vo=i=>{const e=x.getState().setJulia;if(!e)return;$!==null&&(cancelAnimationFrame($),$=null);const r=Fe();e({kind:i.kind,maxIter:i.maxIter});const t=Math.log(Math.max(r.zoom,1e-12)),o=Math.log(Math.max(i.zoom,1e-12)),n=performance.now(),a=()=>{const s=(performance.now()-n)/No;if(s>=1){e({center:{x:i.center.x,y:i.center.y},juliaC:{x:i.juliaC.x,y:i.juliaC.y},zoom:i.zoom,power:i.power}),$=null;return}const l=Go(s);e({center:{x:q(r.center.x,i.center.x,l),y:q(r.center.y,i.center.y,l)},juliaC:{x:q(r.juliaC.x,i.juliaC.x,l),y:q(r.juliaC.y,i.juliaC.y,l)},zoom:Math.exp(q(t,o,l)),power:q(r.power,i.power,l)}),$=requestAnimationFrame(a)};$=requestAnimationFrame(a)},Ho=i=>{Vo(i)},Jo=i=>{const e=Fe();return e.kind!==i.kind||e.maxIter!==i.maxIter||e.power!==i.power||Math.abs(e.zoom-i.zoom)>1e-5||Math.abs(e.center.x-i.center.x)+Math.abs(e.center.y-i.center.y)>1e-4||Math.abs(e.juliaC.x-i.juliaC.x)+Math.abs(e.juliaC.y-i.juliaC.y)>1e-4},Xo=async()=>{try{const i=document.querySelector("canvas");if(!i)return;const e=128,r=document.createElement("canvas");r.width=e,r.height=e;const t=r.getContext("2d");if(!t)return;const o=Math.min(i.width,i.height),n=(i.width-o)/2,a=(i.height-o)/2;return t.drawImage(i,n,a,o,o,0,0,e,e),r.toDataURL("image/jpeg",.7)}catch{return}},Zo=()=>{const i=x.getState().setJulia;i&&i({center:{x:0,y:0},zoom:1.5})},Wo=()=>{Ut({panelId:"Views",arrayKey:"savedViews",activeIdKey:"activeViewId",actions:{add:"addView",update:"updateView",delete:"deleteView",duplicate:"duplicateView",select:"selectView",reorder:"reorderViews",saveToSlot:"saveViewToSlot",reset:"resetView"},defaultLabelPrefix:"View",capture:Fe,apply:Ho,isModified:Jo,captureThumbnail:Xo,onReset:Zo,slotShortcuts:{count:9,category:"Views"},menu:{menuId:"camera",slot:"right",order:29,icon:xt,title:"Camera",align:"end",width:"w-48",openItem:{label:"View Manager…",title:"Open the saved-views library"},resetItem:{label:"Reset View",title:"Reset to default fractal view"},slotLabelPrefix:"View"}})},Ko=({activeIdKey:i,featureIds:e,label:r="Active",groupFilter:t,excludeParams:o,whitelistParams:n,onDeselect:a,inactiveLabel:s=null})=>{const l=x(c=>c[i]);return!l&&s===null?null:d.jsxs("div",{className:"border-t border-white/10 bg-black/40 p-2 space-y-2",children:[d.jsxs("div",{className:"flex items-center justify-between",children:[d.jsx(vt,{children:l?r:s??""}),l&&a&&d.jsx("button",{type:"button",onClick:a,className:"text-[9px] text-gray-500 hover:text-white px-2 py-0.5 rounded border border-white/10 hover:bg-white/5 transition-colors",children:"Deselect"})]}),l&&e.map(c=>d.jsx("div",{className:"bg-white/5 rounded p-1",children:d.jsx(bt,{featureId:c,groupFilter:t,excludeParams:o,whitelistParams:n})},c))]})},qo=()=>{const i=x(h=>h.savedViews??[]),e=x(h=>h.activeViewId),r=x(h=>h.addView),t=x(h=>h.updateView),o=x(h=>h.deleteView),n=x(h=>h.duplicateView),a=x(h=>h.selectView),s=x(h=>h.reorderViews),l=x(h=>h.resetView);x(h=>h.julia);const c=C.useCallback(async()=>{await(r==null?void 0:r())},[r]),u=C.useCallback((h,M)=>t==null?void 0:t(h,{label:M}),[t]),m=C.useCallback(h=>t==null?void 0:t(h),[t]),p=C.useCallback(()=>l==null?void 0:l(),[l]),T=C.useCallback(h=>{const M=x.getState()._viewIsModified;if(M)return M(h.state);const v=x.getState().julia,b=h.state;return v.kind!==b.kind||v.maxIter!==b.maxIter||v.power!==b.power||Math.abs(v.zoom-b.zoom)>1e-5||Math.abs(v.center.x-b.center.x)+Math.abs(v.center.y-b.center.y)>1e-4||Math.abs(v.juliaC.x-b.juliaC.x)+Math.abs(v.juliaC.y-b.juliaC.y)>1e-4},[]),w=C.useMemo(()=>{const h=x.getState().setJulia,M=R=>{const A=x.getState().julia.center??{x:0,y:0};h==null||h({center:{x:A.x,y:A.y},zoom:R})},v=ge.indexOf("mandelbrot"),b=ge.indexOf("julia");return[{id:"reset",label:"RESET",onSelect:()=>p(),title:"Reset view to defaults"},{id:"home",label:"HOME",onSelect:()=>h==null?void 0:h({center:{x:0,y:0}}),title:"Center to (0, 0); keep zoom"},{id:"1x",label:"1:1",onSelect:()=>M(1),title:"Zoom 1×"},{id:"wide",label:"WIDE",onSelect:()=>M(.5),title:"Zoom out"},{id:"mand",label:"MAND",onSelect:()=>h==null?void 0:h({kind:v>=0?v:1}),title:"Switch to Mandelbrot kind"},{id:"julia",label:"JULIA",onSelect:()=>h==null?void 0:h({kind:b>=0?b:0}),title:"Switch to Julia kind"}]},[p]);return r?d.jsx(Gt,{className:"flex flex-col bg-[#080808] -m-3",snapshots:i,activeId:e,onSelect:a,onRename:u,onUpdate:m,onDuplicate:n,onDelete:o,onReorder:s,isModified:T,emptyState:"No saved views — pan, zoom, tweak, then click New View",slotHintPrefix:null,presets:w,presetGridCols:3,toolbarBefore:d.jsx("div",{className:"px-2 pb-2 bg-black/40 border-b border-white/10",children:d.jsxs("button",{type:"button",onClick:c,className:"w-full bg-cyan-900/40 hover:bg-cyan-800 text-cyan-300 border border-cyan-500/30 rounded py-1 text-[9px] font-bold flex items-center justify-center gap-1",children:[d.jsx(yt,{})," New View"]})}),footer:d.jsxs(d.Fragment,{children:[d.jsx(Ko,{activeIdKey:"activeViewId",featureIds:["julia"],label:"Active View",onDeselect:()=>a==null?void 0:a(null)}),d.jsx("div",{className:"border-t border-white/10 bg-black/40 p-2",children:d.jsx(Nt,{})})]})}):d.jsx("div",{className:"p-4 text-[10px] text-gray-600 italic",children:"View library not initialized."})};Tt();x.getState().setSampleCap(64);wt({enabled:!0,targetFps:45,minQuality:.4,interactionDownsample:.5,activityGraceMs:100,engageOnAccumOnly:!0});Mt();Vt();Ct({getCanvas:()=>document.querySelector("canvas")});Ht(["julia.center_x","julia.center_y","julia.zoom"]);_t();At();Rt();Dt({hideShortcuts:!0});Pt.register({featureId:"julia",captureState:()=>{const i=x.getState();return{center:{...i.julia.center},zoom:i.julia.zoom}},applyState:i=>{x.getState().setJulia({center:i.center,zoom:i.zoom})}});St();zt();Bt.registerHudHint({id:"fluid-toy-controls",slot:"bottom-left",order:0,component:Oo});Ot.register({id:"fluid-toy.quality",slot:"bottom-left",order:10,component:Bo});Uo();Wo();ce.register("panel-views",qo);zo();const tt=document.getElementById("root");if(!tt)throw new Error("Could not find root element to mount to");const $o=Lt.createRoot(tt);$o.render(d.jsx(Et.StrictMode,{children:d.jsx(ko,{})}));
