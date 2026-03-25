const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./AdvancedGradientEditor-DGV7l4o2.js","./three-fiber-CPrIxt6s.js","./three-Wc6KBp_k.js","./three-drei-CWnivAlk.js","./index-x0WkbnyN.js","./pako-DwGzBETv.js","./Timeline-BPr-DtqR.js","./mediabunny-ZLFd-dRz.js","./HelpBrowser-DUCCnIpY.js","./FormulaWorkshop-CWJxgo8H.js","./FlowEditor-DB-tIcWE.js","./reactflow-DF77eLy4.js","./AudioPanel-BXI5VGiu.js","./AudioSpectrum-Dl2LIBH3.js","./DebugToolsOverlay-C5fxHK6p.js"])))=>i.map(i=>d[i]);
var Fr=Object.defineProperty;var Ar=(e,n,t)=>n in e?Fr(e,n,{enumerable:!0,configurable:!0,writable:!0,value:t}):e[n]=t;var Q=(e,n,t)=>Ar(e,typeof n!="symbol"?n+"":n,t);import{r as we,J as Ln,K as zr,f as Ao,S as yn,G as Or,C as Rt,D as zo,P as $r,a as Br,L as vn,b as Hr,c as Gr,d as Oo,R as Ur,e as ze,T as zt,g as Wr,A as qr,h as Xt,i as Vr,p as Nn,j as Dt,k as qt,l as ia,m as Yr,n as Xr,o as Zr,q as Ea,s as Dn,U as Qr,t as Kr,u as Jr,v as $o,w as en,x as tn,y as an,M as ei,z as wa,F as ti,H as Bo,B as ai,E as La,I as Ho,N as Go,O as Uo,Q as Na,V as wn,W as Wo,X as ni,Y as oi,Z as Sa,_ as ri,$ as _n,a0 as ii,a1 as si,a2 as _t,a3 as tt,a4 as li,a5 as ci,a6 as di,a7 as ui,a8 as Sn,a9 as Mn,aa as hi,ab as fi,ac as pi,ad as mi,ae as gi,af as et,ag as pt,ah as Mt,ai as xi,aj as bi,ak as yi,al as vi,am as wi,an as Si,ao as Fn,ap as Mi,aq as An,ar as Ci,as as ki,at as ji,au as Ri}from"./index-x0WkbnyN.js";import{r as M,j as a,R as Ue,u as Cn,a as Da,C as Ii}from"./three-fiber-CPrIxt6s.js";import{a as qo,r as Vt,_ as It,O as Pi,b as Ti}from"./three-drei-CWnivAlk.js";import{d as Te,c as V,k as Lt,Q as Oe,l as ut,E as _e,O as Ei,P as Li,m as qe,n as Ni,o as Di,p as zn,q as On,r as Nt,s as _i,R as kn,g as $n,M as Oa,j as Vo}from"./three-Wc6KBp_k.js";import{p as Bn}from"./pako-DwGzBETv.js";const Fi=e=>(n,t,o)=>{const i=o.subscribe;return o.subscribe=(r,l,c)=>{let d=r;if(l){const f=(c==null?void 0:c.equalityFn)||Object.is;let h=r(o.getState());d=p=>{const u=r(p);if(!f(h,u)){const g=h;l(h=u,g)}},c!=null&&c.fireImmediately&&l(h,h)}return i(d)},e(n,t,o)},Yo=Fi,ge={UNIFORM:"uniform",CONFIG:"config",RESET_ACCUM:"reset_accum",OFFSET_SHIFT:"offset_shift",OFFSET_SET:"offset_set",OFFSET_SILENT:"offset_silent",CAMERA_ABSORB:"camera_absorb",CAMERA_SNAP:"camera_snap",CAMERA_TELEPORT:"camera_teleport",CAMERA_TRANSITION:"camera_transition",SHADER_CODE:"shader_code",IS_COMPILING:"is_compiling",COMPILE_TIME:"compile_time",COMPILE_ESTIMATE:"compile_estimate",BUCKET_STATUS:"bucket_status",BUCKET_IMAGE:"bucket_image",TRACK_FOCUS:"track_focus",TEXTURE:"texture",ENGINE_QUEUE:"engine_queue",REGISTER_FORMULA:"register_formula"};class Ai{constructor(){Q(this,"listeners",{})}on(n,t){return this.listeners[n]||(this.listeners[n]=[]),this.listeners[n].push(t),()=>this.off(n,t)}off(n,t){this.listeners[n]&&(this.listeners[n]=this.listeners[n].filter(o=>o!==t))}emit(n,t){this.listeners[n]&&this.listeners[n].forEach(o=>o(t))}}const Y=new Ai,He={CameraPosition:"uCameraPosition",CamBasisX:"uCamBasisX",CamBasisY:"uCamBasisY",CamForward:"uCamForward",RegionMin:"uRegionMin",RegionMax:"uRegionMax",LightCount:"uLightCount",LightType:"uLightType",LightPos:"uLightPos",LightDir:"uLightDir",LightColor:"uLightColor",LightIntensity:"uLightIntensity",LightShadows:"uLightShadows",LightFalloff:"uLightFalloff",LightFalloffType:"uLightFalloffType",LightRadius:"uLightRadius",LightSoftness:"uLightSoftness",ModularParams:"uModularParams",HistogramLayer:"uHistogramLayer"},Hn=e=>{if(typeof window>"u")return!1;const n=new URLSearchParams(window.location.search);return n.has(e)&&n.get(e)!=="false"&&n.get(e)!=="0"},zi={Formula:{id:"Formula",location:"right",order:0,isCore:!0,isOpen:!0},Graph:{id:"Graph",location:"right",order:1,isCore:!0,isOpen:!1},Scene:{id:"Scene",location:"right",order:2,isCore:!0,isOpen:!1},Shader:{id:"Shader",location:"right",order:3,isCore:!0,isOpen:!1},Gradient:{id:"Gradient",location:"right",order:4,isCore:!0,isOpen:!1},Quality:{id:"Quality",location:"right",order:5,isCore:!0,isOpen:!1},Light:{id:"Light",location:"right",order:6,isCore:!1,isOpen:!1},Audio:{id:"Audio",location:"right",order:7,isCore:!1,isOpen:!1},Drawing:{id:"Drawing",location:"right",order:8,isCore:!1,isOpen:!1}},Oi=(e,n)=>({showLightGizmo:!0,isGizmoDragging:!1,interactionMode:"none",focusLock:!1,histogramData:null,histogramAutoUpdate:!0,histogramTrigger:0,histogramLayer:0,histogramActiveCount:0,sceneHistogramData:null,sceneHistogramTrigger:0,sceneHistogramActiveCount:0,draggedLightIndex:null,autoCompile:!1,isUserInteracting:!1,advancedMode:!1,showHints:!0,debugMobileLayout:!1,invertY:!1,resolutionMode:"Full",fixedResolution:[800,600],isBroadcastMode:Hn("clean")||Hn("broadcast"),lockSceneOnSwitch:!1,exportIncludeScene:!1,isTimelineHovered:!1,tabSwitchCount:0,helpWindow:{visible:!1,activeTopicId:null},contextMenu:{visible:!1,x:0,y:0,items:[],targetHelpIds:[]},compositionOverlay:"none",compositionOverlaySettings:{opacity:.5,lineThickness:1,showCenterMark:!1,showSafeAreas:!1,color:"#FFFFFF",gridDivisionsX:4,gridDivisionsY:4,spiralRotation:0,spiralPositionX:.5,spiralPositionY:.5,spiralScale:1,spiralRatio:1.618033988749895},panels:zi,leftDockSize:320,rightDockSize:360,isLeftDockCollapsed:!0,isRightDockCollapsed:!1,draggingPanelId:null,dragSnapshot:null,activeLeftTab:null,activeRightTab:"Formula",workshopOpen:!1,workshopEditFormula:void 0,setShowLightGizmo:t=>e({showLightGizmo:t}),setGizmoDragging:t=>e({isGizmoDragging:t}),setInteractionMode:t=>e({interactionMode:t}),setFocusLock:t=>e({focusLock:t}),setHistogramData:t=>e({histogramData:t}),setHistogramAutoUpdate:t=>e({histogramAutoUpdate:t}),refreshHistogram:()=>e(t=>({histogramTrigger:t.histogramTrigger+1})),registerHistogram:()=>e(t=>({histogramActiveCount:t.histogramActiveCount+1})),unregisterHistogram:()=>e(t=>({histogramActiveCount:Math.max(0,t.histogramActiveCount-1)})),setHistogramLayer:t=>{n().histogramLayer!==t&&(e({histogramLayer:t}),Y.emit("uniform",{key:He.HistogramLayer,value:t}),e(o=>({histogramTrigger:o.histogramTrigger+1})))},setSceneHistogramData:t=>e({sceneHistogramData:t}),refreshSceneHistogram:()=>e(t=>({sceneHistogramTrigger:t.sceneHistogramTrigger+1})),registerSceneHistogram:()=>e(t=>({sceneHistogramActiveCount:t.sceneHistogramActiveCount+1})),unregisterSceneHistogram:()=>e(t=>({sceneHistogramActiveCount:Math.max(0,t.sceneHistogramActiveCount-1)})),setDraggedLight:t=>e({draggedLightIndex:t}),setAutoCompile:t=>e({autoCompile:t}),setAdvancedMode:t=>e({advancedMode:t}),setShowHints:t=>e({showHints:t}),setDebugMobileLayout:t=>e({debugMobileLayout:t}),setInvertY:t=>e({invertY:t}),setResolutionMode:t=>{e({resolutionMode:t}),Y.emit("reset_accum",void 0)},setFixedResolution:(t,o)=>{e({fixedResolution:[t,o]}),Y.emit("reset_accum",void 0)},setLockSceneOnSwitch:t=>e({lockSceneOnSwitch:t}),setExportIncludeScene:t=>e({exportIncludeScene:t}),setIsTimelineHovered:t=>e({isTimelineHovered:t}),incrementTabSwitchCount:()=>e(t=>({tabSwitchCount:t.tabSwitchCount+1})),setIsBroadcastMode:t=>e({isBroadcastMode:t}),openHelp:t=>e(o=>({helpWindow:{visible:!0,activeTopicId:t||o.helpWindow.activeTopicId},contextMenu:{...o.contextMenu,visible:!1}})),closeHelp:()=>e({helpWindow:{visible:!1,activeTopicId:null}}),openContextMenu:(t,o,i,s)=>e({contextMenu:{visible:!0,x:t,y:o,items:i,targetHelpIds:s||[]}}),closeContextMenu:()=>e(t=>({contextMenu:{...t.contextMenu,visible:!1}})),openWorkshop:t=>e({workshopOpen:!0,workshopEditFormula:t}),closeWorkshop:()=>e({workshopOpen:!1,workshopEditFormula:void 0}),movePanel:(t,o,i)=>e(s=>{var g,v;const r={...s.panels};r[t]||(r[t]={id:t,location:o,order:0,isCore:!1,isOpen:!0});const l=!0;let c=i;c===void 0&&(c=Object.values(r).filter(b=>b.location===o).length),(o==="left"||o==="right")&&Object.values(r).forEach(y=>{y.location===o&&y.id!==t&&(y.isOpen=!1)});let d=r[t].floatPos;o==="float"&&!d&&(d={x:window.innerWidth/2-150,y:window.innerHeight/2-200}),r[t]={...r[t],location:o,order:c,isOpen:l,floatPos:d};const f=o==="left"?t:((g=Object.values(r).find(y=>y.location==="left"&&y.isOpen))==null?void 0:g.id)||null,h=o==="right"?t:((v=Object.values(r).find(y=>y.location==="right"&&y.isOpen))==null?void 0:v.id)||null,p=o==="left"?!1:s.isLeftDockCollapsed,u=o==="right"?!1:s.isRightDockCollapsed;return{panels:r,activeLeftTab:f,activeRightTab:h,isLeftDockCollapsed:p,isRightDockCollapsed:u}}),reorderPanel:(t,o)=>e(i=>{const s={...i.panels},r=s[t],l=s[o];if(!r||!l)return{};r.location!==l.location&&(r.location=l.location,r.isOpen=!1);const c=l.location,d=Object.values(s).filter(u=>u.location===c).sort((u,g)=>u.order-g.order),f=d.findIndex(u=>u.id===t),h=d.findIndex(u=>u.id===o);if(f===-1||h===-1)return{};const[p]=d.splice(f,1);return d.splice(h,0,p),d.forEach((u,g)=>{s[u.id]={...s[u.id],order:g}}),{panels:s}}),togglePanel:(t,o)=>e(i=>{var f,h;const s={...i.panels};if(!s[t])return{};const r=s[t],l=o!==void 0?o:!r.isOpen;if(r.location==="float")r.isOpen=l;else if(l){if(Object.values(s).forEach(p=>{p.location===r.location&&p.id!==t&&(p.isOpen=!1)}),r.isOpen=!0,r.location==="left")return{panels:s,activeLeftTab:t,isLeftDockCollapsed:!1};if(r.location==="right")return{panels:s,activeRightTab:t,isRightDockCollapsed:!1}}else r.isOpen=!1;const c=((f=Object.values(s).find(p=>p.location==="left"&&p.isOpen))==null?void 0:f.id)||null,d=((h=Object.values(s).find(p=>p.location==="right"&&p.isOpen))==null?void 0:h.id)||null;return{panels:s,activeLeftTab:c,activeRightTab:d}}),setDockSize:(t,o)=>e({[t==="left"?"leftDockSize":"rightDockSize"]:o}),setDockCollapsed:(t,o)=>e({[t==="left"?"isLeftDockCollapsed":"isRightDockCollapsed"]:o}),setFloatPosition:(t,o,i)=>e(s=>({panels:{...s.panels,[t]:{...s.panels[t],floatPos:{x:o,y:i}}}})),setFloatSize:(t,o,i)=>e(s=>({panels:{...s.panels,[t]:{...s.panels[t],floatSize:{width:o,height:i}}}})),startPanelDrag:t=>e(o=>({draggingPanelId:t,dragSnapshot:JSON.parse(JSON.stringify(o.panels))})),endPanelDrag:()=>e({draggingPanelId:null,dragSnapshot:null}),cancelPanelDrag:()=>e(t=>t.dragSnapshot?{panels:t.dragSnapshot,draggingPanelId:null,dragSnapshot:null}:{draggingPanelId:null}),setActiveTab:t=>n().togglePanel(t,!0),floatTab:t=>n().movePanel(t,"float"),dockTab:t=>n().movePanel(t,"right"),setCompositionOverlay:t=>e({compositionOverlay:t}),setCompositionOverlaySettings:t=>e(o=>({compositionOverlaySettings:{...o.compositionOverlaySettings,...t}}))}),$i=()=>typeof window>"u"?!1:window.matchMedia&&window.matchMedia("(pointer: coarse)").matches||window.innerWidth<768,Bi=(e,n)=>({dpr:$i()?1:Math.min(typeof window<"u"&&window.devicePixelRatio||1,2),aaLevel:1,msaaSamples:1,aaMode:"Always",accumulation:!0,previewMode:!1,renderMode:"Direct",isPaused:!1,sampleCap:256,isExporting:!1,renderRegion:null,isBucketRendering:!1,bucketSize:128,bucketUpscale:1,convergenceThreshold:.1,samplesPerBucket:64,setDpr:t=>{e({dpr:t}),Y.emit("reset_accum",void 0)},setAALevel:t=>{e({aaLevel:t});const{aaMode:o}=n();(o==="Always"||o==="Auto")&&e({dpr:t}),Y.emit("reset_accum",void 0)},setMSAASamples:t=>{e({msaaSamples:t});const{aaMode:o}=n();o==="Always"||o==="Auto"?Y.emit("config",{msaaSamples:t}):Y.emit("config",{msaaSamples:1}),Y.emit("reset_accum",void 0)},setAAMode:t=>{e({aaMode:t});const{aaLevel:o,msaaSamples:i}=n();t==="Off"?(e({dpr:1}),Y.emit("config",{msaaSamples:1})):(e({dpr:o}),Y.emit("config",{msaaSamples:i})),Y.emit("reset_accum",void 0)},setAccumulation:t=>{e({accumulation:t}),Y.emit("reset_accum",void 0)},setPreviewMode:t=>{e({previewMode:t}),Y.emit("config",{previewMode:t})},setRenderMode:t=>{e({renderMode:t});const o=t==="PathTracing"?1:0,i=n().setLighting;i&&i({renderMode:o})},setIsPaused:t=>e({isPaused:t}),setSampleCap:t=>e({sampleCap:t}),setRenderRegion:t=>{e({renderRegion:t});const o=t?new Te(t.minX,t.minY):new Te(0,0),i=t?new Te(t.maxX,t.maxY):new Te(1,1);Y.emit("uniform",{key:He.RegionMin,value:o}),Y.emit("uniform",{key:He.RegionMax,value:i}),Y.emit("reset_accum",void 0)},setIsBucketRendering:t=>{e({isBucketRendering:t})},setBucketSize:t=>e({bucketSize:t}),setBucketUpscale:t=>e({bucketUpscale:t}),setConvergenceThreshold:t=>e({convergenceThreshold:t}),setSamplesPerBucket:t=>e({samplesPerBucket:t}),setIsExporting:t=>e({isExporting:t})}),Xo=new Uint32Array(256);for(let e=0;e<256;e++){let n=e;for(let t=0;t<8;t++)n=n&1?3988292384^n>>>1:n>>>1;Xo[e]=n}const Hi=e=>{let n=-1;for(let t=0;t<e.length;t++)n=n>>>8^Xo[(n^e[t])&255];return(n^-1)>>>0},Gi=new TextEncoder,Gn=new TextDecoder,Ui=e=>{const n=new Uint8Array(e.length);for(let t=0;t<e.length;t++)n[t]=e.charCodeAt(t);return n},ba=e=>{let n="";for(let t=0;t<e.length;t++)n+=String.fromCharCode(e[t]);return n},Un=(e,n,t)=>{e[n]=t>>>24&255,e[n+1]=t>>>16&255,e[n+2]=t>>>8&255,e[n+3]=t&255},Zo=async(e,n,t)=>{const o=await e.arrayBuffer(),i=new Uint8Array(o);if(i[0]!==137||i[1]!==80||i[2]!==78||i[3]!==71)throw new Error("Not a valid PNG");const s=Ui(n),r=Gi.encode(t),l=s.length+1+1+1+1+1+r.length,c=12+l,d=new Uint8Array(c);Un(d,0,l),d[4]=105,d[5]=84,d[6]=88,d[7]=116;let f=8;d.set(s,f),f+=s.length,d[f++]=0,d[f++]=0,d[f++]=0,d[f++]=0,d[f++]=0,d.set(r,f);const h=Hi(d.slice(4,c-4));Un(d,c-4,h);let p=8;for(;p<i.length;){const g=i[p]<<24|i[p+1]<<16|i[p+2]<<8|i[p+3];if(ba(i.slice(p+4,p+8))==="IEND")break;p+=12+g}const u=new Uint8Array(i.length+c);return u.set(i.slice(0,p),0),u.set(d,p),u.set(i.slice(p),p+c),new Blob([u],{type:"image/png"})},Qo=async(e,n)=>{const t=await e.arrayBuffer(),o=new Uint8Array(t);if(o[0]!==137||o[1]!==80)return null;let i=8;for(;i<o.length;){const s=o[i]<<24|o[i+1]<<16|o[i+2]<<8|o[i+3],r=ba(o.slice(i+4,i+8));if(r==="iTXt"){const l=o.slice(i+8,i+8+s);let c=-1;for(let d=0;d<l.length;d++)if(l[d]===0){c=d;break}if(c!==-1&&ba(l.slice(0,c))===n){let f=c+1+1+1;for(;f<l.length&&l[f]!==0;)f++;for(f++;f<l.length&&l[f]!==0;)f++;return f++,Gn.decode(l.slice(f))}}if(r==="tEXt"){const l=o.slice(i+8,i+8+s);let c=-1;for(let d=0;d<l.length;d++)if(l[d]===0){c=d;break}if(c!==-1&&ba(l.slice(0,c))===n)return Gn.decode(l.slice(c+1))}if(r==="IEND")break;i+=12+s}return null};let nn=null;function Wi(e){nn=e}class qi{constructor(){Q(this,"activeCamera",null);Q(this,"virtualSpace",null);Q(this,"renderer",null);Q(this,"pipeline",null);Q(this,"_worker",null);Q(this,"_shadow",{isBooted:!1,isCompiling:!1,hasCompiledShader:!1,isPaused:!1,dirty:!1,lastCompileDuration:0,lastMeasuredDistance:1,accumulationCount:0,frameCount:0,sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0}});Q(this,"_localOffset",{x:0,y:0,z:0,xL:0,yL:0,zL:0});Q(this,"_offsetGuarded",!1);Q(this,"_offsetGuardTimer",null);Q(this,"_onCompiling",null);Q(this,"_onCompileTime",null);Q(this,"_onShaderCode",null);Q(this,"_onBootedCallback",null);Q(this,"_pendingSnapshots",new Map);Q(this,"_pendingPicks",new Map);Q(this,"_pendingFocusPicks",new Map);Q(this,"_pendingHistograms",new Map);Q(this,"_pendingShaderSource",new Map);Q(this,"_gpuInfo","");Q(this,"_lastGeneratedFrag","");Q(this,"modulations",{});Q(this,"_isBucketRendering",!1);Q(this,"_isExporting",!1);Q(this,"_exportReady",null);Q(this,"_exportFrameDone",null);Q(this,"_exportComplete",null);Q(this,"_exportError",null);Q(this,"_container",null);Q(this,"_lastInitArgs",null);Q(this,"_onCrash",null);Q(this,"_isGizmoInteracting",!1);Q(this,"_bootSent",!1);Q(this,"_pendingOffsetSync",null)}setWorkerModePending(){}initWorkerMode(n,t,o,i,s,r,l){if(this._worker)return;this._container=n.parentElement,this._lastInitArgs={config:t,width:o,height:i,dpr:s,isMobile:r,initialCamera:l};const c=n.transferControlToOffscreen();this._worker=new Worker(new URL(""+new URL("renderWorker-CbEBMH_K.js",import.meta.url).href,import.meta.url),{type:"module"}),this._worker.onmessage=f=>{this._handleWorkerMessage(f.data)},this._worker.onerror=f=>{console.error("[WorkerProxy] Worker error:",f),this._handleWorkerCrash("Worker error: "+(f.message||"unknown"))};const d={type:"INIT",canvas:c,width:o,height:i,dpr:s,isMobile:r,initialConfig:t,initialCamera:l};this._worker.postMessage(d,[c])}restart(n,t){if(!this._container||!this._lastInitArgs)return;this._worker&&(this._worker.onmessage=null,this._worker.onerror=null,this._worker.terminate(),this._worker=null),this._shadow={isBooted:!1,isCompiling:!1,hasCompiledShader:!1,isPaused:!1,dirty:!1,lastCompileDuration:0,lastMeasuredDistance:1,accumulationCount:0,frameCount:0,sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0}};const o=this._container.querySelector("canvas");o&&o.remove();const{width:i,height:s,dpr:r,isMobile:l}=this._lastInitArgs,c=document.createElement("canvas");c.width=i*r,c.height=s*r,c.style.cssText="position:absolute;inset:0;width:100%;height:100%;pointer-events:none",this._container.appendChild(c),this._lastInitArgs={...this._lastInitArgs,config:n,initialCamera:t};const d=c.transferControlToOffscreen();this._worker=new Worker(new URL(""+new URL("renderWorker-CbEBMH_K.js",import.meta.url).href,import.meta.url),{type:"module"}),this._worker.onmessage=h=>{this._handleWorkerMessage(h.data)},this._worker.onerror=h=>{console.error("[WorkerProxy] Worker error:",h),this._handleWorkerCrash("Worker error: "+(h.message||"unknown"))};const f={type:"INIT",canvas:d,width:i,height:s,dpr:r,isMobile:l,initialConfig:n,initialCamera:t};this._worker.postMessage(f,[d])}set onCompiling(n){this._onCompiling=n}set onCompileTime(n){this._onCompileTime=n}set onShaderCode(n){this._onShaderCode=n}_handleWorkerMessage(n){switch(n.type){case"READY":break;case"FRAME_READY":if(n.state)if(this._shadow=n.state,this._offsetGuarded){const t=n.state.sceneOffset,o=this._localOffset;Math.abs(t.x+t.xL-(o.x+o.xL))+Math.abs(t.y+t.yL-(o.y+o.yL))+Math.abs(t.z+t.zL-(o.z+o.zL))<.001&&(this._offsetGuarded=!1,this._offsetGuardTimer&&(clearTimeout(this._offsetGuardTimer),this._offsetGuardTimer=null))}else this._localOffset={...n.state.sceneOffset};nn&&nn();break;case"COMPILING":this._shadow.isCompiling=!!n.status,this._shadow.hasCompiledShader=!n.status||this._shadow.hasCompiledShader,this._onCompiling&&this._onCompiling(n.status),Y.emit(ge.IS_COMPILING,n.status);break;case"COMPILE_TIME":n.duration&&(this._shadow.lastCompileDuration=n.duration),this._onCompileTime&&this._onCompileTime(n.duration),Y.emit(ge.COMPILE_TIME,n.duration);break;case"SHADER_CODE":this._lastGeneratedFrag=n.code,this._onShaderCode&&this._onShaderCode(n.code),Y.emit(ge.SHADER_CODE,n.code);break;case"SHADER_SOURCE_RESULT":{const t=this._pendingShaderSource.get(n.id);t&&(t(n.code),this._pendingShaderSource.delete(n.id));break}case"BOOTED":this._shadow.isBooted=!0,n.gpuInfo&&(this._gpuInfo=n.gpuInfo),this._onBootedCallback&&this._onBootedCallback();break;case"GPU_INFO":this._gpuInfo=n.info;break;case"HISTOGRAM_RESULT":{const t=this._pendingHistograms.get(n.id);t&&(t(n.data),this._pendingHistograms.delete(n.id));break}case"SNAPSHOT_RESULT":{const t=this._pendingSnapshots.get(n.id);t&&(t(n.blob),this._pendingSnapshots.delete(n.id));break}case"PICK_RESULT":{const t=this._pendingPicks.get(n.id);t&&(t(n.position?new V(n.position[0],n.position[1],n.position[2]):null),this._pendingPicks.delete(n.id));break}case"FOCUS_RESULT":{const t=this._pendingFocusPicks.get(n.id);t&&(t(n.distance),this._pendingFocusPicks.delete(n.id));break}case"ERROR":console.error("[WorkerProxy] Worker error:",n.message);break;case"EXPORT_READY":this._exportReady&&this._exportReady();break;case"EXPORT_FRAME_DONE":this._shadow.lastMeasuredDistance=n.measuredDistance,this._exportFrameDone&&this._exportFrameDone({frameIndex:n.frameIndex,progress:n.progress,measuredDistance:n.measuredDistance});break;case"EXPORT_COMPLETE":this._isExporting=!1,this._exportComplete&&this._exportComplete(n.blob??null);break;case"EXPORT_ERROR":this._isExporting=!1,console.error("[WorkerProxy] Export error:",n.message),this._exportError&&this._exportError(n.message);break;case"BUCKET_STATUS":this._isBucketRendering=n.isRendering,Y.emit(ge.BUCKET_STATUS,{isRendering:n.isRendering,progress:n.progress,totalBuckets:n.totalBuckets,currentBucket:n.currentBucket});break;case"BUCKET_IMAGE":this._handleBucketImage(n);break}}post(n,t){this._worker&&(t?this._worker.postMessage(n,t):this._worker.postMessage(n))}set onCrash(n){this._onCrash=n}set onBooted(n){this._onBootedCallback=n}_handleWorkerCrash(n){console.error(`[WorkerProxy] Worker crashed: ${n}. Terminating worker.`),this._worker&&(this._worker.terminate(),this._worker=null),this._pendingSnapshots.forEach(t=>t(null)),this._pendingSnapshots.clear(),this._pendingPicks.forEach(t=>t(null)),this._pendingPicks.clear(),this._pendingFocusPicks.forEach(t=>t(-1)),this._pendingFocusPicks.clear(),this._pendingHistograms.forEach(t=>t(new Float32Array(0))),this._pendingHistograms.clear(),this._onCrash&&this._onCrash(n)}terminateWorker(){this._handleWorkerCrash("Manual termination")}get isBooted(){return this._shadow.isBooted}get isCompiling(){return this._shadow.isCompiling}get isExporting(){return this._isExporting}get isBucketRendering(){return this._isBucketRendering}get sceneOffset(){return this._localOffset}get lastGeneratedFrag(){return this._lastGeneratedFrag}get accumulationCount(){return this._shadow.accumulationCount}get frameCount(){return this._shadow.frameCount}get lastCompileDuration(){return this._shadow.lastCompileDuration}get lastMeasuredDistance(){return this._shadow.lastMeasuredDistance}set lastMeasuredDistance(n){this._shadow.lastMeasuredDistance=n}get hasCompiledShader(){return this._shadow.hasCompiledShader}get dirty(){return this._shadow.dirty}set dirty(n){n&&this.post({type:"SET_DIRTY"})}get isPaused(){return this._shadow.isPaused}set isPaused(n){this.post({type:"PAUSE",paused:n})}get shouldSnapCamera(){return!1}set shouldSnapCamera(n){n&&this.post({type:"SNAP_CAMERA"})}get isGizmoInteracting(){return this._isGizmoInteracting}set isGizmoInteracting(n){this._isGizmoInteracting=n}get isCameraInteracting(){return!1}set isCameraInteracting(n){n&&this.post({type:"MARK_INTERACTION"})}bootWithConfig(n,t){if(this._bootSent){console.log("[WorkerProxy] Boot already in progress — restarting worker"),this._bootSent=!1,this.restart(n,t),this.post({type:"BOOT",config:n,camera:t}),this._bootSent=!0;return}this.post({type:"BOOT",config:n,camera:t}),this._bootSent=!0}setUniform(n,t,o=!1){this.post({type:"UNIFORM",key:n,value:t,noReset:o})}setPreviewSampleCap(n){this.post({type:"SET_SAMPLE_CAP",n})}resetAccumulation(){this.post({type:"RESET_ACCUM"})}markInteraction(){this.post({type:"MARK_INTERACTION"})}updateTexture(n,t){if(t){const o=t.indexOf(";base64,"),i=o>=0?t.substring(o+8,o+12):"";t.startsWith("data:image/vnd.radiance")||t.startsWith("data:image/x-hdr")||i.startsWith("Iz8")||i.startsWith("Iz9")?fetch(t).then(r=>r.arrayBuffer()).then(r=>{this.post({type:"TEXTURE_HDR",textureType:n,buffer:r},[r])}).catch(r=>console.error("[WorkerProxy] HDR texture transfer failed:",r)):fetch(t).then(r=>r.blob()).then(r=>createImageBitmap(r,{premultiplyAlpha:"none",imageOrientation:"flipY"})).then(r=>{this.post({type:"TEXTURE",textureType:n,bitmap:r},[r])}).catch(r=>console.error("[WorkerProxy] Texture transfer failed:",r))}else this.post({type:"TEXTURE",textureType:n,bitmap:null})}queueOffsetSync(n){this._pendingOffsetSync={x:n.x,y:n.y,z:n.z,xL:n.xL,yL:n.yL,zL:n.zL},this.setShadowOffset(n)}setShadowOffset(n){this._localOffset={...n},this._offsetGuarded=!0,this._offsetGuardTimer&&clearTimeout(this._offsetGuardTimer),this._offsetGuardTimer=setTimeout(()=>{this._offsetGuarded=!1,this._offsetGuardTimer=null},2e3)}applyOffsetShift(n,t,o){}resolveLightPosition(n,t){return n}measureDistanceAtScreenPoint(n,t,o,i){return this._shadow.lastMeasuredDistance}pickWorldPosition(n,t,o){if(!o)return null;const i=crypto.randomUUID();return new Promise(s=>{this._pendingPicks.set(i,s),this.post({type:"PICK_WORLD_POSITION",id:i,x:n,y:t}),setTimeout(()=>{this._pendingPicks.has(i)&&(this._pendingPicks.delete(i),s(null))},5e3)})}startFocusPick(n,t){const o=crypto.randomUUID();return new Promise(i=>{this._pendingFocusPicks.set(o,i),this.post({type:"FOCUS_PICK_START",id:o,x:n,y:t}),setTimeout(()=>{this._pendingFocusPicks.has(o)&&(this._pendingFocusPicks.delete(o),i(-1))},5e3)})}sampleFocusPick(n,t){const o=crypto.randomUUID();return new Promise(i=>{this._pendingFocusPicks.set(o,i),this.post({type:"FOCUS_PICK_SAMPLE",id:o,x:n,y:t}),setTimeout(()=>{this._pendingFocusPicks.has(o)&&(this._pendingFocusPicks.delete(o),i(-1))},2e3)})}endFocusPick(){this.post({type:"FOCUS_PICK_END"})}captureSnapshot(){const n=crypto.randomUUID();return new Promise(t=>{this._pendingSnapshots.set(n,t),this.post({type:"CAPTURE_SNAPSHOT",id:n}),setTimeout(()=>{this._pendingSnapshots.has(n)&&(this._pendingSnapshots.delete(n),t(null))},1e4)})}get gpuInfo(){return this._gpuInfo||"Generic WebGL Device"}requestHistogramReadback(n){const t=crypto.randomUUID();return new Promise(o=>{this._pendingHistograms.set(t,o),this.post({type:"HISTOGRAM_READBACK",id:t,source:n}),setTimeout(()=>{this._pendingHistograms.has(t)&&(this._pendingHistograms.delete(t),o(new Float32Array(0)))},5e3)})}getCompiledFragmentShader(){const n=crypto.randomUUID();return new Promise(t=>{this._pendingShaderSource.set(n,t),this.post({type:"GET_SHADER_SOURCE",id:n,variant:"compiled"}),setTimeout(()=>{this._pendingShaderSource.has(n)&&(this._pendingShaderSource.delete(n),t(null))},5e3)})}getTranslatedFragmentShader(){const n=crypto.randomUUID();return new Promise(t=>{this._pendingShaderSource.set(n,t),this.post({type:"GET_SHADER_SOURCE",id:n,variant:"translated"}),setTimeout(()=>{this._pendingShaderSource.has(n)&&(this._pendingShaderSource.delete(n),t(null))},5e3)})}checkHalfFloatAlphaSupport(){return!0}sendRenderTick(n,t,o,i){if(this._pendingOffsetSync){const s=this._pendingOffsetSync;this._pendingOffsetSync=null,this.post({type:"RENDER_TICK",camera:n,offset:s,delta:o,timestamp:performance.now(),renderState:i,syncOffset:!0})}else this.post({type:"RENDER_TICK",camera:n,offset:t,delta:o,timestamp:performance.now(),renderState:i})}resizeWorker(n,t,o){this.post({type:"RESIZE",width:n,height:t,dpr:o})}sendConfig(n){this.post({type:"CONFIG",config:n})}registerFormula(n,t){this.post({type:"REGISTER_FORMULA",id:n,shader:t})}startExport(n,t){return this._isExporting=!0,new Promise((o,i)=>{this._exportReady=()=>{this._exportReady=null,o()},this._exportError=l=>{this._exportError=null,i(new Error(l))};let s=null;if(t){const l=t;s=new WritableStream({write(c){return l.write(c)},close(){return l.close()},abort(c){return l.abort(c)}})}const r=[];s&&r.push(s),this.post({type:"EXPORT_START",config:n,stream:s},r),setTimeout(()=>{this._exportReady&&(this._exportReady=null,i(new Error("Export start timed out")))},1e4)})}renderExportFrame(n,t,o,i,s,r){return new Promise(l=>{this._exportFrameDone=c=>{this._exportFrameDone=null,l(c)},this.post({type:"EXPORT_RENDER_FRAME",frameIndex:n,time:t,camera:o,offset:i,renderState:s,modulations:r})})}finishExport(){return new Promise((n,t)=>{this._exportComplete=o=>{this._exportComplete=null,n(o)},this._exportError=o=>{this._exportError=null,t(new Error(o))},this.post({type:"EXPORT_FINISH"}),setTimeout(()=>{this._exportComplete&&(this._exportComplete=null,t(new Error("Export finish timed out")))},6e4)})}cancelExport(){this.post({type:"EXPORT_CANCEL"}),this._isExporting=!1}startBucketRender(n,t,o){this._isBucketRendering=!0,this.post({type:"BUCKET_START",exportImage:n,config:t,exportData:o?{preset:JSON.stringify(o.preset),name:o.name,version:o.version}:void 0})}stopBucketRender(){this.post({type:"BUCKET_STOP"}),this._isBucketRendering=!1}async _handleBucketImage(n){const{pixels:t,width:o,height:i,presetJson:s,filename:r}=n,l=document.createElement("canvas");l.width=o,l.height=i;const c=l.getContext("2d");if(!c)return;const d=new ImageData(new Uint8ClampedArray(t.buffer),o,i);c.putImageData(d,0,0),l.toBlob(async f=>{if(f)try{const h=await Zo(f,"FractalData",s),p=URL.createObjectURL(h),u=document.createElement("a");u.download=r,u.href=p,u.click(),URL.revokeObjectURL(p)}catch(h){console.error("Failed to inject metadata",h);const p=document.createElement("a");p.download=r,p.href=l.toDataURL("image/png"),p.click()}},"image/png")}}let $a=null;function xe(){return $a||($a=new qi),$a}class be{constructor(n={x:0,y:0,z:0,xL:0,yL:0,zL:0}){Q(this,"offset");Q(this,"_rotMatrix",new Lt);Q(this,"_camRight",new V);Q(this,"_camUp",new V);Q(this,"_camForward",new V);Q(this,"_visualVector",new V);Q(this,"_quatInverse",new Oe);Q(this,"_relativePos",new V);Q(this,"smoothedPos",new V);Q(this,"smoothedQuat",new Oe);Q(this,"smoothedFov",60);Q(this,"prevOffsetState");Q(this,"isLocked",!1);Q(this,"isFirstFrame",!0);this.offset={...n},this.prevOffsetState={...n}}get state(){return{...this.offset}}set state(n){this.offset={...n},be.normalize(this.offset)}static split(n){const t=Math.fround(n),o=n-t;return{high:t,low:o}}static normalize(n){if(Math.abs(n.xL)>.5){const o=Math.floor(n.xL+.5);n.x+=o,n.xL-=o}if(Math.abs(n.yL)>.5){const o=Math.floor(n.yL+.5);n.y+=o,n.yL-=o}if(Math.abs(n.zL)>.5){const o=Math.floor(n.zL+.5);n.z+=o,n.zL-=o}}setFromUnified(n,t,o){const i=be.split(n),s=be.split(t),r=be.split(o);this.offset.x=i.high,this.offset.xL=i.low,this.offset.y=s.high,this.offset.yL=s.low,this.offset.z=r.high,this.offset.zL=r.low,be.normalize(this.offset)}move(n,t,o){this.offset.xL+=n,this.offset.yL+=t,this.offset.zL+=o,be.normalize(this.offset)}absorbCamera(n){this.offset.xL+=n.x,this.offset.yL+=n.y,this.offset.zL+=n.z,be.normalize(this.offset)}resetSmoothing(){this.isFirstFrame=!0,this.prevOffsetState={...this.offset},this.isLocked=!1}updateSmoothing(n,t,o,i,s){if(!s&&!i&&!this.isFirstFrame){this.smoothedPos.copy(n.position),this.smoothedQuat.copy(n.quaternion),this.smoothedFov=t,this.prevOffsetState={...this.offset},this.isLocked=!0;return}if(this.isFirstFrame||i){this.smoothedPos.copy(n.position),this.smoothedQuat.copy(n.quaternion),this.smoothedFov=t,this.prevOffsetState={...this.offset},this.isFirstFrame=!1,this.isLocked=!1;return}const r=this.offset,l=this.prevOffsetState;if(l.x!==r.x||l.y!==r.y||l.z!==r.z||l.xL!==r.xL||l.yL!==r.yL||l.zL!==r.zL){const d=l.x-r.x+(l.xL-r.xL),f=l.y-r.y+(l.yL-r.yL),h=l.z-r.z+(l.zL-r.zL);if(Math.abs(d)>10||Math.abs(f)>10||Math.abs(h)>10){this.resetSmoothing(),this.smoothedPos.copy(n.position),this.smoothedQuat.copy(n.quaternion);return}this.smoothedPos.x+=d,this.smoothedPos.y+=f,this.smoothedPos.z+=h,this.prevOffsetState={...r}}const c=this.smoothedPos.distanceToSquared(n.position);if(this.isLocked?c>1e-18&&(this.isLocked=!1):c<1e-21&&(this.isLocked=!0),this.isLocked)this.smoothedPos.copy(n.position);else{const d=1-Math.exp(-40*o);this.smoothedPos.lerp(n.position,d)}this.smoothedQuat.copy(n.quaternion),this.smoothedFov=t}getUnifiedCameraState(n,t){const o={...this.offset};return o.xL+=n.position.x,o.yL+=n.position.y,o.zL+=n.position.z,be.normalize(o),{position:{x:0,y:0,z:0},rotation:{x:n.quaternion.x,y:n.quaternion.y,z:n.quaternion.z,w:n.quaternion.w},sceneOffset:o,targetDistance:t>0?t:3.5}}applyCameraState(n,t){if(t.sceneOffset){const d={...t.sceneOffset};d.xL+=t.position.x,d.yL+=t.position.y,d.zL+=t.position.z,this.state=d}const o=t.rotation,i=o.x??o._x??0,s=o.y??o._y??0,r=o.z??o._z??0,l=o.w??o._w??1;n.position.set(0,0,0),n.quaternion.set(i,s,r,l).normalize();const c=new V(0,1,0).applyQuaternion(n.quaternion);n.up.copy(c),n.updateMatrixWorld(),this.resetSmoothing(),this.smoothedPos.set(0,0,0),this.smoothedQuat.copy(n.quaternion)}updateShaderUniforms(n,t,o){const i=this.offset.x+this.offset.xL+n.x,s=this.offset.y+this.offset.yL+n.y,r=this.offset.z+this.offset.zL+n.z,l=Math.fround(i),c=Math.fround(s),d=Math.fround(r);t.set(l,c,d),o.set(i-l,s-c,r-d)}updateCameraBasis(n,t,o){const i=n;this._rotMatrix.makeRotationFromQuaternion(i.quaternion);const s=this._rotMatrix.elements;this._camRight.set(s[0],s[1],s[2]),this._camUp.set(s[4],s[5],s[6]),this._camForward.set(-s[8],-s[9],-s[10]);let r=1,l=1;o&&o.isOrtho?(l=o.orthoScale/2,r=l*i.aspect):(l=Math.tan(ut.degToRad(i.fov)*.5),r=l*i.aspect),t[He.CamBasisX].value.copy(this._camRight).multiplyScalar(r),t[He.CamBasisY].value.copy(this._camUp).multiplyScalar(l),t[He.CamForward].value.copy(this._camForward),t[He.CameraPosition].value.set(0,0,0)}getLightShaderVector(n,t,o,i){const s=this.offset;t?(this._relativePos.set(n.x,n.y,n.z).applyQuaternion(o.quaternion),i.copy(this._relativePos)):i.set(n.x-(s.x+s.xL)-o.position.x,n.y-(s.y+s.yL)-o.position.y,n.z-(s.z+s.zL)-o.position.z)}resolveRealWorldPosition(n,t,o){const i=this.offset;return t?(this._visualVector.set(n.x,n.y,n.z).applyQuaternion(o.quaternion),{x:o.position.x+this._visualVector.x+(i.x+i.xL),y:o.position.y+this._visualVector.y+(i.y+i.yL),z:o.position.z+this._visualVector.z+(i.z+i.zL)}):(this._visualVector.set(n.x-(i.x+i.xL)-o.position.x,n.y-(i.y+i.yL)-o.position.y,n.z-(i.z+i.zL)-o.position.z),this._quatInverse.copy(o.quaternion).invert(),this._visualVector.applyQuaternion(this._quatInverse),{x:this._visualVector.x,y:this._visualVector.y,z:this._visualVector.z})}resolveRealWorldRotation(n,t,o){const i=new V(0,0,-1).applyEuler(new _e(n.x,n.y,n.z,"YXZ"));t?i.applyQuaternion(o.quaternion):i.applyQuaternion(o.quaternion.clone().invert());const s=new Oe().setFromUnitVectors(new V(0,0,-1),i),r=new _e().setFromQuaternion(s,"YXZ");return{x:r.x,y:r.y,z:r.z}}}let Ma=null,Ko=null,xt=null,dt=null,Jo=!1;function Vi(e){Ma=e}function Yi(e){Ko=e}function Je(){return Ma}function aa(){return Ko}function Xi(e){const n=z.getState().optics,t=n?n.camType>.5&&n.camType<1.5:!1;if(Jo=t,t){const o=n.orthoScale??2,s=e.aspect||1,r=o/2,l=r*s;dt?(dt.left=-l,dt.right=l,dt.top=r,dt.bottom=-r):dt=new Ei(-l,l,r,-r,.001,1e4),dt.position.copy(e.position),dt.quaternion.copy(e.quaternion),dt.updateProjectionMatrix(),dt.updateMatrixWorld()}else{xt||(xt=new Li),xt.position.copy(e.position),xt.quaternion.copy(e.quaternion);const o=e;o.fov!==void 0&&(xt.fov=o.fov,xt.aspect=o.aspect,xt.updateProjectionMatrix()),xt.updateMatrixWorld()}}function na(){return Jo?dt||Ma:xt||Ma}const Zt=xe(),Ye={getUnifiedPosition:(e,n)=>new V(n.x+n.xL+e.x,n.y+n.yL+e.y,n.z+n.zL+e.z),getUnifiedFromEngine:()=>{const e=Je()||Zt.activeCamera;return e?Ye.getUnifiedPosition(e.position,Zt.sceneOffset):new V},getRotationFromEngine:()=>{const e=Je()||Zt.activeCamera;return e?e.quaternion.clone():new Oe},getDistanceFromEngine:()=>{const e=Je()||Zt.activeCamera;if(e){const n=e.position.length();if(n>.001)return n}return null},getRotationDegrees:e=>{const n=new Oe(e.x,e.y,e.z,e.w),t=new _e().setFromQuaternion(n);return new V(ut.radToDeg(t.x),ut.radToDeg(t.y),ut.radToDeg(t.z))},teleportPosition:(e,n,t)=>{const o=be.split(e.x),i=be.split(e.y),s=be.split(e.z),r={position:{x:0,y:0,z:0},sceneOffset:{x:o.high,y:i.high,z:s.high,xL:o.low,yL:i.low,zL:s.low}};if(n)r.rotation=n;else{const l=Je()||Zt.activeCamera;if(l){const c=l.quaternion;r.rotation={x:c.x,y:c.y,z:c.z,w:c.w}}}t!==void 0&&(r.targetDistance=t),Y.emit(ge.CAMERA_TELEPORT,r)},teleportRotation:e=>{if(isNaN(e.x)||isNaN(e.y)||isNaN(e.z))return;const n=new _e(ut.degToRad(e.x),ut.degToRad(e.y),ut.degToRad(e.z)),t=new Oe().setFromEuler(n),o=Ye.getUnifiedFromEngine(),i=be.split(o.x),s=be.split(o.y),r=be.split(o.z);Y.emit(ge.CAMERA_TELEPORT,{position:{x:0,y:0,z:0},rotation:{x:t.x,y:t.y,z:t.z,w:t.w},sceneOffset:{x:i.high,y:s.high,z:r.high,xL:i.low,yL:s.low,zL:r.low}})}},Zi="useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";let nt=(e=21)=>{let n="",t=crypto.getRandomValues(new Uint8Array(e|=0));for(;e--;)n+=Zi[t[e]&63];return n};const Ae=xe(),Wn=e=>typeof e.setOptics=="function"?e.setOptics:null,Qi=(e,n)=>({cameraMode:"Orbit",sceneOffset:{x:0,y:0,z:1,xL:0,yL:0,zL:-.24751033974403658},cameraRot:{x:0,y:0,z:0,w:1},targetDistance:3.5,undoStack:[],redoStack:[],savedCameras:[],activeCameraId:null,setCameraMode:t=>e({cameraMode:t}),setSceneOffset:t=>{const o={x:t.x,y:t.y,z:t.z,xL:t.xL||0,yL:t.yL||0,zL:t.zL||0};Ae.virtualSpace?(Ae.virtualSpace.state=o,e({sceneOffset:Ae.virtualSpace.state}),Y.emit("offset_set",Ae.virtualSpace.state)):(e({sceneOffset:o}),Y.emit("offset_set",o))},setActiveCameraId:t=>e({activeCameraId:t}),applyCameraState:t=>{e({cameraRot:t.rotation,sceneOffset:t.sceneOffset,targetDistance:t.targetDistance||3.5})},addSavedCamera:t=>{e(o=>({savedCameras:[...o.savedCameras,t],activeCameraId:t.id}))},updateCamera:(t,o)=>{e(i=>({savedCameras:i.savedCameras.map(s=>s.id===t?{...s,...o}:s)}))},deleteCamera:t=>{e(o=>({savedCameras:o.savedCameras.filter(i=>i.id!==t),activeCameraId:o.activeCameraId===t?null:o.activeCameraId}))},reorderCameras:(t,o)=>{e(i=>{const s=[...i.savedCameras],[r]=s.splice(t,1);return s.splice(o,0,r),{savedCameras:s}})},addCamera:t=>{const o=n(),i=Ye.getUnifiedFromEngine(),s=Ye.getRotationFromEngine(),r=Ae.lastMeasuredDistance>0&&Ae.lastMeasuredDistance<1e3?Ae.lastMeasuredDistance:o.targetDistance,l=be.split(i.x),c=be.split(i.y),d=be.split(i.z),f={position:{x:0,y:0,z:0},rotation:{x:s.x,y:s.y,z:s.z,w:s.w},sceneOffset:{x:l.high,y:c.high,z:d.high,xL:l.low,yL:c.low,zL:d.low},targetDistance:r},h={...o.optics},p=t||`Camera ${o.savedCameras.length+1}`,u={id:nt(),label:p,position:f.position,rotation:f.rotation,sceneOffset:f.sceneOffset,targetDistance:f.targetDistance,optics:h};e(g=>({savedCameras:[...g.savedCameras,u],activeCameraId:u.id}))},selectCamera:t=>{if(t===null){e({activeCameraId:null});return}const o=n().savedCameras.find(i=>i.id===t);if(o){if(Y.emit("camera_transition",o),e({activeCameraId:t,cameraRot:o.rotation,sceneOffset:o.sceneOffset,targetDistance:o.targetDistance||3.5}),o.optics){const i=Wn(n());i&&i(o.optics)}Ae.resetAccumulation()}},duplicateCamera:t=>{const o=n(),i=o.savedCameras.find(c=>c.id===t);if(!i)return;const s={...JSON.parse(JSON.stringify(i)),id:nt(),label:i.label+" (copy)"},r=o.savedCameras.indexOf(i),l=[...o.savedCameras];if(l.splice(r+1,0,s),e({savedCameras:l,activeCameraId:s.id}),Y.emit("camera_teleport",s),e({cameraRot:s.rotation,sceneOffset:s.sceneOffset,targetDistance:s.targetDistance||3.5}),s.optics){const c=Wn(n());c&&c(s.optics)}Ae.resetAccumulation()},resetCamera:()=>{e({activeCameraId:null});const t=n().formula,o=we.get(t),i=o==null?void 0:o.defaultPreset,s=(i==null?void 0:i.sceneOffset)||{x:0,y:0,z:0,xL:0,yL:0,zL:0},r=(i==null?void 0:i.cameraPos)||{x:0,y:0,z:3.5},l=(i==null?void 0:i.cameraRot)||{x:0,y:0,z:0,w:1},c=(i==null?void 0:i.targetDistance)||3.5,d=s.x+s.xL+r.x,f=s.y+s.yL+r.y,h=s.z+s.zL+r.z,p=be.split(d),u=be.split(f),g=be.split(h),v={x:p.high,y:u.high,z:g.high,xL:p.low,yL:u.low,zL:g.low};n().setSceneOffset(v),e({cameraRot:l,targetDistance:c});const y={position:{x:0,y:0,z:0},rotation:l,sceneOffset:v,targetDistance:c};Y.emit("reset_accum",void 0),Y.emit("camera_teleport",y)},undoCamera:()=>{const{undoStack:t,redoStack:o}=n();if(t.length===0)return;const i=t[t.length-1];let s;if(Ae.activeCamera&&Ae.virtualSpace)s=Ae.virtualSpace.getUnifiedCameraState(Ae.activeCamera,n().targetDistance),Ae.virtualSpace.applyCameraState(Ae.activeCamera,i);else{const r=n();s={position:{x:0,y:0,z:0},rotation:r.cameraRot,sceneOffset:r.sceneOffset,targetDistance:r.targetDistance}}i.sceneOffset&&e({sceneOffset:i.sceneOffset}),e({cameraRot:i.rotation,targetDistance:i.targetDistance||3.5,redoStack:[...o,s],undoStack:t.slice(0,-1)}),Y.emit("reset_accum",void 0),Y.emit("camera_teleport",i)},redoCamera:()=>{const{undoStack:t,redoStack:o}=n();if(o.length===0)return;const i=o[o.length-1];let s;if(Ae.activeCamera&&Ae.virtualSpace)s=Ae.virtualSpace.getUnifiedCameraState(Ae.activeCamera,n().targetDistance),Ae.virtualSpace.applyCameraState(Ae.activeCamera,i);else{const r=n();s={position:{x:0,y:0,z:0},rotation:r.cameraRot,sceneOffset:r.sceneOffset,targetDistance:r.targetDistance}}i.sceneOffset&&e({sceneOffset:i.sceneOffset}),e({cameraRot:i.rotation,targetDistance:i.targetDistance||3.5,undoStack:[...t,s],redoStack:o.slice(0,-1)}),Y.emit("reset_accum",void 0),Y.emit("camera_teleport",i)}});class Ki{constructor(){Q(this,"features",new Map);Q(this,"sortedCache",null)}register(n){if(n.dependsOn)for(const t of n.dependsOn)this.features.has(t)||console.warn(`[FeatureRegistry] "${n.id}" depends on "${t}" which is not yet registered. Ensure registration order is correct.`);this.features.set(n.id,n),this.sortedCache=null}get(n){return this.features.get(n)}getAll(){return this.sortedCache?this.sortedCache:(this.sortedCache=this.topologicalSort(),this.sortedCache)}getTabs(){return Array.from(this.features.values()).filter(n=>n.tabConfig).map(n=>({id:n.id,...n.tabConfig})).sort((n,t)=>n.order-t.order)}getViewportOverlays(){return Array.from(this.features.values()).filter(n=>n.viewportConfig).map(n=>({id:n.id,...n.viewportConfig}))}getMenuFeatures(){return Array.from(this.features.values()).filter(n=>n.menuConfig).map(n=>({id:n.id,...n.menuConfig}))}getExtraMenuItems(){const n=[];return this.features.forEach(t=>{t.menuItems&&t.menuItems.forEach(o=>n.push({...o,featureId:t.id}))}),n}getEngineFeatures(){return Array.from(this.features.values()).filter(n=>!!n.engineConfig)}getDictionary(){const n={formula:"f",cameraPos:"cp",cameraRot:"cr",sceneOffset:"so",targetDistance:"td",animations:"an",sequence:"sq",features:{_alias:"p",children:{}}};return this.features.forEach(t=>{const o=t.shortId||t.id,i={};Object.entries(t.params).forEach(([s,r])=>{r.shortId&&(i[s]=r.shortId)}),n.features.children[t.id]={_alias:o,children:i}}),n}getUniformDefinitions(){const n=[];return this.features.forEach(t=>{Object.values(t.params).forEach(o=>{if(o.uniform){let i=o.type,s=o.default;i==="color"&&(i="vec3"),i==="boolean"&&(i="float",s=s?1:0),(i==="image"||i==="gradient")&&(i="sampler2D",s=null),n.push({name:o.uniform,type:i,default:s})}}),t.extraUniforms&&n.push(...t.extraUniforms)}),n}topologicalSort(){const n=Array.from(this.features.values()),t=new Map;n.forEach((l,c)=>t.set(l.id,c));const o=new Map,i=new Map;for(const l of n)o.set(l.id,0),i.has(l.id)||i.set(l.id,[]);for(const l of n)if(l.dependsOn)for(const c of l.dependsOn)this.features.has(c)&&(o.set(l.id,(o.get(l.id)||0)+1),i.get(c).push(l.id));const s=[];for(const l of n)o.get(l.id)===0&&s.push(l.id);const r=[];for(;s.length>0;){s.sort((c,d)=>(t.get(c)||0)-(t.get(d)||0));const l=s.shift();r.push(this.features.get(l));for(const c of i.get(l)||[]){const d=(o.get(c)||1)-1;o.set(c,d),d===0&&s.push(c)}}if(r.length!==n.length){const l=n.filter(c=>!r.includes(c)).map(c=>c.id);return console.error(`[FeatureRegistry] Dependency cycle detected involving: ${l.join(", ")}`),n}return r}}const ne=new Ki,Ji=xe(),es=e=>{const n={formula:e.formula,pipeline:e.pipeline,renderRegion:e.renderRegion?{...e.renderRegion}:null};return ne.getAll().forEach(o=>{const i=e[o.id];i&&(n[o.id]=JSON.parse(JSON.stringify(i)))}),n},qn=(e,n,t)=>{const o=t();n(e),Object.keys(e).forEach(i=>{const s=i,r=e[s];if(s==="formula"){Y.emit("config",{formula:r});return}const l="set"+s.charAt(0).toUpperCase()+s.slice(1);if(typeof o[l]=="function"){o[l](r);return}if(s==="pipeline"){o.setPipeline(r);return}if(s==="graph"){o.setGraph(r);return}const c="set"+s.charAt(0).toUpperCase()+s.slice(1);typeof o[c]=="function"&&!ne.get(s)&&o[c](r)}),Ji.resetAccumulation()},ts=1500;let Vn=0;const as=(e,n)=>({paramUndoStack:[],paramRedoStack:[],interactionSnapshot:null,handleInteractionStart:t=>{if(e({isUserInteracting:!0}),t&&typeof t=="object"&&t.position){const i=t,s=Date.now();s-Vn<ts&&n().undoStack.length>0||(e(l=>{const c=[...l.undoStack,i];return{undoStack:c.length>50?c.slice(-50):c,redoStack:[]}}),Vn=s);return}const o=es(n());e({interactionSnapshot:o})},handleInteractionEnd:()=>{e({isUserInteracting:!1});const{interactionSnapshot:t,aaMode:o,aaLevel:i,msaaSamples:s,dpr:r}=n();let l=o==="Auto"||o==="Always"?i:1;if(Math.abs(r-l)>1e-4&&(e({dpr:l}),Y.emit("config",{msaaSamples:o==="Auto"||o==="Always"?s:1}),Y.emit("reset_accum",void 0)),!t)return;const c=n(),d={};let f=!1;Object.keys(t).forEach(h=>{const p=h,u=t[p],g=c[p];JSON.stringify(u)!==JSON.stringify(g)&&(d[p]=u,f=!0)}),e(f?h=>({paramUndoStack:[...h.paramUndoStack,d],paramRedoStack:[],interactionSnapshot:null}):{interactionSnapshot:null})},undoParam:()=>{const{paramUndoStack:t,paramRedoStack:o}=n();if(t.length===0)return;const i=t[t.length-1],s=t.slice(0,-1),r=n(),l={};Object.keys(i).forEach(c=>{l[c]=r[c]}),qn(i,e,n),e({paramUndoStack:s,paramRedoStack:[...o,l]})},redoParam:()=>{const{paramUndoStack:t,paramRedoStack:o}=n();if(o.length===0)return;const i=o[o.length-1],s=o.slice(0,-1),r=n(),l={};Object.keys(i).forEach(c=>{l[c]=r[c]}),qn(i,e,n),e({paramUndoStack:[...t,l],paramRedoStack:s})},resetParamHistory:()=>{e({paramUndoStack:[],paramRedoStack:[],interactionSnapshot:null})}}),Yn=`
    if (uGlowIntensity > 0.0001) {
        float sharpness = max(1.0, uGlowSharpness);
        // Boost factor for visibility.
        float gFactor = exp(-sharpness * max(h.x, 0.0)) * uFudgeFactor * 0.4;
        
        #ifdef GLOW_FAST
            // Fast Mode: Accumulate scalar intensity only
            accAlpha += gFactor;
        #else
            // Quality Mode: Accumulate full vector color
            if (gFactor > 1.0e-6) {
                vec3 p_fractal_glow = applyPrecisionOffset(p + uCameraPosition, uSceneOffsetLow, uSceneOffsetHigh);
                accColor += getGlowColor(p_fractal_glow, h) * gFactor;
            }
        #endif
    }

    // Volumetric Fog
    if (uFogDensity > 0.0001) {
        float stepVal = max(h.x, 0.0001);
        // Corrected density factor: Reduced from 0.05 to 0.0005 (100x reduction)
        accDensity += (1.0 / (stepVal * 5.0 + 0.1)) * uFogDensity * uFudgeFactor * 0.0005;
    }
`,ns=`
    #ifdef GLOW_FAST
        if (accAlpha > 0.0001) {
            vec3 p_fractal_res = applyPrecisionOffset(p + uCameraPosition, uSceneOffsetLow, uSceneOffsetHigh);
            // Tint the accumulated intensity by the color at the hit point
            vec3 glowCol = getGlowColor(p_fractal_res, h);
            
            // Prevent blowout
            accColor += glowCol * min(accAlpha, 100.0);
        }
    #endif
`,os=`
    // --- FOG (Atmosphere Feature) ---
    float fogFactor = smoothstep(uFogNear, uFogFar, d) * uFogIntensity;
    vec3 fogColor = uFogColorLinear;

    // Volumetric fog absorption
    if (uFogDensity > 0.0001) {
        float volAlpha = clamp(volumetric * uFogIntensity, 0.0, 1.0);
        col = mix(col, fogColor, volAlpha);
    }

    // Distance fog
    if (uEnvBackgroundStrength > 0.001) {
        // Background visible: only fog geometry, preserve env map on miss
        if (d < MISS_DIST - 10.0) {
            col = mix(col, fogColor, fogFactor);
        }
    } else {
        col = mix(col, fogColor, fogFactor);
    }
`,rs=`
    // --- GLOW (Atmosphere Feature) ---
    if (uGlowIntensity > 0.0001) {
        col += glow * uGlowIntensity;
    }
`,is={id:"atmosphere",shortId:"at",name:"Atmosphere",category:"Rendering",engineConfig:{toggleParam:"glowEnabled",mode:"compile",label:"Volumetric Glow",groupFilter:"engine_settings"},params:{glowEnabled:{type:"boolean",default:!0,label:"Enable Glow",shortId:"ge",group:"main",hidden:!0,noReset:!0,onUpdate:"compile"},glowQuality:{type:"float",default:0,label:"Glow Algo",shortId:"gq",group:"engine_settings",options:[{label:"Accurate (Vector)",value:0},{label:"Fast (Scalar)",value:1}],description:"Vector accumulates color per-step. Scalar accumulates intensity only (faster).",onUpdate:"compile",noReset:!0},fogIntensity:{type:"float",default:0,label:"Fog Intensity",shortId:"fi",uniform:"uFogIntensity",min:0,max:1,step:.01,group:"fog"},fogNear:{type:"float",default:0,label:"Fog Start",shortId:"fn",uniform:"uFogNear",min:0,max:10,step:.1,scale:"square",group:"fog",parentId:"fogIntensity",condition:{gt:0}},fogFar:{type:"float",default:5,label:"Fog End",shortId:"ff",uniform:"uFogFar",min:0,max:10,step:.1,scale:"square",group:"fog",parentId:"fogIntensity",condition:{gt:0}},fogColor:{type:"color",default:new qe(0,0,0),label:"Fog Color",shortId:"fc",uniform:"uFogColor",group:"fog",parentId:"fogIntensity",condition:{gt:0}},fogDensity:{type:"float",default:.01,label:"Fog Density",shortId:"fd",uniform:"uFogDensity",min:.001,max:5,step:.01,scale:"log",group:"fog",parentId:"fogIntensity",condition:{gt:0},description:"Basic volumetric fog absorption density. For god rays and scatter, enable Volumetric Scattering in Engine."},glowIntensity:{type:"float",default:0,label:"Glow Strength",shortId:"gi",uniform:"uGlowIntensity",min:0,max:5,step:.01,scale:"log",group:"glow",condition:{param:"glowEnabled",bool:!0}},glowSharpness:{type:"float",default:50,label:"Tightness",shortId:"gs",uniform:"uGlowSharpness",min:1,max:1e3,step:1,scale:"log",group:"glow",parentId:"glowIntensity",condition:[{gt:0},{param:"glowEnabled",bool:!0}]},glowMode:{type:"boolean",default:!0,label:"Glow Source",shortId:"gm",uniform:"uGlowMode",group:"glow",parentId:"glowIntensity",condition:[{gt:0},{param:"glowEnabled",bool:!0}],options:[{label:"Surface",value:!1},{label:"Color",value:!0}]},glowColor:{type:"color",default:new qe(1,1,1),label:"Glow Color",shortId:"gl",uniform:"uGlowColor",group:"glow",parentId:"glowMode",condition:[{bool:!0},{param:"glowEnabled",bool:!0}]}},inject:(e,n,t)=>{if(t!=="Main")return;e.addPostProcessLogic(os),e.addPostProcessLogic(rs);const o=n.atmosphere;o&&o.glowEnabled&&(o.glowQuality>.5?(e.addDefine("GLOW_FAST","1"),e.addVolumeTracing(Yn,ns)):e.addVolumeTracing(Yn,""))}},ss=`
// ------------------------------------------------------------------
// DROSTE EFFECT (ESCHER MATH)
// Ported faithfully from Tom Beddard's Pixel Bender script
// ------------------------------------------------------------------

#define DROSTE_PI 3.141592653
#define DROSTE_TWOPI 6.283185307
#define DROSTE_EPS 1.0e-9

// Complex Math Helpers
// NOTE: Droste always compiles into the post-processing shader (not the formula shader),
// so cMult/cDiv/cExp/cLog won't collide with Frag builtins (cMul/cPow) which live in the formula shader.
vec2 cMult(vec2 a, vec2 b) { return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
vec2 cDiv(vec2 a, vec2 b) { float d = dot(b,b); return vec2(dot(a,b), a.y*b.x - a.x*b.y) / d; }
vec2 cExp(vec2 z) { return vec2(exp(z.x) * cos(z.y), exp(z.x) * sin(z.y)); }
vec2 cLog(vec2 z) { return vec2(log(length(z)), atan(z.y, z.x)); }

// Extended Math (Renamed to avoid GLSL built-in collisions)
float d_sinh(float x) { return (exp(x) - exp(-x)) * 0.5; }
float d_cosh(float x) { return (exp(x) + exp(-x)) * 0.5; }

vec2 cSin(vec2 z) { return vec2(sin(z.x) * d_cosh(z.y), cos(z.x) * d_sinh(z.y)); }
vec2 cCos(vec2 z) { return vec2(cos(z.x) * d_cosh(z.y), -sin(z.x) * d_sinh(z.y)); }

vec2 cTan(vec2 z) {
    float r = 2.0 * z.x;
    float i = 2.0 * z.y;
    float div = cos(r) + d_cosh(i);
    if (abs(div) < DROSTE_EPS) div = DROSTE_EPS;
    return vec2(sin(r)/div, d_sinh(i)/div);
}

// Complex Power: z^p
vec2 cPower(vec2 z, float p) {
    float r = length(z);
    if (r < DROSTE_EPS) return vec2(0.0);
    float a = atan(z.y, z.x);
    float newR = pow(r, p);
    float newA = a * p;
    return vec2(newR * cos(newA), newR * sin(newA));
}

// Returns vec3: .xy = UV, .z = Mask (1.0 = valid, 0.0 = invalid/transparent)
vec3 applyDroste(
    vec2 uv, 
    vec2 center, 
    float r1, float r2, 
    float period, float strands, 
    float zoom, float rot, 
    bool twist, float tilingMode,
    float rotateSpin,
    bool hyperDroste,
    float fractalPoints,
    bool autoPeriodicity,
    bool strandMirror,
    float rotatePolar
) {
    // 1. Shift & Normalize
    // We expect UV in 0..1 range. Center in -1..1 range (percentage)
    vec2 z = uv - 0.5 - (center * 0.01);
    
    // Adjust aspect ratio to square the calculation space
    float aspect = uResolution.x / uResolution.y;
    z.x *= aspect;
    
    // Scale radii to percentage (0.1 - 100 range from UI)
    float R1 = max(0.0001, r1 * 0.01);
    float R2 = max(R1 * 1.001, r2 * 0.01);
    
    float P2 = strands;
    float P1 = period;

    // --- AUTO PERIODICITY LOGIC ---
    // Matches Pixel Bender: p1 = p2/2.0 * (1.0 + sqrt(1.0 - pow(log(r2/r1)/PI, 2.0)))
    if (autoPeriodicity) {
        float logRatio = log(R2/R1);
        float ratioOverPi = logRatio / DROSTE_PI;
        float term = 1.0 - (ratioOverPi * ratioOverPi);
        
        if (term >= 0.0) {
            P1 = (P2 / 2.0) * (1.0 + sqrt(term));
        }
    }
    
    if (abs(P1) < 0.001) P1 = 0.001;
    
    // --- PRE-TRANSFORM DISTORTIONS ---
    
    // Hyper Droste (Complex Sine)
    if (hyperDroste) {
        z = cSin(z);
    }
    
    // Fractal Points (Complex Power + Tan)
    if (fractalPoints > 0.0) {
        z = cPower(z, fractalPoints);
        z = cTan(cMult(z, vec2(2.0, 0.0)));
    }
    
    // --- POLAR ROTATION ---
    // Ported from Pixel Bender: Stereo-graphic projection rotation
    if (abs(rotatePolar) > 0.001) {
        float theta = radians(rotatePolar);
        float cT = cos(theta);
        float sT = sin(theta);

        float zz = dot(z, z); // x^2 + y^2

        float div = (1.0 + zz + (1.0 - zz) * cT - 2.0 * z.x * sT) * 0.5;

        if (abs(div) < DROSTE_EPS) div = DROSTE_EPS;

        float numX = z.x * cT + (1.0 - zz) * sT * 0.5;
        
        // Complex division: (numX + i*y) / (div + 0i) = numX/div + i*y/div
        z.x = numX / div;
        z.y = z.y / div;
    }
    
    // Rotate Spin (Image Rotation independent of Spiral)
    // Matches Pixel Bender: z *= imageSpin
    if (abs(rotateSpin) > 0.001) {
        float rads = radians(rotateSpin);
        float s = sin(rads);
        float c = cos(rads);
        z = vec2(z.x*c - z.y*s, z.x*s + z.y*c);
    }

    // 2. Pre-Twist Transform
    if (twist) {
         // Apply Zoom & Rotation in log space effectively
         float angle = radians(rot);
         float scale = exp(zoom * 0.1); 
         // Manual rotation matrix
         float c = cos(angle); float s = sin(angle);
         z = vec2(z.x*c - z.y*s, z.x*s + z.y*c) / scale;
         
         // To Log-Polar
         z = cLog(cDiv(z, vec2(R1, 0.0)));
    } else {
        // Cartesian Log mapping for untwisted (Rectangular Projection)
        // Map Y to Angle [-PI, PI]
        z.y *= DROSTE_TWOPI; 
        
        // Map X to Log Radius
        float logWidth = log(R2/R1);
        z.x = z.x * logWidth; 
        
        // Align center
        z.x += logWidth * 0.5;

        // Linear Zoom/Rot application
        z.x -= zoom * 0.1;
        z.y += radians(rot);
    }
    
    // 3. Droste Conformal Map
    float logR = log(R2/R1);
    float angle = atan((P2/P1) * (logR / DROSTE_TWOPI));
    
    float f = cos(angle);
    vec2 beta = cMult(vec2(f, 0.0), cExp(vec2(0.0, angle)));
    
    // Transform Z
    z = cDiv(cMult(vec2(P1, 0.0), z), beta);
    
    // Inverse Log (Exp) to get back to Cartesian
    z = cMult(vec2(R1, 0.0), cExp(z));
    
    // 4. Infinite Tiling (The "Spiral into Infinity")
    float mode = floor(tilingMode + 0.1);
    
    bool doLoop = (mode < 1.5);
    bool doMirror = (abs(mode - 1.0) < 0.1);
    bool flipped = false;
    
    // Calculate Tile Rotation Angle
    float tileAngle = -DROSTE_TWOPI * P1;
    if (P2 > 0.0) tileAngle = -tileAngle;
    
    // Mirror Strand Logic: Divide rotation by number of strands
    // Matches Ref: if (strandMirror) angle /= p2;
    if (strandMirror && abs(P2) > 0.001) {
        tileAngle /= P2;
    }

    if (doLoop) {
        // Ratio determines the scaling and rotation per level
        vec2 ratio = cMult(vec2(R2/R1, 0.0), cExp(vec2(0.0, tileAngle)));
        vec2 ratioInv = cDiv(vec2(1.0, 0.0), ratio);

        float mag = length(z);
        
        // Iteratively scale until within bounds [R1, R2]
        // This simulates the "while" loop in the reference, but GLSL prefers fixed loops
        for(int i=0; i<12; i++) {
            if (mag >= R1 && mag <= R2) break;
            
            if (mag < R1) {
                z = cMult(z, ratio); // Grow
                mag = length(z);
                flipped = !flipped;
            } else if (mag > R2) {
                z = cMult(z, ratioInv); // Shrink
                mag = length(z);
                flipped = !flipped;
            }
        }
    }
    
    if (doMirror && flipped) {
        float r2 = dot(z, z);
        if(r2 > 1.0e-9) {
            z *= (R1 * R2) / r2;
        }
    }

    // 5. Map back to UV
    z.x /= aspect;
    z += 0.5 + (center * 0.01);
    
    float mask = 1.0;
    
    // 6. Apply Final Tiling Mode (Edge Handling)
    if (mode < 0.5) {
        // 0: Repeat
        z = fract(z);
    } else if (mode < 1.5) {
        // 1: Mirror (Standard edge mirroring)
        z.x = 1.0 - abs(mod(z.x, 2.0) - 1.0);
        z.y = 1.0 - abs(mod(z.y, 2.0) - 1.0);
    } else if (mode < 2.5) {
        // 2: Clamp
        z = clamp(z, 0.0, 1.0);
    } else {
        // 3: Transparent
        if (z.x < 0.0 || z.x > 1.0 || z.y < 0.0 || z.y > 1.0) {
            mask = 0.0;
        }
    }
    
    return vec3(z, mask);
}
`,ls={id:"droste",shortId:"dr",name:"Droste Effect",category:"Effects",params:{active:{type:"boolean",default:!1,label:"Droste Effect",shortId:"ac",uniform:"uDrosteActive",group:"main",noReset:!0},tiling:{type:"float",default:1,label:"Tiling Mode",shortId:"tm",uniform:"uDrosteTiling",group:"geometry",noReset:!0,condition:{param:"active",bool:!0},options:[{label:"Repeat",value:0},{label:"Mirror",value:1},{label:"Clamp",value:2},{label:"Transparent",value:3}]},center:{type:"vec2",default:new Te(0,0),label:"Center Shift",shortId:"cs",uniform:"uDrosteCenter",min:-100,max:100,step:.1,group:"geometry",condition:{param:"active",bool:!0},noReset:!0},radiusInside:{type:"float",default:5,label:"Inner Rad",shortId:"r1",uniform:"uDrosteR1",min:.1,max:100,step:.1,group:"geometry",layout:"half",condition:{param:"active",bool:!0},noReset:!0},radiusOutside:{type:"float",default:100,label:"Outer Rad",shortId:"r2",uniform:"uDrosteR2",min:1,max:200,step:.1,group:"geometry",layout:"half",condition:{param:"active",bool:!0},noReset:!0},strands:{type:"float",default:2,label:"Strands",shortId:"p2",uniform:"uDrosteStrands",min:-12,max:12,step:1,group:"structure",condition:{param:"active",bool:!0},noReset:!0},strandMirror:{type:"boolean",default:!1,label:"Mirror Strand",shortId:"sm",uniform:"uDrosteMirror",group:"structure",parentId:"strands",condition:{param:"active",bool:!0},noReset:!0},autoPeriodicity:{type:"boolean",default:!1,label:"Auto Period",shortId:"ap",uniform:"uDrosteAuto",group:"structure",condition:{param:"active",bool:!0},noReset:!0},periodicity:{type:"float",default:2,label:"Periodicity",shortId:"p1",uniform:"uDrostePeriodicity",min:-10,max:10,step:.1,group:"structure",parentId:"autoPeriodicity",condition:[{param:"active",bool:!0},{param:"autoPeriodicity",bool:!1}],noReset:!0},zoom:{type:"float",default:0,label:"Zoom",shortId:"zm",uniform:"uDrosteZoom",min:-10,max:10,step:.1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},rotate:{type:"float",default:0,label:"Spiral Rotate",shortId:"ro",uniform:"uDrosteRotate",min:-360,max:360,step:1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},rotateSpin:{type:"float",default:0,label:"Image Spin",shortId:"sp",uniform:"uDrosteSpin",min:-360,max:360,step:1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},rotatePolar:{type:"float",default:0,label:"Polar Rotate",shortId:"pr",uniform:"uDrostePolar",min:-360,max:360,step:1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},twist:{type:"boolean",default:!0,label:"Twist (Conformal)",shortId:"tw",uniform:"uDrosteTwist",group:"transform",condition:{param:"active",bool:!0},noReset:!0},hyperDroste:{type:"boolean",default:!1,label:"Hyper Droste",shortId:"hd",uniform:"uDrosteHyper",group:"transform",condition:{param:"active",bool:!0},noReset:!0},fractalPoints:{type:"float",default:1,label:"Fractal Points",shortId:"fp",uniform:"uDrosteFractal",min:0,max:10,step:1,group:"transform",parentId:"hyperDroste",condition:[{param:"active",bool:!0},{param:"hyperDroste",bool:!0}],noReset:!0}},postShader:{functions:ss,mainUV:`
            if (uDrosteActive > 0.5) {
                vec3 res = applyDroste(
                    sampleUV, 
                    uDrosteCenter, 
                    uDrosteR1, 
                    uDrosteR2, 
                    uDrostePeriodicity, 
                    uDrosteStrands, 
                    uDrosteZoom, 
                    uDrosteRotate, 
                    uDrosteTwist > 0.5,
                    uDrosteTiling,
                    uDrosteSpin,
                    uDrosteHyper > 0.5,
                    (uDrosteHyper > 0.5 ? uDrosteFractal : 0.0),
                    uDrosteAuto > 0.5,
                    uDrosteMirror > 0.5,
                    uDrostePolar
                );
                sampleUV = res.xy;
                mask = res.z;
            }
        `}},cs={id:"postEffects",shortId:"pe",name:"Post Effects",category:"Post Process",params:{bloomIntensity:{type:"float",default:0,label:"Bloom",shortId:"bi",uniform:"uBloomIntensity",min:0,max:5,step:.01,group:"bloom",noReset:!0,format:e=>{const n=e;return n===0?"0.0 (off)":n.toFixed(3)}},bloomThreshold:{type:"float",default:.25,label:"Threshold",shortId:"bt",uniform:"uBloomThreshold",min:0,max:2,step:.01,group:"bloom",parentId:"bloomIntensity",condition:{gt:0},noReset:!0},bloomRadius:{type:"float",default:7,label:"Spread",shortId:"br",uniform:"uBloomRadius",min:.5,max:7,step:.1,group:"bloom",parentId:"bloomIntensity",condition:{gt:0},noReset:!0},caStrength:{type:"float",default:0,label:"Chromatic Aberration",shortId:"ca",uniform:"uCAStrength",min:0,max:10,step:.01,group:"lens",noReset:!0,format:e=>{const n=e;return n===0?"0.0 (off)":n.toFixed(3)}}},postShader:{uniforms:"uniform sampler2D uBloomTexture;",functions:`
            // Barrel distortion — models how real lenses bend light more at edges
            vec2 caBarrelDistort(vec2 coord, float amt) {
                vec2 cc = coord - 0.5;
                float dist = dot(cc, cc);
                return coord + cc * dist * amt;
            }

            // Attempt to approximate visible spectrum as RGB
            // Maps t in [0,1] across the hue spectrum (YACA by Fu-Bama)
            vec3 caSpectrum(float t) {
                vec3 w = abs(t * 4.0 - vec3(1.0, 2.0, 1.0));
                w = clamp(1.5 - w, 0.0, 1.0);
                w.xz += clamp(t * 4.0 - 3.5, 0.0, 1.0);
                w.z = 1.0 - w.z;
                return w;
            }
        `,main:`
            // --- Spectral Chromatic Aberration ---
            // Per-wavelength barrel distortion (12 spectral samples)
            if (uCAStrength > 0.0001) {
                const int CA_SAMPLES = 12;
                float caMaxDistort = uCAStrength * 0.15;

                vec3 caSum = vec3(0.0);
                vec3 caWSum = vec3(0.0);
                for (int i = 0; i < CA_SAMPLES; i++) {
                    float t = float(i) / float(CA_SAMPLES - 1);
                    vec3 w = caSpectrum(t);
                    caWSum += w;
                    caSum += w * texture(map, caBarrelDistort(sampleUV, caMaxDistort * (t - 0.5))).rgb;
                }
                col = caSum / caWSum;
            }

            // --- Multi-Pass Bloom (composited by BloomPass in worker) ---
            if (uBloomIntensity > 0.001) {
                col += texture(uBloomTexture, sampleUV).rgb * uBloomIntensity;
            }
        `}},ds=`
// ------------------------------------------------------------------
// ENVIRONMENT MAP
// ------------------------------------------------------------------

vec3 GetEnvMap(vec3 dir, float roughness) {
    // 1. Apply Rotation (CPU Optimized: uEnvRotationMatrix, identity when rotation is 0)
    dir.xz = uEnvRotationMatrix * dir.xz;

    vec3 col; // Result variable

    if (uEnvSource > 0.5) {
        // Path 1: Gradient Texture
        float t = dir.y * 0.5 + 0.5;
        col = texture(uEnvGradient, vec2(t, 0.5)).rgb;
    }
    else if (uUseEnvMap > 0.5) {
        // Path 2: EnvMap Texture (Flattened else-if for compiler safety)
        // Equirectangular projection: longitude → [0,1], latitude → [0,1]
        vec2 uv = vec2(atan(dir.z, dir.x) * INV_TAU + 0.5, 1.0 - acos(dir.y) * INV_PI);
        float bias = roughness * 6.0;  // Mip bias: 6 levels ≈ typical env map mip chain depth
        col = texture(uEnvMapTexture, uv, bias).rgb;
        
        // Apply Color Profile (Linear/ACES)
        col = applyTextureProfile(col, uEnvMapColorSpace);
    } 
    else {
        // Path 3: Procedural Sky — simple gradient + sun glint + rim fill
        float y = dir.y * 0.5 + 0.5;  // Remap vertical direction [-1,1] → [0,1]
        vec3 skyBase = mix(vec3(0.02, 0.02, 0.05), vec3(0.15, 0.15, 0.25), y);  // Dark navy horizon → lighter zenith
        vec3 sky = mix(skyBase, vec3(0.1), roughness * 0.5);  // Desaturate with roughness (blurry reflections see averaged sky)

        // Sun: sharp specular highlight, blurs with roughness
        float specPower = mix(100.0, 0.5, roughness * roughness);  // Sharp (100) for mirrors, soft (0.5) for rough
        float rimPower = mix(10.0, 1.0, roughness);  // Rim falloff exponent

        vec3 sunDir = normalize(vec3(1.0, 4.0, 2.0));  // Fixed upper-right sun position
        float sunDot = max(0.0, dot(dir, sunDir));
        float light = pow(sunDot, specPower);

        // Counter-light rim fill — prevents pure black on shadow side
        vec3 rimDir = normalize(vec3(-1.0, 1.0, -1.0));
        float rimDot = max(0.0, dot(dir, rimDir));
        float rim = pow(rimDot, rimPower) * 0.5;

        float brightness = mix(1.0, 0.3, roughness);  // Rough surfaces see dimmer sky overall
        col = sky + vec3(1.0) * light * 0.8 * brightness + vec3(0.8, 0.9, 1.0) * rim * brightness;
    }

    return col;
}
`,us=`
    roughness = clamp(uRoughness, 0.02, 1.0);
    vec3 emitSource = albedo; 
    if (abs(uEmissionMode - 1.0) < 0.1) emitSource = col1;
    else if (abs(uEmissionMode - 2.0) < 0.1) emitSource = col2;
    else if (abs(uEmissionMode - 3.0) < 0.1) {
        float n01 = noiseVal * 0.5 + 0.5;
        emitSource = uLayer3Color * n01;
    }
    else if (abs(uEmissionMode - 4.0) < 0.1) emitSource = uEmissionColor; 
    emission = emitSource * uEmission * 1.5;
`,hs=`
    // EnvStrength scaling for Direct Render Mode
    #ifdef RENDER_MODE_PATHTRACING
        #define uEnvStrength uEnvStrengthSlider
    #else
        #define uEnvStrength (uEnvStrengthSlider * 0.33)
    #endif
`,fs={id:"materials",shortId:"m",name:"Material",category:"Rendering",tabConfig:{label:"Shader",componentId:"panel-shading",order:40},params:{diffuse:{type:"float",default:1,label:"Diffuse (Color)",shortId:"di",uniform:"uDiffuse",min:0,max:2,step:.01,group:"surface"},reflection:{type:"float",default:0,label:"Metallic",shortId:"re",uniform:"uReflection",min:0,max:1,step:.01,group:"surface"},specular:{type:"float",default:.3,label:"Reflectivity",shortId:"sp",uniform:"uSpecular",min:0,max:2,step:.01,group:"surface"},roughness:{type:"float",default:.5,label:"Roughness",shortId:"ro",uniform:"uRoughness",min:.001,max:1,step:.001,group:"surface"},rim:{type:"float",default:0,label:"Rim Light",shortId:"ri",uniform:"uRim",min:0,max:10,step:.01,scale:"log",group:"surface"},rimExponent:{type:"float",default:4,label:"Rim Sharpness",shortId:"rx",uniform:"uRimExponent",min:1,max:16,step:.1,group:"surface",parentId:"rim",condition:{gt:0}},envStrength:{type:"float",default:0,label:"Environment Light",shortId:"es",uniform:"uEnvStrengthSlider",min:0,max:5,step:.01,group:"env"},envBackgroundStrength:{type:"float",default:0,label:"BG Visibility",shortId:"eb",uniform:"uEnvBackgroundStrength",min:0,max:2,step:.01,group:"env",parentId:"envStrength",condition:{gt:0,param:"envStrength"}},envSource:{type:"float",default:1,label:"Source",shortId:"eo",uniform:"uEnvSource",group:"env",parentId:"envStrength",condition:{gt:0,param:"envStrength"},options:[{label:"Sky Image",value:0},{label:"Gradient",value:1}]},envMapData:{type:"image",default:null,label:"Upload Texture",shortId:"et",group:"env",parentId:"envSource",condition:{eq:0},uniform:"uEnvMapTexture",textureSettings:{mapping:Di,minFilter:Ni,generateMipmaps:!0},linkedParams:{colorSpace:"envMapColorSpace"}},envMapColorSpace:{type:"float",default:0,label:"Env Profile",shortId:"ec",uniform:"uEnvMapColorSpace",group:"env",hidden:!0},useEnvMap:{type:"boolean",default:!1,label:"Use Env Map",shortId:"eu",uniform:"uUseEnvMap",hidden:!0,group:"env"},envRotation:{type:"float",default:0,label:"Rotation",shortId:"er",uniform:"uEnvRotation",min:0,max:6.28,step:.01,group:"env",parentId:"envSource",condition:[{param:"envStrength",gt:0},{param:"envSource",eq:0}]},envGradientStops:{type:"gradient",default:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],label:"Sky Gradient",shortId:"eg",uniform:"uEnvGradient",group:"env",parentId:"envSource",condition:{eq:1}},emission:{type:"float",default:0,label:"Self-illumination",shortId:"em",uniform:"uEmission",min:0,max:5,step:.001,scale:"square",group:"emission"},emissionMode:{type:"float",default:0,label:"Emission Source",shortId:"ec",uniform:"uEmissionMode",min:0,max:4,step:1,group:"emission",parentId:"emission",condition:{gt:1e-4},options:[{label:"Full Surface",value:0},{label:"Layer 1",value:1},{label:"Layer 2",value:2},{label:"Layer 3",value:3},{label:"Solid Color",value:4}]},emissionColor:{type:"color",default:new qe(1,1,1),label:"Solid Color",shortId:"el",uniform:"uEmissionColor",group:"emission",parentId:"emissionMode",condition:{eq:4}},ptEmissionMult:{type:"float",default:1,label:"Illumination Power",shortId:"ep",uniform:"uPTEmissionMult",min:0,max:10,step:.1,group:"emission",parentId:"emission",condition:[{gt:1e-4},{param:"$renderMode",eq:"PathTracing"}]}},inject:e=>{e.addHeader(hs),e.addMaterialLogic(us),e.addFunction(ds)}},ps={id:"colorGrading",shortId:"cg",name:"Color Grading",category:"Post Process",customUI:[{componentId:"scene-histogram",group:"grading",parentId:"active",condition:{param:"active",bool:!0}}],params:{active:{type:"boolean",default:!1,label:"Color Correction",shortId:"ac",uniform:"uGradingActive",group:"grading",noReset:!0},toneMapping:{type:"float",default:0,label:"Tone Mapping",shortId:"tm",uniform:"uToneMapping",group:"grading",parentId:"active",noReset:!0,options:[{label:"ACES",value:0},{label:"AgX",value:1},{label:"Reinhard",value:2},{label:"Neutral",value:3},{label:"None",value:4}]},saturation:{type:"float",default:1,label:"Saturation",shortId:"sa",uniform:"uSaturation",min:0,max:2,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0},levelsMin:{type:"float",default:0,label:"Black Point",shortId:"ln",uniform:"uLevelsMin",min:0,max:1,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0,hidden:!0},levelsMax:{type:"float",default:1,label:"White Point",shortId:"lx",uniform:"uLevelsMax",min:0,max:2,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0,hidden:!0},levelsGamma:{type:"float",default:1,label:"Gamma",shortId:"lg",uniform:"uLevelsGamma",min:.1,max:3,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0,hidden:!0}},postShader:{functions:`
            vec3 applyColorGrading(vec3 col) {
                col = max(vec3(0.0), col - uLevelsMin);
                col /= max(0.0001, uLevelsMax - uLevelsMin);
                if (abs(uLevelsGamma - 1.0) > 0.001) {
                    col = pow(max(vec3(0.0), col), vec3(1.0 / uLevelsGamma));
                }
                float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
                col = mix(vec3(luma), col, uSaturation);
                return col;
            }
        `,main:`
            if (uGradingActive > 0.5) {
                col = applyColorGrading(col);
            }
        `}},ms={id:"texturing",shortId:"tx",name:"Texture",category:"Coloring",params:{active:{type:"boolean",default:!1,label:"Use Texture",shortId:"ac",uniform:"uUseTexture",group:"main",hidden:!0},layer1Data:{type:"image",default:null,label:"Select Image",shortId:"id",group:"main",uniform:"uTexture",textureSettings:{wrapS:On,wrapT:On,minFilter:zn,magFilter:zn},linkedParams:{colorSpace:"colorSpace"}},colorSpace:{type:"float",default:0,label:"Color Profile",shortId:"cs",uniform:"uTextureColorSpace",group:"main",hidden:!0},mapU:{type:"float",default:6,label:"U",shortId:"mu",uniform:"uTextureModeU",group:"mapping",layout:"half",options:[{label:"Orbit Trap",value:0},{label:"Iterations",value:1},{label:"Radial",value:2},{label:"Z-Depth",value:3},{label:"Angle",value:4},{label:"Normal",value:5},{label:"Decomposition",value:6},{label:"Raw Iterations",value:7},{label:"Potential (Log-Log)",value:8},{label:"Green's Flow",value:9}]},mapV:{type:"float",default:1,label:"V",shortId:"mv",uniform:"uTextureModeV",group:"mapping",layout:"half",options:[{label:"Orbit Trap",value:0},{label:"Iterations",value:1},{label:"Radial",value:2},{label:"Z-Depth",value:3},{label:"Angle",value:4},{label:"Normal",value:5},{label:"Decomposition",value:6},{label:"Raw Iterations",value:7},{label:"Potential (Log-Log)",value:8},{label:"Green's Flow",value:9}]},textureScale:{type:"vec2",default:new Te(1,1),label:"Scale UV",shortId:"ts",uniform:"uTextureScale",min:.1,max:500,step:.1,scale:"log",group:"transform"},offset:{type:"vec2",default:new Te(0,0),label:"Texture Offset",shortId:"of",uniform:"uTextureOffset",min:-2,max:2,step:.01,group:"transform"}}},er=[{value:0,label:"Orbit Trap",description:"Colors based on how close the orbit came to the origin or geometric traps.",glsl:"v = log(max(1.0e-5, result.y)) * -0.2;"},{value:1,label:"Iterations",description:"Smooth gradients based on how long it took to escape. The classic look.",glsl:`
            // Standard Iterations
            v = result.z;
            
            // HYBRID FIX: For SDF fractals (Menger, Amazing Box) that don't "escape",
            // the iteration count is constant (1.0). This looks flat.
            // If we hit max iterations (approx 1.0), mix in Orbit Trap (y) to provide texture.
            if (v > 0.99) {
                float trap = log(max(1.0e-5, result.y)) * -0.2;
                // Modulate the 1.0 base with the trap value
                v = 0.95 + 0.05 * sin(trap * 10.0);
            }
        `},{value:2,label:"Radial",description:"Distance from the center of the world.",glsl:"v = length(p) * 0.2;"},{value:3,label:"Z-Depth",description:"Height map based on Z coordinate. Good for landscapes.",glsl:"v = p.z * 0.2;"},{value:4,label:"Angle",description:"Polar angle around the Z axis. Creates spirals.",glsl:"v = atan(p.y, p.x) * 0.15915 + 0.5;"},{value:5,label:"Normal",description:"Based on surface slope (Up/Down).",glsl:"v = dot(n, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;"},{value:6,label:"Decomposition",description:"Analytic angle decomposition. Creates grid/chip patterns.",glsl:`
            // Removed aggressive zero-clamping that broke some metric modes
            v = result.w;
        `},{value:7,label:"Raw Iterations",description:"Stepped bands showing exact iteration counts.",glsl:"v = floor(result.z * float(uIterations)) / float(uIterations);"},{value:8,label:"Potential (Log-Log)",description:"Electric potential. Creates smooth bands near the set boundary.",glsl:`
            // Uses result.y (Trap) as magnitude holder if available
            // Optimized for R > 1.0
            float r = max(result.y, 1.0001); 
            v = log2(log2(r));
        `},{value:9,label:"Flow (Angle + Iter)",description:"Combines Decomposition (Angle) and Iterations to create spirals and grids.",glsl:`
            // Result.w = Decomposition (Angle 0-1)
            // Result.z = Smoothed Iterations (Count 0-N)
            // Adding them creates a diagonal slope in the mapping space.
            // When wrapped by the gradient, this creates spirals.
            v = result.w + result.z;
        `},{value:10,label:"Orbit X (YZ plane)",description:"Per-component orbit trap: closest approach to the YZ plane (abs x).",glsl:"v = log(max(1.0e-5, g_orbitTrap.x)) * -0.2;"},{value:11,label:"Orbit Y (XZ plane)",description:"Per-component orbit trap: closest approach to the XZ plane (abs y).",glsl:"v = log(max(1.0e-5, g_orbitTrap.y)) * -0.2;"},{value:12,label:"Orbit Z (XY plane)",description:"Per-component orbit trap: closest approach to the XY plane (abs z).",glsl:"v = log(max(1.0e-5, g_orbitTrap.z)) * -0.2;"},{value:13,label:"Orbit W (Origin)",description:"Per-component orbit trap: closest squared distance to the origin.",glsl:"v = log(max(1.0e-5, g_orbitTrap.w)) * -0.2;"}],gs=()=>{let e=`
    float getMappingValue(float mode, vec3 p, vec4 result, vec3 n, float repeatScale) {
        float v = 0.0;

        // Mode Selection (switch for jump-table codegen)
        switch(int(mode + 0.1)) {
    `;return er.forEach(n=>{e+=`
        case ${Math.round(n.value)}: { // ${n.label}
            ${n.glsl}
        } break;`}),e+=`
        default: // Fallback
            v = result.z;
            break;
        }

        // Safety Clamp
        if (v < -1.0e10 || v > 1.0e10) return 0.0;
        return v;
    }
    `,e},Xn=er.map(e=>({label:e.label,value:e.value})),xs={id:"coloring",shortId:"cl",name:"Coloring",category:"Visuals",tabConfig:{label:"Gradient",componentId:"panel-gradients",order:50},customUI:[{componentId:"coloring-histogram",group:"layer1_hist",props:{layer:1}},{componentId:"coloring-histogram",group:"layer2_hist",props:{layer:2}}],params:{gradient:{type:"gradient",default:[{id:"2",position:1,color:"#ffffff",bias:.5,interpolation:"linear"}],label:"Gradient",shortId:"g1",uniform:"uGradientTexture",group:"layer1_grad"},mode:{type:"float",default:0,label:"Mapping",shortId:"m1",uniform:"uColorMode",group:"layer1_top",options:Xn},scale:{type:"float",default:1,label:"Scale",shortId:"s1",uniform:"uColorScale",group:"layer1_hist",hidden:!0},offset:{type:"float",default:0,label:"Offset",shortId:"o1",uniform:"uColorOffset",group:"layer1_hist",hidden:!0},repeats:{type:"float",default:1,label:"Repeats",shortId:"r1",min:.1,max:100,step:.1,group:"layer1_hist",hidden:!0},phase:{type:"float",default:0,label:"Phase",shortId:"p1",min:-1,max:1,step:.01,group:"layer1_hist",hidden:!0},bias:{type:"float",default:1,label:"Gamma",shortId:"b1",uniform:"uGradientBias",min:.1,max:10,step:.01,group:"layer1_hist",hidden:!0},colorIter:{type:"float",default:0,label:"Color Iterations",shortId:"ci",uniform:"uColorIter",min:0,max:24,step:1,group:"layer1_bottom",description:"Stop orbit trap capture at this iteration (0 = use all iterations)",condition:{or:[{param:"mode",eq:0},{param:"mode",eq:1},{param:"mode",eq:7},{param:"mode",eq:8},{param:"mode",eq:9},{param:"mode",eq:10},{param:"mode",eq:11},{param:"mode",eq:12},{param:"mode",eq:13},{param:"mode2",eq:0},{param:"mode2",eq:1},{param:"mode2",eq:7},{param:"mode2",eq:8},{param:"mode2",eq:9},{param:"mode2",eq:10},{param:"mode2",eq:11},{param:"mode2",eq:12},{param:"mode2",eq:13}]}},twist:{type:"float",default:0,label:"Twist",shortId:"w1",uniform:"uColorTwist",min:-5,max:5,step:.1,group:"layer1_bottom"},escape:{type:"float",default:4,label:"Escape Radius",shortId:"e1",uniform:"uEscapeThresh",min:1,max:1e3,step:.1,scale:"log",group:"layer1_bottom",condition:{or:[{param:"mode",eq:6},{param:"mode",eq:8},{param:"mode",eq:9},{param:"mode2",eq:6},{param:"mode2",eq:8},{param:"mode2",eq:9},{and:[{param:"$texturing.active",bool:!0},{or:[{param:"$texturing.mapU",eq:6},{param:"$texturing.mapU",eq:8},{param:"$texturing.mapU",eq:9},{param:"$texturing.mapV",eq:6},{param:"$texturing.mapV",eq:8},{param:"$texturing.mapV",eq:9}]}]}]}},gradient2:{type:"gradient",default:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}],label:"Gradient 2",shortId:"g2",uniform:"uGradientTexture2",group:"layer2_grad"},mode2:{type:"float",default:4,label:"Mapping",shortId:"m2",uniform:"uColorMode2",group:"layer2_top",options:Xn},scale2:{type:"float",default:1,label:"Scale 2",shortId:"s2",uniform:"uColorScale2",group:"layer2_hist",hidden:!0},offset2:{type:"float",default:0,label:"Offset 2",shortId:"o2",uniform:"uColorOffset2",group:"layer2_hist",hidden:!0},repeats2:{type:"float",default:1,label:"Repeats",shortId:"r2",min:.1,max:100,step:.1,group:"layer2_hist",hidden:!0},phase2:{type:"float",default:0,label:"Phase",shortId:"p2",min:-1,max:1,step:.01,group:"layer2_hist",hidden:!0},bias2:{type:"float",default:1,label:"Gamma",shortId:"b2",uniform:"uGradientBias2",min:.1,max:10,step:.01,group:"layer2_hist",hidden:!0},twist2:{type:"float",default:0,label:"Twist",shortId:"w2",uniform:"uColorTwist2",min:-5,max:5,step:.1,group:"layer2_bottom"},blendMode:{type:"float",default:0,label:"Blend Mode",shortId:"bm",uniform:"uBlendMode",group:"layer2_bottom",options:[{label:"Mix",value:0},{label:"Add",value:1},{label:"Multiply",value:2},{label:"Overlay",value:3},{label:"Screen",value:4},{label:"Bump (Normal)",value:6}]},blendOpacity:{type:"float",default:0,label:"Blend Amount",shortId:"bo",uniform:"uBlendOpacity",min:0,max:1,step:.01,group:"layer2_bottom"},layer3Color:{type:"color",default:new qe(1,1,1),label:"Noise Color",shortId:"n3c",uniform:"uLayer3Color",group:"noise",layout:"embedded"},layer3Scale:{type:"float",default:2,label:"Noise Scale",shortId:"n3s",uniform:"uLayer3Scale",min:.1,max:2e3,step:.1,scale:"log",group:"noise"},layer3Strength:{type:"float",default:0,label:"Mix Strength",shortId:"n3a",uniform:"uLayer3Strength",min:0,max:1,step:.01,group:"noise"},layer3Bump:{type:"float",default:0,label:"Bump",shortId:"n3b",uniform:"uLayer3Bump",min:-1,max:1,step:.01,group:"noise"},layer3Turbulence:{type:"float",default:0,label:"Turbulence",shortId:"n3t",uniform:"uLayer3Turbulence",min:0,max:2,step:.01,group:"noise"},layer3Enabled:{type:"boolean",default:!0,label:"Load Noise (Layer 3)",shortId:"l3e",group:"engine_settings",ui:"checkbox",description:"Compiles simplex noise into the shader. Disable to reduce compile time when Layer 3 is not needed.",onUpdate:"compile",noReset:!0}},inject:(e,n,t)=>{const o=n.coloring;(o==null?void 0:o.layer3Enabled)!==!1&&e.addDefine("LAYER3_ENABLED","1"),e.addPreamble("vec4 g_orbitTrap = vec4(1e10);"),e.addPreamble("float escape = 0.0;"),t==="Main"||t==="Histogram"?e.addFunction(gs()):e.addFunction(`
                float getMappingValue(float mode, vec3 p, vec4 result, vec3 n, float repeatScale) { return 0.0; }
            `)}},bs={id:"standard",label:"Standard (Tglad)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = clamp(z, -foldLimit, foldLimit) * 2.0 - z;
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:2}},ys={id:"mirror",label:"Mirror",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = foldLimit - abs(abs(z) - foldLimit);
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:3}},vs={id:"half",label:"Half-fold",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = abs(z + foldLimit);
}
`,defaults:{hybridScale:1.5,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.3,hybridFixedR:1,hybridIter:2}},ws={id:"decoupled",label:"Decoupled",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    // Fold boundary at foldLimit, reflect to foldingValue (Mandelbulber box fold)
    vec3 fv = uHybridFoldingValue;
    if (z.x > foldLimit.x) z.x = fv.x - z.x;
    else if (z.x < -foldLimit.x) z.x = -fv.x - z.x;
    if (z.y > foldLimit.y) z.y = fv.y - z.y;
    else if (z.y < -foldLimit.y) z.y = -fv.y - z.y;
    if (z.z > foldLimit.z) z.z = fv.z - z.z;
    else if (z.z < -foldLimit.z) z.z = -fv.z - z.z;
}
`,extraParams:{hybridFoldingValue:{type:"vec3",default:new V(2,2,2),label:"Folding Value",shortId:"hfv",uniform:"uHybridFoldingValue",min:.1,max:5,step:.01,group:"hybrid"}},defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:2,hybridFoldingValue:{x:2,y:2,z:2}}},Ss={id:"kali",label:"Kali",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = uHybridKaliConstant - abs(z);
}
`,rotMode:"post",extraParams:{hybridKaliConstant:{type:"vec3",default:new V(1,1,1),label:"Kali Constant",shortId:"hkc",uniform:"uHybridKaliConstant",min:-3,max:3,step:.01,group:"hybrid"}},defaults:{hybridScale:1.5,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.6,hybridFixedR:1,hybridIter:3,hybridKaliConstant:{x:.5,y:.5,z:.5}}},Ms={id:"tetra",label:"Tetrahedral (KIFS)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    if (z.x + z.y < 0.0) z.xy = -z.yx;
    if (z.x + z.z < 0.0) z.xz = -z.zx;
    if (z.y + z.z < 0.0) z.yz = -z.zy;
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.25,hybridFixedR:1,hybridIter:3}},Cs={id:"octa",label:"Octahedral (KIFS)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    // Knighty's octahedral fold — diagonal plane reflections + axis sorting
    if (z.x + z.y < 0.0) z.xy = -z.yx;
    if (z.x + z.z < 0.0) z.xz = -z.zx;
    if (z.x - z.y < 0.0) z.xy = z.yx;
    if (z.x - z.z < 0.0) z.xz = z.zx;
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:3}},ks={id:"icosa",label:"Icosahedral (KIFS)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    // Knighty's icosahedral fold — golden ratio plane normals
    const float PHI = 1.618033988749895;
    const vec3 n1 = normalize(vec3(-PHI, PHI - 1.0, 1.0));
    const vec3 n2 = normalize(vec3(1.0, -PHI, PHI + 1.0));
    const vec3 n3 = vec3(0.0, 0.0, -1.0);

    z = abs(z);
    float t;
    t = dot(z, n1); if (t > 0.0) z -= 2.0 * t * n1;
    t = dot(z, n2); if (t > 0.0) z -= 2.0 * t * n2;
    t = dot(z, n3); if (t > 0.0) z -= 2.0 * t * n3;
    t = dot(z, n2); if (t > 0.0) z -= 2.0 * t * n2;
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.3,hybridFixedR:1,hybridIter:4}},js={id:"menger",label:"Menger (Cubic)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    // 1. 48-fold octahedral symmetry: abs + branchless descending sort
    z = abs(z);
    vec3 s = z;
    z.x = max(max(s.x, s.y), s.z);
    z.z = min(min(s.x, s.y), s.z);
    z.y = s.x + s.y + s.z - z.x - z.z;

    // 2. Scale + Offset (IFS step): z = Scale*z - Offset*(Scale-1)
    float scale = uHybridScale;
    vec3 shift = uHybridMengerOffset * (scale - 1.0);
    z = z * scale - shift;

    // 3. Center-Z conditional fold (restores full cubic symmetry)
    if (uHybridMengerCenterZ > 0.5) {
        z.z += shift.z * step(z.z, -0.5 * shift.z);
    }

    // 4. Derivative (chain rule for uniform scale)
    dr *= abs(scale);
}
`,selfContained:!0,extraParams:{hybridMengerOffset:{type:"vec3",default:new V(1,1,1),label:"Offset",shortId:"hmo",uniform:"uHybridMengerOffset",min:0,max:2,step:.01,group:"hybrid",linkable:!0},hybridMengerCenterZ:{type:"boolean",default:!0,label:"Center Z",shortId:"hmz",uniform:"uHybridMengerCenterZ",group:"hybrid"}},defaults:{hybridScale:3,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:3,hybridMengerOffset:{x:1,y:1,z:1},hybridMengerCenterZ:!0}},Ca=[bs,ys,vs,ws,Ss,Ms,Cs,ks,js],Rs=Ca.map((e,n)=>({label:e.label,value:n}));function Is(e){return Ca[e]??Ca[0]}const Ps=["xyz","xzy","yxz","yzx","zxy","zyx"];function Ts(e){const n=Ps[e]??"xyz";return n==="xyz"?"vec3 c_perm = c.xyz;":`vec3 c_perm = c.${n};`}function Es(e,n,t=!1){return`
mat3 hybridRotMat;
bool hybridHasRot;

void initHybridTransform() {
    vec3 hr = uHybridRot;
    hybridHasRot = (abs(hr.x) + abs(hr.y) + abs(hr.z)) > 0.001;
    hybridRotMat = mat3(1.0);
    if (hybridHasRot) {
        float sx = sin(hr.x), cx = cos(hr.x);
        float sy = sin(hr.y), cy = cos(hr.y);
        float sz = sin(hr.z), cz = cos(hr.z);
        hybridRotMat = mat3(
            cy*cz, -cy*sz, sy,
            sx*sy*cz + cx*sz, -sx*sy*sz + cx*cz, -sx*cy,
            -cx*sy*cz + sx*sz, cx*sy*sz + sx*cz, cx*cy
        );
    }
}

void formula_Hybrid(inout vec4 z, inout float dr, inout float trap, vec4 c) {
    vec3 z3 = z.xyz;
    // Transform into fold space
    ${n==="wrap"?"if (hybridHasRot) z3 = hybridRotMat * z3;":""}
    z3 += uHybridShift;

    foldOperation(z3, dr, uHybridFoldLimitVec);

    // Transform back out of fold space
    z3 -= uHybridShift;
    ${n==="wrap"?"if (hybridHasRot) z3 = transpose(hybridRotMat) * z3;":""}

    ${t?"// selfContained fold — scaling + DR handled inside foldOperation":`
    sphereFold(z3, dr, uHybridMinR, uHybridFixedR);
    ${n==="post"?"if (hybridHasRot) { z3 = hybridRotMat * z3; }":""}

    // Dynamic scale variation (Mandelbulber ABoxVaryScale)
    float s = uHybridScale + uHybridScaleVary * (abs(uHybridScale) - 1.0);
    z3 *= s;`}

    // C-axis permutation
    ${e}
    if (uHybridAddC > 0.5) z3 += c_perm;

    z.xyz = z3;
    ${t?"":"dr = dr * abs(s) + 1.0;"}
    trap = min(trap, getLength(z3));
}
`}function Ls(){const e={};return Ca.forEach((n,t)=>{n.extraParams&&Object.entries(n.extraParams).forEach(([o,i])=>{e[o]={...i,condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0},{param:"hybridFoldType",eq:t}]}})}),e}const Ns={id:"geometry",shortId:"g",name:"Geometry",category:"Formulas",customUI:[{componentId:"interaction-picker",group:"julia",parentId:"juliaMode",condition:{bool:!0},props:{targetMode:"picking_julia",label:"Pick Coordinate",activeLabel:"Cancel Picking",helpText:"Click any point on the fractal surface to set Julia coordinates.",variant:"primary"}},{componentId:"julia-randomize",group:"julia",parentId:"juliaMode",condition:{bool:!0}}],engineConfig:{toggleParam:"applyTransformLogic",mode:"compile",label:"Geometry Modifiers",groupFilter:"engine_settings"},params:{applyTransformLogic:{type:"boolean",default:!0,label:"Geometry Engine",shortId:"gt",group:"main",description:"Master switch for geometry modifiers (Julia, Rotation, Hybrid).",noReset:!0,hidden:!0},preRotMaster:{type:"boolean",default:!0,label:"Enable Rotation",shortId:"rm",group:"engine_settings",ui:"checkbox",description:"Compiles rotation matrix logic. Disable for speed.",onUpdate:"compile",noReset:!0,estCompileMs:600},hybridCompiled:{type:"boolean",default:!1,label:"Hybrid Box Fold",shortId:"hcm",group:"engine_settings",ui:"checkbox",description:"Compiles hybrid box fold system into shader. Toggle effect on/off instantly from Formula panel.",onUpdate:"compile",noReset:!0,estCompileMs:1200},hybridMode:{type:"boolean",default:!1,label:"Hybrid Active",shortId:"hm",uniform:"uHybrid",group:"hybrid",hidden:!0},hybridFoldType:{type:"float",default:0,label:"Fold Type",shortId:"hft",group:"engine_settings",options:Rs.map(e=>({...e,estCompileMs:400})),description:"Box fold algorithm. Each type produces fundamentally different geometry.",onUpdate:"compile",noReset:!0,condition:{param:"hybridCompiled",bool:!0}},hybridComplex:{type:"boolean",default:!1,label:"Interleaved Mode",shortId:"hx",group:"engine_settings",ui:"checkbox",description:"Interleaves fold with fractal formula (Box → Fractal → Box). Slow compile.",onUpdate:"compile",noReset:!0,estCompileMs:1500,condition:{param:"hybridCompiled",bool:!0}},hybridPermute:{type:"float",default:0,label:"Axis Permutation",shortId:"hpe",group:"engine_settings",options:[{label:"XYZ (Default)",value:0},{label:"XZY",value:1},{label:"YXZ",value:2},{label:"YZX",value:3},{label:"ZXY",value:4},{label:"ZYX",value:5}],description:"Permutes the constant (c) axis mapping. Changes fractal topology.",onUpdate:"compile",noReset:!0,condition:{param:"hybridCompiled",bool:!0}},burningEnabled:{type:"boolean",default:!1,label:"Burning Mode",shortId:"bm",group:"burning",description:'Applies absolute value to coordinates every iteration. Creates "Burning Ship" variations.',uniform:"uBurningEnabled"},hybridIter:{type:"float",default:2,label:"Iterations",shortId:"hi",uniform:"uHybridIter",min:0,max:10,step:1,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridFoldLimit:{type:"float",default:1,label:"Fold Limit",shortId:"hl",uniform:"uHybridFoldLimit",min:.1,max:2,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}],hidden:!0},hybridFoldLimitVec:{type:"vec3",default:new V(1,1,1),label:"Fold Limit",shortId:"hlv",uniform:"uHybridFoldLimitVec",min:.1,max:3,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0},{param:"hybridFoldType",lt:4}],linkable:!0},hybridScale:{type:"float",default:2,label:"Scale",shortId:"hs",uniform:"uHybridScale",min:.5,max:3,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridScaleVary:{type:"float",default:0,label:"Scale Variation",shortId:"hsv",uniform:"uHybridScaleVary",min:-1,max:1,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}],description:"Dynamic scale feedback per iteration (ABoxVaryScale)."},hybridMinR:{type:"float",default:.5,label:"Min Radius",shortId:"hn",uniform:"uHybridMinR",min:0,max:1.5,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridFixedR:{type:"float",default:1,label:"Fixed Radius",shortId:"hf",uniform:"uHybridFixedR",min:.1,max:3,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridAddC:{type:"boolean",default:!1,label:"Add Constant",shortId:"hc",uniform:"uHybridAddC",group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridShift:{type:"vec3",default:new V(0,0,0),label:"Shift",shortId:"hs2",uniform:"uHybridShift",min:-2,max:2,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridRot:{type:"vec3",default:new V(0,0,0),label:"Rotation",shortId:"hr",uniform:"uHybridRot",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",mode:"rotation",group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},...Ls(),hybridSwap:{type:"boolean",default:!1,label:"Swap Order",shortId:"hw",group:"engine_settings",ui:"checkbox",description:"Start with fractal formula instead of box fold.",onUpdate:"compile",noReset:!0,condition:[{param:"hybridCompiled",bool:!0},{param:"hybridComplex",bool:!0}]},hybridSkip:{type:"int",default:1,label:"Hybrid Interval",shortId:"hk",uniform:"uHybridSkip",min:1,max:8,step:1,group:"hybrid",condition:[{param:"hybridComplex",bool:!0},{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},preRotEnabled:{type:"boolean",default:!1,label:"Local Rotation",shortId:"re",group:"transform",condition:{param:"preRotMaster",bool:!0}},preRotX:{type:"float",default:0,label:"Pre X",shortId:"rx",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},preRotY:{type:"float",default:0,label:"Pre Y",shortId:"ry",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},preRotZ:{type:"float",default:0,label:"Pre Z",shortId:"rz",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},preRot:{type:"vec3",default:new V(0,0,0),label:"Pre Rotation",composeFrom:["preRotX","preRotY","preRotZ"],min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0}},postRotX:{type:"float",default:0,label:"Post X",shortId:"qx",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},postRotY:{type:"float",default:0,label:"Post Y",shortId:"qy",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},postRotZ:{type:"float",default:0,label:"Post Z",shortId:"qz",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},postRot:{type:"vec3",default:new V(0,0,0),label:"Post Rotation",composeFrom:["postRotX","postRotY","postRotZ"],min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0}},worldRotX:{type:"float",default:0,label:"World X",shortId:"wx",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},worldRotY:{type:"float",default:0,label:"World Y",shortId:"wy",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},worldRotZ:{type:"float",default:0,label:"World Z",shortId:"wz",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},worldRot:{type:"vec3",default:new V(0,0,0),label:"World Rotation",composeFrom:["worldRotX","worldRotY","worldRotZ"],min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0}},juliaMode:{type:"boolean",default:!1,label:"Julia Mode",shortId:"jm",uniform:"uJuliaMode",group:"julia",description:"Replaces the iterating variable with a fixed coordinate, producing connected Julia set slices."},juliaX:{type:"float",default:0,label:"Julia X",shortId:"jx",min:-2,max:2,step:.01,group:"julia_params",condition:{param:"juliaMode",bool:!0},hidden:!0},juliaY:{type:"float",default:0,label:"Julia Y",shortId:"jy",min:-2,max:2,step:.01,group:"julia_params",condition:{param:"juliaMode",bool:!0},hidden:!0},juliaZ:{type:"float",default:0,label:"Julia Z",shortId:"jz",min:-2,max:2,step:.01,group:"julia_params",condition:{param:"juliaMode",bool:!0},hidden:!0},julia:{type:"vec3",default:new V(0,0,0),label:"Julia Coordinate",uniform:"uJulia",composeFrom:["juliaX","juliaY","juliaZ"],min:-2,max:2,step:.01,group:"julia",parentId:"juliaMode",condition:{bool:!0}}},inject:(e,n)=>{const t=n.geometry;if((t?t.applyTransformLogic:!0)===!1){e.addFunction(`void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {}
void initHybridTransform() {}
void formula_Hybrid(inout vec4 z, inout float dr, inout float trap, vec4 c) {}`);return}const i=t?t.preRotMaster!==!1:!0;e.setRotation(i);const s=(t==null?void 0:t.hybridCompiled)??!1;if(!s)e.addFunction(`void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {}
void initHybridTransform() {}
void formula_Hybrid(inout vec4 z, inout float dr, inout float trap, vec4 c) {}`);else{const d=(t==null?void 0:t.hybridFoldType)??0,f=Is(d);e.addFunction(f.glsl);const h=(t==null?void 0:t.hybridPermute)??0,p=Ts(h);e.addFunction(Es(p,f.rotMode??"wrap",f.selfContained??!1))}let r="",l="";if(n.formula!=="MandelTerrain"&&(l+="z.xyz = mix(z.xyz, abs(z.xyz), step(0.5, uBurningEnabled));"),s)if(!(t&&t.hybridComplex))r+=`
                if (uHybrid > 0.5) {
                    initHybridTransform();
                    int hLim = int(uHybridIter);
                    for(int i=0; i<16; i++) {
                        if (i >= hLim) break;
                        formula_Hybrid(z, dr, trap, c);
                    }
                }
                `;else{const f=(t==null?void 0:t.hybridSwap)??!1;r+=`if (uHybrid > 0.5) { initHybridTransform(); }
`,l+=`
                if (uHybrid > 0.5) {
                    int skip = int(uHybridSkip);
                    if (skip < 1) skip = 1;

                    if (i >= ${f?"1":"0"}) {
                        int rel_i = i - ${f?"1":"0"};

                        if ((rel_i % skip) == 0 && (rel_i / skip) < int(uHybridIter)) {
                            formula_Hybrid(z, dr, trap, c);
                            skipMainFormula = true;
                        }
                    }
                }
                `}e.addHybridFold("",r,l)}},Ds={id:"quality",shortId:"q",name:"Quality",category:"Rendering",tabConfig:{label:"Quality",componentId:"panel-quality",order:60},engineConfig:{toggleParam:"engineQuality",mode:"compile",label:"Loop Limits & Precision",groupFilter:"engine_settings"},params:{engineQuality:{type:"boolean",default:!0,label:"Quality Core",shortId:"qc",group:"main",noReset:!0,hidden:!0},compilerHardCap:{type:"int",default:500,label:"Hard Loop Cap",shortId:"hc",min:64,max:2e3,step:1,group:"engine_settings",ui:"numeric",description:"Compile-time safety limit. Ray loop will never exceed this.",onUpdate:"compile",noReset:!0},precisionMode:{type:"float",default:0,label:"Ray Precision",shortId:"pm",group:"engine_settings",options:[{label:"High (Desktop)",value:0},{label:"Standard (Mobile)",value:1}],description:"Sets the minimum epsilon (ray hit distance). Standard prevents GPU hangs on mobile.",onUpdate:"compile",noReset:!0},bufferPrecision:{type:"float",default:0,label:"Texture Buffer",shortId:"bp",group:"engine_settings",options:[{label:"Float32 (HDR)",value:0},{label:"HalfFloat16",value:1}],description:"Controls render target bit-depth. 16-bit is faster and required on some mobile GPUs.",onUpdate:"compile",noReset:!0},maxSteps:{type:"int",default:300,label:"Max Ray Steps",shortId:"ms",uniform:"uMaxSteps",min:32,max:2e3,step:1,group:"kernel",description:"Runtime limit. Rays stop after this many steps. Artistic tool for limiting depth. Maximum is limited by Hard Loop Cap.",isAdvanced:!0,dynamicMaxRef:"compilerHardCap"},distanceMetric:{type:"float",default:0,label:"Distance Metric",shortId:"dm",uniform:"uDistanceMetric",group:"kernel",options:[{label:"Euclidean (Sphere)",value:0},{label:"Chebyshev (Box)",value:1},{label:"Manhattan (Diamond)",value:2},{label:"Minkowski 4 (Rounded)",value:3}],description:'The shape of "distance". Changes the aesthetic of the fractal surface.'},estimator:{type:"float",default:0,label:"Estimator",shortId:"es",group:"kernel",options:[{label:"Analytic (Log)",value:0},{label:"Linear (Unit 1.0)",value:1},{label:"Linear (Offset 2.0)",value:4},{label:"Pseudo (Raw)",value:2},{label:"Dampened",value:3}],description:"Algorithm for calculating distance. Log=Smooth, Linear=Sharp/IFS, Pseudo=Artifact Fix.",onUpdate:"compile",noReset:!0,isAdvanced:!0},fudgeFactor:{type:"float",default:1,label:"Slice Optimization",shortId:"ff",uniform:"uFudgeFactor",min:.01,max:1,step:.01,group:"kernel",description:"Multiplies step size. Lower = Higher quality but slower. Set to < 0.2 for deep zooms.",format:e=>e.toFixed(2)},stepRelaxation:{type:"float",default:0,label:"Step Relaxation",shortId:"sr",uniform:"uStepRelaxation",min:0,max:1,step:.01,group:"kernel",description:"Dynamic Step Size. 0 = Fixed Fudge. 1 = Variable (Fudge near surface, 1.0 in void). Saves steps.",isAdvanced:!0},stepJitter:{type:"float",default:.15,label:"Step Jitter",shortId:"sj",uniform:"uStepJitter",min:0,max:1,step:.01,group:"kernel",description:"Stochastic step variation. Breaks banding artifacts. Higher = softer edges, artistic blur.",format:e=>e.toFixed(2)},refinementSteps:{type:"int",default:0,label:"Edge Polish",shortId:"rf",uniform:"uRefinementSteps",min:0,max:5,step:1,group:"kernel",description:"Extra micro-steps after hitting surface. Fixes slicing/banding artifacts.",isAdvanced:!0},detail:{type:"float",default:1,label:"Ray detail",shortId:"rd",uniform:"uDetail",min:.1,max:10,step:.1,group:"kernel"},pixelThreshold:{type:"float",default:.5,label:"Pixel threshold",shortId:"pt",uniform:"uPixelThreshold",min:.1,max:2,step:.1,group:"kernel"},overstepTolerance:{type:"float",default:0,label:"Overstep Fix",shortId:"ot",uniform:"uOverstepTolerance",min:0,max:1e3,step:.1,scale:"log",group:"kernel",description:"Recovers details missed by the raymarcher. 0=Off. Higher values fix more holes but may create noise."},dynamicScaling:{type:"boolean",default:!1,label:"Adaptive Resolution",shortId:"ds",group:"performance",noReset:!0},interactionDownsample:{type:"float",default:2,label:"Move Quality",shortId:"id",min:1,max:4,step:.5,group:"performance",condition:{param:"dynamicScaling",bool:!0},format:e=>`1/${e}x`,noReset:!0},physicsProbeMode:{type:"float",default:0,label:"Distance Probe",shortId:"dp",group:"performance",isAdvanced:!0,options:[{label:"GPU Probe",value:0},{label:"Manual",value:2}],description:"GPU Probe: Reads distance from render target. Manual: Fixed value for orbit control.",noReset:!0},manualDistance:{type:"float",default:10,label:"Manual Distance",shortId:"md",min:.1,max:1e3,step:.1,group:"performance",isAdvanced:!0,parentId:"physicsProbeMode",condition:{param:"physicsProbeMode",eq:2},description:"Manual distance value. Used for orbit control calculations.",format:e=>e.toFixed(1),noReset:!0}},inject:(e,n)=>{const t=n.quality,o=(t==null?void 0:t.compilerHardCap)||500;e.addDefine("MAX_HARD_ITERATIONS",Math.floor(o).toString())}},Ju=220,eh=24,th=32,ah=24,nh=24,oh=50,on=64,ke=8,rh={DEFAULT_BITRATE:40},ih=[{label:"MP4 (H.264) - Universal",container:"mp4",codec:"avc",ext:"mp4",mime:"video/mp4"},{label:"MP4 (H.265/HEVC) - High Quality",container:"mp4",codec:"hevc",ext:"mp4",mime:"video/mp4"},{label:"MP4 (AV1) - Best Compression",container:"mp4",codec:"av1",ext:"mp4",mime:"video/mp4"},{label:"WebM (VP9) - Web Standard",container:"webm",codec:"vp9",ext:"webm",mime:"video/webm"}];class _s{constructor(){Q(this,"nodes",new Map)}register(n){this.nodes.set(n.id,n)}get(n){return this.nodes.get(n)}getAll(){return Array.from(this.nodes.values())}getGrouped(){const n={};return this.nodes.forEach(t=>{n[t.category]||(n[t.category]=[]),n[t.category].push(t.id)}),n}}const je=new _s;je.register({id:"Note",label:"Comment / Note",category:"Utils",description:"A text block for leaving comments. Ignored by renderer.",inputs:[],glsl:e=>""});je.register({id:"AddConstant",label:"Add C (Julia/Pixel)",category:"Utils",description:"Adds the Julia Constant (or Pixel Coordinate) to the position. Essential for Mandelbrot/Julia hybrids.",inputs:[{id:"scale",label:"Strength",min:0,max:2,step:.01,default:1}],glsl:e=>`${e.indent}${e.varName}_p += c.xyz * ${e.getParam("scale")};`});je.register({id:"Scale",label:"Scale (Mult)",category:"Transforms",description:"Simple multiplication. Warning: For fractals, use IFS Scale to keep centered.",inputs:[{id:"scale",label:"Scale",min:.1,max:5,step:.01,default:2,hardMin:.001}],glsl:e=>`
${e.indent}${e.varName}_p *= ${e.getParam("scale")};
${e.indent}${e.varName}_dr *= abs(${e.getParam("scale")});
`});je.register({id:"IFSScale",label:"IFS Scale (Homothety)",category:"Transforms",description:"Scales space while shifting to maintain a center. Critical for Menger/Sierpinski.",inputs:[{id:"scale",label:"Scale",min:1,max:5,step:.01,default:2},{id:"offset",label:"Offset",min:0,max:5,step:.01,default:1}],glsl:e=>`
${e.indent}{
${e.indent}    float scale = ${e.getParam("scale")};
${e.indent}    float off = ${e.getParam("offset")};
${e.indent}    ${e.varName}_p = ${e.varName}_p * scale - vec3(off * (scale - 1.0));
${e.indent}    ${e.varName}_dr *= abs(scale);
${e.indent}}
`});je.register({id:"Rotate",label:"Rotate",category:"Transforms",description:"Rotates space around X, Y, Z axes.",inputs:[{id:"x",label:"Rot X",min:-180,max:180,step:1,default:0},{id:"y",label:"Rot Y",min:-180,max:180,step:1,default:0},{id:"z",label:"Rot Z",min:-180,max:180,step:1,default:0}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 rot = vec3(radians(${e.getParam("x")}), radians(${e.getParam("y")}), radians(${e.getParam("z")}));
${e.indent}    if(abs(rot.x)>0.001) { float s=sin(rot.x); float c=cos(rot.x); mat2 m=mat2(c,-s,s,c); ${e.varName}_p.yz = m*${e.varName}_p.yz; }
${e.indent}    if(abs(rot.y)>0.001) { float s=sin(rot.y); float c=cos(rot.y); mat2 m=mat2(c,-s,s,c); ${e.varName}_p.xz = m*${e.varName}_p.xz; }
${e.indent}    if(abs(rot.z)>0.001) { float s=sin(rot.z); float c=cos(rot.z); mat2 m=mat2(c,-s,s,c); ${e.varName}_p.xy = m*${e.varName}_p.xy; }
${e.indent}}
`});je.register({id:"Translate",label:"Translate",category:"Transforms",description:"Linear shift of coordinates.",inputs:[{id:"x",label:"X",min:-5,max:5,step:.01,default:0},{id:"y",label:"Y",min:-5,max:5,step:.01,default:0},{id:"z",label:"Z",min:-5,max:5,step:.01,default:0}],glsl:e=>`
${e.indent}${e.varName}_p += vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")});
`});je.register({id:"Mod",label:"Modulo (Repeat)",category:"Transforms",description:"Tiles space infinitely in a grid.",inputs:[{id:"x",label:"X Period",min:0,max:10,step:.1,default:0},{id:"y",label:"Y Period",min:0,max:10,step:.1,default:0},{id:"z",label:"Z Period",min:0,max:10,step:.1,default:0}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 per = vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")});
${e.indent}    if(abs(per.x)>0.001) ${e.varName}_p.x = mod(${e.varName}_p.x + 0.5*per.x, per.x) - 0.5*per.x;
${e.indent}    if(abs(per.y)>0.001) ${e.varName}_p.y = mod(${e.varName}_p.y + 0.5*per.y, per.y) - 0.5*per.y;
${e.indent}    if(abs(per.z)>0.001) ${e.varName}_p.z = mod(${e.varName}_p.z + 0.5*per.z, per.z) - 0.5*per.z;
${e.indent}}
`});je.register({id:"AmazingFold",label:"Amazing Fold",category:"Folds",description:"The core folding logic of the Amazing Box (Box + Sphere fold). Does not scale or add C.",inputs:[{id:"limit",label:"Box Limit",min:.1,max:3,step:.01,default:1},{id:"minR",label:"Min Radius",min:0,max:2,step:.01,default:.5},{id:"fixedR",label:"Fixed Radius",min:0,max:3,step:.01,default:1}],glsl:e=>`
${e.indent}boxFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("limit")});
${e.indent}sphereFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("minR")}, ${e.getParam("fixedR")});
`});je.register({id:"Abs",label:"Abs (Mirror)",category:"Folds",description:"Absolute value fold on all axes. Creates cubic symmetries.",inputs:[],glsl:e=>`${e.indent}${e.varName}_p = abs(${e.varName}_p);`});je.register({id:"BoxFold",label:"Box Fold",category:"Folds",description:"Clamps space inside a box limit. The core of the Mandelbox.",inputs:[{id:"limit",label:"Limit",min:.1,max:3,step:.01,default:1,hardMin:.001}],glsl:e=>`${e.indent}boxFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("limit")});`});je.register({id:"SphereFold",label:"Sphere Fold",category:"Folds",description:"Inverts space inside a sphere. Creates spherical voids.",inputs:[{id:"minR",label:"Min Radius",min:0,max:2,step:.01,default:.5},{id:"fixedR",label:"Fixed Radius",min:0,max:3,step:.01,default:1}],glsl:e=>`${e.indent}sphereFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("minR")}, ${e.getParam("fixedR")});`});je.register({id:"PlaneFold",label:"Plane Fold",category:"Folds",description:"Reflects space across a plane defined by a Normal and Distance.",inputs:[{id:"x",label:"Normal X",min:-1,max:1,step:.01,default:0},{id:"y",label:"Normal Y",min:-1,max:1,step:.01,default:1},{id:"z",label:"Normal Z",min:-1,max:1,step:.01,default:0},{id:"d",label:"Offset",min:-2,max:2,step:.01,default:0}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 n = normalize(vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")}));
${e.indent}    ${e.varName}_p -= 2.0 * min(0.0, dot(${e.varName}_p, n) - ${e.getParam("d")}) * n;
${e.indent}}
`});je.register({id:"MengerFold",label:"Menger Fold",category:"Folds",description:"Permutes coordinates (sorts xyz). Essential for Menger Sponges.",inputs:[],glsl:e=>`
${e.indent}if(${e.varName}_p.x < ${e.varName}_p.y) ${e.varName}_p.xy = ${e.varName}_p.yx;
${e.indent}if(${e.varName}_p.x < ${e.varName}_p.z) ${e.varName}_p.xz = ${e.varName}_p.zx;
${e.indent}if(${e.varName}_p.y < ${e.varName}_p.z) ${e.varName}_p.yz = ${e.varName}_p.zy;
`});je.register({id:"SierpinskiFold",label:"Sierpinski Fold",category:"Folds",description:"Diagonal folding for Tetrahedral fractals (MixPinski).",inputs:[],glsl:e=>`
${e.indent}if(${e.varName}_p.x + ${e.varName}_p.y < 0.0) ${e.varName}_p.xy = -${e.varName}_p.yx;
${e.indent}if(${e.varName}_p.x + ${e.varName}_p.z < 0.0) ${e.varName}_p.xz = -${e.varName}_p.zx;
${e.indent}if(${e.varName}_p.y + ${e.varName}_p.z < 0.0) ${e.varName}_p.yz = -${e.varName}_p.zy;
`});je.register({id:"Mandelbulb",label:"Mandelbulb",category:"Fractals",description:"The standard Power function. Includes phase shifts.",inputs:[{id:"power",label:"Power",min:1,max:16,step:.1,default:8},{id:"phaseX",label:"Phi Phase",min:-3.14,max:3.14,step:.01,default:0},{id:"phaseY",label:"Theta Phase",min:-3.14,max:3.14,step:.01,default:0},{id:"twist",label:"Z Twist",min:-2,max:2,step:.01,default:0}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 p = ${e.varName}_p;
${e.indent}    float r = length(p);
${e.indent}    float power = ${e.getParam("power")};
${e.indent}    ${e.varName}_dr = pow(max(r, 1e-5), power - 1.0) * power * ${e.varName}_dr + 1.0;
${e.indent}    float theta = acos(clamp(p.z / r, -1.0, 1.0));
${e.indent}    float phi = atan(p.y, p.x);
${e.indent}    theta = theta * power + ${e.getParam("phaseX")};
${e.indent}    phi = phi * power + ${e.getParam("phaseY")};
${e.indent}    float zr = pow(r, power);
${e.indent}    p = zr * vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
${e.indent}    float tw = ${e.getParam("twist")};
${e.indent}    if(abs(tw) > 0.001) { float ang = p.z * tw; float s = sin(ang); float c = cos(ang); p.xy = mat2(c,-s,s,c) * p.xy; }
${e.indent}    ${e.varName}_p = p;
${e.indent}}
`});je.register({id:"Sphere",label:"Sphere",category:"Primitives",description:"SDF Sphere.",inputs:[{id:"r",label:"Radius",min:.1,max:5,step:.01,default:1}],glsl:e=>`${e.indent}${e.varName}_d = length(${e.varName}_p) - ${e.getParam("r")};`});je.register({id:"Box",label:"Box",category:"Primitives",description:"SDF Box.",inputs:[{id:"x",label:"Size X",min:.1,max:5,step:.01,default:1},{id:"y",label:"Size Y",min:.1,max:5,step:.01,default:1},{id:"z",label:"Size Z",min:.1,max:5,step:.01,default:1}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 b = vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")});
${e.indent}    vec3 d = abs(${e.varName}_p) - b;
${e.indent}    ${e.varName}_d = length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
${e.indent}}
`});je.register({id:"Twist",label:"Twist (Z)",category:"Distortion",description:"Twists space along the Z-axis.",inputs:[{id:"amount",label:"Amount",min:-5,max:5,step:.01,default:1}],glsl:e=>`
${e.indent}{
${e.indent}    float c_tw = cos(${e.getParam("amount")} * ${e.varName}_p.z);
${e.indent}    float s_tw = sin(${e.getParam("amount")} * ${e.varName}_p.z);
${e.indent}    mat2 m_tw = mat2(c_tw, -s_tw, s_tw, c_tw);
${e.indent}    ${e.varName}_p.xy = m_tw * ${e.varName}_p.xy;
${e.indent}}
`});je.register({id:"Bend",label:"Bend (Y)",category:"Distortion",description:"Bends space along the Y-axis.",inputs:[{id:"amount",label:"Amount",min:-2,max:2,step:.01,default:.5}],glsl:e=>`
${e.indent}{
${e.indent}    float c_bn = cos(${e.getParam("amount")} * ${e.varName}_p.y);
${e.indent}    float s_bn = sin(${e.getParam("amount")} * ${e.varName}_p.y);
${e.indent}    mat2 m_bn = mat2(c_bn, -s_bn, s_bn, c_bn);
${e.indent}    ${e.varName}_p.xz = m_bn * ${e.varName}_p.xz;
${e.indent}}
`});je.register({id:"SineWave",label:"Sine Wave",category:"Distortion",description:"Adds a sinusoidal ripple to the position.",inputs:[{id:"freq",label:"Frequency",min:.1,max:10,step:.1,default:2},{id:"amp",label:"Amplitude",min:0,max:1,step:.01,default:.1}],glsl:e=>`
${e.indent}${e.varName}_p += sin(${e.varName}_p.yzx * ${e.getParam("freq")}) * ${e.getParam("amp")};
`});je.register({id:"Union",label:"Union",category:"Combiners (CSG)",description:"Combines two shapes (min).",inputs:[],glsl:e=>`
${e.indent}bool winA = ${e.varName}_d < ${e.in2}_d;
${e.indent}${e.varName}_d = winA ? ${e.varName}_d : ${e.in2}_d;
${e.indent}${e.varName}_p = winA ? ${e.varName}_p : ${e.in2}_p;
${e.indent}${e.varName}_dr = winA ? ${e.varName}_dr : ${e.in2}_dr;
`});je.register({id:"Subtract",label:"Subtract",category:"Combiners (CSG)",description:"Carves B out of A.",inputs:[],glsl:e=>`
${e.indent}float negB = -${e.in2}_d;
${e.indent}bool winA = ${e.varName}_d > negB; 
${e.indent}${e.varName}_d = winA ? ${e.varName}_d : negB;
${e.indent}${e.varName}_p = winA ? ${e.varName}_p : ${e.in2}_p;
${e.indent}${e.varName}_dr = winA ? ${e.varName}_dr : ${e.in2}_dr;
`});je.register({id:"Intersect",label:"Intersect",category:"Combiners (CSG)",description:"Area where A and B overlap.",inputs:[],glsl:e=>`
${e.indent}bool winA = ${e.varName}_d > ${e.in2}_d;
${e.indent}${e.varName}_d = winA ? ${e.varName}_d : ${e.in2}_d;
${e.indent}${e.varName}_p = winA ? ${e.varName}_p : ${e.in2}_p;
${e.indent}${e.varName}_dr = winA ? ${e.varName}_dr : ${e.in2}_dr;
`});je.register({id:"SmoothUnion",label:"Smooth Union",category:"Combiners (CSG)",description:"Merges shapes organically.",inputs:[{id:"k",label:"Smoothness",min:.01,max:2,step:.01,default:.5}],glsl:e=>`
${e.indent}float h = clamp(0.5 + 0.5 * (${e.in2}_d - ${e.varName}_d) / ${e.getParam("k")}, 0.0, 1.0);
${e.indent}${e.varName}_d = mix(${e.in2}_d, ${e.varName}_d, h) - ${e.getParam("k")} * h * (1.0 - h);
${e.indent}${e.varName}_p = mix(${e.in2}_p, ${e.varName}_p, h);
${e.indent}${e.varName}_dr = mix(${e.in2}_dr, ${e.varName}_dr, h);
`});je.register({id:"Mix",label:"Mix (Lerp)",category:"Combiners (CSG)",description:"Linear interpolation between shapes.",inputs:[{id:"factor",label:"Factor",min:0,max:1,step:.01,default:.5}],glsl:e=>`
${e.indent}${e.varName}_d = mix(${e.varName}_d, ${e.in2}_d, ${e.getParam("factor")});
${e.indent}${e.varName}_p = mix(${e.varName}_p, ${e.in2}_p, ${e.getParam("factor")});
${e.indent}${e.varName}_dr = mix(${e.varName}_dr, ${e.in2}_dr, ${e.getParam("factor")});
`});je.register({id:"Custom",label:"Custom (Legacy)",category:"Utils",description:"Legacy node.",inputs:[],glsl:e=>""});const Fs=(e,n)=>{const t=new Set,o=["root-end"],i=new Set;for(;o.length>0;){const h=o.pop();if(i.has(h))continue;i.add(h),h!=="root-end"&&h!=="root-start"&&t.add(h),n.filter(u=>u.target===h).forEach(u=>o.push(u.source))}const s=e.filter(h=>t.has(h.id));if(!s||s.length===0)return`
        void formula_Modular(inout vec4 z, inout float dr, inout float trap, inout float distOverride, vec4 c, int i) {
            z.xyz += c.xyz;
            float r = length(z.xyz);
            trap = min(trap, r);
        }
        `;let r=`
    // --- Graph Init ---
    vec3 v_start_p = z.xyz;
    float v_start_d = 1000.0;
    float v_start_dr = dr; 
    
    vec3 v_curr_p = v_start_p;
    float v_curr_d = v_start_d;
    float v_curr_dr = v_start_dr;
    `;const l=new Map;l.set("root-start","v_start");let c=0;s.forEach((h,p)=>{const g=`v_${h.id.replace(/[^a-zA-Z0-9]/g,"")}`;l.set(h.id,g);const v=n.filter(C=>C.target===h.id),y=v.find(C=>!C.targetHandle||C.targetHandle==="a"),b=v.find(C=>C.targetHandle==="b"),x=y&&l.get(y.source)||"v_start",m=b&&l.get(b.source)||"v_start";if(r+=`    // Node: ${h.type} (${h.id})
`,r+=`    vec3 ${g}_p = ${x}_p;
`,r+=`    float ${g}_d = ${x}_d;
`,r+=`    float ${g}_dr = ${x}_dr;
`,h.enabled){const C=je.get(h.type);if(C){const k=h.condition&&h.condition.active;let w="    ";if(k){const j=Math.round(Math.max(1,h.condition.mod)),R=Math.round(h.condition.rem);r+=`    if ( (i - (i/${j})*${j}) == ${R} ) {
`,w="        "}const S=j=>h.bindings&&h.bindings[j]?`u${h.bindings[j]}`:c<on?`uModularParams[${c++}]`:"0.0";r+=C.glsl({varName:g,in1:x,in2:m,getParam:S,indent:w}),k&&(r+=`    }
`)}}r+=`
`});const d=n.find(h=>h.target==="root-end");let f="v_start";return d&&d.source!=="root-start"&&(f=l.get(d.source)||"v_start"),r+=`
    z.xyz = ${f}_p;
    dr = ${f}_dr;
    
    float final_d = ${f}_d;
    if (final_d < 999.0 && final_d > -1.0) {
        distOverride = final_d;
    }
    
    trap = min(trap, length(z.xyz));
    `,`
void formula_Modular(inout vec4 z, inout float dr, inout float trap, inout float distOverride, vec4 c, int i) {
${r}
}
`},As=e=>{let n="d = 0.5 * log(max(r, 1.0e-5)) * r / dr_safe;";return e<.5?n=`
        float logR2 = log2(m2);
        // 0.5 * ln(2) / 2 ≈ 0.17328679 — converts log2(r²) to 0.5*r*ln(r) for DE formula
        d = 0.17328679 * logR2 * r / dr_safe;
        `:e<1.5?n="d = (r - 1.0) / dr_safe;":e<2.5?n="d = r / dr_safe;":e<3.5?n=`
        float logR2 = log2(m2);
        // 0.5 * ln(2) ≈ 0.34657359 — converts log2(r²) to r*ln(r), then halved by dampening term
        d = 0.34657359 * logR2 * r / (dr_safe + 8.0);
        `:n="d = (r - 2.0) / dr_safe;",`
        vec2 getDist(float r, float dr, float iter, vec4 z) {
            float m2 = r * r;
            if (m2 < 1.0e-20) return vec2(0.0, iter);
            
            // Log Smoothing Calculation (Shared)
            // Guarded: Only calculate log smoothing if we have actually escaped (> 1.0)
            float smoothIter = iter;
            if (m2 > 1.0) {
                float threshLog = log2(max(uEscapeThresh, 1.1));
                smoothIter = iter + 1.0 - log2(log2(m2) / threshLog);
            }
            
            float d = 0.0;
            float dr_safe = max(abs(dr), 1.0e-20);
            
            ${n}
            
            return vec2(d, smoothIter);
        }`},zs={id:"coreMath",shortId:"cm",name:"Formula Math",category:"Formulas",tabConfig:{label:"Formula",componentId:"panel-formula",order:10},extraUniforms:[{name:He.ModularParams,type:"float",arraySize:on,default:new Float32Array(on)}],params:{iterations:{type:"float",default:16,label:"Iterations",shortId:"it",uniform:"uIterations",min:1,max:500,step:1,group:"main"},paramA:{type:"float",default:8,label:"Param A",shortId:"pa",uniform:"uParamA",min:-10,max:10,step:.001,group:"params"},paramB:{type:"float",default:0,label:"Param B",shortId:"pb",uniform:"uParamB",min:-10,max:10,step:.001,group:"params"},paramC:{type:"float",default:0,label:"Param C",shortId:"pc",uniform:"uParamC",min:-10,max:10,step:.001,group:"params"},paramD:{type:"float",default:0,label:"Param D",shortId:"pd",uniform:"uParamD",min:-10,max:10,step:.001,group:"params"},paramE:{type:"float",default:0,label:"Param E",shortId:"pe",uniform:"uParamE",min:-10,max:10,step:.001,group:"params"},paramF:{type:"float",default:0,label:"Param F",shortId:"pf",uniform:"uParamF",min:-10,max:10,step:.001,group:"params"},vec2A:{type:"vec2",default:{x:0,y:0},label:"Vec2 A",shortId:"v2a",uniform:"uVec2A",min:-10,max:10,step:.001,group:"params"},vec2B:{type:"vec2",default:{x:0,y:0},label:"Vec2 B",shortId:"v2b",uniform:"uVec2B",min:-10,max:10,step:.001,group:"params"},vec2C:{type:"vec2",default:{x:0,y:0},label:"Vec2 C",shortId:"v2c",uniform:"uVec2C",min:-10,max:10,step:.001,group:"params"},vec3A:{type:"vec3",default:new V(0,0,0),label:"Vec3 A",shortId:"v3a",uniform:"uVec3A",min:-10,max:10,step:.001,group:"params"},vec3B:{type:"vec3",default:new V(0,0,0),label:"Vec3 B",shortId:"v3b",uniform:"uVec3B",min:-10,max:10,step:.001,group:"params"},vec3C:{type:"vec3",default:new V(0,0,0),label:"Vec3 C",shortId:"v3c",uniform:"uVec3C",min:-10,max:10,step:.001,group:"params"},vec4A:{type:"vec4",default:new Nt(0,0,0,0),label:"Vec4 A",shortId:"v4a",uniform:"uVec4A",min:-10,max:10,step:.001,group:"params"},vec4B:{type:"vec4",default:new Nt(0,0,0,0),label:"Vec4 B",shortId:"v4b",uniform:"uVec4B",min:-10,max:10,step:.001,group:"params"},vec4C:{type:"vec4",default:new Nt(0,0,0,0),label:"Vec4 C",shortId:"v4c",uniform:"uVec4C",min:-10,max:10,step:.001,group:"params"}},inject:(e,n)=>{var f;const t=n.formula,o=n.quality;t==="Modular"&&e.addDefine("PIPELINE_REV",(n.pipelineRevision||0).toString()),["JuliaMorph","MandelTerrain"].includes(t)&&e.addDefine("SKIP_PRE_BAILOUT","1");const i=we.get(t);let s="",r="",l="";const c=(o==null?void 0:o.estimator)||0;let d=As(c);if(t==="Modular"){const h=Fs(n.pipeline||[],((f=n.graph)==null?void 0:f.edges)||[]);s+=h+`
`,r="formula_Modular(z, dr, trap, distOverride, c, i);",e.setDistOverride({init:"float distOverride = 1e10;",inLoopFull:"if (distOverride < 999.0) { escaped = true; break; }",inLoopGeom:"if (distOverride < 999.0) break;",postFull:"if (distOverride < 999.0) { finalD = distOverride; smoothIter = iter; }",postGeom:"if (distOverride < 999.0) finalD = distOverride;"})}else i&&(s+=i.shader.function+`
`,r=i.shader.loopBody,l=i.shader.loopInit||"",i.shader.preamble&&e.addPreamble(i.shader.preamble),i.shader.getDist&&(d=`vec2 getDist(float r, float dr, float iter, vec4 z) { ${i.shader.getDist} }`));e.addFunction(s),e.setFormula(r,l,d)}};let Os=0;function Gt(){return`l${++Os}`}const $s=(e,n)=>{if(!e)return`
        float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) { return 1.0; }
        float GetHardShadow(vec3 ro, vec3 rd, float lightDist) { return 1.0; }
        `;if(n===3)return`
// ------------------------------------------------------------------
// SHADOWS (Hard Only — Fastest)
// ------------------------------------------------------------------
float GetHardShadow(vec3 ro, vec3 rd, float lightDist) {
    if (uShadowIntensity < 0.001) return 1.0;

    float t = 0.01;
    int limit = min(uShadowSteps, 128);

    for(int i = 0; i < 128; i++) {
        if (i >= limit) break;

        float h = DE_Dist(ro + rd * t);
        if(h < max(1.0e-5, t * 0.0005)) return 0.0;  // Distance-adaptive hit threshold (0.05% of ray distance)
        t += h;
        if(t > lightDist) return 1.0;
    }
    return 1.0;
}

float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) {
    return GetHardShadow(ro, rd, lightDist);
}
`;const t=256,o=n<1.5?`
        float t = 0.05;
        float fudge = 1.0;
    `:`
        float t = 0.0;
        float fudge = uFudgeFactor;
    `,i=n<1.5?`
            if(h < 0.005) return 0.0;
            res = min(res, k * h / t);
            t += max(h, 0.05);
    `:`
            float thresh = max(1.0e-6, t * 0.0001);
            if(h < thresh) return 0.0;
            res = min(res, k * h / max(t, 1.0e-5));
            t += h * fudge;
    `;return`
// ------------------------------------------------------------------
// SHADOWS (${n<1.5?"Lite Soft":"Robust Soft"})
// ------------------------------------------------------------------

float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) {
    if (uShadowIntensity < 0.001) return 1.0;

    float res = 1.0;

    ${o}

    // Jitter starting position to break banding
    t += noise * 0.01;

    int limit = uShadowSteps;

    for(int i = 0; i < ${t}; i++) {
        if (i >= limit) break;

        float h = DE_Dist(ro + rd * t);
        ${i}
        if(t > lightDist) break;
    }
    return clamp(res, 0.0, 1.0);
}

float GetHardShadow(vec3 ro, vec3 rd, float lightDist) {
    #if defined(DISABLE_SHADOWS) && DISABLE_SHADOWS == 1
        return 1.0;
    #endif

    float t = 0.0;
    float fudge = uFudgeFactor;
    int limit = uShadowSteps;

    for(int i = 0; i < ${t}; i++) {
        if (i >= limit) break;

        float h = DE_Dist(ro + rd * t);

        float thresh = max(1.0e-6, t * 0.0002);

        if(h < thresh) return 0.0;

        t += h * fudge;

        if(t > lightDist) return 1.0;
    }

    return 1.0;
}
`},tr=e=>`
vec3 calculatePBRContribution(vec3 p, vec3 n, vec3 v, vec3 albedo, float roughness, float metallic, float stochasticSeed, bool calcShadows) {
    vec3 Lo = vec3(0.0);

    float pixelSizeScale = uPixelSizeBase / uInternalScale;
    float biasAmount = uShadowBias + pixelSizeScale * 2.0;
    vec3 shadowRo = p + n * biasAmount;

    // COMPILER OPTIMIZATION: Prevent unrolling of light loop
    int lightCount = uLightCount;

    for (int i = 0; i < MAX_LIGHTS; i++) {
        if (i >= lightCount) break;

        float intensity = uLightIntensity[i];
        if (intensity < 0.01) continue;

        float type = uLightType[i];
        bool isDirectional = type > 0.5;

        vec3 lVec;
        float distToLight;

        if (isDirectional) {
             lVec = uLightDir[i]; // Already "toward light" from uniform manager
             distToLight = DIR_LIGHT_DIST;  // Directional: treat as infinitely far (> BOUNDING_RADIUS)
        } else {
             lVec = uLightPos[i] - p;
             distToLight = length(lVec);
             if (distToLight < 0.0001) continue;  // Skip degenerate (light inside surface)
        }

        vec3 l = isDirectional ? normalize(lVec) : lVec / distToLight;

        float NdotL = max(0.0, dot(n, l));
        if (NdotL <= 0.0) continue;

        float shadow = 1.0;
        if (calcShadows && uShadows > 0.5 && uLightShadows[i] > 0.5) {
            float s = 1.0;
${e?`
            bool useStochasticShadows = (uAreaLights > 0.5);
            if (useStochasticShadows) {
                 float samplingSeed = fract(stochasticSeed + float(i) * 1.618);

                 vec3 u, v;
                 buildTangentBasis(l, u, v);

                 float r_jitter = sqrt(samplingSeed);
                 float theta = samplingSeed * TAU * 1.618033;
                 float spread = 2.0 / max(uShadowSoftness, 0.1);

                 vec3 offset = (u * cos(theta) + v * sin(theta)) * r_jitter * spread;

                 vec3 jitteredLDir = normalize(l + offset);
                 float jitteredDist = distToLight;

                 if (!isDirectional) {
                      vec3 jitteredTarget = uLightPos[i] + offset * distToLight;
                      vec3 jVec = jitteredTarget - p;
                      jitteredDist = length(jVec);
                      jitteredLDir = jVec / jitteredDist;
                 }

                 s = GetHardShadow(shadowRo, jitteredLDir, jitteredDist);
            } else {
                 s = GetSoftShadow(shadowRo, l, uShadowSoftness, distToLight, stochasticSeed);
            }
`:`
                 s = GetSoftShadow(shadowRo, l, uShadowSoftness, distToLight, stochasticSeed);
`}
            shadow = mix(1.0, s, uShadowIntensity);
        }

        // Branchless attenuation: CPU packs coefficients into uLightFalloff (d² term) and uLightFalloffType (d term)
        // Quadratic: (k, 0) → 1/(1+k·d²)   Linear: (0, k) → 1/(1+k·d)   InvSq: (k_from_range, 0)
        float att = 1.0;
        if (!isDirectional && (uLightFalloff[i] + uLightFalloffType[i]) > 0.001) {
            float d2 = distToLight * distToLight;
            att = 1.0 / (1.0 + uLightFalloff[i] * d2 + uLightFalloffType[i] * distToLight);
        }

        vec3 radiance = uLightColor[i] * intensity * att * shadow;
`,ar=`
    }

    return Lo;
}
`,Bs=e=>`
// ------------------------------------------------------------------
// PBR HELPERS (Blinn-Phong)
// ------------------------------------------------------------------
${tr(e)}
        // Blinn-Phong specular
        vec3 h = normalize(l + v);
        float NdotH = max(0.0, dot(n, h));
        float shininess = max(2.0, 2.0 / (roughness * roughness + 0.001) - 2.0);
        float spec = pow(NdotH, shininess) * (shininess + 2.0) / (8.0 * PI);
        vec3 specular = mix(vec3(1.0), albedo, metallic) * spec;

        float kD = (1.0 - metallic);
        Lo += (kD * albedo * uDiffuse / PI + specular * uSpecular) * radiance * NdotL;
${ar}
`,Hs=e=>`
// ------------------------------------------------------------------
// PBR HELPERS (Cook-Torrance GGX)
// ------------------------------------------------------------------
${tr(e)}
        vec3 F0 = mix(vec3(0.04), albedo, metallic);
        float NdotV = max(0.001, dot(n, v));

        vec3 h = normalize(l + v);
        float HdotV = max(0.0, dot(h, v));
        float NdotH = max(0.0, dot(n, h));

        // Fresnel (Schlick)
        vec3 F = fresnelSchlick(HdotV, F0);

        // Distribution (GGX / Trowbridge-Reitz)
        float a = roughness * roughness;
        float a2 = a * a;
        float denom = NdotH * NdotH * (a2 - 1.0) + 1.0;
        float D = a2 / (PI * denom * denom + GGX_EPSILON);

        // Geometry (Smith-GGX)
        float kG = a * 0.5;
        float G1V = NdotV / (NdotV * (1.0 - kG) + kG);
        float G1L = NdotL / (NdotL * (1.0 - kG) + kG);
        float G = G1V * G1L;

        // Cook-Torrance specular BRDF
        vec3 specular = (D * F * G) / (4.0 * NdotV * NdotL + GGX_EPSILON);

        // Energy Conservation
        vec3 kS = F;
        vec3 kD = (vec3(1.0) - kS) * (1.0 - metallic);

        Lo += (kD * albedo * uDiffuse / PI + specular * uSpecular) * radiance * NdotL;
${ar}
`,nr=`
void buildTangentBasis(vec3 n, out vec3 t, out vec3 b) {
    vec3 up = abs(n.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    t = normalize(cross(n, up));
    b = cross(n, t);
}
`,Gs=`
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}
`,Zn=nr+Gs,Us=`
#ifdef LIGHT_SPHERES
vec3 intersectLightSphere(vec3 ro, vec3 rd, float radiusJitter) {
    for (int i = 0; i < MAX_LIGHTS; i++) {
        if (i >= uLightCount) break;
        if (uLightIntensity[i] < 0.01 || uLightType[i] > 0.5 || uLightRadius[i] < 0.001) continue;

        vec3 oc = ro - uLightPos[i];
        float distSq = dot(oc, oc);
        float r = uLightRadius[i] * (1.0 + radiusJitter);
        float soft = uLightSoftness[i];

        // Halo: soft > 1 extends test radius beyond sphere
        float testR = r * max(1.0, soft);

        // Inside sphere: tint view
        if (distSq < testR * testR) {
            float dist = sqrt(distSq);
            float fade = 1.0 - dist / testR;
            fade = fade * fade * (3.0 - 2.0 * fade);
            if (fade > 0.001) return vec3(fade, float(i), 1.0);
        }

        // Ray-sphere intersection — chord-based thickness for volumetric look
        float b = dot(rd, oc);
        if (-b < 0.001) continue;

        float c = distSq - testR * testR;
        float disc = b * b - c;
        if (disc > 0.0) {
            // thickness: 0 at edge, 1 at center — gives natural 3D sphere falloff
            float thickness = sqrt(disc) / testR;

            // soft 0: solid orb, sharp edge (low exponent flattens brightness)
            // soft 1: gentle gradient, center-to-edge
            // soft 2: concentrated core, extended glow
            float fade = pow(thickness, 0.15 + soft * 1.4);

            // Energy conservation: as halo expands beyond r, dim proportionally
            // so it reads as "softer" not "bigger". r/testR = 1 when soft<=1.
            fade *= min(1.0, r / testR);

            if (fade > 0.001) return vec3(fade, float(i), 0.0);
        }
    }
    return vec3(0.0, -1.0, 0.0);
}
#endif
`,Ws=`
#ifdef LIGHT_SPHERES
{
    vec3 _lsHit = intersectLightSphere(ro, rd, 0.0);
    if (_lsHit.x > 0.0) {
        int _li = int(_lsHit.y);
        vec3 _lc = uLightColor[_li] * uLightIntensity[_li];
        env = mix(env, _lc, _lsHit.x);
    }
}
#endif
`,qs=()=>`
#ifdef LIGHT_SPHERES
void compositeLightSpheres(vec3 ro, vec3 rd, inout vec3 col, inout float d, bool hit, float seed) {
    // Stochastic radius jitter: +-2% per frame, accumulation averages into smooth AA edges.
    // Disabled during navigation (uBlendFactor >= 0.99) for a clean image.
    float radiusJitter = uBlendFactor >= 0.99 ? 0.0 : (fract(seed * 91.3) - 0.5) * 0.04;

    vec3 lsHit = intersectLightSphere(ro, rd, radiusJitter);
    if (lsHit.x > 0.001) {
        int li = int(lsHit.y);
        vec3 lc = uLightColor[li] * uLightIntensity[li];

        if (lsHit.z > 0.5) {
            // Inside sphere: tint the entire view like a glowing fog volume
            col = mix(col, lc, lsHit.x * 0.6);
        } else {
            // Outside: depth-test against fractal surface
            vec3 oc = ro - uLightPos[li];
            float b = dot(rd, oc);
            float r = uLightRadius[li] * (1.0 + radiusJitter);
            float disc = r * r - (dot(oc, oc) - b * b);
            float lightD = disc > 0.0 ? max(0.001, -b - sqrt(disc)) : max(0.001, -b);

            if (!hit || lightD < d) {
                col = mix(col, lc, lsHit.x);
                d = lightD;
            }
        }
    }
}
#endif
`,Vs=(e,n,t=!0)=>`
// ------------------------------------------------------------------
// MONTE CARLO PBR PATH TRACER
// ------------------------------------------------------------------

float luminance(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec3 cosineSampleHemisphere(vec3 n, vec2 seedVec) {
    float r = fract(seedVec.x * phi);
    float angle = seedVec.y * TAU;
    vec2 p = vec2(sqrt(r) * cos(angle), sqrt(r) * sin(angle));
    vec3 t, b;
    buildTangentBasis(n, t, b);
    float rz = sqrt(max(0.0, 1.0 - dot(p, p)));
    return normalize(t * p.x + b * p.y + n * rz);
}

vec3 importanceSampleGGX(vec3 n, float roughness, vec2 seedVec) {
    vec2 xi = vec2(
        fract(seedVec.x * phi),
        fract(seedVec.y * phi + 0.5)
    );
    float a = roughness * roughness;
    float azimuth = TAU * xi.x;
    float cosTheta = sqrt((1.0 - xi.y) / (1.0 + (a*a - 1.0) * xi.y));
    float sinTheta = sqrt(max(0.0, 1.0 - cosTheta*cosTheta));
    vec3 h = vec3(cos(azimuth) * sinTheta, sin(azimuth) * sinTheta, cosTheta);
    vec3 t, b;
    buildTangentBasis(n, t, b);
    return normalize(t * h.x + b * h.y + n * h.z);
}

vec3 calculatePathTracedColor(vec3 ro, vec3 rd, float d_init, vec4 result_init, float seed) {
    vec3 radiance = vec3(0.0);
    vec3 throughput = vec3(1.0);
    vec3 currentRo = ro;
    vec3 currentRd = rd;
    float d = d_init;
    vec4 result = result_init;
    bool hit = true;
    int maxBounces = uPTBounces;
    float pixelSizeScale = uPixelSizeBase / uInternalScale;

    for (int bounce = 0; bounce < 8; bounce++) {
        if (bounce >= ${e?"2":"maxBounces"}) break;

        // Coprime decorrelation: irrational constants shift the blue noise texture lookup by a different
        // amount each bounce, ensuring samples from different bounces land on uncorrelated texels.
        // 17.123 and 23.456 are mutually irrational (no integer ratio) — same principle as Halton sequences.
        // 7.31 / 11.17 used for secondary env noise lookup below (also mutually irrational).
        vec2 bounceOffset = vec2(float(bounce) * 17.123, float(bounce) * 23.456);
        vec4 blueNoise = getBlueNoise4(gl_FragCoord.xy + bounceOffset);

        if (!hit) {
            float skyIntensity = (bounce == 0) ? uEnvBackgroundStrength : uEnvStrength;
            vec3 env = sampleMiss(currentRo, currentRd, 0.0) * skyIntensity;
            if (bounce == 0 && uFogFar < 1000.0) {
                float fogFactor = smoothstep(uFogNear, uFogFar, uFogFar * 0.95);
                env = mix(env, uFogColorLinear, fogFactor * 0.5);
            }
            radiance += env * throughput;
            break;
        }

        vec3 p_ray = currentRo + currentRd * d;
        vec3 p_fractal = p_ray + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;
        vec3 albedo, n, emission;
        float roughness;
        getSurfaceMaterial(p_ray, p_fractal, result, d, albedo, n, emission, roughness, bounce == 0);

        float ao = 1.0;
        if (uAOIntensity > 0.01 && bounce == 0) {
            ao = GetAO(p_ray, n, seed + float(bounce) * 13.37);
        }

        if (bounce == 0 && uRim > 0.01) {
            float NdotV_rim = max(0.0, dot(n, -currentRd));
            float rimFactor = pow(1.0 - NdotV_rim, uRimExponent) * uRim;
            emission += vec3(0.5, 0.7, 1.0) * rimFactor;
        }

        roughness = max(roughness, 0.04);  // Minimum roughness — prevents NaN in GGX distribution denominator
        float emissionMult = (bounce == 0) ? 1.0 : uPTEmissionMult;
        radiance += (emission * ao * emissionMult) * throughput;

        // --- Shared state for NEE and bounce selection ---
        vec3 viewDir = -currentRd;
        float NdotV = max(0.001, dot(n, viewDir));
        vec3 F0 = mix(vec3(0.04) * uSpecular, albedo, uReflection);  // 0.04 = standard dielectric F0 (4% reflectance at normal incidence)
        vec3 F_surface = fresnelSchlick(NdotV, F0);

        // Schlick-GGX geometry term parameters (shared by NEE and IS weight)
        float a_ggx = roughness * roughness;
        float kG = a_ggx * 0.5;

        // --- NEXT EVENT ESTIMATION ---
        // Active light list — hoisted so PT_VOLUMETRIC can reuse it
        int activeCount = 0;
        int activeIndices[3];
        if (uLightIntensity[0] > 0.01) activeIndices[activeCount++] = 0;
        if (uLightIntensity[1] > 0.01) activeIndices[activeCount++] = 1;
        if (uLightIntensity[2] > 0.01) activeIndices[activeCount++] = 2;

        // Bias epsilon — hoisted so PT_ENV_NEE can reuse it
        float distFromFractalOrigin = length(p_fractal);
        float floatLimitNEE = max(1.0e-20, distFromFractalOrigin * PRECISION_RATIO_HIGH);
        float orthoPixelFootprintNEE = (uCamType > 0.5 && uCamType < 1.5) ? pixelSizeScale : pixelSizeScale * d;
        float visualLimitNEE = orthoPixelFootprintNEE * (1.0 / uDetail);
        float biasEps = max(floatLimitNEE, visualLimitNEE);

        if (activeCount > 0) {
            float lightSeed = blueNoise.r;
            int pick = clamp(int(lightSeed * float(activeCount)), 0, activeCount - 1);

            // PT_NEE_ALL_LIGHTS: evaluate every active light per bounce.
            // Default: sample one random light with PDF compensation (unbiased, faster).
            int neeCount = 1;
            #ifdef PT_NEE_ALL_LIGHTS
                neeCount = activeCount;
            #endif

            for (int nee_i = 0; nee_i < 3; nee_i++) {
                if (nee_i >= neeCount) break;

                int lightIdx;
                #ifdef PT_NEE_ALL_LIGHTS
                    lightIdx = activeIndices[nee_i];
                #else
                    lightIdx = activeIndices[pick];
                #endif

                bool isDirectional = uLightType[lightIdx] > 0.5;
                vec3 shadowRo = p_ray + n * (biasEps * 2.0 + uShadowBias);

                vec3 lVec;
                float distToLight;
                if (isDirectional) {
                    lVec = uLightDir[lightIdx]; // Already "toward light" from uniform manager
                    distToLight = DIR_LIGHT_DIST;
                } else {
                    lVec = uLightPos[lightIdx] - p_ray;
                    distToLight = length(lVec);
                }

                vec3 lDir = isDirectional ? normalize(lVec) : lVec / max(1.0e-5, distToLight);

                float shadow = 1.0;
                if (uShadows > 0.5 && uLightShadows[lightIdx] > 0.5) {
                    ${!t||e?`
        shadow = GetSoftShadow(shadowRo, lDir, uShadowSoftness, distToLight, blueNoise.r);
    `:`
        if (uAreaLights > 0.5) {
            vec2 jitter = blueNoise.gb;
            vec3 sT, sB;
            buildTangentBasis(lDir, sT, sB);

            float spread = 2.0 / max(uShadowSoftness, 0.1);
            float r = sqrt(jitter.x) * spread;
            float theta = jitter.y * TAU;

            vec3 offsetDir = sT * cos(theta) * r + sB * sin(theta) * r;
            vec3 shadowDir = normalize(lDir + offsetDir);
            float shadowDist = distToLight;

            if (!isDirectional) {
                 float radius = spread * distToLight;
                 vec3 jitterOffset = (sT * cos(theta) + sB * sin(theta)) * sqrt(jitter.x) * radius;
                 vec3 targetPos = uLightPos[lightIdx] + jitterOffset;
                 vec3 tVec = targetPos - p_ray;
                 shadowDist = length(tVec);
                 shadowDir = tVec / max(1.0e-5, shadowDist);
            }

            shadow = GetHardShadow(shadowRo, shadowDir, shadowDist);
        } else {
            shadow = GetSoftShadow(shadowRo, lDir, uShadowSoftness, distToLight, blueNoise.r);
        }
    `}
                    shadow = mix(1.0, shadow, uShadowIntensity);
                }

                if (shadow > 0.01) {
                    vec3 h = normalize(lDir + viewDir);
                    float ndotl = max(0.0, dot(n, lDir));
                    float hdotv = max(0.0, dot(h, viewDir));
                    float ndoth = max(0.0, dot(n, h));

                    // Branchless attenuation (see pbr.ts LOOP_OPEN)
                    float att = 1.0;
                    if (!isDirectional && (uLightFalloff[lightIdx] + uLightFalloffType[lightIdx]) > 0.001) {
                        float d2_att = distToLight * distToLight;
                        att = 1.0 / (1.0 + uLightFalloff[lightIdx] * d2_att + uLightFalloffType[lightIdx] * distToLight);
                    }

                    vec3 F_nee = fresnelSchlick(hdotv, F0);

                    // GGX Cook-Torrance specular (Schlick-GGX geometry, matches pbr.ts)
                    float ndotl_s = max(0.001, ndotl);
                    float a2_nee = a_ggx * a_ggx;
                    float denom_nee = ndoth * ndoth * (a2_nee - 1.0) + 1.0;
                    float D_nee = a2_nee / (PI * denom_nee * denom_nee + GGX_EPSILON);
                    float G1V_nee = NdotV / (NdotV * (1.0 - kG) + kG);
                    float G1L_nee = ndotl_s / (ndotl_s * (1.0 - kG) + kG);
                    float G_nee = G1V_nee * G1L_nee;
                    vec3 spec = (D_nee * F_nee * G_nee) / max(0.001, 4.0 * NdotV * ndotl_s);

                    vec3 kS_nee = F_nee;
                    vec3 kD_nee = (vec3(1.0) - kS_nee) * (1.0 - uReflection);

                    // PDF: 1 when sampling all lights, activeCount when sampling 1 randomly
                    float pdf;
                    #ifdef PT_NEE_ALL_LIGHTS
                        pdf = 1.0;
                    #else
                        pdf = float(activeCount);
                    #endif

                    vec3 directContrib = (kD_nee * albedo * uDiffuse / PI + spec) * uLightColor[lightIdx] * uLightIntensity[lightIdx] * ndotl * shadow * att * ao * pdf;

                    // Firefly clamp: suppress outlier samples (runtime, raise uPTMaxLuminance to disable)
                    float dcLum = luminance(directContrib);
                    directContrib *= min(1.0, uPTMaxLuminance / max(dcLum, 0.001));

                    radiance += directContrib * throughput;
                }
            }
        } // End NEE

        // --- ENVIRONMENT NEE (compile switch) ---
        // Directly samples the env map as a diffuse light source each bounce.
        // Eliminates the need for a bounce to "accidentally" escape to sky.
        #ifdef PT_ENV_NEE
        if (uEnvStrength > 0.001) {
            vec4 envNoise = getBlueNoise4(gl_FragCoord.xy + bounceOffset + vec2(7.31, 11.17));
            vec3 envDir = cosineSampleHemisphere(n, envNoise.rg);
            float envNdotL = max(0.0, dot(n, envDir));
            if (envNdotL > 0.001) {
                vec3 envOrigin = p_ray + n * (biasEps * 2.0);
                float envD; vec4 envResult; vec3 envGlow = vec3(0.0); float envVol = 0.0; vec3 envScatter = vec3(0.0);
                bool envHit = traceSceneLean(envOrigin, envDir, envD, envResult, envGlow, seed + float(bounce) * 5.31, envVol, envScatter);
                if (!envHit) {
                    // Cosine-weighted PDF = NdotL/PI cancels with Lambertian BRDF = kD*albedo/PI
                    // → weight = kD * albedo (clean, no NdotL needed)
                    vec3 envF = fresnelSchlick(envNdotL, F0);
                    vec3 envKD = (vec3(1.0) - envF) * (1.0 - uReflection);
                    vec3 envColor = GetEnvMap(envDir, 0.0) * uEnvStrength;
                    radiance += envKD * albedo * uDiffuse * envColor * throughput;
                }
            }
        }
        #endif

        // --- BOUNCE DIRECTION SELECTION ---
        vec3 kS = F_surface;
        vec3 kD = (vec3(1.0) - kS) * (1.0 - uReflection);
        vec3 weightSpec = kS;
        vec3 weightDiff = kD * albedo * uDiffuse;
        float lumSpec = luminance(weightSpec);
        float lumDiff = luminance(weightDiff);
        float probSpec = lumSpec / max(0.0001, lumSpec + lumDiff);
        float smoothness = 1.0 - roughness;
        probSpec = mix(probSpec, 1.0, smoothness * 0.4);  // Bias smooth surfaces toward specular bounces
        probSpec = clamp(probSpec, 0.05, 0.95);  // Ensure both bounce types always have non-zero probability
        float randType = fract(blueNoise.a * 1.618);  // Golden ratio decorrelation for bounce type selection
        vec2 dirSeed = blueNoise.gb;

        if (randType < probSpec) {
            vec3 H = importanceSampleGGX(n, roughness, dirSeed);
            vec3 newDir = reflect(currentRd, H);
            // GGX IS weight: BRDF/PDF ≈ F * G * HdotV / (NdotV * NdotH)
            float HdotV_sp = max(0.001, dot(H, -currentRd));
            float NdotH_sp = max(0.001, dot(n, H));
            float NdotL_sp = max(0.001, dot(n, newDir));
            float NdotV_sp = max(0.001, NdotV);
            // Schlick-GGX geometry (matches NEE and pbr.ts)
            float G1L_sp = NdotL_sp / (NdotL_sp * (1.0 - kG) + kG);
            float G1V_sp = NdotV_sp / (NdotV_sp * (1.0 - kG) + kG);
            currentRd = newDir;
            throughput *= F_surface * G1L_sp * G1V_sp * HdotV_sp / (NdotV_sp * NdotH_sp) / probSpec;
            if (dot(currentRd, n) < 0.0) currentRd = cosineSampleHemisphere(n, dirSeed);
        } else {
            currentRd = cosineSampleHemisphere(n, dirSeed);
            throughput *= weightDiff / (1.0 - probSpec);
        }

        throughput *= uPTGIStrength;
        currentRo = p_ray + n * (biasEps * 2.0);
        float bounceVol = 0.0;
        vec3 bounceGlow = vec3(0.0);
        vec3 bounceScatter = vec3(0.0);
        hit = traceSceneLean(currentRo, currentRd, d, result, bounceGlow, seed + float(bounce), bounceVol, bounceScatter);

        // Absorption-only fog on bounce paths (Beer-Lambert with actual march distance).
        // Primary-ray scatter (god rays) is accumulated in traceScene on the camera ray.
        if (uFogDensity > 0.001) {
            float trans = exp(-uFogDensity * d);
            radiance += uFogColorLinear * (1.0 - trans) * throughput;
            throughput *= trans;
        }

        // Russian roulette termination (decorrelated from bounce type selection)
        // Start after bounce 2 to guarantee primary + 1st indirect are always evaluated
        if (bounce > 2) {
            float maxThroughput = max(throughput.r, max(throughput.g, throughput.b));
            if (maxThroughput < 0.05) {  // Below 5% contribution — candidate for termination
                // Use a separate noise sample for termination to avoid correlation with randType
                float rrRand = fract(blueNoise.r * 1.618 + 0.7);  // 1.618 = golden ratio decorrelation
                float survivalProb = maxThroughput * 10.0;  // Scale: 5% throughput → 50% survival
                if (rrRand > survivalProb) break;
                throughput /= survivalProb;  // Energy-conserving boost for surviving paths
            }
        }
        throughput = min(throughput, vec3(4.0));  // Firefly suppression clamp
    }
    return radiance;
}
`;function rn(e){let n=!1;const t=e.map(o=>o.id?o:(n=!0,{...o,id:Gt()}));return n?t:e}const Ct=(e,n)=>!e||!e.lights||n>=e.lights.length?{id:"",type:"Point",position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:0,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0,radius:0,range:0,intensityUnit:"raw"}:e.lights[n],Ys=[{id:Gt(),type:"Point",position:{x:-2,y:1,z:2},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:1.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,radius:0,softness:0},{id:Gt(),type:"Point",position:{x:2,y:-1,z:1},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0,radius:0,softness:0},{id:Gt(),type:"Point",position:{x:0,y:-5,z:2},rotation:{x:0,y:0,z:0},color:"#0088ff",intensity:.25,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!1,castShadow:!0,radius:0,softness:0}],Xs={id:"lighting",shortId:"l",name:"Lighting",category:"Rendering",tabConfig:{label:"Light",componentId:"panel-light",order:30,condition:{param:"$advancedMode",bool:!0}},viewportConfig:{componentId:"overlay-lighting",renderOrder:50,type:"dom"},engineConfig:{toggleParam:"advancedLighting",mode:"compile",label:"Lighting Engine",groupFilter:"engine_settings"},extraUniforms:[{name:He.LightCount,type:"int",default:0},{name:He.LightType,type:"float",arraySize:ke,default:new Float32Array(ke).fill(0)},{name:He.LightPos,type:"vec3",arraySize:ke,default:new Array(ke).fill(new V)},{name:He.LightDir,type:"vec3",arraySize:ke,default:new Array(ke).fill(new V(0,-1,0))},{name:He.LightColor,type:"vec3",arraySize:ke,default:new Array(ke).fill(new qe(1,1,1))},{name:He.LightIntensity,type:"float",arraySize:ke,default:new Float32Array(ke).fill(0)},{name:He.LightShadows,type:"float",arraySize:ke,default:new Float32Array(ke).fill(0)},{name:He.LightFalloff,type:"float",arraySize:ke,default:new Float32Array(ke).fill(0)},{name:He.LightFalloffType,type:"float",arraySize:ke,default:new Float32Array(ke).fill(0)},{name:He.LightRadius,type:"float",arraySize:ke,default:new Float32Array(ke).fill(0)},{name:He.LightSoftness,type:"float",arraySize:ke,default:new Float32Array(ke).fill(0)}],params:{advancedLighting:{type:"boolean",default:!0,label:"Light Engine",shortId:"le",group:"main",noReset:!0,hidden:!0,onUpdate:"compile",description:"Master switch for lighting logic. Disabling provides stubs only."},ptEnabled:{type:"boolean",default:!0,label:"Path Tracing Core",shortId:"pe",group:"engine_settings",ui:"checkbox",description:"Compiles the Path Tracing module. Disable to reduce shader size.",onUpdate:"compile",noReset:!0,estCompileMs:1500},renderMode:{type:"float",default:0,label:"Active Mode",shortId:"rm",group:"engine_settings",parentId:"ptEnabled",options:[{label:"Direct (Fast)",value:0},{label:"Path Tracing (GI)",value:1}],description:"Switches between fast direct lighting and physically based Global Illumination.",onUpdate:"compile",noReset:!0},ptBounces:{type:"int",default:3,label:"Max Bounces",shortId:"pb",uniform:"uPTBounces",min:1,max:8,step:1,group:"engine_settings",parentId:"ptEnabled",ui:"numeric",description:"Recursion depth. Higher = Brighter interiors, Slower render."},ptGIStrength:{type:"float",default:1,label:"GI Strength",shortId:"pg",uniform:"uPTGIStrength",min:0,max:5,step:.01,group:"engine_settings",parentId:"ptEnabled",description:"Artistic boost for bounced light intensity."},specularModel:{type:"float",default:0,label:"Specular Model",shortId:"sm",group:"engine_settings",options:[{label:"Blinn-Phong (Fast)",value:0,estCompileMs:0},{label:"Cook-Torrance (Quality)",value:1,estCompileMs:400}],description:"BRDF model for direct lighting. Cook-Torrance is physically accurate but increases shader compile time.",onUpdate:"compile",noReset:!0},shadowsCompile:{type:"boolean",default:!0,label:"Shadow Engine",shortId:"sc",group:"engine_settings",ui:"checkbox",noReset:!0,onUpdate:"compile",description:"Compiles the shadow raymarching loop. Disable to save ~5s compile time.",estCompileMs:1500},shadowAlgorithm:{type:"float",default:0,label:"Shadow Quality",shortId:"sa",group:"engine_settings",parentId:"shadowsCompile",options:[{label:"Hard Only (Fastest)",value:2,estCompileMs:500},{label:"Lite Soft (Fast)",value:1,estCompileMs:1500},{label:"Robust Soft (Quality)",value:0,estCompileMs:3e3}],description:"Shadow algorithm. Hard = binary occlusion, Lite = fast penumbra, Robust = accurate penumbra.",onUpdate:"compile",noReset:!0},ptStochasticShadows:{type:"boolean",default:!0,label:"Area Lights",shortId:"ps",group:"engine_settings",parentId:"shadowsCompile",ui:"checkbox",onUpdate:"compile",noReset:!0,estCompileMs:800,description:"Compiles stochastic area light shadow code. Creates realistic penumbras via accumulation."},ptNEEAllLights:{type:"boolean",default:!1,label:"Sample All Lights",shortId:"pal",group:"engine_settings",parentId:"ptEnabled",ui:"checkbox",onUpdate:"compile",noReset:!0,description:"Evaluates every active light per bounce instead of one random light. Reduces shadow noise at the cost of N× more shadow rays."},ptEnvNEE:{type:"boolean",default:!1,label:"Environment NEE",shortId:"pen",group:"engine_settings",parentId:"ptEnabled",ui:"checkbox",onUpdate:"compile",noReset:!0,description:"Directly samples the environment as a light source each bounce. Large noise reduction for sky-lit scenes at the cost of one extra trace per bounce."},ptMaxLuminance:{type:"float",default:10,label:"Firefly Clamp",shortId:"pfl",uniform:"uPTMaxLuminance",min:.5,max:200,step:.5,scale:"log",group:"engine_settings",parentId:"ptEnabled",description:"Clamps per-sample luminance to suppress bright firefly spikes. Lower = cleaner but slightly biased. Raise to effectively disable."},shadows:{type:"boolean",default:!0,label:"Enable",shortId:"sh",group:"main",uniform:"uShadows",ui:"checkbox",condition:{param:"shadowsCompile",bool:!0}},areaLights:{type:"boolean",default:!1,label:"Area Lights",shortId:"al",uniform:"uAreaLights",group:"shadows",hidden:!0,condition:{param:"ptStochasticShadows",bool:!0},description:"Stochastic area light shadows. Disable for sharp analytical shadows."},shadowIntensity:{type:"float",default:1,label:"Opacity",shortId:"si",uniform:"uShadowIntensity",min:0,max:1,step:.01,group:"shadows",condition:{bool:!0}},shadowSoftness:{type:"float",default:16,label:"Softness",shortId:"ss",uniform:"uShadowSoftness",min:2,max:2e3,step:1,group:"shadows",scale:"log",condition:{bool:!0}},shadowSteps:{type:"int",default:128,label:"Steps",shortId:"st",min:16,max:512,step:16,group:"shadows",condition:{bool:!0},uniform:"uShadowSteps",ui:"numeric",description:"Quality vs Performance."},shadowBias:{type:"float",default:.002,label:"Bias",shortId:"sb",uniform:"uShadowBias",min:0,max:1,step:1e-6,group:"shadows",scale:"log",condition:{bool:!0},description:"Prevents surface acne."},lights:{type:"complex",default:Ys,label:"Light List",shortId:"ll",group:"data",hidden:!0,noReset:!0}},inject:(e,n,t)=>{if(t!=="Main"){e.addPostDEFunction(`
             float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) { return 1.0; }
             float GetHardShadow(vec3 ro, vec3 rd, float lightDist) { return 1.0; }
             vec3 calculateShading(vec3 ro, vec3 rd, float d, vec4 result, float stochasticSeed) { return vec3(0.0); }
             vec3 calculatePathTracedColor(vec3 ro, vec3 rd, float d_init, vec4 result_init, float seed) { return vec3(0.0); }
             `);return}e.addDefine("MAX_LIGHTS",ke.toString());const o=n.lighting;if(o&&!o.advancedLighting){e.addDefine("MAX_LIGHTS","0"),e.addPostDEFunction(`
             float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) { return 1.0; }
             float GetHardShadow(vec3 ro, vec3 rd, float lightDist) { return 1.0; }
             vec3 calculateShading(vec3 ro, vec3 rd, float d, vec4 result, float stochasticSeed) {
                 vec3 p = ro + rd * d;
                 vec3 p_fractal = p + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;
                 float eps = max(d * 0.001, 1e-6);
                 vec2 e = vec2(eps, 0.0);
                 vec3 n = normalize(vec3(
                     DE_Dist(p + e.xyy),
                     DE_Dist(p + e.yxy),
                     DE_Dist(p + e.yyx)
                 ));

                 // Layer 1 gradient color (same as full shader)
                 float val1 = getMappingValue(uColorMode, p_fractal, result, n, uColorScale);
                 float t1Raw = val1 * uColorScale + uColorOffset;
                 float t1 = pow(abs(fract(mod(t1Raw, 1.0))), uGradientBias);
                 vec3 albedo = textureLod0(uGradientTexture, vec2(t1, 0.5)).rgb;

                 // Simple N·L + ambient
                 float NdotL = max(dot(n, normalize(vec3(-0.5, 1.0, 0.8))), 0.0);
                 float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0) * 0.08;
                 float light = 0.03 + NdotL * 0.3 + rim;
                 return albedo * light;
             }
             vec3 calculatePathTracedColor(vec3 ro, vec3 rd, float d_init, vec4 result_init, float seed) {
                 return calculateShading(ro, rd, d_init, result_init, seed);
             }
             `);return}const i=(o==null?void 0:o.shadowsCompile)!==!1,s=(o==null?void 0:o.shadowAlgorithm)??0,r=s===2?3:s===1?1:2;e.addPostDEFunction($s(i,r)),!i&&!(o!=null&&o.shadows)?e.addDefine("DISABLE_SHADOWS","1"):e.addDefine("SHADOW_QUALITY","2"),(o==null?void 0:o.ptEnabled)!==!1&&(e.addDefine("PT_ENABLED","1"),o!=null&&o.ptNEEAllLights&&e.addDefine("PT_NEE_ALL_LIGHTS","1"),o!=null&&o.ptEnvNEE&&e.addDefine("PT_ENV_NEE","1"));const l=(o==null?void 0:o.ptStochasticShadows)===!0&&i,c=n.renderMode==="PathTracing"||(o==null?void 0:o.renderMode)===1,d=n.quality,f=(d==null?void 0:d.precisionMode)===1;if(c)e.addIntegrator(Zn),e.setRenderMode("PathTracing"),e.addDefine("RENDER_MODE_PATHTRACING","1"),e.addIntegrator(Vs(f,ke,l));else{const h=(o==null?void 0:o.specularModel)===1;e.addIntegrator(h?Zn:nr),e.setRenderMode("Direct"),e.addIntegrator(h?Hs(l):Bs(l)),e.requestShading()}},actions:{updateLight:(e,n)=>{const{index:t,params:o}=n;if(!e.lights||t>=e.lights.length)return{};const i=[...e.lights];return i[t]={...i[t],...o},{lights:i}},addLight:e=>{if(e.lights.length>=ke)return{};const n={id:Gt(),type:"Point",position:{x:0,y:0,z:2},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:1,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,radius:0,range:0,intensityUnit:"raw"};return{lights:[...e.lights,n]}},removeLight:(e,n)=>{if(n<0||n>=e.lights.length)return{};const t=[...e.lights];return t.splice(n,1),{lights:t}},duplicateLight:(e,n)=>{if(n<0||n>=e.lights.length||e.lights.length>=ke)return{};const t={...e.lights[n],id:Gt()},o=[...e.lights];return o.splice(n+1,0,t),{lights:o}}}},Zs={id:"lightSpheres",shortId:"ls",name:"Light Spheres",category:"Rendering",dependsOn:["lighting"],engineConfig:{toggleParam:"lightSpheres",mode:"compile",label:"Light Spheres",groupFilter:"engine_settings"},params:{lightSpheres:{type:"boolean",default:!0,label:"Light Spheres",shortId:"lsp",group:"engine_settings",ui:"checkbox",onUpdate:"compile",noReset:!0,description:"Compiles visible emitter sphere rendering for point lights with radius > 0.",estCompileMs:150}},inject:(e,n,t)=>{if(t!=="Main")return;const o=n.lightSpheres;!o||o.lightSpheres===!1||(e.addDefine("LIGHT_SPHERES","1"),e.addPostDEFunction(Us),e.addIntegrator(qs()),e.addMissLogic(Ws),e.addCompositeLogic("compositeLightSpheres(ro, rd, col, d, hit, stochasticSeed);"))}},Qs={id:"optics",shortId:"o",name:"Camera Optics",category:"Scene",tabConfig:{label:"Scene",componentId:"panel-scene",order:20},customUI:[{componentId:"optics-controls",group:"projection",parentId:"camType",condition:{eq:0}},{componentId:"optics-dof-controls",group:"dof",parentId:"dofStrength",condition:{gt:0}}],params:{camType:{type:"float",default:0,label:"Projection",shortId:"ct",uniform:"uCamType",group:"projection",options:[{label:"Perspective",value:0},{label:"Orthographic",value:1},{label:"360° Skybox",value:2}]},camFov:{type:"float",default:60,label:"Field of View",shortId:"fv",min:10,max:150,step:1,group:"projection",hidden:!0,condition:{param:"camType",eq:0}},orthoScale:{type:"float",default:2,label:"Ortho Scale",shortId:"os",min:.1,max:10,step:.1,scale:"log",group:"projection",parentId:"camType",condition:{param:"camType",eq:1}},dofStrength:{type:"float",default:0,label:"Camera Blur",shortId:"ds",uniform:"uDOFStrength",min:0,max:1,step:1e-4,scale:"log",group:"dof",format:e=>e===0?"0.0 (off)":Math.abs(e)<.001?e.toFixed(5):Math.abs(e)<10?e.toFixed(4):e.toFixed(2)},dofFocus:{type:"float",default:10,label:"Focus Distance",shortId:"df",uniform:"uDOFFocus",min:1e-6,max:1e4,step:1e-6,scale:"log",group:"dof",parentId:"dofStrength",condition:{gt:0}}}},Ks={id:"navigation",shortId:"n",name:"Navigation",category:"Scene",customUI:[{componentId:"navigation-controls",group:"controls"}],params:{flySpeed:{type:"float",default:.5,label:"Fly Speed %",shortId:"fs",min:.001,max:1,step:.001,group:"movement",format:e=>`${(e*100).toFixed(1)}%`},autoSlow:{type:"boolean",default:!0,label:"Auto-slow on collision",shortId:"as",group:"movement"}}},Js={id:"audio",shortId:"au",name:"Audio",category:"Audio",tabConfig:{label:"Audio",componentId:"panel-audio",order:70,condition:{param:"isEnabled",bool:!0}},menuConfig:{label:"Audio Modulation",toggleParam:"isEnabled"},params:{isEnabled:{type:"boolean",default:!1,label:"Enable Audio Engine",shortId:"en",group:"system",noReset:!0},smoothing:{type:"float",default:.8,label:"FFT Smoothing",shortId:"sm",group:"system",noReset:!0,min:0,max:.99,step:.01},threshold:{type:"float",default:.1,label:"Gate Threshold",shortId:"gt",group:"hidden",hidden:!0,noReset:!0},agcEnabled:{type:"boolean",default:!1,label:"AGC",shortId:"ag",group:"hidden",hidden:!0,noReset:!0},attack:{type:"float",default:.1,label:"Global Attack",shortId:"ga",group:"hidden",hidden:!0,noReset:!0},decay:{type:"float",default:.3,label:"Global Decay",shortId:"gd",group:"hidden",hidden:!0,noReset:!0},highPass:{type:"float",default:20,label:"High Pass",shortId:"hp",group:"hidden",hidden:!0,noReset:!0},lowPass:{type:"float",default:2e4,label:"Low Pass",shortId:"lp",group:"hidden",hidden:!0,noReset:!0},gain:{type:"float",default:.8,label:"Volume",shortId:"vl",group:"system",noReset:!0,min:0,max:2,step:.01}}},el={id:"drawing",shortId:"dr",name:"Drawing Tools",category:"Tools",tabConfig:{label:"Drawing",componentId:"panel-drawing",order:80,condition:{param:"enabled",bool:!0}},viewportConfig:{componentId:"overlay-drawing",type:"dom"},menuConfig:{label:"Drawing Tools",toggleParam:"enabled"},interactionConfig:{blockCamera:!0,activeParam:"active"},params:{enabled:{type:"boolean",default:!1,label:"Show Tab",shortId:"en",group:"system",hidden:!0,noReset:!0},active:{type:"boolean",default:!1,label:"Enable Tool",shortId:"ac",group:"main",noReset:!0,hidden:!0},activeTool:{type:"float",default:0,label:"Tool Type",shortId:"tt",group:"main",noReset:!0,hidden:!0},originMode:{type:"float",default:1,label:"Origin Plane",shortId:"om",group:"settings",noReset:!0,options:[{label:"Global Zero",value:0},{label:"Surface (Probe)",value:1}],description:"Where the drawing plane starts."},color:{type:"color",default:new qe("#00ffff"),label:"Line Color",shortId:"cl",group:"settings",noReset:!0},lineWidth:{type:"float",default:1,label:"Line Width",shortId:"lw",min:1,max:10,step:1,group:"settings",noReset:!0,hidden:!0},showLabels:{type:"boolean",default:!0,label:"Show Measurements",shortId:"sl",group:"settings",noReset:!0},showAxes:{type:"boolean",default:!1,label:"Show Axis Ruler",shortId:"ax",group:"settings",noReset:!0,description:"Displays a reference grid at the drawing origin."},shapes:{type:"complex",default:[],label:"Shapes",shortId:"sh",group:"data",hidden:!0,noReset:!0},refreshTrigger:{type:"float",default:0,label:"Refresh Trigger",group:"system",hidden:!0,noReset:!0}},state:{activeTool:"rect"},actions:{addDrawnShape:(e,n)=>({shapes:[...e.shapes||[],n]}),removeDrawnShape:(e,n)=>({shapes:(e.shapes||[]).filter(t=>t.id!==n)}),updateDrawnShape:(e,n)=>({shapes:(e.shapes||[]).map(t=>t.id===n.id?{...t,...n.updates}:t)}),clearDrawnShapes:e=>({shapes:[]})}},Qn=["#ef4444","#f97316","#f59e0b","#84cc16","#22c55e","#06b6d4","#3b82f6","#8b5cf6","#d946ef","#f43f5e"],tl={id:"modulation",shortId:"mod",name:"Modulation",category:"System",state:{rules:[],selectedRuleId:null},actions:{addModulation:(e,n)=>{const t=Qn[e.rules.length%Qn.length],o={id:nt(),target:n.target,source:n.source||"audio",enabled:!0,color:t,freqStart:0,freqEnd:.2,thresholdMin:.1,thresholdMax:1,attack:.1,decay:.3,smoothing:0,gain:1,offset:0};return{rules:[...e.rules,o],selectedRuleId:o.id}},removeModulation:(e,n)=>({rules:e.rules.filter(t=>t.id!==n),selectedRuleId:e.selectedRuleId===n?null:e.selectedRuleId}),updateModulation:(e,n)=>({rules:e.rules.map(t=>t.id===n.id?{...t,...n.update}:t)}),selectModulation:(e,n)=>({selectedRuleId:n})},params:{rules:{type:"complex",default:[],label:"Rules",shortId:"rl",group:"data",hidden:!0,noReset:!0},selectedRuleId:{type:"complex",default:null,label:"Selection",shortId:"sr",group:"data",hidden:!0,noReset:!0}}},al={id:"webcam",shortId:"wc",name:"Webcam Overlay",category:"Tools",viewportConfig:{componentId:"overlay-webcam",type:"dom"},menuConfig:{label:"Webcam Overlay",toggleParam:"isEnabled",advancedOnly:!0},params:{isEnabled:{type:"boolean",default:!1,label:"Enabled",shortId:"en",group:"system",noReset:!0},opacity:{type:"float",default:1,label:"Opacity",shortId:"op",min:0,max:3,step:.05,group:"visual",noReset:!0},posX:{type:"float",default:20,label:"Position X",shortId:"px",min:0,max:2e3,step:1,group:"transform",noReset:!0,hidden:!0},posY:{type:"float",default:80,label:"Position Y",shortId:"py",min:0,max:2e3,step:1,group:"transform",noReset:!0,hidden:!0},width:{type:"float",default:320,label:"Width",shortId:"w",min:50,max:1200,step:1,group:"transform",noReset:!0,hidden:!0},height:{type:"float",default:240,label:"Height",shortId:"h",min:50,max:1200,step:1,group:"transform",noReset:!0,hidden:!0},cropL:{type:"float",default:0,label:"Crop Left",shortId:"cl",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},cropR:{type:"float",default:0,label:"Crop Right",shortId:"cr",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},cropT:{type:"float",default:0,label:"Crop Top",shortId:"ct",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},cropB:{type:"float",default:0,label:"Crop Bottom",shortId:"cb",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},blendMode:{type:"float",default:0,label:"Blend Mode",shortId:"bm",group:"visual",noReset:!0,options:[{label:"Normal",value:0},{label:"Screen",value:1},{label:"Overlay",value:2},{label:"Lighten",value:3},{label:"Difference",value:4}]},crtMode:{type:"boolean",default:!1,label:"CRT Scanlines",shortId:"sc",group:"visual",noReset:!0},tilt:{type:"float",default:0,label:"3D Tilt",shortId:"tl",min:-45,max:45,step:1,group:"transform",noReset:!0},fontSize:{type:"float",default:12,label:"Overlay Font Size",shortId:"fs",min:8,max:32,step:1,group:"visual",noReset:!0}}},nl={id:"debugTools",shortId:"dt",name:"Debug Tools",category:"System",viewportConfig:{componentId:"overlay-debug-tools",type:"dom",renderOrder:100},menuItems:[{label:"GLSL Debugger",toggleParam:"shaderDebuggerOpen",icon:"Code",advancedOnly:!0},{label:"State Debugger",toggleParam:"stateDebuggerOpen",icon:"Info",advancedOnly:!0}],params:{shaderDebuggerOpen:{type:"boolean",default:!1,label:"GLSL Debugger",shortId:"sd",group:"tools",noReset:!0},stateDebuggerOpen:{type:"boolean",default:!1,label:"State Debugger",shortId:"st",group:"tools",noReset:!0}}},_a={fastest:{lighting:{shadows:!1,shadowsCompile:!1,ptEnabled:!1,specularModel:0},ao:{aoEnabled:!1,aoStochasticCp:!1},geometry:{hybridComplex:!1,preRotMaster:!1,preRotEnabled:!1},reflections:{enabled:!0,reflectionMode:0,bounceShadows:!1},quality:{precisionMode:1,bufferPrecision:1,compilerHardCap:128},atmosphere:{glowEnabled:!1}},lite:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:2,shadowSteps:32,ptStochasticShadows:!1,areaLights:!0,shadowSoftness:16,ptEnabled:!1,specularModel:0},ao:{aoEnabled:!0,aoSamples:2,aoStochasticCp:!1,aoMode:!1,aoMaxSamples:16},geometry:{hybridComplex:!1,preRotMaster:!1,preRotEnabled:!1},reflections:{enabled:!0,reflectionMode:1,bounceShadows:!1},quality:{precisionMode:1,bufferPrecision:1},atmosphere:{glowQuality:1}},balanced:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:0,shadowSoftness:16,ptStochasticShadows:!0,areaLights:!0,shadowSteps:64,ptEnabled:!1,specularModel:0},ao:{aoEnabled:!0,aoSamples:5,aoStochasticCp:!0,aoMode:!0,aoMaxSamples:32},geometry:{hybridComplex:!1,preRotMaster:!0,preRotEnabled:!0},reflections:{enabled:!0,reflectionMode:1,bounceShadows:!1},quality:{precisionMode:0,bufferPrecision:0},atmosphere:{glowQuality:0}},ultra:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:0,shadowSoftness:64,ptStochasticShadows:!0,areaLights:!0,shadowSteps:256,ptEnabled:!0,specularModel:1},ao:{aoEnabled:!0,aoSamples:8,aoStochasticCp:!0,aoMode:!0,aoMaxSamples:64},reflections:{enabled:!0,reflectionMode:3,bounceShadows:!0,steps:64,bounces:2},geometry:{hybridComplex:!0,preRotMaster:!0,preRotEnabled:!0},quality:{precisionMode:0,bufferPrecision:0},atmosphere:{glowQuality:0}}},ol=e=>{let t=4200;for(const o of ne.getAll()){const i=e[o.id];if(i)for(const[s,r]of Object.entries(o.params)){const l=r;if(!l.onUpdate||l.onUpdate!=="compile")continue;const c=i[s];if(l.type==="boolean"&&c&&l.estCompileMs&&(t+=l.estCompileMs),l.options){const d=l.options.find(f=>typeof f.value=="number"&&typeof c=="number"?Math.abs(f.value-c)<.001:f.value===c);d!=null&&d.estCompileMs&&(t+=d.estCompileMs)}}}return t},or=e=>{for(const[n,t]of Object.entries(_a)){let o=!0;for(const[i,s]of Object.entries(t)){const r=e[i];if(!r){o=!1;break}for(const[l,c]of Object.entries(s)){const d=r[l];if(typeof c=="number"&&typeof d=="number"){if(Math.abs(c-d)>.001){o=!1;break}}else if(c!==d){o=!1;break}}if(!o)break}if(o)return n}return"custom"},rl={id:"engineSettings",shortId:"eng",name:"Engine Config",category:"System",tabConfig:{label:"Engine",componentId:"panel-engine",order:5,condition:{param:"showEngineTab",bool:!0}},params:{showEngineTab:{type:"boolean",default:!1,label:"Show Engine Tab",shortId:"se",group:"system",noReset:!0,hidden:!0}},actions:{applyPreset:(e,n)=>{const{mode:t,actions:o}=n,i=_a[t];return i?(Object.entries(i).forEach(([s,r])=>{const l=`set${s.charAt(0).toUpperCase()+s.slice(1)}`,c=o[l];typeof c=="function"&&c(r)}),{}):{}}}},il=(e,n,t=32)=>{if(!e)return`
        float GetAO(vec3 p, vec3 n, float seed) { return 1.0; }
        `;let o="";return n&&(o=`
        vec3 getCosHemisphereDir(vec3 n, vec2 seedVec) {
            // Use provided vector (Blue Noise Green/Alpha) instead of calculating hash
            vec2 r = seedVec;
            
            float sign = n.z >= 0.0 ? 1.0 : -1.0;
            float a = -1.0 / (sign + n.z);
            float b = n.x * n.y * a;
            vec3 tangent = vec3(1.0 + sign * n.x * n.x * a, sign * b, -sign * n.x);
            vec3 bitangent = vec3(b, sign + n.y * n.y * a, -n.y);
            
            float ra = sqrt(r.y);
            float rx = ra * cos(6.2831 * r.x);
            float ry = ra * sin(6.2831 * r.x);
            float rz = sqrt(1.0 - r.y);
            return normalize(rx * tangent + ry * bitangent + rz * n);
        }`),`
// ------------------------------------------------------------------
// AMBIENT OCCLUSION (Modular Feature)
// ------------------------------------------------------------------

${o}

float GetAO(vec3 p_ray, vec3 n, float seed) {
    if (uAOIntensity < 0.001) return 1.0;

    float occ = 0.0;
    float weight = 1.0;
    float spread = max(uAOSpread, 0.001);
    
    bool isMoving = uBlendFactor >= 0.99;
    bool isStochastic = uAOMode > 0.5;
    
    // Sample Blue Noise Texture
    vec4 blueNoise = getBlueNoise4(gl_FragCoord.xy);
    
    // Green channel for standard jitter
    float jitter = blueNoise.g;
    
    #if defined(RENDER_MODE_PATHTRACING)
        jitter = fract(seed * 13.5 + blueNoise.g);
    #endif

    vec3 dir = n;
    bool useRandomDir = isStochastic;
    
    #if !defined(RENDER_MODE_PATHTRACING)
        if (isMoving) useRandomDir = false;
    #endif

    #if ${n?1:0}
        if (useRandomDir) {
            // Use Green and Alpha channels for 2D direction sampling
            dir = getCosHemisphereDir(n, blueNoise.ga);
        } else if (isStochastic) {
            // Stochastic enabled but camera moving (non-PT): use blue noise for stable bias
            dir = normalize(mix(n, getCosHemisphereDir(n, blueNoise.ga), 0.5));
        }
    #endif
    
    vec3 p_bias = p_ray;
    float totalWeight = 0.0;
    int limit = uAOSamples;
    float jitterBias = isMoving ? 0.0 : jitter * 0.1 * spread;

    // Use dynamic limit injected from DDFS
    for(int i = 0; i < ${t}; i++) {
        if (i >= limit) break;

        float h = (0.1 + 0.125 * float(i)) * spread + jitterBias;
        
        vec3 aopos = p_bias + dir * h;
        
        // OPTIMIZATION: Use DE_Dist for geometry-only check
        float d = DE_Dist(aopos);
        
        if (d < h) {
            float diff = h - d;
            occ += diff * weight;
        }
        
        totalWeight += h * weight;
        weight *= 0.8; 
    }
    
    occ /= (totalWeight + 0.0001);
    
    return clamp(1.0 - (occ * uAOIntensity * 2.5), 0.0, 1.0);
}
`},sl={id:"ao",shortId:"ao",name:"Ambient Occlusion",category:"Lighting",engineConfig:{toggleParam:"aoEnabled",mode:"compile",label:"Ambient Occlusion",groupFilter:"engine_settings"},params:{aoIntensity:{type:"float",default:.2,label:"Ambient Occlusion",shortId:"ai",uniform:"uAOIntensity",min:0,max:1.5,step:.001,group:"shading",condition:{param:"aoEnabled",bool:!0}},aoSpread:{type:"float",default:.5,label:"Spread",shortId:"as",uniform:"uAOSpread",min:3e-4,max:1.5,step:.01,group:"shading",scale:"log",parentId:"aoIntensity",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0}]},aoSamples:{type:"int",default:5,label:"Samples",shortId:"ap",min:2,max:32,step:1,group:"shading",uniform:"uAOSamples",ui:"numeric",parentId:"aoIntensity",description:"Iterations per pixel. Runtime controlled.",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0}]},aoMode:{type:"boolean",default:!0,label:"Stochastic Mode",shortId:"am",uniform:"uAOMode",group:"shading",parentId:"aoIntensity",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0},{param:"aoStochasticCp",bool:!0}],description:"Switches between Fixed and Stochastic sampling at runtime."},aoColor:{type:"color",default:new qe(0,0,0),label:"AO Tint",shortId:"ac",uniform:"uAOColor",group:"shading",parentId:"aoIntensity",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0}],description:"Black = classic darkening. Custom color = tinted occlusion in shadowed areas."},aoMaxSamples:{type:"int",default:32,label:"Max Samples (Hard Cap)",shortId:"amx",min:16,max:256,step:16,group:"engine_settings",ui:"numeric",description:"Compile-time limit. Increasing this allows higher runtime samples but compiles slower.",onUpdate:"compile",noReset:!0,condition:[{param:"aoEnabled",bool:!0}]},aoStochasticCp:{type:"boolean",default:!0,label:"Load Stochastic Sampling",shortId:"sc",group:"engine_settings",ui:"checkbox",description:"Compiles High-Quality noise logic into the shader.",onUpdate:"compile",noReset:!0},aoEnabled:{type:"boolean",default:!0,label:"Enable AO",shortId:"ae",group:"main",hidden:!0,noReset:!0,onUpdate:"compile",estCompileMs:200}},inject:(e,n,t)=>{if(t!=="Main"){e.addPostDEFunction("float GetAO(vec3 p, vec3 n, float seed) { return 1.0; }");return}const o=n.ao,i=(o==null?void 0:o.aoEnabled)!==!1,s=(o==null?void 0:o.aoStochasticCp)!==!1,r=(o==null?void 0:o.aoMaxSamples)||32;e.addPostDEFunction(il(i,s,r))}},ll=()=>`
// ------------------------------------------------------------------
// REFLECTIONS (Forge Kernel)
// ------------------------------------------------------------------

#define REFL_HIT_THRESHOLD 0.002

// Lightweight Raymarcher for Reflection Bounce
vec4 traceReflectionRay(vec3 ro, vec3 rd) {
    float t = 0.01; // Start offset

    // Dynamic loop
    int limit = uReflSteps;

    for(int i=0; i<256; i++) {
        if (i >= limit) break;

        // OPTIMIZATION: Use Geometry-only estimator for marching
        // This skips Orbit Traps, Decomposition, and Color Smoothing logic
        float d = DE_Dist(ro + rd * t);

        if(d < REFL_HIT_THRESHOLD * t) {
            // HIT: Retreat by half the last step to refine surface position.
            // Reduces orbit-trap noise at glancing angles where the hit threshold is loose.
            float refinedT = t - d * 0.5;
            vec4 fullRes = DE(ro + rd * refinedT);
            return vec4(refinedT, fullRes.yzw);
        }
        t += d;
        if(t > MAX_DIST) break;
    }
    return vec4(-1.0); // MISS
}
    `,Kn=0,Ba=1,vt=3,cl=`
    // --- REFLECTIONS: ENVIRONMENT MAP ---
    vec3 envColor = applyEnvFog(GetEnvMap(reflDir, roughness) * uEnvStrength);
    reflectionLighting = envColor * F * uSpecular;
`,dl=`
    // --- REFLECTIONS: RAYMARCHED ---
    {
        // Adaptive bias: scales with pixel size and distance to avoid self-intersection
        float pixelSizeScale = uPixelSizeBase / uInternalScale;
        float reflPixelFootprint = (uCamType > 0.5 && uCamType < 1.5) ? pixelSizeScale : pixelSizeScale * d;
        float reflBias = max(0.001, reflPixelFootprint * 2.0);
        vec3 currRo = p_ray + n * reflBias;
        vec3 currRd = reflDir;

        // Jitter first bounce based on roughness using Blue Noise
        bool isMoving = uBlendFactor >= 0.99;
        if (roughness > 0.05 && !isMoving) {
             vec4 blueNoise = getBlueNoise4(gl_FragCoord.xy);
             vec3 randomVec = vec3(blueNoise.b, blueNoise.a, blueNoise.r) * 2.0 - 1.0;

             if (dot(randomVec, randomVec) > 0.001) {
                 vec3 jittered = normalize(currRd + normalize(randomVec) * (roughness * 0.8));
                 if (dot(jittered, n) > 0.05) currRd = jittered;
             }
        }

        vec3 currentThroughput = F * uSpecular;

        if (roughness <= uReflRoughnessCutoff && dot(currentThroughput, currentThroughput) >= 0.01) {

            vec4 refHit = traceReflectionRay(currRo, currRd);

            if (refHit.x > 0.0) {
                float hitD = refHit.x;
                vec3 p_next = currRo + currRd * hitD;
                vec3 p_next_fractal = p_next + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;

                vec3 r_albedo, r_n, r_emission;
                float r_rough;

                getSurfaceMaterial(p_next, p_next_fractal, vec4(0.0, refHit.yzw), hitD, r_albedo, r_n, r_emission, r_rough, false);

                if (dot(r_n, -currRd) < 0.0) r_n = -r_n;

                vec3 hitColor = r_emission;
                #ifdef REFL_BOUNCE_SHADOWS
                    // Always compute shadows when enabled — avoids brightness pop
                    // between navigation (no shadows) and accumulation (shadows).
                    hitColor += calculatePBRContribution(p_next, r_n, -currRd, r_albedo, r_rough, uReflection, stochasticSeed + 0.1, true);
                #else
                    hitColor += calculatePBRContribution(p_next, r_n, -currRd, r_albedo, r_rough, uReflection, stochasticSeed + 0.1, false);
                #endif

                reflectionLighting += hitColor * currentThroughput;

            } else {
                reflectionLighting += sampleMissEnv(currRo, currRd, roughness, currentThroughput);
            }
        } else {
            reflectionLighting += applyEnvFog(GetEnvMap(currRd, roughness) * uEnvStrength) * currentThroughput;
        }

        vec3 simpleEnv = applyEnvFog(GetEnvMap(reflDir, roughness) * uEnvStrength);
        simpleEnv *= currentThroughput;

        reflectionLighting = mix(simpleEnv, reflectionLighting, uReflStrength);
    }
`,ul={id:"reflections",shortId:"rf",name:"Reflections",category:"Rendering",engineConfig:{toggleParam:"enabled",mode:"compile",label:"Reflection Tracing",groupFilter:"engine_settings"},params:{reflectionMode:{type:"float",default:Ba,label:"Reflection Method",shortId:"rm",group:"engine_settings",options:[{label:"Off",value:Kn,estCompileMs:0},{label:"Environment Map",value:Ba,estCompileMs:0},{label:"Raymarched (Quality)",value:vt,estCompileMs:7500}],description:"Reflection technique. Higher quality = longer compile time. Raymarched adds ~9s.",onUpdate:"compile",noReset:!0},bounceShadows:{type:"boolean",default:!1,label:"Bounce Shadows",shortId:"bs",group:"engine_settings",ui:"checkbox",condition:{param:"reflectionMode",eq:vt},description:"Compute shadows on reflected surfaces. Adds ~3-4s compile time.",onUpdate:"compile",noReset:!0,estCompileMs:4500},mixStrength:{type:"float",default:1,label:"Raymarch Mix",shortId:"mx",uniform:"uReflStrength",min:0,max:1,step:.01,group:"engine_settings",condition:{param:"reflectionMode",eq:vt},description:"Blends between Raymarched Reflections (1.0) and Environment Map (0.0)."},roughnessThreshold:{type:"float",default:.62,label:"Roughness Cutoff",shortId:"rc",uniform:"uReflRoughnessCutoff",min:0,max:1,step:.01,group:"engine_settings",condition:{param:"reflectionMode",eq:vt},description:"Surfaces rougher than this will skip raymarching to save performance."},bounces:{type:"int",default:1,label:"Max Bounces",shortId:"rb",min:1,max:3,step:1,group:"engine_settings",uniform:"uReflBounces",ui:"numeric",description:"Maximum recursion depth. Clamped to 3. Default 1 for performance.",noReset:!0,onUpdate:"compile",condition:{param:"reflectionMode",eq:vt}},steps:{type:"int",default:64,label:"Trace Steps",shortId:"rs",min:16,max:128,step:8,group:"engine_settings",uniform:"uReflSteps",ui:"numeric",description:"Precision of the reflection ray.",noReset:!0,condition:{param:"reflectionMode",eq:vt}},enabled:{type:"boolean",default:!0,label:"Enable Reflections",shortId:"re",group:"main",hidden:!0,noReset:!0,onUpdate:"compile"}},inject:(e,n,t)=>{if(t!=="Main")return;const o=n.reflections;if(!o||o.enabled===!1)return;const i=o.reflectionMode??Ba;if(i!==Kn){if(i!==vt){e.addShadingLogic(cl);return}if(i===vt){e.addPostDEFunction(ll());const s=Math.max(1,Math.min(3,o.bounces??1));e.addDefine("MAX_REFL_BOUNCES",s.toString()),o.bounceShadows&&e.addDefine("REFL_BOUNCE_SHADOWS","1"),e.addShadingLogic(dl)}}}},hl=`
// --- WATER PLANE LOGIC ---

// Helper: Multi-octave wave function
float getWaterHeight(vec3 p, float t, float freq, float strength) {
    if (strength <= 0.001) return 0.0;
    
    float h = 0.0;
    vec3 q = p * freq;
    
    // Layer 1: Rolling Swell (Sine based for mass)
    float wave1 = sin(q.x * 1.0 + t) * cos(q.z * 0.8 + t * 0.8);
    h += wave1 * 0.5;
    
    // Layer 2: Organic Surface (Simplex Noise)
    // Moving opposing direction for turbulence
    vec3 nP = q * 2.5 + vec3(t * 0.5, 0.0, -t * 0.5);
    float noise = snoise(nP);
    h += noise * 0.3;
    
    // Layer 3: Fine Choppiness
    vec3 nP2 = q * 6.0 + vec3(-t, 0.0, t * 0.2);
    h += snoise(nP2) * 0.1;

    return h * strength;
}

// Returns distance to water. 
// Uses Lipschitz bound (0.6) to prevent overstepping on steep waves, 
// ensuring shadows and AO resolve correctly.
float mapWater(vec3 p) {
    if (uWaterActive < 0.5) return 1e10;
    
    float level = uWaterHeight;
    float disp = 0.0;
    
    // Only calculate noise close to the plane to save performance
    // Bounding box check: if |y - level| > max_wave_height, return simple plane
    float distPlane = p.y - level;
    
    if (uWaterWaveStrength > 0.001) {
        // Optimization: If far away, treat as flat plane
        if (abs(distPlane) < uWaterWaveStrength * 2.0) {
            float t = uTime * uWaterWaveSpeed;
            disp = getWaterHeight(p, t, uWaterWaveFreq, uWaterWaveStrength);
        }
    }
    
    // SDF = Vertical distance - Displacement
    // Multiply by 0.6 to stabilize raymarching against the steep gradients of the waves
    return (distPlane - disp) * 0.6;
}

// Override material if water is hit
void applyWaterMaterial(inout vec3 albedo, inout float roughness, inout vec3 normal, vec3 p) {
    if (uWaterActive > 0.5) {
        
        // 1. Recalculate Normal via Finite Difference
        // This ensures the reflection/specular matches the wave geometry perfectly
        if (uWaterWaveStrength > 0.001) {
             float t = uTime * uWaterWaveSpeed;
             float eps = 0.05; // Sampling delta
             
             // Sample height at 3 points
             float h0 = getWaterHeight(p, t, uWaterWaveFreq, uWaterWaveStrength);
             float hx = getWaterHeight(p + vec3(eps, 0.0, 0.0), t, uWaterWaveFreq, uWaterWaveStrength);
             float hz = getWaterHeight(p + vec3(0.0, 0.0, eps), t, uWaterWaveFreq, uWaterWaveStrength);
             
             // Construct tangent vectors
             vec3 v1 = vec3(eps, hx - h0, 0.0);
             vec3 v2 = vec3(0.0, hz - h0, eps);
             
             // N = v2 x v1 (Cross product for Up-facing normal)
             normal = normalize(cross(v2, v1));
        } else {
             normal = vec3(0.0, 1.0, 0.0);
        }
        
        // 2. Physics Material
        albedo = uWaterColor;
        roughness = uWaterRoughness;
        
        // 3. Fake Depth Absorption (Fresnel darken)
        // Darken albedo when looking straight down (deep water)
        // Lighten at grazing angles
        float viewAngle = max(0.0, dot(normal, normalize(uCameraPosition - p)));
        albedo *= mix(0.4, 1.0, 1.0 - viewAngle);
    }
}
`,fl=`
    // --- Water Plane (feature-injected) ---
    float dWater = mapWater(p_fractal);
    if (dWater < finalD) {
        finalD = dWater;
        decomp = MATERIAL_WATER;
        smoothIter = 0.0;
        outTrap = 0.0;
    }
`,pl=`
    // --- Water Plane (feature-injected) ---
    float dWater = mapWater(p_fractal);
    if (dWater < finalD) {
        finalD = dWater;
    }
`,ml=`
    // --- Water Plane Material (feature-injected) ---
    if (result.w >= 5.0) {
        applyWaterMaterial(albedo, roughness, n, p_fractal);
        emission = vec3(0.0);
    }
`,gl={id:"waterPlane",shortId:"wp",name:"Water Plane",category:"Scene",engineConfig:{toggleParam:"waterEnabled",mode:"compile",label:"Water Plane",groupFilter:"engine_settings"},params:{waterEnabled:{type:"boolean",default:!1,label:"Enable Water",shortId:"we",group:"engine_settings",onUpdate:"compile",noReset:!0,hidden:!0},active:{type:"boolean",default:!0,label:"Visible",shortId:"on",uniform:"uWaterActive",group:"main",condition:{param:"waterEnabled",bool:!0},noReset:!0},height:{type:"float",default:-2,label:"Height (Y)",shortId:"ht",uniform:"uWaterHeight",min:-10,max:10,step:.01,group:"geometry",condition:{param:"active",bool:!0}},color:{type:"color",default:new qe("#001133"),label:"Water Color",shortId:"cl",uniform:"uWaterColor",group:"material",condition:{param:"active",bool:!0}},roughness:{type:"float",default:.02,label:"Roughness",shortId:"ro",uniform:"uWaterRoughness",min:0,max:1,step:.01,group:"material",condition:{param:"active",bool:!0}},waveStrength:{type:"float",default:.1,label:"Wave Height",shortId:"ws",uniform:"uWaterWaveStrength",min:0,max:1.5,step:.001,group:"waves",condition:{param:"active",bool:!0}},waveSpeed:{type:"float",default:1,label:"Wave Speed",shortId:"wv",uniform:"uWaterWaveSpeed",min:0,max:5,step:.1,group:"waves",condition:[{param:"active",bool:!0},{param:"waveStrength",gt:0}]},waveFrequency:{type:"float",default:1.5,label:"Wave Freq",shortId:"wf",uniform:"uWaterWaveFreq",min:.1,max:10,step:.1,group:"waves",condition:[{param:"active",bool:!0},{param:"waveStrength",gt:0}]}},inject:(e,n,t)=>{const o=n.waterPlane;o&&o.waterEnabled&&t==="Main"&&(e.addDefine("MATERIAL_WATER","10.0"),e.addFunction(hl),e.addPostMapCode(fl),e.addPostDistCode(pl),e.addMaterialLogic(ml))}},xl={id:"cameraManager",name:"Camera Manager",category:"Scene",tabConfig:{label:"Camera Manager",componentId:"panel-cameramanager",order:999,condition:{bool:!0}},params:{}},bl=`
#ifdef PT_VOLUMETRIC
{
    bool _hasDensity = uVolDensity > 0.001;
    bool _hasEmissive = uVolEmissive > 0.001;
    if (uVolEnabled > 0.5 && (_hasDensity || _hasEmissive)) {
        // Spatial stochastic gate: P=0.125
        // uVolStepJitter blends between fixed seed (persistent slicing) and temporal seed (smooth accumulation)
        float _volSeed = mix(0.5, stochasticSeed, uVolStepJitter);
        if (fract(_volSeed * 7.43 + d * 1.0) < 0.125) {
            float _sigma = uVolDensity;

            // Height fog: modulate density by Y distance from origin
            if (uVolHeightFalloff > 0.001) {
                float _yWorld = (p + uCameraPosition + uSceneOffsetHigh + uSceneOffsetLow).y;
                _sigma *= exp(-uVolHeightFalloff * abs(_yWorld - uVolHeightOrigin));
            }

            float _sigmaEff = max(_sigma, 0.001);
            // Beer-Lambert transmittance from camera to this scatter point
            float _trans = exp(-_sigmaEff * d);
            if (_trans > 0.001) {
                float _seg = 8.0;

                // --- DENSITY SCATTER (shadow rays — expensive) ---
                if (_hasDensity && _sigma > 0.001) {
                    float _jScale = min(h.x * 0.2, 0.35);
                    vec3 _jDir = normalize(vec3(
                        fract(stochasticSeed * 127.1 + d * 31.7) * 2.0 - 1.0,
                        fract(stochasticSeed *  37.3 + d * 47.1) * 2.0 - 1.0,
                        fract(stochasticSeed *  73.7 + d * 13.3) * 2.0 - 1.0
                    ));
                    int _volLightMax = int(uVolMaxLights);
                    for (int _li = 0; _li < MAX_LIGHTS; _li++) {
                        if (_li >= uLightCount || _li >= _volLightMax) break;
                        if (uLightIntensity[_li] < 0.01) continue;
                        bool _dir = uLightType[_li] > 0.5;
                        vec3  _lv  = _dir ? uLightDir[_li] : (uLightPos[_li] - p);
                        float _ld  = _dir ? 10000.0 : length(_lv);
                        if (!_dir && _ld < 0.001) continue;
                        vec3 _l = _dir ? normalize(_lv) : (_lv / _ld);
                        float _att = 1.0;
                        if (!_dir && uLightFalloff[_li] > 0.001) {
                            _att = uLightFalloffType[_li] < 0.5
                                ? 1.0 / (1.0 + uLightFalloff[_li] * _ld * _ld)
                                : 1.0 / (1.0 + uLightFalloff[_li] * _ld);
                        }
                        if (uLightIntensity[_li] * _att * _sigma * _trans * _seg < 1e-5) continue;
                        vec3 _l_shadow = normalize(_l + _jDir * _jScale);
                        float _sh = GetHardShadow(p + _l_shadow * max(h.x * 2.0, 0.01), _l_shadow, _ld);
                        if (_sh < 0.01) continue;
                        // Henyey-Greenstein phase
                        float _cosT  = dot(rd, -_l);
                        float _g     = uVolAnisotropy;
                        float _hgD   = max(0.0001, 1.0 + _g*_g - 2.0*_g*_cosT);
                        float _phase = (1.0 - _g*_g) / (4.0 * PI * pow(_hgD, 1.5));
                        accScatter += uLightColor[_li] * uLightIntensity[_li] * _att * _sigma * _phase * _sh * _trans * _seg * uVolScatterTint;
                    }
                }

                // --- SURFACE COLOR SCATTER (orbit trap lookup — cheap, independent) ---
                if (_hasEmissive) {
                    vec3 _pfrac = p + uCameraPosition + uSceneOffsetHigh + uSceneOffsetLow;
                    float _mapVal = getMappingValue(uColorMode, _pfrac, h, vec3(0.0, 1.0, 0.0), uColorScale);
                    float _distFrac = length(_pfrac);
                    float _t1Raw = _mapVal * uColorScale + uColorOffset + _distFrac * uColorTwist;
                    float _t1 = pow(abs(fract(mod(_t1Raw, 1.0))), uGradientBias);
                    vec3 _emitCol = textureLod0(uGradientTexture, vec2(_t1, 0.5)).rgb;
                    float _emitAtten = 1.0;
                    if (uVolEmissiveFalloff > 0.001) {
                        _emitAtten = exp(-uVolEmissiveFalloff * h.x);
                    }
                    accScatter += _emitCol * uVolEmissive * _sigmaEff * _trans * _seg * _emitAtten * uVolScatterTint;
                }
            }
        }
    }
}
#endif
`,yl=`
    // --- VOLUMETRIC SCATTER (God Rays) ---
    col += fogScatter;
`,vl={id:"volumetric",shortId:"vol",name:"Volumetric Scatter",category:"Rendering",engineConfig:{toggleParam:"ptVolumetric",mode:"compile",label:"Volumetric Scattering",description:"Henyey-Greenstein single scatter. Enables god rays, colored haze, and directional fog.",groupFilter:"engine_settings"},panelConfig:{compileParam:"ptVolumetric",runtimeToggleParam:"volEnabled",label:"Volumetric Scatter",compileMessage:"Compiling Volumetric Shader...",helpId:"render.volumetric"},groups:{density:{label:"Density & Shadow Rays",collapsible:!0},emissive:{label:"Color Scatter",collapsible:!0},height:{label:"Height Fog",collapsible:!0}},params:{ptVolumetric:{type:"boolean",default:!1,label:"Volume Scatter",shortId:"pvs",group:"engine_settings",noReset:!0,onUpdate:"compile",estCompileMs:5500},volEnabled:{type:"boolean",default:!1,label:"Enabled",shortId:"ven",uniform:"uVolEnabled",hidden:!0},volDensity:{type:"float",default:.01,label:"Density",shortId:"vd",uniform:"uVolDensity",min:.001,max:5,step:.01,scale:"log",group:"density",condition:{param:"ptVolumetric",bool:!0}},volAnisotropy:{type:"float",default:.3,label:"Anisotropy (g)",shortId:"va",uniform:"uVolAnisotropy",min:-.99,max:.99,step:.01,group:"density",parentId:"volDensity",condition:{gt:0},description:"0=isotropic, +0.9=forward (god rays), -0.9=back scatter."},volMaxLights:{type:"float",default:1,label:"Light Sources",shortId:"vml",uniform:"uVolMaxLights",min:1,max:3,step:1,group:"density",parentId:"volDensity",condition:{gt:0},isAdvanced:!0,description:"Max lights for shadow rays. More = more expensive."},volScatterTint:{type:"color",default:new qe(1,1,1),label:"Scatter Tint",shortId:"vst",uniform:"uVolScatterTint",group:"density",parentId:"volDensity",condition:{gt:0}},volEmissive:{type:"float",default:0,label:"Color Scatter",shortId:"ves",uniform:"uVolEmissive",min:0,max:100,step:.1,scale:"log",group:"emissive",condition:{param:"ptVolumetric",bool:!0},description:"Orbit trap color field scattered through the volume. No shadow rays needed."},volStepJitter:{type:"float",default:1,label:"Step Jitter",shortId:"vsj",uniform:"uVolStepJitter",min:0,max:1,step:.01,group:"density",parentId:"volDensity",condition:{gt:0},description:"1 = smooth (temporal accumulation removes noise). 0 = fixed slicing pattern (artistic, broken fog look)."},volEmissiveFalloff:{type:"float",default:0,label:"Surface Falloff",shortId:"vef",uniform:"uVolEmissiveFalloff",min:0,max:5,step:.01,scale:"log",group:"emissive",parentId:"volEmissive",condition:{gt:0},description:"Concentrate color near fractal surface."},volHeightFalloff:{type:"float",default:0,label:"Height Falloff",shortId:"vhf",uniform:"uVolHeightFalloff",min:0,max:5,step:.01,scale:"log",group:"height",condition:{param:"ptVolumetric",bool:!0},description:"Density varies with Y. Creates ground fog, rising mist."},volHeightOrigin:{type:"float",default:0,label:"Height Origin",shortId:"vho",uniform:"uVolHeightOrigin",min:-5,max:5,step:.01,group:"height",parentId:"volHeightFalloff",condition:{gt:0}}},inject:(e,n,t)=>{if(t!=="Main")return;const o=n.volumetric;o!=null&&o.ptVolumetric&&(e.addDefine("PT_VOLUMETRIC","1"),e.addVolumeTracing(bl,""),e.addPostProcessLogic(yl))}},wl=()=>{ne.register(zs),ne.register(Ns),ne.register(Xs),ne.register(Zs),ne.register(sl),ne.register(ul),ne.register(is),ne.register(vl),ne.register(fs),ne.register(gl),ne.register(xs),ne.register(ms),ne.register(Ds),ne.register(ls),ne.register(cs),ne.register(ps),ne.register(Qs),ne.register(Ks),ne.register(xl),ne.register(Js),ne.register(el),ne.register(tl),ne.register(al),ne.register(nl),ne.register(rl)},bt=e=>{const n=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);return n?{r:parseInt(n[1],16),g:parseInt(n[2],16),b:parseInt(n[3],16)}:null},ea=(e,n,t)=>(typeof e=="object"&&(n=e.g,t=e.b,e=e.r),"#"+((1<<24)+(Math.round(e)<<16)+(Math.round(n)<<8)+Math.round(t)).toString(16).slice(1).toUpperCase()),la=({r:e,g:n,b:t})=>{e/=255,n/=255,t/=255;const o=Math.max(e,n,t),i=Math.min(e,n,t);let s=0,r=0,l=o;const c=o-i;if(r=o===0?0:c/o,o!==i){switch(o){case e:s=(n-t)/c+(n<t?6:0);break;case n:s=(t-e)/c+2;break;case t:s=(e-n)/c+4;break}s/=6}return{h:s*360,s:r*100,v:l*100}},ca=(e,n,t)=>{e/=360,n/=100,t/=100;let o=0,i=0,s=0;const r=Math.floor(e*6),l=e*6-r,c=t*(1-n),d=t*(1-l*n),f=t*(1-(1-l)*n);switch(r%6){case 0:o=t,i=f,s=c;break;case 1:o=d,i=t,s=c;break;case 2:o=c,i=t,s=f;break;case 3:o=c,i=d,s=t;break;case 4:o=f,i=c,s=t;break;case 5:o=t,i=c,s=d;break}return{r:o*255,g:i*255,b:s*255}},Sl=(e,n,t)=>({r:e.r+(n.r-e.r)*t,g:e.g+(n.g-e.g)*t,b:e.b+(n.b-e.b)*t}),Ml=(e,n)=>{if(Math.abs(n-.5)<.001)return e;const t=Math.max(.001,Math.min(.999,n)),o=Math.log(.5)/Math.log(t);return Math.pow(e,o)},sn=(e,n=1)=>{let t;if(!e)return"linear-gradient(90deg, #000 0%, #fff 100%)";if(Array.isArray(e))t=e;else if(e&&Array.isArray(e.stops))t=e.stops;else return"linear-gradient(90deg, #000 0%, #fff 100%)";if(!t||t.length===0)return"linear-gradient(90deg, #000 0%, #fff 100%)";const o=[...t].sort((s,r)=>s.position-r.position),i=[];for(let s=0;s<o.length;s++){const r=o[s];let l=Math.pow(r.position,1/n);if(l=Math.max(0,Math.min(1,l))*100,i.push(`${r.color} ${l.toFixed(2)}%`),s<o.length-1){const c=o[s+1],d=r.bias??.5;if((r.interpolation||"linear")==="step"){let h=Math.pow(c.position,1/n);h=Math.max(0,Math.min(1,h))*100,i.push(`${r.color} ${h.toFixed(2)}%`),i.push(`${c.color} ${h.toFixed(2)}%`)}else if(Math.abs(d-.5)>.001){const h=r.position+(c.position-r.position)*d;let p=Math.pow(h,1/n)*100;p=Math.max(0,Math.min(100,p)),i.push(`${p.toFixed(2)}%`)}}}return`linear-gradient(90deg, ${i.join(", ")})`},Ha=e=>Math.pow(e/255,2.2)*255,Ga=e=>{const n=e/255;if(n>=.99)return 255;const t=(Math.sqrt(-10127*n*n+13702*n+9)+59*n-3)/(502-486*n);return Math.max(0,t)*255},Jn=e=>{const t=new Uint8Array(1024);let o,i="srgb";if(Array.isArray(e))o=e;else if(e&&Array.isArray(e.stops))o=e.stops,i=e.colorSpace||"srgb";else return t;if(o.length===0){for(let l=0;l<256;l++){const c=Math.floor(l/255*255);t[l*4]=c,t[l*4+1]=c,t[l*4+2]=c,t[l*4+3]=255}return t}const s=[...o].sort((l,c)=>l.position-c.position),r=l=>{let c={r:0,g:0,b:0};if(l<=s[0].position)c=bt(s[0].color)||{r:0,g:0,b:0};else if(l>=s[s.length-1].position)c=bt(s[s.length-1].color)||{r:0,g:0,b:0};else for(let d=0;d<s.length-1;d++)if(l>=s[d].position&&l<=s[d+1].position){const f=s[d],h=s[d+1];let p=(l-f.position)/(h.position-f.position);const u=f.bias??.5;Math.abs(u-.5)>.001&&(p=Ml(p,u));const g=f.interpolation||"linear";g==="step"?p=0:(g==="smooth"||g==="cubic")&&(p=p*p*(3-2*p));const v=bt(f.color)||{r:0,g:0,b:0},y=bt(h.color)||{r:0,g:0,b:0};c=Sl(v,y,p);break}return i==="linear"?{r:Ha(c.r),g:Ha(c.g),b:Ha(c.b)}:i==="aces_inverse"?{r:Ga(c.r),g:Ga(c.g),b:Ga(c.b)}:c};for(let l=0;l<256;l++){const c=l/255,d=r(c);t[l*4]=d.r,t[l*4+1]=d.g,t[l*4+2]=d.b,t[l*4+3]=255}return t},Cl=e=>{const n=Math.max(1e3,Math.min(4e4,e))/100;let t,o,i;return n<=66?t=255:(t=n-60,t=329.698727446*Math.pow(t,-.1332047592),t=Math.max(0,Math.min(255,t))),n<=66?(o=n,o=99.4708025861*Math.log(o)-161.1195681661,o=Math.max(0,Math.min(255,o))):(o=n-60,o=288.1221695283*Math.pow(o,-.0755148492),o=Math.max(0,Math.min(255,o))),n>=66?i=255:n<=19?i=0:(i=n-10,i=138.5177312231*Math.log(i)-305.0447927307,i=Math.max(0,Math.min(255,i))),{r:Math.round(t),g:Math.round(o),b:Math.round(i)}},eo=e=>{const{r:n,g:t,b:o}=Cl(e);return ea(n,t,o)},kl=(e,n)=>{const t={};return wl(),ne.getAll().forEach(i=>{const s={},r={};i.state&&Object.assign(s,i.state),Object.entries(i.params).forEach(([c,d])=>{d.composeFrom?d.composeFrom.forEach(f=>{r[f]=c}):s[c]===void 0&&(s[c]=d.default)}),t[i.id]=s;const l=`set${i.id.charAt(0).toUpperCase()+i.id.slice(1)}`;t[l]=c=>{let d=!1;const f={};e(h=>{const p=h[i.id],u={...c};Object.keys(c).forEach(y=>{const b=i.params[y];if(b){const x=c[y];if(x==null)return;b.type==="vec2"&&!(x instanceof Te)&&(u[y]=new Te(x.x,x.y)),b.type==="vec3"&&!(x instanceof V)&&(u[y]=new V(x.x,x.y,x.z)),b.type==="color"&&!(x instanceof qe)&&(typeof x=="string"?u[y]=new qe(x):typeof x=="number"?u[y]=new qe(x):typeof x=="object"&&"r"in x&&(u[y]=new qe(x.r,x.g,x.b)))}});const g={...p,...u},v=new Set;return Object.keys(u).forEach(y=>{const b=i.params[y];if(r[y]&&v.add(r[y]),b&&(b.noReset||(d=!0),b.type!=="image"&&(f[i.id]||(f[i.id]={}),f[i.id][y]=g[y]),b.uniform)){const x=g[y];if(b.type==="image"){const m=b.uniform.toLowerCase().includes("env")?"env":"color";x&&typeof x=="string"?(Y.emit("texture",{textureType:m,dataUrl:x}),y==="envMapData"&&g.useEnvMap===!1&&(g.useEnvMap=!0,Y.emit("uniform",{key:"uUseEnvMap",value:1,noReset:!1})),y==="layer1Data"&&g.active===!1&&(g.active=!0,Y.emit("uniform",{key:"uUseTexture",value:1,noReset:!1}))):(Y.emit("texture",{textureType:m,dataUrl:null}),y==="envMapData"&&g.useEnvMap===!0&&(g.useEnvMap=!1,Y.emit("uniform",{key:"uUseEnvMap",value:0,noReset:!1})),y==="layer1Data"&&g.active===!0&&(g.active=!1,Y.emit("uniform",{key:"uUseTexture",value:0,noReset:!1})))}else if(b.type==="gradient"){const m=Jn(x);Y.emit("uniform",{key:b.uniform,value:{isGradientBuffer:!0,buffer:m},noReset:!!b.noReset})}else{let m=x;b.type==="boolean"&&(m=x?1:0),b.type==="color"&&!(m instanceof qe)&&(m=new qe(m)),Y.emit("uniform",{key:b.uniform,value:m,noReset:!!b.noReset})}}}),v.forEach(y=>{const b=i.params[y];if(b&&b.composeFrom&&b.uniform){const x=b.composeFrom.map(m=>g[m]);if(b.type==="gradient"){const m=g[y];if(m){const C=Jn(m);Y.emit("uniform",{key:b.uniform,value:{isGradientBuffer:!0,buffer:C},noReset:!!b.noReset}),b.noReset||(d=!0)}}else if(b.type==="vec2"){const m=new Te(x[0],x[1]);Y.emit("uniform",{key:b.uniform,value:m,noReset:!!b.noReset}),b.noReset||(d=!0)}else if(b.type==="vec3"){const m=new V(x[0],x[1],x[2]);Y.emit("uniform",{key:b.uniform,value:m,noReset:!!b.noReset}),b.noReset||(d=!0)}}}),{[i.id]:g}}),Object.keys(f).length>0&&Y.emit("config",f),d&&Y.emit("reset_accum",void 0)},i.actions&&Object.entries(i.actions).forEach(([c,d])=>{t[c]=f=>{const p=n()[i.id],u=d(p,f);u&&Object.keys(u).length>0&&(e({[i.id]:{...p,...u}}),Y.emit("reset_accum",void 0))}})}),t};class ln{constructor(n,t=null){Q(this,"defaultState");Q(this,"dictionary");Q(this,"reverseDictCache",new Map);this.defaultState=n,this.dictionary=t}encode(n,t){try{const o=this.getDiff(n,this.defaultState);if(!o||Object.keys(o).length===0)return"";let i=this.quantize(o);if(!i||Object.keys(i).length===0)return"";this.dictionary&&(i=this.applyDictionary(i,this.dictionary,!0));const s=JSON.stringify(i),r=Bn.deflate(s),l=Array.from(r).map(d=>String.fromCharCode(d)).join("");return btoa(l).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}catch(o){return console.error("UrlStateEncoder: Error encoding",o),""}}decode(n){try{if(!n)return null;let t=n.replace(/-/g,"+").replace(/_/g,"/");for(;t.length%4;)t+="=";const o=atob(t),i=new Uint8Array(o.length);for(let l=0;l<o.length;l++)i[l]=o.charCodeAt(l);const s=Bn.inflate(i,{to:"string"});let r=JSON.parse(s);return this.dictionary&&(r=this.applyDictionary(r,this.dictionary,!1)),this.deepMerge({...this.defaultState},r)}catch(t){return console.error("UrlStateEncoder: Error decoding",t),null}}getReverseDict(n){if(this.reverseDictCache.has(n))return this.reverseDictCache.get(n);const t={};return Object.keys(n).forEach(o=>{const i=n[o];typeof i=="string"?t[i]=o:t[i._alias]=o}),this.reverseDictCache.set(n,t),t}applyDictionary(n,t,o){if(!n||typeof n!="object"||Array.isArray(n))return n;const i={};if(o)Object.keys(n).forEach(s=>{let r=s,l=null;const c=t[s];c&&(typeof c=="string"?r=c:(r=c._alias,l=c.children));const d=n[s];l&&d&&typeof d=="object"&&!Array.isArray(d)?i[r]=this.applyDictionary(d,l,!0):i[r]=d});else{const s=this.getReverseDict(t);Object.keys(n).forEach(r=>{const l=s[r]||r,c=n[r],d=t[l],f=d&&typeof d=="object"?d.children:null;f&&c&&typeof c=="object"&&!Array.isArray(c)?i[l]=this.applyDictionary(c,f,!1):i[l]=c})}return i}isEqual(n,t){if(n===t)return!0;if(n==null||t==null)return n===t;if(typeof n=="number"&&typeof t=="number")return Math.abs(n-t)<1e-4;if(Array.isArray(n)&&Array.isArray(t))return n.length!==t.length?!1:n.every((o,i)=>this.isEqual(o,t[i]));if(typeof n=="object"&&typeof t=="object"){const o=n,i=t,s=Object.keys(o).filter(l=>!l.startsWith("is")),r=Object.keys(i).filter(l=>!l.startsWith("is"));return s.length!==r.length?!1:s.every(l=>this.isEqual(o[l],i[l]))}return!1}quantize(n){if(typeof n=="string")return n.startsWith("data:image")?void 0:n;if(typeof n=="number")return n===0||Math.abs(n)<1e-9?0:parseFloat(n.toFixed(5));if(Array.isArray(n))return n.map(t=>this.quantize(t));if(n!==null&&typeof n=="object"){const t={};let o=!1;const i=Object.keys(n).filter(s=>!s.startsWith("is"));for(const s of i){const r=this.quantize(n[s]);r!==void 0&&(t[s]=r,o=!0)}return o?t:void 0}return n}getDiff(n,t){if(this.isEqual(n,t))return;if(typeof n!="object"||n===null||typeof t!="object"||t===null||Array.isArray(n))return n;const o={};let i=!1;const s=n,r=t;return Object.keys(s).forEach(l=>{if(l.startsWith("is")||l==="histogramData"||l==="interactionSnapshot"||l==="liveModulations"||l.endsWith("Stack"))return;const c=this.getDiff(s[l],r[l]);c!==void 0&&(o[l]=c,i=!0)}),i?o:void 0}deepMerge(n,t){if(typeof t!="object"||t===null)return t;const o={...n};return Object.keys(t).forEach(i=>{typeof t[i]=="object"&&t[i]!==null&&!Array.isArray(t[i])?o[i]=this.deepMerge(n[i]||{},t[i]):o[i]=t[i]}),o}}const jl=(e,n)=>({isPlaying:!1,isRecording:!1,isScrubbing:!1,recordCamera:!0,isCameraInteracting:!1,currentFrame:0,fps:30,durationFrames:300,zoomLevel:1,loopMode:"Loop",isArmingModulation:!1,isRecordingModulation:!1,recordingSnapshot:null,play:()=>{const t=n();if(t.currentFrame>=t.durationFrames-.1&&e({currentFrame:0}),t.isArmingModulation){t.snapshot();const o=JSON.parse(JSON.stringify(t.sequence));e({isRecordingModulation:!0,isArmingModulation:!1,recordingSnapshot:o,isPlaying:!0,currentFrame:0})}else e({isPlaying:!0})},pause:()=>e({isPlaying:!1,isRecordingModulation:!1,recordingSnapshot:null}),stop:()=>e({isPlaying:!1,currentFrame:0,isRecordingModulation:!1,recordingSnapshot:null}),toggleRecording:()=>e(t=>({isRecording:!t.isRecording})),toggleRecordCamera:()=>e(t=>({recordCamera:!t.recordCamera})),toggleArmModulation:()=>e(t=>({isArmingModulation:!t.isArmingModulation,isRecording:!1})),stopModulationRecording:()=>e({isRecordingModulation:!1,isPlaying:!1,recordingSnapshot:null}),setLoopMode:t=>e({loopMode:t}),setIsScrubbing:t=>e({isScrubbing:t}),setIsCameraInteracting:t=>e({isCameraInteracting:t}),seek:t=>e({currentFrame:Math.max(0,Math.min(n().durationFrames,t))}),setDuration:t=>{e({durationFrames:t})},setFps:t=>{e({fps:t})}}),Rl=(e,n)=>({selectedTrackIds:[],selectedKeyframeIds:[],softSelectionRadius:0,softSelectionEnabled:!1,softSelectionType:"S-Curve",bounceTension:.5,bounceFriction:.6,selectTrack:(t,o)=>e(i=>({selectedTrackIds:o?i.selectedTrackIds.includes(t)?i.selectedTrackIds.filter(s=>s!==t):[...i.selectedTrackIds,t]:[t]})),selectTracks:(t,o)=>e(i=>{const s=new Set(i.selectedTrackIds);return o?t.forEach(r=>s.add(r)):t.forEach(r=>s.delete(r)),{selectedTrackIds:Array.from(s)}}),selectKeyframe:(t,o,i)=>e(s=>{const r=`${t}::${o}`;return{selectedKeyframeIds:i?s.selectedKeyframeIds.includes(r)?s.selectedKeyframeIds.filter(l=>l!==r):[...s.selectedKeyframeIds,r]:[r]}}),selectKeyframes:(t,o)=>e(i=>({selectedKeyframeIds:o?Array.from(new Set([...i.selectedKeyframeIds,...t])):t})),deselectAll:()=>e({selectedTrackIds:[],selectedKeyframeIds:[]}),deselectAllKeys:()=>e({selectedKeyframeIds:[]}),setSoftSelection:(t,o)=>e({softSelectionRadius:t,softSelectionEnabled:o}),setSoftSelectionType:t=>e({softSelectionType:t}),setBouncePhysics:(t,o)=>e({bounceTension:t,bounceFriction:o})});function rr(e,n,t,o,i){const s=1-e,r=e*e,l=s*s,c=l*s,d=r*e;return c*n+3*l*e*t+3*s*r*o+d*i}function to(e,n){let t=n[0],o=n[n.length-1];for(let f=0;f<n.length-1;f++)if(e>=n[f].frame&&e<n[f+1].frame){t=n[f],o=n[f+1];break}if(e>=o.frame)return o.value;if(e<=t.frame)return t.value;const i=o.frame-t.frame,s=(e-t.frame)/i;if(t.interpolation==="Step")return t.value;if(t.interpolation==="Linear")return t.value+(o.value-t.value)*s;const r=t.value,l=t.value+(t.rightTangent?t.rightTangent.y:0),c=o.value+(o.leftTangent?o.leftTangent.y:0),d=o.value;return rr(s,r,l,c,d)}function Il(e,n=1){const t=[],o=e[0].frame,i=e[e.length-1].frame,s=Math.max(n,(i-o)/50);for(let r=o;r<=i;r+=s)t.push({t:r,val:to(r,e)});return t.length>0&&t[t.length-1].t<i&&t.push({t:i,val:to(i,e)}),t}function Pl(e,n,t){let o=0,i=0,s=0,r=0,l=0,c=0,d=0;for(let y=0;y<e.length;y++){const b=e[y].t,x=1-b,m=e[y].val;c+=m,d+=m*m;const C=3*x*x*b,k=3*x*b*b,w=x*x*x*n+b*b*b*t,S=m-w;o+=C*C,i+=C*k,s+=k*k,r+=S*C,l+=S*k}const f=e.length,h=c/f;if(d/f-h*h<1e-9)return null;const u=o*s-i*i;if(Math.abs(u)<1e-9)return null;const g=(s*r-i*l)/u,v=(o*l-i*r)/u;return{h1:g,h2:v}}function Tl(e,n){const t=e.length;if(t<2){const u=e[0].val;return{leftY:u,rightY:u}}const o=e[0].val,i=e[t-1].val,s=i-o,r=o+s*.333,l=o+s*.666,c=Pl(e,o,i);let d=r,f=l;c&&(d=c.h1,f=c.h2);const h=r+(d-r)*n,p=l+(f-l)*n;return{leftY:h,rightY:p}}function cn(e,n,t,o){if(e.length<2)return;const i=e[0],s=e[e.length-1],r=s.t-i.t,l=e.map(p=>({t:(p.t-i.t)/r,val:p.val})),{leftY:c,rightY:d}=Tl(l,o);let f=0,h=-1;if(r<1)f=0;else for(let p=1;p<l.length-1;p++){const u=l[p].t,g=rr(u,i.val,c,d,s.val),v=Math.abs(g-l[p].val);v>f&&(f=v,h=p)}if(f<=t||e.length<=2){const p=n[n.length-1];p&&(p.rightTangent={x:r*.333,y:c-i.val});const u={id:nt(),frame:s.t,value:s.val,interpolation:"Bezier",brokenTangents:!1,autoTangent:!1,leftTangent:{x:-r*.333,y:d-s.val},rightTangent:{x:1,y:0}};n.push(u)}else{const p=e.slice(0,h+1),u=e.slice(h);cn(p,n,t,o),cn(u,n,t,o)}}const El=(e,n,t=1)=>{if(e.length<2)return e;t=Math.max(0,Math.min(1,t));const o=[...e].sort((l,c)=>l.frame-c.frame),i=Il(o,1),s=[],r=i[0];return s.push({id:nt(),frame:r.t,value:r.val,interpolation:"Bezier",brokenTangents:!1,autoTangent:!1,leftTangent:{x:-1,y:0},rightTangent:{x:1,y:0}}),cn(i,s,n,t),s.length>0&&(s[0].leftTangent={x:-1,y:0},s[s.length-1].rightTangent={x:1,y:0}),s},Ll=4;function ir(e,n,t,o,i){const s=1-e,r=e*e,l=s*s,c=l*s,d=r*e;return c*n+3*l*e*t+3*s*r*o+d*i}function Nl(e,n,t,o,i){const s=1-e;return 3*s*s*(t-n)+6*s*e*(o-t)+3*e*e*(i-o)}function Dl(e,n,t,o,i){const s=i-n;if(s<=1e-9)return 0;let r=(e-n)/s;for(let l=0;l<Ll;++l){const c=ir(r,n,t,o,i),d=Nl(r,n,t,o,i);if(Math.abs(d)<1e-9)break;const f=c-e;r-=f/d}return Math.max(0,Math.min(1,r))}function _l(e,n,t,o,i,s,r,l,c){const d=n,f=t,h=n+o,p=t+i,u=s+l,g=r+c,v=s,y=r,b=Dl(e,d,h,u,v);return ir(b,f,p,g,y)}const it=.333,ot={interpolate:(e,n,t,o=!1)=>{if(n.interpolation==="Step")return n.value;let i=n.value,s=t.value;if(o){const c=Math.PI*2,d=s-i;d>Math.PI?s-=c:d<-Math.PI&&(s+=c)}if(n.interpolation==="Bezier"){const c=n.rightTangent?n.rightTangent.x:(t.frame-n.frame)*it,d=n.rightTangent?n.rightTangent.y:0,f=t.leftTangent?t.leftTangent.x:-(t.frame-n.frame)*it,h=t.leftTangent?t.leftTangent.y:0;return _l(e,n.frame,i,c,d,t.frame,s,f,h)}const r=t.frame-n.frame;if(r<1e-9)return i;const l=(e-n.frame)/r;return i+(s-i)*l},scaleHandles:(e,n,t,o,i)=>{const s={};if(e.interpolation!=="Bezier")return s;if(n&&e.leftTangent){const r=o-n.frame,l=i-n.frame;if(Math.abs(r)>1e-5&&Math.abs(l)>1e-5){const c=l/r;s.leftTangent={x:e.leftTangent.x*c,y:e.leftTangent.y*c}}}if(t&&e.rightTangent){const r=t.frame-o,l=t.frame-i;if(Math.abs(r)>1e-5&&Math.abs(l)>1e-5){const c=l/r;s.rightTangent={x:e.rightTangent.x*c,y:e.rightTangent.y*c}}}return s},calculateTangents:(e,n,t,o)=>{if(o==="Ease"){const y=n?(e.frame-n.frame)*it:10,b=t?(t.frame-e.frame)*it:10;return{l:{x:-y,y:0},r:{x:b,y:0}}}if(!n&&!t)return{l:{x:-10,y:0},r:{x:10,y:0}};if(!n){const y=(t.value-e.value)/(t.frame-e.frame),b=(t.frame-e.frame)*it;return{l:{x:-10,y:0},r:{x:b,y:b*y}}}if(!t){const y=(e.value-n.value)/(e.frame-n.frame),b=(e.frame-n.frame)*it;return{l:{x:-b,y:-b*y},r:{x:10,y:0}}}const i=e.frame-n.frame,s=e.value-n.value,r=i===0?0:s/i,l=t.frame-e.frame,c=t.value-e.value,d=l===0?0:c/l;if(r*d<=0){const y=i*it,b=l*it;return{l:{x:-y,y:0},r:{x:b,y:0}}}const f=t.frame-n.frame,h=t.value-n.value;let p=f===0?0:h/f;const u=3*Math.min(Math.abs(r),Math.abs(d));Math.abs(p)>u&&(p=Math.sign(p)*u);const g=i*it,v=l*it;return{l:{x:-g,y:-g*p},r:{x:v,y:v*p}}},constrainHandles:(e,n,t)=>{var i,s;const o={};if(e.leftTangent&&n){const r=e.frame-n.frame;if(r>.001){const l=r*it;if(Math.abs(e.leftTangent.x)>l){const c=l/Math.abs(e.leftTangent.x);o.leftTangent={x:e.leftTangent.x*c,y:e.leftTangent.y*c}}e.leftTangent.x>0&&(o.leftTangent={x:0,y:((i=o.leftTangent)==null?void 0:i.y)??e.leftTangent.y})}}if(e.rightTangent&&t){const r=t.frame-e.frame;if(r>.001){const l=r*it;if(Math.abs(e.rightTangent.x)>l){const c=l/Math.abs(e.rightTangent.x);o.rightTangent={x:e.rightTangent.x*c,y:e.rightTangent.y*c}}e.rightTangent.x<0&&(o.rightTangent={x:0,y:((s=o.rightTangent)==null?void 0:s.y)??e.rightTangent.y})}}return o},calculateSoftFalloff:(e,n,t)=>{if(e>=n)return 0;const o=e/n;switch(t){case"Linear":return 1-o;case"Dome":return Math.sqrt(1-o*o);case"Pinpoint":return Math.pow(1-o,4);case"S-Curve":return .5*(1+Math.cos(o*Math.PI));default:return 1-o}}},Ua={updateNeighbors:(e,n)=>{const t=e[n],o=n===e.length-1,i=n-1;if(i>=0){const r={...e[i]};if(e[i]=r,r.interpolation==="Bezier"){const l=t.frame-r.frame;if(r.autoTangent){const c=e[i-1],{l:d,r:f}=ot.calculateTangents(r,c,t,"Auto");r.leftTangent=d,r.rightTangent=f}else{const c=ot.constrainHandles(r,e[i-1],t);Object.assign(r,c)}if(o&&l>1e-4){const c=l*.3,d=r.rightTangent||{x:10,y:0};if(d.x<c){const f=c/Math.max(1e-4,Math.abs(d.x));r.rightTangent={x:c,y:d.y*f}}}}}const s=n+1;if(s<e.length){const r={...e[s]};if(e[s]=r,r.interpolation==="Bezier")if(r.autoTangent){const l=e[s+1],{l:c,r:d}=ot.calculateTangents(r,t,l,"Auto");r.leftTangent=c,r.rightTangent=d}else{const l=ot.constrainHandles(r,t,e[s+1]);Object.assign(r,l)}}},inferInterpolation:(e,n)=>{const t=e.filter(o=>o.frame<n).sort((o,i)=>i.frame-o.frame);return t.length===0||t[0].interpolation==="Linear"?"Linear":t[0].interpolation==="Step"?"Step":"Bezier"}},Fl=xe(),Al={durationFrames:300,fps:30,tracks:{}},zl=(e,n)=>({sequence:Al,clipboard:null,undoStack:[],redoStack:[],snapshot:()=>{const t=n().sequence,o=JSON.parse(JSON.stringify(t));e(i=>{const s=[...i.undoStack,{type:"SEQUENCE",data:o}];return{undoStack:s.length>50?s.slice(1):s,redoStack:[]}})},undo:()=>{const{undoStack:t,redoStack:o,sequence:i}=n();if(t.length===0)return!1;const s=t[t.length-1],r=t.slice(0,-1),c={type:"SEQUENCE",data:JSON.parse(JSON.stringify(i))};return e({sequence:s.data,undoStack:r,redoStack:[c,...o]}),!0},redo:()=>{const{undoStack:t,redoStack:o,sequence:i}=n();if(o.length===0)return!1;const s=o[0],r=o.slice(1),c={type:"SEQUENCE",data:JSON.parse(JSON.stringify(i))};return e({sequence:s.data,undoStack:[...t,c],redoStack:r}),!0},setSequence:t=>{n().snapshot(),e({sequence:t})},addTrack:(t,o)=>{n().snapshot(),e(i=>i.sequence.tracks[t]?i:{sequence:{...i.sequence,tracks:{...i.sequence.tracks,[t]:{id:t,type:"float",label:o,keyframes:[]}}}})},removeTrack:t=>{n().snapshot(),e(o=>{const i={...o.sequence.tracks};return delete i[t],{sequence:{...o.sequence,tracks:i},selectedTrackIds:o.selectedTrackIds.filter(s=>s!==t)}})},setTrackBehavior:(t,o)=>{n().snapshot(),e(i=>{const s=i.sequence.tracks[t];return s?{sequence:{...i.sequence,tracks:{...i.sequence.tracks,[t]:{...s,postBehavior:o}}}}:i})},addKeyframe:(t,o,i,s)=>{e(r=>{const l=r.sequence.tracks[t];if(!l)return r;let c=s||"Bezier";s||(c=Ua.inferInterpolation(l.keyframes,o));const d=c==="Bezier",f={id:nt(),frame:o,value:i,interpolation:c,autoTangent:d,brokenTangents:!1},p=[...l.keyframes.filter(g=>Math.abs(g.frame-o)>.001),f].sort((g,v)=>g.frame-v.frame),u=p.findIndex(g=>g.id===f.id);if(c==="Bezier"){const g=u>0?p[u-1]:void 0,v=u<p.length-1?p[u+1]:void 0,{l:y,r:b}=ot.calculateTangents(f,g,v,"Auto");f.leftTangent=y,f.rightTangent=b}return Ua.updateNeighbors(p,u),{sequence:{...r.sequence,tracks:{...r.sequence.tracks,[t]:{...l,keyframes:p}}}}})},batchAddKeyframes:(t,o,i)=>{e(s=>{const r={...s.sequence.tracks};let l=!1;return o.forEach(({trackId:c,value:d})=>{r[c]||(r[c]={id:c,type:"float",label:c,keyframes:[]},l=!0);const f=r[c],h=[...f.keyframes],p=h.length>0?h[h.length-1]:null,u={id:nt(),frame:t,value:d,interpolation:i||"Linear",autoTangent:i==="Bezier",brokenTangents:!1};if(p)if(t>p.frame)h.push(u);else if(Math.abs(t-p.frame)<.001)u.id=p.id,h[h.length-1]=u;else{const g=h.filter(v=>Math.abs(v.frame-t)>.001);g.push(u),g.sort((v,y)=>v.frame-y.frame),f.keyframes=g,l=!0;return}else h.push(u);f.keyframes=h,l=!0}),l?{sequence:{...s.sequence,tracks:r}}:s})},removeKeyframe:(t,o)=>{n().snapshot(),e(i=>{const s=i.sequence.tracks[t];return s?{sequence:{...i.sequence,tracks:{...i.sequence.tracks,[t]:{...s,keyframes:s.keyframes.filter(r=>r.id!==o)}}}}:i})},updateKeyframe:(t,o,i)=>{e(s=>{const r=s.sequence.tracks[t];if(!r)return s;const l=r.keyframes.map(c=>c.id===o?{...c,...i}:c).sort((c,d)=>c.frame-d.frame);return{sequence:{...s.sequence,tracks:{...s.sequence.tracks,[t]:{...r,keyframes:l}}}}})},updateKeyframes:t=>{e(o=>{const i={...o.sequence.tracks};return t.forEach(({trackId:s,keyId:r,patch:l})=>{const c=i[s];if(c){const d=c.keyframes.findIndex(f=>f.id===r);if(d!==-1){const f=c.keyframes[d];l.interpolation==="Bezier"&&f.interpolation!=="Bezier"&&(l.autoTangent=!0),c.keyframes[d]={...f,...l}}}}),Object.keys(i).forEach(s=>{i[s].keyframes.sort((r,l)=>r.frame-l.frame)}),{sequence:{...o.sequence,tracks:i}}})},deleteSelectedKeyframes:()=>{n().snapshot(),e(t=>{const o={...t.sequence.tracks},i=new Set(t.selectedKeyframeIds);return Object.keys(o).forEach(s=>{o[s]={...o[s],keyframes:o[s].keyframes.filter(r=>!i.has(`${s}::${r.id}`))}}),{sequence:{...t.sequence,tracks:o},selectedKeyframeIds:[]}})},deleteAllKeys:()=>{n().snapshot(),e(t=>{const o={...t.sequence.tracks};return Object.keys(o).forEach(i=>{o[i]={...o[i],keyframes:[]}}),{sequence:{...t.sequence,tracks:o},selectedKeyframeIds:[]}})},deleteAllTracks:()=>{n().snapshot(),e({sequence:{...n().sequence,tracks:{}},selectedTrackIds:[],selectedKeyframeIds:[]})},setTangents:t=>{n().snapshot(),e(o=>{const i={...o.sequence.tracks};return o.selectedKeyframeIds.forEach(s=>{const[r,l]=s.split("::"),c=i[r];if(c){const d=c.keyframes.findIndex(h=>h.id===l);if(d===-1)return;const f=c.keyframes[d];if(t==="Split")c.keyframes[d]={...f,brokenTangents:!0,autoTangent:!1};else if(t==="Unified"){let h=f.rightTangent,p=f.leftTangent;if(h&&p){const u=Math.sqrt(h.x*h.x+h.y*h.y),g=Math.sqrt(p.x*p.x+p.y*p.y);h={x:-p.x*(u/Math.max(.001,g)),y:-p.y*(u/Math.max(.001,g))}}c.keyframes[d]={...f,rightTangent:h,brokenTangents:!1,autoTangent:!1}}else if(t==="Auto"||t==="Ease"){const h=c.keyframes[d-1],p=c.keyframes[d+1],{l:u,r:g}=ot.calculateTangents(f,h,p,t);c.keyframes[d]={...f,autoTangent:t==="Auto",brokenTangents:!1,leftTangent:u,rightTangent:g}}}}),{sequence:{...o.sequence,tracks:i}}})},setGlobalInterpolation:(t,o)=>{n().snapshot(),e(i=>{const s={...i.sequence.tracks};return Object.keys(s).forEach(r=>{const l=s[r];l.keyframes.length!==0&&l.keyframes.forEach((c,d)=>{if(c.interpolation=t,t==="Bezier"&&o){const f=l.keyframes[d-1],h=l.keyframes[d+1],{l:p,r:u}=ot.calculateTangents(c,f,h,o);c.leftTangent=p,c.rightTangent=u,c.autoTangent=o==="Auto",c.brokenTangents=!1}})}),{sequence:{...i.sequence,tracks:s}}})},copySelectedKeyframes:()=>{const{sequence:t,selectedKeyframeIds:o}=n();if(o.length===0)return;let i=1/0;o.forEach(r=>{var f,h;const[l,c]=r.split("::"),d=(h=(f=t.tracks[l])==null?void 0:f.keyframes.find(p=>p.id===c))==null?void 0:h.frame;d!==void 0&&d<i&&(i=d)});const s=[];o.forEach(r=>{var f;const[l,c]=r.split("::"),d=(f=t.tracks[l])==null?void 0:f.keyframes.find(h=>h.id===c);d&&s.push({relativeFrame:d.frame-i,value:d.value,interpolation:d.interpolation,leftTangent:d.leftTangent,rightTangent:d.rightTangent,originalTrackId:l})}),s.length>0&&e({clipboard:s})},pasteKeyframes:t=>{const{clipboard:o,currentFrame:i}=n();o&&(n().snapshot(),e(s=>{const r={...s.sequence.tracks},l=t!==void 0?t:i;return o.forEach(c=>{const d=r[c.originalTrackId];if(d){const f=l+c.relativeFrame,h={id:nt(),frame:f,value:c.value,interpolation:c.interpolation,leftTangent:c.leftTangent,rightTangent:c.rightTangent,autoTangent:!1,brokenTangents:!1};d.keyframes=[...d.keyframes.filter(p=>Math.abs(p.frame-f)>.001),h].sort((p,u)=>p.frame-u.frame)}}),{sequence:{...s.sequence,tracks:r}}}))},duplicateSelection:()=>{n().copySelectedKeyframes(),n().pasteKeyframes(n().currentFrame)},loopSelection:t=>{const o=n();if(o.selectedKeyframeIds.length<1)return;o.snapshot();let i=1/0,s=-1/0;if(o.selectedKeyframeIds.forEach(l=>{const[c,d]=l.split("::"),f=o.sequence.tracks[c],h=f==null?void 0:f.keyframes.find(p=>p.id===d);h&&(h.frame<i&&(i=h.frame),h.frame>s&&(s=h.frame))}),i===1/0||s===-1/0)return;const r=Math.max(1,s-i);e(l=>{const c={...l.sequence.tracks};for(let d=1;d<=t;d++){const f=r*d;l.selectedKeyframeIds.forEach(h=>{const[p,u]=h.split("::"),g=c[p];if(!g)return;const v=g.keyframes.find(y=>y.id===u);if(v){const y=v.frame+f,b={...v,id:nt(),frame:y};g.keyframes=[...g.keyframes.filter(x=>Math.abs(x.frame-y)>.001),b]}})}return Object.values(c).forEach(d=>d.keyframes.sort((f,h)=>f.frame-h.frame)),{sequence:{...l.sequence,tracks:c}}})},captureCameraFrame:(t,o=!1,i)=>{const s=Je()||Fl.activeCamera;if(!s)return;o||n().snapshot();const r=Ye.getUnifiedFromEngine(),l=s.quaternion,c=new _e().setFromQuaternion(l),d=[{id:"camera.unified.x",val:r.x,label:"Position X"},{id:"camera.unified.y",val:r.y,label:"Position Y"},{id:"camera.unified.z",val:r.z,label:"Position Z"},{id:"camera.rotation.x",val:c.x,label:"Rotation X"},{id:"camera.rotation.y",val:c.y,label:"Rotation Y"},{id:"camera.rotation.z",val:c.z,label:"Rotation Z"}];e(f=>{const h={...f.sequence.tracks},p=h["camera.unified.x"],u=!p||p.keyframes.length===0,g=i||(u?"Linear":"Bezier");return d.forEach(v=>{let y=h[v.id];y||(y={id:v.id,type:"float",label:v.label,keyframes:[],hidden:!1},h[v.id]=y);const b={id:nt(),frame:t,value:v.val,interpolation:g,autoTangent:g==="Bezier",brokenTangents:!1},m=[...y.keyframes.filter(k=>Math.abs(k.frame-t)>.001),b].sort((k,w)=>k.frame-w.frame),C=m.findIndex(k=>k.id===b.id);if(g==="Bezier"){const k=C>0?m[C-1]:void 0,w=C<m.length-1?m[C+1]:void 0,{l:S,r:j}=ot.calculateTangents(b,k,w,"Auto");b.leftTangent=S,b.rightTangent=j}Ua.updateNeighbors(m,C),y.keyframes=m}),{sequence:{...f.sequence,tracks:h}}})},simplifySelectedKeys:(t=.01)=>{n().snapshot(),e(o=>{const i=o,s={...i.sequence.tracks},r=new Set(i.selectedKeyframeIds),l={};i.selectedKeyframeIds.forEach(d=>{const[f,h]=d.split("::");l[f]||(l[f]=[]);const p=i.sequence.tracks[f],u=p==null?void 0:p.keyframes.find(g=>g.id===h);u&&l[f].push(u)});const c=[];return Object.entries(l).forEach(([d,f])=>{const h=s[d];if(!h)return;const p={...h};if(s[d]=p,f.length<3)return;const u=f.sort((v,y)=>v.frame-y.frame);p.keyframes=p.keyframes.filter(v=>!r.has(`${d}::${v.id}`));const g=El(u,t);p.keyframes=[...p.keyframes,...g].sort((v,y)=>v.frame-y.frame),g.forEach(v=>c.push(`${d}::${v.id}`))}),{sequence:{...i.sequence,tracks:s},selectedKeyframeIds:c}})}}),le=qo()(Yo((e,n,t)=>({...jl(e,n),...Rl(e),...zl(e,n)})));typeof window<"u"&&(window.useAnimationStore=le);const da=xe(),ya=e=>{const n={};return e&&Object.keys(e).forEach(t=>{if(t.startsWith("is"))return;const o=e[t];if(o&&typeof o=="object"&&"isColor"in o)n[t]="#"+o.getHexString();else if(o&&typeof o=="object"&&("isVector2"in o||"isVector3"in o)){const i={...o};delete i.isVector2,delete i.isVector3,n[t]=i}else n[t]=o}),n},sr=e=>{const n=we.get(e),t=n&&n.defaultPreset?n.defaultPreset:{},o={version:5,name:e,formula:e,features:{}};return ne.getAll().forEach(i=>{const s={};Object.entries(i.params).forEach(([r,l])=>{l.composeFrom||(s[r]=l.default)}),o.features[i.id]=ya(s)}),t.features&&Object.entries(t.features).forEach(([i,s])=>{o.features[i]?o.features[i]={...o.features[i],...ya(s)}:o.features[i]=ya(s)}),t.lights&&(o.features.lighting||(o.features.lighting={}),o.features.lighting.lights=t.lights),t.renderMode&&(o.features.lighting||(o.features.lighting={}),o.features.lighting.renderMode=t.renderMode==="PathTracing"?1:0),o.cameraMode=t.cameraMode||"Orbit",o.quality={aaMode:"Always",aaLevel:1,msaa:1,accumulation:!0,...t.quality||{}},o.lights=[],o.animations=t.animations||[],o.navigation={flySpeed:.5,autoSlow:!0,...t.navigation||{}},o.sceneOffset=t.sceneOffset||{x:0,y:0,z:0,xL:0,yL:0,zL:0},o.cameraPos=t.cameraPos||{x:0,y:0,z:3.5},o.cameraRot=t.cameraRot||{x:0,y:0,z:0,w:1},o.targetDistance=t.targetDistance||3.5,o.duration=t.duration||300,o.sequence=t.sequence||{durationFrames:300,fps:30,tracks:{}},o},Ol=(e,n,t)=>{const o=t(),i=e.features||{};if(e.renderMode&&(i.lighting||(i.lighting={}),i.lighting.renderMode===void 0&&(i.lighting.renderMode=e.renderMode==="PathTracing"?1:0)),i.atmosphere&&!i.ao){const y={};i.atmosphere.aoIntensity!==void 0&&(y.aoIntensity=i.atmosphere.aoIntensity),i.atmosphere.aoSpread!==void 0&&(y.aoSpread=i.atmosphere.aoSpread),i.atmosphere.aoMode!==void 0&&(y.aoMode=i.atmosphere.aoMode),i.atmosphere.aoEnabled!==void 0&&(y.aoEnabled=i.atmosphere.aoEnabled),Object.keys(y).length>0&&(i.ao=y)}if(ne.getAll().forEach(y=>{const b=`set${y.id.charAt(0).toUpperCase()+y.id.slice(1)}`,x=o[b];if(typeof x=="function"){const m=i[y.id],C={};if(y.state&&Object.assign(C,y.state),Object.entries(y.params).forEach(([k,w])=>{if(m&&m[k]!==void 0){let S=m[k];w.type==="vec2"&&S&&!(S instanceof Te)?S=new Te(S.x,S.y):w.type==="vec3"&&S&&!(S instanceof V)?S=new V(S.x,S.y,S.z):w.type==="color"&&S&&!(S instanceof qe)&&(S=new qe(S)),C[k]=S}else if(C[k]===void 0){let S=w.default;S&&typeof S=="object"&&(typeof S.clone=="function"?S=S.clone():Array.isArray(S)?S=[...S]:S={...S}),C[k]=S}}),y.id==="lighting"&&m){if(m.lights)C.lights=rn(m.lights.map(k=>({...k,type:k.type||"Point",rotation:k.rotation||{x:0,y:0,z:0}})));else if(m.light0_posX!==void 0){const k=[];for(let w=0;w<3;w++)if(m[`light${w}_posX`]!==void 0){let S=m[`light${w}_color`]||"#ffffff";S.getHexString&&(S="#"+S.getHexString()),k.push({type:"Point",position:{x:m[`light${w}_posX`],y:m[`light${w}_posY`],z:m[`light${w}_posZ`]},rotation:{x:0,y:0,z:0},color:S,intensity:m[`light${w}_intensity`]??1,falloff:m[`light${w}_falloff`]??0,falloffType:m[`light${w}_type`]?"Linear":"Quadratic",fixed:m[`light${w}_fixed`]??!1,visible:m[`light${w}_visible`]??w===0,castShadow:m[`light${w}_castShadow`]??!0})}k.length>0&&(C.lights=k)}}y.id==="materials"&&m&&m.envMapVisible!==void 0&&m.envBackgroundStrength===void 0&&(C.envBackgroundStrength=m.envMapVisible?1:0),x(C)}}),e.lights&&e.lights.length>0){const y=o.setLighting;if(typeof y=="function"){const b=rn(e.lights.map(x=>({...x,type:x.type||"Point",rotation:x.rotation||{x:0,y:0,z:0}})));y({lights:b})}}e.sequence&&le.getState().setSequence(e.sequence),o.setAnimations(e.animations||[]),e.savedCameras&&Array.isArray(e.savedCameras)&&e.savedCameras.length>0&&n({savedCameras:e.savedCameras,activeCameraId:e.savedCameras[0].id||null});const s=e.cameraPos||{x:0,y:0,z:3.5},r=e.sceneOffset||{x:0,y:0,z:0,xL:0,yL:0,zL:0},l=e.targetDistance||3.5,c=e.cameraRot||{x:0,y:0,z:0,w:1},d=r.x+r.xL+s.x,f=r.y+r.yL+s.y,h=r.z+r.zL+s.z,p=be.split(d),u=be.split(f),g=be.split(h),v={x:p.high,y:u.high,z:g.high,xL:p.low,yL:u.low,zL:g.low};n({cameraRot:c,targetDistance:l,sceneOffset:v,cameraMode:e.cameraMode||t().cameraMode}),da.activeCamera&&da.virtualSpace&&da.virtualSpace.applyCameraState(da.activeCamera,{position:{x:0,y:0,z:0},rotation:c,sceneOffset:v,targetDistance:l}),Y.emit("camera_teleport",{position:{x:0,y:0,z:0},rotation:c,sceneOffset:v,targetDistance:l}),e.duration&&le.getState().setDuration(e.duration),e.formula==="Modular"&&o.refreshPipeline(),o.refreshHistogram(),Y.emit("reset_accum",void 0)},$l={formula:"Mandelbulb",cameraPos:{x:0,y:0,z:0},cameraRot:{x:0,y:0,z:0,w:1},sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0},targetDistance:3.5,cameraMode:"Orbit"},Bl=(e,n,t={includeAnimations:!0})=>{try{e.quality&&(delete e.quality.aaLevel,delete e.quality.aaMode,delete e.quality.msaa),e.features&&e.features.quality&&delete e.features.quality.resolutionMode,t.includeAnimations===!1&&(delete e.sequence,delete e.animations);const o=sr(e.formula);o.formula="";const i=ne.getDictionary();return new ln(o,i).encode(e,n)}catch(o){return console.error("Sharing: Failed to generate share string",o),""}},lr=e=>{if(!e)return null;try{const n=ne.getDictionary(),o=new ln($l,n).decode(e);if(o&&o.formula){const i=sr(o.formula);return new ln(i,n).decode(e)}}catch(n){console.error("Sharing: Failed to load share string",n)}return null},Wa=xe();class Hl{constructor(){Q(this,"pendingCam");Q(this,"binders",new Map);Q(this,"overriddenTracks",new Set);Q(this,"lastCameraIndex",-1);Q(this,"animStore",null);Q(this,"fractalStore",null);this.pendingCam={rot:new _e,unified:new V,rotDirty:!1,unifiedDirty:!1}}connect(n,t){this.animStore=n,this.fractalStore=t}setOverriddenTracks(n){this.overriddenTracks=n}getBinder(n){if(this.binders.has(n))return this.binders.get(n);let t=()=>{};if(n==="camera.active_index")t=o=>{const i=Math.round(o);if(i!==this.lastCameraIndex){const s=this.fractalStore.getState(),r=s.savedCameras;r&&r[i]&&(s.selectCamera(r[i].id),this.lastCameraIndex=i)}};else if(n.startsWith("camera.")){const o=n.split("."),i=o[1],s=o[2];i==="unified"?t=r=>{this.pendingCam.unified[s]=r,this.pendingCam.unifiedDirty=!0}:i==="rotation"&&(t=r=>{this.pendingCam.rot[s]=r,this.pendingCam.rotDirty=!0})}else if(n.startsWith("lights.")){const o=n.split("."),i=parseInt(o[1]),s=o[2];let r="";s==="position"?r=`pos${o[3].toUpperCase()}`:s==="color"?r="color":r=s;const l=`lighting.light${i}_${r}`;return this.getBinder(l)}else if(n.startsWith("lighting.light")){const o=n.match(/lighting\.light(\d+)_(\w+)/);if(o){const i=parseInt(o[1]),s=o[2],r=this.fractalStore.getState();if(s==="intensity")t=l=>r.updateLight({index:i,params:{intensity:l}});else if(s==="falloff")t=l=>r.updateLight({index:i,params:{falloff:l}});else if(s.startsWith("pos")){const l=s.replace("pos","").toLowerCase();t=c=>{var h;const f=(h=this.fractalStore.getState().lighting)==null?void 0:h.lights[i];if(f){const p={...f.position,[l]:c};r.updateLight({index:i,params:{position:p}})}}}else if(s.startsWith("rot")){const l=s.replace("rot","").toLowerCase();t=c=>{var h;const f=(h=this.fractalStore.getState().lighting)==null?void 0:h.lights[i];if(f){const p={...f.rotation,[l]:c};r.updateLight({index:i,params:{rotation:p}})}}}}}else if(n.includes(".")){const o=n.split("."),i=o[0],s=o[1];if(ne.get(i)){const l=this.fractalStore.getState(),c=`set${i.charAt(0).toUpperCase()+i.slice(1)}`,d=l[c];if(d&&typeof d=="function"){const f=s.match(/^(vec[23][ABC])_(x|y|z)$/);if(f){const h=f[1],p=f[2];t=u=>{var y;const v=(y=this.fractalStore.getState()[i])==null?void 0:y[h];if(v){const b=v.clone();b[p]=u,d({[h]:b})}}}else t=h=>d({[s]:h})}else console.warn(`AnimationEngine: Setter ${c} not found for feature ${i}`)}}else{const o=this.fractalStore.getState(),i="set"+n.charAt(0).toUpperCase()+n.slice(1);typeof o[i]=="function"&&(t=s=>o[i](s))}return this.binders.set(n,t),t}tick(n){if(!this.animStore)return;const t=this.animStore.getState();if(!t.isPlaying)return;const o=t.fps,i=t.currentFrame,s=t.durationFrames,r=t.loopMode,l=n*o;let c=i+l;if(c>=s)if(r==="Once"||t.isRecordingModulation){c=s,this.scrub(s),this.animStore.setState({isPlaying:!1,currentFrame:s}),t.isRecordingModulation&&t.stopModulationRecording();return}else c=0;this.animStore.setState({currentFrame:c}),this.scrub(c)}scrub(n){if(!this.animStore)return;const{sequence:t,isPlaying:o,isRecording:i,recordCamera:s}=this.animStore.getState(),r=Object.values(t.tracks);this.syncBuffersFromEngine();const l=o&&i&&s;for(let c=0;c<r.length;c++){const d=r[c];if(this.overriddenTracks.has(d.id)||d.keyframes.length===0||d.type!=="float"||d.id.includes("camera.position")||d.id.includes("camera.offset")||l&&d.id.startsWith("camera."))continue;const f=this.interpolate(d,n);this.getBinder(d.id)(f)}this.commitState()}syncBuffersFromEngine(){const n=Je()||Wa.activeCamera;if(n){this.pendingCam.rot.setFromQuaternion(n.quaternion);const t=Wa.sceneOffset;this.pendingCam.unified.set(t.x+t.xL+n.position.x,t.y+t.yL+n.position.y,t.z+t.zL+n.position.z),this.pendingCam.rotDirty=!1,this.pendingCam.unifiedDirty=!1}}interpolate(n,t){const o=n.keyframes;if(o.length===0)return 0;const i=o[0],s=o[o.length-1],r=n.id.startsWith("camera.rotation")||n.id.includes("rot")||n.id.includes("phase")||n.id.includes("twist");if(t>s.frame){const l=n.postBehavior||"Hold";if(l==="Hold")return s.value;if(l==="Continue"){let u=0;if(o.length>1){const g=o[o.length-2];s.interpolation==="Linear"?u=(s.value-g.value)/(s.frame-g.frame):s.interpolation==="Bezier"&&(s.leftTangent&&Math.abs(s.leftTangent.x)>.001?u=s.leftTangent.y/s.leftTangent.x:u=(s.value-g.value)/(s.frame-g.frame))}return s.value+u*(t-s.frame)}const c=s.frame-i.frame;if(c<=.001)return s.value;const d=t-i.frame,f=Math.floor(d/c),h=i.frame+d%c,p=this.evaluateCurveInternal(o,h,r);if(l==="Loop")return p;if(l==="PingPong"){if(f%2===1){const g=s.frame-d%c;return this.evaluateCurveInternal(o,g,r)}return p}if(l==="OffsetLoop"){const u=s.value-i.value;return p+u*f}}return t<i.frame?i.value:this.evaluateCurveInternal(o,t,r)}evaluateCurveInternal(n,t,o){for(let i=0;i<n.length-1;i++){const s=n[i],r=n[i+1];if(t>=s.frame&&t<=r.frame)return ot.interpolate(t,s,r,o)}return n[n.length-1].value}commitState(){if(this.pendingCam.unifiedDirty||this.pendingCam.rotDirty){Wa.shouldSnapCamera=!0;const n=new Oe().setFromEuler(this.pendingCam.rot),t={x:n.x,y:n.y,z:n.z,w:n.w},o=be.split(this.pendingCam.unified.x),i=be.split(this.pendingCam.unified.y),s=be.split(this.pendingCam.unified.z);Y.emit(ge.CAMERA_TELEPORT,{position:{x:0,y:0,z:0},rotation:t,sceneOffset:{x:o.high,y:i.high,z:s.high,xL:o.low,yL:i.low,zL:s.low}}),this.fractalStore.setState({cameraRot:t})}}}const ka=new Hl,sh=(e,n)=>{const t={};e.forEach(r=>t[r.id]=[]),n.forEach(r=>{t[r.source]&&t[r.source].push(r.target)});const o=new Set,i=new Set,s=r=>{if(!o.has(r)){o.add(r),i.add(r);const l=t[r]||[];for(const c of l)if(!o.has(c)&&s(c)||i.has(c))return!0}return i.delete(r),!1};for(const r of e)if(s(r.id))return!0;return!1},ao=(e,n)=>{const t={},o={};e.forEach(r=>{t[r.id]=[],o[r.id]=0}),n.forEach(r=>{t[r.source]&&(t[r.source].push(r.target),o[r.target]=(o[r.target]||0)+1)});const i=[];e.forEach(r=>{o[r.id]===0&&i.push(r.id)});const s=[];for(;i.length>0;){i.sort();const r=i.shift(),l=e.find(c=>c.id===r);if(l){const{position:c,...d}=l;s.push(d)}if(t[r])for(const c of t[r])o[c]--,o[c]===0&&i.push(c)}return s},no=e=>{const n=e.map((o,i)=>({...o,position:{x:250,y:150+i*200}})),t=[];if(n.length>0){t.push({id:`e-root-start-${n[0].id}`,source:"root-start",target:n[0].id});for(let o=0;o<n.length-1;o++)t.push({id:`e-${n[o].id}-${n[o+1].id}`,source:n[o].id,target:n[o+1].id});t.push({id:`e-${n[n.length-1].id}-root-end`,source:n[n.length-1].id,target:"root-end"})}return{nodes:n,edges:t}},Gl=(e,n)=>{if(e.length!==n.length)return!1;for(let t=0;t<e.length;t++){const o=e[t],i=n[t];if(o.id!==i.id||o.type!==i.type||o.enabled!==i.enabled)return!1;const s=o.bindings||{},r=i.bindings||{},l=Object.keys(s).filter(h=>s[h]!==void 0),c=Object.keys(r).filter(h=>r[h]!==void 0);if(l.length!==c.length)return!1;for(const h of l)if(s[h]!==r[h])return!1;const d=o.condition||{active:!1,mod:0,rem:0},f=i.condition||{active:!1,mod:0,rem:0};if(d.active!==f.active||d.active&&(d.mod!==f.mod||d.rem!==f.rem))return!1}return!0},Ul=(e,n)=>e.length!==n.length?!1:JSON.stringify(e)===JSON.stringify(n),lt=xe(),z=qo()(Yo((e,n,t)=>({...Oi(e,n),...Bi(e,n),...Qi(e,n),...as(e,n),...kl(e,n),formula:"Mandelbulb",pipeline:Ln,pipelineRevision:1,graph:no(Ln),projectSettings:{name:"Mandelbulb",version:0},lastSavedHash:null,animations:[],liveModulations:{},setFormula:(o,i={})=>{const s=n(),r=s.formula;if(r===o&&o!=="Modular")return;i.skipDefaultPreset||(n().resetParamHistory(),e({undoStack:[],redoStack:[]}));const l=s.projectSettings.name;let c=l;if((l===r||l==="Untitled"||l==="Custom Preset")&&(c=o),e({formula:o,projectSettings:{...s.projectSettings,name:c}}),Y.emit(ge.CONFIG,{formula:o,pipeline:s.pipeline,graph:s.graph}),o!=="Modular"&&!i.skipDefaultPreset){const d=we.get(o),f=d&&d.defaultPreset?JSON.parse(JSON.stringify(d.defaultPreset)):{formula:o};f.features||(f.features={});const h=n();if(ne.getEngineFeatures().forEach(u=>{const g=h[u.id];if(!g)return;const v=f.features[u.id]||{},y={},b=u.engineConfig.toggleParam;g[b]!==void 0&&v[b]===void 0&&(y[b]=g[b]),Object.entries(u.params).forEach(([x,m])=>{m.onUpdate==="compile"&&g[x]!==void 0&&v[x]===void 0&&(y[x]=g[x])}),f.features[u.id]||(f.features[u.id]={}),Object.assign(f.features[u.id],y)}),n().lockSceneOnSwitch){const u=n().getPreset(),g={...u.features||{}},v=f.features||{};v.coreMath&&(g.coreMath=v.coreMath),v.geometry&&(g.geometry=v.geometry);const y={...u,formula:o,features:g};n().loadPreset(y)}else n().loadPreset(f)}n().handleInteractionEnd()},setProjectSettings:o=>e(i=>{const s={...i.projectSettings,...o};return o.name&&o.name!==i.projectSettings.name?(s.version=0,{projectSettings:s,lastSavedHash:null}):{projectSettings:s}}),prepareExport:()=>{const o=n(),i=o.getPreset({includeScene:!0}),{version:s,name:r,...l}=i,c=JSON.stringify(l);if(o.lastSavedHash===null||o.projectSettings.version===0){const d=Math.max(1,o.projectSettings.version+1);return e({projectSettings:{...o.projectSettings,version:d},lastSavedHash:c}),d}if(o.lastSavedHash!==c){const d=o.projectSettings.version+1;return e({projectSettings:{...o.projectSettings,version:d},lastSavedHash:c}),d}return o.projectSettings.version},setAnimations:o=>{const i=n().animations,s=o.map(r=>{const l=i.find(c=>c.id===r.id);if(!l)return r;if(r.period!==l.period&&r.period>0){const c=performance.now()/1e3,d=(c/l.period+l.phase-c/r.period)%1;return{...r,phase:(d+1)%1}}return r});e({animations:s})},setLiveModulations:o=>e({liveModulations:o}),setGraph:o=>{const i=ao(o.nodes,o.edges),s=n();if(Gl(s.pipeline,i))Ul(s.pipeline,i)?e({graph:o}):(e({graph:o,pipeline:i}),Y.emit(ge.CONFIG,{pipeline:i}));else if(s.autoCompile){const r=s.pipelineRevision+1;e({graph:o,pipeline:i,pipelineRevision:r}),Y.emit(ge.CONFIG,{pipeline:i,graph:o,pipelineRevision:r})}else e({graph:o})},setPipeline:o=>{const i=n().pipelineRevision+1,s=no(o);e({pipeline:o,graph:s,pipelineRevision:i}),Y.emit(ge.CONFIG,{pipeline:o,graph:s,pipelineRevision:i})},refreshPipeline:()=>{const o=n(),i=ao(o.graph.nodes,o.graph.edges),s=o.pipelineRevision+1;e({pipeline:i,pipelineRevision:s}),Y.emit(ge.CONFIG,{pipeline:i,graph:o.graph,pipelineRevision:s})},loadPreset:o=>{o._formulaDef&&!we.get(o.formula)&&we.register(o._formulaDef),n().resetParamHistory();const i=we.get(o.formula),s=i?i.id:o.formula;e({formula:s}),Y.emit(ge.CONFIG,{formula:s});let r=o.name;(!r||r==="Untitled"||r==="Custom Preset")&&(r=s),e({projectSettings:{name:r,version:0},lastSavedHash:null}),Ol(o,e,n),setTimeout(()=>{const l=n().getPreset({includeScene:!0}),{version:c,name:d,...f}=l;e({lastSavedHash:JSON.stringify(f)})},50)},getPreset:o=>{var l,c;const i=n(),s={version:i.projectSettings.version,name:i.projectSettings.name,formula:i.formula,features:{}};if((o==null?void 0:o.includeScene)!==!1){if(s.cameraPos={x:0,y:0,z:0},lt.activeCamera&&lt.virtualSpace){const d=lt.virtualSpace.getUnifiedCameraState(lt.activeCamera,i.targetDistance);s.cameraRot=d.rotation,s.sceneOffset=d.sceneOffset,s.targetDistance=d.targetDistance}else s.cameraRot=i.cameraRot,s.sceneOffset=i.sceneOffset,s.targetDistance=i.targetDistance;s.cameraMode=i.cameraMode,s.lights=[],s.renderMode=i.renderMode,s.quality={aaMode:i.aaMode,aaLevel:i.aaLevel,msaa:i.msaaSamples,accumulation:i.accumulation}}ne.getAll().forEach(d=>{const f=i[d.id];f&&(s.features||(s.features={}),s.features[d.id]=ya(f))}),s.animations=i.animations,i.savedCameras.length>0&&(s.savedCameras=i.savedCameras.map(d=>({id:d.id,label:d.label,position:d.position,rotation:d.rotation,sceneOffset:d.sceneOffset,targetDistance:d.targetDistance,optics:d.optics}))),i.formula==="Modular"&&(s.graph=i.graph,s.pipeline=i.pipeline);try{const d=(c=(l=window.useAnimationStore)==null?void 0:l.getState)==null?void 0:c.call(l);d&&(s.sequence=d.sequence,s.duration=d.durationFrames)}catch(d){console.warn("Failed to save animation sequence:",d)}return s},getShareString:o=>{const i=n().getPreset({includeScene:!0}),s=n().advancedMode;return Bl(i,s,o)},loadShareString:o=>{const i=lr(o);return i?(n().loadPreset(i),!0):!1}}))),cr=e=>e.isUserInteracting||e.interactionMode!=="none",dn=e=>{var t;if(e.isGizmoDragging||e.interactionMode!=="none"||e.isExporting)return!0;const n=ne.getAll();for(const o of n)if((t=o.interactionConfig)!=null&&t.blockCamera&&o.interactionConfig.activeParam){const i=e[o.id];if(i&&i[o.interactionConfig.activeParam])return!0}return!1},dr=e=>{const n={formula:e.formula,pipeline:e.pipeline,pipelineRevision:e.pipelineRevision,graph:e.graph,msaaSamples:e.msaaSamples,previewMode:e.previewMode,renderMode:e.renderMode,compilerHardCap:e.compilerHardCap,shadows:!0,quality:e.quality};return ne.getAll().forEach(o=>{const i=e[o.id];i&&(n[o.id]=i)}),n},Wl=()=>{const e=z.getState();ka.connect(window.useAnimationStore,z),lt.isPaused=e.isPaused,lt.setPreviewSampleCap(e.sampleCap),lt.onBooted=()=>{const o=z.getState().sceneOffset;if(o){const i={x:o.x,y:o.y,z:o.z,xL:o.xL??0,yL:o.yL??0,zL:o.zL??0};lt.setShadowOffset(i),lt.post({type:"OFFSET_SET",offset:i})}},z.subscribe(t=>t.isPaused,t=>{lt.isPaused=t}),z.subscribe(t=>t.sampleCap,t=>{lt.setPreviewSampleCap(t)}),z.subscribe(t=>{var o;return(o=t.lighting)==null?void 0:o.renderMode},t=>{const o=t===1?"PathTracing":"Direct";z.getState().renderMode!==o&&z.setState({renderMode:o})});let n;z.subscribe(t=>{var o;return(o=t.optics)==null?void 0:o.camType},t=>{var s;if(t===void 0)return;const o=n!==void 0&&n<.5,i=t>.5&&t<1.5;if(o&&i){const r=z.getState();if(!r.activeCameraId){const l=((s=r.optics)==null?void 0:s.camFov)||60;let c=lt.lastMeasuredDistance;(!c||c>=1e3||c<=0)&&(c=r.targetDistance||3.5);const d=c*Math.tan(l*Math.PI/360),f=r.setOptics;typeof f=="function"&&f({orthoScale:d})}}n=t}),Y.on(ge.BUCKET_STATUS,({isRendering:t})=>{z.getState().setIsBucketRendering(t)})};typeof window<"u"&&(window.__store=z);const ct={frameCount:0,lastTime:performance.now(),ref:null,workerFrameCount:0};Wi(()=>{ct.workerFrameCount++});const ql=()=>{const e=performance.now();ct.frameCount++,e-ct.lastTime>=1e3&&(ct.ref&&(ct.ref.innerText=`${ct.workerFrameCount} FPS`),ct.frameCount=0,ct.workerFrameCount=0,ct.lastTime=e)},Vl=()=>{const e=z(r=>r.isPaused),n=z(cr),t=le(r=>r.isCameraInteracting),o=le(r=>r.isScrubbing),i=e&&!n&&!t&&!o,s=M.useRef(null);return M.useEffect(()=>(ct.ref=s.current,()=>{ct.ref===s.current&&(ct.ref=null)}),[]),a.jsx("span",{ref:s,className:`text-[10px] font-mono w-12 text-right transition-colors duration-300 ${i?"text-gray-600":"text-cyan-500/80"}`,title:e?"Rendering Paused (Battery Saver)":"Frames Per Second",children:"-- FPS"})},Xe=e=>{var o;const n=new Set;let t=e;for(;t&&t!==document.body;)(o=t.dataset)!=null&&o.helpId&&t.dataset.helpId.split(/\s+/).forEach(s=>{s&&n.add(s)}),t=t.parentElement;return Array.from(n)},oo=xe(),qa=(e,n,t,o)=>{if(n)return 0;const i=z.getState();i.geometry;const s=i.lighting;if(e.startsWith("camera.unified")){const l=Je()||oo.activeCamera,c=l?l.position:{x:0,y:0,z:0},d=Ye.getUnifiedPosition(c,i.sceneOffset);if(e==="camera.unified.x")return d.x;if(e==="camera.unified.y")return d.y;if(e==="camera.unified.z")return d.z}if(e.startsWith("camera.rotation")){const l=Je()||oo.activeCamera;if(l){const c=new _e().setFromQuaternion(l.quaternion);if(e==="camera.rotation.x")return c.x;if(e==="camera.rotation.y")return c.y;if(e==="camera.rotation.z")return c.z}return 0}if(e.startsWith("lights.")||e.startsWith("lighting.")){const l=e.match(/lighting\.light(\d+)_(\w+)/);if(l){const c=parseInt(l[1]),d=l[2],f=Ct(s,c);if(f){if(d==="intensity")return f.intensity;if(d==="falloff")return f.falloff;if(d==="posX")return f.position.x;if(d==="posY")return f.position.y;if(d==="posZ")return f.position.z}}}if(e.includes(".")){const l=e.split("."),c=l[0],d=l[1];if(ne.get(c)){const f=i[c];if(f){if(f[d]!==void 0){const p=f[d];if(typeof p=="boolean")return p?1:0;if(typeof p=="number")return p}const h=d.match(/^(.+)_(x|y|z)$/);if(h){const p=h[1],u=h[2],g=f[p];if(g&&typeof g=="object"&&u in g)return g[u]}}}}const r=i.coreMath;if(r){if(e==="paramA")return r.paramA;if(e==="paramB")return r.paramB;if(e==="paramC")return r.paramC;if(e==="paramD")return r.paramD;if(e==="paramE")return r.paramE;if(e==="paramF")return r.paramF;if(e==="iterations")return r.iterations}return 0},rt=(e,n,t)=>{if(e.length===0)return 0;if(n<=e[0].frame)return e[0].value;if(n>=e[e.length-1].frame)return e[e.length-1].value;for(let o=0;o<e.length-1;o++){const i=e[o],s=e[o+1];if(n>=i.frame&&n<s.frame)return ot.interpolate(n,i,s,t)}return e[0].value},lh=(e,n,t)=>{if(!e)return{angle:0,length:0};const o=t?-e.x:e.x,i=t?-e.y:e.y,s=Math.atan2(i,o)*(180/Math.PI);let r=0;return n&&Math.abs(n)>1e-9?r=Math.abs(e.x)/Math.abs(n)*100:r=Math.abs(e.x)*10,{angle:s,length:r}},ch=(e,n,t,o)=>{const s=Math.max(-89.9,Math.min(89.9,n))*(Math.PI/180),r=Math.abs(o)<1e-4?10:Math.abs(o),l=(e?-1:1)*(t/100)*r,c=Math.abs(l)*Math.tan(s)*(e?-1:1);return{x:l,y:c}},dh=ot.constrainHandles,uh=ot.calculateSoftFalloff,hh=ot.scaleHandles,fh=(e,n)=>{const t=[],o=Math.PI*2;return e.forEach(i=>{const s=n.tracks[i],r=/rotation|rot|phase|twist/i.test(i)||/param[C-F]/i.test(i);if(s&&s.keyframes.length>1&&r){const l=[...s.keyframes].sort((f,h)=>f.frame-h.frame),d=[...l.map(f=>f.value)];for(let f=1;f<d.length;f++){let h=d[f]-d[f-1];h-=Math.round(h/o)*o,d[f]=d[f-1]+h}l.forEach((f,h)=>{Math.abs(f.value-d[h])>1e-4&&t.push({trackId:i,keyId:f.id,patch:{value:d[h]}})})}}),t},ph=(e,n,t,o=1,i,s=.5,r=.6)=>{const l=[],c=t.length>0,d=new Set(t),f=o<0,h=Math.abs(o);if(h===0)return i&&e.forEach(y=>{const b=i.tracks[y],x=n.tracks[y];!b||!x||b.keyframes.forEach(m=>{const C=x.keyframes.find(k=>k.id===m.id);C&&(!c||d.has(`${y}::${m.id}`))&&Math.abs(C.value-m.value)>1e-9&&l.push({trackId:y,keyId:m.id,patch:{value:m.value}})})}),l;const p=i||n,u=Math.max(.1,h/2.5),g=2*u*u,v=Math.ceil(h);return e.forEach(y=>{const b=p.tracks[y];if(!b||b.keyframes.length<2)return;const x=/rotation|rot|phase|twist/i.test(y)||/param[C-F]/i.test(y),m=[...b.keyframes].sort((k,w)=>k.frame-w.frame);if(f){const k=Math.min(h,5)/5,w=s*(1-k*.9),S=r*(1-k*.8);let j=m[0].value,R=0;const I=m[0].frame,N=m[m.length-1].frame;let E=rt(m,I+1,x)-j;x&&(E>Math.PI?E-=Math.PI*2:E<-Math.PI&&(E+=Math.PI*2)),R=E;for(let D=I;D<=N;D++){let A=rt(m,D,x);if(x){const B=A-j;B>Math.PI?A-=Math.PI*2:B<-Math.PI&&(A+=Math.PI*2)}const T=(A-j)*w,G=-R*S,H=T+G;R+=H,j+=R;const W=m.find(B=>Math.abs(B.frame-D)<.1);if(W)if(!c||d.has(`${y}::${W.id}`))l.push({trackId:y,keyId:W.id,patch:{value:j}});else{j=W.value;let _=rt(m,D+1,x)-j;x&&(_>Math.PI?_-=Math.PI*2:_<-Math.PI&&(_+=Math.PI*2)),R=_}}return}let C=[];if(c){let k=[];m.forEach((w,S)=>{d.has(`${y}::${w.id}`)?k.push(S):k.length>0&&(C.push(k),k=[])}),k.length>0&&C.push(k)}else C.push(m.map((k,w)=>w));C.forEach(k=>{const w=S=>S<0?m[0].value:S>=m.length?m[m.length-1].value:m[S].value;for(let S=0;S<k.length;S++){const j=k[S],R=m[j];let I=0,N=0;for(let L=-v;L<=v;L++){const E=j+L,D=Math.exp(-(L*L)/g);let A=w(E);N+=A*D,I+=D}if(I>0){let L=N/I;const E=n.tracks[y],D=E?E.keyframes.find(A=>A.id===R.id):null;D&&Math.abs(L-D.value)>1e-9&&l.push({trackId:y,keyId:R.id,patch:{value:L}})}}})}),l},mh=(e,n,t=1)=>{const o=[];return e.forEach(i=>{const s=n.tracks[i];if(!s||s.keyframes.length===0)return;const r=[...s.keyframes].sort((h,p)=>h.frame-p.frame),l=Math.ceil(r[0].frame),c=Math.floor(r[r.length-1].frame),d=i.startsWith("camera.rotation"),f=[];for(let h=l;h<=c;h+=t){const p=rt(r,h,d);f.push({id:nt(),frame:h,value:p,interpolation:"Linear",autoTangent:!1,brokenTangents:!1})}f.length>0&&o.push({trackId:i,newKeys:f})}),o},Yl=(e,n,t)=>{const{sequence:o,currentFrame:i,addTrack:s,addKeyframe:r,removeKeyframe:l,isRecording:c,snapshot:d}=le(),f=(()=>{if(!e||!o.tracks[e])return"none";const g=o.tracks[e],v=g.keyframes.find(y=>Math.abs(y.frame-i)<.1);if(v)return Math.abs(v.value-n)>1e-4?"keyed-dirty":"keyed";{const y=/rotation|rot|phase|twist/i.test(e)||/param[C-F]/i.test(e),b=rt(g.keyframes,i,y);return Math.abs(b-n)>.001?"dirty":"partial"}})();return{status:f,toggleKey:()=>{if(e){if(d(),f==="keyed"){const g=o.tracks[e].keyframes.find(v=>Math.abs(v.frame-i)<.1);g&&l(e,g.id)}else o.tracks[e]||s(e,t),r(e,i,n);Y.emit(ge.TRACK_FOCUS,e)}},autoKeyOnChange:g=>{e&&c&&(o.tracks[e]||s(e,t),r(e,i,g))},autoKeyOnDragStart:()=>{e&&c&&(d(),Y.emit(ge.TRACK_FOCUS,e))}}},Yt=({status:e,onClick:n,className:t=""})=>a.jsx("button",{onClick:o=>{o.stopPropagation(),n()},tabIndex:-1,className:`p-0.5 rounded hover:bg-white/10 transition-colors shrink-0 ${e==="keyed"?"text-amber-400":e==="keyed-dirty"||e==="dirty"?"text-red-500":e==="partial"?"text-orange-500 hover:text-amber-300":"text-gray-600 hover:text-amber-200"} ${t}`,title:e==="none"?"Add Keyframe":e==="dirty"?"Add Key (Value mismatch)":e==="keyed-dirty"?"Update Key (Value changed)":e==="partial"?"Add Key (Track exists)":"Remove Key",children:a.jsx(zr,{status:e})}),ur=({value:e,onChange:n,step:t,min:o,max:i,hardMin:s,hardMax:r,highlight:l,overrideText:c,onDragStart:d,onDragEnd:f,sensitivity:h=1,disabled:p=!1})=>a.jsx(yn,{value:e,onChange:n,onDragStart:d,onDragEnd:f,step:t,min:o,max:i,hardMin:s,hardMax:r,variant:"minimal",disabled:p,highlight:l,overrideText:c,showTrack:!1}),yt=e=>{const{handleInteractionStart:n,handleInteractionEnd:t}=z();return a.jsx(ur,{...e,onDragStart:()=>{n("param"),e.onDragStart&&e.onDragStart()},onDragEnd:()=>{t(),e.onDragEnd&&e.onDragEnd()}})},fe=({trackId:e,onKeyToggle:n,defaultValue:t,overrideInputText:o,dataHelpId:i,onChange:s,...r})=>{var w,S,j;const{openContextMenu:l,handleInteractionStart:c,handleInteractionEnd:d}=z(),{status:f,toggleKey:h,autoKeyOnChange:p,autoKeyOnDragStart:u}=Yl(e,r.value??0,r.label),g=[];e&&g.push(e),i&&g.push(i),g.push("ui.slider");const v=g.join(" "),y=R=>{if(r.disabled)return;R.preventDefault(),R.stopPropagation();const I=[];t!==void 0&&I.push({label:"Reset to Default",action:()=>{c("param"),e&&u(),s(t),p(t),d()}});const N=Xe(R.currentTarget);l(R.clientX,R.clientY,I,N)},b=R=>{s(R),p(R)},x=()=>{c("param"),u(),r.onDragStart&&r.onDragStart()},m=()=>{d(),r.onDragEnd&&r.onDragEnd()},C=e&&!r.disabled?a.jsx(Yt,{status:f,onClick:()=>{h(),n&&n()}}):void 0;t!==void 0&&!r.disabled&&(a.Fragment,((r.customMapping?r.customMapping.toSlider(t):t)-(((w=r.customMapping)==null?void 0:w.min)??r.min??0))/((((S=r.customMapping)==null?void 0:S.max)??r.max??1)-(((j=r.customMapping)==null?void 0:j.min)??r.min??0))*100,`${t}`);const k=Ue.useMemo(()=>{if(r.customMapping)return{toDisplay:r.customMapping.toSlider,fromDisplay:r.customMapping.fromSlider,format:Ao,parseInput:R=>{const I=parseFloat(R);return isNaN(I)?null:I}}},[r.customMapping]);return a.jsx(yn,{label:r.label,value:r.value,onChange:b,onDragStart:x,onDragEnd:m,step:r.step??.01,min:r.min,max:r.max,hardMin:r.hardMin,hardMax:r.hardMax,mapping:k,format:o?()=>o:void 0,mapTextInput:r.mapTextInput,variant:"full",showTrack:!0,trackPosition:"below",disabled:r.disabled,highlight:r.highlight||f!=="none",liveValue:r.liveValue,showLiveIndicator:!0,headerRight:C,labelSuffix:r.labelSuffix,onContextMenu:y,dataHelpId:v,className:r.className,defaultValue:t,onReset:()=>{c("param"),e&&u(),s(t),p(t),d()}})};function Ve({label:e,value:n,onChange:t,options:o,helpId:i,color:s="bg-cyan-600",onLfoToggle:r,isLfoActive:l,icon:c,disabled:d=!1,variant:f="default",labelSuffix:h}){const{openContextMenu:p,handleInteractionStart:u,handleInteractionEnd:g}=z(),v=b=>{if(d)return;const x=Xe(b.currentTarget);x.length>0&&(b.preventDefault(),b.stopPropagation(),p(b.clientX,b.clientY,[],x))},y=b=>{u("param"),t(b),g()};return a.jsx(Or,{label:e,value:n,onChange:y,options:o,color:s,onLfoToggle:r,isLfoActive:l,icon:c,disabled:d,variant:f,labelSuffix:h,"data-help-id":i,onContextMenu:v})}const Xl={center:{container:"left-1/2 -translate-x-1/2",arrow:"left-1/2 -translate-x-1/2"},start:{container:"left-0",arrow:"left-4"},end:{container:"right-0",arrow:"right-4"}},Ft=({children:e,align:n="center",width:t="w-52",className:o="",onClose:i,arrow:s=!0})=>{const r=M.useRef(null);M.useEffect(()=>{if(!i)return;const c=f=>{r.current&&!r.current.contains(f.target)&&i()},d=setTimeout(()=>document.addEventListener("mousedown",c),0);return()=>{clearTimeout(d),document.removeEventListener("mousedown",c)}},[i]);const l=Xl[n];return a.jsxs("div",{ref:r,className:`absolute top-full mt-3 ${l.container} ${t} bg-black border border-white/20 rounded-xl p-3 shadow-2xl z-[70] animate-fade-in ${o}`,onClick:c=>c.stopPropagation(),children:[s&&a.jsx("div",{className:`absolute -top-1.5 ${l.arrow} w-3 h-3 bg-black border-t border-l border-white/20 transform rotate-45`}),e]})},Qt=xe();function Zl(e,n,t){const o=Math.floor(e*t),i=Math.floor(n*t),s=o*i,r=s*16,l=s*32,d=(t>1?e*n:s)*8*1.33,f=s*4;return(r+l+d+f)/(1024*1024)}const Ql=()=>{const e=z(),[n,t]=M.useState(0);M.useEffect(()=>Y.on(ge.BUCKET_STATUS,r=>{t(r.progress)}),[]);const o=M.useMemo(()=>{const r=e.dpr||1,l=Math.floor((typeof window<"u"?window.innerWidth:1920)*r),c=Math.floor((typeof window<"u"?window.innerHeight:1080)*r),d=e.bucketUpscale,f=Math.floor(l*d),h=Math.floor(c*d),p=Zl(l,c,d);return{outW:f,outH:h,mb:p}},[e.dpr,e.bucketUpscale]),i=()=>{e.handleInteractionStart("param"),e.isBucketRendering?Qt.stopBucketRender():(e.setBucketUpscale(1),Qt.startBucketRender(!1,{bucketSize:e.bucketSize,bucketUpscale:1,convergenceThreshold:e.convergenceThreshold,accumulation:e.accumulation,samplesPerBucket:e.samplesPerBucket})),e.handleInteractionEnd()},s=()=>{if(e.handleInteractionStart("param"),e.isBucketRendering)Qt.stopBucketRender();else{const r=e.getPreset({includeScene:!0}),l=e.prepareExport();Qt.startBucketRender(!0,{bucketSize:e.bucketSize,bucketUpscale:e.bucketUpscale,convergenceThreshold:e.convergenceThreshold,accumulation:e.accumulation,samplesPerBucket:e.samplesPerBucket},{preset:r,name:e.projectSettings.name,version:l})}e.handleInteractionEnd()};return a.jsx(Ft,{width:"w-72",children:a.jsxs("div",{className:"relative space-y-3","data-help-id":"bucket.render",children:[a.jsxs("div",{className:"flex items-center justify-between border-b border-white/10 pb-2",children:[a.jsx("span",{className:"text-[10px] font-bold text-gray-400",children:"High Quality Render"}),e.isBucketRendering&&a.jsx("button",{onClick:()=>Qt.stopBucketRender(),className:"text-[9px] font-bold px-2 py-0.5 rounded border border-red-500/50 bg-red-500/20 text-red-300 animate-pulse",children:"Stop"})]}),e.isBucketRendering?a.jsxs("div",{className:"bg-white/5 rounded p-2 mb-2",children:[a.jsxs("div",{className:"flex justify-between text-[9px] text-gray-400 mb-1",children:[a.jsx("span",{children:"Progress"}),a.jsxs("span",{children:[n.toFixed(1),"%"]})]}),a.jsx("div",{className:"w-full h-1.5 bg-black rounded-full overflow-hidden",children:a.jsx("div",{className:"h-full bg-cyan-500 transition-all duration-300 ease-linear",style:{width:`${n}%`}})})]}):a.jsxs("div",{className:"flex gap-2 mb-2",children:[a.jsxs("button",{onClick:i,className:"flex-1 py-2 rounded bg-gray-800 hover:bg-white/10 border border-white/10 text-[9px] font-bold text-gray-300 transition-all hover:border-cyan-500/50 hover:text-cyan-400 flex flex-col items-center gap-1",title:"Refine Viewport (1x)",children:[a.jsx(Rt,{}),a.jsx("span",{children:"Refine View"})]}),a.jsxs("button",{onClick:s,className:"flex-1 py-2 rounded bg-cyan-900/30 hover:bg-cyan-800/50 border border-cyan-500/30 text-[9px] font-bold text-cyan-300 transition-all hover:border-cyan-400 flex flex-col items-center gap-1",title:"Render & Save Image",children:[a.jsx(zo,{}),a.jsx("span",{children:"Export Image"})]})]}),a.jsxs("div",{className:`space-y-1 transition-opacity ${e.isBucketRendering?"opacity-50 pointer-events-none":"opacity-100"}`,children:[a.jsx(fe,{label:"Convergence Threshold",value:e.convergenceThreshold,min:.01,max:1,step:.01,onChange:e.setConvergenceThreshold,customMapping:{min:0,max:100,toSlider:r=>(Math.log10(r)+2)/2*100,fromSlider:r=>Math.pow(10,r/100*2-2)},overrideInputText:`${e.convergenceThreshold.toFixed(2)}%`}),a.jsx("p",{className:"text-[8px] text-gray-500 -mt-1 px-1 mb-2",children:"Lower = more samples, higher quality. 0.1%=production, 1%=fast"}),a.jsx(fe,{label:"Max Samples Per Bucket",value:e.samplesPerBucket,min:16,max:1024,step:16,onChange:e.setSamplesPerBucket,overrideInputText:`${e.samplesPerBucket} max`,highlight:e.samplesPerBucket>=256}),a.jsx("p",{className:"text-[8px] text-gray-500 -mt-1 px-1 mb-2",children:"Safety limit. Tiles stop early if converged."}),a.jsxs("div",{className:"pt-2 border-t border-white/5",children:[a.jsx(fe,{label:"Export Scale",value:e.bucketUpscale,min:1,max:8,step:.5,onChange:e.setBucketUpscale,overrideInputText:`${e.bucketUpscale}x`,highlight:e.bucketUpscale>1}),a.jsx("p",{className:"text-[8px] text-gray-500 -mt-1 px-1 mb-1",children:"Resolution multiplier. 2x = 4K from 1080p, 4x = 8K, 8x = 10K+"}),a.jsxs("div",{className:`text-[8px] px-1 mb-2 ${o.mb>1500?"text-red-400":o.mb>500?"text-yellow-400":"text-gray-500"}`,children:[o.outW,"x",o.outH," · ~",o.mb<1024?`${Math.round(o.mb)} MB`:`${(o.mb/1024).toFixed(1)} GB`," VRAM",o.mb>1500&&" (may exceed GPU memory)"]}),a.jsx("label",{className:"text-[9px] font-bold text-gray-400 block mb-1",children:"Bucket Size"}),a.jsx(Ve,{value:e.bucketSize,onChange:e.setBucketSize,options:[{label:"64",value:64},{label:"128",value:128},{label:"256",value:256},{label:"512",value:512}]}),a.jsx("p",{className:"text-[8px] text-gray-500 mt-1 px-1",children:"Smaller = less memory, larger = faster"})]})]})]})})},Kl=xe(),Jl=({isMobileMode:e,vibrate:n})=>{const t=z(),o=le(H=>H.isPlaying),{handleInteractionStart:i,handleInteractionEnd:s,openContextMenu:r}=z(),l=z(cr),c=le(H=>H.isCameraInteracting),d=le(H=>H.isScrubbing),f=t.isPaused&&!c&&!l&&!d,[h,p]=M.useState(!1),[u,g]=M.useState(!1),[v,y]=M.useState(!1),b=M.useRef(null),x=M.useRef(null),m=M.useRef(null),C=M.useRef(null),[k,w]=M.useState(t.projectSettings.name),[S,j]=M.useState(t.projectSettings.version);M.useEffect(()=>{u&&(w(t.projectSettings.name),j(t.projectSettings.version))},[u,t.projectSettings]),M.useEffect(()=>{const H=W=>{b.current&&!b.current.contains(W.target)&&p(!1),m.current&&!m.current.contains(W.target)&&g(!1)};return(h||u)&&window.addEventListener("mousedown",H),()=>window.removeEventListener("mousedown",H)},[h,u]);const R=(H,W)=>{H.preventDefault(),H.stopPropagation(),r(H.clientX,H.clientY,[],W)},I=()=>{if(n(5),t.renderRegion){t.setRenderRegion(null);return}t.interactionMode==="selecting_region"?t.setInteractionMode("none"):t.setInteractionMode("selecting_region")},N=t.lighting,L=(N==null?void 0:N.ptEnabled)!==!1,E=async()=>{L&&(n(5),i("param"),Y.emit("is_compiling","Loading Material..."),await new Promise(H=>setTimeout(H,50)),t.setRenderMode(t.renderMode==="PathTracing"?"Direct":"PathTracing"),s())},D=()=>{t.setProjectSettings({name:k,version:S}),g(!1)},A=()=>{n(5);const H=z.getState().isPaused;t.setIsPaused(!H),Kl.markInteraction()},T=()=>{C.current&&clearTimeout(C.current),y(!0)},G=()=>{C.current=window.setTimeout(()=>{y(!1)},300)};return a.jsxs("div",{className:"flex items-center gap-6",children:[a.jsxs("div",{className:"flex flex-col leading-none relative",children:[a.jsxs("span",{className:"text-xl font-bold tracking-tighter text-white",children:["G",a.jsx("span",{className:"text-cyan-400",children:"M"}),"T"]}),a.jsx("button",{onClick:()=>g(!0),className:"text-[8px] font-mono text-gray-500 hover:text-cyan-300 transition-colors text-left truncate max-w-[120px]",title:"Click to Rename Project",children:t.projectSettings.name}),u&&a.jsx(Ft,{width:"w-48",align:"start",arrow:!1,onClose:()=>g(!1),children:a.jsxs("div",{className:"space-y-3",children:[a.jsxs("div",{children:[a.jsx("label",{className:"text-[9px] text-gray-500 font-bold block mb-1",children:"Project Name"}),a.jsx("input",{type:"text",value:k,onChange:H=>w(H.target.value),className:"w-full bg-gray-900 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500",placeholder:"Enter name...",autoFocus:!0})]}),a.jsxs("div",{className:"flex gap-2",children:[a.jsxs("div",{className:"flex-1",children:[a.jsx("label",{className:"text-[9px] text-gray-500 font-bold block mb-1",children:"Ver"}),a.jsx("div",{className:"h-6 bg-gray-900 border border-white/10 rounded overflow-hidden",children:a.jsx(yt,{value:S,onChange:H=>j(Math.max(1,Math.round(H))),step:1,min:1,max:99})})]}),a.jsx("button",{onClick:D,className:"flex-1 bg-cyan-900/40 hover:bg-cyan-800 text-cyan-300 border border-cyan-500/30 rounded flex items-center justify-center mt-3.5",title:"Save Settings",children:a.jsx(Rt,{})})]})]})})]}),a.jsx("div",{className:"h-6 w-px bg-white/10"}),a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsx(Vl,{}),o&&a.jsxs("div",{className:"flex items-center gap-1.5 px-2 py-0.5 bg-green-900/30 border border-green-500/30 rounded text-[9px] font-bold text-green-400 animate-pulse",children:[a.jsx("svg",{width:"8",height:"8",viewBox:"0 0 24 24",fill:"currentColor",children:a.jsx("path",{d:"M8 5v14l11-7z"})}),a.jsx("span",{children:"Playing"})]}),!e&&a.jsxs("div",{className:"relative",onMouseEnter:T,onMouseLeave:G,ref:x,children:[a.jsx("button",{onClick:A,className:`p-0.5 rounded transition-colors ${f?"text-amber-400 bg-amber-900/30 border border-amber-500/30":"text-gray-600 hover:text-gray-400"}`,title:t.isPaused?"Resume Rendering":"Pause Rendering (Battery Saver)",children:f?a.jsx($r,{}):a.jsx(Br,{})}),v&&a.jsx(Ft,{width:"w-40",children:a.jsxs("div",{className:"mb-1",children:[a.jsx(fe,{label:"Auto-Stop (Samples)",value:t.sampleCap,min:0,max:4096,step:32,onChange:t.setSampleCap,overrideInputText:t.sampleCap===0?"Infinite":t.sampleCap.toFixed(0)}),a.jsx("div",{className:"text-[8px] text-gray-500 text-center mt-1",children:"0 = Never Stop"})]})})]}),a.jsx("div",{className:"w-px h-3 bg-white/10 mx-1"}),a.jsx("button",{onClick:()=>{n(5),i("param"),t.setAccumulation(!t.accumulation),s()},onContextMenu:H=>R(H,["quality.tss"]),className:`p-0.5 rounded transition-colors ${t.accumulation?"text-green-400 bg-green-900/30":"text-gray-600 hover:text-gray-400"}`,title:"TSS (Temporal Anti-Aliasing)",children:a.jsx(vn,{})}),a.jsx("div",{className:"w-px h-3 bg-white/10 mx-1"}),a.jsx("button",{onClick:E,disabled:!L,className:`p-0.5 rounded transition-colors ${L?t.renderMode==="PathTracing"?"text-purple-400 bg-purple-900/30":"text-gray-600 hover:text-gray-400":"text-gray-700 cursor-not-allowed opacity-50"}`,title:L?e?"Enable Path Tracer (Experimental)":"Path Tracer (Global Illumination)":"Path Tracing disabled in Engine Panel",children:a.jsx(Hr,{})}),!e&&a.jsxs(a.Fragment,{children:[a.jsx("button",{onClick:I,className:`p-0.5 rounded transition-colors ${t.interactionMode==="selecting_region"?"text-cyan-400 bg-cyan-900/30 border border-cyan-500/30":t.renderRegion?"text-green-400 bg-green-900/30 border border-green-500/30":"text-gray-600 hover:text-gray-400"}`,title:t.renderRegion?"Clear Region":t.interactionMode==="selecting_region"?"Cancel Selection":"Select Region",children:t.renderRegion?a.jsx(Gr,{}):a.jsx(Oo,{})}),a.jsxs("div",{className:"relative",ref:b,children:[a.jsx("button",{onClick:H=>{H.stopPropagation(),n(5),p(!h)},className:`bucket-toggle-btn p-0.5 rounded transition-colors ${t.isBucketRendering?"text-cyan-400 bg-cyan-900/30 border border-cyan-500/30 animate-pulse":"text-gray-600 hover:text-gray-400"}`,title:"Render!",children:a.jsx(Ur,{})}),h&&a.jsx(Ql,{})]})]})]})]})};let ja=[];const Kt=e=>{const n=e.toUpperCase();ja=[n,...ja.filter(t=>t!==n)].slice(0,3)},Fa=({color:e,onColorChange:n})=>{const[t,o]=M.useState(()=>{const b=bt(e);return b?la(b):{h:0,s:0,v:100}}),i=M.useRef(e.toUpperCase()),{openContextMenu:s,handleInteractionStart:r,handleInteractionEnd:l}=z();M.useEffect(()=>{if(e.toUpperCase()!==i.current){const b=bt(e);if(b){const x=la(b);o(x),i.current=e.toUpperCase()}}},[e]);const c=b=>{const x={...t,...b};o(x);const m=ea(ca(x.h,x.s,x.v));i.current=m,n(m)},d=()=>{Kt(i.current)},f="linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",h=M.useMemo(()=>`linear-gradient(to right, ${ea(ca(t.h,0,t.v))}, ${ea(ca(t.h,100,t.v))})`,[t.h,t.v]),p=M.useMemo(()=>`linear-gradient(to right, #000, ${ea(ca(t.h,t.s,100))})`,[t.h,t.s]),u=b=>{if(b.button!==0&&b.button!==2)return;b.preventDefault(),b.stopPropagation();const x=[{label:"Actions",action:()=>{},isHeader:!0},{label:`Copy Hex (${e})`,action:()=>navigator.clipboard.writeText(e.toUpperCase())},{label:"Paste Hex",action:async()=>{try{let m=await navigator.clipboard.readText();if(m=m.trim(),m.startsWith("#")||(m="#"+m),/^#[0-9A-F]{6}$/i.test(m)||/^#[0-9A-F]{3}$/i.test(m)){if(m.length===4){const w=m[1],S=m[2],j=m[3];m=`#${w}${w}${S}${S}${j}${j}`}const C=m.toUpperCase(),k=bt(C);k&&(r("param"),o(la(k)),i.current=C,n(C),Kt(C),l())}}catch(m){console.warn("Paste failed",m)}}},{label:"Quick Picks",action:()=>{},isHeader:!0},{label:"White (#FFFFFF)",icon:a.jsx("div",{className:"w-3 h-3 rounded-full bg-white border border-gray-600"}),action:()=>{r("param");const m="#FFFFFF";o({h:0,s:0,v:100}),i.current=m,n(m),Kt(m),l()}},{label:"Black (#000000)",icon:a.jsx("div",{className:"w-3 h-3 rounded-full bg-black border border-gray-600"}),action:()=>{r("param");const m="#000000";o({h:0,s:0,v:0}),i.current=m,n(m),Kt(m),l()}}];ja.length>0&&(x.push({label:"History",action:()=>{},isHeader:!0}),ja.forEach(m=>{x.push({label:m,icon:a.jsx("div",{className:"w-3 h-3 rounded-full border border-gray-600",style:{backgroundColor:m}}),action:()=>{r("param");const C=bt(m);C&&(o(la(C)),i.current=m,n(m),Kt(m)),l()}})})),s(b.clientX,b.clientY,x,["ui.colorpicker"])},g=b=>{if(b.target.closest(".hsv-stack")){const x=Xe(b.currentTarget);x.length>0&&(b.preventDefault(),b.stopPropagation(),s(b.clientX,b.clientY,[],x))}},v=()=>r("param"),y=()=>l();return a.jsxs("div",{className:"flex flex-row h-[66px] bg-black/40 border border-white/5 overflow-hidden group/picker relative gradient-interactive-element",onMouseUp:d,"data-help-id":"ui.colorpicker",onContextMenu:g,children:[a.jsx("div",{className:"w-8 shrink-0 relative cursor-pointer border-r border-white/10 hover:brightness-110 active:brightness-125 transition-all bg-gray-800",style:{backgroundColor:e},onMouseDown:u,onContextMenu:u,title:"Color Actions & History (Right Click)",children:a.jsx("div",{className:"absolute inset-0 flex items-center justify-center -rotate-90 whitespace-nowrap text-[10px] font-mono font-bold mix-blend-difference text-white opacity-80 group-hover/picker:opacity-100 transition-opacity",children:e})}),a.jsxs("div",{className:"flex-1 flex flex-col gap-[1px] hsv-stack",children:[a.jsx("div",{className:"relative h-[21.3px]",style:{background:f},children:a.jsx("input",{type:"range",min:"0",max:"360",step:"0.1",value:t.h,onChange:b=>c({h:Number(b.target.value)}),onPointerDown:v,onPointerUp:y,className:"precision-slider absolute inset-0 w-full h-full cursor-crosshair"})}),a.jsx("div",{className:"relative h-[21.3px]",style:{background:h},children:a.jsx("input",{type:"range",min:"0",max:"100",step:"0.1",value:t.s,onChange:b=>c({s:Number(b.target.value)}),onPointerDown:v,onPointerUp:y,className:"precision-slider absolute inset-0 w-full h-full cursor-crosshair"})}),a.jsx("div",{className:"relative h-[21.3px]",style:{background:p},children:a.jsx("input",{type:"range",min:"0",max:"100",step:"0.1",value:t.v,onChange:b=>c({v:Number(b.target.value)}),onPointerDown:v,onPointerUp:y,className:"precision-slider absolute inset-0 w-full h-full cursor-crosshair"})})]})]})},hr=({index:e,value:n,onChange:t,isFixed:o=!1,size:i=140,width:s,height:r})=>{const l=s||i,c=r||i,d=l/2,f=c/2,h=l*.35,p=c*.35,u=M.useRef(null),[g,v]=M.useState(!1),{handleInteractionStart:y,handleInteractionEnd:b}=z(),x=()=>{const _=Ye.getRotationFromEngine();return new Oe(_.x,_.y,_.z,_.w)},{sequence:m,currentFrame:C,isPlaying:k,addTrack:w,addKeyframe:S,removeKeyframe:j,snapshot:R,isRecording:I}=le(),N=()=>{const _=new Oe().setFromEuler(new _e(n.x,n.y,n.z,"YXZ"));return new V(0,0,-1).applyQuaternion(_)},L=()=>{let U=N().clone();o||U.applyQuaternion(x().invert());const O=new V(0,0,-1),P=U.angleTo(O),$=P/(Math.PI/2),F=Math.atan2(U.y,U.x),q=-Math.cos(F)*$*h,Z=Math.sin(F)*$*p;return{x:d+q,y:f+Z,isBacklit:P>Math.PI/2}},E=(_,U)=>{if(!u.current)return;const O=u.current.getBoundingClientRect(),P=O.left+l/2,$=O.top+c/2,F=_-P,q=U-$,Z=F/h,X=q/p,ee=Math.sqrt(Z*Z+X*X),te=Math.atan2(X,Z),re=ee*(Math.PI/2),oe=Math.min(re,Math.PI-.001),me=Math.sin(oe);let de=new V(-me*Math.cos(te),me*Math.sin(te),-Math.cos(oe));o||de.applyQuaternion(x());const ae=new Oe().setFromUnitVectors(new V(0,0,-1),de),ie=new _e().setFromQuaternion(ae,"YXZ");t({x:ie.x,y:ie.y,z:ie.z})},D=L(),A=_=>{_.preventDefault(),_.stopPropagation(),y("param"),v(!0),_.target.setPointerCapture(_.pointerId),E(_.clientX,_.clientY)},T=_=>{g&&E(_.clientX,_.clientY)},G=_=>{if(g){if(v(!1),_.target.releasePointerCapture(_.pointerId),I){const U=`lighting.light${e}_rotX`,O=`lighting.light${e}_rotY`,P=`lighting.light${e}_rotZ`;m.tracks[U]||w(U,`Light ${e+1} Pitch`),m.tracks[O]||w(O,`Light ${e+1} Yaw`),m.tracks[P]||w(P,`Light ${e+1} Roll`),S(U,C,n.x),S(O,C,n.y),S(P,C,n.z)}b()}},H=[`lighting.light${e}_rotX`,`lighting.light${e}_rotY`],W=(()=>{let _=!1,U=!1,O=!1;return H.forEach((P,$)=>{const F=m.tracks[P];if(F){_=!0;const q=F.keyframes.find(Z=>Math.abs(Z.frame-C)<.1);if(q&&(U=!0),!k){const Z=$===0?n.x:n.y,X=q?q.value:rt(F.keyframes,C,$===0||$===1);Math.abs(Z-X)>.001&&(O=!0)}}}),_?U?O?"keyed-dirty":"keyed":O?"dirty":"partial":"none"})(),B=()=>{R(),W==="keyed"?H.forEach(_=>{const U=m.tracks[_],O=U==null?void 0:U.keyframes.find(P=>Math.abs(P.frame-C)<.1);O&&j(_,O.id)}):H.forEach((_,U)=>{m.tracks[_]||w(_,U===0?`Light ${e+1} Pitch`:`Light ${e+1} Yaw`),S(_,C,U===0?n.x:n.y)})};return a.jsxs("div",{className:"flex flex-col items-center mb-2",children:[a.jsxs("div",{className:"w-full flex justify-between items-center mb-1 px-1",children:[a.jsx("label",{className:"text-[9px] font-bold text-gray-500",children:"Heliotrope"}),a.jsx(Yt,{status:W,onClick:B})]}),a.jsxs("div",{ref:u,className:"relative cursor-crosshair touch-none rounded-[30px] border border-white/10 shadow-inner group overflow-hidden",style:{width:l,height:c,background:"radial-gradient(circle at center, #0f172a 0%, #020617 80%)"},onPointerDown:A,onPointerMove:T,onPointerUp:G,title:o?"Headlamp Mode: Light is attached to Camera. Center = Camera Forward.":"World Mode: Light is fixed in space. Center = Direction you are looking.",children:[a.jsxs("div",{className:"absolute inset-0 flex items-center justify-center pointer-events-none opacity-20",children:[a.jsx("div",{className:"border border-cyan-500 rounded-full",style:{width:h*2,height:p*2}}),a.jsx("div",{className:"absolute w-full h-px bg-white/20"}),a.jsx("div",{className:"absolute h-full w-px bg-white/20"})]}),a.jsx("div",{className:"absolute top-1 left-1/2 -translate-x-1/2 text-[7px] text-gray-600 font-bold pointer-events-none",children:"TOP"}),a.jsx("div",{className:"absolute bottom-1 left-1/2 -translate-x-1/2 text-[7px] text-gray-600 font-bold pointer-events-none",children:"BTM"}),a.jsx("div",{className:"absolute left-1 top-1/2 -translate-y-1/2 text-[7px] text-gray-600 font-bold pointer-events-none",children:"L"}),a.jsx("div",{className:"absolute right-1 top-1/2 -translate-y-1/2 text-[7px] text-gray-600 font-bold pointer-events-none",children:"R"}),a.jsx("div",{className:`absolute inset-0 rounded-[30px] border-2 border-red-500/30 pointer-events-none transition-opacity duration-300 ${D.isBacklit?"opacity-100 animate-pulse":"opacity-0"}`}),a.jsx("div",{className:`absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full shadow-[0_0_10px_white] pointer-events-none transition-transform duration-75 ${g?"scale-125 bg-white":"bg-yellow-400"} ${D.isBacklit?"border-2 border-red-500":""}`,style:{left:D.x,top:D.y}})]}),a.jsxs("div",{className:"flex gap-2 w-full mt-2 px-1",children:[a.jsxs("div",{className:"flex-1 bg-black/40 rounded border border-white/10 flex items-center px-2 py-1",children:[a.jsx("span",{className:"text-[8px] text-gray-500 font-bold mr-2",children:"Pitch"}),a.jsx(yt,{value:n.x*180/Math.PI,onChange:_=>t({...n,x:_*Math.PI/180}),step:1,min:-180,max:180,overrideText:(n.x*180/Math.PI).toFixed(1)+"°",onDragStart:()=>y("param"),onDragEnd:()=>b()})]}),a.jsxs("div",{className:"flex-1 bg-black/40 rounded border border-white/10 flex items-center px-2 py-1",children:[a.jsx("span",{className:"text-[8px] text-gray-500 font-bold mr-2",children:"Yaw"}),a.jsx(yt,{value:n.y*180/Math.PI,onChange:_=>t({...n,y:_*Math.PI/180}),step:1,min:-180,max:180,overrideText:(n.y*180/Math.PI).toFixed(1)+"°",onDragStart:()=>y("param"),onDragEnd:()=>b()})]})]})]})},ec=xe(),tc=({index:e,color:n,active:t,type:o,rotation:i,onClick:s,onDragStart:r})=>{const c=(()=>{if(!i)return{x:50,y:50};const f=i.y;return{x:50+Math.sin(f)*35,y:50-Math.cos(f)*35}})(),d=Array.from({length:12}).map((f,h)=>h*30);return a.jsxs("div",{className:`group relative flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-all duration-300 touch-none ${t?"opacity-100 scale-100":"opacity-50 hover:opacity-100 scale-90 hover:scale-100"}`,onPointerDown:f=>{f.button===0&&(f.stopPropagation(),r())},onClick:f=>{f.stopPropagation(),s()},children:[!t&&a.jsxs("div",{className:"absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-black border border-white/20 text-[9px] font-bold text-gray-300 px-2 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50",children:["Drag to Screen",a.jsx("div",{className:"absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black border-t border-l border-white/20 transform rotate-45"})]}),a.jsxs("div",{className:"w-8 h-8 relative",children:[t&&a.jsx("div",{className:"absolute inset-0 rounded-full transition-all duration-300",style:{boxShadow:`0 0 ${o==="Directional"?"12px":"20px"} ${n}`,opacity:o==="Directional"?.6:1,backgroundColor:o==="Directional"?"transparent":n}}),t&&o==="Directional"&&a.jsx("div",{className:"absolute inset-0 pointer-events-none",children:d.map(f=>a.jsx("div",{className:"absolute w-px h-[3px] rounded-full",style:{backgroundColor:n,top:"50%",left:"50%",marginTop:"-1.5px",marginLeft:"-0.5px",transform:`rotate(${f}deg) translateY(-17px)`,boxShadow:`0 0 2px ${n}`}},f))}),a.jsx("div",{className:"absolute inset-0 rounded-full border border-white overflow-hidden z-10 shadow-[inset_0_0_6px_rgba(255,255,255,0.4)] isolate",style:{backgroundColor:o==="Directional"?"#000000":n},children:t&&o==="Directional"&&a.jsx("div",{className:"absolute inset-0 w-full h-full",style:{background:`radial-gradient(circle at ${c.x}% ${c.y}%, ${n} 0%, transparent 65%)`,opacity:1}})}),t&&o!=="Directional"&&a.jsx("div",{className:"absolute inset-0 rounded-full border border-white/50 animate-ping opacity-20 pointer-events-none"})]}),a.jsxs(ze,{variant:"tiny",className:"absolute -bottom-4 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap",children:["L",e+1]})]})},ac=({index:e,onClose:n})=>{const t=z(S=>Ct(S.lighting,e)),o=z(S=>S.updateLight),i=z(S=>S.removeLight),s=z(S=>S.duplicateLight),{handleInteractionStart:r,handleInteractionEnd:l}=z(),{addTrack:c,addKeyframe:d,currentFrame:f,sequence:h,isPlaying:p}=le(),[u,g]=M.useState(t.useTemperature??!1),[v,y]=M.useState(t.temperature??6500);if(!t.visible)return null;const b=()=>{const S=t.fixed;let j=t.position,R=t.rotation;const I=Je();if(I)if(t.type==="Point"){const N=ec.sceneOffset;if(S){const L=new V(j.x,j.y,j.z);L.applyQuaternion(I.quaternion),L.add(I.position),j={x:L.x+N.x+(N.xL??0),y:L.y+N.y+(N.yL??0),z:L.z+N.z+(N.zL??0)}}else{const L=new V(j.x-N.x-(N.xL??0),j.y-N.y-(N.yL??0),j.z-N.z-(N.zL??0));L.sub(I.position),L.applyQuaternion(I.quaternion.clone().invert()),j={x:L.x,y:L.y,z:L.z}}}else{const N=new V(0,0,-1).applyEuler(new _e(R.x,R.y,R.z,"YXZ"));N.applyQuaternion(S?I.quaternion:I.quaternion.clone().invert());const L=new Oe().setFromUnitVectors(new V(0,0,-1),N),E=new _e().setFromQuaternion(L,"YXZ");R={x:E.x,y:E.y,z:E.z}}o({index:e,params:{fixed:!S,position:j,rotation:R}})},x=()=>{["X","Y","Z"].forEach(j=>{const R=`lighting.light${e}_pos${j}`;h.tracks[R]||c(R,`Light ${e+1} Pos ${j}`),d(R,f,t.position[j.toLowerCase()])})},C=(()=>{const S=["X","Y","Z"];let j=!1,R=!1,I=!1;return S.forEach(N=>{const L=`lighting.light${e}_pos${N}`,E=h.tracks[L];if(E){j=!0;const D=E.keyframes.find(A=>Math.abs(A.frame-f)<.1);if(D&&(R=!0),!p){const A=t.position[N.toLowerCase()];let T=0;D?T=D.value:T=rt(E.keyframes,f,!1),Math.abs(T-A)>1e-4&&(I=!0)}}}),j?R?I?"keyed-dirty":"keyed":I?"dirty":"partial":"none"})(),k=`lighting.light${e}`,w=S=>{if(S===0)return"0";if(Math.abs(S)<1)return S.toFixed(3);const j=S.toPrecision(5);return j.includes(".")?j.replace(/\.?0+$/,""):j};return a.jsx(Ft,{width:"w-52",onClose:n,children:a.jsxs("div",{className:"relative space-y-3",children:[a.jsxs("div",{className:"flex items-center justify-between border-b border-white/10 pb-2",children:[a.jsxs("div",{className:"flex items-center gap-2",children:[t.type==="Point"&&a.jsx(Yt,{status:C,onClick:x}),a.jsxs(ze,{children:["Light ",e+1]})]}),a.jsxs("div",{className:"flex items-center gap-1",children:[a.jsx("button",{onClick:S=>{S.stopPropagation(),r("param"),s(e),l()},className:"p-1 text-gray-400 hover:text-cyan-300 hover:bg-cyan-900/20 rounded transition-colors",title:"Duplicate Light",children:a.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[a.jsx("rect",{x:"9",y:"9",width:"13",height:"13",rx:"2"}),a.jsx("path",{d:"M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"})]})}),a.jsx("button",{onClick:S=>{S.stopPropagation(),r("param"),i(e),l()},className:"p-1 text-red-500 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors",title:"Remove Light",children:a.jsx(zt,{})}),a.jsx("button",{onClick:()=>{r("param"),b(),l()},className:`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${t.fixed?"bg-orange-500/20 text-orange-300 border-orange-500/50":"bg-cyan-500/20 text-cyan-300 border-cyan-500/50"}`,children:t.fixed?"ANCHORED":"FLOATING"})]})]}),a.jsxs("div",{className:"space-y-1",children:[t.type==="Directional"&&a.jsx("div",{className:"mb-2",children:a.jsx(hr,{index:e,value:t.rotation,onChange:S=>o({index:e,params:{rotation:S}}),isFixed:t.fixed,width:180,height:110})}),t.intensityUnit==="ev"?a.jsx(fe,{label:"Power (EV)",value:t.intensity,min:-4,max:10,step:.1,onChange:S=>o({index:e,params:{intensity:S}}),mapTextInput:!1,overrideInputText:`${w(t.intensity)} EV`,trackId:`${k}_intensity`}):a.jsx(fe,{label:"Power",value:t.intensity,min:0,max:100,step:.1,onChange:S=>o({index:e,params:{intensity:S}}),customMapping:{min:0,max:100,toSlider:S=>Math.sqrt(S/100)*100,fromSlider:S=>S*S/100},mapTextInput:!1,overrideInputText:w(t.intensity),trackId:`${k}_intensity`}),t.type!=="Directional"&&a.jsx(fe,{label:"Range",value:t.range??0,min:0,max:100,step:.1,onChange:S=>o({index:e,params:{range:S}}),customMapping:{min:0,max:100,toSlider:S=>Math.log10(S+1)/Math.log10(101)*100,fromSlider:S=>Math.pow(101,S/100)-1},mapTextInput:!1,overrideInputText:(t.range??0)<.01?"Infinite":w(t.range??0),trackId:`${k}_falloff`}),t.type!=="Directional"&&a.jsxs("div",{className:"space-y-1",children:[a.jsxs("div",{className:"flex items-center justify-between",children:[a.jsx("label",{className:"text-xs text-gray-400 font-medium",children:"Visible Sphere"}),a.jsx("button",{onClick:()=>{const S=(t.radius??0)>.001;r("param"),o({index:e,params:{radius:S?0:.1}}),l()},className:`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${(t.radius??0)>.001?"bg-cyan-500/20 text-cyan-300 border-cyan-500/50":"bg-white/5 text-gray-400 border-white/20 hover:border-white/40"}`,children:(t.radius??0)>.001?"ON":"OFF"})]}),(t.radius??0)>.001&&a.jsxs(a.Fragment,{children:[a.jsx(fe,{label:"Sphere Radius",value:t.radius??.1,min:.001,max:1,step:.001,onChange:S=>o({index:e,params:{radius:S}}),trackId:`${k}_radius`}),a.jsx(fe,{label:"Edge Softness",value:t.softness??0,min:0,max:2,step:.01,onChange:S=>o({index:e,params:{softness:S}}),trackId:`${k}_softness`})]})]})]}),a.jsxs("div",{className:"pt-2 border-t border-white/10 space-y-2",children:[a.jsxs("div",{className:"flex items-center gap-1 mb-2",children:[a.jsx("button",{onClick:()=>{g(!1),o({index:e,params:{useTemperature:!1}})},className:`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${u?"bg-white/5 text-gray-400 border-white/20 hover:border-white/40":"bg-cyan-500/20 text-cyan-300 border-cyan-500/50"}`,children:"COLOR"}),a.jsx("button",{onClick:()=>{const S=!u;if(g(S),S){const j=eo(v);o({index:e,params:{color:j,useTemperature:!0,temperature:v}})}else o({index:e,params:{useTemperature:!1}})},className:`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${u?"bg-amber-500/20 text-amber-300 border-amber-500/50":"bg-white/5 text-gray-400 border-white/20 hover:border-white/40"}`,children:"TEMPERATURE"})]}),u?a.jsxs("div",{className:"space-y-1",children:[a.jsxs("div",{className:"flex items-center justify-between",children:[a.jsx("label",{className:"text-[10px] text-gray-400 font-medium",children:"Temperature (K)"}),a.jsx("span",{className:"text-[10px] text-gray-300 font-mono",children:v})]}),a.jsx("input",{type:"range",min:1e3,max:1e4,step:100,value:v,onChange:S=>{const j=parseInt(S.target.value);y(j);const R=eo(j);o({index:e,params:{temperature:j,color:R}})},className:"w-full h-1.5 bg-gradient-to-r from-orange-500 via-yellow-200 to-blue-200 rounded-full appearance-none cursor-pointer",style:{background:"linear-gradient(to right, #ff6b35, #ffcc66, #ffffff, #cce5ff, #66b3ff)"}})]}):a.jsx(Fa,{color:t.color,onColorChange:S=>o({index:e,params:{color:S}})}),a.jsxs("div",{className:"flex items-center justify-between pt-1",children:[a.jsx("label",{className:"text-xs text-gray-400 font-medium",children:"Cast Shadows"}),a.jsx("input",{type:"checkbox",checked:t.castShadow,onChange:S=>{r("param"),o({index:e,params:{castShadow:S.target.checked}}),l()},className:"w-3 h-3 accent-cyan-500 bg-gray-800 border-gray-600 rounded cursor-pointer"})]})]})]})})},nc=({targetRef:e,color:n,onChange:t,onClose:o,label:i})=>{const[s,r]=M.useState({x:0,y:0});return M.useLayoutEffect(()=>{if(e.current){const l=e.current.getBoundingClientRect(),c=window.innerWidth,d=window.innerHeight,f=240,h=150;let p=l.right+5,u=l.top;p+f>c&&(p=l.left-f-5),u+h>d&&(u=l.bottom-h),r({x:p,y:u})}},[e]),M.useEffect(()=>{const l=c=>{e.current&&!e.current.contains(c.target)&&(c.target.closest(".picker-popup")||o())};return window.addEventListener("mousedown",l),()=>window.removeEventListener("mousedown",l)},[o,e]),Vt.createPortal(a.jsxs("div",{className:"picker-popup fixed z-[9999] bg-black border border-white/20 p-3 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] w-56 animate-fade-in",style:{left:s.x,top:s.y},onMouseDown:l=>l.stopPropagation(),children:[i&&a.jsx("div",{className:"text-[10px] font-bold text-gray-500 mb-2 text-center",children:i}),a.jsx(Fa,{color:n,onColorChange:t})]}),document.body)},Ra=({color:e,onChange:n,label:t})=>{const[o,i]=M.useState(!1),s=M.useRef(null),r=z(c=>c.openContextMenu),l=c=>{const d=Xe(c.currentTarget);d.unshift("ui.colorpicker"),d.length>0&&(c.preventDefault(),c.stopPropagation(),r(c.clientX,c.clientY,[],d))};return a.jsxs(a.Fragment,{children:[a.jsx("button",{ref:s,onClick:()=>i(!o),onContextMenu:l,className:"w-16 h-6 rounded border border-white/10 shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center overflow-hidden",style:{backgroundColor:e},title:t||"Pick Color",children:a.jsx("div",{className:"text-[8px] font-mono font-bold mix-blend-difference text-white",children:e})}),o&&a.jsx(nc,{targetRef:s,color:e,onChange:n,onClose:()=>i(!1),label:t})]})};function Wt({label:e,value:n,options:t,onChange:o,helpId:i,fullWidth:s,className:r="",selectClassName:l="",labelSuffix:c}){const{openContextMenu:d,handleInteractionStart:f,handleInteractionEnd:h}=z(),p=g=>{const v=Xe(g.currentTarget);v.length>0&&(g.preventDefault(),g.stopPropagation(),d(g.clientX,g.clientY,[],v))},u=g=>{f("param"),o(g),h()};return a.jsx(Wr,{label:e,value:n,options:t,onChange:u,fullWidth:s,className:r,selectClassName:l,labelSuffix:c,"data-help-id":i,onContextMenu:p})}const ht=({axisIndex:e,value:n,min:t,max:o,step:i,onUpdate:s,onDragStart:r,onDragEnd:l,disabled:c,highlight:d,mapping:f,mapTextInput:h,liveValue:p,defaultValue:u,hardMin:g,hardMax:v,customLabel:y})=>{const b=qr[e],x=y||b.label;return a.jsxs("div",{"data-axis-index":e,className:`relative flex-1 h-9 md:h-[26px] overflow-hidden group transition-all duration-150 ${c?"opacity-50 pointer-events-none":""}`,children:[a.jsx("div",{className:`
                    absolute top-0 bottom-0 left-0 w-5 flex items-center justify-center
                    border-r border-white/10 bg-white/[0.05] select-none z-20
                    cursor-pointer hover:bg-white/[0.15] active:bg-white/20 transition-colors
                `,onDoubleClick:m=>{m.preventDefault(),m.stopPropagation(),u!==void 0&&(r==null||r(),s(u),l==null||l())},title:u!==void 0?`Double-click to reset to ${u}`:"No default value",children:a.jsx("span",{className:`text-[10px] font-bold ${b.text} pointer-events-none`,children:x})}),a.jsx("div",{className:"absolute inset-0 left-5",children:a.jsx(yn,{value:n,onChange:s,onDragStart:r,onDragEnd:l,step:i,min:t,max:o,hardMin:g,hardMax:v,mapping:f,mapTextInput:h,disabled:c,highlight:d,liveValue:p,defaultValue:u,variant:"compact",showTrack:!0})})]})},ro=[{label:"X",color:"bg-red-500",text:"text-red-400",border:"group-focus-within:border-red-500/50",hoverBg:"hover:bg-red-500/20",accent:"#ef4444"},{label:"Y",color:"bg-green-500",text:"text-green-400",border:"group-focus-within:border-green-500/50",hoverBg:"hover:bg-green-500/20",accent:"#22c55e"},{label:"Z",color:"bg-blue-500",text:"text-blue-400",border:"group-focus-within:border-blue-500/50",hoverBg:"hover:bg-blue-500/20",accent:"#3b82f6"},{label:"W",color:"bg-purple-500",text:"text-purple-400",border:"group-focus-within:border-purple-500/50",hoverBg:"hover:bg-purple-500/20",accent:"#a855f7"}],ua=({primaryAxis:e,secondaryAxis:n,primaryIndex:t,secondaryIndex:o,primaryValue:i,secondaryValue:s,min:r,max:l,step:c,onUpdate:d,onDragStart:f,onDragEnd:h,disabled:p,onHover:u})=>{const[g,v]=M.useState(!1),y=M.useRef(!1),b=M.useRef(!1),x=M.useRef({x:0,y:0}),m=M.useRef({primary:0,secondary:0}),C=M.useRef(!1),k=M.useRef(!1),w=M.useRef(!1),S=ro[t],j=ro[o],R=()=>{v(!0),u(!0)},I=()=>{y.current||(v(!1),u(!1))},N=T=>{p||T.button!==0&&T.button!==1||(T.preventDefault(),T.stopPropagation(),T.currentTarget.setPointerCapture(T.pointerId),x.current={x:T.clientX,y:T.clientY},m.current={primary:i,secondary:s},C.current=!1,k.current=T.shiftKey,w.current=T.altKey,y.current=!0,b.current=T.button===1,f())},L=T=>{if(p||!y.current||!T.currentTarget.hasPointerCapture(T.pointerId))return;const G=T.clientX-x.current.x,H=T.clientY-x.current.y;if((Math.abs(G)>1||Math.abs(H)>1)&&(C.current=!0),!C.current&&Math.abs(G)<1&&Math.abs(H)<1)return;T.preventDefault(),T.stopPropagation();const W=k.current!==T.shiftKey,B=w.current!==T.altKey;if(W||B){let _=c*.5;k.current&&(_*=10),w.current&&(_*=.1),m.current.primary=m.current.primary+G*_,m.current.secondary=m.current.secondary-H*_,x.current={x:T.clientX,y:T.clientY},k.current=T.shiftKey,w.current=T.altKey}if(b.current){let _=.01;T.shiftKey&&(_*=3),T.altKey&&(_*=.3);const U=1+H*_;let O=m.current.primary*U,P=m.current.secondary*U;!isNaN(O)&&!isNaN(P)&&d(O,P)}else{let _=c*.5;T.shiftKey&&(_*=10),T.altKey&&(_*=.1);let U=m.current.primary+G*_,O=m.current.secondary-H*_;!isNaN(U)&&!isNaN(O)&&d(U,O)}},E=T=>{p||(T.currentTarget.releasePointerCapture(T.pointerId),y.current=!1,b.current=!1,h(),C.current=!1,T.currentTarget.matches(":hover")||(v(!1),u(!1)))},D=T=>{p||(T.preventDefault(),T.stopPropagation(),f(),d(0,0),h())},A=g||y.current;return a.jsxs("div",{className:`
                w-6 h-9 md:h-[26px] flex-shrink-0 cursor-move overflow-hidden
                transition-all duration-150 ease-out relative
                ${A?"bg-white/10 border border-white/30":"bg-white/[0.08] border border-white/5"}
                ${p?"opacity-30 pointer-events-none":""}
            `,onPointerDown:N,onPointerMove:L,onPointerUp:E,onMouseEnter:R,onMouseLeave:I,onDoubleClick:D,title:`Drag: Horizontal=${e.toUpperCase()}, Vertical=${n.toUpperCase()} | Middle-click: Scale both proportionally | Double-click: Reset (Shift=Fast, Alt=Slow)`,children:[A&&a.jsx("div",{className:"absolute inset-0 opacity-30",style:{backgroundImage:"repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.05) 3px, rgba(255,255,255,0.05) 6px)"}}),a.jsxs("div",{className:"relative w-full h-full",children:[a.jsx("div",{className:`
                        absolute bottom-0 left-0 h-[2px] ${S.color}
                        transition-all duration-150
                        ${A?"opacity-60 w-full":"opacity-0 w-0"}
                    `}),a.jsx("div",{className:`
                        absolute bottom-0 left-0 w-[2px] ${j.color}
                        transition-all duration-150
                        ${A?"opacity-60 h-full":"opacity-0 h-0"}
                    `}),a.jsxs("div",{className:`
                        absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        transition-opacity duration-150 pointer-events-none
                        ${A?"opacity-100":"opacity-0"}
                    `,children:[a.jsx("div",{className:`absolute w-2 h-[1px] ${S.color} -translate-x-1/2`}),a.jsx("div",{className:`absolute h-2 w-[1px] ${j.color} -translate-y-1/2`})]}),a.jsx("div",{className:`
                        absolute inset-0 pointer-events-none
                        transition-opacity duration-150
                        ${b.current?"opacity-100":"opacity-0"}
                    `,children:a.jsxs("div",{className:"absolute inset-0 flex items-center justify-center",children:[a.jsx("div",{className:"w-full h-[1px] bg-cyan-400/50 rotate-45"}),a.jsx("div",{className:"absolute w-full h-[1px] bg-cyan-400/50 -rotate-45"})]})})]})]})},io=({azimuth:e,pitch:n,onChange:t,onDragStart:o,onDragEnd:i,disabled:s=!1,size:r=80})=>{const l=M.useRef(null),c=M.useRef(!1),[d,f]=M.useState(!1),[h,p]=M.useState(!1),[u,g]=M.useState(!1),v=M.useRef({x:0,y:0}),y=M.useRef({azimuth:e,pitch:n}),b=M.useRef({azimuth:e,pitch:n}),x=M.useRef(null);M.useEffect(()=>{y.current={azimuth:e,pitch:n}},[e,n]);const k=h?.05:.5,w=r/2,S=r*.38,j=M.useCallback((T,G,H)=>{const W=T/(Math.PI/2)*H,B=-(G/(Math.PI/2))*H;return{x:W,y:B}},[]),R=M.useMemo(()=>j(e,n,S),[e,n,S,j]),I=M.useMemo(()=>{const T=Math.cos(n),G=Math.sin(n),H=Math.cos(e),B=Math.sin(e)*T,_=G,U=-H*T,O=B,P=-_,$=Math.sqrt(O*O+P*P),F=U>0,q=$>.001?Math.min($,1)*S:0,Z=U<=0?1+(1-Math.min($,1))*.5:1-U*.95,X=$>.001?O/$*q:0,ee=$>.001?P/$*q:0;return{x:X,y:ee,isBack:F,length:q,headScale:Z,dirX:B,dirY:_,dirZ:U}},[e,n,S]),N=M.useCallback((T,G,H)=>{const W=T/H*(Math.PI/2),B=-(G/H)*(Math.PI/2);return{azimuth:W,pitch:B}},[]),L=M.useCallback((T,G)=>{let H=T,W=G;u&&x.current&&(x.current==="x"?W=0:H=0);const B=H*k,_=W*k,U=j(y.current.azimuth,y.current.pitch,S),O=U.x+B,P=U.y+_,{azimuth:$,pitch:F}=N(O,P,S);u&&x.current?x.current==="x"?(y.current={azimuth:$,pitch:b.current.pitch},t($,b.current.pitch)):(y.current={azimuth:b.current.azimuth,pitch:F},t(b.current.azimuth,F)):(y.current={azimuth:$,pitch:F},t($,F))},[j,N,t,S,k,u]),E=T=>{s||T.button===0&&(T.preventDefault(),T.stopPropagation(),T.currentTarget.setPointerCapture(T.pointerId),c.current=!0,f(!0),v.current={x:T.clientX,y:T.clientY},y.current={azimuth:e,pitch:n},b.current={azimuth:e,pitch:n},x.current=null,o==null||o(),p(T.altKey),g(T.shiftKey))},D=T=>{if(s||!c.current)return;const G=T.clientX-v.current.x,H=T.clientY-v.current.y;v.current={x:T.clientX,y:T.clientY},p(T.altKey),g(T.shiftKey),u&&!x.current&&(Math.abs(G)>2||Math.abs(H)>2)&&(x.current=Math.abs(G)>Math.abs(H)?"x":"y"),L(G,H)},A=T=>{c.current&&(c.current=!1,f(!1),p(!1),g(!1),x.current=null,i==null||i())};return a.jsxs("div",{ref:l,className:`
                relative rounded-full border border-white/10 bg-black/40
                cursor-crosshair touch-none overflow-hidden
                transition-all duration-200
                ${s?"opacity-50 pointer-events-none":""}
                ${d?"scale-105 border-cyan-500/50":"hover:border-white/20"}
            `,style:{width:r,height:r,touchAction:"none",boxShadow:d?"0 0 20px rgba(34, 211, 238, 0.3)":"none"},onPointerDown:E,onPointerMove:D,onPointerUp:A,onPointerLeave:A,onDoubleClick:T=>{s||(T.preventDefault(),T.stopPropagation(),o==null||o(),t(0,0),i==null||i())},onContextMenu:T=>{},title:"Drag to rotate direction, Double-click to reset",children:[a.jsx("div",{className:"absolute rounded-full border border-white/10 pointer-events-none",style:{width:S*2,height:S*2,left:w-S,top:w-S}}),a.jsx("div",{className:"absolute w-full h-px bg-white/10 pointer-events-none",style:{top:w}}),a.jsx("div",{className:"absolute h-full w-px bg-white/10 pointer-events-none",style:{left:w}}),a.jsx("div",{className:"absolute w-1.5 h-1.5 bg-white/40 rounded-full pointer-events-none",style:{left:w-3,top:w-3}}),a.jsx("div",{className:"absolute pointer-events-none rounded-full transition-transform duration-75",style:{left:w+R.x,top:w+R.y,width:8,height:8,marginLeft:-4,marginTop:-4,background:I.isBack?"#ef4444":"#22d3ee",boxShadow:`0 0 8px ${I.isBack?"#ef4444":"#22d3ee"}`,transform:d?"scale(1.2)":"scale(1)"}}),I.isBack&&a.jsx("div",{className:"absolute inset-0 rounded-full border-2 border-red-500/30 pointer-events-none animate-pulse"}),a.jsxs(a.Fragment,{children:[a.jsxs("svg",{className:"absolute inset-0 pointer-events-none",style:{width:r,height:r},children:[Math.abs(e)>.01&&a.jsxs(a.Fragment,{children:[a.jsx("ellipse",{cx:w,cy:w,rx:S*Math.abs(Math.sin(e)),ry:S,fill:"none",stroke:I.isBack?"#ef4444":"#22d3ee",strokeWidth:"1.5",opacity:I.isBack?.175:.35,clipPath:I.x>0?"url(#longitudeRight)":"url(#longitudeLeft)"}),a.jsx("ellipse",{cx:w,cy:w,rx:S*Math.abs(Math.sin(e)),ry:S,fill:"none",stroke:I.isBack?"#22d3ee":"#ef4444",strokeWidth:"1.5",opacity:I.isBack?.35:.175,clipPath:I.x>0?"url(#longitudeLeft)":"url(#longitudeRight)"})]}),Math.abs(n)>.01&&a.jsxs(a.Fragment,{children:[a.jsx("ellipse",{cx:w,cy:w,rx:S,ry:S*Math.abs(Math.sin(n)),fill:"none",stroke:I.isBack?"#ef4444":"#22d3ee",strokeWidth:"1.5",opacity:I.isBack?.15:.3,clipPath:I.y<0?"url(#latitudeTop)":"url(#latitudeBottom)"}),a.jsx("ellipse",{cx:w,cy:w,rx:S,ry:S*Math.abs(Math.sin(n)),fill:"none",stroke:I.isBack?"#22d3ee":"#ef4444",strokeWidth:"1.5",opacity:I.isBack?.3:.15,clipPath:I.y<0?"url(#latitudeBottom)":"url(#latitudeTop)"})]}),a.jsxs("defs",{children:[a.jsx("clipPath",{id:"longitudeRight",children:a.jsx("rect",{x:w,y:"0",width:w,height:r})}),a.jsx("clipPath",{id:"longitudeLeft",children:a.jsx("rect",{x:"0",y:"0",width:w,height:r})}),a.jsx("clipPath",{id:"latitudeTop",children:a.jsx("rect",{x:"0",y:"0",width:r,height:w})}),a.jsx("clipPath",{id:"latitudeBottom",children:a.jsx("rect",{x:"0",y:w,width:r,height:w})})]}),a.jsx("line",{x1:w,y1:w,x2:w+I.x,y2:w+I.y,stroke:I.isBack?"#ef4444":"#22d3ee",strokeWidth:"2",strokeDasharray:"4 2",opacity:.3+I.length/S*.5}),a.jsx("polygon",{points:"0,-8 -6,4 6,4",fill:I.isBack?"#ef4444":"#22d3ee",opacity:Math.max(.1,.6+(I.headScale-1)*.4),transform:`translate(${w+I.x}, ${w+I.y}) rotate(${Math.atan2(I.y,I.x)*180/Math.PI+90}) scale(${Math.max(.9,.9+I.headScale*.1)}, ${Math.max(.05,I.headScale)})`})]}),d&&a.jsx("div",{className:"absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap",children:a.jsxs("span",{className:"text-[9px] text-cyan-400 font-mono bg-black/60 px-1 rounded",children:[(e*180/Math.PI).toFixed(0),"° / ",(n*180/Math.PI).toFixed(0),"°"]})})]})]})},Va=Math.PI/180,oc=180/Math.PI,rc=["x","y","z","w"],Ya={x:0,y:1,z:2,w:3},ic=e=>{const n=e.length();if(n<1e-9)return{azimuth:0,pitch:0};const t=Math.max(-1,Math.min(1,e.y/n));return{azimuth:Math.atan2(e.x/n,e.z/n),pitch:Math.asin(t)}},sc=(e,n)=>{const t=Math.cos(n);return new V(t*Math.sin(e),Math.sin(n),t*Math.cos(e))},jn=({label:e,value:n,onChange:t,min:o=-1e4,max:i=1e4,step:s=.01,disabled:r=!1,convertRadToDeg:l=!1,mode:c="normal",modeToggleable:d=!1,showLiveIndicator:f=!1,liveValue:h,defaultValue:p,hardMin:u,hardMax:g,axisMin:v,axisMax:y,axisStep:b,onDragStart:x,onDragEnd:m,headerRight:C,showDualAxisPads:k=!0,linkable:w=!1,scale:S})=>{const[j,R]=M.useState(n.clone()),[I,N]=M.useState(null),[L,E]=M.useState(c),[D,A]=M.useState("degrees"),[T,G]=M.useState("degrees"),[H,W]=M.useState(w),B=M.useRef(!1),_=M.useRef(null),U=M.useRef(null);M.useEffect(()=>{E(c)},[c]);const O=z(J=>J.openContextMenu),P="w"in n,$="z"in n,F=L==="rotation",q=L==="toggle",Z=L==="mixed",X=L==="direction"&&$,ee=X?ic(j):{azimuth:0,pitch:0},te=(J,ce)=>{const Me=Math.max(-Math.PI/2,Math.min(Math.PI/2,ce)),Ce=sc(J,Me);de(0,J),de(1,Me),R(Ce),t(Ce)};M.useEffect(()=>{if(B.current)return;const J=1e-4,ce=Math.abs(n.x-j.x),Me=Math.abs(n.y-j.y),Ce=$?Math.abs(n.z-j.z):0,Ke=P?Math.abs(n.w-j.w):0;(ce>J||Me>J||Ce>J||Ke>J)&&R(n.clone())},[n,$,P]);const re=()=>{B.current=!0,_.current=j.clone(),x&&x()},oe=()=>{_.current=null,B.current=!1,m&&m()},me=J=>{if(F)return D==="degrees"?Xt:Nn;if(S==="pi")return T==="pi"?Nn:Xt;if(l)return Xt},Ie=J=>{if(F){const Le=D==="degrees"?60*Math.PI/180:.05;return{min:-2*Math.PI,max:2*Math.PI,step:Le,hardMin:void 0,hardMax:void 0}}const ce=v||{x:o,y:o,z:o},Me=y||{x:i,y:i,z:i},Ce=b||{x:s,y:s,z:s},Ke=S==="pi"&&T==="degrees"?oc:1;return{min:ce[J],max:Me[J],step:(Ce[J]??s)*Ke,hardMin:u,hardMax:g}},de=(J,ce)=>{const Me=U.current;if(!Me)return;const Ce=Me.querySelector(`[data-axis-index="${J}"]`);if(!Ce)return;const Ke=rc[J],Le=me(),sa=Ce.querySelector('[data-role="value"]');sa&&(sa.textContent=Le!=null&&Le.format?Le.format(ce):Ao(ce));const In=Ce.querySelector('[data-role="fill"]');if(In){const Pn=Ie(Ke),Tn=Pn.min??o,En=Pn.max??i;if(Tn!==En){const _r=Vr(ce,Tn,En,Le);In.style.width=`${_r}%`}}},ae=(J,ce)=>{const Me=_.current||j,Ce=Me.clone();if(H&&!F){const Ke=Me[J],Le=ce-Ke;Ce.x=Me.x+Le,Ce.y=Me.y+Le,$&&(Ce.z=Me.z+Le),P&&(Ce.w=Me.w+Le),de(0,Ce.x),de(1,Ce.y),$&&de(2,Ce.z),P&&de(3,Ce.w)}else Ce[J]=ce;R(Ce),t(Ce)},ie=(J,ce,Me,Ce)=>{const Le=(_.current||j).clone();Le[J]=Me,Le[ce]=Ce,de(Ya[J],Me),de(Ya[ce],Ce),R(Le),t(Le)},Re=I==="xy",Ne=I==="xy"||I==="zy",ye=I==="zy"||I==="wz",K=I==="wz",ue=J=>{if(h)return h[J]},Ee=J=>{if(p)return p[J]},Fe=j,Bt={x:Re,y:Ne,z:ye,w:K},at=J=>({axisIndex:Ya[J],value:j[J],...Ie(J),onUpdate:ce=>ae(J,ce),onDragStart:re,onDragEnd:oe,disabled:r,highlight:Bt[J],mapping:me(),mapTextInput:F||S==="pi",liveValue:f?ue(J):void 0,defaultValue:Ee(J)}),pe=[{on:"bg-red-500/30 text-red-300 border-red-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"},{on:"bg-green-500/30 text-green-300 border-green-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"},{on:"bg-blue-500/30 text-blue-300 border-blue-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"},{on:"bg-purple-500/30 text-purple-300 border-purple-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"}],Be=(J,ce,Me)=>{const Ke=j[J]>.5,Le=pe[ce];return a.jsxs("button",{className:`flex items-center justify-center gap-1 text-[10px] font-bold transition-all border ${Ke?Le.on:Le.off} ${r?"opacity-40 pointer-events-none":"cursor-pointer hover:brightness-125"} ${Me||"flex-1"}`,onClick:()=>ae(J,Ke?0:1),disabled:r,children:[Me?null:a.jsx("span",{children:J}),a.jsx("span",{className:`text-[8px] ${Ke?"opacity-80":"opacity-70"}`,children:Ke?"ON":"OFF"})]},J)},gt=()=>d?a.jsx("button",{onClick:()=>E(J=>J==="rotation"?"normal":"rotation"),className:`text-[10px] p-1 rounded transition-colors mr-2 ${L==="rotation"?"text-cyan-400 bg-cyan-500/20":"text-gray-500 hover:text-gray-300"}`,title:L==="rotation"?"Rotation mode (π units)":"Normal mode",children:"⟳"}):null,Se=()=>!w||F?null:a.jsx("button",{onClick:()=>W(J=>!J),className:`p-1 rounded transition-colors mr-2 ${H?"text-cyan-400 bg-cyan-500/20":"text-gray-600 hover:text-gray-400"}`,title:H?"Axes linked (uniform)":"Link axes",children:a.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[a.jsx("path",{d:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"}),a.jsx("path",{d:"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"})]})}),$e=J=>{const ce=[];F&&ce.push({label:"Rotation Units",action:()=>{},isHeader:!0},{label:"Degrees (°)",checked:D==="degrees",action:()=>A("degrees")},{label:"Radians (π)",checked:D==="radians",action:()=>A("radians")}),!F&&S==="pi"&&ce.push({label:"Display Units",action:()=>{},isHeader:!0},{label:"Radians (π)",checked:T==="pi",action:()=>G("pi")},{label:"Degrees (°)",checked:T==="degrees",action:()=>G("degrees")}),$&&(c==="rotation"||c==="axes")&&ce.push({label:"Display Mode",action:()=>{},isHeader:!0},{label:"Azimuth / Pitch (A/P)",checked:L==="rotation",action:()=>E("rotation")},{label:"Per-Axis (X/Y/Z)",checked:L==="axes"||L==="normal",action:()=>E("normal")}),ce.length!==0&&(J.preventDefault(),J.stopPropagation(),O(J.clientX,J.clientY,ce,["ui.vector"]))};return a.jsxs("div",{className:"mb-px animate-slider-entry",children:[e&&a.jsxs("div",{className:"flex items-stretch bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5",children:[a.jsxs("div",{className:"flex-1 flex items-center gap-2 px-2 min-w-0",children:[d&&gt(),C,a.jsx("label",{className:`text-[10px] font-medium tracking-tight select-none flex items-center gap-2 truncate pointer-events-none ${r?"text-gray-600":"text-gray-400"}`,children:e})]}),w&&!F&&a.jsx("div",{className:"flex items-center px-1 border-l border-white/5",children:Se()})]}),a.jsx("div",{className:"relative h-9 md:h-[26px] flex items-center touch-none overflow-hidden rounded-b-sm",style:{touchAction:"none"},onContextMenu:$e,"data-help-id":"ui.vector",children:a.jsx("div",{ref:U,className:"flex gap-px w-full h-full",children:q?a.jsx(a.Fragment,{children:["x","y","z","w"].slice(0,P?4:$?3:2).map((J,ce)=>Be(J,ce))}):Z?a.jsxs(a.Fragment,{children:[Be("x",0,"w-14 flex-shrink-0"),a.jsx(ht,{...at("y"),disabled:r||j.x<.5})]}):X?a.jsxs(a.Fragment,{children:[a.jsx("div",{className:"flex items-center justify-center px-1 flex-shrink-0",children:a.jsx(io,{azimuth:ee.azimuth,pitch:ee.pitch,onChange:(J,ce)=>{te(J,ce)},onDragStart:re,onDragEnd:oe,disabled:r,size:56})}),a.jsx(ht,{axisIndex:0,value:ee.azimuth,min:-Math.PI,max:Math.PI,step:Va,onUpdate:J=>te(J,ee.pitch),onDragStart:re,onDragEnd:oe,disabled:r,mapping:Xt,mapTextInput:!0,customLabel:"Az"}),a.jsx(ua,{primaryAxis:"x",secondaryAxis:"y",primaryIndex:0,secondaryIndex:1,primaryValue:ee.azimuth,secondaryValue:ee.pitch,min:-Math.PI,max:Math.PI,step:Va,onUpdate:(J,ce)=>te(J,ce),onDragStart:re,onDragEnd:oe,disabled:r,onHover:J=>N(J?"xy":null)}),a.jsx(ht,{axisIndex:1,value:ee.pitch,min:-Math.PI/2,max:Math.PI/2,step:Va,onUpdate:J=>te(ee.azimuth,J),onDragStart:re,onDragEnd:oe,disabled:r,mapping:Xt,mapTextInput:!0,customLabel:"Pt"})]}):F?a.jsxs(a.Fragment,{children:[$&&a.jsx(ht,{...at("z"),customLabel:"∠"}),a.jsx("div",{className:"flex items-center justify-center px-1",children:a.jsx(io,{azimuth:j.x,pitch:j.y,onChange:(J,ce)=>{const Me=j.clone();Me.x=J,Me.y=ce,de(0,J),de(1,ce),R(Me),t(Me)},onDragStart:re,onDragEnd:oe,disabled:r,size:56})}),a.jsx("div",{className:"contents",children:a.jsx(ht,{...at("x"),customLabel:"A"})}),a.jsx(ht,{...at("y"),customLabel:"P"})]}):a.jsxs(a.Fragment,{children:[a.jsx("div",{className:"contents",children:a.jsx(ht,{...at("x")})}),k&&a.jsx(ua,{primaryAxis:"x",secondaryAxis:"y",primaryIndex:0,secondaryIndex:1,primaryValue:j.x,secondaryValue:j.y,min:o,max:i,step:s,onUpdate:(J,ce)=>ie("x","y",J,ce),onDragStart:re,onDragEnd:oe,disabled:r,onHover:J=>N(J?"xy":null)}),a.jsx(ht,{...at("y")}),$&&k&&a.jsx(ua,{primaryAxis:"z",secondaryAxis:"y",primaryIndex:2,secondaryIndex:1,primaryValue:Fe.z,secondaryValue:Fe.y,min:o,max:i,step:s,onUpdate:(J,ce)=>ie("z","y",J,ce),onDragStart:re,onDragEnd:oe,disabled:r,onHover:J=>N(J?"zy":null)}),$&&a.jsx(ht,{...at("z")}),P&&k&&a.jsx(ua,{primaryAxis:"x",secondaryAxis:"z",primaryIndex:3,secondaryIndex:2,primaryValue:j.w,secondaryValue:j.z,min:o,max:i,step:s,onUpdate:(J,ce)=>ie("w","z",J,ce),onDragStart:re,onDragEnd:oe,disabled:r,onHover:J=>N(J?"wz":null)}),P&&a.jsx(ht,{...at("w")})]})})})]})},fr=({interactionMode:e="param",trackKeys:n,trackLabels:t,...o})=>{var b,x;const{handleInteractionStart:i,handleInteractionEnd:s}=z(),{sequence:r,isRecording:l,addTrack:c,addKeyframe:d,snapshot:f}=le(),h=M.useRef(o.value);M.useEffect(()=>{h.current=o.value},[(b=o.value)==null?void 0:b.x,(x=o.value)==null?void 0:x.y]);const p=()=>{i(e),l&&n&&(f(),n.forEach((m,C)=>{if(m){const k=t?t[C]:m;r.tracks[m]||c(m,k)}}))},u=()=>{if(l&&n){const m=["x","y"];n.forEach((C,k)=>{if(C){let w=h.current[m[k]];d(C,Math.round(le.getState().currentFrame),w)}})}s()},g=m=>{h.current=new Te(m.x,m.y),o.onChange(new Te(m.x,m.y))},v=()=>{if(!n||n.length===0)return"none";const m=Math.round(le.getState().currentFrame),C=["x","y"];let k=!1,w=!1;return n.forEach((j,R)=>{if(!j)return;const I=r.tracks[j];if(I){const N=I.keyframes.find(L=>Math.abs(L.frame-m)<.5);N&&(k=!0,Math.abs(N.value-h.current[C[R]])>1e-4&&(w=!0))}}),k?w?"keyed-dirty":"keyed":n.some(j=>j&&r.tracks[j])?n.some((R,I)=>{if(!R)return!1;const N=r.tracks[R];if(!N||N.keyframes.length===0)return!1;const L=rt(N.keyframes,m,!1);return Math.abs(L-h.current[C[I]])>.001})?"dirty":"partial":"none"},y=o.disabled?void 0:a.jsx(Yt,{status:v(),onClick:()=>{const m=Math.round(le.getState().currentFrame),C=["x","y"],k=v();f(),k==="keyed"?n==null||n.forEach(w=>{if(!w)return;const S=r.tracks[w];if(S){const j=S.keyframes.find(R=>Math.abs(R.frame-m)<.5);j&&le.getState().removeKeyframe(w,j.id)}}):(n==null||n.forEach((w,S)=>{w&&(r.tracks[w]||c(w,t?t[S]:w),d(w,m,h.current[C[S]]))}),n!=null&&n[0]&&Y.emit(ge.TRACK_FOCUS,n[0]))}});return a.jsx(jn,{...o,value:o.value,onChange:g,onDragStart:p,onDragEnd:u,headerRight:y,showDualAxisPads:!0})},oa=({interactionMode:e="param",trackKeys:n,trackLabels:t,...o})=>{var b,x,m;const{handleInteractionStart:i,handleInteractionEnd:s}=z(),{sequence:r,isRecording:l,addTrack:c,addKeyframe:d,snapshot:f}=le(),h=M.useRef(o.value);M.useEffect(()=>{h.current=o.value},[(b=o.value)==null?void 0:b.x,(x=o.value)==null?void 0:x.y,(m=o.value)==null?void 0:m.z]);const p=()=>{i(e),l&&n&&(f(),n.forEach((C,k)=>{if(C){const w=t?t[k]:C;r.tracks[C]||c(C,w)}}))},u=()=>{if(l&&n){const C=["x","y","z"];n.forEach((k,w)=>{if(k){let S=h.current[C[w]];d(k,Math.round(le.getState().currentFrame),S)}})}s()},g=C=>{h.current=new V(C.x,C.y,C.z??0),o.onChange(new V(C.x,C.y,C.z??0))},v=()=>{if(!n||n.length===0)return"none";const C=Math.round(le.getState().currentFrame),k=["x","y","z"];let w=!1,S=!1;return n.forEach((R,I)=>{if(!R)return;const N=r.tracks[R];if(N){const L=N.keyframes.find(E=>Math.abs(E.frame-C)<.5);L&&(w=!0,Math.abs(L.value-h.current[k[I]])>1e-4&&(S=!0))}}),w?S?"keyed-dirty":"keyed":n.some(R=>R&&r.tracks[R])?n.some((I,N)=>{if(!I)return!1;const L=r.tracks[I];if(!L||L.keyframes.length===0)return!1;const E=rt(L.keyframes,C,!1);return Math.abs(E-h.current[k[N]])>.001})?"dirty":"partial":"none"},y=o.disabled?void 0:a.jsx(Yt,{status:v(),onClick:()=>{const C=Math.round(le.getState().currentFrame),k=["x","y","z"],w=v();f(),w==="keyed"?n==null||n.forEach(S=>{if(!S)return;const j=r.tracks[S];if(j){const R=j.keyframes.find(I=>Math.abs(I.frame-C)<.5);R&&le.getState().removeKeyframe(S,R.id)}}):(n==null||n.forEach((S,j)=>{S&&(r.tracks[S]||c(S,t?t[j]:S),d(S,C,h.current[k[j]]))}),n!=null&&n[0]&&Y.emit(ge.TRACK_FOCUS,n[0]))}});return a.jsx(jn,{...o,value:o.value,onChange:g,onDragStart:p,onDragEnd:u,headerRight:y,showDualAxisPads:!0})},pr=({interactionMode:e="param",trackKeys:n,trackLabels:t,...o})=>{var b,x,m,C;const{handleInteractionStart:i,handleInteractionEnd:s}=z(),{sequence:r,isRecording:l,addTrack:c,addKeyframe:d,snapshot:f}=le(),h=M.useRef(o.value);M.useEffect(()=>{h.current=o.value},[(b=o.value)==null?void 0:b.x,(x=o.value)==null?void 0:x.y,(m=o.value)==null?void 0:m.z,(C=o.value)==null?void 0:C.w]);const p=()=>{i(e),l&&n&&(f(),n.forEach((k,w)=>{if(k){const S=t?t[w]:k;r.tracks[k]||c(k,S)}}))},u=()=>{if(l&&n){const k=["x","y","z","w"];n.forEach((w,S)=>{if(w){let j=h.current[k[S]];d(w,Math.round(le.getState().currentFrame),j)}})}s()},g=k=>{const w=k;h.current=new Nt(w.x,w.y,w.z??0,w.w??0),o.onChange(h.current)},v=()=>{if(!n||n.length===0)return"none";const k=Math.round(le.getState().currentFrame),w=["x","y","z","w"];let S=!1,j=!1;return n.forEach((I,N)=>{if(!I)return;const L=r.tracks[I];if(L){const E=L.keyframes.find(D=>Math.abs(D.frame-k)<.5);E&&(S=!0,Math.abs(E.value-h.current[w[N]])>1e-4&&(j=!0))}}),S?j?"keyed-dirty":"keyed":n.some(I=>I&&r.tracks[I])?n.some((N,L)=>{if(!N)return!1;const E=r.tracks[N];if(!E||E.keyframes.length===0)return!1;const D=rt(E.keyframes,k,!1);return Math.abs(D-h.current[w[L]])>.001})?"dirty":"partial":"none"},y=o.disabled?void 0:a.jsx(Yt,{status:v(),onClick:()=>{const k=Math.round(le.getState().currentFrame),w=["x","y","z","w"],S=v();f(),S==="keyed"?n==null||n.forEach(j=>{if(!j)return;const R=r.tracks[j];if(R){const I=R.keyframes.find(N=>Math.abs(N.frame-k)<.5);I&&le.getState().removeKeyframe(j,I.id)}}):(n==null||n.forEach((j,R)=>{j&&(r.tracks[j]||c(j,t?t[R]:j),d(j,k,h.current[w[R]]))}),n!=null&&n[0]&&Y.emit(ge.TRACK_FOCUS,n[0]))}});return a.jsx(jn,{...o,value:o.value,onChange:g,onDragStart:p,onDragEnd:u,headerRight:y,showDualAxisPads:!0})},lc=({label:e,value:n,min:t,max:o,step:i=.01,onChange:s,size:r=40,color:l="#22d3ee",tooltip:c,unconstrained:d=!1,defaultValue:f,onDragStart:h,onDragEnd:p})=>{const[u,g]=M.useState(!1),v=M.useRef(0),y=M.useRef(0),b=o-t,x=Math.max(t,Math.min(o,n)),m=Math.max(0,Math.min(1,(x-t)/b)),C=-135+m*270,k=r/2-4,w=r/2,S=r/2,j=2*Math.PI*k,R=j,I=j*(1-m*.75),N=A=>{A.preventDefault(),A.stopPropagation(),g(!0),v.current=A.clientY,y.current=n,h&&h(),A.target.setPointerCapture(A.pointerId)},L=A=>{if(!u)return;A.preventDefault();const T=v.current-A.clientY;let G=.005;A.shiftKey&&(G*=5),A.altKey&&(G*=.1);const H=T*G*b;let W=y.current+H;d||(W=Math.max(t,Math.min(o,W))),i&&(W=Math.round(W/i)*i),s(W)},E=A=>{g(!1),p&&p(),A.target.releasePointerCapture(A.pointerId)},D=A=>{A.preventDefault(),A.stopPropagation(),f!==void 0&&(h&&h(),s(f),p&&p())};return a.jsxs("div",{className:"flex flex-col items-center gap-1 select-none touch-none group",title:c||`${n.toFixed(2)}`,onDoubleClick:D,children:[a.jsxs("div",{className:"relative cursor-ns-resize",style:{width:r,height:r},onPointerDown:N,onPointerMove:L,onPointerUp:E,children:[a.jsxs("svg",{width:r,height:r,className:"overflow-visible transform rotate-90",children:[a.jsx("circle",{cx:w,cy:S,r:k,fill:"none",stroke:"#333",strokeWidth:"3",strokeDasharray:j,strokeDashoffset:j*.25,strokeLinecap:"round"}),a.jsx("circle",{cx:w,cy:S,r:k,fill:"none",stroke:u?"#fff":l,strokeWidth:"3",strokeDasharray:R,strokeDashoffset:I,strokeLinecap:"round",className:"transition-colors duration-200"})]}),a.jsx("div",{className:"absolute w-1.5 h-1.5 bg-white rounded-full shadow-sm pointer-events-none",style:{top:"50%",left:"50%",marginTop:-3,marginLeft:-3,transform:`rotate(${C}deg) translate(0, -${k}px)`}})]}),a.jsx("div",{className:"h-3 min-w-[30px] flex items-center justify-center bg-black/40 rounded px-1 border border-white/5 hover:border-white/20 transition-colors",children:a.jsx(ur,{value:n,onChange:s,min:d?void 0:t,max:d?void 0:o,step:i,onDragStart:h,onDragEnd:p})}),e&&a.jsx("span",{className:"text-[8px] text-gray-500 font-bold group-hover:text-gray-300 transition-colors -mt-0.5",children:e})]})},Ht=e=>{const{handleInteractionStart:n,handleInteractionEnd:t}=z();return a.jsx(lc,{...e,onDragStart:()=>{n("param"),e.onDragStart&&e.onDragStart()},onDragEnd:()=>{t(),e.onDragEnd&&e.onDragEnd()}})};class cc{constructor(){Q(this,"components",new Map)}register(n,t){this.components.has(n)&&console.warn(`ComponentRegistry: Overwriting component '${n}'`),this.components.set(n,t)}get(n){return this.components.get(n)}}const ve=new cc,dc={active:"bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.4)]",pending:"bg-amber-500 animate-pulse shadow-[0_0_4px_rgba(245,158,11,0.4)]",off:"bg-red-900",instant:"bg-cyan-500 shadow-[0_0_4px_rgba(6,182,212,0.4)]"},Ia=({status:e,className:n="",title:t})=>a.jsx("span",{className:`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${dc[e]} ${n}`,title:t}),un=({label:e,isActive:n,onToggle:t,numericValue:o,onNumericChange:i,options:s,onOptionChange:r,status:l,disabled:c=!1,hideCheckbox:d=!1,description:f,min:h,max:p,step:u})=>{var N;const[g,v]=M.useState(!1),y=M.useRef(null),[b,x]=M.useState({top:0,x:0,side:"right"}),m=()=>{if(f&&y.current){const L=y.current.getBoundingClientRect(),E=L.left<window.innerWidth/2;x({top:L.top+L.height/2,x:E?L.right+6:window.innerWidth-L.left+6,side:E?"left":"right"}),v(!0)}},C=()=>v(!1),k=l==="pending"?"text-amber-400":n?"text-gray-300":"text-gray-500";let w="",S="";switch(l){case"pending":w="bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)] animate-pulse",S="Pending Compilation (Click Apply)";break;case"runtime":w="bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.5)]",S="Runtime Uniform (Instant Update)";break;case"synced":default:w=n?"bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.4)]":"bg-gray-700",S="Compiled & Active";break}const j=s&&o!==void 0?(N=s.find(L=>L.value==o))==null?void 0:N.label:"",R=u??(o!==void 0&&Number.isInteger(o)?1:.01);let I=1;return h!==void 0&&p!==void 0&&p>h&&(I=(p-h)*.01/R),a.jsxs(a.Fragment,{children:[a.jsxs("div",{ref:y,className:`flex items-center justify-between px-3 py-1.5 border-b border-white/5 hover:bg-white/5 transition-colors ${c?"opacity-30 pointer-events-none":""}`,onMouseEnter:m,onMouseLeave:C,children:[a.jsxs("div",{className:"flex items-center gap-2.5 flex-1 min-w-0",children:[a.jsx("div",{className:`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-300 ${w}`,title:S}),a.jsxs("span",{className:`text-[10px] font-sans font-medium tracking-tight truncate ${k}`,children:[e," ",l==="pending"&&"*"]})]}),a.jsxs("div",{className:"flex items-center gap-3",children:[s&&r?a.jsxs("div",{className:"relative w-20 h-4 bg-black/40 border border-white/10 rounded-sm hover:border-white/30 transition-colors",children:[a.jsx("select",{className:"absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10",value:o,onChange:L=>r(Number(L.target.value)),children:s.map(L=>a.jsx("option",{value:L.value,children:L.label},L.value))}),a.jsxs("div",{className:"absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none",children:[a.jsx("span",{className:"text-[9px] text-cyan-400 font-mono font-medium truncate pr-1",children:j}),a.jsx("span",{className:"text-[6px] text-gray-500",children:"▼"})]})]}):i&&o!==void 0&&a.jsx("div",{className:"w-10 h-4 bg-black/40 border border-white/10 relative overflow-hidden rounded-sm",children:a.jsx(yt,{value:o,onChange:i,step:R,min:h,max:p,sensitivity:I,highlight:n})}),!d&&a.jsx("input",{type:"checkbox",checked:n,onChange:()=>t(!n),className:`w-3 h-3 appearance-none border rounded-[2px] cursor-pointer transition-colors ${n?l==="pending"?"bg-amber-600 border-amber-500":"bg-cyan-600 border-cyan-500":"bg-black/40 border-gray-600 hover:border-gray-400"}`})]})]}),g&&Vt.createPortal(a.jsx("div",{className:"fixed z-[9999] pointer-events-none flex items-center animate-fade-in",style:{top:b.top,[b.side==="left"?"left":"right"]:b.x,transform:"translateY(-50%)"},children:a.jsxs("div",{className:"bg-black text-white text-[9px] px-2 py-1 rounded border border-white/20 shadow-xl whitespace-nowrap",children:[f,b.side==="left"?a.jsxs(a.Fragment,{children:[a.jsx("div",{className:"absolute top-1/2 -left-1 -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-white/20"}),a.jsx("div",{className:"absolute top-1/2 -left-[3px] -translate-y-1/2 border-t-[3px] border-b-[3px] border-r-[3px] border-t-transparent border-b-transparent border-r-black"})]}):a.jsxs(a.Fragment,{children:[a.jsx("div",{className:"absolute top-1/2 -right-1 -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-white/20"}),a.jsx("div",{className:"absolute top-1/2 -right-[3px] -translate-y-1/2 border-t-[3px] border-b-[3px] border-l-[3px] border-t-transparent border-b-transparent border-l-black"})]})]})}),document.body)]})},uc=Ue.lazy(()=>It(()=>import("./AdvancedGradientEditor-DGV7l4o2.js"),__vite__mapDeps([0,1,2,3,4,5]),import.meta.url)),Pa=(e,n,t,o)=>{if(e.or)return e.or.some(r=>Pa(r,n,t,o));if(e.and)return e.and.every(r=>Pa(r,n,t,o));let i=e.param||o,s;if(i&&i.startsWith("$")){const r=i.slice(1);if(r.includes(".")){const l=r.split(".");let c=t;for(const d of l){if(c==null){c=void 0;break}c=c[d]}s=c}else s=t[r]}else if(i)s=n[i];else return!0;if(e.eq===void 0&&e.neq===void 0&&e.gt===void 0&&e.lt===void 0&&e.bool===void 0)return typeof s=="boolean"?s:typeof s=="number"?s>0:!!s;if(e.eq!==void 0||e.neq!==void 0){let r=s;if(typeof s=="object"&&s&&s.getHexString&&(r="#"+s.getHexString()),e.eq!==void 0)return r==e.eq;if(e.neq!==void 0)return r!=e.neq}return e.bool!==void 0?!!s===e.bool:e.gt!==void 0?s>e.gt:e.lt!==void 0?s<e.lt:!0},Jt=(e,n,t,o)=>{if(!e){if(o){const i=n[o];return typeof i=="boolean"?i:typeof i=="number"?i>0:!!i}return!0}return Array.isArray(e)?e.every(i=>Pa(i,n,t,o)):Pa(e,n,t,o)},hc=e=>{const n=e.min??0,t=e.max??1;if(e.scale==="pi")return{min:n/Math.PI,max:t/Math.PI,toSlider:o=>o/Math.PI,fromSlider:o=>o*Math.PI};if(!(!e.scale||e.scale==="linear")){if(e.scale==="square")return{min:0,max:100,toSlider:o=>Math.sqrt((o-n)/(t-n))*100,fromSlider:o=>n+Math.pow(o/100,2)*(t-n)};if(e.scale==="log"){const o=Math.max(1e-6,n);return{min:0,max:100,toSlider:i=>i<=n?0:(Math.log10(Math.max(o,i))-Math.log10(o))/(Math.log10(t)-Math.log10(o))*100,fromSlider:i=>i<=0?n:Math.pow(10,Math.log10(o)+i/100*(Math.log10(t)-Math.log10(o)))}}}},se=({featureId:e,groupFilter:n,className:t,isDisabled:o=!1,disabledParams:i=[],excludeParams:s=[],whitelistParams:r=[],variant:l="default",forcedState:c,onChangeOverride:d,pendingChanges:f})=>{var U;const h=ne.get(e),p=z(O=>O[e]),u=c||p,g=z(O=>O.liveModulations),v=Ue.useRef(z.getState());v.current=z.getState();const y=v.current,b=y,x=z(O=>O.advancedMode),m=z(O=>O.openContextMenu),C=z(O=>O.showHints),[k,w]=M.useState(null),[S,j]=M.useState(new Set),R=M.useMemo(()=>`set${e.charAt(0).toUpperCase()+e.slice(1)}`,[e]),I=(O,P)=>{if(o||i.includes(O))return;if(d){d(O,P);return}const $=h.params[O];if(($==null?void 0:$.onUpdate)==="compile"){z.getState().movePanel("Engine","left"),setTimeout(()=>Y.emit("engine_queue",{featureId:e,param:O,value:P}),50);return}if($!=null&&$.confirmation&&P===!0&&u[O]===!1){w({key:O,value:P,message:$.confirmation});return}const F=b[R];if(F)if($!=null&&$.composeFrom&&P&&typeof P=="object"){const q=$.composeFrom,Z={[q[0]]:P.x,[q[1]]:P.y};"z"in P&&q[2]&&(Z[q[2]]=P.z),"w"in P&&q[3]&&(Z[q[3]]=P.w),F(Z)}else F({[O]:P})},N=()=>{if(!k)return;if(d){d(k.key,k.value),w(null);return}const O=b[R];O&&(Y.emit("is_compiling","Optimizing Shader..."),setTimeout(()=>{O({[k.key]:k.value}),w(null)},50))},L=O=>{if(o)return;const P=Xe(O.currentTarget);P.length>0&&(O.preventDefault(),O.stopPropagation(),m(O.clientX,O.clientY,[],P))},E=(O,P)=>{if(!(o||i.includes(P))&&O.target.files&&O.target.files[0]){const $=new FileReader;$.onload=F=>{var q;(q=F.target)!=null&&q.result&&I(P,F.target.result)},$.readAsDataURL(O.target.files[0])}};if(!h||!u)return null;const D=(O,P)=>{var q,Z,X,ee,te,re,oe,me,Ie,de;let $;if(P.composeFrom){const ae=P.composeFrom;ae.length===3?$=new V(u[ae[0]]??0,u[ae[1]]??0,u[ae[2]]??0):ae.length===2&&($=new Te(u[ae[0]]??0,u[ae[1]]??0))}else $=u[O]??P.default;const F=o||i.includes(O);if(l==="dense"){let ae="runtime";if(P.onUpdate==="compile"&&(ae=f&&f[`${e}.${O}`]!==void 0?"pending":"synced"),P.type==="boolean")return a.jsx(un,{label:P.label,description:P.description,isActive:!!$,onToggle:ie=>I(O,ie),status:ae,disabled:F});if(P.type==="float"||P.type==="int")return a.jsx(un,{label:P.label,description:P.description,isActive:!0,onToggle:()=>{},numericValue:$,onNumericChange:ie=>I(O,ie),options:P.options,onOptionChange:P.options?ie=>I(O,ie):void 0,status:ae,disabled:F,hideCheckbox:!0,step:P.step,min:P.min,max:P.max})}if(P.type==="color"){let ae=$;return typeof $=="object"&&$.getHexString&&(ae="#"+$.getHexString()),P.layout==="embedded"||P.parentId?a.jsx("div",{className:`mb-px pr-1 ${F?"opacity-30 pointer-events-none":""}`,children:a.jsx(Fa,{color:ae,onColorChange:ie=>I(O,ie)})}):a.jsxs("div",{className:`flex items-center justify-between px-3 py-1 bg-gray-800/20 mb-px ${F?"opacity-30 pointer-events-none":""}`,children:[a.jsx(ze,{children:P.label}),a.jsx(Ra,{color:ae,onChange:ie=>I(O,ie),label:P.label})]})}if(P.type==="boolean"){const ae=P.onUpdate==="compile"?a.jsx("span",{className:"ml-1.5",title:$?"Compiled & Active":"Compiled Off — toggle to queue change",children:a.jsx(Ia,{status:$?"active":"off"})}):null;return P.ui==="checkbox"?a.jsx("div",{className:F?"opacity-30 pointer-events-none":"",children:a.jsx(Ve,{label:P.label,value:$,onChange:ie=>I(O,ie),disabled:F,variant:"dense",labelSuffix:ae})}):a.jsx("div",{children:a.jsx(Ve,{label:P.label,value:$,onChange:ie=>I(O,ie),options:P.options,disabled:F,labelSuffix:ae})})}if(P.type==="float"||P.type==="int"){const ae=P.onUpdate==="compile"?a.jsx("span",{className:"ml-1.5",title:"Compile-time setting — changes queue to Engine Panel",children:a.jsx(Ia,{status:"active"})}):null;if(P.options)return a.jsx("div",{className:`mb-px ${F?"opacity-30 pointer-events-none":""}`,children:a.jsx(Wt,{label:P.label,value:$,onChange:Fe=>I(O,Fe),options:P.options,fullWidth:!0,labelSuffix:ae})});if(P.ui==="knob")return a.jsx("div",{className:P.layout==="half"?"flex flex-col items-center justify-center py-2":"flex justify-center p-2",children:a.jsx(Ht,{label:P.label,value:$,min:P.min??0,max:P.max??1,step:P.step,onChange:Fe=>I(O,Fe),color:$>(P.min??0)?"#22d3ee":"#444",size:40})});const ie=hc(P);let Re=P.format?P.format($):void 0;P.scale==="pi"&&(Re=`${($/Math.PI).toFixed(2)}π`);let Ne=P.max??1;P.dynamicMaxRef&&u[P.dynamicMaxRef]!==void 0&&(Ne=u[P.dynamicMaxRef]);const ye=`${e}.${O}`,K=g[ye],ue=$!==P.default||!!P.condition,Ee=P.condition?"!animate-none !overflow-visible":"";return a.jsx("div",{children:a.jsx(fe,{label:P.label,value:$,min:P.min??0,max:Ne,step:P.step??.01,onChange:Fe=>I(O,Fe),highlight:ue,trackId:ye,liveValue:K,defaultValue:P.default,customMapping:ie,overrideInputText:Re,mapTextInput:P.scale==="pi",disabled:F,labelSuffix:ae,className:Ee})})}if(P.type==="vec2"){const ae=($==null?void 0:$.x)??((q=P.default)==null?void 0:q.x)??0,ie=($==null?void 0:$.y)??((Z=P.default)==null?void 0:Z.y)??0;return a.jsx("div",{className:`mb-px ${F?"opacity-30 pointer-events-none":""}`,children:a.jsx(fr,{label:P.label,value:new Te(ae,ie),min:P.min??-1,max:P.max??1,onChange:Re=>I(O,{x:Re.x,y:Re.y}),mode:P.mode,scale:P.scale,linkable:P.linkable})})}if(P.type==="vec3"){const ae=($==null?void 0:$.x)??((X=P.default)==null?void 0:X.x)??0,ie=($==null?void 0:$.y)??((ee=P.default)==null?void 0:ee.y)??0,Re=($==null?void 0:$.z)??((te=P.default)==null?void 0:te.z)??0,Ne=new V(ae,ie,Re),ye=P.composeFrom?P.composeFrom.map(ue=>`${e}.${ue}`):[`${e}.${O}_x`,`${e}.${O}_y`,`${e}.${O}_z`],K=P.composeFrom?void 0:[`${P.label} X`,`${P.label} Y`,`${P.label} Z`];return a.jsx("div",{className:`mb-px ${F?"opacity-30 pointer-events-none":""}`,children:a.jsx(oa,{label:P.label,value:Ne,min:P.min??-10,max:P.max??10,step:P.step,onChange:ue=>I(O,ue),disabled:F,trackKeys:ye,trackLabels:K,mode:P.mode,scale:P.scale,linkable:P.linkable})})}if(P.type==="vec4"){const ae=($==null?void 0:$.x)??((re=P.default)==null?void 0:re.x)??0,ie=($==null?void 0:$.y)??((oe=P.default)==null?void 0:oe.y)??0,Re=($==null?void 0:$.z)??((me=P.default)==null?void 0:me.z)??0,Ne=($==null?void 0:$.w)??((Ie=P.default)==null?void 0:Ie.w)??0,ye=new Nt(ae,ie,Re,Ne),K=P.composeFrom?P.composeFrom.map(Ee=>`${e}.${Ee}`):[`${e}.${O}_x`,`${e}.${O}_y`,`${e}.${O}_z`,`${e}.${O}_w`],ue=P.composeFrom?void 0:[`${P.label} X`,`${P.label} Y`,`${P.label} Z`,`${P.label} W`];return a.jsx("div",{className:`mb-px ${F?"opacity-30 pointer-events-none":""}`,children:a.jsx(pr,{label:P.label,value:ye,min:P.min??-10,max:P.max??10,step:P.step,onChange:Ee=>I(O,Ee),disabled:F,trackKeys:K,trackLabels:ue,mode:P.mode,scale:P.scale,linkable:P.linkable})})}if(P.type==="image"){const ae=((de=P.linkedParams)==null?void 0:de.colorSpace)||"colorSpace",ie=h.params[ae],Re=u[ae],Ne=()=>{if(ie&&typeof Re=="number"){const K=(Re+1)%3;I(ae,K)}},ye=Re===1?"LIN":Re===2?"ACES":"sRGB";return a.jsx("div",{className:`mb-px ${F?"opacity-30 pointer-events-none":""}`,children:a.jsxs("div",{className:"bg-gray-800/30 border border-white/5 text-center overflow-hidden relative group",children:[a.jsx("input",{type:"file",accept:"image/*,.hdr,.exr",onChange:K=>E(K,O),className:"hidden",id:`file-input-${O}`}),a.jsx("label",{htmlFor:`file-input-${O}`,className:"block bg-cyan-900/40 hover:bg-cyan-800/60 text-cyan-300 w-full py-2 text-xs font-bold transition-colors cursor-pointer",children:$?"Replace Texture":P.label}),ie&&a.jsx("div",{className:"absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-bold text-gray-500 bg-black/50 px-1.5 py-0.5 rounded cursor-pointer hover:text-white hover:bg-cyan-900/80 transition-colors select-none",onClick:K=>{K.preventDefault(),Ne()},title:"Input Color Profile: sRGB / Linear / ACES",children:ye})]})})}return P.type==="gradient"?a.jsx("div",{className:`pr-1 ${F?"opacity-30 pointer-events-none":""}`,children:a.jsx(M.Suspense,{fallback:null,children:a.jsx(uc,{value:$,onChange:ae=>I(O,ae)})})}):null},A=(O,P=!1)=>{var me,Ie;const $=h.params[O];if(!$||$.hidden||s.includes(O)||!Jt($.condition,u,y,$.parentId)||$.isAdvanced&&!x)return null;const F=D(O,$),q=Object.keys(h.params).filter(de=>h.params[de].parentId===O),Z=q.map(de=>A(de)).filter(Boolean);(me=h.customUI)==null||me.forEach(de=>{if(de.parentId!==O||n&&de.group!==n||!Jt(de.condition,u,y,de.parentId))return;const ae=ve.get(de.componentId);ae&&Z.push(a.jsx("div",{children:a.jsx(ae,{featureId:e,sliceState:u,actions:b,...de.props})},`custom-${de.componentId}`))});const X=P?"flex-1 min-w-0":"flex flex-col",ee=((Ie=h.customUI)==null?void 0:Ie.some(de=>de.parentId===O))??!1,te=q.length>0||ee,re=C&&$.description&&!o&&l!=="dense"&&($.type!=="boolean"||(u==null?void 0:u[O]));re&&te&&Z.unshift(a.jsx("div",{children:a.jsx("p",{className:"px-3 py-1.5 text-[9px] text-gray-600 leading-tight bg-white/[0.06] hover:text-gray-300 transition-colors cursor-default",children:$.description})},`desc-${O}`));const oe=Z.length>0;return a.jsxs("div",{className:`w-full ${X} ${te?"rounded-t-sm relative":""}`,children:[te&&a.jsx("div",{className:`absolute inset-0 bg-white/[0.06] rounded-t-sm pointer-events-none transition-opacity ${oe?"opacity-100":"opacity-0"}`}),F,re&&!te&&a.jsx("p",{className:"px-3 py-1.5 text-[9px] text-gray-600 leading-tight bg-white/[0.06] hover:text-gray-300 transition-colors cursor-default",children:$.description}),Z.length>0&&a.jsxs("div",{className:"flex flex-col",children:[Z.map((de,ae)=>{const ie=ae===Z.length-1;return a.jsxs("div",{className:"flex",children:[a.jsx("div",{className:`w-2 shrink-0 self-stretch border-l border-white/20 bg-white/[0.12] ${ie?"border-b border-b-white/20 rounded-bl-lg":""}`}),a.jsxs("div",{className:`flex-1 min-w-0 relative ${ie?"border-b border-b-white/20":""}`,children:[a.jsx("div",{className:"absolute inset-0 bg-black/20 pointer-events-none z-10"}),de]})]},ae)}),a.jsx("div",{className:"h-2",style:{background:"linear-gradient(to bottom, transparent, rgba(255,255,255,0.08))"}})]})]},O)},T=Object.keys(h.params).filter(O=>h.params[O].parentId?!1:r&&r.length>0?r.includes(O):n?h.params[O].group===n:!0),G=O=>{const P=[];for(let $=0;$<O.length;$++){const F=O[$],q=h.params[F];if(!(q.hidden||s.includes(F)||!Jt(q.condition,u,y))){if(q.layout==="half"&&l!=="dense"){let Z=O[$+1],X=Z?h.params[Z]:null;if(X&&X.layout==="half"&&!X.hidden&&!s.includes(Z)&&Jt(X.condition,u,y)){P.push(a.jsxs("div",{className:"flex gap-0.5 mb-px",children:[A(F,!0),A(Z,!0)]},`${F}-${Z}`)),$++;continue}}P.push(A(F))}}return P},H=O=>{j(P=>{const $=new Set(P);return $.has(O)?$.delete(O):$.add(O),$})},W=h.groups,B=W&&!n&&!(r!=null&&r.length)&&Object.values(W).some(O=>O.collapsible),_=[];if(B&&W){const O=[],P={},$=[];for(const F of T){const q=h.params[F].group;q&&W[q]?(P[q]||(P[q]=[],O.push(q)),P[q].push(F)):$.push(F)}_.push(...G($));for(const F of O){const q=W[F],Z=P[F];S.has(F);const X=G(Z);if(!X.every(ee=>ee===null))if(q.collapsible){const ee=X.filter(Boolean);_.push(a.jsx(Dt,{label:q.label,open:!S.has(F),onToggle:()=>H(F),defaultOpen:!0,variant:"panel",children:a.jsxs("div",{className:"flex flex-col",children:[ee.map((te,re)=>a.jsx("div",{children:te},re)),a.jsx("div",{className:"ml-[9px] border-b border-white/10 rounded-bl mb-0.5"})]})},`group-${F}`))}else _.push(...X)}}else _.push(...G(T));return(U=h.customUI)==null||U.forEach(O=>{if(r&&r.length>0||O.parentId||n&&O.group!==n||!Jt(O.condition,u,y))return;const P=ve.get(O.componentId);P&&_.push(a.jsx("div",{className:`flex flex-col mb-px ${o?"grayscale opacity-30 pointer-events-none":""}`,children:a.jsx(P,{featureId:e,sliceState:u,actions:b,...O.props})},`custom-${O.componentId}`))}),a.jsxs("div",{className:`flex flex-col relative ${t||""}`,onContextMenu:L,children:[_,k&&a.jsx("div",{className:"absolute inset-0 z-50 animate-pop-in",children:a.jsxs("div",{className:"bg-black/95 border border-white/20 rounded shadow-2xl overflow-hidden h-full flex flex-col",children:[a.jsxs("div",{className:"flex items-center gap-2 p-2 border-b border-white/10 bg-white/5",children:[a.jsx(qt,{}),a.jsx(ze,{color:"text-gray-300",children:"Warning"})]}),a.jsxs("div",{className:"p-3 flex-1 flex flex-col justify-between",children:[a.jsx("p",{className:"text-[10px] text-gray-400 leading-relaxed whitespace-pre-wrap",children:k.message}),a.jsxs("div",{className:"flex gap-1 mt-4",children:[a.jsx("button",{onClick:()=>w(null),className:"flex-1 py-1.5 bg-gray-800 text-gray-300 text-[9px] font-bold rounded border border-white/10 hover:bg-gray-700 transition-colors",children:"Cancel"}),a.jsx("button",{onClick:N,className:"flex-1 py-1.5 bg-cyan-900/50 text-cyan-300 text-[9px] font-bold rounded border border-cyan-500/30 hover:bg-cyan-900 transition-colors",children:"Confirm"})]})]})]})})]})},fc=()=>{const e=z(r=>{var l;return(l=r.lighting)==null?void 0:l.shadows}),n=z(r=>{var l;return(l=r.lighting)==null?void 0:l.ptStochasticShadows}),t=z(r=>{var l;return(l=r.lighting)==null?void 0:l.areaLights}),o=z(r=>r.setLighting),i=z(r=>r.handleInteractionStart),s=z(r=>r.handleInteractionEnd);return a.jsx(Ft,{width:"w-52",children:a.jsxs("div",{className:"relative space-y-2",children:[a.jsxs("div",{className:"flex items-center justify-between border-b border-white/10 pb-2 px-1",children:[a.jsx(ze,{children:"Shadows"}),a.jsxs("div",{className:"flex items-center gap-1.5",children:[n&&a.jsx("button",{onClick:()=>{i("param"),o({areaLights:!t}),s()},className:`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${t?"bg-purple-500/20 text-purple-300 border-purple-500/50":"bg-gray-800 text-gray-500 border-gray-600"}`,title:"Toggle stochastic area light shadows",children:"Area"}),a.jsx("button",{onClick:()=>{i("param"),o({shadows:!e}),s()},className:`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${e?"bg-yellow-500/20 text-yellow-300 border-yellow-500/50":"bg-gray-800 text-gray-500 border-gray-600"}`,children:e?"ON":"OFF"})]})]}),e&&a.jsx("div",{className:"space-y-1",children:a.jsx(se,{featureId:"lighting",groupFilter:"shadows"})})]})})},mt=new V,ta=new V,Pt=new V,so=5e4;function pc(){const e=na(),n=aa();return!e||!n?null:{camera:e,canvas:n,width:n.clientWidth,height:n.clientHeight}}function mr(e,n,t,o){if(ta.copy(e).applyMatrix4(n.matrixWorldInverse),ta.z>-5e-5)return null;mt.copy(e).project(n);const i=t/2,s=o/2,r=mt.x*i+i,l=-mt.y*s+s;return Math.abs(r)>so||Math.abs(l)>so?null:{x:r,y:l,z:ta.z,isBehindCamera:!1}}function st(e,n,t,o){return mt.copy(e).project(n),{x:(mt.x*.5+.5)*t,y:(-mt.y*.5+.5)*o,behind:mt.z>1}}function mc(e,n,t,o){return Pt.set(e.x,e.y,e.z),n?Pt.applyQuaternion(t.quaternion).add(t.position):(Pt.x-=o.x+o.xL,Pt.y-=o.y+o.yL,Pt.z-=o.z+o.zL),Pt.clone()}function gr(e,n,t){const o=e.x-n.x+(e.xL-n.xL),i=e.y-n.y+(e.yL-n.yL),s=e.z-n.z+(e.zL-n.zL);return t?t.set(o,i,s):new V(o,i,s)}function Xa(e,n,t,o,i,s,r){const l=Pt.copy(e).addScaledVector(n,t);if(ta.copy(l).applyMatrix4(o.matrixWorldInverse),ta.z>-5e-5)return null;mt.copy(l).project(o);const c=mt.x*s/2+s/2,d=-(mt.y*r/2)+r/2;return{x:c-i.x,y:d-i.y}}const gc=.15,xc=.4,We={X:"#ff4444",Y:"#44ff44",Z:"#4444ff",Hover:"#ffffff",PlaneXY:"#4444ff",PlaneXZ:"#44ff44",PlaneYZ:"#ff4444"},bc=Ue.forwardRef((e,n)=>{const{id:t,color:o,onDragStart:i,children:s}=e,r=M.useRef(null),[l,c]=M.useState(null),d=M.useRef(new V),f=u=>c({part:u}),h=()=>c(null),p=(u,g)=>{i(u,g,d.current.clone())};return Ue.useImperativeHandle(n,()=>({hide:()=>{r.current&&(r.current.style.display="none")},update:(u,g,v,y,b)=>{const x=r.current;if(!x)return;d.current.copy(u),g.updateMatrixWorld();const m=mr(u,g,v,y);if(!m){x.style.display="none";return}x.style.display="flex",x.style.transform=`translate3d(${m.x}px, ${m.y}px, 0)`;const k=u.distanceTo(g.position)*gc,w=new V(1,0,0),S=new V(0,1,0),j=new V(0,0,1);b&&(w.applyQuaternion(b),S.applyQuaternion(b),j.applyQuaternion(b));const R=Xa(u,w,k,g,m,v,y),I=Xa(u,S,k,g,m,v,y),N=Xa(u,j,k,g,m,v,y),L=(D,A)=>{x.querySelectorAll(`.${D}`).forEach(G=>{A?(G.setAttribute("x2",String(A.x)),G.setAttribute("y2",String(A.y)),G.setAttribute("visibility","visible")):G.setAttribute("visibility","hidden")})};L("axis-x-line",R),L("axis-y-line",I),L("axis-z-line",N);const E=(D,A,T)=>{const G=x.querySelector(`.${D}`);if(G)if(A&&T){const H=xc,W=A.x*H,B=A.y*H,_=T.x*H,U=T.y*H,O=W+_,P=B+U;G.setAttribute("d",`M0,0 L${W},${B} L${O},${P} L${_},${U} Z`),G.setAttribute("visibility","visible")}else G.setAttribute("visibility","hidden")};E("plane-xy",R,I),E("plane-xz",R,N),E("plane-yz",I,N)}})),a.jsxs("div",{ref:r,className:"absolute flex items-center justify-center w-0 h-0 pointer-events-auto",style:{display:"none",willChange:"transform"},children:[a.jsxs("svg",{className:"absolute overflow-visible pointer-events-none",style:{left:0,top:0},children:[a.jsxs("defs",{children:[a.jsx("marker",{id:`arrow-${t}-x`,markerWidth:"6",markerHeight:"6",refX:"5",refY:"3",orient:"auto",children:a.jsx("path",{d:"M0,0 L0,6 L6,3 z",fill:(l==null?void 0:l.part)==="axis-x"?We.Hover:We.X})}),a.jsx("marker",{id:`arrow-${t}-y`,markerWidth:"6",markerHeight:"6",refX:"5",refY:"3",orient:"auto",children:a.jsx("path",{d:"M0,0 L0,6 L6,3 z",fill:(l==null?void 0:l.part)==="axis-y"?We.Hover:We.Y})}),a.jsx("marker",{id:`arrow-${t}-z`,markerWidth:"6",markerHeight:"6",refX:"5",refY:"3",orient:"auto",children:a.jsx("path",{d:"M0,0 L0,6 L6,3 z",fill:(l==null?void 0:l.part)==="axis-z"?We.Hover:We.Z})})]}),a.jsx("path",{className:"plane-xy cursor-move pointer-events-auto transition-opacity duration-150",fill:(l==null?void 0:l.part)==="plane-xy"?We.Hover:We.PlaneXY,fillOpacity:"0.3",stroke:"none",onPointerDown:u=>p(u,"plane-xy"),onPointerEnter:()=>f("plane-xy"),onPointerLeave:h}),a.jsx("path",{className:"plane-xz cursor-move pointer-events-auto transition-opacity duration-150",fill:(l==null?void 0:l.part)==="plane-xz"?We.Hover:We.PlaneXZ,fillOpacity:"0.3",stroke:"none",onPointerDown:u=>p(u,"plane-xz"),onPointerEnter:()=>f("plane-xz"),onPointerLeave:h}),a.jsx("path",{className:"plane-yz cursor-move pointer-events-auto transition-opacity duration-150",fill:(l==null?void 0:l.part)==="plane-yz"?We.Hover:We.PlaneYZ,fillOpacity:"0.3",stroke:"none",onPointerDown:u=>p(u,"plane-yz"),onPointerEnter:()=>f("plane-yz"),onPointerLeave:h}),a.jsxs("g",{onPointerEnter:()=>f("axis-z"),onPointerLeave:h,children:[a.jsx("line",{className:"axis-z-line pointer-events-none transition-all duration-150",x1:"0",y1:"0",x2:"0",y2:"0",stroke:(l==null?void 0:l.part)==="axis-z"?We.Hover:We.Z,strokeWidth:"2",markerEnd:`url(#arrow-${t}-z)`}),a.jsx("line",{className:"axis-z-line cursor-pointer pointer-events-auto",x1:"0",y1:"0",x2:"0",y2:"0",stroke:"rgba(0,0,0,0)",strokeWidth:"12",onPointerDown:u=>p(u,"axis-z")})]}),a.jsxs("g",{onPointerEnter:()=>f("axis-y"),onPointerLeave:h,children:[a.jsx("line",{className:"axis-y-line pointer-events-none transition-all duration-150",x1:"0",y1:"0",x2:"0",y2:"0",stroke:(l==null?void 0:l.part)==="axis-y"?We.Hover:We.Y,strokeWidth:"2",markerEnd:`url(#arrow-${t}-y)`}),a.jsx("line",{className:"axis-y-line cursor-pointer pointer-events-auto",x1:"0",y1:"0",x2:"0",y2:"0",stroke:"rgba(0,0,0,0)",strokeWidth:"12",onPointerDown:u=>p(u,"axis-y")})]}),a.jsxs("g",{onPointerEnter:()=>f("axis-x"),onPointerLeave:h,children:[a.jsx("line",{className:"axis-x-line pointer-events-none transition-all duration-150",x1:"0",y1:"0",x2:"0",y2:"0",stroke:(l==null?void 0:l.part)==="axis-x"?We.Hover:We.X,strokeWidth:"2",markerEnd:`url(#arrow-${t}-x)`}),a.jsx("line",{className:"axis-x-line cursor-pointer pointer-events-auto",x1:"0",y1:"0",x2:"0",y2:"0",stroke:"rgba(0,0,0,0)",strokeWidth:"12",onPointerDown:u=>p(u,"axis-x")})]}),a.jsx("circle",{cx:"0",cy:"0",r:"6",fill:o,stroke:"white",strokeWidth:"2",className:`cursor-move pointer-events-auto transition-all duration-150 ${(l==null?void 0:l.part)==="free"?"stroke-cyan-400 r-[8px]":""}`,onPointerDown:u=>p(u,"free"),onPointerEnter:()=>f("free"),onPointerLeave:h})]}),s]})}),hn={index:-1},yc=(e,n,t)=>mc(e.position,!!e.fixed,n,t),lo=(e,n,t,o)=>(n.updateMatrixWorld(),mr(e,n,t,o)),vc=({isMobileMode:e,vibrate:n})=>{var L;const t=z(),o=t.lighting,{openContextMenu:i,handleInteractionStart:s,handleInteractionEnd:r}=z(),[l,c]=M.useState(null),[d,f]=M.useState(null),[h,p]=M.useState(!1),[u,g]=M.useState(!1),v=M.useRef(null),y=M.useRef(null),b=M.useRef(null),x=M.useRef(null);M.useEffect(()=>(hn.index=l??d??-1,()=>{hn.index=-1}),[l,d]),M.useEffect(()=>{const E=D=>{const A=D.target;y.current&&!y.current.contains(A)&&!A.closest(".shadow-toggle-btn")&&p(!1),e&&d!==null&&!A.closest(".light-orb-wrapper")&&f(null),u&&x.current&&!x.current.contains(A)&&!A.closest(".expand-trigger")&&g(!1)};return document.addEventListener("mousedown",E),document.addEventListener("touchstart",E),()=>{document.removeEventListener("mousedown",E),document.removeEventListener("touchstart",E)}},[d,e,u]);const m=(E,D)=>{E.preventDefault(),E.stopPropagation(),i(E.clientX,E.clientY,[],D)},C=(E,D)=>{E.preventDefault(),E.stopPropagation();const A=Ct(t.lighting,D),T=[{label:`Light ${D+1}`,isHeader:!0},{label:"Enabled",checked:A.visible,action:()=>{s("param"),t.updateLight({index:D,params:{visible:!A.visible}}),r()}},{label:"Type",isHeader:!0},{label:"Point",checked:A.type==="Point",action:()=>{s("param"),t.updateLight({index:D,params:{type:"Point"}}),r()}},{label:"Directional (Sun)",checked:A.type==="Directional",action:()=>{s("param"),t.updateLight({index:D,params:{type:"Directional"}}),r()}},{label:"Intensity Unit",isHeader:!0},{label:"Raw (Linear)",checked:(A.intensityUnit??"raw")==="raw",action:()=>{if(s("param"),A.intensityUnit==="ev"){const G=Math.pow(2,A.intensity);t.updateLight({index:D,params:{intensityUnit:"raw",intensity:Math.round(G*100)/100}})}else t.updateLight({index:D,params:{intensityUnit:"raw"}});r()}},{label:"Exposure (EV)",checked:A.intensityUnit==="ev",action:()=>{if(s("param"),(A.intensityUnit??"raw")==="raw"){const G=A.intensity>0?Math.max(-4,Math.min(10,Math.log2(A.intensity))):0;t.updateLight({index:D,params:{intensityUnit:"ev",intensity:Math.round(G*10)/10}})}else t.updateLight({index:D,params:{intensityUnit:"ev"}});r()}},{label:"Falloff Curve",isHeader:!0},{label:"Quadratic (Smooth)",checked:(A.falloffType??"Quadratic")==="Quadratic",action:()=>{s("param"),t.updateLight({index:D,params:{falloffType:"Quadratic"}}),r()}},{label:"Linear (Artistic)",checked:A.falloffType==="Linear",action:()=>{s("param"),t.updateLight({index:D,params:{falloffType:"Linear"}}),r()}}];i(E.clientX,E.clientY,T,["panel.light"])},k=E=>{const D=Ct(t.lighting,E);if(!e){n(5),s("param"),t.updateLight({index:E,params:{visible:!D.visible}}),r();return}D.visible?d!==E?(n(5),f(E)):(n([10,30,10]),s("param"),t.updateLight({index:E,params:{visible:!1}}),r(),f(null)):(n(10),s("param"),t.updateLight({index:E,params:{visible:!0}}),r(),f(null))},w=(E,D)=>{e||D.nativeEvent.pointerType==="touch"||(v.current&&clearTimeout(v.current),c(E))},S=()=>{e||(v.current=window.setTimeout(()=>{c(null)},400))},j=E=>{n(5);const D=I[E];t.setDraggedLight((D==null?void 0:D.id)??null),e||(f(null),c(null))},R=()=>{t.addLight()},I=((L=t.lighting)==null?void 0:L.lights)||[],N=E=>{const D=I[E];return D?a.jsxs("div",{className:"relative light-orb-wrapper flex justify-center w-8 h-8",onMouseEnter:A=>w(E,A),onMouseLeave:S,onContextMenu:A=>C(A,E),children:[a.jsx(tc,{index:E,color:D.color,active:D.visible,type:D.type,rotation:D.rotation,onClick:()=>k(E),onDragStart:()=>j(E)}),t.draggedLightIndex!==D.id&&(l===E||d===E)&&a.jsx(ac,{index:E})]},E):E<ke?a.jsx("div",{className:"flex justify-center items-center w-8 h-8",children:a.jsx("button",{onClick:R,className:"w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-gray-500 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-white/5 transition-all",title:"Add Light",children:a.jsx(Ea,{})})},E):a.jsx("div",{className:"w-8 h-8"},E)};return a.jsxs("div",{ref:b,className:"absolute left-1/2 -translate-x-1/2 flex items-center bg-white/5 pr-2 pl-6 py-1.5 rounded-full border border-white/5 shadow-inner z-[65]",children:[a.jsxs("div",{className:"relative",children:[a.jsxs("div",{className:`flex items-center gap-6 transition-opacity duration-200 ${u?"opacity-0 pointer-events-none":"opacity-100"}`,children:[[0,1,2].map(E=>N(E)),a.jsx("button",{onClick:()=>{n(5),g(!0)},className:"expand-trigger w-5 h-5 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors ml-[-8px]",title:"Expand Light Studio",children:a.jsx(ia,{})})]}),u&&a.jsx("div",{ref:x,className:"absolute top-[-20px] left-[-20px] bg-black/95 border border-white/20 p-5 rounded-2xl shadow-2xl animate-fade-in z-[80]",children:a.jsxs("div",{className:"grid grid-cols-3 gap-6",children:[Array.from({length:8}).map((E,D)=>N(D)),a.jsx("div",{className:"flex justify-center items-center w-8 h-8",children:a.jsx("button",{onClick:()=>g(!1),className:"w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-colors",title:"Collapse",children:a.jsx(Yr,{})})})]})})]}),a.jsx("div",{className:"h-6 w-px bg-white/10 mx-4"}),a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsxs("div",{className:"relative",ref:y,children:[a.jsx("button",{onClick:E=>{E.stopPropagation(),n(5),p(!h)},onContextMenu:E=>m(E,["shadows"]),className:`shadow-toggle-btn p-2 rounded-full border transition-all duration-300 ${o!=null&&o.shadows?"bg-yellow-500/10 border-yellow-500/50 text-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.1)]":"bg-transparent border-transparent text-gray-600 hover:text-gray-300 hover:bg-white/5"}`,title:"Shadow Settings",children:a.jsx(Xr,{})}),h&&a.jsx(fc,{})]}),a.jsx("button",{onClick:()=>{n(5),s("param"),t.setShowLightGizmo(!t.showLightGizmo),r()},onContextMenu:E=>m(E,["ui.viewport"]),className:`p-2 rounded-full border transition-all duration-300 ${t.showLightGizmo?"bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]":"bg-transparent border-transparent text-gray-600 hover:text-gray-300 hover:bg-white/5"}`,children:a.jsx(Zr,{})})]})]})},xr=(e,n,t,o)=>{const i=e.replace(/[^a-zA-Z0-9 \-_]/g,"").trim().replace(/\s+/g,"_")||"Untitled",s=`v${n}`;return`${["GMT",i,s].join("_")}.${t}`},co=xe(),wc=({isMobileMode:e,vibrate:n,btnBase:t,btnActive:o,btnInactive:i})=>{const s=z(),{movePanel:r}=s,[l,c]=M.useState(!1),[d,f]=M.useState(!1),h=M.useRef(null),p=M.useRef(null),u=async()=>{if(co.isBooted){c(!1);try{const x=await co.captureSnapshot();if(f(!0),!x){console.error("Snapshot generation returned null.");return}const m=s.getPreset({includeScene:!0}),C=$o(m),k=s.prepareExport(),w=xr(s.projectSettings.name,k,"png");try{const S=await Zo(x,"FractalData",C),j=URL.createObjectURL(S),R=document.createElement("a");R.download=w,R.href=j,R.click(),URL.revokeObjectURL(j),n(50)}catch(S){console.error("Metadata injection failed, saving raw image",S);const j=URL.createObjectURL(x),R=document.createElement("a");R.download=w,R.href=j,R.click(),URL.revokeObjectURL(j)}}catch(x){console.error("Snapshot failed",x)}finally{f(!1)}}},g=x=>{x.stopPropagation(),e?(n(5),c(!l)):u()},v=()=>{e||(h.current&&clearTimeout(h.current),c(!0))},y=()=>{e||(h.current=window.setTimeout(()=>{c(!1)},200))},b=()=>{n(5),r("Camera Manager","left"),c(!1)};return M.useEffect(()=>{if(!e||!l)return;const x=m=>{const C=m.target;p.current&&!p.current.contains(C)&&!C.closest(".camera-menu-trigger")&&c(!1)};return document.addEventListener("mousedown",x),document.addEventListener("touchstart",x),()=>{document.removeEventListener("mousedown",x),document.removeEventListener("touchstart",x)}},[l,e]),a.jsxs(a.Fragment,{children:[d&&a.jsx("div",{className:"fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in",children:a.jsxs("div",{className:"bg-gray-900 border border-cyan-500/50 rounded-xl px-6 py-4 shadow-2xl flex items-center gap-3",children:[a.jsx("div",{className:"w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"}),a.jsx("span",{className:"text-cyan-300 font-bold text-sm",children:"Capturing..."})]})}),a.jsxs("div",{className:"relative",ref:p,onMouseEnter:v,onMouseLeave:y,children:[a.jsx("button",{onClick:g,className:`camera-menu-trigger ${t} ${l?o:i}`,title:e?"Camera Menu":"Click: Take Snapshot / Hover: Camera Menu",children:a.jsx(Dn,{})}),l&&a.jsxs(Ft,{width:"w-48",align:"end",children:[a.jsx("div",{className:"px-2 py-1 text-[10px] font-bold text-gray-500 border-b border-white/10 mb-1",children:"Camera Tools"}),a.jsxs("div",{className:"space-y-1",children:[a.jsxs("button",{onClick:()=>{n(5),s.undoCamera()},disabled:s.undoStack.length===0,className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/10 disabled:opacity-30 text-xs text-gray-300 text-left",children:[a.jsxs("span",{className:"flex items-center gap-2",children:[a.jsx(Qr,{})," Undo Move"]}),a.jsx("kbd",{className:"text-[8px] text-gray-500 bg-gray-800 px-1 rounded",children:"Ctrl+Shift+Z"})]}),a.jsxs("button",{onClick:()=>{n(5),s.redoCamera()},disabled:s.redoStack.length===0,className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/10 disabled:opacity-30 text-xs text-gray-300 text-left",children:[a.jsxs("span",{className:"flex items-center gap-2",children:[a.jsx(Kr,{})," Redo Move"]}),a.jsx("kbd",{className:"text-[8px] text-gray-500 bg-gray-800 px-1 rounded",children:"Ctrl+Shift+Y"})]}),a.jsxs("button",{onClick:()=>{n(30),s.resetCamera(),s.setShowLightGizmo(!1)},className:"w-full flex items-center gap-2 p-2 rounded hover:bg-white/10 text-xs text-gray-300 text-left",children:[a.jsx(Jr,{})," Reset Position"]}),a.jsx("div",{className:"h-px bg-white/10 my-1"}),a.jsxs("button",{onClick:b,className:"w-full flex items-center gap-2 p-2 rounded hover:bg-white/10 text-xs text-cyan-300 text-left",children:[a.jsx(vn,{})," Camera Manager"]}),a.jsx("div",{className:"h-px bg-white/10 my-1"}),a.jsxs("button",{onClick:u,className:"w-full flex items-center gap-2 p-2 rounded hover:bg-cyan-900/50 text-xs text-cyan-400 font-bold text-left",title:"Save PNG with embedded scene data",children:[a.jsx(Dn,{})," Take Snapshot"]})]})]})]})]})},uo=xe(),Sc=({isMobileMode:e,vibrate:n,btnBase:t,btnActive:o,btnInactive:i})=>{var W;const s=z(),r=s,[l,c]=M.useState(!1),[d,f]=M.useState(!1),[h,p]=M.useState(""),[u,g]=M.useState(null),[v,y]=M.useState(null),b=M.useRef(null),x=M.useRef(null),m=ne.getMenuFeatures(),C=ne.getExtraMenuItems(),k=or(s),w=k.charAt(0).toUpperCase()+k.slice(1);M.useEffect(()=>{const B=uo.gpuInfo;if(B)p(B);else{const _=setTimeout(()=>{p(uo.gpuInfo||"Generic WebGL Device")},3e3);return()=>clearTimeout(_)}},[]),M.useEffect(()=>{const B=_=>{const U=_.target;if(b.current&&!b.current.contains(U)){if(U.closest(".portal-dropdown-content")||U.closest(".t-dropdown"))return;c(!1),f(!1)}};return l&&(document.addEventListener("mousedown",B),document.addEventListener("touchstart",B)),()=>{document.removeEventListener("mousedown",B),document.removeEventListener("touchstart",B)}},[l]);const S=B=>{B.stopPropagation(),n(5),c(!l)},j=()=>{const B=s.prepareExport(),_=s.projectSettings,U=s.getPreset(),O=$o(U),P=new Blob([O],{type:"text/plain"}),$=URL.createObjectURL(P),F=document.createElement("a");F.href=$,F.download=xr(_.name,B,"gmf"),F.click(),URL.revokeObjectURL($)},R=()=>{var B;return(B=x.current)==null?void 0:B.click()},I=async B=>{var U;const _=(U=B.target.files)==null?void 0:U[0];if(_){Y.emit("is_compiling","Processing..."),await new Promise(O=>setTimeout(O,50));try{let O="";if(_.type==="image/png"){const F=await Qo(_,"FractalData");if(F)O=F;else throw new Error("No Fractal Data found in this image.")}else O=await _.text();const{def:P,preset:$}=La(O);P&&!we.get(P.id)&&(we.register(P),Y.emit(ge.REGISTER_FORMULA,{id:P.id,shader:P.shader})),s.loadPreset($),n(50),c(!1)}catch(O){console.error("Load Failed:",O),Y.emit("is_compiling",!1),y("Error!"),setTimeout(()=>y(null),2e3),alert("Could not load preset. "+(O instanceof Error?O.message:String(O)))}B.target.value=""}},N=!!((W=we.get(s.formula))!=null&&W.importSource),L=()=>{if(N){g("N/A (Imported)"),setTimeout(()=>g(null),2500);return}const B=4096;let _=s.getShareString({includeAnimations:!0}),U="";if(_.length>B){const P=s.getShareString({includeAnimations:!1});P.length<_.length&&P.length<B?(_=P,U=" (Anims Removed)"):U=" (Long URL)"}const O=`${window.location.origin}${window.location.pathname}#s=${_}`;navigator.clipboard.writeText(O).then(()=>{g(`Copied!${U}`),n(50),setTimeout(()=>g(null),2500)})},E=(B,_,U)=>{var F,q;const O=ne.get(B);if(((F=O==null?void 0:O.engineConfig)==null?void 0:F.mode)==="compile"&&((q=O.params[_])==null?void 0:q.onUpdate)==="compile"){s.movePanel("Engine","left"),setTimeout(()=>Y.emit("engine_queue",{featureId:B,param:_,value:U}),50);return}const P=`set${B.charAt(0).toUpperCase()+B.slice(1)}`,$=s[P];if($&&($({[_]:U}),O!=null&&O.tabConfig)){const Z=O.tabConfig.label;B==="engineSettings"?U&&s.movePanel(Z,"left"):U?s.floatTab(Z):s.dockTab(Z)}},D=(B,_=!1)=>{const U=r[B.id||B.featureId];if(!U)return null;const O=!!U[B.toggleParam];B.id;const P=B.id==="audio"?"text-green-400":"text-cyan-400";if(_){const F={Code:a.jsx(wa,{}),Info:a.jsx(Ho,{})},q=B.icon?F[B.icon]:null;return a.jsxs("button",{onClick:Z=>{Z.stopPropagation(),n(5),E(B.featureId,B.toggleParam,!O),c(!1)},className:`w-full flex items-center justify-between p-2 rounded transition-colors group ${O?"bg-white/10 text-cyan-400":"hover:bg-white/5 text-gray-300"}`,children:[a.jsx("span",{className:"text-xs font-bold",children:B.label}),q]},`${B.featureId}-${B.toggleParam}`)}const $=O?B.id==="audio"?"bg-green-500/30 text-green-300 border-green-500/40":"bg-cyan-500/30 text-cyan-300 border-cyan-500/40":"bg-white/[0.04] text-gray-600 border-white/5";return a.jsxs("div",{className:"flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer animate-fade-in-left",onClick:()=>{n(5),E(B.id,B.toggleParam,!O)},children:[a.jsx("span",{className:`text-xs font-bold ${O?P:"text-gray-300"}`,children:B.label}),a.jsx("span",{className:`px-2 py-0.5 text-[8px] font-bold rounded-sm border transition-all ${$}`,children:O?"ON":"OFF"})]},B.id)},A=B=>{n(10),Y.emit("is_compiling","Switching Profile..."),setTimeout(()=>{s.applyPreset({mode:B.toLowerCase(),actions:s})},10)},T=m.filter(B=>!B.advancedOnly),G=m.filter(B=>B.advancedOnly),H=C.filter(B=>B.advancedOnly);return a.jsxs(a.Fragment,{children:[!e&&a.jsxs(a.Fragment,{children:[a.jsxs("button",{onClick:L,className:`${t} ${i} relative`,title:N?"Share unavailable for imported formulas":"Copy Share Link",children:[a.jsx(en,{}),u&&a.jsx("div",{className:"absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-green-600 text-white text-[9px] font-bold rounded whitespace-nowrap animate-fade-in",children:u})]}),a.jsx("button",{onClick:j,className:`${t} ${i}`,title:"Save Preset (GMF)",children:a.jsx(tn,{})}),a.jsxs("button",{onClick:R,className:`${t} ${i} relative`,title:"Load Preset (GMF, JSON, or PNG)",children:[a.jsx(an,{}),v&&a.jsx("div",{className:"absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-blue-600 text-white text-[9px] font-bold rounded whitespace-nowrap animate-fade-in",children:v})]})]}),a.jsx("input",{ref:x,type:"file",accept:".gmf,.json,.png",className:"hidden",onChange:I}),a.jsxs("div",{className:"relative",ref:b,children:[a.jsx("button",{onClick:S,className:`${t} ${l?o:i}`,children:a.jsx(ei,{})}),l&&a.jsx(Ft,{width:"w-64",align:"end",className:"p-2 custom-scroll overflow-y-auto max-h-[85vh]",onClose:()=>S({}),children:a.jsxs("div",{className:"space-y-1",children:[a.jsxs("button",{onClick:B=>{B.stopPropagation(),L()},className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group",children:[a.jsx("span",{className:`text-xs font-bold ${u?"text-green-400":"group-hover:text-white"}`,children:u||"Copy Share Link"}),a.jsx(en,{active:!!u})]}),a.jsx("div",{className:"h-px bg-white/10 my-1"}),e&&a.jsxs(a.Fragment,{children:[a.jsxs("button",{onClick:B=>{B.stopPropagation(),S(B),j()},className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group border-b border-white/10 mb-1",children:[a.jsx("span",{className:"text-xs font-bold group-hover:text-white",children:"Save Preset"}),a.jsx(tn,{})]}),a.jsxs("button",{onClick:B=>{B.stopPropagation(),S(B),R()},className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group border-b border-white/10 mb-1",children:[a.jsx("span",{className:"text-xs font-bold group-hover:text-white",children:"Load Preset"}),a.jsx(an,{})]}),a.jsx("div",{className:"h-px bg-white/10 my-1"})]}),T.map(B=>D(B)),a.jsx("div",{className:"h-px bg-white/10 my-1"}),D({id:"engineSettings",toggleParam:"showEngineTab",label:"Engine Settings"}),a.jsx("div",{className:"px-2 mb-1 mt-0.5",children:a.jsx(Wt,{value:w,onChange:A,selectClassName:"!text-left pl-2",options:[{label:"Fastest (Bare)",value:"Fastest"},{label:"Lite (Fast)",value:"Lite"},{label:"Balanced",value:"Balanced"},{label:"Ultra",value:"Ultra"},{label:"---",value:"Custom"}],fullWidth:!0})}),a.jsxs("button",{onClick:B=>{B.stopPropagation(),n(5),s.openWorkshop(),c(!1)},className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group",children:[a.jsx("span",{className:"text-xs font-bold group-hover:text-purple-400",children:"Formula Workshop"}),a.jsx(wa,{})]}),a.jsxs("button",{onClick:B=>{B.stopPropagation(),s.setIsBroadcastMode(!0)},className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group",children:[a.jsxs("span",{className:"text-xs font-bold group-hover:text-cyan-400",children:["Hide Interface ",a.jsx("span",{className:"text-gray-500 font-normal",children:"[B]"})]}),a.jsx(ti,{})]}),a.jsxs("div",{className:"flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer",onClick:()=>{n(5),s.setInvertY(!s.invertY)},children:[a.jsx("span",{className:"text-xs text-gray-300 font-bold",children:"Invert Look Y"}),a.jsx("span",{className:`px-2 py-0.5 text-[8px] font-bold rounded-sm border transition-all ${s.invertY?"bg-cyan-500/30 text-cyan-300 border-cyan-500/40":"bg-white/[0.04] text-gray-600 border-white/5"}`,children:s.invertY?"ON":"OFF"})]}),a.jsx("div",{className:"h-px bg-white/10 my-1"}),a.jsxs("div",{className:"flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer",title:"Keyboard: ` (tilde)",onClick:()=>s.setAdvancedMode(!s.advancedMode),children:[a.jsxs("span",{className:"text-xs text-gray-300 font-bold",children:["Advanced Mode ",a.jsx("span",{className:"text-gray-500 font-normal",children:"[`]"})]}),a.jsx("span",{className:`px-2 py-0.5 text-[8px] font-bold rounded-sm border transition-all ${s.advancedMode?"bg-purple-500/30 text-purple-300 border-purple-500/40":"bg-white/[0.04] text-gray-600 border-white/5"}`,children:s.advancedMode?"ON":"OFF"})]}),s.advancedMode&&a.jsxs("div",{className:"mt-1 pl-2 border-l border-white/10 ml-2",children:[G.map(B=>D(B)),H.map(B=>D(B,!0)),a.jsxs("a",{href:"./mesh-export/index.html",target:"_blank",rel:"noopener noreferrer",onClick:B=>{B.stopPropagation(),n(5),c(!1)},className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group no-underline",children:[a.jsx("span",{className:"text-xs font-bold group-hover:text-orange-400",children:"Mesh Export"}),a.jsx("span",{className:"text-[9px] text-gray-600",children:"↗"})]}),a.jsxs("div",{className:"flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer",onClick:()=>s.setDebugMobileLayout(!s.debugMobileLayout),children:[a.jsx("span",{className:"text-xs text-gray-300 font-bold",children:"Force Mobile UI"}),a.jsx("span",{className:`px-2 py-0.5 text-[8px] font-bold rounded-sm border transition-all ${s.debugMobileLayout?"bg-purple-500/30 text-purple-300 border-purple-500/40":"bg-white/[0.04] text-gray-600 border-white/5"}`,children:s.debugMobileLayout?"ON":"OFF"})]})]}),a.jsx("div",{className:"h-px bg-white/10 my-1"}),a.jsxs("div",{className:"flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer",title:"Keyboard: H",onClick:()=>{n(5),s.setShowHints(!s.showHints)},children:[a.jsxs("span",{className:"text-xs text-gray-300 font-bold",children:["Show Hints ",a.jsx("span",{className:"text-gray-500 font-normal",children:"[H]"})]}),a.jsx("span",{className:`px-2 py-0.5 text-[8px] font-bold rounded-sm border transition-all ${s.showHints?"bg-green-500/30 text-green-300 border-green-500/40":"bg-white/[0.04] text-gray-600 border-white/5"}`,children:s.showHints?"ON":"OFF"})]}),a.jsxs("button",{onClick:B=>{B.stopPropagation(),n(5),s.openHelp("general.shortcuts"),c(!1)},className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-cyan-400 transition-colors group",children:[a.jsx("span",{className:"text-xs font-bold group-hover:text-cyan-200",children:"Help"}),a.jsx(Bo,{})]}),a.jsxs("button",{onClick:B=>{B.stopPropagation(),n(5),f(!d)},className:`w-full flex items-center justify-between p-2 rounded transition-colors ${d?"bg-white/10 text-cyan-400":"hover:bg-white/5 text-gray-300"}`,children:[a.jsx("span",{className:"text-xs font-bold",children:"About GMT"}),a.jsx(ai,{})]}),d&&a.jsx("div",{className:"p-3 bg-white/5 rounded-lg border border-white/5 animate-fade-in mt-1",children:a.jsxs("div",{className:"text-[10px] text-gray-400 leading-relaxed space-y-2",children:[h&&a.jsxs("div",{className:"mb-2 pb-2 border-b border-white/10",children:[a.jsx("div",{className:"text-[8px] text-gray-500 font-bold mb-1",children:"Active Renderer"}),a.jsx("div",{className:"text-[9px] text-green-400 font-mono break-all",children:h})]}),a.jsx("p",{className:"text-[9px] text-gray-500 font-mono mb-1",children:"v0.9.0"}),a.jsxs("p",{children:["GMT was crafted with ❤️ by ",a.jsx("span",{className:"text-white font-bold",children:"Guy Zack"})," using ",a.jsx("a",{href:"https://aistudio.google.com",target:"_blank",rel:"noopener noreferrer",className:"text-cyan-400 hover:underline",children:"Gemini"})," and ",a.jsx("a",{href:"https://claude.ai",target:"_blank",rel:"noopener noreferrer",className:"text-cyan-400 hover:underline",children:"Claude"}),"."]}),a.jsxs("div",{className:"pt-2 border-t border-white/10",children:[a.jsx("div",{className:"text-[8px] text-gray-500 font-bold mb-1",children:"Tech Stack"}),a.jsx("div",{className:"text-[9px] text-gray-500 font-mono",children:"React + TypeScript + Three.js + GLSL + Zustand + Vite"})]}),a.jsxs("div",{className:"flex flex-col gap-1 pt-2 border-t border-white/10",children:[a.jsxs("a",{href:"https://www.reddit.com/r/GMT_fractals/",target:"_blank",rel:"noopener noreferrer",className:"flex items-center gap-2 hover:text-white transition-colors",children:[a.jsx("span",{children:"Community:"}),a.jsx("span",{className:"text-cyan-400 hover:underline",children:"r/GMT_fractals"})]}),a.jsxs("a",{href:"https://github.com/gamazama/GMT-fractals",target:"_blank",rel:"noopener noreferrer",className:"flex items-center gap-2 hover:text-white transition-colors",children:[a.jsx("span",{children:"Source:"}),a.jsx("span",{className:"text-cyan-400 hover:underline",children:"GitHub (GPL-3.0)"})]})]})]})})]})})]})]})},Mc=()=>{const e=z(),[n,t]=M.useState(window.innerWidth),[o,i]=M.useState(!1);M.useEffect(()=>{const f=()=>t(window.innerWidth),h=()=>i(window.matchMedia("(pointer: coarse)").matches);return window.addEventListener("resize",f),h(),()=>window.removeEventListener("resize",f)},[]);const s=e.debugMobileLayout||n<768||o,r=(f=10)=>{navigator.vibrate&&navigator.vibrate(f)},l="p-2.5 rounded-lg transition-all active:scale-95 border flex items-center justify-center",c="bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/10",d="bg-gray-800 border-gray-600 text-white";return a.jsxs("header",{className:"relative shrink-0 w-full h-14 z-[500] bg-black/90 border-b border-white/10 flex items-center justify-between px-6 animate-fade-in-down select-none",children:[a.jsx(Jl,{isMobileMode:s,vibrate:r}),a.jsx(vc,{isMobileMode:s,vibrate:r}),a.jsxs("div",{className:"flex gap-2 relative items-center",children:[a.jsx(wc,{isMobileMode:s,vibrate:r,btnBase:l,btnActive:d,btnInactive:c}),a.jsx("div",{className:"h-6 w-px bg-white/10 mx-1"}),a.jsx(Sc,{isMobileMode:s,vibrate:r,btnBase:l,btnActive:d,btnInactive:c})]})]})},Rn=()=>{const[e,n]=M.useState(typeof window<"u"?window.innerHeight>window.innerWidth:!1),[t,o]=M.useState(!1);return M.useEffect(()=>{const i=()=>{n(window.innerHeight>window.innerWidth),o(window.matchMedia("(pointer: coarse)").matches||window.innerWidth<768)};return window.addEventListener("resize",i),i(),()=>window.removeEventListener("resize",i)},[]),{isPortrait:e,isMobile:t}},ho=({onMove:e,label:n,active:t})=>{const[o,i]=M.useState(!1),[s,r]=M.useState({x:0,y:0}),l=M.useRef(null),c=M.useRef(null),d=M.useRef({x:0,y:0}),f=M.useCallback((p,u)=>{if(!l.current)return;const g=l.current.getBoundingClientRect(),v=g.left+g.width/2,y=g.top+g.height/2,b=g.width/2;let x=(p-v)/b,m=(u-y)/b;const C=Math.sqrt(x*x+m*m);C>1&&(x/=C,m/=C);const k=30,w=Math.min(1,C),S=(C>0?x:0)*w*k,j=(C>0?m:0)*w*k;r({x:S,y:j}),d.current={x,y:-m}},[]),h=p=>{t&&(p.stopPropagation(),c.current=p.pointerId,i(!0),f(p.clientX,p.clientY),navigator.vibrate&&navigator.vibrate(10))};return M.useEffect(()=>{if(!o)return;const p=g=>{g.pointerId===c.current&&(g.cancelable&&g.preventDefault(),f(g.clientX,g.clientY),e(d.current.x,d.current.y))},u=g=>{g.pointerId===c.current&&(d.current={x:0,y:0},e(0,0),i(!1),r({x:0,y:0}),c.current=null,navigator.vibrate&&navigator.vibrate(5))};return window.addEventListener("pointermove",p,{passive:!1}),window.addEventListener("pointerup",u),window.addEventListener("pointercancel",u),()=>{window.removeEventListener("pointermove",p),window.removeEventListener("pointerup",u),window.removeEventListener("pointercancel",u)}},[o,f,e]),a.jsx("div",{ref:l,className:`w-36 h-36 rounded-full transition-all duration-200 relative flex items-center justify-center touch-none select-none ${o?"scale-110 shadow-[0_0_30px_rgba(34,211,238,0.1)]":"scale-100"} ${t?"pointer-events-auto":"pointer-events-none"}`,style:{touchAction:"none"},onPointerDown:h,children:a.jsxs("div",{className:`w-24 h-24 rounded-full border transition-all duration-500 flex items-center justify-center ${o?"bg-cyan-500/10 border-cyan-400":"bg-white/5 border-white/10"} ${t?"opacity-100":"opacity-0 scale-50"}`,children:[a.jsx("div",{className:`absolute -top-6 text-[8px] font-bold pointer-events-none transition-colors ${o?"text-cyan-400":"text-white/30"}`,children:n}),a.jsx("div",{className:"absolute inset-2 rounded-full border border-white/5 pointer-events-none"}),a.jsx("div",{className:`w-10 h-10 rounded-full border shadow-xl transition-transform duration-75 pointer-events-none ${o?"bg-cyan-400 border-white shadow-[0_0_20px_rgba(34,211,238,0.5)]":"bg-white/10 border-white/20"}`,style:{transform:`translate(${s.x}px, ${s.y}px)`}})]})})},Cc=()=>{const{cameraMode:e,setCameraMode:n,debugMobileLayout:t}=z(),{isMobile:o}=Rn(),[i,s]=M.useState(!1);M.useEffect(()=>{s(o||t)},[t,o]);const r=M.useCallback((d,f)=>{window.dispatchEvent(new CustomEvent("joyMove",{detail:{x:d,y:f}}))},[]),l=M.useCallback((d,f)=>{window.dispatchEvent(new CustomEvent("joyLook",{detail:{x:d,y:f}}))},[]);if(!i)return null;const c=e==="Fly";return a.jsxs("div",{className:"absolute inset-0 pointer-events-none z-[100] flex flex-col justify-between p-6 pb-10",children:[a.jsx("div",{className:"flex justify-start pt-16",children:a.jsxs("button",{onClick:()=>{navigator.vibrate&&navigator.vibrate(20),n(c?"Orbit":"Fly")},className:"pointer-events-auto flex items-center gap-2 bg-black/80 border border-white/20 px-4 py-2.5 rounded-full backdrop-blur-xl shadow-2xl active:scale-90 transition-all active:border-cyan-400",children:[a.jsx("div",{className:`w-2 h-2 rounded-full ${c?"bg-cyan-400 animate-pulse shadow-[0_0_5px_cyan]":"bg-purple-400"}`}),a.jsxs("span",{className:"text-[10px] font-bold text-white",children:[e," Mode"]})]})}),a.jsxs("div",{className:"flex justify-between items-end transition-all duration-500",children:[a.jsx("div",{className:c?"pointer-events-auto":"pointer-events-none",children:a.jsx(ho,{label:"Move",onMove:r,active:c})}),a.jsx("div",{className:c?"pointer-events-auto":"pointer-events-none",children:a.jsx(ho,{label:"Look",onMove:l,active:c})})]})]})};class kc{constructor(n){Q(this,"ctx",null);Q(this,"imageData",null);const t=n.getContext("2d",{alpha:!0});t&&(this.ctx=t)}render(n,t){if(!this.ctx)return;const o=this.ctx.canvas;(o.width!==o.clientWidth||o.height!==o.clientHeight)&&(o.width=o.clientWidth,o.height=o.clientHeight,this.imageData=null);const i=o.width,s=o.height;if(i===0||s===0)return;(!this.imageData||this.imageData.width!==i||this.imageData.height!==s)&&(this.imageData=this.ctx.createImageData(i,s));const r=this.imageData.data,l=n*.001,c=l*.5,d=Math.cos(c)*.7885,f=Math.sin(c)*.7885,h=1.5-.9*Math.pow(t,.5),p=(1-Math.pow(t,.2))*.5,u=Math.sin(p),g=Math.cos(p),v=(1-t)*.5,y=10+80*Math.pow(t,1.5),b=Math.min(Math.floor(y),90),x=1/s,m=i*.5,C=s*.5;for(let k=0;k<s;k++){const w=s-1-k,S=1/i;for(let j=0;j<i;j++){let R=(j-m)*x,I=(w-C)*x;R+=v,R*=h,I*=h;const N=g*R-u*I,L=u*R+g*I;let E=N,D=L,A=0;for(let G=0;G<b;G++){const H=E*E,W=D*D;if(H+W>4)break;D=2*E*D+f,E=H-W+d,A++}const T=(k*i+j)*4;if(A>=b)r[T]=0,r[T+1]=0,r[T+2]=0,r[T+3]=0;else{const G=E*E+D*D,B=3+(A-Math.log2(Math.log2(G))+4)/64*10;let _=.5+.5*Math.cos(B),U=.5+.5*Math.cos(B+.6),O=.5+.5*Math.cos(B+1);const P=j*S,$=.1*Math.sin(P*30-l*8)*t;_+=$,U+=$,O+=$,r[T]=Math.max(0,Math.min(255,_*255|0)),r[T+1]=Math.max(0,Math.min(255,U*255|0)),r[T+2]=Math.max(0,Math.min(255,O*255|0)),r[T+3]=255}}}this.ctx.putImageData(this.imageData,0,0)}dispose(){this.ctx=null,this.imageData=null}}xe();const fo=["Generative Math Tracer","GPU Manifold Tracer","GPU Mandelorus Tracer","Geometric Morphology Toolkit","GLSL Marching Toolkit","Generative Morphology Theater","Grand Mathematical Topography","Geometric Manifold Traversal","Gradient Mapped Topology","Generalized Mesh Tracer","Gravitational Manifold Theory","Glass Mountain Telescope","Ghost Manifold Terminal","Garden of Mathematical Terrain","Glimpse Machine Terminal","Grey Matter Telescope","Grotesque Math Theater","Geometry Mutation Terminal","Grand Mythos Terminal","Glowing Mathematical Topologies","Guy Makes Things","Guy's Math Toy","Gnarly Math Thing","Generally Mesmerizing Thingamajig","Give Me Tentacles","Gloriously Melted Teapots","Gaze-into Mathematical Twilight","Greenwich Mean Time","Geometrically Mangled Tesseracts","Gratuitous Mandelbulb Torture","Got More Tentacles","Groovy Morphing Thingamabob"],jc=()=>fo[Math.floor(Math.random()*fo.length)],po=e=>`thumbnails/fractal_${e}.jpg`,Rc=({isReady:e,onFinished:n,startupMode:t,bootEngine:o})=>{var H;const i=M.useRef(null),s=M.useRef(null),r=M.useRef(!1),l=M.useRef(e),c=M.useRef(o),d=M.useRef(!1);M.useEffect(()=>{l.current=e},[e]),M.useEffect(()=>{c.current=o},[o]);const f=M.useRef(null),h=z(W=>W.formula),p=z(W=>W.setFormula),u=z(W=>W.loadPreset),g=z(W=>W.applyPreset),v=z(W=>W.quality),y=(v==null?void 0:v.precisionMode)===1,[b,x]=M.useState(0),m=M.useRef(0),[C,k]=M.useState(1),[w,S]=M.useState(!0),[j,R]=M.useState(!1);M.useEffect(()=>{r.current=j},[j]);const[I,N]=M.useState(null),[L]=M.useState(jc),E=()=>{d.current||(d.current=!0,c.current&&c.current())},D=W=>{const B=we.get(W);B&&B.defaultPreset&&u(B.defaultPreset),p(W),R(!1),x(0),m.current=0,d.current&&c.current&&c.current(!0)},A=async W=>{var _;const B=(_=W.target.files)==null?void 0:_[0];if(B)try{let U="";if(B.type==="image/png"){const $=await Qo(B,"FractalData");if($)U=$;else throw new Error("No Fractal Data found in PNG.")}else U=await B.text();const{def:O,preset:P}=La(U);O&&!we.get(O.id)&&we.register(O),u(P),R(!1),x(0),m.current=0,d.current&&c.current&&c.current(!0)}catch(U){alert("Load failed: "+(U instanceof Error?U.message:String(U)))}},T=()=>{const W=y?"balanced":"lite";if(Y.emit("is_compiling",`Switching to ${W} mode...`),g){const B=z.getState();g({mode:W,actions:B})}},G=M.useMemo(()=>we.getAll(),[]);return M.useEffect(()=>{if(!i.current)return;s.current=new kc(i.current);let W=0,B=0,_=performance.now();const U=2500,O=P=>{const $=performance.now(),F=Math.min($-_,60);_=$;const q=r.current;B<100&&(B+=F*(100/U)),B>100&&(B=100),Math.floor(B)>Math.floor(m.current)&&(m.current=B,x(B)),s.current&&s.current.render(P,B/100),B>=100&&!q?(E(),l.current?(s.current&&(s.current.dispose(),s.current=null),k(0),setTimeout(()=>{S(!1),n()},800)):W=requestAnimationFrame(O)):W=requestAnimationFrame(O)};return W=requestAnimationFrame(O),()=>{cancelAnimationFrame(W),s.current&&(s.current.dispose(),s.current=null)}},[]),M.useEffect(()=>{E()},[]),w?a.jsxs("div",{className:"fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black transition-opacity duration-1000",style:{opacity:C},children:[a.jsxs("div",{className:"text-center mb-10 relative animate-fade-in-up z-10",children:[a.jsxs("h1",{className:"text-7xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] mb-2",children:["G",a.jsx("span",{className:"text-cyan-400",children:"M"}),"T"]}),a.jsx("div",{className:"text-xs text-gray-400 font-mono uppercase tracking-[0.4em]",children:L})]}),a.jsxs("div",{className:"relative z-10 w-[500px] h-16 bg-gray-900/80 rounded-full border border-gray-700/50 overflow-hidden shadow-[0_0_50px_rgba(0,255,255,0.1)] backdrop-blur-sm",children:[a.jsx("div",{className:"absolute top-0 left-0 h-full overflow-hidden will-change-[width] transition-[width] duration-75 ease-linear",style:{width:`${b}%`},children:a.jsx("canvas",{ref:i,className:"absolute top-0 left-0 w-[500px] h-16"})}),a.jsx("div",{className:"absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"})]}),a.jsx("div",{className:"mt-6 font-mono text-sm text-cyan-500/80 z-20 flex flex-col items-center h-10",children:t==="url"?a.jsxs("span",{className:"animate-pulse",children:["LOADING SHARED SCENE... ",Math.floor(b),"%"]}):a.jsxs("div",{className:"relative flex flex-col items-center",children:[a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsx("span",{className:"text-cyan-600/80",children:"LOADING"}),a.jsxs("button",{onClick:()=>R(!j),className:"flex items-center gap-1 text-cyan-400 hover:text-white transition-colors border-b border-dashed border-cyan-500/30 hover:border-cyan-400 pb-0.5 outline-none",children:[a.jsxs("span",{className:"font-bold",children:["[",h,"]"]}),a.jsx("span",{className:`text-[10px] transform transition-transform ${j?"rotate-180":""}`,children:a.jsx(ia,{})})]}),a.jsxs("span",{className:"text-cyan-600/80",children:[Math.floor(b),"%"]})]}),a.jsx("button",{onClick:T,className:`mt-4 px-3 py-1.5 text-[9px] font-bold rounded border transition-all ${y?"bg-orange-900/40 text-orange-200 border-orange-500/40 hover:bg-orange-800/50":"bg-white/5 text-gray-500 border-white/5 hover:text-white hover:border-white/20"}`,children:y?"Lite Render Active":"Enable Lite Render"}),j&&a.jsxs("div",{className:"absolute bottom-full mb-4 w-[340px] bg-black/95 border border-white/20 rounded-xl shadow-[0_10px_60px_rgba(0,0,0,0.9)] backdrop-blur-xl animate-fade-in text-xs z-[110]",onMouseLeave:()=>N(null),children:[I&&I!=="Modular"&&a.jsxs("div",{className:"absolute left-[350px] bottom-0 w-[256px] h-[256px] bg-black border border-cyan-500/50 rounded-lg shadow-[0_0_50px_rgba(0,0,0,1)] overflow-hidden animate-fade-in pointer-events-none",children:[a.jsx("img",{src:po(I),className:"w-full h-full object-cover",alt:"Preview",onError:W=>{W.currentTarget.style.display="none"}}),a.jsx("div",{className:"absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,4px_100%] pointer-events-none"}),a.jsx("div",{className:"absolute bottom-0 left-0 right-0 p-3 bg-black/60 text-cyan-300 font-bold text-[9px] border-t border-white/5",children:(H=we.get(I))==null?void 0:H.name})]}),a.jsxs("div",{className:"p-1 max-h-[400px] overflow-y-auto custom-scroll",children:[a.jsxs("button",{onClick:()=>{var W;return(W=f.current)==null?void 0:W.click()},className:"w-full flex items-center gap-2 px-3 py-2 text-left text-gray-300 hover:bg-white/10 hover:text-white rounded transition-colors mb-1 border-b border-white/10",children:[a.jsx(Go,{})," ",a.jsx("span",{className:"font-bold text-[10px]",children:"Load From File..."})]}),a.jsx("input",{type:"file",ref:f,className:"hidden",accept:".gmf,.json,.png",onChange:A}),a.jsx("div",{className:"px-3 py-1.5 text-[9px] font-bold text-gray-500 bg-white/5 mb-1",children:"Select Engine"}),G.map(W=>a.jsxs("button",{onClick:()=>D(W.id),onMouseEnter:()=>N(W.id),className:`w-full text-left px-3 py-2.5 transition-all flex gap-3 border-b border-white/5 last:border-b-0 ${W.id===h?"bg-cyan-900/30":"hover:bg-white/5"}`,children:[a.jsxs("div",{className:"w-16 h-10 shrink-0 bg-black rounded border border-white/10 overflow-hidden relative",children:[W.id!=="Modular"?a.jsx("img",{src:po(W.id),alt:W.name,className:"w-full h-full object-cover",onError:B=>{B.currentTarget.style.display="none",B.currentTarget.nextElementSibling&&(B.currentTarget.nextElementSibling.style.display="flex")}}):null,a.jsx("div",{className:`w-full h-full items-center justify-center text-gray-700 bg-gray-900 ${W.id!=="Modular"?"hidden":"flex"}`,children:W.id==="Modular"?a.jsx(Uo,{}):a.jsx(Na,{})})]}),a.jsx("div",{className:"flex flex-col min-w-0",children:a.jsx("span",{className:`text-[11px] font-bold tracking-tight mb-0.5 ${W.id===h?"text-cyan-400":"text-gray-200"}`,children:W.name})})]},W.id))]})]})]})})]}):null},Ic=(e,n)=>{const t=z,o=le;M.useEffect(()=>{const i=s=>{const r=s.target,l=r.tagName==="INPUT"&&r.type==="range";if(r.tagName==="INPUT"&&!l||r.tagName==="TEXTAREA"||r.isContentEditable)return;const d=s.ctrlKey||s.metaKey,f=s.shiftKey;if(d&&!s.altKey){const h=t.getState().isTimelineHovered;if(s.code==="KeyZ"&&f){s.preventDefault(),s.stopPropagation(),t.getState().undoCamera();return}if(s.code==="KeyY"&&f){s.preventDefault(),s.stopPropagation(),t.getState().redoCamera();return}if(s.code==="KeyZ"&&!f){s.preventDefault(),s.stopPropagation(),h&&o.getState().undo()||t.getState().undoParam();return}if(s.code==="KeyY"&&!f){s.preventDefault(),s.stopPropagation(),h&&o.getState().redo()||t.getState().redoParam();return}}if(d&&!f&&!s.altKey){const h=s.code.match(/^Digit([1-9])$/);if(h){const p=parseInt(h[1])-1,u=t.getState().savedCameras;p<u.length&&(s.preventDefault(),s.stopPropagation(),t.getState().selectCamera(u[p].id));return}}switch(s.code){case"Tab":s.preventDefault(),t.getState().setCameraMode(t.getState().cameraMode==="Fly"?"Orbit":"Fly");break;case"KeyT":d||n(y=>!y);break;case"Escape":t.getState().isBroadcastMode&&t.getState().setIsBroadcastMode(!1),t.getState().interactionMode!=="none"&&t.getState().setInteractionMode("none"),o.getState().deselectAll();break;case"KeyH":t.getState().setShowHints(!t.getState().showHints);break;case"Backquote":t.getState().setAdvancedMode(!t.getState().advancedMode);break;case"KeyB":if(!d){const y=t.getState();y.setIsBroadcastMode(!y.isBroadcastMode)}break;case"Space":const{cameraMode:h,isTimelineHovered:p}=t.getState(),{sequence:u,isPlaying:g}=o.getState();let v=!1;if(e)v=h!=="Fly"||p;else{const y=Object.keys(u.tracks).length>0;h!=="Fly"&&y&&(v=!0)}v&&(s.preventDefault(),g?o.getState().pause():o.getState().play());break}};return window.addEventListener("keydown",i,{capture:!0}),()=>window.removeEventListener("keydown",i,{capture:!0})},[e,n])},Pc=xe(),mo=({onUpdate:e,autoUpdate:n,trigger:t,source:o})=>{const i=M.useRef(t);return M.useEffect(()=>{let s=0,r=0;const l=()=>{const c=t!==i.current;c&&(i.current=t),r++,(n&&r%60===0||c)&&Pc.requestHistogramReadback(o).then(f=>{f.length>0&&e(f)}),s=requestAnimationFrame(l)};return l(),()=>cancelAnimationFrame(s)},[n,t,o,e]),null},Tc=({state:e,actions:n,isMobile:t,hudRefs:o})=>{var h;const i=M.useRef(null),s=M.useRef(null),r=e.tabSwitchCount,l=n.incrementTabSwitchCount;M.useEffect(()=>{const p=le.subscribe(u=>u.isCameraInteracting,u=>{o.container.current&&(u?(o.container.current.style.opacity="1",s.current&&(clearTimeout(s.current),s.current=null)):(s.current&&clearTimeout(s.current),s.current=window.setTimeout(()=>{o.container.current&&(o.container.current.style.opacity="0")},2e3)))});return()=>{p(),s.current&&clearTimeout(s.current)}},[]),M.useEffect(()=>z.subscribe(u=>u.cameraMode,()=>l()),[l]);const c=p=>{if(!i.current||e.cameraMode==="Orbit")return;const u=i.current.getBoundingClientRect(),g=b=>{const x=Math.max(0,Math.min(1,(b-u.left)/u.width)),m=Math.pow(10,x*3-3);n.setNavigation({flySpeed:m}),(x===0||x===1)&&navigator.vibrate&&navigator.vibrate(5)};g(p.clientX);const v=b=>g(b.clientX),y=()=>{window.removeEventListener("pointermove",v),window.removeEventListener("pointerup",y)};window.addEventListener("pointermove",v),window.addEventListener("pointerup",y)},d=((h=e.navigation)==null?void 0:h.flySpeed)??.5,f=(Math.log10(d)+3)/3;return a.jsx("div",{ref:o.container,className:"absolute inset-0 pointer-events-none z-10 transition-opacity duration-500 opacity-0",children:a.jsxs("div",{className:"absolute inset-0 flex items-center justify-center",children:[a.jsx("div",{className:"absolute pointer-events-none opacity-20",children:e.cameraMode==="Fly"?a.jsxs(a.Fragment,{children:[a.jsx("div",{className:"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40px] h-[1px] bg-cyan-400"}),a.jsx("div",{className:"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-[40px] bg-cyan-400"})]}):a.jsxs("div",{className:"relative flex items-center justify-center",children:[a.jsx("div",{className:"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20px] h-[1px] bg-cyan-400"}),a.jsx("div",{className:"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-[20px] bg-cyan-400"}),a.jsx("div",{className:"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[24px] h-[24px] rounded-full border border-cyan-400 opacity-60"})]})}),a.jsxs("div",{ref:o.reticle,className:"absolute w-8 h-8 pointer-events-none opacity-0 transition-opacity duration-150 ease-out will-change-transform",children:[a.jsx("div",{className:"absolute inset-0 border-2 border-cyan-400 rounded-full shadow-[0_0_15px_cyan] opacity-80"}),a.jsx("div",{className:"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full"})]}),a.jsxs("div",{className:"absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-300 ease-out",style:{bottom:e.showHints&&!t?"4rem":"3.5rem"},children:[a.jsx("button",{ref:o.reset,onClick:()=>{n.resetCamera(),navigator.vibrate&&navigator.vibrate(30)},className:"pointer-events-auto px-4 py-1.5 bg-black/60 hover:bg-cyan-900/80 text-cyan-400 hover:text-white text-[9px] font-bold rounded-t-lg border-x border-t border-white/10 backdrop-blur-md hidden animate-fade-in shadow-xl mb-[-1px]",children:"Reset Camera"}),a.jsxs("div",{className:"flex items-stretch gap-px bg-black/40 rounded-full border border-white/10 backdrop-blur-md overflow-hidden pointer-events-auto shadow-2xl",children:[e.cameraMode==="Fly"&&a.jsxs(a.Fragment,{children:[a.jsxs("div",{ref:i,onPointerDown:c,className:"relative flex items-center px-6 py-3 cursor-ew-resize group min-w-[120px]",children:[a.jsx("div",{className:"absolute inset-0 bg-cyan-500/10 border-r border-cyan-500/20 transition-all duration-300 ease-out",style:{width:`${f*100}%`}}),a.jsxs("span",{ref:o.speed,className:"relative z-10 font-bold text-cyan-300 font-mono text-[10px] group-hover:text-white transition-colors",children:["Spd x",d.toFixed(3)]})]}),a.jsx("div",{className:"w-px bg-white/5"})]}),a.jsx("div",{className:"px-6 py-3 bg-white/5 flex items-center min-w-[100px] justify-center",children:a.jsx("span",{ref:o.dist,className:"text-cyan-500/80 font-mono text-[10px]",children:"Dst ---"})})]}),e.showHints&&!t&&a.jsxs("div",{className:"mt-3 text-[9px] font-medium text-white/40 text-center animate-fade-in text-shadow-sm whitespace-nowrap",children:[a.jsxs("span",{className:"text-cyan-400/60 font-bold mr-2",children:["[",e.cameraMode,"]"]}),e.cameraMode==="Fly"?"WASD Move · Space/C Vert · Shift Boost":"L-Drag Rotate · R-Drag Pan · Scroll Zoom"]}),r<2&&!t&&e.showHints&&a.jsxs("div",{className:"mt-2 text-[10px] font-bold text-cyan-300 animate-pulse bg-cyan-950/40 px-3 py-1 rounded border border-cyan-500/30 shadow-lg",children:["Press ",a.jsx("span",{className:"text-white border border-white/20 rounded px-1 bg-white/10 mx-0.5",children:"Tab"})," for ",e.cameraMode==="Orbit"?"Fly":"Orbit"," navigation"]})]})]})})};class go{constructor(n){Q(this,"element");Q(this,"sourceNode",null);Q(this,"gainNode",null);Q(this,"fileUrl",null);Q(this,"fileName",null);Q(this,"isActive",!1);this.element=new Audio,this.element.loop=!0,this.element.crossOrigin="anonymous"}get isPlaying(){return!this.element.paused&&!!this.sourceNode}load(n,t,o){this.fileUrl&&URL.revokeObjectURL(this.fileUrl),this.fileUrl=URL.createObjectURL(n),this.fileName=n.name,this.element.src=this.fileUrl,this.isActive=!0,this.sourceNode||(this.sourceNode=t.createMediaElementSource(this.element),this.gainNode=t.createGain(),this.sourceNode.connect(this.gainNode),this.gainNode.connect(o))}play(){this.element.play().catch(n=>console.warn("Deck play failed",n))}pause(){this.element.pause()}stop(){this.element.pause(),this.element.currentTime=0}seek(n){this.element.currentTime=n}setVolume(n){this.gainNode&&(this.gainNode.gain.value=n)}get duration(){return this.element.duration||0}get currentTime(){return this.element.currentTime||0}}class Ec{constructor(){Q(this,"audioContext",null);Q(this,"analyser",null);Q(this,"micSource",null);Q(this,"decks",[null,null]);Q(this,"masterGain",null);Q(this,"dataArray",null);Q(this,"isMicActive",!1);Q(this,"crossfade",.5)}init(){this.audioContext||(this.audioContext=new(window.AudioContext||window.webkitAudioContext),this.masterGain=this.audioContext.createGain(),this.masterGain.gain.value=.8,this.masterGain.connect(this.audioContext.destination),this.analyser=this.audioContext.createAnalyser(),this.analyser.fftSize=2048,this.analyser.smoothingTimeConstant=.8,this.dataArray=new Uint8Array(this.analyser.frequencyBinCount),this.masterGain.connect(this.analyser),this.decks[0]=new go(this.audioContext),this.decks[1]=new go(this.audioContext),this.setCrossfade(.5))}setSmoothing(n){this.analyser&&(this.analyser.smoothingTimeConstant=Math.max(0,Math.min(.99,n)))}async connectMicrophone(){if(this.init(),!(!this.audioContext||!this.masterGain)){this.decks.forEach(n=>n==null?void 0:n.pause());try{const n=await navigator.mediaDevices.getUserMedia({audio:!0});this.micSource&&this.micSource.disconnect(),this.micSource=this.audioContext.createMediaStreamSource(n),this.micSource.connect(this.analyser),this.isMicActive=!0,this.audioContext.state==="suspended"&&this.audioContext.resume()}catch(n){console.error("AudioEngine: Mic access denied",n),alert("Microphone access denied.")}}}async connectSystemAudio(){if(this.init(),!!this.audioContext)try{const n=await navigator.mediaDevices.getDisplayMedia({video:!0,audio:!0});if(n.getVideoTracks().forEach(t=>t.stop()),n.getAudioTracks().length===0)return;this.micSource&&this.micSource.disconnect(),this.micSource=this.audioContext.createMediaStreamSource(n),this.micSource.connect(this.analyser),this.micSource.connect(this.audioContext.destination),this.isMicActive=!0,this.audioContext.state==="suspended"&&this.audioContext.resume()}catch(n){console.error("AudioEngine: System audio capture failed",n),alert("System audio capture failed. Check browser permissions.")}}loadTrack(n,t){var o;this.init(),!(!this.audioContext||!this.masterGain)&&(this.micSource&&(this.micSource.disconnect(),this.micSource=null,this.isMicActive=!1),(o=this.decks[n])==null||o.load(t,this.audioContext,this.masterGain),this.setCrossfade(this.crossfade),this.audioContext.state==="suspended"&&this.audioContext.resume())}play(n){var t;(t=this.decks[n])==null||t.play()}pause(n){var t;(t=this.decks[n])==null||t.pause()}stop(n){var t;(t=this.decks[n])==null||t.stop()}deactivateDeck(n){const t=this.decks[n];t&&(t.stop(),t.isActive=!1)}seek(n,t){var o;(o=this.decks[n])==null||o.seek(t)}getTrackInfo(n){const t=this.decks[n];return{duration:(t==null?void 0:t.duration)||1,currentTime:(t==null?void 0:t.currentTime)||0,hasTrack:!!(t!=null&&t.sourceNode),fileName:(t==null?void 0:t.fileName)||null,isPlaying:(t==null?void 0:t.isPlaying)||!1,isActive:(t==null?void 0:t.isActive)||!1}}setCrossfade(n){this.crossfade=n;const t=Math.cos(n*.5*Math.PI),o=Math.cos((1-n)*.5*Math.PI);this.decks[0]&&this.decks[0].setVolume(t),this.decks[1]&&this.decks[1].setVolume(o)}setMasterGain(n){this.masterGain&&this.masterGain.gain.setTargetAtTime(n,this.audioContext.currentTime,.1)}update(){!this.analyser||!this.dataArray||this.analyser.getByteFrequencyData(this.dataArray)}getRawData(){return this.dataArray}}const br=new Ec;class Lc{constructor(){Q(this,"ruleValues",{});Q(this,"lfoValues",{});Q(this,"lfoStates",{});Q(this,"outputValues",{});Q(this,"lfoPrevOffsets",{});Q(this,"offsets",{})}getRuleValue(n){return this.ruleValues[n]||0}updateOscillators(n,t,o){for(let i=0;i<n.length;i++){const s=n[i];if(!s.enabled)continue;const r=(t/s.period+s.phase)%1;let l=0;switch(s.shape){case"Sine":l=Math.sin(r*Math.PI*2);break;case"Triangle":l=1-Math.abs(r*2-1)*2;break;case"Sawtooth":l=r*2-1;break;case"Pulse":l=r<.5?1:-1;break;case"Noise":const p=s.id;this.lfoStates[p]||(this.lfoStates[p]=Math.random()),this.lfoStates[p]+=o*5,l=Math.sin(this.lfoStates[p])*Math.cos(this.lfoStates[p]*.73);break}const c=l*.5+.5;this.lfoValues[`lfo-${i+1}`]=c;const d=l*s.amplitude,f=this.lfoPrevOffsets[s.id]??d;let h=d;if(s.smoothing>.001){const p=50*Math.pow(1-s.smoothing,2)+.1,u=1-Math.exp(-p*o);h=f+(d-f)*u}this.lfoPrevOffsets[s.id]=h,this.offsets[s.target]=(this.offsets[s.target]||0)+h}}update(n,t){const o=br.getRawData();for(const i of n){if(!i.enabled)continue;let s=0;i.source==="audio"?o&&(s=this.processAudioSignal(i,o)):i.source.startsWith("lfo-")&&(s=this.lfoValues[i.source]||0);const r=this.ruleValues[i.id]||0;let l=r;if(s>r){const f=1-Math.pow(i.attack,.2);l=r+(s-r)*f}else{const f=1-Math.pow(i.decay,.2);l=r+(s-r)*f}this.ruleValues[i.id]=l;let c=l;if(i.smoothing&&i.smoothing>.001){const f=this.outputValues[i.id]||0,h=1-Math.pow(i.smoothing,.5);c=f+(l-f)*h}this.outputValues[i.id]=c;const d=c*i.gain+i.offset;this.offsets[i.target]=(this.offsets[i.target]||0)+d}}resetOffsets(){this.offsets={}}processAudioSignal(n,t){const o=t.length,i=Math.floor(n.freqStart*o),s=Math.floor(n.freqEnd*o);if(i>=o||s<=i)return 0;let r=0,l=0;for(let h=i;h<s;h++)r+=t[h],l++;if(l===0)return 0;const c=r/l/255;if(c<n.thresholdMin)return 0;const d=Math.max(.001,n.thresholdMax-n.thresholdMin),f=(c-n.thresholdMin)/d;return Math.min(1,f)}}const ha=new Lc,Ze=xe(),xo={current:new Set},bo=new V,yo=new Lt,vo=new _i,fa={current:new V(-1e3,-1e3,-1e3)},fn={current:-1},ft={current:{}},Nc=e=>{var E,D,A;const n=le.getState(),t=z.getState(),i=Object.keys(n.sequence.tracks).length>0,s=t.animations.length>0,r=((D=(E=t.modulation)==null?void 0:E.rules)==null?void 0:D.length)>0,l=((A=t.audio)==null?void 0:A.isEnabled)??!1;if(!i&&!s&&!r&&!l)return;ka.tick(e);const c=t.modulation,d=t.audio;d&&d.isEnabled&&br.update(),ha.resetOffsets(),Ze.modulations={};const f=t.animations;ha.updateOscillators(f,performance.now()/1e3,e),c&&c.rules&&ha.update(c.rules,e);const h=ha.offsets,p={},u=new Set(Object.keys(h)),g=xo.current,v=new Set;u.forEach(T=>v.add(T)),g.forEach(T=>v.add(T));let y=0,b=0,x=0,m=!1,C=0,k=0,w=0,S=!1;const j=Math.floor(n.currentFrame),R=le.getState().isRecordingModulation,I=R&&j>fn.current;I&&(fn.current=j);const N=[];if(R&&v.size>0&&ka.setOverriddenTracks(v),v.forEach(T=>{var O,P,$;const G=!u.has(T),H=G?0:h[T]??0;Math.abs(H)>1e-4&&(S=!0);let W=0,B="",_=!1;if(T.includes(".")){const[F,q]=T.split("."),Z=ne.get(F),X=t[F];if(Z&&X){const ee=q.match(/^(vec[23][ABC])_(x|y|z)$/);if(ee){const te=ee[1],re=ee[2],oe=Z.params[te];if(oe){const me=X[te];me&&typeof me=="object"&&(W=me[re]||0),oe.uniform&&(B=`${oe.uniform}_${re}`),oe.noReset&&(_=!0)}}else{const te=Z.params[q];te&&(typeof X[q]=="number"&&(W=X[q]),te.uniform&&(B=te.uniform),te.noReset&&(_=!0))}}}else T==="iterations"?(B="uIterations",W=((O=t.coreMath)==null?void 0:O.iterations)??0):T.startsWith("param")&&(B="u"+T.charAt(0).toUpperCase()+T.slice(1),W=((P=t.coreMath)==null?void 0:P[T])??0);if(I&&Math.abs(H)>1e-6){let F=W;const q=n.recordingSnapshot;if(q&&q.tracks[T]){const Z=q.tracks[T],X=T.includes("rotation");F=rt(Z.keyframes,n.currentFrame,X)}else ft.current[T]===void 0&&(ft.current[T]=W),F=ft.current[T];N.push({trackId:T,value:F+H}),W=F}if(T.startsWith("coloring.")){if(T==="coloring.repeats"){const F=t.coloring;if(F&&Math.abs(F.repeats)>.001){const q=I?W:F.repeats,Z=F.scale/q,X=(q+H)*Z;G||(p[T]=q+H),Ze.setUniform("uColorScale",X)}return}if(T==="coloring.phase"){const F=t.coloring,q=I?W:F.phase;G||(p[T]=q+H),Ze.setUniform("uColorOffset",F.offset+H);return}if(T==="coloring.repeats2"){const F=t.coloring;if(F&&Math.abs(F.repeats2)>.001){const q=I?W:F.repeats2,Z=F.scale2/q,X=(q+H)*Z;G||(p[T]=q+H),Ze.setUniform("uColorScale2",X)}return}if(T==="coloring.phase2"){const F=t.coloring,q=I?W:F.phase2;G||(p[T]=q+H),Ze.setUniform("uColorOffset2",F.offset2+H);return}}if(T.startsWith("julia.")||T.startsWith("geometry.julia")){const F=t.geometry,q=(F==null?void 0:F.juliaX)??0,Z=(F==null?void 0:F.juliaY)??0,X=(F==null?void 0:F.juliaZ)??0;T.endsWith("juliaX")||T.endsWith("x")?(y=q+H,p[T]=y,I&&N.push({trackId:"geometry.juliaX",value:y})):T.endsWith("juliaY")||T.endsWith("y")?(b=Z+H,p[T]=b,I&&N.push({trackId:"geometry.juliaY",value:b})):(T.endsWith("juliaZ")||T.endsWith("z"))&&(x=X+H,p[T]=x,I&&N.push({trackId:"geometry.juliaZ",value:x})),m=!0;return}if(T.startsWith("camera.")){T.startsWith("camera.unified")?T.endsWith("x")?Ze.modulations["camera.unified.x"]=H:T.endsWith("y")?Ze.modulations["camera.unified.y"]=H:T.endsWith("z")&&(Ze.modulations["camera.unified.z"]=H):T.startsWith("camera.rotation")&&(T.endsWith("x")?Ze.modulations["camera.rotation.x"]=H:T.endsWith("y")?Ze.modulations["camera.rotation.y"]=H:T.endsWith("z")&&(Ze.modulations["camera.rotation.z"]=H)),p[T]=H;return}if(T.startsWith("geometry.preRot")){T.endsWith("X")?(C=H,p[T]=H):T.endsWith("Y")?(k=H,p[T]=H):T.endsWith("Z")&&(w=H,p[T]=H);return}if(T.startsWith("lighting.light")){const F=T.match(/lighting\.light(\d+)_(\w+)/);if(F){const q=parseInt(F[1]),Z=F[2],X=($=t.lighting)==null?void 0:$.lights;if(X&&X[q]){const ee=X[q];let te=0,re=!1;if(Z==="intensity"?(te=ee.intensity,re=!0):Z==="falloff"?(te=ee.falloff,re=!0):Z==="posX"?(te=ee.position.x,re=!0):Z==="posY"?(te=ee.position.y,re=!0):Z==="posZ"&&(te=ee.position.z,re=!0),re){if(I){let oe=te;n.recordingSnapshot&&n.recordingSnapshot.tracks[T]?oe=rt(n.recordingSnapshot.tracks[T].keyframes,n.currentFrame,!1):(ft.current[T]===void 0&&(ft.current[T]=te),oe=ft.current[T]),N.push({trackId:T,value:oe+H}),p[T]=oe+H}else p[T]=te+H;Ze.modulations[T]=H}}}return}const U=T.match(/^(coreMath|geometry)\.(vec[23][ABC])_(x|y|z)$/);if(U){const F=U[1],q=U[2],Z=U[3],X=t[F];if(X&&X[q]){const ee=X[q],te=ee[Z]??0,re=te+H;if(I){let Ie=te;n.recordingSnapshot&&n.recordingSnapshot.tracks[T]?Ie=rt(n.recordingSnapshot.tracks[T].keyframes,n.currentFrame,!1):(ft.current[T]===void 0&&(ft.current[T]=te),Ie=ft.current[T]),N.push({trackId:T,value:Ie+H}),p[T]=Ie+H}else p[T]=re;const oe="u"+q.charAt(0).toUpperCase()+q.slice(1),me={...ee,[Z]:re};Ze.setUniform(oe,me)}return}if(B){const F=W+H;G||(p[T]=F),Ze.setUniform(B,F,_)}}),N.length>0&&n.batchAddKeyframes(j,N,"Linear"),m){const T=t.geometry;p["geometry.juliaX"]===void 0&&p["julia.x"]===void 0&&(y=(T==null?void 0:T.juliaX)??0),p["geometry.juliaY"]===void 0&&p["julia.y"]===void 0&&(b=(T==null?void 0:T.juliaY)??0),p["geometry.juliaZ"]===void 0&&p["julia.z"]===void 0&&(x=(T==null?void 0:T.juliaZ)??0),bo.set(y,b,x),Ze.setUniform("uJulia",bo)}const L=t.geometry;if(L&&L.preRotMaster){const T=L.preRotX+C,G=L.preRotY+k,H=L.preRotZ+w;if(Math.abs(T-fa.current.x)>1e-6||Math.abs(G-fa.current.y)>1e-6||Math.abs(H-fa.current.z)>1e-6){const W=new Lt().makeRotationX(T),B=new Lt().makeRotationY(G),_=new Lt().makeRotationZ(H);yo.identity().multiply(_).multiply(W).multiply(B),vo.setFromMatrix4(yo),Ze.setUniform("uPreRotMatrix",vo),fa.current.set(T,G,H),S=!0}}S&&Ze.resetAccumulation(),(Object.keys(p).length>0||Object.keys(t.liveModulations).length>0)&&z.getState().setLiveModulations(p),xo.current=u},Dc=()=>{const e=le(n=>n.isRecordingModulation);return M.useEffect(()=>{e?(ft.current={},fn.current=-1):ka.setOverriddenTracks(new Set)},[e]),null},wt=xe(),_c=e=>{const n=M.useRef(!1),t=M.useRef(new V),o=M.useRef(new V),i=M.useRef(!1),s=M.useRef(null),r=M.useRef({x:0,y:0}),l=le;M.useEffect(()=>{const c=h=>{const p=z.getState(),u=p.interactionMode;if(e.current){const g=e.current.getBoundingClientRect(),v=(h.clientX-g.left)/g.width*2-1,y=-((h.clientY-g.top)/g.height)*2+1;if(r.current={x:v,y},u==="picking_focus"){i.current=!0;let b=!1,x=!1,m=-1;const C=z.getState();C.focusLock&&C.setFocusLock(!1),wt.startFocusPick(v,y).then(w=>{i.current&&(b=!0,w>0&&w!==m&&(m=w,z.getState().setOptics({dofFocus:w})))});const k=()=>{i.current&&(b&&!x&&(x=!0,wt.sampleFocusPick(r.current.x,r.current.y).then(w=>{if(x=!1,!!i.current&&w>0&&w!==m){m=w,z.getState().setOptics({dofFocus:w});const{isRecording:S,isPlaying:j,addKeyframe:R,addTrack:I,currentFrame:N,sequence:L}=l.getState();if(S){const E="optics.dofFocus";L.tracks[E]||I(E,"Focus Distance"),R(E,N,w,j?"Linear":"Bezier")}}})),s.current=requestAnimationFrame(k))};s.current=requestAnimationFrame(k)}if(u==="picking_julia"){n.current=!0;const b=p.geometry;o.current.set(b.juliaX,b.juliaY,b.juliaZ),t.current.copy(o.current);const x=(k,w,S)=>{if(w==="MandelTerrain"){const j=S.coreMath,R=Math.pow(2,j.paramB);t.current.set(k.x*(2/R)+j.paramE,k.z*(2/R)+j.paramF,0)}else w==="JuliaMorph"?t.current.set(k.x,k.y,0):t.current.copy(k)};wt.pickWorldPosition(v,y,!0).then(k=>{k&&n.current&&x(k,p.formula,p)});let m=!1;const C=()=>{if(n.current){if(m||(m=!0,wt.pickWorldPosition(r.current.x,r.current.y,!0).then(k=>{if(m=!1,!!n.current&&k){const w=z.getState();x(k,w.formula,w)}})),o.current.lerp(t.current,.1),o.current.distanceToSquared(t.current)>1e-8){z.getState().setGeometry({juliaX:o.current.x,juliaY:o.current.y,juliaZ:o.current.z});const{isRecording:w,isPlaying:S,addKeyframe:j,addTrack:R,currentFrame:I,sequence:N}=l.getState();if(w){N.tracks["geometry.juliaX"]||R("geometry.juliaX","Julia X"),N.tracks["geometry.juliaY"]||R("geometry.juliaY","Julia Y"),N.tracks["geometry.juliaZ"]||R("geometry.juliaZ","Julia Z");const L=S?"Linear":"Bezier";j("geometry.juliaX",I,o.current.x,L),j("geometry.juliaY",I,o.current.y,L),j("geometry.juliaZ",I,o.current.z,L)}}s.current=requestAnimationFrame(C)}};s.current=requestAnimationFrame(C)}}},d=h=>{var p,u;if(e.current){const g=e.current.getBoundingClientRect(),v=(h.clientX-g.left)/g.width*2-1,y=-((h.clientY-g.top)/g.height)*2+1;(n.current||i.current)&&(r.current={x:v,y});const b=z.getState();if(b.draggedLightIndex!==null&&!wt.isGizmoInteracting){const x=na(),m=((u=(p=b.lighting)==null?void 0:p.lights)==null?void 0:u.findIndex(C=>C.id===b.draggedLightIndex))??-1;if(x&&m>=0){const C=new kn;C.setFromCamera(new Te(v,y),x);const k=Math.max(2e-4,Math.min(20,wt.lastMeasuredDistance*.5)),w=C.ray.direction.clone().multiplyScalar(k).add(C.ray.origin),S=wt.sceneOffset,j=b.lighting.lights[m];let R;if(j.fixed&&j.visible){const N=w.clone().sub(x.position).applyQuaternion(x.quaternion.clone().invert());R={x:N.x,y:N.y,z:N.z}}else R={x:w.x+S.x+(S.xL??0),y:w.y+S.y+(S.yL??0),z:w.z+S.z+(S.zL??0)};const I={visible:!0,castShadow:!0,position:R};j.visible||(I.fixed=!1),b.updateLight({index:m,params:I}),b.lighting.shadows||b.setLighting({shadows:!0}),b.showLightGizmo||b.setShowLightGizmo(!0)}}}},f=()=>{const h=z.getState();h.draggedLightIndex!==null&&h.setDraggedLight(null),n.current&&(n.current=!1,s.current&&cancelAnimationFrame(s.current),h.setInteractionMode("none"),navigator.vibrate&&navigator.vibrate(20)),i.current&&(i.current=!1,s.current&&cancelAnimationFrame(s.current),wt.endFocusPick(),h.setInteractionMode("none"),navigator.vibrate&&navigator.vibrate(20))};return window.addEventListener("pointerdown",c),window.addEventListener("pointermove",d),window.addEventListener("pointerup",f),()=>{window.removeEventListener("pointerdown",c),window.removeEventListener("pointermove",d),window.removeEventListener("pointerup",f),s.current&&cancelAnimationFrame(s.current)}},[e])},Fc=e=>{const{interactionMode:n,setInteractionMode:t,setRenderRegion:o,renderRegion:i}=z(),s=n==="selecting_region",[r,l]=M.useState(null),[c,d]=M.useState(null),[f,h]=M.useState(null),p=M.useRef(null),u=M.useRef(null),g=M.useRef(null),v=(y,b)=>({x:Math.max(0,Math.min(1,(y.clientX-b.left)/b.width)),y:Math.max(0,Math.min(1,(y.clientY-b.top)/b.height))});return M.useEffect(()=>{if(!e.current)return;const y=e.current,b=C=>{const k=C.target,w=y.getBoundingClientRect(),S=v(C,w);if(i&&!s){const j=k.dataset.handle;if(j||k.closest(".region-box")){C.stopPropagation(),p.current=j||"move",l({x:S.x,y:S.y}),u.current={...i},h({...i}),g.current={...i};return}}if(s){C.stopPropagation(),p.current="draw";const j=C.clientX-w.left,R=C.clientY-w.top;l({x:j,y:R}),d({x:j,y:R})}},x=C=>{if(!p.current)return;C.stopPropagation(),C.preventDefault();const k=y.getBoundingClientRect();if(p.current==="draw"){const w=Math.max(0,Math.min(k.width,C.clientX-k.left)),S=Math.max(0,Math.min(k.height,C.clientY-k.top));d({x:w,y:S})}else if(u.current&&r){const w=v(C,k),S=w.x-r.x,j=1-w.y-(1-r.y);let R={...u.current};const I=p.current;if(I==="move"){const L=R.maxX-R.minX,E=R.maxY-R.minY;R.minX+=S,R.maxX+=S,R.minY+=j,R.maxY+=j,R.minX<0&&(R.minX=0,R.maxX=L),R.maxX>1&&(R.maxX=1,R.minX=1-L),R.minY<0&&(R.minY=0,R.maxY=E),R.maxY>1&&(R.maxY=1,R.minY=1-E)}else I!=null&&I.includes("e")&&(R.maxX=Math.min(1,u.current.maxX+S)),I!=null&&I.includes("w")&&(R.minX=Math.max(0,u.current.minX+S)),I!=null&&I.includes("n")&&(R.maxY=Math.min(1,u.current.maxY+j)),I!=null&&I.includes("s")&&(R.minY=Math.max(0,u.current.minY+j));const N={minX:Math.min(R.minX,R.maxX),maxX:Math.max(R.minX,R.maxX),minY:Math.min(R.minY,R.maxY),maxY:Math.max(R.minY,R.maxY)};N.maxX-N.minX<.01&&(N.maxX=N.minX+.01),N.maxY-N.minY<.01&&(N.maxY=N.minY+.01),h(N),g.current=N}},m=C=>{if(p.current){if(C.stopPropagation(),p.current==="draw"&&r&&c){const k=y.getBoundingClientRect(),w=Math.min(r.x,c.x),S=Math.max(r.x,c.x),j=Math.min(r.y,c.y),R=Math.max(r.y,c.y),I=S-w,N=R-j;if(I>10&&N>10){const L=w/k.width,E=S/k.width,D=1-R/k.height,A=1-j/k.height;o({minX:L,minY:D,maxX:E,maxY:A})}t("none")}else g.current&&o(g.current);p.current=null,l(null),d(null),u.current=null,h(null),g.current=null}};return y.addEventListener("mousedown",b),window.addEventListener("mousemove",x),window.addEventListener("mouseup",m),()=>{y.removeEventListener("mousedown",b),window.removeEventListener("mousemove",x),window.removeEventListener("mouseup",m)}},[s,i,r,c,t,o,e]),{visualRegion:f,isGhostDragging:!!f,renderRegion:i,isSelectingRegion:s}},Ut=xe(),he={lowFpsBuffer:0,lastTime:performance.now(),lastFrameCount:0,setShowWarning:null,setCurrentFps:null,isPaused:!1,isScrubbing:!1,isExporting:!1,isBroadcastMode:!1,renderMode:"PathTracing",frameTimestamps:[]},Ac=()=>{const e=performance.now();he.frameTimestamps.push(e);const n=e-2e3;if(he.frameTimestamps=he.frameTimestamps.filter(o=>o>n),e-he.lastTime>=500){let o=0;if(he.frameTimestamps.length>1){const l=he.frameTimestamps[0],d=he.frameTimestamps[he.frameTimestamps.length-1]-l;o=(he.frameTimestamps.length-1)/d*1e3}he.lastTime=e,he.lastFrameCount=Ut.frameCount;const i=z.getState(),s=i.sampleCap>0&&Ut.accumulationCount>=i.sampleCap;if(he.isPaused||he.isScrubbing||document.hidden||Ut.isCompiling||he.isExporting||s)he.lowFpsBuffer=0;else if(e<8e3)he.lowFpsBuffer=0;else{he.setCurrentFps&&he.setCurrentFps(o);const l=he.renderMode==="PathTracing",c=l?10:15,d=l?22:30;o<c?he.lowFpsBuffer+=o<5?2:1:o>=d&&(he.lowFpsBuffer=Math.max(0,he.lowFpsBuffer-3),he.lowFpsBuffer===0&&he.setShowWarning&&he.setShowWarning(!1)),he.lowFpsBuffer>=5&&he.setShowWarning&&he.setShowWarning(!0)}}},zc=()=>{const e=M.useRef(0);M.useRef(performance.now()),M.useRef(0);const{resolutionMode:n,setResolutionMode:t,setFixedResolution:o,fixedResolution:i,isExporting:s,isBroadcastMode:r,openContextMenu:l,aaLevel:c,setAALevel:d,renderMode:f,quality:h}=z(),p=z(D=>D.isPaused),u=le(D=>D.isScrubbing),[g,v]=M.useState(!1),[y,b]=M.useState(60);M.useEffect(()=>(he.setShowWarning=v,he.setCurrentFps=b,he.isPaused=p,he.isScrubbing=u,he.isExporting=s,he.isBroadcastMode=r,he.renderMode=f,he.lastTime=performance.now(),he.lastFrameCount=Ut.frameCount,()=>{he.setShowWarning===v&&(he.setShowWarning=null),he.setCurrentFps===b&&(he.setCurrentFps=null)}),[p,u,s,r,f]);const x=D=>{const A=Xe(D.currentTarget);A.length>0&&(D.preventDefault(),D.stopPropagation(),l(D.clientX,D.clientY,[],A))};if(r||!g)return null;let m=window.innerWidth,C=window.innerHeight;if(Ut.renderer){const D=Ut.renderer.domElement;m=D.width,C=D.height}else n==="Fixed"&&(m=i[0],C=i[1]);const k=m>480,w=()=>{const D=Math.max(320,Math.round(m*.66/8)*8),A=Math.max(240,Math.round(C*.66/8)*8);t("Fixed"),o(D,A),E()},S=c>1,j=()=>{d(1),E()},R=h,N=!((R==null?void 0:R.precisionMode)===1),L=()=>{const D=z.getState().setQuality,A=z.getState().setLighting;D&&D({precisionMode:1,bufferPrecision:1}),A&&A({shadows:!1}),E()},E=()=>{v(!1),e.current=-10};return a.jsx("div",{className:"absolute top-2 right-4 z-[50] pointer-events-auto animate-fade-in-left origin-top-right max-w-[200px]","data-help-id":"ui.performance",onContextMenu:x,children:a.jsxs("div",{className:"flex flex-col gap-1 bg-red-950/90 border border-red-500/30 rounded-lg shadow-xl backdrop-blur-md p-2",children:[a.jsxs("div",{className:"flex items-center justify-between mb-1",children:[a.jsxs("div",{className:"flex items-center gap-2 text-red-200 text-[10px] font-bold",children:[a.jsx(qt,{}),a.jsxs("span",{children:["Low FPS (",y.toFixed(1),")"]})]}),a.jsx("button",{onClick:()=>{v(!1),e.current=-40},className:"text-red-400 hover:text-white transition-colors p-0.5",title:"Dismiss",children:a.jsx(wn,{})})]}),a.jsxs("div",{className:"flex flex-col gap-1",children:[S&&a.jsxs("button",{onClick:j,className:"flex items-center justify-between bg-black/40 hover:bg-white/10 text-gray-300 text-[9px] px-2 py-1.5 rounded transition-colors border border-white/5",children:[a.jsxs("span",{className:"flex items-center gap-1.5",children:[a.jsx(vn,{})," Reset Scale (1x)"]}),a.jsx("span",{className:"text-cyan-400 font-bold",children:"Fix"})]}),N&&a.jsxs("button",{onClick:L,className:"flex items-center justify-between bg-black/40 hover:bg-white/10 text-gray-300 text-[9px] px-2 py-1.5 rounded transition-colors border border-white/5",children:[a.jsxs("span",{className:"flex items-center gap-1.5",children:[a.jsx(Na,{})," Enable Lite Mode"]}),a.jsx("span",{className:"text-cyan-400 font-bold",children:"Fix"})]}),k&&a.jsxs("button",{onClick:w,className:"flex items-center justify-between bg-black/40 hover:bg-white/10 text-gray-300 text-[9px] px-2 py-1.5 rounded transition-colors border border-white/5",children:[a.jsxs("span",{className:"flex items-center gap-1.5",children:[a.jsx(Rt,{})," Reduce Resolution"]}),a.jsx("span",{className:"text-cyan-400 font-bold",children:"-33%"})]})]})]})})},Oc=[{label:"Maximum",ratio:"Max"},{label:"Square (1:1)",ratio:1},{label:"Landscape (16:9)",ratio:1.7777},{label:"Portrait (4:5)",ratio:.8},{label:"Social (9:16)",ratio:.5625},{label:"Cinematic (2.35:1)",ratio:2.35},{label:"Classic (4:3)",ratio:1.3333},{label:"Skybox (2:1)",ratio:2}],$c=({width:e,height:n,top:t,left:o,maxAvailableWidth:i,maxAvailableHeight:s,onSetResolution:r,onSetMode:l})=>{const[c,d]=M.useState(!1),f=M.useRef(null),h=M.useRef(null),p=z(x=>x.openContextMenu);M.useEffect(()=>{if(!c)return;const x=m=>{f.current&&!f.current.contains(m.target)&&d(!1)};return window.addEventListener("mousedown",x),()=>window.removeEventListener("mousedown",x)},[c]);const u=x=>{const m=Xe(x.currentTarget);m.length>0&&(x.preventDefault(),x.stopPropagation(),p(x.clientX,x.clientY,[],m))},g=x=>{x.preventDefault(),x.stopPropagation(),x.target.setPointerCapture(x.pointerId),h.current={startX:x.clientX,startY:x.clientY,startW:e,startH:n,hasMoved:!1}},v=x=>{if(!h.current)return;const m=h.current.startX-x.clientX,C=h.current.startY-x.clientY;(Math.abs(m)>3||Math.abs(C)>3)&&(h.current.hasMoved=!0);const k=Math.round(C/4),w=Math.round(m/20),j=(k+w)*8;if(j!==0){const R=h.current.startW/h.current.startH,I=Math.max(64,h.current.startW+j),N=Math.round(I/8)*8,L=N/R,E=Math.max(64,Math.round(L/8)*8);r(N,E)}},y=x=>{x.target.releasePointerCapture(x.pointerId),h.current&&!h.current.hasMoved&&d(m=>!m),h.current=null},b=x=>{const C=Math.max(100,i-40),k=Math.max(100,s-40);let w,S;x==="Max"?(w=C,S=k):C/k>x?(S=k,w=S*x):(w=C,S=w/x);const j=Math.round(w/8)*8,R=Math.round(S/8)*8;r(j,R),d(!1)};return a.jsxs("div",{className:"absolute flex items-center gap-2 z-50 transition-all duration-100 ease-out",style:{top:t,left:o},"data-help-id":"ui.resolution",onContextMenu:u,children:[a.jsxs("div",{className:"relative text-[10px] font-mono text-gray-400 bg-black/80 px-2 py-1 rounded border border-white/10 shadow-sm backdrop-blur-md cursor-ns-resize hover:text-white hover:border-cyan-500/50 transition-colors select-none flex items-center gap-2",onPointerDown:g,onPointerMove:v,onPointerUp:y,title:"Drag Up or Left to Increase Size",children:[a.jsxs("span",{children:[e," ",a.jsx("span",{className:"text-gray-600",children:"x"})," ",n]}),a.jsx("span",{className:"opacity-50",children:a.jsx(ia,{})})]}),c&&a.jsxs("div",{ref:f,className:"absolute top-8 left-0 w-32 bg-black border border-white/20 rounded shadow-xl z-50 overflow-hidden flex flex-col py-1 animate-fade-in",children:[a.jsx("div",{className:"px-3 py-1 text-[8px] font-bold text-gray-500 border-b border-white/10 mb-1",children:"Fit to Window"}),Oc.map(x=>a.jsx("button",{onClick:()=>b(x.ratio),className:"text-left px-3 py-1.5 text-[10px] text-gray-300 hover:bg-white/10 hover:text-white transition-colors flex justify-between",children:a.jsx("span",{children:x.label})},x.label))]}),a.jsxs("button",{onClick:x=>{x.stopPropagation(),l("Full")},className:"flex items-center gap-1.5 text-[9px] font-bold text-gray-300 bg-black/80 px-2 py-1 rounded border border-white/10 hover:border-cyan-500/50 hover:text-cyan-400 hover:bg-cyan-900/30 transition-all shadow-sm backdrop-blur-md group",title:"Return to Fullscreen Mode",children:[a.jsx("span",{className:"w-2 h-2 border border-current rounded-sm group-hover:scale-110 transition-transform"}),"Fill"]})]})},Bc=({width:e,height:n})=>{const t=z(c=>c.compositionOverlay),o=z(c=>c.compositionOverlaySettings);if(t==="none"||!t)return null;const{opacity:i,lineThickness:s,color:r}=o;let l=r;if(r.startsWith("#")){const c=bt(r);c&&(l=`rgba(${c.r},${c.g},${c.b},${i})`)}else r.startsWith("rgba")?l=r.replace(/rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)/,`rgba($1,$2,$3,${i})`):r.startsWith("rgb(")&&(l=r.replace(/rgb\(([^,]+),([^,]+),([^)]+)\)/,`rgba($1,$2,$3,${i})`));return a.jsxs("svg",{className:"absolute inset-0 pointer-events-none z-[15]",width:e,height:n,style:{mixBlendMode:"difference"},children:[t==="grid"&&a.jsx(Hc,{width:e,height:n,strokeColor:l,lineThickness:s,divisionsX:o.gridDivisionsX,divisionsY:o.gridDivisionsY}),t==="thirds"&&a.jsx(Gc,{width:e,height:n,strokeColor:l,lineThickness:s}),t==="golden"&&a.jsx(yr,{width:e,height:n,strokeColor:l,lineThickness:s}),t==="spiral"&&a.jsx(Uc,{width:e,height:n,strokeColor:l,lineThickness:s,rotation:o.spiralRotation,positionX:o.spiralPositionX,positionY:o.spiralPositionY,scale:o.spiralScale,ratio:o.spiralRatio}),t==="center"&&a.jsx(wo,{width:e,height:n,strokeColor:l,lineThickness:s}),t==="diagonal"&&a.jsx(Wc,{width:e,height:n,strokeColor:l,lineThickness:s}),t==="safearea"&&a.jsx(So,{width:e,height:n,strokeColor:l,lineThickness:s}),o.showCenterMark&&t!=="center"&&a.jsx(wo,{width:e,height:n,strokeColor:l,lineThickness:s}),o.showSafeAreas&&t!=="safearea"&&a.jsx(So,{width:e,height:n,strokeColor:l,lineThickness:s*.5})]})},Hc=({width:e,height:n,strokeColor:t,lineThickness:o,divisionsX:i=4,divisionsY:s=4})=>{const r=[];for(let l=1;l<i;l++){const c=e/i*l;r.push(a.jsx("line",{x1:c,y1:0,x2:c,y2:n,stroke:t,strokeWidth:o*.5},`v${l}`))}for(let l=1;l<s;l++){const c=n/s*l;r.push(a.jsx("line",{x1:0,y1:c,x2:e,y2:c,stroke:t,strokeWidth:o*.5},`h${l}`))}return a.jsx(a.Fragment,{children:r})},Gc=({width:e,height:n,strokeColor:t,lineThickness:o})=>{const i=e/3,s=n/3;return a.jsxs(a.Fragment,{children:[a.jsx("line",{x1:i,y1:0,x2:i,y2:n,stroke:t,strokeWidth:o}),a.jsx("line",{x1:i*2,y1:0,x2:i*2,y2:n,stroke:t,strokeWidth:o}),a.jsx("line",{x1:0,y1:s,x2:e,y2:s,stroke:t,strokeWidth:o}),a.jsx("line",{x1:0,y1:s*2,x2:e,y2:s*2,stroke:t,strokeWidth:o}),a.jsx("circle",{cx:i,cy:s,r:o*3,fill:t}),a.jsx("circle",{cx:i*2,cy:s,r:o*3,fill:t}),a.jsx("circle",{cx:i,cy:s*2,r:o*3,fill:t}),a.jsx("circle",{cx:i*2,cy:s*2,r:o*3,fill:t})]})},yr=({width:e,height:n,strokeColor:t,lineThickness:o})=>{const i=1.618033988749895,s=e/i,r=n/i;return a.jsxs(a.Fragment,{children:[a.jsx("line",{x1:s,y1:0,x2:s,y2:n,stroke:t,strokeWidth:o}),a.jsx("line",{x1:e-s,y1:0,x2:e-s,y2:n,stroke:t,strokeWidth:o}),a.jsx("line",{x1:0,y1:r,x2:e,y2:r,stroke:t,strokeWidth:o}),a.jsx("line",{x1:0,y1:n-r,x2:e,y2:n-r,stroke:t,strokeWidth:o}),a.jsx("circle",{cx:s,cy:r,r:o*3,fill:t}),a.jsx("circle",{cx:e-s,cy:r,r:o*3,fill:t}),a.jsx("circle",{cx:s,cy:n-r,r:o*3,fill:t}),a.jsx("circle",{cx:e-s,cy:n-r,r:o*3,fill:t})]})},Uc=({width:e,height:n,strokeColor:t,lineThickness:o,rotation:i=0,positionX:s=.5,positionY:r=.5,scale:l=1,ratio:c=1.618033988749895})=>{const d=Math.min(e,n),f=e*s,h=n*r,p=d*.45*l,u=i*Math.PI/180,g=[],v=3,y=100;for(let b=0;b<=y;b++){const x=b/y*v*2*Math.PI,m=p*Math.pow(c,-x/(2*Math.PI)),C=f+m*Math.cos(x+u),k=h+m*Math.sin(x+u);g.push(`${b===0?"M":"L"} ${C} ${k}`)}return a.jsxs(a.Fragment,{children:[a.jsx("path",{d:g.join(" "),fill:"none",stroke:t,strokeWidth:o*1.5,strokeLinecap:"round"}),a.jsx(yr,{width:e,height:n,strokeColor:t.replace(/[\d.]+\)$/,"0.2)"),lineThickness:o*.5})]})},wo=({width:e,height:n,strokeColor:t,lineThickness:o})=>{const i=e/2,s=n/2,r=Math.min(e,n)*.05;return a.jsxs(a.Fragment,{children:[a.jsx("line",{x1:i-r,y1:s,x2:i+r,y2:s,stroke:t,strokeWidth:o}),a.jsx("line",{x1:i,y1:s-r,x2:i,y2:s+r,stroke:t,strokeWidth:o}),a.jsx("circle",{cx:i,cy:s,r:r*.3,fill:"none",stroke:t,strokeWidth:o})]})},Wc=({width:e,height:n,strokeColor:t,lineThickness:o})=>a.jsxs(a.Fragment,{children:[a.jsx("line",{x1:0,y1:0,x2:e,y2:n,stroke:t,strokeWidth:o}),a.jsx("line",{x1:e,y1:0,x2:0,y2:n,stroke:t,strokeWidth:o}),a.jsx("line",{x1:e/2,y1:0,x2:e/2,y2:n,stroke:t,strokeWidth:o*.5,strokeDasharray:"4 4"}),a.jsx("line",{x1:0,y1:n/2,x2:e,y2:n/2,stroke:t,strokeWidth:o*.5,strokeDasharray:"4 4"})]}),So=({width:e,height:n,strokeColor:t,lineThickness:o})=>{const s=e*.05,r=n*.05,l=e*(1-.05*2),c=n*(1-.05*2),d=.1,f=e*d,h=n*d,p=e*(1-d*2),u=n*(1-d*2);return a.jsxs(a.Fragment,{children:[a.jsx("rect",{x:s,y:r,width:l,height:c,fill:"none",stroke:t,strokeWidth:o}),a.jsx("rect",{x:f,y:h,width:p,height:u,fill:"none",stroke:t,strokeWidth:o*.5,strokeDasharray:"4 4"}),[[s,r],[s+l,r],[s,r+c],[s+l,r+c]].map(([g,v],y)=>a.jsx("circle",{cx:g,cy:v,r:o*2,fill:t},y))]})},qc=(e,n,t,o)=>{const{gl:i}=Cn(),s=z(x=>x.invertY),r=z(x=>x.debugMobileLayout),l=M.useRef({forward:!1,backward:!1,left:!1,right:!1,up:!1,down:!1,rollLeft:!1,rollRight:!1,boost:!1}),c=M.useRef(!1),d=M.useRef({x:0,y:0}),f=M.useRef({x:0,y:0}),h=M.useRef(0),p=M.useRef(0),u=M.useRef({x:0,y:0}),g=M.useRef({x:0,y:0}),v=M.useRef(n);M.useEffect(()=>{v.current=n},[n]);const y=()=>{h.current=performance.now()};return M.useEffect(()=>{u.current={x:0,y:0},g.current={x:0,y:0},p.current=0,y()},[e]),Da((x,m)=>{const C=l.current.rollLeft?1:l.current.rollRight?-1:0,w=1-Math.exp(-(C!==0?1:3)*m),S=Math.max(.1,v.current);p.current+=(C*S-p.current)*w,C===0&&Math.abs(p.current)<.001&&(p.current=0)}),M.useEffect(()=>{const x=j=>{var L;const R=j.target;if(R.tagName==="INPUT"||R.tagName==="TEXTAREA"||R.isContentEditable||(L=R.closest)!=null&&L.call(R,".cm-editor")||((j.ctrlKey||j.metaKey)&&(j.key==="w"||j.code==="KeyW")&&j.preventDefault(),j.code==="Space"&&j.preventDefault(),j.key==="Alt"&&j.preventDefault(),z.getState().isTimelineHovered))return;let N=!0;switch(j.code){case"KeyW":l.current.forward=!0;break;case"KeyS":l.current.backward=!0;break;case"KeyA":l.current.left=!0;break;case"KeyD":l.current.right=!0;break;case"KeyQ":l.current.rollLeft=!0;break;case"KeyE":l.current.rollRight=!0;break;case"Space":l.current.up=!0;break;case"KeyC":l.current.down=!0;break;case"ShiftLeft":case"ShiftRight":l.current.boost=!0;break;default:N=!1}N&&y()},m=j=>{var I;j.key==="Alt"&&j.preventDefault();const R=j.target;if(!(R.tagName==="INPUT"||R.tagName==="TEXTAREA"||R.isContentEditable||(I=R.closest)!=null&&I.call(R,".cm-editor")))switch(j.code){case"KeyW":l.current.forward=!1;break;case"KeyS":l.current.backward=!1;break;case"KeyA":l.current.left=!1;break;case"KeyD":l.current.right=!1;break;case"KeyQ":l.current.rollLeft=!1;break;case"KeyE":l.current.rollRight=!1;break;case"Space":l.current.up=!1;break;case"KeyC":l.current.down=!1;break;case"ShiftLeft":case"ShiftRight":l.current.boost=!1;break}},C=j=>{const R=z.getState();if(dn(R))return;if(R.optics&&Math.abs(R.optics.camType-1)<.1){const L=j.deltaY>0?1:-1,D=R.optics.orthoScale*(1+L*.1);R.setOptics({orthoScale:Math.max(1e-10,Math.min(1e3,D))}),y();return}if(e==="Fly"){const L=j.deltaY>0?-1:1;let E=v.current,D=.01;E<.05&&(D=.005),E>.1&&(D=.02);let A=Math.max(.001,Math.min(1,E+L*D));v.current=A,t(A),y()}else e==="Orbit"&&y()},k=()=>{l.current={forward:!1,backward:!1,left:!1,right:!1,up:!1,down:!1,rollLeft:!1,rollRight:!1,boost:!1}},w=j=>{u.current=j.detail,y()},S=j=>{g.current=j.detail,y()};return window.addEventListener("keydown",x),window.addEventListener("keyup",m),window.addEventListener("blur",k),window.addEventListener("joyMove",w),window.addEventListener("joyLook",S),i.domElement.addEventListener("wheel",C,{passive:!0}),()=>{window.removeEventListener("keydown",x),window.removeEventListener("keyup",m),window.removeEventListener("blur",k),window.removeEventListener("joyMove",w),window.removeEventListener("joyLook",S),i.domElement.removeEventListener("wheel",C)}},[e,i,t]),M.useEffect(()=>{const x=i.domElement,m=(S,j)=>{const R=x.getBoundingClientRect();return{x:(S-R.left)/R.width*2-1,y:-((j-R.top)/R.height)*2+1}},C=S=>{const j=z.getState();if(dn(j))return;if(o){if(Object.values(o).some(N=>N.current&&N.current.contains(S.target)))return}else if(S.target.closest(".pointer-events-auto"))return;if(!((r||window.innerWidth<768||S.pointerType==="touch")&&e==="Fly")&&(y(),S.button===0&&e==="Fly")){c.current=!0;const{x:I,y:N}=m(S.clientX,S.clientY);d.current={x:I,y:N},f.current={x:I,y:N}}},k=S=>{if(c.current){const{x:j,y:R}=m(S.clientX,S.clientY);f.current={x:j,y:R},y()}else e==="Orbit"&&S.buttons>0&&(S.target===x||x.contains(S.target))&&y()},w=()=>c.current=!1;return x.addEventListener("mousedown",C),window.addEventListener("mousemove",k),window.addEventListener("mouseup",w),()=>{x.removeEventListener("mousedown",C),window.removeEventListener("mousemove",k),window.removeEventListener("mouseup",w)}},[e,i,r,o]),{moveState:l,isDraggingRef:c,dragStart:d,mousePos:f,speedRef:v,joystickMove:u,joystickLook:g,invertY:s,rollVelocity:p,isInteracting:()=>{const x=l.current,m=x.forward||x.backward||x.left||x.right||x.up||x.down||x.rollLeft||x.rollRight,C=Math.abs(u.current.x)>.01||Math.abs(u.current.y)>.01||Math.abs(g.current.x)>.01||Math.abs(g.current.y)>.01,k=performance.now()-h.current<200;return c.current||m||C||k}}},St=xe(),pa=10,Vc=e=>e<.001?e.toExponential(2):e.toFixed(4),Yc=(e,n)=>{const t=z(h=>h.quality),o=M.useRef(1),i=M.useRef(!1),s=M.useRef(0),r=M.useRef(new Float32Array(4)),l=()=>{e.speed.current&&s.current%10===0&&(e.speed.current.innerText=`SPD ${(n.current*100).toFixed(1)}%`)},c=(h,p,u)=>{e.dist.current&&(e.dist.current.innerText=`DST ${Vc(h)}${p?` ${p}`:""}`,e.dist.current.style.color=u??(h<1?"#ff4444":"#00ffff"))},d=h=>{e.reset.current&&(e.reset.current.style.display=h>pa||h<.001?"block":"none")},f=h=>{if(h<0||h>=pa||!Number.isFinite(h)){i.current||(o.current=1,St.lastMeasuredDistance=1),c(o.current,"(sky)","#888"),e.reset.current&&(e.reset.current.style.display="block");return}i.current=!0;const p=o.current;let u=h;p>0&&h>p*1.5?u=p+(h-p)*.08:h<p&&(u=p+(h-p)*.4),o.current=u,St.lastMeasuredDistance=u,c(u),d(u)};return Da(()=>{var y,b,x,m,C;if(s.current++,!St.hasCompiledShader||s.current<15){s.current%10===0&&(c(o.current),l());return}if(!t)return;if((t.physicsProbeMode??0)===2){const k=t.manualDistance;o.current=k,St.lastMeasuredDistance=k,c(k),d(k),l();return}const p=St.renderer;if(!p){const k=St.lastMeasuredDistance;if(k!==o.current){f(k);const w=o.current,S=z.getState();if(S.focusLock&&w>0&&w<pa){const j=((y=S.optics)==null?void 0:y.dofFocus)??0;Math.abs(w-j)/Math.max(j,1e-4)>.01&&S.setOptics({dofFocus:w})}}l();return}const u=(x=(b=St.pipeline)==null?void 0:b.getPreviousRenderTarget)==null?void 0:x.call(b);if(!u||u.width<=0||u.height<=0){s.current%10===0&&(c(o.current),l());return}const{width:g,height:v}=u;try{const k=Math.floor(g/2),w=Math.floor(v/2);let S=0,j=0;for(let R=-1;R<=1;R++)for(let I=-1;I<=1;I++){const N=k+R,L=w+I;if(N<0||N>=g||L<0||L>=v)continue;if((C=(m=St.pipeline)==null?void 0:m.readPixels)==null?void 0:C.call(m,p,N,L,1,1,r.current)){const D=r.current[3];D>0&&D<pa&&Number.isFinite(D)&&(S+=D,j++)}}f(j>0?S/j:1/0)}catch(k){console.warn("Depth readback failed:",k)}l()}),{distAverageRef:o}};class Xc{constructor(){Q(this,"currentRotVelocity",new V);Q(this,"rollVelocity",0);Q(this,"smoothedDistEstimate",1);Q(this,"ROTATION_SMOOTHING",20);Q(this,"ROLL_SMOOTHING",3);Q(this,"SENSITIVITY",2.5);Q(this,"DIST_INCREASE_LERP_RATE",1.2)}reset(){this.currentRotVelocity.set(0,0,0),this.rollVelocity=0,this.smoothedDistEstimate=1}applyCurve(n){return Math.sign(n)*Math.pow(Math.abs(n),2)}update(n,t,o,i){let s=!1;const r=i.distEstimate,l=Math.min(t,.1);if(r>this.smoothedDistEstimate){const k=1-Math.exp(-this.DIST_INCREASE_LERP_RATE*l);this.smoothedDistEstimate+=(r-this.smoothedDistEstimate)*k}else this.smoothedDistEstimate=r;const c=this.smoothedDistEstimate,d=o.move.boost?4:1,f=i.autoSlow?Math.max(c*i.baseSpeed*d,1e-6):2*i.baseSpeed*d,h=new V(0,0,0);if(o.move.forward&&(h.z-=1),o.move.backward&&(h.z+=1),o.move.left&&(h.x-=1),o.move.right&&(h.x+=1),o.move.up&&(h.y+=1),o.move.down&&(h.y-=1),(Math.abs(o.moveJoy.x)>.01||Math.abs(o.moveJoy.y)>.01)&&(h.z-=this.applyCurve(o.moveJoy.y),h.x+=this.applyCurve(o.moveJoy.x)),h.lengthSq()>0){h.normalize().multiplyScalar(f*l);const k=h.clone().applyQuaternion(n.quaternion);Y.emit("offset_shift",{x:k.x,y:k.y,z:k.z}),s=!0}const u=o.move.rollLeft?1:o.move.rollRight?-1:0,g=u!==0?1:this.ROLL_SMOOTHING,v=1-Math.exp(-g*t),y=Math.max(.1,i.baseSpeed);this.rollVelocity+=(u*y-this.rollVelocity)*v,u===0&&Math.abs(this.rollVelocity)<.001&&(this.rollVelocity=0);const b=new V(0,0,0),x=o.invertY?-1:1,m=Math.abs(o.look.x)>.01||Math.abs(o.look.y)>.01;o.isDragging?(b.y=-o.dragDelta.x*2,b.x=o.dragDelta.y*2*x):m&&(b.y=-this.applyCurve(o.look.x)*.66,b.x=this.applyCurve(o.look.y)*.66*x),b.z=this.rollVelocity*.62;const C=1-Math.exp(-this.ROTATION_SMOOTHING*l);if(this.currentRotVelocity.lerp(b,C),this.currentRotVelocity.lengthSq()<1e-6&&this.currentRotVelocity.set(0,0,0),this.currentRotVelocity.lengthSq()>1e-8){const k=this.currentRotVelocity;n.rotateX(k.x*l*this.SENSITIVITY),n.rotateY(k.y*l*this.SENSITIVITY),n.rotateZ(k.z*l*this.SENSITIVITY),s=!0}return s}}const De=xe(),Zc=({mode:e,onStart:n,onEnd:t,hudRefs:o,setSceneOffset:i,fitScale:s=1})=>{const{camera:r,gl:l}=Cn(),c=M.useRef(null),d=z(dn),f=z(K=>K.optics),h=f&&Math.abs(f.camType-1)<.1,p=z(K=>K.navigation),u=z(K=>K.setNavigation),g=le(K=>K.setIsCameraInteracting),[v,y]=M.useState(e==="Orbit"),b=M.useRef(new V(0,0,0)),x=M.useRef(new Xc),m=M.useRef(3.5),C=M.useRef({x:0,y:0,z:0,xL:0,yL:0,zL:0}),k=M.useRef(new V),w=M.useRef(new Oe),S=M.useRef(new V),j=M.useRef(new V);M.useRef(0);const R=M.useRef(null),{moveState:I,isDraggingRef:N,dragStart:L,mousePos:E,speedRef:D,joystickMove:A,joystickLook:T,invertY:G,rollVelocity:H,isInteracting:W}=qc(e,(p==null?void 0:p.flySpeed)??.5,K=>u({flySpeed:K}),o),{distAverageRef:B}=Yc(o,D),_=(K=!1)=>{if(r.position.lengthSq()<1e-8)return;const ue=De.sceneOffset,Ee={x:ue.x,y:ue.y,z:ue.z,xL:(ue.xL??0)+r.position.x,yL:(ue.yL??0)+r.position.y,zL:(ue.zL??0)+r.position.z};if(m.current=r.position.length()||m.current,r.position.set(0,0,0),r.updateMatrixWorld(),c.current){const Fe=new V(0,0,-1).applyQuaternion(r.quaternion);c.current.target.copy(Fe.multiplyScalar(1e-4)),b.current.copy(c.current.target)}K?De.queueOffsetSync(Ee):i(Ee),k.current.set(0,0,0)},U=K=>{r.updateMatrixWorld(),r.up.copy(new V(0,1,0).applyQuaternion(r.quaternion));let ue=K||De.lastMeasuredDistance;(ue<=1e-7||ue>=1e3)&&(ue=z.getState().targetDistance||3.5),m.current=ue;const Ee=new V(0,0,-1).applyQuaternion(r.quaternion),Fe=new V().copy(r.position).addScaledVector(Ee,ue);b.current.copy(Fe),y(!0)};M.useEffect(()=>{const K=z.getState();r.position.set(0,0,0),r.quaternion.set(K.cameraRot.x,K.cameraRot.y,K.cameraRot.z,K.cameraRot.w),r.updateMatrixWorld(),k.current.copy(r.position),w.current.copy(r.quaternion),K.targetDistance&&(B.current=K.targetDistance,m.current=K.targetDistance),e==="Orbit"&&U(K.targetDistance)},[]),M.useEffect(()=>{const K=pe=>{if(r.position.set(pe.position.x,pe.position.y,pe.position.z),r.quaternion.set(pe.rotation.x,pe.rotation.y,pe.rotation.z,pe.rotation.w),r.updateMatrixWorld(),S.current.set(0,0,0),j.current.set(0,0,0),x.current.reset(),k.current.copy(r.position),w.current.copy(r.quaternion),pe.targetDistance&&pe.targetDistance>.001&&(B.current=pe.targetDistance,m.current=pe.targetDistance,De.lastMeasuredDistance=pe.targetDistance),pe.sceneOffset&&(i(pe.sceneOffset),De.shouldSnapCamera=!0,De.dirty=!0),e==="Orbit"){const Be=pe.targetDistance||B.current||3.5;m.current=Be;const gt=new V(0,0,-1).applyQuaternion(r.quaternion);b.current.copy(r.position).addScaledVector(gt,Be),c.current&&(c.current.target.copy(b.current),c.current.update())}},ue=()=>{},Ee=pe=>{if(!pe.sceneOffset){K(pe);return}const Be=De.sceneOffset,gt=new V(Be.x+(Be.xL??0)+r.position.x,Be.y+(Be.yL??0)+r.position.y,Be.z+(Be.zL??0)+r.position.z),Se=pe.sceneOffset,$e=new V(Se.x+(Se.xL??0)+pe.position.x,Se.y+(Se.yL??0)+pe.position.y,Se.z+(Se.zL??0)+pe.position.z);if(gt.distanceTo($e)<1e-6){K(pe);return}R.current={active:!0,startPos:gt,startRot:r.quaternion.clone(),endState:pe,endPos:$e,endRot:new Oe(pe.rotation.x,pe.rotation.y,pe.rotation.z,pe.rotation.w),elapsed:0,duration:.5}},Fe=Y.on("camera_teleport",K),Bt=Y.on("reset_accum",ue),at=Y.on("camera_transition",Ee);return()=>{Fe(),Bt(),at()}},[e,r]);const O=le(K=>K.isPlaying),P=le(K=>K.isScrubbing),$=le(K=>K.isRecording),F=le(K=>K.recordCamera),q=le(K=>K.currentFrame),Z=le(K=>K.sequence),X=le(K=>K.captureCameraFrame),ee=M.useRef(!1),te=M.useRef(null),re=M.useRef(e),oe=M.useRef(!1),me=M.useRef(!1),Ie=M.useRef(null),de=M.useRef(O),ae=M.useRef(P),ie=M.useRef(1),Re=M.useRef(!1),Ne=M.useRef(!1);M.useEffect(()=>{const K=l.domElement,ue=()=>{me.current=!0,Ie.current&&clearTimeout(Ie.current),Ie.current=setTimeout(()=>{me.current=!1},100)};return K.addEventListener("wheel",ue,{passive:!0}),()=>{K.removeEventListener("wheel",ue),Ie.current&&clearTimeout(Ie.current)}},[l,e]),M.useEffect(()=>{if(e!=="Orbit")return;const K=l.domElement,ue=Fe=>{if(Fe.target.closest(".pointer-events-auto")){Ne.current=!1;return}Ne.current=!0,c.current&&(c.current.enabled=!0)},Ee=()=>{Ne.current=!1};return K.addEventListener("pointerdown",ue,{capture:!0}),window.addEventListener("pointerup",Ee),()=>{K.removeEventListener("pointerdown",ue,{capture:!0}),window.removeEventListener("pointerup",Ee)}},[e,l]);const ye=O&&(!$||!F)&&Object.keys(Z.tracks).some(K=>K.startsWith("camera."))||P;return Re.current=ye,M.useEffect(()=>{ye?y(!1):e==="Orbit"&&!v&&U()},[ye,e]),M.useLayoutEffect(()=>{if(re.current!==e){if(Y.emit("camera_snap",void 0),_(),e==="Fly"){Y.emit("camera_snap",void 0),k.current.set(0,0,0),S.current.set(0,0,0),j.current.set(0,0,0),x.current.reset(),y(!1);const K=De.lastMeasuredDistance;K>.001?B.current=K:m.current>.001&&(B.current=m.current)}else e==="Orbit"&&U();re.current=e}},[e,r]),Da((K,ue)=>{var gt;const Ee=de.current&&!O,Fe=ae.current&&!P;if((Ee||Fe)&&(Y.emit("camera_snap",void 0),e==="Orbit")){const Se=B.current||De.lastMeasuredDistance||3.5;m.current=Se;const $e=new V(0,0,-1).applyQuaternion(r.quaternion);b.current.copy(r.position).addScaledVector($e,Se),c.current&&(c.current.target.copy(b.current),c.current.update())}if(de.current=O,ae.current=P,(gt=R.current)!=null&&gt.active){const Se=R.current;Se.elapsed+=ue;const $e=Math.min(Se.elapsed/Se.duration,1),J=$e*$e*(3-2*$e),ce=new V().lerpVectors(Se.startPos,Se.endPos,J),Me=Se.startRot.clone().slerp(Se.endRot,J),Ce=be.split(ce.x),Ke=be.split(ce.y),Le=be.split(ce.z),sa={x:Ce.high,y:Ke.high,z:Le.high,xL:Ce.low,yL:Ke.low,zL:Le.low};r.position.set(0,0,0),r.quaternion.copy(Me),r.updateMatrixWorld(),i(sa),De.shouldSnapCamera=!0,De.dirty=!0,k.current.copy(r.position),w.current.copy(r.quaternion),$e>=1&&(R.current=null,Y.emit("camera_teleport",Se.endState));return}if(ye){c.current&&(c.current.enabled=!1),g&&g(!1),De.isCameraInteracting=!1;return}e==="Orbit"&&!v&&U();const Bt=r.position.distanceToSquared(k.current)>1e-12,at=r.quaternion.angleTo(w.current)>1e-11,pe=W()||oe.current||me.current;if(pe&&R.current&&(R.current=null),g&&g(pe),De.isCameraInteracting=pe,pe&&(Bt||at)){if(De.dirty=!0,!ee.current&&n){ee.current=!0;const Se=De.virtualSpace?De.virtualSpace.getUnifiedCameraState(r,De.lastMeasuredDistance):{position:{x:r.position.x,y:r.position.y,z:r.position.z},rotation:{x:r.quaternion.x,y:r.quaternion.y,z:r.quaternion.z,w:r.quaternion.w},sceneOffset:{...De.sceneOffset},targetDistance:De.lastMeasuredDistance};n(Se)}$&&F&&X(q,!0,O?"Linear":"Bezier")}if((Bt||at||pe)&&(te.current&&clearTimeout(te.current),te.current=setTimeout(()=>{if(ee.current=!1,t&&t(),z.getState().isUserInteracting)return;let Se=De.lastMeasuredDistance;(Se<=0||Se>=1e3)&&(Se=z.getState().targetDistance||3.5);const $e=De.sceneOffset,J={x:$e.x,y:$e.y,z:$e.z,xL:($e.xL??0)+r.position.x,yL:($e.yL??0)+r.position.y,zL:($e.zL??0)+r.position.z};be.normalize(J),z.setState({cameraRot:{x:r.quaternion.x,y:r.quaternion.y,z:r.quaternion.z,w:r.quaternion.w},sceneOffset:J,targetDistance:Se})},100),k.current.copy(r.position),w.current.copy(r.quaternion)),e==="Fly"){if(d)return;const Se=N.current?E.current.x-L.current.x:0,$e=N.current?E.current.y-L.current.y:0;x.current.update(r,ue,{move:I.current,look:T.current,moveJoy:A.current,isDragging:N.current,dragDelta:{x:Se,y:$e},invertY:G},{baseSpeed:D.current,distEstimate:B.current,autoSlow:(p==null?void 0:p.autoSlow)??!0})}else if(e==="Orbit"&&c.current&&(c.current.enabled=!d&&!Re.current&&(Ne.current||oe.current||me.current),c.current.zoomSpeed=ie.current,c.current.rotateSpeed=1/(s||1),Math.abs(H.current)>.01)){const Se=new V;r.getWorldDirection(Se),r.up.applyAxisAngle(Se,-H.current*2*ue).normalize(),c.current.update()}const Be=De.sceneOffset;C.current={x:Be.x,y:Be.y,z:Be.z,xL:(Be.xL??0)+r.position.x,yL:(Be.yL??0)+r.position.y,zL:(Be.zL??0)+r.position.z}}),e!=="Orbit"||!v||ye?null:a.jsx(Pi,{ref:c,enabled:!d,makeDefault:!0,enableDamping:!1,target:b.current,enableZoom:!h,mouseButtons:{LEFT:Oa.ROTATE,MIDDLE:Oa.DOLLY,RIGHT:Oa.PAN},touches:{ONE:$n.ROTATE,TWO:$n.DOLLY_PAN},onStart:()=>{if(oe.current=!0,c.current){const K=B.current>0?B.current:z.getState().targetDistance||3.5;m.current=K;const ue=new V(0,0,-1).applyQuaternion(r.quaternion),Ee=new V().copy(r.position).addScaledVector(ue,K);c.current.target.copy(Ee),c.current.update(),c.current.saveState();const Fe=r.position.distanceTo(Ee);Fe>1e-8&&(ie.current=Math.max(.001,K/Fe*1.25)),k.current.copy(r.position)}},onEnd:()=>{oe.current=!1;const K=r.position.length();K>1e-4&&(m.current=K),_(!0)}})},Qc=xe(),Kc=()=>{const[e,n]=M.useState(!1),[t,o]=M.useState(0),i=M.useRef(0),s=M.useRef(0),r=M.useRef(15e3);M.useEffect(()=>{Qc.isCompiling&&n(!0);const u=y=>{n(y)},g=Y.on("is_compiling",u),v=Y.on("compile_estimate",y=>{r.current=Math.max(2e3,y)});return()=>{g(),v()}},[]),M.useEffect(()=>{if(e){s.current=performance.now(),o(0);const u=r.current,g=()=>{const y=(performance.now()-s.current)/u,b=Math.min(95,95*(1-Math.exp(-3*y)));o(b),i.current=requestAnimationFrame(g)};i.current=requestAnimationFrame(g)}else t>0&&(cancelAnimationFrame(i.current),o(100));return()=>cancelAnimationFrame(i.current)},[!!e]);const l=!!e||t>=100,[c,d]=M.useState(!1);M.useEffect(()=>{if(t>=100&&!e){const u=setTimeout(()=>d(!0),800),g=setTimeout(()=>{d(!1),o(0)},1400);return()=>{clearTimeout(u),clearTimeout(g)}}},[t>=100&&!e]);const f=typeof e=="string"?e:"Compiling Shader...",h=typeof e=="string"&&e.includes("Lighting"),p=l&&!c;return a.jsx("div",{className:`fixed top-16 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none transition-opacity duration-500 ${p?h?"opacity-60":"opacity-100":"opacity-0"}`,children:a.jsxs("div",{className:"bg-black/80 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-full flex flex-col items-center gap-1.5 shadow-lg min-w-[200px]",children:[a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsx(Wo,{className:`animate-spin h-3 w-3 ${h?"text-amber-400":"text-cyan-400"}`}),a.jsx("span",{className:`text-[9px] font-bold ${h?"text-amber-200":"text-cyan-200"}`,children:f}),a.jsxs("span",{className:"text-[9px] font-mono text-gray-500",children:[Math.floor(t),"%"]})]}),a.jsx("div",{className:"w-full h-1 bg-white/5 rounded-full overflow-hidden",children:a.jsx("div",{className:`h-full rounded-full transition-[width] duration-150 ease-linear ${t>=100?"bg-green-400":h?"bg-amber-400/60":"bg-cyan-400/60"}`,style:{width:`${t}%`}})})]})})},Ot={SNAPSHOT:0,ANIMATE:1,OVERLAY:2,UI:3},Et=[];let pn=!1;function $t(e,n,t){if(Et.some(i=>i.name===e))return()=>{};const o={name:e,phase:n,fn:t};return Et.push(o),pn=!0,()=>{const i=Et.indexOf(o);i>=0&&Et.splice(i,1)}}function Mo(e){pn&&(Et.sort((n,t)=>n.phase-t.phase),pn=!1);for(let n=0;n<Et.length;n++)Et[n].fn(e)}const Co=xe(),Jc=Ue.forwardRef((e,n)=>{const{index:t,light:o,onDragStart:i}=e,s=M.useRef(null),r=M.useRef(null),l=z(u=>u.updateLight),{handleInteractionStart:c,handleInteractionEnd:d}=z(),f=z(u=>{var g,v,y;return((y=(v=(g=u.lighting)==null?void 0:g.lights)==null?void 0:v[t])==null?void 0:y.fixed)??o.fixed}),h=()=>{var b,x;const u=(x=(b=z.getState().lighting)==null?void 0:b.lights)==null?void 0:x[t];if(!u)return;const g=u.fixed;let v=u.position;const y=Je();if(y){const m=Co.sceneOffset;if(g){const C=new V(v.x,v.y,v.z);C.applyQuaternion(y.quaternion),C.add(y.position),v={x:C.x+m.x+(m.xL??0),y:C.y+m.y+(m.yL??0),z:C.z+m.z+(m.zL??0)}}else{const C=new V(v.x-m.x-(m.xL??0),v.y-m.y-(m.yL??0),v.z-m.z-(m.zL??0));C.sub(y.position),C.applyQuaternion(y.quaternion.clone().invert()),v={x:C.x,y:C.y,z:C.z}}}c("param"),l({index:t,params:{fixed:!g,position:v}}),d()};Ue.useImperativeHandle(n,()=>({hide:()=>{var u;(u=s.current)==null||u.hide()},update:()=>{var S,j,R;const u=((j=(S=z.getState().lighting)==null?void 0:S.lights)==null?void 0:j[t])??o,g=na(),v=aa();if(!g||!v)return;const y=v.clientWidth,b=v.clientHeight,x=Co.sceneOffset,m=yc(u,g,x),C=u.fixed?g.quaternion:void 0;(R=s.current)==null||R.update(m,g,y,b,C);const k=r.current;if(!k)return;const w=k.querySelector(".range-circle");if(w){const I=u.range??0,N=hn.index===t;if(I>.001&&N){const L=new V(1,0,0).applyMatrix4(g.matrixWorld).sub(g.position).normalize(),E=m.clone().addScaledVector(L,I),D=lo(E,g,y,b),A=lo(m,g,y,b);if(D&&A){const T=D.x-A.x,G=D.y-A.y,H=Math.sqrt(T*T+G*G);w.setAttribute("r",String(Math.max(8,H))),w.style.opacity="0.6"}else w.style.opacity="0"}else w.style.opacity="0"}}}));const p=(u,g,v)=>{i(u,t,g,v)};return o.type==="Directional"?null:a.jsx("div",{ref:r,className:"contents",children:a.jsxs(bc,{ref:s,id:String(t),color:o.color,onDragStart:p,children:[a.jsx("svg",{className:"absolute overflow-visible pointer-events-none",style:{left:0,top:0},children:a.jsx("circle",{className:"range-circle pointer-events-none",cx:"0",cy:"0",r:"0",fill:"none",stroke:o.color,strokeWidth:"1",strokeDasharray:"4 3",style:{opacity:0,transition:"opacity 0.2s ease"}})}),a.jsxs("div",{className:"absolute top-[50px] left-0 transform -translate-x-1/2 flex items-center gap-1 bg-black/80 backdrop-blur px-1.5 py-0.5 rounded border border-white/20 select-none z-20 pointer-events-auto transition-transform hover:scale-105",children:[a.jsxs("span",{className:"text-[9px] font-bold text-white",children:["L",t+1]}),a.jsx("button",{className:"anchor-btn p-0.5 hover:text-cyan-400 transition-colors text-[9px]",onPointerDown:u=>u.stopPropagation(),onClick:u=>{u.stopPropagation(),h()},title:f?"Attached to Camera":"World Anchored",children:f?a.jsx(ni,{}):a.jsx(oi,{})})]})]})})}),Za=xe(),vr={current:{}},ed=()=>{var o,i,s,r;const e=(o=z.getState().lighting)==null?void 0:o.lights;if(!e)return;const n=rn(e);n!==e&&((s=(i=z.getState()).setLighting)==null||s.call(i,{lights:n}));const t=new Map(e.map(l=>[l.id,l]));for(const[l,c]of Object.entries(vr.current)){const d=t.get(l);if(!d||!d.visible||d.type==="Directional"){(r=c.hide)==null||r.call(c);continue}try{c.update()}catch(f){console.error("Error updating light gizmo:",f)}}},td=()=>{const e=z(u=>u.showLightGizmo),n=z(u=>{var g;return((g=u.lighting)==null?void 0:g.lights)||[]}),t=z(u=>u.setGizmoDragging);z(u=>u.updateLight);const o=z(u=>u.setDraggedLight),{handleInteractionStart:i,handleInteractionEnd:s}=z(),r=M.useRef(null),l=M.useMemo(()=>new Vo,[]),c=M.useMemo(()=>new kn,[]),d=vr,f=(u,g,v,y)=>{u.preventDefault(),u.stopPropagation();const b=n[g];if(!b)return;i("param"),t(!0),Za.isGizmoInteracting=!0,o(b.id??null),u.target.setPointerCapture(u.pointerId);const x=na(),m=aa();if(!x||!m)return;const C=m.getBoundingClientRect(),k=new Te((u.clientX-C.left)/C.width*2-1,-((u.clientY-C.top)/C.height)*2+1);if(c.setFromCamera(k,x),v==="free"||v.startsWith("plane")){const w=new V;v==="free"?x.getWorldDirection(w):v==="plane-xy"?w.set(0,0,1):v==="plane-xz"?w.set(0,1,0):v==="plane-yz"&&w.set(1,0,0),v!=="free"&&b.fixed&&w.applyQuaternion(x.quaternion),l.setFromNormalAndCoplanarPoint(w,y);const S=new V,R=c.ray.intersectPlane(l,S)?new V().subVectors(y,S):new V(0,0,0);r.current={active:!0,index:g,mode:v,startPos:y.clone(),planeNormal:w,planeOrigin:y,offsetFromIntersection:R,startX:u.clientX,startY:u.clientY,screenAxis:new Te,worldAxis:new V}}else if(v.startsWith("axis")){let w=new V;v==="axis-x"&&w.set(1,0,0),v==="axis-y"&&w.set(0,1,0),v==="axis-z"&&w.set(0,0,1),b.fixed&&w.applyQuaternion(x.quaternion);const S=y.distanceTo(x.position)*.15,j=y.clone().addScaledVector(w,S),R=y.clone().project(x),I=j.clone().project(x),N=m.getBoundingClientRect();let L=(I.x-R.x)*N.width*.5,E=-(I.y-R.y)*N.height*.5;j.applyMatrix4(x.matrixWorldInverse).z>0&&(L=-L,E=-E);let A=new Te(L,E);A.lengthSq()<.5&&A.set(1,0),A.normalize(),r.current={active:!0,index:g,mode:v,startPos:y.clone(),planeNormal:new V,planeOrigin:new V,offsetFromIntersection:new V,startX:u.clientX,startY:u.clientY,screenAxis:A,worldAxis:w}}window.addEventListener("pointermove",h),window.addEventListener("pointerup",p)},h=u=>{var k;const g=r.current;if(!g||!g.active)return;u.preventDefault(),u.stopPropagation();const v=na();if(!v)return;const b=(((k=z.getState().lighting)==null?void 0:k.lights)||[])[g.index];if(!b)return;let x=new V;if(g.mode==="free"||g.mode.startsWith("plane")){const w=aa();if(!w)return;const S=w.getBoundingClientRect(),j=new Te((u.clientX-S.left)/S.width*2-1,-((u.clientY-S.top)/S.height)*2+1);c.setFromCamera(j,v),l.setFromNormalAndCoplanarPoint(g.planeNormal,g.planeOrigin);const R=new V;if(c.ray.intersectPlane(l,R))x.copy(R).add(g.offsetFromIntersection);else return}else{const w=u.clientX-g.startX,S=u.clientY-g.startY,j=w*g.screenAxis.x+S*g.screenAxis.y,I=g.startPos.distanceTo(v.position)*.0025;x.copy(g.startPos).addScaledVector(g.worldAxis,j*I)}u.shiftKey&&(x.x=Math.round(x.x/.25)*.25,x.y=Math.round(x.y/.25)*.25,x.z=Math.round(x.z/.25)*.25);const m=Za.sceneOffset;let C;if(b.fixed){const w=x.clone().sub(v.position).applyQuaternion(v.quaternion.clone().invert());C={x:w.x,y:w.y,z:w.z}}else C={x:x.x+m.x+(m.xL??0),y:x.y+m.y+(m.yL??0),z:x.z+m.z+(m.zL??0)};z.getState().updateLight({index:g.index,params:{position:C}})},p=u=>{r.current&&(t(!1),o(null),Za.isGizmoInteracting=!1,s(),r.current=null,window.removeEventListener("pointermove",h),window.removeEventListener("pointerup",p))};return e?a.jsx("div",{className:"absolute inset-0 pointer-events-none",children:n.map((u,g)=>a.jsx(Jc,{index:g,light:u,onDragStart:f,ref:v=>{const y=u.id;y&&(v?d.current[y]=v:delete d.current[y])}},u.id||g))}):null},Tt=xe(),Pe=new V,kt=new V,Qe=new V,jt=new Oe,ad=(e,n,t,o,i)=>{gr(e.center,i,kt),jt.set(e.orientation.x,e.orientation.y,e.orientation.z,e.orientation.w);const s=e.size.x/2,r=e.size.y/2,l=e.zOffset||0,c=e.size.z||0,d=e.type==="rect"&&c>.001,f=d?l-c/2:l;if(e.type==="circle"){const u=[];for(let v=0;v<=48;v++){const y=v/48*Math.PI*2;Pe.set(Math.cos(y)*s,Math.sin(y)*r,f),Pe.applyQuaternion(jt).add(kt),u.push(st(Pe,n,t,o))}return u}if(d){const u=[];for(const g of[-1,1])for(const v of[-1,1])for(const y of[-1,1])Pe.set(g*s,v*r,f+y*c/2),Pe.applyQuaternion(jt).add(kt),u.push(st(Pe,n,t,o));return u}const h=[],p=[[-1,-1],[1,-1],[1,1],[-1,1]];for(const[u,g]of p)Pe.set(u*s,g*r,f),Pe.applyQuaternion(jt).add(kt),h.push(st(Pe,n,t,o));return h},mn=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]],At=new Map,ra=new Map;let Ge={svgEl:null,labelsEl:null,axesSvgEl:null,tempShapeRef:null,axesOriginRef:null},ma=[];function nd(e,n,t){if(ma.length=0,e)for(const o of e)ma.push({shape:o,color:o.color,isTemp:!1});return n&&n.center&&n.size&&n.orientation&&ma.push({shape:n,color:"#"+t.getHexString(),isTemp:!0}),ma}function od(e,n){let t=At.get(n);return(!t||!t.isConnected)&&(t=document.createElementNS("http://www.w3.org/2000/svg","path"),t.setAttribute("data-shape-id",n),t.setAttribute("fill","none"),t.setAttribute("stroke-opacity","0.9"),e.appendChild(t),At.set(n,t)),t}function rd(e,n){let t=At.get(n);if(!t||!t.isConnected){t=document.createElementNS("http://www.w3.org/2000/svg","g"),t.setAttribute("data-shape-id",n);for(let o=0;o<mn.length;o++){const i=document.createElementNS("http://www.w3.org/2000/svg","line");i.setAttribute("stroke-opacity","0.9"),t.appendChild(i)}e.appendChild(t),At.set(n,t)}return t}function id(e,n){let t=ra.get(n);if(!t||!t.isConnected){t=document.createElement("div"),t.setAttribute("data-label-id",n),t.style.position="absolute",t.style.left="0",t.style.top="0",t.style.pointerEvents="none",t.innerHTML='<div data-role="width" class="absolute text-[10px] font-mono font-bold whitespace-nowrap text-cyan-300 opacity-90 px-1" style="pointer-events:none"></div><div data-role="height" class="absolute text-[10px] font-mono font-bold whitespace-nowrap text-cyan-300 opacity-90 px-1" style="pointer-events:none"></div><div data-role="delete" class="drawing-ui absolute cursor-pointer flex items-center justify-center w-4 h-4 bg-red-900/80 hover:bg-red-500 text-white rounded-full transition-colors shadow-sm border border-white/20" style="pointer-events:auto" title="Delete Shape"><span class="text-[10px] font-bold leading-none mb-[1px]">✕</span></div>';const o=t.querySelector('[data-role="delete"]');o&&o.addEventListener("click",i=>{i.stopPropagation(),z.getState().removeDrawnShape(n)}),e.appendChild(t),ra.set(n,t)}return t}const sd=()=>{var y;const e=pc();if(!e)return;const{camera:n,width:t,height:o}=e,s=z.getState().drawing;if(!s)return;const{shapes:r,showLabels:l,showAxes:c}=s,d=Tt.sceneOffset,f=((y=Ge.tempShapeRef)==null?void 0:y.current)??null;if(!(r&&r.length>0||f||c))return;const p=Ge.svgEl,u=Ge.labelsEl,g=nd(r,f,s.color),v=new Set;for(const{shape:b,isTemp:x}of g)v.add(b.id||"temp");if(p){p.setAttribute("width",String(t)),p.setAttribute("height",String(o));for(const{shape:b,color:x,isTemp:m}of g){const C=b.id||"temp",k=b.type==="rect"&&(b.size.z||0)>.001,w=ad(b,n,t,o,d),S=w.some(j=>j.behind);if(k){const j=rd(p,C);if(S)j.setAttribute("visibility","hidden");else{j.setAttribute("visibility","visible");const R=j.children;for(let I=0;I<mn.length;I++){const[N,L]=mn[I],E=R[I];E&&(E.setAttribute("x1",String(w[N].x)),E.setAttribute("y1",String(w[N].y)),E.setAttribute("x2",String(w[L].x)),E.setAttribute("y2",String(w[L].y)),E.setAttribute("stroke",x),E.setAttribute("stroke-width",m?"1":"1.5"))}}}else{const j=od(p,C);if(S)j.setAttribute("visibility","hidden");else{j.setAttribute("visibility","visible");const R=w.map((I,N)=>`${N===0?"M":"L"}${I.x},${I.y}`).join(" ")+" Z";j.setAttribute("d",R),j.setAttribute("stroke",x),j.setAttribute("stroke-width",m?"1":"1.5")}}}for(const[b,x]of At)v.has(b)||(x.remove(),At.delete(b))}if(u){for(const{shape:x,isTemp:m}of g){if(!l)continue;const C=x.id||"temp";gr(x.center,d,kt),jt.set(x.orientation.x,x.orientation.y,x.orientation.z,x.orientation.w);const k=x.size.x/2,w=x.size.y/2,S=x.size.z||0,j=x.zOffset||0,R=x.type==="rect"&&S>.001?j-S/2:j;Pe.set(0,w,R+S/2).applyQuaternion(jt).add(kt);const I=st(Pe,n,t,o);Pe.set(-k,0,R+S/2).applyQuaternion(jt).add(kt);const N=st(Pe,n,t,o);Pe.set(k,w,R+S/2).applyQuaternion(jt).add(kt);const L=st(Pe,n,t,o),E=I.behind||N.behind,D=id(u,C);if(E)D.style.display="none";else{D.style.display="";const A=D.children[0],T=D.children[1],G=D.children[2];A&&(A.style.left=`${I.x}px`,A.style.top=`${I.y}px`,A.style.transform="translate(-50%, -100%)",A.textContent=x.size.x.toFixed(4)),T&&(T.style.left=`${N.x}px`,T.style.top=`${N.y}px`,T.style.transform="translate(-100%, -50%) rotate(90deg)",T.style.transformOrigin="right center",T.textContent=x.size.y.toFixed(4)),G&&(m||L.behind?G.style.display="none":(G.style.display="",G.style.left=`${L.x}px`,G.style.top=`${L.y}px`,G.style.transform="translate(25%, -75%)"))}}const b=l?v:new Set;for(const[x,m]of ra)b.has(x)||(m.remove(),ra.delete(x))}if(c&&Ge.axesSvgEl&&Ge.axesOriginRef){const b=Ge.axesSvgEl;b.setAttribute("width",String(t)),b.setAttribute("height",String(o)),b.style.display="";const x=Ge.axesOriginRef.current;Qe.set(x.x-d.x+(x.xL-d.xL),x.y-d.y+(x.yL-d.yL),x.z-d.z+(x.zL-d.zL));const m=st(Qe,n,t,o);if(m.behind){b.style.display="none";return}const C=2,k=[{dx:C,dy:0,dz:0},{dx:0,dy:C,dz:0},{dx:0,dy:0,dz:C}],w=b.querySelectorAll("[data-axis]");for(let R=0;R<k.length;R++){const I=k[R];Pe.set(Qe.x+I.dx,Qe.y+I.dy,Qe.z+I.dz);const N=st(Pe,n,t,o),L=w[R];L&&(N.behind?L.setAttribute("visibility","hidden"):(L.setAttribute("visibility","visible"),L.setAttribute("x1",String(m.x)),L.setAttribute("y1",String(m.y)),L.setAttribute("x2",String(N.x)),L.setAttribute("y2",String(N.y))))}const S=b.querySelectorAll("[data-grid]");let j=0;for(let R=0;R<11;R++){const I=R-5,N=I===0;Pe.set(Qe.x+I,Qe.y,Qe.z-5);const L=st(Pe,n,t,o);Pe.set(Qe.x+I,Qe.y,Qe.z+5);const E=st(Pe,n,t,o),D=S[j++];D&&(L.behind||E.behind?D.setAttribute("visibility","hidden"):(D.setAttribute("visibility","visible"),D.setAttribute("x1",String(L.x)),D.setAttribute("y1",String(L.y)),D.setAttribute("x2",String(E.x)),D.setAttribute("y2",String(E.y)),D.setAttribute("stroke",N?"#ff4444":"#444444"),D.setAttribute("stroke-width",N?"1.5":"0.5"))),Pe.set(Qe.x-5,Qe.y,Qe.z+I);const A=st(Pe,n,t,o);Pe.set(Qe.x+5,Qe.y,Qe.z+I);const T=st(Pe,n,t,o),G=S[j++];G&&(A.behind||T.behind?G.setAttribute("visibility","hidden"):(G.setAttribute("visibility","visible"),G.setAttribute("x1",String(A.x)),G.setAttribute("y1",String(A.y)),G.setAttribute("x2",String(T.x)),G.setAttribute("y2",String(T.y)),G.setAttribute("stroke",N?"#4444ff":"#444444"),G.setAttribute("stroke-width",N?"1.5":"0.5")))}}else Ge.axesSvgEl&&(Ge.axesSvgEl.style.display="none")},ld=()=>{const{drawing:e,setDrawing:n,addDrawnShape:t}=z(),{active:o,activeTool:i,originMode:s}=e,r=M.useRef(null),l=M.useRef(null),c=M.useRef(null),d=M.useRef(null),f=M.useRef(null),h=M.useRef(!1),p=M.useRef({x:0,y:0,z:0,xL:0,yL:0,zL:0}),u=M.useRef(new V),g=M.useRef(new Te),v=M.useRef(new V),y=M.useRef(new Vo),b=M.useRef(new V),x=M.useRef(new V),m=M.useRef({space:!1,x:!1});M.useEffect(()=>(Ge.svgEl=r.current,Ge.labelsEl=c.current,Ge.axesSvgEl=d.current,Ge.tempShapeRef=f,Ge.axesOriginRef=p,()=>{Ge.svgEl=null,Ge.labelsEl=null,Ge.axesSvgEl=null,Ge.tempShapeRef=null,Ge.axesOriginRef=null,At.clear(),ra.clear()}),[]);const C=z(R=>{var I;return(I=R.drawing)==null?void 0:I.refreshTrigger});M.useEffect(()=>{var E;const R=Je();if(!R)return;const I=((E=z.getState().drawing)==null?void 0:E.originMode)??1;let N=new V(0,0,0);if(I===1){const D=Math.max(.1,Tt.lastMeasuredDistance),A=new V(0,0,-1).applyQuaternion(R.quaternion);N.copy(R.position).addScaledVector(A,D)}else{const D=Tt.sceneOffset;N.set(-(D.x+D.xL),-(D.y+D.yL),-(D.z+D.zL))}const L=Tt.sceneOffset;p.current={x:L.x,y:L.y,z:L.z,xL:L.xL+N.x,yL:L.yL+N.y,zL:L.zL+N.z}},[s,C]);const k=M.useCallback(()=>Je(),[]),w=M.useCallback(()=>aa(),[]),S=M.useCallback(R=>{const I=k();if(!I)return new V(0,0,-1);let L=new V(0,0,-1).applyQuaternion(I.quaternion).clone().negate();if(R){const T=Math.abs(L.x),G=Math.abs(L.y),H=Math.abs(L.z);T>G&&T>H?L.set(Math.sign(L.x),0,0):G>H?L.set(0,Math.sign(L.y),0):L.set(0,0,Math.sign(L.z))}let E=new V(0,1,0);Math.abs(L.dot(E))>.99&&E.set(0,0,-1);let D=E.clone().sub(L.clone().multiplyScalar(E.dot(L)));D.normalize();const A=new V().crossVectors(D,L).normalize();return b.current.copy(A),x.current.copy(D),y.current.setFromNormalAndCoplanarPoint(L,v.current),L},[k]),j=M.useCallback((R,I,N)=>{const L=k();if(!L)return null;const E=new Te((R-N.left)/N.width*2-1,-((I-N.top)/N.height)*2+1),D=new kn;D.setFromCamera(E,L);const A=new V;return D.ray.intersectPlane(y.current,A)?A:null},[k]);return M.useEffect(()=>{const R=N=>{N.key==="Alt"&&N.preventDefault(),N.code==="Space"&&(m.current.space=!0,N.preventDefault()),N.key.toLowerCase()==="x"&&(m.current.x=!0)},I=N=>{N.key==="Alt"&&N.preventDefault(),N.code==="Space"&&(m.current.space=!1),N.key.toLowerCase()==="x"&&(m.current.x=!1)};return window.addEventListener("keydown",R),window.addEventListener("keyup",I),()=>{window.removeEventListener("keydown",R),window.removeEventListener("keyup",I)}},[]),M.useEffect(()=>{if(!o)return;const R=w();if(!R)return;const I=E=>{if(E.button!==0||E.target.closest(".drawing-ui"))return;const D=k();if(!D)return;const A=R.getBoundingClientRect();if(g.current.set(E.clientX,E.clientY),s===1){const H=Math.max(.1,Tt.lastMeasuredDistance),W=new V(0,0,-1).applyQuaternion(D.quaternion);v.current.copy(D.position).addScaledVector(W,H)}else{const H=Tt.sceneOffset;v.current.set(-(H.x+H.xL),-(H.y+H.yL),-(H.z+H.zL))}const T=S(m.current.x),G=j(E.clientX,E.clientY,A);G&&(h.current=!0,u.current.copy(G),f.current={center:void 0,size:{x:0,y:0},orientation:new Oe().setFromRotationMatrix(new Lt().makeBasis(b.current,x.current,T)),type:i},R.setPointerCapture(E.pointerId))},N=E=>{var U;if(!h.current)return;const D=R.getBoundingClientRect(),A=S(m.current.x),T=j(E.clientX,E.clientY,D);if(!T)return;if(m.current.space){const O=j(g.current.x,g.current.y,D);if(O){const P=new V().subVectors(T,O);if(u.current.add(P),(U=f.current)!=null&&U.center){const $=f.current.center;f.current={...f.current,center:{...$,xL:$.xL+P.x,yL:$.yL+P.y,zL:$.zL+P.z}}}}g.current.set(E.clientX,E.clientY);return}g.current.set(E.clientX,E.clientY);const G=new V().subVectors(T,u.current);let H=G.dot(b.current),W=G.dot(x.current),B;if(E.altKey?(H*=2,W*=2,B=u.current.clone()):B=u.current.clone().addScaledVector(b.current,H*.5).addScaledVector(x.current,W*.5),E.shiftKey){const O=Math.max(Math.abs(H),Math.abs(W));H=Math.sign(H)*O,W=Math.sign(W)*O,E.altKey||(B=u.current.clone().addScaledVector(b.current,H*.5).addScaledVector(x.current,W*.5))}const _=Tt.sceneOffset;f.current={...f.current,center:{x:_.x,y:_.y,z:_.z,xL:_.xL+B.x,yL:_.yL+B.y,zL:_.zL+B.z},size:{x:Math.abs(H),y:Math.abs(W)},orientation:new Oe().setFromRotationMatrix(new Lt().makeBasis(b.current,x.current,A))}},L=E=>{if(!h.current)return;h.current=!1,R.releasePointerCapture(E.pointerId);const D=f.current,A=z.getState().drawing.color;D&&D.center&&D.size&&D.orientation&&(D.size.x>.001||D.size.y>.001)&&(t({id:nt(),type:D.type||"rect",center:D.center,size:D.size,orientation:D.orientation,color:"#"+A.getHexString()}),n({active:!1})),f.current=null};return R.addEventListener("pointerdown",I),R.addEventListener("pointermove",N),R.addEventListener("pointerup",L),()=>{R.removeEventListener("pointerdown",I),R.removeEventListener("pointermove",N),R.removeEventListener("pointerup",L)}},[o,i,s,k,w,n,S,j,t]),a.jsxs("div",{ref:l,className:"absolute inset-0 overflow-hidden",style:{pointerEvents:"none"},children:[a.jsx("svg",{ref:r,className:"absolute inset-0",style:{pointerEvents:"none"}}),a.jsx("div",{ref:c,className:"absolute inset-0",style:{pointerEvents:"none"}}),a.jsxs("svg",{ref:d,className:"absolute inset-0",style:{pointerEvents:"none",display:"none"},children:[a.jsx("line",{"data-axis":"x",stroke:"#ff4444",strokeWidth:2,strokeOpacity:.7}),a.jsx("line",{"data-axis":"y",stroke:"#44ff44",strokeWidth:2,strokeOpacity:.7}),a.jsx("line",{"data-axis":"z",stroke:"#4444ff",strokeWidth:2,strokeOpacity:.7}),Array.from({length:22},(R,I)=>a.jsx("line",{"data-grid":I,strokeOpacity:.5},I))]})]})},gn={displays:new Map},xn={diamonds:new Map},cd={diamonds:new Map},ga=(e,n)=>{n?(e.style.setProperty("background-color","#991b1b","important"),e.style.setProperty("border-color","#f87171","important")):(e.style.removeProperty("background-color"),e.style.removeProperty("border-color"))},dd=()=>{const e=le.getState(),{isPlaying:n,currentFrame:t,sequence:o}=e;gn.displays.forEach((i,s)=>{if(i)try{const r=qa(s,n,t,o);i.innerText=r.toFixed(2)}catch(r){console.error("Error updating live value display:",r)}}),n||(xn.diamonds.forEach(i=>{const{el:s,frame:r,tid:l}=i;if(Math.abs(r-t)<.1){const d=o.tracks[l];if(d){const f=d.keyframes.find(h=>Math.abs(h.frame-r)<.1);if(f){const h=qa(l,!1),p=Math.abs(f.value-h)>.001;ga(s,p)}}}else ga(s,!1)}),cd.diamonds.forEach(i=>{const{el:s,frame:r,tids:l}=i;if(Math.abs(r-t)<.1){let d=!1;for(const f of l){const h=o.tracks[f];if(h){const p=h.keyframes.find(u=>Math.abs(u.frame-r)<.1);if(p){const u=qa(f,!1);if(Math.abs(p.value-u)>.001){d=!0;break}}}}ga(s,d)}else ga(s,!1)}))},ud=({tid:e})=>{const n=M.useRef(null);return M.useEffect(()=>(n.current&&gn.displays.set(e,n.current),()=>{gn.displays.delete(e)}),[e]),a.jsx("span",{ref:n,className:"text-[9px] font-mono text-gray-600 w-12 text-right",children:"--"})},hd=({tid:e,kid:n,frame:t,isSelected:o,interpolation:i})=>{const s=M.useRef(null),r=`${e}::${n}`;M.useEffect(()=>(s.current&&xn.diamonds.set(r,{el:s.current,frame:t,tid:e}),()=>{xn.diamonds.delete(r)}),[r,t,e]);const l=i==="Linear"?"rotate-45 rounded-sm":i==="Step"?"rounded-none":"rounded-full";return a.jsx("div",{ref:s,className:`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 border transition-transform ${o?"bg-white border-white scale-125 z-30":"bg-cyan-900 border-cyan-400 group-hover/key:scale-125 group-hover/key:bg-cyan-400"} ${l}`})},gh=M.memo(({tid:e,sequence:n,frameWidth:t,isSelected:o,selectedKeys:i,onSelect:s,onRemove:r,onAddKey:l,onKeyMouseDown:c})=>{const d=z(h=>h.openContextMenu),f=h=>{const p=Xe(h.currentTarget);p.length>0&&(h.preventDefault(),h.stopPropagation(),d(h.clientX,h.clientY,[],p))};return a.jsxs("div",{className:"flex border-b border-white/5 bg-transparent hover:bg-white/5",style:{height:32},"data-help-id":"anim.tracks",children:[a.jsxs("div",{className:`sticky left-0 z-30 w-[220px] bg-black/80 backdrop-blur-sm border-r border-white/10 shrink-0 flex items-center justify-between px-3 cursor-pointer group select-none ${o?"border-l-2 border-l-cyan-500":""}`,onClick:h=>s(h,e),onMouseDown:h=>h.stopPropagation(),onContextMenu:f,"data-help-id":"anim.tracks",children:[a.jsx("div",{className:"truncate text-[10px] font-bold text-gray-400 group-hover:text-cyan-400 pl-4",title:n.tracks[e].label,children:n.tracks[e].label}),a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsx(ud,{tid:e}),a.jsx("button",{onClick:h=>{h.stopPropagation(),r()},className:"opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400",children:a.jsx(zt,{})})]})]}),a.jsxs("div",{className:"flex-1 relative group/track z-10",onDoubleClick:h=>{h.stopPropagation();const p=h.currentTarget.getBoundingClientRect(),u=Math.max(0,Math.round((h.clientX-p.left)/t));l(u)},children:[a.jsx("div",{className:"absolute inset-0 opacity-0 group-hover/track:opacity-5 bg-white pointer-events-none"}),n.tracks[e].keyframes.map(h=>{const p=i.includes(`${e}::${h.id}`);return a.jsx("div",{className:"absolute top-1/2 -translate-y-1/2 z-20 cursor-grab group/key",style:{left:`${h.frame*t-10}px`,width:"20px",height:"20px"},onMouseDown:u=>c(u,e,h.id),"data-help-id":"anim.keyframes",children:a.jsx(hd,{tid:e,kid:h.id,frame:h.frame,isSelected:p,interpolation:h.interpolation})},h.id)})]})]})});$t("snapshotDisplayCamera",Ot.SNAPSHOT,()=>{const e=Je();e&&Xi(e)});$t("animationTick",Ot.ANIMATE,Nc);$t("lightGizmoTick",Ot.OVERLAY,ed);$t("drawingOverlayTick",Ot.OVERLAY,sd);$t("fpsCounterTick",Ot.UI,ql);$t("performanceMonitorTick",Ot.UI,Ac);$t("trackRowTick",Ot.UI,dd);const fd=({onLoaded:e})=>{const{camera:n,size:t,gl:o}=Cn(),[i,s]=M.useState(!1),r=xe(),l=z(f=>f.dpr),c=M.useRef({width:t.width,height:t.height,dpr:l});c.current={width:t.width,height:t.height,dpr:l},M.useEffect(()=>{Vi(n),Yi(o.domElement)},[n,o]),M.useEffect(()=>{let f=!0;return(async()=>{let p=0;for(;!r.isBooted;){if(!f)return;if(++p>=300){console.error("[WorkerTickScene] Worker boot timeout after 30s");return}await new Promise(u=>setTimeout(u,100))}for(;r.isCompiling;){if(!f)return;await new Promise(u=>setTimeout(u,100))}if(f){const u=c.current;r.resizeWorker(u.width,u.height,u.dpr),s(!0),e&&e()}})(),()=>{f=!1}},[]),M.useEffect(()=>{r.resizeWorker(t.width,t.height,l)},[t.width,t.height,l]),M.useEffect(()=>{const f=[Y.on(ge.CONFIG,h=>{r.sendConfig(h)}),Y.on(ge.UNIFORM,({key:h,value:p,noReset:u})=>{r.setUniform(h,p,u)}),Y.on(ge.RESET_ACCUM,()=>{r.resetAccumulation()}),Y.on(ge.OFFSET_SET,h=>{const p={x:h.x,y:h.y,z:h.z,xL:h.xL??0,yL:h.yL??0,zL:h.zL??0};r.setShadowOffset(p),r.post({type:"OFFSET_SET",offset:p})}),Y.on(ge.OFFSET_SHIFT,({x:h,y:p,z:u})=>{r.applyOffsetShift(h,p,u),r.post({type:"OFFSET_SHIFT",x:h,y:p,z:u})}),Y.on(ge.CAMERA_SNAP,()=>{r.shouldSnapCamera=!0}),Y.on(ge.TEXTURE,({textureType:h,dataUrl:p})=>{r.updateTexture(h,p)}),Y.on(ge.REGISTER_FORMULA,({id:h,shader:p})=>{r.registerFormula(h,p)})];return()=>{f.forEach(h=>h())}},[]);const d=Ue.useRef({lastYield:0,fps:60,frames:0,lastSample:0});return Da((f,h)=>{var w;if(!i)return;const p=Math.min(h,.1),u=performance.now(),g=d.current;if(g.frames++,u-g.lastSample>=500&&(g.fps=g.frames*1e3/(u-g.lastSample),g.frames=0,g.lastSample=u),g.fps<20&&u-g.lastYield>=1e3){g.lastYield=u,Mo(p);return}Mo(p);const v=n,y=((w=z.getState().optics)==null?void 0:w.camFov)??60;v.fov!==y&&(v.fov=y,v.updateProjectionMatrix());const b={position:[v.position.x,v.position.y,v.position.z],quaternion:[v.quaternion.x,v.quaternion.y,v.quaternion.z,v.quaternion.w],fov:v.fov||60,aspect:v.aspect||t.width/t.height},x=z.getState(),m=x.sceneOffset||{x:0,y:0,z:0,xL:0,yL:0,zL:0},C={x:m.x,y:m.y,z:m.z,xL:m.xL??0,yL:m.yL??0,zL:m.zL??0},k={cameraMode:x.cameraMode,isCameraInteracting:le.getState().isCameraInteracting,isGizmoInteracting:r.isGizmoInteracting,optics:x.optics??null,lighting:x.lighting??null,quality:x.quality??null,geometry:x.geometry??null};r.sendRenderTick(b,C,p,k)},1),null},pd=({width:e,height:n})=>{const t=M.useRef(null),o=M.useRef(!1);return M.useEffect(()=>{const i=xe();return i.onCrash=s=>{console.error(`[WorkerDisplay] Worker crashed: ${s}.`)},()=>{i.onCrash=null}},[]),M.useEffect(()=>{var x,m;if(o.current||!t.current)return;o.current=!0;const i=t.current;if(typeof HTMLCanvasElement.prototype.transferControlToOffscreen!="function"){const C=document.createElement("div");C.style.cssText="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#1a1a2e;color:#e0e0e0;font:16px/1.5 system-ui,sans-serif;padding:2rem;text-align:center",C.innerHTML='<div><h2 style="color:#ff6b6b;margin:0 0 .5rem">Browser Not Supported</h2><p>GMT requires <b>OffscreenCanvas</b> support.<br>Please use a recent version of Chrome, Edge, or Firefox.</p></div>',i.appendChild(C);return}const s=window.devicePixelRatio||1,r=i.getBoundingClientRect(),l=r.width>0?r.width:e,c=r.height>0?r.height:n,d=document.createElement("canvas");d.width=l*s,d.height=c*s,d.style.cssText="position:absolute;inset:0;width:100%;height:100%;pointer-events:none",i.appendChild(d);const f=z.getState(),h=dr(f),p=((x=window.matchMedia)==null?void 0:x.call(window,"(pointer: coarse)").matches)||window.innerWidth<768,u=xe(),g=f.cameraRot||{x:0,y:0,z:0,w:1},v=((m=f.optics)==null?void 0:m.camFov)??60;u.initWorkerMode(d,h,l,c,s,p,{position:[0,0,0],quaternion:[g.x,g.y,g.z,g.w],fov:v});const y=f.sceneOffset;if(y){const C={x:y.x,y:y.y,z:y.z,xL:y.xL??0,yL:y.yL??0,zL:y.zL??0};u.setShadowOffset(C),u.post({type:"OFFSET_SET",offset:C})}const b=new ResizeObserver(C=>{for(const k of C){const w=Math.max(1,k.contentRect.width),S=Math.max(1,k.contentRect.height);u.resizeWorker(w,S,window.devicePixelRatio||1)}});return b.observe(i),()=>b.disconnect()},[]),a.jsx("div",{ref:t,style:{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}})},ko=12,md=40,gd=()=>{const e=ne.getViewportOverlays().filter(o=>o.type==="dom"),n=z(),t=z();return a.jsx("div",{className:"absolute inset-0 pointer-events-none z-[20]",children:e.map(o=>{const i=ve.get(o.componentId),s=o.id,r=n[s];return i&&r?a.jsx(i,{featureId:s,sliceState:r,actions:t},o.id):null})})},xd=()=>{const e=ne.getViewportOverlays().filter(o=>!o.type||o.type==="scene"),n=z(),t=z();return a.jsx(a.Fragment,{children:e.map(o=>{const i=ve.get(o.componentId),s=o.id,r=n[s];return i&&r?a.jsx(i,{featureId:s,sliceState:r,actions:t},o.id):null})})},bd=({hudRefs:e,onSceneReady:n})=>{const t=z(),o=M.useRef(null),i=M.useRef(null),{drawing:s,interactionMode:r}=t,l=s==null?void 0:s.active,c=r==="selecting_region",{visualRegion:d,isGhostDragging:f,renderRegion:h}=Fc(o);_c(o);const{isMobile:p}=Rn(),[u,g]=M.useState({w:0,h:0});M.useLayoutEffect(()=>{if(!i.current)return;const T=new ResizeObserver(H=>{for(const W of H){const B=Math.max(1,W.contentRect.width),_=Math.max(1,W.contentRect.height);g({w:B,h:_})}});T.observe(i.current);const G=i.current.getBoundingClientRect();return G.width>0&&G.height>0&&g({w:G.width,h:G.height}),()=>T.disconnect()},[]);const v=t.resolutionMode==="Fixed",[y,b]=t.fixedResolution,x=d||h,m=t.isBroadcastMode,C=40,k=Math.max(1,u.w-C),w=Math.max(1,u.h-C);let S=1;v&&(S=Math.min(1,k/y,w/b));const j=v?{width:y,height:b,transform:`scale(${S})`,transformOrigin:"center center",boxShadow:"0 0 50px rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.1)",flexShrink:0}:{width:"100%",height:"100%"},R=v?y*S:u.w,I=v?b*S:u.h,N=(u.h-I)/2,L=(u.w-R)/2,E=Math.max(ko,N-md),D=Math.max(ko,L),A=T=>{};return a.jsxs("div",{ref:i,className:`relative flex-1 flex items-center justify-center overflow-hidden bg-[#050505] touch-none ${c||l?"cursor-crosshair":""}`,style:{backgroundImage:v?"radial-gradient(circle at center, #111 0%, #050505 100%)":"none"},onContextMenu:T=>{T.preventDefault(),T.stopPropagation()},children:[v&&a.jsx("div",{className:"absolute inset-0 opacity-20 pointer-events-none",style:{backgroundImage:"linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)",backgroundSize:"40px 40px"}}),!m&&a.jsx(Tc,{state:t,actions:t,isMobile:t.debugMobileLayout||p,hudRefs:e}),!m&&a.jsx(Kc,{}),!m&&a.jsx(zc,{}),!m&&a.jsx(Dc,{}),a.jsxs("div",{ref:o,style:j,className:"relative bg-[#111] group z-0",children:[(c||l)&&a.jsx("div",{className:"absolute inset-0 z-50 cursor-crosshair bg-transparent pointer-events-none"}),x&&!c&&!m&&a.jsx("div",{className:`absolute border-2 z-40 group/box region-box cursor-move transition-opacity duration-75 ${f?"border-cyan-400 border-dashed opacity-80":"border-cyan-500 opacity-100"}`,style:{left:`${x.minX*100}%`,bottom:`${x.minY*100}%`,right:`${(1-x.maxX)*100}%`,top:`${(1-x.maxY)*100}%`},children:a.jsxs("div",{className:"absolute top-0 right-0 bg-cyan-600 text-white text-[9px] font-bold px-1.5 py-0.5 flex items-center gap-2 pointer-events-auto shadow-md",children:[a.jsx("span",{children:f?"Moving...":"Active Region"}),a.jsx("div",{className:"w-px h-2 bg-cyan-400/50"}),a.jsx("button",{onClick:T=>{T.stopPropagation(),t.setRenderRegion(null)},className:"hover:text-black transition-colors",title:"Clear Region",children:"✕"})]})}),u.w>0&&u.h>0&&a.jsx(pd,{width:v?y:u.w,height:v?b:u.h}),a.jsxs(Ii,{gl:{alpha:!0,depth:!1,antialias:!1,powerPreference:"high-performance",preserveDrawingBuffer:!1},camera:{position:[0,0,0],fov:60},style:{position:"absolute",inset:0,pointerEvents:"auto"},dpr:t.dpr,onPointerDown:T=>T.target.setPointerCapture(T.pointerId),onPointerMove:A,onWheel:A,children:[a.jsx(Zc,{mode:t.cameraMode,hudRefs:e,onStart:T=>t.handleInteractionStart(T),onEnd:()=>t.handleInteractionEnd(),setSceneOffset:t.setSceneOffset,fitScale:S}),a.jsx(fd,{onLoaded:n}),a.jsx(xd,{})]}),a.jsx(gd,{}),!m&&a.jsx(Bc,{width:v?y:u.w,height:v?b:u.h}),!m&&t.histogramActiveCount>0&&a.jsx(mo,{onUpdate:T=>t.setHistogramData(T),autoUpdate:t.histogramAutoUpdate,trigger:t.histogramTrigger,source:"geometry"}),!m&&t.sceneHistogramActiveCount>0&&a.jsx(mo,{onUpdate:T=>t.setSceneHistogramData(T),autoUpdate:!0,trigger:t.sceneHistogramTrigger,source:"color"}),c&&!m&&a.jsx("div",{className:"absolute top-4 left-1/2 -translate-x-1/2 bg-cyan-900/80 text-cyan-100 text-[10px] font-bold px-3 py-1 rounded-full border border-cyan-500/50 shadow-lg animate-pulse pointer-events-none z-[60]",children:"Drag to select render region"})]}),v&&!m&&a.jsx($c,{width:y,height:b,top:E,left:D,maxAvailableWidth:u.w,maxAvailableHeight:u.h,onSetResolution:t.setFixedResolution,onSetMode:t.setResolutionMode})]})},yd=()=>{const e=z(n=>n.openContextMenu);M.useEffect(()=>{const n=t=>{if(t.defaultPrevented)return;const o=Xe(t.target);o.length>0&&(t.preventDefault(),e(t.clientX,t.clientY,[],o))};return window.addEventListener("contextmenu",n),()=>window.removeEventListener("contextmenu",n)},[e])},vd={"general.undo":{id:"general.undo",category:"General",title:"Undo & History",content:`
The application uses **Three Separate History Stacks** to manage state.
This separation ensures that navigating the world doesn't undo your careful parameter tuning, and vice versa.

## 1. Parameter History (Global)
Tracks changes to sliders, colors, checkboxes, and formula settings.
- **Undo**: **Ctrl + Z**
- **Redo**: **Ctrl + Y**
- **Scope**: Any change made in the Control Deck (Formula, Light, Shading, etc).

## 2. Camera History (Navigation)
Tracks your movement in 3D space (Orbit and Fly modes).
- **Undo**: **Ctrl + Shift + Z**
- **Redo**: **Ctrl + Shift + Y**
- **Why?** Navigation generates thousands of micro-updates. Separating this prevents the "Parameter Undo" from getting clogged with camera moves.
- **UI Access**: You can also use the Undo/Redo buttons in the **Camera Menu** (Camera Icon in Top Bar).

## 3. Timeline History (Animation)
Tracks keyframes, tracks, and sequence data.
- **Undo**: **Ctrl + Z** (Context Sensitive)
- **Redo**: **Ctrl + Y** (Context Sensitive)
- **Context**: This stack is active when your mouse is hovering over the **Timeline Panel**. If you move the mouse away, Ctrl+Z reverts to Parameter Undo.
- **Fallback**: If the timeline undo stack is empty, Ctrl+Z will fall through to Parameter Undo even while hovering the timeline.
`},"general.shortcuts":{id:"general.shortcuts",category:"General",title:"Keyboard Shortcuts",content:`
## Navigation (Fly Mode)
- **W / S**: Move Forward / Backward
- **A / D**: Strafe Left / Right
- **Space**: Move Up (Ascend)
- **C**: Move Down (Descend)
- **Q / E**: Roll Camera Left / Right
- **Shift**: Speed Boost (4x)
- **Mouse Drag**: Look around (Steer)
- **Scroll**: Adjust Fly Speed

## Navigation (Orbit Mode)
- **Left Drag**: Rotate around target
- **Right Drag**: Pan camera
- **Scroll**: Zoom In / Out
- **Q / E**: Roll Camera

## History & Undo
- **Ctrl + Z**: Undo Parameter Change
- **Ctrl + Y**: Redo Parameter Change
- **Ctrl + Shift + Z**: Undo Camera Movement
- **Ctrl + Shift + Y**: Redo Camera Movement

## Tools & UI
- **1 - 6**: Open Quick-Edit Slider for Params A-F (at mouse cursor)
- **Ctrl + 1 – Ctrl + 9**: Recall saved camera slots
- **Tab**: Toggle between Orbit and Fly camera modes
- **T**: Toggle Timeline Panel
- **H**: Toggle UI Hints (Tooltip overlay)
- **\` (Backtick)**: Toggle Advanced Mode (show/hide advanced controls)
- **B**: Toggle Broadcast Mode (clean feed — hides all UI overlays)
- **Esc**: Cancel Focus Picking / Close Menus / Deselect / **Exit Broadcast Mode** (important — Broadcast Mode hides all UI, so Esc is the way out!)
- **Space** (non-fly mode): Play / Pause animation

> **Note on Space in Fly Mode**: When the Timeline is open, Space only plays/pauses the animation if your mouse is hovering over the Timeline panel. Otherwise, Space is used for ascending in Fly Mode.
`},"general.disclaimer":{id:"general.disclaimer",category:"General",title:"Disclaimer & Terms",content:`
## Usage & Safety
This software is provided as-is for educational and creative purposes. Young users should have parental guidance when using internet-connected features.

## AI & Human Verification
This application was created through a collaboration between Artificial Intelligence and Human Engineering. 
While rigorous verification processes are in place:
- Both AI and Humans are fallible.
- The software may contain errors, bugs, or inaccuracies.
- Use at your own risk.
`},"general.files":{id:"general.files",category:"General",title:"File Import & Export",content:`
## GMF Files (.gmf) — Primary Save Format
GMT saves scenes as **.gmf** files (GPU Mandelbulb Format). These are human-readable text files containing both the formula shader code and the full scene state (camera, lighting, features, animations).
- **Save**: System Menu → Save Preset (saves as \`.gmf\`)
- **Load**: System Menu → Load Preset (opens a file picker)
- **Self-contained**: Imported/custom formulas are embedded in the file, so they work in any session
- **AI-editable**: The GLSL shader code is plain text with an API reference — LLMs can read and modify formulas directly

## Smart PNGs (Steganography)
When you save a **Snapshot** (via the Camera Icon in the Top Bar), the application embeds the full scene data (in GMF format) into the image metadata. On desktop, clicking the camera icon takes a snapshot directly.
- **Load**: Use System Menu → Load Preset and select the PNG file to restore the scene instantly.
- **Safety**: The visual image is standard PNG. The data is hidden in an \`iTXt\` chunk.
- **Warning**: Social media platforms (Twitter, Facebook, etc.) strip this metadata. Share the file directly (Discord, Drive, Email) to preserve the data.

## Shareable URLs
You can share your scene via the URL bar.
- **Copy Link**: Use the link icon in the System Menu, or the standalone link button in the Top Bar.
- **Imported formulas**: URL sharing is not available for Workshop-imported formulas (the shader code is too large for URLs). The tooltip will show "N/A (Imported)".
- **Limits**: Browsers have a URL limit (approx 4096 characters). If your scene is too complex (e.g., thousands of keyframes), the app will automatically **strip animation data** to generate a working link. A warning "(Anims Removed)" will appear.

## Legacy JSON (.json)
Older \`.json\` preset files can still be loaded for backward compatibility, but GMT no longer saves in this format.
`}},wd={"formula.active":{id:"formula.active",category:"Formulas",title:"Active Formula",content:`
The formula is the mathematical equation that generates the 3D fractal shape. Different formulas produce radically different structures — from organic bulbs to architectural grids to alien landscapes.

## How to Switch Formulas
Open the **Formula** dropdown at the top of the sidebar. You will see a gallery with **thumbnail previews** of each fractal, organized by category. Click any thumbnail to load that formula with its default settings.

You can also **import .gmf formula files** — these are saved scenes that include both the formula and all its parameter settings. Drag a .gmf file into the app window or use the Load button.

## Categories
- **Featured Fractals**: The Mandelbulb and other power-based fractals — the classic shapes that started 3D fractal art.
- **Geometric & Folding**: Box folds, Sponges, Polyhedra, and IFS fractals — architectural, crystalline, and grid-based structures.
- **Hybrids & Experiments**: Formulas that combine folding with power functions, cyclic feedback, or novel mappings for unusual shapes.
- **Systems**: The **Modular Builder**, where you construct your own fractal by chaining operations together.
`},"formula.transform":{id:"formula.transform",category:"Formulas",title:"Local Rotation (Pre-Transform)",content:`
Rotates the coordinate system $(x,y,z)$ *before* the fractal formula is applied.

## Why use this?
- **Orientation**: Rotates the fractal object itself, rather than moving the camera around it. This is useful for aligning the fractal with lighting or fog.
- **Symmetry**: Changing the input rotation can drastically change the shape of box-folded fractals (like Amazing Box or Menger Sponge) because the folding planes are axis-aligned. Rotating the space causes the folds to cut at diagonal angles.
`}},Sd={"formula.mandelbulb":{id:"formula.mandelbulb",category:"Formulas",title:"Mandelbulb",parentId:"formula.active",content:`
## The Math
The Mandelbulb is a 3D analogue of the Mandelbrot set constructed using Spherical Coordinates.
The iteration maps a point $(x,y,z)$ to spherical $(r, 	heta, phi)$, powers it by $n$, and adds the constant $c$.
$$ v 	o v^n + c $$

**Reference:** [Wikipedia: Mandelbulb](https://en.wikipedia.org/wiki/Mandelbulb)
**Credits:** Discovered by **Daniel White** and **Paul Nylander**.

## Parameters
- **Power**: The exponent $n$.
  - **8.0**: The classic "Broccoli" shape discovered by Daniel White.
  - **2.0**: A smooth, bulbous shape similar to a 3D Cardioid.
- **Phase (theta, phi)**: A two-axis control for the polar and azimuthal angle offsets. Theta warps the bulbs vertically; phi twists them horizontally.
- **Z Twist**: Applies a spatial twist along the Z-axis after the power function.
- **Radiolaria**: A two-axis control — the first slider toggles the Radiolaria mutation on/off, and the second sets the Y-coordinate clamp limit.

## Radiolaria Mode
Inspired by **Tom Beddard's** Pixel Bender implementation.
If Param E is enabled (> 0.5), the formula clamps the Y-coordinate *during* the iteration loop.
This creates hollow, skeletal structures that resemble microscopic Radiolaria shells.
- **Tip**: Set Coloring Mode to **Trap** to highlight the "cut" surfaces, which are assigned a trap value of 0.
`},"formula.appell":{id:"formula.appell",category:"Formulas",title:"Appell Spectral (Ghost)",parentId:"formula.active",content:`
## The Math
Implements a simplified Appell polynomial iteration. The non-conformal subtraction term destabilizes the surface, revealing skeletal interference patterns.
$$ P(x) = x^n - k|x|^2 $$

## The "Ghost" Visuals
Because this formula subtracts magnitude during iteration, it doesn't converge to a hard surface like a standard Mandelbrot.
Instead, it creates a field of "Interference Patterns".
This implementation is designed to be rendered as a **Volumetric Cloud** (using the Glow engine) rather than a solid object.

## Parameters
- **Interference**: The strength of the subtraction term $k$.
  - **0.0**: Standard "Lathe" fractal (Solid).
  - **0.33**: The theoretical Euclidean balance point.
  - **> 0.5**: Breaks the surface, revealing internal veins and structures.
- **Power**: The exponent of the iteration. Default 2.0 for classic behavior; higher values create more complex structures.
- **Ghost Shift**: Shifts the calculation into the 4th dimension. Use this to scan through the "inside" of the ghost.
- **Cloud Density**: Artificially softens the Distance Estimator to make the fractal look like a nebula.
- **Phase**: Rotational offset applied to the azimuthal angle during iteration. Creates twisted, spiraling structures.
`},"formula.mandelorus":{id:"formula.mandelorus",category:"Formulas",title:"Mandelorus (HyperTorus)",parentId:"formula.active",content:`
## The Concept
Standard 3D fractals like the Mandelbulb suffer from "Polar Distortion"—the texture gets pinched at the top and bottom poles (like the north pole of a globe).
The **Mandelorus** solves this by mapping the infinite fractal plane onto the surface of a **Torus** (Donut) instead of a Sphere.
This creates a **Solenoid** structure where the fractal wraps around the ring endlessly.

## The Math
1. Convert 3D position $(x,y,z)$ to Toroidal coordinates $(radius, angle, z)$.
2. The poloidal cross-section (the slice of the donut) forms a complex plane.
3. We iterate the Mandelbrot formula on this slice.
4. We apply a **Twist** rotation to the slice based on the angle around the ring.

## Parameters
- **Ring Radius**: The major radius of the donut. Controls the size of the "hole".
- **Twist (Sym)**: The most important control. Spins the fractal pattern around the ring. Linked to Power so that 1.0 = one full symmetry step.
  - **0.0**: Creates a "Lathe" effect (constant cross-section).
  - **Values > 0**: Creates twisting, cable-like structures that connect endlessly.
- **Power**: The exponent of the Mandelbrot set ($z^2$, $z^3$, etc).
- **Phase (Ring, Cross)**: A two-axis control — the first slider shifts the fractal along the length of the tube, the second rotates the cross-section slice.
- **Vert Scale**: Scales the vertical (Z) axis of the torus cross-section. Use this to squash or stretch the fractal vertically.

## Usage
Perfect for creating "Endless Tunnels" or "Ouroboros" structures. Fly the camera inside the tube for infinite loops.
`},"formula.mandelbar3d":{id:"formula.mandelbar3d",category:"Formulas",title:"Mandelbar 3D (Tricorn)",parentId:"formula.active",content:`
## The Math
The 3D extension of the Tricorn (Mandelbar) fractal. The iteration uses: $x' = x^2 - y^2 - z^2$, $y' = 2xy$, $z' = -2xz$. The conjugation (negation on $z'$) creates the distinctive tri-corner symmetry.

**Reference:** [Wikipedia: Tricorn (Mathematics)](https://en.wikipedia.org/wiki/Tricorn_(mathematics))

## Parameters
- **Param A (Scale)**: Scales the entire coordinate system before iteration.
- **Rotation (Vec3B)**: 3D rotation using direction + angle (Rodrigues formula). Pre-calculated for performance.
- **Offset (Vec3A)**: Shifts the fractal along X/Y/Z axes.
- **Param F (Twist)**: Twists space based on Z-depth.

## Characteristics
Unlike the Mandelbulb, the Mandelbar tends to be flatter with shelf-like structures and "tri-corner" symmetries. It often resembles alien ruins or stacked pagodas.
`},"formula.mandelterrain":{id:"formula.mandelterrain",category:"Formulas",title:"Mandel Terrain",parentId:"formula.active",content:`
## The Math
This is not a true 3D fractal, but a heightmap generator. It calculates the 2D Mandelbrot set ($z^2+c$) on the XZ plane and uses the iteration count or orbit trap distance to displace the Y (Height) coordinate.

**Reference:** [Wikipedia: Mandelbrot Set](https://en.wikipedia.org/wiki/Mandelbrot_set)
**Credits:** Mathematical basis by **Benoit B. Mandelbrot**.

## Parameters
- **Map Zoom**: Zoom level into the 2D complex plane. Uses exponential scaling (power of 2).
- **Pan (Real, Imag)**: A two-axis control that moves the fractal center coordinates on the complex plane.
- **Height: Distance Estimator**: Controls the vertical displacement strength based on the Distance Estimator.
- **Height: Layer 2 Gradient**: Adds secondary ripples driven by the "Layer 2" gradient brightness.
- **Height: SmoothTrap**: Adds spikey towers based on Orbit Trap proximity.

## Usage
Ideal for creating alien landscapes, canyons, and "Math Mountains".
`},"formula.quaternion":{id:"formula.quaternion",category:"Formulas",title:"Quaternion Julia",parentId:"formula.active",content:`
## The Math
Quaternions are a 4-dimensional number system ($x, y, z, w$). This formula iterates the classic $z^2+c$ using Quaternion multiplication.
Since our screens are 2D and the fractal is 4D, we view a **3D Slice** of the 4D object.

**Reference:** [Wikipedia: Quaternion](https://en.wikipedia.org/wiki/Quaternion)
**Credits:** Number system described by **William Rowan Hamilton**.

## Parameters
- **Julia C (W)**: The 4th coordinate of the Julia Constant $C$. Changing this "animates" the fractal as you move through the 4th dimension.
- **Slice W**: The w-coordinate of the 3D slice we are rendering.
- **Damping**: Adds momentum feedback to the iteration trajectory, creating smoother variants of the fractal (Kosalos variant).
- **Inversion Radius**: Enables spherical inversion pre-transform. When greater than 0, inverts space around the Inversion Center, creating inside-out shapes.
- **Inversion Angle**: Angular twist applied during the spherical inversion.
- **Rot 3D (XY, XZ)**: A two-axis control for 3D rotations on the XY and XZ planes before iteration.
- **Rot 4D (XW, YW)**: A two-axis control for 4D rotations on the XW and YW planes. Creates "inside-out" morphing effects unique to 4D objects.
- **Inversion Center**: A three-axis control (X, Y, Z) that sets the center point for the spherical inversion.

## History
Quaternions were described by William Rowan Hamilton in 1843. They are the "true" 3D/4D extension of complex numbers, but because valid multiplication requires 4 dimensions, 3D slices often look "cut off" or smooth compared to the Mandelbulb.
`},"formula.amazingbox":{id:"formula.amazingbox",category:"Formulas",title:"Amazing Box (Mandelbox)",parentId:"formula.active",content:`
## The Math
The Mandelbox is defined by a "Map and Fold" algorithm rather than a power function.
1. **Box Fold**: If a point is outside the box $[-1, 1]$, reflect it back in.
2. **Sphere Fold**: If a point is inside a small sphere, scale it up (inversion).
3. **Scale**: Multiply the vector by a scale factor.

**Reference:** [Wikipedia: Mandelbox](https://en.wikipedia.org/wiki/Mandelbox)
**Credits:** Discovered by **Tom Lowe (Tglad)** in 2010.

## Parameters
- **Scale**: The density multiplier. Positive values create solid cubes; negative values create hollow, lattice-like structures.
- **Min Radius**: The inner radius of the Sphere Fold (linear scaling region).
- **Folding Limit**: The size of the folding box.
- **Fixed Radius**: The outer radius of the Sphere Fold (inversion region).
- **Pre-Rotation**: A three-axis rotation (X, Y, Z) applied *before* the folds, creating diagonal symmetries.

## History
It is famous for resembling Borg cubes, sci-fi cities, and brutalist architecture.
`},"formula.marblemarcher":{id:"formula.marblemarcher",category:"Formulas",title:"Marble Marcher",parentId:"formula.active",content:`
## The Math
The formula from the game *Marble Marcher*. It is a specialized Menger Sponge Iterated Function System (IFS) that incorporates dynamic rotation and linear shifting in every step.
Algorithm: abs → Rot Z → Menger fold (sort descending) → Rot X → Scale → Shift.

**Credits:** Created by **CodeParade** for the game [Marble Marcher](https://codeparade.itch.io/marblemarcher).

## Parameters
- **Param A (Scale)**: The scaling factor.
- **Shift (Vec3A)**: Linear translation vector (X, Y, Z).
- **Rotation (Vec3B)**: X = Rot Z angle (after abs), Y = Rot X angle (after Menger fold). Pre-calculated sin/cos for performance.

## Usage
Produces highly dynamic, shifting geometric landscapes. Animate the Rotation and Shift parameters to see the geometry unfold and reconfigure itself.
**Tip:** Select **Chebyshev** distance metric in Quality for the classic look.
`},"formula.mengersponge":{id:"formula.mengersponge",category:"Formulas",title:"Menger Sponge",parentId:"formula.active",content:`
## The Math
Based on the classic Sierpinski carpet extended to 3D. It recursively subdivides a cube into 27 sub-cubes and removes the center of each face and the center of the cube.
Our implementation adds **Rotation** to the folding steps, creating "Non-Orthogonal" Mengers.

**Reference:** [Wikipedia: Menger Sponge](https://en.wikipedia.org/wiki/Menger_sponge)

## Parameters
- **Scale**: The scaling factor. Standard Menger is 3.0.
- **Offset**: A three-axis control (X, Y, Z) for the spacing between sub-cubes. Axes can be linked for uniform scaling or adjusted independently for stretched variations.
- **Rotation**: A three-axis rotation (X, Y, Z) applied to the coordinate system between iterations.
- **Center Z**: A toggle (0 or 1). When on, restores the full cubic symmetry so the sponge is centered. When off, you get a corner-aligned fractal.

## Visuals
With rotations set to 0, it looks like a perfect grid. Adding slight rotations creates complex, diagonal, interlocking machinery.
`},"formula.kleinian":{id:"formula.kleinian",category:"Formulas",title:"Kleinian",parentId:"formula.active",content:`
## The Math
Based on Kleinian groups and Limit Sets. It utilizes **Inversion in a Sphere** as its primary operation.
The formula repeats: Box Fold $	o$ Sphere Inversion $	o$ Scale $	o$ Shift.

**Reference:** [Wikipedia: Kleinian Group](https://en.wikipedia.org/wiki/Kleinian_group)
**Credits:** Named after **Felix Klein**.

## Parameters
- **Param A (Scale)**: Controls the size of the spheres.
- **Param B (X Offset)**: Shifts the structure horizontally.
- **Param C (Fold Size)**: Limit of the initial box fold.
- **Param D (K Factor)**: Controls the strength of the spherical inversion.

## Visuals
Resembles organic structures: coral reefs, sponge tissues, or jewelry. It lacks the hard edges of the Mandelbox.
`},"formula.pseudokleinian":{id:"formula.pseudokleinian",category:"Formulas",title:"Pseudo Kleinian",parentId:"formula.active",content:`
## The Math
A modification of the Kleinian formula that introduces a "Magic Factor" (Param D) to warp the inversion logic. It mixes the properties of a Menger Sponge with a Kleinian set.

**Reference:** [Wikipedia: Kleinian Group](https://en.wikipedia.org/wiki/Kleinian_group)

## Parameters
- **Param A (Box Limit)**: Size of the folding box.
- **Param B (Size C)**: Radius of the inversion sphere.
- **Param C (Power)**: Controls the mixing of the coordinate space.
- **Param D (Magic)**: Blends between standard Kleinian and chaotic variation.
- **Param E (Z Shift)**: Vertical offset.
- **Param F (Twist)**: Spatial twist.

## Visuals
Creates intricate, filigree-like patterns that look like carved ivory or 3D printed metal.
`},"formula.dodecahedron":{id:"formula.dodecahedron",category:"Formulas",title:"Dodecahedron",parentId:"formula.active",content:`
## The Math
Kaleidoscopic IFS with true dodecahedral symmetry. Uses 3 golden-ratio reflection normals based on Knighty's method:
- $n_1 = \\text{normalize}(-1, \\phi-1, 1/(\\phi-1))$
- $n_2 = \\text{normalize}(\\phi-1, 1/(\\phi-1), -1)$
- $n_3 = \\text{normalize}(1/(\\phi-1), -1, \\phi-1)$

Each iteration reflects across all 3 normals × 3 repetitions = **9 fold operations**, producing the full icosahedral/dodecahedral reflection group.

**Reference:** [Wikipedia: Regular Dodecahedron](https://en.wikipedia.org/wiki/Regular_dodecahedron)
**Credits:** Based on **Knighty's** Kaleidoscopic IFS (Syntopia 2010).

## Parameters
- **Param A (Scale)**: Expansion factor. Default 2.618 (golden ratio).
- **Param B (Offset)**: Separation of the faces.
- **Rotation (Vec3B)**: 3D rotation using direction + angle (Rodrigues formula). Pre-calculated for performance.
- **Shift (Vec3A)**: Linear offset in X/Y/Z.
- **Param F (Twist)**: Twists the arms of the fractal along the Z-axis.

## Visuals
Produces soccer-ball-like symmetries, icosahedral viruses, and crystalline stars.
`},"formula.amazingsurface":{id:"formula.amazingsurface",category:"Formulas",title:"Amazing Surface",parentId:"formula.active",content:`
## The Math
A hybrid fractal that combines Menger Sponge sorting logic with Kleinian/Mandelbox inversion.
The iteration process:
1. **Sort Axes**: Like a Menger Sponge ($x < y$, etc).
2. **Box Fold**: Clamps and reflects geometry.
3. **Sphere Inversion**: The "Kleinian" part.
4. **Shift & Scale**.

## Parameters
- **Param A (Scale)**: Main scaling factor.
- **Param B (Inv Max)**: Clamps the sphere inversion radius.
- **Param C (Box Size Z)**: Stretches the folding box.
- **Param D (Trans Z)**: Z-axis shift.
- **Param E (Pre-Scale)**: Scales input before folding.
- **Param F (Thickness)**: Defines the surface thickness.
`},"formula.phoenix":{id:"formula.phoenix",category:"Formulas",title:"Phoenix 3D",parentId:"formula.active",content:`
## The Math
A 3D generalization of the Phoenix set. Unlike Julia sets which depend only on $z_n$, Phoenix depends on the *previous* iteration $z_{n-1}$.
$$ z_n = z_{n-1}^p + c + K cdot z_{n-2} $$

**Reference:** [Wikipedia: Phoenix Set](https://en.wikipedia.org/wiki/Phoenix_set)

## Parameters
- **Power (p)**: The main exponent applied via spherical coordinates.
- **History Exp**: Exponent applied to the previous iteration value $z_{n-1}$. At 1.0 it is linear; higher values create more extreme feedback.
- **Twist**: Applies a spatial twist along the Z-axis before the power function.
- **History Depth**: Blends between $z_{n-1}$ (depth 0) and $z_{n-2}$ (depth 1) for deeper memory effects.
- **Distortion (Re, Im)**: A two-axis control for the historical influence $K$. The real and imaginary components control how the previous iteration feeds back into the current one.
- **Phase (theta, phi)**: A two-axis control for phase offsets applied to the spherical angles during the power function.
- **Stretch**: A three-axis control (X, Y, Z) for anisotropic stretching of the coordinates. Axes can be linked for uniform scaling.
- **Abs Fold**: A three-axis toggle (per-axis on/off) that applies absolute value folding after the power function, creating "Burning Phoenix" variants.
- **Pre-Rotation**: A three-axis rotation (X, Y, Z) applied before the power function.

## Visuals
Creates distorted, stretching shapes that look like pulling taffy or molten glass.
`},"formula.buffalo":{id:"formula.buffalo",category:"Formulas",title:"Buffalo 3D",parentId:"formula.active",content:`
## The Math
The Buffalo fractal — a Mandelbulb variant with **selective per-axis absolute value folding**. Ported from Mandelbulber via 3Dickulus, based on the original by youhn @ fractalforums.com.

The signature feature is choosing which axes get abs() applied before and after the power iteration. The default (abs on Y+Z post-iteration) creates the distinctive "buffalo horn" shape.

**Reference:** [Wikipedia: Burning Ship Fractal](https://en.wikipedia.org/wiki/Burning_Ship_fractal) (Mathematical cousin)

## Parameters
- **Param A (Power)**: The Mandelbulb exponent. Default 2 for the classic Buffalo shape.
- **Abs After Power (Vec3A)**: Per-axis absolute value toggles AFTER the power iteration (0=off, 1=on). Default: Y=1, Z=1 for the signature buffalo shape.
- **Abs Before Power (Vec3B)**: Per-axis absolute value toggles BEFORE the power iteration (0=off, 1=on). Default: all off.
- **Rotation (Vec3C)**: 3D rotation using direction + angle (Rodrigues formula).

## Visuals
With default post-abs Y+Z: creates the distinctive buffalo/horn shape. Try different abs combinations for varied symmetries. All axes on = classic Burning Ship style.
`},"formula.mixpinski":{id:"formula.mixpinski",category:"Formulas",title:"MixPinski",parentId:"formula.active",content:`
## The Math
A faithful port of **Darkbeam's** 4D Sierpinski-Menger hybrid from Fragmentarium. Alternates between two folding systems in 4D:
1. **Sierpinski folds**: 6 axis-pair reflections in 4D $(x+y, x+z, y+z, x+w, y+w, z+w)$, then uniform scale + offset.
2. **Menger folds**: Axis-aligned scale with Z abs-fold, creating the characteristic rectangular holes.

**Credits:** Original by **Darkbeam** (Fragmentarium).

## Parameters
- **Param A (Sierpinski Scale)**: Scale for the Sierpinski phase.
- **Param C (Menger Scale)**: Scale for the Menger phase.
- **Param B (W 4th Dim)**: Initial 4th dimension coordinate (w-component).
- **Sierpinski Offset (Vec3A)**: XYZ offset for the Sierpinski phase.
- **Menger Offset (Vec3B)**: XYZ offset for the Menger phase.
- **4D Offsets (Vec2A)**: X = Sierpinski W offset, Y = Menger W offset.
- **Rotation (Vec3C)**: 3D rotation (Rodrigues formula).

## Distance Estimator
Uses a custom 4D Chebyshev norm: $r = \\max(|x|, |y|, |z|, |w|)$, then $(r-1)/|dr|$.

## Visuals
Creates complex hybrid structures mixing tetrahedral and cubic symmetries — mechanical lattices, alien cityscapes, and intricate geometric patterns.
`},"formula.sierpinskitetrahedron":{id:"formula.sierpinskitetrahedron",category:"Formulas",title:"Sierpinski Tetrahedron",parentId:"formula.active",content:`
## The Math
The classic Sierpinski Tetrahedron (Tetrix) — a 3D IFS fractal built from reflective folds across tetrahedron face planes.
Each iteration applies 3 fold operations:
1. If $x + y < 0$: swap and negate $x, y$
2. If $x + z < 0$: swap and negate $x, z$
3. If $y + z < 0$: swap and negate $y, z$

Then scales and offsets the result.

**Reference:** [Wikipedia: Sierpinski Triangle (Higher Dimensions)](https://en.wikipedia.org/wiki/Sierpi%C5%84ski_triangle#Analogs_in_higher_dimensions)

## Parameters
- **Scale (Vec3C)**: Per-axis scale factor with linkable toggle for uniform scaling. Default 2.0.
- **Param B (Offset)**: Separation of child tetrahedrons.
- **Rotation (Vec3B)**: 3D rotation using direction + angle (Rodrigues formula). Pre-calculated for performance.
- **Shift (Vec3A)**: Linear offset in X/Y/Z.
- **Param F (Twist)**: Z-axis twist.

## Distance Estimator
Uses Linear (Unit 1.0) estimator: $(r-1)/dr$, correct for IFS with default scale 2 and offset 1.

## Visuals
Creates "Greeble" surfaces — patterns that look like highly detailed mechanical plating or cityscapes from a bird's eye view.
`},"formula.amazingsurf":{id:"formula.amazingsurf",category:"Formulas",title:"Amazing Surf",parentId:"formula.active",content:`
## The Math
A variation of the Amazing Box discovered by **Kali**. It adds a sinusoidal wave function to the iteration, creating organic, flowing forms.
$$ z 	o 	ext{Fold}(z) + sin(z) $$

**Credits:** Discovered by **Kali** (Fractal Forums).

## Parameters
- **Scale**: Box scale.
- **Min Radius**: Sphere fold radius.
- **Wave Freq**: Frequency of the sine waves.
- **Wave Amp**: Amplitude (height) of the sine waves.
- **Transform**: A three-axis control — X is Wave Twist (twists the wave direction), Y is Vertical Shift (shifts the waves up/down), and Z is available for additional effects.

## Visuals
Creates structures that look like melting machinery, flowing liquid metal, or alien biomechanical surfaces.
`},"formula.boxbulb":{id:"formula.boxbulb",category:"Formulas",title:"Box Bulb",parentId:"formula.active",content:`
## The Math
A direct hybrid of the Box Fold (Mandelbox) and the Mandelbulb.
In each iteration, it first applies a Box Fold, then feeds that result into the Mandelbulb Power function.

## Parameters
- **Param A (Power)**: Mandelbulb exponent.
- **Param B (Min Radius)**: Sphere fold inner radius.
- **Param C (Scale)**: Box fold scale.
- **Param D (Fixed Radius)**: Sphere fold outer radius.
- **Param E/F (Rotation)**: Rotates the coordinates between the Fold and the Power step.

## Visuals
Creates "Boxy Bulbs"—fractals that have the general shape of a Mandelbulb but with square, mechanical surface details.
`},"formula.mengeradvanced":{id:"formula.mengeradvanced",category:"Formulas",title:"Menger Advanced",parentId:"formula.active",content:`
## The Math
An advanced version of the Menger Sponge shader with expanded control over the folding axes and shifts.

**Reference:** [Wikipedia: Menger Sponge](https://en.wikipedia.org/wiki/Menger_sponge)

## Parameters
- **Param A (Scale)**: Size multiplier (3.0 is standard).
- **Param B (Offset)**: Spacing of the sponge.
- **Param C (Rot X)**: Rotates the X-axis fold.
- **Param D (Rot Z)**: Rotates the Z-axis fold.
- **Param E (Shift)**: Linear shift applied after scaling.
- **Param F (Twist)**: Global twist.

## Visuals
Capable of generating "impossible geometry", piping systems, and Escher-like architectural loops.
`},"formula.bristorbrot":{id:"formula.bristorbrot",category:"Formulas",title:"Bristorbrot",parentId:"formula.active",content:`
## The Math
A custom 3D polynomial fractal. No folding or spherical conversion — the asymmetric cross-terms between axes create sharp crystalline edges mixed with smooth bulb regions.
$$x' = x^2 - y^2 - z^2$$
$$y' = y(2x - z)$$
$$z' = z(2x + y)$$

**Credits:** Discovered by **Bristor** (Fractal Forums).

## Parameters
- **Param A (Scale)**: Overall size multiplier.
- **Param B (Offset)**: Y-axis linear offset.
- **Rotation (Vec3A)**: 3D rotation with direction + angle (rotation mode). Pre-calculated sin/cos.
- **Param C (Shift X)**: X-axis shift.
- **Param D (Twist)**: Z-axis twist.

## Visuals
Produces bulbous but distorted shapes, often with large smooth areas contrasted by sharp, bristly details (hence the name).
`},"formula.makinbrot":{id:"formula.makinbrot",category:"Formulas",title:"Makin Brot",parentId:"formula.active",content:`
## The Math
A custom 3D polynomial discovered by **Makin** (Fractal Forums). Uses a variation of the triplex multiplication:
$$x' = x^2 - y^2 - z^2$$
$$y' = 2xy$$
$$z' = 2z(x - y)$$

## Parameters
- **Param A (Scale)**: Size multiplier.
- **Rotation (Vec3B)**: 3D rotation using direction + angle (Rodrigues formula). Pre-calculated for performance.
- **Shift (Vec3A)**: Linear offset in X/Y/Z.
- **Param F (Twist)**: Z-axis twist.

## Visuals
Known for creating "Pagoda" shapes and deeply stacked, ornate structures.
`},"formula.tetrabrot":{id:"formula.tetrabrot",category:"Formulas",title:"Tetrabrot",parentId:"formula.active",content:`
## The Math
A pseudo-4D fractal. It uses a specific "Tetrahedral Squaring" function on a 4-component vector, then projects it down to 3D.

**Reference:** [Wikipedia: Quaternion](https://en.wikipedia.org/wiki/Quaternion) (Mathematical basis)

## Parameters
- **Param A (Julia C/W)**: The 4th dimensional constant.
- **Param B (Slice W)**: The 4th dimensional slice plane.
- **Param E (Rot Z)**: Rotation in the Z plane.
- **Param F (Rot X)**: Rotation in the X plane.

## Visuals
Similar to the Quaternion set but often produces more geometric, diamond-like symmetries.
`},"formula.modular":{id:"formula.modular",category:"Formulas",title:"Modular Builder",parentId:"formula.active",content:`
## The System
The Modular Builder allows you to construct your own fractal equation by chaining operations together.
Instead of a fixed equation, you drag-and-drop operations in the **Graph** tab.

## Node Types
- **Transforms**: Rotate, Scale, Translate, Twist.
- **Folds**: Box Fold, Sphere Fold, Abs, Plane Fold.
- **Fractals**: Mandelbulb, Menger.
- **Combiners (CSG)**: Union, Subtract, Intersect, Smooth Union.

## Usage
1. Open the **Graph** tab (or switch Formula to "Modular").
2. Right-click to add nodes.
3. Connect **Input (Z)** $	o$ **Nodes** $	o$ **Output (Distance)**.
4. Bind node parameters to global sliders (Param A-F) to animate them.
`},"formula.juliamorph":{id:"formula.juliamorph",category:"Formulas",title:"Julia Morph",parentId:"formula.active",content:`
## The Math
This formula creates a 3D volume by stacking 2D Julia sets along the Z-axis.
Instead of a single constant $C$, the value of $C$ interpolates from a Start value to an End value as $Z$ changes.

## Parameters
- **Height (Z Scale)**: Controls the vertical extent of the Julia stack.
- **Slice Interval**: Spacing between repeating slices. Set to 0 for a continuous solid.
- **Slice Thickness**: The width of each slice. Creates disjointed, floating layers (like MRI scans or topographic maps).
- **Start C**: A two-axis control (Real, Imaginary) for the Julia constant at the bottom of the stack.
- **End C**: A two-axis control (Real, Imaginary) for the Julia constant at the top. The constant smoothly interpolates between Start C and End C along the height.
- **Twist**: Rotates the 2D Julia cross-section around the center as Z changes, creating spiraling structures.
- **Bend**: Curves the entire column along the X-axis. Positive and negative values bend in opposite directions.
- **Taper**: Scales the cross-section based on Z position — positive values make the top wider, negative makes it narrower.
`},"formula.borromean":{id:"formula.borromean",category:"Formulas",title:"Borromean (Cyclic)",parentId:"formula.active",content:`
## The Math
Treats 3D space as three coupled 2D complex planes (XY, YZ, ZX). The output of one plane feeds into the next, creating a cyclic "Rock-Paper-Scissors" feedback loop. This produces tetrahedral symmetries and solid, non-spherical shapes without using spherical coordinates.

## Parameters
- **Param A (Power)**: Exponent applied to each axis component. Default 2.0.
- **Param B (Connection)**: The "Link Strength" — controls coupling between planes via cross-terms. Higher values create more interlocking geometry.
- **Param C (Repulsion)**: The "Subtractive Force" — how much adjacent axis power is subtracted. Creates voids and cavities.
- **Param D (Balance)**: "Mixing Force" — adds a third axis into each equation, breaking bilateral symmetry.
- **Param E (Phase)**: Phase shift rotation applied per iteration.
- **Param F (Invert)**: Sign flip toggle for the connection cross-terms. Switches between two distinct fractal families.

## Visuals
Creates unique tetrahedral and cubic symmetries that look fundamentally different from spherical-coordinate fractals like the Mandelbulb. Good for crystalline, mineral-like structures.
`},"formula.kalibox":{id:"formula.kalibox",category:"Formulas",title:"Kali Box",parentId:"formula.active",content:`
## The Math
A Mandelbox variant by **Kali** (fractalforums.com), optimized by **Rrrola**. The iteration combines:
1. **Rotation** around the (1,1,0) axis
2. **Abs-fold + Translation** (classic box fold)
3. **Clamped Sphere Inversion** (Rrrola's optimization)
4. **Scale and add constant**

**Credits:** Original by **Kali** (fractalforums.com), sphere inversion optimization by **Rrrola**.

## Parameters
- **Param A (Scale)**: Overall scaling factor. Default 2.043.
- **Param B (MinRad2)**: Minimum radius squared for the sphere inversion clamp. Controls "density" of detail.
- **Translation (Vec3A)**: Added after the abs-fold. Primary shape control.
- **Param F (Rotation)**: Axis-angle rotation around (1,1,0), applied each iteration.

## Visuals
Produces organic, cave-like structures and alien landscapes. Less "boxy" than the standard Mandelbox due to the rotation and clamped inversion.
`},"formula.mandelmap":{id:"formula.mandelmap",category:"Formulas",title:"MandelMap (Unrolled)",parentId:"formula.active",content:`
## The Math
"Unrolls" the Mandelbulb surface onto a flat plane using coordinate projection. The XZ plane maps to angles on the bulb surface, and Y maps to radius offset. Three projection modes are available.

## Projections (Param D)
- **Spherical (0)**: Mercator-like mapping. Classic look, distorts at poles.
- **Cylindrical (1)**: Unwraps to an infinite vertical column. No polar distortion.
- **Toroidal (2)**: Wraps around a donut. Seamless tiling in all directions.

## Parameters
- **Param A (Power)**: Mandelbulb exponent. Default 8.0.
- **Param B (Height Amp)**: Controls how Y maps to radius offset (vertical amplitude).
- **Param C (Map Scale)**: Scales XZ coordinates before projection (texture density).
- **Param D (Projection)**: Dropdown — Spherical / Cylindrical / Toroidal.
- **Phase (Vec2A)**: Phase shifts for theta and phi angles. Includes "Symmetry Shift" compensation to lock features in place as they mutate.

## Visuals
Creates infinite fractal terrains, tileable surfaces, and seamless textures. The Toroidal mode is perfect for endless tunnels and looping worlds.
`},"formula.mandelbolic":{id:"formula.mandelbolic",category:"Formulas",title:"MandelBolic",parentId:"formula.active",content:`
## The Math
The MandelBolic is a true 3D geometric extension of the Mandelbrot set into Hyperbolic 3-Space using the Poincaré-Ahlfors extension.

This approach bypasses the limitations of 3D algebra by preserving perfect spherical bulbs, exact periodicity, and the true 3D cardioid core without the "smeared" artifacts of standard 3D fractals.

## The Ahlfors Extension
The formula uses a conformal mapping that extends the complex plane into hyperbolic 3-space:
$$ M = (|Z|^2 - T^2) / |Z|^2 $$

Where Z is the 2D complex plane (x, y) and T is the hyperbolic height (z).

## Parameters
- **Param A (Power)**: The exponent of the iteration. Default is 2.0 for classic Mandelbrot behavior.
- **Param B (Hyp. Scale)**: Scales the hyperbolic height growth. Controls how fast the Z-dimension expands.
- **Param C (Conformal Shift)**: Distorts the hyperbolic mapping. Creates unique geometric variations.
- **Param D (Phase Twist)**: Adds rotational offset during iteration. Creates spiraling arms.
- **Param E (Z-Offset)**: Constant offset added to the Z coordinate each iteration.
- **Param F (Trap Scale)**: Scales the orbit trap distance for coloring.

## Visuals
Creates organic, bulbous structures with perfect spherical details. The hyperbolic extension produces unique "saddle" and "feather" filaments that differ from standard Mandelbulb fractals.
`},"formula.claude":{id:"formula.claude",category:"Formulas",title:"Claude",parentId:"formula.active",content:`
## Origin
This formula was designed by **Claude** (Anthropic's AI) as a self-portrait in mathematics. Given the prompt *"create a fractal that embodies Claude,"* it chose the golden ratio $\\phi$ as the unifying principle — a constant that appears in nature, art, and geometry as the archetype of harmony emerging from simple rules. The result is a fractal where every structural element traces back to $\\phi$: the fold planes, the rotation axis, and the default parameters.

## The Math
A harmonic resonance fractal built entirely on the golden ratio $\\phi = (1+\\sqrt{5})/2$.

The iteration combines four operations:

1. **Icosahedral Fold** — Three reflections across planes whose normals are constructed from $\\phi$:
   - $n_1 = \\text{normalize}(-1,\\; \\phi\\!-\\!1,\\; 1/(\\phi\\!-\\!1))$
   - $n_2 = \\text{normalize}(\\phi\\!-\\!1,\\; 1/(\\phi\\!-\\!1),\\; -1)$
   - $n_3 = \\text{normalize}(1/(\\phi\\!-\\!1),\\; -1,\\; \\phi\\!-\\!1)$
   These create partial icosahedral (5-fold) symmetry in a single pass of 3 reflections.

2. **Harmonic Fold** — A 4th reflection plane whose normal is $n_3$ rotated around the **golden axis** $(1, \\phi, 0)$ by the Harmonic angle, using the Rodrigues formula. This is unique to this formula — no other IFS fractal has a continuously-variable fold normal direction.

3. **Sphere Inversion** — Clamped Mandelbox-style: points inside Inner R² are scaled by $\\text{Fix}/\\text{Inner}$, points between Inner R² and Fix R² are inverted by $\\text{Fix}/r^2$. Creates recursive depth.

4. **IFS Scale + Offset** — Standard $z = S \\cdot z - \\text{offset} \\cdot (S-1)$, centering the attractor at the Offset position.

## Parameters
- **Param A (Scale)**: Main IFS expansion factor. Default 2.0.
- **Param B (Harmonic)**: Angle (radians) that sweeps the 4th fold plane around the golden axis. Like an overtone enriching a fundamental frequency.
  - **0.0**: 4th fold coincides with $n_3$ (redundant — pure icosahedral base).
  - **0.61**: Default. Creates rich structural variation.
  - **±π**: Maximum deviation from base symmetry.
- **Param C (Inner R²)**: Sphere fold inner radius squared. Smaller = more recursive detail.
- **Param D (Fix R²)**: Sphere fold fixed radius squared. Controls where inversion activates.
- **Offset (Vec3A)**: 3D IFS center. The fractal attractor converges at this point.
- **Rotation (Vec3B)**: Pre-fold 3D rotation (azimuth/pitch/angle, Rodrigues formula). Changes which region of space enters each fold sector.
- **Param F (Twist)**: Position-dependent rotation along the Y-axis. Creates spiraling arms.

## The Golden Ratio Connection
$\\phi$ appears at every level of this fractal:
- **Fold normals** $n_1, n_2, n_3$ — constructed from $\\phi$ and $1/\\phi$
- **Golden axis** $(1, \\phi, 0)$ — an icosahedral vertex direction, used as the harmonic sweep axis
- **Default harmonic angle** 0.61 $\\approx 1/\\phi$ — the golden ratio conjugate

## Visuals
Produces organic, layered structures with pentagonal symmetry undertones. The harmonic fold creates smooth structural transitions as you sweep through the parameter — like zooming through different "perspectives" of the same golden-ratio geometry. Best explored with the Rotation control to find different viewpoints of the fold structure.
`}},Md={"panel.formula":{id:"panel.formula",category:"Parameters",title:"Formula Parameters",content:`
This panel controls the mathematical equation that defines the fractal's shape.

## How Fractals Work (The Basics)
Fractals are generated by a **Feedback Loop**. We take a point in space ($z$), apply a formula to it, and feed the result back into the formula. We do this many times.
- If the point stays close to the center, it is "solid" (inside the fractal).
- If it shoots off to infinity, it is "empty space".

## Parameters (A-F)
The sliders **Param A** through **Param F** change the constants used in that formula. 
Because every formula is different, these parameters do different things depending on which fractal you have selected.
- **Param A** is usually the most important (Power, Scale, or Size).
- Check the **Help Library** for the specific formula (e.g. "Mandelbulb") to see exactly what each parameter does.

## Iterations
Controls how many times the loop runs.
- **Low (4-8)**: The shape looks smooth, blobby, or simple.
- **High (16-30)**: Fine details, recursive branches, and complex textures emerge.
- **Warning**: Higher iterations take more computing power.

## ⚡ Quick Edit Hotkeys
You can adjust parameters without opening the panel!
1. Hover your mouse over the 3D viewport.
2. Press keys **1, 2, 3, 4, 5, or 6**.
3. A popup slider will appear at your mouse cursor for Param A (1) through Param F (6).
`},"hybrid.mode":{id:"hybrid.mode",category:"Formulas",title:"Hybrid Mode (Box Fold)",content:`
Injects a "Mandelbox" cage around the active fractal.

## Modes
The engine has two different ways of calculating hybrids.

### 1. Standard (Fast Path)
This is the default mode. It runs a fixed loop of Box Folds *before* the main fractal iterations.
- **Performance**: Extremely fast. Zero compilation time.
- **Visual**: Creates a "Cage" or "Frame" around the fractal.
- **Limitations**: Cannot interleave folds (e.g., Box -> Bulb -> Box -> Bulb).

### 2. Advanced Mixing (Complex Path)
Click the **Lock Icon** to enable this.
This mode merges the Box Fold logic into the main iteration loop, allowing for complex **Alternating Formulas**.
- **Capabilities**: Enables **Box Skip** (interleaving) and **Swap Order**.
- **Warning**: Requires a complex shader recompilation. Toggling this on/off takes 30-60 seconds.

## Parameters
- **Box Iterations**: How many times to apply the Box Fold.
- **Scale**: The density of the box frame.
- **Min/Fixed Radius**: Controls the spherical inversion void in the center of the box.
- **Box Skip (Advanced)**: The interval between folds.
    - *Consecutive*: Box, Box, Box, Main...
    - *Every 2nd*: Box, Main, Box, Main... (Interleaved).
- **Swap Order (Advanced)**: Changes whether the Box Fold or Main Formula runs first in the loop.
`},"julia.mode":{id:"julia.mode",category:"Formulas",title:"Julia Mode",content:`
Unlocks the 4D parameter space of the fractal.

**Reference:** [Wikipedia: Julia Set](https://en.wikipedia.org/wiki/Julia_set)
**Credits:** Named after **Gaston Julia**.

## Mandelbrot vs. Julia
-   **Mandelbrot (Default)**: Each pixel represents a different *parameter* $C$. The shape is a map of "behavior". It shows where the formula explodes vs where it stays stable.
-   **Julia (Enabled)**: $C$ is fixed for the entire image (controlled by the **Julia X/Y/Z** sliders). Each pixel represents a different *starting position* $z_0$.

## Usage
1.  Enable **Julia Mode**.
2.  The shape will change significantly.
3.  Adjust **Julia X/Y/Z** sliders. You are now "morphing" the fractal.
4.  Effectively, the "Mandelbrot" shape acts as a map. If you set the Julia coordinates to a point that looks cool on the Mandelbrot map, you will explore the 3D structure of that specific coordinate.

## Animation
Animating the Julia coordinates is the best way to create "shapeshifting" organic motion loops.
`},"lfo.system":{id:"lfo.system",category:"Animation",title:"LFO Modulators",content:`
**Low Frequency Oscillators** allow you to animate parameters automatically over time.

## Usage
1. Click **+** to add an LFO.
2. Select a **Target** (e.g., Param A).
3. Choose a **Shape** (Sine, Sawtooth, Noise).
4. Adjust **Period** (Speed) and **Amplitude** (Strength).

The slider for the target parameter will show a **purple indicator line** on the slider track, showing the current modulated value in real time.
`}},Cd={"ui.controls":{id:"ui.controls",category:"UI",title:"Control Deck",content:`
The Control Deck is your primary interface for manipulating the fractal.

## Docking System
The deck is designed to be flexible for multi-monitor or large screen workflows.
- **Undocking**: Click the **Undock Icon** (Square with arrow) next to a tab name to detach it into a floating window.
- **Redocking**: Close the floating window to return it to the main deck.
- **Minimizing**: Click the chevron arrow in the header to collapse the panel to the side/bottom.

## Tabs
- **Formula**: Shape structure, iterations, and core math parameters.
- **Scene**: Camera, Navigation, Fog, and Depth of Field.
- **Light** (Advanced Mode): Lighting studio (3 lights) and shadows.
- **Shader**: Surface material (PBR), Glow, and Ambient Occlusion.
- **Gradient**: Color palettes and texturing.
- **Quality**: Performance tuning, Anti-aliasing, and Resolution.
- **Engine**: Compile-time settings that require shader recompilation.
- **Audio** (when enabled): Audio-reactive parameters.
- **Drawing** (when enabled): Measurement and annotation tools.
- **Camera Manager**: Camera presets, saved views, and composition guides.
- **Graph** (Modular Mode): The node-based formula builder.
`},"ui.viewport":{id:"ui.viewport",category:"UI",title:"Viewport Interaction",content:`
The main view displays the fractal in real-time.

## Focus Picking (DOF)
To set the **Depth of Field** focal plane exactly on a subject:
1. Go to the **Scene** tab.
2. Click **Pick Focus**.
3. Click anywhere on the fractal surface in the viewport.
The camera lens will focus perfectly on that point, blurring foreground and background elements based on the **Aperture** setting.

## Light Gizmos
When the **Light Panel** is open or "Show 3d helpers" is enabled:
- Each light appears as a 3D gizmo with colored axis lines (X=red, Y=green, Z=blue), colored planes, and a center dot filled with the light's color.
- **Drag** the gizmo to reposition the light directly in 3D space.
- **Click the Anchor Icon** below the gizmo to toggle between **Headlamp** (light moves with the camera) and **World** (light stays fixed in the scene) modes.
`},"ui.colorpicker":{id:"ui.colorpicker",category:"UI",title:"Color Picker",content:`
The application uses a compact, high-precision **HSV Slider** system.

## Usage
- **Hue (H)**: Top bar. Shows the spectrum of colors.
- **Saturation (S)**: Middle bar. Intensity of color (Left=White, Right=Vivid).
- **Value (V)**: Bottom bar. Brightness (Left=Black, Right=Bright).

## Context Menu
**Click** or **Right-click** the color swatch (square on the left) to access:
- **Copy/Paste**: Transfer hex codes between pickers.
- **History**: Quickly revert to recently used colors.
- **Quick Picks**: Pure White/Black shortcuts.
`},"ui.gradient_editor":{id:"ui.gradient_editor",category:"UI",title:"Gradient Editor",content:`
A spline-based color ramp editor used for surface coloring.

## Interaction
- **Add Knot**: Click anywhere on the bottom track. In **Step** mode, new knots inherit the held color instead of interpolating.
- **Move Knot**: Drag a knot left/right.
- **Remove Knot**: Drag a knot away from the track or press Delete.
- **Select Multiple**: Drag a selection box or **Shift+Click** knots.
- **Duplicate Knot**: **Ctrl+Drag** a knot to duplicate it.
- **Bias**: Drag the diamond handle between knots to shift the interpolation midpoint. Hidden in **Step** mode (no effect).

## Interpolation Modes
Each knot controls how color transitions to the next knot:
- **Linear**: Straight RGB blend (default).
- **Step**: Hard color switch at the next knot boundary — no blending.
- **Smooth**: Smoothstep easing (ease-in/ease-out).

## Multi-Selection
Select 2+ knots to reveal **bracket handles**:
- **Drag the selection area** to move all selected knots together.
- **Drag the [ ] brackets** on either side to scale/compress the selection. Dragging a bracket past the opposite side inverts the knot order.
- **Ctrl+Drag the selection area** to duplicate the selected knots.

## Presets
Click the **Presets** button (top-right) to load predefined gradients, or Copy/Paste gradients as JSON.

## Context Menu
Right-click the track to:
- **Distribute**: Evenly space selected knots.
- **Invert**: Flip the gradient.
- **Double Knots**: Increase resolution.
- **Bias Handles**: Toggle visibility of bias diamond handles.
- **Reset Default**: Restore the gradient to its default state.
- **Delete Selected**: Remove all currently selected knots.
- **Output Mode**: Switch color space (sRGB, Linear, Inverse ACES).
`},"ui.histogram":{id:"ui.histogram",category:"UI",title:"Histogram & Auto-Levels",content:`
The Histogram visualizes the distribution of values across the fractal surface.

## Why is it useful?
Fractal coloring is based on mapping a value (like Orbit Trap distance) to a gradient.
If the mapping range doesn't match the actual values in the fractal, the image will look flat (all one color) or washed out.

## Controls
- **Graph**: Shows frequency of values. Tall bars mean "lots of pixels have this value".
- **Range Handles**: Drag the left/right handles to define the start/end of the gradient.
- **Auto**: Automatically analyzes the frame and sets the range to cover the most interesting data (ignoring background noise).
- **Refresh**: Manually re-scan the frame (useful if Auto is off to save performance).
`},"ui.slider":{id:"ui.slider",category:"UI",title:"Precision Sliders",content:`
All numeric inputs in the application use **Precision Draggable Sliders**.

## Interaction
- **Drag Number**: Click and hold the number display text to adjust the value. This allows values to extend beyond the visual slider's min/max limits.
- **Shift + Drag Number**: **10x Speed**. Useful for large adjustments.
- **Alt + Drag Number**: **0.1x Precision**. Useful for fine-tuning.
- **Click Number**: Switch to typing mode to enter exact values.
- **Reset**: Hover over the right edge of the slider track to reveal a hidden reset button (restores default value).

## Keyframing
If the Timeline is open and recording, changing a slider will automatically create a keyframe.
Sliders with active animations (LFO or Keyframes) will show a **Key Icon** or Highlight color.
`},"ui.vector":{id:"ui.vector",category:"UI",title:"Vector3 & Vector2 Controls",content:`
Multi-axis numeric controls for position, rotation, and transformation parameters.

## Translation Mode (Default)
Standard X, Y, Z (or X, Y) axis controls.
- **Axis Labels**: X (red), Y (green), Z (blue)
- **Drag**: Adjust individual axis values
- **Double-click Label**: Reset that axis to its default value

## Rotation Mode
Automatically activated for rotation parameters (detected by "rot" in the name).
Displays a **Heliotrope** direction visualizer alongside the numeric inputs.

### Heliotrope (Direction Visualizer)
The circular widget shows the rotation direction in 3D space.
- **Center Dot**: Points toward the camera (forward)
- **Arrow**: Shows the direction the rotation is pointing
- **Boundary Ring**: Represents 90° from center
- **Drag**: Change azimuth (horizontal) and pitch (vertical)
- **Shift + Drag**: Constrain to single axis
- **Alt + Drag**: High precision mode
- **Double-click**: Reset both angles to 0

### Rotation Axes (A, P, ∠)
- **A (Azimuth)**: Horizontal rotation angle (-π to +π)
- **P (Pitch)**: Vertical tilt angle (-π/2 to +π/2)
- **∠ (Angle)**: Additional rotation around the direction vector (vec3 only)

### Unit Display
- **Right-click** the control to toggle between Degrees (°) and Radians (π)
- Display shows 1 decimal, text input accepts up to 6 decimals
- In π mode, type values like "0.5π" or "90°"
`},"panel.drawing":{id:"panel.drawing",category:"UI",title:"Measurement & Drawing",content:`
Tools for annotated screenshots, measurements, and composition planning.

## Tools
- **Rectangle / Circle**: Select a shape type.
- **Origin Modes**:
  - **Global Zero**: Draws on the world plane $(0,0,0)$.
  - **Surface Probe**: Draws on a plane perpendicular to the camera at the exact distance of the fractal surface (like a 3D cursor).

## Keyboard Modifiers
- **Drag**: Draw shape corner-to-corner.
- **Hold Alt**: Draw from Center outward.
- **Hold Shift**: Constrain to 1:1 ratio (Perfect Square/Circle).
- **Hold X**: Snap plane to nearest World Axis (Front/Top/Side).
- **Hold Space**: Move the starting anchor point while drawing.
`},"panel.webcam":{id:"panel.webcam",category:"UI",title:"Webcam Overlay",content:`
> **REQUIRES ADVANCED MODE**

Overlays a live webcam feed on top of the viewport. Useful for recording tutorials, live streaming, or picture-in-picture compositions.

## Features
- **Drag & Resize**: Move and resize the webcam window directly in the viewport.
- **Crop**: Drag the edge handles to crop the feed.
- **Blend Modes**: Normal, Screen, Overlay, Lighten, Difference.
- **Opacity**: 0-3x range (values above 1 boost brightness).
- **3D Tilt**: Applies perspective rotation for a dynamic look.
- **CRT Scanlines**: Retro scanline effect overlay.

## Input Visualization
When enabled, also displays an overlay showing currently pressed keys (WASD, modifiers, mouse buttons, scroll) with fade animations. Useful for tutorials.
`},"panel.camera_manager":{id:"panel.camera_manager",category:"UI",title:"Camera Manager",content:`
Manage camera positions, presets, and composition guides.

## Quick Views
Preset buttons for standard views: **Front, Back, Left, Right, Top, Bottom, Isometric**. Click to teleport the camera instantly.

## Saved Cameras
- **Save**: Click "New Camera" to bookmark the current position and rotation.
- **Restore**: Click a saved camera to teleport back.
- **Rename**: Double-click the camera label.
- **Delete**: Click the X button on a saved camera.

## Composition Guides
Overlay guides for framing your shots:
- **Rule of Thirds** / **Golden Ratio** / **Grid** / **Center Mark** / **Diagonal** / **Spiral** / **Safe Areas**
- Customizable opacity, line width, and color.
- Spiral mode includes rotation, position, scale, and ratio controls.
`},"ui.resolution":{id:"ui.resolution",category:"UI",title:"Resolution Controls",content:`
When in **Fixed Resolution** mode, an overlay appears in the top-left of the viewport.

- **Click Label**: Open a dropdown of common presets (Social Media, 4K, etc.).
- **Drag Label**: Interactively scale the resolution width/height.
- **Fill Button**: Instantly switch back to "Full Screen" mode.
`},"panel.engine":{id:"panel.engine",category:"UI",title:"Engine Settings",content:`
The Engine panel controls compile-time shader features — settings that require rebuilding the GPU program before they take effect.

## How It Works
Unlike most sliders (which update instantly), changes here are **queued** and applied together when you click **Apply**. The shader then recompiles, which takes a few seconds depending on the features enabled.

- **Green dot** = currently compiled into the shader.
- **Yellow dot** = change is pending (waiting for you to click Apply).
- **Blue dot** = updates instantly (no recompile needed).

## Presets
Quick configurations that set multiple features at once:
- **Fastest**: Bare minimum — no shadows, no AO, no reflections. Maximum FPS.
- **Lite**: Lightweight setup suitable for exploration on most hardware.
- **Balanced**: Good mix of visual quality and performance (default).
- **Ultra**: Everything enabled — reflections, volumetrics, high-quality AO.

## Estimated Compile Time
The bottom bar shows the estimated compile time for the current configuration. Complex setups (raymarched reflections + bounce shadows + volumetrics) can take 15 seconds or more.

## Who Is This For?
This panel is for advanced users who want fine control over which shader features are active. Most users can ignore it — the default **Balanced** preset works well for general use.
`},"ui.performance":{id:"ui.performance",category:"UI",title:"Performance Monitor",content:`
The system automatically detects sustained low framerates.

- **Low FPS Warning**: Appears if the renderer struggles to maintain a usable frame rate.
- **Suggestion Buttons**: One or more actions are offered depending on the situation — **Reset Scale**, **Lite Mode**, or **Reduce Resolution** (reduces internal resolution by ~33%) — to help restore interactivity.
- **Dismiss**: Ignores the warning for this session.
`}},kd={"ui.timeline":{id:"ui.timeline",category:"Timeline",title:"Animation Timeline",content:`
The central hub for creating motion. It allows you to animate almost any parameter in the application using keyframes.

## Layout
- **Toolbar**: Playback controls, Recording toggle, and View Modes.
- **Navigator**: The mini-map strip below the toolbar. 
  - **Scroll**: Drag the bar left/right.
  - **Zoom**: Drag the edges of the active window or use the scroll wheel.
- **Track List**: On the left. Shows all animated properties grouped by category (Camera, Formula, Optics, Lighting, Shading).
- **Work Area**: The main grid showing keys.
  - **Dope Sheet Mode**: View keyframes as discrete diamonds. Best for timing and retiming.
  - **Graph Editor Mode**: View keyframes as continuous curves. Best for easing and value adjustment.

## Basic Workflow
1. **Record**: Click the **Red Circle** button in the timeline toolbar.
2. **Move Playhead**: Drag the ruler to the desired frame.
3. **Change Value**: Move any slider (e.g., Param A, Light Intensity, Camera Position).
4. A keyframe is automatically created.
5. Move Playhead again and change value again.
6. Press **Space** to play.

## Selection & Editing
- **Click**: Select single key.
- **Shift+Click**: Add to selection.
- **Drag Box**: Select multiple keys.
- **Soft Selection**: A persistent toggle mode that can be enabled in the **Keyframe Inspector**. When active, moving a keyframe also influences nearby keys with a smooth falloff.
  - **Falloff Types**: Linear, Dome, S-Curve, Pinpoint.
  - **Radius**: Controls how far the influence extends. Adjust with **Ctrl+Drag**.
- **Copy/Paste**: Use **Ctrl+C** and **Ctrl+V** to duplicate keys (works across different tracks!). You can also right-click for **Duplicate Here**, or **Duplicate & Loop** (x2, x3, x4, x8) to repeat a pattern.
- **Delete**: Press Backspace/Delete.
`},"anim.transport":{id:"anim.transport",category:"Timeline",title:"Transport & Recording",parentId:"ui.timeline",content:`
Controls for playback and recording.

## Controls
- **Play/Pause**: Toggle playback (Hotkey: Space).
- **Stop**: Return to frame 0.
- **Loop Toggle**: Switches between **Loop** (repeat forever) and **Once** (stop at end) playback modes.
- **Record (Red Circle)**: Toggles Auto-Keyframe mode.
  - When enabled, changing ANY slider or moving the camera will automatically create a keyframe at the current time position.
- **Modulation Record Arm**: Separate button for recording Audio/LFO modulation data.
- **Key Cam**: Manually captures the current camera state (Position + Rotation + Zoom) as a keyframe. Use this if you want to set a "pose" without moving the camera.
- **FRM**: Draggable frame counter for precise playhead positioning.
- **LEN**: Draggable duration control for setting the animation length.
- **Render**: Opens the Render/Export popup for video output.
- **Menu**: Access FPS setting, Record Camera toggle, Delete All Keys, and Delete All Tracks.
`},"anim.tracks":{id:"anim.tracks",category:"Timeline",title:"Tracks",parentId:"ui.timeline",content:`
Each animated parameter has its own **Track**.

- **Creation**: Tracks are created automatically when you add a keyframe to a parameter.
- **Visibility**: Use the Eye icon in the Graph Editor sidebar to show/hide curves.
- **Grouping**: Tracks are automatically grouped by category (Camera, Formula, Optics, Lighting, Shading) in the Dope Sheet.

## Context Menu
Right-click a track header to access:
- **Delete Track**: Removes the track and all keyframes.

## Post Behavior
Determines what happens after the last keyframe. Access this from the **Graph Editor sidebar** context menu (right-click a track in the sidebar).
- **Hold**: Value stays constant.
- **Loop**: Animation repeats from the start.
- **Offset Loop (Relative)**: Repeats the animation but offsets each cycle so the end value of one loop becomes the start of the next. Useful for continuous rotation or steady movement.
- **Ping-Pong**: Animation reverses, then repeats.
- **Continue**: Value continues changing based on the exit velocity (Slope).
`},"anim.keyframes":{id:"anim.keyframes",category:"Timeline",title:"Keyframes & Interpolation",parentId:"ui.timeline",content:`
Keyframes store the value of a parameter at a specific time.

## Interpolation Types
Right-click a keyframe to change how the value moves *between* keys:
- **Bezier (Default)**: Smooth, curved transition. Customisable with handles in the Graph Editor.
- **Linear**: Straight line. Constant speed, sharp turns. Robotic movement.
- **Step**: Instant jump. The value holds constant until the next keyframe, then snaps instantly.

## Tangents (Graph Editor)
When using Bezier interpolation, handles control the curve slope:
- **Auto**: Automatically smooths the curve based on neighbors.
- **Flat (Ease)**: Flattens the slope to 0. Great for "Slow In / Slow Out".
- **Unified**: Both handles move together symmetrically, keeping a smooth curve while allowing manual adjustment.
- **Broken**: Allows sharp corners (incoming slope != outgoing slope).
`},"anim.graph":{id:"anim.graph",category:"Timeline",title:"Graph Editor (Curves)",parentId:"ui.timeline",content:`
A powerful F-Curve editor for fine-tuning motion dynamics.
Switch to this mode using the **Curve Icon** in the timeline toolbar.

## Toolbar Tools (Top Left)
- **Fit View / Selection**: Zooms the view to show all keys or just selected ones.
- **Normalize**: Toggles "Normalized View".
  - **Off**: Shows raw values. Good for seeing true scale.
  - **On**: Scales all curves to fit 0-1 height. Essential for comparing timing between tracks with vastly different values (e.g. Rotation vs Scale).
- **Euler Filter**: Fixes "Gimbal Lock" or rotation flips where values jump 360 degrees. Unwinds the curves to be continuous.
- **Simplify**: Drag to reduce the number of keyframes while preserving the curve shape.
- **Bake**: Resamples the curve at fixed intervals.
- **Smooth / Bounce**: Physics-based modifiers.
  - **Drag Right**: Applies Gaussian Smoothing to smooth out jitter.
  - **Drag Left**: Applies Spring Physics (Bounce) to create overshoot/elasticity.
  - Right-click for configurable physics settings: **Tension/Spring** and **Friction/Damping**.

## Curve Interaction
- **Select**: Click curve keys or drag a selection box.
- **Move**: Drag keys. Hold **Shift** to lock movement to X (Time) or Y (Value) axis.
- **Tangents**: Select a key to see its Bezier handles. Drag handles to adjust easing (Slow-in/Slow-out).
- **Extrapolation**: Dotted lines at the end of the curve visualize the Post Behavior (Loop, Ping-Pong, etc).

## Navigation
- **Alt + Right Drag**: Zoom view (Scale Time/Value).
- **Alt + Left Drag**: Pan view.
- **Middle Click Drag**: Pan view.
- **Double Click Ruler**: Fit view to all keyframes.
`},"anim.camera":{id:"anim.camera",category:"Animation",title:"Camera Animation",content:`
Animating the camera in a fractal is complex due to the infinite scale.

## The "Unified" Camera Key
Unlike standard 3D software which tracks X/Y/Z, this engine tracks **Unified Coordinates** (Fractal Offset + Camera Local).
To keyframe the camera:
1. Move to a position you like.
2. Click the **"KEY CAM"** button in the Timeline Toolbar.
3. This creates keys for Position (Unified) and Rotation (Euler Angles) simultaneously.

## Path Interpolation
- The engine uses **Logarithmic Interpolation** for zoom levels. This ensures that zooming from 1.0 to 1,000,000.0 feels constant speed, rather than accelerating wildly.
- Use **Fly Mode** to record natural, handheld-like motion paths, then refine them in the Graph Editor using the **Smooth** tool.
`},"lfo.system":{id:"lfo.system",category:"Timeline",title:"LFO Modulators",parentId:"ui.timeline",content:`
Low Frequency Oscillators (LFOs) generate repeating waveforms that can be linked to any animatable parameter, creating organic, rhythmic motion without manually placing keyframes.

## Setup
You can add up to **3 LFO modulators** simultaneously.

## Waveform Shapes
- **Sine**: Smooth, continuous oscillation. Classic "breathing" motion.
- **Triangle**: Linear ramp up and down. Sharper transitions than Sine.
- **Sawtooth**: Ramps up linearly, then drops instantly. Good for repeating sweeps.
- **Pulse**: Switches between two values (on/off). Creates strobe-like effects.
- **Noise**: Random values each cycle. Adds natural variation and chaos.

## Parameters
- **Target**: The parameter to modulate (any slider in the application).
- **Period**: Length of one full cycle (in seconds). Lower = faster oscillation.
- **Strength**: How much the LFO affects the target value.
- **Phase Offset** (Advanced Mode): Shifts the starting point of the waveform. Useful for offsetting multiple LFOs from each other.
- **Smoothing**: Softens sharp transitions in the waveform.

## Waveform Preview
Each LFO displays a small real-time waveform visualization so you can see the shape and timing before applying it.

## Audio Links
LFOs can also be used as modulation sources in the Audio Links system, allowing audio-reactive control combined with oscillator patterns.
`},"export.video":{id:"export.video",category:"Timeline",title:"Video Export",content:`
Renders your animation to a video file. Open the export popup using the **Render** button in the timeline toolbar.

## Resolution
Choose from built-in presets ranging from **720p** to **4K**, plus social media formats optimised for platforms like Instagram and YouTube.

## Quality Settings
- **Format**: Select the output video format.
- **Bitrate**: Controls the file size and compression quality.
- **Samples**: Number of render samples per frame. Higher values produce cleaner images but take longer.
- **Internal Scale (SSAA)**: Renders each frame at a higher resolution internally, then downscales for the final output. This is super-sampled anti-aliasing and produces much sharper results, especially on fine fractal detail.

## Frame Range
- **Start / End Frame**: Set which portion of the animation to render.
- **Frame Step**: Skip frames for faster preview renders (e.g., step 2 renders every other frame).

## Render Modes
- **RAM Mode**: Stores all rendered frames in memory, then encodes the video at the end. Faster encoding but uses more memory.
- **Disk Mode**: Writes each frame to disk as it renders. Uses less memory and is safer for long animations.

## Progress & Controls
- A progress bar shows the current frame, percentage complete, and estimated time remaining.
- **Interrupt**: Pause the render at any time.
- **Resume**: Continue a paused render from where it stopped.
- **Finish Early**: Encode whatever frames have been rendered so far into a shorter video.
- **Discard**: Cancel the render and discard all frames.
`}},jd={"panel.light":{id:"panel.light",category:"Lighting",title:"Light Studio",content:`
The engine utilizes a sophisticated **Physically Based Rendering (PBR)** approximation to simulate how light interacts with the infinite surfaces of the fractal.

## Light Types
- **Point**: Standard light source. Has position and falloff.
- **Directional (Sun)**: Parallel rays from infinity. Has rotation only. No falloff.

## Top Bar Interaction
- **Light Orbs**: Toggle lights on/off by clicking the orbs in the top bar.
- **Drag & Drop**: Drag a light orb from the top bar directly onto the 3D viewport to place a light on the surface at that point (Raycast placement).
- **Context Menu**: Right-click the light orbs to access quick settings or help.
- **Duplicate Light**: Use the duplicate button in a light's controls to copy its settings to a new light slot.

## Lights
You can enable up to **8 independent light sources** to sculpt the 3D form. The default setup uses a classic 3-point arrangement:
- **Light 1 (Key)**: The primary illumination.
- **Light 2 (Fill)**: Usually placed opposite the Key light. Use a lower intensity and a cool color.
- **Light 3 (Rim)**: Placed behind the object. Creates a glowing outline.

You can add more lights beyond these three for complex multi-light setups.

## Gizmos
When the panel is open or **Show 3d helpers** is enabled, lights appear as glowing sprites in the viewport.
`},"light.type":{id:"light.type",category:"Lighting",title:"Light Type (Point vs Sun)",parentId:"panel.light",content:`
### Point Light
Emits light from a specific point in space radiating outwards.
- **Position**: X, Y, Z coordinates define the origin.
- **Falloff**: Light gets dimmer with distance (Inverse Square Law).
- **Shadows**: Perspective shadows that grow larger/softer with distance from the object.
- **Visible Sphere**: Optionally adds a glowing sphere at the light's position in the scene. You can control its radius and edge softness for a sharp or hazy look.

### Directional Light (Sun)
Emits parallel light rays from infinity.
- **Position**: Irrelevant. Only **Rotation** matters.
- **Falloff**: Disabled (Infinite range). The light creates a constant wall of illumination.
- **Shadows**: Orthographic (Parallel) shadows. Ideally suited for "Sunlight" effects.
- **Visuals**: Indicated by a Sun icon (Rayed Circle) in the top bar.
`},"light.rot":{id:"light.rot",category:"Lighting",title:"Heliotrope (Direction)",parentId:"panel.light",content:`
The **Heliotrope** is a specialized control for setting the angle of Directional (Sun) lights. It maps the 3D sky dome onto a 2D circle.

### How to use
- **Center**: Light comes from directly "Forward" (relative to Camera or World, depending on Mode).
- **Edge**: Light comes from the Horizon (90 degrees).
- **Drag Dot**: Sets the specific angle.

### Parameters
- **Pitch**: Elevation angle (Up/Down). 90° is directly overhead.
- **Yaw**: Compass angle (North/South/East/West).

### Backlighting
If the dot enters the "Backlight Zone" (indicated by red/warning colors), the light is shining from *behind* the target. This creates Rim Lighting but leaves the front face dark.
`},"light.intensity":{id:"light.intensity",category:"Lighting",title:"Light Intensity & Color",parentId:"panel.light",content:`
## Intensity
Controls the energy output of the light source.
- **0.0**: Light is off.
- **1.0**: Standard physical brightness.
- **> 2.0**: High energy. Can cause **Bloom/Glow** artifacts if the surface becomes brighter than 1.0 (pure white).

### Intensity Units
You can choose between two intensity modes:
- **Raw**: A simple multiplier (the default). Good for quick adjustments.
- **Exposure (EV)**: Uses a photographic exposure scale from **-4 to +10 EV**. Each step doubles or halves the brightness. Great when you want precise, predictable control — especially for balancing multiple lights.

**Keyframable**: Yes. Use the diamond icon in the popup menu.

## Color
Light color interacts with the **Surface Material** color via multiplication.
- A **Red Light** on a **White Surface** looks Red.
- A **Red Light** on a **Blue Surface** looks Black (physics correct).
- **Tip**: Use saturation sparingly. Pale lights often look more realistic than deep, saturated lights.

### Color Temperature Mode
Instead of picking a color manually, you can switch to **Color Temperature** mode and use a Kelvin slider (**1000 K – 10000 K**).
- **Low values (1000–3000 K)**: Warm candlelight / golden hour tones.
- **Mid values (5000–6500 K)**: Neutral daylight.
- **High values (8000–10000 K)**: Cool, overcast / blue-sky tones.

This is a quick way to get natural-looking light colors without fiddling with the color picker.
`},"light.mode":{id:"light.mode",category:"Lighting",title:"Attachment Mode (Headlamp vs World)",parentId:"panel.light",content:`
Every light can be anchored in two different coordinate spaces.

### Headlamp
The light is parented to the **Camera**.
- **Behavior**: If you move, the light moves with you.
- **Coordinates**: $(0,0,0)$ places the light exactly inside the camera lens.
- **Use Case**: Flashlights, exploration, ensuring the fractal is always visible while flying.

### World
The light is parented to the **Fractal Universe**.
- **Behavior**: The light exists at a specific coordinate. You can fly past it, orbit around it, or leave it behind.
- **Use Case**: Suns, glowing artifacts, establishing a "sense of place" in a scene.
- **Note**: If you reset the camera position, World lights might end up far away. Use the **Gizmo** to find them.
`},"light.falloff":{id:"light.falloff",category:"Lighting",title:"Falloff (Inverse Square Law)",parentId:"panel.light",content:`
In the real world, light creates a sphere of influence that decays over distance. This setting controls that decay curve.
*Note: This setting is ignored for Directional Lights.*

### Falloff Type
- **Quadratic ($1/d^2$)**: Physically accurate. Light is blindingly bright near the source but fades very quickly. Use this for realistic lamps or fires.
- **Linear ($1/d$)**: Artificial decay. Light travels much further before fading. Useful for abstract scenes where you want to illuminate deep structures without over-exposing the foreground.

### Range
- **0.0**: **Infinite reach**. The light does not decay. It shines with equal intensity at distance $0$ and distance $1,000,000$.
- **> 0.0**: The distance at which the light intensity fades to near-zero. Higher values mean the light reaches **further** before fading out — a larger sphere of influence.

**Keyframable**: Yes. Use the diamond icon.
`},shadows:{id:"shadows",category:"Lighting",title:"Raymarched Soft Shadows",parentId:"panel.light",content:`
Shadows are essential for depth perception. Without them, it is impossible to tell if a structure is floating or attached.
Each light has its own **Cast Shadow** checkbox, so you can choose exactly which lights produce shadows.

## The Tech: SDF Shadows
We do not use Shadow Maps (rasterization) or BVH Raytracing. We march a ray from the surface *towards* the light.

## Parameters
- **Softness**: Simulates the **Size** of the light source (Area Light). Uses a logarithmic scale.
  - **Low (2–10)**: Pin-point light source. Sharp, hard shadows.
  - **Medium (50–200)**: Moderate-sized light. Visible penumbra.
  - **High (500–2000)**: Very large area light. Extremely soft, diffuse shadows.
- **Intensity**: The opacity of the shadow. Lower this to simulate ambient light filling in the dark spots.
- **Bias**: **Critical Setting**.
  - Pushes the shadow start point away from the surface.
  - **Too Low**: "Shadow Acne" (Black noise/speckles on the surface).
  - **Too High**: "Peter Panning" (Shadow detaches from the object).

## Stochastic Shadows / Area Lights
This is a **compile-time feature** — you need to enable it in the shadow settings, which triggers a shader recompilation. Once enabled, the engine uses randomised sampling to produce realistic area-light shadows.

### Shadow Quality Levels
- **Hard Only**: Traditional sharp shadows with no stochastic sampling. Fastest.
- **Lite Soft**: A lighter stochastic pass — good balance of quality and speed.
- **Robust Soft**: Full stochastic sampling for the highest-quality soft shadows.

### How it looks
- Shadows may appear noisy or grainy while the camera is moving.
- They converge to a clean, high-quality result when the camera stops (via Temporal Accumulation).
- This technique is essential for accurate shadowing on complex sponge/box fractals where traditional methods fail.
`},"light.pos":{id:"light.pos",category:"Lighting",title:"Light Positioning",parentId:"panel.light",content:`
> **REQUIRES ADVANCED MODE**

Precise coordinate control for lights. 
- **Headlamp Mode**: Coordinates are relative to the camera view.
- **World Mode**: Coordinates are absolute in the fractal universe.

**Keyframing**: Use the **Key Icon** in the top bar popup to keyframe the X, Y, and Z coordinates simultaneously.
`}},Rd={"panel.render":{id:"panel.render",category:"Rendering",title:"Shading & Materials",content:`
Controls the surface properties (PBR) and lighting response of the fractal.
`},"panel.quality":{id:"panel.quality",category:"Rendering",title:"Quality & Performance",content:`
Managing performance is a trade-off between speed and accuracy.

## Core Settings
- **Ray Detail**: Multiplies the epsilon (precision). Lower = Faster but "blobbier". Higher = Sharper but slower.
- **Max Steps** (Advanced): Hard limit on ray calculation. Increase if distant objects are getting cut off (black void).
- **Internal Scale**: Renders at a lower resolution and upscales.
  - **0.5x**: Great for editing/animation. 
  - **1.0x**: Native crispness.
  - **2.0x**: Super-sampling (very slow).
`},"render.engine":{id:"render.engine",category:"Rendering",title:"Render Engine Mode",parentId:"panel.quality",content:`
Switches the fundamental light transport algorithm.

### Direct (Fast)
Standard Raymarching with direct lighting.
- **Fast**: Up to 60FPS on decent GPUs.
- **Features**: Shadows, AO, Fog.
- **Best for**: Exploration, Animation, Real-time usage.

### Path Tracer (GI)
Physically based Monte-Carlo Path Tracing.
- **Slow**: Requires accumulation (image starts noisy and clears up).
- **Features**: Global Illumination (Bounce Light), Emissive Lighting, Soft Area Shadows.
- **Best for**: High-quality still images and photorealistic renders.
`},"pt.global":{id:"pt.global",category:"Rendering",title:"Path Tracer Globals",parentId:"panel.render",content:`
Settings specific to the Path Tracing engine.

- **Bounces**: Number of times light reflects. Higher = brighter interiors but slower render.
- **GI Strength**: Artificial multiplier for bounce light.
- **Stochastic Shadows**: If enabled, treats lights as physical spheres (Area Lights) rather than points. Shadows become softer with distance. Requires accumulation to look smooth.
`},"bucket.render":{id:"bucket.render",category:"Rendering",title:"High Quality Render (Buckets)",parentId:"panel.quality",content:`
Renders the image in small tiles (Buckets) instead of all at once.

## Why use it?
- **High Resolution**: Allows rendering 4K or 8K images that would otherwise crash the GPU memory.
- **Anti-Aliasing**: Each bucket accumulates samples (default 64 per bucket) until it is perfectly noise-free before moving to the next.
- **Export**: Can automatically save the result as a PNG when finished.

## Post-Processing
Post-processing effects (Bloom, Chromatic Aberration, Color Grading, Tone Mapping) are applied to the complete image **after** all buckets have finished rendering — so the final result looks exactly like the live viewport with effects enabled.

## Usage
1. Click the **Grid Icon** in the top bar.
2. Select **Refine View** to clear up the current viewport.
3. Select **Export Image** to render and download a file.
`},"quality.detail":{id:"quality.detail",category:"Rendering",title:"Ray Detail (Epsilon)",parentId:"panel.quality",content:`
Controls the termination threshold of the raymarcher.

- **1.0 (Standard)**: Stops when ray is within 1 pixel size of the surface.
- **< 1.0 (Low)**: Stops earlier. Faster rendering, but surfaces look "puffy" or "blobby". Small details merge together.
- **> 1.0 (High)**: Forces the ray closer to the surface. Sharpens tiny details but requires significantly more steps (slower).
`},"quality.fudge":{id:"quality.fudge",category:"Rendering",title:"Slice Optimization (Fudge)",parentId:"panel.quality",content:`
Scales the raymarch step size. Also known as "Lipschitz Bound Relaxation".

- **1.0 (Safe)**: Mathematically correct stepping. Guarantees no artifacts.
- **< 1.0 (Slow/Safe)**: Takes smaller steps. Fixes "overstepping" artifacts (holes in the fractal) but is very slow.
- **> 1.0 (Fast/Risky)**: Takes larger steps. Renders much faster, but may clip through thin geometry, creating black noise or missing details.

> **Artistic use:** Values above 1.0 are also used for artistic slicing effects — they cause the ray to overshoot surfaces, creating cut-away or x-ray looks.
`},"quality.threshold":{id:"quality.threshold",category:"Rendering",title:"Pixel Threshold",parentId:"panel.quality",content:`
An adaptive quality optimization. It relaxes the detail requirement for distant objects.
Increasing this makes the background render faster by allowing it to be slightly blurrier, which is often physically realistic (atmospheric scattering limits detail visibility at range).
`},"quality.steps":{id:"quality.steps",category:"Rendering",title:"Max Steps",parentId:"panel.quality",content:`
> **REQUIRES ADVANCED MODE**

The "Fuel Tank" for the ray.
If a ray marches for **N** steps and hasn't hit anything, it gives up (returns Sky color).
- **Low (100)**: Rays die quickly. Deep crevices or distant objects appear as flat black voids.
- **High (500+)**: Rays can travel into deep holes. Required for high zoom levels or very complex sponges. Significantly impacts performance.
`},"quality.scale":{id:"quality.scale",category:"Rendering",title:"Internal Resolution Scale",parentId:"panel.quality",content:`
Controls the resolution of the internal render buffer relative to the screen.

- **0.25x - 0.5x**: Retro/Pixelated look. Extremely fast. Great for complex editing on low-end devices.
- **1.0x**: Native resolution.
- **1.5x - 2.0x**: Super-sampling (SSAA). Renders at a higher resolution and scales down. Eliminates aliasing but is very expensive (4x the pixels).
`},"quality.tss":{id:"quality.tss",category:"Rendering",title:"Temporal AA",parentId:"panel.quality",content:`
**Temporal AA** (Temporal Super Sampling) is the secret sauce of this engine.

### How it works
Instead of trying to render a perfect image in 16ms (60fps), the engine renders a "noisy" image quickly. It then blends this frame with the previous frame.
Over the course of 10-20 frames, the noise cancels out, revealing a perfect, high-resolution, soft-shadowed image.

### Usage
- **Enabled (Default)**: Image is noisy when moving, but crystal clear when still.
- **Disabled**: Image is always sharp but lacks soft shadows/AO, or runs at very low FPS.
`},"mat.diffuse":{id:"mat.diffuse",category:"Rendering",title:"Diffuse Strength",parentId:"panel.render",content:`
The base brightness of the surface color.
- **1.0**: Standard brightness.
- **> 1.0**: Boosts color saturation and brightness artificially.
- **0.0**: Surface is black (unless Specular/Emission is active).
`},"mat.metallic":{id:"mat.metallic",category:"Rendering",title:"Metallic",parentId:"panel.render",content:`
Controls the surface conductivity and energy conservation.

- **0.0 (Dielectric)**: Plastic, Wood, Stone. 
  - Reflection color is **White** (4%).
  - Diffuse color is active.
- **1.0 (Metal)**: Gold, Chrome, Iron. 
  - Reflection color is **Tinted** by the surface gradient.
  - Diffuse color is disabled (Metals don't have diffuse scattering).
`},"mat.specular":{id:"mat.specular",category:"Rendering",title:"Specular Intensity",parentId:"panel.render",content:`
The strength of the light reflection (F0).
Even non-metals have some reflection.
- **Increase** to make the surface look wet or shiny.
- **Decrease** for a dry, matte look.
`},"mat.roughness":{id:"mat.roughness",category:"Rendering",title:"Roughness",parentId:"panel.render",content:`
Micro-surface detail.
- **0.0 (Smooth)**: Mirror-like reflections. Sharp highlights.
- **1.0 (Rough)**: Concrete/Chalk. Diffuse reflections. Highlights are spread out and dim.
`},"mat.rim":{id:"mat.rim",category:"Rendering",title:"Rim Light",parentId:"panel.render",content:`
Adds a glowing edge effect based on the viewing angle (Fresnel).
Useful for separating the fractal from the background or adding an "Alien" feel.

- **Rim Light**: Intensity of the edge glow.
- **Rim Sharpness**: Controls the width of the edge. Higher values make the rim thinner and sharper.
`},"mat.emission":{id:"mat.emission",category:"Rendering",title:"Self-Illumination",parentId:"panel.render",content:`
Makes the surface glow independently of light sources.

### Emission Sources
- **Full Surface**: The entire object glows using its final blended color.
- **Layer 1/2**: Only uses the specific gradient layer for the glow color. Useful for making just the "veins" (Layer 2) glow while the base rock (Layer 1) stays dark.
- **Layer 3 (Noise)**: Uses the procedural noise pattern to drive the glow intensity. Great for "magma cracks" or energy fields.
- **Solid Color**: Forces a specific, constant glow color everywhere.

### Path Tracing (GI)
In Path Tracing mode, the **Illumination Power** slider controls how much light the surface emits into the scene (Global Illumination) without changing how bright the surface looks to the camera.
- **1.0**: Physically accurate.
- **> 1.0**: Boosts the bounce light intensity. Great for making dim emissive veins light up a whole room without blowing out the surface detail.
`},"mat.env":{id:"mat.env",category:"Rendering",title:"Environment Map",parentId:"panel.render",content:`
Adds a fake sky reflection to the surface.
Useful for making metals look realistic by giving them something to reflect, even if the background is black.
`},"mat.glow":{id:"mat.glow",category:"Rendering",title:"Volumetric Glow",parentId:"panel.render",content:`
Accumulates light along the ray as it passes *near* fractal surfaces (without hitting them).

- **Intensity**: How bright the air is.
- **Tightness**: How close to the surface the glow hugs. 
  - **Low**: General foggy haze.
  - **High**: Neon outlines around geometry (Tron look).
`},"mat.ao":{id:"mat.ao",category:"Rendering",title:"Ambient Occlusion (AO)",parentId:"panel.render",content:`
Darkens crevices and holes to add depth perception.

- **Intensity**: Darkness of the shadows.
- **Spread**: Radius of the sampling. Larger spread = larger soft shadows in corners.
- **Samples**: Number of AO samples (default 5, adjustable 2–32). More samples = smoother but slower.
- **Stochastic Mode** (toggle):
  - **Off**: Fixed sample positions. Fast and stable — good for editing.
  - **On**: Randomized sample positions each frame. Requires Temporal AA (Accumulation) to look smooth, but produces photorealistic soft shading.
- **AO Tint**: Colorizes the ambient occlusion shadows. By default AO darkens to black, but you can tint it to warm brown, cool blue, etc. for a more stylized look.

### Interaction with Emission
Ambient Occlusion acts as a multiplier for Self-Illumination and Rim Light. This allows "dirt" or crevices to darken glowing parts of the surface, adding realism to magma/energy cracks.

### Path Tracing
In Path Tracer mode, AO is applied **only to the direct camera view**. It is disabled for indirect light bounces to preserve the energy of the Global Illumination system.
`},"fog.settings":{id:"fog.settings",category:"Rendering",title:"Atmospheric Fog & God Rays",parentId:"panel.scene",content:`
Adds depth and atmospheric effects to the scene. Fog controls appear when **Fog Intensity > 0**.

## Distance Fog
- **Fog Intensity**: Master control. Fades distant objects to the Fog Color.
- **Start (Near)**: Distance where fog begins.
- **Fog End**: Distance where everything becomes the solid fog color.
- **Fog Color**: The color distant objects fade into.

## Volumetric Scatter (God Rays)
Simulates light scattering through a participating medium. Requires **Volumetric Scattering (HG)** enabled in the Engine panel under Path Tracing settings.

- **Volumetric Density (σ)**: Thickness of the air. Higher values = denser fog, shorter light shafts. Good range: 0.005–0.05.
- **Anisotropy (g)**: Controls direction bias of scattered light (Henyey-Greenstein phase):
  - **0**: Isotropic — light scatters equally in all directions.
  - **+0.9**: Strong forward scatter — classic god rays pointing toward lights.
  - **−0.9**: Back scatter — halo effect around light sources.

## Tips
- God rays accumulate over frames via Temporal Accumulation — they look best when the camera is still.
- Shadow jitter is proportional to the DE distance at each scatter sample, which softens the fractal silhouette in open sky while keeping crisp edges near the surface.
- In Direct mode, god rays work without Path Tracing enabled.
`},"dof.settings":{id:"dof.settings",category:"Rendering",title:"Depth of Field (DOF)",parentId:"panel.scene",content:`
Simulates a physical camera lens by blurring areas outside the focus plane. See **Scene > Optics** for full DOF documentation including Aperture, Focus Distance, Auto-Focus, and High Precision controls.

**Note**: DOF requires **Temporal AA** (Accumulation) to look smooth.
`},"render.reflections":{id:"render.reflections",category:"Rendering",title:"Reflections",parentId:"panel.render",content:`
Adds reflective surfaces to the fractal. Three modes available, from cheapest to most expensive:

## Reflection Methods
- **Off**: No reflections. Fastest.
- **Environment Map**: Samples the environment map at the reflection angle. Cheap, adds realism to metals. Uses Fresnel weighting.
- **Raymarched (Quality)**: Fires actual reflection rays through the fractal. Physically accurate but adds ~7.5s compile time.

## Raymarched Settings
- **Max Bounces (1-3)**: Recursion depth. Each bounce adds a full raytrace pass.
- **Trace Steps**: Precision of the reflection ray (16-128).
- **Roughness Cutoff**: Surfaces rougher than this skip raymarching (performance optimization).
- **Raymarch Mix**: Blend between raymarched (1.0) and environment map (0.0) reflections.
- **Bounce Shadows**: Compute shadows on reflected surfaces. Adds ~4.5s compile time.

## Tips
- Combine with low **Roughness** (0.0-0.3) and high **Metallic** for dramatic mirror effects.
- Use Environment Map mode during editing, then switch to Raymarched for final renders.
`},"render.volumetric":{id:"render.volumetric",category:"Rendering",title:"Volumetric Scatter",parentId:"panel.render",content:`
Henyey-Greenstein single-scatter volumetric rendering. Enables god rays, colored haze, and directional fog effects.

**Note:** This is a compile-time feature. Enabling it triggers a shader recompile (~5.5s). You can also toggle it on/off at runtime without recompiling once it has been compiled in.

## Density & Shadow Rays
- **Density**: Thickness of the participating medium. Log scale — small values (0.01-0.05) produce subtle haze, higher values create thick fog.
- **Anisotropy (g)**: Direction bias for scattered light.
  - **0**: Isotropic (equal scatter in all directions).
  - **+0.9**: Forward scatter — classic god rays pointing toward light sources.
  - **-0.9**: Back scatter — halo effect around lights.
- **Light Sources**: How many lights cast shadow rays into the volume (1-3). More = more expensive.
- **Scatter Tint**: Color of the scattered light.
- **Step Jitter**: Controls random variation in volumetric step positions. Higher values help with temporal accumulation (noise averages out over frames). Lower values produce cleaner single-frame results but may show banding. Can also be used artistically for slicing effects.

## Color Scatter
- **Surface Color Scatter**: Injects the fractal's orbit trap color field into the volume. Creates a colored volumetric haze matching the gradient palette. No shadow rays needed (cheap).
- **Surface Falloff**: Concentrates the color near the fractal surface.

## Height Fog
- **Height Falloff**: Density varies with Y coordinate. Creates ground fog or rising mist.
- **Height Origin**: The Y level where fog is densest.
`},"mat.reflection":{id:"mat.reflection",category:"Rendering",title:"Reflections",parentId:"panel.render",content:`
Adds reflective surfaces to the fractal using raymarched reflection rays.

## How It Works
When enabled, the renderer fires additional rays from the surface in the reflection direction. These rays march through the fractal just like the camera ray, finding what the surface "sees" and blending that into the final image.

## Key Controls
- **Max Bounces (1–3)**: How many times light can bounce between surfaces. One bounce is a simple mirror; two or three bounces let you see reflections of reflections (like standing between two mirrors). More bounces = slower rendering.
- **Roughness**: Smooth surfaces (low roughness) produce sharp, mirror-like reflections. Rough surfaces scatter the reflection into a soft, blurry highlight.
- **Roughness Cutoff**: Surfaces rougher than this threshold skip raymarching entirely to save performance — they fall back to the environment map.
- **Raymarch Mix**: Blends between full raymarched reflections (1.0) and the cheaper environment map reflections (0.0). Useful for dialing in the right balance of quality vs speed.
- **Metallic Influence**: Metallic surfaces tint reflections with their own color (like gold or copper), while non-metallic surfaces (plastic, stone) reflect white light.

## Bounce Shadows
When enabled, reflected surfaces also receive proper shadows — so a reflection of a crevice will show the correct darkness inside it. This adds realism but increases compile time.

## Performance Note
Raymarched reflections are a compile-time feature. Enabling them triggers a shader recompile (roughly 7–8 seconds). Bounce shadows add another 3–5 seconds on top of that. Use Environment Map mode for fast editing, then switch to Raymarched for final renders.
`},"water.settings":{id:"water.settings",category:"Rendering",title:"Water Plane",content:`
An infinite ocean plane with animated waves, integrated into the raymarcher. The water surface participates in shadows, AO, and reflections.

## Controls
- **Height**: Y-level of the water surface.
- **Color**: Albedo of the water.
- **Roughness**: Surface roughness (0 = mirror, 1 = matte).
- **Wave Strength**: Amplitude of the animated waves. Set to 0 for a flat mirror plane.
- **Wave Speed**: Animation speed of the waves.
- **Wave Frequency**: Density of wave peaks.

## How It Works
The water plane is a signed distance field (SDF) composed of 3 layered noise octaves:
1. Rolling swell (sine-based)
2. Organic surface (simplex noise)
3. Fine choppiness (high-frequency noise)

Normals are recomputed via finite differences for accurate specular highlights and reflections.

## Tips
- Works best with **Reflections** enabled (Environment Map or Raymarched).
- Set the fractal near the water surface and use **Fog** to create depth.
`},"quality.metric":{id:"quality.metric",category:"Rendering",title:"Distance Metric",parentId:"panel.quality",content:`
> **REQUIRES ADVANCED MODE**

Controls how "distance" is measured in 3D space. Different metrics produce different geometric styles.

- **Euclidean** (default): Standard straight-line distance. Produces natural, round shapes.
- **Chebyshev**: Uses the largest coordinate difference. Tends to produce cube-like, blocky geometry.
- **Manhattan**: Uses the sum of coordinate differences. Creates diamond-shaped, angular geometry.
- **Minkowski**: A tunable blend between the other metrics. Adjust the exponent to interpolate between Manhattan (1), Euclidean (2), and Chebyshev (infinity).
`},"quality.estimator":{id:"quality.estimator",category:"Rendering",title:"Distance Estimator",parentId:"panel.quality",content:`
> **REQUIRES ADVANCED MODE**

Controls the mathematical method used to estimate the distance to the fractal surface. Different estimators suit different formula types.

- **Analytic Log**: Uses the logarithmic distance estimate. Best for standard fractals (Mandelbulb, Mandelbox) where the analytic derivative is reliable.
- **Linear**: A simpler linear estimate. Can work better for formulas with non-standard divergence behavior.
- **Pseudo**: Approximates the distance without true derivatives. Useful as a fallback when analytic methods produce artifacts.
- **Dampened**: A conservative estimate that under-steps slightly for stability. Helps with formulas prone to overstepping artifacts (holes or noise on surfaces).
`},"quality.jitter":{id:"quality.jitter",category:"Rendering",title:"Step Jitter",parentId:"panel.quality",content:`
> **REQUIRES ADVANCED MODE**

Adds stochastic (random) variation to each ray step position (default 0.15).

- **Purpose**: Breaks up banding and aliasing artifacts by randomizing where the ray samples. Over multiple frames with Temporal AA enabled, the random offsets average out to produce a smooth, noise-free image.
- **0.0**: No jitter. Clean single frames but may show visible stepping bands on smooth surfaces.
- **0.1–0.2**: Subtle variation. Good balance for most scenes.
- **Higher values**: More randomness per frame — noisier in motion but converges faster when still.
`},"quality.relaxation":{id:"quality.relaxation",category:"Rendering",title:"Step Relaxation",parentId:"panel.quality",content:`
> **REQUIRES ADVANCED MODE**

A dynamic fudge factor that automatically adjusts the step size based on the previous step's distance estimate.

When enabled, the raymarcher takes larger steps in open space (where it is safe) and smaller steps near surfaces (where precision matters). This speeds up rendering in scenes with large empty areas without sacrificing surface detail.
`},"quality.adaptive":{id:"quality.adaptive",category:"Rendering",title:"Adaptive Resolution",parentId:"panel.quality",content:`
Dynamically lowers the rendering resolution while the camera is moving, then snaps back to full resolution when you stop.

This gives you smoother, more responsive interaction when orbiting or flying through complex scenes, without permanently sacrificing image quality. The resolution recovers instantly once movement stops and Temporal AA cleans up the image.
`},"export.video":{id:"export.video",category:"Export",title:"Video Export",content:`
Allows rendering high-quality video sequences offline.

### Browser Compatibility (Disk vs RAM)
Because 4K video files are huge, the exporter works differently depending on your browser.

- **Disk Mode (Chrome / Edge / Opera)**: Uses direct file access. When you click Render, you will be asked where to save the file immediately. The video is streamed directly to your hard drive, allowing unlimited file sizes (perfect for 4K).
- **RAM Mode (Firefox / Safari)**: Must store the *entire video* in memory until finished.
  - **Warning**: If the video file exceeds ~2GB-4GB, the browser tab will crash (Out of Memory).
  - **Workaround**: For long animations in these browsers, render shorter segments and stitch them later in a video editor.

### Settings
- **Resolution**: Includes social presets (Square 1:1, Portrait 4:5, Vertical 9:16).
- **Bitrate**: Higher = Less compression artifacts. 12-20 Mbps is usually sufficient for 1080p.
- **Samples**: How many accumulation passes per frame. 
  - 16-32: Good for Draft.
  - 64-128: Production Quality (removes all grain).
`}},Id={"panel.gradient":{id:"panel.gradient",category:"Coloring",title:"Coloring Engine",content:`
Fractals don't have "texture maps" in the traditional sense. Color is assigned mathematically based on the geometry.

## The Process
1. **Mapping**: The engine measures a specific value at the surface point (e.g., "How far is this point from the origin?").
2. **Transform**: This value is transformed using Scale, Offset, Phase, and Repeat sliders.
3. **Lookup**: The final value (0.0 to 1.0) is used to pick a color from the **Gradient**.

## Dual-Layer System
You can blend two completely different coloring strategies to create complex surfaces.
- **Layer 1**: The Base color.
- **Layer 2**: Detail or Overlay color.
- **Blend Mode**: Determines how they combine (Mix, Add, Multiply, Bump).

## Histogram
The coloring panel includes a live **histogram** that shows how your color values are distributed across the fractal surface. Use it to spot problems — if all the values are bunched up on one side, your colors will look flat. Adjusting Scale, Offset, or Gamma (Bias) while watching the histogram makes it much easier to get a well-spread, vibrant result.
`},"grad.params":{id:"grad.params",category:"Coloring",title:"Color Parameters",parentId:"panel.gradient",content:`
These parameters control how the raw mapping value is transformed before it looks up a color from the gradient.

### Transform Controls
- **Scale**: Stretches or compresses the color pattern. Higher values create more repetitions; lower values spread the pattern out.
- **Offset**: Shifts the entire pattern along the gradient. Use this to "scroll" through colors without changing the pattern shape.
- **Phase**: Rotates the gradient starting point. Think of it like spinning a color wheel — the same colors are used, but they start at a different point in the cycle. Useful for fine-tuning which color lands on which part of the fractal.
- **Repeats**: Controls how many times the gradient repeats across the full mapping range. At 1, the gradient plays once from left to right. At higher values it tiles, creating banded or striped effects. Works well with smooth mappings like Radial or Potential.

### Advanced Controls
- **Gamma (Bias)**: Controls the gamma curve of the gradient lookup (range: 0.1 to 10.0). Values below 1.0 push more of the surface toward the bright end of the gradient; values above 1.0 push toward the dark end. This reshapes how colors distribute across the surface without changing the gradient itself — very useful for bringing out detail in dark or light regions.
- **Color Iterations**: Stops orbit trap capture at a specific iteration count (0 to 24). Normally the orbit trap runs for the full iteration loop, but clamping it early lets you control *which part* of the fractal's iteration process the colors are sampled from. Low values color based on early, large-scale structure; high values reveal finer internal detail. A powerful tool for creative control.
- **Twist**: Distorts the mapping value (range: -5 to 5). Adds a swirl or warp to the color pattern, bending straight bands into curves. Subtle values (0.1–0.5) add organic flow; extreme values create psychedelic distortion.
`},"grad.mapping":{id:"grad.mapping",category:"Coloring",title:"Mapping Modes",parentId:"panel.gradient",content:`
Determines the mathematical property used to select color from the gradient.

### Geometric Mappings
- **Orbit Trap**: Uses the *minimum distance* the orbit point reached relative to the origin during iteration. Creates geometric, cellular, or techno-organic patterns inside the bulbs. Good for "solid" looking interiors.
  - **Reference:** [Wikipedia: Orbit Trap](https://en.wikipedia.org/wiki/Orbit_trap)
- **Orbit X (YZ plane)**: Like Orbit Trap, but only measures distance along the X axis. Reveals structure in the YZ plane — useful for slicing the fractal's internal geometry into layers.
- **Orbit Y (XZ plane)**: Same idea on the Y axis. Highlights horizontal strata and bands through the fractal interior.
- **Orbit Z (XY plane)**: Same idea on the Z axis. Great for height-based coloring of internal structures.
- **Orbit W (Origin)**: Uses the squared distance from the origin at each iteration (like a full 3D orbit trap). Produces smooth, rounded color regions that follow the overall shape of the orbit.
- **Radial**: Based on the distance of the final surface point from the center $(0,0,0)$. Creates spherical gradients and large-scale color shifts.
- **Z-Depth**: Height map based on the Z coordinate. Useful for creating landscapes or strata effects.
- **Angle**: Based on the polar angle around the Z-axis. Creates spirals and pinwheels.
- **Normal**: Based on the surface slope (Up vs Down). Adds pseudo-lighting effects or "snow on peaks" looks.

### Fractal Mappings
- **Iterations (Glow)**: Based on how many iterations it took to decide the point was "solid". Creates smooth, glowing bands outlining the shape. The classic "Electric Sheep" look.
- **Raw Iterations**: Same as Iterations but without smoothing. Shows distinct bands or steps. Useful for technical analysis or stylized "8-bit" looks.
- **Decomposition**: Analytic decomposition of the complex number angles during iteration. Creates checkered, grid-like, or circuit-board patterns. Highly sensitive to the **Escape Radius**.
- **Flow (Angle + Iter)**: Combines Decomposition and Iterations into a single mapping. The result is spiral and grid patterns that follow the fractal's natural flow — think of it as a 2D coordinate system wrapped around the fractal's internal structure. Great for detailed, structured coloring.
- **Potential (Log-Log)**: Measures the electrical potential of the set. Creates very smooth, gradient-like bands, especially near the boundaries of the fractal. Ideal for continuous color flows.
`},"grad.escape":{id:"grad.escape",category:"Coloring",title:"Escape Radius",parentId:"panel.gradient",content:`
The distance from the origin ($R$) at which the formula considers a point to have "escaped" to infinity. Range: 0 to 1000.

### Impact on Coloring
- **Standard**: Usually around 2.0 to 4.0 for basic shapes.
- **Decomposition / Flow**: Requires a higher escape radius (e.g., 10.0 - 100.0) to allow the pattern to resolve fully before the calculation stops. If your decomposition looks noisy or cut off, increase this value.
- **Glow**: Higher values can compress the glow bands slightly.
- **Extreme values (100-1000)**: Pushing the escape radius very high can create interesting effects — patterns become finer, and some mappings reveal structure that is invisible at lower radii. Worth experimenting with!

**Performance Note**: Higher escape radii generally mean more iterations are needed to reach the edge, which can slightly reduce performance or require increasing the **Max Iterations** count.
`},"grad.layer2":{id:"grad.layer2",category:"Coloring",title:"Layer 2 & Blending",parentId:"panel.gradient",content:`
Layer 2 adds surface complexity by overlaying a second pattern on top of the base layer.

### Blend Modes
- **Mix**: Linear interpolation. At 0.5 opacity, the result is 50% Layer 1 and 50% Layer 2.
- **Add**: Adds brightness. Useful for creating glowing veins or energy overlays.
- **Multiply**: Darkens the base color. Great for adding grime, shadows, or ambient occlusion style darkening.
- **Screen**: The opposite of Multiply — brightens by combining the inverse of both layers. Useful for soft glows, light leaks, and ethereal effects. Dark areas in Layer 2 have no effect; light areas brighten the result.
- **Overlay**: Increases contrast. Light parts get lighter, dark parts get darker. Preserves highlights and shadows.
- **Bump (Normal)**: **Does not change color!** Instead, it uses the brightness of Layer 2 to perturb the surface **Normal**.
  - Creates the illusion of physical depth, scratches, or embossing.
  - Requires **Shading** (Lighting) to be visible.
`},"grad.texture":{id:"grad.texture",category:"Coloring",title:"Image Texturing",parentId:"panel.gradient",content:`
Instead of a 1D gradient, you can map a 2D image onto the fractal surface.

### UV Generation
Since fractals are infinite and generated procedurally, they have no native UV coordinates. We must generate them mathematically.
- **U Mapping**: Selects the property for the horizontal (X) texture coordinate.
- **V Mapping**: Selects the property for the vertical (Y) texture coordinate.

### Tips for Good Texturing
- **Decomposition** on U and **Iterations** on V often produces a mapping that follows the natural flow of the fractal structures (like uv-unwrapping).
- **Radial** mapping on both axes can create spherical projection effects.
- **Texture Scale**: Controls how many times the image repeats. High values create detailed surface grain; low values project the image across the whole object.
- **Seamless Textures**: Use tileable images to avoid visible seams.
`},"grad.noise":{id:"grad.noise",category:"Coloring",title:"Procedural Noise",parentId:"panel.gradient",content:`
Adds fine surface detail using a 3D Simplex Noise function calculated in real-time.

### Parameters
- **Scale**: The size of the noise grain.
  - High values (100+) create dusty, sandy, or metallic grain.
  - Low values (1-10) create large blobs or camouflage patterns.
- **Turbulence**: Distorts the noise coordinate space, creating marble-like swirls and fluid distortions.
- **Bump**: Uses the noise value to perturb the surface normals.
  - Positive values create bumps.
  - Negative values create pits/dents.
  - Essential for realistic rock, rust, or concrete surfaces.
- **Mix Strength**: Blends the noise color (single color) with the gradient colors.
`},"grad.editor":{id:"grad.editor",category:"Coloring",title:"Gradient Editor",parentId:"panel.gradient",content:`
The gradient editor lets you design custom color ramps by placing and adjusting color knots along a bar.

### Knots
Click on the gradient bar to add a new knot. Drag knots to reposition them. Select a knot and use the color picker to change its color, or delete it.

### Per-Knot Interpolation
Each knot can have its own interpolation mode, controlling how colors blend between that knot and the next:
- **Linear**: Smooth, even transition between colors (the default).
- **Step**: Hard cut — the color jumps instantly to the next knot with no blending. Great for flat-shaded or "poster" looks.
- **Smooth**: Eased transition that accelerates and decelerates, giving a softer, more natural blend than Linear.

### Bias Handles
Enable **Bias handles** from the context menu (right-click the gradient bar). Bias handles appear between knots and let you push the midpoint of a transition toward one side or the other — so you can make one color dominate more of the space between two knots without moving the knots themselves. Useful for fine-tuning subtle transitions.

### Presets
Right-click the gradient bar to access **gradient presets** — a library of ready-made color ramps you can load instantly. These are a great starting point to tweak from.
`}},Pd={"ui.graph":{id:"ui.graph",category:"Graph",title:"Modular Graph Editor",content:`
The **Modular Formula** allows you to build your own fractal equation by chaining operations together.

## How it works
Standard formulas (like Mandelbulb) are hard-coded loops:
$z \\to z^8 + c$

The Graph allows you to insert steps:
$z \\to Rotate \\to Fold \\to Scale \\to z^8 + c$

## Node Categories
- **Utils**: Comment/Note, Add C (Julia/Pixel), Custom (Legacy).
- **Transforms**: Scale (Mult), IFS Scale (Homothety), Rotate, Translate, Modulo (Repeat).
- **Folds**: Amazing Fold, Abs (Mirror), Box Fold, Sphere Fold, Plane Fold, Menger Fold, Sierpinski Fold. The core of fractal complexity — these reflect space back onto itself.
- **Fractals**: Mandelbulb.
- **Primitives**: Sphere, Box.
- **Distortion**: Twist (Z), Bend (Y), Sine Wave.
- **Combiners (CSG)**: Union, Subtract, Intersect, Smooth Union, Mix (Lerp). Combines shapes using Constructive Solid Geometry.

## How to Add Nodes
- Use the **"Add: Select Node..."** dropdown at the top-left of the editor.
- **Right-click** on the canvas to open a context menu with available nodes.
- Use the **"Load: Select Preset..."** dropdown to load pre-built node chains as a starting point.

## Wiring / Connections
- Each node has **input handles** (top, cyan) and **output handles** (bottom, cyan).
- CSG/Combiner nodes have **two input handles** (A and B) for combining two shapes.
- The chain starts at the **Input Z** node and ends at the **Output Distance** node.
- **Drag** from one handle to another to create a connection.
- **Right-click** on an edge (connection line) to remove it.
- The editor prevents cycles — you cannot wire a node's output back into its own input chain.

## Editor Controls
- **Auto Compile**: When checked, the fractal recompiles automatically after every change.
- **Preview Mode**: When checked, uses a faster preview shader while editing.
- **COMPILE**: Button for manual recompile (useful when Auto Compile is off).
- **Backspace / Delete**: Remove selected nodes.
- **Shift-click**: Select multiple nodes. **Ctrl/Cmd-click**: Add individual nodes to selection.
- **MiniMap**: A small overview map in the corner for navigating large graphs.
- **Zoom**: Scroll to zoom in/out (0.1x to 4x range).

## Per-Node Features
- **Enable/Disable toggle**: Temporarily bypass a node without deleting it.
- **Delete (X button)**: Remove a node from the graph.
- **Condition (per-iteration logic)**: Nodes can be set to execute only on specific iterations using "if iter % Mod == Rem". This lets you apply different operations on alternating iterations for more complex fractal structures.

## Bindings
You can link any node parameter (like "Rotation X") to a global slider (Param A-D).
1. Click the **Link Icon** next to a node slider.
2. It cycles through Param A, B, C, D.
3. Now, changing Param A in the main UI will drive that specific node value. This allows you to animate complex graphs easily.
`}},Td={"panel.scene":{id:"panel.scene",category:"UI",title:"Scene Panel",content:`
Configures the camera, navigation physics, and atmospheric optics.

## Sections
- **Optics (DOF & Lens)**: Field of view, projection mode, and Depth of Field (blur).
- **Camera & Navigation** (Advanced Mode Only): Movement mode, speed, and absolute coordinates.
- **Atmosphere (Fog)**: Distance fog and volumetric density.
- **Volumetric Scatter**: Atmospheric light scattering.
- **Water Plane** (when enabled): Water surface simulation.
- **Color Correction**: Saturation, levels, and gamma adjustments.
- **Effects**: Bloom, Chromatic Aberration, and Droste effect.
`},"scene.grading":{id:"scene.grading",category:"UI",title:"Color Correction",parentId:"panel.scene",content:`
Post-processing adjustments applied to the final image.

## Controls
- **Saturation**: Controls color intensity. 0.0 is Grayscale, 1.0 is Normal, >1.0 is Vivid.
- **Histogram & Levels**:
  - **Black Point (Min)**: Any pixel darker than this becomes pure black. Increasing this adds contrast.
  - **White Point (Max)**: Any pixel brighter than this becomes pure white.
  - **Gamma**: Non-linear brightness curve. Adjusts mid-tones without crushing blacks or whites.
`},"cam.mode":{id:"cam.mode",category:"UI",title:"Camera Mode",parentId:"panel.scene",content:`
> **REQUIRES ADVANCED MODE**

Determines how the camera moves through the fractal.

## Orbit Mode
The camera rotates around a pivot point.
- **Left Click**: Rotate around target.
- **Right Click**: Pan target.
- **Scroll**: Zoom in/out.
- **Precision**: When you release the mouse, the engine automatically re-centers the coordinate system around your new pivot point. This ensures you can zoom infinitely into details without losing floating-point precision.

## Fly Mode
First-person free flight, similar to a drone or spacecraft.
- **Left Click Drag**: Mouse look (rotate camera).
- **WASD**: Move horizontally.
- **Space/C**: Move Up/Down.
- **Q/E**: Roll.
- **Shift**: Speed Boost (4x).
- **Best For**: Exploration, cinematic fly-throughs, and navigating inside tunnels.

> **Note**: In Fly mode with the timeline open, the Space key only triggers play/pause when hovering over the timeline. Otherwise it moves the camera up.
`},"cam.rotation":{id:"cam.rotation",category:"UI",title:"Camera Rotation",parentId:"cam.mode",content:`
Controls the orientation of the camera in 3D space.

## Mouse Controls
- **Fly Mode**: Click and drag in the viewport to look around freely (mouse-look).
- **Orbit Mode**: Click and drag to rotate around the current pivot point.

## Keyboard Controls
- **Q / E**: Roll the camera left or right (tilt your head). Useful for diagonal compositions or matching a fractal's natural symmetry.

## Rotation Display
The rotation values are shown as three angles (one per axis). You can **right-click** the rotation control to switch between **Degrees** (e.g. 45°) and **Radians** (e.g. 0.25π) — whichever you find easier to work with.
`},"cam.fov":{id:"cam.fov",category:"UI",title:"Field of View (FOV)",parentId:"panel.scene",content:`
Controls the zoom angle of the camera lens (in degrees).

- **High FOV (90°+)**: "Fish-eye" look. Increases sense of speed and scale. Great for flying inside tunnels.
- **Low FOV (10°-30°)**: "Telephoto" look. Flattens depth. Great for macro photography of small details.
- **Standard (60°)**: Natural human vision balance.

## Projection Modes
- **Perspective (Default)**: Standard 3D perspective projection using FOV.
- **Orthographic**: Parallel projection with no perspective distortion. Uses **Ortho Scale** instead of FOV to control the visible area.
- **360 Skybox**: Renders a full 360° equirectangular panorama. Useful for VR content or environment maps.
`},"cam.position":{id:"cam.position",category:"UI",title:"Absolute Position",parentId:"panel.scene",content:`
> **REQUIRES ADVANCED MODE**

The raw coordinate of the camera in fractal space.

## Precision Note
Due to the "Infinite Zoom" engine, this value combines the **Offset** (the position of the universe) and the **Local Camera** (relative position).
Editing these values directly allows for precise teleportation, but be careful: large jumps may land you inside solid geometry (black screen).
`},"scene.geometry":{id:"scene.geometry",category:"UI",title:"Geometry & Transforms",parentId:"panel.formula",content:`
Controls the spatial transformations and geometric modifications applied to the fractal before or during iteration.

## Julia Mode
Switches from **Mandelbrot** mode (where C = position) to **Julia** mode (where C = constant).
- **Julia X/Y/Z**: The 3D Julia constant. Changing these morphs the fractal shape smoothly.
- **Tip**: Find an interesting area in Mandelbrot mode, then toggle Julia and adjust the constant to "freeze" that region.

## Pre-Rotation
Rotates the entire coordinate space before the fractal iteration begins.
- **Rot X / Y / Z**: Euler angles (degrees). Creates tilted, diagonal versions of the fractal.
- **Master Toggle**: Enables/disables all pre-rotation at once.

## Burning Mode
Applies absolute value (\`abs()\`) to coordinates before iteration, creating the "Burning Ship" variant of any formula. Produces sharp, angular structures.

## Hybrid Box (Fold System)
Injects a geometric folding operation into the fractal iteration loop. The fold runs *before* the main formula step each iteration.

### Fold Types
- **Standard**: Classic Mandelbox box fold + sphere fold.
- **Half**: One-sided fold (reflects only positive side).
- **Tetra**: Tetrahedral reflection folds (Sierpinski-like).
- **Octa**: Octahedral reflection folds.
- **Icosa**: Icosahedral/dodecahedral folds (golden ratio reflections).
- **Menger**: Axis-sorting Menger sponge fold.
- **Mirror**: Simple axis-aligned mirror.
- **Decoupled**: Independent per-axis fold limits.
- **Kali**: Kali's abs-inversion fold.

### Hybrid Controls
- **Fold Iterations**: How many fold passes per formula iteration.
- **Scale / MinR / FixedR**: Standard Mandelbox-type fold parameters.
- **Skip / Swap**: Skip the first N iterations, or swap fold/formula order.
- **Add C**: Whether to add the constant C after folding (affects convergence).
- **Shift / Rotation**: Per-fold spatial offsets and rotations.
`},"dof.settings":{id:"dof.settings",category:"Rendering",title:"Depth of Field (DOF)",parentId:"panel.scene",content:`
Simulates a physical camera lens.

- **Camera Blur**: Strength of the blur. 0.0 = Pinhole camera (infinite focus). 
  - The blur effect accumulates over time when the camera is stationary.
  - During camera movement, DOF is temporarily disabled for a stable preview.
  - Supports **High Precision** (down to $0.0001$) for macro photography.
- **Focus Distance**: Distance to the sharp plane.
- **Auto-Focus**: Use the "Pick Focus" button in the Scene tab to click a point and set this value automatically.

**Note**: DOF requires **Temporal Accumulation** to look smooth. It uses stochastic jittering of the camera ray.
`}},Ed={"post.effects":{id:"post.effects",category:"Effects",title:"Post-Processing Effects",content:`
Post-processing effects are visual adjustments applied **after** the fractal has been rendered. They modify the final image on screen without changing the underlying raymarching, so they have virtually no impact on rendering performance.

## Available Effects
- **Bloom**: Adds a soft glow around bright areas, simulating how real camera lenses scatter intense light.
- **Chromatic Aberration**: Separates color channels at the edges of the frame, mimicking the rainbow fringing of wide-angle lenses.
- **Color Grading**: Controls tone mapping (how HDR brightness is compressed to screen range) and overall color balance — saturation, levels, and gamma.

Each effect has its own detailed settings — expand the sections below to learn more.

## Tips
- Post-processing is always fast, even on lower-end hardware.
- Effects are included in Bucket Renders and Video Exports — what you see in the viewport is what you get in the final file.
`},"effect.bloom":{id:"effect.bloom",category:"Effects",title:"Bloom",content:`
Creates a soft glow around bright areas of the image, simulating how real camera lenses scatter intense light.

## Controls
- **Intensity**: Strength of the glow effect. Higher values produce a more dramatic, dreamy look.
- **Threshold**: Brightness cutoff — only pixels brighter than this value will bloom. Lower threshold = more of the image glows.
- **Spread**: How far the glow extends from bright areas. Higher values create a wider, softer halo.

## Tips
- Works especially well with **Self-Illumination** (emissive surfaces) and bright specular highlights.
- Bloom is a post-processing effect and runs after the main render, so it has minimal performance cost.
`},"effect.chromatic":{id:"effect.chromatic",category:"Effects",title:"Chromatic Aberration",content:`
Simulates the color fringing that occurs in real camera lenses, where red, green, and blue light bend slightly differently through glass.

The effect separates color channels at the edges of the frame, creating rainbow fringing that increases toward the corners — just like a wide-angle lens.

## Tips
- Subtle amounts (low intensity) add a photographic quality.
- Higher amounts create a stylized, glitchy look.
- This is a post-processing effect with minimal performance cost.
`},"effect.colorgrading":{id:"effect.colorgrading",category:"Effects",title:"Color Grading",content:`
Controls the final color processing of the rendered image, similar to color grading in film and photography.

## Tone Mapping
Tone mapping compresses the wide range of light intensities (HDR) into the visible screen range. Different modes produce different visual styles:

- **ACES**: Industry-standard cinematic look. Rich contrast with slightly warm highlights. Great all-round choice.
- **AgX**: Modern filmic curve with excellent highlight handling. Avoids the oversaturated look of ACES in very bright areas.
- **Reinhard**: Classic tone mapping. Softer, more even compression. Good for scenes without extreme brightness.
- **Neutral**: Minimal color shift — closest to the raw render output. Useful when you want full manual control.
- **None**: No tone mapping applied. The raw HDR values are clamped directly. Bright areas will clip to white.

## Color Controls
- **Saturation**: Adjusts the intensity of all colors. 1.0 = natural, 0.0 = grayscale, >1.0 = vivid.
- **Levels**: Adjusts the black and white points of the image for contrast control.
`},"effect.droste":{id:"effect.droste",category:"Effects",title:"Escher Droste (Spiral)",content:`
The Droste effect recursively maps an image inside itself, creating infinite spirals or loops. This implementation is mathematically based on M.C. Escher's "Print Gallery".

**Reference:** [Wikipedia: Droste Effect](https://en.wikipedia.org/wiki/Droste_effect)
**Artistic Origin:** [M.C. Escher: Print Gallery](https://en.wikipedia.org/wiki/Print_Gallery_(M._C._Escher))

## How it works
It transforms the screen coordinates from **Cartesian** ($x, y$) to **Log-Polar** space. 
This turns scaling (zooming) into a linear shift, allowing us to repeat the image periodically as it shrinks towards the center.

## Key Controls
- **Inner/Outer Radius**: Defines the "Ring" (Annulus) where the image lives. The ratio between these determines how fast the spiral shrinks.
- **Periodicity**: How many times the image repeats per spiral loop.
- **Strands**: Number of separate spiral arms. Can be negative (range -12 to 12) — negative values reverse the spiral direction.
`},"droste.geometry":{id:"droste.geometry",category:"Effects",title:"Geometry & Tiling",parentId:"effect.droste",content:`
Controls the physical bounds of the spiral.

- **Inner Radius ($r_1$)**: The size of the "hole" in the center.
- **Outer Radius ($r_2$)**: The outer edge of the image.
- **Tiling**:
  - **Repeat**: Standard tile.
  - **Mirror**: Flips every other tile. Essential for seamless spirals if the image edges don't match.
  - **Clamp**: Stretches the edge pixels (Smear effect).
  - **Transparent**: Only draws the spiral ring, leaving the center/outside empty (or showing the background).
- **Center Shift**: Moves the vanishing point of the spiral.
`},"droste.structure":{id:"droste.structure",category:"Effects",title:"Spiral Structure",parentId:"effect.droste",content:`
Controls the math of the repetition.

- **Periodicity ($P_1$)**: The repetition frequency.
  - **1.0**: Image repeats once per full rotation.
  - **2.0**: Image repeats twice (180° symmetry).
- **Strands ($P_2$)**: The number of "arms" in the spiral. Can be negative (-12 to 12) — negative values reverse the spiral direction.
  - **1**: Single continuous tunnel.
  - **2**: Double helix structure.
- **Auto Period**: Mathematically calculates the perfect Periodicity based on the Radius ratio ($r_2/r_1$) to prevent distortion. Recommended to keep this **ON** unless you want artistic stretching.
- **Mirror Strand**: Alters the rotation logic to align strands seamlessly when using Mirror Tiling.
`},"droste.transform":{id:"droste.transform",category:"Effects",title:"Transform & Distortion",parentId:"effect.droste",content:`
- **Zoom**: Moves the camera *into* the spiral. Because the spiral is infinite, zooming eventually brings you back to the start (just deeper).

### Three Rotation Controls
The Droste effect has three separate rotation axes that each produce distinct visual results:
- **Spiral Rotate**: Rotates the spiral structure itself — the arms twist tighter or looser.
- **Image Spin**: Rotates the image content within the spiral frame, independently of the spiral geometry.
- **Polar Rotate**: Rotates around the polar axis in log-polar space, shifting the mapping angle.

- **Twist**: The core "Escher" switch.
  - **On**: Log-Polar mapping (Spiral).
  - **Off**: Standard Log mapping (Tunnel/Grid).
- **Hyper Droste**: Applies a complex sine function, turning the spiral into a Fractal-like shape.
- **Fractal Points**: When Hyper Droste is on, determines the number of branches/tips in the fractal structure.
`}},Ld={"panel.audio":{id:"panel.audio",category:"Audio",title:"Audio Engine",content:`
The Audio Engine analyzes sound frequencies in real-time to drive fractal parameters, allowing the visual to react to music or voice.

## How it works
1. **Source**: Select an audio input (Microphone, System Audio, or load a file).
2. **Spectrum**: The engine breaks the sound into frequencies (Bass on left, Treble on right).
3. **Links**: You create "Links" that map a specific frequency range (e.g., the kick drum) to a specific parameter (e.g., Scale).

## Volume and FFT Controls
- **FFT Smooth** (0–0.99): Smooths the frequency analysis over time. Higher values give a more stable, averaged reading.
- **Volume** (0–2): Master gain slider controlling the overall audio level.

## Performance
Audio analysis uses the WebAudio API which processes audio efficiently, but the visualization and modulation application run in the main rendering loop. Modulating complex geometry parameters (like Loop Iterations) every frame can impact GPU performance.
`},"audio.sources":{id:"audio.sources",category:"Audio",title:"Input Sources",parentId:"panel.audio",content:`
Select where the audio data comes from.

- **Microphone**: Uses your default recording device. Great for voice reactivity or ambient room noise.
- **System Audio**: Captures audio from other tabs or applications.
  - *Note*: When the browser dialog appears, you must check the **"Share System Audio"** box, otherwise only video is shared.
- **Load File**: Loads a local audio file (MP3/WAV) and creates a playback deck with play/pause and seek controls.

## Dual Deck / Crossfade
You can load two audio files into **Track A** and **Track B**. Each deck has its own play/pause and seek controls. Use the **Crossfade** slider to blend smoothly between the two tracks — fully left plays only Track A, fully right plays only Track B, and the middle mixes both.
`},"audio.links":{id:"audio.links",category:"Audio",title:"Modulation Links",parentId:"panel.audio",content:`
A **Link** connects a slice of the audio spectrum to a fractal parameter.

## Creating Links
- **Double-click** on the spectrum to create a new modulation box.
- Use the **"+ Add New Link"** button below the spectrum.

## Frequency Selection
The box on the spectrum defines which frequencies drive the parameter.
- **Drag** the box to move it across the frequency range.
- **Drag individual edges** (left, right, top, bottom) to resize the box. The top and bottom edges also control the threshold — signals below the bottom are ignored (noise gate) and signals above the top are clamped (ceiling).
- **Ctrl+Drag** on a box to adjust its gain visually.
- **Right-click** on the spectrum to toggle between **Logarithmic** and **Linear** frequency scale.
- **Quick band buttons**: Bass, Mids, Treble, Full — instantly position the box over common frequency ranges.

Frequency guide:
- **Left (Bass)**: Kick drums, basslines.
- **Middle (Mids)**: Vocals, synths, guitars.
- **Right (Treble)**: Hi-hats, cymbals, air.

## Source Selector
Each link has a **Source** dropdown to choose what drives the modulation:
- **Audio Spectrum** (default): Uses the selected frequency range from the live audio.
- **LFO 1 / LFO 2 / LFO 3**: Low-frequency oscillators that provide rhythmic modulation without any audio input — useful for automated, repeating animation.

## Target Parameter
Each link has a dropdown to choose which fractal parameter to modulate (e.g., Scale, Rotation, Fold Amount).

## Dynamics (Knobs)
Five knobs shape how the signal behaves before it reaches the parameter:
- **Attack** (Rise): How fast the value rises when a sound hits. Low = snappy, high = smooth.
- **Decay** (Fall): How fast the value falls after the sound stops. High decay creates a "trailing" effect.
- **Smooth** (Lerp): Blends between the previous value and the new value each frame, softening rapid changes.
- **Gain** (Mult): Multiplies the output signal. Increase this if the reaction is too subtle.
- **Offset** (Add): Adds a base value to the parameter, so it doesn't drop to zero when silent.

## Active Links
Below the spectrum, a collapsible list shows all your modulation rules. Each entry displays a color indicator, the frequency range, and a delete button for quick management.
`}},Nd={...vd,...wd,...Sd,...Md,...Cd,...kd,...jd,...Rd,...Id,...Pd,...Td,...Ed,...Ld},wr=({x:e,y:n,items:t,targetHelpIds:o,onClose:i,onOpenHelp:s,isSubmenu:r})=>{const l=M.useRef(null),[c,d]=M.useState({x:e,y:n,opacity:0}),[f,h]=M.useState(null),p=M.useRef(null);M.useLayoutEffect(()=>{if(!l.current)return;const y=l.current.getBoundingClientRect(),b=window.innerWidth,x=window.innerHeight,m=8;let C=e,k=n;r?C+y.width>b-m&&(C=e-y.width-200,C=b-y.width-m):C+y.width>b-m&&(C=e-y.width),k+y.height>x-m&&(k=Math.max(m,x-y.height-m)),C=Math.max(m,Math.min(C,b-y.width-m)),k=Math.max(m,Math.min(k,x-y.height-m)),d({x:C,y:k,opacity:1})},[e,n,t,o,r]),M.useEffect(()=>{if(r)return;const y=x=>{x.target.closest(".fractal-context-menu")||i()},b=setTimeout(()=>window.addEventListener("mousedown",y),50);return()=>{clearTimeout(b),window.removeEventListener("mousedown",y)}},[i,r]);const u=o.map(y=>Nd[y]).filter(y=>!!y),g=(y,b)=>{if(p.current&&clearTimeout(p.current),y.children){const x=b.currentTarget.getBoundingClientRect();h({items:y.children,x:x.right,y:x.top})}else h(null)},v=a.jsxs("div",{ref:l,className:"fractal-context-menu fixed z-[9999] bg-[#1a1a1a] border border-white/20 rounded shadow-[0_4px_20px_rgba(0,0,0,0.8)] py-1 min-w-[200px] animate-fade-in [&_.animate-slider-entry]:!animate-none",style:{left:c.x,top:c.y,opacity:c.opacity},onContextMenu:y=>y.preventDefault(),children:[t.map((y,b)=>{var x;return y.element?a.jsx("div",{children:y.element},b):y.isHeader?a.jsx("div",{className:"px-4 py-1 text-[9px] text-gray-500 font-bold border-b border-white/10 mt-1 mb-1 bg-white/5",children:y.label},b):y.type==="slider"?a.jsx("div",{className:"px-3 py-1 mb-1",children:a.jsx(fe,{label:y.label||"",value:y.value??0,min:y.min??0,max:y.max??1,step:y.step??.01,onChange:m=>y.onChange&&y.onChange(m),highlight:!0,overrideInputText:(x=y.value)==null?void 0:x.toFixed(2)})},b):a.jsxs("button",{onClick:()=>{!y.disabled&&!y.children&&y.action&&(y.action(),y.keepOpen||i())},onMouseEnter:m=>g(y,m),disabled:y.disabled,className:`w-full text-left px-4 py-2 text-xs flex items-center justify-between transition-colors group relative ${y.disabled?"text-gray-600 cursor-not-allowed opacity-50":y.danger?"text-red-400 hover:bg-red-900/30 hover:text-red-300":"text-gray-300 hover:bg-white/10 hover:text-white"}`,children:[a.jsxs("div",{className:"flex items-center gap-2",children:[y.icon&&a.jsx("span",{className:y.disabled?"text-gray-600":"text-gray-500",children:y.icon}),a.jsx("span",{className:y.checked?"text-cyan-400 font-bold":"",children:y.label})]}),y.checked&&a.jsx(Rt,{}),y.children&&a.jsx(Sa,{})]},b)}),t.length>0&&u.length>0&&a.jsx("div",{className:"h-px bg-cyan-500/15 my-1"}),u.length>0&&a.jsxs("div",{className:"bg-cyan-950/20 border-t border-cyan-500/10 pt-0.5 pb-0.5",children:[a.jsxs("div",{className:"px-3 py-1 text-[9px] text-cyan-600 font-semibold tracking-wider uppercase flex items-center gap-1.5 select-none",children:[a.jsx("span",{className:"text-cyan-500 opacity-70",children:a.jsx(Bo,{})})," Help"]}),u.map((y,b)=>a.jsxs("button",{onClick:()=>{s(y.id),i()},className:`w-full text-left py-1.5 text-xs transition-colors flex items-center gap-2 group ${b===0?"text-cyan-300 hover:bg-cyan-800/30 hover:text-cyan-100 font-medium":"text-cyan-600 hover:bg-cyan-900/20 hover:text-cyan-300"}`,style:{paddingLeft:`${14+b*10}px`,paddingRight:"16px"},children:[a.jsx("span",{className:`text-[10px] ${b===0?"text-cyan-500":"text-cyan-700"}`,children:"?"}),a.jsx("span",{children:y.title}),b===0&&a.jsx("span",{className:"ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-cyan-500",children:a.jsx(ri,{})})]},y.id))]}),f&&a.jsx(wr,{x:f.x,y:f.y,items:f.items,targetHelpIds:[],onClose:i,onOpenHelp:s,isSubmenu:!0})]});return r?v:Vt.createPortal(v,document.body)},Qa=300,jo=60,Dd=38,_d=()=>{const[e,n]=M.useState(null),t=M.useRef({x:0,y:0}),o=z(),i=o.coreMath,{formula:s,setCoreMath:r}=o;if(!i)return null;const l={1:{key:"paramA",setter:d=>r({paramA:d}),val:i.paramA},2:{key:"paramB",setter:d=>r({paramB:d}),val:i.paramB},3:{key:"paramC",setter:d=>r({paramC:d}),val:i.paramC},4:{key:"paramD",setter:d=>r({paramD:d}),val:i.paramD},5:{key:"paramE",setter:d=>r({paramE:d}),val:i.paramE},6:{key:"paramF",setter:d=>r({paramF:d}),val:i.paramF}};if(M.useEffect(()=>{const d=p=>{t.current={x:p.clientX,y:p.clientY}},f=p=>{if(p.target.tagName==="INPUT"||p.target.tagName==="TEXTAREA")return;const u=p.key,g=l[u];if(g&&!e){const v=we.get(s),y=parseInt(u)-1;let b=v==null?void 0:v.parameters[y];if(s==="Modular"&&(b={label:`Param ${String.fromCharCode(65+y)}`,id:g.key,min:-5,max:5,step:.01,default:0}),b){const x=b.max-b.min,m=(g.val-b.min)/x,C=Qa-24,k=12+m*C;let w=t.current.x-k,S=t.current.y-Dd;w=Math.max(10,Math.min(window.innerWidth-Qa-10,w)),S=Math.max(10,Math.min(window.innerHeight-jo-10,S)),n({id:parseInt(u),paramKey:g.key,label:b.label,def:{min:b.min,max:b.max,step:b.step},x:w,y:S})}}},h=p=>{e&&p.key===String(e.id)&&n(null)};return window.addEventListener("mousemove",d),window.addEventListener("keydown",f),window.addEventListener("keyup",h),()=>{window.removeEventListener("mousemove",d),window.removeEventListener("keydown",f),window.removeEventListener("keyup",h)}},[e,s,i]),!e)return null;const c=l[String(e.id)];return a.jsxs("div",{className:"fixed z-[9999] bg-black/80 backdrop-blur-xl border border-cyan-500/50 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col justify-center px-3 animate-pop-in",style:{left:e.x,top:e.y,width:Qa,height:jo},children:[a.jsxs("div",{className:"absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-cyan-900 rounded text-[9px] font-bold text-cyan-200 border border-cyan-700 shadow-sm",children:["Quick Edit (",e.id,")"]}),a.jsx(fe,{label:e.label,value:c.val,min:e.def.min,max:e.def.max,step:e.def.step,onChange:c.setter,highlight:!0,trackId:e.paramKey})]})},Fd=()=>{const e=M.useRef(!1);return M.useEffect(()=>{e.current||(e.current=!0,xe().setWorkerModePending(),Wl())},[]),null},xa=xe(),Ad=()=>typeof window>"u"?!1:window.matchMedia("(pointer: coarse)").matches||window.innerWidth<768,zd=e=>{const n=z(),[t,o]=M.useState("default"),i=M.useRef(!1),s=M.useCallback(r=>{if(!(!r&&(xa.isBooted||i.current))){i.current=!0;try{setTimeout(()=>{var u;const l=z.getState(),c=dr(l),d=l.cameraRot||{x:0,y:0,z:0,w:1},f=((u=l.optics)==null?void 0:u.camFov)??60,h={position:[0,0,0],quaternion:[d.x,d.y,d.z,d.w],fov:f};xa.bootWithConfig(c,h);const p=l.sceneOffset;if(p){const g={x:p.x,y:p.y,z:p.z,xL:p.xL??0,yL:p.yL??0,zL:p.zL??0};xa.setShadowOffset(g),xa.post({type:"OFFSET_SET",offset:g})}},50)}catch(l){console.error("Critical Engine Boot Failure:",l),i.current=!1}}},[]);return M.useEffect(()=>{const r=window.location.hash;let l=null;if(r&&r.startsWith("#s=")){const c=r.slice(3);l=lr(c),l&&o("url")}if(!l){const c=we.get("Mandelbulb");c&&c.defaultPreset&&(l=JSON.parse(JSON.stringify(c.defaultPreset)))}if(l&&Ad()){l.features||(l.features={});const c=_a.lite;Object.entries(c).forEach(([d,f])=>{l.features[d]||(l.features[d]={}),Object.assign(l.features[d],f)})}l&&n.loadPreset(l)},[]),{startupMode:t,bootEngine:s}},Sr=({activeTab:e,state:n,actions:t,onSwitchTab:o})=>{if(e==="Graph"){const r=ve.get("panel-graph");if(r)return a.jsx("div",{className:"h-[600px] -m-4",children:a.jsx(r,{state:n,actions:t})})}if(e==="Camera Manager"){const r=ve.get("panel-cameramanager");if(r)return a.jsx(r,{state:n,actions:t})}if(e==="Engine"){const r=ve.get("panel-engine");if(r)return a.jsx(r,{state:n,actions:t})}const s=ne.getTabs().find(r=>r.label===e);if(s){const r=ve.get(s.componentId);if(r){const l=s.id,c=n[l];return a.jsx(r,{state:n,actions:t,onSwitchTab:o,featureId:l,sliceState:c})}}return a.jsx("div",{className:"flex h-full items-center justify-center text-gray-600 text-xs italic",children:"Select a module"})},Od=()=>typeof window>"u"?!1:window.matchMedia("(pointer: coarse)").matches||window.innerWidth<768,Ro=({side:e})=>{const{panels:n,activeLeftTab:t,activeRightTab:o,togglePanel:i,movePanel:s,reorderPanel:r,startPanelDrag:l,endPanelDrag:c,draggingPanelId:d,setDockSize:f,isLeftDockCollapsed:h,isRightDockCollapsed:p,setDockCollapsed:u,openContextMenu:g,leftDockSize:v,rightDockSize:y,formula:b,advancedMode:x}=z(),m=Od(),C=z.getState().audio,k=z.getState().drawing,w=e==="left"?t:o,S=e==="left"?h:p,j=e==="left"?v:y,R=Object.values(n).filter(A=>{let T=A.location;return m&&(A.id==="Engine"||A.id==="Camera Manager")&&(T="right"),!(T!==e||A.id==="Graph"&&b!=="Modular"||A.id==="Light"&&!x||A.id==="Audio"&&!(C!=null&&C.isEnabled)||A.id==="Drawing"&&!(k!=null&&k.enabled))}).sort((A,T)=>A.order-T.order),I=M.useRef(null),N=A=>{A.preventDefault(),I.current={startX:A.clientX,startW:j},window.addEventListener("mousemove",L),window.addEventListener("mouseup",E),document.body.style.cursor="ew-resize"},L=A=>{if(!I.current)return;const T=A.clientX-I.current.startX,G=e==="left"?T:-T,H=Math.max(200,Math.min(800,I.current.startW+G));f(e,H)},E=()=>{I.current=null,window.removeEventListener("mousemove",L),window.removeEventListener("mouseup",E),document.body.style.cursor=""},D=(A,T)=>{A.preventDefault();const G=Xe(A.currentTarget);g(A.clientX,A.clientY,[],G)};return R.length===0?null:S?a.jsxs("div",{className:`flex flex-col w-8 bg-black border-${e==="left"?"r":"l"} border-white/10 z-40 shrink-0`,children:[a.jsx("button",{onClick:()=>u(e,!1),className:"h-10 flex items-center justify-center text-gray-500 hover:text-white",children:e==="left"?a.jsx(Sa,{}):a.jsx(_n,{})}),a.jsx("div",{className:"flex-1 flex flex-col items-center py-2 gap-2",children:R.map(A=>a.jsx("div",{onClick:()=>i(A.id,!0),className:`w-6 h-6 flex items-center justify-center rounded cursor-pointer ${A.id===w?ii:si}`,title:A.id,children:a.jsx("span",{className:"text-[10px] font-bold",children:A.id.charAt(0)})},A.id))})]}):a.jsxs("div",{className:`flex flex-col ${_t.dock} border-${e==="left"?"r":"l"} ${tt.standard} z-40 shrink-0 transition-all duration-75 relative`,style:{width:j},children:[a.jsx("div",{className:`flex flex-wrap gap-0.5 px-0.5 pt-1 ${_t.tabBar} border-b ${tt.standard} shrink-0 relative items-end`,children:R.map(A=>{const T=A.id===w;return a.jsxs("button",{onClick:()=>i(A.id,!0),onContextMenu:G=>D(G,A.id),onMouseEnter:()=>{if(d&&d!==A.id){const G=n[d];G&&G.location===e&&r(d,A.id)}},onMouseUp:G=>{d&&(G.stopPropagation(),c())},className:`flex items-center gap-0.5 px-1 py-1 text-[9px] font-bold transition-colors group relative rounded-t-sm
                                ${T?li:ci}`,children:[!m&&a.jsx("div",{className:`cursor-move ${T?`${di} group-hover:text-cyan-600`:`${ui} group-hover:text-white`} transition-colors`,onMouseDown:G=>{G.stopPropagation(),l(A.id)},children:a.jsx("div",{className:"transform scale-75 origin-center",children:a.jsx(Sn,{})})}),a.jsx("span",{className:"truncate max-w-[140px]",children:A.id})]},A.id)})}),a.jsx("button",{onClick:()=>u(e,!0),className:"absolute top-1 right-1 p-1 text-gray-600 hover:text-white z-20",children:e==="left"?a.jsx(_n,{}):a.jsx(Sa,{})}),a.jsx("div",{className:"flex-1 overflow-y-auto custom-scroll p-4 relative",children:w?a.jsx(Sr,{activeTab:w,state:z.getState(),actions:z.getState(),onSwitchTab:i}):a.jsx("div",{className:"flex h-full items-center justify-center text-gray-700 text-xs italic",children:"Select a panel"})}),a.jsx("div",{className:`absolute top-0 bottom-0 w-1 cursor-ew-resize ${Mn.hoverBg} transition-colors z-50 ${e==="left"?"right-[-2px]":"left-[-2px]"}`,onMouseDown:N})]})},$d=()=>{const{draggingPanelId:e,movePanel:n,endPanelDrag:t,cancelPanelDrag:o,panels:i,leftDockSize:s,rightDockSize:r,isLeftDockCollapsed:l,isRightDockCollapsed:c}=z();if(M.useEffect(()=>{if(!e)return;const g=()=>{o()};return window.addEventListener("mouseup",g),()=>window.removeEventListener("mouseup",g)},[e,o]),!e)return null;const d=i[e],f=d?d.location:null,h=(g,v)=>{g.stopPropagation(),n(e,v),t()},p=l?32:s,u=c?32:r;return a.jsxs("div",{className:"fixed inset-0 z-[1000] flex pointer-events-none",children:[a.jsx("div",{style:{width:p},className:`h-full flex items-center justify-center transition-all duration-200 border-r-2
                    ${f!=="left"?"bg-cyan-900/40 border-cyan-500/50 pointer-events-auto cursor-copy":"border-transparent pointer-events-none"}`,onMouseUp:g=>{f!=="left"&&h(g,"left")},children:f!=="left"&&a.jsx("div",{className:"bg-black/80 px-4 py-2 rounded border border-cyan-500/50 text-cyan-200 font-bold text-sm shadow-xl backdrop-blur-md",children:"Dock Left"})}),a.jsx("div",{className:`flex-1 h-full flex items-center justify-center transition-all duration-200
                    ${f!=="float"?"bg-purple-900/20 hover:bg-purple-900/30 border-x-2 border-purple-500/30 pointer-events-auto cursor-copy":"pointer-events-none"}`,onMouseUp:g=>{f!=="float"&&h(g,"float")},children:f!=="float"&&a.jsx("div",{className:"bg-black/80 px-4 py-2 rounded border border-purple-500/50 text-purple-200 font-bold text-sm shadow-xl backdrop-blur-md",children:"Float Window"})}),a.jsx("div",{style:{width:u},className:`h-full flex items-center justify-center transition-all duration-200 border-l-2
                    ${f!=="right"?"bg-cyan-900/40 border-cyan-500/50 pointer-events-auto cursor-copy":"border-transparent pointer-events-none"}`,onMouseUp:g=>{f!=="right"&&h(g,"right")},children:f!=="right"&&a.jsx("div",{className:"bg-black/80 px-4 py-2 rounded border border-cyan-500/50 text-cyan-200 font-bold text-sm shadow-xl backdrop-blur-md",children:"Dock Right"})})]})},Bd=({id:e,title:n,children:t,position:o,onPositionChange:i,size:s,onSizeChange:r,onClose:l,disableClose:c,zIndex:d,initialPos:f,initialSize:h})=>{const{panels:p,setFloatPosition:u,setFloatSize:g,togglePanel:v,startPanelDrag:y}=z(),b=!!e,x=e?p[e]:null,[m,C]=M.useState(f||{x:100,y:100}),[k,w]=M.useState(h||{width:300,height:200}),S=b?(x==null?void 0:x.floatPos)||{x:100,y:100}:o||m,j=b?(x==null?void 0:x.floatSize)||{width:320,height:400}:s||k,R=M.useRef(S),I=M.useRef(j),N=M.useRef(null),L=M.useRef(null);if(M.useEffect(()=>{R.current=S},[S.x,S.y]),M.useEffect(()=>{I.current=j},[j.width,j.height]),b&&(!x||!x.isOpen||x.location!=="float"))return null;const E=n||(x?x.id:"Window"),D=d||(b?100:200),A=()=>{if(l)l();else if(b&&e){const W=z.getState();e==="Audio"?W.setAudio({isEnabled:!1}):e==="Drawing"?W.setDrawing({enabled:!1}):e==="Engine"&&W.setEngineSettings({showEngineTab:!1}),v(e,!1)}},T=H=>{if(H.target.closest("button"))return;H.preventDefault(),N.current={x:H.clientX,y:H.clientY,startX:R.current.x,startY:R.current.y};const W=_=>{if(!N.current)return;const U=_.clientX-N.current.x,O=_.clientY-N.current.y,P={x:N.current.startX+U,y:N.current.startY+O};i?i(P):b&&e?u(e,P.x,P.y):C(P),R.current=P},B=()=>{N.current=null,window.removeEventListener("mousemove",W),window.removeEventListener("mouseup",B)};window.addEventListener("mousemove",W),window.addEventListener("mouseup",B)},G=H=>{H.preventDefault(),H.stopPropagation(),L.current={x:H.clientX,y:H.clientY,startW:I.current.width,startH:I.current.height};const W=_=>{if(!L.current)return;const U=_.clientX-L.current.x,O=_.clientY-L.current.y,P={width:Math.max(200,L.current.startW+U),height:Math.max(150,L.current.startH+O)};r?r(P):b&&e?g(e,P.width,P.height):w(P),I.current=P},B=()=>{L.current=null,window.removeEventListener("mousemove",W),window.removeEventListener("mouseup",B)};window.addEventListener("mousemove",W),window.addEventListener("mouseup",B)};return Vt.createPortal(a.jsxs("div",{className:"fixed glass-panel flex flex-col overflow-hidden animate-pop-in shadow-[0_10px_40px_rgba(0,0,0,0.5)]",style:{left:S.x,top:S.y,width:j.width,height:j.height,maxHeight:"90vh",zIndex:D},children:[a.jsxs("div",{onMouseDown:T,className:"panel-header cursor-move flex items-center justify-between px-2 py-1.5 bg-gray-800/90 border-b border-white/10",children:[a.jsxs("div",{className:"flex items-center gap-2",children:[b&&a.jsx("div",{className:"cursor-grab text-gray-500 hover:text-white",onMouseDown:H=>{H.stopPropagation(),e&&y(e)},children:a.jsx(Sn,{})}),a.jsx("span",{className:"t-label text-gray-200",children:E})]}),!c&&(l||b&&!(x!=null&&x.isCore))&&a.jsx("button",{onClick:A,className:"icon-btn",title:"Close",children:a.jsx(wn,{})})]}),a.jsx("div",{className:"p-3 overflow-y-auto overflow-x-hidden custom-scroll flex-1 relative bg-black/80 backdrop-blur-md",children:t}),a.jsx("div",{onMouseDown:G,className:"absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-20 touch-none text-gray-500",children:a.jsx(hi,{})})]}),document.body)},Hd=Ue.lazy(()=>It(()=>import("./Timeline-BPr-DtqR.js"),__vite__mapDeps([6,1,2,4,7,3,5]),import.meta.url)),Gd=Ue.lazy(()=>It(()=>import("./HelpBrowser-DUCCnIpY.js"),__vite__mapDeps([8,1,2,4,3,5]),import.meta.url)),Ud=Ue.lazy(()=>It(()=>import("./FormulaWorkshop-CWJxgo8H.js"),__vite__mapDeps([9,1,2,4,3,5]),import.meta.url).then(e=>({default:e.FormulaWorkshop}))),Wd=()=>{const e=z(),[n,t]=M.useState(!1),[o,i]=M.useState(!0),[s,r]=M.useState(!1),l=M.useRef(null),c=M.useRef(null),d=M.useRef(null),f=M.useRef(null),h=M.useRef(null),p=M.useRef(null),u=M.useMemo(()=>({container:c,speed:d,dist:f,reset:h,reticle:p}),[]),{startupMode:g,bootEngine:v}=zd(),{isMobile:y,isPortrait:b}=Rn();Ic(s,r),yd();const x=y||e.debugMobileLayout,m=e.quality,C=(m==null?void 0:m.precisionMode)===1,k=x&&e.cameraMode==="Fly",w=e.isBroadcastMode,S=e.interactionMode!=="none",j=E=>{E.preventDefault(),E.stopPropagation(),e.openContextMenu(E.clientX,E.clientY,[],["ui.timeline"])},R=()=>{const E=C?"balanced":"lite";Y.emit("is_compiling",`Switching to ${E} mode...`);const D=e.applyPreset;D&&D({mode:E,actions:e})},I=()=>{i(!1)},N=x&&!w?"min-h-[120vh] bg-black":"fixed inset-0 w-full h-full bg-black select-none overflow-hidden flex flex-col",L=Object.values(e.panels).filter(E=>E.location==="float"&&E.isOpen);return a.jsxs("div",{className:N,children:[a.jsx(Fd,{}),a.jsx($d,{}),L.map(E=>a.jsx(Bd,{id:E.id,title:E.id,children:a.jsx(Sr,{activeTab:E.id,state:e,actions:e,onSwitchTab:D=>e.togglePanel(D,!0)})},E.id)),x&&!w&&a.jsxs("div",{className:"w-full bg-[#080808] border-b border-white/10 p-8 pb-12 flex flex-col items-center text-center gap-3",children:[a.jsx("div",{className:"w-12 h-1 bg-gray-800 rounded-full mb-2"}),C?a.jsxs(a.Fragment,{children:[a.jsxs("div",{className:"flex items-center gap-2 text-amber-500 mb-1",children:[a.jsx(qt,{}),a.jsx("span",{className:"text-xs font-bold",children:"Lite Render Mode"})]}),a.jsxs("p",{className:"text-[10px] text-gray-400 leading-relaxed max-w-[320px]",children:["Running lightweight engine.",a.jsx("br",{})]})]}):a.jsx(a.Fragment,{children:a.jsx("div",{className:"flex items-center gap-2 text-cyan-500 mb-1",children:a.jsx("span",{className:"text-xs font-bold",children:"High Quality Mode"})})}),a.jsx("button",{onClick:R,className:"mt-2 px-3 py-1.5 text-[9px] font-bold rounded border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10",children:C?"Switch to High Quality":"Switch to Lite Mode"})]}),a.jsxs("div",{ref:l,className:`relative bg-black select-none ${S?"cursor-crosshair":""} flex flex-col ${x&&!w?"h-[100vh] sticky top-0 overflow-hidden shadow-2xl":"w-full h-full"}`,onContextMenu:E=>E.preventDefault(),children:[a.jsx(Rc,{isReady:n,onFinished:I,startupMode:g,bootEngine:v}),x&&b&&!o&&!w&&a.jsxs("div",{className:"fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-10 text-center text-white",children:[a.jsx("div",{className:"text-cyan-400 mb-6 animate-bounce",children:a.jsx(fi,{})}),a.jsx("h2",{className:"text-2xl font-bold tracking-tight mb-2",children:"Landscape Recommended"}),a.jsx("p",{className:"text-gray-500 text-sm font-mono",children:"Rotate device to access controls."})]}),!w&&a.jsx(Mc,{}),a.jsxs("div",{className:"flex-1 flex overflow-hidden relative",children:[e.workshopOpen?a.jsx(M.Suspense,{fallback:null,children:a.jsx(Ud,{onClose:e.closeWorkshop,editFormula:e.workshopEditFormula})}):!w&&!x&&a.jsx(Ro,{side:"left"}),a.jsx(bd,{hudRefs:u,onSceneReady:()=>t(!0)}),!w&&a.jsx(Ro,{side:"right"})]}),!w&&a.jsx(Cc,{}),!w&&a.jsx(_d,{}),e.contextMenu.visible&&!w&&a.jsx(wr,{x:e.contextMenu.x,y:e.contextMenu.y,items:e.contextMenu.items,targetHelpIds:e.contextMenu.targetHelpIds,onClose:e.closeContextMenu,onOpenHelp:e.openHelp}),e.helpWindow.visible&&a.jsx(M.Suspense,{fallback:null,children:a.jsx(Gd,{activeTopicId:e.helpWindow.activeTopicId,onClose:e.closeHelp,onNavigate:e.openHelp})}),!s&&!k&&!w&&a.jsx("div",{className:"fixed bottom-4 left-4 z-50 flex gap-2 transition-all duration-500",children:a.jsx("button",{onClick:()=>r(!0),onContextMenu:j,className:"p-2 rounded-full border shadow-lg transition-all bg-gray-800 border-gray-600 text-gray-400 hover:text-white",title:"Open Timeline (T)",children:a.jsx(pi,{})})}),s&&!w&&a.jsx(M.Suspense,{fallback:null,children:a.jsx(Hd,{onClose:()=>r(!1)})})]})]})},Ta=({label:e,active:n,variant:t="primary",size:o="default",icon:i,fullWidth:s,className:r,children:l,onClick:c,...d})=>{const f=z(g=>g.openContextMenu),h=g=>{const v=Xe(g.currentTarget);v.length>0&&(g.preventDefault(),g.stopPropagation(),f(g.clientX,g.clientY,[],v))};let p="bg-cyan-900 text-cyan-200 border-cyan-700 shadow-inner";t==="danger"&&(p="bg-red-900 text-red-200 border-red-700 shadow-inner"),t==="success"&&(p="bg-green-900 text-green-200 border-green-700 shadow-inner"),t==="warning"&&(p="bg-amber-900 text-amber-200 border-amber-700 shadow-inner");const u=o==="small"?"t-btn-sm":"t-btn";return a.jsxs("button",{className:`${u} ${n?p:"t-btn-default"} ${s?"w-full":"flex-1"} ${r||""}`,onClick:c,onContextMenu:h,...d,children:[i,e||l]})},qd=({label:e,icon:n,rightContent:t,className:o=""})=>a.jsxs("div",{className:`flex items-center justify-between px-3 py-2 bg-black/40 border-b border-white/5 ${o}`,children:[a.jsxs("div",{className:"flex items-center gap-2",children:[n,a.jsx("span",{className:"text-[10px] font-bold text-gray-300",children:e})]}),t&&a.jsx("div",{className:"flex items-center gap-2",children:t})]}),Ka=xe(),Vd=({className:e="-m-3"})=>{const{drawing:n,setDrawing:t,removeDrawnShape:o,clearDrawnShapes:i,updateDrawnShape:s}=z(),{active:r,activeTool:l,originMode:c,color:d,showLabels:f,showAxes:h,shapes:p,refreshTrigger:u}=n,[g,v]=M.useState(Ka.lastMeasuredDistance);M.useEffect(()=>{let x;return r&&c===1&&(x=window.setInterval(()=>{const m=Ka.lastMeasuredDistance;Math.abs(m-g)>1e-4&&v(m)},200)),()=>clearInterval(x)},[r,c,g]);const y=()=>{t({active:!r})},b=()=>{t({refreshTrigger:(u||0)+1}),v(Ka.lastMeasuredDistance)};return a.jsxs("div",{className:`flex flex-col h-full select-none ${e}`,"data-help-id":"panel.drawing",children:[a.jsxs("div",{className:"p-3 bg-black/40 border-b border-white/5",children:[a.jsx(qd,{label:"Measurement Tools",icon:a.jsx("span",{className:"w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_5px_cyan]"})}),a.jsx("div",{className:"flex gap-2 mb-2",children:a.jsx(Ta,{onClick:y,active:r,variant:r?"success":"primary",className:"flex-1 py-3 text-xs shadow-lg",icon:r?a.jsx(Rt,{}):a.jsx(Oo,{}),children:r?"DRAWING ACTIVE":"START DRAWING"})}),a.jsxs("div",{className:"flex bg-gray-800/50 rounded p-1 mb-3",children:[a.jsxs("button",{onClick:()=>t({activeTool:"rect"}),className:`flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-[9px] font-bold transition-colors ${l==="rect"?"bg-cyan-900 text-cyan-200 shadow-sm":"text-gray-500 hover:text-white"}`,title:"Rectangle",children:[a.jsx(mi,{})," RECT"]}),a.jsxs("button",{onClick:()=>t({activeTool:"circle"}),className:`flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-[9px] font-bold transition-colors ${l==="circle"?"bg-cyan-900 text-cyan-200 shadow-sm":"text-gray-500 hover:text-white"}`,title:"Circle / Ellipse",children:[a.jsx(gi,{})," CIRCLE"]})]}),a.jsxs("div",{className:"flex items-center justify-between mb-1",children:[a.jsx(ze,{variant:"secondary",children:"Default Color"}),a.jsx(Ra,{color:"#"+d.getHexString(),onChange:x=>t({color:new qe(x)}),label:""})]}),r&&a.jsxs("div",{className:"mt-2 px-2 py-1.5 bg-cyan-900/20 border border-cyan-500/20 rounded flex flex-col items-center gap-1 text-[9px] text-cyan-200 animate-fade-in text-center font-mono",children:[a.jsxs("div",{children:["Hold ",a.jsx("strong",{children:"X"})," to snap to World Axis"]}),a.jsxs("div",{children:["Hold ",a.jsx("strong",{children:"SHIFT"})," for 1:1 Ratio"]}),a.jsxs("div",{children:["Hold ",a.jsx("strong",{children:"ALT"})," for Center Draw"]}),a.jsxs("div",{children:["Hold ",a.jsx("strong",{children:"SPACE"})," to Move"]})]})]}),a.jsxs("div",{className:"p-3 border-b border-white/5 space-y-3 bg-white/[0.02]",children:[a.jsxs("div",{className:"space-y-1",children:[a.jsx(ze,{variant:"secondary",children:"Drawing Plane Origin"}),a.jsx(Ve,{value:c,onChange:x=>t({originMode:x}),options:[{label:"Global Zero",value:0},{label:"Surface Probe",value:1}]}),c===1&&a.jsxs("div",{className:"flex items-center justify-between bg-black/40 rounded border border-white/10 p-1.5 mt-1 animate-fade-in",children:[a.jsxs("span",{className:"text-[9px] text-gray-400 font-mono pl-1",children:["Depth: ",a.jsx("span",{className:"text-cyan-400 font-bold",children:g.toFixed(4)})]}),a.jsx("button",{onClick:b,className:"px-2 py-0.5 bg-gray-800 hover:bg-white/10 text-gray-300 text-[9px] font-bold rounded border border-white/5 hover:border-white/20 transition-all",title:"Update axis position to current probe location",children:"Refresh Axis"})]})]}),a.jsxs("div",{className:"grid grid-cols-2 gap-2 pt-1",children:[a.jsxs("label",{className:"flex items-center gap-2 cursor-pointer group",children:[a.jsx("div",{className:`w-3 h-3 border rounded transition-colors ${f?"bg-cyan-500 border-cyan-500":"border-gray-600 bg-transparent"}`}),a.jsx("input",{type:"checkbox",className:"hidden",checked:f,onChange:x=>t({showLabels:x.target.checked})}),a.jsx("span",{className:"text-[10px] font-bold text-gray-400 group-hover:text-white transition-colors",children:"Show Labels"})]}),a.jsxs("label",{className:"flex items-center gap-2 cursor-pointer group",children:[a.jsx("div",{className:`w-3 h-3 border rounded transition-colors ${h?"bg-cyan-500 border-cyan-500":"border-gray-600 bg-transparent"}`}),a.jsx("input",{type:"checkbox",className:"hidden",checked:h,onChange:x=>t({showAxes:x.target.checked})}),a.jsx("span",{className:"text-[10px] font-bold text-gray-400 group-hover:text-white transition-colors",children:"Show Axes"})]})]})]}),a.jsx("div",{className:"flex-1 overflow-y-auto custom-scroll p-3 bg-black/20",children:a.jsx(Dt,{label:"Measurement List",count:(p||[]).length,defaultOpen:!0,rightContent:(p||[]).length>0?a.jsx("button",{onClick:()=>i(),className:"text-[9px] text-red-500 hover:text-red-300 font-bold transition-colors px-2 py-0.5",children:"Clear"}):void 0,children:(p||[]).length===0?a.jsx("div",{className:"text-center py-4 text-[10px] text-gray-600 italic",children:"No measurements drawn."}):a.jsx("div",{className:"space-y-1 animate-fade-in",children:(p||[]).map((x,m)=>{var k;const C=x.type==="rect"&&(x.size.z||0)>.001;return a.jsxs("div",{className:"flex flex-col bg-white/5 rounded border border-white/5 hover:border-cyan-500/30 transition-colors group",children:[a.jsxs("div",{className:"flex items-center justify-between p-2",children:[a.jsxs("div",{className:"flex items-center gap-3",children:[a.jsx("div",{className:"transform scale-75 origin-left",children:a.jsx(Ra,{color:x.color,onChange:w=>s({id:x.id,updates:{color:w}}),label:""})}),a.jsxs("div",{className:"flex flex-col",children:[a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsxs("span",{className:"text-[10px] text-gray-300 font-mono font-bold",children:["#",m+1]}),a.jsx("span",{className:"text-[8px] text-gray-500 font-bold bg-black/40 px-1 rounded",children:C?"CUBE":x.type})]}),a.jsxs("span",{className:"text-[9px] text-gray-500 font-mono",children:[x.size.x.toFixed(4)," x ",x.size.y.toFixed(4)," ",C?`x ${(k=x.size.z)==null?void 0:k.toFixed(4)}`:""]})]})]}),a.jsxs("div",{className:"flex items-center gap-1",children:[x.type==="rect"&&a.jsx("button",{onClick:()=>{const S=(x.size.z||0)>0?0:Math.min(x.size.x,x.size.y);s({id:x.id,updates:{size:{...x.size,z:S}}})},className:`p-1.5 rounded transition-colors ${C?"text-cyan-300 bg-cyan-900/40":"text-gray-600 hover:text-cyan-400 hover:bg-white/5"}`,title:C?"Convert to Rect":"Extrude to Cube",children:a.jsx(Na,{})}),a.jsx("button",{onClick:()=>o(x.id),className:"text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1",title:"Delete",children:a.jsx(zt,{})})]})]}),C&&a.jsxs("div",{className:"px-2 pb-2 pt-0 space-y-1 animate-slider-entry bg-black/20 mt-1 rounded border border-white/5 mx-1",children:[a.jsx(fe,{label:"Depth",value:x.size.z||0,onChange:w=>s({id:x.id,updates:{size:{...x.size,z:Math.max(.001,w)}}}),step:.01,min:.001,max:5,highlight:!0}),a.jsx(fe,{label:"Offset",value:x.zOffset||0,onChange:w=>s({id:x.id,updates:{zOffset:w}}),step:.01,min:-2,max:2})]})]},x.id)})})})})]})},Yd=({x:e,y:n,categories:t,getItems:o,onSelect:i,onClose:s,categoryWidth:r=128,itemWidth:l=192,anchorRight:c})=>{const[d,f]=M.useState(null),h=M.useRef(null),[p,u]=M.useState({x:e,y:n,maxHeight:300,opacity:0,flip:!1});M.useLayoutEffect(()=>{const v=window.innerWidth,y=window.innerHeight,b=8,x=r+l+2,m=350,C=e+x>v-b;let k;C?k=Math.max(b,(c??e)-x):k=e,k+x>v-b&&(k=Math.max(b,v-x-b));const w=y-n-b,S=n-b;let j,R;w>=Math.min(m,200)?(j=n,R=Math.min(m,Math.max(150,w))):S>w?(R=Math.min(m,S),j=n-R):(j=n,R=Math.min(m,Math.max(150,w))),j<b&&(j=b,R=Math.min(R,y-b*2)),u({x:k,y:j,maxHeight:R,opacity:1,flip:C})},[e,n,r,l,c]),M.useEffect(()=>{const v=y=>{h.current&&!h.current.contains(y.target)&&s()};return window.addEventListener("mousedown",v,!0),()=>window.removeEventListener("mousedown",v,!0)},[s]);const g=d?o(d):[];return Vt.createPortal(a.jsxs("div",{ref:h,className:"fixed z-[9999] flex text-xs font-mono",style:{left:p.x,top:p.y,opacity:p.opacity,transition:"opacity 0.05s ease-out",flexDirection:p.flip?"row-reverse":"row"},children:[a.jsx("div",{className:`bg-[#1a1a1a] border border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col py-1 overflow-y-auto custom-scroll whitespace-nowrap ${p.flip?"rounded-r -ml-px":"rounded-l"}`,style:{minWidth:r,maxHeight:p.maxHeight},children:t.map(v=>a.jsxs("div",{onMouseEnter:()=>f(v.id),className:`px-3 py-1.5 cursor-pointer flex justify-between items-center transition-colors ${d===v.id?"bg-cyan-900/60 text-white":"text-gray-400 hover:text-white hover:bg-white/5"}`,children:[a.jsx("span",{className:`truncate ${v.highlight?"font-bold text-cyan-300":""}`,children:v.name}),p.flip?a.jsx("span",{className:"text-gray-600",children:"‹"}):a.jsx(Sa,{})]},v.id))}),d&&a.jsxs("div",{className:`bg-[#222] border-y border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-y-auto custom-scroll py-1 ${p.flip?"border-l rounded-l animate-fade-in-right":"border-r rounded-r -ml-px animate-fade-in-left"}`,style:{width:l,maxHeight:p.maxHeight},children:[g.length===0&&a.jsx("div",{className:"px-3 py-2 text-gray-500 text-xs italic",children:"No items"}),g.map(v=>a.jsxs("button",{onClick:v.disabled?void 0:()=>{i(v.key),s()},className:`w-full px-3 py-1.5 text-left transition-colors truncate ${v.disabled?"text-gray-600 cursor-not-allowed":v.selected?"text-cyan-400 hover:bg-cyan-600 hover:text-white":"text-gray-300 hover:bg-cyan-600 hover:text-white"}`,title:v.description||v.label,children:[v.label,v.disabled&&v.disabledSuffix?` ${v.disabledSuffix}`:""]},v.key))]})]}),document.body)},Xd=new Set(["audio","navigation","drawing","webcam","debugTools","engineSettings","quality","reflections"]),Io=["coreMath","geometry","materials","coloring","atmosphere","lighting","optics"],Zd=new Set(["repeats","phase","scale","offset","bias","repeats2","phase2","scale2","offset2","bias2","levelsMin","levelsMax","levelsGamma","saturation","juliaX","juliaY","juliaZ","preRotX","preRotY","preRotZ","hybridFoldLimit"]),Qd=e=>{if(e==="lighting"){const n=[];for(let t=0;t<ke;t++)n.push({label:`Light ${t+1} Intensity`,key:`light${t}_intensity`}),n.push({label:`Light ${t+1} Pos X`,key:`light${t}_posX`}),n.push({label:`Light ${t+1} Pos Y`,key:`light${t}_posY`}),n.push({label:`Light ${t+1} Pos Z`,key:`light${t}_posZ`});return n}return[]};function Kd(){return[...ne.getAll().filter(n=>!Xd.has(n.id)&&(Object.values(n.params).some(t=>t.type==="float"||t.type==="int")||n.id==="lighting")).sort((n,t)=>{const o=Io.indexOf(n.id),i=Io.indexOf(t.id);return o!==-1&&i!==-1?o-i:o!==-1?-1:i!==-1?1:n.name.localeCompare(t.name)}).map(n=>({id:n.id,name:n.name,highlight:n.id==="coreMath"})),{id:"camera",name:"Camera"}]}function Jd(e,n){var l;if(e==="camera")return[{key:"camera.unified.x",label:"Camera Pos X"},{key:"camera.unified.y",label:"Camera Pos Y"},{key:"camera.unified.z",label:"Camera Pos Z"},{key:"camera.rotation.x",label:"Rotation X"},{key:"camera.rotation.y",label:"Rotation Y"},{key:"camera.rotation.z",label:"Rotation Z"}];const t=ne.get(e);if(!t)return[];const o=Qd(e),i=[],s=e==="coreMath"&&n?we.get(n):null,r=((l=s==null?void 0:s.parameters)==null?void 0:l.map(c=>c==null?void 0:c.id).filter(c=>!!c))||[];return Object.entries(t.params).forEach(([c,d])=>{if(d.onUpdate!=="compile"&&!(d.hidden&&!Zd.has(c))&&!(e==="coreMath"&&r.length>0&&!r.includes(c))){if(d.type==="vec2"||d.type==="vec3"){(d.type==="vec2"?["x","y"]:["x","y","z"]).forEach(h=>{let p=`${d.label} ${h.toUpperCase()}`;if(e==="coreMath"&&s){const u=s.parameters.find(g=>(g==null?void 0:g.id)===c);u&&(p=`${c.replace("vec","V-")}: ${u.label} ${h.toUpperCase()}`)}i.push({key:`${e}.${c}_${h}`,label:p,description:`${d.description||d.label} - ${h.toUpperCase()} component`})});return}if(d.type==="float"||d.type==="int"){let f=d.label;if(e==="coreMath"&&s){const h=s.parameters.find(p=>(p==null?void 0:p.id)===c);h?f=`${c.replace("param","P-")}: ${h.label}`:c.startsWith("param")&&(f=`(${d.label})`)}i.push({key:`${e}.${c}`,label:f,description:d.description})}}}),[...o.map(c=>({key:`${e}.${c.key}`,label:c.label})),...i]}const Mr=({value:e,onChange:n,className:t})=>{var u,g,v;const[o,i]=M.useState(!1),s=M.useRef(null),[r,l]=M.useState({x:0,y:0,right:0}),c=z(y=>y.formula),d=()=>{if(s.current){const y=s.current.getBoundingClientRect();l({x:y.left,y:y.bottom+4,right:y.right}),i(!0)}};let f=e;if(e.includes(".")){const[y,b]=e.split(".");if(y==="lighting"&&b.startsWith("light")){const x=parseInt(((u=b.match(/\d+/))==null?void 0:u[0])||"0"),m=b.includes("intensity")?"Intensity":b.includes("pos")?"Pos":"Param";f=`Light ${x+1} ${m}`}else if(y==="camera")b.includes("unified")?f=`Camera Pos ${(g=b.split(".").pop())==null?void 0:g.toUpperCase()}`:b.includes("rotation")?f=`Camera Rot ${(v=b.split(".").pop())==null?void 0:v.toUpperCase()}`:f="Camera Param";else{const x=ne.get(y);if(x){const m=x.params[b];if(m)if(y==="coreMath"&&c){const C=we.get(c),k=C==null?void 0:C.parameters.find(w=>(w==null?void 0:w.id)===b);k?f=`${b.replace("param","P-")}: ${k.label}`:f=m.label}else f=`${x.name}: ${m.label}`;else f=`${x.name}: ${b}`}}}const h=Kd(),p=y=>Jd(y,c);return a.jsxs(a.Fragment,{children:[a.jsx("button",{ref:s,onClick:d,className:`text-left px-2 py-1 bg-black/40 border border-white/10 rounded text-[10px] text-cyan-400 hover:bg-white/5 truncate ${t}`,title:f,children:f}),o&&a.jsx(Yd,{x:r.x,y:r.y,anchorRight:r.right,categories:h,getItems:p,onSelect:n,onClose:()=>i(!1)})]})},eu=()=>{const e=z(),{modulation:n,removeModulation:t,addModulation:o,openContextMenu:i}=e,s=(p,u)=>{e.updateModulation({id:p,update:u})},r=n.selectedRuleId,l=n.rules.find(p=>p.id===r),c=()=>{o({target:"coreMath.paramA",source:"audio"})},d=p=>{const u=Xe(p.currentTarget);u.length>0&&(p.preventDefault(),p.stopPropagation(),i(p.clientX,p.clientY,[],u))};if(!l)return a.jsxs("div",{className:"flex flex-col items-center justify-center py-6 text-gray-500 gap-3 border-t border-white/5",children:[a.jsx("span",{className:"text-xs italic",children:"Select a box to edit params"}),a.jsx("button",{onClick:c,className:"px-4 py-2 bg-cyan-900/50 border border-cyan-500/30 rounded text-xs font-bold text-cyan-300 hover:bg-cyan-900 transition-colors",children:"+ Add New Link"})]});const f=l.source==="audio",h=(p,u)=>{s(l.id,{freqStart:p,freqEnd:u})};return a.jsxs("div",{className:"flex flex-col gap-3 border-t border-white/5 pt-3 animate-fade-in-up","data-help-id":"audio.links",onContextMenu:d,children:[a.jsxs("div",{className:"flex justify-between items-center bg-white/5 p-2 rounded border border-white/5",children:[a.jsxs("div",{className:"flex-1 mr-2",children:[a.jsx("label",{className:"text-[9px] text-gray-500 font-bold block mb-1",children:"Target Parameter"}),a.jsx(Mr,{value:l.target,onChange:p=>s(l.id,{target:p}),className:"w-full"})]}),a.jsx("div",{className:"flex flex-col items-end gap-1",children:a.jsx("button",{onClick:()=>t(l.id),className:"p-2 text-red-500 hover:text-red-300 hover:bg-red-900/20 rounded border border-transparent hover:border-red-900/50 transition-colors",title:"Remove Rule",children:a.jsx(zt,{})})})]}),a.jsxs("div",{className:"flex gap-2 items-center",children:[a.jsx("label",{className:"text-[9px] text-gray-500 font-bold",children:"Source:"}),a.jsxs("select",{value:l.source,onChange:p=>s(l.id,{source:p.target.value}),className:"t-select text-cyan-300",children:[a.jsx("option",{value:"audio",children:"Audio Spectrum"}),a.jsx("option",{value:"lfo-1",children:"LFO 1"}),a.jsx("option",{value:"lfo-2",children:"LFO 2"}),a.jsx("option",{value:"lfo-3",children:"LFO 3"})]})]}),f&&a.jsxs("div",{children:[a.jsx("label",{className:"text-[9px] text-gray-500 font-bold block mb-1",children:"Quick Frequency Bands"}),a.jsxs("div",{className:"flex gap-1",children:[a.jsx("button",{onClick:()=>h(0,.1),className:"flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] font-bold text-gray-400 rounded border border-white/5",children:"Bass"}),a.jsx("button",{onClick:()=>h(.1,.5),className:"flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] font-bold text-gray-400 rounded border border-white/5",children:"Mids"}),a.jsx("button",{onClick:()=>h(.5,1),className:"flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] font-bold text-gray-400 rounded border border-white/5",children:"Treble"}),a.jsx("button",{onClick:()=>h(0,1),className:"flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] font-bold text-gray-400 rounded border border-white/5",children:"Full"})]})]}),a.jsxs("div",{className:"bg-black/30 rounded border border-white/10 p-3",children:[a.jsxs("div",{className:"grid grid-cols-5 gap-1",children:[a.jsx("div",{className:"flex flex-col items-center",children:a.jsx(Ht,{label:"Attack",value:l.attack,min:.01,max:.99,onChange:p=>s(l.id,{attack:p}),size:40,color:"#fbbf24"})}),a.jsx("div",{className:"flex flex-col items-center",children:a.jsx(Ht,{label:"Decay",value:l.decay,min:.01,max:.99,onChange:p=>s(l.id,{decay:p}),size:40,color:"#fbbf24"})}),a.jsx("div",{className:"flex flex-col items-center",children:a.jsx(Ht,{label:"Smooth",value:l.smoothing??0,min:0,max:.99,onChange:p=>s(l.id,{smoothing:p}),size:40,color:"#a855f7"})}),a.jsx("div",{className:"flex flex-col items-center",children:a.jsx(Ht,{label:"Gain",value:l.gain,min:0,max:10,onChange:p=>s(l.id,{gain:p}),size:40,color:"#22d3ee",unconstrained:!0})}),a.jsx("div",{className:"flex flex-col items-center",children:a.jsx(Ht,{label:"Offset",value:l.offset,min:-5,max:5,onChange:p=>s(l.id,{offset:p}),size:40,color:"#22d3ee",unconstrained:!0})})]}),a.jsxs("div",{className:"grid grid-cols-5 text-[8px] text-gray-500 text-center mt-1 font-bold",children:[a.jsx("div",{children:"Rise"}),a.jsx("div",{children:"Fall"}),a.jsx("div",{children:"Lerp"}),a.jsx("div",{children:"Mult"}),a.jsx("div",{children:"Add"})]})]}),f&&a.jsxs("div",{className:"flex justify-between text-[9px] text-gray-600 px-1",children:[a.jsxs("span",{children:["Freq: ",Math.round(l.freqStart*100),"% - ",Math.round(l.freqEnd*100),"%"]}),a.jsxs("span",{children:["Threshold: ",Math.round(l.thresholdMin*100),"% - ",Math.round(l.thresholdMax*100),"%"]})]})]})},Po=({stops:e})=>{const n=M.useMemo(()=>e?sn(e):"linear-gradient(to right, #000, #fff)",[e]);return a.jsx("div",{className:"flex-1 h-2.5 rounded-sm overflow-hidden opacity-80",style:{backgroundImage:n,backgroundSize:"100% 100%"}})},tu=({state:e,actions:n})=>{const t=e.coloring,o=e.texturing,i=n.setTexturing,s=z(u=>u.setHistogramLayer),[r,l]=M.useState("layer1"),[c,d]=M.useState(()=>((t==null?void 0:t.layer3Strength)??0)>0),f=r==="layer1",h=r==="layer2";M.useEffect(()=>{s(h?1:0)},[h,s]);const p=((t==null?void 0:t.blendOpacity)??0)>0;return t?a.jsxs("div",{className:"animate-fade-in -mx-4 -mt-4 flex flex-col","data-help-id":"panel.gradient",children:[a.jsxs("div",{className:"flex flex-col",children:[a.jsxs("div",{className:`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${f?"bg-neutral-800":"bg-neutral-800/50 hover:bg-white/5"}`,onClick:()=>l("layer1"),children:[a.jsx("span",{className:"text-[10px] font-bold text-gray-300",children:"Layer 1"}),a.jsx(Po,{stops:t.gradient}),a.jsx("svg",{className:`w-3 h-3 text-gray-500 transition-transform ${f?"rotate-180":""}`,viewBox:"0 0 20 20",fill:"currentColor",children:a.jsx("path",{fillRule:"evenodd",d:"M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z",clipRule:"evenodd"})})]}),f&&a.jsxs("div",{className:"flex flex-col animate-fade-in",children:[o&&a.jsx(Ve,{value:o.active,onChange:u=>i({active:u}),options:[{label:"Gradient",value:!1},{label:"Image Texture",value:!0}]}),o&&!o.active?a.jsxs("div",{className:"flex flex-col",children:[a.jsx("div",{"data-help-id":"grad.mapping",children:a.jsx(se,{featureId:"coloring",groupFilter:"layer1_top"})}),a.jsx(se,{featureId:"coloring",groupFilter:"layer1_grad"}),a.jsx(se,{featureId:"coloring",groupFilter:"layer1_hist"}),a.jsx("div",{"data-help-id":"grad.escape",children:a.jsx(se,{featureId:"coloring",groupFilter:"layer1_bottom"})})]}):o!=null&&o.active?a.jsxs("div",{className:"flex flex-col","data-help-id":"grad.texture",children:[a.jsx(se,{featureId:"texturing",groupFilter:"main"}),a.jsx(se,{featureId:"texturing",groupFilter:"mapping"}),a.jsx(se,{featureId:"texturing",groupFilter:"transform"}),a.jsx(se,{featureId:"coloring",groupFilter:"layer1_bottom",excludeParams:["twist"]})]}):null]})]}),a.jsx(et,{}),a.jsxs("div",{className:"flex flex-col",children:[a.jsxs("div",{className:`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${h?"bg-neutral-800":"bg-neutral-800/50 hover:bg-white/5"}`,onClick:()=>l(h?"layer1":"layer2"),children:[a.jsx("span",{className:`text-[10px] font-bold ${p?"text-gray-300":"text-gray-600"}`,children:"Layer 2"}),!h&&!p&&a.jsx("span",{className:"text-[8px] text-gray-600",children:"off"}),a.jsx(Po,{stops:t.gradient2}),a.jsx("svg",{className:`w-3 h-3 text-gray-500 transition-transform ${h?"rotate-180":""}`,viewBox:"0 0 20 20",fill:"currentColor",children:a.jsx("path",{fillRule:"evenodd",d:"M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z",clipRule:"evenodd"})})]}),h&&a.jsxs("div",{className:"flex flex-col animate-fade-in","data-help-id":"grad.layer2",children:[a.jsx(se,{featureId:"coloring",groupFilter:"layer2_top"}),a.jsx(se,{featureId:"coloring",groupFilter:"layer2_grad"}),a.jsx(se,{featureId:"coloring",groupFilter:"layer2_hist"}),(t.mode2===6||t.mode2===8)&&a.jsx(se,{featureId:"coloring",whitelistParams:["escape"]}),a.jsx(se,{featureId:"coloring",groupFilter:"layer2_bottom"})]})]}),a.jsx(et,{}),a.jsxs("div",{className:"flex flex-col",children:[a.jsxs("div",{className:`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${c?"bg-neutral-800":"bg-neutral-800/50 hover:bg-white/5"}`,onClick:()=>d(!c),children:[a.jsx("span",{className:`text-[10px] font-bold ${(t.layer3Strength??0)>0?"text-gray-300":"text-gray-600"}`,children:"Noise"}),!c&&(t.layer3Strength??0)===0&&a.jsx("span",{className:"text-[8px] text-gray-600",children:"off"}),a.jsx("div",{className:"flex-1"}),a.jsx("svg",{className:`w-3 h-3 text-gray-500 transition-transform ${c?"rotate-180":""}`,viewBox:"0 0 20 20",fill:"currentColor",children:a.jsx("path",{fillRule:"evenodd",d:"M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z",clipRule:"evenodd"})})]}),c&&a.jsx("div",{className:"flex flex-col animate-fade-in","data-help-id":"grad.noise",children:a.jsx(se,{featureId:"coloring",groupFilter:"noise"})})]})]}):null},To=["TAB","CTRL","ALT","SHIFT","SPACE","LMB","MMB","RMB","SCROLL UP","SCROLL DOWN","Z","Y","H","T","1","2","3","4","5","6"],Eo={Q:{x:0,y:0,label:"Q ↶"},W:{x:1,y:0,label:"W ▲"},E:{x:2,y:0,label:"E ↷"},A:{x:0,y:1,label:"A ◀"},S:{x:1,y:1,label:"S ▼"},D:{x:2,y:1,label:"D ▶"},C:{x:1,y:2,label:"C ⬇"}},au={KeyW:"W",KeyA:"A",KeyS:"S",KeyD:"D",KeyQ:"Q",KeyE:"E",KeyC:"C",Space:"SPACE",ShiftLeft:"SHIFT",ShiftRight:"SHIFT",ControlLeft:"CTRL",ControlRight:"CTRL",AltLeft:"ALT",AltRight:"ALT",Tab:"TAB",KeyZ:"Z",KeyY:"Y",KeyH:"H",KeyT:"T",Digit1:"1",Digit2:"2",Digit3:"3",Digit4:"4",Digit5:"5",Digit6:"6"},nu={0:"LMB",1:"MMB",2:"RMB"},ou=()=>a.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[a.jsx("circle",{cx:"12",cy:"12",r:"3"}),a.jsx("path",{d:"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"})]}),ru=["normal","screen","overlay","lighten","difference"],iu=({sliceState:e,actions:n})=>{const o=66.66666666666667,i=.7,{isEnabled:s,opacity:r,posX:l,posY:c,width:d,height:f,cropL:h,cropR:p,cropT:u,cropB:g,blendMode:v,crtMode:y,tilt:b,fontSize:x}=e,m=n.setWebcam,C=M.useRef(null),k=M.useRef(null),[w,S]=M.useState(!1),[j,R]=M.useState(null),I=M.useRef(0),N=M.useRef(null),L=M.useRef(new Set),E=M.useRef(new Map),D=M.useRef(null),[A,T]=M.useState(!1);M.useEffect(()=>{if(!s){C.current&&C.current.srcObject&&C.current.srcObject.getTracks().forEach(ee=>ee.stop());return}R(null);const P=document.createElement("video");P.autoplay=!0,P.muted=!0,P.playsInline=!0,C.current=P,(async()=>{try{const X=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480,frameRate:{ideal:24}}});C.current&&(C.current.srcObject=X,C.current.play().catch(ee=>{console.error("Webcam play error",ee),R("Video blocked. Check browser privacy settings.")}))}catch(X){console.error("Webcam access denied:",X),X instanceof DOMException&&(X.name==="NotAllowedError"||X.name==="PermissionDeniedError")?R("Camera Blocked: Check browser permissions or HTTPS."):X instanceof DOMException&&X.name==="NotFoundError"?R("No camera found."):R("Camera Error: "+(X instanceof Error?X.message:String(X)))}})();const F=X=>{const ee=au[X.code];ee&&(X.type==="keydown"?L.current.add(ee):L.current.delete(ee))},q=X=>{const ee=nu[X.button];ee&&(X.type==="mousedown"?L.current.add(ee):L.current.delete(ee))},Z=X=>{const ee=X.deltaY<0?"SCROLL UP":"SCROLL DOWN";E.current.set(ee,1)};return window.addEventListener("keydown",F),window.addEventListener("keyup",F),window.addEventListener("mousedown",q),window.addEventListener("mouseup",q),window.addEventListener("wheel",Z,{passive:!0}),()=>{C.current&&C.current.srcObject&&C.current.srcObject.getTracks().forEach(ee=>ee.stop()),window.removeEventListener("keydown",F),window.removeEventListener("keyup",F),window.removeEventListener("mousedown",q),window.removeEventListener("mouseup",q),window.removeEventListener("wheel",Z)}},[s]);const G=M.useCallback(P=>{const $=(P-(I.current||P))/1e3;if([...To,...Object.keys(Eo)].forEach(F=>{let q=E.current.get(F)||0;L.current.has(F)?q=1:q-=$/i,q=Math.max(0,Math.min(1,q)),E.current.set(F,q)}),P-I.current>o){const F=k.current,q=C.current;if(F){const Z=F.getContext("2d",{alpha:!1});if(Z){if(I.current=P,(F.width!==d||F.height!==f)&&(F.width=d,F.height=f),Z.fillStyle="#000000",Z.fillRect(0,0,d,f),!j&&q&&q.readyState===q.HAVE_ENOUGH_DATA){const X=q.videoWidth,ee=q.videoHeight,te=X*h,re=ee*u,oe=X*(1-h-p),me=ee*(1-u-g);oe>0&&me>0&&(Z.save(),Z.translate(d,0),Z.scale(-1,1),Z.drawImage(q,te,re,oe,me,0,0,d,f),Z.restore())}else j&&(Z.fillStyle="#330000",Z.fillRect(0,0,d,f),Z.fillStyle="#ff5555",Z.font=`bold ${Math.max(10,x)}px monospace`,Z.textAlign="center",Z.textBaseline="middle",j.split(" "),Z.fillText(j,d/2,f/2));H(Z,d,f),W(Z)}}}N.current=requestAnimationFrame(G)},[h,p,u,g,d,f,x,s,j]);M.useEffect(()=>{if(s)return N.current=requestAnimationFrame(G),()=>{N.current&&cancelAnimationFrame(N.current)}},[G,s]);const H=(P,$,F)=>{P.font=`bold ${x}px monospace`,P.textAlign="left",P.textBaseline="bottom";let q=10;const Z=F-10,X=x*1.6+4;To.forEach(ee=>{const te=E.current.get(ee)||0;if(te<=.01)return;const re=P.measureText(ee),oe=x,me=re.width+oe;q+me>$||(P.fillStyle=`rgba(0, 0, 0, ${.8*te})`,P.fillRect(q,Z-X,me,X),P.fillStyle=`rgba(255, 255, 255, ${te})`,P.fillText(ee,q+oe/2,Z-X*.25),q+=me+4)})},W=P=>{const $=x*2.8,F=3,q=10,Z=10;P.font=`bold ${x}px monospace`,P.textAlign="center",P.textBaseline="middle",Object.entries(Eo).forEach(([X,ee])=>{const te=E.current.get(X)||0;if(te<=.01)return;const re=q+ee.x*($+F),oe=Z+ee.y*($+F);P.fillStyle=`rgba(0, 0, 0, ${.8*te})`,P.fillRect(re,oe,$,$),P.fillStyle=`rgba(255, 255, 255, ${te})`,P.fillText(ee.label,re+$/2,oe+$/2+1)})},B=(P,$)=>{P.preventDefault(),P.stopPropagation(),D.current={type:$,startX:P.clientX,startY:P.clientY,startPos:{x:l,y:c},startSize:{w:d,h:f},startCrop:{l:h,r:p,t:u,b:g}},window.addEventListener("mousemove",_),window.addEventListener("mouseup",U)},_=M.useCallback(P=>{var Re,Ne;if(!D.current)return;const{type:$,startX:F,startY:q,startPos:Z,startSize:X,startCrop:ee}=D.current,te=P.clientX-F,re=P.clientY-q,oe=((Re=C.current)==null?void 0:Re.videoWidth)||640,me=((Ne=C.current)==null?void 0:Ne.videoHeight)||480,Ie=oe*(1-ee.l-ee.r),de=me*(1-ee.t-ee.b),ae=X.w/Math.max(1,Ie),ie=X.h/Math.max(1,de);if($==="move")m({posX:Z.x+te,posY:Z.y+re});else if($==="scale"){const ye=X.w/X.h,K=Math.max(100,X.w+te);m({width:K,height:K/ye})}else if($==="crop-l"){const ye=Math.max(50,X.w-te),K=Z.x+(X.w-ye),ue=(X.w-ye)/ae/oe;m({posX:K,width:ye,cropR:Math.min(.9,Math.max(0,ee.r+ue))})}else if($==="crop-r"){const ye=Math.max(50,X.w+te),K=(X.w-ye)/ae/oe;m({width:ye,cropL:Math.min(.9,Math.max(0,ee.l+K))})}else if($==="crop-t"){const ye=Math.max(50,X.h-re),K=Z.y+(X.h-ye),ue=(X.h-ye)/ie/me;m({posY:K,height:ye,cropT:Math.min(.9,Math.max(0,ee.t+ue))})}else if($==="crop-b"){const ye=Math.max(50,X.h+re),K=(X.h-ye)/ie/me;m({height:ye,cropB:Math.min(.9,Math.max(0,ee.b+K))})}},[m]),U=()=>{D.current=null,window.removeEventListener("mousemove",_),window.removeEventListener("mouseup",U)};if(!s)return null;const O=ru[Math.floor(v)]||"normal";return a.jsxs("div",{className:"absolute select-none","data-help-id":"panel.webcam",style:{left:l,top:c,width:d,height:f,cursor:"move",pointerEvents:"auto"},onMouseDown:P=>{P.target.closest(".settings-panel")||B(P,"move")},onMouseEnter:()=>T(!0),onMouseLeave:()=>{T(!1),S(!1)},children:[a.jsx("div",{className:"absolute inset-0 w-full h-full pointer-events-none",style:{mixBlendMode:O,perspective:"1000px"},children:a.jsxs("div",{className:"w-full h-full",style:{opacity:Math.min(1,r),filter:r>1?`brightness(${r})`:"none",transform:`rotateY(${b}deg)`,transformStyle:"preserve-3d"},children:[a.jsx("canvas",{ref:k,className:"w-full h-full block"}),y&&a.jsx("div",{className:"absolute inset-0 opacity-40 mix-blend-overlay",style:{background:"linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))",backgroundSize:"100% 4px, 6px 100%"}})]})}),a.jsxs("div",{className:"absolute inset-0 w-full h-full",children:[a.jsx("div",{className:`absolute top-2 right-2 transition-opacity duration-200 z-50 ${A?"opacity-100":"opacity-0 pointer-events-none"}`,children:a.jsx("button",{onClick:P=>{P.stopPropagation(),S(!w)},className:"p-1.5 rounded bg-black/60 text-gray-400 hover:text-white hover:bg-black/80 border border-white/10 shadow-lg backdrop-blur-sm",children:a.jsx(ou,{})})}),w&&a.jsx("div",{className:"settings-panel absolute top-10 right-2 w-48 bg-[#151515] border border-white/20 rounded p-2 shadow-2xl z-50 animate-fade-in",onMouseDown:P=>P.stopPropagation(),children:a.jsxs("div",{className:"space-y-2 text-[10px]",children:[a.jsxs("div",{children:[a.jsx(ze,{className:"block mb-1",children:"Blend Mode"}),a.jsxs("select",{value:Math.floor(v),onChange:P=>m({blendMode:Number(P.target.value)}),className:"t-select",children:[a.jsx("option",{value:0,children:"Normal"}),a.jsx("option",{value:1,children:"Screen"}),a.jsx("option",{value:2,children:"Overlay"}),a.jsx("option",{value:3,children:"Lighten"}),a.jsx("option",{value:4,children:"Difference"})]})]}),a.jsxs("div",{children:[a.jsxs("div",{className:"flex justify-between text-gray-500 font-bold mb-1",children:[a.jsx("span",{children:"Opacity"}),a.jsxs("span",{children:[Math.round(r*100),"%"]})]}),a.jsx("input",{type:"range",min:"0",max:"3",step:"0.05",value:r,onChange:P=>m({opacity:parseFloat(P.target.value)}),className:"w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"})]}),a.jsxs("div",{children:[a.jsxs("div",{className:"flex justify-between text-gray-500 font-bold mb-1",children:[a.jsx("span",{children:"3D Tilt"}),a.jsxs("span",{children:[b,"°"]})]}),a.jsx("input",{type:"range",min:"-45",max:"45",step:"1",value:b,onChange:P=>m({tilt:parseInt(P.target.value)}),className:"w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"})]}),a.jsxs("div",{children:[a.jsxs("div",{className:"flex justify-between text-gray-500 font-bold mb-1",children:[a.jsx("span",{children:"Font Size"}),a.jsxs("span",{children:[x,"px"]})]}),a.jsx("input",{type:"range",min:"8",max:"32",step:"1",value:x,onChange:P=>m({fontSize:parseInt(P.target.value)}),className:"w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"})]}),a.jsxs("label",{className:"flex items-center gap-2 cursor-pointer mt-1 pt-1 border-t border-white/10",children:[a.jsx("input",{type:"checkbox",checked:y,onChange:P=>m({crtMode:P.target.checked}),className:"cursor-pointer"}),a.jsx("span",{className:"text-gray-400 font-bold",children:"CRT Scanlines"})]})]})}),a.jsxs("div",{className:`transition-opacity duration-200 ${A?"opacity-100":"opacity-0 pointer-events-none"}`,children:[a.jsx("div",{className:"absolute bottom-[-6px] right-[-6px] w-6 h-6 bg-cyan-500/50 cursor-nwse-resize hover:bg-cyan-400 z-20 rounded-full border-2 border-black",onMouseDown:P=>B(P,"scale")}),a.jsx("div",{className:"absolute top-4 bottom-4 left-[-4px] w-3 cursor-e-resize group/l z-10 flex items-center justify-center",onMouseDown:P=>B(P,"crop-l"),children:a.jsx("div",{className:"w-1 h-8 bg-red-500/50 group-hover/l:bg-red-400 rounded-full"})}),a.jsx("div",{className:"absolute top-4 bottom-4 right-[-4px] w-3 cursor-w-resize group/r z-10 flex items-center justify-center",onMouseDown:P=>B(P,"crop-r"),children:a.jsx("div",{className:"w-1 h-8 bg-red-500/50 group-hover/r:bg-red-400 rounded-full"})}),a.jsx("div",{className:"absolute left-4 right-4 top-[-4px] h-3 cursor-s-resize group/t z-10 flex items-center justify-center",onMouseDown:P=>B(P,"crop-t"),children:a.jsx("div",{className:"h-1 w-8 bg-red-500/50 group-hover/t:bg-red-400 rounded-full"})}),a.jsx("div",{className:"absolute left-4 right-4 bottom-[-4px] h-3 cursor-n-resize group/b z-10 flex items-center justify-center",onMouseDown:P=>B(P,"crop-b"),children:a.jsx("div",{className:"h-1 w-8 bg-red-500/50 group-hover/b:bg-red-400 rounded-full"})})]})]})]})},su=({className:e="-m-4"})=>{const n=z(),[t,o]=M.useState({}),[i,s]=M.useState(null),[r,l]=M.useState(!1),c=M.useMemo(()=>{const m={};return["lighting","ao","geometry","reflections","quality","atmosphere"].forEach(k=>{const w=n[k];w&&typeof w=="object"&&(m[k]={...w})}),Object.entries(t).forEach(([k,w])=>{const[S,j]=k.split(".");m[S]&&(m[S][j]=w)}),m},[n,t]),d=or(c),f=d.charAt(0).toUpperCase()+d.slice(1),p=(M.useMemo(()=>ol(c),[c])/1e3).toFixed(1),u=ne.getEngineFeatures(),g=M.useRef(()=>{});M.useEffect(()=>{const m=Y.on("compile_time",w=>{s(`Compiled (${w.toFixed(2)}s)`),l(!1),setTimeout(()=>s(null),3e3)}),C=Y.on("is_compiling",w=>{l(!!w)}),k=Y.on("engine_queue",({featureId:w,param:S,value:j})=>{g.current(w,S,j)});return()=>{m(),C(),k()}},[]);const v=(m,C,k)=>{var L,E;const w=ne.get(m),S=w==null?void 0:w.params[C],j=((L=w==null?void 0:w.engineConfig)==null?void 0:L.toggleParam)===C,R=(E=w==null?void 0:w.engineConfig)==null?void 0:E.mode,I=(S==null?void 0:S.onUpdate)==="compile";if(j&&R==="compile"||I){const D=`${m}.${C}`,A=n[m];if(A&&A[C]===k){const T={...t};delete T[D],o(T)}else o(T=>({...T,[D]:k}));s(null)}else{const D=`set${m.charAt(0).toUpperCase()+m.slice(1)}`,A=n[D];A&&A({[C]:k});const T=`${m}.${C}`;if(t[T]!==void 0){const G={...t};delete G[T],o(G)}}};g.current=v;const y=()=>{Y.emit("is_compiling","Compiling Shaders...");const m={};Object.entries(t).forEach(([C,k])=>{const[w,S]=C.split(".");m[w]||(m[w]={}),m[w][S]=k}),setTimeout(()=>{Object.entries(m).forEach(([C,k])=>{const w=`set${C.charAt(0).toUpperCase()+C.slice(1)}`,S=n[w];S&&S(k)}),o({})},100)},b=m=>{if(m==="Custom")return;const C=_a[m];if(!C)return;const k={};Object.entries(C).forEach(([w,S])=>{Object.entries(S).forEach(([j,R])=>{var L;const I=(L=n[w])==null?void 0:L[j];let N=I!==R;typeof R=="number"&&typeof I=="number"&&(N=Math.abs(R-I)>.001),N&&(k[`${w}.${j}`]=R)})}),o(k),s(null)},x=m=>{const C=n[m];if(!C)return{};const k={...C};return Object.entries(t).forEach(([w,S])=>{const[j,R]=w.split(".");j===m&&(k[R]=S)}),k};return a.jsxs("div",{className:`flex flex-col h-full ${_t.dock} min-h-0 overflow-hidden ${e}`,"data-help-id":"panel.engine",children:[a.jsxs("div",{className:`px-3 py-2 bg-black/60 border-b ${tt.standard} flex items-center justify-between shrink-0`,children:[a.jsx(ze,{children:"Engine Configuration"}),a.jsx("div",{className:"w-32",children:a.jsx(Wt,{value:f,options:[{label:"Fastest (Bare)",value:"Fastest"},{label:"Lite (Fast)",value:"Lite"},{label:"Balanced",value:"Balanced"},{label:"Ultra",value:"Ultra"},{label:"Custom",value:"Custom"}],onChange:m=>b(m.toLowerCase())})})]}),a.jsxs("div",{className:"flex-1 overflow-y-auto custom-scroll p-0 min-h-0",children:[a.jsxs("div",{className:`flex gap-2 items-center px-3 py-2 bg-blue-900/10 border-b ${tt.subtle} mb-1 shrink-0`,children:[a.jsx("div",{className:"text-blue-400",children:a.jsx(Ho,{})}),a.jsxs("p",{className:"text-[9px] text-blue-200/80 leading-tight",children:[a.jsx("span",{className:"text-green-400",children:"●"})," Compiled  ",a.jsx("span",{className:`${pt.text}`,children:"●"})," Pending  ",a.jsx("span",{className:"text-blue-400",children:"●"})," Instant"]})]}),a.jsx("div",{className:"flex flex-col",children:u.map(m=>{const C=m.engineConfig,k=x(m.id),w=C.toggleParam,S=k[w],j=`${m.id}.${w}`,I=t[j]!==void 0?"pending":"synced";return a.jsxs("div",{className:"group",children:[a.jsx(un,{label:C.label,description:C.description,isActive:S,onToggle:N=>v(m.id,w,N),status:I}),S&&C.groupFilter&&a.jsx("div",{className:`ml-4 pl-2 border-l ${tt.standard} my-0.5`,children:a.jsx(se,{featureId:m.id,groupFilter:C.groupFilter,excludeParams:[C.toggleParam],variant:"dense",forcedState:k,onChangeOverride:(N,L)=>v(m.id,N,L),pendingChanges:t})})]},m.id)})})]}),a.jsx("div",{className:`px-3 py-2 ${_t.input} border-t ${tt.standard} flex items-center justify-between min-h-[40px] shrink-0 z-10`,children:r?a.jsxs(a.Fragment,{children:[a.jsxs("div",{className:`flex items-center gap-2 ${Mn.text} text-[10px] font-bold`,children:[a.jsx(Wo,{className:"animate-spin h-3 w-3"}),a.jsx("span",{children:"Compiling..."})]}),a.jsxs("div",{className:`text-[9px] ${Mt.dimLabel}`,children:["~",p,"s"]})]}):Object.keys(t).length>0?a.jsxs(a.Fragment,{children:[a.jsxs("div",{className:"flex items-center gap-1.5",children:[a.jsxs("div",{className:`flex items-center gap-2 ${pt.text} text-[10px] font-bold animate-pulse`,children:[a.jsx(qt,{}),a.jsx("span",{children:"Pending"})]}),a.jsxs("span",{className:`text-[9px] ${Mt.dimLabel} font-mono`,children:["~",p,"s"]})]}),a.jsxs("button",{onClick:y,disabled:r,className:`px-4 py-1 ${pt.btnBg} ${pt.btnHover} disabled:bg-gray-600 disabled:cursor-not-allowed ${pt.btnText} font-bold text-[10px] rounded transition-colors flex items-center gap-1`,children:[a.jsx(Rt,{})," Apply"]})]}):a.jsxs(a.Fragment,{children:[a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsx("span",{className:`text-[10px] ${Mt.faint} font-medium`,children:"System Ready"}),a.jsxs("span",{className:`text-[9px] ${Mt.faint} font-mono`,children:["~",p,"s"]})]}),i&&a.jsxs("div",{className:"text-[10px] text-green-400 font-bold animate-fade-in flex items-center gap-1",children:[a.jsx(Rt,{})," ",i]})]})})]})},lu=xe(),cu=e=>{const n=new Oe(e.x,e.y,e.z,e.w),t=new V(0,0,-1).applyQuaternion(n),o=.98;return t.y>o?"Bottom View":t.y<-o?"Top View":t.x>o?"Left View":t.x<-o?"Right View":t.z>o?"Back View":t.z<-o?"Front View":null},du=(e,n)=>{let o=Ye.getUnifiedFromEngine().length();o<.001&&(o=3.5);let i=lu.lastMeasuredDistance;(!i||i>=1e3||i<=0)&&(i=o);const s=new V(0,0,0),r=new Oe;let l=!0;switch(e){case"Front":r.setFromEuler(new _e(0,0,0));break;case"Back":r.setFromEuler(new _e(0,Math.PI,0));break;case"Left":r.setFromEuler(new _e(0,-Math.PI/2,0));break;case"Right":r.setFromEuler(new _e(0,Math.PI/2,0));break;case"Top":r.setFromEuler(new _e(-Math.PI/2,0,0));break;case"Bottom":r.setFromEuler(new _e(Math.PI/2,0,0));break;case"Isometric":l=!1;const g=ut.degToRad(-35.264),v=ut.degToRad(45);r.setFromEuler(new _e(g,v,0,"YXZ"));break}const c=new V(0,0,-1).applyQuaternion(r),d=s.clone().sub(c.multiplyScalar(o)),f=l?1:0;let h=n?n.orthoScale:2,p=n?n.dofStrength:0,u;return l&&(p=0,u={camType:f,orthoScale:h,dofStrength:p}),{position:d,rotation:{x:r.x,y:r.y,z:r.z,w:r.w},targetDistance:i,optics:u}},Cr=(e,n)=>{if(!e)return null;let t=1/0,o=-1/0;const i=[];for(let u=0;u<e.length;u+=4){const g=e[u];g>-.9&&(n||(g<t&&(t=g),g>o&&(o=g)),i.push(g))}let s,r;if(n)s=n.min,r=n.max;else{if(t===1/0)return null;const u=o-t;u<1e-4?(s=t-.1,r=o+.1):(s=t-u*.05,r=o+u*.05)}const l=128,c=new Array(l).fill(0),d=r-s,f=Math.max(d,1e-6);for(const u of i){const g=(u-s)/f,v=Math.floor(g*l);v>=0&&v<l&&c[v]++}const h=Math.max(...c);return{buckets:c.map(u=>u>0?Math.log(u+1)/Math.log(h+1):0),min:s,max:r}},kr=(e,n,t)=>{if(!e||e.length<10)return null;const o=e.length,i=e.map((x,m)=>m===0||m===o-1?0:x);let s=0;if(i.forEach(x=>s+=x),s<.01)return{start:n,end:t};const r=s*.02,l=s*.98;let c=0,d=0,f=o-1,h=!1;for(let x=0;x<o;x++)if(c+=i[x],!h&&c>=r&&(d=x,h=!0),c>=l){f=x;break}const p=.05;for(;d>1&&e[d-1]>p&&!(e[d-1]>e[d]*2);)d--;for(;f<o-2&&e[f+1]>p&&!(e[f+1]>e[f]*2);)f++;const u=(t-n)/o;let g=n+d*u,v=n+f*u;const b=(v-g)*.05;return g=Math.max(n,g-b),v=Math.min(t,v+b),{start:g,end:v}},jr=({data:e,min:n,max:t,gamma:o,repeats:i=1,phase:s=0,gradientStops:r,onChange:l,autoUpdate:c,onToggleAuto:d,onRefresh:f,isStale:h=!1,height:p=48,labelTitle:u="Levels",labelLeft:g="Black",labelMid:v="Gamma",labelRight:y="White",fixedRange:b})=>{const x=M.useRef(null),[m,C]=M.useState(b||{min:0,max:1}),k=z(F=>F.openContextMenu),w=M.useMemo(()=>{const F=Cr(e,b);return F?(C({min:F.min,max:F.max}),F.buckets):(b&&C(b),[])},[e,b]),S=Math.pow(.5,1/o)*100;M.useEffect(()=>{const F=x.current;if(!F)return;const q=F.getContext("2d");if(!q||(q.clearRect(0,0,F.width,F.height),w.length===0))return;const Z=F.width,X=F.height,ee=Z/w.length;q.fillStyle="#666",w.forEach((te,re)=>{const oe=te*X;q.fillRect(re*ee,X-oe,ee,oe)})},[w]);const j=F=>{const q=m.max-m.min;return q<1e-5?50:(F-m.min)/q*100},R=w.length>0||b,I=R?j(n):0,N=R?j(t):100,L=N-I,E=I+S/100*L,D=M.useRef(null),A=(F,q)=>{F.preventDefault(),F.stopPropagation(),D.current={type:q,startX:F.clientX,startMin:n,startMax:t,startGamma:o},window.addEventListener("mousemove",T),window.addEventListener("mouseup",G)},T=F=>{if(!D.current||!x.current)return;const{type:q,startX:Z,startMin:X,startMax:ee,startGamma:te}=D.current,re=x.current.getBoundingClientRect(),oe=F.clientX-Z,me=m.max-m.min,Ie=w.length>0||b?me:1,de=oe/re.width*Ie;let ae=X,ie=ee,Re=te;if(q==="min")ae+=de;else if(q==="max")ie+=de;else if(q==="pan")ae+=de,ie+=de;else if(q==="gamma"){const Ne=re.width*Math.abs(ee-X)/Ie,K=Math.pow(.5,1/te)*Ne,Ee=Math.max(1,Math.min(Ne-1,K+oe))/Ne;Re=Math.log(.5)/Math.log(Ee),Re=Math.max(.1,Math.min(10,Re))}ae>=ie&&(q==="min"&&(ae=ie-.001),q==="max"&&(ie=ae+.001)),l({min:ae,max:ie,gamma:Re})},G=()=>{D.current=null,window.removeEventListener("mousemove",T),window.removeEventListener("mouseup",G)},H=()=>{if(w.length===0)return;const F=kr(w,m.min,m.max);F&&l({min:F.start,max:F.end,gamma:1})},W=F=>{F.preventDefault(),F.stopPropagation(),l({min:0,max:1,gamma:1})},B=F=>{const q=Xe(F.currentTarget);q.length>0&&(F.preventDefault(),F.stopPropagation(),k(F.clientX,F.clientY,[],q))},_=M.useMemo(()=>sn(r||[{id:"b",position:0,color:"#000000"},{id:"w",position:1,color:"#ffffff"}],o),[r,o]),U=Math.max(.1,i),O={left:`${I}%`,width:`${Math.max(0,N-I)}%`},P=1+2/U,$={backgroundImage:_,backgroundSize:`${100/(U*P)}% 100%`,backgroundRepeat:"repeat-x",width:`${100*P}%`,marginLeft:`${-100/U}%`,transform:`translateX(${s*100/(U*P)}%)`};return a.jsxs("div",{className:"py-2 bg-gray-900/40","data-help-id":"ui.histogram",onContextMenu:B,children:[a.jsxs("div",{className:"flex justify-between items-center mb-2 px-3",children:[a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsx("label",{className:"text-[10px] text-gray-500 font-bold",children:u}),h&&!c&&a.jsx("span",{className:"text-[8px] text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded border border-amber-500/30",children:"Stale"}),d&&a.jsx("div",{className:"flex items-center justify-center w-4 h-4 cursor-pointer group rounded hover:bg-white/10",onClick:d,title:"Auto-update histogram (Live)",children:a.jsx("div",{className:`w-2 h-2 rounded-full transition-all duration-300 ${c?"bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]":"bg-gray-600"}`})}),f&&!c&&a.jsx("button",{onClick:f,className:"text-[9px] text-cyan-500 hover:text-white ml-1",children:"Refresh"})]}),a.jsxs("div",{className:"flex items-center gap-1",children:[a.jsx("button",{onClick:()=>l({min:0,max:1,gamma:1}),className:"px-2 py-0.5 bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white text-[8px] rounded border border-gray-600 transition-colors font-bold",title:"Reset to 0-1 range",children:"0-1"}),d&&a.jsx("button",{onClick:H,className:"px-2 py-0.5 bg-cyan-900/40 hover:bg-cyan-700 text-cyan-400 text-[9px] rounded border border-cyan-800 transition-colors font-bold",title:"Fit range to current data",children:"Fit"})]})]}),a.jsxs("div",{className:`relative w-full bg-black/60 overflow-hidden select-none border-y border-white/5 transition-colors group/hist ${f&&!c?"cursor-pointer hover:bg-black/40":""}`,style:{height:p},onClick:f&&!c?f:void 0,children:[a.jsxs("div",{className:"absolute inset-0 right-4 left-3 mx-2",children:[a.jsx("canvas",{ref:x,width:320,height:p,className:"w-full h-full opacity-40 absolute inset-0"}),a.jsx("div",{className:"absolute top-0 bottom-0 overflow-hidden pointer-events-none opacity-40",style:O,children:a.jsx("div",{className:"h-full",style:$})}),a.jsxs("div",{className:"absolute top-0 bottom-0 w-4 -ml-2 cursor-ew-resize z-20 group/min flex justify-center",style:{left:`${I}%`},onMouseDown:F=>A(F,"min"),children:[a.jsx("div",{className:"w-px h-full bg-white/60 group-hover/min:bg-white group-hover/min:w-0.5 transition-all shadow-[0_0_5px_rgba(0,0,0,0.8)]"}),a.jsx("div",{className:"absolute top-0 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-white"})]}),a.jsxs("div",{className:"absolute top-0 bottom-0 w-4 -ml-2 cursor-ew-resize z-20 group/max flex justify-center",style:{left:`${N}%`},onMouseDown:F=>A(F,"max"),children:[a.jsx("div",{className:"w-px h-full bg-white/60 group-hover/max:bg-white group-hover/max:w-0.5 transition-all shadow-[0_0_5px_rgba(0,0,0,0.8)]"}),a.jsx("div",{className:"absolute bottom-0 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-white"})]}),L>5&&a.jsx("div",{className:"absolute top-1/2 -translate-y-1/2 w-4 h-4 -ml-2 cursor-ew-resize z-30 group/gamma flex items-center justify-center",style:{left:`${E}%`},onMouseDown:F=>A(F,"gamma"),children:a.jsx("div",{className:"w-2 h-2 rotate-45 bg-gray-400 border border-black group-hover/gamma:bg-white group-hover/gamma:scale-125 transition-transform shadow-md"})}),a.jsx("div",{className:"absolute top-0 bottom-0 cursor-grab active:cursor-grabbing z-10",style:{left:`${I}%`,width:`${Math.max(0,N-I)}%`},onMouseDown:F=>A(F,"pan")})]}),a.jsxs("button",{onClick:W,className:"absolute top-0 bottom-0 right-0 w-4 bg-red-900/50 hover:bg-red-700/80 border-l border-white/10 z-40 opacity-0 group-hover/hist:opacity-100 transition-opacity flex items-center justify-center",title:"Reset Range",children:[a.jsx("div",{className:"w-px h-2 bg-white/80 rotate-45 transform origin-center absolute"}),a.jsx("div",{className:"w-px h-2 bg-white/80 -rotate-45 transform origin-center absolute"})]})]}),a.jsxs("div",{className:"flex justify-between items-center mt-2 px-3",children:[a.jsxs("div",{className:"flex flex-col items-start w-16",children:[a.jsx("span",{className:"text-[8px] text-gray-600",children:g}),a.jsx(yt,{value:n,onChange:F=>l({min:F,max:t,gamma:o}),step:.01,min:-1/0,max:1/0,highlight:!0})]}),a.jsxs("div",{className:"flex flex-col items-center w-16",children:[a.jsx("span",{className:"text-[8px] text-gray-600",children:v}),a.jsx(yt,{value:o,onChange:F=>l({min:n,max:t,gamma:F}),step:.01,min:.1,max:10,overrideText:o.toFixed(2)})]}),a.jsxs("div",{className:"flex flex-col items-end w-16",children:[a.jsx("span",{className:"text-[8px] text-gray-600",children:y}),a.jsx(yt,{value:t,onChange:F=>l({min:n,max:F,gamma:o}),step:.01,min:-1/0,max:1/0,highlight:!0})]})]})]})},bn=xe(),uu=({sliceState:e,actions:n})=>{const t=z(p=>p.sceneHistogramData);z(p=>p.sceneHistogramTrigger);const o=z(p=>p.refreshSceneHistogram),i=z(p=>p.liveModulations),{levelsMin:s,levelsMax:r,levelsGamma:l}=e,c=n.setColorGrading,d=(i==null?void 0:i["colorGrading.levelsMin"])??s,f=(i==null?void 0:i["colorGrading.levelsMax"])??r,h=(i==null?void 0:i["colorGrading.levelsGamma"])??l;return a.jsx("div",{className:"mt-2 pt-2 border-t border-white/5",children:a.jsx(jr,{data:t,min:d??0,max:f??1,gamma:h??1,onChange:({min:p,max:u,gamma:g})=>{c({levelsMin:p,levelsMax:u,levelsGamma:g})},onRefresh:o,height:40,fixedRange:{min:0,max:1}})})},hu=({sliceState:e,actions:n})=>{const{camFov:t,camType:o,dofStrength:i}=e,s=n.setOptics;z(u=>u.interactionMode),z(u=>u.setInteractionMode),z(u=>u.focusLock),z(u=>u.setFocusLock);const[r,l]=M.useState(!0),c=M.useRef(null),d=Math.abs((o??0)-0)<.1,f=()=>{const u=Je();if(!u)return;const g=z.getState(),v=bn.lastMeasuredDistance;let y=v>1e-4&&v<900?v:g.targetDistance||3.5;y=Math.max(.001,y);const b=Ye.getUnifiedFromEngine(),x=new V(0,0,-1).applyQuaternion(u.quaternion);c.current={fov:t,dist:y,unifiedPos:{x:b.x,y:b.y,z:b.z},forward:x,quat:u.quaternion.clone()}},h=u=>{const g={camFov:u};if(r&&c.current){const{fov:w,dist:S,unifiedPos:j,forward:R,quat:I}=c.current,N=ut.degToRad(w),L=ut.degToRad(u),E=Math.tan(N/2)/Math.tan(L/2),D=S*E,A=S-D,T=R.clone().multiplyScalar(A);g.dofFocus=D;const G=new V(j.x,j.y,j.z).add(T);Ye.teleportPosition(G,{x:I.x,y:I.y,z:I.z,w:I.w},D),z.setState({targetDistance:D})}s(g);const{isRecording:v,captureCameraFrame:y,addKeyframe:b,addTrack:x,currentFrame:m,sequence:C,isPlaying:k}=le.getState();if(v){const w=k?"Linear":"Bezier";if(g.dofFocus!==void 0){const S="optics.dofFocus";C.tracks[S]||x(S,"Focus Distance"),b(S,m,g.dofFocus,w)}r&&y(m,!0,w)}},p=()=>{if(r){const{currentFrame:u,captureCameraFrame:g,isPlaying:v}=le.getState();g(u,!0,v?"Linear":"Bezier")}};return a.jsx("div",{className:"flex flex-col",children:d&&a.jsxs("div",{children:[a.jsx(fe,{label:"Field of View",value:t??60,min:10,max:150,step:1,onChange:h,onDragStart:f,overrideInputText:`${Math.round(t??60)}°`,trackId:"optics.camFov",onKeyToggle:p}),a.jsx("div",{children:a.jsx(Ve,{label:"Dolly Link",icon:a.jsx(en,{active:r}),value:r,onChange:u=>l(u)})})]})})},fu=({sliceState:e,actions:n})=>{const t=n.setOptics,o=z(d=>d.interactionMode),i=z(d=>d.setInteractionMode),s=z(d=>d.focusLock),r=z(d=>d.setFocusLock),l=o==="picking_focus",c=d=>{r(d),d&&bn.lastMeasuredDistance>0&&t({dofFocus:bn.lastMeasuredDistance})};return a.jsxs("div",{className:"grid grid-cols-2 gap-px p-px",children:[a.jsx(Ta,{active:s,onClick:()=>c(!s),label:s?"Lock On":"Focus Lock",variant:"primary"}),a.jsx(Ta,{active:l,onClick:()=>i(l?"none":"picking_focus"),label:l?"Picking...":"Pick Focus",variant:"success"})]})},Rr=()=>{const e=z(i=>i.sceneOffset),n=z(i=>i.cameraRot),t=Ye.getUnifiedPosition({x:0,y:0,z:0},e),o=Ye.getRotationDegrees(n);return a.jsxs(a.Fragment,{children:[a.jsx("div",{"data-help-id":"cam.position",children:a.jsx(oa,{label:"Absolute Position",value:t,onChange:i=>Ye.teleportPosition(i),step:.1,min:-1/0,max:1/0,interactionMode:"camera",trackKeys:["camera.unified.x","camera.unified.y","camera.unified.z"],trackLabels:["Position X","Position Y","Position Z"]})}),a.jsx("div",{"data-help-id":"cam.rotation",children:a.jsx(oa,{label:"Rotation (Degrees)",value:o,onChange:Ye.teleportRotation,step:1,min:-180,max:180,interactionMode:"camera",trackKeys:["camera.rotation.x","camera.rotation.y","camera.rotation.z"],trackLabels:["Rotation X","Rotation Y","Rotation Z"],convertRadToDeg:!0})})]})},pu=()=>{const e=z(i=>i.cameraMode),n=z(i=>i.setCameraMode),t=z(i=>i.optics),o=t&&Math.abs(t.camType-1)<.1;return a.jsxs("div",{className:"flex flex-col gap-3",children:[a.jsxs("div",{className:o?"opacity-50 pointer-events-none":"",children:[a.jsx(Ve,{value:e,onChange:i=>n(i),options:[{label:"Orbit",value:"Orbit"},{label:"Fly",value:"Fly"}]}),o&&a.jsx("p",{className:"text-[9px] text-gray-500 mt-1 text-center",children:"Fly Mode disabled in Orthographic view"})]}),e==="Fly"&&a.jsx(se,{featureId:"navigation",groupFilter:"movement"}),a.jsx(Rr,{})]})},va=xe(),Lo=[{type:"none",label:"None"},{type:"thirds",label:"Rule of Thirds"},{type:"golden",label:"Golden Ratio"},{type:"grid",label:"Grid"},{type:"center",label:"Center Mark"},{type:"diagonal",label:"Diagonal"},{type:"spiral",label:"Spiral"},{type:"safearea",label:"Safe Areas"}],No=async()=>{try{const e=await va.captureSnapshot();if(!e)return;const n=await createImageBitmap(e),t=128,o=document.createElement("canvas");o.width=t,o.height=t;const i=o.getContext("2d"),s=Math.min(n.width,n.height),r=(n.width-s)/2,l=(n.height-s)/2;return i.drawImage(n,r,l,s,s,0,0,t,t),o.toDataURL("image/jpeg",.7)}catch{return}},mu=({className:e="-m-3"})=>{var B;const{savedCameras:n,activeCameraId:t,addCamera:o,deleteCamera:i,selectCamera:s,updateCamera:r,resetCamera:l,duplicateCamera:c,reorderCameras:d}=z(),f=z(_=>_.optics),h=z(_=>_.compositionOverlay),p=z(_=>_.setCompositionOverlay),u=z(_=>_.compositionOverlaySettings),g=z(_=>_.setCompositionOverlaySettings),v=z(_=>_.setOptics),y=z(_=>_.sceneOffset),b=z(_=>_.cameraRot),x=M.useCallback(_=>{const U=y,O=U.x+(U.xL??0),P=U.y+(U.yL??0),$=U.z+(U.zL??0),F=_.sceneOffset||{x:0,y:0,z:0,xL:0,yL:0,zL:0},q=F.x+(F.xL??0),Z=F.y+(F.yL??0),X=F.z+(F.zL??0);return!!(Math.abs(O-q)+Math.abs(P-Z)+Math.abs($-X)>1e-4||Math.abs(b.x-_.rotation.x)+Math.abs(b.y-_.rotation.y)+Math.abs(b.z-_.rotation.z)+Math.abs(b.w-_.rotation.w)>.001||_.optics&&f&&(Math.abs((f.camType??0)-(_.optics.camType??0))>.1||Math.abs((f.orthoScale??2)-(_.optics.orthoScale??2))>.01||Math.abs((f.camFov??60)-(_.optics.camFov??60))>.1))},[y,b,f]),[m,C]=M.useState(null),[k,w]=M.useState(null),[S,j]=M.useState(""),R=_=>{C(_.id),j(_.label)},I=()=>{m&&(r(m,{label:S}),C(null))},N=_=>{_.key==="Enter"&&I(),_.key==="Escape"&&C(null)},L=_=>{const U=du(_,f);Ye.teleportPosition(U.position,U.rotation,U.targetDistance),U.optics&&v&&v(U.optics),s(null)},E=M.useCallback(async()=>{const _=Ye.getRotationFromEngine();let U=`Camera ${n.length+1}`;const O=z.getState().optics;if(O&&Math.abs(O.camType-1)<.1){const $=cu(_);$&&(U=$)}o(U);const P=await No();if(P){const $=z.getState().savedCameras,F=$[$.length-1];F&&r(F.id,{thumbnail:P})}},[n.length,o,r]),D=M.useCallback(async _=>{const U=Ye.getUnifiedFromEngine(),O=Ye.getRotationFromEngine(),P=be.split(U.x),$=be.split(U.y),F=be.split(U.z),q=va.lastMeasuredDistance>0&&va.lastMeasuredDistance<1e3?va.lastMeasuredDistance:z.getState().targetDistance,Z={...z.getState().optics},X=await No();r(_,{position:{x:0,y:0,z:0},rotation:{x:O.x,y:O.y,z:O.z,w:O.w},sceneOffset:{x:P.high,y:$.high,z:F.high,xL:P.low,yL:$.low,zL:F.low},targetDistance:q,optics:Z,...X?{thumbnail:X}:{}})},[r]),A=()=>{l(),v&&v({camType:0,camFov:60,orthoScale:2})},T=(_,U)=>{_.dataTransfer.effectAllowed="move",_.dataTransfer.setData("text/plain",String(U)),w({fromIndex:U,overIndex:U})},G=(_,U)=>{_.preventDefault(),_.dataTransfer.dropEffect="move",k&&k.overIndex!==U&&w({...k,overIndex:U})},H=(_,U)=>{_.preventDefault(),k&&d(k.fromIndex,U),w(null)},W=()=>w(null);return a.jsxs("div",{className:`flex flex-col bg-[#080808] ${e}`,"data-help-id":"panel.camera_manager",children:[a.jsxs("div",{className:"p-2 border-b border-white/10 bg-black/40 grid grid-cols-4 gap-1",children:[a.jsx("button",{onClick:()=>L("Front"),className:"bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1",children:"FRONT"}),a.jsx("button",{onClick:()=>L("Back"),className:"bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1",children:"BACK"}),a.jsx("button",{onClick:()=>L("Left"),className:"bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1",children:"LEFT"}),a.jsx("button",{onClick:()=>L("Right"),className:"bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1",children:"RIGHT"}),a.jsx("button",{onClick:()=>L("Top"),className:"bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1",children:"TOP"}),a.jsx("button",{onClick:()=>L("Bottom"),className:"bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1",children:"BTM"}),a.jsx("button",{onClick:()=>L("Isometric"),className:"bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1",children:"ISO"}),a.jsx("button",{onClick:A,className:"bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1",children:"RESET"}),a.jsxs("button",{onClick:E,className:"col-span-4 bg-cyan-900/40 hover:bg-cyan-800 text-cyan-300 border border-cyan-500/30 rounded py-1 text-[9px] font-bold flex items-center justify-center gap-1 mt-1",children:[a.jsx(Ea,{})," New Camera"]})]}),a.jsxs("div",{className:"p-2 space-y-1",children:[n.length===0&&a.jsx("div",{className:"text-center text-gray-600 text-[10px] italic py-4",children:"No saved cameras"}),n.map((_,U)=>{const O=t===_.id,P=O&&x(_),$=k&&k.overIndex===U&&k.fromIndex!==U;return a.jsxs("div",{onDragOver:F=>G(F,U),onDrop:F=>H(F,U),className:`flex items-center gap-1.5 p-1.5 rounded border transition-all group ${O?"bg-cyan-900/20 border-cyan-500/50":"bg-white/5 border-transparent hover:border-white/10"} ${$?"border-cyan-400/70 border-dashed":""}`,onClick:()=>s(_.id),children:[a.jsx("div",{draggable:!0,onDragStart:F=>{F.stopPropagation(),T(F,U)},onDragEnd:W,className:"cursor-grab opacity-0 group-hover:opacity-40 hover:!opacity-80 transition-opacity flex-shrink-0",title:"Drag to reorder",children:a.jsx(Sn,{})}),a.jsx("div",{className:"w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-black/50 border border-white/5",children:_.thumbnail?a.jsx("img",{src:_.thumbnail,alt:"",className:"w-full h-full object-cover"}):a.jsx("div",{className:"w-full h-full flex items-center justify-center text-gray-700 text-[7px]",children:U+1})}),a.jsxs("div",{className:"flex-1 min-w-0",children:[m===_.id?a.jsx("input",{type:"text",value:S,onChange:F=>j(F.target.value),onBlur:I,onKeyDown:N,autoFocus:!0,className:"bg-black border border-white/20 text-xs text-white px-1 py-0.5 rounded w-full outline-none",onClick:F=>F.stopPropagation()}):a.jsx("span",{className:`text-xs font-bold truncate block cursor-text ${P?"text-amber-300 italic":O?"text-white":"text-gray-400 group-hover:text-gray-300"}`,onDoubleClick:F=>{F.stopPropagation(),R(_)},title:"Double-click to rename",children:P?`*${_.label}`:_.label}),U<9&&a.jsxs("span",{className:"text-[7px] text-gray-600",children:["Ctrl+",U+1]})]}),a.jsxs("div",{className:"flex items-center gap-0.5 flex-shrink-0",children:[O&&a.jsx("button",{onClick:F=>{F.stopPropagation(),D(_.id)},className:`p-1 transition-colors ${P?"text-amber-400 hover:text-amber-200":"text-gray-600 hover:text-gray-400 opacity-0 group-hover:opacity-100"}`,title:P?"Camera modified — click to save current view":"Update camera to current view",children:a.jsx(tn,{})}),a.jsx("button",{onClick:F=>{F.stopPropagation(),c(_.id)},className:"p-1 text-gray-600 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity",title:"Duplicate camera",children:a.jsx(xi,{})}),a.jsx("button",{onClick:F=>{F.stopPropagation(),i(_.id)},className:"p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity",title:"Delete camera",children:a.jsx(zt,{})})]})]},_.id)})]}),a.jsxs("div",{className:"border-t border-white/10 bg-black/40 p-2 space-y-2",children:[a.jsxs("div",{className:"flex items-center justify-between",children:[a.jsx(ze,{children:t?"Active Settings":"Free Camera"}),t&&a.jsx("button",{onClick:()=>s(null),className:"text-[9px] text-gray-500 hover:text-white px-2 py-0.5 rounded border border-white/10 hover:bg-white/5 transition-colors",children:"Deselect"})]}),a.jsx(Dt,{label:"Position",defaultOpen:!1,children:a.jsx("div",{className:"mt-1",children:a.jsx(Rr,{})})}),a.jsx("div",{className:"bg-white/5 rounded p-1",children:a.jsx(se,{featureId:"optics"})}),a.jsx("div",{className:"border-t border-white/10 pt-2",children:a.jsx(Dt,{label:"Composition Guide",defaultOpen:!1,rightContent:h!=="none"?a.jsx("span",{className:"text-[8px] text-cyan-400",children:(B=Lo.find(_=>_.type===h))==null?void 0:B.label}):null,children:a.jsxs("div",{className:"mt-2 space-y-2",children:[a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsx("label",{className:"text-[9px] text-gray-500 w-16",children:"Type"}),a.jsx("select",{value:h,onChange:_=>p(_.target.value),className:"flex-1 t-select",children:Lo.map(_=>a.jsx("option",{value:_.type,children:_.label},_.type))})]}),h!=="none"&&a.jsxs(a.Fragment,{children:[a.jsx(fe,{label:"Opacity",value:u.opacity,min:.1,max:1,step:.1,onChange:_=>g({opacity:_})}),a.jsx(fe,{label:"Line Width",value:u.lineThickness,min:.5,max:3,step:.5,onChange:_=>g({lineThickness:_})}),a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsx("label",{className:"text-[9px] text-gray-500 w-16",children:"Color"}),a.jsx(Ra,{color:u.color,onChange:_=>g({color:_})})]}),h==="grid"&&a.jsxs(a.Fragment,{children:[a.jsx(fe,{label:"Divisions X",value:u.gridDivisionsX,min:2,max:16,step:1,onChange:_=>g({gridDivisionsX:_})}),a.jsx(fe,{label:"Divisions Y",value:u.gridDivisionsY,min:2,max:16,step:1,onChange:_=>g({gridDivisionsY:_})})]}),h==="spiral"&&a.jsxs(a.Fragment,{children:[a.jsx(fe,{label:"Rotation",value:u.spiralRotation,min:0,max:360,step:15,onChange:_=>g({spiralRotation:_})}),a.jsx(fe,{label:"Position X",value:u.spiralPositionX,min:0,max:1,step:.05,onChange:_=>g({spiralPositionX:_})}),a.jsx(fe,{label:"Position Y",value:u.spiralPositionY,min:0,max:1,step:.05,onChange:_=>g({spiralPositionY:_})}),a.jsx(fe,{label:"Scale",value:u.spiralScale,min:.5,max:2,step:.1,onChange:_=>g({spiralScale:_})}),a.jsx(fe,{label:"Ratio (Phi)",value:u.spiralRatio,min:1,max:2,step:.01,onChange:_=>g({spiralRatio:_})})]}),a.jsxs("div",{className:"flex items-center gap-3 pt-1",children:[a.jsxs("label",{className:"flex items-center gap-1 cursor-pointer",children:[a.jsx("input",{type:"checkbox",checked:u.showCenterMark,onChange:_=>g({showCenterMark:_.target.checked}),className:"w-3 h-3 accent-cyan-500 bg-gray-800 border-gray-600 rounded"}),a.jsx("span",{className:"text-[9px] text-gray-400",children:"Center"})]}),a.jsxs("label",{className:"flex items-center gap-1 cursor-pointer",children:[a.jsx("input",{type:"checkbox",checked:u.showSafeAreas,onChange:_=>g({showSafeAreas:_.target.checked}),className:"w-3 h-3 accent-cyan-500 bg-gray-800 border-gray-600 rounded"}),a.jsx("span",{className:"text-[9px] text-gray-400",children:"Safe Areas"})]})]})]})]})})})]})]})},Aa=.01,Ir=100,Pr=Math.log(Ir/Aa),gu=e=>Math.log(e/Aa)/Pr,xu=e=>Aa*Math.exp(e*Pr),bu=({value:e,onChange:n})=>{const t=Ue.useRef(null),o=Ue.useRef(!1),i=gu(e)*100,s=d=>{const f=t.current;if(!f)return;const h=f.getBoundingClientRect(),p=Math.max(0,Math.min(1,(d-h.left)/h.width)),u=xu(p),g=Math.round(u*100)/100;n(Math.max(Aa,Math.min(Ir,g)))},r=d=>{d.preventDefault(),d.stopPropagation(),o.current=!0,d.target.setPointerCapture(d.pointerId),s(d.clientX)},l=d=>{o.current&&s(d.clientX)},c=()=>{o.current=!1};return a.jsxs("div",{ref:t,className:"relative h-[22px] cursor-pointer overflow-hidden",style:{backgroundImage:"repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.03) 5px, rgba(255,255,255,0.03) 10px)"},onPointerDown:r,onPointerMove:l,onPointerUp:c,children:[a.jsx("div",{className:"absolute inset-0 bg-white/[0.12]"}),a.jsx("div",{className:"absolute top-0 bottom-0 left-0 bg-cyan-500/20 transition-[width] duration-75 ease-out",style:{width:`${i}%`}}),a.jsxs("div",{className:"absolute inset-0 flex items-center justify-between px-2 pointer-events-none",children:[a.jsx("span",{className:"text-[10px] text-gray-400 font-medium",children:"Amount"}),a.jsxs("span",{className:"text-[10px] text-gray-300 tabular-nums",children:[e>=10?Math.round(e):e.toFixed(2),"%"]})]})]})},yu=({onRandomizeParams:e,onRandomizeFull:n})=>{const[t,o]=Ue.useState(100);return a.jsxs("div",{className:"py-0.5",children:[a.jsx("div",{className:"px-3 py-0.5",children:a.jsx(bu,{value:t,onChange:o})}),a.jsxs("button",{onClick:()=>e(t/100),className:"w-full text-left px-4 py-2 text-xs flex items-center gap-2 text-gray-300 hover:bg-white/10 hover:text-white transition-colors",children:[a.jsx(bi,{})," Parameters"]}),a.jsxs("button",{onClick:()=>n(t/100),className:"w-full text-left px-4 py-2 text-xs flex items-center gap-2 text-gray-300 hover:bg-white/10 hover:text-white transition-colors",children:[a.jsx(yi,{})," Full (inc. Box/Julia)"]})]})};function Tr(){const e=z.getState(),n=we.get(e.formula),t=n==null?void 0:n.defaultPreset,o=r=>{const l=z.getState(),c=we.get(l.formula);l.handleInteractionStart("param");const d={};if(l.formula==="Modular"){const h=l.coreMath,p=u=>u+(Math.random()*4-2)*r;d.paramA=p(h.paramA),d.paramB=p(h.paramB),d.paramC=p(h.paramC),d.paramD=p(h.paramD),d.paramE=p(h.paramE),d.paramF=p(h.paramF),l.setCoreMath(d),l.handleInteractionEnd();return}if(!c){l.handleInteractionEnd();return}const f=l.coreMath;c.parameters.forEach(h=>{if(!h)return;const p=h.max-h.min;if(h.type==="vec3"){const u=f[h.id]||{x:0,y:0,z:0};d[h.id]={x:Math.max(h.min,Math.min(h.max,u.x+(Math.random()*2-1)*p*r)),y:Math.max(h.min,Math.min(h.max,u.y+(Math.random()*2-1)*p*r)),z:Math.max(h.min,Math.min(h.max,u.z+(Math.random()*2-1)*p*r))}}else if(h.type==="vec2"){const u=f[h.id]||{x:0,y:0};d[h.id]={x:Math.max(h.min,Math.min(h.max,u.x+(Math.random()*2-1)*p*r)),y:Math.max(h.min,Math.min(h.max,u.y+(Math.random()*2-1)*p*r))}}else if(r>=1){const u=Math.random()*p+h.min;d[h.id]=h.step>0?Math.round(u/h.step)*h.step:u}else{const g=(f[h.id]??(h.min+h.max)/2)+(Math.random()*2-1)*p*r,v=Math.max(h.min,Math.min(h.max,g));d[h.id]=h.step>0?Math.round(v/h.step)*h.step:v}}),l.setCoreMath(d),l.handleInteractionEnd()},i=r=>{o(r);const l=z.getState(),c=l.geometry,d={};c.hybridMode&&(d.hybridScale=r>=1?1.5+Math.random()*1.5:Math.max(1,Math.min(3,c.hybridScale+(Math.random()*2-1)*2*r)),d.hybridMinR=r>=1?Math.random()*1:Math.max(0,Math.min(1.5,c.hybridMinR+(Math.random()*2-1)*1.5*r)),d.hybridFixedR=r>=1?.5+Math.random()*1.5:Math.max(.1,Math.min(3,c.hybridFixedR+(Math.random()*2-1)*2.9*r)),d.hybridFoldLimit=r>=1?.5+Math.random()*1.5:Math.max(.1,Math.min(2,c.hybridFoldLimit+(Math.random()*2-1)*1.9*r))),c.juliaMode&&(d.juliaX=r>=1?Math.random()*4-2:Math.max(-2,Math.min(2,c.juliaX+(Math.random()*2-1)*4*r)),d.juliaY=r>=1?Math.random()*4-2:Math.max(-2,Math.min(2,c.juliaY+(Math.random()*2-1)*4*r)),d.juliaZ=r>=1?Math.random()*4-2:Math.max(-2,Math.min(2,c.juliaZ+(Math.random()*2-1)*4*r))),c.preRotEnabled&&(d.preRotX=r>=1?(Math.random()*2-1)*Math.PI:Math.max(-Math.PI,Math.min(Math.PI,c.preRotX+(Math.random()*2-1)*Math.PI*2*r)),d.preRotY=r>=1?(Math.random()*2-1)*Math.PI:Math.max(-Math.PI,Math.min(Math.PI,c.preRotY+(Math.random()*2-1)*Math.PI*2*r)),d.preRotZ=r>=1?(Math.random()*2-1)*Math.PI:Math.max(-Math.PI,Math.min(Math.PI,c.preRotZ+(Math.random()*2-1)*Math.PI*2*r))),Object.keys(d).length>0&&l.setGeometry(d)};return[{label:"Import Options",action:()=>{},isHeader:!0},{label:"Lock Scene Settings",checked:e.lockSceneOnSwitch,action:()=>e.setLockSceneOnSwitch(!e.lockSceneOnSwitch)},{label:"Randomize",action:()=>{},isHeader:!0},{element:Ue.createElement(yu,{onRandomizeParams:o,onRandomizeFull:i}),keepOpen:!0,action:()=>{}},{label:"Formula Parameters",action:()=>{},isHeader:!0},{label:"Reset to Default",action:()=>{var l,c,d,f;const r=e.getPreset();e.handleInteractionStart("param"),e.loadPreset({...r,paramA:0,paramB:0,paramC:0,paramD:0,paramE:0,paramF:0,vec2A:[0,0],vec2B:[0,0],vec2C:[0,0],vec3A:[0,0,0],vec3B:[0,0,0],vec3C:[0,0,0],features:{...r.features,coreMath:((l=t==null?void 0:t.features)==null?void 0:l.coreMath)||((c=r.features)==null?void 0:c.coreMath),geometry:((d=t==null?void 0:t.features)==null?void 0:d.geometry)||((f=r.features)==null?void 0:f.geometry)}}),e.handleInteractionEnd()}},{label:"Reset to Formula Preset",action:()=>{var l,c,d,f,h,p,u,g,v;if(!t)return;const r=e.getPreset();e.handleInteractionStart("param"),e.loadPreset({...t,cameraPos:r.cameraPos,cameraRot:r.cameraRot,sceneOffset:r.sceneOffset,targetDistance:r.targetDistance,cameraMode:r.cameraMode,lights:r.lights,features:{...t.features||{},atmosphere:(l=r.features)==null?void 0:l.atmosphere,lighting:(c=r.features)==null?void 0:c.lighting,optics:(d=r.features)==null?void 0:d.optics,materials:(f=r.features)==null?void 0:f.materials,coreMath:(h=t.features)==null?void 0:h.coreMath,geometry:(p=t.features)==null?void 0:p.geometry,coloring:(u=t.features)==null?void 0:u.coloring,texturing:(g=t.features)==null?void 0:g.texturing,quality:(v=t.features)==null?void 0:v.quality}}),e.handleInteractionEnd()},disabled:!t},{label:"Scene Parameters",action:()=>{},isHeader:!0},{label:"Reset to Default",action:()=>{var c,d,f,h,p;const r=e.getPreset();e.handleInteractionStart("camera"),e.resetCamera();const l=(c=we.get("Mandelbulb"))==null?void 0:c.defaultPreset;l&&e.loadPreset({...r,cameraPos:l.cameraPos,cameraRot:l.cameraRot,sceneOffset:l.sceneOffset,targetDistance:l.targetDistance,features:{...r.features,atmosphere:(d=l.features)==null?void 0:d.atmosphere,lighting:(f=l.features)==null?void 0:f.lighting,optics:(h=l.features)==null?void 0:h.optics,materials:(p=l.features)==null?void 0:p.materials}}),e.handleInteractionEnd()}},{label:"Reset to Formula Preset",action:()=>{var l,c,d,f;if(!t)return;const r=e.getPreset();e.handleInteractionStart("camera"),e.loadPreset({...r,cameraPos:t.cameraPos,cameraRot:t.cameraRot,sceneOffset:t.sceneOffset,targetDistance:t.targetDistance,cameraMode:t.cameraMode,lights:t.lights,features:{...r.features,atmosphere:(l=t.features)==null?void 0:l.atmosphere,lighting:(c=t.features)==null?void 0:c.lighting,optics:(d=t.features)==null?void 0:d.optics,materials:(f=t.features)==null?void 0:f.materials}}),e.handleInteractionEnd()},disabled:!t}]}const vu=Ue.memo(({id:e,label:n})=>{const[t,o]=M.useState(!1),[i,s]=M.useState(!1),r=M.useRef(null);return M.useEffect(()=>{const l=r.current;if(!l)return;const c=new IntersectionObserver(d=>{d[0].isIntersecting&&(o(!0),c.disconnect())},{rootMargin:"50px"});return c.observe(l),()=>c.disconnect()},[]),i?null:a.jsx("div",{ref:r,className:"w-full h-full",children:t&&a.jsx("img",{src:`thumbnails/fractal_${e}.jpg`,alt:n,className:"w-full h-full object-cover",onError:()=>s(!0),loading:"lazy"})})}),wu=({rect:e,onClose:n,onSelect:t,currentValue:o,onImport:i,showImport:s,onImportFragmentarium:r})=>{var R;const[l,c]=M.useState(null),[d,f]=M.useState({opacity:0,pointerEvents:"none"}),[h,p]=M.useState({}),[u,g]=M.useState(!1),[v,y]=M.useState([]),[b,x]=M.useState(!1),[m,C]=M.useState(!1),[k,w]=M.useState(new Set);M.useEffect(()=>{(async()=>{x(!0);try{const N=await fetch("./gmf/gallery.json");if(N.ok){const L=await N.json();y(L.categories||[])}}catch(N){console.warn("Failed to load gallery:",N)}finally{x(!1)}})()},[]);const S=async I=>{try{const N=await fetch(I.path);if(N.ok){const L=await N.text();Y.emit(ge.IS_COMPILING,"Compiling Formula...");const{def:E,preset:D}=La(L);E?(we.get(E.id)||(we.register(E),Y.emit(ge.REGISTER_FORMULA,{id:E.id,shader:E.shader})),D.cameraRot||D.features?z.getState().loadPreset(D):t(E.id)):t(D.formula),n()}else console.error("Failed to load formula from gallery:",I.path),alert(`Failed to load formula: ${I.name}`)}catch(N){console.error("Error loading gallery formula:",N),Y.emit(ge.IS_COMPILING,!1),alert(`Error loading formula: ${I.name}`)}},j=M.useMemo(()=>{const I=we.getAll(),N=new Set(I.map(E=>E.id)),L=[];for(const E of vi){const D=E.match.filter(A=>N.has(A)?(N.delete(A),!0):!1);D.length>0&&L.push({name:E.name,items:D})}return N.size>0&&L.push({name:"Custom / Imported",items:Array.from(N)}),L},[]);return M.useLayoutEffect(()=>{const I=window.innerHeight,N=window.innerWidth,L=12,E=340,D=N<768;g(D);let A=e.left;A+E>N-L&&(A=N-E-L),A=Math.max(L,A);const T=I-e.bottom,G=e.top,H=T<300&&G>T;let W=H?G-L:T-L;const B=Math.min(600,Math.max(150,W)),_={position:"fixed",left:`${A}px`,width:`${E}px`,maxHeight:`${B}px`,maxWidth:`calc(100vw - ${L*2}px)`,zIndex:9999,display:"flex",flexDirection:"column",opacity:1,pointerEvents:"auto"},U=H?{bottom:`${I-e.top+4}px`,top:"auto",transformOrigin:"bottom left"}:{top:`${e.bottom+4}px`,bottom:"auto",transformOrigin:"top left"};f({..._,...U}),D||(N-(A+E)>260+20?p({left:"100%",marginLeft:"10px",top:H?"auto":0,bottom:H?0:"auto"}):p({right:"100%",marginRight:"10px",top:H?"auto":0,bottom:H?0:"auto"}))},[e]),M.useEffect(()=>{const I=()=>n(),N=E=>{E.target.closest(".portal-dropdown-content")||n()},L=E=>{E.target.closest(".portal-dropdown-content")||n()};return window.addEventListener("resize",I),window.addEventListener("mousedown",N,!0),window.addEventListener("wheel",L,!0),()=>{window.removeEventListener("resize",I),window.removeEventListener("mousedown",N,!0),window.removeEventListener("wheel",L,!0)}},[n]),Vt.createPortal(a.jsxs("div",{style:d,children:[a.jsxs("div",{className:"portal-dropdown-content bg-[#121212] border border-white/10 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-y-auto custom-scroll animate-fade-in-down w-full flex-1",onMouseLeave:()=>c(null),children:[s&&a.jsxs("div",{className:"p-1 border-b border-white/5 sticky top-0 bg-[#121212] z-50 space-y-1",children:[a.jsxs("button",{onClick:()=>{i(),n()},className:"w-full flex items-center justify-center gap-2 px-3 py-2 bg-cyan-900/20 hover:bg-cyan-900/40 text-cyan-400 text-[10px] font-bold rounded border border-cyan-500/20 hover:border-cyan-500/50 transition-colors",children:[a.jsx(Go,{}),"Import Formula (.GMF)"]}),a.jsxs("button",{onClick:()=>{r(),n()},className:"w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-900/20 hover:bg-purple-900/40 text-purple-400 text-[10px] font-bold rounded border border-purple-500/20 hover:border-purple-500/50 transition-colors",children:[a.jsx(wa,{}),"Formula Workshop"]})]}),j.map(I=>a.jsxs("div",{className:"py-1",children:[a.jsx("div",{className:`px-3 py-1.5 text-[9px] font-bold text-gray-500 bg-[#121212] border-y border-white/5 sticky z-40 shadow-sm ${s?"top-[38px]":"top-0"}`,children:I.name}),I.items.map(N=>{const L=N==="Modular",E=we.get(N),D=E?E.name:N,A=o===N;return a.jsxs("button",{onClick:()=>t(N),onMouseEnter:()=>c(N),className:`w-full text-left px-3 py-2.5 transition-all flex gap-3 group relative border-b border-white/5 last:border-b-0 ${A?"bg-cyan-900/20":"hover:bg-white/5"}`,children:[a.jsxs("div",{className:"w-16 h-10 shrink-0 bg-black rounded border border-white/10 overflow-hidden relative group-hover:border-cyan-500/50 transition-colors",children:[a.jsx("div",{className:"absolute inset-0 flex items-center justify-center text-gray-800 bg-gray-900 z-0",children:L?a.jsx(Uo,{}):a.jsx(Na,{})}),!L&&a.jsx("div",{className:"relative z-10 w-full h-full",children:a.jsx(vu,{id:N,label:D})}),A&&a.jsx("div",{className:"absolute inset-0 z-20 bg-cyan-500/20 flex items-center justify-center",children:a.jsx("div",{className:"w-4 h-4 bg-white rounded-full flex items-center justify-center text-cyan-900 shadow-lg",children:a.jsx(Rt,{})})})]}),a.jsxs("div",{className:"flex flex-col min-w-0 flex-1 justify-center",children:[a.jsx("div",{className:"flex items-center gap-2 mb-0.5",children:a.jsx("span",{className:`text-[11px] font-bold tracking-tight truncate ${A?"text-cyan-400":"text-gray-200 group-hover:text-white"} ${L?"text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300 font-bold":""}`,children:D})}),(E==null?void 0:E.shortDescription)&&a.jsx("p",{className:"text-[9px] text-gray-500 line-clamp-2 leading-tight group-hover:text-gray-400",children:E.shortDescription})]})]},N)})]},I.name)),v.length>0&&a.jsxs("div",{className:"py-1 border-t border-white/10",children:[a.jsx("div",{className:"px-3 py-1.5 text-[9px] font-bold text-gray-500 bg-[#121212] sticky z-40 shadow-sm top-[38px]",children:"Add from Gallery"}),v.map(I=>a.jsxs("div",{className:"border-b border-white/5",children:[a.jsxs("button",{onClick:()=>{w(N=>{const L=new Set(N);return L.has(I.id)?L.delete(I.id):L.add(I.id),L})},className:"w-full text-left px-3 py-2 flex items-center gap-2 group hover:bg-white/5 transition-colors",children:[a.jsx("span",{className:`w-3 h-3 text-gray-500 transition-transform ${k.has(I.id)?"rotate-180":""}`,children:a.jsx(ia,{})}),a.jsx("span",{className:"text-[11px] font-bold text-purple-400 group-hover:text-purple-300",children:I.name}),a.jsxs("span",{className:"text-[9px] text-gray-600",children:["(",I.items.length," formulas)"]})]}),k.has(I.id)&&a.jsx("div",{className:"bg-black/30",children:I.items.map(N=>a.jsxs("button",{onClick:()=>S(N),onMouseEnter:()=>c(N.id),className:"w-full text-left px-6 py-2 transition-all flex gap-3 group hover:bg-white/5",children:[a.jsx("div",{className:"w-16 h-8 shrink-0 bg-black rounded border border-white/10 overflow-hidden relative group-hover:border-purple-500/50 transition-colors",children:a.jsx("div",{className:"absolute inset-0 flex items-center justify-center text-gray-800 bg-gray-900 z-0",children:a.jsx(an,{})})}),a.jsx("div",{className:"flex flex-col min-w-0 flex-1 justify-center",children:a.jsx("span",{className:"text-[11px] font-bold tracking-tight truncate text-gray-200 group-hover:text-white",children:N.name})})]},N.id))})]},I.id))]}),b&&a.jsx("div",{className:"py-2 text-center text-[10px] text-gray-500",children:"Loading gallery..."})]}),l&&l!=="Modular"&&!u&&a.jsxs("div",{className:"absolute w-[256px] h-[256px] bg-black border border-cyan-500/50 rounded-lg shadow-[0_0_50px_rgba(0,0,0,1),0_0_20px_rgba(34,211,238,0.2)] overflow-hidden animate-fade-in pointer-events-none z-[10000]",style:h,children:[a.jsx("img",{src:`thumbnails/fractal_${l}.jpg`,className:"w-full h-full object-cover",alt:"Preview",onError:I=>I.currentTarget.parentElement.style.display="none"}),a.jsx("div",{className:"absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,4px_100%] pointer-events-none"}),a.jsx("div",{className:"absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4",children:a.jsx("div",{className:"text-[10px] font-bold text-cyan-400 drop-shadow-md",children:((R=we.get(l))==null?void 0:R.name)||l})})]})]}),document.body)},Su=({value:e,onChange:n})=>{var w;const[t,o]=M.useState(!1),i=z(S=>S.openWorkshop),s=M.useRef(null),r=M.useRef(null),[l,c]=M.useState(null),d=z(S=>S.openContextMenu),f=z(S=>S.setExportIncludeScene),h=z(S=>S.exportIncludeScene),p=z(S=>S.advancedMode),u=S=>{S.preventDefault(),S.stopPropagation();const j=Tr();d(S.clientX,S.clientY,j,[])},g=()=>{!t&&s.current?(c(s.current.getBoundingClientRect()),o(!0)):o(!1)},v=S=>{const j=we.get(e);if(!j)return;const R=z.getState().getPreset({includeScene:S}),I=wi(j,R),N=new Blob([I],{type:"text/plain"}),L=URL.createObjectURL(N),E=document.createElement("a");E.href=L,E.download=`${j.id}${S?"_Full":""}.gmf`,E.click(),URL.revokeObjectURL(L)},y=S=>{S.stopPropagation(),v(h)},b=S=>{S.preventDefault(),S.stopPropagation();const j=[{label:"Export Options",action:()=>{},isHeader:!0},{label:"Include Scene Data",checked:h,action:()=>f(!h)},{label:"Actions",action:()=>{},isHeader:!0},{label:"Export Formula Only",action:()=>v(!1)},{label:"Export Full Package",action:()=>v(!0)}];d(S.clientX,S.clientY,j,[])},x=S=>{var I;const j=(I=S.target.files)==null?void 0:I[0];if(!j)return;const R=new FileReader;R.onload=N=>{var L;try{const E=(L=N.target)==null?void 0:L.result;Y.emit(ge.IS_COMPILING,"Compiling Formula...");const{def:D,preset:A}=La(E);D?(we.get(D.id)||(we.register(D),Y.emit(ge.REGISTER_FORMULA,{id:D.id,shader:D.shader})),A.cameraRot||A.features?z.getState().loadPreset(A):n(D.id)):n(A.formula),r.current&&(r.current.value="")}catch(E){console.error("Failed to import formula:",E),Y.emit(ge.IS_COMPILING,!1),alert("Invalid formula file. Ensure it is a valid .gmf or .json definition.")}},R.readAsText(j)},m=we.get(e),C=m?m.name:e,k=e==="Modular";return a.jsxs("div",{className:"flex gap-2",children:[a.jsx("input",{ref:r,type:"file",accept:".json,.gmf",className:"hidden",onChange:x}),a.jsxs("button",{ref:s,onClick:g,onContextMenu:u,className:`flex-1 flex items-center justify-between border text-xs text-white rounded-lg p-2.5 outline-none transition-all group ${t?"bg-gray-900 border-cyan-500 ring-1 ring-cyan-900":k?"bg-gray-900 border-purple-500/50 shadow-[inset_0_0_10px_rgba(168,85,247,0.1)]":"bg-gradient-to-t from-white/[0.06] to-white/[0.03] border-white/10 hover:border-white/20 shadow-[inset_0_-1px_0_rgba(255,255,255,0.04)]"}`,children:[a.jsxs("div",{className:"flex items-center gap-2",children:[k&&a.jsx("span",{className:"flex w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_5px_#a855f7]"}),a.jsx("span",{className:`font-bold ${k?"text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300":""}`,children:C})]}),a.jsx("div",{className:`w-3 h-3 text-gray-500 transition-transform ${t?"rotate-180":""}`,children:a.jsx(ia,{})})]}),!k&&p&&a.jsx("button",{onClick:y,onContextMenu:b,className:"w-8 flex items-center justify-center bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.08] text-gray-400 hover:text-white rounded-lg transition-colors",title:h?"Export Full Preset (Right-click for options)":"Export Formula Only (Right-click for options)",children:a.jsx(zo,{})}),((w=we.get(e))==null?void 0:w.importSource)&&a.jsx("button",{onClick:()=>i(e),className:"w-8 flex items-center justify-center bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.08] text-gray-400 hover:text-white rounded-lg transition-colors",title:"Re-edit imported formula in Workshop",children:a.jsx(wa,{})}),t&&l&&a.jsx(wu,{rect:l,currentValue:e,onClose:()=>o(!1),onSelect:S=>{n(S),o(!1)},onImport:()=>{var S;return(S=r.current)==null?void 0:S.click()},showImport:p,onImportFragmentarium:()=>i(void 0)})]})},Mu=({shape:e,period:n,phase:t,amplitude:o,enabled:i})=>{const s=M.useRef(null);return M.useEffect(()=>{const r=s.current;if(!r)return;const l=r.getContext("2d");if(!l)return;const c=r.width,d=r.height;if(l.clearRect(0,0,c,d),l.strokeStyle="#222",l.lineWidth=1,l.beginPath(),l.moveTo(0,d/2),l.lineTo(c,d/2),l.stroke(),!i)return;l.strokeStyle="#8b5cf6",l.lineWidth=2,l.beginPath();const f=120,h=5;for(let p=0;p<=f;p++){const u=p/f,g=(u*h/n+t)%1;let v=0;e==="Sine"?v=Math.sin(g*Math.PI*2):e==="Triangle"?v=1-Math.abs(g*2-1)*2:e==="Sawtooth"?v=g*2-1:e==="Pulse"?v=g<.5?1:-1:e==="Noise"&&(v=Math.sin(g*50)*Math.cos(g*12));const y=d/2-v*Math.min(1.5,o)*(d/4);p===0?l.moveTo(u*c,y):l.lineTo(u*c,y)}l.stroke()},[e,n,t,o,i]),a.jsxs("div",{className:"relative h-12 bg-black/40 rounded border border-white/5 mb-3 overflow-hidden",children:[a.jsx("canvas",{ref:s,width:280,height:48,className:"w-full h-full"}),a.jsx("div",{className:"absolute top-1 left-2 text-[7px] font-bold text-purple-400/50 pointer-events-none",children:"Signal (5 second window)"})]})},Er={cyan:{activeBg:"bg-cyan-900/10",activeBorder:"border-cyan-500/20",activeText:"text-cyan-400",activeLabel:"text-cyan-300",itemBorder:"border-cyan-500/10",itemActiveBg:"bg-cyan-500/[0.03]",selectedBg:"bg-cyan-500/20",selectedBorder:"border-cyan-500/40",selectedText:"text-cyan-300",addBg:"bg-cyan-500/20",addBorder:"border-cyan-500/50",addText:"text-cyan-300",addHoverBg:"hover:bg-cyan-500",searchFocus:"focus:border-cyan-500/50"},purple:{activeBg:"bg-purple-900/10",activeBorder:"border-purple-500/20",activeText:"text-purple-400",activeLabel:"text-purple-300",itemBorder:"border-purple-500/10",itemActiveBg:"bg-purple-500/[0.03]",selectedBg:"bg-purple-500/20",selectedBorder:"border-purple-500/40",selectedText:"text-purple-300",addBg:"bg-purple-500/20",addBorder:"border-purple-500/50",addText:"text-purple-300",addHoverBg:"hover:bg-purple-500",searchFocus:"focus:border-purple-500/50"},amber:{activeBg:"bg-amber-900/10",activeBorder:"border-amber-500/20",activeText:"text-amber-400",activeLabel:"text-amber-300",itemBorder:"border-amber-500/10",itemActiveBg:"bg-amber-500/[0.03]",selectedBg:"bg-amber-500/20",selectedBorder:"border-amber-500/40",selectedText:"text-amber-300",addBg:"bg-amber-500/20",addBorder:"border-amber-500/50",addText:"text-amber-300",addHoverBg:"hover:bg-amber-500",searchFocus:"focus:border-amber-500/50"}},Cu=({open:e})=>a.jsx("svg",{className:`w-2 h-2 transition-transform ${e?"rotate-90":""}`,viewBox:"0 0 6 10",fill:"currentColor",children:a.jsx("path",{d:"M0 0l6 5-6 5z"})}),ku=({children:e,title:n,titleColor:t,subtitle:o,accent:i="cyan",selected:s=!1,expandable:r=!1,defaultExpanded:l=!0,expanded:c,onToggleExpand:d,onSelect:f,onRemove:h,actions:p,className:u=""})=>{const g=Er[i],[v,y]=M.useState(l),b=c!==void 0,x=b?c:v,m=()=>{d&&d(),b||y(w=>!w)},C=s?g.selectedBorder:g.itemBorder,k=s?g.selectedBg:"bg-black/40";return a.jsxs("div",{className:`${k} rounded border ${C} animate-fade-in transition-colors ${u}`,children:[(n||p||h||r)&&a.jsxs("div",{className:`flex items-center justify-between px-2 min-h-[26px] mb-0.5 ${f?"cursor-pointer hover:bg-white/5":""}`,onClick:f,children:[a.jsxs("div",{className:"flex items-center gap-1.5 min-w-0",children:[r&&a.jsx("button",{onClick:w=>{w.stopPropagation(),m()},className:"shrink-0 text-gray-600 hover:text-gray-300 transition-colors p-0.5",children:a.jsx(Cu,{open:x})}),n&&a.jsx("span",{className:`text-[9px] font-bold truncate ${t||(s?g.selectedText:"text-gray-500")}`,children:n}),o&&a.jsx("span",{className:"text-[8px] text-gray-600 truncate",children:o})]}),a.jsxs("div",{className:"flex items-center gap-2 shrink-0",children:[h&&a.jsx("button",{onClick:w=>{w.stopPropagation(),h()},className:"text-red-500 hover:text-white transition-colors opacity-50 hover:opacity-100",title:"Remove",children:a.jsx(zt,{})}),p]})]}),r?x&&a.jsx("div",{className:"animate-fade-in px-2 pb-2",children:e}):a.jsx("div",{className:n||p||h?"px-2 pb-2":"p-2",children:e})]})},ju=({label:e,children:n,accent:t="cyan",isActive:o=!1,onAdd:i,addDisabled:s=!1,addTitle:r="Add item",maxHeight:l,count:c,emptyMessage:d="No items",headerRight:f,className:h="","data-help-id":p})=>{const u=Er[t],v=Ue.Children.toArray(n).length===0;return a.jsxs("div",{className:`flex flex-col border-t border-white/5 ${o?u.activeBg:"bg-white/[0.02]"} ${h}`,"data-help-id":p,children:[a.jsxs("div",{className:`flex items-center justify-between px-3 py-2 border-b ${o?u.activeBorder:"border-white/5"}`,children:[a.jsxs("div",{className:"flex items-center gap-1.5",children:[a.jsx("label",{className:`text-[10px] font-bold ${o?u.activeLabel:"text-gray-500"}`,children:e}),c!==void 0&&a.jsx("span",{className:"text-[8px] bg-white/10 text-gray-400 px-1.5 py-0.5 rounded",children:c})]}),a.jsxs("div",{className:"flex items-center gap-1.5",children:[f,i&&a.jsx("button",{onClick:i,disabled:s,className:`w-5 h-5 flex items-center justify-center rounded border disabled:opacity-30 transition-all ${o?`${u.addBg} ${u.addBorder} ${u.addText} ${u.addHoverBg} hover:text-white`:"bg-white/10 border-white/10 text-gray-400 hover:bg-white/20 hover:text-white"}`,title:r,children:a.jsx(Ea,{})})]})]}),a.jsx("div",{className:"flex flex-col gap-1 p-2 overflow-y-auto custom-scroll",style:l?{maxHeight:typeof l=="number"?`${l}px`:l}:void 0,children:v?a.jsx("p",{className:"text-[9px] text-gray-600 italic text-center py-3",children:d}):n})]})},Ru=({state:e,actions:n})=>{const t=()=>{if(e.animations.length>=3)return;const r={id:nt(),enabled:!0,target:"coreMath.paramA",shape:"Sine",period:5,amplitude:1,baseValue:e.coreMath.paramA,phase:0,smoothing:.5};n.setAnimations([...e.animations,r])},o=r=>{n.setAnimations(e.animations.filter(l=>l.id!==r))},i=(r,l)=>{n.setAnimations(e.animations.map(c=>c.id===r?{...c,...l}:c))},s=e.animations.some(r=>r.enabled);return a.jsx(ju,{label:"LFO Modulators",accent:"purple",isActive:s,onAdd:t,addDisabled:e.animations.length>=3,addTitle:"Add LFO (Max 3)","data-help-id":"lfo.system",children:e.animations.map((r,l)=>a.jsx(ku,{title:`LFO ${l+1}`,titleColor:"text-purple-400/50",accent:"purple",onRemove:()=>o(r.id),actions:a.jsx("div",{className:"w-[60px]",children:a.jsx(Ve,{value:r.enabled,onChange:c=>i(r.id,{enabled:c}),color:"bg-purple-600"})}),children:r.enabled&&a.jsxs("div",{className:"animate-fade-in",children:[a.jsx(Mu,{...r}),a.jsxs("div",{className:"grid grid-cols-2 gap-1 mb-1",children:[a.jsxs("div",{children:[a.jsx("label",{className:"text-[9px] text-gray-500 font-bold block mb-0.5",children:"Target"}),a.jsx(Mr,{value:r.target,onChange:c=>{let d=0;if(c.includes(".")){const[f,h]=c.split("."),p=e[f],u=h.match(/^(vec[23][ABC])_(x|y|z)$/);if(u&&p){const g=u[1],v=u[2],y=p[g];y&&typeof y=="object"&&(d=y[v]||0)}else p&&p[h]!==void 0&&(d=p[h])}i(r.id,{target:c,baseValue:d})},className:"w-full"})]}),a.jsxs("div",{children:[a.jsx("label",{className:"text-[9px] text-gray-500 font-bold block mb-0.5",children:"Shape"}),a.jsxs("select",{value:r.shape,onChange:c=>i(r.id,{shape:c.target.value}),className:"t-select text-white focus:border-purple-500",children:[a.jsx("option",{value:"Sine",children:"Sine"}),a.jsx("option",{value:"Triangle",children:"Triangle"}),a.jsx("option",{value:"Sawtooth",children:"Sawtooth"}),a.jsx("option",{value:"Pulse",children:"Pulse"}),a.jsx("option",{value:"Noise",children:"Noise"})]})]})]}),a.jsxs("div",{className:"space-y-0",children:[a.jsx(fe,{label:"Period (Sec)",value:r.period,min:.1,max:30,step:.1,hardMin:.01,onChange:c=>i(r.id,{period:c})}),a.jsx(fe,{label:"Strength",value:r.amplitude,min:.001,max:10,step:.001,onChange:c=>i(r.id,{amplitude:c}),customMapping:{min:0,max:100,toSlider:c=>(Math.log10(Math.max(.001,c))+3)/4*100,fromSlider:c=>Math.pow(10,c/100*4-3)},overrideInputText:r.amplitude<.1?r.amplitude.toFixed(3):r.amplitude.toFixed(2)}),e.advancedMode&&a.jsx(fe,{label:"Phase Offset",value:r.phase,min:0,max:1,step:.01,onChange:c=>i(r.id,{phase:c}),customMapping:{min:0,max:360,toSlider:c=>c*360,fromSlider:c=>c/360},mapTextInput:!0,overrideInputText:`${(r.phase*360).toFixed(0)}°`}),a.jsx(fe,{label:"Smoothing",value:r.smoothing,min:0,max:1,step:.01,onChange:c=>i(r.id,{smoothing:c})})]})]})},r.id))})},Lr=({label:e,featureId:n,toggleParam:t,children:o,description:i,statusContent:s,headerClassName:r="",enabled:l,onToggle:c})=>{var y;const d=z(),f=ne.get(n),h=t||((y=f==null?void 0:f.engineConfig)==null?void 0:y.toggleParam),p=d[n],u=h?!!(p!=null&&p[h]):!0,g=l!==void 0?l:u,v=b=>{var C;if(c){c(b);return}const x=`set${n.charAt(0).toUpperCase()+n.slice(1)}`,m=d[x];m&&h&&(((C=f==null?void 0:f.engineConfig)==null?void 0:C.mode)==="compile"?(Y.emit("is_compiling","Updating Engine..."),setTimeout(()=>{m({[h]:b})},50)):m({[h]:b}))};return a.jsxs("div",{className:"flex flex-col border-t border-white/5",children:[a.jsxs("div",{className:`flex items-center justify-between px-3 py-1 ${g?"bg-neutral-800":"bg-neutral-800/50 cursor-pointer hover:bg-white/5"} ${r}`,onClick:g?void 0:()=>v(!0),children:[a.jsxs("div",{className:"flex items-center gap-1.5",children:[a.jsx("span",{className:`text-[10px] font-bold ${g?"text-gray-300":"text-gray-600"}`,children:e}),!g&&a.jsx("span",{className:"text-[8px] text-gray-600",children:"off"}),s]}),a.jsx("div",{className:"w-10",onClick:b=>b.stopPropagation(),children:a.jsx(Ve,{value:g,onChange:v})})]}),g&&a.jsxs("div",{children:[i&&a.jsx("p",{className:"px-3 py-1.5 text-[9px] text-gray-600 leading-tight bg-white/[0.06] hover:text-gray-300 transition-colors cursor-default",children:i}),o]})]})},Nr=e=>{const{featureId:n}=e,t=ne.get(n),o=t==null?void 0:t.panelConfig,i=e.compileParam??(o==null?void 0:o.compileParam)??"",s=e.runtimeToggleParam??(o==null?void 0:o.runtimeToggleParam),r=e.compileSettingsParams??(o==null?void 0:o.compileSettingsParams),l=e.runtimeGroup??(o==null?void 0:o.runtimeGroup),c=e.runtimeExcludeParams??(o==null?void 0:o.runtimeExcludeParams),d=e.label??(o==null?void 0:o.label)??(t==null?void 0:t.name)??n,f=e.compileMessage??(o==null?void 0:o.compileMessage)??"Compiling Shader...",h=e.helpId??(o==null?void 0:o.helpId),p=z(),u=p[n],g=!!(u!=null&&u[i]),v=s?!!(u!=null&&u[s]):g,y=`set${n.charAt(0).toUpperCase()+n.slice(1)}`,b=p[y],[x,m]=M.useState({}),C=Object.keys(x).length>0,k=v&&(!g||C),w=M.useMemo(()=>{if(!(r!=null&&r.length))return u;const D={...u,...x};return D[i]=!0,s&&(D[s]=!0),D},[u,x,i,s,r]),S=M.useCallback(D=>{b&&(s?b({[s]:D}):(Y.emit("is_compiling",f),setTimeout(()=>b({[i]:D}),50)))},[b,s,i,f]),j=M.useCallback((D,A)=>{m(T=>{const G={...T,[D]:A};return(u==null?void 0:u[D])===A&&delete G[D],G})},[u]),R=M.useCallback(()=>{b&&(Y.emit("is_compiling",f),setTimeout(()=>{const D={...x};g||(D[i]=!0),b(D),m({})},50))},[b,x,g,i,f]),I=M.useCallback(()=>{z.getState().movePanel("Engine","left"),setTimeout(()=>{g||Y.emit("engine_queue",{featureId:n,param:i,value:!0});for(const[D,A]of Object.entries(x))Y.emit("engine_queue",{featureId:n,param:D,value:A});m({})},50)},[n,i,g,x]),N=a.jsxs(a.Fragment,{children:[v&&g&&!C&&a.jsx(Ia,{status:"active"}),v&&k&&a.jsx(Ia,{status:"pending"})]}),L=M.useMemo(()=>{const D=new Set(c??[]);return D.add(i),s&&D.add(s),r==null||r.forEach(A=>D.add(A)),Array.from(D)},[i,s,c,r]),E=r&&r.length>0;return a.jsx("div",{"data-help-id":h,children:a.jsx(Lr,{label:d,featureId:n,enabled:v,onToggle:S,statusContent:N,headerClassName:g?"":"bg-transparent",children:a.jsxs("div",{className:"bg-white/[0.02]",children:[v&&!g&&!E&&a.jsx(Do,{isCompiled:!1,onCompile:R,onOpenEngine:I}),E&&a.jsx(Dt,{label:"Compile Settings",defaultOpen:!g,variant:"panel",children:a.jsxs("div",{children:[a.jsx(se,{featureId:n,whitelistParams:r,forcedState:w,onChangeOverride:j}),k&&a.jsx(Do,{isCompiled:g,onCompile:R,onOpenEngine:I})]})}),g&&(E?a.jsx(Dt,{label:"Parameters",defaultOpen:!0,variant:"panel",children:a.jsx(se,{featureId:n,groupFilter:l,excludeParams:L})}):a.jsx(se,{featureId:n,groupFilter:l,excludeParams:L}))]})})})},Iu=()=>a.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:a.jsx("polygon",{points:"13 2 3 14 12 14 11 22 21 10 12 10 13 2"})}),Do=({isCompiled:e,onCompile:n,onOpenEngine:t})=>a.jsxs("div",{className:`flex items-center justify-between px-2 py-1 mt-1 ${Si} rounded`,children:[a.jsxs("div",{className:`flex items-center gap-1.5 ${pt.text}`,children:[a.jsx(qt,{}),a.jsx(ze,{variant:"secondary",color:pt.text,children:e?"Settings changed":"Not compiled"})]}),a.jsxs("div",{className:"flex items-center gap-1",children:[t&&a.jsx("button",{onClick:o=>{o.stopPropagation(),t()},className:"p-1 text-gray-500 hover:text-amber-400 transition-colors",title:"Open Engine Panel",children:a.jsx(Iu,{})}),a.jsx("button",{onClick:n,className:`px-3 py-0.5 ${pt.btnBg} ${pt.btnHover} ${pt.btnText} text-[9px] font-bold rounded transition-colors`,children:e?"Recompile":"Compile"})]})]}),_o=xe(),Pu=({state:e,actions:n,onSwitchTab:t})=>{var p;const o=z(u=>u.openContextMenu),[i,s]=M.useState(null);M.useEffect(()=>{const u=Y.on("compile_time",g=>{s(`Loaded in ${g.toFixed(2)}s`),setTimeout(()=>s(null),5e3)});return _o.lastCompileDuration>0&&(s(`Loaded in ${_o.lastCompileDuration.toFixed(2)}s`),setTimeout(()=>s(null),3e3)),u},[]),e.debugMobileLayout||typeof window<"u"&&window.innerWidth<768;const r=e.coreMath;if(!r||!e.formula)return null;const l=u=>{u.preventDefault(),u.stopPropagation();const g=Xe(u.target);if(e.formula){const y=`formula.${e.formula.toLowerCase()}`;g.includes(y)||g.unshift(y)}const v=Tr();o(u.clientX,u.clientY,v,g)},d=(()=>{if(e.formula==="Modular"){const g=["ParamA","ParamB","ParamC","ParamD","ParamE","ParamF"],v={};return e.pipeline.forEach(y=>{if(!y.enabled||!y.bindings)return;const b=je.get(y.type);Object.entries(y.bindings).forEach(([x,m])=>{if(m&&g.includes(m)){v[m]||(v[m]={labels:[],min:-5,max:5,step:.01});const C=b==null?void 0:b.inputs.find(k=>k.id===x);C?v[m].labels.push(`${y.type}: ${C.label}`):v[m].labels.push(`${y.type}: ${x}`)}})}),g.map(y=>{const b=v[y],x=y.charAt(0).toLowerCase()+y.slice(1);if(!b)return null;const m=b.labels.length>1?`${y} (Mixed)`:b.labels[0]||y;let C=0,k=w=>{};switch(x){case"paramA":C=r.paramA,k=w=>n.setCoreMath({paramA:w});break;case"paramB":C=r.paramB,k=w=>n.setCoreMath({paramB:w});break;case"paramC":C=r.paramC,k=w=>n.setCoreMath({paramC:w});break;case"paramD":C=r.paramD,k=w=>n.setCoreMath({paramD:w});break;case"paramE":C=r.paramE,k=w=>n.setCoreMath({paramE:w});break;case"paramF":C=r.paramF,k=w=>n.setCoreMath({paramF:w});break}return{label:m,val:C,set:k,min:-5,max:5,step:.01,def:0,id:x,trackId:`coreMath.${x}`,scale:"linear"}})}const u=we.get(e.formula);return u?u.parameters.map(g=>{if(!g)return null;if(g.type==="vec3"){let b=r.vec3A,x=m=>n.setCoreMath({vec3A:m});switch(g.id){case"vec3A":b=r.vec3A,x=m=>n.setCoreMath({vec3A:m});break;case"vec3B":b=r.vec3B,x=m=>n.setCoreMath({vec3B:m});break;case"vec3C":b=r.vec3C,x=m=>n.setCoreMath({vec3C:m});break}return{label:g.label,val:b,set:x,min:g.min,max:g.max,step:g.step,def:g.default,id:g.id,trackId:`coreMath.${g.id}`,type:"vec3",mode:g.mode,linkable:g.linkable,scale:g.scale}}if(g.type==="vec4"){let b=r.vec4A,x=m=>n.setCoreMath({vec4A:m});switch(g.id){case"vec4A":b=r.vec4A,x=m=>n.setCoreMath({vec4A:m});break;case"vec4B":b=r.vec4B,x=m=>n.setCoreMath({vec4B:m});break;case"vec4C":b=r.vec4C,x=m=>n.setCoreMath({vec4C:m});break}return{label:g.label,val:b,set:x,min:g.min,max:g.max,step:g.step,def:g.default,id:g.id,trackId:`coreMath.${g.id}`,type:"vec4",mode:g.mode,linkable:g.linkable,scale:g.scale}}if(g.type==="vec2"){let b=r.vec2A,x=m=>n.setCoreMath({vec2A:m});switch(g.id){case"vec2A":b=r.vec2A,x=m=>n.setCoreMath({vec2A:m});break;case"vec2B":b=r.vec2B,x=m=>n.setCoreMath({vec2B:m});break;case"vec2C":b=r.vec2C,x=m=>n.setCoreMath({vec2C:m});break}return{label:g.label,val:b,set:x,min:g.min,max:g.max,step:g.step,def:g.default,id:g.id,trackId:`coreMath.${g.id}`,type:"vec2",mode:g.mode,linkable:g.linkable,scale:g.scale}}let v=0,y=b=>{};switch(g.id){case"paramA":v=r.paramA,y=b=>n.setCoreMath({paramA:b});break;case"paramB":v=r.paramB,y=b=>n.setCoreMath({paramB:b});break;case"paramC":v=r.paramC,y=b=>n.setCoreMath({paramC:b});break;case"paramD":v=r.paramD,y=b=>n.setCoreMath({paramD:b});break;case"paramE":v=r.paramE,y=b=>n.setCoreMath({paramE:b});break;case"paramF":v=r.paramF,y=b=>n.setCoreMath({paramF:b});break}return{label:g.label,val:v,set:y,min:g.min,max:g.max,step:g.step,def:g.default,id:g.id,trackId:`coreMath.${g.id}`,scale:g.scale,options:g.options}}):[{label:"Power (N)",val:r.paramA,set:g=>n.setCoreMath({paramA:g}),min:2,max:16,step:.001,def:8,id:"paramA",trackId:"coreMath.paramA"},null,null,null]})(),f=u=>{if(!u)return null;if(u.type==="vec3"){const b=u.val,x=new V(b.x,b.y,b.z),m=[`${u.trackId}_x`,`${u.trackId}_y`,`${u.trackId}_z`],C=[`${u.label} X`,`${u.label} Y`,`${u.label} Z`],k=u.mode||"normal",w=k==="rotation"||k==="direction"||k==="axes",S={rotation:["Azimuth","Pitch","Angle"],direction:["Azimuth","Pitch","Length"],axes:[`${u.label} X`,`${u.label} Y`,`${u.label} Z`]};return a.jsx("div",{className:"mb-px",children:a.jsx(oa,{label:u.label,value:x,min:w?-Math.PI*2:u.min,max:w?Math.PI*2:u.max,step:u.step,onChange:u.set,trackKeys:m,trackLabels:w&&S[k]||C,mode:k==="axes"?"normal":k,defaultValue:u.def?new V(u.def.x??0,u.def.y??0,u.def.z??0):void 0,linkable:u.linkable,scale:u.scale})},u.id)}if(u.type==="vec4"){const b=u.val,x=new Nt(b.x,b.y,b.z,b.w),m=[`${u.trackId}_x`,`${u.trackId}_y`,`${u.trackId}_z`,`${u.trackId}_w`],C=[`${u.label} X`,`${u.label} Y`,`${u.label} Z`,`${u.label} W`];return a.jsx("div",{className:"mb-px",children:a.jsx(pr,{label:u.label,value:x,min:u.min,max:u.max,step:u.step,onChange:u.set,trackKeys:m,trackLabels:C,defaultValue:u.def?new Nt(u.def.x??0,u.def.y??0,u.def.z??0,u.def.w??0):void 0,linkable:u.linkable,scale:u.scale})},u.id)}if(u.type==="vec2"){const b=u.val,x=[`${u.trackId}_x`,`${u.trackId}_y`],m=[`${u.label} X`,`${u.label} Y`];return a.jsx("div",{className:"mb-px",children:a.jsx(fr,{label:u.label,value:new Te(b.x,b.y),min:u.min,max:u.max,step:u.step,onChange:C=>u.set({x:C.x,y:C.y}),trackKeys:x,trackLabels:m,defaultValue:u.def?new Te(u.def.x??0,u.def.y??0):void 0,linkable:u.linkable,mode:u.mode,scale:u.scale})},u.id)}const g=u.val;if(u.options)return a.jsx("div",{className:"mb-px",children:a.jsx(Wt,{label:u.label,value:g,options:u.options,onChange:b=>u.set(b),fullWidth:!0})},u.id);const v=e.liveModulations[u.trackId]??e.liveModulations[u.id],y=e.animations.some(b=>b.enabled&&(b.target===u.trackId||b.target===u.id));if(u.scale==="pi")return a.jsx(fe,{label:u.label,value:g,min:u.min,max:u.max,step:.01,onChange:u.set,defaultValue:u.def,highlight:y||u.id==="paramA"&&!y,trackId:u.trackId,liveValue:v,customMapping:{min:u.min/Math.PI,max:u.max/Math.PI,toSlider:b=>b/Math.PI,fromSlider:b=>b*Math.PI},mapTextInput:!0,overrideInputText:`${(g/Math.PI).toFixed(2)}π`},u.id);if(u.scale==="degrees"){const b=.005555555555555556;return a.jsx(fe,{label:u.label,value:g,min:u.min,max:u.max,step:u.step,onChange:u.set,defaultValue:u.def,highlight:y||u.id==="paramA"&&!y,trackId:u.trackId,liveValue:v,customMapping:{min:u.min*b,max:u.max*b,toSlider:x=>x*b,fromSlider:x=>x/b},mapTextInput:!0,overrideInputText:`${(g*b).toFixed(2)}π`},u.id)}return a.jsx(fe,{label:u.label,value:g,min:u.min,max:u.max,step:u.step,onChange:u.set,defaultValue:u.def,highlight:y||u.id==="paramA"&&!y,trackId:u.trackId,liveValue:v},u.id)},h=u=>{n.setFormula(u),u==="Modular"&&t&&t("Graph")};return a.jsxs("div",{className:"animate-fade-in -mx-4 -mt-4 min-h-full flex flex-col",onContextMenu:l,children:[a.jsxs("div",{className:`${_t.panelHeader} border-b ${tt.subtle} p-4 pb-3`,"data-help-id":"formula.active",children:[a.jsxs("div",{className:"flex justify-between items-baseline mb-1",children:[a.jsx(ze,{color:Mt.dimLabel,children:"Active Formula"}),i&&a.jsx("span",{className:`text-[9px] ${Mt.dimLabel} animate-fade-in`,children:i})]}),a.jsx(Su,{value:e.formula,onChange:h})]}),a.jsxs("div",{className:"flex flex-col","data-help-id":`panel.formula formula.${((p=e.formula)==null?void 0:p.toLowerCase())||"mandelbulb"}`,children:[a.jsx(fe,{label:"Iterations",value:r.iterations,min:1,max:500,step:1,onChange:u=>n.setCoreMath({iterations:Math.round(u)}),highlight:!0,defaultValue:32,customMapping:{min:0,max:100,toSlider:u=>100*Math.pow((u-1)/499,1/3),fromSlider:u=>1+499*Math.pow(u/100,3)},mapTextInput:!1,trackId:"coreMath.iterations",liveValue:e.liveModulations["coreMath.iterations"]}),a.jsx(a.Fragment,{children:d.map(u=>f(u))})]}),a.jsx(et,{}),a.jsx("div",{className:`border-t ${tt.subtle}`,"data-help-id":"formula.transform",children:a.jsx(se,{featureId:"geometry",groupFilter:"transform"})}),a.jsx("div",{className:`border-t ${tt.subtle}`,children:a.jsx(se,{featureId:"geometry",groupFilter:"burning"})}),a.jsx(et,{}),a.jsx("div",{className:`border-t ${tt.subtle}`,"data-help-id":"julia.mode",children:a.jsx(se,{featureId:"geometry",groupFilter:"julia"})}),a.jsx(et,{}),a.jsx(Nr,{featureId:"geometry",label:"Hybrid Box Fold",compileParam:"hybridCompiled",runtimeToggleParam:"hybridMode",compileSettingsParams:["hybridFoldType","hybridComplex","hybridSwap","hybridPermute"],runtimeGroup:"hybrid",runtimeExcludeParams:["hybridMode"],compileMessage:"Compiling Hybrid Shader...",helpId:"hybrid.mode"}),a.jsx(et,{}),a.jsx(Ru,{state:e,actions:n}),e.showHints&&a.jsx("div",{className:`text-[9px] ${Mt.faint} text-center mt-6 pb-2 opacity-50 font-mono`,children:"PRESS 'H' TO HIDE HINTS"})]})},Tu=({state:e,actions:n})=>{const t=z(l=>l.openContextMenu),o=e.droste;e.colorGrading;const i=e.optics,s=e.waterPlane,r=l=>{const c=Xe(l.currentTarget);c.length>0&&(l.preventDefault(),l.stopPropagation(),t(l.clientX,l.clientY,[],c))};return a.jsxs("div",{className:"animate-fade-in -mx-4 -mt-4 flex flex-col",children:[a.jsx("div",{className:"flex flex-col","data-help-id":"dof.settings",children:i&&a.jsxs("div",{className:"flex flex-col",children:[a.jsx(se,{featureId:"optics",groupFilter:"dof"}),a.jsx("div",{"data-help-id":"cam.fov",children:a.jsx(se,{featureId:"optics",groupFilter:"projection"})})]})}),e.advancedMode&&a.jsxs("div",{className:"flex flex-col","data-help-id":"panel.scene",children:[a.jsx("div",{className:"t-section-header",onContextMenu:r,"data-help-id":"panel.scene",children:a.jsx("h3",{className:"t-section-title",children:"Camera & Navigation"})}),a.jsx(se,{featureId:"navigation",groupFilter:"controls"})]}),a.jsx(et,{}),a.jsx("div",{className:`flex flex-col border-t ${tt.subtle}`,"data-help-id":"fog.settings",children:a.jsx(se,{featureId:"atmosphere",groupFilter:"fog"})}),a.jsx(Nr,{featureId:"volumetric",helpId:"render.volumetric"}),a.jsx(et,{}),s&&s.waterEnabled&&a.jsx("div",{className:`flex flex-col border-t ${tt.subtle}`,"data-help-id":"water.settings",children:a.jsxs(Lr,{label:"Water Plane",featureId:"waterPlane",description:"Infinite ocean plane at height Y.",children:[a.jsx("div",{className:"mb-2",children:a.jsx(se,{featureId:"waterPlane",groupFilter:"main"})}),a.jsxs("div",{className:`${Fn} mb-2`,children:[a.jsx(se,{featureId:"waterPlane",groupFilter:"geometry"}),a.jsx(se,{featureId:"waterPlane",groupFilter:"material"})]}),a.jsxs("div",{className:Fn,children:[a.jsx(ze,{variant:"secondary",className:"mb-2",children:"Waves"}),a.jsx(se,{featureId:"waterPlane",groupFilter:"waves"})]})]})}),a.jsx("div",{className:"flex flex-col","data-help-id":"scene.grading",children:a.jsx(se,{featureId:"colorGrading",groupFilter:"grading"})}),a.jsx(et,{}),a.jsxs(Dt,{label:"Effects",labelVariant:"primary",variant:"panel",children:[a.jsxs("div",{className:"flex flex-col","data-help-id":"post.effects",children:[a.jsx(se,{featureId:"postEffects",groupFilter:"bloom"}),a.jsx(se,{featureId:"postEffects",groupFilter:"lens"})]}),o&&a.jsxs("div",{className:"flex flex-col","data-help-id":"effect.droste",children:[a.jsx(se,{featureId:"droste",groupFilter:"main"}),o.active&&a.jsxs("div",{className:"animate-fade-in flex flex-col",children:[a.jsx(se,{featureId:"droste",groupFilter:"geometry"}),a.jsx(et,{}),a.jsx(se,{featureId:"droste",groupFilter:"structure"}),a.jsx(et,{}),a.jsx(se,{featureId:"droste",groupFilter:"transform"})]})]})]})]})},Fo=xe(),Eu=({state:e,actions:n})=>{const[t,o]=M.useState(0),i=e.lighting,s=e.liveModulations;M.useEffect(()=>{t>=i.lights.length&&i.lights.length>0&&o(i.lights.length-1)},[i.lights.length,t]);const r=Ct(i,t),l=z(m=>m.openContextMenu),c=m=>{const C=Xe(m.currentTarget);C.length>0&&(m.preventDefault(),m.stopPropagation(),l(m.clientX,m.clientY,[],C))},d=m=>{m.preventDefault(),m.stopPropagation();const C=Ct(i,t),k=[{label:"Light Studio",isHeader:!0},{label:"Intensity Unit",isHeader:!0},{label:"Raw (Linear)",checked:(C.intensityUnit??"raw")==="raw",action:()=>n.updateLight({index:t,params:{intensityUnit:"raw"}})},{label:"Exposure (EV)",checked:C.intensityUnit==="ev",action:()=>{const w=C.intensity>0?Math.max(-4,Math.min(10,Math.log2(C.intensity))):0;n.updateLight({index:t,params:{intensityUnit:"ev",intensity:Math.round(w*10)/10}})}},{label:"Falloff Preset",isHeader:!0},{label:"Quadratic (Smooth)",checked:(C.falloffType??"Quadratic")==="Quadratic",action:()=>n.updateLight({index:t,params:{falloffType:"Quadratic"}})},{label:"Linear (Artistic)",checked:C.falloffType==="Linear",action:()=>n.updateLight({index:t,params:{falloffType:"Linear"}})},{label:"Batch",isHeader:!0},{label:"Apply to all lights",action:()=>{i.lights.forEach((w,S)=>{n.updateLight({index:S,params:{falloffType:C.falloffType,intensityUnit:C.intensityUnit,range:C.range}})})}}];l(m.clientX,m.clientY,k,["panel.light"])},f=()=>{i.lights.length<ke&&(n.addLight(),o(i.lights.length))},h=m=>{m.stopPropagation(),i.lights.length>1&&(n.removeLight(t),o(Math.max(0,t-1)))},p=()=>{const m=Ct(e.lighting,t),C=m.fixed,k=Je();let w=m.position,S=m.rotation;if(k)if(m.type==="Point"){const j=Fo.sceneOffset;if(C){const R=new V(w.x,w.y,w.z);R.applyQuaternion(k.quaternion),R.add(k.position),w={x:R.x+j.x+(j.xL??0),y:R.y+j.y+(j.yL??0),z:R.z+j.z+(j.zL??0)}}else{const R=new V(w.x-j.x-(j.xL??0),w.y-j.y-(j.yL??0),w.z-j.z-(j.zL??0));R.sub(k.position),R.applyQuaternion(k.quaternion.clone().invert()),w={x:R.x,y:R.y,z:R.z}}}else{const j=new V(0,0,-1).applyEuler(new _e(S.x,S.y,S.z,"YXZ"));j.applyQuaternion(C?k.quaternion:k.quaternion.clone().invert());const R=new Oe().setFromUnitVectors(new V(0,0,-1),j),I=new _e().setFromQuaternion(R,"YXZ");S={x:I.x,y:I.y,z:I.z}}n.updateLight({index:t,params:{fixed:!C,position:w,rotation:S}})},u=m=>{const C=Je();if(!C){n.updateLight({index:t,params:{type:m}});return}const k=Ct(e.lighting,t);let w=new V(0,0,0);if(!k.fixed){const S=new V(0,0,-1).applyQuaternion(C.quaternion);w.copy(C.position).addScaledVector(S,2);const j=Fo.sceneOffset;w.add(new V(j.x+j.xL,j.y+j.yL,j.z+j.zL))}if(m==="Directional"){const S=new V(k.position.x,k.position.y,k.position.z),j=new V().subVectors(w,S).normalize();j.lengthSq()<.001&&j.set(0,-1,0);const R=new Oe().setFromUnitVectors(new V(0,0,-1),j),I=new _e().setFromQuaternion(R,"YXZ");n.updateLight({index:t,params:{type:m,rotation:{x:I.x,y:I.y,z:I.z}}})}else{const S=new Oe().setFromEuler(new _e(k.rotation.x,k.rotation.y,k.rotation.z,"YXZ")),j=new V(0,0,-1).applyQuaternion(S),I=w.clone().sub(j.multiplyScalar(5));n.updateLight({index:t,params:{type:m,position:{x:I.x,y:I.y,z:I.z}}})}};if(!r)return null;const g=(r.fixed,10),v=`lighting.light${t}`,y={x:s[`${v}_rotX`]??r.rotation.x,y:s[`${v}_rotY`]??r.rotation.y,z:s[`${v}_rotZ`]??r.rotation.z},b={x:s[`${v}_posX`]??r.position.x,y:s[`${v}_posY`]??r.position.y,z:s[`${v}_posZ`]??r.position.z},x=new V(b.x,b.y,b.z);return a.jsxs("div",{className:"animate-fade-in",onContextMenu:d,children:[a.jsx("div",{className:"mb-4",children:a.jsxs("div",{className:"flex flex-wrap gap-1 bg-black/40 p-1 rounded border border-white/5",children:[i.lights.map((m,C)=>a.jsxs("button",{onClick:()=>o(C),className:`flex-1 min-w-[60px] py-1.5 px-2 text-[9px] font-bold rounded border transition-all relative ${t===C?"bg-cyan-900/50 border-cyan-500/50 text-cyan-200 shadow-sm":"bg-transparent border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300"}`,children:["Light ",C+1,m.visible&&a.jsx("div",{className:"absolute top-1 right-1 w-1 h-1 rounded-full bg-cyan-400"})]},C)),i.lights.length<ke&&a.jsx("button",{onClick:f,className:"w-8 flex items-center justify-center text-gray-500 hover:text-cyan-400 hover:bg-white/5 rounded transition-colors",title:"Add Light",children:a.jsx(Ea,{})})]})}),a.jsxs("div",{className:"mb-4 space-y-3","data-help-id":"panel.light",children:[a.jsxs("div",{className:"flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-white/5",children:[a.jsx(Ve,{label:"Enabled",value:r.visible,onChange:()=>n.updateLight({index:t,params:{visible:!r.visible}}),color:"bg-green-500"}),i.lights.length>1&&a.jsx("button",{onClick:h,className:"p-1.5 text-red-500 hover:text-red-300 hover:bg-red-900/20 rounded ml-2 transition-colors",title:"Delete Light",children:a.jsx(zt,{})})]}),a.jsxs("div",{className:`transition-opacity duration-200 ${r.visible?"opacity-100":"opacity-40 pointer-events-none"}`,children:[a.jsxs("div",{className:"mb-4 p-3 bg-gray-800/50 rounded-lg","data-help-id":"light.mode",onContextMenu:c,children:[a.jsx("div",{className:"flex gap-1 mb-2","data-help-id":"light.type",children:a.jsx(Ve,{value:r.type,onChange:m=>u(m),options:[{label:"Point",value:"Point"},{label:"Directional (Sun)",value:"Directional"}]})}),a.jsx(Ve,{label:"Attachment Mode",value:r.fixed,onChange:p,options:[{label:"Headlamp",value:!0},{label:"World",value:!1}],helpId:"light.mode"})]}),r.type==="Point"?a.jsx("div",{"data-help-id":"light.pos",children:a.jsx(oa,{label:r.fixed?"Offset XYZ":"World Position",value:x,onChange:m=>n.updateLight({index:t,params:{position:{x:m.x,y:m.y,z:m.z}}}),min:-g,max:g,step:.01,interactionMode:"param",trackKeys:[`lighting.light${t}_posX`,`lighting.light${t}_posY`,`lighting.light${t}_posZ`],trackLabels:[`Light ${t+1} Pos X`,`Light ${t+1} Pos Y`,`Light ${t+1} Pos Z`]})}):a.jsx("div",{"data-help-id":"light.rot",children:a.jsx(hr,{index:t,value:y,onChange:m=>n.updateLight({index:t,params:{rotation:m}}),isFixed:r.fixed,width:200,height:130})}),r.intensityUnit==="ev"?a.jsx(fe,{label:"Power (EV)",value:r.intensity,min:-4,max:10,step:.1,onChange:m=>n.updateLight({index:t,params:{intensity:m}}),mapTextInput:!1,overrideInputText:`${Ja(r.intensity)} EV`,dataHelpId:"light.intensity",trackId:`${v}_intensity`,liveValue:s[`${v}_intensity`]}):a.jsx(fe,{label:"Power",value:r.intensity,min:0,max:100,step:.1,onChange:m=>n.updateLight({index:t,params:{intensity:m}}),customMapping:{min:0,max:100,toSlider:m=>Math.sqrt(m/100)*100,fromSlider:m=>m*m/100},mapTextInput:!1,overrideInputText:Ja(r.intensity),dataHelpId:"light.intensity",trackId:`${v}_intensity`,liveValue:s[`${v}_intensity`]}),r.type==="Point"&&a.jsxs(a.Fragment,{children:[a.jsx(fe,{label:"Range",value:r.range??0,min:0,max:100,step:.1,onChange:m=>n.updateLight({index:t,params:{range:m}}),customMapping:{min:0,max:100,toSlider:m=>Math.log10(m+1)/Math.log10(101)*100,fromSlider:m=>Math.pow(101,m/100)-1},mapTextInput:!1,overrideInputText:(r.range??0)<.01?"Infinite":Ja(r.range??0),dataHelpId:"light.falloff",trackId:`${v}_falloff`,liveValue:s[`${v}_falloff`]}),a.jsx("p",{className:"text-[9px] text-gray-500 mb-2 -mt-2",children:"0 = Infinite reach. Sets distance where light fades to ~1%."}),a.jsx("div",{className:"mb-1 px-3","data-help-id":"light.falloff",children:a.jsx(Ve,{label:"Falloff Curve",value:r.falloffType,onChange:m=>n.updateLight({index:t,params:{falloffType:m}}),options:[{label:"Quadratic",value:"Quadratic"},{label:"Linear",value:"Linear"}],helpId:"light.falloff"})})]}),a.jsxs("div",{className:"mt-4 pt-3 border-t border-white/10 space-y-2",children:[a.jsx("label",{className:"text-xs text-gray-400 font-bold mb-2 block",children:"Color"}),a.jsx(Fa,{color:r.color,onColorChange:m=>n.updateLight({index:t,params:{color:m}})}),a.jsxs("div",{className:"flex items-center justify-between pt-1",children:[a.jsx("label",{className:"text-xs text-gray-400 font-medium",children:"Cast Shadows"}),a.jsx("input",{type:"checkbox",checked:r.castShadow,onChange:m=>{n.handleInteractionStart("param"),n.updateLight({index:t,params:{castShadow:m.target.checked}}),n.handleInteractionEnd()},className:"w-3 h-3 accent-cyan-500 bg-gray-800 border-gray-600 rounded cursor-pointer"})]})]})]})]}),a.jsx("div",{className:"h-px bg-gray-800 my-4"}),a.jsx("div",{className:"flex items-center justify-between mb-4 p-3 bg-gray-800/50 rounded-lg",children:a.jsx(Ve,{label:"Show 3d helpers",value:e.showLightGizmo,onChange:n.setShowLightGizmo,color:"bg-cyan-600"})}),i&&a.jsxs("div",{className:"mt-4 p-3 bg-gray-800/50 rounded-lg","data-help-id":"shadows",children:[a.jsxs("div",{className:"flex items-center justify-between mb-2",children:[a.jsx(ze,{children:"Shadows (Global)"}),a.jsx("div",{className:"w-[60px]",children:a.jsx(Ve,{value:i.shadows,onChange:m=>n.setLighting({shadows:m}),color:"bg-yellow-500"})})]}),i.shadows&&a.jsx("div",{className:"pl-2 mt-2 border-l-2 border-yellow-500/30",children:a.jsx(se,{featureId:"lighting",groupFilter:"shadows"})})]})]})},Ja=e=>{if(e===0)return"0";if(Math.abs(e)<1)return e.toFixed(3);const n=e.toPrecision(5);return n.includes(".")?n.replace(/\.?0+$/,""):n},Lu=({state:e,actions:n})=>{M.useRef(null),z(i=>i.openContextMenu),e.debugMobileLayout||typeof window<"u"&&window.innerWidth<768;const t=e.materials,o=e.atmosphere;return e.lighting,!t||!o?null:a.jsxs("div",{className:"animate-fade-in -mx-4 -mt-4 flex flex-col","data-help-id":"panel.render",children:[a.jsx("div",{className:"flex flex-col","data-help-id":"mat.diffuse mat.metallic mat.roughness mat.specular mat.rim",children:a.jsx(se,{featureId:"materials",groupFilter:"surface"})}),a.jsx("div",{className:"flex flex-col","data-help-id":"mat.env",children:a.jsx(se,{featureId:"materials",groupFilter:"env"})}),a.jsx("div",{className:"flex flex-col","data-help-id":"mat.reflection",children:a.jsx(se,{featureId:"reflections",groupFilter:"shading"})}),a.jsx("div",{className:"flex flex-col","data-help-id":"mat.glow",children:a.jsx(se,{featureId:"atmosphere",groupFilter:"glow"})}),a.jsx("div",{className:"flex flex-col","data-help-id":"mat.emission",children:a.jsx(se,{featureId:"materials",groupFilter:"emission"})}),a.jsx("div",{className:"flex flex-col","data-help-id":"mat.ao",children:a.jsx(se,{featureId:"ao",groupFilter:"shading"})})]})},Nu=({state:e,actions:n})=>{const t=z(b=>b.openContextMenu),o=e.quality,i=e.lighting,[s,r]=e.fixedResolution,[l,c]=M.useState("Free"),d=(i==null?void 0:i.ptEnabled)!==!1,f=n.setLighting,h=M.useMemo(()=>{const b=`${s}x${r}`;return["800x600","1280x720","1920x1080","2560x1440","3840x2160","1080x1080","1080x1350","1080x1920","2048x1024","4096x2048"].includes(b)?b:"Custom"},[s,r]),p=b=>{const x=Xe(b.currentTarget);x.length>0&&(b.preventDefault(),b.stopPropagation(),t(b.clientX,b.clientY,[],x))},u=async b=>{e.renderMode!==b&&(Y.emit("is_compiling","Switching Engine..."),await new Promise(x=>setTimeout(x,50)),n.setRenderMode(b))},g=(b,x)=>{const m=Math.max(64,Math.round(b/8)*8),C=Math.max(64,Math.round(x/8)*8);n.setFixedResolution(m,C)},v=(b,x)=>{l==="Free"?g(b==="w"?x:s,b==="h"?x:r):b==="w"?g(x,x/l):g(x*l,x)},y=[.25,.5,1,1.5,2];return a.jsxs("div",{className:"animate-fade-in -mx-4 -mt-4 flex flex-col",children:[a.jsxs("div",{className:"flex flex-col","data-help-id":"render.engine",children:[a.jsxs("div",{className:"px-3 py-2",children:[a.jsx(ze,{className:"block mb-1",children:"Render Engine"}),a.jsxs("div",{className:`flex ${_t.tabBar} rounded p-0.5 border ${tt.standard}`,children:[a.jsx("button",{onClick:()=>u("Direct"),className:`flex-1 py-1.5 text-[10px] font-bold rounded transition-colors ${e.renderMode==="Direct"?Mi:An}`,children:"Direct (Fast)"}),a.jsx("button",{onClick:()=>d&&u("PathTracing"),disabled:!d,className:`flex-1 py-1.5 text-[10px] font-bold rounded transition-colors ${d?e.renderMode==="PathTracing"?`${ki.bgMed} ${Mt.primary}`:An:Ci}`,title:d?"Switch to Path Tracer (GI)":"Path Tracer Disabled in Engine Panel",children:"Path Tracer (GI)"})]})]}),e.renderMode==="PathTracing"&&i&&a.jsxs("div",{className:"animate-fade-in","data-help-id":"pt.global",children:[a.jsx(fe,{label:"Max Bounces",value:i.ptBounces,min:1,max:8,step:1,onChange:b=>f({ptBounces:Math.round(b)})}),a.jsx(fe,{label:"GI Brightness",value:i.ptGIStrength,min:0,max:5,step:.01,onChange:b=>f({ptGIStrength:b}),trackId:"lighting.ptGIStrength"})]})]}),a.jsx(et,{}),a.jsxs("div",{className:"w-full flex flex-col rounded-t-sm relative",onContextMenu:p,"data-help-id":"panel.quality",children:[a.jsx("div",{className:"absolute inset-0 bg-white/[0.06] rounded-t-sm pointer-events-none"}),a.jsx("div",{className:"flex items-center bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5 px-2",children:a.jsx("span",{className:"text-[10px] text-gray-400 font-medium tracking-tight select-none",children:"Resolution"})}),a.jsxs("div",{className:"flex flex-col",children:[(()=>{const b=[a.jsx("div",{children:a.jsx(Ve,{value:e.resolutionMode,onChange:n.setResolutionMode,options:[{label:"Fill Screen",value:"Full"},{label:"Fixed",value:"Fixed"}]})},"mode")];return e.resolutionMode==="Fixed"&&b.push(a.jsx("div",{className:"animate-fade-in",children:a.jsxs("div",{className:"flex flex-col gap-2 px-3 py-2 bg-neutral-800/50",children:[a.jsx(Wt,{label:"Preset",value:h,options:[{label:"SVGA (800 x 600)",value:"800x600"},{label:"HD (1280 x 720)",value:"1280x720"},{label:"FHD (1920 x 1080)",value:"1920x1080"},{label:"QHD (2560 x 1440)",value:"2560x1440"},{label:"4K (3840 x 2160)",value:"3840x2160"},{label:"Square 1:1 (1080p)",value:"1080x1080"},{label:"Portrait 4:5 (1080p)",value:"1080x1350"},{label:"Vertical 9:16 (1080p)",value:"1080x1920"},{label:"Skybox Low (2048 x 1024)",value:"2048x1024"},{label:"Skybox High (4096 x 2048)",value:"4096x2048"},{label:"Custom",value:"Custom"}],onChange:x=>{if(x!=="Custom"){const[m,C]=x.split("x").map(Number);g(m,C)}},fullWidth:!0}),a.jsxs("div",{className:"flex gap-2",children:[a.jsxs("div",{className:"flex-1",children:[a.jsx(ze,{variant:"secondary",className:"block mb-0.5",children:"Width"}),a.jsx("div",{className:"h-6 bg-black/40 rounded border border-white/10 relative",children:a.jsx(yt,{value:s,onChange:x=>v("w",x),step:8,min:64,max:8192,overrideText:`${s}`})})]}),a.jsxs("div",{className:"flex-1",children:[a.jsx(ze,{variant:"secondary",className:"block mb-0.5",children:"Height"}),a.jsx("div",{className:"h-6 bg-black/40 rounded border border-white/10 relative",children:a.jsx(yt,{value:r,onChange:x=>v("h",x),step:8,min:64,max:8192,overrideText:`${r}`})})]}),a.jsxs("div",{className:"w-[35%]",children:[a.jsx(ze,{variant:"secondary",className:"block mb-0.5",children:"Ratio"}),a.jsx("div",{className:"h-6",children:a.jsx(Wt,{value:l,options:[{label:"Free",value:"Free"},{label:"16:9",value:1.7777},{label:"4:3",value:1.3333},{label:"1:1",value:1},{label:"4:5 (Portrait)",value:.8},{label:"9:16 (Vertical)",value:.5625},{label:"2:1 (Sky)",value:2}],onChange:x=>{c(x),x!=="Free"&&g(s,s/x)},fullWidth:!0,className:"!px-1"})})]})]})]})},"fixed")),b.push(a.jsx("div",{"data-help-id":"quality.scale",children:a.jsxs("div",{className:"px-3 py-2",children:[a.jsxs("div",{className:"flex items-center justify-between mb-1.5",children:[a.jsx(ze,{variant:"secondary",children:"Internal Scale"}),a.jsx("span",{className:`text-[10px] font-mono ${Mn.text} font-bold`,children:`${e.aaLevel.toFixed(2)}x`})]}),a.jsx("div",{className:`grid grid-cols-5 gap-px ${_t.tint} border ${tt.subtle} rounded overflow-hidden`,children:y.map(x=>a.jsx("button",{onClick:()=>n.setAALevel(x),className:`py-1.5 text-[9px] font-bold transition-all ${e.aaLevel===x?ji:Ri}`,children:x},x))})]})},"scale"),a.jsx("div",{"data-help-id":"quality.adaptive",children:a.jsx(se,{featureId:"quality",groupFilter:"performance"})},"performance")),b.map((x,m)=>{const C=m===b.length-1;return a.jsxs("div",{className:"flex",children:[a.jsx("div",{className:`w-2 shrink-0 self-stretch border-l border-white/20 bg-white/[0.12] ${C?"border-b border-b-white/20 rounded-bl-lg":""}`}),a.jsxs("div",{className:`flex-1 min-w-0 relative ${C?"border-b border-b-white/20":""}`,children:[a.jsx("div",{className:"absolute inset-0 bg-black/20 pointer-events-none z-10"}),x]})]},m)})})(),a.jsx("div",{className:"h-2",style:{background:"linear-gradient(to bottom, transparent, rgba(255,255,255,0.08))"}})]})]}),a.jsx(et,{}),a.jsx("div",{className:"flex flex-col","data-help-id":"quality.tss",children:a.jsx(Ve,{label:"Temporal AA (Remove Noise)",value:e.accumulation,onChange:n.setAccumulation,color:"bg-green-500",helpId:"quality.tss"})}),(i==null?void 0:i.shadowsCompile)&&(i==null?void 0:i.shadows)&&a.jsx("div",{className:"flex flex-col","data-help-id":"shadows",children:a.jsx(se,{featureId:"lighting",groupFilter:"shadow_quality"})}),a.jsx(et,{}),a.jsx("div",{className:"flex flex-col","data-help-id":"quality.steps quality.detail quality.fudge quality.threshold quality.metric quality.estimator quality.jitter quality.relaxation",children:o&&a.jsx(se,{featureId:"quality",groupFilter:"kernel"})})]})},Du=({layer:e,state:n,histogramData:t,onChange:o,onRefresh:i,autoUpdate:s,onToggleAuto:r,liveModulations:l})=>{const c=M.useRef(!1),d=e===1?n.repeats:n.repeats2,f=e===1?n.phase:n.phase2,h=e===1?n.scale:n.scale2,p=e===1?n.offset:n.offset2,u=e===1?n.bias:n.bias2,g=e===1?n.gradient:n.gradient2,v=e===1?n.mode:n.mode2,y=e===1?"scale":"scale2",b=e===1?"offset":"offset2",x=e===1?"repeats":"repeats2",m=e===1?"phase":"phase2",C=e===1?"bias":"bias2",k=M.useRef(d),w=M.useRef(f),S=M.useRef(h),j=M.useRef(p),R=M.useRef(v);M.useEffect(()=>{if(v!==R.current){const L=Math.abs(h-S.current)>.001,E=Math.abs(p-j.current)>.001;!L&&!E&&(c.current=!0,s||i()),R.current=v}},[v,h,p,s,i]),M.useEffect(()=>{if(c.current&&t){const L=Cr(t);if(L){const E=kr(L.buckets,L.min,L.max);if(E){const D=E.end-E.start,A=Math.abs(D)<1e-4?1e-4:D,T=d/A,G=f-E.start*T;o({[y]:T,[b]:G}),c.current=!1}}}},[t,d,f,y,b,o]),M.useEffect(()=>{const L=Math.abs(d-k.current)>.001,E=Math.abs(f-w.current)>.001,D=Math.abs(h-S.current)>.001,A=Math.abs(p-j.current)>.001;if((L||E)&&!D&&!A){const T=Math.max(1e-4,h),H=Math.max(1e-4,k.current)/T,W=(w.current-p)/T,B=d/H,_=f-W*B;o({[y]:B,[b]:_})}k.current=d,w.current=f,S.current=h,j.current=p},[d,f,h,p,y,b,o]);const I=(f-p)/h,N=I+d/h;return a.jsxs("div",{className:"flex flex-col",children:[a.jsx(jr,{data:t,min:I,max:N,gamma:u,repeats:d,phase:f,gradientStops:g,labelTitle:"Range",labelLeft:"Min",labelMid:"Bias",labelRight:"Max",onChange:({min:L,max:E,gamma:D})=>{const A=E-L,T=Math.abs(A)<1e-4?1e-4:A,G=d/T,H=f-L*G,W={[y]:G,[b]:H,[C]:D};o(W)},autoUpdate:s,onToggleAuto:r,onRefresh:i}),a.jsx(fe,{label:"Repeats",value:d,min:.1,max:100,step:.1,onChange:L=>o({[x]:L}),trackId:`coloring.${x}`,liveValue:l==null?void 0:l[`coloring.${x}`]}),a.jsx(fe,{label:"Phase",value:f,min:-1,max:1,step:.01,onChange:L=>o({[m]:L}),trackId:`coloring.${m}`,liveValue:l==null?void 0:l[`coloring.${m}`]})]})},_u=({sliceState:e,actions:n})=>{const t=e,o=t.hybridComplex,[i,s]=M.useState(!1),r=n.setGeometry,l=d=>{d.stopPropagation(),Y.emit("is_compiling","Optimizing Shader..."),setTimeout(()=>{r({hybridComplex:!0}),s(!1)},50)},c=d=>{d.preventDefault(),d.stopPropagation(),s(!0)};return a.jsxs("div",{className:"relative mt-2 pt-2 border-t border-white/5",children:[a.jsxs("div",{className:`transition-all duration-300 ${o?"":"opacity-30 blur-[0.5px] pointer-events-none grayscale"}`,children:[a.jsx("div",{className:"flex items-center gap-1 mb-1",children:a.jsx(ze,{variant:"secondary",children:"Advanced Mixing"})}),a.jsx(fe,{label:"Box Skip (Mod)",value:t.hybridSkip,min:1,max:8,step:1,onChange:d=>r({hybridSkip:d}),overrideInputText:Math.round(t.hybridSkip)<=1?"Consecutive":Math.round(t.hybridSkip)===2?"Every 2nd":`Every ${Math.round(t.hybridSkip)}th`,trackId:"geometry.hybridSkip"}),a.jsx("div",{className:"mt-1",children:a.jsx(Ve,{label:"Swap Order",value:t.hybridSwap,onChange:d=>r({hybridSwap:d})})})]}),!o&&!i&&a.jsx("div",{className:"absolute inset-0 cursor-pointer z-10 bg-gray-900/50 hover:bg-gray-800/40 transition-colors flex items-center justify-center group rounded",onClick:c,title:"Click to enable Advanced Hybrid Mode",children:a.jsx("div",{className:"text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity transform scale-75",children:a.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[a.jsx("rect",{x:"3",y:"11",width:"18",height:"11",rx:"2",ry:"2"}),a.jsx("path",{d:"M7 11V7a5 5 0 0 1 10 0v4"})]})})}),i&&a.jsxs("div",{className:"absolute top-[-20px] left-0 right-0 z-50 animate-pop-in",children:[a.jsxs("div",{className:"bg-black/95 border border-white/20 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.9)] backdrop-blur-md overflow-hidden cursor-pointer hover:border-cyan-500/50 transition-colors",onClick:l,children:[a.jsxs("div",{className:"flex items-start justify-between p-2 border-b border-white/10 bg-white/5",children:[a.jsxs("div",{className:"flex items-center gap-2 text-gray-300",children:[a.jsx(qt,{}),a.jsx(ze,{children:"Advanced Shader"})]}),a.jsx("button",{onClick:d=>{d.stopPropagation(),s(!1)},className:"text-gray-500 hover:text-white -mt-0.5 -mr-0.5 p-1",children:a.jsx(wn,{})})]}),a.jsxs("div",{className:"p-3",children:[a.jsxs("p",{className:"text-[10px] text-gray-400 leading-relaxed mb-3",children:["Enable Advanced Hybrid Integration?",a.jsx("br",{}),"This allows ",a.jsx("strong",{children:"alternating formulas"})," between Box Folds and the Main Fractal.",a.jsx("br",{}),a.jsx("br",{}),a.jsx("span",{className:"text-orange-300",children:"Compilation may take 30-60 seconds."})]}),a.jsx("div",{className:"flex items-center justify-center p-1.5 bg-white/5 rounded border border-white/10 text-cyan-400 text-[9px] font-bold group-hover:bg-cyan-900/30 group-hover:text-cyan-200 group-hover:border-cyan-500/30 transition-all",children:"Click to Load"})]})]}),a.jsx("div",{className:"fixed inset-0 z-[-1]",onClick:d=>{d.stopPropagation(),s(!1)}})]})]})},Fu=({actions:e,targetMode:n,label:t,activeLabel:o,helpText:i,variant:s="primary"})=>{const r=z(f=>f.interactionMode),{setInteractionMode:l}=e,c=r===n,d=()=>{l(c?"none":n)};return a.jsxs("div",{className:"flex flex-col animate-fade-in",children:[c&&i&&a.jsx("div",{className:"mb-px p-2 bg-green-900/30 border border-green-500/30 rounded text-[9px] text-green-200 animate-pulse text-center leading-tight",children:i}),a.jsx(Ta,{onClick:d,label:c?o||"Cancel":t,variant:c?"success":s,fullWidth:!0})]})},Au=()=>a.jsxs("svg",{width:"13",height:"13",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"1.8",strokeLinecap:"round",strokeLinejoin:"round",children:[a.jsx("rect",{x:"3",y:"3",width:"18",height:"18",rx:"3"}),a.jsx("circle",{cx:"8.5",cy:"8.5",r:"1.2",fill:"currentColor",stroke:"none"}),a.jsx("circle",{cx:"15.5",cy:"8.5",r:"1.2",fill:"currentColor",stroke:"none"}),a.jsx("circle",{cx:"8.5",cy:"15.5",r:"1.2",fill:"currentColor",stroke:"none"}),a.jsx("circle",{cx:"15.5",cy:"15.5",r:"1.2",fill:"currentColor",stroke:"none"}),a.jsx("circle",{cx:"12",cy:"12",r:"1.2",fill:"currentColor",stroke:"none"})]}),zu=()=>{const e=M.useRef(null),n=M.useRef(0),t=M.useRef({x:0,y:0,z:0}),o=M.useRef(0),i=M.useRef({shift:!1,alt:!1}),s=M.useCallback(()=>{const c=(Date.now()-n.current)/1e3,d=.5*c*c+.1*c,f=Math.min(8,d),h=f-o.current;o.current=f;let p=1;i.current.shift?p=5:i.current.alt&&(p=.2);const u=h*p,g=t.current,v=z.getState().geometry;z.getState().setGeometry({juliaX:v.juliaX+g.x*u,juliaY:v.juliaY+g.y*u,juliaZ:v.juliaZ+g.z*u})},[]),r=M.useCallback(c=>{i.current={shift:c.shiftKey,alt:c.altKey},z.getState().handleInteractionStart("param");const f=Math.random()*2-1,h=Math.random()*2-1,p=Math.random()*2-1,u=Math.sqrt(f*f+h*h+p*p)||1;t.current={x:f/u,y:h/u,z:p/u},n.current=Date.now(),o.current=0,s(),e.current=setInterval(s,30)},[s]),l=M.useCallback(()=>{e.current&&(clearInterval(e.current),e.current=null),z.getState().handleInteractionEnd()},[]);return M.useEffect(()=>{const c=d=>{i.current={shift:d.shiftKey,alt:d.altKey}};return window.addEventListener("keydown",c),window.addEventListener("keyup",c),()=>{window.removeEventListener("keydown",c),window.removeEventListener("keyup",c),e.current&&clearInterval(e.current)}},[]),a.jsxs("button",{onPointerDown:r,onPointerUp:l,onPointerLeave:l,className:"w-full h-[26px] flex items-center justify-center gap-1.5 bg-white/[0.06] border-b border-white/5 hover:bg-cyan-500/10 text-gray-500 hover:text-cyan-300 transition-colors cursor-pointer select-none",title:"Hold to randomize — Shift: faster, Alt: slower",children:[a.jsx(Au,{}),a.jsx("span",{className:"text-[9px] font-medium",children:"Randomize"})]})};function za(e){const n=Ue.lazy(e);return t=>a.jsx(M.Suspense,{fallback:null,children:a.jsx(n,{...t})})}const Ou=za(()=>It(()=>import("./FlowEditor-DB-tIcWE.js"),__vite__mapDeps([10,1,2,4,11,3,5]),import.meta.url)),$u=za(()=>It(()=>import("./AudioPanel-BXI5VGiu.js"),__vite__mapDeps([12,1,2,13,4,3,5]),import.meta.url).then(e=>({default:e.AudioPanel}))),Bu=za(()=>It(()=>import("./AudioSpectrum-Dl2LIBH3.js"),__vite__mapDeps([13,1,2,4,3,5]),import.meta.url).then(e=>({default:e.AudioSpectrum}))),Hu=za(()=>It(()=>import("./DebugToolsOverlay-C5fxHK6p.js"),__vite__mapDeps([14,3,1,2]),import.meta.url).then(e=>({default:e.DebugToolsOverlay}))),Gu=e=>{const n=z(d=>d.histogramData),t=z(d=>d.histogramAutoUpdate),o=z(d=>d.setHistogramAutoUpdate),i=z(d=>d.refreshHistogram),s=z(d=>d.liveModulations),r=z(d=>d.registerHistogram),l=z(d=>d.unregisterHistogram);M.useEffect(()=>(r(),()=>l()),[r,l]);const c=d=>{const f=z.getState().setColoring;f&&f(d)};return a.jsx(Du,{layer:e.layer,state:e.sliceState,histogramData:n,onChange:c,onRefresh:i,autoUpdate:t,onToggleAuto:()=>o(!t),liveModulations:s})},Uu=e=>{const n=z(o=>o.registerSceneHistogram),t=z(o=>o.unregisterSceneHistogram);return M.useEffect(()=>(n(),()=>t()),[n,t]),a.jsx(uu,{...e})},Wu=()=>{ve.register("panel-drawing",Vd),ve.register("overlay-drawing",ld),ve.register("panel-audio",$u),ve.register("overlay-lighting",td),ve.register("overlay-webcam",iu),ve.register("overlay-debug-tools",Hu),ve.register("panel-engine",su),ve.register("panel-cameramanager",mu),ve.register("panel-formula",Pu),ve.register("panel-scene",Tu),ve.register("panel-light",Eu),ve.register("panel-shading",Lu),ve.register("panel-gradients",tu),ve.register("panel-quality",Nu),ve.register("panel-graph",Ou),ve.register("coloring-histogram",Gu),ve.register("hybrid-advanced-lock",_u),ve.register("interaction-picker",Fu),ve.register("julia-randomize",zu),ve.register("audio-spectrum",Bu),ve.register("audio-link-controls",eu),ve.register("scene-histogram",Uu),ve.register("optics-controls",hu),ve.register("optics-dof-controls",fu),ve.register("navigation-controls",pu)};if("serviceWorker"in navigator)try{navigator.serviceWorker.getRegistrations().then(e=>{for(let n of e)n.unregister().then(()=>console.log("SW Unregistered"))}).catch(()=>{})}catch{console.debug("SW cleanup skipped")}Wu();const Dr=document.getElementById("root");if(!Dr)throw new Error("Could not find root element to mount to");const qu=Ti.createRoot(Dr);qu.render(a.jsx(Ue.StrictMode,{children:a.jsx(Wd,{})}));export{cd as A,Ta as B,ah as C,Bd as D,th as E,Y as F,nh as G,Nd as H,Yd as I,je as J,Yt as K,sh as L,nt as M,br as N,eu as O,sn as P,Fa as Q,bt as R,fe as S,eh as T,ea as U,rh as V,Sl as W,lr as X,ka as a,dh as b,uh as c,mh as d,El as e,fh as f,rt as g,ph as h,oh as i,z as j,qa as k,Xe as l,ha as m,ne as n,xe as o,ih as p,ge as q,Wt as r,hh as s,yt as t,le as u,Je as v,lh as w,ch as x,Ju as y,gh as z};
