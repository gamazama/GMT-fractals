const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./AdvancedGradientEditor-coWKV4sO.js","./three-fiber-CPrIxt6s.js","./three-Wc6KBp_k.js","./three-drei-CWnivAlk.js","./index-x0WkbnyN.js","./pako-DwGzBETv.js","./Timeline-DCoFDic2.js","./mediabunny-ZLFd-dRz.js","./HelpBrowser-XhXFSR5_.js","./FormulaWorkshop-DzEebMxE.js","./FlowEditor-Bc42YNsO.js","./reactflow-DF77eLy4.js","./AudioPanel-C5z2Gmrk.js","./AudioSpectrum-CGoPkt6J.js","./DebugToolsOverlay-CRHb67Bl.js"])))=>i.map(i=>d[i]);
var Gr=Object.defineProperty;var Ur=(e,n,t)=>n in e?Gr(e,n,{enumerable:!0,configurable:!0,writable:!0,value:t}):e[n]=t;var Q=(e,n,t)=>Ur(e,typeof n!="symbol"?n+"":n,t);import{r as Re,J as Fn,K as Wr,f as Uo,S as kn,G as Vr,C as Pt,D as Wo,P as qr,a as Yr,b as Xr,c as Zr,d as Vo,R as Qr,e as ze,T as $t,g as Kr,A as Jr,h as Zt,i as es,p as An,j as At,k as Yt,l as la,m as ts,n as as,o as ns,q as Da,s as zn,U as os,t as rs,u as ss,L as qo,v as Yo,w as on,x as rn,y as sn,M as is,z as Ma,F as ls,H as Xo,B as cs,E as _a,I as Zo,N as Qo,O as Ko,Q as Fa,V as jn,W as Jo,X as ds,Y as us,Z as Ca,_ as hs,$ as On,a0 as fs,a1 as ps,a2 as zt,a3 as at,a4 as ms,a5 as gs,a6 as xs,a7 as bs,a8 as Rn,a9 as ka,aa as ys,ab as vs,ac as ws,ad as Ss,ae as Ms,af as tt,ag as pt,ah as Ct,ai as Cs,aj as ks,ak as js,al as Rs,am as Is,an as Ps,ao as $n,ap as Ts,aq as Hn,ar as Es,as as Ls,at as Ns,au as Ds}from"./index-x0WkbnyN.js";import{r as w,j as a,R as Ue,u as In,a as Aa,C as _s}from"./three-fiber-CPrIxt6s.js";import{a as er,r as Ht,_ as Et,O as Fs,b as As}from"./three-drei-CWnivAlk.js";import{d as Te,c as V,k as _t,Q as Oe,l as ut,E as _e,O as zs,P as Os,m as Ve,n as $s,o as Hs,p as Bn,q as Gn,r as Ft,s as Bs,R as Pn,g as Un,M as Ga,j as tr}from"./three-Wc6KBp_k.js";import{p as Wn}from"./pako-DwGzBETv.js";const Gs=e=>(n,t,o)=>{const s=o.subscribe;return o.subscribe=(r,l,c)=>{let d=r;if(l){const f=(c==null?void 0:c.equalityFn)||Object.is;let h=r(o.getState());d=p=>{const u=r(p);if(!f(h,u)){const m=h;l(h=u,m)}},c!=null&&c.fireImmediately&&l(h,h)}return s(d)},e(n,t,o)},ar=Gs,me={UNIFORM:"uniform",CONFIG:"config",RESET_ACCUM:"reset_accum",OFFSET_SHIFT:"offset_shift",OFFSET_SET:"offset_set",OFFSET_SILENT:"offset_silent",CAMERA_ABSORB:"camera_absorb",CAMERA_SNAP:"camera_snap",CAMERA_TELEPORT:"camera_teleport",CAMERA_TRANSITION:"camera_transition",SHADER_CODE:"shader_code",IS_COMPILING:"is_compiling",COMPILE_TIME:"compile_time",COMPILE_ESTIMATE:"compile_estimate",BUCKET_STATUS:"bucket_status",BUCKET_IMAGE:"bucket_image",TRACK_FOCUS:"track_focus",TEXTURE:"texture",ENGINE_QUEUE:"engine_queue",REGISTER_FORMULA:"register_formula"};class Us{constructor(){Q(this,"listeners",{})}on(n,t){return this.listeners[n]||(this.listeners[n]=[]),this.listeners[n].push(t),()=>this.off(n,t)}off(n,t){this.listeners[n]&&(this.listeners[n]=this.listeners[n].filter(o=>o!==t))}emit(n,t){this.listeners[n]&&this.listeners[n].forEach(o=>o(t))}}const Y=new Us,Be={CameraPosition:"uCameraPosition",CamBasisX:"uCamBasisX",CamBasisY:"uCamBasisY",CamForward:"uCamForward",RegionMin:"uRegionMin",RegionMax:"uRegionMax",LightCount:"uLightCount",LightType:"uLightType",LightPos:"uLightPos",LightDir:"uLightDir",LightColor:"uLightColor",LightIntensity:"uLightIntensity",LightShadows:"uLightShadows",LightFalloff:"uLightFalloff",LightFalloffType:"uLightFalloffType",LightRadius:"uLightRadius",LightSoftness:"uLightSoftness",ModularParams:"uModularParams",HistogramLayer:"uHistogramLayer"},Vn=e=>{if(typeof window>"u")return!1;const n=new URLSearchParams(window.location.search);return n.has(e)&&n.get(e)!=="false"&&n.get(e)!=="0"},Ws={Formula:{id:"Formula",location:"right",order:0,isCore:!0,isOpen:!0},Graph:{id:"Graph",location:"right",order:1,isCore:!0,isOpen:!1},Scene:{id:"Scene",location:"right",order:2,isCore:!0,isOpen:!1},Shader:{id:"Shader",location:"right",order:3,isCore:!0,isOpen:!1},Gradient:{id:"Gradient",location:"right",order:4,isCore:!0,isOpen:!1},Quality:{id:"Quality",location:"right",order:5,isCore:!0,isOpen:!1},Light:{id:"Light",location:"right",order:6,isCore:!1,isOpen:!1},Audio:{id:"Audio",location:"right",order:7,isCore:!1,isOpen:!1},Drawing:{id:"Drawing",location:"right",order:8,isCore:!1,isOpen:!1}},Vs=(e,n)=>({showLightGizmo:!0,isGizmoDragging:!1,interactionMode:"none",focusLock:!1,histogramData:null,histogramAutoUpdate:!0,histogramTrigger:0,histogramLayer:0,histogramActiveCount:0,sceneHistogramData:null,sceneHistogramTrigger:0,sceneHistogramActiveCount:0,draggedLightIndex:null,autoCompile:!1,isUserInteracting:!1,advancedMode:!1,showHints:!0,debugMobileLayout:!1,invertY:!1,resolutionMode:"Full",fixedResolution:[800,600],isBroadcastMode:Vn("clean")||Vn("broadcast"),lockSceneOnSwitch:!1,exportIncludeScene:!1,isTimelineHovered:!1,tabSwitchCount:0,helpWindow:{visible:!1,activeTopicId:null},contextMenu:{visible:!1,x:0,y:0,items:[],targetHelpIds:[]},compositionOverlay:"none",compositionOverlaySettings:{opacity:.5,lineThickness:1,showCenterMark:!1,showSafeAreas:!1,color:"#FFFFFF",gridDivisionsX:4,gridDivisionsY:4,spiralRotation:0,spiralPositionX:.5,spiralPositionY:.5,spiralScale:1,spiralRatio:1.618033988749895},panels:Ws,leftDockSize:320,rightDockSize:360,isLeftDockCollapsed:!0,isRightDockCollapsed:!1,draggingPanelId:null,dragSnapshot:null,activeLeftTab:null,activeRightTab:"Formula",workshopOpen:!1,workshopEditFormula:void 0,setShowLightGizmo:t=>e({showLightGizmo:t}),setGizmoDragging:t=>e({isGizmoDragging:t}),setInteractionMode:t=>e({interactionMode:t}),setFocusLock:t=>e({focusLock:t}),setHistogramData:t=>e({histogramData:t}),setHistogramAutoUpdate:t=>e({histogramAutoUpdate:t}),refreshHistogram:()=>e(t=>({histogramTrigger:t.histogramTrigger+1})),registerHistogram:()=>e(t=>({histogramActiveCount:t.histogramActiveCount+1})),unregisterHistogram:()=>e(t=>({histogramActiveCount:Math.max(0,t.histogramActiveCount-1)})),setHistogramLayer:t=>{n().histogramLayer!==t&&(e({histogramLayer:t}),Y.emit("uniform",{key:Be.HistogramLayer,value:t}),e(o=>({histogramTrigger:o.histogramTrigger+1})))},setSceneHistogramData:t=>e({sceneHistogramData:t}),refreshSceneHistogram:()=>e(t=>({sceneHistogramTrigger:t.sceneHistogramTrigger+1})),registerSceneHistogram:()=>e(t=>({sceneHistogramActiveCount:t.sceneHistogramActiveCount+1})),unregisterSceneHistogram:()=>e(t=>({sceneHistogramActiveCount:Math.max(0,t.sceneHistogramActiveCount-1)})),setDraggedLight:t=>e({draggedLightIndex:t}),setAutoCompile:t=>e({autoCompile:t}),setAdvancedMode:t=>e({advancedMode:t}),setShowHints:t=>e({showHints:t}),setDebugMobileLayout:t=>e({debugMobileLayout:t}),setInvertY:t=>e({invertY:t}),setResolutionMode:t=>{e({resolutionMode:t}),Y.emit("reset_accum",void 0)},setFixedResolution:(t,o)=>{e({fixedResolution:[t,o]}),Y.emit("reset_accum",void 0)},setLockSceneOnSwitch:t=>e({lockSceneOnSwitch:t}),setExportIncludeScene:t=>e({exportIncludeScene:t}),setIsTimelineHovered:t=>e({isTimelineHovered:t}),incrementTabSwitchCount:()=>e(t=>({tabSwitchCount:t.tabSwitchCount+1})),setIsBroadcastMode:t=>e({isBroadcastMode:t}),openHelp:t=>e(o=>({helpWindow:{visible:!0,activeTopicId:t||o.helpWindow.activeTopicId},contextMenu:{...o.contextMenu,visible:!1}})),closeHelp:()=>e({helpWindow:{visible:!1,activeTopicId:null}}),openContextMenu:(t,o,s,i)=>e({contextMenu:{visible:!0,x:t,y:o,items:s,targetHelpIds:i||[]}}),closeContextMenu:()=>e(t=>({contextMenu:{...t.contextMenu,visible:!1}})),openWorkshop:t=>e({workshopOpen:!0,workshopEditFormula:t}),closeWorkshop:()=>e({workshopOpen:!1,workshopEditFormula:void 0}),movePanel:(t,o,s)=>e(i=>{var m,v;const r={...i.panels};r[t]||(r[t]={id:t,location:o,order:0,isCore:!1,isOpen:!0});const l=!0;let c=s;c===void 0&&(c=Object.values(r).filter(x=>x.location===o).length),(o==="left"||o==="right")&&Object.values(r).forEach(y=>{y.location===o&&y.id!==t&&(y.isOpen=!1)});let d=r[t].floatPos;o==="float"&&!d&&(d={x:window.innerWidth/2-150,y:window.innerHeight/2-200}),r[t]={...r[t],location:o,order:c,isOpen:l,floatPos:d};const f=o==="left"?t:((m=Object.values(r).find(y=>y.location==="left"&&y.isOpen))==null?void 0:m.id)||null,h=o==="right"?t:((v=Object.values(r).find(y=>y.location==="right"&&y.isOpen))==null?void 0:v.id)||null,p=o==="left"?!1:i.isLeftDockCollapsed,u=o==="right"?!1:i.isRightDockCollapsed;return{panels:r,activeLeftTab:f,activeRightTab:h,isLeftDockCollapsed:p,isRightDockCollapsed:u}}),reorderPanel:(t,o)=>e(s=>{const i={...s.panels},r=i[t],l=i[o];if(!r||!l)return{};r.location!==l.location&&(r.location=l.location,r.isOpen=!1);const c=l.location,d=Object.values(i).filter(u=>u.location===c).sort((u,m)=>u.order-m.order),f=d.findIndex(u=>u.id===t),h=d.findIndex(u=>u.id===o);if(f===-1||h===-1)return{};const[p]=d.splice(f,1);return d.splice(h,0,p),d.forEach((u,m)=>{i[u.id]={...i[u.id],order:m}}),{panels:i}}),togglePanel:(t,o)=>e(s=>{var f,h;const i={...s.panels};if(!i[t])return{};const r=i[t],l=o!==void 0?o:!r.isOpen;if(r.location==="float")r.isOpen=l;else if(l){if(Object.values(i).forEach(p=>{p.location===r.location&&p.id!==t&&(p.isOpen=!1)}),r.isOpen=!0,r.location==="left")return{panels:i,activeLeftTab:t,isLeftDockCollapsed:!1};if(r.location==="right")return{panels:i,activeRightTab:t,isRightDockCollapsed:!1}}else r.isOpen=!1;const c=((f=Object.values(i).find(p=>p.location==="left"&&p.isOpen))==null?void 0:f.id)||null,d=((h=Object.values(i).find(p=>p.location==="right"&&p.isOpen))==null?void 0:h.id)||null;return{panels:i,activeLeftTab:c,activeRightTab:d}}),setDockSize:(t,o)=>e({[t==="left"?"leftDockSize":"rightDockSize"]:o}),setDockCollapsed:(t,o)=>e({[t==="left"?"isLeftDockCollapsed":"isRightDockCollapsed"]:o}),setFloatPosition:(t,o,s)=>e(i=>({panels:{...i.panels,[t]:{...i.panels[t],floatPos:{x:o,y:s}}}})),setFloatSize:(t,o,s)=>e(i=>({panels:{...i.panels,[t]:{...i.panels[t],floatSize:{width:o,height:s}}}})),startPanelDrag:t=>e(o=>({draggingPanelId:t,dragSnapshot:JSON.parse(JSON.stringify(o.panels))})),endPanelDrag:()=>e({draggingPanelId:null,dragSnapshot:null}),cancelPanelDrag:()=>e(t=>t.dragSnapshot?{panels:t.dragSnapshot,draggingPanelId:null,dragSnapshot:null}:{draggingPanelId:null}),setActiveTab:t=>n().togglePanel(t,!0),floatTab:t=>n().movePanel(t,"float"),dockTab:t=>n().movePanel(t,"right"),setCompositionOverlay:t=>e({compositionOverlay:t}),setCompositionOverlaySettings:t=>e(o=>({compositionOverlaySettings:{...o.compositionOverlaySettings,...t}}))}),qs=()=>typeof window>"u"?!1:window.matchMedia&&window.matchMedia("(pointer: coarse)").matches||window.innerWidth<768,Ys=(e,n)=>({dpr:qs()?1:Math.min(typeof window<"u"&&window.devicePixelRatio||1,2),aaLevel:1,msaaSamples:1,aaMode:"Always",accumulation:!0,previewMode:!1,renderMode:"Direct",isPaused:!1,sampleCap:256,isExporting:!1,renderRegion:null,isBucketRendering:!1,bucketSize:128,bucketUpscale:1,convergenceThreshold:.25,samplesPerBucket:64,canvasPixelSize:[1920,1080],setDpr:t=>{e({dpr:t}),Y.emit("reset_accum",void 0)},setAALevel:t=>{e({aaLevel:t});const{aaMode:o}=n();(o==="Always"||o==="Auto")&&e({dpr:t}),Y.emit("reset_accum",void 0)},setMSAASamples:t=>{e({msaaSamples:t});const{aaMode:o}=n();o==="Always"||o==="Auto"?Y.emit("config",{msaaSamples:t}):Y.emit("config",{msaaSamples:1}),Y.emit("reset_accum",void 0)},setAAMode:t=>{e({aaMode:t});const{aaLevel:o,msaaSamples:s}=n();t==="Off"?(e({dpr:1}),Y.emit("config",{msaaSamples:1})):(e({dpr:o}),Y.emit("config",{msaaSamples:s})),Y.emit("reset_accum",void 0)},setAccumulation:t=>{e({accumulation:t}),Y.emit("reset_accum",void 0)},setPreviewMode:t=>{e({previewMode:t}),Y.emit("config",{previewMode:t})},setRenderMode:t=>{e({renderMode:t});const o=t==="PathTracing"?1:0,s=n().setLighting;s&&s({renderMode:o})},setIsPaused:t=>e({isPaused:t}),setSampleCap:t=>e({sampleCap:t}),setRenderRegion:t=>{e({renderRegion:t});const o=t?new Te(t.minX,t.minY):new Te(0,0),s=t?new Te(t.maxX,t.maxY):new Te(1,1);Y.emit("uniform",{key:Be.RegionMin,value:o}),Y.emit("uniform",{key:Be.RegionMax,value:s}),Y.emit("reset_accum",void 0)},setIsBucketRendering:t=>{e({isBucketRendering:t})},setBucketSize:t=>e({bucketSize:t}),setBucketUpscale:t=>e({bucketUpscale:t}),setConvergenceThreshold:t=>e({convergenceThreshold:t}),setSamplesPerBucket:t=>e({samplesPerBucket:t}),setCanvasPixelSize:(t,o)=>e({canvasPixelSize:[t,o]}),setIsExporting:t=>e({isExporting:t})}),nr=new Uint32Array(256);for(let e=0;e<256;e++){let n=e;for(let t=0;t<8;t++)n=n&1?3988292384^n>>>1:n>>>1;nr[e]=n}const Xs=e=>{let n=-1;for(let t=0;t<e.length;t++)n=n>>>8^nr[(n^e[t])&255];return(n^-1)>>>0},Zs=new TextEncoder,qn=new TextDecoder,Qs=e=>{const n=new Uint8Array(e.length);for(let t=0;t<e.length;t++)n[t]=e.charCodeAt(t);return n},ya=e=>{let n="";for(let t=0;t<e.length;t++)n+=String.fromCharCode(e[t]);return n},Yn=(e,n,t)=>{e[n]=t>>>24&255,e[n+1]=t>>>16&255,e[n+2]=t>>>8&255,e[n+3]=t&255},or=async(e,n,t)=>{const o=await e.arrayBuffer(),s=new Uint8Array(o);if(s[0]!==137||s[1]!==80||s[2]!==78||s[3]!==71)throw new Error("Not a valid PNG");const i=Qs(n),r=Zs.encode(t),l=i.length+1+1+1+1+1+r.length,c=12+l,d=new Uint8Array(c);Yn(d,0,l),d[4]=105,d[5]=84,d[6]=88,d[7]=116;let f=8;d.set(i,f),f+=i.length,d[f++]=0,d[f++]=0,d[f++]=0,d[f++]=0,d[f++]=0,d.set(r,f);const h=Xs(d.slice(4,c-4));Yn(d,c-4,h);let p=8;for(;p<s.length;){const m=s[p]<<24|s[p+1]<<16|s[p+2]<<8|s[p+3];if(ya(s.slice(p+4,p+8))==="IEND")break;p+=12+m}const u=new Uint8Array(s.length+c);return u.set(s.slice(0,p),0),u.set(d,p),u.set(s.slice(p),p+c),new Blob([u],{type:"image/png"})},rr=async(e,n)=>{const t=await e.arrayBuffer(),o=new Uint8Array(t);if(o[0]!==137||o[1]!==80)return null;let s=8;for(;s<o.length;){const i=o[s]<<24|o[s+1]<<16|o[s+2]<<8|o[s+3],r=ya(o.slice(s+4,s+8));if(r==="iTXt"){const l=o.slice(s+8,s+8+i);let c=-1;for(let d=0;d<l.length;d++)if(l[d]===0){c=d;break}if(c!==-1&&ya(l.slice(0,c))===n){let f=c+1+1+1;for(;f<l.length&&l[f]!==0;)f++;for(f++;f<l.length&&l[f]!==0;)f++;return f++,qn.decode(l.slice(f))}}if(r==="tEXt"){const l=o.slice(s+8,s+8+i);let c=-1;for(let d=0;d<l.length;d++)if(l[d]===0){c=d;break}if(c!==-1&&ya(l.slice(0,c))===n)return qn.decode(l.slice(c+1))}if(r==="IEND")break;s+=12+i}return null};let ln=null;function Ks(e){ln=e}class Js{constructor(){Q(this,"activeCamera",null);Q(this,"virtualSpace",null);Q(this,"renderer",null);Q(this,"pipeline",null);Q(this,"_worker",null);Q(this,"_shadow",{isBooted:!1,isCompiling:!1,hasCompiledShader:!1,isPaused:!1,dirty:!1,lastCompileDuration:0,lastMeasuredDistance:1,accumulationCount:0,convergenceValue:1,frameCount:0,sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0}});Q(this,"_localOffset",{x:0,y:0,z:0,xL:0,yL:0,zL:0});Q(this,"_offsetGuarded",!1);Q(this,"_offsetGuardTimer",null);Q(this,"_onCompiling",null);Q(this,"_onCompileTime",null);Q(this,"_onShaderCode",null);Q(this,"_onBootedCallback",null);Q(this,"_pendingSnapshots",new Map);Q(this,"_pendingPicks",new Map);Q(this,"_pendingFocusPicks",new Map);Q(this,"_pendingHistograms",new Map);Q(this,"_pendingShaderSource",new Map);Q(this,"_gpuInfo","");Q(this,"_lastGeneratedFrag","");Q(this,"modulations",{});Q(this,"_isBucketRendering",!1);Q(this,"_isExporting",!1);Q(this,"_exportReady",null);Q(this,"_exportFrameDone",null);Q(this,"_exportComplete",null);Q(this,"_exportError",null);Q(this,"_container",null);Q(this,"_lastInitArgs",null);Q(this,"_onCrash",null);Q(this,"pendingTeleport",null);Q(this,"_isGizmoInteracting",!1);Q(this,"_bootSent",!1);Q(this,"_pendingOffsetSync",null)}setWorkerModePending(){}initWorkerMode(n,t,o,s,i,r,l){if(this._worker)return;this._container=n.parentElement,this._lastInitArgs={config:t,width:o,height:s,dpr:i,isMobile:r,initialCamera:l};const c=n.transferControlToOffscreen();this._worker=new Worker(new URL(""+new URL("renderWorker-CYWO2IFe.js",import.meta.url).href,import.meta.url),{type:"module"}),this._worker.onmessage=f=>{this._handleWorkerMessage(f.data)},this._worker.onerror=f=>{console.error("[WorkerProxy] Worker error:",f),this._handleWorkerCrash("Worker error: "+(f.message||"unknown"))};const d={type:"INIT",canvas:c,width:o,height:s,dpr:i,isMobile:r,initialConfig:t,initialCamera:l};this._worker.postMessage(d,[c])}restart(n,t){if(!this._container||!this._lastInitArgs)return;this._worker&&(this._worker.onmessage=null,this._worker.onerror=null,this._worker.terminate(),this._worker=null),this._shadow={isBooted:!1,isCompiling:!1,hasCompiledShader:!1,isPaused:!1,dirty:!1,lastCompileDuration:0,lastMeasuredDistance:1,accumulationCount:0,convergenceValue:1,frameCount:0,sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0}};const o=this._container.querySelector("canvas");o&&o.remove();const{width:s,height:i,dpr:r,isMobile:l}=this._lastInitArgs,c=document.createElement("canvas");c.width=s*r,c.height=i*r,c.style.cssText="position:absolute;inset:0;width:100%;height:100%;pointer-events:none",this._container.appendChild(c),this._lastInitArgs={...this._lastInitArgs,config:n,initialCamera:t};const d=c.transferControlToOffscreen();this._worker=new Worker(new URL(""+new URL("renderWorker-CYWO2IFe.js",import.meta.url).href,import.meta.url),{type:"module"}),this._worker.onmessage=h=>{this._handleWorkerMessage(h.data)},this._worker.onerror=h=>{console.error("[WorkerProxy] Worker error:",h),this._handleWorkerCrash("Worker error: "+(h.message||"unknown"))};const f={type:"INIT",canvas:d,width:s,height:i,dpr:r,isMobile:l,initialConfig:n,initialCamera:t};this._worker.postMessage(f,[d])}set onCompiling(n){this._onCompiling=n}set onCompileTime(n){this._onCompileTime=n}set onShaderCode(n){this._onShaderCode=n}_handleWorkerMessage(n){switch(n.type){case"READY":break;case"FRAME_READY":if(n.state)if(this._shadow=n.state,this._offsetGuarded){const t=n.state.sceneOffset,o=this._localOffset;Math.abs(t.x+t.xL-(o.x+o.xL))+Math.abs(t.y+t.yL-(o.y+o.yL))+Math.abs(t.z+t.zL-(o.z+o.zL))<.001&&(this._offsetGuarded=!1,this._offsetGuardTimer&&(clearTimeout(this._offsetGuardTimer),this._offsetGuardTimer=null))}else this._localOffset={...n.state.sceneOffset};ln&&ln();break;case"COMPILING":this._shadow.isCompiling=!!n.status,this._shadow.hasCompiledShader=!n.status||this._shadow.hasCompiledShader,this._onCompiling&&this._onCompiling(n.status),Y.emit(me.IS_COMPILING,n.status);break;case"COMPILE_TIME":n.duration&&(this._shadow.lastCompileDuration=n.duration),this._onCompileTime&&this._onCompileTime(n.duration),Y.emit(me.COMPILE_TIME,n.duration);break;case"SHADER_CODE":this._lastGeneratedFrag=n.code,this._onShaderCode&&this._onShaderCode(n.code),Y.emit(me.SHADER_CODE,n.code);break;case"SHADER_SOURCE_RESULT":{const t=this._pendingShaderSource.get(n.id);t&&(t(n.code),this._pendingShaderSource.delete(n.id));break}case"BOOTED":this._shadow.isBooted=!0,n.gpuInfo&&(this._gpuInfo=n.gpuInfo),this._onBootedCallback&&this._onBootedCallback();break;case"GPU_INFO":this._gpuInfo=n.info;break;case"HISTOGRAM_RESULT":{const t=this._pendingHistograms.get(n.id);t&&(t(n.data),this._pendingHistograms.delete(n.id));break}case"SNAPSHOT_RESULT":{const t=this._pendingSnapshots.get(n.id);t&&(t(n.blob),this._pendingSnapshots.delete(n.id));break}case"PICK_RESULT":{const t=this._pendingPicks.get(n.id);t&&(t(n.position?new V(n.position[0],n.position[1],n.position[2]):null),this._pendingPicks.delete(n.id));break}case"FOCUS_RESULT":{const t=this._pendingFocusPicks.get(n.id);t&&(t(n.distance),this._pendingFocusPicks.delete(n.id));break}case"ERROR":console.error("[WorkerProxy] Worker error:",n.message);break;case"EXPORT_READY":this._exportReady&&this._exportReady();break;case"EXPORT_FRAME_DONE":this._shadow.lastMeasuredDistance=n.measuredDistance,this._exportFrameDone&&this._exportFrameDone({frameIndex:n.frameIndex,progress:n.progress,measuredDistance:n.measuredDistance});break;case"EXPORT_COMPLETE":this._isExporting=!1,this._exportComplete&&this._exportComplete(n.blob??null);break;case"EXPORT_ERROR":this._isExporting=!1,console.error("[WorkerProxy] Export error:",n.message),this._exportError&&this._exportError(n.message);break;case"BUCKET_STATUS":this._isBucketRendering=n.isRendering,Y.emit(me.BUCKET_STATUS,{isRendering:n.isRendering,progress:n.progress,totalBuckets:n.totalBuckets,currentBucket:n.currentBucket});break;case"BUCKET_IMAGE":this._handleBucketImage(n);break}}post(n,t){this._worker&&(t?this._worker.postMessage(n,t):this._worker.postMessage(n))}set onCrash(n){this._onCrash=n}set onBooted(n){this._onBootedCallback=n}_handleWorkerCrash(n){console.error(`[WorkerProxy] Worker crashed: ${n}. Terminating worker.`),this._worker&&(this._worker.terminate(),this._worker=null),this._pendingSnapshots.forEach(t=>t(null)),this._pendingSnapshots.clear(),this._pendingPicks.forEach(t=>t(null)),this._pendingPicks.clear(),this._pendingFocusPicks.forEach(t=>t(-1)),this._pendingFocusPicks.clear(),this._pendingHistograms.forEach(t=>t(new Float32Array(0))),this._pendingHistograms.clear(),this._onCrash&&this._onCrash(n)}terminateWorker(){this._handleWorkerCrash("Manual termination")}get isBooted(){return this._shadow.isBooted}get isCompiling(){return this._shadow.isCompiling}get isExporting(){return this._isExporting}get isBucketRendering(){return this._isBucketRendering}get sceneOffset(){return this._localOffset}get lastGeneratedFrag(){return this._lastGeneratedFrag}get accumulationCount(){return this._shadow.accumulationCount}get convergenceValue(){return this._shadow.convergenceValue}get frameCount(){return this._shadow.frameCount}get lastCompileDuration(){return this._shadow.lastCompileDuration}get lastMeasuredDistance(){return this._shadow.lastMeasuredDistance}set lastMeasuredDistance(n){this._shadow.lastMeasuredDistance=n}get hasCompiledShader(){return this._shadow.hasCompiledShader}get dirty(){return this._shadow.dirty}set dirty(n){n&&this.post({type:"SET_DIRTY"})}get isPaused(){return this._shadow.isPaused}set isPaused(n){this.post({type:"PAUSE",paused:n})}get shouldSnapCamera(){return!1}set shouldSnapCamera(n){n&&this.post({type:"SNAP_CAMERA"})}get isGizmoInteracting(){return this._isGizmoInteracting}set isGizmoInteracting(n){this._isGizmoInteracting=n}get isCameraInteracting(){return!1}set isCameraInteracting(n){n&&this.post({type:"MARK_INTERACTION"})}get bootSent(){return this._bootSent}bootWithConfig(n,t){if(this._bootSent){console.log("[WorkerProxy] Boot already in progress — restarting worker"),this._bootSent=!1,this.restart(n,t),this.post({type:"BOOT",config:n,camera:t}),this._bootSent=!0;return}this.post({type:"BOOT",config:n,camera:t}),this._bootSent=!0}setUniform(n,t,o=!1){this.post({type:"UNIFORM",key:n,value:t,noReset:o})}setPreviewSampleCap(n){this.post({type:"SET_SAMPLE_CAP",n})}resetAccumulation(){this.post({type:"RESET_ACCUM"})}markInteraction(){this.post({type:"MARK_INTERACTION"})}updateTexture(n,t){if(t){const o=t.indexOf(";base64,"),s=o>=0?t.substring(o+8,o+12):"";t.startsWith("data:image/vnd.radiance")||t.startsWith("data:image/x-hdr")||s.startsWith("Iz8")||s.startsWith("Iz9")?fetch(t).then(r=>r.arrayBuffer()).then(r=>{this.post({type:"TEXTURE_HDR",textureType:n,buffer:r},[r])}).catch(r=>console.error("[WorkerProxy] HDR texture transfer failed:",r)):fetch(t).then(r=>r.blob()).then(r=>createImageBitmap(r,{premultiplyAlpha:"none",imageOrientation:"flipY"})).then(r=>{this.post({type:"TEXTURE",textureType:n,bitmap:r},[r])}).catch(r=>console.error("[WorkerProxy] Texture transfer failed:",r))}else this.post({type:"TEXTURE",textureType:n,bitmap:null})}queueOffsetSync(n){this._pendingOffsetSync={x:n.x,y:n.y,z:n.z,xL:n.xL,yL:n.yL,zL:n.zL},this.setShadowOffset(n)}setShadowOffset(n){this._localOffset={...n},this._offsetGuarded=!0,this._offsetGuardTimer&&clearTimeout(this._offsetGuardTimer),this._offsetGuardTimer=setTimeout(()=>{this._offsetGuarded=!1,this._offsetGuardTimer=null},2e3)}applyOffsetShift(n,t,o){}resolveLightPosition(n,t){return n}measureDistanceAtScreenPoint(n,t,o,s){return this._shadow.lastMeasuredDistance}pickWorldPosition(n,t,o){if(!o)return null;const s=crypto.randomUUID();return new Promise(i=>{this._pendingPicks.set(s,i),this.post({type:"PICK_WORLD_POSITION",id:s,x:n,y:t}),setTimeout(()=>{this._pendingPicks.has(s)&&(this._pendingPicks.delete(s),i(null))},5e3)})}startFocusPick(n,t){const o=crypto.randomUUID();return new Promise(s=>{this._pendingFocusPicks.set(o,s),this.post({type:"FOCUS_PICK_START",id:o,x:n,y:t}),setTimeout(()=>{this._pendingFocusPicks.has(o)&&(this._pendingFocusPicks.delete(o),s(-1))},5e3)})}sampleFocusPick(n,t){const o=crypto.randomUUID();return new Promise(s=>{this._pendingFocusPicks.set(o,s),this.post({type:"FOCUS_PICK_SAMPLE",id:o,x:n,y:t}),setTimeout(()=>{this._pendingFocusPicks.has(o)&&(this._pendingFocusPicks.delete(o),s(-1))},2e3)})}endFocusPick(){this.post({type:"FOCUS_PICK_END"})}captureSnapshot(){const n=crypto.randomUUID();return new Promise(t=>{this._pendingSnapshots.set(n,t),this.post({type:"CAPTURE_SNAPSHOT",id:n}),setTimeout(()=>{this._pendingSnapshots.has(n)&&(this._pendingSnapshots.delete(n),t(null))},1e4)})}get gpuInfo(){return this._gpuInfo||"Generic WebGL Device"}requestHistogramReadback(n){const t=crypto.randomUUID();return new Promise(o=>{this._pendingHistograms.set(t,o),this.post({type:"HISTOGRAM_READBACK",id:t,source:n}),setTimeout(()=>{this._pendingHistograms.has(t)&&(this._pendingHistograms.delete(t),o(new Float32Array(0)))},5e3)})}getCompiledFragmentShader(){const n=crypto.randomUUID();return new Promise(t=>{this._pendingShaderSource.set(n,t),this.post({type:"GET_SHADER_SOURCE",id:n,variant:"compiled"}),setTimeout(()=>{this._pendingShaderSource.has(n)&&(this._pendingShaderSource.delete(n),t(null))},5e3)})}getTranslatedFragmentShader(){const n=crypto.randomUUID();return new Promise(t=>{this._pendingShaderSource.set(n,t),this.post({type:"GET_SHADER_SOURCE",id:n,variant:"translated"}),setTimeout(()=>{this._pendingShaderSource.has(n)&&(this._pendingShaderSource.delete(n),t(null))},5e3)})}checkHalfFloatAlphaSupport(){return!0}sendRenderTick(n,t,o,s){if(this._pendingOffsetSync){const i=this._pendingOffsetSync;this._pendingOffsetSync=null,this.post({type:"RENDER_TICK",camera:n,offset:i,delta:o,timestamp:performance.now(),renderState:s,syncOffset:!0})}else this.post({type:"RENDER_TICK",camera:n,offset:t,delta:o,timestamp:performance.now(),renderState:s})}resizeWorker(n,t,o){this.post({type:"RESIZE",width:n,height:t,dpr:o})}sendConfig(n){this.post({type:"CONFIG",config:n})}registerFormula(n,t){this.post({type:"REGISTER_FORMULA",id:n,shader:t})}startExport(n,t){return this._isExporting=!0,new Promise((o,s)=>{this._exportReady=()=>{this._exportReady=null,o()},this._exportError=l=>{this._exportError=null,s(new Error(l))};let i=null;if(t){const l=t;i=new WritableStream({write(c){return l.write(c)},close(){return l.close()},abort(c){return l.abort(c)}})}const r=[];i&&r.push(i),this.post({type:"EXPORT_START",config:n,stream:i},r),setTimeout(()=>{this._exportReady&&(this._exportReady=null,s(new Error("Export start timed out")))},1e4)})}renderExportFrame(n,t,o,s,i,r){return new Promise(l=>{this._exportFrameDone=c=>{this._exportFrameDone=null,l(c)},this.post({type:"EXPORT_RENDER_FRAME",frameIndex:n,time:t,camera:o,offset:s,renderState:i,modulations:r})})}finishExport(){return new Promise((n,t)=>{this._exportComplete=o=>{this._exportComplete=null,n(o)},this._exportError=o=>{this._exportError=null,t(new Error(o))},this.post({type:"EXPORT_FINISH"}),setTimeout(()=>{this._exportComplete&&(this._exportComplete=null,t(new Error("Export finish timed out")))},6e4)})}cancelExport(){this.post({type:"EXPORT_CANCEL"}),this._isExporting=!1}startBucketRender(n,t,o){this._isBucketRendering=!0,this.post({type:"BUCKET_START",exportImage:n,config:t,exportData:o?{preset:JSON.stringify(o.preset),name:o.name,version:o.version}:void 0})}stopBucketRender(){this.post({type:"BUCKET_STOP"}),this._isBucketRendering=!1}async _handleBucketImage(n){const{pixels:t,width:o,height:s,presetJson:i,filename:r}=n,l=document.createElement("canvas");l.width=o,l.height=s;const c=l.getContext("2d");if(!c)return;const d=new ImageData(new Uint8ClampedArray(t.buffer),o,s);c.putImageData(d,0,0),l.toBlob(async f=>{if(f)try{const h=await or(f,"FractalData",i),p=URL.createObjectURL(h),u=document.createElement("a");u.download=r,u.href=p,u.click(),URL.revokeObjectURL(p)}catch(h){console.error("Failed to inject metadata",h);const p=document.createElement("a");p.download=r,p.href=l.toDataURL("image/png"),p.click()}},"image/png")}}let Ua=null;function ge(){return Ua||(Ua=new Js),Ua}class be{constructor(n={x:0,y:0,z:0,xL:0,yL:0,zL:0}){Q(this,"offset");Q(this,"_rotMatrix",new _t);Q(this,"_camRight",new V);Q(this,"_camUp",new V);Q(this,"_camForward",new V);Q(this,"_visualVector",new V);Q(this,"_quatInverse",new Oe);Q(this,"_relativePos",new V);Q(this,"smoothedPos",new V);Q(this,"smoothedQuat",new Oe);Q(this,"smoothedFov",60);Q(this,"prevOffsetState");Q(this,"isLocked",!1);Q(this,"isFirstFrame",!0);this.offset={...n},this.prevOffsetState={...n}}get state(){return{...this.offset}}set state(n){this.offset={...n},be.normalize(this.offset)}static split(n){const t=Math.fround(n),o=n-t;return{high:t,low:o}}static normalize(n){if(Math.abs(n.xL)>.5){const o=Math.floor(n.xL+.5);n.x+=o,n.xL-=o}if(Math.abs(n.yL)>.5){const o=Math.floor(n.yL+.5);n.y+=o,n.yL-=o}if(Math.abs(n.zL)>.5){const o=Math.floor(n.zL+.5);n.z+=o,n.zL-=o}}setFromUnified(n,t,o){const s=be.split(n),i=be.split(t),r=be.split(o);this.offset.x=s.high,this.offset.xL=s.low,this.offset.y=i.high,this.offset.yL=i.low,this.offset.z=r.high,this.offset.zL=r.low,be.normalize(this.offset)}move(n,t,o){this.offset.xL+=n,this.offset.yL+=t,this.offset.zL+=o,be.normalize(this.offset)}absorbCamera(n){this.offset.xL+=n.x,this.offset.yL+=n.y,this.offset.zL+=n.z,be.normalize(this.offset)}resetSmoothing(){this.isFirstFrame=!0,this.prevOffsetState={...this.offset},this.isLocked=!1}updateSmoothing(n,t,o,s,i){if(!i&&!s&&!this.isFirstFrame){this.smoothedPos.copy(n.position),this.smoothedQuat.copy(n.quaternion),this.smoothedFov=t,this.prevOffsetState={...this.offset},this.isLocked=!0;return}if(this.isFirstFrame||s){this.smoothedPos.copy(n.position),this.smoothedQuat.copy(n.quaternion),this.smoothedFov=t,this.prevOffsetState={...this.offset},this.isFirstFrame=!1,this.isLocked=!1;return}const r=this.offset,l=this.prevOffsetState;if(l.x!==r.x||l.y!==r.y||l.z!==r.z||l.xL!==r.xL||l.yL!==r.yL||l.zL!==r.zL){const d=l.x-r.x+(l.xL-r.xL),f=l.y-r.y+(l.yL-r.yL),h=l.z-r.z+(l.zL-r.zL);if(Math.abs(d)>10||Math.abs(f)>10||Math.abs(h)>10){this.resetSmoothing(),this.smoothedPos.copy(n.position),this.smoothedQuat.copy(n.quaternion);return}this.smoothedPos.x+=d,this.smoothedPos.y+=f,this.smoothedPos.z+=h,this.prevOffsetState={...r}}const c=this.smoothedPos.distanceToSquared(n.position);if(this.isLocked?c>1e-18&&(this.isLocked=!1):c<1e-21&&(this.isLocked=!0),this.isLocked)this.smoothedPos.copy(n.position);else{const d=1-Math.exp(-40*o);this.smoothedPos.lerp(n.position,d)}this.smoothedQuat.copy(n.quaternion),this.smoothedFov=t}getUnifiedCameraState(n,t){const o={...this.offset};return o.xL+=n.position.x,o.yL+=n.position.y,o.zL+=n.position.z,be.normalize(o),{position:{x:0,y:0,z:0},rotation:{x:n.quaternion.x,y:n.quaternion.y,z:n.quaternion.z,w:n.quaternion.w},sceneOffset:o,targetDistance:t>0?t:3.5}}applyCameraState(n,t){if(t.sceneOffset){const d={...t.sceneOffset};d.xL+=t.position.x,d.yL+=t.position.y,d.zL+=t.position.z,this.state=d}const o=t.rotation,s=o.x??o._x??0,i=o.y??o._y??0,r=o.z??o._z??0,l=o.w??o._w??1;n.position.set(0,0,0),n.quaternion.set(s,i,r,l).normalize();const c=new V(0,1,0).applyQuaternion(n.quaternion);n.up.copy(c),n.updateMatrixWorld(),this.resetSmoothing(),this.smoothedPos.set(0,0,0),this.smoothedQuat.copy(n.quaternion)}updateShaderUniforms(n,t,o){const s=this.offset.x+this.offset.xL+n.x,i=this.offset.y+this.offset.yL+n.y,r=this.offset.z+this.offset.zL+n.z,l=Math.fround(s),c=Math.fround(i),d=Math.fround(r);t.set(l,c,d),o.set(s-l,i-c,r-d)}updateCameraBasis(n,t,o){const s=n;this._rotMatrix.makeRotationFromQuaternion(s.quaternion);const i=this._rotMatrix.elements;this._camRight.set(i[0],i[1],i[2]),this._camUp.set(i[4],i[5],i[6]),this._camForward.set(-i[8],-i[9],-i[10]);let r=1,l=1;o&&o.isOrtho?(l=o.orthoScale/2,r=l*s.aspect):(l=Math.tan(ut.degToRad(s.fov)*.5),r=l*s.aspect),t[Be.CamBasisX].value.copy(this._camRight).multiplyScalar(r),t[Be.CamBasisY].value.copy(this._camUp).multiplyScalar(l),t[Be.CamForward].value.copy(this._camForward),t[Be.CameraPosition].value.set(0,0,0)}getLightShaderVector(n,t,o,s){const i=this.offset;t?(this._relativePos.set(n.x,n.y,n.z).applyQuaternion(o.quaternion),s.copy(this._relativePos)):s.set(n.x-(i.x+i.xL)-o.position.x,n.y-(i.y+i.yL)-o.position.y,n.z-(i.z+i.zL)-o.position.z)}resolveRealWorldPosition(n,t,o){const s=this.offset;return t?(this._visualVector.set(n.x,n.y,n.z).applyQuaternion(o.quaternion),{x:o.position.x+this._visualVector.x+(s.x+s.xL),y:o.position.y+this._visualVector.y+(s.y+s.yL),z:o.position.z+this._visualVector.z+(s.z+s.zL)}):(this._visualVector.set(n.x-(s.x+s.xL)-o.position.x,n.y-(s.y+s.yL)-o.position.y,n.z-(s.z+s.zL)-o.position.z),this._quatInverse.copy(o.quaternion).invert(),this._visualVector.applyQuaternion(this._quatInverse),{x:this._visualVector.x,y:this._visualVector.y,z:this._visualVector.z})}resolveRealWorldRotation(n,t,o){const s=new V(0,0,-1).applyEuler(new _e(n.x,n.y,n.z,"YXZ"));t?s.applyQuaternion(o.quaternion):s.applyQuaternion(o.quaternion.clone().invert());const i=new Oe().setFromUnitVectors(new V(0,0,-1),s),r=new _e().setFromQuaternion(i,"YXZ");return{x:r.x,y:r.y,z:r.z}}}let ja=null,sr=null,bt=null,dt=null,ir=!1;function ei(e){ja=e}function ti(e){sr=e}function et(){return ja}function oa(){return sr}function ai(e){const n=F.getState().optics,t=n?n.camType>.5&&n.camType<1.5:!1;if(ir=t,t){const o=n.orthoScale??2,i=e.aspect||1,r=o/2,l=r*i;dt?(dt.left=-l,dt.right=l,dt.top=r,dt.bottom=-r):dt=new zs(-l,l,r,-r,.001,1e4),dt.position.copy(e.position),dt.quaternion.copy(e.quaternion),dt.updateProjectionMatrix(),dt.updateMatrixWorld()}else{bt||(bt=new Os),bt.position.copy(e.position),bt.quaternion.copy(e.quaternion);const o=e;o.fov!==void 0&&(bt.fov=o.fov,bt.aspect=o.aspect,bt.updateProjectionMatrix()),bt.updateMatrixWorld()}}function ra(){return ir?dt||ja:bt||ja}const Qt=ge(),qe={getUnifiedPosition:(e,n)=>new V(n.x+n.xL+e.x,n.y+n.yL+e.y,n.z+n.zL+e.z),getUnifiedFromEngine:()=>{const e=et()||Qt.activeCamera;return e?qe.getUnifiedPosition(e.position,Qt.sceneOffset):new V},getRotationFromEngine:()=>{const e=et()||Qt.activeCamera;return e?e.quaternion.clone():new Oe},getDistanceFromEngine:()=>{const e=et()||Qt.activeCamera;if(e){const n=e.position.length();if(n>.001)return n}return null},getRotationDegrees:e=>{const n=new Oe(e.x,e.y,e.z,e.w),t=new _e().setFromQuaternion(n);return new V(ut.radToDeg(t.x),ut.radToDeg(t.y),ut.radToDeg(t.z))},teleportPosition:(e,n,t)=>{const o=be.split(e.x),s=be.split(e.y),i=be.split(e.z),r={position:{x:0,y:0,z:0},sceneOffset:{x:o.high,y:s.high,z:i.high,xL:o.low,yL:s.low,zL:i.low}};if(n)r.rotation=n;else{const l=et()||Qt.activeCamera;if(l){const c=l.quaternion;r.rotation={x:c.x,y:c.y,z:c.z,w:c.w}}}t!==void 0&&(r.targetDistance=t),Y.emit(me.CAMERA_TELEPORT,r)},teleportRotation:e=>{if(isNaN(e.x)||isNaN(e.y)||isNaN(e.z))return;const n=new _e(ut.degToRad(e.x),ut.degToRad(e.y),ut.degToRad(e.z)),t=new Oe().setFromEuler(n),o=qe.getUnifiedFromEngine(),s=be.split(o.x),i=be.split(o.y),r=be.split(o.z);Y.emit(me.CAMERA_TELEPORT,{position:{x:0,y:0,z:0},rotation:{x:t.x,y:t.y,z:t.z,w:t.w},sceneOffset:{x:s.high,y:i.high,z:r.high,xL:s.low,yL:i.low,zL:r.low}})}},ni="useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";let ot=(e=21)=>{let n="",t=crypto.getRandomValues(new Uint8Array(e|=0));for(;e--;)n+=ni[t[e]&63];return n};const Ae=ge(),Xn=e=>typeof e.setOptics=="function"?e.setOptics:null,oi=(e,n)=>({cameraMode:"Orbit",sceneOffset:{x:0,y:0,z:1,xL:0,yL:0,zL:-.24751033974403658},cameraRot:{x:0,y:0,z:0,w:1},targetDistance:3.5,undoStack:[],redoStack:[],savedCameras:[],activeCameraId:null,setCameraMode:t=>e({cameraMode:t}),setSceneOffset:t=>{const o={x:t.x,y:t.y,z:t.z,xL:t.xL||0,yL:t.yL||0,zL:t.zL||0};Ae.virtualSpace?(Ae.virtualSpace.state=o,e({sceneOffset:Ae.virtualSpace.state}),Y.emit("offset_set",Ae.virtualSpace.state)):(e({sceneOffset:o}),Y.emit("offset_set",o))},setActiveCameraId:t=>e({activeCameraId:t}),applyCameraState:t=>{e({cameraRot:t.rotation,sceneOffset:t.sceneOffset,targetDistance:t.targetDistance||3.5})},addSavedCamera:t=>{e(o=>({savedCameras:[...o.savedCameras,t],activeCameraId:t.id}))},updateCamera:(t,o)=>{e(s=>({savedCameras:s.savedCameras.map(i=>i.id===t?{...i,...o}:i)}))},deleteCamera:t=>{e(o=>({savedCameras:o.savedCameras.filter(s=>s.id!==t),activeCameraId:o.activeCameraId===t?null:o.activeCameraId}))},reorderCameras:(t,o)=>{e(s=>{const i=[...s.savedCameras],[r]=i.splice(t,1);return i.splice(o,0,r),{savedCameras:i}})},addCamera:t=>{const o=n(),s=qe.getUnifiedFromEngine(),i=qe.getRotationFromEngine(),r=Ae.lastMeasuredDistance>0&&Ae.lastMeasuredDistance<1e3?Ae.lastMeasuredDistance:o.targetDistance,l=be.split(s.x),c=be.split(s.y),d=be.split(s.z),f={position:{x:0,y:0,z:0},rotation:{x:i.x,y:i.y,z:i.z,w:i.w},sceneOffset:{x:l.high,y:c.high,z:d.high,xL:l.low,yL:c.low,zL:d.low},targetDistance:r},h={...o.optics},p=t||`Camera ${o.savedCameras.length+1}`,u={id:ot(),label:p,position:f.position,rotation:f.rotation,sceneOffset:f.sceneOffset,targetDistance:f.targetDistance,optics:h};e(m=>({savedCameras:[...m.savedCameras,u],activeCameraId:u.id}))},selectCamera:t=>{if(t===null){e({activeCameraId:null});return}const o=n().savedCameras.find(s=>s.id===t);if(o){if(Y.emit("camera_transition",o),e({activeCameraId:t,cameraRot:o.rotation,sceneOffset:o.sceneOffset,targetDistance:o.targetDistance||3.5}),o.optics){const s=Xn(n());s&&s(o.optics)}Ae.resetAccumulation()}},duplicateCamera:t=>{const o=n(),s=o.savedCameras.find(c=>c.id===t);if(!s)return;const i={...JSON.parse(JSON.stringify(s)),id:ot(),label:s.label+" (copy)"},r=o.savedCameras.indexOf(s),l=[...o.savedCameras];if(l.splice(r+1,0,i),e({savedCameras:l,activeCameraId:i.id}),Y.emit("camera_teleport",i),e({cameraRot:i.rotation,sceneOffset:i.sceneOffset,targetDistance:i.targetDistance||3.5}),i.optics){const c=Xn(n());c&&c(i.optics)}Ae.resetAccumulation()},resetCamera:()=>{e({activeCameraId:null});const t=n().formula,o=Re.get(t),s=o==null?void 0:o.defaultPreset,i=(s==null?void 0:s.sceneOffset)||{x:0,y:0,z:0,xL:0,yL:0,zL:0},r=(s==null?void 0:s.cameraPos)||{x:0,y:0,z:3.5},l=(s==null?void 0:s.cameraRot)||{x:0,y:0,z:0,w:1},c=(s==null?void 0:s.targetDistance)||3.5,d=i.x+i.xL+r.x,f=i.y+i.yL+r.y,h=i.z+i.zL+r.z,p=be.split(d),u=be.split(f),m=be.split(h),v={x:p.high,y:u.high,z:m.high,xL:p.low,yL:u.low,zL:m.low};n().setSceneOffset(v),e({cameraRot:l,targetDistance:c});const y={position:{x:0,y:0,z:0},rotation:l,sceneOffset:v,targetDistance:c};Y.emit("reset_accum",void 0),Y.emit("camera_teleport",y)},undoCamera:()=>{const{undoStack:t,redoStack:o}=n();if(t.length===0)return;const s=t[t.length-1];let i;if(Ae.activeCamera&&Ae.virtualSpace)i=Ae.virtualSpace.getUnifiedCameraState(Ae.activeCamera,n().targetDistance),Ae.virtualSpace.applyCameraState(Ae.activeCamera,s);else{const r=n();i={position:{x:0,y:0,z:0},rotation:r.cameraRot,sceneOffset:r.sceneOffset,targetDistance:r.targetDistance}}s.sceneOffset&&e({sceneOffset:s.sceneOffset}),e({cameraRot:s.rotation,targetDistance:s.targetDistance||3.5,redoStack:[...o,i],undoStack:t.slice(0,-1)}),Y.emit("reset_accum",void 0),Y.emit("camera_teleport",s)},redoCamera:()=>{const{undoStack:t,redoStack:o}=n();if(o.length===0)return;const s=o[o.length-1];let i;if(Ae.activeCamera&&Ae.virtualSpace)i=Ae.virtualSpace.getUnifiedCameraState(Ae.activeCamera,n().targetDistance),Ae.virtualSpace.applyCameraState(Ae.activeCamera,s);else{const r=n();i={position:{x:0,y:0,z:0},rotation:r.cameraRot,sceneOffset:r.sceneOffset,targetDistance:r.targetDistance}}s.sceneOffset&&e({sceneOffset:s.sceneOffset}),e({cameraRot:s.rotation,targetDistance:s.targetDistance||3.5,undoStack:[...t,i],redoStack:o.slice(0,-1)}),Y.emit("reset_accum",void 0),Y.emit("camera_teleport",s)}});class ri{constructor(){Q(this,"features",new Map);Q(this,"sortedCache",null)}register(n){if(n.dependsOn)for(const t of n.dependsOn)this.features.has(t)||console.warn(`[FeatureRegistry] "${n.id}" depends on "${t}" which is not yet registered. Ensure registration order is correct.`);this.features.set(n.id,n),this.sortedCache=null}get(n){return this.features.get(n)}getAll(){return this.sortedCache?this.sortedCache:(this.sortedCache=this.topologicalSort(),this.sortedCache)}getTabs(){return Array.from(this.features.values()).filter(n=>n.tabConfig).map(n=>({id:n.id,...n.tabConfig})).sort((n,t)=>n.order-t.order)}getViewportOverlays(){return Array.from(this.features.values()).filter(n=>n.viewportConfig).map(n=>({id:n.id,...n.viewportConfig}))}getMenuFeatures(){return Array.from(this.features.values()).filter(n=>n.menuConfig).map(n=>({id:n.id,...n.menuConfig}))}getExtraMenuItems(){const n=[];return this.features.forEach(t=>{t.menuItems&&t.menuItems.forEach(o=>n.push({...o,featureId:t.id}))}),n}getEngineFeatures(){return Array.from(this.features.values()).filter(n=>!!n.engineConfig)}getDictionary(){const n={formula:"f",cameraPos:"cp",cameraRot:"cr",sceneOffset:"so",targetDistance:"td",animations:"an",sequence:"sq",features:{_alias:"p",children:{}}};return this.features.forEach(t=>{const o=t.shortId||t.id,s={};Object.entries(t.params).forEach(([i,r])=>{r.shortId&&(s[i]=r.shortId)}),n.features.children[t.id]={_alias:o,children:s}}),n}getUniformDefinitions(){const n=[];return this.features.forEach(t=>{Object.values(t.params).forEach(o=>{if(o.uniform){let s=o.type,i=o.default;s==="color"&&(s="vec3"),s==="boolean"&&(s="float",i=i?1:0),(s==="image"||s==="gradient")&&(s="sampler2D",i=null),n.push({name:o.uniform,type:s,default:i})}}),t.extraUniforms&&n.push(...t.extraUniforms)}),n}topologicalSort(){const n=Array.from(this.features.values()),t=new Map;n.forEach((l,c)=>t.set(l.id,c));const o=new Map,s=new Map;for(const l of n)o.set(l.id,0),s.has(l.id)||s.set(l.id,[]);for(const l of n)if(l.dependsOn)for(const c of l.dependsOn)this.features.has(c)&&(o.set(l.id,(o.get(l.id)||0)+1),s.get(c).push(l.id));const i=[];for(const l of n)o.get(l.id)===0&&i.push(l.id);const r=[];for(;i.length>0;){i.sort((c,d)=>(t.get(c)||0)-(t.get(d)||0));const l=i.shift();r.push(this.features.get(l));for(const c of s.get(l)||[]){const d=(o.get(c)||1)-1;o.set(c,d),d===0&&i.push(c)}}if(r.length!==n.length){const l=n.filter(c=>!r.includes(c)).map(c=>c.id);return console.error(`[FeatureRegistry] Dependency cycle detected involving: ${l.join(", ")}`),n}return r}}const oe=new ri,si=ge(),ii=e=>{const n={formula:e.formula,pipeline:e.pipeline,renderRegion:e.renderRegion?{...e.renderRegion}:null};return oe.getAll().forEach(o=>{const s=e[o.id];s&&(n[o.id]=JSON.parse(JSON.stringify(s)))}),n},Zn=(e,n,t)=>{const o=t();n(e),Object.keys(e).forEach(s=>{const i=s,r=e[i];if(i==="formula"){Y.emit("config",{formula:r});return}const l="set"+i.charAt(0).toUpperCase()+i.slice(1);if(typeof o[l]=="function"){o[l](r);return}if(i==="pipeline"){o.setPipeline(r);return}if(i==="graph"){o.setGraph(r);return}const c="set"+i.charAt(0).toUpperCase()+i.slice(1);typeof o[c]=="function"&&!oe.get(i)&&o[c](r)}),si.resetAccumulation()},li=1500;let Qn=0;const ci=(e,n)=>({paramUndoStack:[],paramRedoStack:[],interactionSnapshot:null,handleInteractionStart:t=>{if(e({isUserInteracting:!0}),t&&typeof t=="object"&&t.position){const s=t,i=Date.now();i-Qn<li&&n().undoStack.length>0||(e(l=>{const c=[...l.undoStack,s];return{undoStack:c.length>50?c.slice(-50):c,redoStack:[]}}),Qn=i);return}const o=ii(n());e({interactionSnapshot:o})},handleInteractionEnd:()=>{e({isUserInteracting:!1});const{interactionSnapshot:t,aaMode:o,aaLevel:s,msaaSamples:i,dpr:r}=n();let l=o==="Auto"||o==="Always"?s:1;if(Math.abs(r-l)>1e-4&&(e({dpr:l}),Y.emit("config",{msaaSamples:o==="Auto"||o==="Always"?i:1}),Y.emit("reset_accum",void 0)),!t)return;const c=n(),d={};let f=!1;Object.keys(t).forEach(h=>{const p=h,u=t[p],m=c[p];JSON.stringify(u)!==JSON.stringify(m)&&(d[p]=u,f=!0)}),e(f?h=>({paramUndoStack:[...h.paramUndoStack,d],paramRedoStack:[],interactionSnapshot:null}):{interactionSnapshot:null})},undoParam:()=>{const{paramUndoStack:t,paramRedoStack:o}=n();if(t.length===0)return;const s=t[t.length-1],i=t.slice(0,-1),r=n(),l={};Object.keys(s).forEach(c=>{l[c]=r[c]}),Zn(s,e,n),e({paramUndoStack:i,paramRedoStack:[...o,l]})},redoParam:()=>{const{paramUndoStack:t,paramRedoStack:o}=n();if(o.length===0)return;const s=o[o.length-1],i=o.slice(0,-1),r=n(),l={};Object.keys(s).forEach(c=>{l[c]=r[c]}),Zn(s,e,n),e({paramUndoStack:[...t,l],paramRedoStack:i})},resetParamHistory:()=>{e({paramUndoStack:[],paramRedoStack:[],interactionSnapshot:null})}}),Kn=`
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
`,di=`
    #ifdef GLOW_FAST
        if (accAlpha > 0.0001) {
            vec3 p_fractal_res = applyPrecisionOffset(p + uCameraPosition, uSceneOffsetLow, uSceneOffsetHigh);
            // Tint the accumulated intensity by the color at the hit point
            vec3 glowCol = getGlowColor(p_fractal_res, h);
            
            // Prevent blowout
            accColor += glowCol * min(accAlpha, 100.0);
        }
    #endif
`,ui=`
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
`,hi=`
    // --- GLOW (Atmosphere Feature) ---
    if (uGlowIntensity > 0.0001) {
        col += glow * uGlowIntensity;
    }
`,fi={id:"atmosphere",shortId:"at",name:"Atmosphere",category:"Rendering",engineConfig:{toggleParam:"glowEnabled",mode:"compile",label:"Volumetric Glow",groupFilter:"engine_settings"},params:{glowEnabled:{type:"boolean",default:!0,label:"Enable Glow",shortId:"ge",group:"main",hidden:!0,noReset:!0,onUpdate:"compile"},glowQuality:{type:"float",default:0,label:"Glow Algo",shortId:"gq",group:"engine_settings",options:[{label:"Accurate (Vector)",value:0},{label:"Fast (Scalar)",value:1}],description:"Vector accumulates color per-step. Scalar accumulates intensity only (faster).",onUpdate:"compile",noReset:!0},fogIntensity:{type:"float",default:0,label:"Fog Intensity",shortId:"fi",uniform:"uFogIntensity",min:0,max:1,step:.01,group:"fog"},fogNear:{type:"float",default:0,label:"Fog Start",shortId:"fn",uniform:"uFogNear",min:0,max:10,step:.1,scale:"square",group:"fog",parentId:"fogIntensity",condition:{gt:0}},fogFar:{type:"float",default:5,label:"Fog End",shortId:"ff",uniform:"uFogFar",min:0,max:10,step:.1,scale:"square",group:"fog",parentId:"fogIntensity",condition:{gt:0}},fogColor:{type:"color",default:new Ve(0,0,0),label:"Fog Color",shortId:"fc",uniform:"uFogColor",group:"fog",parentId:"fogIntensity",condition:{gt:0}},fogDensity:{type:"float",default:.01,label:"Fog Density",shortId:"fd",uniform:"uFogDensity",min:.001,max:5,step:.01,scale:"log",group:"fog",parentId:"fogIntensity",condition:{gt:0},description:"Basic volumetric fog absorption density. For god rays and scatter, enable Volumetric Scattering in Engine."},glowIntensity:{type:"float",default:0,label:"Glow Strength",shortId:"gi",uniform:"uGlowIntensity",min:0,max:5,step:.01,scale:"log",group:"glow",condition:{param:"glowEnabled",bool:!0}},glowSharpness:{type:"float",default:50,label:"Tightness",shortId:"gs",uniform:"uGlowSharpness",min:1,max:1e3,step:1,scale:"log",group:"glow",parentId:"glowIntensity",condition:[{gt:0},{param:"glowEnabled",bool:!0}]},glowMode:{type:"boolean",default:!0,label:"Glow Source",shortId:"gm",uniform:"uGlowMode",group:"glow",parentId:"glowIntensity",condition:[{gt:0},{param:"glowEnabled",bool:!0}],options:[{label:"Surface",value:!1},{label:"Color",value:!0}]},glowColor:{type:"color",default:new Ve(1,1,1),label:"Glow Color",shortId:"gl",uniform:"uGlowColor",group:"glow",parentId:"glowMode",condition:[{bool:!0},{param:"glowEnabled",bool:!0}]}},inject:(e,n,t)=>{if(t!=="Main")return;e.addPostProcessLogic(ui),e.addPostProcessLogic(hi);const o=n.atmosphere;o&&o.glowEnabled&&(o.glowQuality>.5?(e.addDefine("GLOW_FAST","1"),e.addVolumeTracing(Kn,di)):e.addVolumeTracing(Kn,""))}},pi=`
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
`,mi={id:"droste",shortId:"dr",name:"Droste Effect",category:"Effects",params:{active:{type:"boolean",default:!1,label:"Droste Effect",shortId:"ac",uniform:"uDrosteActive",group:"main",noReset:!0},tiling:{type:"float",default:1,label:"Tiling Mode",shortId:"tm",uniform:"uDrosteTiling",group:"geometry",noReset:!0,condition:{param:"active",bool:!0},options:[{label:"Repeat",value:0},{label:"Mirror",value:1},{label:"Clamp",value:2},{label:"Transparent",value:3}]},center:{type:"vec2",default:new Te(0,0),label:"Center Shift",shortId:"cs",uniform:"uDrosteCenter",min:-100,max:100,step:.1,group:"geometry",condition:{param:"active",bool:!0},noReset:!0},radiusInside:{type:"float",default:5,label:"Inner Rad",shortId:"r1",uniform:"uDrosteR1",min:.1,max:100,step:.1,group:"geometry",layout:"half",condition:{param:"active",bool:!0},noReset:!0},radiusOutside:{type:"float",default:100,label:"Outer Rad",shortId:"r2",uniform:"uDrosteR2",min:1,max:200,step:.1,group:"geometry",layout:"half",condition:{param:"active",bool:!0},noReset:!0},strands:{type:"float",default:2,label:"Strands",shortId:"p2",uniform:"uDrosteStrands",min:-12,max:12,step:1,group:"structure",condition:{param:"active",bool:!0},noReset:!0},strandMirror:{type:"boolean",default:!1,label:"Mirror Strand",shortId:"sm",uniform:"uDrosteMirror",group:"structure",parentId:"strands",condition:{param:"active",bool:!0},noReset:!0},autoPeriodicity:{type:"boolean",default:!1,label:"Auto Period",shortId:"ap",uniform:"uDrosteAuto",group:"structure",condition:{param:"active",bool:!0},noReset:!0},periodicity:{type:"float",default:2,label:"Periodicity",shortId:"p1",uniform:"uDrostePeriodicity",min:-10,max:10,step:.1,group:"structure",parentId:"autoPeriodicity",condition:[{param:"active",bool:!0},{param:"autoPeriodicity",bool:!1}],noReset:!0},zoom:{type:"float",default:0,label:"Zoom",shortId:"zm",uniform:"uDrosteZoom",min:-10,max:10,step:.1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},rotate:{type:"float",default:0,label:"Spiral Rotate",shortId:"ro",uniform:"uDrosteRotate",min:-360,max:360,step:1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},rotateSpin:{type:"float",default:0,label:"Image Spin",shortId:"sp",uniform:"uDrosteSpin",min:-360,max:360,step:1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},rotatePolar:{type:"float",default:0,label:"Polar Rotate",shortId:"pr",uniform:"uDrostePolar",min:-360,max:360,step:1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},twist:{type:"boolean",default:!0,label:"Twist (Conformal)",shortId:"tw",uniform:"uDrosteTwist",group:"transform",condition:{param:"active",bool:!0},noReset:!0},hyperDroste:{type:"boolean",default:!1,label:"Hyper Droste",shortId:"hd",uniform:"uDrosteHyper",group:"transform",condition:{param:"active",bool:!0},noReset:!0},fractalPoints:{type:"float",default:1,label:"Fractal Points",shortId:"fp",uniform:"uDrosteFractal",min:0,max:10,step:1,group:"transform",parentId:"hyperDroste",condition:[{param:"active",bool:!0},{param:"hyperDroste",bool:!0}],noReset:!0}},postShader:{functions:pi,mainUV:`
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
        `}},gi={id:"postEffects",shortId:"pe",name:"Post Effects",category:"Post Process",params:{bloomIntensity:{type:"float",default:0,label:"Bloom",shortId:"bi",uniform:"uBloomIntensity",min:0,max:5,step:.01,group:"bloom",noReset:!0,format:e=>{const n=e;return n===0?"0.0 (off)":n.toFixed(3)}},bloomThreshold:{type:"float",default:.25,label:"Threshold",shortId:"bt",uniform:"uBloomThreshold",min:0,max:2,step:.01,group:"bloom",parentId:"bloomIntensity",condition:{gt:0},noReset:!0},bloomRadius:{type:"float",default:7,label:"Spread",shortId:"br",uniform:"uBloomRadius",min:.5,max:7,step:.1,group:"bloom",parentId:"bloomIntensity",condition:{gt:0},noReset:!0},caStrength:{type:"float",default:0,label:"Chromatic Aberration",shortId:"ca",uniform:"uCAStrength",min:0,max:10,step:.01,group:"lens",noReset:!0,format:e=>{const n=e;return n===0?"0.0 (off)":n.toFixed(3)}}},postShader:{uniforms:"uniform sampler2D uBloomTexture;",functions:`
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
        `}},xi=`
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
`,bi=`
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
`,yi=`
    // EnvStrength scaling for Direct Render Mode
    #ifdef RENDER_MODE_PATHTRACING
        #define uEnvStrength uEnvStrengthSlider
    #else
        #define uEnvStrength (uEnvStrengthSlider * 0.33)
    #endif
`,vi={id:"materials",shortId:"m",name:"Material",category:"Rendering",tabConfig:{label:"Shader",componentId:"panel-shading",order:40},params:{diffuse:{type:"float",default:1,label:"Diffuse (Color)",shortId:"di",uniform:"uDiffuse",min:0,max:2,step:.01,group:"surface"},reflection:{type:"float",default:0,label:"Metallic",shortId:"re",uniform:"uReflection",min:0,max:1,step:.01,group:"surface"},specular:{type:"float",default:.3,label:"Reflectivity",shortId:"sp",uniform:"uSpecular",min:0,max:2,step:.01,group:"surface"},roughness:{type:"float",default:.5,label:"Roughness",shortId:"ro",uniform:"uRoughness",min:.001,max:1,step:.001,group:"surface"},rim:{type:"float",default:0,label:"Rim Light",shortId:"ri",uniform:"uRim",min:0,max:10,step:.01,scale:"log",group:"surface"},rimExponent:{type:"float",default:4,label:"Rim Sharpness",shortId:"rx",uniform:"uRimExponent",min:1,max:16,step:.1,group:"surface",parentId:"rim",condition:{gt:0}},envStrength:{type:"float",default:0,label:"Environment Light",shortId:"es",uniform:"uEnvStrengthSlider",min:0,max:5,step:.01,group:"env"},envBackgroundStrength:{type:"float",default:0,label:"BG Visibility",shortId:"eb",uniform:"uEnvBackgroundStrength",min:0,max:2,step:.01,group:"env",parentId:"envStrength",condition:{gt:0,param:"envStrength"}},envSource:{type:"float",default:1,label:"Source",shortId:"eo",uniform:"uEnvSource",group:"env",parentId:"envStrength",condition:{gt:0,param:"envStrength"},options:[{label:"Sky Image",value:0},{label:"Gradient",value:1}]},envMapData:{type:"image",default:null,label:"Upload Texture",shortId:"et",group:"env",parentId:"envSource",condition:{eq:0},uniform:"uEnvMapTexture",textureSettings:{mapping:Hs,minFilter:$s,generateMipmaps:!0},linkedParams:{colorSpace:"envMapColorSpace"}},envMapColorSpace:{type:"float",default:0,label:"Env Profile",shortId:"ec",uniform:"uEnvMapColorSpace",group:"env",hidden:!0},useEnvMap:{type:"boolean",default:!1,label:"Use Env Map",shortId:"eu",uniform:"uUseEnvMap",hidden:!0,group:"env"},envRotation:{type:"float",default:0,label:"Rotation",shortId:"er",uniform:"uEnvRotation",min:0,max:6.28,step:.01,group:"env",parentId:"envSource",condition:[{param:"envStrength",gt:0},{param:"envSource",eq:0}]},envGradientStops:{type:"gradient",default:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],label:"Sky Gradient",shortId:"eg",uniform:"uEnvGradient",group:"env",parentId:"envSource",condition:{eq:1}},emission:{type:"float",default:0,label:"Self-illumination",shortId:"em",uniform:"uEmission",min:0,max:5,step:.001,scale:"square",group:"emission"},emissionMode:{type:"float",default:0,label:"Emission Source",shortId:"ec",uniform:"uEmissionMode",min:0,max:4,step:1,group:"emission",parentId:"emission",condition:{gt:1e-4},options:[{label:"Full Surface",value:0},{label:"Layer 1",value:1},{label:"Layer 2",value:2},{label:"Layer 3",value:3},{label:"Solid Color",value:4}]},emissionColor:{type:"color",default:new Ve(1,1,1),label:"Solid Color",shortId:"el",uniform:"uEmissionColor",group:"emission",parentId:"emissionMode",condition:{eq:4}},ptEmissionMult:{type:"float",default:1,label:"Illumination Power",shortId:"ep",uniform:"uPTEmissionMult",min:0,max:10,step:.1,group:"emission",parentId:"emission",condition:[{gt:1e-4},{param:"$renderMode",eq:"PathTracing"}]}},inject:e=>{e.addHeader(yi),e.addMaterialLogic(bi),e.addFunction(xi)}},wi={id:"colorGrading",shortId:"cg",name:"Color Grading",category:"Post Process",customUI:[{componentId:"scene-histogram",group:"grading",parentId:"active",condition:{param:"active",bool:!0}}],params:{active:{type:"boolean",default:!1,label:"Color Correction",shortId:"ac",uniform:"uGradingActive",group:"grading",noReset:!0},toneMapping:{type:"float",default:0,label:"Tone Mapping",shortId:"tm",uniform:"uToneMapping",group:"grading",parentId:"active",noReset:!0,options:[{label:"ACES",value:0},{label:"AgX",value:1},{label:"Reinhard",value:2},{label:"Neutral",value:3},{label:"None",value:4}]},saturation:{type:"float",default:1,label:"Saturation",shortId:"sa",uniform:"uSaturation",min:0,max:2,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0},levelsMin:{type:"float",default:0,label:"Black Point",shortId:"ln",uniform:"uLevelsMin",min:0,max:1,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0,hidden:!0},levelsMax:{type:"float",default:1,label:"White Point",shortId:"lx",uniform:"uLevelsMax",min:0,max:2,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0,hidden:!0},levelsGamma:{type:"float",default:1,label:"Gamma",shortId:"lg",uniform:"uLevelsGamma",min:.1,max:3,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0,hidden:!0}},postShader:{functions:`
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
        `}},Si={id:"texturing",shortId:"tx",name:"Texture",category:"Coloring",params:{active:{type:"boolean",default:!1,label:"Use Texture",shortId:"ac",uniform:"uUseTexture",group:"main",hidden:!0},layer1Data:{type:"image",default:null,label:"Select Image",shortId:"id",group:"main",uniform:"uTexture",textureSettings:{wrapS:Gn,wrapT:Gn,minFilter:Bn,magFilter:Bn},linkedParams:{colorSpace:"colorSpace"}},colorSpace:{type:"float",default:0,label:"Color Profile",shortId:"cs",uniform:"uTextureColorSpace",group:"main",hidden:!0},mapU:{type:"float",default:6,label:"U",shortId:"mu",uniform:"uTextureModeU",group:"mapping",layout:"half",options:[{label:"Orbit Trap",value:0},{label:"Iterations",value:1},{label:"Radial",value:2},{label:"Z-Depth",value:3},{label:"Angle",value:4},{label:"Normal",value:5},{label:"Decomposition",value:6},{label:"Raw Iterations",value:7},{label:"Potential (Log-Log)",value:8},{label:"Green's Flow",value:9}]},mapV:{type:"float",default:1,label:"V",shortId:"mv",uniform:"uTextureModeV",group:"mapping",layout:"half",options:[{label:"Orbit Trap",value:0},{label:"Iterations",value:1},{label:"Radial",value:2},{label:"Z-Depth",value:3},{label:"Angle",value:4},{label:"Normal",value:5},{label:"Decomposition",value:6},{label:"Raw Iterations",value:7},{label:"Potential (Log-Log)",value:8},{label:"Green's Flow",value:9}]},textureScale:{type:"vec2",default:new Te(1,1),label:"Scale UV",shortId:"ts",uniform:"uTextureScale",min:.1,max:500,step:.1,scale:"log",group:"transform"},offset:{type:"vec2",default:new Te(0,0),label:"Texture Offset",shortId:"of",uniform:"uTextureOffset",min:-2,max:2,step:.01,group:"transform"}}},lr=[{value:0,label:"Orbit Trap",description:"Colors based on how close the orbit came to the origin or geometric traps.",glsl:"v = log(max(1.0e-5, result.y)) * -0.2;"},{value:1,label:"Iterations",description:"Smooth gradients based on how long it took to escape. The classic look.",glsl:`
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
        `},{value:10,label:"Orbit X (YZ plane)",description:"Per-component orbit trap: closest approach to the YZ plane (abs x).",glsl:"v = log(max(1.0e-5, g_orbitTrap.x)) * -0.2;"},{value:11,label:"Orbit Y (XZ plane)",description:"Per-component orbit trap: closest approach to the XZ plane (abs y).",glsl:"v = log(max(1.0e-5, g_orbitTrap.y)) * -0.2;"},{value:12,label:"Orbit Z (XY plane)",description:"Per-component orbit trap: closest approach to the XY plane (abs z).",glsl:"v = log(max(1.0e-5, g_orbitTrap.z)) * -0.2;"},{value:13,label:"Orbit W (Origin)",description:"Per-component orbit trap: closest squared distance to the origin.",glsl:"v = log(max(1.0e-5, g_orbitTrap.w)) * -0.2;"}],Mi=()=>{let e=`
    float getMappingValue(float mode, vec3 p, vec4 result, vec3 n, float repeatScale) {
        float v = 0.0;

        // Mode Selection (switch for jump-table codegen)
        switch(int(mode + 0.1)) {
    `;return lr.forEach(n=>{e+=`
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
    `,e},Jn=lr.map(e=>({label:e.label,value:e.value})),Ci={id:"coloring",shortId:"cl",name:"Coloring",category:"Visuals",tabConfig:{label:"Gradient",componentId:"panel-gradients",order:50},customUI:[{componentId:"coloring-histogram",group:"layer1_hist",props:{layer:1}},{componentId:"coloring-histogram",group:"layer2_hist",props:{layer:2}}],params:{gradient:{type:"gradient",default:[{id:"2",position:1,color:"#ffffff",bias:.5,interpolation:"linear"}],label:"Gradient",shortId:"g1",uniform:"uGradientTexture",group:"layer1_grad"},mode:{type:"float",default:0,label:"Mapping",shortId:"m1",uniform:"uColorMode",group:"layer1_top",options:Jn},scale:{type:"float",default:1,label:"Scale",shortId:"s1",uniform:"uColorScale",group:"layer1_hist",hidden:!0},offset:{type:"float",default:0,label:"Offset",shortId:"o1",uniform:"uColorOffset",group:"layer1_hist",hidden:!0},repeats:{type:"float",default:1,label:"Repeats",shortId:"r1",min:.1,max:100,step:.1,group:"layer1_hist",hidden:!0},phase:{type:"float",default:0,label:"Phase",shortId:"p1",min:-1,max:1,step:.01,group:"layer1_hist",hidden:!0},bias:{type:"float",default:1,label:"Gamma",shortId:"b1",uniform:"uGradientBias",min:.1,max:10,step:.01,group:"layer1_hist",hidden:!0},colorIter:{type:"float",default:0,label:"Color Iterations",shortId:"ci",uniform:"uColorIter",min:0,max:24,step:1,group:"layer1_bottom",description:"Stop orbit trap capture at this iteration (0 = use all iterations)",condition:{or:[{param:"mode",eq:0},{param:"mode",eq:1},{param:"mode",eq:7},{param:"mode",eq:8},{param:"mode",eq:9},{param:"mode",eq:10},{param:"mode",eq:11},{param:"mode",eq:12},{param:"mode",eq:13},{param:"mode2",eq:0},{param:"mode2",eq:1},{param:"mode2",eq:7},{param:"mode2",eq:8},{param:"mode2",eq:9},{param:"mode2",eq:10},{param:"mode2",eq:11},{param:"mode2",eq:12},{param:"mode2",eq:13}]}},twist:{type:"float",default:0,label:"Twist",shortId:"w1",uniform:"uColorTwist",min:-5,max:5,step:.1,group:"layer1_bottom"},escape:{type:"float",default:4,label:"Escape Radius",shortId:"e1",uniform:"uEscapeThresh",min:1,max:1e3,step:.1,scale:"log",group:"layer1_bottom",condition:{or:[{param:"mode",eq:6},{param:"mode",eq:8},{param:"mode",eq:9},{param:"mode2",eq:6},{param:"mode2",eq:8},{param:"mode2",eq:9},{and:[{param:"$texturing.active",bool:!0},{or:[{param:"$texturing.mapU",eq:6},{param:"$texturing.mapU",eq:8},{param:"$texturing.mapU",eq:9},{param:"$texturing.mapV",eq:6},{param:"$texturing.mapV",eq:8},{param:"$texturing.mapV",eq:9}]}]}]}},gradient2:{type:"gradient",default:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}],label:"Gradient 2",shortId:"g2",uniform:"uGradientTexture2",group:"layer2_grad"},mode2:{type:"float",default:4,label:"Mapping",shortId:"m2",uniform:"uColorMode2",group:"layer2_top",options:Jn},scale2:{type:"float",default:1,label:"Scale 2",shortId:"s2",uniform:"uColorScale2",group:"layer2_hist",hidden:!0},offset2:{type:"float",default:0,label:"Offset 2",shortId:"o2",uniform:"uColorOffset2",group:"layer2_hist",hidden:!0},repeats2:{type:"float",default:1,label:"Repeats",shortId:"r2",min:.1,max:100,step:.1,group:"layer2_hist",hidden:!0},phase2:{type:"float",default:0,label:"Phase",shortId:"p2",min:-1,max:1,step:.01,group:"layer2_hist",hidden:!0},bias2:{type:"float",default:1,label:"Gamma",shortId:"b2",uniform:"uGradientBias2",min:.1,max:10,step:.01,group:"layer2_hist",hidden:!0},twist2:{type:"float",default:0,label:"Twist",shortId:"w2",uniform:"uColorTwist2",min:-5,max:5,step:.1,group:"layer2_bottom"},blendMode:{type:"float",default:0,label:"Blend Mode",shortId:"bm",uniform:"uBlendMode",group:"layer2_bottom",options:[{label:"Mix",value:0},{label:"Add",value:1},{label:"Multiply",value:2},{label:"Overlay",value:3},{label:"Screen",value:4},{label:"Bump (Normal)",value:6}]},blendOpacity:{type:"float",default:0,label:"Blend Amount",shortId:"bo",uniform:"uBlendOpacity",min:0,max:1,step:.01,group:"layer2_bottom"},layer3Color:{type:"color",default:new Ve(1,1,1),label:"Noise Color",shortId:"n3c",uniform:"uLayer3Color",group:"noise",layout:"embedded"},layer3Scale:{type:"float",default:2,label:"Noise Scale",shortId:"n3s",uniform:"uLayer3Scale",min:.1,max:2e3,step:.1,scale:"log",group:"noise"},layer3Strength:{type:"float",default:0,label:"Mix Strength",shortId:"n3a",uniform:"uLayer3Strength",min:0,max:1,step:.01,group:"noise"},layer3Bump:{type:"float",default:0,label:"Bump",shortId:"n3b",uniform:"uLayer3Bump",min:-1,max:1,step:.01,group:"noise"},layer3Turbulence:{type:"float",default:0,label:"Turbulence",shortId:"n3t",uniform:"uLayer3Turbulence",min:0,max:2,step:.01,group:"noise"},layer3Enabled:{type:"boolean",default:!0,label:"Load Noise (Layer 3)",shortId:"l3e",group:"engine_settings",ui:"checkbox",description:"Compiles simplex noise into the shader. Disable to reduce compile time when Layer 3 is not needed.",onUpdate:"compile",noReset:!0}},inject:(e,n,t)=>{const o=n.coloring;(o==null?void 0:o.layer3Enabled)!==!1&&e.addDefine("LAYER3_ENABLED","1"),e.addPreamble("vec4 g_orbitTrap = vec4(1e10);"),e.addPreamble("float escape = 0.0;"),t==="Main"||t==="Histogram"?e.addFunction(Mi()):e.addFunction(`
                float getMappingValue(float mode, vec3 p, vec4 result, vec3 n, float repeatScale) { return 0.0; }
            `)}},ki={id:"standard",label:"Standard (Tglad)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = clamp(z, -foldLimit, foldLimit) * 2.0 - z;
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:2}},ji={id:"mirror",label:"Mirror",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = foldLimit - abs(abs(z) - foldLimit);
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:3}},Ri={id:"half",label:"Half-fold",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = abs(z + foldLimit);
}
`,defaults:{hybridScale:1.5,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.3,hybridFixedR:1,hybridIter:2}},Ii={id:"decoupled",label:"Decoupled",glsl:`
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
`,extraParams:{hybridFoldingValue:{type:"vec3",default:new V(2,2,2),label:"Folding Value",shortId:"hfv",uniform:"uHybridFoldingValue",min:.1,max:5,step:.01,group:"hybrid"}},defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:2,hybridFoldingValue:{x:2,y:2,z:2}}},Pi={id:"kali",label:"Kali",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = uHybridKaliConstant - abs(z);
}
`,rotMode:"post",extraParams:{hybridKaliConstant:{type:"vec3",default:new V(1,1,1),label:"Kali Constant",shortId:"hkc",uniform:"uHybridKaliConstant",min:-3,max:3,step:.01,group:"hybrid"}},defaults:{hybridScale:1.5,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.6,hybridFixedR:1,hybridIter:3,hybridKaliConstant:{x:.5,y:.5,z:.5}}},Ti={id:"tetra",label:"Tetrahedral (KIFS)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    if (z.x + z.y < 0.0) z.xy = -z.yx;
    if (z.x + z.z < 0.0) z.xz = -z.zx;
    if (z.y + z.z < 0.0) z.yz = -z.zy;
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.25,hybridFixedR:1,hybridIter:3}},Ei={id:"octa",label:"Octahedral (KIFS)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    // Knighty's octahedral fold — diagonal plane reflections + axis sorting
    if (z.x + z.y < 0.0) z.xy = -z.yx;
    if (z.x + z.z < 0.0) z.xz = -z.zx;
    if (z.x - z.y < 0.0) z.xy = z.yx;
    if (z.x - z.z < 0.0) z.xz = z.zx;
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:3}},Li={id:"icosa",label:"Icosahedral (KIFS)",glsl:`
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
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.3,hybridFixedR:1,hybridIter:4}},Ni={id:"menger",label:"Menger (Cubic)",glsl:`
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
`,selfContained:!0,extraParams:{hybridMengerOffset:{type:"vec3",default:new V(1,1,1),label:"Offset",shortId:"hmo",uniform:"uHybridMengerOffset",min:0,max:2,step:.01,group:"hybrid",linkable:!0},hybridMengerCenterZ:{type:"boolean",default:!0,label:"Center Z",shortId:"hmz",uniform:"uHybridMengerCenterZ",group:"hybrid"}},defaults:{hybridScale:3,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:3,hybridMengerOffset:{x:1,y:1,z:1},hybridMengerCenterZ:!0}},Ra=[ki,ji,Ri,Ii,Pi,Ti,Ei,Li,Ni],Di=Ra.map((e,n)=>({label:e.label,value:n}));function _i(e){return Ra[e]??Ra[0]}const Fi=["xyz","xzy","yxz","yzx","zxy","zyx"];function Ai(e){const n=Fi[e]??"xyz";return n==="xyz"?"vec3 c_perm = c.xyz;":`vec3 c_perm = c.${n};`}function zi(e,n,t=!1){return`
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
`}function Oi(){const e={};return Ra.forEach((n,t)=>{n.extraParams&&Object.entries(n.extraParams).forEach(([o,s])=>{e[o]={...s,condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0},{param:"hybridFoldType",eq:t}]}})}),e}const $i={id:"geometry",shortId:"g",name:"Geometry",category:"Formulas",customUI:[{componentId:"interaction-picker",group:"julia",parentId:"juliaMode",condition:{bool:!0},props:{targetMode:"picking_julia",label:"Pick Coordinate",activeLabel:"Cancel Picking",helpText:"Click any point on the fractal surface to set Julia coordinates.",variant:"primary"}},{componentId:"julia-randomize",group:"julia",parentId:"juliaMode",condition:{bool:!0}}],engineConfig:{toggleParam:"applyTransformLogic",mode:"compile",label:"Geometry Modifiers",groupFilter:"engine_settings"},params:{applyTransformLogic:{type:"boolean",default:!0,label:"Geometry Engine",shortId:"gt",group:"main",description:"Master switch for geometry modifiers (Julia, Rotation, Hybrid).",noReset:!0,hidden:!0},preRotMaster:{type:"boolean",default:!0,label:"Enable Rotation",shortId:"rm",group:"engine_settings",ui:"checkbox",description:"Compiles rotation matrix logic. Disable for speed.",onUpdate:"compile",noReset:!0,estCompileMs:600},hybridCompiled:{type:"boolean",default:!1,label:"Hybrid Box Fold",shortId:"hcm",group:"engine_settings",ui:"checkbox",description:"Compiles hybrid box fold system into shader. Toggle effect on/off instantly from Formula panel.",onUpdate:"compile",noReset:!0,estCompileMs:1200},hybridMode:{type:"boolean",default:!1,label:"Hybrid Active",shortId:"hm",uniform:"uHybrid",group:"hybrid",hidden:!0},hybridFoldType:{type:"float",default:0,label:"Fold Type",shortId:"hft",group:"engine_settings",options:Di.map(e=>({...e,estCompileMs:400})),description:"Box fold algorithm. Each type produces fundamentally different geometry.",onUpdate:"compile",noReset:!0,condition:{param:"hybridCompiled",bool:!0}},hybridComplex:{type:"boolean",default:!1,label:"Interleaved Mode",shortId:"hx",group:"engine_settings",ui:"checkbox",description:"Interleaves fold with fractal formula (Box → Fractal → Box). Slow compile.",onUpdate:"compile",noReset:!0,estCompileMs:1500,condition:{param:"hybridCompiled",bool:!0}},hybridPermute:{type:"float",default:0,label:"Axis Permutation",shortId:"hpe",group:"engine_settings",options:[{label:"XYZ (Default)",value:0},{label:"XZY",value:1},{label:"YXZ",value:2},{label:"YZX",value:3},{label:"ZXY",value:4},{label:"ZYX",value:5}],description:"Permutes the constant (c) axis mapping. Changes fractal topology.",onUpdate:"compile",noReset:!0,condition:{param:"hybridCompiled",bool:!0}},burningEnabled:{type:"boolean",default:!1,label:"Burning Mode",shortId:"bm",group:"burning",description:'Applies absolute value to coordinates every iteration. Creates "Burning Ship" variations.',uniform:"uBurningEnabled"},hybridIter:{type:"float",default:2,label:"Iterations",shortId:"hi",uniform:"uHybridIter",min:0,max:10,step:1,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridFoldLimit:{type:"float",default:1,label:"Fold Limit",shortId:"hl",uniform:"uHybridFoldLimit",min:.1,max:2,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}],hidden:!0},hybridFoldLimitVec:{type:"vec3",default:new V(1,1,1),label:"Fold Limit",shortId:"hlv",uniform:"uHybridFoldLimitVec",min:.1,max:3,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0},{param:"hybridFoldType",lt:4}],linkable:!0},hybridScale:{type:"float",default:2,label:"Scale",shortId:"hs",uniform:"uHybridScale",min:.5,max:3,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridScaleVary:{type:"float",default:0,label:"Scale Variation",shortId:"hsv",uniform:"uHybridScaleVary",min:-1,max:1,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}],description:"Dynamic scale feedback per iteration (ABoxVaryScale)."},hybridMinR:{type:"float",default:.5,label:"Min Radius",shortId:"hn",uniform:"uHybridMinR",min:0,max:1.5,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridFixedR:{type:"float",default:1,label:"Fixed Radius",shortId:"hf",uniform:"uHybridFixedR",min:.1,max:3,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridAddC:{type:"boolean",default:!1,label:"Add Constant",shortId:"hc",uniform:"uHybridAddC",group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridShift:{type:"vec3",default:new V(0,0,0),label:"Shift",shortId:"hs2",uniform:"uHybridShift",min:-2,max:2,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridRot:{type:"vec3",default:new V(0,0,0),label:"Rotation",shortId:"hr",uniform:"uHybridRot",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",mode:"rotation",group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},...Oi(),hybridSwap:{type:"boolean",default:!1,label:"Swap Order",shortId:"hw",group:"engine_settings",ui:"checkbox",description:"Start with fractal formula instead of box fold.",onUpdate:"compile",noReset:!0,condition:[{param:"hybridCompiled",bool:!0},{param:"hybridComplex",bool:!0}]},hybridSkip:{type:"int",default:1,label:"Hybrid Interval",shortId:"hk",uniform:"uHybridSkip",min:1,max:8,step:1,group:"hybrid",condition:[{param:"hybridComplex",bool:!0},{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},preRotEnabled:{type:"boolean",default:!1,label:"Local Rotation",shortId:"re",group:"transform",condition:{param:"preRotMaster",bool:!0}},preRotX:{type:"float",default:0,label:"Pre X",shortId:"rx",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},preRotY:{type:"float",default:0,label:"Pre Y",shortId:"ry",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},preRotZ:{type:"float",default:0,label:"Pre Z",shortId:"rz",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},preRot:{type:"vec3",default:new V(0,0,0),label:"Pre Rotation",composeFrom:["preRotX","preRotY","preRotZ"],min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0}},postRotX:{type:"float",default:0,label:"Post X",shortId:"qx",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},postRotY:{type:"float",default:0,label:"Post Y",shortId:"qy",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},postRotZ:{type:"float",default:0,label:"Post Z",shortId:"qz",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},postRot:{type:"vec3",default:new V(0,0,0),label:"Post Rotation",composeFrom:["postRotX","postRotY","postRotZ"],min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0}},worldRotX:{type:"float",default:0,label:"World X",shortId:"wx",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},worldRotY:{type:"float",default:0,label:"World Y",shortId:"wy",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},worldRotZ:{type:"float",default:0,label:"World Z",shortId:"wz",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},worldRot:{type:"vec3",default:new V(0,0,0),label:"World Rotation",composeFrom:["worldRotX","worldRotY","worldRotZ"],min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0}},juliaMode:{type:"boolean",default:!1,label:"Julia Mode",shortId:"jm",uniform:"uJuliaMode",group:"julia",description:"Replaces the iterating variable with a fixed coordinate, producing connected Julia set slices."},juliaX:{type:"float",default:0,label:"Julia X",shortId:"jx",min:-2,max:2,step:.01,group:"julia_params",condition:{param:"juliaMode",bool:!0},hidden:!0},juliaY:{type:"float",default:0,label:"Julia Y",shortId:"jy",min:-2,max:2,step:.01,group:"julia_params",condition:{param:"juliaMode",bool:!0},hidden:!0},juliaZ:{type:"float",default:0,label:"Julia Z",shortId:"jz",min:-2,max:2,step:.01,group:"julia_params",condition:{param:"juliaMode",bool:!0},hidden:!0},julia:{type:"vec3",default:new V(0,0,0),label:"Julia Coordinate",uniform:"uJulia",composeFrom:["juliaX","juliaY","juliaZ"],min:-2,max:2,step:.01,group:"julia",parentId:"juliaMode",condition:{bool:!0}}},inject:(e,n)=>{const t=n.geometry;if((t?t.applyTransformLogic:!0)===!1){e.addFunction(`void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {}
void initHybridTransform() {}
void formula_Hybrid(inout vec4 z, inout float dr, inout float trap, vec4 c) {}`);return}const s=t?t.preRotMaster!==!1:!0;e.setRotation(s);const i=(t==null?void 0:t.hybridCompiled)??!1;if(!i)e.addFunction(`void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {}
void initHybridTransform() {}
void formula_Hybrid(inout vec4 z, inout float dr, inout float trap, vec4 c) {}`);else{const d=(t==null?void 0:t.hybridFoldType)??0,f=_i(d);e.addFunction(f.glsl);const h=(t==null?void 0:t.hybridPermute)??0,p=Ai(h);e.addFunction(zi(p,f.rotMode??"wrap",f.selfContained??!1))}let r="",l="";if(n.formula!=="MandelTerrain"&&(l+="z.xyz = mix(z.xyz, abs(z.xyz), step(0.5, uBurningEnabled));"),i)if(!(t&&t.hybridComplex))r+=`
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
                `}e.addHybridFold("",r,l)}},Hi={id:"quality",shortId:"q",name:"Quality",category:"Rendering",tabConfig:{label:"Quality",componentId:"panel-quality",order:60},engineConfig:{toggleParam:"engineQuality",mode:"compile",label:"Loop Limits & Precision",groupFilter:"engine_settings"},params:{engineQuality:{type:"boolean",default:!0,label:"Quality Core",shortId:"qc",group:"main",noReset:!0,hidden:!0},compilerHardCap:{type:"int",default:500,label:"Hard Loop Cap",shortId:"hc",min:64,max:2e3,step:1,group:"engine_settings",ui:"numeric",description:"Safety limit for ray/DE loops (MAX_HARD_ITERATIONS define). Requires recompile but does not affect compile time — ANGLE/D3D does not unroll define-bounded loops.",onUpdate:"compile",noReset:!0,hidden:!0},precisionMode:{type:"float",default:0,label:"Ray Precision",shortId:"pm",group:"engine_settings",options:[{label:"High (Desktop)",value:0},{label:"Standard (Mobile)",value:1}],description:"Sets the minimum epsilon (ray hit distance). Standard prevents GPU hangs on mobile.",onUpdate:"compile",noReset:!0,hidden:!0},bufferPrecision:{type:"float",default:0,label:"Texture Buffer",shortId:"bp",group:"engine_settings",options:[{label:"Float32 (HDR)",value:0},{label:"HalfFloat16",value:1}],description:"Controls render target bit-depth. 16-bit is faster and required on some mobile GPUs.",onUpdate:"compile",noReset:!0,hidden:!0},maxSteps:{type:"int",default:300,label:"Max Ray Steps",shortId:"ms",uniform:"uMaxSteps",min:32,max:2e3,step:1,group:"kernel",description:"Runtime limit. Rays stop after this many steps. Artistic tool for limiting depth. Maximum is limited by Hard Loop Cap.",isAdvanced:!0,dynamicMaxRef:"compilerHardCap"},distanceMetric:{type:"float",default:0,label:"Distance Metric",shortId:"dm",uniform:"uDistanceMetric",group:"kernel",options:[{label:"Euclidean (Sphere)",value:0},{label:"Chebyshev (Box)",value:1},{label:"Manhattan (Diamond)",value:2},{label:"Minkowski 4 (Rounded)",value:3}],description:'The shape of "distance". Changes the aesthetic of the fractal surface.'},estimator:{type:"float",default:0,label:"Estimator",shortId:"es",group:"kernel",options:[{label:"Analytic (Log)",value:0},{label:"Linear (Unit 1.0)",value:1},{label:"Linear (Offset 2.0)",value:4},{label:"Pseudo (Raw)",value:2},{label:"Dampened",value:3}],description:"Algorithm for calculating distance. Log=Smooth, Linear=Sharp/IFS, Pseudo=Artifact Fix.",onUpdate:"compile",noReset:!0,isAdvanced:!0},fudgeFactor:{type:"float",default:1,label:"Slice Optimization",shortId:"ff",uniform:"uFudgeFactor",min:.01,max:1,step:.01,group:"kernel",description:"Multiplies step size. Lower = Higher quality but slower. Set to < 0.2 for deep zooms.",format:e=>e.toFixed(2)},stepRelaxation:{type:"float",default:0,label:"Step Relaxation",shortId:"sr",uniform:"uStepRelaxation",min:0,max:1,step:.01,group:"kernel",description:"Dynamic Step Size. 0 = Fixed Fudge. 1 = Variable (Fudge near surface, 1.0 in void). Saves steps.",isAdvanced:!0},stepJitter:{type:"float",default:.15,label:"Step Jitter",shortId:"sj",uniform:"uStepJitter",min:0,max:1,step:.01,group:"kernel",description:"Stochastic step variation. Breaks banding artifacts. Higher = softer edges, artistic blur.",format:e=>e.toFixed(2)},refinementSteps:{type:"int",default:0,label:"Edge Polish",shortId:"rf",uniform:"uRefinementSteps",min:0,max:5,step:1,group:"kernel",description:"Extra micro-steps after hitting surface. Fixes slicing/banding artifacts.",isAdvanced:!0},detail:{type:"float",default:1,label:"Ray detail",shortId:"rd",uniform:"uDetail",min:.1,max:10,step:.1,group:"kernel"},pixelThreshold:{type:"float",default:.5,label:"Pixel threshold",shortId:"pt",uniform:"uPixelThreshold",min:.1,max:2,step:.1,group:"kernel"},overstepTolerance:{type:"float",default:0,label:"Overstep Fix",shortId:"ot",uniform:"uOverstepTolerance",min:0,max:1e3,step:.1,scale:"log",group:"kernel",description:"Recovers details missed by the raymarcher. 0=Off. Higher values fix more holes but may create noise."},dynamicScaling:{type:"boolean",default:!1,label:"Adaptive Resolution",shortId:"ds",group:"performance",noReset:!0},interactionDownsample:{type:"float",default:2,label:"Move Quality",shortId:"id",min:1,max:4,step:.5,group:"performance",condition:{param:"dynamicScaling",bool:!0},format:e=>`1/${e}x`,noReset:!0},physicsProbeMode:{type:"float",default:0,label:"Distance Probe",shortId:"dp",group:"performance",isAdvanced:!0,options:[{label:"GPU Probe",value:0},{label:"Manual",value:2}],description:"GPU Probe: Reads distance from render target. Manual: Fixed value for orbit control.",noReset:!0},manualDistance:{type:"float",default:10,label:"Manual Distance",shortId:"md",min:.1,max:1e3,step:.1,group:"performance",isAdvanced:!0,parentId:"physicsProbeMode",condition:{param:"physicsProbeMode",eq:2},description:"Manual distance value. Used for orbit control calculations.",format:e=>e.toFixed(1),noReset:!0}},inject:(e,n)=>{const t=n.quality,o=(t==null?void 0:t.compilerHardCap)||500;e.addDefine("MAX_HARD_ITERATIONS",Math.floor(o).toString())}},Mh=220,Ch=24,kh=32,jh=24,Rh=24,Ih=50,cn=64,Ce=8,Ph={DEFAULT_BITRATE:40},Th=[{label:"MP4 (H.264) - Universal",container:"mp4",codec:"avc",ext:"mp4",mime:"video/mp4"},{label:"MP4 (H.265/HEVC) - High Quality",container:"mp4",codec:"hevc",ext:"mp4",mime:"video/mp4"},{label:"MP4 (AV1) - Best Compression",container:"mp4",codec:"av1",ext:"mp4",mime:"video/mp4"},{label:"WebM (VP9) - Web Standard",container:"webm",codec:"vp9",ext:"webm",mime:"video/webm"}];class Bi{constructor(){Q(this,"nodes",new Map)}register(n){this.nodes.set(n.id,n)}get(n){return this.nodes.get(n)}getAll(){return Array.from(this.nodes.values())}getGrouped(){const n={};return this.nodes.forEach(t=>{n[t.category]||(n[t.category]=[]),n[t.category].push(t.id)}),n}}const ke=new Bi;ke.register({id:"Note",label:"Comment / Note",category:"Utils",description:"A text block for leaving comments. Ignored by renderer.",inputs:[],glsl:e=>""});ke.register({id:"AddConstant",label:"Add C (Julia/Pixel)",category:"Utils",description:"Adds the Julia Constant (or Pixel Coordinate) to the position. Essential for Mandelbrot/Julia hybrids.",inputs:[{id:"scale",label:"Strength",min:0,max:2,step:.01,default:1}],glsl:e=>`${e.indent}${e.varName}_p += c.xyz * ${e.getParam("scale")};`});ke.register({id:"Scale",label:"Scale (Mult)",category:"Transforms",description:"Simple multiplication. Warning: For fractals, use IFS Scale to keep centered.",inputs:[{id:"scale",label:"Scale",min:.1,max:5,step:.01,default:2,hardMin:.001}],glsl:e=>`
${e.indent}${e.varName}_p *= ${e.getParam("scale")};
${e.indent}${e.varName}_dr *= abs(${e.getParam("scale")});
`});ke.register({id:"IFSScale",label:"IFS Scale (Homothety)",category:"Transforms",description:"Scales space while shifting to maintain a center. Critical for Menger/Sierpinski.",inputs:[{id:"scale",label:"Scale",min:1,max:5,step:.01,default:2},{id:"offset",label:"Offset",min:0,max:5,step:.01,default:1}],glsl:e=>`
${e.indent}{
${e.indent}    float scale = ${e.getParam("scale")};
${e.indent}    float off = ${e.getParam("offset")};
${e.indent}    ${e.varName}_p = ${e.varName}_p * scale - vec3(off * (scale - 1.0));
${e.indent}    ${e.varName}_dr *= abs(scale);
${e.indent}}
`});ke.register({id:"Rotate",label:"Rotate",category:"Transforms",description:"Rotates space around X, Y, Z axes.",inputs:[{id:"x",label:"Rot X",min:-180,max:180,step:1,default:0},{id:"y",label:"Rot Y",min:-180,max:180,step:1,default:0},{id:"z",label:"Rot Z",min:-180,max:180,step:1,default:0}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 rot = vec3(radians(${e.getParam("x")}), radians(${e.getParam("y")}), radians(${e.getParam("z")}));
${e.indent}    if(abs(rot.x)>0.001) { float s=sin(rot.x); float c=cos(rot.x); mat2 m=mat2(c,-s,s,c); ${e.varName}_p.yz = m*${e.varName}_p.yz; }
${e.indent}    if(abs(rot.y)>0.001) { float s=sin(rot.y); float c=cos(rot.y); mat2 m=mat2(c,-s,s,c); ${e.varName}_p.xz = m*${e.varName}_p.xz; }
${e.indent}    if(abs(rot.z)>0.001) { float s=sin(rot.z); float c=cos(rot.z); mat2 m=mat2(c,-s,s,c); ${e.varName}_p.xy = m*${e.varName}_p.xy; }
${e.indent}}
`});ke.register({id:"Translate",label:"Translate",category:"Transforms",description:"Linear shift of coordinates.",inputs:[{id:"x",label:"X",min:-5,max:5,step:.01,default:0},{id:"y",label:"Y",min:-5,max:5,step:.01,default:0},{id:"z",label:"Z",min:-5,max:5,step:.01,default:0}],glsl:e=>`
${e.indent}${e.varName}_p += vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")});
`});ke.register({id:"Mod",label:"Modulo (Repeat)",category:"Transforms",description:"Tiles space infinitely in a grid.",inputs:[{id:"x",label:"X Period",min:0,max:10,step:.1,default:0},{id:"y",label:"Y Period",min:0,max:10,step:.1,default:0},{id:"z",label:"Z Period",min:0,max:10,step:.1,default:0}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 per = vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")});
${e.indent}    if(abs(per.x)>0.001) ${e.varName}_p.x = mod(${e.varName}_p.x + 0.5*per.x, per.x) - 0.5*per.x;
${e.indent}    if(abs(per.y)>0.001) ${e.varName}_p.y = mod(${e.varName}_p.y + 0.5*per.y, per.y) - 0.5*per.y;
${e.indent}    if(abs(per.z)>0.001) ${e.varName}_p.z = mod(${e.varName}_p.z + 0.5*per.z, per.z) - 0.5*per.z;
${e.indent}}
`});ke.register({id:"AmazingFold",label:"Amazing Fold",category:"Folds",description:"The core folding logic of the Amazing Box (Box + Sphere fold). Does not scale or add C.",inputs:[{id:"limit",label:"Box Limit",min:.1,max:3,step:.01,default:1},{id:"minR",label:"Min Radius",min:0,max:2,step:.01,default:.5},{id:"fixedR",label:"Fixed Radius",min:0,max:3,step:.01,default:1}],glsl:e=>`
${e.indent}boxFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("limit")});
${e.indent}sphereFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("minR")}, ${e.getParam("fixedR")});
`});ke.register({id:"Abs",label:"Abs (Mirror)",category:"Folds",description:"Absolute value fold on all axes. Creates cubic symmetries.",inputs:[],glsl:e=>`${e.indent}${e.varName}_p = abs(${e.varName}_p);`});ke.register({id:"BoxFold",label:"Box Fold",category:"Folds",description:"Clamps space inside a box limit. The core of the Mandelbox.",inputs:[{id:"limit",label:"Limit",min:.1,max:3,step:.01,default:1,hardMin:.001}],glsl:e=>`${e.indent}boxFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("limit")});`});ke.register({id:"SphereFold",label:"Sphere Fold",category:"Folds",description:"Inverts space inside a sphere. Creates spherical voids.",inputs:[{id:"minR",label:"Min Radius",min:0,max:2,step:.01,default:.5},{id:"fixedR",label:"Fixed Radius",min:0,max:3,step:.01,default:1}],glsl:e=>`${e.indent}sphereFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("minR")}, ${e.getParam("fixedR")});`});ke.register({id:"PlaneFold",label:"Plane Fold",category:"Folds",description:"Reflects space across a plane defined by a Normal and Distance.",inputs:[{id:"x",label:"Normal X",min:-1,max:1,step:.01,default:0},{id:"y",label:"Normal Y",min:-1,max:1,step:.01,default:1},{id:"z",label:"Normal Z",min:-1,max:1,step:.01,default:0},{id:"d",label:"Offset",min:-2,max:2,step:.01,default:0}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 n = normalize(vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")}));
${e.indent}    ${e.varName}_p -= 2.0 * min(0.0, dot(${e.varName}_p, n) - ${e.getParam("d")}) * n;
${e.indent}}
`});ke.register({id:"MengerFold",label:"Menger Fold",category:"Folds",description:"Permutes coordinates (sorts xyz). Essential for Menger Sponges.",inputs:[],glsl:e=>`
${e.indent}if(${e.varName}_p.x < ${e.varName}_p.y) ${e.varName}_p.xy = ${e.varName}_p.yx;
${e.indent}if(${e.varName}_p.x < ${e.varName}_p.z) ${e.varName}_p.xz = ${e.varName}_p.zx;
${e.indent}if(${e.varName}_p.y < ${e.varName}_p.z) ${e.varName}_p.yz = ${e.varName}_p.zy;
`});ke.register({id:"SierpinskiFold",label:"Sierpinski Fold",category:"Folds",description:"Diagonal folding for Tetrahedral fractals (MixPinski).",inputs:[],glsl:e=>`
${e.indent}if(${e.varName}_p.x + ${e.varName}_p.y < 0.0) ${e.varName}_p.xy = -${e.varName}_p.yx;
${e.indent}if(${e.varName}_p.x + ${e.varName}_p.z < 0.0) ${e.varName}_p.xz = -${e.varName}_p.zx;
${e.indent}if(${e.varName}_p.y + ${e.varName}_p.z < 0.0) ${e.varName}_p.yz = -${e.varName}_p.zy;
`});ke.register({id:"Mandelbulb",label:"Mandelbulb",category:"Fractals",description:"The standard Power function. Includes phase shifts.",inputs:[{id:"power",label:"Power",min:1,max:16,step:.1,default:8},{id:"phaseX",label:"Phi Phase",min:-3.14,max:3.14,step:.01,default:0},{id:"phaseY",label:"Theta Phase",min:-3.14,max:3.14,step:.01,default:0},{id:"twist",label:"Z Twist",min:-2,max:2,step:.01,default:0}],glsl:e=>`
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
`});ke.register({id:"Sphere",label:"Sphere",category:"Primitives",description:"SDF Sphere.",inputs:[{id:"r",label:"Radius",min:.1,max:5,step:.01,default:1}],glsl:e=>`${e.indent}${e.varName}_d = length(${e.varName}_p) - ${e.getParam("r")};`});ke.register({id:"Box",label:"Box",category:"Primitives",description:"SDF Box.",inputs:[{id:"x",label:"Size X",min:.1,max:5,step:.01,default:1},{id:"y",label:"Size Y",min:.1,max:5,step:.01,default:1},{id:"z",label:"Size Z",min:.1,max:5,step:.01,default:1}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 b = vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")});
${e.indent}    vec3 d = abs(${e.varName}_p) - b;
${e.indent}    ${e.varName}_d = length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
${e.indent}}
`});ke.register({id:"Twist",label:"Twist (Z)",category:"Distortion",description:"Twists space along the Z-axis.",inputs:[{id:"amount",label:"Amount",min:-5,max:5,step:.01,default:1}],glsl:e=>`
${e.indent}{
${e.indent}    float c_tw = cos(${e.getParam("amount")} * ${e.varName}_p.z);
${e.indent}    float s_tw = sin(${e.getParam("amount")} * ${e.varName}_p.z);
${e.indent}    mat2 m_tw = mat2(c_tw, -s_tw, s_tw, c_tw);
${e.indent}    ${e.varName}_p.xy = m_tw * ${e.varName}_p.xy;
${e.indent}}
`});ke.register({id:"Bend",label:"Bend (Y)",category:"Distortion",description:"Bends space along the Y-axis.",inputs:[{id:"amount",label:"Amount",min:-2,max:2,step:.01,default:.5}],glsl:e=>`
${e.indent}{
${e.indent}    float c_bn = cos(${e.getParam("amount")} * ${e.varName}_p.y);
${e.indent}    float s_bn = sin(${e.getParam("amount")} * ${e.varName}_p.y);
${e.indent}    mat2 m_bn = mat2(c_bn, -s_bn, s_bn, c_bn);
${e.indent}    ${e.varName}_p.xz = m_bn * ${e.varName}_p.xz;
${e.indent}}
`});ke.register({id:"SineWave",label:"Sine Wave",category:"Distortion",description:"Adds a sinusoidal ripple to the position.",inputs:[{id:"freq",label:"Frequency",min:.1,max:10,step:.1,default:2},{id:"amp",label:"Amplitude",min:0,max:1,step:.01,default:.1}],glsl:e=>`
${e.indent}${e.varName}_p += sin(${e.varName}_p.yzx * ${e.getParam("freq")}) * ${e.getParam("amp")};
`});ke.register({id:"Union",label:"Union",category:"Combiners (CSG)",description:"Combines two shapes (min).",inputs:[],glsl:e=>`
${e.indent}bool winA = ${e.varName}_d < ${e.in2}_d;
${e.indent}${e.varName}_d = winA ? ${e.varName}_d : ${e.in2}_d;
${e.indent}${e.varName}_p = winA ? ${e.varName}_p : ${e.in2}_p;
${e.indent}${e.varName}_dr = winA ? ${e.varName}_dr : ${e.in2}_dr;
`});ke.register({id:"Subtract",label:"Subtract",category:"Combiners (CSG)",description:"Carves B out of A.",inputs:[],glsl:e=>`
${e.indent}float negB = -${e.in2}_d;
${e.indent}bool winA = ${e.varName}_d > negB; 
${e.indent}${e.varName}_d = winA ? ${e.varName}_d : negB;
${e.indent}${e.varName}_p = winA ? ${e.varName}_p : ${e.in2}_p;
${e.indent}${e.varName}_dr = winA ? ${e.varName}_dr : ${e.in2}_dr;
`});ke.register({id:"Intersect",label:"Intersect",category:"Combiners (CSG)",description:"Area where A and B overlap.",inputs:[],glsl:e=>`
${e.indent}bool winA = ${e.varName}_d > ${e.in2}_d;
${e.indent}${e.varName}_d = winA ? ${e.varName}_d : ${e.in2}_d;
${e.indent}${e.varName}_p = winA ? ${e.varName}_p : ${e.in2}_p;
${e.indent}${e.varName}_dr = winA ? ${e.varName}_dr : ${e.in2}_dr;
`});ke.register({id:"SmoothUnion",label:"Smooth Union",category:"Combiners (CSG)",description:"Merges shapes organically.",inputs:[{id:"k",label:"Smoothness",min:.01,max:2,step:.01,default:.5}],glsl:e=>`
${e.indent}float h = clamp(0.5 + 0.5 * (${e.in2}_d - ${e.varName}_d) / ${e.getParam("k")}, 0.0, 1.0);
${e.indent}${e.varName}_d = mix(${e.in2}_d, ${e.varName}_d, h) - ${e.getParam("k")} * h * (1.0 - h);
${e.indent}${e.varName}_p = mix(${e.in2}_p, ${e.varName}_p, h);
${e.indent}${e.varName}_dr = mix(${e.in2}_dr, ${e.varName}_dr, h);
`});ke.register({id:"Mix",label:"Mix (Lerp)",category:"Combiners (CSG)",description:"Linear interpolation between shapes.",inputs:[{id:"factor",label:"Factor",min:0,max:1,step:.01,default:.5}],glsl:e=>`
${e.indent}${e.varName}_d = mix(${e.varName}_d, ${e.in2}_d, ${e.getParam("factor")});
${e.indent}${e.varName}_p = mix(${e.varName}_p, ${e.in2}_p, ${e.getParam("factor")});
${e.indent}${e.varName}_dr = mix(${e.varName}_dr, ${e.in2}_dr, ${e.getParam("factor")});
`});ke.register({id:"Custom",label:"Custom (Legacy)",category:"Utils",description:"Legacy node.",inputs:[],glsl:e=>""});const Gi=(e,n)=>{const t=new Set,o=["root-end"],s=new Set;for(;o.length>0;){const h=o.pop();if(s.has(h))continue;s.add(h),h!=="root-end"&&h!=="root-start"&&t.add(h),n.filter(u=>u.target===h).forEach(u=>o.push(u.source))}const i=e.filter(h=>t.has(h.id));if(!i||i.length===0)return`
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
    `;const l=new Map;l.set("root-start","v_start");let c=0;i.forEach((h,p)=>{const m=`v_${h.id.replace(/[^a-zA-Z0-9]/g,"")}`;l.set(h.id,m);const v=n.filter(M=>M.target===h.id),y=v.find(M=>!M.targetHandle||M.targetHandle==="a"),x=v.find(M=>M.targetHandle==="b"),g=y&&l.get(y.source)||"v_start",b=x&&l.get(x.source)||"v_start";if(r+=`    // Node: ${h.type} (${h.id})
`,r+=`    vec3 ${m}_p = ${g}_p;
`,r+=`    float ${m}_d = ${g}_d;
`,r+=`    float ${m}_dr = ${g}_dr;
`,h.enabled){const M=ke.get(h.type);if(M){const j=h.condition&&h.condition.active;let C="    ";if(j){const k=Math.round(Math.max(1,h.condition.mod)),P=Math.round(h.condition.rem);r+=`    if ( (i - (i/${k})*${k}) == ${P} ) {
`,C="        "}const S=k=>h.bindings&&h.bindings[k]?`u${h.bindings[k]}`:c<cn?`uModularParams[${c++}]`:"0.0";r+=M.glsl({varName:m,in1:g,in2:b,getParam:S,indent:C}),j&&(r+=`    }
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
`},Ui=e=>{let n="d = 0.5 * log(max(r, 1.0e-5)) * r / dr_safe;";return e<.5?n=`
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
        }`},Wi={id:"coreMath",shortId:"cm",name:"Formula Math",category:"Formulas",tabConfig:{label:"Formula",componentId:"panel-formula",order:10},extraUniforms:[{name:Be.ModularParams,type:"float",arraySize:cn,default:new Float32Array(cn)}],params:{iterations:{type:"float",default:16,label:"Iterations",shortId:"it",uniform:"uIterations",min:1,max:500,step:1,group:"main"},paramA:{type:"float",default:8,label:"Param A",shortId:"pa",uniform:"uParamA",min:-10,max:10,step:.001,group:"params"},paramB:{type:"float",default:0,label:"Param B",shortId:"pb",uniform:"uParamB",min:-10,max:10,step:.001,group:"params"},paramC:{type:"float",default:0,label:"Param C",shortId:"pc",uniform:"uParamC",min:-10,max:10,step:.001,group:"params"},paramD:{type:"float",default:0,label:"Param D",shortId:"pd",uniform:"uParamD",min:-10,max:10,step:.001,group:"params"},paramE:{type:"float",default:0,label:"Param E",shortId:"pe",uniform:"uParamE",min:-10,max:10,step:.001,group:"params"},paramF:{type:"float",default:0,label:"Param F",shortId:"pf",uniform:"uParamF",min:-10,max:10,step:.001,group:"params"},vec2A:{type:"vec2",default:{x:0,y:0},label:"Vec2 A",shortId:"v2a",uniform:"uVec2A",min:-10,max:10,step:.001,group:"params"},vec2B:{type:"vec2",default:{x:0,y:0},label:"Vec2 B",shortId:"v2b",uniform:"uVec2B",min:-10,max:10,step:.001,group:"params"},vec2C:{type:"vec2",default:{x:0,y:0},label:"Vec2 C",shortId:"v2c",uniform:"uVec2C",min:-10,max:10,step:.001,group:"params"},vec3A:{type:"vec3",default:new V(0,0,0),label:"Vec3 A",shortId:"v3a",uniform:"uVec3A",min:-10,max:10,step:.001,group:"params"},vec3B:{type:"vec3",default:new V(0,0,0),label:"Vec3 B",shortId:"v3b",uniform:"uVec3B",min:-10,max:10,step:.001,group:"params"},vec3C:{type:"vec3",default:new V(0,0,0),label:"Vec3 C",shortId:"v3c",uniform:"uVec3C",min:-10,max:10,step:.001,group:"params"},vec4A:{type:"vec4",default:new Ft(0,0,0,0),label:"Vec4 A",shortId:"v4a",uniform:"uVec4A",min:-10,max:10,step:.001,group:"params"},vec4B:{type:"vec4",default:new Ft(0,0,0,0),label:"Vec4 B",shortId:"v4b",uniform:"uVec4B",min:-10,max:10,step:.001,group:"params"},vec4C:{type:"vec4",default:new Ft(0,0,0,0),label:"Vec4 C",shortId:"v4c",uniform:"uVec4C",min:-10,max:10,step:.001,group:"params"}},inject:(e,n)=>{var f;const t=n.formula,o=n.quality;t==="Modular"&&e.addDefine("PIPELINE_REV",(n.pipelineRevision||0).toString()),["JuliaMorph","MandelTerrain"].includes(t)&&e.addDefine("SKIP_PRE_BAILOUT","1");const s=Re.get(t);let i="",r="",l="";const c=(o==null?void 0:o.estimator)||0;let d=Ui(c);if(t==="Modular"){const h=Gi(n.pipeline||[],((f=n.graph)==null?void 0:f.edges)||[]);i+=h+`
`,r="formula_Modular(z, dr, trap, distOverride, c, i);",e.setDistOverride({init:"float distOverride = 1e10;",inLoopFull:"if (distOverride < 999.0) { escaped = true; break; }",inLoopGeom:"if (distOverride < 999.0) break;",postFull:"if (distOverride < 999.0) { finalD = distOverride; smoothIter = iter; }",postGeom:"if (distOverride < 999.0) finalD = distOverride;"})}else s&&(i+=s.shader.function+`
`,r=s.shader.loopBody,l=s.shader.loopInit||"",s.shader.preamble&&e.addPreamble(s.shader.preamble),s.shader.getDist&&(d=`vec2 getDist(float r, float dr, float iter, vec4 z) { ${s.shader.getDist} }`));e.addFunction(i),e.setFormula(r,l,d)}};let Vi=0;function Vt(){return`l${++Vi}`}const qi=(e,n)=>{if(!e)return`
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
    `,s=n<1.5?`
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
        ${s}
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
`},cr=e=>`
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
`,dr=`
    }

    return Lo;
}
`,Yi=e=>`
// ------------------------------------------------------------------
// PBR HELPERS (Blinn-Phong)
// ------------------------------------------------------------------
${cr(e)}
        // Blinn-Phong specular
        vec3 h = normalize(l + v);
        float NdotH = max(0.0, dot(n, h));
        float shininess = max(2.0, 2.0 / (roughness * roughness + 0.001) - 2.0);
        float spec = pow(NdotH, shininess) * (shininess + 2.0) / (8.0 * PI);
        vec3 specular = mix(vec3(1.0), albedo, metallic) * spec;

        float kD = (1.0 - metallic);
        Lo += (kD * albedo * uDiffuse / PI + specular * uSpecular) * radiance * NdotL;
${dr}
`,Xi=e=>`
// ------------------------------------------------------------------
// PBR HELPERS (Cook-Torrance GGX)
// ------------------------------------------------------------------
${cr(e)}
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
${dr}
`,ur=`
void buildTangentBasis(vec3 n, out vec3 t, out vec3 b) {
    vec3 up = abs(n.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    t = normalize(cross(n, up));
    b = cross(n, t);
}
`,Zi=`
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}
`,eo=ur+Zi,Qi=`
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
`,Ki=`
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
`,Ji=()=>`
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
`,el=(e,n,t=!0)=>`
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
        // Use camera-to-point distance for pixel footprint (not bounce travel distance).
        // Bounce rays that hit nearby geometry have small d, which would collapse the bias
        // and cause self-intersection on the next bounce. p_ray is in camera-local space,
        // so length(p_ray) gives the true camera distance for correct pixel footprint scaling.
        float cameraDist = length(p_ray);
        float distFromFractalOrigin = length(p_fractal);
        float floatLimitNEE = max(1.0e-20, distFromFractalOrigin * PRECISION_RATIO_HIGH);
        float orthoPixelFootprintNEE = (uCamType > 0.5 && uCamType < 1.5) ? pixelSizeScale : pixelSizeScale * cameraDist;
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
`;function dn(e){let n=!1;const t=e.map(o=>o.id?o:(n=!0,{...o,id:Vt()}));return n?t:e}const kt=(e,n)=>!e||!e.lights||n>=e.lights.length?{id:"",type:"Point",position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:0,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0,radius:0,range:0,intensityUnit:"raw"}:e.lights[n],tl=[{id:Vt(),type:"Point",position:{x:-2,y:1,z:2},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:1.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,radius:0,softness:0},{id:Vt(),type:"Point",position:{x:2,y:-1,z:1},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0,radius:0,softness:0},{id:Vt(),type:"Point",position:{x:0,y:-5,z:2},rotation:{x:0,y:0,z:0},color:"#0088ff",intensity:.25,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!1,castShadow:!0,radius:0,softness:0}],al={id:"lighting",shortId:"l",name:"Lighting",category:"Rendering",tabConfig:{label:"Light",componentId:"panel-light",order:30,condition:{param:"$advancedMode",bool:!0}},viewportConfig:{componentId:"overlay-lighting",renderOrder:50,type:"dom"},engineConfig:{toggleParam:"advancedLighting",mode:"compile",label:"Lighting Engine",groupFilter:"engine_settings"},extraUniforms:[{name:Be.LightCount,type:"int",default:0},{name:Be.LightType,type:"float",arraySize:Ce,default:new Float32Array(Ce).fill(0)},{name:Be.LightPos,type:"vec3",arraySize:Ce,default:new Array(Ce).fill(new V)},{name:Be.LightDir,type:"vec3",arraySize:Ce,default:new Array(Ce).fill(new V(0,-1,0))},{name:Be.LightColor,type:"vec3",arraySize:Ce,default:new Array(Ce).fill(new Ve(1,1,1))},{name:Be.LightIntensity,type:"float",arraySize:Ce,default:new Float32Array(Ce).fill(0)},{name:Be.LightShadows,type:"float",arraySize:Ce,default:new Float32Array(Ce).fill(0)},{name:Be.LightFalloff,type:"float",arraySize:Ce,default:new Float32Array(Ce).fill(0)},{name:Be.LightFalloffType,type:"float",arraySize:Ce,default:new Float32Array(Ce).fill(0)},{name:Be.LightRadius,type:"float",arraySize:Ce,default:new Float32Array(Ce).fill(0)},{name:Be.LightSoftness,type:"float",arraySize:Ce,default:new Float32Array(Ce).fill(0)}],params:{advancedLighting:{type:"boolean",default:!0,label:"Light Engine",shortId:"le",group:"main",noReset:!0,hidden:!0,onUpdate:"compile",description:"Master switch for lighting logic. Disabling provides stubs only."},ptEnabled:{type:"boolean",default:!0,label:"Path Tracing Core",shortId:"pe",group:"engine_settings",ui:"checkbox",description:"Compiles the Path Tracing module. Disable to reduce shader size.",onUpdate:"compile",noReset:!0,estCompileMs:1500},renderMode:{type:"float",default:0,label:"Active Mode",shortId:"rm",group:"engine_settings",parentId:"ptEnabled",options:[{label:"Direct (Fast)",value:0},{label:"Path Tracing (GI)",value:1}],description:"Switches between fast direct lighting and physically based Global Illumination.",onUpdate:"compile",noReset:!0},ptBounces:{type:"int",default:3,label:"Max Bounces",shortId:"pb",uniform:"uPTBounces",min:1,max:8,step:1,group:"engine_settings",parentId:"ptEnabled",ui:"numeric",description:"Recursion depth. Higher = Brighter interiors, Slower render."},ptGIStrength:{type:"float",default:1,label:"GI Strength",shortId:"pg",uniform:"uPTGIStrength",min:0,max:5,step:.01,group:"engine_settings",parentId:"ptEnabled",description:"Artistic boost for bounced light intensity."},specularModel:{type:"float",default:0,label:"Specular Model",shortId:"sm",group:"engine_settings",options:[{label:"Blinn-Phong (Fast)",value:0,estCompileMs:0},{label:"Cook-Torrance (Quality)",value:1,estCompileMs:400}],description:"BRDF model for direct lighting. Cook-Torrance is physically accurate but increases shader compile time.",onUpdate:"compile",noReset:!0},shadowsCompile:{type:"boolean",default:!0,label:"Shadow Engine",shortId:"sc",group:"engine_settings",ui:"checkbox",noReset:!0,onUpdate:"compile",description:"Compiles the shadow raymarching loop. Disable to save ~5s compile time.",estCompileMs:1500},shadowAlgorithm:{type:"float",default:0,label:"Shadow Quality",shortId:"sa",group:"engine_settings",parentId:"shadowsCompile",options:[{label:"Hard Only (Fastest)",value:2,estCompileMs:500},{label:"Lite Soft (Fast)",value:1,estCompileMs:1500},{label:"Robust Soft (Quality)",value:0,estCompileMs:3e3}],description:"Shadow algorithm. Hard = binary occlusion, Lite = fast penumbra, Robust = accurate penumbra.",onUpdate:"compile",noReset:!0},ptStochasticShadows:{type:"boolean",default:!0,label:"Area Lights",shortId:"ps",group:"engine_settings",parentId:"shadowsCompile",ui:"checkbox",onUpdate:"compile",noReset:!0,estCompileMs:800,description:"Compiles stochastic area light shadow code. Creates realistic penumbras via accumulation."},ptNEEAllLights:{type:"boolean",default:!1,label:"Sample All Lights",shortId:"pal",group:"engine_settings",parentId:"ptEnabled",ui:"checkbox",onUpdate:"compile",noReset:!0,description:"Evaluates every active light per bounce instead of one random light. Reduces shadow noise at the cost of N× more shadow rays."},ptEnvNEE:{type:"boolean",default:!1,label:"Environment NEE",shortId:"pen",group:"engine_settings",parentId:"ptEnabled",ui:"checkbox",onUpdate:"compile",noReset:!0,description:"Directly samples the environment as a light source each bounce. Large noise reduction for sky-lit scenes at the cost of one extra trace per bounce."},ptMaxLuminance:{type:"float",default:10,label:"Firefly Clamp",shortId:"pfl",uniform:"uPTMaxLuminance",min:.5,max:200,step:.5,scale:"log",group:"engine_settings",parentId:"ptEnabled",description:"Clamps per-sample luminance to suppress bright firefly spikes. Lower = cleaner but slightly biased. Raise to effectively disable."},shadows:{type:"boolean",default:!0,label:"Enable",shortId:"sh",group:"main",uniform:"uShadows",ui:"checkbox",condition:{param:"shadowsCompile",bool:!0}},areaLights:{type:"boolean",default:!1,label:"Area Lights",shortId:"al",uniform:"uAreaLights",group:"shadows",hidden:!0,condition:{param:"ptStochasticShadows",bool:!0},description:"Stochastic area light shadows. Disable for sharp analytical shadows."},shadowIntensity:{type:"float",default:1,label:"Opacity",shortId:"si",uniform:"uShadowIntensity",min:0,max:1,step:.01,group:"shadows",condition:{bool:!0}},shadowSoftness:{type:"float",default:16,label:"Softness",shortId:"ss",uniform:"uShadowSoftness",min:2,max:2e3,step:1,group:"shadows",scale:"log",condition:{bool:!0}},shadowSteps:{type:"int",default:128,label:"Steps",shortId:"st",min:16,max:512,step:16,group:"shadows",condition:{bool:!0},uniform:"uShadowSteps",ui:"numeric",description:"Quality vs Performance."},shadowBias:{type:"float",default:.002,label:"Bias",shortId:"sb",uniform:"uShadowBias",min:0,max:1,step:1e-6,group:"shadows",scale:"log",condition:{bool:!0},description:"Prevents surface acne."},lights:{type:"complex",default:tl,label:"Light List",shortId:"ll",group:"data",hidden:!0,noReset:!0}},inject:(e,n,t)=>{if(t!=="Main"){e.addPostDEFunction(`
             float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) { return 1.0; }
             float GetHardShadow(vec3 ro, vec3 rd, float lightDist) { return 1.0; }
             vec3 calculateShading(vec3 ro, vec3 rd, float d, vec4 result, float stochasticSeed) { return vec3(0.0); }
             vec3 calculatePathTracedColor(vec3 ro, vec3 rd, float d_init, vec4 result_init, float seed) { return vec3(0.0); }
             `);return}e.addDefine("MAX_LIGHTS",Ce.toString());const o=n.lighting;if(o&&!o.advancedLighting){e.addDefine("MAX_LIGHTS","0"),e.addPostDEFunction(`
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
             `);return}const s=(o==null?void 0:o.shadowsCompile)!==!1,i=(o==null?void 0:o.shadowAlgorithm)??0,r=i===2?3:i===1?1:2;e.addPostDEFunction(qi(s,r)),!s&&!(o!=null&&o.shadows)?e.addDefine("DISABLE_SHADOWS","1"):e.addDefine("SHADOW_QUALITY","2"),(o==null?void 0:o.ptEnabled)!==!1&&(e.addDefine("PT_ENABLED","1"),o!=null&&o.ptNEEAllLights&&e.addDefine("PT_NEE_ALL_LIGHTS","1"),o!=null&&o.ptEnvNEE&&e.addDefine("PT_ENV_NEE","1"));const l=(o==null?void 0:o.ptStochasticShadows)===!0&&s,c=n.renderMode==="PathTracing"||(o==null?void 0:o.renderMode)===1,d=n.quality,f=(d==null?void 0:d.precisionMode)===1;if(c)e.addIntegrator(eo),e.setRenderMode("PathTracing"),e.addDefine("RENDER_MODE_PATHTRACING","1"),e.addIntegrator(el(f,Ce,l));else{const h=(o==null?void 0:o.specularModel)===1;e.addIntegrator(h?eo:ur),e.setRenderMode("Direct"),e.addIntegrator(h?Xi(l):Yi(l)),e.requestShading()}},actions:{updateLight:(e,n)=>{const{index:t,params:o}=n;if(!e.lights||t>=e.lights.length)return{};const s=[...e.lights];return s[t]={...s[t],...o},{lights:s}},addLight:e=>{if(e.lights.length>=Ce)return{};const n={id:Vt(),type:"Point",position:{x:0,y:0,z:2},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:1,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,radius:0,range:0,intensityUnit:"raw"};return{lights:[...e.lights,n]}},removeLight:(e,n)=>{if(n<0||n>=e.lights.length)return{};const t=[...e.lights];return t.splice(n,1),{lights:t}},duplicateLight:(e,n)=>{if(n<0||n>=e.lights.length||e.lights.length>=Ce)return{};const t={...e.lights[n],id:Vt()},o=[...e.lights];return o.splice(n+1,0,t),{lights:o}}}},nl={id:"lightSpheres",shortId:"ls",name:"Light Spheres",category:"Rendering",dependsOn:["lighting"],engineConfig:{toggleParam:"lightSpheres",mode:"compile",label:"Light Spheres",groupFilter:"engine_settings"},params:{lightSpheres:{type:"boolean",default:!0,label:"Light Spheres",shortId:"lsp",group:"engine_settings",ui:"checkbox",onUpdate:"compile",noReset:!0,description:"Compiles visible emitter sphere rendering for point lights with radius > 0.",estCompileMs:150}},inject:(e,n,t)=>{if(t!=="Main")return;const o=n.lightSpheres;!o||o.lightSpheres===!1||(e.addDefine("LIGHT_SPHERES","1"),e.addPostDEFunction(Qi),e.addIntegrator(Ji()),e.addMissLogic(Ki),e.addCompositeLogic("compositeLightSpheres(ro, rd, col, d, hit, stochasticSeed);"))}},ol={id:"optics",shortId:"o",name:"Camera Optics",category:"Scene",tabConfig:{label:"Scene",componentId:"panel-scene",order:20},customUI:[{componentId:"optics-controls",group:"projection",parentId:"camType",condition:{eq:0}},{componentId:"optics-dof-controls",group:"dof",parentId:"dofStrength",condition:{gt:0}}],params:{camType:{type:"float",default:0,label:"Projection",shortId:"ct",uniform:"uCamType",group:"projection",options:[{label:"Perspective",value:0},{label:"Orthographic",value:1},{label:"360° Skybox",value:2}]},camFov:{type:"float",default:60,label:"Field of View",shortId:"fv",min:10,max:150,step:1,group:"projection",hidden:!0,condition:{param:"camType",eq:0}},orthoScale:{type:"float",default:2,label:"Ortho Scale",shortId:"os",min:.1,max:10,step:.1,scale:"log",group:"projection",parentId:"camType",condition:{param:"camType",eq:1}},dofStrength:{type:"float",default:0,label:"Camera Blur",shortId:"ds",uniform:"uDOFStrength",min:0,max:1,step:1e-4,scale:"log",group:"dof",format:e=>e===0?"0.0 (off)":Math.abs(e)<.001?e.toFixed(5):Math.abs(e)<10?e.toFixed(4):e.toFixed(2)},dofFocus:{type:"float",default:10,label:"Focus Distance",shortId:"df",uniform:"uDOFFocus",min:1e-6,max:1e4,step:1e-6,scale:"log",group:"dof",parentId:"dofStrength",condition:{gt:0}}}},rl={id:"navigation",shortId:"n",name:"Navigation",category:"Scene",customUI:[{componentId:"navigation-controls",group:"controls"}],params:{flySpeed:{type:"float",default:.5,label:"Fly Speed %",shortId:"fs",min:.001,max:1,step:.001,group:"movement",format:e=>`${(e*100).toFixed(1)}%`},autoSlow:{type:"boolean",default:!0,label:"Auto-slow on collision",shortId:"as",group:"movement"}}},sl={id:"audio",shortId:"au",name:"Audio",category:"Audio",tabConfig:{label:"Audio",componentId:"panel-audio",order:70,condition:{param:"isEnabled",bool:!0}},menuConfig:{label:"Audio Modulation",toggleParam:"isEnabled"},params:{isEnabled:{type:"boolean",default:!1,label:"Enable Audio Engine",shortId:"en",group:"system",noReset:!0},smoothing:{type:"float",default:.8,label:"FFT Smoothing",shortId:"sm",group:"system",noReset:!0,min:0,max:.99,step:.01},threshold:{type:"float",default:.1,label:"Gate Threshold",shortId:"gt",group:"hidden",hidden:!0,noReset:!0},agcEnabled:{type:"boolean",default:!1,label:"AGC",shortId:"ag",group:"hidden",hidden:!0,noReset:!0},attack:{type:"float",default:.1,label:"Global Attack",shortId:"ga",group:"hidden",hidden:!0,noReset:!0},decay:{type:"float",default:.3,label:"Global Decay",shortId:"gd",group:"hidden",hidden:!0,noReset:!0},highPass:{type:"float",default:20,label:"High Pass",shortId:"hp",group:"hidden",hidden:!0,noReset:!0},lowPass:{type:"float",default:2e4,label:"Low Pass",shortId:"lp",group:"hidden",hidden:!0,noReset:!0},gain:{type:"float",default:.8,label:"Volume",shortId:"vl",group:"system",noReset:!0,min:0,max:2,step:.01}}},il={id:"drawing",shortId:"dr",name:"Drawing Tools",category:"Tools",tabConfig:{label:"Drawing",componentId:"panel-drawing",order:80,condition:{param:"enabled",bool:!0}},viewportConfig:{componentId:"overlay-drawing",type:"dom"},menuConfig:{label:"Drawing Tools",toggleParam:"enabled"},interactionConfig:{blockCamera:!0,activeParam:"active"},params:{enabled:{type:"boolean",default:!1,label:"Show Tab",shortId:"en",group:"system",hidden:!0,noReset:!0},active:{type:"boolean",default:!1,label:"Enable Tool",shortId:"ac",group:"main",noReset:!0,hidden:!0},activeTool:{type:"float",default:0,label:"Tool Type",shortId:"tt",group:"main",noReset:!0,hidden:!0},originMode:{type:"float",default:1,label:"Origin Plane",shortId:"om",group:"settings",noReset:!0,options:[{label:"Global Zero",value:0},{label:"Surface (Probe)",value:1}],description:"Where the drawing plane starts."},color:{type:"color",default:new Ve("#00ffff"),label:"Line Color",shortId:"cl",group:"settings",noReset:!0},lineWidth:{type:"float",default:1,label:"Line Width",shortId:"lw",min:1,max:10,step:1,group:"settings",noReset:!0,hidden:!0},showLabels:{type:"boolean",default:!0,label:"Show Measurements",shortId:"sl",group:"settings",noReset:!0},showAxes:{type:"boolean",default:!1,label:"Show Axis Ruler",shortId:"ax",group:"settings",noReset:!0,description:"Displays a reference grid at the drawing origin."},shapes:{type:"complex",default:[],label:"Shapes",shortId:"sh",group:"data",hidden:!0,noReset:!0},refreshTrigger:{type:"float",default:0,label:"Refresh Trigger",group:"system",hidden:!0,noReset:!0}},state:{activeTool:"rect"},actions:{addDrawnShape:(e,n)=>({shapes:[...e.shapes||[],n]}),removeDrawnShape:(e,n)=>({shapes:(e.shapes||[]).filter(t=>t.id!==n)}),updateDrawnShape:(e,n)=>({shapes:(e.shapes||[]).map(t=>t.id===n.id?{...t,...n.updates}:t)}),clearDrawnShapes:e=>({shapes:[]})}},to=["#ef4444","#f97316","#f59e0b","#84cc16","#22c55e","#06b6d4","#3b82f6","#8b5cf6","#d946ef","#f43f5e"],ll={id:"modulation",shortId:"mod",name:"Modulation",category:"System",state:{rules:[],selectedRuleId:null},actions:{addModulation:(e,n)=>{const t=to[e.rules.length%to.length],o={id:ot(),target:n.target,source:n.source||"audio",enabled:!0,color:t,freqStart:0,freqEnd:.2,thresholdMin:.1,thresholdMax:1,attack:.1,decay:.3,smoothing:0,gain:1,offset:0};return{rules:[...e.rules,o],selectedRuleId:o.id}},removeModulation:(e,n)=>({rules:e.rules.filter(t=>t.id!==n),selectedRuleId:e.selectedRuleId===n?null:e.selectedRuleId}),updateModulation:(e,n)=>({rules:e.rules.map(t=>t.id===n.id?{...t,...n.update}:t)}),selectModulation:(e,n)=>({selectedRuleId:n})},params:{rules:{type:"complex",default:[],label:"Rules",shortId:"rl",group:"data",hidden:!0,noReset:!0},selectedRuleId:{type:"complex",default:null,label:"Selection",shortId:"sr",group:"data",hidden:!0,noReset:!0}}},cl={id:"webcam",shortId:"wc",name:"Webcam Overlay",category:"Tools",viewportConfig:{componentId:"overlay-webcam",type:"dom"},menuConfig:{label:"Webcam Overlay",toggleParam:"isEnabled",advancedOnly:!0},params:{isEnabled:{type:"boolean",default:!1,label:"Enabled",shortId:"en",group:"system",noReset:!0},opacity:{type:"float",default:1,label:"Opacity",shortId:"op",min:0,max:3,step:.05,group:"visual",noReset:!0},posX:{type:"float",default:20,label:"Position X",shortId:"px",min:0,max:2e3,step:1,group:"transform",noReset:!0,hidden:!0},posY:{type:"float",default:80,label:"Position Y",shortId:"py",min:0,max:2e3,step:1,group:"transform",noReset:!0,hidden:!0},width:{type:"float",default:320,label:"Width",shortId:"w",min:50,max:1200,step:1,group:"transform",noReset:!0,hidden:!0},height:{type:"float",default:240,label:"Height",shortId:"h",min:50,max:1200,step:1,group:"transform",noReset:!0,hidden:!0},cropL:{type:"float",default:0,label:"Crop Left",shortId:"cl",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},cropR:{type:"float",default:0,label:"Crop Right",shortId:"cr",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},cropT:{type:"float",default:0,label:"Crop Top",shortId:"ct",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},cropB:{type:"float",default:0,label:"Crop Bottom",shortId:"cb",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},blendMode:{type:"float",default:0,label:"Blend Mode",shortId:"bm",group:"visual",noReset:!0,options:[{label:"Normal",value:0},{label:"Screen",value:1},{label:"Overlay",value:2},{label:"Lighten",value:3},{label:"Difference",value:4}]},crtMode:{type:"boolean",default:!1,label:"CRT Scanlines",shortId:"sc",group:"visual",noReset:!0},tilt:{type:"float",default:0,label:"3D Tilt",shortId:"tl",min:-45,max:45,step:1,group:"transform",noReset:!0},fontSize:{type:"float",default:12,label:"Overlay Font Size",shortId:"fs",min:8,max:32,step:1,group:"visual",noReset:!0}}},dl={id:"debugTools",shortId:"dt",name:"Debug Tools",category:"System",viewportConfig:{componentId:"overlay-debug-tools",type:"dom",renderOrder:100},menuItems:[{label:"GLSL Debugger",toggleParam:"shaderDebuggerOpen",icon:"Code",advancedOnly:!0},{label:"State Debugger",toggleParam:"stateDebuggerOpen",icon:"Info",advancedOnly:!0}],params:{shaderDebuggerOpen:{type:"boolean",default:!1,label:"GLSL Debugger",shortId:"sd",group:"tools",noReset:!0},stateDebuggerOpen:{type:"boolean",default:!1,label:"State Debugger",shortId:"st",group:"tools",noReset:!0}}},ul={fastest:{lighting:{shadows:!1,shadowsCompile:!1,ptEnabled:!1,specularModel:0},ao:{aoEnabled:!1,aoStochasticCp:!1},geometry:{hybridComplex:!1,preRotMaster:!1,preRotEnabled:!1},reflections:{enabled:!0,reflectionMode:0,bounceShadows:!1},quality:{precisionMode:1,bufferPrecision:1,compilerHardCap:128},atmosphere:{glowEnabled:!1}},lite:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:2,shadowSteps:32,ptStochasticShadows:!1,areaLights:!0,shadowSoftness:16,ptEnabled:!1,specularModel:0},ao:{aoEnabled:!0,aoSamples:2,aoStochasticCp:!1,aoMode:!1,aoMaxSamples:16},geometry:{hybridComplex:!1,preRotMaster:!1,preRotEnabled:!1},reflections:{enabled:!0,reflectionMode:1,bounceShadows:!1},quality:{precisionMode:1,bufferPrecision:1},atmosphere:{glowQuality:1}},balanced:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:0,shadowSoftness:16,ptStochasticShadows:!0,areaLights:!0,shadowSteps:64,ptEnabled:!1,specularModel:0},ao:{aoEnabled:!0,aoSamples:5,aoStochasticCp:!0,aoMode:!0,aoMaxSamples:32},geometry:{hybridComplex:!1,preRotMaster:!0,preRotEnabled:!0},reflections:{enabled:!0,reflectionMode:1,bounceShadows:!1},quality:{precisionMode:0,bufferPrecision:0},atmosphere:{glowQuality:0}},ultra:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:0,shadowSoftness:64,ptStochasticShadows:!0,areaLights:!0,shadowSteps:256,ptEnabled:!0,specularModel:1},ao:{aoEnabled:!0,aoSamples:8,aoStochasticCp:!0,aoMode:!0,aoMaxSamples:64},reflections:{enabled:!0,reflectionMode:3,bounceShadows:!0,steps:64,bounces:2},geometry:{hybridComplex:!0,preRotMaster:!0,preRotEnabled:!0},quality:{precisionMode:0,bufferPrecision:0},atmosphere:{glowQuality:0}}},hl={id:"engineSettings",shortId:"eng",name:"Engine Config",category:"System",tabConfig:{label:"Engine",componentId:"panel-engine",order:5,condition:{param:"showEngineTab",bool:!0}},params:{showEngineTab:{type:"boolean",default:!1,label:"Show Engine Tab",shortId:"se",group:"system",noReset:!0,hidden:!0}},actions:{applyPreset:(e,n)=>{const{mode:t,actions:o}=n,s=ul[t];return s?(Object.entries(s).forEach(([i,r])=>{const l=`set${i.charAt(0).toUpperCase()+i.slice(1)}`,c=o[l];typeof c=="function"&&c(r)}),{}):{}}}},fl=(e,n,t=32)=>{if(!e)return`
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
`},pl={id:"ao",shortId:"ao",name:"Ambient Occlusion",category:"Lighting",engineConfig:{toggleParam:"aoEnabled",mode:"compile",label:"Ambient Occlusion",groupFilter:"engine_settings"},params:{aoIntensity:{type:"float",default:.2,label:"Ambient Occlusion",shortId:"ai",uniform:"uAOIntensity",min:0,max:1.5,step:.001,group:"shading",condition:{param:"aoEnabled",bool:!0}},aoSpread:{type:"float",default:.5,label:"Spread",shortId:"as",uniform:"uAOSpread",min:3e-4,max:1.5,step:.01,group:"shading",scale:"log",parentId:"aoIntensity",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0}]},aoSamples:{type:"int",default:5,label:"Samples",shortId:"ap",min:2,max:32,step:1,group:"shading",uniform:"uAOSamples",ui:"numeric",parentId:"aoIntensity",description:"Iterations per pixel. Runtime controlled.",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0}]},aoMode:{type:"boolean",default:!0,label:"Stochastic Mode",shortId:"am",uniform:"uAOMode",group:"shading",parentId:"aoIntensity",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0},{param:"aoStochasticCp",bool:!0}],description:"Switches between Fixed and Stochastic sampling at runtime."},aoColor:{type:"color",default:new Ve(0,0,0),label:"AO Tint",shortId:"ac",uniform:"uAOColor",group:"shading",parentId:"aoIntensity",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0}],description:"Black = classic darkening. Custom color = tinted occlusion in shadowed areas."},aoMaxSamples:{type:"int",default:32,label:"Max Samples (Hard Cap)",shortId:"amx",min:16,max:256,step:16,group:"engine_settings",ui:"numeric",description:"Compile-time limit. Increasing this allows higher runtime samples but compiles slower.",onUpdate:"compile",noReset:!0,condition:[{param:"aoEnabled",bool:!0}]},aoStochasticCp:{type:"boolean",default:!0,label:"Load Stochastic Sampling",shortId:"sc",group:"engine_settings",ui:"checkbox",description:"Compiles High-Quality noise logic into the shader.",onUpdate:"compile",noReset:!0},aoEnabled:{type:"boolean",default:!0,label:"Enable AO",shortId:"ae",group:"main",hidden:!0,noReset:!0,onUpdate:"compile",estCompileMs:200}},inject:(e,n,t)=>{if(t!=="Main"){e.addPostDEFunction("float GetAO(vec3 p, vec3 n, float seed) { return 1.0; }");return}const o=n.ao,s=(o==null?void 0:o.aoEnabled)!==!1,i=(o==null?void 0:o.aoStochasticCp)!==!1,r=(o==null?void 0:o.aoMaxSamples)||32;e.addPostDEFunction(fl(s,i,r))}},ml=()=>`
// ------------------------------------------------------------------
// REFLECTIONS (Forge Kernel)
// ------------------------------------------------------------------

#define REFL_HIT_THRESHOLD 0.002

// Lightweight Raymarcher for Reflection Bounce
vec4 traceReflectionRay(vec3 ro, vec3 rd) {
    float t = 0.0; // Caller biases ro along normal — no skip needed here

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
    `,ao=0,Wa=1,wt=3,gl=`
    // --- REFLECTIONS: ENVIRONMENT MAP ---
    vec3 envColor = applyEnvFog(GetEnvMap(reflDir, roughness) * uEnvStrength);
    reflectionLighting = envColor * F * uSpecular;
`,xl=`
    // --- REFLECTIONS: RAYMARCHED ---
    {
        // Adaptive bias: scales with pixel size at camera distance to avoid self-intersection.
        // Use camera distance (length(p_ray)) not ray travel distance (d) — for reflected
        // hits near the surface, d can be tiny, collapsing the bias and causing self-intersection.
        float pixelSizeScale = uPixelSizeBase / uInternalScale;
        float cameraDist_refl = length(p_ray);
        float reflPixelFootprint = (uCamType > 0.5 && uCamType < 1.5) ? pixelSizeScale : pixelSizeScale * cameraDist_refl;
        float reflBias = max(reflPixelFootprint * 2.0, length(p_fractal) * PRECISION_RATIO_HIGH * 2.0);
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

                // Use camera-to-reflected-point distance for normal epsilon, not reflection ray travel distance.
                // p_next is in camera-local space, so length(p_next) = camera distance.
                float reflCameraDist = length(p_next);
                getSurfaceMaterial(p_next, p_next_fractal, vec4(0.0, refHit.yzw), reflCameraDist, r_albedo, r_n, r_emission, r_rough, false);

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
`,bl={id:"reflections",shortId:"rf",name:"Reflections",category:"Rendering",engineConfig:{toggleParam:"enabled",mode:"compile",label:"Reflection Tracing",groupFilter:"engine_settings"},params:{reflectionMode:{type:"float",default:Wa,label:"Reflection Method",shortId:"rm",group:"engine_settings",options:[{label:"Off",value:ao,estCompileMs:0},{label:"Environment Map",value:Wa,estCompileMs:0},{label:"Raymarched (Quality)",value:wt,estCompileMs:7500}],description:"Reflection technique. Higher quality = longer compile time. Raymarched adds ~9s.",onUpdate:"compile",noReset:!0},bounceShadows:{type:"boolean",default:!1,label:"Bounce Shadows",shortId:"bs",group:"engine_settings",ui:"checkbox",condition:{param:"reflectionMode",eq:wt},description:"Compute shadows on reflected surfaces. Adds ~3-4s compile time.",onUpdate:"compile",noReset:!0,estCompileMs:4500},mixStrength:{type:"float",default:1,label:"Raymarch Mix",shortId:"mx",uniform:"uReflStrength",min:0,max:1,step:.01,group:"engine_settings",condition:{param:"reflectionMode",eq:wt},description:"Blends between Raymarched Reflections (1.0) and Environment Map (0.0)."},roughnessThreshold:{type:"float",default:.62,label:"Roughness Cutoff",shortId:"rc",uniform:"uReflRoughnessCutoff",min:0,max:1,step:.01,group:"engine_settings",condition:{param:"reflectionMode",eq:wt},description:"Surfaces rougher than this will skip raymarching to save performance."},bounces:{type:"int",default:1,label:"Max Bounces",shortId:"rb",min:1,max:3,step:1,group:"engine_settings",uniform:"uReflBounces",ui:"numeric",description:"Maximum recursion depth. Clamped to 3. Default 1 for performance.",noReset:!0,onUpdate:"compile",condition:{param:"reflectionMode",eq:wt}},steps:{type:"int",default:64,label:"Trace Steps",shortId:"rs",min:16,max:128,step:8,group:"engine_settings",uniform:"uReflSteps",ui:"numeric",description:"Precision of the reflection ray.",noReset:!0,condition:{param:"reflectionMode",eq:wt}},enabled:{type:"boolean",default:!0,label:"Enable Reflections",shortId:"re",group:"main",hidden:!0,noReset:!0,onUpdate:"compile"}},inject:(e,n,t)=>{if(t!=="Main")return;const o=n.reflections;if(!o||o.enabled===!1)return;const s=o.reflectionMode??Wa;if(s!==ao){if(s!==wt){e.addShadingLogic(gl);return}if(s===wt){e.addPostDEFunction(ml());const i=Math.max(1,Math.min(3,o.bounces??1));e.addDefine("MAX_REFL_BOUNCES",i.toString()),o.bounceShadows&&e.addDefine("REFL_BOUNCE_SHADOWS","1"),e.addShadingLogic(xl)}}}},yl=`
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
`,vl=`
    // --- Water Plane (feature-injected) ---
    float dWater = mapWater(p_fractal);
    if (dWater < finalD) {
        finalD = dWater;
        decomp = MATERIAL_WATER;
        smoothIter = 0.0;
        outTrap = 0.0;
    }
`,wl=`
    // --- Water Plane (feature-injected) ---
    float dWater = mapWater(p_fractal);
    if (dWater < finalD) {
        finalD = dWater;
    }
`,Sl=`
    // --- Water Plane Material (feature-injected) ---
    if (result.w >= 5.0) {
        applyWaterMaterial(albedo, roughness, n, p_fractal);
        emission = vec3(0.0);
    }
`,Ml={id:"waterPlane",shortId:"wp",name:"Water Plane",category:"Scene",engineConfig:{toggleParam:"waterEnabled",mode:"compile",label:"Water Plane",groupFilter:"engine_settings"},params:{waterEnabled:{type:"boolean",default:!1,label:"Enable Water",shortId:"we",group:"engine_settings",onUpdate:"compile",noReset:!0,hidden:!0},active:{type:"boolean",default:!0,label:"Visible",shortId:"on",uniform:"uWaterActive",group:"main",condition:{param:"waterEnabled",bool:!0},noReset:!0},height:{type:"float",default:-2,label:"Height (Y)",shortId:"ht",uniform:"uWaterHeight",min:-10,max:10,step:.01,group:"geometry",condition:{param:"active",bool:!0}},color:{type:"color",default:new Ve("#001133"),label:"Water Color",shortId:"cl",uniform:"uWaterColor",group:"material",condition:{param:"active",bool:!0}},roughness:{type:"float",default:.02,label:"Roughness",shortId:"ro",uniform:"uWaterRoughness",min:0,max:1,step:.01,group:"material",condition:{param:"active",bool:!0}},waveStrength:{type:"float",default:.1,label:"Wave Height",shortId:"ws",uniform:"uWaterWaveStrength",min:0,max:1.5,step:.001,group:"waves",condition:{param:"active",bool:!0}},waveSpeed:{type:"float",default:1,label:"Wave Speed",shortId:"wv",uniform:"uWaterWaveSpeed",min:0,max:5,step:.1,group:"waves",condition:[{param:"active",bool:!0},{param:"waveStrength",gt:0}]},waveFrequency:{type:"float",default:1.5,label:"Wave Freq",shortId:"wf",uniform:"uWaterWaveFreq",min:.1,max:10,step:.1,group:"waves",condition:[{param:"active",bool:!0},{param:"waveStrength",gt:0}]}},inject:(e,n,t)=>{const o=n.waterPlane;o&&o.waterEnabled&&t==="Main"&&(e.addDefine("MATERIAL_WATER","10.0"),e.addFunction(yl),e.addPostMapCode(vl),e.addPostDistCode(wl),e.addMaterialLogic(Sl))}},Cl={id:"cameraManager",name:"Camera Manager",category:"Scene",tabConfig:{label:"Camera Manager",componentId:"panel-cameramanager",order:999,condition:{bool:!0}},params:{}},kl=`
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
`,jl=`
    // --- VOLUMETRIC SCATTER (God Rays) ---
    col += fogScatter;
`,Rl={id:"volumetric",shortId:"vol",name:"Volumetric Scatter",category:"Rendering",engineConfig:{toggleParam:"ptVolumetric",mode:"compile",label:"Volumetric Scattering",description:"Henyey-Greenstein single scatter. Enables god rays, colored haze, and directional fog.",groupFilter:"engine_settings"},panelConfig:{compileParam:"ptVolumetric",runtimeToggleParam:"volEnabled",label:"Volumetric Scatter",compileMessage:"Compiling Volumetric Shader...",helpId:"render.volumetric"},groups:{density:{label:"Density & Shadow Rays",collapsible:!0},emissive:{label:"Color Scatter",collapsible:!0},height:{label:"Height Fog",collapsible:!0}},params:{ptVolumetric:{type:"boolean",default:!1,label:"Volume Scatter",shortId:"pvs",group:"engine_settings",noReset:!0,onUpdate:"compile",estCompileMs:5500},volEnabled:{type:"boolean",default:!1,label:"Enabled",shortId:"ven",uniform:"uVolEnabled",hidden:!0},volDensity:{type:"float",default:.01,label:"Density",shortId:"vd",uniform:"uVolDensity",min:.001,max:5,step:.01,scale:"log",group:"density",condition:{param:"ptVolumetric",bool:!0}},volAnisotropy:{type:"float",default:.3,label:"Anisotropy (g)",shortId:"va",uniform:"uVolAnisotropy",min:-.99,max:.99,step:.01,group:"density",parentId:"volDensity",condition:{gt:0},description:"0=isotropic, +0.9=forward (god rays), -0.9=back scatter."},volMaxLights:{type:"float",default:1,label:"Light Sources",shortId:"vml",uniform:"uVolMaxLights",min:1,max:3,step:1,group:"density",parentId:"volDensity",condition:{gt:0},isAdvanced:!0,description:"Max lights for shadow rays. More = more expensive."},volScatterTint:{type:"color",default:new Ve(1,1,1),label:"Scatter Tint",shortId:"vst",uniform:"uVolScatterTint",group:"density",parentId:"volDensity",condition:{gt:0}},volEmissive:{type:"float",default:0,label:"Color Scatter",shortId:"ves",uniform:"uVolEmissive",min:0,max:100,step:.1,scale:"log",group:"emissive",condition:{param:"ptVolumetric",bool:!0},description:"Orbit trap color field scattered through the volume. No shadow rays needed."},volStepJitter:{type:"float",default:1,label:"Step Jitter",shortId:"vsj",uniform:"uVolStepJitter",min:0,max:1,step:.01,group:"density",parentId:"volDensity",condition:{gt:0},description:"1 = smooth (temporal accumulation removes noise). 0 = fixed slicing pattern (artistic, broken fog look)."},volEmissiveFalloff:{type:"float",default:0,label:"Surface Falloff",shortId:"vef",uniform:"uVolEmissiveFalloff",min:0,max:5,step:.01,scale:"log",group:"emissive",parentId:"volEmissive",condition:{gt:0},description:"Concentrate color near fractal surface."},volHeightFalloff:{type:"float",default:0,label:"Height Falloff",shortId:"vhf",uniform:"uVolHeightFalloff",min:0,max:5,step:.01,scale:"log",group:"height",condition:{param:"ptVolumetric",bool:!0},description:"Density varies with Y. Creates ground fog, rising mist."},volHeightOrigin:{type:"float",default:0,label:"Height Origin",shortId:"vho",uniform:"uVolHeightOrigin",min:-5,max:5,step:.01,group:"height",parentId:"volHeightFalloff",condition:{gt:0}}},inject:(e,n,t)=>{if(t!=="Main")return;const o=n.volumetric;o!=null&&o.ptVolumetric&&(e.addDefine("PT_VOLUMETRIC","1"),e.addVolumeTracing(kl,""),e.addPostProcessLogic(jl))}},Il=()=>{oe.register(Wi),oe.register($i),oe.register(al),oe.register(nl),oe.register(pl),oe.register(bl),oe.register(fi),oe.register(Rl),oe.register(vi),oe.register(Ml),oe.register(Ci),oe.register(Si),oe.register(Hi),oe.register(mi),oe.register(gi),oe.register(wi),oe.register(ol),oe.register(rl),oe.register(Cl),oe.register(sl),oe.register(il),oe.register(ll),oe.register(cl),oe.register(dl),oe.register(hl)},yt=e=>{const n=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);return n?{r:parseInt(n[1],16),g:parseInt(n[2],16),b:parseInt(n[3],16)}:null},aa=(e,n,t)=>(typeof e=="object"&&(n=e.g,t=e.b,e=e.r),"#"+((1<<24)+(Math.round(e)<<16)+(Math.round(n)<<8)+Math.round(t)).toString(16).slice(1).toUpperCase()),da=({r:e,g:n,b:t})=>{e/=255,n/=255,t/=255;const o=Math.max(e,n,t),s=Math.min(e,n,t);let i=0,r=0,l=o;const c=o-s;if(r=o===0?0:c/o,o!==s){switch(o){case e:i=(n-t)/c+(n<t?6:0);break;case n:i=(t-e)/c+2;break;case t:i=(e-n)/c+4;break}i/=6}return{h:i*360,s:r*100,v:l*100}},ua=(e,n,t)=>{e/=360,n/=100,t/=100;let o=0,s=0,i=0;const r=Math.floor(e*6),l=e*6-r,c=t*(1-n),d=t*(1-l*n),f=t*(1-(1-l)*n);switch(r%6){case 0:o=t,s=f,i=c;break;case 1:o=d,s=t,i=c;break;case 2:o=c,s=t,i=f;break;case 3:o=c,s=d,i=t;break;case 4:o=f,s=c,i=t;break;case 5:o=t,s=c,i=d;break}return{r:o*255,g:s*255,b:i*255}},Pl=(e,n,t)=>({r:e.r+(n.r-e.r)*t,g:e.g+(n.g-e.g)*t,b:e.b+(n.b-e.b)*t}),Tl=(e,n)=>{if(Math.abs(n-.5)<.001)return e;const t=Math.max(.001,Math.min(.999,n)),o=Math.log(.5)/Math.log(t);return Math.pow(e,o)},un=(e,n=1)=>{let t;if(!e)return"linear-gradient(90deg, #000 0%, #fff 100%)";if(Array.isArray(e))t=e;else if(e&&Array.isArray(e.stops))t=e.stops;else return"linear-gradient(90deg, #000 0%, #fff 100%)";if(!t||t.length===0)return"linear-gradient(90deg, #000 0%, #fff 100%)";const o=[...t].sort((i,r)=>i.position-r.position),s=[];for(let i=0;i<o.length;i++){const r=o[i];let l=Math.pow(r.position,1/n);if(l=Math.max(0,Math.min(1,l))*100,s.push(`${r.color} ${l.toFixed(2)}%`),i<o.length-1){const c=o[i+1],d=r.bias??.5;if((r.interpolation||"linear")==="step"){let h=Math.pow(c.position,1/n);h=Math.max(0,Math.min(1,h))*100,s.push(`${r.color} ${h.toFixed(2)}%`),s.push(`${c.color} ${h.toFixed(2)}%`)}else if(Math.abs(d-.5)>.001){const h=r.position+(c.position-r.position)*d;let p=Math.pow(h,1/n)*100;p=Math.max(0,Math.min(100,p)),s.push(`${p.toFixed(2)}%`)}}}return`linear-gradient(90deg, ${s.join(", ")})`},Va=e=>Math.pow(e/255,2.2)*255,qa=e=>{const n=e/255;if(n>=.99)return 255;const t=(Math.sqrt(-10127*n*n+13702*n+9)+59*n-3)/(502-486*n);return Math.max(0,t)*255},no=e=>{const t=new Uint8Array(1024);let o,s="srgb";if(Array.isArray(e))o=e;else if(e&&Array.isArray(e.stops))o=e.stops,s=e.colorSpace||"srgb";else return t;if(o.length===0){for(let l=0;l<256;l++){const c=Math.floor(l/255*255);t[l*4]=c,t[l*4+1]=c,t[l*4+2]=c,t[l*4+3]=255}return t}const i=[...o].sort((l,c)=>l.position-c.position),r=l=>{let c={r:0,g:0,b:0};if(l<=i[0].position)c=yt(i[0].color)||{r:0,g:0,b:0};else if(l>=i[i.length-1].position)c=yt(i[i.length-1].color)||{r:0,g:0,b:0};else for(let d=0;d<i.length-1;d++)if(l>=i[d].position&&l<=i[d+1].position){const f=i[d],h=i[d+1];let p=(l-f.position)/(h.position-f.position);const u=f.bias??.5;Math.abs(u-.5)>.001&&(p=Tl(p,u));const m=f.interpolation||"linear";m==="step"?p=0:(m==="smooth"||m==="cubic")&&(p=p*p*(3-2*p));const v=yt(f.color)||{r:0,g:0,b:0},y=yt(h.color)||{r:0,g:0,b:0};c=Pl(v,y,p);break}return s==="linear"?{r:Va(c.r),g:Va(c.g),b:Va(c.b)}:s==="aces_inverse"?{r:qa(c.r),g:qa(c.g),b:qa(c.b)}:c};for(let l=0;l<256;l++){const c=l/255,d=r(c);t[l*4]=d.r,t[l*4+1]=d.g,t[l*4+2]=d.b,t[l*4+3]=255}return t},El=e=>{const n=Math.max(1e3,Math.min(4e4,e))/100;let t,o,s;return n<=66?t=255:(t=n-60,t=329.698727446*Math.pow(t,-.1332047592),t=Math.max(0,Math.min(255,t))),n<=66?(o=n,o=99.4708025861*Math.log(o)-161.1195681661,o=Math.max(0,Math.min(255,o))):(o=n-60,o=288.1221695283*Math.pow(o,-.0755148492),o=Math.max(0,Math.min(255,o))),n>=66?s=255:n<=19?s=0:(s=n-10,s=138.5177312231*Math.log(s)-305.0447927307,s=Math.max(0,Math.min(255,s))),{r:Math.round(t),g:Math.round(o),b:Math.round(s)}},oo=e=>{const{r:n,g:t,b:o}=El(e);return aa(n,t,o)},Ll=(e,n)=>{const t={};return Il(),oe.getAll().forEach(s=>{const i={},r={};s.state&&Object.assign(i,s.state),Object.entries(s.params).forEach(([c,d])=>{d.composeFrom?d.composeFrom.forEach(f=>{r[f]=c}):i[c]===void 0&&(i[c]=d.default)}),t[s.id]=i;const l=`set${s.id.charAt(0).toUpperCase()+s.id.slice(1)}`;t[l]=c=>{let d=!1;const f={};e(h=>{const p=h[s.id],u={...c};Object.keys(c).forEach(y=>{const x=s.params[y];if(x){const g=c[y];if(g==null)return;x.type==="vec2"&&!(g instanceof Te)&&(u[y]=new Te(g.x,g.y)),x.type==="vec3"&&!(g instanceof V)&&(u[y]=new V(g.x,g.y,g.z)),x.type==="color"&&!(g instanceof Ve)&&(typeof g=="string"?u[y]=new Ve(g):typeof g=="number"?u[y]=new Ve(g):typeof g=="object"&&"r"in g&&(u[y]=new Ve(g.r,g.g,g.b)))}});const m={...p,...u},v=new Set;return Object.keys(u).forEach(y=>{const x=s.params[y];if(r[y]&&v.add(r[y]),x&&(x.noReset||(d=!0),x.type!=="image"&&(f[s.id]||(f[s.id]={}),f[s.id][y]=m[y]),x.uniform)){const g=m[y];if(x.type==="image"){const b=x.uniform.toLowerCase().includes("env")?"env":"color";g&&typeof g=="string"?(Y.emit("texture",{textureType:b,dataUrl:g}),y==="envMapData"&&m.useEnvMap===!1&&(m.useEnvMap=!0,Y.emit("uniform",{key:"uUseEnvMap",value:1,noReset:!1})),y==="layer1Data"&&m.active===!1&&(m.active=!0,Y.emit("uniform",{key:"uUseTexture",value:1,noReset:!1}))):(Y.emit("texture",{textureType:b,dataUrl:null}),y==="envMapData"&&m.useEnvMap===!0&&(m.useEnvMap=!1,Y.emit("uniform",{key:"uUseEnvMap",value:0,noReset:!1})),y==="layer1Data"&&m.active===!0&&(m.active=!1,Y.emit("uniform",{key:"uUseTexture",value:0,noReset:!1})))}else if(x.type==="gradient"){const b=no(g);Y.emit("uniform",{key:x.uniform,value:{isGradientBuffer:!0,buffer:b},noReset:!!x.noReset})}else{let b=g;x.type==="boolean"&&(b=g?1:0),x.type==="color"&&!(b instanceof Ve)&&(b=new Ve(b)),Y.emit("uniform",{key:x.uniform,value:b,noReset:!!x.noReset})}}}),v.forEach(y=>{const x=s.params[y];if(x&&x.composeFrom&&x.uniform){const g=x.composeFrom.map(b=>m[b]);if(x.type==="gradient"){const b=m[y];if(b){const M=no(b);Y.emit("uniform",{key:x.uniform,value:{isGradientBuffer:!0,buffer:M},noReset:!!x.noReset}),x.noReset||(d=!0)}}else if(x.type==="vec2"){const b=new Te(g[0],g[1]);Y.emit("uniform",{key:x.uniform,value:b,noReset:!!x.noReset}),x.noReset||(d=!0)}else if(x.type==="vec3"){const b=new V(g[0],g[1],g[2]);Y.emit("uniform",{key:x.uniform,value:b,noReset:!!x.noReset}),x.noReset||(d=!0)}}}),{[s.id]:m}}),Object.keys(f).length>0&&Y.emit("config",f),d&&Y.emit("reset_accum",void 0)},s.actions&&Object.entries(s.actions).forEach(([c,d])=>{t[c]=f=>{const p=n()[s.id],u=d(p,f);u&&Object.keys(u).length>0&&(e({[s.id]:{...p,...u}}),Y.emit("reset_accum",void 0))}})}),t},Nl={id:"shadows",label:"Shadows",renderContext:"direct",controlledParams:["lighting.shadowsCompile","lighting.shadowAlgorithm","lighting.ptStochasticShadows"],tiers:[{label:"Off",overrides:{lighting:{shadows:!1,shadowsCompile:!1,ptStochasticShadows:!1}},estCompileMs:0},{label:"Hard",overrides:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:2,ptStochasticShadows:!1}},estCompileMs:500},{label:"Soft",overrides:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!1}},estCompileMs:3e3},{label:"Full",overrides:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!0}},estCompileMs:3800}]},Dl={id:"reflections",label:"Reflections (Direct)",renderContext:"direct",controlledParams:["reflections.reflectionMode","reflections.bounceShadows","reflections.bounces"],tiers:[{label:"Off",overrides:{reflections:{reflectionMode:0,bounceShadows:!1}},estCompileMs:0},{label:"Env Map",overrides:{reflections:{reflectionMode:1,bounceShadows:!1}},estCompileMs:0},{label:"Raymarched",overrides:{reflections:{reflectionMode:3,bounceShadows:!1,bounces:1}},estCompileMs:7500},{label:"Full",overrides:{reflections:{reflectionMode:3,bounceShadows:!0,bounces:2}},estCompileMs:12e3}]},_l={id:"lighting_quality",label:"Lighting",isAdvanced:!0,controlledParams:["lighting.specularModel","lighting.ptEnabled","lighting.ptNEEAllLights","lighting.ptEnvNEE"],tiers:[{label:"Preview",overrides:{lighting:{advancedLighting:!1,ptEnabled:!1}},estCompileMs:-2500},{label:"Path Traced",overrides:{lighting:{specularModel:1,ptEnabled:!0,advancedLighting:!0,ptNEEAllLights:!1,ptEnvNEE:!1}},estCompileMs:1900},{label:"PT + NEE",overrides:{lighting:{specularModel:1,ptEnabled:!0,advancedLighting:!0,ptNEEAllLights:!0,ptEnvNEE:!0}},estCompileMs:2500}]},Fl={id:"atmosphere_quality",label:"Atmosphere",controlledParams:["atmosphere.glowEnabled","atmosphere.glowQuality","volumetric.ptVolumetric"],tiers:[{label:"Off",overrides:{atmosphere:{glowEnabled:!1},volumetric:{ptVolumetric:!1}},estCompileMs:0},{label:"Fast Glow",overrides:{atmosphere:{glowEnabled:!0,glowQuality:1},volumetric:{ptVolumetric:!1}},estCompileMs:200},{label:"Color Glow",overrides:{atmosphere:{glowEnabled:!0,glowQuality:0},volumetric:{ptVolumetric:!1}},estCompileMs:400},{label:"Volumetric",overrides:{atmosphere:{glowEnabled:!0,glowQuality:0},volumetric:{ptVolumetric:!0}},estCompileMs:5900}]},za=[Nl,Dl,_l,Fl],It=[{id:"preview",label:"Preview",description:"Instant preview shader — navigate without waiting for compile.",subsystems:{shadows:0,reflections:0,lighting_quality:0,atmosphere_quality:0}},{id:"fastest",label:"Fastest",description:"Path traced lighting with fast glow.",subsystems:{shadows:0,reflections:0,lighting_quality:1,atmosphere_quality:1}},{id:"lite",label:"Lite",description:"Hard shadows, env map reflections, color glow.",subsystems:{shadows:1,reflections:1,lighting_quality:1,atmosphere_quality:2}},{id:"balanced",label:"Balanced",description:"Soft shadows, env map reflections, color glow.",subsystems:{shadows:2,reflections:1,lighting_quality:1,atmosphere_quality:2}},{id:"full",label:"Full",description:"Full shadows, raymarched reflections, volumetric.",subsystems:{shadows:3,reflections:3,lighting_quality:1,atmosphere_quality:3}},{id:"ultra",label:"Ultra",description:"Full + PT NEE. Experimental.",isAdvanced:!0,subsystems:{shadows:3,reflections:3,lighting_quality:2,atmosphere_quality:3}}],Al={activePreset:"balanced",subsystems:{...It[3].subsystems},isCustomized:!1};function zl(e){return It.find(n=>n.id===e)}function Ol(e){for(const n of It)if(Object.keys(n.subsystems).every(o=>n.subsystems[o]===e[o]))return n.id;return null}function hr(e){if(!e.activePreset)return"Custom";const n=zl(e.activePreset);if(!n)return"Custom";if(!e.isCustomized)return n.label;const t=[];for(const o of za){const s=n.subsystems[o.id],i=e.subsystems[o.id];if(s!==i){const r=o.tiers[i];t.push(`${o.label}=${(r==null?void 0:r.label)??"?"}`)}}return`${n.label} (${t.join(", ")})`}const $l=4200;function hn(e){let n=$l;for(const t of za){const o=e[t.id]??0,s=t.tiers[o];s&&(n+=s.estCompileMs)}return n}let fn=null;function Hl(e){fn=e}function ro(e,n){const t=n(),o={};for(const s of za){const i=e[s.id]??0,r=s.tiers[i];if(r)for(const[l,c]of Object.entries(r.overrides))o[l]||(o[l]={}),Object.assign(o[l],c)}for(const[s,i]of Object.entries(o)){const r=`set${s.charAt(0).toUpperCase()+s.slice(1)}`,l=t[r];typeof l=="function"&&l(i)}}function Bl(e){if(!fn)return;const n=fn(e());Y.emit(me.CONFIG,n)}const Gl=(e,n)=>({scalability:{...Al},hardwareProfile:null,applyScalabilityPreset:t=>{const o=It.find(s=>s.id===t);o&&(e({scalability:{activePreset:t,subsystems:{...o.subsystems},isCustomized:!1}}),ro(o.subsystems,n))},setSubsystemTier:(t,o)=>{const s=n().scalability,i={...s.subsystems,[t]:o};let r=!1;if(s.activePreset){const c=It.find(d=>d.id===s.activePreset);c&&(r=Object.keys(i).some(d=>i[d]!==c.subsystems[d]))}else r=!0;const l=Ol(i);e({scalability:{activePreset:l??s.activePreset,subsystems:i,isCustomized:l?!1:r}}),ro(i,n)},setHardwareProfile:t=>{e({hardwareProfile:t}),Bl(n)}});class pn{constructor(n,t=null){Q(this,"defaultState");Q(this,"dictionary");Q(this,"reverseDictCache",new Map);this.defaultState=n,this.dictionary=t}encode(n,t){try{const o=this.getDiff(n,this.defaultState);if(!o||Object.keys(o).length===0)return"";let s=this.quantize(o);if(!s||Object.keys(s).length===0)return"";this.dictionary&&(s=this.applyDictionary(s,this.dictionary,!0));const i=JSON.stringify(s),r=Wn.deflate(i),l=Array.from(r).map(d=>String.fromCharCode(d)).join("");return btoa(l).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}catch(o){return console.error("UrlStateEncoder: Error encoding",o),""}}decode(n){try{if(!n)return null;let t=n.replace(/-/g,"+").replace(/_/g,"/");for(;t.length%4;)t+="=";const o=atob(t),s=new Uint8Array(o.length);for(let l=0;l<o.length;l++)s[l]=o.charCodeAt(l);const i=Wn.inflate(s,{to:"string"});let r=JSON.parse(i);return this.dictionary&&(r=this.applyDictionary(r,this.dictionary,!1)),this.deepMerge({...this.defaultState},r)}catch(t){return console.error("UrlStateEncoder: Error decoding",t),null}}getReverseDict(n){if(this.reverseDictCache.has(n))return this.reverseDictCache.get(n);const t={};return Object.keys(n).forEach(o=>{const s=n[o];typeof s=="string"?t[s]=o:t[s._alias]=o}),this.reverseDictCache.set(n,t),t}applyDictionary(n,t,o){if(!n||typeof n!="object"||Array.isArray(n))return n;const s={};if(o)Object.keys(n).forEach(i=>{let r=i,l=null;const c=t[i];c&&(typeof c=="string"?r=c:(r=c._alias,l=c.children));const d=n[i];l&&d&&typeof d=="object"&&!Array.isArray(d)?s[r]=this.applyDictionary(d,l,!0):s[r]=d});else{const i=this.getReverseDict(t);Object.keys(n).forEach(r=>{const l=i[r]||r,c=n[r],d=t[l],f=d&&typeof d=="object"?d.children:null;f&&c&&typeof c=="object"&&!Array.isArray(c)?s[l]=this.applyDictionary(c,f,!1):s[l]=c})}return s}isEqual(n,t){if(n===t)return!0;if(n==null||t==null)return n===t;if(typeof n=="number"&&typeof t=="number")return Math.abs(n-t)<1e-4;if(Array.isArray(n)&&Array.isArray(t))return n.length!==t.length?!1:n.every((o,s)=>this.isEqual(o,t[s]));if(typeof n=="object"&&typeof t=="object"){const o=n,s=t,i=Object.keys(o).filter(l=>!l.startsWith("is")),r=Object.keys(s).filter(l=>!l.startsWith("is"));return i.length!==r.length?!1:i.every(l=>this.isEqual(o[l],s[l]))}return!1}quantize(n){if(typeof n=="string")return n.startsWith("data:image")?void 0:n;if(typeof n=="number")return n===0||Math.abs(n)<1e-9?0:parseFloat(n.toFixed(5));if(Array.isArray(n))return n.map(t=>this.quantize(t));if(n!==null&&typeof n=="object"){const t={};let o=!1;const s=Object.keys(n).filter(i=>!i.startsWith("is"));for(const i of s){const r=this.quantize(n[i]);r!==void 0&&(t[i]=r,o=!0)}return o?t:void 0}return n}getDiff(n,t){if(this.isEqual(n,t))return;if(typeof n!="object"||n===null||typeof t!="object"||t===null||Array.isArray(n))return n;const o={};let s=!1;const i=n,r=t;return Object.keys(i).forEach(l=>{if(l.startsWith("is")||l==="histogramData"||l==="interactionSnapshot"||l==="liveModulations"||l.endsWith("Stack"))return;const c=this.getDiff(i[l],r[l]);c!==void 0&&(o[l]=c,s=!0)}),s?o:void 0}deepMerge(n,t){if(typeof t!="object"||t===null)return t;const o={...n};return Object.keys(t).forEach(s=>{typeof t[s]=="object"&&t[s]!==null&&!Array.isArray(t[s])?o[s]=this.deepMerge(n[s]||{},t[s]):o[s]=t[s]}),o}}const Ul=(e,n)=>({isPlaying:!1,isRecording:!1,isScrubbing:!1,recordCamera:!0,isCameraInteracting:!1,currentFrame:0,fps:30,durationFrames:300,zoomLevel:1,loopMode:"Loop",isArmingModulation:!1,isRecordingModulation:!1,recordingSnapshot:null,play:()=>{const t=n();if(t.currentFrame>=t.durationFrames-.1&&e({currentFrame:0}),t.isArmingModulation){t.snapshot();const o=JSON.parse(JSON.stringify(t.sequence));e({isRecordingModulation:!0,isArmingModulation:!1,recordingSnapshot:o,isPlaying:!0,currentFrame:0})}else e({isPlaying:!0})},pause:()=>e({isPlaying:!1,isRecordingModulation:!1,recordingSnapshot:null}),stop:()=>e({isPlaying:!1,currentFrame:0,isRecordingModulation:!1,recordingSnapshot:null}),toggleRecording:()=>e(t=>({isRecording:!t.isRecording})),toggleRecordCamera:()=>e(t=>({recordCamera:!t.recordCamera})),toggleArmModulation:()=>e(t=>({isArmingModulation:!t.isArmingModulation,isRecording:!1})),stopModulationRecording:()=>e({isRecordingModulation:!1,isPlaying:!1,recordingSnapshot:null}),setLoopMode:t=>e({loopMode:t}),setIsScrubbing:t=>e({isScrubbing:t}),setIsCameraInteracting:t=>e({isCameraInteracting:t}),seek:t=>e({currentFrame:Math.max(0,Math.min(n().durationFrames,t))}),setDuration:t=>{e({durationFrames:t})},setFps:t=>{e({fps:t})}}),Wl=(e,n)=>({selectedTrackIds:[],selectedKeyframeIds:[],softSelectionRadius:0,softSelectionEnabled:!1,softSelectionType:"S-Curve",bounceTension:.5,bounceFriction:.6,selectTrack:(t,o)=>e(s=>({selectedTrackIds:o?s.selectedTrackIds.includes(t)?s.selectedTrackIds.filter(i=>i!==t):[...s.selectedTrackIds,t]:[t]})),selectTracks:(t,o)=>e(s=>{const i=new Set(s.selectedTrackIds);return o?t.forEach(r=>i.add(r)):t.forEach(r=>i.delete(r)),{selectedTrackIds:Array.from(i)}}),selectKeyframe:(t,o,s)=>e(i=>{const r=`${t}::${o}`;return{selectedKeyframeIds:s?i.selectedKeyframeIds.includes(r)?i.selectedKeyframeIds.filter(l=>l!==r):[...i.selectedKeyframeIds,r]:[r]}}),selectKeyframes:(t,o)=>e(s=>({selectedKeyframeIds:o?Array.from(new Set([...s.selectedKeyframeIds,...t])):t})),deselectAll:()=>e({selectedTrackIds:[],selectedKeyframeIds:[]}),deselectAllKeys:()=>e({selectedKeyframeIds:[]}),setSoftSelection:(t,o)=>e({softSelectionRadius:t,softSelectionEnabled:o}),setSoftSelectionType:t=>e({softSelectionType:t}),setBouncePhysics:(t,o)=>e({bounceTension:t,bounceFriction:o})});function fr(e,n,t,o,s){const i=1-e,r=e*e,l=i*i,c=l*i,d=r*e;return c*n+3*l*e*t+3*i*r*o+d*s}function so(e,n){let t=n[0],o=n[n.length-1];for(let f=0;f<n.length-1;f++)if(e>=n[f].frame&&e<n[f+1].frame){t=n[f],o=n[f+1];break}if(e>=o.frame)return o.value;if(e<=t.frame)return t.value;const s=o.frame-t.frame,i=(e-t.frame)/s;if(t.interpolation==="Step")return t.value;if(t.interpolation==="Linear")return t.value+(o.value-t.value)*i;const r=t.value,l=t.value+(t.rightTangent?t.rightTangent.y:0),c=o.value+(o.leftTangent?o.leftTangent.y:0),d=o.value;return fr(i,r,l,c,d)}function Vl(e,n=1){const t=[],o=e[0].frame,s=e[e.length-1].frame,i=Math.max(n,(s-o)/50);for(let r=o;r<=s;r+=i)t.push({t:r,val:so(r,e)});return t.length>0&&t[t.length-1].t<s&&t.push({t:s,val:so(s,e)}),t}function ql(e,n,t){let o=0,s=0,i=0,r=0,l=0,c=0,d=0;for(let y=0;y<e.length;y++){const x=e[y].t,g=1-x,b=e[y].val;c+=b,d+=b*b;const M=3*g*g*x,j=3*g*x*x,C=g*g*g*n+x*x*x*t,S=b-C;o+=M*M,s+=M*j,i+=j*j,r+=S*M,l+=S*j}const f=e.length,h=c/f;if(d/f-h*h<1e-9)return null;const u=o*i-s*s;if(Math.abs(u)<1e-9)return null;const m=(i*r-s*l)/u,v=(o*l-s*r)/u;return{h1:m,h2:v}}function Yl(e,n){const t=e.length;if(t<2){const u=e[0].val;return{leftY:u,rightY:u}}const o=e[0].val,s=e[t-1].val,i=s-o,r=o+i*.333,l=o+i*.666,c=ql(e,o,s);let d=r,f=l;c&&(d=c.h1,f=c.h2);const h=r+(d-r)*n,p=l+(f-l)*n;return{leftY:h,rightY:p}}function mn(e,n,t,o){if(e.length<2)return;const s=e[0],i=e[e.length-1],r=i.t-s.t,l=e.map(p=>({t:(p.t-s.t)/r,val:p.val})),{leftY:c,rightY:d}=Yl(l,o);let f=0,h=-1;if(r<1)f=0;else for(let p=1;p<l.length-1;p++){const u=l[p].t,m=fr(u,s.val,c,d,i.val),v=Math.abs(m-l[p].val);v>f&&(f=v,h=p)}if(f<=t||e.length<=2){const p=n[n.length-1];p&&(p.rightTangent={x:r*.333,y:c-s.val});const u={id:ot(),frame:i.t,value:i.val,interpolation:"Bezier",brokenTangents:!1,autoTangent:!1,leftTangent:{x:-r*.333,y:d-i.val},rightTangent:{x:1,y:0}};n.push(u)}else{const p=e.slice(0,h+1),u=e.slice(h);mn(p,n,t,o),mn(u,n,t,o)}}const Xl=(e,n,t=1)=>{if(e.length<2)return e;t=Math.max(0,Math.min(1,t));const o=[...e].sort((l,c)=>l.frame-c.frame),s=Vl(o,1),i=[],r=s[0];return i.push({id:ot(),frame:r.t,value:r.val,interpolation:"Bezier",brokenTangents:!1,autoTangent:!1,leftTangent:{x:-1,y:0},rightTangent:{x:1,y:0}}),mn(s,i,n,t),i.length>0&&(i[0].leftTangent={x:-1,y:0},i[i.length-1].rightTangent={x:1,y:0}),i},Zl=4;function pr(e,n,t,o,s){const i=1-e,r=e*e,l=i*i,c=l*i,d=r*e;return c*n+3*l*e*t+3*i*r*o+d*s}function Ql(e,n,t,o,s){const i=1-e;return 3*i*i*(t-n)+6*i*e*(o-t)+3*e*e*(s-o)}function Kl(e,n,t,o,s){const i=s-n;if(i<=1e-9)return 0;let r=(e-n)/i;for(let l=0;l<Zl;++l){const c=pr(r,n,t,o,s),d=Ql(r,n,t,o,s);if(Math.abs(d)<1e-9)break;const f=c-e;r-=f/d}return Math.max(0,Math.min(1,r))}function Jl(e,n,t,o,s,i,r,l,c){const d=n,f=t,h=n+o,p=t+s,u=i+l,m=r+c,v=i,y=r,x=Kl(e,d,h,u,v);return pr(x,f,p,m,y)}const it=.333,rt={interpolate:(e,n,t,o=!1)=>{if(n.interpolation==="Step")return n.value;let s=n.value,i=t.value;if(o){const c=Math.PI*2,d=i-s;d>Math.PI?i-=c:d<-Math.PI&&(i+=c)}if(n.interpolation==="Bezier"){const c=n.rightTangent?n.rightTangent.x:(t.frame-n.frame)*it,d=n.rightTangent?n.rightTangent.y:0,f=t.leftTangent?t.leftTangent.x:-(t.frame-n.frame)*it,h=t.leftTangent?t.leftTangent.y:0;return Jl(e,n.frame,s,c,d,t.frame,i,f,h)}const r=t.frame-n.frame;if(r<1e-9)return s;const l=(e-n.frame)/r;return s+(i-s)*l},scaleHandles:(e,n,t,o,s)=>{const i={};if(e.interpolation!=="Bezier")return i;if(n&&e.leftTangent){const r=o-n.frame,l=s-n.frame;if(Math.abs(r)>1e-5&&Math.abs(l)>1e-5){const c=l/r;i.leftTangent={x:e.leftTangent.x*c,y:e.leftTangent.y*c}}}if(t&&e.rightTangent){const r=t.frame-o,l=t.frame-s;if(Math.abs(r)>1e-5&&Math.abs(l)>1e-5){const c=l/r;i.rightTangent={x:e.rightTangent.x*c,y:e.rightTangent.y*c}}}return i},calculateTangents:(e,n,t,o)=>{if(o==="Ease"){const y=n?(e.frame-n.frame)*it:10,x=t?(t.frame-e.frame)*it:10;return{l:{x:-y,y:0},r:{x,y:0}}}if(!n&&!t)return{l:{x:-10,y:0},r:{x:10,y:0}};if(!n){const y=(t.value-e.value)/(t.frame-e.frame),x=(t.frame-e.frame)*it;return{l:{x:-10,y:0},r:{x,y:x*y}}}if(!t){const y=(e.value-n.value)/(e.frame-n.frame),x=(e.frame-n.frame)*it;return{l:{x:-x,y:-x*y},r:{x:10,y:0}}}const s=e.frame-n.frame,i=e.value-n.value,r=s===0?0:i/s,l=t.frame-e.frame,c=t.value-e.value,d=l===0?0:c/l;if(r*d<=0){const y=s*it,x=l*it;return{l:{x:-y,y:0},r:{x,y:0}}}const f=t.frame-n.frame,h=t.value-n.value;let p=f===0?0:h/f;const u=3*Math.min(Math.abs(r),Math.abs(d));Math.abs(p)>u&&(p=Math.sign(p)*u);const m=s*it,v=l*it;return{l:{x:-m,y:-m*p},r:{x:v,y:v*p}}},constrainHandles:(e,n,t)=>{var s,i;const o={};if(e.leftTangent&&n){const r=e.frame-n.frame;if(r>.001){const l=r*it;if(Math.abs(e.leftTangent.x)>l){const c=l/Math.abs(e.leftTangent.x);o.leftTangent={x:e.leftTangent.x*c,y:e.leftTangent.y*c}}e.leftTangent.x>0&&(o.leftTangent={x:0,y:((s=o.leftTangent)==null?void 0:s.y)??e.leftTangent.y})}}if(e.rightTangent&&t){const r=t.frame-e.frame;if(r>.001){const l=r*it;if(Math.abs(e.rightTangent.x)>l){const c=l/Math.abs(e.rightTangent.x);o.rightTangent={x:e.rightTangent.x*c,y:e.rightTangent.y*c}}e.rightTangent.x<0&&(o.rightTangent={x:0,y:((i=o.rightTangent)==null?void 0:i.y)??e.rightTangent.y})}}return o},calculateSoftFalloff:(e,n,t)=>{if(e>=n)return 0;const o=e/n;switch(t){case"Linear":return 1-o;case"Dome":return Math.sqrt(1-o*o);case"Pinpoint":return Math.pow(1-o,4);case"S-Curve":return .5*(1+Math.cos(o*Math.PI));default:return 1-o}}},Ya={updateNeighbors:(e,n)=>{const t=e[n],o=n===e.length-1,s=n-1;if(s>=0){const r={...e[s]};if(e[s]=r,r.interpolation==="Bezier"){const l=t.frame-r.frame;if(r.autoTangent){const c=e[s-1],{l:d,r:f}=rt.calculateTangents(r,c,t,"Auto");r.leftTangent=d,r.rightTangent=f}else{const c=rt.constrainHandles(r,e[s-1],t);Object.assign(r,c)}if(o&&l>1e-4){const c=l*.3,d=r.rightTangent||{x:10,y:0};if(d.x<c){const f=c/Math.max(1e-4,Math.abs(d.x));r.rightTangent={x:c,y:d.y*f}}}}}const i=n+1;if(i<e.length){const r={...e[i]};if(e[i]=r,r.interpolation==="Bezier")if(r.autoTangent){const l=e[i+1],{l:c,r:d}=rt.calculateTangents(r,t,l,"Auto");r.leftTangent=c,r.rightTangent=d}else{const l=rt.constrainHandles(r,t,e[i+1]);Object.assign(r,l)}}},inferInterpolation:(e,n)=>{const t=e.filter(o=>o.frame<n).sort((o,s)=>s.frame-o.frame);return t.length===0||t[0].interpolation==="Linear"?"Linear":t[0].interpolation==="Step"?"Step":"Bezier"}},ec=ge(),tc={durationFrames:300,fps:30,tracks:{}},ac=(e,n)=>({sequence:tc,clipboard:null,undoStack:[],redoStack:[],snapshot:()=>{const t=n().sequence,o=JSON.parse(JSON.stringify(t));e(s=>{const i=[...s.undoStack,{type:"SEQUENCE",data:o}];return{undoStack:i.length>50?i.slice(1):i,redoStack:[]}})},undo:()=>{const{undoStack:t,redoStack:o,sequence:s}=n();if(t.length===0)return!1;const i=t[t.length-1],r=t.slice(0,-1),c={type:"SEQUENCE",data:JSON.parse(JSON.stringify(s))};return e({sequence:i.data,undoStack:r,redoStack:[c,...o]}),!0},redo:()=>{const{undoStack:t,redoStack:o,sequence:s}=n();if(o.length===0)return!1;const i=o[0],r=o.slice(1),c={type:"SEQUENCE",data:JSON.parse(JSON.stringify(s))};return e({sequence:i.data,undoStack:[...t,c],redoStack:r}),!0},setSequence:t=>{n().snapshot(),e({sequence:t})},addTrack:(t,o)=>{n().snapshot(),e(s=>s.sequence.tracks[t]?s:{sequence:{...s.sequence,tracks:{...s.sequence.tracks,[t]:{id:t,type:"float",label:o,keyframes:[]}}}})},removeTrack:t=>{n().snapshot(),e(o=>{const s={...o.sequence.tracks};return delete s[t],{sequence:{...o.sequence,tracks:s},selectedTrackIds:o.selectedTrackIds.filter(i=>i!==t)}})},setTrackBehavior:(t,o)=>{n().snapshot(),e(s=>{const i=s.sequence.tracks[t];return i?{sequence:{...s.sequence,tracks:{...s.sequence.tracks,[t]:{...i,postBehavior:o}}}}:s})},addKeyframe:(t,o,s,i)=>{e(r=>{const l=r.sequence.tracks[t];if(!l)return r;let c=i||"Bezier";i||(c=Ya.inferInterpolation(l.keyframes,o));const d=c==="Bezier",f={id:ot(),frame:o,value:s,interpolation:c,autoTangent:d,brokenTangents:!1},p=[...l.keyframes.filter(m=>Math.abs(m.frame-o)>.001),f].sort((m,v)=>m.frame-v.frame),u=p.findIndex(m=>m.id===f.id);if(c==="Bezier"){const m=u>0?p[u-1]:void 0,v=u<p.length-1?p[u+1]:void 0,{l:y,r:x}=rt.calculateTangents(f,m,v,"Auto");f.leftTangent=y,f.rightTangent=x}return Ya.updateNeighbors(p,u),{sequence:{...r.sequence,tracks:{...r.sequence.tracks,[t]:{...l,keyframes:p}}}}})},batchAddKeyframes:(t,o,s)=>{e(i=>{const r={...i.sequence.tracks};let l=!1;return o.forEach(({trackId:c,value:d})=>{r[c]||(r[c]={id:c,type:"float",label:c,keyframes:[]},l=!0);const f=r[c],h=[...f.keyframes],p=h.length>0?h[h.length-1]:null,u={id:ot(),frame:t,value:d,interpolation:s||"Linear",autoTangent:s==="Bezier",brokenTangents:!1};if(p)if(t>p.frame)h.push(u);else if(Math.abs(t-p.frame)<.001)u.id=p.id,h[h.length-1]=u;else{const m=h.filter(v=>Math.abs(v.frame-t)>.001);m.push(u),m.sort((v,y)=>v.frame-y.frame),f.keyframes=m,l=!0;return}else h.push(u);f.keyframes=h,l=!0}),l?{sequence:{...i.sequence,tracks:r}}:i})},removeKeyframe:(t,o)=>{n().snapshot(),e(s=>{const i=s.sequence.tracks[t];return i?{sequence:{...s.sequence,tracks:{...s.sequence.tracks,[t]:{...i,keyframes:i.keyframes.filter(r=>r.id!==o)}}}}:s})},updateKeyframe:(t,o,s)=>{e(i=>{const r=i.sequence.tracks[t];if(!r)return i;const l=r.keyframes.map(c=>c.id===o?{...c,...s}:c).sort((c,d)=>c.frame-d.frame);return{sequence:{...i.sequence,tracks:{...i.sequence.tracks,[t]:{...r,keyframes:l}}}}})},updateKeyframes:t=>{e(o=>{const s={...o.sequence.tracks};return t.forEach(({trackId:i,keyId:r,patch:l})=>{const c=s[i];if(c){const d=c.keyframes.findIndex(f=>f.id===r);if(d!==-1){const f=c.keyframes[d];l.interpolation==="Bezier"&&f.interpolation!=="Bezier"&&(l.autoTangent=!0),c.keyframes[d]={...f,...l}}}}),Object.keys(s).forEach(i=>{s[i].keyframes.sort((r,l)=>r.frame-l.frame)}),{sequence:{...o.sequence,tracks:s}}})},deleteSelectedKeyframes:()=>{n().snapshot(),e(t=>{const o={...t.sequence.tracks},s=new Set(t.selectedKeyframeIds);return Object.keys(o).forEach(i=>{o[i]={...o[i],keyframes:o[i].keyframes.filter(r=>!s.has(`${i}::${r.id}`))}}),{sequence:{...t.sequence,tracks:o},selectedKeyframeIds:[]}})},deleteAllKeys:()=>{n().snapshot(),e(t=>{const o={...t.sequence.tracks};return Object.keys(o).forEach(s=>{o[s]={...o[s],keyframes:[]}}),{sequence:{...t.sequence,tracks:o},selectedKeyframeIds:[]}})},deleteAllTracks:()=>{n().snapshot(),e({sequence:{...n().sequence,tracks:{}},selectedTrackIds:[],selectedKeyframeIds:[]})},setTangents:t=>{n().snapshot(),e(o=>{const s={...o.sequence.tracks};return o.selectedKeyframeIds.forEach(i=>{const[r,l]=i.split("::"),c=s[r];if(c){const d=c.keyframes.findIndex(h=>h.id===l);if(d===-1)return;const f=c.keyframes[d];if(t==="Split")c.keyframes[d]={...f,brokenTangents:!0,autoTangent:!1};else if(t==="Unified"){let h=f.rightTangent,p=f.leftTangent;if(h&&p){const u=Math.sqrt(h.x*h.x+h.y*h.y),m=Math.sqrt(p.x*p.x+p.y*p.y);h={x:-p.x*(u/Math.max(.001,m)),y:-p.y*(u/Math.max(.001,m))}}c.keyframes[d]={...f,rightTangent:h,brokenTangents:!1,autoTangent:!1}}else if(t==="Auto"||t==="Ease"){const h=c.keyframes[d-1],p=c.keyframes[d+1],{l:u,r:m}=rt.calculateTangents(f,h,p,t);c.keyframes[d]={...f,autoTangent:t==="Auto",brokenTangents:!1,leftTangent:u,rightTangent:m}}}}),{sequence:{...o.sequence,tracks:s}}})},setGlobalInterpolation:(t,o)=>{n().snapshot(),e(s=>{const i={...s.sequence.tracks};return Object.keys(i).forEach(r=>{const l=i[r];l.keyframes.length!==0&&l.keyframes.forEach((c,d)=>{if(c.interpolation=t,t==="Bezier"&&o){const f=l.keyframes[d-1],h=l.keyframes[d+1],{l:p,r:u}=rt.calculateTangents(c,f,h,o);c.leftTangent=p,c.rightTangent=u,c.autoTangent=o==="Auto",c.brokenTangents=!1}})}),{sequence:{...s.sequence,tracks:i}}})},copySelectedKeyframes:()=>{const{sequence:t,selectedKeyframeIds:o}=n();if(o.length===0)return;let s=1/0;o.forEach(r=>{var f,h;const[l,c]=r.split("::"),d=(h=(f=t.tracks[l])==null?void 0:f.keyframes.find(p=>p.id===c))==null?void 0:h.frame;d!==void 0&&d<s&&(s=d)});const i=[];o.forEach(r=>{var f;const[l,c]=r.split("::"),d=(f=t.tracks[l])==null?void 0:f.keyframes.find(h=>h.id===c);d&&i.push({relativeFrame:d.frame-s,value:d.value,interpolation:d.interpolation,leftTangent:d.leftTangent,rightTangent:d.rightTangent,originalTrackId:l})}),i.length>0&&e({clipboard:i})},pasteKeyframes:t=>{const{clipboard:o,currentFrame:s}=n();o&&(n().snapshot(),e(i=>{const r={...i.sequence.tracks},l=t!==void 0?t:s;return o.forEach(c=>{const d=r[c.originalTrackId];if(d){const f=l+c.relativeFrame,h={id:ot(),frame:f,value:c.value,interpolation:c.interpolation,leftTangent:c.leftTangent,rightTangent:c.rightTangent,autoTangent:!1,brokenTangents:!1};d.keyframes=[...d.keyframes.filter(p=>Math.abs(p.frame-f)>.001),h].sort((p,u)=>p.frame-u.frame)}}),{sequence:{...i.sequence,tracks:r}}}))},duplicateSelection:()=>{n().copySelectedKeyframes(),n().pasteKeyframes(n().currentFrame)},loopSelection:t=>{const o=n();if(o.selectedKeyframeIds.length<1)return;o.snapshot();let s=1/0,i=-1/0;if(o.selectedKeyframeIds.forEach(l=>{const[c,d]=l.split("::"),f=o.sequence.tracks[c],h=f==null?void 0:f.keyframes.find(p=>p.id===d);h&&(h.frame<s&&(s=h.frame),h.frame>i&&(i=h.frame))}),s===1/0||i===-1/0)return;const r=Math.max(1,i-s);e(l=>{const c={...l.sequence.tracks};for(let d=1;d<=t;d++){const f=r*d;l.selectedKeyframeIds.forEach(h=>{const[p,u]=h.split("::"),m=c[p];if(!m)return;const v=m.keyframes.find(y=>y.id===u);if(v){const y=v.frame+f,x={...v,id:ot(),frame:y};m.keyframes=[...m.keyframes.filter(g=>Math.abs(g.frame-y)>.001),x]}})}return Object.values(c).forEach(d=>d.keyframes.sort((f,h)=>f.frame-h.frame)),{sequence:{...l.sequence,tracks:c}}})},captureCameraFrame:(t,o=!1,s)=>{const i=et()||ec.activeCamera;if(!i)return;o||n().snapshot();const r=qe.getUnifiedFromEngine(),l=i.quaternion,c=new _e().setFromQuaternion(l),d=[{id:"camera.unified.x",val:r.x,label:"Position X"},{id:"camera.unified.y",val:r.y,label:"Position Y"},{id:"camera.unified.z",val:r.z,label:"Position Z"},{id:"camera.rotation.x",val:c.x,label:"Rotation X"},{id:"camera.rotation.y",val:c.y,label:"Rotation Y"},{id:"camera.rotation.z",val:c.z,label:"Rotation Z"}];e(f=>{const h={...f.sequence.tracks},p=h["camera.unified.x"],u=!p||p.keyframes.length===0,m=s||(u?"Linear":"Bezier");return d.forEach(v=>{let y=h[v.id];y||(y={id:v.id,type:"float",label:v.label,keyframes:[],hidden:!1},h[v.id]=y);const x={id:ot(),frame:t,value:v.val,interpolation:m,autoTangent:m==="Bezier",brokenTangents:!1},b=[...y.keyframes.filter(j=>Math.abs(j.frame-t)>.001),x].sort((j,C)=>j.frame-C.frame),M=b.findIndex(j=>j.id===x.id);if(m==="Bezier"){const j=M>0?b[M-1]:void 0,C=M<b.length-1?b[M+1]:void 0,{l:S,r:k}=rt.calculateTangents(x,j,C,"Auto");x.leftTangent=S,x.rightTangent=k}Ya.updateNeighbors(b,M),y.keyframes=b}),{sequence:{...f.sequence,tracks:h}}})},simplifySelectedKeys:(t=.01)=>{n().snapshot(),e(o=>{const s=o,i={...s.sequence.tracks},r=new Set(s.selectedKeyframeIds),l={};s.selectedKeyframeIds.forEach(d=>{const[f,h]=d.split("::");l[f]||(l[f]=[]);const p=s.sequence.tracks[f],u=p==null?void 0:p.keyframes.find(m=>m.id===h);u&&l[f].push(u)});const c=[];return Object.entries(l).forEach(([d,f])=>{const h=i[d];if(!h)return;const p={...h};if(i[d]=p,f.length<3)return;const u=f.sort((v,y)=>v.frame-y.frame);p.keyframes=p.keyframes.filter(v=>!r.has(`${d}::${v.id}`));const m=Xl(u,t);p.keyframes=[...p.keyframes,...m].sort((v,y)=>v.frame-y.frame),m.forEach(v=>c.push(`${d}::${v.id}`))}),{sequence:{...s.sequence,tracks:i},selectedKeyframeIds:c}})}}),le=er()(ar((e,n,t)=>({...Ul(e,n),...Wl(e),...ac(e,n)})));typeof window<"u"&&(window.useAnimationStore=le);const Kt=ge(),va=e=>{const n={};return e&&Object.keys(e).forEach(t=>{if(t.startsWith("is"))return;const o=e[t];if(o&&typeof o=="object"&&"isColor"in o)n[t]="#"+o.getHexString();else if(o&&typeof o=="object"&&("isVector2"in o||"isVector3"in o)){const s={...o};delete s.isVector2,delete s.isVector3,n[t]=s}else n[t]=o}),n},mr=e=>{const n=Re.get(e),t=n&&n.defaultPreset?n.defaultPreset:{},o={version:5,name:e,formula:e,features:{}};return oe.getAll().forEach(s=>{const i={};Object.entries(s.params).forEach(([r,l])=>{l.composeFrom||(i[r]=l.default)}),o.features[s.id]=va(i)}),t.features&&Object.entries(t.features).forEach(([s,i])=>{o.features[s]?o.features[s]={...o.features[s],...va(i)}:o.features[s]=va(i)}),t.lights&&(o.features.lighting||(o.features.lighting={}),o.features.lighting.lights=t.lights),t.renderMode&&(o.features.lighting||(o.features.lighting={}),o.features.lighting.renderMode=t.renderMode==="PathTracing"?1:0),o.cameraMode=t.cameraMode||"Orbit",o.quality={aaMode:"Always",aaLevel:1,msaa:1,accumulation:!0,...t.quality||{}},o.lights=[],o.animations=t.animations||[],o.navigation={flySpeed:.5,autoSlow:!0,...t.navigation||{}},o.sceneOffset=t.sceneOffset||{x:0,y:0,z:0,xL:0,yL:0,zL:0},o.cameraPos=t.cameraPos||{x:0,y:0,z:3.5},o.cameraRot=t.cameraRot||{x:0,y:0,z:0,w:1},o.targetDistance=t.targetDistance||3.5,o.duration=t.duration||300,o.sequence=t.sequence||{durationFrames:300,fps:30,tracks:{}},o},nc=(e,n,t)=>{const o=t(),s=e.features||{};if(e.renderMode&&(s.lighting||(s.lighting={}),s.lighting.renderMode===void 0&&(s.lighting.renderMode=e.renderMode==="PathTracing"?1:0)),s.atmosphere&&!s.ao){const x={};s.atmosphere.aoIntensity!==void 0&&(x.aoIntensity=s.atmosphere.aoIntensity),s.atmosphere.aoSpread!==void 0&&(x.aoSpread=s.atmosphere.aoSpread),s.atmosphere.aoMode!==void 0&&(x.aoMode=s.atmosphere.aoMode),s.atmosphere.aoEnabled!==void 0&&(x.aoEnabled=s.atmosphere.aoEnabled),Object.keys(x).length>0&&(s.ao=x)}if(oe.getAll().forEach(x=>{const g=`set${x.id.charAt(0).toUpperCase()+x.id.slice(1)}`,b=o[g];if(typeof b=="function"){const M=s[x.id],j={};if(x.state&&Object.assign(j,x.state),Object.entries(x.params).forEach(([C,S])=>{if(M&&M[C]!==void 0){let k=M[C];S.type==="vec2"&&k&&!(k instanceof Te)?k=new Te(k.x,k.y):S.type==="vec3"&&k&&!(k instanceof V)?k=new V(k.x,k.y,k.z):S.type==="color"&&k&&!(k instanceof Ve)&&(k=new Ve(k)),j[C]=k}else if(j[C]===void 0){let k=S.default;k&&typeof k=="object"&&(typeof k.clone=="function"?k=k.clone():Array.isArray(k)?k=[...k]:k={...k}),j[C]=k}}),x.id==="lighting"&&M){if(M.lights)j.lights=dn(M.lights.map(C=>({...C,type:C.type||"Point",rotation:C.rotation||{x:0,y:0,z:0}})));else if(M.light0_posX!==void 0){const C=[];for(let S=0;S<3;S++)if(M[`light${S}_posX`]!==void 0){let k=M[`light${S}_color`]||"#ffffff";k.getHexString&&(k="#"+k.getHexString()),C.push({type:"Point",position:{x:M[`light${S}_posX`],y:M[`light${S}_posY`],z:M[`light${S}_posZ`]},rotation:{x:0,y:0,z:0},color:k,intensity:M[`light${S}_intensity`]??1,falloff:M[`light${S}_falloff`]??0,falloffType:M[`light${S}_type`]?"Linear":"Quadratic",fixed:M[`light${S}_fixed`]??!1,visible:M[`light${S}_visible`]??S===0,castShadow:M[`light${S}_castShadow`]??!0})}C.length>0&&(j.lights=C)}}x.id==="materials"&&M&&M.envMapVisible!==void 0&&M.envBackgroundStrength===void 0&&(j.envBackgroundStrength=M.envMapVisible?1:0),b(j)}}),e.lights&&e.lights.length>0){const x=o.setLighting;if(typeof x=="function"){const g=dn(e.lights.map(b=>({...b,type:b.type||"Point",rotation:b.rotation||{x:0,y:0,z:0}})));x({lights:g})}}e.sequence&&le.getState().setSequence(e.sequence),o.setAnimations(e.animations||[]),e.savedCameras&&Array.isArray(e.savedCameras)&&e.savedCameras.length>0&&n({savedCameras:e.savedCameras,activeCameraId:e.savedCameras[0].id||null});const i=e.cameraPos||{x:0,y:0,z:3.5},r=e.sceneOffset||{x:0,y:0,z:0,xL:0,yL:0,zL:0},l=e.targetDistance||3.5,c=e.cameraRot||{x:0,y:0,z:0,w:1},d=r.x+r.xL+i.x,f=r.y+r.yL+i.y,h=r.z+r.zL+i.z,p=be.split(d),u=be.split(f),m=be.split(h),v={x:p.high,y:u.high,z:m.high,xL:p.low,yL:u.low,zL:m.low};n({cameraRot:c,targetDistance:l,sceneOffset:v,cameraMode:e.cameraMode||t().cameraMode}),Kt.activeCamera&&Kt.virtualSpace&&Kt.virtualSpace.applyCameraState(Kt.activeCamera,{position:{x:0,y:0,z:0},rotation:c,sceneOffset:v,targetDistance:l});const y={position:{x:0,y:0,z:0},rotation:c,sceneOffset:v,targetDistance:l};Kt.pendingTeleport=y,Y.emit("camera_teleport",y),e.duration&&le.getState().setDuration(e.duration),e.formula==="Modular"&&o.refreshPipeline(),o.refreshHistogram(),Y.emit("reset_accum",void 0)},oc={formula:"Mandelbulb",cameraPos:{x:0,y:0,z:0},cameraRot:{x:0,y:0,z:0,w:1},sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0},targetDistance:3.5,cameraMode:"Orbit"},rc=(e,n,t={includeAnimations:!0})=>{try{e.quality&&(delete e.quality.aaLevel,delete e.quality.aaMode,delete e.quality.msaa),e.features&&e.features.quality&&delete e.features.quality.resolutionMode,t.includeAnimations===!1&&(delete e.sequence,delete e.animations);const o=mr(e.formula);o.formula="";const s=oe.getDictionary();return new pn(o,s).encode(e,n)}catch(o){return console.error("Sharing: Failed to generate share string",o),""}},sc=e=>{if(!e)return null;try{const n=oe.getDictionary(),o=new pn(oc,n).decode(e);if(o&&o.formula){const s=mr(o.formula);return new pn(s,n).decode(e)}}catch(n){console.error("Sharing: Failed to load share string",n)}return null},Xa=ge();class ic{constructor(){Q(this,"pendingCam");Q(this,"binders",new Map);Q(this,"overriddenTracks",new Set);Q(this,"lastCameraIndex",-1);Q(this,"animStore",null);Q(this,"fractalStore",null);this.pendingCam={rot:new _e,unified:new V,rotDirty:!1,unifiedDirty:!1}}connect(n,t){this.animStore=n,this.fractalStore=t}setOverriddenTracks(n){this.overriddenTracks=n}getBinder(n){if(this.binders.has(n))return this.binders.get(n);let t=()=>{};if(n==="camera.active_index")t=o=>{const s=Math.round(o);if(s!==this.lastCameraIndex){const i=this.fractalStore.getState(),r=i.savedCameras;r&&r[s]&&(i.selectCamera(r[s].id),this.lastCameraIndex=s)}};else if(n.startsWith("camera.")){const o=n.split("."),s=o[1],i=o[2];s==="unified"?t=r=>{this.pendingCam.unified[i]=r,this.pendingCam.unifiedDirty=!0}:s==="rotation"&&(t=r=>{this.pendingCam.rot[i]=r,this.pendingCam.rotDirty=!0})}else if(n.startsWith("lights.")){const o=n.split("."),s=parseInt(o[1]),i=o[2];let r="";i==="position"?r=`pos${o[3].toUpperCase()}`:i==="color"?r="color":r=i;const l=`lighting.light${s}_${r}`;return this.getBinder(l)}else if(n.startsWith("lighting.light")){const o=n.match(/lighting\.light(\d+)_(\w+)/);if(o){const s=parseInt(o[1]),i=o[2],r=this.fractalStore.getState();if(i==="intensity")t=l=>r.updateLight({index:s,params:{intensity:l}});else if(i==="falloff")t=l=>r.updateLight({index:s,params:{falloff:l}});else if(i.startsWith("pos")){const l=i.replace("pos","").toLowerCase();t=c=>{var h;const f=(h=this.fractalStore.getState().lighting)==null?void 0:h.lights[s];if(f){const p={...f.position,[l]:c};r.updateLight({index:s,params:{position:p}})}}}else if(i.startsWith("rot")){const l=i.replace("rot","").toLowerCase();t=c=>{var h;const f=(h=this.fractalStore.getState().lighting)==null?void 0:h.lights[s];if(f){const p={...f.rotation,[l]:c};r.updateLight({index:s,params:{rotation:p}})}}}}}else if(n.includes(".")){const o=n.split("."),s=o[0],i=o[1];if(oe.get(s)){const l=this.fractalStore.getState(),c=`set${s.charAt(0).toUpperCase()+s.slice(1)}`,d=l[c];if(d&&typeof d=="function"){const f=i.match(/^(vec[23][ABC])_(x|y|z)$/);if(f){const h=f[1],p=f[2];t=u=>{var y;const v=(y=this.fractalStore.getState()[s])==null?void 0:y[h];if(v){const x=v.clone();x[p]=u,d({[h]:x})}}}else t=h=>d({[i]:h})}else console.warn(`AnimationEngine: Setter ${c} not found for feature ${s}`)}}else{const o=this.fractalStore.getState(),s="set"+n.charAt(0).toUpperCase()+n.slice(1);typeof o[s]=="function"&&(t=i=>o[s](i))}return this.binders.set(n,t),t}tick(n){if(!this.animStore)return;const t=this.animStore.getState();if(!t.isPlaying)return;const o=t.fps,s=t.currentFrame,i=t.durationFrames,r=t.loopMode,l=n*o;let c=s+l;if(c>=i)if(r==="Once"||t.isRecordingModulation){c=i,this.scrub(i),this.animStore.setState({isPlaying:!1,currentFrame:i}),t.isRecordingModulation&&t.stopModulationRecording();return}else c=0;this.animStore.setState({currentFrame:c}),this.scrub(c)}scrub(n){if(!this.animStore)return;const{sequence:t,isPlaying:o,isRecording:s,recordCamera:i}=this.animStore.getState(),r=Object.values(t.tracks);this.syncBuffersFromEngine();const l=o&&s&&i;for(let c=0;c<r.length;c++){const d=r[c];if(this.overriddenTracks.has(d.id)||d.keyframes.length===0||d.type!=="float"||d.id.includes("camera.position")||d.id.includes("camera.offset")||l&&d.id.startsWith("camera."))continue;const f=this.interpolate(d,n);this.getBinder(d.id)(f)}this.commitState()}syncBuffersFromEngine(){const n=et()||Xa.activeCamera;if(n){this.pendingCam.rot.setFromQuaternion(n.quaternion);const t=Xa.sceneOffset;this.pendingCam.unified.set(t.x+t.xL+n.position.x,t.y+t.yL+n.position.y,t.z+t.zL+n.position.z),this.pendingCam.rotDirty=!1,this.pendingCam.unifiedDirty=!1}}interpolate(n,t){const o=n.keyframes;if(o.length===0)return 0;const s=o[0],i=o[o.length-1],r=n.id.startsWith("camera.rotation")||n.id.includes("rot")||n.id.includes("phase")||n.id.includes("twist");if(t>i.frame){const l=n.postBehavior||"Hold";if(l==="Hold")return i.value;if(l==="Continue"){let u=0;if(o.length>1){const m=o[o.length-2];i.interpolation==="Linear"?u=(i.value-m.value)/(i.frame-m.frame):i.interpolation==="Bezier"&&(i.leftTangent&&Math.abs(i.leftTangent.x)>.001?u=i.leftTangent.y/i.leftTangent.x:u=(i.value-m.value)/(i.frame-m.frame))}return i.value+u*(t-i.frame)}const c=i.frame-s.frame;if(c<=.001)return i.value;const d=t-s.frame,f=Math.floor(d/c),h=s.frame+d%c,p=this.evaluateCurveInternal(o,h,r);if(l==="Loop")return p;if(l==="PingPong"){if(f%2===1){const m=i.frame-d%c;return this.evaluateCurveInternal(o,m,r)}return p}if(l==="OffsetLoop"){const u=i.value-s.value;return p+u*f}}return t<s.frame?s.value:this.evaluateCurveInternal(o,t,r)}evaluateCurveInternal(n,t,o){for(let s=0;s<n.length-1;s++){const i=n[s],r=n[s+1];if(t>=i.frame&&t<=r.frame)return rt.interpolate(t,i,r,o)}return n[n.length-1].value}commitState(){if(this.pendingCam.unifiedDirty||this.pendingCam.rotDirty){Xa.shouldSnapCamera=!0;const n=new Oe().setFromEuler(this.pendingCam.rot),t={x:n.x,y:n.y,z:n.z,w:n.w},o=be.split(this.pendingCam.unified.x),s=be.split(this.pendingCam.unified.y),i=be.split(this.pendingCam.unified.z);Y.emit(me.CAMERA_TELEPORT,{position:{x:0,y:0,z:0},rotation:t,sceneOffset:{x:o.high,y:s.high,z:i.high,xL:o.low,yL:s.low,zL:i.low}}),this.fractalStore.setState({cameraRot:t})}}}const Ia=new ic,Eh=(e,n)=>{const t={};e.forEach(r=>t[r.id]=[]),n.forEach(r=>{t[r.source]&&t[r.source].push(r.target)});const o=new Set,s=new Set,i=r=>{if(!o.has(r)){o.add(r),s.add(r);const l=t[r]||[];for(const c of l)if(!o.has(c)&&i(c)||s.has(c))return!0}return s.delete(r),!1};for(const r of e)if(i(r.id))return!0;return!1},io=(e,n)=>{const t={},o={};e.forEach(r=>{t[r.id]=[],o[r.id]=0}),n.forEach(r=>{t[r.source]&&(t[r.source].push(r.target),o[r.target]=(o[r.target]||0)+1)});const s=[];e.forEach(r=>{o[r.id]===0&&s.push(r.id)});const i=[];for(;s.length>0;){s.sort();const r=s.shift(),l=e.find(c=>c.id===r);if(l){const{position:c,...d}=l;i.push(d)}if(t[r])for(const c of t[r])o[c]--,o[c]===0&&s.push(c)}return i},lo=e=>{const n=e.map((o,s)=>({...o,position:{x:250,y:150+s*200}})),t=[];if(n.length>0){t.push({id:`e-root-start-${n[0].id}`,source:"root-start",target:n[0].id});for(let o=0;o<n.length-1;o++)t.push({id:`e-${n[o].id}-${n[o+1].id}`,source:n[o].id,target:n[o+1].id});t.push({id:`e-${n[n.length-1].id}-root-end`,source:n[n.length-1].id,target:"root-end"})}return{nodes:n,edges:t}},lc=(e,n)=>{if(e.length!==n.length)return!1;for(let t=0;t<e.length;t++){const o=e[t],s=n[t];if(o.id!==s.id||o.type!==s.type||o.enabled!==s.enabled)return!1;const i=o.bindings||{},r=s.bindings||{},l=Object.keys(i).filter(h=>i[h]!==void 0),c=Object.keys(r).filter(h=>r[h]!==void 0);if(l.length!==c.length)return!1;for(const h of l)if(i[h]!==r[h])return!1;const d=o.condition||{active:!1,mod:0,rem:0},f=s.condition||{active:!1,mod:0,rem:0};if(d.active!==f.active||d.active&&(d.mod!==f.mod||d.rem!==f.rem))return!1}return!0},cc=(e,n)=>e.length!==n.length?!1:JSON.stringify(e)===JSON.stringify(n),Qe=ge(),F=er()(ar((e,n,t)=>({...Vs(e,n),...Ys(e,n),...oi(e,n),...ci(e,n),...Ll(e,n),...Gl(e,n),formula:"Mandelbulb",pipeline:Fn,pipelineRevision:1,graph:lo(Fn),projectSettings:{name:"Mandelbulb",version:0},lastSavedHash:null,animations:[],liveModulations:{},setFormula:(o,s={})=>{const i=n(),r=i.formula;if(r===o&&o!=="Modular")return;s.skipDefaultPreset||(n().resetParamHistory(),e({undoStack:[],redoStack:[]}));const l=i.projectSettings.name;let c=l;if((l===r||l==="Untitled"||l==="Custom Preset")&&(c=o),e({formula:o,projectSettings:{...i.projectSettings,name:c}}),Y.emit(me.CONFIG,{formula:o,pipeline:i.pipeline,graph:i.graph}),o!=="Modular"&&!s.skipDefaultPreset){const d=Re.get(o),f=d&&d.defaultPreset?JSON.parse(JSON.stringify(d.defaultPreset)):{formula:o};f.features||(f.features={});const h=n();if(oe.getEngineFeatures().forEach(u=>{const m=h[u.id];if(!m)return;const v=f.features[u.id]||{},y={},x=u.engineConfig.toggleParam;m[x]!==void 0&&v[x]===void 0&&(y[x]=m[x]),Object.entries(u.params).forEach(([g,b])=>{b.onUpdate==="compile"&&m[g]!==void 0&&v[g]===void 0&&(y[g]=m[g])}),f.features[u.id]||(f.features[u.id]={}),Object.assign(f.features[u.id],y)}),n().lockSceneOnSwitch){const u=n().getPreset(),m={...u.features||{}},v=f.features||{};v.coreMath&&(m.coreMath=v.coreMath),v.geometry&&(m.geometry=v.geometry);const y={...u,formula:o,features:m};n().loadPreset(y)}else n().loadPreset(f)}n().handleInteractionEnd()},setProjectSettings:o=>e(s=>{const i={...s.projectSettings,...o};return o.name&&o.name!==s.projectSettings.name?(i.version=0,{projectSettings:i,lastSavedHash:null}):{projectSettings:i}}),prepareExport:()=>{const o=n(),s=o.getPreset({includeScene:!0}),{version:i,name:r,...l}=s,c=JSON.stringify(l);if(o.lastSavedHash===null||o.projectSettings.version===0){const d=Math.max(1,o.projectSettings.version+1);return e({projectSettings:{...o.projectSettings,version:d},lastSavedHash:c}),d}if(o.lastSavedHash!==c){const d=o.projectSettings.version+1;return e({projectSettings:{...o.projectSettings,version:d},lastSavedHash:c}),d}return o.projectSettings.version},setAnimations:o=>{const s=n().animations,i=o.map(r=>{const l=s.find(c=>c.id===r.id);if(!l)return r;if(r.period!==l.period&&r.period>0){const c=performance.now()/1e3,d=(c/l.period+l.phase-c/r.period)%1;return{...r,phase:(d+1)%1}}return r});e({animations:i})},setLiveModulations:o=>e({liveModulations:o}),setGraph:o=>{const s=io(o.nodes,o.edges),i=n();if(lc(i.pipeline,s))cc(i.pipeline,s)?e({graph:o}):(e({graph:o,pipeline:s}),Y.emit(me.CONFIG,{pipeline:s}));else if(i.autoCompile){const r=i.pipelineRevision+1;e({graph:o,pipeline:s,pipelineRevision:r}),Y.emit(me.CONFIG,{pipeline:s,graph:o,pipelineRevision:r})}else e({graph:o})},setPipeline:o=>{const s=n().pipelineRevision+1,i=lo(o);e({pipeline:o,graph:i,pipelineRevision:s}),Y.emit(me.CONFIG,{pipeline:o,graph:i,pipelineRevision:s})},refreshPipeline:()=>{const o=n(),s=io(o.graph.nodes,o.graph.edges),i=o.pipelineRevision+1;e({pipeline:s,pipelineRevision:i}),Y.emit(me.CONFIG,{pipeline:s,graph:o.graph,pipelineRevision:i})},loadPreset:o=>{o._formulaDef&&!Re.get(o.formula)&&Re.register(o._formulaDef),n().resetParamHistory();const s=Re.get(o.formula),i=s?s.id:o.formula;e({formula:i}),Y.emit(me.CONFIG,{formula:i});let r=o.name;(!r||r==="Untitled"||r==="Custom Preset")&&(r=i),e({projectSettings:{name:r,version:0},lastSavedHash:null}),nc(o,e,n),setTimeout(()=>{const l=n().getPreset({includeScene:!0}),{version:c,name:d,...f}=l;e({lastSavedHash:JSON.stringify(f)})},50)},loadScene:({def:o,preset:s})=>{if(o&&(Re.get(o.id)||Re.register(o),Y.emit(me.REGISTER_FORMULA,{id:o.id,shader:o.shader})),n().loadPreset(s),!Qe.isBooted&&!Qe.bootSent)return;const i=Oa(n());Y.emit(me.CONFIG,i);const r=n().sceneOffset;if(r){const l={x:r.x,y:r.y,z:r.z,xL:r.xL??0,yL:r.yL??0,zL:r.zL??0};Qe.setShadowOffset(l),Qe.post({type:"OFFSET_SET",offset:l})}},getPreset:o=>{var l,c;const s=n(),i={version:s.projectSettings.version,name:s.projectSettings.name,formula:s.formula,features:{}};if((o==null?void 0:o.includeScene)!==!1){if(i.cameraPos={x:0,y:0,z:0},Qe.activeCamera&&Qe.virtualSpace){const d=Qe.virtualSpace.getUnifiedCameraState(Qe.activeCamera,s.targetDistance);i.cameraRot=d.rotation,i.sceneOffset=d.sceneOffset,i.targetDistance=d.targetDistance}else i.cameraRot=s.cameraRot,i.sceneOffset=s.sceneOffset,i.targetDistance=s.targetDistance;i.cameraMode=s.cameraMode,i.lights=[],i.renderMode=s.renderMode,i.quality={aaMode:s.aaMode,aaLevel:s.aaLevel,msaa:s.msaaSamples,accumulation:s.accumulation}}oe.getAll().forEach(d=>{const f=s[d.id];f&&(i.features||(i.features={}),i.features[d.id]=va(f))}),i.animations=s.animations,s.savedCameras.length>0&&(i.savedCameras=s.savedCameras.map(d=>({id:d.id,label:d.label,position:d.position,rotation:d.rotation,sceneOffset:d.sceneOffset,targetDistance:d.targetDistance,optics:d.optics}))),s.formula==="Modular"&&(i.graph=s.graph,i.pipeline=s.pipeline);try{const d=(c=(l=window.useAnimationStore)==null?void 0:l.getState)==null?void 0:c.call(l);d&&(i.sequence=d.sequence,i.duration=d.durationFrames)}catch(d){console.warn("Failed to save animation sequence:",d)}return i},getShareString:o=>{const s=n().getPreset({includeScene:!0}),i=n().advancedMode;return rc(s,i,o)}}))),gr=e=>e.isUserInteracting||e.interactionMode!=="none",gn=e=>{var t;if(e.isGizmoDragging||e.interactionMode!=="none"||e.isExporting||e.isBucketRendering)return!0;const n=oe.getAll();for(const o of n)if((t=o.interactionConfig)!=null&&t.blockCamera&&o.interactionConfig.activeParam){const s=e[o.id];if(s&&s[o.interactionConfig.activeParam])return!0}return!1},Oa=e=>{var o;const n={formula:e.formula,pipeline:e.pipeline,pipelineRevision:e.pipelineRevision,graph:e.graph,msaaSamples:e.msaaSamples,previewMode:e.previewMode,renderMode:e.renderMode,compilerHardCap:e.compilerHardCap,shadows:!0,quality:{...e.quality}};if(oe.getAll().forEach(s=>{const i=e[s.id];i&&(n[s.id]={...i})}),e.hardwareProfile){const s=e.hardwareProfile,i=n.quality;i&&(i.precisionMode=Math.max(i.precisionMode??0,s.caps.precisionMode),i.bufferPrecision=Math.max(i.bufferPrecision??0,s.caps.bufferPrecision),i.compilerHardCap=Math.min(i.compilerHardCap??500,s.caps.compilerHardCap)),n.compilerHardCap=((o=n.quality)==null?void 0:o.compilerHardCap)??n.compilerHardCap}return n};Hl(Oa);const dc=()=>{const e=F.getState();Ia.connect(window.useAnimationStore,F),Qe.isPaused=e.isPaused,Qe.setPreviewSampleCap(e.sampleCap),Qe.onBooted=()=>{const t=F.getState(),o=t.sceneOffset;if(o){const s={x:o.x,y:o.y,z:o.z,xL:o.xL??0,yL:o.yL??0,zL:o.zL??0};Qe.setShadowOffset(s),Qe.post({type:"OFFSET_SET",offset:s})}Qe.setPreviewSampleCap(t.sampleCap)},F.subscribe(t=>t.isPaused,t=>{Qe.isPaused=t}),F.subscribe(t=>t.sampleCap,t=>{Qe.setPreviewSampleCap(t)}),F.subscribe(t=>{var o;return(o=t.lighting)==null?void 0:o.renderMode},t=>{const o=t===1?"PathTracing":"Direct";F.getState().renderMode!==o&&F.setState({renderMode:o})});let n;F.subscribe(t=>{var o;return(o=t.optics)==null?void 0:o.camType},t=>{var i;if(t===void 0)return;const o=n!==void 0&&n<.5,s=t>.5&&t<1.5;if(o&&s){const r=F.getState();if(!r.activeCameraId){const l=((i=r.optics)==null?void 0:i.camFov)||60;let c=Qe.lastMeasuredDistance;(!c||c>=1e3||c<=0)&&(c=r.targetDistance||3.5);const d=c*Math.tan(l*Math.PI/360),f=r.setOptics;typeof f=="function"&&f({orthoScale:d})}}n=t}),Y.on(me.BUCKET_STATUS,({isRendering:t})=>{const o=F.getState();o.setIsBucketRendering(t),o.setIsExporting(t)})};typeof window<"u"&&(window.__store=F);const ct={frameCount:0,lastTime:performance.now(),ref:null,workerFrameCount:0};Ks(()=>{ct.workerFrameCount++});const uc=()=>{const e=performance.now();ct.frameCount++,e-ct.lastTime>=1e3&&(ct.ref&&(ct.ref.innerText=`${ct.workerFrameCount} FPS`),ct.frameCount=0,ct.workerFrameCount=0,ct.lastTime=e)},hc=()=>{const e=F(r=>r.isPaused),n=F(gr),t=le(r=>r.isCameraInteracting),o=le(r=>r.isScrubbing),s=e&&!n&&!t&&!o,i=w.useRef(null);return w.useEffect(()=>(ct.ref=i.current,()=>{ct.ref===i.current&&(ct.ref=null)}),[]),a.jsx("span",{ref:i,className:`text-[10px] font-mono w-12 text-right transition-colors duration-300 ${s?"text-gray-600":"text-cyan-500/80"}`,title:e?"Rendering Paused (Battery Saver)":"Frames Per Second",children:"-- FPS"})},Ye=e=>{var o;const n=new Set;let t=e;for(;t&&t!==document.body;)(o=t.dataset)!=null&&o.helpId&&t.dataset.helpId.split(/\s+/).forEach(i=>{i&&n.add(i)}),t=t.parentElement;return Array.from(n)},co=ge(),Za=(e,n,t,o)=>{if(n)return 0;const s=F.getState();s.geometry;const i=s.lighting;if(e.startsWith("camera.unified")){const l=et()||co.activeCamera,c=l?l.position:{x:0,y:0,z:0},d=qe.getUnifiedPosition(c,s.sceneOffset);if(e==="camera.unified.x")return d.x;if(e==="camera.unified.y")return d.y;if(e==="camera.unified.z")return d.z}if(e.startsWith("camera.rotation")){const l=et()||co.activeCamera;if(l){const c=new _e().setFromQuaternion(l.quaternion);if(e==="camera.rotation.x")return c.x;if(e==="camera.rotation.y")return c.y;if(e==="camera.rotation.z")return c.z}return 0}if(e.startsWith("lights.")||e.startsWith("lighting.")){const l=e.match(/lighting\.light(\d+)_(\w+)/);if(l){const c=parseInt(l[1]),d=l[2],f=kt(i,c);if(f){if(d==="intensity")return f.intensity;if(d==="falloff")return f.falloff;if(d==="posX")return f.position.x;if(d==="posY")return f.position.y;if(d==="posZ")return f.position.z}}}if(e.includes(".")){const l=e.split("."),c=l[0],d=l[1];if(oe.get(c)){const f=s[c];if(f){if(f[d]!==void 0){const p=f[d];if(typeof p=="boolean")return p?1:0;if(typeof p=="number")return p}const h=d.match(/^(.+)_(x|y|z)$/);if(h){const p=h[1],u=h[2],m=f[p];if(m&&typeof m=="object"&&u in m)return m[u]}}}}const r=s.coreMath;if(r){if(e==="paramA")return r.paramA;if(e==="paramB")return r.paramB;if(e==="paramC")return r.paramC;if(e==="paramD")return r.paramD;if(e==="paramE")return r.paramE;if(e==="paramF")return r.paramF;if(e==="iterations")return r.iterations}return 0},st=(e,n,t)=>{if(e.length===0)return 0;if(n<=e[0].frame)return e[0].value;if(n>=e[e.length-1].frame)return e[e.length-1].value;for(let o=0;o<e.length-1;o++){const s=e[o],i=e[o+1];if(n>=s.frame&&n<i.frame)return rt.interpolate(n,s,i,t)}return e[0].value},Lh=(e,n,t)=>{if(!e)return{angle:0,length:0};const o=t?-e.x:e.x,s=t?-e.y:e.y,i=Math.atan2(s,o)*(180/Math.PI);let r=0;return n&&Math.abs(n)>1e-9?r=Math.abs(e.x)/Math.abs(n)*100:r=Math.abs(e.x)*10,{angle:i,length:r}},Nh=(e,n,t,o)=>{const i=Math.max(-89.9,Math.min(89.9,n))*(Math.PI/180),r=Math.abs(o)<1e-4?10:Math.abs(o),l=(e?-1:1)*(t/100)*r,c=Math.abs(l)*Math.tan(i)*(e?-1:1);return{x:l,y:c}},Dh=rt.constrainHandles,_h=rt.calculateSoftFalloff,Fh=rt.scaleHandles,Ah=(e,n)=>{const t=[],o=Math.PI*2;return e.forEach(s=>{const i=n.tracks[s],r=/rotation|rot|phase|twist/i.test(s)||/param[C-F]/i.test(s);if(i&&i.keyframes.length>1&&r){const l=[...i.keyframes].sort((f,h)=>f.frame-h.frame),d=[...l.map(f=>f.value)];for(let f=1;f<d.length;f++){let h=d[f]-d[f-1];h-=Math.round(h/o)*o,d[f]=d[f-1]+h}l.forEach((f,h)=>{Math.abs(f.value-d[h])>1e-4&&t.push({trackId:s,keyId:f.id,patch:{value:d[h]}})})}}),t},zh=(e,n,t,o=1,s,i=.5,r=.6)=>{const l=[],c=t.length>0,d=new Set(t),f=o<0,h=Math.abs(o);if(h===0)return s&&e.forEach(y=>{const x=s.tracks[y],g=n.tracks[y];!x||!g||x.keyframes.forEach(b=>{const M=g.keyframes.find(j=>j.id===b.id);M&&(!c||d.has(`${y}::${b.id}`))&&Math.abs(M.value-b.value)>1e-9&&l.push({trackId:y,keyId:b.id,patch:{value:b.value}})})}),l;const p=s||n,u=Math.max(.1,h/2.5),m=2*u*u,v=Math.ceil(h);return e.forEach(y=>{const x=p.tracks[y];if(!x||x.keyframes.length<2)return;const g=/rotation|rot|phase|twist/i.test(y)||/param[C-F]/i.test(y),b=[...x.keyframes].sort((j,C)=>j.frame-C.frame);if(f){const j=Math.min(h,5)/5,C=i*(1-j*.9),S=r*(1-j*.8);let k=b[0].value,P=0;const I=b[0].frame,N=b[b.length-1].frame;let L=st(b,I+1,g)-k;g&&(L>Math.PI?L-=Math.PI*2:L<-Math.PI&&(L+=Math.PI*2)),P=L;for(let D=I;D<=N;D++){let A=st(b,D,g);if(g){const q=A-k;q>Math.PI?A-=Math.PI*2:q<-Math.PI&&(A+=Math.PI*2)}const R=(A-k)*C,$=-P*S,O=R+$;P+=O,k+=P;const H=b.find(q=>Math.abs(q.frame-D)<.1);if(H)if(!c||d.has(`${y}::${H.id}`))l.push({trackId:y,keyId:H.id,patch:{value:k}});else{k=H.value;let _=st(b,D+1,g)-k;g&&(_>Math.PI?_-=Math.PI*2:_<-Math.PI&&(_+=Math.PI*2)),P=_}}return}let M=[];if(c){let j=[];b.forEach((C,S)=>{d.has(`${y}::${C.id}`)?j.push(S):j.length>0&&(M.push(j),j=[])}),j.length>0&&M.push(j)}else M.push(b.map((j,C)=>C));M.forEach(j=>{const C=S=>S<0?b[0].value:S>=b.length?b[b.length-1].value:b[S].value;for(let S=0;S<j.length;S++){const k=j[S],P=b[k];let I=0,N=0;for(let T=-v;T<=v;T++){const L=k+T,D=Math.exp(-(T*T)/m);let A=C(L);N+=A*D,I+=D}if(I>0){let T=N/I;const L=n.tracks[y],D=L?L.keyframes.find(A=>A.id===P.id):null;D&&Math.abs(T-D.value)>1e-9&&l.push({trackId:y,keyId:P.id,patch:{value:T}})}}})}),l},Oh=(e,n,t=1)=>{const o=[];return e.forEach(s=>{const i=n.tracks[s];if(!i||i.keyframes.length===0)return;const r=[...i.keyframes].sort((h,p)=>h.frame-p.frame),l=Math.ceil(r[0].frame),c=Math.floor(r[r.length-1].frame),d=s.startsWith("camera.rotation"),f=[];for(let h=l;h<=c;h+=t){const p=st(r,h,d);f.push({id:ot(),frame:h,value:p,interpolation:"Linear",autoTangent:!1,brokenTangents:!1})}f.length>0&&o.push({trackId:s,newKeys:f})}),o},fc=(e,n,t)=>{const{sequence:o,currentFrame:s,addTrack:i,addKeyframe:r,removeKeyframe:l,isRecording:c,snapshot:d}=le(),f=(()=>{if(!e||!o.tracks[e])return"none";const m=o.tracks[e],v=m.keyframes.find(y=>Math.abs(y.frame-s)<.1);if(v)return Math.abs(v.value-n)>1e-4?"keyed-dirty":"keyed";{const y=/rotation|rot|phase|twist/i.test(e)||/param[C-F]/i.test(e),x=st(m.keyframes,s,y);return Math.abs(x-n)>.001?"dirty":"partial"}})();return{status:f,toggleKey:()=>{if(e){if(d(),f==="keyed"){const m=o.tracks[e].keyframes.find(v=>Math.abs(v.frame-s)<.1);m&&l(e,m.id)}else o.tracks[e]||i(e,t),r(e,s,n);Y.emit(me.TRACK_FOCUS,e)}},autoKeyOnChange:m=>{e&&c&&(o.tracks[e]||i(e,t),r(e,s,m))},autoKeyOnDragStart:()=>{e&&c&&(d(),Y.emit(me.TRACK_FOCUS,e))}}},Xt=({status:e,onClick:n,className:t=""})=>a.jsx("button",{onClick:o=>{o.stopPropagation(),n()},tabIndex:-1,className:`p-0.5 rounded hover:bg-white/10 transition-colors shrink-0 ${e==="keyed"?"text-amber-400":e==="keyed-dirty"||e==="dirty"?"text-red-500":e==="partial"?"text-orange-500 hover:text-amber-300":"text-gray-600 hover:text-amber-200"} ${t}`,title:e==="none"?"Add Keyframe":e==="dirty"?"Add Key (Value mismatch)":e==="keyed-dirty"?"Update Key (Value changed)":e==="partial"?"Add Key (Track exists)":"Remove Key",children:a.jsx(Wr,{status:e})}),xr=({value:e,onChange:n,step:t,min:o,max:s,hardMin:i,hardMax:r,highlight:l,overrideText:c,onDragStart:d,onDragEnd:f,sensitivity:h=1,disabled:p=!1})=>a.jsx(kn,{value:e,onChange:n,onDragStart:d,onDragEnd:f,step:t,min:o,max:s,hardMin:i,hardMax:r,variant:"minimal",disabled:p,highlight:l,overrideText:c,showTrack:!1}),vt=e=>{const{handleInteractionStart:n,handleInteractionEnd:t}=F();return a.jsx(xr,{...e,onDragStart:()=>{n("param"),e.onDragStart&&e.onDragStart()},onDragEnd:()=>{t(),e.onDragEnd&&e.onDragEnd()}})},fe=({trackId:e,onKeyToggle:n,defaultValue:t,overrideInputText:o,dataHelpId:s,onChange:i,...r})=>{var C,S,k;const{openContextMenu:l,handleInteractionStart:c,handleInteractionEnd:d}=F(),{status:f,toggleKey:h,autoKeyOnChange:p,autoKeyOnDragStart:u}=fc(e,r.value??0,r.label),m=[];e&&m.push(e),s&&m.push(s),m.push("ui.slider");const v=m.join(" "),y=P=>{if(r.disabled)return;P.preventDefault(),P.stopPropagation();const I=[];t!==void 0&&I.push({label:"Reset to Default",action:()=>{c("param"),e&&u(),i(t),p(t),d()}});const N=Ye(P.currentTarget);l(P.clientX,P.clientY,I,N)},x=P=>{i(P),p(P)},g=()=>{c("param"),u(),r.onDragStart&&r.onDragStart()},b=()=>{d(),r.onDragEnd&&r.onDragEnd()},M=e&&!r.disabled?a.jsx(Xt,{status:f,onClick:()=>{h(),n&&n()}}):void 0;t!==void 0&&!r.disabled&&(a.Fragment,((r.customMapping?r.customMapping.toSlider(t):t)-(((C=r.customMapping)==null?void 0:C.min)??r.min??0))/((((S=r.customMapping)==null?void 0:S.max)??r.max??1)-(((k=r.customMapping)==null?void 0:k.min)??r.min??0))*100,`${t}`);const j=Ue.useMemo(()=>{if(r.customMapping)return{toDisplay:r.customMapping.toSlider,fromDisplay:r.customMapping.fromSlider,format:Uo,parseInput:P=>{const I=parseFloat(P);return isNaN(I)?null:I}}},[r.customMapping]);return a.jsx(kn,{label:r.label,value:r.value,onChange:x,onDragStart:g,onDragEnd:b,step:r.step??.01,min:r.min,max:r.max,hardMin:r.hardMin,hardMax:r.hardMax,mapping:j,format:o?()=>o:void 0,mapTextInput:r.mapTextInput,variant:"full",showTrack:!0,trackPosition:"below",disabled:r.disabled,highlight:r.highlight||f!=="none",liveValue:r.liveValue,showLiveIndicator:!0,headerRight:M,labelSuffix:r.labelSuffix,onContextMenu:y,dataHelpId:v,className:r.className,defaultValue:t,onReset:()=>{c("param"),e&&u(),i(t),p(t),d()}})};function Ke({label:e,value:n,onChange:t,options:o,helpId:s,color:i="bg-cyan-600",onLfoToggle:r,isLfoActive:l,icon:c,disabled:d=!1,variant:f="default",labelSuffix:h}){const{openContextMenu:p,handleInteractionStart:u,handleInteractionEnd:m}=F(),v=x=>{if(d)return;const g=Ye(x.currentTarget);g.length>0&&(x.preventDefault(),x.stopPropagation(),p(x.clientX,x.clientY,[],g))},y=x=>{u("param"),t(x),m()};return a.jsx(Vr,{label:e,value:n,onChange:y,options:o,color:i,onLfoToggle:r,isLfoActive:l,icon:c,disabled:d,variant:f,labelSuffix:h,"data-help-id":s,onContextMenu:v})}const pc={center:{container:"left-1/2 -translate-x-1/2",arrow:"left-1/2 -translate-x-1/2"},start:{container:"left-0",arrow:"left-4"},end:{container:"right-0",arrow:"right-4"}},Tt=({children:e,align:n="center",width:t="w-52",className:o="",onClose:s,arrow:i=!0})=>{const r=w.useRef(null);w.useEffect(()=>{if(!s)return;const c=f=>{r.current&&!r.current.contains(f.target)&&s()},d=setTimeout(()=>document.addEventListener("mousedown",c),0);return()=>{clearTimeout(d),document.removeEventListener("mousedown",c)}},[s]);const l=pc[n];return a.jsxs("div",{ref:r,className:`absolute top-full mt-3 ${l.container} ${t} bg-black border border-white/20 rounded-xl p-3 shadow-2xl z-[70] animate-fade-in ${o}`,onClick:c=>c.stopPropagation(),children:[i&&a.jsx("div",{className:`absolute -top-1.5 ${l.arrow} w-3 h-3 bg-black border-t border-l border-white/20 transform rotate-45`}),e]})},Jt=ge();function mc(e,n,t){const o=Math.floor(e*t),s=Math.floor(n*t),i=o*s,r=i*16,l=i*32,d=(t>1?e*n:i)*8*1.33,f=i*4;return(r+l+d+f)/(1024*1024)}const gc=()=>{const e=F(),[n,t]=w.useState(0);w.useEffect(()=>Y.on(me.BUCKET_STATUS,r=>{t(r.progress)}),[]);const o=w.useMemo(()=>{const r=e.dpr||1,[l,c]=e.resolutionMode==="Fixed"?[Math.floor(e.fixedResolution[0]*r),Math.floor(e.fixedResolution[1]*r)]:e.canvasPixelSize,d=e.bucketUpscale,f=Math.floor(l*d),h=Math.floor(c*d),p=mc(l,c,d);return{outW:f,outH:h,mb:p}},[e.canvasPixelSize,e.bucketUpscale,e.resolutionMode,e.fixedResolution,e.dpr]),s=()=>{e.handleInteractionStart("param"),e.isBucketRendering?Jt.stopBucketRender():(e.setBucketUpscale(1),Jt.startBucketRender(!1,{bucketSize:e.bucketSize,bucketUpscale:1,convergenceThreshold:e.convergenceThreshold,accumulation:e.accumulation,samplesPerBucket:e.samplesPerBucket})),e.handleInteractionEnd()},i=()=>{if(e.handleInteractionStart("param"),e.isBucketRendering)Jt.stopBucketRender();else{const r=e.getPreset({includeScene:!0}),l=e.prepareExport();Jt.startBucketRender(!0,{bucketSize:e.bucketSize,bucketUpscale:e.bucketUpscale,convergenceThreshold:e.convergenceThreshold,accumulation:e.accumulation,samplesPerBucket:e.samplesPerBucket},{preset:r,name:e.projectSettings.name,version:l})}e.handleInteractionEnd()};return a.jsx(Tt,{width:"w-72",children:a.jsxs("div",{className:"relative space-y-3","data-help-id":"bucket.render",children:[a.jsxs("div",{className:"flex items-center justify-between border-b border-white/10 pb-2",children:[a.jsx("span",{className:"text-[10px] font-bold text-gray-400",children:"High Quality Render"}),e.isBucketRendering&&a.jsx("button",{onClick:()=>Jt.stopBucketRender(),className:"text-[9px] font-bold px-2 py-0.5 rounded border border-red-500/50 bg-red-500/20 text-red-300 animate-pulse",children:"Stop"})]}),e.isBucketRendering?a.jsxs("div",{className:"bg-white/5 rounded p-2 mb-2",children:[a.jsxs("div",{className:"flex justify-between text-[9px] text-gray-400 mb-1",children:[a.jsx("span",{children:"Progress"}),a.jsxs("span",{children:[n.toFixed(1),"%"]})]}),a.jsx("div",{className:"w-full h-1.5 bg-black rounded-full overflow-hidden",children:a.jsx("div",{className:"h-full bg-cyan-500 transition-all duration-300 ease-linear",style:{width:`${n}%`}})})]}):a.jsxs("div",{className:"flex gap-2 mb-2",children:[a.jsxs("button",{onClick:s,className:"flex-1 py-2 rounded bg-gray-800 hover:bg-white/10 border border-white/10 text-[9px] font-bold text-gray-300 transition-all hover:border-cyan-500/50 hover:text-cyan-400 flex flex-col items-center gap-1",title:"Refine Viewport (1x)",children:[a.jsx(Pt,{}),a.jsx("span",{children:"Refine View"})]}),a.jsxs("button",{onClick:i,className:"flex-1 py-2 rounded bg-cyan-900/30 hover:bg-cyan-800/50 border border-cyan-500/30 text-[9px] font-bold text-cyan-300 transition-all hover:border-cyan-400 flex flex-col items-center gap-1",title:"Render & Save Image",children:[a.jsx(Wo,{}),a.jsx("span",{children:"Export Image"})]})]}),a.jsxs("div",{className:`space-y-1 transition-opacity ${e.isBucketRendering?"opacity-50 pointer-events-none":"opacity-100"}`,children:[a.jsx(fe,{label:"Convergence Threshold",value:e.convergenceThreshold,min:.01,max:1,step:.01,onChange:e.setConvergenceThreshold,customMapping:{min:0,max:100,toSlider:r=>(Math.log10(r)+2)/2*100,fromSlider:r=>Math.pow(10,r/100*2-2)},overrideInputText:`${e.convergenceThreshold.toFixed(2)}%`}),a.jsx("p",{className:"text-[8px] text-gray-500 -mt-1 px-1 mb-2",children:"Lower = more samples, higher quality. 0.1%=production, 1%=fast"}),a.jsx(fe,{label:"Max Samples Per Bucket",value:e.samplesPerBucket,min:16,max:1024,step:16,onChange:e.setSamplesPerBucket,overrideInputText:`${e.samplesPerBucket} max`,highlight:e.samplesPerBucket>=256}),a.jsx("p",{className:"text-[8px] text-gray-500 -mt-1 px-1 mb-2",children:"Safety limit. Tiles stop early if converged."}),a.jsxs("div",{className:"pt-2 border-t border-white/5",children:[a.jsx(fe,{label:"Export Scale",value:e.bucketUpscale,min:1,max:8,step:.5,onChange:e.setBucketUpscale,overrideInputText:`${e.bucketUpscale}x`,highlight:e.bucketUpscale>1}),a.jsx("p",{className:"text-[8px] text-gray-500 -mt-1 px-1 mb-1",children:"Resolution multiplier. 2x = 4K from 1080p, 4x = 8K, 8x = 10K+"}),a.jsxs("div",{className:`text-[8px] px-1 mb-2 ${o.mb>1500?"text-red-400":o.mb>500?"text-yellow-400":"text-gray-500"}`,children:[o.outW,"x",o.outH," · ~",o.mb<1024?`${Math.round(o.mb)} MB`:`${(o.mb/1024).toFixed(1)} GB`," VRAM",o.mb>1500&&" (may exceed GPU memory)"]}),a.jsx("label",{className:"text-[9px] font-bold text-gray-400 block mb-1",children:"Bucket Size"}),a.jsx(Ke,{value:e.bucketSize,onChange:e.setBucketSize,options:[{label:"64",value:64},{label:"128",value:128},{label:"256",value:256},{label:"512",value:512}]}),a.jsx("p",{className:"text-[8px] text-gray-500 mt-1 px-1",children:"Smaller = less memory, larger = faster"})]})]})]})})},xt="text-purple-400",uo="bg-purple-900/30 border-purple-500/30",xc=()=>{const e=F(R=>R.scalability),n=F(R=>R.applyScalabilityPreset),t=F(R=>R.setSubsystemTier),o=F(R=>R.setLighting),s=F(R=>R.advancedMode),i=F(R=>{var $;return(($=R.lighting)==null?void 0:$.ptEnabled)??!1}),r=F(R=>{var $;return(($=R.lighting)==null?void 0:$.renderMode)??0}),l=i&&r===1,c=F(R=>{var $;return(($=R.lighting)==null?void 0:$.ptBounces)??3}),d=F(R=>{var $;return(($=R.lighting)==null?void 0:$.ptGIStrength)??1}),f=F(R=>{var $;return(($=R.lighting)==null?void 0:$.ptNEEAllLights)??!1}),h=F(R=>{var $;return(($=R.lighting)==null?void 0:$.ptEnvNEE)??!1}),[p,u]=w.useState(!1),m=w.useRef(null),[v,y]=w.useState(null),[x,g]=w.useState(null),[b,M]=w.useState(null),j=v??e.subsystems,C=v!==null||b!==null,S=(b==null?void 0:b.ptNEEAllLights)??f,k=(b==null?void 0:b.ptEnvNEE)??h,P=w.useMemo(()=>hn(j),[j]),I=hr(e);w.useEffect(()=>{if(!p)return;const R=$=>{m.current&&!m.current.contains($.target)&&(u(!1),y(null),g(null),M(null))};return window.addEventListener("mousedown",R),()=>window.removeEventListener("mousedown",R)},[p]);const N=R=>{const $=It.find(O=>O.id===R);$&&(y({...$.subsystems}),g(R))},T=(R,$)=>{const O=v??{...e.subsystems};y({...O,[R]:$}),g(null)},L=(R,$)=>{const O=b??{},H=!$;if(H===(R==="ptNEEAllLights"?f:h)){const _={...O};delete _[R],M(Object.keys(_).length>0?_:null)}else M({...O,[R]:H})},D=()=>{C&&(Y.emit("is_compiling","Recompiling Shader..."),setTimeout(()=>{if(v)if(x)n(x);else for(const[R,$]of Object.entries(v))t(R,$);b&&o&&o(b),y(null),g(null),M(null),u(!1)},50))},A=x??(()=>{if(!v)return e.activePreset;for(const R of It)if(Object.keys(R.subsystems).every($=>R.subsystems[$]===j[$]))return R.id;return null})();return a.jsxs("div",{className:"relative",ref:m,children:[a.jsxs("button",{onClick:()=>u(!p),className:`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${C?"text-amber-300 bg-amber-900/30 border border-amber-500/30":"text-cyan-300 bg-cyan-900/20 border border-cyan-500/20 hover:bg-cyan-900/40"}`,title:"Viewport Quality",children:[a.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",children:a.jsx("path",{d:"M13 2L3 14h9l-1 8 10-12h-9l1-8z"})}),a.jsx("span",{children:C?"Pending...":I}),a.jsx("svg",{width:"8",height:"8",viewBox:"0 0 24 24",fill:"currentColor",className:"opacity-50",children:a.jsx("path",{d:"M7 10l5 5 5-5z"})})]}),p&&a.jsx(Tt,{width:"w-64",align:"center",children:a.jsxs("div",{className:"space-y-3",children:[a.jsxs("div",{children:[a.jsx("div",{className:"text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5",children:"Viewport Quality"}),a.jsx("div",{className:"space-y-1",children:It.filter(R=>!R.isAdvanced||s).map(R=>{const $=hn(R.subsystems),O=A===R.id;return a.jsxs("button",{onClick:()=>N(R.id),className:`w-full flex items-center justify-between px-2 py-1 rounded text-[10px] transition-colors ${O?"bg-cyan-900/40 text-cyan-300 border border-cyan-500/30":"text-gray-400 hover:bg-white/5 hover:text-white"}`,children:[a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsx("div",{className:`w-2 h-2 rounded-full ${O?"bg-cyan-400":"bg-gray-700"}`}),a.jsx("span",{className:"font-semibold",children:R.label}),R.id==="preview"&&a.jsx("span",{className:"text-amber-400/70 text-[8px] font-normal ml-1",children:"lighting disabled"})]}),a.jsxs("span",{className:"text-gray-600 text-[9px]",children:["~",($/1e3).toFixed(0),"s"]})]},R.id)})})]}),a.jsxs("div",{children:[a.jsx("div",{className:"text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5",children:"Per Subsystem"}),a.jsx("div",{className:"space-y-1",children:za.filter(R=>!R.isAdvanced||s).map(R=>{const $=j[R.id]??0,O=l&&R.renderContext==="direct";return a.jsxs("div",{className:`flex items-center justify-between px-2 transition-opacity ${O?"opacity-35":""}`,children:[a.jsx("span",{className:`text-[10px] ${O?"text-gray-600":"text-gray-400"}`,children:R.label}),a.jsx("select",{value:$,onChange:H=>T(R.id,parseInt(H.target.value)),className:`bg-gray-900 border border-white/10 rounded px-1.5 py-0.5 text-[10px] outline-none cursor-pointer ${O?"text-gray-600":"text-white focus:border-cyan-500"}`,children:R.tiers.map((H,q)=>a.jsx("option",{value:q,children:H.label},q))})]},R.id)})})]}),l&&a.jsxs("div",{children:[a.jsx("div",{className:`text-[9px] font-bold ${xt} uppercase tracking-wider mb-1.5`,children:"Path Tracer"}),a.jsxs("div",{className:"space-y-1.5",children:[a.jsxs("div",{className:"flex items-center justify-between px-2",children:[a.jsx("span",{className:`text-[10px] ${xt}`,children:"Max Bounces"}),a.jsxs("div",{className:"flex items-center gap-1.5",children:[a.jsx("input",{type:"range",min:1,max:8,step:1,value:c,onChange:R=>o==null?void 0:o({ptBounces:parseInt(R.target.value)}),className:"w-16 h-1 accent-purple-400 cursor-pointer"}),a.jsx("span",{className:`text-[10px] ${xt} font-mono w-3 text-right`,children:c})]})]}),a.jsxs("div",{className:"flex items-center justify-between px-2",children:[a.jsx("span",{className:`text-[10px] ${xt}`,children:"GI Strength"}),a.jsxs("div",{className:"flex items-center gap-1.5",children:[a.jsx("input",{type:"range",min:0,max:5,step:.05,value:d,onChange:R=>o==null?void 0:o({ptGIStrength:parseFloat(R.target.value)}),className:"w-16 h-1 accent-purple-400 cursor-pointer"}),a.jsx("span",{className:`text-[10px] ${xt} font-mono w-7 text-right`,children:d.toFixed(2)})]})]}),a.jsxs("div",{className:"flex items-center justify-between px-2",children:[a.jsx("span",{className:`text-[10px] ${xt}`,children:"Sample All Lights"}),a.jsx("button",{onClick:()=>L("ptNEEAllLights",S),className:`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors ${S?`${uo} ${xt}`:"border-white/10 text-gray-600 hover:text-gray-400"}`,children:S?"On":"Off"})]}),a.jsxs("div",{className:"flex items-center justify-between px-2",children:[a.jsx("span",{className:`text-[10px] ${xt}`,children:"Environment NEE"}),a.jsx("button",{onClick:()=>L("ptEnvNEE",k),className:`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors ${k?`${uo} ${xt}`:"border-white/10 text-gray-600 hover:text-gray-400"}`,children:k?"On":"Off"})]})]})]}),a.jsxs("div",{className:"flex items-center justify-between pt-2 border-t border-white/10",children:[a.jsxs("span",{className:"text-[9px] text-gray-500",children:["Est. ~",(P/1e3).toFixed(1),"s"]}),a.jsx("button",{onClick:D,disabled:!C,className:`px-3 py-1 rounded text-[10px] font-bold transition-colors ${C?"bg-cyan-600 hover:bg-cyan-500 text-white":"bg-gray-800 text-gray-600 cursor-not-allowed"}`,children:"Apply"})]})]})})]})},bc=ge(),yc=({isMobileMode:e,vibrate:n})=>{const t=F(),o=le($=>$.isPlaying),{handleInteractionStart:s,handleInteractionEnd:i,openContextMenu:r}=F(),l=F(gr),c=le($=>$.isCameraInteracting),d=le($=>$.isScrubbing),f=t.isPaused&&!c&&!l&&!d,[h,p]=w.useState(!1),[u,m]=w.useState(!1),[v,y]=w.useState(!1),x=w.useRef(null),g=w.useRef(null),b=w.useRef(null),M=w.useRef(null),[j,C]=w.useState(t.projectSettings.name),[S,k]=w.useState(t.projectSettings.version);w.useEffect(()=>{u&&(C(t.projectSettings.name),k(t.projectSettings.version))},[u,t.projectSettings]),w.useEffect(()=>{const $=O=>{x.current&&!x.current.contains(O.target)&&!t.isBucketRendering&&p(!1),b.current&&!b.current.contains(O.target)&&m(!1)};return(h||u)&&window.addEventListener("mousedown",$),()=>window.removeEventListener("mousedown",$)},[h,u]);const P=()=>{if(n(5),t.renderRegion){t.setRenderRegion(null);return}t.interactionMode==="selecting_region"?t.setInteractionMode("none"):t.setInteractionMode("selecting_region")},I=t.lighting,N=(I==null?void 0:I.ptEnabled)!==!1,T=async()=>{N&&(n(5),s("param"),Y.emit("is_compiling","Loading Material..."),await new Promise($=>setTimeout($,50)),t.setRenderMode(t.renderMode==="PathTracing"?"Direct":"PathTracing"),i())},L=()=>{t.setProjectSettings({name:j,version:S}),m(!1)},D=()=>{n(5);const $=F.getState().isPaused;t.setIsPaused(!$),bc.markInteraction()},A=()=>{M.current&&clearTimeout(M.current),y(!0)},R=()=>{M.current=window.setTimeout(()=>{y(!1)},300)};return a.jsxs("div",{className:"flex items-center gap-3",children:[a.jsxs("div",{className:"flex flex-col leading-none relative",children:[a.jsxs("span",{className:"text-xl font-bold tracking-tighter text-white",children:["G",a.jsx("span",{className:"text-cyan-400",children:"M"}),"T"]}),a.jsx("button",{onClick:()=>m(!0),className:"text-[8px] font-mono text-gray-500 hover:text-cyan-300 transition-colors text-left truncate max-w-[120px]",title:"Click to Rename Project",children:t.projectSettings.name}),u&&a.jsx(Tt,{width:"w-48",align:"start",arrow:!1,onClose:()=>m(!1),children:a.jsxs("div",{className:"space-y-3",children:[a.jsxs("div",{children:[a.jsx("label",{className:"text-[9px] text-gray-500 font-bold block mb-1",children:"Project Name"}),a.jsx("input",{type:"text",value:j,onChange:$=>C($.target.value),className:"w-full bg-gray-900 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500",placeholder:"Enter name...",autoFocus:!0})]}),a.jsxs("div",{className:"flex gap-2",children:[a.jsxs("div",{className:"flex-1",children:[a.jsx("label",{className:"text-[9px] text-gray-500 font-bold block mb-1",children:"Ver"}),a.jsx("div",{className:"h-6 bg-gray-900 border border-white/10 rounded overflow-hidden",children:a.jsx(vt,{value:S,onChange:$=>k(Math.max(1,Math.round($))),step:1,min:1,max:99})})]}),a.jsx("button",{onClick:L,className:"flex-1 bg-cyan-900/40 hover:bg-cyan-800 text-cyan-300 border border-cyan-500/30 rounded flex items-center justify-center mt-3.5",title:"Save Settings",children:a.jsx(Pt,{})})]})]})})]}),a.jsx("div",{className:"h-6 w-px bg-white/10"}),a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsx(hc,{}),!e&&a.jsxs("div",{className:"relative",onMouseEnter:A,onMouseLeave:R,ref:g,children:[a.jsx("button",{onClick:D,className:`p-0.5 rounded transition-colors ${f?"text-amber-400 bg-amber-900/30 border border-amber-500/30":"text-gray-600 hover:text-gray-400"}`,title:t.isPaused?"Resume Rendering":"Pause Rendering (Battery Saver)",children:f?a.jsx(qr,{}):a.jsx(Yr,{})}),v&&a.jsx(Tt,{width:"w-40",children:a.jsxs("div",{className:"mb-1",children:[a.jsx(fe,{label:"Auto-Stop (Samples)",value:t.sampleCap,min:0,max:4096,step:32,onChange:t.setSampleCap,overrideInputText:t.sampleCap===0?"Infinite":t.sampleCap.toFixed(0)}),a.jsx("div",{className:"text-[8px] text-gray-500 text-center mt-1",children:"0 = Never Stop"})]})})]}),a.jsx("div",{className:"h-6 w-px bg-white/10"}),a.jsx(xc,{}),a.jsx("button",{onClick:T,disabled:!N,className:`p-0.5 rounded transition-colors ${N?t.renderMode==="PathTracing"?"text-purple-400 bg-purple-900/30":"text-gray-600 hover:text-gray-400":"text-gray-700 cursor-not-allowed opacity-50"}`,title:N?e?"Enable Path Tracer (Experimental)":"Path Tracer (Global Illumination)":"Path Tracing disabled",children:a.jsx(Xr,{})}),o&&a.jsxs("div",{className:"flex items-center gap-1.5 px-2 py-0.5 bg-green-900/30 border border-green-500/30 rounded text-[9px] font-bold text-green-400 animate-pulse",children:[a.jsx("svg",{width:"8",height:"8",viewBox:"0 0 24 24",fill:"currentColor",children:a.jsx("path",{d:"M8 5v14l11-7z"})}),a.jsx("span",{children:"Playing"})]}),!e&&a.jsxs(a.Fragment,{children:[a.jsx("button",{onClick:P,className:`p-0.5 rounded transition-colors ${t.interactionMode==="selecting_region"?"text-cyan-400 bg-cyan-900/30 border border-cyan-500/30":t.renderRegion?"text-green-400 bg-green-900/30 border border-green-500/30":"text-gray-600 hover:text-gray-400"}`,title:t.renderRegion?"Clear Region":t.interactionMode==="selecting_region"?"Cancel Selection":"Select Region",children:t.renderRegion?a.jsx(Zr,{}):a.jsx(Vo,{})}),a.jsxs("div",{className:"relative",ref:x,children:[a.jsx("button",{onClick:$=>{$.stopPropagation(),n(5),p(!h)},className:`bucket-toggle-btn p-0.5 rounded transition-colors ${t.isBucketRendering?"text-cyan-400 bg-cyan-900/30 border border-cyan-500/30 animate-pulse":"text-gray-600 hover:text-gray-400"}`,title:"Render!",children:a.jsx(Qr,{})}),h&&a.jsx(gc,{})]})]})]})]})};let Pa=[];const ea=e=>{const n=e.toUpperCase();Pa=[n,...Pa.filter(t=>t!==n)].slice(0,3)},$a=({color:e,onColorChange:n})=>{const[t,o]=w.useState(()=>{const x=yt(e);return x?da(x):{h:0,s:0,v:100}}),s=w.useRef(e.toUpperCase()),{openContextMenu:i,handleInteractionStart:r,handleInteractionEnd:l}=F();w.useEffect(()=>{if(e.toUpperCase()!==s.current){const x=yt(e);if(x){const g=da(x);o(g),s.current=e.toUpperCase()}}},[e]);const c=x=>{const g={...t,...x};o(g);const b=aa(ua(g.h,g.s,g.v));s.current=b,n(b)},d=()=>{ea(s.current)},f="linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",h=w.useMemo(()=>`linear-gradient(to right, ${aa(ua(t.h,0,t.v))}, ${aa(ua(t.h,100,t.v))})`,[t.h,t.v]),p=w.useMemo(()=>`linear-gradient(to right, #000, ${aa(ua(t.h,t.s,100))})`,[t.h,t.s]),u=x=>{if(x.button!==0&&x.button!==2)return;x.preventDefault(),x.stopPropagation();const g=[{label:"Actions",action:()=>{},isHeader:!0},{label:`Copy Hex (${e})`,action:()=>navigator.clipboard.writeText(e.toUpperCase())},{label:"Paste Hex",action:async()=>{try{let b=await navigator.clipboard.readText();if(b=b.trim(),b.startsWith("#")||(b="#"+b),/^#[0-9A-F]{6}$/i.test(b)||/^#[0-9A-F]{3}$/i.test(b)){if(b.length===4){const C=b[1],S=b[2],k=b[3];b=`#${C}${C}${S}${S}${k}${k}`}const M=b.toUpperCase(),j=yt(M);j&&(r("param"),o(da(j)),s.current=M,n(M),ea(M),l())}}catch(b){console.warn("Paste failed",b)}}},{label:"Quick Picks",action:()=>{},isHeader:!0},{label:"White (#FFFFFF)",icon:a.jsx("div",{className:"w-3 h-3 rounded-full bg-white border border-gray-600"}),action:()=>{r("param");const b="#FFFFFF";o({h:0,s:0,v:100}),s.current=b,n(b),ea(b),l()}},{label:"Black (#000000)",icon:a.jsx("div",{className:"w-3 h-3 rounded-full bg-black border border-gray-600"}),action:()=>{r("param");const b="#000000";o({h:0,s:0,v:0}),s.current=b,n(b),ea(b),l()}}];Pa.length>0&&(g.push({label:"History",action:()=>{},isHeader:!0}),Pa.forEach(b=>{g.push({label:b,icon:a.jsx("div",{className:"w-3 h-3 rounded-full border border-gray-600",style:{backgroundColor:b}}),action:()=>{r("param");const M=yt(b);M&&(o(da(M)),s.current=b,n(b),ea(b)),l()}})})),i(x.clientX,x.clientY,g,["ui.colorpicker"])},m=x=>{if(x.target.closest(".hsv-stack")){const g=Ye(x.currentTarget);g.length>0&&(x.preventDefault(),x.stopPropagation(),i(x.clientX,x.clientY,[],g))}},v=()=>r("param"),y=()=>l();return a.jsxs("div",{className:"flex flex-row h-[66px] bg-black/40 border border-white/5 overflow-hidden group/picker relative gradient-interactive-element",onMouseUp:d,"data-help-id":"ui.colorpicker",onContextMenu:m,children:[a.jsx("div",{className:"w-8 shrink-0 relative cursor-pointer border-r border-white/10 hover:brightness-110 active:brightness-125 transition-all bg-gray-800",style:{backgroundColor:e},onMouseDown:u,onContextMenu:u,title:"Color Actions & History (Right Click)",children:a.jsx("div",{className:"absolute inset-0 flex items-center justify-center -rotate-90 whitespace-nowrap text-[10px] font-mono font-bold mix-blend-difference text-white opacity-80 group-hover/picker:opacity-100 transition-opacity",children:e})}),a.jsxs("div",{className:"flex-1 flex flex-col gap-[1px] hsv-stack",children:[a.jsx("div",{className:"relative h-[21.3px]",style:{background:f},children:a.jsx("input",{type:"range",min:"0",max:"360",step:"0.1",value:t.h,onChange:x=>c({h:Number(x.target.value)}),onPointerDown:v,onPointerUp:y,className:"precision-slider absolute inset-0 w-full h-full cursor-crosshair"})}),a.jsx("div",{className:"relative h-[21.3px]",style:{background:h},children:a.jsx("input",{type:"range",min:"0",max:"100",step:"0.1",value:t.s,onChange:x=>c({s:Number(x.target.value)}),onPointerDown:v,onPointerUp:y,className:"precision-slider absolute inset-0 w-full h-full cursor-crosshair"})}),a.jsx("div",{className:"relative h-[21.3px]",style:{background:p},children:a.jsx("input",{type:"range",min:"0",max:"100",step:"0.1",value:t.v,onChange:x=>c({v:Number(x.target.value)}),onPointerDown:v,onPointerUp:y,className:"precision-slider absolute inset-0 w-full h-full cursor-crosshair"})})]})]})},br=({index:e,value:n,onChange:t,isFixed:o=!1,size:s=140,width:i,height:r})=>{const l=i||s,c=r||s,d=l/2,f=c/2,h=l*.35,p=c*.35,u=w.useRef(null),[m,v]=w.useState(!1),{handleInteractionStart:y,handleInteractionEnd:x}=F(),g=()=>{const _=qe.getRotationFromEngine();return new Oe(_.x,_.y,_.z,_.w)},{sequence:b,currentFrame:M,isPlaying:j,addTrack:C,addKeyframe:S,removeKeyframe:k,snapshot:P,isRecording:I}=le(),N=()=>{const _=new Oe().setFromEuler(new _e(n.x,n.y,n.z,"YXZ"));return new V(0,0,-1).applyQuaternion(_)},T=()=>{let U=N().clone();o||U.applyQuaternion(g().invert());const G=new V(0,0,-1),E=U.angleTo(G),B=E/(Math.PI/2),z=Math.atan2(U.y,U.x),W=-Math.cos(z)*B*h,Z=Math.sin(z)*B*p;return{x:d+W,y:f+Z,isBacklit:E>Math.PI/2}},L=(_,U)=>{if(!u.current)return;const G=u.current.getBoundingClientRect(),E=G.left+l/2,B=G.top+c/2,z=_-E,W=U-B,Z=z/h,X=W/p,ee=Math.sqrt(Z*Z+X*X),te=Math.atan2(X,Z),re=ee*(Math.PI/2),ne=Math.min(re,Math.PI-.001),xe=Math.sin(ne);let de=new V(-xe*Math.cos(te),xe*Math.sin(te),-Math.cos(ne));o||de.applyQuaternion(g());const ae=new Oe().setFromUnitVectors(new V(0,0,-1),de),se=new _e().setFromQuaternion(ae,"YXZ");t({x:se.x,y:se.y,z:se.z})},D=T(),A=_=>{_.preventDefault(),_.stopPropagation(),y("param"),v(!0),_.target.setPointerCapture(_.pointerId),L(_.clientX,_.clientY)},R=_=>{m&&L(_.clientX,_.clientY)},$=_=>{if(m){if(v(!1),_.target.releasePointerCapture(_.pointerId),I){const U=`lighting.light${e}_rotX`,G=`lighting.light${e}_rotY`,E=`lighting.light${e}_rotZ`;b.tracks[U]||C(U,`Light ${e+1} Pitch`),b.tracks[G]||C(G,`Light ${e+1} Yaw`),b.tracks[E]||C(E,`Light ${e+1} Roll`),S(U,M,n.x),S(G,M,n.y),S(E,M,n.z)}x()}},O=[`lighting.light${e}_rotX`,`lighting.light${e}_rotY`],H=(()=>{let _=!1,U=!1,G=!1;return O.forEach((E,B)=>{const z=b.tracks[E];if(z){_=!0;const W=z.keyframes.find(Z=>Math.abs(Z.frame-M)<.1);if(W&&(U=!0),!j){const Z=B===0?n.x:n.y,X=W?W.value:st(z.keyframes,M,B===0||B===1);Math.abs(Z-X)>.001&&(G=!0)}}}),_?U?G?"keyed-dirty":"keyed":G?"dirty":"partial":"none"})(),q=()=>{P(),H==="keyed"?O.forEach(_=>{const U=b.tracks[_],G=U==null?void 0:U.keyframes.find(E=>Math.abs(E.frame-M)<.1);G&&k(_,G.id)}):O.forEach((_,U)=>{b.tracks[_]||C(_,U===0?`Light ${e+1} Pitch`:`Light ${e+1} Yaw`),S(_,M,U===0?n.x:n.y)})};return a.jsxs("div",{className:"flex flex-col items-center mb-2",children:[a.jsxs("div",{className:"w-full flex justify-between items-center mb-1 px-1",children:[a.jsx("label",{className:"text-[9px] font-bold text-gray-500",children:"Heliotrope"}),a.jsx(Xt,{status:H,onClick:q})]}),a.jsxs("div",{ref:u,className:"relative cursor-crosshair touch-none rounded-[30px] border border-white/10 shadow-inner group overflow-hidden",style:{width:l,height:c,background:"radial-gradient(circle at center, #0f172a 0%, #020617 80%)"},onPointerDown:A,onPointerMove:R,onPointerUp:$,title:o?"Headlamp Mode: Light is attached to Camera. Center = Camera Forward.":"World Mode: Light is fixed in space. Center = Direction you are looking.",children:[a.jsxs("div",{className:"absolute inset-0 flex items-center justify-center pointer-events-none opacity-20",children:[a.jsx("div",{className:"border border-cyan-500 rounded-full",style:{width:h*2,height:p*2}}),a.jsx("div",{className:"absolute w-full h-px bg-white/20"}),a.jsx("div",{className:"absolute h-full w-px bg-white/20"})]}),a.jsx("div",{className:"absolute top-1 left-1/2 -translate-x-1/2 text-[7px] text-gray-600 font-bold pointer-events-none",children:"TOP"}),a.jsx("div",{className:"absolute bottom-1 left-1/2 -translate-x-1/2 text-[7px] text-gray-600 font-bold pointer-events-none",children:"BTM"}),a.jsx("div",{className:"absolute left-1 top-1/2 -translate-y-1/2 text-[7px] text-gray-600 font-bold pointer-events-none",children:"L"}),a.jsx("div",{className:"absolute right-1 top-1/2 -translate-y-1/2 text-[7px] text-gray-600 font-bold pointer-events-none",children:"R"}),a.jsx("div",{className:`absolute inset-0 rounded-[30px] border-2 border-red-500/30 pointer-events-none transition-opacity duration-300 ${D.isBacklit?"opacity-100 animate-pulse":"opacity-0"}`}),a.jsx("div",{className:`absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full shadow-[0_0_10px_white] pointer-events-none transition-transform duration-75 ${m?"scale-125 bg-white":"bg-yellow-400"} ${D.isBacklit?"border-2 border-red-500":""}`,style:{left:D.x,top:D.y}})]}),a.jsxs("div",{className:"flex gap-2 w-full mt-2 px-1",children:[a.jsxs("div",{className:"flex-1 bg-black/40 rounded border border-white/10 flex items-center px-2 py-1",children:[a.jsx("span",{className:"text-[8px] text-gray-500 font-bold mr-2",children:"Pitch"}),a.jsx(vt,{value:n.x*180/Math.PI,onChange:_=>t({...n,x:_*Math.PI/180}),step:1,min:-180,max:180,overrideText:(n.x*180/Math.PI).toFixed(1)+"°",onDragStart:()=>y("param"),onDragEnd:()=>x()})]}),a.jsxs("div",{className:"flex-1 bg-black/40 rounded border border-white/10 flex items-center px-2 py-1",children:[a.jsx("span",{className:"text-[8px] text-gray-500 font-bold mr-2",children:"Yaw"}),a.jsx(vt,{value:n.y*180/Math.PI,onChange:_=>t({...n,y:_*Math.PI/180}),step:1,min:-180,max:180,overrideText:(n.y*180/Math.PI).toFixed(1)+"°",onDragStart:()=>y("param"),onDragEnd:()=>x()})]})]})]})},vc=ge(),wc=({index:e,color:n,active:t,type:o,rotation:s,onClick:i,onDragStart:r})=>{const c=(()=>{if(!s)return{x:50,y:50};const f=s.y;return{x:50+Math.sin(f)*35,y:50-Math.cos(f)*35}})(),d=Array.from({length:12}).map((f,h)=>h*30);return a.jsxs("div",{className:`group relative flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-all duration-300 touch-none ${t?"opacity-100 scale-100":"opacity-50 hover:opacity-100 scale-90 hover:scale-100"}`,onPointerDown:f=>{f.button===0&&(f.stopPropagation(),r())},onClick:f=>{f.stopPropagation(),i()},children:[!t&&a.jsxs("div",{className:"absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-black border border-white/20 text-[9px] font-bold text-gray-300 px-2 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50",children:["Drag to Screen",a.jsx("div",{className:"absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black border-t border-l border-white/20 transform rotate-45"})]}),a.jsxs("div",{className:"w-8 h-8 relative",children:[t&&a.jsx("div",{className:"absolute inset-0 rounded-full transition-all duration-300",style:{boxShadow:`0 0 ${o==="Directional"?"12px":"20px"} ${n}`,opacity:o==="Directional"?.6:1,backgroundColor:o==="Directional"?"transparent":n}}),t&&o==="Directional"&&a.jsx("div",{className:"absolute inset-0 pointer-events-none",children:d.map(f=>a.jsx("div",{className:"absolute w-px h-[3px] rounded-full",style:{backgroundColor:n,top:"50%",left:"50%",marginTop:"-1.5px",marginLeft:"-0.5px",transform:`rotate(${f}deg) translateY(-17px)`,boxShadow:`0 0 2px ${n}`}},f))}),a.jsx("div",{className:"absolute inset-0 rounded-full border border-white overflow-hidden z-10 shadow-[inset_0_0_6px_rgba(255,255,255,0.4)] isolate",style:{backgroundColor:o==="Directional"?"#000000":n},children:t&&o==="Directional"&&a.jsx("div",{className:"absolute inset-0 w-full h-full",style:{background:`radial-gradient(circle at ${c.x}% ${c.y}%, ${n} 0%, transparent 65%)`,opacity:1}})}),t&&o!=="Directional"&&a.jsx("div",{className:"absolute inset-0 rounded-full border border-white/50 animate-ping opacity-20 pointer-events-none"})]}),a.jsxs(ze,{variant:"tiny",className:"absolute -bottom-4 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap",children:["L",e+1]})]})},Sc=({index:e,onClose:n})=>{const t=F(S=>kt(S.lighting,e)),o=F(S=>S.updateLight),s=F(S=>S.removeLight),i=F(S=>S.duplicateLight),{handleInteractionStart:r,handleInteractionEnd:l}=F(),{addTrack:c,addKeyframe:d,currentFrame:f,sequence:h,isPlaying:p}=le(),[u,m]=w.useState(t.useTemperature??!1),[v,y]=w.useState(t.temperature??6500);if(!t.visible)return null;const x=()=>{const S=t.fixed;let k=t.position,P=t.rotation;const I=et();if(I)if(t.type==="Point"){const N=vc.sceneOffset;if(S){const T=new V(k.x,k.y,k.z);T.applyQuaternion(I.quaternion),T.add(I.position),k={x:T.x+N.x+(N.xL??0),y:T.y+N.y+(N.yL??0),z:T.z+N.z+(N.zL??0)}}else{const T=new V(k.x-N.x-(N.xL??0),k.y-N.y-(N.yL??0),k.z-N.z-(N.zL??0));T.sub(I.position),T.applyQuaternion(I.quaternion.clone().invert()),k={x:T.x,y:T.y,z:T.z}}}else{const N=new V(0,0,-1).applyEuler(new _e(P.x,P.y,P.z,"YXZ"));N.applyQuaternion(S?I.quaternion:I.quaternion.clone().invert());const T=new Oe().setFromUnitVectors(new V(0,0,-1),N),L=new _e().setFromQuaternion(T,"YXZ");P={x:L.x,y:L.y,z:L.z}}o({index:e,params:{fixed:!S,position:k,rotation:P}})},g=()=>{["X","Y","Z"].forEach(k=>{const P=`lighting.light${e}_pos${k}`;h.tracks[P]||c(P,`Light ${e+1} Pos ${k}`),d(P,f,t.position[k.toLowerCase()])})},M=(()=>{const S=["X","Y","Z"];let k=!1,P=!1,I=!1;return S.forEach(N=>{const T=`lighting.light${e}_pos${N}`,L=h.tracks[T];if(L){k=!0;const D=L.keyframes.find(A=>Math.abs(A.frame-f)<.1);if(D&&(P=!0),!p){const A=t.position[N.toLowerCase()];let R=0;D?R=D.value:R=st(L.keyframes,f,!1),Math.abs(R-A)>1e-4&&(I=!0)}}}),k?P?I?"keyed-dirty":"keyed":I?"dirty":"partial":"none"})(),j=`lighting.light${e}`,C=S=>{if(S===0)return"0";if(Math.abs(S)<1)return S.toFixed(3);const k=S.toPrecision(5);return k.includes(".")?k.replace(/\.?0+$/,""):k};return a.jsx(Tt,{width:"w-52",onClose:n,children:a.jsxs("div",{className:"relative space-y-3",children:[a.jsxs("div",{className:"flex items-center justify-between border-b border-white/10 pb-2",children:[a.jsxs("div",{className:"flex items-center gap-2",children:[t.type==="Point"&&a.jsx(Xt,{status:M,onClick:g}),a.jsxs(ze,{children:["Light ",e+1]})]}),a.jsxs("div",{className:"flex items-center gap-1",children:[a.jsx("button",{onClick:S=>{S.stopPropagation(),r("param"),i(e),l()},className:"p-1 text-gray-400 hover:text-cyan-300 hover:bg-cyan-900/20 rounded transition-colors",title:"Duplicate Light",children:a.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[a.jsx("rect",{x:"9",y:"9",width:"13",height:"13",rx:"2"}),a.jsx("path",{d:"M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"})]})}),a.jsx("button",{onClick:S=>{S.stopPropagation(),r("param"),s(e),l()},className:"p-1 text-red-500 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors",title:"Remove Light",children:a.jsx($t,{})}),a.jsx("button",{onClick:()=>{r("param"),x(),l()},className:`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${t.fixed?"bg-orange-500/20 text-orange-300 border-orange-500/50":"bg-cyan-500/20 text-cyan-300 border-cyan-500/50"}`,children:t.fixed?"ANCHORED":"FLOATING"})]})]}),a.jsxs("div",{className:"space-y-1",children:[t.type==="Directional"&&a.jsx("div",{className:"mb-2",children:a.jsx(br,{index:e,value:t.rotation,onChange:S=>o({index:e,params:{rotation:S}}),isFixed:t.fixed,width:180,height:110})}),t.intensityUnit==="ev"?a.jsx(fe,{label:"Power (EV)",value:t.intensity,min:-4,max:10,step:.1,onChange:S=>o({index:e,params:{intensity:S}}),mapTextInput:!1,overrideInputText:`${C(t.intensity)} EV`,trackId:`${j}_intensity`}):a.jsx(fe,{label:"Power",value:t.intensity,min:0,max:100,step:.1,onChange:S=>o({index:e,params:{intensity:S}}),customMapping:{min:0,max:100,toSlider:S=>Math.sqrt(S/100)*100,fromSlider:S=>S*S/100},mapTextInput:!1,overrideInputText:C(t.intensity),trackId:`${j}_intensity`}),t.type!=="Directional"&&a.jsx(fe,{label:"Range",value:t.range??0,min:0,max:100,step:.1,onChange:S=>o({index:e,params:{range:S}}),customMapping:{min:0,max:100,toSlider:S=>Math.log10(S+1)/Math.log10(101)*100,fromSlider:S=>Math.pow(101,S/100)-1},mapTextInput:!1,overrideInputText:(t.range??0)<.01?"Infinite":C(t.range??0),trackId:`${j}_falloff`}),t.type!=="Directional"&&a.jsxs("div",{className:"space-y-1",children:[a.jsxs("div",{className:"flex items-center justify-between",children:[a.jsx("label",{className:"text-xs text-gray-400 font-medium",children:"Visible Sphere"}),a.jsx("button",{onClick:()=>{const S=(t.radius??0)>.001;r("param"),o({index:e,params:{radius:S?0:.1}}),l()},className:`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${(t.radius??0)>.001?"bg-cyan-500/20 text-cyan-300 border-cyan-500/50":"bg-white/5 text-gray-400 border-white/20 hover:border-white/40"}`,children:(t.radius??0)>.001?"ON":"OFF"})]}),(t.radius??0)>.001&&a.jsxs(a.Fragment,{children:[a.jsx(fe,{label:"Sphere Radius",value:t.radius??.1,min:.001,max:1,step:.001,onChange:S=>o({index:e,params:{radius:S}}),trackId:`${j}_radius`}),a.jsx(fe,{label:"Edge Softness",value:t.softness??0,min:0,max:2,step:.01,onChange:S=>o({index:e,params:{softness:S}}),trackId:`${j}_softness`})]})]})]}),a.jsxs("div",{className:"pt-2 border-t border-white/10 space-y-2",children:[a.jsxs("div",{className:"flex items-center gap-1 mb-2",children:[a.jsx("button",{onClick:()=>{m(!1),o({index:e,params:{useTemperature:!1}})},className:`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${u?"bg-white/5 text-gray-400 border-white/20 hover:border-white/40":"bg-cyan-500/20 text-cyan-300 border-cyan-500/50"}`,children:"COLOR"}),a.jsx("button",{onClick:()=>{const S=!u;if(m(S),S){const k=oo(v);o({index:e,params:{color:k,useTemperature:!0,temperature:v}})}else o({index:e,params:{useTemperature:!1}})},className:`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${u?"bg-amber-500/20 text-amber-300 border-amber-500/50":"bg-white/5 text-gray-400 border-white/20 hover:border-white/40"}`,children:"TEMPERATURE"})]}),u?a.jsxs("div",{className:"space-y-1",children:[a.jsxs("div",{className:"flex items-center justify-between",children:[a.jsx("label",{className:"text-[10px] text-gray-400 font-medium",children:"Temperature (K)"}),a.jsx("span",{className:"text-[10px] text-gray-300 font-mono",children:v})]}),a.jsx("input",{type:"range",min:1e3,max:1e4,step:100,value:v,onChange:S=>{const k=parseInt(S.target.value);y(k);const P=oo(k);o({index:e,params:{temperature:k,color:P}})},className:"w-full h-1.5 bg-gradient-to-r from-orange-500 via-yellow-200 to-blue-200 rounded-full appearance-none cursor-pointer",style:{background:"linear-gradient(to right, #ff6b35, #ffcc66, #ffffff, #cce5ff, #66b3ff)"}})]}):a.jsx($a,{color:t.color,onColorChange:S=>o({index:e,params:{color:S}})}),a.jsxs("div",{className:"flex items-center justify-between pt-1",children:[a.jsx("label",{className:"text-xs text-gray-400 font-medium",children:"Cast Shadows"}),a.jsx("input",{type:"checkbox",checked:t.castShadow,onChange:S=>{r("param"),o({index:e,params:{castShadow:S.target.checked}}),l()},className:"w-3 h-3 accent-cyan-500 bg-gray-800 border-gray-600 rounded cursor-pointer"})]})]})]})})},Mc=({targetRef:e,color:n,onChange:t,onClose:o,label:s})=>{const[i,r]=w.useState({x:0,y:0});return w.useLayoutEffect(()=>{if(e.current){const l=e.current.getBoundingClientRect(),c=window.innerWidth,d=window.innerHeight,f=240,h=150;let p=l.right+5,u=l.top;p+f>c&&(p=l.left-f-5),u+h>d&&(u=l.bottom-h),r({x:p,y:u})}},[e]),w.useEffect(()=>{const l=c=>{e.current&&!e.current.contains(c.target)&&(c.target.closest(".picker-popup")||o())};return window.addEventListener("mousedown",l),()=>window.removeEventListener("mousedown",l)},[o,e]),Ht.createPortal(a.jsxs("div",{className:"picker-popup fixed z-[9999] bg-black border border-white/20 p-3 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] w-56 animate-fade-in",style:{left:i.x,top:i.y},onMouseDown:l=>l.stopPropagation(),children:[s&&a.jsx("div",{className:"text-[10px] font-bold text-gray-500 mb-2 text-center",children:s}),a.jsx($a,{color:n,onColorChange:t})]}),document.body)},Ta=({color:e,onChange:n,label:t})=>{const[o,s]=w.useState(!1),i=w.useRef(null),r=F(c=>c.openContextMenu),l=c=>{const d=Ye(c.currentTarget);d.unshift("ui.colorpicker"),d.length>0&&(c.preventDefault(),c.stopPropagation(),r(c.clientX,c.clientY,[],d))};return a.jsxs(a.Fragment,{children:[a.jsx("button",{ref:i,onClick:()=>s(!o),onContextMenu:l,className:"w-16 h-6 rounded border border-white/10 shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center overflow-hidden",style:{backgroundColor:e},title:t||"Pick Color",children:a.jsx("div",{className:"text-[8px] font-mono font-bold mix-blend-difference text-white",children:e})}),o&&a.jsx(Mc,{targetRef:i,color:e,onChange:n,onClose:()=>s(!1),label:t})]})};function qt({label:e,value:n,options:t,onChange:o,helpId:s,fullWidth:i,className:r="",selectClassName:l="",labelSuffix:c}){const{openContextMenu:d,handleInteractionStart:f,handleInteractionEnd:h}=F(),p=m=>{const v=Ye(m.currentTarget);v.length>0&&(m.preventDefault(),m.stopPropagation(),d(m.clientX,m.clientY,[],v))},u=m=>{f("param"),o(m),h()};return a.jsx(Kr,{label:e,value:n,options:t,onChange:u,fullWidth:i,className:r,selectClassName:l,labelSuffix:c,"data-help-id":s,onContextMenu:p})}const ht=({axisIndex:e,value:n,min:t,max:o,step:s,onUpdate:i,onDragStart:r,onDragEnd:l,disabled:c,highlight:d,mapping:f,mapTextInput:h,liveValue:p,defaultValue:u,hardMin:m,hardMax:v,customLabel:y})=>{const x=Jr[e],g=y||x.label;return a.jsxs("div",{"data-axis-index":e,className:`relative flex-1 h-9 md:h-[26px] overflow-hidden group transition-all duration-150 ${c?"opacity-50 pointer-events-none":""}`,children:[a.jsx("div",{className:`
                    absolute top-0 bottom-0 left-0 w-5 flex items-center justify-center
                    border-r border-white/10 bg-white/[0.05] select-none z-20
                    cursor-pointer hover:bg-white/[0.15] active:bg-white/20 transition-colors
                `,onDoubleClick:b=>{b.preventDefault(),b.stopPropagation(),u!==void 0&&(r==null||r(),i(u),l==null||l())},title:u!==void 0?`Double-click to reset to ${u}`:"No default value",children:a.jsx("span",{className:`text-[10px] font-bold ${x.text} pointer-events-none`,children:g})}),a.jsx("div",{className:"absolute inset-0 left-5",children:a.jsx(kn,{value:n,onChange:i,onDragStart:r,onDragEnd:l,step:s,min:t,max:o,hardMin:m,hardMax:v,mapping:f,mapTextInput:h,disabled:c,highlight:d,liveValue:p,defaultValue:u,variant:"compact",showTrack:!0})})]})},ho=[{label:"X",color:"bg-red-500",text:"text-red-400",border:"group-focus-within:border-red-500/50",hoverBg:"hover:bg-red-500/20",accent:"#ef4444"},{label:"Y",color:"bg-green-500",text:"text-green-400",border:"group-focus-within:border-green-500/50",hoverBg:"hover:bg-green-500/20",accent:"#22c55e"},{label:"Z",color:"bg-blue-500",text:"text-blue-400",border:"group-focus-within:border-blue-500/50",hoverBg:"hover:bg-blue-500/20",accent:"#3b82f6"},{label:"W",color:"bg-purple-500",text:"text-purple-400",border:"group-focus-within:border-purple-500/50",hoverBg:"hover:bg-purple-500/20",accent:"#a855f7"}],ha=({primaryAxis:e,secondaryAxis:n,primaryIndex:t,secondaryIndex:o,primaryValue:s,secondaryValue:i,min:r,max:l,step:c,onUpdate:d,onDragStart:f,onDragEnd:h,disabled:p,onHover:u})=>{const[m,v]=w.useState(!1),y=w.useRef(!1),x=w.useRef(!1),g=w.useRef({x:0,y:0}),b=w.useRef({primary:0,secondary:0}),M=w.useRef(!1),j=w.useRef(!1),C=w.useRef(!1),S=ho[t],k=ho[o],P=()=>{v(!0),u(!0)},I=()=>{y.current||(v(!1),u(!1))},N=R=>{p||R.button!==0&&R.button!==1||(R.preventDefault(),R.stopPropagation(),R.currentTarget.setPointerCapture(R.pointerId),g.current={x:R.clientX,y:R.clientY},b.current={primary:s,secondary:i},M.current=!1,j.current=R.shiftKey,C.current=R.altKey,y.current=!0,x.current=R.button===1,f())},T=R=>{if(p||!y.current||!R.currentTarget.hasPointerCapture(R.pointerId))return;const $=R.clientX-g.current.x,O=R.clientY-g.current.y;if((Math.abs($)>1||Math.abs(O)>1)&&(M.current=!0),!M.current&&Math.abs($)<1&&Math.abs(O)<1)return;R.preventDefault(),R.stopPropagation();const H=j.current!==R.shiftKey,q=C.current!==R.altKey;if(H||q){let _=c*.5;j.current&&(_*=10),C.current&&(_*=.1),b.current.primary=b.current.primary+$*_,b.current.secondary=b.current.secondary-O*_,g.current={x:R.clientX,y:R.clientY},j.current=R.shiftKey,C.current=R.altKey}if(x.current){let _=.01;R.shiftKey&&(_*=3),R.altKey&&(_*=.3);const U=1+O*_;let G=b.current.primary*U,E=b.current.secondary*U;!isNaN(G)&&!isNaN(E)&&d(G,E)}else{let _=c*.5;R.shiftKey&&(_*=10),R.altKey&&(_*=.1);let U=b.current.primary+$*_,G=b.current.secondary-O*_;!isNaN(U)&&!isNaN(G)&&d(U,G)}},L=R=>{p||(R.currentTarget.releasePointerCapture(R.pointerId),y.current=!1,x.current=!1,h(),M.current=!1,R.currentTarget.matches(":hover")||(v(!1),u(!1)))},D=R=>{p||(R.preventDefault(),R.stopPropagation(),f(),d(0,0),h())},A=m||y.current;return a.jsxs("div",{className:`
                w-6 h-9 md:h-[26px] flex-shrink-0 cursor-move overflow-hidden
                transition-all duration-150 ease-out relative
                ${A?"bg-white/10 border border-white/30":"bg-white/[0.08] border border-white/5"}
                ${p?"opacity-30 pointer-events-none":""}
            `,onPointerDown:N,onPointerMove:T,onPointerUp:L,onMouseEnter:P,onMouseLeave:I,onDoubleClick:D,title:`Drag: Horizontal=${e.toUpperCase()}, Vertical=${n.toUpperCase()} | Middle-click: Scale both proportionally | Double-click: Reset (Shift=Fast, Alt=Slow)`,children:[A&&a.jsx("div",{className:"absolute inset-0 opacity-30",style:{backgroundImage:"repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.05) 3px, rgba(255,255,255,0.05) 6px)"}}),a.jsxs("div",{className:"relative w-full h-full",children:[a.jsx("div",{className:`
                        absolute bottom-0 left-0 h-[2px] ${S.color}
                        transition-all duration-150
                        ${A?"opacity-60 w-full":"opacity-0 w-0"}
                    `}),a.jsx("div",{className:`
                        absolute bottom-0 left-0 w-[2px] ${k.color}
                        transition-all duration-150
                        ${A?"opacity-60 h-full":"opacity-0 h-0"}
                    `}),a.jsxs("div",{className:`
                        absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        transition-opacity duration-150 pointer-events-none
                        ${A?"opacity-100":"opacity-0"}
                    `,children:[a.jsx("div",{className:`absolute w-2 h-[1px] ${S.color} -translate-x-1/2`}),a.jsx("div",{className:`absolute h-2 w-[1px] ${k.color} -translate-y-1/2`})]}),a.jsx("div",{className:`
                        absolute inset-0 pointer-events-none
                        transition-opacity duration-150
                        ${x.current?"opacity-100":"opacity-0"}
                    `,children:a.jsxs("div",{className:"absolute inset-0 flex items-center justify-center",children:[a.jsx("div",{className:"w-full h-[1px] bg-cyan-400/50 rotate-45"}),a.jsx("div",{className:"absolute w-full h-[1px] bg-cyan-400/50 -rotate-45"})]})})]})]})},fo=({azimuth:e,pitch:n,onChange:t,onDragStart:o,onDragEnd:s,disabled:i=!1,size:r=80})=>{const l=w.useRef(null),c=w.useRef(!1),[d,f]=w.useState(!1),[h,p]=w.useState(!1),[u,m]=w.useState(!1),v=w.useRef({x:0,y:0}),y=w.useRef({azimuth:e,pitch:n}),x=w.useRef({azimuth:e,pitch:n}),g=w.useRef(null);w.useEffect(()=>{y.current={azimuth:e,pitch:n}},[e,n]);const j=h?.05:.5,C=r/2,S=r*.38,k=w.useCallback((R,$,O)=>{const H=R/(Math.PI/2)*O,q=-($/(Math.PI/2))*O;return{x:H,y:q}},[]),P=w.useMemo(()=>k(e,n,S),[e,n,S,k]),I=w.useMemo(()=>{const R=Math.cos(n),$=Math.sin(n),O=Math.cos(e),q=Math.sin(e)*R,_=$,U=-O*R,G=q,E=-_,B=Math.sqrt(G*G+E*E),z=U>0,W=B>.001?Math.min(B,1)*S:0,Z=U<=0?1+(1-Math.min(B,1))*.5:1-U*.95,X=B>.001?G/B*W:0,ee=B>.001?E/B*W:0;return{x:X,y:ee,isBack:z,length:W,headScale:Z,dirX:q,dirY:_,dirZ:U}},[e,n,S]),N=w.useCallback((R,$,O)=>{const H=R/O*(Math.PI/2),q=-($/O)*(Math.PI/2);return{azimuth:H,pitch:q}},[]),T=w.useCallback((R,$)=>{let O=R,H=$;u&&g.current&&(g.current==="x"?H=0:O=0);const q=O*j,_=H*j,U=k(y.current.azimuth,y.current.pitch,S),G=U.x+q,E=U.y+_,{azimuth:B,pitch:z}=N(G,E,S);u&&g.current?g.current==="x"?(y.current={azimuth:B,pitch:x.current.pitch},t(B,x.current.pitch)):(y.current={azimuth:x.current.azimuth,pitch:z},t(x.current.azimuth,z)):(y.current={azimuth:B,pitch:z},t(B,z))},[k,N,t,S,j,u]),L=R=>{i||R.button===0&&(R.preventDefault(),R.stopPropagation(),R.currentTarget.setPointerCapture(R.pointerId),c.current=!0,f(!0),v.current={x:R.clientX,y:R.clientY},y.current={azimuth:e,pitch:n},x.current={azimuth:e,pitch:n},g.current=null,o==null||o(),p(R.altKey),m(R.shiftKey))},D=R=>{if(i||!c.current)return;const $=R.clientX-v.current.x,O=R.clientY-v.current.y;v.current={x:R.clientX,y:R.clientY},p(R.altKey),m(R.shiftKey),u&&!g.current&&(Math.abs($)>2||Math.abs(O)>2)&&(g.current=Math.abs($)>Math.abs(O)?"x":"y"),T($,O)},A=R=>{c.current&&(c.current=!1,f(!1),p(!1),m(!1),g.current=null,s==null||s())};return a.jsxs("div",{ref:l,className:`
                relative rounded-full border border-white/10 bg-black/40
                cursor-crosshair touch-none overflow-hidden
                transition-all duration-200
                ${i?"opacity-50 pointer-events-none":""}
                ${d?"scale-105 border-cyan-500/50":"hover:border-white/20"}
            `,style:{width:r,height:r,touchAction:"none",boxShadow:d?"0 0 20px rgba(34, 211, 238, 0.3)":"none"},onPointerDown:L,onPointerMove:D,onPointerUp:A,onPointerLeave:A,onDoubleClick:R=>{i||(R.preventDefault(),R.stopPropagation(),o==null||o(),t(0,0),s==null||s())},onContextMenu:R=>{},title:"Drag to rotate direction, Double-click to reset",children:[a.jsx("div",{className:"absolute rounded-full border border-white/10 pointer-events-none",style:{width:S*2,height:S*2,left:C-S,top:C-S}}),a.jsx("div",{className:"absolute w-full h-px bg-white/10 pointer-events-none",style:{top:C}}),a.jsx("div",{className:"absolute h-full w-px bg-white/10 pointer-events-none",style:{left:C}}),a.jsx("div",{className:"absolute w-1.5 h-1.5 bg-white/40 rounded-full pointer-events-none",style:{left:C-3,top:C-3}}),a.jsx("div",{className:"absolute pointer-events-none rounded-full transition-transform duration-75",style:{left:C+P.x,top:C+P.y,width:8,height:8,marginLeft:-4,marginTop:-4,background:I.isBack?"#ef4444":"#22d3ee",boxShadow:`0 0 8px ${I.isBack?"#ef4444":"#22d3ee"}`,transform:d?"scale(1.2)":"scale(1)"}}),I.isBack&&a.jsx("div",{className:"absolute inset-0 rounded-full border-2 border-red-500/30 pointer-events-none animate-pulse"}),a.jsxs(a.Fragment,{children:[a.jsxs("svg",{className:"absolute inset-0 pointer-events-none",style:{width:r,height:r},children:[Math.abs(e)>.01&&a.jsxs(a.Fragment,{children:[a.jsx("ellipse",{cx:C,cy:C,rx:S*Math.abs(Math.sin(e)),ry:S,fill:"none",stroke:I.isBack?"#ef4444":"#22d3ee",strokeWidth:"1.5",opacity:I.isBack?.175:.35,clipPath:I.x>0?"url(#longitudeRight)":"url(#longitudeLeft)"}),a.jsx("ellipse",{cx:C,cy:C,rx:S*Math.abs(Math.sin(e)),ry:S,fill:"none",stroke:I.isBack?"#22d3ee":"#ef4444",strokeWidth:"1.5",opacity:I.isBack?.35:.175,clipPath:I.x>0?"url(#longitudeLeft)":"url(#longitudeRight)"})]}),Math.abs(n)>.01&&a.jsxs(a.Fragment,{children:[a.jsx("ellipse",{cx:C,cy:C,rx:S,ry:S*Math.abs(Math.sin(n)),fill:"none",stroke:I.isBack?"#ef4444":"#22d3ee",strokeWidth:"1.5",opacity:I.isBack?.15:.3,clipPath:I.y<0?"url(#latitudeTop)":"url(#latitudeBottom)"}),a.jsx("ellipse",{cx:C,cy:C,rx:S,ry:S*Math.abs(Math.sin(n)),fill:"none",stroke:I.isBack?"#22d3ee":"#ef4444",strokeWidth:"1.5",opacity:I.isBack?.3:.15,clipPath:I.y<0?"url(#latitudeBottom)":"url(#latitudeTop)"})]}),a.jsxs("defs",{children:[a.jsx("clipPath",{id:"longitudeRight",children:a.jsx("rect",{x:C,y:"0",width:C,height:r})}),a.jsx("clipPath",{id:"longitudeLeft",children:a.jsx("rect",{x:"0",y:"0",width:C,height:r})}),a.jsx("clipPath",{id:"latitudeTop",children:a.jsx("rect",{x:"0",y:"0",width:r,height:C})}),a.jsx("clipPath",{id:"latitudeBottom",children:a.jsx("rect",{x:"0",y:C,width:r,height:C})})]}),a.jsx("line",{x1:C,y1:C,x2:C+I.x,y2:C+I.y,stroke:I.isBack?"#ef4444":"#22d3ee",strokeWidth:"2",strokeDasharray:"4 2",opacity:.3+I.length/S*.5}),a.jsx("polygon",{points:"0,-8 -6,4 6,4",fill:I.isBack?"#ef4444":"#22d3ee",opacity:Math.max(.1,.6+(I.headScale-1)*.4),transform:`translate(${C+I.x}, ${C+I.y}) rotate(${Math.atan2(I.y,I.x)*180/Math.PI+90}) scale(${Math.max(.9,.9+I.headScale*.1)}, ${Math.max(.05,I.headScale)})`})]}),d&&a.jsx("div",{className:"absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap",children:a.jsxs("span",{className:"text-[9px] text-cyan-400 font-mono bg-black/60 px-1 rounded",children:[(e*180/Math.PI).toFixed(0),"° / ",(n*180/Math.PI).toFixed(0),"°"]})})]})]})},Qa=Math.PI/180,Cc=180/Math.PI,kc=["x","y","z","w"],Ka={x:0,y:1,z:2,w:3},jc=e=>{const n=e.length();if(n<1e-9)return{azimuth:0,pitch:0};const t=Math.max(-1,Math.min(1,e.y/n));return{azimuth:Math.atan2(e.x/n,e.z/n),pitch:Math.asin(t)}},Rc=(e,n)=>{const t=Math.cos(n);return new V(t*Math.sin(e),Math.sin(n),t*Math.cos(e))},Tn=({label:e,value:n,onChange:t,min:o=-1e4,max:s=1e4,step:i=.01,disabled:r=!1,convertRadToDeg:l=!1,mode:c="normal",modeToggleable:d=!1,showLiveIndicator:f=!1,liveValue:h,defaultValue:p,hardMin:u,hardMax:m,axisMin:v,axisMax:y,axisStep:x,onDragStart:g,onDragEnd:b,headerRight:M,showDualAxisPads:j=!0,linkable:C=!1,scale:S})=>{const[k,P]=w.useState(n.clone()),[I,N]=w.useState(null),[T,L]=w.useState(c),[D,A]=w.useState("degrees"),[R,$]=w.useState("degrees"),[O,H]=w.useState(C),q=w.useRef(!1),_=w.useRef(null),U=w.useRef(null);w.useEffect(()=>{L(c)},[c]);const G=F(J=>J.openContextMenu),E="w"in n,B="z"in n,z=T==="rotation",W=T==="toggle",Z=T==="mixed",X=T==="direction"&&B,ee=X?jc(k):{azimuth:0,pitch:0},te=(J,ce)=>{const Se=Math.max(-Math.PI/2,Math.min(Math.PI/2,ce)),Me=Rc(J,Se);de(0,J),de(1,Se),P(Me),t(Me)};w.useEffect(()=>{if(q.current)return;const J=1e-4,ce=Math.abs(n.x-k.x),Se=Math.abs(n.y-k.y),Me=B?Math.abs(n.z-k.z):0,Je=E?Math.abs(n.w-k.w):0;(ce>J||Se>J||Me>J||Je>J)&&P(n.clone())},[n,B,E]);const re=()=>{q.current=!0,_.current=k.clone(),g&&g()},ne=()=>{_.current=null,q.current=!1,b&&b()},xe=J=>{if(z)return D==="degrees"?Zt:An;if(S==="pi")return R==="pi"?An:Zt;if(l)return Zt},Ie=J=>{if(z){const Le=D==="degrees"?60*Math.PI/180:.05;return{min:-2*Math.PI,max:2*Math.PI,step:Le,hardMin:void 0,hardMax:void 0}}const ce=v||{x:o,y:o,z:o},Se=y||{x:s,y:s,z:s},Me=x||{x:i,y:i,z:i},Je=S==="pi"&&R==="degrees"?Cc:1;return{min:ce[J],max:Se[J],step:(Me[J]??i)*Je,hardMin:u,hardMax:m}},de=(J,ce)=>{const Se=U.current;if(!Se)return;const Me=Se.querySelector(`[data-axis-index="${J}"]`);if(!Me)return;const Je=kc[J],Le=xe(),ca=Me.querySelector('[data-role="value"]');ca&&(ca.textContent=Le!=null&&Le.format?Le.format(ce):Uo(ce));const Ln=Me.querySelector('[data-role="fill"]');if(Ln){const Nn=Ie(Je),Dn=Nn.min??o,_n=Nn.max??s;if(Dn!==_n){const Br=es(ce,Dn,_n,Le);Ln.style.width=`${Br}%`}}},ae=(J,ce)=>{const Se=_.current||k,Me=Se.clone();if(O&&!z){const Je=Se[J],Le=ce-Je;Me.x=Se.x+Le,Me.y=Se.y+Le,B&&(Me.z=Se.z+Le),E&&(Me.w=Se.w+Le),de(0,Me.x),de(1,Me.y),B&&de(2,Me.z),E&&de(3,Me.w)}else Me[J]=ce;P(Me),t(Me)},se=(J,ce,Se,Me)=>{const Le=(_.current||k).clone();Le[J]=Se,Le[ce]=Me,de(Ka[J],Se),de(Ka[ce],Me),P(Le),t(Le)},je=I==="xy",Ne=I==="xy"||I==="zy",ye=I==="zy"||I==="wz",K=I==="wz",ue=J=>{if(h)return h[J]},Ee=J=>{if(p)return p[J]},Fe=k,Ut={x:je,y:Ne,z:ye,w:K},nt=J=>({axisIndex:Ka[J],value:k[J],...Ie(J),onUpdate:ce=>ae(J,ce),onDragStart:re,onDragEnd:ne,disabled:r,highlight:Ut[J],mapping:xe(),mapTextInput:z||S==="pi",liveValue:f?ue(J):void 0,defaultValue:Ee(J)}),pe=[{on:"bg-red-500/30 text-red-300 border-red-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"},{on:"bg-green-500/30 text-green-300 border-green-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"},{on:"bg-blue-500/30 text-blue-300 border-blue-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"},{on:"bg-purple-500/30 text-purple-300 border-purple-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"}],He=(J,ce,Se)=>{const Je=k[J]>.5,Le=pe[ce];return a.jsxs("button",{className:`flex items-center justify-center gap-1 text-[10px] font-bold transition-all border ${Je?Le.on:Le.off} ${r?"opacity-40 pointer-events-none":"cursor-pointer hover:brightness-125"} ${Se||"flex-1"}`,onClick:()=>ae(J,Je?0:1),disabled:r,children:[Se?null:a.jsx("span",{children:J}),a.jsx("span",{className:`text-[8px] ${Je?"opacity-80":"opacity-70"}`,children:Je?"ON":"OFF"})]},J)},gt=()=>d?a.jsx("button",{onClick:()=>L(J=>J==="rotation"?"normal":"rotation"),className:`text-[10px] p-1 rounded transition-colors mr-2 ${T==="rotation"?"text-cyan-400 bg-cyan-500/20":"text-gray-500 hover:text-gray-300"}`,title:T==="rotation"?"Rotation mode (π units)":"Normal mode",children:"⟳"}):null,we=()=>!C||z?null:a.jsx("button",{onClick:()=>H(J=>!J),className:`p-1 rounded transition-colors mr-2 ${O?"text-cyan-400 bg-cyan-500/20":"text-gray-600 hover:text-gray-400"}`,title:O?"Axes linked (uniform)":"Link axes",children:a.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[a.jsx("path",{d:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"}),a.jsx("path",{d:"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"})]})}),$e=J=>{const ce=[];z&&ce.push({label:"Rotation Units",action:()=>{},isHeader:!0},{label:"Degrees (°)",checked:D==="degrees",action:()=>A("degrees")},{label:"Radians (π)",checked:D==="radians",action:()=>A("radians")}),!z&&S==="pi"&&ce.push({label:"Display Units",action:()=>{},isHeader:!0},{label:"Radians (π)",checked:R==="pi",action:()=>$("pi")},{label:"Degrees (°)",checked:R==="degrees",action:()=>$("degrees")}),B&&(c==="rotation"||c==="axes")&&ce.push({label:"Display Mode",action:()=>{},isHeader:!0},{label:"Azimuth / Pitch (A/P)",checked:T==="rotation",action:()=>L("rotation")},{label:"Per-Axis (X/Y/Z)",checked:T==="axes"||T==="normal",action:()=>L("normal")}),ce.length!==0&&(J.preventDefault(),J.stopPropagation(),G(J.clientX,J.clientY,ce,["ui.vector"]))};return a.jsxs("div",{className:"mb-px animate-slider-entry",children:[e&&a.jsxs("div",{className:"flex items-stretch bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5",children:[a.jsxs("div",{className:"flex-1 flex items-center gap-2 px-2 min-w-0",children:[d&&gt(),M,a.jsx("label",{className:`text-[10px] font-medium tracking-tight select-none flex items-center gap-2 truncate pointer-events-none ${r?"text-gray-600":"text-gray-400"}`,children:e})]}),C&&!z&&a.jsx("div",{className:"flex items-center px-1 border-l border-white/5",children:we()})]}),a.jsx("div",{className:"relative h-9 md:h-[26px] flex items-center touch-none overflow-hidden rounded-b-sm",style:{touchAction:"none"},onContextMenu:$e,"data-help-id":"ui.vector",children:a.jsx("div",{ref:U,className:"flex gap-px w-full h-full",children:W?a.jsx(a.Fragment,{children:["x","y","z","w"].slice(0,E?4:B?3:2).map((J,ce)=>He(J,ce))}):Z?a.jsxs(a.Fragment,{children:[He("x",0,"w-14 flex-shrink-0"),a.jsx(ht,{...nt("y"),disabled:r||k.x<.5})]}):X?a.jsxs(a.Fragment,{children:[a.jsx("div",{className:"flex items-center justify-center px-1 flex-shrink-0",children:a.jsx(fo,{azimuth:ee.azimuth,pitch:ee.pitch,onChange:(J,ce)=>{te(J,ce)},onDragStart:re,onDragEnd:ne,disabled:r,size:56})}),a.jsx(ht,{axisIndex:0,value:ee.azimuth,min:-Math.PI,max:Math.PI,step:Qa,onUpdate:J=>te(J,ee.pitch),onDragStart:re,onDragEnd:ne,disabled:r,mapping:Zt,mapTextInput:!0,customLabel:"Az"}),a.jsx(ha,{primaryAxis:"x",secondaryAxis:"y",primaryIndex:0,secondaryIndex:1,primaryValue:ee.azimuth,secondaryValue:ee.pitch,min:-Math.PI,max:Math.PI,step:Qa,onUpdate:(J,ce)=>te(J,ce),onDragStart:re,onDragEnd:ne,disabled:r,onHover:J=>N(J?"xy":null)}),a.jsx(ht,{axisIndex:1,value:ee.pitch,min:-Math.PI/2,max:Math.PI/2,step:Qa,onUpdate:J=>te(ee.azimuth,J),onDragStart:re,onDragEnd:ne,disabled:r,mapping:Zt,mapTextInput:!0,customLabel:"Pt"})]}):z?a.jsxs(a.Fragment,{children:[B&&a.jsx(ht,{...nt("z"),customLabel:"∠"}),a.jsx("div",{className:"flex items-center justify-center px-1",children:a.jsx(fo,{azimuth:k.x,pitch:k.y,onChange:(J,ce)=>{const Se=k.clone();Se.x=J,Se.y=ce,de(0,J),de(1,ce),P(Se),t(Se)},onDragStart:re,onDragEnd:ne,disabled:r,size:56})}),a.jsx("div",{className:"contents",children:a.jsx(ht,{...nt("x"),customLabel:"A"})}),a.jsx(ht,{...nt("y"),customLabel:"P"})]}):a.jsxs(a.Fragment,{children:[a.jsx("div",{className:"contents",children:a.jsx(ht,{...nt("x")})}),j&&a.jsx(ha,{primaryAxis:"x",secondaryAxis:"y",primaryIndex:0,secondaryIndex:1,primaryValue:k.x,secondaryValue:k.y,min:o,max:s,step:i,onUpdate:(J,ce)=>se("x","y",J,ce),onDragStart:re,onDragEnd:ne,disabled:r,onHover:J=>N(J?"xy":null)}),a.jsx(ht,{...nt("y")}),B&&j&&a.jsx(ha,{primaryAxis:"z",secondaryAxis:"y",primaryIndex:2,secondaryIndex:1,primaryValue:Fe.z,secondaryValue:Fe.y,min:o,max:s,step:i,onUpdate:(J,ce)=>se("z","y",J,ce),onDragStart:re,onDragEnd:ne,disabled:r,onHover:J=>N(J?"zy":null)}),B&&a.jsx(ht,{...nt("z")}),E&&j&&a.jsx(ha,{primaryAxis:"x",secondaryAxis:"z",primaryIndex:3,secondaryIndex:2,primaryValue:k.w,secondaryValue:k.z,min:o,max:s,step:i,onUpdate:(J,ce)=>se("w","z",J,ce),onDragStart:re,onDragEnd:ne,disabled:r,onHover:J=>N(J?"wz":null)}),E&&a.jsx(ht,{...nt("w")})]})})})]})},yr=({interactionMode:e="param",trackKeys:n,trackLabels:t,...o})=>{var x,g;const{handleInteractionStart:s,handleInteractionEnd:i}=F(),{sequence:r,isRecording:l,addTrack:c,addKeyframe:d,snapshot:f}=le(),h=w.useRef(o.value);w.useEffect(()=>{h.current=o.value},[(x=o.value)==null?void 0:x.x,(g=o.value)==null?void 0:g.y]);const p=()=>{s(e),l&&n&&(f(),n.forEach((b,M)=>{if(b){const j=t?t[M]:b;r.tracks[b]||c(b,j)}}))},u=()=>{if(l&&n){const b=["x","y"];n.forEach((M,j)=>{if(M){let C=h.current[b[j]];d(M,Math.round(le.getState().currentFrame),C)}})}i()},m=b=>{h.current=new Te(b.x,b.y),o.onChange(new Te(b.x,b.y))},v=()=>{if(!n||n.length===0)return"none";const b=Math.round(le.getState().currentFrame),M=["x","y"];let j=!1,C=!1;return n.forEach((k,P)=>{if(!k)return;const I=r.tracks[k];if(I){const N=I.keyframes.find(T=>Math.abs(T.frame-b)<.5);N&&(j=!0,Math.abs(N.value-h.current[M[P]])>1e-4&&(C=!0))}}),j?C?"keyed-dirty":"keyed":n.some(k=>k&&r.tracks[k])?n.some((P,I)=>{if(!P)return!1;const N=r.tracks[P];if(!N||N.keyframes.length===0)return!1;const T=st(N.keyframes,b,!1);return Math.abs(T-h.current[M[I]])>.001})?"dirty":"partial":"none"},y=o.disabled?void 0:a.jsx(Xt,{status:v(),onClick:()=>{const b=Math.round(le.getState().currentFrame),M=["x","y"],j=v();f(),j==="keyed"?n==null||n.forEach(C=>{if(!C)return;const S=r.tracks[C];if(S){const k=S.keyframes.find(P=>Math.abs(P.frame-b)<.5);k&&le.getState().removeKeyframe(C,k.id)}}):(n==null||n.forEach((C,S)=>{C&&(r.tracks[C]||c(C,t?t[S]:C),d(C,b,h.current[M[S]]))}),n!=null&&n[0]&&Y.emit(me.TRACK_FOCUS,n[0]))}});return a.jsx(Tn,{...o,value:o.value,onChange:m,onDragStart:p,onDragEnd:u,headerRight:y,showDualAxisPads:!0})},sa=({interactionMode:e="param",trackKeys:n,trackLabels:t,...o})=>{var x,g,b;const{handleInteractionStart:s,handleInteractionEnd:i}=F(),{sequence:r,isRecording:l,addTrack:c,addKeyframe:d,snapshot:f}=le(),h=w.useRef(o.value);w.useEffect(()=>{h.current=o.value},[(x=o.value)==null?void 0:x.x,(g=o.value)==null?void 0:g.y,(b=o.value)==null?void 0:b.z]);const p=()=>{s(e),l&&n&&(f(),n.forEach((M,j)=>{if(M){const C=t?t[j]:M;r.tracks[M]||c(M,C)}}))},u=()=>{if(l&&n){const M=["x","y","z"];n.forEach((j,C)=>{if(j){let S=h.current[M[C]];d(j,Math.round(le.getState().currentFrame),S)}})}i()},m=M=>{h.current=new V(M.x,M.y,M.z??0),o.onChange(new V(M.x,M.y,M.z??0))},v=()=>{if(!n||n.length===0)return"none";const M=Math.round(le.getState().currentFrame),j=["x","y","z"];let C=!1,S=!1;return n.forEach((P,I)=>{if(!P)return;const N=r.tracks[P];if(N){const T=N.keyframes.find(L=>Math.abs(L.frame-M)<.5);T&&(C=!0,Math.abs(T.value-h.current[j[I]])>1e-4&&(S=!0))}}),C?S?"keyed-dirty":"keyed":n.some(P=>P&&r.tracks[P])?n.some((I,N)=>{if(!I)return!1;const T=r.tracks[I];if(!T||T.keyframes.length===0)return!1;const L=st(T.keyframes,M,!1);return Math.abs(L-h.current[j[N]])>.001})?"dirty":"partial":"none"},y=o.disabled?void 0:a.jsx(Xt,{status:v(),onClick:()=>{const M=Math.round(le.getState().currentFrame),j=["x","y","z"],C=v();f(),C==="keyed"?n==null||n.forEach(S=>{if(!S)return;const k=r.tracks[S];if(k){const P=k.keyframes.find(I=>Math.abs(I.frame-M)<.5);P&&le.getState().removeKeyframe(S,P.id)}}):(n==null||n.forEach((S,k)=>{S&&(r.tracks[S]||c(S,t?t[k]:S),d(S,M,h.current[j[k]]))}),n!=null&&n[0]&&Y.emit(me.TRACK_FOCUS,n[0]))}});return a.jsx(Tn,{...o,value:o.value,onChange:m,onDragStart:p,onDragEnd:u,headerRight:y,showDualAxisPads:!0})},vr=({interactionMode:e="param",trackKeys:n,trackLabels:t,...o})=>{var x,g,b,M;const{handleInteractionStart:s,handleInteractionEnd:i}=F(),{sequence:r,isRecording:l,addTrack:c,addKeyframe:d,snapshot:f}=le(),h=w.useRef(o.value);w.useEffect(()=>{h.current=o.value},[(x=o.value)==null?void 0:x.x,(g=o.value)==null?void 0:g.y,(b=o.value)==null?void 0:b.z,(M=o.value)==null?void 0:M.w]);const p=()=>{s(e),l&&n&&(f(),n.forEach((j,C)=>{if(j){const S=t?t[C]:j;r.tracks[j]||c(j,S)}}))},u=()=>{if(l&&n){const j=["x","y","z","w"];n.forEach((C,S)=>{if(C){let k=h.current[j[S]];d(C,Math.round(le.getState().currentFrame),k)}})}i()},m=j=>{const C=j;h.current=new Ft(C.x,C.y,C.z??0,C.w??0),o.onChange(h.current)},v=()=>{if(!n||n.length===0)return"none";const j=Math.round(le.getState().currentFrame),C=["x","y","z","w"];let S=!1,k=!1;return n.forEach((I,N)=>{if(!I)return;const T=r.tracks[I];if(T){const L=T.keyframes.find(D=>Math.abs(D.frame-j)<.5);L&&(S=!0,Math.abs(L.value-h.current[C[N]])>1e-4&&(k=!0))}}),S?k?"keyed-dirty":"keyed":n.some(I=>I&&r.tracks[I])?n.some((N,T)=>{if(!N)return!1;const L=r.tracks[N];if(!L||L.keyframes.length===0)return!1;const D=st(L.keyframes,j,!1);return Math.abs(D-h.current[C[T]])>.001})?"dirty":"partial":"none"},y=o.disabled?void 0:a.jsx(Xt,{status:v(),onClick:()=>{const j=Math.round(le.getState().currentFrame),C=["x","y","z","w"],S=v();f(),S==="keyed"?n==null||n.forEach(k=>{if(!k)return;const P=r.tracks[k];if(P){const I=P.keyframes.find(N=>Math.abs(N.frame-j)<.5);I&&le.getState().removeKeyframe(k,I.id)}}):(n==null||n.forEach((k,P)=>{k&&(r.tracks[k]||c(k,t?t[P]:k),d(k,j,h.current[C[P]]))}),n!=null&&n[0]&&Y.emit(me.TRACK_FOCUS,n[0]))}});return a.jsx(Tn,{...o,value:o.value,onChange:m,onDragStart:p,onDragEnd:u,headerRight:y,showDualAxisPads:!0})},Ic=({label:e,value:n,min:t,max:o,step:s=.01,onChange:i,size:r=40,color:l="#22d3ee",tooltip:c,unconstrained:d=!1,defaultValue:f,onDragStart:h,onDragEnd:p})=>{const[u,m]=w.useState(!1),v=w.useRef(0),y=w.useRef(0),x=o-t,g=Math.max(t,Math.min(o,n)),b=Math.max(0,Math.min(1,(g-t)/x)),M=-135+b*270,j=r/2-4,C=r/2,S=r/2,k=2*Math.PI*j,P=k,I=k*(1-b*.75),N=A=>{A.preventDefault(),A.stopPropagation(),m(!0),v.current=A.clientY,y.current=n,h&&h(),A.target.setPointerCapture(A.pointerId)},T=A=>{if(!u)return;A.preventDefault();const R=v.current-A.clientY;let $=.005;A.shiftKey&&($*=5),A.altKey&&($*=.1);const O=R*$*x;let H=y.current+O;d||(H=Math.max(t,Math.min(o,H))),s&&(H=Math.round(H/s)*s),i(H)},L=A=>{m(!1),p&&p(),A.target.releasePointerCapture(A.pointerId)},D=A=>{A.preventDefault(),A.stopPropagation(),f!==void 0&&(h&&h(),i(f),p&&p())};return a.jsxs("div",{className:"flex flex-col items-center gap-1 select-none touch-none group",title:c||`${n.toFixed(2)}`,onDoubleClick:D,children:[a.jsxs("div",{className:"relative cursor-ns-resize",style:{width:r,height:r},onPointerDown:N,onPointerMove:T,onPointerUp:L,children:[a.jsxs("svg",{width:r,height:r,className:"overflow-visible transform rotate-90",children:[a.jsx("circle",{cx:C,cy:S,r:j,fill:"none",stroke:"#333",strokeWidth:"3",strokeDasharray:k,strokeDashoffset:k*.25,strokeLinecap:"round"}),a.jsx("circle",{cx:C,cy:S,r:j,fill:"none",stroke:u?"#fff":l,strokeWidth:"3",strokeDasharray:P,strokeDashoffset:I,strokeLinecap:"round",className:"transition-colors duration-200"})]}),a.jsx("div",{className:"absolute w-1.5 h-1.5 bg-white rounded-full shadow-sm pointer-events-none",style:{top:"50%",left:"50%",marginTop:-3,marginLeft:-3,transform:`rotate(${M}deg) translate(0, -${j}px)`}})]}),a.jsx("div",{className:"h-3 min-w-[30px] flex items-center justify-center bg-black/40 rounded px-1 border border-white/5 hover:border-white/20 transition-colors",children:a.jsx(xr,{value:n,onChange:i,min:d?void 0:t,max:d?void 0:o,step:s,onDragStart:h,onDragEnd:p})}),e&&a.jsx("span",{className:"text-[8px] text-gray-500 font-bold group-hover:text-gray-300 transition-colors -mt-0.5",children:e})]})},Wt=e=>{const{handleInteractionStart:n,handleInteractionEnd:t}=F();return a.jsx(Ic,{...e,onDragStart:()=>{n("param"),e.onDragStart&&e.onDragStart()},onDragEnd:()=>{t(),e.onDragEnd&&e.onDragEnd()}})};class Pc{constructor(){Q(this,"components",new Map)}register(n,t){this.components.has(n)&&console.warn(`ComponentRegistry: Overwriting component '${n}'`),this.components.set(n,t)}get(n){return this.components.get(n)}}const ve=new Pc,Tc={active:"bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.4)]",pending:"bg-amber-500 animate-pulse shadow-[0_0_4px_rgba(245,158,11,0.4)]",off:"bg-red-900",instant:"bg-cyan-500 shadow-[0_0_4px_rgba(6,182,212,0.4)]"},Ea=({status:e,className:n="",title:t})=>a.jsx("span",{className:`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${Tc[e]} ${n}`,title:t}),xn=({label:e,isActive:n,onToggle:t,numericValue:o,onNumericChange:s,options:i,onOptionChange:r,status:l,disabled:c=!1,hideCheckbox:d=!1,description:f,min:h,max:p,step:u})=>{var N;const[m,v]=w.useState(!1),y=w.useRef(null),[x,g]=w.useState({top:0,x:0,side:"right"}),b=()=>{if(f&&y.current){const T=y.current.getBoundingClientRect(),L=T.left<window.innerWidth/2;g({top:T.top+T.height/2,x:L?T.right+6:window.innerWidth-T.left+6,side:L?"left":"right"}),v(!0)}},M=()=>v(!1),j=l==="overridden"?"text-purple-400/60":l==="pending"?"text-amber-400":n?"text-gray-300":"text-gray-500";let C="",S="";switch(l){case"overridden":C="bg-purple-500/50",S="Controlled by Viewport Quality";break;case"pending":C="bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)] animate-pulse",S="Pending Compilation (Click Apply)";break;case"runtime":C="bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.5)]",S="Runtime Uniform (Instant Update)";break;case"synced":default:C=n?"bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.4)]":"bg-gray-700",S="Compiled & Active";break}const k=i&&o!==void 0?(N=i.find(T=>T.value==o))==null?void 0:N.label:"",P=u??(o!==void 0&&Number.isInteger(o)?1:.01);let I=1;return h!==void 0&&p!==void 0&&p>h&&(I=(p-h)*.01/P),a.jsxs(a.Fragment,{children:[a.jsxs("div",{ref:y,className:`flex items-center justify-between px-3 py-1.5 border-b border-white/5 hover:bg-white/5 transition-colors ${c?"opacity-30 pointer-events-none":""}`,onMouseEnter:b,onMouseLeave:M,children:[a.jsxs("div",{className:"flex items-center gap-2.5 flex-1 min-w-0",children:[a.jsx("div",{className:`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-300 ${C}`,title:S}),a.jsxs("span",{className:`text-[10px] font-sans font-medium tracking-tight truncate ${j}`,children:[e," ",l==="pending"&&"*"]})]}),a.jsxs("div",{className:"flex items-center gap-3",children:[i&&r?a.jsxs("div",{className:"relative w-20 h-4 bg-black/40 border border-white/10 rounded-sm hover:border-white/30 transition-colors",children:[a.jsx("select",{className:"absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10",value:o,onChange:T=>r(Number(T.target.value)),children:i.map(T=>a.jsx("option",{value:T.value,children:T.label},T.value))}),a.jsxs("div",{className:"absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none",children:[a.jsx("span",{className:"text-[9px] text-cyan-400 font-mono font-medium truncate pr-1",children:k}),a.jsx("span",{className:"text-[6px] text-gray-500",children:"▼"})]})]}):s&&o!==void 0&&a.jsx("div",{className:"w-10 h-4 bg-black/40 border border-white/10 relative overflow-hidden rounded-sm",children:a.jsx(vt,{value:o,onChange:s,step:P,min:h,max:p,sensitivity:I,highlight:n})}),!d&&a.jsx("input",{type:"checkbox",checked:n,onChange:()=>t(!n),className:`w-3 h-3 appearance-none border rounded-[2px] cursor-pointer transition-colors ${n?l==="pending"?"bg-amber-600 border-amber-500":"bg-cyan-600 border-cyan-500":"bg-black/40 border-gray-600 hover:border-gray-400"}`})]})]}),m&&Ht.createPortal(a.jsx("div",{className:"fixed z-[9999] pointer-events-none flex items-center animate-fade-in",style:{top:x.top,[x.side==="left"?"left":"right"]:x.x,transform:"translateY(-50%)"},children:a.jsxs("div",{className:"bg-black text-white text-[9px] px-2 py-1 rounded border border-white/20 shadow-xl whitespace-nowrap",children:[f,x.side==="left"?a.jsxs(a.Fragment,{children:[a.jsx("div",{className:"absolute top-1/2 -left-1 -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-white/20"}),a.jsx("div",{className:"absolute top-1/2 -left-[3px] -translate-y-1/2 border-t-[3px] border-b-[3px] border-r-[3px] border-t-transparent border-b-transparent border-r-black"})]}):a.jsxs(a.Fragment,{children:[a.jsx("div",{className:"absolute top-1/2 -right-1 -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-white/20"}),a.jsx("div",{className:"absolute top-1/2 -right-[3px] -translate-y-1/2 border-t-[3px] border-b-[3px] border-l-[3px] border-t-transparent border-b-transparent border-l-black"})]})]})}),document.body)]})},Ec=Ue.lazy(()=>Et(()=>import("./AdvancedGradientEditor-coWKV4sO.js"),__vite__mapDeps([0,1,2,3,4,5]),import.meta.url)),La=(e,n,t,o)=>{if(e.or)return e.or.some(r=>La(r,n,t,o));if(e.and)return e.and.every(r=>La(r,n,t,o));let s=e.param||o,i;if(s&&s.startsWith("$")){const r=s.slice(1);if(r.includes(".")){const l=r.split(".");let c=t;for(const d of l){if(c==null){c=void 0;break}c=c[d]}i=c}else i=t[r]}else if(s)i=n[s];else return!0;if(e.eq===void 0&&e.neq===void 0&&e.gt===void 0&&e.lt===void 0&&e.bool===void 0)return typeof i=="boolean"?i:typeof i=="number"?i>0:!!i;if(e.eq!==void 0||e.neq!==void 0){let r=i;if(typeof i=="object"&&i&&i.getHexString&&(r="#"+i.getHexString()),e.eq!==void 0)return r==e.eq;if(e.neq!==void 0)return r!=e.neq}return e.bool!==void 0?!!i===e.bool:e.gt!==void 0?i>e.gt:e.lt!==void 0?i<e.lt:!0},ta=(e,n,t,o)=>{if(!e){if(o){const s=n[o];return typeof s=="boolean"?s:typeof s=="number"?s>0:!!s}return!0}return Array.isArray(e)?e.every(s=>La(s,n,t,o)):La(e,n,t,o)},Lc=e=>{const n=e.min??0,t=e.max??1;if(e.scale==="pi")return{min:n/Math.PI,max:t/Math.PI,toSlider:o=>o/Math.PI,fromSlider:o=>o*Math.PI};if(!(!e.scale||e.scale==="linear")){if(e.scale==="square")return{min:0,max:100,toSlider:o=>Math.sqrt((o-n)/(t-n))*100,fromSlider:o=>n+Math.pow(o/100,2)*(t-n)};if(e.scale==="log"){const o=Math.max(1e-6,n);return{min:0,max:100,toSlider:s=>s<=n?0:(Math.log10(Math.max(o,s))-Math.log10(o))/(Math.log10(t)-Math.log10(o))*100,fromSlider:s=>s<=0?n:Math.pow(10,Math.log10(o)+s/100*(Math.log10(t)-Math.log10(o)))}}}},ie=({featureId:e,groupFilter:n,className:t,isDisabled:o=!1,disabledParams:s=[],excludeParams:i=[],whitelistParams:r=[],variant:l="default",forcedState:c,onChangeOverride:d,pendingChanges:f})=>{var U;const h=oe.get(e),p=F(G=>G[e]),u=c||p,m=F(G=>G.liveModulations),v=Ue.useRef(F.getState());v.current=F.getState();const y=v.current,x=y,g=F(G=>G.advancedMode),b=F(G=>G.openContextMenu),M=F(G=>G.showHints),[j,C]=w.useState(null),[S,k]=w.useState(new Set),P=w.useMemo(()=>`set${e.charAt(0).toUpperCase()+e.slice(1)}`,[e]),I=(G,E)=>{if(o||s.includes(G))return;if(d){d(G,E);return}const B=h.params[G];if((B==null?void 0:B.onUpdate)==="compile"){F.getState().movePanel("Engine","left"),setTimeout(()=>Y.emit("engine_queue",{featureId:e,param:G,value:E}),50);return}if(B!=null&&B.confirmation&&E===!0&&u[G]===!1){C({key:G,value:E,message:B.confirmation});return}const z=x[P];if(z)if(B!=null&&B.composeFrom&&E&&typeof E=="object"){const W=B.composeFrom,Z={[W[0]]:E.x,[W[1]]:E.y};"z"in E&&W[2]&&(Z[W[2]]=E.z),"w"in E&&W[3]&&(Z[W[3]]=E.w),z(Z)}else z({[G]:E})},N=()=>{if(!j)return;if(d){d(j.key,j.value),C(null);return}const G=x[P];G&&(Y.emit("is_compiling","Optimizing Shader..."),setTimeout(()=>{G({[j.key]:j.value}),C(null)},50))},T=G=>{if(o)return;const E=Ye(G.currentTarget);E.length>0&&(G.preventDefault(),G.stopPropagation(),b(G.clientX,G.clientY,[],E))},L=(G,E)=>{if(!(o||s.includes(E))&&G.target.files&&G.target.files[0]){const B=new FileReader;B.onload=z=>{var W;(W=z.target)!=null&&W.result&&I(E,z.target.result)},B.readAsDataURL(G.target.files[0])}};if(!h||!u)return null;const D=(G,E)=>{var W,Z,X,ee,te,re,ne,xe,Ie,de;let B;if(E.composeFrom){const ae=E.composeFrom;ae.length===3?B=new V(u[ae[0]]??0,u[ae[1]]??0,u[ae[2]]??0):ae.length===2&&(B=new Te(u[ae[0]]??0,u[ae[1]]??0))}else B=u[G]??E.default;const z=o||s.includes(G);if(l==="dense"){let ae="runtime";if(E.onUpdate==="compile"&&(ae=f&&f[`${e}.${G}`]!==void 0?"pending":"synced"),E.type==="boolean")return a.jsx(xn,{label:E.label,description:E.description,isActive:!!B,onToggle:se=>I(G,se),status:ae,disabled:z});if(E.type==="float"||E.type==="int")return a.jsx(xn,{label:E.label,description:E.description,isActive:!0,onToggle:()=>{},numericValue:B,onNumericChange:se=>I(G,se),options:E.options,onOptionChange:E.options?se=>I(G,se):void 0,status:ae,disabled:z,hideCheckbox:!0,step:E.step,min:E.min,max:E.max})}if(E.type==="color"){let ae=B;return typeof B=="object"&&B.getHexString&&(ae="#"+B.getHexString()),E.layout==="embedded"||E.parentId?a.jsx("div",{className:`mb-px pr-1 ${z?"opacity-30 pointer-events-none":""}`,children:a.jsx($a,{color:ae,onColorChange:se=>I(G,se)})}):a.jsxs("div",{className:`flex items-center justify-between px-3 py-1 bg-gray-800/20 mb-px ${z?"opacity-30 pointer-events-none":""}`,children:[a.jsx(ze,{children:E.label}),a.jsx(Ta,{color:ae,onChange:se=>I(G,se),label:E.label})]})}if(E.type==="boolean"){const ae=E.onUpdate==="compile"?a.jsx("span",{className:"ml-1.5",title:B?"Compiled & Active":"Compiled Off — toggle to queue change",children:a.jsx(Ea,{status:B?"active":"off"})}):null;return E.ui==="checkbox"?a.jsx("div",{className:z?"opacity-30 pointer-events-none":"",children:a.jsx(Ke,{label:E.label,value:B,onChange:se=>I(G,se),disabled:z,variant:"dense",labelSuffix:ae})}):a.jsx("div",{children:a.jsx(Ke,{label:E.label,value:B,onChange:se=>I(G,se),options:E.options,disabled:z,labelSuffix:ae})})}if(E.type==="float"||E.type==="int"){const ae=E.onUpdate==="compile"?a.jsx("span",{className:"ml-1.5",title:"Compile-time setting — changes queue to Engine Panel",children:a.jsx(Ea,{status:"active"})}):null;if(E.options)return a.jsx("div",{className:`mb-px ${z?"opacity-30 pointer-events-none":""}`,children:a.jsx(qt,{label:E.label,value:B,onChange:Fe=>I(G,Fe),options:E.options,fullWidth:!0,labelSuffix:ae})});if(E.ui==="knob")return a.jsx("div",{className:E.layout==="half"?"flex flex-col items-center justify-center py-2":"flex justify-center p-2",children:a.jsx(Wt,{label:E.label,value:B,min:E.min??0,max:E.max??1,step:E.step,onChange:Fe=>I(G,Fe),color:B>(E.min??0)?"#22d3ee":"#444",size:40})});const se=Lc(E);let je=E.format?E.format(B):void 0;E.scale==="pi"&&(je=`${(B/Math.PI).toFixed(2)}π`);let Ne=E.max??1;E.dynamicMaxRef&&u[E.dynamicMaxRef]!==void 0&&(Ne=u[E.dynamicMaxRef]);const ye=`${e}.${G}`,K=m[ye],ue=B!==E.default||!!E.condition,Ee=E.condition?"!animate-none !overflow-visible":"";return a.jsx("div",{children:a.jsx(fe,{label:E.label,value:B,min:E.min??0,max:Ne,step:E.step??.01,onChange:Fe=>I(G,Fe),highlight:ue,trackId:ye,liveValue:K,defaultValue:E.default,customMapping:se,overrideInputText:je,mapTextInput:E.scale==="pi",disabled:z,labelSuffix:ae,className:Ee})})}if(E.type==="vec2"){const ae=(B==null?void 0:B.x)??((W=E.default)==null?void 0:W.x)??0,se=(B==null?void 0:B.y)??((Z=E.default)==null?void 0:Z.y)??0;return a.jsx("div",{className:`mb-px ${z?"opacity-30 pointer-events-none":""}`,children:a.jsx(yr,{label:E.label,value:new Te(ae,se),min:E.min??-1,max:E.max??1,onChange:je=>I(G,{x:je.x,y:je.y}),mode:E.mode,scale:E.scale,linkable:E.linkable})})}if(E.type==="vec3"){const ae=(B==null?void 0:B.x)??((X=E.default)==null?void 0:X.x)??0,se=(B==null?void 0:B.y)??((ee=E.default)==null?void 0:ee.y)??0,je=(B==null?void 0:B.z)??((te=E.default)==null?void 0:te.z)??0,Ne=new V(ae,se,je),ye=E.composeFrom?E.composeFrom.map(ue=>`${e}.${ue}`):[`${e}.${G}_x`,`${e}.${G}_y`,`${e}.${G}_z`],K=E.composeFrom?void 0:[`${E.label} X`,`${E.label} Y`,`${E.label} Z`];return a.jsx("div",{className:`mb-px ${z?"opacity-30 pointer-events-none":""}`,children:a.jsx(sa,{label:E.label,value:Ne,min:E.min??-10,max:E.max??10,step:E.step,onChange:ue=>I(G,ue),disabled:z,trackKeys:ye,trackLabels:K,mode:E.mode,scale:E.scale,linkable:E.linkable})})}if(E.type==="vec4"){const ae=(B==null?void 0:B.x)??((re=E.default)==null?void 0:re.x)??0,se=(B==null?void 0:B.y)??((ne=E.default)==null?void 0:ne.y)??0,je=(B==null?void 0:B.z)??((xe=E.default)==null?void 0:xe.z)??0,Ne=(B==null?void 0:B.w)??((Ie=E.default)==null?void 0:Ie.w)??0,ye=new Ft(ae,se,je,Ne),K=E.composeFrom?E.composeFrom.map(Ee=>`${e}.${Ee}`):[`${e}.${G}_x`,`${e}.${G}_y`,`${e}.${G}_z`,`${e}.${G}_w`],ue=E.composeFrom?void 0:[`${E.label} X`,`${E.label} Y`,`${E.label} Z`,`${E.label} W`];return a.jsx("div",{className:`mb-px ${z?"opacity-30 pointer-events-none":""}`,children:a.jsx(vr,{label:E.label,value:ye,min:E.min??-10,max:E.max??10,step:E.step,onChange:Ee=>I(G,Ee),disabled:z,trackKeys:K,trackLabels:ue,mode:E.mode,scale:E.scale,linkable:E.linkable})})}if(E.type==="image"){const ae=((de=E.linkedParams)==null?void 0:de.colorSpace)||"colorSpace",se=h.params[ae],je=u[ae],Ne=()=>{if(se&&typeof je=="number"){const K=(je+1)%3;I(ae,K)}},ye=je===1?"LIN":je===2?"ACES":"sRGB";return a.jsx("div",{className:`mb-px ${z?"opacity-30 pointer-events-none":""}`,children:a.jsxs("div",{className:"bg-gray-800/30 border border-white/5 text-center overflow-hidden relative group",children:[a.jsx("input",{type:"file",accept:"image/*,.hdr,.exr",onChange:K=>L(K,G),className:"hidden",id:`file-input-${G}`}),a.jsx("label",{htmlFor:`file-input-${G}`,className:"block bg-cyan-900/40 hover:bg-cyan-800/60 text-cyan-300 w-full py-2 text-xs font-bold transition-colors cursor-pointer",children:B?"Replace Texture":E.label}),se&&a.jsx("div",{className:"absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-bold text-gray-500 bg-black/50 px-1.5 py-0.5 rounded cursor-pointer hover:text-white hover:bg-cyan-900/80 transition-colors select-none",onClick:K=>{K.preventDefault(),Ne()},title:"Input Color Profile: sRGB / Linear / ACES",children:ye})]})})}return E.type==="gradient"?a.jsx("div",{className:`pr-1 ${z?"opacity-30 pointer-events-none":""}`,children:a.jsx(w.Suspense,{fallback:null,children:a.jsx(Ec,{value:B,onChange:ae=>I(G,ae)})})}):null},A=(G,E=!1)=>{var xe,Ie;const B=h.params[G];if(!B||B.hidden||i.includes(G)||!ta(B.condition,u,y,B.parentId)||B.isAdvanced&&!g)return null;const z=D(G,B),W=Object.keys(h.params).filter(de=>h.params[de].parentId===G),Z=W.map(de=>A(de)).filter(Boolean);(xe=h.customUI)==null||xe.forEach(de=>{if(de.parentId!==G||n&&de.group!==n||!ta(de.condition,u,y,de.parentId))return;const ae=ve.get(de.componentId);ae&&Z.push(a.jsx("div",{children:a.jsx(ae,{featureId:e,sliceState:u,actions:x,...de.props})},`custom-${de.componentId}`))});const X=E?"flex-1 min-w-0":"flex flex-col",ee=((Ie=h.customUI)==null?void 0:Ie.some(de=>de.parentId===G))??!1,te=W.length>0||ee,re=M&&B.description&&!o&&l!=="dense"&&(B.type!=="boolean"||(u==null?void 0:u[G]));re&&te&&Z.unshift(a.jsx("div",{children:a.jsx("p",{className:"px-3 py-1.5 text-[9px] text-gray-600 leading-tight bg-white/[0.06] hover:text-gray-300 transition-colors cursor-default",children:B.description})},`desc-${G}`));const ne=Z.length>0;return a.jsxs("div",{className:`w-full ${X} ${te?"rounded-t-sm relative":""}`,children:[te&&a.jsx("div",{className:`absolute inset-0 bg-white/[0.06] rounded-t-sm pointer-events-none transition-opacity ${ne?"opacity-100":"opacity-0"}`}),z,re&&!te&&a.jsx("p",{className:"px-3 py-1.5 text-[9px] text-gray-600 leading-tight bg-white/[0.06] hover:text-gray-300 transition-colors cursor-default",children:B.description}),Z.length>0&&a.jsxs("div",{className:"flex flex-col",children:[Z.map((de,ae)=>{const se=ae===Z.length-1;return a.jsxs("div",{className:"flex",children:[a.jsx("div",{className:`w-2 shrink-0 self-stretch border-l border-white/20 bg-white/[0.12] ${se?"border-b border-b-white/20 rounded-bl-lg":""}`}),a.jsxs("div",{className:`flex-1 min-w-0 relative ${se?"border-b border-b-white/20":""}`,children:[a.jsx("div",{className:"absolute inset-0 bg-black/20 pointer-events-none z-10"}),de]})]},ae)}),a.jsx("div",{className:"h-2",style:{background:"linear-gradient(to bottom, transparent, rgba(255,255,255,0.08))"}})]})]},G)},R=Object.keys(h.params).filter(G=>h.params[G].parentId?!1:r&&r.length>0?r.includes(G):n?h.params[G].group===n:!0),$=G=>{const E=[];for(let B=0;B<G.length;B++){const z=G[B],W=h.params[z];if(!(W.hidden||i.includes(z)||!ta(W.condition,u,y))){if(W.layout==="half"&&l!=="dense"){let Z=G[B+1],X=Z?h.params[Z]:null;if(X&&X.layout==="half"&&!X.hidden&&!i.includes(Z)&&ta(X.condition,u,y)){E.push(a.jsxs("div",{className:"flex gap-0.5 mb-px",children:[A(z,!0),A(Z,!0)]},`${z}-${Z}`)),B++;continue}}E.push(A(z))}}return E},O=G=>{k(E=>{const B=new Set(E);return B.has(G)?B.delete(G):B.add(G),B})},H=h.groups,q=H&&!n&&!(r!=null&&r.length)&&Object.values(H).some(G=>G.collapsible),_=[];if(q&&H){const G=[],E={},B=[];for(const z of R){const W=h.params[z].group;W&&H[W]?(E[W]||(E[W]=[],G.push(W)),E[W].push(z)):B.push(z)}_.push(...$(B));for(const z of G){const W=H[z],Z=E[z];S.has(z);const X=$(Z);if(!X.every(ee=>ee===null))if(W.collapsible){const ee=X.filter(Boolean);_.push(a.jsx(At,{label:W.label,open:!S.has(z),onToggle:()=>O(z),defaultOpen:!0,variant:"panel",children:a.jsxs("div",{className:"flex flex-col",children:[ee.map((te,re)=>a.jsx("div",{children:te},re)),a.jsx("div",{className:"ml-[9px] border-b border-white/10 rounded-bl mb-0.5"})]})},`group-${z}`))}else _.push(...X)}}else _.push(...$(R));return(U=h.customUI)==null||U.forEach(G=>{if(r&&r.length>0||G.parentId||n&&G.group!==n||!ta(G.condition,u,y))return;const E=ve.get(G.componentId);E&&_.push(a.jsx("div",{className:`flex flex-col mb-px ${o?"grayscale opacity-30 pointer-events-none":""}`,children:a.jsx(E,{featureId:e,sliceState:u,actions:x,...G.props})},`custom-${G.componentId}`))}),a.jsxs("div",{className:`flex flex-col relative ${t||""}`,onContextMenu:T,children:[_,j&&a.jsx("div",{className:"absolute inset-0 z-50 animate-pop-in",children:a.jsxs("div",{className:"bg-black/95 border border-white/20 rounded shadow-2xl overflow-hidden h-full flex flex-col",children:[a.jsxs("div",{className:"flex items-center gap-2 p-2 border-b border-white/10 bg-white/5",children:[a.jsx(Yt,{}),a.jsx(ze,{color:"text-gray-300",children:"Warning"})]}),a.jsxs("div",{className:"p-3 flex-1 flex flex-col justify-between",children:[a.jsx("p",{className:"text-[10px] text-gray-400 leading-relaxed whitespace-pre-wrap",children:j.message}),a.jsxs("div",{className:"flex gap-1 mt-4",children:[a.jsx("button",{onClick:()=>C(null),className:"flex-1 py-1.5 bg-gray-800 text-gray-300 text-[9px] font-bold rounded border border-white/10 hover:bg-gray-700 transition-colors",children:"Cancel"}),a.jsx("button",{onClick:N,className:"flex-1 py-1.5 bg-cyan-900/50 text-cyan-300 text-[9px] font-bold rounded border border-cyan-500/30 hover:bg-cyan-900 transition-colors",children:"Confirm"})]})]})]})})]})},Nc=()=>{const e=F(r=>{var l;return(l=r.lighting)==null?void 0:l.shadows}),n=F(r=>{var l;return(l=r.lighting)==null?void 0:l.ptStochasticShadows}),t=F(r=>{var l;return(l=r.lighting)==null?void 0:l.areaLights}),o=F(r=>r.setLighting),s=F(r=>r.handleInteractionStart),i=F(r=>r.handleInteractionEnd);return a.jsx(Tt,{width:"w-52",children:a.jsxs("div",{className:"relative space-y-2",children:[a.jsxs("div",{className:"flex items-center justify-between border-b border-white/10 pb-2 px-1",children:[a.jsx(ze,{children:"Shadows"}),a.jsxs("div",{className:"flex items-center gap-1.5",children:[n&&a.jsx("button",{onClick:()=>{s("param"),o({areaLights:!t}),i()},className:`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${t?"bg-purple-500/20 text-purple-300 border-purple-500/50":"bg-gray-800 text-gray-500 border-gray-600"}`,title:"Toggle stochastic area light shadows",children:"Area"}),a.jsx("button",{onClick:()=>{s("param"),o({shadows:!e}),i()},className:`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${e?"bg-yellow-500/20 text-yellow-300 border-yellow-500/50":"bg-gray-800 text-gray-500 border-gray-600"}`,children:e?"ON":"OFF"})]})]}),e&&a.jsx("div",{className:"space-y-1",children:a.jsx(ie,{featureId:"lighting",groupFilter:"shadows"})})]})})},mt=new V,na=new V,Lt=new V,po=5e4;function Dc(){const e=ra(),n=oa();return!e||!n?null:{camera:e,canvas:n,width:n.clientWidth,height:n.clientHeight}}function wr(e,n,t,o){if(na.copy(e).applyMatrix4(n.matrixWorldInverse),na.z>-5e-5)return null;mt.copy(e).project(n);const s=t/2,i=o/2,r=mt.x*s+s,l=-mt.y*i+i;return Math.abs(r)>po||Math.abs(l)>po?null:{x:r,y:l,z:na.z,isBehindCamera:!1}}function lt(e,n,t,o){return mt.copy(e).project(n),{x:(mt.x*.5+.5)*t,y:(-mt.y*.5+.5)*o,behind:mt.z>1}}function _c(e,n,t,o){return Lt.set(e.x,e.y,e.z),n?Lt.applyQuaternion(t.quaternion).add(t.position):(Lt.x-=o.x+o.xL,Lt.y-=o.y+o.yL,Lt.z-=o.z+o.zL),Lt.clone()}function Sr(e,n,t){const o=e.x-n.x+(e.xL-n.xL),s=e.y-n.y+(e.yL-n.yL),i=e.z-n.z+(e.zL-n.zL);return t?t.set(o,s,i):new V(o,s,i)}function Ja(e,n,t,o,s,i,r){const l=Lt.copy(e).addScaledVector(n,t);if(na.copy(l).applyMatrix4(o.matrixWorldInverse),na.z>-5e-5)return null;mt.copy(l).project(o);const c=mt.x*i/2+i/2,d=-(mt.y*r/2)+r/2;return{x:c-s.x,y:d-s.y}}const Fc=.15,Ac=.4,We={X:"#ff4444",Y:"#44ff44",Z:"#4444ff",Hover:"#ffffff",PlaneXY:"#4444ff",PlaneXZ:"#44ff44",PlaneYZ:"#ff4444"},zc=Ue.forwardRef((e,n)=>{const{id:t,color:o,onDragStart:s,children:i}=e,r=w.useRef(null),[l,c]=w.useState(null),d=w.useRef(new V),f=u=>c({part:u}),h=()=>c(null),p=(u,m)=>{s(u,m,d.current.clone())};return Ue.useImperativeHandle(n,()=>({hide:()=>{r.current&&(r.current.style.display="none")},update:(u,m,v,y,x)=>{const g=r.current;if(!g)return;d.current.copy(u),m.updateMatrixWorld();const b=wr(u,m,v,y);if(!b){g.style.display="none";return}g.style.display="flex",g.style.transform=`translate3d(${b.x}px, ${b.y}px, 0)`;const j=u.distanceTo(m.position)*Fc,C=new V(1,0,0),S=new V(0,1,0),k=new V(0,0,1);x&&(C.applyQuaternion(x),S.applyQuaternion(x),k.applyQuaternion(x));const P=Ja(u,C,j,m,b,v,y),I=Ja(u,S,j,m,b,v,y),N=Ja(u,k,j,m,b,v,y),T=(D,A)=>{g.querySelectorAll(`.${D}`).forEach($=>{A?($.setAttribute("x2",String(A.x)),$.setAttribute("y2",String(A.y)),$.setAttribute("visibility","visible")):$.setAttribute("visibility","hidden")})};T("axis-x-line",P),T("axis-y-line",I),T("axis-z-line",N);const L=(D,A,R)=>{const $=g.querySelector(`.${D}`);if($)if(A&&R){const O=Ac,H=A.x*O,q=A.y*O,_=R.x*O,U=R.y*O,G=H+_,E=q+U;$.setAttribute("d",`M0,0 L${H},${q} L${G},${E} L${_},${U} Z`),$.setAttribute("visibility","visible")}else $.setAttribute("visibility","hidden")};L("plane-xy",P,I),L("plane-xz",P,N),L("plane-yz",I,N)}})),a.jsxs("div",{ref:r,className:"absolute flex items-center justify-center w-0 h-0 pointer-events-auto",style:{display:"none",willChange:"transform"},children:[a.jsxs("svg",{className:"absolute overflow-visible pointer-events-none",style:{left:0,top:0},children:[a.jsxs("defs",{children:[a.jsx("marker",{id:`arrow-${t}-x`,markerWidth:"6",markerHeight:"6",refX:"5",refY:"3",orient:"auto",children:a.jsx("path",{d:"M0,0 L0,6 L6,3 z",fill:(l==null?void 0:l.part)==="axis-x"?We.Hover:We.X})}),a.jsx("marker",{id:`arrow-${t}-y`,markerWidth:"6",markerHeight:"6",refX:"5",refY:"3",orient:"auto",children:a.jsx("path",{d:"M0,0 L0,6 L6,3 z",fill:(l==null?void 0:l.part)==="axis-y"?We.Hover:We.Y})}),a.jsx("marker",{id:`arrow-${t}-z`,markerWidth:"6",markerHeight:"6",refX:"5",refY:"3",orient:"auto",children:a.jsx("path",{d:"M0,0 L0,6 L6,3 z",fill:(l==null?void 0:l.part)==="axis-z"?We.Hover:We.Z})})]}),a.jsx("path",{className:"plane-xy cursor-move pointer-events-auto transition-opacity duration-150",fill:(l==null?void 0:l.part)==="plane-xy"?We.Hover:We.PlaneXY,fillOpacity:"0.3",stroke:"none",onPointerDown:u=>p(u,"plane-xy"),onPointerEnter:()=>f("plane-xy"),onPointerLeave:h}),a.jsx("path",{className:"plane-xz cursor-move pointer-events-auto transition-opacity duration-150",fill:(l==null?void 0:l.part)==="plane-xz"?We.Hover:We.PlaneXZ,fillOpacity:"0.3",stroke:"none",onPointerDown:u=>p(u,"plane-xz"),onPointerEnter:()=>f("plane-xz"),onPointerLeave:h}),a.jsx("path",{className:"plane-yz cursor-move pointer-events-auto transition-opacity duration-150",fill:(l==null?void 0:l.part)==="plane-yz"?We.Hover:We.PlaneYZ,fillOpacity:"0.3",stroke:"none",onPointerDown:u=>p(u,"plane-yz"),onPointerEnter:()=>f("plane-yz"),onPointerLeave:h}),a.jsxs("g",{onPointerEnter:()=>f("axis-z"),onPointerLeave:h,children:[a.jsx("line",{className:"axis-z-line pointer-events-none transition-all duration-150",x1:"0",y1:"0",x2:"0",y2:"0",stroke:(l==null?void 0:l.part)==="axis-z"?We.Hover:We.Z,strokeWidth:"2",markerEnd:`url(#arrow-${t}-z)`}),a.jsx("line",{className:"axis-z-line cursor-pointer pointer-events-auto",x1:"0",y1:"0",x2:"0",y2:"0",stroke:"rgba(0,0,0,0)",strokeWidth:"12",onPointerDown:u=>p(u,"axis-z")})]}),a.jsxs("g",{onPointerEnter:()=>f("axis-y"),onPointerLeave:h,children:[a.jsx("line",{className:"axis-y-line pointer-events-none transition-all duration-150",x1:"0",y1:"0",x2:"0",y2:"0",stroke:(l==null?void 0:l.part)==="axis-y"?We.Hover:We.Y,strokeWidth:"2",markerEnd:`url(#arrow-${t}-y)`}),a.jsx("line",{className:"axis-y-line cursor-pointer pointer-events-auto",x1:"0",y1:"0",x2:"0",y2:"0",stroke:"rgba(0,0,0,0)",strokeWidth:"12",onPointerDown:u=>p(u,"axis-y")})]}),a.jsxs("g",{onPointerEnter:()=>f("axis-x"),onPointerLeave:h,children:[a.jsx("line",{className:"axis-x-line pointer-events-none transition-all duration-150",x1:"0",y1:"0",x2:"0",y2:"0",stroke:(l==null?void 0:l.part)==="axis-x"?We.Hover:We.X,strokeWidth:"2",markerEnd:`url(#arrow-${t}-x)`}),a.jsx("line",{className:"axis-x-line cursor-pointer pointer-events-auto",x1:"0",y1:"0",x2:"0",y2:"0",stroke:"rgba(0,0,0,0)",strokeWidth:"12",onPointerDown:u=>p(u,"axis-x")})]}),a.jsx("circle",{cx:"0",cy:"0",r:"6",fill:o,stroke:"white",strokeWidth:"2",className:`cursor-move pointer-events-auto transition-all duration-150 ${(l==null?void 0:l.part)==="free"?"stroke-cyan-400 r-[8px]":""}`,onPointerDown:u=>p(u,"free"),onPointerEnter:()=>f("free"),onPointerLeave:h})]}),i]})}),bn={index:-1},Oc=(e,n,t)=>_c(e.position,!!e.fixed,n,t),mo=(e,n,t,o)=>(n.updateMatrixWorld(),wr(e,n,t,o)),$c=({isMobileMode:e,vibrate:n})=>{var T;const t=F(),o=t.lighting,{openContextMenu:s,handleInteractionStart:i,handleInteractionEnd:r}=F(),[l,c]=w.useState(null),[d,f]=w.useState(null),[h,p]=w.useState(!1),[u,m]=w.useState(!1),v=w.useRef(null),y=w.useRef(null),x=w.useRef(null),g=w.useRef(null);w.useEffect(()=>(bn.index=l??d??-1,()=>{bn.index=-1}),[l,d]),w.useEffect(()=>{const L=D=>{const A=D.target;y.current&&!y.current.contains(A)&&!A.closest(".shadow-toggle-btn")&&p(!1),e&&d!==null&&!A.closest(".light-orb-wrapper")&&f(null),u&&g.current&&!g.current.contains(A)&&!A.closest(".expand-trigger")&&m(!1)};return document.addEventListener("mousedown",L),document.addEventListener("touchstart",L),()=>{document.removeEventListener("mousedown",L),document.removeEventListener("touchstart",L)}},[d,e,u]);const b=(L,D)=>{L.preventDefault(),L.stopPropagation(),s(L.clientX,L.clientY,[],D)},M=(L,D)=>{L.preventDefault(),L.stopPropagation();const A=kt(t.lighting,D),R=[{label:`Light ${D+1}`,isHeader:!0},{label:"Enabled",checked:A.visible,action:()=>{i("param"),t.updateLight({index:D,params:{visible:!A.visible}}),r()}},{label:"Type",isHeader:!0},{label:"Point",checked:A.type==="Point",action:()=>{i("param"),t.updateLight({index:D,params:{type:"Point"}}),r()}},{label:"Directional (Sun)",checked:A.type==="Directional",action:()=>{i("param"),t.updateLight({index:D,params:{type:"Directional"}}),r()}},{label:"Intensity Unit",isHeader:!0},{label:"Raw (Linear)",checked:(A.intensityUnit??"raw")==="raw",action:()=>{if(i("param"),A.intensityUnit==="ev"){const $=Math.pow(2,A.intensity);t.updateLight({index:D,params:{intensityUnit:"raw",intensity:Math.round($*100)/100}})}else t.updateLight({index:D,params:{intensityUnit:"raw"}});r()}},{label:"Exposure (EV)",checked:A.intensityUnit==="ev",action:()=>{if(i("param"),(A.intensityUnit??"raw")==="raw"){const $=A.intensity>0?Math.max(-4,Math.min(10,Math.log2(A.intensity))):0;t.updateLight({index:D,params:{intensityUnit:"ev",intensity:Math.round($*10)/10}})}else t.updateLight({index:D,params:{intensityUnit:"ev"}});r()}},{label:"Falloff Curve",isHeader:!0},{label:"Quadratic (Smooth)",checked:(A.falloffType??"Quadratic")==="Quadratic",action:()=>{i("param"),t.updateLight({index:D,params:{falloffType:"Quadratic"}}),r()}},{label:"Linear (Artistic)",checked:A.falloffType==="Linear",action:()=>{i("param"),t.updateLight({index:D,params:{falloffType:"Linear"}}),r()}}];s(L.clientX,L.clientY,R,["panel.light"])},j=L=>{const D=kt(t.lighting,L);if(!e){n(5),i("param"),t.updateLight({index:L,params:{visible:!D.visible}}),r();return}D.visible?d!==L?(n(5),f(L)):(n([10,30,10]),i("param"),t.updateLight({index:L,params:{visible:!1}}),r(),f(null)):(n(10),i("param"),t.updateLight({index:L,params:{visible:!0}}),r(),f(null))},C=(L,D)=>{e||D.nativeEvent.pointerType==="touch"||(v.current&&clearTimeout(v.current),c(L))},S=()=>{e||(v.current=window.setTimeout(()=>{c(null)},400))},k=L=>{n(5);const D=I[L];t.setDraggedLight((D==null?void 0:D.id)??null),e||(f(null),c(null))},P=()=>{t.addLight()},I=((T=t.lighting)==null?void 0:T.lights)||[],N=L=>{const D=I[L];return D?a.jsxs("div",{className:"relative light-orb-wrapper flex justify-center w-8 h-8",onMouseEnter:A=>C(L,A),onMouseLeave:S,onContextMenu:A=>M(A,L),children:[a.jsx(wc,{index:L,color:D.color,active:D.visible,type:D.type,rotation:D.rotation,onClick:()=>j(L),onDragStart:()=>k(L)}),t.draggedLightIndex!==D.id&&(l===L||d===L)&&a.jsx(Sc,{index:L})]},L):L<Ce?a.jsx("div",{className:"flex justify-center items-center w-8 h-8",children:a.jsx("button",{onClick:P,className:"w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-gray-500 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-white/5 transition-all",title:"Add Light",children:a.jsx(Da,{})})},L):a.jsx("div",{className:"w-8 h-8"},L)};return a.jsxs("div",{ref:x,className:"absolute left-1/2 -translate-x-1/2 flex items-center bg-white/5 pr-2 pl-6 py-1.5 rounded-full border border-white/5 shadow-inner z-[65]",children:[a.jsxs("div",{className:"relative",children:[a.jsxs("div",{className:`flex items-center gap-6 transition-opacity duration-200 ${u?"opacity-0 pointer-events-none":"opacity-100"}`,children:[[0,1,2].map(L=>N(L)),a.jsx("button",{onClick:()=>{n(5),m(!0)},className:"expand-trigger w-5 h-5 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors ml-[-8px]",title:"Expand Light Studio",children:a.jsx(la,{})})]}),u&&a.jsx("div",{ref:g,className:"absolute top-[-20px] left-[-20px] bg-black/95 border border-white/20 p-5 rounded-2xl shadow-2xl animate-fade-in z-[80]",children:a.jsxs("div",{className:"grid grid-cols-3 gap-6",children:[Array.from({length:8}).map((L,D)=>N(D)),a.jsx("div",{className:"flex justify-center items-center w-8 h-8",children:a.jsx("button",{onClick:()=>m(!1),className:"w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-colors",title:"Collapse",children:a.jsx(ts,{})})})]})})]}),a.jsx("div",{className:"h-6 w-px bg-white/10 mx-4"}),a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsxs("div",{className:"relative",ref:y,children:[a.jsx("button",{onClick:L=>{L.stopPropagation(),n(5),p(!h)},onContextMenu:L=>b(L,["shadows"]),className:`shadow-toggle-btn p-2 rounded-full border transition-all duration-300 ${o!=null&&o.shadows?"bg-yellow-500/10 border-yellow-500/50 text-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.1)]":"bg-transparent border-transparent text-gray-600 hover:text-gray-300 hover:bg-white/5"}`,title:"Shadow Settings",children:a.jsx(as,{})}),h&&a.jsx(Nc,{})]}),a.jsx("button",{onClick:()=>{n(5),i("param"),t.setShowLightGizmo(!t.showLightGizmo),r()},onContextMenu:L=>b(L,["ui.viewport"]),className:`p-2 rounded-full border transition-all duration-300 ${t.showLightGizmo?"bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]":"bg-transparent border-transparent text-gray-600 hover:text-gray-300 hover:bg-white/5"}`,children:a.jsx(ns,{})})]})]})},Mr=(e,n,t,o)=>{const s=e.replace(/[^a-zA-Z0-9 \-_]/g,"").trim().replace(/\s+/g,"_")||"Untitled",i=`v${n}`;return`${["GMT",s,i].join("_")}.${t}`},go=ge(),Hc=({isMobileMode:e,vibrate:n,btnBase:t,btnActive:o,btnInactive:s})=>{const i=F(),{movePanel:r}=i,[l,c]=w.useState(!1),[d,f]=w.useState(!1),h=w.useRef(null),p=w.useRef(null),u=async()=>{if(go.isBooted){c(!1);try{const g=await go.captureSnapshot();if(f(!0),!g){console.error("Snapshot generation returned null.");return}const b=i.getPreset({includeScene:!0}),M=Yo(b),j=i.prepareExport(),C=Mr(i.projectSettings.name,j,"png");try{const S=await or(g,"FractalData",M),k=URL.createObjectURL(S),P=document.createElement("a");P.download=C,P.href=k,P.click(),URL.revokeObjectURL(k),n(50)}catch(S){console.error("Metadata injection failed, saving raw image",S);const k=URL.createObjectURL(g),P=document.createElement("a");P.download=C,P.href=k,P.click(),URL.revokeObjectURL(k)}}catch(g){console.error("Snapshot failed",g)}finally{f(!1)}}},m=g=>{g.stopPropagation(),e?(n(5),c(!l)):u()},v=()=>{e||(h.current&&clearTimeout(h.current),c(!0))},y=()=>{e||(h.current=window.setTimeout(()=>{c(!1)},200))},x=()=>{n(5),r("Camera Manager","left"),c(!1)};return w.useEffect(()=>{if(!e||!l)return;const g=b=>{const M=b.target;p.current&&!p.current.contains(M)&&!M.closest(".camera-menu-trigger")&&c(!1)};return document.addEventListener("mousedown",g),document.addEventListener("touchstart",g),()=>{document.removeEventListener("mousedown",g),document.removeEventListener("touchstart",g)}},[l,e]),a.jsxs(a.Fragment,{children:[d&&a.jsx("div",{className:"fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in",children:a.jsxs("div",{className:"bg-gray-900 border border-cyan-500/50 rounded-xl px-6 py-4 shadow-2xl flex items-center gap-3",children:[a.jsx("div",{className:"w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"}),a.jsx("span",{className:"text-cyan-300 font-bold text-sm",children:"Capturing..."})]})}),a.jsxs("div",{className:"relative",ref:p,onMouseEnter:v,onMouseLeave:y,children:[a.jsx("button",{onClick:m,className:`camera-menu-trigger ${t} ${l?o:s}`,title:e?"Camera Menu":"Click: Take Snapshot / Hover: Camera Menu",children:a.jsx(zn,{})}),l&&a.jsxs(Tt,{width:"w-48",align:"end",children:[a.jsx("div",{className:"px-2 py-1 text-[10px] font-bold text-gray-500 border-b border-white/10 mb-1",children:"Camera Tools"}),a.jsxs("div",{className:"space-y-1",children:[a.jsxs("button",{onClick:()=>{n(5),i.undoCamera()},disabled:i.undoStack.length===0,className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/10 disabled:opacity-30 text-xs text-gray-300 text-left",children:[a.jsxs("span",{className:"flex items-center gap-2",children:[a.jsx(os,{})," Undo Move"]}),a.jsx("kbd",{className:"text-[8px] text-gray-500 bg-gray-800 px-1 rounded",children:"Ctrl+Shift+Z"})]}),a.jsxs("button",{onClick:()=>{n(5),i.redoCamera()},disabled:i.redoStack.length===0,className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/10 disabled:opacity-30 text-xs text-gray-300 text-left",children:[a.jsxs("span",{className:"flex items-center gap-2",children:[a.jsx(rs,{})," Redo Move"]}),a.jsx("kbd",{className:"text-[8px] text-gray-500 bg-gray-800 px-1 rounded",children:"Ctrl+Shift+Y"})]}),a.jsxs("button",{onClick:()=>{n(30),i.resetCamera(),i.setShowLightGizmo(!1)},className:"w-full flex items-center gap-2 p-2 rounded hover:bg-white/10 text-xs text-gray-300 text-left",children:[a.jsx(ss,{})," Reset Position"]}),a.jsx("div",{className:"h-px bg-white/10 my-1"}),a.jsxs("button",{onClick:x,className:"w-full flex items-center gap-2 p-2 rounded hover:bg-white/10 text-xs text-cyan-300 text-left",children:[a.jsx(qo,{})," Camera Manager"]}),a.jsx("div",{className:"h-px bg-white/10 my-1"}),a.jsxs("button",{onClick:u,className:"w-full flex items-center gap-2 p-2 rounded hover:bg-cyan-900/50 text-xs text-cyan-400 font-bold text-left",title:"Save PNG with embedded scene data",children:[a.jsx(zn,{})," Take Snapshot"]})]})]})]})]})};function Bc(e){const n=typeof window<"u"&&(window.matchMedia("(pointer: coarse)").matches||window.innerWidth<768);let t=!0;n&&(t=!1);let o;return n&&!t?o="low":n?o="mid":o="high",{tier:o,isMobile:n,supportsFloat32:t,caps:{precisionMode:n?1:0,bufferPrecision:t?0:1,compilerHardCap:n?256:2e3}}}function Cr(){return Bc()}const Gc=({onClose:e})=>{const n=F(h=>h.hardwareProfile),t=F(h=>h.setHardwareProfile),[o,s]=w.useState(null),i=o??(n==null?void 0:n.caps)??{precisionMode:0,bufferPrecision:0,compilerHardCap:500},r=o!==null,l=(h,p)=>{const u=o??{...(n==null?void 0:n.caps)??{precisionMode:0,bufferPrecision:0,compilerHardCap:500}};s({...u,[h]:p})},c=()=>{!o||!n||(Y.emit("is_compiling","Recompiling Shader..."),setTimeout(()=>{t({...n,caps:o}),s(null),e()},50))},d=()=>{const h=Cr();s(h.caps)},f=(n==null?void 0:n.tier)==="low"?"Mobile (Low)":(n==null?void 0:n.tier)==="mid"?"Mobile (Mid)":"Desktop";return Ht.createPortal(a.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-black/60",onClick:e,children:a.jsxs("div",{className:"bg-gray-900 border border-white/10 rounded-lg p-5 w-80 shadow-2xl",onClick:h=>h.stopPropagation(),children:[a.jsx("div",{className:"text-xs font-bold text-white mb-1",children:"Hardware Settings"}),a.jsxs("div",{className:"text-[9px] text-gray-500 mb-4",children:["Detected: ",f,(n==null?void 0:n.isMobile)&&" — mobile device"]}),a.jsxs("div",{className:"space-y-3",children:[a.jsxs("div",{children:[a.jsx("label",{className:"text-[9px] text-gray-500 font-bold block mb-1",children:"Ray Precision"}),a.jsx(qt,{value:i.precisionMode===0?"High (Desktop)":"Standard (Mobile)",onChange:h=>l("precisionMode",h==="High (Desktop)"?0:1),options:[{label:"High (Desktop)",value:"High (Desktop)"},{label:"Standard (Mobile)",value:"Standard (Mobile)"}],fullWidth:!0})]}),a.jsxs("div",{children:[a.jsx("label",{className:"text-[9px] text-gray-500 font-bold block mb-1",children:"Buffer Precision"}),a.jsx(qt,{value:i.bufferPrecision===0?"Float32 (HDR)":"HalfFloat16",onChange:h=>l("bufferPrecision",h==="Float32 (HDR)"?0:1),options:[{label:"Float32 (HDR)",value:"Float32 (HDR)"},{label:"HalfFloat16",value:"HalfFloat16"}],fullWidth:!0})]}),a.jsxs("div",{children:[a.jsx("label",{className:"text-[9px] text-gray-500 font-bold block mb-1",children:"Hard Loop Cap"}),a.jsx("input",{type:"number",value:i.compilerHardCap,onChange:h=>l("compilerHardCap",Math.max(64,Math.min(2e3,parseInt(h.target.value)||500))),className:"w-full bg-gray-800 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500",min:64,max:2e3})]})]}),a.jsx("div",{className:"text-[8px] text-gray-600 mt-3",children:"Changes require a shader recompile."}),a.jsxs("div",{className:"flex items-center justify-between mt-4 pt-3 border-t border-white/10",children:[a.jsx("button",{onClick:d,className:"text-[10px] text-gray-500 hover:text-gray-300 transition-colors",children:"Reset to Detected"}),a.jsxs("div",{className:"flex gap-2",children:[a.jsx("button",{onClick:e,className:"px-3 py-1 rounded text-[10px] text-gray-400 hover:text-white transition-colors",children:"Cancel"}),a.jsx("button",{onClick:c,disabled:!r,className:`px-3 py-1 rounded text-[10px] font-bold transition-colors ${r?"bg-cyan-600 hover:bg-cyan-500 text-white":"bg-gray-800 text-gray-600 cursor-not-allowed"}`,children:"Apply"})]})]})]})}),document.body)},xo=ge(),Uc=({isMobileMode:e,vibrate:n,btnBase:t,btnActive:o,btnInactive:s})=>{var O;const i=F(),r=i,[l,c]=w.useState(!1),[d,f]=w.useState(!1),[h,p]=w.useState(!1),[u,m]=w.useState(""),[v,y]=w.useState(null),[x,g]=w.useState(null),b=w.useRef(null),M=w.useRef(null),j=oe.getMenuFeatures(),C=oe.getExtraMenuItems();w.useEffect(()=>{const H=xo.gpuInfo;if(H)m(H);else{const q=setTimeout(()=>{m(xo.gpuInfo||"Generic WebGL Device")},3e3);return()=>clearTimeout(q)}},[]),w.useEffect(()=>{const H=q=>{const _=q.target;if(b.current&&!b.current.contains(_)){if(_.closest(".portal-dropdown-content")||_.closest(".t-dropdown"))return;c(!1),f(!1)}};return l&&(document.addEventListener("mousedown",H),document.addEventListener("touchstart",H)),()=>{document.removeEventListener("mousedown",H),document.removeEventListener("touchstart",H)}},[l]);const S=H=>{H.stopPropagation(),n(5),c(!l)},k=()=>{const H=i.prepareExport(),q=i.projectSettings,_=i.getPreset(),U=Yo(_),G=new Blob([U],{type:"text/plain"}),E=URL.createObjectURL(G),B=document.createElement("a");B.href=E,B.download=Mr(q.name,H,"gmf"),B.click(),URL.revokeObjectURL(E)},P=()=>{var H;return(H=M.current)==null?void 0:H.click()},I=async H=>{var _;const q=(_=H.target.files)==null?void 0:_[0];if(q){Y.emit("is_compiling","Processing..."),await new Promise(U=>setTimeout(U,50));try{let U="";if(q.type==="image/png"){const B=await rr(q,"FractalData");if(B)U=B;else throw new Error("No Fractal Data found in this image.")}else U=await q.text();const{def:G,preset:E}=_a(U);i.loadScene({def:G||void 0,preset:E}),n(50),c(!1)}catch(U){console.error("Load Failed:",U),Y.emit("is_compiling",!1),g("Error!"),setTimeout(()=>g(null),2e3),alert("Could not load preset. "+(U instanceof Error?U.message:String(U)))}H.target.value=""}},N=!!((O=Re.get(i.formula))!=null&&O.importSource),T=()=>{if(N){y("N/A (Imported)"),setTimeout(()=>y(null),2500);return}const H=4096;let q=i.getShareString({includeAnimations:!0}),_="";if(q.length>H){const G=i.getShareString({includeAnimations:!1});G.length<q.length&&G.length<H?(q=G,_=" (Anims Removed)"):_=" (Long URL)"}const U=`${window.location.origin}${window.location.pathname}#s=${q}`;navigator.clipboard.writeText(U).then(()=>{y(`Copied!${_}`),n(50),setTimeout(()=>y(null),2500)})},L=(H,q,_)=>{var B,z;const U=oe.get(H);if(((B=U==null?void 0:U.engineConfig)==null?void 0:B.mode)==="compile"&&((z=U.params[q])==null?void 0:z.onUpdate)==="compile"){i.movePanel("Engine","left"),setTimeout(()=>Y.emit("engine_queue",{featureId:H,param:q,value:_}),50);return}const G=`set${H.charAt(0).toUpperCase()+H.slice(1)}`,E=i[G];if(E&&(E({[q]:_}),U!=null&&U.tabConfig)){const W=U.tabConfig.label;H==="engineSettings"?_&&i.movePanel(W,"left"):_?i.floatTab(W):i.dockTab(W)}},D=(H,q=!1)=>{const _=r[H.id||H.featureId];if(!_)return null;const U=!!_[H.toggleParam];H.id;const G=H.id==="audio"?"text-green-400":"text-cyan-400";if(q){const B={Code:a.jsx(Ma,{}),Info:a.jsx(Zo,{})},z=H.icon?B[H.icon]:null;return a.jsxs("button",{onClick:W=>{W.stopPropagation(),n(5),L(H.featureId,H.toggleParam,!U),c(!1)},className:`w-full flex items-center justify-between p-2 rounded transition-colors group ${U?"bg-white/10 text-cyan-400":"hover:bg-white/5 text-gray-300"}`,children:[a.jsx("span",{className:"text-xs font-bold",children:H.label}),z]},`${H.featureId}-${H.toggleParam}`)}const E=U?H.id==="audio"?"bg-green-500/30 text-green-300 border-green-500/40":"bg-cyan-500/30 text-cyan-300 border-cyan-500/40":"bg-white/[0.04] text-gray-600 border-white/5";return a.jsxs("div",{className:"flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer animate-fade-in-left",onClick:()=>{n(5),L(H.id,H.toggleParam,!U)},children:[a.jsx("span",{className:`text-xs font-bold ${U?G:"text-gray-300"}`,children:H.label}),a.jsx("span",{className:`px-2 py-0.5 text-[8px] font-bold rounded-sm border transition-all ${E}`,children:U?"ON":"OFF"})]},H.id)},A=j.filter(H=>!H.advancedOnly),R=j.filter(H=>H.advancedOnly),$=C.filter(H=>H.advancedOnly);return a.jsxs(a.Fragment,{children:[!e&&a.jsxs(a.Fragment,{children:[a.jsxs("button",{onClick:T,className:`${t} ${s} relative`,title:N?"Share unavailable for imported formulas":"Copy Share Link",children:[a.jsx(on,{}),v&&a.jsx("div",{className:"absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-green-600 text-white text-[9px] font-bold rounded whitespace-nowrap animate-fade-in",children:v})]}),a.jsx("button",{onClick:k,className:`${t} ${s}`,title:"Save Preset (GMF)",children:a.jsx(rn,{})}),a.jsxs("button",{onClick:P,className:`${t} ${s} relative`,title:"Load Preset (GMF, JSON, or PNG)",children:[a.jsx(sn,{}),x&&a.jsx("div",{className:"absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-blue-600 text-white text-[9px] font-bold rounded whitespace-nowrap animate-fade-in",children:x})]})]}),a.jsx("input",{ref:M,type:"file",accept:".gmf,.json,.png",className:"hidden",onChange:I}),a.jsxs("div",{className:"relative",ref:b,children:[a.jsx("button",{onClick:S,className:`${t} ${l?o:s}`,children:a.jsx(is,{})}),l&&a.jsx(Tt,{width:"w-64",align:"end",className:"p-2 custom-scroll overflow-y-auto max-h-[85vh]",onClose:()=>S({}),children:a.jsxs("div",{className:"space-y-1",children:[a.jsxs("button",{onClick:H=>{H.stopPropagation(),T()},className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group",children:[a.jsx("span",{className:`text-xs font-bold ${v?"text-green-400":"group-hover:text-white"}`,children:v||"Copy Share Link"}),a.jsx(on,{active:!!v})]}),a.jsx("div",{className:"h-px bg-white/10 my-1"}),e&&a.jsxs(a.Fragment,{children:[a.jsxs("button",{onClick:H=>{H.stopPropagation(),S(H),k()},className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group border-b border-white/10 mb-1",children:[a.jsx("span",{className:"text-xs font-bold group-hover:text-white",children:"Save Preset"}),a.jsx(rn,{})]}),a.jsxs("button",{onClick:H=>{H.stopPropagation(),S(H),P()},className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group border-b border-white/10 mb-1",children:[a.jsx("span",{className:"text-xs font-bold group-hover:text-white",children:"Load Preset"}),a.jsx(sn,{})]}),a.jsx("div",{className:"h-px bg-white/10 my-1"})]}),A.map(H=>D(H)),a.jsx("div",{className:"h-px bg-white/10 my-1"}),a.jsxs("button",{onClick:H=>{H.stopPropagation(),n(5),p(!0),c(!1)},className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group",children:[a.jsx("span",{className:"text-xs font-bold group-hover:text-cyan-400",children:"Hardware Settings"}),a.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",className:"opacity-60",children:[a.jsx("path",{d:"M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"}),a.jsx("path",{d:"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"})]})]}),a.jsxs("button",{onClick:H=>{H.stopPropagation(),n(5),i.openWorkshop(),c(!1)},className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group",children:[a.jsx("span",{className:"text-xs font-bold group-hover:text-purple-400",children:"Formula Workshop"}),a.jsx(Ma,{})]}),a.jsxs("button",{onClick:H=>{H.stopPropagation(),i.setIsBroadcastMode(!0)},className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group",children:[a.jsxs("span",{className:"text-xs font-bold group-hover:text-cyan-400",children:["Hide Interface ",a.jsx("span",{className:"text-gray-500 font-normal",children:"[B]"})]}),a.jsx(ls,{})]}),a.jsxs("div",{className:"flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer",onClick:()=>{n(5),i.setInvertY(!i.invertY)},children:[a.jsx("span",{className:"text-xs text-gray-300 font-bold",children:"Invert Look Y"}),a.jsx("span",{className:`px-2 py-0.5 text-[8px] font-bold rounded-sm border transition-all ${i.invertY?"bg-cyan-500/30 text-cyan-300 border-cyan-500/40":"bg-white/[0.04] text-gray-600 border-white/5"}`,children:i.invertY?"ON":"OFF"})]}),a.jsx("div",{className:"h-px bg-white/10 my-1"}),a.jsxs("div",{className:"flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer",title:"Keyboard: ` (tilde)",onClick:()=>i.setAdvancedMode(!i.advancedMode),children:[a.jsxs("span",{className:"text-xs text-gray-300 font-bold",children:["Advanced Mode ",a.jsx("span",{className:"text-gray-500 font-normal",children:"[`]"})]}),a.jsx("span",{className:`px-2 py-0.5 text-[8px] font-bold rounded-sm border transition-all ${i.advancedMode?"bg-purple-500/30 text-purple-300 border-purple-500/40":"bg-white/[0.04] text-gray-600 border-white/5"}`,children:i.advancedMode?"ON":"OFF"})]}),i.advancedMode&&a.jsxs("div",{className:"mt-1 pl-2 border-l border-white/10 ml-2",children:[D({id:"engineSettings",toggleParam:"showEngineTab",label:"Engine Settings"}),R.map(H=>D(H)),$.map(H=>D(H,!0)),a.jsxs("a",{href:"./mesh-export/index.html",target:"_blank",rel:"noopener noreferrer",onClick:H=>{H.stopPropagation(),n(5),c(!1)},className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group no-underline",children:[a.jsx("span",{className:"text-xs font-bold group-hover:text-orange-400",children:"Mesh Export"}),a.jsx("span",{className:"text-[9px] text-gray-600",children:"↗"})]}),a.jsxs("div",{className:"flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer",onClick:()=>i.setDebugMobileLayout(!i.debugMobileLayout),children:[a.jsx("span",{className:"text-xs text-gray-300 font-bold",children:"Force Mobile UI"}),a.jsx("span",{className:`px-2 py-0.5 text-[8px] font-bold rounded-sm border transition-all ${i.debugMobileLayout?"bg-purple-500/30 text-purple-300 border-purple-500/40":"bg-white/[0.04] text-gray-600 border-white/5"}`,children:i.debugMobileLayout?"ON":"OFF"})]})]}),a.jsx("div",{className:"h-px bg-white/10 my-1"}),a.jsxs("div",{className:"flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer",title:"Keyboard: H",onClick:()=>{n(5),i.setShowHints(!i.showHints)},children:[a.jsxs("span",{className:"text-xs text-gray-300 font-bold",children:["Show Hints ",a.jsx("span",{className:"text-gray-500 font-normal",children:"[H]"})]}),a.jsx("span",{className:`px-2 py-0.5 text-[8px] font-bold rounded-sm border transition-all ${i.showHints?"bg-green-500/30 text-green-300 border-green-500/40":"bg-white/[0.04] text-gray-600 border-white/5"}`,children:i.showHints?"ON":"OFF"})]}),a.jsxs("button",{onClick:H=>{H.stopPropagation(),n(5),i.openHelp("general.shortcuts"),c(!1)},className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-cyan-400 transition-colors group",children:[a.jsx("span",{className:"text-xs font-bold group-hover:text-cyan-200",children:"Help"}),a.jsx(Xo,{})]}),a.jsxs("button",{onClick:H=>{H.stopPropagation(),n(5),f(!d)},className:`w-full flex items-center justify-between p-2 rounded transition-colors ${d?"bg-white/10 text-cyan-400":"hover:bg-white/5 text-gray-300"}`,children:[a.jsx("span",{className:"text-xs font-bold",children:"About GMT"}),a.jsx(cs,{})]}),d&&a.jsx("div",{className:"p-3 bg-white/5 rounded-lg border border-white/5 animate-fade-in mt-1",children:a.jsxs("div",{className:"text-[10px] text-gray-400 leading-relaxed space-y-2",children:[u&&a.jsxs("div",{className:"mb-2 pb-2 border-b border-white/10",children:[a.jsx("div",{className:"text-[8px] text-gray-500 font-bold mb-1",children:"Active Renderer"}),a.jsx("div",{className:"text-[9px] text-green-400 font-mono break-all",children:u})]}),a.jsx("p",{className:"text-[9px] text-gray-500 font-mono mb-1",children:"v0.9.0"}),a.jsxs("p",{children:["GMT was crafted with ❤️ by ",a.jsx("span",{className:"text-white font-bold",children:"Guy Zack"})," using ",a.jsx("a",{href:"https://aistudio.google.com",target:"_blank",rel:"noopener noreferrer",className:"text-cyan-400 hover:underline",children:"Gemini"})," and ",a.jsx("a",{href:"https://claude.ai",target:"_blank",rel:"noopener noreferrer",className:"text-cyan-400 hover:underline",children:"Claude"}),"."]}),a.jsxs("div",{className:"pt-2 border-t border-white/10",children:[a.jsx("div",{className:"text-[8px] text-gray-500 font-bold mb-1",children:"Tech Stack"}),a.jsx("div",{className:"text-[9px] text-gray-500 font-mono",children:"React + TypeScript + Three.js + GLSL + Zustand + Vite"})]}),a.jsxs("div",{className:"flex flex-col gap-1 pt-2 border-t border-white/10",children:[a.jsxs("a",{href:"https://www.reddit.com/r/GMT_fractals/",target:"_blank",rel:"noopener noreferrer",className:"flex items-center gap-2 hover:text-white transition-colors",children:[a.jsx("span",{children:"Community:"}),a.jsx("span",{className:"text-cyan-400 hover:underline",children:"r/GMT_fractals"})]}),a.jsxs("a",{href:"https://github.com/gamazama/GMT-fractals",target:"_blank",rel:"noopener noreferrer",className:"flex items-center gap-2 hover:text-white transition-colors",children:[a.jsx("span",{children:"Source:"}),a.jsx("span",{className:"text-cyan-400 hover:underline",children:"GitHub (GPL-3.0)"})]})]})]})})]})})]}),h&&a.jsx(Gc,{onClose:()=>p(!1)})]})},Wc=()=>{const e=F(),[n,t]=w.useState(window.innerWidth),[o,s]=w.useState(!1);w.useEffect(()=>{const f=()=>t(window.innerWidth),h=()=>s(window.matchMedia("(pointer: coarse)").matches);return window.addEventListener("resize",f),h(),()=>window.removeEventListener("resize",f)},[]);const i=e.debugMobileLayout||n<768||o,r=(f=10)=>{navigator.vibrate&&navigator.vibrate(f)},l="p-2.5 rounded-lg transition-all active:scale-95 border flex items-center justify-center",c="bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/10",d="bg-gray-800 border-gray-600 text-white";return a.jsxs("header",{className:"relative shrink-0 w-full h-14 z-[500] bg-black/90 border-b border-white/10 flex items-center justify-between px-6 animate-fade-in-down select-none",children:[a.jsx(yc,{isMobileMode:i,vibrate:r}),a.jsx($c,{isMobileMode:i,vibrate:r}),a.jsxs("div",{className:"flex gap-2 relative items-center",children:[a.jsx(Hc,{isMobileMode:i,vibrate:r,btnBase:l,btnActive:d,btnInactive:c}),a.jsx("div",{className:"h-6 w-px bg-white/10 mx-1"}),a.jsx(Uc,{isMobileMode:i,vibrate:r,btnBase:l,btnActive:d,btnInactive:c})]})]})},En=()=>{const[e,n]=w.useState(typeof window<"u"?window.innerHeight>window.innerWidth:!1),[t,o]=w.useState(!1);return w.useEffect(()=>{const s=()=>{n(window.innerHeight>window.innerWidth),o(window.matchMedia("(pointer: coarse)").matches||window.innerWidth<768)};return window.addEventListener("resize",s),s(),()=>window.removeEventListener("resize",s)},[]),{isPortrait:e,isMobile:t}},bo=({onMove:e,label:n,active:t})=>{const[o,s]=w.useState(!1),[i,r]=w.useState({x:0,y:0}),l=w.useRef(null),c=w.useRef(null),d=w.useRef({x:0,y:0}),f=w.useCallback((p,u)=>{if(!l.current)return;const m=l.current.getBoundingClientRect(),v=m.left+m.width/2,y=m.top+m.height/2,x=m.width/2;let g=(p-v)/x,b=(u-y)/x;const M=Math.sqrt(g*g+b*b);M>1&&(g/=M,b/=M);const j=30,C=Math.min(1,M),S=(M>0?g:0)*C*j,k=(M>0?b:0)*C*j;r({x:S,y:k}),d.current={x:g,y:-b}},[]),h=p=>{t&&(p.stopPropagation(),c.current=p.pointerId,s(!0),f(p.clientX,p.clientY),navigator.vibrate&&navigator.vibrate(10))};return w.useEffect(()=>{if(!o)return;const p=m=>{m.pointerId===c.current&&(m.cancelable&&m.preventDefault(),f(m.clientX,m.clientY),e(d.current.x,d.current.y))},u=m=>{m.pointerId===c.current&&(d.current={x:0,y:0},e(0,0),s(!1),r({x:0,y:0}),c.current=null,navigator.vibrate&&navigator.vibrate(5))};return window.addEventListener("pointermove",p,{passive:!1}),window.addEventListener("pointerup",u),window.addEventListener("pointercancel",u),()=>{window.removeEventListener("pointermove",p),window.removeEventListener("pointerup",u),window.removeEventListener("pointercancel",u)}},[o,f,e]),a.jsx("div",{ref:l,className:`w-36 h-36 rounded-full transition-all duration-200 relative flex items-center justify-center touch-none select-none ${o?"scale-110 shadow-[0_0_30px_rgba(34,211,238,0.1)]":"scale-100"} ${t?"pointer-events-auto":"pointer-events-none"}`,style:{touchAction:"none"},onPointerDown:h,children:a.jsxs("div",{className:`w-24 h-24 rounded-full border transition-all duration-500 flex items-center justify-center ${o?"bg-cyan-500/10 border-cyan-400":"bg-white/5 border-white/10"} ${t?"opacity-100":"opacity-0 scale-50"}`,children:[a.jsx("div",{className:`absolute -top-6 text-[8px] font-bold pointer-events-none transition-colors ${o?"text-cyan-400":"text-white/30"}`,children:n}),a.jsx("div",{className:"absolute inset-2 rounded-full border border-white/5 pointer-events-none"}),a.jsx("div",{className:`w-10 h-10 rounded-full border shadow-xl transition-transform duration-75 pointer-events-none ${o?"bg-cyan-400 border-white shadow-[0_0_20px_rgba(34,211,238,0.5)]":"bg-white/10 border-white/20"}`,style:{transform:`translate(${i.x}px, ${i.y}px)`}})]})})},Vc=()=>{const{cameraMode:e,setCameraMode:n,debugMobileLayout:t}=F(),{isMobile:o}=En(),[s,i]=w.useState(!1);w.useEffect(()=>{i(o||t)},[t,o]);const r=w.useCallback((d,f)=>{window.dispatchEvent(new CustomEvent("joyMove",{detail:{x:d,y:f}}))},[]),l=w.useCallback((d,f)=>{window.dispatchEvent(new CustomEvent("joyLook",{detail:{x:d,y:f}}))},[]);if(!s)return null;const c=e==="Fly";return a.jsxs("div",{className:"absolute inset-0 pointer-events-none z-[100] flex flex-col justify-between p-6 pb-10",children:[a.jsx("div",{className:"flex justify-start pt-16",children:a.jsxs("button",{onClick:()=>{navigator.vibrate&&navigator.vibrate(20),n(c?"Orbit":"Fly")},className:"pointer-events-auto flex items-center gap-2 bg-black/80 border border-white/20 px-4 py-2.5 rounded-full backdrop-blur-xl shadow-2xl active:scale-90 transition-all active:border-cyan-400",children:[a.jsx("div",{className:`w-2 h-2 rounded-full ${c?"bg-cyan-400 animate-pulse shadow-[0_0_5px_cyan]":"bg-purple-400"}`}),a.jsxs("span",{className:"text-[10px] font-bold text-white",children:[e," Mode"]})]})}),a.jsxs("div",{className:"flex justify-between items-end transition-all duration-500",children:[a.jsx("div",{className:c?"pointer-events-auto":"pointer-events-none",children:a.jsx(bo,{label:"Move",onMove:r,active:c})}),a.jsx("div",{className:c?"pointer-events-auto":"pointer-events-none",children:a.jsx(bo,{label:"Look",onMove:l,active:c})})]})]})};class qc{constructor(n){Q(this,"ctx",null);Q(this,"imageData",null);const t=n.getContext("2d",{alpha:!0});t&&(this.ctx=t)}render(n,t){if(!this.ctx)return;const o=this.ctx.canvas;(o.width!==o.clientWidth||o.height!==o.clientHeight)&&(o.width=o.clientWidth,o.height=o.clientHeight,this.imageData=null);const s=o.width,i=o.height;if(s===0||i===0)return;(!this.imageData||this.imageData.width!==s||this.imageData.height!==i)&&(this.imageData=this.ctx.createImageData(s,i));const r=this.imageData.data,l=n*.001,c=l*.5,d=Math.cos(c)*.7885,f=Math.sin(c)*.7885,h=1.5-.9*Math.pow(t,.5),p=(1-Math.pow(t,.2))*.5,u=Math.sin(p),m=Math.cos(p),v=(1-t)*.5,y=10+80*Math.pow(t,1.5),x=Math.min(Math.floor(y),90),g=1/i,b=s*.5,M=i*.5;for(let j=0;j<i;j++){const C=i-1-j,S=1/s;for(let k=0;k<s;k++){let P=(k-b)*g,I=(C-M)*g;P+=v,P*=h,I*=h;const N=m*P-u*I,T=u*P+m*I;let L=N,D=T,A=0;for(let $=0;$<x;$++){const O=L*L,H=D*D;if(O+H>4)break;D=2*L*D+f,L=O-H+d,A++}const R=(j*s+k)*4;if(A>=x)r[R]=0,r[R+1]=0,r[R+2]=0,r[R+3]=0;else{const $=L*L+D*D,q=3+(A-Math.log2(Math.log2($))+4)/64*10;let _=.5+.5*Math.cos(q),U=.5+.5*Math.cos(q+.6),G=.5+.5*Math.cos(q+1);const E=k*S,B=.1*Math.sin(E*30-l*8)*t;_+=B,U+=B,G+=B,r[R]=Math.max(0,Math.min(255,_*255|0)),r[R+1]=Math.max(0,Math.min(255,U*255|0)),r[R+2]=Math.max(0,Math.min(255,G*255|0)),r[R+3]=255}}}this.ctx.putImageData(this.imageData,0,0)}dispose(){this.ctx=null,this.imageData=null}}ge();const yo=["Generative Math Tracer","GPU Manifold Tracer","GPU Mandelorus Tracer","Geometric Morphology Toolkit","GLSL Marching Toolkit","Generative Morphology Theater","Grand Mathematical Topography","Geometric Manifold Traversal","Gradient Mapped Topology","Generalized Mesh Tracer","Gravitational Manifold Theory","Glass Mountain Telescope","Ghost Manifold Terminal","Garden of Mathematical Terrain","Glimpse Machine Terminal","Grey Matter Telescope","Grotesque Math Theater","Geometry Mutation Terminal","Grand Mythos Terminal","Glowing Mathematical Topologies","Guy Makes Things","Guy's Math Toy","Gnarly Math Thing","Generally Mesmerizing Thingamajig","Give Me Tentacles","Gloriously Melted Teapots","Gaze-into Mathematical Twilight","Greenwich Mean Time","Geometrically Mangled Tesseracts","Gratuitous Mandelbulb Torture","Got More Tentacles","Groovy Morphing Thingamabob"],Yc=()=>yo[Math.floor(Math.random()*yo.length)],vo=e=>`thumbnails/fractal_${e}.jpg`,Xc=({isReady:e,onFinished:n,startupMode:t,bootEngine:o})=>{var $;const s=w.useRef(null),i=w.useRef(null),r=w.useRef(!1),l=w.useRef(e),c=w.useRef(o),d=w.useRef(!1);w.useEffect(()=>{l.current=e},[e]),w.useEffect(()=>{c.current=o},[o]);const f=w.useRef(null),h=F(O=>O.formula),p=F(O=>O.loadScene),u=F(O=>O.applyPreset),m=F(O=>O.quality),v=(m==null?void 0:m.precisionMode)===1,[y,x]=w.useState(0),g=w.useRef(0),[b,M]=w.useState(1),[j,C]=w.useState(!0),[S,k]=w.useState(!1);w.useEffect(()=>{r.current=S},[S]);const[P,I]=w.useState(null),[N]=w.useState(Yc),T=()=>{d.current||(d.current=!0,c.current&&c.current())},L=O=>{const H=Re.get(O);H&&H.defaultPreset&&p({preset:H.defaultPreset}),k(!1),x(0),g.current=0,d.current&&c.current&&c.current(!0)},D=async O=>{var q;const H=(q=O.target.files)==null?void 0:q[0];if(H)try{let _="";if(H.type==="image/png"){const E=await rr(H,"FractalData");if(E)_=E;else throw new Error("No Fractal Data found in PNG.")}else _=await H.text();const{def:U,preset:G}=_a(_);p({def:U||void 0,preset:G}),k(!1),x(0),g.current=0,d.current&&c.current&&c.current(!0)}catch(_){alert("Load failed: "+(_ instanceof Error?_.message:String(_)))}},A=()=>{const O=v?"balanced":"lite";if(Y.emit("is_compiling",`Switching to ${O} mode...`),u){const H=F.getState();u({mode:O,actions:H})}},R=w.useMemo(()=>Re.getAll(),[]);return w.useEffect(()=>{if(!s.current)return;i.current=new qc(s.current);let O=0,H=0,q=performance.now();const _=2500,U=G=>{const E=performance.now(),B=Math.min(E-q,60);q=E;const z=r.current;H<100&&(H+=B*(100/_)),H>100&&(H=100),Math.floor(H)>Math.floor(g.current)&&(g.current=H,x(H)),i.current&&i.current.render(G,H/100),H>=100&&!z?(T(),l.current?(i.current&&(i.current.dispose(),i.current=null),M(0),setTimeout(()=>{C(!1),n()},800)):O=requestAnimationFrame(U)):O=requestAnimationFrame(U)};return O=requestAnimationFrame(U),()=>{cancelAnimationFrame(O),i.current&&(i.current.dispose(),i.current=null)}},[]),w.useEffect(()=>{T()},[]),j?a.jsxs("div",{className:"fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black transition-opacity duration-1000",style:{opacity:b},children:[a.jsxs("div",{className:"text-center mb-10 relative animate-fade-in-up z-10",children:[a.jsxs("h1",{className:"text-7xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] mb-2",children:["G",a.jsx("span",{className:"text-cyan-400",children:"M"}),"T"]}),a.jsx("div",{className:"text-xs text-gray-400 font-mono uppercase tracking-[0.4em]",children:N})]}),a.jsxs("div",{className:"relative z-10 w-[500px] h-16 bg-gray-900/80 rounded-full border border-gray-700/50 overflow-hidden shadow-[0_0_50px_rgba(0,255,255,0.1)] backdrop-blur-sm",children:[a.jsx("div",{className:"absolute top-0 left-0 h-full overflow-hidden will-change-[width] transition-[width] duration-75 ease-linear",style:{width:`${y}%`},children:a.jsx("canvas",{ref:s,className:"absolute top-0 left-0 w-[500px] h-16"})}),a.jsx("div",{className:"absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"})]}),a.jsx("div",{className:"mt-6 font-mono text-sm text-cyan-500/80 z-20 flex flex-col items-center h-10",children:t==="url"?a.jsxs("span",{className:"animate-pulse",children:["LOADING SHARED SCENE... ",Math.floor(y),"%"]}):a.jsxs("div",{className:"relative flex flex-col items-center",children:[a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsx("span",{className:"text-cyan-600/80",children:"LOADING"}),a.jsxs("button",{onClick:()=>k(!S),className:"flex items-center gap-1 text-cyan-400 hover:text-white transition-colors border-b border-dashed border-cyan-500/30 hover:border-cyan-400 pb-0.5 outline-none",children:[a.jsxs("span",{className:"font-bold",children:["[",h,"]"]}),a.jsx("span",{className:`text-[10px] transform transition-transform ${S?"rotate-180":""}`,children:a.jsx(la,{})})]}),a.jsxs("span",{className:"text-cyan-600/80",children:[Math.floor(y),"%"]})]}),a.jsx("button",{onClick:A,className:`mt-4 px-3 py-1.5 text-[9px] font-bold rounded border transition-all ${v?"bg-orange-900/40 text-orange-200 border-orange-500/40 hover:bg-orange-800/50":"bg-white/5 text-gray-500 border-white/5 hover:text-white hover:border-white/20"}`,children:v?"Lite Render Active":"Enable Lite Render"}),S&&a.jsxs("div",{className:"absolute bottom-full mb-4 w-[340px] bg-black/95 border border-white/20 rounded-xl shadow-[0_10px_60px_rgba(0,0,0,0.9)] backdrop-blur-xl animate-fade-in text-xs z-[110]",onMouseLeave:()=>I(null),children:[P&&P!=="Modular"&&a.jsxs("div",{className:"absolute left-[350px] bottom-0 w-[256px] h-[256px] bg-black border border-cyan-500/50 rounded-lg shadow-[0_0_50px_rgba(0,0,0,1)] overflow-hidden animate-fade-in pointer-events-none",children:[a.jsx("img",{src:vo(P),className:"w-full h-full object-cover",alt:"Preview",onError:O=>{O.currentTarget.style.display="none"}}),a.jsx("div",{className:"absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,4px_100%] pointer-events-none"}),a.jsx("div",{className:"absolute bottom-0 left-0 right-0 p-3 bg-black/60 text-cyan-300 font-bold text-[9px] border-t border-white/5",children:($=Re.get(P))==null?void 0:$.name})]}),a.jsxs("div",{className:"p-1 max-h-[400px] overflow-y-auto custom-scroll",children:[a.jsxs("button",{onClick:()=>{var O;return(O=f.current)==null?void 0:O.click()},className:"w-full flex items-center gap-2 px-3 py-2 text-left text-gray-300 hover:bg-white/10 hover:text-white rounded transition-colors mb-1 border-b border-white/10",children:[a.jsx(Qo,{})," ",a.jsx("span",{className:"font-bold text-[10px]",children:"Load From File..."})]}),a.jsx("input",{type:"file",ref:f,className:"hidden",accept:".gmf,.json,.png",onChange:D}),a.jsx("div",{className:"px-3 py-1.5 text-[9px] font-bold text-gray-500 bg-white/5 mb-1",children:"Select Engine"}),R.map(O=>a.jsxs("button",{onClick:()=>L(O.id),onMouseEnter:()=>I(O.id),className:`w-full text-left px-3 py-2.5 transition-all flex gap-3 border-b border-white/5 last:border-b-0 ${O.id===h?"bg-cyan-900/30":"hover:bg-white/5"}`,children:[a.jsxs("div",{className:"w-16 h-10 shrink-0 bg-black rounded border border-white/10 overflow-hidden relative",children:[O.id!=="Modular"?a.jsx("img",{src:vo(O.id),alt:O.name,className:"w-full h-full object-cover",onError:H=>{H.currentTarget.style.display="none",H.currentTarget.nextElementSibling&&(H.currentTarget.nextElementSibling.style.display="flex")}}):null,a.jsx("div",{className:`w-full h-full items-center justify-center text-gray-700 bg-gray-900 ${O.id!=="Modular"?"hidden":"flex"}`,children:O.id==="Modular"?a.jsx(Ko,{}):a.jsx(Fa,{})})]}),a.jsx("div",{className:"flex flex-col min-w-0",children:a.jsx("span",{className:`text-[11px] font-bold tracking-tight mb-0.5 ${O.id===h?"text-cyan-400":"text-gray-200"}`,children:O.name})})]},O.id))]})]})]})})]}):null},Zc=(e,n)=>{const t=F,o=le;w.useEffect(()=>{const s=i=>{const r=i.target,l=r.tagName==="INPUT"&&r.type==="range";if(r.tagName==="INPUT"&&!l||r.tagName==="TEXTAREA"||r.isContentEditable)return;const d=i.ctrlKey||i.metaKey,f=i.shiftKey;if(d&&!i.altKey){const h=t.getState().isTimelineHovered;if(i.code==="KeyZ"&&f){i.preventDefault(),i.stopPropagation(),t.getState().undoCamera();return}if(i.code==="KeyY"&&f){i.preventDefault(),i.stopPropagation(),t.getState().redoCamera();return}if(i.code==="KeyZ"&&!f){i.preventDefault(),i.stopPropagation(),h&&o.getState().undo()||t.getState().undoParam();return}if(i.code==="KeyY"&&!f){i.preventDefault(),i.stopPropagation(),h&&o.getState().redo()||t.getState().redoParam();return}}if(d&&!f&&!i.altKey){const h=i.code.match(/^Digit([1-9])$/);if(h){const p=parseInt(h[1])-1,u=t.getState().savedCameras;p<u.length&&(i.preventDefault(),i.stopPropagation(),t.getState().selectCamera(u[p].id));return}}switch(i.code){case"Tab":i.preventDefault(),t.getState().setCameraMode(t.getState().cameraMode==="Fly"?"Orbit":"Fly");break;case"KeyT":d||n(y=>!y);break;case"Escape":t.getState().isBroadcastMode&&t.getState().setIsBroadcastMode(!1),t.getState().interactionMode!=="none"&&t.getState().setInteractionMode("none"),o.getState().deselectAll();break;case"KeyH":t.getState().setShowHints(!t.getState().showHints);break;case"Backquote":t.getState().setAdvancedMode(!t.getState().advancedMode);break;case"KeyB":if(!d){const y=t.getState();y.setIsBroadcastMode(!y.isBroadcastMode)}break;case"Space":const{cameraMode:h,isTimelineHovered:p}=t.getState(),{sequence:u,isPlaying:m}=o.getState();let v=!1;if(e)v=h!=="Fly"||p;else{const y=Object.keys(u.tracks).length>0;h!=="Fly"&&y&&(v=!0)}v&&(i.preventDefault(),m?o.getState().pause():o.getState().play());break}};return window.addEventListener("keydown",s,{capture:!0}),()=>window.removeEventListener("keydown",s,{capture:!0})},[e,n])},Qc=ge(),wo=({onUpdate:e,autoUpdate:n,trigger:t,source:o})=>{const s=w.useRef(t);return w.useEffect(()=>{let i=0,r=0;const l=()=>{const c=t!==s.current;c&&(s.current=t),r++,(n&&r%60===0||c)&&Qc.requestHistogramReadback(o).then(f=>{f.length>0&&e(f)}),i=requestAnimationFrame(l)};return l(),()=>cancelAnimationFrame(i)},[n,t,o,e]),null},Kc=({state:e,actions:n,isMobile:t,hudRefs:o})=>{var h;const s=w.useRef(null),i=w.useRef(null),r=e.tabSwitchCount,l=n.incrementTabSwitchCount;w.useEffect(()=>{const p=le.subscribe(u=>u.isCameraInteracting,u=>{o.container.current&&(u?(o.container.current.style.opacity="1",i.current&&(clearTimeout(i.current),i.current=null)):(i.current&&clearTimeout(i.current),i.current=window.setTimeout(()=>{o.container.current&&(o.container.current.style.opacity="0")},2e3)))});return()=>{p(),i.current&&clearTimeout(i.current)}},[]),w.useEffect(()=>F.subscribe(u=>u.cameraMode,()=>l()),[l]);const c=p=>{if(!s.current||e.cameraMode==="Orbit")return;const u=s.current.getBoundingClientRect(),m=x=>{const g=Math.max(0,Math.min(1,(x-u.left)/u.width)),b=Math.pow(10,g*3-3);n.setNavigation({flySpeed:b}),(g===0||g===1)&&navigator.vibrate&&navigator.vibrate(5)};m(p.clientX);const v=x=>m(x.clientX),y=()=>{window.removeEventListener("pointermove",v),window.removeEventListener("pointerup",y)};window.addEventListener("pointermove",v),window.addEventListener("pointerup",y)},d=((h=e.navigation)==null?void 0:h.flySpeed)??.5,f=(Math.log10(d)+3)/3;return a.jsx("div",{ref:o.container,className:"absolute inset-0 pointer-events-none z-10 transition-opacity duration-500 opacity-0",children:a.jsxs("div",{className:"absolute inset-0 flex items-center justify-center",children:[a.jsx("div",{className:"absolute pointer-events-none opacity-20",children:e.cameraMode==="Fly"?a.jsxs(a.Fragment,{children:[a.jsx("div",{className:"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40px] h-[1px] bg-cyan-400"}),a.jsx("div",{className:"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-[40px] bg-cyan-400"})]}):a.jsxs("div",{className:"relative flex items-center justify-center",children:[a.jsx("div",{className:"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20px] h-[1px] bg-cyan-400"}),a.jsx("div",{className:"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-[20px] bg-cyan-400"}),a.jsx("div",{className:"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[24px] h-[24px] rounded-full border border-cyan-400 opacity-60"})]})}),a.jsxs("div",{ref:o.reticle,className:"absolute w-8 h-8 pointer-events-none opacity-0 transition-opacity duration-150 ease-out will-change-transform",children:[a.jsx("div",{className:"absolute inset-0 border-2 border-cyan-400 rounded-full shadow-[0_0_15px_cyan] opacity-80"}),a.jsx("div",{className:"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full"})]}),a.jsxs("div",{className:"absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-300 ease-out",style:{bottom:e.showHints&&!t?"4rem":"3.5rem"},children:[a.jsx("button",{ref:o.reset,onClick:()=>{n.resetCamera(),navigator.vibrate&&navigator.vibrate(30)},className:"pointer-events-auto px-4 py-1.5 bg-black/60 hover:bg-cyan-900/80 text-cyan-400 hover:text-white text-[9px] font-bold rounded-t-lg border-x border-t border-white/10 backdrop-blur-md hidden animate-fade-in shadow-xl mb-[-1px]",children:"Reset Camera"}),a.jsxs("div",{className:"flex items-stretch gap-px bg-black/40 rounded-full border border-white/10 backdrop-blur-md overflow-hidden pointer-events-auto shadow-2xl",children:[e.cameraMode==="Fly"&&a.jsxs(a.Fragment,{children:[a.jsxs("div",{ref:s,onPointerDown:c,className:"relative flex items-center px-6 py-3 cursor-ew-resize group min-w-[120px]",children:[a.jsx("div",{className:"absolute inset-0 bg-cyan-500/10 border-r border-cyan-500/20 transition-all duration-300 ease-out",style:{width:`${f*100}%`}}),a.jsxs("span",{ref:o.speed,className:"relative z-10 font-bold text-cyan-300 font-mono text-[10px] group-hover:text-white transition-colors",children:["Spd x",d.toFixed(3)]})]}),a.jsx("div",{className:"w-px bg-white/5"})]}),a.jsx("div",{className:"px-6 py-3 bg-white/5 flex items-center min-w-[100px] justify-center",children:a.jsx("span",{ref:o.dist,className:"text-cyan-500/80 font-mono text-[10px]",children:"Dst ---"})})]}),e.showHints&&!t&&a.jsxs("div",{className:"mt-3 text-[9px] font-medium text-white/40 text-center animate-fade-in text-shadow-sm whitespace-nowrap",children:[a.jsxs("span",{className:"text-cyan-400/60 font-bold mr-2",children:["[",e.cameraMode,"]"]}),e.cameraMode==="Fly"?"WASD Move · Space/C Vert · Shift Boost":"L-Drag Rotate · R-Drag Pan · Scroll Zoom"]}),r<2&&!t&&e.showHints&&a.jsxs("div",{className:"mt-2 text-[10px] font-bold text-cyan-300 animate-pulse bg-cyan-950/40 px-3 py-1 rounded border border-cyan-500/30 shadow-lg",children:["Press ",a.jsx("span",{className:"text-white border border-white/20 rounded px-1 bg-white/10 mx-0.5",children:"Tab"})," for ",e.cameraMode==="Orbit"?"Fly":"Orbit"," navigation"]})]})]})})};class So{constructor(n){Q(this,"element");Q(this,"sourceNode",null);Q(this,"gainNode",null);Q(this,"fileUrl",null);Q(this,"fileName",null);Q(this,"isActive",!1);this.element=new Audio,this.element.loop=!0,this.element.crossOrigin="anonymous"}get isPlaying(){return!this.element.paused&&!!this.sourceNode}load(n,t,o){this.fileUrl&&URL.revokeObjectURL(this.fileUrl),this.fileUrl=URL.createObjectURL(n),this.fileName=n.name,this.element.src=this.fileUrl,this.isActive=!0,this.sourceNode||(this.sourceNode=t.createMediaElementSource(this.element),this.gainNode=t.createGain(),this.sourceNode.connect(this.gainNode),this.gainNode.connect(o))}play(){this.element.play().catch(n=>console.warn("Deck play failed",n))}pause(){this.element.pause()}stop(){this.element.pause(),this.element.currentTime=0}seek(n){this.element.currentTime=n}setVolume(n){this.gainNode&&(this.gainNode.gain.value=n)}get duration(){return this.element.duration||0}get currentTime(){return this.element.currentTime||0}}class Jc{constructor(){Q(this,"audioContext",null);Q(this,"analyser",null);Q(this,"micSource",null);Q(this,"decks",[null,null]);Q(this,"masterGain",null);Q(this,"dataArray",null);Q(this,"isMicActive",!1);Q(this,"crossfade",.5)}init(){this.audioContext||(this.audioContext=new(window.AudioContext||window.webkitAudioContext),this.masterGain=this.audioContext.createGain(),this.masterGain.gain.value=.8,this.masterGain.connect(this.audioContext.destination),this.analyser=this.audioContext.createAnalyser(),this.analyser.fftSize=2048,this.analyser.smoothingTimeConstant=.8,this.dataArray=new Uint8Array(this.analyser.frequencyBinCount),this.masterGain.connect(this.analyser),this.decks[0]=new So(this.audioContext),this.decks[1]=new So(this.audioContext),this.setCrossfade(.5))}setSmoothing(n){this.analyser&&(this.analyser.smoothingTimeConstant=Math.max(0,Math.min(.99,n)))}async connectMicrophone(){if(this.init(),!(!this.audioContext||!this.masterGain)){this.decks.forEach(n=>n==null?void 0:n.pause());try{const n=await navigator.mediaDevices.getUserMedia({audio:!0});this.micSource&&this.micSource.disconnect(),this.micSource=this.audioContext.createMediaStreamSource(n),this.micSource.connect(this.analyser),this.isMicActive=!0,this.audioContext.state==="suspended"&&this.audioContext.resume()}catch(n){console.error("AudioEngine: Mic access denied",n),alert("Microphone access denied.")}}}async connectSystemAudio(){if(this.init(),!!this.audioContext)try{const n=await navigator.mediaDevices.getDisplayMedia({video:!0,audio:!0});if(n.getVideoTracks().forEach(t=>t.stop()),n.getAudioTracks().length===0)return;this.micSource&&this.micSource.disconnect(),this.micSource=this.audioContext.createMediaStreamSource(n),this.micSource.connect(this.analyser),this.micSource.connect(this.audioContext.destination),this.isMicActive=!0,this.audioContext.state==="suspended"&&this.audioContext.resume()}catch(n){console.error("AudioEngine: System audio capture failed",n),alert("System audio capture failed. Check browser permissions.")}}loadTrack(n,t){var o;this.init(),!(!this.audioContext||!this.masterGain)&&(this.micSource&&(this.micSource.disconnect(),this.micSource=null,this.isMicActive=!1),(o=this.decks[n])==null||o.load(t,this.audioContext,this.masterGain),this.setCrossfade(this.crossfade),this.audioContext.state==="suspended"&&this.audioContext.resume())}play(n){var t;(t=this.decks[n])==null||t.play()}pause(n){var t;(t=this.decks[n])==null||t.pause()}stop(n){var t;(t=this.decks[n])==null||t.stop()}deactivateDeck(n){const t=this.decks[n];t&&(t.stop(),t.isActive=!1)}seek(n,t){var o;(o=this.decks[n])==null||o.seek(t)}getTrackInfo(n){const t=this.decks[n];return{duration:(t==null?void 0:t.duration)||1,currentTime:(t==null?void 0:t.currentTime)||0,hasTrack:!!(t!=null&&t.sourceNode),fileName:(t==null?void 0:t.fileName)||null,isPlaying:(t==null?void 0:t.isPlaying)||!1,isActive:(t==null?void 0:t.isActive)||!1}}setCrossfade(n){this.crossfade=n;const t=Math.cos(n*.5*Math.PI),o=Math.cos((1-n)*.5*Math.PI);this.decks[0]&&this.decks[0].setVolume(t),this.decks[1]&&this.decks[1].setVolume(o)}setMasterGain(n){this.masterGain&&this.masterGain.gain.setTargetAtTime(n,this.audioContext.currentTime,.1)}update(){!this.analyser||!this.dataArray||this.analyser.getByteFrequencyData(this.dataArray)}getRawData(){return this.dataArray}}const kr=new Jc;class ed{constructor(){Q(this,"ruleValues",{});Q(this,"lfoValues",{});Q(this,"lfoStates",{});Q(this,"outputValues",{});Q(this,"lfoPrevOffsets",{});Q(this,"offsets",{})}getRuleValue(n){return this.ruleValues[n]||0}updateOscillators(n,t,o){for(let s=0;s<n.length;s++){const i=n[s];if(!i.enabled)continue;const r=(t/i.period+i.phase)%1;let l=0;switch(i.shape){case"Sine":l=Math.sin(r*Math.PI*2);break;case"Triangle":l=1-Math.abs(r*2-1)*2;break;case"Sawtooth":l=r*2-1;break;case"Pulse":l=r<.5?1:-1;break;case"Noise":const p=i.id;this.lfoStates[p]||(this.lfoStates[p]=Math.random()),this.lfoStates[p]+=o*5,l=Math.sin(this.lfoStates[p])*Math.cos(this.lfoStates[p]*.73);break}const c=l*.5+.5;this.lfoValues[`lfo-${s+1}`]=c;const d=l*i.amplitude,f=this.lfoPrevOffsets[i.id]??d;let h=d;if(i.smoothing>.001){const p=50*Math.pow(1-i.smoothing,2)+.1,u=1-Math.exp(-p*o);h=f+(d-f)*u}this.lfoPrevOffsets[i.id]=h,this.offsets[i.target]=(this.offsets[i.target]||0)+h}}update(n,t){const o=kr.getRawData();for(const s of n){if(!s.enabled)continue;let i=0;s.source==="audio"?o&&(i=this.processAudioSignal(s,o)):s.source.startsWith("lfo-")&&(i=this.lfoValues[s.source]||0);const r=this.ruleValues[s.id]||0;let l=r;if(i>r){const f=1-Math.pow(s.attack,.2);l=r+(i-r)*f}else{const f=1-Math.pow(s.decay,.2);l=r+(i-r)*f}this.ruleValues[s.id]=l;let c=l;if(s.smoothing&&s.smoothing>.001){const f=this.outputValues[s.id]||0,h=1-Math.pow(s.smoothing,.5);c=f+(l-f)*h}this.outputValues[s.id]=c;const d=c*s.gain+s.offset;this.offsets[s.target]=(this.offsets[s.target]||0)+d}}resetOffsets(){this.offsets={}}processAudioSignal(n,t){const o=t.length,s=Math.floor(n.freqStart*o),i=Math.floor(n.freqEnd*o);if(s>=o||i<=s)return 0;let r=0,l=0;for(let h=s;h<i;h++)r+=t[h],l++;if(l===0)return 0;const c=r/l/255;if(c<n.thresholdMin)return 0;const d=Math.max(.001,n.thresholdMax-n.thresholdMin),f=(c-n.thresholdMin)/d;return Math.min(1,f)}}const fa=new ed,Xe=ge(),Mo={current:new Set},Co=new V,ko=new _t,jo=new Bs,pa={current:new V(-1e3,-1e3,-1e3)},yn={current:-1},ft={current:{}},td=e=>{var L,D,A;const n=le.getState(),t=F.getState(),s=Object.keys(n.sequence.tracks).length>0,i=t.animations.length>0,r=((D=(L=t.modulation)==null?void 0:L.rules)==null?void 0:D.length)>0,l=((A=t.audio)==null?void 0:A.isEnabled)??!1;if(!s&&!i&&!r&&!l)return;Ia.tick(e);const c=t.modulation,d=t.audio;d&&d.isEnabled&&kr.update(),fa.resetOffsets(),Xe.modulations={};const f=t.animations;fa.updateOscillators(f,performance.now()/1e3,e),c&&c.rules&&fa.update(c.rules,e);const h=fa.offsets,p={},u=new Set(Object.keys(h)),m=Mo.current,v=new Set;u.forEach(R=>v.add(R)),m.forEach(R=>v.add(R));let y=0,x=0,g=0,b=!1,M=0,j=0,C=0,S=!1;const k=Math.floor(n.currentFrame),P=le.getState().isRecordingModulation,I=P&&k>yn.current;I&&(yn.current=k);const N=[];if(P&&v.size>0&&Ia.setOverriddenTracks(v),v.forEach(R=>{var G,E,B;const $=!u.has(R),O=$?0:h[R]??0;Math.abs(O)>1e-4&&(S=!0);let H=0,q="",_=!1;if(R.includes(".")){const[z,W]=R.split("."),Z=oe.get(z),X=t[z];if(Z&&X){const ee=W.match(/^(vec[23][ABC])_(x|y|z)$/);if(ee){const te=ee[1],re=ee[2],ne=Z.params[te];if(ne){const xe=X[te];xe&&typeof xe=="object"&&(H=xe[re]||0),ne.uniform&&(q=`${ne.uniform}_${re}`),ne.noReset&&(_=!0)}}else{const te=Z.params[W];te&&(typeof X[W]=="number"&&(H=X[W]),te.uniform&&(q=te.uniform),te.noReset&&(_=!0))}}}else R==="iterations"?(q="uIterations",H=((G=t.coreMath)==null?void 0:G.iterations)??0):R.startsWith("param")&&(q="u"+R.charAt(0).toUpperCase()+R.slice(1),H=((E=t.coreMath)==null?void 0:E[R])??0);if(I&&Math.abs(O)>1e-6){let z=H;const W=n.recordingSnapshot;if(W&&W.tracks[R]){const Z=W.tracks[R],X=R.includes("rotation");z=st(Z.keyframes,n.currentFrame,X)}else ft.current[R]===void 0&&(ft.current[R]=H),z=ft.current[R];N.push({trackId:R,value:z+O}),H=z}if(R.startsWith("coloring.")){if(R==="coloring.repeats"){const z=t.coloring;if(z&&Math.abs(z.repeats)>.001){const W=I?H:z.repeats,Z=z.scale/W,X=(W+O)*Z;$||(p[R]=W+O),Xe.setUniform("uColorScale",X)}return}if(R==="coloring.phase"){const z=t.coloring,W=I?H:z.phase;$||(p[R]=W+O),Xe.setUniform("uColorOffset",z.offset+O);return}if(R==="coloring.repeats2"){const z=t.coloring;if(z&&Math.abs(z.repeats2)>.001){const W=I?H:z.repeats2,Z=z.scale2/W,X=(W+O)*Z;$||(p[R]=W+O),Xe.setUniform("uColorScale2",X)}return}if(R==="coloring.phase2"){const z=t.coloring,W=I?H:z.phase2;$||(p[R]=W+O),Xe.setUniform("uColorOffset2",z.offset2+O);return}}if(R.startsWith("julia.")||R.startsWith("geometry.julia")){const z=t.geometry,W=(z==null?void 0:z.juliaX)??0,Z=(z==null?void 0:z.juliaY)??0,X=(z==null?void 0:z.juliaZ)??0;R.endsWith("juliaX")||R.endsWith("x")?(y=W+O,p[R]=y,I&&N.push({trackId:"geometry.juliaX",value:y})):R.endsWith("juliaY")||R.endsWith("y")?(x=Z+O,p[R]=x,I&&N.push({trackId:"geometry.juliaY",value:x})):(R.endsWith("juliaZ")||R.endsWith("z"))&&(g=X+O,p[R]=g,I&&N.push({trackId:"geometry.juliaZ",value:g})),b=!0;return}if(R.startsWith("camera.")){R.startsWith("camera.unified")?R.endsWith("x")?Xe.modulations["camera.unified.x"]=O:R.endsWith("y")?Xe.modulations["camera.unified.y"]=O:R.endsWith("z")&&(Xe.modulations["camera.unified.z"]=O):R.startsWith("camera.rotation")&&(R.endsWith("x")?Xe.modulations["camera.rotation.x"]=O:R.endsWith("y")?Xe.modulations["camera.rotation.y"]=O:R.endsWith("z")&&(Xe.modulations["camera.rotation.z"]=O)),p[R]=O;return}if(R.startsWith("geometry.preRot")){R.endsWith("X")?(M=O,p[R]=O):R.endsWith("Y")?(j=O,p[R]=O):R.endsWith("Z")&&(C=O,p[R]=O);return}if(R.startsWith("lighting.light")){const z=R.match(/lighting\.light(\d+)_(\w+)/);if(z){const W=parseInt(z[1]),Z=z[2],X=(B=t.lighting)==null?void 0:B.lights;if(X&&X[W]){const ee=X[W];let te=0,re=!1;if(Z==="intensity"?(te=ee.intensity,re=!0):Z==="falloff"?(te=ee.falloff,re=!0):Z==="posX"?(te=ee.position.x,re=!0):Z==="posY"?(te=ee.position.y,re=!0):Z==="posZ"&&(te=ee.position.z,re=!0),re){if(I){let ne=te;n.recordingSnapshot&&n.recordingSnapshot.tracks[R]?ne=st(n.recordingSnapshot.tracks[R].keyframes,n.currentFrame,!1):(ft.current[R]===void 0&&(ft.current[R]=te),ne=ft.current[R]),N.push({trackId:R,value:ne+O}),p[R]=ne+O}else p[R]=te+O;Xe.modulations[R]=O}}}return}const U=R.match(/^(coreMath|geometry)\.(vec[23][ABC])_(x|y|z)$/);if(U){const z=U[1],W=U[2],Z=U[3],X=t[z];if(X&&X[W]){const ee=X[W],te=ee[Z]??0,re=te+O;if(I){let Ie=te;n.recordingSnapshot&&n.recordingSnapshot.tracks[R]?Ie=st(n.recordingSnapshot.tracks[R].keyframes,n.currentFrame,!1):(ft.current[R]===void 0&&(ft.current[R]=te),Ie=ft.current[R]),N.push({trackId:R,value:Ie+O}),p[R]=Ie+O}else p[R]=re;const ne="u"+W.charAt(0).toUpperCase()+W.slice(1),xe={...ee,[Z]:re};Xe.setUniform(ne,xe)}return}if(q){const z=H+O;$||(p[R]=z),Xe.setUniform(q,z,_)}}),N.length>0&&n.batchAddKeyframes(k,N,"Linear"),b){const R=t.geometry;p["geometry.juliaX"]===void 0&&p["julia.x"]===void 0&&(y=(R==null?void 0:R.juliaX)??0),p["geometry.juliaY"]===void 0&&p["julia.y"]===void 0&&(x=(R==null?void 0:R.juliaY)??0),p["geometry.juliaZ"]===void 0&&p["julia.z"]===void 0&&(g=(R==null?void 0:R.juliaZ)??0),Co.set(y,x,g),Xe.setUniform("uJulia",Co)}const T=t.geometry;if(T&&T.preRotMaster){const R=T.preRotX+M,$=T.preRotY+j,O=T.preRotZ+C;if(Math.abs(R-pa.current.x)>1e-6||Math.abs($-pa.current.y)>1e-6||Math.abs(O-pa.current.z)>1e-6){const H=new _t().makeRotationX(R),q=new _t().makeRotationY($),_=new _t().makeRotationZ(O);ko.identity().multiply(_).multiply(H).multiply(q),jo.setFromMatrix4(ko),Xe.setUniform("uPreRotMatrix",jo),pa.current.set(R,$,O),S=!0}}S&&Xe.resetAccumulation(),(Object.keys(p).length>0||Object.keys(t.liveModulations).length>0)&&F.getState().setLiveModulations(p),Mo.current=u},ad=()=>{const e=le(n=>n.isRecordingModulation);return w.useEffect(()=>{e?(ft.current={},yn.current=-1):Ia.setOverriddenTracks(new Set)},[e]),null},St=ge(),nd=e=>{const n=w.useRef(!1),t=w.useRef(new V),o=w.useRef(new V),s=w.useRef(!1),i=w.useRef(null),r=w.useRef({x:0,y:0}),l=le;w.useEffect(()=>{const c=h=>{const p=F.getState(),u=p.interactionMode;if(e.current){const m=e.current.getBoundingClientRect(),v=(h.clientX-m.left)/m.width*2-1,y=-((h.clientY-m.top)/m.height)*2+1;if(r.current={x:v,y},u==="picking_focus"){s.current=!0;let x=!1,g=!1,b=-1;const M=F.getState();M.focusLock&&M.setFocusLock(!1),St.startFocusPick(v,y).then(C=>{s.current&&(x=!0,C>0&&C!==b&&(b=C,F.getState().setOptics({dofFocus:C})))});const j=()=>{s.current&&(x&&!g&&(g=!0,St.sampleFocusPick(r.current.x,r.current.y).then(C=>{if(g=!1,!!s.current&&C>0&&C!==b){b=C,F.getState().setOptics({dofFocus:C});const{isRecording:S,isPlaying:k,addKeyframe:P,addTrack:I,currentFrame:N,sequence:T}=l.getState();if(S){const L="optics.dofFocus";T.tracks[L]||I(L,"Focus Distance"),P(L,N,C,k?"Linear":"Bezier")}}})),i.current=requestAnimationFrame(j))};i.current=requestAnimationFrame(j)}if(u==="picking_julia"){n.current=!0;const x=p.geometry;o.current.set(x.juliaX,x.juliaY,x.juliaZ),t.current.copy(o.current);const g=(j,C,S)=>{if(C==="MandelTerrain"){const k=S.coreMath,P=Math.pow(2,k.paramB);t.current.set(j.x*(2/P)+k.paramE,j.z*(2/P)+k.paramF,0)}else C==="JuliaMorph"?t.current.set(j.x,j.y,0):t.current.copy(j)};St.pickWorldPosition(v,y,!0).then(j=>{j&&n.current&&g(j,p.formula,p)});let b=!1;const M=()=>{if(n.current){if(b||(b=!0,St.pickWorldPosition(r.current.x,r.current.y,!0).then(j=>{if(b=!1,!!n.current&&j){const C=F.getState();g(j,C.formula,C)}})),o.current.lerp(t.current,.1),o.current.distanceToSquared(t.current)>1e-8){F.getState().setGeometry({juliaX:o.current.x,juliaY:o.current.y,juliaZ:o.current.z});const{isRecording:C,isPlaying:S,addKeyframe:k,addTrack:P,currentFrame:I,sequence:N}=l.getState();if(C){N.tracks["geometry.juliaX"]||P("geometry.juliaX","Julia X"),N.tracks["geometry.juliaY"]||P("geometry.juliaY","Julia Y"),N.tracks["geometry.juliaZ"]||P("geometry.juliaZ","Julia Z");const T=S?"Linear":"Bezier";k("geometry.juliaX",I,o.current.x,T),k("geometry.juliaY",I,o.current.y,T),k("geometry.juliaZ",I,o.current.z,T)}}i.current=requestAnimationFrame(M)}};i.current=requestAnimationFrame(M)}}},d=h=>{var p,u;if(e.current){const m=e.current.getBoundingClientRect(),v=(h.clientX-m.left)/m.width*2-1,y=-((h.clientY-m.top)/m.height)*2+1;(n.current||s.current)&&(r.current={x:v,y});const x=F.getState();if(x.draggedLightIndex!==null&&!St.isGizmoInteracting){const g=ra(),b=((u=(p=x.lighting)==null?void 0:p.lights)==null?void 0:u.findIndex(M=>M.id===x.draggedLightIndex))??-1;if(g&&b>=0){const M=new Pn;M.setFromCamera(new Te(v,y),g);const j=Math.max(2e-4,Math.min(20,St.lastMeasuredDistance*.5)),C=M.ray.direction.clone().multiplyScalar(j).add(M.ray.origin),S=St.sceneOffset,k=x.lighting.lights[b];let P;if(k.fixed&&k.visible){const N=C.clone().sub(g.position).applyQuaternion(g.quaternion.clone().invert());P={x:N.x,y:N.y,z:N.z}}else P={x:C.x+S.x+(S.xL??0),y:C.y+S.y+(S.yL??0),z:C.z+S.z+(S.zL??0)};const I={visible:!0,castShadow:!0,position:P};k.visible||(I.fixed=!1),x.updateLight({index:b,params:I}),x.lighting.shadows||x.setLighting({shadows:!0}),x.showLightGizmo||x.setShowLightGizmo(!0)}}}},f=()=>{const h=F.getState();h.draggedLightIndex!==null&&h.setDraggedLight(null),n.current&&(n.current=!1,i.current&&cancelAnimationFrame(i.current),h.setInteractionMode("none"),navigator.vibrate&&navigator.vibrate(20)),s.current&&(s.current=!1,i.current&&cancelAnimationFrame(i.current),St.endFocusPick(),h.setInteractionMode("none"),navigator.vibrate&&navigator.vibrate(20))};return window.addEventListener("pointerdown",c),window.addEventListener("pointermove",d),window.addEventListener("pointerup",f),()=>{window.removeEventListener("pointerdown",c),window.removeEventListener("pointermove",d),window.removeEventListener("pointerup",f),i.current&&cancelAnimationFrame(i.current)}},[e])},od=e=>{const{interactionMode:n,setInteractionMode:t,setRenderRegion:o,renderRegion:s}=F(),i=n==="selecting_region",[r,l]=w.useState(null),[c,d]=w.useState(null),[f,h]=w.useState(null),[p,u]=w.useState({w:1,h:1}),m=w.useRef(null),v=w.useRef(null),y=w.useRef(null),x=(b,M)=>({x:Math.max(0,Math.min(1,(b.clientX-M.left)/M.width)),y:Math.max(0,Math.min(1,(b.clientY-M.top)/M.height))}),g=w.useMemo(()=>{if(m.current!=="draw"||!r||!c)return null;const{w:b,h:M}=p;if(b<1||M<1)return null;const j=Math.min(r.x,c.x),C=Math.max(r.x,c.x),S=Math.min(r.y,c.y),k=Math.max(r.y,c.y);return C-j<4||k-S<4?null:{minX:j/b,maxX:C/b,minY:1-k/M,maxY:1-S/M}},[r,c,p]);return w.useEffect(()=>{if(!e.current)return;const b=e.current,M=S=>{const k=S.target,P=b.getBoundingClientRect(),I=x(S,P);if(s&&!i){const N=k.dataset.handle;if(N||k.closest(".region-box")){S.stopPropagation(),m.current=N||"move",l({x:I.x,y:I.y}),v.current={...s},h({...s}),y.current={...s};return}}if(i){S.stopPropagation(),m.current="draw";const N=S.clientX-P.left,T=S.clientY-P.top;l({x:N,y:T}),d({x:N,y:T}),u({w:P.width,h:P.height})}},j=S=>{if(!m.current)return;S.stopPropagation(),S.preventDefault();const k=b.getBoundingClientRect();if(m.current==="draw"){const P=Math.max(0,Math.min(k.width,S.clientX-k.left)),I=Math.max(0,Math.min(k.height,S.clientY-k.top));d({x:P,y:I})}else if(v.current&&r){const P=x(S,k),I=P.x-r.x,N=1-P.y-(1-r.y);let T={...v.current};const L=m.current;if(L==="move"){const A=T.maxX-T.minX,R=T.maxY-T.minY;T.minX+=I,T.maxX+=I,T.minY+=N,T.maxY+=N,T.minX<0&&(T.minX=0,T.maxX=A),T.maxX>1&&(T.maxX=1,T.minX=1-A),T.minY<0&&(T.minY=0,T.maxY=R),T.maxY>1&&(T.maxY=1,T.minY=1-R)}else L!=null&&L.includes("e")&&(T.maxX=Math.min(1,v.current.maxX+I)),L!=null&&L.includes("w")&&(T.minX=Math.max(0,v.current.minX+I)),L!=null&&L.includes("n")&&(T.maxY=Math.min(1,v.current.maxY+N)),L!=null&&L.includes("s")&&(T.minY=Math.max(0,v.current.minY+N));const D={minX:Math.min(T.minX,T.maxX),maxX:Math.max(T.minX,T.maxX),minY:Math.min(T.minY,T.maxY),maxY:Math.max(T.minY,T.maxY)};D.maxX-D.minX<.01&&(D.maxX=D.minX+.01),D.maxY-D.minY<.01&&(D.maxY=D.minY+.01),h(D),y.current=D}},C=S=>{if(m.current){if(S.stopPropagation(),m.current==="draw"&&r&&c){const k=b.getBoundingClientRect(),P=Math.min(r.x,c.x),I=Math.max(r.x,c.x),N=Math.min(r.y,c.y),T=Math.max(r.y,c.y),L=I-P,D=T-N;if(L>10&&D>10){const A=P/k.width,R=I/k.width,$=1-T/k.height,O=1-N/k.height;o({minX:A,minY:$,maxX:R,maxY:O})}t("none")}else y.current&&o(y.current);m.current=null,l(null),d(null),v.current=null,h(null),y.current=null}};return b.addEventListener("mousedown",M),window.addEventListener("mousemove",j),window.addEventListener("mouseup",C),()=>{b.removeEventListener("mousedown",M),window.removeEventListener("mousemove",j),window.removeEventListener("mouseup",C)}},[i,s,r,c,t,o,e]),{visualRegion:f,drawPreview:g,isGhostDragging:!!f,renderRegion:s,isSelectingRegion:i}},wa=ge(),he={lowFpsBuffer:0,lastTime:performance.now(),lastFrameCount:0,setShowWarning:null,setCurrentFps:null,isPaused:!1,isScrubbing:!1,isExporting:!1,isBroadcastMode:!1,renderMode:"PathTracing",frameTimestamps:[]},rd=()=>{const e=performance.now();he.frameTimestamps.push(e);const n=e-2e3;if(he.frameTimestamps=he.frameTimestamps.filter(o=>o>n),e-he.lastTime>=500){let o=0;if(he.frameTimestamps.length>1){const l=he.frameTimestamps[0],d=he.frameTimestamps[he.frameTimestamps.length-1]-l;o=(he.frameTimestamps.length-1)/d*1e3}he.lastTime=e,he.lastFrameCount=wa.frameCount;const s=F.getState(),i=s.sampleCap>0&&wa.accumulationCount>=s.sampleCap;if(he.isPaused||he.isScrubbing||document.hidden||wa.isCompiling||he.isExporting||i)he.lowFpsBuffer=0;else if(e<8e3)he.lowFpsBuffer=0;else{he.setCurrentFps&&he.setCurrentFps(o);const l=he.renderMode==="PathTracing",c=l?10:15,d=l?22:30;o<c?he.lowFpsBuffer+=o<5?2:1:o>=d&&(he.lowFpsBuffer=Math.max(0,he.lowFpsBuffer-3),he.lowFpsBuffer===0&&he.setShowWarning&&he.setShowWarning(!1)),he.lowFpsBuffer>=5&&he.setShowWarning&&he.setShowWarning(!0)}}},sd=()=>{const e=w.useRef(0);w.useRef(performance.now()),w.useRef(0);const{resolutionMode:n,setResolutionMode:t,setFixedResolution:o,fixedResolution:s,isExporting:i,isBroadcastMode:r,openContextMenu:l,aaLevel:c,setAALevel:d,renderMode:f,quality:h,canvasPixelSize:p}=F(),u=F(R=>R.isPaused),m=le(R=>R.isScrubbing),[v,y]=w.useState(!1),[x,g]=w.useState(60);w.useEffect(()=>(he.setShowWarning=y,he.setCurrentFps=g,he.isPaused=u,he.isScrubbing=m,he.isExporting=i,he.isBroadcastMode=r,he.renderMode=f,he.lastTime=performance.now(),he.lastFrameCount=wa.frameCount,()=>{he.setShowWarning===y&&(he.setShowWarning=null),he.setCurrentFps===g&&(he.setCurrentFps=null)}),[u,m,i,r,f]);const b=R=>{const $=Ye(R.currentTarget);$.length>0&&(R.preventDefault(),R.stopPropagation(),l(R.clientX,R.clientY,[],$))};if(r||!v)return null;const M=F(R=>R.dpr)||1,[j,C]=n==="Fixed"?[Math.floor(s[0]*M),Math.floor(s[1]*M)]:p,S=j>480,k=()=>{const R=Math.max(320,Math.round(j*.66/8)*8),$=Math.max(240,Math.round(C*.66/8)*8);t("Fixed"),o(R,$),A()},P=c>1,I=()=>{d(1),A()},N=h,L=!((N==null?void 0:N.precisionMode)===1),D=()=>{const R=F.getState().setQuality,$=F.getState().setLighting;R&&R({precisionMode:1,bufferPrecision:1}),$&&$({shadows:!1}),A()},A=()=>{y(!1),e.current=-10};return a.jsx("div",{className:"absolute top-2 right-4 z-[50] pointer-events-auto animate-fade-in-left origin-top-right max-w-[200px]","data-help-id":"ui.performance",onContextMenu:b,children:a.jsxs("div",{className:"flex flex-col gap-1 bg-red-950/90 border border-red-500/30 rounded-lg shadow-xl backdrop-blur-md p-2",children:[a.jsxs("div",{className:"flex items-center justify-between mb-1",children:[a.jsxs("div",{className:"flex items-center gap-2 text-red-200 text-[10px] font-bold",children:[a.jsx(Yt,{}),a.jsxs("span",{children:["Low FPS (",x.toFixed(1),")"]})]}),a.jsx("button",{onClick:()=>{y(!1),e.current=-40},className:"text-red-400 hover:text-white transition-colors p-0.5",title:"Dismiss",children:a.jsx(jn,{})})]}),a.jsxs("div",{className:"flex flex-col gap-1",children:[P&&a.jsxs("button",{onClick:I,className:"flex items-center justify-between bg-black/40 hover:bg-white/10 text-gray-300 text-[9px] px-2 py-1.5 rounded transition-colors border border-white/5",children:[a.jsxs("span",{className:"flex items-center gap-1.5",children:[a.jsx(qo,{})," Reset Scale (1x)"]}),a.jsx("span",{className:"text-cyan-400 font-bold",children:"Fix"})]}),L&&a.jsxs("button",{onClick:D,className:"flex items-center justify-between bg-black/40 hover:bg-white/10 text-gray-300 text-[9px] px-2 py-1.5 rounded transition-colors border border-white/5",children:[a.jsxs("span",{className:"flex items-center gap-1.5",children:[a.jsx(Fa,{})," Enable Lite Mode"]}),a.jsx("span",{className:"text-cyan-400 font-bold",children:"Fix"})]}),S&&a.jsxs("button",{onClick:k,className:"flex items-center justify-between bg-black/40 hover:bg-white/10 text-gray-300 text-[9px] px-2 py-1.5 rounded transition-colors border border-white/5",children:[a.jsxs("span",{className:"flex items-center gap-1.5",children:[a.jsx(Pt,{})," Reduce Resolution"]}),a.jsx("span",{className:"text-cyan-400 font-bold",children:"-33%"})]})]})]})})},id=[{label:"Maximum",ratio:"Max"},{label:"Square (1:1)",ratio:1},{label:"Landscape (16:9)",ratio:1.7777},{label:"Portrait (4:5)",ratio:.8},{label:"Social (9:16)",ratio:.5625},{label:"Cinematic (2.35:1)",ratio:2.35},{label:"Classic (4:3)",ratio:1.3333},{label:"Skybox (2:1)",ratio:2}],ld=({width:e,height:n,top:t,left:o,maxAvailableWidth:s,maxAvailableHeight:i,onSetResolution:r,onSetMode:l})=>{const[c,d]=w.useState(!1),f=w.useRef(null),h=w.useRef(null),p=F(g=>g.openContextMenu);w.useEffect(()=>{if(!c)return;const g=b=>{f.current&&!f.current.contains(b.target)&&d(!1)};return window.addEventListener("mousedown",g),()=>window.removeEventListener("mousedown",g)},[c]);const u=g=>{const b=Ye(g.currentTarget);b.length>0&&(g.preventDefault(),g.stopPropagation(),p(g.clientX,g.clientY,[],b))},m=g=>{g.preventDefault(),g.stopPropagation(),g.target.setPointerCapture(g.pointerId),h.current={startX:g.clientX,startY:g.clientY,startW:e,startH:n,hasMoved:!1}},v=g=>{if(!h.current)return;const b=h.current.startX-g.clientX,M=h.current.startY-g.clientY;(Math.abs(b)>3||Math.abs(M)>3)&&(h.current.hasMoved=!0);const j=Math.round(M/4),C=Math.round(b/20),k=(j+C)*8;if(k!==0){const P=h.current.startW/h.current.startH,I=Math.max(64,h.current.startW+k),N=Math.round(I/8)*8,T=N/P,L=Math.max(64,Math.round(T/8)*8);r(N,L)}},y=g=>{g.target.releasePointerCapture(g.pointerId),h.current&&!h.current.hasMoved&&d(b=>!b),h.current=null},x=g=>{const M=Math.max(100,s-40),j=Math.max(100,i-40);let C,S;g==="Max"?(C=M,S=j):M/j>g?(S=j,C=S*g):(C=M,S=C/g);const k=Math.round(C/8)*8,P=Math.round(S/8)*8;r(k,P),d(!1)};return a.jsxs("div",{className:"absolute flex items-center gap-2 z-50 transition-all duration-100 ease-out",style:{top:t,left:o},"data-help-id":"ui.resolution",onContextMenu:u,children:[a.jsxs("div",{className:"relative text-[10px] font-mono text-gray-400 bg-black/80 px-2 py-1 rounded border border-white/10 shadow-sm backdrop-blur-md cursor-ns-resize hover:text-white hover:border-cyan-500/50 transition-colors select-none flex items-center gap-2",onPointerDown:m,onPointerMove:v,onPointerUp:y,title:"Drag Up or Left to Increase Size",children:[a.jsxs("span",{children:[e," ",a.jsx("span",{className:"text-gray-600",children:"x"})," ",n]}),a.jsx("span",{className:"opacity-50",children:a.jsx(la,{})})]}),c&&a.jsxs("div",{ref:f,className:"absolute top-8 left-0 w-32 bg-black border border-white/20 rounded shadow-xl z-50 overflow-hidden flex flex-col py-1 animate-fade-in",children:[a.jsx("div",{className:"px-3 py-1 text-[8px] font-bold text-gray-500 border-b border-white/10 mb-1",children:"Fit to Window"}),id.map(g=>a.jsx("button",{onClick:()=>x(g.ratio),className:"text-left px-3 py-1.5 text-[10px] text-gray-300 hover:bg-white/10 hover:text-white transition-colors flex justify-between",children:a.jsx("span",{children:g.label})},g.label))]}),a.jsxs("button",{onClick:g=>{g.stopPropagation(),l("Full")},className:"flex items-center gap-1.5 text-[9px] font-bold text-gray-300 bg-black/80 px-2 py-1 rounded border border-white/10 hover:border-cyan-500/50 hover:text-cyan-400 hover:bg-cyan-900/30 transition-all shadow-sm backdrop-blur-md group",title:"Return to Fullscreen Mode",children:[a.jsx("span",{className:"w-2 h-2 border border-current rounded-sm group-hover:scale-110 transition-transform"}),"Fill"]})]})},cd=({width:e,height:n})=>{const t=F(c=>c.compositionOverlay),o=F(c=>c.compositionOverlaySettings);if(t==="none"||!t)return null;const{opacity:s,lineThickness:i,color:r}=o;let l=r;if(r.startsWith("#")){const c=yt(r);c&&(l=`rgba(${c.r},${c.g},${c.b},${s})`)}else r.startsWith("rgba")?l=r.replace(/rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)/,`rgba($1,$2,$3,${s})`):r.startsWith("rgb(")&&(l=r.replace(/rgb\(([^,]+),([^,]+),([^)]+)\)/,`rgba($1,$2,$3,${s})`));return a.jsxs("svg",{className:"absolute inset-0 pointer-events-none z-[15]",width:e,height:n,style:{mixBlendMode:"difference"},children:[t==="grid"&&a.jsx(dd,{width:e,height:n,strokeColor:l,lineThickness:i,divisionsX:o.gridDivisionsX,divisionsY:o.gridDivisionsY}),t==="thirds"&&a.jsx(ud,{width:e,height:n,strokeColor:l,lineThickness:i}),t==="golden"&&a.jsx(jr,{width:e,height:n,strokeColor:l,lineThickness:i}),t==="spiral"&&a.jsx(hd,{width:e,height:n,strokeColor:l,lineThickness:i,rotation:o.spiralRotation,positionX:o.spiralPositionX,positionY:o.spiralPositionY,scale:o.spiralScale,ratio:o.spiralRatio}),t==="center"&&a.jsx(Ro,{width:e,height:n,strokeColor:l,lineThickness:i}),t==="diagonal"&&a.jsx(fd,{width:e,height:n,strokeColor:l,lineThickness:i}),t==="safearea"&&a.jsx(Io,{width:e,height:n,strokeColor:l,lineThickness:i}),o.showCenterMark&&t!=="center"&&a.jsx(Ro,{width:e,height:n,strokeColor:l,lineThickness:i}),o.showSafeAreas&&t!=="safearea"&&a.jsx(Io,{width:e,height:n,strokeColor:l,lineThickness:i*.5})]})},dd=({width:e,height:n,strokeColor:t,lineThickness:o,divisionsX:s=4,divisionsY:i=4})=>{const r=[];for(let l=1;l<s;l++){const c=e/s*l;r.push(a.jsx("line",{x1:c,y1:0,x2:c,y2:n,stroke:t,strokeWidth:o*.5},`v${l}`))}for(let l=1;l<i;l++){const c=n/i*l;r.push(a.jsx("line",{x1:0,y1:c,x2:e,y2:c,stroke:t,strokeWidth:o*.5},`h${l}`))}return a.jsx(a.Fragment,{children:r})},ud=({width:e,height:n,strokeColor:t,lineThickness:o})=>{const s=e/3,i=n/3;return a.jsxs(a.Fragment,{children:[a.jsx("line",{x1:s,y1:0,x2:s,y2:n,stroke:t,strokeWidth:o}),a.jsx("line",{x1:s*2,y1:0,x2:s*2,y2:n,stroke:t,strokeWidth:o}),a.jsx("line",{x1:0,y1:i,x2:e,y2:i,stroke:t,strokeWidth:o}),a.jsx("line",{x1:0,y1:i*2,x2:e,y2:i*2,stroke:t,strokeWidth:o}),a.jsx("circle",{cx:s,cy:i,r:o*3,fill:t}),a.jsx("circle",{cx:s*2,cy:i,r:o*3,fill:t}),a.jsx("circle",{cx:s,cy:i*2,r:o*3,fill:t}),a.jsx("circle",{cx:s*2,cy:i*2,r:o*3,fill:t})]})},jr=({width:e,height:n,strokeColor:t,lineThickness:o})=>{const s=1.618033988749895,i=e/s,r=n/s;return a.jsxs(a.Fragment,{children:[a.jsx("line",{x1:i,y1:0,x2:i,y2:n,stroke:t,strokeWidth:o}),a.jsx("line",{x1:e-i,y1:0,x2:e-i,y2:n,stroke:t,strokeWidth:o}),a.jsx("line",{x1:0,y1:r,x2:e,y2:r,stroke:t,strokeWidth:o}),a.jsx("line",{x1:0,y1:n-r,x2:e,y2:n-r,stroke:t,strokeWidth:o}),a.jsx("circle",{cx:i,cy:r,r:o*3,fill:t}),a.jsx("circle",{cx:e-i,cy:r,r:o*3,fill:t}),a.jsx("circle",{cx:i,cy:n-r,r:o*3,fill:t}),a.jsx("circle",{cx:e-i,cy:n-r,r:o*3,fill:t})]})},hd=({width:e,height:n,strokeColor:t,lineThickness:o,rotation:s=0,positionX:i=.5,positionY:r=.5,scale:l=1,ratio:c=1.618033988749895})=>{const d=Math.min(e,n),f=e*i,h=n*r,p=d*.45*l,u=s*Math.PI/180,m=[],v=3,y=100;for(let x=0;x<=y;x++){const g=x/y*v*2*Math.PI,b=p*Math.pow(c,-g/(2*Math.PI)),M=f+b*Math.cos(g+u),j=h+b*Math.sin(g+u);m.push(`${x===0?"M":"L"} ${M} ${j}`)}return a.jsxs(a.Fragment,{children:[a.jsx("path",{d:m.join(" "),fill:"none",stroke:t,strokeWidth:o*1.5,strokeLinecap:"round"}),a.jsx(jr,{width:e,height:n,strokeColor:t.replace(/[\d.]+\)$/,"0.2)"),lineThickness:o*.5})]})},Ro=({width:e,height:n,strokeColor:t,lineThickness:o})=>{const s=e/2,i=n/2,r=Math.min(e,n)*.05;return a.jsxs(a.Fragment,{children:[a.jsx("line",{x1:s-r,y1:i,x2:s+r,y2:i,stroke:t,strokeWidth:o}),a.jsx("line",{x1:s,y1:i-r,x2:s,y2:i+r,stroke:t,strokeWidth:o}),a.jsx("circle",{cx:s,cy:i,r:r*.3,fill:"none",stroke:t,strokeWidth:o})]})},fd=({width:e,height:n,strokeColor:t,lineThickness:o})=>a.jsxs(a.Fragment,{children:[a.jsx("line",{x1:0,y1:0,x2:e,y2:n,stroke:t,strokeWidth:o}),a.jsx("line",{x1:e,y1:0,x2:0,y2:n,stroke:t,strokeWidth:o}),a.jsx("line",{x1:e/2,y1:0,x2:e/2,y2:n,stroke:t,strokeWidth:o*.5,strokeDasharray:"4 4"}),a.jsx("line",{x1:0,y1:n/2,x2:e,y2:n/2,stroke:t,strokeWidth:o*.5,strokeDasharray:"4 4"})]}),Io=({width:e,height:n,strokeColor:t,lineThickness:o})=>{const i=e*.05,r=n*.05,l=e*(1-.05*2),c=n*(1-.05*2),d=.1,f=e*d,h=n*d,p=e*(1-d*2),u=n*(1-d*2);return a.jsxs(a.Fragment,{children:[a.jsx("rect",{x:i,y:r,width:l,height:c,fill:"none",stroke:t,strokeWidth:o}),a.jsx("rect",{x:f,y:h,width:p,height:u,fill:"none",stroke:t,strokeWidth:o*.5,strokeDasharray:"4 4"}),[[i,r],[i+l,r],[i,r+c],[i+l,r+c]].map(([m,v],y)=>a.jsx("circle",{cx:m,cy:v,r:o*2,fill:t},y))]})},pd=(e,n,t,o)=>{const{gl:s}=In(),i=F(g=>g.invertY),r=F(g=>g.debugMobileLayout),l=w.useRef({forward:!1,backward:!1,left:!1,right:!1,up:!1,down:!1,rollLeft:!1,rollRight:!1,boost:!1}),c=w.useRef(!1),d=w.useRef({x:0,y:0}),f=w.useRef({x:0,y:0}),h=w.useRef(0),p=w.useRef(0),u=w.useRef({x:0,y:0}),m=w.useRef({x:0,y:0}),v=w.useRef(n);w.useEffect(()=>{v.current=n},[n]);const y=()=>{h.current=performance.now()};return w.useEffect(()=>{u.current={x:0,y:0},m.current={x:0,y:0},p.current=0,y()},[e]),Aa((g,b)=>{const M=l.current.rollLeft?1:l.current.rollRight?-1:0,C=1-Math.exp(-(M!==0?1:3)*b),S=Math.max(.1,v.current);p.current+=(M*S-p.current)*C,M===0&&Math.abs(p.current)<.001&&(p.current=0)}),w.useEffect(()=>{const g=k=>{var T;const P=k.target;if(P.tagName==="INPUT"||P.tagName==="TEXTAREA"||P.isContentEditable||(T=P.closest)!=null&&T.call(P,".cm-editor")||((k.ctrlKey||k.metaKey)&&(k.key==="w"||k.code==="KeyW")&&k.preventDefault(),k.code==="Space"&&k.preventDefault(),k.key==="Alt"&&k.preventDefault(),F.getState().isTimelineHovered))return;let N=!0;switch(k.code){case"KeyW":l.current.forward=!0;break;case"KeyS":l.current.backward=!0;break;case"KeyA":l.current.left=!0;break;case"KeyD":l.current.right=!0;break;case"KeyQ":l.current.rollLeft=!0;break;case"KeyE":l.current.rollRight=!0;break;case"Space":l.current.up=!0;break;case"KeyC":l.current.down=!0;break;case"ShiftLeft":case"ShiftRight":l.current.boost=!0;break;default:N=!1}N&&y()},b=k=>{var I;k.key==="Alt"&&k.preventDefault();const P=k.target;if(!(P.tagName==="INPUT"||P.tagName==="TEXTAREA"||P.isContentEditable||(I=P.closest)!=null&&I.call(P,".cm-editor")))switch(k.code){case"KeyW":l.current.forward=!1;break;case"KeyS":l.current.backward=!1;break;case"KeyA":l.current.left=!1;break;case"KeyD":l.current.right=!1;break;case"KeyQ":l.current.rollLeft=!1;break;case"KeyE":l.current.rollRight=!1;break;case"Space":l.current.up=!1;break;case"KeyC":l.current.down=!1;break;case"ShiftLeft":case"ShiftRight":l.current.boost=!1;break}},M=k=>{const P=F.getState();if(gn(P))return;if(P.optics&&Math.abs(P.optics.camType-1)<.1){const T=k.deltaY>0?1:-1,D=P.optics.orthoScale*(1+T*.1);P.setOptics({orthoScale:Math.max(1e-10,Math.min(1e3,D))}),y();return}if(e==="Fly"){const T=k.deltaY>0?-1:1;let L=v.current,D=.01;L<.05&&(D=.005),L>.1&&(D=.02);let A=Math.max(.001,Math.min(1,L+T*D));v.current=A,t(A),y()}else e==="Orbit"&&y()},j=()=>{l.current={forward:!1,backward:!1,left:!1,right:!1,up:!1,down:!1,rollLeft:!1,rollRight:!1,boost:!1}},C=k=>{u.current=k.detail,y()},S=k=>{m.current=k.detail,y()};return window.addEventListener("keydown",g),window.addEventListener("keyup",b),window.addEventListener("blur",j),window.addEventListener("joyMove",C),window.addEventListener("joyLook",S),s.domElement.addEventListener("wheel",M,{passive:!0}),()=>{window.removeEventListener("keydown",g),window.removeEventListener("keyup",b),window.removeEventListener("blur",j),window.removeEventListener("joyMove",C),window.removeEventListener("joyLook",S),s.domElement.removeEventListener("wheel",M)}},[e,s,t]),w.useEffect(()=>{const g=s.domElement,b=(S,k)=>{const P=g.getBoundingClientRect();return{x:(S-P.left)/P.width*2-1,y:-((k-P.top)/P.height)*2+1}},M=S=>{const k=F.getState();if(gn(k))return;if(o){if(Object.values(o).some(N=>N.current&&N.current.contains(S.target)))return}else if(S.target.closest(".pointer-events-auto"))return;if(!((r||window.innerWidth<768||S.pointerType==="touch")&&e==="Fly")&&(y(),S.button===0&&e==="Fly")){c.current=!0;const{x:I,y:N}=b(S.clientX,S.clientY);d.current={x:I,y:N},f.current={x:I,y:N}}},j=S=>{if(c.current){const{x:k,y:P}=b(S.clientX,S.clientY);f.current={x:k,y:P},y()}else e==="Orbit"&&S.buttons>0&&(S.target===g||g.contains(S.target))&&y()},C=()=>c.current=!1;return g.addEventListener("mousedown",M),window.addEventListener("mousemove",j),window.addEventListener("mouseup",C),()=>{g.removeEventListener("mousedown",M),window.removeEventListener("mousemove",j),window.removeEventListener("mouseup",C)}},[e,s,r,o]),{moveState:l,isDraggingRef:c,dragStart:d,mousePos:f,speedRef:v,joystickMove:u,joystickLook:m,invertY:i,rollVelocity:p,isInteracting:()=>{const g=l.current,b=g.forward||g.backward||g.left||g.right||g.up||g.down||g.rollLeft||g.rollRight,M=Math.abs(u.current.x)>.01||Math.abs(u.current.y)>.01||Math.abs(m.current.x)>.01||Math.abs(m.current.y)>.01,j=performance.now()-h.current<200;return c.current||b||M||j}}},Mt=ge(),ma=10,md=e=>e<.001?e.toExponential(2):e.toFixed(4),gd=(e,n)=>{const t=F(h=>h.quality),o=w.useRef(1),s=w.useRef(!1),i=w.useRef(0),r=w.useRef(new Float32Array(4)),l=()=>{e.speed.current&&i.current%10===0&&(e.speed.current.innerText=`SPD ${(n.current*100).toFixed(1)}%`)},c=(h,p,u)=>{e.dist.current&&(e.dist.current.innerText=`DST ${md(h)}${p?` ${p}`:""}`,e.dist.current.style.color=u??(h<1?"#ff4444":"#00ffff"))},d=h=>{e.reset.current&&(e.reset.current.style.display=h>ma||h<.001?"block":"none")},f=h=>{if(h<0||h>=ma||!Number.isFinite(h)){s.current||(o.current=1,Mt.lastMeasuredDistance=1),c(o.current,"(sky)","#888"),e.reset.current&&(e.reset.current.style.display="block");return}s.current=!0;const p=o.current;let u=h;p>0&&h>p*1.5?u=p+(h-p)*.08:h<p&&(u=p+(h-p)*.4),o.current=u,Mt.lastMeasuredDistance=u,c(u),d(u)};return Aa(()=>{var y,x,g,b,M;if(i.current++,!Mt.hasCompiledShader||i.current<15){i.current%10===0&&(c(o.current),l());return}if(!t)return;if((t.physicsProbeMode??0)===2){const j=t.manualDistance;o.current=j,Mt.lastMeasuredDistance=j,c(j),d(j),l();return}const p=Mt.renderer;if(!p){const j=Mt.lastMeasuredDistance;if(j!==o.current){f(j);const C=o.current,S=F.getState();if(S.focusLock&&C>0&&C<ma){const k=((y=S.optics)==null?void 0:y.dofFocus)??0;Math.abs(C-k)/Math.max(k,1e-4)>.01&&S.setOptics({dofFocus:C})}}l();return}const u=(g=(x=Mt.pipeline)==null?void 0:x.getPreviousRenderTarget)==null?void 0:g.call(x);if(!u||u.width<=0||u.height<=0){i.current%10===0&&(c(o.current),l());return}const{width:m,height:v}=u;try{const j=Math.floor(m/2),C=Math.floor(v/2);let S=0,k=0;for(let P=-1;P<=1;P++)for(let I=-1;I<=1;I++){const N=j+P,T=C+I;if(N<0||N>=m||T<0||T>=v)continue;if((M=(b=Mt.pipeline)==null?void 0:b.readPixels)==null?void 0:M.call(b,p,N,T,1,1,r.current)){const D=r.current[3];D>0&&D<ma&&Number.isFinite(D)&&(S+=D,k++)}}f(k>0?S/k:1/0)}catch(j){console.warn("Depth readback failed:",j)}l()}),{distAverageRef:o}};class xd{constructor(){Q(this,"currentRotVelocity",new V);Q(this,"rollVelocity",0);Q(this,"smoothedDistEstimate",1);Q(this,"ROTATION_SMOOTHING",20);Q(this,"ROLL_SMOOTHING",3);Q(this,"SENSITIVITY",2.5);Q(this,"DIST_INCREASE_LERP_RATE",1.2)}reset(){this.currentRotVelocity.set(0,0,0),this.rollVelocity=0,this.smoothedDistEstimate=1}applyCurve(n){return Math.sign(n)*Math.pow(Math.abs(n),2)}update(n,t,o,s){let i=!1;const r=s.distEstimate,l=Math.min(t,.1);if(r>this.smoothedDistEstimate){const j=1-Math.exp(-this.DIST_INCREASE_LERP_RATE*l);this.smoothedDistEstimate+=(r-this.smoothedDistEstimate)*j}else this.smoothedDistEstimate=r;const c=this.smoothedDistEstimate,d=o.move.boost?4:1,f=s.autoSlow?Math.max(c*s.baseSpeed*d,1e-6):2*s.baseSpeed*d,h=new V(0,0,0);if(o.move.forward&&(h.z-=1),o.move.backward&&(h.z+=1),o.move.left&&(h.x-=1),o.move.right&&(h.x+=1),o.move.up&&(h.y+=1),o.move.down&&(h.y-=1),(Math.abs(o.moveJoy.x)>.01||Math.abs(o.moveJoy.y)>.01)&&(h.z-=this.applyCurve(o.moveJoy.y),h.x+=this.applyCurve(o.moveJoy.x)),h.lengthSq()>0){h.normalize().multiplyScalar(f*l);const j=h.clone().applyQuaternion(n.quaternion);Y.emit("offset_shift",{x:j.x,y:j.y,z:j.z}),i=!0}const u=o.move.rollLeft?1:o.move.rollRight?-1:0,m=u!==0?1:this.ROLL_SMOOTHING,v=1-Math.exp(-m*t),y=Math.max(.1,s.baseSpeed);this.rollVelocity+=(u*y-this.rollVelocity)*v,u===0&&Math.abs(this.rollVelocity)<.001&&(this.rollVelocity=0);const x=new V(0,0,0),g=o.invertY?-1:1,b=Math.abs(o.look.x)>.01||Math.abs(o.look.y)>.01;o.isDragging?(x.y=-o.dragDelta.x*2,x.x=o.dragDelta.y*2*g):b&&(x.y=-this.applyCurve(o.look.x)*.66,x.x=this.applyCurve(o.look.y)*.66*g),x.z=this.rollVelocity*.62;const M=1-Math.exp(-this.ROTATION_SMOOTHING*l);if(this.currentRotVelocity.lerp(x,M),this.currentRotVelocity.lengthSq()<1e-6&&this.currentRotVelocity.set(0,0,0),this.currentRotVelocity.lengthSq()>1e-8){const j=this.currentRotVelocity;n.rotateX(j.x*l*this.SENSITIVITY),n.rotateY(j.y*l*this.SENSITIVITY),n.rotateZ(j.z*l*this.SENSITIVITY),i=!0}return i}}const De=ge(),bd=({mode:e,onStart:n,onEnd:t,hudRefs:o,setSceneOffset:s,fitScale:i=1})=>{const{camera:r,gl:l}=In(),c=w.useRef(null),d=F(gn),f=F(K=>K.optics),h=f&&Math.abs(f.camType-1)<.1,p=F(K=>K.navigation),u=F(K=>K.setNavigation),m=le(K=>K.setIsCameraInteracting),[v,y]=w.useState(e==="Orbit"),x=w.useRef(new V(0,0,0)),g=w.useRef(new xd),b=w.useRef(3.5),M=w.useRef({x:0,y:0,z:0,xL:0,yL:0,zL:0}),j=w.useRef(new V),C=w.useRef(new Oe),S=w.useRef(new V),k=w.useRef(new V);w.useRef(0);const P=w.useRef(null),{moveState:I,isDraggingRef:N,dragStart:T,mousePos:L,speedRef:D,joystickMove:A,joystickLook:R,invertY:$,rollVelocity:O,isInteracting:H}=pd(e,(p==null?void 0:p.flySpeed)??.5,K=>u({flySpeed:K}),o),{distAverageRef:q}=gd(o,D),_=(K=!1)=>{if(r.position.lengthSq()<1e-8)return;const ue=De.sceneOffset,Ee={x:ue.x,y:ue.y,z:ue.z,xL:(ue.xL??0)+r.position.x,yL:(ue.yL??0)+r.position.y,zL:(ue.zL??0)+r.position.z};if(b.current=r.position.length()||b.current,r.position.set(0,0,0),r.updateMatrixWorld(),c.current){const Fe=new V(0,0,-1).applyQuaternion(r.quaternion);c.current.target.copy(Fe.multiplyScalar(1e-4)),x.current.copy(c.current.target)}K?De.queueOffsetSync(Ee):s(Ee),j.current.set(0,0,0)},U=K=>{r.updateMatrixWorld(),r.up.copy(new V(0,1,0).applyQuaternion(r.quaternion));let ue=K||De.lastMeasuredDistance;(ue<=1e-7||ue>=1e3)&&(ue=F.getState().targetDistance||3.5),b.current=ue;const Ee=new V(0,0,-1).applyQuaternion(r.quaternion),Fe=new V().copy(r.position).addScaledVector(Ee,ue);x.current.copy(Fe),y(!0)};w.useEffect(()=>{const K=F.getState();r.position.set(0,0,0),r.quaternion.set(K.cameraRot.x,K.cameraRot.y,K.cameraRot.z,K.cameraRot.w),r.updateMatrixWorld(),j.current.copy(r.position),C.current.copy(r.quaternion),K.targetDistance&&(q.current=K.targetDistance,b.current=K.targetDistance),e==="Orbit"&&U(K.targetDistance)},[]),w.useEffect(()=>{const K=pe=>{if(r.position.set(pe.position.x,pe.position.y,pe.position.z),r.quaternion.set(pe.rotation.x,pe.rotation.y,pe.rotation.z,pe.rotation.w),r.updateMatrixWorld(),S.current.set(0,0,0),k.current.set(0,0,0),g.current.reset(),j.current.copy(r.position),C.current.copy(r.quaternion),pe.targetDistance&&pe.targetDistance>.001&&(q.current=pe.targetDistance,b.current=pe.targetDistance,De.lastMeasuredDistance=pe.targetDistance),pe.sceneOffset&&(s(pe.sceneOffset),De.shouldSnapCamera=!0,De.dirty=!0),e==="Orbit"){const He=pe.targetDistance||q.current||3.5;b.current=He;const gt=new V(0,0,-1).applyQuaternion(r.quaternion);x.current.copy(r.position).addScaledVector(gt,He),c.current&&(c.current.target.copy(x.current),c.current.update())}},ue=()=>{},Ee=pe=>{if(!pe.sceneOffset){K(pe);return}const He=De.sceneOffset,gt=new V(He.x+(He.xL??0)+r.position.x,He.y+(He.yL??0)+r.position.y,He.z+(He.zL??0)+r.position.z),we=pe.sceneOffset,$e=new V(we.x+(we.xL??0)+pe.position.x,we.y+(we.yL??0)+pe.position.y,we.z+(we.zL??0)+pe.position.z);if(gt.distanceTo($e)<1e-6){K(pe);return}P.current={active:!0,startPos:gt,startRot:r.quaternion.clone(),endState:pe,endPos:$e,endRot:new Oe(pe.rotation.x,pe.rotation.y,pe.rotation.z,pe.rotation.w),elapsed:0,duration:.5}},Fe=Y.on("camera_teleport",K),Ut=Y.on("reset_accum",ue),nt=Y.on("camera_transition",Ee);return()=>{Fe(),Ut(),nt()}},[e,r]);const G=le(K=>K.isPlaying),E=le(K=>K.isScrubbing),B=le(K=>K.isRecording),z=le(K=>K.recordCamera),W=le(K=>K.currentFrame),Z=le(K=>K.sequence),X=le(K=>K.captureCameraFrame),ee=w.useRef(!1),te=w.useRef(null),re=w.useRef(e),ne=w.useRef(!1),xe=w.useRef(!1),Ie=w.useRef(null),de=w.useRef(G),ae=w.useRef(E),se=w.useRef(1),je=w.useRef(!1),Ne=w.useRef(!1);w.useEffect(()=>{const K=l.domElement,ue=()=>{xe.current=!0,Ie.current&&clearTimeout(Ie.current),Ie.current=setTimeout(()=>{xe.current=!1},100)};return K.addEventListener("wheel",ue,{passive:!0}),()=>{K.removeEventListener("wheel",ue),Ie.current&&clearTimeout(Ie.current)}},[l,e]),w.useEffect(()=>{if(e!=="Orbit")return;const K=l.domElement,ue=Fe=>{if(Fe.target.closest(".pointer-events-auto")){Ne.current=!1;return}Ne.current=!0,c.current&&(c.current.enabled=!0)},Ee=()=>{Ne.current=!1};return K.addEventListener("pointerdown",ue,{capture:!0}),window.addEventListener("pointerup",Ee),()=>{K.removeEventListener("pointerdown",ue,{capture:!0}),window.removeEventListener("pointerup",Ee)}},[e,l]);const ye=G&&(!B||!z)&&Object.keys(Z.tracks).some(K=>K.startsWith("camera."))||E;return je.current=ye,w.useEffect(()=>{ye?y(!1):e==="Orbit"&&!v&&U()},[ye,e]),w.useLayoutEffect(()=>{if(re.current!==e){if(Y.emit("camera_snap",void 0),_(),e==="Fly"){Y.emit("camera_snap",void 0),j.current.set(0,0,0),S.current.set(0,0,0),k.current.set(0,0,0),g.current.reset(),y(!1);const K=De.lastMeasuredDistance;K>.001?q.current=K:b.current>.001&&(q.current=b.current)}else e==="Orbit"&&U();re.current=e}},[e,r]),Aa((K,ue)=>{var gt;const Ee=de.current&&!G,Fe=ae.current&&!E;if((Ee||Fe)&&(Y.emit("camera_snap",void 0),e==="Orbit")){const we=q.current||De.lastMeasuredDistance||3.5;b.current=we;const $e=new V(0,0,-1).applyQuaternion(r.quaternion);x.current.copy(r.position).addScaledVector($e,we),c.current&&(c.current.target.copy(x.current),c.current.update())}if(de.current=G,ae.current=E,(gt=P.current)!=null&&gt.active){const we=P.current;we.elapsed+=ue;const $e=Math.min(we.elapsed/we.duration,1),J=$e*$e*(3-2*$e),ce=new V().lerpVectors(we.startPos,we.endPos,J),Se=we.startRot.clone().slerp(we.endRot,J),Me=be.split(ce.x),Je=be.split(ce.y),Le=be.split(ce.z),ca={x:Me.high,y:Je.high,z:Le.high,xL:Me.low,yL:Je.low,zL:Le.low};r.position.set(0,0,0),r.quaternion.copy(Se),r.updateMatrixWorld(),s(ca),De.shouldSnapCamera=!0,De.dirty=!0,j.current.copy(r.position),C.current.copy(r.quaternion),$e>=1&&(P.current=null,Y.emit("camera_teleport",we.endState));return}if(ye){c.current&&(c.current.enabled=!1),m&&m(!1),De.isCameraInteracting=!1;return}e==="Orbit"&&!v&&U();const Ut=r.position.distanceToSquared(j.current)>1e-12,nt=r.quaternion.angleTo(C.current)>1e-11,pe=H()||ne.current||xe.current;if(pe&&P.current&&(P.current=null),m&&m(pe),De.isCameraInteracting=pe,pe&&(Ut||nt)){if(De.dirty=!0,!ee.current&&n){ee.current=!0;const we=De.virtualSpace?De.virtualSpace.getUnifiedCameraState(r,De.lastMeasuredDistance):{position:{x:r.position.x,y:r.position.y,z:r.position.z},rotation:{x:r.quaternion.x,y:r.quaternion.y,z:r.quaternion.z,w:r.quaternion.w},sceneOffset:{...De.sceneOffset},targetDistance:De.lastMeasuredDistance};n(we)}B&&z&&X(W,!0,G?"Linear":"Bezier")}if((Ut||nt||pe)&&(te.current&&clearTimeout(te.current),te.current=setTimeout(()=>{if(ee.current=!1,t&&t(),F.getState().isUserInteracting)return;let we=De.lastMeasuredDistance;(we<=0||we>=1e3)&&(we=F.getState().targetDistance||3.5);const $e=De.sceneOffset,J={x:$e.x,y:$e.y,z:$e.z,xL:($e.xL??0)+r.position.x,yL:($e.yL??0)+r.position.y,zL:($e.zL??0)+r.position.z};be.normalize(J),F.setState({cameraRot:{x:r.quaternion.x,y:r.quaternion.y,z:r.quaternion.z,w:r.quaternion.w},sceneOffset:J,targetDistance:we})},100),j.current.copy(r.position),C.current.copy(r.quaternion)),e==="Fly"){if(d)return;const we=N.current?L.current.x-T.current.x:0,$e=N.current?L.current.y-T.current.y:0;g.current.update(r,ue,{move:I.current,look:R.current,moveJoy:A.current,isDragging:N.current,dragDelta:{x:we,y:$e},invertY:$},{baseSpeed:D.current,distEstimate:q.current,autoSlow:(p==null?void 0:p.autoSlow)??!0})}else if(e==="Orbit"&&c.current&&(c.current.enabled=!d&&!je.current&&(Ne.current||ne.current||xe.current),c.current.zoomSpeed=se.current,c.current.rotateSpeed=1/(i||1),Math.abs(O.current)>.01)){const we=new V;r.getWorldDirection(we),r.up.applyAxisAngle(we,-O.current*2*ue).normalize(),c.current.update()}const He=De.sceneOffset;M.current={x:He.x,y:He.y,z:He.z,xL:(He.xL??0)+r.position.x,yL:(He.yL??0)+r.position.y,zL:(He.zL??0)+r.position.z}}),e!=="Orbit"||!v||ye?null:a.jsx(Fs,{ref:c,enabled:!d,makeDefault:!0,enableDamping:!1,target:x.current,enableZoom:!h,mouseButtons:{LEFT:Ga.ROTATE,MIDDLE:Ga.DOLLY,RIGHT:Ga.PAN},touches:{ONE:Un.ROTATE,TWO:Un.DOLLY_PAN},onStart:()=>{if(ne.current=!0,c.current){const K=q.current>0?q.current:F.getState().targetDistance||3.5;b.current=K;const ue=new V(0,0,-1).applyQuaternion(r.quaternion),Ee=new V().copy(r.position).addScaledVector(ue,K);c.current.target.copy(Ee),c.current.update(),c.current.saveState();const Fe=r.position.distanceTo(Ee);Fe>1e-8&&(se.current=Math.max(.001,K/Fe*1.25)),j.current.copy(r.position)}},onEnd:()=>{ne.current=!1;const K=r.position.length();K>1e-4&&(b.current=K),_(!0)}})},yd=ge(),vd=()=>{const[e,n]=w.useState(!1),[t,o]=w.useState(0),s=w.useRef(0),i=w.useRef(0),r=w.useRef(15e3);w.useEffect(()=>{yd.isCompiling&&n(!0);const u=y=>{n(y)},m=Y.on("is_compiling",u),v=Y.on("compile_estimate",y=>{r.current=Math.max(2e3,y)});return()=>{m(),v()}},[]),w.useEffect(()=>{if(e){i.current=performance.now(),o(0);const u=r.current,m=()=>{const y=(performance.now()-i.current)/u,x=Math.min(95,95*(1-Math.exp(-3*y)));o(x),s.current=requestAnimationFrame(m)};s.current=requestAnimationFrame(m)}else t>0&&(cancelAnimationFrame(s.current),o(100));return()=>cancelAnimationFrame(s.current)},[!!e]);const l=!!e||t>=100,[c,d]=w.useState(!1);w.useEffect(()=>{if(t>=100&&!e){const u=setTimeout(()=>d(!0),800),m=setTimeout(()=>{d(!1),o(0)},1400);return()=>{clearTimeout(u),clearTimeout(m)}}},[t>=100&&!e]);const f=typeof e=="string"?e:"Compiling Shader...",h=typeof e=="string"&&e.includes("Lighting"),p=l&&!c;return a.jsx("div",{className:`fixed top-16 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none transition-opacity duration-500 ${p?h?"opacity-60":"opacity-100":"opacity-0"}`,children:a.jsxs("div",{className:"bg-black/80 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-full flex flex-col items-center gap-1.5 shadow-lg min-w-[200px]",children:[a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsx(Jo,{className:`animate-spin h-3 w-3 ${h?"text-amber-400":"text-cyan-400"}`}),a.jsx("span",{className:`text-[9px] font-bold ${h?"text-amber-200":"text-cyan-200"}`,children:f}),a.jsxs("span",{className:"text-[9px] font-mono text-gray-500",children:[Math.floor(t),"%"]})]}),a.jsx("div",{className:"w-full h-1 bg-white/5 rounded-full overflow-hidden",children:a.jsx("div",{className:`h-full rounded-full transition-[width] duration-150 ease-linear ${t>=100?"bg-green-400":h?"bg-amber-400/60":"bg-cyan-400/60"}`,style:{width:`${t}%`}})})]})})},Bt={SNAPSHOT:0,ANIMATE:1,OVERLAY:2,UI:3},Dt=[];let vn=!1;function Gt(e,n,t){if(Dt.some(s=>s.name===e))return()=>{};const o={name:e,phase:n,fn:t};return Dt.push(o),vn=!0,()=>{const s=Dt.indexOf(o);s>=0&&Dt.splice(s,1)}}function Po(e){vn&&(Dt.sort((n,t)=>n.phase-t.phase),vn=!1);for(let n=0;n<Dt.length;n++)Dt[n].fn(e)}const To=ge(),wd=Ue.forwardRef((e,n)=>{const{index:t,light:o,onDragStart:s}=e,i=w.useRef(null),r=w.useRef(null),l=F(u=>u.updateLight),{handleInteractionStart:c,handleInteractionEnd:d}=F(),f=F(u=>{var m,v,y;return((y=(v=(m=u.lighting)==null?void 0:m.lights)==null?void 0:v[t])==null?void 0:y.fixed)??o.fixed}),h=()=>{var x,g;const u=(g=(x=F.getState().lighting)==null?void 0:x.lights)==null?void 0:g[t];if(!u)return;const m=u.fixed;let v=u.position;const y=et();if(y){const b=To.sceneOffset;if(m){const M=new V(v.x,v.y,v.z);M.applyQuaternion(y.quaternion),M.add(y.position),v={x:M.x+b.x+(b.xL??0),y:M.y+b.y+(b.yL??0),z:M.z+b.z+(b.zL??0)}}else{const M=new V(v.x-b.x-(b.xL??0),v.y-b.y-(b.yL??0),v.z-b.z-(b.zL??0));M.sub(y.position),M.applyQuaternion(y.quaternion.clone().invert()),v={x:M.x,y:M.y,z:M.z}}}c("param"),l({index:t,params:{fixed:!m,position:v}}),d()};Ue.useImperativeHandle(n,()=>({hide:()=>{var u;(u=i.current)==null||u.hide()},update:()=>{var S,k,P;const u=((k=(S=F.getState().lighting)==null?void 0:S.lights)==null?void 0:k[t])??o,m=ra(),v=oa();if(!m||!v)return;const y=v.clientWidth,x=v.clientHeight,g=To.sceneOffset,b=Oc(u,m,g),M=u.fixed?m.quaternion:void 0;(P=i.current)==null||P.update(b,m,y,x,M);const j=r.current;if(!j)return;const C=j.querySelector(".range-circle");if(C){const I=u.range??0,N=bn.index===t;if(I>.001&&N){const T=new V(1,0,0).applyMatrix4(m.matrixWorld).sub(m.position).normalize(),L=b.clone().addScaledVector(T,I),D=mo(L,m,y,x),A=mo(b,m,y,x);if(D&&A){const R=D.x-A.x,$=D.y-A.y,O=Math.sqrt(R*R+$*$);C.setAttribute("r",String(Math.max(8,O))),C.style.opacity="0.6"}else C.style.opacity="0"}else C.style.opacity="0"}}}));const p=(u,m,v)=>{s(u,t,m,v)};return o.type==="Directional"?null:a.jsx("div",{ref:r,className:"contents",children:a.jsxs(zc,{ref:i,id:String(t),color:o.color,onDragStart:p,children:[a.jsx("svg",{className:"absolute overflow-visible pointer-events-none",style:{left:0,top:0},children:a.jsx("circle",{className:"range-circle pointer-events-none",cx:"0",cy:"0",r:"0",fill:"none",stroke:o.color,strokeWidth:"1",strokeDasharray:"4 3",style:{opacity:0,transition:"opacity 0.2s ease"}})}),a.jsxs("div",{className:"absolute top-[50px] left-0 transform -translate-x-1/2 flex items-center gap-1 bg-black/80 backdrop-blur px-1.5 py-0.5 rounded border border-white/20 select-none z-20 pointer-events-auto transition-transform hover:scale-105",children:[a.jsxs("span",{className:"text-[9px] font-bold text-white",children:["L",t+1]}),a.jsx("button",{className:"anchor-btn p-0.5 hover:text-cyan-400 transition-colors text-[9px]",onPointerDown:u=>u.stopPropagation(),onClick:u=>{u.stopPropagation(),h()},title:f?"Attached to Camera":"World Anchored",children:f?a.jsx(ds,{}):a.jsx(us,{})})]})]})})}),en=ge(),Rr={current:{}},Sd=()=>{var o,s,i,r;const e=(o=F.getState().lighting)==null?void 0:o.lights;if(!e)return;const n=dn(e);n!==e&&((i=(s=F.getState()).setLighting)==null||i.call(s,{lights:n}));const t=new Map(e.map(l=>[l.id,l]));for(const[l,c]of Object.entries(Rr.current)){const d=t.get(l);if(!d||!d.visible||d.type==="Directional"){(r=c.hide)==null||r.call(c);continue}try{c.update()}catch(f){console.error("Error updating light gizmo:",f)}}},Md=()=>{const e=F(u=>u.showLightGizmo),n=F(u=>{var m;return((m=u.lighting)==null?void 0:m.lights)||[]}),t=F(u=>u.setGizmoDragging);F(u=>u.updateLight);const o=F(u=>u.setDraggedLight),{handleInteractionStart:s,handleInteractionEnd:i}=F(),r=w.useRef(null),l=w.useMemo(()=>new tr,[]),c=w.useMemo(()=>new Pn,[]),d=Rr,f=(u,m,v,y)=>{u.preventDefault(),u.stopPropagation();const x=n[m];if(!x)return;s("param"),t(!0),en.isGizmoInteracting=!0,o(x.id??null),u.target.setPointerCapture(u.pointerId);const g=ra(),b=oa();if(!g||!b)return;const M=b.getBoundingClientRect(),j=new Te((u.clientX-M.left)/M.width*2-1,-((u.clientY-M.top)/M.height)*2+1);if(c.setFromCamera(j,g),v==="free"||v.startsWith("plane")){const C=new V;v==="free"?g.getWorldDirection(C):v==="plane-xy"?C.set(0,0,1):v==="plane-xz"?C.set(0,1,0):v==="plane-yz"&&C.set(1,0,0),v!=="free"&&x.fixed&&C.applyQuaternion(g.quaternion),l.setFromNormalAndCoplanarPoint(C,y);const S=new V,P=c.ray.intersectPlane(l,S)?new V().subVectors(y,S):new V(0,0,0);r.current={active:!0,index:m,mode:v,startPos:y.clone(),planeNormal:C,planeOrigin:y,offsetFromIntersection:P,startX:u.clientX,startY:u.clientY,screenAxis:new Te,worldAxis:new V}}else if(v.startsWith("axis")){let C=new V;v==="axis-x"&&C.set(1,0,0),v==="axis-y"&&C.set(0,1,0),v==="axis-z"&&C.set(0,0,1),x.fixed&&C.applyQuaternion(g.quaternion);const S=y.distanceTo(g.position)*.15,k=y.clone().addScaledVector(C,S),P=y.clone().project(g),I=k.clone().project(g),N=b.getBoundingClientRect();let T=(I.x-P.x)*N.width*.5,L=-(I.y-P.y)*N.height*.5;k.applyMatrix4(g.matrixWorldInverse).z>0&&(T=-T,L=-L);let A=new Te(T,L);A.lengthSq()<.5&&A.set(1,0),A.normalize(),r.current={active:!0,index:m,mode:v,startPos:y.clone(),planeNormal:new V,planeOrigin:new V,offsetFromIntersection:new V,startX:u.clientX,startY:u.clientY,screenAxis:A,worldAxis:C}}window.addEventListener("pointermove",h),window.addEventListener("pointerup",p)},h=u=>{var j;const m=r.current;if(!m||!m.active)return;u.preventDefault(),u.stopPropagation();const v=ra();if(!v)return;const x=(((j=F.getState().lighting)==null?void 0:j.lights)||[])[m.index];if(!x)return;let g=new V;if(m.mode==="free"||m.mode.startsWith("plane")){const C=oa();if(!C)return;const S=C.getBoundingClientRect(),k=new Te((u.clientX-S.left)/S.width*2-1,-((u.clientY-S.top)/S.height)*2+1);c.setFromCamera(k,v),l.setFromNormalAndCoplanarPoint(m.planeNormal,m.planeOrigin);const P=new V;if(c.ray.intersectPlane(l,P))g.copy(P).add(m.offsetFromIntersection);else return}else{const C=u.clientX-m.startX,S=u.clientY-m.startY,k=C*m.screenAxis.x+S*m.screenAxis.y,I=m.startPos.distanceTo(v.position)*.0025;g.copy(m.startPos).addScaledVector(m.worldAxis,k*I)}u.shiftKey&&(g.x=Math.round(g.x/.25)*.25,g.y=Math.round(g.y/.25)*.25,g.z=Math.round(g.z/.25)*.25);const b=en.sceneOffset;let M;if(x.fixed){const C=g.clone().sub(v.position).applyQuaternion(v.quaternion.clone().invert());M={x:C.x,y:C.y,z:C.z}}else M={x:g.x+b.x+(b.xL??0),y:g.y+b.y+(b.yL??0),z:g.z+b.z+(b.zL??0)};F.getState().updateLight({index:m.index,params:{position:M}})},p=u=>{r.current&&(t(!1),o(null),en.isGizmoInteracting=!1,i(),r.current=null,window.removeEventListener("pointermove",h),window.removeEventListener("pointerup",p))};return e?a.jsx("div",{className:"absolute inset-0 pointer-events-none",children:n.map((u,m)=>a.jsx(wd,{index:m,light:u,onDragStart:f,ref:v=>{const y=u.id;y&&(v?d.current[y]=v:delete d.current[y])}},u.id||m))}):null},Nt=ge(),Pe=new V,jt=new V,Ze=new V,Rt=new Oe,Cd=(e,n,t,o,s)=>{Sr(e.center,s,jt),Rt.set(e.orientation.x,e.orientation.y,e.orientation.z,e.orientation.w);const i=e.size.x/2,r=e.size.y/2,l=e.zOffset||0,c=e.size.z||0,d=e.type==="rect"&&c>.001,f=d?l-c/2:l;if(e.type==="circle"){const u=[];for(let v=0;v<=48;v++){const y=v/48*Math.PI*2;Pe.set(Math.cos(y)*i,Math.sin(y)*r,f),Pe.applyQuaternion(Rt).add(jt),u.push(lt(Pe,n,t,o))}return u}if(d){const u=[];for(const m of[-1,1])for(const v of[-1,1])for(const y of[-1,1])Pe.set(m*i,v*r,f+y*c/2),Pe.applyQuaternion(Rt).add(jt),u.push(lt(Pe,n,t,o));return u}const h=[],p=[[-1,-1],[1,-1],[1,1],[-1,1]];for(const[u,m]of p)Pe.set(u*i,m*r,f),Pe.applyQuaternion(Rt).add(jt),h.push(lt(Pe,n,t,o));return h},wn=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]],Ot=new Map,ia=new Map;let Ge={svgEl:null,labelsEl:null,axesSvgEl:null,tempShapeRef:null,axesOriginRef:null},ga=[];function kd(e,n,t){if(ga.length=0,e)for(const o of e)ga.push({shape:o,color:o.color,isTemp:!1});return n&&n.center&&n.size&&n.orientation&&ga.push({shape:n,color:"#"+t.getHexString(),isTemp:!0}),ga}function jd(e,n){let t=Ot.get(n);return(!t||!t.isConnected)&&(t=document.createElementNS("http://www.w3.org/2000/svg","path"),t.setAttribute("data-shape-id",n),t.setAttribute("fill","none"),t.setAttribute("stroke-opacity","0.9"),e.appendChild(t),Ot.set(n,t)),t}function Rd(e,n){let t=Ot.get(n);if(!t||!t.isConnected){t=document.createElementNS("http://www.w3.org/2000/svg","g"),t.setAttribute("data-shape-id",n);for(let o=0;o<wn.length;o++){const s=document.createElementNS("http://www.w3.org/2000/svg","line");s.setAttribute("stroke-opacity","0.9"),t.appendChild(s)}e.appendChild(t),Ot.set(n,t)}return t}function Id(e,n){let t=ia.get(n);if(!t||!t.isConnected){t=document.createElement("div"),t.setAttribute("data-label-id",n),t.style.position="absolute",t.style.left="0",t.style.top="0",t.style.pointerEvents="none",t.innerHTML='<div data-role="width" class="absolute text-[10px] font-mono font-bold whitespace-nowrap text-cyan-300 opacity-90 px-1" style="pointer-events:none"></div><div data-role="height" class="absolute text-[10px] font-mono font-bold whitespace-nowrap text-cyan-300 opacity-90 px-1" style="pointer-events:none"></div><div data-role="delete" class="drawing-ui absolute cursor-pointer flex items-center justify-center w-4 h-4 bg-red-900/80 hover:bg-red-500 text-white rounded-full transition-colors shadow-sm border border-white/20" style="pointer-events:auto" title="Delete Shape"><span class="text-[10px] font-bold leading-none mb-[1px]">✕</span></div>';const o=t.querySelector('[data-role="delete"]');o&&o.addEventListener("click",s=>{s.stopPropagation(),F.getState().removeDrawnShape(n)}),e.appendChild(t),ia.set(n,t)}return t}const Pd=()=>{var y;const e=Dc();if(!e)return;const{camera:n,width:t,height:o}=e,i=F.getState().drawing;if(!i)return;const{shapes:r,showLabels:l,showAxes:c}=i,d=Nt.sceneOffset,f=((y=Ge.tempShapeRef)==null?void 0:y.current)??null;if(!(r&&r.length>0||f||c))return;const p=Ge.svgEl,u=Ge.labelsEl,m=kd(r,f,i.color),v=new Set;for(const{shape:x,isTemp:g}of m)v.add(x.id||"temp");if(p){p.setAttribute("width",String(t)),p.setAttribute("height",String(o));for(const{shape:x,color:g,isTemp:b}of m){const M=x.id||"temp",j=x.type==="rect"&&(x.size.z||0)>.001,C=Cd(x,n,t,o,d),S=C.some(k=>k.behind);if(j){const k=Rd(p,M);if(S)k.setAttribute("visibility","hidden");else{k.setAttribute("visibility","visible");const P=k.children;for(let I=0;I<wn.length;I++){const[N,T]=wn[I],L=P[I];L&&(L.setAttribute("x1",String(C[N].x)),L.setAttribute("y1",String(C[N].y)),L.setAttribute("x2",String(C[T].x)),L.setAttribute("y2",String(C[T].y)),L.setAttribute("stroke",g),L.setAttribute("stroke-width",b?"1":"1.5"))}}}else{const k=jd(p,M);if(S)k.setAttribute("visibility","hidden");else{k.setAttribute("visibility","visible");const P=C.map((I,N)=>`${N===0?"M":"L"}${I.x},${I.y}`).join(" ")+" Z";k.setAttribute("d",P),k.setAttribute("stroke",g),k.setAttribute("stroke-width",b?"1":"1.5")}}}for(const[x,g]of Ot)v.has(x)||(g.remove(),Ot.delete(x))}if(u){for(const{shape:g,isTemp:b}of m){if(!l)continue;const M=g.id||"temp";Sr(g.center,d,jt),Rt.set(g.orientation.x,g.orientation.y,g.orientation.z,g.orientation.w);const j=g.size.x/2,C=g.size.y/2,S=g.size.z||0,k=g.zOffset||0,P=g.type==="rect"&&S>.001?k-S/2:k;Pe.set(0,C,P+S/2).applyQuaternion(Rt).add(jt);const I=lt(Pe,n,t,o);Pe.set(-j,0,P+S/2).applyQuaternion(Rt).add(jt);const N=lt(Pe,n,t,o);Pe.set(j,C,P+S/2).applyQuaternion(Rt).add(jt);const T=lt(Pe,n,t,o),L=I.behind||N.behind,D=Id(u,M);if(L)D.style.display="none";else{D.style.display="";const A=D.children[0],R=D.children[1],$=D.children[2];A&&(A.style.left=`${I.x}px`,A.style.top=`${I.y}px`,A.style.transform="translate(-50%, -100%)",A.textContent=g.size.x.toFixed(4)),R&&(R.style.left=`${N.x}px`,R.style.top=`${N.y}px`,R.style.transform="translate(-100%, -50%) rotate(90deg)",R.style.transformOrigin="right center",R.textContent=g.size.y.toFixed(4)),$&&(b||T.behind?$.style.display="none":($.style.display="",$.style.left=`${T.x}px`,$.style.top=`${T.y}px`,$.style.transform="translate(25%, -75%)"))}}const x=l?v:new Set;for(const[g,b]of ia)x.has(g)||(b.remove(),ia.delete(g))}if(c&&Ge.axesSvgEl&&Ge.axesOriginRef){const x=Ge.axesSvgEl;x.setAttribute("width",String(t)),x.setAttribute("height",String(o)),x.style.display="";const g=Ge.axesOriginRef.current;Ze.set(g.x-d.x+(g.xL-d.xL),g.y-d.y+(g.yL-d.yL),g.z-d.z+(g.zL-d.zL));const b=lt(Ze,n,t,o);if(b.behind){x.style.display="none";return}const M=2,j=[{dx:M,dy:0,dz:0},{dx:0,dy:M,dz:0},{dx:0,dy:0,dz:M}],C=x.querySelectorAll("[data-axis]");for(let P=0;P<j.length;P++){const I=j[P];Pe.set(Ze.x+I.dx,Ze.y+I.dy,Ze.z+I.dz);const N=lt(Pe,n,t,o),T=C[P];T&&(N.behind?T.setAttribute("visibility","hidden"):(T.setAttribute("visibility","visible"),T.setAttribute("x1",String(b.x)),T.setAttribute("y1",String(b.y)),T.setAttribute("x2",String(N.x)),T.setAttribute("y2",String(N.y))))}const S=x.querySelectorAll("[data-grid]");let k=0;for(let P=0;P<11;P++){const I=P-5,N=I===0;Pe.set(Ze.x+I,Ze.y,Ze.z-5);const T=lt(Pe,n,t,o);Pe.set(Ze.x+I,Ze.y,Ze.z+5);const L=lt(Pe,n,t,o),D=S[k++];D&&(T.behind||L.behind?D.setAttribute("visibility","hidden"):(D.setAttribute("visibility","visible"),D.setAttribute("x1",String(T.x)),D.setAttribute("y1",String(T.y)),D.setAttribute("x2",String(L.x)),D.setAttribute("y2",String(L.y)),D.setAttribute("stroke",N?"#ff4444":"#444444"),D.setAttribute("stroke-width",N?"1.5":"0.5"))),Pe.set(Ze.x-5,Ze.y,Ze.z+I);const A=lt(Pe,n,t,o);Pe.set(Ze.x+5,Ze.y,Ze.z+I);const R=lt(Pe,n,t,o),$=S[k++];$&&(A.behind||R.behind?$.setAttribute("visibility","hidden"):($.setAttribute("visibility","visible"),$.setAttribute("x1",String(A.x)),$.setAttribute("y1",String(A.y)),$.setAttribute("x2",String(R.x)),$.setAttribute("y2",String(R.y)),$.setAttribute("stroke",N?"#4444ff":"#444444"),$.setAttribute("stroke-width",N?"1.5":"0.5")))}}else Ge.axesSvgEl&&(Ge.axesSvgEl.style.display="none")},Td=()=>{const{drawing:e,setDrawing:n,addDrawnShape:t}=F(),{active:o,activeTool:s,originMode:i}=e,r=w.useRef(null),l=w.useRef(null),c=w.useRef(null),d=w.useRef(null),f=w.useRef(null),h=w.useRef(!1),p=w.useRef({x:0,y:0,z:0,xL:0,yL:0,zL:0}),u=w.useRef(new V),m=w.useRef(new Te),v=w.useRef(new V),y=w.useRef(new tr),x=w.useRef(new V),g=w.useRef(new V),b=w.useRef({space:!1,x:!1});w.useEffect(()=>(Ge.svgEl=r.current,Ge.labelsEl=c.current,Ge.axesSvgEl=d.current,Ge.tempShapeRef=f,Ge.axesOriginRef=p,()=>{Ge.svgEl=null,Ge.labelsEl=null,Ge.axesSvgEl=null,Ge.tempShapeRef=null,Ge.axesOriginRef=null,Ot.clear(),ia.clear()}),[]);const M=F(P=>{var I;return(I=P.drawing)==null?void 0:I.refreshTrigger});w.useEffect(()=>{var L;const P=et();if(!P)return;const I=((L=F.getState().drawing)==null?void 0:L.originMode)??1;let N=new V(0,0,0);if(I===1){const D=Math.max(.1,Nt.lastMeasuredDistance),A=new V(0,0,-1).applyQuaternion(P.quaternion);N.copy(P.position).addScaledVector(A,D)}else{const D=Nt.sceneOffset;N.set(-(D.x+D.xL),-(D.y+D.yL),-(D.z+D.zL))}const T=Nt.sceneOffset;p.current={x:T.x,y:T.y,z:T.z,xL:T.xL+N.x,yL:T.yL+N.y,zL:T.zL+N.z}},[i,M]);const j=w.useCallback(()=>et(),[]),C=w.useCallback(()=>oa(),[]),S=w.useCallback(P=>{const I=j();if(!I)return new V(0,0,-1);let T=new V(0,0,-1).applyQuaternion(I.quaternion).clone().negate();if(P){const R=Math.abs(T.x),$=Math.abs(T.y),O=Math.abs(T.z);R>$&&R>O?T.set(Math.sign(T.x),0,0):$>O?T.set(0,Math.sign(T.y),0):T.set(0,0,Math.sign(T.z))}let L=new V(0,1,0);Math.abs(T.dot(L))>.99&&L.set(0,0,-1);let D=L.clone().sub(T.clone().multiplyScalar(L.dot(T)));D.normalize();const A=new V().crossVectors(D,T).normalize();return x.current.copy(A),g.current.copy(D),y.current.setFromNormalAndCoplanarPoint(T,v.current),T},[j]),k=w.useCallback((P,I,N)=>{const T=j();if(!T)return null;const L=new Te((P-N.left)/N.width*2-1,-((I-N.top)/N.height)*2+1),D=new Pn;D.setFromCamera(L,T);const A=new V;return D.ray.intersectPlane(y.current,A)?A:null},[j]);return w.useEffect(()=>{const P=N=>{N.key==="Alt"&&N.preventDefault(),N.code==="Space"&&(b.current.space=!0,N.preventDefault()),N.key.toLowerCase()==="x"&&(b.current.x=!0)},I=N=>{N.key==="Alt"&&N.preventDefault(),N.code==="Space"&&(b.current.space=!1),N.key.toLowerCase()==="x"&&(b.current.x=!1)};return window.addEventListener("keydown",P),window.addEventListener("keyup",I),()=>{window.removeEventListener("keydown",P),window.removeEventListener("keyup",I)}},[]),w.useEffect(()=>{if(!o)return;const P=C();if(!P)return;const I=L=>{if(L.button!==0||L.target.closest(".drawing-ui"))return;const D=j();if(!D)return;const A=P.getBoundingClientRect();if(m.current.set(L.clientX,L.clientY),i===1){const O=Math.max(.1,Nt.lastMeasuredDistance),H=new V(0,0,-1).applyQuaternion(D.quaternion);v.current.copy(D.position).addScaledVector(H,O)}else{const O=Nt.sceneOffset;v.current.set(-(O.x+O.xL),-(O.y+O.yL),-(O.z+O.zL))}const R=S(b.current.x),$=k(L.clientX,L.clientY,A);$&&(h.current=!0,u.current.copy($),f.current={center:void 0,size:{x:0,y:0},orientation:new Oe().setFromRotationMatrix(new _t().makeBasis(x.current,g.current,R)),type:s},P.setPointerCapture(L.pointerId))},N=L=>{var U;if(!h.current)return;const D=P.getBoundingClientRect(),A=S(b.current.x),R=k(L.clientX,L.clientY,D);if(!R)return;if(b.current.space){const G=k(m.current.x,m.current.y,D);if(G){const E=new V().subVectors(R,G);if(u.current.add(E),(U=f.current)!=null&&U.center){const B=f.current.center;f.current={...f.current,center:{...B,xL:B.xL+E.x,yL:B.yL+E.y,zL:B.zL+E.z}}}}m.current.set(L.clientX,L.clientY);return}m.current.set(L.clientX,L.clientY);const $=new V().subVectors(R,u.current);let O=$.dot(x.current),H=$.dot(g.current),q;if(L.altKey?(O*=2,H*=2,q=u.current.clone()):q=u.current.clone().addScaledVector(x.current,O*.5).addScaledVector(g.current,H*.5),L.shiftKey){const G=Math.max(Math.abs(O),Math.abs(H));O=Math.sign(O)*G,H=Math.sign(H)*G,L.altKey||(q=u.current.clone().addScaledVector(x.current,O*.5).addScaledVector(g.current,H*.5))}const _=Nt.sceneOffset;f.current={...f.current,center:{x:_.x,y:_.y,z:_.z,xL:_.xL+q.x,yL:_.yL+q.y,zL:_.zL+q.z},size:{x:Math.abs(O),y:Math.abs(H)},orientation:new Oe().setFromRotationMatrix(new _t().makeBasis(x.current,g.current,A))}},T=L=>{if(!h.current)return;h.current=!1,P.releasePointerCapture(L.pointerId);const D=f.current,A=F.getState().drawing.color;D&&D.center&&D.size&&D.orientation&&(D.size.x>.001||D.size.y>.001)&&(t({id:ot(),type:D.type||"rect",center:D.center,size:D.size,orientation:D.orientation,color:"#"+A.getHexString()}),n({active:!1})),f.current=null};return P.addEventListener("pointerdown",I),P.addEventListener("pointermove",N),P.addEventListener("pointerup",T),()=>{P.removeEventListener("pointerdown",I),P.removeEventListener("pointermove",N),P.removeEventListener("pointerup",T)}},[o,s,i,j,C,n,S,k,t]),a.jsxs("div",{ref:l,className:"absolute inset-0 overflow-hidden",style:{pointerEvents:"none"},children:[a.jsx("svg",{ref:r,className:"absolute inset-0",style:{pointerEvents:"none"}}),a.jsx("div",{ref:c,className:"absolute inset-0",style:{pointerEvents:"none"}}),a.jsxs("svg",{ref:d,className:"absolute inset-0",style:{pointerEvents:"none",display:"none"},children:[a.jsx("line",{"data-axis":"x",stroke:"#ff4444",strokeWidth:2,strokeOpacity:.7}),a.jsx("line",{"data-axis":"y",stroke:"#44ff44",strokeWidth:2,strokeOpacity:.7}),a.jsx("line",{"data-axis":"z",stroke:"#4444ff",strokeWidth:2,strokeOpacity:.7}),Array.from({length:22},(P,I)=>a.jsx("line",{"data-grid":I,strokeOpacity:.5},I))]})]})},Sn={displays:new Map},Mn={diamonds:new Map},Ed={diamonds:new Map},xa=(e,n)=>{n?(e.style.setProperty("background-color","#991b1b","important"),e.style.setProperty("border-color","#f87171","important")):(e.style.removeProperty("background-color"),e.style.removeProperty("border-color"))},Ld=()=>{const e=le.getState(),{isPlaying:n,currentFrame:t,sequence:o}=e;Sn.displays.forEach((s,i)=>{if(s)try{const r=Za(i,n,t,o);s.innerText=r.toFixed(2)}catch(r){console.error("Error updating live value display:",r)}}),n||(Mn.diamonds.forEach(s=>{const{el:i,frame:r,tid:l}=s;if(Math.abs(r-t)<.1){const d=o.tracks[l];if(d){const f=d.keyframes.find(h=>Math.abs(h.frame-r)<.1);if(f){const h=Za(l,!1),p=Math.abs(f.value-h)>.001;xa(i,p)}}}else xa(i,!1)}),Ed.diamonds.forEach(s=>{const{el:i,frame:r,tids:l}=s;if(Math.abs(r-t)<.1){let d=!1;for(const f of l){const h=o.tracks[f];if(h){const p=h.keyframes.find(u=>Math.abs(u.frame-r)<.1);if(p){const u=Za(f,!1);if(Math.abs(p.value-u)>.001){d=!0;break}}}}xa(i,d)}else xa(i,!1)}))},Nd=({tid:e})=>{const n=w.useRef(null);return w.useEffect(()=>(n.current&&Sn.displays.set(e,n.current),()=>{Sn.displays.delete(e)}),[e]),a.jsx("span",{ref:n,className:"text-[9px] font-mono text-gray-600 w-12 text-right",children:"--"})},Dd=({tid:e,kid:n,frame:t,isSelected:o,interpolation:s})=>{const i=w.useRef(null),r=`${e}::${n}`;w.useEffect(()=>(i.current&&Mn.diamonds.set(r,{el:i.current,frame:t,tid:e}),()=>{Mn.diamonds.delete(r)}),[r,t,e]);const l=s==="Linear"?"rotate-45 rounded-sm":s==="Step"?"rounded-none":"rounded-full";return a.jsx("div",{ref:i,className:`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 border transition-transform ${o?"bg-white border-white scale-125 z-30":"bg-cyan-900 border-cyan-400 group-hover/key:scale-125 group-hover/key:bg-cyan-400"} ${l}`})},$h=w.memo(({tid:e,sequence:n,frameWidth:t,isSelected:o,selectedKeys:s,onSelect:i,onRemove:r,onAddKey:l,onKeyMouseDown:c})=>{const d=F(h=>h.openContextMenu),f=h=>{const p=Ye(h.currentTarget);p.length>0&&(h.preventDefault(),h.stopPropagation(),d(h.clientX,h.clientY,[],p))};return a.jsxs("div",{className:"flex border-b border-white/5 bg-transparent hover:bg-white/5",style:{height:32},"data-help-id":"anim.tracks",children:[a.jsxs("div",{className:`sticky left-0 z-30 w-[220px] bg-black/80 backdrop-blur-sm border-r border-white/10 shrink-0 flex items-center justify-between px-3 cursor-pointer group select-none ${o?"border-l-2 border-l-cyan-500":""}`,onClick:h=>i(h,e),onMouseDown:h=>h.stopPropagation(),onContextMenu:f,"data-help-id":"anim.tracks",children:[a.jsx("div",{className:"truncate text-[10px] font-bold text-gray-400 group-hover:text-cyan-400 pl-4",title:n.tracks[e].label,children:n.tracks[e].label}),a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsx(Nd,{tid:e}),a.jsx("button",{onClick:h=>{h.stopPropagation(),r()},className:"opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400",children:a.jsx($t,{})})]})]}),a.jsxs("div",{className:"flex-1 relative group/track z-10",onDoubleClick:h=>{h.stopPropagation();const p=h.currentTarget.getBoundingClientRect(),u=Math.max(0,Math.round((h.clientX-p.left)/t));l(u)},children:[a.jsx("div",{className:"absolute inset-0 opacity-0 group-hover/track:opacity-5 bg-white pointer-events-none"}),n.tracks[e].keyframes.map(h=>{const p=s.includes(`${e}::${h.id}`);return a.jsx("div",{className:"absolute top-1/2 -translate-y-1/2 z-20 cursor-grab group/key",style:{left:`${h.frame*t-10}px`,width:"20px",height:"20px"},onMouseDown:u=>c(u,e,h.id),"data-help-id":"anim.keyframes",children:a.jsx(Dd,{tid:e,kid:h.id,frame:h.frame,isSelected:p,interpolation:h.interpolation})},h.id)})]})]})});Gt("snapshotDisplayCamera",Bt.SNAPSHOT,()=>{const e=et();e&&ai(e)});Gt("animationTick",Bt.ANIMATE,td);Gt("lightGizmoTick",Bt.OVERLAY,Sd);Gt("drawingOverlayTick",Bt.OVERLAY,Pd);Gt("fpsCounterTick",Bt.UI,uc);Gt("performanceMonitorTick",Bt.UI,rd);Gt("trackRowTick",Bt.UI,Ld);const _d=({onLoaded:e})=>{const{camera:n,size:t,gl:o}=In(),[s,i]=w.useState(!1),r=ge(),l=F(f=>f.dpr),c=w.useRef({width:t.width,height:t.height,dpr:l});c.current={width:t.width,height:t.height,dpr:l},w.useEffect(()=>{ei(n),ti(o.domElement)},[n,o]),w.useEffect(()=>{let f=!0;return(async()=>{let p=0;for(;!r.isBooted;){if(!f)return;if(++p>=300){console.error("[WorkerTickScene] Worker boot timeout after 30s");return}await new Promise(u=>setTimeout(u,100))}for(;r.isCompiling;){if(!f)return;await new Promise(u=>setTimeout(u,100))}if(f){const u=c.current;r.resizeWorker(u.width,u.height,u.dpr);const m=r.pendingTeleport;m&&(r.pendingTeleport=null,Y.emit(me.CAMERA_TELEPORT,m)),i(!0),e&&e()}})(),()=>{f=!1}},[]),w.useEffect(()=>{r.resizeWorker(t.width,t.height,l)},[t.width,t.height,l]),w.useEffect(()=>{const f=[Y.on(me.CONFIG,h=>{r.isBooted&&r.sendConfig(h)}),Y.on(me.UNIFORM,({key:h,value:p,noReset:u})=>{r.isBooted&&r.setUniform(h,p,u)}),Y.on(me.RESET_ACCUM,()=>{r.isBooted&&r.resetAccumulation()}),Y.on(me.OFFSET_SET,h=>{const p={x:h.x,y:h.y,z:h.z,xL:h.xL??0,yL:h.yL??0,zL:h.zL??0};r.setShadowOffset(p),r.isBooted&&r.post({type:"OFFSET_SET",offset:p})}),Y.on(me.OFFSET_SHIFT,({x:h,y:p,z:u})=>{r.applyOffsetShift(h,p,u),r.isBooted&&r.post({type:"OFFSET_SHIFT",x:h,y:p,z:u})}),Y.on(me.CAMERA_SNAP,()=>{r.shouldSnapCamera=!0}),Y.on(me.TEXTURE,({textureType:h,dataUrl:p})=>{r.isBooted&&r.updateTexture(h,p)}),Y.on(me.REGISTER_FORMULA,({id:h,shader:p})=>{r.registerFormula(h,p)})];return()=>{f.forEach(h=>h())}},[]);const d=Ue.useRef({lastYield:0,fps:60,frames:0,lastSample:0});return Aa((f,h)=>{var C;if(!s)return;const p=Math.min(h,.1),u=performance.now(),m=d.current;if(m.frames++,u-m.lastSample>=500&&(m.fps=m.frames*1e3/(u-m.lastSample),m.frames=0,m.lastSample=u),m.fps<20&&u-m.lastYield>=1e3){m.lastYield=u,Po(p);return}Po(p);const v=n,y=((C=F.getState().optics)==null?void 0:C.camFov)??60;v.fov!==y&&(v.fov=y,v.updateProjectionMatrix());const x={position:[v.position.x,v.position.y,v.position.z],quaternion:[v.quaternion.x,v.quaternion.y,v.quaternion.z,v.quaternion.w],fov:v.fov||60,aspect:v.aspect||t.width/t.height},g=F.getState(),b=g.sceneOffset||{x:0,y:0,z:0,xL:0,yL:0,zL:0},M={x:b.x,y:b.y,z:b.z,xL:b.xL??0,yL:b.yL??0,zL:b.zL??0},j={cameraMode:g.cameraMode,isCameraInteracting:le.getState().isCameraInteracting,isGizmoInteracting:r.isGizmoInteracting,optics:g.optics??null,lighting:g.lighting??null,quality:g.quality??null,geometry:g.geometry??null};r.sendRenderTick(x,M,p,j)},1),null},Fd=({width:e,height:n})=>{const t=w.useRef(null),o=w.useRef(!1);return w.useEffect(()=>{const s=ge();return s.onCrash=i=>{console.error(`[WorkerDisplay] Worker crashed: ${i}.`)},()=>{s.onCrash=null}},[]),w.useEffect(()=>{var g,b;if(o.current||!t.current)return;o.current=!0;const s=t.current;if(typeof HTMLCanvasElement.prototype.transferControlToOffscreen!="function"){const M=document.createElement("div");M.style.cssText="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#1a1a2e;color:#e0e0e0;font:16px/1.5 system-ui,sans-serif;padding:2rem;text-align:center",M.innerHTML='<div><h2 style="color:#ff6b6b;margin:0 0 .5rem">Browser Not Supported</h2><p>GMT requires <b>OffscreenCanvas</b> support.<br>Please use a recent version of Chrome, Edge, or Firefox.</p></div>',s.appendChild(M);return}const i=window.devicePixelRatio||1,r=s.getBoundingClientRect(),l=r.width>0?r.width:e,c=r.height>0?r.height:n,d=document.createElement("canvas");d.width=l*i,d.height=c*i,d.style.cssText="position:absolute;inset:0;width:100%;height:100%;pointer-events:none",s.appendChild(d);const f=F.getState(),h=Oa(f),p=((g=window.matchMedia)==null?void 0:g.call(window,"(pointer: coarse)").matches)||window.innerWidth<768,u=ge(),m=f.cameraRot||{x:0,y:0,z:0,w:1},v=((b=f.optics)==null?void 0:b.camFov)??60;u.initWorkerMode(d,h,l,c,i,p,{position:[0,0,0],quaternion:[m.x,m.y,m.z,m.w],fov:v}),f.setCanvasPixelSize(Math.floor(l*i),Math.floor(c*i));const y=f.sceneOffset;if(y){const M={x:y.x,y:y.y,z:y.z,xL:y.xL??0,yL:y.yL??0,zL:y.zL??0};u.setShadowOffset(M),u.post({type:"OFFSET_SET",offset:M})}const x=new ResizeObserver(M=>{if(!F.getState().isBucketRendering)for(const j of M){const C=Math.max(1,j.contentRect.width),S=Math.max(1,j.contentRect.height),k=window.devicePixelRatio||1;u.resizeWorker(C,S,k),F.getState().setCanvasPixelSize(Math.floor(C*k),Math.floor(S*k))}});return x.observe(s),()=>x.disconnect()},[]),a.jsx("div",{ref:t,style:{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}})},Eo=ge(),Lo=12,Ad=40,zd=()=>{const e=oe.getViewportOverlays().filter(o=>o.type==="dom"),n=F(),t=F();return a.jsx("div",{className:"absolute inset-0 pointer-events-none z-[20]",children:e.map(o=>{const s=ve.get(o.componentId),i=o.id,r=n[i];return s&&r?a.jsx(s,{featureId:i,sliceState:r,actions:t},o.id):null})})},Od=()=>{const e=oe.getViewportOverlays().filter(o=>!o.type||o.type==="scene"),n=F(),t=F();return a.jsx(a.Fragment,{children:e.map(o=>{const s=ve.get(o.componentId),i=o.id,r=n[i];return s&&r?a.jsx(s,{featureId:i,sliceState:r,actions:t},o.id):null})})},$d=["n","s","e","w","ne","nw","se","sw"],Hd={n:"top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize",s:"bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize",e:"top-1/2 right-0 -translate-y-1/2 translate-x-1/2 cursor-ew-resize",w:"top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 cursor-ew-resize",ne:"top-0 right-0 -translate-y-1/2 translate-x-1/2 cursor-nesw-resize",nw:"top-0 left-0 -translate-y-1/2 -translate-x-1/2 cursor-nwse-resize",se:"bottom-0 right-0 translate-y-1/2 translate-x-1/2 cursor-nwse-resize",sw:"bottom-0 left-0 translate-y-1/2 -translate-x-1/2 cursor-nesw-resize"},Bd=({region:e,isGhostDragging:n,isDrawing:t,onClear:o})=>{const s=F(b=>b.sampleCap),i=F(b=>b.setSampleCap),r=F(b=>b.convergenceThreshold),l=F(b=>b.canvasPixelSize),[c,d]=w.useState(0),[f,h]=w.useState(1);w.useEffect(()=>{const b=setInterval(()=>{d(Eo.accumulationCount),h(Eo.convergenceValue)},100);return()=>clearInterval(b)},[]);const p=Math.round((e.maxX-e.minX)*l[0]),u=Math.round((e.maxY-e.minY)*l[1]),m=s>0&&c>=s,v=r/100,y=f<v&&c>2,x=w.useCallback(()=>{const b=[0,64,128,256,512,1024,2048,4096],M=b.indexOf(s),j=M>=0?b[(M+1)%b.length]:256;i(j)},[s,i]),g=t?"border-cyan-400 border-dashed opacity-70":n?"border-cyan-400 border-dashed opacity-80":"border-cyan-500 opacity-100";return a.jsxs("div",{className:`absolute border-2 z-40 group/box region-box cursor-move transition-opacity duration-75 ${g}`,style:{left:`${e.minX*100}%`,bottom:`${e.minY*100}%`,right:`${(1-e.maxX)*100}%`,top:`${(1-e.maxY)*100}%`},children:[!t&&a.jsxs("div",{className:"absolute top-0 right-0 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 flex items-center gap-1.5 pointer-events-auto shadow-md select-none",style:{backdropFilter:"blur(4px)"},children:[a.jsxs("span",{className:"text-gray-400",children:[p,"×",u]}),a.jsx("div",{className:"w-px h-2.5 bg-white/10"}),a.jsx("span",{className:m?"text-green-400":"text-cyan-300",children:c}),a.jsxs("span",{className:"text-gray-500",children:["/ ",s===0?"∞":s]}),a.jsx("button",{onClick:b=>{b.stopPropagation(),x()},className:"text-gray-500 hover:text-cyan-300 transition-colors px-0.5",title:`Sample cap: ${s===0?"Infinite":s}. Click to cycle.`,children:"⟳"}),a.jsx("div",{className:"w-px h-2.5 bg-white/10"}),a.jsxs("span",{className:y?"text-green-400":"text-gray-400",title:`Convergence: ${(f*100).toFixed(3)}% (threshold: ${r.toFixed(2)}%)`,children:[(f*100).toFixed(2),"%"]}),a.jsx("span",{className:"text-gray-600",children:"/"}),a.jsxs("span",{className:"text-gray-500",children:[r.toFixed(2),"%"]}),a.jsx("div",{className:"w-px h-2.5 bg-white/10"}),a.jsx("button",{onClick:b=>{b.stopPropagation(),o()},className:"text-gray-400 hover:text-red-400 transition-colors",title:"Clear Region",children:"✕"})]}),!t&&!n&&$d.map(b=>a.jsx("div",{"data-handle":b,className:`absolute w-2.5 h-2.5 bg-cyan-500 border border-cyan-300 rounded-sm pointer-events-auto opacity-0 group-hover/box:opacity-100 transition-opacity ${Hd[b]}`},b))]})},Gd=({hudRefs:e,onSceneReady:n})=>{const t=F(),o=w.useRef(null),s=w.useRef(null),{drawing:i,interactionMode:r}=t,l=i==null?void 0:i.active,c=r==="selecting_region",{visualRegion:d,drawPreview:f,isGhostDragging:h,renderRegion:p}=od(o);nd(o);const{isMobile:u}=En(),[m,v]=w.useState({w:0,h:0});w.useLayoutEffect(()=>{if(!s.current)return;const O=new ResizeObserver(q=>{for(const _ of q){const U=Math.max(1,_.contentRect.width),G=Math.max(1,_.contentRect.height);v({w:U,h:G})}});O.observe(s.current);const H=s.current.getBoundingClientRect();return H.width>0&&H.height>0&&v({w:H.width,h:H.height}),()=>O.disconnect()},[]);const y=t.resolutionMode==="Fixed",[x,g]=t.fixedResolution,b=f||d||p,M=!!f,j=t.isBroadcastMode,C=40,S=Math.max(1,m.w-C),k=Math.max(1,m.h-C);let P=1;y&&(P=Math.min(1,S/x,k/g));const I=y?{width:x,height:g,transform:`scale(${P})`,transformOrigin:"center center",boxShadow:"0 0 50px rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.1)",flexShrink:0}:{width:"100%",height:"100%"},N=y?x*P:m.w,T=y?g*P:m.h,L=(m.h-T)/2,D=(m.w-N)/2,A=Math.max(Lo,L-Ad),R=Math.max(Lo,D),$=O=>{};return a.jsxs("div",{ref:s,className:`relative flex-1 flex items-center justify-center overflow-hidden bg-[#050505] touch-none ${c||l?"cursor-crosshair":""}`,style:{backgroundImage:y?"radial-gradient(circle at center, #111 0%, #050505 100%)":"none"},onContextMenu:O=>{O.preventDefault(),O.stopPropagation()},children:[y&&a.jsx("div",{className:"absolute inset-0 opacity-20 pointer-events-none",style:{backgroundImage:"linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)",backgroundSize:"40px 40px"}}),!j&&a.jsx(Kc,{state:t,actions:t,isMobile:t.debugMobileLayout||u,hudRefs:e}),!j&&a.jsx(vd,{}),!j&&a.jsx(sd,{}),!j&&a.jsx(ad,{}),a.jsxs("div",{ref:o,style:I,className:"relative bg-[#111] group z-0",children:[(c||l)&&a.jsx("div",{className:"absolute inset-0 z-50 cursor-crosshair bg-transparent pointer-events-none"}),b&&!j&&a.jsx(Bd,{region:b,isGhostDragging:h,isDrawing:M,onClear:()=>t.setRenderRegion(null)}),m.w>0&&m.h>0&&a.jsx(Fd,{width:y?x:m.w,height:y?g:m.h}),a.jsxs(_s,{gl:{alpha:!0,depth:!1,antialias:!1,powerPreference:"high-performance",preserveDrawingBuffer:!1},camera:{position:[0,0,0],fov:60},style:{position:"absolute",inset:0,pointerEvents:"auto"},dpr:t.dpr,onPointerDown:O=>O.target.setPointerCapture(O.pointerId),onPointerMove:$,onWheel:$,children:[a.jsx(bd,{mode:t.cameraMode,hudRefs:e,onStart:O=>t.handleInteractionStart(O),onEnd:()=>t.handleInteractionEnd(),setSceneOffset:t.setSceneOffset,fitScale:P}),a.jsx(_d,{onLoaded:n}),a.jsx(Od,{})]}),a.jsx(zd,{}),!j&&a.jsx(cd,{width:y?x:m.w,height:y?g:m.h}),!j&&t.histogramActiveCount>0&&a.jsx(wo,{onUpdate:O=>t.setHistogramData(O),autoUpdate:t.histogramAutoUpdate,trigger:t.histogramTrigger,source:"geometry"}),!j&&t.sceneHistogramActiveCount>0&&a.jsx(wo,{onUpdate:O=>t.setSceneHistogramData(O),autoUpdate:!0,trigger:t.sceneHistogramTrigger,source:"color"}),c&&!j&&a.jsx("div",{className:"absolute top-4 left-1/2 -translate-x-1/2 bg-cyan-900/80 text-cyan-100 text-[10px] font-bold px-3 py-1 rounded-full border border-cyan-500/50 shadow-lg animate-pulse pointer-events-none z-[60]",children:"Drag to select render region"})]}),y&&!j&&a.jsx(ld,{width:x,height:g,top:A,left:R,maxAvailableWidth:m.w,maxAvailableHeight:m.h,onSetResolution:t.setFixedResolution,onSetMode:t.setResolutionMode})]})},Ud=()=>{const e=F(n=>n.openContextMenu);w.useEffect(()=>{const n=t=>{if(t.defaultPrevented)return;const o=Ye(t.target);o.length>0&&(t.preventDefault(),e(t.clientX,t.clientY,[],o))};return window.addEventListener("contextmenu",n),()=>window.removeEventListener("contextmenu",n)},[e])},Wd={"general.undo":{id:"general.undo",category:"General",title:"Undo & History",content:`
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
`}},Vd={"formula.active":{id:"formula.active",category:"Formulas",title:"Active Formula",content:`
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
`}},qd={"formula.mandelbulb":{id:"formula.mandelbulb",category:"Formulas",title:"Mandelbulb",parentId:"formula.active",content:`
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
`}},Yd={"panel.formula":{id:"panel.formula",category:"Parameters",title:"Formula Parameters",content:`
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
`}},Xd={"ui.controls":{id:"ui.controls",category:"UI",title:"Control Deck",content:`
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
- **Engine** (Advanced Mode): Compile-time settings that require shader recompilation.
- **Audio** (when enabled): Audio-reactive parameters.
- **Drawing** (when enabled): Measurement and annotation tools.
- **Camera Manager**: Camera presets, saved views, and composition guides.
- **Graph** (Modular Mode): The node-based formula builder.
`},"ui.viewport":{id:"ui.viewport",category:"UI",title:"Viewport Interaction",content:`
The main view displays the fractal in real-time.

## Render Region
Click the **Crop Icon** to enter region selection mode, then drag to define an area. Only pixels inside the region accumulate new samples — the rest keep their existing image. The region overlay shows live sample count, convergence status, and pixel dimensions.

- **Move**: Drag inside the box.
- **Resize**: Hover to reveal handles on edges and corners, then drag.
- **Sample Cap**: Click ⟳ on the overlay to cycle through common caps (∞/64/128/256/...).
- **Clear**: Click ✕ on the overlay header or click the crop icon again.

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
The Engine panel controls compile-time shader features — settings that require rebuilding the GPU program before they take effect. It is available in **Advanced Mode** (toggle via System Menu or the \` key).

## How It Works
Unlike most sliders (which update instantly), changes here are **queued** and applied together when you click **Apply**. The shader then recompiles, which takes a few seconds depending on the features enabled.

- **Green dot** = currently compiled into the shader.
- **Yellow dot** = change is pending (waiting for you to click Apply).
- **Blue dot** = updates instantly (no recompile needed).

## Viewport Quality
For quick quality switching, use the **Viewport Quality** dropdown in the top bar. It provides master presets (Preview, Fastest, Lite, Balanced, Full, Ultra) and per-subsystem tier controls without needing the full Engine panel.

## Estimated Compile Time
The bottom bar shows the estimated compile time for the current configuration. Complex setups (raymarched reflections + bounce shadows + volumetrics) can take 15 seconds or more.

## Who Is This For?
This panel is for advanced users who want fine control over individual compile-time shader features beyond what the Viewport Quality dropdown offers.
`},"ui.performance":{id:"ui.performance",category:"UI",title:"Performance Monitor",content:`
The system automatically detects sustained low framerates.

- **Low FPS Warning**: Appears if the renderer struggles to maintain a usable frame rate.
- **Suggestion Buttons**: One or more actions are offered depending on the situation — **Reset Scale**, **Reduce Quality**, or **Reduce Resolution** (reduces internal resolution by ~33%) — to help restore interactivity.
- **Dismiss**: Ignores the warning for this session.
`}},Zd={"ui.timeline":{id:"ui.timeline",category:"Timeline",title:"Animation Timeline",content:`
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
`}},Qd={"panel.light":{id:"panel.light",category:"Lighting",title:"Light Studio",content:`
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
`}},Kd={"panel.render":{id:"panel.render",category:"Rendering",title:"Shading & Materials",content:`
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
- **Anti-Aliasing**: Each bucket accumulates samples until noise-free before moving to the next.
- **Export**: Can automatically save the result as a PNG when finished.

## Settings
- **Convergence Threshold** (default 0.25%): How similar consecutive frames must be before a tile is "done". Lower = more samples, higher quality. 0.1% for production, 1% for fast preview.
- **Max Samples Per Bucket** (default 64): Safety limit. Tiles stop early if converged.
- **Export Scale**: Resolution multiplier (2× = 4K from 1080p, 4× = 8K).
- **Bucket Size**: Smaller tiles use less VRAM, larger tiles render faster.

## Post-Processing
Post-processing effects (Bloom, Chromatic Aberration, Color Grading, Tone Mapping) are applied to the complete image **after** all buckets have finished rendering — so the final result looks exactly like the live viewport with effects enabled.

## Usage
1. Click the **Grid Icon** in the top bar.
2. Select **Refine View** to clear up the current viewport.
3. Select **Export Image** to render and download a file.

While rendering, the viewport is locked — camera movement, parameter changes, and window resizing are blocked to prevent corrupting the tiled render. The render panel stays visible with a progress bar and stop button.
`},"render.region":{id:"render.region",category:"Rendering",title:"Render Region",content:`
Focus accumulation on a specific area of the viewport. Pixels outside the region keep their history unchanged while the selected area accumulates new samples.

## Drawing a Region
1. Click the **Crop Icon** in the top bar (or click it again to cancel).
2. Drag on the viewport to draw the region. A dashed preview appears as you drag.
3. Release to set the region.

## Region Controls
Once set, the region overlay shows live stats:
- **Pixel dimensions** of the selected area (e.g. 820×460).
- **Sample count** — how many accumulation passes have completed.
- **Sample cap** — click the cycle button (⟳) to step through caps: ∞ / 64 / 128 / 256 / 512 / 1024 / 2048 / 4096.
- **Convergence** — live measurement of how much the image is still changing. When below the threshold, it turns green.

## Editing
- **Move**: Drag inside the region box.
- **Resize**: Hover to reveal corner and edge handles, then drag.
- **Clear**: Click ✕ on the overlay or click the crop icon in the top bar.

## Tips
- Use a region to quickly refine a specific detail without waiting for the whole viewport.
- The sample cap shown on the region is the same global setting as the pause menu — changing it in either place updates both.
- Convergence is measured only within the region bounds, not the full viewport.
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
Simulates light scattering through a participating medium. Requires **Volumetric Scattering (HG)** to be compiled — enable via the Viewport Quality dropdown (Atmosphere: Volumetric) or the Engine panel.

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
`}},Jd={"panel.gradient":{id:"panel.gradient",category:"Coloring",title:"Coloring Engine",content:`
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
`}},eu={"ui.graph":{id:"ui.graph",category:"Graph",title:"Modular Graph Editor",content:`
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
`}},tu={"panel.scene":{id:"panel.scene",category:"UI",title:"Scene Panel",content:`
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
`}},au={"post.effects":{id:"post.effects",category:"Effects",title:"Post-Processing Effects",content:`
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
`}},nu={"panel.audio":{id:"panel.audio",category:"Audio",title:"Audio Engine",content:`
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
`}},ou={...Wd,...Vd,...qd,...Yd,...Xd,...Zd,...Qd,...Kd,...Jd,...eu,...tu,...au,...nu},Ir=({x:e,y:n,items:t,targetHelpIds:o,onClose:s,onOpenHelp:i,isSubmenu:r})=>{const l=w.useRef(null),[c,d]=w.useState({x:e,y:n,opacity:0}),[f,h]=w.useState(null),p=w.useRef(null);w.useLayoutEffect(()=>{if(!l.current)return;const y=l.current.getBoundingClientRect(),x=window.innerWidth,g=window.innerHeight,b=8;let M=e,j=n;r?M+y.width>x-b&&(M=e-y.width-200,M=x-y.width-b):M+y.width>x-b&&(M=e-y.width),j+y.height>g-b&&(j=Math.max(b,g-y.height-b)),M=Math.max(b,Math.min(M,x-y.width-b)),j=Math.max(b,Math.min(j,g-y.height-b)),d({x:M,y:j,opacity:1})},[e,n,t,o,r]),w.useEffect(()=>{if(r)return;const y=g=>{g.target.closest(".fractal-context-menu")||s()},x=setTimeout(()=>window.addEventListener("mousedown",y),50);return()=>{clearTimeout(x),window.removeEventListener("mousedown",y)}},[s,r]);const u=o.map(y=>ou[y]).filter(y=>!!y),m=(y,x)=>{if(p.current&&clearTimeout(p.current),y.children){const g=x.currentTarget.getBoundingClientRect();h({items:y.children,x:g.right,y:g.top})}else h(null)},v=a.jsxs("div",{ref:l,className:"fractal-context-menu fixed z-[9999] bg-[#1a1a1a] border border-white/20 rounded shadow-[0_4px_20px_rgba(0,0,0,0.8)] py-1 min-w-[200px] animate-fade-in [&_.animate-slider-entry]:!animate-none",style:{left:c.x,top:c.y,opacity:c.opacity},onContextMenu:y=>y.preventDefault(),children:[t.map((y,x)=>{var g;return y.element?a.jsx("div",{children:y.element},x):y.isHeader?a.jsx("div",{className:"px-4 py-1 text-[9px] text-gray-500 font-bold border-b border-white/10 mt-1 mb-1 bg-white/5",children:y.label},x):y.type==="slider"?a.jsx("div",{className:"px-3 py-1 mb-1",children:a.jsx(fe,{label:y.label||"",value:y.value??0,min:y.min??0,max:y.max??1,step:y.step??.01,onChange:b=>y.onChange&&y.onChange(b),highlight:!0,overrideInputText:(g=y.value)==null?void 0:g.toFixed(2)})},x):a.jsxs("button",{onClick:()=>{!y.disabled&&!y.children&&y.action&&(y.action(),y.keepOpen||s())},onMouseEnter:b=>m(y,b),disabled:y.disabled,className:`w-full text-left px-4 py-2 text-xs flex items-center justify-between transition-colors group relative ${y.disabled?"text-gray-600 cursor-not-allowed opacity-50":y.danger?"text-red-400 hover:bg-red-900/30 hover:text-red-300":"text-gray-300 hover:bg-white/10 hover:text-white"}`,children:[a.jsxs("div",{className:"flex items-center gap-2",children:[y.icon&&a.jsx("span",{className:y.disabled?"text-gray-600":"text-gray-500",children:y.icon}),a.jsx("span",{className:y.checked?"text-cyan-400 font-bold":"",children:y.label})]}),y.checked&&a.jsx(Pt,{}),y.children&&a.jsx(Ca,{})]},x)}),t.length>0&&u.length>0&&a.jsx("div",{className:"h-px bg-cyan-500/15 my-1"}),u.length>0&&a.jsxs("div",{className:"bg-cyan-950/20 border-t border-cyan-500/10 pt-0.5 pb-0.5",children:[a.jsxs("div",{className:"px-3 py-1 text-[9px] text-cyan-600 font-semibold tracking-wider uppercase flex items-center gap-1.5 select-none",children:[a.jsx("span",{className:"text-cyan-500 opacity-70",children:a.jsx(Xo,{})})," Help"]}),u.map((y,x)=>a.jsxs("button",{onClick:()=>{i(y.id),s()},className:`w-full text-left py-1.5 text-xs transition-colors flex items-center gap-2 group ${x===0?"text-cyan-300 hover:bg-cyan-800/30 hover:text-cyan-100 font-medium":"text-cyan-600 hover:bg-cyan-900/20 hover:text-cyan-300"}`,style:{paddingLeft:`${14+x*10}px`,paddingRight:"16px"},children:[a.jsx("span",{className:`text-[10px] ${x===0?"text-cyan-500":"text-cyan-700"}`,children:"?"}),a.jsx("span",{children:y.title}),x===0&&a.jsx("span",{className:"ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-cyan-500",children:a.jsx(hs,{})})]},y.id))]}),f&&a.jsx(Ir,{x:f.x,y:f.y,items:f.items,targetHelpIds:[],onClose:s,onOpenHelp:i,isSubmenu:!0})]});return r?v:Ht.createPortal(v,document.body)},tn=300,No=60,ru=38,su=()=>{const[e,n]=w.useState(null),t=w.useRef({x:0,y:0}),o=F(),s=o.coreMath,{formula:i,setCoreMath:r}=o;if(!s)return null;const l={1:{key:"paramA",setter:d=>r({paramA:d}),val:s.paramA},2:{key:"paramB",setter:d=>r({paramB:d}),val:s.paramB},3:{key:"paramC",setter:d=>r({paramC:d}),val:s.paramC},4:{key:"paramD",setter:d=>r({paramD:d}),val:s.paramD},5:{key:"paramE",setter:d=>r({paramE:d}),val:s.paramE},6:{key:"paramF",setter:d=>r({paramF:d}),val:s.paramF}};if(w.useEffect(()=>{const d=p=>{t.current={x:p.clientX,y:p.clientY}},f=p=>{if(p.target.tagName==="INPUT"||p.target.tagName==="TEXTAREA")return;const u=p.key,m=l[u];if(m&&!e){const v=Re.get(i),y=parseInt(u)-1;let x=v==null?void 0:v.parameters[y];if(i==="Modular"&&(x={label:`Param ${String.fromCharCode(65+y)}`,id:m.key,min:-5,max:5,step:.01,default:0}),x){const g=x.max-x.min,b=(m.val-x.min)/g,M=tn-24,j=12+b*M;let C=t.current.x-j,S=t.current.y-ru;C=Math.max(10,Math.min(window.innerWidth-tn-10,C)),S=Math.max(10,Math.min(window.innerHeight-No-10,S)),n({id:parseInt(u),paramKey:m.key,label:x.label,def:{min:x.min,max:x.max,step:x.step},x:C,y:S})}}},h=p=>{e&&p.key===String(e.id)&&n(null)};return window.addEventListener("mousemove",d),window.addEventListener("keydown",f),window.addEventListener("keyup",h),()=>{window.removeEventListener("mousemove",d),window.removeEventListener("keydown",f),window.removeEventListener("keyup",h)}},[e,i,s]),!e)return null;const c=l[String(e.id)];return a.jsxs("div",{className:"fixed z-[9999] bg-black/80 backdrop-blur-xl border border-cyan-500/50 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col justify-center px-3 animate-pop-in",style:{left:e.x,top:e.y,width:tn,height:No},children:[a.jsxs("div",{className:"absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-cyan-900 rounded text-[9px] font-bold text-cyan-200 border border-cyan-700 shadow-sm",children:["Quick Edit (",e.id,")"]}),a.jsx(fe,{label:e.label,value:c.val,min:e.def.min,max:e.def.max,step:e.def.step,onChange:c.setter,highlight:!0,trackId:e.paramKey})]})},iu=()=>{const e=w.useRef(!1);return w.useEffect(()=>{e.current||(e.current=!0,ge().setWorkerModePending(),dc())},[]),null},ba=ge(),lu=e=>{const n=F(),[t,o]=w.useState("default"),s=w.useRef(!1),i=w.useRef(!1),r=w.useCallback(l=>{if(!(!l&&(ba.isBooted||s.current))){s.current=!0;try{setTimeout(()=>{var m;const c=F.getState(),d=Oa(c),f=c.cameraRot||{x:0,y:0,z:0,w:1},h=((m=c.optics)==null?void 0:m.camFov)??60,p={position:[0,0,0],quaternion:[f.x,f.y,f.z,f.w],fov:h};ba.bootWithConfig(d,p);const u=c.sceneOffset;if(u){const v={x:u.x,y:u.y,z:u.z,xL:u.xL??0,yL:u.yL??0,zL:u.zL??0};ba.setShadowOffset(v),ba.post({type:"OFFSET_SET",offset:v})}},50)}catch(c){console.error("Critical Engine Boot Failure:",c),s.current=!1}}},[]);return w.useEffect(()=>{if(i.current)return;i.current=!0;const l=window.location.hash;let c=null;if(l&&l.startsWith("#s=")){const f=l.slice(3);c=sc(f),c&&o("url")}if(!c){const f=Re.get("Mandelbulb");f&&f.defaultPreset&&(c=JSON.parse(JSON.stringify(f.defaultPreset)))}const d=Cr();n.setHardwareProfile(d),d.isMobile&&n.applyScalabilityPreset("lite"),c&&n.loadScene({preset:c})},[]),{startupMode:t,bootEngine:r}},Pr=({activeTab:e,state:n,actions:t,onSwitchTab:o})=>{if(e==="Graph"){const r=ve.get("panel-graph");if(r)return a.jsx("div",{className:"h-[600px] -m-4",children:a.jsx(r,{state:n,actions:t})})}if(e==="Camera Manager"){const r=ve.get("panel-cameramanager");if(r)return a.jsx(r,{state:n,actions:t})}if(e==="Engine"){const r=ve.get("panel-engine");if(r)return a.jsx(r,{state:n,actions:t})}const i=oe.getTabs().find(r=>r.label===e);if(i){const r=ve.get(i.componentId);if(r){const l=i.id,c=n[l];return a.jsx(r,{state:n,actions:t,onSwitchTab:o,featureId:l,sliceState:c})}}return a.jsx("div",{className:"flex h-full items-center justify-center text-gray-600 text-xs italic",children:"Select a module"})},cu=()=>typeof window>"u"?!1:window.matchMedia("(pointer: coarse)").matches||window.innerWidth<768,Do=({side:e})=>{const{panels:n,activeLeftTab:t,activeRightTab:o,togglePanel:s,movePanel:i,reorderPanel:r,startPanelDrag:l,endPanelDrag:c,draggingPanelId:d,setDockSize:f,isLeftDockCollapsed:h,isRightDockCollapsed:p,setDockCollapsed:u,openContextMenu:m,leftDockSize:v,rightDockSize:y,formula:x,advancedMode:g}=F(),b=cu(),M=F.getState().audio,j=F.getState().drawing,C=e==="left"?t:o,S=e==="left"?h:p,k=e==="left"?v:y,P=Object.values(n).filter(A=>{let R=A.location;return b&&(A.id==="Engine"||A.id==="Camera Manager")&&(R="right"),!(R!==e||A.id==="Graph"&&x!=="Modular"||A.id==="Light"&&!g||A.id==="Audio"&&!(M!=null&&M.isEnabled)||A.id==="Drawing"&&!(j!=null&&j.enabled))}).sort((A,R)=>A.order-R.order),I=w.useRef(null),N=A=>{A.preventDefault(),I.current={startX:A.clientX,startW:k},window.addEventListener("mousemove",T),window.addEventListener("mouseup",L),document.body.style.cursor="ew-resize"},T=A=>{if(!I.current)return;const R=A.clientX-I.current.startX,$=e==="left"?R:-R,O=Math.max(200,Math.min(800,I.current.startW+$));f(e,O)},L=()=>{I.current=null,window.removeEventListener("mousemove",T),window.removeEventListener("mouseup",L),document.body.style.cursor=""},D=(A,R)=>{A.preventDefault();const $=Ye(A.currentTarget);m(A.clientX,A.clientY,[],$)};return P.length===0?null:S?a.jsxs("div",{className:`flex flex-col w-8 bg-black border-${e==="left"?"r":"l"} border-white/10 z-40 shrink-0`,children:[a.jsx("button",{onClick:()=>u(e,!1),className:"h-10 flex items-center justify-center text-gray-500 hover:text-white",children:e==="left"?a.jsx(Ca,{}):a.jsx(On,{})}),a.jsx("div",{className:"flex-1 flex flex-col items-center py-2 gap-2",children:P.map(A=>a.jsx("div",{onClick:()=>s(A.id,!0),className:`w-6 h-6 flex items-center justify-center rounded cursor-pointer ${A.id===C?fs:ps}`,title:A.id,children:a.jsx("span",{className:"text-[10px] font-bold",children:A.id.charAt(0)})},A.id))})]}):a.jsxs("div",{className:`flex flex-col ${zt.dock} border-${e==="left"?"r":"l"} ${at.standard} z-40 shrink-0 transition-all duration-75 relative`,style:{width:k},children:[a.jsx("div",{className:`flex flex-wrap gap-0.5 px-0.5 pt-1 ${zt.tabBar} border-b ${at.standard} shrink-0 relative items-end`,children:P.map(A=>{const R=A.id===C;return a.jsxs("button",{onClick:()=>s(A.id,!0),onContextMenu:$=>D($,A.id),onMouseEnter:()=>{if(d&&d!==A.id){const $=n[d];$&&$.location===e&&r(d,A.id)}},onMouseUp:$=>{d&&($.stopPropagation(),c())},className:`flex items-center gap-0.5 px-1 py-1 text-[9px] font-bold transition-colors group relative rounded-t-sm
                                ${R?ms:gs}`,children:[!b&&a.jsx("div",{className:`cursor-move ${R?`${xs} group-hover:text-cyan-600`:`${bs} group-hover:text-white`} transition-colors`,onMouseDown:$=>{$.stopPropagation(),l(A.id)},children:a.jsx("div",{className:"transform scale-75 origin-center",children:a.jsx(Rn,{})})}),a.jsx("span",{className:"truncate max-w-[140px]",children:A.id})]},A.id)})}),a.jsx("button",{onClick:()=>u(e,!0),className:"absolute top-1 right-1 p-1 text-gray-600 hover:text-white z-20",children:e==="left"?a.jsx(On,{}):a.jsx(Ca,{})}),a.jsx("div",{className:"flex-1 overflow-y-auto custom-scroll p-4 relative",children:C?a.jsx(Pr,{activeTab:C,state:F.getState(),actions:F.getState(),onSwitchTab:s}):a.jsx("div",{className:"flex h-full items-center justify-center text-gray-700 text-xs italic",children:"Select a panel"})}),a.jsx("div",{className:`absolute top-0 bottom-0 w-1 cursor-ew-resize ${ka.hoverBg} transition-colors z-50 ${e==="left"?"right-[-2px]":"left-[-2px]"}`,onMouseDown:N})]})},du=()=>{const{draggingPanelId:e,movePanel:n,endPanelDrag:t,cancelPanelDrag:o,panels:s,leftDockSize:i,rightDockSize:r,isLeftDockCollapsed:l,isRightDockCollapsed:c}=F();if(w.useEffect(()=>{if(!e)return;const m=()=>{o()};return window.addEventListener("mouseup",m),()=>window.removeEventListener("mouseup",m)},[e,o]),!e)return null;const d=s[e],f=d?d.location:null,h=(m,v)=>{m.stopPropagation(),n(e,v),t()},p=l?32:i,u=c?32:r;return a.jsxs("div",{className:"fixed inset-0 z-[1000] flex pointer-events-none",children:[a.jsx("div",{style:{width:p},className:`h-full flex items-center justify-center transition-all duration-200 border-r-2
                    ${f!=="left"?"bg-cyan-900/40 border-cyan-500/50 pointer-events-auto cursor-copy":"border-transparent pointer-events-none"}`,onMouseUp:m=>{f!=="left"&&h(m,"left")},children:f!=="left"&&a.jsx("div",{className:"bg-black/80 px-4 py-2 rounded border border-cyan-500/50 text-cyan-200 font-bold text-sm shadow-xl backdrop-blur-md",children:"Dock Left"})}),a.jsx("div",{className:`flex-1 h-full flex items-center justify-center transition-all duration-200
                    ${f!=="float"?"bg-purple-900/20 hover:bg-purple-900/30 border-x-2 border-purple-500/30 pointer-events-auto cursor-copy":"pointer-events-none"}`,onMouseUp:m=>{f!=="float"&&h(m,"float")},children:f!=="float"&&a.jsx("div",{className:"bg-black/80 px-4 py-2 rounded border border-purple-500/50 text-purple-200 font-bold text-sm shadow-xl backdrop-blur-md",children:"Float Window"})}),a.jsx("div",{style:{width:u},className:`h-full flex items-center justify-center transition-all duration-200 border-l-2
                    ${f!=="right"?"bg-cyan-900/40 border-cyan-500/50 pointer-events-auto cursor-copy":"border-transparent pointer-events-none"}`,onMouseUp:m=>{f!=="right"&&h(m,"right")},children:f!=="right"&&a.jsx("div",{className:"bg-black/80 px-4 py-2 rounded border border-cyan-500/50 text-cyan-200 font-bold text-sm shadow-xl backdrop-blur-md",children:"Dock Right"})})]})},uu=({id:e,title:n,children:t,position:o,onPositionChange:s,size:i,onSizeChange:r,onClose:l,disableClose:c,zIndex:d,initialPos:f,initialSize:h})=>{const{panels:p,setFloatPosition:u,setFloatSize:m,togglePanel:v,startPanelDrag:y}=F(),x=!!e,g=e?p[e]:null,[b,M]=w.useState(f||{x:100,y:100}),[j,C]=w.useState(h||{width:300,height:200}),S=x?(g==null?void 0:g.floatPos)||{x:100,y:100}:o||b,k=x?(g==null?void 0:g.floatSize)||{width:320,height:400}:i||j,P=w.useRef(S),I=w.useRef(k),N=w.useRef(null),T=w.useRef(null);if(w.useEffect(()=>{P.current=S},[S.x,S.y]),w.useEffect(()=>{I.current=k},[k.width,k.height]),x&&(!g||!g.isOpen||g.location!=="float"))return null;const L=n||(g?g.id:"Window"),D=d||(x?100:200),A=()=>{if(l)l();else if(x&&e){const H=F.getState();e==="Audio"?H.setAudio({isEnabled:!1}):e==="Drawing"?H.setDrawing({enabled:!1}):e==="Engine"&&H.setEngineSettings({showEngineTab:!1}),v(e,!1)}},R=O=>{if(O.target.closest("button"))return;O.preventDefault(),N.current={x:O.clientX,y:O.clientY,startX:P.current.x,startY:P.current.y};const H=_=>{if(!N.current)return;const U=_.clientX-N.current.x,G=_.clientY-N.current.y,E={x:N.current.startX+U,y:N.current.startY+G};s?s(E):x&&e?u(e,E.x,E.y):M(E),P.current=E},q=()=>{N.current=null,window.removeEventListener("mousemove",H),window.removeEventListener("mouseup",q)};window.addEventListener("mousemove",H),window.addEventListener("mouseup",q)},$=O=>{O.preventDefault(),O.stopPropagation(),T.current={x:O.clientX,y:O.clientY,startW:I.current.width,startH:I.current.height};const H=_=>{if(!T.current)return;const U=_.clientX-T.current.x,G=_.clientY-T.current.y,E={width:Math.max(200,T.current.startW+U),height:Math.max(150,T.current.startH+G)};r?r(E):x&&e?m(e,E.width,E.height):C(E),I.current=E},q=()=>{T.current=null,window.removeEventListener("mousemove",H),window.removeEventListener("mouseup",q)};window.addEventListener("mousemove",H),window.addEventListener("mouseup",q)};return Ht.createPortal(a.jsxs("div",{className:"fixed glass-panel flex flex-col overflow-hidden animate-pop-in shadow-[0_10px_40px_rgba(0,0,0,0.5)]",style:{left:S.x,top:S.y,width:k.width,height:k.height,maxHeight:"90vh",zIndex:D},children:[a.jsxs("div",{onMouseDown:R,className:"panel-header cursor-move flex items-center justify-between px-2 py-1.5 bg-gray-800/90 border-b border-white/10",children:[a.jsxs("div",{className:"flex items-center gap-2",children:[x&&a.jsx("div",{className:"cursor-grab text-gray-500 hover:text-white",onMouseDown:O=>{O.stopPropagation(),e&&y(e)},children:a.jsx(Rn,{})}),a.jsx("span",{className:"t-label text-gray-200",children:L})]}),!c&&(l||x&&!(g!=null&&g.isCore))&&a.jsx("button",{onClick:A,className:"icon-btn",title:"Close",children:a.jsx(jn,{})})]}),a.jsx("div",{className:"p-3 overflow-y-auto overflow-x-hidden custom-scroll flex-1 relative bg-black/80 backdrop-blur-md",children:t}),a.jsx("div",{onMouseDown:$,className:"absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-20 touch-none text-gray-500",children:a.jsx(ys,{})})]}),document.body)},hu=Ue.lazy(()=>Et(()=>import("./Timeline-DCoFDic2.js"),__vite__mapDeps([6,1,2,4,7,3,5]),import.meta.url)),fu=Ue.lazy(()=>Et(()=>import("./HelpBrowser-XhXFSR5_.js"),__vite__mapDeps([8,1,2,4,3,5]),import.meta.url)),pu=Ue.lazy(()=>Et(()=>import("./FormulaWorkshop-DzEebMxE.js"),__vite__mapDeps([9,1,2,4,3,5]),import.meta.url).then(e=>({default:e.FormulaWorkshop}))),mu=()=>{const e=F(),[n,t]=w.useState(!1),[o,s]=w.useState(!0),[i,r]=w.useState(!1),l=w.useRef(null),c=w.useRef(null),d=w.useRef(null),f=w.useRef(null),h=w.useRef(null),p=w.useRef(null),u=w.useMemo(()=>({container:c,speed:d,dist:f,reset:h,reticle:p}),[]),{startupMode:m,bootEngine:v}=lu(),{isMobile:y,isPortrait:x}=En();Zc(i,r),Ud();const g=y||e.debugMobileLayout,b=e.quality,M=(b==null?void 0:b.precisionMode)===1,j=g&&e.cameraMode==="Fly",C=e.isBroadcastMode,S=e.interactionMode!=="none",k=L=>{L.preventDefault(),L.stopPropagation(),e.openContextMenu(L.clientX,L.clientY,[],["ui.timeline"])},P=()=>{const L=M?"balanced":"lite";Y.emit("is_compiling",`Switching to ${L} mode...`);const D=e.applyPreset;D&&D({mode:L,actions:e})},I=()=>{s(!1)},N=g&&!C?"min-h-[120vh] bg-black":"fixed inset-0 w-full h-full bg-black select-none overflow-hidden flex flex-col",T=Object.values(e.panels).filter(L=>L.location==="float"&&L.isOpen);return a.jsxs("div",{className:N,children:[a.jsx(iu,{}),a.jsx(du,{}),T.map(L=>a.jsx(uu,{id:L.id,title:L.id,children:a.jsx(Pr,{activeTab:L.id,state:e,actions:e,onSwitchTab:D=>e.togglePanel(D,!0)})},L.id)),g&&!C&&a.jsxs("div",{className:"w-full bg-[#080808] border-b border-white/10 p-8 pb-12 flex flex-col items-center text-center gap-3",children:[a.jsx("div",{className:"w-12 h-1 bg-gray-800 rounded-full mb-2"}),M?a.jsxs(a.Fragment,{children:[a.jsxs("div",{className:"flex items-center gap-2 text-amber-500 mb-1",children:[a.jsx(Yt,{}),a.jsx("span",{className:"text-xs font-bold",children:"Lite Render Mode"})]}),a.jsxs("p",{className:"text-[10px] text-gray-400 leading-relaxed max-w-[320px]",children:["Running lightweight engine.",a.jsx("br",{})]})]}):a.jsx(a.Fragment,{children:a.jsx("div",{className:"flex items-center gap-2 text-cyan-500 mb-1",children:a.jsx("span",{className:"text-xs font-bold",children:"High Quality Mode"})})}),a.jsx("button",{onClick:P,className:"mt-2 px-3 py-1.5 text-[9px] font-bold rounded border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10",children:M?"Switch to High Quality":"Switch to Lite Mode"})]}),a.jsxs("div",{ref:l,className:`relative bg-black select-none ${S?"cursor-crosshair":""} flex flex-col ${g&&!C?"h-[100vh] sticky top-0 overflow-hidden shadow-2xl":"w-full h-full"}`,onContextMenu:L=>L.preventDefault(),children:[a.jsx(Xc,{isReady:n,onFinished:I,startupMode:m,bootEngine:v}),g&&x&&!o&&!C&&a.jsxs("div",{className:"fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-10 text-center text-white",children:[a.jsx("div",{className:"text-cyan-400 mb-6 animate-bounce",children:a.jsx(vs,{})}),a.jsx("h2",{className:"text-2xl font-bold tracking-tight mb-2",children:"Landscape Recommended"}),a.jsx("p",{className:"text-gray-500 text-sm font-mono",children:"Rotate device to access controls."})]}),!C&&a.jsx(Wc,{}),a.jsxs("div",{className:"flex-1 flex overflow-hidden relative",children:[e.workshopOpen?a.jsx(w.Suspense,{fallback:null,children:a.jsx(pu,{onClose:e.closeWorkshop,editFormula:e.workshopEditFormula})}):!C&&!g&&a.jsx(Do,{side:"left"}),a.jsx(Gd,{hudRefs:u,onSceneReady:()=>t(!0)}),!C&&a.jsx(Do,{side:"right"})]}),!C&&a.jsx(Vc,{}),!C&&a.jsx(su,{}),e.contextMenu.visible&&!C&&a.jsx(Ir,{x:e.contextMenu.x,y:e.contextMenu.y,items:e.contextMenu.items,targetHelpIds:e.contextMenu.targetHelpIds,onClose:e.closeContextMenu,onOpenHelp:e.openHelp}),e.helpWindow.visible&&a.jsx(w.Suspense,{fallback:null,children:a.jsx(fu,{activeTopicId:e.helpWindow.activeTopicId,onClose:e.closeHelp,onNavigate:e.openHelp})}),!i&&!j&&!C&&a.jsx("div",{className:"fixed bottom-4 left-4 z-50 flex gap-2 transition-all duration-500",children:a.jsx("button",{onClick:()=>r(!0),onContextMenu:k,className:"p-2 rounded-full border shadow-lg transition-all bg-gray-800 border-gray-600 text-gray-400 hover:text-white",title:"Open Timeline (T)",children:a.jsx(ws,{})})}),i&&!C&&a.jsx(w.Suspense,{fallback:null,children:a.jsx(hu,{onClose:()=>r(!1)})})]})]})},Na=({label:e,active:n,variant:t="primary",size:o="default",icon:s,fullWidth:i,className:r,children:l,onClick:c,...d})=>{const f=F(m=>m.openContextMenu),h=m=>{const v=Ye(m.currentTarget);v.length>0&&(m.preventDefault(),m.stopPropagation(),f(m.clientX,m.clientY,[],v))};let p="bg-cyan-900 text-cyan-200 border-cyan-700 shadow-inner";t==="danger"&&(p="bg-red-900 text-red-200 border-red-700 shadow-inner"),t==="success"&&(p="bg-green-900 text-green-200 border-green-700 shadow-inner"),t==="warning"&&(p="bg-amber-900 text-amber-200 border-amber-700 shadow-inner");const u=o==="small"?"t-btn-sm":"t-btn";return a.jsxs("button",{className:`${u} ${n?p:"t-btn-default"} ${i?"w-full":"flex-1"} ${r||""}`,onClick:c,onContextMenu:h,...d,children:[s,e||l]})},gu=({label:e,icon:n,rightContent:t,className:o=""})=>a.jsxs("div",{className:`flex items-center justify-between px-3 py-2 bg-black/40 border-b border-white/5 ${o}`,children:[a.jsxs("div",{className:"flex items-center gap-2",children:[n,a.jsx("span",{className:"text-[10px] font-bold text-gray-300",children:e})]}),t&&a.jsx("div",{className:"flex items-center gap-2",children:t})]}),an=ge(),xu=({className:e="-m-3"})=>{const{drawing:n,setDrawing:t,removeDrawnShape:o,clearDrawnShapes:s,updateDrawnShape:i}=F(),{active:r,activeTool:l,originMode:c,color:d,showLabels:f,showAxes:h,shapes:p,refreshTrigger:u}=n,[m,v]=w.useState(an.lastMeasuredDistance);w.useEffect(()=>{let g;return r&&c===1&&(g=window.setInterval(()=>{const b=an.lastMeasuredDistance;Math.abs(b-m)>1e-4&&v(b)},200)),()=>clearInterval(g)},[r,c,m]);const y=()=>{t({active:!r})},x=()=>{t({refreshTrigger:(u||0)+1}),v(an.lastMeasuredDistance)};return a.jsxs("div",{className:`flex flex-col h-full select-none ${e}`,"data-help-id":"panel.drawing",children:[a.jsxs("div",{className:"p-3 bg-black/40 border-b border-white/5",children:[a.jsx(gu,{label:"Measurement Tools",icon:a.jsx("span",{className:"w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_5px_cyan]"})}),a.jsx("div",{className:"flex gap-2 mb-2",children:a.jsx(Na,{onClick:y,active:r,variant:r?"success":"primary",className:"flex-1 py-3 text-xs shadow-lg",icon:r?a.jsx(Pt,{}):a.jsx(Vo,{}),children:r?"DRAWING ACTIVE":"START DRAWING"})}),a.jsxs("div",{className:"flex bg-gray-800/50 rounded p-1 mb-3",children:[a.jsxs("button",{onClick:()=>t({activeTool:"rect"}),className:`flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-[9px] font-bold transition-colors ${l==="rect"?"bg-cyan-900 text-cyan-200 shadow-sm":"text-gray-500 hover:text-white"}`,title:"Rectangle",children:[a.jsx(Ss,{})," RECT"]}),a.jsxs("button",{onClick:()=>t({activeTool:"circle"}),className:`flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-[9px] font-bold transition-colors ${l==="circle"?"bg-cyan-900 text-cyan-200 shadow-sm":"text-gray-500 hover:text-white"}`,title:"Circle / Ellipse",children:[a.jsx(Ms,{})," CIRCLE"]})]}),a.jsxs("div",{className:"flex items-center justify-between mb-1",children:[a.jsx(ze,{variant:"secondary",children:"Default Color"}),a.jsx(Ta,{color:"#"+d.getHexString(),onChange:g=>t({color:new Ve(g)}),label:""})]}),r&&a.jsxs("div",{className:"mt-2 px-2 py-1.5 bg-cyan-900/20 border border-cyan-500/20 rounded flex flex-col items-center gap-1 text-[9px] text-cyan-200 animate-fade-in text-center font-mono",children:[a.jsxs("div",{children:["Hold ",a.jsx("strong",{children:"X"})," to snap to World Axis"]}),a.jsxs("div",{children:["Hold ",a.jsx("strong",{children:"SHIFT"})," for 1:1 Ratio"]}),a.jsxs("div",{children:["Hold ",a.jsx("strong",{children:"ALT"})," for Center Draw"]}),a.jsxs("div",{children:["Hold ",a.jsx("strong",{children:"SPACE"})," to Move"]})]})]}),a.jsxs("div",{className:"p-3 border-b border-white/5 space-y-3 bg-white/[0.02]",children:[a.jsxs("div",{className:"space-y-1",children:[a.jsx(ze,{variant:"secondary",children:"Drawing Plane Origin"}),a.jsx(Ke,{value:c,onChange:g=>t({originMode:g}),options:[{label:"Global Zero",value:0},{label:"Surface Probe",value:1}]}),c===1&&a.jsxs("div",{className:"flex items-center justify-between bg-black/40 rounded border border-white/10 p-1.5 mt-1 animate-fade-in",children:[a.jsxs("span",{className:"text-[9px] text-gray-400 font-mono pl-1",children:["Depth: ",a.jsx("span",{className:"text-cyan-400 font-bold",children:m.toFixed(4)})]}),a.jsx("button",{onClick:x,className:"px-2 py-0.5 bg-gray-800 hover:bg-white/10 text-gray-300 text-[9px] font-bold rounded border border-white/5 hover:border-white/20 transition-all",title:"Update axis position to current probe location",children:"Refresh Axis"})]})]}),a.jsxs("div",{className:"grid grid-cols-2 gap-2 pt-1",children:[a.jsxs("label",{className:"flex items-center gap-2 cursor-pointer group",children:[a.jsx("div",{className:`w-3 h-3 border rounded transition-colors ${f?"bg-cyan-500 border-cyan-500":"border-gray-600 bg-transparent"}`}),a.jsx("input",{type:"checkbox",className:"hidden",checked:f,onChange:g=>t({showLabels:g.target.checked})}),a.jsx("span",{className:"text-[10px] font-bold text-gray-400 group-hover:text-white transition-colors",children:"Show Labels"})]}),a.jsxs("label",{className:"flex items-center gap-2 cursor-pointer group",children:[a.jsx("div",{className:`w-3 h-3 border rounded transition-colors ${h?"bg-cyan-500 border-cyan-500":"border-gray-600 bg-transparent"}`}),a.jsx("input",{type:"checkbox",className:"hidden",checked:h,onChange:g=>t({showAxes:g.target.checked})}),a.jsx("span",{className:"text-[10px] font-bold text-gray-400 group-hover:text-white transition-colors",children:"Show Axes"})]})]})]}),a.jsx("div",{className:"flex-1 overflow-y-auto custom-scroll p-3 bg-black/20",children:a.jsx(At,{label:"Measurement List",count:(p||[]).length,defaultOpen:!0,rightContent:(p||[]).length>0?a.jsx("button",{onClick:()=>s(),className:"text-[9px] text-red-500 hover:text-red-300 font-bold transition-colors px-2 py-0.5",children:"Clear"}):void 0,children:(p||[]).length===0?a.jsx("div",{className:"text-center py-4 text-[10px] text-gray-600 italic",children:"No measurements drawn."}):a.jsx("div",{className:"space-y-1 animate-fade-in",children:(p||[]).map((g,b)=>{var j;const M=g.type==="rect"&&(g.size.z||0)>.001;return a.jsxs("div",{className:"flex flex-col bg-white/5 rounded border border-white/5 hover:border-cyan-500/30 transition-colors group",children:[a.jsxs("div",{className:"flex items-center justify-between p-2",children:[a.jsxs("div",{className:"flex items-center gap-3",children:[a.jsx("div",{className:"transform scale-75 origin-left",children:a.jsx(Ta,{color:g.color,onChange:C=>i({id:g.id,updates:{color:C}}),label:""})}),a.jsxs("div",{className:"flex flex-col",children:[a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsxs("span",{className:"text-[10px] text-gray-300 font-mono font-bold",children:["#",b+1]}),a.jsx("span",{className:"text-[8px] text-gray-500 font-bold bg-black/40 px-1 rounded",children:M?"CUBE":g.type})]}),a.jsxs("span",{className:"text-[9px] text-gray-500 font-mono",children:[g.size.x.toFixed(4)," x ",g.size.y.toFixed(4)," ",M?`x ${(j=g.size.z)==null?void 0:j.toFixed(4)}`:""]})]})]}),a.jsxs("div",{className:"flex items-center gap-1",children:[g.type==="rect"&&a.jsx("button",{onClick:()=>{const S=(g.size.z||0)>0?0:Math.min(g.size.x,g.size.y);i({id:g.id,updates:{size:{...g.size,z:S}}})},className:`p-1.5 rounded transition-colors ${M?"text-cyan-300 bg-cyan-900/40":"text-gray-600 hover:text-cyan-400 hover:bg-white/5"}`,title:M?"Convert to Rect":"Extrude to Cube",children:a.jsx(Fa,{})}),a.jsx("button",{onClick:()=>o(g.id),className:"text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1",title:"Delete",children:a.jsx($t,{})})]})]}),M&&a.jsxs("div",{className:"px-2 pb-2 pt-0 space-y-1 animate-slider-entry bg-black/20 mt-1 rounded border border-white/5 mx-1",children:[a.jsx(fe,{label:"Depth",value:g.size.z||0,onChange:C=>i({id:g.id,updates:{size:{...g.size,z:Math.max(.001,C)}}}),step:.01,min:.001,max:5,highlight:!0}),a.jsx(fe,{label:"Offset",value:g.zOffset||0,onChange:C=>i({id:g.id,updates:{zOffset:C}}),step:.01,min:-2,max:2})]})]},g.id)})})})})]})},bu=({x:e,y:n,categories:t,getItems:o,onSelect:s,onClose:i,categoryWidth:r=128,itemWidth:l=192,anchorRight:c})=>{const[d,f]=w.useState(null),h=w.useRef(null),[p,u]=w.useState({x:e,y:n,maxHeight:300,opacity:0,flip:!1});w.useLayoutEffect(()=>{const v=window.innerWidth,y=window.innerHeight,x=8,g=r+l+2,b=350,M=e+g>v-x;let j;M?j=Math.max(x,(c??e)-g):j=e,j+g>v-x&&(j=Math.max(x,v-g-x));const C=y-n-x,S=n-x;let k,P;C>=Math.min(b,200)?(k=n,P=Math.min(b,Math.max(150,C))):S>C?(P=Math.min(b,S),k=n-P):(k=n,P=Math.min(b,Math.max(150,C))),k<x&&(k=x,P=Math.min(P,y-x*2)),u({x:j,y:k,maxHeight:P,opacity:1,flip:M})},[e,n,r,l,c]),w.useEffect(()=>{const v=y=>{h.current&&!h.current.contains(y.target)&&i()};return window.addEventListener("mousedown",v,!0),()=>window.removeEventListener("mousedown",v,!0)},[i]);const m=d?o(d):[];return Ht.createPortal(a.jsxs("div",{ref:h,className:"fixed z-[9999] flex text-xs font-mono",style:{left:p.x,top:p.y,opacity:p.opacity,transition:"opacity 0.05s ease-out",flexDirection:p.flip?"row-reverse":"row"},children:[a.jsx("div",{className:`bg-[#1a1a1a] border border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col py-1 overflow-y-auto custom-scroll whitespace-nowrap ${p.flip?"rounded-r -ml-px":"rounded-l"}`,style:{minWidth:r,maxHeight:p.maxHeight},children:t.map(v=>a.jsxs("div",{onMouseEnter:()=>f(v.id),className:`px-3 py-1.5 cursor-pointer flex justify-between items-center transition-colors ${d===v.id?"bg-cyan-900/60 text-white":"text-gray-400 hover:text-white hover:bg-white/5"}`,children:[a.jsx("span",{className:`truncate ${v.highlight?"font-bold text-cyan-300":""}`,children:v.name}),p.flip?a.jsx("span",{className:"text-gray-600",children:"‹"}):a.jsx(Ca,{})]},v.id))}),d&&a.jsxs("div",{className:`bg-[#222] border-y border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-y-auto custom-scroll py-1 ${p.flip?"border-l rounded-l animate-fade-in-right":"border-r rounded-r -ml-px animate-fade-in-left"}`,style:{width:l,maxHeight:p.maxHeight},children:[m.length===0&&a.jsx("div",{className:"px-3 py-2 text-gray-500 text-xs italic",children:"No items"}),m.map(v=>a.jsxs("button",{onClick:v.disabled?void 0:()=>{s(v.key),i()},className:`w-full px-3 py-1.5 text-left transition-colors truncate ${v.disabled?"text-gray-600 cursor-not-allowed":v.selected?"text-cyan-400 hover:bg-cyan-600 hover:text-white":"text-gray-300 hover:bg-cyan-600 hover:text-white"}`,title:v.description||v.label,children:[v.label,v.disabled&&v.disabledSuffix?` ${v.disabledSuffix}`:""]},v.key))]})]}),document.body)},yu=new Set(["audio","navigation","drawing","webcam","debugTools","engineSettings","quality","reflections"]),_o=["coreMath","geometry","materials","coloring","atmosphere","lighting","optics"],vu=new Set(["repeats","phase","scale","offset","bias","repeats2","phase2","scale2","offset2","bias2","levelsMin","levelsMax","levelsGamma","saturation","juliaX","juliaY","juliaZ","preRotX","preRotY","preRotZ","hybridFoldLimit"]),wu=e=>{if(e==="lighting"){const n=[];for(let t=0;t<Ce;t++)n.push({label:`Light ${t+1} Intensity`,key:`light${t}_intensity`}),n.push({label:`Light ${t+1} Pos X`,key:`light${t}_posX`}),n.push({label:`Light ${t+1} Pos Y`,key:`light${t}_posY`}),n.push({label:`Light ${t+1} Pos Z`,key:`light${t}_posZ`});return n}return[]};function Su(){return[...oe.getAll().filter(n=>!yu.has(n.id)&&(Object.values(n.params).some(t=>t.type==="float"||t.type==="int")||n.id==="lighting")).sort((n,t)=>{const o=_o.indexOf(n.id),s=_o.indexOf(t.id);return o!==-1&&s!==-1?o-s:o!==-1?-1:s!==-1?1:n.name.localeCompare(t.name)}).map(n=>({id:n.id,name:n.name,highlight:n.id==="coreMath"})),{id:"camera",name:"Camera"}]}function Mu(e,n){var l;if(e==="camera")return[{key:"camera.unified.x",label:"Camera Pos X"},{key:"camera.unified.y",label:"Camera Pos Y"},{key:"camera.unified.z",label:"Camera Pos Z"},{key:"camera.rotation.x",label:"Rotation X"},{key:"camera.rotation.y",label:"Rotation Y"},{key:"camera.rotation.z",label:"Rotation Z"}];const t=oe.get(e);if(!t)return[];const o=wu(e),s=[],i=e==="coreMath"&&n?Re.get(n):null,r=((l=i==null?void 0:i.parameters)==null?void 0:l.map(c=>c==null?void 0:c.id).filter(c=>!!c))||[];return Object.entries(t.params).forEach(([c,d])=>{if(d.onUpdate!=="compile"&&!(d.hidden&&!vu.has(c))&&!(e==="coreMath"&&r.length>0&&!r.includes(c))){if(d.type==="vec2"||d.type==="vec3"){(d.type==="vec2"?["x","y"]:["x","y","z"]).forEach(h=>{let p=`${d.label} ${h.toUpperCase()}`;if(e==="coreMath"&&i){const u=i.parameters.find(m=>(m==null?void 0:m.id)===c);u&&(p=`${c.replace("vec","V-")}: ${u.label} ${h.toUpperCase()}`)}s.push({key:`${e}.${c}_${h}`,label:p,description:`${d.description||d.label} - ${h.toUpperCase()} component`})});return}if(d.type==="float"||d.type==="int"){let f=d.label;if(e==="coreMath"&&i){const h=i.parameters.find(p=>(p==null?void 0:p.id)===c);h?f=`${c.replace("param","P-")}: ${h.label}`:c.startsWith("param")&&(f=`(${d.label})`)}s.push({key:`${e}.${c}`,label:f,description:d.description})}}}),[...o.map(c=>({key:`${e}.${c.key}`,label:c.label})),...s]}const Tr=({value:e,onChange:n,className:t})=>{var u,m,v;const[o,s]=w.useState(!1),i=w.useRef(null),[r,l]=w.useState({x:0,y:0,right:0}),c=F(y=>y.formula),d=()=>{if(i.current){const y=i.current.getBoundingClientRect();l({x:y.left,y:y.bottom+4,right:y.right}),s(!0)}};let f=e;if(e.includes(".")){const[y,x]=e.split(".");if(y==="lighting"&&x.startsWith("light")){const g=parseInt(((u=x.match(/\d+/))==null?void 0:u[0])||"0"),b=x.includes("intensity")?"Intensity":x.includes("pos")?"Pos":"Param";f=`Light ${g+1} ${b}`}else if(y==="camera")x.includes("unified")?f=`Camera Pos ${(m=x.split(".").pop())==null?void 0:m.toUpperCase()}`:x.includes("rotation")?f=`Camera Rot ${(v=x.split(".").pop())==null?void 0:v.toUpperCase()}`:f="Camera Param";else{const g=oe.get(y);if(g){const b=g.params[x];if(b)if(y==="coreMath"&&c){const M=Re.get(c),j=M==null?void 0:M.parameters.find(C=>(C==null?void 0:C.id)===x);j?f=`${x.replace("param","P-")}: ${j.label}`:f=b.label}else f=`${g.name}: ${b.label}`;else f=`${g.name}: ${x}`}}}const h=Su(),p=y=>Mu(y,c);return a.jsxs(a.Fragment,{children:[a.jsx("button",{ref:i,onClick:d,className:`text-left px-2 py-1 bg-black/40 border border-white/10 rounded text-[10px] text-cyan-400 hover:bg-white/5 truncate ${t}`,title:f,children:f}),o&&a.jsx(bu,{x:r.x,y:r.y,anchorRight:r.right,categories:h,getItems:p,onSelect:n,onClose:()=>s(!1)})]})},Cu=()=>{const e=F(),{modulation:n,removeModulation:t,addModulation:o,openContextMenu:s}=e,i=(p,u)=>{e.updateModulation({id:p,update:u})},r=n.selectedRuleId,l=n.rules.find(p=>p.id===r),c=()=>{o({target:"coreMath.paramA",source:"audio"})},d=p=>{const u=Ye(p.currentTarget);u.length>0&&(p.preventDefault(),p.stopPropagation(),s(p.clientX,p.clientY,[],u))};if(!l)return a.jsxs("div",{className:"flex flex-col items-center justify-center py-6 text-gray-500 gap-3 border-t border-white/5",children:[a.jsx("span",{className:"text-xs italic",children:"Select a box to edit params"}),a.jsx("button",{onClick:c,className:"px-4 py-2 bg-cyan-900/50 border border-cyan-500/30 rounded text-xs font-bold text-cyan-300 hover:bg-cyan-900 transition-colors",children:"+ Add New Link"})]});const f=l.source==="audio",h=(p,u)=>{i(l.id,{freqStart:p,freqEnd:u})};return a.jsxs("div",{className:"flex flex-col gap-3 border-t border-white/5 pt-3 animate-fade-in-up","data-help-id":"audio.links",onContextMenu:d,children:[a.jsxs("div",{className:"flex justify-between items-center bg-white/5 p-2 rounded border border-white/5",children:[a.jsxs("div",{className:"flex-1 mr-2",children:[a.jsx("label",{className:"text-[9px] text-gray-500 font-bold block mb-1",children:"Target Parameter"}),a.jsx(Tr,{value:l.target,onChange:p=>i(l.id,{target:p}),className:"w-full"})]}),a.jsx("div",{className:"flex flex-col items-end gap-1",children:a.jsx("button",{onClick:()=>t(l.id),className:"p-2 text-red-500 hover:text-red-300 hover:bg-red-900/20 rounded border border-transparent hover:border-red-900/50 transition-colors",title:"Remove Rule",children:a.jsx($t,{})})})]}),a.jsxs("div",{className:"flex gap-2 items-center",children:[a.jsx("label",{className:"text-[9px] text-gray-500 font-bold",children:"Source:"}),a.jsxs("select",{value:l.source,onChange:p=>i(l.id,{source:p.target.value}),className:"t-select text-cyan-300",children:[a.jsx("option",{value:"audio",children:"Audio Spectrum"}),a.jsx("option",{value:"lfo-1",children:"LFO 1"}),a.jsx("option",{value:"lfo-2",children:"LFO 2"}),a.jsx("option",{value:"lfo-3",children:"LFO 3"})]})]}),f&&a.jsxs("div",{children:[a.jsx("label",{className:"text-[9px] text-gray-500 font-bold block mb-1",children:"Quick Frequency Bands"}),a.jsxs("div",{className:"flex gap-1",children:[a.jsx("button",{onClick:()=>h(0,.1),className:"flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] font-bold text-gray-400 rounded border border-white/5",children:"Bass"}),a.jsx("button",{onClick:()=>h(.1,.5),className:"flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] font-bold text-gray-400 rounded border border-white/5",children:"Mids"}),a.jsx("button",{onClick:()=>h(.5,1),className:"flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] font-bold text-gray-400 rounded border border-white/5",children:"Treble"}),a.jsx("button",{onClick:()=>h(0,1),className:"flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] font-bold text-gray-400 rounded border border-white/5",children:"Full"})]})]}),a.jsxs("div",{className:"bg-black/30 rounded border border-white/10 p-3",children:[a.jsxs("div",{className:"grid grid-cols-5 gap-1",children:[a.jsx("div",{className:"flex flex-col items-center",children:a.jsx(Wt,{label:"Attack",value:l.attack,min:.01,max:.99,onChange:p=>i(l.id,{attack:p}),size:40,color:"#fbbf24"})}),a.jsx("div",{className:"flex flex-col items-center",children:a.jsx(Wt,{label:"Decay",value:l.decay,min:.01,max:.99,onChange:p=>i(l.id,{decay:p}),size:40,color:"#fbbf24"})}),a.jsx("div",{className:"flex flex-col items-center",children:a.jsx(Wt,{label:"Smooth",value:l.smoothing??0,min:0,max:.99,onChange:p=>i(l.id,{smoothing:p}),size:40,color:"#a855f7"})}),a.jsx("div",{className:"flex flex-col items-center",children:a.jsx(Wt,{label:"Gain",value:l.gain,min:0,max:10,onChange:p=>i(l.id,{gain:p}),size:40,color:"#22d3ee",unconstrained:!0})}),a.jsx("div",{className:"flex flex-col items-center",children:a.jsx(Wt,{label:"Offset",value:l.offset,min:-5,max:5,onChange:p=>i(l.id,{offset:p}),size:40,color:"#22d3ee",unconstrained:!0})})]}),a.jsxs("div",{className:"grid grid-cols-5 text-[8px] text-gray-500 text-center mt-1 font-bold",children:[a.jsx("div",{children:"Rise"}),a.jsx("div",{children:"Fall"}),a.jsx("div",{children:"Lerp"}),a.jsx("div",{children:"Mult"}),a.jsx("div",{children:"Add"})]})]}),f&&a.jsxs("div",{className:"flex justify-between text-[9px] text-gray-600 px-1",children:[a.jsxs("span",{children:["Freq: ",Math.round(l.freqStart*100),"% - ",Math.round(l.freqEnd*100),"%"]}),a.jsxs("span",{children:["Threshold: ",Math.round(l.thresholdMin*100),"% - ",Math.round(l.thresholdMax*100),"%"]})]})]})},Fo=({stops:e})=>{const n=w.useMemo(()=>e?un(e):"linear-gradient(to right, #000, #fff)",[e]);return a.jsx("div",{className:"flex-1 h-2.5 rounded-sm overflow-hidden opacity-80",style:{backgroundImage:n,backgroundSize:"100% 100%"}})},ku=({state:e,actions:n})=>{const t=e.coloring,o=e.texturing,s=n.setTexturing,i=F(u=>u.setHistogramLayer),[r,l]=w.useState("layer1"),[c,d]=w.useState(()=>((t==null?void 0:t.layer3Strength)??0)>0),f=r==="layer1",h=r==="layer2";w.useEffect(()=>{i(h?1:0)},[h,i]);const p=((t==null?void 0:t.blendOpacity)??0)>0;return t?a.jsxs("div",{className:"animate-fade-in -mx-4 -mt-4 flex flex-col","data-help-id":"panel.gradient",children:[a.jsxs("div",{className:"flex flex-col",children:[a.jsxs("div",{className:`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${f?"bg-neutral-800":"bg-neutral-800/50 hover:bg-white/5"}`,onClick:()=>l("layer1"),children:[a.jsx("span",{className:"text-[10px] font-bold text-gray-300",children:"Layer 1"}),a.jsx(Fo,{stops:t.gradient}),a.jsx("svg",{className:`w-3 h-3 text-gray-500 transition-transform ${f?"rotate-180":""}`,viewBox:"0 0 20 20",fill:"currentColor",children:a.jsx("path",{fillRule:"evenodd",d:"M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z",clipRule:"evenodd"})})]}),f&&a.jsxs("div",{className:"flex flex-col animate-fade-in",children:[o&&a.jsx(Ke,{value:o.active,onChange:u=>s({active:u}),options:[{label:"Gradient",value:!1},{label:"Image Texture",value:!0}]}),o&&!o.active?a.jsxs("div",{className:"flex flex-col",children:[a.jsx("div",{"data-help-id":"grad.mapping",children:a.jsx(ie,{featureId:"coloring",groupFilter:"layer1_top"})}),a.jsx(ie,{featureId:"coloring",groupFilter:"layer1_grad"}),a.jsx(ie,{featureId:"coloring",groupFilter:"layer1_hist"}),a.jsx("div",{"data-help-id":"grad.escape",children:a.jsx(ie,{featureId:"coloring",groupFilter:"layer1_bottom"})})]}):o!=null&&o.active?a.jsxs("div",{className:"flex flex-col","data-help-id":"grad.texture",children:[a.jsx(ie,{featureId:"texturing",groupFilter:"main"}),a.jsx(ie,{featureId:"texturing",groupFilter:"mapping"}),a.jsx(ie,{featureId:"texturing",groupFilter:"transform"}),a.jsx(ie,{featureId:"coloring",groupFilter:"layer1_bottom",excludeParams:["twist"]})]}):null]})]}),a.jsx(tt,{}),a.jsxs("div",{className:"flex flex-col",children:[a.jsxs("div",{className:`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${h?"bg-neutral-800":"bg-neutral-800/50 hover:bg-white/5"}`,onClick:()=>l(h?"layer1":"layer2"),children:[a.jsx("span",{className:`text-[10px] font-bold ${p?"text-gray-300":"text-gray-600"}`,children:"Layer 2"}),!h&&!p&&a.jsx("span",{className:"text-[8px] text-gray-600",children:"off"}),a.jsx(Fo,{stops:t.gradient2}),a.jsx("svg",{className:`w-3 h-3 text-gray-500 transition-transform ${h?"rotate-180":""}`,viewBox:"0 0 20 20",fill:"currentColor",children:a.jsx("path",{fillRule:"evenodd",d:"M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z",clipRule:"evenodd"})})]}),h&&a.jsxs("div",{className:"flex flex-col animate-fade-in","data-help-id":"grad.layer2",children:[a.jsx(ie,{featureId:"coloring",groupFilter:"layer2_top"}),a.jsx(ie,{featureId:"coloring",groupFilter:"layer2_grad"}),a.jsx(ie,{featureId:"coloring",groupFilter:"layer2_hist"}),(t.mode2===6||t.mode2===8)&&a.jsx(ie,{featureId:"coloring",whitelistParams:["escape"]}),a.jsx(ie,{featureId:"coloring",groupFilter:"layer2_bottom"})]})]}),a.jsx(tt,{}),a.jsxs("div",{className:"flex flex-col",children:[a.jsxs("div",{className:`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${c?"bg-neutral-800":"bg-neutral-800/50 hover:bg-white/5"}`,onClick:()=>d(!c),children:[a.jsx("span",{className:`text-[10px] font-bold ${(t.layer3Strength??0)>0?"text-gray-300":"text-gray-600"}`,children:"Noise"}),!c&&(t.layer3Strength??0)===0&&a.jsx("span",{className:"text-[8px] text-gray-600",children:"off"}),a.jsx("div",{className:"flex-1"}),a.jsx("svg",{className:`w-3 h-3 text-gray-500 transition-transform ${c?"rotate-180":""}`,viewBox:"0 0 20 20",fill:"currentColor",children:a.jsx("path",{fillRule:"evenodd",d:"M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z",clipRule:"evenodd"})})]}),c&&a.jsx("div",{className:"flex flex-col animate-fade-in","data-help-id":"grad.noise",children:a.jsx(ie,{featureId:"coloring",groupFilter:"noise"})})]})]}):null},Ao=["TAB","CTRL","ALT","SHIFT","SPACE","LMB","MMB","RMB","SCROLL UP","SCROLL DOWN","Z","Y","H","T","1","2","3","4","5","6"],zo={Q:{x:0,y:0,label:"Q ↶"},W:{x:1,y:0,label:"W ▲"},E:{x:2,y:0,label:"E ↷"},A:{x:0,y:1,label:"A ◀"},S:{x:1,y:1,label:"S ▼"},D:{x:2,y:1,label:"D ▶"},C:{x:1,y:2,label:"C ⬇"}},ju={KeyW:"W",KeyA:"A",KeyS:"S",KeyD:"D",KeyQ:"Q",KeyE:"E",KeyC:"C",Space:"SPACE",ShiftLeft:"SHIFT",ShiftRight:"SHIFT",ControlLeft:"CTRL",ControlRight:"CTRL",AltLeft:"ALT",AltRight:"ALT",Tab:"TAB",KeyZ:"Z",KeyY:"Y",KeyH:"H",KeyT:"T",Digit1:"1",Digit2:"2",Digit3:"3",Digit4:"4",Digit5:"5",Digit6:"6"},Ru={0:"LMB",1:"MMB",2:"RMB"},Iu=()=>a.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[a.jsx("circle",{cx:"12",cy:"12",r:"3"}),a.jsx("path",{d:"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"})]}),Pu=["normal","screen","overlay","lighten","difference"],Tu=({sliceState:e,actions:n})=>{const o=66.66666666666667,s=.7,{isEnabled:i,opacity:r,posX:l,posY:c,width:d,height:f,cropL:h,cropR:p,cropT:u,cropB:m,blendMode:v,crtMode:y,tilt:x,fontSize:g}=e,b=n.setWebcam,M=w.useRef(null),j=w.useRef(null),[C,S]=w.useState(!1),[k,P]=w.useState(null),I=w.useRef(0),N=w.useRef(null),T=w.useRef(new Set),L=w.useRef(new Map),D=w.useRef(null),[A,R]=w.useState(!1);w.useEffect(()=>{if(!i){M.current&&M.current.srcObject&&M.current.srcObject.getTracks().forEach(ee=>ee.stop());return}P(null);const E=document.createElement("video");E.autoplay=!0,E.muted=!0,E.playsInline=!0,M.current=E,(async()=>{try{const X=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480,frameRate:{ideal:24}}});M.current&&(M.current.srcObject=X,M.current.play().catch(ee=>{console.error("Webcam play error",ee),P("Video blocked. Check browser privacy settings.")}))}catch(X){console.error("Webcam access denied:",X),X instanceof DOMException&&(X.name==="NotAllowedError"||X.name==="PermissionDeniedError")?P("Camera Blocked: Check browser permissions or HTTPS."):X instanceof DOMException&&X.name==="NotFoundError"?P("No camera found."):P("Camera Error: "+(X instanceof Error?X.message:String(X)))}})();const z=X=>{const ee=ju[X.code];ee&&(X.type==="keydown"?T.current.add(ee):T.current.delete(ee))},W=X=>{const ee=Ru[X.button];ee&&(X.type==="mousedown"?T.current.add(ee):T.current.delete(ee))},Z=X=>{const ee=X.deltaY<0?"SCROLL UP":"SCROLL DOWN";L.current.set(ee,1)};return window.addEventListener("keydown",z),window.addEventListener("keyup",z),window.addEventListener("mousedown",W),window.addEventListener("mouseup",W),window.addEventListener("wheel",Z,{passive:!0}),()=>{M.current&&M.current.srcObject&&M.current.srcObject.getTracks().forEach(ee=>ee.stop()),window.removeEventListener("keydown",z),window.removeEventListener("keyup",z),window.removeEventListener("mousedown",W),window.removeEventListener("mouseup",W),window.removeEventListener("wheel",Z)}},[i]);const $=w.useCallback(E=>{const B=(E-(I.current||E))/1e3;if([...Ao,...Object.keys(zo)].forEach(z=>{let W=L.current.get(z)||0;T.current.has(z)?W=1:W-=B/s,W=Math.max(0,Math.min(1,W)),L.current.set(z,W)}),E-I.current>o){const z=j.current,W=M.current;if(z){const Z=z.getContext("2d",{alpha:!1});if(Z){if(I.current=E,(z.width!==d||z.height!==f)&&(z.width=d,z.height=f),Z.fillStyle="#000000",Z.fillRect(0,0,d,f),!k&&W&&W.readyState===W.HAVE_ENOUGH_DATA){const X=W.videoWidth,ee=W.videoHeight,te=X*h,re=ee*u,ne=X*(1-h-p),xe=ee*(1-u-m);ne>0&&xe>0&&(Z.save(),Z.translate(d,0),Z.scale(-1,1),Z.drawImage(W,te,re,ne,xe,0,0,d,f),Z.restore())}else k&&(Z.fillStyle="#330000",Z.fillRect(0,0,d,f),Z.fillStyle="#ff5555",Z.font=`bold ${Math.max(10,g)}px monospace`,Z.textAlign="center",Z.textBaseline="middle",k.split(" "),Z.fillText(k,d/2,f/2));O(Z,d,f),H(Z)}}}N.current=requestAnimationFrame($)},[h,p,u,m,d,f,g,i,k]);w.useEffect(()=>{if(i)return N.current=requestAnimationFrame($),()=>{N.current&&cancelAnimationFrame(N.current)}},[$,i]);const O=(E,B,z)=>{E.font=`bold ${g}px monospace`,E.textAlign="left",E.textBaseline="bottom";let W=10;const Z=z-10,X=g*1.6+4;Ao.forEach(ee=>{const te=L.current.get(ee)||0;if(te<=.01)return;const re=E.measureText(ee),ne=g,xe=re.width+ne;W+xe>B||(E.fillStyle=`rgba(0, 0, 0, ${.8*te})`,E.fillRect(W,Z-X,xe,X),E.fillStyle=`rgba(255, 255, 255, ${te})`,E.fillText(ee,W+ne/2,Z-X*.25),W+=xe+4)})},H=E=>{const B=g*2.8,z=3,W=10,Z=10;E.font=`bold ${g}px monospace`,E.textAlign="center",E.textBaseline="middle",Object.entries(zo).forEach(([X,ee])=>{const te=L.current.get(X)||0;if(te<=.01)return;const re=W+ee.x*(B+z),ne=Z+ee.y*(B+z);E.fillStyle=`rgba(0, 0, 0, ${.8*te})`,E.fillRect(re,ne,B,B),E.fillStyle=`rgba(255, 255, 255, ${te})`,E.fillText(ee.label,re+B/2,ne+B/2+1)})},q=(E,B)=>{E.preventDefault(),E.stopPropagation(),D.current={type:B,startX:E.clientX,startY:E.clientY,startPos:{x:l,y:c},startSize:{w:d,h:f},startCrop:{l:h,r:p,t:u,b:m}},window.addEventListener("mousemove",_),window.addEventListener("mouseup",U)},_=w.useCallback(E=>{var je,Ne;if(!D.current)return;const{type:B,startX:z,startY:W,startPos:Z,startSize:X,startCrop:ee}=D.current,te=E.clientX-z,re=E.clientY-W,ne=((je=M.current)==null?void 0:je.videoWidth)||640,xe=((Ne=M.current)==null?void 0:Ne.videoHeight)||480,Ie=ne*(1-ee.l-ee.r),de=xe*(1-ee.t-ee.b),ae=X.w/Math.max(1,Ie),se=X.h/Math.max(1,de);if(B==="move")b({posX:Z.x+te,posY:Z.y+re});else if(B==="scale"){const ye=X.w/X.h,K=Math.max(100,X.w+te);b({width:K,height:K/ye})}else if(B==="crop-l"){const ye=Math.max(50,X.w-te),K=Z.x+(X.w-ye),ue=(X.w-ye)/ae/ne;b({posX:K,width:ye,cropR:Math.min(.9,Math.max(0,ee.r+ue))})}else if(B==="crop-r"){const ye=Math.max(50,X.w+te),K=(X.w-ye)/ae/ne;b({width:ye,cropL:Math.min(.9,Math.max(0,ee.l+K))})}else if(B==="crop-t"){const ye=Math.max(50,X.h-re),K=Z.y+(X.h-ye),ue=(X.h-ye)/se/xe;b({posY:K,height:ye,cropT:Math.min(.9,Math.max(0,ee.t+ue))})}else if(B==="crop-b"){const ye=Math.max(50,X.h+re),K=(X.h-ye)/se/xe;b({height:ye,cropB:Math.min(.9,Math.max(0,ee.b+K))})}},[b]),U=()=>{D.current=null,window.removeEventListener("mousemove",_),window.removeEventListener("mouseup",U)};if(!i)return null;const G=Pu[Math.floor(v)]||"normal";return a.jsxs("div",{className:"absolute select-none","data-help-id":"panel.webcam",style:{left:l,top:c,width:d,height:f,cursor:"move",pointerEvents:"auto"},onMouseDown:E=>{E.target.closest(".settings-panel")||q(E,"move")},onMouseEnter:()=>R(!0),onMouseLeave:()=>{R(!1),S(!1)},children:[a.jsx("div",{className:"absolute inset-0 w-full h-full pointer-events-none",style:{mixBlendMode:G,perspective:"1000px"},children:a.jsxs("div",{className:"w-full h-full",style:{opacity:Math.min(1,r),filter:r>1?`brightness(${r})`:"none",transform:`rotateY(${x}deg)`,transformStyle:"preserve-3d"},children:[a.jsx("canvas",{ref:j,className:"w-full h-full block"}),y&&a.jsx("div",{className:"absolute inset-0 opacity-40 mix-blend-overlay",style:{background:"linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))",backgroundSize:"100% 4px, 6px 100%"}})]})}),a.jsxs("div",{className:"absolute inset-0 w-full h-full",children:[a.jsx("div",{className:`absolute top-2 right-2 transition-opacity duration-200 z-50 ${A?"opacity-100":"opacity-0 pointer-events-none"}`,children:a.jsx("button",{onClick:E=>{E.stopPropagation(),S(!C)},className:"p-1.5 rounded bg-black/60 text-gray-400 hover:text-white hover:bg-black/80 border border-white/10 shadow-lg backdrop-blur-sm",children:a.jsx(Iu,{})})}),C&&a.jsx("div",{className:"settings-panel absolute top-10 right-2 w-48 bg-[#151515] border border-white/20 rounded p-2 shadow-2xl z-50 animate-fade-in",onMouseDown:E=>E.stopPropagation(),children:a.jsxs("div",{className:"space-y-2 text-[10px]",children:[a.jsxs("div",{children:[a.jsx(ze,{className:"block mb-1",children:"Blend Mode"}),a.jsxs("select",{value:Math.floor(v),onChange:E=>b({blendMode:Number(E.target.value)}),className:"t-select",children:[a.jsx("option",{value:0,children:"Normal"}),a.jsx("option",{value:1,children:"Screen"}),a.jsx("option",{value:2,children:"Overlay"}),a.jsx("option",{value:3,children:"Lighten"}),a.jsx("option",{value:4,children:"Difference"})]})]}),a.jsxs("div",{children:[a.jsxs("div",{className:"flex justify-between text-gray-500 font-bold mb-1",children:[a.jsx("span",{children:"Opacity"}),a.jsxs("span",{children:[Math.round(r*100),"%"]})]}),a.jsx("input",{type:"range",min:"0",max:"3",step:"0.05",value:r,onChange:E=>b({opacity:parseFloat(E.target.value)}),className:"w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"})]}),a.jsxs("div",{children:[a.jsxs("div",{className:"flex justify-between text-gray-500 font-bold mb-1",children:[a.jsx("span",{children:"3D Tilt"}),a.jsxs("span",{children:[x,"°"]})]}),a.jsx("input",{type:"range",min:"-45",max:"45",step:"1",value:x,onChange:E=>b({tilt:parseInt(E.target.value)}),className:"w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"})]}),a.jsxs("div",{children:[a.jsxs("div",{className:"flex justify-between text-gray-500 font-bold mb-1",children:[a.jsx("span",{children:"Font Size"}),a.jsxs("span",{children:[g,"px"]})]}),a.jsx("input",{type:"range",min:"8",max:"32",step:"1",value:g,onChange:E=>b({fontSize:parseInt(E.target.value)}),className:"w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"})]}),a.jsxs("label",{className:"flex items-center gap-2 cursor-pointer mt-1 pt-1 border-t border-white/10",children:[a.jsx("input",{type:"checkbox",checked:y,onChange:E=>b({crtMode:E.target.checked}),className:"cursor-pointer"}),a.jsx("span",{className:"text-gray-400 font-bold",children:"CRT Scanlines"})]})]})}),a.jsxs("div",{className:`transition-opacity duration-200 ${A?"opacity-100":"opacity-0 pointer-events-none"}`,children:[a.jsx("div",{className:"absolute bottom-[-6px] right-[-6px] w-6 h-6 bg-cyan-500/50 cursor-nwse-resize hover:bg-cyan-400 z-20 rounded-full border-2 border-black",onMouseDown:E=>q(E,"scale")}),a.jsx("div",{className:"absolute top-4 bottom-4 left-[-4px] w-3 cursor-e-resize group/l z-10 flex items-center justify-center",onMouseDown:E=>q(E,"crop-l"),children:a.jsx("div",{className:"w-1 h-8 bg-red-500/50 group-hover/l:bg-red-400 rounded-full"})}),a.jsx("div",{className:"absolute top-4 bottom-4 right-[-4px] w-3 cursor-w-resize group/r z-10 flex items-center justify-center",onMouseDown:E=>q(E,"crop-r"),children:a.jsx("div",{className:"w-1 h-8 bg-red-500/50 group-hover/r:bg-red-400 rounded-full"})}),a.jsx("div",{className:"absolute left-4 right-4 top-[-4px] h-3 cursor-s-resize group/t z-10 flex items-center justify-center",onMouseDown:E=>q(E,"crop-t"),children:a.jsx("div",{className:"h-1 w-8 bg-red-500/50 group-hover/t:bg-red-400 rounded-full"})}),a.jsx("div",{className:"absolute left-4 right-4 bottom-[-4px] h-3 cursor-n-resize group/b z-10 flex items-center justify-center",onMouseDown:E=>q(E,"crop-b"),children:a.jsx("div",{className:"h-1 w-8 bg-red-500/50 group-hover/b:bg-red-400 rounded-full"})})]})]})]})},Eu=({className:e="-m-4"})=>{const n=F(),[t,o]=w.useState({}),[s,i]=w.useState(null),[r,l]=w.useState(!1),c=F(x=>x.scalability),d=hr(c),h=(w.useMemo(()=>hn(c.subsystems),[c.subsystems])/1e3).toFixed(1),p=oe.getEngineFeatures(),u=w.useRef(()=>{});w.useEffect(()=>{const x=Y.on("compile_time",M=>{i(`Compiled (${M.toFixed(2)}s)`),l(!1),setTimeout(()=>i(null),3e3)}),g=Y.on("is_compiling",M=>{l(!!M)}),b=Y.on("engine_queue",({featureId:M,param:j,value:C})=>{u.current(M,j,C)});return()=>{x(),g(),b()}},[]);const m=(x,g,b)=>{var I,N;const M=oe.get(x),j=M==null?void 0:M.params[g],C=((I=M==null?void 0:M.engineConfig)==null?void 0:I.toggleParam)===g,S=(N=M==null?void 0:M.engineConfig)==null?void 0:N.mode,k=(j==null?void 0:j.onUpdate)==="compile";if(C&&S==="compile"||k){const T=`${x}.${g}`,L=n[x];if(L&&L[g]===b){const D={...t};delete D[T],o(D)}else o(D=>({...D,[T]:b}));i(null)}else{const T=`set${x.charAt(0).toUpperCase()+x.slice(1)}`,L=n[T];L&&L({[g]:b});const D=`${x}.${g}`;if(t[D]!==void 0){const A={...t};delete A[D],o(A)}}};u.current=m;const v=()=>{Y.emit("is_compiling","Compiling Shaders...");const x={};Object.entries(t).forEach(([g,b])=>{const[M,j]=g.split(".");x[M]||(x[M]={}),x[M][j]=b}),setTimeout(()=>{Object.entries(x).forEach(([g,b])=>{const M=`set${g.charAt(0).toUpperCase()+g.slice(1)}`,j=n[M];j&&j(b)}),o({})},100)},y=x=>{const g=n[x];if(!g)return{};const b={...g};return Object.entries(t).forEach(([M,j])=>{const[C,S]=M.split(".");C===x&&(b[S]=j)}),b};return a.jsxs("div",{className:`flex flex-col h-full ${zt.dock} min-h-0 overflow-hidden ${e}`,"data-help-id":"panel.engine",children:[a.jsxs("div",{className:`px-3 py-2 bg-black/60 border-b ${at.standard} flex items-center justify-between shrink-0`,children:[a.jsx(ze,{children:"Engine Configuration"}),a.jsx("span",{className:`text-[10px] font-bold ${ka.text}`,children:d})]}),a.jsxs("div",{className:"flex-1 overflow-y-auto custom-scroll p-0 min-h-0",children:[a.jsxs("div",{className:`flex gap-2 items-center px-3 py-2 bg-blue-900/10 border-b ${at.subtle} mb-1 shrink-0`,children:[a.jsx("div",{className:"text-blue-400",children:a.jsx(Zo,{})}),a.jsxs("p",{className:"text-[9px] text-blue-200/80 leading-tight",children:[a.jsx("span",{className:"text-green-400",children:"●"})," Compiled  ",a.jsx("span",{className:`${pt.text}`,children:"●"})," Pending  ",a.jsx("span",{className:"text-blue-400",children:"●"})," Instant"]})]}),a.jsx("div",{className:"flex flex-col",children:p.map(x=>{const g=x.engineConfig,b=y(x.id),M=g.toggleParam,j=b[M],C=`${x.id}.${M}`,k=t[C]!==void 0?"pending":"synced";return a.jsxs("div",{className:"group",children:[a.jsx(xn,{label:g.label,description:g.description,isActive:j,onToggle:P=>m(x.id,M,P),status:k}),j&&g.groupFilter&&a.jsx("div",{className:`ml-4 pl-2 border-l ${at.standard} my-0.5`,children:a.jsx(ie,{featureId:x.id,groupFilter:g.groupFilter,excludeParams:[g.toggleParam],variant:"dense",forcedState:b,onChangeOverride:(P,I)=>m(x.id,P,I),pendingChanges:t})})]},x.id)})})]}),a.jsx("div",{className:`px-3 py-2 ${zt.input} border-t ${at.standard} flex items-center justify-between min-h-[40px] shrink-0 z-10`,children:r?a.jsxs(a.Fragment,{children:[a.jsxs("div",{className:`flex items-center gap-2 ${ka.text} text-[10px] font-bold`,children:[a.jsx(Jo,{className:"animate-spin h-3 w-3"}),a.jsx("span",{children:"Compiling..."})]}),a.jsxs("div",{className:`text-[9px] ${Ct.dimLabel}`,children:["~",h,"s"]})]}):Object.keys(t).length>0?a.jsxs(a.Fragment,{children:[a.jsxs("div",{className:"flex items-center gap-1.5",children:[a.jsxs("div",{className:`flex items-center gap-2 ${pt.text} text-[10px] font-bold animate-pulse`,children:[a.jsx(Yt,{}),a.jsx("span",{children:"Pending"})]}),a.jsxs("span",{className:`text-[9px] ${Ct.dimLabel} font-mono`,children:["~",h,"s"]})]}),a.jsxs("button",{onClick:v,disabled:r,className:`px-4 py-1 ${pt.btnBg} ${pt.btnHover} disabled:bg-gray-600 disabled:cursor-not-allowed ${pt.btnText} font-bold text-[10px] rounded transition-colors flex items-center gap-1`,children:[a.jsx(Pt,{})," Apply"]})]}):a.jsxs(a.Fragment,{children:[a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsx("span",{className:`text-[10px] ${Ct.faint} font-medium`,children:"System Ready"}),a.jsxs("span",{className:`text-[9px] ${Ct.faint} font-mono`,children:["~",h,"s"]})]}),s&&a.jsxs("div",{className:"text-[10px] text-green-400 font-bold animate-fade-in flex items-center gap-1",children:[a.jsx(Pt,{})," ",s]})]})})]})},Lu=ge(),Nu=e=>{const n=new Oe(e.x,e.y,e.z,e.w),t=new V(0,0,-1).applyQuaternion(n),o=.98;return t.y>o?"Bottom View":t.y<-o?"Top View":t.x>o?"Left View":t.x<-o?"Right View":t.z>o?"Back View":t.z<-o?"Front View":null},Du=(e,n)=>{let o=qe.getUnifiedFromEngine().length();o<.001&&(o=3.5);let s=Lu.lastMeasuredDistance;(!s||s>=1e3||s<=0)&&(s=o);const i=new V(0,0,0),r=new Oe;let l=!0;switch(e){case"Front":r.setFromEuler(new _e(0,0,0));break;case"Back":r.setFromEuler(new _e(0,Math.PI,0));break;case"Left":r.setFromEuler(new _e(0,-Math.PI/2,0));break;case"Right":r.setFromEuler(new _e(0,Math.PI/2,0));break;case"Top":r.setFromEuler(new _e(-Math.PI/2,0,0));break;case"Bottom":r.setFromEuler(new _e(Math.PI/2,0,0));break;case"Isometric":l=!1;const m=ut.degToRad(-35.264),v=ut.degToRad(45);r.setFromEuler(new _e(m,v,0,"YXZ"));break}const c=new V(0,0,-1).applyQuaternion(r),d=i.clone().sub(c.multiplyScalar(o)),f=l?1:0;let h=n?n.orthoScale:2,p=n?n.dofStrength:0,u;return l&&(p=0,u={camType:f,orthoScale:h,dofStrength:p}),{position:d,rotation:{x:r.x,y:r.y,z:r.z,w:r.w},targetDistance:s,optics:u}},Er=(e,n)=>{if(!e)return null;let t=1/0,o=-1/0;const s=[];for(let u=0;u<e.length;u+=4){const m=e[u];m>-.9&&(n||(m<t&&(t=m),m>o&&(o=m)),s.push(m))}let i,r;if(n)i=n.min,r=n.max;else{if(t===1/0)return null;const u=o-t;u<1e-4?(i=t-.1,r=o+.1):(i=t-u*.05,r=o+u*.05)}const l=128,c=new Array(l).fill(0),d=r-i,f=Math.max(d,1e-6);for(const u of s){const m=(u-i)/f,v=Math.floor(m*l);v>=0&&v<l&&c[v]++}const h=Math.max(...c);return{buckets:c.map(u=>u>0?Math.log(u+1)/Math.log(h+1):0),min:i,max:r}},Lr=(e,n,t)=>{if(!e||e.length<10)return null;const o=e.length,s=e.map((g,b)=>b===0||b===o-1?0:g);let i=0;if(s.forEach(g=>i+=g),i<.01)return{start:n,end:t};const r=i*.02,l=i*.98;let c=0,d=0,f=o-1,h=!1;for(let g=0;g<o;g++)if(c+=s[g],!h&&c>=r&&(d=g,h=!0),c>=l){f=g;break}const p=.05;for(;d>1&&e[d-1]>p&&!(e[d-1]>e[d]*2);)d--;for(;f<o-2&&e[f+1]>p&&!(e[f+1]>e[f]*2);)f++;const u=(t-n)/o;let m=n+d*u,v=n+f*u;const x=(v-m)*.05;return m=Math.max(n,m-x),v=Math.min(t,v+x),{start:m,end:v}},Nr=({data:e,min:n,max:t,gamma:o,repeats:s=1,phase:i=0,gradientStops:r,onChange:l,autoUpdate:c,onToggleAuto:d,onRefresh:f,isStale:h=!1,height:p=48,labelTitle:u="Levels",labelLeft:m="Black",labelMid:v="Gamma",labelRight:y="White",fixedRange:x})=>{const g=w.useRef(null),[b,M]=w.useState(x||{min:0,max:1}),j=F(z=>z.openContextMenu),C=w.useMemo(()=>{const z=Er(e,x);return z?(M({min:z.min,max:z.max}),z.buckets):(x&&M(x),[])},[e,x]),S=Math.pow(.5,1/o)*100;w.useEffect(()=>{const z=g.current;if(!z)return;const W=z.getContext("2d");if(!W||(W.clearRect(0,0,z.width,z.height),C.length===0))return;const Z=z.width,X=z.height,ee=Z/C.length;W.fillStyle="#666",C.forEach((te,re)=>{const ne=te*X;W.fillRect(re*ee,X-ne,ee,ne)})},[C]);const k=z=>{const W=b.max-b.min;return W<1e-5?50:(z-b.min)/W*100},P=C.length>0||x,I=P?k(n):0,N=P?k(t):100,T=N-I,L=I+S/100*T,D=w.useRef(null),A=(z,W)=>{z.preventDefault(),z.stopPropagation(),D.current={type:W,startX:z.clientX,startMin:n,startMax:t,startGamma:o},window.addEventListener("mousemove",R),window.addEventListener("mouseup",$)},R=z=>{if(!D.current||!g.current)return;const{type:W,startX:Z,startMin:X,startMax:ee,startGamma:te}=D.current,re=g.current.getBoundingClientRect(),ne=z.clientX-Z,xe=b.max-b.min,Ie=C.length>0||x?xe:1,de=ne/re.width*Ie;let ae=X,se=ee,je=te;if(W==="min")ae+=de;else if(W==="max")se+=de;else if(W==="pan")ae+=de,se+=de;else if(W==="gamma"){const Ne=re.width*Math.abs(ee-X)/Ie,K=Math.pow(.5,1/te)*Ne,Ee=Math.max(1,Math.min(Ne-1,K+ne))/Ne;je=Math.log(.5)/Math.log(Ee),je=Math.max(.1,Math.min(10,je))}ae>=se&&(W==="min"&&(ae=se-.001),W==="max"&&(se=ae+.001)),l({min:ae,max:se,gamma:je})},$=()=>{D.current=null,window.removeEventListener("mousemove",R),window.removeEventListener("mouseup",$)},O=()=>{if(C.length===0)return;const z=Lr(C,b.min,b.max);z&&l({min:z.start,max:z.end,gamma:1})},H=z=>{z.preventDefault(),z.stopPropagation(),l({min:0,max:1,gamma:1})},q=z=>{const W=Ye(z.currentTarget);W.length>0&&(z.preventDefault(),z.stopPropagation(),j(z.clientX,z.clientY,[],W))},_=w.useMemo(()=>un(r||[{id:"b",position:0,color:"#000000"},{id:"w",position:1,color:"#ffffff"}],o),[r,o]),U=Math.max(.1,s),G={left:`${I}%`,width:`${Math.max(0,N-I)}%`},E=1+2/U,B={backgroundImage:_,backgroundSize:`${100/(U*E)}% 100%`,backgroundRepeat:"repeat-x",width:`${100*E}%`,marginLeft:`${-100/U}%`,transform:`translateX(${i*100/(U*E)}%)`};return a.jsxs("div",{className:"py-2 bg-gray-900/40","data-help-id":"ui.histogram",onContextMenu:q,children:[a.jsxs("div",{className:"flex justify-between items-center mb-2 px-3",children:[a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsx("label",{className:"text-[10px] text-gray-500 font-bold",children:u}),h&&!c&&a.jsx("span",{className:"text-[8px] text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded border border-amber-500/30",children:"Stale"}),d&&a.jsx("div",{className:"flex items-center justify-center w-4 h-4 cursor-pointer group rounded hover:bg-white/10",onClick:d,title:"Auto-update histogram (Live)",children:a.jsx("div",{className:`w-2 h-2 rounded-full transition-all duration-300 ${c?"bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]":"bg-gray-600"}`})}),f&&!c&&a.jsx("button",{onClick:f,className:"text-[9px] text-cyan-500 hover:text-white ml-1",children:"Refresh"})]}),a.jsxs("div",{className:"flex items-center gap-1",children:[a.jsx("button",{onClick:()=>l({min:0,max:1,gamma:1}),className:"px-2 py-0.5 bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white text-[8px] rounded border border-gray-600 transition-colors font-bold",title:"Reset to 0-1 range",children:"0-1"}),d&&a.jsx("button",{onClick:O,className:"px-2 py-0.5 bg-cyan-900/40 hover:bg-cyan-700 text-cyan-400 text-[9px] rounded border border-cyan-800 transition-colors font-bold",title:"Fit range to current data",children:"Fit"})]})]}),a.jsxs("div",{className:`relative w-full bg-black/60 overflow-hidden select-none border-y border-white/5 transition-colors group/hist ${f&&!c?"cursor-pointer hover:bg-black/40":""}`,style:{height:p},onClick:f&&!c?f:void 0,children:[a.jsxs("div",{className:"absolute inset-0 right-4 left-3 mx-2",children:[a.jsx("canvas",{ref:g,width:320,height:p,className:"w-full h-full opacity-40 absolute inset-0"}),a.jsx("div",{className:"absolute top-0 bottom-0 overflow-hidden pointer-events-none opacity-40",style:G,children:a.jsx("div",{className:"h-full",style:B})}),a.jsxs("div",{className:"absolute top-0 bottom-0 w-4 -ml-2 cursor-ew-resize z-20 group/min flex justify-center",style:{left:`${I}%`},onMouseDown:z=>A(z,"min"),children:[a.jsx("div",{className:"w-px h-full bg-white/60 group-hover/min:bg-white group-hover/min:w-0.5 transition-all shadow-[0_0_5px_rgba(0,0,0,0.8)]"}),a.jsx("div",{className:"absolute top-0 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-white"})]}),a.jsxs("div",{className:"absolute top-0 bottom-0 w-4 -ml-2 cursor-ew-resize z-20 group/max flex justify-center",style:{left:`${N}%`},onMouseDown:z=>A(z,"max"),children:[a.jsx("div",{className:"w-px h-full bg-white/60 group-hover/max:bg-white group-hover/max:w-0.5 transition-all shadow-[0_0_5px_rgba(0,0,0,0.8)]"}),a.jsx("div",{className:"absolute bottom-0 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-white"})]}),T>5&&a.jsx("div",{className:"absolute top-1/2 -translate-y-1/2 w-4 h-4 -ml-2 cursor-ew-resize z-30 group/gamma flex items-center justify-center",style:{left:`${L}%`},onMouseDown:z=>A(z,"gamma"),children:a.jsx("div",{className:"w-2 h-2 rotate-45 bg-gray-400 border border-black group-hover/gamma:bg-white group-hover/gamma:scale-125 transition-transform shadow-md"})}),a.jsx("div",{className:"absolute top-0 bottom-0 cursor-grab active:cursor-grabbing z-10",style:{left:`${I}%`,width:`${Math.max(0,N-I)}%`},onMouseDown:z=>A(z,"pan")})]}),a.jsxs("button",{onClick:H,className:"absolute top-0 bottom-0 right-0 w-4 bg-red-900/50 hover:bg-red-700/80 border-l border-white/10 z-40 opacity-0 group-hover/hist:opacity-100 transition-opacity flex items-center justify-center",title:"Reset Range",children:[a.jsx("div",{className:"w-px h-2 bg-white/80 rotate-45 transform origin-center absolute"}),a.jsx("div",{className:"w-px h-2 bg-white/80 -rotate-45 transform origin-center absolute"})]})]}),a.jsxs("div",{className:"flex justify-between items-center mt-2 px-3",children:[a.jsxs("div",{className:"flex flex-col items-start w-16",children:[a.jsx("span",{className:"text-[8px] text-gray-600",children:m}),a.jsx(vt,{value:n,onChange:z=>l({min:z,max:t,gamma:o}),step:.01,min:-1/0,max:1/0,highlight:!0})]}),a.jsxs("div",{className:"flex flex-col items-center w-16",children:[a.jsx("span",{className:"text-[8px] text-gray-600",children:v}),a.jsx(vt,{value:o,onChange:z=>l({min:n,max:t,gamma:z}),step:.01,min:.1,max:10,overrideText:o.toFixed(2)})]}),a.jsxs("div",{className:"flex flex-col items-end w-16",children:[a.jsx("span",{className:"text-[8px] text-gray-600",children:y}),a.jsx(vt,{value:t,onChange:z=>l({min:n,max:z,gamma:o}),step:.01,min:-1/0,max:1/0,highlight:!0})]})]})]})},Cn=ge(),_u=({sliceState:e,actions:n})=>{const t=F(p=>p.sceneHistogramData);F(p=>p.sceneHistogramTrigger);const o=F(p=>p.refreshSceneHistogram),s=F(p=>p.liveModulations),{levelsMin:i,levelsMax:r,levelsGamma:l}=e,c=n.setColorGrading,d=(s==null?void 0:s["colorGrading.levelsMin"])??i,f=(s==null?void 0:s["colorGrading.levelsMax"])??r,h=(s==null?void 0:s["colorGrading.levelsGamma"])??l;return a.jsx("div",{className:"mt-2 pt-2 border-t border-white/5",children:a.jsx(Nr,{data:t,min:d??0,max:f??1,gamma:h??1,onChange:({min:p,max:u,gamma:m})=>{c({levelsMin:p,levelsMax:u,levelsGamma:m})},onRefresh:o,height:40,fixedRange:{min:0,max:1}})})},Fu=({sliceState:e,actions:n})=>{const{camFov:t,camType:o,dofStrength:s}=e,i=n.setOptics;F(u=>u.interactionMode),F(u=>u.setInteractionMode),F(u=>u.focusLock),F(u=>u.setFocusLock);const[r,l]=w.useState(!0),c=w.useRef(null),d=Math.abs((o??0)-0)<.1,f=()=>{const u=et();if(!u)return;const m=F.getState(),v=Cn.lastMeasuredDistance;let y=v>1e-4&&v<900?v:m.targetDistance||3.5;y=Math.max(.001,y);const x=qe.getUnifiedFromEngine(),g=new V(0,0,-1).applyQuaternion(u.quaternion);c.current={fov:t,dist:y,unifiedPos:{x:x.x,y:x.y,z:x.z},forward:g,quat:u.quaternion.clone()}},h=u=>{const m={camFov:u};if(r&&c.current){const{fov:C,dist:S,unifiedPos:k,forward:P,quat:I}=c.current,N=ut.degToRad(C),T=ut.degToRad(u),L=Math.tan(N/2)/Math.tan(T/2),D=S*L,A=S-D,R=P.clone().multiplyScalar(A);m.dofFocus=D;const $=new V(k.x,k.y,k.z).add(R);qe.teleportPosition($,{x:I.x,y:I.y,z:I.z,w:I.w},D),F.setState({targetDistance:D})}i(m);const{isRecording:v,captureCameraFrame:y,addKeyframe:x,addTrack:g,currentFrame:b,sequence:M,isPlaying:j}=le.getState();if(v){const C=j?"Linear":"Bezier";if(m.dofFocus!==void 0){const S="optics.dofFocus";M.tracks[S]||g(S,"Focus Distance"),x(S,b,m.dofFocus,C)}r&&y(b,!0,C)}},p=()=>{if(r){const{currentFrame:u,captureCameraFrame:m,isPlaying:v}=le.getState();m(u,!0,v?"Linear":"Bezier")}};return a.jsx("div",{className:"flex flex-col",children:d&&a.jsxs("div",{children:[a.jsx(fe,{label:"Field of View",value:t??60,min:10,max:150,step:1,onChange:h,onDragStart:f,overrideInputText:`${Math.round(t??60)}°`,trackId:"optics.camFov",onKeyToggle:p}),a.jsx("div",{children:a.jsx(Ke,{label:"Dolly Link",icon:a.jsx(on,{active:r}),value:r,onChange:u=>l(u)})})]})})},Au=({sliceState:e,actions:n})=>{const t=n.setOptics,o=F(d=>d.interactionMode),s=F(d=>d.setInteractionMode),i=F(d=>d.focusLock),r=F(d=>d.setFocusLock),l=o==="picking_focus",c=d=>{r(d),d&&Cn.lastMeasuredDistance>0&&t({dofFocus:Cn.lastMeasuredDistance})};return a.jsxs("div",{className:"grid grid-cols-2 gap-px p-px",children:[a.jsx(Na,{active:i,onClick:()=>c(!i),label:i?"Lock On":"Focus Lock",variant:"primary"}),a.jsx(Na,{active:l,onClick:()=>s(l?"none":"picking_focus"),label:l?"Picking...":"Pick Focus",variant:"success"})]})},Dr=()=>{const e=F(s=>s.sceneOffset),n=F(s=>s.cameraRot),t=qe.getUnifiedPosition({x:0,y:0,z:0},e),o=qe.getRotationDegrees(n);return a.jsxs(a.Fragment,{children:[a.jsx("div",{"data-help-id":"cam.position",children:a.jsx(sa,{label:"Absolute Position",value:t,onChange:s=>qe.teleportPosition(s),step:.1,min:-1/0,max:1/0,interactionMode:"camera",trackKeys:["camera.unified.x","camera.unified.y","camera.unified.z"],trackLabels:["Position X","Position Y","Position Z"]})}),a.jsx("div",{"data-help-id":"cam.rotation",children:a.jsx(sa,{label:"Rotation (Degrees)",value:o,onChange:qe.teleportRotation,step:1,min:-180,max:180,interactionMode:"camera",trackKeys:["camera.rotation.x","camera.rotation.y","camera.rotation.z"],trackLabels:["Rotation X","Rotation Y","Rotation Z"],convertRadToDeg:!0})})]})},zu=()=>{const e=F(s=>s.cameraMode),n=F(s=>s.setCameraMode),t=F(s=>s.optics),o=t&&Math.abs(t.camType-1)<.1;return a.jsxs("div",{className:"flex flex-col gap-3",children:[a.jsxs("div",{className:o?"opacity-50 pointer-events-none":"",children:[a.jsx(Ke,{value:e,onChange:s=>n(s),options:[{label:"Orbit",value:"Orbit"},{label:"Fly",value:"Fly"}]}),o&&a.jsx("p",{className:"text-[9px] text-gray-500 mt-1 text-center",children:"Fly Mode disabled in Orthographic view"})]}),e==="Fly"&&a.jsx(ie,{featureId:"navigation",groupFilter:"movement"}),a.jsx(Dr,{})]})},Sa=ge(),Oo=[{type:"none",label:"None"},{type:"thirds",label:"Rule of Thirds"},{type:"golden",label:"Golden Ratio"},{type:"grid",label:"Grid"},{type:"center",label:"Center Mark"},{type:"diagonal",label:"Diagonal"},{type:"spiral",label:"Spiral"},{type:"safearea",label:"Safe Areas"}],$o=async()=>{try{const e=await Sa.captureSnapshot();if(!e)return;const n=await createImageBitmap(e),t=128,o=document.createElement("canvas");o.width=t,o.height=t;const s=o.getContext("2d"),i=Math.min(n.width,n.height),r=(n.width-i)/2,l=(n.height-i)/2;return s.drawImage(n,r,l,i,i,0,0,t,t),o.toDataURL("image/jpeg",.7)}catch{return}},Ou=({className:e="-m-3"})=>{var q;const{savedCameras:n,activeCameraId:t,addCamera:o,deleteCamera:s,selectCamera:i,updateCamera:r,resetCamera:l,duplicateCamera:c,reorderCameras:d}=F(),f=F(_=>_.optics),h=F(_=>_.compositionOverlay),p=F(_=>_.setCompositionOverlay),u=F(_=>_.compositionOverlaySettings),m=F(_=>_.setCompositionOverlaySettings),v=F(_=>_.setOptics),y=F(_=>_.sceneOffset),x=F(_=>_.cameraRot),g=w.useCallback(_=>{const U=y,G=U.x+(U.xL??0),E=U.y+(U.yL??0),B=U.z+(U.zL??0),z=_.sceneOffset||{x:0,y:0,z:0,xL:0,yL:0,zL:0},W=z.x+(z.xL??0),Z=z.y+(z.yL??0),X=z.z+(z.zL??0);return!!(Math.abs(G-W)+Math.abs(E-Z)+Math.abs(B-X)>1e-4||Math.abs(x.x-_.rotation.x)+Math.abs(x.y-_.rotation.y)+Math.abs(x.z-_.rotation.z)+Math.abs(x.w-_.rotation.w)>.001||_.optics&&f&&(Math.abs((f.camType??0)-(_.optics.camType??0))>.1||Math.abs((f.orthoScale??2)-(_.optics.orthoScale??2))>.01||Math.abs((f.camFov??60)-(_.optics.camFov??60))>.1))},[y,x,f]),[b,M]=w.useState(null),[j,C]=w.useState(null),[S,k]=w.useState(""),P=_=>{M(_.id),k(_.label)},I=()=>{b&&(r(b,{label:S}),M(null))},N=_=>{_.key==="Enter"&&I(),_.key==="Escape"&&M(null)},T=_=>{const U=Du(_,f);qe.teleportPosition(U.position,U.rotation,U.targetDistance),U.optics&&v&&v(U.optics),i(null)},L=w.useCallback(async()=>{const _=qe.getRotationFromEngine();let U=`Camera ${n.length+1}`;const G=F.getState().optics;if(G&&Math.abs(G.camType-1)<.1){const B=Nu(_);B&&(U=B)}o(U);const E=await $o();if(E){const B=F.getState().savedCameras,z=B[B.length-1];z&&r(z.id,{thumbnail:E})}},[n.length,o,r]),D=w.useCallback(async _=>{const U=qe.getUnifiedFromEngine(),G=qe.getRotationFromEngine(),E=be.split(U.x),B=be.split(U.y),z=be.split(U.z),W=Sa.lastMeasuredDistance>0&&Sa.lastMeasuredDistance<1e3?Sa.lastMeasuredDistance:F.getState().targetDistance,Z={...F.getState().optics},X=await $o();r(_,{position:{x:0,y:0,z:0},rotation:{x:G.x,y:G.y,z:G.z,w:G.w},sceneOffset:{x:E.high,y:B.high,z:z.high,xL:E.low,yL:B.low,zL:z.low},targetDistance:W,optics:Z,...X?{thumbnail:X}:{}})},[r]),A=()=>{l(),v&&v({camType:0,camFov:60,orthoScale:2})},R=(_,U)=>{_.dataTransfer.effectAllowed="move",_.dataTransfer.setData("text/plain",String(U)),C({fromIndex:U,overIndex:U})},$=(_,U)=>{_.preventDefault(),_.dataTransfer.dropEffect="move",j&&j.overIndex!==U&&C({...j,overIndex:U})},O=(_,U)=>{_.preventDefault(),j&&d(j.fromIndex,U),C(null)},H=()=>C(null);return a.jsxs("div",{className:`flex flex-col bg-[#080808] ${e}`,"data-help-id":"panel.camera_manager",children:[a.jsxs("div",{className:"p-2 border-b border-white/10 bg-black/40 grid grid-cols-4 gap-1",children:[a.jsx("button",{onClick:()=>T("Front"),className:"bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1",children:"FRONT"}),a.jsx("button",{onClick:()=>T("Back"),className:"bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1",children:"BACK"}),a.jsx("button",{onClick:()=>T("Left"),className:"bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1",children:"LEFT"}),a.jsx("button",{onClick:()=>T("Right"),className:"bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1",children:"RIGHT"}),a.jsx("button",{onClick:()=>T("Top"),className:"bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1",children:"TOP"}),a.jsx("button",{onClick:()=>T("Bottom"),className:"bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1",children:"BTM"}),a.jsx("button",{onClick:()=>T("Isometric"),className:"bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1",children:"ISO"}),a.jsx("button",{onClick:A,className:"bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1",children:"RESET"}),a.jsxs("button",{onClick:L,className:"col-span-4 bg-cyan-900/40 hover:bg-cyan-800 text-cyan-300 border border-cyan-500/30 rounded py-1 text-[9px] font-bold flex items-center justify-center gap-1 mt-1",children:[a.jsx(Da,{})," New Camera"]})]}),a.jsxs("div",{className:"p-2 space-y-1",children:[n.length===0&&a.jsx("div",{className:"text-center text-gray-600 text-[10px] italic py-4",children:"No saved cameras"}),n.map((_,U)=>{const G=t===_.id,E=G&&g(_),B=j&&j.overIndex===U&&j.fromIndex!==U;return a.jsxs("div",{onDragOver:z=>$(z,U),onDrop:z=>O(z,U),className:`flex items-center gap-1.5 p-1.5 rounded border transition-all group ${G?"bg-cyan-900/20 border-cyan-500/50":"bg-white/5 border-transparent hover:border-white/10"} ${B?"border-cyan-400/70 border-dashed":""}`,onClick:()=>i(_.id),children:[a.jsx("div",{draggable:!0,onDragStart:z=>{z.stopPropagation(),R(z,U)},onDragEnd:H,className:"cursor-grab opacity-0 group-hover:opacity-40 hover:!opacity-80 transition-opacity flex-shrink-0",title:"Drag to reorder",children:a.jsx(Rn,{})}),a.jsx("div",{className:"w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-black/50 border border-white/5",children:_.thumbnail?a.jsx("img",{src:_.thumbnail,alt:"",className:"w-full h-full object-cover"}):a.jsx("div",{className:"w-full h-full flex items-center justify-center text-gray-700 text-[7px]",children:U+1})}),a.jsxs("div",{className:"flex-1 min-w-0",children:[b===_.id?a.jsx("input",{type:"text",value:S,onChange:z=>k(z.target.value),onBlur:I,onKeyDown:N,autoFocus:!0,className:"bg-black border border-white/20 text-xs text-white px-1 py-0.5 rounded w-full outline-none",onClick:z=>z.stopPropagation()}):a.jsx("span",{className:`text-xs font-bold truncate block cursor-text ${E?"text-amber-300 italic":G?"text-white":"text-gray-400 group-hover:text-gray-300"}`,onDoubleClick:z=>{z.stopPropagation(),P(_)},title:"Double-click to rename",children:E?`*${_.label}`:_.label}),U<9&&a.jsxs("span",{className:"text-[7px] text-gray-600",children:["Ctrl+",U+1]})]}),a.jsxs("div",{className:"flex items-center gap-0.5 flex-shrink-0",children:[G&&a.jsx("button",{onClick:z=>{z.stopPropagation(),D(_.id)},className:`p-1 transition-colors ${E?"text-amber-400 hover:text-amber-200":"text-gray-600 hover:text-gray-400 opacity-0 group-hover:opacity-100"}`,title:E?"Camera modified — click to save current view":"Update camera to current view",children:a.jsx(rn,{})}),a.jsx("button",{onClick:z=>{z.stopPropagation(),c(_.id)},className:"p-1 text-gray-600 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity",title:"Duplicate camera",children:a.jsx(Cs,{})}),a.jsx("button",{onClick:z=>{z.stopPropagation(),s(_.id)},className:"p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity",title:"Delete camera",children:a.jsx($t,{})})]})]},_.id)})]}),a.jsxs("div",{className:"border-t border-white/10 bg-black/40 p-2 space-y-2",children:[a.jsxs("div",{className:"flex items-center justify-between",children:[a.jsx(ze,{children:t?"Active Settings":"Free Camera"}),t&&a.jsx("button",{onClick:()=>i(null),className:"text-[9px] text-gray-500 hover:text-white px-2 py-0.5 rounded border border-white/10 hover:bg-white/5 transition-colors",children:"Deselect"})]}),a.jsx(At,{label:"Position",defaultOpen:!1,children:a.jsx("div",{className:"mt-1",children:a.jsx(Dr,{})})}),a.jsx("div",{className:"bg-white/5 rounded p-1",children:a.jsx(ie,{featureId:"optics"})}),a.jsx("div",{className:"border-t border-white/10 pt-2",children:a.jsx(At,{label:"Composition Guide",defaultOpen:!1,rightContent:h!=="none"?a.jsx("span",{className:"text-[8px] text-cyan-400",children:(q=Oo.find(_=>_.type===h))==null?void 0:q.label}):null,children:a.jsxs("div",{className:"mt-2 space-y-2",children:[a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsx("label",{className:"text-[9px] text-gray-500 w-16",children:"Type"}),a.jsx("select",{value:h,onChange:_=>p(_.target.value),className:"flex-1 t-select",children:Oo.map(_=>a.jsx("option",{value:_.type,children:_.label},_.type))})]}),h!=="none"&&a.jsxs(a.Fragment,{children:[a.jsx(fe,{label:"Opacity",value:u.opacity,min:.1,max:1,step:.1,onChange:_=>m({opacity:_})}),a.jsx(fe,{label:"Line Width",value:u.lineThickness,min:.5,max:3,step:.5,onChange:_=>m({lineThickness:_})}),a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsx("label",{className:"text-[9px] text-gray-500 w-16",children:"Color"}),a.jsx(Ta,{color:u.color,onChange:_=>m({color:_})})]}),h==="grid"&&a.jsxs(a.Fragment,{children:[a.jsx(fe,{label:"Divisions X",value:u.gridDivisionsX,min:2,max:16,step:1,onChange:_=>m({gridDivisionsX:_})}),a.jsx(fe,{label:"Divisions Y",value:u.gridDivisionsY,min:2,max:16,step:1,onChange:_=>m({gridDivisionsY:_})})]}),h==="spiral"&&a.jsxs(a.Fragment,{children:[a.jsx(fe,{label:"Rotation",value:u.spiralRotation,min:0,max:360,step:15,onChange:_=>m({spiralRotation:_})}),a.jsx(fe,{label:"Position X",value:u.spiralPositionX,min:0,max:1,step:.05,onChange:_=>m({spiralPositionX:_})}),a.jsx(fe,{label:"Position Y",value:u.spiralPositionY,min:0,max:1,step:.05,onChange:_=>m({spiralPositionY:_})}),a.jsx(fe,{label:"Scale",value:u.spiralScale,min:.5,max:2,step:.1,onChange:_=>m({spiralScale:_})}),a.jsx(fe,{label:"Ratio (Phi)",value:u.spiralRatio,min:1,max:2,step:.01,onChange:_=>m({spiralRatio:_})})]}),a.jsxs("div",{className:"flex items-center gap-3 pt-1",children:[a.jsxs("label",{className:"flex items-center gap-1 cursor-pointer",children:[a.jsx("input",{type:"checkbox",checked:u.showCenterMark,onChange:_=>m({showCenterMark:_.target.checked}),className:"w-3 h-3 accent-cyan-500 bg-gray-800 border-gray-600 rounded"}),a.jsx("span",{className:"text-[9px] text-gray-400",children:"Center"})]}),a.jsxs("label",{className:"flex items-center gap-1 cursor-pointer",children:[a.jsx("input",{type:"checkbox",checked:u.showSafeAreas,onChange:_=>m({showSafeAreas:_.target.checked}),className:"w-3 h-3 accent-cyan-500 bg-gray-800 border-gray-600 rounded"}),a.jsx("span",{className:"text-[9px] text-gray-400",children:"Safe Areas"})]})]})]})]})})})]})]})},Ha=.01,_r=100,Fr=Math.log(_r/Ha),$u=e=>Math.log(e/Ha)/Fr,Hu=e=>Ha*Math.exp(e*Fr),Bu=({value:e,onChange:n})=>{const t=Ue.useRef(null),o=Ue.useRef(!1),s=$u(e)*100,i=d=>{const f=t.current;if(!f)return;const h=f.getBoundingClientRect(),p=Math.max(0,Math.min(1,(d-h.left)/h.width)),u=Hu(p),m=Math.round(u*100)/100;n(Math.max(Ha,Math.min(_r,m)))},r=d=>{d.preventDefault(),d.stopPropagation(),o.current=!0,d.target.setPointerCapture(d.pointerId),i(d.clientX)},l=d=>{o.current&&i(d.clientX)},c=()=>{o.current=!1};return a.jsxs("div",{ref:t,className:"relative h-[22px] cursor-pointer overflow-hidden",style:{backgroundImage:"repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.03) 5px, rgba(255,255,255,0.03) 10px)"},onPointerDown:r,onPointerMove:l,onPointerUp:c,children:[a.jsx("div",{className:"absolute inset-0 bg-white/[0.12]"}),a.jsx("div",{className:"absolute top-0 bottom-0 left-0 bg-cyan-500/20 transition-[width] duration-75 ease-out",style:{width:`${s}%`}}),a.jsxs("div",{className:"absolute inset-0 flex items-center justify-between px-2 pointer-events-none",children:[a.jsx("span",{className:"text-[10px] text-gray-400 font-medium",children:"Amount"}),a.jsxs("span",{className:"text-[10px] text-gray-300 tabular-nums",children:[e>=10?Math.round(e):e.toFixed(2),"%"]})]})]})},Gu=({onRandomizeParams:e,onRandomizeFull:n})=>{const[t,o]=Ue.useState(100);return a.jsxs("div",{className:"py-0.5",children:[a.jsx("div",{className:"px-3 py-0.5",children:a.jsx(Bu,{value:t,onChange:o})}),a.jsxs("button",{onClick:()=>e(t/100),className:"w-full text-left px-4 py-2 text-xs flex items-center gap-2 text-gray-300 hover:bg-white/10 hover:text-white transition-colors",children:[a.jsx(ks,{})," Parameters"]}),a.jsxs("button",{onClick:()=>n(t/100),className:"w-full text-left px-4 py-2 text-xs flex items-center gap-2 text-gray-300 hover:bg-white/10 hover:text-white transition-colors",children:[a.jsx(js,{})," Full (inc. Box/Julia)"]})]})};function Ar(){const e=F.getState(),n=Re.get(e.formula),t=n==null?void 0:n.defaultPreset,o=r=>{const l=F.getState(),c=Re.get(l.formula);l.handleInteractionStart("param");const d={};if(l.formula==="Modular"){const h=l.coreMath,p=u=>u+(Math.random()*4-2)*r;d.paramA=p(h.paramA),d.paramB=p(h.paramB),d.paramC=p(h.paramC),d.paramD=p(h.paramD),d.paramE=p(h.paramE),d.paramF=p(h.paramF),l.setCoreMath(d),l.handleInteractionEnd();return}if(!c){l.handleInteractionEnd();return}const f=l.coreMath;c.parameters.forEach(h=>{if(!h)return;const p=h.max-h.min;if(h.type==="vec3"){const u=f[h.id]||{x:0,y:0,z:0};d[h.id]={x:Math.max(h.min,Math.min(h.max,u.x+(Math.random()*2-1)*p*r)),y:Math.max(h.min,Math.min(h.max,u.y+(Math.random()*2-1)*p*r)),z:Math.max(h.min,Math.min(h.max,u.z+(Math.random()*2-1)*p*r))}}else if(h.type==="vec2"){const u=f[h.id]||{x:0,y:0};d[h.id]={x:Math.max(h.min,Math.min(h.max,u.x+(Math.random()*2-1)*p*r)),y:Math.max(h.min,Math.min(h.max,u.y+(Math.random()*2-1)*p*r))}}else if(r>=1){const u=Math.random()*p+h.min;d[h.id]=h.step>0?Math.round(u/h.step)*h.step:u}else{const m=(f[h.id]??(h.min+h.max)/2)+(Math.random()*2-1)*p*r,v=Math.max(h.min,Math.min(h.max,m));d[h.id]=h.step>0?Math.round(v/h.step)*h.step:v}}),l.setCoreMath(d),l.handleInteractionEnd()},s=r=>{o(r);const l=F.getState(),c=l.geometry,d={};c.hybridMode&&(d.hybridScale=r>=1?1.5+Math.random()*1.5:Math.max(1,Math.min(3,c.hybridScale+(Math.random()*2-1)*2*r)),d.hybridMinR=r>=1?Math.random()*1:Math.max(0,Math.min(1.5,c.hybridMinR+(Math.random()*2-1)*1.5*r)),d.hybridFixedR=r>=1?.5+Math.random()*1.5:Math.max(.1,Math.min(3,c.hybridFixedR+(Math.random()*2-1)*2.9*r)),d.hybridFoldLimit=r>=1?.5+Math.random()*1.5:Math.max(.1,Math.min(2,c.hybridFoldLimit+(Math.random()*2-1)*1.9*r))),c.juliaMode&&(d.juliaX=r>=1?Math.random()*4-2:Math.max(-2,Math.min(2,c.juliaX+(Math.random()*2-1)*4*r)),d.juliaY=r>=1?Math.random()*4-2:Math.max(-2,Math.min(2,c.juliaY+(Math.random()*2-1)*4*r)),d.juliaZ=r>=1?Math.random()*4-2:Math.max(-2,Math.min(2,c.juliaZ+(Math.random()*2-1)*4*r))),c.preRotEnabled&&(d.preRotX=r>=1?(Math.random()*2-1)*Math.PI:Math.max(-Math.PI,Math.min(Math.PI,c.preRotX+(Math.random()*2-1)*Math.PI*2*r)),d.preRotY=r>=1?(Math.random()*2-1)*Math.PI:Math.max(-Math.PI,Math.min(Math.PI,c.preRotY+(Math.random()*2-1)*Math.PI*2*r)),d.preRotZ=r>=1?(Math.random()*2-1)*Math.PI:Math.max(-Math.PI,Math.min(Math.PI,c.preRotZ+(Math.random()*2-1)*Math.PI*2*r))),Object.keys(d).length>0&&l.setGeometry(d)};return[{label:"Import Options",action:()=>{},isHeader:!0},{label:"Lock Scene Settings",checked:e.lockSceneOnSwitch,action:()=>e.setLockSceneOnSwitch(!e.lockSceneOnSwitch)},{label:"Randomize",action:()=>{},isHeader:!0},{element:Ue.createElement(Gu,{onRandomizeParams:o,onRandomizeFull:s}),keepOpen:!0,action:()=>{}},{label:"Formula Parameters",action:()=>{},isHeader:!0},{label:"Reset to Default",action:()=>{var l,c,d,f;const r=e.getPreset();e.handleInteractionStart("param"),e.loadPreset({...r,paramA:0,paramB:0,paramC:0,paramD:0,paramE:0,paramF:0,vec2A:[0,0],vec2B:[0,0],vec2C:[0,0],vec3A:[0,0,0],vec3B:[0,0,0],vec3C:[0,0,0],features:{...r.features,coreMath:((l=t==null?void 0:t.features)==null?void 0:l.coreMath)||((c=r.features)==null?void 0:c.coreMath),geometry:((d=t==null?void 0:t.features)==null?void 0:d.geometry)||((f=r.features)==null?void 0:f.geometry)}}),e.handleInteractionEnd()}},{label:"Reset to Formula Preset",action:()=>{var l,c,d,f,h,p,u,m,v;if(!t)return;const r=e.getPreset();e.handleInteractionStart("param"),e.loadPreset({...t,cameraPos:r.cameraPos,cameraRot:r.cameraRot,sceneOffset:r.sceneOffset,targetDistance:r.targetDistance,cameraMode:r.cameraMode,lights:r.lights,features:{...t.features||{},atmosphere:(l=r.features)==null?void 0:l.atmosphere,lighting:(c=r.features)==null?void 0:c.lighting,optics:(d=r.features)==null?void 0:d.optics,materials:(f=r.features)==null?void 0:f.materials,coreMath:(h=t.features)==null?void 0:h.coreMath,geometry:(p=t.features)==null?void 0:p.geometry,coloring:(u=t.features)==null?void 0:u.coloring,texturing:(m=t.features)==null?void 0:m.texturing,quality:(v=t.features)==null?void 0:v.quality}}),e.handleInteractionEnd()},disabled:!t},{label:"Scene Parameters",action:()=>{},isHeader:!0},{label:"Reset to Default",action:()=>{var c,d,f,h,p;const r=e.getPreset();e.handleInteractionStart("camera"),e.resetCamera();const l=(c=Re.get("Mandelbulb"))==null?void 0:c.defaultPreset;l&&e.loadPreset({...r,cameraPos:l.cameraPos,cameraRot:l.cameraRot,sceneOffset:l.sceneOffset,targetDistance:l.targetDistance,features:{...r.features,atmosphere:(d=l.features)==null?void 0:d.atmosphere,lighting:(f=l.features)==null?void 0:f.lighting,optics:(h=l.features)==null?void 0:h.optics,materials:(p=l.features)==null?void 0:p.materials}}),e.handleInteractionEnd()}},{label:"Reset to Formula Preset",action:()=>{var l,c,d,f;if(!t)return;const r=e.getPreset();e.handleInteractionStart("camera"),e.loadPreset({...r,cameraPos:t.cameraPos,cameraRot:t.cameraRot,sceneOffset:t.sceneOffset,targetDistance:t.targetDistance,cameraMode:t.cameraMode,lights:t.lights,features:{...r.features,atmosphere:(l=t.features)==null?void 0:l.atmosphere,lighting:(c=t.features)==null?void 0:c.lighting,optics:(d=t.features)==null?void 0:d.optics,materials:(f=t.features)==null?void 0:f.materials}}),e.handleInteractionEnd()},disabled:!t}]}const Uu=Ue.memo(({id:e,label:n})=>{const[t,o]=w.useState(!1),[s,i]=w.useState(!1),r=w.useRef(null);return w.useEffect(()=>{const l=r.current;if(!l)return;const c=new IntersectionObserver(d=>{d[0].isIntersecting&&(o(!0),c.disconnect())},{rootMargin:"50px"});return c.observe(l),()=>c.disconnect()},[]),s?null:a.jsx("div",{ref:r,className:"w-full h-full",children:t&&a.jsx("img",{src:`thumbnails/fractal_${e}.jpg`,alt:n,className:"w-full h-full object-cover",onError:()=>i(!0),loading:"lazy"})})}),Wu=({rect:e,onClose:n,onSelect:t,currentValue:o,onImport:s,showImport:i,onImportFragmentarium:r})=>{var P;const[l,c]=w.useState(null),[d,f]=w.useState({opacity:0,pointerEvents:"none"}),[h,p]=w.useState({}),[u,m]=w.useState(!1),[v,y]=w.useState([]),[x,g]=w.useState(!1),[b,M]=w.useState(!1),[j,C]=w.useState(new Set);w.useEffect(()=>{(async()=>{g(!0);try{const N=await fetch("./gmf/gallery.json");if(N.ok){const T=await N.json();y(T.categories||[])}}catch(N){console.warn("Failed to load gallery:",N)}finally{g(!1)}})()},[]);const S=async I=>{try{const N=await fetch(I.path);if(N.ok){const T=await N.text();Y.emit(me.IS_COMPILING,"Compiling Formula...");const{def:L,preset:D}=_a(T);L?F.getState().loadScene({def:L,preset:D}):t(D.formula),n()}else console.error("Failed to load formula from gallery:",I.path),alert(`Failed to load formula: ${I.name}`)}catch(N){console.error("Error loading gallery formula:",N),Y.emit(me.IS_COMPILING,!1),alert(`Error loading formula: ${I.name}`)}},k=w.useMemo(()=>{const I=Re.getAll(),N=new Set(I.map(L=>L.id)),T=[];for(const L of Rs){const D=L.match.filter(A=>N.has(A)?(N.delete(A),!0):!1);D.length>0&&T.push({name:L.name,items:D})}return N.size>0&&T.push({name:"Custom / Imported",items:Array.from(N)}),T},[]);return w.useLayoutEffect(()=>{const I=window.innerHeight,N=window.innerWidth,T=12,L=340,D=N<768;m(D);let A=e.left;A+L>N-T&&(A=N-L-T),A=Math.max(T,A);const R=I-e.bottom,$=e.top,O=R<300&&$>R;let H=O?$-T:R-T;const q=Math.min(600,Math.max(150,H)),_={position:"fixed",left:`${A}px`,width:`${L}px`,maxHeight:`${q}px`,maxWidth:`calc(100vw - ${T*2}px)`,zIndex:9999,display:"flex",flexDirection:"column",opacity:1,pointerEvents:"auto"},U=O?{bottom:`${I-e.top+4}px`,top:"auto",transformOrigin:"bottom left"}:{top:`${e.bottom+4}px`,bottom:"auto",transformOrigin:"top left"};f({..._,...U}),D||(N-(A+L)>260+20?p({left:"100%",marginLeft:"10px",top:O?"auto":0,bottom:O?0:"auto"}):p({right:"100%",marginRight:"10px",top:O?"auto":0,bottom:O?0:"auto"}))},[e]),w.useEffect(()=>{const I=()=>n(),N=L=>{L.target.closest(".portal-dropdown-content")||n()},T=L=>{L.target.closest(".portal-dropdown-content")||n()};return window.addEventListener("resize",I),window.addEventListener("mousedown",N,!0),window.addEventListener("wheel",T,!0),()=>{window.removeEventListener("resize",I),window.removeEventListener("mousedown",N,!0),window.removeEventListener("wheel",T,!0)}},[n]),Ht.createPortal(a.jsxs("div",{style:d,children:[a.jsxs("div",{className:"portal-dropdown-content bg-[#121212] border border-white/10 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-y-auto custom-scroll animate-fade-in-down w-full flex-1",onMouseLeave:()=>c(null),children:[i&&a.jsxs("div",{className:"p-1 border-b border-white/5 sticky top-0 bg-[#121212] z-50 space-y-1",children:[a.jsxs("button",{onClick:()=>{s(),n()},className:"w-full flex items-center justify-center gap-2 px-3 py-2 bg-cyan-900/20 hover:bg-cyan-900/40 text-cyan-400 text-[10px] font-bold rounded border border-cyan-500/20 hover:border-cyan-500/50 transition-colors",children:[a.jsx(Qo,{}),"Import Formula (.GMF)"]}),a.jsxs("button",{onClick:()=>{r(),n()},className:"w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-900/20 hover:bg-purple-900/40 text-purple-400 text-[10px] font-bold rounded border border-purple-500/20 hover:border-purple-500/50 transition-colors",children:[a.jsx(Ma,{}),"Formula Workshop"]})]}),k.map(I=>a.jsxs("div",{className:"py-1",children:[a.jsx("div",{className:`px-3 py-1.5 text-[9px] font-bold text-gray-500 bg-[#121212] border-y border-white/5 sticky z-40 shadow-sm ${i?"top-[38px]":"top-0"}`,children:I.name}),I.items.map(N=>{const T=N==="Modular",L=Re.get(N),D=L?L.name:N,A=o===N;return a.jsxs("button",{onClick:()=>t(N),onMouseEnter:()=>c(N),className:`w-full text-left px-3 py-2.5 transition-all flex gap-3 group relative border-b border-white/5 last:border-b-0 ${A?"bg-cyan-900/20":"hover:bg-white/5"}`,children:[a.jsxs("div",{className:"w-16 h-10 shrink-0 bg-black rounded border border-white/10 overflow-hidden relative group-hover:border-cyan-500/50 transition-colors",children:[a.jsx("div",{className:"absolute inset-0 flex items-center justify-center text-gray-800 bg-gray-900 z-0",children:T?a.jsx(Ko,{}):a.jsx(Fa,{})}),!T&&a.jsx("div",{className:"relative z-10 w-full h-full",children:a.jsx(Uu,{id:N,label:D})}),A&&a.jsx("div",{className:"absolute inset-0 z-20 bg-cyan-500/20 flex items-center justify-center",children:a.jsx("div",{className:"w-4 h-4 bg-white rounded-full flex items-center justify-center text-cyan-900 shadow-lg",children:a.jsx(Pt,{})})})]}),a.jsxs("div",{className:"flex flex-col min-w-0 flex-1 justify-center",children:[a.jsx("div",{className:"flex items-center gap-2 mb-0.5",children:a.jsx("span",{className:`text-[11px] font-bold tracking-tight truncate ${A?"text-cyan-400":"text-gray-200 group-hover:text-white"} ${T?"text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300 font-bold":""}`,children:D})}),(L==null?void 0:L.shortDescription)&&a.jsx("p",{className:"text-[9px] text-gray-500 line-clamp-2 leading-tight group-hover:text-gray-400",children:L.shortDescription})]})]},N)})]},I.name)),v.length>0&&a.jsxs("div",{className:"py-1 border-t border-white/10",children:[a.jsx("div",{className:"px-3 py-1.5 text-[9px] font-bold text-gray-500 bg-[#121212] sticky z-40 shadow-sm top-[38px]",children:"Add from Gallery"}),v.map(I=>a.jsxs("div",{className:"border-b border-white/5",children:[a.jsxs("button",{onClick:()=>{C(N=>{const T=new Set(N);return T.has(I.id)?T.delete(I.id):T.add(I.id),T})},className:"w-full text-left px-3 py-2 flex items-center gap-2 group hover:bg-white/5 transition-colors",children:[a.jsx("span",{className:`w-3 h-3 text-gray-500 transition-transform ${j.has(I.id)?"rotate-180":""}`,children:a.jsx(la,{})}),a.jsx("span",{className:"text-[11px] font-bold text-purple-400 group-hover:text-purple-300",children:I.name}),a.jsxs("span",{className:"text-[9px] text-gray-600",children:["(",I.items.length," formulas)"]})]}),j.has(I.id)&&a.jsx("div",{className:"bg-black/30",children:I.items.map(N=>a.jsxs("button",{onClick:()=>S(N),onMouseEnter:()=>c(N.id),className:"w-full text-left px-6 py-2 transition-all flex gap-3 group hover:bg-white/5",children:[a.jsx("div",{className:"w-16 h-8 shrink-0 bg-black rounded border border-white/10 overflow-hidden relative group-hover:border-purple-500/50 transition-colors",children:a.jsx("div",{className:"absolute inset-0 flex items-center justify-center text-gray-800 bg-gray-900 z-0",children:a.jsx(sn,{})})}),a.jsx("div",{className:"flex flex-col min-w-0 flex-1 justify-center",children:a.jsx("span",{className:"text-[11px] font-bold tracking-tight truncate text-gray-200 group-hover:text-white",children:N.name})})]},N.id))})]},I.id))]}),x&&a.jsx("div",{className:"py-2 text-center text-[10px] text-gray-500",children:"Loading gallery..."})]}),l&&l!=="Modular"&&!u&&a.jsxs("div",{className:"absolute w-[256px] h-[256px] bg-black border border-cyan-500/50 rounded-lg shadow-[0_0_50px_rgba(0,0,0,1),0_0_20px_rgba(34,211,238,0.2)] overflow-hidden animate-fade-in pointer-events-none z-[10000]",style:h,children:[a.jsx("img",{src:`thumbnails/fractal_${l}.jpg`,className:"w-full h-full object-cover",alt:"Preview",onError:I=>I.currentTarget.parentElement.style.display="none"}),a.jsx("div",{className:"absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,4px_100%] pointer-events-none"}),a.jsx("div",{className:"absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4",children:a.jsx("div",{className:"text-[10px] font-bold text-cyan-400 drop-shadow-md",children:((P=Re.get(l))==null?void 0:P.name)||l})})]})]}),document.body)},Vu=({value:e,onChange:n})=>{var C;const[t,o]=w.useState(!1),s=F(S=>S.openWorkshop),i=w.useRef(null),r=w.useRef(null),[l,c]=w.useState(null),d=F(S=>S.openContextMenu),f=F(S=>S.setExportIncludeScene),h=F(S=>S.exportIncludeScene),p=F(S=>S.advancedMode),u=S=>{S.preventDefault(),S.stopPropagation();const k=Ar();d(S.clientX,S.clientY,k,[])},m=()=>{!t&&i.current?(c(i.current.getBoundingClientRect()),o(!0)):o(!1)},v=S=>{const k=Re.get(e);if(!k)return;const P=F.getState().getPreset({includeScene:S}),I=Is(k,P),N=new Blob([I],{type:"text/plain"}),T=URL.createObjectURL(N),L=document.createElement("a");L.href=T,L.download=`${k.id}${S?"_Full":""}.gmf`,L.click(),URL.revokeObjectURL(T)},y=S=>{S.stopPropagation(),v(h)},x=S=>{S.preventDefault(),S.stopPropagation();const k=[{label:"Export Options",action:()=>{},isHeader:!0},{label:"Include Scene Data",checked:h,action:()=>f(!h)},{label:"Actions",action:()=>{},isHeader:!0},{label:"Export Formula Only",action:()=>v(!1)},{label:"Export Full Package",action:()=>v(!0)}];d(S.clientX,S.clientY,k,[])},g=S=>{var I;const k=(I=S.target.files)==null?void 0:I[0];if(!k)return;const P=new FileReader;P.onload=N=>{var T;try{const L=(T=N.target)==null?void 0:T.result;Y.emit(me.IS_COMPILING,"Compiling Formula...");const{def:D,preset:A}=_a(L);D?F.getState().loadScene({def:D,preset:A}):n(A.formula),r.current&&(r.current.value="")}catch(L){console.error("Failed to import formula:",L),Y.emit(me.IS_COMPILING,!1),alert("Invalid formula file. Ensure it is a valid .gmf or .json definition.")}},P.readAsText(k)},b=Re.get(e),M=b?b.name:e,j=e==="Modular";return a.jsxs("div",{className:"flex gap-2",children:[a.jsx("input",{ref:r,type:"file",accept:".json,.gmf",className:"hidden",onChange:g}),a.jsxs("button",{ref:i,onClick:m,onContextMenu:u,className:`flex-1 flex items-center justify-between border text-xs text-white rounded-lg p-2.5 outline-none transition-all group ${t?"bg-gray-900 border-cyan-500 ring-1 ring-cyan-900":j?"bg-gray-900 border-purple-500/50 shadow-[inset_0_0_10px_rgba(168,85,247,0.1)]":"bg-gradient-to-t from-white/[0.06] to-white/[0.03] border-white/10 hover:border-white/20 shadow-[inset_0_-1px_0_rgba(255,255,255,0.04)]"}`,children:[a.jsxs("div",{className:"flex items-center gap-2",children:[j&&a.jsx("span",{className:"flex w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_5px_#a855f7]"}),a.jsx("span",{className:`font-bold ${j?"text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300":""}`,children:M})]}),a.jsx("div",{className:`w-3 h-3 text-gray-500 transition-transform ${t?"rotate-180":""}`,children:a.jsx(la,{})})]}),!j&&p&&a.jsx("button",{onClick:y,onContextMenu:x,className:"w-8 flex items-center justify-center bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.08] text-gray-400 hover:text-white rounded-lg transition-colors",title:h?"Export Full Preset (Right-click for options)":"Export Formula Only (Right-click for options)",children:a.jsx(Wo,{})}),((C=Re.get(e))==null?void 0:C.importSource)&&a.jsx("button",{onClick:()=>s(e),className:"w-8 flex items-center justify-center bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.08] text-gray-400 hover:text-white rounded-lg transition-colors",title:"Re-edit imported formula in Workshop",children:a.jsx(Ma,{})}),t&&l&&a.jsx(Wu,{rect:l,currentValue:e,onClose:()=>o(!1),onSelect:S=>{n(S),o(!1)},onImport:()=>{var S;return(S=r.current)==null?void 0:S.click()},showImport:p,onImportFragmentarium:()=>s(void 0)})]})},qu=({shape:e,period:n,phase:t,amplitude:o,enabled:s})=>{const i=w.useRef(null);return w.useEffect(()=>{const r=i.current;if(!r)return;const l=r.getContext("2d");if(!l)return;const c=r.width,d=r.height;if(l.clearRect(0,0,c,d),l.strokeStyle="#222",l.lineWidth=1,l.beginPath(),l.moveTo(0,d/2),l.lineTo(c,d/2),l.stroke(),!s)return;l.strokeStyle="#8b5cf6",l.lineWidth=2,l.beginPath();const f=120,h=5;for(let p=0;p<=f;p++){const u=p/f,m=(u*h/n+t)%1;let v=0;e==="Sine"?v=Math.sin(m*Math.PI*2):e==="Triangle"?v=1-Math.abs(m*2-1)*2:e==="Sawtooth"?v=m*2-1:e==="Pulse"?v=m<.5?1:-1:e==="Noise"&&(v=Math.sin(m*50)*Math.cos(m*12));const y=d/2-v*Math.min(1.5,o)*(d/4);p===0?l.moveTo(u*c,y):l.lineTo(u*c,y)}l.stroke()},[e,n,t,o,s]),a.jsxs("div",{className:"relative h-12 bg-black/40 rounded border border-white/5 mb-3 overflow-hidden",children:[a.jsx("canvas",{ref:i,width:280,height:48,className:"w-full h-full"}),a.jsx("div",{className:"absolute top-1 left-2 text-[7px] font-bold text-purple-400/50 pointer-events-none",children:"Signal (5 second window)"})]})},zr={cyan:{activeBg:"bg-cyan-900/10",activeBorder:"border-cyan-500/20",activeText:"text-cyan-400",activeLabel:"text-cyan-300",itemBorder:"border-cyan-500/10",itemActiveBg:"bg-cyan-500/[0.03]",selectedBg:"bg-cyan-500/20",selectedBorder:"border-cyan-500/40",selectedText:"text-cyan-300",addBg:"bg-cyan-500/20",addBorder:"border-cyan-500/50",addText:"text-cyan-300",addHoverBg:"hover:bg-cyan-500",searchFocus:"focus:border-cyan-500/50"},purple:{activeBg:"bg-purple-900/10",activeBorder:"border-purple-500/20",activeText:"text-purple-400",activeLabel:"text-purple-300",itemBorder:"border-purple-500/10",itemActiveBg:"bg-purple-500/[0.03]",selectedBg:"bg-purple-500/20",selectedBorder:"border-purple-500/40",selectedText:"text-purple-300",addBg:"bg-purple-500/20",addBorder:"border-purple-500/50",addText:"text-purple-300",addHoverBg:"hover:bg-purple-500",searchFocus:"focus:border-purple-500/50"},amber:{activeBg:"bg-amber-900/10",activeBorder:"border-amber-500/20",activeText:"text-amber-400",activeLabel:"text-amber-300",itemBorder:"border-amber-500/10",itemActiveBg:"bg-amber-500/[0.03]",selectedBg:"bg-amber-500/20",selectedBorder:"border-amber-500/40",selectedText:"text-amber-300",addBg:"bg-amber-500/20",addBorder:"border-amber-500/50",addText:"text-amber-300",addHoverBg:"hover:bg-amber-500",searchFocus:"focus:border-amber-500/50"}},Yu=({open:e})=>a.jsx("svg",{className:`w-2 h-2 transition-transform ${e?"rotate-90":""}`,viewBox:"0 0 6 10",fill:"currentColor",children:a.jsx("path",{d:"M0 0l6 5-6 5z"})}),Xu=({children:e,title:n,titleColor:t,subtitle:o,accent:s="cyan",selected:i=!1,expandable:r=!1,defaultExpanded:l=!0,expanded:c,onToggleExpand:d,onSelect:f,onRemove:h,actions:p,className:u=""})=>{const m=zr[s],[v,y]=w.useState(l),x=c!==void 0,g=x?c:v,b=()=>{d&&d(),x||y(C=>!C)},M=i?m.selectedBorder:m.itemBorder,j=i?m.selectedBg:"bg-black/40";return a.jsxs("div",{className:`${j} rounded border ${M} animate-fade-in transition-colors ${u}`,children:[(n||p||h||r)&&a.jsxs("div",{className:`flex items-center justify-between px-2 min-h-[26px] mb-0.5 ${f?"cursor-pointer hover:bg-white/5":""}`,onClick:f,children:[a.jsxs("div",{className:"flex items-center gap-1.5 min-w-0",children:[r&&a.jsx("button",{onClick:C=>{C.stopPropagation(),b()},className:"shrink-0 text-gray-600 hover:text-gray-300 transition-colors p-0.5",children:a.jsx(Yu,{open:g})}),n&&a.jsx("span",{className:`text-[9px] font-bold truncate ${t||(i?m.selectedText:"text-gray-500")}`,children:n}),o&&a.jsx("span",{className:"text-[8px] text-gray-600 truncate",children:o})]}),a.jsxs("div",{className:"flex items-center gap-2 shrink-0",children:[h&&a.jsx("button",{onClick:C=>{C.stopPropagation(),h()},className:"text-red-500 hover:text-white transition-colors opacity-50 hover:opacity-100",title:"Remove",children:a.jsx($t,{})}),p]})]}),r?g&&a.jsx("div",{className:"animate-fade-in px-2 pb-2",children:e}):a.jsx("div",{className:n||p||h?"px-2 pb-2":"p-2",children:e})]})},Zu=({label:e,children:n,accent:t="cyan",isActive:o=!1,onAdd:s,addDisabled:i=!1,addTitle:r="Add item",maxHeight:l,count:c,emptyMessage:d="No items",headerRight:f,className:h="","data-help-id":p})=>{const u=zr[t],v=Ue.Children.toArray(n).length===0;return a.jsxs("div",{className:`flex flex-col border-t border-white/5 ${o?u.activeBg:"bg-white/[0.02]"} ${h}`,"data-help-id":p,children:[a.jsxs("div",{className:`flex items-center justify-between px-3 py-2 border-b ${o?u.activeBorder:"border-white/5"}`,children:[a.jsxs("div",{className:"flex items-center gap-1.5",children:[a.jsx("label",{className:`text-[10px] font-bold ${o?u.activeLabel:"text-gray-500"}`,children:e}),c!==void 0&&a.jsx("span",{className:"text-[8px] bg-white/10 text-gray-400 px-1.5 py-0.5 rounded",children:c})]}),a.jsxs("div",{className:"flex items-center gap-1.5",children:[f,s&&a.jsx("button",{onClick:s,disabled:i,className:`w-5 h-5 flex items-center justify-center rounded border disabled:opacity-30 transition-all ${o?`${u.addBg} ${u.addBorder} ${u.addText} ${u.addHoverBg} hover:text-white`:"bg-white/10 border-white/10 text-gray-400 hover:bg-white/20 hover:text-white"}`,title:r,children:a.jsx(Da,{})})]})]}),a.jsx("div",{className:"flex flex-col gap-1 p-2 overflow-y-auto custom-scroll",style:l?{maxHeight:typeof l=="number"?`${l}px`:l}:void 0,children:v?a.jsx("p",{className:"text-[9px] text-gray-600 italic text-center py-3",children:d}):n})]})},Qu=({state:e,actions:n})=>{const t=()=>{if(e.animations.length>=3)return;const r={id:ot(),enabled:!0,target:"coreMath.paramA",shape:"Sine",period:5,amplitude:1,baseValue:e.coreMath.paramA,phase:0,smoothing:.5};n.setAnimations([...e.animations,r])},o=r=>{n.setAnimations(e.animations.filter(l=>l.id!==r))},s=(r,l)=>{n.setAnimations(e.animations.map(c=>c.id===r?{...c,...l}:c))},i=e.animations.some(r=>r.enabled);return a.jsx(Zu,{label:"LFO Modulators",accent:"purple",isActive:i,onAdd:t,addDisabled:e.animations.length>=3,addTitle:"Add LFO (Max 3)","data-help-id":"lfo.system",children:e.animations.map((r,l)=>a.jsx(Xu,{title:`LFO ${l+1}`,titleColor:"text-purple-400/50",accent:"purple",onRemove:()=>o(r.id),actions:a.jsx("div",{className:"w-[60px]",children:a.jsx(Ke,{value:r.enabled,onChange:c=>s(r.id,{enabled:c}),color:"bg-purple-600"})}),children:r.enabled&&a.jsxs("div",{className:"animate-fade-in",children:[a.jsx(qu,{...r}),a.jsxs("div",{className:"grid grid-cols-2 gap-1 mb-1",children:[a.jsxs("div",{children:[a.jsx("label",{className:"text-[9px] text-gray-500 font-bold block mb-0.5",children:"Target"}),a.jsx(Tr,{value:r.target,onChange:c=>{let d=0;if(c.includes(".")){const[f,h]=c.split("."),p=e[f],u=h.match(/^(vec[23][ABC])_(x|y|z)$/);if(u&&p){const m=u[1],v=u[2],y=p[m];y&&typeof y=="object"&&(d=y[v]||0)}else p&&p[h]!==void 0&&(d=p[h])}s(r.id,{target:c,baseValue:d})},className:"w-full"})]}),a.jsxs("div",{children:[a.jsx("label",{className:"text-[9px] text-gray-500 font-bold block mb-0.5",children:"Shape"}),a.jsxs("select",{value:r.shape,onChange:c=>s(r.id,{shape:c.target.value}),className:"t-select text-white focus:border-purple-500",children:[a.jsx("option",{value:"Sine",children:"Sine"}),a.jsx("option",{value:"Triangle",children:"Triangle"}),a.jsx("option",{value:"Sawtooth",children:"Sawtooth"}),a.jsx("option",{value:"Pulse",children:"Pulse"}),a.jsx("option",{value:"Noise",children:"Noise"})]})]})]}),a.jsxs("div",{className:"space-y-0",children:[a.jsx(fe,{label:"Period (Sec)",value:r.period,min:.1,max:30,step:.1,hardMin:.01,onChange:c=>s(r.id,{period:c})}),a.jsx(fe,{label:"Strength",value:r.amplitude,min:.001,max:10,step:.001,onChange:c=>s(r.id,{amplitude:c}),customMapping:{min:0,max:100,toSlider:c=>(Math.log10(Math.max(.001,c))+3)/4*100,fromSlider:c=>Math.pow(10,c/100*4-3)},overrideInputText:r.amplitude<.1?r.amplitude.toFixed(3):r.amplitude.toFixed(2)}),e.advancedMode&&a.jsx(fe,{label:"Phase Offset",value:r.phase,min:0,max:1,step:.01,onChange:c=>s(r.id,{phase:c}),customMapping:{min:0,max:360,toSlider:c=>c*360,fromSlider:c=>c/360},mapTextInput:!0,overrideInputText:`${(r.phase*360).toFixed(0)}°`}),a.jsx(fe,{label:"Smoothing",value:r.smoothing,min:0,max:1,step:.01,onChange:c=>s(r.id,{smoothing:c})})]})]})},r.id))})},Or=({label:e,featureId:n,toggleParam:t,children:o,description:s,statusContent:i,headerClassName:r="",enabled:l,onToggle:c})=>{var y;const d=F(),f=oe.get(n),h=t||((y=f==null?void 0:f.engineConfig)==null?void 0:y.toggleParam),p=d[n],u=h?!!(p!=null&&p[h]):!0,m=l!==void 0?l:u,v=x=>{var M;if(c){c(x);return}const g=`set${n.charAt(0).toUpperCase()+n.slice(1)}`,b=d[g];b&&h&&(((M=f==null?void 0:f.engineConfig)==null?void 0:M.mode)==="compile"?(Y.emit("is_compiling","Updating Engine..."),setTimeout(()=>{b({[h]:x})},50)):b({[h]:x}))};return a.jsxs("div",{className:"flex flex-col border-t border-white/5",children:[a.jsxs("div",{className:`flex items-center justify-between px-3 py-1 ${m?"bg-neutral-800":"bg-neutral-800/50 cursor-pointer hover:bg-white/5"} ${r}`,onClick:m?void 0:()=>v(!0),children:[a.jsxs("div",{className:"flex items-center gap-1.5",children:[a.jsx("span",{className:`text-[10px] font-bold ${m?"text-gray-300":"text-gray-600"}`,children:e}),!m&&a.jsx("span",{className:"text-[8px] text-gray-600",children:"off"}),i]}),a.jsx("div",{className:"w-10",onClick:x=>x.stopPropagation(),children:a.jsx(Ke,{value:m,onChange:v})})]}),m&&a.jsxs("div",{children:[s&&a.jsx("p",{className:"px-3 py-1.5 text-[9px] text-gray-600 leading-tight bg-white/[0.06] hover:text-gray-300 transition-colors cursor-default",children:s}),o]})]})},$r=e=>{const{featureId:n}=e,t=oe.get(n),o=t==null?void 0:t.panelConfig,s=e.compileParam??(o==null?void 0:o.compileParam)??"",i=e.runtimeToggleParam??(o==null?void 0:o.runtimeToggleParam),r=e.compileSettingsParams??(o==null?void 0:o.compileSettingsParams),l=e.runtimeGroup??(o==null?void 0:o.runtimeGroup),c=e.runtimeExcludeParams??(o==null?void 0:o.runtimeExcludeParams),d=e.label??(o==null?void 0:o.label)??(t==null?void 0:t.name)??n,f=e.compileMessage??(o==null?void 0:o.compileMessage)??"Compiling Shader...",h=e.helpId??(o==null?void 0:o.helpId),p=F(),u=p[n],m=!!(u!=null&&u[s]),v=i?!!(u!=null&&u[i]):m,y=`set${n.charAt(0).toUpperCase()+n.slice(1)}`,x=p[y],[g,b]=w.useState({}),M=Object.keys(g).length>0,j=v&&(!m||M),C=w.useMemo(()=>{if(!(r!=null&&r.length))return u;const D={...u,...g};return D[s]=!0,i&&(D[i]=!0),D},[u,g,s,i,r]),S=w.useCallback(D=>{x&&(i?x({[i]:D}):(Y.emit("is_compiling",f),setTimeout(()=>x({[s]:D}),50)))},[x,i,s,f]),k=w.useCallback((D,A)=>{b(R=>{const $={...R,[D]:A};return(u==null?void 0:u[D])===A&&delete $[D],$})},[u]),P=w.useCallback(()=>{x&&(Y.emit("is_compiling",f),setTimeout(()=>{const D={...g};m||(D[s]=!0),x(D),b({})},50))},[x,g,m,s,f]),I=w.useCallback(()=>{F.getState().movePanel("Engine","left"),setTimeout(()=>{m||Y.emit("engine_queue",{featureId:n,param:s,value:!0});for(const[D,A]of Object.entries(g))Y.emit("engine_queue",{featureId:n,param:D,value:A});b({})},50)},[n,s,m,g]),N=a.jsxs(a.Fragment,{children:[v&&m&&!M&&a.jsx(Ea,{status:"active"}),v&&j&&a.jsx(Ea,{status:"pending"})]}),T=w.useMemo(()=>{const D=new Set(c??[]);return D.add(s),i&&D.add(i),r==null||r.forEach(A=>D.add(A)),Array.from(D)},[s,i,c,r]),L=r&&r.length>0;return a.jsx("div",{"data-help-id":h,children:a.jsx(Or,{label:d,featureId:n,enabled:v,onToggle:S,statusContent:N,headerClassName:m?"":"bg-transparent",children:a.jsxs("div",{className:"bg-white/[0.02]",children:[v&&!m&&!L&&a.jsx(Ho,{isCompiled:!1,onCompile:P,onOpenEngine:I}),L&&a.jsx(At,{label:"Compile Settings",defaultOpen:!m,variant:"panel",children:a.jsxs("div",{children:[a.jsx(ie,{featureId:n,whitelistParams:r,forcedState:C,onChangeOverride:k}),j&&a.jsx(Ho,{isCompiled:m,onCompile:P,onOpenEngine:I})]})}),m&&(L?a.jsx(At,{label:"Parameters",defaultOpen:!0,variant:"panel",children:a.jsx(ie,{featureId:n,groupFilter:l,excludeParams:T})}):a.jsx(ie,{featureId:n,groupFilter:l,excludeParams:T}))]})})})},Ku=()=>a.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:a.jsx("polygon",{points:"13 2 3 14 12 14 11 22 21 10 12 10 13 2"})}),Ho=({isCompiled:e,onCompile:n,onOpenEngine:t})=>a.jsxs("div",{className:`flex items-center justify-between px-2 py-1 mt-1 ${Ps} rounded`,children:[a.jsxs("div",{className:`flex items-center gap-1.5 ${pt.text}`,children:[a.jsx(Yt,{}),a.jsx(ze,{variant:"secondary",color:pt.text,children:e?"Settings changed":"Not compiled"})]}),a.jsxs("div",{className:"flex items-center gap-1",children:[t&&a.jsx("button",{onClick:o=>{o.stopPropagation(),t()},className:"p-1 text-gray-500 hover:text-amber-400 transition-colors",title:"Open Engine Panel",children:a.jsx(Ku,{})}),a.jsx("button",{onClick:n,className:`px-3 py-0.5 ${pt.btnBg} ${pt.btnHover} ${pt.btnText} text-[9px] font-bold rounded transition-colors`,children:e?"Recompile":"Compile"})]})]}),Bo=ge(),Ju=({state:e,actions:n,onSwitchTab:t})=>{var p;const o=F(u=>u.openContextMenu),[s,i]=w.useState(null);w.useEffect(()=>{const u=Y.on("compile_time",m=>{i(`Loaded in ${m.toFixed(2)}s`),setTimeout(()=>i(null),5e3)});return Bo.lastCompileDuration>0&&(i(`Loaded in ${Bo.lastCompileDuration.toFixed(2)}s`),setTimeout(()=>i(null),3e3)),u},[]),e.debugMobileLayout||typeof window<"u"&&window.innerWidth<768;const r=e.coreMath;if(!r||!e.formula)return null;const l=u=>{u.preventDefault(),u.stopPropagation();const m=Ye(u.target);if(e.formula){const y=`formula.${e.formula.toLowerCase()}`;m.includes(y)||m.unshift(y)}const v=Ar();o(u.clientX,u.clientY,v,m)},d=(()=>{if(e.formula==="Modular"){const m=["ParamA","ParamB","ParamC","ParamD","ParamE","ParamF"],v={};return e.pipeline.forEach(y=>{if(!y.enabled||!y.bindings)return;const x=ke.get(y.type);Object.entries(y.bindings).forEach(([g,b])=>{if(b&&m.includes(b)){v[b]||(v[b]={labels:[],min:-5,max:5,step:.01});const M=x==null?void 0:x.inputs.find(j=>j.id===g);M?v[b].labels.push(`${y.type}: ${M.label}`):v[b].labels.push(`${y.type}: ${g}`)}})}),m.map(y=>{const x=v[y],g=y.charAt(0).toLowerCase()+y.slice(1);if(!x)return null;const b=x.labels.length>1?`${y} (Mixed)`:x.labels[0]||y;let M=0,j=C=>{};switch(g){case"paramA":M=r.paramA,j=C=>n.setCoreMath({paramA:C});break;case"paramB":M=r.paramB,j=C=>n.setCoreMath({paramB:C});break;case"paramC":M=r.paramC,j=C=>n.setCoreMath({paramC:C});break;case"paramD":M=r.paramD,j=C=>n.setCoreMath({paramD:C});break;case"paramE":M=r.paramE,j=C=>n.setCoreMath({paramE:C});break;case"paramF":M=r.paramF,j=C=>n.setCoreMath({paramF:C});break}return{label:b,val:M,set:j,min:-5,max:5,step:.01,def:0,id:g,trackId:`coreMath.${g}`,scale:"linear"}})}const u=Re.get(e.formula);return u?u.parameters.map(m=>{if(!m)return null;if(m.type==="vec3"){let x=r.vec3A,g=b=>n.setCoreMath({vec3A:b});switch(m.id){case"vec3A":x=r.vec3A,g=b=>n.setCoreMath({vec3A:b});break;case"vec3B":x=r.vec3B,g=b=>n.setCoreMath({vec3B:b});break;case"vec3C":x=r.vec3C,g=b=>n.setCoreMath({vec3C:b});break}return{label:m.label,val:x,set:g,min:m.min,max:m.max,step:m.step,def:m.default,id:m.id,trackId:`coreMath.${m.id}`,type:"vec3",mode:m.mode,linkable:m.linkable,scale:m.scale}}if(m.type==="vec4"){let x=r.vec4A,g=b=>n.setCoreMath({vec4A:b});switch(m.id){case"vec4A":x=r.vec4A,g=b=>n.setCoreMath({vec4A:b});break;case"vec4B":x=r.vec4B,g=b=>n.setCoreMath({vec4B:b});break;case"vec4C":x=r.vec4C,g=b=>n.setCoreMath({vec4C:b});break}return{label:m.label,val:x,set:g,min:m.min,max:m.max,step:m.step,def:m.default,id:m.id,trackId:`coreMath.${m.id}`,type:"vec4",mode:m.mode,linkable:m.linkable,scale:m.scale}}if(m.type==="vec2"){let x=r.vec2A,g=b=>n.setCoreMath({vec2A:b});switch(m.id){case"vec2A":x=r.vec2A,g=b=>n.setCoreMath({vec2A:b});break;case"vec2B":x=r.vec2B,g=b=>n.setCoreMath({vec2B:b});break;case"vec2C":x=r.vec2C,g=b=>n.setCoreMath({vec2C:b});break}return{label:m.label,val:x,set:g,min:m.min,max:m.max,step:m.step,def:m.default,id:m.id,trackId:`coreMath.${m.id}`,type:"vec2",mode:m.mode,linkable:m.linkable,scale:m.scale}}let v=0,y=x=>{};switch(m.id){case"paramA":v=r.paramA,y=x=>n.setCoreMath({paramA:x});break;case"paramB":v=r.paramB,y=x=>n.setCoreMath({paramB:x});break;case"paramC":v=r.paramC,y=x=>n.setCoreMath({paramC:x});break;case"paramD":v=r.paramD,y=x=>n.setCoreMath({paramD:x});break;case"paramE":v=r.paramE,y=x=>n.setCoreMath({paramE:x});break;case"paramF":v=r.paramF,y=x=>n.setCoreMath({paramF:x});break}return{label:m.label,val:v,set:y,min:m.min,max:m.max,step:m.step,def:m.default,id:m.id,trackId:`coreMath.${m.id}`,scale:m.scale,options:m.options}}):[{label:"Power (N)",val:r.paramA,set:m=>n.setCoreMath({paramA:m}),min:2,max:16,step:.001,def:8,id:"paramA",trackId:"coreMath.paramA"},null,null,null]})(),f=u=>{if(!u)return null;if(u.type==="vec3"){const x=u.val,g=new V(x.x,x.y,x.z),b=[`${u.trackId}_x`,`${u.trackId}_y`,`${u.trackId}_z`],M=[`${u.label} X`,`${u.label} Y`,`${u.label} Z`],j=u.mode||"normal",C=j==="rotation"||j==="direction"||j==="axes",S={rotation:["Azimuth","Pitch","Angle"],direction:["Azimuth","Pitch","Length"],axes:[`${u.label} X`,`${u.label} Y`,`${u.label} Z`]};return a.jsx("div",{className:"mb-px",children:a.jsx(sa,{label:u.label,value:g,min:C?-Math.PI*2:u.min,max:C?Math.PI*2:u.max,step:u.step,onChange:u.set,trackKeys:b,trackLabels:C&&S[j]||M,mode:j==="axes"?"normal":j,defaultValue:u.def?new V(u.def.x??0,u.def.y??0,u.def.z??0):void 0,linkable:u.linkable,scale:u.scale})},u.id)}if(u.type==="vec4"){const x=u.val,g=new Ft(x.x,x.y,x.z,x.w),b=[`${u.trackId}_x`,`${u.trackId}_y`,`${u.trackId}_z`,`${u.trackId}_w`],M=[`${u.label} X`,`${u.label} Y`,`${u.label} Z`,`${u.label} W`];return a.jsx("div",{className:"mb-px",children:a.jsx(vr,{label:u.label,value:g,min:u.min,max:u.max,step:u.step,onChange:u.set,trackKeys:b,trackLabels:M,defaultValue:u.def?new Ft(u.def.x??0,u.def.y??0,u.def.z??0,u.def.w??0):void 0,linkable:u.linkable,scale:u.scale})},u.id)}if(u.type==="vec2"){const x=u.val,g=[`${u.trackId}_x`,`${u.trackId}_y`],b=[`${u.label} X`,`${u.label} Y`];return a.jsx("div",{className:"mb-px",children:a.jsx(yr,{label:u.label,value:new Te(x.x,x.y),min:u.min,max:u.max,step:u.step,onChange:M=>u.set({x:M.x,y:M.y}),trackKeys:g,trackLabels:b,defaultValue:u.def?new Te(u.def.x??0,u.def.y??0):void 0,linkable:u.linkable,mode:u.mode,scale:u.scale})},u.id)}const m=u.val;if(u.options)return a.jsx("div",{className:"mb-px",children:a.jsx(qt,{label:u.label,value:m,options:u.options,onChange:x=>u.set(x),fullWidth:!0})},u.id);const v=e.liveModulations[u.trackId]??e.liveModulations[u.id],y=e.animations.some(x=>x.enabled&&(x.target===u.trackId||x.target===u.id));if(u.scale==="pi")return a.jsx(fe,{label:u.label,value:m,min:u.min,max:u.max,step:.01,onChange:u.set,defaultValue:u.def,highlight:y||u.id==="paramA"&&!y,trackId:u.trackId,liveValue:v,customMapping:{min:u.min/Math.PI,max:u.max/Math.PI,toSlider:x=>x/Math.PI,fromSlider:x=>x*Math.PI},mapTextInput:!0,overrideInputText:`${(m/Math.PI).toFixed(2)}π`},u.id);if(u.scale==="degrees"){const x=.005555555555555556;return a.jsx(fe,{label:u.label,value:m,min:u.min,max:u.max,step:u.step,onChange:u.set,defaultValue:u.def,highlight:y||u.id==="paramA"&&!y,trackId:u.trackId,liveValue:v,customMapping:{min:u.min*x,max:u.max*x,toSlider:g=>g*x,fromSlider:g=>g/x},mapTextInput:!0,overrideInputText:`${(m*x).toFixed(2)}π`},u.id)}return a.jsx(fe,{label:u.label,value:m,min:u.min,max:u.max,step:u.step,onChange:u.set,defaultValue:u.def,highlight:y||u.id==="paramA"&&!y,trackId:u.trackId,liveValue:v},u.id)},h=u=>{n.setFormula(u),u==="Modular"&&t&&t("Graph")};return a.jsxs("div",{className:"animate-fade-in -mx-4 -mt-4 min-h-full flex flex-col",onContextMenu:l,children:[a.jsxs("div",{className:`${zt.panelHeader} border-b ${at.subtle} p-4 pb-3`,"data-help-id":"formula.active",children:[a.jsxs("div",{className:"flex justify-between items-baseline mb-1",children:[a.jsx(ze,{color:Ct.dimLabel,children:"Active Formula"}),s&&a.jsx("span",{className:`text-[9px] ${Ct.dimLabel} animate-fade-in`,children:s})]}),a.jsx(Vu,{value:e.formula,onChange:h})]}),a.jsxs("div",{className:"flex flex-col","data-help-id":`panel.formula formula.${((p=e.formula)==null?void 0:p.toLowerCase())||"mandelbulb"}`,children:[a.jsx(fe,{label:"Iterations",value:r.iterations,min:1,max:500,step:1,onChange:u=>n.setCoreMath({iterations:Math.round(u)}),highlight:!0,defaultValue:32,customMapping:{min:0,max:100,toSlider:u=>100*Math.pow((u-1)/499,1/3),fromSlider:u=>1+499*Math.pow(u/100,3)},mapTextInput:!1,trackId:"coreMath.iterations",liveValue:e.liveModulations["coreMath.iterations"]}),a.jsx(a.Fragment,{children:d.map(u=>f(u))})]}),a.jsx(tt,{}),a.jsx("div",{className:`border-t ${at.subtle}`,"data-help-id":"formula.transform",children:a.jsx(ie,{featureId:"geometry",groupFilter:"transform"})}),a.jsx("div",{className:`border-t ${at.subtle}`,children:a.jsx(ie,{featureId:"geometry",groupFilter:"burning"})}),a.jsx(tt,{}),a.jsx("div",{className:`border-t ${at.subtle}`,"data-help-id":"julia.mode",children:a.jsx(ie,{featureId:"geometry",groupFilter:"julia"})}),a.jsx(tt,{}),a.jsx($r,{featureId:"geometry",label:"Hybrid Box Fold",compileParam:"hybridCompiled",runtimeToggleParam:"hybridMode",compileSettingsParams:["hybridFoldType","hybridComplex","hybridSwap","hybridPermute"],runtimeGroup:"hybrid",runtimeExcludeParams:["hybridMode"],compileMessage:"Compiling Hybrid Shader...",helpId:"hybrid.mode"}),a.jsx(tt,{}),a.jsx(Qu,{state:e,actions:n}),e.showHints&&a.jsx("div",{className:`text-[9px] ${Ct.faint} text-center mt-6 pb-2 opacity-50 font-mono`,children:"PRESS 'H' TO HIDE HINTS"})]})},eh=({state:e,actions:n})=>{const t=F(l=>l.openContextMenu),o=e.droste;e.colorGrading;const s=e.optics,i=e.waterPlane,r=l=>{const c=Ye(l.currentTarget);c.length>0&&(l.preventDefault(),l.stopPropagation(),t(l.clientX,l.clientY,[],c))};return a.jsxs("div",{className:"animate-fade-in -mx-4 -mt-4 flex flex-col",children:[a.jsx("div",{className:"flex flex-col","data-help-id":"dof.settings",children:s&&a.jsxs("div",{className:"flex flex-col",children:[a.jsx(ie,{featureId:"optics",groupFilter:"dof"}),a.jsx("div",{"data-help-id":"cam.fov",children:a.jsx(ie,{featureId:"optics",groupFilter:"projection"})})]})}),e.advancedMode&&a.jsxs("div",{className:"flex flex-col","data-help-id":"panel.scene",children:[a.jsx("div",{className:"t-section-header",onContextMenu:r,"data-help-id":"panel.scene",children:a.jsx("h3",{className:"t-section-title",children:"Camera & Navigation"})}),a.jsx(ie,{featureId:"navigation",groupFilter:"controls"})]}),a.jsx(tt,{}),a.jsx("div",{className:`flex flex-col border-t ${at.subtle}`,"data-help-id":"fog.settings",children:a.jsx(ie,{featureId:"atmosphere",groupFilter:"fog"})}),a.jsx($r,{featureId:"volumetric",helpId:"render.volumetric"}),a.jsx(tt,{}),i&&i.waterEnabled&&a.jsx("div",{className:`flex flex-col border-t ${at.subtle}`,"data-help-id":"water.settings",children:a.jsxs(Or,{label:"Water Plane",featureId:"waterPlane",description:"Infinite ocean plane at height Y.",children:[a.jsx("div",{className:"mb-2",children:a.jsx(ie,{featureId:"waterPlane",groupFilter:"main"})}),a.jsxs("div",{className:`${$n} mb-2`,children:[a.jsx(ie,{featureId:"waterPlane",groupFilter:"geometry"}),a.jsx(ie,{featureId:"waterPlane",groupFilter:"material"})]}),a.jsxs("div",{className:$n,children:[a.jsx(ze,{variant:"secondary",className:"mb-2",children:"Waves"}),a.jsx(ie,{featureId:"waterPlane",groupFilter:"waves"})]})]})}),a.jsx("div",{className:"flex flex-col","data-help-id":"scene.grading",children:a.jsx(ie,{featureId:"colorGrading",groupFilter:"grading"})}),a.jsx(tt,{}),a.jsxs(At,{label:"Effects",labelVariant:"primary",variant:"panel",children:[a.jsxs("div",{className:"flex flex-col","data-help-id":"post.effects",children:[a.jsx(ie,{featureId:"postEffects",groupFilter:"bloom"}),a.jsx(ie,{featureId:"postEffects",groupFilter:"lens"})]}),o&&a.jsxs("div",{className:"flex flex-col","data-help-id":"effect.droste",children:[a.jsx(ie,{featureId:"droste",groupFilter:"main"}),o.active&&a.jsxs("div",{className:"animate-fade-in flex flex-col",children:[a.jsx(ie,{featureId:"droste",groupFilter:"geometry"}),a.jsx(tt,{}),a.jsx(ie,{featureId:"droste",groupFilter:"structure"}),a.jsx(tt,{}),a.jsx(ie,{featureId:"droste",groupFilter:"transform"})]})]})]})]})},Go=ge(),th=({state:e,actions:n})=>{const[t,o]=w.useState(0),s=e.lighting,i=e.liveModulations;w.useEffect(()=>{t>=s.lights.length&&s.lights.length>0&&o(s.lights.length-1)},[s.lights.length,t]);const r=kt(s,t),l=F(b=>b.openContextMenu),c=b=>{const M=Ye(b.currentTarget);M.length>0&&(b.preventDefault(),b.stopPropagation(),l(b.clientX,b.clientY,[],M))},d=b=>{b.preventDefault(),b.stopPropagation();const M=kt(s,t),j=[{label:"Light Studio",isHeader:!0},{label:"Intensity Unit",isHeader:!0},{label:"Raw (Linear)",checked:(M.intensityUnit??"raw")==="raw",action:()=>n.updateLight({index:t,params:{intensityUnit:"raw"}})},{label:"Exposure (EV)",checked:M.intensityUnit==="ev",action:()=>{const C=M.intensity>0?Math.max(-4,Math.min(10,Math.log2(M.intensity))):0;n.updateLight({index:t,params:{intensityUnit:"ev",intensity:Math.round(C*10)/10}})}},{label:"Falloff Preset",isHeader:!0},{label:"Quadratic (Smooth)",checked:(M.falloffType??"Quadratic")==="Quadratic",action:()=>n.updateLight({index:t,params:{falloffType:"Quadratic"}})},{label:"Linear (Artistic)",checked:M.falloffType==="Linear",action:()=>n.updateLight({index:t,params:{falloffType:"Linear"}})},{label:"Batch",isHeader:!0},{label:"Apply to all lights",action:()=>{s.lights.forEach((C,S)=>{n.updateLight({index:S,params:{falloffType:M.falloffType,intensityUnit:M.intensityUnit,range:M.range}})})}}];l(b.clientX,b.clientY,j,["panel.light"])},f=()=>{s.lights.length<Ce&&(n.addLight(),o(s.lights.length))},h=b=>{b.stopPropagation(),s.lights.length>1&&(n.removeLight(t),o(Math.max(0,t-1)))},p=()=>{const b=kt(e.lighting,t),M=b.fixed,j=et();let C=b.position,S=b.rotation;if(j)if(b.type==="Point"){const k=Go.sceneOffset;if(M){const P=new V(C.x,C.y,C.z);P.applyQuaternion(j.quaternion),P.add(j.position),C={x:P.x+k.x+(k.xL??0),y:P.y+k.y+(k.yL??0),z:P.z+k.z+(k.zL??0)}}else{const P=new V(C.x-k.x-(k.xL??0),C.y-k.y-(k.yL??0),C.z-k.z-(k.zL??0));P.sub(j.position),P.applyQuaternion(j.quaternion.clone().invert()),C={x:P.x,y:P.y,z:P.z}}}else{const k=new V(0,0,-1).applyEuler(new _e(S.x,S.y,S.z,"YXZ"));k.applyQuaternion(M?j.quaternion:j.quaternion.clone().invert());const P=new Oe().setFromUnitVectors(new V(0,0,-1),k),I=new _e().setFromQuaternion(P,"YXZ");S={x:I.x,y:I.y,z:I.z}}n.updateLight({index:t,params:{fixed:!M,position:C,rotation:S}})},u=b=>{const M=et();if(!M){n.updateLight({index:t,params:{type:b}});return}const j=kt(e.lighting,t);let C=new V(0,0,0);if(!j.fixed){const S=new V(0,0,-1).applyQuaternion(M.quaternion);C.copy(M.position).addScaledVector(S,2);const k=Go.sceneOffset;C.add(new V(k.x+k.xL,k.y+k.yL,k.z+k.zL))}if(b==="Directional"){const S=new V(j.position.x,j.position.y,j.position.z),k=new V().subVectors(C,S).normalize();k.lengthSq()<.001&&k.set(0,-1,0);const P=new Oe().setFromUnitVectors(new V(0,0,-1),k),I=new _e().setFromQuaternion(P,"YXZ");n.updateLight({index:t,params:{type:b,rotation:{x:I.x,y:I.y,z:I.z}}})}else{const S=new Oe().setFromEuler(new _e(j.rotation.x,j.rotation.y,j.rotation.z,"YXZ")),k=new V(0,0,-1).applyQuaternion(S),I=C.clone().sub(k.multiplyScalar(5));n.updateLight({index:t,params:{type:b,position:{x:I.x,y:I.y,z:I.z}}})}};if(!r)return null;const m=(r.fixed,10),v=`lighting.light${t}`,y={x:i[`${v}_rotX`]??r.rotation.x,y:i[`${v}_rotY`]??r.rotation.y,z:i[`${v}_rotZ`]??r.rotation.z},x={x:i[`${v}_posX`]??r.position.x,y:i[`${v}_posY`]??r.position.y,z:i[`${v}_posZ`]??r.position.z},g=new V(x.x,x.y,x.z);return a.jsxs("div",{className:"animate-fade-in",onContextMenu:d,children:[a.jsx("div",{className:"mb-4",children:a.jsxs("div",{className:"flex flex-wrap gap-1 bg-black/40 p-1 rounded border border-white/5",children:[s.lights.map((b,M)=>a.jsxs("button",{onClick:()=>o(M),className:`flex-1 min-w-[60px] py-1.5 px-2 text-[9px] font-bold rounded border transition-all relative ${t===M?"bg-cyan-900/50 border-cyan-500/50 text-cyan-200 shadow-sm":"bg-transparent border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300"}`,children:["Light ",M+1,b.visible&&a.jsx("div",{className:"absolute top-1 right-1 w-1 h-1 rounded-full bg-cyan-400"})]},M)),s.lights.length<Ce&&a.jsx("button",{onClick:f,className:"w-8 flex items-center justify-center text-gray-500 hover:text-cyan-400 hover:bg-white/5 rounded transition-colors",title:"Add Light",children:a.jsx(Da,{})})]})}),a.jsxs("div",{className:"mb-4 space-y-3","data-help-id":"panel.light",children:[a.jsxs("div",{className:"flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-white/5",children:[a.jsx(Ke,{label:"Enabled",value:r.visible,onChange:()=>n.updateLight({index:t,params:{visible:!r.visible}}),color:"bg-green-500"}),s.lights.length>1&&a.jsx("button",{onClick:h,className:"p-1.5 text-red-500 hover:text-red-300 hover:bg-red-900/20 rounded ml-2 transition-colors",title:"Delete Light",children:a.jsx($t,{})})]}),a.jsxs("div",{className:`transition-opacity duration-200 ${r.visible?"opacity-100":"opacity-40 pointer-events-none"}`,children:[a.jsxs("div",{className:"mb-4 p-3 bg-gray-800/50 rounded-lg","data-help-id":"light.mode",onContextMenu:c,children:[a.jsx("div",{className:"flex gap-1 mb-2","data-help-id":"light.type",children:a.jsx(Ke,{value:r.type,onChange:b=>u(b),options:[{label:"Point",value:"Point"},{label:"Directional (Sun)",value:"Directional"}]})}),a.jsx(Ke,{label:"Attachment Mode",value:r.fixed,onChange:p,options:[{label:"Headlamp",value:!0},{label:"World",value:!1}],helpId:"light.mode"})]}),r.type==="Point"?a.jsx("div",{"data-help-id":"light.pos",children:a.jsx(sa,{label:r.fixed?"Offset XYZ":"World Position",value:g,onChange:b=>n.updateLight({index:t,params:{position:{x:b.x,y:b.y,z:b.z}}}),min:-m,max:m,step:.01,interactionMode:"param",trackKeys:[`lighting.light${t}_posX`,`lighting.light${t}_posY`,`lighting.light${t}_posZ`],trackLabels:[`Light ${t+1} Pos X`,`Light ${t+1} Pos Y`,`Light ${t+1} Pos Z`]})}):a.jsx("div",{"data-help-id":"light.rot",children:a.jsx(br,{index:t,value:y,onChange:b=>n.updateLight({index:t,params:{rotation:b}}),isFixed:r.fixed,width:200,height:130})}),r.intensityUnit==="ev"?a.jsx(fe,{label:"Power (EV)",value:r.intensity,min:-4,max:10,step:.1,onChange:b=>n.updateLight({index:t,params:{intensity:b}}),mapTextInput:!1,overrideInputText:`${nn(r.intensity)} EV`,dataHelpId:"light.intensity",trackId:`${v}_intensity`,liveValue:i[`${v}_intensity`]}):a.jsx(fe,{label:"Power",value:r.intensity,min:0,max:100,step:.1,onChange:b=>n.updateLight({index:t,params:{intensity:b}}),customMapping:{min:0,max:100,toSlider:b=>Math.sqrt(b/100)*100,fromSlider:b=>b*b/100},mapTextInput:!1,overrideInputText:nn(r.intensity),dataHelpId:"light.intensity",trackId:`${v}_intensity`,liveValue:i[`${v}_intensity`]}),r.type==="Point"&&a.jsxs(a.Fragment,{children:[a.jsx(fe,{label:"Range",value:r.range??0,min:0,max:100,step:.1,onChange:b=>n.updateLight({index:t,params:{range:b}}),customMapping:{min:0,max:100,toSlider:b=>Math.log10(b+1)/Math.log10(101)*100,fromSlider:b=>Math.pow(101,b/100)-1},mapTextInput:!1,overrideInputText:(r.range??0)<.01?"Infinite":nn(r.range??0),dataHelpId:"light.falloff",trackId:`${v}_falloff`,liveValue:i[`${v}_falloff`]}),a.jsx("p",{className:"text-[9px] text-gray-500 mb-2 -mt-2",children:"0 = Infinite reach. Sets distance where light fades to ~1%."}),a.jsx("div",{className:"mb-1 px-3","data-help-id":"light.falloff",children:a.jsx(Ke,{label:"Falloff Curve",value:r.falloffType,onChange:b=>n.updateLight({index:t,params:{falloffType:b}}),options:[{label:"Quadratic",value:"Quadratic"},{label:"Linear",value:"Linear"}],helpId:"light.falloff"})})]}),a.jsxs("div",{className:"mt-4 pt-3 border-t border-white/10 space-y-2",children:[a.jsx("label",{className:"text-xs text-gray-400 font-bold mb-2 block",children:"Color"}),a.jsx($a,{color:r.color,onColorChange:b=>n.updateLight({index:t,params:{color:b}})}),a.jsxs("div",{className:"flex items-center justify-between pt-1",children:[a.jsx("label",{className:"text-xs text-gray-400 font-medium",children:"Cast Shadows"}),a.jsx("input",{type:"checkbox",checked:r.castShadow,onChange:b=>{n.handleInteractionStart("param"),n.updateLight({index:t,params:{castShadow:b.target.checked}}),n.handleInteractionEnd()},className:"w-3 h-3 accent-cyan-500 bg-gray-800 border-gray-600 rounded cursor-pointer"})]})]})]})]}),a.jsx("div",{className:"h-px bg-gray-800 my-4"}),a.jsx("div",{className:"flex items-center justify-between mb-4 p-3 bg-gray-800/50 rounded-lg",children:a.jsx(Ke,{label:"Show 3d helpers",value:e.showLightGizmo,onChange:n.setShowLightGizmo,color:"bg-cyan-600"})}),s&&a.jsxs("div",{className:"mt-4 p-3 bg-gray-800/50 rounded-lg","data-help-id":"shadows",children:[a.jsxs("div",{className:"flex items-center justify-between mb-2",children:[a.jsx(ze,{children:"Shadows (Global)"}),a.jsx("div",{className:"w-[60px]",children:a.jsx(Ke,{value:s.shadows,onChange:b=>n.setLighting({shadows:b}),color:"bg-yellow-500"})})]}),s.shadows&&a.jsx("div",{className:"pl-2 mt-2 border-l-2 border-yellow-500/30",children:a.jsx(ie,{featureId:"lighting",groupFilter:"shadows"})})]})]})},nn=e=>{if(e===0)return"0";if(Math.abs(e)<1)return e.toFixed(3);const n=e.toPrecision(5);return n.includes(".")?n.replace(/\.?0+$/,""):n},ah=({state:e,actions:n})=>{w.useRef(null),F(s=>s.openContextMenu),e.debugMobileLayout||typeof window<"u"&&window.innerWidth<768;const t=e.materials,o=e.atmosphere;return e.lighting,!t||!o?null:a.jsxs("div",{className:"animate-fade-in -mx-4 -mt-4 flex flex-col","data-help-id":"panel.render",children:[a.jsx("div",{className:"flex flex-col","data-help-id":"mat.diffuse mat.metallic mat.roughness mat.specular mat.rim",children:a.jsx(ie,{featureId:"materials",groupFilter:"surface"})}),a.jsx("div",{className:"flex flex-col","data-help-id":"mat.env",children:a.jsx(ie,{featureId:"materials",groupFilter:"env"})}),a.jsx("div",{className:"flex flex-col","data-help-id":"mat.reflection",children:a.jsx(ie,{featureId:"reflections",groupFilter:"shading"})}),a.jsx("div",{className:"flex flex-col","data-help-id":"mat.glow",children:a.jsx(ie,{featureId:"atmosphere",groupFilter:"glow"})}),a.jsx("div",{className:"flex flex-col","data-help-id":"mat.emission",children:a.jsx(ie,{featureId:"materials",groupFilter:"emission"})}),a.jsx("div",{className:"flex flex-col","data-help-id":"mat.ao",children:a.jsx(ie,{featureId:"ao",groupFilter:"shading"})})]})},nh=({state:e,actions:n})=>{const t=F(x=>x.openContextMenu),o=e.quality,s=e.lighting,[i,r]=e.fixedResolution,[l,c]=w.useState("Free"),d=(s==null?void 0:s.ptEnabled)!==!1,f=n.setLighting,h=w.useMemo(()=>{const x=`${i}x${r}`;return["800x600","1280x720","1920x1080","2560x1440","3840x2160","1080x1080","1080x1350","1080x1920","2048x1024","4096x2048"].includes(x)?x:"Custom"},[i,r]),p=x=>{const g=Ye(x.currentTarget);g.length>0&&(x.preventDefault(),x.stopPropagation(),t(x.clientX,x.clientY,[],g))},u=async x=>{e.renderMode!==x&&(Y.emit("is_compiling","Switching Engine..."),await new Promise(g=>setTimeout(g,50)),n.setRenderMode(x))},m=(x,g)=>{const b=Math.max(64,Math.round(x/8)*8),M=Math.max(64,Math.round(g/8)*8);n.setFixedResolution(b,M)},v=(x,g)=>{l==="Free"?m(x==="w"?g:i,x==="h"?g:r):x==="w"?m(g,g/l):m(g*l,g)},y=[.25,.5,1,1.5,2];return a.jsxs("div",{className:"animate-fade-in -mx-4 -mt-4 flex flex-col",children:[a.jsxs("div",{className:"flex flex-col","data-help-id":"render.engine",children:[a.jsxs("div",{className:"px-3 py-2",children:[a.jsx(ze,{className:"block mb-1",children:"Render Engine"}),a.jsxs("div",{className:`flex ${zt.tabBar} rounded p-0.5 border ${at.standard}`,children:[a.jsx("button",{onClick:()=>u("Direct"),className:`flex-1 py-1.5 text-[10px] font-bold rounded transition-colors ${e.renderMode==="Direct"?Ts:Hn}`,children:"Direct (Fast)"}),a.jsx("button",{onClick:()=>d&&u("PathTracing"),disabled:!d,className:`flex-1 py-1.5 text-[10px] font-bold rounded transition-colors ${d?e.renderMode==="PathTracing"?`${Ls.bgMed} ${Ct.primary}`:Hn:Es}`,title:d?"Switch to Path Tracer (GI)":"Path Tracer Disabled in Engine Panel",children:"Path Tracer (GI)"})]})]}),e.renderMode==="PathTracing"&&s&&a.jsxs("div",{className:"animate-fade-in","data-help-id":"pt.global",children:[a.jsx(fe,{label:"Max Bounces",value:s.ptBounces,min:1,max:8,step:1,onChange:x=>f({ptBounces:Math.round(x)})}),a.jsx(fe,{label:"GI Brightness",value:s.ptGIStrength,min:0,max:5,step:.01,onChange:x=>f({ptGIStrength:x}),trackId:"lighting.ptGIStrength"})]})]}),a.jsx(tt,{}),a.jsxs("div",{className:"w-full flex flex-col rounded-t-sm relative",onContextMenu:p,"data-help-id":"panel.quality",children:[a.jsx("div",{className:"absolute inset-0 bg-white/[0.06] rounded-t-sm pointer-events-none"}),a.jsx("div",{className:"flex items-center bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5 px-2",children:a.jsx("span",{className:"text-[10px] text-gray-400 font-medium tracking-tight select-none",children:"Resolution"})}),a.jsxs("div",{className:"flex flex-col",children:[(()=>{const x=[a.jsx("div",{children:a.jsx(Ke,{value:e.resolutionMode,onChange:n.setResolutionMode,options:[{label:"Fill Screen",value:"Full"},{label:"Fixed",value:"Fixed"}]})},"mode")];return e.resolutionMode==="Fixed"&&x.push(a.jsx("div",{className:"animate-fade-in",children:a.jsxs("div",{className:"flex flex-col gap-2 px-3 py-2 bg-neutral-800/50",children:[a.jsx(qt,{label:"Preset",value:h,options:[{label:"SVGA (800 x 600)",value:"800x600"},{label:"HD (1280 x 720)",value:"1280x720"},{label:"FHD (1920 x 1080)",value:"1920x1080"},{label:"QHD (2560 x 1440)",value:"2560x1440"},{label:"4K (3840 x 2160)",value:"3840x2160"},{label:"Square 1:1 (1080p)",value:"1080x1080"},{label:"Portrait 4:5 (1080p)",value:"1080x1350"},{label:"Vertical 9:16 (1080p)",value:"1080x1920"},{label:"Skybox Low (2048 x 1024)",value:"2048x1024"},{label:"Skybox High (4096 x 2048)",value:"4096x2048"},{label:"Custom",value:"Custom"}],onChange:g=>{if(g!=="Custom"){const[b,M]=g.split("x").map(Number);m(b,M)}},fullWidth:!0}),a.jsxs("div",{className:"flex gap-2",children:[a.jsxs("div",{className:"flex-1",children:[a.jsx(ze,{variant:"secondary",className:"block mb-0.5",children:"Width"}),a.jsx("div",{className:"h-6 bg-black/40 rounded border border-white/10 relative",children:a.jsx(vt,{value:i,onChange:g=>v("w",g),step:8,min:64,max:8192,overrideText:`${i}`})})]}),a.jsxs("div",{className:"flex-1",children:[a.jsx(ze,{variant:"secondary",className:"block mb-0.5",children:"Height"}),a.jsx("div",{className:"h-6 bg-black/40 rounded border border-white/10 relative",children:a.jsx(vt,{value:r,onChange:g=>v("h",g),step:8,min:64,max:8192,overrideText:`${r}`})})]}),a.jsxs("div",{className:"w-[35%]",children:[a.jsx(ze,{variant:"secondary",className:"block mb-0.5",children:"Ratio"}),a.jsx("div",{className:"h-6",children:a.jsx(qt,{value:l,options:[{label:"Free",value:"Free"},{label:"16:9",value:1.7777},{label:"4:3",value:1.3333},{label:"1:1",value:1},{label:"4:5 (Portrait)",value:.8},{label:"9:16 (Vertical)",value:.5625},{label:"2:1 (Sky)",value:2}],onChange:g=>{c(g),g!=="Free"&&m(i,i/g)},fullWidth:!0,className:"!px-1"})})]})]})]})},"fixed")),x.push(a.jsx("div",{"data-help-id":"quality.scale",children:a.jsxs("div",{className:"px-3 py-2",children:[a.jsxs("div",{className:"flex items-center justify-between mb-1.5",children:[a.jsx(ze,{variant:"secondary",children:"Internal Scale"}),a.jsx("span",{className:`text-[10px] font-mono ${ka.text} font-bold`,children:`${e.aaLevel.toFixed(2)}x`})]}),a.jsx("div",{className:`grid grid-cols-5 gap-px ${zt.tint} border ${at.subtle} rounded overflow-hidden`,children:y.map(g=>a.jsx("button",{onClick:()=>n.setAALevel(g),className:`py-1.5 text-[9px] font-bold transition-all ${e.aaLevel===g?Ns:Ds}`,children:g},g))})]})},"scale"),a.jsx("div",{"data-help-id":"quality.adaptive",children:a.jsx(ie,{featureId:"quality",groupFilter:"performance"})},"performance")),x.map((g,b)=>{const M=b===x.length-1;return a.jsxs("div",{className:"flex",children:[a.jsx("div",{className:`w-2 shrink-0 self-stretch border-l border-white/20 bg-white/[0.12] ${M?"border-b border-b-white/20 rounded-bl-lg":""}`}),a.jsxs("div",{className:`flex-1 min-w-0 relative ${M?"border-b border-b-white/20":""}`,children:[a.jsx("div",{className:"absolute inset-0 bg-black/20 pointer-events-none z-10"}),g]})]},b)})})(),a.jsx("div",{className:"h-2",style:{background:"linear-gradient(to bottom, transparent, rgba(255,255,255,0.08))"}})]})]}),a.jsx(tt,{}),(s==null?void 0:s.shadowsCompile)&&(s==null?void 0:s.shadows)&&a.jsx("div",{className:"flex flex-col","data-help-id":"shadows",children:a.jsx(ie,{featureId:"lighting",groupFilter:"shadow_quality"})}),a.jsx(tt,{}),a.jsx("div",{className:"flex flex-col","data-help-id":"quality.steps quality.detail quality.fudge quality.threshold quality.metric quality.estimator quality.jitter quality.relaxation",children:o&&a.jsx(ie,{featureId:"quality",groupFilter:"kernel"})})]})},oh=({layer:e,state:n,histogramData:t,onChange:o,onRefresh:s,autoUpdate:i,onToggleAuto:r,liveModulations:l})=>{const c=w.useRef(!1),d=e===1?n.repeats:n.repeats2,f=e===1?n.phase:n.phase2,h=e===1?n.scale:n.scale2,p=e===1?n.offset:n.offset2,u=e===1?n.bias:n.bias2,m=e===1?n.gradient:n.gradient2,v=e===1?n.mode:n.mode2,y=e===1?"scale":"scale2",x=e===1?"offset":"offset2",g=e===1?"repeats":"repeats2",b=e===1?"phase":"phase2",M=e===1?"bias":"bias2",j=w.useRef(d),C=w.useRef(f),S=w.useRef(h),k=w.useRef(p),P=w.useRef(v);w.useEffect(()=>{if(v!==P.current){const T=Math.abs(h-S.current)>.001,L=Math.abs(p-k.current)>.001;!T&&!L&&(c.current=!0,i||s()),P.current=v}},[v,h,p,i,s]),w.useEffect(()=>{if(c.current&&t){const T=Er(t);if(T){const L=Lr(T.buckets,T.min,T.max);if(L){const D=L.end-L.start,A=Math.abs(D)<1e-4?1e-4:D,R=d/A,$=f-L.start*R;o({[y]:R,[x]:$}),c.current=!1}}}},[t,d,f,y,x,o]),w.useEffect(()=>{const T=Math.abs(d-j.current)>.001,L=Math.abs(f-C.current)>.001,D=Math.abs(h-S.current)>.001,A=Math.abs(p-k.current)>.001;if((T||L)&&!D&&!A){const R=Math.max(1e-4,h),O=Math.max(1e-4,j.current)/R,H=(C.current-p)/R,q=d/O,_=f-H*q;o({[y]:q,[x]:_})}j.current=d,C.current=f,S.current=h,k.current=p},[d,f,h,p,y,x,o]);const I=(f-p)/h,N=I+d/h;return a.jsxs("div",{className:"flex flex-col",children:[a.jsx(Nr,{data:t,min:I,max:N,gamma:u,repeats:d,phase:f,gradientStops:m,labelTitle:"Range",labelLeft:"Min",labelMid:"Bias",labelRight:"Max",onChange:({min:T,max:L,gamma:D})=>{const A=L-T,R=Math.abs(A)<1e-4?1e-4:A,$=d/R,O=f-T*$,H={[y]:$,[x]:O,[M]:D};o(H)},autoUpdate:i,onToggleAuto:r,onRefresh:s}),a.jsx(fe,{label:"Repeats",value:d,min:.1,max:100,step:.1,onChange:T=>o({[g]:T}),trackId:`coloring.${g}`,liveValue:l==null?void 0:l[`coloring.${g}`]}),a.jsx(fe,{label:"Phase",value:f,min:-1,max:1,step:.01,onChange:T=>o({[b]:T}),trackId:`coloring.${b}`,liveValue:l==null?void 0:l[`coloring.${b}`]})]})},rh=({sliceState:e,actions:n})=>{const t=e,o=t.hybridComplex,[s,i]=w.useState(!1),r=n.setGeometry,l=d=>{d.stopPropagation(),Y.emit("is_compiling","Optimizing Shader..."),setTimeout(()=>{r({hybridComplex:!0}),i(!1)},50)},c=d=>{d.preventDefault(),d.stopPropagation(),i(!0)};return a.jsxs("div",{className:"relative mt-2 pt-2 border-t border-white/5",children:[a.jsxs("div",{className:`transition-all duration-300 ${o?"":"opacity-30 blur-[0.5px] pointer-events-none grayscale"}`,children:[a.jsx("div",{className:"flex items-center gap-1 mb-1",children:a.jsx(ze,{variant:"secondary",children:"Advanced Mixing"})}),a.jsx(fe,{label:"Box Skip (Mod)",value:t.hybridSkip,min:1,max:8,step:1,onChange:d=>r({hybridSkip:d}),overrideInputText:Math.round(t.hybridSkip)<=1?"Consecutive":Math.round(t.hybridSkip)===2?"Every 2nd":`Every ${Math.round(t.hybridSkip)}th`,trackId:"geometry.hybridSkip"}),a.jsx("div",{className:"mt-1",children:a.jsx(Ke,{label:"Swap Order",value:t.hybridSwap,onChange:d=>r({hybridSwap:d})})})]}),!o&&!s&&a.jsx("div",{className:"absolute inset-0 cursor-pointer z-10 bg-gray-900/50 hover:bg-gray-800/40 transition-colors flex items-center justify-center group rounded",onClick:c,title:"Click to enable Advanced Hybrid Mode",children:a.jsx("div",{className:"text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity transform scale-75",children:a.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[a.jsx("rect",{x:"3",y:"11",width:"18",height:"11",rx:"2",ry:"2"}),a.jsx("path",{d:"M7 11V7a5 5 0 0 1 10 0v4"})]})})}),s&&a.jsxs("div",{className:"absolute top-[-20px] left-0 right-0 z-50 animate-pop-in",children:[a.jsxs("div",{className:"bg-black/95 border border-white/20 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.9)] backdrop-blur-md overflow-hidden cursor-pointer hover:border-cyan-500/50 transition-colors",onClick:l,children:[a.jsxs("div",{className:"flex items-start justify-between p-2 border-b border-white/10 bg-white/5",children:[a.jsxs("div",{className:"flex items-center gap-2 text-gray-300",children:[a.jsx(Yt,{}),a.jsx(ze,{children:"Advanced Shader"})]}),a.jsx("button",{onClick:d=>{d.stopPropagation(),i(!1)},className:"text-gray-500 hover:text-white -mt-0.5 -mr-0.5 p-1",children:a.jsx(jn,{})})]}),a.jsxs("div",{className:"p-3",children:[a.jsxs("p",{className:"text-[10px] text-gray-400 leading-relaxed mb-3",children:["Enable Advanced Hybrid Integration?",a.jsx("br",{}),"This allows ",a.jsx("strong",{children:"alternating formulas"})," between Box Folds and the Main Fractal.",a.jsx("br",{}),a.jsx("br",{}),a.jsx("span",{className:"text-orange-300",children:"Compilation may take 30-60 seconds."})]}),a.jsx("div",{className:"flex items-center justify-center p-1.5 bg-white/5 rounded border border-white/10 text-cyan-400 text-[9px] font-bold group-hover:bg-cyan-900/30 group-hover:text-cyan-200 group-hover:border-cyan-500/30 transition-all",children:"Click to Load"})]})]}),a.jsx("div",{className:"fixed inset-0 z-[-1]",onClick:d=>{d.stopPropagation(),i(!1)}})]})]})},sh=({actions:e,targetMode:n,label:t,activeLabel:o,helpText:s,variant:i="primary"})=>{const r=F(f=>f.interactionMode),{setInteractionMode:l}=e,c=r===n,d=()=>{l(c?"none":n)};return a.jsxs("div",{className:"flex flex-col animate-fade-in",children:[c&&s&&a.jsx("div",{className:"mb-px p-2 bg-green-900/30 border border-green-500/30 rounded text-[9px] text-green-200 animate-pulse text-center leading-tight",children:s}),a.jsx(Na,{onClick:d,label:c?o||"Cancel":t,variant:c?"success":i,fullWidth:!0})]})},ih=()=>a.jsxs("svg",{width:"13",height:"13",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"1.8",strokeLinecap:"round",strokeLinejoin:"round",children:[a.jsx("rect",{x:"3",y:"3",width:"18",height:"18",rx:"3"}),a.jsx("circle",{cx:"8.5",cy:"8.5",r:"1.2",fill:"currentColor",stroke:"none"}),a.jsx("circle",{cx:"15.5",cy:"8.5",r:"1.2",fill:"currentColor",stroke:"none"}),a.jsx("circle",{cx:"8.5",cy:"15.5",r:"1.2",fill:"currentColor",stroke:"none"}),a.jsx("circle",{cx:"15.5",cy:"15.5",r:"1.2",fill:"currentColor",stroke:"none"}),a.jsx("circle",{cx:"12",cy:"12",r:"1.2",fill:"currentColor",stroke:"none"})]}),lh=()=>{const e=w.useRef(null),n=w.useRef(0),t=w.useRef({x:0,y:0,z:0}),o=w.useRef(0),s=w.useRef({shift:!1,alt:!1}),i=w.useCallback(()=>{const c=(Date.now()-n.current)/1e3,d=.5*c*c+.1*c,f=Math.min(8,d),h=f-o.current;o.current=f;let p=1;s.current.shift?p=5:s.current.alt&&(p=.2);const u=h*p,m=t.current,v=F.getState().geometry;F.getState().setGeometry({juliaX:v.juliaX+m.x*u,juliaY:v.juliaY+m.y*u,juliaZ:v.juliaZ+m.z*u})},[]),r=w.useCallback(c=>{s.current={shift:c.shiftKey,alt:c.altKey},F.getState().handleInteractionStart("param");const f=Math.random()*2-1,h=Math.random()*2-1,p=Math.random()*2-1,u=Math.sqrt(f*f+h*h+p*p)||1;t.current={x:f/u,y:h/u,z:p/u},n.current=Date.now(),o.current=0,i(),e.current=setInterval(i,30)},[i]),l=w.useCallback(()=>{e.current&&(clearInterval(e.current),e.current=null),F.getState().handleInteractionEnd()},[]);return w.useEffect(()=>{const c=d=>{s.current={shift:d.shiftKey,alt:d.altKey}};return window.addEventListener("keydown",c),window.addEventListener("keyup",c),()=>{window.removeEventListener("keydown",c),window.removeEventListener("keyup",c),e.current&&clearInterval(e.current)}},[]),a.jsxs("button",{onPointerDown:r,onPointerUp:l,onPointerLeave:l,className:"w-full h-[26px] flex items-center justify-center gap-1.5 bg-white/[0.06] border-b border-white/5 hover:bg-cyan-500/10 text-gray-500 hover:text-cyan-300 transition-colors cursor-pointer select-none",title:"Hold to randomize — Shift: faster, Alt: slower",children:[a.jsx(ih,{}),a.jsx("span",{className:"text-[9px] font-medium",children:"Randomize"})]})};function Ba(e){const n=Ue.lazy(e);return t=>a.jsx(w.Suspense,{fallback:null,children:a.jsx(n,{...t})})}const ch=Ba(()=>Et(()=>import("./FlowEditor-Bc42YNsO.js"),__vite__mapDeps([10,1,2,4,11,3,5]),import.meta.url)),dh=Ba(()=>Et(()=>import("./AudioPanel-C5z2Gmrk.js"),__vite__mapDeps([12,1,2,13,4,3,5]),import.meta.url).then(e=>({default:e.AudioPanel}))),uh=Ba(()=>Et(()=>import("./AudioSpectrum-CGoPkt6J.js"),__vite__mapDeps([13,1,2,4,3,5]),import.meta.url).then(e=>({default:e.AudioSpectrum}))),hh=Ba(()=>Et(()=>import("./DebugToolsOverlay-CRHb67Bl.js"),__vite__mapDeps([14,3,1,2]),import.meta.url).then(e=>({default:e.DebugToolsOverlay}))),fh=e=>{const n=F(d=>d.histogramData),t=F(d=>d.histogramAutoUpdate),o=F(d=>d.setHistogramAutoUpdate),s=F(d=>d.refreshHistogram),i=F(d=>d.liveModulations),r=F(d=>d.registerHistogram),l=F(d=>d.unregisterHistogram);w.useEffect(()=>(r(),()=>l()),[r,l]);const c=d=>{const f=F.getState().setColoring;f&&f(d)};return a.jsx(oh,{layer:e.layer,state:e.sliceState,histogramData:n,onChange:c,onRefresh:s,autoUpdate:t,onToggleAuto:()=>o(!t),liveModulations:i})},ph=e=>{const n=F(o=>o.registerSceneHistogram),t=F(o=>o.unregisterSceneHistogram);return w.useEffect(()=>(n(),()=>t()),[n,t]),a.jsx(_u,{...e})},mh=()=>{ve.register("panel-drawing",xu),ve.register("overlay-drawing",Td),ve.register("panel-audio",dh),ve.register("overlay-lighting",Md),ve.register("overlay-webcam",Tu),ve.register("overlay-debug-tools",hh),ve.register("panel-engine",Eu),ve.register("panel-cameramanager",Ou),ve.register("panel-formula",Ju),ve.register("panel-scene",eh),ve.register("panel-light",th),ve.register("panel-shading",ah),ve.register("panel-gradients",ku),ve.register("panel-quality",nh),ve.register("panel-graph",ch),ve.register("coloring-histogram",fh),ve.register("hybrid-advanced-lock",rh),ve.register("interaction-picker",sh),ve.register("julia-randomize",lh),ve.register("audio-spectrum",uh),ve.register("audio-link-controls",Cu),ve.register("scene-histogram",ph),ve.register("optics-controls",Fu),ve.register("optics-dof-controls",Au),ve.register("navigation-controls",zu)};if("serviceWorker"in navigator)try{navigator.serviceWorker.getRegistrations().then(e=>{for(let n of e)n.unregister().then(()=>console.log("SW Unregistered"))}).catch(()=>{})}catch{console.debug("SW cleanup skipped")}mh();const Hr=document.getElementById("root");if(!Hr)throw new Error("Could not find root element to mount to");const gh=As.createRoot(Hr);gh.render(a.jsx(Ue.StrictMode,{children:a.jsx(mu,{})}));export{Ed as A,Na as B,jh as C,uu as D,kh as E,Y as F,Rh as G,ou as H,bu as I,ke as J,Xt as K,Eh as L,ot as M,kr as N,Cu as O,un as P,$a as Q,yt as R,fe as S,Ch as T,aa as U,Ph as V,Pl as W,sc as X,Ia as a,Dh as b,_h as c,Oh as d,Xl as e,Ah as f,st as g,zh as h,Ih as i,F as j,Za as k,Ye as l,fa as m,oe as n,ge as o,Th as p,me as q,qt as r,Fh as s,vt as t,le as u,et as v,Lh as w,Nh as x,Mh as y,$h as z};
