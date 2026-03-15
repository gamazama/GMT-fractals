const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./AdvancedGradientEditor-Dc8rOSEZ.js","./three-fiber-JXSTQjJZ.js","./three-jTU4HbbO.js","./three-drei-CUJowOh9.js","./pako-DwGzBETv.js","./Timeline-DOFveBWt.js","./mediabunny-ZLFd-dRz.js","./HelpBrowser-BgaAjYMk.js","./FormulaWorkshop-BdLIqU7H.js","./FlowEditor-C74uxH2S.js","./reactflow-CoTqlOXd.js","./AudioPanel-Ck7BBx41.js","./AudioSpectrum-M81OdFPw.js","./DebugToolsOverlay-CfMGpVXk.js"])))=>i.map(i=>d[i]);
var Mi=Object.defineProperty;var zi=(e,o,a)=>o in e?Mi(e,o,{enumerable:!0,configurable:!0,writable:!0,value:a}):e[o]=a;var J=(e,o,a)=>zi(e,typeof o!="symbol"?o+"":o,a);import{j as t,r as S,R as ze,u as la,a as ca,C as Ci}from"./three-fiber-JXSTQjJZ.js";import{a as Jo,r as jt,_ as ht,O as ki,b as ji}from"./three-drei-CUJowOh9.js";import{d as je,c as U,k as yt,Q as Te,l as tt,E as Pe,m as Oe,n as Pi,o as Ti,p as Qa,q as Ka,P as Ri,r as Ii,R as Ua,g as Ja,M as ga,j as er}from"./three-jTU4HbbO.js";import{p as eo}from"./pako-DwGzBETv.js";(function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))r(n);new MutationObserver(n=>{for(const s of n)if(s.type==="childList")for(const i of s.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&r(i)}).observe(document,{childList:!0,subtree:!0});function a(n){const s={};return n.integrity&&(s.integrity=n.integrity),n.referrerPolicy&&(s.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?s.credentials="include":n.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function r(n){if(n.ep)return;n.ep=!0;const s=a(n);fetch(n.href,s)}})();const Fi=e=>(o,a,r)=>{const n=r.subscribe;return r.subscribe=(i,l,c)=>{let d=i;if(l){const u=(c==null?void 0:c.equalityFn)||Object.is;let f=i(r.getState());d=p=>{const m=i(p);if(!u(f,m)){const x=f;l(f=m,x)}},c!=null&&c.fireImmediately&&l(f,f)}return n(d)},e(o,a,r)},tr=Fi,fe={UNIFORM:"uniform",CONFIG:"config",RESET_ACCUM:"reset_accum",OFFSET_SHIFT:"offset_shift",OFFSET_SET:"offset_set",CAMERA_ABSORB:"camera_absorb",CAMERA_SNAP:"camera_snap",CAMERA_TELEPORT:"camera_teleport",SHADER_CODE:"shader_code",IS_COMPILING:"is_compiling",COMPILE_TIME:"compile_time",COMPILE_ESTIMATE:"compile_estimate",BUCKET_STATUS:"bucket_status",BUCKET_IMAGE:"bucket_image",TRACK_FOCUS:"track_focus",TEXTURE:"texture",ENGINE_QUEUE:"engine_queue",REGISTER_FORMULA:"register_formula"};class _i{constructor(){J(this,"listeners",{})}on(o,a){return this.listeners[o]||(this.listeners[o]=[]),this.listeners[o].push(a),()=>this.off(o,a)}off(o,a){this.listeners[o]&&(this.listeners[o]=this.listeners[o].filter(r=>r!==a))}emit(o,a){this.listeners[o]&&this.listeners[o].forEach(r=>r(a))}}const Z=new _i,Ae={CameraPosition:"uCameraPosition",CamBasisX:"uCamBasisX",CamBasisY:"uCamBasisY",CamForward:"uCamForward",RegionMin:"uRegionMin",RegionMax:"uRegionMax",LightCount:"uLightCount",LightType:"uLightType",LightPos:"uLightPos",LightDir:"uLightDir",LightColor:"uLightColor",LightIntensity:"uLightIntensity",LightShadows:"uLightShadows",LightFalloff:"uLightFalloff",LightFalloffType:"uLightFalloffType",LightRadius:"uLightRadius",LightSoftness:"uLightSoftness",ModularParams:"uModularParams",HistogramLayer:"uHistogramLayer"},to=e=>{if(typeof window>"u")return!1;const o=new URLSearchParams(window.location.search);return o.has(e)&&o.get(e)!=="false"&&o.get(e)!=="0"},Di={Formula:{id:"Formula",location:"right",order:0,isCore:!0,isOpen:!0},Graph:{id:"Graph",location:"right",order:1,isCore:!0,isOpen:!1},Scene:{id:"Scene",location:"right",order:2,isCore:!0,isOpen:!1},Shader:{id:"Shader",location:"right",order:3,isCore:!0,isOpen:!1},Gradient:{id:"Gradient",location:"right",order:4,isCore:!0,isOpen:!1},Quality:{id:"Quality",location:"right",order:5,isCore:!0,isOpen:!1},Light:{id:"Light",location:"right",order:6,isCore:!1,isOpen:!1},Audio:{id:"Audio",location:"right",order:7,isCore:!1,isOpen:!1},Drawing:{id:"Drawing",location:"right",order:8,isCore:!1,isOpen:!1}},Li=(e,o)=>({showLightGizmo:!0,isGizmoDragging:!1,interactionMode:"none",focusLock:!1,histogramData:null,histogramAutoUpdate:!0,histogramTrigger:0,histogramLayer:0,histogramActiveCount:0,sceneHistogramData:null,sceneHistogramTrigger:0,sceneHistogramActiveCount:0,draggedLightIndex:null,autoCompile:!1,isUserInteracting:!1,advancedMode:!1,showHints:!0,debugMobileLayout:!1,invertY:!1,resolutionMode:"Full",fixedResolution:[800,600],isBroadcastMode:to("clean")||to("broadcast"),lockSceneOnSwitch:!1,exportIncludeScene:!1,isTimelineHovered:!1,tabSwitchCount:0,helpWindow:{visible:!1,activeTopicId:null},contextMenu:{visible:!1,x:0,y:0,items:[],targetHelpIds:[]},compositionOverlay:"none",compositionOverlaySettings:{opacity:.5,lineThickness:1,showCenterMark:!1,showSafeAreas:!1,color:"#FFFFFF",gridDivisionsX:4,gridDivisionsY:4,spiralRotation:0,spiralPositionX:.5,spiralPositionY:.5,spiralScale:1,spiralRatio:1.618033988749895},panels:Di,leftDockSize:320,rightDockSize:360,isLeftDockCollapsed:!0,isRightDockCollapsed:!1,draggingPanelId:null,dragSnapshot:null,activeLeftTab:null,activeRightTab:"Formula",workshopOpen:!1,workshopEditFormula:void 0,setShowLightGizmo:a=>e({showLightGizmo:a}),setGizmoDragging:a=>e({isGizmoDragging:a}),setInteractionMode:a=>e({interactionMode:a}),setFocusLock:a=>e({focusLock:a}),setHistogramData:a=>e({histogramData:a}),setHistogramAutoUpdate:a=>e({histogramAutoUpdate:a}),refreshHistogram:()=>e(a=>({histogramTrigger:a.histogramTrigger+1})),registerHistogram:()=>e(a=>({histogramActiveCount:a.histogramActiveCount+1})),unregisterHistogram:()=>e(a=>({histogramActiveCount:Math.max(0,a.histogramActiveCount-1)})),setHistogramLayer:a=>{o().histogramLayer!==a&&(e({histogramLayer:a}),Z.emit("uniform",{key:Ae.HistogramLayer,value:a}),e(r=>({histogramTrigger:r.histogramTrigger+1})))},setSceneHistogramData:a=>e({sceneHistogramData:a}),refreshSceneHistogram:()=>e(a=>({sceneHistogramTrigger:a.sceneHistogramTrigger+1})),registerSceneHistogram:()=>e(a=>({sceneHistogramActiveCount:a.sceneHistogramActiveCount+1})),unregisterSceneHistogram:()=>e(a=>({sceneHistogramActiveCount:Math.max(0,a.sceneHistogramActiveCount-1)})),setDraggedLight:a=>e({draggedLightIndex:a}),setAutoCompile:a=>e({autoCompile:a}),setAdvancedMode:a=>e({advancedMode:a}),setShowHints:a=>e({showHints:a}),setDebugMobileLayout:a=>e({debugMobileLayout:a}),setInvertY:a=>e({invertY:a}),setResolutionMode:a=>{e({resolutionMode:a}),Z.emit("reset_accum",void 0)},setFixedResolution:(a,r)=>{e({fixedResolution:[a,r]}),Z.emit("reset_accum",void 0)},setLockSceneOnSwitch:a=>e({lockSceneOnSwitch:a}),setExportIncludeScene:a=>e({exportIncludeScene:a}),setIsTimelineHovered:a=>e({isTimelineHovered:a}),incrementTabSwitchCount:()=>e(a=>({tabSwitchCount:a.tabSwitchCount+1})),setIsBroadcastMode:a=>e({isBroadcastMode:a}),openHelp:a=>e(r=>({helpWindow:{visible:!0,activeTopicId:a||r.helpWindow.activeTopicId},contextMenu:{...r.contextMenu,visible:!1}})),closeHelp:()=>e({helpWindow:{visible:!1,activeTopicId:null}}),openContextMenu:(a,r,n,s)=>e({contextMenu:{visible:!0,x:a,y:r,items:n,targetHelpIds:s||[]}}),closeContextMenu:()=>e(a=>({contextMenu:{...a.contextMenu,visible:!1}})),openWorkshop:a=>e({workshopOpen:!0,workshopEditFormula:a}),closeWorkshop:()=>e({workshopOpen:!1,workshopEditFormula:void 0}),movePanel:(a,r,n)=>e(s=>{var x,C;const i={...s.panels};i[a]||(i[a]={id:a,location:r,order:0,isCore:!1,isOpen:!0});const l=!0;let c=n;c===void 0&&(c=Object.values(i).filter(b=>b.location===r).length),(r==="left"||r==="right")&&Object.values(i).forEach(y=>{y.location===r&&y.id!==a&&(y.isOpen=!1)});let d=i[a].floatPos;r==="float"&&!d&&(d={x:window.innerWidth/2-150,y:window.innerHeight/2-200}),i[a]={...i[a],location:r,order:c,isOpen:l,floatPos:d};const u=r==="left"?a:((x=Object.values(i).find(y=>y.location==="left"&&y.isOpen))==null?void 0:x.id)||null,f=r==="right"?a:((C=Object.values(i).find(y=>y.location==="right"&&y.isOpen))==null?void 0:C.id)||null,p=r==="left"?!1:s.isLeftDockCollapsed,m=r==="right"?!1:s.isRightDockCollapsed;return{panels:i,activeLeftTab:u,activeRightTab:f,isLeftDockCollapsed:p,isRightDockCollapsed:m}}),reorderPanel:(a,r)=>e(n=>{const s={...n.panels},i=s[a],l=s[r];if(!i||!l)return{};i.location!==l.location&&(i.location=l.location,i.isOpen=!1);const c=l.location,d=Object.values(s).filter(m=>m.location===c).sort((m,x)=>m.order-x.order),u=d.findIndex(m=>m.id===a),f=d.findIndex(m=>m.id===r);if(u===-1||f===-1)return{};const[p]=d.splice(u,1);return d.splice(f,0,p),d.forEach((m,x)=>{s[m.id]={...s[m.id],order:x}}),{panels:s}}),togglePanel:(a,r)=>e(n=>{var u,f;const s={...n.panels};if(!s[a])return{};const i=s[a],l=r!==void 0?r:!i.isOpen;if(i.location==="float")i.isOpen=l;else if(l){if(Object.values(s).forEach(p=>{p.location===i.location&&p.id!==a&&(p.isOpen=!1)}),i.isOpen=!0,i.location==="left")return{panels:s,activeLeftTab:a,isLeftDockCollapsed:!1};if(i.location==="right")return{panels:s,activeRightTab:a,isRightDockCollapsed:!1}}else i.isOpen=!1;const c=((u=Object.values(s).find(p=>p.location==="left"&&p.isOpen))==null?void 0:u.id)||null,d=((f=Object.values(s).find(p=>p.location==="right"&&p.isOpen))==null?void 0:f.id)||null;return{panels:s,activeLeftTab:c,activeRightTab:d}}),setDockSize:(a,r)=>e({[a==="left"?"leftDockSize":"rightDockSize"]:r}),setDockCollapsed:(a,r)=>e({[a==="left"?"isLeftDockCollapsed":"isRightDockCollapsed"]:r}),setFloatPosition:(a,r,n)=>e(s=>({panels:{...s.panels,[a]:{...s.panels[a],floatPos:{x:r,y:n}}}})),setFloatSize:(a,r,n)=>e(s=>({panels:{...s.panels,[a]:{...s.panels[a],floatSize:{width:r,height:n}}}})),startPanelDrag:a=>e(r=>({draggingPanelId:a,dragSnapshot:JSON.parse(JSON.stringify(r.panels))})),endPanelDrag:()=>e({draggingPanelId:null,dragSnapshot:null}),cancelPanelDrag:()=>e(a=>a.dragSnapshot?{panels:a.dragSnapshot,draggingPanelId:null,dragSnapshot:null}:{draggingPanelId:null}),setActiveTab:a=>o().togglePanel(a,!0),floatTab:a=>o().movePanel(a,"float"),dockTab:a=>o().movePanel(a,"right"),setCompositionOverlay:a=>e({compositionOverlay:a}),setCompositionOverlaySettings:a=>e(r=>({compositionOverlaySettings:{...r.compositionOverlaySettings,...a}}))}),Ei=()=>typeof window>"u"?!1:window.matchMedia&&window.matchMedia("(pointer: coarse)").matches||window.innerWidth<768,Ai=(e,o)=>({dpr:Ei()?1:Math.min(typeof window<"u"&&window.devicePixelRatio||1,2),aaLevel:1,msaaSamples:1,aaMode:"Always",accumulation:!0,previewMode:!1,renderMode:"Direct",isPaused:!1,sampleCap:256,isExporting:!1,renderRegion:null,isBucketRendering:!1,bucketSize:128,bucketUpscale:1,convergenceThreshold:.1,samplesPerBucket:64,setDpr:a=>{e({dpr:a}),Z.emit("reset_accum",void 0)},setAALevel:a=>{e({aaLevel:a});const{aaMode:r}=o();(r==="Always"||r==="Auto")&&e({dpr:a}),Z.emit("reset_accum",void 0)},setMSAASamples:a=>{e({msaaSamples:a});const{aaMode:r}=o();r==="Always"||r==="Auto"?Z.emit("config",{msaaSamples:a}):Z.emit("config",{msaaSamples:1}),Z.emit("reset_accum",void 0)},setAAMode:a=>{e({aaMode:a});const{aaLevel:r,msaaSamples:n}=o();a==="Off"?(e({dpr:1}),Z.emit("config",{msaaSamples:1})):(e({dpr:r}),Z.emit("config",{msaaSamples:n})),Z.emit("reset_accum",void 0)},setAccumulation:a=>{e({accumulation:a}),Z.emit("reset_accum",void 0)},setPreviewMode:a=>{e({previewMode:a}),Z.emit("config",{previewMode:a})},setRenderMode:a=>{e({renderMode:a});const r=a==="PathTracing"?1:0,n=o().setLighting;n&&n({renderMode:r})},setIsPaused:a=>e({isPaused:a}),setSampleCap:a=>e({sampleCap:a}),setRenderRegion:a=>{e({renderRegion:a});const r=a?new je(a.minX,a.minY):new je(0,0),n=a?new je(a.maxX,a.maxY):new je(1,1);Z.emit("uniform",{key:Ae.RegionMin,value:r}),Z.emit("uniform",{key:Ae.RegionMax,value:n}),Z.emit("reset_accum",void 0)},setIsBucketRendering:a=>{e({isBucketRendering:a})},setBucketSize:a=>e({bucketSize:a}),setBucketUpscale:a=>e({bucketUpscale:a}),setConvergenceThreshold:a=>e({convergenceThreshold:a}),setSamplesPerBucket:a=>e({samplesPerBucket:a}),setIsExporting:a=>e({isExporting:a})}),ar=new Uint32Array(256);for(let e=0;e<256;e++){let o=e;for(let a=0;a<8;a++)o=o&1?3988292384^o>>>1:o>>>1;ar[e]=o}const Ni=e=>{let o=-1;for(let a=0;a<e.length;a++)o=o>>>8^ar[(o^e[a])&255];return(o^-1)>>>0},Bi=new TextEncoder,ao=new TextDecoder,Oi=e=>{const o=new Uint8Array(e.length);for(let a=0;a<e.length;a++)o[a]=e.charCodeAt(a);return o},Zt=e=>{let o="";for(let a=0;a<e.length;a++)o+=String.fromCharCode(e[a]);return o},oo=(e,o,a)=>{e[o]=a>>>24&255,e[o+1]=a>>>16&255,e[o+2]=a>>>8&255,e[o+3]=a&255},or=async(e,o,a)=>{const r=await e.arrayBuffer(),n=new Uint8Array(r);if(n[0]!==137||n[1]!==80||n[2]!==78||n[3]!==71)throw new Error("Not a valid PNG");const s=Oi(o),i=Bi.encode(a),l=s.length+1+1+1+1+1+i.length,c=12+l,d=new Uint8Array(c);oo(d,0,l),d[4]=105,d[5]=84,d[6]=88,d[7]=116;let u=8;d.set(s,u),u+=s.length,d[u++]=0,d[u++]=0,d[u++]=0,d[u++]=0,d[u++]=0,d.set(i,u);const f=Ni(d.slice(4,c-4));oo(d,c-4,f);let p=8;for(;p<n.length;){const x=n[p]<<24|n[p+1]<<16|n[p+2]<<8|n[p+3];if(Zt(n.slice(p+4,p+8))==="IEND")break;p+=12+x}const m=new Uint8Array(n.length+c);return m.set(n.slice(0,p),0),m.set(d,p),m.set(n.slice(p),p+c),new Blob([m],{type:"image/png"})},rr=async(e,o)=>{const a=await e.arrayBuffer(),r=new Uint8Array(a);if(r[0]!==137||r[1]!==80)return null;let n=8;for(;n<r.length;){const s=r[n]<<24|r[n+1]<<16|r[n+2]<<8|r[n+3],i=Zt(r.slice(n+4,n+8));if(i==="iTXt"){const l=r.slice(n+8,n+8+s);let c=-1;for(let d=0;d<l.length;d++)if(l[d]===0){c=d;break}if(c!==-1&&Zt(l.slice(0,c))===o){let u=c+1+1+1;for(;u<l.length&&l[u]!==0;)u++;for(u++;u<l.length&&l[u]!==0;)u++;return u++,ao.decode(l.slice(u))}}if(i==="tEXt"){const l=r.slice(n+8,n+8+s);let c=-1;for(let d=0;d<l.length;d++)if(l[d]===0){c=d;break}if(c!==-1&&Zt(l.slice(0,c))===o)return ao.decode(l.slice(c+1))}if(i==="IEND")break;n+=12+s}return null};let Fa=null;function $i(e){Fa=e}class Hi{constructor(){J(this,"_worker",null);J(this,"_shadow",{isBooted:!1,isCompiling:!1,hasCompiledShader:!1,isPaused:!1,dirty:!1,lastCompileDuration:0,lastMeasuredDistance:10,accumulationCount:0,frameCount:0,sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0}});J(this,"_localOffset",{x:0,y:0,z:0,xL:0,yL:0,zL:0});J(this,"_offsetGuarded",!1);J(this,"_offsetGuardTimer",null);J(this,"_onCompiling",null);J(this,"_onCompileTime",null);J(this,"_onShaderCode",null);J(this,"_onBootedCallback",null);J(this,"_pendingSnapshots",new Map);J(this,"_pendingPicks",new Map);J(this,"_pendingFocusPicks",new Map);J(this,"_pendingHistograms",new Map);J(this,"_pendingShaderSource",new Map);J(this,"_gpuInfo","");J(this,"_lastGeneratedFrag","");J(this,"modulations",{});J(this,"_isBucketRendering",!1);J(this,"_isExporting",!1);J(this,"_exportReady",null);J(this,"_exportFrameDone",null);J(this,"_exportComplete",null);J(this,"_exportError",null);J(this,"_container",null);J(this,"_lastInitArgs",null);J(this,"_onCrash",null);J(this,"_bootSent",!1)}setWorkerModePending(){}initWorkerMode(o,a,r,n,s,i,l){if(this._worker)return;this._container=o.parentElement,this._lastInitArgs={config:a,width:r,height:n,dpr:s,isMobile:i,initialCamera:l};const c=o.transferControlToOffscreen();this._worker=new Worker(new URL(""+new URL("renderWorker-CVIWoD9L.js",import.meta.url).href,import.meta.url),{type:"module"}),this._worker.onmessage=u=>{this._handleWorkerMessage(u.data)},this._worker.onerror=u=>{console.error("[WorkerProxy] Worker error:",u),this._handleWorkerCrash("Worker error: "+(u.message||"unknown"))};const d={type:"INIT",canvas:c,width:r,height:n,dpr:s,isMobile:i,initialConfig:a,initialCamera:l};this._worker.postMessage(d,[c])}restart(o,a){if(!this._container||!this._lastInitArgs)return;this._worker&&(this._worker.onmessage=null,this._worker.onerror=null,this._worker.terminate(),this._worker=null),this._shadow={isBooted:!1,isCompiling:!1,hasCompiledShader:!1,isPaused:!1,dirty:!1,lastCompileDuration:0,lastMeasuredDistance:10,accumulationCount:0,frameCount:0,sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0}};const r=this._container.querySelector("canvas");r&&r.remove();const{width:n,height:s,dpr:i,isMobile:l}=this._lastInitArgs,c=document.createElement("canvas");c.width=n*i,c.height=s*i,c.style.cssText="position:absolute;inset:0;width:100%;height:100%;pointer-events:none",this._container.appendChild(c),this._lastInitArgs={...this._lastInitArgs,config:o,initialCamera:a};const d=c.transferControlToOffscreen();this._worker=new Worker(new URL(""+new URL("renderWorker-CVIWoD9L.js",import.meta.url).href,import.meta.url),{type:"module"}),this._worker.onmessage=f=>{this._handleWorkerMessage(f.data)},this._worker.onerror=f=>{console.error("[WorkerProxy] Worker error:",f),this._handleWorkerCrash("Worker error: "+(f.message||"unknown"))};const u={type:"INIT",canvas:d,width:n,height:s,dpr:i,isMobile:l,initialConfig:o,initialCamera:a};this._worker.postMessage(u,[d])}set onCompiling(o){this._onCompiling=o}set onCompileTime(o){this._onCompileTime=o}set onShaderCode(o){this._onShaderCode=o}_handleWorkerMessage(o){switch(o.type){case"READY":break;case"FRAME_READY":if(o.state)if(this._shadow=o.state,this._offsetGuarded){const a=o.state.sceneOffset,r=this._localOffset;Math.abs(a.x+a.xL-(r.x+r.xL))+Math.abs(a.y+a.yL-(r.y+r.yL))+Math.abs(a.z+a.zL-(r.z+r.zL))<.001&&(this._offsetGuarded=!1,this._offsetGuardTimer&&(clearTimeout(this._offsetGuardTimer),this._offsetGuardTimer=null))}else this._localOffset={...o.state.sceneOffset};Fa&&Fa();break;case"COMPILING":this._shadow.isCompiling=!!o.status,this._shadow.hasCompiledShader=!o.status||this._shadow.hasCompiledShader,this._onCompiling&&this._onCompiling(o.status),Z.emit(fe.IS_COMPILING,o.status);break;case"COMPILE_TIME":o.duration&&(this._shadow.lastCompileDuration=o.duration),this._onCompileTime&&this._onCompileTime(o.duration),Z.emit(fe.COMPILE_TIME,o.duration);break;case"SHADER_CODE":this._lastGeneratedFrag=o.code,this._onShaderCode&&this._onShaderCode(o.code),Z.emit(fe.SHADER_CODE,o.code);break;case"SHADER_SOURCE_RESULT":{const a=this._pendingShaderSource.get(o.id);a&&(a(o.code),this._pendingShaderSource.delete(o.id));break}case"BOOTED":this._shadow.isBooted=!0,o.gpuInfo&&(this._gpuInfo=o.gpuInfo),this._onBootedCallback&&this._onBootedCallback();break;case"GPU_INFO":this._gpuInfo=o.info;break;case"HISTOGRAM_RESULT":{const a=this._pendingHistograms.get(o.id);a&&(a(o.data),this._pendingHistograms.delete(o.id));break}case"SNAPSHOT_RESULT":{const a=this._pendingSnapshots.get(o.id);a&&(a(o.blob),this._pendingSnapshots.delete(o.id));break}case"PICK_RESULT":{const a=this._pendingPicks.get(o.id);a&&(a(o.position?new U(o.position[0],o.position[1],o.position[2]):null),this._pendingPicks.delete(o.id));break}case"FOCUS_RESULT":{const a=this._pendingFocusPicks.get(o.id);a&&(a(o.distance),this._pendingFocusPicks.delete(o.id));break}case"ERROR":console.error("[WorkerProxy] Worker error:",o.message);break;case"EXPORT_READY":this._exportReady&&this._exportReady();break;case"EXPORT_FRAME_DONE":this._shadow.lastMeasuredDistance=o.measuredDistance,this._exportFrameDone&&this._exportFrameDone({frameIndex:o.frameIndex,progress:o.progress,measuredDistance:o.measuredDistance});break;case"EXPORT_COMPLETE":this._isExporting=!1,this._exportComplete&&this._exportComplete(o.blob??null);break;case"EXPORT_ERROR":this._isExporting=!1,console.error("[WorkerProxy] Export error:",o.message),this._exportError&&this._exportError(o.message);break;case"BUCKET_STATUS":this._isBucketRendering=o.isRendering,Z.emit(fe.BUCKET_STATUS,{isRendering:o.isRendering,progress:o.progress,totalBuckets:o.totalBuckets,currentBucket:o.currentBucket});break;case"BUCKET_IMAGE":this._handleBucketImage(o);break}}post(o,a){this._worker&&(a?this._worker.postMessage(o,a):this._worker.postMessage(o))}set onCrash(o){this._onCrash=o}set onBooted(o){this._onBootedCallback=o}_handleWorkerCrash(o){console.error(`[WorkerProxy] Worker crashed: ${o}. Terminating worker.`),this._worker&&(this._worker.terminate(),this._worker=null),this._pendingSnapshots.forEach(a=>a(null)),this._pendingSnapshots.clear(),this._pendingPicks.forEach(a=>a(null)),this._pendingPicks.clear(),this._pendingFocusPicks.forEach(a=>a(-1)),this._pendingFocusPicks.clear(),this._pendingHistograms.forEach(a=>a(new Float32Array(0))),this._pendingHistograms.clear(),this._onCrash&&this._onCrash(o)}terminateWorker(){this._handleWorkerCrash("Manual termination")}get isBooted(){return this._shadow.isBooted}get isCompiling(){return this._shadow.isCompiling}get isExporting(){return this._isExporting}get isBucketRendering(){return this._isBucketRendering}get sceneOffset(){return this._localOffset}get lastGeneratedFrag(){return this._lastGeneratedFrag}get accumulationCount(){return this._shadow.accumulationCount}get frameCount(){return this._shadow.frameCount}get lastCompileDuration(){return this._shadow.lastCompileDuration}get lastMeasuredDistance(){return this._shadow.lastMeasuredDistance}set lastMeasuredDistance(o){this._shadow.lastMeasuredDistance=o}get hasCompiledShader(){return this._shadow.hasCompiledShader}get dirty(){return this._shadow.dirty}set dirty(o){o&&this.post({type:"SET_DIRTY"})}get isPaused(){return this._shadow.isPaused}set isPaused(o){this.post({type:"PAUSE",paused:o})}get shouldSnapCamera(){return!1}set shouldSnapCamera(o){o&&this.post({type:"SNAP_CAMERA"})}get isGizmoInteracting(){return!1}set isGizmoInteracting(o){}get isCameraInteracting(){return!1}set isCameraInteracting(o){o&&this.post({type:"MARK_INTERACTION"})}bootWithConfig(o,a){if(this._bootSent){console.log("[WorkerProxy] Boot already in progress — restarting worker"),this._bootSent=!1,this.restart(o,a),this.post({type:"BOOT",config:o,camera:a}),this._bootSent=!0;return}this.post({type:"BOOT",config:o,camera:a}),this._bootSent=!0}setUniform(o,a,r=!1){this.post({type:"UNIFORM",key:o,value:a,noReset:r})}setPreviewSampleCap(o){this.post({type:"SET_SAMPLE_CAP",n:o})}resetAccumulation(){this.post({type:"RESET_ACCUM"})}markInteraction(){this.post({type:"MARK_INTERACTION"})}updateTexture(o,a){if(a){const r=a.indexOf(";base64,"),n=r>=0?a.substring(r+8,r+12):"";a.startsWith("data:image/vnd.radiance")||a.startsWith("data:image/x-hdr")||n.startsWith("Iz8")||n.startsWith("Iz9")?fetch(a).then(i=>i.arrayBuffer()).then(i=>{this.post({type:"TEXTURE_HDR",textureType:o,buffer:i},[i])}).catch(i=>console.error("[WorkerProxy] HDR texture transfer failed:",i)):fetch(a).then(i=>i.blob()).then(i=>createImageBitmap(i,{premultiplyAlpha:"none",imageOrientation:"flipY"})).then(i=>{this.post({type:"TEXTURE",textureType:o,bitmap:i},[i])}).catch(i=>console.error("[WorkerProxy] Texture transfer failed:",i))}else this.post({type:"TEXTURE",textureType:o,bitmap:null})}setShadowOffset(o){this._localOffset={...o},this._offsetGuarded=!0,this._offsetGuardTimer&&clearTimeout(this._offsetGuardTimer),this._offsetGuardTimer=setTimeout(()=>{this._offsetGuarded=!1,this._offsetGuardTimer=null},2e3)}applyOffsetShift(o,a,r){}resolveLightPosition(o,a){return o}measureDistanceAtScreenPoint(o,a,r,n){return this._shadow.lastMeasuredDistance}pickWorldPosition(o,a,r){if(!r)return null;const n=crypto.randomUUID();return new Promise(s=>{this._pendingPicks.set(n,s),this.post({type:"PICK_WORLD_POSITION",id:n,x:o,y:a}),setTimeout(()=>{this._pendingPicks.has(n)&&(this._pendingPicks.delete(n),s(null))},5e3)})}startFocusPick(o,a){const r=crypto.randomUUID();return new Promise(n=>{this._pendingFocusPicks.set(r,n),this.post({type:"FOCUS_PICK_START",id:r,x:o,y:a}),setTimeout(()=>{this._pendingFocusPicks.has(r)&&(this._pendingFocusPicks.delete(r),n(-1))},5e3)})}sampleFocusPick(o,a){const r=crypto.randomUUID();return new Promise(n=>{this._pendingFocusPicks.set(r,n),this.post({type:"FOCUS_PICK_SAMPLE",id:r,x:o,y:a}),setTimeout(()=>{this._pendingFocusPicks.has(r)&&(this._pendingFocusPicks.delete(r),n(-1))},2e3)})}endFocusPick(){this.post({type:"FOCUS_PICK_END"})}captureSnapshot(){const o=crypto.randomUUID();return new Promise(a=>{this._pendingSnapshots.set(o,a),this.post({type:"CAPTURE_SNAPSHOT",id:o}),setTimeout(()=>{this._pendingSnapshots.has(o)&&(this._pendingSnapshots.delete(o),a(null))},1e4)})}get gpuInfo(){return this._gpuInfo||"Generic WebGL Device"}requestHistogramReadback(o){const a=crypto.randomUUID();return new Promise(r=>{this._pendingHistograms.set(a,r),this.post({type:"HISTOGRAM_READBACK",id:a,source:o}),setTimeout(()=>{this._pendingHistograms.has(a)&&(this._pendingHistograms.delete(a),r(new Float32Array(0)))},5e3)})}getCompiledFragmentShader(){const o=crypto.randomUUID();return new Promise(a=>{this._pendingShaderSource.set(o,a),this.post({type:"GET_SHADER_SOURCE",id:o,variant:"compiled"}),setTimeout(()=>{this._pendingShaderSource.has(o)&&(this._pendingShaderSource.delete(o),a(null))},5e3)})}getTranslatedFragmentShader(){const o=crypto.randomUUID();return new Promise(a=>{this._pendingShaderSource.set(o,a),this.post({type:"GET_SHADER_SOURCE",id:o,variant:"translated"}),setTimeout(()=>{this._pendingShaderSource.has(o)&&(this._pendingShaderSource.delete(o),a(null))},5e3)})}checkHalfFloatAlphaSupport(){return!0}sendRenderTick(o,a,r,n){this.post({type:"RENDER_TICK",camera:o,offset:a,delta:r,timestamp:performance.now(),renderState:n})}resizeWorker(o,a,r){this.post({type:"RESIZE",width:o,height:a,dpr:r})}sendConfig(o){this.post({type:"CONFIG",config:o})}registerFormula(o,a){this.post({type:"REGISTER_FORMULA",id:o,shader:a})}startExport(o,a){return this._isExporting=!0,new Promise((r,n)=>{this._exportReady=()=>{this._exportReady=null,r()},this._exportError=l=>{this._exportError=null,n(new Error(l))};let s=null;if(a){const l=a;s=new WritableStream({write(c){return l.write(c)},close(){return l.close()},abort(c){return l.abort(c)}})}const i=[];s&&i.push(s),this.post({type:"EXPORT_START",config:o,stream:s},i),setTimeout(()=>{this._exportReady&&(this._exportReady=null,n(new Error("Export start timed out")))},1e4)})}renderExportFrame(o,a,r,n,s,i){return new Promise(l=>{this._exportFrameDone=c=>{this._exportFrameDone=null,l(c)},this.post({type:"EXPORT_RENDER_FRAME",frameIndex:o,time:a,camera:r,offset:n,renderState:s,modulations:i})})}finishExport(){return new Promise((o,a)=>{this._exportComplete=r=>{this._exportComplete=null,o(r)},this._exportError=r=>{this._exportError=null,a(new Error(r))},this.post({type:"EXPORT_FINISH"}),setTimeout(()=>{this._exportComplete&&(this._exportComplete=null,a(new Error("Export finish timed out")))},6e4)})}cancelExport(){this.post({type:"EXPORT_CANCEL"}),this._isExporting=!1}startBucketRender(o,a,r){this._isBucketRendering=!0,this.post({type:"BUCKET_START",exportImage:o,config:a,exportData:r?{preset:JSON.stringify(r.preset),name:r.name,version:r.version}:void 0})}stopBucketRender(){this.post({type:"BUCKET_STOP"}),this._isBucketRendering=!1}async _handleBucketImage(o){const{pixels:a,width:r,height:n,presetJson:s,filename:i}=o,l=document.createElement("canvas");l.width=r,l.height=n;const c=l.getContext("2d");if(!c)return;const d=new ImageData(new Uint8ClampedArray(a.buffer),r,n);c.putImageData(d,0,0),l.toBlob(async u=>{if(u)try{const f=await or(u,"FractalData",s),p=URL.createObjectURL(f),m=document.createElement("a");m.download=i,m.href=p,m.click(),URL.revokeObjectURL(p)}catch(f){console.error("Failed to inject metadata",f);const p=document.createElement("a");p.download=i,p.href=l.toDataURL("image/png"),p.click()}},"image/png")}}let xa=null;function ue(){return xa||(xa=new Hi),xa}class Gi{constructor(){J(this,"definitions",new Map)}register(o){this.definitions.set(o.id,o)}registerAlias(o,a){const r=this.definitions.get(a);r?this.definitions.set(o,r):console.warn(`FractalRegistry: Cannot register alias '${o}' for unknown target '${a}'`)}get(o){return this.definitions.get(o)}getAll(){return Array.from(new Set(this.definitions.values()))}getIds(){return Array.from(this.definitions.keys())}}const ge=new Gi;class ke{constructor(o={x:0,y:0,z:0,xL:0,yL:0,zL:0}){J(this,"offset");J(this,"_rotMatrix",new yt);J(this,"_camRight",new U);J(this,"_camUp",new U);J(this,"_camForward",new U);J(this,"_visualVector",new U);J(this,"_quatInverse",new Te);J(this,"_relativePos",new U);J(this,"smoothedPos",new U);J(this,"smoothedQuat",new Te);J(this,"smoothedFov",60);J(this,"prevOffsetState");J(this,"isLocked",!1);J(this,"isFirstFrame",!0);this.offset={...o},this.prevOffsetState={...o}}get state(){return{...this.offset}}set state(o){this.offset={...o},ke.normalize(this.offset)}static split(o){const a=Math.fround(o),r=o-a;return{high:a,low:r}}static normalize(o){if(Math.abs(o.xL)>.5){const r=Math.floor(o.xL+.5);o.x+=r,o.xL-=r}if(Math.abs(o.yL)>.5){const r=Math.floor(o.yL+.5);o.y+=r,o.yL-=r}if(Math.abs(o.zL)>.5){const r=Math.floor(o.zL+.5);o.z+=r,o.zL-=r}}setFromUnified(o,a,r){const n=ke.split(o),s=ke.split(a),i=ke.split(r);this.offset.x=n.high,this.offset.xL=n.low,this.offset.y=s.high,this.offset.yL=s.low,this.offset.z=i.high,this.offset.zL=i.low,ke.normalize(this.offset)}move(o,a,r){this.offset.xL+=o,this.offset.yL+=a,this.offset.zL+=r,ke.normalize(this.offset)}absorbCamera(o){this.offset.xL+=o.x,this.offset.yL+=o.y,this.offset.zL+=o.z,ke.normalize(this.offset)}resetSmoothing(){this.isFirstFrame=!0,this.prevOffsetState={...this.offset},this.isLocked=!1}updateSmoothing(o,a,r,n,s,i){if(!i&&!s&&!this.isFirstFrame){this.smoothedPos.copy(o.position),this.smoothedQuat.copy(o.quaternion),this.smoothedFov=a,this.prevOffsetState={...this.offset},this.isLocked=!0;return}if(this.isFirstFrame||s){this.smoothedPos.copy(o.position),this.smoothedQuat.copy(o.quaternion),this.smoothedFov=a,this.prevOffsetState={...this.offset},this.isFirstFrame=!1,this.isLocked=!1;return}const l=this.offset,c=this.prevOffsetState;if(c.x!==l.x||c.y!==l.y||c.z!==l.z||c.xL!==l.xL||c.yL!==l.yL||c.zL!==l.zL){const d=c.x-l.x+(c.xL-l.xL),u=c.y-l.y+(c.yL-l.yL),f=c.z-l.z+(c.zL-l.zL);if(Math.abs(d)>10||Math.abs(u)>10||Math.abs(f)>10){this.resetSmoothing(),this.smoothedPos.copy(o.position),this.smoothedQuat.copy(o.quaternion);return}this.smoothedPos.x+=d,this.smoothedPos.y+=u,this.smoothedPos.z+=f,this.prevOffsetState={...l}}if(n)this.smoothedPos.copy(o.position),this.smoothedQuat.copy(o.quaternion),this.smoothedFov=a,this.prevOffsetState={...this.offset};else{const d=this.smoothedPos.distanceToSquared(o.position);if(this.isLocked?d>1e-18&&(this.isLocked=!1):d<1e-21&&(this.isLocked=!0),this.isLocked)this.smoothedPos.copy(o.position);else{const u=1-Math.exp(-40*r);this.smoothedPos.lerp(o.position,u)}this.smoothedQuat.copy(o.quaternion),this.smoothedFov=a}}getUnifiedCameraState(o,a){const r={...this.offset};return r.xL+=o.position.x,r.yL+=o.position.y,r.zL+=o.position.z,ke.normalize(r),{position:{x:0,y:0,z:0},rotation:{x:o.quaternion.x,y:o.quaternion.y,z:o.quaternion.z,w:o.quaternion.w},sceneOffset:r,targetDistance:a>0?a:3.5}}applyCameraState(o,a){if(a.sceneOffset){const d={...a.sceneOffset};d.xL+=a.position.x,d.yL+=a.position.y,d.zL+=a.position.z,this.state=d}const r=a.rotation,n=r.x??r._x??0,s=r.y??r._y??0,i=r.z??r._z??0,l=r.w??r._w??1;o.position.set(0,0,0),o.quaternion.set(n,s,i,l).normalize();const c=new U(0,1,0).applyQuaternion(o.quaternion);o.up.copy(c),o.updateMatrixWorld(),this.resetSmoothing(),this.smoothedPos.set(0,0,0),this.smoothedQuat.copy(o.quaternion)}updateShaderUniforms(o,a,r){const n=this.offset.x+this.offset.xL+o.x,s=this.offset.y+this.offset.yL+o.y,i=this.offset.z+this.offset.zL+o.z,l=Math.fround(n),c=Math.fround(s),d=Math.fround(i);a.set(l,c,d),r.set(n-l,s-c,i-d)}updateCameraBasis(o,a,r){const n=o;this._rotMatrix.makeRotationFromQuaternion(n.quaternion);const s=this._rotMatrix.elements;this._camRight.set(s[0],s[1],s[2]),this._camUp.set(s[4],s[5],s[6]),this._camForward.set(-s[8],-s[9],-s[10]);let i=1,l=1;r&&r.isOrtho?(l=r.orthoScale/2,i=l*n.aspect):(l=Math.tan(tt.degToRad(n.fov)*.5),i=l*n.aspect),a[Ae.CamBasisX].value.copy(this._camRight).multiplyScalar(i),a[Ae.CamBasisY].value.copy(this._camUp).multiplyScalar(l),a[Ae.CamForward].value.copy(this._camForward),a[Ae.CameraPosition].value.set(0,0,0)}getLightShaderVector(o,a,r,n){const s=this.offset;a?(this._relativePos.set(o.x,o.y,o.z).applyQuaternion(r.quaternion),n.copy(this._relativePos)):n.set(o.x-(s.x+s.xL)-r.position.x,o.y-(s.y+s.yL)-r.position.y,o.z-(s.z+s.zL)-r.position.z)}resolveRealWorldPosition(o,a,r){const n=this.offset;return a?(this._visualVector.set(o.x,o.y,o.z).applyQuaternion(r.quaternion),{x:r.position.x+this._visualVector.x+(n.x+n.xL),y:r.position.y+this._visualVector.y+(n.y+n.yL),z:r.position.z+this._visualVector.z+(n.z+n.zL)}):(this._visualVector.set(o.x-(n.x+n.xL)-r.position.x,o.y-(n.y+n.yL)-r.position.y,o.z-(n.z+n.zL)-r.position.z),this._quatInverse.copy(r.quaternion).invert(),this._visualVector.applyQuaternion(this._quatInverse),{x:this._visualVector.x,y:this._visualVector.y,z:this._visualVector.z})}resolveRealWorldRotation(o,a,r){const n=new U(0,0,-1).applyEuler(new Pe(o.x,o.y,o.z,"YXZ"));a?n.applyQuaternion(r.quaternion):n.applyQuaternion(r.quaternion.clone().invert());const s=new Te().setFromUnitVectors(new U(0,0,-1),n),i=new Pe().setFromQuaternion(s,"YXZ");return{x:i.x,y:i.y,z:i.z}}}const Vi="useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";let Qe=(e=21)=>{let o="",a=crypto.getRandomValues(new Uint8Array(e|=0));for(;e--;)o+=Vi[a[e]&63];return o};const ve=ue(),Ui={id:"cam_main",label:"Main Camera",position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0,w:1},sceneOffset:{x:0,y:0,z:3.5,xL:0,yL:0,zL:0},targetDistance:3.5,optics:{camType:0,camFov:60,orthoScale:2,dofStrength:0,dofFocus:10}},Wi=(e,o)=>({cameraMode:"Orbit",sceneOffset:{x:0,y:0,z:1,xL:0,yL:0,zL:-.24751033974403658},cameraPos:{x:0,y:0,z:0},cameraRot:{x:0,y:0,z:0,w:1},targetDistance:3.5,undoStack:[],redoStack:[],savedCameras:[Ui],activeCameraId:"cam_main",setCameraMode:a=>e({cameraMode:a}),setSceneOffset:a=>{const r={x:a.x,y:a.y,z:a.z,xL:a.xL||0,yL:a.yL||0,zL:a.zL||0};ve.virtualSpace?(ve.virtualSpace.state=r,e({sceneOffset:ve.virtualSpace.state}),Z.emit("offset_set",ve.virtualSpace.state)):(e({sceneOffset:r}),Z.emit("offset_set",r))},addCamera:a=>{const r=o();let n;ve.activeCamera&&ve.virtualSpace?n=ve.virtualSpace.getUnifiedCameraState(ve.activeCamera,ve.lastMeasuredDistance):n={position:r.cameraPos,rotation:r.cameraRot,sceneOffset:r.sceneOffset,targetDistance:r.targetDistance};const s={...r.optics},i=a||`Camera ${r.savedCameras.length+1}`,l={id:Qe(),label:i,position:n.position,rotation:n.rotation,sceneOffset:n.sceneOffset,targetDistance:n.targetDistance,optics:s};e(c=>({savedCameras:[...c.savedCameras,l],activeCameraId:l.id}))},updateCamera:(a,r)=>{e(n=>({savedCameras:n.savedCameras.map(s=>s.id===a?{...s,...r}:s)}))},deleteCamera:a=>{e(r=>({savedCameras:r.savedCameras.filter(s=>s.id!==a),activeCameraId:r.activeCameraId===a?null:r.activeCameraId}))},selectCamera:a=>{const r=o(),n=r.activeCameraId;if(n&&ve.activeCamera&&ve.virtualSpace){const l=ve.virtualSpace.getUnifiedCameraState(ve.activeCamera,ve.lastMeasuredDistance);r.savedCameras.some(c=>c.id===n)&&e(c=>({savedCameras:c.savedCameras.map(d=>d.id===n?{...d,position:l.position,rotation:l.rotation,sceneOffset:l.sceneOffset,targetDistance:l.targetDistance}:d)}))}if(a===null){e({activeCameraId:null});return}const i=o().savedCameras.find(l=>l.id===a);if(i){if(Z.emit("camera_teleport",i),e({activeCameraId:a,cameraPos:i.position,cameraRot:i.rotation,sceneOffset:i.sceneOffset,targetDistance:i.targetDistance||3.5}),i.optics){const l=r.setOptics;l&&l(i.optics)}ve.resetAccumulation()}},resetCamera:()=>{e({activeCameraId:null});const a=o().formula,r=ge.get(a),n=r==null?void 0:r.defaultPreset,s=(n==null?void 0:n.sceneOffset)||{x:0,y:0,z:0,xL:0,yL:0,zL:0},i=(n==null?void 0:n.cameraPos)||{x:0,y:0,z:3.5},l=(n==null?void 0:n.cameraRot)||{x:0,y:0,z:0,w:1},c=(n==null?void 0:n.targetDistance)||3.5,d=s.x+s.xL+i.x,u=s.y+s.yL+i.y,f=s.z+s.zL+i.z,p=ke.split(d),m=ke.split(u),x=ke.split(f),C={x:p.high,y:m.high,z:x.high,xL:p.low,yL:m.low,zL:x.low};o().setSceneOffset(C),e({cameraPos:{x:0,y:0,z:0},cameraRot:l,targetDistance:c});const y={position:{x:0,y:0,z:0},rotation:l,sceneOffset:C,targetDistance:c};Z.emit("reset_accum",void 0),Z.emit("camera_teleport",y)},undoCamera:()=>{const{undoStack:a,redoStack:r}=o();if(a.length===0)return;const n=a[a.length-1];let s;if(ve.activeCamera&&ve.virtualSpace)s=ve.virtualSpace.getUnifiedCameraState(ve.activeCamera,o().targetDistance),ve.virtualSpace.applyCameraState(ve.activeCamera,n);else{const i=o();s={position:i.cameraPos,rotation:i.cameraRot,sceneOffset:i.sceneOffset,targetDistance:i.targetDistance}}n.sceneOffset&&e({sceneOffset:n.sceneOffset}),e({cameraPos:n.position,cameraRot:n.rotation,targetDistance:n.targetDistance||3.5,redoStack:[...r,s],undoStack:a.slice(0,-1)}),Z.emit("reset_accum",void 0),Z.emit("camera_teleport",n)},redoCamera:()=>{const{undoStack:a,redoStack:r}=o();if(r.length===0)return;const n=r[r.length-1];let s;if(ve.activeCamera&&ve.virtualSpace)s=ve.virtualSpace.getUnifiedCameraState(ve.activeCamera,o().targetDistance),ve.virtualSpace.applyCameraState(ve.activeCamera,n);else{const i=o();s={position:i.cameraPos,rotation:i.cameraRot,sceneOffset:i.sceneOffset,targetDistance:i.targetDistance}}n.sceneOffset&&e({sceneOffset:n.sceneOffset}),e({cameraPos:n.position,cameraRot:n.rotation,targetDistance:n.targetDistance||3.5,undoStack:[...a,s],redoStack:r.slice(0,-1)}),Z.emit("reset_accum",void 0),Z.emit("camera_teleport",n)}});class qi{constructor(){J(this,"features",new Map)}register(o){this.features.set(o.id,o)}get(o){return this.features.get(o)}getAll(){return Array.from(this.features.values())}getTabs(){return Array.from(this.features.values()).filter(o=>o.tabConfig).map(o=>({id:o.id,...o.tabConfig})).sort((o,a)=>o.order-a.order)}getViewportOverlays(){return Array.from(this.features.values()).filter(o=>o.viewportConfig).map(o=>({id:o.id,...o.viewportConfig}))}getMenuFeatures(){return Array.from(this.features.values()).filter(o=>o.menuConfig).map(o=>({id:o.id,...o.menuConfig}))}getExtraMenuItems(){const o=[];return this.features.forEach(a=>{a.menuItems&&a.menuItems.forEach(r=>o.push({...r,featureId:a.id}))}),o}getEngineFeatures(){return Array.from(this.features.values()).filter(o=>!!o.engineConfig)}getDictionary(){const o={formula:"f",cameraPos:"cp",cameraRot:"cr",sceneOffset:"so",targetDistance:"td",animations:"an",sequence:"sq",features:{_alias:"p",children:{}}};return this.features.forEach(a=>{const r=a.shortId||a.id,n={};Object.entries(a.params).forEach(([s,i])=>{i.shortId&&(n[s]=i.shortId)}),o.features.children[a.id]={_alias:r,children:n}}),o}getUniformDefinitions(){const o=[];return this.features.forEach(a=>{Object.values(a.params).forEach(r=>{if(r.uniform){let n=r.type,s=r.default;n==="color"&&(n="vec3"),n==="boolean"&&(n="float",s=s?1:0),(n==="image"||n==="gradient")&&(n="sampler2D",s=null),o.push({name:r.uniform,type:n,default:s})}}),a.extraUniforms&&o.push(...a.extraUniforms)}),o}}const ie=new qi,Xi=ue(),Yi=e=>{const o={formula:e.formula,pipeline:e.pipeline,renderRegion:e.renderRegion?{...e.renderRegion}:null};return ie.getAll().forEach(r=>{const n=e[r.id];n&&(o[r.id]=JSON.parse(JSON.stringify(n)))}),o},ro=(e,o,a)=>{const r=a();o(e),Object.keys(e).forEach(n=>{const s=n,i=e[s];if(s==="formula"){Z.emit("config",{formula:i});return}const l="set"+s.charAt(0).toUpperCase()+s.slice(1);if(typeof r[l]=="function"){r[l](i);return}if(s==="pipeline"){r.setPipeline(i);return}if(s==="graph"){r.setGraph(i);return}const c="set"+s.charAt(0).toUpperCase()+s.slice(1);typeof r[c]=="function"&&!ie.get(s)&&r[c](i)}),Xi.resetAccumulation()},Zi=1500;let io=0;const Qi=(e,o)=>({paramUndoStack:[],paramRedoStack:[],interactionSnapshot:null,handleInteractionStart:a=>{if(e({isUserInteracting:!0}),a&&typeof a=="object"&&a.position){const n=a,s=Date.now();s-io<Zi&&o().undoStack.length>0||(e(l=>({undoStack:[...l.undoStack,n],redoStack:[]})),io=s);return}const r=Yi(o());e({interactionSnapshot:r})},handleInteractionEnd:()=>{e({isUserInteracting:!1});const{interactionSnapshot:a,aaMode:r,aaLevel:n,msaaSamples:s,dpr:i}=o();let l=r==="Auto"||r==="Always"?n:1;if(Math.abs(i-l)>1e-4&&(e({dpr:l}),Z.emit("config",{msaaSamples:r==="Auto"||r==="Always"?s:1}),Z.emit("reset_accum",void 0)),!a)return;const c=o(),d={};let u=!1;Object.keys(a).forEach(f=>{const p=f,m=a[p],x=c[p];JSON.stringify(m)!==JSON.stringify(x)&&(d[p]=m,u=!0)}),e(u?f=>({paramUndoStack:[...f.paramUndoStack,d],paramRedoStack:[],interactionSnapshot:null}):{interactionSnapshot:null})},undoParam:()=>{const{paramUndoStack:a,paramRedoStack:r}=o();if(a.length===0)return;const n=a[a.length-1],s=a.slice(0,-1),i=o(),l={};Object.keys(n).forEach(c=>{l[c]=i[c]}),ro(n,e,o),e({paramUndoStack:s,paramRedoStack:[...r,l]})},redoParam:()=>{const{paramUndoStack:a,paramRedoStack:r}=o();if(r.length===0)return;const n=r[r.length-1],s=r.slice(0,-1),i=o(),l={};Object.keys(n).forEach(c=>{l[c]=i[c]}),ro(n,e,o),e({paramUndoStack:[...a,l],paramRedoStack:s})},resetParamHistory:()=>{e({paramUndoStack:[],paramRedoStack:[],interactionSnapshot:null})}}),no=`
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
`,Ki=`
    #ifdef GLOW_FAST
        if (accAlpha > 0.0001) {
            vec3 p_fractal_res = applyPrecisionOffset(p + uCameraPosition, uSceneOffsetLow, uSceneOffsetHigh);
            // Tint the accumulated intensity by the color at the hit point
            vec3 glowCol = getGlowColor(p_fractal_res, h);
            
            // Prevent blowout
            accColor += glowCol * min(accAlpha, 100.0);
        }
    #endif
`,Ji={id:"atmosphere",shortId:"at",name:"Atmosphere",category:"Rendering",engineConfig:{toggleParam:"glowEnabled",mode:"compile",label:"Volumetric Glow",groupFilter:"engine_settings"},params:{glowEnabled:{type:"boolean",default:!0,label:"Enable Glow",shortId:"ge",group:"main",hidden:!0,noReset:!0,onUpdate:"compile"},glowQuality:{type:"float",default:0,label:"Glow Algo",shortId:"gq",group:"engine_settings",options:[{label:"Accurate (Vector)",value:0},{label:"Fast (Scalar)",value:1}],description:"Vector accumulates color per-step. Scalar accumulates intensity only (faster).",onUpdate:"compile",noReset:!0},fogIntensity:{type:"float",default:0,label:"Fog Intensity",shortId:"fi",uniform:"uFogIntensity",min:0,max:1,step:.01,group:"fog"},fogNear:{type:"float",default:0,label:"Fog Start",shortId:"fn",uniform:"uFogNear",min:0,max:10,step:.1,scale:"square",group:"fog",parentId:"fogIntensity",condition:{gt:0}},fogFar:{type:"float",default:5,label:"Fog End",shortId:"ff",uniform:"uFogFar",min:0,max:10,step:.1,scale:"square",group:"fog",parentId:"fogIntensity",condition:{gt:0}},fogColor:{type:"color",default:new Oe(0,0,0),label:"Fog Color",shortId:"fc",uniform:"uFogColor",group:"fog",parentId:"fogIntensity",condition:{gt:0}},fogDensity:{type:"float",default:.01,label:"Fog Density",shortId:"fd",uniform:"uFogDensity",min:.001,max:5,step:.01,scale:"log",group:"fog",parentId:"fogIntensity",condition:{gt:0},description:"Basic volumetric fog absorption density. For god rays and scatter, enable Volumetric Scattering in Engine."},glowIntensity:{type:"float",default:0,label:"Glow Strength",shortId:"gi",uniform:"uGlowIntensity",min:0,max:5,step:.01,scale:"log",group:"glow",condition:{param:"glowEnabled",bool:!0}},glowSharpness:{type:"float",default:50,label:"Tightness",shortId:"gs",uniform:"uGlowSharpness",min:1,max:1e3,step:1,scale:"log",group:"glow",parentId:"glowIntensity",condition:[{gt:0},{param:"glowEnabled",bool:!0}]},glowMode:{type:"boolean",default:!0,label:"Glow Source",shortId:"gm",uniform:"uGlowMode",group:"glow",parentId:"glowIntensity",condition:[{gt:0},{param:"glowEnabled",bool:!0}],options:[{label:"Surface",value:!1},{label:"Color",value:!0}]},glowColor:{type:"color",default:new Oe(1,1,1),label:"Glow Color",shortId:"gl",uniform:"uGlowColor",group:"glow",parentId:"glowMode",condition:[{bool:!0},{param:"glowEnabled",bool:!0}]}},inject:(e,o,a)=>{if(a!=="Main")return;const r=o.atmosphere;r&&r.glowEnabled&&(r.glowQuality>.5?(e.addDefine("GLOW_FAST","1"),e.addVolumeLogic(no,Ki)):e.addVolumeLogic(no,""))}},en=`
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
`,tn={id:"droste",shortId:"dr",name:"Droste Effect",category:"Effects",params:{active:{type:"boolean",default:!1,label:"Enable Droste",shortId:"ac",uniform:"uDrosteActive",group:"main",noReset:!0},tiling:{type:"float",default:1,label:"Tiling Mode",shortId:"tm",uniform:"uDrosteTiling",group:"geometry",noReset:!0,condition:{param:"active",bool:!0},options:[{label:"Repeat",value:0},{label:"Mirror",value:1},{label:"Clamp",value:2},{label:"Transparent",value:3}]},center:{type:"vec2",default:new je(0,0),label:"Center Shift",shortId:"cs",uniform:"uDrosteCenter",min:-100,max:100,step:.1,group:"geometry",condition:{param:"active",bool:!0},noReset:!0},radiusInside:{type:"float",default:5,label:"Inner Rad",shortId:"r1",uniform:"uDrosteR1",min:.1,max:100,step:.1,group:"geometry",layout:"half",condition:{param:"active",bool:!0},noReset:!0},radiusOutside:{type:"float",default:100,label:"Outer Rad",shortId:"r2",uniform:"uDrosteR2",min:1,max:200,step:.1,group:"geometry",layout:"half",condition:{param:"active",bool:!0},noReset:!0},periodicity:{type:"float",default:2,label:"Periodicity",shortId:"p1",uniform:"uDrostePeriodicity",min:-10,max:10,step:.1,group:"structure",condition:[{param:"active",bool:!0},{param:"autoPeriodicity",bool:!1}],noReset:!0},strands:{type:"float",default:2,label:"Strands",shortId:"p2",uniform:"uDrosteStrands",min:-12,max:12,step:1,group:"structure",condition:{param:"active",bool:!0},noReset:!0},autoPeriodicity:{type:"boolean",default:!1,label:"Auto Period",shortId:"ap",uniform:"uDrosteAuto",group:"structure",condition:{param:"active",bool:!0},noReset:!0},strandMirror:{type:"boolean",default:!1,label:"Mirror Strand",shortId:"sm",uniform:"uDrosteMirror",group:"structure",condition:{param:"active",bool:!0},noReset:!0},zoom:{type:"float",default:0,label:"Zoom",shortId:"zm",uniform:"uDrosteZoom",min:-10,max:10,step:.1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},rotate:{type:"float",default:0,label:"Spiral Rotate",shortId:"ro",uniform:"uDrosteRotate",min:-360,max:360,step:1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},rotateSpin:{type:"float",default:0,label:"Image Spin",shortId:"sp",uniform:"uDrosteSpin",min:-360,max:360,step:1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},rotatePolar:{type:"float",default:0,label:"Polar Rotate",shortId:"pr",uniform:"uDrostePolar",min:-360,max:360,step:1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},twist:{type:"boolean",default:!0,label:"Twist (Conformal)",shortId:"tw",uniform:"uDrosteTwist",group:"transform",condition:{param:"active",bool:!0},noReset:!0},hyperDroste:{type:"boolean",default:!1,label:"Hyper Droste",shortId:"hd",uniform:"uDrosteHyper",group:"transform",condition:{param:"active",bool:!0},noReset:!0},fractalPoints:{type:"float",default:1,label:"Fractal Points",shortId:"fp",uniform:"uDrosteFractal",min:0,max:10,step:1,group:"transform",condition:[{param:"active",bool:!0},{param:"hyperDroste",bool:!0}],noReset:!0}},postShader:{functions:en,mainUV:`
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
        `}},an={id:"postEffects",shortId:"pe",name:"Post Effects",category:"Post Process",params:{bloomIntensity:{type:"float",default:0,label:"Bloom",shortId:"bi",uniform:"uBloomIntensity",min:0,max:5,step:.01,group:"bloom",noReset:!0,format:e=>{const o=e;return o===0?"0.0 (off)":o.toFixed(3)}},bloomThreshold:{type:"float",default:.25,label:"Threshold",shortId:"bt",uniform:"uBloomThreshold",min:0,max:2,step:.01,group:"bloom",parentId:"bloomIntensity",condition:{gt:0},noReset:!0},bloomRadius:{type:"float",default:7,label:"Spread",shortId:"br",uniform:"uBloomRadius",min:.5,max:7,step:.1,group:"bloom",parentId:"bloomIntensity",condition:{gt:0},noReset:!0},caStrength:{type:"float",default:0,label:"Chromatic Aberration",shortId:"ca",uniform:"uCAStrength",min:0,max:10,step:.01,group:"lens",noReset:!0,format:e=>{const o=e;return o===0?"0.0 (off)":o.toFixed(3)}}},postShader:{uniforms:"uniform sampler2D uBloomTexture;",functions:`
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
        `}},on=`
// ------------------------------------------------------------------
// ENVIRONMENT MAP
// ------------------------------------------------------------------

vec3 GetEnvMap(vec3 dir, float roughness) {
    // 1. Apply Rotation (CPU Optimized: uEnvRotationMatrix)
    if (abs(uEnvRotation) > 0.001) {
        dir.xz = uEnvRotationMatrix * dir.xz;
    }

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
`,rn=`
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
`,nn=`
    // EnvStrength scaling for Direct Render Mode
    #ifdef RENDER_MODE_PATHTRACING
        #define uEnvStrength uEnvStrengthSlider
    #else
        #define uEnvStrength (uEnvStrengthSlider * 0.33)
    #endif
`,sn={id:"materials",shortId:"m",name:"Material",category:"Rendering",tabConfig:{label:"Shader",componentId:"panel-shading",order:40},params:{diffuse:{type:"float",default:1,label:"Diffuse (Color)",shortId:"di",uniform:"uDiffuse",min:0,max:2,step:.01,group:"surface"},reflection:{type:"float",default:0,label:"Metallic",shortId:"re",uniform:"uReflection",min:0,max:1,step:.01,group:"surface"},specular:{type:"float",default:.3,label:"Reflectivity",shortId:"sp",uniform:"uSpecular",min:0,max:2,step:.01,group:"surface"},roughness:{type:"float",default:.5,label:"Roughness",shortId:"ro",uniform:"uRoughness",min:.001,max:1,step:.001,group:"surface"},rim:{type:"float",default:0,label:"Rim Light",shortId:"ri",uniform:"uRim",min:0,max:10,step:.01,scale:"log",group:"surface"},rimExponent:{type:"float",default:4,label:"Rim Sharpness",shortId:"rx",uniform:"uRimExponent",min:1,max:16,step:.1,group:"surface",parentId:"rim",condition:{gt:0}},envStrength:{type:"float",default:0,label:"Environment Light",shortId:"es",uniform:"uEnvStrengthSlider",min:0,max:5,step:.01,group:"env"},envBackgroundStrength:{type:"float",default:0,label:"BG Visibility",shortId:"eb",uniform:"uEnvBackgroundStrength",min:0,max:2,step:.01,group:"env",parentId:"envStrength",condition:{gt:0,param:"envStrength"}},envSource:{type:"float",default:1,label:"Source",shortId:"eo",uniform:"uEnvSource",group:"env",parentId:"envStrength",condition:{gt:0,param:"envStrength"},options:[{label:"Sky Image",value:0},{label:"Gradient",value:1}]},envMapData:{type:"image",default:null,label:"Upload Texture",shortId:"et",group:"env",parentId:"envSource",condition:{eq:0},uniform:"uEnvMapTexture",textureSettings:{mapping:Ti,minFilter:Pi,generateMipmaps:!0},linkedParams:{colorSpace:"envMapColorSpace"}},envMapColorSpace:{type:"float",default:0,label:"Env Profile",shortId:"ec",uniform:"uEnvMapColorSpace",group:"env",hidden:!0},useEnvMap:{type:"boolean",default:!1,label:"Use Env Map",shortId:"eu",uniform:"uUseEnvMap",hidden:!0,group:"env"},envRotation:{type:"float",default:0,label:"Rotation",shortId:"er",uniform:"uEnvRotation",min:0,max:6.28,step:.01,group:"env",condition:[{param:"envStrength",gt:0},{param:"envSource",eq:0}]},envGradientStops:{type:"gradient",default:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],label:"Sky Gradient",shortId:"eg",uniform:"uEnvGradient",group:"env",parentId:"envSource",condition:{eq:1}},emission:{type:"float",default:0,label:"Self-illumination",shortId:"em",uniform:"uEmission",min:0,max:5,step:.001,scale:"square",group:"emission"},emissionMode:{type:"float",default:0,label:"Emission Source",shortId:"ec",uniform:"uEmissionMode",min:0,max:4,step:1,group:"emission",parentId:"emission",condition:{gt:1e-4},options:[{label:"Full Surface",value:0},{label:"Layer 1",value:1},{label:"Layer 2",value:2},{label:"Layer 3",value:3},{label:"Solid Color",value:4}]},emissionColor:{type:"color",default:new Oe(1,1,1),label:"Solid Color",shortId:"el",uniform:"uEmissionColor",group:"emission",parentId:"emissionMode",condition:{eq:4}},ptEmissionMult:{type:"float",default:1,label:"Illumination Power",shortId:"ep",uniform:"uPTEmissionMult",min:0,max:10,step:.1,group:"emission",parentId:"emission",condition:[{gt:1e-4},{param:"$renderMode",eq:"PathTracing"}]}},inject:e=>{e.addHeader(nn),e.addMaterialLogic(rn),e.addFunction(on)}},ln={id:"colorGrading",shortId:"cg",name:"Color Grading",category:"Post Process",customUI:[{componentId:"scene-histogram",group:"grading",condition:{param:"active",bool:!0}}],params:{toneMapping:{type:"float",default:0,label:"Tone Mapping",shortId:"tm",uniform:"uToneMapping",group:"grading",noReset:!0,options:[{label:"ACES",value:0},{label:"AgX",value:1},{label:"Reinhard",value:2},{label:"Neutral",value:3},{label:"None",value:4}]},active:{type:"boolean",default:!1,label:"Color Correction",shortId:"ac",uniform:"uGradingActive",group:"grading",noReset:!0},saturation:{type:"float",default:1,label:"Saturation",shortId:"sa",uniform:"uSaturation",min:0,max:2,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0},levelsMin:{type:"float",default:0,label:"Black Point",shortId:"ln",uniform:"uLevelsMin",min:0,max:1,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0,hidden:!0},levelsMax:{type:"float",default:1,label:"White Point",shortId:"lx",uniform:"uLevelsMax",min:0,max:2,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0,hidden:!0},levelsGamma:{type:"float",default:1,label:"Gamma",shortId:"lg",uniform:"uLevelsGamma",min:.1,max:3,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0,hidden:!0}},postShader:{functions:`
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
        `}},cn={id:"texturing",shortId:"tx",name:"Texture",category:"Coloring",params:{active:{type:"boolean",default:!1,label:"Use Texture",shortId:"ac",uniform:"uUseTexture",group:"main",hidden:!0},layer1Data:{type:"image",default:null,label:"Select Image",shortId:"id",group:"main",uniform:"uTexture",textureSettings:{wrapS:Ka,wrapT:Ka,minFilter:Qa,magFilter:Qa},linkedParams:{colorSpace:"colorSpace"}},colorSpace:{type:"float",default:0,label:"Color Profile",shortId:"cs",uniform:"uTextureColorSpace",group:"main",hidden:!0},mapU:{type:"float",default:6,label:"U",shortId:"mu",uniform:"uTextureModeU",group:"mapping",layout:"half",options:[{label:"Orbit Trap",value:0},{label:"Iterations",value:1},{label:"Radial",value:2},{label:"Z-Depth",value:3},{label:"Angle",value:4},{label:"Normal",value:5},{label:"Decomposition",value:6},{label:"Raw Iterations",value:7},{label:"Potential (Log-Log)",value:8},{label:"Green's Flow",value:9}]},mapV:{type:"float",default:1,label:"V",shortId:"mv",uniform:"uTextureModeV",group:"mapping",layout:"half",options:[{label:"Orbit Trap",value:0},{label:"Iterations",value:1},{label:"Radial",value:2},{label:"Z-Depth",value:3},{label:"Angle",value:4},{label:"Normal",value:5},{label:"Decomposition",value:6},{label:"Raw Iterations",value:7},{label:"Potential (Log-Log)",value:8},{label:"Green's Flow",value:9}]},textureScale:{type:"vec2",default:new je(1,1),label:"Scale UV",shortId:"ts",uniform:"uTextureScale",min:.1,max:500,step:.1,scale:"log",group:"transform"},offset:{type:"vec2",default:new je(0,0),label:"Texture Offset",shortId:"of",uniform:"uTextureOffset",min:-2,max:2,step:.01,group:"transform"}}},ir=[{value:0,label:"Orbit Trap",description:"Colors based on how close the orbit came to the origin or geometric traps.",glsl:"v = log(max(1.0e-5, result.y)) * -0.2;"},{value:1,label:"Iterations",description:"Smooth gradients based on how long it took to escape. The classic look.",glsl:`
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
        `},{value:10,label:"Orbit X (YZ plane)",description:"Per-component orbit trap: closest approach to the YZ plane (abs x).",glsl:"v = log(max(1.0e-5, g_orbitTrap.x)) * -0.2;"},{value:11,label:"Orbit Y (XZ plane)",description:"Per-component orbit trap: closest approach to the XZ plane (abs y).",glsl:"v = log(max(1.0e-5, g_orbitTrap.y)) * -0.2;"},{value:12,label:"Orbit Z (XY plane)",description:"Per-component orbit trap: closest approach to the XY plane (abs z).",glsl:"v = log(max(1.0e-5, g_orbitTrap.z)) * -0.2;"},{value:13,label:"Orbit W (Origin)",description:"Per-component orbit trap: closest squared distance to the origin.",glsl:"v = log(max(1.0e-5, g_orbitTrap.w)) * -0.2;"}],dn=()=>{let e=`
    float getMappingValue(float mode, vec3 p, vec4 result, vec3 n, float repeatScale) {
        float v = 0.0;
        
        // Mode Selection Ladder
    `;return ir.forEach((o,a)=>{const r=a===0,n=`if (mode < ${o.value}.5)`,s=`
        ${r?n:"else "+n} {
            // ${o.label}
            ${o.glsl}
        }`;e+=s}),e+=`
        // Fallback
        else {
            v = result.z;
        }

        // Safety Clamp
        if (v < -1.0e10 || v > 1.0e10) return 0.0;
        return v;
    }
    `,e},so=ir.map(e=>({label:e.label,value:e.value})),un={id:"coloring",shortId:"cl",name:"Coloring",category:"Visuals",tabConfig:{label:"Gradient",componentId:"panel-gradients",order:50},customUI:[{componentId:"coloring-histogram",group:"layer1_hist",props:{layer:1}},{componentId:"coloring-histogram",group:"layer2_hist",props:{layer:2}}],params:{gradient:{type:"gradient",default:[{id:"2",position:1,color:"#ffffff",bias:.5,interpolation:"linear"}],label:"Gradient",shortId:"g1",uniform:"uGradientTexture",group:"layer1_grad"},mode:{type:"float",default:0,label:"Mapping",shortId:"m1",uniform:"uColorMode",group:"layer1_top",options:so},scale:{type:"float",default:1,label:"Scale",shortId:"s1",uniform:"uColorScale",group:"layer1_hist",hidden:!0},offset:{type:"float",default:0,label:"Offset",shortId:"o1",uniform:"uColorOffset",group:"layer1_hist",hidden:!0},repeats:{type:"float",default:1,label:"Repeats",shortId:"r1",min:.1,max:100,step:.1,group:"layer1_hist",hidden:!0},phase:{type:"float",default:0,label:"Phase",shortId:"p1",min:-1,max:1,step:.01,group:"layer1_hist",hidden:!0},bias:{type:"float",default:1,label:"Gamma",shortId:"b1",uniform:"uGradientBias",min:.1,max:10,step:.01,group:"layer1_hist",hidden:!0},twist:{type:"float",default:0,label:"Twist",shortId:"w1",uniform:"uColorTwist",min:-5,max:5,step:.1,group:"layer1_bottom"},escape:{type:"float",default:4,label:"Escape Radius",shortId:"e1",uniform:"uEscapeThresh",min:1,max:1e3,step:.1,scale:"log",group:"layer1_bottom",condition:{or:[{param:"mode",eq:6},{param:"mode",eq:8},{param:"mode",eq:9},{param:"mode2",eq:6},{param:"mode2",eq:8},{param:"mode2",eq:9},{and:[{param:"$texturing.active",bool:!0},{or:[{param:"$texturing.mapU",eq:6},{param:"$texturing.mapU",eq:8},{param:"$texturing.mapU",eq:9},{param:"$texturing.mapV",eq:6},{param:"$texturing.mapV",eq:8},{param:"$texturing.mapV",eq:9}]}]}]}},gradient2:{type:"gradient",default:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}],label:"Gradient 2",shortId:"g2",uniform:"uGradientTexture2",group:"layer2_grad"},mode2:{type:"float",default:4,label:"Mapping",shortId:"m2",uniform:"uColorMode2",group:"layer2_top",options:so},scale2:{type:"float",default:1,label:"Scale 2",shortId:"s2",uniform:"uColorScale2",group:"layer2_hist",hidden:!0},offset2:{type:"float",default:0,label:"Offset 2",shortId:"o2",uniform:"uColorOffset2",group:"layer2_hist",hidden:!0},repeats2:{type:"float",default:1,label:"Repeats",shortId:"r2",min:.1,max:100,step:.1,group:"layer2_hist",hidden:!0},phase2:{type:"float",default:0,label:"Phase",shortId:"p2",min:-1,max:1,step:.01,group:"layer2_hist",hidden:!0},bias2:{type:"float",default:1,label:"Gamma",shortId:"b2",uniform:"uGradientBias2",min:.1,max:10,step:.01,group:"layer2_hist",hidden:!0},twist2:{type:"float",default:0,label:"Twist",shortId:"w2",uniform:"uColorTwist2",min:-5,max:5,step:.1,group:"layer2_bottom"},blendMode:{type:"float",default:0,label:"Blend Mode",shortId:"bm",uniform:"uBlendMode",group:"layer2_bottom",options:[{label:"Mix",value:0},{label:"Add",value:1},{label:"Multiply",value:2},{label:"Overlay",value:3},{label:"Screen",value:4},{label:"Bump (Normal)",value:6}]},blendOpacity:{type:"float",default:0,label:"Blend Amount",shortId:"bo",uniform:"uBlendOpacity",min:0,max:1,step:.01,group:"layer2_bottom"},layer3Color:{type:"color",default:new Oe(1,1,1),label:"Noise Color",shortId:"n3c",uniform:"uLayer3Color",group:"noise",layout:"embedded"},layer3Scale:{type:"float",default:2,label:"Noise Scale",shortId:"n3s",uniform:"uLayer3Scale",min:.1,max:2e3,step:.1,scale:"log",group:"noise"},layer3Strength:{type:"float",default:0,label:"Mix Strength",shortId:"n3a",uniform:"uLayer3Strength",min:0,max:1,step:.01,group:"noise"},layer3Bump:{type:"float",default:0,label:"Bump",shortId:"n3b",uniform:"uLayer3Bump",min:-1,max:1,step:.01,group:"noise"},layer3Turbulence:{type:"float",default:0,label:"Turbulence",shortId:"n3t",uniform:"uLayer3Turbulence",min:0,max:2,step:.01,group:"noise"},layer3Enabled:{type:"boolean",default:!0,label:"Load Noise (Layer 3)",shortId:"l3e",group:"engine_settings",ui:"checkbox",description:"Compiles simplex noise into the shader. Disable to reduce compile time when Layer 3 is not needed.",onUpdate:"compile",noReset:!0}},inject:(e,o,a)=>{const r=o.coloring;(r==null?void 0:r.layer3Enabled)!==!1&&e.addDefine("LAYER3_ENABLED","1"),e.addPreamble("vec4 g_orbitTrap = vec4(1e10);"),a==="Main"||a==="Histogram"?e.addFunction(dn()):e.addFunction(`
                float getMappingValue(float mode, vec3 p, vec4 result, vec3 n, float repeatScale) { return 0.0; }
            `)}},fn={id:"standard",label:"Standard (Tglad)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = clamp(z, -foldLimit, foldLimit) * 2.0 - z;
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:2}},pn={id:"mirror",label:"Mirror",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = foldLimit - abs(abs(z) - foldLimit);
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:3}},hn={id:"half",label:"Half-fold",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = abs(z + foldLimit);
}
`,defaults:{hybridScale:1.5,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.3,hybridFixedR:1,hybridIter:2}},mn={id:"decoupled",label:"Decoupled",glsl:`
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
`,extraParams:{hybridFoldingValue:{type:"vec3",default:new U(2,2,2),label:"Folding Value",shortId:"hfv",uniform:"uHybridFoldingValue",min:.1,max:5,step:.01,group:"hybrid"}},defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:2,hybridFoldingValue:{x:2,y:2,z:2}}},gn={id:"kali",label:"Kali",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = uHybridKaliConstant - abs(z);
}
`,rotMode:"post",extraParams:{hybridKaliConstant:{type:"vec3",default:new U(1,1,1),label:"Kali Constant",shortId:"hkc",uniform:"uHybridKaliConstant",min:-3,max:3,step:.01,group:"hybrid"}},defaults:{hybridScale:1.5,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.6,hybridFixedR:1,hybridIter:3,hybridKaliConstant:{x:.5,y:.5,z:.5}}},xn={id:"tetra",label:"Tetrahedral (KIFS)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    if (z.x + z.y < 0.0) z.xy = -z.yx;
    if (z.x + z.z < 0.0) z.xz = -z.zx;
    if (z.y + z.z < 0.0) z.yz = -z.zy;
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.25,hybridFixedR:1,hybridIter:3}},yn={id:"octa",label:"Octahedral (KIFS)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    // Knighty's octahedral fold — diagonal plane reflections + axis sorting
    if (z.x + z.y < 0.0) z.xy = -z.yx;
    if (z.x + z.z < 0.0) z.xz = -z.zx;
    if (z.x - z.y < 0.0) z.xy = z.yx;
    if (z.x - z.z < 0.0) z.xz = z.zx;
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:3}},bn={id:"icosa",label:"Icosahedral (KIFS)",glsl:`
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
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.3,hybridFixedR:1,hybridIter:4}},vn={id:"menger",label:"Menger (Cubic)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    // Full 48-fold octahedral symmetry via abs + sort
    z = abs(z);
    if (z.x - z.y < 0.0) z.xy = z.yx;
    if (z.x - z.z < 0.0) z.xz = z.zx;
    if (z.y - z.z < 0.0) z.yz = z.zy;
}
`,defaults:{hybridScale:3,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:3}},Kt=[fn,pn,hn,mn,gn,xn,yn,bn,vn],wn=Kt.map((e,o)=>({label:e.label,value:o}));function Sn(e){return Kt[e]??Kt[0]}const Mn=["xyz","xzy","yxz","yzx","zxy","zyx"];function zn(e){const o=Mn[e]??"xyz";return o==="xyz"?"vec3 c_perm = c.xyz;":`vec3 c_perm = c.${o};`}function Cn(e,o){return`
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
    ${o==="wrap"?"if (hybridHasRot) z3 = hybridRotMat * z3;":""}
    z3 += uHybridShift;

    foldOperation(z3, dr, uHybridFoldLimitVec);

    // Transform back out of fold space
    z3 -= uHybridShift;
    ${o==="wrap"?"if (hybridHasRot) z3 = transpose(hybridRotMat) * z3;":""}

    sphereFold(z3, dr, uHybridMinR, uHybridFixedR);
    ${o==="post"?"if (hybridHasRot) { z3 = hybridRotMat * z3; }":""}

    // Dynamic scale variation (Mandelbulber ABoxVaryScale)
    float s = uHybridScale + uHybridScaleVary * (abs(uHybridScale) - 1.0);
    z3 *= s;

    // C-axis permutation
    ${e}
    if (uHybridAddC > 0.5) z3 += c_perm;

    z.xyz = z3;
    dr = dr * abs(s) + 1.0;
    trap = min(trap, getLength(z3));
}
`}function kn(){const e={};return Kt.forEach((o,a)=>{o.extraParams&&Object.entries(o.extraParams).forEach(([r,n])=>{e[r]={...n,condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0},{param:"hybridFoldType",eq:a}]}})}),e}const jn={id:"geometry",shortId:"g",name:"Geometry",category:"Formulas",customUI:[{componentId:"interaction-picker",group:"julia",condition:{param:"juliaMode",bool:!0},props:{targetMode:"picking_julia",label:"Pick Coordinate",activeLabel:"Cancel Picking",helpText:"Click any point on the fractal surface to set Julia coordinates.",variant:"primary"}}],engineConfig:{toggleParam:"applyTransformLogic",mode:"compile",label:"Geometry Modifiers",groupFilter:"engine_settings"},params:{applyTransformLogic:{type:"boolean",default:!0,label:"Geometry Engine",shortId:"gt",group:"main",description:"Master switch for geometry modifiers (Julia, Rotation, Hybrid).",noReset:!0,hidden:!0},preRotMaster:{type:"boolean",default:!0,label:"Enable Rotation",shortId:"rm",group:"engine_settings",ui:"checkbox",description:"Compiles rotation matrix logic. Disable for speed.",onUpdate:"compile",noReset:!0,estCompileMs:600},hybridCompiled:{type:"boolean",default:!1,label:"Hybrid Box Fold",shortId:"hcm",group:"engine_settings",ui:"checkbox",description:"Compiles hybrid box fold system into shader. Toggle effect on/off instantly from Formula panel.",onUpdate:"compile",noReset:!0,estCompileMs:1200},hybridMode:{type:"boolean",default:!1,label:"Hybrid Active",shortId:"hm",uniform:"uHybrid",group:"hybrid",hidden:!0},hybridFoldType:{type:"float",default:0,label:"Fold Type",shortId:"hft",group:"engine_settings",options:wn.map(e=>({...e,estCompileMs:400})),description:"Box fold algorithm. Each type produces fundamentally different geometry.",onUpdate:"compile",noReset:!0,condition:{param:"hybridCompiled",bool:!0}},hybridComplex:{type:"boolean",default:!1,label:"Interleaved Mode",shortId:"hx",group:"engine_settings",ui:"checkbox",description:"Interleaves fold with fractal formula (Box → Fractal → Box). Slow compile.",onUpdate:"compile",noReset:!0,estCompileMs:1500,condition:{param:"hybridCompiled",bool:!0}},hybridPermute:{type:"float",default:0,label:"Axis Permutation",shortId:"hpe",group:"engine_settings",options:[{label:"XYZ (Default)",value:0},{label:"XZY",value:1},{label:"YXZ",value:2},{label:"YZX",value:3},{label:"ZXY",value:4},{label:"ZYX",value:5}],description:"Permutes the constant (c) axis mapping. Changes fractal topology.",onUpdate:"compile",noReset:!0,condition:{param:"hybridCompiled",bool:!0}},burningEnabled:{type:"boolean",default:!1,label:"Burning Mode",shortId:"bm",group:"transform",description:'Applies absolute value to coordinates every iteration. Creates "Burning Ship" variations.',uniform:"uBurningEnabled"},hybridIter:{type:"float",default:2,label:"Iterations",shortId:"hi",uniform:"uHybridIter",min:0,max:10,step:1,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridFoldLimit:{type:"float",default:1,label:"Fold Limit",shortId:"hl",uniform:"uHybridFoldLimit",min:.1,max:2,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}],hidden:!0},hybridFoldLimitVec:{type:"vec3",default:new U(1,1,1),label:"Fold Limit",shortId:"hlv",uniform:"uHybridFoldLimitVec",min:.1,max:3,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0},{param:"hybridFoldType",lt:4}],linkable:!0},hybridScale:{type:"float",default:2,label:"Scale",shortId:"hs",uniform:"uHybridScale",min:.5,max:3,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridScaleVary:{type:"float",default:0,label:"Scale Variation",shortId:"hsv",uniform:"uHybridScaleVary",min:-1,max:1,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}],description:"Dynamic scale feedback per iteration (ABoxVaryScale)."},hybridMinR:{type:"float",default:.5,label:"Min Radius",shortId:"hn",uniform:"uHybridMinR",min:0,max:1.5,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridFixedR:{type:"float",default:1,label:"Fixed Radius",shortId:"hf",uniform:"uHybridFixedR",min:.1,max:3,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridAddC:{type:"boolean",default:!1,label:"Add Constant",shortId:"hc",uniform:"uHybridAddC",group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridShift:{type:"vec3",default:new U(0,0,0),label:"Shift",shortId:"hs2",uniform:"uHybridShift",min:-2,max:2,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridRot:{type:"vec3",default:new U(0,0,0),label:"Rotation",shortId:"hr",uniform:"uHybridRot",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",mode:"rotation",group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},...kn(),hybridSwap:{type:"boolean",default:!1,label:"Swap Order",shortId:"hw",group:"engine_settings",ui:"checkbox",description:"Start with fractal formula instead of box fold.",onUpdate:"compile",noReset:!0,condition:[{param:"hybridCompiled",bool:!0},{param:"hybridComplex",bool:!0}]},hybridSkip:{type:"int",default:1,label:"Hybrid Interval",shortId:"hk",uniform:"uHybridSkip",min:1,max:8,step:1,group:"hybrid",condition:[{param:"hybridComplex",bool:!0},{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},preRotEnabled:{type:"boolean",default:!1,label:"Local Rotation",shortId:"re",uniform:"uPreRotEnabled",group:"transform",condition:{param:"preRotMaster",bool:!0}},preRotY:{type:"float",default:0,label:"Spin Y",shortId:"ry",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},preRotX:{type:"float",default:0,label:"Spin X",shortId:"rx",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},preRotZ:{type:"float",default:0,label:"Spin Z",shortId:"rz",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},preRot:{type:"vec3",default:new U(0,0,0),label:"Pre Rotation",composeFrom:["preRotX","preRotY","preRotZ"],hidden:!0},juliaMode:{type:"boolean",default:!1,label:"Julia Mode",shortId:"jm",uniform:"uJuliaMode",group:"julia"},juliaX:{type:"float",default:0,label:"Julia X",shortId:"jx",min:-2,max:2,step:.01,group:"julia_params",condition:{param:"juliaMode",bool:!0},hidden:!0},juliaY:{type:"float",default:0,label:"Julia Y",shortId:"jy",min:-2,max:2,step:.01,group:"julia_params",condition:{param:"juliaMode",bool:!0},hidden:!0},juliaZ:{type:"float",default:0,label:"Julia Z",shortId:"jz",min:-2,max:2,step:.01,group:"julia_params",condition:{param:"juliaMode",bool:!0},hidden:!0},julia:{type:"vec3",default:new U(0,0,0),label:"Julia Vector",uniform:"uJulia",composeFrom:["juliaX","juliaY","juliaZ"],hidden:!0}},inject:(e,o)=>{const a=o.geometry;if((a?a.applyTransformLogic:!0)===!1){e.addFunction(`void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {}
void initHybridTransform() {}
void formula_Hybrid(inout vec4 z, inout float dr, inout float trap, vec4 c) {}`);return}const n=a?a.preRotMaster!==!1:!0;e.setRotation(n);const s=(a==null?void 0:a.hybridCompiled)??!1;if(!s)e.addFunction(`void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {}
void initHybridTransform() {}
void formula_Hybrid(inout vec4 z, inout float dr, inout float trap, vec4 c) {}`);else{const d=(a==null?void 0:a.hybridFoldType)??0,u=Sn(d);e.addFunction(u.glsl);const f=(a==null?void 0:a.hybridPermute)??0,p=zn(f);e.addFunction(Cn(p,u.rotMode??"wrap"))}let i="",l="";if(o.formula!=="MandelTerrain"&&(l+="if (uBurningEnabled > 0.5) z.xyz = abs(z.xyz);"),s)if(!(a&&a.hybridComplex))i+=`
                if (uHybrid > 0.5) {
                    initHybridTransform();
                    int hLim = int(uHybridIter);
                    for(int i=0; i<16; i++) {
                        if (i >= hLim) break;
                        formula_Hybrid(z, dr, trap, c);
                    }
                }
                `;else{const u=(a==null?void 0:a.hybridSwap)??!1;i+=`if (uHybrid > 0.5) { initHybridTransform(); }
`,l+=`
                if (uHybrid > 0.5) {
                    int skip = int(uHybridSkip);
                    if (skip < 1) skip = 1;

                    if (i >= ${u?"1":"0"}) {
                        int rel_i = i - ${u?"1":"0"};

                        if ((rel_i % skip) == 0 && (rel_i / skip) < int(uHybridIter)) {
                            formula_Hybrid(z, dr, trap, c);
                            skipMainFormula = true;
                        }
                    }
                }
                `}e.addHybrid("",i,l)}},Pn={id:"quality",shortId:"q",name:"Quality",category:"Rendering",tabConfig:{label:"Quality",componentId:"panel-quality",order:60},engineConfig:{toggleParam:"engineQuality",mode:"compile",label:"Loop Limits & Precision",groupFilter:"engine_settings"},params:{engineQuality:{type:"boolean",default:!0,label:"Quality Core",shortId:"qc",group:"main",noReset:!0,hidden:!0},compilerHardCap:{type:"int",default:500,label:"Hard Loop Cap",shortId:"hc",min:64,max:2e3,step:1,group:"engine_settings",ui:"numeric",description:"Compile-time safety limit. Ray loop will never exceed this.",onUpdate:"compile",noReset:!0},precisionMode:{type:"float",default:0,label:"Ray Precision",shortId:"pm",group:"engine_settings",options:[{label:"High (Desktop)",value:0},{label:"Standard (Mobile)",value:1}],description:"Sets the minimum epsilon (ray hit distance). Standard prevents GPU hangs on mobile.",onUpdate:"compile",noReset:!0},bufferPrecision:{type:"float",default:0,label:"Texture Buffer",shortId:"bp",group:"engine_settings",options:[{label:"Float32 (HDR)",value:0},{label:"HalfFloat16",value:1}],description:"Controls render target bit-depth. 16-bit is faster and required on some mobile GPUs.",onUpdate:"compile",noReset:!0},maxSteps:{type:"int",default:300,label:"Max Ray Steps",shortId:"ms",uniform:"uMaxSteps",min:32,max:2e3,step:1,group:"kernel",description:"Runtime limit. Rays stop after this many steps. Artistic tool for limiting depth. Maximum is limited by Hard Loop Cap.",isAdvanced:!0,dynamicMaxRef:"compilerHardCap"},distanceMetric:{type:"float",default:0,label:"Distance Metric",shortId:"dm",uniform:"uDistanceMetric",group:"kernel",options:[{label:"Euclidean (Sphere)",value:0},{label:"Chebyshev (Box)",value:1},{label:"Manhattan (Diamond)",value:2},{label:"Minkowski 4 (Rounded)",value:3}],description:'The shape of "distance". Changes the aesthetic of the fractal surface.'},estimator:{type:"float",default:0,label:"Estimator",shortId:"es",group:"kernel",options:[{label:"Analytic (Log)",value:0},{label:"Linear (Unit 1.0)",value:1},{label:"Linear (Offset 2.0)",value:4},{label:"Pseudo (Raw)",value:2},{label:"Dampened",value:3}],description:"Algorithm for calculating distance. Log=Smooth, Linear=Sharp/IFS, Pseudo=Artifact Fix.",onUpdate:"compile",noReset:!0,isAdvanced:!0},fudgeFactor:{type:"float",default:1,label:"Slice Optimization",shortId:"ff",uniform:"uFudgeFactor",min:.01,max:1,step:.01,group:"kernel",description:"Multiplies step size. Lower = Higher quality but slower. Set to < 0.2 for deep zooms.",format:e=>e.toFixed(2)},stepRelaxation:{type:"float",default:0,label:"Step Relaxation",shortId:"sr",uniform:"uStepRelaxation",min:0,max:1,step:.01,group:"kernel",description:"Dynamic Step Size. 0 = Fixed Fudge. 1 = Variable (Fudge near surface, 1.0 in void). Saves steps.",isAdvanced:!0},stepJitter:{type:"float",default:.15,label:"Step Jitter",shortId:"sj",uniform:"uStepJitter",min:0,max:1,step:.01,group:"kernel",description:"Stochastic step variation. Breaks banding artifacts. Higher = softer edges, artistic blur.",format:e=>e.toFixed(2)},refinementSteps:{type:"int",default:0,label:"Edge Polish",shortId:"rf",uniform:"uRefinementSteps",min:0,max:5,step:1,group:"kernel",description:"Extra micro-steps after hitting surface. Fixes slicing/banding artifacts.",isAdvanced:!0},detail:{type:"float",default:1,label:"Ray detail",shortId:"rd",uniform:"uDetail",min:.1,max:10,step:.1,group:"kernel"},pixelThreshold:{type:"float",default:.5,label:"Pixel threshold",shortId:"pt",uniform:"uPixelThreshold",min:.1,max:2,step:.1,group:"kernel"},overstepTolerance:{type:"float",default:0,label:"Overstep Fix",shortId:"ot",uniform:"uOverstepTolerance",min:0,max:1e3,step:.1,scale:"log",group:"kernel",description:"Recovers details missed by the raymarcher. 0=Off. Higher values fix more holes but may create noise."},dynamicScaling:{type:"boolean",default:!1,label:"Adaptive Resolution",shortId:"ds",group:"performance",noReset:!0},interactionDownsample:{type:"float",default:2,label:"Move Quality",shortId:"id",min:1,max:4,step:.5,group:"performance",condition:{param:"dynamicScaling",bool:!0},format:e=>`1/${e}x`,noReset:!0},physicsProbeMode:{type:"float",default:0,label:"Distance Probe",shortId:"dp",group:"performance",isAdvanced:!0,options:[{label:"GPU Probe",value:0},{label:"Manual",value:2}],description:"GPU Probe: Reads distance from render target. Manual: Fixed value for orbit control.",noReset:!0},manualDistance:{type:"float",default:10,label:"Manual Distance",shortId:"md",min:.1,max:1e3,step:.1,group:"performance",isAdvanced:!0,parentId:"physicsProbeMode",condition:{param:"physicsProbeMode",eq:2},description:"Manual distance value. Used for orbit control calculations.",format:e=>e.toFixed(1),noReset:!0}},inject:(e,o)=>{const a=o.quality,r=(a==null?void 0:a.compilerHardCap)||500;e.addDefine("MAX_HARD_ITERATIONS",Math.floor(r).toString())}},cu=220,du=24,uu=32,fu=24,pu=24,hu=50,_a=64,Se=8,mu={DEFAULT_BITRATE:40},gu=[{label:"MP4 (H.264) - Universal",container:"mp4",codec:"avc",ext:"mp4",mime:"video/mp4"},{label:"MP4 (H.265/HEVC) - High Quality",container:"mp4",codec:"hevc",ext:"mp4",mime:"video/mp4"},{label:"MP4 (AV1) - Best Compression",container:"mp4",codec:"av1",ext:"mp4",mime:"video/mp4"},{label:"WebM (VP9) - Web Standard",container:"webm",codec:"vp9",ext:"webm",mime:"video/webm"}];class Tn{constructor(){J(this,"nodes",new Map)}register(o){this.nodes.set(o.id,o)}get(o){return this.nodes.get(o)}getAll(){return Array.from(this.nodes.values())}getGrouped(){const o={};return this.nodes.forEach(a=>{o[a.category]||(o[a.category]=[]),o[a.category].push(a.id)}),o}}const be=new Tn;be.register({id:"Note",label:"Comment / Note",category:"Utils",description:"A text block for leaving comments. Ignored by renderer.",inputs:[],glsl:e=>""});be.register({id:"AddConstant",label:"Add C (Julia/Pixel)",category:"Utils",description:"Adds the Julia Constant (or Pixel Coordinate) to the position. Essential for Mandelbrot/Julia hybrids.",inputs:[{id:"scale",label:"Strength",min:0,max:2,step:.01,default:1}],glsl:e=>`${e.indent}${e.varName}_p += c.xyz * ${e.getParam("scale")};`});be.register({id:"Scale",label:"Scale (Mult)",category:"Transforms",description:"Simple multiplication. Warning: For fractals, use IFS Scale to keep centered.",inputs:[{id:"scale",label:"Scale",min:.1,max:5,step:.01,default:2,hardMin:.001}],glsl:e=>`
${e.indent}${e.varName}_p *= ${e.getParam("scale")};
${e.indent}${e.varName}_dr *= abs(${e.getParam("scale")});
`});be.register({id:"IFSScale",label:"IFS Scale (Homothety)",category:"Transforms",description:"Scales space while shifting to maintain a center. Critical for Menger/Sierpinski.",inputs:[{id:"scale",label:"Scale",min:1,max:5,step:.01,default:2},{id:"offset",label:"Offset",min:0,max:5,step:.01,default:1}],glsl:e=>`
${e.indent}{
${e.indent}    float scale = ${e.getParam("scale")};
${e.indent}    float off = ${e.getParam("offset")};
${e.indent}    ${e.varName}_p = ${e.varName}_p * scale - vec3(off * (scale - 1.0));
${e.indent}    ${e.varName}_dr *= abs(scale);
${e.indent}}
`});be.register({id:"Rotate",label:"Rotate",category:"Transforms",description:"Rotates space around X, Y, Z axes.",inputs:[{id:"x",label:"Rot X",min:-180,max:180,step:1,default:0},{id:"y",label:"Rot Y",min:-180,max:180,step:1,default:0},{id:"z",label:"Rot Z",min:-180,max:180,step:1,default:0}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 rot = vec3(radians(${e.getParam("x")}), radians(${e.getParam("y")}), radians(${e.getParam("z")}));
${e.indent}    if(abs(rot.x)>0.001) { float s=sin(rot.x); float c=cos(rot.x); mat2 m=mat2(c,-s,s,c); ${e.varName}_p.yz = m*${e.varName}_p.yz; }
${e.indent}    if(abs(rot.y)>0.001) { float s=sin(rot.y); float c=cos(rot.y); mat2 m=mat2(c,-s,s,c); ${e.varName}_p.xz = m*${e.varName}_p.xz; }
${e.indent}    if(abs(rot.z)>0.001) { float s=sin(rot.z); float c=cos(rot.z); mat2 m=mat2(c,-s,s,c); ${e.varName}_p.xy = m*${e.varName}_p.xy; }
${e.indent}}
`});be.register({id:"Translate",label:"Translate",category:"Transforms",description:"Linear shift of coordinates.",inputs:[{id:"x",label:"X",min:-5,max:5,step:.01,default:0},{id:"y",label:"Y",min:-5,max:5,step:.01,default:0},{id:"z",label:"Z",min:-5,max:5,step:.01,default:0}],glsl:e=>`
${e.indent}${e.varName}_p += vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")});
`});be.register({id:"Mod",label:"Modulo (Repeat)",category:"Transforms",description:"Tiles space infinitely in a grid.",inputs:[{id:"x",label:"X Period",min:0,max:10,step:.1,default:0},{id:"y",label:"Y Period",min:0,max:10,step:.1,default:0},{id:"z",label:"Z Period",min:0,max:10,step:.1,default:0}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 per = vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")});
${e.indent}    if(abs(per.x)>0.001) ${e.varName}_p.x = mod(${e.varName}_p.x + 0.5*per.x, per.x) - 0.5*per.x;
${e.indent}    if(abs(per.y)>0.001) ${e.varName}_p.y = mod(${e.varName}_p.y + 0.5*per.y, per.y) - 0.5*per.y;
${e.indent}    if(abs(per.z)>0.001) ${e.varName}_p.z = mod(${e.varName}_p.z + 0.5*per.z, per.z) - 0.5*per.z;
${e.indent}}
`});be.register({id:"AmazingFold",label:"Amazing Fold",category:"Folds",description:"The core folding logic of the Amazing Box (Box + Sphere fold). Does not scale or add C.",inputs:[{id:"limit",label:"Box Limit",min:.1,max:3,step:.01,default:1},{id:"minR",label:"Min Radius",min:0,max:2,step:.01,default:.5},{id:"fixedR",label:"Fixed Radius",min:0,max:3,step:.01,default:1}],glsl:e=>`
${e.indent}boxFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("limit")});
${e.indent}sphereFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("minR")}, ${e.getParam("fixedR")});
`});be.register({id:"Abs",label:"Abs (Mirror)",category:"Folds",description:"Absolute value fold on all axes. Creates cubic symmetries.",inputs:[],glsl:e=>`${e.indent}${e.varName}_p = abs(${e.varName}_p);`});be.register({id:"BoxFold",label:"Box Fold",category:"Folds",description:"Clamps space inside a box limit. The core of the Mandelbox.",inputs:[{id:"limit",label:"Limit",min:.1,max:3,step:.01,default:1,hardMin:.001}],glsl:e=>`${e.indent}boxFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("limit")});`});be.register({id:"SphereFold",label:"Sphere Fold",category:"Folds",description:"Inverts space inside a sphere. Creates spherical voids.",inputs:[{id:"minR",label:"Min Radius",min:0,max:2,step:.01,default:.5},{id:"fixedR",label:"Fixed Radius",min:0,max:3,step:.01,default:1}],glsl:e=>`${e.indent}sphereFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("minR")}, ${e.getParam("fixedR")});`});be.register({id:"PlaneFold",label:"Plane Fold",category:"Folds",description:"Reflects space across a plane defined by a Normal and Distance.",inputs:[{id:"x",label:"Normal X",min:-1,max:1,step:.01,default:0},{id:"y",label:"Normal Y",min:-1,max:1,step:.01,default:1},{id:"z",label:"Normal Z",min:-1,max:1,step:.01,default:0},{id:"d",label:"Offset",min:-2,max:2,step:.01,default:0}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 n = normalize(vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")}));
${e.indent}    ${e.varName}_p -= 2.0 * min(0.0, dot(${e.varName}_p, n) - ${e.getParam("d")}) * n;
${e.indent}}
`});be.register({id:"MengerFold",label:"Menger Fold",category:"Folds",description:"Permutes coordinates (sorts xyz). Essential for Menger Sponges.",inputs:[],glsl:e=>`
${e.indent}if(${e.varName}_p.x < ${e.varName}_p.y) ${e.varName}_p.xy = ${e.varName}_p.yx;
${e.indent}if(${e.varName}_p.x < ${e.varName}_p.z) ${e.varName}_p.xz = ${e.varName}_p.zx;
${e.indent}if(${e.varName}_p.y < ${e.varName}_p.z) ${e.varName}_p.yz = ${e.varName}_p.zy;
`});be.register({id:"SierpinskiFold",label:"Sierpinski Fold",category:"Folds",description:"Diagonal folding for Tetrahedral fractals (MixPinski).",inputs:[],glsl:e=>`
${e.indent}if(${e.varName}_p.x + ${e.varName}_p.y < 0.0) ${e.varName}_p.xy = -${e.varName}_p.yx;
${e.indent}if(${e.varName}_p.x + ${e.varName}_p.z < 0.0) ${e.varName}_p.xz = -${e.varName}_p.zx;
${e.indent}if(${e.varName}_p.y + ${e.varName}_p.z < 0.0) ${e.varName}_p.yz = -${e.varName}_p.zy;
`});be.register({id:"Mandelbulb",label:"Mandelbulb",category:"Fractals",description:"The standard Power function. Includes phase shifts.",inputs:[{id:"power",label:"Power",min:1,max:16,step:.1,default:8},{id:"phaseX",label:"Phi Phase",min:-3.14,max:3.14,step:.01,default:0},{id:"phaseY",label:"Theta Phase",min:-3.14,max:3.14,step:.01,default:0},{id:"twist",label:"Z Twist",min:-2,max:2,step:.01,default:0}],glsl:e=>`
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
`});be.register({id:"Sphere",label:"Sphere",category:"Primitives",description:"SDF Sphere.",inputs:[{id:"r",label:"Radius",min:.1,max:5,step:.01,default:1}],glsl:e=>`${e.indent}${e.varName}_d = length(${e.varName}_p) - ${e.getParam("r")};`});be.register({id:"Box",label:"Box",category:"Primitives",description:"SDF Box.",inputs:[{id:"x",label:"Size X",min:.1,max:5,step:.01,default:1},{id:"y",label:"Size Y",min:.1,max:5,step:.01,default:1},{id:"z",label:"Size Z",min:.1,max:5,step:.01,default:1}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 b = vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")});
${e.indent}    vec3 d = abs(${e.varName}_p) - b;
${e.indent}    ${e.varName}_d = length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
${e.indent}}
`});be.register({id:"Twist",label:"Twist (Z)",category:"Distortion",description:"Twists space along the Z-axis.",inputs:[{id:"amount",label:"Amount",min:-5,max:5,step:.01,default:1}],glsl:e=>`
${e.indent}{
${e.indent}    float c_tw = cos(${e.getParam("amount")} * ${e.varName}_p.z);
${e.indent}    float s_tw = sin(${e.getParam("amount")} * ${e.varName}_p.z);
${e.indent}    mat2 m_tw = mat2(c_tw, -s_tw, s_tw, c_tw);
${e.indent}    ${e.varName}_p.xy = m_tw * ${e.varName}_p.xy;
${e.indent}}
`});be.register({id:"Bend",label:"Bend (Y)",category:"Distortion",description:"Bends space along the Y-axis.",inputs:[{id:"amount",label:"Amount",min:-2,max:2,step:.01,default:.5}],glsl:e=>`
${e.indent}{
${e.indent}    float c_bn = cos(${e.getParam("amount")} * ${e.varName}_p.y);
${e.indent}    float s_bn = sin(${e.getParam("amount")} * ${e.varName}_p.y);
${e.indent}    mat2 m_bn = mat2(c_bn, -s_bn, s_bn, c_bn);
${e.indent}    ${e.varName}_p.xz = m_bn * ${e.varName}_p.xz;
${e.indent}}
`});be.register({id:"SineWave",label:"Sine Wave",category:"Distortion",description:"Adds a sinusoidal ripple to the position.",inputs:[{id:"freq",label:"Frequency",min:.1,max:10,step:.1,default:2},{id:"amp",label:"Amplitude",min:0,max:1,step:.01,default:.1}],glsl:e=>`
${e.indent}${e.varName}_p += sin(${e.varName}_p.yzx * ${e.getParam("freq")}) * ${e.getParam("amp")};
`});be.register({id:"Union",label:"Union",category:"Combiners (CSG)",description:"Combines two shapes (min).",inputs:[],glsl:e=>`
${e.indent}bool winA = ${e.varName}_d < ${e.in2}_d;
${e.indent}${e.varName}_d = winA ? ${e.varName}_d : ${e.in2}_d;
${e.indent}${e.varName}_p = winA ? ${e.varName}_p : ${e.in2}_p;
${e.indent}${e.varName}_dr = winA ? ${e.varName}_dr : ${e.in2}_dr;
`});be.register({id:"Subtract",label:"Subtract",category:"Combiners (CSG)",description:"Carves B out of A.",inputs:[],glsl:e=>`
${e.indent}float negB = -${e.in2}_d;
${e.indent}bool winA = ${e.varName}_d > negB; 
${e.indent}${e.varName}_d = winA ? ${e.varName}_d : negB;
${e.indent}${e.varName}_p = winA ? ${e.varName}_p : ${e.in2}_p;
${e.indent}${e.varName}_dr = winA ? ${e.varName}_dr : ${e.in2}_dr;
`});be.register({id:"Intersect",label:"Intersect",category:"Combiners (CSG)",description:"Area where A and B overlap.",inputs:[],glsl:e=>`
${e.indent}bool winA = ${e.varName}_d > ${e.in2}_d;
${e.indent}${e.varName}_d = winA ? ${e.varName}_d : ${e.in2}_d;
${e.indent}${e.varName}_p = winA ? ${e.varName}_p : ${e.in2}_p;
${e.indent}${e.varName}_dr = winA ? ${e.varName}_dr : ${e.in2}_dr;
`});be.register({id:"SmoothUnion",label:"Smooth Union",category:"Combiners (CSG)",description:"Merges shapes organically.",inputs:[{id:"k",label:"Smoothness",min:.01,max:2,step:.01,default:.5}],glsl:e=>`
${e.indent}float h = clamp(0.5 + 0.5 * (${e.in2}_d - ${e.varName}_d) / ${e.getParam("k")}, 0.0, 1.0);
${e.indent}${e.varName}_d = mix(${e.in2}_d, ${e.varName}_d, h) - ${e.getParam("k")} * h * (1.0 - h);
${e.indent}${e.varName}_p = mix(${e.in2}_p, ${e.varName}_p, h);
${e.indent}${e.varName}_dr = mix(${e.in2}_dr, ${e.varName}_dr, h);
`});be.register({id:"Mix",label:"Mix (Lerp)",category:"Combiners (CSG)",description:"Linear interpolation between shapes.",inputs:[{id:"factor",label:"Factor",min:0,max:1,step:.01,default:.5}],glsl:e=>`
${e.indent}${e.varName}_d = mix(${e.varName}_d, ${e.in2}_d, ${e.getParam("factor")});
${e.indent}${e.varName}_p = mix(${e.varName}_p, ${e.in2}_p, ${e.getParam("factor")});
${e.indent}${e.varName}_dr = mix(${e.varName}_dr, ${e.in2}_dr, ${e.getParam("factor")});
`});be.register({id:"Custom",label:"Custom (Legacy)",category:"Utils",description:"Legacy node.",inputs:[],glsl:e=>""});const Rn=(e,o)=>{const a=new Set,r=["root-end"],n=new Set;for(;r.length>0;){const f=r.pop();if(n.has(f))continue;n.add(f),f!=="root-end"&&f!=="root-start"&&a.add(f),o.filter(m=>m.target===f).forEach(m=>r.push(m.source))}const s=e.filter(f=>a.has(f.id));if(!s||s.length===0)return`
        void formula_Modular(inout vec4 z, inout float dr, inout float trap, inout float distOverride, vec4 c, int i) {
            z.xyz += c.xyz;
            float r = length(z.xyz);
            trap = min(trap, r);
        }
        `;let i=`
    // --- Graph Init ---
    vec3 v_start_p = z.xyz;
    float v_start_d = 1000.0;
    float v_start_dr = dr; 
    
    vec3 v_curr_p = v_start_p;
    float v_curr_d = v_start_d;
    float v_curr_dr = v_start_dr;
    `;const l=new Map;l.set("root-start","v_start");let c=0;s.forEach((f,p)=>{const x=`v_${f.id.replace(/[^a-zA-Z0-9]/g,"")}`;l.set(f.id,x);const C=o.filter(v=>v.target===f.id),y=C.find(v=>!v.targetHandle||v.targetHandle==="a"),b=C.find(v=>v.targetHandle==="b"),g=y&&l.get(y.source)||"v_start",h=b&&l.get(b.source)||"v_start";if(i+=`    // Node: ${f.type} (${f.id})
`,i+=`    vec3 ${x}_p = ${g}_p;
`,i+=`    float ${x}_d = ${g}_d;
`,i+=`    float ${x}_dr = ${g}_dr;
`,f.enabled){const v=be.get(f.type);if(v){const z=f.condition&&f.condition.active;let M="    ";if(z){const j=Math.round(Math.max(1,f.condition.mod)),k=Math.round(f.condition.rem);i+=`    if ( (i - (i/${j})*${j}) == ${k} ) {
`,M="        "}const w=j=>f.bindings&&f.bindings[j]?`u${f.bindings[j]}`:c<_a?`uModularParams[${c++}]`:"0.0";i+=v.glsl({varName:x,in1:g,in2:h,getParam:w,indent:M}),z&&(i+=`    }
`)}}i+=`
`});const d=o.find(f=>f.target==="root-end");let u="v_start";return d&&d.source!=="root-start"&&(u=l.get(d.source)||"v_start"),i+=`
    z.xyz = ${u}_p;
    dr = ${u}_dr;
    
    float final_d = ${u}_d;
    if (final_d < 999.0 && final_d > -1.0) {
        distOverride = final_d;
    }
    
    trap = min(trap, length(z.xyz));
    `,`
void formula_Modular(inout vec4 z, inout float dr, inout float trap, inout float distOverride, vec4 c, int i) {
${i}
}
`},In=e=>{let o="d = 0.5 * log(max(r, 1.0e-5)) * r / dr_safe;";return e<.5?o=`
        float logR2 = log2(m2);
        // 0.5 * ln(2) / 2 ≈ 0.17328679 — converts log2(r²) to 0.5*r*ln(r) for DE formula
        d = 0.17328679 * logR2 * r / dr_safe;
        `:e<1.5?o="d = (r - 1.0) / dr_safe;":e<2.5?o="d = r / dr_safe;":e<3.5?o=`
        float logR2 = log2(m2);
        // 0.5 * ln(2) ≈ 0.34657359 — converts log2(r²) to r*ln(r), then halved by dampening term
        d = 0.34657359 * logR2 * r / (dr_safe + 8.0);
        `:o="d = (r - 2.0) / dr_safe;",`
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
            
            ${o}
            
            return vec2(d, smoothIter);
        }`},Fn={id:"coreMath",shortId:"cm",name:"Formula Math",category:"Formulas",tabConfig:{label:"Formula",componentId:"panel-formula",order:10},extraUniforms:[{name:Ae.ModularParams,type:"float",arraySize:_a,default:new Float32Array(_a)}],params:{iterations:{type:"float",default:16,label:"Iterations",shortId:"it",uniform:"uIterations",min:1,max:500,step:1,group:"main"},paramA:{type:"float",default:8,label:"Param A",shortId:"pa",uniform:"uParamA",min:-10,max:10,step:.001,group:"params"},paramB:{type:"float",default:0,label:"Param B",shortId:"pb",uniform:"uParamB",min:-10,max:10,step:.001,group:"params"},paramC:{type:"float",default:0,label:"Param C",shortId:"pc",uniform:"uParamC",min:-10,max:10,step:.001,group:"params"},paramD:{type:"float",default:0,label:"Param D",shortId:"pd",uniform:"uParamD",min:-10,max:10,step:.001,group:"params"},paramE:{type:"float",default:0,label:"Param E",shortId:"pe",uniform:"uParamE",min:-10,max:10,step:.001,group:"params"},paramF:{type:"float",default:0,label:"Param F",shortId:"pf",uniform:"uParamF",min:-10,max:10,step:.001,group:"params"},vec2A:{type:"vec2",default:{x:0,y:0},label:"Vec2 A",shortId:"v2a",uniform:"uVec2A",min:-10,max:10,step:.001,group:"params"},vec2B:{type:"vec2",default:{x:0,y:0},label:"Vec2 B",shortId:"v2b",uniform:"uVec2B",min:-10,max:10,step:.001,group:"params"},vec2C:{type:"vec2",default:{x:0,y:0},label:"Vec2 C",shortId:"v2c",uniform:"uVec2C",min:-10,max:10,step:.001,group:"params"},vec3A:{type:"vec3",default:new U(0,0,0),label:"Vec3 A",shortId:"v3a",uniform:"uVec3A",min:-10,max:10,step:.001,group:"params"},vec3B:{type:"vec3",default:new U(0,0,0),label:"Vec3 B",shortId:"v3b",uniform:"uVec3B",min:-10,max:10,step:.001,group:"params"},vec3C:{type:"vec3",default:new U(0,0,0),label:"Vec3 C",shortId:"v3c",uniform:"uVec3C",min:-10,max:10,step:.001,group:"params"}},inject:(e,o)=>{var u;const a=o.formula,r=o.quality;a==="Modular"&&e.addDefine("PIPELINE_REV",(o.pipelineRevision||0).toString()),["JuliaMorph","MandelTerrain"].includes(a)&&e.addDefine("SKIP_PRE_BAILOUT","1");const n=ge.get(a);let s="",i="",l="";const c=(r==null?void 0:r.estimator)||0;let d=In(c);if(a==="Modular"){const f=Rn(o.pipeline||[],((u=o.graph)==null?void 0:u.edges)||[]);s+=f+`
`,i="formula_Modular(z, dr, trap, distOverride, c, i);",e.setDistOverride("float distOverride = 1e10;","if (distOverride < 999.0) { escaped = true; break; }","if (distOverride < 999.0) break;","if (distOverride < 999.0) { finalD = distOverride; smoothIter = iter; }","if (distOverride < 999.0) finalD = distOverride;")}else n&&(s+=n.shader.function+`
`,i=n.shader.loopBody,l=n.shader.loopInit||"",n.shader.preamble&&e.addPreamble(n.shader.preamble),n.shader.getDist&&(d=`vec2 getDist(float r, float dr, float iter, vec4 z) { ${n.shader.getDist} }`));e.addFunction(s),e.setFormula(i,l,d)}};let _n=0;function zt(){return`l${++_n}`}const Dn=(e,o)=>{if(!e)return`
        float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) { return 1.0; }
        float GetHardShadow(vec3 ro, vec3 rd, float lightDist) { return 1.0; }
        `;if(o===3)return`
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
`;const a=256,r=o<1.5?`
        float t = 0.05;
        float fudge = 1.0;
    `:`
        float t = 0.0;
        float fudge = uFudgeFactor;
    `,n=o<1.5?`
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
// SHADOWS (${o<1.5?"Lite Soft":"Robust Soft"})
// ------------------------------------------------------------------

float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) {
    if (uShadowIntensity < 0.001) return 1.0;

    float res = 1.0;

    ${r}

    // Jitter starting position to break banding
    t += noise * 0.01;

    int limit = uShadowSteps;

    for(int i = 0; i < ${a}; i++) {
        if (i >= limit) break;

        float h = DE_Dist(ro + rd * t);
        ${n}
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

    for(int i = 0; i < ${a}; i++) {
        if (i >= limit) break;

        float h = DE_Dist(ro + rd * t);

        float thresh = max(1.0e-6, t * 0.0002);

        if(h < thresh) return 0.0;

        t += h * fudge;

        if(t > lightDist) return 1.0;
    }

    return 1.0;
}
`},nr=`
vec3 calculatePBRContribution(vec3 p, vec3 n, vec3 v, vec3 albedo, float roughness, float metallic, float stochasticSeed, bool calcShadows) {
    vec3 Lo = vec3(0.0);

    float pixelSizeScale = uPixelSizeBase / uInternalScale;
    float biasAmount = uShadowBias + pixelSizeScale * 2.0;
    vec3 shadowRo = p + n * biasAmount;

    bool useStochasticShadows = (uPTStochasticShadows > 0.5);

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
            shadow = mix(1.0, s, uShadowIntensity);
        }

        float att = 1.0;
        if (!isDirectional && uLightFalloff[i] > 0.001) {
            float k = uLightFalloff[i];
            if (uLightFalloffType[i] < 0.5) att = 1.0 / (1.0 + k * distToLight * distToLight);
            else att = 1.0 / (1.0 + k * distToLight);
        }

        vec3 radiance = uLightColor[i] * intensity * att * shadow;
`,sr=`
    }

    return Lo;
}
`,Ln=`
// ------------------------------------------------------------------
// PBR HELPERS (Blinn-Phong)
// ------------------------------------------------------------------
${nr}
        // Blinn-Phong specular
        vec3 h = normalize(l + v);
        float NdotH = max(0.0, dot(n, h));
        float shininess = max(2.0, 2.0 / (roughness * roughness + 0.001) - 2.0);
        float spec = pow(NdotH, shininess) * (shininess + 2.0) / (8.0 * PI);
        vec3 specular = mix(vec3(1.0), albedo, metallic) * spec;

        float kD = (1.0 - metallic);
        Lo += (kD * albedo * uDiffuse / PI + specular * uSpecular) * radiance * NdotL;
${sr}
`,En=`
// ------------------------------------------------------------------
// PBR HELPERS (Cook-Torrance GGX)
// ------------------------------------------------------------------
${nr}
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
${sr}
`,lr=`
void buildTangentBasis(vec3 n, out vec3 t, out vec3 b) {
    vec3 up = abs(n.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    t = normalize(cross(n, up));
    b = cross(n, t);
}

#ifdef LIGHT_SPHERES
vec2 intersectLightSphere(vec3 ro, vec3 rd) {
    for (int i = 0; i < MAX_LIGHTS; i++) {
        if (i >= uLightCount) break;
        if (uLightIntensity[i] < 0.01 || uLightType[i] > 0.5 || uLightRadius[i] < 0.001) continue;
        vec3 oc = ro - uLightPos[i];
        float b = dot(rd, oc);
        if (-b < 0.001) continue;
        float dPerp2 = max(0.0, dot(oc, oc) - b * b);
        float r = uLightRadius[i];
        float outerR = r + 0.001;
        if (dPerp2 < outerR * outerR) {
            float dPerp = sqrt(dPerp2);
            float innerR = r * (1.0 - clamp(uLightSoftness[i], 0.0, 1.0));
            float fade = 1.0 - smoothstep(innerR, outerR, dPerp);
            fade *= fade;
            if (fade > 0.001) {
                return vec2(fade, float(i));
            }
        }
    }
    return vec2(0.0, -1.0);
}
#endif
`,An=`
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}
`,lo=lr+An,Nn=()=>`
// ------------------------------------------------------------------
// DIRECT LIGHTING INTEGRATOR (Multi-Bounce)
// ------------------------------------------------------------------

// Apply fog to environment samples (treat as being at fog far plane)
vec3 applyEnvFog(vec3 env) {
    if (uFogFar >= 1000.0) return env;
    float fogFactor = smoothstep(uFogNear, uFogFar, uFogFar);
    return mix(env, uFogColorLinear, fogFactor);
}

// Apply distance-based fog to shaded geometry
vec3 applyDistanceFog(vec3 col, float dist) {
    if (uFogFar >= 1000.0) return col;
    float fogFactor = smoothstep(uFogNear, uFogFar, dist);
    return mix(col, uFogColorLinear, fogFactor);
}

// Test reflection ray against visible light spheres, fallback to environment
vec3 sampleLightSphereOrEnv(vec3 ro, vec3 rd, float roughness, vec3 throughput) {
    vec3 env = applyEnvFog(GetEnvMap(rd, roughness) * uEnvStrength);
    #ifdef LIGHT_SPHERES
    vec2 lsHit = intersectLightSphere(ro, rd);
    if (lsHit.x > 0.0) {
        int li = int(lsHit.y);
        vec3 lc = uLightColor[li] * uLightIntensity[li];
        return mix(env, lc, lsHit.x) * throughput;
    }
    #endif
    return env * throughput;
}

vec3 calculateShading(vec3 ro, vec3 rd, float d, vec4 result, float stochasticSeed) {
    vec3 p_ray = ro + rd * d;
    vec3 p_fractal = p_ray + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;

    vec3 albedo, n, emission;
    float roughness;

    // 1. Primary Surface
    getSurfaceMaterial(p_ray, p_fractal, result, d, albedo, n, emission, roughness, true);

    vec3 v = normalize(-rd);

    // 2. Direct Light (Primary)
    vec3 directLighting = calculatePBRContribution(p_ray, n, v, albedo, roughness, uReflection, stochasticSeed, true);

    // 3. Ambient Occlusion (Primary)
    float ao = GetAO(p_ray, n, stochasticSeed);

    // 4. Fresnel & Reflection Setup
    vec3 F0 = mix(vec3(0.04), albedo, uReflection);
    float NdotV = max(0.0, dot(n, v));
    // Schlick-Roughness: clamps grazing Fresnel so rough surfaces don't over-reflect
    // (distinct from per-light Schlick in PBR which uses HdotV for specular response)
    vec3 F = F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - NdotV, 5.0);

    // 5. Reflection (Single Bounce - Flattened Loop)
    vec3 reflectionLighting = vec3(0.0);
    vec3 ambient = vec3(0.0);

    // Cache un-jittered reflection direction (reused for simpleEnv fallback)
    vec3 reflDir = reflect(-v, n);

    #ifdef REFLECTIONS_ENABLED
        // --- RAYMARCHED REFLECTIONS ---
        // Adaptive bias: scales with pixel size and distance to avoid self-intersection
        float pixelSizeScale = uPixelSizeBase / uInternalScale;
        float reflBias = max(0.001, pixelSizeScale * d * 2.0);
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
                // REFL_BOUNCE_SHADOWS: compile-time control over shadow cost in reflections
                #ifdef REFL_BOUNCE_SHADOWS
                    hitColor += calculatePBRContribution(p_next, r_n, -currRd, r_albedo, r_rough, uReflection, stochasticSeed + 0.1, !isMoving);
                #else
                    hitColor += calculatePBRContribution(p_next, r_n, -currRd, r_albedo, r_rough, uReflection, stochasticSeed + 0.1, false);
                #endif

                reflectionLighting += hitColor * currentThroughput;

            } else {
                reflectionLighting += sampleLightSphereOrEnv(currRo, currRd, roughness, currentThroughput);
            }
        } else {
            reflectionLighting += applyEnvFog(GetEnvMap(currRd, roughness) * uEnvStrength) * currentThroughput;
        }

        vec3 simpleEnv = applyEnvFog(GetEnvMap(reflDir, roughness) * uEnvStrength);
        simpleEnv *= currentThroughput;

        reflectionLighting = mix(simpleEnv, reflectionLighting, uReflStrength);

    #elif defined(REFLECTIONS_SSR)
        // --- SCREEN-SPACE REFLECTIONS ---
        // TODO: Requires uProjectionMatrix, uViewMatrix, uPrevColorBuffer, uPrevDepthBuffer
        // Currently falls back to enhanced env map until pipeline plumbing is added
        {
            vec3 currentThroughput = F * uSpecular;

            // Enhanced env map: use roughness-aware sampling with Fresnel
            vec3 envColor = applyEnvFog(GetEnvMap(reflDir, roughness) * uEnvStrength);
            reflectionLighting = envColor * currentThroughput;
        }

    #elif defined(REFLECTIONS_ENV)
        // --- ENVIRONMENT MAP ONLY ---
        // Fresnel-weighted environment sampling, zero extra cost
        vec3 envColor = applyEnvFog(GetEnvMap(reflDir, roughness) * uEnvStrength);
        reflectionLighting = envColor * F * uSpecular;

    #else
        // --- REFLECTIONS OFF ---
        vec3 envColor = GetEnvMap(reflDir, roughness) * uEnvStrength;
        reflectionLighting = envColor * F * uSpecular;
    #endif

    // 6. Rim
    float fresnelTerm = pow(1.0 - NdotV, uRimExponent);
    vec3 rimColor = vec3(0.5, 0.7, 1.0) * fresnelTerm * uRim;

    // 7. Ambient IBL
    if (uEnvStrength > 0.001) {
        vec3 envIrradiance = GetEnvMap(n, 1.0);
        vec3 kD = (vec3(1.0) - F) * (1.0 - uReflection);
        ambient = kD * albedo * envIrradiance * uEnvStrength * uDiffuse;
    }

    // 8. Compose
    vec3 finalColor = directLighting + reflectionLighting + rimColor + emission + ambient;

    // AO Tint: black = classic darkening. Custom color = tinted occlusion.
    finalColor *= mix(uAOColor, vec3(1.0), ao);

    return finalColor;
}
`,Bn=(e,o)=>`
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
            #ifdef LIGHT_SPHERES
            vec2 lsHit = intersectLightSphere(currentRo, currentRd);
            if (lsHit.x > 0.0) {
                int li = int(lsHit.y);
                radiance += uLightColor[li] * uLightIntensity[li] * lsHit.x * throughput;
            } else
            #endif
            {
                float skyIntensity = (bounce == 0) ? uEnvBackgroundStrength : uEnvStrength;
                vec3 env = GetEnvMap(currentRd, 0.0);
                if (bounce == 0 && uFogFar < 1000.0) {
                    // Fog blend for primary-ray sky miss (sky treated as being at fog far plane)
                    float fogFactor = smoothstep(uFogNear, uFogFar, uFogFar * 0.95);
                    vec3 sky = mix(env * skyIntensity, uFogColorLinear, fogFactor * 0.5);
                    radiance += sky * throughput;
                } else {
                    radiance += env * skyIntensity * throughput;
                }
            }
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
        float visualLimitNEE = pixelSizeScale * d * (1.0 / uDetail);
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
                    ${e?`
        shadow = GetSoftShadow(shadowRo, lDir, uShadowSoftness, distToLight, blueNoise.r);
    `:`
        if (uPTStochasticShadows > 0.5) {
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

                    float att = 1.0;
                    if (!isDirectional && uLightFalloff[lightIdx] > 0.001) {
                        if (uLightFalloffType[lightIdx] < 0.5) att = 1.0 / (1.0 + uLightFalloff[lightIdx] * distToLight * distToLight);
                        else att = 1.0 / (1.0 + uLightFalloff[lightIdx] * distToLight);
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
`;function On(e){let o=!1;const a=e.map(r=>r.id?r:(o=!0,{...r,id:zt()}));return o?a:e}const bt=(e,o)=>!e||!e.lights||o>=e.lights.length?{id:"",type:"Point",position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:0,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0,radius:0}:e.lights[o],$n=[{id:zt(),type:"Point",position:{x:-2,y:1,z:2},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:1.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,radius:0,softness:0},{id:zt(),type:"Point",position:{x:2,y:-1,z:1},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0,radius:0,softness:0},{id:zt(),type:"Point",position:{x:0,y:-5,z:2},rotation:{x:0,y:0,z:0},color:"#0088ff",intensity:.25,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!1,castShadow:!0,radius:0,softness:0}],Hn={id:"lighting",shortId:"l",name:"Lighting",category:"Rendering",tabConfig:{label:"Light",componentId:"panel-light",order:30,condition:{param:"$advancedMode",bool:!0}},viewportConfig:{componentId:"overlay-lighting",renderOrder:50,type:"dom"},engineConfig:{toggleParam:"advancedLighting",mode:"compile",label:"Lighting Engine",groupFilter:"engine_settings"},extraUniforms:[{name:Ae.LightCount,type:"int",default:0},{name:Ae.LightType,type:"float",arraySize:Se,default:new Float32Array(Se).fill(0)},{name:Ae.LightPos,type:"vec3",arraySize:Se,default:new Array(Se).fill(new U)},{name:Ae.LightDir,type:"vec3",arraySize:Se,default:new Array(Se).fill(new U(0,-1,0))},{name:Ae.LightColor,type:"vec3",arraySize:Se,default:new Array(Se).fill(new Oe(1,1,1))},{name:Ae.LightIntensity,type:"float",arraySize:Se,default:new Float32Array(Se).fill(0)},{name:Ae.LightShadows,type:"float",arraySize:Se,default:new Float32Array(Se).fill(0)},{name:Ae.LightFalloff,type:"float",arraySize:Se,default:new Float32Array(Se).fill(0)},{name:Ae.LightFalloffType,type:"float",arraySize:Se,default:new Float32Array(Se).fill(0)},{name:Ae.LightRadius,type:"float",arraySize:Se,default:new Float32Array(Se).fill(0)},{name:Ae.LightSoftness,type:"float",arraySize:Se,default:new Float32Array(Se).fill(0)}],params:{advancedLighting:{type:"boolean",default:!0,label:"Light Engine",shortId:"le",group:"main",noReset:!0,hidden:!0,onUpdate:"compile",description:"Master switch for lighting logic. Disabling provides stubs only."},ptEnabled:{type:"boolean",default:!0,label:"Path Tracing Core",shortId:"pe",group:"engine_settings",ui:"checkbox",description:"Compiles the Path Tracing module. Disable to reduce shader size.",onUpdate:"compile",noReset:!0,estCompileMs:1500},renderMode:{type:"float",default:0,label:"Active Mode",shortId:"rm",group:"engine_settings",parentId:"ptEnabled",options:[{label:"Direct (Fast)",value:0},{label:"Path Tracing (GI)",value:1}],description:"Switches between fast direct lighting and physically based Global Illumination.",onUpdate:"compile",noReset:!0},ptBounces:{type:"int",default:3,label:"Max Bounces",shortId:"pb",uniform:"uPTBounces",min:1,max:8,step:1,group:"engine_settings",parentId:"ptEnabled",ui:"numeric",description:"Recursion depth. Higher = Brighter interiors, Slower render."},ptGIStrength:{type:"float",default:1,label:"GI Strength",shortId:"pg",uniform:"uPTGIStrength",min:0,max:5,step:.01,group:"engine_settings",parentId:"ptEnabled",description:"Artistic boost for bounced light intensity."},specularModel:{type:"float",default:0,label:"Specular Model",shortId:"sm",group:"engine_settings",options:[{label:"Blinn-Phong (Fast)",value:0,estCompileMs:0},{label:"Cook-Torrance (Quality)",value:1,estCompileMs:400}],description:"BRDF model for direct lighting. Cook-Torrance is physically accurate but increases shader compile time.",onUpdate:"compile",noReset:!0},shadowsCompile:{type:"boolean",default:!0,label:"Shadow Engine",shortId:"sc",group:"engine_settings",ui:"checkbox",noReset:!0,onUpdate:"compile",description:"Compiles the shadow raymarching loop. Disable to save ~5s compile time.",estCompileMs:1500},shadowAlgorithm:{type:"float",default:1,label:"Shadow Quality",shortId:"sa",group:"engine_settings",parentId:"shadowsCompile",options:[{label:"Hard Only (Fastest)",value:2,estCompileMs:500},{label:"Lite Soft (Fast)",value:1,estCompileMs:1500},{label:"Robust Soft (Quality)",value:0,estCompileMs:3e3}],description:"Shadow algorithm. Hard = binary occlusion, Lite = fast penumbra, Robust = accurate penumbra.",onUpdate:"compile",noReset:!0},ptStochasticShadows:{type:"boolean",default:!1,label:"Area Lights (Stochastic)",shortId:"ps",uniform:"uPTStochasticShadows",group:"engine_settings",parentId:"shadowsCompile",ui:"checkbox",description:"Treats lights as physical spheres. Creates realistic penumbras. Requires Accumulation."},ptNEEAllLights:{type:"boolean",default:!1,label:"Sample All Lights",shortId:"pal",group:"engine_settings",parentId:"ptEnabled",ui:"checkbox",onUpdate:"compile",noReset:!0,description:"Evaluates every active light per bounce instead of one random light. Reduces shadow noise at the cost of N× more shadow rays."},ptEnvNEE:{type:"boolean",default:!1,label:"Environment NEE",shortId:"pen",group:"engine_settings",parentId:"ptEnabled",ui:"checkbox",onUpdate:"compile",noReset:!0,description:"Directly samples the environment as a light source each bounce. Large noise reduction for sky-lit scenes at the cost of one extra trace per bounce."},ptMaxLuminance:{type:"float",default:10,label:"Firefly Clamp",shortId:"pfl",uniform:"uPTMaxLuminance",min:.5,max:200,step:.5,scale:"log",group:"engine_settings",parentId:"ptEnabled",description:"Clamps per-sample luminance to suppress bright firefly spikes. Lower = cleaner but slightly biased. Raise to effectively disable."},shadows:{type:"boolean",default:!0,label:"Enable",shortId:"sh",group:"main",uniform:"uShadows",ui:"checkbox",condition:{param:"shadowsCompile",bool:!0}},shadowIntensity:{type:"float",default:1,label:"Opacity",shortId:"si",uniform:"uShadowIntensity",min:0,max:1,step:.01,group:"shadows",condition:{bool:!0}},shadowSoftness:{type:"float",default:16,label:"Softness",shortId:"ss",uniform:"uShadowSoftness",min:2,max:2e3,step:1,group:"shadows",scale:"log",condition:{bool:!0}},shadowSteps:{type:"int",default:128,label:"Steps",shortId:"st",min:16,max:512,step:16,group:"shadows",condition:{bool:!0},uniform:"uShadowSteps",ui:"numeric",description:"Quality vs Performance."},shadowBias:{type:"float",default:.002,label:"Bias",shortId:"sb",uniform:"uShadowBias",min:0,max:1,step:1e-6,group:"shadows",scale:"log",condition:{bool:!0},description:"Prevents surface acne."},lights:{type:"complex",default:$n,label:"Light List",shortId:"ll",group:"data",hidden:!0,noReset:!0}},inject:(e,o,a)=>{var f;if(a!=="Main"){e.addPostDEFunction(`
             float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) { return 1.0; }
             float GetHardShadow(vec3 ro, vec3 rd, float lightDist) { return 1.0; }
             vec3 calculateShading(vec3 ro, vec3 rd, float d, vec4 result, float stochasticSeed) { return vec3(0.0); }
             vec3 calculatePathTracedColor(vec3 ro, vec3 rd, float d_init, vec4 result_init, float seed) { return vec3(0.0); }
             `);return}e.addDefine("MAX_LIGHTS",Se.toString());const r=o.lighting;if(r&&!r.advancedLighting){e.addDefine("MAX_LIGHTS","0"),e.addPostDEFunction(`
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
             `);return}const n=(r==null?void 0:r.shadowsCompile)!==!1,s=(r==null?void 0:r.shadowAlgorithm)??1,i=s===2?3:s===1?1:2;e.addPostDEFunction(Dn(n,i)),!n&&!(r!=null&&r.shadows)?e.addDefine("DISABLE_SHADOWS","1"):e.addDefine("SHADOW_QUALITY","2"),((f=r==null?void 0:r.lights)==null?void 0:f.some(p=>(p.radius??0)>0&&p.intensity>0))&&e.addDefine("LIGHT_SPHERES","1"),(r==null?void 0:r.ptEnabled)!==!1&&(e.addDefine("PT_ENABLED","1"),r!=null&&r.ptNEEAllLights&&e.addDefine("PT_NEE_ALL_LIGHTS","1"),r!=null&&r.ptEnvNEE&&e.addDefine("PT_ENV_NEE","1"));const c=o.renderMode==="PathTracing"||(r==null?void 0:r.renderMode)===1,d=o.quality,u=(d==null?void 0:d.precisionMode)===1;if(c)e.addIntegrator(lo),e.setRenderMode("PathTracing"),e.addDefine("RENDER_MODE_PATHTRACING","1"),e.addIntegrator(Bn(u));else{const p=(r==null?void 0:r.specularModel)===1;e.addIntegrator(p?lo:lr),e.setRenderMode("Direct"),e.addIntegrator(p?En:Ln),e.addIntegrator(Nn())}},actions:{updateLight:(e,o)=>{const{index:a,params:r}=o;if(!e.lights||a>=e.lights.length)return{};const n=[...e.lights];return n[a]={...n[a],...r},{lights:n}},addLight:e=>{if(e.lights.length>=Se)return{};const o={id:zt(),type:"Point",position:{x:0,y:0,z:2},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:1,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,radius:0};return{lights:[...e.lights,o]}},removeLight:(e,o)=>{if(o<0||o>=e.lights.length)return{};const a=[...e.lights];return a.splice(o,1),{lights:a}},duplicateLight:(e,o)=>{if(o<0||o>=e.lights.length||e.lights.length>=Se)return{};const a={...e.lights[o],id:zt()},r=[...e.lights];return r.splice(o+1,0,a),{lights:r}}}},Gn={id:"optics",shortId:"o",name:"Camera Optics",category:"Scene",tabConfig:{label:"Scene",componentId:"panel-scene",order:20},customUI:[{componentId:"optics-controls",group:"dof"}],params:{camType:{type:"float",default:0,label:"Projection",shortId:"ct",uniform:"uCamType",group:"projection",options:[{label:"Perspective",value:0},{label:"Orthographic",value:1},{label:"360° Skybox",value:2}]},camFov:{type:"float",default:60,label:"Field of View",shortId:"fv",min:10,max:150,step:1,group:"projection",hidden:!0,condition:{param:"camType",eq:0}},orthoScale:{type:"float",default:2,label:"Ortho Scale",shortId:"os",min:.1,max:10,step:.1,scale:"log",group:"projection",condition:{param:"camType",eq:1}},dofStrength:{type:"float",default:0,label:"Camera Blur",shortId:"ds",uniform:"uDOFStrength",min:0,max:1,step:1e-4,scale:"log",group:"dof",format:e=>e===0?"0.0 (off)":Math.abs(e)<.001?e.toFixed(5):Math.abs(e)<10?e.toFixed(4):e.toFixed(2)},dofFocus:{type:"float",default:10,label:"Focus Distance",shortId:"df",uniform:"uDOFFocus",min:1e-6,max:1e4,step:1e-6,scale:"log",group:"dof",parentId:"dofStrength",condition:{gt:0}}}},Vn={id:"navigation",shortId:"n",name:"Navigation",category:"Scene",customUI:[{componentId:"navigation-controls",group:"controls"}],params:{flySpeed:{type:"float",default:.5,label:"Fly Speed %",shortId:"fs",min:.001,max:1,step:.001,group:"movement",format:e=>`${(e*100).toFixed(1)}%`},autoSlow:{type:"boolean",default:!0,label:"Auto-slow on collision",shortId:"as",group:"movement"}}},Un={id:"audio",shortId:"au",name:"Audio",category:"Audio",tabConfig:{label:"Audio",componentId:"panel-audio",order:70,condition:{param:"isEnabled",bool:!0}},menuConfig:{label:"Audio Modulation",toggleParam:"isEnabled"},params:{isEnabled:{type:"boolean",default:!1,label:"Enable Audio Engine",shortId:"en",group:"system",noReset:!0},smoothing:{type:"float",default:.8,label:"FFT Smoothing",shortId:"sm",group:"system",noReset:!0,min:0,max:.99,step:.01},threshold:{type:"float",default:.1,label:"Gate Threshold",shortId:"gt",group:"hidden",hidden:!0,noReset:!0},agcEnabled:{type:"boolean",default:!1,label:"AGC",shortId:"ag",group:"hidden",hidden:!0,noReset:!0},attack:{type:"float",default:.1,label:"Global Attack",shortId:"ga",group:"hidden",hidden:!0,noReset:!0},decay:{type:"float",default:.3,label:"Global Decay",shortId:"gd",group:"hidden",hidden:!0,noReset:!0},highPass:{type:"float",default:20,label:"High Pass",shortId:"hp",group:"hidden",hidden:!0,noReset:!0},lowPass:{type:"float",default:2e4,label:"Low Pass",shortId:"lp",group:"hidden",hidden:!0,noReset:!0},gain:{type:"float",default:.8,label:"Volume",shortId:"vl",group:"system",noReset:!0,min:0,max:2,step:.01}}},Wn={id:"drawing",shortId:"dr",name:"Drawing Tools",category:"Tools",tabConfig:{label:"Drawing",componentId:"panel-drawing",order:80,condition:{param:"enabled",bool:!0}},viewportConfig:{componentId:"overlay-drawing",type:"dom"},menuConfig:{label:"Drawing Tools",toggleParam:"enabled"},interactionConfig:{blockCamera:!0,activeParam:"active"},params:{enabled:{type:"boolean",default:!1,label:"Show Tab",shortId:"en",group:"system",hidden:!0,noReset:!0},active:{type:"boolean",default:!1,label:"Enable Tool",shortId:"ac",group:"main",noReset:!0,hidden:!0},activeTool:{type:"float",default:0,label:"Tool Type",shortId:"tt",group:"main",noReset:!0,hidden:!0},originMode:{type:"float",default:1,label:"Origin Plane",shortId:"om",group:"settings",noReset:!0,options:[{label:"Global Zero",value:0},{label:"Surface (Probe)",value:1}],description:"Where the drawing plane starts."},color:{type:"color",default:new Oe("#00ffff"),label:"Line Color",shortId:"cl",group:"settings",noReset:!0},lineWidth:{type:"float",default:1,label:"Line Width",shortId:"lw",min:1,max:10,step:1,group:"settings",noReset:!0,hidden:!0},showLabels:{type:"boolean",default:!0,label:"Show Measurements",shortId:"sl",group:"settings",noReset:!0},showAxes:{type:"boolean",default:!1,label:"Show Axis Ruler",shortId:"ax",group:"settings",noReset:!0,description:"Displays a reference grid at the drawing origin."},shapes:{type:"complex",default:[],label:"Shapes",shortId:"sh",group:"data",hidden:!0,noReset:!0},refreshTrigger:{type:"float",default:0,label:"Refresh Trigger",group:"system",hidden:!0,noReset:!0}},state:{activeTool:"rect"},actions:{addDrawnShape:(e,o)=>({shapes:[...e.shapes||[],o]}),removeDrawnShape:(e,o)=>({shapes:(e.shapes||[]).filter(a=>a.id!==o)}),updateDrawnShape:(e,o)=>({shapes:(e.shapes||[]).map(a=>a.id===o.id?{...a,...o.updates}:a)}),clearDrawnShapes:e=>({shapes:[]})}},co=["#ef4444","#f97316","#f59e0b","#84cc16","#22c55e","#06b6d4","#3b82f6","#8b5cf6","#d946ef","#f43f5e"],qn={id:"modulation",shortId:"mod",name:"Modulation",category:"System",state:{rules:[],selectedRuleId:null},actions:{addModulation:(e,o)=>{const a=co[e.rules.length%co.length],r={id:Qe(),target:o.target,source:o.source||"audio",enabled:!0,color:a,freqStart:0,freqEnd:.2,thresholdMin:.1,thresholdMax:1,attack:.1,decay:.3,smoothing:0,gain:1,offset:0};return{rules:[...e.rules,r],selectedRuleId:r.id}},removeModulation:(e,o)=>({rules:e.rules.filter(a=>a.id!==o),selectedRuleId:e.selectedRuleId===o?null:e.selectedRuleId}),updateModulation:(e,o)=>({rules:e.rules.map(a=>a.id===o.id?{...a,...o.update}:a)}),selectModulation:(e,o)=>({selectedRuleId:o})},params:{rules:{type:"complex",default:[],label:"Rules",shortId:"rl",group:"data",hidden:!0,noReset:!0},selectedRuleId:{type:"complex",default:null,label:"Selection",shortId:"sr",group:"data",hidden:!0,noReset:!0}}},Xn={id:"webcam",shortId:"wc",name:"Webcam Overlay",category:"Tools",viewportConfig:{componentId:"overlay-webcam",type:"dom"},menuConfig:{label:"Webcam Overlay",toggleParam:"isEnabled",advancedOnly:!0},params:{isEnabled:{type:"boolean",default:!1,label:"Enabled",shortId:"en",group:"system",noReset:!0},opacity:{type:"float",default:1,label:"Opacity",shortId:"op",min:0,max:3,step:.05,group:"visual",noReset:!0},posX:{type:"float",default:20,label:"Position X",shortId:"px",min:0,max:2e3,step:1,group:"transform",noReset:!0,hidden:!0},posY:{type:"float",default:80,label:"Position Y",shortId:"py",min:0,max:2e3,step:1,group:"transform",noReset:!0,hidden:!0},width:{type:"float",default:320,label:"Width",shortId:"w",min:50,max:1200,step:1,group:"transform",noReset:!0,hidden:!0},height:{type:"float",default:240,label:"Height",shortId:"h",min:50,max:1200,step:1,group:"transform",noReset:!0,hidden:!0},cropL:{type:"float",default:0,label:"Crop Left",shortId:"cl",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},cropR:{type:"float",default:0,label:"Crop Right",shortId:"cr",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},cropT:{type:"float",default:0,label:"Crop Top",shortId:"ct",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},cropB:{type:"float",default:0,label:"Crop Bottom",shortId:"cb",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},blendMode:{type:"float",default:0,label:"Blend Mode",shortId:"bm",group:"visual",noReset:!0,options:[{label:"Normal",value:0},{label:"Screen",value:1},{label:"Overlay",value:2},{label:"Lighten",value:3},{label:"Difference",value:4}]},crtMode:{type:"boolean",default:!1,label:"CRT Scanlines",shortId:"sc",group:"visual",noReset:!0},tilt:{type:"float",default:0,label:"3D Tilt",shortId:"tl",min:-45,max:45,step:1,group:"transform",noReset:!0},fontSize:{type:"float",default:12,label:"Overlay Font Size",shortId:"fs",min:8,max:32,step:1,group:"visual",noReset:!0}}},Yn={id:"debugTools",shortId:"dt",name:"Debug Tools",category:"System",viewportConfig:{componentId:"overlay-debug-tools",type:"dom",renderOrder:100},menuItems:[{label:"GLSL Debugger",toggleParam:"shaderDebuggerOpen",icon:"Code",advancedOnly:!0},{label:"State Debugger",toggleParam:"stateDebuggerOpen",icon:"Info",advancedOnly:!0}],params:{shaderDebuggerOpen:{type:"boolean",default:!1,label:"GLSL Debugger",shortId:"sd",group:"tools",noReset:!0},stateDebuggerOpen:{type:"boolean",default:!1,label:"State Debugger",shortId:"st",group:"tools",noReset:!0}}},da={fastest:{lighting:{shadows:!1,shadowsCompile:!1,ptEnabled:!1,specularModel:0},ao:{aoEnabled:!1,aoStochasticCp:!1},geometry:{hybridComplex:!1,preRotMaster:!1,preRotEnabled:!1},reflections:{enabled:!0,reflectionMode:0,bounceShadows:!1},quality:{precisionMode:1,bufferPrecision:1,compilerHardCap:128},atmosphere:{glowEnabled:!1}},lite:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:2,shadowSteps:32,ptStochasticShadows:!1,shadowSoftness:16,ptEnabled:!1,specularModel:0},ao:{aoEnabled:!0,aoSamples:2,aoStochasticCp:!1,aoMode:!1,aoMaxSamples:16},geometry:{hybridComplex:!1,preRotMaster:!1,preRotEnabled:!1},reflections:{enabled:!0,reflectionMode:1,bounceShadows:!1},quality:{precisionMode:1,bufferPrecision:1},atmosphere:{glowQuality:1}},balanced:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:1,shadowSoftness:16,ptStochasticShadows:!1,shadowSteps:64,ptEnabled:!1,specularModel:0},ao:{aoEnabled:!0,aoSamples:5,aoStochasticCp:!0,aoMode:!0,aoMaxSamples:32},geometry:{hybridComplex:!1,preRotMaster:!0,preRotEnabled:!0},reflections:{enabled:!0,reflectionMode:1,bounceShadows:!1},quality:{precisionMode:0,bufferPrecision:0},atmosphere:{glowQuality:0}},ultra:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:0,shadowSoftness:64,ptStochasticShadows:!0,shadowSteps:256,ptEnabled:!0,specularModel:1},ao:{aoEnabled:!0,aoSamples:8,aoStochasticCp:!0,aoMode:!0,aoMaxSamples:64},reflections:{enabled:!0,reflectionMode:3,bounceShadows:!0,steps:64,bounces:2},geometry:{hybridComplex:!0,preRotMaster:!0,preRotEnabled:!0},quality:{precisionMode:0,bufferPrecision:0},atmosphere:{glowQuality:0}}},Zn=e=>{let a=4200;for(const r of ie.getAll()){const n=e[r.id];if(n)for(const[s,i]of Object.entries(r.params)){const l=i;if(!l.onUpdate||l.onUpdate!=="compile")continue;const c=n[s];if(l.type==="boolean"&&c&&l.estCompileMs&&(a+=l.estCompileMs),l.options){const d=l.options.find(u=>typeof u.value=="number"&&typeof c=="number"?Math.abs(u.value-c)<.001:u.value===c);d!=null&&d.estCompileMs&&(a+=d.estCompileMs)}}}return a},cr=e=>{for(const[o,a]of Object.entries(da)){let r=!0;for(const[n,s]of Object.entries(a)){const i=e[n];if(!i){r=!1;break}for(const[l,c]of Object.entries(s)){const d=i[l];if(typeof c=="number"&&typeof d=="number"){if(Math.abs(c-d)>.001){r=!1;break}}else if(c!==d){r=!1;break}}if(!r)break}if(r)return o}return"custom"},Qn={id:"engineSettings",shortId:"eng",name:"Engine Config",category:"System",tabConfig:{label:"Engine",componentId:"panel-engine",order:5,condition:{param:"showEngineTab",bool:!0}},params:{showEngineTab:{type:"boolean",default:!1,label:"Show Engine Tab",shortId:"se",group:"system",noReset:!0,hidden:!0}},actions:{applyPreset:(e,o)=>{const{mode:a,actions:r}=o,n=da[a];return n?(Object.entries(n).forEach(([s,i])=>{const l=`set${s.charAt(0).toUpperCase()+s.slice(1)}`,c=r[l];typeof c=="function"&&c(i)}),{}):{}}}},Kn=(e,o,a=32)=>{if(!e)return`
        float GetAO(vec3 p, vec3 n, float seed) { return 1.0; }
        `;let r="";return o&&(r=`
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

${r}

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

    #if ${o?1:0}
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
    for(int i = 0; i < ${a}; i++) {
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
`},Jn={id:"ao",shortId:"ao",name:"Ambient Occlusion",category:"Lighting",engineConfig:{toggleParam:"aoEnabled",mode:"compile",label:"Ambient Occlusion",groupFilter:"engine_settings"},params:{aoIntensity:{type:"float",default:.2,label:"Ambient Occlusion",shortId:"ai",uniform:"uAOIntensity",min:0,max:1.5,step:.001,group:"shading",condition:{param:"aoEnabled",bool:!0}},aoSpread:{type:"float",default:.5,label:"Spread",shortId:"as",uniform:"uAOSpread",min:3e-4,max:1.5,step:.01,group:"shading",scale:"log",parentId:"aoIntensity",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0}]},aoSamples:{type:"int",default:5,label:"Samples",shortId:"ap",min:2,max:32,step:1,group:"shading",uniform:"uAOSamples",ui:"numeric",parentId:"aoIntensity",description:"Iterations per pixel. Runtime controlled.",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0}]},aoMode:{type:"boolean",default:!0,label:"Stochastic Mode",shortId:"am",uniform:"uAOMode",group:"shading",parentId:"aoIntensity",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0},{param:"aoStochasticCp",bool:!0}],description:"Switches between Fixed and Stochastic sampling at runtime."},aoColor:{type:"color",default:new Oe(0,0,0),label:"AO Tint",shortId:"ac",uniform:"uAOColor",group:"shading",parentId:"aoIntensity",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0}],description:"Black = classic darkening. Custom color = tinted occlusion in shadowed areas."},aoMaxSamples:{type:"int",default:32,label:"Max Samples (Hard Cap)",shortId:"amx",min:16,max:256,step:16,group:"engine_settings",ui:"numeric",description:"Compile-time limit. Increasing this allows higher runtime samples but compiles slower.",onUpdate:"compile",noReset:!0,condition:[{param:"aoEnabled",bool:!0}]},aoStochasticCp:{type:"boolean",default:!0,label:"Load Stochastic Sampling",shortId:"sc",group:"engine_settings",ui:"checkbox",description:"Compiles High-Quality noise logic into the shader.",onUpdate:"compile",noReset:!0},aoEnabled:{type:"boolean",default:!0,label:"Enable AO",shortId:"ae",group:"main",hidden:!0,noReset:!0,onUpdate:"compile",estCompileMs:200}},inject:(e,o,a)=>{if(a!=="Main"){e.addPostDEFunction("float GetAO(vec3 p, vec3 n, float seed) { return 1.0; }");return}const r=o.ao,n=(r==null?void 0:r.aoEnabled)!==!1,s=(r==null?void 0:r.aoStochasticCp)!==!1,i=(r==null?void 0:r.aoMaxSamples)||32;e.addPostDEFunction(Kn(n,s,i))}},es=()=>`
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
    `,uo=0,$t=1,fo=2,mt=3,ts={id:"reflections",shortId:"rf",name:"Reflections",category:"Rendering",engineConfig:{toggleParam:"enabled",mode:"compile",label:"Reflection Tracing",groupFilter:"engine_settings"},params:{reflectionMode:{type:"float",default:$t,label:"Reflection Method",shortId:"rm",group:"engine_settings",options:[{label:"Off",value:uo,estCompileMs:0},{label:"Environment Map",value:$t,estCompileMs:0},{label:"Screen-Space (SSR)",value:fo,estCompileMs:0},{label:"Raymarched (Quality)",value:mt,estCompileMs:7500}],description:"Reflection technique. Higher quality = longer compile time. Raymarched adds ~9s.",onUpdate:"compile",noReset:!0},bounceShadows:{type:"boolean",default:!1,label:"Bounce Shadows",shortId:"bs",group:"engine_settings",ui:"checkbox",condition:{param:"reflectionMode",eq:mt},description:"Compute shadows on reflected surfaces. Adds ~3-4s compile time.",onUpdate:"compile",noReset:!0,estCompileMs:4500},mixStrength:{type:"float",default:1,label:"Raymarch Mix",shortId:"mx",uniform:"uReflStrength",min:0,max:1,step:.01,group:"engine_settings",condition:{param:"reflectionMode",eq:mt},description:"Blends between Raymarched Reflections (1.0) and Environment Map (0.0)."},roughnessThreshold:{type:"float",default:.62,label:"Roughness Cutoff",shortId:"rc",uniform:"uReflRoughnessCutoff",min:0,max:1,step:.01,group:"engine_settings",condition:{param:"reflectionMode",eq:mt},description:"Surfaces rougher than this will skip raymarching to save performance."},bounces:{type:"int",default:1,label:"Max Bounces",shortId:"rb",min:1,max:3,step:1,group:"engine_settings",uniform:"uReflBounces",ui:"numeric",description:"Maximum recursion depth. Clamped to 3. Default 1 for performance.",noReset:!0,onUpdate:"compile",condition:{param:"reflectionMode",eq:mt}},steps:{type:"int",default:64,label:"Trace Steps",shortId:"rs",min:16,max:128,step:8,group:"engine_settings",uniform:"uReflSteps",ui:"numeric",description:"Precision of the reflection ray.",noReset:!0,condition:{param:"reflectionMode",eq:mt}},enabled:{type:"boolean",default:!0,label:"Enable Reflections",shortId:"re",group:"main",hidden:!0,noReset:!0,onUpdate:"compile"}},inject:(e,o,a)=>{if(a!=="Main")return;const r=o.reflections;if(!r||r.enabled===!1)return;const n=r.reflectionMode??$t;if(n!==uo){if(n===$t){e.addDefine("REFLECTIONS_ENV","1");return}if(n===fo){e.addDefine("REFLECTIONS_SSR","1");return}if(n===mt){e.addDefine("REFLECTIONS_ENABLED","1"),e.addPostDEFunction(es());const s=Math.max(1,Math.min(3,r.bounces??1));e.addDefine("MAX_REFL_BOUNCES",s.toString()),r.bounceShadows&&e.addDefine("REFL_BOUNCE_SHADOWS","1")}}}},as=`
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
`,os=`
float mapWater(vec3 p) { return 1e10; }
void applyWaterMaterial(inout vec3 albedo, inout float roughness, inout vec3 normal, vec3 p) {}
`,rs={id:"waterPlane",shortId:"wp",name:"Water Plane",category:"Scene",engineConfig:{toggleParam:"waterEnabled",mode:"compile",label:"Water Plane",groupFilter:"engine_settings"},params:{waterEnabled:{type:"boolean",default:!1,label:"Enable Water",shortId:"we",group:"engine_settings",onUpdate:"compile",noReset:!0,hidden:!0},active:{type:"boolean",default:!0,label:"Visible",shortId:"on",uniform:"uWaterActive",group:"main",condition:{param:"waterEnabled",bool:!0},noReset:!0},height:{type:"float",default:-2,label:"Height (Y)",shortId:"ht",uniform:"uWaterHeight",min:-10,max:10,step:.01,group:"geometry",condition:{param:"active",bool:!0}},color:{type:"color",default:new Oe("#001133"),label:"Water Color",shortId:"cl",uniform:"uWaterColor",group:"material",condition:{param:"active",bool:!0}},roughness:{type:"float",default:.02,label:"Roughness",shortId:"ro",uniform:"uWaterRoughness",min:0,max:1,step:.01,group:"material",condition:{param:"active",bool:!0}},waveStrength:{type:"float",default:.1,label:"Wave Height",shortId:"ws",uniform:"uWaterWaveStrength",min:0,max:1.5,step:.001,group:"waves",condition:{param:"active",bool:!0}},waveSpeed:{type:"float",default:1,label:"Wave Speed",shortId:"wv",uniform:"uWaterWaveSpeed",min:0,max:5,step:.1,group:"waves",condition:[{param:"active",bool:!0},{param:"waveStrength",gt:0}]},waveFrequency:{type:"float",default:1.5,label:"Wave Freq",shortId:"wf",uniform:"uWaterWaveFreq",min:.1,max:10,step:.1,group:"waves",condition:[{param:"active",bool:!0},{param:"waveStrength",gt:0}]}},inject:(e,o,a)=>{const r=o.waterPlane;r&&r.waterEnabled&&a==="Main"?(e.addDefine("WATER_ENABLED","1"),e.addFunction(as)):e.addFunction(os)}},is={id:"cameraManager",name:"Camera Manager",category:"Scene",tabConfig:{label:"Camera Manager",componentId:"panel-cameramanager",order:999,condition:{bool:!0}},params:{}},ns=`
#ifdef PT_VOLUMETRIC
{
    bool _hasDensity = uVolDensity > 0.001;
    bool _hasEmissive = uVolEmissive > 0.001;
    if (_hasDensity || _hasEmissive) {
        // Spatial stochastic gate: K=1.0, P=0.125 -> sample every ~8.0 world units
        if (fract(stochasticSeed * 7.43 + d * 1.0) < 0.125) {
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
`,ss={id:"volumetric",shortId:"vol",name:"Volumetric Scatter",category:"Rendering",engineConfig:{toggleParam:"ptVolumetric",mode:"compile",label:"Volumetric Scattering",description:"Henyey-Greenstein single scatter. Enables god rays, colored haze, and directional fog.",groupFilter:"engine_settings"},groups:{density:{label:"Density & Shadow Rays",collapsible:!0},emissive:{label:"Color Scatter",collapsible:!0},height:{label:"Height Fog",collapsible:!0}},params:{ptVolumetric:{type:"boolean",default:!1,label:"Volume Scatter",shortId:"pvs",group:"main",noReset:!0,onUpdate:"compile",estCompileMs:5500},volDensity:{type:"float",default:.01,label:"Density",shortId:"vd",uniform:"uVolDensity",min:.001,max:5,step:.01,scale:"log",group:"density",condition:{param:"ptVolumetric",bool:!0}},volAnisotropy:{type:"float",default:.3,label:"Anisotropy (g)",shortId:"va",uniform:"uVolAnisotropy",min:-.99,max:.99,step:.01,group:"density",parentId:"volDensity",condition:{gt:0},description:"0=isotropic, +0.9=forward (god rays), -0.9=back scatter."},volMaxLights:{type:"float",default:1,label:"Light Sources",shortId:"vml",uniform:"uVolMaxLights",min:1,max:3,step:1,group:"density",parentId:"volDensity",condition:{gt:0},isAdvanced:!0,description:"Max lights for shadow rays. More = more expensive."},volScatterTint:{type:"color",default:new Oe(1,1,1),label:"Scatter Tint",shortId:"vst",uniform:"uVolScatterTint",group:"density",parentId:"volDensity",condition:{gt:0}},volEmissive:{type:"float",default:0,label:"Color Scatter",shortId:"ves",uniform:"uVolEmissive",min:0,max:100,step:.1,scale:"log",group:"emissive",condition:{param:"ptVolumetric",bool:!0},description:"Orbit trap color field scattered through the volume. No shadow rays needed."},volEmissiveFalloff:{type:"float",default:0,label:"Surface Falloff",shortId:"vef",uniform:"uVolEmissiveFalloff",min:0,max:5,step:.01,scale:"log",group:"emissive",parentId:"volEmissive",condition:{gt:0},description:"Concentrate color near fractal surface."},volHeightFalloff:{type:"float",default:0,label:"Height Falloff",shortId:"vhf",uniform:"uVolHeightFalloff",min:0,max:5,step:.01,scale:"log",group:"height",condition:{param:"ptVolumetric",bool:!0},description:"Density varies with Y. Creates ground fog, rising mist."},volHeightOrigin:{type:"float",default:0,label:"Height Origin",shortId:"vho",uniform:"uVolHeightOrigin",min:-5,max:5,step:.01,group:"height",parentId:"volHeightFalloff",condition:{gt:0}}},inject:(e,o,a)=>{if(a!=="Main")return;const r=o.volumetric;r!=null&&r.ptVolumetric&&(e.addDefine("PT_VOLUMETRIC","1"),e.addVolumeLogic(ns,""))}},ls=()=>{ie.register(Fn),ie.register(jn),ie.register(Hn),ie.register(Jn),ie.register(ts),ie.register(Ji),ie.register(ss),ie.register(sn),ie.register(rs),ie.register(un),ie.register(cn),ie.register(Pn),ie.register(tn),ie.register(an),ie.register(ln),ie.register(Gn),ie.register(Vn),ie.register(is),ie.register(Un),ie.register(Wn),ie.register(qn),ie.register(Xn),ie.register(Yn),ie.register(Qn)},lt=e=>{const o=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);return o?{r:parseInt(o[1],16),g:parseInt(o[2],16),b:parseInt(o[3],16)}:null},At=(e,o,a)=>(typeof e=="object"&&(o=e.g,a=e.b,e=e.r),"#"+((1<<24)+(Math.round(e)<<16)+(Math.round(o)<<8)+Math.round(a)).toString(16).slice(1).toUpperCase()),Ht=({r:e,g:o,b:a})=>{e/=255,o/=255,a/=255;const r=Math.max(e,o,a),n=Math.min(e,o,a);let s=0,i=0,l=r;const c=r-n;if(i=r===0?0:c/r,r!==n){switch(r){case e:s=(o-a)/c+(o<a?6:0);break;case o:s=(a-e)/c+2;break;case a:s=(e-o)/c+4;break}s/=6}return{h:s*360,s:i*100,v:l*100}},Gt=(e,o,a)=>{e/=360,o/=100,a/=100;let r=0,n=0,s=0;const i=Math.floor(e*6),l=e*6-i,c=a*(1-o),d=a*(1-l*o),u=a*(1-(1-l)*o);switch(i%6){case 0:r=a,n=u,s=c;break;case 1:r=d,n=a,s=c;break;case 2:r=c,n=a,s=u;break;case 3:r=c,n=d,s=a;break;case 4:r=u,n=c,s=a;break;case 5:r=a,n=c,s=d;break}return{r:r*255,g:n*255,b:s*255}},cs=(e,o,a)=>({r:e.r+(o.r-e.r)*a,g:e.g+(o.g-e.g)*a,b:e.b+(o.b-e.b)*a}),ds=(e,o)=>{if(Math.abs(o-.5)<.001)return e;const a=Math.max(.001,Math.min(.999,o)),r=Math.log(.5)/Math.log(a);return Math.pow(e,r)},po=(e,o=1)=>{let a;if(!e)return"linear-gradient(90deg, #000 0%, #fff 100%)";if(Array.isArray(e))a=e;else if(e&&Array.isArray(e.stops))a=e.stops;else return"linear-gradient(90deg, #000 0%, #fff 100%)";if(!a||a.length===0)return"linear-gradient(90deg, #000 0%, #fff 100%)";const r=[...a].sort((s,i)=>s.position-i.position),n=[];for(let s=0;s<r.length;s++){const i=r[s];let l=Math.pow(i.position,1/o);if(l=Math.max(0,Math.min(1,l))*100,n.push(`${i.color} ${l.toFixed(2)}%`),s<r.length-1){const c=r[s+1],d=i.bias??.5;if((i.interpolation||"linear")==="step"){let f=Math.pow(c.position,1/o);f=Math.max(0,Math.min(1,f))*100,n.push(`${i.color} ${f.toFixed(2)}%`),n.push(`${c.color} ${f.toFixed(2)}%`)}else if(Math.abs(d-.5)>.001){const f=i.position+(c.position-i.position)*d;let p=Math.pow(f,1/o)*100;p=Math.max(0,Math.min(100,p)),n.push(`${p.toFixed(2)}%`)}}}return`linear-gradient(90deg, ${n.join(", ")})`},ya=e=>Math.pow(e/255,2.2)*255,ba=e=>{const o=e/255;if(o>=.99)return 255;const a=(Math.sqrt(-10127*o*o+13702*o+9)+59*o-3)/(502-486*o);return Math.max(0,a)*255},ho=e=>{const a=new Uint8Array(1024);let r,n="srgb";if(Array.isArray(e))r=e;else if(e&&Array.isArray(e.stops))r=e.stops,n=e.colorSpace||"srgb";else return a;if(r.length===0){for(let l=0;l<256;l++){const c=Math.floor(l/255*255);a[l*4]=c,a[l*4+1]=c,a[l*4+2]=c,a[l*4+3]=255}return a}const s=[...r].sort((l,c)=>l.position-c.position),i=l=>{let c={r:0,g:0,b:0};if(l<=s[0].position)c=lt(s[0].color)||{r:0,g:0,b:0};else if(l>=s[s.length-1].position)c=lt(s[s.length-1].color)||{r:0,g:0,b:0};else for(let d=0;d<s.length-1;d++)if(l>=s[d].position&&l<=s[d+1].position){const u=s[d],f=s[d+1];let p=(l-u.position)/(f.position-u.position);const m=u.bias??.5;Math.abs(m-.5)>.001&&(p=ds(p,m));const x=u.interpolation||"linear";x==="step"?p=p<.5?0:1:(x==="smooth"||x==="cubic")&&(p=p*p*(3-2*p));const C=lt(u.color)||{r:0,g:0,b:0},y=lt(f.color)||{r:0,g:0,b:0};c=cs(C,y,p);break}return n==="linear"?{r:ya(c.r),g:ya(c.g),b:ya(c.b)}:n==="aces_inverse"?{r:ba(c.r),g:ba(c.g),b:ba(c.b)}:c};for(let l=0;l<256;l++){const c=l/255,d=i(c);a[l*4]=d.r,a[l*4+1]=d.g,a[l*4+2]=d.b,a[l*4+3]=255}return a},us=e=>{const o=Math.max(1e3,Math.min(4e4,e))/100;let a,r,n;return o<=66?a=255:(a=o-60,a=329.698727446*Math.pow(a,-.1332047592),a=Math.max(0,Math.min(255,a))),o<=66?(r=o,r=99.4708025861*Math.log(r)-161.1195681661,r=Math.max(0,Math.min(255,r))):(r=o-60,r=288.1221695283*Math.pow(r,-.0755148492),r=Math.max(0,Math.min(255,r))),o>=66?n=255:o<=19?n=0:(n=o-10,n=138.5177312231*Math.log(n)-305.0447927307,n=Math.max(0,Math.min(255,n))),{r:Math.round(a),g:Math.round(r),b:Math.round(n)}},mo=e=>{const{r:o,g:a,b:r}=us(e);return At(o,a,r)},fs=(e,o)=>{const a={};return ls(),ie.getAll().forEach(n=>{const s={},i={};n.state&&Object.assign(s,n.state),Object.entries(n.params).forEach(([c,d])=>{d.composeFrom?d.composeFrom.forEach(u=>{i[u]=c}):s[c]===void 0&&(s[c]=d.default)}),a[n.id]=s;const l=`set${n.id.charAt(0).toUpperCase()+n.id.slice(1)}`;a[l]=c=>{let d=!1;const u={};e(f=>{const p=f[n.id],m={...c};Object.keys(c).forEach(y=>{const b=n.params[y];if(b){const g=c[y];if(g==null)return;b.type==="vec2"&&!(g instanceof je)&&(m[y]=new je(g.x,g.y)),b.type==="vec3"&&!(g instanceof U)&&(m[y]=new U(g.x,g.y,g.z)),b.type==="color"&&!(g instanceof Oe)&&(typeof g=="string"?m[y]=new Oe(g):typeof g=="number"?m[y]=new Oe(g):typeof g=="object"&&"r"in g&&(m[y]=new Oe(g.r,g.g,g.b)))}});const x={...p,...m},C=new Set;return Object.keys(m).forEach(y=>{const b=n.params[y];if(i[y]&&C.add(i[y]),b&&(b.noReset||(d=!0),b.type!=="image"&&(u[n.id]||(u[n.id]={}),u[n.id][y]=x[y]),b.uniform)){const g=x[y];if(b.type==="image"){const h=b.uniform.toLowerCase().includes("env")?"env":"color";g&&typeof g=="string"?(Z.emit("texture",{textureType:h,dataUrl:g}),y==="envMapData"&&x.useEnvMap===!1&&(x.useEnvMap=!0,Z.emit("uniform",{key:"uUseEnvMap",value:1,noReset:!1})),y==="layer1Data"&&x.active===!1&&(x.active=!0,Z.emit("uniform",{key:"uUseTexture",value:1,noReset:!1}))):(Z.emit("texture",{textureType:h,dataUrl:null}),y==="envMapData"&&x.useEnvMap===!0&&(x.useEnvMap=!1,Z.emit("uniform",{key:"uUseEnvMap",value:0,noReset:!1})),y==="layer1Data"&&x.active===!0&&(x.active=!1,Z.emit("uniform",{key:"uUseTexture",value:0,noReset:!1})))}else if(b.type==="gradient"){const h=ho(g);Z.emit("uniform",{key:b.uniform,value:{isGradientBuffer:!0,buffer:h},noReset:!!b.noReset})}else{let h=g;b.type==="boolean"&&(h=g?1:0),b.type==="color"&&!(h instanceof Oe)&&(h=new Oe(h)),Z.emit("uniform",{key:b.uniform,value:h,noReset:!!b.noReset})}}}),C.forEach(y=>{const b=n.params[y];if(b&&b.composeFrom&&b.uniform){const g=b.composeFrom.map(h=>x[h]);if(b.type==="gradient"){const h=x[y];if(h){const v=ho(h);Z.emit("uniform",{key:b.uniform,value:{isGradientBuffer:!0,buffer:v},noReset:!!b.noReset}),b.noReset||(d=!0)}}else if(b.type==="vec2"){const h=new je(g[0],g[1]);Z.emit("uniform",{key:b.uniform,value:h,noReset:!!b.noReset}),b.noReset||(d=!0)}else if(b.type==="vec3"){const h=new U(g[0],g[1],g[2]);Z.emit("uniform",{key:b.uniform,value:h,noReset:!!b.noReset}),b.noReset||(d=!0)}}}),{[n.id]:x}}),Object.keys(u).length>0&&Z.emit("config",u),d&&Z.emit("reset_accum",void 0)},n.actions&&Object.entries(n.actions).forEach(([c,d])=>{a[c]=u=>{const p=o()[n.id],m=d(p,u);m&&Object.keys(m).length>0&&(e({[n.id]:{...p,...m}}),Z.emit("reset_accum",void 0))}})}),a};class Da{constructor(o,a=null){J(this,"defaultState");J(this,"dictionary");J(this,"reverseDictCache",new Map);this.defaultState=o,this.dictionary=a}encode(o){try{const a=this.getDiff(o,this.defaultState);if(!a||Object.keys(a).length===0)return"";let r=this.quantize(a);if(!r||Object.keys(r).length===0)return"";this.dictionary&&(r=this.applyDictionary(r,this.dictionary,!0));const n=JSON.stringify(r),s=eo.deflate(n),i=Array.from(s).map(c=>String.fromCharCode(c)).join("");return btoa(i).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}catch(a){return console.error("UrlStateEncoder: Error encoding",a),""}}decode(o){try{if(!o)return null;let a=o.replace(/-/g,"+").replace(/_/g,"/");for(;a.length%4;)a+="=";const r=atob(a),n=new Uint8Array(r.length);for(let l=0;l<r.length;l++)n[l]=r.charCodeAt(l);const s=eo.inflate(n,{to:"string"});let i=JSON.parse(s);return this.dictionary&&(i=this.applyDictionary(i,this.dictionary,!1)),this.deepMerge({...this.defaultState},i)}catch(a){return console.error("UrlStateEncoder: Error decoding",a),null}}getReverseDict(o){if(this.reverseDictCache.has(o))return this.reverseDictCache.get(o);const a={};return Object.keys(o).forEach(r=>{const n=o[r];typeof n=="string"?a[n]=r:a[n._alias]=r}),this.reverseDictCache.set(o,a),a}applyDictionary(o,a,r){if(!o||typeof o!="object"||Array.isArray(o))return o;const n={};if(r)Object.keys(o).forEach(s=>{let i=s,l=null;const c=a[s];c&&(typeof c=="string"?i=c:(i=c._alias,l=c.children));const d=o[s];l&&d&&typeof d=="object"&&!Array.isArray(d)?n[i]=this.applyDictionary(d,l,!0):n[i]=d});else{const s=this.getReverseDict(a);Object.keys(o).forEach(i=>{const l=s[i]||i,c=o[i],d=a[l],u=d&&typeof d=="object"?d.children:null;u&&c&&typeof c=="object"&&!Array.isArray(c)?n[l]=this.applyDictionary(c,u,!1):n[l]=c})}return n}isEqual(o,a){if(o===a)return!0;if(o==null||a==null)return o===a;if(typeof o=="number"&&typeof a=="number")return Math.abs(o-a)<1e-4;if(Array.isArray(o)&&Array.isArray(a))return o.length!==a.length?!1:o.every((r,n)=>this.isEqual(r,a[n]));if(typeof o=="object"&&typeof a=="object"){const r=Object.keys(o).filter(s=>!s.startsWith("is")),n=Object.keys(a).filter(s=>!s.startsWith("is"));return r.length!==n.length?!1:r.every(s=>this.isEqual(o[s],a[s]))}return!1}quantize(o){if(typeof o=="string")return o.startsWith("data:image")?void 0:o;if(typeof o=="number")return o===0||Math.abs(o)<1e-9?0:parseFloat(o.toFixed(5));if(Array.isArray(o))return o.map(a=>this.quantize(a));if(o!==null&&typeof o=="object"){const a={};let r=!1;const n=Object.keys(o).filter(s=>!s.startsWith("is"));for(const s of n){const i=this.quantize(o[s]);i!==void 0&&(a[s]=i,r=!0)}return r?a:void 0}return o}getDiff(o,a){if(this.isEqual(o,a))return;if(typeof o!="object"||o===null||typeof a!="object"||a===null||Array.isArray(o))return o;const r={};let n=!1;return Object.keys(o).forEach(s=>{if(s.startsWith("is")||s==="histogramData"||s==="interactionSnapshot"||s==="liveModulations"||s.endsWith("Stack"))return;const i=this.getDiff(o[s],a[s]);i!==void 0&&(r[s]=i,n=!0)}),n?r:void 0}deepMerge(o,a){if(typeof a!="object"||a===null)return a;const r={...o};return Object.keys(a).forEach(n=>{typeof a[n]=="object"&&a[n]!==null&&!Array.isArray(a[n])?r[n]=this.deepMerge(o[n]||{},a[n]):r[n]=a[n]}),r}}const ps=(e,o)=>({isPlaying:!1,isRecording:!1,isScrubbing:!1,recordCamera:!0,isCameraInteracting:!1,currentFrame:0,fps:30,durationFrames:300,zoomLevel:1,loopMode:"Loop",isArmingModulation:!1,isRecordingModulation:!1,recordingSnapshot:null,play:()=>{const a=o();if(a.currentFrame>=a.durationFrames-.1&&e({currentFrame:0}),a.isArmingModulation){a.snapshot();const r=JSON.parse(JSON.stringify(a.sequence));e({isRecordingModulation:!0,isArmingModulation:!1,recordingSnapshot:r,isPlaying:!0,currentFrame:0})}else e({isPlaying:!0})},pause:()=>e({isPlaying:!1,isRecordingModulation:!1,recordingSnapshot:null}),stop:()=>e({isPlaying:!1,currentFrame:0,isRecordingModulation:!1,recordingSnapshot:null}),toggleRecording:()=>e(a=>({isRecording:!a.isRecording})),toggleRecordCamera:()=>e(a=>({recordCamera:!a.recordCamera})),toggleArmModulation:()=>e(a=>({isArmingModulation:!a.isArmingModulation,isRecording:!1})),stopModulationRecording:()=>e({isRecordingModulation:!1,isPlaying:!1,recordingSnapshot:null}),setLoopMode:a=>e({loopMode:a}),setIsScrubbing:a=>e({isScrubbing:a}),setIsCameraInteracting:a=>e({isCameraInteracting:a}),seek:a=>e({currentFrame:Math.max(0,Math.min(o().durationFrames,a))}),setDuration:a=>{e({durationFrames:a})},setFps:a=>{e({fps:a})}}),hs=(e,o)=>({selectedTrackIds:[],selectedKeyframeIds:[],softSelectionRadius:0,softSelectionEnabled:!1,softSelectionType:"S-Curve",bounceTension:.5,bounceFriction:.6,selectTrack:(a,r)=>e(n=>({selectedTrackIds:r?n.selectedTrackIds.includes(a)?n.selectedTrackIds.filter(s=>s!==a):[...n.selectedTrackIds,a]:[a]})),selectTracks:(a,r)=>e(n=>{const s=new Set(n.selectedTrackIds);return r?a.forEach(i=>s.add(i)):a.forEach(i=>s.delete(i)),{selectedTrackIds:Array.from(s)}}),selectKeyframe:(a,r,n)=>e(s=>{const i=`${a}::${r}`;return{selectedKeyframeIds:n?s.selectedKeyframeIds.includes(i)?s.selectedKeyframeIds.filter(l=>l!==i):[...s.selectedKeyframeIds,i]:[i]}}),selectKeyframes:(a,r)=>e(n=>({selectedKeyframeIds:r?Array.from(new Set([...n.selectedKeyframeIds,...a])):a})),deselectAll:()=>e({selectedTrackIds:[],selectedKeyframeIds:[]}),deselectAllKeys:()=>e({selectedKeyframeIds:[]}),setSoftSelection:(a,r)=>e({softSelectionRadius:a,softSelectionEnabled:r}),setSoftSelectionType:a=>e({softSelectionType:a}),setBouncePhysics:(a,r)=>e({bounceTension:a,bounceFriction:r})});let Wa=null,dr=null,st=null;function ms(e){Wa=e}function gs(e){dr=e}function Ne(){return Wa}function Jt(){return dr}function xs(e){st||(st=new Ri),st.position.copy(e.position),st.quaternion.copy(e.quaternion);const o=e;o.fov!==void 0&&(st.fov=o.fov,st.aspect=o.aspect,st.updateProjectionMatrix()),st.updateMatrixWorld()}function ys(){return st||Wa}const Ft=ue(),We={getUnifiedPosition:(e,o)=>new U(o.x+o.xL+e.x,o.y+o.yL+e.y,o.z+o.zL+e.z),getUnifiedFromEngine:()=>{const e=Ne()||Ft.activeCamera;return e?We.getUnifiedPosition(e.position,Ft.sceneOffset):new U},getRotationFromEngine:()=>{const e=Ne()||Ft.activeCamera;return e?e.quaternion.clone():new Te},getDistanceFromEngine:()=>{const e=Ne()||Ft.activeCamera;if(e){const o=e.position.length();if(o>.001)return o}return null},getRotationDegrees:e=>{const o=new Te(e.x,e.y,e.z,e.w),a=new Pe().setFromQuaternion(o);return new U(tt.radToDeg(a.x),tt.radToDeg(a.y),tt.radToDeg(a.z))},teleportPosition:(e,o,a)=>{const r=ke.split(e.x),n=ke.split(e.y),s=ke.split(e.z),i={position:{x:0,y:0,z:0},sceneOffset:{x:r.high,y:n.high,z:s.high,xL:r.low,yL:n.low,zL:s.low}};if(o)i.rotation=o;else{const l=Ne()||Ft.activeCamera;if(l){const c=l.quaternion;i.rotation={x:c.x,y:c.y,z:c.z,w:c.w}}}a!==void 0&&(i.targetDistance=a),Z.emit(fe.CAMERA_TELEPORT,i)},teleportRotation:e=>{if(isNaN(e.x)||isNaN(e.y)||isNaN(e.z))return;const o=new Pe(tt.degToRad(e.x),tt.degToRad(e.y),tt.degToRad(e.z)),a=new Te().setFromEuler(o),r=We.getUnifiedFromEngine(),n=ke.split(r.x),s=ke.split(r.y),i=ke.split(r.z);Z.emit(fe.CAMERA_TELEPORT,{position:{x:0,y:0,z:0},rotation:{x:a.x,y:a.y,z:a.z,w:a.w},sceneOffset:{x:n.high,y:s.high,z:i.high,xL:n.low,yL:s.low,zL:i.low}})}};function ur(e,o,a,r,n){const s=1-e,i=e*e,l=s*s,c=l*s,d=i*e;return c*o+3*l*e*a+3*s*i*r+d*n}function go(e,o){let a=o[0],r=o[o.length-1];for(let u=0;u<o.length-1;u++)if(e>=o[u].frame&&e<o[u+1].frame){a=o[u],r=o[u+1];break}if(e>=r.frame)return r.value;if(e<=a.frame)return a.value;const n=r.frame-a.frame,s=(e-a.frame)/n;if(a.interpolation==="Step")return a.value;if(a.interpolation==="Linear")return a.value+(r.value-a.value)*s;const i=a.value,l=a.value+(a.rightTangent?a.rightTangent.y:0),c=r.value+(r.leftTangent?r.leftTangent.y:0),d=r.value;return ur(s,i,l,c,d)}function bs(e,o=1){const a=[],r=e[0].frame,n=e[e.length-1].frame,s=Math.max(o,(n-r)/50);for(let i=r;i<=n;i+=s)a.push({t:i,val:go(i,e)});return a.length>0&&a[a.length-1].t<n&&a.push({t:n,val:go(n,e)}),a}function vs(e,o,a){let r=0,n=0,s=0,i=0,l=0,c=0,d=0;for(let y=0;y<e.length;y++){const b=e[y].t,g=1-b,h=e[y].val;c+=h,d+=h*h;const v=3*g*g*b,z=3*g*b*b,M=g*g*g*o+b*b*b*a,w=h-M;r+=v*v,n+=v*z,s+=z*z,i+=w*v,l+=w*z}const u=e.length,f=c/u;if(d/u-f*f<1e-9)return null;const m=r*s-n*n;if(Math.abs(m)<1e-9)return null;const x=(s*i-n*l)/m,C=(r*l-n*i)/m;return{h1:x,h2:C}}function ws(e,o){const a=e.length;if(a<2){const m=e[0].val;return{leftY:m,rightY:m}}const r=e[0].val,n=e[a-1].val,s=n-r,i=r+s*.333,l=r+s*.666,c=vs(e,r,n);let d=i,u=l;c&&(d=c.h1,u=c.h2);const f=i+(d-i)*o,p=l+(u-l)*o;return{leftY:f,rightY:p}}function La(e,o,a,r){if(e.length<2)return;const n=e[0],s=e[e.length-1],i=s.t-n.t,l=e.map(p=>({t:(p.t-n.t)/i,val:p.val})),{leftY:c,rightY:d}=ws(l,r);let u=0,f=-1;if(i<1)u=0;else for(let p=1;p<l.length-1;p++){const m=l[p].t,x=ur(m,n.val,c,d,s.val),C=Math.abs(x-l[p].val);C>u&&(u=C,f=p)}if(u<=a||e.length<=2){const p=o[o.length-1];p&&(p.rightTangent={x:i*.333,y:c-n.val});const m={id:Qe(),frame:s.t,value:s.val,interpolation:"Bezier",brokenTangents:!1,autoTangent:!1,leftTangent:{x:-i*.333,y:d-s.val},rightTangent:{x:1,y:0}};o.push(m)}else{const p=e.slice(0,f+1),m=e.slice(f);La(p,o,a,r),La(m,o,a,r)}}const Ss=(e,o,a=1)=>{if(e.length<2)return e;a=Math.max(0,Math.min(1,a));const r=[...e].sort((l,c)=>l.frame-c.frame),n=bs(r,1),s=[],i=n[0];return s.push({id:Qe(),frame:i.t,value:i.val,interpolation:"Bezier",brokenTangents:!1,autoTangent:!1,leftTangent:{x:-1,y:0},rightTangent:{x:1,y:0}}),La(n,s,o,a),s.length>0&&(s[0].leftTangent={x:-1,y:0},s[s.length-1].rightTangent={x:1,y:0}),s},Ms=4;function fr(e,o,a,r,n){const s=1-e,i=e*e,l=s*s,c=l*s,d=i*e;return c*o+3*l*e*a+3*s*i*r+d*n}function zs(e,o,a,r,n){const s=1-e;return 3*s*s*(a-o)+6*s*e*(r-a)+3*e*e*(n-r)}function Cs(e,o,a,r,n){const s=n-o;if(s<=1e-9)return 0;let i=(e-o)/s;for(let l=0;l<Ms;++l){const c=fr(i,o,a,r,n),d=zs(i,o,a,r,n);if(Math.abs(d)<1e-9)break;const u=c-e;i-=u/d}return Math.max(0,Math.min(1,i))}function ks(e,o,a,r,n,s,i,l,c){const d=o,u=a,f=o+r,p=a+n,m=s+l,x=i+c,C=s,y=i,b=Cs(e,d,f,m,C);return fr(b,u,p,x,y)}const Xe=.333,qe={interpolate:(e,o,a,r=!1)=>{if(o.interpolation==="Step")return o.value;let n=o.value,s=a.value;if(r){const c=Math.PI*2,d=s-n;d>Math.PI?s-=c:d<-Math.PI&&(s+=c)}if(o.interpolation==="Bezier"){const c=o.rightTangent?o.rightTangent.x:(a.frame-o.frame)*Xe,d=o.rightTangent?o.rightTangent.y:0,u=a.leftTangent?a.leftTangent.x:-(a.frame-o.frame)*Xe,f=a.leftTangent?a.leftTangent.y:0;return ks(e,o.frame,n,c,d,a.frame,s,u,f)}const i=a.frame-o.frame;if(i<1e-9)return n;const l=(e-o.frame)/i;return n+(s-n)*l},scaleHandles:(e,o,a,r,n)=>{const s={};if(e.interpolation!=="Bezier")return s;if(o&&e.leftTangent){const i=r-o.frame,l=n-o.frame;if(Math.abs(i)>1e-5&&Math.abs(l)>1e-5){const c=l/i;s.leftTangent={x:e.leftTangent.x*c,y:e.leftTangent.y*c}}}if(a&&e.rightTangent){const i=a.frame-r,l=a.frame-n;if(Math.abs(i)>1e-5&&Math.abs(l)>1e-5){const c=l/i;s.rightTangent={x:e.rightTangent.x*c,y:e.rightTangent.y*c}}}return s},calculateTangents:(e,o,a,r)=>{if(r==="Ease"){const y=o?(e.frame-o.frame)*Xe:10,b=a?(a.frame-e.frame)*Xe:10;return{l:{x:-y,y:0},r:{x:b,y:0}}}if(!o&&!a)return{l:{x:-10,y:0},r:{x:10,y:0}};if(!o){const y=(a.value-e.value)/(a.frame-e.frame),b=(a.frame-e.frame)*Xe;return{l:{x:-10,y:0},r:{x:b,y:b*y}}}if(!a){const y=(e.value-o.value)/(e.frame-o.frame),b=(e.frame-o.frame)*Xe;return{l:{x:-b,y:-b*y},r:{x:10,y:0}}}const n=e.frame-o.frame,s=e.value-o.value,i=n===0?0:s/n,l=a.frame-e.frame,c=a.value-e.value,d=l===0?0:c/l;if(i*d<=0){const y=n*Xe,b=l*Xe;return{l:{x:-y,y:0},r:{x:b,y:0}}}const u=a.frame-o.frame,f=a.value-o.value;let p=u===0?0:f/u;const m=3*Math.min(Math.abs(i),Math.abs(d));Math.abs(p)>m&&(p=Math.sign(p)*m);const x=n*Xe,C=l*Xe;return{l:{x:-x,y:-x*p},r:{x:C,y:C*p}}},constrainHandles:(e,o,a)=>{const r={};if(e.leftTangent&&o){const n=e.frame-o.frame;if(n>.001){const s=n*Xe;if(Math.abs(e.leftTangent.x)>s){const i=s/Math.abs(e.leftTangent.x);r.leftTangent={x:e.leftTangent.x*i,y:e.leftTangent.y*i}}e.leftTangent.x>0&&(r.leftTangent={...r.leftTangent,x:0})}}if(e.rightTangent&&a){const n=a.frame-e.frame;if(n>.001){const s=n*Xe;if(Math.abs(e.rightTangent.x)>s){const i=s/Math.abs(e.rightTangent.x);r.rightTangent={x:e.rightTangent.x*i,y:e.rightTangent.y*i}}e.rightTangent.x<0&&(r.rightTangent={...r.rightTangent,x:0})}}return r},calculateSoftFalloff:(e,o,a)=>{if(e>=o)return 0;const r=e/o;switch(a){case"Linear":return 1-r;case"Dome":return Math.sqrt(1-r*r);case"Pinpoint":return Math.pow(1-r,4);case"S-Curve":return .5*(1+Math.cos(r*Math.PI));default:return 1-r}}},va={updateNeighbors:(e,o)=>{const a=e[o],r=o===e.length-1,n=o-1;if(n>=0){const i={...e[n]};if(e[n]=i,i.interpolation==="Bezier"){const l=a.frame-i.frame;if(i.autoTangent){const c=e[n-1],{l:d,r:u}=qe.calculateTangents(i,c,a,"Auto");i.leftTangent=d,i.rightTangent=u}else{const c=qe.constrainHandles(i,e[n-1],a);Object.assign(i,c)}if(r&&l>1e-4){const c=l*.3,d=i.rightTangent||{x:10,y:0};if(d.x<c){const u=c/Math.max(1e-4,Math.abs(d.x));i.rightTangent={x:c,y:d.y*u}}}}}const s=o+1;if(s<e.length){const i={...e[s]};if(e[s]=i,i.interpolation==="Bezier")if(i.autoTangent){const l=e[s+1],{l:c,r:d}=qe.calculateTangents(i,a,l,"Auto");i.leftTangent=c,i.rightTangent=d}else{const l=qe.constrainHandles(i,a,e[s+1]);Object.assign(i,l)}}},inferInterpolation:(e,o)=>{const a=e.filter(r=>r.frame<o).sort((r,n)=>n.frame-r.frame);return a.length===0||a[0].interpolation==="Linear"?"Linear":a[0].interpolation==="Step"?"Step":"Bezier"}},js=ue(),Ps={durationFrames:300,fps:30,tracks:{}},Ts=(e,o)=>({sequence:Ps,clipboard:null,undoStack:[],redoStack:[],snapshot:()=>{const a=o().sequence,r=JSON.parse(JSON.stringify(a));e(n=>{const s=[...n.undoStack,{type:"SEQUENCE",data:r}];return{undoStack:s.length>50?s.slice(1):s,redoStack:[]}})},undo:()=>{const{undoStack:a,redoStack:r,sequence:n}=o();if(a.length===0)return!1;const s=a[a.length-1],i=a.slice(0,-1),c={type:"SEQUENCE",data:JSON.parse(JSON.stringify(n))};return e({sequence:s.data,undoStack:i,redoStack:[c,...r]}),!0},redo:()=>{const{undoStack:a,redoStack:r,sequence:n}=o();if(r.length===0)return!1;const s=r[0],i=r.slice(1),c={type:"SEQUENCE",data:JSON.parse(JSON.stringify(n))};return e({sequence:s.data,undoStack:[...a,c],redoStack:i}),!0},setSequence:a=>{o().snapshot(),e({sequence:a})},addTrack:(a,r)=>{o().snapshot(),e(n=>n.sequence.tracks[a]?n:{sequence:{...n.sequence,tracks:{...n.sequence.tracks,[a]:{id:a,type:"float",label:r,keyframes:[]}}}})},removeTrack:a=>{o().snapshot(),e(r=>{const n={...r.sequence.tracks};return delete n[a],{sequence:{...r.sequence,tracks:n},selectedTrackIds:r.selectedTrackIds.filter(s=>s!==a)}})},setTrackBehavior:(a,r)=>{o().snapshot(),e(n=>{const s=n.sequence.tracks[a];return s?{sequence:{...n.sequence,tracks:{...n.sequence.tracks,[a]:{...s,postBehavior:r}}}}:n})},addKeyframe:(a,r,n,s)=>{e(i=>{const l=i.sequence.tracks[a];if(!l)return i;let c=s||"Bezier";s||(c=va.inferInterpolation(l.keyframes,r));const d=c==="Bezier",u={id:Qe(),frame:r,value:n,interpolation:c,autoTangent:d,brokenTangents:!1},p=[...l.keyframes.filter(x=>Math.abs(x.frame-r)>.001),u].sort((x,C)=>x.frame-C.frame),m=p.findIndex(x=>x.id===u.id);if(c==="Bezier"){const x=m>0?p[m-1]:void 0,C=m<p.length-1?p[m+1]:void 0,{l:y,r:b}=qe.calculateTangents(u,x,C,"Auto");u.leftTangent=y,u.rightTangent=b}return va.updateNeighbors(p,m),{sequence:{...i.sequence,tracks:{...i.sequence.tracks,[a]:{...l,keyframes:p}}}}})},batchAddKeyframes:(a,r,n)=>{e(s=>{const i={...s.sequence.tracks};let l=!1;return r.forEach(({trackId:c,value:d})=>{i[c]||(i[c]={id:c,type:"float",label:c,keyframes:[]},l=!0);const u=i[c],f=[...u.keyframes],p=f.length>0?f[f.length-1]:null,m={id:Qe(),frame:a,value:d,interpolation:n||"Linear",autoTangent:n==="Bezier",brokenTangents:!1};if(p)if(a>p.frame)f.push(m);else if(Math.abs(a-p.frame)<.001)m.id=p.id,f[f.length-1]=m;else{const x=f.filter(C=>Math.abs(C.frame-a)>.001);x.push(m),x.sort((C,y)=>C.frame-y.frame),u.keyframes=x,l=!0;return}else f.push(m);u.keyframes=f,l=!0}),l?{sequence:{...s.sequence,tracks:i}}:s})},removeKeyframe:(a,r)=>{o().snapshot(),e(n=>{const s=n.sequence.tracks[a];return s?{sequence:{...n.sequence,tracks:{...n.sequence.tracks,[a]:{...s,keyframes:s.keyframes.filter(i=>i.id!==r)}}}}:n})},updateKeyframe:(a,r,n)=>{e(s=>{const i=s.sequence.tracks[a];if(!i)return s;const l=i.keyframes.map(c=>c.id===r?{...c,...n}:c).sort((c,d)=>c.frame-d.frame);return{sequence:{...s.sequence,tracks:{...s.sequence.tracks,[a]:{...i,keyframes:l}}}}})},updateKeyframes:a=>{e(r=>{const n={...r.sequence.tracks};return a.forEach(({trackId:s,keyId:i,patch:l})=>{const c=n[s];if(c){const d=c.keyframes.findIndex(u=>u.id===i);if(d!==-1){const u=c.keyframes[d];l.interpolation==="Bezier"&&u.interpolation!=="Bezier"&&(l.autoTangent=!0),c.keyframes[d]={...u,...l}}}}),Object.keys(n).forEach(s=>{n[s].keyframes.sort((i,l)=>i.frame-l.frame)}),{sequence:{...r.sequence,tracks:n}}})},deleteSelectedKeyframes:()=>{o().snapshot(),e(a=>{const r={...a.sequence.tracks},n=new Set(a.selectedKeyframeIds);return Object.keys(r).forEach(s=>{r[s]={...r[s],keyframes:r[s].keyframes.filter(i=>!n.has(`${s}::${i.id}`))}}),{sequence:{...a.sequence,tracks:r},selectedKeyframeIds:[]}})},deleteAllKeys:()=>{o().snapshot(),e(a=>{const r={...a.sequence.tracks};return Object.keys(r).forEach(n=>{r[n]={...r[n],keyframes:[]}}),{sequence:{...a.sequence,tracks:r},selectedKeyframeIds:[]}})},deleteAllTracks:()=>{o().snapshot(),e({sequence:{...o().sequence,tracks:{}},selectedTrackIds:[],selectedKeyframeIds:[]})},setTangents:a=>{o().snapshot(),e(r=>{const n={...r.sequence.tracks};return r.selectedKeyframeIds.forEach(s=>{const[i,l]=s.split("::"),c=n[i];if(c){const d=c.keyframes.findIndex(f=>f.id===l);if(d===-1)return;const u=c.keyframes[d];if(a==="Split")c.keyframes[d]={...u,brokenTangents:!0,autoTangent:!1};else if(a==="Unified"){let f=u.rightTangent,p=u.leftTangent;if(f&&p){const m=Math.sqrt(f.x*f.x+f.y*f.y),x=Math.sqrt(p.x*p.x+p.y*p.y);f={x:-p.x*(m/Math.max(.001,x)),y:-p.y*(m/Math.max(.001,x))}}c.keyframes[d]={...u,rightTangent:f,brokenTangents:!1,autoTangent:!1}}else if(a==="Auto"||a==="Ease"){const f=c.keyframes[d-1],p=c.keyframes[d+1],{l:m,r:x}=qe.calculateTangents(u,f,p,a);c.keyframes[d]={...u,autoTangent:a==="Auto",brokenTangents:!1,leftTangent:m,rightTangent:x}}}}),{sequence:{...r.sequence,tracks:n}}})},setGlobalInterpolation:(a,r)=>{o().snapshot(),e(n=>{const s={...n.sequence.tracks};return Object.keys(s).forEach(i=>{const l=s[i];l.keyframes.length!==0&&l.keyframes.forEach((c,d)=>{if(c.interpolation=a,a==="Bezier"&&r){const u=l.keyframes[d-1],f=l.keyframes[d+1],{l:p,r:m}=qe.calculateTangents(c,u,f,r);c.leftTangent=p,c.rightTangent=m,c.autoTangent=r==="Auto",c.brokenTangents=!1}})}),{sequence:{...n.sequence,tracks:s}}})},copySelectedKeyframes:()=>{const{sequence:a,selectedKeyframeIds:r}=o();if(r.length===0)return;let n=1/0;r.forEach(i=>{var u,f;const[l,c]=i.split("::"),d=(f=(u=a.tracks[l])==null?void 0:u.keyframes.find(p=>p.id===c))==null?void 0:f.frame;d!==void 0&&d<n&&(n=d)});const s=[];r.forEach(i=>{var u;const[l,c]=i.split("::"),d=(u=a.tracks[l])==null?void 0:u.keyframes.find(f=>f.id===c);d&&s.push({relativeFrame:d.frame-n,value:d.value,interpolation:d.interpolation,leftTangent:d.leftTangent,rightTangent:d.rightTangent,originalTrackId:l})}),s.length>0&&e({clipboard:s})},pasteKeyframes:a=>{const{clipboard:r,currentFrame:n}=o();r&&(o().snapshot(),e(s=>{const i={...s.sequence.tracks},l=a!==void 0?a:n;return r.forEach(c=>{const d=i[c.originalTrackId];if(d){const u=l+c.relativeFrame,f={id:Qe(),frame:u,value:c.value,interpolation:c.interpolation,leftTangent:c.leftTangent,rightTangent:c.rightTangent,autoTangent:!1,brokenTangents:!1};d.keyframes=[...d.keyframes.filter(p=>Math.abs(p.frame-u)>.001),f].sort((p,m)=>p.frame-m.frame)}}),{sequence:{...s.sequence,tracks:i}}}))},duplicateSelection:()=>{o().copySelectedKeyframes(),o().pasteKeyframes(o().currentFrame)},loopSelection:a=>{const r=o();if(r.selectedKeyframeIds.length<1)return;r.snapshot();let n=1/0,s=-1/0;if(r.selectedKeyframeIds.forEach(l=>{const[c,d]=l.split("::"),u=r.sequence.tracks[c],f=u==null?void 0:u.keyframes.find(p=>p.id===d);f&&(f.frame<n&&(n=f.frame),f.frame>s&&(s=f.frame))}),n===1/0||s===-1/0)return;const i=Math.max(1,s-n);e(l=>{const c={...l.sequence.tracks};for(let d=1;d<=a;d++){const u=i*d;l.selectedKeyframeIds.forEach(f=>{const[p,m]=f.split("::"),x=c[p];if(!x)return;const C=x.keyframes.find(y=>y.id===m);if(C){const y=C.frame+u,b={...C,id:Qe(),frame:y};x.keyframes=[...x.keyframes.filter(g=>Math.abs(g.frame-y)>.001),b]}})}return Object.values(c).forEach(d=>d.keyframes.sort((u,f)=>u.frame-f.frame)),{sequence:{...l.sequence,tracks:c}}})},captureCameraFrame:(a,r=!1,n)=>{const s=Ne()||js.activeCamera;if(!s)return;r||o().snapshot();const i=We.getUnifiedFromEngine(),l=s.quaternion,c=new Pe().setFromQuaternion(l),d=[{id:"camera.unified.x",val:i.x,label:"Position X"},{id:"camera.unified.y",val:i.y,label:"Position Y"},{id:"camera.unified.z",val:i.z,label:"Position Z"},{id:"camera.rotation.x",val:c.x,label:"Rotation X"},{id:"camera.rotation.y",val:c.y,label:"Rotation Y"},{id:"camera.rotation.z",val:c.z,label:"Rotation Z"}];e(u=>{const f={...u.sequence.tracks},p=f["camera.unified.x"],m=!p||p.keyframes.length===0,x=n||(m?"Linear":"Bezier");return d.forEach(C=>{let y=f[C.id];y||(y={id:C.id,type:"float",label:C.label,keyframes:[],hidden:!1},f[C.id]=y);const b={id:Qe(),frame:a,value:C.val,interpolation:x,autoTangent:x==="Bezier",brokenTangents:!1},h=[...y.keyframes.filter(z=>Math.abs(z.frame-a)>.001),b].sort((z,M)=>z.frame-M.frame),v=h.findIndex(z=>z.id===b.id);if(x==="Bezier"){const z=v>0?h[v-1]:void 0,M=v<h.length-1?h[v+1]:void 0,{l:w,r:j}=qe.calculateTangents(b,z,M,"Auto");b.leftTangent=w,b.rightTangent=j}va.updateNeighbors(h,v),y.keyframes=h}),{sequence:{...u.sequence,tracks:f}}})},simplifySelectedKeys:(a=.01)=>{o().snapshot(),e(r=>{const n=r,s={...n.sequence.tracks},i=new Set(n.selectedKeyframeIds),l={};n.selectedKeyframeIds.forEach(d=>{const[u,f]=d.split("::");l[u]||(l[u]=[]);const p=n.sequence.tracks[u],m=p==null?void 0:p.keyframes.find(x=>x.id===f);m&&l[u].push(m)});const c=[];return Object.entries(l).forEach(([d,u])=>{const f=s[d];if(!f)return;const p={...f};if(s[d]=p,u.length<3)return;const m=u.sort((C,y)=>C.frame-y.frame);p.keyframes=p.keyframes.filter(C=>!i.has(`${d}::${C.id}`));const x=Ss(m,a);p.keyframes=[...p.keyframes,...x].sort((C,y)=>C.frame-y.frame),x.forEach(C=>c.push(`${d}::${C.id}`))}),{sequence:{...n.sequence,tracks:s},selectedKeyframeIds:c}})}}),le=Jo()(tr((e,o,a)=>({...ps(e,o),...hs(e),...Ts(e,o)})));typeof window<"u"&&(window.useAnimationStore=le);const Vt=ue(),Qt=e=>{const o={};return e&&Object.keys(e).forEach(a=>{if(a.startsWith("is"))return;const r=e[a];if(r&&typeof r=="object"&&"isColor"in r)o[a]="#"+r.getHexString();else if(r&&typeof r=="object"&&("isVector2"in r||"isVector3"in r)){const n={...r};delete n.isVector2,delete n.isVector3,o[a]=n}else o[a]=r}),o},pr=e=>{const o=ge.get(e),a=o&&o.defaultPreset?o.defaultPreset:{},r={version:5,name:e,formula:e,features:{}};return ie.getAll().forEach(n=>{const s={};Object.entries(n.params).forEach(([i,l])=>{l.composeFrom||(s[i]=l.default)}),r.features[n.id]=Qt(s)}),a.features&&Object.entries(a.features).forEach(([n,s])=>{r.features[n]?r.features[n]={...r.features[n],...Qt(s)}:r.features[n]=Qt(s)}),a.lights&&(r.features.lighting||(r.features.lighting={}),r.features.lighting.lights=a.lights),a.renderMode&&(r.features.lighting||(r.features.lighting={}),r.features.lighting.renderMode=a.renderMode==="PathTracing"?1:0),r.cameraMode=a.cameraMode||"Orbit",r.quality={aaMode:"Always",aaLevel:1,msaa:1,accumulation:!0,...a.quality||{}},r.lights=[],r.animations=a.animations||[],r.navigation={flySpeed:.5,autoSlow:!0,...a.navigation||{}},r.sceneOffset=a.sceneOffset||{x:0,y:0,z:0,xL:0,yL:0,zL:0},r.cameraPos=a.cameraPos||{x:0,y:0,z:3.5},r.cameraRot=a.cameraRot||{x:0,y:0,z:0,w:1},r.targetDistance=a.targetDistance||3.5,r.duration=a.duration||300,r.sequence=a.sequence||{durationFrames:300,fps:30,tracks:{}},r},Rs=(e,o,a)=>{const r=a(),n=e.features||{};if(e.renderMode&&(n.lighting||(n.lighting={}),n.lighting.renderMode===void 0&&(n.lighting.renderMode=e.renderMode==="PathTracing"?1:0)),n.atmosphere&&!n.ao){const b={};n.atmosphere.aoIntensity!==void 0&&(b.aoIntensity=n.atmosphere.aoIntensity),n.atmosphere.aoSpread!==void 0&&(b.aoSpread=n.atmosphere.aoSpread),n.atmosphere.aoMode!==void 0&&(b.aoMode=n.atmosphere.aoMode),n.atmosphere.aoEnabled!==void 0&&(b.aoEnabled=n.atmosphere.aoEnabled),Object.keys(b).length>0&&(n.ao=b)}if(ie.getAll().forEach(b=>{const g=`set${b.id.charAt(0).toUpperCase()+b.id.slice(1)}`,h=r[g];if(typeof h=="function"){const v=n[b.id],z={};if(b.state&&Object.assign(z,b.state),Object.entries(b.params).forEach(([M,w])=>{if(v&&v[M]!==void 0){let j=v[M];w.type==="vec2"&&j&&!(j instanceof je)?j=new je(j.x,j.y):w.type==="vec3"&&j&&!(j instanceof U)?j=new U(j.x,j.y,j.z):w.type==="color"&&j&&!(j instanceof Oe)&&(j=new Oe(j)),z[M]=j}else if(z[M]===void 0){let j=w.default;j&&typeof j=="object"&&(typeof j.clone=="function"?j=j.clone():Array.isArray(j)?j=[...j]:j={...j}),z[M]=j}}),b.id==="lighting"&&v){if(v.lights)z.lights=v.lights.map(M=>({...M,type:M.type||"Point",rotation:M.rotation||{x:0,y:0,z:0}}));else if(v.light0_posX!==void 0){const M=[];for(let w=0;w<3;w++)if(v[`light${w}_posX`]!==void 0){let j=v[`light${w}_color`]||"#ffffff";j.getHexString&&(j="#"+j.getHexString()),M.push({type:"Point",position:{x:v[`light${w}_posX`],y:v[`light${w}_posY`],z:v[`light${w}_posZ`]},rotation:{x:0,y:0,z:0},color:j,intensity:v[`light${w}_intensity`]??1,falloff:v[`light${w}_falloff`]??0,falloffType:v[`light${w}_type`]?"Linear":"Quadratic",fixed:v[`light${w}_fixed`]??!1,visible:v[`light${w}_visible`]??w===0,castShadow:v[`light${w}_castShadow`]??!0})}M.length>0&&(z.lights=M)}}b.id==="materials"&&v&&v.envMapVisible!==void 0&&v.envBackgroundStrength===void 0&&(z.envBackgroundStrength=v.envMapVisible?1:0),h(z)}}),e.lights&&e.lights.length>0&&r.setLighting){const b=e.lights.map(g=>({...g,type:g.type||"Point",rotation:g.rotation||{x:0,y:0,z:0}}));r.setLighting({lights:b})}e.sequence&&le.getState().setSequence(e.sequence),r.setAnimations(e.animations||[]);const s=e.cameraPos||{x:0,y:0,z:3.5},i=e.sceneOffset||{x:0,y:0,z:0,xL:0,yL:0,zL:0},l=e.targetDistance||3.5,c=e.cameraRot||{x:0,y:0,z:0,w:1},d=i.x+i.xL+s.x,u=i.y+i.yL+s.y,f=i.z+i.zL+s.z,p=ke.split(d),m=ke.split(u),x=ke.split(f),C={x:p.high,y:m.high,z:x.high,xL:p.low,yL:m.low,zL:x.low},y={x:0,y:0,z:0};o({cameraPos:y,cameraRot:c,targetDistance:l,sceneOffset:C,cameraMode:e.cameraMode||a().cameraMode}),Vt.activeCamera&&Vt.virtualSpace&&Vt.virtualSpace.applyCameraState(Vt.activeCamera,{position:y,rotation:c,sceneOffset:C,targetDistance:l}),Z.emit("camera_teleport",{position:y,rotation:c,sceneOffset:C,targetDistance:l}),e.duration&&le.getState().setDuration(e.duration),e.formula==="Modular"&&r.refreshPipeline(),r.refreshHistogram(),Z.emit("reset_accum",void 0)},Is={formula:"Mandelbulb",cameraPos:{x:0,y:0,z:0},cameraRot:{x:0,y:0,z:0,w:1},sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0},targetDistance:3.5,cameraMode:"Orbit"},Fs=(e,o,a={includeAnimations:!0})=>{try{e.quality&&(delete e.quality.aaLevel,delete e.quality.aaMode,delete e.quality.msaa),e.features&&e.features.quality&&delete e.features.quality.resolutionMode,a.includeAnimations===!1&&(delete e.sequence,delete e.animations);const r=pr(e.formula);r.formula="";const n=ie.getDictionary();return new Da(r,n).encode(e,o)}catch(r){return console.error("Sharing: Failed to generate share string",r),""}},hr=e=>{if(!e)return null;try{const o=ie.getDictionary(),r=new Da(Is,o).decode(e);if(r&&r.formula){const n=pr(r.formula);return new Da(n,o).decode(e)}}catch(o){console.error("Sharing: Failed to load share string",o)}return null},wa=ue();class _s{constructor(){J(this,"pendingCam");J(this,"binders",new Map);J(this,"overriddenTracks",new Set);J(this,"lastCameraIndex",-1);J(this,"animStore",null);J(this,"fractalStore",null);this.pendingCam={rot:new Pe,unified:new U,rotDirty:!1,unifiedDirty:!1}}connect(o,a){this.animStore=o,this.fractalStore=a}setOverriddenTracks(o){this.overriddenTracks=o}getBinder(o){if(this.binders.has(o))return this.binders.get(o);let a=()=>{};if(o==="camera.active_index")a=r=>{const n=Math.round(r);if(n!==this.lastCameraIndex){const s=this.fractalStore.getState(),i=s.savedCameras;i&&i[n]&&(s.selectCamera(i[n].id),this.lastCameraIndex=n)}};else if(o.startsWith("camera.")){const r=o.split("."),n=r[1],s=r[2];n==="unified"?a=i=>{this.pendingCam.unified[s]=i,this.pendingCam.unifiedDirty=!0}:n==="rotation"&&(a=i=>{this.pendingCam.rot[s]=i,this.pendingCam.rotDirty=!0})}else if(o.startsWith("lights.")){const r=o.split("."),n=parseInt(r[1]),s=r[2];let i="";s==="position"?i=`pos${r[3].toUpperCase()}`:s==="color"?i="color":i=s;const l=`lighting.light${n}_${i}`;return this.getBinder(l)}else if(o.startsWith("lighting.light")){const r=o.match(/lighting\.light(\d+)_(\w+)/);if(r){const n=parseInt(r[1]),s=r[2],i=this.fractalStore.getState();if(s==="intensity")a=l=>i.updateLight({index:n,params:{intensity:l}});else if(s==="falloff")a=l=>i.updateLight({index:n,params:{falloff:l}});else if(s.startsWith("pos")){const l=s.replace("pos","").toLowerCase();a=c=>{var f;const u=(f=this.fractalStore.getState().lighting)==null?void 0:f.lights[n];if(u){const p={...u.position,[l]:c};i.updateLight({index:n,params:{position:p}})}}}else if(s.startsWith("rot")){const l=s.replace("rot","").toLowerCase();a=c=>{var f;const u=(f=this.fractalStore.getState().lighting)==null?void 0:f.lights[n];if(u){const p={...u.rotation,[l]:c};i.updateLight({index:n,params:{rotation:p}})}}}}}else if(o.includes(".")){const r=o.split("."),n=r[0],s=r[1];if(ie.get(n)){const l=this.fractalStore.getState(),c=`set${n.charAt(0).toUpperCase()+n.slice(1)}`,d=l[c];if(d&&typeof d=="function"){const u=s.match(/^(vec[23][ABC])_(x|y|z)$/);if(u){const f=u[1],p=u[2];a=m=>{var y;const C=(y=this.fractalStore.getState()[n])==null?void 0:y[f];if(C){const b=C.clone();b[p]=m,d({[f]:b})}}}else a=f=>d({[s]:f})}else console.warn(`AnimationEngine: Setter ${c} not found for feature ${n}`)}}else{const r=this.fractalStore.getState(),n="set"+o.charAt(0).toUpperCase()+o.slice(1);typeof r[n]=="function"&&(a=s=>r[n](s))}return this.binders.set(o,a),a}tick(o){if(!this.animStore)return;const a=this.animStore.getState();if(!a.isPlaying)return;const r=a.fps,n=a.currentFrame,s=a.durationFrames,i=a.loopMode,l=o*r;let c=n+l;if(c>=s)if(i==="Once"||a.isRecordingModulation){c=s,this.scrub(s),this.animStore.setState({isPlaying:!1,currentFrame:s}),a.isRecordingModulation&&a.stopModulationRecording();return}else c=0;this.animStore.setState({currentFrame:c}),this.scrub(c)}scrub(o){if(!this.animStore)return;const{sequence:a,isPlaying:r,isRecording:n,recordCamera:s}=this.animStore.getState(),i=Object.values(a.tracks);this.syncBuffersFromEngine();const l=r&&n&&s;for(let c=0;c<i.length;c++){const d=i[c];if(this.overriddenTracks.has(d.id)||d.keyframes.length===0||d.type!=="float"||d.id.includes("camera.position")||d.id.includes("camera.offset")||l&&d.id.startsWith("camera."))continue;const u=this.interpolate(d,o);this.getBinder(d.id)(u)}this.commitState()}syncBuffersFromEngine(){const o=Ne()||wa.activeCamera;if(o){this.pendingCam.rot.setFromQuaternion(o.quaternion);const a=wa.sceneOffset;this.pendingCam.unified.set(a.x+a.xL+o.position.x,a.y+a.yL+o.position.y,a.z+a.zL+o.position.z),this.pendingCam.rotDirty=!1,this.pendingCam.unifiedDirty=!1}}interpolate(o,a){const r=o.keyframes;if(r.length===0)return 0;const n=r[0],s=r[r.length-1],i=o.id.startsWith("camera.rotation")||o.id.includes("rot")||o.id.includes("phase")||o.id.includes("twist");if(a>s.frame){const l=o.postBehavior||"Hold";if(l==="Hold")return s.value;if(l==="Continue"){let m=0;if(r.length>1){const x=r[r.length-2];s.interpolation==="Linear"?m=(s.value-x.value)/(s.frame-x.frame):s.interpolation==="Bezier"&&(s.leftTangent&&Math.abs(s.leftTangent.x)>.001?m=s.leftTangent.y/s.leftTangent.x:m=(s.value-x.value)/(s.frame-x.frame))}return s.value+m*(a-s.frame)}const c=s.frame-n.frame;if(c<=.001)return s.value;const d=a-n.frame,u=Math.floor(d/c),f=n.frame+d%c,p=this.evaluateCurveInternal(r,f,i);if(l==="Loop")return p;if(l==="PingPong"){if(u%2===1){const x=s.frame-d%c;return this.evaluateCurveInternal(r,x,i)}return p}if(l==="OffsetLoop"){const m=s.value-n.value;return p+m*u}}return a<n.frame?n.value:this.evaluateCurveInternal(r,a,i)}evaluateCurveInternal(o,a,r){for(let n=0;n<o.length-1;n++){const s=o[n],i=o[n+1];if(a>=s.frame&&a<=i.frame)return qe.interpolate(a,s,i,r)}return o[o.length-1].value}commitState(){if(this.pendingCam.unifiedDirty||this.pendingCam.rotDirty){wa.shouldSnapCamera=!0;const o=new Te().setFromEuler(this.pendingCam.rot),a={x:o.x,y:o.y,z:o.z,w:o.w},r=ke.split(this.pendingCam.unified.x),n=ke.split(this.pendingCam.unified.y),s=ke.split(this.pendingCam.unified.z);Z.emit(fe.CAMERA_TELEPORT,{position:{x:0,y:0,z:0},rotation:a,sceneOffset:{x:r.high,y:n.high,z:s.high,xL:r.low,yL:n.low,zL:s.low}}),this.fractalStore.setState({cameraRot:a})}}}const ea=new _s,xu=(e,o)=>{const a={};e.forEach(i=>a[i.id]=[]),o.forEach(i=>{a[i.source]&&a[i.source].push(i.target)});const r=new Set,n=new Set,s=i=>{if(!r.has(i)){r.add(i),n.add(i);const l=a[i]||[];for(const c of l)if(!r.has(c)&&s(c)||n.has(c))return!0}return n.delete(i),!1};for(const i of e)if(s(i.id))return!0;return!1},xo=(e,o)=>{const a={},r={};e.forEach(i=>{a[i.id]=[],r[i.id]=0}),o.forEach(i=>{a[i.source]&&(a[i.source].push(i.target),r[i.target]=(r[i.target]||0)+1)});const n=[];e.forEach(i=>{r[i.id]===0&&n.push(i.id)});const s=[];for(;n.length>0;){n.sort();const i=n.shift(),l=e.find(c=>c.id===i);if(l){const{position:c,...d}=l;s.push(d)}if(a[i])for(const c of a[i])r[c]--,r[c]===0&&n.push(c)}return s},yo=e=>{const o=e.map((r,n)=>({...r,position:{x:250,y:150+n*200}})),a=[];if(o.length>0){a.push({id:`e-root-start-${o[0].id}`,source:"root-start",target:o[0].id});for(let r=0;r<o.length-1;r++)a.push({id:`e-${o[r].id}-${o[r+1].id}`,source:o[r].id,target:o[r+1].id});a.push({id:`e-${o[o.length-1].id}-root-end`,source:o[o.length-1].id,target:"root-end"})}return{nodes:o,edges:a}},Ds=(e,o)=>{if(e.length!==o.length)return!1;for(let a=0;a<e.length;a++){const r=e[a],n=o[a];if(r.id!==n.id||r.type!==n.type||r.enabled!==n.enabled)return!1;const s=r.bindings||{},i=n.bindings||{},l=Object.keys(s).filter(f=>s[f]!==void 0),c=Object.keys(i).filter(f=>i[f]!==void 0);if(l.length!==c.length)return!1;for(const f of l)if(s[f]!==i[f])return!1;const d=r.condition||{active:!1,mod:0,rem:0},u=n.condition||{active:!1,mod:0,rem:0};if(d.active!==u.active||d.active&&(d.mod!==u.mod||d.rem!==u.rem))return!1}return!0},Ls=(e,o)=>e.length!==o.length?!1:JSON.stringify(e)===JSON.stringify(o),Ea=[{id:"note-1",type:"Note",enabled:!0,params:{},text:`Infinite Repetition
The 'Mod' node tiles space. Here we repeat every 4.0 units on X and Y to create a forest of fractals.`},{id:"mod-1",type:"Mod",enabled:!0,params:{x:4,y:4,z:0}},{id:"note-2",type:"Note",enabled:!0,params:{},text:`Dynamic Rotation
This rotation is bound to 'ParamC' (Slider below). Try dragging it!`},{id:"rot-1",type:"Rotate",enabled:!0,params:{x:0,y:0,z:0},bindings:{z:"ParamC"}},{id:"bulb-1",type:"Mandelbulb",enabled:!0,params:{power:8}},{id:"add-c",type:"AddConstant",enabled:!0,params:{scale:1}}],et=ue(),E=Jo()(tr((e,o,a)=>({...Li(e,o),...Ai(e,o),...Wi(e,o),...Qi(e,o),...fs(e,o),formula:"Mandelbulb",pipeline:Ea,pipelineRevision:1,graph:yo(Ea),projectSettings:{name:"Mandelbulb",version:0},lastSavedHash:null,animations:[],liveModulations:{},setFormula:(r,n={})=>{const s=o(),i=s.formula;if(i===r&&r!=="Modular")return;n.skipDefaultPreset||o().resetParamHistory();const l=s.projectSettings.name;let c=l;if((l===i||l==="Untitled"||l==="Custom Preset")&&(c=r),e({formula:r,projectSettings:{...s.projectSettings,name:c}}),Z.emit(fe.CONFIG,{formula:r,pipeline:s.pipeline,graph:s.graph}),r!=="Modular"&&!n.skipDefaultPreset){const d=ge.get(r),u=d&&d.defaultPreset?JSON.parse(JSON.stringify(d.defaultPreset)):{formula:r};u.features||(u.features={});const f=o();if(ie.getEngineFeatures().forEach(m=>{const x=f[m.id];if(!x)return;const C=u.features[m.id]||{},y={},b=m.engineConfig.toggleParam;x[b]!==void 0&&C[b]===void 0&&(y[b]=x[b]),Object.entries(m.params).forEach(([g,h])=>{h.onUpdate==="compile"&&x[g]!==void 0&&C[g]===void 0&&(y[g]=x[g])}),u.features[m.id]||(u.features[m.id]={}),Object.assign(u.features[m.id],y)}),o().lockSceneOnSwitch){const m=o().getPreset(),x={...m.features||{}},C=u.features||{};C.coreMath&&(x.coreMath=C.coreMath),C.geometry&&(x.geometry=C.geometry);const y={...m,formula:r,features:x};o().loadPreset(y)}else o().loadPreset(u)}o().handleInteractionEnd()},setProjectSettings:r=>e(n=>{const s={...n.projectSettings,...r};return r.name&&r.name!==n.projectSettings.name?(s.version=0,{projectSettings:s,lastSavedHash:null}):{projectSettings:s}}),prepareExport:()=>{const r=o(),n=r.getPreset({includeScene:!0}),{version:s,name:i,...l}=n,c=JSON.stringify(l);if(r.lastSavedHash===null||r.projectSettings.version===0){const d=Math.max(1,r.projectSettings.version+1);return e({projectSettings:{...r.projectSettings,version:d},lastSavedHash:c}),d}if(r.lastSavedHash!==c){const d=r.projectSettings.version+1;return e({projectSettings:{...r.projectSettings,version:d},lastSavedHash:c}),d}return r.projectSettings.version},setAnimations:r=>{const n=o().animations,s=r.map(i=>{const l=n.find(c=>c.id===i.id);if(!l)return i;if(i.period!==l.period&&i.period>0){const c=performance.now()/1e3,d=(c/l.period+l.phase-c/i.period)%1;return{...i,phase:(d+1)%1}}return i});e({animations:s})},setLiveModulations:r=>e({liveModulations:r}),setGraph:r=>{const n=xo(r.nodes,r.edges),s=o();if(Ds(s.pipeline,n))Ls(s.pipeline,n)?e({graph:r}):(e({graph:r,pipeline:n}),Z.emit(fe.CONFIG,{pipeline:n}));else if(s.autoCompile){const i=s.pipelineRevision+1;e({graph:r,pipeline:n,pipelineRevision:i}),Z.emit(fe.CONFIG,{pipeline:n,graph:r,pipelineRevision:i})}else e({graph:r})},setPipeline:r=>{const n=o().pipelineRevision+1,s=yo(r);e({pipeline:r,graph:s,pipelineRevision:n}),Z.emit(fe.CONFIG,{pipeline:r,graph:s,pipelineRevision:n})},refreshPipeline:()=>{const r=o(),n=xo(r.graph.nodes,r.graph.edges),s=r.pipelineRevision+1;e({pipeline:n,pipelineRevision:s}),Z.emit(fe.CONFIG,{pipeline:n,graph:r.graph,pipelineRevision:s})},loadPreset:r=>{o().resetParamHistory();const n=ge.get(r.formula),s=n?n.id:r.formula;e({formula:s}),Z.emit(fe.CONFIG,{formula:s});let i=r.name;(!i||i==="Untitled"||i==="Custom Preset")&&(i=s),e({projectSettings:{name:i,version:0},lastSavedHash:null}),Rs(r,e,o),setTimeout(()=>{const l=o().getPreset({includeScene:!0}),{version:c,name:d,...u}=l;e({lastSavedHash:JSON.stringify(u)})},50)},getPreset:r=>{var l,c;const n=o(),s={version:n.projectSettings.version,name:n.projectSettings.name,formula:n.formula,features:{}};if((r==null?void 0:r.includeScene)!==!1){if(et.activeCamera&&et.virtualSpace){const d=et.virtualSpace.getUnifiedCameraState(et.activeCamera,n.targetDistance);s.cameraPos=d.position,s.cameraRot=d.rotation,s.sceneOffset=d.sceneOffset,s.targetDistance=d.targetDistance}else s.cameraPos=n.cameraPos,s.cameraRot=n.cameraRot,s.sceneOffset=n.sceneOffset,s.targetDistance=n.targetDistance;s.cameraMode=n.cameraMode,s.lights=[],s.renderMode=n.renderMode,s.quality={aaMode:n.aaMode,aaLevel:n.aaLevel,msaa:n.msaaSamples,accumulation:n.accumulation}}ie.getAll().forEach(d=>{const u=n[d.id];u&&(s.features||(s.features={}),s.features[d.id]=Qt(u))}),s.animations=n.animations,n.formula==="Modular"&&(s.graph=n.graph,s.pipeline=n.pipeline);try{const d=(c=(l=window.useAnimationStore)==null?void 0:l.getState)==null?void 0:c.call(l);d&&(s.sequence=d.sequence,s.duration=d.durationFrames)}catch(d){console.warn("Failed to save animation sequence:",d)}return s},getShareString:r=>{const n=o().getPreset({includeScene:!0}),s=o().advancedMode;return Fs(n,s,r)},loadShareString:r=>{const n=hr(r);return n?(o().loadPreset(n),!0):!1}}))),mr=e=>e.isUserInteracting||e.interactionMode!=="none",Aa=e=>{var a;if(e.isGizmoDragging||e.interactionMode!=="none"||e.isExporting)return!0;const o=ie.getAll();for(const r of o)if((a=r.interactionConfig)!=null&&a.blockCamera&&r.interactionConfig.activeParam){const n=e[r.id];if(n&&n[r.interactionConfig.activeParam])return!0}return!1},gr=e=>{const o={formula:e.formula,pipeline:e.pipeline,pipelineRevision:e.pipelineRevision,graph:e.graph,msaaSamples:e.msaaSamples,previewMode:e.previewMode,renderMode:e.renderMode,compilerHardCap:e.compilerHardCap,shadows:!0,quality:e.quality};return ie.getAll().forEach(r=>{const n=e[r.id];n&&(o[r.id]=n)}),o},Es=()=>{const e=E.getState();ea.connect(window.useAnimationStore,E),et.isPaused=e.isPaused,et.setPreviewSampleCap(e.sampleCap),et.onBooted=()=>{const r=E.getState().sceneOffset;if(r){const n={x:r.x,y:r.y,z:r.z,xL:r.xL??0,yL:r.yL??0,zL:r.zL??0};et.setShadowOffset(n),et.post({type:"OFFSET_SET",offset:n})}},E.subscribe(a=>a.isPaused,a=>{et.isPaused=a}),E.subscribe(a=>a.sampleCap,a=>{et.setPreviewSampleCap(a)}),E.subscribe(a=>[a.cameraPos,a.cameraRot,a.sceneOffset,a.targetDistance,a.optics],a=>{var u,f;const[r,n,s,i,l]=a,c=E.getState(),d=(f=(u=window.useAnimationStore)==null?void 0:u.getState)==null?void 0:f.call(u).isPlaying;c.activeCameraId&&!d&&c.updateCamera(c.activeCameraId,{position:r,rotation:n,sceneOffset:s,targetDistance:i,optics:l})},{fireImmediately:!1,equalityFn:(a,r)=>JSON.stringify(a)===JSON.stringify(r)});const o=window.useAnimationStore;if(o){let a=!1;o.subscribe(r=>r.isPlaying,r=>{if(!r&&a){const n=E.getState();n.activeCameraId&&n.updateCamera(n.activeCameraId,{position:n.cameraPos,rotation:n.cameraRot,sceneOffset:n.sceneOffset,targetDistance:n.targetDistance,optics:n.optics})}a=r})}E.subscribe(a=>{var r;return(r=a.lighting)==null?void 0:r.renderMode},a=>{const r=a===1?"PathTracing":"Direct";E.getState().renderMode!==r&&E.setState({renderMode:r})}),Z.on(fe.BUCKET_STATUS,({isRendering:a})=>{E.getState().setIsBucketRendering(a)})};typeof window<"u"&&(window.__store=E);const Pt=()=>t.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:t.jsx("polyline",{points:"6 9 12 15 18 9"})}),As=()=>t.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:t.jsx("polyline",{points:"18 15 12 9 6 15"})}),bo=()=>t.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:t.jsx("polyline",{points:"15 18 9 12 15 6"})}),ta=()=>t.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",children:t.jsx("polyline",{points:"9 18 15 12 9 6"})}),Ns=()=>t.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:t.jsx("polyline",{points:"9 18 15 12 9 6"})}),Bs=()=>t.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:t.jsx("path",{d:"M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"})}),Os=()=>t.jsx("svg",{width:"100%",height:"100%",viewBox:"0 0 10 10",children:t.jsx("path",{d:"M 6 10 L 10 6 L 10 10 Z",fill:"currentColor",opacity:"0.5"})}),xr=()=>t.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("line",{x1:"4",y1:"9",x2:"20",y2:"9"}),t.jsx("line",{x1:"4",y1:"15",x2:"20",y2:"15"})]}),St=()=>t.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:t.jsx("path",{d:"M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"})}),qa=()=>t.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("line",{x1:"18",y1:"6",x2:"6",y2:"18"}),t.jsx("line",{x1:"6",y1:"6",x2:"18",y2:"18"})]}),$s=()=>t.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("line",{x1:"3",y1:"12",x2:"21",y2:"12"}),t.jsx("line",{x1:"3",y1:"6",x2:"21",y2:"6"}),t.jsx("line",{x1:"3",y1:"18",x2:"21",y2:"18"})]}),vo=()=>t.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("path",{d:"M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"}),t.jsx("path",{d:"M17 21v-8H7v8"}),t.jsx("path",{d:"M7 3v5h8"})]}),Na=()=>t.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),t.jsx("polyline",{points:"7 10 12 15 17 10"}),t.jsx("line",{x1:"12",y1:"15",x2:"12",y2:"3"})]}),yr=()=>t.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("circle",{cx:"12",cy:"12",r:"10"}),t.jsx("line",{x1:"12",cy:"16",x2:"12",y2:"12"}),t.jsx("line",{x1:"12",cy:"8",x2:"12.01",y2:"8"})]}),br=()=>t.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("circle",{cx:"12",cy:"12",r:"10"}),t.jsx("path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"}),t.jsx("line",{x1:"12",y1:"17",x2:"12.01",y2:"17"})]}),Hs=()=>t.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[t.jsx("path",{d:"M3 10h10a5 5 0 0 1 5 5v2"}),t.jsx("path",{d:"M7 6l-4 4 4 4"})]}),Gs=()=>t.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[t.jsx("path",{d:"M21 10h-10a5 5 0 0 0 -5 5v2"}),t.jsx("path",{d:"M17 6l4 4 -4 4"})]}),Vs=()=>t.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[t.jsx("path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"}),t.jsx("path",{d:"M3 3v5h5"})]}),pt=()=>t.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",children:t.jsx("polyline",{points:"20 6 9 17 4 12"})}),vr=()=>t.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),t.jsx("polyline",{points:"17 8 12 3 7 8"}),t.jsx("line",{x1:"12",y1:"3",x2:"12",y2:"15"})]}),wr=()=>t.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),t.jsx("polyline",{points:"7 10 12 15 17 10"}),t.jsx("line",{x1:"12",y1:"15",x2:"12",y2:"3"})]}),ua=()=>t.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"4",children:[t.jsx("line",{x1:"12",y1:"5",x2:"12",y2:"19"}),t.jsx("line",{x1:"5",y1:"12",x2:"19",y2:"12"})]}),Tt=()=>t.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:t.jsx("path",{d:"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"})}),Us=()=>t.jsxs("svg",{width:"64",height:"64",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("rect",{x:"5",y:"2",width:"14",height:"20",rx:"2",ry:"2"}),t.jsx("path",{d:"M12 18h.01"})]}),Sr=({className:e})=>t.jsxs("svg",{className:e,xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",children:[t.jsx("circle",{className:"opacity-25",cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"4"}),t.jsx("path",{className:"opacity-75",fill:"currentColor",d:"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"})]}),aa=()=>t.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("polyline",{points:"16 18 22 12 16 6"}),t.jsx("polyline",{points:"8 6 2 12 8 18"})]}),Ws=()=>t.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("circle",{cx:"12",cy:"12",r:"10"}),t.jsx("path",{d:"M8 14s1.5 2 4 2 4-2 4-2"}),t.jsx("line",{x1:"9",y1:"9",x2:"9.01",y2:"9"}),t.jsx("line",{x1:"15",y1:"9",x2:"15.01",y2:"9"})]}),fa=()=>t.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("path",{d:"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"}),t.jsx("polyline",{points:"3.27 6.96 12 12.01 20.73 6.96"}),t.jsx("line",{x1:"12",y1:"22.08",x2:"12",y2:"12"})]}),yu=()=>t.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("rect",{x:"3",y:"3",width:"18",height:"18",rx:"2",strokeDasharray:"4 4"}),t.jsx("path",{d:"M9 12l2 2 4-4"})]}),qs=()=>t.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:t.jsx("rect",{x:"3",y:"3",width:"18",height:"18",rx:"2",ry:"2"})}),Xs=()=>t.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:t.jsx("circle",{cx:"12",cy:"12",r:"10"})}),wo=()=>t.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("path",{d:"M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"}),t.jsx("circle",{cx:"12",cy:"13",r:"4"})]}),Ys=()=>t.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("path",{d:"M12 3v18"}),t.jsx("path",{d:"M3 12h18"}),t.jsx("circle",{cx:"12",cy:"12",r:"3"})]}),Zs=()=>t.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:t.jsx("path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"})}),Xa=()=>t.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("polygon",{points:"12 2 2 7 12 12 22 7 12 2"}),t.jsx("polyline",{points:"2 17 12 22 22 17"}),t.jsx("polyline",{points:"2 12 12 17 22 12"})]}),Qs=()=>t.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("path",{d:"M12 2l-5 9h10l-5 9"}),t.jsx("path",{d:"M12 2v20"})]}),Mr=()=>t.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("path",{d:"M6 2v14a2 2 0 0 0 2 2h14"}),t.jsx("path",{d:"M18 22V8a2 2 0 0 0-2-2H2"})]}),Ks=()=>t.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("rect",{x:"3",y:"3",width:"18",height:"18",rx:"2",ry:"2"}),t.jsx("line",{x1:"9",y1:"9",x2:"15",y2:"15"}),t.jsx("line",{x1:"15",y1:"9",x2:"9",y2:"15"})]}),Js=()=>t.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("rect",{x:"3",y:"3",width:"7",height:"7"}),t.jsx("rect",{x:"14",y:"3",width:"7",height:"7"}),t.jsx("rect",{x:"14",y:"14",width:"7",height:"7"}),t.jsx("path",{d:"M3 14h7v7H3z",fill:"currentColor",stroke:"none"})]}),el=()=>t.jsx("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"currentColor",children:t.jsx("path",{d:"M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"})}),zr=()=>t.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("rect",{x:"3",y:"3",width:"7",height:"7"}),t.jsx("rect",{x:"14",y:"3",width:"7",height:"7"}),t.jsx("rect",{x:"14",y:"14",width:"7",height:"7"}),t.jsx("path",{d:"M10 7h4"}),t.jsx("path",{d:"M17 10v4"})]}),tl=()=>t.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("path",{d:"M12 22V8"}),t.jsx("path",{d:"M5 12H2a10 10 0 0 0 20 0h-3"}),t.jsx("circle",{cx:"12",cy:"5",r:"3"})]}),al=()=>t.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("path",{d:"M12 18V8"}),t.jsx("path",{d:"M5 12H2a10 10 0 0 0 20 0h-3"}),t.jsx("circle",{cx:"12",cy:"5",r:"3"}),t.jsx("line",{x1:"3",y1:"21",x2:"21",y2:"3",stroke:"currentColor",opacity:"0.9"})]}),ol=({status:e})=>{let o="currentColor";e==="keyed"||e==="partial"?o="#f59e0b":(e==="dirty"||e==="keyed-dirty")&&(o="#ef4444");const a=e==="keyed"||e==="keyed-dirty"?o:"none";return t.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:o,strokeWidth:"2.5",children:t.jsx("path",{d:"M12 2L2 12l10 10 10-10L12 2z",fill:a})})},Ba=({active:e})=>t.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"#666",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("path",{d:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"}),t.jsx("path",{d:"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"})]}),bu=()=>t.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[t.jsx("path",{d:"M10 13l-4 4"}),t.jsx("path",{d:"M14 11l4 -4"})]}),vu=({active:e})=>t.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:e?"#f59e0b":"#666",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("polyline",{points:"16 18 22 12 16 6"}),t.jsx("polyline",{points:"8 6 2 12 8 18"})]}),wu=({open:e})=>t.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",className:`transition-transform ${e?"rotate-90":""}`,children:t.jsx("path",{d:"M9 18l6-6-6-6"})}),Cr=()=>t.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("rect",{x:"2",y:"2",width:"20",height:"20",rx:"5",ry:"5"}),t.jsx("path",{d:"M16 8h.01"}),t.jsx("path",{d:"M8 8h.01"}),t.jsx("path",{d:"M8 16h.01"}),t.jsx("path",{d:"M16 16h.01"}),t.jsx("path",{d:"M12 12h.01"})]}),rl=()=>t.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("polyline",{points:"16 3 21 3 21 8"}),t.jsx("line",{x1:"4",y1:"20",x2:"21",y2:"3"}),t.jsx("polyline",{points:"21 16 21 21 16 21"}),t.jsx("line",{x1:"15",y1:"15",x2:"21",y2:"21"}),t.jsx("line",{x1:"4",y1:"4",x2:"9",y2:"9"})]}),il=()=>t.jsx("svg",{width:"12",height:"12",fill:"currentColor",viewBox:"0 0 24 24",children:t.jsx("path",{d:"M8 5v14l11-7z"})}),nl=()=>t.jsx("svg",{width:"12",height:"12",fill:"currentColor",viewBox:"0 0 24 24",children:t.jsx("path",{d:"M6 19h4V5H6v14zm8-14v14h4V5h-4z"})}),Su=()=>t.jsx("svg",{width:"12",height:"12",fill:"currentColor",viewBox:"0 0 24 24",children:t.jsx("path",{d:"M6 6h12v12H6z"})}),Mu=({active:e})=>t.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:e?"currentColor":"none",stroke:"currentColor",strokeWidth:"2",children:t.jsx("circle",{cx:"12",cy:"12",r:"10",stroke:e?"none":"currentColor",fill:e?"#ef4444":"none"})}),zu=({active:e})=>t.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"currentColor",strokeWidth:"2",children:t.jsx("path",{d:"M3 18C3 18 6 5 12 12C18 19 21 5 21 5"})}),Cu=({active:e})=>t.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"currentColor",strokeWidth:"2",children:[t.jsx("rect",{x:"3",y:"8",width:"6",height:"8"}),t.jsx("rect",{x:"15",y:"8",width:"6",height:"8"})]}),ku=()=>t.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("path",{d:"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"}),t.jsx("path",{d:"M4 22v-7"}),t.jsx("path",{d:"M8 4v10"}),t.jsx("path",{d:"M12 5v10"}),t.jsx("path",{d:"M16 4v10"}),t.jsx("path",{d:"M4 8h16"}),t.jsx("path",{d:"M4 12h16"})]}),ju=({active:e})=>t.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("rect",{x:"3",y:"3",width:"18",height:"18",rx:"2",ry:"2"}),t.jsx("line",{x1:"3",y1:"9",x2:"21",y2:"9"}),t.jsx("line",{x1:"3",y1:"15",x2:"21",y2:"15"}),t.jsx("line",{x1:"9",y1:"3",x2:"9",y2:"21"}),t.jsx("line",{x1:"15",y1:"3",x2:"15",y2:"21"})]}),Pu=({mode:e})=>t.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:e==="Loop"||e==="PingPong"?t.jsx("path",{d:"M17 2l4 4-4 4 M3 11v-1a4 4 0 0 1 4-4h14 M7 22l-4-4 4-4 M21 13v1a4 4 0 0 1-4 4H3"}):t.jsx("path",{d:"M5 12h14 M12 5l7 7-7 7"})}),Tu=({active:e,arming:o})=>t.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("path",{d:"M3 12h18",strokeOpacity:e||o?.3:.2}),t.jsx("path",{d:"M3 12 Q 6 2, 9 12 T 15 12 T 21 12",stroke:e?"#ef4444":o?"#fca5a5":"currentColor"}),o&&!e&&t.jsx("circle",{cx:"12",cy:"12",r:"3",fill:"#fca5a5",stroke:"none"})]}),Ru=()=>t.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("polyline",{points:"4 14 10 14 10 20"}),t.jsx("polyline",{points:"20 10 14 10 14 4"}),t.jsx("line",{x1:"14",y1:"10",x2:"21",y2:"3"}),t.jsx("line",{x1:"3",y1:"21",x2:"10",y2:"14"})]}),Iu=()=>t.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("path",{d:"M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"}),t.jsx("circle",{cx:"12",cy:"12",r:"3",fill:"currentColor",stroke:"none"})]}),Fu=({active:e})=>t.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("line",{x1:"4",y1:"20",x2:"20",y2:"20"}),t.jsx("line",{x1:"4",y1:"4",x2:"20",y2:"4"}),t.jsx("polyline",{points:"4 14 8 10 12 14 16 10 20 14"})]}),_u=()=>t.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("path",{d:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"}),t.jsx("path",{d:"M4 12h16"}),t.jsx("path",{d:"M12 4v16"}),t.jsx("path",{d:"M16 16l-4 4-4-4"})]}),Du=({active:e})=>t.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("path",{d:"M19 13l-7-7-7 7"}),t.jsx("path",{d:"M5 19l7-7 7 7"}),t.jsx("path",{d:"M12 5l2-2 2 2-2 2-2-2z",fill:e?"#22d3ee":"none",stroke:"none"}),t.jsx("path",{d:"M12 5l-2-2-2 2 2 2 2-2z",fill:e?"#22d3ee":"none",stroke:"none"})]}),Lu=({active:e})=>t.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:t.jsx("path",{d:"M2 12s3-7 7-7 7 7 7 7 3-7 7-7"})}),Eu=({active:e})=>t.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",className:e?"text-gray-200":"text-gray-600",children:[t.jsx("path",{d:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"}),t.jsx("circle",{cx:"12",cy:"12",r:"3"})]}),Ye={frameCount:0,lastTime:performance.now(),ref:null,workerFrameCount:0};$i(()=>{Ye.workerFrameCount++});const sl=()=>{const e=performance.now();Ye.frameCount++,e-Ye.lastTime>=1e3&&(Ye.ref&&(Ye.ref.innerText=`${Ye.workerFrameCount} FPS`),Ye.frameCount=0,Ye.workerFrameCount=0,Ye.lastTime=e)},ll=()=>{const e=E(i=>i.isPaused),o=E(mr),a=le(i=>i.isCameraInteracting),r=le(i=>i.isScrubbing),n=e&&!o&&!a&&!r,s=S.useRef(null);return S.useEffect(()=>(Ye.ref=s.current,()=>{Ye.ref===s.current&&(Ye.ref=null)}),[]),t.jsx("span",{ref:s,className:`text-[10px] font-mono w-12 text-right transition-colors duration-300 ${n?"text-gray-600":"text-cyan-500/80"}`,title:e?"Rendering Paused (Battery Saver)":"Frames Per Second",children:"-- FPS"})},Ee=e=>{var r;const o=new Set;let a=e;for(;a&&a!==document.body;)(r=a.dataset)!=null&&r.helpId&&a.dataset.helpId.split(/\s+/).forEach(s=>{s&&o.add(s)}),a=a.parentElement;return Array.from(o)},So=ue(),Sa=(e,o,a,r)=>{if(o)return 0;const n=E.getState();n.geometry;const s=n.lighting;if(e.startsWith("camera.unified")){const l=Ne()||So.activeCamera,c=l?l.position:n.cameraPos,d=We.getUnifiedPosition(c,n.sceneOffset);if(e==="camera.unified.x")return d.x;if(e==="camera.unified.y")return d.y;if(e==="camera.unified.z")return d.z}if(e.startsWith("camera.rotation")){const l=Ne()||So.activeCamera;if(l){const c=new Pe().setFromQuaternion(l.quaternion);if(e==="camera.rotation.x")return c.x;if(e==="camera.rotation.y")return c.y;if(e==="camera.rotation.z")return c.z}return 0}if(e.startsWith("lights.")||e.startsWith("lighting.")){const l=e.match(/lighting\.light(\d+)_(\w+)/);if(l){const c=parseInt(l[1]),d=l[2],u=bt(s,c);if(u){if(d==="intensity")return u.intensity;if(d==="falloff")return u.falloff;if(d==="posX")return u.position.x;if(d==="posY")return u.position.y;if(d==="posZ")return u.position.z}}}if(e.includes(".")){const l=e.split("."),c=l[0],d=l[1];if(ie.get(c)){const u=n[c];if(u){if(u[d]!==void 0){const p=u[d];if(typeof p=="boolean")return p?1:0;if(typeof p=="number")return p}const f=d.match(/^(.+)_(x|y|z)$/);if(f){const p=f[1],m=f[2],x=u[p];if(x&&typeof x=="object"&&m in x)return x[m]}}}}const i=n.coreMath;if(i){if(e==="paramA")return i.paramA;if(e==="paramB")return i.paramB;if(e==="paramC")return i.paramC;if(e==="paramD")return i.paramD;if(e==="paramE")return i.paramE;if(e==="paramF")return i.paramF;if(e==="iterations")return i.iterations}return 0},Je=(e,o,a)=>{if(e.length===0)return 0;if(o<=e[0].frame)return e[0].value;if(o>=e[e.length-1].frame)return e[e.length-1].value;for(let r=0;r<e.length-1;r++){const n=e[r],s=e[r+1];if(o>=n.frame&&o<s.frame)return qe.interpolate(o,n,s,a)}return e[0].value},Au=(e,o,a)=>{if(!e)return{angle:0,length:0};const r=a?-e.x:e.x,n=a?-e.y:e.y,s=Math.atan2(n,r)*(180/Math.PI);let i=0;return o&&Math.abs(o)>1e-9?i=Math.abs(e.x)/Math.abs(o)*100:i=Math.abs(e.x)*10,{angle:s,length:i}},Nu=(e,o,a,r)=>{const s=Math.max(-89.9,Math.min(89.9,o))*(Math.PI/180),i=Math.abs(r)<1e-4?10:Math.abs(r),l=(e?-1:1)*(a/100)*i,c=Math.abs(l)*Math.tan(s)*(e?-1:1);return{x:l,y:c}},Bu=qe.constrainHandles,Ou=qe.calculateSoftFalloff,$u=qe.scaleHandles,Hu=(e,o)=>{const a=[],r=Math.PI*2;return e.forEach(n=>{const s=o.tracks[n],i=/rotation|rot|phase|twist/i.test(n)||/param[C-F]/i.test(n);if(s&&s.keyframes.length>1&&i){const l=[...s.keyframes].sort((u,f)=>u.frame-f.frame),d=[...l.map(u=>u.value)];for(let u=1;u<d.length;u++){let f=d[u]-d[u-1];f-=Math.round(f/r)*r,d[u]=d[u-1]+f}l.forEach((u,f)=>{Math.abs(u.value-d[f])>1e-4&&a.push({trackId:n,keyId:u.id,patch:{value:d[f]}})})}}),a},Gu=(e,o,a,r=1,n,s=.5,i=.6)=>{const l=[],c=a.length>0,d=new Set(a),u=r<0,f=Math.abs(r);if(f===0)return n&&e.forEach(y=>{const b=n.tracks[y],g=o.tracks[y];!b||!g||b.keyframes.forEach(h=>{const v=g.keyframes.find(z=>z.id===h.id);v&&(!c||d.has(`${y}::${h.id}`))&&Math.abs(v.value-h.value)>1e-9&&l.push({trackId:y,keyId:h.id,patch:{value:h.value}})})}),l;const p=n||o,m=Math.max(.1,f/2.5),x=2*m*m,C=Math.ceil(f);return e.forEach(y=>{const b=p.tracks[y];if(!b||b.keyframes.length<2)return;const g=/rotation|rot|phase|twist/i.test(y)||/param[C-F]/i.test(y),h=[...b.keyframes].sort((z,M)=>z.frame-M.frame);if(u){const z=Math.min(f,5)/5,M=s*(1-z*.9),w=i*(1-z*.8);let j=h[0].value,k=0;const P=h[0].frame,I=h[h.length-1].frame;let F=Je(h,P+1,g)-j;g&&(F>Math.PI?F-=Math.PI*2:F<-Math.PI&&(F+=Math.PI*2)),k=F;for(let A=P;A<=I;A++){let N=Je(h,A,g);if(g){const q=N-j;q>Math.PI?N-=Math.PI*2:q<-Math.PI&&(N+=Math.PI*2)}const R=(N-j)*M,X=-k*w,L=R+X;k+=L,j+=k;const $=h.find(q=>Math.abs(q.frame-A)<.1);if($)if(!c||d.has(`${y}::${$.id}`))l.push({trackId:y,keyId:$.id,patch:{value:j}});else{j=$.value;let H=Je(h,A+1,g)-j;g&&(H>Math.PI?H-=Math.PI*2:H<-Math.PI&&(H+=Math.PI*2)),k=H}}return}let v=[];if(c){let z=[];h.forEach((M,w)=>{d.has(`${y}::${M.id}`)?z.push(w):z.length>0&&(v.push(z),z=[])}),z.length>0&&v.push(z)}else v.push(h.map((z,M)=>M));v.forEach(z=>{const M=w=>w<0?h[0].value:w>=h.length?h[h.length-1].value:h[w].value;for(let w=0;w<z.length;w++){const j=z[w],k=h[j];let P=0,I=0;for(let _=-C;_<=C;_++){const F=j+_,A=Math.exp(-(_*_)/x);let N=M(F);I+=N*A,P+=A}if(P>0){let _=I/P;const F=o.tracks[y],A=F?F.keyframes.find(N=>N.id===k.id):null;A&&Math.abs(_-A.value)>1e-9&&l.push({trackId:y,keyId:k.id,patch:{value:_}})}}})}),l},Vu=(e,o,a=1)=>{const r=[];return e.forEach(n=>{const s=o.tracks[n];if(!s||s.keyframes.length===0)return;const i=[...s.keyframes].sort((f,p)=>f.frame-p.frame),l=Math.ceil(i[0].frame),c=Math.floor(i[i.length-1].frame),d=n.startsWith("camera.rotation"),u=[];for(let f=l;f<=c;f+=a){const p=Je(i,f,d);u.push({id:Qe(),frame:f,value:p,interpolation:"Linear",autoTangent:!1,brokenTangents:!1})}u.length>0&&r.push({trackId:n,newKeys:u})}),r},cl=(e,o,a)=>{const{sequence:r,currentFrame:n,addTrack:s,addKeyframe:i,removeKeyframe:l,isRecording:c,snapshot:d}=le(),u=(()=>{if(!e||!r.tracks[e])return"none";const x=r.tracks[e],C=x.keyframes.find(y=>Math.abs(y.frame-n)<.1);if(C)return Math.abs(C.value-o)>1e-4?"keyed-dirty":"keyed";{const y=/rotation|rot|phase|twist/i.test(e)||/param[C-F]/i.test(e),b=Je(x.keyframes,n,y);return Math.abs(b-o)>.001?"dirty":"partial"}})();return{status:u,toggleKey:()=>{if(e){if(d(),u==="keyed"){const x=r.tracks[e].keyframes.find(C=>Math.abs(C.frame-n)<.1);x&&l(e,x.id)}else r.tracks[e]||s(e,a),i(e,n,o);Z.emit(fe.TRACK_FOCUS,e)}},autoKeyOnChange:x=>{e&&c&&(r.tracks[e]||s(e,a),i(e,n,x))},autoKeyOnDragStart:()=>{e&&c&&(d(),Z.emit(fe.TRACK_FOCUS,e))}}},Ot=({status:e,onClick:o,className:a=""})=>t.jsx("button",{onClick:r=>{r.stopPropagation(),o()},tabIndex:-1,className:`p-0.5 rounded hover:bg-white/10 transition-colors shrink-0 ${e==="keyed"?"text-amber-400":e==="keyed-dirty"||e==="dirty"?"text-red-500":e==="partial"?"text-orange-500 hover:text-amber-300":"text-gray-600 hover:text-amber-200"} ${a}`,title:e==="none"?"Add Keyframe":e==="dirty"?"Add Key (Value mismatch)":e==="keyed-dirty"?"Update Key (Value changed)":e==="partial"?"Add Key (Track exists)":"Remove Key",children:t.jsx(ol,{status:e})}),dl=e=>{const{value:o,onChange:a,onDragStart:r,onDragEnd:n,step:s=.01,sensitivity:i=1,hardMin:l,hardMax:c,mapping:d,disabled:u,dragThreshold:f=2}=e,[p,m]=S.useState(!1),x=S.useRef(0),C=S.useRef(0),y=S.useRef(!1),b=S.useRef(!1),g=S.useRef(!1),h=S.useRef(null),v=S.useCallback((k,P)=>{let I=s*.5*i;return k&&(I*=10),P&&(I*=.1),I},[s,i]),z=S.useCallback(k=>{if(u||k.button!==0)return;k.preventDefault(),k.stopPropagation(),k.currentTarget.setPointerCapture(k.pointerId),h.current=k.pointerId,x.current=k.clientX;const P=d?d.toDisplay(o):o;C.current=isNaN(P)?0:P,y.current=!1,b.current=k.shiftKey,g.current=k.altKey,m(!0),r==null||r()},[o,d,u,r]),M=S.useCallback(k=>{if(u||!p||!k.currentTarget.hasPointerCapture(k.pointerId))return;const P=k.clientX-x.current;if(Math.abs(P)>f&&(y.current=!0),!y.current)return;k.preventDefault(),k.stopPropagation();const I=b.current!==k.shiftKey,_=g.current!==k.altKey;if(I||_){const R=v(b.current,g.current),X=C.current+P*R;C.current=X,x.current=k.clientX,b.current=k.shiftKey,g.current=k.altKey}const F=v(k.shiftKey,k.altKey);let A=C.current+P*F;l!==void 0&&(A=Math.max(l,A)),c!==void 0&&(A=Math.min(c,A));const N=d?d.fromDisplay(A):A;isNaN(N)||a(N)},[p,u,s,l,c,d,a,v,f]),w=S.useCallback(k=>{u||(k.currentTarget.releasePointerCapture(k.pointerId),h.current=null,m(!1),n==null||n())},[u,n]),j=S.useCallback(()=>{const k=!y.current;return y.current=!1,k},[]);return{isDragging:p,handlePointerDown:z,handlePointerMove:M,handlePointerUp:w,handleClick:j}},ul=e=>{const{value:o,mapping:a,onChange:r,onDragStart:n,onDragEnd:s,disabled:i,mapTextInput:l=!1}=e,[c,d]=S.useState(!1),[u,f]=S.useState(""),p=S.useRef(null),m=S.useCallback(()=>{if(i)return;d(!0);const v=l&&a?a.toDisplay(o):o,z=typeof v=="number"?parseFloat(v.toFixed(6)):v??0;f(String(z)),setTimeout(()=>{p.current&&(p.current.focus(),p.current.select())},10)},[o,a,i,l]),x=S.useCallback(()=>{let v;if(a!=null&&a.parseInput&&l?v=a.parseInput(u):(v=parseFloat(u),isNaN(v)&&(v=null)),v!==null){const z=l&&a?a.fromDisplay(v):v;n==null||n(),r(z),s==null||s()}d(!1)},[u,a,r,n,s,l]),C=S.useCallback(()=>{d(!1)},[]),y=S.useCallback(v=>{f(v)},[]),b=S.useCallback(v=>{v.key==="Enter"?(v.preventDefault(),x()):v.key==="Escape"&&(v.preventDefault(),C()),v.key!=="Tab"&&v.stopPropagation()},[x,C]),g=S.useCallback(()=>{c||m()},[c,m]),h=S.useCallback(()=>{c&&x()},[c,x]);return{isEditing:c,inputValue:u,inputRef:p,startEditing:m,commitEdit:x,cancelEdit:C,handleInputChange:y,handleKeyDown:b,handleFocus:g,handleBlur:h}},kr=e=>e===0||Math.abs(e)<1e-9?"0":parseFloat(e.toFixed(8)).toString(),Mo={toDisplay:e=>e/Math.PI,fromDisplay:e=>e*Math.PI,format:e=>{const o=e/Math.PI,a=Math.abs(o),r=o<0?"-":"";if(a<.001)return"0";if(Math.abs(a-1)<.001)return`${r}π`;if(Math.abs(a-.5)<.001)return`${r}π/2`;if(Math.abs(a-.25)<.001)return`${r}π/4`;if(Math.abs(a-.75)<.001)return`${r}3π/4`;if(Math.abs(a-2)<.001)return`${r}2π`;const n=Math.round(a*3);if(Math.abs(a-n/3)<.001&&n!==0){if(n===1)return`${r}π/3`;if(n===2)return`${r}2π/3`;if(n===3)return`${r}π`;if(n===4)return`${r}4π/3`;if(n===5)return`${r}5π/3`}return`${r}${a.toFixed(2)}π`},parseInput:e=>{const o=e.trim().toLowerCase().replace(/\s/g,"");if(o==="π"||o==="pi")return Math.PI;if(o==="-π"||o==="-pi")return-Math.PI;if(o.includes("π")||o.includes("pi")){const r=o.replace(/[πpi]/g,"");if(r.includes("/")){const[i,l]=r.split("/").map(d=>parseFloat(d)||1);return(o.startsWith("-")?-1:1)*(Math.abs(i)/l)*Math.PI}const n=r?parseFloat(r):1;return isNaN(n)?null:(o.startsWith("-")?-1:1)*Math.abs(n)*Math.PI}const a=parseFloat(o);return isNaN(a)?null:a}},_t={toDisplay:e=>e*(180/Math.PI),fromDisplay:e=>e*(Math.PI/180),format:e=>`${(e*(180/Math.PI)).toFixed(1)}°`,parseInput:e=>{const o=e.trim().replace(/°/g,""),a=parseFloat(o);return isNaN(a)?null:a}},Ma=({value:e,onChange:o,onDragStart:a,onDragEnd:r,step:n=.01,sensitivity:s=1,min:i,max:l,hardMin:c,hardMax:d,mapping:u,format:f,mapTextInput:p,disabled:m=!1,highlight:x=!1,liveValue:C,defaultValue:y})=>{const{isDragging:b,handlePointerDown:g,handlePointerMove:h,handlePointerUp:v,handleClick:z}=dl({value:e,onChange:o,onDragStart:a,onDragEnd:r,step:n,sensitivity:s,hardMin:c,hardMax:d,mapping:u,disabled:m}),{isEditing:M,inputValue:w,inputRef:j,startEditing:k,handleInputChange:P,handleKeyDown:I,handleBlur:_}=ul({value:e,mapping:u,onChange:o,onDragStart:a,onDragEnd:r,disabled:m,mapTextInput:p}),F=ze.useMemo(()=>f?f(e):u!=null&&u.format?u.format(e):kr(e),[e,f,u]),A=ze.useCallback(()=>{!m&&!M&&k()},[m,M,k]),N=ze.useCallback(L=>{if(m)return;z()&&k()},[m,z,k]),X=`
        w-full h-full flex items-center justify-center
        text-xs font-mono select-none transition-colors touch-none outline-none
        ${m?"cursor-not-allowed opacity-50 text-gray-600":"cursor-ew-resize focus:ring-1 focus:ring-cyan-500/50"}
        ${b?"bg-cyan-500/20 text-cyan-300":(b||x||C!==void 0&&!m)&&!m?"text-cyan-400":m?"":"text-gray-300 hover:text-white"}
    `;return M?t.jsx("input",{ref:j,type:"text",value:w,onChange:L=>P(L.target.value),onBlur:_,onKeyDown:I,className:"w-full h-full bg-gray-900 text-white text-xs border-none outline-none font-mono text-center px-1",onClick:L=>L.stopPropagation(),autoFocus:!0}):t.jsx("div",{tabIndex:m?-1:0,onPointerDown:g,onPointerMove:h,onPointerUp:v,onClick:N,onFocus:A,className:X,title:m?"Disabled":"Click to edit, Drag to adjust (Shift=Fast, Alt=Slow)",children:F})},Ya=({value:e,onChange:o,onDragStart:a,onDragEnd:r,step:n=.01,min:s,max:i,hardMin:l,hardMax:c,mapping:d,format:u,overrideText:f,mapTextInput:p,label:m,labelSuffix:x,headerRight:C,showTrack:y=!0,trackPosition:b="below",trackHeight:g=20,variant:h="full",className:v="",defaultValue:z,onReset:M,liveValue:w,showLiveIndicator:j=!0,onContextMenu:k,dataHelpId:P,disabled:I=!1,highlight:_=!1})=>{const F=s!==void 0&&i!==void 0&&s!==i,A=ze.useMemo(()=>{if(!F)return 0;const D=d?d.toDisplay(e):e,T=d?d.toDisplay(s):s,O=d?d.toDisplay(i):i;return Math.max(0,Math.min(100,(D-T)/(O-T)*100))},[e,s,i,d,F]),N=ze.useMemo(()=>{if(!F||w===void 0)return 0;const D=d?d.toDisplay(w):w,T=d?d.toDisplay(s):s,O=d?d.toDisplay(i):i;return Math.max(0,Math.min(100,(D-T)/(O-T)*100))},[w,s,i,d,F]),R=ze.useMemo(()=>{if(!F||z===void 0)return null;const D=d?d.toDisplay(z):z,T=d?d.toDisplay(s):s,O=d?d.toDisplay(i):i;return(D-T)/(O-T)*100},[z,s,i,d,F]),X=ze.useCallback(D=>{if(I)return;const T=parseFloat(D.target.value),O=d?d.fromDisplay(T):T;o(O)},[I,d,o]),L=ze.useCallback(()=>{z!==void 0&&!I&&(a==null||a(),o(z),r==null||r(),M==null||M())},[z,I,o,a,r,M]),$=_||w!==void 0,q=h==="compact";return h==="minimal"?t.jsx("div",{className:v,children:t.jsx(Ma,{value:e,onChange:o,onDragStart:a,onDragEnd:r,step:n,hardMin:l,hardMax:c,mapping:d,format:f?()=>f:u,mapTextInput:p,defaultValue:z,disabled:I,highlight:$})}):q?t.jsxs("div",{className:`relative flex-1 h-9 md:h-[26px] overflow-hidden group transition-all duration-150 ${I?"opacity-70 pointer-events-none":""} ${v}`,onContextMenu:k,"data-help-id":P,children:[t.jsx("div",{className:"absolute inset-0 bg-white/[0.12]",style:I?{}:{backgroundImage:"repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.03) 5px, rgba(255,255,255,0.03) 10px)"}}),y&&F&&t.jsx("div",{className:`absolute top-0 bottom-0 left-0 pointer-events-none ${I?"bg-gray-500/20":$?"bg-cyan-500/30":"bg-cyan-500/20"}`,style:{width:`${A}%`}}),j&&w!==void 0&&!I&&F&&t.jsx("div",{className:"absolute top-0 bottom-0 w-1.5 bg-purple-500 blur-[1px] transition-all duration-75 ease-out z-0",style:{left:`calc(${N}% - 0.75px)`}}),t.jsx("div",{className:"absolute inset-0",children:t.jsx(Ma,{value:e,onChange:o,onDragStart:a,onDragEnd:r,step:n,hardMin:l,hardMax:c,mapping:d,format:f?()=>f:u,mapTextInput:p,defaultValue:z,disabled:I,highlight:$})}),$&&!I&&t.jsx("div",{className:"absolute inset-0 bg-cyan-500/10 pointer-events-none"})]}):t.jsxs("div",{className:`mb-px animate-slider-entry ${I?"opacity-70 pointer-events-none":""} ${v}`,"data-help-id":P,onContextMenu:k,children:[m&&t.jsxs("div",{className:"flex items-stretch bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5",children:[t.jsxs("div",{className:"flex-1 flex items-center gap-2 px-2 min-w-0",children:[C,t.jsxs("label",{className:`text-[10px] font-medium tracking-tight select-none flex items-center gap-2 truncate pointer-events-none ${I?"text-gray-600":"text-gray-400"}`,children:[m,x,w!==void 0&&!I&&t.jsx("span",{className:"w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_4px_#a855f7]"})]})]}),t.jsx("div",{className:"w-1/2 relative bg-white/[0.02] border-l border-white/10 group/num-area touch-none",style:I?{}:{backgroundImage:"repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.03) 5px, rgba(255,255,255,0.03) 10px)"},children:t.jsx(Ma,{value:e,onChange:o,onDragStart:a,onDragEnd:r,step:n,hardMin:l,hardMax:c,mapping:d,format:f?()=>f:u,mapTextInput:p,defaultValue:z,disabled:I,highlight:$})})]}),y&&F&&t.jsxs("div",{className:"relative flex items-center touch-none overflow-hidden",style:{touchAction:"none",height:g},children:[t.jsx("input",{type:"range",min:d?d.toDisplay(s):s,max:d?d.toDisplay(i):i,step:n,value:d?d.toDisplay(e):e,onChange:X,disabled:I,onPointerDown:D=>{I||(D.stopPropagation(),a==null||a())},onPointerUp:()=>{I||r==null||r()},className:`precision-slider w-full h-full appearance-none cursor-pointer focus:outline-none z-10 ${$&&!I?"accent-cyan-500":"accent-gray-400"}`,style:{background:"transparent",touchAction:"none"},tabIndex:-1}),t.jsxs("div",{className:"absolute inset-0 bg-white/10 pointer-events-none",children:[t.jsx("div",{className:`absolute top-0 bottom-0 left-0 ${I?"bg-gray-400/20":"bg-cyan-500/30"}`,style:{width:`${A}%`}}),j&&w!==void 0&&!I&&t.jsx("div",{className:"absolute top-0 bottom-0 w-1.5 bg-purple-500 blur-[1px] transition-all duration-75 ease-out z-0",style:{left:`calc(${N}% - 0.75px)`}})]}),R!==null&&t.jsxs(t.Fragment,{children:[t.jsx("div",{className:"absolute w-0.5 h-full bg-white/40 pointer-events-none z-0 transform -translate-x-1/2",style:{left:`${R}%`}}),t.jsx("button",{onClick:D=>{D.preventDefault(),D.stopPropagation(),L()},className:"absolute top-0 bottom-0 right-0 w-2 bg-gray-500/20 hover:bg-gray-400/50 cursor-pointer z-20 transition-colors border-l border-black/10",title:`Reset to ${z}`,"aria-label":"Reset to default",tabIndex:-1})]})]})]})},fl=[{label:"X",color:"bg-red-500",text:"text-red-400",border:"group-focus-within:border-red-500/50",hoverBg:"hover:bg-red-500/20",accent:"#ef4444"},{label:"Y",color:"bg-green-500",text:"text-green-400",border:"group-focus-within:border-green-500/50",hoverBg:"hover:bg-green-500/20",accent:"#22c55e"},{label:"Z",color:"bg-blue-500",text:"text-blue-400",border:"group-focus-within:border-blue-500/50",hoverBg:"hover:bg-blue-500/20",accent:"#3b82f6"}],jr=({value:e,onChange:o,step:a,min:r,max:n,hardMin:s,hardMax:i,highlight:l,overrideText:c,onDragStart:d,onDragEnd:u,sensitivity:f=1,disabled:p=!1})=>t.jsx(Ya,{value:e,onChange:o,onDragStart:d,onDragEnd:u,step:a,min:r,max:n,hardMin:s,hardMax:i,variant:"minimal",disabled:p,highlight:l,overrideText:c,showTrack:!1}),ot=e=>{const{handleInteractionStart:o,handleInteractionEnd:a}=E();return t.jsx(jr,{...e,onDragStart:()=>{o("param"),e.onDragStart&&e.onDragStart()},onDragEnd:()=>{a(),e.onDragEnd&&e.onDragEnd()}})},de=({trackId:e,onKeyToggle:o,defaultValue:a,overrideInputText:r,dataHelpId:n,onChange:s,...i})=>{var M,w,j;const{openContextMenu:l,handleInteractionStart:c,handleInteractionEnd:d}=E(),{status:u,toggleKey:f,autoKeyOnChange:p,autoKeyOnDragStart:m}=cl(e,i.value??0,i.label),x=[];e&&x.push(e),n&&x.push(n),x.push("ui.slider");const C=x.join(" "),y=k=>{if(i.disabled)return;k.preventDefault(),k.stopPropagation();const P=[];a!==void 0&&P.push({label:"Reset to Default",action:()=>{c("param"),e&&m(),s(a),p(a),d()}});const I=Ee(k.currentTarget);l(k.clientX,k.clientY,P,I)},b=k=>{s(k),p(k)},g=()=>{c("param"),m(),i.onDragStart&&i.onDragStart()},h=()=>{d(),i.onDragEnd&&i.onDragEnd()},v=e&&!i.disabled?t.jsx(Ot,{status:u,onClick:()=>{f(),o&&o()}}):void 0;a!==void 0&&!i.disabled&&(t.Fragment,((i.customMapping?i.customMapping.toSlider(a):a)-(((M=i.customMapping)==null?void 0:M.min)??i.min??0))/((((w=i.customMapping)==null?void 0:w.max)??i.max??1)-(((j=i.customMapping)==null?void 0:j.min)??i.min??0))*100,`${a}`);const z=ze.useMemo(()=>{if(i.customMapping)return{toDisplay:i.customMapping.toSlider,fromDisplay:i.customMapping.fromSlider,format:kr,parseInput:k=>{const P=parseFloat(k);return isNaN(P)?null:P}}},[i.customMapping]);return t.jsx(Ya,{label:i.label,value:i.value,onChange:b,onDragStart:g,onDragEnd:h,step:i.step??.01,min:i.min,max:i.max,hardMin:i.hardMin,hardMax:i.hardMax,mapping:z,format:r?()=>r:void 0,mapTextInput:i.mapTextInput,variant:"full",showTrack:!0,trackPosition:"below",disabled:i.disabled,highlight:i.highlight||u!=="none",liveValue:i.liveValue,showLiveIndicator:!0,headerRight:v,labelSuffix:i.labelSuffix,onContextMenu:y,dataHelpId:C,className:i.className,defaultValue:a,onReset:()=>{c("param"),e&&m(),s(a),p(a),d()}})},zo=e=>e.includes("red")?{on:"bg-red-500/30 text-red-300 border-red-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"}:e.includes("green")?{on:"bg-green-500/30 text-green-300 border-green-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"}:e.includes("amber")||e.includes("yellow")?{on:"bg-amber-500/30 text-amber-300 border-amber-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"}:e.includes("purple")?{on:"bg-purple-500/30 text-purple-300 border-purple-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"}:{on:"bg-cyan-500/30 text-cyan-300 border-cyan-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"};function Le({label:e,value:o,onChange:a,options:r,helpId:n,color:s="bg-cyan-600",onLfoToggle:i,isLfoActive:l,icon:c,disabled:d=!1,variant:u="default",labelSuffix:f}){const{openContextMenu:p,handleInteractionStart:m,handleInteractionEnd:x}=E(),C=h=>{if(d)return;const v=Ee(h.currentTarget);v.length>0&&(h.preventDefault(),h.stopPropagation(),p(h.clientX,h.clientY,[],v))};if(u==="dense"&&!r&&typeof o=="boolean"){const h=zo(s);return t.jsxs("div",{className:`flex items-center justify-between px-3 py-1 border-b border-white/5 hover:bg-white/5 transition-colors ${d?"opacity-50 pointer-events-none":""}`,"data-help-id":n,onContextMenu:C,children:[t.jsxs("div",{className:"flex items-center gap-2",children:[c,t.jsx("span",{className:"text-[10px] text-gray-400 font-medium tracking-tight truncate select-none",children:e})]}),t.jsx("button",{onClick:()=>{m("param"),a(!o),x()},className:`px-2 py-0.5 text-[8px] font-bold rounded-sm transition-all border cursor-pointer ${o?h.on:h.off} ${d?"":"hover:brightness-125"}`,children:o?"ON":"OFF"})]})}const y=h=>{d||(m("param"),a(h),x())},b=()=>{d||(m("param"),a(!o),x())},g=zo(s);return r?t.jsxs("div",{className:`mb-px animate-slider-entry ${d?"opacity-50 pointer-events-none":""}`,"data-help-id":n,onContextMenu:C,children:[e&&t.jsxs("div",{className:"flex items-center bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5 px-2 gap-2",children:[c,t.jsx("span",{className:"text-[10px] text-gray-400 font-medium tracking-tight truncate select-none pointer-events-none",children:e})]}),t.jsx("div",{className:`flex h-9 md:h-[26px] overflow-hidden ${e?"rounded-b-sm":"rounded-sm"}`,children:r.map(h=>t.jsx("button",{onClick:()=>y(h.value),disabled:d,className:`
                                flex-1 min-w-0 flex items-center justify-center text-[9px] font-bold border-r border-white/5 last:border-r-0 transition-all truncate
                                ${o===h.value?"bg-cyan-500/30 text-cyan-300 border-cyan-500/40":"bg-white/[0.04] text-gray-600 hover:brightness-125"}
                            `,title:h.tooltip||h.label,children:h.label},String(h.value)))})]}):t.jsx("div",{className:`mb-px animate-slider-entry ${d?"opacity-50 pointer-events-none":""}`,"data-help-id":n,onContextMenu:C,children:t.jsxs("div",{className:`flex items-stretch h-9 md:h-[26px] overflow-hidden rounded-sm ${e?"bg-white/[0.12]":""}`,children:[e&&t.jsxs("div",{className:"flex-1 flex items-center gap-2 px-2 min-w-0 select-none",children:[c,t.jsx("span",{className:"text-[10px] text-gray-400 font-medium tracking-tight truncate pointer-events-none",children:e}),f]}),t.jsxs("div",{className:`flex ${e?"border-l border-white/5":"flex-1"}`,children:[t.jsx("button",{onClick:b,disabled:d,className:`
                            flex items-center justify-center gap-1 px-3 text-[10px] font-bold transition-all border-0 ${o?g.on:g.off} ${d?"opacity-40":"cursor-pointer hover:brightness-125"}
                            ${e?"":"flex-1"}
                        `,children:t.jsx("span",{className:`text-[8px] ${o?"opacity-90":"opacity-50"}`,children:o?"ON":"OFF"})}),i&&t.jsx("button",{onClick:h=>{h.stopPropagation(),d||i()},disabled:d,className:`
                                flex items-center justify-center px-2 text-[10px] font-bold transition-all border-l border-white/5 ${l?"bg-purple-500/30 text-purple-300":"bg-white/[0.04] text-gray-600 hover:brightness-125"}
                            `,title:"LFO",children:t.jsx("span",{className:`text-[8px] ${l?"opacity-90":"opacity-50"}`,children:"LFO"})})]})]})})}const pl={center:{container:"left-1/2 -translate-x-1/2",arrow:"left-1/2 -translate-x-1/2"},start:{container:"left-0",arrow:"left-4"},end:{container:"right-0",arrow:"right-4"}},wt=({children:e,align:o="center",width:a="w-52",className:r="",onClose:n,arrow:s=!0})=>{const i=S.useRef(null);S.useEffect(()=>{if(!n)return;const c=u=>{i.current&&!i.current.contains(u.target)&&n()},d=setTimeout(()=>document.addEventListener("mousedown",c),0);return()=>{clearTimeout(d),document.removeEventListener("mousedown",c)}},[n]);const l=pl[o];return t.jsxs("div",{ref:i,className:`absolute top-full mt-3 ${l.container} ${a} bg-black border border-white/20 rounded-xl p-3 shadow-2xl z-[70] animate-fade-in ${r}`,onClick:c=>c.stopPropagation(),children:[s&&t.jsx("div",{className:`absolute -top-1.5 ${l.arrow} w-3 h-3 bg-black border-t border-l border-white/20 transform rotate-45`}),e]})},Dt=ue(),hl=()=>{const e=E(),[o,a]=S.useState(0);S.useEffect(()=>Z.on(fe.BUCKET_STATUS,s=>{a(s.progress)}),[]);const r=()=>{e.handleInteractionStart("param"),e.isBucketRendering?Dt.stopBucketRender():(e.setBucketUpscale(1),Dt.startBucketRender(!1,{bucketSize:e.bucketSize,bucketUpscale:1,convergenceThreshold:e.convergenceThreshold,accumulation:e.accumulation,samplesPerBucket:e.samplesPerBucket})),e.handleInteractionEnd()},n=()=>{if(e.handleInteractionStart("param"),e.isBucketRendering)Dt.stopBucketRender();else{const s=e.getPreset({includeScene:!0}),i=e.prepareExport();Dt.startBucketRender(!0,{bucketSize:e.bucketSize,bucketUpscale:e.bucketUpscale,convergenceThreshold:e.convergenceThreshold,accumulation:e.accumulation,samplesPerBucket:e.samplesPerBucket},{preset:s,name:e.projectSettings.name,version:i})}e.handleInteractionEnd()};return t.jsx(wt,{width:"w-72",children:t.jsxs("div",{className:"relative space-y-3",children:[t.jsxs("div",{className:"flex items-center justify-between border-b border-white/10 pb-2",children:[t.jsx("span",{className:"text-[10px] font-bold text-gray-400",children:"High Quality Render"}),e.isBucketRendering&&t.jsx("button",{onClick:()=>Dt.stopBucketRender(),className:"text-[9px] font-bold px-2 py-0.5 rounded border border-red-500/50 bg-red-500/20 text-red-300 animate-pulse",children:"Stop"})]}),e.isBucketRendering?t.jsxs("div",{className:"bg-white/5 rounded p-2 mb-2",children:[t.jsxs("div",{className:"flex justify-between text-[9px] text-gray-400 mb-1",children:[t.jsx("span",{children:"Progress"}),t.jsxs("span",{children:[o.toFixed(1),"%"]})]}),t.jsx("div",{className:"w-full h-1.5 bg-black rounded-full overflow-hidden",children:t.jsx("div",{className:"h-full bg-cyan-500 transition-all duration-300 ease-linear",style:{width:`${o}%`}})})]}):t.jsxs("div",{className:"flex gap-2 mb-2",children:[t.jsxs("button",{onClick:r,className:"flex-1 py-2 rounded bg-gray-800 hover:bg-white/10 border border-white/10 text-[9px] font-bold text-gray-300 transition-all hover:border-cyan-500/50 hover:text-cyan-400 flex flex-col items-center gap-1",title:"Refine Viewport (1x)",children:[t.jsx(pt,{}),t.jsx("span",{children:"Refine View"})]}),t.jsxs("button",{onClick:n,className:"flex-1 py-2 rounded bg-cyan-900/30 hover:bg-cyan-800/50 border border-cyan-500/30 text-[9px] font-bold text-cyan-300 transition-all hover:border-cyan-400 flex flex-col items-center gap-1",title:"Render & Save Image",children:[t.jsx(wr,{}),t.jsx("span",{children:"Export Image"})]})]}),t.jsxs("div",{className:`space-y-1 transition-opacity ${e.isBucketRendering?"opacity-50 pointer-events-none":"opacity-100"}`,children:[t.jsx(de,{label:"Convergence Threshold",value:e.convergenceThreshold,min:.01,max:1,step:.01,onChange:e.setConvergenceThreshold,customMapping:{min:0,max:100,toSlider:s=>(Math.log10(s)+2)/2*100,fromSlider:s=>Math.pow(10,s/100*2-2)},overrideInputText:`${e.convergenceThreshold.toFixed(2)}%`}),t.jsx("p",{className:"text-[8px] text-gray-500 -mt-1 px-1 mb-2",children:"Lower = more samples, higher quality. 0.1%=production, 1%=fast"}),t.jsx(de,{label:"Max Samples Per Bucket",value:e.samplesPerBucket,min:16,max:1024,step:16,onChange:e.setSamplesPerBucket,overrideInputText:`${e.samplesPerBucket} max`,highlight:e.samplesPerBucket>=256}),t.jsx("p",{className:"text-[8px] text-gray-500 -mt-1 px-1 mb-2",children:"Safety limit. Tiles stop early if converged."}),t.jsxs("div",{className:"pt-2 border-t border-white/5",children:[t.jsx(de,{label:"Export Scale",value:e.bucketUpscale,min:1,max:8,step:.5,onChange:e.setBucketUpscale,overrideInputText:`${e.bucketUpscale}x`,highlight:e.bucketUpscale>1}),t.jsx("p",{className:"text-[8px] text-gray-500 -mt-1 px-1 mb-2",children:"Resolution multiplier. 2x = 4K from 1080p, 4x = 8K, 8x = 10K+"}),t.jsx("label",{className:"text-[9px] font-bold text-gray-400 block mb-1",children:"Bucket Size"}),t.jsx(Le,{value:e.bucketSize,onChange:e.setBucketSize,options:[{label:"64",value:64},{label:"128",value:128},{label:"256",value:256},{label:"512",value:512}]}),t.jsx("p",{className:"text-[8px] text-gray-500 mt-1 px-1",children:"Smaller = less memory, larger = faster"})]})]})]})})},ml=ue(),gl=({isMobileMode:e,vibrate:o})=>{const a=E(),r=le(L=>L.isPlaying),{handleInteractionStart:n,handleInteractionEnd:s,openContextMenu:i}=E(),l=E(mr),c=le(L=>L.isCameraInteracting),d=le(L=>L.isScrubbing),u=a.isPaused&&!c&&!l&&!d,[f,p]=S.useState(!1),[m,x]=S.useState(!1),[C,y]=S.useState(!1),b=S.useRef(null),g=S.useRef(null),h=S.useRef(null),v=S.useRef(null),[z,M]=S.useState(a.projectSettings.name),[w,j]=S.useState(a.projectSettings.version);S.useEffect(()=>{m&&(M(a.projectSettings.name),j(a.projectSettings.version))},[m,a.projectSettings]),S.useEffect(()=>{const L=$=>{b.current&&!b.current.contains($.target)&&p(!1),h.current&&!h.current.contains($.target)&&x(!1)};return(f||m)&&window.addEventListener("mousedown",L),()=>window.removeEventListener("mousedown",L)},[f,m]);const k=(L,$)=>{L.preventDefault(),L.stopPropagation(),i(L.clientX,L.clientY,[],$)},P=()=>{if(o(5),a.renderRegion){a.setRenderRegion(null);return}a.interactionMode==="selecting_region"?a.setInteractionMode("none"):a.setInteractionMode("selecting_region")},I=a.lighting,_=(I==null?void 0:I.ptEnabled)!==!1,F=async()=>{_&&(o(5),n("param"),Z.emit("is_compiling","Loading Material..."),await new Promise(L=>setTimeout(L,50)),a.setRenderMode(a.renderMode==="PathTracing"?"Direct":"PathTracing"),s())},A=()=>{a.setProjectSettings({name:z,version:w}),x(!1)},N=()=>{o(5);const L=E.getState().isPaused;a.setIsPaused(!L),ml.markInteraction()},R=()=>{v.current&&clearTimeout(v.current),y(!0)},X=()=>{v.current=window.setTimeout(()=>{y(!1)},300)};return t.jsxs("div",{className:"flex items-center gap-6",children:[t.jsxs("div",{className:"flex flex-col leading-none relative",children:[t.jsxs("span",{className:"text-xl font-bold tracking-tighter text-white",children:["G",t.jsx("span",{className:"text-cyan-400",children:"M"}),"T"]}),t.jsx("button",{onClick:()=>x(!0),className:"text-[8px] font-mono text-gray-500 hover:text-cyan-300 transition-colors text-left truncate max-w-[120px]",title:"Click to Rename Project",children:a.projectSettings.name}),m&&t.jsx(wt,{width:"w-48",align:"start",arrow:!1,onClose:()=>x(!1),children:t.jsxs("div",{className:"space-y-3",children:[t.jsxs("div",{children:[t.jsx("label",{className:"text-[9px] text-gray-500 font-bold block mb-1",children:"Project Name"}),t.jsx("input",{type:"text",value:z,onChange:L=>M(L.target.value),className:"w-full bg-gray-900 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500",placeholder:"Enter name...",autoFocus:!0})]}),t.jsxs("div",{className:"flex gap-2",children:[t.jsxs("div",{className:"flex-1",children:[t.jsx("label",{className:"text-[9px] text-gray-500 font-bold block mb-1",children:"Ver"}),t.jsx("div",{className:"h-6 bg-gray-900 border border-white/10 rounded overflow-hidden",children:t.jsx(ot,{value:w,onChange:L=>j(Math.max(1,Math.round(L))),step:1,min:1,max:99})})]}),t.jsx("button",{onClick:A,className:"flex-1 bg-cyan-900/40 hover:bg-cyan-800 text-cyan-300 border border-cyan-500/30 rounded flex items-center justify-center mt-3.5",title:"Save Settings",children:t.jsx(pt,{})})]})]})})]}),t.jsx("div",{className:"h-6 w-px bg-white/10"}),t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsx(ll,{}),r&&t.jsxs("div",{className:"flex items-center gap-1.5 px-2 py-0.5 bg-green-900/30 border border-green-500/30 rounded text-[9px] font-bold text-green-400 animate-pulse",children:[t.jsx("svg",{width:"8",height:"8",viewBox:"0 0 24 24",fill:"currentColor",children:t.jsx("path",{d:"M8 5v14l11-7z"})}),t.jsx("span",{children:"Playing"})]}),!e&&t.jsxs("div",{className:"relative",onMouseEnter:R,onMouseLeave:X,ref:g,children:[t.jsx("button",{onClick:N,className:`p-0.5 rounded transition-colors ${u?"text-amber-400 bg-amber-900/30 border border-amber-500/30":"text-gray-600 hover:text-gray-400"}`,title:a.isPaused?"Resume Rendering":"Pause Rendering (Battery Saver)",children:u?t.jsx(il,{}):t.jsx(nl,{})}),C&&t.jsx(wt,{width:"w-40",children:t.jsxs("div",{className:"mb-1",children:[t.jsx(de,{label:"Auto-Stop (Samples)",value:a.sampleCap,min:0,max:4096,step:32,onChange:a.setSampleCap,overrideInputText:a.sampleCap===0?"Infinite":a.sampleCap.toFixed(0)}),t.jsx("div",{className:"text-[8px] text-gray-500 text-center mt-1",children:"0 = Never Stop"})]})})]}),t.jsx("div",{className:"w-px h-3 bg-white/10 mx-1"}),t.jsx("button",{onClick:()=>{o(5),n("param"),a.setAccumulation(!a.accumulation),s()},onContextMenu:L=>k(L,["quality.tss"]),className:`p-0.5 rounded transition-colors ${a.accumulation?"text-green-400 bg-green-900/30":"text-gray-600 hover:text-gray-400"}`,title:"TSS (Temporal Anti-Aliasing)",children:t.jsx(Xa,{})}),t.jsx("div",{className:"w-px h-3 bg-white/10 mx-1"}),t.jsx("button",{onClick:F,disabled:!_,className:`p-0.5 rounded transition-colors ${_?a.renderMode==="PathTracing"?"text-purple-400 bg-purple-900/30":"text-gray-600 hover:text-gray-400":"text-gray-700 cursor-not-allowed opacity-50"}`,title:_?e?"Enable Path Tracer (Experimental)":"Path Tracer (Global Illumination)":"Path Tracing disabled in Engine Panel",children:t.jsx(Qs,{})}),!e&&t.jsxs(t.Fragment,{children:[t.jsx("button",{onClick:P,className:`p-0.5 rounded transition-colors ${a.interactionMode==="selecting_region"?"text-cyan-400 bg-cyan-900/30 border border-cyan-500/30":a.renderRegion?"text-green-400 bg-green-900/30 border border-green-500/30":"text-gray-600 hover:text-gray-400"}`,title:a.renderRegion?"Clear Region":a.interactionMode==="selecting_region"?"Cancel Selection":"Select Region",children:a.renderRegion?t.jsx(Ks,{}):t.jsx(Mr,{})}),t.jsxs("div",{className:"relative",ref:b,children:[t.jsx("button",{onClick:L=>{L.stopPropagation(),o(5),p(!f)},className:`bucket-toggle-btn p-0.5 rounded transition-colors ${a.isBucketRendering?"text-cyan-400 bg-cyan-900/30 border border-cyan-500/30 animate-pulse":"text-gray-600 hover:text-gray-400"}`,title:"Render!",children:t.jsx(Js,{})}),f&&t.jsx(hl,{})]})]})]})]})};let oa=[];const Lt=e=>{const o=e.toUpperCase();oa=[o,...oa.filter(a=>a!==o)].slice(0,3)},pa=({color:e,onColorChange:o})=>{const[a,r]=S.useState(()=>{const b=lt(e);return b?Ht(b):{h:0,s:0,v:100}}),n=S.useRef(e.toUpperCase()),{openContextMenu:s,handleInteractionStart:i,handleInteractionEnd:l}=E();S.useEffect(()=>{if(e.toUpperCase()!==n.current){const b=lt(e);if(b){const g=Ht(b);r(g),n.current=e.toUpperCase()}}},[e]);const c=b=>{const g={...a,...b};r(g);const h=At(Gt(g.h,g.s,g.v));n.current=h,o(h)},d=()=>{Lt(n.current)},u="linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",f=S.useMemo(()=>`linear-gradient(to right, ${At(Gt(a.h,0,a.v))}, ${At(Gt(a.h,100,a.v))})`,[a.h,a.v]),p=S.useMemo(()=>`linear-gradient(to right, #000, ${At(Gt(a.h,a.s,100))})`,[a.h,a.s]),m=b=>{if(b.button!==0&&b.button!==2)return;b.preventDefault(),b.stopPropagation();const g=[{label:"Actions",action:()=>{},isHeader:!0},{label:`Copy Hex (${e})`,action:()=>navigator.clipboard.writeText(e.toUpperCase())},{label:"Paste Hex",action:async()=>{try{let h=await navigator.clipboard.readText();if(h=h.trim(),h.startsWith("#")||(h="#"+h),/^#[0-9A-F]{6}$/i.test(h)||/^#[0-9A-F]{3}$/i.test(h)){if(h.length===4){const M=h[1],w=h[2],j=h[3];h=`#${M}${M}${w}${w}${j}${j}`}const v=h.toUpperCase(),z=lt(v);z&&(i("param"),r(Ht(z)),n.current=v,o(v),Lt(v),l())}}catch(h){console.warn("Paste failed",h)}}},{label:"Quick Picks",action:()=>{},isHeader:!0},{label:"White (#FFFFFF)",icon:t.jsx("div",{className:"w-3 h-3 rounded-full bg-white border border-gray-600"}),action:()=>{i("param");const h="#FFFFFF";r({h:0,s:0,v:100}),n.current=h,o(h),Lt(h),l()}},{label:"Black (#000000)",icon:t.jsx("div",{className:"w-3 h-3 rounded-full bg-black border border-gray-600"}),action:()=>{i("param");const h="#000000";r({h:0,s:0,v:0}),n.current=h,o(h),Lt(h),l()}}];oa.length>0&&(g.push({label:"History",action:()=>{},isHeader:!0}),oa.forEach(h=>{g.push({label:h,icon:t.jsx("div",{className:"w-3 h-3 rounded-full border border-gray-600",style:{backgroundColor:h}}),action:()=>{i("param");const v=lt(h);v&&(r(Ht(v)),n.current=h,o(h),Lt(h)),l()}})})),s(b.clientX,b.clientY,g,["ui.colorpicker"])},x=b=>{if(b.target.closest(".hsv-stack")){const g=Ee(b.currentTarget);g.length>0&&(b.preventDefault(),b.stopPropagation(),s(b.clientX,b.clientY,[],g))}},C=()=>i("param"),y=()=>l();return t.jsxs("div",{className:"flex flex-row h-[66px] bg-black/40 border border-white/5 overflow-hidden group/picker relative gradient-interactive-element",onMouseUp:d,"data-help-id":"ui.colorpicker",onContextMenu:x,children:[t.jsx("div",{className:"w-8 shrink-0 relative cursor-pointer border-r border-white/10 hover:brightness-110 active:brightness-125 transition-all bg-gray-800",style:{backgroundColor:e},onMouseDown:m,onContextMenu:m,title:"Color Actions & History (Right Click)",children:t.jsx("div",{className:"absolute inset-0 flex items-center justify-center -rotate-90 whitespace-nowrap text-[10px] font-mono font-bold mix-blend-difference text-white opacity-80 group-hover/picker:opacity-100 transition-opacity",children:e})}),t.jsxs("div",{className:"flex-1 flex flex-col gap-[1px] hsv-stack",children:[t.jsx("div",{className:"relative h-[21.3px]",style:{background:u},children:t.jsx("input",{type:"range",min:"0",max:"360",step:"0.1",value:a.h,onChange:b=>c({h:Number(b.target.value)}),onPointerDown:C,onPointerUp:y,className:"precision-slider absolute inset-0 w-full h-full cursor-crosshair"})}),t.jsx("div",{className:"relative h-[21.3px]",style:{background:f},children:t.jsx("input",{type:"range",min:"0",max:"100",step:"0.1",value:a.s,onChange:b=>c({s:Number(b.target.value)}),onPointerDown:C,onPointerUp:y,className:"precision-slider absolute inset-0 w-full h-full cursor-crosshair"})}),t.jsx("div",{className:"relative h-[21.3px]",style:{background:p},children:t.jsx("input",{type:"range",min:"0",max:"100",step:"0.1",value:a.v,onChange:b=>c({v:Number(b.target.value)}),onPointerDown:C,onPointerUp:y,className:"precision-slider absolute inset-0 w-full h-full cursor-crosshair"})})]})]})},Pr=({index:e,value:o,onChange:a,isFixed:r=!1,size:n=140,width:s,height:i})=>{const l=s||n,c=i||n,d=l/2,u=c/2,f=l*.35,p=c*.35,m=S.useRef(null),[x,C]=S.useState(!1),{handleInteractionStart:y,handleInteractionEnd:b}=E(),g=E(H=>H.cameraRot),{sequence:h,currentFrame:v,isPlaying:z,addTrack:M,addKeyframe:w,removeKeyframe:j,snapshot:k,isRecording:P}=le(),I=()=>{const H=new Te().setFromEuler(new Pe(o.x,o.y,o.z,"YXZ"));return new U(0,0,-1).applyQuaternion(H)},_=()=>{let G=I().clone();if(!r){const W=new Te(g.x,g.y,g.z,g.w);G.applyQuaternion(W.clone().invert())}const D=new U(0,0,-1),T=G.angleTo(D),O=T/(Math.PI/2),B=Math.atan2(G.y,G.x),V=-Math.cos(B)*O*f,Y=Math.sin(B)*O*p;return{x:d+V,y:u+Y,isBacklit:T>Math.PI/2}},F=(H,G)=>{if(!m.current)return;const D=m.current.getBoundingClientRect(),T=D.left+l/2,O=D.top+c/2,B=H-T,V=G-O,Y=B/f,W=V/p,K=Math.sqrt(Y*Y+W*W),Q=Math.atan2(W,Y),re=K*(Math.PI/2),te=Math.min(re,Math.PI-.001),ae=Math.sin(te);let we=new U(-ae*Math.cos(Q),ae*Math.sin(Q),-Math.cos(te));if(!r){const Ce=new Te(g.x,g.y,g.z,g.w);we.applyQuaternion(Ce)}const me=new Te().setFromUnitVectors(new U(0,0,-1),we),xe=new Pe().setFromQuaternion(me,"YXZ");a({x:xe.x,y:xe.y,z:xe.z})},A=_(),N=H=>{H.preventDefault(),H.stopPropagation(),y("param"),C(!0),H.target.setPointerCapture(H.pointerId),F(H.clientX,H.clientY)},R=H=>{x&&F(H.clientX,H.clientY)},X=H=>{if(x){if(C(!1),H.target.releasePointerCapture(H.pointerId),P){const G=`lighting.light${e}_rotX`,D=`lighting.light${e}_rotY`,T=`lighting.light${e}_rotZ`;h.tracks[G]||M(G,`Light ${e+1} Pitch`),h.tracks[D]||M(D,`Light ${e+1} Yaw`),h.tracks[T]||M(T,`Light ${e+1} Roll`),w(G,v,o.x),w(D,v,o.y),w(T,v,o.z)}b()}},L=[`lighting.light${e}_rotX`,`lighting.light${e}_rotY`],$=(()=>{let H=!1,G=!1,D=!1;return L.forEach((T,O)=>{const B=h.tracks[T];if(B){H=!0;const V=B.keyframes.find(Y=>Math.abs(Y.frame-v)<.1);if(V&&(G=!0),!z){const Y=O===0?o.x:o.y,W=V?V.value:Je(B.keyframes,v,O===0||O===1);Math.abs(Y-W)>.001&&(D=!0)}}}),H?G?D?"keyed-dirty":"keyed":D?"dirty":"partial":"none"})(),q=()=>{k(),$==="keyed"?L.forEach(H=>{const G=h.tracks[H],D=G==null?void 0:G.keyframes.find(T=>Math.abs(T.frame-v)<.1);D&&j(H,D.id)}):L.forEach((H,G)=>{h.tracks[H]||M(H,G===0?`Light ${e+1} Pitch`:`Light ${e+1} Yaw`),w(H,v,G===0?o.x:o.y)})};return t.jsxs("div",{className:"flex flex-col items-center mb-2",children:[t.jsxs("div",{className:"w-full flex justify-between items-center mb-1 px-1",children:[t.jsx("label",{className:"text-[9px] font-bold text-gray-500",children:"Heliotrope"}),t.jsx(Ot,{status:$,onClick:q})]}),t.jsxs("div",{ref:m,className:"relative cursor-crosshair touch-none rounded-[30px] border border-white/10 shadow-inner group overflow-hidden",style:{width:l,height:c,background:"radial-gradient(circle at center, #0f172a 0%, #020617 80%)"},onPointerDown:N,onPointerMove:R,onPointerUp:X,title:r?"Headlamp Mode: Light is attached to Camera. Center = Camera Forward.":"World Mode: Light is fixed in space. Center = Direction you are looking.",children:[t.jsxs("div",{className:"absolute inset-0 flex items-center justify-center pointer-events-none opacity-20",children:[t.jsx("div",{className:"border border-cyan-500 rounded-full",style:{width:f*2,height:p*2}}),t.jsx("div",{className:"absolute w-full h-px bg-white/20"}),t.jsx("div",{className:"absolute h-full w-px bg-white/20"})]}),t.jsx("div",{className:"absolute top-1 left-1/2 -translate-x-1/2 text-[7px] text-gray-600 font-bold pointer-events-none",children:"TOP"}),t.jsx("div",{className:"absolute bottom-1 left-1/2 -translate-x-1/2 text-[7px] text-gray-600 font-bold pointer-events-none",children:"BTM"}),t.jsx("div",{className:"absolute left-1 top-1/2 -translate-y-1/2 text-[7px] text-gray-600 font-bold pointer-events-none",children:"L"}),t.jsx("div",{className:"absolute right-1 top-1/2 -translate-y-1/2 text-[7px] text-gray-600 font-bold pointer-events-none",children:"R"}),t.jsx("div",{className:`absolute inset-0 rounded-[30px] border-2 border-red-500/30 pointer-events-none transition-opacity duration-300 ${A.isBacklit?"opacity-100 animate-pulse":"opacity-0"}`}),t.jsx("div",{className:`absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full shadow-[0_0_10px_white] pointer-events-none transition-transform duration-75 ${x?"scale-125 bg-white":"bg-yellow-400"} ${A.isBacklit?"border-2 border-red-500":""}`,style:{left:A.x,top:A.y}})]}),t.jsxs("div",{className:"flex gap-2 w-full mt-2 px-1",children:[t.jsxs("div",{className:"flex-1 bg-black/40 rounded border border-white/10 flex items-center px-2 py-1",children:[t.jsx("span",{className:"text-[8px] text-gray-500 font-bold mr-2",children:"Pitch"}),t.jsx(ot,{value:o.x*180/Math.PI,onChange:H=>a({...o,x:H*Math.PI/180}),step:1,min:-180,max:180,overrideText:(o.x*180/Math.PI).toFixed(1)+"°",onDragStart:()=>y("param"),onDragEnd:()=>b()})]}),t.jsxs("div",{className:"flex-1 bg-black/40 rounded border border-white/10 flex items-center px-2 py-1",children:[t.jsx("span",{className:"text-[8px] text-gray-500 font-bold mr-2",children:"Yaw"}),t.jsx(ot,{value:o.y*180/Math.PI,onChange:H=>a({...o,y:H*Math.PI/180}),step:1,min:-180,max:180,overrideText:(o.y*180/Math.PI).toFixed(1)+"°",onDragStart:()=>y("param"),onDragEnd:()=>b()})]})]})]})},xl={primary:"text-[10px] font-bold text-gray-400",secondary:"text-[9px] font-bold text-gray-500",tiny:"text-[8px] text-gray-600"},Me=({children:e,variant:o="primary",className:a="",color:r})=>{const n=xl[o],s=r||"";return t.jsx("span",{className:`${n} ${s} select-none ${a}`,children:e})},yl=ue(),bl=({index:e,color:o,active:a,type:r,rotation:n,onClick:s,onDragStart:i})=>{const c=(()=>{if(!n)return{x:50,y:50};const u=n.y;return{x:50+Math.sin(u)*35,y:50-Math.cos(u)*35}})(),d=Array.from({length:12}).map((u,f)=>f*30);return t.jsxs("div",{className:`group relative flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-all duration-300 touch-none ${a?"opacity-100 scale-100":"opacity-50 hover:opacity-100 scale-90 hover:scale-100"}`,onPointerDown:u=>{u.button===0&&(u.stopPropagation(),i())},onClick:u=>{u.stopPropagation(),s()},children:[!a&&t.jsxs("div",{className:"absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-black border border-white/20 text-[9px] font-bold text-gray-300 px-2 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50",children:["Drag to Screen",t.jsx("div",{className:"absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black border-t border-l border-white/20 transform rotate-45"})]}),t.jsxs("div",{className:"w-8 h-8 relative",children:[a&&t.jsx("div",{className:"absolute inset-0 rounded-full transition-all duration-300",style:{boxShadow:`0 0 ${r==="Directional"?"12px":"20px"} ${o}`,opacity:r==="Directional"?.6:1,backgroundColor:r==="Directional"?"transparent":o}}),a&&r==="Directional"&&t.jsx("div",{className:"absolute inset-0 pointer-events-none",children:d.map(u=>t.jsx("div",{className:"absolute w-px h-[3px] rounded-full",style:{backgroundColor:o,top:"50%",left:"50%",marginTop:"-1.5px",marginLeft:"-0.5px",transform:`rotate(${u}deg) translateY(-17px)`,boxShadow:`0 0 2px ${o}`}},u))}),t.jsx("div",{className:"absolute inset-0 rounded-full border border-white overflow-hidden z-10 shadow-[inset_0_0_6px_rgba(255,255,255,0.4)] isolate",style:{backgroundColor:r==="Directional"?"#000000":o},children:a&&r==="Directional"&&t.jsx("div",{className:"absolute inset-0 w-full h-full",style:{background:`radial-gradient(circle at ${c.x}% ${c.y}%, ${o} 0%, transparent 65%)`,opacity:1}})}),a&&r!=="Directional"&&t.jsx("div",{className:"absolute inset-0 rounded-full border border-white/50 animate-ping opacity-20 pointer-events-none"})]}),t.jsxs(Me,{variant:"tiny",className:"absolute -bottom-4 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap",children:["L",e+1]})]})},vl=({index:e,onClose:o})=>{const a=E(k=>bt(k.lighting,e)),r=E(k=>k.updateLight),n=E(k=>k.removeLight),s=E(k=>k.duplicateLight),{handleInteractionStart:i,handleInteractionEnd:l}=E(),{addTrack:c,addKeyframe:d,currentFrame:u,sequence:f,isPlaying:p}=le(),[m,x]=S.useState(a.useTemperature??!1),[C,y]=S.useState(a.temperature??6500);if(!a.visible)return null;const b=()=>{const k=a.fixed;let P=a.position,I=a.rotation;const _=Ne();if(_)if(a.type==="Point"){const F=yl.sceneOffset;if(k){const A=new U(P.x,P.y,P.z);A.applyQuaternion(_.quaternion),A.add(_.position),P={x:A.x+F.x+(F.xL??0),y:A.y+F.y+(F.yL??0),z:A.z+F.z+(F.zL??0)}}else{const A=new U(P.x-F.x-(F.xL??0),P.y-F.y-(F.yL??0),P.z-F.z-(F.zL??0));A.sub(_.position),A.applyQuaternion(_.quaternion.clone().invert()),P={x:A.x,y:A.y,z:A.z}}}else{const F=new U(0,0,-1).applyEuler(new Pe(I.x,I.y,I.z,"YXZ"));F.applyQuaternion(k?_.quaternion:_.quaternion.clone().invert());const A=new Te().setFromUnitVectors(new U(0,0,-1),F),N=new Pe().setFromQuaternion(A,"YXZ");I={x:N.x,y:N.y,z:N.z}}r({index:e,params:{fixed:!k,position:P,rotation:I}})},g=()=>{["X","Y","Z"].forEach(P=>{const I=`lighting.light${e}_pos${P}`;f.tracks[I]||c(I,`Light ${e+1} Pos ${P}`),d(I,u,a.position[P.toLowerCase()])})},v=(()=>{const k=["X","Y","Z"];let P=!1,I=!1,_=!1;return k.forEach(F=>{const A=`lighting.light${e}_pos${F}`,N=f.tracks[A];if(N){P=!0;const R=N.keyframes.find(X=>Math.abs(X.frame-u)<.1);if(R&&(I=!0),!p){const X=a.position[F.toLowerCase()];let L=0;R?L=R.value:L=Je(N.keyframes,u,!1),Math.abs(L-X)>1e-4&&(_=!0)}}}),P?I?_?"keyed-dirty":"keyed":_?"dirty":"partial":"none"})(),z=Math.max(.01,a.intensity),M=a.falloff/z,w=`lighting.light${e}`,j=k=>{if(k===0)return"0";if(Math.abs(k)<1)return k.toFixed(3);const P=k.toPrecision(5);return P.includes(".")?P.replace(/\.?0+$/,""):P};return t.jsx(wt,{width:"w-52",onClose:o,children:t.jsxs("div",{className:"relative space-y-3",children:[t.jsxs("div",{className:"flex items-center justify-between border-b border-white/10 pb-2",children:[t.jsxs("div",{className:"flex items-center gap-2",children:[a.type==="Point"&&t.jsx(Ot,{status:v,onClick:g}),t.jsxs(Me,{children:["Light ",e+1]})]}),t.jsxs("div",{className:"flex items-center gap-1",children:[t.jsx("button",{onClick:k=>{k.stopPropagation(),i("param"),s(e),l()},className:"p-1 text-gray-400 hover:text-cyan-300 hover:bg-cyan-900/20 rounded transition-colors",title:"Duplicate Light",children:t.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("rect",{x:"9",y:"9",width:"13",height:"13",rx:"2"}),t.jsx("path",{d:"M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"})]})}),t.jsx("button",{onClick:k=>{k.stopPropagation(),i("param"),n(e),l()},className:"p-1 text-red-500 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors",title:"Remove Light",children:t.jsx(St,{})}),t.jsx("button",{onClick:()=>{i("param"),b(),l()},className:`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${a.fixed?"bg-orange-500/20 text-orange-300 border-orange-500/50":"bg-cyan-500/20 text-cyan-300 border-cyan-500/50"}`,children:a.fixed?"ANCHORED":"FLOATING"})]})]}),t.jsxs("div",{className:"space-y-1",children:[a.type==="Directional"&&t.jsx("div",{className:"mb-2",children:t.jsx(Pr,{index:e,value:a.rotation,onChange:k=>r({index:e,params:{rotation:k}}),isFixed:a.fixed,width:180,height:110})}),t.jsx(de,{label:"Intensity",value:a.intensity,min:0,max:100,step:.1,onChange:k=>r({index:e,params:{intensity:k}}),customMapping:{min:0,max:100,toSlider:k=>Math.sqrt(k/100)*100,fromSlider:k=>k*k/100},mapTextInput:!1,overrideInputText:j(a.intensity),trackId:`${w}_intensity`}),a.type!=="Directional"&&t.jsx(de,{label:"Falloff",value:M,min:0,max:10,step:.01,onChange:k=>{const P=k*a.intensity;r({index:e,params:{falloff:P}})},customMapping:{min:0,max:100,toSlider:k=>Math.pow(k/10,1/1.5)*100,fromSlider:k=>Math.pow(k/100,1.5)*10},mapTextInput:!1,overrideInputText:M<1e-4?"Infinite":j(M),trackId:`${w}_falloff`}),a.type!=="Directional"&&t.jsxs("div",{className:"space-y-1",children:[t.jsxs("div",{className:"flex items-center justify-between",children:[t.jsx("label",{className:"text-xs text-gray-400 font-medium",children:"Visible Sphere"}),t.jsx("button",{onClick:()=>{const k=(a.radius??0)>.001;i("param"),r({index:e,params:{radius:k?0:.1}}),l()},className:`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${(a.radius??0)>.001?"bg-cyan-500/20 text-cyan-300 border-cyan-500/50":"bg-white/5 text-gray-400 border-white/20 hover:border-white/40"}`,children:(a.radius??0)>.001?"ON":"OFF"})]}),(a.radius??0)>.001&&t.jsxs(t.Fragment,{children:[t.jsx(de,{label:"Sphere Radius",value:a.radius??.1,min:.01,max:5,step:.01,onChange:k=>r({index:e,params:{radius:k}}),trackId:`${w}_radius`}),t.jsx(de,{label:"Edge Softness",value:a.softness??0,min:0,max:2,step:.01,onChange:k=>r({index:e,params:{softness:k}}),trackId:`${w}_softness`})]})]})]}),t.jsxs("div",{className:"pt-2 border-t border-white/10 space-y-2",children:[t.jsxs("div",{className:"flex items-center gap-1 mb-2",children:[t.jsx("button",{onClick:()=>{x(!1),r({index:e,params:{useTemperature:!1}})},className:`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${m?"bg-white/5 text-gray-400 border-white/20 hover:border-white/40":"bg-cyan-500/20 text-cyan-300 border-cyan-500/50"}`,children:"COLOR"}),t.jsx("button",{onClick:()=>{const k=!m;if(x(k),k){const P=mo(C);r({index:e,params:{color:P,useTemperature:!0,temperature:C}})}else r({index:e,params:{useTemperature:!1}})},className:`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${m?"bg-amber-500/20 text-amber-300 border-amber-500/50":"bg-white/5 text-gray-400 border-white/20 hover:border-white/40"}`,children:"TEMPERATURE"})]}),m?t.jsxs("div",{className:"space-y-1",children:[t.jsxs("div",{className:"flex items-center justify-between",children:[t.jsx("label",{className:"text-[10px] text-gray-400 font-medium",children:"Temperature (K)"}),t.jsx("span",{className:"text-[10px] text-gray-300 font-mono",children:C})]}),t.jsx("input",{type:"range",min:1e3,max:1e4,step:100,value:C,onChange:k=>{const P=parseInt(k.target.value);y(P);const I=mo(P);r({index:e,params:{temperature:P,color:I}})},className:"w-full h-1.5 bg-gradient-to-r from-orange-500 via-yellow-200 to-blue-200 rounded-full appearance-none cursor-pointer",style:{background:"linear-gradient(to right, #ff6b35, #ffcc66, #ffffff, #cce5ff, #66b3ff)"}})]}):t.jsx(pa,{color:a.color,onColorChange:k=>r({index:e,params:{color:k}})}),t.jsxs("div",{className:"flex items-center justify-between pt-1",children:[t.jsx("label",{className:"text-xs text-gray-400 font-medium",children:"Cast Shadows"}),t.jsx("input",{type:"checkbox",checked:a.castShadow,onChange:k=>{i("param"),r({index:e,params:{castShadow:k.target.checked}}),l()},className:"w-3 h-3 accent-cyan-500 bg-gray-800 border-gray-600 rounded cursor-pointer"})]})]})]})})},wl=({targetRef:e,color:o,onChange:a,onClose:r,label:n})=>{const[s,i]=S.useState({x:0,y:0});return S.useLayoutEffect(()=>{if(e.current){const l=e.current.getBoundingClientRect(),c=window.innerWidth,d=window.innerHeight,u=240,f=150;let p=l.right+5,m=l.top;p+u>c&&(p=l.left-u-5),m+f>d&&(m=l.bottom-f),i({x:p,y:m})}},[e]),S.useEffect(()=>{const l=c=>{e.current&&!e.current.contains(c.target)&&(c.target.closest(".picker-popup")||r())};return window.addEventListener("mousedown",l),()=>window.removeEventListener("mousedown",l)},[r,e]),jt.createPortal(t.jsxs("div",{className:"picker-popup fixed z-[9999] bg-black border border-white/20 p-3 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] w-56 animate-fade-in",style:{left:s.x,top:s.y},onMouseDown:l=>l.stopPropagation(),children:[n&&t.jsx("div",{className:"text-[10px] font-bold text-gray-500 mb-2 text-center",children:n}),t.jsx(pa,{color:o,onColorChange:a})]}),document.body)},ra=({color:e,onChange:o,label:a})=>{const[r,n]=S.useState(!1),s=S.useRef(null),i=E(c=>c.openContextMenu),l=c=>{const d=Ee(c.currentTarget);d.unshift("ui.colorpicker"),d.length>0&&(c.preventDefault(),c.stopPropagation(),i(c.clientX,c.clientY,[],d))};return t.jsxs(t.Fragment,{children:[t.jsx("button",{ref:s,onClick:()=>n(!r),onContextMenu:l,className:"w-16 h-6 rounded border border-white/10 shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center overflow-hidden",style:{backgroundColor:e},title:a||"Pick Color",children:t.jsx("div",{className:"text-[8px] font-mono font-bold mix-blend-difference text-white",children:e})}),r&&t.jsx(wl,{targetRef:s,color:e,onChange:o,onClose:()=>n(!1),label:a})]})};function kt({label:e,value:o,options:a,onChange:r,helpId:n,fullWidth:s,className:i="",selectClassName:l="",labelSuffix:c}){const{openContextMenu:d,handleInteractionStart:u,handleInteractionEnd:f}=E(),p=x=>{const C=Ee(x.currentTarget);C.length>0&&(x.preventDefault(),x.stopPropagation(),d(x.clientX,x.clientY,[],C))},m=x=>{var b;u("param");const C=x.target.value,y=typeof((b=a[0])==null?void 0:b.value)=="number";r(y?Number(C):C),f()};return t.jsxs("div",{className:`flex items-stretch bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5 ${s?"w-full":""} ${i}`,"data-help-id":n,onContextMenu:p,children:[e&&t.jsx("div",{className:"flex-1 flex items-center gap-2 px-2 min-w-0",children:t.jsxs("label",{className:"text-[10px] font-medium tracking-tight select-none truncate pointer-events-none text-gray-400",children:[e,c]})}),t.jsxs("div",{className:`${e?"w-1/2":"w-full"} relative border-l border-white/10 bg-white/[0.02] border-t border-t-white/5`,children:[t.jsx("select",{value:o,onChange:m,className:`w-full h-full bg-transparent text-[10px] font-medium text-gray-200 px-2 pr-6 outline-none cursor-pointer appearance-none text-center ${l}`,children:a.map(x=>t.jsx("option",{value:String(x.value),className:"bg-[#111] text-gray-300",children:x.label},String(x.value)))}),t.jsx("div",{className:"absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500",children:t.jsx("div",{className:"w-2.5 h-2.5",children:t.jsx(Pt,{})})})]})]})}const it=({axisIndex:e,value:o,min:a,max:r,step:n,onUpdate:s,onDragStart:i,onDragEnd:l,disabled:c,highlight:d,mapping:u,mapTextInput:f,liveValue:p,defaultValue:m,hardMin:x,hardMax:C,customLabel:y})=>{const b=fl[e],g=y||b.label;return t.jsxs("div",{className:`relative flex-1 h-9 md:h-[26px] overflow-hidden group transition-all duration-150 ${c?"opacity-50 pointer-events-none":""}`,children:[t.jsx("div",{className:`
                    absolute top-0 bottom-0 left-0 w-5 flex items-center justify-center
                    border-r border-white/10 bg-white/[0.05] select-none z-20
                    cursor-pointer hover:bg-white/[0.15] active:bg-white/20 transition-colors
                `,onDoubleClick:h=>{h.preventDefault(),h.stopPropagation(),m!==void 0&&(i==null||i(),s(m),l==null||l())},title:m!==void 0?`Double-click to reset to ${m}`:"No default value",children:t.jsx("span",{className:`text-[10px] font-bold ${b.text} pointer-events-none`,children:g})}),t.jsx("div",{className:"absolute inset-0 left-5",children:t.jsx(Ya,{value:o,onChange:s,onDragStart:i,onDragEnd:l,step:n,min:a,max:r,hardMin:x,hardMax:C,mapping:u,mapTextInput:f,disabled:c,highlight:d,liveValue:p,defaultValue:m,variant:"compact",showTrack:!0})})]})},Co=[{label:"X",color:"bg-red-500",text:"text-red-400",border:"group-focus-within:border-red-500/50",hoverBg:"hover:bg-red-500/20",accent:"#ef4444"},{label:"Y",color:"bg-green-500",text:"text-green-400",border:"group-focus-within:border-green-500/50",hoverBg:"hover:bg-green-500/20",accent:"#22c55e"},{label:"Z",color:"bg-blue-500",text:"text-blue-400",border:"group-focus-within:border-blue-500/50",hoverBg:"hover:bg-blue-500/20",accent:"#3b82f6"}],za=({primaryAxis:e,secondaryAxis:o,primaryIndex:a,secondaryIndex:r,primaryValue:n,secondaryValue:s,min:i,max:l,step:c,onUpdate:d,onDragStart:u,onDragEnd:f,disabled:p,onHover:m})=>{const[x,C]=S.useState(!1),y=S.useRef(!1),b=S.useRef(!1),g=S.useRef({x:0,y:0}),h=S.useRef({primary:0,secondary:0}),v=S.useRef(!1),z=S.useRef(!1),M=S.useRef(!1),w=Co[a],j=Co[r],k=()=>{C(!0),m(!0)},P=()=>{y.current||(C(!1),m(!1))},I=R=>{p||R.button!==0&&R.button!==1||(R.preventDefault(),R.stopPropagation(),R.currentTarget.setPointerCapture(R.pointerId),g.current={x:R.clientX,y:R.clientY},h.current={primary:n,secondary:s},v.current=!1,z.current=R.shiftKey,M.current=R.altKey,y.current=!0,b.current=R.button===1,u())},_=R=>{if(p||!y.current||!R.currentTarget.hasPointerCapture(R.pointerId))return;const X=R.clientX-g.current.x,L=R.clientY-g.current.y;if((Math.abs(X)>1||Math.abs(L)>1)&&(v.current=!0),!v.current&&Math.abs(X)<1&&Math.abs(L)<1)return;R.preventDefault(),R.stopPropagation();const $=z.current!==R.shiftKey,q=M.current!==R.altKey;if($||q){let H=c*.5;z.current&&(H*=10),M.current&&(H*=.1),h.current.primary=h.current.primary+X*H,h.current.secondary=h.current.secondary-L*H,g.current={x:R.clientX,y:R.clientY},z.current=R.shiftKey,M.current=R.altKey}if(b.current){let H=.01;R.shiftKey&&(H*=3),R.altKey&&(H*=.3);const G=1+L*H;let D=h.current.primary*G,T=h.current.secondary*G;!isNaN(D)&&!isNaN(T)&&d(D,T)}else{let H=c*.5;R.shiftKey&&(H*=10),R.altKey&&(H*=.1);let G=h.current.primary+X*H,D=h.current.secondary-L*H;!isNaN(G)&&!isNaN(D)&&d(G,D)}},F=R=>{p||(R.currentTarget.releasePointerCapture(R.pointerId),y.current=!1,b.current=!1,f(),v.current=!1,R.currentTarget.matches(":hover")||(C(!1),m(!1)))},A=R=>{p||(R.preventDefault(),R.stopPropagation(),u(),d(0,0),f())},N=x||y.current;return t.jsxs("div",{className:`
                w-6 h-9 md:h-[26px] flex-shrink-0 cursor-move overflow-hidden
                transition-all duration-150 ease-out relative
                ${N?"bg-white/10 border border-white/30":"bg-white/[0.08] border border-white/5"}
                ${p?"opacity-30 pointer-events-none":""}
            `,onPointerDown:I,onPointerMove:_,onPointerUp:F,onMouseEnter:k,onMouseLeave:P,onDoubleClick:A,title:`Drag: Horizontal=${e.toUpperCase()}, Vertical=${o.toUpperCase()} | Middle-click: Scale both proportionally | Double-click: Reset (Shift=Fast, Alt=Slow)`,children:[N&&t.jsx("div",{className:"absolute inset-0 opacity-30",style:{backgroundImage:"repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.05) 3px, rgba(255,255,255,0.05) 6px)"}}),t.jsxs("div",{className:"relative w-full h-full",children:[t.jsx("div",{className:`
                        absolute bottom-0 left-0 h-[2px] ${w.color}
                        transition-all duration-150
                        ${N?"opacity-60 w-full":"opacity-0 w-0"}
                    `}),t.jsx("div",{className:`
                        absolute bottom-0 left-0 w-[2px] ${j.color}
                        transition-all duration-150
                        ${N?"opacity-60 h-full":"opacity-0 h-0"}
                    `}),t.jsxs("div",{className:`
                        absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        transition-opacity duration-150 pointer-events-none
                        ${N?"opacity-100":"opacity-0"}
                    `,children:[t.jsx("div",{className:`absolute w-2 h-[1px] ${w.color} -translate-x-1/2`}),t.jsx("div",{className:`absolute h-2 w-[1px] ${j.color} -translate-y-1/2`})]}),t.jsx("div",{className:`
                        absolute inset-0 pointer-events-none
                        transition-opacity duration-150
                        ${b.current?"opacity-100":"opacity-0"}
                    `,children:t.jsxs("div",{className:"absolute inset-0 flex items-center justify-center",children:[t.jsx("div",{className:"w-full h-[1px] bg-cyan-400/50 rotate-45"}),t.jsx("div",{className:"absolute w-full h-[1px] bg-cyan-400/50 -rotate-45"})]})})]})]})},ko=({azimuth:e,pitch:o,onChange:a,onDragStart:r,onDragEnd:n,disabled:s=!1,size:i=80})=>{const l=S.useRef(null),c=S.useRef(!1),[d,u]=S.useState(!1),[f,p]=S.useState(!1),[m,x]=S.useState(!1),C=S.useRef({x:0,y:0}),y=S.useRef({azimuth:e,pitch:o}),b=S.useRef({azimuth:e,pitch:o}),g=S.useRef(null);S.useEffect(()=>{y.current={azimuth:e,pitch:o}},[e,o]);const z=f?.05:.5,M=i/2,w=i*.38,j=S.useCallback((R,X,L)=>{const $=R/(Math.PI/2)*L,q=-(X/(Math.PI/2))*L;return{x:$,y:q}},[]),k=S.useMemo(()=>j(e,o,w),[e,o,w,j]),P=S.useMemo(()=>{const R=Math.cos(o),X=Math.sin(o),L=Math.cos(e),q=Math.sin(e)*R,H=X,G=-L*R,D=q,T=-H,O=Math.sqrt(D*D+T*T),B=G>0,V=O>.001?Math.min(O,1)*w:0,Y=G<=0?1+(1-Math.min(O,1))*.5:1-G*.95,W=O>.001?D/O*V:0,K=O>.001?T/O*V:0;return{x:W,y:K,isBack:B,length:V,headScale:Y,dirX:q,dirY:H,dirZ:G}},[e,o,w]),I=S.useCallback((R,X,L)=>{const $=R/L*(Math.PI/2),q=-(X/L)*(Math.PI/2);return{azimuth:$,pitch:q}},[]),_=S.useCallback((R,X)=>{let L=R,$=X;m&&g.current&&(g.current==="x"?$=0:L=0);const q=L*z,H=$*z,G=j(y.current.azimuth,y.current.pitch,w),D=G.x+q,T=G.y+H,{azimuth:O,pitch:B}=I(D,T,w);m&&g.current?g.current==="x"?(y.current={azimuth:O,pitch:b.current.pitch},a(O,b.current.pitch)):(y.current={azimuth:b.current.azimuth,pitch:B},a(b.current.azimuth,B)):(y.current={azimuth:O,pitch:B},a(O,B))},[j,I,a,w,z,m]),F=R=>{s||R.button===0&&(R.preventDefault(),R.stopPropagation(),R.currentTarget.setPointerCapture(R.pointerId),c.current=!0,u(!0),C.current={x:R.clientX,y:R.clientY},y.current={azimuth:e,pitch:o},b.current={azimuth:e,pitch:o},g.current=null,r==null||r(),p(R.altKey),x(R.shiftKey))},A=R=>{if(s||!c.current)return;const X=R.clientX-C.current.x,L=R.clientY-C.current.y;C.current={x:R.clientX,y:R.clientY},p(R.altKey),x(R.shiftKey),m&&!g.current&&(Math.abs(X)>2||Math.abs(L)>2)&&(g.current=Math.abs(X)>Math.abs(L)?"x":"y"),_(X,L)},N=R=>{c.current&&(c.current=!1,u(!1),p(!1),x(!1),g.current=null,n==null||n())};return t.jsxs("div",{ref:l,className:`
                relative rounded-full border border-white/10 bg-black/40
                cursor-crosshair touch-none overflow-hidden
                transition-all duration-200
                ${s?"opacity-50 pointer-events-none":""}
                ${d?"scale-105 border-cyan-500/50":"hover:border-white/20"}
            `,style:{width:i,height:i,touchAction:"none",boxShadow:d?"0 0 20px rgba(34, 211, 238, 0.3)":"none"},onPointerDown:F,onPointerMove:A,onPointerUp:N,onPointerLeave:N,onDoubleClick:R=>{s||(R.preventDefault(),R.stopPropagation(),r==null||r(),a(0,0),n==null||n())},onContextMenu:R=>{},title:"Drag to rotate direction, Double-click to reset",children:[t.jsx("div",{className:"absolute rounded-full border border-white/10 pointer-events-none",style:{width:w*2,height:w*2,left:M-w,top:M-w}}),t.jsx("div",{className:"absolute w-full h-px bg-white/10 pointer-events-none",style:{top:M}}),t.jsx("div",{className:"absolute h-full w-px bg-white/10 pointer-events-none",style:{left:M}}),t.jsx("div",{className:"absolute w-1.5 h-1.5 bg-white/40 rounded-full pointer-events-none",style:{left:M-3,top:M-3}}),t.jsx("div",{className:"absolute pointer-events-none rounded-full transition-transform duration-75",style:{left:M+k.x,top:M+k.y,width:8,height:8,marginLeft:-4,marginTop:-4,background:P.isBack?"#ef4444":"#22d3ee",boxShadow:`0 0 8px ${P.isBack?"#ef4444":"#22d3ee"}`,transform:d?"scale(1.2)":"scale(1)"}}),P.isBack&&t.jsx("div",{className:"absolute inset-0 rounded-full border-2 border-red-500/30 pointer-events-none animate-pulse"}),t.jsxs(t.Fragment,{children:[t.jsxs("svg",{className:"absolute inset-0 pointer-events-none",style:{width:i,height:i},children:[Math.abs(e)>.01&&t.jsxs(t.Fragment,{children:[t.jsx("ellipse",{cx:M,cy:M,rx:w*Math.abs(Math.sin(e)),ry:w,fill:"none",stroke:P.isBack?"#ef4444":"#22d3ee",strokeWidth:"1.5",opacity:P.isBack?.175:.35,clipPath:P.x>0?"url(#longitudeRight)":"url(#longitudeLeft)"}),t.jsx("ellipse",{cx:M,cy:M,rx:w*Math.abs(Math.sin(e)),ry:w,fill:"none",stroke:P.isBack?"#22d3ee":"#ef4444",strokeWidth:"1.5",opacity:P.isBack?.35:.175,clipPath:P.x>0?"url(#longitudeLeft)":"url(#longitudeRight)"})]}),Math.abs(o)>.01&&t.jsxs(t.Fragment,{children:[t.jsx("ellipse",{cx:M,cy:M,rx:w,ry:w*Math.abs(Math.sin(o)),fill:"none",stroke:P.isBack?"#ef4444":"#22d3ee",strokeWidth:"1.5",opacity:P.isBack?.15:.3,clipPath:P.y<0?"url(#latitudeTop)":"url(#latitudeBottom)"}),t.jsx("ellipse",{cx:M,cy:M,rx:w,ry:w*Math.abs(Math.sin(o)),fill:"none",stroke:P.isBack?"#22d3ee":"#ef4444",strokeWidth:"1.5",opacity:P.isBack?.3:.15,clipPath:P.y<0?"url(#latitudeBottom)":"url(#latitudeTop)"})]}),t.jsxs("defs",{children:[t.jsx("clipPath",{id:"longitudeRight",children:t.jsx("rect",{x:M,y:"0",width:M,height:i})}),t.jsx("clipPath",{id:"longitudeLeft",children:t.jsx("rect",{x:"0",y:"0",width:M,height:i})}),t.jsx("clipPath",{id:"latitudeTop",children:t.jsx("rect",{x:"0",y:"0",width:i,height:M})}),t.jsx("clipPath",{id:"latitudeBottom",children:t.jsx("rect",{x:"0",y:M,width:i,height:M})})]}),t.jsx("line",{x1:M,y1:M,x2:M+P.x,y2:M+P.y,stroke:P.isBack?"#ef4444":"#22d3ee",strokeWidth:"2",strokeDasharray:"4 2",opacity:.3+P.length/w*.5}),t.jsx("polygon",{points:"0,-8 -6,4 6,4",fill:P.isBack?"#ef4444":"#22d3ee",opacity:Math.max(.1,.6+(P.headScale-1)*.4),transform:`translate(${M+P.x}, ${M+P.y}) rotate(${Math.atan2(P.y,P.x)*180/Math.PI+90}) scale(${Math.max(.9,.9+P.headScale*.1)}, ${Math.max(.05,P.headScale)})`})]}),d&&t.jsx("div",{className:"absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap",children:t.jsxs("span",{className:"text-[9px] text-cyan-400 font-mono bg-black/60 px-1 rounded",children:[(e*180/Math.PI).toFixed(0),"° / ",(o*180/Math.PI).toFixed(0),"°"]})})]})]})},Ca=Math.PI/180,Sl=180/Math.PI,Ml=e=>{const o=e.length();if(o<1e-9)return{azimuth:0,pitch:0};const a=Math.max(-1,Math.min(1,e.y/o));return{azimuth:Math.atan2(e.x/o,e.z/o),pitch:Math.asin(a)}},zl=(e,o)=>{const a=Math.cos(o);return new U(a*Math.sin(e),Math.sin(o),a*Math.cos(e))},Tr=({label:e,value:o,onChange:a,min:r=-1e4,max:n=1e4,step:s=.01,disabled:i=!1,convertRadToDeg:l=!1,mode:c="normal",modeToggleable:d=!1,showLiveIndicator:u=!1,liveValue:f,defaultValue:p,hardMin:m,hardMax:x,axisMin:C,axisMax:y,axisStep:b,onDragStart:g,onDragEnd:h,headerRight:v,showDualAxisPads:z=!0,linkable:M=!1,scale:w})=>{const[j,k]=S.useState(o.clone()),[P,I]=S.useState(null),[_,F]=S.useState(c),[A,N]=S.useState("degrees"),[R,X]=S.useState("degrees"),[L,$]=S.useState(M),q=S.useRef(!1),H=S.useRef(null);S.useEffect(()=>{F(c)},[c]);const G=E(oe=>oe.openContextMenu),D="z"in o,T=_==="rotation",O=_==="toggle",B=_==="mixed",V=_==="direction"&&D,Y=V?Ml(j):{azimuth:0,pitch:0},W=(oe,pe)=>{const _e=Math.max(-Math.PI/2,Math.min(Math.PI/2,pe)),Ve=zl(oe,_e);k(Ve),a(Ve)};S.useEffect(()=>{if(q.current)return;const oe=1e-4,pe=Math.abs(o.x-j.x),_e=Math.abs(o.y-j.y),Ve=D?Math.abs(o.z-j.z):0;(pe>oe||_e>oe||Ve>oe)&&k(o.clone())},[o,D]);const K=()=>{q.current=!0,H.current=j.clone(),g&&g()},Q=()=>{H.current=null,q.current=!1,h&&h()},re=oe=>{if(T)return A==="degrees"?_t:Mo;if(w==="pi")return R==="pi"?Mo:_t;if(l)return _t},te=oe=>{if(T){const Ue=A==="degrees"?60*Math.PI/180:.05;return{min:-2*Math.PI,max:2*Math.PI,step:Ue,hardMin:void 0,hardMax:void 0}}const pe=C||{x:r,y:r,z:r},_e=y||{x:n,y:n,z:n},Ve=b||{x:s,y:s,z:s},rt=w==="pi"&&R==="degrees"?Sl:1;return{min:pe[oe],max:_e[oe],step:Ve[oe]*rt,hardMin:m,hardMax:x}},ae=(oe,pe)=>{const _e=H.current||j,Ve=_e.clone();if(L&&!T){const rt=_e[oe],Ue=pe-rt;Ve.x=_e.x+Ue,Ve.y=_e.y+Ue,D&&(Ve.z=_e.z+Ue)}else Ve[oe]=pe;k(Ve),a(Ve)},ce=(oe,pe,_e,Ve)=>{const Ue=(H.current||j).clone();Ue[oe]=_e,Ue[pe]=Ve,k(Ue),a(Ue)},we=P==="xy",me=P==="xy"||P==="zy",xe=P==="zy",Ce=oe=>{if(f)return f[oe]},Ge=oe=>{if(p)return p[oe]},ee=j,ye={x:0,y:1,z:2},De={x:we,y:me,z:xe},Re=oe=>({axisIndex:ye[oe],value:j[oe],...te(oe),onUpdate:pe=>ae(oe,pe),onDragStart:K,onDragEnd:Q,disabled:i,highlight:De[oe],mapping:re(),mapTextInput:T||w==="pi",liveValue:u?Ce(oe):void 0,defaultValue:Ge(oe)}),Ie=[{on:"bg-red-500/30 text-red-300 border-red-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"},{on:"bg-green-500/30 text-green-300 border-green-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"},{on:"bg-blue-500/30 text-blue-300 border-blue-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"}],ct=(oe,pe,_e)=>{const rt=j[oe]>.5,Ue=Ie[pe];return t.jsxs("button",{className:`flex items-center justify-center gap-1 text-[10px] font-bold transition-all border ${rt?Ue.on:Ue.off} ${i?"opacity-40 pointer-events-none":"cursor-pointer hover:brightness-125"} ${_e||"flex-1"}`,onClick:()=>ae(oe,rt?0:1),disabled:i,children:[_e?null:t.jsx("span",{children:oe}),t.jsx("span",{className:`text-[8px] ${rt?"opacity-80":"opacity-70"}`,children:rt?"ON":"OFF"})]},oe)},dt=()=>d?t.jsx("button",{onClick:()=>F(oe=>oe==="rotation"?"normal":"rotation"),className:`text-[10px] p-1 rounded transition-colors mr-2 ${_==="rotation"?"text-cyan-400 bg-cyan-500/20":"text-gray-500 hover:text-gray-300"}`,title:_==="rotation"?"Rotation mode (π units)":"Normal mode",children:"⟳"}):null,Fe=()=>!M||T?null:t.jsx("button",{onClick:()=>$(oe=>!oe),className:`p-1 rounded transition-colors mr-2 ${L?"text-cyan-400 bg-cyan-500/20":"text-gray-600 hover:text-gray-400"}`,title:L?"Axes linked (uniform)":"Link axes",children:t.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("path",{d:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"}),t.jsx("path",{d:"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"})]})}),ut=oe=>{const pe=[];T&&pe.push({label:"Rotation Units",action:()=>{},isHeader:!0},{label:"Degrees (°)",checked:A==="degrees",action:()=>N("degrees")},{label:"Radians (π)",checked:A==="radians",action:()=>N("radians")}),!T&&w==="pi"&&pe.push({label:"Display Units",action:()=>{},isHeader:!0},{label:"Radians (π)",checked:R==="pi",action:()=>X("pi")},{label:"Degrees (°)",checked:R==="degrees",action:()=>X("degrees")}),D&&(c==="rotation"||c==="axes")&&pe.push({label:"Display Mode",action:()=>{},isHeader:!0},{label:"Azimuth / Pitch (A/P)",checked:_==="rotation",action:()=>F("rotation")},{label:"Per-Axis (X/Y/Z)",checked:_==="axes"||_==="normal",action:()=>F("normal")}),pe.length!==0&&(oe.preventDefault(),oe.stopPropagation(),G(oe.clientX,oe.clientY,pe,["ui.vector"]))};return t.jsxs("div",{className:"mb-px animate-slider-entry",children:[e&&t.jsxs("div",{className:"flex items-stretch bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5",children:[t.jsxs("div",{className:"flex-1 flex items-center gap-2 px-2 min-w-0",children:[d&&dt(),v,t.jsx("label",{className:`text-[10px] font-medium tracking-tight select-none flex items-center gap-2 truncate pointer-events-none ${i?"text-gray-600":"text-gray-400"}`,children:e})]}),M&&!T&&t.jsx("div",{className:"flex items-center px-1 border-l border-white/5",children:Fe()})]}),t.jsx("div",{className:"relative h-9 md:h-[26px] flex items-center touch-none overflow-hidden rounded-b-sm",style:{touchAction:"none"},onContextMenu:ut,"data-help-id":"ui.vector",children:t.jsx("div",{className:"flex gap-px w-full h-full",children:O?t.jsx(t.Fragment,{children:["x","y","z"].slice(0,D?3:2).map((oe,pe)=>ct(oe,pe))}):B?t.jsxs(t.Fragment,{children:[ct("x",0,"w-14 flex-shrink-0"),t.jsx(it,{...Re("y"),disabled:i||j.x<.5})]}):V?t.jsxs(t.Fragment,{children:[t.jsx("div",{className:"flex items-center justify-center px-1 flex-shrink-0",children:t.jsx(ko,{azimuth:Y.azimuth,pitch:Y.pitch,onChange:(oe,pe)=>{W(oe,pe)},onDragStart:K,onDragEnd:Q,disabled:i,size:56})}),t.jsx(it,{axisIndex:0,value:Y.azimuth,min:-Math.PI,max:Math.PI,step:Ca,onUpdate:oe=>W(oe,Y.pitch),onDragStart:K,onDragEnd:Q,disabled:i,mapping:_t,mapTextInput:!0,customLabel:"Az"}),t.jsx(za,{primaryAxis:"x",secondaryAxis:"y",primaryIndex:0,secondaryIndex:1,primaryValue:Y.azimuth,secondaryValue:Y.pitch,min:-Math.PI,max:Math.PI,step:Ca,onUpdate:(oe,pe)=>W(oe,pe),onDragStart:K,onDragEnd:Q,disabled:i,onHover:oe=>I(oe?"xy":null)}),t.jsx(it,{axisIndex:1,value:Y.pitch,min:-Math.PI/2,max:Math.PI/2,step:Ca,onUpdate:oe=>W(Y.azimuth,oe),onDragStart:K,onDragEnd:Q,disabled:i,mapping:_t,mapTextInput:!0,customLabel:"Pt"})]}):T?t.jsxs(t.Fragment,{children:[D&&t.jsx(it,{...Re("z"),customLabel:"∠"}),t.jsx("div",{className:"flex items-center justify-center px-1",children:t.jsx(ko,{azimuth:j.x,pitch:j.y,onChange:(oe,pe)=>{const _e=j.clone();_e.x=oe,_e.y=pe,k(_e),a(_e)},onDragStart:K,onDragEnd:Q,disabled:i,size:56})}),t.jsx("div",{className:"contents",children:t.jsx(it,{...Re("x"),customLabel:"A"})}),t.jsx(it,{...Re("y"),customLabel:"P"})]}):t.jsxs(t.Fragment,{children:[t.jsx("div",{className:"contents",children:t.jsx(it,{...Re("x")})}),z&&t.jsx(za,{primaryAxis:"x",secondaryAxis:"y",primaryIndex:0,secondaryIndex:1,primaryValue:j.x,secondaryValue:j.y,min:r,max:n,step:s,onUpdate:(oe,pe)=>ce("x","y",oe,pe),onDragStart:K,onDragEnd:Q,disabled:i,onHover:oe=>I(oe?"xy":null)}),t.jsx(it,{...Re("y")}),D&&z&&t.jsx(za,{primaryAxis:"z",secondaryAxis:"y",primaryIndex:2,secondaryIndex:1,primaryValue:ee.z,secondaryValue:ee.y,min:r,max:n,step:s,onUpdate:(oe,pe)=>ce("z","y",oe,pe),onDragStart:K,onDragEnd:Q,disabled:i,onHover:oe=>I(oe?"zy":null)}),D&&t.jsx(it,{...Re("z")})]})})})]})},Rr=({interactionMode:e="param",trackKeys:o,trackLabels:a,...r})=>{var b,g;const{handleInteractionStart:n,handleInteractionEnd:s}=E(),{sequence:i,isRecording:l,addTrack:c,addKeyframe:d,snapshot:u}=le(),f=S.useRef(r.value);S.useEffect(()=>{f.current=r.value},[(b=r.value)==null?void 0:b.x,(g=r.value)==null?void 0:g.y]);const p=()=>{n(e),l&&o&&(u(),o.forEach((h,v)=>{if(h){const z=a?a[v]:h;i.tracks[h]||c(h,z)}}))},m=()=>{if(l&&o){const h=["x","y"];o.forEach((v,z)=>{if(v){let M=f.current[h[z]];d(v,Math.round(le.getState().currentFrame),M)}})}s()},x=h=>{f.current=new je(h.x,h.y),r.onChange(new je(h.x,h.y))},C=()=>{if(!o||o.length===0)return"none";const h=Math.round(le.getState().currentFrame),v=["x","y"];let z=!1,M=!1;return o.forEach((j,k)=>{if(!j)return;const P=i.tracks[j];if(P){const I=P.keyframes.find(_=>Math.abs(_.frame-h)<.5);I&&(z=!0,Math.abs(I.value-f.current[v[k]])>1e-4&&(M=!0))}}),z?M?"keyed-dirty":"keyed":o.some(j=>j&&i.tracks[j])?o.some((k,P)=>{if(!k)return!1;const I=i.tracks[k];if(!I||I.keyframes.length===0)return!1;const _=Je(I.keyframes,h,!1);return Math.abs(_-f.current[v[P]])>.001})?"dirty":"partial":"none"},y=r.disabled?void 0:t.jsx(Ot,{status:C(),onClick:()=>{const h=Math.round(le.getState().currentFrame),v=["x","y"],z=C();u(),z==="keyed"?o==null||o.forEach(M=>{if(!M)return;const w=i.tracks[M];if(w){const j=w.keyframes.find(k=>Math.abs(k.frame-h)<.5);j&&le.getState().removeKeyframe(M,j.id)}}):(o==null||o.forEach((M,w)=>{M&&(i.tracks[M]||c(M,a?a[w]:M),d(M,h,f.current[v[w]]))}),o!=null&&o[0]&&Z.emit(fe.TRACK_FOCUS,o[0]))}});return t.jsx(Tr,{...r,value:r.value,onChange:x,onDragStart:p,onDragEnd:m,headerRight:y,showDualAxisPads:!0})},vt=({interactionMode:e="param",trackKeys:o,trackLabels:a,...r})=>{var b,g,h;const{handleInteractionStart:n,handleInteractionEnd:s}=E(),{sequence:i,isRecording:l,addTrack:c,addKeyframe:d,snapshot:u}=le(),f=S.useRef(r.value);S.useEffect(()=>{f.current=r.value},[(b=r.value)==null?void 0:b.x,(g=r.value)==null?void 0:g.y,(h=r.value)==null?void 0:h.z]);const p=()=>{n(e),l&&o&&(u(),o.forEach((v,z)=>{if(v){const M=a?a[z]:v;i.tracks[v]||c(v,M)}}))},m=()=>{if(l&&o){const v=["x","y","z"];o.forEach((z,M)=>{if(z){let w=f.current[v[M]];d(z,Math.round(le.getState().currentFrame),w)}})}s()},x=v=>{f.current=new U(v.x,v.y,v.z??0),r.onChange(new U(v.x,v.y,v.z??0))},C=()=>{if(!o||o.length===0)return"none";const v=Math.round(le.getState().currentFrame),z=["x","y","z"];let M=!1,w=!1;return o.forEach((k,P)=>{if(!k)return;const I=i.tracks[k];if(I){const _=I.keyframes.find(F=>Math.abs(F.frame-v)<.5);_&&(M=!0,Math.abs(_.value-f.current[z[P]])>1e-4&&(w=!0))}}),M?w?"keyed-dirty":"keyed":o.some(k=>k&&i.tracks[k])?o.some((P,I)=>{if(!P)return!1;const _=i.tracks[P];if(!_||_.keyframes.length===0)return!1;const F=Je(_.keyframes,v,!1);return Math.abs(F-f.current[z[I]])>.001})?"dirty":"partial":"none"},y=r.disabled?void 0:t.jsx(Ot,{status:C(),onClick:()=>{const v=Math.round(le.getState().currentFrame),z=["x","y","z"],M=C();u(),M==="keyed"?o==null||o.forEach(w=>{if(!w)return;const j=i.tracks[w];if(j){const k=j.keyframes.find(P=>Math.abs(P.frame-v)<.5);k&&le.getState().removeKeyframe(w,k.id)}}):(o==null||o.forEach((w,j)=>{w&&(i.tracks[w]||c(w,a?a[j]:w),d(w,v,f.current[z[j]]))}),o!=null&&o[0]&&Z.emit(fe.TRACK_FOCUS,o[0]))}});return t.jsx(Tr,{...r,value:r.value,onChange:x,onDragStart:p,onDragEnd:m,headerRight:y,showDualAxisPads:!0})},Cl=({label:e,value:o,min:a,max:r,step:n=.01,onChange:s,size:i=40,color:l="#22d3ee",tooltip:c,unconstrained:d=!1,defaultValue:u,onDragStart:f,onDragEnd:p})=>{const[m,x]=S.useState(!1),C=S.useRef(0),y=S.useRef(0),b=r-a,g=Math.max(a,Math.min(r,o)),h=Math.max(0,Math.min(1,(g-a)/b)),v=-135+h*270,z=i/2-4,M=i/2,w=i/2,j=2*Math.PI*z,k=j,P=j*(1-h*.75),I=N=>{N.preventDefault(),N.stopPropagation(),x(!0),C.current=N.clientY,y.current=o,f&&f(),N.target.setPointerCapture(N.pointerId)},_=N=>{if(!m)return;N.preventDefault();const R=C.current-N.clientY;let X=.005;N.shiftKey&&(X*=5),N.altKey&&(X*=.1);const L=R*X*b;let $=y.current+L;d||($=Math.max(a,Math.min(r,$))),n&&($=Math.round($/n)*n),s($)},F=N=>{x(!1),p&&p(),N.target.releasePointerCapture(N.pointerId)},A=N=>{N.preventDefault(),N.stopPropagation(),u!==void 0&&(f&&f(),s(u),p&&p())};return t.jsxs("div",{className:"flex flex-col items-center gap-1 select-none touch-none group",title:c||`${o.toFixed(2)}`,onDoubleClick:A,children:[t.jsxs("div",{className:"relative cursor-ns-resize",style:{width:i,height:i},onPointerDown:I,onPointerMove:_,onPointerUp:F,children:[t.jsxs("svg",{width:i,height:i,className:"overflow-visible transform rotate-90",children:[t.jsx("circle",{cx:M,cy:w,r:z,fill:"none",stroke:"#333",strokeWidth:"3",strokeDasharray:j,strokeDashoffset:j*.25,strokeLinecap:"round"}),t.jsx("circle",{cx:M,cy:w,r:z,fill:"none",stroke:m?"#fff":l,strokeWidth:"3",strokeDasharray:k,strokeDashoffset:P,strokeLinecap:"round",className:"transition-colors duration-200"})]}),t.jsx("div",{className:"absolute w-1.5 h-1.5 bg-white rounded-full shadow-sm pointer-events-none",style:{top:"50%",left:"50%",marginTop:-3,marginLeft:-3,transform:`rotate(${v}deg) translate(0, -${z}px)`}})]}),t.jsx("div",{className:"h-3 min-w-[30px] flex items-center justify-center bg-black/40 rounded px-1 border border-white/5 hover:border-white/20 transition-colors",children:t.jsx(jr,{value:o,onChange:s,min:d?void 0:a,max:d?void 0:r,step:n,onDragStart:f,onDragEnd:p})}),e&&t.jsx("span",{className:"text-[8px] text-gray-500 font-bold group-hover:text-gray-300 transition-colors -mt-0.5",children:e})]})},Mt=e=>{const{handleInteractionStart:o,handleInteractionEnd:a}=E();return t.jsx(Cl,{...e,onDragStart:()=>{o("param"),e.onDragStart&&e.onDragStart()},onDragEnd:()=>{a(),e.onDragEnd&&e.onDragEnd()}})};class kl{constructor(){J(this,"components",new Map)}register(o,a){this.components.has(o)&&console.warn(`ComponentRegistry: Overwriting component '${o}'`),this.components.set(o,a)}get(o){return this.components.get(o)}}const he=new kl,jl=({open:e})=>t.jsx("svg",{className:`w-2 h-2 transition-transform ${e?"rotate-90":""}`,viewBox:"0 0 6 10",fill:"currentColor",children:t.jsx("path",{d:"M0 0l6 5-6 5z"})}),Bt=({label:e,children:o,defaultOpen:a=!0,count:r,labelVariant:n="secondary",labelColor:s,rightContent:i,className:l="",headerClassName:c="",open:d,onToggle:u})=>{const[f,p]=S.useState(a),m=d!==void 0,x=m?d:f,C=()=>{u&&u(),m||p(y=>!y)};return t.jsxs("div",{className:l,children:[t.jsxs("button",{onClick:C,className:`flex items-center gap-1.5 w-full px-2 py-1 text-left select-none hover:bg-white/5 transition-colors rounded-sm ${c}`,children:[t.jsx(jl,{open:x}),t.jsx(Me,{variant:n,color:s,children:e}),r!==void 0&&t.jsx("span",{className:"text-[8px] bg-white/10 text-gray-400 px-1.5 py-0.5 rounded ml-1",children:r}),i&&t.jsx("div",{className:"ml-auto flex items-center gap-1",onClick:y=>y.stopPropagation(),children:i})]}),x&&o]})},Pl={active:"bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.4)]",pending:"bg-amber-500 animate-pulse shadow-[0_0_4px_rgba(245,158,11,0.4)]",off:"bg-red-900",instant:"bg-cyan-500 shadow-[0_0_4px_rgba(6,182,212,0.4)]"},ia=({status:e,className:o="",title:a})=>t.jsx("span",{className:`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${Pl[e]} ${o}`,title:a}),Oa=({label:e,isActive:o,onToggle:a,numericValue:r,onNumericChange:n,options:s,onOptionChange:i,status:l,disabled:c=!1,hideCheckbox:d=!1,description:u,min:f,max:p,step:m})=>{var I;const[x,C]=S.useState(!1),y=S.useRef(null),[b,g]=S.useState({top:0,x:0,side:"right"}),h=()=>{if(u&&y.current){const _=y.current.getBoundingClientRect(),F=_.left<window.innerWidth/2;g({top:_.top+_.height/2,x:F?_.right+6:window.innerWidth-_.left+6,side:F?"left":"right"}),C(!0)}},v=()=>C(!1),z=l==="pending"?"text-amber-400":o?"text-gray-300":"text-gray-500";let M="",w="";switch(l){case"pending":M="bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)] animate-pulse",w="Pending Compilation (Click Apply)";break;case"runtime":M="bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.5)]",w="Runtime Uniform (Instant Update)";break;case"synced":default:M=o?"bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.4)]":"bg-gray-700",w="Compiled & Active";break}const j=s&&r!==void 0?(I=s.find(_=>_.value==r))==null?void 0:I.label:"",k=m??(r!==void 0&&Number.isInteger(r)?1:.01);let P=1;return f!==void 0&&p!==void 0&&p>f&&(P=(p-f)*.01/k),t.jsxs(t.Fragment,{children:[t.jsxs("div",{ref:y,className:`flex items-center justify-between px-3 py-1.5 border-b border-white/5 hover:bg-white/5 transition-colors ${c?"opacity-30 pointer-events-none":""}`,onMouseEnter:h,onMouseLeave:v,children:[t.jsxs("div",{className:"flex items-center gap-2.5 flex-1 min-w-0",children:[t.jsx("div",{className:`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-300 ${M}`,title:w}),t.jsxs("span",{className:`text-[10px] font-sans font-medium tracking-tight truncate ${z}`,children:[e," ",l==="pending"&&"*"]})]}),t.jsxs("div",{className:"flex items-center gap-3",children:[s&&i?t.jsxs("div",{className:"relative w-20 h-4 bg-black/40 border border-white/10 rounded-sm hover:border-white/30 transition-colors",children:[t.jsx("select",{className:"absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10",value:r,onChange:_=>i(Number(_.target.value)),children:s.map(_=>t.jsx("option",{value:_.value,children:_.label},_.value))}),t.jsxs("div",{className:"absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none",children:[t.jsx("span",{className:"text-[9px] text-cyan-400 font-mono font-medium truncate pr-1",children:j}),t.jsx("span",{className:"text-[6px] text-gray-500",children:"▼"})]})]}):n&&r!==void 0&&t.jsx("div",{className:"w-10 h-4 bg-black/40 border border-white/10 relative overflow-hidden rounded-sm",children:t.jsx(ot,{value:r,onChange:n,step:k,min:f,max:p,sensitivity:P,highlight:o})}),!d&&t.jsx("input",{type:"checkbox",checked:o,onChange:()=>a(!o),className:`w-3 h-3 appearance-none border rounded-[2px] cursor-pointer transition-colors ${o?l==="pending"?"bg-amber-600 border-amber-500":"bg-cyan-600 border-cyan-500":"bg-black/40 border-gray-600 hover:border-gray-400"}`})]})]}),x&&jt.createPortal(t.jsx("div",{className:"fixed z-[9999] pointer-events-none flex items-center animate-fade-in",style:{top:b.top,[b.side==="left"?"left":"right"]:b.x,transform:"translateY(-50%)"},children:t.jsxs("div",{className:"bg-black text-white text-[9px] px-2 py-1 rounded border border-white/20 shadow-xl whitespace-nowrap",children:[u,b.side==="left"?t.jsxs(t.Fragment,{children:[t.jsx("div",{className:"absolute top-1/2 -left-1 -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-white/20"}),t.jsx("div",{className:"absolute top-1/2 -left-[3px] -translate-y-1/2 border-t-[3px] border-b-[3px] border-r-[3px] border-t-transparent border-b-transparent border-r-black"})]}):t.jsxs(t.Fragment,{children:[t.jsx("div",{className:"absolute top-1/2 -right-1 -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-white/20"}),t.jsx("div",{className:"absolute top-1/2 -right-[3px] -translate-y-1/2 border-t-[3px] border-b-[3px] border-l-[3px] border-t-transparent border-b-transparent border-l-black"})]})]})}),document.body)]})},Tl=ze.lazy(()=>ht(()=>import("./AdvancedGradientEditor-Dc8rOSEZ.js"),__vite__mapDeps([0,1,2,3,4]),import.meta.url)),na=(e,o,a,r)=>{if(e.or)return e.or.some(i=>na(i,o,a,r));if(e.and)return e.and.every(i=>na(i,o,a,r));let n=e.param||r,s;if(n&&n.startsWith("$")){const i=n.slice(1);if(i.includes(".")){const l=i.split(".");let c=a;for(const d of l){if(c==null){c=void 0;break}c=c[d]}s=c}else s=a[i]}else if(n)s=o[n];else return!0;if(e.eq===void 0&&e.neq===void 0&&e.gt===void 0&&e.lt===void 0&&e.bool===void 0)return typeof s=="boolean"?s:typeof s=="number"?s>0:!!s;if(e.eq!==void 0||e.neq!==void 0){let i=s;if(typeof s=="object"&&s&&s.getHexString&&(i="#"+s.getHexString()),e.eq!==void 0)return i==e.eq;if(e.neq!==void 0)return i!=e.neq}return e.bool!==void 0?!!s===e.bool:e.gt!==void 0?s>e.gt:e.lt!==void 0?s<e.lt:!0},Et=(e,o,a,r)=>{if(!e){if(r){const n=o[r];return typeof n=="boolean"?n:typeof n=="number"?n>0:!!n}return!0}return Array.isArray(e)?e.every(n=>na(n,o,a,r)):na(e,o,a,r)},Rl=e=>{const o=e.min??0,a=e.max??1;if(e.scale==="pi")return{min:o/Math.PI,max:a/Math.PI,toSlider:r=>r/Math.PI,fromSlider:r=>r*Math.PI};if(!(!e.scale||e.scale==="linear")){if(e.scale==="square")return{min:0,max:100,toSlider:r=>Math.sqrt((r-o)/(a-o))*100,fromSlider:r=>o+Math.pow(r/100,2)*(a-o)};if(e.scale==="log"){const r=Math.max(1e-6,o);return{min:0,max:100,toSlider:n=>n<=o?0:(Math.log10(Math.max(r,n))-Math.log10(r))/(Math.log10(a)-Math.log10(r))*100,fromSlider:n=>n<=0?o:Math.pow(10,Math.log10(r)+n/100*(Math.log10(a)-Math.log10(r)))}}}},ne=({featureId:e,groupFilter:o,className:a,isDisabled:r=!1,disabledParams:n=[],excludeParams:s=[],whitelistParams:i=[],variant:l="default",forcedState:c,onChangeOverride:d,pendingChanges:u})=>{var G;const f=ie.get(e),p=E(D=>D[e]),m=c||p,x=E(D=>D.liveModulations),C=ze.useRef(E.getState());C.current=E.getState();const y=C.current,b=y,g=E(D=>D.advancedMode),h=E(D=>D.openContextMenu),v=E(D=>D.showHints),[z,M]=S.useState(null),[w,j]=S.useState(new Set),k=S.useMemo(()=>`set${e.charAt(0).toUpperCase()+e.slice(1)}`,[e]),P=(D,T)=>{if(r||n.includes(D))return;if(d){d(D,T);return}const O=f.params[D];if((O==null?void 0:O.onUpdate)==="compile"){E.getState().movePanel("Engine","left"),setTimeout(()=>Z.emit("engine_queue",{featureId:e,param:D,value:T}),50);return}if(O!=null&&O.confirmation&&T===!0&&m[D]===!1){M({key:D,value:T,message:O.confirmation});return}const B=b[k];B&&B({[D]:T})},I=()=>{if(!z)return;if(d){d(z.key,z.value),M(null);return}const D=b[k];D&&(Z.emit("is_compiling","Optimizing Shader..."),setTimeout(()=>{D({[z.key]:z.value}),M(null)},50))},_=D=>{if(r)return;const T=Ee(D.currentTarget);T.length>0&&(D.preventDefault(),D.stopPropagation(),h(D.clientX,D.clientY,[],T))},F=(D,T)=>{if(!(r||n.includes(T))&&D.target.files&&D.target.files[0]){const O=new FileReader;O.onload=B=>{var V;(V=B.target)!=null&&V.result&&P(T,B.target.result)},O.readAsDataURL(D.target.files[0])}};if(!f||!m)return null;const A=(D,T)=>{var V,Y,W,K,Q,re;const O=m[D]??T.default,B=r||n.includes(D);if(l==="dense"){let te="runtime";if(T.onUpdate==="compile"&&(te=u&&u[`${e}.${D}`]!==void 0?"pending":"synced"),T.type==="boolean")return t.jsx(Oa,{label:T.label,description:T.description,isActive:!!O,onToggle:ae=>P(D,ae),status:te,disabled:B});if(T.type==="float"||T.type==="int")return t.jsx(Oa,{label:T.label,description:T.description,isActive:!0,onToggle:()=>{},numericValue:O,onNumericChange:ae=>P(D,ae),options:T.options,onOptionChange:T.options?ae=>P(D,ae):void 0,status:te,disabled:B,hideCheckbox:!0,step:T.step,min:T.min,max:T.max})}if(T.type==="color"){let te=O;return typeof O=="object"&&O.getHexString&&(te="#"+O.getHexString()),T.layout==="embedded"||T.parentId?t.jsx("div",{className:`mb-px pr-1 ${B?"opacity-30 pointer-events-none":""}`,children:t.jsx(pa,{color:te,onColorChange:ae=>P(D,ae)})}):t.jsxs("div",{className:`flex items-center justify-between px-3 py-1 bg-gray-800/20 mb-px ${B?"opacity-30 pointer-events-none":""}`,children:[t.jsx(Me,{children:T.label}),t.jsx(ra,{color:te,onChange:ae=>P(D,ae),label:T.label})]})}if(T.type==="boolean"){const te=T.onUpdate==="compile"?t.jsx("span",{className:"ml-1.5",title:O?"Compiled & Active":"Compiled Off — toggle to queue change",children:t.jsx(ia,{status:O?"active":"off"})}):null;return T.ui==="checkbox"?t.jsx("div",{className:B?"opacity-30 pointer-events-none":"",children:t.jsx(Le,{label:T.label,value:O,onChange:ae=>P(D,ae),disabled:B,variant:"dense",labelSuffix:te})}):t.jsx("div",{children:t.jsx(Le,{label:T.label,value:O,onChange:ae=>P(D,ae),options:T.options,disabled:B,labelSuffix:te})})}if(T.type==="float"||T.type==="int"){const te=T.onUpdate==="compile"?t.jsx("span",{className:"ml-1.5",title:"Compile-time setting — changes queue to Engine Panel",children:t.jsx(ia,{status:"active"})}):null;if(T.options)return t.jsx("div",{className:`mb-px ${B?"opacity-30 pointer-events-none":""}`,children:t.jsx(kt,{label:T.label,value:O,onChange:ee=>P(D,ee),options:T.options,fullWidth:!0,labelSuffix:te})});if(T.ui==="knob")return t.jsx("div",{className:T.layout==="half"?"flex flex-col items-center justify-center py-2":"flex justify-center p-2",children:t.jsx(Mt,{label:T.label,value:O,min:T.min??0,max:T.max??1,step:T.step,onChange:ee=>P(D,ee),color:O>(T.min??0)?"#22d3ee":"#444",size:40})});const ae=Rl(T);let ce=T.format?T.format(O):void 0;T.scale==="pi"&&(ce=`${(O/Math.PI).toFixed(2)}π`);let we=T.max??1;T.dynamicMaxRef&&m[T.dynamicMaxRef]!==void 0&&(we=m[T.dynamicMaxRef]);const me=`${e}.${D}`,xe=x[me],Ce=O!==T.default||!!T.condition,Ge=T.condition?"!animate-none !overflow-visible":"";return t.jsx("div",{children:t.jsx(de,{label:T.label,value:O,min:T.min??0,max:we,step:T.step??.01,onChange:ee=>P(D,ee),highlight:Ce,trackId:me,liveValue:xe,defaultValue:T.default,customMapping:ae,overrideInputText:ce,mapTextInput:T.scale==="pi",disabled:B,labelSuffix:te,className:Ge})})}if(T.type==="vec2"){const te=(O==null?void 0:O.x)??((V=T.default)==null?void 0:V.x)??0,ae=(O==null?void 0:O.y)??((Y=T.default)==null?void 0:Y.y)??0;return t.jsx("div",{className:`mb-px ${B?"opacity-30 pointer-events-none":""}`,children:t.jsx(Rr,{label:T.label,value:new je(te,ae),min:T.min??-1,max:T.max??1,onChange:ce=>P(D,{x:ce.x,y:ce.y}),mode:T.mode,scale:T.scale,linkable:T.linkable})})}if(T.type==="vec3"){const te=(O==null?void 0:O.x)??((W=T.default)==null?void 0:W.x)??0,ae=(O==null?void 0:O.y)??((K=T.default)==null?void 0:K.y)??0,ce=(O==null?void 0:O.z)??((Q=T.default)==null?void 0:Q.z)??0,we=new U(te,ae,ce),me=T.composeFrom?T.composeFrom.map(Ce=>`${e}.${Ce}`):[`${e}.${D}_x`,`${e}.${D}_y`,`${e}.${D}_z`],xe=T.composeFrom?void 0:[`${T.label} X`,`${T.label} Y`,`${T.label} Z`];return t.jsx("div",{className:`mb-px ${B?"opacity-30 pointer-events-none":""}`,children:t.jsx(vt,{label:T.label,value:we,min:T.min??-10,max:T.max??10,step:T.step,onChange:Ce=>P(D,Ce),disabled:B,trackKeys:me,trackLabels:xe,mode:T.mode,scale:T.scale,linkable:T.linkable})})}if(T.type==="image"){const te=((re=T.linkedParams)==null?void 0:re.colorSpace)||"colorSpace",ae=f.params[te],ce=m[te],we=()=>{if(ae&&typeof ce=="number"){const xe=(ce+1)%3;P(te,xe)}},me=ce===1?"LIN":ce===2?"ACES":"sRGB";return t.jsx("div",{className:`mb-px ${B?"opacity-30 pointer-events-none":""}`,children:t.jsxs("div",{className:"bg-gray-800/30 border border-white/5 text-center overflow-hidden relative group",children:[t.jsx("input",{type:"file",accept:"image/*,.hdr,.exr",onChange:xe=>F(xe,D),className:"hidden",id:`file-input-${D}`}),t.jsx("label",{htmlFor:`file-input-${D}`,className:"block bg-cyan-900/40 hover:bg-cyan-800/60 text-cyan-300 w-full py-2 text-xs font-bold transition-colors cursor-pointer",children:O?"Replace Texture":T.label}),ae&&t.jsx("div",{className:"absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-bold text-gray-500 bg-black/50 px-1.5 py-0.5 rounded cursor-pointer hover:text-white hover:bg-cyan-900/80 transition-colors select-none",onClick:xe=>{xe.preventDefault(),we()},title:"Input Color Profile: sRGB / Linear / ACES",children:me})]})})}return T.type==="gradient"?t.jsx("div",{className:`pr-1 ${B?"opacity-30 pointer-events-none":""}`,children:t.jsx(S.Suspense,{fallback:null,children:t.jsx(Tl,{value:O,onChange:te=>P(D,te)})})}):null},N=(D,T=!1)=>{var K;const O=f.params[D];if(!O||O.hidden||s.includes(D)||!Et(O.condition,m,y,O.parentId)||O.isAdvanced&&!g)return null;const B=A(D,O),Y=Object.keys(f.params).filter(Q=>f.params[Q].parentId===D).map(Q=>N(Q)).filter(Boolean);(K=f.customUI)==null||K.forEach(Q=>{if(Q.parentId!==D||o&&Q.group!==o||!Et(Q.condition,m,y))return;const re=he.get(Q.componentId);re&&Y.push(t.jsx("div",{children:t.jsx(re,{featureId:e,sliceState:m,actions:b,...Q.props})},`custom-${Q.componentId}`))});const W=T?"flex-1 min-w-0":"flex flex-col";return t.jsxs("div",{className:`w-full ${W}`,children:[B,v&&O.description&&!r&&l!=="dense"&&t.jsx("p",{className:"px-3 py-1.5 text-[9px] text-gray-600 leading-tight bg-white/[0.06] hover:text-gray-300 transition-colors cursor-default",children:O.description}),Y.length>0&&t.jsx("div",{className:"flex flex-col pb-1",children:Y.map((Q,re)=>{const te=re===Y.length-1;return t.jsxs("div",{className:"flex",children:[t.jsx("div",{className:`w-2 shrink-0 self-stretch border-l border-white/20 bg-white/[0.12] ${te?"border-b border-b-white/20 rounded-bl-lg":""}`}),t.jsx("div",{className:`flex-1 min-w-0 ${te?"border-b border-b-white/20":""}`,children:Q})]},re)})})]},D)},R=Object.keys(f.params).filter(D=>f.params[D].parentId?!1:i&&i.length>0?i.includes(D):o?f.params[D].group===o:!0),X=D=>{const T=[];for(let O=0;O<D.length;O++){const B=D[O],V=f.params[B];if(!(V.hidden||s.includes(B)||!Et(V.condition,m,y))){if(V.layout==="half"&&l!=="dense"){let Y=D[O+1],W=Y?f.params[Y]:null;if(W&&W.layout==="half"&&!W.hidden&&!s.includes(Y)&&Et(W.condition,m,y)){T.push(t.jsxs("div",{className:"flex gap-0.5 mb-px",children:[N(B,!0),N(Y,!0)]},`${B}-${Y}`)),O++;continue}}T.push(N(B))}}return T},L=D=>{j(T=>{const O=new Set(T);return O.has(D)?O.delete(D):O.add(D),O})},$=f.groups,q=$&&!o&&!(i!=null&&i.length)&&Object.values($).some(D=>D.collapsible),H=[];if(q&&$){const D=[],T={},O=[];for(const B of R){const V=f.params[B].group;V&&$[V]?(T[V]||(T[V]=[],D.push(V)),T[V].push(B)):O.push(B)}H.push(...X(O));for(const B of D){const V=$[B],Y=T[B];w.has(B);const W=X(Y);if(!W.every(K=>K===null))if(V.collapsible){const K=W.filter(Boolean);H.push(t.jsx(Bt,{label:V.label,open:!w.has(B),onToggle:()=>L(B),defaultOpen:!0,headerClassName:"px-2 py-0.5 text-[9px] font-bold text-gray-500 hover:text-gray-300",children:t.jsxs("div",{className:"flex flex-col",children:[K.map((Q,re)=>t.jsx("div",{children:Q},re)),t.jsx("div",{className:"ml-[9px] border-b border-white/10 rounded-bl mb-0.5"})]})},`group-${B}`))}else H.push(...W)}}else H.push(...X(R));return(G=f.customUI)==null||G.forEach(D=>{if(i&&i.length>0||D.parentId||o&&D.group!==o||!Et(D.condition,m,y))return;const T=he.get(D.componentId);T&&H.push(t.jsx("div",{className:`flex flex-col mb-px ${r?"grayscale opacity-30 pointer-events-none":""}`,children:t.jsx(T,{featureId:e,sliceState:m,actions:b,...D.props})},`custom-${D.componentId}`))}),t.jsxs("div",{className:`flex flex-col relative ${a||""}`,onContextMenu:_,children:[H,z&&t.jsx("div",{className:"absolute inset-0 z-50 animate-pop-in",children:t.jsxs("div",{className:"bg-black/95 border border-white/20 rounded shadow-2xl overflow-hidden h-full flex flex-col",children:[t.jsxs("div",{className:"flex items-center gap-2 p-2 border-b border-white/10 bg-white/5",children:[t.jsx(Tt,{}),t.jsx(Me,{color:"text-gray-300",children:"Warning"})]}),t.jsxs("div",{className:"p-3 flex-1 flex flex-col justify-between",children:[t.jsx("p",{className:"text-[10px] text-gray-400 leading-relaxed whitespace-pre-wrap",children:z.message}),t.jsxs("div",{className:"flex gap-1 mt-4",children:[t.jsx("button",{onClick:()=>M(null),className:"flex-1 py-1.5 bg-gray-800 text-gray-300 text-[9px] font-bold rounded border border-white/10 hover:bg-gray-700 transition-colors",children:"Cancel"}),t.jsx("button",{onClick:I,className:"flex-1 py-1.5 bg-cyan-900/50 text-cyan-300 text-[9px] font-bold rounded border border-cyan-500/30 hover:bg-cyan-900 transition-colors",children:"Confirm"})]})]})]})})]})},Il=()=>{const e=E(n=>{var s;return(s=n.lighting)==null?void 0:s.shadows}),o=E(n=>n.setLighting),a=E(n=>n.handleInteractionStart),r=E(n=>n.handleInteractionEnd);return t.jsx(wt,{width:"w-52",children:t.jsxs("div",{className:"relative space-y-2",children:[t.jsxs("div",{className:"flex items-center justify-between border-b border-white/10 pb-2 px-1",children:[t.jsx(Me,{children:"Shadows"}),t.jsx("button",{onClick:()=>{a("param"),o({shadows:!e}),r()},className:`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${e?"bg-yellow-500/20 text-yellow-300 border-yellow-500/50":"bg-gray-800 text-gray-500 border-gray-600"}`,children:e?"Enabled":"Disabled"})]}),e&&t.jsx("div",{className:"space-y-1",children:t.jsx(ne,{featureId:"lighting",groupFilter:"shadows"})})]})})},Fl=({isMobileMode:e,vibrate:o})=>{var _;const a=E(),r=a.lighting,{openContextMenu:n,handleInteractionStart:s,handleInteractionEnd:i}=E(),[l,c]=S.useState(null),[d,u]=S.useState(null),[f,p]=S.useState(!1),[m,x]=S.useState(!1),C=S.useRef(null),y=S.useRef(null),b=S.useRef(null),g=S.useRef(null);S.useEffect(()=>{const F=A=>{const N=A.target;y.current&&!y.current.contains(N)&&!N.closest(".shadow-toggle-btn")&&p(!1),e&&d!==null&&!N.closest(".light-orb-wrapper")&&u(null),m&&g.current&&!g.current.contains(N)&&!N.closest(".expand-trigger")&&x(!1)};return document.addEventListener("mousedown",F),document.addEventListener("touchstart",F),()=>{document.removeEventListener("mousedown",F),document.removeEventListener("touchstart",F)}},[d,e,m]);const h=(F,A)=>{F.preventDefault(),F.stopPropagation(),n(F.clientX,F.clientY,[],A)},v=(F,A)=>{F.preventDefault(),F.stopPropagation();const N=bt(a.lighting,A),R=[{label:`Light ${A+1}`,isHeader:!0,action:()=>{}},{label:"Enabled",checked:N.visible,action:()=>{s("param"),a.updateLight({index:A,params:{visible:!N.visible}}),i()}},{label:"Type",isHeader:!0,action:()=>{}},{label:"Point",checked:N.type==="Point",action:()=>{s("param"),a.updateLight({index:A,params:{type:"Point"}}),i()}},{label:"Directional (Sun)",checked:N.type==="Directional",action:()=>{s("param"),a.updateLight({index:A,params:{type:"Directional"}}),i()}}];n(F.clientX,F.clientY,R,["panel.light"])},z=F=>{const A=bt(a.lighting,F);if(!e){o(5),s("param"),a.updateLight({index:F,params:{visible:!A.visible}}),i();return}A.visible?d!==F?(o(5),u(F)):(o([10,30,10]),s("param"),a.updateLight({index:F,params:{visible:!1}}),i(),u(null)):(o(10),s("param"),a.updateLight({index:F,params:{visible:!0}}),i(),u(null))},M=(F,A)=>{e||A.nativeEvent.pointerType==="touch"||(C.current&&clearTimeout(C.current),c(F))},w=()=>{e||(C.current=window.setTimeout(()=>{c(null)},400))},j=F=>{o(5);const A=P[F];a.setDraggedLight((A==null?void 0:A.id)??null),e||(u(null),c(null))},k=()=>{a.addLight()},P=((_=a.lighting)==null?void 0:_.lights)||[],I=F=>{const A=P[F];return A?t.jsxs("div",{className:"relative light-orb-wrapper flex justify-center w-8 h-8",onMouseEnter:N=>M(F,N),onMouseLeave:w,onContextMenu:N=>v(N,F),children:[t.jsx(bl,{index:F,color:A.color,active:A.visible,type:A.type,rotation:A.rotation,onClick:()=>z(F),onDragStart:()=>j(F)}),a.draggedLightIndex!==A.id&&(l===F||d===F)&&t.jsx(vl,{index:F})]},F):F<Se?t.jsx("div",{className:"flex justify-center items-center w-8 h-8",children:t.jsx("button",{onClick:k,className:"w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-gray-500 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-white/5 transition-all",title:"Add Light",children:t.jsx(ua,{})})},F):t.jsx("div",{className:"w-8 h-8"},F)};return t.jsxs("div",{ref:b,className:"absolute left-1/2 -translate-x-1/2 flex items-center bg-white/5 pr-2 pl-6 py-1.5 rounded-full border border-white/5 shadow-inner z-[65]",children:[t.jsxs("div",{className:"relative",children:[t.jsxs("div",{className:`flex items-center gap-6 transition-opacity duration-200 ${m?"opacity-0 pointer-events-none":"opacity-100"}`,children:[[0,1,2].map(F=>I(F)),t.jsx("button",{onClick:()=>{o(5),x(!0)},className:"expand-trigger w-5 h-5 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors ml-[-8px]",title:"Expand Light Studio",children:t.jsx(Pt,{})})]}),m&&t.jsx("div",{ref:g,className:"absolute top-[-20px] left-[-20px] bg-black/95 border border-white/20 p-5 rounded-2xl shadow-2xl animate-fade-in z-[80]",children:t.jsxs("div",{className:"grid grid-cols-3 gap-6",children:[Array.from({length:8}).map((F,A)=>I(A)),t.jsx("div",{className:"flex justify-center items-center w-8 h-8",children:t.jsx("button",{onClick:()=>x(!1),className:"w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-colors",title:"Collapse",children:t.jsx(As,{})})})]})})]}),t.jsx("div",{className:"h-6 w-px bg-white/10 mx-4"}),t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsxs("div",{className:"relative",ref:y,children:[t.jsx("button",{onClick:F=>{F.stopPropagation(),o(5),p(!f)},onContextMenu:F=>h(F,["shadows"]),className:`shadow-toggle-btn p-2 rounded-full border transition-all duration-300 ${r!=null&&r.shadows?"bg-yellow-500/10 border-yellow-500/50 text-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.1)]":"bg-transparent border-transparent text-gray-600 hover:text-gray-300 hover:bg-white/5"}`,title:"Shadow Settings",children:t.jsx(Zs,{})}),f&&t.jsx(Il,{})]}),t.jsx("button",{onClick:()=>{o(5),s("param"),a.setShowLightGizmo(!a.showLightGizmo),i()},onContextMenu:F=>h(F,["ui.viewport"]),className:`p-2 rounded-full border transition-all duration-300 ${a.showLightGizmo?"bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]":"bg-transparent border-transparent text-gray-600 hover:text-gray-300 hover:bg-white/5"}`,children:t.jsx(Ys,{})})]})]})},Ir=(e,o,a,r)=>{const n=e.replace(/[^a-zA-Z0-9 \-_]/g,"").trim().replace(/\s+/g,"_")||"Untitled",s=`v${o}`;return`${["GMT",n,s].join("_")}.${a}`},jo=ue(),_l=({isMobileMode:e,vibrate:o,btnBase:a,btnActive:r,btnInactive:n})=>{const s=E(),{movePanel:i}=s,[l,c]=S.useState(!1),[d,u]=S.useState(!1),f=S.useRef(null),p=S.useRef(null),m=async()=>{if(jo.isBooted){c(!1);try{const g=await jo.captureSnapshot();if(u(!0),!g){console.error("Snapshot generation returned null.");return}const h=s.getPreset({includeScene:!0}),v=JSON.stringify(h),z=s.prepareExport(),M=Ir(s.projectSettings.name,z,"png");try{const w=await or(g,"FractalData",v),j=URL.createObjectURL(w),k=document.createElement("a");k.download=M,k.href=j,k.click(),URL.revokeObjectURL(j),o(50)}catch(w){console.error("Metadata injection failed, saving raw image",w);const j=URL.createObjectURL(g),k=document.createElement("a");k.download=M,k.href=j,k.click(),URL.revokeObjectURL(j)}}catch(g){console.error("Snapshot failed",g)}finally{u(!1)}}},x=g=>{g.stopPropagation(),e?(o(5),c(!l)):m()},C=()=>{e||(f.current&&clearTimeout(f.current),c(!0))},y=()=>{e||(f.current=window.setTimeout(()=>{c(!1)},200))},b=()=>{o(5),i("Camera Manager","left"),c(!1)};return S.useEffect(()=>{if(!e||!l)return;const g=h=>{const v=h.target;p.current&&!p.current.contains(v)&&!v.closest(".camera-menu-trigger")&&c(!1)};return document.addEventListener("mousedown",g),document.addEventListener("touchstart",g),()=>{document.removeEventListener("mousedown",g),document.removeEventListener("touchstart",g)}},[l,e]),t.jsxs(t.Fragment,{children:[d&&t.jsx("div",{className:"fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in",children:t.jsxs("div",{className:"bg-gray-900 border border-cyan-500/50 rounded-xl px-6 py-4 shadow-2xl flex items-center gap-3",children:[t.jsx("div",{className:"w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"}),t.jsx("span",{className:"text-cyan-300 font-bold text-sm",children:"Capturing..."})]})}),t.jsxs("div",{className:"relative",ref:p,onMouseEnter:C,onMouseLeave:y,children:[t.jsx("button",{onClick:x,className:`camera-menu-trigger ${a} ${l?r:n}`,title:e?"Camera Menu":"Click: Take Snapshot / Hover: Camera Menu",children:t.jsx(wo,{})}),l&&t.jsxs(wt,{width:"w-48",align:"end",children:[t.jsx("div",{className:"px-2 py-1 text-[10px] font-bold text-gray-500 border-b border-white/10 mb-1",children:"Camera Tools"}),t.jsxs("div",{className:"space-y-1",children:[t.jsxs("button",{onClick:()=>{o(5),s.undoCamera()},disabled:s.undoStack.length===0,className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/10 disabled:opacity-30 text-xs text-gray-300 text-left",children:[t.jsxs("span",{className:"flex items-center gap-2",children:[t.jsx(Hs,{})," Undo Move"]}),t.jsx("kbd",{className:"text-[8px] text-gray-500 bg-gray-800 px-1 rounded",children:"Ctrl+Shift+Z"})]}),t.jsxs("button",{onClick:()=>{o(5),s.redoCamera()},disabled:s.redoStack.length===0,className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/10 disabled:opacity-30 text-xs text-gray-300 text-left",children:[t.jsxs("span",{className:"flex items-center gap-2",children:[t.jsx(Gs,{})," Redo Move"]}),t.jsx("kbd",{className:"text-[8px] text-gray-500 bg-gray-800 px-1 rounded",children:"Ctrl+Shift+Y"})]}),t.jsxs("button",{onClick:()=>{o(30),s.resetCamera(),s.setShowLightGizmo(!1)},className:"w-full flex items-center gap-2 p-2 rounded hover:bg-white/10 text-xs text-gray-300 text-left",children:[t.jsx(Vs,{})," Reset Position"]}),t.jsx("div",{className:"h-px bg-white/10 my-1"}),t.jsxs("button",{onClick:b,className:"w-full flex items-center gap-2 p-2 rounded hover:bg-white/10 text-xs text-cyan-300 text-left",children:[t.jsx(Xa,{})," Camera Manager"]}),t.jsx("div",{className:"h-px bg-white/10 my-1"}),t.jsxs("button",{onClick:m,className:"w-full flex items-center gap-2 p-2 rounded hover:bg-cyan-900/50 text-xs text-cyan-400 font-bold text-left",title:"Save PNG with embedded scene data",children:[t.jsx(wo,{})," Take Snapshot"]})]})]})]})]})},Po=ue(),Dl=({isMobileMode:e,vibrate:o,btnBase:a,btnActive:r,btnInactive:n})=>{const s=E(),i=s,[l,c]=S.useState(!1),[d,u]=S.useState(!1),[f,p]=S.useState(""),[m,x]=S.useState(null),[C,y]=S.useState(null),b=S.useRef(null),g=S.useRef(null),h=ie.getMenuFeatures(),v=ie.getExtraMenuItems(),z=cr(s),M=z.charAt(0).toUpperCase()+z.slice(1);S.useEffect(()=>{const L=Po.gpuInfo;if(L)p(L);else{const $=setTimeout(()=>{p(Po.gpuInfo||"Generic WebGL Device")},3e3);return()=>clearTimeout($)}},[]),S.useEffect(()=>{const L=$=>{const q=$.target;if(b.current&&!b.current.contains(q)){if(q.closest(".portal-dropdown-content")||q.closest(".t-dropdown"))return;c(!1),u(!1)}};return l&&(document.addEventListener("mousedown",L),document.addEventListener("touchstart",L)),()=>{document.removeEventListener("mousedown",L),document.removeEventListener("touchstart",L)}},[l]);const w=L=>{L.stopPropagation(),o(5),c(!l)},j=()=>{const L=s.prepareExport(),$=s.projectSettings,q=s.getPreset(),H=new Blob([JSON.stringify(q,null,2)],{type:"application/json"}),G=URL.createObjectURL(H),D=document.createElement("a");D.href=G,D.download=Ir($.name,L,"json"),D.click(),URL.revokeObjectURL(G)},k=()=>{var L;return(L=g.current)==null?void 0:L.click()},P=async L=>{var q;const $=(q=L.target.files)==null?void 0:q[0];if($){Z.emit("is_compiling","Processing..."),await new Promise(H=>setTimeout(H,50));try{let H="";if($.type==="image/png"){const D=await rr($,"FractalData");if(D)H=D;else throw new Error("No Fractal Data found in this image.")}else H=await $.text();const G=JSON.parse(H);s.loadPreset(G),o(50),c(!1)}catch(H){console.error("Load Failed:",H),Z.emit("is_compiling",!1),y("Error!"),setTimeout(()=>y(null),2e3),alert("Could not load preset. "+(H instanceof Error?H.message:String(H)))}L.target.value=""}},I=()=>{let $=s.getShareString({includeAnimations:!0}),q="";if($.length>4096){const G=s.getShareString({includeAnimations:!1});G.length<$.length&&G.length<4096?($=G,q=" (Anims Removed)"):q=" (Long URL)"}const H=`${window.location.origin}${window.location.pathname}#s=${$}`;navigator.clipboard.writeText(H).then(()=>{x(`Copied!${q}`),o(50),setTimeout(()=>x(null),2500)})},_=(L,$,q)=>{var T,O;const H=ie.get(L);if(((T=H==null?void 0:H.engineConfig)==null?void 0:T.mode)==="compile"&&((O=H.params[$])==null?void 0:O.onUpdate)==="compile"){s.movePanel("Engine","left"),setTimeout(()=>Z.emit("engine_queue",{featureId:L,param:$,value:q}),50);return}const G=`set${L.charAt(0).toUpperCase()+L.slice(1)}`,D=s[G];if(D&&(D({[$]:q}),H!=null&&H.tabConfig)){const B=H.tabConfig.label;L==="engineSettings"?q&&s.movePanel(B,"left"):q?s.floatTab(B):s.dockTab(B)}},F=(L,$=!1)=>{const q=i[L.id||L.featureId];if(!q)return null;const H=!!q[L.toggleParam];L.id;const G=L.id==="audio"?"text-green-400":"text-cyan-400";if($){const T={Code:t.jsx(aa,{}),Info:t.jsx(yr,{})},O=L.icon?T[L.icon]:null;return t.jsxs("button",{onClick:B=>{B.stopPropagation(),o(5),_(L.featureId,L.toggleParam,!H),c(!1)},className:`w-full flex items-center justify-between p-2 rounded transition-colors group ${H?"bg-white/10 text-cyan-400":"hover:bg-white/5 text-gray-300"}`,children:[t.jsx("span",{className:"text-xs font-bold",children:L.label}),O]},`${L.featureId}-${L.toggleParam}`)}const D=H?L.id==="audio"?"bg-green-500/30 text-green-300 border-green-500/40":"bg-cyan-500/30 text-cyan-300 border-cyan-500/40":"bg-white/[0.04] text-gray-600 border-white/5";return t.jsxs("div",{className:"flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer animate-fade-in-left",onClick:()=>{o(5),_(L.id,L.toggleParam,!H)},children:[t.jsx("span",{className:`text-xs font-bold ${H?G:"text-gray-300"}`,children:L.label}),t.jsx("span",{className:`px-2 py-0.5 text-[8px] font-bold rounded-sm border transition-all ${D}`,children:H?"ON":"OFF"})]},L.id)},A=L=>{o(10),Z.emit("is_compiling","Switching Profile..."),setTimeout(()=>{s.applyPreset({mode:L.toLowerCase(),actions:s})},10)},N=h.filter(L=>!L.advancedOnly),R=h.filter(L=>L.advancedOnly),X=v.filter(L=>L.advancedOnly);return t.jsxs(t.Fragment,{children:[!e&&t.jsxs(t.Fragment,{children:[t.jsxs("button",{onClick:I,className:`${a} ${n} relative`,title:"Copy Share Link",children:[t.jsx(Ba,{}),m&&t.jsx("div",{className:"absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-green-600 text-white text-[9px] font-bold rounded whitespace-nowrap animate-fade-in",children:m})]}),t.jsx("button",{onClick:j,className:`${a} ${n}`,title:"Save Preset (JSON)",children:t.jsx(vo,{})}),t.jsxs("button",{onClick:k,className:`${a} ${n} relative`,title:"Load Preset (JSON or PNG)",children:[t.jsx(Na,{}),C&&t.jsx("div",{className:"absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-blue-600 text-white text-[9px] font-bold rounded whitespace-nowrap animate-fade-in",children:C})]})]}),t.jsx("input",{ref:g,type:"file",accept:".json,.png",className:"hidden",onChange:P}),t.jsxs("div",{className:"relative",ref:b,children:[t.jsx("button",{onClick:w,className:`${a} ${l?r:n}`,children:t.jsx($s,{})}),l&&t.jsx(wt,{width:"w-64",align:"end",className:"p-2 custom-scroll overflow-y-auto max-h-[85vh]",onClose:w,children:t.jsxs("div",{className:"space-y-1",children:[t.jsxs("button",{onClick:L=>{L.stopPropagation(),I()},className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group",children:[t.jsx("span",{className:`text-xs font-bold ${m?"text-green-400":"group-hover:text-white"}`,children:m||"Copy Share Link"}),t.jsx(Ba,{active:!!m})]}),t.jsx("div",{className:"h-px bg-white/10 my-1"}),e&&t.jsxs(t.Fragment,{children:[t.jsxs("button",{onClick:L=>{L.stopPropagation(),w(L),j()},className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group border-b border-white/10 mb-1",children:[t.jsx("span",{className:"text-xs font-bold group-hover:text-white",children:"Save Preset"}),t.jsx(vo,{})]}),t.jsxs("button",{onClick:L=>{L.stopPropagation(),w(L),k()},className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group border-b border-white/10 mb-1",children:[t.jsx("span",{className:"text-xs font-bold group-hover:text-white",children:"Load Preset"}),t.jsx(Na,{})]}),t.jsx("div",{className:"h-px bg-white/10 my-1"})]}),N.map(L=>F(L)),t.jsx("div",{className:"h-px bg-white/10 my-1"}),F({id:"engineSettings",toggleParam:"showEngineTab",label:"Engine Settings"}),t.jsx("div",{className:"px-2 mb-1 mt-0.5",children:t.jsx(kt,{value:M,onChange:A,selectClassName:"!text-left pl-2",options:[{label:"Fastest (Bare)",value:"Fastest"},{label:"Lite (Fast)",value:"Lite"},{label:"Balanced",value:"Balanced"},{label:"Ultra",value:"Ultra"},{label:"---",value:"Custom"}],fullWidth:!0})}),t.jsxs("button",{onClick:L=>{L.stopPropagation(),o(5),s.openWorkshop(),c(!1)},className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group",children:[t.jsx("span",{className:"text-xs font-bold group-hover:text-purple-400",children:"Formula Workshop"}),t.jsx(aa,{})]}),t.jsxs("button",{onClick:L=>{L.stopPropagation(),s.setIsBroadcastMode(!0)},className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group",children:[t.jsxs("span",{className:"text-xs font-bold group-hover:text-cyan-400",children:["Hide Interface ",t.jsx("span",{className:"text-gray-500 font-normal",children:"[B]"})]}),t.jsx(Bs,{})]}),t.jsxs("div",{className:"flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer",onClick:()=>{o(5),s.setInvertY(!s.invertY)},children:[t.jsx("span",{className:"text-xs text-gray-300 font-bold",children:"Invert Look Y"}),t.jsx("span",{className:`px-2 py-0.5 text-[8px] font-bold rounded-sm border transition-all ${s.invertY?"bg-cyan-500/30 text-cyan-300 border-cyan-500/40":"bg-white/[0.04] text-gray-600 border-white/5"}`,children:s.invertY?"ON":"OFF"})]}),t.jsx("div",{className:"h-px bg-white/10 my-1"}),t.jsxs("div",{className:"flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer",title:"Keyboard: ` (tilde)",onClick:()=>s.setAdvancedMode(!s.advancedMode),children:[t.jsxs("span",{className:"text-xs text-gray-300 font-bold",children:["Advanced Mode ",t.jsx("span",{className:"text-gray-500 font-normal",children:"[`]"})]}),t.jsx("span",{className:`px-2 py-0.5 text-[8px] font-bold rounded-sm border transition-all ${s.advancedMode?"bg-purple-500/30 text-purple-300 border-purple-500/40":"bg-white/[0.04] text-gray-600 border-white/5"}`,children:s.advancedMode?"ON":"OFF"})]}),s.advancedMode&&t.jsxs("div",{className:"mt-1 pl-2 border-l border-white/10 ml-2",children:[R.map(L=>F(L)),X.map(L=>F(L,!0)),t.jsxs("div",{className:"flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer",onClick:()=>s.setDebugMobileLayout(!s.debugMobileLayout),children:[t.jsx("span",{className:"text-xs text-gray-300 font-bold",children:"Force Mobile UI"}),t.jsx("span",{className:`px-2 py-0.5 text-[8px] font-bold rounded-sm border transition-all ${s.debugMobileLayout?"bg-purple-500/30 text-purple-300 border-purple-500/40":"bg-white/[0.04] text-gray-600 border-white/5"}`,children:s.debugMobileLayout?"ON":"OFF"})]})]}),t.jsx("div",{className:"h-px bg-white/10 my-1"}),t.jsxs("div",{className:"flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer",title:"Keyboard: H",onClick:()=>{o(5),s.setShowHints(!s.showHints)},children:[t.jsxs("span",{className:"text-xs text-gray-300 font-bold",children:["Show Hints ",t.jsx("span",{className:"text-gray-500 font-normal",children:"[H]"})]}),t.jsx("span",{className:`px-2 py-0.5 text-[8px] font-bold rounded-sm border transition-all ${s.showHints?"bg-green-500/30 text-green-300 border-green-500/40":"bg-white/[0.04] text-gray-600 border-white/5"}`,children:s.showHints?"ON":"OFF"})]}),t.jsxs("button",{onClick:L=>{L.stopPropagation(),o(5),s.openHelp("general.shortcuts"),c(!1)},className:"w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-cyan-400 transition-colors group",children:[t.jsx("span",{className:"text-xs font-bold group-hover:text-cyan-200",children:"Help"}),t.jsx(br,{})]}),t.jsxs("button",{onClick:L=>{L.stopPropagation(),o(5),u(!d)},className:`w-full flex items-center justify-between p-2 rounded transition-colors ${d?"bg-white/10 text-cyan-400":"hover:bg-white/5 text-gray-300"}`,children:[t.jsx("span",{className:"text-xs font-bold",children:"About GMT"}),t.jsx(Ws,{})]}),d&&t.jsx("div",{className:"p-3 bg-white/5 rounded-lg border border-white/5 animate-fade-in mt-1",children:t.jsxs("div",{className:"text-[10px] text-gray-400 leading-relaxed space-y-2",children:[f&&t.jsxs("div",{className:"mb-2 pb-2 border-b border-white/10",children:[t.jsx("div",{className:"text-[8px] text-gray-500 font-bold mb-1",children:"Active Renderer"}),t.jsx("div",{className:"text-[9px] text-green-400 font-mono break-all",children:f})]}),t.jsx("p",{className:"text-[9px] text-gray-500 font-mono mb-1",children:"v0.8.9"}),t.jsxs("p",{children:["GMT was crafted with ❤️ by ",t.jsx("span",{className:"text-white font-bold",children:"Guy Zack"})," using ",t.jsx("a",{href:"https://aistudio.google.com",target:"_blank",rel:"noopener noreferrer",className:"text-cyan-400 hover:underline",children:"Gemini"})," and ",t.jsx("a",{href:"https://claude.ai",target:"_blank",rel:"noopener noreferrer",className:"text-cyan-400 hover:underline",children:"Claude"}),"."]}),t.jsxs("div",{className:"pt-2 border-t border-white/10",children:[t.jsx("div",{className:"text-[8px] text-gray-500 font-bold mb-1",children:"Tech Stack"}),t.jsx("div",{className:"text-[9px] text-gray-500 font-mono",children:"React + TypeScript + Three.js + GLSL + Zustand + Vite"})]}),t.jsxs("div",{className:"flex flex-col gap-1 pt-2 border-t border-white/10",children:[t.jsxs("a",{href:"https://www.reddit.com/r/GMT_fractals/",target:"_blank",rel:"noopener noreferrer",className:"flex items-center gap-2 hover:text-white transition-colors",children:[t.jsx("span",{children:"Community:"}),t.jsx("span",{className:"text-cyan-400 hover:underline",children:"r/GMT_fractals"})]}),t.jsxs("a",{href:"https://github.com/gamazama/GMT-fractals",target:"_blank",rel:"noopener noreferrer",className:"flex items-center gap-2 hover:text-white transition-colors",children:[t.jsx("span",{children:"Source:"}),t.jsx("span",{className:"text-cyan-400 hover:underline",children:"GitHub (GPL-3.0)"})]})]})]})})]})})]})]})},Ll=()=>{const e=E(),[o,a]=S.useState(window.innerWidth),[r,n]=S.useState(!1);S.useEffect(()=>{const u=()=>a(window.innerWidth),f=()=>n(window.matchMedia("(pointer: coarse)").matches);return window.addEventListener("resize",u),f(),()=>window.removeEventListener("resize",u)},[]);const s=e.debugMobileLayout||o<768||r,i=(u=10)=>{navigator.vibrate&&navigator.vibrate(u)},l="p-2.5 rounded-lg transition-all active:scale-95 border flex items-center justify-center",c="bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/10",d="bg-gray-800 border-gray-600 text-white";return t.jsxs("header",{className:"relative shrink-0 w-full h-14 z-[500] bg-black/90 border-b border-white/10 flex items-center justify-between px-6 animate-fade-in-down select-none",children:[t.jsx(gl,{isMobileMode:s,vibrate:i}),t.jsx(Fl,{isMobileMode:s,vibrate:i}),t.jsxs("div",{className:"flex gap-2 relative items-center",children:[t.jsx(_l,{isMobileMode:s,vibrate:i,btnBase:l,btnActive:d,btnInactive:c}),t.jsx("div",{className:"h-6 w-px bg-white/10 mx-1"}),t.jsx(Dl,{isMobileMode:s,vibrate:i,btnBase:l,btnActive:d,btnInactive:c})]})]})},Za=()=>{const[e,o]=S.useState(typeof window<"u"?window.innerHeight>window.innerWidth:!1),[a,r]=S.useState(!1);return S.useEffect(()=>{const n=()=>{o(window.innerHeight>window.innerWidth),r(window.matchMedia("(pointer: coarse)").matches||window.innerWidth<768)};return window.addEventListener("resize",n),n(),()=>window.removeEventListener("resize",n)},[]),{isPortrait:e,isMobile:a}},To=({onMove:e,label:o,active:a})=>{const[r,n]=S.useState(!1),[s,i]=S.useState({x:0,y:0}),l=S.useRef(null),c=S.useRef(null),d=S.useRef({x:0,y:0}),u=S.useCallback((p,m)=>{if(!l.current)return;const x=l.current.getBoundingClientRect(),C=x.left+x.width/2,y=x.top+x.height/2,b=x.width/2;let g=(p-C)/b,h=(m-y)/b;const v=Math.sqrt(g*g+h*h);v>1&&(g/=v,h/=v);const z=30,M=Math.min(1,v),w=(v>0?g:0)*M*z,j=(v>0?h:0)*M*z;i({x:w,y:j}),d.current={x:g,y:-h}},[]),f=p=>{a&&(p.stopPropagation(),c.current=p.pointerId,n(!0),u(p.clientX,p.clientY),navigator.vibrate&&navigator.vibrate(10))};return S.useEffect(()=>{if(!r)return;const p=x=>{x.pointerId===c.current&&(x.cancelable&&x.preventDefault(),u(x.clientX,x.clientY),e(d.current.x,d.current.y))},m=x=>{x.pointerId===c.current&&(d.current={x:0,y:0},e(0,0),n(!1),i({x:0,y:0}),c.current=null,navigator.vibrate&&navigator.vibrate(5))};return window.addEventListener("pointermove",p,{passive:!1}),window.addEventListener("pointerup",m),window.addEventListener("pointercancel",m),()=>{window.removeEventListener("pointermove",p),window.removeEventListener("pointerup",m),window.removeEventListener("pointercancel",m)}},[r,u,e]),t.jsx("div",{ref:l,className:`w-36 h-36 rounded-full transition-all duration-200 relative flex items-center justify-center touch-none select-none ${r?"scale-110 shadow-[0_0_30px_rgba(34,211,238,0.1)]":"scale-100"} ${a?"pointer-events-auto":"pointer-events-none"}`,style:{touchAction:"none"},onPointerDown:f,children:t.jsxs("div",{className:`w-24 h-24 rounded-full border transition-all duration-500 flex items-center justify-center ${r?"bg-cyan-500/10 border-cyan-400":"bg-white/5 border-white/10"} ${a?"opacity-100":"opacity-0 scale-50"}`,children:[t.jsx("div",{className:`absolute -top-6 text-[8px] font-bold pointer-events-none transition-colors ${r?"text-cyan-400":"text-white/30"}`,children:o}),t.jsx("div",{className:"absolute inset-2 rounded-full border border-white/5 pointer-events-none"}),t.jsx("div",{className:`w-10 h-10 rounded-full border shadow-xl transition-transform duration-75 pointer-events-none ${r?"bg-cyan-400 border-white shadow-[0_0_20px_rgba(34,211,238,0.5)]":"bg-white/10 border-white/20"}`,style:{transform:`translate(${s.x}px, ${s.y}px)`}})]})})},El=()=>{const{cameraMode:e,setCameraMode:o,debugMobileLayout:a}=E(),{isMobile:r}=Za(),[n,s]=S.useState(!1);S.useEffect(()=>{s(r||a)},[a,r]);const i=S.useCallback((d,u)=>{window.dispatchEvent(new CustomEvent("joyMove",{detail:{x:d,y:u}}))},[]),l=S.useCallback((d,u)=>{window.dispatchEvent(new CustomEvent("joyLook",{detail:{x:d,y:u}}))},[]);if(!n)return null;const c=e==="Fly";return t.jsxs("div",{className:"absolute inset-0 pointer-events-none z-[100] flex flex-col justify-between p-6 pb-10",children:[t.jsx("div",{className:"flex justify-start pt-16",children:t.jsxs("button",{onClick:()=>{navigator.vibrate&&navigator.vibrate(20),o(c?"Orbit":"Fly")},className:"pointer-events-auto flex items-center gap-2 bg-black/80 border border-white/20 px-4 py-2.5 rounded-full backdrop-blur-xl shadow-2xl active:scale-90 transition-all active:border-cyan-400",children:[t.jsx("div",{className:`w-2 h-2 rounded-full ${c?"bg-cyan-400 animate-pulse shadow-[0_0_5px_cyan]":"bg-purple-400"}`}),t.jsxs("span",{className:"text-[10px] font-bold text-white",children:[e," Mode"]})]})}),t.jsxs("div",{className:"flex justify-between items-end transition-all duration-500",children:[t.jsx("div",{className:c?"pointer-events-auto":"pointer-events-none",children:t.jsx(To,{label:"Move",onMove:i,active:c})}),t.jsx("div",{className:c?"pointer-events-auto":"pointer-events-none",children:t.jsx(To,{label:"Look",onMove:l,active:c})})]})]})};class Al{constructor(o){J(this,"ctx",null);J(this,"imageData",null);const a=o.getContext("2d",{alpha:!0});a&&(this.ctx=a)}render(o,a){if(!this.ctx)return;const r=this.ctx.canvas;(r.width!==r.clientWidth||r.height!==r.clientHeight)&&(r.width=r.clientWidth,r.height=r.clientHeight,this.imageData=null);const n=r.width,s=r.height;if(n===0||s===0)return;(!this.imageData||this.imageData.width!==n||this.imageData.height!==s)&&(this.imageData=this.ctx.createImageData(n,s));const i=this.imageData.data,l=o*.001,c=l*.5,d=Math.cos(c)*.7885,u=Math.sin(c)*.7885,f=1.5-.9*Math.pow(a,.5),p=(1-Math.pow(a,.2))*.5,m=Math.sin(p),x=Math.cos(p),C=(1-a)*.5,y=10+80*Math.pow(a,1.5),b=Math.min(Math.floor(y),90),g=1/s,h=n*.5,v=s*.5;for(let z=0;z<s;z++){const M=s-1-z,w=1/n;for(let j=0;j<n;j++){let k=(j-h)*g,P=(M-v)*g;k+=C,k*=f,P*=f;const I=x*k-m*P,_=m*k+x*P;let F=I,A=_,N=0;for(let X=0;X<b;X++){const L=F*F,$=A*A;if(L+$>4)break;A=2*F*A+u,F=L-$+d,N++}const R=(z*n+j)*4;if(N>=b)i[R]=0,i[R+1]=0,i[R+2]=0,i[R+3]=0;else{const X=F*F+A*A,q=3+(N-Math.log2(Math.log2(X))+4)/64*10;let H=.5+.5*Math.cos(q),G=.5+.5*Math.cos(q+.6),D=.5+.5*Math.cos(q+1);const T=j*w,O=.1*Math.sin(T*30-l*8)*a;H+=O,G+=O,D+=O,i[R]=Math.max(0,Math.min(255,H*255|0)),i[R+1]=Math.max(0,Math.min(255,G*255|0)),i[R+2]=Math.max(0,Math.min(255,D*255|0)),i[R+3]=255}}}this.ctx.putImageData(this.imageData,0,0)}dispose(){this.ctx=null,this.imageData=null}}ue();const Ro=["Generative Math Tracer","GPU Manifold Tracer","GPU Mandelorus Tracer","Geometric Morphology Toolkit","GLSL Marching Toolkit","Generative Morphology Theater","Grand Mathematical Topography","Geometric Manifold Traversal","Gradient Mapped Topology","Generalized Mesh Tracer","Gravitational Manifold Theory","Glass Mountain Telescope","Ghost Manifold Terminal","Garden of Mathematical Terrain","Glimpse Machine Terminal","Grey Matter Telescope","Grotesque Math Theater","Geometry Mutation Terminal","Galactic Morphology Telescope","Grand Mythos Terminal","Glowing Mathematical Topologies","God's Math Toy","Gnarly Math Thing","Generally Mesmerizing Thingamajig","Give Me Tentacles","Gloriously Melted Teapots","Gaze-into Mathematical Twilight","Greenwich Mean Time","Geometrically Mangled Tesseracts","Gratuitous Mandelbulb Torture","Got More Tentacles","Groovy Morphing Thingamabob"],Nl=()=>Ro[Math.floor(Math.random()*Ro.length)],Io=e=>`thumbnails/fractal_${e}.jpg`,Bl=({isReady:e,onFinished:o,startupMode:a,bootEngine:r})=>{var L;const n=S.useRef(null),s=S.useRef(null),i=S.useRef(!1),l=S.useRef(e),c=S.useRef(r),d=S.useRef(!1);S.useEffect(()=>{l.current=e},[e]),S.useEffect(()=>{c.current=r},[r]);const u=S.useRef(null),f=E($=>$.formula),p=E($=>$.setFormula),m=E($=>$.loadPreset),x=E($=>$.applyPreset),C=E($=>$.quality),y=(C==null?void 0:C.precisionMode)===1,[b,g]=S.useState(0),h=S.useRef(0),[v,z]=S.useState(1),[M,w]=S.useState(!0),[j,k]=S.useState(!1);S.useEffect(()=>{i.current=j},[j]);const[P,I]=S.useState(null),[_]=S.useState(Nl),F=()=>{d.current||(d.current=!0,c.current&&c.current())},A=$=>{const q=ge.get($);q&&q.defaultPreset&&m(q.defaultPreset),p($),k(!1),g(0),h.current=0,d.current&&c.current&&c.current(!0)},N=async $=>{var H;const q=(H=$.target.files)==null?void 0:H[0];if(q)try{let G="";if(q.type==="image/png"){const T=await rr(q,"FractalData");if(T)G=T;else throw new Error("No Fractal Data found in PNG.")}else G=await q.text();const D=JSON.parse(G);m(D),k(!1),g(0),h.current=0,d.current&&c.current&&c.current(!0)}catch(G){alert("Load failed: "+(G instanceof Error?G.message:String(G)))}},R=()=>{const $=y?"balanced":"lite";if(Z.emit("is_compiling",`Switching to ${$} mode...`),x){const q=E.getState();x({mode:$,actions:q})}},X=S.useMemo(()=>ge.getAll(),[]);return S.useEffect(()=>{if(!n.current)return;s.current=new Al(n.current);let $=0,q=0,H=performance.now();const G=2500,D=T=>{const O=performance.now(),B=Math.min(O-H,60);H=O;const V=i.current;q<100&&(q+=B*(100/G)),q>100&&(q=100),Math.floor(q)>Math.floor(h.current)&&(h.current=q,g(q)),s.current&&s.current.render(T,q/100),q>=100&&!V?(F(),l.current?(s.current&&(s.current.dispose(),s.current=null),z(0),setTimeout(()=>{w(!1),o()},800)):$=requestAnimationFrame(D)):$=requestAnimationFrame(D)};return $=requestAnimationFrame(D),()=>{cancelAnimationFrame($),s.current&&(s.current.dispose(),s.current=null)}},[]),S.useEffect(()=>{F()},[]),M?t.jsxs("div",{className:"fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black transition-opacity duration-1000",style:{opacity:v},children:[t.jsxs("div",{className:"text-center mb-10 relative animate-fade-in-up z-10",children:[t.jsxs("h1",{className:"text-7xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] mb-2",children:["G",t.jsx("span",{className:"text-cyan-400",children:"M"}),"T"]}),t.jsx("div",{className:"text-xs text-gray-400 font-mono uppercase tracking-[0.4em]",children:_})]}),t.jsxs("div",{className:"relative z-10 w-[500px] h-16 bg-gray-900/80 rounded-full border border-gray-700/50 overflow-hidden shadow-[0_0_50px_rgba(0,255,255,0.1)] backdrop-blur-sm",children:[t.jsx("div",{className:"absolute top-0 left-0 h-full overflow-hidden will-change-[width] transition-[width] duration-75 ease-linear",style:{width:`${b}%`},children:t.jsx("canvas",{ref:n,className:"absolute top-0 left-0 w-[500px] h-16"})}),t.jsx("div",{className:"absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"})]}),t.jsx("div",{className:"mt-6 font-mono text-sm text-cyan-500/80 z-20 flex flex-col items-center h-10",children:a==="url"?t.jsxs("span",{className:"animate-pulse",children:["LOADING SHARED SCENE... ",Math.floor(b),"%"]}):t.jsxs("div",{className:"relative flex flex-col items-center",children:[t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsx("span",{className:"text-cyan-600/80",children:"LOADING"}),t.jsxs("button",{onClick:()=>k(!j),className:"flex items-center gap-1 text-cyan-400 hover:text-white transition-colors border-b border-dashed border-cyan-500/30 hover:border-cyan-400 pb-0.5 outline-none",children:[t.jsxs("span",{className:"font-bold",children:["[",f,"]"]}),t.jsx("span",{className:`text-[10px] transform transition-transform ${j?"rotate-180":""}`,children:t.jsx(Pt,{})})]}),t.jsxs("span",{className:"text-cyan-600/80",children:[Math.floor(b),"%"]})]}),t.jsx("button",{onClick:R,className:`mt-4 px-3 py-1.5 text-[9px] font-bold rounded border transition-all ${y?"bg-orange-900/40 text-orange-200 border-orange-500/40 hover:bg-orange-800/50":"bg-white/5 text-gray-500 border-white/5 hover:text-white hover:border-white/20"}`,children:y?"Lite Render Active":"Enable Lite Render"}),j&&t.jsxs("div",{className:"absolute bottom-full mb-4 w-[340px] bg-black/95 border border-white/20 rounded-xl shadow-[0_10px_60px_rgba(0,0,0,0.9)] backdrop-blur-xl animate-fade-in text-xs z-[110]",onMouseLeave:()=>I(null),children:[P&&P!=="Modular"&&t.jsxs("div",{className:"absolute left-[350px] bottom-0 w-[256px] h-[256px] bg-black border border-cyan-500/50 rounded-lg shadow-[0_0_50px_rgba(0,0,0,1)] overflow-hidden animate-fade-in pointer-events-none",children:[t.jsx("img",{src:Io(P),className:"w-full h-full object-cover",alt:"Preview",onError:$=>{$.currentTarget.style.display="none"}}),t.jsx("div",{className:"absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,4px_100%] pointer-events-none"}),t.jsx("div",{className:"absolute bottom-0 left-0 right-0 p-3 bg-black/60 text-cyan-300 font-bold text-[9px] border-t border-white/5",children:(L=ge.get(P))==null?void 0:L.name})]}),t.jsxs("div",{className:"p-1 max-h-[400px] overflow-y-auto custom-scroll",children:[t.jsxs("button",{onClick:()=>{var $;return($=u.current)==null?void 0:$.click()},className:"w-full flex items-center gap-2 px-3 py-2 text-left text-gray-300 hover:bg-white/10 hover:text-white rounded transition-colors mb-1 border-b border-white/10",children:[t.jsx(vr,{})," ",t.jsx("span",{className:"font-bold text-[10px]",children:"Load From File..."})]}),t.jsx("input",{type:"file",ref:u,className:"hidden",accept:".json,.png",onChange:N}),t.jsx("div",{className:"px-3 py-1.5 text-[9px] font-bold text-gray-500 bg-white/5 mb-1",children:"Select Engine"}),X.map($=>t.jsxs("button",{onClick:()=>A($.id),onMouseEnter:()=>I($.id),className:`w-full text-left px-3 py-2.5 transition-all flex gap-3 border-b border-white/5 last:border-b-0 ${$.id===f?"bg-cyan-900/30":"hover:bg-white/5"}`,children:[t.jsxs("div",{className:"w-16 h-10 shrink-0 bg-black rounded border border-white/10 overflow-hidden relative",children:[$.id!=="Modular"?t.jsx("img",{src:Io($.id),alt:$.name,className:"w-full h-full object-cover",onError:q=>{q.currentTarget.style.display="none",q.currentTarget.nextElementSibling&&(q.currentTarget.nextElementSibling.style.display="flex")}}):null,t.jsx("div",{className:`w-full h-full items-center justify-center text-gray-700 bg-gray-900 ${$.id!=="Modular"?"hidden":"flex"}`,children:$.id==="Modular"?t.jsx(zr,{}):t.jsx(fa,{})})]}),t.jsx("div",{className:"flex flex-col min-w-0",children:t.jsx("span",{className:`text-[11px] font-bold tracking-tight mb-0.5 ${$.id===f?"text-cyan-400":"text-gray-200"}`,children:$.name})})]},$.id))]})]})]})})]}):null},Ol=(e,o)=>{const a=E,r=le;S.useEffect(()=>{const n=s=>{const i=s.target,l=i.tagName==="INPUT"&&i.type==="range";if(i.tagName==="INPUT"&&!l||i.tagName==="TEXTAREA"||i.isContentEditable)return;const d=s.ctrlKey||s.metaKey,u=s.shiftKey;if(d&&!s.altKey){const f=a.getState().isTimelineHovered;if(s.code==="KeyZ"&&u){s.preventDefault(),s.stopPropagation(),a.getState().undoCamera();return}if(s.code==="KeyY"&&u){s.preventDefault(),s.stopPropagation(),a.getState().redoCamera();return}if(s.code==="KeyZ"&&!u){s.preventDefault(),s.stopPropagation(),f&&r.getState().undo()||a.getState().undoParam();return}if(s.code==="KeyY"&&!u){s.preventDefault(),s.stopPropagation(),f&&r.getState().redo()||a.getState().redoParam();return}}switch(s.code){case"Tab":s.preventDefault(),a.getState().setCameraMode(a.getState().cameraMode==="Fly"?"Orbit":"Fly");break;case"KeyT":d||o(y=>!y);break;case"Escape":a.getState().isBroadcastMode&&a.getState().setIsBroadcastMode(!1),a.getState().interactionMode!=="none"&&a.getState().setInteractionMode("none"),r.getState().deselectAll();break;case"KeyH":a.getState().setShowHints(!a.getState().showHints);break;case"Backquote":a.getState().setAdvancedMode(!a.getState().advancedMode);break;case"KeyB":if(!d){const y=a.getState();y.setIsBroadcastMode(!y.isBroadcastMode)}break;case"Space":const{cameraMode:f,isTimelineHovered:p}=a.getState(),{sequence:m,isPlaying:x}=r.getState();let C=!1;if(e)C=f!=="Fly"||p;else{const y=Object.keys(m.tracks).length>0;f!=="Fly"&&y&&(C=!0)}C&&(s.preventDefault(),x?r.getState().pause():r.getState().play());break}};return window.addEventListener("keydown",n,{capture:!0}),()=>window.removeEventListener("keydown",n,{capture:!0})},[e,o])},$l=ue(),Fo=({onUpdate:e,autoUpdate:o,trigger:a,source:r})=>{const n=S.useRef(a);return S.useEffect(()=>{let s=0,i=0;const l=()=>{const c=a!==n.current;c&&(n.current=a),i++,(o&&i%60===0||c)&&$l.requestHistogramReadback(r).then(u=>{u.length>0&&e(u)}),s=requestAnimationFrame(l)};return l(),()=>cancelAnimationFrame(s)},[o,a,r,e]),null},Hl=({state:e,actions:o,isMobile:a,hudRefs:r})=>{var f;const n=S.useRef(null),s=S.useRef(null),i=e.tabSwitchCount,l=o.incrementTabSwitchCount;S.useEffect(()=>{const p=le.subscribe(m=>m.isCameraInteracting,m=>{r.container.current&&(m?(r.container.current.style.opacity="1",s.current&&(clearTimeout(s.current),s.current=null)):(s.current&&clearTimeout(s.current),s.current=window.setTimeout(()=>{r.container.current&&(r.container.current.style.opacity="0")},2e3)))});return()=>{p(),s.current&&clearTimeout(s.current)}},[]),S.useEffect(()=>E.subscribe(m=>m.cameraMode,()=>l()),[l]);const c=p=>{if(!n.current||e.cameraMode==="Orbit")return;const m=n.current.getBoundingClientRect(),x=b=>{const g=Math.max(0,Math.min(1,(b-m.left)/m.width)),h=Math.pow(10,g*3-3);o.setNavigation({flySpeed:h}),(g===0||g===1)&&navigator.vibrate&&navigator.vibrate(5)};x(p.clientX);const C=b=>x(b.clientX),y=()=>{window.removeEventListener("pointermove",C),window.removeEventListener("pointerup",y)};window.addEventListener("pointermove",C),window.addEventListener("pointerup",y)},d=((f=e.navigation)==null?void 0:f.flySpeed)??.5,u=(Math.log10(d)+3)/3;return t.jsx("div",{ref:r.container,className:"absolute inset-0 pointer-events-none z-10 transition-opacity duration-500 opacity-0",children:t.jsxs("div",{className:"absolute inset-0 flex items-center justify-center",children:[t.jsx("div",{className:"absolute pointer-events-none opacity-20",children:e.cameraMode==="Fly"?t.jsxs(t.Fragment,{children:[t.jsx("div",{className:"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40px] h-[1px] bg-cyan-400"}),t.jsx("div",{className:"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-[40px] bg-cyan-400"})]}):t.jsxs("div",{className:"relative flex items-center justify-center",children:[t.jsx("div",{className:"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20px] h-[1px] bg-cyan-400"}),t.jsx("div",{className:"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-[20px] bg-cyan-400"}),t.jsx("div",{className:"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[24px] h-[24px] rounded-full border border-cyan-400 opacity-60"})]})}),t.jsxs("div",{ref:r.reticle,className:"absolute w-8 h-8 pointer-events-none opacity-0 transition-opacity duration-150 ease-out will-change-transform",children:[t.jsx("div",{className:"absolute inset-0 border-2 border-cyan-400 rounded-full shadow-[0_0_15px_cyan] opacity-80"}),t.jsx("div",{className:"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full"})]}),t.jsxs("div",{className:"absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-300 ease-out",style:{bottom:e.showHints&&!a?"4rem":"3.5rem"},children:[t.jsx("button",{ref:r.reset,onClick:()=>{o.resetCamera(),navigator.vibrate&&navigator.vibrate(30)},className:"pointer-events-auto px-4 py-1.5 bg-black/60 hover:bg-cyan-900/80 text-cyan-400 hover:text-white text-[9px] font-bold rounded-t-lg border-x border-t border-white/10 backdrop-blur-md hidden animate-fade-in shadow-xl mb-[-1px]",children:"Reset Camera"}),t.jsxs("div",{className:"flex items-stretch gap-px bg-black/40 rounded-full border border-white/10 backdrop-blur-md overflow-hidden pointer-events-auto shadow-2xl",children:[e.cameraMode==="Fly"&&t.jsxs(t.Fragment,{children:[t.jsxs("div",{ref:n,onPointerDown:c,className:"relative flex items-center px-6 py-3 cursor-ew-resize group min-w-[120px]",children:[t.jsx("div",{className:"absolute inset-0 bg-cyan-500/10 border-r border-cyan-500/20 transition-all duration-300 ease-out",style:{width:`${u*100}%`}}),t.jsxs("span",{ref:r.speed,className:"relative z-10 font-bold text-cyan-300 font-mono text-[10px] group-hover:text-white transition-colors",children:["Spd x",d.toFixed(3)]})]}),t.jsx("div",{className:"w-px bg-white/5"})]}),t.jsx("div",{className:"px-6 py-3 bg-white/5 flex items-center min-w-[100px] justify-center",children:t.jsx("span",{ref:r.dist,className:"text-cyan-500/80 font-mono text-[10px]",children:"Dst ---"})})]}),e.showHints&&!a&&t.jsxs("div",{className:"mt-3 text-[9px] font-medium text-white/40 text-center animate-fade-in text-shadow-sm whitespace-nowrap",children:[t.jsxs("span",{className:"text-cyan-400/60 font-bold mr-2",children:["[",e.cameraMode,"]"]}),e.cameraMode==="Fly"?"WASD Move · Space/C Vert · Shift Boost":"L-Drag Rotate · R-Drag Pan · Scroll Zoom"]}),i<2&&!a&&e.showHints&&t.jsxs("div",{className:"mt-2 text-[10px] font-bold text-cyan-300 animate-pulse bg-cyan-950/40 px-3 py-1 rounded border border-cyan-500/30 shadow-lg",children:["Press ",t.jsx("span",{className:"text-white border border-white/20 rounded px-1 bg-white/10 mx-0.5",children:"Tab"})," for ",e.cameraMode==="Orbit"?"Fly":"Orbit"," navigation"]})]})]})})};class _o{constructor(o){J(this,"element");J(this,"sourceNode",null);J(this,"gainNode",null);J(this,"fileUrl",null);J(this,"fileName",null);J(this,"isActive",!1);this.element=new Audio,this.element.loop=!0,this.element.crossOrigin="anonymous"}get isPlaying(){return!this.element.paused&&!!this.sourceNode}load(o,a,r){this.fileUrl&&URL.revokeObjectURL(this.fileUrl),this.fileUrl=URL.createObjectURL(o),this.fileName=o.name,this.element.src=this.fileUrl,this.isActive=!0,this.sourceNode||(this.sourceNode=a.createMediaElementSource(this.element),this.gainNode=a.createGain(),this.sourceNode.connect(this.gainNode),this.gainNode.connect(r))}play(){this.element.play().catch(o=>console.warn("Deck play failed",o))}pause(){this.element.pause()}stop(){this.element.pause(),this.element.currentTime=0}seek(o){this.element.currentTime=o}setVolume(o){this.gainNode&&(this.gainNode.gain.value=o)}get duration(){return this.element.duration||0}get currentTime(){return this.element.currentTime||0}}class Gl{constructor(){J(this,"audioContext",null);J(this,"analyser",null);J(this,"micSource",null);J(this,"decks",[null,null]);J(this,"masterGain",null);J(this,"dataArray",null);J(this,"isMicActive",!1);J(this,"crossfade",.5)}init(){this.audioContext||(this.audioContext=new(window.AudioContext||window.webkitAudioContext),this.masterGain=this.audioContext.createGain(),this.masterGain.gain.value=.8,this.masterGain.connect(this.audioContext.destination),this.analyser=this.audioContext.createAnalyser(),this.analyser.fftSize=2048,this.analyser.smoothingTimeConstant=.8,this.dataArray=new Uint8Array(this.analyser.frequencyBinCount),this.masterGain.connect(this.analyser),this.decks[0]=new _o(this.audioContext),this.decks[1]=new _o(this.audioContext),this.setCrossfade(.5))}setSmoothing(o){this.analyser&&(this.analyser.smoothingTimeConstant=Math.max(0,Math.min(.99,o)))}async connectMicrophone(){if(this.init(),!(!this.audioContext||!this.masterGain)){this.decks.forEach(o=>o==null?void 0:o.pause());try{const o=await navigator.mediaDevices.getUserMedia({audio:!0});this.micSource&&this.micSource.disconnect(),this.micSource=this.audioContext.createMediaStreamSource(o),this.micSource.connect(this.analyser),this.isMicActive=!0,this.audioContext.state==="suspended"&&this.audioContext.resume()}catch(o){console.error("AudioEngine: Mic access denied",o),alert("Microphone access denied.")}}}async connectSystemAudio(){if(this.init(),!!this.audioContext)try{const o=await navigator.mediaDevices.getDisplayMedia({video:!0,audio:!0});if(o.getVideoTracks().forEach(a=>a.stop()),o.getAudioTracks().length===0)return;this.micSource&&this.micSource.disconnect(),this.micSource=this.audioContext.createMediaStreamSource(o),this.micSource.connect(this.analyser),this.micSource.connect(this.audioContext.destination),this.isMicActive=!0,this.audioContext.state==="suspended"&&this.audioContext.resume()}catch(o){console.error("AudioEngine: System audio capture failed",o),alert("System audio capture failed. Check browser permissions.")}}loadTrack(o,a){var r;this.init(),!(!this.audioContext||!this.masterGain)&&(this.micSource&&(this.micSource.disconnect(),this.micSource=null,this.isMicActive=!1),(r=this.decks[o])==null||r.load(a,this.audioContext,this.masterGain),this.setCrossfade(this.crossfade),this.audioContext.state==="suspended"&&this.audioContext.resume())}play(o){var a;(a=this.decks[o])==null||a.play()}pause(o){var a;(a=this.decks[o])==null||a.pause()}stop(o){var a;(a=this.decks[o])==null||a.stop()}deactivateDeck(o){const a=this.decks[o];a&&(a.stop(),a.isActive=!1)}seek(o,a){var r;(r=this.decks[o])==null||r.seek(a)}getTrackInfo(o){const a=this.decks[o];return{duration:(a==null?void 0:a.duration)||1,currentTime:(a==null?void 0:a.currentTime)||0,hasTrack:!!(a!=null&&a.sourceNode),fileName:(a==null?void 0:a.fileName)||null,isPlaying:(a==null?void 0:a.isPlaying)||!1,isActive:(a==null?void 0:a.isActive)||!1}}setCrossfade(o){this.crossfade=o;const a=Math.cos(o*.5*Math.PI),r=Math.cos((1-o)*.5*Math.PI);this.decks[0]&&this.decks[0].setVolume(a),this.decks[1]&&this.decks[1].setVolume(r)}setMasterGain(o){this.masterGain&&this.masterGain.gain.setTargetAtTime(o,this.audioContext.currentTime,.1)}update(){!this.analyser||!this.dataArray||this.analyser.getByteFrequencyData(this.dataArray)}getRawData(){return this.dataArray}}const Fr=new Gl;class Vl{constructor(){J(this,"ruleValues",{});J(this,"lfoValues",{});J(this,"lfoStates",{});J(this,"outputValues",{});J(this,"lfoPrevOffsets",{});J(this,"offsets",{})}getRuleValue(o){return this.ruleValues[o]||0}updateOscillators(o,a,r){for(let n=0;n<o.length;n++){const s=o[n];if(!s.enabled)continue;const i=(a/s.period+s.phase)%1;let l=0;switch(s.shape){case"Sine":l=Math.sin(i*Math.PI*2);break;case"Triangle":l=1-Math.abs(i*2-1)*2;break;case"Sawtooth":l=i*2-1;break;case"Pulse":l=i<.5?1:-1;break;case"Noise":const p=s.id;this.lfoStates[p]||(this.lfoStates[p]=Math.random()),this.lfoStates[p]+=r*5,l=Math.sin(this.lfoStates[p])*Math.cos(this.lfoStates[p]*.73);break}const c=l*.5+.5;this.lfoValues[`lfo-${n+1}`]=c;const d=l*s.amplitude,u=this.lfoPrevOffsets[s.id]??d;let f=d;if(s.smoothing>.001){const p=50*Math.pow(1-s.smoothing,2)+.1,m=1-Math.exp(-p*r);f=u+(d-u)*m}this.lfoPrevOffsets[s.id]=f,this.offsets[s.target]=(this.offsets[s.target]||0)+f}}update(o,a){const r=Fr.getRawData();for(const n of o){if(!n.enabled)continue;let s=0;n.source==="audio"?r&&(s=this.processAudioSignal(n,r)):n.source.startsWith("lfo-")&&(s=this.lfoValues[n.source]||0);const i=this.ruleValues[n.id]||0;let l=i;if(s>i){const u=1-Math.pow(n.attack,.2);l=i+(s-i)*u}else{const u=1-Math.pow(n.decay,.2);l=i+(s-i)*u}this.ruleValues[n.id]=l;let c=l;if(n.smoothing&&n.smoothing>.001){const u=this.outputValues[n.id]||0,f=1-Math.pow(n.smoothing,.5);c=u+(l-u)*f}this.outputValues[n.id]=c;const d=c*n.gain+n.offset;this.offsets[n.target]=(this.offsets[n.target]||0)+d}}resetOffsets(){this.offsets={}}processAudioSignal(o,a){const r=a.length,n=Math.floor(o.freqStart*r),s=Math.floor(o.freqEnd*r);if(n>=r||s<=n)return 0;let i=0,l=0;for(let f=n;f<s;f++)i+=a[f],l++;if(l===0)return 0;const c=i/l/255;if(c<o.thresholdMin)return 0;const d=Math.max(.001,o.thresholdMax-o.thresholdMin),u=(c-o.thresholdMin)/d;return Math.min(1,u)}}const Ut=new Vl,$e=ue(),Do={current:new Set},Lo=new U,Eo=new yt,Ao=new Ii,Wt={current:new U(-1e3,-1e3,-1e3)},$a={current:-1},at={current:{}},Ul=e=>{var F,A,N;const o=le.getState(),a=E.getState(),n=Object.keys(o.sequence.tracks).length>0,s=a.animations.length>0,i=((A=(F=a.modulation)==null?void 0:F.rules)==null?void 0:A.length)>0,l=((N=a.audio)==null?void 0:N.isEnabled)??!1;if(!n&&!s&&!i&&!l)return;ea.tick(e);const c=a.modulation,d=a.audio;d&&d.isEnabled&&Fr.update(),Ut.resetOffsets(),$e.modulations={};const u=a.animations;Ut.updateOscillators(u,performance.now()/1e3,e),c&&c.rules&&Ut.update(c.rules,e);const f=Ut.offsets,p={},m=new Set(Object.keys(f)),x=Do.current,C=new Set;m.forEach(R=>C.add(R)),x.forEach(R=>C.add(R));let y=0,b=0,g=0,h=!1,v=0,z=0,M=0,w=!1;const j=Math.floor(o.currentFrame),k=le.getState().isRecordingModulation,P=k&&j>$a.current;P&&($a.current=j);const I=[];if(k&&C.size>0&&ea.setOverriddenTracks(C),C.forEach(R=>{var D,T,O;const X=!m.has(R),L=X?0:f[R]??0;Math.abs(L)>1e-4&&(w=!0);let $=0,q="",H=!1;if(R.includes(".")){const[B,V]=R.split("."),Y=ie.get(B),W=a[B];if(Y&&W){const K=V.match(/^(vec[23][ABC])_(x|y|z)$/);if(K){const Q=K[1],re=K[2],te=Y.params[Q];if(te){const ae=W[Q];ae&&typeof ae=="object"&&($=ae[re]||0),te.uniform&&(q=`${te.uniform}_${re}`),te.noReset&&(H=!0)}}else{const Q=Y.params[V];Q&&(typeof W[V]=="number"&&($=W[V]),Q.uniform&&(q=Q.uniform),Q.noReset&&(H=!0))}}}else R==="iterations"?(q="uIterations",$=((D=a.coreMath)==null?void 0:D.iterations)??0):R.startsWith("param")&&(q="u"+R.charAt(0).toUpperCase()+R.slice(1),$=((T=a.coreMath)==null?void 0:T[R])??0);if(P&&Math.abs(L)>1e-6){let B=$;const V=o.recordingSnapshot;if(V&&V.tracks[R]){const Y=V.tracks[R],W=R.includes("rotation");B=Je(Y.keyframes,o.currentFrame,W)}else at.current[R]===void 0&&(at.current[R]=$),B=at.current[R];I.push({trackId:R,value:B+L}),$=B}if(R.startsWith("coloring.")){if(R==="coloring.repeats"){const B=a.coloring;if(B&&Math.abs(B.repeats)>.001){const V=P?$:B.repeats,Y=B.scale/V,W=(V+L)*Y;X||(p[R]=V+L),$e.setUniform("uColorScale",W)}return}if(R==="coloring.phase"){const B=a.coloring,V=P?$:B.phase;X||(p[R]=V+L),$e.setUniform("uColorOffset",B.offset+L);return}if(R==="coloring.repeats2"){const B=a.coloring;if(B&&Math.abs(B.repeats2)>.001){const V=P?$:B.repeats2,Y=B.scale2/V,W=(V+L)*Y;X||(p[R]=V+L),$e.setUniform("uColorScale2",W)}return}if(R==="coloring.phase2"){const B=a.coloring,V=P?$:B.phase2;X||(p[R]=V+L),$e.setUniform("uColorOffset2",B.offset2+L);return}}if(R.startsWith("julia.")||R.startsWith("geometry.julia")){const B=a.geometry,V=(B==null?void 0:B.juliaX)??0,Y=(B==null?void 0:B.juliaY)??0,W=(B==null?void 0:B.juliaZ)??0;R.endsWith("juliaX")||R.endsWith("x")?(y=V+L,p[R]=y,P&&I.push({trackId:"geometry.juliaX",value:y})):R.endsWith("juliaY")||R.endsWith("y")?(b=Y+L,p[R]=b,P&&I.push({trackId:"geometry.juliaY",value:b})):(R.endsWith("juliaZ")||R.endsWith("z"))&&(g=W+L,p[R]=g,P&&I.push({trackId:"geometry.juliaZ",value:g})),h=!0;return}if(R.startsWith("camera.")){R.startsWith("camera.unified")?R.endsWith("x")?$e.modulations["camera.unified.x"]=L:R.endsWith("y")?$e.modulations["camera.unified.y"]=L:R.endsWith("z")&&($e.modulations["camera.unified.z"]=L):R.startsWith("camera.rotation")&&(R.endsWith("x")?$e.modulations["camera.rotation.x"]=L:R.endsWith("y")?$e.modulations["camera.rotation.y"]=L:R.endsWith("z")&&($e.modulations["camera.rotation.z"]=L)),p[R]=L;return}if(R.startsWith("geometry.preRot")){R.endsWith("X")?(v=L,p[R]=L):R.endsWith("Y")?(z=L,p[R]=L):R.endsWith("Z")&&(M=L,p[R]=L);return}if(R.startsWith("lighting.light")){const B=R.match(/lighting\.light(\d+)_(\w+)/);if(B){const V=parseInt(B[1]),Y=B[2],W=(O=a.lighting)==null?void 0:O.lights;if(W&&W[V]){const K=W[V];let Q=0,re=!1;if(Y==="intensity"?(Q=K.intensity,re=!0):Y==="falloff"?(Q=K.falloff,re=!0):Y==="posX"?(Q=K.position.x,re=!0):Y==="posY"?(Q=K.position.y,re=!0):Y==="posZ"&&(Q=K.position.z,re=!0),re){if(P){let te=Q;o.recordingSnapshot&&o.recordingSnapshot.tracks[R]?te=Je(o.recordingSnapshot.tracks[R].keyframes,o.currentFrame,!1):(at.current[R]===void 0&&(at.current[R]=Q),te=at.current[R]),I.push({trackId:R,value:te+L}),p[R]=te+L}else p[R]=Q+L;$e.modulations[R]=L}}}return}const G=R.match(/^(coreMath|geometry)\.(vec[23][ABC])_(x|y|z)$/);if(G){const B=G[1],V=G[2],Y=G[3],W=a[B];if(W&&W[V]){const K=W[V],Q=K[Y]??0,re=Q+L;if(P){let ce=Q;o.recordingSnapshot&&o.recordingSnapshot.tracks[R]?ce=Je(o.recordingSnapshot.tracks[R].keyframes,o.currentFrame,!1):(at.current[R]===void 0&&(at.current[R]=Q),ce=at.current[R]),I.push({trackId:R,value:ce+L}),p[R]=ce+L}else p[R]=re;const te="u"+V.charAt(0).toUpperCase()+V.slice(1),ae={...K,[Y]:re};$e.setUniform(te,ae)}return}if(q){const B=$+L;X||(p[R]=B),$e.setUniform(q,B,H)}}),I.length>0&&o.batchAddKeyframes(j,I,"Linear"),h){const R=a.geometry;p["geometry.juliaX"]===void 0&&p["julia.x"]===void 0&&(y=(R==null?void 0:R.juliaX)??0),p["geometry.juliaY"]===void 0&&p["julia.y"]===void 0&&(b=(R==null?void 0:R.juliaY)??0),p["geometry.juliaZ"]===void 0&&p["julia.z"]===void 0&&(g=(R==null?void 0:R.juliaZ)??0),Lo.set(y,b,g),$e.setUniform("uJulia",Lo)}const _=a.geometry;if(_&&_.preRotMaster){const R=_.preRotX+v,X=_.preRotY+z,L=_.preRotZ+M;if(Math.abs(R-Wt.current.x)>1e-6||Math.abs(X-Wt.current.y)>1e-6||Math.abs(L-Wt.current.z)>1e-6){const $=new yt().makeRotationX(R),q=new yt().makeRotationY(X),H=new yt().makeRotationZ(L);Eo.identity().multiply(H).multiply($).multiply(q),Ao.setFromMatrix4(Eo),$e.setUniform("uPreRotMatrix",Ao),Wt.current.set(R,X,L),w=!0}}w&&$e.resetAccumulation(),(Object.keys(p).length>0||Object.keys(a.liveModulations).length>0)&&E.getState().setLiveModulations(p),Do.current=m},Wl=()=>{const e=le(o=>o.isRecordingModulation);return S.useEffect(()=>{e?(at.current={},$a.current=-1):ea.setOverriddenTracks(new Set)},[e]),null},nt=ue(),ql=e=>{const o=S.useRef(!1),a=S.useRef(new U),r=S.useRef(new U),n=S.useRef(!1),s=S.useRef(!1),i=S.useRef(null),l=S.useRef({x:0,y:0}),c=le;S.useEffect(()=>{const d=p=>{const m=E.getState(),x=m.interactionMode;if(e.current){const C=e.current.getBoundingClientRect(),y=(p.clientX-C.left)/C.width*2-1,b=-((p.clientY-C.top)/C.height)*2+1;if(l.current={x:y,y:b},x==="picking_focus"){n.current=!0;let g=!1,h=!1,v=-1;const z=E.getState();z.focusLock&&z.setFocusLock(!1),nt.startFocusPick(y,b).then(w=>{n.current&&(g=!0,w>0&&w!==v&&(v=w,E.getState().setOptics({dofFocus:w})))});const M=()=>{n.current&&(g&&!h&&(h=!0,nt.sampleFocusPick(l.current.x,l.current.y).then(w=>{if(h=!1,!!n.current&&w>0&&w!==v){v=w,E.getState().setOptics({dofFocus:w});const{isRecording:j,isPlaying:k,addKeyframe:P,addTrack:I,currentFrame:_,sequence:F}=c.getState();if(j){const A="optics.dofFocus";F.tracks[A]||I(A,"Focus Distance"),P(A,_,w,k?"Linear":"Bezier")}}})),i.current=requestAnimationFrame(M))};i.current=requestAnimationFrame(M)}if(x==="picking_julia"){o.current=!0;const g=m.geometry;r.current.set(g.juliaX,g.juliaY,g.juliaZ),a.current.copy(r.current);const h=(M,w,j)=>{if(w==="MandelTerrain"){const k=j.coreMath,P=Math.pow(2,k.paramB);a.current.set(M.x*(2/P)+k.paramE,M.z*(2/P)+k.paramF,0)}else w==="JuliaMorph"?a.current.set(M.x,M.y,0):a.current.copy(M)};nt.pickWorldPosition(y,b,!0).then(M=>{M&&o.current&&h(M,m.formula,m)});let v=!1;const z=()=>{if(o.current){if(v||(v=!0,nt.pickWorldPosition(l.current.x,l.current.y,!0).then(M=>{if(v=!1,!!o.current&&M){const w=E.getState();h(M,w.formula,w)}})),r.current.lerp(a.current,.1),r.current.distanceToSquared(a.current)>1e-8){E.getState().setGeometry({juliaX:r.current.x,juliaY:r.current.y,juliaZ:r.current.z});const{isRecording:w,isPlaying:j,addKeyframe:k,addTrack:P,currentFrame:I,sequence:_}=c.getState();if(w){_.tracks["geometry.juliaX"]||P("geometry.juliaX","Julia X"),_.tracks["geometry.juliaY"]||P("geometry.juliaY","Julia Y"),_.tracks["geometry.juliaZ"]||P("geometry.juliaZ","Julia Z");const F=j?"Linear":"Bezier";k("geometry.juliaX",I,r.current.x,F),k("geometry.juliaY",I,r.current.y,F),k("geometry.juliaZ",I,r.current.z,F)}}i.current=requestAnimationFrame(z)}};i.current=requestAnimationFrame(z)}}},u=p=>{var m,x;if(e.current){const C=e.current.getBoundingClientRect(),y=(p.clientX-C.left)/C.width*2-1,b=-((p.clientY-C.top)/C.height)*2+1;(o.current||n.current)&&(l.current={x:y,y:b});const g=E.getState();if(g.draggedLightIndex!==null&&!nt.isGizmoInteracting){const h=Ne(),v=((x=(m=g.lighting)==null?void 0:m.lights)==null?void 0:x.findIndex(z=>z.id===g.draggedLightIndex))??-1;if(h&&v>=0){if(!s.current&&g.cameraMode==="Fly"){s.current=!0;const _=nt.sceneOffset,F={x:_.x,y:_.y,z:_.z,xL:(_.xL??0)+h.position.x,yL:(_.yL??0)+h.position.y,zL:(_.zL??0)+h.position.z};h.position.set(0,0,0),h.updateMatrixWorld(),g.setSceneOffset(F)}const z=new Ua;z.setFromCamera(new je(y,b),h);const M=Math.max(2e-4,Math.min(20,nt.lastMeasuredDistance*.5)),w=new U().copy(z.ray.direction).multiplyScalar(M).add(z.ray.origin),j=nt.sceneOffset,k={x:w.x+(j.x+j.xL),y:w.y+(j.y+j.yL),z:w.z+(j.z+j.zL)},P=g.lighting.lights[v],I={visible:!0,castShadow:!0,position:k};P.visible||(I.fixed=!1),g.updateLight({index:v,params:I}),g.lighting.shadows||g.setLighting({shadows:!0}),g.showLightGizmo||g.setShowLightGizmo(!0)}}}},f=()=>{s.current=!1;const p=E.getState();p.draggedLightIndex!==null&&p.setDraggedLight(null),o.current&&(o.current=!1,i.current&&cancelAnimationFrame(i.current),p.setInteractionMode("none"),navigator.vibrate&&navigator.vibrate(20)),n.current&&(n.current=!1,i.current&&cancelAnimationFrame(i.current),nt.endFocusPick(),p.setInteractionMode("none"),navigator.vibrate&&navigator.vibrate(20))};return window.addEventListener("pointerdown",d),window.addEventListener("pointermove",u),window.addEventListener("pointerup",f),()=>{window.removeEventListener("pointerdown",d),window.removeEventListener("pointermove",u),window.removeEventListener("pointerup",f),i.current&&cancelAnimationFrame(i.current)}},[e])},Xl=e=>{const{interactionMode:o,setInteractionMode:a,setRenderRegion:r,renderRegion:n}=E(),s=o==="selecting_region",[i,l]=S.useState(null),[c,d]=S.useState(null),[u,f]=S.useState(null),p=S.useRef(null),m=S.useRef(null),x=S.useRef(null),C=(y,b)=>({x:Math.max(0,Math.min(1,(y.clientX-b.left)/b.width)),y:Math.max(0,Math.min(1,(y.clientY-b.top)/b.height))});return S.useEffect(()=>{if(!e.current)return;const y=e.current,b=v=>{const z=v.target,M=y.getBoundingClientRect(),w=C(v,M);if(n&&!s){const j=z.dataset.handle;if(j||z.closest(".region-box")){v.stopPropagation(),p.current=j||"move",l({x:w.x,y:w.y}),m.current={...n},f({...n}),x.current={...n};return}}if(s){v.stopPropagation(),p.current="draw";const j=v.clientX-M.left,k=v.clientY-M.top;l({x:j,y:k}),d({x:j,y:k})}},g=v=>{if(!p.current)return;v.stopPropagation(),v.preventDefault();const z=y.getBoundingClientRect();if(p.current==="draw"){const M=Math.max(0,Math.min(z.width,v.clientX-z.left)),w=Math.max(0,Math.min(z.height,v.clientY-z.top));d({x:M,y:w})}else if(m.current&&i){const M=C(v,z),w=M.x-i.x,j=1-M.y-(1-i.y);let k={...m.current};const P=p.current;if(P==="move"){const _=k.maxX-k.minX,F=k.maxY-k.minY;k.minX+=w,k.maxX+=w,k.minY+=j,k.maxY+=j,k.minX<0&&(k.minX=0,k.maxX=_),k.maxX>1&&(k.maxX=1,k.minX=1-_),k.minY<0&&(k.minY=0,k.maxY=F),k.maxY>1&&(k.maxY=1,k.minY=1-F)}else P!=null&&P.includes("e")&&(k.maxX=Math.min(1,m.current.maxX+w)),P!=null&&P.includes("w")&&(k.minX=Math.max(0,m.current.minX+w)),P!=null&&P.includes("n")&&(k.maxY=Math.min(1,m.current.maxY+j)),P!=null&&P.includes("s")&&(k.minY=Math.max(0,m.current.minY+j));const I={minX:Math.min(k.minX,k.maxX),maxX:Math.max(k.minX,k.maxX),minY:Math.min(k.minY,k.maxY),maxY:Math.max(k.minY,k.maxY)};I.maxX-I.minX<.01&&(I.maxX=I.minX+.01),I.maxY-I.minY<.01&&(I.maxY=I.minY+.01),f(I),x.current=I}},h=v=>{if(p.current){if(v.stopPropagation(),p.current==="draw"&&i&&c){const z=y.getBoundingClientRect(),M=Math.min(i.x,c.x),w=Math.max(i.x,c.x),j=Math.min(i.y,c.y),k=Math.max(i.y,c.y),P=w-M,I=k-j;if(P>10&&I>10){const _=M/z.width,F=w/z.width,A=1-k/z.height,N=1-j/z.height;r({minX:_,minY:A,maxX:F,maxY:N})}a("none")}else x.current&&r(x.current);p.current=null,l(null),d(null),m.current=null,f(null),x.current=null}};return y.addEventListener("mousedown",b),window.addEventListener("mousemove",g),window.addEventListener("mouseup",h),()=>{y.removeEventListener("mousedown",b),window.removeEventListener("mousemove",g),window.removeEventListener("mouseup",h)}},[s,n,i,c,a,r,e]),{visualRegion:u,isGhostDragging:!!u,renderRegion:n,isSelectingRegion:s}},Ct=ue(),se={lowFpsBuffer:0,lastTime:performance.now(),lastFrameCount:0,setShowWarning:null,setCurrentFps:null,isPaused:!1,isScrubbing:!1,isExporting:!1,isBroadcastMode:!1,renderMode:"PathTracing",frameTimestamps:[]},Yl=()=>{const e=performance.now();se.frameTimestamps.push(e);const o=e-2e3;if(se.frameTimestamps=se.frameTimestamps.filter(r=>r>o),e-se.lastTime>=500){let r=0;if(se.frameTimestamps.length>1){const l=se.frameTimestamps[0],d=se.frameTimestamps[se.frameTimestamps.length-1]-l;r=(se.frameTimestamps.length-1)/d*1e3}se.lastTime=e,se.lastFrameCount=Ct.frameCount;const n=E.getState(),s=n.sampleCap>0&&Ct.accumulationCount>=n.sampleCap;if(se.isPaused||se.isScrubbing||document.hidden||Ct.isCompiling||se.isExporting||s)se.lowFpsBuffer=0;else if(e<8e3)se.lowFpsBuffer=0;else{se.setCurrentFps&&se.setCurrentFps(r);const l=se.renderMode==="PathTracing",c=l?10:15,d=l?22:30;r<c?se.lowFpsBuffer+=r<5?2:1:r>=d&&(se.lowFpsBuffer=Math.max(0,se.lowFpsBuffer-3),se.lowFpsBuffer===0&&se.setShowWarning&&se.setShowWarning(!1)),se.lowFpsBuffer>=5&&se.setShowWarning&&se.setShowWarning(!0)}}},Zl=()=>{const e=S.useRef(0);S.useRef(performance.now()),S.useRef(0);const{resolutionMode:o,setResolutionMode:a,setFixedResolution:r,fixedResolution:n,isExporting:s,isBroadcastMode:i,openContextMenu:l,aaLevel:c,setAALevel:d,renderMode:u,quality:f}=E(),p=E(A=>A.isPaused),m=le(A=>A.isScrubbing),[x,C]=S.useState(!1),[y,b]=S.useState(60);S.useEffect(()=>(se.setShowWarning=C,se.setCurrentFps=b,se.isPaused=p,se.isScrubbing=m,se.isExporting=s,se.isBroadcastMode=i,se.renderMode=u,se.lastTime=performance.now(),se.lastFrameCount=Ct.frameCount,()=>{se.setShowWarning===C&&(se.setShowWarning=null),se.setCurrentFps===b&&(se.setCurrentFps=null)}),[p,m,s,i,u]);const g=A=>{const N=Ee(A.currentTarget);N.length>0&&(A.preventDefault(),A.stopPropagation(),l(A.clientX,A.clientY,[],N))};if(i||!x)return null;let h=window.innerWidth,v=window.innerHeight;if(Ct.renderer){const A=Ct.renderer.domElement;h=A.width,v=A.height}else o==="Fixed"&&(h=n[0],v=n[1]);const z=h>480,M=()=>{const A=Math.max(320,Math.round(h*.66/8)*8),N=Math.max(240,Math.round(v*.66/8)*8);a("Fixed"),r(A,N),F()},w=c>1,j=()=>{d(1),F()},k=f,I=!((k==null?void 0:k.precisionMode)===1),_=()=>{const A=E.getState().setQuality,N=E.getState().setLighting;A&&A({precisionMode:1,bufferPrecision:1}),N&&N({shadows:!1}),F()},F=()=>{C(!1),e.current=-10};return t.jsx("div",{className:"absolute top-2 right-4 z-[50] pointer-events-auto animate-fade-in-left origin-top-right max-w-[200px]","data-help-id":"ui.performance",onContextMenu:g,children:t.jsxs("div",{className:"flex flex-col gap-1 bg-red-950/90 border border-red-500/30 rounded-lg shadow-xl backdrop-blur-md p-2",children:[t.jsxs("div",{className:"flex items-center justify-between mb-1",children:[t.jsxs("div",{className:"flex items-center gap-2 text-red-200 text-[10px] font-bold",children:[t.jsx(Tt,{}),t.jsxs("span",{children:["Low FPS (",y.toFixed(1),")"]})]}),t.jsx("button",{onClick:()=>{C(!1),e.current=-40},className:"text-red-400 hover:text-white transition-colors p-0.5",title:"Dismiss",children:t.jsx(qa,{})})]}),t.jsxs("div",{className:"flex flex-col gap-1",children:[w&&t.jsxs("button",{onClick:j,className:"flex items-center justify-between bg-black/40 hover:bg-white/10 text-gray-300 text-[9px] px-2 py-1.5 rounded transition-colors border border-white/5",children:[t.jsxs("span",{className:"flex items-center gap-1.5",children:[t.jsx(Xa,{})," Reset Scale (1x)"]}),t.jsx("span",{className:"text-cyan-400 font-bold",children:"Fix"})]}),I&&t.jsxs("button",{onClick:_,className:"flex items-center justify-between bg-black/40 hover:bg-white/10 text-gray-300 text-[9px] px-2 py-1.5 rounded transition-colors border border-white/5",children:[t.jsxs("span",{className:"flex items-center gap-1.5",children:[t.jsx(fa,{})," Enable Lite Mode"]}),t.jsx("span",{className:"text-cyan-400 font-bold",children:"Fix"})]}),z&&t.jsxs("button",{onClick:M,className:"flex items-center justify-between bg-black/40 hover:bg-white/10 text-gray-300 text-[9px] px-2 py-1.5 rounded transition-colors border border-white/5",children:[t.jsxs("span",{className:"flex items-center gap-1.5",children:[t.jsx(pt,{})," Reduce Resolution"]}),t.jsx("span",{className:"text-cyan-400 font-bold",children:"-33%"})]})]})]})})},Ql=[{label:"Maximum",ratio:"Max"},{label:"Square (1:1)",ratio:1},{label:"Landscape (16:9)",ratio:1.7777},{label:"Portrait (4:5)",ratio:.8},{label:"Social (9:16)",ratio:.5625},{label:"Cinematic (2.35:1)",ratio:2.35},{label:"Classic (4:3)",ratio:1.3333},{label:"Skybox (2:1)",ratio:2}],Kl=({width:e,height:o,top:a,left:r,maxAvailableWidth:n,maxAvailableHeight:s,onSetResolution:i,onSetMode:l})=>{const[c,d]=S.useState(!1),u=S.useRef(null),f=S.useRef(null),p=E(g=>g.openContextMenu);S.useEffect(()=>{if(!c)return;const g=h=>{u.current&&!u.current.contains(h.target)&&d(!1)};return window.addEventListener("mousedown",g),()=>window.removeEventListener("mousedown",g)},[c]);const m=g=>{const h=Ee(g.currentTarget);h.length>0&&(g.preventDefault(),g.stopPropagation(),p(g.clientX,g.clientY,[],h))},x=g=>{g.preventDefault(),g.stopPropagation(),g.target.setPointerCapture(g.pointerId),f.current={startX:g.clientX,startY:g.clientY,startW:e,startH:o,hasMoved:!1}},C=g=>{if(!f.current)return;const h=f.current.startX-g.clientX,v=f.current.startY-g.clientY;(Math.abs(h)>3||Math.abs(v)>3)&&(f.current.hasMoved=!0);const z=Math.round(v/4),M=Math.round(h/20),j=(z+M)*8;if(j!==0){const k=f.current.startW/f.current.startH,P=Math.max(64,f.current.startW+j),I=Math.round(P/8)*8,_=I/k,F=Math.max(64,Math.round(_/8)*8);i(I,F)}},y=g=>{g.target.releasePointerCapture(g.pointerId),f.current&&!f.current.hasMoved&&d(h=>!h),f.current=null},b=g=>{const v=Math.max(100,n-40),z=Math.max(100,s-40);let M,w;g==="Max"?(M=v,w=z):v/z>g?(w=z,M=w*g):(M=v,w=M/g);const j=Math.round(M/8)*8,k=Math.round(w/8)*8;i(j,k),d(!1)};return t.jsxs("div",{className:"absolute flex items-center gap-2 z-50 transition-all duration-100 ease-out",style:{top:a,left:r},"data-help-id":"ui.resolution",onContextMenu:m,children:[t.jsxs("div",{className:"relative text-[10px] font-mono text-gray-400 bg-black/80 px-2 py-1 rounded border border-white/10 shadow-sm backdrop-blur-md cursor-ns-resize hover:text-white hover:border-cyan-500/50 transition-colors select-none flex items-center gap-2",onPointerDown:x,onPointerMove:C,onPointerUp:y,title:"Drag Up or Left to Increase Size",children:[t.jsxs("span",{children:[e," ",t.jsx("span",{className:"text-gray-600",children:"x"})," ",o]}),t.jsx("span",{className:"opacity-50",children:t.jsx(Pt,{})})]}),c&&t.jsxs("div",{ref:u,className:"absolute top-8 left-0 w-32 bg-black border border-white/20 rounded shadow-xl z-50 overflow-hidden flex flex-col py-1 animate-fade-in",children:[t.jsx("div",{className:"px-3 py-1 text-[8px] font-bold text-gray-500 border-b border-white/10 mb-1",children:"Fit to Window"}),Ql.map(g=>t.jsx("button",{onClick:()=>b(g.ratio),className:"text-left px-3 py-1.5 text-[10px] text-gray-300 hover:bg-white/10 hover:text-white transition-colors flex justify-between",children:t.jsx("span",{children:g.label})},g.label))]}),t.jsxs("button",{onClick:g=>{g.stopPropagation(),l("Full")},className:"flex items-center gap-1.5 text-[9px] font-bold text-gray-300 bg-black/80 px-2 py-1 rounded border border-white/10 hover:border-cyan-500/50 hover:text-cyan-400 hover:bg-cyan-900/30 transition-all shadow-sm backdrop-blur-md group",title:"Return to Fullscreen Mode",children:[t.jsx("span",{className:"w-2 h-2 border border-current rounded-sm group-hover:scale-110 transition-transform"}),"Fill"]})]})},Jl=({width:e,height:o})=>{const a=E(c=>c.compositionOverlay),r=E(c=>c.compositionOverlaySettings);if(a==="none"||!a)return null;const{opacity:n,lineThickness:s,color:i}=r;let l=i;if(i.startsWith("#")){const c=lt(i);c&&(l=`rgba(${c.r},${c.g},${c.b},${n})`)}else i.startsWith("rgba")?l=i.replace(/rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)/,`rgba($1,$2,$3,${n})`):i.startsWith("rgb(")&&(l=i.replace(/rgb\(([^,]+),([^,]+),([^)]+)\)/,`rgba($1,$2,$3,${n})`));return t.jsxs("svg",{className:"absolute inset-0 pointer-events-none z-[15]",width:e,height:o,style:{mixBlendMode:"difference"},children:[a==="grid"&&t.jsx(ec,{width:e,height:o,strokeColor:l,lineThickness:s,divisionsX:r.gridDivisionsX,divisionsY:r.gridDivisionsY}),a==="thirds"&&t.jsx(tc,{width:e,height:o,strokeColor:l,lineThickness:s}),a==="golden"&&t.jsx(_r,{width:e,height:o,strokeColor:l,lineThickness:s}),a==="spiral"&&t.jsx(ac,{width:e,height:o,strokeColor:l,lineThickness:s,rotation:r.spiralRotation,positionX:r.spiralPositionX,positionY:r.spiralPositionY,scale:r.spiralScale,ratio:r.spiralRatio}),a==="center"&&t.jsx(No,{width:e,height:o,strokeColor:l,lineThickness:s}),a==="diagonal"&&t.jsx(oc,{width:e,height:o,strokeColor:l,lineThickness:s}),a==="safearea"&&t.jsx(Bo,{width:e,height:o,strokeColor:l,lineThickness:s}),r.showCenterMark&&a!=="center"&&t.jsx(No,{width:e,height:o,strokeColor:l,lineThickness:s}),r.showSafeAreas&&a!=="safearea"&&t.jsx(Bo,{width:e,height:o,strokeColor:l,lineThickness:s*.5})]})},ec=({width:e,height:o,strokeColor:a,lineThickness:r,divisionsX:n=4,divisionsY:s=4})=>{const i=[];for(let l=1;l<n;l++){const c=e/n*l;i.push(t.jsx("line",{x1:c,y1:0,x2:c,y2:o,stroke:a,strokeWidth:r*.5},`v${l}`))}for(let l=1;l<s;l++){const c=o/s*l;i.push(t.jsx("line",{x1:0,y1:c,x2:e,y2:c,stroke:a,strokeWidth:r*.5},`h${l}`))}return t.jsx(t.Fragment,{children:i})},tc=({width:e,height:o,strokeColor:a,lineThickness:r})=>{const n=e/3,s=o/3;return t.jsxs(t.Fragment,{children:[t.jsx("line",{x1:n,y1:0,x2:n,y2:o,stroke:a,strokeWidth:r}),t.jsx("line",{x1:n*2,y1:0,x2:n*2,y2:o,stroke:a,strokeWidth:r}),t.jsx("line",{x1:0,y1:s,x2:e,y2:s,stroke:a,strokeWidth:r}),t.jsx("line",{x1:0,y1:s*2,x2:e,y2:s*2,stroke:a,strokeWidth:r}),t.jsx("circle",{cx:n,cy:s,r:r*3,fill:a}),t.jsx("circle",{cx:n*2,cy:s,r:r*3,fill:a}),t.jsx("circle",{cx:n,cy:s*2,r:r*3,fill:a}),t.jsx("circle",{cx:n*2,cy:s*2,r:r*3,fill:a})]})},_r=({width:e,height:o,strokeColor:a,lineThickness:r})=>{const n=1.618033988749895,s=e/n,i=o/n;return t.jsxs(t.Fragment,{children:[t.jsx("line",{x1:s,y1:0,x2:s,y2:o,stroke:a,strokeWidth:r}),t.jsx("line",{x1:e-s,y1:0,x2:e-s,y2:o,stroke:a,strokeWidth:r}),t.jsx("line",{x1:0,y1:i,x2:e,y2:i,stroke:a,strokeWidth:r}),t.jsx("line",{x1:0,y1:o-i,x2:e,y2:o-i,stroke:a,strokeWidth:r}),t.jsx("circle",{cx:s,cy:i,r:r*3,fill:a}),t.jsx("circle",{cx:e-s,cy:i,r:r*3,fill:a}),t.jsx("circle",{cx:s,cy:o-i,r:r*3,fill:a}),t.jsx("circle",{cx:e-s,cy:o-i,r:r*3,fill:a})]})},ac=({width:e,height:o,strokeColor:a,lineThickness:r,rotation:n=0,positionX:s=.5,positionY:i=.5,scale:l=1,ratio:c=1.618033988749895})=>{const d=Math.min(e,o),u=e*s,f=o*i,p=d*.45*l,m=n*Math.PI/180,x=[],C=3,y=100;for(let b=0;b<=y;b++){const g=b/y*C*2*Math.PI,h=p*Math.pow(c,-g/(2*Math.PI)),v=u+h*Math.cos(g+m),z=f+h*Math.sin(g+m);x.push(`${b===0?"M":"L"} ${v} ${z}`)}return t.jsxs(t.Fragment,{children:[t.jsx("path",{d:x.join(" "),fill:"none",stroke:a,strokeWidth:r*1.5,strokeLinecap:"round"}),t.jsx(_r,{width:e,height:o,strokeColor:a.replace(/[\d.]+\)$/,"0.2)"),lineThickness:r*.5})]})},No=({width:e,height:o,strokeColor:a,lineThickness:r})=>{const n=e/2,s=o/2,i=Math.min(e,o)*.05;return t.jsxs(t.Fragment,{children:[t.jsx("line",{x1:n-i,y1:s,x2:n+i,y2:s,stroke:a,strokeWidth:r}),t.jsx("line",{x1:n,y1:s-i,x2:n,y2:s+i,stroke:a,strokeWidth:r}),t.jsx("circle",{cx:n,cy:s,r:i*.3,fill:"none",stroke:a,strokeWidth:r})]})},oc=({width:e,height:o,strokeColor:a,lineThickness:r})=>t.jsxs(t.Fragment,{children:[t.jsx("line",{x1:0,y1:0,x2:e,y2:o,stroke:a,strokeWidth:r}),t.jsx("line",{x1:e,y1:0,x2:0,y2:o,stroke:a,strokeWidth:r}),t.jsx("line",{x1:e/2,y1:0,x2:e/2,y2:o,stroke:a,strokeWidth:r*.5,strokeDasharray:"4 4"}),t.jsx("line",{x1:0,y1:o/2,x2:e,y2:o/2,stroke:a,strokeWidth:r*.5,strokeDasharray:"4 4"})]}),Bo=({width:e,height:o,strokeColor:a,lineThickness:r})=>{const s=e*.05,i=o*.05,l=e*(1-.05*2),c=o*(1-.05*2),d=.1,u=e*d,f=o*d,p=e*(1-d*2),m=o*(1-d*2);return t.jsxs(t.Fragment,{children:[t.jsx("rect",{x:s,y:i,width:l,height:c,fill:"none",stroke:a,strokeWidth:r}),t.jsx("rect",{x:u,y:f,width:p,height:m,fill:"none",stroke:a,strokeWidth:r*.5,strokeDasharray:"4 4"}),[[s,i],[s+l,i],[s,i+c],[s+l,i+c]].map(([x,C],y)=>t.jsx("circle",{cx:x,cy:C,r:r*2,fill:a},y))]})},rc=(e,o,a,r)=>{const{gl:n}=la(),s=E(g=>g.invertY),i=E(g=>g.debugMobileLayout),l=S.useRef({forward:!1,backward:!1,left:!1,right:!1,up:!1,down:!1,rollLeft:!1,rollRight:!1,boost:!1}),c=S.useRef(!1),d=S.useRef({x:0,y:0}),u=S.useRef({x:0,y:0}),f=S.useRef(0),p=S.useRef(0),m=S.useRef({x:0,y:0}),x=S.useRef({x:0,y:0}),C=S.useRef(o);S.useEffect(()=>{C.current=o},[o]);const y=()=>{f.current=performance.now()};return S.useEffect(()=>{m.current={x:0,y:0},x.current={x:0,y:0},p.current=0,y()},[e]),ca((g,h)=>{const v=l.current.rollLeft?1:l.current.rollRight?-1:0,M=1-Math.exp(-(v!==0?1:3)*h),w=Math.max(.1,C.current);p.current+=(v*w-p.current)*M,v===0&&Math.abs(p.current)<.001&&(p.current=0)}),S.useEffect(()=>{const g=j=>{if(j.target.tagName==="INPUT"||j.target.tagName==="TEXTAREA"||((j.ctrlKey||j.metaKey)&&(j.key==="w"||j.code==="KeyW")&&j.preventDefault(),j.code==="Space"&&j.preventDefault(),j.key==="Alt"&&j.preventDefault(),E.getState().isTimelineHovered))return;let P=!0;switch(j.code){case"KeyW":l.current.forward=!0;break;case"KeyS":l.current.backward=!0;break;case"KeyA":l.current.left=!0;break;case"KeyD":l.current.right=!0;break;case"KeyQ":l.current.rollLeft=!0;break;case"KeyE":l.current.rollRight=!0;break;case"Space":l.current.up=!0;break;case"KeyC":l.current.down=!0;break;case"ShiftLeft":case"ShiftRight":l.current.boost=!0;break;default:P=!1}P&&y()},h=j=>{switch(j.key==="Alt"&&j.preventDefault(),j.code){case"KeyW":l.current.forward=!1;break;case"KeyS":l.current.backward=!1;break;case"KeyA":l.current.left=!1;break;case"KeyD":l.current.right=!1;break;case"KeyQ":l.current.rollLeft=!1;break;case"KeyE":l.current.rollRight=!1;break;case"Space":l.current.up=!1;break;case"KeyC":l.current.down=!1;break;case"ShiftLeft":case"ShiftRight":l.current.boost=!1;break}},v=j=>{const k=E.getState();if(Aa(k))return;if(k.optics&&Math.abs(k.optics.camType-1)<.1){const _=j.deltaY>0?1:-1,A=k.optics.orthoScale*(1+_*.1);k.setOptics({orthoScale:Math.max(1e-10,Math.min(1e3,A))}),y();return}if(e==="Fly"){const _=j.deltaY>0?-1:1;let F=C.current,A=.01;F<.05&&(A=.005),F>.1&&(A=.02);let N=Math.max(.001,Math.min(1,F+_*A));C.current=N,a(N),y()}else e==="Orbit"&&y()},z=()=>{l.current={forward:!1,backward:!1,left:!1,right:!1,up:!1,down:!1,rollLeft:!1,rollRight:!1,boost:!1}},M=j=>{m.current=j.detail,y()},w=j=>{x.current=j.detail,y()};return window.addEventListener("keydown",g),window.addEventListener("keyup",h),window.addEventListener("blur",z),window.addEventListener("joyMove",M),window.addEventListener("joyLook",w),n.domElement.addEventListener("wheel",v,{passive:!0}),()=>{window.removeEventListener("keydown",g),window.removeEventListener("keyup",h),window.removeEventListener("blur",z),window.removeEventListener("joyMove",M),window.removeEventListener("joyLook",w),n.domElement.removeEventListener("wheel",v)}},[e,n,a]),S.useEffect(()=>{const g=n.domElement,h=(w,j)=>{const k=g.getBoundingClientRect();return{x:(w-k.left)/k.width*2-1,y:-((j-k.top)/k.height)*2+1}},v=w=>{const j=E.getState();if(Aa(j))return;if(r){if(Object.values(r).some(I=>I.current&&I.current.contains(w.target)))return}else if(w.target.closest(".pointer-events-auto"))return;if(!((i||window.innerWidth<768||w.pointerType==="touch")&&e==="Fly")&&(y(),w.button===0&&e==="Fly")){c.current=!0;const{x:P,y:I}=h(w.clientX,w.clientY);d.current={x:P,y:I},u.current={x:P,y:I}}},z=w=>{if(c.current){const{x:j,y:k}=h(w.clientX,w.clientY);u.current={x:j,y:k},y()}else e==="Orbit"&&w.buttons>0&&(w.target===g||g.contains(w.target))&&y()},M=()=>c.current=!1;return g.addEventListener("mousedown",v),window.addEventListener("mousemove",z),window.addEventListener("mouseup",M),()=>{g.removeEventListener("mousedown",v),window.removeEventListener("mousemove",z),window.removeEventListener("mouseup",M)}},[e,n,i,r]),{moveState:l,isDraggingRef:c,dragStart:d,mousePos:u,speedRef:C,joystickMove:m,joystickLook:x,invertY:s,rollVelocity:p,isInteracting:()=>{const g=l.current,h=g.forward||g.backward||g.left||g.right||g.up||g.down||g.rollLeft||g.rollRight,v=Math.abs(m.current.x)>.01||Math.abs(m.current.y)>.01||Math.abs(x.current.x)>.01||Math.abs(x.current.y)>.01,z=performance.now()-f.current<200;return c.current||h||v||z}}},gt=ue(),ic=(e,o)=>{const{camera:a}=la(),r=E(u=>u.quality),n=S.useRef(10),s=S.useRef(10),i=S.useRef(0);S.useRef(!1);const l=S.useRef(null),c=S.useRef(new Float32Array(4)),d=u=>{if(u<0||u>=1e3||!Number.isFinite(u)){n.current>0&&n.current,e.dist.current&&(e.dist.current.innerText="DST INF",e.dist.current.style.color="#888"),e.reset.current&&(e.reset.current.style.display="block");return}if(n.current=u,s.current=u,gt.lastMeasuredDistance=u,e.dist.current&&(e.dist.current.innerText=`DST ${u<.001?u.toExponential(2):u.toFixed(4)}`,e.dist.current.style.color=u<1?"#ff4444":"#00ffff"),e.reset.current){const f=u>100||u<.001;e.reset.current.style.display=f?"block":"none"}};return ca(u=>{var y,b,g,h,v;if(i.current++,!gt.hasCompiledShader||i.current<15){e.dist.current&&i.current%10===0&&(e.dist.current.innerText=`DST ${n.current.toFixed(4)}`),e.speed.current&&i.current%10===0&&(e.speed.current.innerText=`SPD ${(o.current*100).toFixed(1)}%`);return}if(!r)return;if((r.physicsProbeMode??0)===2){const z=r.manualDistance;if(n.current=z,s.current=z,gt.lastMeasuredDistance=z,e.dist.current&&(e.dist.current.innerText=`DST ${z<.001?z.toExponential(2):z.toFixed(4)}`,e.dist.current.style.color=z<1?"#ff4444":"#00ffff"),e.reset.current){const M=z>100||z<.001;e.reset.current.style.display=M?"block":"none"}e.speed.current&&i.current%10===0&&(e.speed.current.innerText=`SPD ${(o.current*100).toFixed(1)}%`);return}const p=gt.renderer;if(!p){const z=gt.lastMeasuredDistance;if(z!==n.current){d(z);const M=E.getState();if(M.focusLock&&z>0&&z<1e3){const w=((y=M.optics)==null?void 0:y.dofFocus)??0;Math.abs(z-w)/Math.max(w,1e-4)>.01&&M.setOptics({dofFocus:z})}}e.speed.current&&i.current%10===0&&(e.speed.current.innerText=`SPD ${(o.current*100).toFixed(1)}%`);return}const m=(g=(b=gt.pipeline)==null?void 0:b.getPreviousRenderTarget)==null?void 0:g.call(b);if(!m){e.dist.current&&i.current%10===0&&(e.dist.current.innerText=`DST ${n.current.toFixed(4)}`),e.speed.current&&i.current%10===0&&(e.speed.current.innerText=`SPD ${(o.current*100).toFixed(1)}%`);return}const x=m.width||1,C=m.height||1;if(x<=0||C<=0){e.dist.current&&i.current%10===0&&(e.dist.current.innerText=`DST ${n.current.toFixed(4)}`),e.speed.current&&i.current%10===0&&(e.speed.current.innerText=`SPD ${(o.current*100).toFixed(1)}%`);return}(!l.current||l.current.length!==64)&&(l.current=new Float32Array(64));try{const z=Math.floor(x/2),M=Math.floor(C/2),j=Math.floor(3/2);let k=0,P=0;for(let I=-j;I<=j;I++){for(let _=-j;_<=j;_++){const F=z+I,A=M+_;if(F>=0&&F<x&&A>=0&&A<C&&((v=(h=gt.pipeline)==null?void 0:h.readPixels)==null?void 0:v.call(h,p,F,A,1,1,c.current))){const R=c.current[3];R>0&&R<1e3&&Number.isFinite(R)&&(k+=R,P++)}}if(P>0){const _=k/P;d(_)}}if(P>0){const I=k/P;if(I>=1e3){const _=n.current>0?n.current:10;e.dist.current&&(e.dist.current.innerText="DST INF",e.dist.current.style.color="#888"),e.reset.current&&(e.reset.current.style.display="block")}else d(I)}}catch(z){console.warn("Depth readback failed:",z)}e.speed.current&&i.current%10===0&&(e.speed.current.innerText=`SPD ${(o.current*100).toFixed(1)}%`)}),{distAverageRef:n,distMinRef:s}};class nc{constructor(){J(this,"currentRotVelocity",new U);J(this,"rollVelocity",0);J(this,"smoothedDistEstimate",10);J(this,"ROTATION_SMOOTHING",20);J(this,"ROLL_SMOOTHING",3);J(this,"SENSITIVITY",2.5);J(this,"DIST_INCREASE_LERP_RATE",2)}reset(){this.currentRotVelocity.set(0,0,0),this.rollVelocity=0,this.smoothedDistEstimate=10}applyCurve(o){return Math.sign(o)*Math.pow(Math.abs(o),2)}update(o,a,r,n){let s=!1;const i=n.distEstimate,l=Math.min(a,.1);if(i>this.smoothedDistEstimate){const z=1-Math.exp(-this.DIST_INCREASE_LERP_RATE*l);this.smoothedDistEstimate+=(i-this.smoothedDistEstimate)*z}else this.smoothedDistEstimate=i;const c=this.smoothedDistEstimate,d=r.move.boost?4:1,u=n.autoSlow?Math.max(c*n.baseSpeed*d,1e-6):2*n.baseSpeed*d,f=new U(0,0,0);if(r.move.forward&&(f.z-=1),r.move.backward&&(f.z+=1),r.move.left&&(f.x-=1),r.move.right&&(f.x+=1),r.move.up&&(f.y+=1),r.move.down&&(f.y-=1),(Math.abs(r.moveJoy.x)>.01||Math.abs(r.moveJoy.y)>.01)&&(f.z-=this.applyCurve(r.moveJoy.y),f.x+=this.applyCurve(r.moveJoy.x)),f.lengthSq()>0){f.normalize().multiplyScalar(u*l);const z=f.clone().applyQuaternion(o.quaternion);Z.emit("offset_shift",{x:z.x,y:z.y,z:z.z}),s=!0}const m=r.move.rollLeft?1:r.move.rollRight?-1:0,x=m!==0?1:this.ROLL_SMOOTHING,C=1-Math.exp(-x*a),y=Math.max(.1,n.baseSpeed);this.rollVelocity+=(m*y-this.rollVelocity)*C,m===0&&Math.abs(this.rollVelocity)<.001&&(this.rollVelocity=0);const b=new U(0,0,0),g=r.invertY?-1:1,h=Math.abs(r.look.x)>.01||Math.abs(r.look.y)>.01;r.isDragging?(b.y=-r.dragDelta.x*2,b.x=r.dragDelta.y*2*g):h&&(b.y=-this.applyCurve(r.look.x)*.66,b.x=this.applyCurve(r.look.y)*.66*g),b.z=this.rollVelocity*.62;const v=1-Math.exp(-this.ROTATION_SMOOTHING*l);if(this.currentRotVelocity.lerp(b,v),this.currentRotVelocity.lengthSq()<1e-6&&this.currentRotVelocity.set(0,0,0),this.currentRotVelocity.lengthSq()>1e-8){const z=this.currentRotVelocity;o.rotateX(z.x*l*this.SENSITIVITY),o.rotateY(z.y*l*this.SENSITIVITY),o.rotateZ(z.z*l*this.SENSITIVITY),s=!0}return s}}const He=ue(),sc=({mode:e,onStart:o,onEnd:a,hudRefs:r,setSceneOffset:n,fitScale:s=1})=>{const{camera:i,gl:l}=la(),c=S.useRef(null),d=E(Aa),u=E(ee=>ee.optics),f=u&&Math.abs(u.camType-1)<.1,p=E(ee=>ee.navigation),m=E(ee=>ee.setNavigation),x=le(ee=>ee.setIsCameraInteracting),[C,y]=S.useState(new U(0,0,0)),[b,g]=S.useState(e==="Orbit"),[h,v]=S.useState(0),z=S.useRef(new nc),M=S.useRef(new U),w=S.useRef(new Te),j=S.useRef(new U),k=S.useRef(new U);S.useRef(0);const{moveState:P,isDraggingRef:I,dragStart:_,mousePos:F,speedRef:A,joystickMove:N,joystickLook:R,invertY:X,rollVelocity:L,isInteracting:$}=rc(e,(p==null?void 0:p.flySpeed)??.5,ee=>m({flySpeed:ee}),r),{distAverageRef:q}=ic(r,A),H=(ee,ye=!1)=>{i.updateMatrixWorld();const De=new U(0,1,0).applyQuaternion(i.quaternion);i.up.copy(De);let Re=ee||He.lastMeasuredDistance;(Re<=1e-7||Re>=1e3)&&(Re=E.getState().targetDistance||3.5);const Ie=new U(0,0,-1).applyQuaternion(i.quaternion),ct=new U().copy(i.position).addScaledVector(Ie,Re);y(ct.clone()),ye?v(dt=>dt+1):c.current&&(c.current.target.copy(ct),c.current.update()),g(!0)};S.useEffect(()=>{const ee=E.getState();i.position.set(ee.cameraPos.x,ee.cameraPos.y,ee.cameraPos.z),i.quaternion.set(ee.cameraRot.x,ee.cameraRot.y,ee.cameraRot.z,ee.cameraRot.w),i.updateMatrixWorld(),M.current.copy(i.position),w.current.copy(i.quaternion),ee.targetDistance&&(q.current=ee.targetDistance),e==="Orbit"&&H(ee.targetDistance,!0)},[]),S.useEffect(()=>{const ee=Ie=>{i.position.set(Ie.position.x,Ie.position.y,Ie.position.z),i.quaternion.set(Ie.rotation.x,Ie.rotation.y,Ie.rotation.z,Ie.rotation.w),i.updateMatrixWorld(),j.current.set(0,0,0),k.current.set(0,0,0),z.current.reset(),M.current.copy(i.position),w.current.copy(i.quaternion),Ie.targetDistance&&Ie.targetDistance>.001&&(q.current=Ie.targetDistance,He.lastMeasuredDistance=Ie.targetDistance),Ie.sceneOffset&&(n(Ie.sceneOffset),He.shouldSnapCamera=!0,He.dirty=!0),e==="Orbit"&&!re.current&&H(Ie.targetDistance,!1)},ye=()=>{},De=Z.on("camera_teleport",ee),Re=Z.on("reset_accum",ye);return()=>{De(),Re()}},[e,i]);const G=le(ee=>ee.isPlaying),D=le(ee=>ee.isScrubbing),T=le(ee=>ee.isRecording),O=le(ee=>ee.recordCamera),B=le(ee=>ee.currentFrame),V=le(ee=>ee.sequence),Y=le(ee=>ee.captureCameraFrame),W=S.useRef(!1),K=S.useRef(null),Q=S.useRef(e),re=S.useRef(!1),te=S.useRef(!1),ae=S.useRef(null),ce=S.useRef(G),we=S.useRef(D),me=S.useRef(1),xe=S.useRef(!1),Ce=S.useRef(!1);S.useEffect(()=>{const ee=l.domElement,ye=()=>{te.current=!0,ae.current&&clearTimeout(ae.current),ae.current=setTimeout(()=>{te.current=!1},100)};return ee.addEventListener("wheel",ye,{passive:!0}),()=>{ee.removeEventListener("wheel",ye),ae.current&&clearTimeout(ae.current)}},[l]),S.useEffect(()=>{if(e!=="Orbit")return;const ee=l.domElement,ye=Re=>{if(Re.target.closest(".pointer-events-auto")){Ce.current=!1;return}Ce.current=!0,c.current&&(c.current.enabled=!0)},De=()=>{Ce.current=!1};return ee.addEventListener("pointerdown",ye,{capture:!0}),window.addEventListener("pointerup",De),()=>{ee.removeEventListener("pointerdown",ye,{capture:!0}),window.removeEventListener("pointerup",De)}},[e,l]);const Ge=G&&(!T||!O)&&Object.keys(V.tracks).some(ee=>ee.startsWith("camera."))||D;return xe.current=Ge,S.useEffect(()=>{Ge?g(!1):e==="Orbit"&&!b&&H(void 0,!0)},[Ge,e]),S.useLayoutEffect(()=>{if(Q.current!==e){if(Z.emit("camera_snap",void 0),e==="Fly"){const ee=He.sceneOffset,ye={x:ee.x,y:ee.y,z:ee.z,xL:(ee.xL??0)+i.position.x,yL:(ee.yL??0)+i.position.y,zL:(ee.zL??0)+i.position.z};i.position.set(0,0,0),i.updateMatrixWorld(),n(ye),Z.emit("camera_snap",void 0),M.current.set(0,0,0),j.current.set(0,0,0),k.current.set(0,0,0),z.current.reset(),g(!1);const De=He.lastMeasuredDistance;De>.001&&(q.current=De)}else e==="Orbit"&&H(void 0,!0);Q.current=e}},[e,i]),ca((ee,ye)=>{const De=ce.current&&!G,Re=we.current&&!D;if(De||Re){if(Z.emit("camera_snap",void 0),e==="Orbit")H(void 0,!1);else if(e==="Fly"){const Fe=He.sceneOffset,ut={x:Fe.x,y:Fe.y,z:Fe.z,xL:(Fe.xL??0)+i.position.x,yL:(Fe.yL??0)+i.position.y,zL:(Fe.zL??0)+i.position.z};i.position.set(0,0,0),i.updateMatrixWorld(),n(ut)}}if(ce.current=G,we.current=D,Ge){c.current&&(c.current.enabled=!1),x&&x(!1),He.isCameraInteracting=!1;return}e==="Orbit"&&!b&&H(void 0,!0);const Ie=i.position.distanceToSquared(M.current)>1e-12,ct=i.quaternion.angleTo(w.current)>1e-11,dt=$()||re.current||te.current;if(x&&x(dt),He.isCameraInteracting=dt,dt&&(Ie||ct)){if(He.dirty=!0,!W.current&&o){W.current=!0;const Fe=He.virtualSpace?He.virtualSpace.getUnifiedCameraState(i,He.lastMeasuredDistance):{position:{x:i.position.x,y:i.position.y,z:i.position.z},rotation:{x:i.quaternion.x,y:i.quaternion.y,z:i.quaternion.z,w:i.quaternion.w},sceneOffset:{...He.sceneOffset},targetDistance:He.lastMeasuredDistance};o(Fe)}T&&O&&Y(B,!0,G?"Linear":"Bezier")}if((Ie||ct||dt)&&(K.current&&clearTimeout(K.current),K.current=setTimeout(()=>{if(W.current=!1,a&&a(),E.getState().isUserInteracting)return;let Fe=He.lastMeasuredDistance;if((Fe<=0||Fe>=1e3)&&(Fe=E.getState().targetDistance||3.5),e==="Orbit"){const ut=i.position.length();ut>1e-4&&(Fe=ut)}E.setState({cameraPos:{x:i.position.x,y:i.position.y,z:i.position.z},cameraRot:{x:i.quaternion.x,y:i.quaternion.y,z:i.quaternion.z,w:i.quaternion.w},sceneOffset:He.sceneOffset,targetDistance:Fe})},100),M.current.copy(i.position),w.current.copy(i.quaternion)),e==="Fly"){if(d)return;const Fe=I.current?F.current.x-_.current.x:0,ut=I.current?F.current.y-_.current.y:0;z.current.update(i,ye,{move:P.current,look:R.current,moveJoy:N.current,isDragging:I.current,dragDelta:{x:Fe,y:ut},invertY:X},{baseSpeed:A.current,distEstimate:q.current,autoSlow:(p==null?void 0:p.autoSlow)??!0})}else if(e==="Orbit"&&c.current&&(c.current.enabled=!d&&!xe.current&&(Ce.current||re.current||te.current),c.current.zoomSpeed=me.current,c.current.rotateSpeed=1/(s||1),Math.abs(L.current)>.01)){const Fe=new U;i.getWorldDirection(Fe),i.up.applyAxisAngle(Fe,-L.current*2*ye).normalize(),c.current.update()}}),e!=="Orbit"||!b||Ge?null:t.jsx(ki,{ref:c,enabled:!d,makeDefault:!0,enableDamping:!1,target:C,enableZoom:!f,mouseButtons:{LEFT:ga.ROTATE,MIDDLE:ga.DOLLY,RIGHT:ga.PAN},touches:{ONE:Ja.ROTATE,TWO:Ja.DOLLY_PAN},onStart:()=>{if(re.current=!0,c.current){const ee=q.current>0?q.current:E.getState().targetDistance||3.5,ye=new U(0,0,-1).applyQuaternion(i.quaternion),De=new U().copy(i.position).addScaledVector(ye,ee);c.current.target.copy(De),c.current.update(),c.current.saveState();const Re=i.position.distanceTo(De);Re>1e-8&&(me.current=Math.max(.001,ee/Re*1.25))}},onEnd:()=>{re.current=!1}},`orbit-controls-${h}`)},lc=ue(),cc=()=>{const[e,o]=S.useState(!1),[a,r]=S.useState(0),n=S.useRef(0),s=S.useRef(0),i=S.useRef(15e3);S.useEffect(()=>{lc.isCompiling&&o(!0);const m=y=>{o(y)},x=Z.on("is_compiling",m),C=Z.on("compile_estimate",y=>{i.current=Math.max(2e3,y)});return()=>{x(),C()}},[]),S.useEffect(()=>{if(e){s.current=performance.now(),r(0);const m=i.current,x=()=>{const y=(performance.now()-s.current)/m,b=Math.min(95,95*(1-Math.exp(-3*y)));r(b),n.current=requestAnimationFrame(x)};n.current=requestAnimationFrame(x)}else a>0&&(cancelAnimationFrame(n.current),r(100));return()=>cancelAnimationFrame(n.current)},[!!e]);const l=!!e||a>=100,[c,d]=S.useState(!1);S.useEffect(()=>{if(a>=100&&!e){const m=setTimeout(()=>d(!0),800),x=setTimeout(()=>{d(!1),r(0)},1400);return()=>{clearTimeout(m),clearTimeout(x)}}},[a>=100&&!e]);const u=typeof e=="string"?e:"Compiling Shader...",f=typeof e=="string"&&e.includes("Lighting"),p=l&&!c;return t.jsx("div",{className:`fixed top-16 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none transition-opacity duration-500 ${p?f?"opacity-60":"opacity-100":"opacity-0"}`,children:t.jsxs("div",{className:"bg-black/80 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-full flex flex-col items-center gap-1.5 shadow-lg min-w-[200px]",children:[t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsx(Sr,{className:`animate-spin h-3 w-3 ${f?"text-amber-400":"text-cyan-400"}`}),t.jsx("span",{className:`text-[9px] font-bold ${f?"text-amber-200":"text-cyan-200"}`,children:u}),t.jsxs("span",{className:"text-[9px] font-mono text-gray-500",children:[Math.floor(a),"%"]})]}),t.jsx("div",{className:"w-full h-1 bg-white/5 rounded-full overflow-hidden",children:t.jsx("div",{className:`h-full rounded-full transition-[width] duration-150 ease-linear ${a>=100?"bg-green-400":f?"bg-amber-400/60":"bg-cyan-400/60"}`,style:{width:`${a}%`}})})]})})},Rt={SNAPSHOT:0,ANIMATE:1,OVERLAY:2,UI:3},xt=[];let Ha=!1;function It(e,o,a){if(xt.some(n=>n.name===e))return()=>{};const r={name:e,phase:o,fn:a};return xt.push(r),Ha=!0,()=>{const n=xt.indexOf(r);n>=0&&xt.splice(n,1)}}function Oo(e){Ha&&(xt.sort((o,a)=>o.phase-a.phase),Ha=!1);for(let o=0;o<xt.length;o++)xt[o].fn(e)}const dc=.15,uc=.4,Be={X:"#ff4444",Y:"#44ff44",Z:"#4444ff",Hover:"#ffffff",PlaneXY:"#4444ff",PlaneXZ:"#44ff44",PlaneYZ:"#ff4444"},Ke=new U,Nt=new U,$o=(e,o,a)=>(Ke.set(e.position.x,e.position.y,e.position.z),e.fixed?Ke.applyQuaternion(o.quaternion).add(o.position):Ke.sub({x:a.x+a.xL,y:a.y+a.yL,z:a.z+a.zL}),Ke.clone()),fc=(e,o,a,r)=>{o.updateMatrixWorld();const n=o.matrixWorldInverse;if(Nt.copy(e).applyMatrix4(n),Nt.z>-5e-5)return null;Ke.copy(e).project(o);const s=a/2,i=r/2,l=Ke.x*s+s,c=-(Ke.y*i)+i;return Math.abs(l)>5e4||Math.abs(c)>5e4?null:{x:l,y:c,z:Nt.z,isBehindCamera:!1}},ka=(e,o,a,r,n,s,i,l)=>{const c=e.clone().add(o.clone().multiplyScalar(a));if(Nt.copy(c).applyMatrix4(n),Nt.z>-5e-5)return null;Ke.copy(c).project(r),Ke.x*i/2,-(Ke.y*l/2);const d=Ke.x*i/2+i/2,u=-(Ke.y*l/2)+l/2;return{x:d-s.x,y:u-s.y}},ja=ue(),pc=ze.forwardRef((e,o)=>{const{index:a,light:r,onDragStart:n}=e,s=S.useRef(null),[i,l]=S.useState(null),c=E(y=>y.updateLight),{handleInteractionStart:d,handleInteractionEnd:u}=E(),f=E(y=>{var b,g,h;return((h=(g=(b=y.lighting)==null?void 0:b.lights)==null?void 0:g[a])==null?void 0:h.fixed)??r.fixed}),p=y=>l({part:y}),m=()=>l(null),x=()=>{var v,z;const y=(z=(v=E.getState().lighting)==null?void 0:v.lights)==null?void 0:z[a];if(!y)return;const b=y.fixed;let g=y.position;const h=Ne();if(h){const M=ja.sceneOffset;if(b){const w=new U(g.x,g.y,g.z);w.applyQuaternion(h.quaternion),w.add(h.position),g={x:w.x+M.x+(M.xL??0),y:w.y+M.y+(M.yL??0),z:w.z+M.z+(M.zL??0)}}else{const w=new U(g.x-M.x-(M.xL??0),g.y-M.y-(M.yL??0),g.z-M.z-(M.zL??0));w.sub(h.position),w.applyQuaternion(h.quaternion.clone().invert()),g={x:w.x,y:w.y,z:w.z}}}d("param"),c({index:a,params:{fixed:!b,position:g}}),u()};ze.useImperativeHandle(o,()=>({hide:()=>{s.current&&(s.current.style.display="none")},update:()=>{var H,G;const y=((G=(H=E.getState().lighting)==null?void 0:H.lights)==null?void 0:G[a])??r,b=ys(),g=Jt(),h=s.current;if(!b||!g||!h)return;const v=g.getBoundingClientRect(),z=v.width,M=v.height,w=ja.sceneOffset,j=$o(y,b,w),k=fc(j,b,z,M);if(!k){h.style.display="none";return}h.style.display="flex",h.style.transform=`translate3d(${k.x}px, ${k.y}px, 0)`;const I=j.distanceTo(b.position)*dc,_=b.matrixWorldInverse,F=new U(1,0,0),A=new U(0,1,0),N=new U(0,0,1);y.fixed&&(F.applyQuaternion(b.quaternion),A.applyQuaternion(b.quaternion),N.applyQuaternion(b.quaternion));const R=ka(j,F,I,b,_,k,z,M),X=ka(j,A,I,b,_,k,z,M),L=ka(j,N,I,b,_,k,z,M),$=(D,T)=>{h.querySelectorAll(`.${D}`).forEach(B=>{T?(B.setAttribute("x2",String(T.x)),B.setAttribute("y2",String(T.y)),B.setAttribute("visibility","visible")):B.setAttribute("visibility","hidden")})};$("axis-x-line",R),$("axis-y-line",X),$("axis-z-line",L);const q=(D,T,O)=>{const B=h.querySelector(`.${D}`);if(B)if(T&&O){const V=uc,Y=T.x*V,W=T.y*V,K=O.x*V,Q=O.y*V,re=Y+K,te=W+Q;B.setAttribute("d",`M0,0 L${Y},${W} L${re},${te} L${K},${Q} Z`),B.setAttribute("visibility","visible")}else B.setAttribute("visibility","hidden")};q("plane-xy",R,X),q("plane-xz",R,L),q("plane-yz",X,L)}}));const C=(y,b)=>{const g=Ne();if(!g)return;const h=$o(r,g,ja.sceneOffset);n(y,a,b,h)};return r.type==="Directional"?null:t.jsxs("div",{ref:s,className:"absolute flex items-center justify-center w-0 h-0 pointer-events-auto",style:{display:"none",willChange:"transform"},children:[t.jsxs("svg",{className:"absolute overflow-visible pointer-events-none",style:{left:0,top:0},children:[t.jsxs("defs",{children:[t.jsx("marker",{id:`arrow-${a}-x`,markerWidth:"6",markerHeight:"6",refX:"5",refY:"3",orient:"auto",children:t.jsx("path",{d:"M0,0 L0,6 L6,3 z",fill:(i==null?void 0:i.part)==="axis-x"?Be.Hover:Be.X})}),t.jsx("marker",{id:`arrow-${a}-y`,markerWidth:"6",markerHeight:"6",refX:"5",refY:"3",orient:"auto",children:t.jsx("path",{d:"M0,0 L0,6 L6,3 z",fill:(i==null?void 0:i.part)==="axis-y"?Be.Hover:Be.Y})}),t.jsx("marker",{id:`arrow-${a}-z`,markerWidth:"6",markerHeight:"6",refX:"5",refY:"3",orient:"auto",children:t.jsx("path",{d:"M0,0 L0,6 L6,3 z",fill:(i==null?void 0:i.part)==="axis-z"?Be.Hover:Be.Z})})]}),t.jsx("path",{className:"plane-xy cursor-move pointer-events-auto transition-opacity duration-150",fill:(i==null?void 0:i.part)==="plane-xy"?Be.Hover:Be.PlaneXY,fillOpacity:"0.3",stroke:"none",onPointerDown:y=>C(y,"plane-xy"),onPointerEnter:()=>p("plane-xy"),onPointerLeave:m}),t.jsx("path",{className:"plane-xz cursor-move pointer-events-auto transition-opacity duration-150",fill:(i==null?void 0:i.part)==="plane-xz"?Be.Hover:Be.PlaneXZ,fillOpacity:"0.3",stroke:"none",onPointerDown:y=>C(y,"plane-xz"),onPointerEnter:()=>p("plane-xz"),onPointerLeave:m}),t.jsx("path",{className:"plane-yz cursor-move pointer-events-auto transition-opacity duration-150",fill:(i==null?void 0:i.part)==="plane-yz"?Be.Hover:Be.PlaneYZ,fillOpacity:"0.3",stroke:"none",onPointerDown:y=>C(y,"plane-yz"),onPointerEnter:()=>p("plane-yz"),onPointerLeave:m}),t.jsxs("g",{onPointerEnter:()=>p("axis-z"),onPointerLeave:m,children:[t.jsx("line",{className:"axis-z-line pointer-events-none transition-all duration-150",x1:"0",y1:"0",x2:"0",y2:"0",stroke:(i==null?void 0:i.part)==="axis-z"?Be.Hover:Be.Z,strokeWidth:"2",markerEnd:`url(#arrow-${a}-z)`}),t.jsx("line",{className:"axis-z-line cursor-pointer pointer-events-auto",x1:"0",y1:"0",x2:"0",y2:"0",stroke:"rgba(0,0,0,0)",strokeWidth:"12",onPointerDown:y=>C(y,"axis-z")})]}),t.jsxs("g",{onPointerEnter:()=>p("axis-y"),onPointerLeave:m,children:[t.jsx("line",{className:"axis-y-line pointer-events-none transition-all duration-150",x1:"0",y1:"0",x2:"0",y2:"0",stroke:(i==null?void 0:i.part)==="axis-y"?Be.Hover:Be.Y,strokeWidth:"2",markerEnd:`url(#arrow-${a}-y)`}),t.jsx("line",{className:"axis-y-line cursor-pointer pointer-events-auto",x1:"0",y1:"0",x2:"0",y2:"0",stroke:"rgba(0,0,0,0)",strokeWidth:"12",onPointerDown:y=>C(y,"axis-y")})]}),t.jsxs("g",{onPointerEnter:()=>p("axis-x"),onPointerLeave:m,children:[t.jsx("line",{className:"axis-x-line pointer-events-none transition-all duration-150",x1:"0",y1:"0",x2:"0",y2:"0",stroke:(i==null?void 0:i.part)==="axis-x"?Be.Hover:Be.X,strokeWidth:"2",markerEnd:`url(#arrow-${a}-x)`}),t.jsx("line",{className:"axis-x-line cursor-pointer pointer-events-auto",x1:"0",y1:"0",x2:"0",y2:"0",stroke:"rgba(0,0,0,0)",strokeWidth:"12",onPointerDown:y=>C(y,"axis-x")})]}),t.jsx("circle",{cx:"0",cy:"0",r:"6",fill:r.color,stroke:"white",strokeWidth:"2",className:`cursor-move pointer-events-auto transition-all duration-150 ${(i==null?void 0:i.part)==="free"?"stroke-cyan-400 r-[8px]":""}`,onPointerDown:y=>C(y,"free"),onPointerEnter:()=>p("free"),onPointerLeave:m})]}),t.jsxs("div",{className:"absolute top-[50px] left-0 transform -translate-x-1/2 flex items-center gap-1 bg-black/80 backdrop-blur px-1.5 py-0.5 rounded border border-white/20 select-none z-20 pointer-events-auto transition-transform hover:scale-105",children:[t.jsxs("span",{className:"text-[9px] font-bold text-white",children:["L",a+1]}),t.jsx("button",{className:"anchor-btn p-0.5 hover:text-cyan-400 transition-colors text-[9px]",onPointerDown:y=>y.stopPropagation(),onClick:y=>{y.stopPropagation(),x()},title:f?"Attached to Camera":"World Anchored",children:f?t.jsx(al,{}):t.jsx(tl,{})})]})]})}),Pa=ue(),Dr={current:{}};let Ho=!1;const hc=()=>{var a,r,n,s;const e=(a=E.getState().lighting)==null?void 0:a.lights;if(!e)return;if(!Ho){Ho=!0;const i=On(e);i!==e&&((n=(r=E.getState()).setLighting)==null||n.call(r,{lights:i}))}const o=new Map(e.map(i=>[i.id,i]));for(const[i,l]of Object.entries(Dr.current)){const c=o.get(i);if(!c||!c.visible||c.type==="Directional"){(s=l.hide)==null||s.call(l);continue}try{l.update()}catch(d){console.error("Error updating light gizmo:",d)}}},mc=()=>{const e=E(m=>m.showLightGizmo),o=E(m=>{var x;return((x=m.lighting)==null?void 0:x.lights)||[]}),a=E(m=>m.setGizmoDragging);E(m=>m.updateLight);const r=E(m=>m.setDraggedLight),{handleInteractionStart:n,handleInteractionEnd:s}=E(),i=S.useRef(null),l=S.useMemo(()=>new er,[]),c=S.useMemo(()=>new Ua,[]),d=Dr,u=(m,x,C,y)=>{m.preventDefault(),m.stopPropagation();const b=o[x];if(!b)return;n("param"),a(!0),Pa.isGizmoInteracting=!0,r(b.id),m.target.setPointerCapture(m.pointerId);const g=Ne(),h=Jt();if(!g||!h)return;const v=Pa.sceneOffset||E.getState().sceneOffset,z={x:v.x,y:v.y,z:v.z,xL:v.xL??0,yL:v.yL??0,zL:v.zL??0},M=h.getBoundingClientRect(),w=new je((m.clientX-M.left)/M.width*2-1,-((m.clientY-M.top)/M.height)*2+1);if(c.setFromCamera(w,g),C.startsWith("plane")||C==="free"){let j=new U;C==="free"?g.getWorldDirection(j):C==="plane-xy"?j.set(0,0,1):C==="plane-xz"?j.set(0,1,0):C==="plane-yz"&&j.set(1,0,0),b.fixed&&C!=="free"&&j.applyQuaternion(g.quaternion),l.setFromNormalAndCoplanarPoint(j,y);const k=new U,I=c.ray.intersectPlane(l,k)?new U().subVectors(y,k):new U(0,0,0);i.current={active:!0,index:x,mode:C,startX:m.clientX,startY:m.clientY,startPos:y.clone(),sceneOffset:z,planeNormal:j,planeOrigin:y,offsetFromIntersection:I,screenAxis:new je,worldAxis:new U}}else if(C.startsWith("axis")){let j=new U;C==="axis-x"&&j.set(1,0,0),C==="axis-y"&&j.set(0,1,0),C==="axis-z"&&j.set(0,0,1),b.fixed&&j.applyQuaternion(g.quaternion);const k=y.distanceTo(g.position)*.15,P=y.clone().addScaledVector(j,k),I=y.clone().project(g),_=P.clone().project(g),F=h.getBoundingClientRect();let A=(_.x-I.x)*F.width*.5,N=-(_.y-I.y)*F.height*.5;P.applyMatrix4(g.matrixWorldInverse).z>0&&(A=-A,N=-N);let X=new je(A,N);X.lengthSq()<.5&&X.set(1,0),X.normalize(),i.current={active:!0,index:x,mode:C,startX:m.clientX,startY:m.clientY,startPos:y.clone(),sceneOffset:z,planeNormal:new U,planeOrigin:new U,offsetFromIntersection:new U,screenAxis:X,worldAxis:j}}window.addEventListener("pointermove",f),window.addEventListener("pointerup",p)},f=m=>{var v;const x=i.current;if(!x||!x.active)return;m.preventDefault(),m.stopPropagation();const C=Ne();if(!C)return;const b=(((v=E.getState().lighting)==null?void 0:v.lights)||[])[x.index];if(!b)return;let g=new U;if(x.mode.startsWith("plane")||x.mode==="free"){const z=Jt();if(!z)return;const M=z.getBoundingClientRect(),w=new je((m.clientX-M.left)/M.width*2-1,-((m.clientY-M.top)/M.height)*2+1);c.setFromCamera(w,C),l.setFromNormalAndCoplanarPoint(x.planeNormal,x.planeOrigin);const j=new U;if(c.ray.intersectPlane(l,j))g.copy(j).add(x.offsetFromIntersection);else return}else{const z=m.clientX-x.startX,M=m.clientY-x.startY,w=z*x.screenAxis.x+M*x.screenAxis.y,k=x.startPos.distanceTo(C.position)*.0025;g.copy(x.startPos).addScaledVector(x.worldAxis,w*k)}m.shiftKey&&(g.x=Math.round(g.x/.25)*.25,g.y=Math.round(g.y/.25)*.25,g.z=Math.round(g.z/.25)*.25);let h={x:0,y:0,z:0};if(b.fixed){const z=g.clone().sub(C.position).applyQuaternion(C.quaternion.clone().invert());h={x:z.x,y:z.y,z:z.z}}else{const z=x.sceneOffset;h={x:g.x+(z.x+z.xL),y:g.y+(z.y+z.yL),z:g.z+(z.z+z.zL)}}E.getState().updateLight({index:x.index,params:{position:h}})},p=m=>{i.current&&(a(!1),r(null),Pa.isGizmoInteracting=!1,s(),i.current=null,window.removeEventListener("pointermove",f),window.removeEventListener("pointerup",p))};return e?t.jsx("div",{className:"absolute inset-0 pointer-events-none",children:o.map((m,x)=>t.jsx(pc,{index:x,light:m,onDragStart:u,ref:C=>{const y=m.id;y&&(C?d.current[y]=C:delete d.current[y])}},m.id||x))}):null},Ga={displays:new Map},Va={diamonds:new Map},gc={diamonds:new Map},qt=(e,o)=>{o?(e.style.setProperty("background-color","#991b1b","important"),e.style.setProperty("border-color","#f87171","important")):(e.style.removeProperty("background-color"),e.style.removeProperty("border-color"))},xc=()=>{const e=le.getState(),{isPlaying:o,currentFrame:a,sequence:r}=e;Ga.displays.forEach((n,s)=>{if(n)try{const i=Sa(s,o,a,r);n.innerText=i.toFixed(2)}catch(i){console.error("Error updating live value display:",i)}}),o||(Va.diamonds.forEach(n=>{const{el:s,frame:i,tid:l}=n;if(Math.abs(i-a)<.1){const d=r.tracks[l];if(d){const u=d.keyframes.find(f=>Math.abs(f.frame-i)<.1);if(u){const f=Sa(l,!1),p=Math.abs(u.value-f)>.001;qt(s,p)}}}else qt(s,!1)}),gc.diamonds.forEach(n=>{const{el:s,frame:i,tids:l}=n;if(Math.abs(i-a)<.1){let d=!1;for(const u of l){const f=r.tracks[u];if(f){const p=f.keyframes.find(m=>Math.abs(m.frame-i)<.1);if(p){const m=Sa(u,!1);if(Math.abs(p.value-m)>.001){d=!0;break}}}}qt(s,d)}else qt(s,!1)}))},yc=({tid:e})=>{const o=S.useRef(null);return S.useEffect(()=>(o.current&&Ga.displays.set(e,o.current),()=>{Ga.displays.delete(e)}),[e]),t.jsx("span",{ref:o,className:"text-[9px] font-mono text-gray-600 w-12 text-right",children:"--"})},bc=({tid:e,kid:o,frame:a,isSelected:r,interpolation:n})=>{const s=S.useRef(null),i=`${e}::${o}`;S.useEffect(()=>(s.current&&Va.diamonds.set(i,{el:s.current,frame:a,tid:e}),()=>{Va.diamonds.delete(i)}),[i,a,e]);const l=n==="Linear"?"rotate-45 rounded-sm":n==="Step"?"rounded-none":"rounded-full";return t.jsx("div",{ref:s,className:`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 border transition-transform ${r?"bg-white border-white scale-125 z-30":"bg-cyan-900 border-cyan-400 group-hover/key:scale-125 group-hover/key:bg-cyan-400"} ${l}`})},Uu=S.memo(({tid:e,sequence:o,frameWidth:a,isSelected:r,selectedKeys:n,onSelect:s,onRemove:i,onAddKey:l,onKeyMouseDown:c})=>{const d=E(f=>f.openContextMenu),u=f=>{const p=Ee(f.currentTarget);p.length>0&&(f.preventDefault(),f.stopPropagation(),d(f.clientX,f.clientY,[],p))};return t.jsxs("div",{className:"flex border-b border-white/5 bg-transparent hover:bg-white/5",style:{height:32},"data-help-id":"anim.tracks",children:[t.jsxs("div",{className:`sticky left-0 z-30 w-[220px] bg-black/80 backdrop-blur-sm border-r border-white/10 shrink-0 flex items-center justify-between px-3 cursor-pointer group select-none ${r?"border-l-2 border-l-cyan-500":""}`,onClick:f=>s(f,e),onMouseDown:f=>f.stopPropagation(),onContextMenu:u,"data-help-id":"anim.tracks",children:[t.jsx("div",{className:"truncate text-[10px] font-bold text-gray-400 group-hover:text-cyan-400 pl-4",title:o.tracks[e].label,children:o.tracks[e].label}),t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsx(yc,{tid:e}),t.jsx("button",{onClick:f=>{f.stopPropagation(),i()},className:"opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400",children:t.jsx(St,{})})]})]}),t.jsxs("div",{className:"flex-1 relative group/track z-10",onDoubleClick:f=>{f.stopPropagation();const p=f.currentTarget.getBoundingClientRect(),m=Math.max(0,Math.round((f.clientX-p.left)/a));l(m)},children:[t.jsx("div",{className:"absolute inset-0 opacity-0 group-hover/track:opacity-5 bg-white pointer-events-none"}),o.tracks[e].keyframes.map(f=>{const p=n.includes(`${e}::${f.id}`);return t.jsx("div",{className:"absolute top-1/2 -translate-y-1/2 z-20 cursor-grab group/key",style:{left:`${f.frame*a-10}px`,width:"20px",height:"20px"},onMouseDown:m=>c(m,e,f.id),"data-help-id":"anim.keyframes",children:t.jsx(bc,{tid:e,kid:f.id,frame:f.frame,isSelected:p,interpolation:f.interpolation})},f.id)})]})]})});It("snapshotDisplayCamera",Rt.SNAPSHOT,()=>{const e=Ne();e&&xs(e)});It("animationTick",Rt.ANIMATE,Ul);It("lightGizmoTick",Rt.OVERLAY,hc);It("fpsCounterTick",Rt.UI,sl);It("performanceMonitorTick",Rt.UI,Yl);It("trackRowTick",Rt.UI,xc);const vc=({onLoaded:e})=>{const{camera:o,size:a,gl:r}=la(),[n,s]=S.useState(!1),i=ue(),l=E(d=>d.dpr);S.useEffect(()=>{ms(o),gs(r.domElement)},[o,r]),S.useEffect(()=>{let d=!0;return(async()=>{let f=0;for(;!i.isBooted;){if(!d)return;if(++f>=300){console.error("[WorkerTickScene] Worker boot timeout after 30s");return}await new Promise(p=>setTimeout(p,100))}for(;i.isCompiling;){if(!d)return;await new Promise(p=>setTimeout(p,100))}d&&(i.resizeWorker(a.width,a.height,l),s(!0),e&&e())})(),()=>{d=!1}},[]),S.useEffect(()=>{i.resizeWorker(a.width,a.height,l)},[a.width,a.height,l]),S.useEffect(()=>{const d=[Z.on(fe.CONFIG,u=>{i.sendConfig(u)}),Z.on(fe.UNIFORM,({key:u,value:f,noReset:p})=>{i.setUniform(u,f,p)}),Z.on(fe.RESET_ACCUM,()=>{i.resetAccumulation()}),Z.on(fe.OFFSET_SET,u=>{const f={x:u.x,y:u.y,z:u.z,xL:u.xL??0,yL:u.yL??0,zL:u.zL??0};i.setShadowOffset(f),i.post({type:"OFFSET_SET",offset:f})}),Z.on(fe.OFFSET_SHIFT,({x:u,y:f,z:p})=>{i.applyOffsetShift(u,f,p),i.post({type:"OFFSET_SHIFT",x:u,y:f,z:p})}),Z.on(fe.CAMERA_SNAP,()=>{i.shouldSnapCamera=!0}),Z.on(fe.TEXTURE,({textureType:u,dataUrl:f})=>{i.updateTexture(u,f)}),Z.on(fe.REGISTER_FORMULA,({id:u,shader:f})=>{i.registerFormula(u,f)})];return()=>{d.forEach(u=>u())}},[]);const c=ze.useRef({lastYield:0,fps:60,frames:0,lastSample:0});return ca((d,u)=>{var z;if(!n)return;const f=Math.min(u,.1),p=performance.now(),m=c.current;if(m.frames++,p-m.lastSample>=500&&(m.fps=m.frames*1e3/(p-m.lastSample),m.frames=0,m.lastSample=p),m.fps<20&&p-m.lastYield>=1e3){m.lastYield=p,Oo(f);return}Oo(f);const x=o,C=((z=E.getState().optics)==null?void 0:z.camFov)??60;x.fov!==C&&(x.fov=C,x.updateProjectionMatrix());const y={position:[x.position.x,x.position.y,x.position.z],quaternion:[x.quaternion.x,x.quaternion.y,x.quaternion.z,x.quaternion.w],fov:x.fov||60,aspect:x.aspect||a.width/a.height},b=E.getState(),g=b.sceneOffset||{x:0,y:0,z:0,xL:0,yL:0,zL:0},h={x:g.x,y:g.y,z:g.z,xL:g.xL??0,yL:g.yL??0,zL:g.zL??0},v={cameraMode:b.cameraMode,isCameraInteracting:le.getState().isCameraInteracting,optics:b.optics??null,lighting:b.lighting??null,quality:b.quality??null,geometry:b.geometry??null};i.sendRenderTick(y,h,f,v)},1),null},wc=({width:e,height:o})=>{const a=S.useRef(null),r=S.useRef(!1);return S.useEffect(()=>{const n=ue();return n.onCrash=s=>{console.error(`[WorkerDisplay] Worker crashed: ${s}.`)},()=>{n.onCrash=null}},[]),S.useEffect(()=>{var x,C;if(r.current||!a.current)return;r.current=!0;const n=window.devicePixelRatio||1,s=document.createElement("canvas");s.width=e*n,s.height=o*n,s.style.cssText="position:absolute;inset:0;width:100%;height:100%;pointer-events:none",a.current.appendChild(s);const i=E.getState(),l=gr(i),c=((x=window.matchMedia)==null?void 0:x.call(window,"(pointer: coarse)").matches)||window.innerWidth<768,d=ue(),u=i.cameraPos||{x:0,y:0,z:3},f=i.cameraRot||{x:0,y:0,z:0,w:1},p=((C=i.optics)==null?void 0:C.camFov)??60;d.initWorkerMode(s,l,e,o,n,c,{position:[u.x,u.y,u.z],quaternion:[f.x,f.y,f.z,f.w],fov:p});const m=i.sceneOffset;if(m){const y={x:m.x,y:m.y,z:m.z,xL:m.xL??0,yL:m.yL??0,zL:m.zL??0};d.setShadowOffset(y),d.post({type:"OFFSET_SET",offset:y})}},[]),t.jsx("div",{ref:a,style:{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}})},Go=12,Sc=40,Mc=()=>{const e=ie.getViewportOverlays().filter(r=>r.type==="dom"),o=E(),a=E();return t.jsx("div",{className:"absolute inset-0 pointer-events-none z-[20]",children:e.map(r=>{const n=he.get(r.componentId),s=r.id,i=o[s];return n&&i?t.jsx(n,{featureId:s,sliceState:i,actions:a},r.id):null})})},zc=()=>{const e=ie.getViewportOverlays().filter(r=>!r.type||r.type==="scene"),o=E(),a=E();return t.jsx(t.Fragment,{children:e.map(r=>{const n=he.get(r.componentId),s=r.id,i=o[s];return n&&i?t.jsx(n,{featureId:s,sliceState:i,actions:a},r.id):null})})},Cc=({hudRefs:e,onSceneReady:o})=>{const a=E(),r=S.useRef(null),n=S.useRef(null),{drawing:s,interactionMode:i}=a,l=s==null?void 0:s.active,c=i==="selecting_region",{visualRegion:d,isGhostDragging:u,renderRegion:f}=Xl(r);ql(r);const{isMobile:p}=Za(),[m,x]=S.useState({w:0,h:0});S.useLayoutEffect(()=>{if(!n.current)return;const R=new ResizeObserver(L=>{for(const $ of L){const q=Math.max(1,$.contentRect.width),H=Math.max(1,$.contentRect.height);x({w:q,h:H})}});R.observe(n.current);const X=n.current.getBoundingClientRect();return X.width>0&&X.height>0&&x({w:X.width,h:X.height}),()=>R.disconnect()},[]);const C=a.resolutionMode==="Fixed",[y,b]=a.fixedResolution,g=d||f,h=a.isBroadcastMode,v=40,z=Math.max(1,m.w-v),M=Math.max(1,m.h-v);let w=1;C&&(w=Math.min(1,z/y,M/b));const j=C?{width:y,height:b,transform:`scale(${w})`,transformOrigin:"center center",boxShadow:"0 0 50px rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.1)",flexShrink:0}:{width:"100%",height:"100%"},k=C?y*w:m.w,P=C?b*w:m.h,I=(m.h-P)/2,_=(m.w-k)/2,F=Math.max(Go,I-Sc),A=Math.max(Go,_),N=R=>{};return t.jsxs("div",{ref:n,className:`relative flex-1 flex items-center justify-center overflow-hidden bg-[#050505] touch-none ${c||l?"cursor-crosshair":""}`,style:{backgroundImage:C?"radial-gradient(circle at center, #111 0%, #050505 100%)":"none"},onContextMenu:R=>{R.preventDefault(),R.stopPropagation()},children:[C&&t.jsx("div",{className:"absolute inset-0 opacity-20 pointer-events-none",style:{backgroundImage:"linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)",backgroundSize:"40px 40px"}}),!h&&t.jsx(Hl,{state:a,actions:a,isMobile:a.debugMobileLayout||p,hudRefs:e}),!h&&t.jsx(cc,{}),!h&&t.jsx(Zl,{}),!h&&t.jsx(Wl,{}),t.jsxs("div",{ref:r,style:j,className:"relative bg-[#111] group z-0",children:[(c||l)&&t.jsx("div",{className:"absolute inset-0 z-50 cursor-crosshair bg-transparent pointer-events-none"}),g&&!c&&!h&&t.jsx("div",{className:`absolute border-2 z-40 group/box region-box cursor-move transition-opacity duration-75 ${u?"border-cyan-400 border-dashed opacity-80":"border-cyan-500 opacity-100"}`,style:{left:`${g.minX*100}%`,bottom:`${g.minY*100}%`,right:`${(1-g.maxX)*100}%`,top:`${(1-g.maxY)*100}%`},children:t.jsxs("div",{className:"absolute top-0 right-0 bg-cyan-600 text-white text-[9px] font-bold px-1.5 py-0.5 flex items-center gap-2 pointer-events-auto shadow-md",children:[t.jsx("span",{children:u?"Moving...":"Active Region"}),t.jsx("div",{className:"w-px h-2 bg-cyan-400/50"}),t.jsx("button",{onClick:R=>{R.stopPropagation(),a.setRenderRegion(null)},className:"hover:text-black transition-colors",title:"Clear Region",children:"✕"})]})}),m.w>0&&m.h>0&&t.jsx(wc,{width:C?y:m.w,height:C?b:m.h}),t.jsxs(Ci,{gl:{alpha:!0,depth:!1,antialias:!1,powerPreference:"high-performance",preserveDrawingBuffer:!1},camera:{position:[0,0,0],fov:60},style:{position:"absolute",inset:0,pointerEvents:"auto"},dpr:a.dpr,onPointerDown:R=>R.target.setPointerCapture(R.pointerId),onPointerMove:N,onWheel:N,children:[t.jsx(sc,{mode:a.cameraMode,hudRefs:e,onStart:R=>a.handleInteractionStart(R),onEnd:()=>a.handleInteractionEnd(),setSceneOffset:a.setSceneOffset,fitScale:w}),t.jsx(vc,{onLoaded:o}),t.jsx(zc,{})]}),t.jsx(Mc,{}),!h&&t.jsx(Jl,{width:C?y:m.w,height:C?b:m.h}),!h&&a.histogramActiveCount>0&&t.jsx(Fo,{onUpdate:R=>a.setHistogramData(R),autoUpdate:a.histogramAutoUpdate,trigger:a.histogramTrigger,source:"geometry"}),!h&&a.sceneHistogramActiveCount>0&&t.jsx(Fo,{onUpdate:R=>a.setSceneHistogramData(R),autoUpdate:!0,trigger:a.sceneHistogramTrigger,source:"color"}),c&&!h&&t.jsx("div",{className:"absolute top-4 left-1/2 -translate-x-1/2 bg-cyan-900/80 text-cyan-100 text-[10px] font-bold px-3 py-1 rounded-full border border-cyan-500/50 shadow-lg animate-pulse pointer-events-none z-[60]",children:"Drag to select render region"})]}),C&&!h&&t.jsx(Kl,{width:y,height:b,top:F,left:A,maxAvailableWidth:m.w,maxAvailableHeight:m.h,onSetResolution:a.setFixedResolution,onSetMode:a.setResolutionMode})]})},kc=()=>{const e=E(o=>o.openContextMenu);S.useEffect(()=>{const o=a=>{if(a.defaultPrevented)return;const r=Ee(a.target);r.length>0&&(a.preventDefault(),e(a.clientX,a.clientY,[],r))};return window.addEventListener("contextmenu",o),()=>window.removeEventListener("contextmenu",o)},[e])},jc={"general.undo":{id:"general.undo",category:"General",title:"Undo & History",content:`
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
- **Tab**: Toggle between Orbit and Fly Mode
- **T**: Toggle Timeline Panel
- **H**: Toggle UI Hints (Tooltip overlay)
- **\` (Backtick)**: Toggle Advanced Mode (show/hide advanced controls)
- **B**: Toggle Broadcast Mode (clean feed — hides all UI overlays)
- **Space** (non-fly mode): Play / Pause animation
- **Esc**: Cancel Focus Picking / Close Menus / Deselect
`},"general.disclaimer":{id:"general.disclaimer",category:"General",title:"Disclaimer & Terms",content:`
## Age Restriction
According to Google's Terms of Service, this application is **not intended for users under the age of 18**.

## AI & Human Verification
This application was created through a collaboration between Artificial Intelligence and Human Engineering. 
While rigorous verification processes are in place:
- Both AI and Humans are fallible.
- The software may contain errors, bugs, or inaccuracies.
- Use at your own risk.
`},"general.files":{id:"general.files",category:"General",title:"File Import & Export",content:`
## Smart PNGs (Steganography)
When you save a **Snapshot** (via the Camera Menu), the application embeds the full scene data into the image metadata.
- **Load**: Simply **drag and drop** the PNG file back into the browser window to restore the scene instantly.
- **Safety**: The visual image is standard PNG. The data is hidden in a \`tEXt\` chunk.
- **Warning**: Social media platforms (Twitter, Facebook, etc.) strip this metadata. Share the file directly (Discord, Drive, Email) to preserve the data.

## Shareable URLs
You can share your scene via the URL bar.
- **Copy Link**: Use the link icon in the System Menu.
- **Limits**: Browsers have a URL limit (approx 4096 characters). If your scene is too complex (e.g., thousands of keyframes), the app will automatically **strip animation data** to generate a working link. A warning "(Anims Removed)" will appear.
`}},Pc={"formula.active":{id:"formula.active",category:"Formulas",title:"Active Formula",content:`
This dropdown selects the mathematical equation used to generate the 3D shape.

## Categories
- **Classic Sets**: The original Mandelbulb and its variations (Power-based).
- **Geometric**: Box folds, Sponges, and Polyhedra (Fold-based).
- **Hybrids**: Formulas that mix folding and power functions for complex, organic-mechanical looks.
- **Systems**: The **Modular Builder**, allowing you to create custom pipelines.
`},"formula.transform":{id:"formula.transform",category:"Formulas",title:"Local Rotation (Pre-Transform)",content:`
Rotates the coordinate system $(x,y,z)$ *before* the fractal formula is applied.

## Why use this?
- **Orientation**: Rotates the fractal object itself, rather than moving the camera around it. This is useful for aligning the fractal with lighting or fog.
- **Symmetry**: Changing the input rotation can drastically change the shape of box-folded fractals (like Amazing Box or Menger Sponge) because the folding planes are axis-aligned. Rotating the space causes the folds to cut at diagonal angles.
`}},Tc={"formula.mandelbulb":{id:"formula.mandelbulb",category:"Formulas",title:"Mandelbulb",parentId:"formula.active",content:`
## The Math
The Mandelbulb is a 3D analogue of the Mandelbrot set constructed using Spherical Coordinates.
The iteration maps a point $(x,y,z)$ to spherical $(r, 	heta, phi)$, powers it by $n$, and adds the constant $c$.
$$ v 	o v^n + c $$

**Reference:** [Wikipedia: Mandelbulb](https://en.wikipedia.org/wiki/Mandelbulb)
**Credits:** Discovered by **Daniel White** and **Paul Nylander**.

## Parameters
- **Param A (Power)**: The exponent $n$.
  - **8.0**: The classic "Broccoli" shape discovered by Daniel White.
  - **2.0**: A smooth, bulbous shape similar to a 3D Cardioid.
- **Param B (Theta Phase)**: Adds an offset to the polar angle $	heta$ during iteration. Warps the bulbs vertically.
- **Param C (Phi Phase)**: Adds an offset to the azimuthal angle $phi$. Twists the bulbs horizontally.
- **Param D (Z Twist)**: Applies a spatial twist along the Z-axis after the power function.
- **Param E (Radiolaria)**: Toggles the **Radiolaria Mutation**.
- **Param F (Radio Limit)**: When Radiolaria is on, this clamps the Y-coordinate.

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
- **Param A (Interference)**: The strength of the subtraction term $k$.
  - **0.0**: Standard "Lathe" fractal (Solid).
  - **0.33**: The theoretical Euclidean balance point.
  - **> 0.5**: Breaks the surface, revealing internal veins and structures.
- **Param C (Ghost Shift)**: Shifts the calculation into the 4th dimension. Use this to scan through the "inside" of the ghost.
- **Param D (Cloud Density)**: Artificially softens the Distance Estimator to make the fractal look like a nebula.
`},"formula.mandelbrotck":{id:"formula.mandelbrotck",category:"Formulas",title:"Mandelbrot Hypercomplex",parentId:"formula.active",content:`
## The Math
This is the corrected "True" 3D extension of the Mandelbrot set using Hypercomplex algebra.

## The "Missing Cross-Term"
Simple 3D extensions often look like a 2D Mandelbrot rotated around a stick (a "Lathe"). This happens because the Y and Z axes don't interact.
This formula adds the **Cross-Term ($2yz$)** to the iteration, forcing the Y and Z components to mix. This creates a fully connected 3D structure that is not just a surface of revolution.

## Parameters
- **Param A (Metric)**:
  - **-1.0**: Elliptic. Solid, bulbous, Tetabrot-like.
  - **1.0**: Hyperbolic. Creates "Saddles", "Feathers" and open filaments.
- **Param B (C-Phase)**: Rotates the injection constant $C$ during iteration. Creates spiraling arms and asymmetry.
- **Param C (Coupling)**: Controls the strength of the Y/Z mixing.
  - **0.0**: Lathe mode (No mixing).
  - **1.0**: Full 3D Fractal.
- **Param D (Burn Mix)**: Blends between Standard Mandelbrot and **Burning Ship** logic ($z 	o |z|$).
  - **0.0**: Smooth.
  - **1.0**: Sharp, skeletal, mechanical structures.
- **Param E (Spiral)**: Rotates the Y and Z axes at every step. Turns straight filaments into helixes.
- **Param F (Y Scale)**: Modifies the width of the fractal arms.
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
- **Param A (Ring Radius)**: The major radius of the donut. Controls the size of the "hole".
- **Param B (Twist)**: The most important control. Spins the fractal pattern around the ring.
  - **0.0**: Creates a "Lathe" effect (constant cross-section).
  - **Values > 0**: Creates twisting, cable-like structures that connect endlessly.
- **Param C (Power)**: The exponent of the Mandelbrot set ($z^2$, $z^3$, etc).
- **Param D (Ring Phase)**: Shifts the fractal along the length of the tube.
- **Param E (Cross Phase)**: Rotates the cross-section slice.

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
- **Param A (Height)**: Controls the vertical displacement strength based on the Distance Estimator.
- **Param B (Zoom)**: Zoom level into the 2D complex plane.
- **Param C (Layer 2)**: Adds secondary ripples driven by the "Layer 2" gradient brightness.
- **Param D (Smooth Trap)**: Adds spikey towers based on Orbit Trap proximity.
- **Param E/F (Pan)**: Moves the fractal center coordinates (Julia/Mandelbrot origin).

## Usage
Ideal for creating alien landscapes, canyons, and "Math Mountains".
`},"formula.quaternion":{id:"formula.quaternion",category:"Formulas",title:"Quaternion Julia",parentId:"formula.active",content:`
## The Math
Quaternions are a 4-dimensional number system ($x, y, z, w$). This formula iterates the classic $z^2+c$ using Quaternion multiplication.
Since our screens are 2D and the fractal is 4D, we view a **3D Slice** of the 4D object.

**Reference:** [Wikipedia: Quaternion](https://en.wikipedia.org/wiki/Quaternion)
**Credits:** Number system described by **William Rowan Hamilton**.

## Parameters
- **Param A (Julia W)**: The 4th coordinate of the Julia Constant $C$. Changing this "animates" the fractal as you move through the 4th dimension.
- **Param B (Slice W)**: The w-coordinate of the 3D slice we are rendering.
- **Param C-F (Rotations)**: Rotates the 4D hyper-object on various planes (XY, XZ, XW, YW) before slicing. This creates "inside-out" morphing effects.

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
- **Param A (Scale)**: The density multiplier. Positive values create solid cubes; negative values create hollow, lattice-like structures.
- **Param B (Min Radius)**: The inner radius of the Sphere Fold (linear scaling region).
- **Param C (Fold Limit)**: The size of the folding box.
- **Param D (Fixed Radius)**: The outer radius of the Sphere Fold (inversion region).
- **Param E/F (Pre-Rotation)**: Rotates space *before* the folds, creating diagonal symmetries.

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
- **Param A (Scale)**: The scaling factor. Standard Menger is 3.0.
- **Param B (Offset)**: The spacing between sub-cubes.
- **Param C (Rot X)**: Rotates the coordinate system between iterations.
- **Param D (Rot Z)**: Rotates the coordinate system between iterations.
- **Param E (Z Shift)**: Stretches the fractal vertically.

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
- **Param A (Power)**: The main exponent.
- **Param B (Distortion Real)**: The real component of the historical influence $K$.
- **Param C (Distortion Imag)**: The imaginary component of $K$.
- **Param D (History Exp)**: Exponent applied to the previous iteration.
- **Param E (Z Stretch)**: Scales the Z-axis.
- **Param F (Twist)**: Applies spatial twist.

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
- **Param A (Scale)**: Box scale.
- **Param B (Min Radius)**: Sphere fold radius.
- **Param C (Wave Freq)**: Frequency of the sine waves.
- **Param D (Wave Amp)**: Amplitude (height) of the sine waves.
- **Param E (Wave Twist)**: Twists the wave direction.
- **Param F (Vert Shift)**: Shifts the waves vertically.

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

## Usage
1. **Start Shape**: Set using the **Julia Mode** controls (Julia X/Y/Z).
2. **End Shape**: Set using **Param D** (Real) and **Param E** (Imaginary).
3. **Height**: Controls the length of the stack.

## Slicing
This formula is often used with "Slice Thickness" to create disjointed, floating layers (like MRI scans or topographic maps).
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
`}},Rc={"panel.formula":{id:"panel.formula",category:"Parameters",title:"Formula Parameters",content:`
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

The slider for the target parameter will show a "Ghost Knob" indicating the modulated value.
`}},Ic={"ui.controls":{id:"ui.controls",category:"UI",title:"Control Deck",content:`
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
- **Shading**: Surface material (PBR), Glow, and Ambient Occlusion.
- **Gradients**: Color palettes and texturing.
- **Quality**: Performance tuning, Anti-aliasing, and Resolution.
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
- Lights appear as glowing rings in 3D space.
- **Drag** a ring to move the light directly.
- **Click** a ring to open a quick-access menu for Color and Intensity.
- **Click the Anchor Icon** above a light to toggle between "Fixed" (Headlamp) and "World" modes.
`},"ui.colorpicker":{id:"ui.colorpicker",category:"UI",title:"Color Picker",content:`
The application uses a compact, high-precision **HSV Slider** system.

## Usage
- **Hue (H)**: Top bar. Shows the spectrum of colors.
- **Saturation (S)**: Middle bar. Intensity of color (Left=White, Right=Vivid).
- **Value (V)**: Bottom bar. Brightness (Left=Black, Right=Bright).

## Context Menu
**Right-click** the color swatch (square on the left) to access:
- **Copy/Paste**: Transfer hex codes between pickers.
- **History**: Quickly revert to recently used colors.
- **Presets**: Pure White/Black shortcuts.
`},"ui.gradient_editor":{id:"ui.gradient_editor",category:"UI",title:"Gradient Editor",content:`
A spline-based color ramp editor used for surface coloring.

## Interaction
- **Add Knot**: Click anywhere on the bottom track.
- **Move Knot**: Drag a knot left/right.
- **Remove Knot**: Drag a knot down (off the track) or press Delete.
- **Select Multiple**: Drag a selection box or Shift+Click knots.
- **Bias**: Drag the small diamond handle between knots to adjust the interpolation curve (Gamma).

## Context Menu
Right-click the track to:
- **Distribute**: Evenly space selected knots.
- **Invert**: Flip the gradient.
- **Double Knots**: Increase resolution.
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
- **Alt + Drag Number**: **0.1x Precision**. Useful for fine-tuning. Also disables step quantization for full precision.
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
`},"ui.performance":{id:"ui.performance",category:"UI",title:"Performance Monitor",content:`
The system automatically detects sustained low framerates.

- **Low FPS Warning**: Appears if the renderer struggles to maintain a usable frame rate.
- **Fix Button**: Instantly reduces the internal resolution by 25% to restore interactivity.
- **Dismiss**: Ignores the warning for this session.
`}},Fc={"ui.timeline":{id:"ui.timeline",category:"Timeline",title:"Animation Timeline",content:`
The central hub for creating motion. It allows you to animate almost any parameter in the application using keyframes.

## Layout
- **Toolbar**: Playback controls, Recording toggle, and View Modes.
- **Navigator**: The mini-map strip below the toolbar. 
  - **Scroll**: Drag the bar left/right.
  - **Zoom**: Drag the edges of the active window or use the scroll wheel.
- **Track List**: On the left. Shows all animated properties grouped by category (Camera, Formula, etc.).
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
- **Soft Selection**: Hold **Ctrl** while dragging a key to influence neighbor keys proportionally based on the radius (Rubber band effect).
- **Copy/Paste**: Use **Ctrl+C** and **Ctrl+V** to duplicate keys (works across different tracks!).
- **Delete**: Press Backspace/Delete.
`},"anim.transport":{id:"anim.transport",category:"Timeline",title:"Transport & Recording",parentId:"ui.timeline",content:`
Controls for playback and recording.

## Controls
- **Play/Pause**: Toggle playback (Hotkey: Space).
- **Stop**: Return to frame 0.
- **Record (Red Circle)**: Toggles Auto-Keyframe mode.
  - When enabled, changing ANY slider or moving the camera will automatically create a keyframe at the current time position.
- **Key Cam**: Manually captures the current camera state (Position + Rotation + Zoom) as a keyframe. Use this if you want to set a "pose" without moving the camera.
`},"anim.tracks":{id:"anim.tracks",category:"Timeline",title:"Tracks",parentId:"ui.timeline",content:`
Each animated parameter has its own **Track**.

- **Creation**: Tracks are created automatically when you add a keyframe to a parameter.
- **Visibility**: Use the Eye icon in the Graph Editor sidebar to show/hide curves.
- **Grouping**: Tracks are automatically grouped by category (Camera, Lighting, Formula) in the Dope Sheet.

## Context Menu
Right-click a track header to access:
- **Delete Track**: Removes the track and all keyframes.
- **Post Behavior**: Determines what happens after the last keyframe.
  - **Hold**: Value stays constant.
  - **Loop**: Animation repeats from the start.
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
- **Broken**: Allows sharp corners (incoming slope != outgoing slope).
`},"anim.graph":{id:"anim.graph",category:"Timeline",title:"Graph Editor (Curves)",parentId:"ui.timeline",content:`
A powerful F-Curve editor for fine-tuning motion dynamics.
Switch to this mode using the **Curve Icon** in the timeline toolbar.

## Toolbar Tools (Top Left)
- **Fit View / Selection**: Zooms the view to show all keys or just selected ones.
- **Normalize (N)**: Toggles "Normalized View". 
  - **Off**: Shows raw values. Good for seeing true scale.
  - **On**: Scales all curves to fit 0-1 height. Essential for comparing timing between tracks with vastly different values (e.g. Rotation vs Scale).
- **Euler Filter**: Fixes "Gimbal Lock" or rotation flips where values jump 360 degrees. Unwinds the curves to be continuous.
- **Simplify**: Drag to reduce the number of keyframes while preserving the curve shape.
- **Bake**: Resamples the curve at fixed intervals.
- **Smooth / Bounce**: Physics-based modifiers.
  - **Drag Right**: Applies Gaussian Smoothing to smooth out jitter.
  - **Drag Left**: Applies Spring Physics (Bounce) to create overshoot/elasticity.

## Curve Interaction
- **Select**: Click curve keys or drag a selection box.
- **Move**: Drag keys. Hold **Shift** to lock movement to X (Time) or Y (Value) axis.
- **Tangents**: Select a key to see its Bezier handles. Drag handles to adjust easing (Slow-in/Slow-out).
- **Extrapolation**: Dotted lines at the end of the curve visualize the Post Behavior (Loop, Ping-Pong, etc).

## Navigation
- **Alt + Right Drag**: Zoom view (Scale Time/Value).
- **Alt + Left Drag**: Pan view.
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
`}},_c={"panel.light":{id:"panel.light",category:"Lighting",title:"Light Studio",content:`
The engine utilizes a sophisticated **Physically Based Rendering (PBR)** approximation to simulate how light interacts with the infinite surfaces of the fractal.

## Light Types
- **Point (Bulb)**: Standard light source. Has position and falloff.
- **Directional (Sun)**: Parallel rays from infinity. Has rotation only. No falloff.

## Top Bar Interaction
- **Light Orbs**: Toggle lights on/off by clicking the orbs in the top bar.
- **Drag & Drop**: Drag a light orb from the top bar directly onto the 3D viewport to place a light on the surface at that point (Raycast placement).
- **Context Menu**: Right-click the light orbs to access quick settings or help.

## The 3-Point System
You can enable up to 3 independent light sources to sculpt the 3D form.
- **Light 1 (Key)**: The primary illumination.
- **Light 2 (Fill)**: Usually placed opposite the Key light. Use a lower intensity and a cool color.
- **Light 3 (Rim)**: Placed behind the object. Creates a glowing outline.

## Gizmos
When the panel is open or **Show 3d helpers** is enabled, lights appear as glowing sprites in the viewport.
`},"light.type":{id:"light.type",category:"Lighting",title:"Light Type (Point vs Sun)",parentId:"panel.light",content:`
### Point Light (Bulb)
Emits light from a specific point in space radiating outwards.
- **Position**: X, Y, Z coordinates define the origin.
- **Falloff**: Light gets dimmer with distance (Inverse Square Law).
- **Shadows**: Perspective shadows that grow larger/softer with distance from the object.

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

**Keyframable**: Yes. Use the diamond icon in the popup menu.

## Color
Light color interacts with the **Surface Material** color via multiplication.
- A **Red Light** on a **White Surface** looks Red.
- A **Red Light** on a **Blue Surface** looks Black (physics correct).
- **Tip**: Use saturation sparingly. Pale lights often look more realistic than deep, saturated lights.
`},"light.mode":{id:"light.mode",category:"Lighting",title:"Attachment Mode (Fixed vs World)",parentId:"panel.light",content:`
Every light can be anchored in two different coordinate spaces.

### Headlamp (Fixed)
The light is parented to the **Camera**.
- **Behavior**: If you move, the light moves with you.
- **Coordinates**: $(0,0,0)$ places the light exactly inside the camera lens.
- **Use Case**: Flashlights, exploration, ensuring the fractal is always visible while flying.

### World (Anchored)
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

### Falloff Radius
- **0.0**: **Infinite Light**. The light does not decay. It shines with equal intensity at distance $0$ and distance $1,000,000$.
- **> 0.0**: The distance at which the light intensity reaches near-zero. Higher values = smaller light sphere.

**Keyframable**: Yes. Use the diamond icon.
`},shadows:{id:"shadows",category:"Lighting",title:"Raymarched Soft Shadows",parentId:"panel.light",content:`
Shadows are essential for depth perception. Without them, it is impossible to tell if a structure is floating or attached. 
In this engine, shadows can be enabled for **All 3 Lights**.

## The Tech: SDF Shadows
We do not use Shadow Maps (rasterization) or BVH Raytracing. We march a ray from the surface *towards* the light.

## Parameters
- **Softness**: Simulates the **Size** of the light source (Area Light).
  - **Low (2-10)**: Pin-point light source. Sharp, hard shadows.
  - **High (50-128)**: Large panel light. Soft, diffuse shadows (Penumbra).
- **Intensity**: The opacity of the shadow. Lower this to simulate ambient light filling in the dark spots.
- **Bias**: **Critical Setting**.
  - Pushes the shadow start point away from the surface.
  - **Too Low**: "Shadow Acne" (Black noise/speckles on the surface).
  - **Too High**: "Peter Panning" (Shadow detaches from the object).

## Stochastic Sampling
The engine uses **Stochastic Sampling** for shadow calculation. 
- Shadows may appear noisy or grainy while the camera is moving.
- They will converge to a high-quality soft shadow instantly when the camera stops (via Temporal Accumulation).
- This technique is required for accurate shadowing on complex sponge/box fractals where traditional methods fail.
`},"light.pos":{id:"light.pos",category:"Lighting",title:"Light Positioning",parentId:"panel.light",content:`
> **REQUIRES ADVANCED MODE**

Precise coordinate control for lights. 
- **Headlamp Mode**: Coordinates are relative to the camera view.
- **World Mode**: Coordinates are absolute in the fractal universe.

**Keyframing**: Use the **Key Icon** in the top bar popup to keyframe the X, Y, and Z coordinates simultaneously.
`}},Dc={"panel.render":{id:"panel.render",category:"Rendering",title:"Shading & Materials",content:`
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
- **Anti-Aliasing**: Each bucket is allowed to accumulate samples until it is perfectly noise-free before moving to the next.
- **Export**: Can automatically save the result as a PNG when finished.

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
`},"quality.tss":{id:"quality.tss",category:"Rendering",title:"Temporal Anti-Aliasing (TSS)",parentId:"panel.quality",content:`
**Temporal Super Sampling** is the secret sauce of this engine.

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
- **Mode**:
  - **Fast**: 6 fixed samples. Good for editing.
  - **High**: Stochastic sampling. Requires TSS (Accumulation) to look good, but produces photorealistic shading.

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
- **Surface Color Scatter**: Injects the fractal's Layer 1 color field into the fog. Creates a colored volumetric haze whose tones match the fractal's gradient palette.

## Tips
- God rays accumulate over frames via Temporal Accumulation — they look best when the camera is still.
- Shadow jitter is proportional to the DE distance at each scatter sample, which softens the fractal silhouette in open sky while keeping crisp edges near the surface.
- In Direct mode, god rays work without Path Tracing enabled.
`},"dof.settings":{id:"dof.settings",category:"Rendering",title:"Depth of Field (DOF)",parentId:"panel.scene",content:`
Simulates a physical camera lens.

- **Aperture (Blur)**: Strength of the blur. 0.0 = Pinhole camera (infinite focus).
- **Focus Distance**: Distance to the sharp plane.
- **Auto-Focus**: Use the "Pick Focus" button in the Scene tab to click a point and set this value automatically.

**Note**: DOF requires **Temporal Accumulation** to look smooth. It uses stochastic jittering of the camera ray.
`},"render.reflections":{id:"render.reflections",category:"Rendering",title:"Reflections",parentId:"panel.render",content:`
Adds reflective surfaces to the fractal. Four modes available, from cheapest to most expensive:

## Reflection Methods
- **Off**: No reflections. Fastest.
- **Environment Map**: Samples the environment map at the reflection angle. Cheap, adds realism to metals. Uses Fresnel weighting.
- **Screen-Space (SSR)**: Approximates reflections using the current screen buffer. No extra DE calls. Fast but limited to visible geometry.
- **Raymarched (Quality)**: Fires actual reflection rays through the fractal. Physically accurate but adds ~9s compile time.

## Raymarched Settings
- **Max Bounces (1-3)**: Recursion depth. Each bounce adds a full raytrace pass.
- **Trace Steps**: Precision of the reflection ray (16-128).
- **Roughness Cutoff**: Surfaces rougher than this skip raymarching (performance optimization).
- **Raymarch Mix**: Blend between raymarched (1.0) and environment map (0.0) reflections.
- **Bounce Shadows**: Compute shadows on reflected surfaces. Adds ~3-4s compile time.

## Tips
- Combine with low **Roughness** (0.0-0.3) and high **Metallic** for dramatic mirror effects.
- Use Environment Map mode during editing, then switch to Raymarched for final renders.
`},"render.volumetric":{id:"render.volumetric",category:"Rendering",title:"Volumetric Scatter",parentId:"panel.render",content:`
Henyey-Greenstein single-scatter volumetric rendering. Enables god rays, colored haze, and directional fog effects.

**Note:** This is a compile-time feature. Enabling it triggers a shader recompile (~5.5s).

## Density & Shadow Rays
- **Density**: Thickness of the participating medium. Log scale — small values (0.01-0.05) produce subtle haze, higher values create thick fog.
- **Anisotropy (g)**: Direction bias for scattered light.
  - **0**: Isotropic (equal scatter in all directions).
  - **+0.9**: Forward scatter — classic god rays pointing toward light sources.
  - **-0.9**: Back scatter — halo effect around lights.
- **Light Sources**: How many lights cast shadow rays into the volume (1-3). More = more expensive.
- **Scatter Tint**: Color of the scattered light.

## Color Scatter
- **Color Scatter**: Injects the fractal's orbit trap color field into the volume. Creates a colored volumetric haze matching the gradient palette. No shadow rays needed (cheap).
- **Surface Falloff**: Concentrates the color near the fractal surface.

## Height Fog
- **Height Falloff**: Density varies with Y coordinate. Creates ground fog or rising mist.
- **Height Origin**: The Y level where fog is densest.
`},"render.waterplane":{id:"render.waterplane",category:"Rendering",title:"Water Plane",content:`
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
`}},Lc={"panel.gradient":{id:"panel.gradient",category:"Coloring",title:"Coloring Engine",content:`
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
`},"grad.mapping":{id:"grad.mapping",category:"Coloring",title:"Mapping Modes",parentId:"panel.gradient",content:`
Determines the mathematical property used to select color from the gradient.

### Geometric Mappings
- **Orbit Trap**: Uses the *minimum distance* the orbit point reached relative to the origin during iteration. Creates geometric, cellular, or techno-organic patterns inside the bulbs. Good for "solid" looking interiors.
  - **Reference:** [Wikipedia: Orbit Trap](https://en.wikipedia.org/wiki/Orbit_trap)
- **Radial**: Based on the distance of the final surface point from the center $(0,0,0)$. Creates spherical gradients and large-scale color shifts.
- **Z-Depth**: Height map based on the Z coordinate. Useful for creating landscapes or strata effects.
- **Angle**: Based on the polar angle around the Z-axis. Creates spirals and pinwheels.
- **Normal**: Based on the surface slope (Up vs Down). Adds pseudo-lighting effects or "snow on peaks" looks.

### Fractal Mappings
- **Iterations (Glow)**: Based on how many iterations it took to decide the point was "solid". Creates smooth, glowing bands outlining the shape. The classic "Electric Sheep" look.
- **Raw Iterations**: Same as Iterations but without smoothing. Shows distinct bands or steps. Useful for technical analysis or stylized "8-bit" looks.
- **Decomposition**: Analytic decomposition of the complex number angles during iteration. Creates checkered, grid-like, or circuit-board patterns. Highly sensitive to the **Escape Radius**.
- **Potential (Log-Log)**: Measures the electrical potential of the set. Creates very smooth, gradient-like bands, especially near the boundaries of the fractal. Ideal for continuous color flows.
`},"grad.escape":{id:"grad.escape",category:"Coloring",title:"Escape Radius",parentId:"panel.gradient",content:`
The distance from the origin ($R$) at which the formula considers a point to have "escaped" to infinity.

### Impact on Coloring
- **Standard**: Usually around 2.0 to 4.0.
- **Decomposition**: Requires a higher escape radius (e.g., 10.0 - 100.0) to allow the "grid" pattern to resolve fully before the calculation stops. If your decomposition pattern looks noisy or cut off, increase this value.
- **Glow**: Higher values can compress the glow bands slightly.

**Performance Note**: Higher escape radii generally mean more iterations are needed to reach the edge, which can slightly reduce performance or require increasing the **Max Iterations** count.
`},"grad.layer2":{id:"grad.layer2",category:"Coloring",title:"Layer 2 & Blending",parentId:"panel.gradient",content:`
Layer 2 adds surface complexity by overlaying a second pattern on top of the base layer.

### Blend Modes
- **Mix**: Linear interpolation. At 0.5 opacity, the result is 50% Layer 1 and 50% Layer 2.
- **Add**: Adds brightness. Useful for creating glowing veins or energy overlays.
- **Multiply**: Darkens the base color. Great for adding grime, shadows, or ambient occlusion style darkening.
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
`}},Ec={"ui.graph":{id:"ui.graph",category:"Graph",title:"Modular Graph Editor",content:`
The **Modular Formula** allows you to build your own fractal equation by chaining operations together.

## How it works
Standard formulas (like Mandelbulb) are hard-coded loops:
$z 	o z^8 + c$

The Graph allows you to insert steps:
$z 	o Rotate 	o Fold 	o Scale 	o z^8 + c$

## Node Types
- **Transform**: Rotate, Scale, Translate. Modifies the coordinate space.
- **Fold**: BoxFold, SphereFold, Abs. The core of fractal complexity. Reflects space back onto itself.
- **Logic**: Modulo (Repeat space), Conditions.
- **Combiners**: Union, Subtract. Combines shapes (Constructive Solid Geometry).

## Bindings
You can link any node parameter (like "Rotation X") to a global slider (Param A-F).
1. Click the **Link Icon** next to a node slider.
2. It cycles through Param A, B, C...
3. Now, changing Param A in the main UI will drive that specific node value. This allows you to animate complex graphs easily.
`}},Ac={"panel.scene":{id:"panel.scene",category:"UI",title:"Scene Panel",content:`
Configures the camera, navigation physics, and atmospheric optics.

## Sections
- **Camera & Navigation** (Advanced Mode Only): Movement mode, speed, and absolute coordinates.
- **Atmosphere**: Distance fog and volumetric density.
- **Optics**: Field of view and Depth of Field (blur).
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
- **WASD**: Move horizontally.
- **Space/C**: Move Up/Down.
- **Q/E**: Roll.
- **Shift**: Speed Boost (4x).
- **Best For**: Exploration, cinematic fly-throughs, and navigating inside tunnels.
`},"cam.fov":{id:"cam.fov",category:"UI",title:"Field of View (FOV)",parentId:"panel.scene",content:`
Controls the zoom angle of the camera lens (in degrees).

- **High FOV (90°+)**: "Fish-eye" look. Increases sense of speed and scale. Great for flying inside tunnels.
- **Low FOV (10°-30°)**: "Telephoto" look. Flattens depth. Great for macro photography of small details.
- **Standard (60°)**: Natural human vision balance.
`},"cam.position":{id:"cam.position",category:"UI",title:"Absolute Position",parentId:"panel.scene",content:`
> **REQUIRES ADVANCED MODE**

The raw coordinate of the camera in fractal space.

## Precision Note
Due to the "Infinite Zoom" engine, this value combines the **Offset** (the position of the universe) and the **Local Camera** (relative position).
Editing these values directly allows for precise teleportation, but be careful: large jumps may land you inside solid geometry (black screen).
`},"scene.geometry":{id:"scene.geometry",category:"UI",title:"Geometry & Transforms",parentId:"panel.scene",content:`
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

- **Aperture (Blur)**: Strength of the blur. 0.0 = Pinhole camera (infinite focus). 
  - The blur effect accumulates over time when the camera is stationary.
  - During camera movement, DOF is temporarily disabled for a stable preview.
  - Supports **High Precision** (down to $0.0001$) for macro photography.
- **Focus Distance**: Distance to the sharp plane.
- **Auto-Focus**: Use the "Pick Focus" button in the Scene tab to click a point and set this value automatically.

**Note**: DOF requires **Temporal Accumulation** to look smooth. It uses stochastic jittering of the camera ray.
`}},Nc={"effect.droste":{id:"effect.droste",category:"Effects",title:"Escher Droste (Spiral)",content:`
The Droste effect recursively maps an image inside itself, creating infinite spirals or loops. This implementation is mathematically based on M.C. Escher's "Print Gallery".

**Reference:** [Wikipedia: Droste Effect](https://en.wikipedia.org/wiki/Droste_effect)
**Artistic Origin:** [M.C. Escher: Print Gallery](https://en.wikipedia.org/wiki/Print_Gallery_(M._C._Escher))

## How it works
It transforms the screen coordinates from **Cartesian** ($x, y$) to **Log-Polar** space. 
This turns scaling (zooming) into a linear shift, allowing us to repeat the image periodically as it shrinks towards the center.

## Key Controls
- **Inner/Outer Radius**: Defines the "Ring" (Annulus) where the image lives. The ratio between these determines how fast the spiral shrinks.
- **Periodicity**: How many times the image repeats per spiral loop.
- **Strands**: Number of separate spiral arms.
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
- **Strands ($P_2$)**: The number of "arms" in the spiral.
  - **1**: Single continuous tunnel.
  - **2**: Double helix structure.
- **Auto Period**: Mathematically calculates the perfect Periodicity based on the Radius ratio ($r_2/r_1$) to prevent distortion. Recommended to keep this **ON** unless you want artistic stretching.
- **Mirror Strand**: Alters the rotation logic to align strands seamlessly when using Mirror Tiling.
`},"droste.transform":{id:"droste.transform",category:"Effects",title:"Transform & Distortion",parentId:"effect.droste",content:`
- **Zoom**: Moves the camera *into* the spiral. Because the spiral is infinite, zooming eventually brings you back to the start (just deeper).
- **Rotate**: Standard 2D rotation of the whole frame.
- **Twist**: The core "Escher" switch.
  - **On**: Log-Polar mapping (Spiral).
  - **Off**: Standard Log mapping (Tunnel/Grid).
- **Hyper Droste**: Applies a complex sine function, turning the spiral into a Fractal-like shape.
- **Fractal Points**: When Hyper Droste is on, determines the number of branches/tips in the fractal structure.
`}},Bc={"panel.audio":{id:"panel.audio",category:"Audio",title:"Audio Engine",content:`
The Audio Engine analyzes sound frequencies in real-time to drive fractal parameters, allowing the visual to react to music or voice.

## How it works
1. **Source**: Select an audio input (Microphone, System Audio, or File).
2. **Spectrum**: The engine breaks the sound into frequencies (Bass on left, Treble on right).
3. **Links**: You create "Links" that map a specific frequency range (e.g., the kick drum) to a specific parameter (e.g., Scale).

## Performance
The audio analysis runs on a separate thread context (WebAudio API) and is very lightweight. However, modulating complex geometry parameters (like Loop Iterations) every frame can impact GPU performance.
`},"audio.sources":{id:"audio.sources",category:"Audio",title:"Input Sources",parentId:"panel.audio",content:`
Select where the audio data comes from.

- **Microphone**: Uses your default recording device. Great for voice reactivity or ambient room noise.
- **Desktop (System Audio)**: Captures audio from other tabs or applications. 
  - *Note*: When the browser dialog appears, you must check the **"Share System Audio"** box, otherwise only video is shared.
- **Load File**: Plays a local audio file (MP3/WAV) in a loop.
`},"audio.links":{id:"audio.links",category:"Audio",title:"Modulation Links",parentId:"panel.audio",content:`
A **Link** connects a slice of the audio spectrum to a fractal parameter.

## Frequency Selection
Drag the **box** on the spectrum view to define the frequency range.
- **Left (Bass)**: Kick drums, basslines.
- **Middle (Mids)**: Vocals, synths, guitars.
- **Right (Treble)**: Hi-hats, cymbals, air.

## Dynamics (Knobs)
- **Threshold (Gate)**: Drag the top/bottom edges of the box. Signals below the bottom edge are ignored (noise gate). Signals above the top edge are clamped (ceiling).
- **Gain**: Multiplies the output signal. Use this if the reaction is too subtle.
- **Attack**: How fast the value rises when a sound hits. Low = Snappy, High = Smooth.
- **Decay**: How fast the value falls after the sound stops. High decay creates a "trailing" effect.
- **Offset**: Adds a base value to the parameter, so it doesn't drop to zero when silent.
`}},Oc={...jc,...Pc,...Tc,...Rc,...Ic,...Fc,..._c,...Dc,...Lc,...Ec,...Ac,...Nc,...Bc},Lr=({x:e,y:o,items:a,targetHelpIds:r,onClose:n,onOpenHelp:s,isSubmenu:i})=>{const l=S.useRef(null),[c,d]=S.useState({x:e,y:o,opacity:0}),[u,f]=S.useState(null),p=S.useRef(null);S.useLayoutEffect(()=>{if(!l.current)return;const y=l.current.getBoundingClientRect(),b=window.innerWidth,g=window.innerHeight,h=8;let v=e,z=o;i?v+y.width>b-h&&(v=e-y.width-200,v=b-y.width-h):v+y.width>b-h&&(v=e-y.width),z+y.height>g-h&&(z=Math.max(h,g-y.height-h)),v=Math.max(h,Math.min(v,b-y.width-h)),z=Math.max(h,Math.min(z,g-y.height-h)),d({x:v,y:z,opacity:1})},[e,o,a,r,i]),S.useEffect(()=>{if(i)return;const y=g=>{g.target.closest(".fractal-context-menu")||n()},b=setTimeout(()=>window.addEventListener("mousedown",y),50);return()=>{clearTimeout(b),window.removeEventListener("mousedown",y)}},[n,i]);const m=r.map(y=>Oc[y]).filter(y=>!!y),x=(y,b)=>{if(p.current&&clearTimeout(p.current),y.children){const g=b.currentTarget.getBoundingClientRect();f({items:y.children,x:g.right,y:g.top})}else f(null)},C=t.jsxs("div",{ref:l,className:"fractal-context-menu fixed z-[9999] bg-[#1a1a1a] border border-white/20 rounded shadow-[0_4px_20px_rgba(0,0,0,0.8)] py-1 min-w-[200px] animate-fade-in [&_.animate-slider-entry]:!animate-none",style:{left:c.x,top:c.y,opacity:c.opacity},onContextMenu:y=>y.preventDefault(),children:[a.map((y,b)=>{var g;return y.element?t.jsx("div",{children:y.element},b):y.isHeader?t.jsx("div",{className:"px-4 py-1 text-[9px] text-gray-500 font-bold border-b border-white/10 mt-1 mb-1 bg-white/5",children:y.label},b):y.type==="slider"?t.jsx("div",{className:"px-3 py-1 mb-1",children:t.jsx(de,{label:y.label||"",value:y.value??0,min:y.min??0,max:y.max??1,step:y.step??.01,onChange:h=>y.onChange&&y.onChange(h),highlight:!0,overrideInputText:(g=y.value)==null?void 0:g.toFixed(2)})},b):t.jsxs("button",{onClick:()=>{!y.disabled&&!y.children&&y.action&&(y.action(),y.keepOpen||n())},onMouseEnter:h=>x(y,h),disabled:y.disabled,className:`w-full text-left px-4 py-2 text-xs flex items-center justify-between transition-colors group relative ${y.disabled?"text-gray-600 cursor-not-allowed opacity-50":y.danger?"text-red-400 hover:bg-red-900/30 hover:text-red-300":"text-gray-300 hover:bg-white/10 hover:text-white"}`,children:[t.jsxs("div",{className:"flex items-center gap-2",children:[y.icon&&t.jsx("span",{className:y.disabled?"text-gray-600":"text-gray-500",children:y.icon}),t.jsx("span",{className:y.checked?"text-cyan-400 font-bold":"",children:y.label})]}),y.checked&&t.jsx(pt,{}),y.children&&t.jsx(ta,{})]},b)}),a.length>0&&m.length>0&&t.jsx("div",{className:"h-px bg-white/10 my-1"}),m.length>0&&t.jsxs(t.Fragment,{children:[t.jsxs("div",{className:"px-4 py-1 text-[9px] text-cyan-700 font-bold mb-1 flex items-center gap-2",children:[t.jsx(br,{})," Context Help"]}),m.map((y,b)=>t.jsxs("button",{onClick:()=>{s(y.id),n()},className:`w-full text-left px-4 py-1.5 text-xs transition-colors flex items-center gap-2 group ${b===0?"text-cyan-400 hover:bg-cyan-900/30 hover:text-cyan-200 font-bold":"text-gray-400 hover:bg-white/5 hover:text-white"}`,style:{paddingLeft:`${16+b*8}px`},children:[b>0&&t.jsx("span",{className:"opacity-30 text-[8px]",children:"└"}),t.jsx("span",{children:y.title}),b===0&&t.jsx("span",{className:"ml-auto opacity-0 group-hover:opacity-100 transition-opacity",children:t.jsx(Ns,{})})]},y.id))]}),u&&t.jsx(Lr,{x:u.x,y:u.y,items:u.items,targetHelpIds:[],onClose:n,onOpenHelp:s,isSubmenu:!0})]});return i?C:jt.createPortal(C,document.body)},Ta=300,Vo=60,$c=38,Hc=()=>{const[e,o]=S.useState(null),a=S.useRef({x:0,y:0}),r=E(),n=r.coreMath,{formula:s,setCoreMath:i}=r;if(!n)return null;const l={1:{key:"paramA",setter:d=>i({paramA:d}),val:n.paramA},2:{key:"paramB",setter:d=>i({paramB:d}),val:n.paramB},3:{key:"paramC",setter:d=>i({paramC:d}),val:n.paramC},4:{key:"paramD",setter:d=>i({paramD:d}),val:n.paramD},5:{key:"paramE",setter:d=>i({paramE:d}),val:n.paramE},6:{key:"paramF",setter:d=>i({paramF:d}),val:n.paramF}};if(S.useEffect(()=>{const d=p=>{a.current={x:p.clientX,y:p.clientY}},u=p=>{if(p.target.tagName==="INPUT"||p.target.tagName==="TEXTAREA")return;const m=p.key,x=l[m];if(x&&!e){const C=ge.get(s),y=parseInt(m)-1;let b=C==null?void 0:C.parameters[y];if(s==="Modular"&&(b={label:`Param ${String.fromCharCode(65+y)}`,id:x.key,min:-5,max:5,step:.01,default:0}),b){const g=b.max-b.min,h=(x.val-b.min)/g,v=Ta-24,z=12+h*v;let M=a.current.x-z,w=a.current.y-$c;M=Math.max(10,Math.min(window.innerWidth-Ta-10,M)),w=Math.max(10,Math.min(window.innerHeight-Vo-10,w)),o({id:parseInt(m),paramKey:x.key,label:b.label,def:{min:b.min,max:b.max,step:b.step},x:M,y:w})}}},f=p=>{e&&p.key===String(e.id)&&o(null)};return window.addEventListener("mousemove",d),window.addEventListener("keydown",u),window.addEventListener("keyup",f),()=>{window.removeEventListener("mousemove",d),window.removeEventListener("keydown",u),window.removeEventListener("keyup",f)}},[e,s,n]),!e)return null;const c=l[String(e.id)];return t.jsxs("div",{className:"fixed z-[9999] bg-black/80 backdrop-blur-xl border border-cyan-500/50 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col justify-center px-3 animate-pop-in",style:{left:e.x,top:e.y,width:Ta,height:Vo},children:[t.jsxs("div",{className:"absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-cyan-900 rounded text-[9px] font-bold text-cyan-200 border border-cyan-700 shadow-sm",children:["Quick Edit (",e.id,")"]}),t.jsx(de,{label:e.label,value:c.val,min:e.def.min,max:e.def.max,step:e.def.step,onChange:c.setter,highlight:!0,trackId:e.paramKey})]})},Gc=()=>{const e=S.useRef(!1);return S.useEffect(()=>{e.current||(e.current=!0,ue().setWorkerModePending(),Es())},[]),null},Xt=ue(),Vc=()=>typeof window>"u"?!1:window.matchMedia("(pointer: coarse)").matches||window.innerWidth<768,Uc=e=>{const o=E(),[a,r]=S.useState("default"),n=S.useRef(!1),s=S.useCallback(i=>{if(!(!i&&(Xt.isBooted||n.current))){n.current=!0;try{setTimeout(()=>{var x;const l=E.getState(),c=gr(l),d=l.cameraPos||{x:0,y:0,z:3},u=l.cameraRot||{x:0,y:0,z:0,w:1},f=((x=l.optics)==null?void 0:x.camFov)??60,p={position:[d.x,d.y,d.z],quaternion:[u.x,u.y,u.z,u.w],fov:f};Xt.bootWithConfig(c,p);const m=l.sceneOffset;if(m){const C={x:m.x,y:m.y,z:m.z,xL:m.xL??0,yL:m.yL??0,zL:m.zL??0};Xt.setShadowOffset(C),Xt.post({type:"OFFSET_SET",offset:C})}},50)}catch(l){console.error("Critical Engine Boot Failure:",l),n.current=!1}}},[]);return S.useEffect(()=>{const i=window.location.hash;let l=null;if(i&&i.startsWith("#s=")){const c=i.slice(3);l=hr(c),l&&r("url")}if(!l){const c=ge.get("Mandelbulb");c&&c.defaultPreset&&(l=JSON.parse(JSON.stringify(c.defaultPreset)))}if(l&&Vc()){l.features||(l.features={});const c=da.lite;Object.entries(c).forEach(([d,u])=>{l.features[d]||(l.features[d]={}),Object.assign(l.features[d],u)})}l&&o.loadPreset(l)},[]),{startupMode:a,bootEngine:s}},Er=({activeTab:e,state:o,actions:a,onSwitchTab:r})=>{if(e==="Graph"){const i=he.get("panel-graph");if(i)return t.jsx("div",{className:"h-[600px] -m-4",children:t.jsx(i,{state:o,actions:a})})}if(e==="Camera Manager"){const i=he.get("panel-cameramanager");if(i)return t.jsx(i,{state:o,actions:a})}if(e==="Engine"){const i=he.get("panel-engine");if(i)return t.jsx(i,{state:o,actions:a})}const s=ie.getTabs().find(i=>i.label===e);if(s){const i=he.get(s.componentId);if(i){const l=s.id,c=o[l];return t.jsx(i,{state:o,actions:a,onSwitchTab:r,featureId:l,sliceState:c})}}return t.jsx("div",{className:"flex h-full items-center justify-center text-gray-600 text-xs italic",children:"Select a module"})},Wc=()=>typeof window>"u"?!1:window.matchMedia("(pointer: coarse)").matches||window.innerWidth<768,Uo=({side:e})=>{const{panels:o,activeLeftTab:a,activeRightTab:r,togglePanel:n,movePanel:s,reorderPanel:i,startPanelDrag:l,endPanelDrag:c,draggingPanelId:d,setDockSize:u,isLeftDockCollapsed:f,isRightDockCollapsed:p,setDockCollapsed:m,openContextMenu:x,leftDockSize:C,rightDockSize:y,formula:b,advancedMode:g}=E(),h=Wc(),v=E.getState().audio,z=E.getState().drawing,M=e==="left"?a:r,w=e==="left"?f:p,j=e==="left"?C:y,k=Object.values(o).filter(N=>{let R=N.location;return h&&(N.id==="Engine"||N.id==="Camera Manager")&&(R="right"),!(R!==e||N.id==="Graph"&&b!=="Modular"||N.id==="Light"&&!g||N.id==="Audio"&&!(v!=null&&v.isEnabled)||N.id==="Drawing"&&!(z!=null&&z.enabled))}).sort((N,R)=>N.order-R.order),P=S.useRef(null),I=N=>{N.preventDefault(),P.current={startX:N.clientX,startW:j},window.addEventListener("mousemove",_),window.addEventListener("mouseup",F),document.body.style.cursor="ew-resize"},_=N=>{if(!P.current)return;const R=N.clientX-P.current.startX,X=e==="left"?R:-R,L=Math.max(200,Math.min(800,P.current.startW+X));u(e,L)},F=()=>{P.current=null,window.removeEventListener("mousemove",_),window.removeEventListener("mouseup",F),document.body.style.cursor=""},A=(N,R)=>{N.preventDefault();const X=Ee(N.currentTarget);x(N.clientX,N.clientY,[],X)};return k.length===0?null:w?t.jsxs("div",{className:`flex flex-col w-8 bg-black border-${e==="left"?"r":"l"} border-white/10 z-40 shrink-0`,children:[t.jsx("button",{onClick:()=>m(e,!1),className:"h-10 flex items-center justify-center text-gray-500 hover:text-white",children:e==="left"?t.jsx(ta,{}):t.jsx(bo,{})}),t.jsx("div",{className:"flex-1 flex flex-col items-center py-2 gap-2",children:k.map(N=>t.jsx("div",{onClick:()=>n(N.id,!0),className:`w-6 h-6 flex items-center justify-center rounded cursor-pointer ${N.id===M?"bg-cyan-900 text-cyan-400":"text-gray-600 hover:bg-white/10"}`,title:N.id,children:t.jsx("span",{className:"text-[10px] font-bold",children:N.id.charAt(0)})},N.id))})]}):t.jsxs("div",{className:`flex flex-col bg-[#080808] border-${e==="left"?"r":"l"} border-white/10 z-40 shrink-0 transition-all duration-75 relative`,style:{width:j},children:[t.jsx("div",{className:"flex flex-wrap gap-0.5 px-0.5 pt-1 bg-black/40 border-b border-white/10 shrink-0 relative items-end",children:k.map(N=>{const R=N.id===M;return t.jsxs("button",{onClick:()=>n(N.id,!0),onContextMenu:X=>A(X,N.id),onMouseEnter:()=>{if(d&&d!==N.id){const X=o[d];X&&X.location===e&&i(d,N.id)}},onMouseUp:X=>{d&&(X.stopPropagation(),c())},className:`flex items-center gap-0.5 px-1 py-1 text-[9px] font-bold transition-colors group relative rounded-t-sm
                                ${R?"bg-[#080808] text-cyan-400 border-x border-t border-white/10 z-10 -mb-px pb-2":"text-gray-500 hover:bg-white/5 hover:text-gray-300 border border-transparent"}`,children:[!h&&t.jsx("div",{className:`cursor-move ${R?"text-gray-600 group-hover:text-cyan-600":"text-gray-700 group-hover:text-white"} transition-colors`,onMouseDown:X=>{X.stopPropagation(),l(N.id)},children:t.jsx("div",{className:"transform scale-75 origin-center",children:t.jsx(xr,{})})}),t.jsx("span",{className:"truncate max-w-[140px]",children:N.id})]},N.id)})}),t.jsx("button",{onClick:()=>m(e,!0),className:"absolute top-1 right-1 p-1 text-gray-600 hover:text-white z-20",children:e==="left"?t.jsx(bo,{}):t.jsx(ta,{})}),t.jsx("div",{className:"flex-1 overflow-y-auto custom-scroll p-4 relative",children:M?t.jsx(Er,{activeTab:M,state:E.getState(),actions:E.getState(),onSwitchTab:n}):t.jsx("div",{className:"flex h-full items-center justify-center text-gray-700 text-xs italic",children:"Select a panel"})}),t.jsx("div",{className:`absolute top-0 bottom-0 w-1 cursor-ew-resize hover:bg-cyan-500/50 transition-colors z-50 ${e==="left"?"right-[-2px]":"left-[-2px]"}`,onMouseDown:I})]})},qc=()=>{const{draggingPanelId:e,movePanel:o,endPanelDrag:a,cancelPanelDrag:r,panels:n,leftDockSize:s,rightDockSize:i,isLeftDockCollapsed:l,isRightDockCollapsed:c}=E();if(S.useEffect(()=>{if(!e)return;const x=()=>{r()};return window.addEventListener("mouseup",x),()=>window.removeEventListener("mouseup",x)},[e,r]),!e)return null;const d=n[e],u=d?d.location:null,f=(x,C)=>{x.stopPropagation(),o(e,C),a()},p=l?32:s,m=c?32:i;return t.jsxs("div",{className:"fixed inset-0 z-[1000] flex pointer-events-none",children:[t.jsx("div",{style:{width:p},className:`h-full flex items-center justify-center transition-all duration-200 border-r-2
                    ${u!=="left"?"bg-cyan-900/40 border-cyan-500/50 pointer-events-auto cursor-copy":"border-transparent pointer-events-none"}`,onMouseUp:x=>{u!=="left"&&f(x,"left")},children:u!=="left"&&t.jsx("div",{className:"bg-black/80 px-4 py-2 rounded border border-cyan-500/50 text-cyan-200 font-bold text-sm shadow-xl backdrop-blur-md",children:"Dock Left"})}),t.jsx("div",{className:`flex-1 h-full flex items-center justify-center transition-all duration-200
                    ${u!=="float"?"bg-purple-900/20 hover:bg-purple-900/30 border-x-2 border-purple-500/30 pointer-events-auto cursor-copy":"pointer-events-none"}`,onMouseUp:x=>{u!=="float"&&f(x,"float")},children:u!=="float"&&t.jsx("div",{className:"bg-black/80 px-4 py-2 rounded border border-purple-500/50 text-purple-200 font-bold text-sm shadow-xl backdrop-blur-md",children:"Float Window"})}),t.jsx("div",{style:{width:m},className:`h-full flex items-center justify-center transition-all duration-200 border-l-2
                    ${u!=="right"?"bg-cyan-900/40 border-cyan-500/50 pointer-events-auto cursor-copy":"border-transparent pointer-events-none"}`,onMouseUp:x=>{u!=="right"&&f(x,"right")},children:u!=="right"&&t.jsx("div",{className:"bg-black/80 px-4 py-2 rounded border border-cyan-500/50 text-cyan-200 font-bold text-sm shadow-xl backdrop-blur-md",children:"Dock Right"})})]})},Xc=({id:e,title:o,children:a,position:r,onPositionChange:n,size:s,onSizeChange:i,onClose:l,disableClose:c,zIndex:d,initialPos:u,initialSize:f})=>{const{panels:p,setFloatPosition:m,setFloatSize:x,togglePanel:C,startPanelDrag:y}=E(),b=!!e,g=e?p[e]:null,[h,v]=S.useState(u||{x:100,y:100}),[z,M]=S.useState(f||{width:300,height:200}),w=b?(g==null?void 0:g.floatPos)||{x:100,y:100}:r||h,j=b?(g==null?void 0:g.floatSize)||{width:320,height:400}:s||z,k=S.useRef(w),P=S.useRef(j),I=S.useRef(null),_=S.useRef(null);if(S.useEffect(()=>{k.current=w},[w.x,w.y]),S.useEffect(()=>{P.current=j},[j.width,j.height]),b&&(!g||!g.isOpen||g.location!=="float"))return null;const F=o||(g?g.id:"Window"),A=d||(b?100:200),N=()=>{if(l)l();else if(b&&e){const $=E.getState();e==="Audio"?$.setAudio({isEnabled:!1}):e==="Drawing"?$.setDrawing({enabled:!1}):e==="Engine"&&$.setEngineSettings({showEngineTab:!1}),C(e,!1)}},R=L=>{if(L.target.closest("button"))return;L.preventDefault(),I.current={x:L.clientX,y:L.clientY,startX:k.current.x,startY:k.current.y};const $=H=>{if(!I.current)return;const G=H.clientX-I.current.x,D=H.clientY-I.current.y,T={x:I.current.startX+G,y:I.current.startY+D};n?n(T):b&&e?m(e,T.x,T.y):v(T),k.current=T},q=()=>{I.current=null,window.removeEventListener("mousemove",$),window.removeEventListener("mouseup",q)};window.addEventListener("mousemove",$),window.addEventListener("mouseup",q)},X=L=>{L.preventDefault(),L.stopPropagation(),_.current={x:L.clientX,y:L.clientY,startW:P.current.width,startH:P.current.height};const $=H=>{if(!_.current)return;const G=H.clientX-_.current.x,D=H.clientY-_.current.y,T={width:Math.max(200,_.current.startW+G),height:Math.max(150,_.current.startH+D)};i?i(T):b&&e?x(e,T.width,T.height):M(T),P.current=T},q=()=>{_.current=null,window.removeEventListener("mousemove",$),window.removeEventListener("mouseup",q)};window.addEventListener("mousemove",$),window.addEventListener("mouseup",q)};return jt.createPortal(t.jsxs("div",{className:"fixed glass-panel flex flex-col overflow-hidden animate-pop-in shadow-[0_10px_40px_rgba(0,0,0,0.5)]",style:{left:w.x,top:w.y,width:j.width,height:j.height,maxHeight:"90vh",zIndex:A},children:[t.jsxs("div",{onMouseDown:R,className:"panel-header cursor-move flex items-center justify-between px-2 py-1.5 bg-gray-800/90 border-b border-white/10",children:[t.jsxs("div",{className:"flex items-center gap-2",children:[b&&t.jsx("div",{className:"cursor-grab text-gray-500 hover:text-white",onMouseDown:L=>{L.stopPropagation(),e&&y(e)},children:t.jsx(xr,{})}),t.jsx("span",{className:"t-label text-gray-200",children:F})]}),!c&&(l||b&&!(g!=null&&g.isCore))&&t.jsx("button",{onClick:N,className:"icon-btn",title:"Close",children:t.jsx(qa,{})})]}),t.jsx("div",{className:"p-3 overflow-y-auto overflow-x-hidden custom-scroll flex-1 relative bg-black/80 backdrop-blur-md",children:a}),t.jsx("div",{onMouseDown:X,className:"absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-20 touch-none text-gray-500",children:t.jsx(Os,{})})]}),document.body)},Yc=ze.lazy(()=>ht(()=>import("./Timeline-DOFveBWt.js"),__vite__mapDeps([5,1,2,6,3,4]),import.meta.url)),Zc=ze.lazy(()=>ht(()=>import("./HelpBrowser-BgaAjYMk.js"),__vite__mapDeps([7,1,2,3,4]),import.meta.url)),Qc=ze.lazy(()=>ht(()=>import("./FormulaWorkshop-BdLIqU7H.js"),__vite__mapDeps([8,1,2,3,4]),import.meta.url).then(e=>({default:e.FormulaWorkshop}))),Kc=()=>{const e=E(),[o,a]=S.useState(!1),[r,n]=S.useState(!0),[s,i]=S.useState(!1),l=S.useRef(null),c=S.useRef(null),d=S.useRef(null),u=S.useRef(null),f=S.useRef(null),p=S.useRef(null),m=S.useMemo(()=>({container:c,speed:d,dist:u,reset:f,reticle:p}),[]),{startupMode:x,bootEngine:C}=Uc(),{isMobile:y,isPortrait:b}=Za();Ol(s,i),kc();const g=y||e.debugMobileLayout,h=e.quality,v=(h==null?void 0:h.precisionMode)===1,z=g&&e.cameraMode==="Fly",M=e.isBroadcastMode,w=e.interactionMode!=="none",j=F=>{F.preventDefault(),F.stopPropagation(),e.openContextMenu(F.clientX,F.clientY,[],["ui.timeline"])},k=()=>{const F=v?"balanced":"lite";Z.emit("is_compiling",`Switching to ${F} mode...`);const A=e.applyPreset;A&&A({mode:F,actions:e})},P=()=>{n(!1)},I=g&&!M?"min-h-[120vh] bg-black":"fixed inset-0 w-full h-full bg-black select-none overflow-hidden flex flex-col",_=Object.values(e.panels).filter(F=>F.location==="float"&&F.isOpen);return t.jsxs("div",{className:I,children:[t.jsx(Gc,{}),t.jsx(qc,{}),_.map(F=>t.jsx(Xc,{id:F.id,title:F.id,children:t.jsx(Er,{activeTab:F.id,state:e,actions:e,onSwitchTab:A=>e.togglePanel(A,!0)})},F.id)),g&&!M&&t.jsxs("div",{className:"w-full bg-[#080808] border-b border-white/10 p-8 pb-12 flex flex-col items-center text-center gap-3",children:[t.jsx("div",{className:"w-12 h-1 bg-gray-800 rounded-full mb-2"}),v?t.jsxs(t.Fragment,{children:[t.jsxs("div",{className:"flex items-center gap-2 text-amber-500 mb-1",children:[t.jsx(Tt,{}),t.jsx("span",{className:"text-xs font-bold",children:"Lite Render Mode"})]}),t.jsxs("p",{className:"text-[10px] text-gray-400 leading-relaxed max-w-[320px]",children:["Running lightweight engine.",t.jsx("br",{})]})]}):t.jsx(t.Fragment,{children:t.jsx("div",{className:"flex items-center gap-2 text-cyan-500 mb-1",children:t.jsx("span",{className:"text-xs font-bold",children:"High Quality Mode"})})}),t.jsx("button",{onClick:k,className:"mt-2 px-3 py-1.5 text-[9px] font-bold rounded border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10",children:v?"Switch to High Quality":"Switch to Lite Mode"})]}),t.jsxs("div",{ref:l,className:`relative bg-black select-none ${w?"cursor-crosshair":""} flex flex-col ${g&&!M?"h-[100vh] sticky top-0 overflow-hidden shadow-2xl":"w-full h-full"}`,onContextMenu:F=>F.preventDefault(),children:[t.jsx(Bl,{isReady:o,onFinished:P,startupMode:x,bootEngine:C}),g&&b&&!r&&!M&&t.jsxs("div",{className:"fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-10 text-center text-white",children:[t.jsx("div",{className:"text-cyan-400 mb-6 animate-bounce",children:t.jsx(Us,{})}),t.jsx("h2",{className:"text-2xl font-bold tracking-tight mb-2",children:"Landscape Recommended"}),t.jsx("p",{className:"text-gray-500 text-sm font-mono",children:"Rotate device to access controls."})]}),!M&&t.jsx(Ll,{}),t.jsxs("div",{className:"flex-1 flex overflow-hidden relative",children:[e.workshopOpen?t.jsx(S.Suspense,{fallback:null,children:t.jsx(Qc,{onClose:e.closeWorkshop,editFormula:e.workshopEditFormula})}):!M&&!g&&t.jsx(Uo,{side:"left"}),t.jsx(Cc,{hudRefs:m,onSceneReady:()=>a(!0)}),!M&&t.jsx(Uo,{side:"right"})]}),!M&&t.jsx(El,{}),!M&&t.jsx(Hc,{}),e.contextMenu.visible&&!M&&t.jsx(Lr,{x:e.contextMenu.x,y:e.contextMenu.y,items:e.contextMenu.items,targetHelpIds:e.contextMenu.targetHelpIds,onClose:e.closeContextMenu,onOpenHelp:e.openHelp}),e.helpWindow.visible&&t.jsx(S.Suspense,{fallback:null,children:t.jsx(Zc,{activeTopicId:e.helpWindow.activeTopicId,onClose:e.closeHelp,onNavigate:e.openHelp})}),!s&&!z&&!M&&t.jsx("div",{className:"fixed bottom-4 left-4 z-50 flex gap-2 transition-all duration-500",children:t.jsx("button",{onClick:()=>i(!0),onContextMenu:j,className:"p-2 rounded-full border shadow-lg transition-all bg-gray-800 border-gray-600 text-gray-400 hover:text-white",title:"Open Timeline (T)",children:t.jsx(el,{})})}),s&&!M&&t.jsx(S.Suspense,{fallback:null,children:t.jsx(Yc,{onClose:()=>i(!1)})})]})]})},sa=({label:e,active:o,variant:a="primary",size:r="default",icon:n,fullWidth:s,className:i,children:l,onClick:c,...d})=>{const u=E(x=>x.openContextMenu),f=x=>{const C=Ee(x.currentTarget);C.length>0&&(x.preventDefault(),x.stopPropagation(),u(x.clientX,x.clientY,[],C))};let p="bg-cyan-900 text-cyan-200 border-cyan-700 shadow-inner";a==="danger"&&(p="bg-red-900 text-red-200 border-red-700 shadow-inner"),a==="success"&&(p="bg-green-900 text-green-200 border-green-700 shadow-inner"),a==="warning"&&(p="bg-amber-900 text-amber-200 border-amber-700 shadow-inner");const m=r==="small"?"t-btn-sm":"t-btn";return t.jsxs("button",{className:`${m} ${o?p:"t-btn-default"} ${s?"w-full":"flex-1"} ${i||""}`,onClick:c,onContextMenu:f,...d,children:[n,e||l]})},Jc=({label:e,icon:o,rightContent:a,className:r=""})=>t.jsxs("div",{className:`flex items-center justify-between px-3 py-2 bg-black/40 border-b border-white/5 ${r}`,children:[t.jsxs("div",{className:"flex items-center gap-2",children:[o,t.jsx("span",{className:"text-[10px] font-bold text-gray-300",children:e})]}),a&&t.jsx("div",{className:"flex items-center gap-2",children:a})]}),Ra=ue(),ed=({className:e="-m-3"})=>{const{drawing:o,setDrawing:a,removeDrawnShape:r,clearDrawnShapes:n,updateDrawnShape:s}=E(),{active:i,activeTool:l,originMode:c,color:d,showLabels:u,showAxes:f,shapes:p,refreshTrigger:m}=o,[x,C]=S.useState(Ra.lastMeasuredDistance);S.useEffect(()=>{let g;return i&&c===1&&(g=window.setInterval(()=>{const h=Ra.lastMeasuredDistance;Math.abs(h-x)>1e-4&&C(h)},200)),()=>clearInterval(g)},[i,c,x]);const y=()=>{a({active:!i})},b=()=>{a({refreshTrigger:(m||0)+1}),C(Ra.lastMeasuredDistance)};return t.jsxs("div",{className:`flex flex-col h-full select-none ${e}`,"data-help-id":"panel.drawing",children:[t.jsxs("div",{className:"p-3 bg-black/40 border-b border-white/5",children:[t.jsx(Jc,{label:"Measurement Tools",icon:t.jsx("span",{className:"w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_5px_cyan]"})}),t.jsx("div",{className:"flex gap-2 mb-2",children:t.jsx(sa,{onClick:y,active:i,variant:i?"success":"primary",className:"flex-1 py-3 text-xs shadow-lg",icon:i?t.jsx(pt,{}):t.jsx(Mr,{}),children:i?"DRAWING ACTIVE":"START DRAWING"})}),t.jsxs("div",{className:"flex bg-gray-800/50 rounded p-1 mb-3",children:[t.jsxs("button",{onClick:()=>a({activeTool:"rect"}),className:`flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-[9px] font-bold transition-colors ${l==="rect"?"bg-cyan-900 text-cyan-200 shadow-sm":"text-gray-500 hover:text-white"}`,title:"Rectangle",children:[t.jsx(qs,{})," RECT"]}),t.jsxs("button",{onClick:()=>a({activeTool:"circle"}),className:`flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-[9px] font-bold transition-colors ${l==="circle"?"bg-cyan-900 text-cyan-200 shadow-sm":"text-gray-500 hover:text-white"}`,title:"Circle / Ellipse",children:[t.jsx(Xs,{})," CIRCLE"]})]}),t.jsxs("div",{className:"flex items-center justify-between mb-1",children:[t.jsx(Me,{variant:"secondary",children:"Default Color"}),t.jsx(ra,{color:"#"+d.getHexString(),onChange:g=>a({color:new Oe(g)}),label:""})]}),i&&t.jsxs("div",{className:"mt-2 px-2 py-1.5 bg-cyan-900/20 border border-cyan-500/20 rounded flex flex-col items-center gap-1 text-[9px] text-cyan-200 animate-fade-in text-center font-mono",children:[t.jsxs("div",{children:["Hold ",t.jsx("strong",{children:"X"})," to snap to World Axis"]}),t.jsxs("div",{children:["Hold ",t.jsx("strong",{children:"SHIFT"})," for 1:1 Ratio"]}),t.jsxs("div",{children:["Hold ",t.jsx("strong",{children:"ALT"})," for Center Draw"]}),t.jsxs("div",{children:["Hold ",t.jsx("strong",{children:"SPACE"})," to Move"]})]})]}),t.jsxs("div",{className:"p-3 border-b border-white/5 space-y-3 bg-white/[0.02]",children:[t.jsxs("div",{className:"space-y-1",children:[t.jsx(Me,{variant:"secondary",children:"Drawing Plane Origin"}),t.jsx(Le,{value:c,onChange:g=>a({originMode:g}),options:[{label:"Global Zero",value:0},{label:"Surface Probe",value:1}]}),c===1&&t.jsxs("div",{className:"flex items-center justify-between bg-black/40 rounded border border-white/10 p-1.5 mt-1 animate-fade-in",children:[t.jsxs("span",{className:"text-[9px] text-gray-400 font-mono pl-1",children:["Depth: ",t.jsx("span",{className:"text-cyan-400 font-bold",children:x.toFixed(4)})]}),t.jsx("button",{onClick:b,className:"px-2 py-0.5 bg-gray-800 hover:bg-white/10 text-gray-300 text-[9px] font-bold rounded border border-white/5 hover:border-white/20 transition-all",title:"Update axis position to current probe location",children:"Refresh Axis"})]})]}),t.jsxs("div",{className:"grid grid-cols-2 gap-2 pt-1",children:[t.jsxs("label",{className:"flex items-center gap-2 cursor-pointer group",children:[t.jsx("div",{className:`w-3 h-3 border rounded transition-colors ${u?"bg-cyan-500 border-cyan-500":"border-gray-600 bg-transparent"}`}),t.jsx("input",{type:"checkbox",className:"hidden",checked:u,onChange:g=>a({showLabels:g.target.checked})}),t.jsx("span",{className:"text-[10px] font-bold text-gray-400 group-hover:text-white transition-colors",children:"Show Labels"})]}),t.jsxs("label",{className:"flex items-center gap-2 cursor-pointer group",children:[t.jsx("div",{className:`w-3 h-3 border rounded transition-colors ${f?"bg-cyan-500 border-cyan-500":"border-gray-600 bg-transparent"}`}),t.jsx("input",{type:"checkbox",className:"hidden",checked:f,onChange:g=>a({showAxes:g.target.checked})}),t.jsx("span",{className:"text-[10px] font-bold text-gray-400 group-hover:text-white transition-colors",children:"Show Axes"})]})]})]}),t.jsx("div",{className:"flex-1 overflow-y-auto custom-scroll p-3 bg-black/20",children:t.jsx(Bt,{label:"Measurement List",count:(p||[]).length,defaultOpen:!0,rightContent:(p||[]).length>0?t.jsx("button",{onClick:()=>n(),className:"text-[9px] text-red-500 hover:text-red-300 font-bold transition-colors px-2 py-0.5",children:"Clear"}):void 0,children:(p||[]).length===0?t.jsx("div",{className:"text-center py-4 text-[10px] text-gray-600 italic",children:"No measurements drawn."}):t.jsx("div",{className:"space-y-1 animate-fade-in",children:(p||[]).map((g,h)=>{var z;const v=g.type==="rect"&&(g.size.z||0)>.001;return t.jsxs("div",{className:"flex flex-col bg-white/5 rounded border border-white/5 hover:border-cyan-500/30 transition-colors group",children:[t.jsxs("div",{className:"flex items-center justify-between p-2",children:[t.jsxs("div",{className:"flex items-center gap-3",children:[t.jsx("div",{className:"transform scale-75 origin-left",children:t.jsx(ra,{color:g.color,onChange:M=>s({id:g.id,updates:{color:M}}),label:""})}),t.jsxs("div",{className:"flex flex-col",children:[t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsxs("span",{className:"text-[10px] text-gray-300 font-mono font-bold",children:["#",h+1]}),t.jsx("span",{className:"text-[8px] text-gray-500 font-bold bg-black/40 px-1 rounded",children:v?"CUBE":g.type})]}),t.jsxs("span",{className:"text-[9px] text-gray-500 font-mono",children:[g.size.x.toFixed(4)," x ",g.size.y.toFixed(4)," ",v?`x ${(z=g.size.z)==null?void 0:z.toFixed(4)}`:""]})]})]}),t.jsxs("div",{className:"flex items-center gap-1",children:[g.type==="rect"&&t.jsx("button",{onClick:()=>{const w=(g.size.z||0)>0?0:Math.min(g.size.x,g.size.y);s({id:g.id,updates:{size:{...g.size,z:w}}})},className:`p-1.5 rounded transition-colors ${v?"text-cyan-300 bg-cyan-900/40":"text-gray-600 hover:text-cyan-400 hover:bg-white/5"}`,title:v?"Convert to Rect":"Extrude to Cube",children:t.jsx(fa,{})}),t.jsx("button",{onClick:()=>r(g.id),className:"text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1",title:"Delete",children:t.jsx(St,{})})]})]}),v&&t.jsxs("div",{className:"px-2 pb-2 pt-0 space-y-1 animate-slider-entry bg-black/20 mt-1 rounded border border-white/5 mx-1",children:[t.jsx(de,{label:"Depth",value:g.size.z||0,onChange:M=>s({id:g.id,updates:{size:{...g.size,z:Math.max(.001,M)}}}),step:.01,min:.001,max:5,highlight:!0}),t.jsx(de,{label:"Offset",value:g.zOffset||0,onChange:M=>s({id:g.id,updates:{zOffset:M}}),step:.01,min:-2,max:2})]})]},g.id)})})})})]})},ft=ue(),Yt=new U,Ze=(e,o,a,r)=>(Yt.copy(e).project(o),{x:(Yt.x*.5+.5)*a,y:(-Yt.y*.5+.5)*r,behind:Yt.z>1}),Ar=(e,o)=>{const a=e.center.x-o.x+(e.center.xL-o.xL),r=e.center.y-o.y+(e.center.yL-o.yL),n=e.center.z-o.z+(e.center.zL-o.zL);return new U(a,r,n)},td=(e,o,a,r,n)=>{const s=Ar(e,n),i=new Te(e.orientation.x,e.orientation.y,e.orientation.z,e.orientation.w),l=e.size.x/2,c=e.size.y/2,d=e.zOffset||0,u=e.size.z||0,f=e.type==="rect"&&u>.001,p=f?d-u/2:d;if(e.type==="circle"){const x=[];for(let y=0;y<=48;y++){const b=y/48*Math.PI*2,g=new U(Math.cos(b)*l,Math.sin(b)*c,p);g.applyQuaternion(i).add(s),x.push(Ze(g,o,a,r))}return x}if(f){const x=[];for(const C of[-1,1])for(const y of[-1,1])for(const b of[-1,1]){const g=new U(C*l,y*c,p+b*u/2);g.applyQuaternion(i).add(s),x.push(Ze(g,o,a,r))}return x}return[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,C])=>{const y=new U(x*l,C*c,p);return y.applyQuaternion(i).add(s),Ze(y,o,a,r)})},ad=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]],od=()=>{const{drawing:e,setDrawing:o,addDrawnShape:a,removeDrawnShape:r}=E(),{active:n,activeTool:s,originMode:i,color:l,showLabels:c,showAxes:d,shapes:u,refreshTrigger:f}=e,p=S.useRef(null),m=S.useRef(null),[x,C]=S.useState(null),y=S.useRef(null),b=S.useRef(!1),g=S.useRef(new U),h=S.useRef(new je),v=S.useRef(new U),z=S.useRef(new er),M=S.useRef(new U),w=S.useRef(new U),j=S.useRef({space:!1,x:!1}),k=S.useRef(0),[P,I]=S.useState(0),_=S.useCallback(()=>Ne(),[]),F=S.useCallback(()=>Jt(),[]),A=S.useCallback(G=>{const D=_();if(!D)return new U(0,0,-1);let O=new U(0,0,-1).applyQuaternion(D.quaternion).clone().negate();if(G){const W=Math.abs(O.x),K=Math.abs(O.y),Q=Math.abs(O.z);W>K&&W>Q?O.set(Math.sign(O.x),0,0):K>Q?O.set(0,Math.sign(O.y),0):O.set(0,0,Math.sign(O.z))}let B=new U(0,1,0);Math.abs(O.dot(B))>.99&&B.set(0,0,-1);let V=B.clone().sub(O.clone().multiplyScalar(B.dot(O)));V.normalize();const Y=new U().crossVectors(V,O).normalize();return M.current.copy(Y),w.current.copy(V),z.current.setFromNormalAndCoplanarPoint(O,v.current),O},[_]),N=S.useCallback((G,D,T)=>{const O=_();if(!O)return null;const B=new je((G-T.left)/T.width*2-1,-((D-T.top)/T.height)*2+1),V=new Ua;V.setFromCamera(B,O);const Y=new U;return V.ray.intersectPlane(z.current,Y)?Y:null},[_]);S.useEffect(()=>{const G=T=>{T.key==="Alt"&&T.preventDefault(),T.code==="Space"&&(j.current.space=!0,T.preventDefault()),T.key.toLowerCase()==="x"&&(j.current.x=!0)},D=T=>{T.key==="Alt"&&T.preventDefault(),T.code==="Space"&&(j.current.space=!1),T.key.toLowerCase()==="x"&&(j.current.x=!1)};return window.addEventListener("keydown",G),window.addEventListener("keyup",D),()=>{window.removeEventListener("keydown",G),window.removeEventListener("keyup",D)}},[]),S.useEffect(()=>{if(!n)return;const G=F();if(!G)return;const D=B=>{if(B.button!==0||B.target.closest(".drawing-ui"))return;const V=_();if(!V)return;const Y=G.getBoundingClientRect();if(h.current.set(B.clientX,B.clientY),i===1){const Q=Math.max(.1,ft.lastMeasuredDistance),re=new U(0,0,-1).applyQuaternion(V.quaternion);v.current.copy(V.position).addScaledVector(re,Q)}else{const Q=ft.sceneOffset;v.current.set(-(Q.x+Q.xL),-(Q.y+Q.yL),-(Q.z+Q.zL))}const W=A(j.current.x),K=N(B.clientX,B.clientY,Y);if(K){b.current=!0,g.current.copy(K);const Q={center:void 0,size:{x:0,y:0},orientation:new Te().setFromRotationMatrix(new yt().makeBasis(M.current,w.current,W)),type:s};C(Q),y.current=Q,G.setPointerCapture(B.pointerId)}},T=B=>{var we;if(!b.current)return;const V=G.getBoundingClientRect(),Y=A(j.current.x),W=N(B.clientX,B.clientY,V);if(!W)return;if(j.current.space){const me=N(h.current.x,h.current.y,V);if(me){const xe=new U().subVectors(W,me);if(g.current.add(xe),(we=y.current)!=null&&we.center){const Ce=y.current.center,Ge={...y.current,center:{...Ce,xL:Ce.xL+xe.x,yL:Ce.yL+xe.y,zL:Ce.zL+xe.z}};C(Ge),y.current=Ge}}h.current.set(B.clientX,B.clientY);return}h.current.set(B.clientX,B.clientY);const K=new U().subVectors(W,g.current);let Q=K.dot(M.current),re=K.dot(w.current),te;if(B.altKey?(Q*=2,re*=2,te=g.current.clone()):te=g.current.clone().addScaledVector(M.current,Q*.5).addScaledVector(w.current,re*.5),B.shiftKey){const me=Math.max(Math.abs(Q),Math.abs(re));Q=Math.sign(Q)*me,re=Math.sign(re)*me,B.altKey||(te=g.current.clone().addScaledVector(M.current,Q*.5).addScaledVector(w.current,re*.5))}const ae=ft.sceneOffset,ce={...y.current,center:{x:ae.x,y:ae.y,z:ae.z,xL:ae.xL+te.x,yL:ae.yL+te.y,zL:ae.zL+te.z},size:{x:Math.abs(Q),y:Math.abs(re)},orientation:new Te().setFromRotationMatrix(new yt().makeBasis(M.current,w.current,Y))};C(ce),y.current=ce},O=B=>{if(!b.current)return;b.current=!1,G.releasePointerCapture(B.pointerId);const V=y.current,Y=E.getState().drawing.color;V&&V.center&&V.size&&V.orientation&&(V.size.x>.001||V.size.y>.001)&&(a({id:Qe(),type:V.type||"rect",center:V.center,size:V.size,orientation:V.orientation,color:"#"+Y.getHexString()}),o({active:!1})),C(null),y.current=null};return G.addEventListener("pointerdown",D),G.addEventListener("pointermove",T),G.addEventListener("pointerup",O),()=>{G.removeEventListener("pointerdown",D),G.removeEventListener("pointermove",T),G.removeEventListener("pointerup",O)}},[n,s,i,_,F,o,A,N,a]),S.useEffect(()=>{let G=!0;const D=()=>{G&&(I(T=>T+1),k.current=requestAnimationFrame(D))};return((u==null?void 0:u.length)>0||x||d)&&(k.current=requestAnimationFrame(D)),()=>{G=!1,cancelAnimationFrame(k.current)}},[u==null?void 0:u.length,!!x,d]);const R=_(),X=F(),L=(X==null?void 0:X.clientWidth)||1,$=(X==null?void 0:X.clientHeight)||1,q=ft.sceneOffset,H=[];if(u)for(const G of u)H.push({shape:G,color:G.color,isTemp:!1});return x&&x.center&&x.size&&x.orientation&&H.push({shape:x,color:"#"+l.getHexString(),isTemp:!0}),t.jsxs("div",{ref:m,className:"absolute inset-0 overflow-hidden",style:{pointerEvents:"none"},children:[t.jsx("svg",{ref:p,width:L,height:$,className:"absolute inset-0",style:{pointerEvents:"none"},children:R&&H.map(({shape:G,color:D,isTemp:T})=>{const O=G.type==="rect"&&(G.size.z||0)>.001,B=td(G,R,L,$,q);if(B.some(Y=>Y.behind))return null;if(O)return t.jsx("g",{children:ad.map(([Y,W],K)=>t.jsx("line",{x1:B[Y].x,y1:B[Y].y,x2:B[W].x,y2:B[W].y,stroke:D,strokeWidth:T?1:1.5,strokeOpacity:.9},K))},G.id||"temp");const V=B.map((Y,W)=>`${W===0?"M":"L"}${Y.x},${Y.y}`).join(" ")+" Z";return t.jsx("path",{d:V,fill:"none",stroke:D,strokeWidth:T?1:1.5,strokeOpacity:.9},G.id||"temp")})}),R&&c&&H.map(({shape:G,color:D,isTemp:T})=>{const O=Ar(G,q),B=new Te(G.orientation.x,G.orientation.y,G.orientation.z,G.orientation.w),V=G.size.x/2,Y=G.size.y/2,W=G.size.z||0,K=G.zOffset||0,Q=G.type==="rect"&&W>.001?K-W/2:K,re=new U(0,Y,Q+W/2).applyQuaternion(B).add(O),te=Ze(re,R,L,$),ae=new U(-V,0,Q+W/2).applyQuaternion(B).add(O),ce=Ze(ae,R,L,$);if(te.behind||ce.behind)return null;const we=new U(V,Y,Q+W/2).applyQuaternion(B).add(O),me=Ze(we,R,L,$);return t.jsxs(ze.Fragment,{children:[t.jsx("div",{className:"absolute text-[10px] font-mono font-bold whitespace-nowrap text-cyan-300 opacity-90 px-1",style:{left:te.x,top:te.y,transform:"translate(-50%, -100%)",pointerEvents:"none"},children:G.size.x.toFixed(4)}),t.jsx("div",{className:"absolute text-[10px] font-mono font-bold whitespace-nowrap text-cyan-300 opacity-90 px-1",style:{left:ce.x,top:ce.y,transform:"translate(-100%, -50%) rotate(90deg)",transformOrigin:"right center",pointerEvents:"none"},children:G.size.y.toFixed(4)}),!T&&!me.behind&&t.jsx("div",{className:"drawing-ui absolute cursor-pointer flex items-center justify-center w-4 h-4 bg-red-900/80 hover:bg-red-500 text-white rounded-full transition-colors shadow-sm border border-white/20",style:{left:me.x,top:me.y,transform:"translate(25%, -75%)",pointerEvents:"auto"},onClick:xe=>{xe.stopPropagation(),r(G.id)},title:"Delete Shape",children:t.jsx("span",{className:"text-[10px] font-bold leading-none mb-[1px]",children:"✕"})})]},(G.id||"temp")+"-labels")}),R&&d&&t.jsx(rd,{camera:R,canvasW:L,canvasH:$,originMode:i,trigger:f})]})},rd=({camera:e,canvasW:o,canvasH:a,originMode:r,trigger:n})=>{const s=S.useRef({x:0,y:0,z:0,xL:0,yL:0,zL:0});S.useEffect(()=>{let p=new U(0,0,0);if(r===1){const x=Math.max(.1,ft.lastMeasuredDistance),C=new U(0,0,-1).applyQuaternion(e.quaternion);p.copy(e.position).addScaledVector(C,x)}else{const x=ft.sceneOffset;p.set(-(x.x+x.xL),-(x.y+x.yL),-(x.z+x.zL))}const m=ft.sceneOffset;s.current={x:m.x,y:m.y,z:m.z,xL:m.xL+p.x,yL:m.yL+p.y,zL:m.zL+p.z}},[r,n,e]);const i=ft.sceneOffset,l=s.current,c=new U(l.x-i.x+(l.xL-i.xL),l.y-i.y+(l.yL-i.yL),l.z-i.z+(l.zL-i.zL)),d=2,u=[{dir:new U(d,0,0),color:"#ff4444"},{dir:new U(0,d,0),color:"#44ff44"},{dir:new U(0,0,d),color:"#4444ff"}],f=Ze(c,e,o,a);return f.behind?null:t.jsxs("svg",{width:o,height:a,className:"absolute inset-0",style:{pointerEvents:"none"},children:[u.map((p,m)=>{const x=c.clone().add(p.dir),C=Ze(x,e,o,a);return C.behind?null:t.jsx("line",{x1:f.x,y1:f.y,x2:C.x,y2:C.y,stroke:p.color,strokeWidth:2,strokeOpacity:.7},m)}),Array.from({length:11},(p,m)=>{const x=m-5,C=c.clone().add(new U(x,0,-5)),y=c.clone().add(new U(x,0,5)),b=c.clone().add(new U(-5,0,x)),g=c.clone().add(new U(5,0,x)),h=Ze(C,e,o,a),v=Ze(y,e,o,a),z=Ze(b,e,o,a),M=Ze(g,e,o,a),w=x===0;return t.jsxs("g",{children:[!h.behind&&!v.behind&&t.jsx("line",{x1:h.x,y1:h.y,x2:v.x,y2:v.y,stroke:w?"#ff4444":"#444444",strokeWidth:w?1.5:.5,strokeOpacity:.5}),!z.behind&&!M.behind&&t.jsx("line",{x1:z.x,y1:z.y,x2:M.x,y2:M.y,stroke:w?"#4444ff":"#444444",strokeWidth:w?1.5:.5,strokeOpacity:.5})]},m)})]})},id=new Set(["audio","navigation","drawing","webcam","debugTools","engineSettings","quality","reflections"]),Wo=["coreMath","geometry","materials","coloring","atmosphere","lighting","optics"],qo=new Set(["repeats","phase","scale","offset","bias","repeats2","phase2","scale2","offset2","bias2","levelsMin","levelsMax","levelsGamma","saturation","juliaX","juliaY","juliaZ","preRotX","preRotY","preRotZ","hybridFoldLimit"]),nd=e=>{if(e==="lighting"){const o=[];for(let a=0;a<3;a++)o.push({label:`Light ${a+1} Intensity`,key:`light${a}_intensity`}),o.push({label:`Light ${a+1} Pos X`,key:`light${a}_posX`}),o.push({label:`Light ${a+1} Pos Y`,key:`light${a}_posY`}),o.push({label:`Light ${a+1} Pos Z`,key:`light${a}_posZ`});return o}return[]},sd=({x:e,y:o,onClose:a,onSelect:r})=>{const[n,s]=S.useState(null),i=S.useRef(null),[l,c]=S.useState({x:e,y:o,maxHeight:300,opacity:0,flip:!1}),d=E(m=>m.formula),f=[...ie.getAll().filter(m=>!id.has(m.id)&&(Object.values(m.params).some(x=>x.type==="float"||x.type==="int")||m.id==="lighting")).sort((m,x)=>{const C=Wo.indexOf(m.id),y=Wo.indexOf(x.id);return C!==-1&&y!==-1?C-y:C!==-1?-1:y!==-1?1:m.name.localeCompare(x.name)}).map(m=>({id:m.id,name:m.name})),{id:"camera",name:"Camera"}];S.useLayoutEffect(()=>{const m=window.innerWidth,x=window.innerHeight,C=10,y=320,b=e+y>m-C;let g=b?Math.max(C,e-y):e;g+y>m-C&&(g=Math.max(C,m-y-C));const h=x-o-C;let v=350,z=o;h<200&&o>h?o>v+C?z=o-v:(z=C,v=Math.min(v,o-C*2)):v=Math.min(v,Math.max(150,h)),c({x:g,y:z,maxHeight:v,opacity:1,flip:b})},[e,o]),S.useEffect(()=>{const m=x=>{i.current&&!i.current.contains(x.target)&&a()};return window.addEventListener("mousedown",m,!0),()=>window.removeEventListener("mousedown",m,!0)},[a]);const p=m=>{var v;if(m==="camera")return[{label:"Camera Pos X",key:"camera.unified.x"},{label:"Camera Pos Y",key:"camera.unified.y"},{label:"Camera Pos Z",key:"camera.unified.z"},{label:"Rotation X",key:"camera.rotation.x"},{label:"Rotation Y",key:"camera.rotation.y"},{label:"Rotation Z",key:"camera.rotation.z"}].map(z=>t.jsx("button",{onClick:()=>{r(z.key),a()},className:"px-3 py-1.5 text-left text-gray-300 hover:bg-cyan-600 hover:text-white transition-colors truncate",children:z.label},z.key));const x=ie.get(m);if(!x)return null;const C=nd(m),y=[],b=m==="coreMath"&&d?ge.get(d):null,g=((v=b==null?void 0:b.parameters)==null?void 0:v.map(z=>z==null?void 0:z.id).filter(z=>!!z))||[];Object.entries(x.params).forEach(([z,M])=>{if(M.onUpdate!=="compile"&&!(M.hidden&&!qo.has(z))&&!(m==="coreMath"&&g.length>0&&!g.includes(z))){if(M.type==="vec2"||M.type==="vec3"){(M.type==="vec2"?["x","y"]:["x","y","z"]).forEach(j=>{let k=`${M.label} ${j.toUpperCase()}`;if(m==="coreMath"&&b){const P=b.parameters.find(I=>(I==null?void 0:I.id)===z);P&&(k=`${z.replace("vec","V-")}: ${P.label} ${j.toUpperCase()}`)}y.push({key:`${m}.${z}_${j}`,label:k,desc:`${M.description||M.label} - ${j.toUpperCase()} component`})});return}if(M.type==="float"||M.type==="int"){if(M.hidden&&!qo.has(z))return;let w=M.label;if(m==="coreMath"&&d){const j=ge.get(d);if(j){const k=j.parameters.find(P=>(P==null?void 0:P.id)===z);k?w=`${z.replace("param","P-")}: ${k.label}`:z.startsWith("param")&&(w=`(${M.label})`)}}y.push({key:`${m}.${z}`,label:w,desc:M.description})}}});const h=[...C.map(z=>({key:`${m}.${z.key}`,label:z.label,desc:void 0})),...y];return t.jsxs(t.Fragment,{children:[h.length===0&&t.jsx("div",{className:"px-3 py-2 text-gray-500 text-xs italic",children:"No modulatable params"}),h.map(z=>t.jsx("button",{onClick:()=>{r(z.key),a()},className:"px-3 py-1.5 text-left text-gray-300 hover:bg-cyan-600 hover:text-white transition-colors truncate flex-shrink-0",title:z.desc||z.label,children:z.label},z.key))]})};return jt.createPortal(t.jsxs("div",{ref:i,className:"fixed z-[9999] flex text-xs font-mono",style:{left:l.x,top:l.y,opacity:l.opacity,transition:"opacity 0.05s ease-out",flexDirection:l.flip?"row-reverse":"row"},children:[t.jsx("div",{className:`w-32 bg-[#1a1a1a] border border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col py-1 overflow-y-auto custom-scroll ${l.flip?"rounded-r -ml-px":"rounded-l"}`,style:{maxHeight:l.maxHeight},children:f.map(m=>t.jsxs("div",{onMouseEnter:()=>s(m.id),className:`px-3 py-1.5 cursor-pointer flex justify-between items-center transition-colors ${n===m.id?"bg-cyan-900/60 text-white":"text-gray-400 hover:text-white hover:bg-white/5"}`,children:[t.jsx("span",{className:`truncate ${m.id==="coreMath"?"font-bold text-cyan-300":""}`,children:m.name}),l.flip?t.jsx("span",{className:"text-gray-600",children:"‹"}):t.jsx(ta,{})]},m.id))}),n&&t.jsx("div",{className:`w-48 bg-[#222] border-y border-r border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden ${l.flip?"rounded-l animate-fade-in-right":"rounded-r -ml-px animate-fade-in-left"}`,style:{maxHeight:l.maxHeight},children:t.jsx("div",{className:"flex-1 overflow-y-auto custom-scroll py-1",children:p(n)})})]}),document.body)},Nr=({value:e,onChange:o,className:a})=>{var f,p,m;const[r,n]=S.useState(!1),s=S.useRef(null),[i,l]=S.useState({x:0,y:0}),c=E(x=>x.formula),d=()=>{if(s.current){const x=s.current.getBoundingClientRect();l({x:x.left,y:x.bottom+4}),n(!0)}};let u=e;if(e.includes(".")){const[x,C]=e.split(".");if(x==="lighting"&&C.startsWith("light")){const y=parseInt(((f=C.match(/\d+/))==null?void 0:f[0])||"0"),b=C.includes("intensity")?"Intensity":C.includes("pos")?"Pos":"Param";u=`Light ${y+1} ${b}`}else if(x==="camera")C.includes("unified")?u=`Camera Pos ${(p=C.split(".").pop())==null?void 0:p.toUpperCase()}`:C.includes("rotation")?u=`Camera Rot ${(m=C.split(".").pop())==null?void 0:m.toUpperCase()}`:u="Camera Param";else{const y=ie.get(x);if(y){const b=y.params[C];if(b)if(x==="coreMath"&&c){const g=ge.get(c),h=g==null?void 0:g.parameters.find(v=>(v==null?void 0:v.id)===C);h?u=`${C.replace("param","P-")}: ${h.label}`:u=b.label}else u=`${y.name}: ${b.label}`;else u=`${y.name}: ${C}`}}}return t.jsxs(t.Fragment,{children:[t.jsx("button",{ref:s,onClick:d,className:`text-left px-2 py-1 bg-black/40 border border-white/10 rounded text-[10px] text-cyan-400 hover:bg-white/5 truncate ${a}`,title:u,children:u}),r&&t.jsx(sd,{x:i.x,y:i.y,onClose:()=>n(!1),onSelect:o})]})},ld=()=>{const e=E(),{modulation:o,removeModulation:a,addModulation:r,openContextMenu:n}=e,s=(p,m)=>{e.updateModulation({id:p,update:m})},i=o.selectedRuleId,l=o.rules.find(p=>p.id===i),c=()=>{r({target:"coreMath.paramA",source:"audio"})},d=p=>{const m=Ee(p.currentTarget);m.length>0&&(p.preventDefault(),p.stopPropagation(),n(p.clientX,p.clientY,[],m))};if(!l)return t.jsxs("div",{className:"flex flex-col items-center justify-center py-6 text-gray-500 gap-3 border-t border-white/5",children:[t.jsx("span",{className:"text-xs italic",children:"Select a box to edit params"}),t.jsx("button",{onClick:c,className:"px-4 py-2 bg-cyan-900/50 border border-cyan-500/30 rounded text-xs font-bold text-cyan-300 hover:bg-cyan-900 transition-colors",children:"+ Add New Link"})]});const u=l.source==="audio",f=(p,m)=>{s(l.id,{freqStart:p,freqEnd:m})};return t.jsxs("div",{className:"flex flex-col gap-3 border-t border-white/5 pt-3 animate-fade-in-up","data-help-id":"audio.links",onContextMenu:d,children:[t.jsxs("div",{className:"flex justify-between items-center bg-white/5 p-2 rounded border border-white/5",children:[t.jsxs("div",{className:"flex-1 mr-2",children:[t.jsx("label",{className:"text-[9px] text-gray-500 font-bold block mb-1",children:"Target Parameter"}),t.jsx(Nr,{value:l.target,onChange:p=>s(l.id,{target:p}),className:"w-full"})]}),t.jsx("div",{className:"flex flex-col items-end gap-1",children:t.jsx("button",{onClick:()=>a(l.id),className:"p-2 text-red-500 hover:text-red-300 hover:bg-red-900/20 rounded border border-transparent hover:border-red-900/50 transition-colors",title:"Remove Rule",children:t.jsx(St,{})})})]}),t.jsxs("div",{className:"flex gap-2 items-center",children:[t.jsx("label",{className:"text-[9px] text-gray-500 font-bold",children:"Source:"}),t.jsxs("select",{value:l.source,onChange:p=>s(l.id,{source:p.target.value}),className:"t-select text-cyan-300",children:[t.jsx("option",{value:"audio",children:"Audio Spectrum"}),t.jsx("option",{value:"lfo-1",children:"LFO 1"}),t.jsx("option",{value:"lfo-2",children:"LFO 2"}),t.jsx("option",{value:"lfo-3",children:"LFO 3"})]})]}),u&&t.jsxs("div",{children:[t.jsx("label",{className:"text-[9px] text-gray-500 font-bold block mb-1",children:"Quick Frequency Bands"}),t.jsxs("div",{className:"flex gap-1",children:[t.jsx("button",{onClick:()=>f(0,.1),className:"flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] font-bold text-gray-400 rounded border border-white/5",children:"Bass"}),t.jsx("button",{onClick:()=>f(.1,.5),className:"flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] font-bold text-gray-400 rounded border border-white/5",children:"Mids"}),t.jsx("button",{onClick:()=>f(.5,1),className:"flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] font-bold text-gray-400 rounded border border-white/5",children:"Treble"}),t.jsx("button",{onClick:()=>f(0,1),className:"flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] font-bold text-gray-400 rounded border border-white/5",children:"Full"})]})]}),t.jsxs("div",{className:"bg-black/30 rounded border border-white/10 p-3",children:[t.jsxs("div",{className:"grid grid-cols-5 gap-1",children:[t.jsx("div",{className:"flex flex-col items-center",children:t.jsx(Mt,{label:"Attack",value:l.attack,min:.01,max:.99,onChange:p=>s(l.id,{attack:p}),size:40,color:"#fbbf24"})}),t.jsx("div",{className:"flex flex-col items-center",children:t.jsx(Mt,{label:"Decay",value:l.decay,min:.01,max:.99,onChange:p=>s(l.id,{decay:p}),size:40,color:"#fbbf24"})}),t.jsx("div",{className:"flex flex-col items-center",children:t.jsx(Mt,{label:"Smooth",value:l.smoothing??0,min:0,max:.99,onChange:p=>s(l.id,{smoothing:p}),size:40,color:"#a855f7"})}),t.jsx("div",{className:"flex flex-col items-center",children:t.jsx(Mt,{label:"Gain",value:l.gain,min:0,max:10,onChange:p=>s(l.id,{gain:p}),size:40,color:"#22d3ee",unconstrained:!0})}),t.jsx("div",{className:"flex flex-col items-center",children:t.jsx(Mt,{label:"Offset",value:l.offset,min:-5,max:5,onChange:p=>s(l.id,{offset:p}),size:40,color:"#22d3ee",unconstrained:!0})})]}),t.jsxs("div",{className:"grid grid-cols-5 text-[8px] text-gray-500 text-center mt-1 font-bold",children:[t.jsx("div",{children:"Rise"}),t.jsx("div",{children:"Fall"}),t.jsx("div",{children:"Lerp"}),t.jsx("div",{children:"Mult"}),t.jsx("div",{children:"Add"})]})]}),u&&t.jsxs("div",{className:"flex justify-between text-[9px] text-gray-600 px-1",children:[t.jsxs("span",{children:["Freq: ",Math.round(l.freqStart*100),"% - ",Math.round(l.freqEnd*100),"%"]}),t.jsxs("span",{children:["Threshold: ",Math.round(l.thresholdMin*100),"% - ",Math.round(l.thresholdMax*100),"%"]})]})]})};function cd({tabs:e,active:o,onChange:a,className:r=""}){return t.jsx("div",{className:`flex bg-black/40 border-b border-white/10 ${r}`,children:e.map(n=>t.jsxs("button",{onClick:()=>a(n),className:`flex-1 py-2 text-[10px] font-bold transition-all relative ${o===n?"text-cyan-400 bg-white/5":"text-gray-500 hover:text-gray-300 hover:bg-white/5"}`,children:[n,o===n&&t.jsx("div",{className:"absolute bottom-[-1px] left-0 right-0 h-0.5 bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]"})]},n))})}const dd=({state:e,actions:o})=>{const a=E(i=>i.setHistogramLayer),r=e.texturing,n=e.coloring,s=o.setTexturing;return S.useEffect(()=>{a(0)},[a]),!r||!n?null:t.jsxs(t.Fragment,{children:[t.jsx("div",{className:"p-2 bg-gray-900/50 border-b border-white/5",children:t.jsx(Le,{value:r.active,onChange:i=>s({active:i}),options:[{label:"Gradient",value:!1},{label:"Image Texture",value:!0}]})}),r.active?t.jsxs("div",{className:"p-1 space-y-2","data-help-id":"grad.texture",children:[t.jsx("div",{className:"p-1",children:t.jsx(ne,{featureId:"texturing",groupFilter:"main"})}),t.jsx("div",{className:"bg-gray-900/20 px-1 py-2 rounded",children:t.jsx(ne,{featureId:"texturing",groupFilter:"mapping"})}),t.jsx("div",{className:"px-1 pb-2",children:t.jsx(ne,{featureId:"texturing",groupFilter:"transform"})}),t.jsx(ne,{featureId:"coloring",groupFilter:"layer1_bottom",excludeParams:["twist"]})]}):t.jsxs("div",{className:"flex flex-col",children:[t.jsx(ne,{featureId:"coloring",groupFilter:"layer1_grad"}),t.jsx(ne,{featureId:"coloring",groupFilter:"layer1_top"}),t.jsx("div",{className:"mb-2",children:t.jsx(ne,{featureId:"coloring",groupFilter:"layer1_hist"})}),t.jsx(ne,{featureId:"coloring",groupFilter:"layer1_bottom"})]})]})},ud=({state:e,actions:o})=>{const a=E(s=>s.setHistogramLayer),r=e.coloring,n=r==null?void 0:r.mode2;return S.useEffect(()=>{a(1)},[a]),r?t.jsxs("div",{className:"flex flex-col","data-help-id":"grad.layer2",children:[t.jsx(ne,{featureId:"coloring",groupFilter:"layer2_grad"}),t.jsx(ne,{featureId:"coloring",groupFilter:"layer2_top"}),t.jsx("div",{className:"mb-2",children:t.jsx(ne,{featureId:"coloring",groupFilter:"layer2_hist"})}),(n===6||n===8)&&t.jsx("div",{className:"mb-1",children:t.jsx(ne,{featureId:"coloring",whitelistParams:["escape"]})}),t.jsx(ne,{featureId:"coloring",groupFilter:"layer2_bottom"})]}):null},fd=({state:e,actions:o})=>{const a=E(n=>n.openContextMenu),r=n=>{const s=Ee(n.currentTarget);s.length>0&&(n.preventDefault(),n.stopPropagation(),a(n.clientX,n.clientY,[],s))};return t.jsxs("div",{className:"flex flex-col","data-help-id":"grad.noise",children:[t.jsx("div",{className:"t-section-header",onContextMenu:r,children:t.jsxs("div",{children:[t.jsx(Me,{color:"text-green-400",className:"block mb-1",children:"Procedural 3d noise"}),t.jsx("p",{className:"text-[9px] text-gray-500 font-normal",children:"Adds texture and surface detail."})]})}),t.jsx("div",{className:"p-1",children:t.jsx(ne,{featureId:"coloring",groupFilter:"noise"})})]})},pd=({state:e,actions:o})=>{const[a,r]=S.useState("Layer 1"),n=E(i=>i.openContextMenu),s=i=>{const l=Ee(i.currentTarget);l.length>0&&(i.preventDefault(),i.stopPropagation(),n(i.clientX,i.clientY,[],l))};return t.jsxs("div",{className:"animate-fade-in -mx-4 -mt-4","data-help-id":"panel.gradient",children:[t.jsx("div",{onContextMenu:s,children:t.jsx(cd,{tabs:["Layer 1","Layer 2","Noise"],active:a,onChange:r})}),t.jsxs("div",{className:"flex flex-col",children:[a==="Layer 1"&&t.jsx(dd,{state:e,actions:o}),a==="Layer 2"&&t.jsx(ud,{state:e,actions:o}),a==="Noise"&&t.jsx(fd,{state:e,actions:o})]})]})},Xo=["TAB","CTRL","ALT","SHIFT","SPACE","LMB","MMB","RMB","SCROLL UP","SCROLL DOWN","Z","Y","H","T","1","2","3","4","5","6"],Yo={Q:{x:0,y:0,label:"Q ↶"},W:{x:1,y:0,label:"W ▲"},E:{x:2,y:0,label:"E ↷"},A:{x:0,y:1,label:"A ◀"},S:{x:1,y:1,label:"S ▼"},D:{x:2,y:1,label:"D ▶"},C:{x:1,y:2,label:"C ⬇"}},hd={KeyW:"W",KeyA:"A",KeyS:"S",KeyD:"D",KeyQ:"Q",KeyE:"E",KeyC:"C",Space:"SPACE",ShiftLeft:"SHIFT",ShiftRight:"SHIFT",ControlLeft:"CTRL",ControlRight:"CTRL",AltLeft:"ALT",AltRight:"ALT",Tab:"TAB",KeyZ:"Z",KeyY:"Y",KeyH:"H",KeyT:"T",Digit1:"1",Digit2:"2",Digit3:"3",Digit4:"4",Digit5:"5",Digit6:"6"},md={0:"LMB",1:"MMB",2:"RMB"},gd=()=>t.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("circle",{cx:"12",cy:"12",r:"3"}),t.jsx("path",{d:"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"})]}),xd=["normal","screen","overlay","lighten","difference"],yd=({sliceState:e,actions:o})=>{const r=66.66666666666667,n=.7,{isEnabled:s,opacity:i,posX:l,posY:c,width:d,height:u,cropL:f,cropR:p,cropT:m,cropB:x,blendMode:C,crtMode:y,tilt:b,fontSize:g}=e,h=o.setWebcam,v=S.useRef(null),z=S.useRef(null),[M,w]=S.useState(!1),[j,k]=S.useState(null),P=S.useRef(0),I=S.useRef(null),_=S.useRef(new Set),F=S.useRef(new Map),A=S.useRef(null),[N,R]=S.useState(!1);S.useEffect(()=>{if(!s){v.current&&v.current.srcObject&&v.current.srcObject.getTracks().forEach(K=>K.stop());return}k(null);const T=document.createElement("video");T.autoplay=!0,T.muted=!0,T.playsInline=!0,v.current=T,(async()=>{try{const W=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480,frameRate:{ideal:24}}});v.current&&(v.current.srcObject=W,v.current.play().catch(K=>{console.error("Webcam play error",K),k("Video blocked. Check browser privacy settings.")}))}catch(W){console.error("Webcam access denied:",W),W instanceof DOMException&&(W.name==="NotAllowedError"||W.name==="PermissionDeniedError")?k("Camera Blocked: Check browser permissions or HTTPS."):W instanceof DOMException&&W.name==="NotFoundError"?k("No camera found."):k("Camera Error: "+(W instanceof Error?W.message:String(W)))}})();const B=W=>{const K=hd[W.code];K&&(W.type==="keydown"?_.current.add(K):_.current.delete(K))},V=W=>{const K=md[W.button];K&&(W.type==="mousedown"?_.current.add(K):_.current.delete(K))},Y=W=>{const K=W.deltaY<0?"SCROLL UP":"SCROLL DOWN";F.current.set(K,1)};return window.addEventListener("keydown",B),window.addEventListener("keyup",B),window.addEventListener("mousedown",V),window.addEventListener("mouseup",V),window.addEventListener("wheel",Y,{passive:!0}),()=>{v.current&&v.current.srcObject&&v.current.srcObject.getTracks().forEach(K=>K.stop()),window.removeEventListener("keydown",B),window.removeEventListener("keyup",B),window.removeEventListener("mousedown",V),window.removeEventListener("mouseup",V),window.removeEventListener("wheel",Y)}},[s]);const X=S.useCallback(T=>{const O=(T-(P.current||T))/1e3;if([...Xo,...Object.keys(Yo)].forEach(B=>{let V=F.current.get(B)||0;_.current.has(B)?V=1:V-=O/n,V=Math.max(0,Math.min(1,V)),F.current.set(B,V)}),T-P.current>r){const B=z.current,V=v.current;if(B){const Y=B.getContext("2d",{alpha:!1});if(Y){if(P.current=T,(B.width!==d||B.height!==u)&&(B.width=d,B.height=u),Y.fillStyle="#000000",Y.fillRect(0,0,d,u),!j&&V&&V.readyState===V.HAVE_ENOUGH_DATA){const W=V.videoWidth,K=V.videoHeight,Q=W*f,re=K*m,te=W*(1-f-p),ae=K*(1-m-x);te>0&&ae>0&&(Y.save(),Y.translate(d,0),Y.scale(-1,1),Y.drawImage(V,Q,re,te,ae,0,0,d,u),Y.restore())}else j&&(Y.fillStyle="#330000",Y.fillRect(0,0,d,u),Y.fillStyle="#ff5555",Y.font=`bold ${Math.max(10,g)}px monospace`,Y.textAlign="center",Y.textBaseline="middle",j.split(" "),Y.fillText(j,d/2,u/2));L(Y,d,u),$(Y)}}}I.current=requestAnimationFrame(X)},[f,p,m,x,d,u,g,s,j]);S.useEffect(()=>{if(s)return I.current=requestAnimationFrame(X),()=>{I.current&&cancelAnimationFrame(I.current)}},[X,s]);const L=(T,O,B)=>{T.font=`bold ${g}px monospace`,T.textAlign="left",T.textBaseline="bottom";let V=10;const Y=B-10,W=g*1.6+4;Xo.forEach(K=>{const Q=F.current.get(K)||0;if(Q<=.01)return;const re=T.measureText(K),te=g,ae=re.width+te;V+ae>O||(T.fillStyle=`rgba(0, 0, 0, ${.8*Q})`,T.fillRect(V,Y-W,ae,W),T.fillStyle=`rgba(255, 255, 255, ${Q})`,T.fillText(K,V+te/2,Y-W*.25),V+=ae+4)})},$=T=>{const O=g*2.8,B=3,V=10,Y=10;T.font=`bold ${g}px monospace`,T.textAlign="center",T.textBaseline="middle",Object.entries(Yo).forEach(([W,K])=>{const Q=F.current.get(W)||0;if(Q<=.01)return;const re=V+K.x*(O+B),te=Y+K.y*(O+B);T.fillStyle=`rgba(0, 0, 0, ${.8*Q})`,T.fillRect(re,te,O,O),T.fillStyle=`rgba(255, 255, 255, ${Q})`,T.fillText(K.label,re+O/2,te+O/2+1)})},q=(T,O)=>{T.preventDefault(),T.stopPropagation(),A.current={type:O,startX:T.clientX,startY:T.clientY,startPos:{x:l,y:c},startSize:{w:d,h:u},startCrop:{l:f,r:p,t:m,b:x}},window.addEventListener("mousemove",H),window.addEventListener("mouseup",G)},H=S.useCallback(T=>{var Ce,Ge;if(!A.current)return;const{type:O,startX:B,startY:V,startPos:Y,startSize:W,startCrop:K}=A.current,Q=T.clientX-B,re=T.clientY-V,te=((Ce=v.current)==null?void 0:Ce.videoWidth)||640,ae=((Ge=v.current)==null?void 0:Ge.videoHeight)||480,ce=te*(1-K.l-K.r),we=ae*(1-K.t-K.b),me=W.w/Math.max(1,ce),xe=W.h/Math.max(1,we);if(O==="move")h({posX:Y.x+Q,posY:Y.y+re});else if(O==="scale"){const ee=W.w/W.h,ye=Math.max(100,W.w+Q);h({width:ye,height:ye/ee})}else if(O==="crop-l"){const ee=Math.max(50,W.w-Q),ye=Y.x+(W.w-ee),De=(W.w-ee)/me/te;h({posX:ye,width:ee,cropR:Math.min(.9,Math.max(0,K.r+De))})}else if(O==="crop-r"){const ee=Math.max(50,W.w+Q),ye=(W.w-ee)/me/te;h({width:ee,cropL:Math.min(.9,Math.max(0,K.l+ye))})}else if(O==="crop-t"){const ee=Math.max(50,W.h-re),ye=Y.y+(W.h-ee),De=(W.h-ee)/xe/ae;h({posY:ye,height:ee,cropT:Math.min(.9,Math.max(0,K.t+De))})}else if(O==="crop-b"){const ee=Math.max(50,W.h+re),ye=(W.h-ee)/xe/ae;h({height:ee,cropB:Math.min(.9,Math.max(0,K.b+ye))})}},[h]),G=()=>{A.current=null,window.removeEventListener("mousemove",H),window.removeEventListener("mouseup",G)};if(!s)return null;const D=xd[Math.floor(C)]||"normal";return t.jsxs("div",{className:"absolute select-none",style:{left:l,top:c,width:d,height:u,cursor:"move",pointerEvents:"auto"},onMouseDown:T=>{T.target.closest(".settings-panel")||q(T,"move")},onMouseEnter:()=>R(!0),onMouseLeave:()=>{R(!1),w(!1)},children:[t.jsx("div",{className:"absolute inset-0 w-full h-full pointer-events-none",style:{mixBlendMode:D,perspective:"1000px"},children:t.jsxs("div",{className:"w-full h-full",style:{opacity:Math.min(1,i),filter:i>1?`brightness(${i})`:"none",transform:`rotateY(${b}deg)`,transformStyle:"preserve-3d"},children:[t.jsx("canvas",{ref:z,className:"w-full h-full block"}),y&&t.jsx("div",{className:"absolute inset-0 opacity-40 mix-blend-overlay",style:{background:"linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))",backgroundSize:"100% 4px, 6px 100%"}})]})}),t.jsxs("div",{className:"absolute inset-0 w-full h-full",children:[t.jsx("div",{className:`absolute top-2 right-2 transition-opacity duration-200 z-50 ${N?"opacity-100":"opacity-0 pointer-events-none"}`,children:t.jsx("button",{onClick:T=>{T.stopPropagation(),w(!M)},className:"p-1.5 rounded bg-black/60 text-gray-400 hover:text-white hover:bg-black/80 border border-white/10 shadow-lg backdrop-blur-sm",children:t.jsx(gd,{})})}),M&&t.jsx("div",{className:"settings-panel absolute top-10 right-2 w-48 bg-[#151515] border border-white/20 rounded p-2 shadow-2xl z-50 animate-fade-in",onMouseDown:T=>T.stopPropagation(),children:t.jsxs("div",{className:"space-y-2 text-[10px]",children:[t.jsxs("div",{children:[t.jsx(Me,{className:"block mb-1",children:"Blend Mode"}),t.jsxs("select",{value:Math.floor(C),onChange:T=>h({blendMode:Number(T.target.value)}),className:"t-select",children:[t.jsx("option",{value:0,children:"Normal"}),t.jsx("option",{value:1,children:"Screen"}),t.jsx("option",{value:2,children:"Overlay"}),t.jsx("option",{value:3,children:"Lighten"}),t.jsx("option",{value:4,children:"Difference"})]})]}),t.jsxs("div",{children:[t.jsxs("div",{className:"flex justify-between text-gray-500 font-bold mb-1",children:[t.jsx("span",{children:"Opacity"}),t.jsxs("span",{children:[Math.round(i*100),"%"]})]}),t.jsx("input",{type:"range",min:"0",max:"3",step:"0.05",value:i,onChange:T=>h({opacity:parseFloat(T.target.value)}),className:"w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"})]}),t.jsxs("div",{children:[t.jsxs("div",{className:"flex justify-between text-gray-500 font-bold mb-1",children:[t.jsx("span",{children:"3D Tilt"}),t.jsxs("span",{children:[b,"°"]})]}),t.jsx("input",{type:"range",min:"-45",max:"45",step:"1",value:b,onChange:T=>h({tilt:parseInt(T.target.value)}),className:"w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"})]}),t.jsxs("div",{children:[t.jsxs("div",{className:"flex justify-between text-gray-500 font-bold mb-1",children:[t.jsx("span",{children:"Font Size"}),t.jsxs("span",{children:[g,"px"]})]}),t.jsx("input",{type:"range",min:"8",max:"32",step:"1",value:g,onChange:T=>h({fontSize:parseInt(T.target.value)}),className:"w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"})]}),t.jsxs("label",{className:"flex items-center gap-2 cursor-pointer mt-1 pt-1 border-t border-white/10",children:[t.jsx("input",{type:"checkbox",checked:y,onChange:T=>h({crtMode:T.target.checked}),className:"cursor-pointer"}),t.jsx("span",{className:"text-gray-400 font-bold",children:"CRT Scanlines"})]})]})}),t.jsxs("div",{className:`transition-opacity duration-200 ${N?"opacity-100":"opacity-0 pointer-events-none"}`,children:[t.jsx("div",{className:"absolute bottom-[-6px] right-[-6px] w-6 h-6 bg-cyan-500/50 cursor-nwse-resize hover:bg-cyan-400 z-20 rounded-full border-2 border-black",onMouseDown:T=>q(T,"scale")}),t.jsx("div",{className:"absolute top-4 bottom-4 left-[-4px] w-3 cursor-e-resize group/l z-10 flex items-center justify-center",onMouseDown:T=>q(T,"crop-l"),children:t.jsx("div",{className:"w-1 h-8 bg-red-500/50 group-hover/l:bg-red-400 rounded-full"})}),t.jsx("div",{className:"absolute top-4 bottom-4 right-[-4px] w-3 cursor-w-resize group/r z-10 flex items-center justify-center",onMouseDown:T=>q(T,"crop-r"),children:t.jsx("div",{className:"w-1 h-8 bg-red-500/50 group-hover/r:bg-red-400 rounded-full"})}),t.jsx("div",{className:"absolute left-4 right-4 top-[-4px] h-3 cursor-s-resize group/t z-10 flex items-center justify-center",onMouseDown:T=>q(T,"crop-t"),children:t.jsx("div",{className:"h-1 w-8 bg-red-500/50 group-hover/t:bg-red-400 rounded-full"})}),t.jsx("div",{className:"absolute left-4 right-4 bottom-[-4px] h-3 cursor-n-resize group/b z-10 flex items-center justify-center",onMouseDown:T=>q(T,"crop-b"),children:t.jsx("div",{className:"h-1 w-8 bg-red-500/50 group-hover/b:bg-red-400 rounded-full"})})]})]})]})},bd=({className:e="-m-4"})=>{const o=E(),[a,r]=S.useState({}),[n,s]=S.useState(null),[i,l]=S.useState(!1),c=S.useMemo(()=>{const h={};return["lighting","ao","geometry","reflections","quality","atmosphere"].forEach(z=>{const M=o[z];M&&typeof M=="object"&&(h[z]={...M})}),Object.entries(a).forEach(([z,M])=>{const[w,j]=z.split(".");h[w]&&(h[w][j]=M)}),h},[o,a]),d=cr(c),u=d.charAt(0).toUpperCase()+d.slice(1),p=(S.useMemo(()=>Zn(c),[c])/1e3).toFixed(1),m=ie.getEngineFeatures(),x=S.useRef(()=>{});S.useEffect(()=>{const h=Z.on("compile_time",M=>{s(`Compiled (${M.toFixed(2)}s)`),l(!1),setTimeout(()=>s(null),3e3)}),v=Z.on("is_compiling",M=>{l(!!M)}),z=Z.on("engine_queue",({featureId:M,param:w,value:j})=>{x.current(M,w,j)});return()=>{h(),v(),z()}},[]);const C=(h,v,z)=>{var _,F;const M=ie.get(h),w=M==null?void 0:M.params[v],j=((_=M==null?void 0:M.engineConfig)==null?void 0:_.toggleParam)===v,k=(F=M==null?void 0:M.engineConfig)==null?void 0:F.mode,P=(w==null?void 0:w.onUpdate)==="compile";if(j&&k==="compile"||P){const A=`${h}.${v}`,N=o[h];if(N&&N[v]===z){const R={...a};delete R[A],r(R)}else r(R=>({...R,[A]:z}));s(null)}else{const A=`set${h.charAt(0).toUpperCase()+h.slice(1)}`,N=o[A];N&&N({[v]:z});const R=`${h}.${v}`;if(a[R]!==void 0){const X={...a};delete X[R],r(X)}}};x.current=C;const y=()=>{Z.emit("is_compiling","Compiling Shaders...");const h={};Object.entries(a).forEach(([v,z])=>{const[M,w]=v.split(".");h[M]||(h[M]={}),h[M][w]=z}),setTimeout(()=>{Object.entries(h).forEach(([v,z])=>{const M=`set${v.charAt(0).toUpperCase()+v.slice(1)}`,w=o[M];w&&w(z)}),r({})},100)},b=h=>{if(h==="Custom")return;const v=da[h];if(!v)return;const z={};Object.entries(v).forEach(([M,w])=>{Object.entries(w).forEach(([j,k])=>{var _;const P=(_=o[M])==null?void 0:_[j];let I=P!==k;typeof k=="number"&&typeof P=="number"&&(I=Math.abs(k-P)>.001),I&&(z[`${M}.${j}`]=k)})}),r(z),s(null)},g=h=>{const v=o[h];if(!v)return{};const z={...v};return Object.entries(a).forEach(([M,w])=>{const[j,k]=M.split(".");j===h&&(z[k]=w)}),z};return t.jsxs("div",{className:`flex flex-col h-full bg-[#080808] min-h-0 overflow-hidden ${e}`,"data-help-id":"panel.engine",children:[t.jsxs("div",{className:"px-3 py-2 bg-black/60 border-b border-white/10 flex items-center justify-between shrink-0",children:[t.jsx(Me,{children:"Engine Configuration"}),t.jsx("div",{className:"w-32",children:t.jsx(kt,{value:u,options:[{label:"Fastest (Bare)",value:"Fastest"},{label:"Lite (Fast)",value:"Lite"},{label:"Balanced",value:"Balanced"},{label:"Ultra",value:"Ultra"},{label:"Custom",value:"Custom"}],onChange:h=>b(h.toLowerCase())})})]}),t.jsxs("div",{className:"flex-1 overflow-y-auto custom-scroll p-0 min-h-0",children:[t.jsxs("div",{className:"flex gap-2 items-center px-3 py-2 bg-blue-900/10 border-b border-white/5 mb-1 shrink-0",children:[t.jsx("div",{className:"text-blue-400",children:t.jsx(yr,{})}),t.jsxs("p",{className:"text-[9px] text-blue-200/80 leading-tight",children:[t.jsx("span",{className:"text-green-400",children:"●"})," Compiled  ",t.jsx("span",{className:"text-amber-400",children:"●"})," Pending  ",t.jsx("span",{className:"text-blue-400",children:"●"})," Instant"]})]}),t.jsx("div",{className:"flex flex-col",children:m.map(h=>{const v=h.engineConfig,z=g(h.id),M=v.toggleParam,w=z[M],j=`${h.id}.${M}`,P=a[j]!==void 0?"pending":"synced";return t.jsxs("div",{className:"group",children:[t.jsx(Oa,{label:v.label,description:v.description,isActive:w,onToggle:I=>C(h.id,M,I),status:P}),w&&v.groupFilter&&t.jsx("div",{className:"ml-4 pl-2 border-l border-white/10 my-0.5",children:t.jsx(ne,{featureId:h.id,groupFilter:v.groupFilter,excludeParams:[v.toggleParam],variant:"dense",forcedState:z,onChangeOverride:(I,_)=>C(h.id,I,_),pendingChanges:a})})]},h.id)})})]}),t.jsx("div",{className:"px-3 py-2 bg-[#1a1a1a] border-t border-white/10 flex items-center justify-between min-h-[40px] shrink-0 z-10",children:i?t.jsxs(t.Fragment,{children:[t.jsxs("div",{className:"flex items-center gap-2 text-cyan-400 text-[10px] font-bold",children:[t.jsx(Sr,{className:"animate-spin h-3 w-3"}),t.jsx("span",{children:"Compiling..."})]}),t.jsxs("div",{className:"text-[9px] text-gray-500",children:["~",p,"s"]})]}):Object.keys(a).length>0?t.jsxs(t.Fragment,{children:[t.jsxs("div",{className:"flex items-center gap-1.5",children:[t.jsxs("div",{className:"flex items-center gap-2 text-amber-500 text-[10px] font-bold animate-pulse",children:[t.jsx(Tt,{}),t.jsx("span",{children:"Pending"})]}),t.jsxs("span",{className:"text-[9px] text-gray-500 font-mono",children:["~",p,"s"]})]}),t.jsxs("button",{onClick:y,disabled:i,className:"px-4 py-1 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold text-[10px] rounded transition-colors flex items-center gap-1",children:[t.jsx(pt,{})," Apply"]})]}):t.jsxs(t.Fragment,{children:[t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsx("span",{className:"text-[10px] text-gray-600 font-medium",children:"System Ready"}),t.jsxs("span",{className:"text-[9px] text-gray-600 font-mono",children:["~",p,"s"]})]}),n&&t.jsxs("div",{className:"text-[10px] text-green-400 font-bold animate-fade-in flex items-center gap-1",children:[t.jsx(pt,{})," ",n]})]})})]})},vd=e=>{const o=new Te(e.x,e.y,e.z,e.w),a=new U(0,0,-1).applyQuaternion(o),r=.98;return a.y>r?"Bottom View":a.y<-r?"Top View":a.x>r?"Left View":a.x<-r?"Right View":a.z>r?"Back View":a.z<-r?"Front View":null},wd=(e,o)=>{let r=We.getUnifiedFromEngine().length();r<.001&&(r=3.5);const n=new U(0,0,0),s=new Te;let i=!0;switch(e){case"Front":s.setFromEuler(new Pe(0,0,0));break;case"Back":s.setFromEuler(new Pe(0,Math.PI,0));break;case"Left":s.setFromEuler(new Pe(0,-Math.PI/2,0));break;case"Right":s.setFromEuler(new Pe(0,Math.PI/2,0));break;case"Top":s.setFromEuler(new Pe(-Math.PI/2,0,0));break;case"Bottom":s.setFromEuler(new Pe(Math.PI/2,0,0));break;case"Isometric":i=!1;const m=tt.degToRad(-35.264),x=tt.degToRad(45);s.setFromEuler(new Pe(m,x,0,"YXZ"));break}const l=new U(0,0,-1).applyQuaternion(s),c=n.clone().sub(l.multiplyScalar(r)),d=i?1:0;let u=o?o.orthoScale:2,f=o?o.dofStrength:0,p;return i&&((!o||o.camType<.5)&&(u=r),f=0,p={camType:d,orthoScale:u,dofStrength:f}),{position:c,rotation:{x:s.x,y:s.y,z:s.z,w:s.w},targetDistance:r,optics:p}},Zo=[{type:"none",label:"None"},{type:"thirds",label:"Rule of Thirds"},{type:"golden",label:"Golden Ratio"},{type:"grid",label:"Grid"},{type:"center",label:"Center Mark"},{type:"diagonal",label:"Diagonal"},{type:"spiral",label:"Spiral"},{type:"safearea",label:"Safe Areas"}],Sd=({className:e="-m-3"})=>{var k;const{savedCameras:o,activeCameraId:a,addCamera:r,deleteCamera:n,selectCamera:s,updateCamera:i,resetCamera:l}=E(),c=E(P=>P.optics),d=E(P=>P.compositionOverlay),u=E(P=>P.setCompositionOverlay),f=E(P=>P.compositionOverlaySettings),p=E(P=>P.setCompositionOverlaySettings),m=E.getState().setOptics,[x,C]=S.useState(null),[y,b]=S.useState(""),g=P=>{C(P.id),b(P.label)},h=()=>{x&&(i(x,{label:y}),C(null))},v=P=>{P.key==="Enter"&&h(),P.key==="Escape"&&C(null)},z=()=>{s(null)},M=P=>{const I=wd(P,c);We.teleportPosition(I.position,I.rotation,I.targetDistance),I.optics&&m&&m(I.optics),s(null)},w=()=>{const P=We.getRotationFromEngine();let I=`Camera ${o.length+1}`;const _=E.getState().optics;if(_&&Math.abs(_.camType-1)<.1){const F=vd(P);F&&(I=F)}r(I)},j=()=>{l(),m&&m({camType:0,camFov:60,orthoScale:2})};return t.jsxs("div",{className:`flex flex-col bg-[#080808] ${e}`,children:[t.jsxs("div",{className:"p-2 border-b border-white/10 bg-black/40 grid grid-cols-4 gap-1",children:[t.jsx("button",{onClick:()=>M("Front"),className:"bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1",children:"FRONT"}),t.jsx("button",{onClick:()=>M("Back"),className:"bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1",children:"BACK"}),t.jsx("button",{onClick:()=>M("Left"),className:"bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1",children:"LEFT"}),t.jsx("button",{onClick:()=>M("Right"),className:"bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1",children:"RIGHT"}),t.jsx("button",{onClick:()=>M("Top"),className:"bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1",children:"TOP"}),t.jsx("button",{onClick:()=>M("Bottom"),className:"bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1",children:"BTM"}),t.jsx("button",{onClick:()=>M("Isometric"),className:"bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1",children:"ISO"}),t.jsx("button",{onClick:j,className:"bg-white/5 hover:bg-white/10 text-[9px] text-gray-400 rounded py-1",children:"RESET"}),t.jsxs("button",{onClick:w,className:"col-span-4 bg-cyan-900/40 hover:bg-cyan-800 text-cyan-300 border border-cyan-500/30 rounded py-1 text-[9px] font-bold flex items-center justify-center gap-1 mt-1",children:[t.jsx(ua,{})," New Camera"]})]}),t.jsxs("div",{className:"p-2 space-y-1",children:[o.length===0&&t.jsx("div",{className:"text-center text-gray-600 text-[10px] italic py-4",children:"No saved cameras"}),o.map(P=>{const I=a===P.id;return t.jsxs("div",{className:`flex items-center justify-between p-2 rounded border transition-all group ${I?"bg-cyan-900/20 border-cyan-500/50":"bg-white/5 border-transparent hover:border-white/10"}`,onClick:()=>s(P.id),children:[t.jsxs("div",{className:"flex items-center gap-2 flex-1 min-w-0",children:[t.jsx("div",{className:`w-2 h-2 rounded-full ${I?"bg-cyan-400 shadow-[0_0_5px_cyan]":"bg-gray-600"}`}),x===P.id?t.jsx("input",{type:"text",value:y,onChange:_=>b(_.target.value),onBlur:h,onKeyDown:v,autoFocus:!0,className:"bg-black border border-white/20 text-xs text-white px-1 py-0.5 rounded w-full outline-none",onClick:_=>_.stopPropagation()}):t.jsx("span",{className:`text-xs font-bold truncate cursor-text ${I?"text-white":"text-gray-400 group-hover:text-gray-300"}`,onDoubleClick:_=>{_.stopPropagation(),g(P)},title:"Double-click to rename",children:P.label})]}),t.jsx("button",{onClick:_=>{_.stopPropagation(),n(P.id)},className:"p-1.5 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity",title:"Delete",children:t.jsx(St,{})})]},P.id)})]}),t.jsxs("div",{className:"border-t border-white/10 bg-black/40 p-2 space-y-2",children:[t.jsxs("div",{className:"flex items-center justify-between",children:[t.jsx(Me,{children:a?"Active Settings":"Free Camera"}),a&&t.jsx("button",{onClick:z,className:"text-[9px] text-gray-500 hover:text-white px-2 py-0.5 rounded border border-white/10 hover:bg-white/5 transition-colors",children:"Deselect"})]}),t.jsx("div",{className:"bg-white/5 rounded p-1",children:t.jsx(ne,{featureId:"optics"})}),t.jsx("div",{className:"border-t border-white/10 pt-2",children:t.jsx(Bt,{label:"Composition Guide",defaultOpen:!1,rightContent:d!=="none"?t.jsx("span",{className:"text-[8px] text-cyan-400",children:(k=Zo.find(P=>P.type===d))==null?void 0:k.label}):null,children:t.jsxs("div",{className:"mt-2 space-y-2",children:[t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsx("label",{className:"text-[9px] text-gray-500 w-16",children:"Type"}),t.jsx("select",{value:d,onChange:P=>u(P.target.value),className:"flex-1 t-select",children:Zo.map(P=>t.jsx("option",{value:P.type,children:P.label},P.type))})]}),d!=="none"&&t.jsxs(t.Fragment,{children:[t.jsx(de,{label:"Opacity",value:f.opacity,min:.1,max:1,step:.1,onChange:P=>p({opacity:P})}),t.jsx(de,{label:"Line Width",value:f.lineThickness,min:.5,max:3,step:.5,onChange:P=>p({lineThickness:P})}),t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsx("label",{className:"text-[9px] text-gray-500 w-16",children:"Color"}),t.jsx(ra,{color:f.color,onChange:P=>p({color:P})})]}),d==="grid"&&t.jsxs(t.Fragment,{children:[t.jsx(de,{label:"Divisions X",value:f.gridDivisionsX,min:2,max:16,step:1,onChange:P=>p({gridDivisionsX:P})}),t.jsx(de,{label:"Divisions Y",value:f.gridDivisionsY,min:2,max:16,step:1,onChange:P=>p({gridDivisionsY:P})})]}),d==="spiral"&&t.jsxs(t.Fragment,{children:[t.jsx(de,{label:"Rotation",value:f.spiralRotation,min:0,max:360,step:15,onChange:P=>p({spiralRotation:P})}),t.jsx(de,{label:"Position X",value:f.spiralPositionX,min:0,max:1,step:.05,onChange:P=>p({spiralPositionX:P})}),t.jsx(de,{label:"Position Y",value:f.spiralPositionY,min:0,max:1,step:.05,onChange:P=>p({spiralPositionY:P})}),t.jsx(de,{label:"Scale",value:f.spiralScale,min:.5,max:2,step:.1,onChange:P=>p({spiralScale:P})}),t.jsx(de,{label:"Ratio (Phi)",value:f.spiralRatio,min:1,max:2,step:.01,onChange:P=>p({spiralRatio:P})})]}),t.jsxs("div",{className:"flex items-center gap-3 pt-1",children:[t.jsxs("label",{className:"flex items-center gap-1 cursor-pointer",children:[t.jsx("input",{type:"checkbox",checked:f.showCenterMark,onChange:P=>p({showCenterMark:P.target.checked}),className:"w-3 h-3 accent-cyan-500 bg-gray-800 border-gray-600 rounded"}),t.jsx("span",{className:"text-[9px] text-gray-400",children:"Center"})]}),t.jsxs("label",{className:"flex items-center gap-1 cursor-pointer",children:[t.jsx("input",{type:"checkbox",checked:f.showSafeAreas,onChange:P=>p({showSafeAreas:P.target.checked}),className:"w-3 h-3 accent-cyan-500 bg-gray-800 border-gray-600 rounded"}),t.jsx("span",{className:"text-[9px] text-gray-400",children:"Safe Areas"})]})]})]})]})})})]})]})},Md=`
  /* 
   * --- GMT SHADER API REFERENCE ---
   * 
   * Available Uniforms:
   * float uParamA, uParamB, uParamC, uParamD, uParamE, uParamF; // The 6 Sliders
   * int uIterations;      // Iteration count
   * float uTime;          // Elapsed time in seconds
   * vec3 uJulia;          // Julia coordinates (if Julia mode active)
   * float uJuliaMode;     // 1.0 if active, 0.0 if not
   * 
   * Helper Functions:
   * void sphereFold(inout vec3 z, inout float dz, float minR, float fixedR);
   * void boxFold(inout vec3 z, inout float dz, float limit);
   * void dodecaFold(inout vec3 z);
   * vec3 bulbPow(vec3 z, float power);        // Spherical Power function
   * vec4 quatPow(vec4 q, float p);            // Quaternion Power
   * vec4 quatMult(vec4 q1, vec4 q2);          // Quaternion Multiplication
   * float snoise(vec3 v);                     // Simplex Noise (-1.0 to 1.0)
   * 
   * Input/Output:
   * z    : Current coordinate (vec4). .xyz is position, .w is auxiliary.
   * dr   : Running derivative (float). Used for distance estimation.
   * trap : Orbit trap accumulator (float). Used for coloring.
   * c    : The constant for the fractal (Julia value or Pixel position).
   */
`,zd=(e,o)=>{const{shader:a,...r}=e,n={...r,defaultPreset:o},s=l=>JSON.stringify(l,null,2).replace(/\{\n\s+"label":[\s\S]+?\}/g,c=>c.includes('"id": "param')?c.replace(/\n\s+/g," "):c).replace(/"(cameraPos|cameraRot|sceneOffset|julia|position)": \{\n\s+"[xyz]":[\s\S]+?\}/g,c=>c.replace(/\n\s+/g," ")).replace(/"params": \{\n\s+"A":[\s\S]+?\}/g,c=>c.replace(/\n\s+/g," "));let i=`<!-- 
  GMF: GPU Mandelbulb Format v1.0 
  A proprietary container for Fractal math definitions + default presets.
  You can edit the GLSL blocks below directly.
-->
${Md}
`;return i+=`<Metadata>
${s(n)}
</Metadata>

`,a.loopInit&&(i+=`<!-- Code executed once before the loop (Setup) -->
`,i+=`<Shader_Init>
${a.loopInit.trim()}
</Shader_Init>

`),i+=`<!-- Main Distance Estimator Function -->
`,i+=`<Shader_Function>
${a.function.trim()}
</Shader_Function>

`,i+=`<!-- The Iteration Loop Body -->
`,i+=`<Shader_Loop>
${a.loopBody.trim()}
</Shader_Loop>

`,a.getDist&&(i+=`<!-- Optional: Custom Distance/Iteration Smoothing -->
`,i+=`<Shader_Dist>
${a.getDist.trim()}
</Shader_Dist>

`),i},Br=e=>{const o=d=>{const u=new RegExp(`<${d}>([\\s\\S]*?)<\\/${d}>`),f=e.match(u);return f?f[1].trim():null},a=o("Metadata");if(!a){try{const d=JSON.parse(e);if(d.id&&d.shader)return d}catch{}throw new Error("Invalid GMF: Missing Metadata tag")}const r=JSON.parse(a),n=o("Shader_Function"),s=o("Shader_Loop"),i=o("Shader_Init"),l=o("Shader_Dist");if(!n||!s)throw new Error("Invalid GMF: Missing essential shader blocks (<Shader_Function> or <Shader_Loop>)");return{...r,shader:{function:n,loopBody:s,loopInit:i||void 0,getDist:l||void 0}}},ha=.01,Or=100,$r=Math.log(Or/ha),Cd=e=>Math.log(e/ha)/$r,kd=e=>ha*Math.exp(e*$r),jd=({value:e,onChange:o})=>{const a=ze.useRef(null),r=ze.useRef(!1),n=Cd(e)*100,s=d=>{const u=a.current;if(!u)return;const f=u.getBoundingClientRect(),p=Math.max(0,Math.min(1,(d-f.left)/f.width)),m=kd(p),x=Math.round(m*100)/100;o(Math.max(ha,Math.min(Or,x)))},i=d=>{d.preventDefault(),d.stopPropagation(),r.current=!0,d.target.setPointerCapture(d.pointerId),s(d.clientX)},l=d=>{r.current&&s(d.clientX)},c=()=>{r.current=!1};return t.jsxs("div",{ref:a,className:"relative h-[22px] cursor-pointer overflow-hidden",style:{backgroundImage:"repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.03) 5px, rgba(255,255,255,0.03) 10px)"},onPointerDown:i,onPointerMove:l,onPointerUp:c,children:[t.jsx("div",{className:"absolute inset-0 bg-white/[0.12]"}),t.jsx("div",{className:"absolute top-0 bottom-0 left-0 bg-cyan-500/20 transition-[width] duration-75 ease-out",style:{width:`${n}%`}}),t.jsxs("div",{className:"absolute inset-0 flex items-center justify-between px-2 pointer-events-none",children:[t.jsx("span",{className:"text-[10px] text-gray-400 font-medium",children:"Amount"}),t.jsxs("span",{className:"text-[10px] text-gray-300 tabular-nums",children:[e>=10?Math.round(e):e.toFixed(2),"%"]})]})]})},Pd=({onRandomizeParams:e,onRandomizeFull:o})=>{const[a,r]=ze.useState(100);return t.jsxs("div",{className:"py-0.5",children:[t.jsx("div",{className:"px-3 py-0.5",children:t.jsx(jd,{value:a,onChange:r})}),t.jsxs("button",{onClick:()=>e(a/100),className:"w-full text-left px-4 py-2 text-xs flex items-center gap-2 text-gray-300 hover:bg-white/10 hover:text-white transition-colors",children:[t.jsx(Cr,{})," Parameters"]}),t.jsxs("button",{onClick:()=>o(a/100),className:"w-full text-left px-4 py-2 text-xs flex items-center gap-2 text-gray-300 hover:bg-white/10 hover:text-white transition-colors",children:[t.jsx(rl,{})," Full (inc. Box/Julia)"]})]})};function Hr(){const e=E.getState(),o=ge.get(e.formula),a=o==null?void 0:o.defaultPreset,r=i=>{const l=E.getState(),c=ge.get(l.formula);l.handleInteractionStart("param");const d={};if(l.formula==="Modular"){const f=l.coreMath,p=m=>m+(Math.random()*4-2)*i;d.paramA=p(f.paramA),d.paramB=p(f.paramB),d.paramC=p(f.paramC),d.paramD=p(f.paramD),d.paramE=p(f.paramE),d.paramF=p(f.paramF),l.setCoreMath(d),l.handleInteractionEnd();return}if(!c){l.handleInteractionEnd();return}const u=l.coreMath;c.parameters.forEach(f=>{if(!f)return;const p=f.max-f.min;if(f.type==="vec3"){const m=u[f.id]||{x:0,y:0,z:0};d[f.id]={x:Math.max(f.min,Math.min(f.max,m.x+(Math.random()*2-1)*p*i)),y:Math.max(f.min,Math.min(f.max,m.y+(Math.random()*2-1)*p*i)),z:Math.max(f.min,Math.min(f.max,m.z+(Math.random()*2-1)*p*i))}}else if(f.type==="vec2"){const m=u[f.id]||{x:0,y:0};d[f.id]={x:Math.max(f.min,Math.min(f.max,m.x+(Math.random()*2-1)*p*i)),y:Math.max(f.min,Math.min(f.max,m.y+(Math.random()*2-1)*p*i))}}else if(i>=1){const m=Math.random()*p+f.min;d[f.id]=f.step>0?Math.round(m/f.step)*f.step:m}else{const x=(u[f.id]??(f.min+f.max)/2)+(Math.random()*2-1)*p*i,C=Math.max(f.min,Math.min(f.max,x));d[f.id]=f.step>0?Math.round(C/f.step)*f.step:C}}),l.setCoreMath(d),l.handleInteractionEnd()},n=i=>{r(i);const l=E.getState(),c=l.geometry,d={};c.hybridMode&&(d.hybridScale=i>=1?1.5+Math.random()*1.5:Math.max(1,Math.min(3,c.hybridScale+(Math.random()*2-1)*2*i)),d.hybridMinR=i>=1?Math.random()*1:Math.max(0,Math.min(1.5,c.hybridMinR+(Math.random()*2-1)*1.5*i)),d.hybridFixedR=i>=1?.5+Math.random()*1.5:Math.max(.1,Math.min(3,c.hybridFixedR+(Math.random()*2-1)*2.9*i)),d.hybridFoldLimit=i>=1?.5+Math.random()*1.5:Math.max(.1,Math.min(2,c.hybridFoldLimit+(Math.random()*2-1)*1.9*i))),c.juliaMode&&(d.juliaX=i>=1?Math.random()*4-2:Math.max(-2,Math.min(2,c.juliaX+(Math.random()*2-1)*4*i)),d.juliaY=i>=1?Math.random()*4-2:Math.max(-2,Math.min(2,c.juliaY+(Math.random()*2-1)*4*i)),d.juliaZ=i>=1?Math.random()*4-2:Math.max(-2,Math.min(2,c.juliaZ+(Math.random()*2-1)*4*i))),c.preRotEnabled&&(d.preRotX=i>=1?(Math.random()*2-1)*Math.PI:Math.max(-Math.PI,Math.min(Math.PI,c.preRotX+(Math.random()*2-1)*Math.PI*2*i)),d.preRotY=i>=1?(Math.random()*2-1)*Math.PI:Math.max(-Math.PI,Math.min(Math.PI,c.preRotY+(Math.random()*2-1)*Math.PI*2*i)),d.preRotZ=i>=1?(Math.random()*2-1)*Math.PI:Math.max(-Math.PI,Math.min(Math.PI,c.preRotZ+(Math.random()*2-1)*Math.PI*2*i))),Object.keys(d).length>0&&l.setGeometry(d)};return[{label:"Import Options",action:()=>{},isHeader:!0},{label:"Lock Scene Settings",checked:e.lockSceneOnSwitch,action:()=>e.setLockSceneOnSwitch(!e.lockSceneOnSwitch)},{label:"Randomize",action:()=>{},isHeader:!0},{element:ze.createElement(Pd,{onRandomizeParams:r,onRandomizeFull:n}),keepOpen:!0,action:()=>{}},{label:"Formula Parameters",action:()=>{},isHeader:!0},{label:"Reset to Default",action:()=>{var l,c,d,u;const i=e.getPreset();e.handleInteractionStart("param"),e.loadPreset({...i,paramA:0,paramB:0,paramC:0,paramD:0,paramE:0,paramF:0,vec2A:[0,0],vec2B:[0,0],vec2C:[0,0],vec3A:[0,0,0],vec3B:[0,0,0],vec3C:[0,0,0],features:{...i.features,coreMath:((l=a==null?void 0:a.features)==null?void 0:l.coreMath)||((c=i.features)==null?void 0:c.coreMath),geometry:((d=a==null?void 0:a.features)==null?void 0:d.geometry)||((u=i.features)==null?void 0:u.geometry)}}),e.handleInteractionEnd()}},{label:"Reset to Formula Preset",action:()=>{var l,c,d,u,f,p,m,x,C;if(!a)return;const i=e.getPreset();e.handleInteractionStart("param"),e.loadPreset({...a,cameraPos:i.cameraPos,cameraRot:i.cameraRot,sceneOffset:i.sceneOffset,targetDistance:i.targetDistance,cameraMode:i.cameraMode,lights:i.lights,features:{...a.features||{},atmosphere:(l=i.features)==null?void 0:l.atmosphere,lighting:(c=i.features)==null?void 0:c.lighting,optics:(d=i.features)==null?void 0:d.optics,materials:(u=i.features)==null?void 0:u.materials,coreMath:(f=a.features)==null?void 0:f.coreMath,geometry:(p=a.features)==null?void 0:p.geometry,coloring:(m=a.features)==null?void 0:m.coloring,texturing:(x=a.features)==null?void 0:x.texturing,quality:(C=a.features)==null?void 0:C.quality}}),e.handleInteractionEnd()},disabled:!a},{label:"Scene Parameters",action:()=>{},isHeader:!0},{label:"Reset to Default",action:()=>{var c,d,u,f,p;const i=e.getPreset();e.handleInteractionStart("camera"),e.resetCamera();const l=(c=ge.get("Mandelbulb"))==null?void 0:c.defaultPreset;l&&e.loadPreset({...i,cameraPos:l.cameraPos,cameraRot:l.cameraRot,sceneOffset:l.sceneOffset,targetDistance:l.targetDistance,features:{...i.features,atmosphere:(d=l.features)==null?void 0:d.atmosphere,lighting:(u=l.features)==null?void 0:u.lighting,optics:(f=l.features)==null?void 0:f.optics,materials:(p=l.features)==null?void 0:p.materials}}),e.handleInteractionEnd()}},{label:"Reset to Formula Preset",action:()=>{var l,c,d,u;if(!a)return;const i=e.getPreset();e.handleInteractionStart("camera"),e.loadPreset({...i,cameraPos:a.cameraPos,cameraRot:a.cameraRot,sceneOffset:a.sceneOffset,targetDistance:a.targetDistance,cameraMode:a.cameraMode,lights:a.lights,features:{...i.features,atmosphere:(l=a.features)==null?void 0:l.atmosphere,lighting:(c=a.features)==null?void 0:c.lighting,optics:(d=a.features)==null?void 0:d.optics,materials:(u=a.features)==null?void 0:u.materials}}),e.handleInteractionEnd()},disabled:!a}]}const Gr={id:"Mandelbulb",name:"Mandelbulb",shortDescription:"The classic 3D extension of the Mandelbrot set. Features organic, broccoli-like recursive structures.",description:'The classic 3D extension of the Mandelbrot set. Features standard Power controls plus the "Radiolaria" mutation for skeletal/hollow effects.',shader:{function:`
        void formula_Mandelbulb(inout vec4 z, inout float dr, inout float trap, vec4 c) {
            vec3 z3 = z.xyz;
            float r = length(z3);
            
            // Standard derivative — reuse pow(r, power-1) for both dr and zr
            float power = uParamA;
            float rp1 = pow(r, power - 1.0);
            dr = rp1 * power * dr + 1.0;

            // Spherical exponentiation
            float theta = acos(clamp(z3.z / r, -1.0, 1.0));
            float phi = atan(z3.y, z3.x);

            // Apply Power & Phase Shifts
            theta = theta * power + uVec2A.x;
            phi = phi * power + uVec2A.y;

            float zr = rp1 * r;
            z3 = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
            
            // Optional Z-Twist (Param D)
            if (abs(uParamD) > 0.001) {
                float twist = z3.z * uParamD;
                float s = sin(twist);
                float c_ = cos(twist);
                z3.xy = mat2(c_, -s, s, c_) * z3.xy;
            }

            z3 += c.xyz;
            
            // --- RADIOLARIA MUTATION (Tom Beddard) ---
            // Applied AFTER iteration to affect the triplex structure, not the world bounding box.
            // vec2B.x = toggle (on/off), vec2B.y = limit value
            if (uVec2B.x > 0.5) {
                z3.y = min(z3.y, uVec2B.y);
            }
            
            z.xyz = z3;
            trap = min(trap, length(z3));
        }`,loopBody:"formula_Mandelbulb(z, dr, trap, c);"},parameters:[{label:"Power",id:"paramA",min:2,max:16,step:.001,default:8},{label:"Phase (θ, φ)",id:"vec2A",type:"vec2",min:-6.28,max:6.28,step:.1,default:{x:0,y:0},scale:"pi"},{label:"Z Twist",id:"paramD",min:-2,max:2,step:.01,default:0},{label:"Radiolaria",id:"vec2B",type:"vec2",min:-2,max:2,step:.01,default:{x:0,y:.5},mode:"mixed"}],defaultPreset:{formula:"Mandelbulb",features:{coreMath:{iterations:16,paramA:8,paramD:0,vec2A:{x:0,y:0},vec2B:{x:0,y:.5}},geometry:{hybridMode:!1,hybridIter:0,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1,hybridSkip:1,hybridSwap:!1,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0},coloring:{mode:0,repeats:2,phase:0,scale:1,offset:0,bias:1,twist:0,escape:1.2,mode2:4,repeats2:7,phase2:0,blendMode:0,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:20,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,gradient:[{id:"2",position:1,color:"#FFFFFF",bias:.5,interpolation:"linear"}],gradient2:[{id:"1767363622003",position:0,color:"#FFFFFF",bias:.5,interpolation:"linear"},{id:"1",position:.5,color:"#000000",bias:.5,interpolation:"linear"},{id:"1767363615540",position:1,color:"#FFFFFF",bias:.5,interpolation:"linear"}]},texturing:{active:!1,scaleX:1,scaleY:1,offset:{x:0,y:0},mapU:6,mapV:1,layer1Data:null},atmosphere:{fogNear:0,fogFar:5,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:50,glowColor:"#ffffff",glowMode:!1},ao:{aoIntensity:.28,aoSpread:.5,aoMode:!1,aoEnabled:!0,aoSamples:5,aoStochasticCp:!0},materials:{reflection:.2,specular:1,roughness:.75,diffuse:1,envStrength:.3,rim:0,rimExponent:3,emission:0,emissionMode:0,emissionColor:"#ffffff",envMapVisible:!1,useEnvMap:!0,envSource:1,envGradientStops:[{id:"hor",position:0,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}]},lighting:{shadows:!0,shadowSoftness:16,shadowIntensity:1,shadowBias:.001},quality:{detail:1,fudgeFactor:1,pixelThreshold:.2,maxSteps:300,distanceMetric:0,estimator:0},optics:{dofStrength:0,dofFocus:2},colorGrading:{saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1}},cameraPos:{x:0,y:0,z:2.157},cameraRot:{x:0,y:0,z:0,w:1},sceneOffset:{x:0,y:0,z:1,xL:0,yL:0,zL:-.157},targetDistance:2.157,cameraMode:"Orbit",lights:[{type:"Point",position:{x:-.7,y:.37,z:1.4},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:3,falloff:.22,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.6,y:-.5,z:1.4},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:0,y:-5,z:2},rotation:{x:0,y:0,z:0},color:"#0088ff",intensity:.25,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!0,castShadow:!1}],renderMode:"Direct",navigation:{flySpeed:.5,autoSlow:!0},animations:[],sequence:{durationFrames:300,fps:30,tracks:{}},duration:300}},Vr={id:"Mandelbar3D",name:"Mandelbar 3D",shortDescription:"The 3D Tricorn. Features heavy shelving and tri-corner symmetry.",description:"The 3D extension of the Tricorn (Mandelbar) fractal: x²-y²-z², 2xy, -2xz. The conjugation on z creates the distinctive tri-corner symmetry. Supports rotation, offset, and twist.",shader:{preamble:`
    // Mandelbar3D: Pre-calculated rotation (computed once per frame)
    vec3 uMbar_rotAxis = vec3(0.0, 1.0, 0.0);
    float uMbar_rotCos = 1.0;
    float uMbar_rotSin = 0.0;

    void Mandelbar3D_precalcRotation() {
        if (abs(uVec3B.z) > 0.001) {
            float azimuth = uVec3B.x;
            float pitch = uVec3B.y;
            float rotAngle = uVec3B.z * 0.5;
            float cosPitch = cos(pitch);
            uMbar_rotAxis = vec3(
                cosPitch * sin(azimuth),
                sin(pitch),
                cosPitch * cos(azimuth)
            );
            uMbar_rotSin = sin(rotAngle);
            uMbar_rotCos = cos(rotAngle);
        }
    }`,function:`
    void formula_Mandelbar3D(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        // Param F: Twist
        if (abs(uParamF) > 0.001) {
            float ang = z3.z * uParamF;
            float s = sin(ang); float co = cos(ang);
            z3.xy = mat2(co, -s, s, co) * z3.xy;
        }

        // Vec3B: Rotation using pre-calculated Rodrigues
        if (abs(uVec3B.z) > 0.001) {
            z3 = z3 * uMbar_rotCos + cross(uMbar_rotAxis, z3) * uMbar_rotSin
                 + uMbar_rotAxis * dot(uMbar_rotAxis, z3) * (1.0 - uMbar_rotCos);
        }

        float x = z3.x; float y = z3.y; float z_ = z3.z;
        z3.x = x*x - y*y - z_*z_;
        z3.y = 2.0 * x * y;
        z3.z = -2.0 * x * z_;

        float r = length(vec3(x,y,z_));
        dr = 2.0 * r * dr + 1.0;

        // Scale (A)
        float scale = uParamA;
        z3 = z3 * scale + c.xyz;

        // Vec3A: Offset X/Y/Z
        z3 += uVec3A;

        dr *= abs(scale);
        z.xyz = z3;
        trap = min(trap, dot(z3,z3));
    }`,loopBody:"formula_Mandelbar3D(z, dr, trap, c);",loopInit:"Mandelbar3D_precalcRotation();"},parameters:[{label:"Scale",id:"paramA",min:.5,max:3,step:.001,default:1},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Offset",id:"vec3A",type:"vec3",min:-2,max:2,step:.001,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"Mandelbar3D",features:{coreMath:{iterations:26,paramA:1.303,paramF:0,vec3A:{x:.309,y:0,z:0},vec3B:{x:0,y:0,z:0}},coloring:{mode:6,repeats:1,phase:0,scale:1,offset:0,bias:1,twist:0,escape:4,mode2:5,repeats2:1,phase2:0,blendMode:2,blendOpacity:1,twist2:0,layer3Color:"#ffffff",layer3Scale:2,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,gradient:[{id:"1766240207225_0",position:0,color:"#3d5941",bias:.5,interpolation:"linear"},{id:"1766240207225_1",position:.167,color:"#778868",bias:.5,interpolation:"linear"},{id:"1766240207225_2",position:.333,color:"#b5b991",bias:.5,interpolation:"linear"},{id:"1766240207225_3",position:.5,color:"#f6edbd",bias:.5,interpolation:"linear"},{id:"1766240207225_4",position:.667,color:"#edbb8a",bias:.5,interpolation:"linear"},{id:"1766240207225_5",position:.833,color:"#de8a5a",bias:.5,interpolation:"linear"},{id:"1766240207225_6",position:1,color:"#ca562c",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:.61,color:"#FFFFFF"},{id:"2",position:.88,color:"#FF0505"}]},atmosphere:{fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:1e-4,glowSharpness:1,glowColor:"#ffffff",glowMode:!1,aoIntensity:.37,aoSpread:.1},materials:{reflection:.35,specular:0,roughness:.38,diffuse:0,envStrength:0,rim:0,rimExponent:2,emission:2.59,emissionColor:"#ffffff",emissionMode:0},geometry:{juliaMode:!1,juliaX:.04,juliaY:-.12,juliaZ:-.24},lighting:{shadows:!0,shadowSoftness:78,shadowIntensity:1,shadowBias:0},quality:{detail:1.17,fudgeFactor:.7,pixelThreshold:.13,aaMode:"Auto",aaLevel:1}},cameraPos:{x:-.9750951483888902,y:.4967096298390524,z:-1.878572142465631},cameraRot:{x:-.35319547668295764,y:.8984954585062485,z:.19510512782513617,w:-.17289550425237224},sceneOffset:{x:0,y:0,z:0,xL:-.003768067067355675,yL:.19239495665458275,zL:-.5314800136479048},lights:[{type:"Point",position:{x:-.34,y:.2,z:1.76},rotation:{x:0,y:0,z:0},color:"#99A4FF",intensity:5,falloff:61.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#ff0000",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#0000ff",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},Ur={id:"Quaternion",name:"Quaternion",shortDescription:'A 3D slice of a 4D Julia set. Use the "Slice W" and Rotations to morph the object.',description:"A 4D Julia set projected into 3D. Features 4D rotations, iteration damping for smooth variants, and optional spherical inversion (Kosalos) for inside-out effects.",shader:{function:`
    vec4 quatSquare(vec4 q) {
        return vec4(q.x*q.x - q.y*q.y - q.z*q.z - q.w*q.w, 2.0*q.x*q.y, 2.0*q.x*q.z, 2.0*q.x*q.w);
    }

    void formula_Quaternion(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        // 3D Rotations (vec2A: XY, XZ)
        float angXY = uVec2A.x;
        if (abs(angXY) > 0.0) {
            float s = sin(angXY), c_ = cos(angXY);
            z.xy = mat2(c_, -s, s, c_) * z.xy;
        }

        float angXZ = uVec2A.y;
        if (abs(angXZ) > 0.0) {
            float s = sin(angXZ), c_ = cos(angXZ);
            z.xz = mat2(c_, -s, s, c_) * z.xz;
        }

        // 4D Rotations (vec2B: XW, YW)
        float angXW = uVec2B.x;
        if (abs(angXW) > 0.0) {
            float s = sin(angXW), c_ = cos(angXW);
            vec2 xw = vec2(z.x, z.w);
            xw = mat2(c_, -s, s, c_) * xw;
            z.x = xw.x; z.w = xw.y;
        }

        float angYW = uVec2B.y;
        if (abs(angYW) > 0.0) {
            float s = sin(angYW), c_ = cos(angYW);
            vec2 yw = vec2(z.y, z.w);
            yw = mat2(c_, -s, s, c_) * yw;
            z.y = yw.x; z.w = yw.y;
        }

        // Save pre-iteration state for damping
        vec4 oldZ = z;

        // Chain Rule: Magnitude increases by 2*|z| + 1 (from +c)
        dr = 2.0 * length(z) * dr + 1.0;
        z = quatSquare(z) + c;

        // Iteration Damping (Kosalos variant)
        // Adds momentum feedback: smooths iteration trajectory
        if (abs(uParamC) > 0.001) {
            float den = 2.0 + abs(uParamC) * 100.0;
            z += (z - oldZ) / den;
        }

        trap = min(trap, dot(z,z));
    }`,loopBody:"formula_Quaternion(z, dr, trap, c);",loopInit:`
        // Spherical Inversion pre-transform (Kosalos variant)
        // Inverts space around a center point, creating inside-out shapes
        // Smooth blend: mix between original and inverted based on radius
        if (uParamD > 0.001) {
            vec3 invCenter = uVec3A;
            float invRadius = uParamD;
            float invAngle = uParamE;
            vec3 offset = z.xyz - invCenter;
            float r = length(offset);
            float r2 = max(r * r, 1.0e-8);
            vec3 inverted = (invRadius * invRadius / r2) * offset + invCenter;
            // Smooth blend: ramp from 0..1 over radius 0..1 to avoid hard pop
            float blend = smoothstep(0.0, 1.0, invRadius);
            z.xyz = mix(z.xyz, inverted, blend);
            // Optional angular twist
            if (abs(invAngle) > 0.001) {
                float an = atan(z.y, z.x) + invAngle;
                float ra = length(z.xy);
                z.x = cos(an) * ra;
                z.y = sin(an) * ra;
            }
            // Re-derive c after inversion (position changed)
            c = mix(vec4(z.xyz, uParamB), vec4(uJulia, uParamA), step(0.5, uJuliaMode));
        }`},parameters:[{label:"Julia C (W)",id:"paramA",min:-1,max:1,step:.001,default:-.252},{label:"Slice W",id:"paramB",min:-1,max:1,step:.001,default:-.222},{label:"Damping",id:"paramC",min:0,max:5,step:.01,default:0},{label:"Inversion Radius",id:"paramD",min:0,max:10,step:.01,default:0},{label:"Inversion Angle",id:"paramE",min:-10,max:10,step:.01,default:0},{label:"Rot 3D (XY, XZ)",id:"vec2A",type:"vec2",min:-6.28,max:6.28,step:.01,default:{x:-6.44,y:.29},scale:"pi"},{label:"Rot 4D (XW, YW)",id:"vec2B",type:"vec2",min:-6.28,max:6.28,step:.01,default:{x:-.21,y:.05},scale:"pi"},{label:"Inversion Center",id:"vec3A",type:"vec3",min:-5,max:5,step:.01,default:{x:.612,y:.381,z:.786}}],defaultPreset:{formula:"Quaternion",features:{coreMath:{iterations:20,paramA:-.252,paramB:-.222,paramC:0,paramD:0,paramE:0,vec2A:{x:-6.44,y:.29},vec2B:{x:-.21,y:.05},vec3A:{x:.612,y:.381,z:.786}},coloring:{mode:6,repeats:1,phase:.73,scale:1,offset:.73,bias:1,twist:0,escape:54.95,mode2:4,repeats2:1,phase2:0,blendMode:0,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:2,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,gradient:[{id:"1766241181174_0",position:0,color:"#DA9F1C",bias:.5,interpolation:"linear"},{id:"1766241181174_1",position:.167,color:"#FA752D",bias:.5,interpolation:"linear"},{id:"1766241181174_2",position:.333,color:"#F0483F",bias:.5,interpolation:"linear"},{id:"1766241181174_3",position:.5,color:"#E3264F",bias:.5,interpolation:"linear"},{id:"1766241181174_4",position:.667,color:"#DC266B",bias:.5,interpolation:"linear"},{id:"1766241181174_5",position:.833,color:"#b9257a",bias:.5,interpolation:"linear"},{id:"1766241181174_6",position:1,color:"#7c1d6f",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#FFFFFF"}]},atmosphere:{fogNear:0,fogFar:100,fogColor:"#000000",fogDensity:0,glowIntensity:.23,glowSharpness:3.8,glowColor:"#ffffff",glowMode:!1,aoIntensity:0,aoSpread:2},materials:{reflection:.32,specular:.47,roughness:.5,diffuse:2,envStrength:0,rim:0,rimExponent:3.6,emission:1e-4,emissionColor:"#ffffff",emissionMode:0},geometry:{juliaMode:!0,juliaX:.65,juliaY:-.2,juliaZ:-1.2,hybridMode:!1,hybridIter:2,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1},lighting:{shadows:!0,shadowSoftness:16,shadowIntensity:1,shadowBias:.002},quality:{detail:1,fudgeFactor:.8,pixelThreshold:.5,maxSteps:300,aaMode:"Always",aaLevel:1},optics:{dofStrength:0,dofFocus:10}},cameraPos:{x:-2.448955788675867,y:.7723538718365539,z:.32605384095213635},cameraRot:{x:-.1135398122615654,y:-.6512503200884421,z:-.09942502462227083,w:.7437045085887076},cameraFov:60,sceneOffset:{x:0,y:0,z:0,xL:-.5453734613707567,yL:.10050638429037613,zL:-.211008843702685},cameraMode:"Orbit",lights:[{type:"Point",position:{x:-2.0026065897203154,y:.7668302923678636,z:.21579993050482316},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:1,falloff:1,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#ff0000",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#0000ff",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}],animations:[{id:"4yFFplV3QPo3KoNaGJwfX",enabled:!1,target:"coreMath.paramA",shape:"Sine",period:5,amplitude:1,baseValue:-.252,phase:0,smoothing:.5}]}},Wr={id:"AmazingBox",name:"Amazing Box",shortDescription:"Architectural fractal discovered by Tglad. Creates complex geometric lattices and Borg-like structures.",description:"Also known as the Mandelbox (Tglad). A folding fractal that creates complex, machine-like architectural structures.",shader:{function:`
    void formula_AmazingBox(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        // Pre-Fold Rotation (vec3A = Rot X/Y/Z)
        vec3 rot = uVec3A;
        if (length(rot) > 0.001) {
             float sx = sin(rot.x), cx = cos(rot.x);
             float sy = sin(rot.y), cy = cos(rot.y);
             float sz = sin(rot.z), cz = cos(rot.z);
             mat2 rotX = mat2(cx, -sx, sx, cx);
             mat2 rotY = mat2(cy, -sy, sy, cy);
             mat2 rotZ = mat2(cz, -sz, sz, cz);
             z3.yz = rotX * z3.yz;
             z3.xz = rotY * z3.xz;
             z3.xy = rotZ * z3.xy;
        }

        boxFold(z3, dr, uParamC);
        sphereFold(z3, dr, uParamB, uParamD);
        z.xyz = z3 * uParamA + c.xyz;
        dr = dr * abs(uParamA) + 1.0;
        trap = min(trap, abs(z.x));
    }`,loopBody:"formula_AmazingBox(z, dr, trap, c);"},parameters:[{label:"Scale",id:"paramA",min:1,max:4,step:.001,default:2},{label:"Min Radius",id:"paramB",min:0,max:1.5,step:.001,default:.5},{label:"Folding Limit",id:"paramC",min:.1,max:2,step:.001,default:1},{label:"Fixed Radius",id:"paramD",min:.1,max:3,step:.001,default:1},{label:"Pre-Rotation",id:"vec3A",type:"vec3",min:-6.28,max:6.28,step:.001,default:{x:0,y:0,z:0}}],defaultPreset:{formula:"AmazingBox",features:{coreMath:{iterations:21,paramA:2.566,paramB:1.026,paramC:1.445,paramD:1.637,vec3A:{x:3.14,y:0,z:1.57}},geometry:{juliaMode:!1,juliaX:.35,juliaY:.25,juliaZ:.15},atmosphere:{fogIntensity:1,fogColor:"#6DBAB7",fogNear:.7921,fogFar:7.5076,fogDensity:0,glowIntensity:1e-4,glowSharpness:1,aoIntensity:.32,aoSpread:.2925,aoMode:!1},materials:{diffuse:1.13,reflection:0,specular:2,roughness:.2,rim:0,rimExponent:1,emission:1e-4,envStrength:0,envMapVisible:!1},coloring:{mode:3,scale:113.5,offset:-5.465,repeats:69.1,phase:.36,bias:1,escape:32.06,gradient:[{id:"0",position:0,color:"#d3f2a3"},{id:"1",position:.167,color:"#97e196"},{id:"2",position:.333,color:"#6cc08b"},{id:"3",position:.5,color:"#4c9b82"},{id:"4",position:.667,color:"#217a79"},{id:"5",position:.833,color:"#105965"},{id:"6",position:1,color:"#074050"}],mode2:8,repeats2:96.2,phase2:-2.898,blendMode:6,gradient2:[{id:"0",position:0,color:"#ffffff"},{id:"1",position:.293,color:"#000000"},{id:"2",position:.903,color:"#ffffff"}],layer3Scale:89,layer3Strength:0},lighting:{shadows:!0,shadowSoftness:2e3,shadowIntensity:1,shadowBias:.0029},quality:{fudgeFactor:.5,detail:2,pixelThreshold:.5,maxSteps:300,distanceMetric:1,estimator:1},optics:{camType:0,camFov:60,orthoScale:17.5}},cameraPos:{x:.95989,y:1.13902,z:1.1791},cameraRot:{x:-.235,y:.3667,z:.2665,w:.8598},sceneOffset:{x:1,y:1,z:3,xL:-.65997,yL:-.75248,zL:-.10163},targetDistance:1.9,cameraMode:"Orbit",lights:[{type:"Point",position:{x:-.774,y:.079,z:3.089},rotation:{x:0,y:0,z:0},color:"#FFFFFF",intensity:50,falloff:50,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#ff0000",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#0000ff",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}],animations:[{id:"4yFFplV3QPo3KoNaGJwfX",enabled:!1,target:"coreMath.paramA",shape:"Sine",period:5,amplitude:1,baseValue:2.566,phase:0,smoothing:.5}]}},qr={id:"MengerSponge",name:"Menger Sponge",shortDescription:"The classic cubic fractal. Creates infinite grids and tech-like structures.",description:'The canonical Menger Sponge (Level N). Set Scale to 3.0 and Offset to 1.0 for the classic mathematical shape. Use "Center Z" to toggle between a corner fractal and the full cube.',shader:{function:`
    void formula_MengerSponge(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        // Rotation (vec3A = Rot X/Y/Z)
        vec3 rot = uVec3A;
        if (length(rot) > 0.001) {
             float sx = sin(rot.x), cx = cos(rot.x);
             float sy = sin(rot.y), cy = cos(rot.y);
             float sz = sin(rot.z), cz = cos(rot.z);
             mat2 rotX = mat2(cx, -sx, sx, cx);
             mat2 rotY = mat2(cy, -sy, sy, cy);
             mat2 rotZ = mat2(cz, -sz, sz, cz);
             z3.yz = rotX * z3.yz;
             z3.xz = rotY * z3.xz;
             z3.xy = rotZ * z3.xy;
        }

        z3 = abs(z3);
        // Branchless sorting network (descending: x >= y >= z)
        vec3 s = z3;
        z3.x = max(max(s.x, s.y), s.z);
        z3.z = min(min(s.x, s.y), s.z);
        z3.y = s.x + s.y + s.z - z3.x - z3.z;
        
        float scale = (abs(uParamA - 1.0) < 0.001) ? 1.001 : uParamA;
        float offset = uParamB;
        
        // IFS Shift: offset * (scale - 1.0)
        float shift = offset * (scale - 1.0);
        
        z3 = z3 * scale - vec3(shift);
        
        // Param D: Center Z (The "Full Sponge" Correction)
        // If active, this conditional shift restores the full cubic symmetry
        if (uParamD > 0.5) {
            z3.z += shift * step(z3.z, -0.5 * shift);
        }

        // Param C: Manual Z Shift (Axis Shift)
        if (abs(uParamC) > 0.001) {
            z3.z += uParamC * scale;
        }

        if (uJuliaMode > 0.5) z3 += c.xyz * 0.1;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, length(z3 - c.xyz));
    }`,loopBody:"formula_MengerSponge(z, dr, trap, c);"},parameters:[{label:"Scale",id:"paramA",min:1,max:4,step:.001,default:3},{label:"Offset",id:"paramB",min:0,max:2,step:.001,default:1},{label:"Rotation",id:"vec3A",type:"vec3",min:-6.28,max:6.28,step:.001,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Z Shift (Man)",id:"paramC",min:-1,max:1,step:.01,default:0},{label:"Center Z",id:"paramD",min:0,max:1,step:1,default:1}],defaultPreset:{formula:"MengerSponge",features:{coreMath:{iterations:10,paramA:3,paramB:1.013,paramC:.02,paramD:1,vec3A:{x:.031,y:0,z:0}},coloring:{gradient:[{id:"1767569325432_0",position:0,color:"#3d5941",bias:.5,interpolation:"linear"},{id:"1767569325432_1",position:.167,color:"#778868",bias:.5,interpolation:"linear"},{id:"1767569325432_2",position:.333,color:"#b5b991",bias:.5,interpolation:"linear"},{id:"1767569325432_3",position:.5,color:"#f6edbd",bias:.5,interpolation:"linear"},{id:"1767569325432_4",position:.667,color:"#edbb8a",bias:.5,interpolation:"linear"},{id:"1767569325432_5",position:.833,color:"#de8a5a",bias:.5,interpolation:"linear"},{id:"1767569325432_6",position:1,color:"#ca562c",bias:.5,interpolation:"linear"}],mode:6,scale:3.099,offset:-.194,repeats:3.1,phase:-.19,bias:1,twist:0,escape:1.9,gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}],mode2:5,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:0,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:10,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},ao:{aoIntensity:.5,aoSpread:5,aoMode:!0,aoEnabled:!0},atmosphere:{fogIntensity:0,fogNear:2,fogFar:10,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:0,glowMode:!1,glowColor:"#ffffff"},materials:{diffuse:1,reflection:0,specular:.2,roughness:.8,rim:0,rimExponent:4,envStrength:0,envBackgroundStrength:1,envSource:1,useEnvMap:!1,envRotation:0,emission:0,emissionMode:0,emissionColor:"#ffffff",envGradientStops:[]},colorGrading:{saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1},lighting:{shadows:!0,shadowSoftness:2e3,shadowIntensity:.8,shadowBias:.001},quality:{fudgeFactor:1,detail:1,pixelThreshold:.001,maxSteps:200,estimator:1},optics:{camFov:50,dofStrength:0,dofFocus:10},reflections:{enabled:!0,bounces:1,steps:64,mixStrength:1,roughnessThreshold:.5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.3055326162805782,y:-.23752826799481133,z:-.07899585109054458,w:.9186891736613698},sceneOffset:{x:-1,y:2,z:3.12,xL:-.393,yL:.188,zL:-.252},targetDistance:2.622,cameraMode:"Orbit",lights:[{type:"Point",position:{x:-.969,y:1.465,z:1.325},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:5,falloff:0,falloffType:"Linear",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:-4,y:-2,z:1},rotation:{x:0,y:0,z:0},color:"#3344ff",intensity:.5,falloff:0,falloffType:"Linear",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:2.069,y:1.017,z:2.748},rotation:{x:0,y:0,z:0},color:"#ff3300",intensity:.3,falloff:0,falloffType:"Linear",fixed:!1,visible:!1,castShadow:!0}],animations:[]}},Xr={id:"Kleinian",name:"Kleinian",shortDescription:"Inversion fractal. Resembles organic structures, coral, and sponge tissues.",description:"Based on Kleinian groups and inversion in a sphere. Creates intricate, bubbly, sponge-like structures.",shader:{function:`
        void formula_Kleinian(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;
        float limit = uParamB;
        z3 = clamp(z3, -limit, limit) * 2.0 - z3;
        float r2 = max(dot(z3, z3), 1e-10);
        float k = max(uParamC / r2, 1.0);
        z3 *= k;
        dr *= k;
        
        // Apply Scale (A) and Offset (vec3A)
        z3 = z3 * uParamA + uVec3A + c.xyz;
        dr = dr * abs(uParamA) + 1.0;
        
        z.xyz = z3;
        trap = min(trap, r2);
    }`,loopBody:"formula_Kleinian(z, dr, trap, c);"},parameters:[{label:"Scale",id:"paramA",min:1,max:2.5,step:.001,default:1.8},{label:"Offset",id:"vec3A",type:"vec3",min:-2,max:2,step:.001,default:{x:0,y:0,z:0}},{label:"Fold Size",id:"paramB",min:0,max:2,step:.001,default:1},{label:"K Factor",id:"paramC",min:.5,max:2,step:.001,default:1.2}],defaultPreset:{formula:"Kleinian",features:{coreMath:{iterations:53,paramA:2.058,paramB:.907,paramC:.976,vec3A:{x:0,y:0,z:0}},coloring:{mode:3,repeats:100,phase:0,scale:126.58,offset:67.08,bias:1,twist:0,escape:2,mode2:0,repeats2:100,phase2:0,blendMode:3,blendOpacity:1,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:.2,layer3Turbulence:0,gradient:[{id:"2",position:0,color:"#FFFFFF",bias:.5,interpolation:"linear"},{id:"1",position:.8275862068965517,color:"#3E3E3E",bias:.5,interpolation:"linear"},{id:"1767121500027",position:1,color:"#FFFFFF",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:0,color:"#000000",bias:.5,interpolation:"linear"},{id:"2",position:1,color:"#ffffff",bias:.5,interpolation:"linear"}]},texturing:{active:!1,scaleX:1,scaleY:1,offset:{x:0,y:0},mapU:6,mapV:1,layer1Data:null},materials:{reflection:0,specular:0,roughness:.79,diffuse:2,envStrength:0,rim:0,rimExponent:1,emission:.148,emissionColor:"#ffffff",emissionMode:0,envMapVisible:!1,envSource:1,useEnvMap:!0,envRotation:0,envGradientStops:[{id:"1767120246151",position:0,color:"#88ccff",bias:.5,interpolation:"linear"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:.9454191033138402,color:"#88ccff",bias:.5,interpolation:"smooth"}]},atmosphere:{fogIntensity:1,fogNear:1e-4,fogFar:501,fogColor:"#5A81A3",fogDensity:0,glowIntensity:.035,glowSharpness:52,glowColor:"#ffffff",glowMode:!1,aoIntensity:.29,aoSpread:.1,aoMode:!1},lighting:{shadows:!0,shadowSoftness:82.64,shadowIntensity:1,shadowBias:.0014},quality:{detail:1,fudgeFactor:.8,pixelThreshold:.9,maxSteps:300,aaMode:"Auto",aaLevel:1,distanceMetric:1,estimator:4},geometry:{juliaMode:!1,juliaX:.5,juliaY:.5,juliaZ:.5,hybridMode:!1,hybridIter:2,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1,hybridSkip:1},optics:{dofStrength:1e-4,dofFocus:.577}},cameraPos:{x:0,y:0,z:3.5},cameraRot:{x:0,y:0,z:.931234344584406,w:-.3644209042665525},cameraFov:80,sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0},targetDistance:.965,cameraMode:"Fly",lights:[{type:"Point",position:{x:.06202062498807429,y:.022274010144572264,z:3.439439471330585},rotation:{x:0,y:0,z:0},color:"#8FA9FF",intensity:.4,falloff:.6760000000000002,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.00041247989335695644,y:-.00142172416335363,z:3.0187219870917428},rotation:{x:0,y:0,z:0},color:"#FFB333",intensity:5,falloff:142.88399999999996,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:-.12319987256138526,y:-.0954216385692699,z:2.9890303407494763},rotation:{x:0,y:0,z:0},color:"#3636FF",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0}]}},Yr={id:"PseudoKleinian",name:"Pseudo Kleinian",shortDescription:'Kleinian variation with a "Magic Factor" that warps the inversion logic.',description:"A modification of the Kleinian group formula. Now supports linear shifting and twisting.",shader:{function:`
    void formula_PseudoKleinian(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 q = z.xyz;

        // Param F: Twist
        if (abs(uParamF) > 0.001) {
            float ang = q.z * uParamF;
            float s = sin(ang); float co = cos(ang);
            q.xy = mat2(co, -s, s, co) * q.xy;
        }

        float boxLimitVal = uParamA;
        vec3 boxMin = vec3(-boxLimitVal);
        vec3 boxMax = vec3(boxLimitVal);
        q = 2.0 * clamp(q, boxMin, boxMax) - q;
        float lensq = max(dot(q, q), 1e-10);
        float magic = uParamD;
        float factor = uParamC - magic;
        float rp2 = lensq * factor;
        float k1 = max(uParamB / max(rp2, 1.0e-10), 1.0);
        q *= k1;
        dr *= k1;

        // Vec3A: 3-axis shift (z-shift was original paramE, x/y are new)
        q += uVec3A;

        z.xyz = q;
        trap = min(trap, lensq);
    }`,loopBody:"formula_PseudoKleinian(z, dr, trap, c);"},parameters:[{label:"Box Limit",id:"paramA",min:.1,max:2,step:.01,default:1.93},{label:"Size (C)",id:"paramB",min:.5,max:2.5,step:.001,default:1.76},{label:"Power",id:"paramC",min:1,max:2.5,step:.001,default:1.278},{label:"Magic Factor",id:"paramD",min:0,max:1.5,step:.001,default:.801},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.001,default:{x:0,y:0,z:.119}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"PseudoKleinian",features:{coreMath:{iterations:7,paramA:1.93,paramB:1.76,paramC:1.278,paramD:.801,paramF:0,vec3A:{x:0,y:0,z:.119}},coloring:{gradient:[{id:"1771521894392",position:0,color:"#949494",bias:.5,interpolation:"linear"},{id:"1771519043183",position:.33,color:"#87827D",bias:.5,interpolation:"step"},{id:"1771519043723",position:.448,color:"#007A71",bias:.5,interpolation:"step"},{id:"1771518360330_2",position:.461,color:"#929292",bias:.5,interpolation:"linear"},{id:"1771518360330_3",position:1,color:"#949494",bias:.5,interpolation:"linear"}],mode:9,scale:27.305,offset:-24.938,repeats:3,phase:-.5,bias:1,twist:0,escape:127399.5,gradient2:[{id:"1",position:.318,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"1771521834787",position:.386,color:"#26A5B4",bias:.5,interpolation:"step"},{id:"1771521804163",position:.397,color:"#FFFFFF",bias:.5,interpolation:"linear"}],mode2:0,scale2:45.964,offset2:2.748,repeats2:50.5,phase2:.45,bias2:1,twist2:0,blendMode:2,blendOpacity:1,layer3Color:"#ffffff",layer3Scale:466.422,layer3Strength:0,layer3Bump:.05,layer3Turbulence:0},ao:{aoIntensity:.317,aoSpread:.027,aoEnabled:!0,aoMode:!1},atmosphere:{fogIntensity:0,fogNear:1.069,fogFar:1.764,fogColor:"#000000",fogDensity:.36,glowIntensity:.062,glowSharpness:8.511,glowMode:!1,glowColor:"#9be0ff"},materials:{diffuse:1.1,reflection:.52,specular:2,roughness:.269,rim:.586,rimExponent:5.9,envStrength:2.36,envBackgroundStrength:.97,envSource:1,useEnvMap:!1,envRotation:0,emission:0,emissionMode:0,emissionColor:"#ffffff",envGradientStops:[{id:"1771523832902_0",position:0,color:"#001133"},{id:"1771523832902_1",position:.5,color:"#8A9DAA"},{id:"1771523832902_2",position:1,color:"#A5FFFF"}]},colorGrading:{active:!0,saturation:1.11,levelsMin:.01,levelsMax:1.004,levelsGamma:.496},geometry:{juliaMode:!1,juliaX:-.28,juliaY:2,juliaZ:-2,hybridMode:!1},lighting:{shadows:!0,shadowSoftness:178.25,shadowIntensity:1,shadowBias:16e-6},quality:{fudgeFactor:.48,detail:7.7,pixelThreshold:.3,maxSteps:384,estimator:4,distanceMetric:2},optics:{camFov:37,dofStrength:.00147,dofFocus:1.235},reflections:{enabled:!0,reflectionMode:1,bounces:3,steps:128,mixStrength:1,roughnessThreshold:.5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.23563338320385452,y:.05927570030462831,z:-.43792255558493787,w:.8655559689490069},sceneOffset:{x:4.677079677581787,y:.8489137291908264,z:1.2545667886734009,xL:-.03396485030158674,yL:.03325700201092376,zL:-.015573679616097938},targetDistance:1.0379663705825806,cameraMode:"Fly",lights:[{type:"Point",position:{x:4.677060177682062,y:.8489393025420574,z:1.254369368841062},rotation:{x:1.092,y:.667,z:.415},color:"#FFA757",intensity:12.96,falloff:109.253,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:4.557440677764606,y:1.1,z:-.16},rotation:{x:0,y:0,z:0},color:"#A9A9A9",intensity:27.1441,falloff:3.528,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:4.677024051602566,y:.8488697555642045,z:1.2543798336180192},rotation:{x:0,y:0,z:0},color:"#4E83FF",intensity:28.4,falloff:261.407,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0}],animations:[{id:"4yFFplV3QPo3KoNaGJwfX",enabled:!1,target:"coreMath.paramA",shape:"Sine",period:5,amplitude:1,baseValue:1.71,phase:0,smoothing:.5}]}},Zr={id:"Dodecahedron",name:"Dodecahedron",shortDescription:"Kaleidoscopic IFS with dodecahedral symmetry (Knighty).",description:"Kaleidoscopic IFS fractal with true dodecahedral symmetry using 3 golden-ratio reflection normals. Based on Knighty's method: 3 normals × 3 reflections = 9 fold operations per iteration, producing the icosahedral/dodecahedral reflection group. Supports rotation, twist, and shift.",shader:{preamble:`
    // Dodecahedron: Pre-calculated golden-ratio normals and rotation (computed once per frame)
    // Reference: Syntopia/Knighty Kaleidoscopic IFS
    const float dodeca_Phi = (1.0 + sqrt(5.0)) * 0.5; // golden ratio 1.618...
    const vec3 dodeca_n1 = normalize(vec3(-1.0, dodeca_Phi - 1.0, 1.0 / (dodeca_Phi - 1.0)));
    const vec3 dodeca_n2 = normalize(vec3(dodeca_Phi - 1.0, 1.0 / (dodeca_Phi - 1.0), -1.0));
    const vec3 dodeca_n3 = normalize(vec3(1.0 / (dodeca_Phi - 1.0), -1.0, dodeca_Phi - 1.0));

    vec3 uDodeca_rotAxis = vec3(0.0, 1.0, 0.0);
    float uDodeca_rotCos = 1.0;
    float uDodeca_rotSin = 0.0;

    void Dodecahedron_precalcRotation() {
        if (abs(uVec3B.z) > 0.001) {
            float azimuth = uVec3B.x;
            float pitch = uVec3B.y;
            float rotAngle = uVec3B.z * 0.5;
            float cosPitch = cos(pitch);
            uDodeca_rotAxis = vec3(
                cosPitch * sin(azimuth),
                sin(pitch),
                cosPitch * cos(azimuth)
            );
            uDodeca_rotSin = sin(rotAngle);
            uDodeca_rotCos = cos(rotAngle);
        }
    }`,function:`
    void formula_Dodecahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        // Param F: Twist
        if (abs(uParamF) > 0.001) {
            float ang = z3.z * uParamF;
            float s = sin(ang); float co = cos(ang);
            z3.xy = mat2(co, -s, s, co) * z3.xy;
        }

        // Vec3B: Rotation using pre-calculated values (no trig in loop)
        if (abs(uVec3B.z) > 0.001) {
            z3 = z3 * uDodeca_rotCos + cross(uDodeca_rotAxis, z3) * uDodeca_rotSin
                 + uDodeca_rotAxis * dot(uDodeca_rotAxis, z3) * (1.0 - uDodeca_rotCos);
        }

        // 3 normals × 3 repetitions = 9 fold operations (true dodecahedral symmetry)
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n1)) * dodeca_n1;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n2)) * dodeca_n2;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n3)) * dodeca_n3;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n1)) * dodeca_n1;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n2)) * dodeca_n2;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n3)) * dodeca_n3;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n1)) * dodeca_n1;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n2)) * dodeca_n2;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n3)) * dodeca_n3;

        // Scale and offset
        float scale = uParamA;
        vec3 offset = vec3(uParamB * (scale - 1.0));

        // Vec3A: Shift
        offset -= uVec3A;

        z3 = z3 * scale - offset;

        if (uJuliaMode > 0.5) z3 += c.xyz;

        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, length(z3));
    }`,loopBody:"formula_Dodecahedron(z, dr, trap, c);",loopInit:"Dodecahedron_precalcRotation();"},parameters:[{label:"Scale",id:"paramA",min:.5,max:4,step:.001,default:2.618},{label:"Offset",id:"paramB",min:0,max:2,step:.001,default:1},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.01,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"Dodecahedron",features:{coreMath:{iterations:7,paramA:1.618,paramB:1,paramF:0,vec3A:{x:0,y:0,z:0},vec3B:{x:5.220276663070101,y:.9514730190841805,z:0}},coloring:{mode:0,repeats:1,phase:.41,scale:6.580873844013903,offset:1.195965706975688,bias:1,twist:0,escape:2,mode2:5,repeats2:1,phase2:0,blendMode:2,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0,gradient:[{id:"1773424223148_0",position:0,color:"#30123B",bias:.5,interpolation:"linear"},{id:"1773424223148_1",position:.071,color:"#4145AB",bias:.5,interpolation:"linear"},{id:"1773424223148_2",position:.143,color:"#4675ED",bias:.5,interpolation:"linear"},{id:"1773424223148_3",position:.214,color:"#39A2FC",bias:.5,interpolation:"linear"},{id:"1773424223148_4",position:.286,color:"#1BCFD4",bias:.5,interpolation:"linear"},{id:"1773424223148_5",position:.357,color:"#24ECA6",bias:.5,interpolation:"linear"},{id:"1773424223148_6",position:.429,color:"#61FC6C",bias:.5,interpolation:"linear"},{id:"1773424223148_7",position:.5,color:"#A4FC3B",bias:.5,interpolation:"linear"},{id:"1773424223148_8",position:.571,color:"#D1E834",bias:.5,interpolation:"linear"},{id:"1773424223148_9",position:.643,color:"#F3C63A",bias:.5,interpolation:"linear"},{id:"1773424223148_10",position:.714,color:"#FE9B2D",bias:.5,interpolation:"linear"},{id:"1773424223148_11",position:.786,color:"#F36315",bias:.5,interpolation:"linear"},{id:"1773424223148_12",position:.857,color:"#D93806",bias:.5,interpolation:"linear"},{id:"1773424223148_13",position:.929,color:"#B11901",bias:.5,interpolation:"linear"},{id:"1773424223148_14",position:1,color:"#7A0402",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:.61,color:"#FFFFFF"},{id:"2",position:.88,color:"#FF0505"}]},ao:{aoIntensity:.47,aoSpread:.20182911832770353,aoSamples:5,aoEnabled:!0,aoMode:!1},texturing:{active:!1,offset:{x:-.02,y:-.08},mapU:6,mapV:8,layer1Data:null},materials:{diffuse:2,reflection:0,specular:1.02,roughness:.468,rim:0,rimExponent:4.5,envStrength:.11,envBackgroundStrength:.18,envSource:1,useEnvMap:!1,envRotation:0,emission:0,emissionMode:0,emissionColor:"#ffffff",envGradientStops:[{id:"0",position:.03,color:"#130606"},{id:"1",position:.14,color:"#463434"},{id:"2",position:.41,color:"#824040"},{id:"3",position:.68,color:"#BCBCBC"},{id:"4",position:1,color:"#875656"}]},atmosphere:{fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:1,glowColor:"#ffffff",glowMode:!1},geometry:{juliaMode:!1,juliaX:-.495,juliaY:.43,juliaZ:-.07,hybridMode:!1},lighting:{advancedLighting:!0,ptEnabled:!0,shadows:!0,shadowSoftness:538,shadowIntensity:1,shadowBias:0},quality:{detail:2,fudgeFactor:.618,pixelThreshold:.2,maxSteps:300,distanceMetric:2,stepJitter:.15,estimator:0},colorGrading:{saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camFov:30,dofStrength:0,dofFocus:5.416511696387403}},cameraPos:{x:-2.9461205964615327,y:-6.306149063613445,z:-5.3717968058510825},cameraRot:{x:-.3200177128161143,y:.4273069400949125,z:.4770724626812721,w:.6981398912695737},cameraFov:30,sceneOffset:{x:5.360734701156616,y:13.365931034088135,z:8.818749189376831,xL:-.004044675735693504,yL:-.07134266791832158,zL:.1851590182527553},targetDistance:8.7922319978922,cameraMode:"Orbit",lights:[{type:"Directional",position:{x:.3935750958329095,y:1.1219073945240998,z:2.531297422652509},rotation:{x:-.1760895376460553,y:-.04312640645659912,z:.00380748198692117},color:"#FFE6D1",intensity:.43559999999999993,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:5100},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#ff0000",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#0000ff",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}],animations:[{id:"4yFFplV3QPo3KoNaGJwfX",enabled:!1,target:"coreMath.paramA",shape:"Sine",period:5,amplitude:1,baseValue:2.618,phase:0,smoothing:.5}]}},Qr={id:"Phoenix",name:"Phoenix",shortDescription:"Iterates based on previous value (z_n-1). Creates flowing, taffy-like distortions.",description:"A 3D generalization of the Phoenix Julia set. Now with Z-stretching and spatial twisting.",shader:{function:`
    vec3 phoenixBulbPow(vec3 z, float power, vec2 phase) {
        float r = length(z);
        float r_safe = max(r, 1.0e-9);
        float theta = acos(clamp(z.z / r_safe, -1.0, 1.0));
        float phi = atan(z.y, z.x);
        float zr = pow(r_safe, power);
        theta = theta * power + phase.x;
        phi = phi * power + phase.y;
        return zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
    }

        void formula_Phoenix(inout vec4 z, inout float dr, inout float trap, vec4 c, inout vec4 z_prev, inout float dr_prev, inout vec4 z_prev2, inout float dr_prev2) {
            vec3 z3 = z.xyz;
            vec3 zp3 = z_prev.xyz;

            // Vec3A: Anisotropic Stretch (mix to 1.0 when near zero so DDFS default reset is safe)
            vec3 stretch = mix(vec3(1.0), uVec3A, step(vec3(0.01), uVec3A));
            z3 *= stretch;
            dr *= max(max(stretch.x, stretch.y), stretch.z);

            // Vec3C: Pre-rotation (applied before triplex power)
            if (abs(uVec3C.x) > 0.001 || abs(uVec3C.y) > 0.001 || abs(uVec3C.z) > 0.001) {
                float cx = cos(uVec3C.x); float sx = sin(uVec3C.x);
                float cy = cos(uVec3C.y); float sy = sin(uVec3C.y);
                float cz = cos(uVec3C.z); float sz = sin(uVec3C.z);
                // YZ rotation
                z3.yz = mat2(cx, -sx, sx, cx) * z3.yz;
                // XZ rotation
                z3.xz = mat2(cy, -sy, sy, cy) * z3.xz;
                // XY rotation
                z3.xy = mat2(cz, -sz, sz, cz) * z3.xy;
            }

            // Param C: Twist
            if (abs(uParamC) > 0.001) {
                float ang = z3.z * uParamC;
                float s = sin(ang); float co = cos(ang);
                z3.xy = mat2(co, -s, s, co) * z3.xy;
            }

            float power = uParamA;
            float kReal = uVec2A.x;
            float kImag = uVec2A.y;
            float hPower = uParamB;
            float hBlend = uParamD;
            vec2 phase = uVec2B;

            vec3 z_new_part = phoenixBulbPow(z3, power, phase);

            // Vec3B: Abs/fold after power (Burning Phoenix)
            z_new_part = mix(z_new_part, abs(z_new_part), step(vec3(0.5), uVec3B));

            // History: blend z_{n-1} with z_{n-2} for deeper memory
            vec3 historySource = mix(zp3, z_prev2.xyz, hBlend);
            float drHistorySource = mix(dr_prev, dr_prev2, hBlend);

            vec3 z_prev_part;
            bool isLinearHistory = abs(hPower - 1.0) < 0.001;

            if (isLinearHistory) {
                z_prev_part = historySource;
            } else {
                z_prev_part = phoenixBulbPow(historySource, hPower, vec2(0.0));
            }

            vec3 historyTerm;
            historyTerm.x = z_prev_part.x * kReal - z_prev_part.y * kImag;
            historyTerm.y = z_prev_part.x * kImag + z_prev_part.y * kReal;
            historyTerm.z = z_prev_part.z * kReal;

            vec3 z_next = z_new_part + c.xyz + historyTerm;

            float r = length(z3);
            float rh = length(historySource);
            float safeR = max(r, 1.0e-5);
            float safeRh = max(rh, 1.0e-5);

            float dr_pow = power * pow(safeR, power - 1.0);

            float kMag = length(vec2(kReal, kImag));
            float dr_hist = kMag;

            if (!isLinearHistory) {
                 dr_hist *= hPower * pow(safeRh, hPower - 1.0);
            }

            float dc = (uJuliaMode > 0.5) ? 0.0 : 1.0;
            float dr_next = dr_pow * dr + dr_hist * drHistorySource + dc;

            // Shift history: z_{n-2} = z_{n-1}, z_{n-1} = z_n
            z_prev2 = z_prev;
            dr_prev2 = dr_prev;
            z_prev = vec4(z3, 0.0);
            dr_prev = dr;

            z.xyz = z_next;
            dr = dr_next;

            trap = min(trap, dot(z, z));
        }`,loopBody:"formula_Phoenix(z, dr, trap, c, z_prev, dr_prev, z_prev2, dr_prev2);",loopInit:`
        vec4 z_prev = vec4(0.0);
        float dr_prev = 0.0;
        vec4 z_prev2 = vec4(0.0);
        float dr_prev2 = 0.0;
        `},parameters:[{label:"Power (p)",id:"paramA",min:1.5,max:12,step:.01,default:10.777},{label:"History Exp",id:"paramB",min:0,max:3,step:.01,default:.87},{label:"Twist",id:"paramC",min:-2,max:2,step:.01,default:0},{label:"History Depth",id:"paramD",min:0,max:1,step:.01,default:0},{label:"Distortion (Re, Im)",id:"vec2A",type:"vec2",min:-1.5,max:1.5,step:.001,default:{x:.503,y:.961}},{label:"Phase (θ, φ)",id:"vec2B",type:"vec2",min:-6.28,max:6.28,step:.01,default:{x:0,y:0},scale:"pi"},{label:"Stretch",id:"vec3A",type:"vec3",min:.1,max:3,step:.01,default:{x:1,y:1,z:1},linkable:!0},{label:"Abs Fold",id:"vec3B",type:"vec3",min:0,max:1,step:1,default:{x:0,y:0,z:0},mode:"toggle"},{label:"Pre-Rotation",id:"vec3C",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"}],defaultPreset:{formula:"Phoenix",features:{coreMath:{iterations:31,paramA:10.777,paramB:.87,paramC:0,paramD:0,vec2A:{x:.503,y:.961},vec2B:{x:0,y:0},vec3A:{x:1,y:1,z:1},vec3B:{x:0,y:0,z:0},vec3C:{x:0,y:0,z:0}},coloring:{gradient:[{id:"1766223988966_0",position:0,color:"#5F4690",bias:.5,interpolation:"linear"},{id:"1766223988966_1",position:.091,color:"#1D6996",bias:.5,interpolation:"linear"},{id:"1766223988966_2",position:.182,color:"#38A6A5",bias:.5,interpolation:"linear"},{id:"1766223988966_3",position:.273,color:"#0F8554",bias:.5,interpolation:"linear"},{id:"1766223988966_4",position:.364,color:"#73AF48",bias:.5,interpolation:"linear"},{id:"1766223988966_5",position:.455,color:"#EDAD08",bias:.5,interpolation:"linear"},{id:"1766223988966_6",position:.545,color:"#E17C05",bias:.5,interpolation:"linear"},{id:"1766223988966_7",position:.636,color:"#CC503E",bias:.5,interpolation:"linear"},{id:"1766223988966_8",position:.727,color:"#94346E",bias:.5,interpolation:"linear"},{id:"1766223988966_9",position:.818,color:"#6F4070",bias:.5,interpolation:"linear"},{id:"1766223988966_10",position:.909,color:"#994E95",bias:.5,interpolation:"linear"},{id:"1766223988966_11",position:1,color:"#666666",bias:.5,interpolation:"linear"}],mode:0,scale:2.31,offset:.272,repeats:1,phase:0,bias:.9,twist:0,escape:4,gradient2:[{id:"1766224725875_0",position:0,color:"#5F4690",bias:.5,interpolation:"linear"},{id:"1766224725875_1",position:.091,color:"#1D6996",bias:.5,interpolation:"linear"},{id:"1766224725875_2",position:.182,color:"#38A6A5",bias:.5,interpolation:"linear"},{id:"1766224725875_3",position:.273,color:"#0F8554",bias:.5,interpolation:"linear"},{id:"1766224725875_4",position:.364,color:"#73AF48",bias:.5,interpolation:"linear"},{id:"1766224725875_5",position:.455,color:"#EDAD08",bias:.5,interpolation:"linear"},{id:"1766224725875_6",position:.545,color:"#E17C05",bias:.5,interpolation:"linear"},{id:"1766224725875_7",position:.636,color:"#CC503E",bias:.5,interpolation:"linear"},{id:"1766224725875_8",position:.727,color:"#94346E",bias:.5,interpolation:"linear"},{id:"1766224725875_9",position:.818,color:"#6F4070",bias:.5,interpolation:"linear"},{id:"1766224725875_10",position:.909,color:"#994E95",bias:.5,interpolation:"linear"},{id:"1766224725875_11",position:1,color:"#666666",bias:.5,interpolation:"linear"}],mode2:6,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:3,blendOpacity:1,layer3Color:"#ffffff",layer3Scale:245.44,layer3Strength:0,layer3Bump:.3,layer3Turbulence:.65},ao:{aoIntensity:.37,aoSpread:.164,aoEnabled:!0,aoMode:!1},atmosphere:{fogColor:"#1b1e24",fogNear:1e-4,fogFar:501.187,fogDensity:0,glowIntensity:1e-4,glowSharpness:825,glowMode:!1,glowColor:"#ffffff"},materials:{diffuse:.94,reflection:0,specular:.3,roughness:.4,rim:0,rimExponent:4,envStrength:0,envBackgroundStrength:1,envSource:1,useEnvMap:!1,envRotation:0,emission:.581,emissionMode:0,emissionColor:"#ffffff",envGradientStops:[]},geometry:{juliaMode:!0,juliaX:.17,juliaY:.36,juliaZ:.06,hybridMode:!1},lighting:{shadows:!0,shadowSoftness:102.8,shadowIntensity:1,shadowBias:.002},quality:{fudgeFactor:.4,detail:1,pixelThreshold:.5,maxSteps:300},optics:{camFov:58,dofStrength:35e-5,dofFocus:.38}},cameraPos:{x:.876,y:-1.881,z:2.819},cameraRot:{x:.087,y:.3,z:-.715,w:.626},sceneOffset:{x:.246,y:1.112,z:-2.614,xL:-.876,yL:.881,zL:-.819},targetDistance:.287,cameraMode:"Orbit",lights:[{type:"Point",position:{x:.755,y:.531,z:-.026},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:1.4,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#ff0000",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#0000ff",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}],animations:[]}},Kr={id:"MixPinski",name:"MixPinski",shortDescription:"4D Sierpinski-Menger hybrid by Darkbeam. Rich geometric detail.",description:"Darkbeam's MixPinski — a 4D hybrid combining Sierpinski tetrahedron folds (extended to 4D with w-component) and a Menger-like fold-scale transform. The interplay of these two IFS systems produces extraordinary geometric complexity.",shader:{preamble:`
    // Pre-calculated rotation values for MixPinski (computed once per frame)
    vec3 uMixPinski_rotAxis = vec3(0.0, 1.0, 0.0);
    float uMixPinski_rotCos = 1.0;
    float uMixPinski_rotSin = 0.0;

    void MixPinski_precalcRotation() {
        if (abs(uVec3C.z) > 0.001) {
            float azimuth = uVec3C.x;
            float pitch = uVec3C.y;
            float rotAngle = uVec3C.z * 0.5;

            float cosPitch = cos(pitch);
            uMixPinski_rotAxis = vec3(
                cosPitch * sin(azimuth),
                sin(pitch),
                cosPitch * cos(azimuth)
            );

            uMixPinski_rotSin = sin(rotAngle);
            uMixPinski_rotCos = cos(rotAngle);
        }
    }`,function:`
    void formula_MixPinski(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        // --- Stage 1: 4D Sierpinski Folds ---
        // Six reflective folds across all pairs of axes (extends 3D tetrahedron folds to 4D)
        float s;
        s = step(0.0, z.x + z.y); z.xy = mix(-z.yx, z.xy, s);
        s = step(0.0, z.x + z.z); z.xz = mix(-z.zx, z.xz, s);
        s = step(0.0, z.y + z.z); z.zy = mix(-z.yz, z.zy, s);
        s = step(0.0, z.x + z.w); z.xw = mix(-z.wx, z.xw, s);
        s = step(0.0, z.y + z.w); z.yw = mix(-z.wy, z.yw, s);
        s = step(0.0, z.z + z.w); z.zw = mix(-z.wz, z.zw, s);

        // Sierpinski scale + offset (4D)
        float scaleS = uParamA;
        z *= scaleS;
        dr *= abs(scaleS);

        // offsetS: vec3A.xyz for xyz, vec2A.x for w
        z.xyz += uVec3A;
        z.w += uVec2A.x;

        // --- Stage 2: Menger-like Fold-Scale ---
        float scaleM = uParamC;
        float sm1 = scaleM - 1.0;

        // Standard IFS scale-offset on x, y, w
        z.x = scaleM * z.x - uVec3B.x * sm1;
        z.y = scaleM * z.y - uVec3B.y * sm1;
        z.w = scaleM * z.w - uVec2A.y * sm1;

        // Z-axis: Menger fold (abs-fold around center, then scale)
        float zCenter = 0.5 * uVec3B.z * sm1 / scaleM;
        z.z -= zCenter;
        z.z = -abs(z.z);
        z.z += zCenter;
        z.z *= scaleM;

        dr *= abs(scaleM);

        // --- Stage 3: Optional 3D Rotation ---
        if (abs(uVec3C.z) > 0.001) {
            z.xyz = z.xyz * uMixPinski_rotCos
                  + cross(uMixPinski_rotAxis, z.xyz) * uMixPinski_rotSin
                  + uMixPinski_rotAxis * dot(uMixPinski_rotAxis, z.xyz) * (1.0 - uMixPinski_rotCos);
        }

        // Julia mode
        if (uJuliaMode > 0.5) z.xyz += c.xyz;

        // Orbit trap coloring (matches original: abs(vec4(z.xyz, r2)))
        float r2 = dot(z.xyz, z.xyz) + z.w * z.w;
        trap = min(trap, length(abs(vec4(z.xyz, r2))));
    }`,loopBody:"formula_MixPinski(z, dr, trap, c);",loopInit:"MixPinski_precalcRotation();",getDist:`
            float r4d = max(max(max(abs(z.x), abs(z.y)), abs(z.z)), abs(z.w));
            float d = (r4d - 1.0) / max(abs(dr), 1e-10);
            return vec2(d, iter);
        `},parameters:[{label:"Sierpinski Scale",id:"paramA",min:.1,max:4,step:.001,default:1},{label:"Menger Scale",id:"paramC",min:.1,max:4,step:.001,default:2},{label:"W (4th Dim)",id:"paramB",min:-5,max:5,step:.01,default:0},{label:"Sierpinski Offset",id:"vec3A",type:"vec3",min:-5,max:5,step:.01,default:{x:0,y:0,z:0}},{label:"Menger Offset",id:"vec3B",type:"vec3",min:-5,max:5,step:.01,default:{x:1,y:1,z:1}},{label:"4D Offsets",id:"vec2A",type:"vec2",min:-5,max:5,step:.01,default:{x:0,y:.5}},{label:"Rotation",id:"vec3C",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"}],defaultPreset:{formula:"MixPinski",features:{coreMath:{iterations:11,paramA:1,paramB:0,paramC:2,vec3A:{x:0,y:0,z:0},vec3B:{x:1,y:1,z:1},vec3C:{x:0,y:0,z:0},vec2A:{x:0,y:.5}},coloring:{mode:0,repeats:2,phase:0,scale:6.52833425825692,offset:1.5335980513105973,bias:2.7028973971996875,twist:0,escape:16,mode2:0,scale2:14.312371802828013,offset2:3.2910086244771835,repeats2:6,phase2:0,bias2:1,twist2:0,blendMode:3,blendOpacity:0,layer3Color:"#000000",layer3Scale:23.20419452683914,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0,gradient:[{id:"1773421493405_7",position:0,color:"#FFFFFF",bias:.5,interpolation:"linear"},{id:"1773421493405_6",position:.143,color:"#9BF5FF",bias:.5,interpolation:"linear"},{id:"1773421493405_5",position:.286,color:"#FFAE55",bias:.5,interpolation:"linear"},{id:"1773421493405_4",position:.429,color:"#803000",bias:.5,interpolation:"linear"},{id:"1773421493405_3",position:.571,color:"#481700",bias:.5,interpolation:"linear"},{id:"1773421493405_2",position:.714,color:"#000000",bias:.5,interpolation:"linear"},{id:"1773421493405_1",position:.857,color:"#005662",bias:.5,interpolation:"linear"},{id:"1773421493405_0",position:1,color:"#00485E",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:0,color:"#000000",bias:.20422535211267606,interpolation:"linear"},{id:"2",position:1,color:"#FFFFFF",bias:.5,interpolation:"linear"}]},ao:{aoIntensity:.535,aoSpread:.004173235403614006,aoSamples:5,aoEnabled:!0,aoMode:!0},atmosphere:{fogNear:0,fogFar:100,fogColor:"#000000",fogDensity:0,glowIntensity:.005,glowSharpness:2,glowColor:"#ffffff",glowMode:!1},materials:{diffuse:1.2,reflection:0,specular:.58,roughness:.333,rim:.1,rimExponent:15,envStrength:.3,envBackgroundStrength:.54,envSource:1,useEnvMap:!1,envRotation:0,emission:0,emissionMode:0,emissionColor:"#ffffff",envGradientStops:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}]},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1},lighting:{advancedLighting:!0,ptEnabled:!0,shadows:!0,shadowSoftness:5.636765862528907,shadowSteps:112,shadowIntensity:1,shadowBias:.002},quality:{detail:2.5,fudgeFactor:1,pixelThreshold:.5,maxSteps:300,distanceMetric:1,estimator:1},optics:{camFov:25,dofStrength:0,dofFocus:2.2105886936187744}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.29934375838158195,y:-.36353705098625344,z:-.1246062728732116,w:.8733312107321335},cameraFov:25,sceneOffset:{x:-1.860237717628479,y:2.017045259475708,z:1.8703371286392212,xL:-.06596317582826194,yL:.07221056925599156,zL:.06550313881154746},targetDistance:2.767302989959717,cameraMode:"Fly",lights:[{type:"Point",position:{x:-.8183725352111588,y:1.3532257824970233,z:1.5729904550803229},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:3,falloff:1,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#ff0000",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#0000ff",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},Jr={id:"SierpinskiTetrahedron",name:"Sierpinski Tetrahedron",shortDescription:"Classic IFS Sierpinski tetrahedron with fold symmetry.",description:"The Sierpinski Tetrahedron (Tetrix) — a 3D IFS fractal built from reflective folds across tetrahedron face planes. Supports per-axis scale, rotation, shift and twist.",shader:{preamble:`
    // Pre-calculated rotation values for SierpinskiTetrahedron (computed once per frame)
    vec3 uSierpinski_rotAxis = vec3(0.0, 1.0, 0.0);
    float uSierpinski_rotCos = 1.0;
    float uSierpinski_rotSin = 0.0;

    void SierpinskiTetrahedron_precalcRotation() {
        if (abs(uVec3B.z) > 0.001) {
            float azimuth = uVec3B.x;
            float pitch = uVec3B.y;
            float rotAngle = uVec3B.z * 0.5;

            // Convert spherical to direction vector
            float cosPitch = cos(pitch);
            uSierpinski_rotAxis = vec3(
                cosPitch * sin(azimuth),
                sin(pitch),
                cosPitch * cos(azimuth)
            );

            uSierpinski_rotSin = sin(rotAngle);
            uSierpinski_rotCos = cos(rotAngle);
        }
    }`,function:`
    void formula_SierpinskiTetrahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        // Param F: Twist
        if (abs(uParamF) > 0.001) {
            float ang = z3.z * uParamF;
            float s = sin(ang); float co = cos(ang);
            z3.xy = mat2(co, -s, s, co) * z3.xy;
        }

        float sf;
        sf = step(0.0, z3.x + z3.y); z3.xy = mix(-z3.yx, z3.xy, sf);
        sf = step(0.0, z3.x + z3.z); z3.xz = mix(-z3.zx, z3.xz, sf);
        sf = step(0.0, z3.y + z3.z); z3.yz = mix(-z3.zy, z3.yz, sf);
        // Vec3C: Per-axis scale (average for DR calculation)
        vec3 scale3 = uVec3C;
        z3 = z3 * scale3 - vec3(uParamB * (scale3 - 1.0));

        // Vec3B: Rotation using pre-calculated values (no trig in loop!)
        if (abs(uVec3B.z) > 0.001) {
            // Rodrigues' rotation formula with pre-calculated axis and angles
            z3 = z3 * uSierpinski_rotCos + cross(uSierpinski_rotAxis, z3) * uSierpinski_rotSin
                 + uSierpinski_rotAxis * dot(uSierpinski_rotAxis, z3) * (1.0 - uSierpinski_rotCos);
        }

        // Vec3A: Shift X, Y, Z
        z3 += uVec3A;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        // Use average scale for derivative calculation
        float avgScale = (scale3.x + scale3.y + scale3.z) / 3.0;
        dr = dr * avgScale;
        z.xyz = z3;
        trap = min(trap, length(z3));
    }`,loopBody:"formula_SierpinskiTetrahedron(z, dr, trap, c);",loopInit:"SierpinskiTetrahedron_precalcRotation();"},parameters:[{label:"Scale",id:"vec3C",type:"vec3",min:.1,max:4,step:.001,default:{x:2,y:2,z:2},linkable:!0},{label:"Offset",id:"paramB",min:0,max:2,step:.001,default:1},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.01,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"SierpinskiTetrahedron",features:{coreMath:{iterations:32,paramB:1,paramF:0,vec3A:{x:0,y:0,z:0},vec3B:{x:0,y:0,z:0},vec3C:{x:2,y:2,z:2}},coloring:{mode:0,repeats:2.6,phase:.78,scale:2.595,offset:.785,bias:1,twist:0,escape:3.2,mode2:4,repeats2:1,phase2:0,blendMode:0,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:.2,layer3Turbulence:0,gradient:[{id:"1766253802332_11",position:0,color:"#666666",bias:.5,interpolation:"linear"},{id:"1766253802332_10",position:.09099999999999997,color:"#994E95",bias:.5,interpolation:"linear"},{id:"1766253802332_9",position:.18200000000000005,color:"#6F4070",bias:.5,interpolation:"linear"},{id:"1766253802332_8",position:.273,color:"#94346E",bias:.5,interpolation:"linear"},{id:"1766253802332_7",position:.364,color:"#CC503E",bias:.5,interpolation:"linear"},{id:"1766253802332_6",position:.45499999999999996,color:"#E17C05",bias:.5,interpolation:"linear"},{id:"1766253802332_5",position:.5449999999999999,color:"#EDAD08",bias:.5,interpolation:"linear"},{id:"1766253802332_4",position:.636,color:"#73AF48",bias:.5,interpolation:"linear"},{id:"1766253802332_3",position:.727,color:"#0F8554",bias:.5,interpolation:"linear"},{id:"1766253802332_2",position:.8180000000000001,color:"#38A6A5",bias:.5,interpolation:"linear"},{id:"1766253802332_1",position:.909,color:"#1D6996",bias:.5,interpolation:"linear"},{id:"1766253802332_0",position:1,color:"#5F4690",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#FFFFFF"}]},atmosphere:{fogNear:0,fogFar:100,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:200,glowColor:"#ffffff",glowMode:!1,aoIntensity:.2,aoSpread:.4},materials:{reflection:0,specular:0,roughness:.5,diffuse:1.5,envStrength:0,rim:0,rimExponent:4,emission:.3,emissionColor:"#ffffff",emissionMode:0},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1,hybridIter:2,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1},lighting:{shadows:!0,shadowSoftness:16,shadowIntensity:1,shadowBias:.002},quality:{detail:1,fudgeFactor:1,pixelThreshold:.5,maxSteps:300,estimator:1},optics:{dofStrength:0,dofFocus:.38}},cameraPos:{x:-3.007814612603433,y:1.6549209197166999,z:3.0656971117007727},cameraRot:{x:-.16821916484218788,y:-.37237727913489405,z:-.07175513434637137,w:.9098838800961496},cameraFov:60,sceneOffset:{x:0,y:0,z:0,xL:.6573301623370098,yL:-.6573301623370098,zL:-.6573301623370111},cameraMode:"Orbit",lights:[{type:"Point",position:{x:.435,y:1.031,z:2.022},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:1.4,falloff:1,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#ff0000",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#0000ff",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},ei={id:"AmazingSurf",name:"Amazing Surf",shortDescription:"Sinusoidal variation of the Amazing Box. Creates flowing, melted machinery.",description:"A variant of the Amazing Box that introduces sinusoidal waves. Now with Wave Twist and Vertical Shift.",shader:{function:`
    void formula_AmazingSurf(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;
        vec3 transform = uVec3A;
        float limit = 1.0;
        z3 = clamp(z3, -limit, limit) * 2.0 - z3;
        float r2 = max(dot(z3,z3), 1e-10);
        float mR2 = max(uParamB * uParamB, 1e-10);
        float sphereK = clamp(1.0 / r2, 1.0, 1.0 / mR2);
        z3 *= sphereK; dr *= sphereK;
        z3 = z3 * uParamA + c.xyz;
        
        // Param X: Wave Twist
        float twist = 0.0;
        if (abs(transform.x) > 0.001) twist = z3.z * transform.x;
        
        // Param Y: Vertical Shift
        if (abs(transform.y) > 0.001) z3.y += transform.y;

        z3 += vec3(sin(z3.y * uParamC + twist), cos(z3.x * uParamC + twist), 0.0) * uParamD * 0.1;
        dr = dr * abs(uParamA) + 1.0;
        z.xyz = z3;
        trap = min(trap, abs(z3.z));
    }`,loopBody:"formula_AmazingSurf(z, dr, trap, c);"},parameters:[{label:"Scale",id:"paramA",min:1,max:5,step:.001,default:3},{label:"Min Radius",id:"paramB",min:0,max:1.5,step:.001,default:.8},{label:"Wave Freq",id:"paramC",min:0,max:10,step:.1,default:6},{label:"Wave Amp",id:"paramD",min:0,max:2,step:.01,default:.5},{label:"Transform",id:"vec3A",type:"vec3",min:-5,max:5,step:.01,default:{x:0,y:0,z:0}}],defaultPreset:{formula:"AmazingSurf",features:{coreMath:{iterations:21,paramA:3.03,paramB:.47,paramC:1,paramD:1,vec3A:{x:0,y:0,z:0}},coloring:{mode:6,repeats:1,phase:1.44,scale:1,offset:1.44,bias:1,twist:0,escape:100,mode2:4,repeats2:2284.7,phase2:2.4,blendMode:6,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,gradient:[{id:"1767122909918_0",position:0,color:"#DF7200",bias:.5,interpolation:"linear"},{id:"1767122909918_1",position:.5,color:"#cc8800",bias:.5,interpolation:"linear"},{id:"1767122909918_2",position:1,color:"#ffeeaa",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}]},texturing:{active:!1,scaleX:1,scaleY:1,offset:{x:0,y:0},mapU:6,mapV:1,layer1Data:null},materials:{reflection:.44,specular:2,roughness:.51,diffuse:1.01,envStrength:0,rim:0,rimExponent:4,emission:0,emissionColor:"#ffffff",emissionMode:0,envMapVisible:!1,useEnvMap:!0,envSource:1,envRotation:0,envGradientStops:[{id:"1767120246151",position:0,color:"#88ccff",bias:.5,interpolation:"linear"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:.9454191033138402,color:"#88ccff",bias:.5,interpolation:"smooth"}]},atmosphere:{fogIntensity:1,fogNear:1e-4,fogFar:7.988,fogColor:"#362624",fogDensity:.2,glowIntensity:1e-4,glowSharpness:360,glowColor:"#ffffff",glowMode:!1,aoIntensity:.2,aoSpread:.147,aoMode:!1},lighting:{shadows:!0,shadowSoftness:128,shadowIntensity:.97,shadowBias:.11},quality:{detail:2,fudgeFactor:.45,pixelThreshold:.9,maxSteps:300,aaMode:"Auto",aaLevel:1,estimator:1},geometry:{juliaMode:!1,juliaX:.06,juliaY:-2,juliaZ:2,hybridMode:!1,hybridIter:2,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1,hybridSkip:1},optics:{dofStrength:1e-4,dofFocus:.662}},cameraPos:{x:-.0012166192470455862,y:.34651714109424453,z:-.4225635099851341},cameraRot:{x:.0038108513963938193,y:.9416221382735623,z:.33664033788669406,w:-.002551280519921562},cameraFov:60,sceneOffset:{x:0,y:0,z:2,xL:.007764116549374419,yL:.17826292308257122,zL:.3614435950429179},targetDistance:.504,cameraMode:"Orbit",lights:[{type:"Point",position:{x:.06201624057047557,y:-.0404139584830392,z:-.6430434715537097},rotation:{x:0,y:0,z:0},color:"#FF9D7B",intensity:5,falloff:22,falloffType:"Quadratic",fixed:!0,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#ff0000",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#0000ff",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},ti={id:"AmazingSurface",name:"Amazing Surface",description:'A "Menger-Kleinian" hybrid. Uses 3-axis sorting (Menger) followed by a Box Fold and Sphere Inversion. Capable of creating non-orthogonal, organic machinery.',shader:{loopInit:`
            // Fix: Zero out W component to prevent uParamB (InvMax) from affecting magnitude check
            z.w = 0.0;

            // Apply Pre-Scale (Param E) once at the start
            // Loop Init always runs before the loop, so we don't need to check iter
            float preScale = (abs(uParamE) < 0.001) ? 1.0 : (1.0 / uParamE);
            z.xyz *= preScale;
            dr *= preScale;
        `,function:`
    void formula_AmazingSurface(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;
        vec3 offset = uVec3B;
        // Params
        float scale = uParamA;      // Fractal Scale (fractal_fold + 1)
        float invMax = uParamB;     // Inversion Clamp Max (3.0)
        
        vec3 cSize = uVec3A; //box params
        
        if (uJuliaMode > 0.5) offset += uJulia;

        // 1. Menger-style Folding (Sort Axes)
        p = abs(p);
        if (p.x < p.y) p.xy = p.yx;
        if (p.x < p.z) p.xz = p.zx;
        if (p.y < p.z) p.yz = p.zy;
        
        // 2. Box Fold / Scale
        // formula: p = p * scale - cSize * (scale - 1.0)
        p = p * scale - cSize * (scale - 1.0);
        
        // 3. Sphere Inversion
        float r2 = dot(p, p);
        float k = clamp(1.0 / r2, 1.0, invMax);
        p *= k;
        
        // 4. Translation
        p += offset;
        
        // 5. Derivative Update
        // Based on reference: de = de * k * scale
        // We use full chain rule approximation for stability
        dr = dr * abs(scale) * k + 1.0;
        
        z.xyz = p;
        trap = min(trap, length(p));
    }`,loopBody:"formula_AmazingSurface(z, dr, trap, c);",getDist:`
            // DE: (length(p) - Thickness) / dr
            // Use 'r' which comes from DE_MASTER (respects Distance Metric)
            float thickness = uParamF;
            return vec2((r - thickness) / dr, iter);
        `},parameters:[{label:"Scale",id:"paramA",min:1,max:4,step:.001,default:2.37},{label:"Inv Max",id:"paramB",min:1,max:5,step:.01,default:3},{label:"Box Params",id:"vec3A",type:"vec3",min:-3,max:3,step:.001,default:{x:1,y:1,z:1.3}},{label:"Offset Params",id:"vec3B",type:"vec3",min:-3,max:3,step:.001,default:{x:0,y:0,z:.5}},{label:"Pre-Scale",id:"paramE",min:.1,max:5,step:.01,default:1},{label:"Thickness",id:"paramF",min:0,max:10,step:.01,default:.4}],defaultPreset:{formula:"AmazingSurface",features:{atmosphere:{fogIntensity:0,fogNear:0,fogFar:5,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:200,glowMode:!1,glowColor:"#ffffff",aoIntensity:.2,aoSpread:.028079152787892275,aoMode:!1},droste:{active:!1,tiling:1,center:{x:0,y:0},radiusInside:5,radiusOutside:100,periodicity:2,strands:2,autoPeriodicity:!1,strandMirror:!1,zoom:0,rotate:0,rotateSpin:0,rotatePolar:0,twist:!0,hyperDroste:!1,fractalPoints:1},materials:{diffuse:1,reflection:0,specular:.3,roughness:.5,rim:0,rimExponent:4,envStrength:.125,envMapVisible:!0,envBackgroundStrength:.013878516332918171,envSource:1,envMapData:null,useEnvMap:!1,envRotation:0,envGradientStops:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},colorGrading:{active:!1,saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},texturing:{active:!1,layer1Data:null,mapU:6,mapV:1,scaleX:1,scaleY:1,offset:{x:0,y:0},textureScale:{x:1,y:1}},coloring:{gradient:[{id:"2",position:.29337201676350744,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"1768067662570",position:.32743611518925475,color:"#4F8728",bias:.33333333333333326,interpolation:"step"},{id:"1768067659362",position:.4161607050126708,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"1768067719427",position:.5555850604494675,color:"#FF7D7D",bias:.5,interpolation:"step"},{id:"1768067722341",position:.6094535614136845,color:"#FFFFFF",bias:.5,interpolation:"linear"},{id:"1768067729100",position:.6876155711314749,color:"#FFB716",bias:.5,interpolation:"linear"},{id:"1768067900586",position:.7932402117621893,color:"#FFFFFF",bias:.5,interpolation:"linear"}],mode:0,scale:13.919207813258625,offset:.787073242086744,repeats:1.5,phase:0,bias:1,twist:0,escape:1.0069316688518042,gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}],mode2:4,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:0,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:2,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},geometry:{preRotEnabled:!1,preRotY:0,preRotX:0,preRotZ:0,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1,hybridIter:2,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1,hybridAddC:!1,hybridComplex:!1,hybridProtect:!0,hybridSkip:1,hybridSwap:!1,preRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},quality:{fudgeFactor:.5,detail:2,pixelThreshold:.5,maxSteps:300,distanceMetric:1},coreMath:{iterations:12,paramA:1.866,paramB:1.63,vec3A:{x:1,y:1,z:.62},vec3B:{x:0,y:0,z:.62},paramE:.97,paramF:1.4},lighting:{shadows:!0,shadowSoftness:12,shadowIntensity:1,shadowBias:1e-4,ptBounces:3,ptGIStrength:1,ptStochasticShadows:!1,light0_visible:!0,light0_fixed:!1,light0_castShadow:!0,light0_type:!1,light0_intensity:50,light0_falloff:50,light0_posX:-.34174133805446993,light0_posY:-1.233562063425787,light0_posZ:1.8137779830637029,light0_color:"#ffffff",light1_visible:!1,light1_fixed:!1,light1_castShadow:!1,light1_type:!1,light1_intensity:.5,light1_falloff:.5,light1_posX:.05,light1_posY:.075,light1_posZ:-.1,light1_color:"#ff0000",light2_visible:!1,light2_fixed:!1,light2_castShadow:!1,light2_type:!1,light2_intensity:.5,light2_falloff:.5,light2_posX:.25,light2_posY:.075,light2_posZ:-.1,light2_color:"#0000ff"},optics:{camType:0,camFov:60,orthoScale:2,dofStrength:0,dofFocus:10},navigation:{flySpeed:.5,autoSlow:!0},audio:{smoothing:.5,links:[],selectedLinkId:null,threshold:.1,agcEnabled:!1,attack:.1,decay:.3,highPass:20,lowPass:2e4,gain:1}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:.4173748330716279,y:.023019150204605446,z:-.01057663171011426,w:.9083812538268042},sceneOffset:{x:0,y:-2,z:2,xL:.04868238113505319,yL:-.4245626359584309,zL:.3428044731107205},targetDistance:2.077035516500473,cameraMode:"Orbit",lights:[],renderMode:"Direct",quality:{aaMode:"Always",aaLevel:1,msaa:1,accumulation:!0},animations:[],sequence:{durationFrames:300,fps:30,tracks:{}},duration:300}},ai={id:"BoxBulb",name:"Box Bulb",shortDescription:'Hybrid of Box Folds and Mandelbulb Power. Creates "Boxy Bulbs".',description:"A hybrid that combines box/sphere folding with the Mandelbulb power function. Now with rotation controls. (Formerly FoldingBrot)",shader:{function:`
    void DE_Bulb(inout vec3 z, inout float dr, inout float trap, float power) {
        float r = max(length(z), 1.0e-9);
        float rp1 = pow(r, power - 1.0);
        dr = rp1 * power * dr + 1.0;
        float theta = acos(clamp(z.z / r, -1.0, 1.0));
        float phi = atan(z.y, z.x);
        theta *= power;
        phi *= power;
        float zr = rp1 * r;
        z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        trap = min(trap, r);
    }

    void formula_BoxBulb(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;
        
        // Rotation from vec3A
        float angX = uVec3A.x;
        float angZ = uVec3A.z;
        if (abs(angX) > 0.001 || abs(angZ) > 0.001) {
             float sx = sin(angX), cx = cos(angX);
             float sz = sin(angZ), cz = cos(angZ);
             mat2 rotX = mat2(cx, -sx, sx, cx);
             mat2 rotZ = mat2(cz, -sz, sz, cz);
             z3.yz = rotX * z3.yz;
             z3.xy = rotZ * z3.xy;
        }

        boxFold(z3, dr, 1.0); 
        sphereFold(z3, dr, uParamB, uParamD);
        float scale = uParamC;
        z3 *= scale;
        dr *= abs(scale);
        DE_Bulb(z3, dr, trap, uParamA); 
        z.xyz = z3 + c.xyz;
        trap = min(trap, length(z.xyz));
    }`,loopBody:"formula_BoxBulb(z, dr, trap, c);"},parameters:[{label:"Power",id:"paramA",min:1.5,max:16,step:.001,default:5},{label:"Min Radius",id:"paramB",min:0,max:1.5,step:.001,default:.5},{label:"Scale",id:"paramC",min:.5,max:2.5,step:.001,default:1},{label:"Fixed Radius",id:"paramD",min:.1,max:2.5,step:.001,default:1},{label:"Rotation",id:"vec3A",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},scale:"pi",mode:"rotation"}],defaultPreset:{formula:"BoxBulb",features:{coreMath:{iterations:16,paramA:5.8386,paramB:.321,paramC:.91,paramD:1.279,vec3A:{x:0,y:0,z:0}},coloring:{mode:6,repeats:1,phase:2.62,scale:1,offset:2.62,bias:1,twist:0,escape:33.72,mode2:0,repeats2:100,phase2:2.4,blendMode:3,blendOpacity:1,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:.2,layer3Turbulence:0,gradient:[{id:"1766255418053_0",position:.0642570281124498,color:"#567C1A",bias:.5,interpolation:"linear"},{id:"1766255418053_1",position:.167,color:"#33A532",bias:.5,interpolation:"linear"},{id:"1766255418053_2",position:.333,color:"#18DA5F",bias:.5,interpolation:"linear"},{id:"1766255418053_3",position:.5,color:"#299B77",bias:.5,interpolation:"linear"},{id:"1766255418053_4",position:.667,color:"#217a79",bias:.5,interpolation:"linear"},{id:"1766258643816",position:.7469879518072289,color:"#4B0000",bias:.5,interpolation:"linear"},{id:"1766255418053_5",position:.833,color:"#105965",bias:.5,interpolation:"linear"},{id:"1766255418053_6",position:1,color:"#074050",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}]},atmosphere:{fogNear:1e-4,fogFar:501,fogColor:"#132218",fogDensity:.14,glowIntensity:1e-4,glowSharpness:360,glowColor:"#ffffff",glowMode:!1,aoIntensity:0,aoSpread:.1},materials:{reflection:.4,specular:1.05,roughness:.25,diffuse:.21,envStrength:0,rim:0,rimExponent:4,emission:.01,emissionColor:"#ffffff",emissionMode:0},geometry:{juliaMode:!1,juliaX:.19,juliaY:-.93,juliaZ:-.41,hybridMode:!1,hybridIter:2,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1},lighting:{shadows:!0,shadowSoftness:8,shadowIntensity:.98,shadowBias:.002},quality:{detail:2.4,fudgeFactor:.65,pixelThreshold:.9,maxSteps:300,aaMode:"Auto",aaLevel:1,estimator:4},optics:{dofStrength:0,dofFocus:1.368}},cameraPos:{x:.25378547286620784,y:.054246624931105866,z:1.9340201043333456},cameraRot:{x:-.013871509693272319,y:.0651855581354543,z:.0009062372749709499,w:.9977763291256213},cameraFov:81,sceneOffset:{x:0,y:0,z:0,xL:.06415813902081223,yL:.10257047639815663,zL:.48918654020794206},cameraMode:"Orbit",lights:[{type:"Point",position:{x:.3559846285676508,y:.08248395080524681,z:2.1100465907611543},rotation:{x:0,y:0,z:0},color:"#99A4FF",intensity:5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#ff0000",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#0000ff",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}],animations:[{id:"4yFFplV3QPo3KoNaGJwfX",enabled:!1,target:"coreMath.paramA",shape:"Sine",period:5,amplitude:1,baseValue:5.8386,phase:0,smoothing:.5}]}},oi={id:"MengerAdvanced",name:"Menger Advanced",shortDescription:"Hybrid Menger Sponge with internal Box Folds and vertical scaling.",description:"An advanced variant of the Menger Sponge. It adds an Inner Box Fold (Param E) to generate machinery-like details inside the voids, and Z-Scale (Param F) for creating towering structures. (Formerly UberMenger)",shader:{function:`
    void formula_MengerAdvanced(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        // 1. Rotation (vec3A = Rot X/Y/Z)
        vec3 rot = uVec3A;
        float sx = sin(rot.x), cx = cos(rot.x);
        float sy = sin(rot.y), cy = cos(rot.y);
        float sz = sin(rot.z), cz = cos(rot.z);
        mat2 rotX = mat2(cx, -sx, sx, cx);
        mat2 rotY = mat2(cy, -sy, sy, cy);
        mat2 rotZ = mat2(cz, -sz, sz, cz);
        z3.yz = rotX * z3.yz;
        z3.xz = rotY * z3.xz;
        z3.xy = rotZ * z3.xy;

        // 2. Menger Sorting (The Sponge Logic)
        z3 = abs(z3);
        vec3 ms = z3;
        z3.x = max(max(ms.x, ms.y), ms.z);
        z3.z = min(min(ms.x, ms.y), ms.z);
        z3.y = ms.x + ms.y + ms.z - z3.x - z3.z;
        
        // 3. UBER FEATURE: Inner Box Fold (Param C)
        // Injects Mandelbox-like complexity inside the sponge voids
        if (uParamC > 0.0) {
            float limit = uParamC;
            z3 = clamp(z3, -limit, limit) * 2.0 - z3;
        }

        // 4. Scaling & IFS
        float scale = (abs(uParamA - 1.0) < 0.001) ? 1.001 : uParamA;
        float offset = uParamB;
        
        z3 = z3 * scale - vec3(offset * (scale - 1.0));
        
        // 5. UBER FEATURE: Z-Scale (Param D)
        // Calculate Adaptive Stretch based on alignment with the Z-Axis.
        float zScale = uParamD;
        float stretchFactor = 1.0;
        
        if (abs(zScale - 1.0) > 0.01) {
            // Stretching: adaptive derivative based on Z-alignment
            // Squashing (zScale<1): conservative bound (1.0) prevents overstepping
            float alignment = abs(z3.z) / (length(z3) + 1.0e-9);
            stretchFactor = mix(1.0, mix(1.0, zScale, alignment), step(1.0, zScale));
            z3.z *= zScale;
        }

        // Injection
        if (uJuliaMode > 0.5) z3 += c.xyz;
        
        // Derivative Update (Chain Rule)
        // We multiply by Scale, then by our Calculated Adaptive Stretch
        dr = dr * abs(scale) * stretchFactor;
        
        z.xyz = z3;
        trap = min(trap, length(z3));
    }`,loopBody:"formula_MengerAdvanced(z, dr, trap, c);"},parameters:[{label:"Scale",id:"paramA",min:.5,max:4,step:.001,default:2.236},{label:"Offset",id:"paramB",min:0,max:3,step:.001,default:1},{label:"Rotation",id:"vec3A",type:"vec3",min:-6.28,max:6.28,step:.001,default:{x:0,y:0,z:.88},mode:"rotation"},{label:"Inner Fold",id:"paramC",min:0,max:1.5,step:.01,default:.618},{label:"Z Scale",id:"paramD",min:.2,max:3,step:.01,default:.442}],defaultPreset:{formula:"MengerAdvanced",features:{atmosphere:{fogIntensity:0,fogNear:2,fogFar:10,fogColor:"#000000",fogDensity:.1,glowIntensity:0,glowSharpness:10,glowMode:!1,glowColor:"#ffffff",aoIntensity:.2,aoSpread:.1,aoMode:!1},materials:{diffuse:.9,reflection:0,specular:.87,roughness:.34,rim:.13,rimExponent:16,envStrength:1,envMapVisible:!0,envBackgroundStrength:.1,envSource:1,useEnvMap:!0,envRotation:0,envGradientStops:[{id:"0",position:0,color:"#00C0BF",bias:.5,interpolation:"linear"},{id:"1",position:.167,color:"#16B178",bias:.5,interpolation:"linear"},{id:"2",position:.333,color:"#9ccb86",bias:.5,interpolation:"linear"},{id:"3",position:.5,color:"#e9e29c",bias:.5,interpolation:"linear"},{id:"4",position:.667,color:"#EEBB88",bias:.5,interpolation:"linear"},{id:"5",position:.833,color:"#E83513",bias:.5,interpolation:"linear"},{id:"6",position:1,color:"#CF0B1E",bias:.5,interpolation:"linear"}],emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},coloring:{gradient:[{id:"0",position:0,color:"#070611",bias:.5,interpolation:"linear"},{id:"1",position:.32,color:"#111320",bias:.5,interpolation:"linear"},{id:"2",position:.67,color:"#30306B",bias:.5,interpolation:"linear"},{id:"3",position:.68,color:"#EAAC85",bias:.5,interpolation:"linear"},{id:"4",position:.82,color:"#975F44",bias:.5,interpolation:"linear"},{id:"5",position:.97,color:"#170C05",bias:.5,interpolation:"linear"}],mode:0,scale:11.72,offset:1.93,repeats:1,phase:.64,bias:1,twist:0,escape:1.65,gradient2:[{id:"1",position:0,color:"#ffffff",bias:.5,interpolation:"linear"},{id:"2",position:.47,color:"#353535",bias:.5,interpolation:"linear"},{id:"3",position:1,color:"#ffffff",bias:.5,interpolation:"linear"}],mode2:0,scale2:32.05,offset2:3.76,repeats2:3.3,phase2:0,bias2:1,twist2:0,blendMode:0,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},geometry:{},quality:{fudgeFactor:1,detail:3,pixelThreshold:.5,maxSteps:300,distanceMetric:0,estimator:1},coreMath:{iterations:12,paramA:2.236,paramB:1,paramC:.618,paramD:.442,vec3A:{x:0,y:0,z:.88}},lighting:{shadows:!0,shadowSoftness:16,shadowIntensity:.68,shadowBias:.001,ptBounces:3,ptGIStrength:1,ptStochasticShadows:!1,lights:[{type:"Point",position:{x:-.985,y:1.872,z:2.008},color:"#ffffff",intensity:9.18,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0}]},optics:{},navigation:{}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.045,y:-.453,z:.141,w:.879},sceneOffset:{x:-4,y:0,z:3,xL:.35,yL:-.27,zL:.18},targetDistance:2.98,cameraMode:"Orbit",renderMode:"Direct"}},ri={id:"Bristorbrot",name:"Bristorbrot",shortDescription:"Custom 3D polynomial with sharp edges and smooth bulbous forms.",description:"A custom polynomial fractal: x²-y²-z², y(2x-z), z(2x+y). No folding — the asymmetric cross-terms between axes create sharp crystalline edges mixed with smooth bulb regions. Supports scale, rotation, twist, and shift.",shader:{function:`
    void formula_Bristorbrot(inout vec4 z, inout float dr, inout float trap, vec4 c, mat2 rotX, mat2 rotZ) {
        vec3 z3 = z.xyz;
        
        // Twist D
        if (abs(uParamD) > 0.001) {
            float ang = z3.z * uParamD;
            float s = sin(ang); float co = cos(ang);
            z3.xy = mat2(co, -s, s, co) * z3.xy;
        }

        z3.yz = rotX * z3.yz;
        z3.xy = rotZ * z3.xy;
        float x = z3.x; float y = z3.y; float z_ = z3.z;
        z3.x = x*x - y*y - z_*z_;
        z3.y = y * (2.0 * x - z_);
        z3.z = z_ * (2.0 * x + y);
        float r = length(vec3(x,y,z_));
        dr = 2.0 * r * dr + 1.0;
        z3 = z3 * uParamA + c.xyz;
        
        // Shift C (X)
        if (abs(uParamC) > 0.001) z3.x += uParamC;
        
        // Offset B (Y)
        if (abs(uParamB) > 0.001) z3.y += uParamB;

        dr *= abs(uParamA);
        z.xyz = z3;
        trap = min(trap, dot(z3,z3));
    }`,loopInit:`
        float angC = uVec3A.x;
        float sC = sin(angC), cC = cos(angC);
        mat2 rotX = mat2(cC, -sC, sC, cC);
        
        float angD = uVec3A.z;
        float sD = sin(angD), cD = cos(angD);
        mat2 rotZ = mat2(cD, -sD, sD, cD);
        `,loopBody:"formula_Bristorbrot(z, dr, trap, c, rotX, rotZ);"},parameters:[{label:"Scale",id:"paramA",min:.5,max:3,step:.001,default:1},{label:"Offset",id:"paramB",min:-2,max:2,step:.001,default:0},{label:"Rotation",id:"vec3A",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},scale:"pi",mode:"rotation"},{label:"Shift X",id:"paramC",min:-2,max:2,step:.01,default:0},{label:"Twist",id:"paramD",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"Bristorbrot",features:{coreMath:{iterations:21,paramA:.738,paramB:0,vec3A:{x:0,y:0,z:1.2},paramC:.98,paramD:.97},coloring:{mode:1,repeats:24.4,phase:3.9,scale:24.415,offset:3.906,bias:1,twist:0,escape:4,mode2:5,repeats2:1,phase2:2.4,blendMode:0,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:.2,layer3Turbulence:0,gradient:[{id:"0",position:0,color:"#ff0000"},{id:"1",position:.17,color:"#ffff00"},{id:"2",position:.33,color:"#00ff00"},{id:"3",position:.5,color:"#00ffff"},{id:"4",position:.67,color:"#000000"},{id:"5",position:.83,color:"#ff00ff"},{id:"6",position:1,color:"#ff0000"}],gradient2:[{id:"1",position:.61,color:"#FFFFFF"},{id:"2",position:.88,color:"#FF0505"}]},atmosphere:{fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:.067,glowSharpness:480,glowColor:"#FF2323",glowMode:!0,aoIntensity:0,aoSpread:.22},materials:{reflection:.35,specular:0,roughness:.42,diffuse:1.02,envStrength:0,rim:.02,rimExponent:2.6,emission:.004,emissionColor:"#ffffff",emissionMode:0},geometry:{juliaMode:!0,juliaX:1.04,juliaY:.21,juliaZ:.81,hybridCompiled:!0,hybridMode:!0,hybridIter:1,hybridScale:1,hybridMinR:.79,hybridFixedR:1.08,hybridFoldLimit:.87,hybridSwap:!1},lighting:{shadows:!0,shadowSoftness:2,shadowIntensity:.92,shadowBias:.015},quality:{detail:2.8,fudgeFactor:.6,pixelThreshold:.5,maxSteps:300,aaMode:"Auto",aaLevel:1},optics:{dofStrength:0,dofFocus:1.368}},cameraPos:{x:.19278471475118408,y:1.0849557120921942,z:5.1524976426487115},cameraRot:{x:-.10384525583017853,y:.016524988834210615,z:-.017944827094612474,w:.994294257635102},cameraFov:60,sceneOffset:{x:1,y:1,z:2,xL:-.17139723987914707,yL:-.09973834195017878,zL:-.12121507460186143},cameraMode:"Orbit",lights:[{type:"Point",position:{x:.16245054993746125,y:.326925950685747,z:-2.2309267197330493},rotation:{x:0,y:0,z:0},color:"#99A4FF",intensity:39.8,falloff:.6,falloffType:"Quadratic",fixed:!0,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#ff0000",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#0000ff",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}],animations:[{id:"4yFFplV3QPo3KoNaGJwfX",enabled:!1,target:"coreMath.paramA",shape:"Sine",period:5,amplitude:1,baseValue:.738,phase:0,smoothing:.5}]}},ii={id:"MakinBrot",name:"Makin Brot",shortDescription:"Creates stacked, pagoda-like ornamental structures.",description:"A 3D fractal variant discovered by Makin. Custom polynomial: x²-y²-z², 2xy, 2z(x-y). Supports rotation, shift, and twist.",shader:{preamble:`
    // MakinBrot: Pre-calculated rotation (computed once per frame)
    vec3 uMakin_rotAxis = vec3(0.0, 1.0, 0.0);
    float uMakin_rotCos = 1.0;
    float uMakin_rotSin = 0.0;

    void MakinBrot_precalcRotation() {
        if (abs(uVec3B.z) > 0.001) {
            float azimuth = uVec3B.x;
            float pitch = uVec3B.y;
            float rotAngle = uVec3B.z * 0.5;
            float cosPitch = cos(pitch);
            uMakin_rotAxis = vec3(
                cosPitch * sin(azimuth),
                sin(pitch),
                cosPitch * cos(azimuth)
            );
            uMakin_rotSin = sin(rotAngle);
            uMakin_rotCos = cos(rotAngle);
        }
    }`,function:`
    void formula_MakinBrot(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        // Param F: Twist
        if (abs(uParamF) > 0.001) {
            float ang = z3.z * uParamF;
            float s = sin(ang); float co = cos(ang);
            z3.xy = mat2(co, -s, s, co) * z3.xy;
        }

        // Vec3B: Rotation using pre-calculated Rodrigues
        if (abs(uVec3B.z) > 0.001) {
            z3 = z3 * uMakin_rotCos + cross(uMakin_rotAxis, z3) * uMakin_rotSin
                 + uMakin_rotAxis * dot(uMakin_rotAxis, z3) * (1.0 - uMakin_rotCos);
        }

        float x = z3.x; float y = z3.y; float z_ = z3.z;
        z3.x = x*x - y*y - z_*z_;
        z3.y = 2.0 * x * y;
        z3.z = 2.0 * z_ * (x - y);
        float r = length(vec3(x,y,z_));
        dr = 2.0 * r * dr + 1.0;
        z3 = z3 * uParamA + c.xyz;

        // Vec3A: Shift
        z3 += uVec3A;

        dr *= abs(uParamA);
        z.xyz = z3;
        trap = min(trap, dot(z3,z3));
    }`,loopBody:"formula_MakinBrot(z, dr, trap, c);",loopInit:"MakinBrot_precalcRotation();"},parameters:[{label:"Scale",id:"paramA",min:.5,max:3,step:.001,default:1},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.01,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"MakinBrot",features:{coreMath:{iterations:24,paramA:1.455,paramF:0,vec3A:{x:0,y:0,z:0},vec3B:{x:0,y:0,z:0}},coloring:{mode:1,repeats:1.3,phase:.2,scale:1.298,offset:.207,bias:1,twist:0,escape:2,mode2:5,repeats2:1,phase2:2.4,blendMode:0,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:.2,layer3Turbulence:0,gradient:[{id:"0",position:0,color:"#ff0000"},{id:"1",position:.17,color:"#ffff00"},{id:"2",position:.33,color:"#00ff00"},{id:"3",position:.5,color:"#00ffff"},{id:"4",position:.67,color:"#000000"},{id:"5",position:.83,color:"#ff00ff"},{id:"6",position:1,color:"#ff0000"}],gradient2:[{id:"1",position:.61,color:"#FFFFFF"},{id:"2",position:.88,color:"#FF0505"}]},atmosphere:{fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:.037,glowSharpness:47,glowColor:"#FF2323",glowMode:!1,aoIntensity:0,aoSpread:.1},materials:{reflection:.35,specular:0,roughness:.42,diffuse:1.41,envStrength:0,rim:.09,rimExponent:2,emission:.016,emissionColor:"#ffffff",emissionMode:0},geometry:{juliaMode:!1,juliaX:-.99,juliaY:.54,juliaZ:-.72,hybridMode:!1,hybridIter:2,hybridScale:2.13,hybridMinR:.72,hybridFixedR:1,hybridFoldLimit:.97},lighting:{shadows:!0,shadowSoftness:78,shadowIntensity:1,shadowBias:0},quality:{detail:6.3,fudgeFactor:.7,pixelThreshold:.1,maxSteps:300,aaMode:"Auto",aaLevel:1},optics:{dofStrength:0,dofFocus:1.368}},cameraPos:{x:-.8533969657887399,y:-.13446693672101487,z:1.154550164122028},cameraRot:{x:.04129519161407524,y:-.3129924386582225,z:.02381642440995219,w:.948558494991564},cameraFov:60,sceneOffset:{x:0,y:0,z:0,xL:-.8442073707354043,yL:-.15795817300110893,zL:.25127901307775025},cameraMode:"Orbit",lights:[{type:"Point",position:{x:-1.5227203148465231,y:-.10858858668233184,z:.5084783790561214},rotation:{x:0,y:0,z:0},color:"#99A4FF",intensity:5,falloff:61.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#ff0000",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#0000ff",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}],animations:[{id:"4yFFplV3QPo3KoNaGJwfX",enabled:!1,target:"coreMath.paramA",shape:"Sine",period:5,amplitude:1,baseValue:1.455,phase:0,smoothing:.5}]}},ni={id:"Tetrabrot",name:"Tetrabrot",shortDescription:"4D Pseudo-Quaternion set. Produces diamond-like geometric symmetries.",description:"A 4D Mandelbrot set visualization using a specific squaring function. Now with pre-rotation support.",shader:{function:`
    vec4 tetraSquare(vec4 q) {
        return vec4(q.x*q.x - q.y*q.y - q.z*q.z + q.w*q.w, 2.0*(q.x*q.y - q.z*q.w), 2.0*(q.x*q.z - q.y*q.w), 2.0*(q.x*q.w + q.y*q.z));
    }

    void formula_Tetrabrot(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        
        // Rotations via vec3A (Z, X, Y axes)
        float angZ = uVec3A.x;
        if (abs(angZ) > 0.001) {
            float s = sin(angZ); float co = cos(angZ);
            z.xy = mat2(co, -s, s, co) * z.xy;
        }

        float angX = uVec3A.y;
        if (abs(angX) > 0.001) {
            float s = sin(angX); float co = cos(angX);
            z.yz = mat2(co, -s, s, co) * z.yz;
        }

        float angY = uVec3A.z;
        if (abs(angY) > 0.001) {
            float s = sin(angY); float co = cos(angY);
            z.xz = mat2(co, -s, s, co) * z.xz;
        }

        // Fix: Chain rule +1.0
        dr = 2.0 * length(z) * dr + 1.0;
        z = tetraSquare(z) + c;
        trap = min(trap, dot(z,z));
    }`,loopBody:"formula_Tetrabrot(z, dr, trap, c);"},parameters:[{label:"Julia C (W)",id:"paramA",min:-1,max:1,step:.001,default:-.2},{label:"Slice W",id:"paramB",min:-1,max:1,step:.001,default:0},{label:"Rotation",id:"vec3A",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"axes"}],defaultPreset:{formula:"Tetrabrot",features:{coreMath:{iterations:28,paramA:.186,paramB:0,vec3A:{x:0,y:0,z:0}},coloring:{mode:5,repeats:1,phase:.87,scale:1,offset:.87,bias:1,twist:0,escape:4,mode2:5,repeats2:1,phase2:2.4,blendMode:0,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,gradient:[{id:"1766256604050_0",position:0,color:"#0A4CD3",bias:.5,interpolation:"linear"},{id:"1766256604050_1",position:.5,color:"#3E7FAA",bias:.5,interpolation:"linear"},{id:"1766256604050_2",position:1,color:"#62E9E9",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:.61,color:"#FFFFFF"},{id:"2",position:.88,color:"#FF0505"}]},atmosphere:{fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:1e-4,glowSharpness:47,glowColor:"#FF2323",glowMode:!1,aoIntensity:.4,aoSpread:.16},materials:{reflection:.35,specular:1.98,roughness:.11,diffuse:2,envStrength:0,rim:0,rimExponent:2,emission:.008,emissionColor:"#ffffff",emissionMode:0},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1,hybridIter:2,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1},lighting:{shadows:!1,shadowSoftness:78,shadowIntensity:1,shadowBias:0},quality:{detail:1.1,fudgeFactor:.8,pixelThreshold:.5,maxSteps:300,aaMode:"Auto",aaLevel:1},optics:{dofStrength:0,dofFocus:1.368}},cameraPos:{x:.4920528506922438,y:-.07167206331378606,z:.4438830367018614},cameraRot:{x:-.2287674791967978,y:.3386642094524777,z:-.6145511225348657,w:.6747584097208478},cameraFov:60,sceneOffset:{x:0,y:0,z:0,xL:.43671384293273163,yL:-.013902955556870706,zL:.11442336133892608},cameraMode:"Orbit",lights:[{type:"Point",position:{x:.554923231509613,y:-.15190121945393503,z:-.030795909267397503},rotation:{x:0,y:0,z:0},color:"#FFFFFF",intensity:5,falloff:61.5,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#ff0000",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#0000ff",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},si={id:"Buffalo",name:"Buffalo 3D",shortDescription:'Mandelbulb with per-axis absolute value folds — creates the signature "buffalo" shape.',description:"The Buffalo fractal (ported from Mandelbulber via 3Dickulus). A Mandelbulb variant with selective per-axis absolute value folding before and after the power iteration. The default abs on Y+Z creates the distinctive buffalo/horn shape. Based on the original by youhn @ fractalforums.com.",shader:{preamble:`
    // Buffalo: Pre-calculated rotation (computed once per frame)
    vec3 uBuffalo_rotAxis = vec3(0.0, 1.0, 0.0);
    float uBuffalo_rotCos = 1.0;
    float uBuffalo_rotSin = 0.0;

    void Buffalo_precalcRotation() {
        if (abs(uVec3C.z) > 0.001) {
            float azimuth = uVec3C.x;
            float pitch = uVec3C.y;
            float rotAngle = uVec3C.z * 0.5;
            float cosPitch = cos(pitch);
            uBuffalo_rotAxis = vec3(
                cosPitch * sin(azimuth),
                sin(pitch),
                cosPitch * cos(azimuth)
            );
            uBuffalo_rotSin = sin(rotAngle);
            uBuffalo_rotCos = cos(rotAngle);
        }
    }`,function:`
    void formula_Buffalo(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        // Vec3B: Abs before power
        z3 = mix(z3, abs(z3), step(vec3(0.5), uVec3B));

        // Vec3C: Rotation using pre-calculated values
        if (abs(uVec3C.z) > 0.001) {
            z3 = z3 * uBuffalo_rotCos + cross(uBuffalo_rotAxis, z3) * uBuffalo_rotSin
                 + uBuffalo_rotAxis * dot(uBuffalo_rotAxis, z3) * (1.0 - uBuffalo_rotCos);
        }

        // Mandelbulb power iteration (branchless)
        float r = max(length(z3), 1.0e-9);
        float power = uParamA;
        float rp1 = pow(r, power - 1.0);
        dr = rp1 * power * dr + 1.0;

        float theta = acos(clamp(z3.z / r, -1.0, 1.0));
        float phi_angle = atan(z3.y, z3.x);
        float zr = rp1 * r;
        theta *= power;
        phi_angle *= power;

        z3 = zr * vec3(sin(theta) * cos(phi_angle), sin(phi_angle) * sin(theta), cos(theta));

        // Vec3A: Abs after power
        z3 = mix(z3, abs(z3), step(vec3(0.5), uVec3A));

        z3 += c.xyz;
        z.xyz = z3;
        trap = min(trap, r);
    }`,loopBody:"formula_Buffalo(z, dr, trap, c);",loopInit:"Buffalo_precalcRotation();"},parameters:[{label:"Power",id:"paramA",min:1,max:16,step:.001,default:2},{label:"Abs After Power",id:"vec3A",type:"vec3",min:0,max:1,step:1,default:{x:0,y:1,z:1},mode:"toggle"},{label:"Abs Before Power",id:"vec3B",type:"vec3",min:0,max:1,step:1,default:{x:0,y:0,z:0},mode:"toggle"},{label:"Rotation",id:"vec3C",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"}],defaultPreset:{formula:"Buffalo",features:{coreMath:{iterations:21,paramA:2,vec3A:{x:0,y:1,z:1},vec3B:{x:0,y:0,z:0},vec3C:{x:0,y:0,z:0}},coloring:{mode:0,repeats:1,phase:.21,scale:10.928878861622898,offset:1.0718989457927122,bias:1,twist:0,escape:5,mode2:4,repeats2:1,phase2:0,blendMode:0,blendOpacity:0,twist2:0,layer3Color:"#aaccff",layer3Scale:10,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0,gradient:[{id:"1766251986254_0",position:0,color:"#330600",bias:.5,interpolation:"linear"},{id:"1766252034417",position:.13654618473895586,color:"#BC2900",bias:.5,interpolation:"linear"},{id:"1766251986254_1",position:.3,color:"#FFAF0D",bias:.5,interpolation:"linear"},{id:"1766252020600",position:.5180722891566265,color:"#743C14",bias:.5,interpolation:"linear"},{id:"1766252024362",position:.6224899598393574,color:"#0B091D",bias:.5,interpolation:"linear"},{id:"1766251986254_2",position:.7,color:"#001B3D",bias:.5,interpolation:"linear"},{id:"1766251986254_3",position:1,color:"#700303",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#FFFFFF"}]},ao:{aoIntensity:0,aoSpread:.2,aoSamples:7,aoEnabled:!0,aoMode:!1},atmosphere:{fogNear:0,fogFar:100,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:50,glowColor:"#ffffff",glowMode:!1},materials:{diffuse:1.5,reflection:0,specular:.27,roughness:.342,rim:0,rimExponent:4,envStrength:.65,envBackgroundStrength:.21,envSource:1,useEnvMap:!1,envRotation:0,emission:.1,emissionMode:0,emissionColor:"#ffffff",envGradientStops:[{id:"1773425036101_0",position:0,color:"#421E0F",bias:.5,interpolation:"linear"},{id:"1773425036101_1",position:.067,color:"#19071A",bias:.5,interpolation:"linear"},{id:"1773425036101_2",position:.133,color:"#09012F",bias:.5,interpolation:"linear"},{id:"1773425036101_3",position:.2,color:"#040449",bias:.5,interpolation:"linear"},{id:"1773425036101_4",position:.267,color:"#000764",bias:.5,interpolation:"linear"},{id:"1773425036101_5",position:.333,color:"#0C2C8A",bias:.5,interpolation:"linear"},{id:"1773425036101_6",position:.4,color:"#1852B1",bias:.5,interpolation:"linear"},{id:"1773425036101_7",position:.467,color:"#397DD1",bias:.5,interpolation:"linear"},{id:"1773425036101_8",position:.533,color:"#86B5E5",bias:.5,interpolation:"linear"},{id:"1773425036101_9",position:.6,color:"#D3ECF8",bias:.5,interpolation:"linear"},{id:"1773425036101_10",position:.667,color:"#F1E9BF",bias:.5,interpolation:"linear"},{id:"1773425036101_11",position:.733,color:"#F8C95F",bias:.5,interpolation:"linear"},{id:"1773425036101_12",position:.8,color:"#FFAA00",bias:.5,interpolation:"linear"},{id:"1773425036101_13",position:.867,color:"#CC8000",bias:.5,interpolation:"linear"},{id:"1773425036101_14",position:.933,color:"#995700",bias:.5,interpolation:"linear"},{id:"1773425036101_15",position:1,color:"#6A3403",bias:.5,interpolation:"linear"}]},geometry:{juliaMode:!0,juliaX:.37,juliaY:-.34,juliaZ:-.42,hybridMode:!1},lighting:{advancedLighting:!0,ptEnabled:!0,shadows:!0,shadowSoftness:16,shadowIntensity:1,shadowBias:.002},quality:{detail:1.618,fudgeFactor:1,pixelThreshold:.25,maxSteps:300,estimator:0},optics:{camFov:50,dofStrength:0,dofFocus:1.407048060869024}},cameraPos:{x:-11409465865707341e-33,y:10722232409131055e-32,z:-.09316535897248968},cameraRot:{x:1,y:-7271568003412109e-48,z:-6123233995736766e-32,w:3710962377975202e-33},cameraFov:50,sceneOffset:{x:-17223652652763669e-32,y:9193078863633456e-32,z:-2.6897222995758057,xL:-4285372606041406e-39,yL:-9521451285809295e-41,zL:-39146655694821675e-24},targetDistance:.09316535897248968,cameraMode:"Orbit",lights:[{type:"Point",position:{x:-.4527317101694649,y:-.04511061025925526,z:-2.1858885005397504},rotation:{x:0,y:0,z:0},color:"#FFCEA6",intensity:.75,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:4e3},{type:"Point",position:{x:2,y:-1,z:1},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:0,y:0,z:-3},rotation:{x:0,y:0,z:0},color:"#0044ff",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},li={id:"Modular",name:"Modular Builder",shortDescription:"Construct custom fractal equations using a Node Graph.",description:"Construct your own fractal equation by chaining operations together. Combine folds, rotations, and logic via the Graph tab.",shader:{function:"",loopBody:"",getDist:""},parameters:[null,null,null,null],defaultPreset:{formula:"Modular",features:{coreMath:{iterations:16,paramA:8,paramB:0,paramC:0,paramD:0,paramE:0,paramF:0},lighting:{shadows:!0,shadowSoftness:16,shadowIntensity:1,shadowBias:.002}},pipeline:Ea,cameraPos:{x:0,y:0,z:4},cameraRot:{x:0,y:0,z:0,w:1},sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0}}},ci={id:"MandelTerrain",name:"MandelTerrain",shortDescription:'3D Heightmap of the Mandelbrot set. Creates alien landscapes and "Math Mountains".',description:"A 3D Heightmap of the Mandelbrot set. Iterations slider controls terrain detail.",shader:{function:`
    void formula_MandelTerrain(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec2 p = z.xz;
        
        // --- Zoom Logic ---
        float zoomVal = uParamB; 
        float zoom = pow(2.0, zoomVal);
        vec2 center = uVec2A;
        
        // Map 3D pos to 2D Complex Plane
        vec2 mapPos = p * (2.0 / zoom) + center;
        
        // --- Julia / Mandelbrot Switch ---
        vec2 c2;
        vec2 z2;
        vec2 dz;
        
        bool isJulia = uJuliaMode > 0.5;
        
        if (isJulia) {
            // Julia Mode: C is constant, Z starts at pixel
            c2 = uJulia.xy;
            z2 = mapPos;
            dz = vec2(1.0, 0.0); // Derivative starts at 1
        } else {
            // Mandelbrot Mode: C is pixel, Z starts at 0
            c2 = mapPos;
            z2 = vec2(0.0);
            dz = vec2(0.0); // Derivative starts at 0
        }
        
        float m2 = 0.0;
        float trapDist = 1e20;
        
        // Accumulate trap height (Summation for smooth blending)
        float trapHeightAccum = 0.0;
        float runAtten = 1.0;
        
        // Fixed Attenuation Factor (User Preference)
        float attenDecay = 0.777;
        
        // COMPILER OPTIMIZATION: Use int loop with uLoopGuard
        int maxIter = int(uIterations);
        int limit = maxIter;
        
        float iter = 0.0;
        float smoothVal = 0.0;
        float dist = 0.0;
        bool escaped = false;

        // Local hard limit high enough for deep zooms but low enough to avoid compiler hangs
        const int MAX_FORMULA_ITER = 2000;

        for(int i=0; i<MAX_FORMULA_ITER; i++) {
            if (i > limit) break;

            // --- BURNING SHIP SUPPORT ---
            if (uBurningEnabled > 0.5) {
                 // Flip derivative to maintain DE continuity across axes
                 dz *= sign(z2 + vec2(1e-10));
                 z2 = abs(z2);
            }

            // Derivative: dz = 2*z*dz (+ 1 if Mandelbrot)
            // (Chain rule for z^2 + c)
            float dzx = 2.0 * (z2.x * dz.x - z2.y * dz.y);
            float dzy = 2.0 * (z2.x * dz.y + z2.y * dz.x);
            
            if (!isJulia) {
                dzx += 1.0;
            }
            
            dz = vec2(dzx, dzy);

            // Z = Z^2 + C
            float x = (z2.x * z2.x - z2.y * z2.y) + c2.x;
            float y = (2.0 * z2.x * z2.y) + c2.y;
            z2 = vec2(x, y);
            
            m2 = dot(z2, z2);
            
            // Standard Trap Tracking (for coloring)
            trapDist = min(trapDist, m2);
            
            // --- Trap Height Accumulation ---
            // Sum contributions. 
            // Allow negative param D to work (abs check)
            if (abs(uParamD) > 0.001 && m2 < 0.25) {
                float distToOrigin = sqrt(m2);
                
                // Smooth shape (Metaball-like blending)
                float t = smoothstep(0.5, 0.0, distToOrigin);
                
                // Accumulate with attenuation
                trapHeightAccum += t * runAtten;
            }
            
            // Decay influence for deeper iterations
            runAtten *= attenDecay;
            
            // Use global Escape Threshold (usually squared radius)
            // Default escape is 4.0 (radius 2.0), but allowing it to grow helps decomposition
            if (m2 > uEscapeThresh) { 
                escaped = true;
                // Smooth Iteration Count
                // Renormalize based on log of threshold to keep bands consistent
                float threshLog = log2(uEscapeThresh); // usually 2.0 for 4.0
                smoothVal = float(i) + 1.0 - log2(log2(m2) / threshLog);
                
                // Analytical Distance Estimation
                float r = sqrt(m2);
                float dr_mag = length(dz);
                dist = 0.5 * log(m2) * r / dr_mag;
                
                // CRITICAL: Overwrite Trap with Magnitude ONLY for "Potential" Coloring Mode (8)
                // Otherwise preserve minTrap for Orbit Trap Mode (0)
                if (abs(uColorMode - 8.0) < 0.1 || abs(uColorMode2 - 8.0) < 0.1) {
                    trapDist = r; 
                }
                break;
            }
        }
        
        // --- Heightmap Calculation ---
        float h = 0.0;
        
        if (escaped) {
            // 1. Base Terrain (Param A)
            // 'dist' goes to 0.0 exactly at the boundary.
            // FIXED: Use sqrt(dist * zoom) instead of sqrt(dist) * zoom to keep height
            // proportional to feature width regardless of zoom level.
            // This prevents "spikes" from growing uncontrollably deep in the set.
            h += sqrt(dist * zoom) * uParamA;
            
            // 2. Layer 2 Driven Ripples (Param C) - Driven by Gradient Brightness
            if (abs(uParamC) > 0.001) {
                // Compute Decomposition Angle for Mapping
                float decomp = atan(z2.y, z2.x) * 0.15915 + 0.5;
                
                // Construct proxy result to feed coloring engine
                // Components: x=dist, y=trap, z=iter, w=decomp
                vec4 resProxy = vec4(0.0, trapDist, smoothVal, decomp);
                
                // Construct 3D pos proxy using the mapping position (consistent texture space)
                vec3 pProxy = vec3(mapPos.x, 0.0, mapPos.y);
                
                // Get Mapping Value from Layer 2 Mode (e.g. Angle, Trap, Iterations)
                float l2Val = getMappingValue(uColorMode2, pProxy, resProxy, vec3(0,1,0), uColorScale2);
                
                // Apply Twist 2 if active
                if (abs(uColorTwist2) > 0.001) {
                    float dOrig = length(pProxy);
                    l2Val += dOrig * uColorTwist2;
                }
                
                // Calculate Pattern Phase
                float t2Raw = l2Val * uColorScale2 + uColorOffset2;
                float t2 = fract(t2Raw);
                
                // Sample Gradient 2 for height (Whiteness = Height)
                // SAFE HELPER: Using textureLod0 via math.ts
                vec3 gCol = textureLod0(uGradientTexture2, vec2(t2, 0.5)).rgb;
                float brightness = dot(gCol, vec3(0.299, 0.587, 0.114));
                
                // Apply Displacement
                h += brightness * uParamC;
            }
        } else {
            // Inside the set (The Lake)
            h = 0.0; 
        }
        
        // 3. Orbit Trap Spikes (Param D)
        // Scaled by Zoom to maintain relative visual height
        // Supports negative values (depressions)
        if (abs(uParamD) > 0.001) {
            h += trapHeightAccum * uParamD * zoom * 0.03;
        }
        
        h = clamp(h, -50.0, 50.0);
        
        // SDF Calculation (y is Up)
        float d = (z.y - h) * 0.5;
        
        // --- Output ---
        
        // Encode Angle into Z so DE_MASTER can extract Decomposition
        float angle = 0.0;
        if (dot(z2, z2) > 1e-9) {
            angle = atan(z2.y, z2.x);
        }
        
        float mag = abs(d);
        z = vec4(mag * cos(angle), mag * sin(angle), 0.0, 0.0);
        
        // Final Trap Output: Either minTrap or Magnitude (if escaped)
        // Fix: Use sqrt of trapDist to normalize Orbit Trap coloring range
        trap = sqrt(trapDist);
        dr = smoothVal;
    }`,loopBody:"formula_MandelTerrain(z, dr, trap, c); break;",getDist:`
            // Standard return
            return vec2(r, dr);
        `},parameters:[{label:"Map Zoom",id:"paramB",min:0,max:16,step:.01,default:1},{label:"Pan (Real, Imag)",id:"vec2A",type:"vec2",min:-2,max:2,step:1e-4,default:{x:0,y:0}},{label:"Height: Distance Estimator",id:"paramA",min:-5,max:5,step:.01,default:0},{label:"Height: Layer 2 Gradient",id:"paramC",min:-.2,max:.2,step:.001,default:0},{label:"Height: SmoothTrap",id:"paramD",min:-5,max:5,step:.01,default:0}],defaultPreset:{version:1,name:"MandelTerrain",formula:"MandelTerrain",features:{coreMath:{iterations:60,paramA:0,paramB:1,paramC:0,paramD:0,vec2A:{x:0,y:0}},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridComplex:!1,burningEnabled:!1,hybridMode:!1,hybridIter:2,hybridFoldLimit:1,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridAddC:!1,hybridProtect:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotY:0,preRotX:0,preRotZ:0,juliaMode:!1,juliaX:-.86,juliaY:-.22,juliaZ:0,preRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!1,shadows:!0,shadowSteps:128,shadowSoftness:19.5,shadowIntensity:1,shadowBias:1e-4,lights:[{position:{x:-.77,y:1.82,z:-.49},color:"#ffeedd",intensity:2,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{position:{x:-5,y:2,z:-5},color:"#4455aa",intensity:1,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!1,castShadow:!1},{position:{x:0,y:5,z:-5},color:"#ffffff",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!1,castShadow:!1}]},ao:{aoIntensity:0,aoSpread:.11,aoSamples:5,aoMode:!0,aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},reflections:{mixStrength:1,roughnessThreshold:.5,bounces:1,steps:64,enabled:!0},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:0,fogNear:0,fogFar:30,fogColor:"#051020",fogDensity:.02,glowIntensity:0,glowSharpness:3.8,glowMode:!1,glowColor:"#ffffff"},materials:{diffuse:1,reflection:0,specular:0,roughness:.2,rim:0,rimExponent:3,envStrength:0,envMapVisible:!1,envBackgroundStrength:1,envSource:1,envMapData:null,useEnvMap:!0,envRotation:0,envGradientStops:[{id:"1",position:1,color:"#ffffff",bias:.5,interpolation:"linear"}],emission:.3,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},waterPlane:{waterEnabled:!1,active:!0,height:-2,color:"#001133",roughness:.02,waveStrength:.1,waveSpeed:1,waveFrequency:1.5},coloring:{gradient:[{id:"0",position:0,color:"#001133",bias:.5,interpolation:"linear"},{id:"1",position:.153,color:"#0063A5",bias:.5,interpolation:"linear"},{id:"2",position:.324,color:"#0093F5",bias:.749,interpolation:"linear"},{id:"3",position:.895,color:"#FFFFFF",bias:.5,interpolation:"linear"},{id:"4",position:.908,color:"#000000",bias:.5,interpolation:"linear"}],mode:7,scale:.2710027100271003,offset:-.007588075880758799,repeats:1,phase:-.2,bias:1,twist:0,escape:20,gradient2:[{id:"1",position:.077,color:"#000000",bias:.52,interpolation:"smooth"},{id:"2",position:.196,color:"#020202",bias:.83,interpolation:"smooth"},{id:"3",position:.857,color:"#000000",bias:.5,interpolation:"linear"},{id:"4",position:.925,color:"#797979",bias:.5,interpolation:"linear"}],mode2:0,scale2:.74,offset2:.55,repeats2:1,phase2:.43,bias2:1,twist2:0,blendMode:0,blendOpacity:0},texturing:{active:!1,layer1Data:null,mapU:6,mapV:1,scaleX:1,scaleY:1,offset:{x:0,y:0},textureScale:{x:1,y:1}},quality:{engineQuality:!0,compilerHardCap:500,precisionMode:0,bufferPrecision:0,maxSteps:300,distanceMetric:2,estimator:0,fudgeFactor:.35,detail:1.1,pixelThreshold:.5,dynamicScaling:!1,interactionDownsample:2},droste:{active:!1,tiling:1,center:{x:0,y:0},radiusInside:5,radiusOutside:100,periodicity:2,strands:2,autoPeriodicity:!1,strandMirror:!1,zoom:0,rotate:0,rotateSpin:0,rotatePolar:0,twist:!0,hyperDroste:!1,fractalPoints:1},colorGrading:{active:!1,saturation:1.5,levelsMin:0,levelsMax:.5,levelsGamma:.77},optics:{camType:0,camFov:60,orthoScale:2,dofStrength:0,dofFocus:10},navigation:{flySpeed:.5,autoSlow:!0},audio:{threshold:.1,agcEnabled:!1,attack:.1,decay:.3,highPass:20,lowPass:2e4,gain:1},drawing:{activeTool:"rect",enabled:!1,active:!1,originMode:1,color:"#00ffff",lineWidth:1,showLabels:!0,showAxes:!1,shapes:[],refreshTrigger:0},modulation:{rules:[],selectedRuleId:null},webcam:{opacity:1,posX:20,posY:80,width:320,height:240,cropL:0,cropR:0,cropT:0,cropB:0,blendMode:0,crtMode:!1,tilt:0,fontSize:12},debugTools:{shaderDebuggerOpen:!1,stateDebuggerOpen:!1},engineSettings:{showEngineTab:!1}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.7071067811865476,y:0,z:0,w:.7071067811865475},sceneOffset:{x:-.082,y:3.17,z:-.38,xL:.082,yL:-.1700000000000009,zL:.3800000000000002},targetDistance:2.997344970703125,cameraMode:"Orbit",lights:[],renderMode:"Direct",quality:{aaMode:"Always",aaLevel:1,msaa:1,accumulation:!0},animations:[],sequence:{durationFrames:300,fps:30,tracks:{}},duration:300}},di={id:"MarbleMarcher",name:"Marble Marcher",shortDescription:"The dynamic fractal from the game Marble Marcher. Fast rendering, geometric feel.",description:"The dynamic fractal from the game Marble Marcher. A specialized Menger Sponge IFS with rotation and shifting steps.",shader:{preamble:`
    // MarbleMarcher: Pre-calculated rotation matrices (computed once per frame)
    // Two separate rotations at different algorithm stages
    float uMM_sZ = 0.0, uMM_cZ = 1.0;
    float uMM_sX = 0.0, uMM_cX = 1.0;
    float uMM_sY = 0.0, uMM_cY = 1.0;

    void MarbleMarcher_precalcRotation() {
        if (abs(uVec3B.x) > 0.001) {
            uMM_sZ = sin(uVec3B.x);
            uMM_cZ = cos(uVec3B.x);
        }
        if (abs(uVec3B.y) > 0.001) {
            uMM_sX = sin(uVec3B.y);
            uMM_cX = cos(uVec3B.y);
        }
        if (abs(uVec3B.z) > 0.001) {
            uMM_sY = sin(uVec3B.z);
            uMM_cY = cos(uVec3B.z);
        }
    }`,function:`
    void formula_MarbleMarcher(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        // 1. Abs
        z3 = abs(z3);

        // 2. Rot Z (Vec3B.x) — applied after abs
        if (abs(uVec3B.x) > 0.001) {
            z3.xy = mat2(uMM_cZ, uMM_sZ, -uMM_sZ, uMM_cZ) * z3.xy;
        }

        // 3. Menger Fold (sort descending)
        float a = min(z3.x - z3.y, 0.0); z3.x -= a; z3.y += a;
        a = min(z3.x - z3.z, 0.0); z3.x -= a; z3.z += a;
        a = min(z3.y - z3.z, 0.0); z3.y -= a; z3.z += a;

        // 4. Rot X (Vec3B.y) — applied after Menger fold
        if (abs(uVec3B.y) > 0.001) {
            z3.yz = mat2(uMM_cX, uMM_sX, -uMM_sX, uMM_cX) * z3.yz;
        }

        // 4b. Rot Y (Vec3B.z) — applied after X rotation
        if (abs(uVec3B.z) > 0.001) {
            z3.xz = mat2(uMM_cY, uMM_sY, -uMM_sY, uMM_cY) * z3.xz;
        }

        // 5. Scale (Param A)
        float scale = uParamA;
        z3 *= scale;
        dr *= abs(scale);

        // 6. Vec3A: Shift X/Y/Z
        z3 += uVec3A;

        if (uJuliaMode > 0.5) z3 += c.xyz;

        z.xyz = z3;

        // Box trap for coloring
        vec3 boxDist = abs(z3) - vec3(1.0);
        trap = min(trap, length(max(boxDist, 0.0)) + min(max(boxDist.x, max(boxDist.y, boxDist.z)), 0.0));
    }`,loopBody:"formula_MarbleMarcher(z, dr, trap, c);",loopInit:"MarbleMarcher_precalcRotation();",getDist:`
            float limit = 6.0;
            return vec2((r - limit) / dr, iter);
        `},parameters:[{label:"Scale",id:"paramA",min:1,max:4,step:.001,default:2},{label:"Shift",id:"vec3A",type:"vec3",min:-5,max:5,step:.01,default:{x:-2,y:-2,z:-2}},{label:"Rotation (Z, X, Y)",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"axes"}],defaultPreset:{formula:"MarbleMarcher",features:{coreMath:{iterations:21,paramA:1.89,vec3A:{x:-2.16,y:-2.84,z:-2.47},vec3B:{x:-.047,y:.025,z:0}},coloring:{mode:6,repeats:2.5,phase:0,scale:1,offset:0,bias:1,twist:0,escape:16.18,mode2:6,repeats2:250,phase2:5,blendMode:2,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,gradient:[{id:"1766936009557_0",position:.0369,color:"#130606",bias:.5,interpolation:"linear"},{id:"1766936025161",position:.1409,color:"#463434",bias:.5,interpolation:"linear"},{id:"1766936020401",position:.4194,color:"#828282",bias:.5,interpolation:"linear"},{id:"1766936032564",position:.6879,color:"#BCBCBC",bias:.5,interpolation:"linear"},{id:"1766936039597",position:1,color:"#875656",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#FFFFFF"}]},texturing:{active:!1,scaleX:4,scaleY:24,offset:{x:-.02,y:-.08},mapU:6,mapV:8,layer1Data:null},materials:{reflection:-.44,specular:0,roughness:.5,diffuse:.92,envStrength:0,rim:0,rimExponent:4,emission:.085,emissionColor:"#ffffff",emissionMode:1,envMapVisible:!1,envSource:1,useEnvMap:!0,envRotation:0,envGradientStops:[{id:"0",position:.03,color:"#130606"},{id:"1",position:.14,color:"#463434"},{id:"2",position:.41,color:"#824040"},{id:"3",position:.68,color:"#BCBCBC"},{id:"4",position:1,color:"#875656"}]},atmosphere:{fogNear:0,fogFar:100,fogColor:"#7E6861",fogDensity:0,glowIntensity:1e-4,glowSharpness:400,glowColor:"#ffffff",glowMode:!1,aoIntensity:.44,aoSpread:.28,aoMode:!1},geometry:{juliaMode:!1,juliaX:-2,juliaY:.86,juliaZ:-2,hybridMode:!1,hybridIter:2,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1},lighting:{shadows:!0,shadowSoftness:16,shadowIntensity:1,shadowBias:7e-4},quality:{detail:1.1,fudgeFactor:.62,pixelThreshold:.5,maxSteps:300,distanceMetric:1},optics:{dofStrength:0,dofFocus:4.65}},cameraPos:{x:1.7472844097880647,y:-1.3734380139592728,z:2.8232426812200377},cameraRot:{x:.23927126357209905,y:.22332520402424524,z:.14464802218445671,w:.9337837358587185},cameraFov:75,sceneOffset:{x:2,y:-2,z:2,xL:-.25680194984918847,yL:.6967983054660813,zL:.44809374764147025},targetDistance:.5,cameraMode:"Orbit",lights:[{type:"Point",position:{x:.936,y:-2.75,z:6.21},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:8,falloff:.67,falloffType:"Linear",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:-5,y:-2,z:2},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:1,falloff:0,falloffType:"Linear",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:0,y:0,z:-5},rotation:{x:0,y:0,z:0},color:"#0044ff",intensity:1,falloff:0,falloffType:"Linear",fixed:!1,visible:!1,castShadow:!1}],animations:[{id:"2JfG4QE8x4GkvGQU5DKqx",enabled:!1,target:"coreMath.paramA",shape:"Sine",period:5,amplitude:1,baseValue:1.89,phase:0,smoothing:.5}]}},ui={id:"JuliaMorph",name:"Julia Morph (Stack)",shortDescription:'Constructs 3D volumes by stacking 2D Julia sets. Perfect for topographic or sliced "MRI" effects.',description:"Constructs a 3D object by stacking 2D Julia sets along the Z-axis. Start C and End C define the Julia constants at the bottom and top. The constant smoothly interpolates between them along the height.",shader:{function:`
    void formula_JuliaMorph(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;

        // --- 1. MAPPING & DEFORMATION ---
        float height = max(0.1, uParamA);
        float z_val = p.z;
        float taperFactor = 1.0;

        // Bend FIRST: Curve the column along X-axis (works on original p)
        // paramD = bend direction (signed distance), abs value = curvature amount
        // Must come before twist/taper since it remaps all coordinates
        if (abs(uParamD) > 0.001) {
            float R = 20.0 / abs(uParamD);
            float sd = sign(uParamD);
            // Mirror X for negative bend, bend around +X pivot, then mirror back
            float px = p.x * sd;
            float px_shifted = px + R;
            float dist = length(vec2(px_shifted, p.z));
            float ang = atan(p.z, px_shifted);
            // Unbend: radial distance becomes new X, arc length becomes new Z
            p.x = (dist - R) * sd;
            z_val = ang * R;
        }

        float t = clamp((z_val / height) + 0.5, 0.0, 1.0);
        vec2 Z = p.xy;

        // Taper: scale XY based on Z position, with DE compensation
        if (abs(uParamE) > 0.001) {
            taperFactor = 1.0 + t * uParamE;
            Z *= taperFactor;
        }

        // Twist: Rotate XY around center based on Z
        if (abs(uParamC) > 0.001) {
            float ang = z_val * uParamC;
            float s = sin(ang); float co = cos(ang);
            Z = mat2(co, -s, s, co) * Z;
        }

        // --- 2. INTERPOLATION ---
        vec2 c1 = uVec2B;
        vec2 c2 = uVec2A;
        float t_smooth = t * t * (3.0 - 2.0 * t);
        vec2 C = mix(c1, c2, t_smooth);

        // --- 3. 2D JULIA ITERATION ---
        float r2 = dot(Z,Z);
        float dz_2d = 1.0;
        float iter_count = 0.0;

        float bailout = 10000.0;
        int limit = int(uIterations);
        float localTrap = 1e10;

        bool escaped = false;

        const int MAX_FORMULA_ITER = 3000;

        for(int i=0; i<MAX_FORMULA_ITER; i++) {
            if (i >= limit) break;

            // Derivative: |dz'| = 2|z| * |dz|
            dz_2d *= 2.0 * sqrt(r2);
            if (dz_2d > 1.0e10) dz_2d = 1.0e10;

            // Z = Z^2 + C
            float nx = (Z.x * Z.x - Z.y * Z.y) + C.x;
            float ny = (2.0 * Z.x * Z.y) + C.y;
            Z = vec2(nx, ny);

            r2 = dot(Z,Z);
            localTrap = min(localTrap, r2);
            iter_count += 1.0;

            if(r2 > bailout) {
                escaped = true;
                break;
            }
        }

        // --- 4. SMOOTH ITERATION ---
        float smooth_iter;
        if (escaped) {
            float logZn = log(r2) / 2.0;
            float nu = log(logZn / log(2.0)) / log(2.0);
            smooth_iter = iter_count + 1.0 - nu;
        } else {
            smooth_iter = iter_count;
        }

        // --- 5. DISTANCE ESTIMATION ---
        float d2d;
        if (escaped && dz_2d > 1.0e-7) {
             // Exterior: standard 2D Julia DE
             d2d = 0.5 * sqrt(r2) * log(r2) / dz_2d;
        } else {
             // Interior: approximate negative distance from boundary
             // Use sqrt of orbit trap (minimum r² seen) as rough interior distance
             d2d = -sqrt(localTrap) * 0.5;
        }

        // Taper DE compensation: scaled coordinates produce scaled distances
        if (abs(taperFactor) > 0.01) {
            d2d /= abs(taperFactor);
        }

        // Vertical Box Bounds (using warped z_val)
        float d_z = abs(z_val) - (height * 0.5);

        // Combine: Intersection of Julia Column + Height Box
        float d = max(d2d, d_z);

        // --- 6. SLICING ---
        float sliceInterval = uParamF;
        if (sliceInterval > 0.01) {
            float ratio = clamp(uParamB, 0.01, 0.95);
            float thickness = (sliceInterval * 0.5) * ratio;
            float distToSlice = abs(mod(z_val, sliceInterval) - sliceInterval * 0.5) - thickness;
            d = max(d, distToSlice);
        }

        trap = min(trap, localTrap);

        // Return packed result
        z = vec4(Z.x, Z.y, d, smooth_iter);
    }`,loopBody:"formula_JuliaMorph(z, dr, trap, c); break;",getDist:`
            return vec2(z.z, z.w);
        `},parameters:[{label:"Height (Z Scale)",id:"paramA",min:.1,max:10,step:.1,default:5},{label:"Slice Interval",id:"paramF",min:0,max:2,step:.01,default:.33},{label:"Slice Thickness",id:"paramB",min:.01,max:1,step:.01,default:.27},{label:"Start C",id:"vec2B",type:"vec2",min:-2,max:2,step:.001,default:{x:1.03,y:-1.072}},{label:"End C",id:"vec2A",type:"vec2",min:-2,max:2,step:.001,default:{x:.286,y:.009}},{label:"Twist",id:"paramC",min:-5,max:5,step:.01,default:0,scale:"pi"},{label:"Bend",id:"paramD",min:-5,max:5,step:.01,default:0},{label:"Taper",id:"paramE",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"JuliaMorph",features:{coreMath:{iterations:100,paramA:5,paramB:.27,paramC:0,paramF:.53,vec2A:{x:.286,y:.009},vec2B:{x:1.03,y:-1.072}},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0},coloring:{mode:1,scale:4.697920323185873,offset:.13,repeats:1,phase:.13,bias:1,escape:4,gradient:[{id:"1",position:0,color:"#080022",bias:.5,interpolation:"linear"},{id:"2",position:.3,color:"#1C2058",bias:.5,interpolation:"linear"},{id:"3",position:.6,color:"#00ccff",bias:.5,interpolation:"linear"},{id:"4",position:.735261118203675,color:"#ffffff",bias:.5,interpolation:"linear"},{id:"1768818072358",position:1,color:"#090022",bias:.5,interpolation:"linear"}],mode2:0,scale2:.4003079069279198,offset2:.48021004308135196,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:2,blendOpacity:1,gradient2:[{id:"1768817090653_0",position:0,color:"#9e0142",bias:.5,interpolation:"linear"},{id:"1768817090653_1",position:.111,color:"#d53e4f",bias:.5,interpolation:"linear"},{id:"1768817090653_2",position:.222,color:"#f46d43",bias:.5,interpolation:"linear"},{id:"1768817090653_3",position:.333,color:"#fdae61",bias:.5,interpolation:"linear"},{id:"1768817090653_4",position:.444,color:"#fee08b",bias:.5,interpolation:"linear"},{id:"1768817090653_5",position:.556,color:"#e6f598",bias:.5,interpolation:"linear"},{id:"1768817090653_6",position:.667,color:"#abdda4",bias:.5,interpolation:"linear"},{id:"1768817090653_7",position:.778,color:"#66c2a5",bias:.5,interpolation:"linear"},{id:"1768817090653_8",position:.889,color:"#3288bd",bias:.5,interpolation:"linear"},{id:"1768817090653_9",position:1,color:"#5e4fa2",bias:.5,interpolation:"linear"}],layer3Color:"#ffffff",layer3Scale:2,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},atmosphere:{fogNear:0,fogFar:5,fogColor:"#050510",fogDensity:.02,glowIntensity:0,glowSharpness:200,glowMode:!1,glowColor:"#ffffff",aoIntensity:0,aoSpread:.2,aoMode:!1},materials:{diffuse:1,reflection:0,specular:.61,roughness:.22438819237827662,rim:0,rimExponent:4,envStrength:0,envMapVisible:!1,envBackgroundStrength:1,envSource:1,useEnvMap:!1,envRotation:0,envGradientStops:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},lighting:{shadows:!0,shadowSoftness:41.7859226170808,shadowIntensity:.92,shadowBias:.002,ptBounces:3,ptGIStrength:1,ptStochasticShadows:!1},quality:{fudgeFactor:1,detail:4,pixelThreshold:.5,maxSteps:300,distanceMetric:0},optics:{camType:0,camFov:60,orthoScale:2,dofStrength:0,dofFocus:10},navigation:{flySpeed:.42,autoSlow:!0}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:.21740819322063967,y:.12483788618539499,z:-.11589452875015582,w:.9611023035551793},sceneOffset:{x:0,y:-1,z:4,xL:.10960732222484179,yL:-.26099943689461447,zL:.15599693750325688},targetDistance:2.512885481119156,cameraMode:"Fly",lights:[{type:"Point",position:{x:2.056650977487994,y:-.7418778505604411,z:3.39849758131238},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:8.76,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:-.37117243582015064,y:-1.5852765971855902,z:3.0489919017830487},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:0,y:-5,z:2},rotation:{x:0,y:0,z:0},color:"#0088ff",intensity:.25,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0}]}},fi={id:"Mandelorus",name:"Mandelorus",shortDescription:'The "True" 3D Mandelbrot topology. Wraps space around a ring instead of a point.',description:"Wraps the fractal iteration around a Torus (Donut). Creates a Solenoid structure. Twist is linked to Power: 1.0 Twist = 1 Symmetry Shift (360/Power).",shader:{function:`
        void formula_Mandelorus(inout vec4 z, inout float dr, inout float trap, vec4 c) {
            vec3 p = z.xyz;
            float R = uParamA;       // Major Radius
            float twistInput = uParamB;   // Twist Steps (1.0 = 1 Symmetry Unit)
            float power = uParamC;   // Fractal Power
            
            // Phase controls (vec2A: ring phase, cross phase)
            float ringPhase = uVec2A.x;
            float crossPhase = uVec2A.y;
            
            float zScale = 1.0 + uParamF; // Vertical Scale
            
            // 1. Toroidal Decomposition
            float lenXY = length(p.xy);
            // phi: The angle around the major ring (0 to 2PI)
            float phi = atan(p.y, p.x); 
            
            // q: The cross-section complex plane relative to the ring center
            vec2 q = vec2(lenXY - R, p.z * zScale);
            
            // 2. Twist (Pre-iteration)
            // Rotates the cross-section as we travel around the ring.
            // We want 1.0 "Twist Input" to equal 1 "Symmetry Step".
            // A Symmetry Step is (2 * PI) / Power.
            // So Total Rotation should be: phi * (TwistInput / Power).
            if (abs(twistInput) > 0.001) {
                float rotAng = phi * twistInput / max(1.0, power);
                float s = sin(rotAng); 
                float co = cos(rotAng);
                q = mat2(co, -s, s, co) * q;
            }

            // 3. Complex Power (The Fiber Iteration)
            float r2 = dot(q, q);
            float r = sqrt(r2);
            float angleQ = atan(q.y, q.x);
            
            // Apply Cross Phase (Theta)
            angleQ += crossPhase;

            // --- STABILITY IMPROVEMENT ---
            // Calculate derivative with compensation for Twist and Z-Scale
            
            float dr_cross = power * pow(r, power - 1.0);
            
            // The effective expansion is the max of the Ring expansion (Power)
            // and the Cross-Section expansion (dr_cross).
            float expansion = max(power, dr_cross);
            
            // Pad derivative based on Z-Scale
            expansion *= max(1.0, zScale);
            
            // Pad derivative based on Twist intensity
            // High twist stretches space, requiring smaller steps
            expansion *= (1.0 + abs(twistInput) * 0.3);

            dr = dr * expansion + 1.0;
            
            // Apply Power to Cross Section
            float newR = pow(r, power);
            float newAngleQ = angleQ * power;
            q = newR * vec2(cos(newAngleQ), sin(newAngleQ));
            
            // 4. Solenoidal Wrapping (The Base Iteration)
            // phi -> n * phi + turn
            phi = phi * power + ringPhase;
            
            // 5. Reconstruction (Map back to 3D)
            vec2 ringPos = vec2(cos(phi), sin(phi));
            
            vec3 p_next;
            p_next.xy = ringPos * (R + q.x); // Expand ring by new q.x
            p_next.z = q.y; 
            
            // 6. Addition of C
            p_next += c.xyz;
            
            z.xyz = p_next;
            
            // Trap: Use cross-section magnitude
            trap = min(trap, r2);
        }`,loopBody:"formula_Mandelorus(z, dr, trap, c);"},parameters:[{label:"Ring Radius",id:"paramA",min:.1,max:5,step:.01,default:1},{label:"Twist (Sym)",id:"paramB",min:-8,max:8,step:.1,default:0},{label:"Power",id:"paramC",min:1,max:16,step:.01,default:8},{label:"Phase (Ring, Cross)",id:"vec2A",type:"vec2",min:-6.28,max:6.28,step:.01,default:{x:0,y:0},scale:"pi"},{label:"Vert Scale",id:"paramF",min:-.9,max:2,step:.01,default:0}],defaultPreset:{version:2,name:"Mandelorus",formula:"Mandelorus",features:{coreMath:{iterations:31,paramA:1.32,paramB:0,paramC:5,paramF:0,vec2A:{x:0,y:-1.159203974648639}},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridComplex:!1,burningEnabled:!1,hybridMode:!1,hybridIter:2,hybridFoldLimit:1,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridAddC:!1,hybridProtect:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotY:0,preRotX:0,preRotZ:0,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,preRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!1,shadows:!0,shadowIntensity:1,shadowSoftness:16,shadowSteps:128,shadowBias:.002,lights:[{type:"Directional",position:{x:1.8089856063656191,y:.769231473548869,z:-3.1565777253328235},rotation:{x:.08548818739394098,y:2.7391915549407027,z:.41340674852481984},color:"#ffffff",intensity:1.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:2,y:-1,z:1},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0},{type:"Point",position:{x:0,y:-5,z:2},rotation:{x:0,y:0,z:0},color:"#0088ff",intensity:.25,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!1,castShadow:!0}]},ao:{aoIntensity:.3992177013734381,aoSpread:.12250592248526632,aoSamples:5,aoMode:!1,aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},reflections:{mixStrength:1,roughnessThreshold:.5,bounces:1,steps:64,enabled:!0},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:0,fogNear:0,fogFar:5,fogColor:"#000000",fogDensity:0,glowIntensity:.0013419894295067058,glowSharpness:13.803842646028853,glowMode:!0,glowColor:"#ff0000"},materials:{diffuse:1,reflection:0,specular:.3,roughness:.5,rim:0,rimExponent:4,envStrength:0,envBackgroundStrength:0,envSource:1,envMapData:null,envMapColorSpace:0,useEnvMap:!1,envRotation:0,envGradientStops:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],emission:.4,emissionMode:2,emissionColor:"#ffffff",ptEmissionMult:1},waterPlane:{waterEnabled:!1,active:!0,height:-2,color:"#001133",roughness:.02,waveStrength:.1,waveSpeed:1,waveFrequency:1.5},coloring:{gradient:{stops:[{id:"1771161402247_0",position:.07178750897343862,color:"#141414",bias:.5,interpolation:"linear"},{id:"1771161413328",position:.1225174070688263,color:"#F40000",bias:.5,interpolation:"linear"},{id:"1771161432807",position:.1627184120939519,color:"#FFA9A9",bias:.5,interpolation:"linear"},{id:"1771161412141",position:.2027890750198856,color:"#0D0D0D",bias:.5,interpolation:"linear"},{id:"1771161402247_1",position:.6090930507893446,color:"#ffffff",bias:.5,interpolation:"linear"},{id:"1771161445770",position:1,color:"#181818",bias:.5,interpolation:"linear"}],colorSpace:"srgb"},mode:0,scale:5,offset:.30000000000000004,repeats:1,phase:-.7,bias:1,twist:0,escape:4,gradient2:{stops:[{id:"1771161496387_0",position:0,color:"#000000",bias:.5,interpolation:"linear"},{id:"1771161496387_1",position:.07083040060795048,color:"#550000",bias:.5,interpolation:"linear"},{id:"1771161496387_2",position:.1627184120939519,color:"#FF2222",bias:.5,interpolation:"linear"},{id:"1771161496387_3",position:.2027890750198856,color:"#000000",bias:.5,interpolation:"linear"},{id:"1771161496387_4",position:.6090930507893446,color:"#000000",bias:.5,interpolation:"linear"},{id:"1771161496387_5",position:1,color:"#000000",bias:.5,interpolation:"linear"}],colorSpace:"srgb"},mode2:0,scale2:4.999999999999999,offset2:.30000000000000004,repeats2:1,phase2:-.7,bias2:1,twist2:0,blendMode:1,blendOpacity:1,layer3Color:"#ffffff",layer3Scale:2,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},texturing:{active:!1,layer1Data:null,colorSpace:0,mapU:6,mapV:1,scaleX:1,scaleY:1,offset:{x:0,y:0},textureScale:{x:1,y:1}},quality:{engineQuality:!0,compilerHardCap:500,precisionMode:0,bufferPrecision:0,maxSteps:300,distanceMetric:0,estimator:0,fudgeFactor:.5,stepRelaxation:0,refinementSteps:0,detail:2,pixelThreshold:.5,overstepTolerance:0,dynamicScaling:!1,interactionDownsample:2},droste:{active:!1,tiling:1,center:{x:0,y:0},radiusInside:5,radiusOutside:100,periodicity:2,strands:2,autoPeriodicity:!1,strandMirror:!1,zoom:0,rotate:0,rotateSpin:0,rotatePolar:0,twist:!0,hyperDroste:!1,fractalPoints:1},colorGrading:{active:!1,saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camType:0,camFov:60,orthoScale:2,dofStrength:0,dofFocus:10},navigation:{flySpeed:.5,autoSlow:!0},cameraManager:{},audio:{isEnabled:!1,smoothing:.8,threshold:.1,agcEnabled:!1,attack:.1,decay:.3,highPass:20,lowPass:2e4,gain:1},drawing:{activeTool:"rect",enabled:!1,active:!1,originMode:1,color:"#00ffff",lineWidth:1,showLabels:!0,showAxes:!1,shapes:[],refreshTrigger:0},modulation:{rules:[],selectedRuleId:null},webcam:{isEnabled:!1,opacity:1,posX:20,posY:80,width:320,height:240,cropL:0,cropR:0,cropT:0,cropB:0,blendMode:0,crtMode:!1,tilt:0,fontSize:12},debugTools:{shaderDebuggerOpen:!1,stateDebuggerOpen:!1},engineSettings:{showEngineTab:!1}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:1,y:-727156800341211e-47,z:-6123233995736766e-32,w:3710962377975166e-33},sceneOffset:{x:.02015586569905281,y:.005605148617178202,z:-5.211455821990967,xL:5716822570889235e-25,yL:21298747235435714e-26,zL:-22618142203612024e-23},targetDistance:5.214554250240326,cameraMode:"Orbit",lights:[],renderMode:"Direct",quality:{aaMode:"Always",aaLevel:1,msaa:1,accumulation:!0},animations:[],sequence:{durationFrames:300,fps:30,tracks:{"camera.unified.x":{id:"camera.unified.x",type:"float",label:"Position X",keyframes:[{id:"520JCebpirpIjkgSfViyb",frame:0,value:-.05059101356107703,interpolation:"Linear",autoTangent:!1,brokenTangents:!1}],hidden:!1},"camera.unified.y":{id:"camera.unified.y",type:"float",label:"Position Y",keyframes:[{id:"TlKGVi6rVx8aPvZFWKlvw",frame:0,value:-.1358890818952094,interpolation:"Linear",autoTangent:!1,brokenTangents:!1}],hidden:!1},"camera.unified.z":{id:"camera.unified.z",type:"float",label:"Position Z",keyframes:[{id:"zcz_hIp4HhQTRZSagfckN",frame:0,value:-5.918975187098582,interpolation:"Linear",autoTangent:!1,brokenTangents:!1}],hidden:!1},"camera.rotation.x":{id:"camera.rotation.x",type:"float",label:"Rotation X",keyframes:[{id:"sLYXo677pGLgJlq19eoEQ",frame:0,value:3.141592653589793,interpolation:"Linear",autoTangent:!1,brokenTangents:!1}],hidden:!1},"camera.rotation.y":{id:"camera.rotation.y",type:"float",label:"Rotation Y",keyframes:[{id:"9Og7ZQx3kB_GSO0hjPEQs",frame:0,value:0,interpolation:"Linear",autoTangent:!1,brokenTangents:!1}],hidden:!1},"camera.rotation.z":{id:"camera.rotation.z",type:"float",label:"Rotation Z",keyframes:[{id:"sZtDA1yOQQpJIB1P6Nn7v",frame:0,value:0,interpolation:"Linear",autoTangent:!1,brokenTangents:!1}],hidden:!1}}},duration:300}},pi={id:"Appell",name:"Appell Spectral (Ghost)",shortDescription:"Simplified Appell polynomial iteration. Renders skeletal, interference-like structures.",description:'Implements a simplified Appell polynomial: P(x) = x^n - k|x|^2, where the non-conformal subtraction destabilizes the surface, revealing skeletal interference patterns. The "Interference" parameter k controls how much structure is stripped away. Best viewed as a volumetric cloud.',shader:{function:`
    void formula_Appell(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;
        float r = length(p);
        
        // Param A: Interference Factor (k)
        // 0.333 is the theoretical "Euclidean" balance. 
        // Higher values strip the "flesh" off the fractal, leaving the skeleton.
        float k = uParamA;
        
        // Param B: Power (approximate)
        float power = uParamB;
        
        // Param C: Ghost Shift (4th Dimension Bias)
        // Adds a constant bias to the magnitude calculation, simulating a 4D slice.
        float bias = uParamC;
        
        // --- The Appell Polynomial Iteration ---
        
        // 1. Standard Hypercomplex Power
        // We use spherical conversion for generic power support
        float theta = acos(clamp(p.z / r, -1.0, 1.0));
        float phi = atan(p.y, p.x);
        
        // Apply rotation/twist
        phi += uParamE; 
        
        float zr = pow(r, power);
        theta *= power;
        phi *= power;
        
        vec3 p_hyper = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        
        // 2. The Appell Subtraction
        // P_k(x) = x^k - k * |x|^2 ... (Simplified)
        // We subtract the magnitude squared from the Real component (X-axis in this projection)
        // This is the non-conformal "correction" that reveals the skeleton.
        
        float magSq = r*r + bias;
        p_hyper.x -= k * magSq;
        
        // 3. Update Derivative
        // The subtraction term makes the derivative complex. 
        // We approximate it: dr = power * r^(power-1) * dr - 2*k*r*dr
        // This creates "Fuzzy" boundaries automatically.
        dr = (power * pow(r, power - 1.0) - (2.0 * k * r)) * dr + 1.0;
        
        // 4. Param D: Fuzziness (Density Control)
        // Artificially reduces the derivative growth to create volumetric clouds
        if (uParamD > 0.0) {
            dr *= (1.0 - uParamD * 0.1);
        }
        
        z.xyz = p_hyper + c.xyz;
        
        trap = min(trap, r);
    }`,loopBody:"formula_Appell(z, dr, trap, c);"},parameters:[{label:"Interference",id:"paramA",min:0,max:1.5,step:.001,default:.333},{label:"Power",id:"paramB",min:1,max:8,step:.01,default:2},{label:"Ghost Shift",id:"paramC",min:-1,max:1,step:.001,default:0},{label:"Cloud Density",id:"paramD",min:0,max:1,step:.01,default:.5},{label:"Phase",id:"paramE",min:0,max:6.28,step:.01,default:0,scale:"pi"}],defaultPreset:{version:2,name:"Appell",formula:"Appell",features:{coreMath:{iterations:10,paramA:.761,paramB:2.83,paramC:-.391,paramD:.24,paramE:0,paramF:0},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridComplex:!1,burningEnabled:!1,hybridMode:!1,hybridIter:2,hybridFoldLimit:1,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridAddC:!1,hybridProtect:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotY:0,preRotX:0,preRotZ:0,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,preRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!1,shadows:!0,shadowIntensity:1,shadowSoftness:16,shadowSteps:128,shadowBias:.002,lights:[{type:"Point",position:{x:-2,y:1,z:2},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:1.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0},{type:"Point",position:{x:2,y:-1,z:1},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0},{type:"Point",position:{x:0,y:-5,z:2},rotation:{x:0,y:0,z:0},color:"#0088ff",intensity:.25,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!1,castShadow:!0}]},ao:{aoIntensity:0,aoSpread:.5,aoSamples:5,aoMode:!0,aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},reflections:{mixStrength:1,roughnessThreshold:.5,bounces:1,steps:64,enabled:!0},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:0,fogNear:0,fogFar:6,fogColor:"#000000",fogDensity:0,glowIntensity:4.999999999999999,glowSharpness:12.02264434617413,glowMode:!1,glowColor:"#00ffff"},materials:{diffuse:1.16,reflection:0,specular:0,roughness:.5872188659713031,rim:0,rimExponent:4,envStrength:0,envBackgroundStrength:0,envSource:1,envMapData:null,envMapColorSpace:0,useEnvMap:!1,envRotation:0,envGradientStops:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},waterPlane:{waterEnabled:!1,active:!0,height:-2,color:"#001133",roughness:.02,waveStrength:.1,waveSpeed:1,waveFrequency:1.5},coloring:{gradient:{stops:[{id:"5",position:.006101938262742301,color:"#000000",bias:.5,interpolation:"linear"},{id:"4",position:.07666905958363249,color:"#5744FF",bias:.5,interpolation:"linear"},{id:"3",position:.2198492462311558,color:"#0088ff",bias:.5,interpolation:"linear"},{id:"2",position:.3802584350323044,color:"#001133",bias:.5,interpolation:"linear"},{id:"1",position:.46518305814788224,color:"#000000",bias:.5,interpolation:"linear"},{id:"1771161963853_0",position:.5402010050251256,color:"#000000",bias:.5,interpolation:"linear"},{id:"1771161963853_1",position:.6,color:"#001133",bias:.5,interpolation:"linear"},{id:"1771161963853_2",position:.75,color:"#0088ff",bias:.5,interpolation:"linear"},{id:"1771161963853_3",position:.9,color:"#F644FF",bias:.5,interpolation:"linear"},{id:"1771161963853_4",position:1,color:"#000000",bias:.5,interpolation:"linear"}],colorSpace:"srgb"},mode:8,scale:.5557213101593343,offset:.05468077546160833,repeats:1.2,phase:0,bias:1,twist:0,escape:4,gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}],mode2:4,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:0,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:2,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},texturing:{active:!1,layer1Data:null,colorSpace:0,mapU:6,mapV:1,scaleX:1,scaleY:1,offset:{x:0,y:0},textureScale:{x:1,y:1}},quality:{engineQuality:!0,compilerHardCap:500,precisionMode:0,bufferPrecision:0,maxSteps:300,distanceMetric:0,estimator:0,fudgeFactor:.01,stepRelaxation:0,refinementSteps:0,detail:3.1,pixelThreshold:1,overstepTolerance:0,dynamicScaling:!1,interactionDownsample:2},droste:{active:!1,tiling:1,center:{x:0,y:0},radiusInside:5,radiusOutside:100,periodicity:2,strands:2,autoPeriodicity:!1,strandMirror:!1,zoom:0,rotate:0,rotateSpin:0,rotatePolar:0,twist:!0,hyperDroste:!1,fractalPoints:1},colorGrading:{active:!1,saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camType:0,camFov:60,orthoScale:2,dofStrength:0,dofFocus:10},navigation:{flySpeed:.5,autoSlow:!0},cameraManager:{},audio:{isEnabled:!1,smoothing:.8,threshold:.1,agcEnabled:!1,attack:.1,decay:.3,highPass:20,lowPass:2e4,gain:1},drawing:{activeTool:"rect",enabled:!1,active:!1,originMode:1,color:"#00ffff",lineWidth:1,showLabels:!0,showAxes:!1,shapes:[],refreshTrigger:0},modulation:{rules:[],selectedRuleId:null},webcam:{isEnabled:!1,opacity:1,posX:20,posY:80,width:320,height:240,cropL:0,cropR:0,cropT:0,cropB:0,blendMode:0,crtMode:!1,tilt:0,fontSize:12},debugTools:{shaderDebuggerOpen:!1,stateDebuggerOpen:!1},engineSettings:{showEngineTab:!1}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:.6190587983598513,y:.40078133786953346,z:-.5821092438548545,w:.3424753299253732},sceneOffset:{x:-.3737236559391022,y:-1.5770468711853027,z:-.1308211237192154,xL:-.060257730662381714,yL:.02761814157420639,zL:.002646650329445943},targetDistance:1.0691482573747906,cameraMode:"Orbit",lights:[],renderMode:"Direct",quality:{aaMode:"Always",aaLevel:1,msaa:1,accumulation:!0},animations:[],sequence:{durationFrames:300,fps:30,tracks:{}},duration:300}},hi={id:"Borromean",name:"Borromean (Cyclic)",shortDescription:"Three interlocking Complex Planes. Uses dimensional feedback loops instead of spherical math.",description:'Treats 3D space as three coupled 2D planes (XY, YZ, ZX). The output of one plane becomes the input of the next, creating a "Rock-Paper-Scissors" feedback loop. Produces tetrahedral symmetries and solid, non-spherical shapes.',shader:{function:`
    void formula_Borromean(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;
        
        // Param A: Power
        float power = uParamA;
        
        // Param E: Phase Shift (Rotation per iteration)
        float phase = uParamE;
        if (abs(phase) > 0.001) {
            float s = sin(phase); 
            float co = cos(phase);
            p.xy = mat2(co, -s, s, co) * p.xy;
        }

        // Derivative for generalized power
        float r = length(p);
        dr = power * pow(r, power - 1.0) * dr + 1.0;
        
        // Generalized Power Terms
        float xP = pow(abs(p.x), power);
        float yP = pow(abs(p.y), power);
        float zP = pow(abs(p.z), power);
        
        // Param B: Connection (The Link Strength)
        float connect = uParamB;
        
        // Param C: Repulsion (The Subtractive Force)
        float repel = uParamC;
        
        // Param D: Balance (Mixing Force)
        float balance = uParamD;
        
        // Param F: Invert (Sign Flip)
        float invert = uParamF;
        
        // The Cyclic Permutation
        // X driven by Z
        // Y driven by X
        // Z driven by Y
        
        float nx = (xP - repel * yP - balance * zP) + (invert * connect * 2.0 * p.z * p.x);
        float ny = (yP - repel * zP - balance * xP) + (invert * connect * 2.0 * p.x * p.y);
        float nz = (zP - repel * xP - balance * yP) + (invert * connect * 2.0 * p.y * p.z);
        
        z.xyz = vec3(nx, ny, nz) + c.xyz;
        
        trap = min(trap, dot(z.xyz, z.xyz));
    }`,loopBody:"formula_Borromean(z, dr, trap, c);"},parameters:[{label:"Power",id:"paramA",min:1,max:5,step:.01,default:2},{label:"Connection",id:"paramB",min:0,max:3,step:.01,default:1},{label:"Repulsion",id:"paramC",min:0,max:3,step:.01,default:1},{label:"Balance",id:"paramD",min:0,max:2,step:.01,default:0},{label:"Phase",id:"paramE",min:-3.14,max:3.14,step:.01,default:0,scale:"pi"},{label:"Invert",id:"paramF",min:-1,max:1,step:2,default:1}],defaultPreset:{version:1,name:"Borromean",formula:"Borromean",features:{coreMath:{iterations:28,paramA:2.25,paramB:1.04,paramC:.92,paramD:0,paramE:0,paramF:1},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridComplex:!1,burningEnabled:!1,hybridMode:!1,hybridIter:2,hybridFoldLimit:1,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridAddC:!1,hybridProtect:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotY:0,preRotX:0,preRotZ:0,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,preRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!1,shadows:!0,shadowIntensity:.82,shadowSoftness:8,shadowSteps:128,shadowBias:.002,lights:[{type:"Directional",position:{x:-1.9999999999999998,y:1,z:2},rotation:{x:-1.3618058113303921,y:2.6135019110558524,z:-2.4974118716462748},color:"#ffffff",intensity:2.8224,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:2,y:-1,z:1},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0},{type:"Point",position:{x:0,y:-5,z:2},rotation:{x:0,y:0,z:0},color:"#0088ff",intensity:.25,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!1,castShadow:!0}]},ao:{aoIntensity:.36219236319294446,aoSpread:.010521796258218545,aoSamples:22,aoMode:!0,aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},reflections:{mixStrength:1,roughnessThreshold:.5,bounces:1,steps:64,enabled:!0},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:0,fogNear:0,fogFar:5,fogColor:"#000000",fogDensity:0,glowIntensity:.064445198559225,glowSharpness:1.8620871366628675,glowMode:!1,glowColor:"#ffffff"},materials:{diffuse:1.92,reflection:0,specular:1.52,roughness:.23035625001175353,rim:0,rimExponent:4,envStrength:0,envBackgroundStrength:0,envSource:1,envMapData:null,envMapColorSpace:0,useEnvMap:!1,envRotation:0,envGradientStops:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},waterPlane:{waterEnabled:!1,active:!0,height:-2,color:"#001133",roughness:.02,waveStrength:.1,waveSpeed:1,waveFrequency:1.5},coloring:{gradient:{stops:[{id:"1771160459074_0",position:0,color:"#5F4690",bias:.5,interpolation:"linear"},{id:"1771160459074_1",position:.091,color:"#1D6996",bias:.5,interpolation:"linear"},{id:"1771160459074_2",position:.182,color:"#38A6A5",bias:.5,interpolation:"linear"},{id:"1771160459074_3",position:.273,color:"#0F8554",bias:.5,interpolation:"linear"},{id:"1771160459074_4",position:.364,color:"#73AF48",bias:.5,interpolation:"linear"},{id:"1771160459074_5",position:.455,color:"#EDAD08",bias:.5,interpolation:"linear"},{id:"1771160459074_6",position:.545,color:"#E17C05",bias:.5,interpolation:"linear"},{id:"1771160459074_7",position:.636,color:"#CC503E",bias:.5,interpolation:"linear"},{id:"1771160459074_8",position:.727,color:"#94346E",bias:.5,interpolation:"linear"},{id:"1771160459074_9",position:.818,color:"#6F4070",bias:.5,interpolation:"linear"},{id:"1771160459074_10",position:.909,color:"#994E95",bias:.5,interpolation:"linear"},{id:"1771160459074_11",position:1,color:"#666666",bias:.5,interpolation:"linear"}],colorSpace:"linear"},mode:1,scale:2.2754446706935223,offset:-.07388697269814448,repeats:2,phase:0,bias:1,twist:0,escape:4,gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}],mode2:4,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:0,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:2,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},texturing:{active:!1,layer1Data:null,colorSpace:0,mapU:6,mapV:1,scaleX:1,scaleY:1,offset:{x:0,y:0},textureScale:{x:1,y:1}},quality:{engineQuality:!0,compilerHardCap:500,precisionMode:0,bufferPrecision:0,maxSteps:300,distanceMetric:0,estimator:0,fudgeFactor:.5,stepRelaxation:0,refinementSteps:0,detail:2,pixelThreshold:.5,overstepTolerance:0,dynamicScaling:!1,interactionDownsample:2},droste:{active:!1,tiling:1,center:{x:0,y:0},radiusInside:5,radiusOutside:100,periodicity:2,strands:2,autoPeriodicity:!1,strandMirror:!1,zoom:0,rotate:0,rotateSpin:0,rotatePolar:0,twist:!0,hyperDroste:!1,fractalPoints:1},colorGrading:{active:!1,saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camType:0,camFov:60,orthoScale:2,dofStrength:0,dofFocus:10},navigation:{flySpeed:.5,autoSlow:!0},cameraManager:{},audio:{isEnabled:!1,smoothing:.8,threshold:.1,agcEnabled:!1,attack:.1,decay:.3,highPass:20,lowPass:2e4,gain:1},drawing:{activeTool:"rect",enabled:!1,active:!1,originMode:1,color:"#00ffff",lineWidth:1,showLabels:!0,showAxes:!1,shapes:[],refreshTrigger:0},modulation:{rules:[],selectedRuleId:null},webcam:{isEnabled:!1,opacity:1,posX:20,posY:80,width:320,height:240,cropL:0,cropR:0,cropT:0,cropB:0,blendMode:0,crtMode:!1,tilt:0,fontSize:12},debugTools:{shaderDebuggerOpen:!1,stateDebuggerOpen:!1},engineSettings:{showEngineTab:!1}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.2938195179022356,y:.33371368466206736,z:.11030705445694247,w:.8888968563933598},sceneOffset:{x:1.540531039237976,y:1.1154367923736572,z:1.807411551475525,xL:-.31978609027941085,yL:.2396308322743712,zL:-.23608000053467415},targetDistance:2.0720281302928925,cameraMode:"Orbit",lights:[],renderMode:"Direct",quality:{aaMode:"Always",aaLevel:1,msaa:1,accumulation:!0},animations:[],sequence:{durationFrames:300,fps:30,tracks:{}},duration:300}},mi={id:"MandelMap",name:"MandelMap (Unrolled)",shortDescription:"Unrolls the Mandelbulb surface. Features Sphere, Cylinder, and Torus projections.",description:'Maps the Mandelbulb 3D structure onto a 2D plane. Use "Projection" (Param D) to switch between Spherical (Standard), Cylindrical (Infinite Vertical), and Toroidal (Seamless) mappings.',shader:{function:`
    vec3 planeToBulb(vec3 p, float scale, float heightAmp, float thetaOffset, float phiOffset, float mode) {
        // --- 1. COORDINATE PREP ---
        // Apply Map Scaling & Phase Compensation first
        // This effectively "Slides" the map texture to counter-act the fractal rotation
        float u = p.x * scale - phiOffset;
        float v = p.z * scale - thetaOffset;
        
        // Height (Radius base)
        // Base radius 1.1 puts Y=0 slightly outside the unit bulb surface
        float r = 1.1 + (p.y / max(0.01, heightAmp));
        
        // --- 2. PROJECTION MAPPING ---
        
        if (mode < 0.5) {
            // MODE 0: SPHERICAL (Mercator)
            // Classic mapping. Distorts at poles (high Z).
            // u -> Longitude (Phi), v -> Latitude (Theta)
            
            float theta = v + 1.570796; // Center at equator
            float phi = u;
            
            return r * vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta));
        } 
        else if (mode < 1.5) {
            // MODE 1: CYLINDRICAL
            // Unwraps to an infinite vertical column. No polar distortion.
            // u -> Angle (Phi), v -> Height (Y), r -> Radius
            
            float phi = u;
            float height = v;
            
            // X/Z form the circle, Y is height
            return vec3(r * cos(phi), height, r * sin(phi));
        } 
        else {
            // MODE 2: TOROIDAL
            // Wraps around a donut. Seamless tiling in all directions.
            // u -> Major Angle, v -> Minor Angle
            
            float majorR = 2.0; // Radius of the donut hole
            
            // Torus formula:
            // X = (R + r*cos(v)) * cos(u)
            // Y = (R + r*cos(v)) * sin(u)
            // Z = r * sin(v)
            // We use 'r' (height) as the minor radius scaler
            
            float minorR = r; 
            
            return vec3(
                (majorR + minorR * cos(v)) * cos(u),
                minorR * sin(v),
                (majorR + minorR * cos(v)) * sin(u)
            );
        }
    }

    void formula_MandelMap(inout vec4 z, inout float dr, inout float trap, inout vec4 c) {
        float power = uParamA;
        float thetaPhase = uVec2A.x;
        float phiPhase = uVec2A.y;

        // Run transform only on the first iteration
        if (dr == 1.0) {
            float heightAmp = uParamB;
            float mapScale = uParamC;
            float projMode = uParamD;
            
            // --- Coordinate Compensation Logic ---
            // Symmetry Shift = Phase / (Power - 1.0)
            // This locks the visual features in place while they mutate
            float divisor = max(1.0, power - 1.0);
            float thetaOffset = thetaPhase / divisor;
            float phiOffset = phiPhase / divisor;
            
            vec3 w = planeToBulb(z.xyz, mapScale, heightAmp, thetaOffset, phiOffset, projMode);
            
            // --- Lipschitz Correction ---
            // Estimate expansion factor to correct Distance Estimation
            float r = length(w);
            float verticalScale = 1.0 / max(0.01, heightAmp);
            float horizontalScale = r * mapScale;
            float stretch = max(verticalScale, horizontalScale);
            
            dr *= max(1.0, stretch);
            
            z.xyz = w;
            
            if (uJuliaMode < 0.5) {
                c.xyz = w;
            }
        }

        // Standard Mandelbulb Iteration
        vec3 p = z.xyz;
        float r = length(p);
        
        if (r > 1.0e-4) {
            dr = pow(r, power - 1.0) * power * dr + 1.0;
            
            float theta = acos(clamp(p.z / r, -1.0, 1.0));
            float phi = atan(p.y, p.x);
            
            float zr = pow(r, power);
            
            // Apply Phase Shifts
            theta = theta * power + thetaPhase;
            phi = phi * power + phiPhase;
            
            p = zr * vec3(sin(theta)*cos(phi), sin(theta)*sin(phi), cos(theta));
        }
        
        p += c.xyz;
        
        z.xyz = p;
        trap = min(trap, length(p));
    }`,loopBody:"formula_MandelMap(z, dr, trap, c);"},parameters:[{label:"Power",id:"paramA",min:2,max:16,step:.01,default:8},{label:"Height Amp",id:"paramB",min:.1,max:10,step:.1,default:2},{label:"Map Scale",id:"paramC",min:.1,max:5,step:.01,default:1},{label:"Projection",id:"paramD",min:0,max:2,step:1,default:1,options:[{label:"Spherical",value:0},{label:"Cylindrical",value:1},{label:"Toroidal",value:2}]},{label:"Phase (θ, φ)",id:"vec2A",type:"vec2",min:-6.28,max:6.28,step:.1,default:{x:0,y:0},scale:"pi"}],defaultPreset:{version:1,name:"MandelMap",formula:"MandelMap",features:{coreMath:{iterations:11,paramA:4,paramB:1.61,paramC:1,paramD:0,vec2A:{x:0,y:0}},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridComplex:!1,burningEnabled:!1,hybridMode:!1,hybridIter:2,hybridFoldLimit:1,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridAddC:!1,hybridProtect:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotY:0,preRotX:0,preRotZ:0,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,preRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!1,shadows:!0,shadowIntensity:1,shadowSoftness:33.96487304923489,shadowSteps:304,shadowBias:0,lights:[{type:"Directional",position:{x:-2,y:1,z:2},rotation:{x:-1.2945477312837892,y:3.0961684975756443,z:-3.0815085191809364},color:"#ffffff",intensity:6.969599999999999,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:2,y:-1,z:1},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0},{type:"Point",position:{x:0,y:-5,z:2},rotation:{x:0,y:0,z:0},color:"#0088ff",intensity:.25,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!1,castShadow:!0}]},ao:{aoIntensity:.7102583030181524,aoSpread:.02075305004726551,aoSamples:5,aoMode:!0,aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},reflections:{mixStrength:1,roughnessThreshold:.5,bounces:1,steps:64,enabled:!0},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:.66,fogNear:3.3177600000000007,fogFar:14.5,fogColor:"#7f6969",fogDensity:0,glowIntensity:0,glowSharpness:11.220184543019629,glowMode:!1,glowColor:"#ffffff"},materials:{diffuse:2,reflection:0,specular:0,roughness:.5,rim:0,rimExponent:4,envStrength:.75,envBackgroundStrength:0,envSource:1,envMapData:null,envMapColorSpace:0,useEnvMap:!1,envRotation:0,envGradientStops:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},waterPlane:{waterEnabled:!1,active:!0,height:-2,color:"#001133",roughness:.02,waveStrength:.1,waveSpeed:1,waveFrequency:1.5},coloring:{gradient:{stops:[{id:"1771159172325_0",position:0,color:"#009392",bias:.5,interpolation:"linear"},{id:"1771159172325_1",position:.167,color:"#39b185",bias:.5,interpolation:"linear"},{id:"1771159172325_2",position:.333,color:"#9ccb86",bias:.5,interpolation:"linear"},{id:"1771159172325_3",position:.5,color:"#e9e29c",bias:.5,interpolation:"linear"},{id:"1771159172325_4",position:.667,color:"#eeb479",bias:.5,interpolation:"linear"},{id:"1771159172325_5",position:.833,color:"#e88471",bias:.5,interpolation:"linear"},{id:"1771159172325_6",position:1,color:"#cf597e",bias:.5,interpolation:"linear"}],colorSpace:"linear"},mode:1,scale:3.1065735566446993,offset:.20712783526166173,repeats:1,phase:0,bias:.5963552876944301,twist:0,escape:4,gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}],mode2:4,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:0,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:2,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},texturing:{active:!1,layer1Data:null,colorSpace:0,mapU:6,mapV:1,scaleX:1,scaleY:1,offset:{x:0,y:0},textureScale:{x:1,y:1}},quality:{engineQuality:!0,compilerHardCap:500,precisionMode:0,bufferPrecision:0,maxSteps:300,distanceMetric:0,estimator:0,fudgeFactor:1,stepRelaxation:0,refinementSteps:0,detail:2,pixelThreshold:.5,overstepTolerance:0,dynamicScaling:!1,interactionDownsample:2},droste:{active:!1,tiling:1,center:{x:0,y:0},radiusInside:5,radiusOutside:100,periodicity:2,strands:2,autoPeriodicity:!1,strandMirror:!1,zoom:0,rotate:0,rotateSpin:0,rotatePolar:0,twist:!0,hyperDroste:!1,fractalPoints:1},colorGrading:{active:!1,saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camType:0,camFov:60,orthoScale:2,dofStrength:0,dofFocus:10},navigation:{flySpeed:.5,autoSlow:!0},cameraManager:{},audio:{isEnabled:!1,smoothing:.8,threshold:.1,agcEnabled:!1,attack:.1,decay:.3,highPass:20,lowPass:2e4,gain:1},drawing:{activeTool:"rect",enabled:!1,active:!1,originMode:1,color:"#00ffff",lineWidth:1,showLabels:!0,showAxes:!1,shapes:[],refreshTrigger:0},modulation:{rules:[],selectedRuleId:null},webcam:{isEnabled:!1,opacity:1,posX:20,posY:80,width:320,height:240,cropL:0,cropR:0,cropT:0,cropB:0,blendMode:0,crtMode:!1,tilt:0,fontSize:12},debugTools:{shaderDebuggerOpen:!1,stateDebuggerOpen:!1},engineSettings:{showEngineTab:!1}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.40127164816286187,y:8701571167029472e-23,z:2710286594285787e-22,w:.9159590953642958},sceneOffset:{x:0,y:4,z:5,xL:-.00800157869605831,yL:-.1778496246363903,zL:-.24803174116677118},targetDistance:4.905199170112612,cameraMode:"Orbit",lights:[],renderMode:"Direct",quality:{aaMode:"Always",aaLevel:1,msaa:1,accumulation:!0},animations:[],sequence:{durationFrames:300,fps:30,tracks:{}},duration:300}},gi={id:"MandelBolic",name:"MandelBolic",shortDescription:"A true 3D geometric extension of the Mandelbrot set into Hyperbolic 3-Space.",description:'Bypasses the limitations of 3D algebra by using the Poincaré-Ahlfors extension into Hyperbolic 3-Space. This preserves perfect spherical bulbs, exact periodicity, and the true 3D cardioid core without the "smeared" artifacts of standard 3D fractals. Now features generalized Power and Hyperbolic distortion parameters.',shader:{function:`
        void formula_MandelBolic(inout vec4 z, inout float dr, inout float trap, vec4 c) {
            vec3 z3 = z.xyz;
            float power = uParamA;

            // Z is the 2D complex plane (x, y), T is the hyperbolic height (z)
            float rxy2 = z3.x*z3.x + z3.y*z3.y;
            float rxy = sqrt(rxy2);

            // Ahlfors Extension multiplier: M = (|Z|^2 - T^2) / |Z|^2
            // uParamC (Conformal Shift) distorts the hyperbolic mapping
            float m = (rxy2 - uParamC * z3.z*z3.z) / (rxy2 + 1e-20);

            // Shared rxy^(p-1) — used by both derivative and Z mapping
            float rxy_pm1 = pow(max(rxy, 1e-10), power - 1.0);
            float rxy_p = rxy_pm1 * rxy;

            // Derivative: account for split XY/Z Jacobian
            // XY stretch: p * rxy^(p-1) * |m|  (conformal distortion)
            // Z  stretch: p * rxy^(p-1) * |B|  (hyperbolic scaling)
            // Use max for conservative bound on largest singular value
            float stretch = power * rxy_pm1 * max(abs(m), abs(uParamB));
            dr = stretch * dr + 1.0;

            // Apply the conformal 3D power with Phase Twist (uParamD)
            float theta = atan(z3.y, z3.x) * power + uParamD;

            // Z_{n+1} = Z_n^p * M + C_z
            float nx = rxy_p * cos(theta) * m + c.x;
            float ny = rxy_p * sin(theta) * m + c.y;

            // T_{n+1} = p * |Z_n|^(p-1) * T_n + C_t
            // uParamB scales the hyperbolic height growth, uParamE adds a constant Z-offset
            float nz = power * rxy_pm1 * z3.z * uParamB + c.z + uParamE;

            z.xyz = vec3(nx, ny, nz);
            trap = min(trap, length(z.xyz) * uParamF);
        }`,loopBody:"formula_MandelBolic(z, dr, trap, c);"},parameters:[{label:"Power",id:"paramA",min:1,max:16,step:.01,default:2},{label:"Hyp. Scale",id:"paramB",min:-2,max:2,step:.01,default:1},{label:"Conformal Shift",id:"paramC",min:-2,max:2,step:.01,default:1},{label:"Phase Twist",id:"paramD",min:-3.14,max:3.14,step:.01,default:0,scale:"pi"},{label:"Z-Offset",id:"paramE",min:-2,max:2,step:.01,default:0},{label:"Trap Scale",id:"paramF",min:.1,max:5,step:.01,default:1}],defaultPreset:{formula:"MandelBolic",features:{coreMath:{iterations:26,paramA:2,paramB:1,paramC:1,paramD:0,paramE:0,paramF:1},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridComplex:!1,burningEnabled:!0,hybridMode:!1,hybridIter:0,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1,hybridAddC:!1,hybridProtect:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotY:0,preRotX:0,preRotZ:0,juliaMode:!1,juliaX:-.277,juliaY:-.05,juliaZ:.31,preRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!1,shadows:!1,shadowIntensity:1,shadowSoftness:381.09214359264973,shadowSteps:352,shadowBias:.0010409787880182823,lights:[{type:"Directional",position:{x:-.7,y:.37,z:1.4},rotation:{x:.39966912659916126,y:-2.29961371262364,z:-.8495893165947439},color:"#ffffff",intensity:1.5625,falloff:.22000013414400005,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.6,y:-.5,z:1.4},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0}]},ao:{aoIntensity:.383,aoSpread:.002,aoSamples:12,aoMode:!1,aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},reflections:{mixStrength:1,roughnessThreshold:.5,bounces:1,steps:64,enabled:!0},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:0,fogNear:0,fogFar:5,fogColor:"#000000",fogDensity:0,glowIntensity:.004798262654911253,glowSharpness:1,glowMode:!0,glowColor:"#50aaff"},materials:{diffuse:1,reflection:0,specular:0,roughness:.75,rim:0,rimExponent:3,envStrength:.25,envBackgroundStrength:.06,envSource:1,envMapData:null,envMapColorSpace:0,useEnvMap:!0,envRotation:0,envGradientStops:[{id:"hor",position:0,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},waterPlane:{waterEnabled:!1,active:!0,height:-2,color:"#001133",roughness:.02,waveStrength:.1,waveSpeed:1,waveFrequency:1.5},coloring:{gradient:{stops:[{id:"1771879786393_0",position:0,color:"#9e0142",bias:.5,interpolation:"linear"},{id:"1771879786393_1",position:.111,color:"#d53e4f",bias:.5,interpolation:"linear"},{id:"1771879786393_2",position:.222,color:"#f46d43",bias:.5,interpolation:"linear"},{id:"1771879786393_3",position:.333,color:"#fdae61",bias:.5,interpolation:"linear"},{id:"1771879786393_4",position:.444,color:"#fee08b",bias:.5,interpolation:"linear"},{id:"1771879786393_5",position:.556,color:"#e6f598",bias:.5,interpolation:"linear"},{id:"1771879786393_6",position:.667,color:"#abdda4",bias:.5,interpolation:"linear"},{id:"1771879786393_7",position:.778,color:"#66c2a5",bias:.5,interpolation:"linear"},{id:"1771879786393_8",position:.889,color:"#3288bd",bias:.5,interpolation:"linear"},{id:"1771879786393_9",position:1,color:"#5e4fa2",bias:.5,interpolation:"linear"}],colorSpace:"srgb"},mode:1,scale:1.1510942207477979,offset:-.1726286201331454,repeats:1,phase:-.13,bias:1,twist:0,escape:1.2,gradient2:[{id:"1767363622003",position:0,color:"#FFFFFF",bias:.5,interpolation:"linear"},{id:"1",position:.5,color:"#000000",bias:.5,interpolation:"linear"},{id:"1767363615540",position:1,color:"#FFFFFF",bias:.5,interpolation:"linear"}],mode2:4,scale2:1,offset2:0,repeats2:7,phase2:0,bias2:1,twist2:0,blendMode:0,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:20,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},texturing:{active:!1,layer1Data:null,colorSpace:0,mapU:6,mapV:1,scaleX:1,scaleY:1,offset:{x:0,y:0},textureScale:{x:1,y:1}},quality:{engineQuality:!0,compilerHardCap:500,precisionMode:0,bufferPrecision:0,maxSteps:534,distanceMetric:0,estimator:0,fudgeFactor:.32,stepRelaxation:0,refinementSteps:0,detail:6.1,pixelThreshold:.2,overstepTolerance:2.7,dynamicScaling:!1,interactionDownsample:2,physicsProbeMode:0,manualDistance:10},droste:{active:!1,tiling:1,center:{x:0,y:0},radiusInside:5,radiusOutside:100,periodicity:2,strands:2,autoPeriodicity:!1,strandMirror:!1,zoom:0,rotate:0,rotateSpin:0,rotatePolar:0,twist:!0,hyperDroste:!1,fractalPoints:1},colorGrading:{active:!0,saturation:1.29,levelsMin:0,levelsMax:.47826086956521746,levelsGamma:.7718886339575918},optics:{camType:0,camFov:60,orthoScale:2,dofStrength:0,dofFocus:.0598781733877129},navigation:{flySpeed:.42258925411794174,autoSlow:!0},cameraManager:{},audio:{isEnabled:!1,smoothing:.8,threshold:.1,agcEnabled:!1,attack:.1,decay:.3,highPass:20,lowPass:2e4,gain:1},drawing:{activeTool:"rect",enabled:!1,active:!1,originMode:1,color:"#00ffff",lineWidth:1,showLabels:!0,showAxes:!1,shapes:[],refreshTrigger:0},modulation:{rules:[],selectedRuleId:null},webcam:{isEnabled:!1,opacity:1,posX:20,posY:80,width:320,height:240,cropL:0,cropR:0,cropT:0,cropB:0,blendMode:0,crtMode:!1,tilt:0,fontSize:12},debugTools:{shaderDebuggerOpen:!1,stateDebuggerOpen:!1},engineSettings:{showEngineTab:!1}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.6959547620697641,y:-.23496707663264949,z:.30543710842202915,w:.6059254202044269},sceneOffset:{x:-1.9531606435775757,y:1.1919928789138794,z:-1.096980132162571,xL:-.41618868170671375,yL:-.030576279777909363,zL:.3954860597472547},targetDistance:2.4710260497199164,cameraMode:"Fly",lights:[],renderMode:"Direct",quality:{aaMode:"Always",aaLevel:1,msaa:1,accumulation:!0},animations:[],sequence:{durationFrames:300,fps:30,tracks:{"camera.unified.x":{id:"camera.unified.x",type:"float",label:"Position X",keyframes:[{id:"K_3Us2DNYcHZyIwka_uuq",frame:0,value:-1.7201625603807942,interpolation:"Bezier",autoTangent:!1,brokenTangents:!1,leftTangent:{x:-10,y:0},rightTangent:{x:48.951,y:0}},{id:"odTd7X1107yeLfH9FK5aA",frame:147,value:-1.6980158112292516,interpolation:"Bezier",autoTangent:!1,brokenTangents:!1,leftTangent:{x:-48.951,y:0},rightTangent:{x:10,y:0}}],hidden:!1},"camera.unified.y":{id:"camera.unified.y",type:"float",label:"Position Y",keyframes:[{id:"8RswhxI4H-B1jp30d0_tB",frame:0,value:.06091210123685605,interpolation:"Bezier",autoTangent:!1,brokenTangents:!1,leftTangent:{x:-10,y:0},rightTangent:{x:48.951,y:0}},{id:"Y4DuM9kqQELrT8wtkrNfn",frame:147,value:.12378730479642533,interpolation:"Bezier",autoTangent:!1,brokenTangents:!1,leftTangent:{x:-48.951,y:0},rightTangent:{x:10,y:0}}],hidden:!1},"camera.unified.z":{id:"camera.unified.z",type:"float",label:"Position Z",keyframes:[{id:"xAB-5DFGdS6bkihuF8OsC",frame:0,value:-.15881702211000104,interpolation:"Bezier",autoTangent:!1,brokenTangents:!1,leftTangent:{x:-10,y:0},rightTangent:{x:48.951,y:0}},{id:"DAF_P4oTGG75Hsx1AsrRY",frame:147,value:-.011418242797758438,interpolation:"Bezier",autoTangent:!1,brokenTangents:!1,leftTangent:{x:-48.951,y:0},rightTangent:{x:10,y:0}}],hidden:!1},"camera.rotation.x":{id:"camera.rotation.x",type:"float",label:"Rotation X",keyframes:[{id:"TeO7ekSi3R-H4hMrtFwAE",frame:0,value:-2.4946725811260992,interpolation:"Bezier",autoTangent:!1,brokenTangents:!1,leftTangent:{x:-10,y:0},rightTangent:{x:48.951,y:0}},{id:"8d0b5xWCbgu3uTnAgDlXz",frame:147,value:-1.2608810934530643,interpolation:"Bezier",autoTangent:!1,brokenTangents:!1,leftTangent:{x:-48.951,y:0},rightTangent:{x:10,y:0}}],hidden:!1},"camera.rotation.y":{id:"camera.rotation.y",type:"float",label:"Rotation Y",keyframes:[{id:"LbvOs-fAlGz_3QJaS3mZJ",frame:0,value:.2399686287878261,interpolation:"Bezier",autoTangent:!1,brokenTangents:!1,leftTangent:{x:-10,y:0},rightTangent:{x:48.951,y:0}},{id:"vtyfLR6bU-95GzHTczuWf",frame:147,value:.35920958243574597,interpolation:"Bezier",autoTangent:!1,brokenTangents:!1,leftTangent:{x:-48.951,y:0},rightTangent:{x:10,y:0}}],hidden:!1},"camera.rotation.z":{id:"camera.rotation.z",type:"float",label:"Rotation Z",keyframes:[{id:"R5V5ISxjfkqp24bTHbENo",frame:0,value:.265482333717115,interpolation:"Bezier",autoTangent:!1,brokenTangents:!1,leftTangent:{x:-10,y:0},rightTangent:{x:48.951,y:0}},{id:"6rTTGg-w5Pmu5rzjJzMCh",frame:147,value:-.12791460575119148,interpolation:"Bezier",autoTangent:!1,brokenTangents:!1,leftTangent:{x:-48.951,y:0},rightTangent:{x:10,y:0}}],hidden:!1}}},duration:147}},xi={id:"KaliBox",name:"Kali Box",shortDescription:"Kali's abs-fold fractal with sphere inversion. Organic caves and alien landscapes.",description:"A Mandelbox variant by Kali (fractalforums.com), optimized by Rrrola. Uses rotation, abs-fold + translation, clamped sphere inversion, and scale/minRad rescaling. Produces organic, cave-like structures.",shader:{preamble:`
    // KaliBox: Pre-calculated rotation (computed once per frame)
    // Axis-angle rotation around (1,1,0) normalized
    mat3 uKB_rot = mat3(1.0);
    bool uKB_doRot = false;

    void KaliBox_precalcRotation() {
        float rotAngle = uParamF;
        if (abs(rotAngle) > 0.001) {
            uKB_doRot = true;
            vec3 axis = normalize(vec3(1.0, 1.0, 0.0));
            float s = sin(rotAngle);
            float c_rot = cos(rotAngle);
            float oc = 1.0 - c_rot;
            uKB_rot = mat3(
                oc * axis.x * axis.x + c_rot,      oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c_rot,      oc * axis.y * axis.z - axis.x * s,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c_rot
            );
        } else {
            uKB_doRot = false;
        }
    }`,function:`
    void formula_KaliBox(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;

        float scale = uParamA;
        float minRad2 = uParamB;

        // 1. Rotation (axis-angle around (1,1,0))
        if (uKB_doRot) {
            p *= uKB_rot;
        }

        // 2. Abs fold + translation
        p = abs(p) + uVec3A;

        // 3. Sphere inversion (Rrrola's clamp)
        float r2 = dot(p, p);
        float k = clamp(max(minRad2 / r2, minRad2), 0.0, 1.0);
        p *= k;

        // 4. Scale and add constant
        p = p * (scale / minRad2) + c.xyz;

        // 5. Update derivative
        dr = dr * k * (abs(scale) / minRad2) + 1.0;

        z.xyz = p;
        trap = min(trap, length(p));
    }`,loopBody:"formula_KaliBox(z, dr, trap, c);",loopInit:"KaliBox_precalcRotation();",getDist:`
            float absScalem1 = abs(uParamA - 1.0);
            return vec2((r - absScalem1) / dr, iter);
        `},parameters:[{label:"Scale",id:"paramA",min:-3,max:3,step:.001,default:2.043},{label:"MinRad2",id:"paramB",min:.001,max:2,step:.001,default:.349},{label:"Translation",id:"vec3A",type:"vec3",min:-5,max:5,step:.001,default:{x:.036,y:-1.861,z:.036}},{label:"Rotation",id:"paramF",min:-3.14,max:3.14,step:.01,default:0,scale:"pi"}],defaultPreset:{formula:"KaliBox",features:{coreMath:{iterations:15,paramA:2.04348,paramB:.3492,paramF:0,vec3A:{x:.0365,y:-1.9183,z:.0365}},coloring:{mode:1,repeats:1,phase:-.44,scale:1.9664327756755327,offset:-1.4432563267287075,bias:1,twist:0,escape:1.2,mode2:4,repeats2:7,phase2:0,blendMode:0,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:20,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0,gradient:[{id:"1773423501447_0",position:0,color:"#FD6029",bias:.5,interpolation:"step"},{id:"1773423501447_1",position:.111,color:"#698403",bias:.5,interpolation:"step"},{id:"1773423501447_2",position:.222,color:"#FFF59B",bias:.5,interpolation:"step"},{id:"1773423501447_3",position:.333,color:"#F5BD22",bias:.5,interpolation:"step"},{id:"1773423501447_4",position:.444,color:"#0B5E87",bias:.5,interpolation:"step"},{id:"1773423501447_5",position:.556,color:"#C68876",bias:.5,interpolation:"step"},{id:"1773423501447_6",position:.667,color:"#A51C64",bias:.5,interpolation:"step"},{id:"1773423501447_7",position:.778,color:"#3B9FEE",bias:.5,interpolation:"step"},{id:"1773423501447_8",position:.889,color:"#D4FFD4",bias:.5,interpolation:"step"},{id:"1773423501447_9",position:1,color:"#ABA53C",bias:.5,interpolation:"linear"}],gradient2:[{id:"kb2_0",position:0,color:"#FFFFFF",bias:.5,interpolation:"linear"},{id:"kb2_1",position:.5,color:"#000000",bias:.5,interpolation:"linear"},{id:"kb2_2",position:1,color:"#FFFFFF",bias:.5,interpolation:"linear"}]},ao:{aoIntensity:.198,aoSpread:.3610966624411007,aoSamples:8,aoEnabled:!0,aoMode:!1},atmosphere:{fogNear:0,fogFar:5,fogColor:"#000000",fogDensity:0,glowIntensity:.0010213564266668151,glowSharpness:3,glowColor:"#ffffff",glowMode:!1},materials:{diffuse:1,reflection:0,specular:1,roughness:.3,rim:0,rimExponent:3,envStrength:.35,envBackgroundStrength:.15,envSource:1,useEnvMap:!1,envRotation:0,emission:0,emissionMode:0,emissionColor:"#ffffff",envGradientStops:[{id:"1773423550251_0",position:0,color:"#3B4CC0",bias:.5,interpolation:"linear"},{id:"1773423550251_1",position:.143,color:"#6889EE",bias:.5,interpolation:"linear"},{id:"1773423550251_2",position:.286,color:"#9ABAFF",bias:.5,interpolation:"linear"},{id:"1773423550251_3",position:.429,color:"#C9D8F0",bias:.5,interpolation:"linear"},{id:"1773423550251_4",position:.571,color:"#EDD1C2",bias:.5,interpolation:"linear"},{id:"1773423550251_5",position:.714,color:"#F7A889",bias:.5,interpolation:"linear"},{id:"1773423550251_6",position:.857,color:"#E26A53",bias:.5,interpolation:"linear"},{id:"1773423550251_7",position:1,color:"#B40426",bias:.5,interpolation:"linear"}]},geometry:{juliaMode:!0,juliaX:-.6691,juliaY:-1.3028,juliaZ:-.45775},lighting:{advancedLighting:!0,ptEnabled:!0,shadows:!0,shadowSoftness:16,shadowIntensity:1,shadowBias:.001},quality:{detail:3,fudgeFactor:.7,pixelThreshold:.2,maxSteps:522,distanceMetric:1,estimator:0},optics:{camFov:90,dofStrength:0,dofFocus:.9911481142044067}},cameraPos:{x:-.5108672817633045,y:-.49092728212507375,z:.06312098713692904},cameraRot:{x:-.21217453440255712,y:.9007285600831599,z:-.2000534384923281,w:-.3219451036263353},cameraFov:90,sceneOffset:{x:-.47271010279655457,y:.5621813535690308,z:-.6614219546318054,xL:.4219589741076178,yL:.40918048066299684,zL:-.16639292373950365},targetDistance:.7113221737919322,cameraMode:"Orbit",lights:[{type:"Directional",position:{x:.62,y:-.07,z:1.4},rotation:{x:-.025067221468304684,y:-3.071530976748474,z:.6869655122565176},color:"#ffffff",intensity:1,falloff:.22,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:2,y:-1,z:1},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:0,y:0,z:-3},rotation:{x:0,y:0,z:0},color:"#0044ff",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},yi={id:"Claude",name:"Claude",shortDescription:"Harmonic resonance IFS — icosahedral folds with parametric 4th reflection plane.",description:'Icosahedral reflection folds (golden-ratio normals) + a parametric "harmonic" fold (4th plane swept around the golden axis) + clamped sphere inversion. The harmonic fold is unique to this formula — it enriches the icosahedral base like an overtone enriches a fundamental tone. φ appears in fold geometry, harmonic axis, and default parameters.',shader:{preamble:`
    // Golden ratio and icosahedral fold normals
    const float claude_Phi = (1.0 + sqrt(5.0)) * 0.5;
    const vec3 claude_n1 = normalize(vec3(-1.0, claude_Phi - 1.0, 1.0 / (claude_Phi - 1.0)));
    const vec3 claude_n2 = normalize(vec3(claude_Phi - 1.0, 1.0 / (claude_Phi - 1.0), -1.0));
    const vec3 claude_n3 = normalize(vec3(1.0 / (claude_Phi - 1.0), -1.0, claude_Phi - 1.0));

    // Golden axis: (1, φ, 0) normalized — an icosahedral vertex direction
    // Used as the sweep axis for the harmonic fold
    const vec3 claude_goldenAxis = normalize(vec3(1.0, claude_Phi, 0.0));

    // Harmonic fold normal (4th plane, computed once per frame via Rodrigues)
    vec3 uCl_n4 = claude_n3;
    bool uCl_doHarmonic = false;

    // Pre-fold rotation (vec3B: azimuth/pitch/angle)
    vec3 uCl_rotAxis = vec3(0.0, 1.0, 0.0);
    float uCl_rotCos = 1.0;
    float uCl_rotSin = 0.0;
    bool uCl_doRot = false;

    void Claude_precalc() {
        // Harmonic: rotate n3 around golden axis by paramB (Rodrigues formula)
        float h = uParamB;
        if (abs(h) > 0.001) {
            uCl_doHarmonic = true;
            float ch = cos(h), sh = sin(h);
            float dk = dot(claude_goldenAxis, claude_n3);
            uCl_n4 = claude_n3 * ch
                   + cross(claude_goldenAxis, claude_n3) * sh
                   + claude_goldenAxis * dk * (1.0 - ch);
        } else {
            uCl_doHarmonic = false;
        }

        // Pre-fold rotation (standard axis-angle from vec3B)
        if (abs(uVec3B.z) > 0.001) {
            uCl_doRot = true;
            float azimuth = uVec3B.x;
            float pitch = uVec3B.y;
            float rotAngle = uVec3B.z * 0.5;
            float cosPitch = cos(pitch);
            uCl_rotAxis = vec3(
                cosPitch * sin(azimuth),
                sin(pitch),
                cosPitch * cos(azimuth)
            );
            uCl_rotSin = sin(rotAngle);
            uCl_rotCos = cos(rotAngle);
        } else {
            uCl_doRot = false;
        }
    }`,function:`
    void formula_Claude(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;

        // 1. Pre-fold rotation (Rodrigues, vec3B)
        if (uCl_doRot) {
            p = p * uCl_rotCos
              + cross(uCl_rotAxis, p) * uCl_rotSin
              + uCl_rotAxis * dot(uCl_rotAxis, p) * (1.0 - uCl_rotCos);
        }

        // 2. Icosahedral fold — three golden-ratio reflection normals
        //    Maps space into a fundamental domain with partial 5-fold symmetry
        p -= 2.0 * min(0.0, dot(p, claude_n1)) * claude_n1;
        p -= 2.0 * min(0.0, dot(p, claude_n2)) * claude_n2;
        p -= 2.0 * min(0.0, dot(p, claude_n3)) * claude_n3;

        // 3. Harmonic fold — 4th reflection plane at golden-axis angle
        //    Enriches the icosahedral base with an additional perspective
        if (uCl_doHarmonic) {
            p -= 2.0 * min(0.0, dot(p, uCl_n4)) * uCl_n4;
        }

        // 4. Sphere inversion (clamped Mandelbox-style)
        float r2 = max(dot(p, p), 1e-10);
        float minR2 = uParamC;
        float fixR2 = uParamD;
        float sphereK = clamp(fixR2 / r2, 1.0, fixR2 / max(minR2, 1e-10));
        p *= sphereK;
        dr *= sphereK;

        // 5. IFS scale + offset
        float scale = uParamA;
        p = p * scale - uVec3A * (scale - 1.0);
        dr *= abs(scale);

        // 6. Twist (position-dependent spiral)
        if (abs(uParamF) > 0.001) {
            float ang = p.y * uParamF;
            float s = sin(ang), co = cos(ang);
            p.xz = mat2(co, -s, s, co) * p.xz;
        }

        if (uJuliaMode > 0.5) p += c.xyz;

        z.xyz = p;
        trap = min(trap, length(p));
    }`,loopBody:"formula_Claude(z, dr, trap, c);",loopInit:"Claude_precalc();"},parameters:[{label:"Scale",id:"paramA",min:.5,max:3.5,step:.001,default:2},{label:"Harmonic",id:"paramB",min:-3.14,max:3.14,step:.001,default:.61},{label:"Inner R²",id:"paramC",min:.001,max:1.5,step:.001,default:.25},{label:"Fix R²",id:"paramD",min:.1,max:2.5,step:.001,default:1},{label:"Offset",id:"vec3A",type:"vec3",min:-3,max:3,step:.001,default:{x:1,y:1,z:1}},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"Claude",features:{coreMath:{iterations:12,paramA:2,paramB:.61,paramC:.25,paramD:1,paramF:0,vec3A:{x:1,y:1,z:1},vec3B:{x:0,y:0,z:0}},coloring:{mode:0,repeats:1,phase:.12,scale:7.8,offset:1.4,bias:1.3,twist:0,escape:2.5,mode2:4,repeats2:2,phase2:.1,blendMode:2,blendOpacity:.25,twist2:0,layer3Color:"#ffffff",layer3Scale:60,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0,gradient:[{id:"cl_0",position:0,color:"#1B0A0F",bias:.5,interpolation:"linear"},{id:"cl_1",position:.13,color:"#4A1A0A",bias:.5,interpolation:"linear"},{id:"cl_2",position:.28,color:"#C4603A",bias:.5,interpolation:"linear"},{id:"cl_3",position:.42,color:"#E8A44A",bias:.5,interpolation:"linear"},{id:"cl_4",position:.56,color:"#F5E6D3",bias:.5,interpolation:"linear"},{id:"cl_5",position:.7,color:"#4A8B7A",bias:.5,interpolation:"linear"},{id:"cl_6",position:.85,color:"#2B3A5A",bias:.5,interpolation:"linear"},{id:"cl_7",position:1,color:"#0F0A1B",bias:.5,interpolation:"linear"}],gradient2:[{id:"cl2_0",position:0,color:"#F5E6D3",bias:.5,interpolation:"linear"},{id:"cl2_1",position:.5,color:"#C4603A",bias:.5,interpolation:"linear"},{id:"cl2_2",position:1,color:"#1B0A0F",bias:.5,interpolation:"linear"}]},ao:{aoIntensity:.38,aoSpread:.12,aoSamples:5,aoEnabled:!0,aoMode:!1},atmosphere:{fogNear:0,fogFar:12,fogColor:"#000000",fogDensity:0,glowIntensity:.004,glowSharpness:4.5,glowColor:"#E8A44A",glowMode:!1},materials:{diffuse:1.15,reflection:.12,specular:1.1,roughness:.32,rim:.18,rimExponent:4.5,envStrength:.45,envBackgroundStrength:.22,envSource:1,useEnvMap:!1,envRotation:0,emission:0,emissionMode:0,emissionColor:"#ffffff",envGradientStops:[{id:"env_0",position:0,color:"#0A0E1B",bias:.5,interpolation:"linear"},{id:"env_1",position:.3,color:"#3A2A1B",bias:.5,interpolation:"linear"},{id:"env_2",position:.5,color:"#C4A87A",bias:.5,interpolation:"linear"},{id:"env_3",position:.72,color:"#7AACCC",bias:.5,interpolation:"linear"},{id:"env_4",position:1,color:"#B4D4E8",bias:.5,interpolation:"linear"}]},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1},lighting:{advancedLighting:!0,ptEnabled:!0,shadows:!0,shadowSoftness:28,shadowIntensity:1,shadowBias:.001},quality:{detail:3,fudgeFactor:.7,pixelThreshold:.3,maxSteps:400,distanceMetric:1,estimator:0},optics:{camFov:40,dofStrength:0,dofFocus:2.5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.18,y:-.42,z:-.08,w:.89},cameraFov:40,sceneOffset:{x:1,y:1,z:1,xL:0,yL:0,zL:0},targetDistance:3.8,cameraMode:"Orbit",lights:[{type:"Point",position:{x:-.8,y:3.2,z:3.5},rotation:{x:0,y:0,z:0},color:"#FFE4CC",intensity:6,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:3.5,y:-.5,z:1.5},rotation:{x:0,y:0,z:0},color:"#4A8BCC",intensity:2.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!1},{type:"Point",position:{x:1,y:1,z:-2},rotation:{x:0,y:0,z:0},color:"#C4603A",intensity:1.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},Td=[Gr,fi,Kr,Jr,mi,hi,pi,Wr,ti,qr,di,xi,Xr,ei,ci,yi,Vr,Ur,Yr,Zr,ui,Qr,si,ai,oi,ri,ii,ni,gi,li];Td.forEach(e=>ge.register(e));ge.registerAlias("UberMenger","MengerAdvanced");ge.registerAlias("FoldingBrot","BoxBulb");ge.registerAlias("HyperTorus","Mandelorus");ge.registerAlias("HyperbolicMandelbrot","MandelBolic");const Rd=[{name:"Featured Fractals",match:[Gr.id,fi.id,Kr.id,Wr.id,ti.id,qr.id,Xr.id,ei.id,ci.id,yi.id]},{name:"Geometric & Folding",match:[di.id,xi.id,Jr.id,Yr.id,Zr.id,oi.id,ai.id]},{name:"Hybrids & Experiments",match:[mi.id,hi.id,pi.id,ui.id,Qr.id,si.id,ri.id,ii.id,ni.id,Vr.id,Ur.id,gi.id]},{name:"Systems",match:[li.id]}],Id=ze.memo(({id:e,label:o})=>{const[a,r]=S.useState(!1),[n,s]=S.useState(!1),i=S.useRef(null);return S.useEffect(()=>{const l=i.current;if(!l)return;const c=new IntersectionObserver(d=>{d[0].isIntersecting&&(r(!0),c.disconnect())},{rootMargin:"50px"});return c.observe(l),()=>c.disconnect()},[]),n?null:t.jsx("div",{ref:i,className:"w-full h-full",children:a&&t.jsx("img",{src:`thumbnails/fractal_${e}.jpg`,alt:o,className:"w-full h-full object-cover",onError:()=>s(!0),loading:"lazy"})})}),Fd=({rect:e,onClose:o,onSelect:a,currentValue:r,onImport:n,showImport:s,onImportFragmentarium:i})=>{var k;const[l,c]=S.useState(null),[d,u]=S.useState({opacity:0,pointerEvents:"none"}),[f,p]=S.useState({}),[m,x]=S.useState(!1),[C,y]=S.useState([]),[b,g]=S.useState(!1),[h,v]=S.useState(!1),[z,M]=S.useState(new Set);S.useEffect(()=>{(async()=>{g(!0);try{const I=await fetch("/gmf/gallery.json");if(I.ok){const _=await I.json();y(_.categories||[])}}catch(I){console.warn("Failed to load gallery:",I)}finally{g(!1)}})()},[]);const w=async P=>{try{const I=await fetch(P.path);if(I.ok){const _=await I.text();Z.emit(fe.IS_COMPILING,"Compiling Formula...");const F=Br(_);ge.register(F),Z.emit(fe.REGISTER_FORMULA,{id:F.id,shader:F.shader}),a(F.id),o()}else console.error("Failed to load formula from gallery:",P.path),alert(`Failed to load formula: ${P.name}`)}catch(I){console.error("Error loading gallery formula:",I),Z.emit(fe.IS_COMPILING,!1),alert(`Error loading formula: ${P.name}`)}},j=S.useMemo(()=>{const P=ge.getAll(),I=new Set(P.map(F=>F.id)),_=[];for(const F of Rd){const A=F.match.filter(N=>I.has(N)?(I.delete(N),!0):!1);A.length>0&&_.push({name:F.name,items:A})}return I.size>0&&_.push({name:"Custom / Imported",items:Array.from(I)}),_},[]);return S.useLayoutEffect(()=>{const P=window.innerHeight,I=window.innerWidth,_=12,F=340,A=I<768;x(A);let N=e.left;N+F>I-_&&(N=I-F-_),N=Math.max(_,N);const R=P-e.bottom,X=e.top,L=R<300&&X>R;let $=L?X-_:R-_;const q=Math.min(600,Math.max(150,$)),H={position:"fixed",left:`${N}px`,width:`${F}px`,maxHeight:`${q}px`,maxWidth:`calc(100vw - ${_*2}px)`,zIndex:9999,display:"flex",flexDirection:"column",opacity:1,pointerEvents:"auto"},G=L?{bottom:`${P-e.top+4}px`,top:"auto",transformOrigin:"bottom left"}:{top:`${e.bottom+4}px`,bottom:"auto",transformOrigin:"top left"};u({...H,...G}),A||(I-(N+F)>260+20?p({left:"100%",marginLeft:"10px",top:L?"auto":0,bottom:L?0:"auto"}):p({right:"100%",marginRight:"10px",top:L?"auto":0,bottom:L?0:"auto"}))},[e]),S.useEffect(()=>{const P=()=>o(),I=F=>{F.target.closest(".portal-dropdown-content")||o()},_=F=>{F.target.closest(".portal-dropdown-content")||o()};return window.addEventListener("resize",P),window.addEventListener("mousedown",I,!0),window.addEventListener("wheel",_,!0),()=>{window.removeEventListener("resize",P),window.removeEventListener("mousedown",I,!0),window.removeEventListener("wheel",_,!0)}},[o]),jt.createPortal(t.jsxs("div",{style:d,children:[t.jsxs("div",{className:"portal-dropdown-content bg-[#121212] border border-white/10 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-y-auto custom-scroll animate-fade-in-down w-full flex-1",onMouseLeave:()=>c(null),children:[s&&t.jsxs("div",{className:"p-1 border-b border-white/5 sticky top-0 bg-[#121212] z-50 space-y-1",children:[t.jsxs("button",{onClick:()=>{n(),o()},className:"w-full flex items-center justify-center gap-2 px-3 py-2 bg-cyan-900/20 hover:bg-cyan-900/40 text-cyan-400 text-[10px] font-bold rounded border border-cyan-500/20 hover:border-cyan-500/50 transition-colors",children:[t.jsx(vr,{}),"Import Formula (.GMF)"]}),t.jsxs("button",{onClick:()=>{i(),o()},className:"w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-900/20 hover:bg-purple-900/40 text-purple-400 text-[10px] font-bold rounded border border-purple-500/20 hover:border-purple-500/50 transition-colors",children:[t.jsx(aa,{}),"Formula Workshop"]})]}),j.map(P=>t.jsxs("div",{className:"py-1",children:[t.jsx("div",{className:`px-3 py-1.5 text-[9px] font-bold text-gray-500 bg-[#121212] border-y border-white/5 sticky z-40 shadow-sm ${s?"top-[38px]":"top-0"}`,children:P.name}),P.items.map(I=>{const _=I==="Modular",F=ge.get(I),A=F?F.name:I,N=r===I;return t.jsxs("button",{onClick:()=>a(I),onMouseEnter:()=>c(I),className:`w-full text-left px-3 py-2.5 transition-all flex gap-3 group relative border-b border-white/5 last:border-b-0 ${N?"bg-cyan-900/20":"hover:bg-white/5"}`,children:[t.jsxs("div",{className:"w-16 h-10 shrink-0 bg-black rounded border border-white/10 overflow-hidden relative group-hover:border-cyan-500/50 transition-colors",children:[t.jsx("div",{className:"absolute inset-0 flex items-center justify-center text-gray-800 bg-gray-900 z-0",children:_?t.jsx(zr,{}):t.jsx(fa,{})}),!_&&t.jsx("div",{className:"relative z-10 w-full h-full",children:t.jsx(Id,{id:I,label:A})}),N&&t.jsx("div",{className:"absolute inset-0 z-20 bg-cyan-500/20 flex items-center justify-center",children:t.jsx("div",{className:"w-4 h-4 bg-white rounded-full flex items-center justify-center text-cyan-900 shadow-lg",children:t.jsx(pt,{})})})]}),t.jsxs("div",{className:"flex flex-col min-w-0 flex-1 justify-center",children:[t.jsx("div",{className:"flex items-center gap-2 mb-0.5",children:t.jsx("span",{className:`text-[11px] font-bold tracking-tight truncate ${N?"text-cyan-400":"text-gray-200 group-hover:text-white"} ${_?"text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300 font-bold":""}`,children:A})}),(F==null?void 0:F.shortDescription)&&t.jsx("p",{className:"text-[9px] text-gray-500 line-clamp-2 leading-tight group-hover:text-gray-400",children:F.shortDescription})]})]},I)})]},P.name)),C.length>0&&t.jsxs("div",{className:"py-1 border-t border-white/10",children:[t.jsx("div",{className:"px-3 py-1.5 text-[9px] font-bold text-gray-500 bg-[#121212] sticky z-40 shadow-sm top-[38px]",children:"Add from Gallery"}),C.map(P=>t.jsxs("div",{className:"border-b border-white/5",children:[t.jsxs("button",{onClick:()=>{M(I=>{const _=new Set(I);return _.has(P.id)?_.delete(P.id):_.add(P.id),_})},className:"w-full text-left px-3 py-2 flex items-center gap-2 group hover:bg-white/5 transition-colors",children:[t.jsx("span",{className:`w-3 h-3 text-gray-500 transition-transform ${z.has(P.id)?"rotate-180":""}`,children:t.jsx(Pt,{})}),t.jsx("span",{className:"text-[11px] font-bold text-purple-400 group-hover:text-purple-300",children:P.name}),t.jsxs("span",{className:"text-[9px] text-gray-600",children:["(",P.items.length," formulas)"]})]}),z.has(P.id)&&t.jsx("div",{className:"bg-black/30",children:P.items.map(I=>t.jsxs("button",{onClick:()=>w(I),onMouseEnter:()=>c(I.id),className:"w-full text-left px-6 py-2 transition-all flex gap-3 group hover:bg-white/5",children:[t.jsx("div",{className:"w-16 h-8 shrink-0 bg-black rounded border border-white/10 overflow-hidden relative group-hover:border-purple-500/50 transition-colors",children:t.jsx("div",{className:"absolute inset-0 flex items-center justify-center text-gray-800 bg-gray-900 z-0",children:t.jsx(Na,{})})}),t.jsx("div",{className:"flex flex-col min-w-0 flex-1 justify-center",children:t.jsx("span",{className:"text-[11px] font-bold tracking-tight truncate text-gray-200 group-hover:text-white",children:I.name})})]},I.id))})]},P.id))]}),b&&t.jsx("div",{className:"py-2 text-center text-[10px] text-gray-500",children:"Loading gallery..."})]}),l&&l!=="Modular"&&!m&&t.jsxs("div",{className:"absolute w-[256px] h-[256px] bg-black border border-cyan-500/50 rounded-lg shadow-[0_0_50px_rgba(0,0,0,1),0_0_20px_rgba(34,211,238,0.2)] overflow-hidden animate-fade-in pointer-events-none z-[10000]",style:f,children:[t.jsx("img",{src:`thumbnails/fractal_${l}.jpg`,className:"w-full h-full object-cover",alt:"Preview",onError:P=>P.currentTarget.parentElement.style.display="none"}),t.jsx("div",{className:"absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,4px_100%] pointer-events-none"}),t.jsx("div",{className:"absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4",children:t.jsx("div",{className:"text-[10px] font-bold text-cyan-400 drop-shadow-md",children:((k=ge.get(l))==null?void 0:k.name)||l})})]})]}),document.body)},_d=({value:e,onChange:o})=>{var M;const[a,r]=S.useState(!1),n=E(w=>w.openWorkshop),s=S.useRef(null),i=S.useRef(null),[l,c]=S.useState(null),d=E(w=>w.openContextMenu),u=E(w=>w.setExportIncludeScene),f=E(w=>w.exportIncludeScene),p=E(w=>w.advancedMode),m=w=>{w.preventDefault(),w.stopPropagation();const j=Hr();d(w.clientX,w.clientY,j,[])},x=()=>{!a&&s.current?(c(s.current.getBoundingClientRect()),r(!0)):r(!1)},C=w=>{const j=ge.get(e);if(!j)return;const k=E.getState().getPreset({includeScene:w}),P=zd(j,k),I=new Blob([P],{type:"text/plain"}),_=URL.createObjectURL(I),F=document.createElement("a");F.href=_,F.download=`${j.id}${w?"_Full":""}.gmf`,F.click(),URL.revokeObjectURL(_)},y=w=>{w.stopPropagation(),C(f)},b=w=>{w.preventDefault(),w.stopPropagation();const j=[{label:"Export Options",action:()=>{},isHeader:!0},{label:"Include Scene Data",checked:f,action:()=>u(!f)},{label:"Actions",action:()=>{},isHeader:!0},{label:"Export Formula Only",action:()=>C(!1)},{label:"Export Full Package",action:()=>C(!0)}];d(w.clientX,w.clientY,j,[])},g=w=>{var P;const j=(P=w.target.files)==null?void 0:P[0];if(!j)return;const k=new FileReader;k.onload=I=>{var _;try{const F=(_=I.target)==null?void 0:_.result;Z.emit(fe.IS_COMPILING,"Compiling Formula...");const A=Br(F);ge.register(A),Z.emit(fe.REGISTER_FORMULA,{id:A.id,shader:A.shader}),o(A.id),i.current&&(i.current.value="")}catch(F){console.error("Failed to import formula:",F),Z.emit(fe.IS_COMPILING,!1),alert("Invalid formula file. Ensure it is a valid .gmf or .json definition.")}},k.readAsText(j)},h=ge.get(e),v=h?h.name:e,z=e==="Modular";return t.jsxs("div",{className:"flex gap-2",children:[t.jsx("input",{ref:i,type:"file",accept:".json,.gmf",className:"hidden",onChange:g}),t.jsxs("button",{ref:s,onClick:x,onContextMenu:m,className:`flex-1 flex items-center justify-between border text-xs text-white rounded-lg p-2.5 outline-none transition-all group ${a?"bg-gray-900 border-cyan-500 ring-1 ring-cyan-900":z?"bg-gray-900 border-purple-500/50 shadow-[inset_0_0_10px_rgba(168,85,247,0.1)]":"bg-gradient-to-t from-white/[0.06] to-white/[0.03] border-white/10 hover:border-white/20 shadow-[inset_0_-1px_0_rgba(255,255,255,0.04)]"}`,children:[t.jsxs("div",{className:"flex items-center gap-2",children:[z&&t.jsx("span",{className:"flex w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_5px_#a855f7]"}),t.jsx("span",{className:`font-bold ${z?"text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300":""}`,children:v})]}),t.jsx("div",{className:`w-3 h-3 text-gray-500 transition-transform ${a?"rotate-180":""}`,children:t.jsx(Pt,{})})]}),!z&&p&&t.jsx("button",{onClick:y,onContextMenu:b,className:"w-8 flex items-center justify-center bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.08] text-gray-400 hover:text-white rounded-lg transition-colors",title:f?"Export Full Preset (Right-click for options)":"Export Formula Only (Right-click for options)",children:t.jsx(wr,{})}),((M=ge.get(e))==null?void 0:M.importSource)&&t.jsx("button",{onClick:()=>n(e),className:"w-8 flex items-center justify-center bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.08] text-gray-400 hover:text-white rounded-lg transition-colors",title:"Re-edit imported formula in Workshop",children:t.jsx(aa,{})}),a&&l&&t.jsx(Fd,{rect:l,currentValue:e,onClose:()=>r(!1),onSelect:w=>{o(w),r(!1)},onImport:()=>{var w;return(w=i.current)==null?void 0:w.click()},showImport:p,onImportFragmentarium:()=>n(void 0)})]})},Dd=({shape:e,period:o,phase:a,amplitude:r,enabled:n})=>{const s=S.useRef(null);return S.useEffect(()=>{const i=s.current;if(!i)return;const l=i.getContext("2d");if(!l)return;const c=i.width,d=i.height;if(l.clearRect(0,0,c,d),l.strokeStyle="#222",l.lineWidth=1,l.beginPath(),l.moveTo(0,d/2),l.lineTo(c,d/2),l.stroke(),!n)return;l.strokeStyle="#8b5cf6",l.lineWidth=2,l.beginPath();const u=120,f=5;for(let p=0;p<=u;p++){const m=p/u,x=(m*f/o+a)%1;let C=0;e==="Sine"?C=Math.sin(x*Math.PI*2):e==="Triangle"?C=1-Math.abs(x*2-1)*2:e==="Sawtooth"?C=x*2-1:e==="Pulse"?C=x<.5?1:-1:e==="Noise"&&(C=Math.sin(x*50)*Math.cos(x*12));const y=d/2-C*Math.min(1.5,r)*(d/4);p===0?l.moveTo(m*c,y):l.lineTo(m*c,y)}l.stroke()},[e,o,a,r,n]),t.jsxs("div",{className:"relative h-12 bg-black/40 rounded border border-white/5 mb-3 overflow-hidden",children:[t.jsx("canvas",{ref:s,width:280,height:48,className:"w-full h-full"}),t.jsx("div",{className:"absolute top-1 left-2 text-[7px] font-bold text-purple-400/50 pointer-events-none",children:"Signal (5 second window)"})]})},Ld=({state:e,actions:o})=>{const a=()=>{if(e.animations.length>=3)return;const i={id:Qe(),enabled:!0,target:"coreMath.paramA",shape:"Sine",period:5,amplitude:1,baseValue:e.coreMath.paramA,phase:0,smoothing:.5};o.setAnimations([...e.animations,i])},r=i=>{o.setAnimations(e.animations.filter(l=>l.id!==i))},n=(i,l)=>{o.setAnimations(e.animations.map(c=>c.id===i?{...c,...l}:c))},s=e.animations.some(i=>i.enabled);return t.jsxs("div",{className:`flex flex-col border-t border-white/5 ${s?"bg-purple-900/10":"bg-white/[0.02]"}`,"data-help-id":"lfo.system",children:[t.jsxs("div",{className:`flex items-center justify-between px-3 py-2 border-b ${s?"border-purple-500/20":"border-white/5"}`,children:[t.jsx("label",{className:`text-[10px] font-bold ${s?"text-purple-300":"text-gray-500"}`,children:"LFO Modulators"}),t.jsx("button",{onClick:a,disabled:e.animations.length>=3,className:`w-5 h-5 flex items-center justify-center rounded border disabled:opacity-30 transition-all ${s?"bg-purple-500/20 border-purple-500/50 text-purple-300 hover:bg-purple-500 hover:text-white":"bg-white/10 border-white/10 text-gray-400 hover:bg-white/20 hover:text-white"}`,title:"Add LFO (Max 3)",children:t.jsx(ua,{})})]}),t.jsx("div",{className:"space-y-1 p-2",children:e.animations.map((i,l)=>t.jsxs("div",{className:`bg-black/40 rounded border border-purple-500/10 animate-fade-in relative transition-all ${i.enabled,"p-2"}`,children:[t.jsxs("div",{className:"flex items-center justify-between mb-2 min-h-[26px]",children:[t.jsxs("span",{className:"text-[9px] font-bold text-purple-400/50",children:["LFO ",l+1]}),t.jsxs("div",{className:"flex items-center gap-3",children:[t.jsx("button",{onClick:()=>r(i.id),className:"text-red-500 hover:text-white transition-colors opacity-50 hover:opacity-100",title:"Delete LFO",children:t.jsx(St,{})}),t.jsx("div",{className:"w-[60px]",children:t.jsx(Le,{value:i.enabled,onChange:c=>n(i.id,{enabled:c}),color:"bg-purple-600"})})]})]}),i.enabled&&t.jsxs("div",{className:"animate-fade-in",children:[t.jsx(Dd,{...i}),t.jsxs("div",{className:"grid grid-cols-2 gap-1 mb-1",children:[t.jsxs("div",{children:[t.jsx("label",{className:"text-[9px] text-gray-500 font-bold block mb-0.5",children:"Target"}),t.jsx(Nr,{value:i.target,onChange:c=>{let d=0;if(c.includes(".")){const[u,f]=c.split("."),p=e[u],m=f.match(/^(vec[23][ABC])_(x|y|z)$/);if(m&&p){const x=m[1],C=m[2],y=p[x];y&&typeof y=="object"&&(d=y[C]||0)}else p&&p[f]!==void 0&&(d=p[f])}n(i.id,{target:c,baseValue:d})},className:"w-full"})]}),t.jsxs("div",{children:[t.jsx("label",{className:"text-[9px] text-gray-500 font-bold block mb-0.5",children:"Shape"}),t.jsxs("select",{value:i.shape,onChange:c=>n(i.id,{shape:c.target.value}),className:"t-select text-white focus:border-purple-500",children:[t.jsx("option",{value:"Sine",children:"Sine"}),t.jsx("option",{value:"Triangle",children:"Triangle"}),t.jsx("option",{value:"Sawtooth",children:"Sawtooth"}),t.jsx("option",{value:"Pulse",children:"Pulse"}),t.jsx("option",{value:"Noise",children:"Noise"})]})]})]}),t.jsxs("div",{className:"space-y-0",children:[t.jsx(de,{label:"Period (Sec)",value:i.period,min:.1,max:30,step:.1,hardMin:.01,onChange:c=>n(i.id,{period:c})}),t.jsx(de,{label:"Strength",value:i.amplitude,min:.001,max:10,step:.001,onChange:c=>n(i.id,{amplitude:c}),customMapping:{min:0,max:100,toSlider:c=>(Math.log10(Math.max(.001,c))+3)/4*100,fromSlider:c=>Math.pow(10,c/100*4-3)},overrideInputText:i.amplitude<.1?i.amplitude.toFixed(3):i.amplitude.toFixed(2)}),e.advancedMode&&t.jsx(de,{label:"Phase Offset",value:i.phase,min:0,max:1,step:.01,onChange:c=>n(i.id,{phase:c}),customMapping:{min:0,max:360,toSlider:c=>c*360,fromSlider:c=>c/360},mapTextInput:!0,overrideInputText:`${(i.phase*360).toFixed(0)}°`}),t.jsx(de,{label:"Smoothing",value:i.smoothing,min:0,max:1,step:.01,onChange:c=>n(i.id,{smoothing:c})})]})]})]},i.id))})]})},Qo=ue(),Ed=({state:e})=>{const[o,a]=S.useState({}),r=e.geometry,n=r.hybridMode,s=r.hybridCompiled,i=S.useMemo(()=>({...r,...o,hybridCompiled:!0,hybridMode:!0}),[r,o]),l=Object.keys(o).length>0,c=n&&(!s||l),d=S.useCallback(p=>{E.getState().setGeometry({hybridMode:p})},[]),u=S.useCallback((p,m)=>{a(x=>{const C={...x,[p]:m};return r[p]===m&&delete C[p],C})},[r]),f=S.useCallback(()=>{Z.emit("is_compiling","Compiling Hybrid Shader..."),setTimeout(()=>{const p={...o};s||(p.hybridCompiled=!0),E.getState().setGeometry(p),a({})},50)},[o,s]);return t.jsxs("div",{className:"border-t border-white/5","data-help-id":"hybrid.mode",children:[t.jsxs("div",{className:`flex items-center justify-between px-3 py-1 select-none ${n?"":"cursor-pointer hover:bg-white/5"}`,onClick:n?void 0:()=>d(!0),children:[t.jsxs("div",{className:"flex items-center gap-1.5",children:[t.jsx(Me,{color:n?"text-gray-300":"text-gray-600",children:"Hybrid Box Fold"}),!n&&t.jsx(Me,{variant:"tiny",className:"ml-1",children:"off"}),n&&s&&!l&&t.jsx(ia,{status:"active"}),n&&c&&t.jsx(ia,{status:"pending"})]}),t.jsx("div",{className:"w-10",onClick:p=>p.stopPropagation(),children:t.jsx(Le,{value:n,onChange:d})})]}),n&&t.jsxs("div",{className:"pb-1",children:[t.jsx(Bt,{label:"Compile Settings",defaultOpen:!1,children:t.jsxs("div",{className:"ml-1 px-1",children:[t.jsx(ne,{featureId:"geometry",whitelistParams:["hybridFoldType","hybridComplex","hybridSwap","hybridPermute"],forcedState:i,onChangeOverride:u}),c&&t.jsxs("div",{className:"flex items-center justify-between px-2 py-1 mt-1 bg-amber-900/20 border border-amber-500/20 rounded",children:[t.jsxs("div",{className:"flex items-center gap-1.5 text-amber-400",children:[t.jsx(Tt,{}),t.jsx(Me,{variant:"secondary",color:"text-amber-400",children:s?"Settings changed":"Not compiled"})]}),t.jsx("button",{onClick:f,className:"px-3 py-0.5 bg-amber-600 hover:bg-amber-500 text-black text-[9px] font-bold rounded transition-colors",children:s?"Recompile":"Compile"})]})]})}),s&&t.jsx(Bt,{label:"Parameters",defaultOpen:!0,children:t.jsx("div",{className:"ml-1 px-1",children:t.jsx(ne,{featureId:"geometry",groupFilter:"hybrid",excludeParams:["hybridMode"]})})})]})]})},Ad=({state:e,actions:o,onSwitchTab:a})=>{var g;const r=E(h=>h.openContextMenu),[n,s]=S.useState(null),{isRecording:i,currentFrame:l,addKeyframe:c,addTrack:d,sequence:u}=le();S.useEffect(()=>{const h=Z.on("compile_time",v=>{s(`Loaded in ${v.toFixed(2)}s`),setTimeout(()=>s(null),5e3)});return Qo.lastCompileDuration>0&&(s(`Loaded in ${Qo.lastCompileDuration.toFixed(2)}s`),setTimeout(()=>s(null),3e3)),h},[]),e.debugMobileLayout||typeof window<"u"&&window.innerWidth<768;const f=e.coreMath;if(!f||!e.formula)return null;const p=(h,v)=>{i&&Object.entries(v).forEach(([z,M])=>{const w=`${h}.${z}`;if(!u.tracks[w]){let j=z;z==="juliaX"?j="Julia X":z==="juliaY"?j="Julia Y":z==="juliaZ"?j="Julia Z":z==="hybridScale"&&(j="Box Scale"),d(w,j)}c(w,l,M)})},m=h=>{h.preventDefault(),h.stopPropagation();const v=Ee(h.target);if(e.formula){const M=`formula.${e.formula.toLowerCase()}`;v.includes(M)||v.unshift(M)}const z=Hr();r(h.clientX,h.clientY,z,v)},C=(()=>{if(e.formula==="Modular"){const v=["ParamA","ParamB","ParamC","ParamD","ParamE","ParamF"],z={};return e.pipeline.forEach(M=>{if(!M.enabled||!M.bindings)return;const w=be.get(M.type);Object.entries(M.bindings).forEach(([j,k])=>{if(k&&v.includes(k)){z[k]||(z[k]={labels:[],min:-5,max:5,step:.01});const P=w==null?void 0:w.inputs.find(I=>I.id===j);P?z[k].labels.push(`${M.type}: ${P.label}`):z[k].labels.push(`${M.type}: ${j}`)}})}),v.map(M=>{const w=z[M],j=M.charAt(0).toLowerCase()+M.slice(1);if(!w)return null;const k=w.labels.length>1?`${M} (Mixed)`:w.labels[0]||M;let P=0,I=_=>{};switch(j){case"paramA":P=f.paramA,I=_=>o.setCoreMath({paramA:_});break;case"paramB":P=f.paramB,I=_=>o.setCoreMath({paramB:_});break;case"paramC":P=f.paramC,I=_=>o.setCoreMath({paramC:_});break;case"paramD":P=f.paramD,I=_=>o.setCoreMath({paramD:_});break;case"paramE":P=f.paramE,I=_=>o.setCoreMath({paramE:_});break;case"paramF":P=f.paramF,I=_=>o.setCoreMath({paramF:_});break}return{label:k,val:P,set:I,min:-5,max:5,step:.01,def:0,id:j,trackId:`coreMath.${j}`,scale:"linear"}})}const h=ge.get(e.formula);return h?h.parameters.map(v=>{if(!v)return null;if(v.type==="vec3"){let w=f.vec3A,j=k=>o.setCoreMath({vec3A:k});switch(v.id){case"vec3A":w=f.vec3A,j=k=>o.setCoreMath({vec3A:k});break;case"vec3B":w=f.vec3B,j=k=>o.setCoreMath({vec3B:k});break;case"vec3C":w=f.vec3C,j=k=>o.setCoreMath({vec3C:k});break}return{label:v.label,val:w,set:j,min:v.min,max:v.max,step:v.step,def:v.default,id:v.id,trackId:`coreMath.${v.id}`,type:"vec3",mode:v.mode,linkable:v.linkable,scale:v.scale}}if(v.type==="vec2"){let w=f.vec2A,j=k=>o.setCoreMath({vec2A:k});switch(v.id){case"vec2A":w=f.vec2A,j=k=>o.setCoreMath({vec2A:k});break;case"vec2B":w=f.vec2B,j=k=>o.setCoreMath({vec2B:k});break;case"vec2C":w=f.vec2C,j=k=>o.setCoreMath({vec2C:k});break}return{label:v.label,val:w,set:j,min:v.min,max:v.max,step:v.step,def:v.default,id:v.id,trackId:`coreMath.${v.id}`,type:"vec2",mode:v.mode,linkable:v.linkable,scale:v.scale}}let z=0,M=w=>{};switch(v.id){case"paramA":z=f.paramA,M=w=>o.setCoreMath({paramA:w});break;case"paramB":z=f.paramB,M=w=>o.setCoreMath({paramB:w});break;case"paramC":z=f.paramC,M=w=>o.setCoreMath({paramC:w});break;case"paramD":z=f.paramD,M=w=>o.setCoreMath({paramD:w});break;case"paramE":z=f.paramE,M=w=>o.setCoreMath({paramE:w});break;case"paramF":z=f.paramF,M=w=>o.setCoreMath({paramF:w});break}return{label:v.label,val:z,set:M,min:v.min,max:v.max,step:v.step,def:v.default,id:v.id,trackId:`coreMath.${v.id}`,scale:v.scale,options:v.options}}):[{label:"Power (N)",val:f.paramA,set:v=>o.setCoreMath({paramA:v}),min:2,max:16,step:.001,def:8,id:"paramA",trackId:"coreMath.paramA"},null,null,null]})(),y=h=>{if(!h)return null;if(h.type==="vec3"){const w=h.val,j=new U(w.x,w.y,w.z),k=[`${h.trackId}_x`,`${h.trackId}_y`,`${h.trackId}_z`],P=[`${h.label} X`,`${h.label} Y`,`${h.label} Z`],I=h.mode||"normal",_=I==="rotation"||I==="direction"||I==="axes",F={rotation:["Azimuth","Pitch","Angle"],direction:["Azimuth","Pitch","Length"],axes:[`${h.label} X`,`${h.label} Y`,`${h.label} Z`]};return t.jsx("div",{className:"mb-px",children:t.jsx(vt,{label:h.label,value:j,min:_?-Math.PI*2:h.min,max:_?Math.PI*2:h.max,step:h.step,onChange:h.set,trackKeys:k,trackLabels:_&&F[I]||P,mode:I==="axes"?"normal":I,defaultValue:h.def?new U(h.def.x??0,h.def.y??0,h.def.z??0):void 0,linkable:h.linkable,scale:h.scale})},h.id)}if(h.type==="vec2"){const w=h.val,j=[`${h.trackId}_x`,`${h.trackId}_y`],k=[`${h.label} X`,`${h.label} Y`];return t.jsx("div",{className:"mb-px",children:t.jsx(Rr,{label:h.label,value:new je(w.x,w.y),min:h.min,max:h.max,step:h.step,onChange:P=>h.set({x:P.x,y:P.y}),trackKeys:j,trackLabels:k,defaultValue:h.def?new je(h.def.x??0,h.def.y??0):void 0,linkable:h.linkable,mode:h.mode,scale:h.scale})},h.id)}const v=h.val;if(h.options)return t.jsx("div",{className:"mb-px",children:t.jsx(kt,{label:h.label,value:v,options:h.options,onChange:w=>h.set(w),fullWidth:!0})},h.id);const z=e.liveModulations[h.trackId]??e.liveModulations[h.id],M=e.animations.some(w=>w.enabled&&(w.target===h.trackId||w.target===h.id));return h.scale==="pi"?t.jsx(de,{label:h.label,value:v,min:h.min,max:h.max,step:.01,onChange:h.set,defaultValue:h.def,highlight:M||h.id==="paramA"&&!M,trackId:h.trackId,liveValue:z,customMapping:{min:h.min/Math.PI,max:h.max/Math.PI,toSlider:w=>w/Math.PI,fromSlider:w=>w*Math.PI},mapTextInput:!0,overrideInputText:`${(v/Math.PI).toFixed(2)}π`},h.id):t.jsx(de,{label:h.label,value:v,min:h.min,max:h.max,step:h.step,onChange:h.set,defaultValue:h.def,highlight:M||h.id==="paramA"&&!M,trackId:h.trackId,liveValue:z},h.id)},b=h=>{o.setFormula(h),h==="Modular"&&a&&a("Graph")};return t.jsxs("div",{className:"animate-fade-in -mx-4 -mt-4 min-h-full",onContextMenu:m,children:[t.jsxs("div",{className:"bg-gray-800/20 border-b border-white/5 p-4 pb-3","data-help-id":"formula.active",children:[t.jsxs("div",{className:"flex justify-between items-baseline mb-1",children:[t.jsx(Me,{color:"text-gray-500",children:"Active Formula"}),n&&t.jsx("span",{className:"text-[9px] text-gray-500 animate-fade-in",children:n})]}),t.jsx(_d,{value:e.formula,onChange:b})]}),t.jsxs("div",{className:"flex flex-col","data-help-id":`panel.formula formula.${((g=e.formula)==null?void 0:g.toLowerCase())||"mandelbulb"}`,children:[t.jsx(de,{label:"Iterations",value:f.iterations,min:1,max:500,step:1,onChange:h=>o.setCoreMath({iterations:Math.round(h)}),highlight:!0,defaultValue:32,customMapping:{min:0,max:100,toSlider:h=>100*Math.pow((h-1)/499,1/3),fromSlider:h=>1+499*Math.pow(h/100,3)},mapTextInput:!1,trackId:"coreMath.iterations",liveValue:e.liveModulations["coreMath.iterations"]}),t.jsx(t.Fragment,{children:C.map(h=>y(h))})]}),t.jsx("div",{className:"bg-white/[0.06] h-1.5 rounded-b-lg"}),t.jsx("div",{className:"h-1"}),t.jsxs("div",{className:"border-t border-white/5","data-help-id":"formula.transform",children:[t.jsx(ne,{featureId:"geometry",groupFilter:"transform"}),e.geometry.preRotEnabled&&e.geometry.preRotMaster&&t.jsx("div",{className:"ml-2 mb-px",children:t.jsx(vt,{label:"Local Rotation",value:new U(e.geometry.preRotX,e.geometry.preRotY,e.geometry.preRotZ),min:-Math.PI,max:Math.PI,step:.01,onChange:h=>{const v=h;o.setGeometry({preRotX:v.x,preRotY:v.y,preRotZ:v.z}),p("geometry",{preRotX:v.x,preRotY:v.y,preRotZ:v.z})},scale:"pi",trackKeys:["geometry.preRotX","geometry.preRotY","geometry.preRotZ"],trackLabels:["Spin X","Spin Y","Spin Z"],defaultValue:new U(0,0,0)})})]}),t.jsxs("div",{className:"border-t border-white/5","data-help-id":"julia.mode",children:[t.jsx(ne,{featureId:"geometry",whitelistParams:["juliaMode"]}),e.geometry.juliaMode&&t.jsxs("div",{className:"ml-2 flex flex-col",children:[t.jsx("div",{className:"mb-px",children:t.jsx(vt,{label:"Julia Coordinate",value:new U(e.geometry.juliaX,e.geometry.juliaY,e.geometry.juliaZ),min:-2,max:2,step:.01,onChange:h=>{const v=h;o.setGeometry({juliaX:v.x,juliaY:v.y,juliaZ:v.z}),p("geometry",{juliaX:v.x,juliaY:v.y,juliaZ:v.z})},trackKeys:["geometry.juliaX","geometry.juliaY","geometry.juliaZ"],trackLabels:["Julia X","Julia Y","Julia Z"],defaultValue:new U(0,0,0)})}),t.jsxs("div",{className:"flex gap-px",children:[t.jsx("div",{className:"flex-1",children:t.jsx(ne,{featureId:"geometry",groupFilter:"julia",excludeParams:["juliaMode"]})}),t.jsx("button",{onClick:()=>{const h=E.getState();h.handleInteractionStart("param"),h.setGeometry({juliaX:h.geometry.juliaX+(Math.random()*2-1)*.5,juliaY:h.geometry.juliaY+(Math.random()*2-1)*.5,juliaZ:h.geometry.juliaZ+(Math.random()*2-1)*.5}),h.handleInteractionEnd()},className:"w-8 flex items-center justify-center bg-gray-900 border border-gray-700 hover:border-cyan-500/50 hover:bg-cyan-500/10 text-gray-400 hover:text-cyan-300 rounded transition-colors",title:"Randomize Julia coordinate",children:t.jsx(Cr,{})})]})]})]}),t.jsx(Ed,{state:e}),t.jsx(Ld,{state:e,actions:o}),e.showHints&&t.jsx("div",{className:"text-[9px] text-gray-600 text-center mt-6 pb-2 opacity-50 font-mono",children:"PRESS 'H' TO HIDE HINTS"})]})},Nd=({label:e,featureId:o,toggleParam:a,children:r,description:n})=>{var f;const s=E(),i=ie.get(o),l=a||((f=i==null?void 0:i.engineConfig)==null?void 0:f.toggleParam),c=s[o],d=l?!!(c!=null&&c[l]):!0,u=p=>{var C;const m=`set${o.charAt(0).toUpperCase()+o.slice(1)}`,x=s[m];x&&l&&(((C=i==null?void 0:i.engineConfig)==null?void 0:C.mode)==="compile"?(Z.emit("is_compiling","Updating Engine..."),setTimeout(()=>{x({[l]:p})},50)):x({[l]:p}))};return t.jsxs("div",{className:"flex flex-col border-t border-white/5",children:[t.jsxs("div",{className:`flex items-center justify-between px-3 py-1 ${d?"":"cursor-pointer hover:bg-white/5"}`,onClick:d?void 0:()=>u(!0),children:[t.jsxs("span",{className:`text-[10px] font-bold ${d?"text-gray-300":"text-gray-600"}`,children:[e,!d&&t.jsx("span",{className:"text-[8px] text-gray-600 ml-1.5",children:"off"})]}),t.jsx("div",{className:"w-10",children:t.jsx(Le,{value:d,onChange:u})})]}),d&&t.jsxs("div",{className:"px-1",children:[n&&t.jsx("p",{className:"px-3 pb-1 text-[9px] text-gray-500 leading-tight italic",children:n}),r]})]})},Bd=({state:e,actions:o})=>{const a=E(l=>l.openContextMenu),r=e.droste;e.colorGrading;const n=e.optics,s=e.waterPlane,i=l=>{const c=Ee(l.currentTarget);c.length>0&&(l.preventDefault(),l.stopPropagation(),a(l.clientX,l.clientY,[],c))};return t.jsxs("div",{className:"animate-fade-in -mx-4 -mt-4 flex flex-col",children:[e.advancedMode&&t.jsxs("div",{className:"flex flex-col","data-help-id":"panel.scene",children:[t.jsx("div",{className:"t-section-header",onContextMenu:i,"data-help-id":"panel.scene",children:t.jsx("h3",{className:"t-section-title",children:"Camera & Navigation"})}),t.jsx(ne,{featureId:"navigation",groupFilter:"controls"})]}),t.jsx("div",{className:"flex flex-col border-t border-white/5","data-help-id":"fog.settings",children:t.jsx(ne,{featureId:"atmosphere",groupFilter:"fog"})}),t.jsx("div",{className:"bg-white/[0.06] h-1.5 rounded-b-lg"}),t.jsx("div",{className:"h-1"}),t.jsx("div",{className:"flex flex-col",children:t.jsx(ne,{featureId:"volumetric"})}),s&&s.waterEnabled&&t.jsx("div",{className:"flex flex-col border-t border-white/5","data-help-id":"water.settings",children:t.jsxs(Nd,{label:"Water Plane",featureId:"waterPlane",description:"Infinite ocean plane at height Y.",children:[t.jsx("div",{className:"mb-2",children:t.jsx(ne,{featureId:"waterPlane",groupFilter:"main"})}),t.jsxs("div",{className:"bg-black/20 p-2 rounded border border-white/5 mb-2",children:[t.jsx(ne,{featureId:"waterPlane",groupFilter:"geometry"}),t.jsx(ne,{featureId:"waterPlane",groupFilter:"material"})]}),t.jsxs("div",{className:"bg-black/20 p-2 rounded border border-white/5",children:[t.jsx(Me,{variant:"secondary",className:"mb-2",children:"Waves"}),t.jsx(ne,{featureId:"waterPlane",groupFilter:"waves"})]})]})}),t.jsx("div",{className:"bg-white/[0.06] h-1.5 rounded-b-lg"}),t.jsx("div",{className:"h-1"}),t.jsx("div",{className:"flex flex-col","data-help-id":"dof.settings",children:n&&t.jsxs("div",{className:"flex flex-col",children:[t.jsx(ne,{featureId:"optics",groupFilter:"dof"}),t.jsx(ne,{featureId:"optics",groupFilter:"projection"})]})}),t.jsx("div",{className:"bg-white/[0.06] h-1.5 rounded-b-lg"}),t.jsx("div",{className:"h-1"}),t.jsx("div",{className:"flex flex-col","data-help-id":"scene.grading",children:t.jsx(ne,{featureId:"colorGrading",groupFilter:"grading"})}),t.jsx("div",{className:"bg-white/[0.06] h-1.5 rounded-b-lg"}),t.jsx("div",{className:"h-1"}),t.jsxs("div",{className:"flex flex-col","data-help-id":"post.effects",children:[t.jsx(ne,{featureId:"postEffects",groupFilter:"bloom"}),t.jsx(ne,{featureId:"postEffects",groupFilter:"lens"})]}),r&&t.jsxs(t.Fragment,{children:[t.jsx("div",{className:"bg-white/[0.06] h-1.5 rounded-b-lg"}),t.jsx("div",{className:"h-1"}),t.jsxs("div",{className:"flex flex-col","data-help-id":"effect.droste",children:[t.jsx(ne,{featureId:"droste",groupFilter:"main"}),r.active&&t.jsxs("div",{className:"animate-fade-in flex flex-col",children:[t.jsx(ne,{featureId:"droste",groupFilter:"geometry"}),t.jsx("div",{className:"bg-white/[0.06] h-1.5 rounded-b-lg"}),t.jsx("div",{className:"h-1"}),t.jsx(ne,{featureId:"droste",groupFilter:"structure"}),t.jsx(ne,{featureId:"droste",groupFilter:"transform"})]})]})]})]})},Ko=ue(),Od=({state:e,actions:o})=>{const[a,r]=S.useState(0),n=e.lighting,s=e.liveModulations;S.useEffect(()=>{a>=n.lights.length&&n.lights.length>0&&r(n.lights.length-1)},[n.lights.length,a]);const i=bt(n,a),l=E(g=>g.openContextMenu),c=g=>{const h=Ee(g.currentTarget);h.length>0&&(g.preventDefault(),g.stopPropagation(),l(g.clientX,g.clientY,[],h))},d=()=>{n.lights.length<Se&&(o.addLight(),r(n.lights.length))},u=g=>{g.stopPropagation(),n.lights.length>1&&(o.removeLight(a),r(Math.max(0,a-1)))},f=()=>{const g=bt(e.lighting,a),h=g.fixed,v=Ne();let z=g.position,M=g.rotation;if(v)if(g.type==="Point"){const w=Ko.sceneOffset;if(h){const j=new U(z.x,z.y,z.z);j.applyQuaternion(v.quaternion),j.add(v.position),z={x:j.x+w.x+(w.xL??0),y:j.y+w.y+(w.yL??0),z:j.z+w.z+(w.zL??0)}}else{const j=new U(z.x-w.x-(w.xL??0),z.y-w.y-(w.yL??0),z.z-w.z-(w.zL??0));j.sub(v.position),j.applyQuaternion(v.quaternion.clone().invert()),z={x:j.x,y:j.y,z:j.z}}}else{const w=new U(0,0,-1).applyEuler(new Pe(M.x,M.y,M.z,"YXZ"));w.applyQuaternion(h?v.quaternion:v.quaternion.clone().invert());const j=new Te().setFromUnitVectors(new U(0,0,-1),w),k=new Pe().setFromQuaternion(j,"YXZ");M={x:k.x,y:k.y,z:k.z}}o.updateLight({index:a,params:{fixed:!h,position:z,rotation:M}})},p=g=>{const h=Ne();if(!h){o.updateLight({index:a,params:{type:g}});return}const v=bt(e.lighting,a);let z=new U(0,0,0);if(!v.fixed){const M=new U(0,0,-1).applyQuaternion(h.quaternion);z.copy(h.position).addScaledVector(M,2);const w=Ko.sceneOffset;z.add(new U(w.x+w.xL,w.y+w.yL,w.z+w.zL))}if(g==="Directional"){const M=new U(v.position.x,v.position.y,v.position.z),w=new U().subVectors(z,M).normalize();w.lengthSq()<.001&&w.set(0,-1,0);const j=new Te().setFromUnitVectors(new U(0,0,-1),w),k=new Pe().setFromQuaternion(j,"YXZ");o.updateLight({index:a,params:{type:g,rotation:{x:k.x,y:k.y,z:k.z}}})}else{const M=new Te().setFromEuler(new Pe(v.rotation.x,v.rotation.y,v.rotation.z,"YXZ")),w=new U(0,0,-1).applyQuaternion(M),k=z.clone().sub(w.multiplyScalar(5));o.updateLight({index:a,params:{type:g,position:{x:k.x,y:k.y,z:k.z}}})}};if(!i)return null;const m=(i.fixed,10),x=`lighting.light${a}`,C={x:s[`${x}_rotX`]??i.rotation.x,y:s[`${x}_rotY`]??i.rotation.y,z:s[`${x}_rotZ`]??i.rotation.z},y={x:s[`${x}_posX`]??i.position.x,y:s[`${x}_posY`]??i.position.y,z:s[`${x}_posZ`]??i.position.z},b=new U(y.x,y.y,y.z);return t.jsxs("div",{className:"animate-fade-in",children:[t.jsx("div",{className:"mb-4",children:t.jsxs("div",{className:"flex flex-wrap gap-1 bg-black/40 p-1 rounded border border-white/5",children:[n.lights.map((g,h)=>t.jsxs("button",{onClick:()=>r(h),className:`flex-1 min-w-[60px] py-1.5 px-2 text-[9px] font-bold rounded border transition-all relative ${a===h?"bg-cyan-900/50 border-cyan-500/50 text-cyan-200 shadow-sm":"bg-transparent border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300"}`,children:["Light ",h+1,g.visible&&t.jsx("div",{className:"absolute top-1 right-1 w-1 h-1 rounded-full bg-cyan-400"})]},h)),n.lights.length<Se&&t.jsx("button",{onClick:d,className:"w-8 flex items-center justify-center text-gray-500 hover:text-cyan-400 hover:bg-white/5 rounded transition-colors",title:"Add Light",children:t.jsx(ua,{})})]})}),t.jsxs("div",{className:"mb-4 space-y-3","data-help-id":"panel.light",children:[t.jsxs("div",{className:"flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-white/5",children:[t.jsx(Le,{label:"Enabled",value:i.visible,onChange:()=>o.updateLight({index:a,params:{visible:!i.visible}}),color:"bg-green-500"}),n.lights.length>1&&t.jsx("button",{onClick:u,className:"p-1.5 text-red-500 hover:text-red-300 hover:bg-red-900/20 rounded ml-2 transition-colors",title:"Delete Light",children:t.jsx(St,{})})]}),t.jsxs("div",{className:`transition-opacity duration-200 ${i.visible?"opacity-100":"opacity-40 pointer-events-none"}`,children:[t.jsxs("div",{className:"mb-4 p-3 bg-gray-800/50 rounded-lg","data-help-id":"light.mode",onContextMenu:c,children:[t.jsx("div",{className:"flex gap-1 mb-2","data-help-id":"light.type",children:t.jsx(Le,{value:i.type,onChange:g=>p(g),options:[{label:"Point",value:"Point"},{label:"Directional (Sun)",value:"Directional"}]})}),t.jsx(Le,{label:"Attachment Mode",value:i.fixed,onChange:f,options:[{label:"Headlamp",value:!0},{label:"World",value:!1}],helpId:"light.mode"})]}),i.type==="Point"?t.jsx("div",{"data-help-id":"light.pos",children:t.jsx(vt,{label:i.fixed?"Offset XYZ":"World Position",value:b,onChange:g=>o.updateLight({index:a,params:{position:{x:g.x,y:g.y,z:g.z}}}),min:-m,max:m,step:.01,interactionMode:"param",trackKeys:[`lighting.light${a}_posX`,`lighting.light${a}_posY`,`lighting.light${a}_posZ`],trackLabels:[`Light ${a+1} Pos X`,`Light ${a+1} Pos Y`,`Light ${a+1} Pos Z`]})}):t.jsx("div",{"data-help-id":"light.rot",children:t.jsx(Pr,{index:a,value:C,onChange:g=>o.updateLight({index:a,params:{rotation:g}}),isFixed:i.fixed,width:200,height:130})}),t.jsx(de,{label:"Intensity",value:i.intensity,min:0,max:100,step:.1,onChange:g=>o.updateLight({index:a,params:{intensity:g}}),customMapping:{min:0,max:100,toSlider:g=>Math.sqrt(g/100)*100,fromSlider:g=>g*g/100},mapTextInput:!1,overrideInputText:$d(i.intensity),dataHelpId:"light.intensity",trackId:`${x}_intensity`,liveValue:s[`${x}_intensity`]}),i.type==="Point"&&t.jsxs(t.Fragment,{children:[t.jsx("div",{className:"mt-2 mb-1 px-3","data-help-id":"light.falloff",onContextMenu:c,children:t.jsx(Le,{label:"Falloff Type",value:i.falloffType,onChange:g=>o.updateLight({index:a,params:{falloffType:g}}),options:[{label:"Quad",value:"Quadratic"},{label:"Linear",value:"Linear"}],helpId:"light.falloff"})}),t.jsx(de,{label:"Falloff (Decay)",value:i.falloff,min:0,max:500,step:.1,onChange:g=>o.updateLight({index:a,params:{falloff:g}}),customMapping:{min:0,max:100,toSlider:g=>Math.log10(g+1)/Math.log10(501)*100,fromSlider:g=>Math.pow(501,g/100)-1},mapTextInput:!1,overrideInputText:i.falloff<.01?"Infinite":i.falloff.toFixed(2),dataHelpId:"light.falloff",trackId:`${x}_falloff`,liveValue:s[`${x}_falloff`]}),t.jsx("p",{className:"text-[9px] text-gray-500 mb-2 -mt-2",children:"0 = No decay (Sun). Higher = shorter range."})]}),t.jsxs("div",{className:"mt-4 pt-3 border-t border-white/10 space-y-2",children:[t.jsx("label",{className:"text-xs text-gray-400 font-bold mb-2 block",children:"Color"}),t.jsx(pa,{color:i.color,onColorChange:g=>o.updateLight({index:a,params:{color:g}})}),t.jsxs("div",{className:"flex items-center justify-between pt-1",children:[t.jsx("label",{className:"text-xs text-gray-400 font-medium",children:"Cast Shadows"}),t.jsx("input",{type:"checkbox",checked:i.castShadow,onChange:g=>{o.handleInteractionStart("param"),o.updateLight({index:a,params:{castShadow:g.target.checked}}),o.handleInteractionEnd()},className:"w-3 h-3 accent-cyan-500 bg-gray-800 border-gray-600 rounded cursor-pointer"})]})]})]})]}),t.jsx("div",{className:"h-px bg-gray-800 my-4"}),t.jsx("div",{className:"flex items-center justify-between mb-4 p-3 bg-gray-800/50 rounded-lg",children:t.jsx(Le,{label:"Show 3d helpers",value:e.showLightGizmo,onChange:o.setShowLightGizmo,color:"bg-cyan-600"})}),n&&t.jsxs("div",{className:"mt-4 p-3 bg-gray-800/50 rounded-lg","data-help-id":"shadows",children:[t.jsxs("div",{className:"flex items-center justify-between mb-2",children:[t.jsx(Me,{children:"Shadows (Global)"}),t.jsx("div",{className:"w-[60px]",children:t.jsx(Le,{value:n.shadows,onChange:g=>o.setLighting({shadows:g}),color:"bg-yellow-500"})})]}),n.shadows&&t.jsx("div",{className:"pl-2 mt-2 border-l-2 border-yellow-500/30",children:t.jsx(ne,{featureId:"lighting",groupFilter:"shadows"})})]})]})},$d=e=>{if(e===0)return"0";if(Math.abs(e)<1)return e.toFixed(3);const o=e.toPrecision(5);return o.includes(".")?o.replace(/\.?0+$/,""):o},Hd=({state:e,actions:o})=>{S.useRef(null),E(n=>n.openContextMenu),e.debugMobileLayout||typeof window<"u"&&window.innerWidth<768;const a=e.materials,r=e.atmosphere;return e.lighting,!a||!r?null:t.jsxs("div",{className:"animate-fade-in -mx-4 -mt-4 flex flex-col","data-help-id":"panel.render",children:[t.jsx("div",{className:"flex flex-col","data-help-id":"mat.diffuse",children:t.jsx(ne,{featureId:"materials",groupFilter:"surface"})}),t.jsx("div",{className:"flex flex-col","data-help-id":"mat.env",children:t.jsx(ne,{featureId:"materials",groupFilter:"env"})}),t.jsx("div",{className:"bg-white/[0.06] h-1.5 rounded-b-lg"}),t.jsx("div",{className:"h-1"}),t.jsx("div",{className:"flex flex-col","data-help-id":"mat.reflection",children:t.jsx(ne,{featureId:"reflections",groupFilter:"shading"})}),t.jsx("div",{className:"flex flex-col","data-help-id":"mat.glow",children:t.jsx(ne,{featureId:"atmosphere",groupFilter:"glow"})}),t.jsx("div",{className:"flex flex-col","data-help-id":"mat.emission",children:t.jsx(ne,{featureId:"materials",groupFilter:"emission"})}),t.jsx("div",{className:"bg-white/[0.06] h-1.5 rounded-b-lg"}),t.jsx("div",{className:"h-1"}),t.jsx("div",{className:"flex flex-col","data-help-id":"mat.ao",children:t.jsx(ne,{featureId:"ao",groupFilter:"shading"})})]})};ue();const Gd=({state:e,actions:o})=>{const a=E(b=>b.openContextMenu),r=e.quality,n=e.lighting;e.ao;const[s,i]=e.fixedResolution,[l,c]=S.useState("Free");e.debugMobileLayout||typeof window<"u"&&window.innerWidth<768;const d=(n==null?void 0:n.ptEnabled)!==!1,u=o.setLighting,f=S.useMemo(()=>{const b=`${s}x${i}`;return["800x600","1280x720","1920x1080","2560x1440","3840x2160","1080x1080","1080x1350","1080x1920","2048x1024","4096x2048"].includes(b)?b:"Custom"},[s,i]),p=b=>{const g=Ee(b.currentTarget);g.length>0&&(b.preventDefault(),b.stopPropagation(),a(b.clientX,b.clientY,[],g))},m=async b=>{e.renderMode!==b&&(Z.emit("is_compiling","Switching Engine..."),await new Promise(g=>setTimeout(g,50)),o.setRenderMode(b))},x=(b,g)=>{const h=Math.max(64,Math.round(b/8)*8),v=Math.max(64,Math.round(g/8)*8);o.setFixedResolution(h,v)},C=(b,g)=>{l==="Free"?x(b==="w"?g:s,b==="h"?g:i):b==="w"?x(g,g/l):x(g*l,g)},y=[.25,.5,1,1.5,2];return t.jsxs("div",{className:"animate-fade-in -mx-4 -mt-4 flex flex-col",children:[t.jsxs("div",{className:"py-3 px-3","data-help-id":"render.engine",children:[t.jsx(Me,{className:"block mb-1",children:"Render Engine"}),t.jsxs("div",{className:"flex bg-black/40 rounded p-0.5 border border-white/10",children:[t.jsx("button",{onClick:()=>m("Direct"),className:`flex-1 py-1.5 text-[10px] font-bold rounded transition-colors ${e.renderMode==="Direct"?"bg-cyan-700 text-white":"text-gray-500 hover:text-gray-300"}`,children:"Direct (Fast)"}),t.jsx("button",{onClick:()=>d&&m("PathTracing"),disabled:!d,className:`flex-1 py-1.5 text-[10px] font-bold rounded transition-colors ${d?e.renderMode==="PathTracing"?"bg-purple-700 text-white":"text-gray-500 hover:text-gray-300":"text-gray-700 cursor-not-allowed opacity-50 bg-transparent"}`,title:d?"Switch to Path Tracer (GI)":"Path Tracer Disabled in Engine Panel",children:"Path Tracer (GI)"})]}),e.renderMode==="PathTracing"&&n&&t.jsxs("div",{className:"mt-3 pt-2 border-t border-white/5 animate-fade-in","data-help-id":"pt.global",children:[t.jsxs("div",{className:"flex items-center justify-between mb-1.5",children:[t.jsx(Me,{variant:"secondary",children:"Max Bounces"}),t.jsx("div",{className:"w-12 h-4 bg-black/40 rounded border border-white/10 relative",children:t.jsx(ot,{value:n.ptBounces,min:1,max:8,step:1,onChange:b=>u({ptBounces:Math.round(b)}),highlight:!0})})]}),t.jsx(de,{label:"GI Brightness",value:n.ptGIStrength,min:0,max:5,step:.01,onChange:b=>u({ptGIStrength:b}),trackId:"lighting.ptGIStrength"})]})]}),t.jsx("div",{className:"bg-white/[0.06] h-1.5 rounded-b-lg"}),t.jsx("div",{className:"h-1"}),t.jsxs("div",{className:"py-3 px-3",onContextMenu:p,"data-help-id":"panel.quality",children:[t.jsx(Le,{label:"Resolution",value:e.resolutionMode,onChange:o.setResolutionMode,options:[{label:"Fill Screen",value:"Full"},{label:"Fixed",value:"Fixed"}]}),t.jsxs("div",{className:"mt-3 bg-black/20 rounded border border-white/5 p-2","data-help-id":"quality.scale",children:[t.jsxs("div",{className:"flex items-center justify-between mb-2",children:[t.jsx(Me,{children:"Internal Scale"}),t.jsx("span",{className:"text-[10px] font-mono text-cyan-400 font-bold",children:`${e.aaLevel.toFixed(2)}x`})]}),t.jsx("div",{className:"grid grid-cols-5 gap-px bg-white/5 border border-white/5 rounded overflow-hidden",children:y.map(b=>t.jsx("button",{onClick:()=>o.setAALevel(b),className:`py-1.5 text-[9px] font-bold transition-all ${e.aaLevel===b?"bg-cyan-600/40 text-cyan-300 shadow-[inset_0_0_10px_rgba(34,211,238,0.1)]":"bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5"}`,children:b},b))}),t.jsx("div",{className:"mt-2 pt-2 border-t border-white/5",children:t.jsx(ne,{featureId:"quality",groupFilter:"performance"})})]}),e.resolutionMode==="Fixed"&&t.jsxs("div",{className:"flex flex-col gap-2 mt-3 pt-3 border-t border-white/5 animate-fade-in",children:[t.jsx(kt,{label:"Preset",value:f,options:[{label:"SVGA (800 x 600)",value:"800x600"},{label:"HD (1280 x 720)",value:"1280x720"},{label:"FHD (1920 x 1080)",value:"1920x1080"},{label:"QHD (2560 x 1440)",value:"2560x1440"},{label:"4K (3840 x 2160)",value:"3840x2160"},{label:"Square 1:1 (1080p)",value:"1080x1080"},{label:"Portrait 4:5 (1080p)",value:"1080x1350"},{label:"Vertical 9:16 (1080p)",value:"1080x1920"},{label:"Skybox Low (2048 x 1024)",value:"2048x1024"},{label:"Skybox High (4096 x 2048)",value:"4096x2048"},{label:"Custom",value:"Custom"}],onChange:b=>{if(b!=="Custom"){const[g,h]=b.split("x").map(Number);x(g,h)}},fullWidth:!0}),t.jsxs("div",{className:"flex gap-2",children:[t.jsxs("div",{className:"flex-1",children:[t.jsx(Me,{variant:"secondary",className:"block mb-0.5",children:"Width"}),t.jsx("div",{className:"h-6 bg-black/40 rounded border border-white/10 relative",children:t.jsx(ot,{value:s,onChange:b=>C("w",b),step:8,min:64,max:8192,overrideText:`${s}`})})]}),t.jsxs("div",{className:"flex-1",children:[t.jsx(Me,{variant:"secondary",className:"block mb-0.5",children:"Height"}),t.jsx("div",{className:"h-6 bg-black/40 rounded border border-white/10 relative",children:t.jsx(ot,{value:i,onChange:b=>C("h",b),step:8,min:64,max:8192,overrideText:`${i}`})})]}),t.jsxs("div",{className:"w-[35%]",children:[t.jsx(Me,{variant:"secondary",className:"block mb-0.5",children:"Ratio"}),t.jsx("div",{className:"h-6",children:t.jsx(kt,{value:l,options:[{label:"Free",value:"Free"},{label:"16:9",value:1.7777},{label:"4:3",value:1.3333},{label:"1:1",value:1},{label:"4:5 (Portrait)",value:.8},{label:"9:16 (Vertical)",value:.5625},{label:"2:1 (Sky)",value:2}],onChange:b=>{c(b),b!=="Free"&&x(s,s/b)},fullWidth:!0,className:"!px-1"})})]})]})]})]}),t.jsx("div",{className:"bg-white/[0.06] h-1.5 rounded-b-lg"}),t.jsx("div",{className:"h-1"}),t.jsxs("div",{className:"flex flex-col","data-help-id":"quality.tss",children:[t.jsx(Le,{label:"Temporal AA (Remove Noise)",value:e.accumulation,onChange:o.setAccumulation,color:"bg-green-500",helpId:"quality.tss"}),d&&t.jsx(Le,{label:"Area Lights (Soft Shadows)",value:n==null?void 0:n.ptStochasticShadows,onChange:b=>u&&u({ptStochasticShadows:b}),helpId:"pt.global"})]}),(n==null?void 0:n.shadowsCompile)&&(n==null?void 0:n.shadows)&&t.jsx("div",{className:"flex flex-col","data-help-id":"shadows",children:t.jsx(ne,{featureId:"lighting",groupFilter:"shadow_quality"})}),t.jsx("div",{className:"bg-white/[0.06] h-1.5 rounded-b-lg"}),t.jsx("div",{className:"h-1"}),t.jsx("div",{className:"flex flex-col",children:r&&t.jsx(ne,{featureId:"quality",groupFilter:"kernel"})})]})},bi=(e,o)=>{if(!e)return null;let a=1/0,r=-1/0;const n=[];for(let m=0;m<e.length;m+=4){const x=e[m];x>-.9&&(o||(x<a&&(a=x),x>r&&(r=x)),n.push(x))}let s,i;if(o)s=o.min,i=o.max;else{if(a===1/0)return null;const m=r-a;m<1e-4?(s=a-.1,i=r+.1):(s=a-m*.05,i=r+m*.05)}const l=128,c=new Array(l).fill(0),d=i-s,u=Math.max(d,1e-6);for(const m of n){const x=(m-s)/u,C=Math.floor(x*l);C>=0&&C<l&&c[C]++}const f=Math.max(...c);return{buckets:c.map(m=>m>0?Math.log(m+1)/Math.log(f+1):0),min:s,max:i}},vi=(e,o,a)=>{if(!e||e.length<10)return null;const r=e.length,n=e.map((g,h)=>h===0||h===r-1?0:g);let s=0;if(n.forEach(g=>s+=g),s<.01)return{start:o,end:a};const i=s*.02,l=s*.98;let c=0,d=0,u=r-1,f=!1;for(let g=0;g<r;g++)if(c+=n[g],!f&&c>=i&&(d=g,f=!0),c>=l){u=g;break}const p=.05;for(;d>1&&e[d-1]>p&&!(e[d-1]>e[d]*2);)d--;for(;u<r-2&&e[u+1]>p&&!(e[u+1]>e[u]*2);)u++;const m=(a-o)/r;let x=o+d*m,C=o+u*m;const b=(C-x)*.05;return x=Math.max(o,x-b),C=Math.min(a,C+b),{start:x,end:C}},wi=({data:e,min:o,max:a,gamma:r,repeats:n=1,phase:s=0,gradientStops:i,onChange:l,autoUpdate:c,onToggleAuto:d,onRefresh:u,isStale:f=!1,height:p=48,labelTitle:m="Levels",labelLeft:x="Black",labelMid:C="Gamma",labelRight:y="White",fixedRange:b})=>{const g=S.useRef(null),[h,v]=S.useState(b||{min:0,max:1}),z=E(D=>D.openContextMenu),M=S.useMemo(()=>{const D=bi(e,b);return D?(v({min:D.min,max:D.max}),D.buckets):(b&&v(b),[])},[e,b]),w=Math.pow(.5,1/r)*100;S.useEffect(()=>{const D=g.current;if(!D)return;const T=D.getContext("2d");if(!T||(T.clearRect(0,0,D.width,D.height),M.length===0))return;const O=D.width,B=D.height,V=O/M.length;T.fillStyle="#666",M.forEach((Y,W)=>{const K=Y*B;T.fillRect(W*V,B-K,V,K)})},[M]);const j=D=>{const T=h.max-h.min;return T<1e-5?50:(D-h.min)/T*100},k=M.length>0||b,P=k?j(o):0,I=k?j(a):100,_=I-P,F=P+w/100*_,A=S.useRef(null),N=(D,T)=>{D.preventDefault(),D.stopPropagation(),A.current={type:T,startX:D.clientX,startMin:o,startMax:a,startGamma:r},window.addEventListener("mousemove",R),window.addEventListener("mouseup",X)},R=D=>{if(!A.current||!g.current)return;const{type:T,startX:O,startMin:B,startMax:V,startGamma:Y}=A.current,W=g.current.getBoundingClientRect(),K=D.clientX-O,Q=h.max-h.min,re=M.length>0||b?Q:1,te=K/W.width*re;let ae=B,ce=V,we=Y;if(T==="min")ae+=te;else if(T==="max")ce+=te;else if(T==="pan")ae+=te,ce+=te;else if(T==="gamma"){const me=W.width*Math.abs(V-B)/re,Ce=Math.pow(.5,1/Y)*me,ee=Math.max(1,Math.min(me-1,Ce+K))/me;we=Math.log(.5)/Math.log(ee),we=Math.max(.1,Math.min(10,we))}ae>=ce&&(T==="min"&&(ae=ce-.001),T==="max"&&(ce=ae+.001)),l({min:ae,max:ce,gamma:we})},X=()=>{A.current=null,window.removeEventListener("mousemove",R),window.removeEventListener("mouseup",X)},L=()=>{if(M.length===0)return;const D=vi(M,h.min,h.max);D&&l({min:D.start,max:D.end,gamma:1})},$=D=>{D.preventDefault(),D.stopPropagation(),l({min:0,max:1,gamma:1})},q=D=>{const T=Ee(D.currentTarget);T.length>0&&(D.preventDefault(),D.stopPropagation(),z(D.clientX,D.clientY,[],T))},H=S.useMemo(()=>po(i||[{id:"b",position:0,color:"#000000"},{id:"w",position:1,color:"#ffffff"}],r),[i,r]),G={left:`${P}%`,width:`${Math.max(0,I-P)}%`,backgroundImage:H,backgroundSize:`${100/Math.max(.1,n)}% 100%`,backgroundPosition:`${s*100}% 0%`,backgroundRepeat:"repeat-x"};return t.jsxs("div",{className:"py-2 bg-gray-900/40","data-help-id":"ui.histogram",onContextMenu:q,children:[t.jsxs("div",{className:"flex justify-between items-center mb-2 px-3",children:[t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsx("label",{className:"text-[10px] text-gray-500 font-bold",children:m}),f&&!c&&t.jsx("span",{className:"text-[8px] text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded border border-amber-500/30",children:"Stale"}),d&&t.jsx("div",{className:"flex items-center justify-center w-4 h-4 cursor-pointer group rounded hover:bg-white/10",onClick:d,title:"Auto-update histogram (Live)",children:t.jsx("div",{className:`w-2 h-2 rounded-full transition-all duration-300 ${c?"bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]":"bg-gray-600"}`})}),u&&!c&&t.jsx("button",{onClick:u,className:"text-[9px] text-cyan-500 hover:text-white ml-1",children:"Refresh"})]}),t.jsxs("div",{className:"flex items-center gap-1",children:[t.jsx("button",{onClick:()=>l({min:0,max:1,gamma:1}),className:"px-2 py-0.5 bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white text-[8px] rounded border border-gray-600 transition-colors font-bold",title:"Reset to 0-1 range",children:"0-1"}),d&&t.jsx("button",{onClick:L,className:"px-2 py-0.5 bg-cyan-900/40 hover:bg-cyan-700 text-cyan-400 text-[9px] rounded border border-cyan-800 transition-colors font-bold",title:"Fit range to current data",children:"Fit"})]})]}),t.jsxs("div",{className:`relative w-full bg-black/60 overflow-hidden select-none border-y border-white/5 transition-colors group/hist ${u&&!c?"cursor-pointer hover:bg-black/40":""}`,style:{height:p},onClick:u&&!c?u:void 0,children:[t.jsxs("div",{className:"absolute inset-0 right-4 left-3 mx-2",children:[t.jsx("canvas",{ref:g,width:320,height:p,className:"w-full h-full opacity-40 absolute inset-0"}),t.jsx("div",{className:"absolute top-0 bottom-0 opacity-40 pointer-events-none",style:G}),t.jsxs("div",{className:"absolute top-0 bottom-0 w-4 -ml-2 cursor-ew-resize z-20 group/min flex justify-center",style:{left:`${P}%`},onMouseDown:D=>N(D,"min"),children:[t.jsx("div",{className:"w-px h-full bg-white/60 group-hover/min:bg-white group-hover/min:w-0.5 transition-all shadow-[0_0_5px_rgba(0,0,0,0.8)]"}),t.jsx("div",{className:"absolute top-0 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-white"})]}),t.jsxs("div",{className:"absolute top-0 bottom-0 w-4 -ml-2 cursor-ew-resize z-20 group/max flex justify-center",style:{left:`${I}%`},onMouseDown:D=>N(D,"max"),children:[t.jsx("div",{className:"w-px h-full bg-white/60 group-hover/max:bg-white group-hover/max:w-0.5 transition-all shadow-[0_0_5px_rgba(0,0,0,0.8)]"}),t.jsx("div",{className:"absolute bottom-0 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-white"})]}),_>5&&t.jsx("div",{className:"absolute top-1/2 -translate-y-1/2 w-4 h-4 -ml-2 cursor-ew-resize z-30 group/gamma flex items-center justify-center",style:{left:`${F}%`},onMouseDown:D=>N(D,"gamma"),children:t.jsx("div",{className:"w-2 h-2 rotate-45 bg-gray-400 border border-black group-hover/gamma:bg-white group-hover/gamma:scale-125 transition-transform shadow-md"})}),t.jsx("div",{className:"absolute top-0 bottom-0 cursor-grab active:cursor-grabbing z-10",style:{left:`${P}%`,width:`${Math.max(0,I-P)}%`},onMouseDown:D=>N(D,"pan")})]}),t.jsxs("button",{onClick:$,className:"absolute top-0 bottom-0 right-0 w-4 bg-red-900/50 hover:bg-red-700/80 border-l border-white/10 z-40 opacity-0 group-hover/hist:opacity-100 transition-opacity flex items-center justify-center",title:"Reset Range",children:[t.jsx("div",{className:"w-px h-2 bg-white/80 rotate-45 transform origin-center absolute"}),t.jsx("div",{className:"w-px h-2 bg-white/80 -rotate-45 transform origin-center absolute"})]})]}),t.jsxs("div",{className:"flex justify-between items-center mt-2 px-3",children:[t.jsxs("div",{className:"flex flex-col items-start w-16",children:[t.jsx("span",{className:"text-[8px] text-gray-600",children:x}),t.jsx(ot,{value:o,onChange:D=>l({min:D,max:a,gamma:r}),step:.01,min:-1/0,max:1/0,highlight:!0})]}),t.jsxs("div",{className:"flex flex-col items-center w-16",children:[t.jsx("span",{className:"text-[8px] text-gray-600",children:C}),t.jsx(ot,{value:r,onChange:D=>l({min:o,max:a,gamma:D}),step:.01,min:.1,max:10,overrideText:r.toFixed(2)})]}),t.jsxs("div",{className:"flex flex-col items-end w-16",children:[t.jsx("span",{className:"text-[8px] text-gray-600",children:y}),t.jsx(ot,{value:a,onChange:D=>l({min:o,max:D,gamma:r}),step:.01,min:-1/0,max:1/0,highlight:!0})]})]})]})},Vd=({layer:e,state:o,histogramData:a,onChange:r,onRefresh:n,autoUpdate:s,onToggleAuto:i,liveModulations:l})=>{const c=S.useRef(!1),d=e===1?o.repeats:o.repeats2,u=e===1?o.phase:o.phase2,f=e===1?o.scale:o.scale2,p=e===1?o.offset:o.offset2,m=e===1?o.bias:o.bias2,x=e===1?o.gradient:o.gradient2,C=e===1?o.mode:o.mode2,y=e===1?"scale":"scale2",b=e===1?"offset":"offset2",g=e===1?"repeats":"repeats2",h=e===1?"phase":"phase2",v=e===1?"bias":"bias2",z=S.useRef(d),M=S.useRef(u),w=S.useRef(f),j=S.useRef(p),k=S.useRef(C);S.useEffect(()=>{if(C!==k.current){const _=Math.abs(f-w.current)>.001,F=Math.abs(p-j.current)>.001;!_&&!F&&(c.current=!0,s||n()),k.current=C}},[C,f,p,s,n]),S.useEffect(()=>{if(c.current&&a){const _=bi(a);if(_){const F=vi(_.buckets,_.min,_.max);if(F){const A=F.end-F.start,N=Math.abs(A)<1e-4?1e-4:A,R=d/N,X=u-F.start*R;r({[y]:R,[b]:X}),c.current=!1}}}},[a,d,u,y,b,r]),S.useEffect(()=>{const _=Math.abs(d-z.current)>.001,F=Math.abs(u-M.current)>.001,A=Math.abs(f-w.current)>.001,N=Math.abs(p-j.current)>.001;if((_||F)&&!A&&!N){const R=Math.max(1e-4,f),L=Math.max(1e-4,z.current)/R,$=(M.current-p)/R,q=d/L,H=u-$*q;r({[y]:q,[b]:H})}z.current=d,M.current=u,w.current=f,j.current=p},[d,u,f,p,y,b,r]);const P=(u-p)/f,I=P+d/f;return t.jsxs("div",{className:"flex flex-col gap-1",children:[t.jsx(wi,{data:a,min:P,max:I,gamma:m,repeats:d,phase:u,gradientStops:x,labelTitle:"Range",labelLeft:"Min",labelMid:"Bias",labelRight:"Max",onChange:({min:_,max:F,gamma:A})=>{const N=F-_,R=Math.abs(N)<1e-4?1e-4:N,X=d/R,L=u-_*X,$={[y]:X,[b]:L,[v]:A};r($)},autoUpdate:s,onToggleAuto:i,onRefresh:n}),t.jsx(de,{label:"Repeats",value:d,min:.1,max:100,step:.1,onChange:_=>r({[g]:_}),trackId:`coloring.${g}`,liveValue:l==null?void 0:l[`coloring.${g}`]}),t.jsx(de,{label:"Phase",value:u,min:-1,max:1,step:.01,onChange:_=>r({[h]:_}),trackId:`coloring.${h}`,liveValue:l==null?void 0:l[`coloring.${h}`]})]})},Ud=({sliceState:e,actions:o})=>{const a=e,r=a.hybridComplex,[n,s]=S.useState(!1),i=o.setGeometry,l=d=>{d.stopPropagation(),Z.emit("is_compiling","Optimizing Shader..."),setTimeout(()=>{i({hybridComplex:!0}),s(!1)},50)},c=d=>{d.preventDefault(),d.stopPropagation(),s(!0)};return t.jsxs("div",{className:"relative mt-2 pt-2 border-t border-white/5",children:[t.jsxs("div",{className:`transition-all duration-300 ${r?"":"opacity-30 blur-[0.5px] pointer-events-none grayscale"}`,children:[t.jsx("div",{className:"flex items-center gap-1 mb-1",children:t.jsx(Me,{variant:"secondary",children:"Advanced Mixing"})}),t.jsx(de,{label:"Box Skip (Mod)",value:a.hybridSkip,min:1,max:8,step:1,onChange:d=>i({hybridSkip:d}),overrideInputText:Math.round(a.hybridSkip)<=1?"Consecutive":Math.round(a.hybridSkip)===2?"Every 2nd":`Every ${Math.round(a.hybridSkip)}th`,trackId:"geometry.hybridSkip"}),t.jsx("div",{className:"mt-1",children:t.jsx(Le,{label:"Swap Order",value:a.hybridSwap,onChange:d=>i({hybridSwap:d})})})]}),!r&&!n&&t.jsx("div",{className:"absolute inset-0 cursor-pointer z-10 bg-gray-900/50 hover:bg-gray-800/40 transition-colors flex items-center justify-center group rounded",onClick:c,title:"Click to enable Advanced Hybrid Mode",children:t.jsx("div",{className:"text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity transform scale-75",children:t.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[t.jsx("rect",{x:"3",y:"11",width:"18",height:"11",rx:"2",ry:"2"}),t.jsx("path",{d:"M7 11V7a5 5 0 0 1 10 0v4"})]})})}),n&&t.jsxs("div",{className:"absolute top-[-20px] left-0 right-0 z-50 animate-pop-in",children:[t.jsxs("div",{className:"bg-black/95 border border-white/20 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.9)] backdrop-blur-md overflow-hidden cursor-pointer hover:border-cyan-500/50 transition-colors",onClick:l,children:[t.jsxs("div",{className:"flex items-start justify-between p-2 border-b border-white/10 bg-white/5",children:[t.jsxs("div",{className:"flex items-center gap-2 text-gray-300",children:[t.jsx(Tt,{}),t.jsx(Me,{children:"Advanced Shader"})]}),t.jsx("button",{onClick:d=>{d.stopPropagation(),s(!1)},className:"text-gray-500 hover:text-white -mt-0.5 -mr-0.5 p-1",children:t.jsx(qa,{})})]}),t.jsxs("div",{className:"p-3",children:[t.jsxs("p",{className:"text-[10px] text-gray-400 leading-relaxed mb-3",children:["Enable Advanced Hybrid Integration?",t.jsx("br",{}),"This allows ",t.jsx("strong",{children:"alternating formulas"})," between Box Folds and the Main Fractal.",t.jsx("br",{}),t.jsx("br",{}),t.jsx("span",{className:"text-orange-300",children:"Compilation may take 30-60 seconds."})]}),t.jsx("div",{className:"flex items-center justify-center p-1.5 bg-white/5 rounded border border-white/10 text-cyan-400 text-[9px] font-bold group-hover:bg-cyan-900/30 group-hover:text-cyan-200 group-hover:border-cyan-500/30 transition-all",children:"Click to Load"})]})]}),t.jsx("div",{className:"fixed inset-0 z-[-1]",onClick:d=>{d.stopPropagation(),s(!1)}})]})]})},Wd=({actions:e,targetMode:o,label:a,activeLabel:r,helpText:n,variant:s="primary"})=>{const i=E(u=>u.interactionMode),{setInteractionMode:l}=e,c=i===o,d=()=>{l(c?"none":o)};return t.jsxs("div",{className:"flex flex-col animate-fade-in",children:[c&&n&&t.jsx("div",{className:"mb-px p-2 bg-green-900/30 border border-green-500/30 rounded text-[9px] text-green-200 animate-pulse text-center leading-tight",children:n}),t.jsx(sa,{onClick:d,label:c?r||"Cancel":a,variant:c?"success":s,fullWidth:!0})]})},Ia=ue(),qd=({sliceState:e,actions:o})=>{const a=E(p=>p.sceneHistogramData);E(p=>p.sceneHistogramTrigger);const r=E(p=>p.refreshSceneHistogram),n=E(p=>p.liveModulations),{levelsMin:s,levelsMax:i,levelsGamma:l}=e,c=o.setColorGrading,d=(n==null?void 0:n["colorGrading.levelsMin"])??s,u=(n==null?void 0:n["colorGrading.levelsMax"])??i,f=(n==null?void 0:n["colorGrading.levelsGamma"])??l;return t.jsx("div",{className:"mt-2 pt-2 border-t border-white/5",children:t.jsx(wi,{data:a,min:d??0,max:u??1,gamma:f??1,onChange:({min:p,max:m,gamma:x})=>{c({levelsMin:p,levelsMax:m,levelsGamma:x})},onRefresh:r,height:40,fixedRange:{min:0,max:1}})})},Xd=({sliceState:e,actions:o})=>{const{camFov:a,camType:r,dofStrength:n}=e,s=o.setOptics,i=E(h=>h.interactionMode),l=E(h=>h.setInteractionMode),c=E(h=>h.focusLock),d=E(h=>h.setFocusLock),u=i==="picking_focus",[f,p]=S.useState(!0),m=S.useRef(null),x=Math.abs((r??0)-0)<.1,C=h=>{d(h),h&&Ia.lastMeasuredDistance>0&&s({dofFocus:Ia.lastMeasuredDistance})},y=()=>{const h=Ne();if(!h)return;const v=E.getState(),z=Ia.lastMeasuredDistance;let M=z>1e-4&&z<900?z:v.targetDistance||3.5;M=Math.max(.001,M);const w=We.getUnifiedFromEngine(),j=new U(0,0,-1).applyQuaternion(h.quaternion);m.current={fov:a,dist:M,unifiedPos:{x:w.x,y:w.y,z:w.z},forward:j,quat:h.quaternion.clone()}},b=h=>{const v={camFov:h};if(f&&m.current){const{fov:_,dist:F,unifiedPos:A,forward:N,quat:R}=m.current,X=tt.degToRad(_),L=tt.degToRad(h),$=Math.tan(X/2)/Math.tan(L/2),q=F*$,H=F-q,G=N.clone().multiplyScalar(H);v.dofFocus=q;const D=new U(A.x,A.y,A.z).add(G);We.teleportPosition(D,{x:R.x,y:R.y,z:R.z,w:R.w},q),E.setState({targetDistance:q})}s(v);const{isRecording:z,captureCameraFrame:M,addKeyframe:w,addTrack:j,currentFrame:k,sequence:P,isPlaying:I}=le.getState();if(z){const _=I?"Linear":"Bezier";if(v.dofFocus!==void 0){const F="optics.dofFocus";P.tracks[F]||j(F,"Focus Distance"),w(F,k,v.dofFocus,_)}f&&M(k,!0,_)}},g=()=>{if(f){const{currentFrame:h,captureCameraFrame:v,isPlaying:z}=le.getState();v(h,!0,z?"Linear":"Bezier")}};return t.jsxs("div",{className:"flex flex-col",children:[n>1e-6&&t.jsxs("div",{className:"flex",children:[t.jsx("div",{className:"w-2 shrink-0 self-stretch border-l border-white/20 bg-white/[0.12] border-b border-b-white/20 rounded-bl-lg"}),t.jsx("div",{className:"flex-1 min-w-0 border-b border-b-white/20 bg-white/[0.12]",children:t.jsxs("div",{className:"grid grid-cols-2 gap-px p-px",children:[t.jsx(sa,{active:c,onClick:()=>C(!c),label:c?"Lock On":"Focus Lock",variant:"primary"}),t.jsx(sa,{active:u,onClick:()=>l(u?"none":"picking_focus"),label:u?"Picking...":"Pick Focus",variant:"success"})]})})]}),x&&t.jsxs("div",{children:[t.jsx(de,{label:"Field of View",value:a??60,min:10,max:150,step:1,onChange:b,onDragStart:y,overrideInputText:`${Math.round(a??60)}°`,trackId:"optics.camFov",onKeyToggle:g}),t.jsx("div",{children:t.jsx(Le,{label:"Dolly Link",icon:t.jsx(Ba,{active:f}),value:f,onChange:h=>p(h)})})]})]})},Yd=()=>{const e=E(d=>d.cameraMode),o=E(d=>d.sceneOffset),a=E(d=>d.cameraPos),r=E(d=>d.cameraRot),n=E(d=>d.setCameraMode),s=E(d=>d.optics),i=s&&Math.abs(s.camType-1)<.1,l=We.getUnifiedPosition(a,o),c=We.getRotationDegrees(r);return t.jsxs("div",{className:"flex flex-col gap-3",children:[t.jsxs("div",{className:i?"opacity-50 pointer-events-none":"",children:[t.jsx(Le,{value:e,onChange:d=>n(d),options:[{label:"Orbit",value:"Orbit"},{label:"Fly",value:"Fly"}]}),i&&t.jsx("p",{className:"text-[9px] text-gray-500 mt-1 text-center",children:"Fly Mode disabled in Orthographic view"})]}),e==="Fly"&&t.jsx(ne,{featureId:"navigation",groupFilter:"movement"}),t.jsx("div",{"data-help-id":"cam.position",children:t.jsx(vt,{label:"Absolute Position",value:l,onChange:d=>We.teleportPosition(d),step:.1,min:-1/0,max:1/0,interactionMode:"camera",trackKeys:["camera.unified.x","camera.unified.y","camera.unified.z"],trackLabels:["Position X","Position Y","Position Z"]})}),t.jsx("div",{"data-help-id":"cam.rotation",children:t.jsx(vt,{label:"Rotation (Degrees)",value:c,onChange:We.teleportRotation,step:1,min:-180,max:180,interactionMode:"camera",trackKeys:["camera.rotation.x","camera.rotation.y","camera.rotation.z"],trackLabels:["Rotation X","Rotation Y","Rotation Z"],convertRadToDeg:!0})})]})};function ma(e){const o=ze.lazy(e);return a=>t.jsx(S.Suspense,{fallback:null,children:t.jsx(o,{...a})})}const Zd=ma(()=>ht(()=>import("./FlowEditor-C74uxH2S.js"),__vite__mapDeps([9,1,2,10,3,4]),import.meta.url)),Qd=ma(()=>ht(()=>import("./AudioPanel-Ck7BBx41.js"),__vite__mapDeps([11,1,2,12,3,4]),import.meta.url).then(e=>({default:e.AudioPanel}))),Kd=ma(()=>ht(()=>import("./AudioSpectrum-M81OdFPw.js"),__vite__mapDeps([12,1,2,3,4]),import.meta.url).then(e=>({default:e.AudioSpectrum}))),Jd=ma(()=>ht(()=>import("./DebugToolsOverlay-CfMGpVXk.js"),__vite__mapDeps([13,3,1,2]),import.meta.url).then(e=>({default:e.DebugToolsOverlay}))),eu=e=>{const o=E(d=>d.histogramData),a=E(d=>d.histogramAutoUpdate),r=E(d=>d.setHistogramAutoUpdate),n=E(d=>d.refreshHistogram),s=E(d=>d.liveModulations),i=E(d=>d.registerHistogram),l=E(d=>d.unregisterHistogram);S.useEffect(()=>(i(),()=>l()),[i,l]);const c=d=>{const u=E.getState().setColoring;u&&u(d)};return t.jsx(Vd,{layer:e.layer,state:e.sliceState,histogramData:o,onChange:c,onRefresh:n,autoUpdate:a,onToggleAuto:()=>r(!a),liveModulations:s})},tu=e=>{const o=E(r=>r.registerSceneHistogram),a=E(r=>r.unregisterSceneHistogram);return S.useEffect(()=>(o(),()=>a()),[o,a]),t.jsx(qd,{...e})},au=()=>{he.register("panel-drawing",ed),he.register("overlay-drawing",od),he.register("panel-audio",Qd),he.register("overlay-lighting",mc),he.register("overlay-webcam",yd),he.register("overlay-debug-tools",Jd),he.register("panel-engine",bd),he.register("panel-cameramanager",Sd),he.register("panel-formula",Ad),he.register("panel-scene",Bd),he.register("panel-light",Od),he.register("panel-shading",Hd),he.register("panel-gradients",pd),he.register("panel-quality",Gd),he.register("panel-graph",Zd),he.register("coloring-histogram",eu),he.register("hybrid-advanced-lock",Ud),he.register("interaction-picker",Wd),he.register("audio-spectrum",Kd),he.register("audio-link-controls",ld),he.register("scene-histogram",tu),he.register("optics-controls",Xd),he.register("navigation-controls",Yd)};if("serviceWorker"in navigator)try{navigator.serviceWorker.getRegistrations().then(e=>{for(let o of e)o.unregister().then(()=>console.log("SW Unregistered"))}).catch(()=>{})}catch{console.debug("SW cleanup skipped")}au();const Si=document.getElementById("root");if(!Si)throw new Error("Could not find root element to mount to");const ou=ji.createRoot(Si);ou.render(t.jsx(ze.StrictMode,{children:t.jsx(Kc,{})}));export{Ot as $,kt as A,ju as B,pt as C,Xc as D,Eu as E,wu as F,pu as G,Tt as H,ot as I,vo as J,Ne as K,nl as L,Du as M,Fu as N,Tu as O,il as P,Pu as Q,Mu as R,yu as S,St as T,Cu as U,mu as V,Lu as W,zu as X,ku as Y,$s as Z,qa as _,ea as a,Au as a0,Nu as a1,bu as a2,Ba as a3,du as a4,cu as a5,Uu as a6,gc as a7,fu as a8,uu as a9,Oc as aa,Pt as ab,ta as ac,ge as ad,be as ae,vu as af,xu as ag,Qe as ah,Fr as ai,ua as aj,ld as ak,vr as al,Bt as am,po as an,pa as ao,lt as ap,At as aq,cs as ar,hr as as,Bu as b,Ou as c,Vu as d,Ss as e,Hu as f,Je as g,Gu as h,hu as i,E as j,Sa as k,Ru as l,Iu as m,_u as n,Ee as o,de as p,Ut as q,ie as r,$u as s,ue as t,le as u,gu as v,Z as w,fe as x,sa as y,Su as z};
